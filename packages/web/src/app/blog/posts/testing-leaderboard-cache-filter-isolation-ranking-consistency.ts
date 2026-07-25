import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Leaderboard Cache Consistency Testing',
  description:
    'Leaderboard cache consistency testing verifies per-filter cache keys, ranking order, limits, cache hits, expiry, failure fallback, and uncached parity.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'leaderboard cache consistency testing',
  keywords: [
    'leaderboard cache consistency testing',
    'leaderboard cache key isolation',
    'ranking filter consistency',
    'Upstash cache hit test',
    'cache expiry integration test',
    'leaderboard sort assertion',
    'cache failure fallback',
    'cached API parity',
  ],
  relatedSlugs: [
    'testing-lazy-neon-database-initialization-nextjs-build',
    'testing-typesense-multiselect-facet-filter-queries',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'testing-versioned-zip-artifact-sha256-etag',
  ],
  sources: [
    'https://upstash.com/docs/redis/tutorials/nextjs_with_redis',
    'https://upstash.com/docs/redis/sdks/ts/commands/string/set',
    'https://redis.io/docs/latest/commands/expire/',
  ],
  content: `
Leaderboard cache consistency testing compares fresh and cached responses for all, trending, hot, and new rankings. Verify isolated keys, one database read per miss, a 300-second TTL, filter-specific order, fifty-row limits, cache-hit timestamps, expiry refresh, read and write failure fallback, and stable response fields across both paths.

The QASkills leaderboard route wraps each ranking query with \`cacheGetOrSet\`. Its key includes the requested filter, and the cached value contains ranked skills, the filter label, and an update time. Tests must protect both ranking logic and cache behavior because either layer can return a plausible but wrong list.

## Why Does Leaderboard Cache Key Isolation Matter?

Leaderboard cache key isolation prevents one ranking mode from serving another because QASkills builds \`leaderboard:\${filter}\` for each mode. A test should capture every key passed to the cache helper.

Start with two filters that produce clearly different first rows, then warm \`all\` before requesting \`new\`. If the second response repeats the install ranking without a database call, the keys collided or the mock ignored its key argument.

Use full key assertions rather than checking only a prefix because \`leaderboard:hot\` and \`leaderboard:new\` share one namespace. The suffix is the part that protects product meaning.

| Filter | Cache key | Primary ranking | Current tie handling |
| --- | --- | --- | --- |
| all | \`leaderboard:all\` | install count descending | No explicit tie-breaker |
| trending | \`leaderboard:trending\` | weekly installs descending | creation time descending |
| hot | \`leaderboard:hot\` | 70% installs plus 30% quality | No explicit tie-breaker |
| new | \`leaderboard:new\` | creation time descending | No explicit tie-breaker |

The key also controls invalid filter behavior. An unknown value reaches the default all-time query, but it is cached under its unknown suffix and returned as the response filter. Write a test that exposes this current behavior, then decide whether the route should reject or normalize unsupported values.

Leaderboard cache consistency testing should not treat unknown keys as approved because normalization affects cache entries, response labels, and clients. Add a failing contract case before changing that behavior.

The current code has no cache namespace version, so a response-shape change can meet an older entry for five minutes. Add a test fixture that lacks one new field and decide whether clients tolerate that overlap. A versioned prefix can force clean separation when compatibility is not safe.

The route also has no write-side leaderboard invalidation after install counters change. Freshness therefore depends on expiry rather than a direct delete. A clock-based test should prove that stale data lasts no longer than the stated policy.

The [leaderboard page](/leaderboard) is the public view of these lists. Pair route evidence with one browser check that switches filters and sees different URL state plus rows. The verified [Playwright CLI skill](/skills/Pramod/playwright-cli) can run that flow after deployment.

## How Do You Prove Ranking Filter Consistency?

Ranking filter consistency starts with a fixture whose metrics make each mode choose a different winner. Give one old skill many installs, one recent skill high weekly installs, one new skill a low count, and one balanced skill a strong weighted score. Avoid tied values in the first table.

The all filter orders by total installs, while trending uses weekly installs and then creation time. New orders by creation time, while hot uses \`installCount * 0.7 + qualityScore * 0.3\`.

Calculate hot scores in the fixture expectation instead of copying response order, and show each score in concise failure output. Keep integer values simple enough for a reviewer to verify by hand.

\`\`\`ts
const leaderboardFixture = [
  {
    slug: 'install-leader',
    installCount: 100,
    weeklyInstalls: 4,
    qualityScore: 70,
    createdAt: new Date('2026-01-10T00:00:00Z'),
  },
  {
    slug: 'weekly-leader',
    installCount: 25,
    weeklyInstalls: 40,
    qualityScore: 82,
    createdAt: new Date('2026-06-10T00:00:00Z'),
  },
  {
    slug: 'new-leader',
    installCount: 5,
    weeklyInstalls: 3,
    qualityScore: 88,
    createdAt: new Date('2026-07-24T00:00:00Z'),
  },
  {
    slug: 'hot-leader',
    installCount: 90,
    weeklyInstalls: 7,
    qualityScore: 100,
    createdAt: new Date('2026-03-10T00:00:00Z'),
  },
];
\`\`\`

Assert rank values are rebuilt from one through the row count because the route adds \`rank: i + 1\`. A cached result must preserve those same rank numbers rather than recompute them against another order.

Leaderboard cache consistency testing should check selection fields because each row includes identity, author, metrics, arrays, verification, and ISO time. It should not expose full skill content.

Build one row with two testing types and two frameworks, then assert array order survives the route mapper. The cache should return those arrays as stored values rather than strings or object keys. This small case catches JSON serialization drift without using a large snapshot.

The route removes the database Date object and writes \`createdAt.toISOString()\` into each result. Freeze fixture dates with a UTC suffix, then compare exact output strings. Invalid date objects should fail near the mapper instead of entering a cached response.

Use the [offset pagination regression guide](/blog/testing-offset-pagination-duplicate-records) as a reminder that a non-unique sort can move tied rows. This route limits rather than paginates, but an unstable tie near row fifty can still change membership. Add an explicit ID or another unique tie-breaker if stable ties are a product rule.

## How Do You Build an Upstash Cache Hit Test?

An Upstash cache hit test warms one key, changes the database fixture, then requests the same filter before expiry. The second response should match the cached object, and the database query should not run again. This proves the hit path, not just successful serialization.

At unit level, mock \`cacheGetOrSet\` and invoke its fetcher only on the miss you choose. At integration level, use a dedicated Upstash database or an in-memory Redis-compatible test double that implements GET, SET with expiry, and DEL.

The official [Upstash Next.js tutorial](https://upstash.com/docs/redis/tutorials/nextjs_with_redis) shows client setup and request use. QASkills creates its client only when both URL and token exist. When either value is missing, cache reads return null and cache writes do nothing.

\`\`\`ts
it('reuses the cached leaderboard for the same filter', async () => {
  const query = vi.fn().mockResolvedValueOnce(rowsForAll);
  mockLeaderboardSelect(query);

  const first = await GET(new Request('http://test.local/api/leaderboard?filter=all'));
  const firstBody = await first.json();
  const second = await GET(new Request('http://test.local/api/leaderboard?filter=all'));
  const secondBody = await second.json();

  expect(secondBody).toEqual(firstBody);
  expect(query).toHaveBeenCalledTimes(1);
  expect(firstBody.filter).toBe('all');
  expect(firstBody.skills[0].rank).toBe(1);
});
\`\`\`

The exact mock design depends on where the test draws its boundary; real-helper tests must reset the private Redis client through module isolation. If the helper is mocked, add separate tests for \`cacheGet\`, \`cacheSet\`, and \`cacheGetOrSet\`.

Leaderboard cache consistency testing should inspect \`updatedAt\` on a hit. Because that value is inside the cached object, two hit responses should keep the same timestamp. A fresh response after expiry should receive a later timestamp.

The Redis client itself is held in module scope after its first configured use. Changing URL or token variables later does not replace that client inside the same module. Reset modules between configuration cases so one test cannot keep another test's provider state.

Cached null has special meaning in \`cacheGetOrSet\` because null is treated as a miss. Leaderboard responses are objects, so they never use null as valid data. Keep one helper-level case to make that assumption clear if generic cache users expand.

Do not place real tokens in test source. Service-backed runs should use a dedicated short-lived secret from CI and a unique key prefix. Delete test keys after the run so one job cannot warm another job's case.

## How Do You Add a Cache Expiry Integration Test?

A cache expiry integration test proves the five-minute policy rather than sleeping for five real minutes. At unit level, use fake timers around a Redis test double that tracks expiry. At service level, call the cache helper with a shorter test TTL when possible and verify the next read after expiry returns null.

The leaderboard route passes \`300\` seconds explicitly to \`cacheGetOrSet\`. The helper then calls \`cacheSet\`, which sends \`{ ex: ttlSeconds }\` to Upstash. Assert both values so a route refactor cannot drop the policy or swap units.

The [Upstash SET command guide](https://upstash.com/docs/redis/sdks/ts/commands/string/set) documents the \`ex\` option used by the TypeScript SDK. Redis defines expiration in seconds for the EX form, while its [EXPIRE command reference](https://redis.io/docs/latest/commands/expire/) describes key timeout behavior.

\`\`\`ts
it('refreshes leaderboard data after 300 seconds', async () => {
  vi.useFakeTimers();
  const query = vi
    .fn()
    .mockResolvedValueOnce(rowsForAll)
    .mockResolvedValueOnce(updatedRowsForAll);
  mockLeaderboardSelect(query);

  const first = await getAllLeaderboard();
  await vi.advanceTimersByTimeAsync(299_000);
  expect(await getAllLeaderboard()).toEqual(first);

  await vi.advanceTimersByTimeAsync(1_001);
  const refreshed = await getAllLeaderboard();

  expect(query).toHaveBeenCalledTimes(2);
  expect(refreshed.skills[0].slug).toBe('new-install-leader');
  vi.useRealTimers();
});
\`\`\`

If the test uses real Upstash, allow a small clock margin and poll with a fixed deadline instead of one exact millisecond. The unit test owns exact conversion; the service test proves the key eventually leaves.

Leaderboard cache consistency testing should also verify that a cache hit does not extend TTL. The current helper reads without writing on a hit, so expiration remains based on the original SET. If sliding expiry is desired later, that requires an explicit write and a new test.

Two requests can miss the same empty key at once because the helper has no lock or shared in-flight promise. Both calls may query PostgreSQL and set the same value. A concurrency case should record this current cost without claiming the helper prevents a cache stampede.

If duplicate source reads become costly, add coordination behind a separate design and test its failure release path. Do not weaken ranking checks just because two valid fresh responses arrived. The public values may match even while call-count evidence exposes extra work.

Store a versioned response shape or clear the namespace when fields change because old objects can outlive deployment for five minutes. A compatibility test should show whether clients can accept that brief overlap.

## How Do You Write a Leaderboard Sort Assertion?

A leaderboard sort assertion compares the full slug order for each filter, then checks rank numbers. Use distinct values first, followed by a tie-focused case. This split shows whether the main formula or the tie rule caused a failure.

For hot ranking, calculate \`0.7 * installCount + 0.3 * qualityScore\` because QASkills orders that PostgreSQL expression descending. Do not replace the route expectation with a different normalization of scores.

Trending has a second sort on creation time, so equal weekly counts should put the newer row first. The other current filters lack an explicit second sort. A test with equal installs, equal hot scores, or equal creation times may reveal database-dependent order.

Treat that tie result as a finding rather than a flaky test to retry, then add a unique sort when stable membership matters. If ties may be unordered, compare sets for tied groups and document that public ranks can shift.

The route always limits the selected rows to fifty. Seed fifty-one entries with a clear last-place row and verify response length plus membership. Then create a tie at the cutoff to expose whether the product needs deterministic inclusion.

Leaderboard cache consistency testing should repeat each sort once with the cache empty and once from a hit. A correct database order stored under the wrong key is still a cache defect. A correct key holding wrong order is still a ranking defect.

Select fields are fixed before the sort switch, so every filter should expose one shared row shape. Add a key-set assertion across all four responses, then keep formula assertions separate. This catches a later filter branch that selects too much or omits a field.

The hot expression combines an install count with a zero-to-one-hundred quality score without prior scaling. Test the exact repository formula, even if another weighting might seem better. Product math changes need reviewed expectations and fresh cached values.

Use clear fixture names such as \`all-first\`, \`trend-first\`, and \`new-first\`. The [Redis cache testing guide](/blog/redis-cache-testing-guide) covers broader cache patterns, while this assertion stays tied to the four leaderboard formulas.

## How Do You Test Cache Failure Fallback?

Cache failure fallback means a read error behaves like a miss and a write error does not erase a valid fresh response. QASkills catches errors inside \`cacheGet\` and \`cacheSet\`. The database fetch remains outside those catches and can still fail.

Create separate cases for rejected GET, rejected SET, missing configuration, and a rejected database query; the first three still return fresh data. The database failure should reach the route catch and return status 500 with \`Failed to fetch leaderboard\`.

\`\`\`ts
it.each(['read rejection', 'write rejection', 'no cache config'])(
  'returns fresh data after %s',
  async (mode) => {
    configureCacheFailure(mode);
    mockLeaderboardRows(rowsForTrending);

    const response = await GET(
      new Request('http://test.local/api/leaderboard?filter=trending'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.filter).toBe('trending');
    expect(body.skills.map((skill: { slug: string }) => skill.slug)).toEqual(
      expectedTrendingOrder,
    );
  },
);
\`\`\`

The fallback is fail-open for cache availability, not for source data. Do not return an old value after its validity is unknown unless stale-cache behavior is designed and tested. The current helper either returns the cached value it can read or queries the database.

Leaderboard cache consistency testing should confirm that cache error details do not enter the JSON body. Operations teams still need logs or metrics, but user responses should keep the stable leaderboard contract. Add observability checks in the integration environment without matching private provider messages.

Missing Upstash variables are a supported local path in QASkills. That case should not log a failure or create a client. It should query the database on every request and return the same public shape.

Test read failure before write failure because a failed read still calls the fetcher and then attempts storage. A failed write returns the fresh object after that attempt. Call counts should show these paths without coupling assertions to private provider errors.

The route catch hides the thrown database message from clients, which keeps the JSON contract small. A logger or metric can retain server detail for operators. The [API testing guide](/blog/api-testing-complete-guide) can extend status and observability checks around this endpoint.

## How Do You Measure Cached API Parity?

Cached API parity means a hit returns the same public fields and values as the miss that filled it. Compare status, filter, update time, row order, ranks, arrays, numbers, booleans, and ISO dates. Do not compare object identity across HTTP serialization.

Start with deep equality for immediate miss and hit responses, then parse each date and confirm it remains a string after storage. Redis clients may serialize values for transport, so typed fields deserve direct assertions.

After expiry, compare response schema rather than exact values because database data and \`updatedAt\` may have changed. A schema guard can assert keys and types while ranking checks own the new content.

Leaderboard cache consistency testing should test all four filter keys, not only all-time. One value may include a SQL number conversion or date pattern that another does not. The response mapper is shared, but each query can return different ordered rows.

Unknown filter behavior belongs in this parity suite as a negative case. Today, \`filter=weekend\` runs the all-time sort, returns \`filter: "weekend"\`, and caches under \`leaderboard:weekend\`. That is internally consistent but may be an invalid public contract.

Use the [QASkills directory](/skills) to compare skill metadata with leaderboard rows during a smoke test. The leaderboard intentionally carries a smaller view, so parity means cache-to-fresh equality, not equality with every skill detail field.

Check response headers only if the route sets a cache policy. The current route relies on its server-side Redis helper and does not add a browser cache header. Do not invent CDN behavior in this test.

Serialize one response through JSON before storing it in an in-memory double, then parse it on read. This better matches a remote cache than returning the same object reference. It can reveal Date, undefined, or prototype assumptions hidden by a simple map.

Run the same parity case in the web package's post-flow suite after route changes. The [CI/CD pipeline guide](/blog/cicd-testing-pipeline-github-actions) shows how to keep unit, integration, and browser evidence in distinct jobs. Clear layers make cache regressions faster to place.

## Run the Leaderboard Cache Consistency Testing Procedure

Run cache and ranking cases with fixed time, isolated keys, and controlled database rows. Start without network services, then repeat the core miss-hit-expiry path against a dedicated Redis instance. This order keeps feedback fast and failure scope small.

1. Freeze time, insert ranking fixtures with distinct winners, and clear all four leaderboard keys.
2. Request each filter once, assert its key, database order, row limit, rank values, and response fields.
3. Request each filter again and prove the response is equal while database call counts stay unchanged.
4. Advance time to just before 300 seconds, confirm a hit, then pass expiry and confirm one fresh query.
5. Reject cache GET and SET separately, then prove fresh data still reaches the response.
6. Remove Upstash configuration and prove each request uses the database without changing JSON shape.
7. Reject the database query and verify the route returns its defined 500 error instead of cache success.
8. Add tie cases for every ranking mode and record missing or approved tie-break rules.
9. Switch filters in a browser and verify row labels, ranks, and selected state match route responses.

Leaderboard cache consistency testing should delete its service keys even after assertion failure. Use a run ID in the prefix if the helper can accept one in test. If the production key is fixed, point tests at an isolated database that can be cleared safely.

Save miss, hit, and refresh timings for diagnosis, while a separate benchmark tracks latency without brittle functional limits. Functional checks own keys, calls, values, expiry, and errors.

Review the test whenever a new ranking filter is added. The change needs a cache key, formula, fixture winner, tie rule, TTL expectation, and browser state. Leaving one item out creates a mode that looks available but lacks release evidence.

## Keep Rankings and Cached Values Aligned

Leaderboard cache consistency testing gives each filter one isolated key and one verified ranking rule. It proves hits avoid duplicate database work, expiry refreshes data, cache faults fall back to the source, and every path returns the same public shape.

Keep the route suite near the cache helper, then review the broader [Redis cache testing guide](/blog/redis-cache-testing-guide). Find more test automation assets in the [QASkills directory](/skills), and install the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) for the post-deploy filter switch.

Do not hide tied rows or unknown filters behind loose assertions. Record their current behavior, make a product choice, and lock the result with clear tests. That approach keeps ranks explainable even when cache and database code change together.

## Frequently Asked Questions

### Why does each leaderboard filter need its own key?

Each filter applies a different ranking rule and can produce a different first row. A shared key could serve total-install order for a trending request or recent order for hot. The filter suffix keeps cached meaning aligned with the request and makes invalid values visible.

### Should a cache hit change updatedAt?

Not with the current QASkills design. The timestamp is created inside the fetcher and stored with the response, so repeated hits keep it unchanged. A later miss after expiry creates a new value. Tests should distinguish cache age from the current wall clock.

### What happens if Upstash is not configured?

The cache helper returns null for reads and does nothing for writes when either required variable is missing. The route still queries PostgreSQL and returns normal leaderboard JSON. Local and preview tests should cover this supported no-cache path without requiring fake provider secrets.

### Does cache fallback hide database failures?

No. Cache read and write errors are caught, but the fresh database fetch is not swallowed by the helper. If that query fails, the route catches the error and returns its defined server error. Tests should keep cache faults and source faults separate.

### Is the current ranking order stable for tied rows?

Only trending has a documented second order by creation time, and equal values can still tie. All, hot, and new lack an explicit unique tie-breaker. Use distinct fixtures for formula checks, add tie cases, and decide whether stable public ranks require a final unique sort.

### How often should leaderboard cache consistency testing run?

Run unit cases on each route or cache change. Run Redis-backed expiry and serialization checks for cache client updates and every release branch candidate. Keep one browser check for filter switching, labels, ranks, and row order after deployment on every production release.
`,
};
