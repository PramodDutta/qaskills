import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'trending leaderboard recency tie testing',
  description:
    'Use trending leaderboard recency tie testing to prove newer skills win equal weekly-install counts and expose unresolved timestamp ties in CI.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'trending leaderboard recency tie testing',
  keywords: [
    'trending leaderboard recency tie testing',
    'weekly installs recency tiebreaker',
    'trending rank same count test',
    'createdAt secondary sort QA',
    'new skill trending order',
    'leaderboard residual tie test',
  ],
  relatedSlugs: [
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'database-testing-automation-guide',
    'api-testing-complete-guide',
    'redis-cache-testing-guide',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/queries-order.html',
    'https://orm.drizzle.team/docs/select',
  ],
  repoEvidence: [
    'packages/web/src/app/api/leaderboard/route.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/web/src/lib/cache.ts',
  ],
  content: `Trending leaderboard recency tie testing proves that equal weekly-install counts are sorted by creation time, newest first. Seed fixed counts and times, clear the trending cache, then assert IDs and ranks in order. When both fields match, repeat the request and report the missing unique final key instead of claiming stable order.

The rule is visible in \`packages/web/src/app/api/leaderboard/route.ts\`. Its trending branch orders by \`weeklyInstalls\` descending, then \`createdAt\` descending, limits the result to fifty rows, and assigns ranks from the returned array index.

Both fields live in \`packages/web/src/db/schema/skills.ts\`, while \`packages/web/src/lib/cache.ts\` stores each fresh result for 300 seconds. A sound rank test must therefore own both fixture time and cache state.

Use the [leaderboard cache isolation guide](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) for filter-key checks. This guide focuses on equal weekly counts, newer rows, and exact residual ties.

## What Must Trending Leaderboard Recency Tie Testing Prove?

Trending leaderboard recency tie testing must prove the full ordered key used by the trending branch. Higher weekly installs win first, and a newer creation time wins only when those counts are equal.

The primary-key control needs at least two different counts. A skill with twelve weekly installs must rank above one with eleven even when the lower-count skill is newer.

The secondary-key case needs equal counts and distinct times. The newer skill must receive the smaller rank number, which means it appears earlier in the response array.

Three tied rows are better than a pair. They show a complete descending time order and make an accidental insertion-order pass less likely.

An exact tie needs separate wording. When count and creation time both match, the route supplies no unique third expression, so the relative order is not promised by this code.

The test should not invent an ID sort that the query lacks. Instead, run the exact-tie fixture as a characterization case and mark a unique final key as required if stable ranks are a product need.

Rank values must remain contiguous after sorting. The first returned row has rank one, the next rank two, and no gap should appear through the limited list.

The route converts each creation date to an ISO string after the query. Assert order by IDs first, then verify time serialization so display mapping cannot hide a database order defect.

Test only the \`trending\` filter for this two-key rule. The \`all\`, \`hot\`, and \`new\` branches use different expressions and need their own contracts.

Use the [API testing guide](/blog/api-testing-complete-guide) for shared response checks. Keep the trend-specific oracle clear: count descending, time descending for equal counts, then no claimed order for an exact tie.

## How Does the Weekly Installs Recency Tiebreaker Work?

The weekly installs recency tiebreaker is the second ORDER BY expression in the trending query. PostgreSQL compares it only after two rows have the same weekly count.

Seed three skills with seven weekly installs and times one minute apart. Insert them in a different order from their timestamps so insertion sequence cannot satisfy the assertion by accident.

Request \`/api/leaderboard?filter=trending\` and select those three IDs from the returned list. Their order should be newest, middle, oldest, even when other fixture rows occupy ranks between tests.

For a stronger isolated run, give the tied group a count above all shared data. That puts them at the top and makes expected ranks one through three.

Keep time values in UTC and create them through explicit dates. Relative phrases such as "now minus one minute" can drift across slow setup and produce a different order than the test name implies.

Use gaps larger than the database timestamp precision in the main case. A one-second gap is easy to read and avoids a driver truncating smaller units.

Then add a precision case with closer values only if the selected database and driver preserve them. The test report should print stored values read back from PostgreSQL, not just JavaScript inputs.

The [PostgreSQL sorting documentation](https://www.postgresql.org/docs/current/queries-order.html) explains that later sort expressions resolve rows equal on earlier expressions. It also warns that output order is not assured without an order that fully decides it.

The route's rank mapping runs after SQL returns rows. If the array order is correct, ranks should follow without another sort; if ranks differ, the mapping layer has changed.

The [Drizzle select documentation](https://orm.drizzle.team/docs/select) shows ordered query construction with \`orderBy\`. The route uses that query API for both descending expressions before it maps ranks.

Open the live [leaderboard](/leaderboard) only after API assertions pass. A browser check can then confirm the top tied names appear in the same order seen in JSON.

Trending leaderboard recency tie testing should save the controlled ID, count, stored time, and returned rank for each tied row. Those four facts show which sort level failed.

## What Is a Trending Rank Same Count Test?

A trending rank same count test isolates the secondary key by giving several rows one weekly-install value. It fails if the response follows insert order, UUID order, or any time direction other than newest first.

Create three skills named for their intended age, but do not use names as the oracle. IDs and stored timestamps are the reliable facts, while labels exist only to make failure output readable.

Insert the oldest row last and the newest row first. This setup makes a hidden insertion-order dependency produce the reverse of the expected time order.

Read the rows back before calling the API. Confirm that all weekly counts match and all creation times differ, because a broken fixture cannot prove a tie rule.

Clear \`leaderboard:trending\` after setup. Otherwise a prior response can omit the new rows and make the order assertion fail before SQL runs.

The result has a fifty-row limit. Put the tie group well inside that boundary for the core test, then use a separate boundary case for rows near rank fifty.

Compare the ordered ID subsequence, not just the rank of one row. One correct winner cannot prove the rest of the tied group is in descending order.

Also assert that each returned rank equals its one-based array position. That check catches any later change that calculates rank before filtering or mapping.

\`\`\`typescript
import { expect, test } from 'vitest';
import { cacheDel } from '@/lib/cache';

test('sorts equal weekly counts by createdAt descending', async () => {
  const fixtures = await seedSkills([
    { label: 'newest', weeklyInstalls: 21, createdAt: new Date('2026-07-25T09:00:03Z') },
    { label: 'oldest', weeklyInstalls: 21, createdAt: new Date('2026-07-25T09:00:01Z') },
    { label: 'middle', weeklyInstalls: 21, createdAt: new Date('2026-07-25T09:00:02Z') },
  ]);
  await cacheDel('leaderboard:trending');

  const body = await callLeaderboard('trending');
  const ids = body.skills.map((skill: { id: string }) => skill.id);

  expect(ids.slice(0, 3)).toEqual([
    fixtures.newest.id,
    fixtures.middle.id,
    fixtures.oldest.id,
  ]);
  expect(body.skills.slice(0, 3).map((skill: { rank: number }) => skill.rank)).toEqual([1, 2, 3]);
});
\`\`\`

Use the [database automation guide](/blog/database-testing-automation-guide) for run-specific fixture cleanup. Remove rows by a unique test prefix so old skills cannot enter a later top-fifty list.

## CreatedAt Secondary Sort QA

CreatedAt secondary sort QA covers direction, time zones, precision, null policy, and equal values. The schema makes \`createdAt\` non-null with a default, so null ordering is not a normal production case.

Start with clear UTC timestamps and equal counts. The largest instant must appear first, regardless of the order used to insert the rows.

Then use two ISO inputs that represent the same instant with different offsets. After storage, they should compare equal, so this case belongs to residual-tie analysis rather than recency direction.

Read stored timestamps back before testing the endpoint. This confirms whether the driver or column precision changed values that looked distinct in application setup.

Use a millisecond case only when the database retains that difference. If both values become equal, the test should state that precision collapsed the fixture and avoid a false claim about sort direction.

The schema's default time is useful for normal writes but poor for a tie fixture. Two fast inserts can receive close or equal values, so set creation times explicitly through a controlled database helper.

Do not sort response timestamps in the test and compare that rebuilt list with itself. Compare the API's original ordered IDs with IDs sorted from independent stored fixture facts.

The route strips \`createdAt\` from each row and then adds its ISO form. Confirm that this mapping does not change the row order or lose the instant.

A timezone test should compare numeric instants, not display text. Two strings with different offsets may describe one moment and therefore cannot establish which row is newer.

Use the [Postgres migration guide](/blog/postgres-migration-testing-guide) when timestamp type or precision changes. Keep these fixtures across migrations because a column rewrite can turn distinct ties into exact ones.

Trending leaderboard recency tie testing should print both input and stored times for a precision failure. That short report separates database storage from ORDER BY behavior.

## How Do You Assert New Skill Trending Order?

New skill trending order is asserted only after its weekly count ties with a peer. A newly created row does not outrank a higher weekly count merely because its timestamp is recent.

Seed an old skill with ten weekly installs and a new skill with nine. The old skill must remain above the new one because the primary expression decides their order.

Next, set both counts to ten while preserving their times. The new skill should now move above the old one because the secondary expression is reached.

This paired test makes the precedence visible. It prevents a mistaken implementation that sorts by creation time first and uses weekly installs only afterward.

Compare the trending branch with the \`new\` filter as a negative control. The new branch orders by creation time alone, so its result may differ whenever counts differ.

The \`all\` branch orders by lifetime installs, and the \`hot\` branch uses a weighted formula. Neither branch promises the weekly-count recency rule described here.

Clear each filter's own cache key before comparison. Clearing only trending can leave stale control responses and make a valid branch difference look like a sort failure.

The cache helper returns null when Redis is not configured, which makes local runs fetch fresh data. Do not assume that local behavior proves cache invalidation in an environment with Upstash enabled.

Use the [Redis cache testing guide](/blog/redis-cache-testing-guide) for hit, miss, and expiry checks. This rank test should force a miss so it reaches the database sort.

After the response arrives, assert the \`filter\` field is \`trending\`. A typo or unsupported value falls through to the default branch, which is also trending today, but an explicit field still documents request interpretation.

Trending leaderboard recency tie testing should keep filter comparisons in separate assertions. The core result is the tied pair's order, not whether all four lists happen to match.

## Leaderboard Residual Tie Test

A leaderboard residual tie test gives two rows the same weekly installs and exactly the same stored creation time. It proves that the current query has no stated unique final tiebreaker.

Insert both rows, clear the cache, and request trending several times through fresh database reads. Record their relative order without requiring it to flip, because nondeterminism does not guarantee visible variation in one plan.

A stable result on one server does not create a contract. The database may return the same physical order until a plan, index, vacuum state, or data layout changes.

Do not write an assertion that either order is acceptable and call the route deterministic. Such an assertion documents uncertainty; it does not prove stable rank ownership.

The useful check inspects the query's ordered key and demonstrates equal values for both expressions. It then fails a product requirement for permanent rank stability until a unique final key is added.

A candidate fix might append a unique column such as ID in a declared direction. This article does not claim that key exists now, and tests should not assume its direction before code changes.

If a final key is added, seed IDs whose lexical order differs from insert order. Then assert all three sort levels in one table: count, time, and unique key.

Cache can make the same unresolved order look stable for five minutes. Force a miss between reads or invoke the query layer directly when characterizing database output.

Use [QA testing skills](/skills) to build a stable ranking gate after the product rule is chosen. A final key must be both unique and documented so tests can state one expected sequence.

Trending leaderboard recency tie testing should label exact ties as unresolved, not failed recency. The secondary rule worked as far as its inputs allowed; the missing contract begins after that point.

## Weekly Counts, Timestamps, and Expected Ranks

Trending leaderboard recency tie testing is easiest to audit with fixed values and explicit reasons. This table places the main tie group at the top and keeps exact ties below it.

| Skill | weeklyInstalls | createdAt | Expected rank | Tie resolved | Reason |
|---|---:|---|---:|---|---|
| High unique count | 30 | 2026-07-24T09:00:00Z | 1 | Yes | Primary count wins |
| Newer tied skill | 20 | 2026-07-25T09:00:03Z | 2 | Yes | Newer time wins |
| Middle tied skill | 20 | 2026-07-25T09:00:02Z | 3 | Yes | Time falls between peers |
| Older tied skill | 20 | 2026-07-25T09:00:01Z | 4 | Yes | Oldest tied time ranks last |
| Same timestamp tie A | 10 | 2026-07-25T08:00:00Z | Unspecified | No | Both keys equal |
| Same timestamp tie B | 10 | 2026-07-25T08:00:00Z | Unspecified | No | Both keys equal |

The unique-count row proves that recency does not override the primary field. The three-row group proves descending time within an equal count.

The exact pair must not receive fixed ranks in the expected column. Their only safe expectation is that both follow all rows with larger weekly counts.

Add enough lower-count rows to test the top-fifty edge separately. A tied row at that edge can move in or out when the full ordered key is incomplete.

For the edge case, hold count and time equal around ranks fifty and fifty-one. The test should show that a missing final key affects membership, not just visual order.

Keep the core three-row case away from the limit. Boundary behavior adds a second cause of failure and is harder to diagnose when the base tie rule is wrong.

The [leaderboard](/leaderboard) UI can provide a small final check, but the API matrix owns exact IDs and ranks. Screen text alone may not expose an omitted tied row.

## How Do You Run the Ranking Procedure?

The ranking procedure seeds fixed counts and times, clears only the trending cache, requests the endpoint, and compares ordered IDs. It then runs an exact tie without inventing a final order.

1. Seed skills with controlled weeklyInstalls and createdAt combinations.
2. Read the stored fields back and verify the intended ties.
3. Delete the leaderboard:trending cache key before each assertion.
4. Request the trending leaderboard and collect returned IDs and ranks.
5. Assert higher weekly counts first, then newer timestamps for equal counts.
6. Repeat exact ties and record the need for a unique final tiebreaker.

Step one should use a run prefix and explicit timestamps. Keep the tied group's counts high enough to enter the first fifty rows.

Step two catches fixture loss from timestamp precision or a setup helper that ignores weekly counts. Stop early if the database facts do not match the case.

Step three must await cache deletion. Starting the request before deletion completes creates another race and can test old output.

Step four should assert status, filter, and array shape before rank order. That makes database or cache failures distinct from sort failures.

Step five compares IDs from independent fixture facts. It also checks that rank equals one-based array position for every returned row.

This second example builds the expected order without reusing the route response order. It handles exact ties by checking shared placement rather than choosing an unsupported winner.

\`\`\`typescript
import { expect } from 'vitest';

function expectTrendingOrder(
  actualIds: string[],
  expectedResolvedIds: string[],
  exactTieIds: [string, string],
) {
  expect(actualIds.slice(0, expectedResolvedIds.length)).toEqual(expectedResolvedIds);

  const tiePositions = exactTieIds.map((id) => actualIds.indexOf(id));
  expect(tiePositions.every((position) => position >= expectedResolvedIds.length)).toBe(true);
  expect(Math.abs(tiePositions[0] - tiePositions[1])).toBe(1);
}
\`\`\`

Step six should report the equal stored key values and current order. If a third expression is later added, replace this characterization with one strict expected sequence.

Run fixture cleanup in a final hook even when an assertion fails. Old high-count rows can otherwise pollute every later leaderboard test.

Use the [database testing guide](/blog/database-testing-automation-guide) for safe teardown and the [cache guide](/blog/redis-cache-testing-guide) for environment-specific key control. Keep rank facts in one concise table per run.

- unique high weekly count stays above all newer low count rows
- equal weekly counts use the newest stored time as the winner
- three equal counts appear in full newest to oldest time order
- insertion order differs from expected time order for every tied row
- IDs and stored dates are read back before the route call
- UTC offset forms for one instant are treated as an exact time tie
- clear one second gaps prove the main descending time rule
- small time gaps run only when storage keeps their full difference
- trending cache deletion finishes before any request can start
- first returned skill has rank one and later ranks stay contiguous
- every rank equals the final response array index plus one
- top fifty core tie rows stay well inside the result edge
- rank fifty boundary rows get their own exact tie case
- new filter checks time alone under its separate branch rule
- all filter checks lifetime installs under its separate branch rule
- hot filter checks its weighted score under its separate branch rule
- exact count and time ties are logged without a made up winner
- cleanup removes every high count skill even after a failed assertion

## Frequently Asked Questions

### Does createdAt always decide an equal weekly-install count?

It decides the order only when the stored creation times differ. The route sorts those times descending after weekly installs. If two times are equal, both listed expressions tie and the query provides no unique final rule. Tests must report that limit honestly.

### Why must the test clear the trending cache?

The route caches \`leaderboard:trending\` for 300 seconds, so a prior response may not include fresh fixtures. Awaiting deletion forces the ranking callback to query PostgreSQL. Without that step, a cache hit can look like a bad sort or a missing row.

### How precise should creation-time fixtures be?

Use clear one-second gaps for the main direction test, then add a smaller precision case if the database preserves it. Always read stored values back before the request. Input dates alone cannot prove that two rows remained distinct after driver and column conversion.

### Is repeated stable order enough for an exact tie?

No. A plan may return one physical order many times even though SQL does not promise it. When all ORDER BY expressions are equal, stable observations are only characterization data. Add and document a unique final key before asserting permanent rank ownership.

### Do all leaderboard filters use the recency tiebreaker?

No. Trending uses weekly installs and creation time, new uses creation time, all uses lifetime installs, and hot uses a weighted score. Test each filter against its own branch. Similar output from one fixture does not make their sort contracts equal.

### How should the top-fifty boundary be tested?

First prove the tie rule well inside the result. Then place equal-key rows around positions fifty and fifty-one and force fresh queries. An incomplete key can change membership as well as order, so assert the included IDs after the product chooses a final tiebreaker.

## Conclusion

Trending leaderboard recency tie testing proves two current facts and one current limit. Weekly installs sort descending, newer creation times resolve equal counts, and rows equal on both fields have no declared unique order.

Open the [leaderboard](/leaderboard), then use [QA skills](/skills) to automate fixed-time fixtures, cache misses, contiguous ranks, and exact-tie reporting. Add a strict residual-tie assertion only after the route defines its final key.`,
};
