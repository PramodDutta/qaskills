import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing Stripe Subscription Proration Webhooks",
  description:
    "Test Stripe subscription proration webhooks for upgrades, downgrades, invoice timing, payment failures, duplicate delivery, and out-of-order events.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Testing Stripe Subscription Proration Webhooks

Halfway through a billing period, a customer moves from a $10 plan to a $20 plan. The arithmetic can produce a credit for unused time and a charge for remaining time, but your application does not receive one tidy “upgrade completed” event. It receives subscription and invoice events whose creation order, delivery order, payment outcome, and retry behavior must be handled independently.

The useful test is not “trigger an invoice webhook.” It creates a real sandbox subscription, fixes a proration timestamp, changes the actual subscription item, captures signed webhook deliveries, and verifies idempotent projection from object state. Synthetic Stripe CLI events are excellent for handler development, but their fake objects do not correlate into a genuine proration lifecycle.

## Understand what a prorated update creates

Stripe's default \`proration_behavior\` is \`create_prorations\`. It creates proration invoice items when applicable, but does not always invoice them immediately. \`always_invoice\` calculates prorations and immediately generates an invoice. \`none\` suppresses proration for that update.

| Update intent | \`proration_behavior\` | Expected billing effect |
|---|---|---|
| Upgrade and charge now | \`always_invoice\` | Proration items plus immediate invoice attempt |
| Change now, bill adjustment later | \`create_prorations\` | Proration items await applicable invoicing behavior |
| Switch without credit or charge | \`none\` | New price applies without generated proration |
| Preview before confirmation | No mutation, create invoice preview | Customer sees calculated adjustment |

Stripe calculates prorations when the API updates the subscription using the current period. For a stable preview-and-apply test, use the same \`proration_date\` for both. Stripe calculates to the second, so two calls made at different times can legitimately differ.

Usage-based billing is not prorated in the same way. Do not reuse a licensed recurring-price assertion for metered usage.

## Create a sandbox fixture with a fixed clock

Stripe test clocks move Billing resources through time in a sandbox. Attach the customer to a test clock, create prices and a subscription, advance to the middle of the period, then perform the change. Test clocks provide deterministic lifecycle timing without waiting weeks.

\`\`\`typescript
import Stripe from 'stripe';
import { expect, test } from 'vitest';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

test('upgrades mid-cycle and invoices the proration immediately', async () => {
  const frozenTime = Math.floor(Date.parse('2026-07-01T00:00:00Z') / 1000);
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: frozenTime,
    name: 'mid-cycle-upgrade',
  });

  const customer = await stripe.customers.create({
    test_clock: clock.id,
    name: 'Proration Test',
  });
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: { token: 'tok_visa' },
  });
  await stripe.paymentMethods.attach(paymentMethod.id, { customer: customer.id });
  await stripe.customers.update(customer.id, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.STRIPE_BASIC_PRICE_ID! }],
    expand: ['items.data'],
  });

  const middle = frozenTime + 15 * 24 * 60 * 60;
  await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: middle });
  await waitForClockReady(clock.id);

  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: process.env.STRIPE_PRO_PRICE_ID!,
      },
    ],
    proration_behavior: 'always_invoice',
    proration_date: middle,
    expand: ['latest_invoice'],
  });

  expect(updated.items.data[0].price.id).toBe(process.env.STRIPE_PRO_PRICE_ID);
  expect(updated.latest_invoice).toBeTruthy();
});
\`\`\`

Test clock advancement is asynchronous. Poll the clock until it returns to a ready status rather than sleeping. Create a unique clock and customer per scenario so events and objects can be correlated without clearing a shared account.

Use environment-provisioned recurring Price IDs or create dedicated products and prices in suite setup. Never run these tests with a live secret key. Add a guard that rejects keys not starting with the expected sandbox prefix, while remembering that key shape alone is not authorization.

## Preview and apply at the same proration second

An invoice preview lets the application show the credit and charge before mutation. The important assertion is not a hard-coded half-month amount, because month lengths, tax, discounts, currency rounding, and billing mode affect totals. Assert line semantics and reconcile the applied invoice with the preview under controlled inputs.

\`\`\`typescript
const item = subscription.items.data[0];
const prorationDate = middle;

const preview = await stripe.invoices.createPreview({
  customer: customer.id,
  subscription: subscription.id,
  subscription_details: {
    proration_date: prorationDate,
    items: [{ id: item.id, price: process.env.STRIPE_PRO_PRICE_ID! }],
  },
});

const prorationLines = preview.lines.data.filter((line) => line.proration);
expect(prorationLines.length).toBeGreaterThanOrEqual(1);

await stripe.subscriptions.update(subscription.id, {
  items: [{ id: item.id, price: process.env.STRIPE_PRO_PRICE_ID! }],
  proration_date: prorationDate,
  proration_behavior: 'always_invoice',
});
\`\`\`

SDK types and API versions evolve, so pin the Stripe API version and SDK in the test project. If your account uses flexible billing mode, verify credit calculation expectations for that mode rather than copying classic-mode examples.

## Capture real webhooks with signature verification

Run the application endpoint locally and use Stripe CLI forwarding for developer tests, or expose a controlled HTTPS endpoint in CI. Stripe CLI prints a webhook signing secret for the forwarding session. The handler must verify the raw request body with \`stripe.webhooks.constructEvent\`; parsing and reserializing JSON before verification changes the signed bytes.

\`\`\`typescript
import express from 'express';

const app = express();

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.header('stripe-signature');
  if (!signature) return res.sendStatus(400);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return res.sendStatus(400);
  }

  await eventStore.insertIfAbsent(event.id, event.type, event.created);
  await queue.publish({ stripeEventId: event.id });
  return res.sendStatus(200);
});
\`\`\`

The endpoint acknowledges only after durable acceptance. Heavy reconciliation can happen asynchronously. \`insertIfAbsent\` must enforce a unique constraint on Stripe event ID so concurrent duplicate deliveries do not enqueue duplicate work.

For a handler unit test, generate a valid signature with the Stripe SDK's test helper rather than disabling verification.

\`\`\`typescript
const payload = JSON.stringify(fixtureEvent);
const signature = stripe.webhooks.generateTestHeaderString({
  payload,
  secret: 'whsec_unit_test',
});

const response = await request(app)
  .post('/webhooks/stripe')
  .set('stripe-signature', signature)
  .set('content-type', 'application/json')
  .send(payload);

expect(response.status).toBe(200);
\`\`\`

This proves signature plumbing for a fixture, not Stripe's live lifecycle. Keep both levels.

## Assert objects, not a brittle global event order

Webhook endpoints can receive duplicate events and are not guaranteed to receive every event in creation order. Network retries, multiple endpoints, and processing queues all disturb order. Build handlers that retrieve current Stripe objects when needed and apply monotonic or idempotent state transitions.

| Event commonly relevant | Useful action | Unsafe assumption |
|---|---|---|
| \`customer.subscription.updated\` | Reconcile price, quantity, and status | The related invoice has already been processed |
| \`invoice.created\` | Record invoice identity | Payment has succeeded |
| \`invoice.finalized\` | Store finalized totals and hosted URL | Entitlement should be granted |
| \`invoice.paid\` | Confirm paid access according to policy | It always arrives after local subscription update |
| \`invoice.payment_failed\` | Start recovery communication | Subscription is already canceled |

For an immediate paid upgrade, wait until your local projection reaches a business state such as “subscription is pro and proration invoice is paid.” Do not assert a fixed array of delivery event types in one exact order. Store received event metadata for diagnosis, but make correctness depend on final reconciled state and idempotency.

## Upgrade scenario: charge and provision deliberately

With \`always_invoice\`, an upgrade can generate and attempt an invoice immediately. Test a successful card and a card that fails. Decide whether the application changes entitlement on \`customer.subscription.updated\`, only after \`invoice.paid\`, or through pending updates that apply after payment.

Provisioning immediately on subscription update can give higher access even when payment fails. Waiting only for \`invoice.paid\` can be wrong if invoices unrelated to the upgrade share the customer. Correlate invoice subscription ID, billing reason, and line item price IDs according to your integration.

Assert that a duplicate \`invoice.paid\` does not grant twice, extend twice, or emit two receipts. Send the identical signed event concurrently to the handler and verify one durable effect.

## Downgrade scenario: credit is not necessarily cash

A mid-cycle downgrade can create a negative proration. Depending on invoice and account state, that credit can reduce a later invoice rather than produce an immediate refund. Tests that expect a Refund object from every downgrade encode the wrong business model.

Create a paid subscription, advance to mid-cycle, switch to the lower price with the chosen proration behavior, and inspect proration line amounts. Verify local entitlement timing separately. Many products retain higher-tier access until period end, which is better modeled by a subscription schedule or cancel-at-period-end policy than an immediate price change.

Stripe notes a special risk when the current period's invoice is unpaid: prorations assume it will eventually be paid, so a downgrade might credit unused time the customer never paid for. If your policy disables prorations when the latest invoice is unpaid, test the branch that sends \`proration_behavior: 'none'\` and handles the old invoice to avoid double payment.

## Duplicate delivery and idempotent API updates

Webhook delivery is at-least-once. Insert the event ID under a database uniqueness constraint in the same transaction as recording work. A check followed by insert without a constraint races under concurrent delivery.

Outbound subscription updates should also use Stripe idempotency keys for safe network retries. The key identifies one intended mutation, not every upgrade the customer will ever make. Generate it from an internal operation ID and persist the association. Test two identical API attempts with one key, then a genuinely new operation with another.

Do not use event ID as the idempotency key for a user-initiated update made before that event exists. Keep command and event identities distinct.

## Test out-of-order processing intentionally

Capture genuine sandbox event fixtures from one run, redact them, then deliver them to the handler in several orders: subscription update before invoice paid, invoice paid before the local subscription projection, and duplicates interleaved. If a handler needs missing context, it should retrieve the object from Stripe or defer safely.

One good projection rule stores Stripe object's \`updated\` or a version-relevant timestamp and rejects older snapshots, but timestamps alone can tie. Retrieval of current state often simplifies reconciliation. Tests should simulate retrieval returning a newer subscription than the event payload.

The [webhook testing guide](/blog/webhook-testing-complete-guide-2026) covers delivery mechanics and replay security. The [Stripe test mode guide](/blog/stripe-test-mode-automation-guide) covers sandbox resources and payment-method scenarios.

## Keep the suite fast and clean

Separate pure proration policy tests, signed-handler tests, sandbox API tests, and a smaller end-to-end webhook suite. Run pure and handler tests on every commit. Run live sandbox scenarios where credentials and forwarding infrastructure are available.

Tag every created object with metadata containing a suite run ID. Delete clocks where supported after completion, or maintain a scheduled cleanup. Stripe objects often remain visible for audit even after deletion, so use a dedicated sandbox account when possible.

Poll by correlated customer, subscription, invoice, or event IDs. Never let “the latest invoice” in a shared account satisfy an assertion. Respect API rate limits and avoid high parallelism against one test clock.

## Quantities, discounts, and taxes change the expected lines

Changing quantity from ten seats to fifteen can prorate the delta without changing Price ID. Test quantity upgrades and downgrades separately from plan switches. Assert the subscription item ID remains the one updated; accidentally omitting it can add a second item instead of replacing the existing one.

Discounts complicate credits because the effective amount paid matters. Flexible billing mode can calculate credit prorations from the original debit. A test that multiplies catalog unit price by unused seconds can disagree with Stripe when discounts or tax are present. Prefer Stripe's preview as the billing oracle and test your presentation and reconciliation around returned line items.

Tax behavior depends on configuration, customer location, inclusive versus exclusive pricing, and invoice settings. Build a distinct tax fixture rather than adding tax expectations to the simplest upgrade test. Assert currency integer amounts, never floating-point dollars.

| Variation | Fixture control | Primary assertion |
|---|---|---|
| Seat increase | Fixed price, quantity 10 -> 15 | Proration lines reference the item and quantity change |
| Coupon on original plan | Known sandbox coupon | Applied credit follows configured billing mode |
| Exclusive tax | Fixed customer address and tax setup | Invoice total reconciles subtotal, discounts, and tax |
| Multi-currency prices | Separate customer and price per currency | No cross-currency assumption in local projection |

## Pending updates and payment failure policy

Some integrations use pending updates so a subscription change applies only when the new invoice is paid. This prevents provisioning an upgrade after failed payment. Test the successful and failed card paths and inspect both subscription state and invoice state.

If payment requires customer action, the invoice and PaymentIntent can enter intermediate states. Your webhook processor should not collapse \`invoice.payment_action_required\` into a generic permanent failure. Test the notification and entitlement policy without trying to automate a real bank challenge inside the webhook handler.

For immediate updates without pending behavior, explicitly decide rollback. Does the customer retain the old plan, receive temporary access, or enter a grace state? Encode that as a state machine and test event reordering. Webhooks report Stripe facts; they do not choose your entitlement policy.

## Retrieve event delivery history for diagnosis

When a CI scenario times out, query Stripe events filtered by relevant types and creation time, then narrow by object IDs in event data. This is diagnostic, not the primary assertion, because list ordering and account-wide traffic can be noisy.

Store the event IDs received by your endpoint along with processing status. A local timeout can then say: Stripe created event X, endpoint accepted it, worker failed reconciliation. Without these checkpoints, every failure looks like “webhook missing.”

Never automatically replay all events from a time window. Replay specific IDs after checking idempotency and object ownership. Stripe retries failed webhook delivery on its schedule, while manual resend can create concurrent duplicates.

## Signature replay and timestamp tolerance

Signature verification proves authenticity and checks timestamp tolerance, but it does not provide business idempotency. The same valid event may be delivered more than once within an acceptable window. The event ID uniqueness constraint remains necessary.

Unit-test a malformed signature, a signature for a modified body, and an old timestamp generated outside the configured tolerance. Do not loosen tolerance merely to make fixtures pass. Generate signatures at test runtime. At the HTTP layer, preserve raw bytes and reject missing signature headers before parsing.

Rotate webhook secrets with an overlap strategy supported by your deployment. A test can configure current and next secret acceptance in the application's secret provider, verify both during overlap, then verify the retired secret fails. Keep secret values out of snapshots and failure messages.

## Frequently Asked Questions

### Does \`create_prorations\` invoice the adjustment immediately?

Not always. It creates proration invoice items when applicable. Use \`always_invoice\` when the update should calculate and immediately invoice the proration.

### Why does my preview total differ from the applied invoice?

The two calls may use different seconds. Pass the same \`proration_date\` to the preview and subscription update, and control taxes, discounts, and billing mode.

### Can Stripe CLI trigger a realistic upgrade lifecycle?

CLI-triggered events are useful for handler testing, but their fake data is not correlated like an actual subscription change. Use sandbox objects for lifecycle assertions.

### Must \`customer.subscription.updated\` arrive before \`invoice.paid\`?

Do not design around webhook delivery order. Make processing idempotent and reconcile current objects so either delivery sequence converges on the same state.

### Should a downgrade proration create an immediate refund?

Not necessarily. A negative proration commonly becomes account credit applied to an invoice. Test the billing behavior your product explicitly promises.
`,
};
