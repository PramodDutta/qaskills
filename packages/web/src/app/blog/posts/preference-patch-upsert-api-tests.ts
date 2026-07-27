import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Preference patch upsert api tests',
  description:
    'preference patch upsert api tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'preference patch upsert api tests',
  keywords: [
    'preference patch upsert api tests',
    'nextjs patch upsert testing',
    'drizzle update returning empty',
    'preference create after update',
    'api update or insert tests',
    'email settings upsert',
  ],
  relatedSlugs: [
    'api-testing-best-practices-guide',
    'testing-missed-clerk-webhook-user-recovery',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'database-testing-automation-guide',
  ],
  sources: ['https://orm.drizzle.team/docs/update', 'https://orm.drizzle.team/docs/insert'],
  repoEvidence: [
    'packages/web/src/app/api/user/preferences/route.ts:PATCH update and insert branches',
    'packages/web/src/db/schema/users.ts:userPreferences',
  ],
  content: `Preference patch upsert api tests should force two authenticated states: an existing preference row returned by update and a missing row that makes update return an empty array. Assert both responses, captured boolean values, query order, and operation counts. Then verify the create path leaves one controlled row without calling the behavior an atomic database upsert.

The current endpoint emulates an upsert with two statements rather than one conflict clause. The [dashboard preferences page](/dashboard/preferences) is the user-facing flow, while this article tests the route and table contract behind each save.

## Preference patch upsert api tests: What Must the Suite Prove?

Preference patch upsert api tests must prove that PATCH selects the authenticated database user, tries an update first, and inserts only when \`returning()\` yields no rows. Both successful branches should return the first persisted preference object as JSON.

The handler in \`packages/web/src/app/api/user/preferences/route.ts\` calls Clerk's \`currentUser\` before reading the body. Missing identity returns 401. A known Clerk identity then maps to a local user row, and an empty result returns 404 before preference writes.

After parsing JSON, PATCH takes four fields: \`emailNotifications\`, \`weeklyDigest\`, \`newSkillAlerts\`, and \`packAlerts\`. It passes those values into an update, sets \`updatedAt\` to a new date, filters by local user ID, and asks PostgreSQL to return changed rows.

When the update result is nonempty, the route returns \`updated[0]\` and never inserts. When the result is empty, it inserts a new preference row for that user with the four request values, calls \`returning()\`, and returns \`created[0]\`.

The table definition in \`packages/web/src/db/schema/users.ts\` gives each boolean a non-null true default. It also defines a required foreign key to users with cascade deletion. The current declaration does not mark \`userId\` as unique, which matters when describing concurrency.

Therefore, the route is an update-or-insert sequence, not proof of an atomic upsert. Preference patch upsert api tests should lock the serial branch behavior and add a separate integration check for duplicate risk. They should not claim the schema prevents two simultaneous inserts.

A passing suite asserts response status, JSON body, selected user, update values, timestamp type, where-user ID, returned rows, insert values, and call counts. One existing-row case and one missing-row case provide the minimum positive branch proof.

Use the [skills directory](/skills) only as a stable internal navigation check. Preference fixtures should contain fixed users and booleans, with no dependency on skill records or notification delivery.

## Which QASkills Code Paths Own This Contract?

The route owns auth, body reads, user lookup, branch choice, and the JSON it sends back. The schema owns field defaults, null rules, the user link, and whether the database bars more than one row.

In \`packages/web/src/app/api/user/preferences/route.ts\`, PATCH wraps all work in one try block. A thrown body parse, user query, update, or insert becomes status 500 with \`Failed to update preferences\`. Expected unauthenticated and missing-user outcomes return before that catch handles a fault.

The update builder receives all four request properties plus a fresh \`Date\`. Tests can capture this object and assert each boolean exactly. Avoid asserting a fixed timestamp; check that it is a date within the test interval.

The branch condition is only \`updated.length === 0\`. It does not first select preferences, and it does not inspect an affected-row count. The returned update array is therefore the direct control point for unit-level branch tests.

The insert builder receives \`userId\` plus the four booleans, but no explicit timestamps. Database defaults supply created and updated values. A route double should return a complete row that resembles the schema output instead of relying on undefined fields.

The [Drizzle update documentation](https://orm.drizzle.team/docs/update) shows how PostgreSQL can send changed rows back through \`returning()\`. The [Drizzle insert documentation](https://orm.drizzle.team/docs/insert) shows the same tool for new rows and lists conflict based write APIs.

Those source pages explain library capabilities, while repository code selects the current two-statement design. Tests should assert what QASkills invokes, not silently replace it with \`onConflictDoUpdate\` inside the harness.

The table source, \`packages/web/src/db/schema/users.ts\`, does not define a unique index for \`userPreferences.userId\`. That fact belongs in test review because exact-one-row guarantees cannot come solely from this schema under concurrent calls.

The [database testing guide](/blog/database-testing-automation-guide) covers transaction and constraint checks. Keep the route unit tests fast, then use one database-backed case to inspect actual row count after a serial create and update.

## Nextjs patch upsert testing: Baseline Cases

Nextjs patch upsert testing needs four baseline states: unauthenticated, missing local user, existing preference row, and absent preference row. Add parse and database faults only after those paths prove the basic control flow.

For unauthenticated access, return null from \`currentUser\`. Expect status 401 and \`Unauthorized\`, then assert the user query, update, and insert never run. This row proves auth remains the first gate.

For a Clerk user without a local database row, return one identity and an empty user selection. Expect status 404 and \`User not found\`. The update and insert doubles must remain unused because there is no foreign-key owner.

The existing-row case returns one local user and one row from the update. Assert status 200, exact response data, one update, and zero inserts. Also assert the where filter used the local database ID, not the Clerk ID.

The missing-row case returns one local user and an empty update array. It should then call insert once and return the created row with status 200. Capture the insert object and verify the same four booleans were passed through.

Preference patch upsert api tests should use contrasting values, such as false, true, false, true. Uniform values can hide a swapped field. A second case can invert all four to show every key reaches the correct column.

### Prove each write with plain facts

Give the test user one short local ID and one short Clerk ID, then keep them distinct in every check. The user read should use the Clerk value, while each preference write should use the local value. This small contrast catches an ID mix without the noise of a full user row.

Save the four input flags in one fixed object that each branch can share by value. Make a new object for each request so no prior call can change the next case. Compare each named flag at the update seam, insert seam, response body, and final row.

For the update path, save the time just before and just after PATCH runs. Check that the new date falls in that range and that no insert call exists. This proves the route asked for a fresh write time without tying the case to a slow clock.

For the create path, let the database add row ID and time fields in the returned test value. Check that the route sent only the user ID and four flags that source shows. This keeps the mock close to the real write and makes a new route field plain.

Malformed JSON throws during \`req.json()\` and reaches the generic 500 catch. Treat this as a current route contract, not as a field validation response. The route does not use a Zod schema for PATCH today.

A missing body property also lacks an explicit route rejection. Do not invent a 400 response. If validation becomes a requirement, add it to source first and then add precise tests for the new behavior.

Use the [API testing best-practices article](/blog/api-testing-best-practices-guide) for broader fixture design. This nextjs patch upsert testing suite should stay centered on auth, user mapping, update results, and insertion.

## Drizzle update returning empty: Test Matrix

Drizzle update returning empty is the only condition that selects the create branch. The matrix must separate a valid empty result from an update rejection, because a rejected update goes to the 500 catch and must never insert.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Existing preference row updated | Known user and one returned update row with alternating flag values | Nonempty returned row selects the first success path | 200 with the exact changed row and fresh update time | One user read one update and no insert call | Insert runs or any named flag maps to the wrong field |
| Missing row with empty update result | Known user with update resolved to an empty array and a ready create row | Empty returned array alone selects the insert path | 200 with the exact new row from the insert result | One user read one update and one insert in order | Missing insert repeated update or wrong local user ID |
| Insert succeeds after empty update | New row adds database ID and time defaults to the four sent booleans | Create response uses the first returned insert row | Body matches stored flags ID and default time fields | Serial create then update leaves one controlled row | Response uses stale update data or loses a flag |
| Update rejects | User lookup passes and the update promise throws a local test fault | Outer catch handles write failure not row absence | 500 with the fixed preference update error object | One update attempt and zero insert calls | Rejection is treated as an empty row match |
| Insert rejects after update | Update returns empty and the one insert promise throws | Same outer catch after the create branch starts | 500 with no created row or success fields | One update and one insert attempt with no retry | False success second insert or leaked database text |

The existing-row row should capture \`updatedAt\` in the update values. Record time immediately before and after the call, then assert the date falls within that window. This check avoids brittle clock text while proving the route requested a fresh update time.

For the empty result, assert insert values do not include an explicit \`updatedAt\`. The database schema has defaults for timestamps, and the route leaves them to persistence. A mock that fills those fields before capture could hide an unexpected route change.

The update-rejection row is essential. A careless implementation could catch an update error and continue into insertion, confusing outage with absence. Current code does not do that because both statements share the outer try.

The insert-rejection row should return status 500 and the same generic message. Assert no second insert attempt and no success body. The route does not retry, so a retry expectation would invent behavior.

Preference patch upsert api tests also need a database-backed serial sequence. Start with no preference row, call PATCH once to create, call it again to update, then count rows by user. Expect one row in this controlled sequence and verify the four final booleans.

That row-count check proves the normal path, not concurrency safety. Because \`userId\` is not unique, two calls that both see empty update results could each insert. State this limitation in the test name and review notes.

The [PostgreSQL JSONB filter article](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) tests different query behavior. Reuse its database fixture discipline, but do not mix filter assertions into this boolean preference matrix.

## How Should Preference create after update Be Exercised?

A preference create after update test should force \`returning()\` to produce an empty array, then inspect the insert rather than simulating a prior select. That exact setup follows the route branch and guards against a future extra read.

Return a local user with ID \`user-1\`. Capture the update filter and values, return \`[]\`, capture insert values, and return a complete new preference row. Assert the response equals that created row and status remains 200.

The update must occur exactly once before insertion. Use an invocation log with labels such as \`select-user\`, \`update-preferences\`, and \`insert-preferences\`. Assert the ordered list so an insert-first regression cannot pass on final state alone.

\`\`\`typescript
import { expect, test, vi } from 'vitest';
import { PATCH } from '@/app/api/user/preferences/route';

test.each([
  ['updates an existing row', [updatedRow], 0, updatedRow],
  ['creates after an empty update', [], 1, createdRow],
])('%s', async (_name, updateResult, insertCalls, expected) => {
  vi.mocked(currentUser).mockResolvedValue(clerkUser);
  selectUsers.mockResolvedValue([dbUser]);
  updatePreferences.mockResolvedValue(updateResult);
  insertPreferences.mockResolvedValue([createdRow]);

  const response = await PATCH(makePreferenceRequest({
    emailNotifications: false,
    weeklyDigest: true,
    newSkillAlerts: false,
    packAlerts: true,
  }));

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual(expected);
  expect(updatePreferences).toHaveBeenCalledTimes(1);
  expect(insertPreferences).toHaveBeenCalledTimes(insertCalls);
});
\`\`\`

This example shows branch selection through returned rows and operation counts. The real harness should also capture update and insert values, because a correct branch with swapped booleans still violates the endpoint contract.

Use a separate test for update rejection. Make the update promise reject and assert status 500, generic body, and zero insert calls. Do not put that state in the empty-array row because rejection and absence are not interchangeable.

For the integration check, create an isolated database user and remove related preferences during cleanup. Call the handler or a test transaction through the same route logic. Query by user ID after each call and compare row count plus values.

Preference patch upsert api tests should not make concurrent exact-one-row assertions pass by serializing calls in the test runner. If concurrency matters, first add a unique constraint and an atomic conflict strategy, then write a race that proves the new guarantee.

The [missed webhook recovery article](/blog/testing-missed-clerk-webhook-user-recovery) discusses another user-row boundary. Keep this case explicit: PATCH returns 404 when the Clerk identity lacks a local user and does not create that user.

## Step-by-Step Api update or insert tests Procedure

Api update or insert tests should begin with controlled identity fixtures, capture both persistence calls, compare their returned contract, and finish with a database-backed row-count check. Follow these steps in order so branch and storage evidence remain separate.

1. Create authenticated fixtures with a local user and with or without an existing preference record.
2. Capture update values, returning rows, and the empty-array condition that selects insertion.
3. Assert one returned JSON contract for both update and create outcomes, plus exact call counts.
4. Repeat the serial create-then-update flow against a database fixture and verify one row exists for that user.

The route unit layer should not require a live Clerk session. Mock \`currentUser\` with a minimal known identity and control the local user query. This isolates route logic while preserving the difference between external and database IDs.

Build a request helper that always includes all four booleans. TypeScript object literals can prevent accidental omissions in test code, even though the runtime route does not validate them. A complete helper keeps these branch tests about persistence rather than body shape.

\`\`\`typescript
import { eq } from 'drizzle-orm';
import { expect, test } from 'vitest';
import { db } from '@/db';
import { userPreferences } from '@/db/schema';

test('creates once and then updates the same serial fixture', async () => {
  const user = await seedIsolatedUser();

  await patchPreferences(user, {
    emailNotifications: true,
    weeklyDigest: false,
    newSkillAlerts: true,
    packAlerts: false,
  });
  await patchPreferences(user, {
    emailNotifications: false,
    weeklyDigest: true,
    newSkillAlerts: false,
    packAlerts: true,
  });

  const rows = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, user.id));

  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ weeklyDigest: true, packAlerts: true });
});
\`\`\`

This code checks normal serial behavior through the real schema. Its name must not imply a concurrency guarantee because the current table lacks user uniqueness. Add cleanup in a final hook so failed assertions cannot leave a row for another case.

Record both branch results in CI output: update-return count, insert count, response ID, and final row count. Avoid printing email addresses or Clerk data. A generated test user ID is enough for diagnosis.

Use the [getting started page](/getting-started) only for manual account setup. Automated api update or insert tests should own their users, requests, and database cleanup.

## Email settings upsert: Assertions and Diagnostics

Email settings upsert assertions should prove field identity, not merely that four booleans were written. Use alternating values and compare each captured property by name at update, insert, response, and final storage seams.

The update case should assert \`emailNotifications\`, \`weeklyDigest\`, \`newSkillAlerts\`, and \`packAlerts\` separately. A broad object containment check can still be useful, but explicit failures show which setting was swapped or dropped.

The create case adds \`userId\` and relies on schema defaults for IDs and timestamps. Assert that the insert uses the local database user ID. A Clerk ID in this field would fail the foreign-key contract.

On 401 and 404, the response body should contain only the expected error object. On write faults, expect status 500 and \`Failed to update preferences\`. Do not expect database details in the public response.

Preference patch upsert api tests should include operation counts in every diagnostic. For example, an empty update should report one update and one insert, while a rejected update should report one attempted update and zero inserts. These facts identify a mistaken branch quickly.

The route does not send email during PATCH. Saving settings only persists booleans. Tests should not mock Resend or assert digest delivery, because delivery belongs to cron and email send suites.

The [unsubscribe route](/unsubscribe) is a separate public preference path with token behavior. Do not infer that PATCH shares its authentication or response rules. Link the flows in a release plan while keeping tests owned by their endpoints.

After a successful browser save, reload the preferences view and confirm the four controls reflect returned storage. The route article does not require a full browser example, but this post-flow catches a client that ignores one response field.

Keep failure logs short: branch, auth state, local user count, update-return count, insert count, and projected response. That set provides enough evidence without exposing personal account details.

### Keep a safe save record

Write one short trace for each case with auth, user read, update, insert, status, and returned row in source order. Mark the first step that was lost or added, and hide all fields the test does not need. This view lets a team judge branch drift with one quick scan.

For flag faults, print four lines with the field name, sent value, stored value, and returned value. Do not sort the names, since their source order makes a swap much easier to see. Keep the local user ID in a separate line so it cannot be read as a flag.

For a write fault, show whether the promise was empty, full, or rejected before the route chose its next step. An empty update must lead to one insert, while a rejected update must lead to none. That plain state note is more useful than a long stack from the mock.

For the row count check, save the user ID, count after create, count after update, and the last four flags. Do not call the serial result proof of a safe race. Keep that note next to the count so no later report turns one normal run into a database claim.

## What Regressions and Boundaries Prevent False Confidence?

The phrase upsert can hide two distinct designs. QASkills currently performs update and then insert, while Drizzle also supports conflict-based APIs. Tests must name the actual sequence and avoid implying atomic behavior.

The missing unique constraint is a real boundary. A serial create followed by update should leave one row, yet simultaneous empty updates could both insert. Preference patch upsert api tests should document this exposure rather than make a false guarantee.

Do not turn an update rejection into an empty result in mocks. An empty resolved array means no row matched, while rejection means the write failed. Only the first state should select insertion under current code.

Do not invent request validation. The route reads four properties but has no explicit boolean schema. Missing or wrong-type behavior can depend on Drizzle and database constraints, so add a route validator before promising clean 400 responses.

The existing-row path returns the first row from \`returning()\`. If duplicate preference rows already exist, one update may return several rows, and the route still serializes only the first. A data-quality test can expose this condition without claiming the handler repairs it.

Keep GET preference behavior in its own suite. GET also creates defaults when no row exists, but PATCH chooses update-then-insert. Mixing those branches can hide which endpoint created a fixture.

Run the matrix again when the table key, defaults, body checks, auth, or write path changes. If source adopts \`onConflictDoUpdate\`, replace call order checks with tests for the conflict key and one write.

The [QASkills blog](/blog) contains adjacent database and API guidance. This suite remains complete when each current PATCH branch has one positive control, one fault control, and observable persistence evidence.

## Frequently Asked Questions

### How do preference patch upsert api tests cover both branches?

Return one row from the mocked update to exercise the update response, then return an empty array to select insertion. Assert response data, boolean values, user filter, operation order, and insert call count. Follow with a serial database case that creates once and updates the same fixture.

### What should nextjs patch upsert testing do before writes?

It should cover missing Clerk identity and a Clerk user without a local database row. The first returns 401 without querying users, while the second returns 404 after one user query. Both must leave update and insert seams unused before positive branch tests begin.

### Why is drizzle update returning empty different from rejection?

An empty resolved array means the update matched no preference row, which intentionally selects creation. A rejected promise means persistence failed and reaches the generic 500 catch. Tests must model these states separately and assert that rejection never causes an insert attempt.

### Does preference create after update guarantee one row under concurrency?

No. The current sequence uses separate update and insert statements, and the table does not declare \`userId\` unique. A serial integration test can prove normal one-row behavior, but concurrency safety needs a database constraint and an atomic conflict strategy before tests can promise it.

### Which values should api update or insert tests compare?

Compare all four booleans by property name, the local user ID, update timestamp type, returned row ID, response status, and final stored values. Alternating true and false values make swaps visible. Also record update-return length and exact insert calls for branch diagnosis.

### Does email settings upsert send a digest immediately?

No. PATCH stores preference flags and returns the persisted row; it does not call an email provider. Delivery belongs to separate digest and alert paths. Keep route tests focused on authentication, user mapping, update or insert behavior, response data, and database fault handling.

## Conclusion

Preference patch upsert api tests should prove the nonempty update branch, empty-update create branch, and both write failures with exact values and call counts. They should also state that the current two-statement sequence and non-unique user column do not establish atomic concurrency safety.

[Open dashboard preferences](/dashboard/preferences), save a controlled preference change, and add both PATCH persistence branches to the integration suite. Review the [database testing guide](/blog/database-testing-automation-guide) before adding a constraint or changing the write strategy.`,
};
