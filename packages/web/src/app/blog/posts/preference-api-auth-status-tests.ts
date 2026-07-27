import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Preference api auth status tests',
  description:
    'preference api auth status tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'preference api auth status tests',
  keywords: [
    'preference api auth status tests',
    'preferences api 401 404',
    'clerk user missing database',
    'nextjs auth error matrix',
    'api status code assertions',
    'preference endpoint failure tests',
  ],
  relatedSlugs: [
    'authentication-authorization-testing-guide',
    'testing-missed-clerk-webhook-user-recovery',
    'api-testing-best-practices-guide',
    'api-security-testing-checklist-2026',
  ],
  sources: [
    'https://clerk.com/docs/reference/nextjs/app-router/current-user',
    'https://www.rfc-editor.org/info/rfc9110',
  ],
  repoEvidence: [
    'packages/web/src/app/api/user/preferences/route.ts:GET and PATCH 401,404,500 branches',
    'packages/web/src/middleware.ts:isProtectedRoute',
  ],
  content: `Preference api auth status tests should prove that no Clerk user returns 401, an authenticated identity with no local row returns 404, and an unexpected read or write fault returns 500. Success cases must also distinguish an existing preference row from the GET or PATCH branch that creates one after a missing-row result.

This matrix keeps identity, local persistence, and service faults as separate states. A passing suite checks exact status, JSON body, query order, insert or update calls, timestamps, logs, and the different protection points for the dashboard and API.

## Preference api auth status tests: What Must the Suite Prove?

Preference api auth status tests must prove the first failed gate, not merely any non-200 result. Both handlers call \`currentUser()\` first, return 401 when it is null, and make no database call in that branch.

When Clerk returns a user, both handlers query \`users\` by \`users.clerkId\`, and an empty local result returns 404 with \`{ error: 'User not found' }\`. This state proves that an external identity exists but its QASkills row does not.

GET then queries \`userPreferences\` by the local user ID, and an existing row returns as JSON. A missing row triggers an insert with four true defaults, and the first returned row becomes the response.

PATCH parses the request body after auth, reads the local user, and updates the four preference values plus \`updatedAt\`. If no row is returned, it inserts a new row with the supplied values and returns that created row.

Any thrown error reaches a handler-specific catch. GET returns \`{ error: 'Failed to fetch preferences' }\`, while PATCH returns \`{ error: 'Failed to update preferences' }\`; both use status 500 and write a matching console label.

Preference api auth status tests should verify that these bodies do not merge. A generic "request failed" check can allow 401, 404, and 500 to replace one another while the test stays green.

The [authentication and authorization guide](/blog/authentication-authorization-testing-guide) covers broad identity controls. This plan focuses on one endpoint and the exact states found in current code.

## Which QASkills Code Paths Own This Contract?

The status branches live in \`packages/web/src/app/api/user/preferences/route.ts\`. GET and PATCH each call Clerk, look up the local user, work with preferences, and catch errors within the handler.

The first identity call uses Clerk's server helper. The [currentUser documentation](https://clerk.com/docs/reference/nextjs/app-router/current-user) describes that helper for App Router server code. QASkills treats a null result as the direct 401 branch.

The route status meaning can be read against [RFC 9110](https://www.rfc-editor.org/info/rfc9110). Repository code still sets the exact response bodies and separates no authentication, missing local data, and internal failure through 401, 404, and 500.

Middleware lives in \`packages/web/src/middleware.ts\`, where the \`isProtectedRoute\` list covers \`/dashboard(.*)\`, skill creation, and reviews but does not list \`/api/user/preferences\`. The API therefore relies on its own \`currentUser()\` check.

This detail matters for test design because an unauthenticated visit to \`/dashboard/preferences\` should be stopped by Clerk middleware, while an unauthenticated API call should reach the route and receive its 401 JSON. Do not claim the same guard owns both outcomes.

The middleware also leaves public webhook paths alone. That rule is not part of the preference status matrix, so it needs no case here. Keep the path test limited to the dashboard and preference API.

Preference api auth status tests need direct handler tests for exact bodies and one browser or request post-flow for route protection. Mocking middleware inside every handler case would add a layer that this endpoint does not use.

The [API testing practices guide](/blog/api-testing-best-practices-guide) offers wider response checks. The two repo files above remain the source for this exact auth split.

## Preferences api 401 404: Baseline Cases

Preferences api 401 404 cases should make Clerk and local-user state independent. Use one null Clerk result, one real Clerk fixture with an empty DB result, and one known local row before preference work begins.

For 401, stub \`currentUser\` to null, call GET and PATCH separately, compare the exact unauthorized body, and assert zero calls to select, update, and insert. PATCH should not parse or use its body after this early return.

For 404, return a Clerk fixture with a stable ID, then make the user select return an empty list so both handlers return the not-found body. Preference select, update, and insert calls must remain zero.

The two cases can share a status number assertion only through a table. Keep their state setup and side effects in separate rows. That structure makes a changed gate order obvious.

Preference api auth status tests should also include a known local user with an existing preference row; GET returns that row without insert, while PATCH returns its updated row without insert. These are the shortest success paths after identity checks.

Add a known user with no preference row, where GET inserts true defaults while PATCH first tries update and then inserts the supplied values. The same stored state leads to different command order because each handler has a different job.

Make the GET creation case return a full fake row from \`returning\`, including its local preference ID and the known user ID. Compare that row exactly, then verify the insert received all four true flags and no fields copied from Clerk. The preference select must run before insert, and a second fixture with an existing row must skip insert altogether. These paired cases prove default creation is a fallback after a real miss rather than a write that occurs on every authenticated read.

For PATCH, send all four booleans with a mix of true and false values because loose truth checks could lose a valid false setting. Freeze the clock, compare the update object including \`updatedAt\`, and make \`returning\` yield one row for the normal update case. In the fallback case, return an empty update list and check that insert receives the same four booleans plus the local user ID, but not the update timestamp field. This complete comparison keeps email notifications, weekly digest, new skill alerts, and pack alerts from being swapped or replaced by defaults.

The current PATCH code reads values directly from JSON and has no schema check in this file. Do not invent a 400 response for missing or wrong fields. If validation is added, its status and no-write checks should join this matrix.

The [missed webhook recovery article](/blog/testing-missed-clerk-webhook-user-recovery) covers how a local user can be restored. This endpoint currently returns 404 rather than creating that missing user.

## Clerk user missing database: Test Matrix

The clerk user missing database matrix records request identity, user lookup, preference work, response, and log outcome. It applies to both handlers where their later branches differ.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| No Clerk user | \`currentUser\` returns null | Early auth return | 401 unauthorized JSON | No DB work | Any user query runs |
| Clerk user missing locally | Clerk ID set, user select empty | Local user guard | 404 user-not-found JSON | No preference work | 401 or auto-created user |
| Known user with preferences | User and preference rows found | Existing-row path | 200 row JSON | Read, or one PATCH update | Insert runs by mistake |
| Known user without preferences | User found, preference result empty | Create fallback | 200 created row JSON | One insert after miss | Empty response or duplicate write |
| Database call rejects | Known prior state, forced fault | Handler catch | 500 handler-specific JSON | One safe error log | 200, 401, or 404 |

The first row should fail if any DB mock runs. This proves auth is the first gate rather than just proving the final status. It also keeps a database outage from changing an unauthenticated result.

The second row should check the exact Clerk ID passed to the user lookup. A 404 with the wrong lookup key is still a broken identity map. No preference table call should occur after the empty result.

For the existing GET row, return one complete preference object and compare it by value. The insert count must stay zero. For PATCH, capture the set object and return one updated row.

For each missing-preference row, assert command order. GET performs a preference select and then insert, while PATCH performs update and then insert after an empty return. A loose DB chain can hide a skipped first command.

The fault row should be split by handler and stage. Reject Clerk, user select, preference select, update, or insert in focused cases, then compare the right 500 body. Later calls must not run after the rejection.

Preference api auth status tests should not infer log success from a 500 alone. Stub \`console.error\`, check the stable label and thrown object, then restore the console after each case.

The [API security checklist](/blog/api-security-testing-checklist-2026) covers wider protection risks. Keep this table centered on status ownership and call order.

## How Should Nextjs auth error matrix Be Exercised?

Nextjs auth error matrix coverage needs handler tests plus one path-level check. The handler group controls \`currentUser\` and DB state, while the path check proves which request is stopped before route code.

Start with direct GET and PATCH imports. Reset mocks between cases, use a fixed Clerk ID, and build a real \`NextRequest\` for PATCH. Compare status and parsed JSON rather than reading internal response fields.

This table-driven sample covers the first two gates without bypassing them:

\`\`\`typescript
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { GET, PATCH } from '@/app/api/user/preferences/route';

describe.each([
  {
    name: 'no Clerk user',
    clerkUser: null,
    dbUsers: [],
    status: 401,
    body: { error: 'Unauthorized' },
    userQueries: 0,
  },
  {
    name: 'Clerk user missing locally',
    clerkUser: { id: 'user_123' },
    dbUsers: [],
    status: 404,
    body: { error: 'User not found' },
    userQueries: 1,
  },
])('$name', ({ clerkUser, dbUsers, status, body, userQueries }) => {
  it('keeps GET and PATCH status ownership aligned', async () => {
    clerkMocks.currentUser.mockResolvedValue(clerkUser);
    dbMocks.userRows.mockResolvedValue(dbUsers);

    const getResponse = await GET();
    const patchResponse = await PATCH(
      new NextRequest('http://localhost/api/user/preferences', {
        method: 'PATCH',
        body: JSON.stringify({ weeklyDigest: false }),
      }),
    );

    expect(getResponse.status).toBe(status);
    await expect(getResponse.json()).resolves.toEqual(body);
    expect(patchResponse.status).toBe(status);
    await expect(patchResponse.json()).resolves.toEqual(body);
    expect(dbMocks.userRows).toHaveBeenCalledTimes(userQueries * 2);
  });
});
\`\`\`

The DB adapter in this sample represents the strict select chain used by the route mock. For the 401 row, configure it to throw if called. For the 404 row, capture both Clerk ID predicates.

Then run two unauthenticated path checks. A request to \`/dashboard/preferences\` should encounter Clerk protection, while a request to \`/api/user/preferences\` should return route JSON with status 401. Use the test environment's normal sign-in response for the dashboard rather than hard-coding a provider URL.

Start the path group with the same environment shape used by the deployed app, but supply test Clerk keys and no authenticated browser state. Request the API with an \`Accept: application/json\` header, then compare status 401, content type, and the unauthorized object without following a made-up redirect. Request the dashboard in a fresh context and assert that protected content is not shown, while recording the actual Clerk challenge or redirect form produced by the test setup. This proves route ownership through user-visible outcomes and avoids coupling the suite to a vendor URL that can differ by Clerk configuration.

Add one authenticated path case only after both no-session checks pass, using a seeded local user and preference row tied to the test Clerk identity. The API should return that row with status 200, and the dashboard should load its preference controls without triggering the missing-user branch. Remove the seeded row and session state in a final block, then rerun the API without auth to ensure cleanup did not leave a shared cookie or server fixture. Keep this case small because exact toggle behavior belongs to the page component suite, while the path group proves guard placement and route reachability.

Do not disable auth in this path group. The middleware exports a pass-through test mode when \`QASKILLS_DISABLE_AUTH\` equals one, which would defeat the check. Keep that variable absent for the real path run.

The direct handler group can run without a browser. The [getting started page](/getting-started) is useful for general account context, but it does not define these API statuses.

## Step-by-Step Api status code assertions Procedure

Api status code assertions should follow one order from identity to side effects. The steps below stop each case at its intended branch and keep later mocks strict.

1. Build a request matrix that controls Clerk auth and \`currentUser\` results independently from local DB fixtures.
2. Invoke GET and PATCH for each identity state without assuming that middleware protects the preference API.
3. Assert exact 401, 404, success, and 500 bodies alongside database call counts.
4. Run the same public API and protected dashboard checks in the browser post-flow.

For each row, set only mocks that the branch may reach. A 401 case should fail on any DB call, and a 404 case should fail on any preference call. This makes a gate-order regression loud.

Use a fixed clock for PATCH success because the update set includes \`updatedAt\`. Compare all four supplied values and the exact date. Restore timers before another route test begins.

This second example covers the update-or-create split and a 500 fault:

\`\`\`typescript
it('creates preferences only after PATCH updates no row', async () => {
  clerkMocks.currentUser.mockResolvedValue({ id: 'user_123' });
  dbMocks.userRows.mockResolvedValue([{ id: 'local_123' }]);
  dbMocks.updatedPreferences.mockResolvedValue([]);
  dbMocks.createdPreferences.mockResolvedValue([
    { id: 'pref_123', userId: 'local_123', weeklyDigest: false },
  ]);

  const response = await patchPreferences({ weeklyDigest: false });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    id: 'pref_123',
    userId: 'local_123',
    weeklyDigest: false,
  });
  expect(dbMocks.updatePreferences).toHaveBeenCalledTimes(1);
  expect(dbMocks.insertPreferences).toHaveBeenCalledTimes(1);
  expect(dbMocks.insertUser).not.toHaveBeenCalled();
});

it('returns the PATCH failure body when update rejects', async () => {
  dbMocks.updatePreferences.mockRejectedValue(new Error('write failed'));
  const response = await patchPreferences({ weeklyDigest: false });
  expect(response.status).toBe(500);
  await expect(response.json()).resolves.toEqual({
    error: 'Failed to update preferences',
  });
  expect(dbMocks.insertPreferences).not.toHaveBeenCalled();
});
\`\`\`

The \`patchPreferences\` helper should only build a real request and call PATCH. It must not perform auth or DB work itself. This keeps the handler as the system under test.

Run the path group after direct cases because it may need a server and Clerk test setup. The [API testing guide](/blog/api-testing-best-practices-guide) can help organize that slower post-flow.

## Preference endpoint failure tests: Assertions and Diagnostics

Preference endpoint failure tests should force one throw at each awaited stage. Clerk lookup, user select, preference select, insert, update, and JSON parsing can all reach a catch, but the later call counts differ.

GET and PATCH have distinct log labels and response messages. Compare both exact values. A shared 500 status is not enough because an accidental copy of the GET body into PATCH would mislead clients and logs.

For a Clerk helper rejection, assert no DB work. For a user select rejection, assert one identity call and no preference work. For a preference write rejection, assert that earlier gates ran once and no later fallback call ran.

PATCH JSON parsing happens after the auth check and before the local user query. An invalid JSON body with a known Clerk user should return the PATCH 500 body without any DB call. The same invalid body with no Clerk user should still return 401 before parsing.

Preference api auth status tests need safe diagnostics. Report handler, stage, Clerk state class, expected status, actual status, and DB call counts. Do not print profile objects, tokens, full request bodies, or preference values tied to a real user.

Restore every console stub and fake clock. Leaked state can make the next case pass for the wrong reason or hide a real error line. Use after-each cleanup even when an assertion fails.

Keep one positive case beside the fault table. Broad catch code can make every branch return an expected 500 while success work is broken. A known user with one row proves the normal path still returns its data.

The [QASkills blog](/blog) can group this matrix with auth and recovery checks. CI output should still name GET and PATCH rows separately.

## What Regressions and Boundaries Prevent False Confidence?

The first false pass accepts any client error for no session. That can let 404 replace 401 or 500 replace both. Compare exact status and exact JSON for each controlled state.

The next false pass mocks \`currentUser\` and user lookup as one helper. That removes the very split the suite must prove. Keep Clerk identity and local persistence under separate controls.

Do not claim the API is middleware-protected. Current \`isProtectedRoute\` patterns do not include \`/api/user/preferences\`; the handler checks Clerk itself. The protected dashboard path and route-level API check should stay separate in reports.

Do not expect a missing preference row to return 404. Once the local user exists, both handlers can create a preference row through their fallback branches. Assert insert values and command order instead.

Do not invent PATCH validation. The current route passes body values to Drizzle without a schema in this file. A future validation change should add 400 cases, no-write checks, and clear field errors before DB work.

Recovery from a missing local user belongs to the [missed webhook recovery guide](/blog/testing-missed-clerk-webhook-user-recovery). This route returns 404 and does not insert a user, even though another auth helper in the repo may repair missed webhooks.

Add cases when middleware patterns, Clerk lookup, local user lookup, default values, update fields, create fallback, status bodies, or log labels change. Retain one case per first failed gate.

After the suite passes, open [dashboard preferences](/dashboard/preferences) with a test account and exercise a visible change. That post-flow adds UI confidence but cannot replace exact route status checks.

## Frequently Asked Questions

### How do you distinguish unauthenticated, missing-user, and internal failures?

Control Clerk and the local user query separately. A null Clerk result must return 401 with no DB calls, a real Clerk ID plus no local row must return 404, and a thrown dependency must return the handler's 500 body. Compare exact JSON and later call counts.

### What should preferences api 401 404 cases assert?

Assert status, body, Clerk calls, user query count, and zero preference work at both early exits. The 401 case proves no session and must skip all DB calls. The 404 case proves a session exists but its Clerk ID has no matching local user row.

### Does clerk user missing database trigger automatic repair here?

No. GET and PATCH return \`{ error: 'User not found' }\` with status 404 after an empty local query. They do not insert a user. Recovery is handled by other flows, so this matrix should assert zero user inserts and keep repair tests elsewhere.

### Why separate a nextjs auth error matrix by path?

The dashboard matches the middleware's protected pattern, while the preference API is absent from that list and checks \`currentUser()\` inside its handler. Separate path cases prove the real guard for each request. Treating them as one layer can hide a missing route-level check.

### Which api status code assertions belong on success paths?

For GET, cover an existing row and default creation after a miss. For PATCH, cover an updated row and insert after an empty update result. Each case should assert status 200, exact returned data, full write values, command order, and no extra insert.

### How should preference endpoint failure tests report errors?

Report the handler, failed stage, expected and actual status, response body, and safe call counts. Keep GET and PATCH labels distinct, restore console stubs, and avoid real identity or preference data. The report should show which gate failed without exposing a user's settings.

## Conclusion

Preference api auth status tests keep no session, missing local identity, missing preference row, successful work, and internal faults as separate outcomes. They also preserve the real guard split between the middleware-protected dashboard and the route-protected preference API.

[Open dashboard preferences](/dashboard/preferences), then add the status matrix to the API post-flow before changing auth handling. Browse the [QA skills catalog](/skills) for a focused API testing skill that can keep these branch checks near future route edits.`,
};
