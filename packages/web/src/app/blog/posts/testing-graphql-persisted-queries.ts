import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing GraphQL Persisted Queries',
  description:
    'Test GraphQL persisted queries across hash misses, registration, cache hits, tampering, rollout compatibility, and CDN-safe request behavior.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing GraphQL Persisted Queries

The first request contains a SHA-256 hash but no GraphQL document. The server answers \`PersistedQueryNotFound\`. The client retries with the same hash plus the full document, the server stores the mapping, and later requests send only the hash. A persisted-query test must validate that conversation, not merely prove that one GraphQL operation returns data.

Persisted queries introduce a protocol layered over GraphQL. Correctness now depends on canonical document hashing, registration policy, cache topology, client retry behavior, version support, and the way errors travel through HTTP. A resolver test cannot expose a cache poisoned with the wrong document or a client that loops forever on an unknown hash.

## Automatic persistence and prebuilt allowlists are different systems

Automatic persisted queries, commonly called APQ, let clients propose a hash at runtime. On a miss, an APQ client retries with the document so the server can register it. A persisted document list is usually assembled at build or deployment time. Production accepts known operation identifiers and may reject arbitrary documents entirely.

Both reduce repeated payload size, but their security and rollout properties differ.

| Property | Automatic persisted queries | Pre-registered document list |
|---|---|---|
| How a mapping appears | Client registers on a cache miss | CI or deployment publishes an artifact |
| First unknown operation | Often returns a not-found protocol error, then accepts hash plus query | Rejected until list contains the operation |
| Arbitrary query execution | Usually still possible during registration | Can be disabled by allowlist policy |
| Coordination burden | Low, clients populate cache while running | Client and graph releases need artifact coordination |
| Cold-cache behavior | Extra request for each unknown operation | No registration retry if registry is ready |
| Primary test risk | Hash negotiation and cache consistency | Manifest versioning and rollout compatibility |

Do not label APQ an allowlist unless the server is actually configured to reject unregistered documents. Hashing a query does not make it trusted. Anyone who knows or computes the query and hash can participate in a runtime registration flow unless another control prevents it.

## Reproduce the APQ handshake over HTTP

An APQ request uses the GraphQL \`extensions\` object. Version 1 and a \`sha256Hash\` identify the persisted document. The first request can omit \`query\`. A conforming client interprets the not-found result, retries with \`query\`, then uses the hash-only shape after registration.

The following Vitest test uses standard \`fetch\` and Node's crypto API. It is runnable against a service whose base URL is supplied in \`GRAPHQL_URL\` and which implements the common APQ negotiation:

\`\`\`typescript
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';

const endpoint = process.env.GRAPHQL_URL ?? 'http://localhost:4000/graphql';
const query = 'query ProductName($id: ID!) { product(id: $id) { id name } }';
const hash = createHash('sha256').update(query).digest('hex');
const extensions = { persistedQuery: { version: 1, sha256Hash: hash } };

async function post(body: object) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, json: (await response.json()) as Record<string, unknown> };
}

describe('APQ negotiation', () => {
  test('registers an unknown operation and serves a hash-only retry', async () => {
    const variables = { id: 'sku-17' };
    const miss = await post({ operationName: 'ProductName', variables, extensions });
    expect(JSON.stringify(miss.json)).toContain('PersistedQueryNotFound');

    const registration = await post({
      operationName: 'ProductName',
      variables,
      extensions,
      query,
    });
    expect(registration.json).toMatchObject({
      data: { product: { id: 'sku-17' } },
    });

    const hit = await post({ operationName: 'ProductName', variables, extensions });
    expect(hit.json).toEqual(registration.json);
  });
});
\`\`\`

Run this against an isolated cache namespace. If another test or previous run already registered the hash, the first request will be a hit and the cold-cache assertion becomes invalid. Unique documents can create isolation, but dynamically adding irrelevant text changes the hash and may conceal canonicalization issues. Prefer a disposable cache, a unique test tenant, or an administrative reset supported by the system.

GraphQL protocol errors frequently arrive with HTTP 200 and an \`errors\` array. Assert the contract your server and client implement, including any error code in \`extensions\`, rather than assuming a 4xx status. Transport status and GraphQL execution status are related but distinct.

## Hash integrity is the critical negative path

A server must not associate a supplied hash with a different document. Otherwise a collision in application logic, malicious registration, or cache key bug can make a known identifier execute unintended content. SHA-256 cryptographic collision resistance is not the likely failure; failure to recompute and compare the submitted document's digest is.

Create a correct hash for operation A, then send operation B with that hash during registration. The server should reject the pair and must not store it. Follow rejection with a hash-only request and confirm that operation B was not made available under A's identifier.

\`\`\`typescript
import { createHash } from 'node:crypto';
import { expect, test } from 'vitest';

const endpoint = process.env.GRAPHQL_URL ?? 'http://localhost:4000/graphql';

test('rejects a document whose bytes do not match sha256Hash', async () => {
  const approved = 'query ViewerId { viewer { id } }';
  const substituted = 'query AdminUsers { users { id email } }';
  const sha256Hash = createHash('sha256').update(approved).digest('hex');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      operationName: 'AdminUsers',
      query: substituted,
      extensions: { persistedQuery: { version: 1, sha256Hash } },
    }),
  });
  const body = (await response.json()) as { errors?: Array<{ message: string }> };

  expect(body.errors?.length).toBeGreaterThan(0);

  const lookup = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      operationName: 'ViewerId',
      extensions: { persistedQuery: { version: 1, sha256Hash } },
    }),
  });
  expect(JSON.stringify(await lookup.json())).toContain('PersistedQueryNotFound');
});
\`\`\`

The exact mismatch message varies by implementation, so the example avoids inventing a universal error code. In a real product, assert your documented error code and ensure logs do not expose full sensitive documents unnecessarily.

## Canonical bytes, generated documents, and hash drift

SHA-256 operates on bytes. Whitespace, comments, field order, alias spelling, fragment expansion, and line endings can change those bytes even when two operations are semantically equivalent. Client and manifest builder must hash the same representation.

Generated GraphQL clients often print or transform a parsed document before hashing. Some build pipelines strip whitespace or typename fields; others preserve source. Tests should use the same artifact and hashing function as production, not a handwritten approximation. A unit test can pin a known operation to an expected digest, catching accidental printer upgrades or build-plugin reconfiguration.

| Source of drift | Symptom | Preventive check |
|---|---|---|
| Formatter changes GraphQL source | Every operation misses after release | Hash generated artifacts, not editor-formatted sources |
| Client and registry use different printers | Manifest IDs never resolve | Cross-test one build output against deployed registry |
| CRLF versus LF in raw documents | Hashes vary by build machine | Normalize in one shared generation step |
| Build adds \`__typename\` | Client hash absent from old manifest | Version generated client and manifest together |
| Fragment order changes | Equivalent operation gets a new ID | Treat the new ID as a release artifact change |
| Operation renamed only | New hash despite same selected fields | Include it in compatibility and cache-warming tests |

Do not normalize on the server before validating unless the protocol explicitly defines that representation. If the client claims a digest of raw submitted bytes and the server hashes a transformed document, integrity guarantees become ambiguous.

## Cache behavior needs more than a happy hit

The persisted-query store may be in-process memory, Redis, a gateway cache, or a graph router. Topology determines which failures matter. An in-memory cache disappears on every restart and can differ across replicas. A shared store persists longer but introduces namespace, eviction, and serialization concerns.

Exercise these states deliberately:

- cold store, where a hash-only request misses;
- warm store, where the same hash succeeds without a document;
- server restart, to prove expected persistence or repopulation;
- eviction, to prove the client retries registration rather than failing permanently;
- concurrent registration of one hash, to expose non-atomic writes;
- multiple tenants or graphs, to ensure identical keys cannot cross boundaries;
- replica routing, where registration on one node must be visible as designed.

For concurrency, send several hash-plus-document registrations and several hash-only lookups around the same time. Define acceptable behavior before asserting. Hash-only requests that arrive before registration commits may legitimately miss, but no request may retrieve the wrong document or corrupt the mapping. Follow the burst with a stable lookup and resolver-side evidence of the expected operation.

Cache TTL is a production policy, not a reason to wait through real hours in a test. Use a configurable short TTL in an integration environment or a controllable cache implementation. Verify client recovery after expiry. Do not assert implementation-specific Redis key names unless they are an operational contract.

## GET requests and CDN caching can leak variable data

Persisted queries are often sent with HTTP GET to make query operations cacheable at a CDN. The hash reduces URL length, but variables, operation name, and relevant headers still affect the response. An unsafe cache key can serve one user's result to another.

Test two requests with the same persisted operation and different variables. Confirm each receives the correct entity. Then vary authentication or tenant identity for a user-specific operation and ensure the cache policy either bypasses shared caching or varies correctly. Inspect response cache headers as part of the gateway contract.

Never use GET for GraphQL mutations. If a client transport automatically selects GET for persisted operations, prove that it limits the choice to query operations. A persisted identifier does not change GraphQL operation semantics.

A useful CDN test records origin request count to confirm a public response is cached, but correctness comes first. Test variables with encoded characters, arrays, nulls, and reordered JSON object keys if the gateway constructs cache keys from serialized parameters. Equivalent inputs should follow the policy your client documents, while distinct inputs must not alias.

For baseline request and response coverage outside persistence, the [complete GraphQL testing guide](/blog/graphql-testing-complete-guide) provides resolver, authorization, and error-path foundations. Persisted-query tests should build on those, not replace them.

## Deployment compatibility is a two-version problem

During rolling releases, old clients, new clients, old servers, new servers, and different manifest versions coexist. Testing only the latest bundle against the latest graph misses the dangerous window.

For an allowlisted document system, publish manifests in an order that keeps the next client compatible before it reaches users. Retain previous operation IDs until old clients age out. A contract test can load both current and previous manifests and call representative critical operations against the candidate server.

For APQ, server deployments that flush memory caches cause a wave of registration retries. Validate capacity and behavior during a controlled restart. The client must retry once with the document on a recognized not-found result, not on every GraphQL error. It must not retry mutations blindly if transport ambiguity could duplicate effects.

Version handling also belongs in negative tests. Send an unsupported persisted-query version and assert a documented failure. Omit the hash, send a non-hex value, use a truncated digest, and supply malformed \`extensions\`. These are parser boundary tests, not resolver tests.

## Security assertions beyond the hash

Persisted operations do not bypass authorization. A known hash invoked without permission must fail exactly as the full document would. Test object-level and field-level controls through the persisted path. Cache entries should store documents, not authorization results that can be reused across identities.

Complexity limits and depth controls also need clarity. A pre-approved allowlist may allow trusted operations to skip runtime parsing, but variables can still make work expensive through pagination sizes or filters. Assert variable validation and resource limits on the persisted form.

Introspection policy is separate. Blocking arbitrary documents can reduce attack surface, but an allowlist containing an introspection operation would still permit it. Test policy outcomes directly instead of inferring them from persistence.

The [GraphQL contract testing guide](/blog/graphql-contract-testing-guide) is a useful companion for schema compatibility. A manifest can contain a valid hash that points to an operation no longer valid against the deployed schema. Validate documents against the candidate schema before publication and exercise critical operations after deployment.

## Observability that makes misses actionable

Track persisted-query hits, misses, registrations, mismatches, and unsupported versions separately. Do not record raw documents or sensitive variables by default. Operation name, safe manifest version, client version, and a truncated identifier for correlation are usually more useful.

A sudden miss-rate increase may indicate cache loss, a client build with new hashes, or mismatch between manifest and application deployment. Mismatch rejection is a stronger security signal than an ordinary cold miss. Alerting should distinguish them.

Test observability by checking structured events or counters in an integration environment. Avoid brittle assertions on complete log strings. Verify that secrets in variables are redacted and that a rejected registration does not emit the entire document if logging policy forbids it.

## A focused persisted-query release suite

A senior SDET can keep the suite compact by organizing around protocol state, not every resolver. Select a few operations that cover variables, fragments, authorization, public caching, and a mutation. Run the full GraphQL behavior suite elsewhere.

The release gate should prove known manifest resolution, unknown identifier rejection, digest mismatch rejection, unsupported version behavior, authorization parity, and cross-version compatibility. A scheduled resilience suite can cover restart, eviction, concurrency, and replica propagation because those scenarios need infrastructure control.

Do not mock the persisted-query cache in the only integration test. A Map-based unit test verifies branching logic but cannot reveal serialization, TTL, namespace, or replica problems. Conversely, do not require a full CDN for every pull request. Layer fast protocol tests with fewer deployed-path checks.

## Batch requests need per-operation persistence results

If the endpoint supports GraphQL batching, test a mixture of known and unknown persisted identifiers in one HTTP payload. The server must associate each result with the correct array position and must not let one miss suppress unrelated hits unless that is the documented batch contract. Registration retries can be awkward because the client may need to resend only missing operations or rebuild the batch with documents.

Include duplicate hashes with different variables. The document mapping should be shared, while execution results remain variable-specific and authorization-specific. A cache that stores a GraphQL response where it should store only a document can return catastrophically wrong data. Observe resolver inputs or unique entity results to distinguish document persistence from response caching.

## Client retry logic should have a hard stop

Stub the endpoint in a client integration test so it returns the recognized not-found result twice. The client should send the full document on the registration attempt and then stop according to documented error handling, not alternate forever between hash-only and full-query payloads. Count requests and inspect both bodies.

Also return an ordinary resolver error, an authentication error, malformed JSON, and a transport timeout. None should be mistaken for a persistence miss. Retry only the protocol signal the client supports. For mutations, establish idempotency before any transport retry because a missing response does not prove the operation failed to execute.

## Frequently Asked Questions

### Should an unknown persisted-query hash return HTTP 200 or 400?

Implementations differ because GraphQL errors are often returned in a successful HTTP response. Test the documented server-client contract, especially the error payload the client recognizes. Consistency matters more than assuming one universal status.

### How can a cold-cache APQ test stay isolated in parallel CI?

Give each test a disposable cache namespace or dedicated service instance, then clear it through supported infrastructure controls. Randomizing the document can isolate hashes but should not replace tests of real generated artifacts and canonical hashing.

### Does APQ prevent clients from sending arbitrary queries?

Not inherently. A runtime registration flow can accept a new document after a miss. Use a pre-registered allowlist or explicit server policy when arbitrary query prevention is the goal, and test rejection of both unknown IDs and full unapproved documents.

### What should happen when the persisted-query cache evicts an entry?

An APQ client should recognize the not-found result and retry with the matching full document according to its protocol. A strict allowlist service should restore from its registry or reject until deployment is corrected, not silently accept arbitrary registration.

### Must the server hash a normalized GraphQL document?

It must hash the same byte representation defined by the client and persistence protocol. Many APQ clients hash the query string they send. Share generation artifacts and pin digest tests rather than independently guessing a normalization algorithm.
`,
};
