import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'leaderboard top fifty boundary testing',
  description:
    'Use leaderboard top fifty boundary testing to verify inclusion, exclusion, ranking, and tie behavior at positions 50 and 51 for every filter.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'leaderboard top fifty boundary testing',
  keywords: [
    'leaderboard top fifty boundary testing',
    'top 50 ranking cutoff test',
    'leaderboard position 51 exclusion',
    'SQL limit tie boundary',
    'ranking cutoff fixture design',
    'leaderboard maximum rows contract',
  ],
  relatedSlugs: [
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'database-testing-automation-guide',
    'api-testing-complete-guide',
    'redis-cache-testing-guide',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/queries-limit.html',
    'https://www.postgresql.org/docs/current/queries-order.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/leaderboard/route.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/web/src/lib/cache.ts',
  ],
  content: `Leaderboard top fifty boundary testing proves the cutoff by seeding at least 52 controlled skills, clearing each filter's cache, and asserting exactly 50 returned ranks. For every filter, the expected row at position 50 must be present, position 51 must be absent, and ties must reveal whether the SQL order is deterministic.

This boundary deserves direct tests because an ordinary leaderboard smoke check rarely inspects the discarded rows. A route can return plausible leaders while selecting the wrong final member, assigning broken ranks, or serving a cached result from an earlier fixture.

The implementation in \`packages/web/src/app/api/leaderboard/route.ts\` applies \`limit(50)\` in all, trending, hot, and new branches. It maps ranks only after the database rows return. Fields used by those branches are declared in \`packages/web/src/db/schema/skills.ts\`, while \`packages/web/src/lib/cache.ts\` stores each result under a filter-specific key.

Open the [leaderboard](/leaderboard) to see the public output, then test the route below the page. The [leaderboard cache isolation guide](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) covers key separation broadly; this article concentrates on rows 50 and 51.

## What Must Leaderboard Top Fifty Boundary Testing Prove?

Leaderboard top fifty boundary testing must prove row count, ordered identity, rank sequence, filter ownership, and cache freshness. It should cover fewer than 50, exactly 50, and more than 50 eligible rows. The main fixture needs 52 rows so both inclusion and exclusion remain visible.

The all branch orders by install count descending and limits the query. Trending orders by weekly installs descending, then creation time descending. Hot uses a weighted SQL expression based on install count and quality score, while new orders by creation time descending.

The route assigns rank with the zero-based array index plus one. Therefore, ranks should always be consecutive from one through the returned length. The code does not calculate database rank before truncation and does not preserve gaps for tied scores.

Each branch applies the same hard limit without reading a client size parameter. A request cannot ask for 51 entries through this endpoint. Tests should send irrelevant size-like query parameters as negative controls only if the route contract permits arbitrary query strings.

Cache behavior forms part of every integration case. The key is \`leaderboard:\${filter}\`, and the route requests a 300-second lifetime. If the test seeds new rows but leaves an older key, it may validate cached identities rather than SQL ordering.

Unknown filters enter the default all branch, yet the response still echoes the original filter string because the return object uses the parsed value. Record that behavior separately from the four advertised filters. Do not count an unknown value as a fifth ranking formula.

A useful report includes filter, available rows, returned rows, rank-50 ID, excluded ID, primary values, secondary values, and cache state. The [API testing guide](/blog/api-testing-complete-guide) can supply response-shape patterns, while this report owns the cutoff facts.

Keep the first proof set free from ties, with clear gaps at ranks 49 through 52 and fixed IDs that sort the same on each run. Save those four rows beside the route result so the last kept row is easy to spot. If a count is wrong, check the owned row total before the SQL branch. This small start tells the team whether data, sort, limit, or rank code failed.

## How Do You Build a Top 50 Ranking Cutoff Test?

A top 50 ranking cutoff test starts with 52 rows whose order can be computed in memory. Use deterministic UUIDs, explicit timestamps, and distinct metric values around the boundary. Random data makes the expected final pair hard to review and reproduce.

Build one base fixture set, then derive branch-specific values without relying on insertion order. For the all case, assign install counts from 520 down to 10. The row expected at rank 50 should have a larger value than rows 51 and 52.

For trending, control weekly installs first and creation time second. Give ranks 49 through 52 values that make both comparisons visible. The case should fail if either the primary weekly metric or secondary timestamp disappears.

For hot, compute the expected score using the same documented weights, but avoid floating ambiguity at the primary cutoff in the first positive case. Use scores far enough apart that 70 percent installs plus 30 percent quality has one clear order.

For new, assign unique creation times around the boundary. Keep install and quality values contradictory, so mapping to the wrong column produces a clearly different set. This is more diagnostic than giving every metric the same order.

The setup below creates deterministic expectations without copying route output into the expected list. The comparator is test-owned data, and each branch uses a separate projection.

\`\`\`ts
type BoundarySkill = {
  id: string;
  installCount: number;
  weeklyInstalls: number;
  qualityScore: number;
  createdAt: Date;
};

const fixtures: BoundarySkill[] = Array.from({ length: 52 }, (_, index) => ({
  id: '00000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
  installCount: 520 - index * 10,
  weeklyInstalls: 260 - index * 5,
  qualityScore: (index * 17) % 101,
  createdAt: new Date(Date.UTC(2026, 6, 24, 23, 59, 59 - index)),
}));

const expectedAll = [...fixtures]
  .sort((left, right) => right.installCount - left.installCount)
  .slice(0, 50);
const includedId = expectedAll[49].id;
const excludedId = [...fixtures].sort(
  (left, right) => right.installCount - left.installCount,
)[50].id;
\`\`\`

Insert all required skill columns, not only ranking fields, because the schema has non-null values and the route selects display data. Keep a run-specific slug prefix and author marker so cleanup can delete only owned rows.

Before each request, delete the exact cache key or mock \`cacheGetOrSet\` to execute its fetcher. Do not clear every Redis key in a shared environment. The [Redis cache testing guide](/blog/redis-cache-testing-guide) explains safe key ownership and stale-value controls.

Build the expected list once from the seed facts, freeze that list, and never sort the body from the route before the main check. A sorted response can hide that the route sent the right rows in the wrong order. Log just the first two and last four IDs when a long list fails. That view keeps the cutoff in sight while still showing whether the top of the set moved.

## What Proves Leaderboard Position 51 Exclusion?

Leaderboard position 51 exclusion requires three linked assertions: the response length is 50, the expected rank-50 ID is last, and the computed rank-51 ID is absent. Length alone passes when the wrong boundary row replaces the intended one.

Compare the complete ordered ID sequence when fixtures are deterministic. That assertion diagnoses mistakes above the cutoff as well as the final pair. Keep the explicit rank-50 and excluded-ID messages because a 50-item sequence diff can obscure the boundary meaning.

Assert ranks equal \`[1, 2, ..., 50]\` and pair each rank with its expected ID. Since rank assignment happens after truncation, no returned item should have rank 51. A duplicate rank or identity should fail even if the array still contains 50 entries.

Add a sentinel row with a striking display name at expected position 51. Do not use its name as the only assertion because names need not be unique. The stable fixture ID remains the source of truth, while the name improves failure output.

Verify the excluded row exists in the database before requesting the route. Otherwise cleanup, insertion failure, or fixture filtering could create a false positive. A direct count for the owned fixture prefix should equal 52.

Run one mutation check locally when developing the test: temporarily change the route limit to 51 and confirm the exclusion case fails. Restore the source immediately. Mutation evidence shows the assertion can detect the exact defect rather than only response formatting.

Leaderboard top fifty boundary testing should repeat the exclusion assertion for all four filters because each branch creates its own query. A passing all case says nothing about a missing limit in hot. Use the [skills directory](/skills) to inspect candidate data, but never derive expected IDs from production rows.

Give rank 51 a plain marker in its name and keep its ID as the hard check, since a name helps people read logs but may not be unique. Prove that row exists just before the request and still exists just after it. The route should omit it due to the limit, not because setup lost it. This pair makes leaderboard position 51 exclusion a clear SQL fact rather than a guess from array length.

## SQL Limit Tie Boundary Cases

SQL limit tie boundary cases expose ordering that is incomplete at positions 50 and 51. If all ordered expressions are equal for two rows and no unique tiebreaker follows, PostgreSQL may return either peer at the cutoff. A stable local observation does not create a database guarantee.

The official [PostgreSQL LIMIT documentation](https://www.postgresql.org/docs/current/queries-limit.html) warns that a subset should use an order that constrains rows predictably. The [ORDER BY documentation](https://www.postgresql.org/docs/current/queries-order.html) explains multiple sort expressions. Use those sources to assess the route's actual clauses.

Trending has a primary weekly-install value and a secondary creation timestamp. Create two boundary rows equal on both values to show that the current clause still lacks a unique final key. With distinct timestamps, the branch has a deterministic result for that fixture only.

All orders solely by install count. New orders solely by creation time. Hot orders solely by its weighted expression. Each can leave tied rows unconstrained, so tie tests should not hardcode one accepted ID as guaranteed unless the implementation adds another unique expression.

Write two classes of tie case. The first gives equal primary values but distinct existing secondary values, where available, and expects the documented secondary order. The second gives equality across every route expression and asserts that the contract is underspecified rather than blessing observed insertion order.

A useful failing test can demand a unique ID tiebreaker as a desired product contract, but label it as a known gap until source changes. Do not claim the current route already provides one. This honest distinction prevents fabricated guarantees.

For the tied hot score, choose integer inputs that produce exactly equal weighted expressions. Record both source metrics and computed score. Floating display rounding should not be used to declare equality unless the database expression itself compares equal.

The [database testing guide](/blog/database-testing-automation-guide) can help run the same tie fixture across PostgreSQL environments. Keep the cutoff assertion strict for untied data and diagnostic for fully tied current clauses.

Run each tied pair several times only as a probe, not as a way to vote one row into the contract. When all sort fields tie, either peer may sit at the edge until code adds a unique last key. Show both IDs and all tied values in the report. A stable result on one host is still not proof that SQL must pick that row on every plan.

## How Does Ranking Cutoff Fixture Design Work?

Ranking cutoff fixture design works by making each filter prefer a different ordering while keeping IDs and required display fields fixed. If all metrics rise together, a route mapped to the wrong field can still pass. Contradictory values expose that mapping defect.

Create four highlighted rows around each filter's cutoff and 48 filler rows. For example, one skill can have high total installs but low weekly installs, another can have high quality but an old timestamp, and another can be newest with low usage.

Keep timestamps at least one second apart in the untied fixture. JavaScript and database timestamp precision should agree on every value used for ordering. Convert expected timestamps with the same UTC basis, but calculate expected IDs independently.

Quality score and install fields are integer columns. The hot expression combines install count at 70 percent and quality at 30 percent. Use a helper to print the score for diagnosis, yet remember the database expression remains the route authority.

The schema also requires name, slug, description, and author name. Give every row unique slugs under one run prefix and compact descriptions identifying the case. Set arrays and flags explicitly so defaults do not vary across migrations.

Seed below, at, and above the boundary in three focused scenarios. A 49-row response should have ranks one through 49. A 50-row response should end at 50, and a 52-row response should truncate while preserving expected order.

Do not paginate this route in the test because the implementation exposes no pagination parameters. Testing a page value would imply a feature not present. If a later API adds pagination, define whether the top-50 cap applies before or after page slicing.

Leaderboard top fifty boundary testing should clean fixtures by owned IDs inside a transaction where the request architecture allows it. If the route uses another database connection, use explicit setup and teardown instead. The [leaderboard page](/leaderboard) can serve as a final visual check after deterministic API cases pass.

Use one seed plan for all branches, but write a short expected list for each sort so no case borrows the prior branch order. Keep the hot score in the report as a plain number with its two source values. Keep time in UTC and use fixed whole seconds near the edge. These choices make ranking cutoff fixture design easy to audit when a field or formula changes.

## Leaderboard Maximum Rows Contract

The leaderboard maximum rows contract says each current branch asks PostgreSQL for no more than 50 rows and then assigns ranks to those rows. It does not say the database contains only 50 skills, and it does not expose a total count for omitted records.

Test zero rows as a valid empty case. The response should contain an empty skills array, the requested filter, and an update timestamp. No rank should appear, and the cache may store that empty result for the configured period.

Test 49 rows to prove the function does not pad the response. Ranks should end at 49. This case catches fixture helpers or response code that assume a fixed-length leaderboard.

Test exactly 50 rows to verify no valid row disappears at the boundary. Compare all IDs and ranks. This case complements the 52-row truncation case because both can return the same length while exercising different available counts.

Test 52 rows for each filter and assert both excluded IDs remain absent. The route asks for only 50, so there is no rank 51 or total field that names the remainder. If clients need more rows, that requirement needs a separate endpoint change.

Try \`?limit=100\`, \`?page=2\`, and another inert parameter only as negative controls. The route reads \`filter\` alone, so the returned top set should remain unchanged. Do not describe ignored parameters as supported API inputs.

Cache the first response, alter the boundary data, and request again only in a dedicated cache test. For the SQL cutoff case, clear \`leaderboard:\${filter}\` before every expected-order assertion. Mixed cache and ordering failures are harder to diagnose.

Use [leaderboard automation skills](/skills) to retain this row-count suite. The [cache isolation article](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) can then verify that all, trending, hot, and new keys do not cross-contaminate.

Run the 49, 50, and 52 row cases in that order, since each new case adds one clear rule without a large jump in test state. The first proves no pad, the next proves no loss, and the last proves the hard cut. Save the final rank and row count for each case in one small table. The leaderboard maximum rows contract is then clear even to a reader who has not opened the route.

## Filter, Boundary Values, and Expected IDs

The filter matrix should identify every ordered expression and the remaining tie risk. Expected IDs come from each controlled fixture, not from the production response. Replace the symbolic names below with run-owned UUIDs in the report.

| Filter | Primary order | Secondary order | Expected rank 50 | Expected excluded ID | Tie risk |
|---|---|---|---|---|---|
| all | installCount descending | None | all-050 | all-051 | Equal installs are unconstrained |
| trending | weeklyInstalls descending | createdAt descending | trend-050 | trend-051 | Equal weekly and time values remain tied |
| hot | weighted score descending | None | hot-050 | hot-051 | Equal computed scores are unconstrained |
| new | createdAt descending | None | new-050 | new-051 | Equal timestamps are unconstrained |

The table records current source, including absent secondary expressions. It should not list ID as a tiebreaker because the leaderboard route does not add it. That differs from the skills list route and deserves separate coverage.

For trending, create one case where weekly installs tie but timestamps differ. Assert the newer row appears first. Then create one fully tied pair and document the missing unique order as risk or an expected failing contract.

For all, hot, and new, keep the main cutoff values unique. Their boundary IDs should remain strict and repeatable. Run tied variants separately so an intentional gap does not make the core suite flaky.

Store the expected position 49 through 52 values in assertion messages. A failure report should show both peers, their ordered fields, and the returned last ID. Those facts quickly reveal whether the formula, direction, or limit moved.

The response includes its filter and a generated \`updatedAt\` value. Assert the filter exactly and validate the timestamp shape without snapshotting its value. Neither field should replace ordered ID assertions.

Leaderboard top fifty boundary testing should keep this matrix near the route test. A reviewer can then compare each SQL branch with one row instead of reconstructing expectations from a long fixture builder.

## How Do You Run the Top-50 Procedure?

Run the top-50 procedure with owned database rows and explicit cache deletion. Calculate expected order before sending the request, then compare the response without using values copied from it. Repeat setup for every branch whose fields differ.

1. Seed 52 skills with controlled values for every ranking field.
2. Compute the expected order for one filter from fixture inputs.
3. Delete that filter's exact leaderboard cache key.
4. Request the filter and assert 50 rows with ranks one through 50.
5. Assert the expected boundary ID is last and position 51 is absent.
6. Repeat the calculation and assertions for all, trending, hot, and new.

The example below keeps the boundary assertions explicit. It assumes setup has inserted the rows and cleanup owns their IDs. Use the route's actual test base URL and cache adapter for the environment.

\`\`\`ts
import { expect, test } from 'vitest';
import { cacheDel } from '@/lib/cache';

test.each(['all', 'trending', 'hot', 'new'] as const)(
  'keeps the expected top 50 for %s',
  async (filter) => {
    const expected = expectedOrder(fixtures, filter);
    await cacheDel(\`leaderboard:\${filter}\`);

    const response = await fetch(\`\${baseUrl}/api/leaderboard?filter=\${filter}\`);
    const body = await response.json();
    const ids = body.skills.map((skill: { id: string }) => skill.id);

    expect(response.status).toBe(200);
    expect(ids).toEqual(expected.slice(0, 50).map(({ id }) => id));
    expect(body.skills.map(({ rank }: { rank: number }) => rank)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    );
    expect(ids.at(-1)).toBe(expected[49].id);
    expect(ids).not.toContain(expected[50].id);
  },
);
\`\`\`

If Redis is not configured, \`cacheDel\` safely returns, and \`cacheGetOrSet\` fetches fresh data because its read returns null. In a configured integration job, assert the deletion target or namespace the keys so stale production-like data cannot enter the case.

Run tie diagnostics after the untied table passes. Treat a changing fully tied boundary as evidence that SQL ordering is incomplete, not as random test failure. Add a unique route expression before promoting one tied ID into the strict contract.

Review the response on the [leaderboard](/leaderboard), then use the [Redis testing guide](/blog/redis-cache-testing-guide) for TTL and key-state follow-up. The automated cutoff report remains the release gate for positions 50 and 51.

End the run by deleting only the rows and keys that share the test run ID, then count both sets to prove they are gone. Do not leave old edge rows for the next filter case. If cleanup fails, stop and show the owned IDs rather than let the next run use mixed data. Leaderboard top fifty boundary testing stays safe when setup and cleanup are as strict as the rank checks.

- fixed UUIDs for all rows near the cutoff
- unique sort values in the first proof set
- stored expected IDs before the request starts
- one cache key cleared for each filter
- exactly fifty rows in each large result
- ranks that start at one and end at fifty
- the planned rank fifty ID in the last slot
- the planned rank fifty-one ID absent from all slots
- full tie values shown in the edge report
- owned rows and cache keys removed at the end
- one direct row count before each route request starts
- one exact filter name in every saved case result
- one UTC time base for all new and trending rows
- one hot score trace with both stored source values
- one fresh read after each owned cache key delete
- no result list sorted again inside the test code

## Frequently Asked Questions

### Why seed 52 rows instead of 51?

Fifty-two rows reveal the included boundary, the first excluded row, and one additional lower control. That extra row catches mistaken fixture counts or a swap below position 51. It also gives every filter enough data to show strict truncation without relying on the database's unrelated contents.

### Does SQL LIMIT choose a stable row when scores tie?

Not unless the full ordering constrains those tied rows. Current all, hot, and new branches lack a secondary expression, while trending can still tie on both listed fields. Use unique values for strict cutoff tests and separate tied fixtures to expose the remaining ordering risk.

### Should tied rows receive the same rank?

The current route assigns rank from the returned array index, so ranks remain consecutive even when ordered values tie. It does not calculate SQL rank or dense rank. Tests should expect positions one through the response length and examine tied identity as a separate concern.

### Why clear a cache key before every filter test?

The route caches results under a filter-specific key for 300 seconds. A prior response can survive database reseeding and make an ordering assertion inspect stale rows. Deleting only the owned key preserves isolation without flushing unrelated entries from a shared Redis environment.

### How should the hot boundary be calculated?

Compute install count times 0.7 plus quality score times 0.3 from controlled integer inputs, matching the route expression. Use clearly separated scores in the strict case. Add exact-score ties separately, and report both source values so rounding does not hide why two rows compare equally.

### Can clients request rows after position 50?

Not through the current leaderboard route. It reads only the filter parameter, applies a hard limit of 50, and returns no pagination cursor or total. A pagination requirement would need a new public contract and tests for ordering across pages, especially where ranking values tie.

## Conclusion

Leaderboard top fifty boundary testing needs 52 owned rows, branch-specific expected orders, exact cache isolation, and explicit assertions for ranks 50 and 51. It should keep untied cutoff checks strict while reporting fully tied SQL orders as an existing determinism risk. Row count alone never proves the correct boundary identity.

Open the [leaderboard](/leaderboard), browse [ranking QA skills](/skills), and automate the procedure for all, trending, hot, and new before changing limits or sort expressions. Preserve the boundary matrix with every run so reviewers can see which ID entered and which ID stayed out.`,
};
