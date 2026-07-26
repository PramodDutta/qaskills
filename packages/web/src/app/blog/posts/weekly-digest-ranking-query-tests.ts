import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Weekly digest ranking query tests',
  description:
    'weekly digest ranking query tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'weekly digest ranking query tests',
  keywords: [
    'weekly digest ranking query tests',
    'weekly installs digest ranking',
    'top ten skills email test',
    'drizzle multi column order test',
    'digest tie breaker testing',
    'scheduled ranking query',
  ],
  relatedSlugs: [
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-lazy-neon-database-initialization-nextjs-build',
    'database-testing-automation-guide',
  ],
  sources: ['https://orm.drizzle.team/docs/data-querying', 'https://vercel.com/docs/cron-jobs'],
  repoEvidence: [
    'packages/web/src/app/api/cron/weekly-digest/route.ts:topSkills query',
    'packages/web/src/db/schema/skills.ts:weeklyInstalls,installCount',
  ],
  content: `Weekly digest ranking query tests should seed more than ten distinct skills, execute the digest selection, and compare returned slugs with an explicit expected order. The contract is descending weekly installs first, descending lifetime installs second, and a ten-row limit. Complete ties need a stated expectation because current code has no third ordering key.

The query is inside \`packages/web/src/app/api/cron/weekly-digest/route.ts\`, and its counters come from \`packages/web/src/db/schema/skills.ts\`. Those files support precise claims about selected columns, order clauses, defaults, and limits. They do not support an invented date filter or deterministic order for equal counters.

## Weekly digest ranking query tests: What Must the Suite Prove?

Weekly digest ranking query tests must prove that the digest selects no more than ten rows and ranks them by two descending counters. A higher weekly value must beat every lower weekly value. When weekly values match, the larger lifetime install count must come first.

The route expresses that contract with \`orderBy(desc(skills.weeklyInstalls), desc(skills.installCount))\` followed by \`limit(10)\`. The projection includes name, description, author, slug, lifetime install count, quality score, and a repeated authorName value. It does not include weeklyInstalls in the returned objects.

The skills schema defines both counters as non-null integers with zero defaults. That source fact supports zero and positive fixtures. It does not impose a nonnegative database constraint in this file, so tests should avoid claiming the schema rejects negative values.

Complete ties require careful wording. If two skills share both counters, the current query provides no third \`orderBy\` expression. A test may assert membership for tied rows, but it should not require their relative order unless the production query gains a stable final key.

The route computes a date seven days earlier, yet that variable is not used in the selection. The current ranking depends on the stored weeklyInstalls counter, not a query over install timestamps. Weekly digest ranking query tests should expose that boundary rather than describing a missing date predicate as active behavior.

The observable pass result includes ordered slugs, row count, projected values, and downstream digest order. A failure report should show both counters for every fixture around the first mismatch. That output makes a reversed column or missing limit visible immediately.

The [database testing guide](/blog/database-testing-automation-guide) covers broad persistence strategy. This suite owns one narrow ordering query and its email consumer. It should run against the same database engine used by the application whenever query semantics are the subject.

## Which QASkills Code Paths Own This Contract?

The route at \`packages/web/src/app/api/cron/weekly-digest/route.ts\` owns authorization checks, email configuration checks, ranking selection, subscriber selection, batched delivery, and response counts. This article isolates the topSkills query while retaining one route-level consumer check.

Before ranking, the handler compares an Authorization header with \`CRON_SECRET\` when that secret exists. It also returns an error when \`RESEND_API_KEY\` is absent. Query tests can bypass those gates with controlled environment values, but route tests should prove the query is not called after either early return.

The ranking query selects from skills without a filter. It orders weeklyInstalls descending, then installCount descending, and stops at ten. If no rows are returned, the handler reports success with zero sent and does not query subscribers.

When rows exist, the handler queries users joined with user preferences. It requires both the master email setting and weekly digest setting to be true. Those subscriber rules are not part of rank calculation, though one consumer case should ensure ordered rows reach the sender.

The schema at \`packages/web/src/db/schema/skills.ts\` names the columns and defines defaults. It also exposes slug as unique and required, which makes slug a good fixture identity. Names can be similar, but fixture slugs should remain unmistakable in diagnostics.

The projection uses \`author: skills.authorName\` and also \`authorName: skills.authorName\`. Tests should compare the fields consumed by the email helper without inventing a separate author source. A selected projection regression can break rendering even when ordering still passes.

The [lazy Neon database article](/blog/testing-lazy-neon-database-initialization-nextjs-build) owns connection timing and build behavior. Weekly digest ranking query tests should inject or isolate database state without asserting singleton internals. Keep the database boundary real, while stubbing email delivery.

Source-backed behavior and recommendations must remain separate. A deterministic third tie breaker could improve repeatability, but it is not present today. If added later, update both the query and complete-tie expectation in the same change.

## Weekly installs digest ranking: Baseline Cases

Weekly installs digest ranking needs fixture values that make the two columns disagree. If every high weekly count also has a high lifetime count, reversing the order clauses could pass unnoticed. Build at least one pair where weekly leadership conflicts with lifetime popularity.

For example, give Skill A nine weekly installs and twenty lifetime installs. Give Skill B eight weekly installs and nine hundred lifetime installs. Skill A must appear first because the primary column wins before the lifetime tie breaker is considered.

Then create Skill C and Skill D with equal weekly values but different lifetime values. The larger lifetime value must come first. This pair proves the second order clause instead of merely checking descending weekly counts.

Add two skills with equal values in both columns. Assert that both belong in the expected set when they fall above the cutoff, but do not require their internal order. If deterministic output becomes a product requirement, add a third order key before tightening that assertion.

The boundary needs at least eleven rows. Arrange the tenth and eleventh rows with distinct values so the expected inclusion is unambiguous. Assert exactly ten rows and confirm the excluded slug does not reach the sender.

Zero counters deserve one case because both schema fields default to zero. Place a zero-zero row near the boundary only after stronger values occupy earlier positions. This confirms default values participate normally without claiming they are always selected.

Run the query twice in one clean transaction. Distinct-order fixtures should return the same ordered slugs, while complete ties remain set-based. Repeated execution catches accidental fixture leakage but does not create an ordering guarantee that SQL did not request.

Weekly digest ranking query tests should use the [leaderboard consistency article](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) only as a comparison. The digest and leaderboard can have different projections or ranking rules. This suite should assert the route source, not copy leaderboard expectations.

## Top ten skills email test: Test Matrix

A top ten skills email test should pair database values with query output and downstream placement. The matrix uses order and schema behavior from the two cited repository paths.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Distinct weekly counts | Weekly 9 versus 8 | First descending order key | Weekly 9 appears first | Ordered list reaches sender | Lifetime value wins |
| Weekly tie | Both weekly 7 | Second descending order key | Higher lifetime row first | Projection stays complete | Tie order is reversed |
| Complete counter tie | Both counters equal | No third order key | Both rows included as a set | No fixed relative claim | Test assumes slug order |
| Eleventh skill | Eleven clear ranks | Ten-row limit | Rank eleven is absent | Sender receives ten | Eleven rows are sent |
| Zero boundary | Zero default counters | Integer default path | Included only when within ten | Stable projected zero | Zero is dropped without rule |

The first two rows prove clause precedence. Report both counters beside actual positions so reviewers can see whether the issue is descending direction or column order. A simple expected-slug diff lacks that useful context.

The complete-tie row protects the suite from being stricter than production. PostgreSQL may return either tied row first when no further order is requested. Assert the tied set and surrounding ranked rows, then document the absence of a final key.

The eleventh row must not reach \`sendWeeklyDigest\`. Check the query length and the exact sender argument. A template that displays ten cards cannot prove the query excluded extra rows if the sender or template happened to truncate later.

The zero row should remain ordinary fixture data. The schema provides zero defaults, while the route has no filter removing zero values. Therefore a zero row can appear when fewer than ten stronger rows exist.

Use unique slugs, names, and counter pairs around the cutoff. Clear fixture identities keep a failed rank readable. They also avoid relying on database insertion order for rows with complete ties.

Weekly digest ranking query tests should preserve this matrix in CI output for failed cases. The [batch email failure guide](/blog/testing-batch-email-partial-failures-promise-allsettled) can cover mixed delivery results after the selected list is proven correct.

## How Should Drizzle multi column order test Be Exercised?

A drizzle multi column order test should use a temporary PostgreSQL database, isolated schema, or rolled-back transaction. Mocking the fluent builder can prove which functions were called, but only a real query proves that seeded values return in the expected order.

Seed fixtures through the same skills table. Supply every required column, use unique slugs, and set both counters explicitly. Defaults are useful for one zero case, but implicit values make the core ranking examples harder to read.

The [Drizzle data querying documentation](https://orm.drizzle.team/docs/data-querying) describes query construction and selected fields. Keep the test on the application's Drizzle expression rather than converting rows to JavaScript and sorting them afterward. A local sort would bypass the behavior under test.

Production query code currently sits inside the route handler. The most maintainable design would extract selection into a small function that accepts the database client. Until that refactor exists, a route integration test can invoke GET with delivery dependencies stubbed and inspect sender arguments.

If a direct query is duplicated in a focused test, add a source-shape assertion or review rule so order clauses cannot drift silently. Duplication is weaker than calling an exported function, but it still verifies database semantics for the exact expression shown.

Use one transaction per test and remove inserted rows even after failure. Shared development data can change the first ten results and produce misleading ranks. A dedicated fixture marker or isolated database keeps unrelated skills outside the selection.

Do not use an in-memory array as the primary proof. JavaScript sorting, null rules, and stable-sort behavior are not the database query. An array oracle can calculate expected slugs, but the actual result must come from Drizzle and PostgreSQL.

The [QASkills getting-started page](/getting-started) can host links to relevant test skills, but database credentials belong in CI secrets. Weekly digest ranking query tests should log fixture slugs and counters, never a connection string or subscriber data.

## Step-by-Step Digest tie breaker testing Procedure

Digest tie breaker testing should build one fixture set that proves precedence, cutoff, projection, and downstream order. Keep these steps contiguous and rerunnable.

1. Seed more than ten skills with deliberate weekly values, lifetime conflicts, secondary ties, and one complete tie.
2. Execute the same topSkills selection used by the weekly digest handler against the isolated database.
3. Assert ordered slugs, tie behavior, selected projection, excluded rank eleven, and the ten-row limit.
4. Pass the result into a stubbed digest sender, then verify card input order and one sender call.

The first step should make expected order obvious from data. Use a compact fixture builder, but require each case to state both counters. Hidden defaults around the cutoff make later failures harder to explain.

This integration example runs the two-column expression and uses explicit slugs as the oracle:

\`\`\`typescript
import { desc, inArray } from 'drizzle-orm';
import { expect, test } from 'vitest';
import { db } from '@/db';
import { skills } from '@/db/schema';

test('orders digest candidates and limits the result', async () => {
  const fixtureSlugs = await seedDigestRankingSkills(db, 12);
  const rows = await db
    .select({
      slug: skills.slug,
      weeklyInstalls: skills.weeklyInstalls,
      installCount: skills.installCount,
    })
    .from(skills)
    .where(inArray(skills.slug, fixtureSlugs))
    .orderBy(desc(skills.weeklyInstalls), desc(skills.installCount))
    .limit(10);

  expect(rows).toHaveLength(10);
  expect(rows.slice(0, 4).map((row) => row.slug)).toEqual([
    'weekly-nine',
    'weekly-eight-lifetime-high',
    'weekly-seven-lifetime-nine',
    'weekly-seven-lifetime-four',
  ]);
  expect(rows.map((row) => row.slug)).not.toContain('rank-eleven');
});
\`\`\`

The added \`where\` isolates fixture rows and is not present in production. A route-level case must still exercise the unfiltered production selection in an isolated database. State that difference in the test name rather than presenting this helper as complete handler coverage.

For the projection check, assert every selected field that the sender needs. The route returns author and authorName from one schema column, plus lifetime installs and quality score. Weekly installs control rank but are not passed in the selected object.

The sender case should stub delivery and provide one subscriber. Assert one call and compare the ordered skill slugs inside its second argument. That control proves no intermediate map reverses or re-sorts the query output.

Finish by rolling back or deleting all fixture rows. Then open the [QASkills skills directory](/skills) only as a product-level reference. Production catalog state should never become the oracle for an isolated ranking test.

## Scheduled ranking query: Assertions and Diagnostics

A scheduled ranking query needs guard, query, consumer, and response assertions. The ranking case should set a valid cron secret, supply an email API key, seed candidates, and stub subscriber delivery. Early-return cases should prove that no ranking query or sender call occurs.

[Vercel Cron documentation](https://vercel.com/docs/cron-jobs) is the approved source for the scheduling boundary. The QASkills handler supports GET and forwards POST to GET for manual testing. This article tests handler behavior, not whether an external scheduler fired at an exact wall-clock time.

A route-level test can mock the sender while preserving database selection. The core assertions should resemble this shape:

\`\`\`typescript
import { expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/weekly-digest/route';
import { sendWeeklyDigest } from '@/lib/email/send';

vi.mock('@/lib/email/send', () => ({ sendWeeklyDigest: vi.fn() }));

test('passes ten ranked skills to one subscribed recipient', async () => {
  process.env.CRON_SECRET = 'test-secret';
  process.env.RESEND_API_KEY = 'test-key';
  await seedOneDigestSubscriber();
  await seedProductionRankingSet();
  vi.mocked(sendWeeklyDigest).mockResolvedValue({ success: true });

  const request = new NextRequest('http://local/api/cron/weekly-digest', {
    headers: { authorization: 'Bearer test-secret' },
  });
  const response = await GET(request);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(sendWeeklyDigest).toHaveBeenCalledTimes(1);
  const skillsArg = vi.mocked(sendWeeklyDigest).mock.calls[0][1];
  expect(skillsArg).toHaveLength(10);
  expect(body).toMatchObject({ success: true, topSkills: 10, sent: 1, failed: 0 });
});
\`\`\`

Run that case with fake subscriber details and isolated rows. The sender mock keeps network calls at zero while exposing its complete skill argument. Do not mock the selected rows directly because that would bypass query ordering.

For unauthorized requests, assert status 401 and zero database or sender work. For missing email configuration, assert status 500 and the same zero side effects. These guards prevent a green ranking test from hiding an unsafe route setup.

On mismatch, print a compact table with slug, weekly value, lifetime value, expected rank, and actual rank. Include the first differing position and whether each slug reached the sender. Do not dump entire skill descriptions or subscriber records.

Weekly digest ranking query tests should also report environment gate status without revealing secret values. The [leaderboard route](/leaderboard) offers a separate product view, but its order should not replace this handler's explicit two-column oracle.

## What Regressions and Boundaries Prevent False Confidence?

Rendering rank badges from an already sorted array does not prove database ordering. A template test can verify card order preservation, but the primary assertion must begin with seeded counters and a real query result.

A builder mock has a similar limit. It can show that \`orderBy\` received two expressions and \`limit\` received ten. It cannot prove database precedence, descending behavior, projection values, or complete-tie handling.

Do not describe oneWeekAgo as an active filter. The route computes that date but never applies it to the query. WeeklyInstalls is the source ranking field, so reset or counter-maintenance behavior belongs to another contract.

Complete ties are another trap. Requiring insertion, slug, or name order would encode behavior absent from the query. Either compare tied membership or add a third production order expression before claiming stable order.

The ten-row limit must be observed before delivery. A sender receiving eleven rows is a query defect even if an email client displays only ten. Assert both query length and sender argument length in the cross-layer case.

Subscriber filtering, batch delays, and partial delivery counts are nearby but separate concerns. Keep one subscriber for rank-consumer proof, then rely on the [batch delivery article](/blog/testing-batch-email-partial-failures-promise-allsettled) for multiple result handling.

Database initialization and migration behavior also sit outside this ranking matrix. The schema evidence proves column definitions in source, while a real test database proves query semantics. It does not prove production data quality or weekly counter refresh.

After changes to the route or skills schema, rerun conflicting counters, secondary ties, complete ties, eleven rows, zero values, projection checks, sender order, no rows, and guard exits. Weekly digest ranking query tests should identify the exact clause or boundary that changed.

### Make the rank set easy to audit by sight

Give each seeded slug a short name that states why the row exists, such as weekly-nine or rank-eleven. A clear slug lets the first bad place explain the failed rule before anyone reads the raw counts.

Keep the main set small enough to scan but large enough to cross the limit. Twelve rows work well because they prove the cutoff and leave one spare row for a tie case.

Write the expected order by hand from the two stated rules before the query runs. Do not sort the expected list with the same fields and code used by the path under test.

Place the weekly leader above a row with a much larger life count. This sharp clash proves that the first key wins, rather than merely showing that both keys point the same way.

Place two rows with the same weekly count next to each other, then give them clear life counts. Their order should be plain to a reviewer and hard for a reversed tie rule to hide.

Put a full tie away from the tenth place when the test does not own a final key. This choice keeps the cutoff clear while still checking that both tied rows remain in the result set.

Use a distinct value for ranks ten and eleven. A tied cutoff needs a third rule that current source does not have, so it cannot prove one stable row belongs outside.

Add one zero row through the schema default and one with zero set in the fixture. Both should act as zero values, which checks the builder without making them top-ranked rows.

Save each expected row as slug, weekly count, life count, and expected rank class. The class can be exact, tied set, or excluded, which keeps every claim honest.

Compare this table with the [leaderboard](/leaderboard) only as a product aid. The digest test must keep its own source rules because another page may rank or cache data in a different way.

### Trace the first rank that goes wrong

When the lists differ, stop at the first bad index and print the rows just above and below it. A short slice gives more help than a dump of every field in every skill.

Check the two weekly values first because that field owns the main rank. If they match, compare life counts; if those match too, classify the pair as an open tie.

If eleven rows appear, inspect the limit call before checking sort order. A missing limit is one fault, and a long list can make later position errors look worse than they are.

If ten rows reach the query result but eleven reach the sender, inspect the map and call site. The database gate passed, while the handoff added data that did not belong there.

If the query order is right but the mail order is wrong, keep both arrays in the report. This proves the sort survived storage and failed only after the route built its send call.

For a no-row case, assert the short success response and zero sender calls. Do not treat an empty week as a rank failure when the route has a clear no-skills branch.

For an auth or setup failure, show only which guard stopped the route. Never print the secret or mail key, since their values add no help to a rank defect.

Weekly digest ranking query tests should end each failed run with one plain cause label. Use primary-order, life-tie, open-tie, limit, projection, handoff, or guard so the next step is clear.

Run the rank set once with the top row placed first in seed input and once with that row placed last. Both runs must give the same clear ranks because seed order is not one of the two stated sort keys.

Swap the life counts of the two weekly-tied rows while all other values stay fixed, then run the query once more. Only those two rows should trade places, which gives a sharp check on the second key and leaves the main order still.

Move rank eleven above rank ten by raising just its weekly count, then prove the new row enters and the old row leaves. This small change checks the limit at its edge without making the whole rank set hard to read.

Send the final ten rows to a fake mail job that keeps their input order and adds no sort of its own. Compare the slug list before and after that call so a later map or filter cannot shift the rank in silence.

Close the test by reading the same seeded rows from the database and then rolling the whole set back. This final read proves the test did not alter counts by mistake, while the rollback keeps the next run clean.

Before the run ends, build one short proof line from the first slug, the tenth slug, the row count, and the sender count, then keep that line with the test result so the main rank and limit facts are clear at a glance. If either count is not ten, stop that proof before any mail view check and name the bad handoff, since a card list cannot repair a wrong set that left the query or reached the sender.

## Frequently Asked Questions

### How do you verify candidates are limited to ten and correctly ordered?

Seed at least eleven skills whose weekly and lifetime counters intentionally conflict. Execute the real Drizzle selection, compare ordered slugs with an explicit oracle, and assert exactly ten results. Then verify the stubbed sender receives the same order and never receives the eleventh slug.

### What proves weekly installs digest ranking precedence?

Use one skill with higher weekly installs but much lower lifetime installs than another skill. The higher weekly value must rank first. Then use equal weekly values with different lifetime totals to prove the second descending key, while reporting both counters beside actual positions.

### What belongs in a top ten skills email test?

Assert database order, ten-row cutoff, selected fields, and unchanged order at the sender boundary. Use one subscriber and stub delivery. Template badge checks can confirm presentation, but they should not replace the seeded query because rendered positions cannot reveal how candidates were selected.

### Why use a drizzle multi column order test against PostgreSQL?

The application delegates ordering to Drizzle and the database, not a JavaScript array. A real query covers generated SQL, column precedence, descending direction, and limit behavior together. Builder mocks remain useful for guard branches, but they cannot establish the returned rank order.

### How should digest tie breaker testing handle equal counters?

When weekly and lifetime counts both match, compare tied membership rather than relative order because the current query has no third key. If stable output becomes required, add an explicit final order expression in production, then update the test to assert that documented rule.

### What should a scheduled ranking query report on failure?

Report the first mismatched rank, expected and actual slugs, both counters, result length, sender length, and excluded boundary slug. Also identify whether an authorization or configuration guard ran during that test. Avoid subscriber data, secrets, long descriptions, and raw database connection details.

## Conclusion

Weekly digest ranking query tests prove the exact two-column contract that source code implements: weeklyInstalls descending, installCount descending, and no more than ten rows. They must leave complete ties unordered, reject invented date filtering, and verify that the selected projection reaches the digest sender unchanged.

[Open leaderboard](/leaderboard), compare seeded ranking fixtures with its visible concepts, and add the ten-row digest query assertion. Then use the [skills directory](/skills) and [QASkills blog](/blog) to find the next database and delivery checks.`,
};
