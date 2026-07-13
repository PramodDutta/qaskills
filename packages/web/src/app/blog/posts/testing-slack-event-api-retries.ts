import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Slack Events API Retries',
  description:
    'Test Slack Events API retries with signed duplicate deliveries, retry headers, fast acknowledgements, and idempotent processing that survives failures.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Slack Events API Retries

Your handler posted the same incident alert twice. Both requests carried the same Slack event ID; the second also carried \`x-slack-retry-num: 1\` and \`x-slack-retry-reason: http_timeout\`. The duplicate is expected delivery behavior. The duplicate side effect is an application defect.

Slack expects an Events API request to receive an HTTP 2xx response within three seconds. If delivery fails, Slack can retry up to three times on a gradually increasing schedule. Each retry identifies its attempt and reason in headers, but robust deduplication should be based on the event envelope's stable \`event_id\`, not on the retry counter.

Testing this path requires more than sending the same JSON twice. A credible suite preserves the original signed body, varies retry metadata, controls acknowledgement timing, and observes whether downstream work happens once.

## Map Slack's delivery attempt before writing assertions

An Events API endpoint has two timelines. The ingress timeline authenticates the request, validates the envelope, records a deduplication key, and acknowledges quickly. The processing timeline performs slower actions such as database writes, Slack Web API calls, notifications, or analytics.

| Signal | Source | Use in the handler | What the test should prove |
| --- | --- | --- | --- |
| \`event_id\` | JSON envelope | Stable idempotency key for one event | Repeated deliveries produce one business effect |
| \`event_time\` | JSON envelope | Event occurrence context, not a retry key | Old but valid retries are handled according to retention policy |
| \`x-slack-retry-num\` | Retry request header | Diagnostics for attempt 1, 2, or 3 | Header is parsed without becoming identity |
| \`x-slack-retry-reason\` | Retry request header | Operations and failure analysis | Known reasons are logged safely |
| \`x-slack-request-timestamp\` | Signed request header | Replay-window and signature validation | Stale or tampered requests are rejected |
| \`x-slack-signature\` | Signed request header | Authenticity check over timestamp and raw body | Retry headers do not alter signature computation |

Slack documents retry reasons including \`http_timeout\`, \`too_many_redirects\`, \`connection_failed\`, \`ssl_error\`, \`http_error\`, and \`unknown_error\`. Treat values as diagnostic input, not a closed business enum that can crash ingress when Slack adds context.

The [webhook testing guide](/blog/webhook-testing-complete-guide-2026) covers signature verification and replay protection across providers. Slack's Events API adds a strict acknowledgement budget and provider-defined retry headers that deserve their own cases.

## Build signed deliveries with the raw JSON body

Slack signing uses a versioned base string composed from \`v0\`, the request timestamp, and the exact raw body, then an HMAC SHA-256 digest with the app's signing secret. Whitespace changes the signature. Tests must sign the same bytes they send.

The following Vitest helper and Express integration test use public Node and Supertest APIs. The application under test must expose the raw body to its verifier, usually through \`express.raw({ type: 'application/json' })\` on this route before a JSON parser consumes it.

\`\`\`ts
import { createHmac } from 'node:crypto';
import request from 'supertest';
import { expect, test } from 'vitest';
import { app, processedEvents } from '../src/app';

const signingSecret = 'test-signing-secret';

function slackSignature(timestamp: number, rawBody: string): string {
  const base = ['v0', timestamp, rawBody].join(':');
  return 'v0=' + createHmac('sha256', signingSecret).update(base).digest('hex');
}

function eventBody(eventId: string): string {
  return JSON.stringify({
    token: 'legacy-field-not-used-for-auth',
    team_id: 'T0123',
    api_app_id: 'A0456',
    type: 'event_callback',
    event_id: eventId,
    event_time: 1783936800,
    event: {
      type: 'app_mention',
      user: 'U0789',
      text: '<@UAPP> status',
      channel: 'C0246',
      ts: '1783936800.001200',
    },
  });
}

test('acknowledges a signed Slack event', async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = eventBody('Ev-retry-001');

  const response = await request(app)
    .post('/slack/events')
    .set('content-type', 'application/json')
    .set('x-slack-request-timestamp', String(timestamp))
    .set('x-slack-signature', slackSignature(timestamp, body))
    .send(body);

  expect(response.status).toBe(200);
  await processedEvents.waitFor('Ev-retry-001');
  expect(processedEvents.count('Ev-retry-001')).toBe(1);
});
\`\`\`

Do not use the envelope's legacy \`token\` field as the primary authenticity check. Verify the signing secret protocol. In production, compare signatures with a timing-safe method and reject timestamps outside a small replay window, often around five minutes according to Slack's signing guidance.

The helper intentionally computes time at test execution. A hard-coded old timestamp should be used only for the explicit stale-request test.

## Re-deliver the identical event with retry headers

The central behavior is idempotency. Submit an original attempt, then the same raw envelope as a retry. Both should receive a fast success response, while downstream processing occurs exactly once.

\`\`\`ts
test('does not process a retried event twice', async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = eventBody('Ev-retry-duplicate');
  const signature = slackSignature(timestamp, body);

  const first = await request(app)
    .post('/slack/events')
    .set('content-type', 'application/json')
    .set('x-slack-request-timestamp', String(timestamp))
    .set('x-slack-signature', signature)
    .send(body);

  const retry = await request(app)
    .post('/slack/events')
    .set('content-type', 'application/json')
    .set('x-slack-request-timestamp', String(timestamp))
    .set('x-slack-signature', signature)
    .set('x-slack-retry-num', '1')
    .set('x-slack-retry-reason', 'http_timeout')
    .send(body);

  expect(first.status).toBe(200);
  expect(retry.status).toBe(200);
  await processedEvents.waitFor('Ev-retry-duplicate');
  expect(processedEvents.count('Ev-retry-duplicate')).toBe(1);
});
\`\`\`

An already-accepted duplicate should usually receive 2xx. Returning an error invites another retry and spends failure budget without creating new value. The response need not wait for the original asynchronous job to finish, provided the durable deduplication and queue transaction makes acceptance truthful.

Avoid assertions that attempt two must have a different signing timestamp. Slack signs each HTTP request, and delivery timing can affect headers, but the idempotency requirement does not depend on a particular timestamp relationship. Tests can reuse the timestamp to isolate duplicate behavior.

## Make deduplication atomic under concurrent retries

Sequential duplicates are the easy case. A timeout can leave the first request processing while the retry arrives. Two handler instances may race, both observe no record, and both enqueue work unless insertion is atomic.

A database uniqueness constraint on \`event_id\` is stronger than "select then insert." Redis \`SET key value NX EX seconds\` can also act as an atomic claim when its durability and retention match the business risk. Queue systems with message deduplication can help, but understand their time window.

| Deduplication location | Useful property | Risk to exercise |
| --- | --- | --- |
| SQL unique key on \`event_id\` | Durable, inspectable, transactional with an outbox | Cleanup and table growth |
| Redis conditional set | Fast atomic claim with TTL | Cache loss, expiry too short, claim before failed enqueue |
| Queue-native key | Keeps duplicate control near work execution | Provider-specific windows and redelivery semantics |
| In-process set | Simple for a unit test | Useless across instances, restarts, or deployments |

Test concurrency with a barrier that lets both requests reach the claim at nearly the same time. Do not rely on \`Promise.all\` alone to create a race; the server may serialize them. Instrument the repository in a component test or run enough integration attempts to make overlap observable.

\`\`\`ts
test('claims one event when two deliveries arrive together', async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = eventBody('Ev-concurrent-007');
  const signature = slackSignature(timestamp, body);

  const send = (retryNumber?: string) => {
    let call = request(app)
      .post('/slack/events')
      .set('content-type', 'application/json')
      .set('x-slack-request-timestamp', String(timestamp))
      .set('x-slack-signature', signature);
    if (retryNumber) {
      call = call
        .set('x-slack-retry-num', retryNumber)
        .set('x-slack-retry-reason', 'connection_failed');
    }
    return call.send(body);
  };

  const [original, retry] = await Promise.all([send(), send('1')]);

  expect([original.status, retry.status]).toEqual([200, 200]);
  await processedEvents.waitFor('Ev-concurrent-007');
  expect(processedEvents.count('Ev-concurrent-007')).toBe(1);
});
\`\`\`

The production claim and queue publication should fail coherently. If code records "seen" and crashes before enqueuing, all retries may be acknowledged as duplicates and the event disappears. A transactional outbox, queue idempotency, or a claim state machine can close that gap. Test the crash boundary explicitly.

## Acknowledge before slow work begins

Slack's three-second deadline includes network travel and your edge stack. A test that merely finishes in 2.9 seconds on a laptop provides little safety. Design the ingress path to authenticate, validate, persist or enqueue, and respond. Run business work elsewhere.

Measure the response independently from job completion. Inject a processor that blocks after the queue accepts the event, then confirm the HTTP response still arrives. If the handler awaits that processor, the test should expose it immediately without sleeping three seconds.

\`\`\`ts
test('returns before the downstream processor is released', async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = eventBody('Ev-fast-ack');
  const signature = slackSignature(timestamp, body);

  processedEvents.pauseConsumer();
  const started = performance.now();

  const response = await request(app)
    .post('/slack/events')
    .set('content-type', 'application/json')
    .set('x-slack-request-timestamp', String(timestamp))
    .set('x-slack-signature', signature)
    .send(body);

  const elapsed = performance.now() - started;
  expect(response.status).toBe(200);
  expect(elapsed).toBeLessThan(500);
  expect(processedEvents.count('Ev-fast-ack')).toBe(0);

  processedEvents.resumeConsumer();
  await processedEvents.waitFor('Ev-fast-ack');
});
\`\`\`

The 500 ms assertion is a project test budget, not a Slack guarantee. Pick a threshold with headroom for CI and keep the architectural assertion, response precedes downstream completion, as the primary signal.

## Exercise signature, timestamp, and retry-header combinations

Retry headers are not part of Slack's signature base string. Adding or changing them must not invalidate an otherwise authentic request. Conversely, a valid-looking retry number must never bypass signature verification.

Build a matrix that includes:

| Case | Expected HTTP result | Expected side effect |
| --- | --- | --- |
| Valid original delivery | 2xx | One job accepted |
| Valid retry of accepted event | 2xx | No additional job |
| Retry header with invalid signature | 401 or documented auth failure | None |
| Valid signature over altered body | Auth failure because sent bytes no longer match | None |
| Timestamp outside replay window | Auth failure | None |
| Missing \`event_id\` in callback envelope | 4xx or safe discard by policy | None |
| Unknown retry reason with valid signature | 2xx duplicate handling | No crash and no repeat effect |

Use the raw request body before JSON parsing for signature verification. Middleware order is a frequent production-only failure because a framework parses and reserializes JSON with different whitespace. A test body containing spaces or a different property order catches accidental reserialization.

The general [API testing best practices guide](/blog/api-testing-best-practices-guide) helps organize negative cases at authentication and validation boundaries. Here, keep Slack-specific delivery identity separate from the inner event's fields such as message timestamp or channel.

## Simulate acknowledgement failures without waiting on Slack

Your automated suite cannot efficiently ask Slack to wait one minute and five minutes for every retry. Model delivery attempts directly at the HTTP boundary. Provider sandbox or end-to-end checks can confirm connectivity, while deterministic tests own idempotency.

Test the reason your endpoint could fail: queue unavailable, database timeout, handler exception, reverse proxy rejection, or response loss after persistence. The last is especially important. If the application accepted and enqueued the event but Slack did not receive the 2xx, the next delivery must be harmless.

Returning \`x-slack-no-retry: 1\` on a non-2xx response tells Slack not to retry that particular delivery. Use it sparingly for permanent failures where another attempt cannot help. Do not add it to transient infrastructure failures just to reduce noise, and do not use it as a substitute for deduplication.

When testing this header, assert both status and exact response header. A 200 response already signals successful delivery, so no-retry is relevant to a deliberate non-2xx result.

## Observe retries without leaking message content

Logs should include \`event_id\`, team ID, retry number, retry reason, signature validation outcome, dedupe decision, and acknowledgement latency. Avoid logging the full raw body because events can contain private message text and user data.

Metrics worth separating include original deliveries, retry deliveries, duplicate suppressions, invalid signatures, queue failures, and ingress latency. A spike in \`http_timeout\` points to a different problem than \`ssl_error\`. Treat header values as bounded labels or normalize unknown values to avoid uncontrolled metric cardinality.

Trace ingress and processing with the event ID as correlation, but never assume the retry is a child of the first HTTP trace. They are separate requests representing the same logical event.

In load tests, preserve the ratio distinction between unique events and deliveries. Ten thousand requests with one event ID test a hot dedupe key, while ten thousand distinct IDs test throughput. Both are useful and answer different questions.

## Define how long an event stays deduplicated

Slack's documented retry schedule is short, but internal queues and manual replays may deliver much later. Choose retention from business impact, storage cost, and all redelivery paths, not only the provider's last scheduled attempt.

A TTL that expires before a delayed retry makes the side effect repeat. Permanent storage avoids that but grows indefinitely unless archived. Some teams retain the event ID with processing status for an operational window, then rely on idempotent downstream business keys for longer protection.

Test just before and after expiry using a controllable clock or datastore designed for the test. Do not wait real hours. Document whether a post-retention delivery is processed again, discarded as too old, or reconciled against domain state.

Finally, decide how to handle the same \`event_id\` with different content. It should be treated as suspicious: log a digest mismatch and avoid processing the altered body. Your test can sign both requests correctly with the test secret, proving that authentication alone does not replace identity consistency.

## Verify URL challenge handling does not enter the event queue

Slack sends a \`url_verification\` envelope containing a challenge when an Events API endpoint is configured. It is not an \`event_callback\` and should not consume the normal deduplication or worker path. Sign it exactly like any other request, return the challenge in the documented response form, and assert that no business event was enqueued.

Keeping this case beside retry tests catches an ingress router that assumes every authenticated envelope has \`event_id\`. A configuration handshake without that field should not be logged as a malformed retry. Conversely, do not let the special route bypass signature verification just because the challenge must be returned quickly.

## Test the acknowledgement-loss window explicitly

The most revealing retry case occurs after durable acceptance but before Slack receives the response. Simulate a response connection failure at the HTTP proxy or adapter after the queue commit. Then deliver the signed envelope again with \`x-slack-retry-num: 1\`. The second request should find the existing event record, return 2xx, and leave the queue with one message.

At unit level, split the handler into claim, publish, and acknowledge stages and inject a fault between publish and response. At system level, a fault proxy can cut the client connection while leaving the server alive. Inspect both the dedupe table and queue rather than trusting an in-process counter that would reset on restart.

Also test the inverse gap: the claim succeeds but queue publication fails. If the record is left in a final "accepted" state, every retry can be suppressed and the event lost. A pending state, transactional outbox, or claim rollback should make the retry able to finish the work without creating two jobs.

## Keep inner-event idempotency separate from envelope idempotency

One envelope can contain an inner message, reaction, membership change, or other event. Use the envelope \`event_id\` for delivery deduplication. Inner identifiers still matter for domain invariants, such as updating the same message projection or ignoring an older edit, but they solve a different problem.

This separation becomes important when the same logical Slack object generates several legitimate Events API envelopes. Deduplicating only on channel and message timestamp can discard a later edit or reaction. Deduplicating only on the HTTP retry number can repeat the original side effect. Store the provider event identity first, then let the domain handler apply its own ordering and uniqueness rules.

For multi-workspace apps, include tenant context in storage design if event ID uniqueness is not treated globally by your schema. A composite key can make ownership explicit, but never accept the team ID without signature verification.

## Frequently Asked Questions

### Should I deduplicate on x-slack-retry-num?

No. The retry number describes an attempt and may be absent on the original delivery. Use the envelope's \`event_id\` as the logical event identity and keep retry headers for diagnostics.

### What response should an already-seen Slack event receive?

Return a prompt 2xx after confirming the earlier event is durably accepted. An error encourages further retries even though repeating the work is neither necessary nor safe.

### Are Slack retry headers included in signature verification?

No. Verification uses the version, request timestamp, and exact raw body. Retry headers must not grant trust or be appended to the signing base string.

### How can I test the three-second deadline without a slow test?

Pause or block the downstream consumer, then assert that the HTTP response completes before processing. Add a conservative local latency budget, but focus on the separation of acknowledgement from business work.

### How long should event IDs remain in the deduplication store?

Keep them longer than every credible provider, queue, and operator replay path. The exact period is a product and storage decision; test the documented behavior at the retention boundary with controlled time.
`,
};
