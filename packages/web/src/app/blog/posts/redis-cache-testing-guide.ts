import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Redis Cache Testing Guide',
  description:
    'Redis cache testing guide for proving TTLs, invalidation, serialization, race safety, tenant key design, and fallback behavior before release.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Redis Cache Testing Guide

The cache bug that hurts is rarely a clean Redis outage. It is a product page showing yesterday's price, a permissions change hidden behind a stale key, a thundering herd after a hot key expires, or a test suite that passes because it never checked the TTL. Redis is fast enough that teams forget it is still state.

Redis cache testing is about proving the contract around cached state: which keys exist, what they contain, how long they live, when they are invalidated, what happens under concurrency, and how the application behaves when Redis is slow or unavailable. A cache is not a transparent optimization once users can observe stale data.

This guide uses Node examples with \`redis\` because the command surface is easy to read, but the testing ideas apply to Java, Go, Ruby, Python, and .NET. For disposable Redis in integration tests, use the [Testcontainers Redis Node complete guide](/blog/testcontainers-redis-node-complete-guide). For load behavior and cache capacity planning, connect these checks to the [performance testing complete guide](/blog/performance-testing-complete-guide).

## Cache Contracts Worth Testing

Start by writing the cache contract in product terms. "Cache product details for five minutes" is not enough. What happens when price changes? What happens when inventory changes? Is stale data acceptable? Can a user see data from another tenant?

| Contract area | Question to answer | Example failure |
|---|---|---|
| Key design | Does the key include tenant, locale, auth scope, and version where needed? | User sees another tenant's settings |
| Serialization | Can the app read what it wrote after deploys? | New code cannot parse old JSON |
| TTL | Does the key expire at the intended time? | Hot data never refreshes |
| Invalidation | Are writes reflected before users observe stale state? | Updated price stays stale |
| Stampede control | Do many requests rebuild one key safely? | Database spike after expiry |
| Fallback | Does the app degrade when Redis is down? | Cache outage becomes site outage |

The cache test suite should cover all six for critical data. For low-risk data, such as public marketing counts, TTL and fallback may be enough.

## Use Real Redis for Integration Tests

Mocking Redis can help unit-test small wrappers, but it is a poor substitute for TTL, expiration, command semantics, and concurrency. Use a disposable Redis instance for integration tests. Flush the database between tests or use unique key prefixes.

A cache helper should receive a Redis client, not import a global singleton everywhere. That makes tests simpler and avoids accidental writes to development Redis.

\`\`\`ts
import { createClient, type RedisClientType } from 'redis';

export async function createRedisForTests(): Promise<RedisClientType> {
  const client = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  });

  client.on('error', (error) => {
    throw error;
  });

  await client.connect();
  await client.flushDb();
  return client as RedisClientType;
}
\`\`\`

Use \`flushDb\` only against a test database. For shared environments, generate a unique prefix per test run and delete by prefix during cleanup. Never run broad deletion commands against a shared development or staging Redis without guardrails.

## Testing TTL With the Real \`SET\` Options

Redis \`SET\` supports expiration options such as \`EX\` for seconds and \`PX\` for milliseconds. In node-redis, pass options as an object. Then verify both the value and the remaining TTL.

\`\`\`ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { RedisClientType } from 'redis';
import { createRedisForTests } from './redis-test-client';

async function cacheProduct(
  redis: RedisClientType,
  productId: string,
  value: unknown,
  ttlSeconds: number,
) {
  await redis.set(
    'product:' + productId,
    JSON.stringify(value),
    { EX: ttlSeconds },
  );
}

describe('product cache TTL', () => {
  let redis: RedisClientType;

  beforeEach(async () => {
    redis = await createRedisForTests();
  });

  afterEach(async () => {
    await redis.quit();
  });

  it('stores product data with a bounded TTL', async () => {
    await cacheProduct(redis, 'sku-123', { priceCents: 1999 }, 60);

    const value = await redis.get('product:sku-123');
    const ttl = await redis.ttl('product:sku-123');

    expect(JSON.parse(value!)).toEqual({ priceCents: 1999 });
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });
});
\`\`\`

This test catches a common mistake: writing the value but forgetting the expiration. It also catches code that accidentally uses milliseconds where Redis expects seconds.

## TTL Edge Cases

Redis \`TTL\` returns special values. A missing key returns \`-2\`. A key with no expiration returns \`-1\`. Tests should assert those cases when the distinction matters.

| TTL result | Meaning | Test implication |
|---|---|---|
| Positive integer | Key exists and expires in that many seconds | Expected for most cache entries |
| \`-1\` | Key exists without expiration | Usually a bug for cache data |
| \`-2\` | Key does not exist | Expected after expiration or deletion |

Use short TTLs only when testing expiration itself. For normal cache behavior tests, assert the configured TTL rather than waiting for real time. Sleeping in tests makes suites slow and flaky.

## Invalidation Tests Should Follow the Write Path

Invalidation is where cache correctness usually breaks. Test the same write path users or jobs use. Do not call a cache delete helper directly and call it covered.

Assume a product service reads through cache and invalidates after update:

\`\`\`ts
type Product = {
  id: string;
  name: string;
  priceCents: number;
};

type ProductRepository = {
  findById(id: string): Promise<Product>;
  updatePrice(id: string, priceCents: number): Promise<Product>;
};

export class ProductService {
  constructor(
    private readonly redis: RedisClientType,
    private readonly repository: ProductRepository,
  ) {}

  async getProduct(id: string): Promise<Product> {
    const key = 'product:' + id;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as Product;

    const product = await this.repository.findById(id);
    await this.redis.set(key, JSON.stringify(product), { EX: 300 });
    return product;
  }

  async updatePrice(id: string, priceCents: number): Promise<Product> {
    const product = await this.repository.updatePrice(id, priceCents);
    await this.redis.del('product:' + id);
    return product;
  }
}
\`\`\`

The test should warm the cache, perform the update, then read again and prove the repository result is visible.

\`\`\`ts
it('invalidates cached product after a price update', async () => {
  const repository = {
    current: { id: 'sku-9', name: 'Keyboard', priceCents: 5000 },
    async findById() {
      return this.current;
    },
    async updatePrice(id: string, priceCents: number) {
      this.current = { id, name: 'Keyboard', priceCents };
      return this.current;
    },
  };

  const service = new ProductService(redis, repository);

  await expect(service.getProduct('sku-9')).resolves.toMatchObject({ priceCents: 5000 });
  await service.updatePrice('sku-9', 4500);
  await expect(service.getProduct('sku-9')).resolves.toMatchObject({ priceCents: 4500 });
});
\`\`\`

This is a cache correctness test, not just a Redis command test. It proves the user-visible read path observes the write.

## Key Design Tests Prevent Tenant Leaks

If the cached value depends on tenant, user, locale, permissions, feature flags, or currency, the key must include that dimension or the value must be safe to share. This is especially important for AI coding tools, dashboards, and admin panels.

| Data | Key must include | Reason |
|---|---|---|
| User preferences | User ID | Preferences are private |
| Tenant settings | Tenant ID | Same setting name differs by tenant |
| Localized content | Locale | Text and formatting differ |
| Permission-filtered list | User or role scope | Results depend on authorization |
| Feature-flagged response | Flag version or segment | Shape may differ across variants |

Write a test that stores two values with different scopes and proves they do not collide. A code review can miss a missing tenant ID in a key builder. A test with two tenants catches it.

## Serialization and Deploy Compatibility

Cache values often outlive a deploy. If version N writes JSON and version N+1 reads it differently, users can see errors until keys expire. For critical caches, test older serialized shapes.

Use versioned keys or tolerant readers when the shape changes. A versioned key such as \`product:v2:sku-123\` avoids parsing old values but may increase cold starts after deploy. A tolerant reader can migrate or ignore missing fields but needs tests.

| Strategy | Benefit | Cost |
|---|---|---|
| Versioned key prefix | Clean separation between shapes | Cold cache after deploy |
| Backward-compatible parser | Smooth deploys | More parsing code |
| Short TTL during migration | Limits old value lifetime | Temporary performance hit |
| Explicit cache flush | Immediate cleanup | Operational risk if too broad |

Do not use JavaScript object serialization that depends on class instances unless every reader understands it. Plain JSON with explicit version fields is easier to test.

## Race Conditions and Stampede Tests

Cache-aside logic can stampede when a hot key expires and many requests rebuild it simultaneously. The usual mitigation is a lock, singleflight mechanism, early refresh, or stale-while-revalidate design.

A test can simulate concurrent misses by making the repository slow and issuing many reads. The assertion should prove the expensive loader ran once or a bounded number of times.

\`\`\`ts
it('deduplicates concurrent cache misses for the same product', async () => {
  let loads = 0;
  const repository = {
    async findById(id: string) {
      loads += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { id, name: 'Monitor', priceCents: 24900 };
    },
    async updatePrice() {
      throw new Error('not used');
    },
  };

  const service = new ProductServiceWithSingleflight(redis, repository);

  const results = await Promise.all(
    Array.from({ length: 20 }, () => service.getProduct('sku-hot')),
  );

  expect(results).toHaveLength(20);
  expect(loads).toBe(1);
});
\`\`\`

This test assumes \`ProductServiceWithSingleflight\` implements in-process deduplication. In a multi-instance system, in-process protection is not enough. Use Redis locks or accept bounded duplication based on load risk.

## Redis Failure Modes

Your application should have an explicit posture for Redis failures. Some data can bypass cache and hit the database. Some rate limiters must fail closed. Some personalization features can fail open with defaults.

| Feature | Redis failure posture | Test assertion |
|---|---|---|
| Product detail cache | Bypass cache and read database | User still sees product |
| Session store | Usually fail closed | User is not authenticated with missing session |
| Rate limiter | Often fail closed for sensitive endpoints | Request denied or degraded safely |
| Public leaderboard | Fail open with stale or empty state | Page still renders |
| Job deduplication | Depends on side effects | Duplicate work is prevented or explicitly tolerated |

Inject Redis errors through a fake client for unit tests and through network interruption for integration tests. Do not discover failure posture during an incident.

## Eviction and Memory Pressure

TTL is not the only way a key disappears. Redis can evict keys under memory pressure depending on configuration. Unit tests cannot fully simulate production eviction policy, but design reviews and load tests should account for it.

For critical caches, the application must treat cache misses as normal. A missing key should rebuild or degrade. If a missing key causes an exception, the code is using Redis as a database while calling it a cache.

Use metrics to detect eviction rates and hit ratios. Tests prove behavior. Observability tells you whether production follows the assumptions.

## Review Checklist for Cache Changes

Before merging a Redis-backed cache, ask:

1. Is the key builder tested with multiple tenants or users?
2. Is the TTL asserted with real Redis?
3. Does the write path invalidate or update the cache?
4. Are old serialized values handled during deploy?
5. Is concurrent miss behavior acceptable?
6. Is Redis outage behavior explicit?
7. Are secrets, tokens, and permission-filtered results protected?

Cache changes are deceptively small. A one-line \`set\` can create a security bug if the key is wrong.

## Testing Write-Through and Write-Behind Caches

Cache-aside is common, but some systems write to Redis as part of the write path. A write-through cache updates the cache and backing store together. A write-behind design accepts a write quickly and persists later. These patterns need stronger tests because Redis is no longer just an acceleration layer.

| Pattern | Test focus | Risk |
|---|---|---|
| Cache-aside | Miss rebuild and invalidation | Stale reads after writes |
| Write-through | Store and cache commit consistency | Cache says write succeeded when database failed |
| Write-behind | Durable queue and retry behavior | Accepted write is lost |
| Read-through wrapper | Loader error and TTL behavior | Wrapper hides source failures |
| Stale-while-revalidate | Stale limit and background refresh | Users see stale data too long |

For write-through, inject a database failure after the Redis write and assert the operation rolls back or deletes the cache entry. For write-behind, test the queue and retry path as a product feature, not a cache detail. If the user sees "saved," the system owes durability or an honest pending state.

## Cache Observability Tests

Tests should not only prove behavior. They should prove the application emits enough signals to debug production cache problems. At minimum, important cache paths should record hit, miss, set, delete, loader error, and fallback events with the cache name. Avoid logging raw keys if keys contain user identifiers or sensitive values. Hash or structure labels safely.

| Signal | Debug question answered |
|---|---|
| Hit count | Is the cache actually used? |
| Miss count | Are keys churning or expiring too fast? |
| Load duration | Is the backing store under pressure? |
| Set failure | Is Redis unavailable or rejecting writes? |
| Invalidation count | Are write paths clearing data? |
| Fallback count | Is the app surviving Redis failure? |

In unit tests, assert that cache wrapper callbacks emit the expected metric labels. In integration tests, use a fake metrics sink or in-memory recorder. Observability is part of the cache contract because a silent cache failure usually becomes a production mystery.

## Testing Lua Scripts and Atomic Operations

Redis is often used for atomic counters, locks, and rate limits through commands such as \`INCR\`, \`SET\` with \`NX\`, or Lua scripts. These are not ordinary cache tests. They are consistency tests, and they deserve concurrency coverage with real Redis.

For a lock, assert that two contenders cannot both acquire it. For a rate limiter, assert that the boundary request is accepted or rejected according to the documented rule. For a Lua script, test the script through the same client path the application uses, not by reimplementing the logic in JavaScript.

\`\`\`ts
it('allows only one worker to acquire a Redis lock key', async () => {
  const attempts = await Promise.all([
    redis.set('lock:invoice:42', 'worker-a', { NX: true, EX: 30 }),
    redis.set('lock:invoice:42', 'worker-b', { NX: true, EX: 30 }),
  ]);

  expect(attempts.filter((result) => result === 'OK')).toHaveLength(1);
  expect(await redis.get('lock:invoice:42')).toMatch(/worker-/);
});
\`\`\`

This test uses Redis command semantics directly. A mock that returns success twice would miss the entire point.

## Privacy and Compliance Caches

Some Redis entries contain data with regulatory or contractual handling requirements. User profile snippets, entitlement decisions, support notes, and AI memory summaries can be sensitive even when they are cached briefly. Tests should verify that deletion and consent changes clear those keys.

If a user invokes deletion, the application may need to remove several key families: profile cache, recommendation cache, search personalization cache, and background job dedupe keys. Write a deletion test that seeds representative keys, runs the same deletion workflow the product uses, and asserts all scoped keys are gone. Do not rely on TTL alone for user deletion requests.

## Frequently Asked Questions

### Should Redis cache tests use mocks?

Use mocks for narrow error injection and wrapper unit tests. Use real Redis for TTL, expiration, command options, serialization, and concurrency behavior. Mock Redis rarely matches expiration semantics well enough.

### How do I test cache expiration without slowing the suite?

Assert the TTL value after writing the key. Only use very short TTLs in a small number of tests that specifically verify expiration behavior. Avoid sleeps in ordinary cache correctness tests.

### What is the safest key design for tenant data?

Include tenant ID and any other dimension that changes the value, such as locale, user role, feature segment, or schema version. Then write a collision test with two tenants and different expected values.

### Should invalidation delete or update the cached value?

Delete is simpler and safer when rebuilding is cheap. Update can reduce misses but risks writing a value that does not match the read path. Test whichever strategy follows the real write operation.

### How do I test cache stampede protection?

Create many concurrent reads for the same missing key and make the loader slow. Assert the loader runs once or within an accepted bound. For multi-instance systems, test distributed locking or load behavior separately.
`,
};
