import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing GraphQL Query Complexity Limits',
  description:
    'Test GraphQL query complexity limits with calibrated field costs, fragment and variable cases, exact rejection boundaries, and resolver-side proof.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing GraphQL Query Complexity Limits

A six-line GraphQL operation can fan out into thousands of resolver calls. Ask for organizations, each organization's repositories, every repository's open issues, and the commenters on each issue. Character count barely changes when \`first: 10\` becomes \`first: 100\`, but backend work can change by orders of magnitude. Complexity control exists to reject that work before execution, and its tests must prove both the estimator and the enforcement boundary.

Depth alone is insufficient. A deeply nested chain that resolves one object per level can be cheaper than a shallow query requesting several wide connections. A serious suite covers depth, list multipliers, expensive leaf fields, aliases, fragments, variables, operations in a multi-operation document, and the response clients receive when cost exceeds policy.

The examples use \`graphql\` with \`graphql-query-complexity\`, whose validation rule can combine field-extension and default estimators. The same test design applies to a gateway or server-specific cost engine, but expected numbers must come from that engine's documented formula.

## Make the cost model explicit enough to test

Begin with a short cost specification. “Maximum complexity 1000” is meaningless without knowing how fields accumulate and how list arguments multiply child cost.

| Schema shape | Example policy | Reason to price it differently |
|---|---:|---|
| Scalar leaf | 1 | Usually one projection or in-memory property read |
| Object field | 1 plus child cost | Traversal adds work while children carry most cost |
| Bounded connection | Argument value times child cost | Requested cardinality changes fan-out |
| Full-text search | Fixed 20 plus result multiplier | Index query has meaningful base work |
| Generated report | Fixed 100 | One field can trigger a costly external computation |
| Mutation | Separately governed | Side effects and transaction cost need policy beyond selection size |

These values are illustrative, not universal. Calibrate them against resolver traces, database query plans, downstream request counts, and production latency distributions. The goal is ordering and protection, not a fictional conversion from “one point” to milliseconds.

Write down how omitted pagination arguments behave. If \`first\` defaults to 20 at runtime but the estimator assumes 1, attackers can omit the argument for a cheap score and expensive execution. Decide how variables, null values, invalid negative values, and server-side caps influence cost. Validation of argument ranges should run alongside complexity analysis.

## Build the validation rule through the public API

This self-contained TypeScript example creates a schema, prices the \`issues\` field through a complexity extension, and validates a parsed operation. It is runnable with the \`graphql\` and \`graphql-query-complexity\` packages installed.



\`\`\`ts
import { buildSchema, isObjectType, parse, specifiedRules, validate } from 'graphql';
import {
  createComplexityRule,
  fieldExtensionsEstimator,
  simpleEstimator,
} from 'graphql-query-complexity';

const schema = buildSchema(\`
  type Issue { id: ID!, title: String!, body: String! }
  type Repository { id: ID!, name: String!, issues(first: Int!): [Issue!]! }
  type Query { repository(id: ID!): Repository }
\`);

const repositoryType = schema.getType('Repository');
if (isObjectType(repositoryType)) {
  repositoryType.getFields().issues.extensions = {
    complexity: ({ args, childComplexity }: {
      args: { first: number };
      childComplexity: number;
    }) => 2 + args.first * childComplexity,
  };
}

export function complexityErrors(
  source: string,
  variables: Record<string, unknown>,
  maximumComplexity = 50,
) {
  let measured = -1;
  const rule = createComplexityRule({
    maximumComplexity,
    variables,
    estimators: [
      fieldExtensionsEstimator(),
      simpleEstimator({ defaultComplexity: 1 }),
    ],
    onComplete: (value) => {
      measured = value;
    },
  });

  const errors = validate(schema, parse(source), [...specifiedRules, rule]);
  return { errors, measured };
}
\`\`\`



Keep the complexity rule in addition to \`specifiedRules\`. Complexity checking is not a replacement for GraphQL validation. An unknown field, invalid fragment, or missing required argument should still be rejected by the standard rules.

The schema extension is attached programmatically here to keep the example compact. In a production code-first schema, define complexity metadata where fields are built. Test the built schema artifact, not a duplicate cost map maintained only by QA.

## Prove the exact acceptance and rejection boundary

A threshold test should include one operation below the maximum, one exactly at the maximum, and one just above it. This catches \`>\` versus \`>=\` mistakes and unannounced formula changes. Do not hard-code expected totals until you have manually derived them from the configured estimators.



\`\`\`ts
import { complexityErrors } from './complexity-rule';

const query = \`
  query RepositoryIssues($id: ID!, $pageSize: Int!) {
    repository(id: $id) {
      id
      issues(first: $pageSize) {
        id
        title
      }
    }
  }
\`;

describe('repository query complexity boundary', () => {
  test.each([
    { pageSize: 10, maximum: 25, shouldReject: false },
    { pageSize: 10, maximum: 24, shouldReject: false },
    { pageSize: 10, maximum: 23, shouldReject: true },
  ])(
    'pageSize=$pageSize with maximum=$maximum',
    ({ pageSize, maximum, shouldReject }) => {
      const { errors, measured } = complexityErrors(
        query,
        { id: 'repo-7', pageSize },
        maximum,
      );

      expect(measured).toBe(24);
      if (shouldReject) {
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('maximum complexity');
      } else {
        expect(errors).toHaveLength(0);
      }
    },
  );
});
\`\`\`



For this model, the two requested issue leaves cost 2 per item, multiplied by ten. The issues field adds 2, and the repository selection adds its own ID and field cost, producing 24. If your installed package version reports a different number, derive it from that version rather than changing assertions blindly. Pin the package, because complexity changes are security-relevant behavior.

An HTTP-level test should additionally send the operation to the real endpoint. Assert the documented status code and GraphQL error shape, then prove no business resolver or downstream dependency was invoked. Some servers return HTTP 400 for validation errors; others return 200 with an \`errors\` array. Consistency with your API contract matters more than choosing one universal convention.

## Distinguish depth from calculated cost

Depth limits and complexity limits defend different failure modes. Test them independently so a depth rejection does not masquerade as cost enforcement.

| Operation | Depth risk | Cost risk | Expected control |
|---|---|---|---|
| \`viewer { manager { manager { id } } }\` | High recursive nesting | Possibly small | Depth rule |
| Ten aliased expensive reports | Shallow | High fixed field cost | Complexity rule |
| Repositories to issues to comments | Moderate | High list multiplication | Complexity plus pagination caps |
| Introspection query | Deep and broad | Tooling-dependent | Explicit introspection policy |
| One huge input object mutation | Low selection depth | Input processing risk | Request-size and input limits |

Create a query that is one level under the depth maximum but over the complexity maximum, then reverse the conditions. Assert the error code or message produced by the intended rule. If both limits trigger, error ordering may depend on rule order and should not be the sole oracle.

A cycle in the schema does not itself create an infinite query. The operation is finite text, but fragments can obscure effective depth. Depth tooling must expand fragment spreads safely and reject fragment cycles through standard validation.

## Attack the estimator with aliases and repeated selections

Aliases allow a client to request the same costly field multiple times under different response keys. An estimator that deduplicates by field name may undercount this operation:



\`\`\`graphql
query Dashboard {
  current: generatedReport(range: CURRENT_MONTH) { downloadUrl }
  previous: generatedReport(range: PREVIOUS_MONTH) { downloadUrl }
  annual: generatedReport(range: CURRENT_YEAR) { downloadUrl }
}
\`\`\`



Test repeated aliases both with identical and distinct arguments. Depending on the execution engine, identical unaliased selections may merge, while aliased fields remain separate response entries. Base expectations on GraphQL execution semantics and your resolver batching, not on visual similarity.

Also test fragments used more than once, nested inline fragments on interfaces, and named fragments declared far from the operation. A cost engine must count the effective selection set without double-counting mutually exclusive type conditions incorrectly. For a union of \`Photo\` and \`Video\`, only one runtime branch applies to a given object, but a conservative estimator may use the maximum branch cost. Document the choice.

## Variables must affect cost before execution

Pagination multipliers often arrive through variables. Test the same query document with \`first\` values of 1, the normal page size, the maximum allowed size, one over that maximum, zero, null, and a wrong type. Complexity should use coerced values consistent with execution, while standard argument validation rejects invalid values.

Persisted queries add another boundary. If the server caches validation results by document hash but complexity depends on variables, it cannot reuse one numeric decision for every request. Test a persisted document first with a small variable and then a large one. The second request must be recalculated or bounded by a safe worst case.

Default arguments need direct coverage. Compare an omitted \`first\` with explicitly passing the schema default. Their calculated costs should agree. If the application clamps 10,000 down to 100 only inside the resolver, the pre-execution estimator may calculate 10,000 or, worse, calculate an untrusted low value. Move validation and normalization to a shared pre-execution boundary.

## Confirm rejection happens before expensive resolvers

An error response alone is inadequate. A middleware can calculate complexity after execution has already started, producing the right message after consuming the resources it was meant to protect.

Instrument resolver entry in an integration test with spies or counters. Send an over-limit operation and require zero calls to the repository, report, and downstream HTTP clients. For an accepted operation, require the expected calls so a disconnected test harness cannot pass trivially.

At gateway level, check that rejected operations do not reach subgraphs. At a serverless boundary, check that no database query is emitted after validation. Keep logs or traces as secondary evidence, while spies and fake downstreams provide deterministic assertions.

This is also where authentication order matters. A cost rejection should not reveal private schema details to an unauthenticated caller. Conversely, performing expensive identity hydration before basic request limits can leave a resource gap. Test the documented pipeline with unauthenticated, normal, privileged, and internal callers.

## Tune thresholds with production-shaped operations

Do not set the maximum by looking only at synthetic attacks. Collect representative operation documents and variables from approved clients, sanitize them, and calculate their costs offline. Identify expensive legitimate cases, then decide whether to optimize their resolvers, grant a trusted-client budget, or revise field weights.

Avoid one unlimited “internal” role. A compromised internal token would bypass the defense. Tiered budgets can be reasonable, but every tier needs a finite cap and tests. Rate limits and complexity limits complement each other: one bounds work per request, the other bounds aggregate request frequency.

Cost is an estimate. Validate it against measurements such as SQL statements, rows scanned, downstream calls, CPU time, and response bytes. If high-cost and low-cost operations show no useful ordering, recalibrate. A perfect linear relationship is unrealistic because caches and batching change execution, but gross inversions deserve investigation.

For a complete request suite beyond resource controls, use the [GraphQL testing guide](/blog/graphql-testing-complete-guide). Complexity should also sit within an [API security testing checklist](/blog/api-security-testing-checklist-2026) that covers authentication, authorization, input size, rate limiting, introspection policy, and error disclosure.

## Regression cases worth keeping in CI

Build a corpus whose names state the estimator risk:

- A scalar-only query well below the cap.
- A connection at one under, exactly at, and one over the page-size boundary.
- A low-depth query with repeated expensive aliases.
- A high-depth single-object traversal with modest calculated cost.
- A named fragment reused through two response paths.
- Interface fragments with cheap and expensive concrete branches.
- The same persisted document with small and excessive variables.
- Multiple operations where \`operationName\` selects the cheap or expensive operation.
- An over-limit request that proves resolvers were untouched.
- A normal production operation protected against accidental weight inflation.

Snapshotting only error text is brittle. Prefer a stable application error code, measured cost where safe to expose in tests, maximum allowed value, and resolver-call evidence. Avoid returning a detailed field-by-field cost breakdown to untrusted production clients, since it can help tune adversarial queries. Rich diagnostics can go to protected telemetry.

Run the corpus whenever schema complexity metadata, gateway configuration, GraphQL libraries, pagination defaults, or resolver topology changes. A schema field added without a weight will often fall back to the simple estimator, which may be far too cheap for its actual resolver. Add a schema lint or test that requires explicit metadata on known expensive field classes.

## Batch loaders can change runtime cost without changing the score

DataLoader-style batching means ten field resolutions might produce one database query, while a small-looking field can trigger ten uncached downstream requests. Complexity weights should represent protected resource consumption, not count resolver functions mechanically. Build two integration fixtures: one where related IDs batch successfully and another where arguments prevent batching. Compare traces with the calculated score.

Do not reduce a list multiplier to zero because batching works today. Large result sets still consume memory, serialization time, and response bandwidth. Instead, price the connection for its stable costs and give unusually expensive children explicit extensions. If a cache makes a report cheap on one request, the admission decision should generally assume the miss path unless cache guarantees are strong enough to include safely.

## Test multi-operation documents and selected operation names

A request document may contain a cheap operation and an expensive operation. The client supplies \`operationName\` to choose one. The server must calculate the selected executable operation, not accept the entire document because one member is cheap or reject a cheap selection because an unused member is expensive.

Send the same document three ways: select the cheap operation, select the costly operation, and omit \`operationName\` when multiple operations exist. Expect acceptance, complexity rejection, and standard GraphQL operation-selection error respectively. Include fragments shared by both operations so the estimator does not charge an unused spread.

If the HTTP layer parses or caches documents before authentication, include caller budget and selected operation in any cached complexity decision. A high-budget internal request must not populate an acceptance result later reused for a low-budget public caller.

## Guard introspection and trusted tooling separately

Introspection operations are broad and can be expensive under a naive estimator, but developer tools may legitimately need them. Do not weaken the general cost formula with a field-name exemption accessible to every client. Apply an authenticated tooling policy or persisted allowlist, then test both authorized and ordinary callers.

Verify that a blocked introspection request does not execute resolvers or reveal a detailed budget breakdown. Also test a non-introspection operation whose aliases begin with double underscores in response names, so policy relies on validated fields rather than text scanning. Complexity control, introspection policy, and authorization should remain independent gates with distinguishable diagnostics.

## Observe accepted costs without exposing a tuning manual

Production telemetry should record calculated complexity, operation identity or persisted hash, caller tier, rejection outcome, duration, response size, and downstream work. Avoid storing raw variables that can contain personal data. Compare cost bands with resource measurements and alert when the accepted distribution shifts after a schema release.

Rejection rate alone is ambiguous. A sudden increase can indicate an attack, a broken client rollout, or a newly weighted field. Break it down by authenticated client and operation while preserving privacy. Keep the maximum and estimator version with each event so dashboards do not compare incompatible scores.

Test observability itself. Send one accepted and one rejected operation with known correlation IDs, collect the emitted structured records, and assert the expected cost, policy tier, and decision. Require the rejected trace to show no resolver spans. Logging must be non-blocking enough that complexity defense does not become a new request-amplification path under abusive traffic.

During incident response, a temporary lower budget may protect the service, but it can also break trusted operations. Exercise configuration changes in a staging corpus and keep a rollback path. A threshold is operational policy, so changes deserve the same review and boundary tests as source code.

## Frequently Asked Questions

### What maximum GraphQL complexity value should we use?

There is no portable number because points depend on your estimator. Calculate costs for production-shaped operations, correlate them with backend work, leave bounded headroom, and test finite budgets for every caller tier.

### Is a depth limit enough if every list has pagination?

No. A shallow operation can repeat costly aliases or request several wide connections. Keep depth protection for recursive shapes and complexity analysis for aggregate estimated work, plus hard page-size validation.

### Should an operation exactly equal to the maximum be accepted?

Choose and document the boundary, then test below, equal, and above. Many configurations reject only values greater than the maximum, but your contract and library behavior are the authority.

### How should fragments be charged?

Charge the effective selections introduced by fragment spreads while respecting type conditions and standard fragment validation. Include reused named fragments, inline fragments, and fragment cycles in the regression corpus.

### Can clients be told the measured query cost?

Trusted development clients benefit from cost feedback, and response extensions are sometimes used for that purpose. For untrusted production callers, expose a stable rejection code and keep detailed field-level accounting in protected logs to avoid aiding query tuning.
`,
};
