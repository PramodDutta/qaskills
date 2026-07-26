import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'empty review statistics contract testing',
  description:
    'Use empty review statistics contract testing to verify an empty list, zero average, and zero total before a skill receives its first review.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'empty review statistics contract testing',
  keywords: [
    'empty review statistics contract testing',
    'no reviews API response',
    'null AVG fallback test',
    'empty review list contract',
    'zero total reviews assertion',
    'first review state testing',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'authentication-authorization-testing-guide',
    'error-handling-testing-patterns',
  ],
  repoEvidence: [
    'packages/web/src/app/api/reviews/route.ts',
    'packages/web/src/db/schema/relations.ts',
    'packages/web/src/components/skills/review-section.tsx',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/functions-aggregate.html',
    'https://www.rfc-editor.org/info/rfc8259',
  ],
  content: `Empty review statistics contract testing proves that a valid skill with no reviews returns an empty array, numeric zero for \`averageRating\`, and numeric zero for \`totalReviews\`. It also separates that successful empty state from a missing query value or a failed database call, which require different status codes.

The contract is implemented in \`packages/web/src/app/api/reviews/route.ts\` and consumed by \`packages/web/src/components/skills/review-section.tsx\`. The database shape in \`packages/web/src/db/schema/relations.ts\` explains why an empty aggregate needs an explicit fallback before JSON serialization.

## What Must Empty Review Statistics Contract Testing Prove?

Empty review statistics contract testing must prove one exact success shape for an existing skill that has no matching review rows. The route should answer with status 200, \`reviews: []\`, \`averageRating: 0\`, and \`totalReviews: 0\`. Each value needs a type assertion as well as a value assertion.

The test must not confuse emptiness with invalid input. A request without \`skillId\` exits before database work and returns status 400 with \`skillId query parameter is required\`. That branch belongs beside the empty case in the suite, but it does not share the same expected body.

A database exception is also distinct. Both the review-list query and aggregate query sit inside one \`try\` block, so either rejection leads to status 500 and \`Failed to fetch reviews\`. The [error handling testing guide](/blog/error-handling-testing-patterns) helps define that failure oracle without weakening the successful empty response.

The current GET route does not first verify that a skill row exists. Therefore, an unknown but well-formed identifier can produce the same empty statistics as a known skill with no reviews. Tests should record that current behavior instead of inventing a 404 response that the code never creates.

The client contract matters too. \`ReviewSection\` initializes all three values to empty or zero, then replaces them from the response. When \`totalReviews === 0\`, it displays a first-review prompt rather than the average summary. The [API testing guide](/blog/api-testing-complete-guide) provides wider response checks, while this case owns the exact zero state.

## What Should a No Reviews API Response Contain?

A no reviews API response should contain three stable fields with no nullable aggregate values. The \`reviews\` field is an array, even when it has no items. Both statistic fields are JSON numbers, and their zero values mean that no review contributes to the selected skill.

Assert the whole object first, then add focused type checks. A deep equality assertion catches missing or extra top-level data, while \`typeof\` checks give a clear failure when a driver value becomes \`"0"\`. Array checks distinguish \`[]\` from \`null\`, an omitted property, or an object with numeric keys.

\`\`\`typescript
import { expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reviews/route';
import { db } from '@/db';

test('returns the exact empty review contract', async () => {
  vi.mocked(db.select)
    .mockReturnValueOnce(reviewQueryReturning([]))
    .mockReturnValueOnce(statsQueryReturning([{ averageRating: null, totalReviews: 0 }]));

  const response = await GET(
    new NextRequest('http://local.test/api/reviews?skillId=00000000-0000-4000-8000-000000000001'),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body).toEqual({ reviews: [], averageRating: 0, totalReviews: 0 });
  expect(Array.isArray(body.reviews)).toBe(true);
  expect(typeof body.averageRating).toBe('number');
  expect(typeof body.totalReviews).toBe('number');
});
\`\`\`

The helper names above represent the repository's chained Drizzle mock adapter, not production functions. A route integration test can instead seed PostgreSQL and call the handler through HTTP. Either style must preserve the two-query order used in \`packages/web/src/app/api/reviews/route.ts\`.

Do not assert only that the fields are falsy. Empty arrays are truthy, while zero, \`null\`, \`undefined\`, and an empty string are all easy to blur with broad checks. Exact values make a no reviews API response useful to the UI and any other consumer.

Use the [skills catalog](/skills) to inspect the visible first-review state after the API case passes. Browser confirmation is useful, but it cannot replace a direct JSON assertion because the component may initialize the same zeros before a failed request completes.

## How Do You Build a Null AVG Fallback Test?

A null AVG fallback test should make the aggregate query return the value PostgreSQL produces for an empty input, then verify the route converts it to numeric zero. It should also return a zero count, because the endpoint combines both values into one response after the list query finishes.

The [PostgreSQL aggregate documentation](https://www.postgresql.org/docs/current/functions-aggregate.html) states that, except for \`count\`, aggregate functions return null when no rows are selected. That rule explains why \`avg(reviews.rating)\` needs a fallback while \`count(reviews.id)\` naturally represents zero. The route still converts both outputs explicitly.

In the route, a truthy \`averageRating\` value is converted with \`Number\`, rounded to one decimal place, and parsed back to a number. A null value takes the other branch and becomes zero. The count value passes through \`Number(statsResult[0]?.totalReviews || 0)\`, which also covers a missing aggregate row.

Test at least three aggregate fixtures. Use \`[{ averageRating: null, totalReviews: 0 }]\` for the normal database result, \`[]\` for defensive missing-row coverage, and a nonempty control such as \`[{ averageRating: '4.3333', totalReviews: 3 }]\`. The control should yield \`4.3\` and \`3\`, proving that the fallback does not erase valid data.

Keep the list fixture empty for the first two cases. Then use matching review rows for the control, so list length and total do not contradict each other. The [database testing guide](/blog/database-testing-automation-guide) explains why controls are needed when a negative case could pass without reaching the intended query.

Empty review statistics contract testing should also cover the value \`"0"\` if a driver adapter can supply it. That string is truthy, but the route converts and rounds it to numeric zero. This test protects the JSON type even when database adapters expose aggregate values as strings.

Do not mock \`avg\` itself. The valuable seam is the query result entering the route, because the Drizzle expression builder is not the behavior sent to clients. A real PostgreSQL integration case should remain in the suite to detect driver or migration changes that a mock cannot see.

## Empty Review List Contract Across Query Outcomes

The empty review list contract needs separate expectations for zero rows, hidden rows, bad requests, and query failures. A single test named "returns no reviews" cannot show which database path ran or why the array is empty. Clear fixtures prevent a false success from masking missing user data.

The list query uses an inner join from reviews to users. A review row whose user relation is absent would not appear in \`reviewRows\`, while the independent aggregate query still counts that review by \`skillId\`. Normal foreign keys should prevent such an orphan, but disabled constraints or damaged fixtures can expose the mismatch.

That join detail creates a useful integrity case. Seed one valid review and user, then verify both list length and total equal one. If a test environment can create an orphan by bypassing constraints, expect list length zero and total one, and treat the mismatch as database corruption rather than a valid empty contract.

An unknown skill identifier takes the same query path as a known empty skill. Because the route filters only the reviews table, both queries can return no rows without checking \`skills\`. Empty review statistics contract testing should document status 200 for that present implementation, then use a separate product decision if 404 behavior is desired.

A missing query parameter takes no query path. Spy on the database and assert zero calls along with status 400. This proves validation occurs before data access and avoids spending a connection on an invalid request.

For failures, reject each query in its own test. A rejected list query should prevent the aggregate query from starting, while a rejected aggregate query occurs after the list has completed. Both return the same 500 body today, but call-order assertions identify the broken operation.

The [authentication and authorization guide](/blog/authentication-authorization-testing-guide) is relevant only to POST review creation. GET review statistics is public in this route. Do not add an authentication fixture to the empty GET contract, since that would test middleware assumptions instead of this handler.

## How Do You Write a Zero Total Reviews Assertion?

A zero total reviews assertion should check the field's presence, numeric type, exact value, and agreement with the returned list. This combination rejects \`"0"\`, \`null\`, \`undefined\`, a stale positive count, and a missing key with messages that point to the actual contract fault.

Start with \`expect(body).toHaveProperty('totalReviews', 0)\`, then check \`typeof body.totalReviews\`. Add \`expect(body.totalReviews).toBe(body.reviews.length)\` for the empty fixture. That last check is valid when all seeded reviews have valid joined users, which the fixture should guarantee.

Avoid \`toBeFalsy()\`, loose equality, or numeric coercion inside the assertion. Those approaches can let several invalid representations pass. The endpoint is responsible for conversion before serialization, so the test should observe the finished JSON rather than repair it.

The [JSON specification](https://www.rfc-editor.org/info/rfc8259) defines a number grammar but does not distinguish integer and floating runtime types. JavaScript parses both as \`number\`. For this field, assert a number equal to zero; do not claim that JSON carries a separate integer type marker.

Add a stale-data guard around the request. Query the review table directly before calling GET, and assert there are no rows for the fixture skill. If the response then reports a positive total, the fault is in aggregation or caching rather than test setup.

The route does not cache this response, so stale totals should not arise from an application cache in current code. However, a shared database can contain rows from another test when fixture IDs are reused. Unique IDs or transaction rollback keep the zero total reviews assertion independent.

Empty review statistics contract testing benefits from diagnostic messages that include the skill ID, direct row count, response body, and status. Keep personal user data out of logs. A small JSON summary is enough to distinguish fixture pollution from a serialization regression.

Use the [API testing category](/categories/api-testing) to find assertion patterns that fit the project's test runner. The essential rule remains exactness: a successful empty response contains numeric zero, not merely a value that JavaScript treats as false.

## First Review State Testing

First review state testing proves that the endpoint moves all three outputs together after one valid insert. Begin with the exact empty assertion, add one review tied to a real user and the same skill, call GET again, and expect one list item, a count of one, and an average equal to its rating.

This transition is stronger than two unrelated fixtures. It shows that the first request observes no rows, the insert changes the intended relation, and the second request sees fresh data. It also detects accidental caching or a query filtered by the wrong skill identifier.

\`\`\`typescript
import { eq } from 'drizzle-orm';
import { reviews } from '@/db/schema';

const before = await getReviews(targetSkillId);
expect(before).toEqual({ reviews: [], averageRating: 0, totalReviews: 0 });

await db.insert(reviews).values({
  skillId: targetSkillId,
  userId: reviewerId,
  rating: 4,
  comment: 'Clear setup and useful checks.',
});

const after = await getReviews(targetSkillId);
expect(after.totalReviews).toBe(1);
expect(after.averageRating).toBe(4);
expect(after.reviews).toHaveLength(1);
expect(after.reviews[0]).toMatchObject({ rating: 4, comment: 'Clear setup and useful checks.' });

const stored = await db.select().from(reviews).where(eq(reviews.skillId, targetSkillId));
expect(stored).toHaveLength(1);
\`\`\`

The relation schema sets \`helpfulCount\` to zero and timestamps to the current database time. The GET mapper nests user name, avatar, and username beneath \`user\`. Assert these fields when the integration fixture controls them, but avoid fixed timestamps unless the database clock is also controlled.

Run a control query for a second skill before and after the insert. Its empty response must stay unchanged. This proves the transition is scoped by \`reviews.skillId\` and did not leak into another catalog entry.

The UI refreshes reviews after a successful POST by calling \`fetchReviews\` again. A component test can confirm the first-review prompt changes to the summary and list. The [skills directory](/skills) is useful for a final manual check, but the API transition remains the authoritative regression.

Repeat the pair once with ratings two and five in separate transactions. The average should equal each single rating exactly. Multi-review averaging belongs to another case, while first review state testing focuses on the zero-to-one boundary.

## Empty-State Input and Response Matrix

The matrix below keeps successful emptiness apart from invalid input and operational failure. It also records the current unknown-skill behavior, which follows from the absence of a skill lookup in the GET handler.

| Fixture | Request | HTTP status | reviews | averageRating | totalReviews |
|---|---|---:|---|---:|---:|
| Valid skill with no reviews | GET with known skill ID | 200 | Empty array | 0 | 0 |
| Valid skill after first review | GET with same skill ID | 200 | One mapped item | Submitted rating | 1 |
| Unknown skill UUID | GET with unknown ID | 200 | Empty array | 0 | 0 |
| Missing skillId | GET without query value | 400 | Not returned | Not returned | Not returned |
| Database query failure | GET with valid query value | 500 | Not returned | Not returned | Not returned |

For the valid empty row, prove the parent skill exists with a direct query before the request. That setup distinguishes a real first-review state from the route's current treatment of an unknown ID. Keep the unknown row as a separate contract decision.

For the first-review row, use one user because the list query requires its inner join. Assert the nested user object as well as statistics. This catches a join mapping fault that a count-only test would miss.

For missing input, check the exact error string and prove the database mock has no calls. For a database failure, check the stable public message but do not expose the thrown database text in the response. The [error handling guide](/blog/error-handling-testing-patterns) covers safe failure details.

Empty review statistics contract testing should run every matrix row against a fresh fixture or a rolled-back transaction. Shared rows can turn the first line into a nonempty result and create a confusing test failure. Record target IDs in assertion messages rather than using one hard-coded catalog record.

The matrix is an oracle, not a proposal. If the product later adds a skill existence check, update the unknown-skill expectation to the chosen status and body in the same change. Do not silently keep a test that accepts both 200 and 404.

## How Do You Run the Empty-State Procedure?

Run the empty-state procedure with a real parent skill, a real user for the transition, and no review rows at the starting boundary. Confirm database state before each request, then assert the complete JSON body and status rather than isolated values.

1. Seed a skill and user without inserting any review rows.
2. Call GET with the seeded skill ID.
3. Assert status 200 and the exact empty array plus numeric zeros.
4. Query the review table directly and prove the fixture has zero matching rows.
5. Insert one review for the seeded user and skill.
6. Call GET again and assert list, average, and total move together.
7. Delete or roll back every fixture before the next case starts.

Use one transaction when the route test can share its database connection. If the handler uses another connection, committed fixtures plus unique IDs and explicit cleanup are easier to reason about. The [database automation guide](/blog/database-testing-automation-guide) compares these isolation choices.

Capture the response body once. Calling \`response.json()\` twice is not valid because the body stream has already been consumed. Store the parsed object, then run deep equality, type, and consistency assertions against that value.

Keep request construction realistic. A \`NextRequest\` with an absolute URL exercises \`new URL(request.url)\` and its search parameters. Encode the skill ID even though a UUID has no unsafe query characters, since production client code also uses \`encodeURIComponent\`.

The first request should happen before the insert, not against a second prebuilt database snapshot. This order makes stale state visible. The second request should use the same route process so any accidental module cache also participates.

Add focused failure cases after the main transition passes. Remove the query parameter, reject the first database operation, and reject the aggregate operation. These cases should not weaken the direct success assertions by allowing several statuses in one test.

Empty review statistics contract testing is ready for CI when it has no production dependency, no shared skill slug, and no timing sleep. Use deterministic records and await each database write. A retry can hide transaction visibility bugs, so fix isolation instead of waiting for eventual success.

Run the API package tests before a UI smoke check. Then open a newly seeded skill through the [API testing catalog](/categories/api-testing) workflow and confirm the first-review message appears. The UI check validates presentation, while the route suite protects the data contract.

### Read a failed empty-state run

When the first check fails, read the stored review rows before you inspect the route mock. A stray row means the seed is not clean, so fix that seed first. Do not raise the expected count just to make shared test data pass.

If the row count is zero but the list has data, print the exact skill ID used by both paths. The request may point at one skill while the direct query checks a second skill. One clear ID in each failure line can show that mix at once.

If the list is empty but the total is not zero, inspect the user join next. A bad review can count in the sum while its user is gone from the list. Repair the foreign key state before you change the route result or its test.

If the mean is null in JSON, trace the value after the aggregate query returns. The route should turn that null into zero before it builds the response. Keep the raw query value and final body side by side in the failed check.

If the count is a string, check the point where the route calls \`Number\`. The test should not cast the field for the route or hide the wrong type. A client needs one stable number on both the empty and first-review calls.

A status 400 points to the request URL, not to the empty database state. Print the full path without secrets and check that \`skillId\` has a value. The database spy should have no calls when this guard stops the request.

A status 500 needs the name of the query that failed, but not its raw private data. Mark whether list load or aggregate load threw, then show the public response. This split keeps logs safe and still tells the team where to start.

If the first request passes but the next request stays empty, query the inserted row by both skill and user. Confirm that the write was awaited and became visible to the route connection. Do not add a sleep when a clear transaction rule can fix the test.

If the second request shows one row but a zero total, compare the two query filters. They should use the same skill ID and see the same committed state. A focused log of filters and counts is more useful than a full database dump.

Run the control skill through the same two calls when a scope fault is hard to find. Its values should stay empty while the target moves from zero to one. That small contrast can expose a broad insert, wrong ID, or reused mock result.

Keep each failed case short enough to read in CI. Show case name, status, target ID, direct count, list length, mean, and total. Those facts can sort seed faults, join faults, type faults, and route faults without any filler output.

Empty review statistics contract testing is done only when the failed check points to one useful next step. Clear test output is part of the contract because a vague snapshot can slow repair. The same facts also make local and CI runs easy to compare.

## Frequently Asked Questions

### Why does PostgreSQL AVG return null for no reviews?

PostgreSQL returns null for most aggregates when no input rows are selected, while \`count\` returns zero. The route therefore converts the absent average into numeric zero before building JSON. A test should fixture that database result directly and keep a real integration case for driver behavior.

### Should totalReviews be a number or a numeric string?

It should be a JavaScript number equal to zero in the parsed response. Database drivers may expose aggregate values in different forms, but the route calls \`Number\` before serialization. Assert both \`typeof value === 'number'\` and strict equality so a string cannot pass.

### Does an unknown skill return the same empty review list contract?

It does with the current GET implementation because the handler filters reviews without checking the skills table first. A well-formed unknown identifier can therefore return status 200 and zero statistics. If product requirements demand 404, add a skill lookup and change the test explicitly.

### Can an inner join hide a review from the returned list?

Yes, the list query uses an inner join with users, so a review lacking a matching user would be omitted. The aggregate query counts reviews without that join, which can expose a mismatch. Foreign keys should prevent this state, but integrity tests should still use valid users.

### What should first review state testing assert?

Assert the exact empty response, insert one valid review, then request the same skill again. The list length and total should become one, while the average should equal the submitted rating. Also query storage directly so an unrelated mocked response cannot produce a false pass.

### Should the empty GET request require authentication?

No authentication call appears in the GET handler, so its review statistics are public at this boundary. Authentication is required by the POST path before a review can be created. Keep access-control checks separate from the empty response unless middleware changes the deployed route.

## Conclusion

Empty review statistics contract testing fixes one precise baseline: an empty array and two numeric zeros for a valid skill before its first review. Pair that baseline with a zero-to-one transition, exact input failures, and direct database checks so null aggregates or stale counts cannot reach clients.

Browse [API testing skills](/skills) and add this empty-review matrix to the route regression suite. Then use the [API testing guide](/blog/api-testing-complete-guide) to connect the contract with broader status, schema, and failure coverage.`,
};
