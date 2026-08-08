import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'GraphQL Testing Directive Skip Include: A Complete @skip and @include Guide',
  description: 'Master GraphQL testing directive skip include behavior with runnable tests for Boolean variables, fragments, resolver calls, response shape, and invalid queries.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# GraphQL Testing Directive Skip Include: A Complete @skip and @include Guide

GraphQL testing for directive \`@skip\` and \`@include\` behavior starts with a four-case Boolean matrix. A selection is executed only when its \`@skip(if: ...)\` condition is false and its \`@include(if: ...)\` condition is true. The directives have no precedence over one another. Your tests must assert both the response shape and whether the selected field's resolver actually ran, because an omitted key is only half of the server-side contract.

The practical payoff is a compact suite that catches variable-coercion mistakes, fragment bugs, unwanted expensive resolver work, client cache surprises, and regressions in gateways or custom execution layers. This guide uses the reference \`graphql\` JavaScript package with Node's built-in test runner for execution-level tests, then adds HTTP examples for a real transport boundary. The normative directive definitions and execution rules are in the GraphQL specification at https://spec.graphql.org/September2025/.

The [SuperTest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide) covers the surrounding HTTP harness in more depth. When independently deployed consumers and providers must agree on conditional response shapes, the [contract testing Pact complete guide](/blog/contract-testing-pact-complete-guide) explains how to carry those expectations into consumer contracts.

## Turn directive semantics into a truth table

The built-in directives have required non-null Boolean arguments:

\`\`\`graphql
directive @skip(if: Boolean!) on FIELD | FRAGMENT_SPREAD | INLINE_FRAGMENT
directive @include(if: Boolean!) on FIELD | FRAGMENT_SPREAD | INLINE_FRAGMENT
\`\`\`

\`@skip(if: true)\` excludes the selection. \`@include(if: true)\` includes it. When both appear at one location, exclusion wins through Boolean logic, not directive ordering: include only when \`skip = false\` and \`include = true\`.

| \`skip\` | \`include\` | Field collected? | Expected response key |
|---:|---:|---:|---|
| \`false\` | \`false\` | No | Absent |
| \`false\` | \`true\` | Yes | Present |
| \`true\` | \`false\` | No | Absent |
| \`true\` | \`true\` | No | Absent |

This table is your minimum combined-directive suite. Testing only \`@skip(true)\` and \`@include(true)\` misses the interaction. Swapping the textual order must not change results because field collection applies the conditions commutatively.

Do not treat exclusion as a \`null\` value. An excluded selection is absent from the response object. A selected nullable field whose resolver returns \`null\` is present with a JSON null. Clients, snapshot tests, and normalized caches can distinguish those shapes.

## Create a resolver fixture that exposes execution

A useful fixture has one cheap field, one nullable field, and one expensive field whose resolver increments a counter. The counter proves whether field collection prevented resolver execution.

\`\`\`bash
mkdir graphql-directive-tests
cd graphql-directive-tests
npm init -y
npm install graphql
\`\`\`

Create \`directive.test.mjs\` with a schema built from documented GraphQL primitives:

\`\`\`js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSchema, graphql } from 'graphql';

const schema = buildSchema(\`
  type Query {
    report: Report!
  }

  type Report {
    id: ID!
    summary: String!
    details: String!
    optionalNote: String
  }
\`);

let detailsCalls = 0;

const rootValue = {
  report: () => ({
    id: 'r-17',
    summary: 'ready',
    details: () => {
      detailsCalls += 1;
      return '42 checks passed';
    },
    optionalNote: () => null,
  }),
};

function execute(source, variableValues = {}) {
  return graphql({ schema, source, rootValue, variableValues });
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}
\`\`\`

\`buildSchema\` uses the default field resolver, which calls a function-valued property with the resolver arguments. That makes the counter fixture small and real. Reset \`detailsCalls\` in each relevant test so results do not depend on test order.

## Test each directive independently before combining them

Begin with literal arguments. Literal cases isolate field collection from variable coercion and client serialization.

\`\`\`js
test('@skip excludes a field when if is true', async () => {
  detailsCalls = 0;
  const result = await execute(\`
    query {
      report {
        id
        details @skip(if: true)
      }
    }
  \`);

  assert.deepEqual(plain(result), {
    data: { report: { id: 'r-17' } },
  });
  assert.equal(detailsCalls, 0);
});

test('@include executes a field when if is true', async () => {
  detailsCalls = 0;
  const result = await execute(\`
    query {
      report {
        id
        details @include(if: true)
      }
    }
  \`);

  assert.deepEqual(plain(result), {
    data: {
      report: { id: 'r-17', details: '42 checks passed' },
    },
  });
  assert.equal(detailsCalls, 1);
});
\`\`\`

These assertions prove three things: the selected object remains valid, the excluded response key is absent, and exclusion avoids resolver work. An output-only snapshot would not reveal a buggy executor that calls the resolver and discards its result afterward.

Add the inverse literal cases as well. \`@skip(if: false)\` should include the field, while \`@include(if: false)\` should exclude it. The names “skip” and “include” make it easy to accidentally write two tests that assert the same Boolean branch.

## Drive the full matrix with non-null variables

Production queries usually use variables. Define both as \`Boolean!\` so omitting either variable is an input error rather than an accidental default.

\`\`\`js
const combinedQuery = \`
  query Report($hideDetails: Boolean!, $showDetails: Boolean!) {
    report {
      id
      details
        @skip(if: $hideDetails)
        @include(if: $showDetails)
    }
  }
\`;

const cases = [
  { hideDetails: false, showDetails: false, present: false },
  { hideDetails: false, showDetails: true, present: true },
  { hideDetails: true, showDetails: false, present: false },
  { hideDetails: true, showDetails: true, present: false },
];

for (const row of cases) {
  test(\`combined directives: hide=\${row.hideDetails}, show=\${row.showDetails}\`, async () => {
    detailsCalls = 0;
    const result = await execute(combinedQuery, {
      hideDetails: row.hideDetails,
      showDetails: row.showDetails,
    });

    assert.equal(result.errors, undefined);
    const report = result.data.report;
    assert.equal(
      Object.hasOwn(report, 'details'),
      row.present,
    );
    assert.equal(detailsCalls, row.present ? 1 : 0);
  });
}
\`\`\`

The rendered JavaScript interpolates the case values into the test name. More importantly, it does not compare \`report.details\` with \`undefined\`. A present property can legitimately hold \`undefined\` in an in-process JavaScript object before serialization, while GraphQL responses should serialize selected values according to their types. \`Object.hasOwn\` states the shape assertion directly.

| Assertion target | Catches | Does not prove |
|---|---|---|
| Response key presence | Selection was represented | Resolver was not called when absent |
| Resolver call count | Expensive work was avoided | HTTP JSON shape is correct |
| Error array | Validation or coercion behavior | Client cache handles shape |
| HTTP status and body | Transport integration | Downstream calls were avoided |
| Client UI state | Consumer interpretation | Server resolver efficiency |

Layer these assertions rather than asking one end-to-end test to diagnose every boundary.

## Treat omitted, null, false, and string false as different inputs

The directive argument type is \`Boolean!\`. Through variables, the accepted values are JSON booleans. The string \`"false"\` is not the Boolean \`false\`; \`null\` violates non-null; and an omitted required variable has no runtime value. All three invalid inputs should produce GraphQL errors before normal field execution.

\`\`\`js
const variableQuery = \`
  query Report($show: Boolean!) {
    report {
      id
      details @include(if: $show)
    }
  }
\`;

for (const [label, variables] of [
  ['omitted', {}],
  ['null', { show: null }],
  ['string false', { show: 'false' }],
]) {
  test(\`rejects \${label} for Boolean! directive variable\`, async () => {
    detailsCalls = 0;
    const result = await execute(variableQuery, variables);

    assert.ok(result.errors?.length);
    assert.equal(result.data, undefined);
    assert.equal(detailsCalls, 0);
  });
}
\`\`\`

Do not lock tests to an entire human-readable error string unless your public contract promises it. Message wording can vary across implementation versions. Assert the presence of errors, the absence of executed data when appropriate, resolver side effects, and any stable error extension codes your own server explicitly defines.

What people get wrong is defining \`$show: Boolean\` and passing it to \`@include(if: $show)\`. The directive expects \`Boolean!\`, so a nullable variable is not generally valid at that non-null argument position unless GraphQL's variable-usage rules make an applicable default bridge. The clearest client query uses \`Boolean!\` or provides an explicit variable default.

## Test default values as part of the operation contract

A variable default changes omission behavior. With \`$show: Boolean! = false\`, a missing variable is valid and the field is excluded. An explicit \`null\` remains invalid because the variable type is non-null.

\`\`\`js
test('uses a declared default when the variable is omitted', async () => {
  detailsCalls = 0;
  const result = await execute(\`
    query Report($show: Boolean! = false) {
      report {
        id
        details @include(if: $show)
      }
    }
  \`);

  assert.deepEqual(plain(result), {
    data: { report: { id: 'r-17' } },
  });
  assert.equal(detailsCalls, 0);
});

test('explicit true overrides the declared default', async () => {
  detailsCalls = 0;
  const result = await execute(\`
    query Report($show: Boolean! = false) {
      report {
        id
        details @include(if: $show)
      }
    }
  \`, { show: true });

  assert.equal(result.data.report.details, '42 checks passed');
  assert.equal(detailsCalls, 1);
});
\`\`\`

Defaults are not merely syntax convenience. They decide what older clients do when a newly introduced variable is absent. Test the omitted case deliberately, and document whether conservative omission means hide or show.

## Exercise fields, fragment spreads, and inline fragments

The built-ins can appear on a field, a fragment spread, or an inline fragment. A test suite covering only direct fields leaves two execution paths untested. Fragment-level directives are especially common in generated client documents.

\`\`\`js
test('skips every field behind a fragment spread', async () => {
  detailsCalls = 0;
  const result = await execute(\`
    query Report($hideExtra: Boolean!) {
      report {
        id
        ...ExtraReport @skip(if: $hideExtra)
      }
    }

    fragment ExtraReport on Report {
      summary
      details
    }
  \`, { hideExtra: true });

  assert.deepEqual(plain(result), {
    data: { report: { id: 'r-17' } },
  });
  assert.equal(detailsCalls, 0);
});

test('includes fields behind an inline fragment', async () => {
  detailsCalls = 0;
  const result = await execute(\`
    query Report($showExtra: Boolean!) {
      report {
        id
        ... on Report @include(if: $showExtra) {
          summary
          details
        }
      }
    }
  \`, { showExtra: true });

  assert.deepEqual(plain(result.data.report), {
    id: 'r-17',
    summary: 'ready',
    details: '42 checks passed',
  });
  assert.equal(detailsCalls, 1);
});
\`\`\`

Also test nested fragments if your client generator emits them. The directive is evaluated at each selection boundary. If an outer fragment is excluded, inner directives are irrelevant because their selections are never collected.

| Directive location | Representative risk | High-value assertion |
|---|---|---|
| Field | One expensive resolver still runs | Key absence plus call count zero |
| Fragment spread | Whole reusable selection leaks into shape | Every fragment-only key absent |
| Inline fragment | Type-specific data appears incorrectly | Shape under each runtime type |
| Nested spread | Inner condition masks outer exclusion | Outer false prevents all descendants |

## Distinguish excluded fields from selected null fields

Nullability bugs often masquerade as directive bugs. Use one query that selects the nullable \`optionalNote\` and conditionally selects \`details\`:

\`\`\`js
test('distinguishes a selected null from an excluded field', async () => {
  const result = await execute(\`
    query Report($showDetails: Boolean!) {
      report {
        optionalNote
        details @include(if: $showDetails)
      }
    }
  \`, { showDetails: false });

  assert.deepEqual(plain(result), {
    data: {
      report: {
        optionalNote: null,
      },
    },
  });
  assert.equal(Object.hasOwn(result.data.report, 'details'), false);
  assert.equal(Object.hasOwn(result.data.report, 'optionalNote'), true);
});
\`\`\`

This distinction matters in TypeScript clients. A generated conditional field may be optional because it can be excluded, while the schema field can independently allow \`null\`. The practical type may need both dimensions, such as \`details?: string | null\`, depending on the operation and generator. Do not erase that distinction with truthiness checks.

## Verify duplicate selections and aliases

GraphQL groups selected fields by response key. If the same response key is reached through multiple selections, at least one included path can cause the field to execute. This surprises tests that assume one excluded occurrence removes every occurrence.

\`\`\`js
test('an included duplicate selection still resolves the field', async () => {
  detailsCalls = 0;
  const result = await execute(\`
    query {
      report {
        details @skip(if: true)
        details @include(if: true)
      }
    }
  \`);

  assert.equal(result.data.report.details, '42 checks passed');
  assert.equal(detailsCalls, 1);
});

test('aliases create independent response keys', async () => {
  detailsCalls = 0;
  const result = await execute(\`
    query {
      report {
        hidden: details @skip(if: true)
        visible: details @include(if: true)
      }
    }
  \`);

  assert.deepEqual(plain(result.data.report), {
    visible: '42 checks passed',
  });
  assert.equal(detailsCalls, 1);
});
\`\`\`

The resolver call count is one in both examples. In the alias case, only the visible alias contributes a response key. In the duplicate-key case, included field nodes are merged for execution. This is specification-level behavior worth testing in gateways that rewrite or combine documents.

## Validate illegal locations and repeated directives

\`@skip\` and \`@include\` are non-repeatable and have specific executable locations. Applying \`@skip\` to the operation itself is invalid. Applying \`@skip\` twice at the same field location is also invalid, even if the arguments differ.

\`\`\`js
test('rejects @skip on an operation', async () => {
  const result = await execute(\`
    query Invalid @skip(if: true) {
      report { id }
    }
  \`);

  assert.ok(result.errors?.length);
  assert.equal(result.data, undefined);
});

test('rejects repeated non-repeatable @include at one location', async () => {
  const result = await execute(\`
    query {
      report {
        id @include(if: true) @include(if: false)
      }
    }
  \`);

  assert.ok(result.errors?.length);
  assert.equal(result.data, undefined);
});
\`\`\`

Do not confuse this with applying the same directive to two separate occurrences of a field. That can be valid because they are separate syntactic locations. Validation tests should use precisely the illegal document they claim to cover.

## Add an HTTP boundary without weakening the assertions

Execution-level tests are fast and expose call counts, but your deployed server also parses JSON variables, chooses status codes, and serializes absent keys. Send the same operation over HTTP. This example assumes an Express app exported from \`app.js\` at \`POST /graphql\` and uses SuperTest's documented request API.

\`\`\`js
import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { app, resetMetrics, readMetrics } from './app.js';

const query = \`
  query Report($show: Boolean!) {
    report {
      id
      details @include(if: $show)
    }
  }
\`;

test('HTTP response omits the conditional field when false', async () => {
  resetMetrics();
  const response = await request(app)
    .post('/graphql')
    .send({ query, variables: { show: false } })
    .expect(200)
    .expect('Content-Type', /json/);

  assert.deepEqual(response.body, {
    data: { report: { id: 'r-17' } },
  });
  assert.equal(readMetrics().detailsCalls, 0);
});
\`\`\`

The exact HTTP status for GraphQL request errors depends on the transport specification and server policy. Do not hard-code \`400\` for invalid variables merely because one framework returns it. Assert the contract your service documents, while keeping the GraphQL \`errors\` structure assertion separate.

## Check that conditional mutations do not hide unsafe intent

Directives also apply to fields in mutation selection sets. Top-level mutation fields execute serially in response order, but an excluded mutation field does not execute. A client can therefore conditionally include one mutation operation alongside another.

That behavior is valid, but it is easy to make a dangerous test mistake: asserting only the returned object and not the side effect. For mutations, measure the database write, emitted event, or fake adapter call count. Test all Boolean branches and reject missing required variables. Never use a directive as an authorization control. The server must authorize any mutation that is selected and executed.

| Mutation case | Response assertion | Side-effect assertion |
|---|---|---|
| Included top-level field | Key present | Exactly one intended write |
| Excluded top-level field | Key absent | Zero writes and zero events |
| Invalid Boolean variable | Errors present | No mutation field executes |
| Two included fields | Both keys present | Serial effects in document order |

Authorization, validation, and idempotency remain server responsibilities. Conditional inclusion only controls the query document's selection collection.

## Audit client behavior around changing response shapes

Server compliance does not guarantee client correctness. A client may reuse a normalized cache entry from a previous query where \`details\` was included, making the UI appear to receive data that the latest network response omitted. Another client may destructure the property without checking whether its condition was true.

Create a consumer test sequence:

1. Execute with \`showDetails: true\` and store the result.
2. Execute with \`showDetails: false\` against the same entity identifier.
3. Inspect the raw network payload and the client-facing read separately.
4. Assert the UI rule, such as hiding the details panel when the controlling variable is false.
5. Reverse the order to detect state-dependent behavior.

Do not call stale cached data a server directive defect until the raw response proves the server returned the field. Preserve request variables, operation text or persisted-query ID, raw JSON, and cache read as separate artifacts.

## Diagnose a resolver that runs for an excluded fragment

A realistic failure appears after a gateway optimization: the response correctly omits \`details\` when a fragment has \`@skip(if: true)\`, but an expensive downstream request still occurs. Latency and billing increase even though snapshots pass.

Use this diagnosis sequence:

1. Reproduce at the execution layer with a resolver counter or fake downstream adapter.
2. Confirm the variable is a JSON Boolean and that coercion produced the expected value.
3. Move the directive from fragment spread to direct field temporarily. If the direct case passes, inspect fragment expansion.
4. Compare behavior with and without gateway document rewriting.
5. Capture the validated document after persisted-query lookup or transformation.
6. Assert the downstream adapter saw zero calls in the excluded branch.

The likely defect is that a custom planner expanded fragment fields before applying selection directives, then filtered only response assembly. The GraphQL execution model applies \`@skip\` and \`@include\` while collecting fields. Fix or update the planner, and retain both shape and call-count tests as regression coverage.

## Build a compact release gate

A durable directive suite does not need hundreds of cases. It needs coverage of the distinct semantic boundaries:

| Suite layer | Cases worth requiring on every change |
|---|---|
| Literals | All true and false branches for each directive |
| Combined | Four-row truth table and swapped textual order |
| Variables | True, false, omitted, null, wrong JSON type, default |
| Locations | Field, fragment spread, inline fragment |
| Shape | Absent versus selected null, aliases, duplicate response key |
| Execution | Resolver and downstream call counts |
| Validation | Illegal location and repeated non-repeatable directive |
| Transport | JSON serialization and service-specific status policy |
| Consumer | Cache and UI behavior across variable changes |

Run the pure execution tests in the fast PR gate. Run HTTP integration tests against the actual server assembly. Keep client cache tests with the consumer. This allocation produces faster diagnosis than one broad end-to-end scenario.

## Verify the built-in directive contract through introspection

Schema introspection can confirm that the running service exposes the directives and their arguments at the expected locations. This is valuable when a gateway assembles schemas, filters introspection, or delegates execution to a nonstandard engine. The check should not replace execution tests because introspection describes capability, not correct behavior.

Query the directive inventory in an authorized test environment and locate the entries named skip and include. Assert that each has an if argument whose type is non-null Boolean, and that supported locations include FIELD, FRAGMENT_SPREAD, and INLINE_FRAGMENT. When production disables general introspection for policy reasons, run the same assertion against the built schema in process or through an administrative test endpoint.

Do not snapshot the entire introspection response. Schema ordering and unrelated directives create noisy diffs. Project only the fields required by the contract and compare sets for locations. This keeps a new custom directive from breaking a test whose purpose is built-in behavior.

| Introspection property | Expected contract | Regression it catches |
|---|---|---|
| Directive name | skip and include exist | Gateway omitted built-ins |
| Argument name | if | Incorrect custom replacement |
| Argument wrapper | Non-null Boolean | Nullable coercion accepted unexpectedly |
| Locations | Field and both fragment forms | Planner lacks one selection path |
| Repeatability | False | Duplicate use accepted at one location |

An introspection pass can also detect an accidental custom directive with a similar name. Tests should send the standard lowercase names exactly because GraphQL names are case-sensitive.

## Include persisted queries and document transforms in the matrix

Many production requests do not transmit the original query text. A client sends a persisted-query identifier, a router retrieves the document, and one or more transforms add fragments, remove client-only fields, or plan subgraph fetches. Directive behavior can fail in any of those stages even when direct execution against the application schema passes.

Choose one persisted operation that places conditions on a direct field and one that places them on a fragment spread. Register the exact documents through the same deployment mechanism used in production. For every Boolean row, preserve the request identifier, variables, resolved document hash, planner representation if available, subgraph calls, and final JSON. Assert that skipped selections do not trigger downstream fetches.

Version persisted operations immutably. Reusing one identifier for changed text makes failures difficult to reproduce and can leave old clients and new routers disagreeing about variable definitions. If the registry supports only hashes, calculate them from the canonical document used by the client build and verify that the router resolves the same bytes.

A useful differential test executes the same operation through two paths: directly against the reference schema and through the full router. Normalize only irrelevant metadata, then compare data shape, errors, and resolver or subgraph call counts. A mismatch localizes the defect to transport, registry lookup, transformation, or planning rather than directive semantics in the reference engine.

## Add cost and authorization assertions at skipped boundaries

Skipping a field should avoid its resolver, but tests should also observe work behind the resolver. Data loaders, subgraph fetches, database queries, and authorization checks may run during planning or parent resolution. Instrument the narrowest expensive boundary and assert zero calls for an excluded selection.

Be careful with parent fields. In a query that always selects report.id and conditionally selects report.details, the report resolver must still run to produce id. Only the details resolver and details-specific downstream work should be absent. An assertion that no report-related activity occurred would encode an impossible expectation.

Authorization remains mandatory when the field is included. Add two identities to the matrix: one permitted and one denied. The denied identity with the field included should produce the service's documented authorization result. The denied identity with the field excluded should not cause sensitive work or leak authorization-specific metadata. This proves that conditional selection reduces unnecessary execution without becoming a client-controlled security boundary.

Directive conditions can also alter query-cost estimates. If a gateway performs static cost analysis before variable values are known, document whether it charges the maximum possible selection or a variable-aware cost. Test the declared rule. Do not assume that skipping an expensive field always reduces admission cost, even though correct execution should avoid its resolver.

## Frequently Asked Questions

### What happens when @skip and @include are both present?

The selection is included only when the skip condition is false and the include condition is true. Neither directive has precedence, and reversing their textual order must not change the result. Test all four Boolean combinations because only one includes the field. In excluded cases, assert that the response key is absent and the resolver did not run. That second assertion detects planners that perform unnecessary work before dropping the value from the response.

### Is an excluded GraphQL field returned as null?

No. A field excluded by \`@skip\` or \`@include\` is not collected into the response, so its key is absent. A selected nullable field whose resolved value is null is present with a JSON null. Tests should use a property-presence check or exact object comparison rather than a truthiness assertion. Client types may need to represent optional selection separately from schema nullability, and caches may preserve previously fetched data even when a later raw response omits the field.

### Can I omit the Boolean variable used by a directive?

Only if the operation's variable definition permits omission, commonly through a default value that supplies a non-null Boolean. The directives require \`Boolean!\` arguments. A query declaring \`$show: Boolean!\` without a default must receive a Boolean variable; omission, null, and the string \`"false"\` are invalid. Define the intended default in the operation if omission is part of the client contract, then test omitted and explicit values independently.

### Should directive tests assert exact GraphQL error messages?

Usually not. Exact wording can change across compliant implementation versions and may not be part of your public API. Assert stable behavior: an error exists, execution data is absent or partial as your contract specifies, prohibited resolvers did not run, and any service-defined extension code matches. If your clients display or parse a particular message, then that wording becomes an explicit product contract and deserves a separate assertion owned by the service, not an accidental snapshot dependency.
`,
};
