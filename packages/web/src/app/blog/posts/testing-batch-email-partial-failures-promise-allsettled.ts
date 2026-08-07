import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Batch Email Failure Testing',
  description:
    'Batch email failure testing uses Promise.allSettled to verify delivery results, accurate counts, provider errors, retry scope, and cron batch behavior.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'batch email failure testing',
  keywords: [
    'batch email failure testing',
    'Promise.allSettled email tests',
    'partial email delivery failure',
    'Resend batch error handling',
    'email retry recipient scope',
    'weekly digest batch test',
    'email result count assertion',
    'rate limited email batch',
  ],
  relatedSlugs: [
    'testing-clerk-user-created-webhook-idempotency',
    'testing-missed-clerk-webhook-user-recovery',
    'testing-hmac-unsubscribe-token-tampering-expiration',
    'testing-lazy-resend-initialization-nextjs-build',
  ],
  sources: [
    'https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.allsettled',
    'https://resend.com/docs/api-reference/emails/send-email',
    'https://resend.com/docs/api-reference/rate-limit',
  ],
  content: `**Batch email failure testing** gives selected recipients successful sends, rejected promises, and resolved provider errors, then checks every recorded outcome. It proves one failed send does not erase successful results, counts match recipient totals, delays occur only between batches, and retry input contains failed recipients rather than the full campaign.

The examples follow QASkills email helpers and the weekly digest route. Review [error-handling test patterns](/blog/error-handling-testing-patterns), explore reusable automation in [QASkills](/skills), and use the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) for the final email-to-browser journey.

This topic has two result layers. A promise can fulfill while its value says \`success: false\`, because the send helper catches provider errors. Tests must inspect both the promise status and the application result or they will report failed mail as sent.

## How Do Promise.allSettled Email Tests Work?

**Promise.allSettled email tests** create a known outcome for each recipient and wait until every promise in the current batch settles. The ECMAScript definition of [Promise.allSettled](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-promise.allsettled) preserves input order and returns a fulfilled or rejected record for each input promise.

The QASkills \`sendBatchEmails()\` helper slices recipients, calls the supplied send function for each item, waits with \`Promise.allSettled()\`, appends those results, and pauses before the next batch. It returns the settled result array after all batches finish.

Start with a small map of recipient IDs to outcomes. Keep the email addresses synthetic and unique, but assert by stable recipient ID because result objects do not include the input recipient. The test can pair results back to input by index because all-settled preserves order.

\`\`\`typescript
import { describe, expect, it, vi } from 'vitest';
import { sendBatchEmails } from '@/lib/email/send';

type Recipient = { id: string; email: string };

const recipients: Recipient[] = [
  { id: 'a', email: 'a@example.test' },
  { id: 'b', email: 'b@example.test' },
  { id: 'c', email: 'c@example.test' },
];

it('keeps one result for every recipient', async () => {
  const send = vi.fn(async (recipient: Recipient) => {
    if (recipient.id === 'b') throw new Error('provider unavailable');
    return { success: true, id: \`mail_\${recipient.id}\` };
  });

  const results = await sendBatchEmails(recipients, send, 3, 0);

  expect(results).toHaveLength(3);
  expect(results.map((result) => result.status)).toEqual([
    'fulfilled',
    'rejected',
    'fulfilled',
  ]);
  expect(send).toHaveBeenCalledTimes(3);
});
\`\`\`

That case tests rejected promises only. The real QASkills send functions catch errors and usually resolve an application object instead. Add a second case where all promise statuses are fulfilled, but one value contains \`success: false\`.

Batch email failure testing should also cover an empty recipient list. It should call no send function, wait no delay, and return an empty array. This small case protects callers that run after subscriber filtering removes every row.

Add an order test with three deferred promises. Resolve the last call first, reject the middle call next, and resolve the first call last. The returned array should still match the original recipient order, which lets a caller pair each result with its input.

Check that all sends in one group start before the helper waits. A call log should show the first batch at the same test-clock point, then the next group after the pause. This proves batch size controls concurrency rather than total job size.

Reset the deferred promises after each case. An unresolved promise can hold the runner open and make later timer tests fail in confusing ways; use a short suite timeout only as a final guard, not as proof of correct settlement.

## What Is a Partial Email Delivery Failure?

A **partial email delivery failure** means some recipient attempts succeed while others fail during the same job. The correct result preserves each success, records each failure, and gives the caller enough identity to retry only the failed subset. It does not roll back mail that a provider already accepted.

Define "success" at the boundary under test. A Resend API acceptance is not proof of inbox display, and a fulfilled JavaScript promise is not always provider acceptance. The test report should use terms such as helper success, provider error, rejection, bounce, and inbox receipt with care.

The Resend [send email API](https://resend.com/docs/api-reference/emails/send-email) returns data or an error through the SDK response used by these helpers. QASkills converts an SDK error into \`{ success: false, error }\` and catches thrown errors into the same broad shape. Those attempts are fulfilled promises whose values report failure.

| Promise status | Application value | Count as sent? | Retry candidate? |
| --- | --- | --- | --- |
| Fulfilled | \`{ success: true, data }\` | Yes for helper acceptance | No |
| Fulfilled | \`{ success: false, error }\` | No | Yes |
| Rejected | Error reason | No | Yes |
| Fulfilled | Unknown shape | No until policy says otherwise | Yes or quarantine |

Keep unknown result shapes visible. A loose truthy check can count \`{ error: ... }\` as success, while a strict \`value.success === true\` check does not. Write the expected result contract before refactoring return types.

Do not retry the entire list after a partial result. Accepted messages may reach users twice. Build a failed-recipient list from indexes or, better, return a result that includes a safe recipient ID beside each settled value.

Model an uncertain network failure as its own class. A timeout may happen before or after the provider accepts a message, so a blind retry can create a duplicate; keep that state apart from a clear provider rejection and require an idempotency or status check when available.

Test two failures in one group rather than only one. One can be a resolved SDK error and the other a rejected promise; the summary should count both as failed while preserving the successful entries around them.

Include a later success after each failure. This proves the helper did not stop mapping the rest of an async batch. It also guards a reducer that returns early after seeing its first failed result.

The [webhook testing guide](/blog/webhook-testing-complete-guide-2026) has a similar at-least-once concern. Email has no database rollback for an accepted external call, so identity and retry scope need direct evidence.

## How Should You Test Resend Batch Error Handling?

**Resend batch error handling** needs cases for SDK error objects, thrown network errors, and successful data. The current \`sendWeeklyDigest()\` catches all thrown errors and returns \`{ success: false, error }\`. It also returns the same failure shape when \`resend.emails.send()\` resolves with an error.

Mock the exported \`resend.emails.send\` boundary or the send helper, based on the test layer. A unit test for \`sendWeeklyDigest()\` should mock the SDK getter and inspect the payload. A batch test should mock \`sendWeeklyDigest()\` itself so React email rendering does not distract from result reduction.

\`\`\`typescript
it('distinguishes provider errors inside fulfilled promises', async () => {
  const send = vi.fn(async (recipient: Recipient) => {
    if (recipient.id === 'b') {
      return { success: false, error: { name: 'rate_limit_exceeded' } };
    }
    return { success: true, data: { id: \`mail_\${recipient.id}\` } };
  });

  const results = await sendBatchEmails(recipients, send, 3, 0);
  const summary = results.reduce(
    (count, result) => {
      const sent =
        result.status === 'fulfilled' && result.value.success === true;
      sent ? count.sent++ : count.failed++;
      return count;
    },
    { sent: 0, failed: 0 },
  );

  expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
  expect(summary).toEqual({ sent: 2, failed: 1 });
});
\`\`\`

This difference is central to batch email failure testing. A test that counts only rejected promises will report three successes in the example, even though the application marked one provider call as failed.

Also test a synchronous throw from the send function. Because \`batch.map(sendFn)\` runs before \`Promise.allSettled()\` receives its array, a synchronous throw can reject the whole helper immediately. An \`async\` send function turns its throw into a rejected promise, but the generic type does not force every caller to implement it that way at runtime.

Record that behavior as current or wrap each call with \`Promise.resolve().then(() => sendFn(recipient))\` in a reviewed change. Do not claim all synchronous errors are isolated by all-settled before such a wrapper exists.

Use provider errors with safe, stable codes. Avoid matching a full network message that may change by SDK version. The important facts are recipient identity, failure class, result count, and whether the next batch still runs.

Assert the SDK call payload in the send-helper unit test. The recipient, sender, subject, and rendered email should match the fixture without carrying data from another recipient. Batch logic can be correct while a shared mutable object sends the wrong content.

Test the branch where the email service is not configured in a unit environment. The helper returns a resolved failure object and does not call the SDK. Keep this case in the sender suite, then feed the same result shape into the batch reducer.

Spy on logs only for the failure class and restore the spy after each test. Provider error objects can hold request details that should not enter snapshots. The core assertions remain the return shape, SDK call count, and recipient mapping.

## Limit Email Retry Recipient Scope

**Email retry recipient scope** should contain only attempts that did not reach the agreed success state. Build it from the original recipient list and aligned results. Preserve the campaign or digest ID so the retry can be tied to the first run.

The current helper returns results without recipient data. That is usable when the caller retains the original list in the same order, but it is easy to misuse after sorting or filtering. A test should zip by index and assert each failed recipient ID.

\`\`\`typescript
function failedRecipients<T>(
  recipients: T[],
  results: PromiseSettledResult<{ success: boolean }>[],
) {
  return recipients.filter((_, index) => {
    const result = results[index];
    return (
      !result ||
      result.status === 'rejected' ||
      result.value.success !== true
    );
  });
}

expect(failedRecipients(recipients, results).map((item) => item.id)).toEqual([
  'b',
]);
\`\`\`

Do not use the provider error message as a retry key. Use a local recipient or job-recipient ID that does not expose the address. The retry worker can load the current address through an authorized data path.

Separate retryable and terminal classes. A rate limit or short network outage may deserve a delayed retry, while a rejected address or invalid request may need review instead. The current generic helper does not make this choice, so tests should not claim it does.

Keep retries bounded and idempotent where the provider supports a stable request key. If no provider idempotency key exists, store local attempt state before retrying and accept that an uncertain timeout can still create a duplicate. The [event-driven testing guide](/blog/event-driven-architecture-testing-guide) can help model that state machine.

Batch email failure testing should prove the retry list stays stable when results arrive in a different completion order. All-settled keeps input order, so a slower first promise should still map to the first recipient. Use deferred promises to settle calls out of order and assert the same IDs.

Filter opt-outs again before a delayed retry. A recipient may change preferences after the first attempt, so the stored failed list is not final permission to send. Test that the retry worker drops that ID and records a skipped state rather than a new failure.

Keep attempt counts per recipient, not only per campaign. One address can fail several times while others succeed on their first try. A single campaign count can hide a hot loop that keeps retrying the same terminal error.

Batch email failure testing should also assert that a retry run cannot mutate the first run's evidence. Store a new attempt row or event and link it to the prior result. This keeps the audit trail useful when support asks whether a user received one message or several.

## Build a Weekly Digest Batch Test

A **weekly digest batch test** should cover subscriber selection separately from the send loop, then combine them in one route-level case. The current route takes subscribers in groups of ten, calls \`sendWeeklyDigest()\`, reduces settled results into sent and failed counts, and waits one second between groups.

The reduction handles both result layers. It increments sent only for a fulfilled promise whose value has \`success: true\`. A rejection or a fulfilled failure value increments failed. Assert \`sent + failed === total\` for every nonempty run.

Use eleven subscribers to cross one batch boundary with little test data. The first ten start together, the route waits, and the final one starts after the delay. Fake timers keep the case fast, but they require care because the promise work must settle before advancing the timer.

\`\`\`typescript
it('counts mixed digest results across two batches', async () => {
  vi.useFakeTimers();
  seedSubscribers(11);
  sendWeeklyDigestMock.mockImplementation(async (subscriber) => {
    return subscriber.username === 'user_4'
      ? { success: false, error: 'provider error' }
      : { success: true, data: { id: subscriber.username } };
  });

  const responsePromise = invokeWeeklyDigestRoute();
  await vi.advanceTimersByTimeAsync(1_000);
  const response = await responsePromise;
  const body = await response.json();

  expect(body).toMatchObject({ sent: 10, failed: 1, total: 11 });
  expect(sendWeeklyDigestMock).toHaveBeenCalledTimes(11);
});
\`\`\`

The real test must seed users and preferences that meet current subscriber filters. Include controls with global email disabled and weekly digest disabled, then assert neither reaches the send mock. This proves filtering before batching.

Do not discuss route authentication in this digest behavior case. Keep request access checks in a separate suite, while this test owns filtering, ranking input, batching, delays, and counts.

Use ten top-skill fixtures only when ranking is part of the case. For batch behavior, mock or seed a minimal valid set. The [database testing guide](/blog/database-testing-automation-guide) can help keep those fixtures isolated.

Add a no-subscriber case after filters run. The route should report zero sends and make no email calls, even when top skills exist. This case separates content availability from subscriber eligibility.

Use a subscriber at each filter edge. One has all email disabled, one has only weekly digest disabled, and one has both flags enabled. Only the third should reach the send helper, and the response total should equal that filtered set.

Run the route twice with cleaned mocks and fresh run IDs. Counts from the first call must not leak into the second. This catches module-level counters or test fixtures that are not reset between scheduled jobs.

## Add an Email Result Count Assertion

An **email result count assertion** compares recipients, calls, results, sent, and failed totals. It should fail when any recipient disappears between filtering and reduction. Counts are simple, but they catch many silent batch bugs.

For the generic helper, assert \`results.length === recipients.length\` and \`sendFn\` call count equals recipient count. For the digest route, assert \`sent + failed === total\`, total equals the filtered subscriber count, and call count equals total.

Add per-batch counts when diagnosing boundary issues. A list of 21 recipients with size ten should create batches of 10, 10, and 1. Do not assert internal arrays if public call timing and order already prove the same behavior.

| Recipient count | Batch size | Expected batches | Expected delays |
| --- | --- | --- | --- |
| 0 | 10 | 0 | 0 |
| 1 | 10 | 1 | 0 |
| 10 | 10 | 1 | 0 |
| 11 | 10 | 2 | 1 |
| 20 | 10 | 2 | 1 |
| 21 | 10 | 3 | 2 |

Test invalid batch sizes only if the helper defines a policy for them. A zero or negative size can break the loop, and the current helper does not validate that input. Record the gap and add a guard before expecting a clean validation error.

Batch email failure testing should attach a run ID to count evidence. Counts from two overlapping jobs must not be mixed. Keep addresses out of metrics, but retain safe recipient IDs in restricted logs when retry work needs them.

Assert count types as well as values at the HTTP boundary. A string such as \`"10"\` can look right in a loose snapshot but break charts and arithmetic. Require finite nonnegative integers and reject a total smaller than sent plus failed.

Add a count check before any retry is queued. If the result list is shorter than the recipient list, stop and mark the run incomplete. Guessing that missing items failed can lead to duplicate mail when an accepted result was simply lost in memory.

Use one invariant helper across route and job tests. Repeating slightly different count math creates drift. The helper should return a clear error with run ID and safe counts, not a raw list of subscriber records.

## Model a Rate Limited Email Batch

A **rate limited email batch** controls both concurrency inside a group and delay between groups. QASkills starts every send in one batch at once, then waits for all of them. It sleeps only when more recipients remain.

Resend documents API limits and response headers in its [rate limit reference](https://resend.com/docs/api-reference/rate-limit). Do not hard-code a permanent provider limit from an article into tests. Keep batch size and delay configurable, and test the values the application chooses.

Use fake timers to assert no delay after the last group. Spy on the send start time from the fake clock, then require the second batch to start only after the configured pause. Do not assert real wall-clock milliseconds in shared CI.

Provider rate-limit failures may be returned as resolved SDK errors. Set one recipient to that error and prove the rest of the batch still settles. Then show that later groups continue under current behavior, since the helper has no global stop or adaptive backoff.

That is not the same as safe retry control. A later worker can classify the rate-limit result and honor provider guidance. The present helper only applies a fixed pause between batches, so tests must not claim exponential backoff exists.

Keep a load-focused test outside the unit suite. It can use a fake provider server that enforces a small rate, captures arrival times, and returns controlled 429 responses. Never aim a stress suite at the live email provider or real subscriber data.

Test a rate error in the first group and a success in the next group. The current helper continues after its fixed delay, so the report should show both outcomes. Do not expect the first rate error to pause all later work for a provider-supplied interval.

If adaptive backoff is added later, drive it from a parsed and bounded value. Test missing, invalid, tiny, and very large retry hints before changing timer expectations. Keep a maximum wait so one bad response cannot hold a worker without end.

Record group start and finish times with the fake clock. A fixed delay begins after every promise in the prior group settles, not after the first call starts. Slow sends therefore add to the total gap, and the test should reflect that actual sequence.

## Run the Failure Procedure

Use one procedure whenever email return types, provider SDKs, subscriber filters, or batch settings change. Store safe result classes and counts, not addresses or rendered message bodies.

1. Create synthetic recipients with stable IDs and choose a batch size that crosses two boundaries.
2. Assign fulfilled success, fulfilled provider error, and rejected promise outcomes to named recipients.
3. Run the generic helper and assert input order, call count, result count, and delay count.
4. Reduce results with both promise status and \`value.success\`, then assert sent plus failed equals total.
5. Build the retry list and prove it contains only the failed recipient IDs in original order.
6. Run the weekly digest route with opted-in and opted-out users, mixed outcomes, and fake timers.
7. Add one synchronous throw case and record whether the current helper stops before all-settled.
8. Restore timers and mocks, then publish the run ID, safe IDs, and result classes.

Run fast helper tests for every email code change. Keep the database-backed digest case in the post-change integration flow and a small browser case in the full [CI/CD pipeline](/blog/cicd-testing-pipeline-github-actions).

Batch email failure testing should also prove the next normal job can run after a failed batch. Clear mocks, start a fresh set of recipients, and expect clean counts. This catches leaked fake timers, stale provider errors, and module state.

## Apply Batch Email Failure Testing

Batch email failure testing is complete when every filtered recipient has one classified outcome, successes remain visible, and retry input contains only failed IDs. The suite must inspect resolved \`success: false\` values as well as rejected promises, because current QASkills email helpers catch provider errors.

Add the matrix to your post-change flow, then browse the [skills directory](/skills) for related checks. Use the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) for the email link journey, and pair this tutorial with the [error-handling guide](/blog/error-handling-testing-patterns) before changing retries.

## Frequently Asked Questions

### Why can a fulfilled promise still mean email failure?

The QASkills send helpers catch thrown errors and SDK error responses, then resolve an object with \`success: false\`. Promise.allSettled therefore marks that attempt fulfilled. Count logic must inspect both the settled status and the value's success flag before reporting the message as sent.

### Does Promise.allSettled retry failed email calls?

No. It waits for every supplied promise and describes each outcome. It does not retry, delay, classify provider errors, or attach recipient identity. The caller must choose a bounded retry policy and build its retry list from failed results without resending known successes.

### Can synchronous send errors bypass all-settled isolation?

Yes in the current generic shape. The code evaluates \`batch.map(sendFn)\` before passing the array into Promise.allSettled. A synchronous throw during that map can stop the helper. An async send function turns its throw into a rejected promise, which all-settled can record normally.

### How many delays should a batch test expect?

Expect one delay between groups and no delay after the final group. With batch size ten, zero through ten recipients need no delay, eleven through twenty need one, and twenty-one need two. Fake timers provide stable proof without slowing the suite.

### What should an email retry record contain?

Keep a campaign or digest run ID, safe recipient ID, attempt number, failure class, next allowed time, and current state. Avoid addresses in general metrics. The retry worker can load the latest address through an authorized path and skip recipients who have since opted out.

### Does provider acceptance prove inbox delivery?

No. A successful SDK response shows that the provider accepted the request under its API contract. Bounces, blocks, spam filtering, and inbox rendering happen later. Use provider events and controlled inbox tests for those stages, and label each metric with the stage it proves.
`,
};
