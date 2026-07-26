import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Email preference payload validation tests',
  description:
    'email preference payload validation tests: build a code-backed QA plan with verified QASkills paths, matrices, assertions, and regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'email preference payload validation tests',
  keywords: [
    'email preference payload validation tests',
    'boolean api validation tests',
    'invalid preference json body',
    'email settings schema validation',
    'reject string booleans api',
    'nextjs patch input validation',
  ],
  relatedSlugs: [
    'api-security-testing-checklist-2026',
    'api-testing-best-practices-guide',
    'authentication-authorization-testing-guide',
    'error-handling-testing-patterns',
  ],
  sources: [
    'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
    'https://zod.dev/api',
  ],
  repoEvidence: [
    'packages/web/src/app/api/user/preferences/route.ts:PATCH request body',
    'packages/web/src/db/schema/users.ts:boolean preference columns',
  ],
  content: `Email preference payload validation tests should send wire-level JSON values, require exactly four boolean settings, and prove malformed, null, numeric, string, array, or unexpected input never reaches persistence. The current PATCH route destructures raw request data without runtime validation, so strict rejection cases should expose a gap until an explicit schema runs before database access.

The request flow is in \`packages/web/src/app/api/user/preferences/route.ts\`, while boolean columns are defined in \`packages/web/src/db/schema/users.ts\`. Those files show the accepted UI shape and storage types. They do not show a runtime parser that enforces that shape at the HTTP boundary.

## Email preference payload validation tests: What Must the Suite Prove?

Email preference payload validation tests must prove a clear boundary between untrusted JSON and Drizzle writes. A complete object with four true or false values should proceed. Invalid syntax, wrong root types, missing values, nulls, string booleans, numbers, and extra keys should receive a controlled client response before update or insert.

The current route calls \`req.json()\`, destructures four names, finds the authenticated database user, and passes those values directly into \`.set()\`. If no preference row updates, it inserts the same values. There is no Zod schema, explicit type check, required-key check, or unknown-key rejection in this path.

That source truth changes how the first suite should be interpreted. Valid cases can describe current compatibility. Strict invalid cases are regression specifications expected to fail until validation is implemented, and their failures should show that database work was attempted or an internal error occurred.

The database schema marks all four preference columns as boolean, non-null, and default true. Database constraints provide a final storage boundary, but they cannot replace a stable API error contract. A string may fail during SQL execution, producing a general server response after database work already began.

The desired pass criteria are status, structured error details, and zero writes for every invalid body. Valid bodies should perform one update attempt and at most one insert fallback, then return the stored row. Authentication and missing-user branches remain independent controls.

The [OWASP input validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) recommends early syntactic and semantic validation. For this route, syntax means valid JSON with the expected object shape. Semantics means each named setting is a boolean allowed by the preference contract.

The [API security checklist](/blog/api-security-testing-checklist-2026) covers broader request defense. Email preference payload validation tests stay focused on four fields, route branching, response shape, and proof that rejected values cannot reach update or insert.

## Which QASkills Code Paths Own This Contract?

The route at \`packages/web/src/app/api/user/preferences/route.ts\` exports GET and PATCH handlers. PATCH first asks Clerk for the current user. It returns 401 before parsing the body when no user exists, which gives authentication precedence over payload validation.

After authentication, PATCH parses JSON and destructures \`emailNotifications\`, \`weeklyDigest\`, \`newSkillAlerts\`, and \`packAlerts\`. Unknown keys remain in the original object but are not included in the write. Missing keys become undefined and still enter the update object.

The handler then selects a database user by Clerk ID and limits the result to one. No row produces a 404 response. A found user leads to an update of userPreferences by user ID, with updatedAt set to a new Date.

If the update returns no row, the route inserts a preference row with the same four values. Otherwise it returns the first updated row. Any thrown error reaches one catch block and returns status 500 with a general failure message.

The schema at \`packages/web/src/db/schema/users.ts\` defines the userPreferences table. Its four email fields are boolean columns with true defaults and non-null constraints. It also contains lead source and timestamp columns that do not belong in this PATCH request.

That extra schema data explains why accepting arbitrary table keys would be unsafe. The request allowlist should contain only four intended settings, not every writable column. Email settings schema validation must remain narrower than the complete database row type.

The [authentication testing guide](/blog/authentication-authorization-testing-guide) owns Clerk identity and route protection details. This suite keeps one unauthenticated control, then uses a fixed authenticated user for payload cases. It should never let auth setup hide whether body parsing and validation ran.

Repository evidence supports both current behavior and the missing boundary. Email preference payload validation tests should label expected failures clearly until a parser is added. A report that calls raw destructuring validated would invent behavior absent from source.

## Boolean api validation tests: Baseline Cases

Boolean api validation tests need more than one all-true request. Start with all sixteen boolean combinations when the route is cheap, or use a smaller pairwise set that makes every field true and false across cases. The full UI payload remains four keys in every valid fixture.

A mixed object such as true, false, true, false is a strong baseline. It catches swapped names and accidental coercion better than uniform values. Assert the exact returned row and the complete object passed into the update builder.

The updatedAt field is generated by the route, so match it as a Date or freeze the clock. Do not compare a changing timestamp string unless serialization itself is under test. Keep the four preference booleans as exact assertions.

Test the update-success branch with one returned row. It should make one update call, no insert call, and return status 200. Test the update-empty branch separately, requiring one update attempt followed by one insert and the created row.

Unauthenticated input should return 401 without parsing JSON or touching the database. Use a request body that would throw if parsed to prove branch order. A missing database user should return 404 after one user lookup and before any preference write.

Malformed JSON currently reaches the catch block and returns 500. The desired contract should classify malformed client input before persistence and return a chosen client error, commonly 400. Tests should encode the project decision rather than silently accepting the existing general error.

String values such as \`"true"\` and \`"false"\` must not be coerced. JavaScript truthiness can make both strings behave unexpectedly, and database typing is not a user-facing validator. Require strict booleans at parse time.

Email preference payload validation tests can use the [API testing best practices guide](/blog/api-testing-best-practices-guide) for harness design. Keep the actual payload table local so every row states status, error details, update count, insert count, and retained database values.

## Invalid preference json body: Test Matrix

An invalid preference json body matrix should distinguish parser errors, shape errors, field errors, and unknown keys. That separation produces useful response details and prevents one broad bad-request assertion from hiding missed branches.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Valid booleans | Four mixed booleans | Update or insert path | Stored row response | One update, optional insert | Value changes type |
| String booleans | "true" and "false" | Validation boundary | Client validation error | Zero preference writes | SQL receives strings |
| Null or number | null, 0, or 1 | Field type boundary | Field-specific rejection | Zero preference writes | General server error |
| Unknown key | Four booleans plus admin | Strict object boundary | Unknown-key rejection | Zero preference writes | Extra key is ignored |
| Malformed or array | Broken JSON or [] | Parse and root boundary | Controlled client error | Zero user or preference query | Catch returns 500 |

The valid row is a compatibility control, not an invalid case. It proves that adding a strict parser does not block the payload emitted by the preference page. Run both update and insert outcomes with the same valid object.

The string row should include lowercase strings, uppercase text, an empty string, and a numeric string. None are booleans. Avoid coercing them because clients can already send JSON true and false values directly.

Null and number cases should vary one field while keeping the other three valid. This gives a field-specific error and proves that one invalid property rejects the entire write. Partial updates are not implemented by current source, so missing values should also fail the complete-object contract.

The unknown-key row needs a strict schema decision. Zod object schemas strip unknown keys by default in common usage, while \`z.strictObject\` rejects them. The approved [Zod API reference](https://zod.dev/api) documents strict objects for unknown-key errors.

Rejecting unknown keys makes contract drift visible. A misspelled \`weeklyDigset\` should not disappear while the remaining values save. It should produce a useful error and zero writes, allowing the client defect to be fixed quickly.

The malformed and array row must assert no user lookup if parsing and validation precede database access after authentication. This ordering saves work and prevents malformed values from reaching persistence code. Email preference payload validation tests should show call counts beside every status.

## How Should Email settings schema validation Be Exercised?

Email settings schema validation should run at three levels: schema unit cases, route tests with mocked persistence, and one database-backed valid request. The first two prove rejection timing and details. The final case proves accepted booleans still map to the intended columns.

Define the request contract independently from the database row schema. It should contain only emailNotifications, weeklyDigest, newSkillAlerts, and packAlerts as required booleans. Use strict object behavior when unknown keys must be rejected.

Call \`safeParse\` after \`req.json()\` succeeds and before looking up the database user. A failed result should return the selected client status with normalized issues. Do not return stack traces, raw SQL errors, or complete request dumps.

Schema tests should table-drive each field with true, false, null, strings, numbers, objects, arrays, and missing values. Root cases should include null, arrays, strings, and numbers. Extra-key cases should include a plausible typo and a sensitive-looking name.

Route tests must assert zero update and insert calls for all failures. If user lookup intentionally happens before validation, document that order, but preference writes must remain zero. The strongest design validates immediately after auth and JSON parsing.

One valid database integration test should use all four booleans and read the row back. It verifies mapping through Drizzle and the table's boolean columns. Roll back that transaction so repeated CI runs start from the same state.

Do not test Zod by mocking its result. Send actual wire payloads through the route and observe the parser. A mocked success or failure can make handler branches pass while the real schema accepts the wrong shape.

The [error handling patterns guide](/blog/error-handling-testing-patterns) can guide stable response details. Email preference payload validation tests should avoid binding to every Zod message word if the public API plans to normalize issues.

## Step-by-Step Reject string booleans api Procedure

A reject string booleans api procedure should derive the allowlist from product intent, then test through the HTTP request boundary. Keep these four stages together.

1. Define an explicit strict object containing the four required boolean preference keys and no database-only fields.
2. PATCH a table of valid, malformed, missing, null, numeric, string, array, and extra-key payloads.
3. Assert response status and normalized issues, then prove rejected bodies cause zero update and insert calls.
4. Send one complete UI payload through a database-backed route case and read the four stored booleans.

The first stage should not infer request fields from all userPreferences columns. Lead source, IDs, user IDs, and timestamps belong to storage, not this endpoint. A dedicated allowlist prevents later schema additions from becoming request inputs automatically.

The route-level case below expresses the desired pre-write contract. It is expected to fail against current raw destructuring until explicit validation is added:

\`\`\`typescript
import { describe, expect, test } from 'vitest';

describe('PATCH /api/user/preferences validation', () => {
  test.each([
    ['string boolean', { emailNotifications: 'false', weeklyDigest: true, newSkillAlerts: true, packAlerts: true }],
    ['null value', { emailNotifications: true, weeklyDigest: null, newSkillAlerts: true, packAlerts: true }],
    ['unknown key', { emailNotifications: true, weeklyDigest: true, newSkillAlerts: true, packAlerts: true, admin: true }],
    ['array root', [true, false, true, false]],
  ])('rejects %s before persistence', async (_, body) => {
    const harness = createPreferenceRouteHarness({ authenticatedUser: 'user_1' });
    const response = await harness.patch(body);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: 'Invalid preference payload' });
    expect(harness.updatePreferences).not.toHaveBeenCalled();
    expect(harness.insertPreferences).not.toHaveBeenCalled();
  });
});
\`\`\`

The harness represents controlled Clerk and Drizzle boundaries; it must invoke the real PATCH handler. Avoid implementing validation inside the harness because that would bypass the missing production behavior and make the test pass falsely.

For malformed JSON, provide raw text and a JSON content type rather than calling a helper that serializes values. An array is valid JSON with the wrong root type, so keep it separate from broken syntax.

The database-backed control should send the exact four-key object used by the dashboard page. Assert update or insert calls, response body, and a direct read. This case protects compatibility while invalid cases tighten the boundary.

After the procedure, review [dashboard preferences](/dashboard/preferences) as the real client shape. Email preference payload validation tests should not depend on browser state, but the UI payload remains a valuable contract fixture.

## Nextjs patch input validation: Assertions and Diagnostics

Nextjs patch input validation needs status, error, call-count, and retained-state assertions. A response code alone can pass after a database error, even though invalid data reached the write layer. Count each query and compare stored values after rejection.

Freeze or normalize response details. A useful error can identify the invalid key and expected boolean type without echoing the submitted value. This matters when future preference fields could contain more sensitive data.

The storage schema can support a cross-layer assertion that the accepted request keys map only to boolean, non-null columns. This check keeps the request allowlist tied to its four storage fields:

\`\`\`typescript
import { expect, test } from 'vitest';
import { userPreferences } from '@/db/schema/users';

const requestKeys = [
  'emailNotifications',
  'weeklyDigest',
  'newSkillAlerts',
  'packAlerts',
] as const;

test('accepted preference keys map to required boolean columns', () => {
  for (const key of requestKeys) {
    const column = userPreferences[key];
    expect(column.dataType).toBe('boolean');
    expect(column.notNull).toBe(true);
    expect(column.hasDefault).toBe(true);
  }
  expect(requestKeys).not.toContain('leadSource');
  expect(requestKeys).not.toContain('userId');
});
\`\`\`

This test confirms storage mapping, not request validation. Keep strict-object cases against the route because database column metadata cannot reject unknown JSON keys before a query. The two examples answer different regression risks.

For a rejected body, assert no user lookup when validation runs before database access. If the chosen implementation looks up identity first, at minimum require zero preference update and insert calls. Always compare the existing stored row after the request.

For accepted input, assert one user lookup, one update, and zero insert when a row exists. When no row exists, require one update followed by one insert. More calls can indicate retry or branch errors.

Malformed JSON should produce a controlled client response, while unexpected database failures should remain server errors. Keep those paths distinct in both status and message. A general catch-all result makes client repair and operator diagnosis harder.

Email preference payload validation tests should retain a compact issue summary as an artifact. The [QASkills skills directory](/skills) can provide API test helpers, but reports should never print auth tokens, complete headers, or raw sensitive bodies.

## What Regressions and Boundaries Prevent False Confidence?

TypeScript request types do not validate network JSON. A caller can send strings, arrays, null, numbers, or unknown keys regardless of compile-time annotations. Tests must create raw requests that cross the runtime boundary.

Database booleans also do not provide the intended API contract. They may reject a wrong value only after query construction and user lookup, which yields poorer errors and wasted work. Prove validation occurs before preference writes.

Do not accept string booleans through coercion. The text \`"false"\` is truthy in JavaScript, and client bugs can remain hidden when coercion turns arbitrary values into booleans. Require JSON true or false literals.

Unknown-key stripping can hide misspellings. A client may send \`weeklyDigset\`, lose that setting, and still receive success for other fields. Strict rejection makes the mismatch observable and prevents silent partial intent.

Partial PATCH semantics are not implemented by current source. The page sends all four values, and the route writes all four names. Missing-field tests should therefore reject the body unless the endpoint contract is deliberately redesigned for partial updates.

Authentication and validation order deserves one explicit case. An unauthenticated request should return 401 without revealing payload details. Authenticated invalid input should reach validation, return a client error, and leave stored preferences untouched.

Do not assert the database rejects every malformed value in the same way across drivers. The API schema should produce stable outcomes before driver behavior matters. Keep one real database case for accepted values and storage mapping.

After any route or schema change, rerun all boolean combinations, wrong types per field, missing keys, unknown keys, wrong roots, malformed syntax, no user, update success, and insert fallback. Email preference payload validation tests should identify exactly which boundary allowed a bad value.

### Keep bad bodies small and easy to name

Change one field in each wrong-type case while the other three fields stay valid. This rule lets the response name one cause and keeps later write checks simple.

Use a short case name that states both field and bad kind, such as weekly-null or pack-string. A clear name helps the build report point straight to the failed row.

Keep broken JSON as raw text, since a JSON helper will turn it into valid text before sending. The request should fail during parse and must not reach the strict object check.

Keep arrays and null roots as valid JSON with the wrong shape. Those cases should reach shape checks, which makes them different from a missing quote or brace.

Use both \`"true"\` and \`"false"\` strings in the table. The second value is vital because a truthy string can hide a serious false-to-true bug in loose code.

Add one number at a time, including zero and one, without calling them false and true. JSON numbers are not booleans, even when another language might map those values to flags.

Add a key with a likely spelling error, not only a strange admin field. A real typo proves strict checks help honest clients as well as blocking fields that were never allowed.

For missing-field cases, remove one key instead of setting it to undefined in JavaScript. JSON cannot carry undefined, so deleting the key better matches a real request on the wire.

Keep the valid control next to each group of bad rows. If every row fails after a schema change, the control shows that the parser or harness broke before the type rule was tested.

Do not reuse a stored row after a bad case without reading it again. A fresh read proves no write slipped through even when the handler returned the expected error text.

### Make zero-write proof part of every rejection

Count user lookup, update, insert, and final read as separate calls. This split shows how far the request went and prevents one broad database mock from hiding an early write.

When validation runs before user lookup, every bad shape should show zero for all write-side calls. When auth fails first, body parsing should also remain at zero for that branch.

Freeze the old four values before the request, then compare each one after rejection. A call count can miss a side effect from code outside the mocked builder, while the row check sees the final fact.

For update success, require one update and no insert. For an empty update result, require one update and one insert, then compare the created row with all four request values.

For a database fault, keep the expected status in the server-error class rather than the client-error class. This line prevents a broad catch from making bad input and broken storage look the same.

Write only issue paths and short codes to the normal log. Put any safe detail in a test artifact, and never print the auth header or a full body from a real account.

If a new preference field is added, first add its strict schema key and one true-false pair. Then add the matching boolean column check and update the full dashboard control in the same review.

Use the [skills directory](/skills) to find a narrow API test aid after the core table passes. Email preference payload validation tests should still keep the four-key wire contract visible in their own source.

Run the full bad-body set once with a saved row and once with no saved row for that user. Both runs must stop before update or insert, so row presence cannot change how the strict input gate treats the same bad value.

Send each good body as real JSON text with the same content type used by the page, then read all four stored flags. This path checks parse, schema, key map, write, and response as one chain while each small unit test still gives fast fault clues.

Use a new user key for the insert case and an old user key for the update case, while all other test facts stay the same. Clear names keep the two write paths apart and make an extra insert easy to spot in the call log.

After a failed body, send a good body through the same test host and require a normal save. This follow-up proves the bad request did not leave shared state, a stale mock, or an open write that harms the next request.

Close the set with one signed-out bad body and one signed-in bad body, then compare where each path stops. The first must stop at auth without a parse, while the second must parse and reject before any saved flag can change.

Keep the final pass report to case name, stop point, status, safe issue code, and write count for each row. That small set gives the team enough proof to fix a bad branch without copying raw request data into long build logs.

Run one last wire check with keys in a new JSON order, since object order must not change which four names pass or which wrong key fails, then compare the saved row and response with the first good control. Keep the [API test guide](/blog/api-testing-best-practices-guide) close to this case for broad harness rules, while this suite still owns strict names, true and false types, zero-write proof, and the two save branches. Store one compact pass line with the schema version, valid case count, rejected case count, update count, and insert count, so a later field change has a clear base without raw body text.

## Frequently Asked Questions

### How do you test boolean-only email preference contracts?

Send complete four-key JSON objects through the real PATCH handler, varying one field at a time across booleans and invalid types. Require valid storage for true or false, controlled client errors for every other value, and zero update or insert calls whenever validation fails.

### What should boolean api validation tests cover?

Cover true, false, strings, numbers, null, objects, arrays, missing fields, unknown fields, malformed JSON, and wrong root types. Include update and insert success branches, authentication precedence, call counts, response details, and a direct database read for one valid mixed-value request.

### How should an invalid preference json body be reported?

Return a stable client error with normalized field issues, without stack traces, SQL text, tokens, or echoed sensitive values. Distinguish malformed syntax from a valid JSON value with the wrong shape. Both categories should cause zero preference writes and preserve the existing row.

### Why does email settings schema validation need strict objects?

Strict objects expose typos and unapproved keys instead of silently discarding them. That behavior keeps the request allowlist limited to four email settings and prevents storage-only columns from becoming inputs. Tests should include both a plausible misspelling and an unrelated extra property.

### What proves a reject string booleans api case works?

Send \`"true"\` and \`"false"\` as JSON strings while keeping other fields valid. Require a field-specific client error, zero update and insert calls, and unchanged stored values. Do not convert strings before parsing because that would hide the client contract violation.

### What diagnostics matter for nextjs patch input validation?

Record case name, root type, invalid field name, expected type, status, normalized issue code, user-query count, update count, insert count, and retained booleans. Redact submitted values when needed. Separate parser failures, schema failures, authentication results, and unexpected database errors in the report.

## Conclusion

Email preference payload validation tests must prove that only the intended four booleans cross from authenticated JSON into Drizzle writes. Current source lacks that runtime gate, so strict cases should expose the gap while valid mixed payloads protect update and insert compatibility.

[Open dashboard preferences](/dashboard/preferences), capture its complete four-key request, and add a boolean-only payload matrix before changing request fields. Use the [QASkills blog](/blog), [skills directory](/skills), and [getting-started guide](/getting-started) for the next focused API test.`,
};
