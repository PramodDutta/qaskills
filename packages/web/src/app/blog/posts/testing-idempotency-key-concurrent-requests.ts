import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Idempotency Keys with Concurrent API Requests',
  description:
    'Test idempotency keys under concurrent API requests, proving one side effect, stable replay responses, payload conflict handling, and atomic persistence.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Idempotency Keys with Concurrent API Requests

Two payment requests carrying the same idempotency key arrive before either transaction commits. Sequential replay coverage says the endpoint is safe, but both workers observe no stored result and each charges the customer. The defect exists only in the overlap between the initial lookup and the durable write.

An effective idempotency test must create that overlap, release requests together, and inspect more than HTTP status. The durable business invariant is one side effect. Response equivalence, key ownership, request fingerprinting, failure recovery, and expiry are separate contracts that need their own evidence.

## Define the idempotency contract before loading the endpoint

“Duplicate requests return the same response” is incomplete. Decide the operation scope, key scope, retention period, and behavior when a key is reused with different input. A test cannot distinguish a defect from an undocumented choice.

| Contract decision | Example policy | Observable assertion |
| --- | --- | --- |
| Key namespace | Per authenticated merchant | Same key used by another merchant is independent |
| Protected method | \`POST /payments\` | Retries cannot create another payment |
| Request identity | Method, route, merchant, canonical body | Changed amount with same key returns conflict |
| Stored outcome | Status and response body from first committed attempt | Later replay returns the original payment ID |
| Concurrent duplicate | Wait, then replay winning result | All callers refer to one payment |
| Retention | 24 hours from creation, as a product policy | Key is reusable only after controlled expiry |
| Failed attempt | Depends on whether side effect might have happened | Retry policy is explicit for 4xx, 5xx, and timeouts |

Avoid assuming a universal header name or status code. \`Idempotency-Key\` is common, but APIs differ. Some return the original 201 for replays, others return 200, and some add a replay header. What must remain invariant is the documented meaning and absence of duplicate effects.

The [API testing best-practices guide](/blog/api-testing-best-practices-guide) provides wider endpoint coverage. This article isolates the race condition that ordinary request-response assertions miss.

## Send a real simultaneous burst

\`Promise.all()\` starts operations close together, but client scheduling alone does not guarantee the server overlaps at the vulnerable point. It is still a useful black-box baseline, particularly with enough requests and a test environment instrumented to widen the transaction window.

This Node test uses the built-in test runner and \`fetch\`. It releases 20 requests from a client-side barrier, verifies successful response semantics, then asks an administrative test endpoint for persisted records. Replace URLs and fields with the service's documented API.

\`\`\`typescript
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
const adminToken = process.env.TEST_ADMIN_TOKEN ?? 'local-test-token';

test('one payment is created for concurrent requests with one key', async () => {
  const key = randomUUID();
  const merchantReference = \`race-\${randomUUID()}\`;
  const body = JSON.stringify({
    amount: 2599,
    currency: 'USD',
    merchantReference,
  });

  let release!: () => void;
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });

  const attempts = Array.from({ length: 20 }, async () => {
    await gate;
    const response = await fetch(\`\${apiBaseUrl}/payments\`, {
      method: 'POST',
      headers: {
        authorization: \`Bearer \${adminToken}\`,
        'content-type': 'application/json',
        'idempotency-key': key,
      },
      body,
    });
    return {
      status: response.status,
      value: (await response.json()) as { id: string; status: string },
    };
  });

  release();
  const results = await Promise.all(attempts);

  assert.ok(results.every(result => [200, 201].includes(result.status)));
  assert.equal(new Set(results.map(result => result.value.id)).size, 1);

  const auditResponse = await fetch(
    \`\${apiBaseUrl}/test-admin/payments?merchantReference=\${merchantReference}\`,
    { headers: { authorization: \`Bearer \${adminToken}\` } },
  );
  assert.equal(auditResponse.status, 200);
  const persisted = (await auditResponse.json()) as Array<{ id: string }>;
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].id, results[0].value.id);
});
\`\`\`

The administrative endpoint is a testability seam, not a requirement for public production APIs. A database query, payment-processor fake, event-store projection, or ledger read can provide the same independent evidence. Do not infer one side effect merely because all responses reused one ID; buggy code could create two charges and return only the last record.

## Make server overlap deterministic

High request count increases probability, not certainty. A senior-level race test introduces a barrier at the critical server location in a nonproduction build or injectable repository. Pause workers after the idempotency lookup has found no record, wait until at least two arrive, then release them toward insertion.

This pattern can be implemented through a test-only dependency, a database advisory barrier, or a proxy that delays a specific internal call. Keep it inaccessible in production. The endpoint test remains black-box from the client, while the environment provides deterministic scheduling.

| Concurrency technique | Repeatability | Fidelity | Best use |
| --- | --- | --- | --- |
| Client \`Promise.all\` burst | Moderate | High | Portable smoke regression |
| Start gate in the client | Moderate | High | Removes sequential client startup |
| Server barrier after key lookup | High | High for the exact race | Transaction correctness regression |
| Database lock held by test | High | Medium | Exercising lock waits and timeouts |
| Load tool with arrival rate | Statistical | High | Saturation and hot-key behavior |
| Unit test with repository latch | High | Lower end-to-end fidelity | Fast algorithm feedback |

The deterministic test should assert that multiple workers actually reached the barrier. Otherwise it can pass without exercising the intended interleaving. Emit a test-only observation or metric with the number of waiters, then remove or restrict the hook outside test deployments.

## Inspect all three persistence layers

Idempotent creation commonly touches an idempotency table, a domain table, and an external side effect or outbox. Atomicity must cover the required combination.

Imagine these records:

| Store | Unique identity | Required postcondition |
| --- | --- | --- |
| \`idempotency_requests\` | Tenant plus idempotency key | One completed row with request fingerprint and response |
| \`payments\` | Payment ID, plus unique merchant reference where appropriate | Exactly one payment |
| \`outbox\` | Event ID or aggregate/version | One publishable \`PaymentCreated\` event |
| Processor stub | Provider charge ID | One captured charge invocation |

A unique constraint on the idempotency table prevents duplicate keys, but it does not automatically undo a charge made before the losing insert. The side effect must occur inside an appropriate transaction boundary or through a design such as an outbox and idempotent downstream consumer.

Use [database automation techniques](/blog/database-testing-automation-guide) to query these invariants without coupling every API test to internal columns. A small repository-level assertion helper can express “one completed key, one aggregate, one event” while keeping schema details centralized.

## Assert replay response stability separately

After the concurrent wave completes, send one ordinary retry with the same key and identical body. It should return the established outcome without creating new work. Compare stable fields, status according to the API contract, and relevant headers.

Do not require byte-for-byte equality blindly. Dynamic transport headers such as date, trace identifiers, or rate-limit counters may legitimately differ. Conversely, business fields such as resource ID, amount, currency, and terminal result should not drift.

\`\`\`typescript
async function createPayment(key: string, body: object) {
  const response = await fetch(\`\${apiBaseUrl}/payments\`, {
    method: 'POST',
    headers: {
      authorization: \`Bearer \${adminToken}\`,
      'content-type': 'application/json',
      'idempotency-key': key,
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    replayed: response.headers.get('idempotent-replayed'),
    body: (await response.json()) as {
      id: string;
      amount: number;
      currency: string;
    },
  };
}

test('replays the established payment result', async () => {
  const key = randomUUID();
  const request = { amount: 7000, currency: 'EUR' };

  const first = await createPayment(key, request);
  const second = await createPayment(key, request);

  assert.equal(first.status, 201);
  assert.ok([200, 201].includes(second.status));
  assert.deepEqual(second.body, first.body);
  assert.equal(second.replayed, 'true');
});
\`\`\`

The replay header in this example is an application-specific contract, not a standardized requirement. Omit that assertion if the service does not publish such a signal. Never invent a header in the implementation just because a generic test template expects one.

## Reusing a key with a different payload

The key must bind to request identity. Without a stored fingerprint, a retry using the same key but a different amount might receive the first payment, or worse, mutate it. Test changes one meaningful field while holding authentication, route, method, and key constant.

A well-defined API normally rejects the conflicting request with a client error such as 409 or 422. The precise status is contract-specific. Assert a machine-readable error code and verify that neither the original resource nor side-effect count changed.

Canonicalization deserves explicit cases. JSON object property order should usually not create a different request identity, while \`100\` and \`100.0\` may or may not be equivalent depending on parsing and schema. Ignored metadata, omitted defaults, and whitespace should follow documented semantics. Hash the canonical validated representation rather than raw bytes if semantic equivalence is promised.

Test tenant boundaries too. If keys are scoped per merchant, two merchants may use the same UUID independently. If the storage unique constraint covers only \`key\`, one tenant can incorrectly receive another tenant's replay, which is both a functional and data-isolation defect.

## Failures before and after the side effect

An error response does not reveal whether anything happened. Divide failure injection by commit point.

Before validation or authorization succeeds, the service should generally avoid reserving a key as a successful result. A corrected retry may be allowed, but only if that matches the contract. After a processor has accepted a charge but before the response is persisted, blindly retrying can duplicate the charge unless the downstream call also uses a stable idempotency identifier.

Test at least these interruption points:

| Injected interruption | Expected durable state | Retry expectation |
| --- | --- | --- |
| Validation rejects body | No payment or outbox record | Same key policy is documented |
| Failure before transaction begins | No domain state | Retry can attempt normally |
| Database failure before commit | Transaction rolled back | Retry creates once |
| Timeout after processor accepts | Reconciliation or stored in-progress state | Retry must not issue a second charge |
| Response connection drops after commit | One completed payment | Retry returns committed result |
| Worker dies while key is in progress | Recoverable lease or explicit stuck state | No indefinite wait |

Use a controllable fake for external billing in integration tests. Count calls and model “accepted then connection lost,” which is materially different from “request never reached processor.” A test that injects only clean 500 responses misses the uncertainty idempotency is meant to address.

## Avoid false concurrency confidence

Running 100 promises from one Node process may still hit a single server worker, a keep-alive connection limit, or a reverse proxy that serializes requests. Capture server request IDs, worker IDs in test diagnostics, and barrier arrival counts where possible. The proof is overlap at the critical section, not a large array in test code.

Isolation level also changes outcomes. A check-then-insert sequence under ordinary read committed transactions can race. A database uniqueness constraint gives a final arbiter, but the application must handle the loser by reading and replaying the winner rather than returning an unexplained 500. Serializable transactions can help, yet serialization failures still require bounded retry logic.

Hot-key tests should measure waiting behavior without inventing a performance threshold. Establish a service objective from product needs, then verify duplicates do not consume unbounded worker capacity. A lock held during a slow external call can protect correctness while creating a denial-of-service vector for repeated keys.

## Expiration tests need a controlled clock

Do not wait a day to test retention. Inject a clock into the idempotency service or set expiry records through a supported test seam. Prove behavior just before expiry, at the defined boundary, and after it.

Expiry introduces a business risk: reusing a key after retention can legitimately create a new side effect. Clients must retain keys for at least as long as they may retry, and server policy must be communicated. Cleanup jobs should not remove an in-progress key merely because its creation timestamp is old without considering leases and worker ownership.

Keep expiry tests distinct from concurrent creation. Combining fake time, 20 requests, and processor failure makes diagnosis needlessly difficult. One race per test produces better evidence.

## A review rubric for an idempotency test suite

Look for independent side-effect inspection, not only response matching. Confirm a deterministic overlap test exists alongside a portable black-box burst. Check payload conflicts, tenant scoping, dropped responses, processor uncertainty, and stale in-progress recovery.

Reject tests that share a constant key across cases. Parallel execution will turn the suite itself into an accidental conflict generator. Generate one key per scenario and log it on failure so records can be traced.

Finally, make test cleanup target exact IDs. Deleting by idempotency key alone can collide across tenants. If a failed test leaves evidence useful for diagnosis, the environment still needs a bounded retention policy so tomorrow's run does not inherit today's state.

Include observability assertions where the service exposes supported metrics. One original execution and nineteen replays should not appear as twenty successful creations in business telemetry. At the same time, request-rate metrics should retain all twenty attempts so operators can see retry storms. Trace relationships are useful when a waiting duplicate joins the winner's result, but do not require a particular tracing implementation in the functional contract. The testing objective is consistent accounting: client attempts remain visible, domain creation is counted once, and external billing records agree with the ledger. Divergent dashboards often reveal that correctness exists in the database while operational signals still exaggerate revenue or failure rates.

## Exercise cancellation and waiter limits

Concurrent duplicates may wait for the winning request. Cancel one waiting client with an \`AbortController\` and prove that client cancellation does not cancel the shared operation or release the key for a second execution. The winner and other waiters should still receive the established result. Inspect the external side effect after every client promise settles, including rejected transport promises.

Set a documented maximum wait or in-progress response policy. A request should not hold a server worker forever when the winner crashes. Test the exact transition from in-progress to recoverable: advance an injected clock past the lease, start a new request, and verify ownership is acquired once. Two contenders attempting stale-key recovery create another race that deserves the same deterministic barrier as initial creation.

Apply resource limits to hot keys. Thousands of duplicates should not allocate thousands of unbounded response buffers or database polling loops. A load scenario can verify stable side-effect count while monitoring queue depth and response behavior, but keep its performance thresholds environment-specific. Functional tests should still assert that overload responses, if the API uses them, do not erase the stored winner. Cancellation, stale recovery, and overload are where a correct happy-path idempotency table can become operationally unsafe.

## Frequently Asked Questions

### Is Promise.all enough to test an idempotency race?

It is a valuable black-box burst, but it does not prove requests overlapped inside the critical section. Pair it with a deterministic server or repository barrier that confirms at least two workers passed the initial lookup before release.

### Must every duplicate response have the same HTTP status?

Only if the API contract promises it. Some services replay the original 201, while others return 200 for later callers. Stable business outcome and one side effect are essential; status and replay headers should follow the documented API.

### What should happen when the same key carries a different amount?

The service should not silently execute or reinterpret the request. A common policy is a 409 or 422 conflict tied to a stored request fingerprint. Assert the documented error and prove the original payment remains unchanged.

### How do I test a response that drops after the database commit?

Inject a transport failure after committing but before the client receives the body, then retry with the same key. The retry must return or reconstruct the committed outcome, and independent storage checks must still find one aggregate and one side effect.

### Can a unique database constraint alone guarantee idempotency?

It guarantees uniqueness only for the constrained row. It cannot undo an external charge performed before a losing insert, nor ensure the loser returns the winner's response. Transaction design and downstream idempotency remain necessary.
`,
};
