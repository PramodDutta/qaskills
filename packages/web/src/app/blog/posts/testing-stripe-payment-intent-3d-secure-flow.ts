import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing a Stripe PaymentIntent 3D Secure Flow',
  description:
    'Test a Stripe PaymentIntent 3D Secure flow across challenge success, cancellation, decline, redirect return, and webhook-confirmed payment states.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing a Stripe PaymentIntent 3D Secure Flow

The first sign of trouble showed up in the payments dashboard, not the test suite. A subscription checkout had returned \`redirect_status=succeeded\` to the browser, the UI showed a success screen, and support tickets started arriving anyway: some customers were charged without ever completing their bank's verification step, others completed it and saw a stuck "processing" spinner for hours. The Playwright suite covering the 3D Secure flow was green the whole time. It asserted on the \`confirmPayment()\` promise resolving and a success toast rendering, never on the PaymentIntent's server side status, and never on the webhook Stripe sends once its own systems finish settling the charge. The gap between what the browser believes happened and what the server can prove happened is exactly where 3D Secure testing earns its keep, because a challenge modal inserts a real, asynchronous, bank owned detour into the middle of the confirmation cycle, and a test that only watches the client side promise is watching the wrong half of that detour.

## Anatomy of the 3D Secure Confirmation Cycle

A card payment that requires Strong Customer Authentication moves through a specific sequence of PaymentIntent statuses, and each one is a legitimate place for a test to assert. The server creates the PaymentIntent with \`stripe.paymentIntents.create\`, which starts in \`requires_payment_method\`. The client collects card details through Stripe Elements and calls \`stripe.confirmPayment\`, which moves the intent to \`requires_action\` when the issuing bank demands a challenge. The customer completes (or abandons) that challenge inside an iframe Stripe injects, Stripe's Payment Element then redirects the browser to the \`return_url\` you configured, and the intent settles into \`processing\`, \`succeeded\`, or back to \`requires_payment_method\` with an error attached. Nothing about this sequence is optional to test: a suite that only exercises the happy path where the bank never asks for a challenge is not testing 3D Secure at all, it is testing the frictionless fallback.

The redirect through \`return_url\` matters because it is the only way \`confirmPayment\` can hand control back to your page after a challenge that happens inside a cross origin iframe. Your test has to follow that redirect, read the \`payment_intent\` and \`redirect_status\` query parameters Stripe appends, and then treat those parameters as a hint, not a verdict.

## Provisioning PaymentIntents for Each Challenge Scenario

Stripe's sandbox ships a fixed set of card numbers that deterministically trigger a challenge, so scenario selection is a matter of picking the right test card rather than configuring anything server side.

| Test card number | Sandbox behavior | Status after the challenge is answered | Use it for |
|---|---|---|---|
| 4000002500003155 | Always requires authentication | \`requires_action\` then \`succeeded\` once "Complete authentication" is clicked | Baseline success path |
| 4000002760003184 | Requires 3DS2 authentication specifically | \`requires_action\` then \`succeeded\` once authenticated | Exercising the 3DS2 challenge UI |
| 4000008400001629 | Authenticates successfully, then the charge is declined | \`requires_action\` then \`requires_payment_method\` with a decline code | Failure-after-authentication path |
| 4000000000003220 | 3D Secure forced on every attempt | \`requires_action\` then \`succeeded\` | General regression smoke test |

Creation itself is unremarkable and should carry an idempotency key from the first request, not bolted on later:

\`\`\`typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createChargeIntent(orderId: string, amountCents: number) {
  const idempotencyKey = \`order_\${orderId}_create\`;

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { orderId },
    },
    { idempotencyKey },
  );

  return { clientSecret: paymentIntent.client_secret, id: paymentIntent.id };
}
\`\`\`

The card number never touches this endpoint. It is collected entirely inside the Stripe Elements iframe on the client and handed to \`stripe.confirmPayment\` in the browser, so the server never sees, logs, or stores raw PAN data, and neither should your test fixtures. For the broader mechanics of running Stripe's sandbox end to end in CI, see the [Stripe test mode automation guide](/blog/stripe-test-mode-automation-guide).

## Automating the Challenge Modal with Playwright

The Payment Element renders card fields inside its own iframe, and the 3D Secure challenge itself opens in a second, nested iframe once \`confirmPayment\` triggers it. Playwright's \`frameLocator\` chains through both layers cleanly, but the exact iframe titles Stripe.js assigns can shift between library versions, so confirm the selectors against your own rendered DOM with codegen before trusting them in CI.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('3DS challenge: customer completes authentication and payment succeeds', async ({ page }) => {
  await page.goto('/checkout?orderId=ord_success_1');

  const paymentElement = page.frameLocator('iframe[title="Secure payment input frame"]');
  await paymentElement.getByPlaceholder('Card number').fill('4000002500003155');
  await paymentElement.getByPlaceholder('MM / YY').fill('12/34');
  await paymentElement.getByPlaceholder('CVC').fill('123');

  await page.getByRole('button', { name: 'Pay now' }).click();

  const challengeFrame = page
    .frameLocator('iframe[name^="__privateStripeFrame"]')
    .last()
    .frameLocator('iframe[title="Stripe.js challenge frame"]');
  await challengeFrame.getByRole('button', { name: 'Complete authentication' }).click();

  await page.waitForURL(/\/checkout\/return\?.*redirect_status=succeeded/);

  await expect
    .poll(async () => (await fetch('/api/orders/ord_success_1').then((r) => r.json())).status, {
      timeout: 15000,
    })
    .toBe('paid');
});
\`\`\`

Two things in this test matter more than the selectors: the assertion never reads \`redirect_status\` as the final word, and it polls an internal endpoint rather than the Stripe API directly, because that endpoint only reports \`paid\` once the webhook handler has confirmed it.

## The Success Path: From requires_action to succeeded

With card 4000002500003155, \`confirmPayment\` returns a \`requires_action\` style redirect, the challenge iframe presents the "Complete authentication" control, and clicking it causes Stripe to settle the intent and redirect to \`return_url\` with \`redirect_status=succeeded\`. A test covering this path should assert three things in order: that the redirect actually happened with the expected query parameters, that the PaymentIntent status reported by your backend (not by re-reading \`client_secret\` from the URL) is \`succeeded\`, and that the order or subscription record your application owns was updated. Skipping the third assertion is how the original incident happened: the UI and the redirect both looked correct while the backend record lagged behind or never updated at all.

\`processing\` deserves its own assertion path even on the success case. Some payment methods and some banks settle asynchronously after authentication, so a PaymentIntent can sit in \`processing\` for a real interval before flipping to \`succeeded\`. A test that only checks for \`succeeded\` immediately after the redirect will flake against exactly the accounts most likely to reveal a real bug, so poll with a generous timeout rather than asserting once.

## The Cancellation Path: Declining the Challenge Mid-Flow

Stripe's sandbox challenge iframe exposes a second control alongside "Complete authentication": a "Fail authentication" action that simulates the customer backing out of, or being rejected by, their bank's verification step. Clicking it does not leave the intent hanging in \`requires_action\`; Stripe moves it back to \`requires_payment_method\` and fires a \`payment_intent.payment_failed\` event carrying an authentication failure error code.

\`\`\`typescript
test('3DS challenge: customer abandons authentication', async ({ page }) => {
  await page.goto('/checkout?orderId=ord_cancel_1');
  // fill the Payment Element with 4000002500003155 as above
  await page.getByRole('button', { name: 'Pay now' }).click();

  const challengeFrame = page
    .frameLocator('iframe[name^="__privateStripeFrame"]')
    .last()
    .frameLocator('iframe[title="Stripe.js challenge frame"]');
  await challengeFrame.getByRole('button', { name: 'Fail authentication' }).click();

  await expect(page.getByText(/verification/i)).toBeVisible();

  await expect
    .poll(async () => (await fetch('/api/orders/ord_cancel_1').then((r) => r.json())).status)
    .toBe('payment_failed');
});
\`\`\`

The behavior worth pinning down here is that the checkout form must stay usable afterward: \`requires_payment_method\` is not a terminal state, and the customer should be able to retry with the same or a different card without your UI treating the intent as dead. A surprising number of cancellation bugs are UI bugs, not payment bugs, where the form disables itself permanently after the first failed challenge.

## The Failure Path: Authenticated but Declined

Card 4000008400001629 is the case teams most often forget to cover, because it passes the part of the flow everyone tests (the challenge) and fails at the part almost nobody simulates (the issuer declining the now authenticated charge). From the customer's point of view this looks identical to the cancellation path up through the challenge, they complete authentication successfully, but the redirect and the eventual PaymentIntent status differ: the intent lands back in \`requires_payment_method\` with a decline code rather than an authentication failure code, and your error messaging should distinguish the two, since "your bank declined this card" and "you didn't finish verifying" call for different customer guidance.

Assert on the decline code specifically rather than just the status, since both the cancellation and failure paths converge on \`requires_payment_method\` and only the error payload tells them apart. A test suite that treats both as a single "payment did not succeed" case will pass even if your application shows the wrong message to a declined customer.

## Why the Client Status Is Not the Source of Truth

Everything the browser observes, the resolved promise, the redirect query string, even a client side \`retrievePaymentIntent\` call, is a snapshot that can be stale, spoofed by a slow network, or simply unavailable if the tab closes mid-redirect. The webhook Stripe sends to your server is signed, delivered independently of the customer's browser, and is the only signal your application should treat as authoritative for changing money-moving state like order fulfillment or subscription activation.

| Client-observed signal | What it actually guarantees | Authoritative event to wait on |
|---|---|---|
| \`confirmPayment()\` promise resolves | The confirmation request reached Stripe, nothing about final settlement | none, this is a network round trip only |
| \`redirect_status=succeeded\` on return | Stripe believed the intent succeeded at redirect time | \`payment_intent.succeeded\` |
| \`payment_intent.processing\` webhook | Settlement started but has not finished | \`payment_intent.succeeded\` or \`payment_intent.payment_failed\` |
| \`payment_intent.payment_failed\` webhook | The attempt is terminal, but the intent can be retried with a new payment method | none, this is terminal for the attempt |

\`\`\`typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawBody = await buffer(req);
  const signature = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return res.status(400).send('Webhook signature verification failed');
  }

  const already = await db.webhookEvents.findUnique({ where: { id: event.id } });
  if (already) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as Stripe.PaymentIntent;
    await db.orders.update({
      where: { id: intent.metadata.orderId },
      data: { status: intent.status === 'succeeded' ? 'paid' : 'payment_failed' },
    });
  }

  await db.webhookEvents.create({ data: { id: event.id, type: event.type } });
  res.status(200).json({ received: true });
}
\`\`\`

Your Playwright tests should treat this endpoint's downstream effect, the order record, as the thing under test, and treat the browser redirect as merely the trigger that gets you there. For the general pattern of testing signed webhook delivery in isolation from the UI, see the [webhook testing complete guide 2026](/blog/webhook-testing-complete-guide-2026).

## Idempotency Under Retry and Network Loss During Authentication

The moment most likely to produce a duplicate charge in production is a network drop that happens after the bank has authenticated the customer but before your client receives the redirect. If your checkout retries the entire flow from scratch, including a fresh \`stripe.paymentIntents.create\` call, you risk creating a second PaymentIntent for the same order. The fix is the \`idempotencyKey\` passed as the second argument to \`create\`, scoped to the order rather than to the individual attempt, so a retried creation call with the same key returns the original PaymentIntent instead of minting a new one.

Confirmation does not need a fresh idempotency key on retry in the same way creation does, because \`confirmPayment\` operates against an existing PaymentIntent by its \`client_secret\`, and re-invoking it against an intent already in \`requires_action\` or \`processing\` is safe by construction. The place to test this deliberately is the creation call: write a test that calls your order creation endpoint twice with the same \`orderId\`, and assert that exactly one PaymentIntent ID comes back both times, and that Stripe's dashboard (or a \`paymentIntents.list\` filtered by metadata in a verification step) shows a single intent rather than two.

## Handling Duplicate and Out-of-Order Webhook Delivery

Stripe does not guarantee webhook delivery order, and it does redeliver events on timeout or non-2xx responses, so a handler that assumes "the last event I received is the most recent truth" will occasionally corrupt state. The idempotency table keyed on \`event.id\` in the handler above stops literal duplicates from being processed twice, which covers redelivery after a timeout. Out-of-order delivery is a separate problem: it is possible, though uncommon, for a \`payment_intent.payment_failed\` event from an earlier retry attempt to arrive after a \`payment_intent.succeeded\` event from a later attempt on the same intent.

The safest guard is to make the update conditional on the intent's own status rather than blindly trusting event arrival order, since \`payment_intent.succeeded\` is terminal for that PaymentIntent and should never be overwritten by a later-arriving failure event tied to an earlier attempt. A regression test for this should seed the webhook endpoint with two events for the same \`orderId\` in a deliberately reversed order and assert the order record ends up matching the succeeded event, not whichever request happened to arrive last.

## Test Isolation Across Parallel 3DS Runs

Playwright workers running 3D Secure scenarios in parallel share one sandbox account, and the challenge iframe adds real wall clock time to each test, so isolation has to be enforced at the data layer rather than by serializing tests. Give every test its own \`orderId\`, and derive the idempotency key from that \`orderId\` rather than from a fixed string, so two workers creating a PaymentIntent at the same moment never collide on the same key and never see each other's cached response. Route webhook assertions through the same \`orderId\`-scoped lookup so a slow webhook delivery for one test's intent cannot be mistaken for another test's expected state. Avoid reusing the same customer or PaymentIntent ID across a success test and a failure test even when the scenarios seem unrelated, since Stripe's fraud and rate limiting heuristics in the sandbox can behave differently for an account with a mixed history of declines and successes than for a clean one.

## Frequently Asked Questions

### Why doesn't my test see the challenge iframe even though I used a 3DS-required test card?

Confirm the card number was entered before \`confirmPayment\` fired and that automatic payment methods or your Payment Element configuration did not silently fall back to a payment method type that skips 3D Secure. Also check timing: the challenge iframe often mounts a few hundred milliseconds after the button click, so a locator without an implicit wait can query before it exists.

### Should my test assert on the redirect_status query parameter?

Only as a smoke check that the redirect occurred, never as proof of payment success. Treat \`redirect_status\` as evidence the client believed the flow finished, then wait on your backend's webhook-derived state before asserting the order actually completed.

### Do I need a new idempotency key every time I call confirmPayment?

No. Idempotency keys matter for \`paymentIntents.create\`, where a retried request could otherwise mint a duplicate intent. Confirming an existing intent by its client secret operates on that intent directly and is safe to retry without a key.

### How do I test that a duplicate webhook delivery doesn't double-process an order?

Send the same signed event payload to your webhook endpoint twice in a test, either by capturing a real event and replaying it or by triggering the same PaymentIntent transition twice, then assert your side effect (marking an order paid, sending a receipt) happened exactly once, keyed on the event's own ID rather than a timestamp.

### What is the difference between testing cancellation and testing failure in a 3DS flow?

Cancellation means the customer abandons or fails the bank's authentication step itself, which Stripe reports with an authentication failure error code. Failure in this context means authentication succeeded but the issuer then declined the charge, reported with a decline code. Both land the PaymentIntent back in \`requires_payment_method\`, so your tests need to check the error code, not just the status, to tell them apart.
`,
};
