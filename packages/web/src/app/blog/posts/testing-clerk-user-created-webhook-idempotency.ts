import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Clerk Webhook Idempotency Testing',
  description:
    'Clerk webhook idempotency testing verifies replayed user.created events, unique rows, preference creation, concurrent delivery, and safe email effects.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Clerk webhook idempotency testing',
  keywords: [
    'Clerk webhook idempotency testing',
    'Clerk user.created replay',
    'webhook database idempotency',
    'Drizzle onConflictDoNothing',
    'duplicate user preference prevention',
    'concurrent webhook delivery',
    'welcome email replay',
    'Clerk webhook integration test',
  ],
  relatedSlugs: [
    'testing-missed-clerk-webhook-user-recovery',
    'testing-hmac-unsubscribe-token-tampering-expiration',
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-lazy-resend-initialization-nextjs-build',
  ],
  sources: [
    'https://clerk.com/docs/guides/development/webhooks/overview',
    'https://clerk.com/docs/guides/development/webhooks/syncing',
    'https://orm.drizzle.team/docs/insert',
  ],
  content: `**Clerk webhook idempotency testing** sends the same \`user.created\` payload more than once and proves that one local user and one preference row remain. It also checks concurrent requests, database conflicts, and welcome-email side effects. A passing response alone is not enough because duplicate rows or repeated mail can still follow.

This tutorial uses the QASkills route as a concrete system under test. Review the broader [webhook testing guide](/blog/webhook-testing-complete-guide-2026) for delivery fundamentals, then use [QASkills](/skills) and the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) when building the browser checks around signup.

The goal is a small set of facts that any reviewer can check. Each case names the input, row count, saved data, and mail call count. This keeps Clerk webhook idempotency testing useful when the route, schema, or mail code changes.

## How Do You Build a Clerk user.created Replay?

A **Clerk user.created replay** uses one stable payload for every attempt, including the same Clerk ID, email, username, and profile fields. Send the first request, wait for its database work to finish, and send an identical request. The second call should return success without creating another local identity.

Clerk explains that failed webhook messages can be retried or replayed in its [webhooks overview](https://clerk.com/docs/guides/development/webhooks/overview). That delivery model makes duplicate handling a normal requirement rather than an unusual edge case. Tests should therefore name replay as expected traffic, not as a simulated attack.

Build the fixture from fields the current route reads. The handler uses the first email address, falls back from username to the Clerk ID, joins first and last names, reads the image URL, and finds a GitHub external account. Extra payload fields may improve realism, but they should not obscure the identity key that drives the conflict.

\`\`\`typescript
export const createdEvent = {
  type: 'user.created',
  data: {
    id: 'user_qaskills_001',
    username: 'ada.qa',
    first_name: 'Ada',
    last_name: 'Tester',
    image_url: 'https://example.test/avatar.png',
    email_addresses: [{ email_address: 'ada@example.test' }],
    external_accounts: [
      { provider: 'oauth_github', username: 'ada-tests' },
    ],
  },
};

export function webhookRequest(body = createdEvent) {
  return new Request('http://localhost/api/webhooks/clerk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
\`\`\`

Do not confuse replay coverage with request authenticity. The current QASkills handler reads JSON directly and does not verify a Clerk signature. Clerk's [syncing guide](https://clerk.com/docs/guides/development/webhooks/syncing) shows signature verification as a separate route responsibility. Record that missing control as its own defect and keep the idempotency assertions focused on repeated valid event data.

Save the fixture in one test helper and freeze every field for the replay case. A random ID on each call would turn the test into two valid signups. Generate unique values once per test, then reuse that same object for all delivery attempts.

Also test field order and unused data without changing the identity values. JSON key order should not affect the route, and unknown fields should not create state. These checks are small, but they guard fixture helpers that may rebuild a new event for each request.

## What Proves Webhook Database Idempotency?

**Webhook database idempotency** means repeated processing converges on the same durable state. For this route, the strongest basic invariant is one user row for the Clerk ID and one preference row for that user's local UUID. Response codes matter, but row counts and stored values provide the durable proof.

Query by every unique identity field after both calls. The \`users\` table has unique constraints for Clerk ID, email, and username, so an unexpected conflict can come from any of them. A useful test also checks the winner's profile values, because a row count of one does not prove the correct record won.

| Evidence | First delivery | Exact replay | Failure meaning |
| --- | --- | --- | --- |
| HTTP response | 200 success | 200 success | A 500 can trigger more delivery attempts |
| User rows by Clerk ID | One | One | More than one breaks identity uniqueness |
| Preference rows by user ID | One | One | More than one causes duplicate settings |
| Welcome send attempts | One scheduled | No new attempt | Repeated mail leaks the replay to the user |
| Stored profile | Fixture values | Unchanged | Replay should not rewrite creation data |

Test the result through a real PostgreSQL schema when possible. Mocked Drizzle chains can prove branch selection, but they cannot prove unique constraints, transaction timing, or concurrent insert behavior. The [database unique-constraint race guide](/blog/testing-database-unique-constraint-races) shows how to coordinate two sessions without relying on fragile sleep calls.

Clerk webhook idempotency testing should include an unrelated second user as a control. That control proves the cleanup and lookup are scoped to the tested identity. It also catches fixtures that accidentally share a constant email or username across parallel workers.

Check the database before the first call as well. The user and preference counts should both start at zero for the test key. A dirty fixture can make the first request act like a replay and hide a broken creation branch.

After the checks, remove rows through their normal foreign-key order or drop the disposable schema. Cleanup belongs in a \`finally\` block so a failed assertion cannot poison the next case. Keep one test key per worker when the suite runs in parallel.

## How Does Drizzle onConflictDoNothing Help?

**Drizzle onConflictDoNothing** turns a recognized insert conflict into an empty \`returning()\` result instead of an exception. In the current route, a nonempty result means this request inserted the user. Only that branch inserts preferences and starts the non-blocking welcome email.

The Drizzle [insert documentation](https://orm.drizzle.team/docs/insert) describes conflict handling and returning rows. The important test detail is that "no exception" does not mean "new row." Assert both the returned array and the final database state, because an empty array is the route's replay signal.

This behavior gives the route a useful idempotent branch, but it also makes conflict causes less visible. A collision on the email or username can produce the same empty result as a duplicate Clerk ID. Add diagnostic cases for each unique field, then decide whether the product should treat every conflict as an accepted replay.

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/webhooks/clerk/route';
import { sendWelcomeEmail } from '@/lib/email/send';

vi.mock('@/lib/email/send', () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe('user.created replay', () => {
  it('creates side effects only when the user insert returns a row', async () => {
    const first = await POST(webhookRequest() as never);
    const replay = await POST(webhookRequest() as never);

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(await countUsersByClerkId('user_qaskills_001')).toBe(1);

    const user = await findUserByClerkId('user_qaskills_001');
    expect(await countPreferencesByUserId(user.id)).toBe(1);
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
  });
});
\`\`\`

The sample assumes helpers backed by an isolated test database. If the route is imported directly, reset modules and mocks before each case. If the test calls a running Next.js server, observe email through an injected provider stub or a local mail sink rather than the production provider.

Add one test where the same Clerk ID arrives with a new email address. The current insert does nothing on conflict, so the saved creation data stays as it was. That is different from the \`user.updated\` branch, and the test should make that choice plain.

Add another case where a new Clerk ID reuses an existing email. The empty returned array stops later side effects, but the response still says success. If the product needs a different result for this data clash, write that expected policy before changing the route.

Clerk webhook idempotency testing should not treat all empty results as proof of an exact replay. Log or measure conflict causes in a safe way when the database layer permits it. Do not place email addresses or full payloads in shared CI output.

## Duplicate User Preference Prevention

**Duplicate user preference prevention** deserves a direct assertion because the preference table does not currently declare \`userId\` unique. The route only inserts preferences when the user insert returns a new row, which prevents an exact sequential replay from reaching that branch. The database itself does not enforce one preference row per user.

That distinction matters during refactoring. If a later change moves preference creation outside the \`result.length > 0\` guard, \`onConflictDoNothing()\` on the preferences insert has no conflict target to stop duplicates. A regression test should fail on two rows even when both webhook responses remain successful.

Assert the complete default record, not just its existence. The current route sets email notifications, weekly digest, new skill alerts, and pack alerts to true, while leaving the lead source null. A duplicate row with different defaults could make later joins return multiple settings or apply an unpredictable unsubscribe update.

The [authentication and authorization guide](/blog/authentication-authorization-testing-guide) helps separate identity checks from preference policy. Creation idempotency should not silently become authorization logic. Keep the row invariant close to the schema and test which handler owns its creation.

For a stronger product guarantee, add a unique constraint on \`user_preferences.user_id\` through a reviewed migration. The article does not assume that constraint exists. Until it does, the integration suite must treat the route guard as the only duplicate-prevention mechanism and flag any path that bypasses it.

A focused schema test can count duplicate groups rather than just one fixture. Insert normal data, group preferences by user ID, and fail when any count exceeds one. Run that check after migration tests and seed scripts because those paths can bypass the webhook guard.

If a constraint is added later, keep the route assertion. Database protection and branch behavior prove different facts. The constraint stops bad state, while the route test proves a replay does not waste work or send more mail.

## Test Concurrent Webhook Delivery

**Concurrent webhook delivery** occurs when retry timing overlaps a slow first attempt or two workers receive the same event. Sequential replay tests cannot expose this timing. Start two requests behind a barrier, release them together, and require both calls to settle before checking the database.

The unique Clerk ID ensures only one user insert should return a row. PostgreSQL can make the losing insert wait for the winner's transaction outcome. Your test should not assume which request wins, and it should not use a narrow timing limit to decide whether concurrency occurred.

Use separate database connections when the test exercises the repository layer. A pool size of one serializes both calls and gives false confidence. At the route level, confirm the test server and database pool permit overlapping work, then tag both requests with test-only log context outside the production payload.

\`\`\`typescript
it('converges under two concurrent deliveries', async () => {
  const gate = createBarrier(2);
  pauseBeforeUserInsert.mockImplementation(() => gate.arriveAndWait());

  const outcomes = await Promise.all([
    POST(webhookRequest() as never),
    POST(webhookRequest() as never),
  ]);

  expect(outcomes.map((response) => response.status)).toEqual([200, 200]);
  expect(await countUsersByClerkId('user_qaskills_001')).toBe(1);

  const user = await findUserByClerkId('user_qaskills_001');
  expect(await countPreferencesByUserId(user.id)).toBe(1);
  expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
});
\`\`\`

The shown pause is an injected test seam, not a production endpoint. An alternative is to test a small repository function with two checked-out connections and then keep one route-level replay case. That split gives deterministic database proof without adding control hooks to public code.

Run the case repeatedly during initial review. Once the barrier is proven, a deterministic case belongs in normal CI, while a larger stress run can stay in a scheduled suite. The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) explains how to keep slower integration checks visible without hiding failures.

Capture the result from each request rather than sorting away the two callers. Both should return the current success shape, even though only one inserts data. A case that ends with one row but returns a 500 to one caller is not the same contract.

Then issue a third, plain replay after both requests settle. It should complete without a lock wait, extra row, or new mail call. This final probe often finds leaked transactions and mocks that still hold the barrier.

Use a wide test timeout that covers the database in CI, but do not use that timeout as the core assertion. The barrier and final state provide clear proof. A timeout should only stop a broken test from holding the whole job.

## Should Welcome Email Replay?

A **welcome email replay** should not occur for an exact duplicate event under the current route contract. The welcome call sits inside the branch that receives a newly inserted user. When \`onConflictDoNothing().returning()\` yields no row, the handler skips both preference creation and email scheduling.

The side effect is non-blocking. The handler calls \`sendWelcomeEmail(...).catch(...)\` without awaiting it, so the HTTP response can finish before the provider result is known. Clerk webhook idempotency testing must therefore inspect call scheduling separately from provider delivery and avoid claiming that a 200 response proves mail was sent.

Mock the email function before importing the route, then assert the call count and arguments. The first call should use the fixture email, chosen username, and created local user ID. The exact replay should add no call. Clear the mock between cases so another test does not inflate the count.

Test a rejected email promise as well. The route catches that rejection in the detached chain and logs an error, while the created user and preferences remain committed. A later webhook replay will find the existing user and will not schedule another welcome email, so the current design does not retry that failed side effect.

That outcome may be acceptable if mail delivery has its own retry system, but the code shown here does not provide one. Record the gap rather than changing the idempotency expectation. The [error-handling testing patterns](/blog/error-handling-testing-patterns) can help define whether logs, an outbox, or provider events should become the source of delivery evidence.

Separate "mail function called" from "mail reached the inbox" in every report. The route can prove only that it started the helper with certain data. Provider acceptance, bounce events, and inbox display need their own tests and proof.

Clerk webhook idempotency testing also needs a slow mail promise. Hold that promise open, wait for the route response, and prove the response does not wait. Resolve the promise during teardown so the test leaves no open task or stray rejection.

When the mail mock rejects, spy on the error log with care and restore it after the case. Assert one useful error event without matching every word. Exact console text is less stable than the rejected call, saved rows, and no second send.

## Build a Clerk Webhook Integration Test

A **Clerk webhook integration test** should cross the route, Drizzle mapping, PostgreSQL constraints, and observable side-effect boundary. It does not need a real Clerk account for every run. A signed-delivery suite can be separate once signature verification exists, while this suite controls event bodies directly.

Create one disposable schema per worker or use unique fixture values. Apply the actual migrations rather than creating an approximate table in the test file. The real schema catches missing uniqueness, default changes, and column requirements that a mock cannot represent.

Keep the email provider outside the database test. Mock \`sendWelcomeEmail\` at its module boundary and assert calls, because a live provider introduces network delay and may send unwanted mail. A small provider contract test can cover Resend separately without weakening route determinism.

Use this test matrix before adding more cases:

| Case | User insert result | Preference expectation | Email expectation |
| --- | --- | --- | --- |
| First valid event | One returned row | One default row | One scheduled call |
| Exact sequential replay | Empty returned rows | Still one row | No added call |
| Two concurrent copies | One winner, one empty | Still one row | One total call |
| Same Clerk ID, changed email | Empty or schema-specific conflict | Unchanged | No added call |
| New Clerk ID, duplicate email | Empty conflict result | No new preference | No call |
| Preference insert failure | User remains created | No complete preference | No retry on replay |
| Welcome promise rejects | User and preference remain | One row | One failed scheduled call |

The last two rows expose partial side effects in the present flow. The user insert and preference insert are separate statements, and the mail call happens later. Do not label the whole handler transactional unless the code places those writes inside a database transaction.

Clerk webhook idempotency testing should also assert that unknown event types return success without writes, because that is current handler behavior. Keep this assertion explicit so a future event branch cannot create accidental records. Do not use the unknown-event case as proof that malformed JSON is accepted; malformed JSON reaches the catch block and returns 500.

Name the suite after behavior, not a source file. A route can move while the one-user invariant stays. Test names such as "exact replay keeps one preference row" tell a reviewer why the case matters and what a failure means.

Keep route tests apart from unit tests for field mapping. Small unit cases can cover missing names, GitHub account lookup, and username fallback with fast mocks. The integration case should spend its time on real constraints, overlap, and saved state.

Use one owner for shared fixture helpers. If every test builds a slightly different Clerk body, later schema changes create drift and false failures. A base event plus small named overrides keeps each case easy to read.

## Run the Idempotency Procedure

Use one repeatable procedure so local and CI results describe the same invariant. Store test artifacts with sanitized IDs, row counts, and call counts. Never write real customer email addresses into fixtures or CI logs.

1. Start an isolated PostgreSQL database, apply current migrations, and reset the email mock.
2. Send one \`user.created\` fixture and assert the response, user row, preference defaults, and mail call.
3. Send the identical fixture again and assert unchanged row counts plus no second mail call.
4. Delete the fixture state, release two barrier-controlled requests together, and assert one durable identity.
5. Force preference insertion and email failures separately, then record the exact partial state after each case.
6. Run a normal database query after every failure to prove the pool and transaction state remain usable.
7. Publish test reports without secrets, then fail CI on duplicate rows, repeated mail, or unexpected 500 responses.

Keep each assertion near the invariant it proves. A single snapshot of a large mock call tree is hard to review and can pass after meaningless changes. Named assertions make a replay regression clear to the developer who owns the route.

Store the first failed check and the two response bodies when the procedure fails. Also store safe row IDs and counts, but omit tokens and personal data. This evidence lets a developer tell a route failure from stale test data without rerunning the job.

For browser coverage, complete a signup through an isolated Clerk test environment, then inspect the protected application behavior after local provisioning. The [Playwright end-to-end guide](/blog/playwright-e2e-complete-guide) can frame that user journey, while the route integration suite keeps duplicate delivery deterministic.

## Apply Clerk Webhook Idempotency Testing Safely

Clerk webhook idempotency testing is complete when retries converge on one identity, one intended preference record, and one welcome-email attempt. It must also show partial states honestly. The present route prevents exact replay side effects through the returned user row, but it does not make every downstream action atomic or retry failed mail.

Add the deterministic replay and concurrency cases to the post-change suite, then review related QA automation in the [skills directory](/skills). Use the [Playwright CLI skill](/skills/Pramod/playwright-cli) for the signup path, and pair this tutorial with the [webhook guide](/blog/webhook-testing-complete-guide-2026) before changing delivery behavior.

## Frequently Asked Questions

### Is an HTTP 200 enough to prove webhook idempotency?

No. A 200 response only shows that the handler returned success for that attempt. Query the user and preference tables, inspect stored values, and count email calls after repeated delivery. Those durable and observable results prove whether duplicate processing changed state or repeated a user-facing side effect.

### Why does the route use returning after onConflictDoNothing?

The returned rows distinguish a newly inserted user from a conflict that performed no insert. The current handler creates preferences and schedules welcome mail only when one row returns. Tests should assert that empty result directly because a conflict can still look like a successful database command.

### Should tests send real Clerk webhook requests?

Use controlled JSON fixtures for most idempotency integration tests, since they make replay and concurrency deterministic. Add a smaller environment-level test for actual Clerk delivery when needed. The current route does not verify signatures, so these body-level tests must not be presented as proof of request authenticity.

### What happens when welcome email delivery fails?

The route has already created the user and preferences before it starts the non-blocking email promise. A rejection is caught and logged after scheduling. An exact webhook replay then finds the existing user and does not schedule another welcome email, so this path needs separate delivery recovery policy.

### Can onConflictDoNothing prevent duplicate preference rows?

Not by itself in the current schema, because the preference table does not define a unique constraint on user ID. Exact replays avoid the insert through the user-result guard. A test should still assert one preference row and fail if refactoring moves that insert outside the guarded branch.

### How should concurrent webhook tests avoid flakes?

Use two database-capable request paths and a barrier near the contested user insert. Do not depend on which request wins or on a tiny delay. Assert both responses, one final user, one preference row, one email call, and a healthy database connection after both requests settle.
`,
};
