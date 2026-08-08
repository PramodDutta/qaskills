import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing GraphQL Introspection Exposure Without False Confidence',
  description: 'Learn security testing GraphQL introspection exposure with runnable probes, authorization checks, CI tests, and remediation that protects real attack paths.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Security Testing GraphQL Introspection Exposure Without False Confidence

Security testing GraphQL introspection exposure means verifying who can query the schema, what the schema reveals, and whether production policy matches the observed endpoint behavior. Send small introspection probes as anonymous, low-privilege, and authorized clients. Record the HTTP status and GraphQL response, test aliases and batching paths that your server actually supports, and confirm that authorization still protects every field even when an attacker already knows its name.

Introspection exposure is usually reconnaissance risk, not the root authorization vulnerability. Disabling it can reduce effortless schema discovery, but it does not prevent a determined client from guessing operations, reading shipped frontend queries, observing errors, or reusing persisted documents. The high-value QA outcome is therefore twofold: enforce your intended introspection policy and prove that schema knowledge does not grant data or actions.

This workflow uses curl, Node.js, and Vitest examples that can run against an endpoint you control. It avoids destructive mutations and distinguishes transport failures, validation errors, authorization decisions, and data exposure.

## Define the production policy before probing

Teams often say "introspection should be disabled" without defining scope. Is it disabled only for unauthenticated internet traffic? Available to administrators? Enabled on a private developer endpoint? Does the gateway block it while the origin accepts it? A test cannot distinguish a bug from intended behavior until the policy names identity, environment, and network boundary.

Use a policy matrix:

| Environment and identity | Introspection | Ordinary query | Reason |
|---|---|---|---|
| Local developer | Allowed | Allowed by local fixture | Tooling and schema exploration |
| Shared test, anonymous | Team decision | Public fields only | Realistic external posture |
| Production, anonymous | Denied in this example policy | Public fields only | Reduce effortless discovery |
| Production, support role | Denied | Role-scoped fields | Support does not need schema access |
| Production, schema operator | Allowed through controlled path | Role-scoped fields | Operational diagnosis |

This is an example, not a universal rule. Public GraphQL APIs may intentionally expose introspection because discoverability is part of the product. Private APIs may restrict it at a gateway. Write down the accepted behavior and the control owner.

The GraphQL specification defines the \`__schema\` and \`__type\` meta-fields on the query root. Official specification text is available at https://spec.graphql.org/September2025/. Your server or gateway may add policy around those fields, but tests should recognize a GraphQL error response as different from an absent route or generic proxy rejection.

## Establish endpoint and identity fixtures

Never begin by firing a full schema query at an unknown production host. Confirm written authorization, exact endpoint, rate limits, tenant, and safe identities. Use accounts created for security testing. Tokens must have an explicit expiry and minimum role. Keep secrets outside source control.

The first probe asks only for the query type name. It is enough to determine whether basic schema introspection succeeds.

\`\`\`bash
set -eu

: "\${GRAPHQL_URL:?GRAPHQL_URL must be set}"

curl --fail-with-body --silent --show-error \\
  -H 'content-type: application/json' \\
  --data '{"query":"query IntrospectionSmoke { __schema { queryType { name } } }"}' \\
  "\${GRAPHQL_URL}"
\`\`\`

\`curl --fail-with-body\` treats HTTP 400 or 500 responses as command failures while preserving the body for diagnosis. A GraphQL server can also return HTTP 200 with an \`errors\` array, so shell success alone is not a security assertion.

For authenticated comparison, add the bearer token only when it is present. Keeping anonymous and authenticated commands separate prevents an empty header from being mistaken for a true anonymous request.

\`\`\`bash
set -eu

: "\${GRAPHQL_URL:?GRAPHQL_URL must be set}"
: "\${GRAPHQL_TOKEN:?GRAPHQL_TOKEN must be set}"

curl --fail-with-body --silent --show-error \\
  -H 'content-type: application/json' \\
  -H "authorization: Bearer \${GRAPHQL_TOKEN}" \\
  --data '{"query":"query IntrospectionSmoke { __schema { queryType { name } } }"}' \\
  "\${GRAPHQL_URL}"
\`\`\`

Do not paste token-bearing commands into shared tickets. Store the response as a protected test artifact after removing headers and any unexpectedly returned data.

## Classify the response instead of matching one message

Different GraphQL servers and enforcement layers use different error messages. A brittle test that expects the phrase "introspection disabled" can fail after a harmless library update. Classify the structure and policy outcome.

| Observation | Meaning | Next check |
|---|---|---|
| \`data.__schema\` contains a query type | Introspection succeeded | Compare with policy for this identity |
| HTTP 200 with GraphQL \`errors\` and no schema data | Query reached GraphQL and was rejected | Confirm error is intentional and no partial data leaked |
| HTTP 401 or 403 | Gateway or application rejected identity | Compare ordinary public-query behavior |
| HTTP 404 | Route or routing policy differs | Verify correct endpoint and method |
| HTTP 5xx | Control or server malfunction | Treat as reliability failure, not a secure pass |

This Node.js script sends a document and returns a normalized observation. It relies only on the standard \`fetch\` available in current Node.js runtimes.

\`\`\`js
const url = process.env.GRAPHQL_URL;
if (!url) throw new Error('GRAPHQL_URL must be set');

const query = 'query IntrospectionSmoke { __schema { queryType { name } } }';
const response = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query }),
});

const text = await response.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { nonJsonBody: text };
}

const exposed = Boolean(body?.data?.__schema?.queryType?.name);
console.log(JSON.stringify({ status: response.status, exposed, body }, null, 2));
if (exposed) process.exitCode = 2;
\`\`\`

The exit code above implements an anonymous-deny example policy. Change it only after documenting your policy. The response remains printed so CI can retain evidence, but production pipelines should sanitize unexpected data.

Partial results require attention. GraphQL permits responses that contain both \`data\` and \`errors\`. Do not declare success merely because an \`errors\` key exists. Inspect whether \`__schema\` or \`__type\` data was returned alongside the error.

## Probe both schema and type entry points

Blocking one literal query string is not a robust introspection control. The policy should apply to parsed fields, including aliases, whitespace changes, fragments, and the separate \`__type\` meta-field. Only test transport forms your deployed server intentionally supports, because sending unsupported GET requests or batches can confuse surface coverage with policy coverage.

These are small, non-destructive documents:

\`\`\`graphql
query SchemaProbe {
  __schema {
    mutationType {
      name
    }
  }
}

query TypeProbe {
  __type(name: "Query") {
    name
    kind
  }
}

query AliasProbe {
  catalog: __schema {
    queryType {
      name
    }
  }
}
\`\`\`

If \`SchemaProbe\` is denied but \`AliasProbe\` succeeds, the control likely scans raw text instead of validating the parsed GraphQL operation. That is a real failure mode. The fix belongs in GraphQL validation, schema visibility, or an AST-aware gateway policy, not in a growing list of string patterns.

The special \`__typename\` field deserves a separate decision. Many clients use it for cache normalization and union or interface handling. A control meant to restrict schema introspection should not accidentally break normal documents that select \`__typename\`. Test it explicitly:

\`\`\`graphql
query PublicHealthWithTypename {
  __typename
}
\`\`\`

Whether that document is useful depends on the schema and server, but the policy distinction is important: schema introspection via \`__schema\` and \`__type\` is not the same as selecting \`__typename\` on an object.

## Automate policy checks with Vitest

The test below is self-contained. It sends an anonymous request and asserts that the response does not contain schema data. It does not require a particular error message or HTTP status.

\`\`\`ts
import { describe, expect, it } from 'vitest';

const endpoint = process.env.GRAPHQL_URL;
if (!endpoint) throw new Error('GRAPHQL_URL must be set');

async function graphql(query: string, token?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = \`Bearer \${token}\`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });
  const body = await response.json();
  return { status: response.status, body };
}

describe('production introspection policy', () => {
  it('does not return schema data to an anonymous client', async () => {
    const result = await graphql(
      'query IntrospectionSmoke { __schema { queryType { name } } }',
    );

    expect(result.body?.data?.__schema).toBeFalsy();
  });
});
\`\`\`

Run this specific test by name with Vitest's documented test-name option:

\`\`\`bash
npx vitest run -t "does not return schema data to an anonymous client"
\`\`\`

That uses Vitest \`-t\`, not a Mocha-specific grep option. In a real repository, pin dependencies through the lockfile and use the project's normal package-manager command.

Add a positive control. If the endpoint, certificate, or network is broken, a negative introspection assertion might appear to pass for the wrong reason. Query a documented public field or a dedicated health operation first, then assert the introspection decision.

\`\`\`ts
import { expect, it } from 'vitest';

const endpoint = process.env.GRAPHQL_URL;
if (!endpoint) throw new Error('GRAPHQL_URL must be set');

async function anonymousGraphql(query: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  return { status: response.status, body: await response.json() };
}

it('serves the expected public GraphQL operation', async () => {
  const result = await anonymousGraphql('query PublicHealth { health }');
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ data: { health: 'ok' } });
});

it('rejects aliased schema introspection without partial schema data', async () => {
  const result = await anonymousGraphql(
    'query AliasProbe { catalog: __schema { queryType { name } } }',
  );
  expect(result.body?.data?.catalog).toBeFalsy();
});
\`\`\`

The \`health\` field is an example schema contract, so replace it with a real harmless operation from your API. The important design is the positive control, not that field name.

## Test authorization as if the schema were public

The strongest test assumes an attacker knows every type and field. Given a low-privilege token, attempt safe reads of objects outside the token's tenant and fields outside its role. Use seeded fixtures so no real customer data is touched. Verify response data, errors, audit records, and side effects.

| Attack hypothesis | Safe fixture | Required assertion |
|---|---|---|
| Cross-tenant object read | Object owned by tenant B, token from tenant A | No protected fields or existence leak |
| Role-only field read | Support token, administrator field | Field denied according to policy |
| Node lookup bypass | Known synthetic object ID | Same authorization as ordinary resolver path |
| Nested resolver bypass | Authorized parent with protected child | Child authorization enforced |
| Mutation authorization | Disposable fixture and low role | No state change, auditable denial |

Do not equate \`null\` with a secure result until you know why it is null. It could be authorized absence, field-level denial, a resolver exception, or masked cross-tenant existence. Your test should assert the documented error and verify the datastore or subsequent safe read when a mutation was attempted.

Here is a tenant-isolation test using fixed synthetic IDs:

\`\`\`ts
import { expect, it } from 'vitest';

const endpoint = process.env.GRAPHQL_URL;
if (!endpoint) throw new Error('GRAPHQL_URL must be set');

async function authenticatedGraphql(query: string, token: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({ query }),
  });
  return { status: response.status, body: await response.json() };
}

it('does not expose another tenant order', async () => {
  const tenantAToken = process.env.TENANT_A_TOKEN;
  if (!tenantAToken) throw new Error('TENANT_A_TOKEN must be set');

  const result = await authenticatedGraphql(
    \`query ForeignOrder {
      order(id: "fixture-tenant-b-order") {
        id
        total
        customerEmail
      }
    }\`,
    tenantAToken,
  );

  expect(result.body?.data?.order).toBeFalsy();
  expect(JSON.stringify(result.body)).not.toContain('customer-b@example.test');
});
\`\`\`

This test does not depend on introspection being available. That is deliberate. Authorization must remain secure even when the operation is hand-written from leaked client documents or educated guesses.

Authentication testing should cover token validation independently. For example, a [JWT algorithm confusion security test](/blog/security-testing-jwt-algorithm-confusion) addresses a different control: whether the verifier accepts an attacker-controlled algorithm or key interpretation. Do not let a denied introspection probe stand in for token security.

## Inspect error messages for reconnaissance leakage

GraphQL validation errors can suggest field names. Even with introspection restricted, typo suggestions or verbose exception details may reveal schema structure and implementation. Test several invalid operations and classify the output. Do not spray thousands of guesses, since that turns a controlled assessment into avoidable load.

\`\`\`graphql
query UnknownFieldProbe {
  definitelyNotARealPublicField
}
\`\`\`

Review whether the response exposes:

- Similar field or type names that policy considers sensitive.
- Resolver stack traces, filesystem paths, or package details.
- Database statements or internal service addresses.
- Tenant identifiers or object existence.
- Different error shapes that let a client enumerate valid fields.

Generic errors are not automatically safer if they destroy observability. Keep detailed server-side logs with a correlation ID while returning a minimal client response. Security testing should verify both halves: the client sees no sensitive internals, and authorized operators can still diagnose the event.

Rate limiting and query complexity controls also matter. Schema hiding does not stop an attacker who already has a costly valid operation. Test depth, aliases, repeated fields, and pagination limits under a written non-disruptive plan. Avoid publishing a giant denial-of-service document into a shared environment.

## Diagnose a bypass caused by gateway-only filtering

A realistic failure looks like this: the public gateway rejects \`__schema\`, the origin GraphQL service accepts it, and an internal load balancer route is accidentally reachable from a partner network. The original security test passes because it checks only the public URL.

Diagnosis requires mapping the request path:

1. Confirm DNS, gateway, service mesh, and origin endpoints in scope.
2. Send the same small probe through every authorized route.
3. Compare response headers and correlation IDs to identify the enforcement layer.
4. Check whether WebSocket, GET, or persisted-query paths reach a different handler, but only if enabled by the product.
5. Verify the service-level authorization policy rather than relying solely on the edge rule.

The remediation can be edge restriction plus origin hardening. A private origin should still authenticate its caller, bind to the intended network, and enforce field authorization. Defense in depth matters because routing changes frequently.

Another common bypass is configuration drift. Staging disables introspection, production enables it after a framework upgrade, or one horizontally scaled instance loads a different environment setting. Repeat the probe across deployments through normal load balancing and inspect configuration provenance. Do not invent a server-specific setting name in a generic test plan. Use the documented control for your GraphQL implementation.

## What people get wrong about introspection exposure

The first misconception is that an exposed schema is equivalent to exposed data. It is not. It can accelerate reconnaissance and reveal naming, but resolvers and authorization determine whether protected data or actions are accessible.

The opposite misconception is that introspection never matters. In a private product, descriptions, deprecated fields, mutation names, and internal domain concepts can make targeted testing easier. If policy says it is restricted, exposure is a defect even when authorization holds.

Another mistake is blocking a substring such as \`__schema\`. The literal field name does survive aliases and reformatting, so a substring check is not trivially bypassed, but it is still the wrong control: it misses \`__type\`, it misses transports you forgot to inspect (GET query strings, batched arrays, persisted queries, WebSocket subscribe frames), and it breaks any legitimate query that merely mentions the string. Enforce policy on parsed operations or schema visibility using supported server mechanisms.

Teams also forget positive controls. A network outage, wrong endpoint, or invalid TLS chain can make every forbidden query look denied. Prove that the intended GraphQL service is reachable with a harmless allowed operation.

Finally, avoid returning success from a test just because the response contains errors. GraphQL may return partial data. Assert absence of prohibited data and any side effects.

## Build a production evidence packet

A security finding should be reproducible without exposing secrets. Include the environment, timestamp, endpoint class, identity class, operation hash or sanitized document, HTTP status, normalized GraphQL outcome, expected policy row, and remediation owner. Redact tokens and customer data.

Use severity based on demonstrated impact. Anonymous full-schema exposure contrary to policy is a concrete configuration finding. An unauthorized cross-tenant read is a much more severe authorization failure. Do not inflate the first to compensate for not testing the second.

After remediation, rerun:

- The original minimal probe.
- Alias and \`__type\` variants.
- The ordinary-query positive control.
- Authorized developer tooling on its approved path.
- Tenant and field authorization regression tests.
- Error-message leakage checks.

If token keys or authorization middleware changed, include the [JWKS cache and JWT key rotation test](/blog/testing-jwt-key-rotation-jwks-cache) in the surrounding regression plan. Introspection, authentication, and resolver authorization are separate controls whose failures can combine.

The final report should say what was and was not tested. A POST-only test does not cover WebSockets. An anonymous test does not cover a compromised low-privilege account. Precise scope makes the result useful and prevents a narrow green check from becoming a broad security claim.

## Verify remediation without breaking developer operations

Introspection restrictions can disrupt schema download, IDE completion, client code generation, and contract checks. A secure change is incomplete if teams respond by sharing a production administrator token or opening an unmanaged alternate endpoint. During remediation planning, inventory every legitimate schema consumer and give each one an approved path with narrow credentials, network restriction, audit logging, and revocation.

Build the regression in two directions. The external anonymous route must not return schema data under the example policy, while the controlled schema-management route must still return the expected schema to its authorized identity. This positive authorization test detects a rule that blocks everyone. It also encourages ownership of the schema path instead of a permanent emergency exception.

Compare schemas structurally rather than storing an unreviewed production dump in ordinary CI logs. A schema artifact can reveal internal descriptions, deprecated operations, and future capabilities. Protect it like other design documentation. When a diff introduces a new sensitive field, require an authorization test for that resolver even if public introspection remains disabled.

Retest rollback behavior. If a gateway rule must be reverted during an incident, field authorization and query-cost controls should still contain impact. A control that is safe only while one edge filter is active has a single point of failure. Tabletop the rollback with platform, API, and security owners, then turn the agreed invariant into a small automated test.

For federated GraphQL, clarify which surface is being tested. The public graph, router or gateway, and individual subgraphs may expose different schemas and accept different identities. Do not assume a denial at the public graph proves subgraphs are unreachable or protected. Confirm network reachability and authentication at every authorized boundary, using the smallest probe and synthetic accounts. Federation-specific metadata may have its own exposure policy, so use the official documentation for the deployed router rather than copying configuration names from another implementation.

## Frequently Asked Questions

### Is GraphQL introspection a vulnerability by itself?

Not always. GraphQL defines introspection as a standard capability, and some public APIs expose it intentionally. In a private API whose production policy prohibits anonymous schema discovery, successful introspection is a configuration or information-exposure finding. Severity depends on the revealed material and surrounding controls. The more important question is whether knowing the schema enables unauthorized reads, writes, or expensive operations. Test those controls directly rather than inferring them from schema visibility.

### Should production introspection always be disabled?

No universal rule fits every API. Public developer platforms may deliberately offer discoverable schemas, while private applications often restrict schema access to reduce reconnaissance. Choose a documented policy based on audience, tooling needs, network boundaries, and threat model. If it is restricted, prefer supported GraphQL validation or schema-visibility controls and preserve an approved operational path. In every design, keep field and object authorization effective as though the full schema were already known.

### Why did the introspection test pass during an outage?

A negative-only assertion may see no schema data when the endpoint is unreachable, returns HTML, or rejects every request. That is a false sense of security. Add a positive control that calls a harmless, documented GraphQL operation and verifies its expected response. Classify HTTP status, content type, JSON parsing, GraphQL errors, and data separately. A 502 response is a reliability failure, not evidence that introspection policy works.

### How often should introspection exposure be retested?

Run a small policy test on deployments that can change the gateway, GraphQL server, schema configuration, authentication middleware, or routing. Also schedule production-safe verification because environment drift may not appear in preproduction. Keep the probe low volume and non-destructive. Retest all authorized paths after framework upgrades or topology changes, and preserve response evidence. Pair the check with authorization regression tests, since a stable introspection policy says nothing about newly added resolver permissions.
`,
};
