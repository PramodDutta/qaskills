import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Redis Key Expiration with Testcontainers',
  description:
    'Test Redis key expiration with Testcontainers using real TTL commands, isolated containers, refresh boundaries, and deterministic eviction assertions.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test Redis Key Expiration with Testcontainers

At 999 milliseconds the session key should exist; shortly after 1,000 milliseconds it should not. A JavaScript fake timer can move the application's clock, but it cannot advance Redis's own expiry clock or reproduce the command semantics that remove the key. For that boundary, start a real Redis process for the test.

Testcontainers creates an isolated Redis container, exposes its mapped port, and removes it after the suite. The Node Redis client then issues the same \`SET\`, \`PEXPIRE\`, \`PTTL\`, and conditional expiry commands used in production. This is integration testing of Redis behavior, not a simulation of it.

The difficult part is time. Scheduler delays and Redis expiry internals make exact millisecond equality brittle. Good tests assert safe ranges, poll for eventual deletion, and reserve fake clocks for application logic that does not depend on the server's clock.

## Start one pinned Redis for the expiration suite

Pin an image tag instead of relying on \`latest\`. A floating image can change command behavior or startup characteristics between CI runs. The example uses the generic Testcontainers API so the lifecycle is visible.

\`\`\`ts
import { createClient, type RedisClientType } from 'redis';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, beforeEach } from 'vitest';

let container: StartedTestContainer;
let redis: RedisClientType;

beforeAll(async () => {
  container = await new GenericContainer('redis:7.4-alpine')
    .withExposedPorts(6379)
    .start();

  redis = createClient({
    url: \`redis://\${container.getHost()}:\${container.getMappedPort(6379)}\`,
  });
  await redis.connect();
});

beforeEach(async () => {
  await redis.flushDb();
});

afterAll(async () => {
  await redis.quit();
  await container.stop();
});
\`\`\`

The template literal in that code must be escaped in this article's TypeScript source, as shown. At runtime the article displays normal backticks and interpolation.

Starting once per file keeps the suite fast; \`flushDb\` provides test-level data isolation. If files execute in parallel against separate containers, key names cannot collide. If a global setup shares one container across workers, use unique database instances or key prefixes and recognize that \`FLUSHDB\` from one worker can erase another worker's state.

The [Testcontainers Redis guide](/blog/testcontainers-redis-node-complete-guide) covers client wiring, container startup, and CI prerequisites beyond expiry-specific cases.

## Understand Redis TTL return values before asserting

\`TTL\` reports whole seconds; \`PTTL\` reports milliseconds. Both return sentinel values as well as positive lifetimes.

| Result | Meaning | Useful assertion |
| --- | --- | --- |
| Positive integer | Remaining lifetime in the command's unit | Check a range, not the exact initial duration |
| \`-1\` | Key exists but has no expiration | Detect a write that accidentally removed the TTL |
| \`-2\` | Key does not exist | Confirm deletion or distinguish missing data from persistent data |

Calling \`SET key value\` without an expiry normally discards an existing TTL. That behavior catches refresh implementations that update a session body and assume its old deadline remains. Conversely, \`KEEPTTL\` can preserve an existing expiration when that is the intended policy.

Expiry precision is not a promise that a client polling at the deadline observes deletion at an exact CPU instruction. Assert that a freshly created key has a positive PTTL no greater than the requested duration, then wait until the key is absent within a reasonable outer bound.

## Verify a short-lived key without fixed sleeps

A single \`setTimeout(1000)\` makes the test both slow and flaky. It may awaken early relative to the server or far later on loaded CI. Polling expresses the real requirement: Redis removes the key eventually after its deadline.

\`\`\`ts
import { expect, test, vi } from 'vitest';

test('expires a one-second password reset token', async () => {
  await redis.set('reset:token:8d2', 'user-419', { PX: 1_000 });

  const initialTtl = await redis.pTTL('reset:token:8d2');
  expect(initialTtl).toBeGreaterThan(0);
  expect(initialTtl).toBeLessThanOrEqual(1_000);
  expect(await redis.get('reset:token:8d2')).toBe('user-419');

  await vi.waitFor(
    async () => {
      expect(await redis.get('reset:token:8d2')).toBeNull();
      expect(await redis.pTTL('reset:token:8d2')).toBe(-2);
    },
    { timeout: 2_500, interval: 25 },
  );
});
\`\`\`

\`vi.waitFor\` repeatedly runs the callback until its assertions pass or the timeout expires. The outer 2.5-second budget gives a loaded runner room without weakening the Redis TTL itself. A very wide budget can hide a unit conversion defect, so keep it close enough to distinguish one second from one minute.

Avoid Vitest fake timers here. They replace JavaScript timer behavior in the test process, not time inside the container. Using \`vi.advanceTimersByTime(1000)\` will not make Redis expire a key.

## Test sliding expiration as a sequence of observations

A sliding session refreshes its deadline after valid activity. The test needs to show three things: the original TTL decreases, activity moves the deadline outward, and the key survives past the original deadline but disappears after the refreshed one.

Use application code for the refresh so the test validates its Redis command, not a duplicate command written inside the test.

\`\`\`ts
// session-store.ts
import type { RedisClientType } from 'redis';

export class SessionStore {
  constructor(
    private readonly client: RedisClientType,
    private readonly ttlMs: number,
  ) {}

  async create(id: string, userId: string): Promise<void> {
    await this.client.set(\`session:\${id}\`, userId, { PX: this.ttlMs });
  }

  async touch(id: string): Promise<boolean> {
    return this.client.pExpire(\`session:\${id}\`, this.ttlMs);
  }
}
\`\`\`

\`\`\`ts
import { setTimeout as sleep } from 'node:timers/promises';

test('touch extends a live session beyond its first deadline', async () => {
  const sessions = new SessionStore(redis, 800);
  await sessions.create('abc', 'user-9');

  await sleep(450);
  const beforeTouch = await redis.pTTL('session:abc');
  expect(beforeTouch).toBeGreaterThan(0);
  expect(beforeTouch).toBeLessThan(500);

  expect(await sessions.touch('abc')).toBe(true);
  const afterTouch = await redis.pTTL('session:abc');
  expect(afterTouch).toBeGreaterThan(650);
  expect(afterTouch).toBeLessThanOrEqual(800);

  await sleep(450);
  expect(await redis.get('session:abc')).toBe('user-9');

  await vi.waitFor(
    async () => expect(await redis.exists('session:abc')).toBe(0),
    { timeout: 1_000, interval: 25 },
  );
});
\`\`\`

There are real sleeps in this case because the server clock must pass. Keep the suite selective and durations sub-second where the runtime is reliable. If the CI host is extremely contended, increase the gaps and bounds together rather than asserting one precise PTTL.

Touching an already expired key returns false through the client API shown. Add that case so a late request does not silently recreate a logged-out session.

## Conditional expiry prevents an older deadline from winning

Redis 7 supports \`EXPIRE\` and \`PEXPIRE\` options \`NX\`, \`XX\`, \`GT\`, and \`LT\`. They let code set expiry only when a condition holds. \`GT\`, for example, updates only if the proposed expiration is greater than the current one. It is useful when concurrent activity could deliver refresh commands out of order.

The raw Redis command makes the server behavior explicit and avoids depending on how a client version types option arguments:

\`\`\`ts
test('does not shorten a session with an older refresh', async () => {
  await redis.set('session:ordered', 'user-17', { PX: 5_000 });

  const shorter = await redis.sendCommand([
    'PEXPIRE',
    'session:ordered',
    '1000',
    'GT',
  ]);
  expect(shorter).toBe(0);

  const longer = await redis.sendCommand([
    'PEXPIRE',
    'session:ordered',
    '8000',
    'GT',
  ]);
  expect(longer).toBe(1);

  const ttl = await redis.pTTL('session:ordered');
  expect(ttl).toBeGreaterThan(7_500);
  expect(ttl).toBeLessThanOrEqual(8_000);
});
\`\`\`

Do not use \`GT\` without understanding persistent keys. Redis treats a non-volatile key as having an infinite TTL for this comparison, so a finite \`GT\` will not add expiration to it. Test \`NX\` or an explicit create path for that policy.

| Option | Server condition | Representative use |
| --- | --- | --- |
| \`NX\` | Set expiry only when the key has none | Add a deadline without changing an existing one |
| \`XX\` | Set expiry only when the key already has expiry | Refresh only volatile sessions |
| \`GT\` | New deadline must be later | Prevent an out-of-order touch from shortening life |
| \`LT\` | New deadline must be earlier | Tighten retention without extending data |

## Separate expiration from maxmemory eviction

Expiration and eviction are different removal paths. A TTL deletes a key after its deadline. A maxmemory policy may evict a key earlier because memory is constrained. An expiry test should not claim to validate LRU or LFU behavior.

For expiration cases, start Redis with enough memory and default policy so memory pressure cannot confound the result. For eviction, launch a dedicated container with explicit \`--maxmemory\` and \`--maxmemory-policy\`, fill it with controlled payloads, and assert policy-level invariants. Exact victim selection can be probabilistic or sampling-dependent for some policies, so do not hard-code a single victim unless Redis guarantees it.

The [Redis cache testing guide](/blog/redis-cache-testing-guide) explains cache miss, invalidation, serialization, and eviction coverage. Keep TTL boundary tests focused on volatile-key semantics.

Keyspace notifications are also separate. Enabling \`notify-keyspace-events\` and subscribing to expired events can prove an application reacts to notifications, but delivery is not a durable queue. Test the consumer and recovery design rather than assuming one notification per key under every disconnect.

## Catch writes that accidentally erase a TTL

Several Redis commands affect expiry as a side effect. Overwriting a key with plain \`SET\` clears its timeout. Mutating a value in place with commands such as \`INCR\` generally leaves the TTL. Rename transfers the key's expiry to the new key.

Create an integration test around the actual repository method whenever a refactor changes the write command:

\`\`\`ts
test('profile update preserves the existing cache deadline', async () => {
  await redis.set('profile:user-3', JSON.stringify({ name: 'Mina' }), { EX: 30 });
  const before = await redis.ttl('profile:user-3');

  await redis.set(
    'profile:user-3',
    JSON.stringify({ name: 'Mina', locale: 'fr' }),
    { KEEPTTL: true },
  );

  const after = await redis.ttl('profile:user-3');
  expect(before).toBeGreaterThan(0);
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThanOrEqual(before);
});
\`\`\`

Because \`TTL\` rounds to seconds, the comparison allows equality or a lower value. It does not require an exact decrement.

A cache-aside write may intentionally delete the key instead of preserving it. Test the documented strategy, not a universal preference. The invariant is that stale data should not outlive the operation's policy.

## Make failures diagnosable in CI

When an expiry assertion times out, record the final \`PTTL\`, whether the key exists, the Redis image tag, and relevant server configuration. Do not print session values or tokens. Testcontainers can stream logs, but Redis often has little to say about an ordinary expired key.

Container startup failures are infrastructure failures, not product expiry failures. Ensure the CI runner provides a supported Docker-compatible runtime and enough time to pull the pinned image. Cache images at the runner layer only if your platform supports it safely.

Never enable Testcontainers reuse in a required isolation test without a cleanup plan. Reuse accelerates local development, but persistent server configuration and keys can make runs order-dependent. A fresh container or a known reset command is easier to trust.

If the suite is still slow, group expiry cases by one container and reduce redundant waits. Do not replace Redis with a mock merely to make the timing green. A small number of genuine clock-bound integration cases can complement many fast unit tests of application policy.

## Verify absolute deadlines with EXPIREAT and PEXPIREAT

Relative TTLs answer "how long from now," while token and retention policies sometimes store an absolute Unix deadline. Redis provides second and millisecond variants for setting expiry at an absolute timestamp. A useful test computes a near-future server deadline, applies it, confirms the reported remaining lifetime, and polls for removal.

Be precise about units. JavaScript's \`Date.now()\` returns milliseconds; \`EXPIREAT\` expects seconds and \`PEXPIREAT\` expects milliseconds. A unit mix can create a key that expires immediately or survives for years. Keep conversion in one production helper and test it against a real server.

Absolute expiry still follows the Redis server's clock. If the test runner and container host have substantial clock disagreement, an assertion derived only from the test-process clock can fail. Containerized Redis normally shares the host clock, but distributed production Redis deserves time synchronization monitoring. For integration tests, compare ranges and keep the deadline close enough to be observable.

Test past deadlines too. Setting an expiry timestamp in the past deletes the key. That case catches code that expects a negative TTL but leaves stale authorization data available.

## Cover atomic value-and-expiry writes

The safest cache creation often uses one \`SET\` command with \`EX\` or \`PX\`. Splitting \`SET\` and \`EXPIRE\` creates a failure window where the key exists permanently if the process dies between commands. A Testcontainers test cannot prove that two commands are atomic, but it can prove the repository issues the combined operation and that new keys never return \`-1\` after successful creation.

For conditional creation, combine \`NX\` with expiry in the same \`SET\`. Submit two concurrent attempts with different values, assert only one reports success, and verify the winning key has a positive TTL. This is a better lock test than writing the value first and adding expiration later.

Locks require more than eventual expiry. Ownership tokens, safe release through a compare-and-delete script, renewal, and distributed timing assumptions need separate coverage. Do not label a single \`SET NX PX\` assertion a complete distributed-lock verification.

## Distinguish active and passive deletion in observations

Redis removes expired keys when they are accessed and also samples expiring keys in the background. From a client perspective, an expired key is absent either way. Tests should assert observable absence, not the internal deletion path or the exact instant memory is reclaimed.

This distinction explains why inspecting raw memory at the deadline is a poor assertion. A key can be logically expired even if internal cleanup has not yet reclaimed every byte. \`GET\`, \`EXISTS\`, and \`PTTL\` expose the supported semantics.

If the product listens for expired-key notifications, then active versus passive timing can influence when a notification is observed. Enable notification configuration in a dedicated container, subscribe before creating the key, and wait with a bound. Also test subscriber disconnect because Pub/Sub delivery is not retained for an offline consumer.

## Test persistence and restart semantics separately

Redis stores an absolute expiry time, so elapsed wall time continues while the server is stopped. A restart test can create a key with a short TTL, stop long enough to cross the deadline, restart, and verify absence. That scenario needs container configuration with persistence and a retained volume or a controlled container restart, not a brand-new empty container that proves nothing about TTL restoration.

Keep restart cases out of the fast boundary suite. They exercise persistence mode, filesystem, shutdown behavior, and server recovery in addition to expiry. Pin configuration such as RDB or AOF deliberately, because the outcome depends on what data was persisted before the stop.

Replica and cluster tests are another layer. Replication, failover, and clock behavior can affect when clients observe deletion. A single standalone Testcontainers Redis instance validates command semantics but cannot support claims about Sentinel or cluster failover. Use a topology-specific environment when those are product requirements.

## Calibrate timing assertions from failure meaning

Every time bound should distinguish the defect you care about. For an 800 ms session, requiring refresh PTTL above 650 ms proves the deadline moved substantially. Allowing anything above zero would pass a broken touch that added only ten milliseconds. Requiring exactly 800 would fail correct code because the assertion itself consumes time.

Similarly, the polling timeout should catch unit mistakes. If a one-second key may take up to 2.5 seconds to be observed as absent under CI load, that is reasonable headroom. A 90-second outer timeout would let a mistaken 60-second TTL pass slowly and waste runner capacity.

Record actual timing distributions before tightening a flaky threshold. If container hosts regularly pause for seconds, fix or isolate the runners rather than broadening every expiry assertion until it has no diagnostic power.

## Frequently Asked Questions

### Why does advancing Vitest fake timers not expire the Redis key?

Redis runs in another process with its own clock. Fake timers affect JavaScript timers in the test worker, so use real elapsed time and bounded polling for server expiry.

### Should I assert the exact TTL immediately after SET?

No. Time passes between commands, and second-based TTL values round. Assert a positive value at or below the requested duration, with a lower bound appropriate to the test.

### Is a missing key always represented by TTL zero?

No. Redis returns \`-2\` when the key does not exist and \`-1\` when it exists without an expiration. Those sentinels should be tested explicitly.

### Can one Redis container be shared by parallel test files?

It can, but \`FLUSHDB\` and common key names create cross-worker hazards. Prefer a container per file or isolate workers with unique databases and prefixes.

### Does this expiration test also prove maxmemory eviction?

No. TTL expiration and memory-policy eviction are different mechanisms. Configure and test maxmemory behavior in a dedicated suite with policy-aware assertions.
`,
};
