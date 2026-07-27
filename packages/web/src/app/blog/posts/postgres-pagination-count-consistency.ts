import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Postgres pagination count consistency',
  description:
    'Use Postgres pagination count consistency tests to expose page rows and total counts taken from different snapshots during concurrent writes.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Postgres pagination count consistency',
  keywords: [
    'Postgres pagination count consistency',
    'parallel count query race',
    'pagination total mismatch test',
    'Postgres snapshot consistency API',
    'Drizzle count and rows query',
    'concurrent insert pagination drift',
  ],
  relatedSlugs: [
    'database-testing-automation-guide',
    'postgres-migration-testing-guide',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'testing-lazy-neon-database-initialization-nextjs-build',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/transaction-iso.html',
    'https://orm.drizzle.team/docs/transactions',
    'https://www.postgresql.org/docs/current/functions-aggregate.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/web/src/db/index.ts',
  ],
  content: `Postgres pagination count consistency tests detect a page array and total that came from different committed states. Place separate barriers around the row and count branches, commit one matching change after only one query starts, then check page arithmetic against a named snapshot. Final-page fixtures make one-row drift clear instead of merely plausible.

The GET handler in \`packages/web/src/app/api/skills/route.ts\` builds one \`whereClause\` and starts row and count builders inside \`Promise.all\`. It converts the count to a number and calculates \`totalPages\` with \`Math.ceil(total / limit)\`.

The fields used for fixtures live in \`packages/web/src/db/schema/skills.ts\`. The lazy database proxy in \`packages/web/src/db/index.ts\` creates a Neon-backed Drizzle client only when a database property is first read.

Use the [database automation guide](/blog/database-testing-automation-guide) for safe setup and cleanup. This guide stays focused on two statements that form one paginated response.

## What Must Postgres Pagination Count Consistency Prove?

Postgres pagination count consistency must prove that rows, total, page, limit, and totalPages can describe one allowed query snapshot. The test needs both arithmetic checks and a controlled database state for the active filters.

Every returned row must satisfy the same search and JSONB conditions used by the count branch. Sharing one \`whereClause\` in source helps, but a route test proves the actual builders both receive it.

The response echoes the parsed page and limits the requested size to one through one hundred. Since limit is not returned, the test retains its request value when checking offsets and page capacity.

For a nonempty page, \`total\` must be at least \`offset + rows.length\`. A smaller total says some returned row falls beyond the population that the count claims exists.

For a partial final page, the strongest oracle is \`total === offset + rows.length\`. That equality turns one concurrent insert or delete into a visible mismatch.

A full page has a weaker length oracle because more matching rows may follow it. Use direct control snapshots or a final-page setup when testing mixed visibility.

\`totalPages\` must equal \`Math.ceil(total / limit)\`, with zero when total is zero. This check catches mapping errors even when rows and count came from one state.

Requested pages beyond the end may return no rows while total stays below the offset. Treat that as a valid empty page unless the product contract later rejects excessive page numbers.

Stable ordering is required before comparing page IDs. The route appends descending skill ID after each non-unique primary sort, so tied sort values still have a fixed sequence.

Use the [JSONB filter testing guide](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) to validate filter membership. Keep this suite's main oracle on row and count agreement under one controlled mutation.

## How Do You Reproduce a Parallel Count Query Race?

A parallel count query race is reproduced by pausing row and count execution independently, not by delaying the whole route. Release one statement, commit a matching mutation, then release the other statement.

The two queries are passed to \`Promise.all\`, so both may start close together. A reliable harness must block them before their snapshots are acquired or at a database adapter seam that signals actual execution.

Create a test-only query gate keyed by operation. The rows gate and count gate each expose a started signal plus a release promise, allowing the writer to fit between them.

For one direction, let the page query complete against twelve matching rows. Insert and commit a thirteenth row, then let the count query start and return thirteen.

For the reverse direction, let the count query return twelve first. Insert a new row that sorts onto the requested page, then release the page query and observe rows from the newer state.

A delete provides both opposite mismatches. The older page can include a row absent from the newer total, or the newer page can omit a row still included by the older count.

Use one writer connection and one reader path. If the test mutation shares transaction state with either read, its visibility may not model another request.

Do not rely on a ten-millisecond sleep between query starts. Load, network delay, and query plans can move both snapshots to the same side of the write.

This sketch shows the desired gate behavior around the two operations. The hooks are test seams, not exports claimed to exist in the current route.

\`\`\`typescript
import { expect, test } from 'vitest';

test('exposes a count taken after the final-page rows', async () => {
  const rowsDone = deferred<void>();
  const releaseCount = deferred<void>();

  const responsePromise = callSkillsGet('?page=3&limit=5&testingType=e2e', {
    afterRows: () => rowsDone.resolve(),
    beforeCount: () => releaseCount.promise,
  });

  await rowsDone.promise;
  await insertMatchingSkillAndCommit({ testingTypes: ['e2e'] });
  releaseCount.resolve();

  const body = await responsePromise;
  expect(body.skills).toHaveLength(2);
  expect(body.total).toBe(13);
  expect(body.total).not.toBe(10 + body.skills.length);
});
\`\`\`

Use the [API testing category](/categories/api-testing) for request harnesses and response checks. Keep barrier logs short: rows started, rows done, writer committed, count started, and response returned.

Postgres pagination count consistency tests should first prove both same-side controls. A mutation before both reads or after both reads must produce a coherent response.

## What Is a Pagination Total Mismatch Test?

A pagination total mismatch test asks whether returned rows and total can belong to one filtered, ordered state. It uses page position to turn broad count plausibility into exact rules.

The final page is the best fixture. Seed twelve matching rows, request page three with limit five, and expect two rows, total twelve, and three total pages.

If the count sees an inserted thirteenth row after the page query, it reports thirteen while the page still has two rows. The exact final-page rule expects twelve and catches the drift.

If the page sees the insert but count remains twelve, the chosen sort determines where that row lands. Set sort fields and IDs so the new row changes the requested page in a known way.

Deletes are clearer when the removed row belongs to the final page. An old page can return two rows while a new count reports eleven, making \`offset + length\` exceed total.

For a middle page, length alone cannot reveal every mixed state. Compare returned IDs with control queries from the before and after snapshots, then show that rows map to one state and total maps to the other.

Filter-changing updates act like a delete from one result set and an insert into another. Change one skill from \`e2e\` to \`unit\` between reads and run both filtered requests.

Nonmatching writes are vital controls. A new skill outside the active filter may commit between statements, but it should not change rows, total, or totalPages.

The route catches database errors and returns an empty success-shaped payload. Keep failure-response tests separate because a query exception is not a snapshot mismatch.

Use the [lazy Neon initialization guide](/blog/testing-lazy-neon-database-initialization-nextjs-build) for connection setup failures. This article assumes both statements succeed and asks whether their successful values agree.

Postgres pagination count consistency should report page, limit, offset, row IDs, total, and both control-state counts. That compact set explains the mismatch without dumping full skill records.

## Postgres Snapshot Consistency API Choices

A Postgres snapshot consistency API can keep the current two-query shape, move both reads into a stable transaction, or return rows and total from one statement. Tests should compare these designs against one response contract.

At PostgreSQL's default Read Committed level, each SELECT sees a snapshot taken when that command begins. The [transaction isolation documentation](https://www.postgresql.org/docs/current/transaction-iso.html) notes that successive commands can see different committed data.

Parallel execution does not create one shared snapshot. Two statements that start on opposite sides of a writer commit can return values from different states even when both finish together.

A plain Read Committed transaction may still give each statement a new snapshot. Do not turn the current test green by checking only that both calls appear inside a callback.

A Repeatable Read transaction can hold one stable view for both reads after its first data statement. Both builders must use the transaction handle, and the test should keep the same timed writer.

The [Drizzle transaction guide](https://orm.drizzle.team/docs/transactions) shows callback-based transaction use. An integration test must still confirm the actual driver and chosen isolation option produce the expected view.

A single query can attach a window count to page rows. One statement gets one snapshot, but an empty page needs special handling because no row exists to carry the count.

Another single-statement shape can return a JSON page and scalar count from subqueries. It avoids the empty-page problem but may have different plans and mapping costs.

Choose the design after defining whether one-snapshot pagination is required. Some high-change feeds accept approximate totals, but their APIs should name that weaker contract instead of implying exact page math.

Use the [Postgres migration guide](/blog/postgres-migration-testing-guide) to compare plans and isolation changes. Keep the same final-page fixture so design tradeoffs do not alter the oracle.

## How Do You Test the Drizzle Count and Rows Query?

A Drizzle count and rows query test verifies shared predicates, stable order, numeric conversion, and page arithmetic. It should run through the route once query-builder unit checks establish the intended calls.

Inspect the source contract first. Both builders receive the exact \`whereClause\`, while only rows receives order, limit, and offset.

Use repeated query parameters for a JSONB filter and a text search together. The row set and count must reflect the same combined expression rather than one branch dropping a condition.

Spy at a level that can identify the two builders without replacing every fluent method. Brittle chain mocks can pass even when their fake sequence no longer matches Drizzle execution.

At integration level, seed matching and nonmatching rows with clear tags. The count should equal only matching rows, and every page member should pass an independent predicate check.

The count expression is \`count(*)\`, returned through a field named \`count\`. The route converts that value with \`Number\`, so test both the normal driver value and a string-like mock if unit coverage owns conversion.

The [PostgreSQL aggregate documentation](https://www.postgresql.org/docs/current/functions-aggregate.html) defines count behavior. Keep the test focused on matching rows rather than assuming an estimate or cached table statistic.

For sorting, seed several equal weekly-install values and confirm descending ID gives a stable tie order. This removes page duplication as a second explanation for count failures.

Request page one, one middle page, the final page, and a page beyond the end. Recalculate totalPages from the same returned total for every response.

Postgres pagination count consistency tests should not assert SQL text alone. The public failure is contradictory JSON, so at least one suite must execute the route against PostgreSQL.

## Concurrent Insert Pagination Drift Cases

Concurrent insert pagination drift depends on filter match, sort position, and statement timing. A new row may alter total, page membership, both, or neither.

A matching insert before both reads should appear in the shared state. Its exact page depends on sort values, but total and totalPages must include it.

A matching insert after both reads should affect neither result. Wait until both statements have acquired or completed their snapshots before committing this control.

An insert between snapshots can make only count newer. The final-page equality then shows a total one greater than offset plus returned length.

The opposite order can make only page rows newer. Choose a row that sorts into the page and displaces a known old member, then compare IDs with the new-state control.

A nonmatching insert should never change the active result. Use a testing type outside the request and confirm both branches keep the old count and IDs.

A filter-changing update needs two views. For the source filter it removes a row, while for the target filter it adds one; both cases should be run with controlled statement order.

A matching delete can reduce totalPages at a boundary. Seed eleven rows with limit five, delete one between reads, and check whether a response mixes three-page rows with a two-page total.

Use unique sort facts for every inserted row. If the new row ties on the primary sort, descending ID still decides placement, but an explicit fixture makes expected movement easier to read.

The [database testing guide](/blog/database-testing-automation-guide) can supply transaction-safe cleanup. Give every row a run tag in searchable fields so a failed case cannot pollute another page.

Postgres pagination count consistency should include at least one insert, delete, and filter update. Each mutation reveals a different way that list membership and scalar count can drift.

## Interleaving, Page Length, Total, and TotalPages Matrix

Postgres pagination count consistency becomes concrete with twelve matching rows, page three, and limit five. The quiet response has two rows, total twelve, and three pages.

| Mutation | Mutation timing | Page rows | Count result | totalPages | Consistency assertion |
|---|---|---:|---:|---:|---|
| No mutation | Both reads use base state | 2 | 12 | 3 | Exact final-page rule passes |
| Matching insert | Rows before, count after | 2 | 13 | 3 | Offset plus length differs from total |
| Nonmatching insert | Between snapshots | 2 | 12 | 3 | Active filter stays coherent |
| Matching delete | Rows before, count after | 2 | 11 | 3 | Returned page exceeds stated total |
| Filter-changing update | Rows after, count before | Depends on sort | 12 | 3 | IDs and total map to different states |
| Boundary delete | Rows before, count after from 11 | 1 | 10 | 2 | Page three conflicts with totalPages |

The table assumes a mutation position chosen by fixture sort values. Record exact IDs for any row-moving case so "depends on sort" never becomes an unchecked result.

The boundary-delete row is especially useful. A response can claim only two pages while returning a row for page three, which is plainly inconsistent to a client.

Add reverse timing for each matching mutation. A full interleaving table guards both branches and proves the barrier can release either query first.

Keep baseline and nonmatching controls in the same report. They show that the harness itself does not force a mismatch on every request.

Use [all QA skills](/skills) to add database and API checks around this matrix. One clear table is easier to maintain than many race tests with hidden fixture arithmetic.

## How Do You Run the Count Consistency Procedure?

The count consistency procedure creates three pages of filtered rows, controls each query start, commits one mutation, and checks the chosen snapshot contract. It repeats with a transaction or single-query design for comparison.

1. Seed twelve skills matching one filter plus several nonmatching controls.
2. Place independent barriers around the rows and count query execution points.
3. Start page three with limit five and release one query first.
4. Commit one insert, delete, or filter-changing update before releasing the other query.
5. Assert rows, total, and totalPages against before and after control states.
6. Repeat through the candidate transaction or single-statement implementation.

Step one should set explicit sort fields and record expected page IDs. Verify the quiet response before any concurrent run.

Step two must control snapshot acquisition, not just promise creation. Confirm the event log shows one read, the writer commit, and the second read in that order.

Step three uses the final page because its length maps exactly to total. Keep a middle-page variant only for ID-level comparison.

Step four performs one mutation per case and waits for commit. A writer that is merely pending cannot define the second statement's expected state.

Step five compares the response with two independently queried states. The helper below covers arithmetic, while fixture-specific checks identify which snapshot supplied each part.

\`\`\`typescript
import { expect } from 'vitest';

function expectPaginationMath(body: {
  skills: Array<{ id: string }>;
  total: number;
  page: number;
  totalPages: number;
}, limit: number) {
  const offset = (body.page - 1) * limit;
  expect(body.skills.length).toBeLessThanOrEqual(limit);
  expect(body.totalPages).toBe(Math.ceil(body.total / limit));

  if (body.skills.length > 0) {
    expect(body.total).toBeGreaterThanOrEqual(offset + body.skills.length);
  }
  if (body.skills.length > 0 && body.skills.length < limit) {
    expect(body.total).toBe(offset + body.skills.length);
  }
}
\`\`\`

Step six keeps request, filter, fixture, and assertions unchanged. Only the read design should vary, which makes the comparison fair.

Run cleanup after both reader and writer finish. Early deletion can create an extra mutation inside the very window being tested.

Use the [API guide](/blog/api-testing-complete-guide) for standard request checks and the [database guide](/blog/database-testing-automation-guide) for concurrent fixture control. Save only IDs and counts in routine failure output.

- twelve matching rows form two full pages and one short page
- nonmatching control rows never enter page IDs or the total
- quiet page three returns two rows total twelve and three pages
- matching insert before both reads appears in both response parts
- matching insert after both reads appears in neither response part
- matching insert between reads exposes the newer count direction
- reverse insert timing exposes the newer page row direction
- matching delete between reads can make returned offset exceed total
- boundary delete can return page three beside only two total pages
- filter update acts as one removal and one insert across two requests
- each row and count branch gets its own start and release gate
- writer commit ends before the second database statement may start
- stable primary sort plus descending ID fixes each expected page
- excessive page stays empty while total and totalPages remain valid
- transaction and one query designs reuse the same fixture and oracle

## Frequently Asked Questions

### Does Promise.all give both queries one database snapshot?

No. Promise.all coordinates JavaScript promises, but it does not create a PostgreSQL transaction or shared snapshot. Each statement follows its connection and isolation rules. A writer commit between their statement starts can therefore make page rows and count reflect different committed states.

### What is the strongest final-page consistency rule?

When a valid final page is nonempty and shorter than the limit, total should equal offset plus returned row count for one exact snapshot. Also require totalPages to equal the ceiling of total divided by limit. Pages beyond the end need a separate empty-page rule.

### Can a transaction still return mixed page and count data?

Yes, if it uses Read Committed, because successive SELECT statements may receive fresh snapshots. Verify the chosen isolation level and ensure both queries use the transaction handle. Repeatable Read or one statement can provide a stable read view for this contract.

### Why must pagination tests control row order too?

An incomplete order can move tied rows between pages even with a correct count, creating duplicates or omissions that resemble snapshot drift. The route adds descending ID after its primary sort. Keep that stable key in the fixture so count consistency has only one cause.

### How should an empty page be interpreted?

A page beyond the last page may validly return no rows while total is positive and below its offset. Do not require total to equal offset in that case. Still verify totalPages arithmetic and compare the total with an independent filtered control snapshot.

### Is a window count always better than two queries?

Not always. One statement supplies one snapshot, but a window count attached to rows cannot carry a total when an excessive offset returns no rows. Query plans and mapping also differ. Compare designs against the same empty-page, final-page, filter, and concurrency tests.

## Conclusion

Postgres pagination count consistency tests should prove that page members, total, and totalPages can describe one filtered and ordered snapshot. Independent query barriers expose mixed reads, while final-page and boundary fixtures turn subtle one-row drift into exact failures.

Browse [database testing skills](/skills) and add a controlled pagination race to CI. Keep the same arithmetic and ID oracles when comparing current parallel reads with a stable transaction or one-statement design.`,
};
