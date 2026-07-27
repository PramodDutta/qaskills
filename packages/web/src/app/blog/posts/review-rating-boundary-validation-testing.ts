import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'review rating boundary validation testing',
  description:
    'Use review rating boundary validation testing to cover missing, fractional, string, and out-of-range values around the accepted one-to-five range.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'review rating boundary validation testing',
  keywords: [
    'review rating boundary validation testing',
    'review API rating validation',
    'integer rating boundary test',
    'one to five rating QA',
    'fractional review rating rejection',
    'missing rating response test',
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
    'packages/web/src/lib/auth.ts',
  ],
  sources: [
    'https://www.rfc-editor.org/info/rfc9110',
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
  ],
  content: `Review rating boundary validation testing proves that only whole numbers from one through five reach review storage. Missing, null, string, fractional, zero, and six values must return status 400 before any user, skill, duplicate-review, or insert query runs, while each accepted boundary keeps its submitted numeric value.

The POST handler in \`packages/web/src/app/api/reviews/route.ts\` owns these checks after authentication and JSON parsing. The integer column in \`packages/web/src/db/schema/relations.ts\` stores accepted ratings, while \`packages/web/src/lib/auth.ts\` supplies the Clerk user boundary used before body validation.

## What Must Review Rating Boundary Validation Testing Cover?

Review rating boundary validation testing must cover field presence, runtime type, integer form, and the inclusive one-to-five range. It must also prove that every rejected value stops before database reads or writes. A status assertion alone cannot show that the guard ran early enough.

The request must first pass authentication. An unauthenticated request returns status 401 before the body is parsed, so it cannot prove a rating branch. Use a fixed authenticated user for every rating case, then test the access branch on its own through the [authentication testing guide](/blog/authentication-authorization-testing-guide).

Malformed JSON is another earlier branch. The handler catches \`request.json()\` and returns status 400 with \`Invalid JSON body\`. A valid object with no \`rating\` field reaches the next check and returns \`rating is required\`, which is a different oracle.

The required-field guard accepts zero far enough to reach the range check because zero is neither \`undefined\` nor \`null\`. It then fails the inclusive range rule. This order lets a test distinguish absent data from a present number that lies below the lower edge.

The final rating guard combines three facts: \`Number.isInteger(rating)\`, \`rating >= 1\`, and \`rating <= 5\`. A decimal inside the range fails the first fact. Zero and six are integers but fail range facts, and numeric strings fail the integer fact without automatic conversion.

Use exact error text for this stable route contract. Missing and null values return \`rating is required\`; every other invalid rating returns \`rating must be an integer between 1 and 5\`. The [API testing guide](/blog/api-testing-complete-guide) offers wider status coverage, while this suite keeps each input partition clear.

Status 400 marks a client request fault under the route's current contract. The [HTTP semantics specification](https://www.rfc-editor.org/info/rfc9110) supplies the approved status reference, while repository code supplies each exact review message. Keep those two sources distinct in test names and failure reports.

## How Do You Test Review API Rating Validation?

Review API rating validation works best as a table of valid JSON bodies with one expected branch per row. Keep authentication successful, include a real-looking skill ID, and spy on the database. This setup makes rating the only value that changes.

Start with malformed JSON outside the table because it cannot be represented as a parsed body object. Then include omitted rating, explicit null, empty string, numeric string, boolean, array, object, zero, fractions, one, five, and six. Each row needs an expected status, message, and database call count.

JavaScript \`undefined\` needs care. \`JSON.stringify({ rating: undefined })\` omits the property, so the server sees the same object as the omitted case. Test that fact at the HTTP boundary, and use a direct request stub only if you specifically need to model a nonstandard parser result.

Strings such as \`"1"\` and \`"5"\` remain strings after JSON parsing. The route does not call \`Number\` on incoming ratings, so they fail \`Number.isInteger\`. Do not coerce input inside the test helper, since that would bypass the behavior under review.

\`\`\`typescript
import { describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/reviews/route';
import { db } from '@/db';

const invalidCases = [
  { name: 'omitted', body: { skillId }, message: 'rating is required' },
  { name: 'null', body: { skillId, rating: null }, message: 'rating is required' },
  { name: 'numeric string', body: { skillId, rating: '1' }, message: 'rating must be an integer between 1 and 5' },
  { name: 'zero', body: { skillId, rating: 0 }, message: 'rating must be an integer between 1 and 5' },
  { name: 'fraction', body: { skillId, rating: 3.5 }, message: 'rating must be an integer between 1 and 5' },
  { name: 'six', body: { skillId, rating: 6 }, message: 'rating must be an integer between 1 and 5' },
];

describe.each(invalidCases)('$name rating', ({ body, message }) => {
  test('returns 400 without data access', async () => {
    const response = await POST(makeRequest(body) as NextRequest);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: message });
    expect(db.select).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
\`\`\`

The example assumes the auth helper is already mocked to return a Clerk ID. Reset every database spy before each row, or a prior valid control can make an invalid row appear to touch storage. The [error handling patterns](/blog/error-handling-testing-patterns) explain why each failure should retain one cause.

Add one malformed JSON request and one valid rating control outside the invalid table. The malformed request proves parse handling, while the control proves the database spies can observe a later query. Review rating boundary validation testing is weak if every case exits for an unrelated auth failure.

## What Belongs in an Integer Rating Boundary Test?

An integer rating boundary test needs values directly below, on, and above both accepted edges. Use zero, one, five, and six as the core set. Add negative one, a large positive integer, and decimals around valid points to cover the combined condition fully.

The valid integer set is exactly one, two, three, four, and five. One and five prove inclusion at each edge, while a small loop across all five values protects the middle. Each accepted request should return status 201 and the same rating in the response and database row.

Fractions deserve more than one sample. Use \`1.5\`, \`3.5\`, and \`4.999\` to show that being numerically inside the range is not enough. Also use \`0.5\` and \`5.5\` if the suite reports input partitions rather than trying to maximize branch count.

JSON cannot carry \`NaN\`, \`Infinity\`, or \`-Infinity\` as number tokens. \`JSON.stringify\` turns those property values into null, so a real HTTP request reaches the required-field message. Do not label that as a direct \`Number.isInteger(NaN)\` case at the wire boundary.

Very large integer literals can lose precision in JavaScript before serialization. They still remain outside the accepted range, so status 400 is the useful contract. A rating endpoint does not need a precision test beyond proving that no huge value reaches storage.

Negative zero compares as zero and fails the lower bound. It serializes as \`0\`, so the server cannot distinguish its sign. One clear zero case is enough unless the client parser itself is being tested.

Review rating boundary validation testing should name each case by property, such as "integer below lower edge" or "fraction inside range." Names based only on literal values are harder to review. The [database testing guide](/blog/database-testing-automation-guide) can help pair each request with an unchanged row count.

## One to Five Rating QA Matrix

One to five rating QA should map every input shape to one exact result and one storage effect. The matrix below follows the current validation order after successful authentication and valid JSON parsing.

| Rating input | Runtime type | Integer | In range | Expected status | Review row delta |
|---|---|---|---|---:|---:|
| Omitted | undefined after destructuring | No value | No | 400 | 0 |
| null | object by JavaScript typeof | No value | No | 400 | 0 |
| "1" | string | No | Not coerced | 400 | 0 |
| 0 | number | Yes | No | 400 | 0 |
| 1 | number | Yes | Yes | 201 | 1 |
| 3.5 | number | No | Numerically inside | 400 | 0 |
| 5 | number | Yes | Yes | 201 | 1 |
| 6 | number | Yes | No | 400 | 0 |

The null row reaches the explicit presence guard before \`Number.isInteger\`. Although JavaScript reports \`typeof null\` as \`object\`, the endpoint does not use that result. Keep the matrix wording tied to observed control flow.

For one and five, use different users or clear the prior review between requests. The route allows only one review per user and skill, so reusing both IDs makes the second valid rating return status 409. That duplicate rule would hide the rating result.

For every rejected row, record the count before and after the request. The delta must remain zero. This check proves no partial insert occurred and gives a stronger signal than spying on a mocked method alone.

For every accepted row, inspect the returned \`review.rating\` and the stored integer. The route returns status 201 without a top-level success flag. Tests should follow that body instead of adding a field that the implementation does not send.

The [API testing category](/categories/api-testing) contains tools for table-driven requests. Keep this one to five rating QA matrix in source control near the route tests so reviewers can compare the body, status, message, and row effect in one place.

## How Do You Prove Fractional Review Rating Rejection?

Fractional review rating rejection is proven when a decimal request returns status 400 with the range message and creates no row. The fixture should use a valid user and skill, since an earlier lookup failure would not isolate the numeric rule. Check the database after every decimal.

Use decimals that sit inside the accepted numeric interval, such as 1.1, 2.5, and 4.9. These values pass simple lower and upper comparisons, so they specifically prove the \`Number.isInteger\` term. A decimal above five is useful, but it does not isolate that term.

Send the values through JSON rather than calling the validation expression alone. This includes request parsing and proves that the runtime receives a number. An isolated unit check of \`Number.isInteger(3.5)\` is true language knowledge, not an endpoint regression.

Assert the exact public message, even though it mentions both integer form and range. The current route intentionally uses one message for decimals, strings, and out-of-range numbers. A future split into more specific messages should update the matrix and tests in the same change.

The insert spy should remain untouched, but direct storage is the stronger proof in an integration test. Count rows for the exact skill and user before the call, then count them again. This protects against a code path that writes through a helper your spy did not wrap.

Do not round the request in a client helper. A form may only let users click whole stars, but API callers can still send decimals. Review rating boundary validation testing protects the server boundary even when the visible component produces clean values.

The \`rating\` column is a non-null PostgreSQL integer in \`packages/web/src/db/schema/relations.ts\`. PostgreSQL may reject or cast values depending on the bound input, but application validation must stop decimals first. The [PostgreSQL constraint guide](https://www.postgresql.org/docs/current/ddl-constraints.html) explains database constraints as a separate integrity layer.

## Missing Rating Response Test Cases

A missing rating response test should contrast omission, serialized \`undefined\`, explicit null, and present but wrong values. These cases look similar in a UI, yet they do not all reach the same line. Precise bodies keep the required-field contract distinct from type and range checks.

An omitted property and a property set to \`undefined\` before \`JSON.stringify\` both arrive without \`rating\`. The destructured value is \`undefined\`, and the handler returns \`rating is required\`. Explicit null reaches the same response through the second side of that condition.

An empty string, whitespace string, numeric string, boolean false, empty array, and empty object are present values. They bypass the required guard, fail \`Number.isInteger\`, and return \`rating must be an integer between 1 and 5\`. This is expected even when some values are falsy.

Zero is also present. It is an integer, then fails \`rating < 1\`. Include it near the missing cases because clients often use zero as an unselected star state, but assert the range message rather than the required message.

The client component prevents form submission when its local rating equals zero. Server checks still matter because another client can post directly. A component case should assert its local \`Please select a star rating\` message, while the route case asserts the server's status and body.

Malformed JSON must stay separate. It returns \`Invalid JSON body\` before destructuring, and no field-level statement is possible. The [API guide](/blog/api-testing-complete-guide) shows how parser, schema, and domain failures can share status 400 while keeping different messages.

Review rating boundary validation testing should also include a body that is valid JSON but not a normal object, such as \`null\`. The current destructuring would throw outside the parse catch, so this may expose a route bug rather than a rating response. Record it as a separate hardening case and do not claim an existing 400 result.

## Rating Input, Status, Message, and Write Matrix

Use a second matrix in the test report when exact messages matter. The first matrix explains numeric boundaries, while this view ties each body category to validation order and storage proof.

| Body case | Expected message | Status | First relevant guard | Database change |
|---|---|---:|---|---:|
| Malformed JSON text | Invalid JSON body | 400 | JSON parse catch | 0 |
| Rating omitted | rating is required | 400 | Required rating | 0 |
| Rating null | rating is required | 400 | Required rating | 0 |
| Rating string | rating must be an integer between 1 and 5 | 400 | Integer and range | 0 |
| Rating 3.5 | rating must be an integer between 1 and 5 | 400 | Integer and range | 0 |
| Rating 1 | Review body | 201 | Insert path | 1 |
| Rating 5 | Review body | 201 | Insert path | 1 |

Count changes must be scoped to the fixture's user and skill. A busy shared database can receive unrelated reviews during the test, so a table-wide count creates noise. Unique records and a narrow predicate make the write oracle stable.

The response for a valid request includes the new review and nested user fields. It does not echo \`skillId\`. Query the inserted row when you need to prove its parent relation, rather than expecting an undocumented response field.

The route checks comment length after rating. Keep comments empty in boundary rows so an oversized string cannot become the first failure. Then add one separate case for the comment guard if the review route suite owns all POST validation.

Authentication is always first. Mock \`getAuthUserId\` to resolve a fixed Clerk ID, and make the subsequent user lookup return a real user for valid rows. If the user lookup is empty, status 400 says the account is not set up, which does not prove rating acceptance.

The [authentication testing article](/blog/authentication-authorization-testing-guide) can own unauthenticated and missing-user branches. The rating matrix should state its preconditions clearly, since a hidden auth stub is a common source of false passes.

## How Do You Implement Boundary Tests Without Partial Writes?

Implement boundary tests with a fresh authenticated fixture, a count before each request, and an exact count after it. Invalid rows must stop before any database call, while valid rows need separate users to avoid the duplicate-review check. This flow makes partial writes visible.

1. Create an authenticated Clerk user and a matching database user.
2. Seed one existing skill and record its review row count.
3. POST each invalid body and assert its exact status and error text.
4. Verify the scoped row count stays unchanged after every rejection.
5. POST ratings one through five with a fresh user for each request.
6. Assert status 201 and the submitted rating in response and storage.
7. Roll back or delete every test review, user, and skill.

\`\`\`typescript
for (const rating of [1, 2, 3, 4, 5]) {
  const user = await seedReviewer('boundary-' + rating);
  mockAuthUserId(user.clerkId);
  const before = await countReviews(skillId, user.id);

  const response = await postReview({ skillId, rating, comment: '' });
  const body = await response.json();
  const after = await countReviews(skillId, user.id);

  expect(response.status).toBe(201);
  expect(body.review.rating).toBe(rating);
  expect(after - before).toBe(1);
}

expect(await storedRatings(skillId)).toEqual([1, 2, 3, 4, 5]);
\`\`\`

Fresh users are simpler than deleting a review between each valid value. They preserve all accepted rows for one final storage assertion and avoid turning the suite into a duplicate-review test. Use unique email, username, and Clerk values because the user schema marks them unique.

Invalid cases can share one user because they create no row. Still, read the count after each request rather than only once at the end. An early partial write could make later requests return duplicate status and hide the original defect.

The [database automation guide](/blog/database-testing-automation-guide) helps choose rollback or explicit cleanup. Review rating boundary validation testing should not rely on execution order, a shared catalog skill, or a broad cleanup that can remove another worker's rows.

Run the invalid table first with a database spy, then the accepted loop against PostgreSQL. This mix gives quick branch diagnostics and real storage proof. Keep one complete route integration for each edge, even if unit checks cover every value.

The [skills catalog](/skills) can support a final form smoke test for one and five stars. The automated API suite remains required because the star control cannot produce strings, nulls, arrays, or decimal JSON values.

### Diagnose one failed rating row

Start with the status and message, then compare them with the planned branch for that row; a missing-field message for zero means the guard order changed or a helper dropped the value. Print the sent body once so that loss is plain.

If an invalid row touched the database, stop before you inspect its final count. The route should reject the value before user, skill, or duplicate checks begin. A first call name often shows whether the guard moved below data work.

If a valid edge returns 409, check the fixture user and skill pair. That pair may already own a review from the prior row. Give each accepted value a new user instead of making duplicate status part of this test.

If status 201 arrives but no row exists, compare the returned ID with the insert result. The database mock may have made a body without a real write. Keep one full integration case through [QA skills](/skills) tooling so storage has direct proof.

If a fraction passes, inspect the request body before blaming PostgreSQL. A client helper may have rounded it to a whole number. The server test must send raw decimal JSON and prove the parsed value before the handler runs.

If a string passes, look for a new cast near body parsing. Record whether that cast is now part of the product contract before changing the test. Silent coercion can make blank text or spaced text act in ways the route never planned.

Keep the failed report small: case name, body value, runtime type, status, message, and row delta. These six facts can separate fixture faults from guard faults fast. They also make the full table easy to scan in a pull request.

## Frequently Asked Questions

### Are one and five inclusive rating boundaries?

Yes, the route rejects values below one or above five, so both edge values are accepted when they are integers. Test each with a fresh reviewer and a valid skill. Assert status 201, the returned rating, and one inserted row to prove both comparison edges.

### Should numeric strings pass review API rating validation?

No, values such as \`"1"\` remain strings after JSON parsing, and the route does not coerce them. \`Number.isInteger\` returns false for a string, so the handler sends status 400 with the shared integer-and-range message. The review row count must remain unchanged.

### Why test several fractions inside the valid range?

Fractions such as 1.5 and 4.9 satisfy simple range comparisons, so they isolate the integer requirement. Several samples reduce the chance that a client helper rounded one special input before sending it. Each request should preserve its decimal through parsing and stop before storage.

### Can JSON send NaN as a rating number?

Standard JSON has no token for \`NaN\` or infinity. JavaScript serialization turns those property values into null, which reaches the route's required-field response. Test malformed raw tokens as JSON parse failures, and do not describe them as direct integer checks at the HTTP boundary.

### Is the PostgreSQL integer column enough validation?

No, the schema marks rating as a non-null integer but declares no one-to-five check constraint. Application validation supplies that range today and gives clients a clear status 400 response. A database check could add defense, but its migration and integration tests would remain separate.

### What proves a rejected rating made no partial write?

Record a scoped review count before the request and compare it after the response. Also assert that insert was not called in a route unit test. The direct count catches alternate write paths, while the spy shows the early guard ran before database work began.

## Conclusion

Review rating boundary validation testing turns a small conditional into a complete input contract. Cover missing and null fields, wrong runtime types, fractions, values around both edges, all five accepted integers, exact messages, and unchanged storage for every rejected request.

Browse [API validation skills](/skills) and reuse this rating matrix in the review regression suite. Then apply the same boundary method through the [API testing category](/categories/api-testing) to other required integer fields.`,
};
