import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Category cache ttl grouping tests',
  description:
    'category cache ttl grouping tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'category cache ttl grouping tests',
  keywords: [
    'category cache ttl grouping tests',
    'categories api cache test',
    'redis one hour ttl test',
    'category type grouping assertion',
    'unknown category type handling',
    'cache aside fetcher test',
  ],
  relatedSlugs: [
    'redis-cache-testing-guide',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'testing-typesense-multiselect-facet-filter-queries',
  ],
  sources: [
    'https://upstash.com/docs/redis/sdks/ts/commands/string/get',
    'https://upstash.com/docs/redis/sdks/ts/commands/string/set',
  ],
  repoEvidence: [
    'packages/web/src/app/api/categories/route.ts:GET grouping and 3600 TTL',
    'packages/web/src/lib/cache.ts:cacheGetOrSet',
  ],
  content: `Category cache ttl grouping tests verify that a cold categories request builds four named groups, ignores unknown types, and passes 3,600 seconds to cache storage. A warm request must reuse cached output without querying categories. Provider read or write failures should follow the cache helper's documented fallback behavior.

This plan tests grouping and caching as separate facts, then combines them at the route boundary. A cache hit cannot prove the grouped source was correct, and a correct response cannot prove the expiration option. Open the [categories page](/categories) after both contracts pass.

## Category cache ttl grouping tests: What Must the Suite Prove?

Category cache ttl grouping tests must prove the endpoint uses key \`categories:all\`, groups supported rows into four arrays, ignores unsupported type names, and supplies a 3,600-second lifetime. Cold and warm requests need different query counts. Cache failures must preserve the helper behavior shown in repository code.

The four output keys are \`testingType\`, \`framework\`, \`language\`, and \`domain\`. The route initializes every group before processing rows, so an empty database result still returns all four keys with empty arrays. Tests should assert this stable shape rather than only checking populated groups.

Each category row is appended only when \`grouped[row.type]\` exists. Unknown values therefore disappear from the returned object rather than creating new keys or causing an error. A category type grouping assertion should verify both inclusion and exclusion.

The route calls \`cacheGetOrSet('categories:all', fetcher, 3600)\`. The helper first tries cache read, returns any non-null value immediately, and otherwise invokes the fetcher. It then awaits a cache write before returning the fresh value.

The helper swallows failures inside \`cacheGet\` and \`cacheSet\`. A failed read behaves like a miss and reaches the database fetcher. A failed write still lets \`cacheSet\` resolve, so the route can return fresh grouped data while the next request misses again.

The [Upstash get command reference](https://upstash.com/docs/redis/sdks/ts/commands/string/get) describes the provider read used by the helper. The [Upstash set command reference](https://upstash.com/docs/redis/sdks/ts/commands/string/set) documents the expiration option represented locally as \`{ ex: ttlSeconds }\`.

Use the [QA skills catalog](/skills) as a downstream consumer only after category cache ttl grouping tests establish output shape and freshness. Catalog rendering cannot reveal whether the route queried the database or reused a cache entry.

## Which QASkills Code Paths Own This Contract?

Route ownership appears at \`packages/web/src/app/api/categories/route.ts:GET grouping and 3600 TTL\`. That path chooses the cache key and lifetime, fetches all category rows, initializes groups, ignores unknown types, and maps errors to a 500 JSON response.

Cache-aside behavior appears at \`packages/web/src/lib/cache.ts:cacheGetOrSet\`. The same file lazily creates an Upstash client only when both required environment variables exist. Without those variables, reads return null and writes return without remote work.

The route's fetcher is the only place that groups rows. A warm cache hit returns the cached object as stored and does not regroup it. This means a malformed cached value can pass through, while grouping tests must run on a cold path.

The helper treats \`null\` as the miss marker. Other cached values, including an object whose arrays are empty, are valid hits. Do not use truthiness when building a test double because it would misrepresent empty but legitimate cached objects.

The cache key and lifetime are route decisions, while provider fallback is helper behavior. Test the route with a spy around \`cacheGetOrSet\`, then test the helper with controlled Redis methods. This gives each failure one clear owner.

If database selection or grouping throws inside the fetcher, \`cacheGetOrSet\` propagates that error and the route returns status 500 with \`Failed to fetch categories\`. Cache write failures differ because \`cacheSet\` catches them internally.

Read the [Redis cache testing guide](/blog/redis-cache-testing-guide) for broader invalidation and provider setup. This article stays focused on one key, one lifetime, and the categories grouping fetcher.

## Categories api cache test: Baseline Cases

A categories api cache test begins with no cached entry and one row for each supported type. GET should call the database once, return all four groups, and attempt one cache write under \`categories:all\`. The write should receive 3,600 seconds.

Add two rows with the same supported type. Both should remain in source order within that group's array because the route pushes rows as it iterates. Avoid asserting order across groups, since each group is a separate named property.

Add an unknown type beside valid rows. The response should contain every valid row, no extra top-level key, and no unknown row in any supported array. The route should still return 200 because unsupported types are ignored intentionally by the current loop.

For a warm baseline, preload a complete grouped object. GET should return that exact value and never invoke the database fetcher. This case proves cache reuse, but it does not prove that the object was originally grouped correctly.

For an empty database baseline, return no rows on a cold miss. The endpoint should return four empty arrays and cache that object. A later warm request should return the same shape without another database call.

When Redis configuration is absent, \`cacheGet\` returns null and \`cacheSet\` does nothing. Every request then uses fresh database data. Treat this as a no-cache mode, not a provider error, and assert the database count accordingly.

Category cache ttl grouping tests also need a route error control. Make the database fetch reject on a cold miss and assert status 500 with the repository message. This proves the harness can detect a failing fetcher instead of always returning a cached fixture.

The [getting started page](/getting-started) is unaffected by these provider details. Keep broad navigation smoke checks separate from the categories api cache test so cache diagnostics stay precise.

## Redis one hour ttl test: Test Matrix

A redis one hour ttl test must capture the exact seconds passed by the route and the \`ex\` option sent by the helper. Waiting an actual hour is unnecessary and slower than observing configuration. Expiration behavior can be simulated by changing the next read from a value to null.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Cold cache with four known types | Read returns null, valid source rows | Fetcher groups rows | 200 with four populated keys | One database read and set with 3,600 | Missing group or wrong lifetime |
| Warm cache hit | Read returns grouped object | Immediate cached return | 200 with cached object | No database read or set | Fetcher called on hit |
| Expired cache entry | First hit absent after prior value | Fetcher runs again | 200 with refreshed groups | One new read and set | Stale value or no refresh |
| Unknown type with valid rows | Cold miss and mixed types | Guard skips unsupported key | 200 without unknown row | Valid object cached | Extra key or route error |
| Cache write rejection | Cold miss and set throws internally | cacheSet catches failure | 200 with fresh groups | Database called; remote set fails | Route returns 500 |

The cold row proves output and configuration together, but keep separate assertions for each. If grouping fails, a correct 3,600 argument should still appear in diagnostics. If the lifetime changes, valid arrays should still show the route reached its fetcher.

The warm row must provide a non-null object. Assert strict object equality where serialization permits it and verify zero database calls. A cache aside fetcher test that only checks status cannot distinguish warm reuse from a successful cold rebuild.

The expired row does not need clock travel inside the route. Configure the cache double to return null for the post-expiration call, then expect one fetch and one set. Provider integration coverage can separately verify actual key expiration.

The unknown row confirms grouping policy independently of the cache. Run it cold and inspect the object passed to set, not only the HTTP body. This proves unsupported data never becomes cached output.

The write-rejection row follows current helper behavior. Because \`cacheSet\` catches provider errors, the fresh result should still reach the caller. A second request should query again if the provider retained no value.

Use the [leaderboard cache isolation article](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) for cache-key dimensions and rankings. Categories use one fixed key, so filter isolation is outside this matrix.

## How Should Category type grouping assertion Be Exercised?

A category type grouping assertion should seed distinct IDs and names for all supported types plus one unsupported type. Execute the fetcher on a known cold miss, then compare each response array with the exact source rows assigned to that group. Also assert the unsupported ID appears nowhere.

Use a route-level mock that captures the key, fetcher, and lifetime while still invoking the supplied fetcher. This method tests the real grouping loop without needing remote Redis. It also lets the case assert \`categories:all\` and 3,600 directly.

The first code example shows that pattern. The database adapter returns controlled category rows, while the cache adapter records route arguments and executes the actual callback once.

\`\`\`typescript
import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/categories/route';
import { cacheGetOrSet } from '@/lib/cache';
import { db } from '@/db';

vi.mock('@/lib/cache', () => ({ cacheGetOrSet: vi.fn() }));
vi.mock('@/db', () => ({
  db: { select: vi.fn() },
}));

it('groups known category types and skips unknown rows', async () => {
  const rows = [
    { id: 't1', name: 'E2E', slug: 'e2e', type: 'testingType' },
    { id: 'f1', name: 'Playwright', slug: 'playwright', type: 'framework' },
    { id: 'l1', name: 'TypeScript', slug: 'typescript', type: 'language' },
    { id: 'd1', name: 'Web', slug: 'web', type: 'domain' },
    { id: 'x1', name: 'Ignored', slug: 'ignored', type: 'unsupported' },
  ];

  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockResolvedValue(rows),
  } as never);
  vi.mocked(cacheGetOrSet).mockImplementation(async (key, fetcher, ttl) => {
    expect(key).toBe('categories:all');
    expect(ttl).toBe(3600);
    return fetcher();
  });

  const response = await GET();
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.testingType.map(({ id }: { id: string }) => id)).toEqual(['t1']);
  expect(body.framework.map(({ id }: { id: string }) => id)).toEqual(['f1']);
  expect(body.language.map(({ id }: { id: string }) => id)).toEqual(['l1']);
  expect(body.domain.map(({ id }: { id: string }) => id)).toEqual(['d1']);
  expect(JSON.stringify(body)).not.toContain('x1');
});
\`\`\`

Keep row objects complete enough for the route's returned type, but assert stable identity fields rather than timestamps. The grouping loop retains whole rows. Exact timestamp snapshots add noise without proving type placement.

Add a second cold case with no rows. Assert all four properties exist and contain arrays. This protects clients that render empty groups without checking for missing keys.

Do not mock the grouping result itself. If \`cacheGetOrSet\` returns a prepared object without invoking the fetcher, the case tests only response serialization. The spy must call the callback for cold grouping coverage.

Browse [category groups](/categories) after the endpoint case passes. A small browser check can confirm headings consume the four keys, while route tests retain exact row and cache diagnostics.

## Step-by-Step Unknown category type handling Procedure

Unknown category type handling needs a cold source case first, followed by warm reuse and provider failures. This sequence proves the unsupported row is removed before caching. It also prevents a prepared warm object from hiding a grouping defect.

1. Seed category rows for testing type, framework, language, domain, and one unknown type.
2. Invoke GET through a controlled cacheGetOrSet implementation on cold and warm paths.
3. Assert group membership, ignored rows, fetcher count, and the 3,600-second set option.
4. Add provider failure cases while preserving the successful grouped response.

In step one, give each row a unique ID that identifies its expected group. Use an unsupported type name that cannot collide with a defined key. This makes accidental inclusion visible in both body and cache payload.

In step two, call the real fetcher once for the cold request and return its result. Store that result in the test double, then make the warm call return it without invoking the callback. Count database calls across both requests.

In step three, compare exact IDs within every array and confirm no fifth key exists. Assert one cold database fetch, zero warm fetches, the fixed key, and the route lifetime. Then inspect the helper-level set option.

In step four, reject provider get and set calls independently. A get rejection should become a miss and fetch fresh rows. A set rejection should still return fresh rows, since both helper functions catch their own provider failures.

The second example tests cache-aside call counts and the expiration argument. It uses a controlled Redis client while preserving the real \`cacheGetOrSet\` flow.

\`\`\`typescript
import { beforeEach, expect, it, vi } from 'vitest';

const redisGet = vi.fn();
const redisSet = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({ get: redisGet, set: redisSet })),
}));

it('reads once, fetches on miss, and writes with one-hour expiration', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  vi.resetModules();

  redisGet.mockResolvedValue(null);
  redisSet.mockResolvedValue('OK');
  const { cacheGetOrSet } = await import('@/lib/cache');
  const fetcher = vi.fn().mockResolvedValue({ testingType: [], framework: [] });

  const result = await cacheGetOrSet('categories:all', fetcher, 3600);

  expect(result).toEqual({ testingType: [], framework: [] });
  expect(redisGet).toHaveBeenCalledWith('categories:all');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(redisSet).toHaveBeenCalledWith(
    'categories:all',
    result,
    { ex: 3600 },
  );
});
\`\`\`

Reset modules because the helper caches its Redis client in module state. Also restore environment values and mocks after each case. Without isolation, a prior client or cached return can alter later test paths.

Use the [JSONB filter testing article](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) for skill filtering. Category type grouping uses simple row properties and should not inherit unrelated JSONB expectations.

## Cache aside fetcher test: Assertions and Diagnostics

A cache aside fetcher test needs state, call-count, payload, and error assertions. State identifies cold, warm, expired, unconfigured, or provider-failure setup. Call counts prove whether the fetcher and database ran.

Payload assertions compare the HTTP body with the object passed to cache storage. They should match on a cold path. If they differ, clients can receive data that later warm requests do not reproduce.

The lifetime assertion must inspect both route and helper boundaries. At the route, verify the third argument is 3,600. At the provider boundary, verify \`set\` receives \`{ ex: 3600 }\`.

Category cache ttl grouping tests should report the cache key, configured state, fetcher count, database count, set count, and group sizes. Avoid printing Redis tokens or complete category descriptions. IDs and type names are enough for fault analysis.

On a warm hit, assert no set call as well as no fetcher call. A helper that rewrites every hit could preserve response correctness while adding provider load. Current code returns immediately after a non-null read.

On a read rejection, assert one fresh fetch and one attempted set. On a write rejection, assert the fresh response still returns. Then run another call with a miss to demonstrate that failed storage does not create a hidden in-memory hit.

On a fetcher rejection, assert the route's 500 status and error body. The cache helper does not swallow fetcher errors. Keep that distinction in the CI message so maintainers know whether the database or provider failed.

The [QASkills blog](/blog) connects this endpoint with leaderboard and search cache patterns. Preserve separate keys and matrices because their fallback rules may differ.

## What Regressions and Boundaries Prevent False Confidence?

The first weak signal is a cache hit with the right body. That case never runs the grouping callback and cannot prove unknown category type handling. Always include a cold request whose source rows contain the unsupported value.

The second weak signal is a correct response without set inspection. Fresh database data can return successfully even when the route uses the wrong lifetime. A redis one hour ttl test must capture 3,600 at both function boundaries.

Do not treat a write failure as a route failure. Current \`cacheSet\` catches provider errors, so the route returns grouped data after a successful fetch. Conversely, a database error propagates through the helper and becomes the route's 500 response.

Do not use a falsy check for cached values in doubles. The helper uses \`cached !== null\`, which means empty objects and arrays remain valid hits. Mirror that rule or the test may call a fetcher that production would skip.

Category cache ttl grouping tests should avoid real-time hour waits. Observe the expiration argument and simulate a later miss. A separate provider integration can use a shorter test key if actual expiry behavior needs verification.

Keep sorting outside the contract because the route does not order its database selection. Assert group membership and source-relative order only when the fixture adapter defines it. Do not invent alphabetical behavior for the [categories page](/categories).

Search indexing and skill JSONB filters are neighboring concerns. The [Typesense filter article](/blog/testing-typesense-multiselect-facet-filter-queries) and database filter article own those paths. This suite should fail only when category cache or grouping behavior changes.

After modifying supported type names, update cold grouping, empty groups, unknown values, warm payloads, and downstream rendering together. Retain the unknown row after expansion by choosing a different unsupported label.

### A plain review card for each cache change

Use one small review card when this route or cache helper changes, and keep the cold facts on the left with warm facts on the right. The cold side should name source rows, group sizes, skipped IDs, key, and set life, while the warm side should name the saved value and zero fetch count. This view helps a reviewer see when a code diff changes data shape and cache work at the same time.

Run the card with Redis off, with a cold miss, with a warm hit, and with each safe provider fault before the change can ship. Keep a known row in each of the four groups and one bad type in the cold set, so every path has both proof of work and proof of skip. When a case fails, print only safe row IDs, type names, call counts, and the fixed key.

- Cold read returns null and lets the source fetch run once
- Cold source rows fill all four known groups with exact test IDs
- Unknown source type adds no key and no row to saved data
- Cold result is sent to cache under the fixed categories key
- Set call uses an ex value of 3,600 seconds
- Warm read returns the saved object with no source fetch
- Warm read makes no new set call for the same object
- Empty source still yields four keys with four empty arrays
- Failed cache read falls back to one fresh source fetch
- Failed cache write still lets the fresh route reply succeed
- Failed source fetch yields the known 500 body on a cold miss
- Test cleanup clears all spies, env keys, and the module client
- Saved cold value matches the JSON body sent back by the route
- A null read is a miss while an empty saved object is still a hit
- Group checks use safe row IDs and do not rely on broad text search
- Each test worker owns its source rows and clears them after the run
- Failed jobs show key, group size, read count, fetch count, and set count

## Frequently Asked Questions

### What do category cache ttl grouping tests verify?

They verify the fixed cache key, 3,600-second lifetime, four output arrays, ignored unknown types, cold database calls, warm cache reuse, and provider fallback behavior. The suite inspects both response data and cache operations because either side can be correct while the other regresses.

### How should a categories api cache test model no Redis configuration?

Remove either required Upstash environment value and reset the cache module. Reads should return null, writes should return without remote work, and the database fetcher should run for each request. Assert valid grouped responses while labeling the mode as uncached rather than failed.

### What proves a redis one hour ttl test without waiting?

Capture the route's third \`cacheGetOrSet\` argument and the provider set options. Both should contain 3,600 seconds, with the provider receiving \`{ ex: 3600 }\`. Simulate expiration by making a later read return null and asserting one fresh fetch from storage.

### Which checks belong in a category type grouping assertion?

Seed unique rows for testing type, framework, language, domain, and an unsupported value. Assert exact IDs in each supported array, all four keys even when empty, no fifth key, and no unsupported ID anywhere. Inspect the cached payload as well as the response.

### How does unknown category type handling work currently?

The route creates only four known arrays and pushes a row when its type names an existing group. An unsupported type fails that guard and is skipped without an error. Tests should preserve valid neighbors to prove the loop continued after ignoring the unknown row.

### What should a cache aside fetcher test record?

Record cache state, key, read count, fetcher count, database count, set count, expiration options, group sizes, and route status. For failures, identify whether read, write, or fetcher rejected. Never include provider tokens because they do not help diagnose control flow.

## Conclusion

Category cache ttl grouping tests prove cold grouping, warm reuse, unknown-type exclusion, and the exact one-hour setting as separate observable facts. They also preserve current fallback rules: cache read failures fetch fresh data, cache write failures return fresh data, and source failures become a route error.

[Open categories](/categories), browse the category groups, and add cold, warm, unknown-type, and TTL cases to the endpoint post-flow. Continue with the [QA skills catalog](/skills) after cache and source results agree.`,
};
