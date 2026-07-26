import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Partial email preference patch tests',
  description:
    'partial email preference patch tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'partial email preference patch tests',
  keywords: [
    'partial email preference patch tests',
    'partial patch undefined fields',
    'drizzle update omitted values',
    'email preference patch semantics',
    'nextjs partial update contract',
    'preserve unspecified preferences',
  ],
  relatedSlugs: [
    'api-testing-best-practices-guide',
    'authentication-authorization-testing-guide',
    'error-handling-testing-patterns',
    'testing-missed-clerk-webhook-user-recovery',
  ],
  sources: ['https://orm.drizzle.team/docs/update', 'https://www.rfc-editor.org/info/rfc9110'],
  repoEvidence: [
    'packages/web/src/app/api/user/preferences/route.ts:PATCH body destructuring and set',
    'packages/web/src/app/dashboard/preferences/page.tsx:savePreferences full payload',
  ],
  content: `Partial email preference patch tests should seed distinct existing values, send one boolean field, and read the row back. The supplied field must change, every omitted field must retain its prior value, and explicit false must remain false. Empty, null, missing-row, unauthenticated, and full UI payload cases need separate expectations.

The route passes four destructured values into Drizzle, so an object-spy alone can be misleading when omitted JSON keys become \`undefined\` in that object and Drizzle ignores those update values. The strongest proof checks both the generated update seam and the persisted row returned by the route, using seed values that make each lost field easy to see.

## Partial email preference patch tests: What Must the Suite Prove?

Partial email preference patch tests must prove field-level preservation for an existing preference row when a request supplies only \`weeklyDigest: false\` and leaves every other key out of its JSON body. That column must become false while email notifications, skill alerts, and pack alerts remain unchanged in both the reply and a fresh read. Status, returned JSON, update count, and stored state must agree for the same user row.

Start with alternating values rather than four identical booleans, since a row such as true, false, true, false makes an accidental overwrite plain in a short diff. If every field starts true, a default of true could hide a dropped value and let a weak test pass.

The contract needs an explicit false case because truthy filtering is a common mistake, yet a correct update must not treat false as absent from a body that names the field. Assert false in the request body, update call, returned row, and follow-up read so no loose truth check can pass.

An empty object is a separate boundary because all four destructured preference values are undefined in the current route while \`updatedAt\` is still set to the time of this call. Drizzle should omit undefined preference columns, so the existing booleans stay stable and the route can return the row with only its time field changed.

Explicit null is not omission, since the Drizzle update guide states that undefined values are ignored while null is used to set a column to null in the generated query. Because preference columns are intended as booleans, tests should expect the route's actual database error behavior rather than treating null as preservation or changing it to false.

The missing-row path also differs from an update because the route first updates and then inserts when \`returning()\` yields no row for the chosen local user. A partial request on that branch needs its own test because insert defaults and required schema rules are not the same as update omission on a row that already exists.

Use the [preferences dashboard](/dashboard/preferences) for a final user check, but drive the route directly for partial bodies with one key, two keys, and no keys. The current page always sends all four booleans from its state in one full JSON object.

Partial email preference patch tests pass only when one-field and two-field requests preserve each omitted stored value through a new read after the route has replied. They fail on null writes, false loss, default replacement, extra update calls, or a response that disagrees with storage for the same fixture.

## Which QASkills Code Paths Own This Contract?

The API owner is \`packages/web/src/app/api/user/preferences/route.ts\`, whose \`PATCH\` handler calls \`currentUser()\`, parses JSON, and destructures \`emailNotifications\`, \`weeklyDigest\`, \`newSkillAlerts\`, and \`packAlerts\` from the same body. It does not apply a request schema before sending those values to Drizzle, so route tests must show how each raw value behaves.

The handler finds the local user by Clerk ID, returning 401 for a missing Clerk user and 404 for a signed-in Clerk user without a local row. Neither branch should update or insert preferences, and both should leave the seeded row count unchanged.

For a found local user, the route calls \`db.update(userPreferences).set({...})\`, and the set object contains all four destructured values plus a new \`updatedAt\` value for this request. Omitted request keys therefore appear as JavaScript \`undefined\` at this source boundary before Drizzle builds the actual update.

Drizzle's [SQL update guide](https://orm.drizzle.team/docs/update) says values of undefined are ignored in the update object and null must be passed to set null. That documented library rule is why omitted fields can remain unchanged even though the route includes their keys.

The route uses \`returning()\` and sends its first row as JSON, but when no update row returns it inserts preferences with the same four values and returns the created row instead. Any thrown parse, query, constraint, or insert error reaches the catch and produces status 500 with a fixed error message for the client.

The client owner is \`packages/web/src/app/dashboard/preferences/page.tsx\`. Its state always contains all four booleans after the first page load or the built-in initial values. \`savePreferences\` serializes the whole \`preferences\` object in a PATCH request, so ordinary page use does not create an omitted-field request for the API.

The page tracks a successful save and shows a success message when the response is OK for that full body. It throws its own generic error for a non-OK response and shows a short failure state. Component coverage should assert this full-payload behavior without using it as proof of API partial semantics.

The [HTTP semantics reference](https://www.rfc-editor.org/info/rfc9110) is useful for separating request and response observations. The exact field-preservation rule still comes from QASkills route code and Drizzle's update behavior.

See the [API testing practices](/blog/api-testing-best-practices-guide) for fixture design with small rows and clear before and after states. Keep the route and page tests separate so one full client payload cannot mask an API regression in how omitted keys are handled.

## Partial patch undefined fields: Baseline Cases

Partial patch undefined fields need an existing-row control, one supplied key, two supplied keys, explicit false, empty JSON, explicit null, and a missing-row branch. Each fixture should begin with values chosen to reveal unintended changes in every boolean, not just the one named by the case. Read the stored row after every request with a query that does not reuse the route result.

The one-key control sends \`{ weeklyDigest: false }\` against a row where weekly digest is true. The other three values should include both true and false states that would reveal a reset to one common default. Assert only weekly digest changes and \`updatedAt\` receives a newer value from the route call.

The two-key case changes values in opposite directions. For example, send email notifications false and pack alerts true against true and false starting values in the same row. This catches update builders that keep only one supplied key or apply one value to both named fields.

The explicit false case should not share its only assertion with the one-key control. Add a request where a field is already true, send false, and inspect the captured set input before the database mock returns. False must appear as a value, not disappear through a truthy filter or a key list built from enabled settings.

The empty-object case sends valid JSON \`{}\`. The route still performs an update because it always sets \`updatedAt\`. Assert one update, no insert, stable booleans, and a returned row matching persisted values.

JavaScript undefined cannot be represented directly in JSON. \`JSON.stringify({ weeklyDigest: undefined })\` produces an empty object, so an HTTP-level test of that input is really the empty-object case. A direct request-double test can still show destructuring behavior, but label it as a unit boundary.

Explicit null is different and can be sent in JSON. Since the route has no boolean validation, null reaches the update set. Test the real database outcome and verify no stored boolean changed after a rejected statement; do not rewrite null as omission in the fixture.

The missing-row branch begins when update returning yields an empty array. Test full and partial bodies separately. The route's insert result defines the response, and that behavior should not be inferred from the existing-row update case.

Use the [unsubscribe page](/unsubscribe) for unsubscribe-token behavior, not for partial PATCH coverage. These settings share a product area but follow different APIs.

Partial email preference patch tests should repeat the one-key case for all four fields. A table-driven loop keeps those checks consistent while distinct seed values make each omission visible.

## Drizzle update omitted values: Test Matrix

Drizzle update omitted values should be checked through both the set object and final storage. The set spy confirms request mapping, while the persisted row proves the ORM treated undefined as omission. The following matrix names the expected route branch and regression signal.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| One supplied boolean | Existing row and one changed key | Update with three undefined values | 200 returns changed field and prior others | One update; no insert | Omitted value resets or becomes null |
| Two supplied fields | Existing row with opposite seed values | Same update branch | Both supplied values appear in response | One statement changes two columns | Only one request key is applied |
| Explicit false | Existing true value and JSON false | Destructured false in \`.set\` | Response preserves false | False reaches generated update | Truthy filter drops the change |
| Empty object | Existing row and \`{}\` | Undefined booleans plus \`updatedAt\` | 200 returns unchanged booleans | Timestamp update only | Defaults overwrite stored values |
| Undefined or null | Empty JSON versus explicit null | ORM omission versus null assignment | Empty body preserves; null follows error contract | No invented coercion occurs | Null is silently treated as omitted |

The first row should inspect every field, not only the changed one. Field preservation is the feature under test. A response containing the requested false value can still hide damage to other columns.

The second row catches object filtering mistakes. Build expected state from the seed plus supplied keys, then compare the full returned record. Avoid deriving expected values from the response itself.

The third row is small but essential. A helper that uses \`if (value)\` before adding a field will drop false. Current route passes false directly, and Drizzle parameterizes supplied update values.

The empty-object row documents a real current behavior: \`updatedAt\` still changes. Do not assert zero update statements. Instead, assert the four preferences remain stable while the timestamp path executes once.

The last row must separate undefined from null in its test name and expected result. Combining them would contradict the Drizzle source. Use [error handling patterns](/blog/error-handling-testing-patterns) when deciding how the API should report invalid null input in a future validation change.

## How Should Email preference patch semantics Be Exercised?

Email preference patch semantics should be exercised with an integration database or a faithful SQL test store. A chain mock that simply echoes the set object cannot prove omission, because it may return undefined fields unlike the real ORM. Persist, return, and reread the row.

Authenticate as a controlled Clerk user mapped to one local user. Seed one preference record with alternating booleans, then submit one-key JSON. Keep all other rows out of the fixture so the \`where(userId)\` assertion remains clear.

The route-level example below assumes database cleanup and Clerk identity are provided by the surrounding test harness. It drives a real request and verifies the full row after the response.

\`\`\`typescript
import { expect, it, vi } from 'vitest';
import { PATCH } from '@/app/api/user/preferences/route';
import { currentUser } from '@clerk/nextjs/server';

it('changes one preference and preserves omitted fields', async () => {
  vi.mocked(currentUser).mockResolvedValue({ id: 'clerk-pref-1' } as never);
  await seedUserAndPreferences({
    clerkId: 'clerk-pref-1',
    emailNotifications: true,
    weeklyDigest: true,
    newSkillAlerts: false,
    packAlerts: false,
  });

  const request = new Request('http://local/api/user/preferences', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ weeklyDigest: false }),
  });
  const response = await PATCH(request as never);

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    emailNotifications: true,
    weeklyDigest: false,
    newSkillAlerts: false,
    packAlerts: false,
  });
  await expect(readPreferences('clerk-pref-1')).resolves.toMatchObject({
    emailNotifications: true,
    weeklyDigest: false,
    newSkillAlerts: false,
    packAlerts: false,
  });
});
\`\`\`

This test uses a real Drizzle update path, so it can prove undefined values were omitted. The helper names represent fixture utilities, not production functions. They should insert and remove only the named test records.

Add a lower-level spy when query shape matters. Capture the object passed to \`.set\` and expect \`weeklyDigest\` false, the other preference values undefined, and \`updatedAt\` to be a Date. Then rely on the integration result for storage semantics.

Run a full-body control with all four booleans. It should update each value and return one row. This protects compatibility with the current dashboard client while partial requests cover direct API consumers.

Partial email preference patch tests should assert one local-user select, one preference update, and zero inserts for an existing row. A duplicate insert can cause a correct-looking response while damaging persistence.

Use [dashboard preferences](/dashboard/preferences) only after route cases pass. The browser check confirms the client still sends the full object and presents save state correctly.

## Step-by-Step Nextjs partial update contract Procedure

A Nextjs partial update contract procedure should begin with storage, drive the route directly, and finish at the client compatibility boundary. Distinct seed values and follow-up reads prevent response-only false positives. Keep each body literal visible in the test report.

1. Seed a preference row with distinct values that make accidental overwrites visible.
2. PATCH one field at a time and capture the Drizzle update set.
3. Assert omitted columns retain their original values and explicit false is not discarded.
4. Compare the API behavior with the UI, which currently sends a full payload.

Repeat step two for all four keys. A table can pair each field with its opposite value and expected preserved fields. Reset the seed between rows so one update cannot prepare the next case accidentally.

After one-key cases, send two keys, an empty object, and explicit null. Use a new transaction or clean fixture for each case. Verify database state even after non-OK responses.

The client compatibility check can intercept GET and PATCH calls in a browser without touching storage. Return a fixed preference object from GET, toggle one switch, click save, and inspect the outgoing JSON.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('preferences page sends the complete state object', async ({ page }) => {
  let patchBody: Record<string, boolean> | undefined;

  await page.route('**/api/user/preferences', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        json: {
          emailNotifications: true,
          weeklyDigest: true,
          newSkillAlerts: false,
          packAlerts: false,
        },
      });
      return;
    }

    patchBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, json: patchBody });
  });

  await page.goto('/dashboard/preferences');
  await page.getByRole('switch').nth(1).click();
  await page.getByRole('button', { name: 'Save Preferences' }).click();

  expect(patchBody).toEqual({
    emailNotifications: true,
    weeklyDigest: false,
    newSkillAlerts: false,
    packAlerts: false,
  });
});
\`\`\`

This browser case proves \`savePreferences\` serializes current state from \`packages/web/src/app/dashboard/preferences/page.tsx\`. It does not prove omitted fields are preserved because none are omitted. Keep that distinction in the test name.

The [authentication testing guide](/blog/authentication-authorization-testing-guide) can extend 401 and 404 coverage. This procedure focuses on field updates after identity and local-user lookup succeed.

## Preserve unspecified preferences: Assertions and Diagnostics

Preserve unspecified preferences assertions need a before row, request body, captured set object, response row, and after row. Store these values in a compact failure message. The difference should show only supplied fields and the update timestamp.

Compare booleans explicitly rather than using truthy checks. \`expect(value).toBe(false)\` catches accidental undefined, null, zero, or omission. Apply the same strict check to all returned and persisted fields.

Count database effects. An existing row should cause one update and zero inserts. A missing row should cause one update attempt followed by one insert, which is a different expected branch.

For an empty object, expect the timestamp to change if the fixture clock advances. Use a fixed fake time when exact values matter. Otherwise, assert the new timestamp is a Date and the four boolean values are unchanged.

For null, capture status, fixed error body, and stored state. Do not demand a particular low-level database message because the route replaces errors with \`Failed to update preferences\`. A test can spy on server logging without exposing database details to the client.

When a mock database is used, make its update behavior ignore undefined values. A fake that merges undefined onto the row will report a defect not present in Drizzle. The [Drizzle update documentation](https://orm.drizzle.team/docs/update) should guide that faithful double.

Partial email preference patch tests should identify the field name in each failure. A message such as \`weeklyDigest request changed packAlerts from false to true\` gives immediate evidence. A broad object snapshot is harder to judge.

Keep a final full-payload page check through the [preferences route](/dashboard/preferences). It should confirm the UI contract without weakening direct API preservation checks.

## What Regressions and Boundaries Prevent False Confidence?

The dashboard always sends all four fields, so a successful browser save does not prove partial updates. Direct route tests must omit keys in actual JSON. Keep this requirement even when the current product has only one client.

A set-object spy alone also falls short. The route includes omitted keys with undefined values, and Drizzle ignores them later. Persisted state is the result users care about.

Do not group undefined and null. Undefined values are ignored in Drizzle updates, while null requests assignment. A future request schema may reject null earlier, but tests should track whichever branch the repository implements.

The empty-object case changes \`updatedAt\`, so expecting no write would be false. Assert no preference changes rather than no statement. If the product later rejects empty bodies, update status and side-effect expectations together.

The missing-row insert fallback has different semantics. Existing-row preservation does not prove a partial body creates sensible defaults. Add an explicit missing-row case before changing insert values or schema defaults.

Authentication and local-user lookup happen before preference updates. A 401 or 404 response says nothing about partial update behavior because the relevant code never ran. Use controlled identities for field cases.

Response JSON can look correct when a database fake simply returns the seed. Follow with an independent read or inspect generated SQL parameters. Partial email preference patch tests need at least one real ORM-backed case.

After route parsing, Drizzle, schema, dashboard state, or save logic changes, rerun each matrix row and all four one-field cases. Browse the [QASkills blog](/blog) for adjacent auth and error coverage.

## Frequently Asked Questions

### How do you verify omitted preference fields remain unchanged?

Seed an existing row with alternating booleans, send JSON containing one changed field, and inspect both response and stored row. Build expected state from the seed plus that supplied key. Repeat for all four fields so no omitted column can reset unnoticed.

### What are partial patch undefined fields in this route?

When a JSON key is absent, destructuring gives that variable the value undefined. The route still includes its key in the Drizzle set object. Drizzle ignores undefined update values, so existing columns remain unchanged. An HTTP body cannot carry JavaScript undefined directly; explicit null is different.

### How should drizzle update omitted values be asserted?

Capture the set object to verify request mapping, then use a real or faithful Drizzle path and read the row afterward. The set object will contain undefined keys, while generated update behavior should omit those columns. Both observations are needed for a precise regression test.

### What proves email preference patch semantics for false?

Start with a true stored value, send that field as false, and assert strict false in the captured set, response, and follow-up read. Do not use truthy checks or conditionally build expectations. This case catches code that mistakes an explicit false value for an omitted key.

### Does the nextjs partial update contract match the dashboard payload?

The API can receive partial JSON, but the current dashboard serializes its complete four-field state on every save. A browser interception should preserve that compatibility behavior. Separate route tests must still send one-field and empty bodies because the full client payload cannot prove omission rules.

### Which checks preserve unspecified preferences after errors?

For explicit null, malformed JSON, authentication failure, and local-user failure, record response status and read storage afterward. No preference should change when the update statement fails or never runs. Keep low-level error text out of client expectations because the route returns fixed messages.

## Conclusion

Partial email preference patch tests should prove one-field changes through response and persistence, while preserving every omitted boolean. Treat false as supplied, undefined as omitted by Drizzle, and null as a separate invalid boundary. Keep the dashboard's full payload as compatibility evidence, not partial-update proof.

[Open dashboard preferences](/dashboard/preferences), save one preference at a time in an API fixture, and lock preservation of every omitted field. Then browse [QA skills](/skills) for database and API test patterns that can strengthen the route suite.`,
};
