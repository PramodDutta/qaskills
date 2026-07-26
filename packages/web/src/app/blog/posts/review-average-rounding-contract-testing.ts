import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'review average rounding contract testing',
  description:
    'Use review average rounding contract testing to verify Postgres AVG values become numeric one-decimal ratings without binary rounding surprises.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'review average rounding contract testing',
  keywords: [
    'review average rounding contract testing',
    'Postgres AVG rounding test',
    'review average one decimal',
    'JavaScript toFixed API contract',
    'rating aggregate precision QA',
    'empty average fallback test',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'authentication-authorization-testing-guide',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/functions-aggregate.html',
    'https://tc39.es/ecma262/multipage/numbers-and-dates.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/reviews/route.ts',
    'packages/web/src/db/schema/relations.ts',
    'packages/web/src/components/skills/review-section.tsx',
  ],
  content: `Review average rounding contract testing should seed known integer ratings, read PostgreSQL AVG and count, then call the review endpoint for the same skill. Assert that Number, toFixed(1), and parseFloat produce the expected numeric tenth, while an empty set returns numeric zero.

This check follows every value from storage to JSON instead of testing display text alone. Start with a clean [skill fixture](/skills), calculate the expected fraction outside application code, and keep row count beside the average.

## What Must Review Average Rounding Contract Testing Prove?

Review average rounding contract testing must prove the type and value at each stage. The source ratings are integers, PostgreSQL computes an average, JavaScript converts it, and the endpoint sends a JSON number.

The GET handler in packages/web/src/app/api/reviews/route.ts selects review rows first. It then makes a second query with Drizzle avg for rating and count for review IDs.

The route checks whether averageRating from that query is truthy. For a populated set, it calls Number, formats one decimal with toFixed(1), and converts that string back with parseFloat.

For an empty set, PostgreSQL AVG returns null. The conditional chooses zero, while the separate count conversion also produces numeric zero from the aggregate result.

The rating source appears in packages/web/src/db/schema/relations.ts. Its rating column is a non-null integer linked to a skill and user, so the database input does not store decimal stars.

The POST route adds another useful rule. It accepts only integer ratings from one through five, which gives integration fixtures a clear valid range.

The user interface in packages/web/src/components/skills/review-section.tsx stores averageRating as a number. It prints that value beside the review count and rounds it again only when choosing filled summary stars.

Do not merge the API value with that star display rule. An average of 3.6 remains 3.6 in text, while Math.round can show four filled stars.

The contract therefore has four parts: exact review count, expected rounded tenth, JSON number type, and zero for no rows. Each part can fail while the others still look plausible.

Use the [API testing guide](/blog/api-testing-complete-guide) for response controls and status checks. This article stays focused on the aggregate conversion after a valid skill ID reaches GET.

Review average rounding contract testing should retain the source rating list in failure output. A short array such as one, two, and two explains the expected fraction without exposing any review comment.

### A plain proof chain

First read the rows and list each star as a small whole number. Add them once, count them once, and keep both facts in the test report.

Next read the raw AVG value without changing its type. This tells the team what the database driver gave the route before any JavaScript work.

Then read the JSON field and check that it is a number. Match it with the expected tenth and keep the review count in the same assertion group.

Last, show the value in the review view with a small component case. Keep star fill apart from text so each rule has one clear pass or fail.

## How Do You Build a Postgres AVG Rounding Test?

A Postgres AVG rounding test should start from small rating arrays with fractions that are easy to check by hand. Calculate sum divided by count in the test, then apply the approved one-decimal rule independently.

Use a fresh skill for each array or delete only its reviews before reseeding. Mixed rows from another case will change both average and count while leaving every inserted rating valid.

Include a single value, an exact half, a repeating third, an exact whole number, and an empty set. These cases cover conversion without using invalid decimal ratings.

The repeating set one, two, and two has an exact average of five thirds. The endpoint should return 1.7 after converting and formatting the database aggregate.

Query AVG and count directly after seeding. This direct result helps decide whether a failure came from stored rows, database aggregation, JavaScript conversion, or JSON output.

PostgreSQL documents that [AVG over integer input returns numeric](https://www.postgresql.org/docs/current/functions-aggregate.html). The same reference states that aggregates other than count return null when no rows are selected.

Do not use the endpoint function to calculate the expected result. A copied Number and toFixed chain can repeat the same mistake and let the test agree with broken code.

For valid integer stars, an exact rational helper works well. Add the integers, divide only when preparing the expected tenth, and list the exact numerator and denominator in diagnostics.

The first example drives the endpoint with a controlled aggregate result. It verifies conversion and response type without asking a browser to format the number.

\`\`\`typescript
import { expect, it, vi } from 'vitest';
import { GET } from '@/app/api/reviews/route';
import { db } from '@/db';

it('returns a numeric tenth for a repeating review average', async () => {
  arrangeReviewRows(db.select, [
    { id: 'r1', rating: 1 },
    { id: 'r2', rating: 2 },
    { id: 'r3', rating: 2 },
  ]);
  arrangeReviewStats(db.select, {
    averageRating: '1.6666666666666667',
    totalReviews: 3,
  });

  const response = await GET(
    new Request('http://test/api/reviews?skillId=skill-1') as never,
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.totalReviews).toBe(3);
  expect(body.averageRating).toBe(1.7);
  expect(typeof body.averageRating).toBe('number');
});
\`\`\`

The arrange helpers are local test adapters. Make them distinguish the review-list select from the later aggregate select so a route refactor cannot consume the wrong prepared value silently.

Add a database integration version for at least the repeating and empty sets. A mocked string proves route conversion, while real PostgreSQL proves the aggregate type and null behavior used by the driver.

Use the [database testing guide](/blog/database-testing-automation-guide) for transaction-scoped fixtures. The Postgres AVG rounding test should roll back rows or delete them by owned IDs after every case.

Review average rounding contract testing should avoid locale formatters. The route uses language-level number methods, not locale text, and its JSON value must remain locale-neutral.

## What Does Review Average One Decimal Mean?

Review average one decimal means the calculation is rounded to one decimal place before JSON serialization. It does not mean the JSON text always contains one digit after the decimal point.

toFixed(1) returns a string such as "3.0" or "1.7". The next parseFloat call converts that string to a number, so an exact three becomes numeric 3.

JSON serialization also represents that value as 3, not 3.0. A snapshot that requires the characters "3.0" would contradict the route's final type.

Assert numeric equality and typeof number in the API test. Test fixed visual digits only in a component that explicitly formats them, and no such formatter appears in the cited review summary.

The review section prints averageRating directly. This means the current user-facing text can show "3 out of 5" for a whole average, even though the computation used one-decimal rounding.

Filled stars use Math.round on the average. Keep a separate component case for values below and above a half, because star fill and API precision answer different questions.

Use rating arrays that produce 1.25 only if they can arise from whole ratings and counts. For example, one, one, one, and two average exactly 1.25 before the route rounds.

Boundary-like values should come from valid rows rather than a fake decimal rating in storage. This preserves the integer constraint while still testing the conversion point.

The [review API error patterns](/blog/error-handling-testing-patterns) remain separate. A valid empty result is status 200 with zero, while a database exception is status 500 with a failure body.

Review average rounding contract testing should name both expected math and expected representation. Report exact fraction, rounded number, JSON type, and visible text rule as separate fields.

## JavaScript toFixed API Contract

The JavaScript toFixed API contract matters because toFixed returns text, not a number. The route deliberately converts that text back with parseFloat before creating its JSON response.

The official [ECMAScript number specification](https://tc39.es/ecma262/multipage/numbers-and-dates.html) defines toFixed as a decimal fixed-point string with the requested number of fraction digits. It also defines how the closest integer used for those digits is chosen.

JavaScript Number values use binary floating-point representation. Some decimal fractions cannot be represented exactly, so tests should use expected results from the language contract rather than visual guesses.

However, do not invent arbitrary values outside the data path. The PostgreSQL source average comes from integers one through five, and the route converts the returned value with Number first.

Build a small conversion unit table from strings that PostgreSQL can return for valid rating sets. Include "1.5", a repeating decimal, "3", and a value close to a one-decimal decision point.

For each input, assert the intermediate fixed string and final parsed number. These paired assertions locate whether a change came from formatting or from the later type conversion.

Avoid equality checks against a hand-written binary expansion. The public contract is the numeric tenth after toFixed, not the hidden bits inside the Number value.

Avoid using parseInt in expected code. It would discard the fractional part and make a valid 1.7 result look like 1.

If maintainers replace the conversion with SQL rounding, add a cross-check before changing expectations. Database numeric rounding and JavaScript Number formatting need an explicit parity decision.

The [authentication testing guide](/blog/authentication-authorization-testing-guide) applies to POST review creation. GET aggregate conversion is public in the route evidence, so auth setup should not obscure this rounding case.

Review average rounding contract testing should pin the visible chain while allowing an intentional redesign. When the chain changes, update intermediate assertions and keep the final numeric contract clear.

## How Do You Run Rating Aggregate Precision QA?

Rating aggregate precision QA should vary count and distribution while asserting average and total together. A correct average with the wrong count can hide duplicate or missing reviews.

Start with symmetric sets such as one and five, whose average is three. Then use asymmetric sets such as one, two, and two, which force rounding.

Repeat the same rating many times to test count conversion without changing the average. Fifty ratings of four should return average four and totalReviews fifty.

Mix values in different insertion orders. AVG and count should not change, even though the review list itself is sorted by createdAt in descending order.

Use two skills with different sets in the same database. Query each skill ID and prove the where clause keeps aggregates isolated.

Also seed reviews from several users because the schema links one review row to one user. The aggregate should depend on rating values, not user names or comments.

The second example creates valid integer combinations and derives an expected tenth without copying toFixed. It uses integer arithmetic to compare tenths.

\`\`\`typescript
import { expect } from 'vitest';

function expectedTenth(ratings: number): never;
function expectedTenth(ratings: number[]): number;
function expectedTenth(ratings: number | number[]) {
  if (!Array.isArray(ratings) || ratings.length === 0) return 0;
  const sum = ratings.reduce((total, rating) => total + rating, 0);
  return Math.round((sum * 10) / ratings.length) / 10;
}

async function expectReviewStats(skillId: string, ratings: number[]) {
  await seedIntegerReviews(skillId, ratings);
  const response = await getReviews(skillId);

  expect(response.totalReviews).toBe(ratings.length);
  expect(response.averageRating).toBe(expectedTenth(ratings));
  expect(typeof response.averageRating).toBe('number');
}

await expectReviewStats('skill-a', [1, 2, 2]);
await expectReviewStats('skill-b', [1, 5]);
\`\`\`

The overload line is optional in a real test and can be simplified. The key point is that integer sums produce the expected tenth through a path distinct from the route's string formatting.

Check the rounding rule for exact halves carefully. Math.round and toFixed can differ for some represented values, so use this helper only after confirming it matches all valid rating fractions under the approved contract.

For the strongest integration case, compare the direct PostgreSQL result, endpoint value, and independent expected fraction in one failure message. That three-way view finds the layer that changed.

Use the [API testing category](/categories/api-testing) to add data-driven and contract skills. Rating aggregate precision QA should remain small enough that every rating array is easy to inspect.

Review average rounding contract testing should include a larger set but not rely on random values. Fixed arrays make a failed average repeatable across local runs and CI.

### Rating data case card

- Empty row set yields raw null JSON zero and total count zero
- One star row yields raw one fixed one point zero and JSON one
- Five star row yields raw five fixed five point zero and JSON five
- One plus two yields exact three halves and JSON one point five
- One two two yields exact five thirds and JSON one point seven
- One plus five yields exact three and a numeric whole result
- Equal four star rows raise count while the mean stays four
- Reverse insert order leaves AVG and count at the same values
- Two skill IDs keep each row set and each mean apart
- Two user IDs prove names and comments do not change the math
- Raw driver value stays in the log before Number is called
- Fixed text stays a unit fact while route JSON stays numeric
- Filled star count stays a view fact rather than an API value
- Invalid stars stay in POST tests and never enter these source rows
- [API guide](/blog/api-testing-complete-guide) checks status shape type count and value
- Teardown removes only rows and skills owned by the current case
- Failure output lists source stars raw AVG fixed text JSON value and count
- Clean reruns use fresh skill IDs and leave no old review rows

## Empty Average Fallback Test

An empty average fallback test creates a valid skill with no review rows and calls GET with that skill ID. The expected response contains an empty review list, averageRating zero, and totalReviews zero.

This is not the same as omitting skillId. A missing query parameter returns status 400 before any aggregate query, while an empty valid set reaches both selects.

The PostgreSQL aggregate reference says AVG returns null when no rows are selected, while count returns a row count. The route's conditional maps the null-like average to zero.

Assert that zero is a number and is not NaN. A loose falsy assertion could pass for null, undefined, an empty string, or false.

Also assert totalReviews with strict numeric equality. The route applies Number to the aggregate count, which protects its JSON type when the driver returns a string-like count.

Run a control where the stats adapter returns the shape expected for no rows. Do not return an empty statsResult array only, because a real aggregate query normally returns one aggregate row.

Then run a real database case against a skill with no reviews. This confirms the driver shape and protects the mocked control from drifting away from PostgreSQL.

The review list query should also return no rows. If list rows exist while the aggregate says empty, the mock setup is inconsistent and the test result has no valid meaning.

Use the [database guide](/blog/database-testing-automation-guide) for empty-set setup. Delete by skill ID and verify count zero before calling the endpoint.

An empty average fallback test should not require a "0.0" string. The final route value is numeric zero because parseFloat is bypassed for the empty branch.

Review average rounding contract testing needs this case in every aggregate refactor. Null handling often changes when SQL functions, driver mappings, or conditional expressions are rewritten.

## Rating Set, Raw Average, and API Value Matrix

This table uses only valid integer ratings. The Postgres column values remain whole numbers even when their aggregate has a decimal part.

| Ratings | Exact average | Postgres AVG | toFixed(1) | JSON value | Expected type |
|---|---|---|---|---|---|
| Empty set | No fraction | null | Not called | 0 | number |
| Five | 5 | Numeric five | "5.0" | 5 | number |
| One and two | 3/2 | Numeric 1.5 | "1.5" | 1.5 | number |
| One, two, and two | 5/3 | Repeating numeric | "1.7" | 1.7 | number |
| One and five | 3 | Numeric three | "3.0" | 3 | number |
| One, one, two, four, five | 13/5 | Numeric 2.6 | "2.6" | 2.6 | number |

The empty row bypasses the conversion chain. Assert that no Number or string result leaks into the body when the aggregate value is absent.

The single and symmetric rows prove whole-number behavior. They should return numbers without a forced trailing zero in JSON.

The repeating row is the best conversion signal. It requires one-decimal rounding and exposes code that truncates, rounds to two places, or leaves a long decimal.

The final mixed row checks a decimal that is already exact at one place. It should remain 2.6 without an added change from the formatting chain.

Use the [review error guide](/blog/error-handling-testing-patterns) when the stats query rejects. That case should return 500, while every matrix row above is a successful 200 aggregate result.

Review average rounding contract testing should run table rows as named data cases. Names such as repeating third or empty set make CI output useful without reading array details.

## How Do You Implement the Rounding Procedure?

Run one rating set at a time and keep the skill ID fixed only within that case. Independent source math must be ready before the endpoint response is read.

1. Define valid integer rating arrays and calculate each exact sum, count, and rational average outside route code.
2. Create an isolated skill, seed one array through controlled review rows, and verify the stored count.
3. Query PostgreSQL AVG and count directly, retaining their returned values as diagnostic evidence.
4. Call GET for the same skill ID and assert status, totalReviews, numeric type, and expected rounded tenth.
5. Compare the endpoint value with the independent expectation and record any database-to-JavaScript difference.
6. Repeat with a valid skill that has no reviews, then assert empty rows and numeric zero values.

At step one, keep every value within one through five. Invalid stars belong to POST validation tests and should not enter aggregate fixtures.

At step two, use owned IDs for cleanup. Broad deletes can remove another worker's reviews and turn its average into a false failure.

At step three, save the raw driver result without forcing it through route conversion. This value shows whether the driver returned text, numeric data, or null.

At step four, parse the JSON response normally. A text search for "1.7" does not prove the field type or its location.

At step five, print the source array, sum, count, raw aggregate, fixed string when present, and final value. Keep comments and user details out of logs.

At step six, verify the aggregate query still ran. A hard-coded empty response could pass zero assertions while skipping the database branch.

Run the same data cases after driver or Drizzle upgrades. Aggregate return mappings can change even when SQL and route source look unchanged.

Use the [database testing guide](/blog/database-testing-automation-guide) and [API testing guide](/blog/api-testing-complete-guide) for the two main layers. Keep one integration case spanning both so contract gaps stay visible.

Review average rounding contract testing should finish with fixture rollback and a zero-row check. Clean teardown prevents later cases from inheriting valid but unwanted ratings.

## Frequently Asked Questions

### What type does PostgreSQL AVG return for integer ratings?

PostgreSQL documents numeric as the AVG result type for integer input. The application may receive that value through its driver in a form that still needs conversion. Tests should retain the raw aggregate for diagnosis, then assert the endpoint's final JSON number separately.

### Why does toFixed not define the final API type?

toFixed returns a string with the requested decimal digits, but the route immediately passes that string to parseFloat. The final response field is therefore a number. Assert both the intermediate string in a focused unit check and the numeric JSON value at the route.

### Should a whole average appear as 3.0 in JSON?

No, the current route converts the fixed string back into numeric 3, and JSON does not preserve a trailing decimal zero for that number. A component may choose to format one fixed digit, but the cited review summary prints the number directly.

### How should the empty review set be asserted?

Use a valid skill with no review rows, then expect an empty list, averageRating zero, and totalReviews zero. Assert strict numeric types and confirm both database queries ran. Keep this case separate from a request that omits the required skillId parameter.

### Can floating-point behavior make these tests flaky?

Fixed inputs and one runtime should produce repeatable results, but copied visual guesses can encode the wrong rule. Use valid integer arrays, exact sums and counts, and the approved one-decimal contract. Retain raw aggregates so any conversion change has clear evidence.

### Should display-star rounding share the API assertion?

No, the endpoint returns a numeric tenth, while the review component uses Math.round only to choose filled summary stars. Test those rules at their own boundaries. One route case may confirm 3.6, and one component case may confirm four filled stars.

## Conclusion

Review average rounding contract testing should trace valid integer stars through PostgreSQL AVG, Number, toFixed, parseFloat, and JSON. Pair exact fractions with count checks, preserve the numeric type, and keep empty-set zero distinct from errors.

Browse [API and database testing skills](/skills) and add exact average fixtures to the review suite before its next change. Keep the empty set beside the repeating fraction in each release run.`,
};
