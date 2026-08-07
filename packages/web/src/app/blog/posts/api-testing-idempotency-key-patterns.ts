import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Idempotency Key Patterns That Prevent Duplicate Writes',
  description: 'Apply API testing idempotency key patterns to prove safe retries, block duplicate writes, expose race conditions, and ship reliable payment-style APIs.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# API Testing Idempotency Key Patterns That Prevent Duplicate Writes

API testing idempotency key patterns should prove one business invariant: repeated delivery of one logical write produces no more than one committed effect. Send the same supported key and equivalent request more than once, then assert the response contract, persistent record count, downstream effect count, and behavior under concurrency. A repeated 200 or 201 is not enough evidence because an API can return a reassuring response while charging, publishing, or inserting twice.

The server needs a documented policy for key scope, payload equivalence, concurrent requests, stored outcomes, and retention. Tests turn each policy decision into an observable example. They should distinguish a valid replay from accidental reuse with a different payload and from a genuinely new operation using a new key.

This guide uses a fictional order API and runnable TypeScript-style tests to show how QA engineers can verify retries without relying on timing luck. The same approach applies to payments, bookings, webhook consumers, provisioning endpoints, job submission, and any write that clients may retry after a timeout.

## Define the idempotency contract before choosing assertions

An idempotency key is a client-generated identifier representing one logical operation. A client sends it with a request, often in an \`Idempotency-Key\` header when that is the API's documented convention. The server associates the key with the operation's outcome or processing state. If transport uncertainty causes a retry, the same key lets the server recognize that request as a replay instead of executing the side effect again.

There is no universal behavior that every API must implement. Some systems replay the original status and body. Some expose an operation resource. Some reject concurrent duplicates until the first finishes. Some retain keys for hours, others longer. Your test oracle must come from the product's contract, not from another vendor's implementation.

Write down at least these decisions:

| Contract dimension | Questions the specification must answer | Testable evidence |
|---|---|---|
| Key location | Which header or field carries the key? | Missing, malformed, and accepted examples |
| Scope | Is uniqueness per account, endpoint, operation type, or global? | Same key across defined scopes |
| Request identity | Which method, path, and body fields must match? | Same key with changed payload |
| In-flight behavior | Does a duplicate wait, replay, or conflict? | Synchronized concurrent requests |
| Outcome retention | Are successes and failures stored? | Retry after each documented result class |
| Expiry | How long can a key be replayed? | Boundary checks with controllable clock or store |
| Response | Is original status and body replayed? | Exact stable fields and documented metadata |

The contract should also say what “one effect” means. An order might involve one database row, one payment authorization, one inventory reservation, and one event. If the endpoint promises atomic creation but the test checks only the order row, duplicate inventory deductions can escape.

For endpoint plumbing, fixtures, and Supertest setup, the [complete Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) complements the patterns here. The idempotency tests themselves need access to observable state, either through supported read endpoints, a fake dependency, an event sink, or isolated test-database queries.

## Use a test oracle that observes business effects

Build the oracle in layers. The client-facing response is one layer. Durable state and downstream calls are separate layers. A strong test checks enough layers to tell whether the server replayed the prior outcome or executed the handler twice.

Consider a create-order endpoint with a unique client key. A first request should create the order, reserve stock once, and publish one \`order.created\` event. A replay should refer to the same order and leave all counts unchanged.

\`\`\`ts
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db';
import { eventSink } from './support/event-sink';

it('creates one order when an equivalent request is replayed', async () => {
  const key = 'test-order-replay-001';
  const payload = { sku: 'SKU-42', quantity: 2 };

  const first = await request(app)
    .post('/orders')
    .set('Idempotency-Key', key)
    .send(payload);

  const replay = await request(app)
    .post('/orders')
    .set('Idempotency-Key', key)
    .send(payload);

  expect(first.status).toBe(201);
  expect(replay.status).toBe(201);
  expect(replay.body.id).toBe(first.body.id);

  expect(await db.order.count({ where: { id: first.body.id } })).toBe(1);
  expect(await db.reservation.count({ where: { orderId: first.body.id } })).toBe(1);
  expect(eventSink.events('order.created', first.body.id)).toHaveLength(1);
});
\`\`\`

The database APIs above are illustrative repository adapters, not claimed methods of a specific ORM. Adapt them to the test seam your service exposes. The important part is independent evidence for each promised effect.

Avoid asserting that the entire response is byte-for-byte identical unless the contract promises it. A replay may legitimately carry a new request ID, server timing header, or replay indicator while retaining the same operation resource. Compare stable fields explicitly: business resource identifier, committed amount, currency, state, and relevant status.

A unique database constraint on the idempotency key is useful evidence, but it is not the whole oracle. The constraint may prevent a second operation record while an external call already happened twice. Conversely, two internal attempts may be acceptable if only one acquires ownership and only one reaches the protected effect. Assert at the boundary where irreversibility occurs: the payment provider fake, inventory ledger, outbound message sink, email delivery adapter, or provisioning system. Then confirm that the database record points to that same effect.

Name every counter by the current test key. A global assertion such as “the payment fake received one request” fails unpredictably when test workers share the fake. A query such as “authorization calls whose metadata contains this idempotency key” isolates the operation. If the external provider supports its own documented idempotency feature, verify that the service forwards a stable provider key across retries, but do not assume the client-facing key can be copied directly when tenant scoping or key-format rules differ.

Finally, distinguish execution from delivery. Publishing the same event twice is not repaired merely because a downstream consumer is also idempotent. If the producer contract promises one publication, test one publication. If the architecture promises at-least-once publication with consumer deduplication, test the deduplication record and one business effect instead. The assertion must reflect the actual delivery guarantee rather than the outcome you wish the messaging system provided.

## Test the three key relationships explicitly

Most suites test only “same key, same body.” That is the happy replay, not a complete matrix. You need three fundamental relationships:

| Key relationship | Request relationship | Expected semantic result |
|---|---|---|
| Same key | Equivalent request | Replay or return the one original operation |
| Same key | Materially different request | Reject key reuse according to the API contract |
| Different key | Same request body | Treat as a new logical operation unless domain rules forbid it |

The third row is essential. Idempotency must not accidentally become global body deduplication. A customer may intentionally buy the same item twice. If the API hashes only the payload and ignores the key, the second valid purchase could be collapsed incorrectly.

Test changed material fields with table-driven cases:

\`\`\`ts
describe.each([
  ['quantity', { sku: 'SKU-42', quantity: 3 }],
  ['sku', { sku: 'SKU-99', quantity: 2 }],
  ['shipping address', {
    sku: 'SKU-42',
    quantity: 2,
    shippingAddressId: 'address-2',
  }],
])('same key with changed %s', (_label, changedPayload) => {
  it('rejects reuse without creating another order', async () => {
    const key = 'test-conflict-001';

    const first = await createOrder(key, {
      sku: 'SKU-42',
      quantity: 2,
      shippingAddressId: 'address-1',
    });
    const conflict = await createOrder(key, changedPayload);

    expect(first.status).toBe(201);
    expect(conflict.status).toBe(422); // Use your documented status.
    expect(conflict.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await countOrdersForKey(key)).toBe(1);
  });
});
\`\`\`

The status and error code are product decisions. Some APIs use a conflict response. Do not copy the example number without checking your contract. The non-negotiable assertion is that the changed request does not create or modify a second effect under the first operation's key.

Also define equivalence. JSON member order should generally not make semantically identical bodies different, but an omitted default field versus an explicit default may depend on when canonicalization happens. Headers such as tracing IDs should not usually enter the request fingerprint. Tenant, authenticated principal, endpoint, and method often should.

## Prove concurrency safety with a coordinated race

Sequential replay testing cannot expose a check-then-insert race. Two requests can both observe that the key is absent and both execute before either saves the result. A useful concurrency test releases multiple requests together and deliberately keeps the original operation in flight long enough for duplicates to overlap.

Use a controllable fake for a costly downstream operation. The fake signals when the first call arrives and blocks until the test releases it. Then start the duplicate.

\`\`\`ts
it('commits one effect for concurrent requests with the same key', async () => {
  const key = 'test-race-001';
  const payload = { sku: 'SKU-42', quantity: 1 };

  paymentFake.holdNextAuthorization();

  const firstPromise = createOrder(key, payload);
  await paymentFake.waitUntilAuthorizationStarts();

  const duplicatePromise = createOrder(key, payload);
  paymentFake.releaseAuthorization();

  const [first, duplicate] = await Promise.all([
    firstPromise,
    duplicatePromise,
  ]);

  expect([first.status, duplicate.status]).toEqual(
    expect.arrayContaining([201]),
  );
  expect(await countOrdersForKey(key)).toBe(1);
  expect(paymentFake.authorizationCallsFor(key)).toHaveLength(1);
  expect(eventSink.eventsForKey(key)).toHaveLength(1);
});
\`\`\`

Do not overconstrain the second response if the contract permits multiple strategies. It might wait and replay the completed result, or it might return a documented in-progress response. Assert the allowed status and body for your implementation, then always assert one effect.

A barrier or held dependency is far better than firing two requests and hoping they overlap. Without coordination, the test may pass for months while never exercising the race window. “Run it 100 times” increases probability but does not create deterministic coverage.

For a distributed service, repeat the scenario through two application instances sharing the production-shaped idempotency store. An in-memory per-process lock can pass single-instance tests and fail under load balancing. Route requests deliberately to separate instances if the test environment provides a supported mechanism, or exercise the service behind its normal load balancer and collect instance identifiers from test-safe telemetry.

## Verify request fingerprints without overfitting serialization

Many implementations save a fingerprint beside the key so that changed payloads can be rejected. Testing this is about semantics, not guessing the exact hash algorithm. Design pairs of requests that should be equivalent and pairs that should be different.

| Variation | Usually equivalent? | Reason to decide explicitly |
|---|---:|---|
| JSON object member order | Yes | Object order should not alter business meaning |
| Insignificant whitespace | Yes | Parser removes representation differences |
| Omitted optional field vs explicit default | Product decision | Depends on normalization before fingerprinting |
| Changed quantity or amount | No | Changes committed business effect |
| Different authenticated account | No | Key scope must not cross principals accidentally |
| New trace or request ID | Yes | Transport metadata should not define the operation |
| Same body on another endpoint | Usually no | Operation type and path differ |

A raw body hash can behave unexpectedly if logically equivalent JSON serializations differ. A canonical business fingerprint can behave unexpectedly if it drops a newly added material field. Tests should live near contract changes so a new write-affecting field immediately gets a same-key conflict case.

\`\`\`ts
it('treats JSON member order as an equivalent replay', async () => {
  const key = 'test-canonical-json-001';

  const first = await request(app)
    .post('/orders')
    .set('Content-Type', 'application/json')
    .set('Idempotency-Key', key)
    .send('{"sku":"SKU-42","quantity":2}');

  const replay = await request(app)
    .post('/orders')
    .set('Content-Type', 'application/json')
    .set('Idempotency-Key', key)
    .send('{"quantity":2,"sku":"SKU-42"}');

  expect(first.status).toBe(201);
  expect(replay.status).toBe(201);
  expect(replay.body.id).toBe(first.body.id);
  expect(await countOrdersForKey(key)).toBe(1);
});
\`\`\`

Only keep this example if the API promises semantic JSON equivalence. If it defines identity from exact request bytes, document and test that instead. The goal is an explicit contract that clients can implement reliably.

## Decide which failures are remembered and test each class

What happens after a failed first request is one of the hardest idempotency design choices. A validation failure before processing might not reserve the key. A deterministic business rejection might be replayed. An internal failure before commit might permit retry. An ambiguous timeout after a downstream charge must not casually repeat the charge.

Create a failure taxonomy before writing expectations:

| First attempt outcome | Possible policy | Core safety assertion |
|---|---|---|
| Request validation rejected | Do not store, or store rejection | No business effect; policy is consistent on retry |
| Business rule rejected | Often replay stable rejection | No effect appears when request is repeated |
| Dependency rejected deterministically | Store or expose failed operation | No unapproved repeat of costly call |
| Server failed before any effect | Permit safe reprocessing | At most one eventual committed effect |
| Response lost after commit | Replay committed result | Retry does not create a second effect |
| Operation still running | Wait or return documented in-progress result | Duplicate does not start another operation |

The response-lost-after-commit case is the reason idempotency exists. Reproduce it at a controlled seam: let the service commit, then simulate transport loss or have the test client abandon the response. Retry with the same key and verify the original resource is returned. Do not simulate only a dependency failure before persistence because that exercises a different state.

\`\`\`ts
it('returns the committed order after the first response is lost', async () => {
  const key = 'test-lost-response-001';
  responseFaults.dropConnectionAfterCommitFor(key);

  await expect(
    createOrder(key, { sku: 'SKU-42', quantity: 1 }),
  ).rejects.toThrow();

  await responseFaults.waitForCommit(key);

  const retry = await createOrder(key, { sku: 'SKU-42', quantity: 1 });

  expect(retry.status).toBe(201);
  expect(await countOrdersForKey(key)).toBe(1);
  expect(paymentFake.authorizationCallsFor(key)).toHaveLength(1);
});
\`\`\`

The fault-injection helpers are test seams you would implement in the service or proxy. Never add a publicly reachable production switch that drops connections. Keep test controls authenticated, environment-restricted, or inside an in-process integration test.

## Test key scope across tenants, routes, and credentials

A key such as \`checkout-123\` is not globally unique forever. Scope determines the namespace within which it identifies an operation. If scope is per authenticated account, two customers may safely use the same key. If the store is accidentally keyed only by header value, customer B could receive customer A's response, creating a severe data isolation defect.

Build a scope matrix using two test principals:

\`\`\`ts
it('isolates the same key between customer accounts', async () => {
  const sharedKey = 'client-generated-001';

  const alice = await createOrderAs(
    users.alice,
    sharedKey,
    { sku: 'SKU-42', quantity: 1 },
  );
  const bob = await createOrderAs(
    users.bob,
    sharedKey,
    { sku: 'SKU-99', quantity: 1 },
  );

  expect(alice.status).toBe(201);
  expect(bob.status).toBe(201);
  expect(bob.body.id).not.toBe(alice.body.id);
  expect(await ownerOf(alice.body.id)).toBe(users.alice.id);
  expect(await ownerOf(bob.body.id)).toBe(users.bob.id);
});
\`\`\`

Also test endpoint scope. Reusing a key for \`POST /orders\` and \`POST /refunds\` should not cause one endpoint to replay the other's body. Whether the API rejects reuse or treats namespaces separately is a contract choice, but it must never leak a mismatched resource.

Authentication changes during retry need thought. If a token rotates but represents the same principal and tenant, replay may be valid. If credentials now identify a different principal, the request must not gain access to the original outcome. Test identity semantics rather than token string equality.

## Exercise retention and expiry without waiting in real time

Idempotency records cannot always live forever. A retention window balances client retry safety against storage growth and key reuse. Boundary tests should use an injectable clock or a controllable persistence record, not a suite that sleeps for hours.

Test just before expiry, at the documented boundary, and after expiry. Clarify whether a reused expired key represents a new operation or is rejected to prevent ambiguity. If it becomes a new operation, clients must understand that retry safety ends after the retention period.

\`\`\`ts
it('replays within retention and follows the expiry policy afterward', async () => {
  const key = 'test-expiry-001';
  clock.set('2026-08-07T10:00:00.000Z');

  const first = await createOrder(key, { sku: 'SKU-42', quantity: 1 });

  clock.advanceTo('2026-08-07T10:59:59.000Z');
  const withinWindow = await createOrder(key, { sku: 'SKU-42', quantity: 1 });
  expect(withinWindow.body.id).toBe(first.body.id);

  clock.advanceTo('2026-08-07T11:00:01.000Z');
  const afterWindow = await createOrder(key, { sku: 'SKU-42', quantity: 1 });
  expect(afterWindow.status).toBe(201); // Example policy: a new operation.
  expect(afterWindow.body.id).not.toBe(first.body.id);
});
\`\`\`

The one-hour window and new-operation policy are illustrative. Substitute the documented behavior. When a database TTL index or background cleanup is involved, unit tests around a fake clock are insufficient by themselves. Add an integration test that proves the actual store expires or ignores records according to its configured semantics, allowing for the datastore's documented cleanup behavior.

Retention tests also need a long-running operation scenario. If cleanup deletes an in-progress key, a duplicate could start the same work again. Active records should follow a policy that cannot expire underneath legitimate processing, or the worker should have another uniqueness guarantee.

## Inject store and dependency failures at meaningful transitions

Idempotency depends on ordering among reservation, business side effect, result persistence, and response. Fault tests at these transitions expose designs that work only on the happy path.

Test at least these interruptions:

1. The idempotency store is unavailable before a key is reserved.
2. The key is reserved, then the business dependency fails.
3. The business effect succeeds, then result persistence fails.
4. The result is saved, then the client connection disappears.
5. A worker dies while the key is marked in progress.

The third case is especially dangerous. If a payment succeeds but the idempotency record is missing, a retry may pay again. The architecture may need a transaction, an operation record as the source of truth, a provider-level idempotency key, or reconciliation. Testing cannot fix the design, but it can make the unsafe gap visible.

| Injection point | Expected client experience | Required invariant |
|---|---|---|
| Before reservation | Explicit unavailable response | No business call begins |
| After reservation, before effect | Retry or failed operation per policy | No hidden committed effect |
| After external effect | Recoverable operation state | External effect is not repeated |
| After result saved | Timeout may occur | Replay returns stored result |
| During in-progress recovery | Wait, conflict, or takeover per policy | Ownership prevents two workers committing |

Use counters and correlation by idempotency key in fake dependencies. General “called once” assertions become unreliable when tests run in parallel. Scope observations to the current test's unique key and clean them through isolated fixtures.

## Make client retry tests realistic but deterministic

Server tests prove the endpoint. Client tests should prove that retry logic reuses the same key for the same logical operation and creates a new key for a user-initiated new operation. A client that generates a new key on every transport attempt defeats server-side protection.

\`\`\`ts
it('reuses one key when a transport timeout triggers a retry', async () => {
  const seenKeys: string[] = [];
  transport.onPost('/orders', ({ headers, attempt }) => {
    seenKeys.push(headers['idempotency-key']);
    if (attempt === 1) throw new Error('simulated timeout');
    return { status: 201, body: { id: 'order-77' } };
  });

  const result = await ordersClient.create({ sku: 'SKU-42', quantity: 1 });

  expect(result.id).toBe('order-77');
  expect(seenKeys).toHaveLength(2);
  expect(seenKeys[1]).toBe(seenKeys[0]);
});
\`\`\`

Do not assert undocumented retry counts or backoff timing. Test the client's published policy. Ensure retries are limited to conditions the client considers retryable, and ensure canceling or starting a second action does not accidentally reuse the previous operation key.

What people get wrong is generating the key inside the low-level “send once” function. That location looks tidy, but every retry becomes a new operation. Generate the key at the logical command boundary, retain it through transport attempts, and discard it only when the operation is conclusively finished or abandoned according to product rules.

## Connect idempotency tests to contract and observability evidence

An idempotency header and its error responses are part of the API contract. Consumer and provider checks should verify whether the header is required, its allowed shape, and the responses for missing or reused keys. The [complete Pact contract testing guide](/blog/contract-testing-pact-complete-guide) explains how consumer expectations and provider verification fit together. Keep concurrency and side-effect assertions in integration tests because a contract example alone cannot prove atomicity.

Operational telemetry should let engineers answer: Was this a new request, a replay, a conflict, or an in-progress duplicate? Log a safe fingerprint or internal operation identifier according to policy, not sensitive request data. Metrics can count outcomes and latency, but avoid unbounded raw idempotency keys as metric labels because client-generated values create high cardinality.

During incident diagnosis, correlate the client attempt, API request, operation record, downstream call, and event publication. The idempotency key can assist correlation in protected logs, but access and retention should match its sensitivity. It must not be treated as authentication; possession of a key should never grant another principal access to an operation.

AI coding agents can generate useful matrix cases when supplied with the written contract. Review their output for invented status codes, assumed retention, and response equality assertions. The agent should point to the service's actual policy for each oracle and should never infer correctness from HTTP responses alone.

## Frequently Asked Questions

### Is an idempotency key the same as a request ID?

No. A request ID normally identifies one transport attempt for tracing, while an idempotency key identifies one logical operation across multiple attempts. A retry should usually receive a new request ID but reuse the original idempotency key. Keeping both makes diagnosis clearer: several request IDs can map to one operation. Do not use either value as authorization. The authenticated principal and normal access controls still determine whether a caller can create or retrieve the operation.

### Should failed API responses be cached under the key?

It depends on the documented failure class. A deterministic business rejection may be safely replayed, while a validation error before processing may leave the key unused. An ambiguous failure after a downstream effect requires durable recovery so retry cannot repeat the effect. Define the policy separately for validation, business rejection, dependency failure, internal error, and in-progress work. Tests should verify both the returned outcome and the absence or uniqueness of business side effects.

### How do I test idempotency races without flaky timing?

Place a controllable barrier in a fake dependency or test seam. Start the first request, wait until it reaches the held operation, start the duplicate with the same key, then release the first. This guarantees overlap instead of hoping two promises race. Run the test against multiple service instances when distributed locking matters. Assert the permitted pair of responses, but make the primary oracle one committed record and one invocation of every protected downstream effect.

### Can clients reuse a key after it expires?

Only if the API contract explicitly defines that behavior. Some systems treat an expired key as available for a new operation, while others reject reuse to reduce ambiguity. Test just inside and just outside the retention boundary with a controllable clock, and verify actual datastore cleanup separately. Clients must not assume retry protection lasts beyond the published window. Long-running in-progress operations also need protection from cleanup so expiration cannot allow a second worker to start the same effect.
`,
};
