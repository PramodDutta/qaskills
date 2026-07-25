import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Missed Clerk Webhook Recovery Tests',
  description:
    'Test missed Clerk webhook recovery with just-in-time users, concurrent requests, existing rows, missing identity data, and local database assertions.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'missed Clerk webhook recovery',
  keywords: [
    'missed Clerk webhook recovery',
    'Clerk just-in-time provisioning',
    'missing local user row',
    'currentUser recovery path',
    'concurrent user creation',
    'Clerk database synchronization',
    'protected API auth helper',
    'missed webhook integration test',
  ],
  relatedSlugs: [
    'testing-clerk-user-created-webhook-idempotency',
    'testing-hmac-unsubscribe-token-tampering-expiration',
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-lazy-resend-initialization-nextjs-build',
  ],
  sources: [
    'https://clerk.com/docs/guides/development/webhooks/syncing',
    'https://clerk.com/docs/reference/nextjs/app-router/current-user',
    'https://orm.drizzle.team/docs/insert',
  ],
  content: `**Missed Clerk webhook recovery** repairs the local user record during the first protected request after a Clerk event was lost or delayed. A useful test proves existing users bypass recovery, missing users are inserted once, concurrent calls reach a known result, and incomplete Clerk data fails without inventing a valid local identity.

This tutorial follows the current QASkills \`getAuthUser()\` helper. Use the [authentication testing guide](/blog/authentication-authorization-testing-guide) for wider access checks, browse reusable QA automation in [QASkills](/skills), and use the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) for protected browser flows.

The recovery path is a safety net, not a replacement for every webhook. Its tests must show which local data it creates and which data it leaves absent. That clear boundary keeps a quick repair from becoming a hidden second signup system.

Write the expected branch in plain terms before each test. A signed-in user with no row may be repaired, while a known user should only be read. This short rule helps reviewers spot a fixture that takes the wrong path.

## What Is Clerk Just-in-Time Provisioning?

**Clerk just-in-time provisioning** creates a local user only after a valid Clerk session reaches server code and no matching local row exists. The current helper calls \`auth()\`, reads \`userId\`, queries the users table, and returns the existing row immediately when found.

When no row exists, the helper calls Clerk's \`currentUser()\` function for profile data. Clerk documents that [currentUser returns the active user](https://clerk.com/docs/reference/nextjs/app-router/current-user) from the Backend API in App Router code. That network step is why the normal existing-user branch should stay fast and easy to test.

The helper maps the first email address, username, name, image, and GitHub account into the local schema. Username falls back to a GitHub username and then the Clerk ID. Missing names become an empty string, while a missing first email becomes an empty email string.

| Local state and Clerk state | Expected helper branch | Current result |
| --- | --- | --- |
| Signed out | Stop after \`auth()\` | \`null\` |
| Signed in, local row exists | Return local row | Existing user |
| Signed in, row missing, Clerk user exists | Insert from Clerk profile | Created user or \`null\` on conflict |
| Signed in, row missing, \`currentUser()\` is null | Stop recovery | \`null\` |
| \`auth()\` or database work throws | Catch error | \`null\` |

Missed Clerk webhook recovery should be tested as server-side identity work. Do not seed a browser cookie and assume the local row appeared. Query the database and inspect the helper result, because a protected page can redirect or fail for many reasons that are not provisioning defects.

Clerk notes that webhook sync is eventually consistent and delivery can fail in its [data syncing guide](https://clerk.com/docs/guides/development/webhooks/syncing). That is the reason this path exists. It does not prove the local copy is always current after it has been created.

The helper should run only in a server request that has Clerk auth context. Calling it from a loose script can make \`auth()\` fail before any row check. Keep one route-level case so the test setup matches the real request boundary.

Measure the fast and repair paths on their own. A known user needs one local read, while a missing user adds a Clerk call and insert. These are not strict speed gates, but the call counts catch an easy performance regression.

## How Do You Detect a Missing Local User Row?

A **missing local user row** is defined by a successful Clerk auth result whose \`userId\` has no matching \`users.clerk_id\` record. The helper first performs a limited select by Clerk ID. Tests should prove that this query, not email or username, decides whether recovery starts.

Set up three simple cases. The first has no session and should return null without any database lookup after auth. The second has a session plus an existing row and should not call \`currentUser()\`. The third has a session but no row and should call \`currentUser()\` exactly once.

\`\`\`typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAuthUser } from '@/lib/api-auth';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

describe('getAuthUser branch selection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns an existing local user without a Clerk profile request', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user_existing' } as never);
    await insertLocalUser({ clerkId: 'user_existing' });

    const result = await getAuthUser();

    expect(result?.clerkId).toBe('user_existing');
    expect(currentUser).not.toHaveBeenCalled();
  });
});
\`\`\`

Use an isolated database for the branch test if possible. A mocked Drizzle chain can confirm call order, but a real row proves the query matches the real column and schema. Keep one small unit test for Clerk failures and one database-backed suite for saved state.

Missed Clerk webhook recovery must also start from a clean key. Assert that the test Clerk ID is absent before calling the helper. If a prior case left the row behind, the test will take the fast path and never exercise recovery.

Do not delete all users in a shared test database. Generate a unique Clerk ID, email, and username per test worker, then delete only those rows. This makes the suite safe when auth and webhook tests run at the same time.

Keep the local lookup assertion tied to \`clerkId\`. Email and username are profile fields and may change later. If a test looks up by email first, it can pass even when the helper no longer uses the stable Clerk key.

After a clean miss, inspect the query count as well as the result. One select before insert is the current path. An accidental loop or repeated read can raise database load during an auth outage, even if the final row is still correct.

## When Does the currentUser Recovery Path Run?

The **currentUser recovery path** runs only after \`auth()\` supplies a user ID and the local select finds no row. It should not run for signed-out calls, Clerk auth errors, or known local users. Those negative call assertions protect both latency and Clerk Backend API usage.

Build a Clerk profile fixture that matches the current mapping. Include two email addresses to prove the first one is chosen, one GitHub external account, and a username. Then add small variants for null username, no GitHub account, missing names, and no email addresses.

\`\`\`typescript
const clerkUser = {
  id: 'user_recovery_001',
  username: null,
  firstName: 'Grace',
  lastName: 'Hopper',
  imageUrl: 'https://example.test/grace.png',
  emailAddresses: [{ emailAddress: 'grace@example.test' }],
  externalAccounts: [
    { provider: 'oauth_github', username: 'grace-tests' },
  ],
};

it('maps the Clerk profile into one local user', async () => {
  vi.mocked(auth).mockResolvedValue({ userId: clerkUser.id } as never);
  vi.mocked(currentUser).mockResolvedValue(clerkUser as never);

  const result = await getAuthUser();

  expect(result).toMatchObject({
    clerkId: clerkUser.id,
    email: 'grace@example.test',
    username: 'grace-tests',
    name: 'Grace Hopper',
    githubHandle: 'grace-tests',
  });
  expect(await countUsersByClerkId(clerkUser.id)).toBe(1);
});
\`\`\`

The returned object should come from \`returning()\`, not from the Clerk fixture. Assert a database-generated UUID and schema defaults when those values matter to callers. This catches a mock that returns the input even though no insert occurred.

Test \`currentUser()\` returning null. The helper should return null and create no user. Also test it throwing, because the outer catch turns that error into null. A protected route must then choose its own unauthorized or retry response without claiming recovery succeeded.

Missing identity fields need direct policy tests. The current code can attempt to store an empty email, and the users table requires email uniqueness. The first empty email may insert, while another user with no email can conflict. Treat this as current behavior and a policy gap, not as valid email handling.

Test name assembly with one missing name at a time. The helper trims the joined string, so either given or family name can stand alone. Both missing names produce an empty name, which the schema allows through its current non-null default.

The GitHub mapping needs a non-GitHub control account. It should ignore that account and use the Clerk ID when no username exists. This small case prevents the first external account from being treated as GitHub without checking its provider.

## Test Concurrent User Creation

**Concurrent user creation** happens when two protected requests for the same new Clerk user reach recovery before either local select sees a row. Both requests can call \`currentUser()\`, and both can attempt the insert. The unique Clerk ID lets only one insert create the row.

The helper uses \`onConflictDoNothing().returning()\`. Drizzle's [insert guide](https://orm.drizzle.team/docs/insert) explains that conflict handling can return no inserted row. In the current helper, the winner returns the new user, while the losing concurrent call returns null instead of querying the winner.

That result is important. Do not write a test that expects both calls to return the same user unless the implementation is changed to read after conflict. The present concurrency test should expose one created result, one possible null result, and one durable database row.

\`\`\`typescript
it('converges on one row during concurrent recovery', async () => {
  vi.mocked(auth).mockResolvedValue({ userId: clerkUser.id } as never);
  vi.mocked(currentUser).mockResolvedValue(clerkUser as never);

  const gate = createBarrier(2);
  beforeRecoveryInsert.mockImplementation(() => gate.arriveAndWait());

  const results = await Promise.all([getAuthUser(), getAuthUser()]);

  expect(results.filter(Boolean)).toHaveLength(1);
  expect(results.filter((value) => value === null)).toHaveLength(1);
  expect(await countUsersByClerkId(clerkUser.id)).toBe(1);
});
\`\`\`

The pause shown here is a test seam around the repository call. Do not add a public route or request flag that can hold production inserts. A lower-level integration test with two connections is often the cleanest place to force the race.

After both calls settle, invoke the helper a third time. The new call should find and return the existing row without \`currentUser()\`. This probe proves the winner is visible and the connection pool is still usable after the conflict.

If product code needs both first requests to succeed, add a read-after-conflict branch and test it under the same race. The [unique-constraint race tutorial](/blog/testing-database-unique-constraint-races) covers transaction and pool details. Keep the old null-result test until the new contract is reviewed and implemented.

Missed Clerk webhook recovery should not hide this brief null result behind a broad retry loop. A route may retry once after conflict, but the retry needs a clear bound and a fresh local lookup. Measure the extra Clerk call so high concurrency does not create needless profile requests.

## Keep Clerk Database Synchronization Predictable

**Clerk database synchronization** has two writers in this project: the webhook route and the protected auth helper. They do not create the same full state. The webhook creates a user, default preferences, and a non-blocking welcome email, while recovery creates only the user row.

Tests must state that difference. Do not assert a preference record after missed Clerk webhook recovery unless another request path creates it. A green test that inserts preferences in setup can hide the exact gap the fallback is meant to reveal.

Use a state table in the test report:

| Creation path | User row | Preference row | Welcome email |
| --- | --- | --- | --- |
| Successful \`user.created\` webhook | Created | Created with defaults | Scheduled without await |
| Exact webhook replay | Existing | Unchanged | Not scheduled again |
| Just-in-time recovery | Created | Not created by helper | Not scheduled |
| Recovery insert conflict | Existing winner in database | Unchanged | Not scheduled |

This split can affect later preference reads, digest joins, and unsubscribe behavior. Add one protected journey that reaches the next feature requiring preferences. The expected result should be explicit, even when it currently reveals a missing row and opens a product issue.

Use the [Clerk webhook idempotency tutorial](/blog/testing-clerk-user-created-webhook-idempotency) beside this recovery suite. One proves repeated delivery is safe, while the other proves lost delivery does not leave every protected route unusable. They share fixtures but own different intent.

Profile updates are separate as well. Once a local row exists, \`getAuthUser()\` returns it without comparing Clerk profile fields. A missed \`user.updated\` event will not be repaired by this helper, so do not claim broad synchronization from a successful creation test.

Document which system owns each field after creation. If Clerk owns email and image, update tests belong to the webhook or a later sync job. If users can edit local fields, a recovery helper must not overwrite them during each request.

Missed Clerk webhook recovery should leave an audit clue that a fallback was used. A counter with a safe branch label is often enough. Do not log the full Clerk profile, since the test can prove branch choice with synthetic IDs and row counts.

## Exercise the Protected API Auth Helper

The **protected API auth helper** returns a local user object or null. Route tests should cover how each protected endpoint translates that result. A null can mean signed out, Clerk failure, missing profile, database error, or a lost concurrency race under the current code.

Choose at least one real protected API route and mock only the Clerk boundary. Start with an existing local user and assert the normal response. Remove the local row, provide \`currentUser()\`, and assert the same request now recovers the user before its business action.

Do not turn this case into a broad authorization test. The helper proves identity lookup and creation, while the route still owns permissions, validation, and response status. The [API testing guide](/blog/api-testing-complete-guide) can structure those other cases without mixing their failure causes.

Add a database failure case with sanitized logging. The helper catches unexpected errors and returns null, so the protected route may produce an unauthorized response even when the session is valid. Record that behavior and decide whether service failure should be distinct from authentication failure.

For a browser check, sign in through the test Clerk instance, remove only the local test row, and open a protected page. The page should reach a known state after recovery. Use the [Playwright authentication testing guide](/blog/playwright-authentication-testing-storage-state-2026) to keep browser session setup apart from the database assertion.

Missed Clerk webhook recovery should be visible in test output without printing profile data. Log a synthetic test ID, branch name, and local row outcome. Avoid emails, access tokens, full Clerk objects, and cookies in CI artifacts.

## Build a Missed Webhook Integration Test

A **missed webhook integration test** starts with a valid Clerk identity and a deliberately absent local record. It invokes the real helper through a server context, uses current migrations, and proves the saved row. It should also show the existing-user fast path and all null outcomes.

Keep these cases in the first test matrix:

| Case | Clerk auth | Local row | Clerk profile | Expected helper result |
| --- | --- | --- | --- | --- |
| Signed out | No user ID | Absent | Not called | Null |
| Existing user | User ID | Present | Not called | Existing row |
| Recoverable miss | User ID | Absent | Present | Created row |
| Missing Clerk profile | User ID | Absent | Null | Null |
| Insert conflict | User ID | Won elsewhere | Present | Null for loser |
| Database error | User ID | Unknown | Any | Null |

Apply real user-table uniqueness rules. Email and username can conflict even when Clerk ID is new, and \`onConflictDoNothing()\` can hide which field caused the empty return. Use distinct cases and assert no partial local identity was created.

Reset Clerk mocks before each case and restore environment changes afterward. Module state can preserve a mock between tests, especially in suites that import server helpers once. A false existing session can make a signed-out case pass through the wrong branch.

Run the integration suite against the Node runtime used by the app. Server auth context and database drivers behave differently from a browser-like unit environment. If a unit runner cannot supply Clerk request context, inject a narrow adapter rather than faking every internal Clerk call.

The [webhook testing guide](/blog/webhook-testing-complete-guide-2026) can provide delivery cases that precede this suite. Keep its simulated outage key consistent with the recovery fixture so reports show the same user moving from a missed event to a repaired protected request.

## Run the Recovery Procedure

Use a fixed procedure to make local and CI results comparable. The key proof is not just a created row. It is the branch sequence, returned value, stored mapping, and behavior of the next protected request.

1. Start a disposable database, apply migrations, and confirm the test Clerk ID has no local row.
2. Mock \`auth()\` with that ID and provide a complete \`currentUser()\` profile fixture.
3. Call the helper once, then assert the returned database row and every mapped profile field.
4. Call it again and prove the existing row returns without another Clerk profile request.
5. Reset the row, release two recovery calls together, and record winner, loser, and final row count.
6. Test null profile, missing email, duplicate email, and database error as separate named cases.
7. Invoke one protected API or page flow after recovery and assert its user-visible result.
8. Remove the fixture rows, restore mocks, and publish only sanitized branch and count evidence.

Keep the test data small and readable. One complete profile plus named overrides is easier to audit than many unrelated fixtures. Use factory defaults that satisfy current schema rules, then change one field per failure case.

Run the helper suite after auth, schema, webhook, or user mapping changes. A quick post-change lane can use unit and database tests, while the browser case may run in the full integration lane. The [CI pipeline guide](/blog/cicd-testing-pipeline-github-actions) shows how to keep those gates distinct.

Missed Clerk webhook recovery also needs production signals. Count recovery attempts, created rows, empty conflict returns, and errors without storing personal fields. A sudden rise can show webhook delivery trouble or a database sync defect before support reports arrive.

Review those counts beside webhook delivery health. A small number of repair calls may be normal after short delays, while a sharp rise can show a broken endpoint. Alerts should use a sustained rate so one test account does not wake the team.

Retain the failed test branch and safe database state for a short period. A row count alone cannot show whether \`auth()\`, \`currentUser()\`, or insert work failed. Named branch evidence reduces guesswork while keeping private profile fields out of the report.

## Apply Missed Clerk Webhook Recovery with Clear Contracts

Missed Clerk webhook recovery is useful when it repairs one absent local identity from a valid Clerk session and then gets out of the normal path. The suite must preserve honest limits: the helper does not create preferences, refresh stale profiles, send welcome mail, or return the winner after a concurrent insert conflict.

Add the recovery matrix to the post-change test flow, then use the [QASkills directory](/skills) to extend related checks. Pair the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) with the [authentication guide](/blog/authentication-authorization-testing-guide) for the protected user journey, while this integration suite proves the local data contract.

## Frequently Asked Questions

### Why not rely only on the Clerk user.created webhook?

Webhook delivery is asynchronous and can fail or arrive late, so a valid session may exist before its local row. A just-in-time fallback keeps protected requests from failing forever. It still needs strict tests because it creates a second path into the user table with different side effects.

### Does recovery create default notification preferences?

No. The current \`getAuthUser()\` helper inserts only the users row. Preference creation and welcome mail occur in the \`user.created\` webhook branch. Tests must not seed preferences before checking recovery, or they will hide this difference and give later feature tests false confidence.

### What does the losing concurrent recovery call return?

The current insert uses conflict-do-nothing with returning. One request can receive the created row, while the request that loses the conflict receives no returned row and therefore returns null. A later call finds the saved user normally. Test that exact contract unless read-after-conflict is added.

### Should currentUser run for every protected request?

No. The helper queries the local user by Clerk ID first and returns that row when present. \`currentUser()\` runs only for a missing local row. A negative call assertion protects latency, Clerk API usage, and the intended division between normal lookup and recovery.

### How should missing email data be tested?

Create a Clerk fixture with no email addresses and observe the current empty-string mapping. Test one insertion and a second user that can conflict on the unique email column. Treat the outcome as a policy finding. Do not describe an empty string as a verified or valid email.

### Can this suite prove webhook signature security?

No. These tests cover recovery after a missing local sync event and the current server helper behavior. Webhook signature verification belongs to the public webhook route and needs separate security tests. A recovered user row does not prove that any prior webhook request was authentic.
`,
};
