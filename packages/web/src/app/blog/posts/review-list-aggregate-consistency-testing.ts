import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'review list aggregate consistency testing',
  description:
    'Use review list aggregate consistency testing to detect count and average values that describe a different snapshot from the returned reviews.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'review list aggregate consistency testing',
  keywords: [
    'review list aggregate consistency testing',
    'review count list mismatch',
    'aggregate snapshot consistency test',
    'concurrent review GET race',
    'Postgres separate query consistency',
    'average rating stale response',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'authentication-authorization-testing-guide',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/transaction-iso.html',
    'https://orm.drizzle.team/docs/transactions',
  ],
  repoEvidence: [
    'packages/web/src/app/api/reviews/route.ts',
    'packages/web/src/db/schema/relations.ts',
    'packages/web/src/components/skills/review-section.tsx',
  ],
  content: `Review list aggregate consistency testing detects one response that combines review rows from one committed state with a count or average from another. Pause the request between its list and aggregate queries, commit a controlled mutation, then compare every returned field against one declared snapshot. A mixed response should fail that invariant, even when each query is correct alone.

The current GET handler in \`packages/web/src/app/api/reviews/route.ts\` awaits an ordered list before it requests aggregate statistics. That sequence gives a test a precise interleaving point instead of forcing a random load race.

The review table in \`packages/web/src/db/schema/relations.ts\` stores integer ratings, timestamps, and foreign keys to both skills and users. The UI in \`packages/web/src/components/skills/review-section.tsx\` consumes \`reviews\`, \`averageRating\`, and \`totalReviews\` from one response, so disagreement is visible as one contradictory screen.

Use the [database testing automation guide](/blog/database-testing-automation-guide) for fixture lifecycle and isolation basics. This guide narrows that work to the response contract exposed by the review endpoint.

## What Must Review List Aggregate Consistency Testing Detect?

Review list aggregate consistency testing must detect a response whose three views cannot describe one allowed database state. The list identifies visible reviews, the count states how many reviews exist, and the average summarizes their ratings after one-decimal rounding.

For an unpaginated response with valid user relations, the strongest oracle is simple. \`totalReviews\` should equal \`reviews.length\`, and \`averageRating\` should equal the returned ratings' arithmetic mean rounded to one decimal.

That oracle needs one stated qualification. The list query uses an inner join with users, while the aggregate query reads only reviews. A review without a matching visible user could affect count and average but disappear from the list, although normal foreign keys and cascading deletes reduce that state.

The endpoint orders rows by descending review creation time, but order does not change count or mean. Keep ordering assertions separate, because an order failure should not obscure a snapshot failure in the same report.

An empty result has another exact invariant. The list must be empty, \`totalReviews\` must be zero, and \`averageRating\` must be zero because the handler maps a missing aggregate value to that number.

The response is not consistent merely because every value has a valid type. A list of three reviews, a count of four, and an average for four ratings is structurally valid yet logically contradictory.

Think of each read as a still shot of the same set. One shot may show four cards, while the next shot may show five. A sound reply must use one shot for all fields. The test fails when the cards and score come from both shots.

Keep the first case small enough to check by hand. Four known ratings make the sum, count, and mean easy to see. A short case also keeps the fail log clear. Large data sets can wait until this base rule works.

Start with one response-level oracle before testing concurrency:

- every returned review belongs to the requested skill
- every returned review has a matching visible user
- totalReviews equals the unpaginated visible review count
- averageRating equals the rounded mean for that same visible set
- the empty set returns zero for both aggregate fields

The [API testing guide](/blog/api-testing-complete-guide) explains broader status and schema checks. Add this invariant after those checks so a well-shaped mixed snapshot cannot pass.

## How Do You Detect a Review Count List Mismatch?

A review count list mismatch is detected by comparing the endpoint's count with both the returned array and a control query using the list's join semantics. The two comparisons distinguish concurrent snapshot drift from a deliberate difference in query shape.

Seed four reviews for one skill with ratings \`1, 3, 4, 4\` and four valid users. A quiet request should return four rows, \`totalReviews: 4\`, and \`averageRating: 3\`, which establishes the fixture before any timed mutation.

Next, hold the aggregate query after the list has completed. Insert a fifth review with rating five, commit it, and release the request. Under separate Read Committed statements, the list can contain four rows while the aggregate reports five.

The inverse timing also matters. Seed five rows, let the list read all five, delete one review, and then run the aggregate query. A response containing five reviews with \`totalReviews: 4\` exposes the opposite direction.

Do not calculate the expected count from seed commands alone. Query the committed control state before and after each barrier, record both snapshots, and map the response list and aggregate to those states.

An inner-join control should compare review IDs from a direct \`reviews INNER JOIN users\` query. A plain review-table control should compare the aggregate population. If those sets differ without concurrency, label the result as query-shape disagreement rather than a timing race.

Use a plain run name for each row and write. The name can join the skill, user, and review in one small test set. When the case fails, print just those IDs. This keeps old rows from making the count hard to trust.

Run the same base call once with no write at all. If that call fails, stop and fix the seed or join first. A race test cannot help when the calm state is wrong. This check saves time and gives the next red result real weight.

The client sets all three fields during one fetch in \`review-section.tsx\`. A browser assertion can therefore verify that the displayed review cards, parenthetical count, and star summary describe the same fixture after the API-level diagnosis succeeds.

Use the [error handling patterns](/blog/error-handling-testing-patterns) to keep transport failures distinct. A 500 response is not a review count list mismatch because no combined success payload reached the client.

Review list aggregate consistency testing should print the list IDs, returned count, list-derived mean, returned mean, and mutation commit time. Those values make a failed case reproducible without saving unrelated user data.

## What Is an Aggregate Snapshot Consistency Test?

An aggregate snapshot consistency test forces two reads inside one logical response to observe a chosen commit boundary. It uses barriers around query completion, not sleep delays, so every run exercises the same interleaving.

The first barrier signals that the list promise has resolved and captures its IDs. The test then performs one mutation through a second database session, waits for commit, and releases the aggregate read.

This design proves mixed visibility directly. If a test only starts many GET and POST calls together, a green run may mean no write landed between statements, while a red run may not reveal which statement saw it.

Use distinct database sessions for the reader and writer. A mutation issued on the same transaction or connection may have visibility rules that do not represent a concurrent client.

The baseline, insert, update, and delete cases need fresh fixtures or a full reset. Reusing a mutated rating set can make the expected average depend on execution order and hide a stale value behind coincidental arithmetic.

The aggregate query returns a database average that the route converts to a number and rounds to one decimal. Compute the oracle with the same rounding boundary, but retain the raw sum and count in diagnostics.

The gate must be easy to see in the test log. Mark when the list ends, when the write ends, and when the stats read starts. Those marks should stay in that order on each run. If they move, the test did not prove the planned race.

Give each gate one job and one way to open. A broad lock can hold both reads and hide which one took its shot. Two small gates make the read order plain. They also let the test swap the order for the next case.

This sketch shows a barrier contract for a test-only query seam. It does not claim that the production route currently exports hooks; the seam should be injected by the test harness around the two awaited database calls.

\`\`\`typescript
import { expect, test } from 'vitest';

test('detects an insert between list and aggregate reads', async () => {
  const afterList = deferred<void>();
  const releaseAggregate = deferred<void>();

  const request = callReviewsGet(skillId, {
    afterReviewRows: () => afterList.resolve(),
    beforeStats: () => releaseAggregate.promise,
  });

  await afterList.promise;
  await insertReviewAndCommit({ skillId, userId: newUserId, rating: 5 });
  releaseAggregate.resolve();

  const body = await request;
  expect(body.reviews).toHaveLength(4);
  expect(body.totalReviews).toBe(5);
  expect(body.totalReviews).not.toBe(body.reviews.length);
});
\`\`\`

Keep the seam outside normal production behavior and assert that it is inactive by default. The [authentication testing guide](/blog/authentication-authorization-testing-guide) can cover mutation authorization, while this test controls already-authorized database writes.

## Concurrent Review GET Race Scenarios

A concurrent review GET race needs cases for inserts, deletes, and rating updates on both sides of each read. Each case should state whether the mutation commits before the list, between statements, or after the aggregate.

An insert before the list should appear in both views. An insert after the aggregate should appear in neither view, even if it commits before the HTTP response reaches the test client.

Only the between-statements insert should expose the current mixed-state risk. Its expected list omits the new ID, while count and average can include its rating under ordinary statement snapshots.

A delete between statements reverses that pattern. The list can retain the deleted review, while the later aggregate omits it and calculates a mean from fewer rows.

A rating update is less visible because count remains equal. Use a large change, such as one to five, so the returned list-derived mean differs clearly from the later aggregate mean.

Update timing also tests the payload itself. The list maps ratings captured by its statement, while the average may use a newer version of one row. Record the changed review ID and both old and new ratings.

Add a writer rollback control. Pause the request, update a rating, roll the writer back, then release the aggregate query. Both response views should still describe the original committed data.

A mutation for another skill is a predicate control. It may commit between reads, but the requested skill's rows, count, and mean should remain unchanged.

The write case should change one fact at a time. An add changes both count and mean, while a score edit changes just the mean. A delete can make the count move down. These clean shifts help the test name the bad field at once.

Use one known user for each new review and keep that user live. A user delete can start a chain that removes more than the test meant to change. Save that case for its own run. Small writes make the before and after sets easy to prove.

Foreign-key behavior deserves one focused delete case. Deleting a user cascades to that user's reviews according to \`packages/web/src/db/schema/relations.ts\`, so list and aggregate visibility should be mapped to the review deletion rather than treated as a dangling join.

Run each interleaving several times only after the barrier makes it deterministic. Repetition then checks cleanup and cache-free stability, not luck in the scheduler.

Review list aggregate consistency testing should fail on an unexplained mixed payload but may document current behavior in a characterization suite. A separate contract test should turn green only after the endpoint adopts one-response consistency.

## How Does Postgres Separate Query Consistency Behave?

Postgres separate query consistency depends on isolation and transaction scope. Under the default Read Committed level, each SELECT sees committed data as of that statement's start, so successive statements may see different concurrent commits.

The official [PostgreSQL isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html) states this command-level snapshot rule directly. The current route performs two awaited statements without an explicit transaction, which leaves room for a commit between their snapshots.

Simply wrapping both reads in a default Read Committed transaction may not satisfy the response invariant. PostgreSQL still permits successive SELECT commands in that transaction to see different data.

A Repeatable Read transaction gives successive reads one stable transaction snapshot after its first data statement. That design can align list and aggregate visibility, provided both queries execute through the transaction handle.

Serializable also supplies a strong view but adds conflict detection and retry duties. A read-only route may not need that broader guarantee when Repeatable Read or one SQL statement meets the stated contract.

The [Drizzle transaction documentation](https://orm.drizzle.team/docs/transactions) shows how statements run through a transaction callback. A test should verify that both list and aggregate builders use the callback's \`tx\`, not the outer \`db\`, because one escaped query defeats the boundary.

Another design is one SQL statement using a window count and suitable aggregate expression. One statement receives one snapshot at Read Committed, although join shape and result mapping still require careful tests.

Do not trust a new code block just because it says transaction. Trace both reads to the same short-lived handle in the test. Then place the same write between their calls. The old case should pass only when both reads keep one view.

Run one plain read after the write has been saved. That call should show the new state in both list and stats. It proves the fix did not freeze data past the request. The [API test guide](/blog/api-testing-complete-guide) can add the same check at the route edge.

No design should be selected only to satisfy a test. First decide whether the API promises one coherent snapshot or merely returns recently observed values, then encode that promise in response documentation and assertions.

The [Postgres migration testing guide](/blog/postgres-migration-testing-guide) helps validate any isolation or query change across environments. Keep this race fixture in CI so a later refactor cannot split the reads again.

## Average Rating Stale Response Detection

Average rating stale response detection recalculates the mean from the returned review ratings and compares it with the response value. This catches rating updates that leave count unchanged and would evade a length-only check.

Use ratings with a nontrivial rounded result, such as \`1, 2, 4, 5\`, whose mean is three. Then update the first rating to five between reads, making the later aggregate mean four.

The list can still show the old one-star value while the summary reports four. A user sees review cards that average three beside a headline average of four, which is the exact contradiction the test should report.

Round only at the endpoint's public boundary. Sum the returned integer ratings, divide by list length, apply one-decimal rounding, and compare numeric values rather than formatted strings.

For zero reviews, avoid dividing by zero in the test helper. Expect the route's explicit zero mapping for the average and count, and keep the list empty.

For one review, the average must equal that rating exactly. This small control catches string conversion or unexpected decimal formatting without needing a race.

A count match does not prove a fresh average. Include \`listMean\`, \`returnedMean\`, and the changed review ID in assertion output, then attach the before and after fixture states.

Use scores that make the old and new mean far apart. A move from one star to five is much easier to spot than a small shift. Keep the other scores fixed and write down their sum. The hand check should match the test helper with no guess.

Also test a change whose rounded means stay the same. The raw sum will move even when one decimal place does not. That case shows the limit of the public field. Do not claim the API can reveal a change that its own round rule hides.

The UI rounds the average again when selecting filled stars but prints the numeric average beside them. API tests should assert the one-decimal contract first, while a smaller component test verifies the display.

Use [database testing skills](/skills) to extend the same calculation pattern to other list-and-summary endpoints. The important step is deriving the expected aggregate from the exact visible member set.

Review list aggregate consistency testing should treat a mean difference caused by deliberate join populations separately. Compare list IDs with an aggregate query using matching joins before blaming snapshot timing.

## Interleaving, List State, and Aggregate State Matrix

Review list aggregate consistency testing becomes easier to review when every barrier maps to two named states. The matrix below assumes four initial reviews with ratings \`1, 3, 4, 4\` and valid users.

| Write timing | List snapshot | Aggregate snapshot | Returned count | Calculated average | Invariant holds |
|---|---|---|---:|---:|---|
| No concurrent write | Four original rows | Four original rows | 4 | 3.0 | Yes |
| Insert before list | Five rows including rating 5 | Same five rows | 5 | 3.4 | Yes |
| Insert between queries | Four original rows | Five rows including rating 5 | 5 | 3.4 | No |
| Delete between queries | Four original rows | Three surviving rows | 3 | Depends on deleted rating | No |
| Rating update between queries | Old ratings in list | New rating in aggregate | 4 | New-state mean | No |

The table's average column describes the aggregate snapshot, not always the returned list. In failed rows, the list-derived average is the control that exposes disagreement.

Add two controls outside the table. A rolled-back write should leave both snapshots unchanged, while a committed write for another skill should not alter either requested result.

The mutation timestamp alone cannot identify visibility because database snapshots begin when statements run. Capture barrier events such as \`listResolved\`, \`writerCommitted\`, and \`statsStarted\` in strict order.

Read the matrix from left to right during triage. First find the write point, then find the state for each read. Last, match the reply to those two states. This path is faster than scanning a long trace for a rare race.

Keep one green row near each red row in the suite. The green row moves the same write before or after both reads. It proves the data and route can work. The red row then points to the split, not to the kind of write.

Avoid using application timestamps to infer statement order. Clock resolution, transaction commit timing, and server boundaries can make two events look equal even when the barrier knows their sequence.

For a failed case, print the two expected state labels and the actual response in one assertion message. This makes the defect clear without exposing full comments or user profile data.

The [database guide](/blog/database-testing-automation-guide) provides cleanup patterns for concurrent fixtures. Delete test reviews by a run-specific skill ID so one interrupted run cannot change another run's aggregate.

## How Do You Run a Deterministic Consistency Procedure?

A deterministic consistency procedure seeds calculable data, blocks at a known query boundary, commits one mutation, and checks the combined response. It then repeats the same interleaving under the candidate consistency design.

1. Seed reviews with a known count and a mean that changes after one chosen mutation.
2. Install a deterministic barrier after the list query has resolved.
3. Insert, update, or delete one review through a separate writer session.
4. Wait for the writer transaction to commit before releasing the aggregate query.
5. Compare totalReviews with list length and recalculate averageRating from returned ratings.
6. Repeat through the intended transaction handle and isolation level.

Step one should create a dedicated skill and users because the list uses an inner join. Confirm the quiet baseline before opening either concurrent session.

Step two must signal completion rather than merely intercepting query construction. A builder can exist long before its SQL executes, so release the writer only after list results are available.

Step three should mutate one fact per case. Separate insert, delete, and update tests produce much clearer expected states than one request surrounded by several writes.

Step four waits for commit, not just for the mutation promise to start. The aggregate statement can only demonstrate committed visibility if the writer has completed its transaction.

Step five uses a small assertion helper that checks both count and mean. Keep order and response-schema assertions nearby but report them under separate names.

\`\`\`typescript
import { expect } from 'vitest';

function expectCoherentReviewSummary(body: {
  reviews: Array<{ id: string; rating: number }>;
  totalReviews: number;
  averageRating: number;
}) {
  const ratings = body.reviews.map(({ rating }) => rating);
  const expectedAverage =
    ratings.length === 0
      ? 0
      : Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1));

  expect(body.totalReviews, 'count must describe returned reviews').toBe(ratings.length);
  expect(body.averageRating, 'average must describe returned ratings').toBe(expectedAverage);
}
\`\`\`

Step six should run the same fixture and assertion unchanged. If the implementation moves both statements into one chosen snapshot, the prior characterization failure becomes a passing contract test.

When a run fails, ask three short questions in order. Did the seed match the plan, did the gate order hold, and did the reply match one state? Stop at the first no. This keeps a test bug from being filed as a data bug.

Keep the final report small and safe. List IDs, scores, counts, and gate marks are enough for most faults. Do not print review notes or user names. The [error test guide](/blog/error-handling-testing-patterns) can shape the same safe logs for failed requests.

Run the procedure against the API route, not only against two hand-written SQL calls. Route mapping, join choice, conversion, and rounding are all parts of the public response.

Use the [API testing category](/categories/api-testing) to find supporting request and contract checks. Keep this concurrency case narrow enough that its failure names the read boundary immediately.

- calm seed with four linked users and four fixed review scores
- calm empty seed with zero rows count and mean
- insert saved before both reads with one shared new state
- insert saved after both reads with one shared old state
- insert saved between reads with list first and stats last
- delete saved between reads with old cards and new count
- score edit saved between reads with equal count and split mean
- user delete case with the planned review cascade made clear
- write rollback between reads with no change in either view
- other skill write between reads with no change for this skill
- repeatable read case with both calls on one transaction handle
- final safe report with IDs scores counts means and ordered gate marks
- follow-up contract checks from the [API testing category](/categories/api-testing)

## Frequently Asked Questions

### Can two SELECT statements in one request see different snapshots?

Yes, when they execute as separate Read Committed statements, each SELECT can begin with a newer committed view. A write committed after the list starts but before the aggregate starts may affect only the latter. The test must control that interval and compare the combined payload.

### Does a default transaction fix the review snapshot mismatch?

Not necessarily. PostgreSQL Read Committed can assign a fresh snapshot to each statement even inside one transaction. Use the intended isolation level and verify both queries use its handle. Repeatable Read or a suitable single statement can provide the stable view this response contract needs.

### Why can an inner join complicate the count oracle?

The list joins reviews to users, while the aggregate reads reviews alone. If their visible populations differ, length and count can disagree without a timed insert. Compare joined and unjoined control sets first, then classify query-shape differences separately from concurrent snapshot drift.

### Should a paginated review list equal totalReviews?

No, not when pagination is part of the contract, because the array then represents one page and the count represents all matches. This route is currently unpaginated, so equality is appropriate. If pagination arrives, replace length equality with offset, limit, and total consistency rules.

### How do you distinguish a stale average from rounding?

Calculate the mean from returned integer ratings and round once to the same one-decimal boundary used by the route. Also retain the unrounded sum and count in diagnostics. A difference after equivalent rounding indicates another member set or rating version, not display precision.

### Should a consistency test retry the GET request?

No, an immediate retry can hide the contradictory response that clients already received. Capture and fail the first payload, then use a separate retry only to document whether later state settles. Correctness should come from one declared snapshot contract, not favorable timing.

## Conclusion

Review list aggregate consistency testing should prove that rows, total count, and rounded average describe one allowed review snapshot. Deterministic barriers expose inserts, deletes, and rating changes between the route's list and aggregate statements, while join controls prevent a false concurrency diagnosis.

Browse [database and API testing skills](/skills) before adding the concurrent snapshot fixture. Then keep the response-level oracle unchanged while comparing the current reads with a transaction or single-statement design.`,
};
