import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Stripe Webhooks Locally with Signature Verification',
  description:
    'Test Stripe webhooks locally with real signature verification, CLI forwarding, raw-body handling, idempotency checks, event triggers, and replay defenses.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Stripe Webhooks Locally with Signature Verification

Copy the \`whsec_...\` value printed by \`stripe listen\`, not the similarly shaped secret from a Dashboard endpoint. That distinction is where many local webhook sessions go wrong: the CLI signs the payload it forwards with its own endpoint secret, and verification correctly rejects a different secret even when both belong to the same Stripe account.

A credible local test preserves the exact request bytes, validates the \`Stripe-Signature\` header with Stripe's SDK, returns a deliberate HTTP status, and makes processing idempotent. The Stripe CLI supplies signed deliveries from a sandbox, while targeted automated tests cover bad signatures, duplicate events, and stale timestamps without needing an external tunnel.

## Establish the CLI-to-localhost trust path

Authenticate the Stripe CLI, start your application on a local port, then run the listener in a second terminal. Restrict forwarded events when practical. A smaller event set makes logs readable and prevents unrelated sandbox activity from exercising unfinished handlers.

\`\`\`bash
stripe login

stripe listen \
  --events checkout.session.completed,payment_intent.payment_failed \
  --forward-to localhost:4242/webhooks/stripe

# In another terminal, after exporting the whsec_ value printed above:
export STRIPE_WEBHOOK_SECRET='whsec_from_stripe_listen_output'
npm run dev

# In a third terminal, generate a sandbox fixture and event:
stripe trigger checkout.session.completed
\`\`\`

The listener prints each delivery and your endpoint's response code. The signing secret printed when the listener starts is specific to that CLI forwarding session. A Dashboard-configured endpoint has a separate secret. Test and live endpoints also have separate secrets. Treat each secret as bound to one delivery channel rather than as an account-wide password.

| Local component | Responsibility | Failure it can reveal |
|---|---|---|
| Stripe sandbox | Creates test-mode objects and Event records | Handler assumptions about realistic object shape |
| Stripe CLI listener | Receives events, signs, and forwards to localhost | Routing, endpoint status, selected event types |
| Raw-body middleware | Preserves byte-for-byte payload | Signature mismatch caused by JSON parsing or reserialization |
| Stripe SDK | Checks timestamp and HMAC signature | Wrong secret, changed body, invalid or stale header |
| Application handler | Dispatches event and persists idempotently | Duplicate side effects, ordering assumptions, schema handling |

The CLI is more than a curl replacement. A hand-written JSON POST has no valid Stripe signature unless you generate one with the SDK for tests. Use \`stripe trigger\` when you want Stripe-managed fixture creation and the resulting event delivery. Use SDK-generated test headers for narrow verification-unit scenarios.

## Preserve the request body before JSON middleware touches it

Signature verification operates on the raw UTF-8 payload Stripe sent. Parsing JSON and serializing it again can change whitespace, property order, or encoding. The data remains semantically equivalent, but the bytes no longer match the signature.

In Express, mount \`express.raw({ type: 'application/json' })\` on the webhook route before any global \`express.json()\` middleware consumes that route. The handler passes the Buffer, signature header, and endpoint secret to \`stripe.webhooks.constructEvent()\`. Only the returned Event should be trusted as verified.

\`\`\`ts
import express from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const app = express();

app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (request, response) => {
    const signature = request.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      response.status(400).send('Missing Stripe-Signature header');
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown verification error';
      response.status(400).send(\`Webhook signature verification failed: \${message}\`);
      return;
    }

    await enqueueStripeEvent({
      eventId: event.id,
      eventType: event.type,
      payload: event,
    });
    response.sendStatus(200);
  },
);

app.use(express.json());
app.listen(4242);
\`\`\`

Frameworks expose raw bodies differently. In any stack, validate the actual runtime type. A string, Buffer, or byte array expected by the SDK is acceptable according to the language library, while a parsed object is not the original payload. Confirm proxy and serverless layers do not transform the body before your code receives it.

The endpoint should not use \`express.json()\` and then attempt \`JSON.stringify(request.body)\`. That can pass superficial tests built the same way while failing every real Stripe delivery. A robust webhook test sends bytes through the same middleware chain used in production.

## Decide what a successful HTTP response means

Stripe expects a successful \`2xx\` response when the endpoint accepts a delivery. Avoid performing slow fulfillment work before responding. Persist or enqueue the verified event, then acknowledge. If downstream work fails after a durable enqueue, retry it within your job system instead of asking Stripe to redeliver an event you already recorded.

If the endpoint cannot durably accept the event, return a non-\`2xx\` status so the delivery is not falsely acknowledged. Differentiate these states:

| Situation | Suggested response | Processing record |
|---|---:|---|
| Header absent or signature invalid | \`400\` | Do not create a trusted event record |
| Event verified and newly persisted | \`200\` | Store event ID before side effects |
| Verified duplicate already accepted | \`200\` | No repeated business mutation |
| Temporary database outage before persistence | \`500\` | No acceptance claim |
| Event type intentionally ignored | \`200\` | Optional audit record, no business action |
| Handler's domain validation fails permanently | Policy-specific, usually record and acknowledge | Move to observable dead-letter workflow |

Returning \`500\` for a permanently unprocessable but authentic event can cause repeated delivery without improving the outcome. Conversely, returning \`200\` before any durable boundary risks losing the event if the process dies. Define acceptance precisely and test around that line.

For general delivery contracts, retry schedules, and endpoint observability, the [complete webhook testing guide](/blog/webhook-testing-complete-guide-2026) provides transport-agnostic coverage. Stripe-specific signature verification belongs before those business policies.

## Generate valid and invalid signatures in automated tests

Stripe's Node SDK provides \`stripe.webhooks.generateTestHeaderString()\` for local automated tests. It signs a payload with a supplied secret and optional timestamp. This is preferable to reimplementing the signature algorithm in the test, because a hand-rolled helper can duplicate the same bug as production code.

The example below uses Supertest against the Express app. Export the app without calling \`listen()\` in the application module so the test can exercise the full middleware route in process.

\`\`\`ts
import request from 'supertest';
import Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app, eventQueue } from './app';

const stripe = new Stripe('sk_test_placeholder');
const endpointSecret = 'whsec_local_test_secret';

const payload = JSON.stringify({
  id: 'evt_checkout_42',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_42',
      object: 'checkout.session',
      payment_status: 'paid',
    },
  },
});

describe('POST /webhooks/stripe', () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = endpointSecret;
    vi.spyOn(eventQueue, 'add').mockResolvedValue(undefined);
  });

  it('accepts an untouched signed payload', async () => {
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: endpointSecret,
    });

    await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(payload)
      .expect(200);

    expect(eventQueue.add).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt_checkout_42' }),
    );
  });

  it('rejects a body changed after signing', async () => {
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: endpointSecret,
    });
    const changed = payload.replace('"paid"', '"unpaid"');

    await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signature)
      .send(changed)
      .expect(400);

    expect(eventQueue.add).not.toHaveBeenCalled();
  });
});
\`\`\`

Do not put a real secret key in this test. Header generation needs the webhook secret, not an authenticated Stripe API call. A placeholder Stripe client key is sufficient for the local helper. Keep production secrets in environment management, never fixtures or snapshots.

## Test timestamp tolerance and replay behavior separately

Stripe's signature header includes a timestamp, and official libraries enforce a default tolerance against the current time. This mitigates captured-request replay at the verification layer. The docs caution that setting tolerance to zero disables the recency check, so zero is not “strict mode.”

Generate a test header with an old timestamp and verify rejection under your configured tolerance. Control the timestamp directly rather than making the test sleep. Also test server clock assumptions operationally: a badly skewed host can reject legitimate deliveries.

Signature recency is not business idempotency. A valid event can be delivered more than once with a fresh signature and timestamp. Stripe generates a new signature for a retry. Therefore, deduplicate using the stable Event \`id\`, stored under a unique database constraint, not the signature string.

\`\`\`ts
import { expect, it } from 'vitest';
import Stripe from 'stripe';

const stripe = new Stripe('sk_test_placeholder');
const secret = 'whsec_replay_test';
const body = JSON.stringify({ id: 'evt_old_1', object: 'event', type: 'invoice.paid' });

it('rejects a correctly signed payload outside the tolerance', () => {
  const ninetyMinutesAgo = Math.floor(Date.now() / 1000) - 90 * 60;
  const header = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
    timestamp: ninetyMinutesAgo,
  });

  expect(() => stripe.webhooks.constructEvent(body, header, secret, 300)).toThrow(
    /timestamp/i,
  );
});
\`\`\`

Keep this as a verifier test. A separate repository or service test should send the same verified Event twice and prove the second transaction does not issue another refund, email, entitlement grant, or ledger entry.

## Make idempotency observable at the database boundary

An in-memory Set of event IDs works only until process restart and cannot coordinate horizontally scaled instances. Use a durable table with a unique key on the Stripe event ID. Insert and claim processing atomically. Store event type, received time, processing state, and failure detail needed for operations.

A strong concurrency test submits two requests with the same Event ID and different valid headers. Both endpoint requests may receive \`200\`, but only one domain mutation should commit. Run them concurrently with \`Promise.all\` so the test challenges the unique constraint rather than serially exercising an already-set flag.

Do not assume event arrival order. \`customer.subscription.updated\` may be processed before a related creation handler finishes, especially when queues have multiple consumers. Fetch current Stripe state when your design requires authoritative reconciliation, or make each event handler tolerant of missing local prerequisites. Tests should permute meaningful event sequences.

The [Stripe test mode automation guide](/blog/stripe-test-mode-automation-guide) covers creating and cleaning up sandbox objects. For webhook tests, capture their IDs so a triggered event can be correlated with the object the scenario created.

## Use trigger fixtures without over-trusting them

\`stripe trigger checkout.session.completed\` creates fixture data and emits an event. It is excellent for a local end-to-end smoke test, but its generated object may not contain every metadata field or product arrangement your integration uses. Trigger commands support Stripe's documented fixture behavior, not arbitrary production histories.

For domain-specific cases, create sandbox objects through the API and perform the action that causes the event. That tests more of the causal workflow. You can also use CLI fixture files where supported, but keep them aligned with official CLI syntax and inspect the resulting Event rather than assuming every override maps to the final nested object.

| Scenario | Best driver | Reason |
|---|---|---|
| Verify local route and signature setup | \`stripe listen\` plus \`stripe trigger\` | Real signed forwarding with minimal preparation |
| Exact malformed signature | SDK header helper and HTTP test | Deterministic negative input |
| Business metadata used for provisioning | Create sandbox Checkout flow | Exercises actual metadata propagation |
| Duplicate delivery race | Two signed local HTTP requests | Precise control over same Event ID |
| Dashboard endpoint delivery | Registered test endpoint | Validates remote routing and its separate secret |
| Live-mode readiness | Controlled operational check, no fake charge assumptions | Live credentials and event destination differ from sandbox |

Avoid making the local suite depend on a permanently running CLI process. CLI forwarding is an interactive integration lane. In-process signed request tests should remain hermetic and fast.

## Diagnose signature failures in a fixed order

First print which secret source is configured, but never print the secret itself. Confirm it corresponds to the current \`stripe listen\` output. Next inspect the runtime type and length of the body before verification. Then verify the exact header arrives unchanged. Finally check clock synchronization and tolerance.

Common middleware mistakes include mounting JSON parsing globally before the webhook route, decoding and re-encoding a serverless body, and applying character-set transformations. Infrastructure can also alter paths, but path rewriting does not affect a correctly forwarded body and header. Diagnose bytes before blaming the network.

Log the Event ID only after verification. An attacker can send arbitrary JSON containing a plausible ID, so pre-verification fields are untrusted. Redact personal and payment-related payload fields from logs. Record enough metadata to trace delivery without turning application logs into a copy of every webhook body.

## Promote local confidence into a layered suite

Keep pure handler tests for each event type, HTTP middleware tests for raw-body and signature behavior, database integration tests for idempotency, and a small CLI-forwarding smoke test for developer setup. Each layer owns a different failure surface.

Before release, confirm the deployed endpoint uses its deployed signing secret, accepts the selected event types, responds within its platform timeout, and exposes failed processing through alerts or a replay workflow. Local signature success does not validate firewall rules, TLS, DNS, or production secret injection.

The decisive quality signal is not that \`stripe trigger\` printed a green \`200\`. It is that altered bytes are rejected, authentic duplicates are harmless, accepted events are durable, and asynchronous business processing is observable when it fails.

## Replay event meaning without reusing an expired delivery signature

Teams often save a failed webhook body and its \`Stripe-Signature\` header, then resend both days later. Signature verification should reject that delivery because the signed timestamp is stale. Disabling tolerance to make the replay work weakens the exact defense the test should preserve.

Choose the replay layer explicitly. To reprocess an already verified Event from your durable inbox, invoke the internal worker with the stored event ID and payload. That tests business recovery without pretending a historical HTTP delivery is fresh. To retest the HTTP boundary, generate a new test header for the captured raw payload with a local-only secret. To exercise Stripe's delivery controls, use the supported Dashboard or CLI event resend workflow for the environment and version you operate.

Store enough information for recovery, but apply data minimization. A full Event can contain customer details. Encrypt sensitive payload storage, restrict access, set retention, and keep immutable identifiers and processing history. If policy forbids retaining full bodies, store the fields necessary for idempotency and fetch authoritative object state from Stripe during replay.

Replay tests should verify state transitions, not only status. Move a recorded item from failed to processing to completed, increment an attempt counter, retain the previous error, and ensure the same business mutation cannot commit twice. A poison event should stop at a configured terminal state or dead-letter path rather than loop indefinitely.

Finally, distinguish Event replay from recreating the business event. Triggering a second Checkout completion produces a new Event ID and can legitimately represent another occurrence. Reprocessing \`evt_123\` should remain idempotent. Your test names and operational UI should make that distinction unmistakable.

## Frequently Asked Questions

### Why does the Dashboard webhook secret fail with stripe listen?

The CLI forwarding session supplies its own signing secret. Use the \`whsec_...\` printed by the active listener for forwarded events, and reserve the Dashboard endpoint secret for deliveries to that registered endpoint.

### Can I parse JSON before calling constructEvent()?

Signature verification cannot follow JSON parsing. Pass the untouched raw request body to Stripe's verifier, then use the verified Event it returns for typed handling.

### Does signature verification prevent duplicate processing?

Authentication is separate from idempotency. Verification checks payload integrity and recency. Stripe retries are newly signed, so persist Event IDs under a unique constraint and make business side effects idempotent.

### Is stripe trigger enough to test every Checkout configuration?

It is a useful standard fixture, not a full model of your catalog and metadata. Create specific sandbox objects and complete their workflow for cases coupled to your own configuration.

### What status should an intentionally ignored event type return?

Return a successful \`2xx\` after verification when ignoring it is deliberate. A failure status invites redelivery. Keep an audit log if unexpected authentic event types need operational visibility.
`,
};
