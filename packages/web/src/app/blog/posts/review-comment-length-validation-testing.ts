import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'review comment length validation testing',
  description:
    'Use review comment length validation testing to cover the 1,000-unit boundary, whitespace, emoji, surrogate pairs, and off-by-one inputs in APIs.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'review comment length validation testing',
  keywords: [
    'review comment length validation testing',
    '1000 character comment test',
    'emoji string length API',
    'review whitespace validation',
    'Unicode boundary value testing',
    'comment limit off by one',
  ],
  relatedSlugs: [
    'api-testing-complete-guide',
    'database-testing-automation-guide',
    'authentication-authorization-testing-guide',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://tc39.es/ecma262/multipage/text-processing.html',
    'https://www.rfc-editor.org/info/rfc8259',
  ],
  repoEvidence: [
    'packages/web/src/app/api/reviews/route.ts',
    'packages/web/src/db/schema/relations.ts',
    'packages/web/src/components/skills/review-section.tsx',
  ],
  content: `Review comment length validation testing should treat the current limit as 1,000 JavaScript UTF-16 code units. Send missing, empty, whitespace, ASCII, surrogate-pair, and combining inputs around that exact boundary. Assert the response, inserted row count, and stored text so a rejected value never writes data.

That answer follows \`packages/web/src/app/api/reviews/route.ts\`, where a truthy comment fails only when \`comment.length\` exceeds 1,000. The same route stores \`comment || ''\`, while the browser form trims text before sending it. Tests must separate the direct API contract from the user interface path.

## What Must Review Comment Length Validation Testing Prove?

Review comment length validation testing must prove the inclusive boundary and every nearby branch. A value with length 1,000 may proceed, while a truthy value with length 1,001 receives status 400. Missing and empty values reach storage as an empty string after other required fields pass.

The route does not count user-perceived symbols. JavaScript string length reports UTF-16 code units, so some visible symbols consume two units or more. State that contract in test names and failure output to avoid calling every unit a character.

Conditional validation creates an important empty case. An empty string is falsy, so the length check does not run, and persistence changes it to another empty string. Whitespace is truthy, remains untrimmed in direct API calls, and is measured before insertion.

The \`reviews.comment\` column in \`packages/web/src/db/schema/relations.ts\` is a text column with an empty default. PostgreSQL storage is not the 1,000-unit enforcement point shown here. The API check owns this application limit, so rejected requests should leave the review row count unchanged.

Authentication, skill lookup, and duplicate prevention run around this branch. Use a known user and skill, then give every accepted case a fresh user because one user may review one skill once. Otherwise, a duplicate response can mask a valid boundary result.

The client in \`packages/web/src/components/skills/review-section.tsx\` also applies \`maxLength={1000}\` and checks \`formComment.length\`. It then sends \`formComment.trim()\`, which can change the value. Direct route tests should bypass that trim, while component tests should verify its separate effect.

Use the [API testing guide](/blog/api-testing-complete-guide) for response assertion patterns. Keep this suite focused on units, truthiness, storage, and off-by-one behavior rather than every review rule.

## How Do You Build a 1000 Character Comment Test?

A 1000 character comment test needs deterministic strings at lengths 999, 1,000, and 1,001. Generate them in test code rather than pasting large fixtures. The generator should assert its own output length before any request is sent.

Plain ASCII text gives the cleanest control because each selected letter uses one UTF-16 code unit. Repeat \`a\` to each target length, send the same valid rating and skill, then inspect both the response status and database writes.

Use one fixture user for each accepted request. Rejected inputs can reuse a user because they should not create a row, but a fresh user makes failed cleanup easier to see. Give each case a distinct label in logs.

\`\`\`typescript
import { expect, test } from 'vitest';

const ascii = (units: number) => 'a'.repeat(units);
const pair = '\\u{1F600}';

test.each([
  { name: 'ascii 999', comment: ascii(999), status: 201 },
  { name: 'ascii 1000', comment: ascii(1000), status: 201 },
  { name: 'ascii 1001', comment: ascii(1001), status: 400 },
  { name: '500 surrogate pairs', comment: pair.repeat(500), status: 201 },
  { name: '501 surrogate pairs', comment: pair.repeat(501), status: 400 },
])('$name has the expected boundary result', async ({ comment, status }) => {
  expect(comment.length).toBe(status === 400 ? 1001 : 1000);
  const response = await POST(makeReviewRequest({ comment }));
  expect(response.status).toBe(status);
});
\`\`\`

The sample intentionally checks test data before checking the route. Adjust the first accepted row assertion for the 999-unit case in production code, since its expected length differs. A table-driven object can include the exact expected units and remove that simplification.

Status 201 alone is not enough for accepted values. Parse the review response, fetch the inserted row, and compare its comment with the sent value. Status 400 alone is not enough for rejection, because a faulty route could write before returning an error.

Review comment length validation testing should also assert the exact error body for 1,001 units. The repository currently returns \`comment must be 1000 characters or fewer\`. Treat that text as an API contract only if clients rely on it; row absence is the stronger data safety check.

The [database testing guide](/blog/database-testing-automation-guide) covers write verification and cleanup. Here, count reviews by both skill and user so another test cannot alter the expected delta.

## What Does an Emoji String Length API Measure?

An emoji string length API measures whatever the implementation passes to its length check. In this route, that value is a JavaScript string, and its \`length\` is a count of UTF-16 code units. It is not a count of code points or visible grapheme clusters.

The ECMAScript [text processing specification](https://tc39.es/ecma262/multipage/text-processing.html) defines string values as sequences of 16-bit unsigned integer values. A supplementary code point uses a surrogate pair and therefore adds two to \`length\`. A combined visible symbol can use several code points and still look like one mark.

Use escape sequences in source fixtures so files remain plain ASCII. For example, \`'\\u{1F600}'\` creates one supplementary symbol with a JavaScript length of two. Repeating it 500 times reaches exactly 1,000 units, while adding one ASCII letter reaches 1,001.

Combining sequences test another misconception. A base letter followed by a combining mark can display as one unit to a reader, yet JavaScript sees two code units. Do not normalize the string in test setup unless normalization is part of the product contract.

JSON transport preserves string data according to the parser and serializer in use. [RFC 8259](https://www.rfc-editor.org/info/rfc8259) defines JSON string syntax and Unicode escapes, but it does not redefine this route's JavaScript length rule. Assert the parsed server value, not merely the request source literal.

Lone surrogate code units deserve a narrowly labeled case if the request stack accepts them. Serialization may replace or preserve such values depending on the path, so capture the actual parsed body first. Never generalize one runtime result to every JSON client.

The [authentication testing guide](/blog/authentication-authorization-testing-guide) can help stabilize user setup. Complete auth before testing Unicode inputs, because a 401 response says nothing about string length.

## Review Whitespace Validation Cases

Review whitespace validation needs two layers because the route and form do not send identical text. A direct POST with spaces reaches the server unchanged. The component trims leading and trailing whitespace before it builds the JSON request.

Test missing \`comment\`, an empty string, one space, 1,000 spaces, and 1,001 spaces against the route. Missing and empty inputs should store an empty string. Truthy whitespace through 1,000 units can pass, while 1,001 spaces should fail the length check.

Tabs and line breaks also count as one UTF-16 code unit each. Build mixed whitespace with explicit escapes such as \`' \\t\\n'\`, then assert both length and exact stored value. Avoid visual comparisons because editors can hide trailing spaces.

The browser flow changes these expectations. \`formComment.trim()\` can turn all-whitespace input into an empty string and removes edge whitespace from ordinary text. A component test should intercept the outgoing body and compare it with the text area state.

The HTML \`maxLength\` attribute prevents many interactive over-limit entries, but it does not replace API checks. A direct client, altered browser request, or older caller can still send any JSON string. Keep the route boundary case even when the component test passes.

Review comment length validation testing should not invent a nonblank requirement. The current server accepts blank values once other fields are valid. If the product later rejects whitespace-only reviews, add a trim or content rule and update both API and component expectations.

The [error handling patterns](/blog/error-handling-testing-patterns) guide can help distinguish client feedback from server enforcement. This matrix should record raw input, sent input, stored input, and status as separate facts.

## How Do You Run Unicode Boundary Value Testing?

Unicode boundary value testing starts with controlled code units, not copied symbols. Build each fixture from ASCII source escapes, assert JavaScript length, serialize it, and inspect the value parsed by the handler. This order shows where any change occurred.

Create groups for basic letters, supplementary pairs, combining sequences, and mixed text. Give each group accepted and rejected edges. The target remains 999, 1,000, and 1,001 code units even when visible counts differ.

The following request helper keeps expected storage beside the input. It uses the actual POST boundary and checks the scoped row after a successful response. Rejected cases compare the row count before and after.

\`\`\`typescript
async function assertCommentCase(input: {
  comment?: string;
  expectedStatus: 201 | 400;
  expectedStored?: string;
}) {
  const before = await countReviews(fixture.skillId, fixture.userId);
  const response = await POST(
    makeReviewRequest({
      skillId: fixture.skillId,
      rating: 5,
      ...(input.comment === undefined ? {} : { comment: input.comment }),
    }),
  );

  expect(response.status).toBe(input.expectedStatus);
  const after = await countReviews(fixture.skillId, fixture.userId);

  if (input.expectedStatus === 400) {
    expect(after).toBe(before);
  } else {
    expect(after).toBe(before + 1);
    expect(await readStoredComment(fixture.skillId, fixture.userId)).toBe(
      input.expectedStored,
    );
  }
}
\`\`\`

Reset the user fixture after each accepted case. A duplicate review returns 409 before insertion and can make a valid Unicode value look rejected for the wrong reason. Include the observed status in failure output.

Check normalization only as an observation. Send canonically equivalent composed and decomposed sequences, then compare stored text byte for byte through the application value. The current route shows no normalization step, so tests should expect preservation after JSON parsing.

Review comment length validation testing benefits from a small diagnostic object. Log source notation, visible label, code points when useful, UTF-16 length, status, and stored length. Do not print the entire 1,001-unit value into normal CI logs.

Use [QA skills](/skills) to find reusable API data generators. Keep the local generator simple enough that a reviewer can verify every target length by inspection.

## Comment Limit Off by One Assertions

Comment limit off by one checks must prove that the comparison is greater than 1,000, not greater than or equal. Exactly 1,000 is the key accepted value, and 1,001 is the first rejected value. A 999 case confirms nearby normal input.

The server condition also requires truthiness. Missing and empty values skip the length branch, while a nonempty one-unit value enters it and passes. Include those branch controls so a future rewrite cannot silently change optional comment behavior.

For each rejected case, assert three facts. The status is 400, the response explains the limit, and no row appears for the fixture user and skill. The row assertion catches code that validates after insertion or mishandles a transaction.

For each accepted case, assert status 201 and exact storage. Do not compare only the returned response object, because response construction could echo input while the database stores something else. Read \`reviews.comment\` through a fresh query.

The component deserves a separate edge pair. Type or set 1,000 units and verify the count display, then confirm the outgoing trimmed request. Attempting 1,001 through realistic input should show whether the browser prevents the extra unit.

Keep API and component case names distinct. A phrase such as "route accepts 1,000 spaces" should not be reused for a form that trims those spaces. Clear names prevent one layer from being mistaken for the whole product.

The [API testing category](/categories/api-testing) lists skills for boundary and contract checks. Use those patterns without hiding the explicit 999, 1,000, and 1,001 values in a broad random generator.

## Input Text, Code Units, and Expected Response Matrix

This matrix states the current route expectation after valid auth, user, skill, and rating setup. Visible symbols are descriptive because fonts and grapheme rules vary. JavaScript length remains the exact oracle used by the code.

| Input kind | Visible symbols | JavaScript length | Expected status | Stored text | Review row delta |
|---|---:|---:|---:|---|---:|
| Missing comment | None | Not present | 201 | Empty string | 1 |
| Empty string | None | 0 | 201 | Empty string | 1 |
| Whitespace only | Hard to see | 1 through 1000 | 201 | Exact direct API input | 1 |
| ASCII boundary | 999 letters | 999 | 201 | Exact input | 1 |
| ASCII limit | 1000 letters | 1000 | 201 | Exact input | 1 |
| ASCII over limit | 1001 letters | 1001 | 400 | No value | 0 |
| Surrogate pairs | 500 symbols | 1000 | 201 | Exact input | 1 |
| Combining sequence | Depends on font | Measure fixture | Based on units | Exact accepted input | 0 or 1 |

Run each accepted row with a user who has no review for the skill. Reusing one user turns later accepted cases into duplicate conflicts. Rejected rows may share a user only when setup checks prove no earlier insert exists.

The whitespace row applies to direct API input. Through the component, leading and trailing space is removed before transport. Add a second expected-sent-value column when the same matrix drives browser tests.

The combining row cannot use one universal visible count. Store the exact escape sequence in the case, calculate its UTF-16 units, and derive status from that length. This keeps the test tied to code rather than font display.

The [database testing article](/blog/database-testing-automation-guide) shows why row deltas need isolated keys. Query both \`skillId\` and \`userId\` for this matrix, then delete the user fixture after each accepted row.

## How Do You Implement the Comment Boundary Procedure?

Use a real route handler or integration server with a disposable database. Prepare auth first, because the comment checks occur after authentication. Keep one case per fresh accepted review.

1. Create a known skill and an authenticated database user for the request.
2. Generate text with explicit JavaScript lengths at 999, 1,000, and 1,001.
3. Assert each generator result before serializing or sending the request.
4. Send rejected values and require status 400 with no inserted review row.
5. Send accepted ASCII, whitespace, and Unicode values using fresh users.
6. Read each accepted row and compare its comment with the exact sent value.
7. Exercise the component separately and verify its trimmed outgoing payload.

### Keep each boundary case easy to judge

Keep one short case at the front so auth and skill setup fail fast. Read the sent text back from the row, not from the response alone. Save its unit count and row key in the same small test log. This plain case gives each long or odd text case a sound base.

For each edge, show the source form, sent form, and stored form side by side. Mark the first point where those three forms do not match. Keep the full long text out of normal logs. A short hash and clear unit counts give enough proof when the case fails.

- A unique case name that states ASCII, spaces, pairs, marks, missing text, or empty text without vague labels
- The source escape form for non-ASCII input so code review can see each code point without relying on a font
- The JavaScript length checked before JSON work, plus the planned status and planned row delta for that exact value
- The encoded request body length as a transport fact kept apart from the UTF-16 length used by the route rule
- The parsed comment value seen by the route when a custom request helper or JSON mock can expose that seam
- The authenticated user and skill keys for the case, both checked before the text request is sent
- The row count before and after a rejected call, scoped by user and skill so a stray test row cannot hide a write
- The response status and short error text for the first over-limit unit, with no broad snapshot around unrelated fields
- The new review identifier and exact stored comment for each accepted value, read through a fresh database query
- The text area state and outgoing trimmed text for component cases, named apart from direct API storage checks
- The runtime and JSON client used for a lone-surrogate probe, since that optional case may change before route code runs
- The cleanup result for the accepted user, review, and skill data, with no prior row left for the next table entry
- The smallest 999, 1000, and 1001 unit controls rerun after any trim, normalize, parser, schema, or client change
- The case seed and expected values stored near the test, so later edits cannot change a generator and its check at once before the next full run

Begin with an ASCII control at ten units. This proves the user, skill, rating, and request helper are valid before large strings add noise. Delete its review or use another user for the boundary rows.

Next, run 999, 1,000, and 1,001 ASCII units. Report the generated length and returned status in one compact assertion message. Check row deltas immediately after each call.

Then replace ASCII with surrogate pairs and mixed sequences while preserving target code-unit lengths. Test data should state both repeat count and resulting \`length\`. This makes a failed generator easy to correct.

After direct API checks, render the review form from \`packages/web/src/components/skills/review-section.tsx\`. Set text with edge whitespace, submit, and inspect the body passed to \`fetch\`. Confirm that form trimming explains any difference from route storage.

Finally, rerun the table after changes to validation, JSON handling, or client input code. Review comment length validation testing guards an application contract that spans several layers, so record which layer produced each value.

Use the [authentication guide](/blog/authentication-authorization-testing-guide) if test identity setup becomes the largest part of this suite. The boundary case should fail with clear length evidence, not a hidden session issue.

## Frequently Asked Questions

### Does JavaScript length count visible characters?

Not always. JavaScript string length counts UTF-16 code units, while one visible symbol may use one unit, a surrogate pair, or several combined code points. Test names should say code units, and fixtures should assert their own length before sending requests to the review endpoint.

### Why can 500 emoji reach the 1,000-unit limit?

Many supplementary symbols are represented by two UTF-16 code units in JavaScript. Repeating one such escaped symbol 500 times can therefore produce length 1,000. Confirm the chosen fixture in the runtime, because not every symbol or visible sequence has the same representation.

### Should whitespace-only review text be rejected?

That is a product decision, but the current direct API code does not reject it. Truthy whitespace passes when its length is at most 1,000. The browser form trims before sending, so API and component tests need different expected payloads until a shared rule is introduced.

### Does the database text column enforce this limit?

The cited schema declares a PostgreSQL text column and does not show a 1,000-unit constraint. The route performs the application check before insertion. Tests should still query storage, because a response assertion alone cannot prove rejected data stayed out or accepted text remained unchanged.

### Should tests normalize Unicode before comparing text?

Only when the product contract requires normalization. The current route does not show a normalization step, so the safest assertion compares the parsed and stored strings exactly. Add composed and decomposed controls to detect change, but do not silently normalize them inside the test helper.

### Why check both the response and the row count?

The response proves the visible API result, while the row count proves the data effect. A faulty order could insert a review and then return status 400. Accepted responses can also echo correct text while persistence changes it, so both observations close different gaps.

### How should a lone surrogate case be handled?

Label it as a transport edge case and inspect what the actual serializer plus parser delivers. Some paths may replace an unpaired value. The core boundary suite should rely on valid paired sequences, while this extra case documents runtime behavior without making a broad Unicode claim.

## Conclusion

Review comment length validation testing must follow the route's real unit: JavaScript UTF-16 code units. The strongest suite controls each generated length, separates direct API text from form-trimmed text, and checks both response status and durable rows.

Start with ASCII edges, then add surrogate pairs, combining sequences, and visible whitespace. Preserve exact sent and stored values in failures so a future validation change has a clear contract to update.

Browse [API validation skills](/skills) and add code-unit boundary fixtures to review tests. Use the [error handling guide](/blog/error-handling-testing-patterns) to keep validation messages and storage safety covered as separate assertions.`,
};
