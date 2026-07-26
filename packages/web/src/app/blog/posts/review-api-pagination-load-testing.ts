import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'review API pagination load testing',
  description:
    'Use review API pagination load testing to measure latency, payload growth, database work, and client rendering when every review is returned.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Troubleshooting',
  primaryKeyword: 'review API pagination load testing',
  keywords: [
    'review API pagination load testing',
    'unpaginated review endpoint load test',
    'large review response performance',
    'API payload growth testing',
    'review list rendering benchmark',
    'database query without limit QA',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'authentication-authorization-testing-guide',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/queries-limit.html',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  repoEvidence: [
    'packages/web/src/app/api/reviews/route.ts',
    'packages/web/src/components/skills/review-section.tsx',
    'packages/web/src/db/schema/relations.ts',
  ],
  content: `Review API pagination load testing measures how response time, bytes, query work, parsing, and rendering grow when one request returns every review. Seed fixed data sets, warm the same path, and collect repeated samples at controlled concurrency. Compare those results with a paged prototype before setting any acceptance limit.

The current GET handler in \`packages/web/src/app/api/reviews/route.ts\` filters by skill, joins user data, orders by creation time, and returns all matching rows. It also runs a second aggregate query. The client then stores and maps the full review array, so server and browser costs need separate measurements.

## What Must Review API Pagination Load Testing Measure?

Review API pagination load testing must measure each stage that grows with row count. Record database query time, route time, response bytes, parse time, rendered review nodes, commit time, memory when available, and errors. Do not replace these facts with one end-to-end average.

The route returns review fields plus a nested user object for every row. It also returns \`averageRating\` and \`totalReviews\` from a separate query. The list length and total should agree for a stable isolated fixture because the list is currently unpaged.

The source query has no \`limit\`, \`offset\`, or cursor clause. It orders rows by descending creation time after joining the user table. Tests should confirm this repository fact before they assume that a page parameter has any effect.

The schema in \`packages/web/src/db/schema/relations.ts\` gives each review a text comment, rating, helpful count, two timestamps, and foreign keys. Comment size can change payload growth even when row count stays fixed. Use both short and near-limit text profiles.

The client in \`packages/web/src/components/skills/review-section.tsx\` fetches once, places the full array in state, and maps every item into markup. A route benchmark cannot measure that React work. A component benchmark cannot explain database or transfer cost.

Keep load and stress goals apart. The first study describes growth under expected sample levels, while a stress run seeks a failure boundary. This article does not invent traffic, latency, memory, or row-count limits for the product.

The [performance monitoring guide](/blog/performance-monitoring-testing-guide) can help select timers and traces. This focused suite should still preserve row count, bytes, and result correctness beside each time sample.

## How Do You Run an Unpaginated Review Endpoint Load Test?

An unpaginated review endpoint load test seeds one skill with data sets that rise by a fixed order, then requests that same skill many times. Warm the app and database before samples. Keep client concurrency fixed while row count changes.

Use zero, ten, one hundred, and one thousand rows as analysis stages only when the test environment can hold them. Add a large-comment stage at one chosen count. These are fixture sizes from the brief, not published service limits.

Give every review its own user because the product blocks duplicate user-skill reviews on writes. Direct database seeding may be faster, but it must still create valid foreign keys and realistic selected fields. Validate ten seeded rows through the normal read shape before scaling.

Measure status, body bytes, and elapsed time for every request. Parse JSON after recording transfer completion, then check list length, total count, order, and required nested user fields. Failed correctness samples should not enter latency summaries as normal successes.

\`\`\`typescript
type Sample = {
  status: number;
  bytes: number;
  requestMs: number;
  parseMs: number;
  reviews: number;
};

async function sampleReviews(skillId: string): Promise<Sample> {
  const started = performance.now();
  const response = await fetch(
    \`http://test.local/api/reviews?skillId=\${encodeURIComponent(skillId)}\`,
  );
  const text = await response.text();
  const received = performance.now();
  const body = JSON.parse(text) as { reviews: unknown[]; totalReviews: number };
  const parsed = performance.now();

  expect(body.reviews).toHaveLength(body.totalReviews);
  return {
    status: response.status,
    bytes: new TextEncoder().encode(text).byteLength,
    requestMs: received - started,
    parseMs: parsed - received,
    reviews: body.reviews.length,
  };
}
\`\`\`

Use the same clock source for every sample and report the runtime version. The code measures client-observed request time, not database time. Add server tracing or direct query timing when the study needs to split those layers.

Warm with a few unrecorded requests after each new data set is seeded. Keep warmup count fixed and note whether application, database, or network caches are present. Do not compare a cold first request with warm later pages.

Run enough repeated samples to show a distribution, then report median and a high percentile with raw counts. Avoid choosing a sample count after seeing favorable results. Save error totals and timeouts beside successful samples.

The [load testing guide](/blog/load-testing-beginners-guide) can support workload design. This route case should hold offered concurrency steady until the row-growth curve is understood.

## What Drives Large Review Response Performance?

Large review response performance comes from several steps, not one query. PostgreSQL scans matching reviews, joins user rows, sorts by creation time, and builds results. The server maps rows, serializes JSON, transfers bytes, and the browser parses plus renders them.

The second aggregate query counts rows and computes an average rating. It can add database work even though its response stays small. Measure it separately when tracing allows, because list and aggregate costs may grow in different ways.

Selected comments can reach the application limit, so payload size is not constant per row. Create one short profile and one long profile with the same row count. This isolates text size from join, sort, and component-count growth.

User names and avatar links also affect bytes. Fix them to known lengths in the core data set, then vary one field only in a follow-up case. Random profile data makes runs harder to compare and adds no useful realism.

JSON serialization and parsing grow with the representation size. [RFC 9110](https://www.rfc-editor.org/info/rfc9110) defines HTTP semantics for representations and responses, but it does not choose an application page size. Measure the actual response bytes sent by this route.

Compression can lower transfer bytes while server serialization and browser expansion still process the full content. Record both encoded wire size and decoded body size when the environment supports them. Do not claim compression solves unbounded work.

Review API pagination load testing should verify order throughout the run. The handler orders newest first, so seed distinct timestamps and inspect the first and last IDs. A fast response with missing or shuffled data is not a pass.

Use the [API testing guide](/blog/api-testing-complete-guide) for contract checks around performance samples. Keep correctness assertions light but exact enough to reject incomplete data.

## API Payload Growth Testing

API payload growth testing measures encoded bytes per response and estimates bytes per returned row from real samples. It should not assume a constant ratio because comments, names, timestamps, and JSON punctuation vary. Save both row count and content profile.

Start with the empty response to capture fixed JSON overhead. Add ten short rows, then larger sets with the same field lengths. Subtracting the empty size can help compare marginal growth without presenting it as a universal byte cost.

Use \`TextEncoder\` on the received text for decoded UTF-8 bytes. If a live server compresses content, also read response headers and collect transfer data from the chosen load tool. State which byte measure appears in each chart.

Check \`reviews.length === totalReviews\` for every isolated sample. That equality reflects the current unpaged route and can change after pagination is added. A paged contract should instead compare list length with page size while total remains global.

Do not print full large responses into logs. Store counts, checksums when needed, first and last IDs, and a short failure excerpt. Large CI logs can hide the useful timing and error data.

Compare short and long comment profiles at the same row count. If time changes, the result points toward serialization, transfer, parsing, or text rendering rather than only database row work. Server traces can then narrow the cause.

The [error handling guide](/blog/error-handling-testing-patterns) helps keep timeout, parse, and status failures distinct. A non-JSON error page should not be counted as a small successful review payload.

## How Do You Build a Review List Rendering Benchmark?

A review list rendering benchmark gives the client a controlled array without network delay, then measures React commit time and rendered item count. Run it for the same row sizes used by the API study. This isolates DOM growth from request and parse work.

The component creates one bordered item per review and may create comment markup, stars, user text, and an avatar. It does not show virtualization or incremental page loading in the cited code. Count rendered list items and key child elements after each commit.

Mock \`fetch\` with a ready parsed payload or refactor a pure list child for the benchmark. Keep the fetch effect out of measured time when the goal is rendering alone. A separate browser journey can measure the full path.

\`\`\`tsx
import { Profiler } from 'react';
import { render, screen, waitFor } from '@testing-library/react';

const commits: number[] = [];
fetchMock.mockResolvedValue(
  jsonResponse({ reviews: makeReviews(rowCount), averageRating: 4.2, totalReviews: rowCount }),
);

render(
  <Profiler id="reviews" onRender={(_id, _phase, duration) => commits.push(duration)}>
    <ReviewSection skillId="load-fixture" />
  </Profiler>,
);

await waitFor(() => {
  expect(screen.getAllByTestId('review-item')).toHaveLength(rowCount);
});
expect(commits.length).toBeGreaterThan(0);
\`\`\`

The current component does not expose the sample test ID, so use a stable accessible query or add test support in a separate implementation change. Do not count generic \`div\` nodes because layout refactors can change them without altering review count.

React profiler duration is useful for comparisons in one controlled setup, not as a production guarantee. Record browser, React mode, hardware class, build type, and sample count. Development mode can behave differently from a production build.

Comments with line breaks or near-limit text can affect layout and paint cost. Keep one short-text run for component-count growth and one long-text run for content growth. Measure viewport and browser work separately when possible.

Review API pagination load testing should connect browser results to API shapes by using the same generated records. Shared deterministic data reduces mistakes, while separate timers preserve each layer. Never add request duration to profiler duration and call the sum a measured page metric without a real journey.

The [React and Next.js testing guide](/blog/react-nextjs-testing-complete-guide) can help structure the component harness. Keep final assertions tied to visible review count and order.

## Database Query Without Limit QA

Database query without limit QA begins by proving that no page bound reaches the SQL query. Inspect \`packages/web/src/app/api/reviews/route.ts\`, send plausible page parameters, and confirm the returned list is unchanged. That characterization prevents a false belief that pagination already exists.

Use \`EXPLAIN (ANALYZE, BUFFERS)\` only in an isolated non-production environment with representative data. Save the plan, actual rows, sort method, and buffer facts. Do not turn one local plan into a claim about every production data set.

PostgreSQL explains row limiting and order concerns in its [LIMIT and OFFSET documentation](https://www.postgresql.org/docs/current/queries-limit.html). A future page query needs a deterministic order, especially when several reviews share a timestamp. Add a unique tie breaker or cursor rule and test it.

Offset pagination is easy to call but can repeat or skip rows when new reviews arrive between requests. Cursor pagination needs a stable key and clear direction. Build correctness tests for inserts between pages before selecting one solely from benchmark speed.

The aggregate total has a separate role after pagination. It can remain a global count while \`reviews\` contains only one page. Update response contract tests and the component together so total does not get mistaken for current page length.

Indexes and data shape affect the query plan. Record existing indexes from the test database rather than proposing one from response time alone. Any index change needs write-cost, plan, and migration checks.

Use the [database testing guide](/blog/database-testing-automation-guide) for plan capture and stable fixtures. The first acceptance target should come from measured user and system needs, not an arbitrary number in this article.

## Review Count, Payload, and Latency Results Table

This table is a result sheet, not a set of fabricated benchmarks. Populate each timing cell from repeated successful samples and keep errors visible. Add environment and build details directly above the stored report.

| Review rows | Comment profile | Response bytes | Server p50 | Server p95 | Render time | Errors |
|---:|---|---:|---:|---:|---:|---:|
| 0 | Empty control | Record | Record | Record | Record | Record |
| 10 | Short fixed text | Record | Record | Record | Record | Record |
| 100 | Short fixed text | Record | Record | Record | Record | Record |
| 1000 | Short fixed text | Record | Record | Record | Record | Record |
| Chosen fixed count | Large comments | Record | Record | Record | Record | Record |

Store request and render samples separately even when the table displays both. The server columns should not include component profiler work. The render column should not include database warmup or network transfer.

If a data set causes failures, preserve it rather than reporting only successful percentiles. Count timeouts, non-200 responses, parse failures, and incorrect list lengths. Explain which samples were excluded from time summaries.

Use the empty and ten-row cases to validate the harness. Their results should include correct totals, ordered IDs, and rendered counts. Fix those facts before collecting large samples.

The large-comment row isolates payload shape at one row count. Keep every other field and test setting fixed. A second row can vary avatars later, but it should not blur the first comparison.

Browse [performance testing skills](/skills) for load drivers and report tooling. Keep this compact matrix with the route so future pagination work can rerun it against the same fixtures.

## How Do You Run the End-to-End Load Procedure?

Run the end-to-end procedure in a stable test environment with one seeded skill per data set. Warm each stage, collect API samples, render the returned arrays, inspect query plans, and clean all rows. Compare a paged prototype with the same data and clocks.

1. Seed one skill with review sets that increase by a fixed order of magnitude.
2. Validate row ownership, user joins, comment profile, and distinct creation order.
3. Warm the application and database with a fixed number of discarded requests.
4. Request the GET route repeatedly at one controlled client concurrency level.
5. Record status, bytes, route time, parse time, list count, total, and errors.
6. Render each controlled array and record commit samples plus item counts.
7. Inspect representative database plans in the isolated test environment.
8. Compare the same workload with an explicit paged response and client design.

### Save one comparable result set

- The commit, runtime, build mode, database version, and host class used for the full sample run
- The skill identifier and exact seeded row count, plus proof that no other review rows share that identifier
- The short or large comment profile with fixed text lengths, fixed user fields, and known creation time order
- The number of warm requests discarded before each stage and the cache state that those calls were meant to warm
- The client concurrency, request count, timeout, and pause rule held fixed while only the review row count changed
- Each response status and content type before JSON parsing, with non-JSON bodies kept out of successful timing sets
- The encoded transfer size when available and the decoded UTF-8 body bytes measured by the same tool for all stages
- The route duration, parse duration, review array length, global total, first identifier, and last identifier for each call
- The raw successful time samples used to calculate p50 and p95, with the sample count shown beside both summary values
- The count of timeouts, HTTP errors, parse faults, wrong totals, missing rows, and bad order found at each data size
- The database plan, actual row count, sort facts, and buffer facts for each large data shape chosen for plan review
- The number of aggregate and list queries traced per request, so later code changes do not hide added database work
- The browser name, viewport, React build mode, and machine class used for all review list render samples
- Each profiler commit duration and final review item count, saved apart from request, transfer, and JSON parse time
- The same first and last review identifiers in the API payload and rendered list, proving the client kept server order
- The page size, cursor or offset, stable tie breaker, and traversal result used by the paged comparison design
- The cleanup query result for reviews, users, and the skill, with zero scoped rows required before another stage starts
- The SQL isolation and pool settings used by the run, recorded without changing them between selected row-count stages
- The load tool and clock source used for request samples, with one unit and one rounding rule across all reports
- The data seed duration kept outside route latency, yet saved so fixture cost can be planned for later test runs
- The final unpaged and paged result files under distinct names, preventing one smaller response from replacing base evidence
- The owner and date for each saved run so an old result is not read as proof for new route code

First, seed through direct database helpers for speed, but verify the rows match production constraints. Each review needs a valid user and skill. Use unique timestamps when order checks require an unambiguous sequence.

Second, warm every stage the same way. A newly seeded large set can change database pages and compiled paths. Document all caches rather than clearing some between selected runs.

Third, collect raw per-request samples before calculating summaries. Keep one fixed concurrency while row count changes, then vary concurrency in a later study. This order makes the first growth curve easier to explain.

Fourth, feed the exact response arrays into the browser benchmark. Confirm rendered count, first ID, and last ID before trusting duration. Save development and production build results separately.

Fifth, prototype pagination with a stable order and defined cursor or offset rules. Run page traversal checks, concurrent-insert checks, and the same load stages. Compare total work for the user journey, not just one smaller response.

Finally, remove seeded users and the skill, then confirm no review rows remain. Review API pagination load testing needs clean starts because leftover rows change every payload and count assertion.

Use the [API testing category](/categories/api-testing) to find request and contract helpers. Pair it with [QA skills](/skills) for repeatable data generation and browser measurement.

## Frequently Asked Questions

### When does an API need pagination?

There is no universal review count that answers this question. Measure response growth, database work, browser cost, user needs, and acceptable delay in the target environment. Pagination becomes a sound change when those facts show unbounded retrieval violates a defined product or service goal.

### Why report percentiles instead of one average?

An average can hide slow samples caused by sorting, locks, garbage collection, or browser commits. Median and a high percentile show more of the distribution, while raw error counts prevent failed requests from disappearing. Always state sample count and the method used to calculate each value.

### Is cursor pagination always better than offset pagination?

No. Cursor pages can stay stable during inserts when based on a sound unique order, while offsets can be simpler for direct page access. Both need contract tests. Compare traversal, changing data, query plans, client needs, and implementation cost before choosing either design.

### What is the difference between load and stress testing?

A load test measures behavior under a planned workload and known data set. A stress test raises pressure until service quality breaks or recovery becomes the focus. Keep them separate because they use different questions, stop rules, environments, and interpretations of errors.

### Does response compression remove the pagination need?

Compression may reduce wire bytes, but the database can still fetch all rows, the server still builds a large representation, and the browser still parses expanded data. Measure encoded and decoded sizes plus work at every layer. Compression changes one cost, not the unbounded contract.

### Should test comments all have the same length?

Use fixed lengths for the main growth curve so row count is the controlled variable. Add a second profile with large comments at one fixed count. Random text makes runs hard to compare and can mix payload effects with database and component-count effects.

### How do totals work after pagination is added?

The response can keep a global total while returning only one page of reviews. Tests should then compare list length with the requested page size and verify total through the aggregate contract. The component must not assume that total equals the current array length.

## Conclusion

Review API pagination load testing turns an unbounded read path into measured server, payload, and browser growth. Keep query time, response bytes, parse work, rendered items, and errors separate so the largest cost can be addressed directly.

Use fixed data profiles, exact correctness checks, warm samples, and a stable environment before choosing a page design. Compare the same fixtures with pagination and test ordering under concurrent inserts.

Browse [API and performance testing skills](/skills) before setting a review pagination target. Reuse the [database testing guide](/blog/database-testing-automation-guide) when plan evidence or seeded row cleanup needs a repeatable workflow.`,
};
