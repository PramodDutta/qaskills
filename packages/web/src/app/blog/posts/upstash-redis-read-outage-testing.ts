import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Upstash Redis read outage testing',
  description:
    'Use Upstash Redis read outage testing to prove a cache read exception becomes a miss and fresh database data still reaches the endpoint in CI.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Upstash Redis read outage testing',
  keywords: [
    'Upstash Redis read outage testing',
    'Upstash outage fallback test',
    'Redis GET error cache miss',
    'cache read failure graceful degradation',
    'database fallback during Redis outage',
    'fault injection Upstash test',
  ],
  relatedSlugs: [
    'redis-cache-testing-guide',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'testing-lazy-neon-database-initialization-nextjs-build',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://upstash.com/docs/redis/sdks/ts/troubleshooting',
    'https://upstash.com/docs/redis/sdks/ts/developing',
  ],
  repoEvidence: [
    'packages/web/src/lib/cache.ts',
    'packages/web/src/app/api/leaderboard/route.ts',
    'packages/web/src/app/api/categories/route.ts',
  ],
  content: `Upstash Redis read outage testing should make Redis GET reject, then verify the cache helper returns a miss and calls the source once. If the database succeeds, the endpoint must return fresh data even when the later cache write also fails; source errors must still reach the endpoint.

This contract treats cache as a speed aid rather than the sole data source. Check the [leaderboard](/leaderboard) after route tests pass, but keep provider calls, source calls, and response data visible in the automated case.

## What Must Upstash Redis Read Outage Testing Prove?

Upstash Redis read outage testing must prove one full chain from provider fault to user response. The read error is caught, null marks a miss, the source fetch runs, cache set is attempted, and fresh data returns.

Repository evidence starts in packages/web/src/lib/cache.ts. The cacheGet function creates or reuses a client, awaits get, and returns null from a catch that handles any thrown read error.

The same null value represents an ordinary miss and missing Redis configuration. A caller cannot tell those causes apart from the cacheGet return alone.

cacheGetOrSet checks cached data with an explicit non-null test. Any non-null object returns at once, while null causes one call to the supplied fetcher.

After a fresh value arrives, cacheGetOrSet awaits cacheSet. The set helper catches its own provider fault, so a failed write resolves and the fresh value still reaches the caller.

The source fetcher has no catch inside cacheGetOrSet. If that work rejects after a cache read error, the source error continues to the route, which can return its normal failure response.

This difference matters. A cache fault is meant to fail open, but a database fault is not turned into an empty success by the shared helper.

Two real consumers show the route effect. packages/web/src/app/api/leaderboard/route.ts caches ranked skill data for 300 seconds, while packages/web/src/app/api/categories/route.ts caches grouped categories for 3,600 seconds.

Both route handlers catch a propagated source error and return status 500 with a route-specific body. Both should still return status 200 when only Redis read or write fails.

Use the [Redis cache testing guide](/blog/redis-cache-testing-guide) for broader key and expiry checks. This plan isolates read outage behavior so a correct warm hit cannot hide a broken fallback.

Upstash Redis read outage testing should record cache operation, source operation, status, data origin, and call counts. Those facts show whether the endpoint survived by design or simply returned a prepared mock.

## How Do You Build an Upstash Outage Fallback Test?

An Upstash outage fallback test needs a real cacheGetOrSet call with controlled Redis methods. If a test mocks cacheGetOrSet itself to return database data, it skips the catch and miss logic under review.

Set both Upstash environment values to harmless test strings before importing the module. The helper stores its client in module state, so reset modules before each client-behavior case.

Mock the Redis constructor to return get and set spies. Make get reject with a named test error, while the fetcher returns a small value whose IDs clearly come from the source.

Call cacheGetOrSet and assert that get ran once with the chosen key. Then assert the source ran once, set received the fresh value, and the resolved result equals that source value.

Do not assert a log for the shared read helper. Its catch is intentionally empty, so the evidence available here is branch behavior and call count, not a provider error message.

The first example tests the helper boundary. It gives both the failed read and the successful source a visible role in the result.

\`\`\`typescript
import { beforeEach, expect, it, vi } from 'vitest';

const redisGet = vi.fn();
const redisSet = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => ({ get: redisGet, set: redisSet })),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.UPSTASH_REDIS_REST_URL = 'https://cache.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
});

it('uses fresh source data after a Redis read rejection', async () => {
  redisGet.mockRejectedValueOnce(new Error('controlled read fault'));
  redisSet.mockResolvedValueOnce('OK');
  const fetcher = vi.fn().mockResolvedValue({ skills: [{ id: 'db-1' }] });
  const { cacheGetOrSet } = await import('@/lib/cache');

  const result = await cacheGetOrSet('leaderboard:all', fetcher, 300);

  expect(redisGet).toHaveBeenCalledWith('leaderboard:all');
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(redisSet).toHaveBeenCalledWith('leaderboard:all', result, { ex: 300 });
  expect(result).toEqual({ skills: [{ id: 'db-1' }] });
});
\`\`\`

Add a second case where set rejects. The result and fetch count should stay the same because cacheSet converts that write fault into a resolved nonfatal operation.

Add a warm control where get returns a non-null object. The fetcher and set spy should both remain unused, proving the test harness can observe the fast path too.

The [leaderboard cache article](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) covers filter-specific keys. Reuse one known key here, but keep ranking math outside the outage assertion.

An Upstash outage fallback test should restore environment values and module state after each run. A cached client from an earlier case can make later configuration changes appear ineffective.

Upstash Redis read outage testing also needs a no-configuration control. Remove either required environment value, expect no Redis constructor call, and prove each request still invokes its source.

## What Does a Redis GET Error Cache Miss Mean?

A Redis GET error cache miss means the helper maps a thrown read to the same null marker used for no stored value. It does not mean the provider returned a valid cached null document.

The explicit branch is important because cacheGetOrSet uses cached !== null. Empty arrays, empty objects, zero, false, and empty strings are all valid non-null hits under this generic helper.

Test doubles should match that rule. A truthy check would call the source for false or zero even though production would return those values from cache.

A rejection and a normal null response both produce one source call. The difference exists only in controlled setup or outside telemetry, because cacheGet does not return an error tag.

A timeout also counts as an error only when the SDK promise rejects. Do not make the test sleep until the whole job times out; reject a deferred promise through a short test-owned timer.

Use fake timers only around the timeout adapter you control. The cache helper itself sets no timeout, so claiming an internal timeout would add behavior not shown in the repository.

Malformed non-null data follows another path. The generic helper returns it as a hit because it performs no schema check, which means route or client validation must own any shape requirement.

Keep malformed data separate from a read outage. One is a successful provider response with bad shape, while the other is a thrown read that becomes null.

The [error handling guide](/blog/error-handling-testing-patterns) can help classify these paths. The Redis GET error cache miss case should still assert fresh source data, not a generic fallback message.

Upstash Redis read outage testing should include a valid empty cached result. That control proves the harness does not mistake an empty result for a provider fault.

## Cache Read Failure Graceful Degradation

Cache read failure graceful degradation means the endpoint preserves fresh data when the cache alone fails. It does not promise success when the source, serialization, or route logic also fails.

Start with read rejection plus source success. Expect one database call, one set attempt, a normal status, and a body built from the source rows.

Next use read rejection plus source rejection. Expect one database call, no set attempt, and the consumer route's known 500 body.

Then use read rejection, source success, and set rejection. Expect the same successful response as the first case, because cacheSet catches its own error.

After a failed set, make the next request miss again. It should call the source again, since the helper has no local value that can stand in for the failed remote write.

Do not promise stale data during this outage. The helper returns null on a read error and has no stale copy, so it goes to the source rather than serving a known old entry.

Do not promise retries either. packages/web/src/lib/cache.ts makes one get and one set attempt per call, with no retry loop visible in that file.

The official [Upstash troubleshooting page](https://upstash.com/docs/redis/sdks/ts/troubleshooting) documents SDK runtime and response issues. Use it for provider context, while keeping the repository catch behavior as the direct contract under test.

The [Upstash developing and testing page](https://upstash.com/docs/redis/sdks/ts/developing) describes an HTTP-compatible local option for CI and offline work. A local service can support integration checks, while method mocks remain best for exact fault timing.

Cache read failure graceful degradation should preserve response shape as well as status. Compare stable IDs, group names, filter values, and rank fields that the route normally returns.

Upstash Redis read outage testing should also track added source load. During a long cache outage, every request can reach the database, so call-count checks expose the cost of successful fallback.

## How Do You Verify Database Fallback During Redis Outage?

Database fallback during Redis outage should be tested through one real cached route after the helper unit case passes. The leaderboard is useful because its source query and cache key vary by filter.

Choose one filter, seed deterministic skills, and reject Redis get. Call the route with that filter and assert the database select chain executes exactly once.

Inspect the JSON response for the seeded IDs and filter. A status-only check can pass even when the route returns an unrelated prepared cache object.

Capture set input and confirm it matches the fresh route value before date serialization expectations become unclear. The leaderboard fetcher builds ranks and an updatedAt value before the helper writes.

The categories route offers a second consumer with a simpler fixed key. It groups source rows into testingType, framework, language, and domain arrays before cache storage.

Use only one consumer for the main outage case, then add a small contract case for the other. Duplicating every provider fault through both routes adds cost without testing new helper behavior.

The second example exercises the leaderboard route while the cache adapter calls its real fetcher. This route-level seam proves data comes from the database branch.

\`\`\`typescript
import { expect, it, vi } from 'vitest';
import { GET } from '@/app/api/leaderboard/route';
import { cacheGetOrSet } from '@/lib/cache';
import { db } from '@/db';

vi.mock('@/lib/cache', () => ({ cacheGetOrSet: vi.fn() }));
vi.mock('@/db', () => ({ db: { select: vi.fn() } }));

it('returns fresh leaderboard rows when the cache layer reports a miss', async () => {
  const sourceRows = [
    {
      id: 'db-skill-1',
      name: 'Fresh Source Skill',
      slug: 'fresh-source-skill',
      author: 'qa-user',
      installCount: 8,
      weeklyInstalls: 2,
      qualityScore: 90,
      testingTypes: ['api'],
      frameworks: [],
      verified: true,
      createdAt: new Date('2026-07-25T00:00:00Z'),
    },
  ];
  arrangeLeaderboardSelect(db.select, sourceRows);
  vi.mocked(cacheGetOrSet).mockImplementation(async (_key, fetcher) => fetcher());

  const response = await GET(new Request('http://test/api/leaderboard?filter=all'));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.skills[0].id).toBe('db-skill-1');
  expect(body.skills[0].rank).toBe(1);
  expect(body.filter).toBe('all');
  expect(db.select).toHaveBeenCalledTimes(1);
});
\`\`\`

This route example models the miss boundary, while the helper example proves a rejection becomes that miss. Keep both tests, because either one alone leaves part of the chain mocked away.

For categories, assert the fixed key and all four array names. A read outage should not change grouping, row membership, or the 3,600-second lifetime passed to the helper.

Use the [categories page](/categories) as a small end-user check after API assertions. UI output cannot reveal whether Redis failed or whether the database ran once.

Database fallback during Redis outage should have its own source-failure control. Make the route fetch reject and expect the repository 500 body, proving the cache test does not swallow all faults.

Upstash Redis read outage testing is complete only when call counts show fresh work. Correct-looking JSON from a stubbed cache value is not proof of database fallback.

## Fault Injection Upstash Test Design

A fault injection Upstash test should control one boundary at a time. Use get rejection, get timeout rejection, set rejection, malformed hit, source rejection, and recovery as distinct cases.

Give each injected error a short safe code. The shared helper does not log it, but the test report can still name the setup without exposing the Redis URL or token.

Use a deferred promise for timing-sensitive reads. Resolve it with cached data for recovery tests or reject it with the planned fault before the case-level timeout.

Never point a destructive fault test at production Redis. Use method mocks, a local compatible service, or a test-only database with short-lived keys.

When parallel workers share a test cache, add the worker ID to every key. Exact keys prevent one worker's warm value from turning another worker's outage case into a hit.

Test recovery after the fault. Make the next get return the value saved by a later healthy request, then assert the source no longer runs.

If the failed set stored nothing, recovery needs one healthy miss and set before a hit is possible. Model that three-request sequence rather than jumping from failed write straight to warm cache.

Include an unconfigured state, but label it separately from outage. No client is created when either required environment value is missing, while an outage begins with a configured client whose operation rejects.

The [lazy database initialization article](/blog/testing-lazy-neon-database-initialization-nextjs-build) covers another module-state boundary. The same reset discipline helps here because the Redis client is stored outside request functions.

A fault injection Upstash test should print key label, fault type, get count, source count, set count, status, and result source. That compact record makes branch mistakes clear.

Upstash Redis read outage testing must avoid retries that the application does not own. SDK settings may change, but this repository helper exposes only its final resolved value or rejection.

### CI outage evidence card

- Test key includes the run and worker IDs for safe split work
- Redis mode says configured unconfigured warm miss read fault or write fault
- GET plan names returned null returned value rejected call or timed rejection
- Source plan names success or rejection plus the exact expected call count
- SET plan names skipped success or caught fault plus the saved key
- Response proof lists status stable row IDs filter and safe data source
- Warm control returns a non-null value with no source or SET call
- Empty value control proves false zero empty list and empty object remain hits
- Read fault control proves one fresh fetch and one later SET attempt
- Write fault control proves fresh data still reaches the route response
- Source fault control proves no SET call and the known endpoint error body
- Recovery control stores one healthy miss then serves one warm cache hit
- Module cleanup clears the stored client mocks timers and environment values
- [Cache guide](/blog/redis-cache-testing-guide) checks remain separate from this one read fault
- [Leaderboard checks](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) retain their filter and rank rules
- [Category checks](/categories) retain four groups while the provider read fails

## Cache Failure, Source Outcome, and Response Matrix

The matrix states the current cache-aside behavior. Endpoint status assumes the consumer maps source failure to its repository 500 response.

| Cache read | Source fetch | Cache write | Fetcher calls | Endpoint outcome | Expected data source |
|---|---|---|---|---|---|
| Non-null hit | Not called | Not called | 0 | 200 | Cached value |
| Normal null miss | Succeeds | Succeeds | 1 | 200 | Fresh source |
| GET rejection | Succeeds | Attempted | 1 | 200 | Fresh source |
| GET timeout rejection | Succeeds | Attempted | 1 | 200 | Fresh source |
| GET failure plus source failure | Rejects | Not called | 1 | 500 | Route error |
| SET failure after fresh fetch | Succeeds | Rejected and caught | 1 | 200 | Fresh source |

The hit row must include empty but valid values in a control. This confirms the explicit non-null check rather than a truthy substitute.

The normal miss and GET rejection rows share the same downstream path. Their setup differs, but both should call the source once and then attempt storage.

The timeout row should use a test-owned rejection deadline. Hanging the provider promise until the test runner kills the case gives no chance to inspect fallback.

The source-failure row is a guard against hiding database outages. No set call should occur because cacheGetOrSet never receives a fresh value.

The set-failure row should compare its response with a clean miss response. Both bodies should match on stable fields even though only one cache write succeeds.

Use the [error handling guide](/blog/error-handling-testing-patterns) to keep cache and source failures distinct. A single expected 500 for all rows would reverse the intended fail-open rule.

Upstash Redis read outage testing should run this matrix at helper level and select two rows at route level. That split gives precise faults plus confidence in real endpoint behavior.

## How Do You Run the Redis Outage Procedure?

Run the outage procedure with a fresh module and one test-owned key. Keep source rows fixed so only cache state changes across the sequence.

1. Seed deterministic database data for a leaderboard or categories consumer and confirm its clean source response.
2. Configure a test Redis client, then stub GET to reject with one controlled read fault.
3. Call the endpoint and assert its source query runs exactly once while the response returns fresh data.
4. Stub the following SET to reject and prove the endpoint body and status remain unchanged.
5. Restore healthy GET and SET behavior, run one miss that stores data, and capture the saved value.
6. Return that saved value on the next request and assert the source query no longer runs.

At step one, use stable IDs and values. Avoid snapshots of updatedAt when the route creates it during each fresh fetch.

At step two, verify the client was configured before import. Otherwise, the test may exercise the no-client branch rather than a configured provider outage.

At step three, inspect both source count and response body. These assertions prove the request survived by fetching data, not by using an old mock.

At step four, clear earlier set results before rejection. A prior successful mock value can make a failed-write case appear stored when it was not.

At step five, capture the exact object passed to set. Return that same object from get so the warm assertion follows the actual stored shape.

At step six, require zero new database calls and zero new set calls. A warm hit should return at once without refreshing the value.

Run a source-failure case after the main sequence with fresh mocks. It should return the route's 500 body and make no cache set attempt.

The [QA skills catalog](/skills) offers cache and resilience testing skills for this procedure. Keep CI secrets masked, and never print the REST token in a failed assertion.

Upstash Redis read outage testing should finish with all environment values, spies, timers, and module instances restored. Clean state prevents one provider fault from changing unrelated tests.

## Frequently Asked Questions

### Should every Redis read error become a cache miss?

That is the current repository contract because cacheGet catches any thrown read error and returns null. The test should prove that behavior without claiming all systems should use it. Teams may choose stricter rules for data where stale or missing cache state is unsafe.

### Why test read and write failures separately?

A read failure decides whether the source fetch runs, while a write failure occurs only after fresh data already exists. The helper catches both, but their call counts and next-request effects differ. Separate cases identify which provider operation changed and what load follows.

### Does graceful degradation serve stale data?

No stale copy is visible in this helper. When GET throws, cacheGet returns null and cacheGetOrSet asks the source for fresh data. If that source also fails, the error reaches the consumer route rather than returning a hidden stale object.

### What happens when the database also fails?

The source rejection propagates because cacheGetOrSet does not catch fetcher errors. The leaderboard and categories routes then return their known 500 JSON bodies. Assert no cache set call, since there is no fresh value to save after the source failure.

### How should timeouts be injected?

Use a deferred GET promise that rejects after a short test-owned timer, then allow enough case time for fallback assertions and cleanup. Do not wait for the entire test timeout. The repository helper defines no timeout itself, so keep ownership clear.

### What proves Redis recovery?

After the fault, run a healthy miss that fetches and stores one exact value. Make the next GET return that value, then assert zero source and SET calls. This sequence proves both recovery and the warm path without assuming a failed write saved data.

## Conclusion

Upstash Redis read outage testing proves cache failure remains an optimization fault when the source is healthy. Inject the GET rejection, count the database call, inspect fresh response data, test nonfatal SET failure, and keep source errors visible.

Browse [cache and resilience testing skills](/skills) and add controlled Redis fault injection to the next CI run. Keep one warm control beside each fault suite so source call counts stay credible.`,
};
