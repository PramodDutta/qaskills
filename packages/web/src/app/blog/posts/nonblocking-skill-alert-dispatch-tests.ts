import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Nonblocking skill alert dispatch tests',
  description:
    'nonblocking skill alert dispatch tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'nonblocking skill alert dispatch tests',
  keywords: [
    'nonblocking skill alert dispatch tests',
    'fire and forget email test',
    'skill publish response timing',
    'email side effect isolation',
    'nonblocking resend dispatch',
    'post response background promise',
  ],
  relatedSlugs: [
    'testing-batch-email-partial-failures-promise-allsettled',
    'testing-lazy-resend-initialization-nextjs-build',
    'error-handling-testing-patterns',
    'api-testing-best-practices-guide',
  ],
  sources: [
    'https://resend.com/docs/api-reference/emails/send-email',
    'https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts:POST detached subscriber promise',
    'packages/web/src/lib/email/send.ts:sendNewSkillAlert',
  ],
  content: `Nonblocking skill alert dispatch tests must hold subscriber lookup and email delivery pending, then prove the valid publish request still settles with status 201. Releasing either background step as success or failure must not change that response. A separate insert-failure control must still return 500 and start no alert work.

This is a response-isolation contract, not a promise that detached work always finishes; the QASkills route waits for authentication, validation, uniqueness, insertion, and the publisher counter attempt in a clear order the test can mark. It starts subscriber and alert work later through an unawaited promise chain, after the core row and its owner are known.

## Nonblocking skill alert dispatch tests: What Must the Suite Prove?

Nonblocking skill alert dispatch tests must show an event order that a simple status check cannot show. The created skill must exist before the route responds, while subscriber lookup and email sends may remain unsettled. Their later outcome cannot replace, delay, or change the 201 response that was sent.

The control begins with a valid authenticated request and a successful unique skill insert, while the subscriber query stays behind a deferred promise that the test owns from start to end. Invoke the route, race the response against a short test-controlled signal, and confirm the response settles without releasing subscriber data or letting a fast local fake hide the wait.

After status and body are recorded, resolve the subscriber query with one user, hold \`sendNewSkillAlert\` behind a second deferred promise, and prove the original response remains unchanged while that new gate stays shut. Release delivery as success and repeat with a rejected mock to cover both outcomes under the same saved response.

The failure control belongs before detached work. Reject the skill insert and assert status 500, the generic route error body, zero subscriber lookups, and zero sends from the same call ledger. That case proves the test can distinguish a required stored row from later mail work that the client does not await.

Avoid elapsed-time thresholds as the primary signal. A slow runner can make a correct route look broken, and a fast fake can hide an accidental \`await\` when all test work ends at once. Deferred promises give clear proof about which step was allowed to settle while each later gate was still held by the test.

The [publishing guide](/how-to-publish) gives the user flow behind this route. The test suite should stay below that browser flow and fix exact response, data, and side-effect lines with small records that are safe to print in a failed run.

Nonblocking skill alert dispatch tests pass when the 201 wins before either deferred alert step, the response body contains the created record, and later failures remain outside the client result. They fail if subscriber lookup or sending becomes a prerequisite for success, even when a quick local run still looks green.

## Which QASkills Code Paths Own This Contract?

The route owner is \`packages/web/src/app/api/skills/route.ts\`; its \`POST\` handler awaits \`getAuthUser\`, request parsing, validation, slug lookup, the skill insert, and a publisher counter update attempt before it can enter the new-skill alert branch. That fixed order lets the test place one mark before mail work and one mark after the client reply.

That branch runs only when \`RESEND_API_KEY\` is set. It builds a subscriber query, calls \`.then(async (subscribers) => ...)\`, and never awaits the resulting chain. The route proceeds to \`NextResponse.json(..., { status: 201 })\` while that chain can still be pending, with no value from the chain placed in the response.

Inside the chain, subscribers are split into groups of ten. Each group is passed to \`Promise.allSettled\`, and the code waits one second between groups when more work remains. Those waits are inside the detached chain, so they should not extend skill publish response timing for the caller that made the skill.

The delivery owner is \`packages/web/src/lib/email/send.ts\`. Its \`sendNewSkillAlert\` checks the key, builds an unsubscribe URL, and calls \`resend.emails.send\` with sender, recipient, subject, and a React message; it catches thrown errors and also turns a returned send error into \`{ success: false, error }\`. This means the test must track both a rejected mock and a resolved result whose success flag is false.

That resolved failure shape affects reports. A send failure handled by \`sendNewSkillAlert\` does not reject the route's \`Promise.allSettled\` input. The detached route code also does not inspect settled results, so a test must not expect the route to log every resolved delivery failure or add a count to the saved client body.

The route attaches one catch to the subscriber chain. A rejected lookup or an error thrown by the chain reaches \`console.error('Failed to send new skill alerts:', error)\`. This log is different from the helper's own send error logs, and the test report should name which one was seen.

The [Resend send-email reference](https://resend.com/docs/api-reference/emails/send-email) shows the async send call and its data/error result in the Node example. The [Next.js route handler guide](https://nextjs.org/docs/15/app/getting-started/route-handlers-and-middleware) supplies the route boundary. QASkills source, not either guide, defines whether alert work is awaited.

Use the [API testing guide](/blog/api-testing-best-practices-guide) for request fixture patterns. Keep the two repository paths above in test names so ownership remains obvious when a failed check moves from the route to the mail helper.

## Fire and forget email test: Baseline Cases

A fire and forget email test needs one good insert, a pending subscriber lookup, a pending send, and set failures, since a fully resolved happy path may let every promise finish before the response check runs. That quick result cannot prove detachment or show which step the route was free to leave in flight.

The first case sets \`RESEND_API_KEY\`, returns a signed-in local user, finds no duplicate slug, and inserts a complete skill row while the subscriber chain stays open through the first check. The route should still return 201 with the created skill fields and no mail result mixed into the JSON body.

The second case releases one subscriber and leaves delivery pending. Assert one send call with subscriber identity and the created skill fields from the row that was just stored. Then check that the saved response status and parsed body remain exactly the same before delivery is released by the test.

The third case rejects subscriber lookup after the response. Assert the chain-level error log once, no send calls, and no change in response output or stored skill data. This is the cleanest proof that subscriber discovery is outside the client contract and cannot roll back the prior insert.

The fourth case makes \`sendNewSkillAlert\` reject. Because the continuation uses \`Promise.allSettled\`, the rejection becomes a settled result and should not reject the whole continuation or stop the other calls in that group. Current route code does not log that settled result, so assert response isolation and send count rather than an invented route log.

The fifth case uses the real helper with a provider result containing \`error\`. The helper logs its own failure and resolves \`{ success: false, error }\`. This belongs in a focused helper test, while the route test can use a faithful double with the same resolved shape and no live key or address.

When \`RESEND_API_KEY\` is absent, the route should skip subscriber lookup entirely and still return 201. This branch proves alert setup is not required for publishing. It also guards a future change that performs needless database work before checking the key and may add avoidable load to each publish call.

Finally, reject the core skill insert. The route should return 500 and never start the alert branch or change the publisher's stored count. Nonblocking skill alert dispatch tests need this negative control because making every later step optional would be a grave false pass for a write that did not occur.

Link a manual control to the [getting started flow](/getting-started), but keep provider calls out of ordinary pull-request tests. A local fake produces much clearer ordering evidence, keeps the run fast, and gives each gate a name the team can read.

## Skill publish response timing: Test Matrix

Skill publish response timing should be expressed as settlement order, not an arbitrary millisecond budget. The matrix compares the critical insert with later lookup and delivery states under test-owned gates. Each row records both the client result and the side-effect evidence that remains after all gates close.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Insert and alerts succeed | Insert resolves; lookup and sends resolve later | Detached \`.then\` branch | 201 settles before alert release | Subscribers receive one attempted send each | Response waits for lookup or delivery |
| Subscriber lookup rejects | Lookup deferred, then rejected | Chain-level \`.catch\` | Existing 201 stays unchanged | Error logged once; no sends start | Rejection becomes client 500 |
| One alert rejects | One mocked send rejects inside a batch | \`Promise.allSettled\` | Existing 201 stays unchanged | Every batch item is attempted | One rejection stops sibling sends |
| All alerts fail | Helper resolves failure objects or mocks reject | Helper catch plus settled batch | Existing 201 stays unchanged | Send count matches subscriber count | Route status depends on provider outcome |
| Skill insert rejects | Core insert promise rejects | Outer route catch | 500 with generic error body | No subscriber query or email call | Test still reports 201 |

The first row needs two deferred gates, because lookup and sending can resolve at once and let the route await both while it still seems quick. Hold them until after the 201 assertion to make the dependency graph visible in any build host.

The lookup rejection row should check the exact chain log prefix and error object. It should not require a provider log because delivery never starts or receives a user to send. Include a final microtask flush before checking the detached log and clearing the spy.

The one-alert row checks that \`Promise.allSettled\` attempts every item in that batch. It does not prove a retry, durable queue, or user-visible failure report after the route has replied. Those behaviors do not exist in the current branch and must not appear in the test name.

For all-alert failure, decide whether the route double rejects or returns \`{ success: false }\`. Test both layers with their actual contracts and keep the two outcomes in distinct rows. The real helper absorbs delivery errors, while a rejected route double specifically exercises \`allSettled\` without a live send call.

The insert rejection row protects status rules for the write that the client asked the route to make. The route's outer catch returns a generic 500. See the [error handling patterns](/blog/error-handling-testing-patterns) for broader failure design, but keep this matrix tied to the current response and zero alert calls.

## How Should Email side effect isolation Be Exercised?

Email side effect isolation should use an event ledger plus deferred promises. Record \`insert-resolved\`, \`response-resolved\`, \`lookup-resolved\`, and \`send-resolved\` from the test seams. Then compare order instead of relying on wall-clock speed.

The primary route test can model the database chain with a controlled thenable. Existing project mocks may already provide a Drizzle chain builder, and that is preferable. The core assertion shape remains the same when the local helper differs.

\`\`\`typescript
import { expect, it, vi } from 'vitest';
import { POST } from '@/app/api/skills/route';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}

it('returns 201 before subscriber lookup settles', async () => {
  const subscribers = deferred<Array<{ userId: string; email: string; username: string }>>();
  arrangeAuthenticatedPublisher();
  arrangeUniqueSlug();
  arrangeCreatedSkill();
  arrangeSubscriberQuery(subscribers.promise);

  const request = new Request('http://local/api/skills', {
    method: 'POST',
    body: JSON.stringify(validSkillPayload),
  });
  const response = await POST(request as never);

  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({
    skill: { slug: validSkillPayload.slug },
  });
  expect(sendNewSkillAlert).not.toHaveBeenCalled();

  subscribers.reject(new Error('subscriber fixture failed'));
  await vi.waitFor(() =>
    expect(console.error).toHaveBeenCalledWith(
      'Failed to send new skill alerts:',
      expect.any(Error),
    ),
  );
});
\`\`\`

The named arrange helpers in this example stand for the repository's established database mocks, not new production behavior. They should return the exact records needed by each awaited query. Do not make one broad mock that ignores table, operation, or call order.

Use response settlement itself as the release point. Awaiting \`POST\` must complete while the subscriber promise remains pending. If the test hangs there, it has found an accidental dependency without needing a timer.

For delivery, resolve subscribers first and wait until \`sendNewSkillAlert\` is called. Keep that send promise pending while checking the already parsed response. Then release it and flush microtasks so the test leaves no open work.

Nonblocking skill alert dispatch tests should restore environment values, timers, console spies, and database doubles after every case. Detached callbacks can leak into the next test if cleanup happens before promises settle. Always release or reject each gate in a final cleanup path.

The [skills catalog](/skills) can provide realistic field shapes, but use synthetic records and recipients. A route contract test must not send real mail.

## Step-by-Step Nonblocking resend dispatch Procedure

Nonblocking resend dispatch requires a sequence that separates critical writes from optional work. The test should show exactly when each gate is released and which observation becomes available. Follow these steps without adding real sleep calls.

1. Place deferred promises around subscriber lookup and alert sending.
2. POST a valid skill and observe whether the 201 response settles before deferred work is released.
3. Release success and failure outcomes, then assert logs and the unchanged response.
4. Add a separate control proving insert failure still blocks the success response.

Set the email environment key before importing or invoking code if the test setup reads it early. The current route reads \`process.env.RESEND_API_KEY\` during the request, so per-test assignment works. Restore the prior value to avoid changing later cases.

After the response, release subscribers with more than one user. Confirm every recipient produces one helper call and every call receives the same created skill. Use distinct recipients so duplicate or missing calls are plain.

The helper test should cover a returned provider error and a thrown provider error. Both current branches resolve failure objects and log a helper-specific message. The following example checks that boundary without involving the route.

\`\`\`typescript
import { expect, it, vi } from 'vitest';
import { resend } from '@/lib/email/client';
import { sendNewSkillAlert } from '@/lib/email/send';

it('contains a provider error inside the alert helper', async () => {
  vi.mocked(resend.emails.send).mockResolvedValue({
    data: null,
    error: { name: 'fixture_error', message: 'delivery rejected' },
  } as never);

  const result = await sendNewSkillAlert(
    { userId: 'user-1', email: 'reader@example.test', username: 'reader' },
    {
      name: 'Contract Guard',
      description: 'Checks API response contracts.',
      author: 'publisher',
      authorName: 'publisher',
      slug: 'contract-guard',
      installCount: 0,
      qualityScore: 85,
    },
  );

  expect(result).toMatchObject({ success: false });
  expect(resend.emails.send).toHaveBeenCalledTimes(1);
  expect(console.error).toHaveBeenCalledWith(
    'Failed to send skill alert:',
    expect.any(Object),
  );
});
\`\`\`

This test needs a configured fixture key because the helper exits early when the key is absent. It should also inspect sender, recipient, subject, and React payload when those values are part of the helper contract. Keep provider network calls mocked.

The Resend reference shows that the Node client returns data and error fields for a send request. QASkills adds its own containment around that call. Nonblocking resend dispatch tests must reflect both layers rather than treating every failure as a rejected promise.

Finish by running the [publish instructions](/how-to-publish) against a non-production fixture if a higher-level check is needed. The unit gate remains the authoritative timing test.

## Post response background promise: Assertions and Diagnostics

A post response background promise needs assertions for status, stored state, send attempts, logs, and call counts. Status 201 proves only the client branch. The created skill row proves the critical write, while deferred gates prove later work did not block it.

Record the response body before releasing background work. After success and failure releases, compare the saved object with its original value. A response object cannot be rewritten after settlement, but this assertion makes the intended contract visible.

Check subscriber query count once when the key exists and zero when it does not. Check send count against returned subscribers. For more than ten users, use fake timers to advance the inter-batch wait and prove all groups run after the response.

Do not leave fake timers active while awaiting the route unless a timer is part of the route's critical path. The one-second delay exists only between detached batches. Advance it after the first batch assertions.

Distinguish two log owners. Subscriber-chain rejection uses the route message, while returned or thrown provider errors use messages from \`sendNewSkillAlert\`. A mock rejection settled by \`Promise.allSettled\` produces no route log under current code.

Print the event ledger on failure. A useful report might show \`insert-resolved, response-resolved, lookup-resolved, send-started, send-rejected\`. This sequence is clearer than a statement that publishing took a certain number of milliseconds.

Email side effect isolation also requires no real recipients, keys, or provider requests. Synthetic data is enough to assert arguments. Use the [QASkills blog](/blog) for adjacent batch and client setup checks.

Nonblocking skill alert dispatch tests should fail when response settlement appears after lookup or send settlement, even if status remains 201. That ordering change could increase latency and couple publishing to an optional service.

## What Regressions and Boundaries Prevent False Confidence?

Detached work is not durable background execution. The current route starts a promise and then returns, but the code does not enqueue a job or await completion through a platform lifecycle API. A process stop can interrupt work, and this suite must not promise otherwise.

The suite also does not prove provider acceptance means inbox delivery. It verifies helper invocation and its immediate data/error result. Delivery events, bounces, and inbox placement require separate evidence.

Publisher counter updates are noncritical but awaited before the alert branch. A failed counter write is caught and logged, then publishing continues. Keep that behavior outside alert timing assertions so the event ledger remains readable.

Validation, auth, duplicate slug handling, and skill insertion are critical route steps. Nonblocking skill alert dispatch tests should include one insert failure, but they should not replace full status coverage for 400, 401, and 409 branches.

\`Promise.allSettled\` prevents one rejected send from aborting sibling waits. However, the route does not currently inspect its result array. Do not claim it counts or reports individual alert failures.

The environment-key branch can create a false pass. If the key is absent accidentally, subscriber and send doubles will never run, and the response will look correctly independent. Assert that the configured test reaches the subscriber seam after the 201 check.

Likewise, resolving every fake before calling \`POST\` proves little about skill publish response timing. Keep at least one pending lookup case and one pending delivery case. The [API guide](/blog/api-testing-best-practices-guide) can cover broader request design.

After changes to the POST route, email helper, batching, or environment checks, run all five matrix rows. Preserve the distinction between optional alerts and the required skill insert.

## Frequently Asked Questions

### How do you prove skill creation returns before alert lookup?

Return a deferred promise from the subscriber query and do not release it. Invoke the POST handler and await its response. A correct route returns status 201 and the created skill while the query is pending. Then reject the query and verify only the detached error path observes that failure.

### What makes a fire and forget email test deterministic?

Use test-owned deferred promises instead of elapsed-time limits. Hold subscriber lookup and delivery at separate gates, record when the response settles, and release each gate afterward. This arrangement proves dependency order on slow and fast runners without sleeping or contacting an email provider.

### Which skill publish response timing assertion matters most?

The decisive assertion is that awaiting the POST handler completes before the unresolved subscriber promise. Status 201 alone is insufficient because alert work may have finished first. Pair settlement order with the created response body, one successful insert, and zero sends before subscribers are released.

### How should email side effect isolation handle provider errors?

Test the helper's actual failure shape. \`sendNewSkillAlert\` catches thrown errors and converts returned provider errors into resolved failure objects. The route should retain its 201 response, while helper tests assert the proper log and result. Do not expect every contained failure to reject the detached chain.

### Does nonblocking resend dispatch guarantee email completion?

No. It proves the HTTP response does not wait for subscriber lookup or send completion. The current code does not create a durable queued job, so a stopped process may interrupt detached work. Delivery guarantees need a different design and a separate acceptance contract.

### What should a post response background promise report on failure?

Report the event order, response status, response body, subscriber query count, send count, and owning log message. Distinguish a route-chain rejection from a helper-contained provider error. This output identifies accidental awaiting, skipped configuration, duplicate sends, and mistaken error expectations without exposing real recipients.

## Conclusion

Nonblocking skill alert dispatch tests should prove that a successful insert produces 201 before optional subscriber and email work settles. Deferred gates establish that order, while helper tests preserve the real data/error behavior. The suite should never describe this detached promise as a durable queue.

[Open how-to-publish](/how-to-publish), publish against a controlled test fixture, and add response-timing assertions before changing alert dispatch. Then review [available QA skills](/skills) for a safe synthetic payload shape rather than using a live publisher or recipient.`,
};
