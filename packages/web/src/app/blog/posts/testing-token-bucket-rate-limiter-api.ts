import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing a Token-Bucket API Rate Limiter",
  description:
    "Test a token-bucket API rate limiter with deterministic clocks, burst and refill assertions, concurrent requests, retry headers, and distributed-state checks.",
  date: "2026-07-13",
  category: "API Testing",
  content: `
# Testing a Token-Bucket API Rate Limiter

Send six requests into a bucket with capacity five and the sixth should be rejected. Wait half a refill interval and one token may or may not exist, depending on whether the implementation refills continuously, at fixed ticks, or only when a request arrives. That difference is why a handful of rapid HTTP calls is not a sufficient rate-limiter test.

A token bucket has state, time, and contention. Tests must control all three. The strongest suite verifies the mathematical model below the HTTP layer, the response contract at the API boundary, and atomic behavior when many requests reach multiple workers together.

## Write down the bucket contract first

A conventional bucket has capacity \`C\`, current tokens \`T\`, refill rate \`r\` tokens per second, and a cost \`k\` for an operation. At elapsed time Δt, a continuous implementation commonly computes \`min(C, T + r * Δt)\`, then admits the request only if at least \`k\` tokens remain. Real systems introduce rounding, discrete ticks, storage TTLs, and per-route costs.

| Contract decision | Example | Test consequence |
|---|---|---|
| Capacity | 5 tokens | Exactly five cost-one requests can arrive at once |
| Refill | 2 tokens per second | Half a second may restore one token under continuous refill |
| Identity key | API key plus tenant | Different keys must not consume each other's quota |
| Request cost | Export costs 3, read costs 1 | Mixed operations need weighted assertions |
| Rejection | HTTP 429 | Body and headers need a stable client contract |
| Idle behavior | Clamp at capacity | Long idle time must not accumulate an unlimited burst |

Document whether rejected requests consume tokens. Most token buckets do not, but middleware can accidentally decrement before checking. Specify whether failed application responses still consume capacity. Usually admission happens before the handler, so a downstream 500 has already spent the token.

## Unit-test the arithmetic with an injected clock

Real sleeps make boundary tests slow and flaky. Pass a clock function to the limiter and advance it exactly. This runnable TypeScript example uses Node's test runner and a small bucket whose state is evaluated lazily on \`take\`.

\`\`\`typescript
import assert from 'node:assert/strict';
import test from 'node:test';

class TokenBucket {
  private tokens: number;
  private updatedAt: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerMs: number,
    private readonly now: () => number,
  ) {
    this.tokens = capacity;
    this.updatedAt = now();
  }

  take(cost = 1): boolean {
    const current = this.now();
    const elapsed = Math.max(0, current - this.updatedAt);
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
    this.updatedAt = current;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }
}

test('allows the burst, rejects overflow, then refills continuously', () => {
  let now = 0;
  const bucket = new TokenBucket(3, 1 / 1_000, () => now);

  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), false);

  now += 999;
  assert.equal(bucket.take(), false);
  now += 1;
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), false);
});
\`\`\`

Add tests for zero elapsed time, elapsed time beyond full capacity, weighted costs, a cost greater than capacity, and a clock that moves backward. The example clamps negative elapsed time to zero. Production code might reject non-monotonic time instead. Decide rather than allow a negative refill to drain the bucket.

Floating-point state deserves boundary coverage. If a rate cannot be represented exactly, comparing \`tokens < cost\` near the boundary can expose tiny errors. Integer microtokens or elapsed-nanosecond arithmetic can make semantics explicit. Tests should use the representation the implementation promises, not rely on generous sleeps.

## Verify the HTTP rejection contract

The algorithm can be correct while middleware emits an unusable response. A rejected API request should normally return 429. Your contract may include \`Retry-After\` and rate-limit fields. Header standards and provider conventions vary, so assert only the names and units your service documents.

\`\`\`typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app';

describe('GET /v1/reports rate limit', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns 429 until one token refills', async () => {
    vi.setSystemTime(new Date('2026-07-13T10:00:00Z'));
    const app = buildApp({ bucketCapacity: 2, refillPerSecond: 1 });

    const first = await app.inject({ method: 'GET', url: '/v1/reports' });
    const second = await app.inject({ method: 'GET', url: '/v1/reports' });
    const blocked = await app.inject({ method: 'GET', url: '/v1/reports' });

    expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
    expect(blocked.statusCode).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThanOrEqual(1);

    await vi.advanceTimersByTimeAsync(1_000);
    const admitted = await app.inject({ method: 'GET', url: '/v1/reports' });
    expect(admitted.statusCode).toBe(200);

    await app.close();
  });
});
\`\`\`

Fastify's \`inject\` sends requests without opening a socket, which keeps this an integration test of hooks and routing rather than a network performance test. Fake timers work only if the limiter reads the patched clock. A Redis server uses its own time, so this technique cannot control it.

## Exercise bursts at exact boundaries

Boundary tables are more informative than one happy path. For capacity ten and cost one, test zero through eleven simultaneous admissions. For a cost-three endpoint, test remaining balances of two and three. After a full idle period, prove the bucket stops at ten rather than banking extra tokens.

| Initial state | Action | Expected state |
|---|---|---|
| 10 tokens | 10 cost-one requests | All admitted, 0 remain |
| 0 tokens | One immediate request | Rejected, 0 remain |
| 0 tokens, 250 ms at 4/s | One request | Admitted under continuous refill |
| 9 tokens, long idle | Two immediate requests | First admitted, second rejected after capacity clamp |
| 2 tokens | One cost-three operation | Rejected without consuming balance |
| 5 tokens | Two concurrent cost-three operations | Exactly one admitted |

The last row cannot be proven by sequential calls. It is an atomicity requirement.

## Attack the check-then-decrement race

A naive distributed implementation reads a Redis balance, decides it is sufficient, then writes the decremented value. Two workers can read the same token and both admit. The storage mutation must be atomic, commonly through a Redis Lua script or a transaction designed for the access pattern.

Use a barrier so concurrent callers begin together, then count outcomes. Do not assert which request wins.

\`\`\`typescript
import { expect, test } from 'vitest';

test('admits only capacity requests under contention', async () => {
  const capacity = 20;
  const apiKey = \`concurrency-\${crypto.randomUUID()}\`;

  const responses = await Promise.all(
    Array.from({ length: 80 }, () =>
      fetch('http://127.0.0.1:3000/v1/data', {
        headers: { authorization: \`Bearer \${apiKey}\` },
      }),
    ),
  );

  const admitted = responses.filter((response) => response.status === 200);
  const rejected = responses.filter((response) => response.status === 429);

  expect(admitted).toHaveLength(capacity);
  expect(rejected).toHaveLength(80 - capacity);
});
\`\`\`

This test needs an empty unique key, a disabled or negligible refill during the burst, and enough actual concurrency. A localhost client may serialize connections. Inspect server-side admission metrics or use a load generator for higher confidence. Repeat the scenario to increase race exposure, but never excuse occasional over-admission as test flakiness.

## Separate identity partitions

Run two keys concurrently and prove each receives its own burst. Repeat with routes if the service has endpoint-specific buckets. Test the normalization rules: case sensitivity, missing credentials, forwarded IP parsing, IPv6 forms, and tenant-plus-user composition.

Identity mistakes are security and fairness defects. Trusting the leftmost \`X-Forwarded-For\` value without a trusted-proxy configuration lets clients select their own bucket. API tests should exercise requests through the same proxy path used in production, not merely call middleware directly.

Also test key cardinality controls. An unauthenticated attacker who can generate unlimited bucket keys may exhaust Redis memory even though no individual key exceeds its rate. Expiration should remove idle state. This is difficult to prove with a short unit test, so use storage inspection in a dedicated integration scenario.

## Distributed time and storage failures

An in-memory limiter has one clock per process and one bucket per worker. That may be acceptable for approximate local protection, but its global capacity scales with replica count. A test against one process cannot validate a cluster-wide claim.

Redis-backed designs should test atomic scripts against real Redis, ideally in a container. Mocking \`GET\` and \`SET\` cannot reproduce contention. Verify TTL refresh behavior, script return types, and recovery after connection loss. Decide whether storage failure fails open or closed. Availability-focused public APIs sometimes fail open; expensive or abuse-sensitive operations may fail closed. Assert the chosen policy and observability signal.

Clock ownership matters. If each application worker supplies timestamps to Redis, skew can create excess or missing tokens. A Lua script can use Redis time, trading test controllability for a common clock. Integration tests can validate invariants without asserting exact milliseconds.

## Avoid misleading load tests

Throughput alone does not prove token-bucket correctness. A load test should shape arrivals: one instantaneous burst, a sustained rate just below refill, a sustained rate just above refill, and a quiet interval followed by another burst. Record admitted and rejected counts over time.

At exactly the refill rate, scheduler jitter and network delay make individual outcomes nondeterministic. Assert a bounded aggregate based on elapsed time and initial capacity, allowing only a documented tolerance. The theoretical maximum admissions over duration \`d\` is approximately \`capacity + rate * d\`, subject to boundary rounding. Mark the measurement interval precisely.

The [API testing practices guide](/blog/api-testing-best-practices-guide) helps place these assertions in the wider contract suite. For arrival shaping and CI budgets, use the [load testing CI guide](/blog/load-testing-ci-cd-integration-guide).

## Test observability without coupling to implementation

Metrics should distinguish admitted from rejected requests, expose policy identity at low cardinality, and avoid raw API keys. Logs need the decision, route, cost, and a hashed or internal principal identifier. Traces can annotate the rejection before the application handler.

Do not assert a private Redis key format in ordinary API tests. That makes refactoring costly. Storage integration tests may inspect keys to verify TTL and atomic state, while external tests should stay with HTTP behavior and documented telemetry.

## Weighted requests and partial availability

Weighted tokens let an expensive export consume more capacity than a metadata read. Test cost lookup independently from bucket arithmetic. An unknown route must not accidentally default to zero cost. A request whose cost exceeds capacity should fail permanently or use a separate policy; returning a short retry delay would tell the client to wait for an impossible balance.

For batch APIs, decide whether cost is based on requested items, accepted items, bytes, or estimated compute. If the server discovers cost only after reading a body, enforce a maximum body size before expensive parsing. Test malformed bodies to ensure they cannot bypass charging.

\`\`\`typescript
it('charges exports by requested document count', async () => {
  const key = \`weighted-\${crypto.randomUUID()}\`;
  const request = (count: number) =>
    fetch('http://127.0.0.1:3000/v1/exports', {
      method: 'POST',
      headers: { authorization: \`Bearer \${key}\`, 'content-type': 'application/json' },
      body: JSON.stringify({ documentIds: Array.from({ length: count }, (_, i) => String(i)) }),
    });

  expect((await request(3)).status).toBe(202);
  expect((await request(2)).status).toBe(202);
  expect((await request(1)).status).toBe(429);
});
\`\`\`

This assumes capacity five and one token per document. State those test-server settings next to the test so a configuration change cannot silently alter the premise.

## Cancellation should not refund blindly

Once admission is granted, the handler may be canceled because the client disconnects. Automatically refunding the token can be abused if substantial work already began. Never refund a rejected request, and refund an admitted request only under a documented reservation model.

A reservation model holds tokens, commits when work starts, and releases on safe pre-execution failure. That is more complex than a simple token bucket. Tests need crash points around reserve, commit, and release plus expiry for abandoned reservations. If the product does not need such accuracy, charge at admission and accept that canceled calls consume capacity.

Downstream 4xx and 5xx outcomes follow the same principle. A validation failure discovered before meaningful work might use a separate cheap limit. A provider timeout after ten seconds has consumed resources and should normally retain the charge.

## Response headers under concurrency

If the API exposes remaining tokens, the value is a snapshot. Under concurrent requests, two clients cannot safely treat it as a reservation. Test basic bounds and consistency, not a strict descending sequence ordered by client completion. A response that finishes later may have been admitted earlier.

For each admitted response, remaining should stay between zero and capacity. For rejection, the reset or retry value should be non-negative and should not claim availability earlier than the limiter's calculation. If values are rounded, document whether rounding is ceiling or floor.

Cache layers must not store one principal's 429 and serve it to another. Send requests with two authorization keys through the real gateway and inspect \`Cache-Control\` and \`Vary\` behavior. A CDN that caches a rejection without identity-aware keys can turn a per-user limiter into a global outage.

## Multi-policy compositions

Production APIs often apply a per-user bucket and a broader tenant bucket. The request is admitted only if both allow it. A naive implementation can decrement the user bucket, discover the tenant bucket is empty, and leak the user token.

Test the composition atomically or specify the accepted leakage. Create two users in one tenant, exhaust the tenant limit through the first, and prove the second is blocked while a user in another tenant remains admitted. Then refill only the tenant horizon and verify per-user balances have not been corrupted.

Global emergency limits add another layer. Observability should identify which policy rejected without exposing internal defense thresholds to untrusted clients. API tests can assert a stable public code while internal integration tests inspect the policy decision.

## Property-based invariants for the bucket core

Example cases cover known boundaries; property-based generation explores long action sequences. Generate non-negative elapsed durations and costs, then assert tokens never exceed capacity or fall below zero, admitted cost never exceeds available balance, and idle time cannot reduce tokens. When using integer microtokens, these invariants are exact.

Keep the reference model deliberately simple and independent from production code. If the test copies the same refill helper, both can share a bug. On failure, preserve the generated seed and minimized sequence so CI can reproduce it.

## Frequently Asked Questions

### Should a rejected request consume a token?

Usually no, because it was never admitted. Make this explicit and test repeated rejections to ensure the balance does not become negative.

### How do I test refill without sleeping?

Inject a monotonic clock into an in-process bucket or use fake timers when all time reads occur in the same process. For Redis-owned time, assert eventual invariants in an integration test.

### Why does my concurrency test admit more than capacity?

The decrement may not be atomic, the bucket may be refilling during the run, or multiple server replicas may maintain independent state. Eliminate each source and inspect the storage operation.

### What should \`Retry-After\` contain?

Follow your published HTTP contract. It can represent seconds or an HTTP date under HTTP semantics. Ensure rounding never tells a client to retry before enough capacity exists.

### Is a token bucket the same as a fixed-window counter?

No. A token bucket permits bursts up to stored capacity and refills over time. A fixed window counts requests within calendar-like intervals and has different boundary behavior.
`,
};
