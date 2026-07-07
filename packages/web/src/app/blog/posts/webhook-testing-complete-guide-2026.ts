import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Webhook Testing: The Complete Guide for QA Engineers',
  description:
    'How to test webhooks end to end: local capture, signature verification, retries, idempotency, ordering, and automation patterns with code examples.',
  date: '2026-07-07',
  category: 'API Testing',
  content: `
# Webhook Testing: The Complete Guide for QA Engineers

Webhooks are the inverted half of API testing. With a normal API you send a request and assert on the response; with a webhook the SYSTEM sends the request, your application is the server, and everything you usually rely on (initiating the call, controlling timing, reading a response) is out of your hands. That inversion is why webhook bugs ship so often: the happy path gets tested manually with one Stripe test event, while retries, duplicates, out-of-order delivery, and forged payloads never get exercised until production finds them.

This guide covers the full webhook testing surface: receiving and inspecting deliveries locally, verifying signatures, simulating provider behavior, and automating all of it in CI. It pairs with our [complete API testing guide](/blog/api-testing-complete-guide), which covers the request-response half of the contract.

## The Webhook Testing Surface

A webhook consumer has to get six distinct behaviors right, and each is a test class of its own:

| Behavior | Failure if untested | Test approach |
|---|---|---|
| Payload parsing | 500s on real events with optional fields | Replay real captured payloads, not hand-written ones |
| Signature verification | Forged events accepted | Send unsigned, wrongly signed, and expired-timestamp requests |
| Idempotency | Double-charging, duplicate emails | Deliver the same event ID twice, assert one side effect |
| Retry handling | Event loss or duplicate processing | Return 500 first, then 200; assert exactly-once effect |
| Ordering | Stale state overwrites fresh state | Deliver updated-then-created out of order |
| Timeout budget | Provider marks endpoint dead | Assert handler responds under the provider's limit |

If your test plan covers only the first row, you have tested a JSON parser, not a webhook integration.

## Local Capture and Inspection

During development you need to see real deliveries from real providers. The standard options:

- **Tunnels:** ngrok or cloudflared expose localhost to the provider. Fast, but every developer gets a different URL and secrets pass through a third party.
- **Capture services:** webhook.site or a requestbin instance give you an instant URL that records everything; ideal for inspecting exactly what a provider sends before writing a line of handler code.
- **Provider CLIs:** the best-in-class providers ship replay tooling. Stripe's CLI forwards live test-mode events to localhost and can trigger any event type on demand:

\`\`\`bash
stripe listen --forward-to localhost:4242/webhooks/stripe
stripe trigger payment_intent.succeeded
stripe trigger charge.refunded
\`\`\`

Capture a library of real payloads early (with secrets scrubbed) and commit them as fixtures. Hand-written example payloads drift from reality; captured ones are reality.

## Testing Signature Verification Properly

Signature checks are security code and deserve adversarial tests. The pattern (HMAC over timestamp plus body) is similar across Stripe, GitHub, Shopify, and most modern providers. Your suite should assert all four quadrants:

\`\`\`typescript
import { test, expect } from '@playwright/test';
import crypto from 'crypto';

const SECRET = process.env.WEBHOOK_TEST_SECRET!;

function sign(body: string, ts: number, secret: string) {
  const mac = crypto.createHmac('sha256', secret).update(ts + '.' + body).digest('hex');
  return 't=' + ts + ',v1=' + mac;
}

test('valid signature is accepted', async ({ request }) => {
  const body = JSON.stringify({ id: 'evt_1', type: 'ping' });
  const ts = Math.floor(Date.now() / 1000);
  const res = await request.post('/webhooks/stripe', {
    headers: { 'stripe-signature': sign(body, ts, SECRET) },
    data: body,
  });
  expect(res.status()).toBe(200);
});

test('bad signature, missing header, and stale timestamp are rejected', async ({ request }) => {
  const body = JSON.stringify({ id: 'evt_2', type: 'ping' });
  const ts = Math.floor(Date.now() / 1000);

  for (const headers of [
    { 'stripe-signature': sign(body, ts, 'wrong-secret') },
    {},
    { 'stripe-signature': sign(body, ts - 6 * 60 * 60, SECRET) }, // 6h old
  ]) {
    const res = await request.post('/webhooks/stripe', { headers, data: body });
    expect(res.status(), JSON.stringify(headers)).toBe(400);
  }
});
\`\`\`

Common bug this catches: verifying the signature against a re-serialized JSON object instead of the raw request bytes. Any framework that parses the body before your handler sees it (Express json middleware, Next.js API routes without raw body config) will pass happy-path manual tests and reject or, worse, mis-verify real traffic.

## Retries, Idempotency, and Ordering

Providers deliver at-least-once, with retries on non-2xx responses backed off over hours or days. Your tests should simulate the provider's behavior, which no provider dashboard lets you do precisely, so do it yourself with fixtures:

\`\`\`typescript
test('duplicate delivery causes exactly one side effect', async ({ request }) => {
  const event = signedFixture('payment_succeeded.json'); // same event id both times
  await request.post('/webhooks/stripe', event);
  await request.post('/webhooks/stripe', event);

  const credits = await db.credits.count({ where: { eventId: 'evt_fixture_1' } });
  expect(credits).toBe(1);      // idempotency key honored
});

test('out-of-order delivery does not regress state', async ({ request }) => {
  await request.post('/webhooks/stripe', signedFixture('subscription_updated.json')); // newer
  await request.post('/webhooks/stripe', signedFixture('subscription_created.json')); // older
  const sub = await db.subscriptions.find('sub_1');
  expect(sub.status).toBe('active_updated'); // newer state wins
});
\`\`\`

Design note your tests will enforce: handlers should be thin (verify, persist raw event, 200 fast) with processing done async. That single pattern makes the timeout, retry, and ordering rows of the table above much easier to pass, and it is the pattern Stripe and GitHub both document as intended usage.

## Testing the Sending Side Too

If your product EMITS webhooks, you own the mirror-image obligations: deliveries signed correctly, retries with backoff on consumer failure, no duplicates from your retry logic, and a dead-letter path. In CI, stand up a disposable consumer (a few lines of Express, or a mock server) that scripts failure behavior: refuse twice then accept, respond slowly, return 200 with a delay just under your timeout. Contract tests between emitter and consumer teams prevent the classic "we renamed a field in the payload" incident; the approach mirrors consumer-driven contracts described in our [API contract testing guide](/blog/api-contract-testing-microservices).

## CI Checklist

1. Fixture library of real captured payloads per provider, secrets scrubbed
2. Signature suite: valid, invalid, missing, stale timestamp, raw-body integrity
3. Idempotency test with literal duplicate delivery
4. Retry simulation: first response 500, second 200, side effect count = 1
5. Out-of-order pair for every state-machine entity
6. Handler latency assertion under the strictest provider timeout you integrate with
7. One end-to-end smoke against provider test mode (Stripe CLI trigger) on a schedule, not per PR

Webhooks fail quietly: no user clicks, no error toast, just a payment that never reconciled three days ago. The teams that avoid those incidents are not the ones with clever handlers; they are the ones whose test suite impersonates a rude, unreliable, occasionally malicious provider on every merge.

## Frequently Asked Questions

### How do I test webhooks locally without deploying?

Three options in increasing fidelity: a capture URL (webhook.site or a requestbin) to inspect raw provider payloads, a tunnel (ngrok, cloudflared) to route real deliveries to localhost, and provider CLIs like stripe listen that forward test-mode events and trigger any event type on demand. Use capture to learn the payload shape, then fixtures for repeatable tests.

### Why does my signature verification fail only in production?

Almost always raw-body corruption: a framework middleware parsed and re-serialized the JSON before your handler computed the HMAC, changing whitespace or key order. Verify against the raw request bytes, and add a test that posts a body with unusual spacing to catch regressions.

### How do I test webhook retries without waiting hours?

Do not wait for the provider's backoff; simulate it. Deliver the same signed fixture twice from your test suite (duplicate case), and script your handler to fail once then succeed (retry case), asserting exactly one side effect. Provider dashboards prove connectivity; only your own simulation proves idempotency.

### Should webhook handlers process events synchronously?

No. The pattern worth enforcing in tests: verify signature, persist the raw event, return 200 quickly, process asynchronously. It keeps you inside provider timeout budgets, makes retries harmless, and turns ordering problems into a queue-consumer concern you can test in isolation.
`,
};
