import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Payment Webhook Testing: Idempotency, Replay, and Out-of-Order Events',
  description:
    'Payment webhook testing proves signature checks, idempotent handlers, replay safety, and out-of-order event matrices so ledger side effects stay correct under retries.',
  date: '2026-08-28',
  category: 'API Testing',
  content: `
# Payment Webhook Testing: Idempotency, Replay, and Out-of-Order Events

Payment webhook testing is the practice of proving your ingress endpoint verifies signatures, processes each provider event id at most once, and applies ledger side effects correctly when the same payload arrives again, arrives late, or arrives in the wrong order. You do not "hit the webhook once and assert 200." You build a matrix: valid signature vs forged, first delivery vs replay, concurrent duplicates, and sequences such as \`refund.created\` before \`payment_intent.succeeded\`. If any cell in that matrix can double-charge an entitlement, invent a second invoice row, or skip a state transition the finance ledger expects, the suite is incomplete.

Providers deliver at-least-once. Your handler must behave as if every POST can be a twin of one that already succeeded. That is the whole job. The rest of this guide turns that job into concrete HTTP fixtures, SQL uniqueness checks, and Vitest cases you can run against a local app or a staging tunnel.

## The contract under test: event id, signature, and side effects

A payment webhook is three claims glued together. First, authenticity: only the provider can produce a request your verifier accepts. Second, identity: each logical event has a stable id you can store as a processed key. Third, effect: applying the event mutates domain state in a way that is safe to retry. Test those claims separately, then combine them.

| Claim | Observable | Failure mode if untested |
|---|---|---|
| Signature valid | 401/403 on forged body or wrong secret | Attacker can forge paid status |
| Event id recorded | Unique row per \`event_id\` (or equivalent) | Duplicate ledger posts on retry |
| Side effect once | Balance, entitlement, or invoice count unchanged on replay | Double credit or double revoke |
| Order tolerant | Handler accepts late/early events without illegal transitions | Stuck subscription or phantom refund |

What people get wrong is asserting only HTTP 200 on a happy-path POST. A handler that returns 200 while inserting a second payment row is worse than a handler that returns 500 and forces a provider retry. Status codes prove delivery ACK. They do not prove financial correctness.

Ready-made QA skills for webhook and API matrices install from qaskills.sh with the qaskills CLI when you want reusable agent prompts, but the assertions below stay plain TypeScript and SQL so any stack can copy them.

## Signature verification before any business logic

Never parse the body into domain objects before you verify the signature. Signature schemes differ by provider (HMAC over raw bytes, timestamp tolerance windows, multiple secrets during rotation). Your tests must feed the exact raw body bytes the verifier hashes, not a re-serialized JSON object. Re-serializing changes key order and whitespace and breaks verification in production while making tests falsely green if you sign the parsed object instead of the wire body.

\`\`\`ts
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "vitest";

const SECRET = "whsec_test_shared_secret";

function sign(rawBody: string, secret: string, ts: number): string {
  const payload = \`\${ts}.\${rawBody}\`;
  const digest = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return \`t=\${ts},v1=\${digest}\`;
}

async function postWebhook(rawBody: string, signatureHeader: string) {
  const res = await fetch("http://127.0.0.1:4010/webhooks/payments", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": signatureHeader,
    },
    body: rawBody,
  });
  return res;
}

describe("payment webhook signature gate", () => {
  it("rejects forged signatures with 401 and no side effects", async () => {
    const raw = JSON.stringify({
      id: "evt_forged_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_1", amount: 2500, currency: "usd" } },
    });
    const ts = Math.floor(Date.now() / 1000);
    const bad = sign(raw, "wrong_secret", ts);
    const res = await postWebhook(raw, bad);
    assert.equal(res.status, 401);
  });

  it("accepts a correctly signed raw body", async () => {
    const raw = JSON.stringify({
      id: "evt_ok_1",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_2", amount: 2500, currency: "usd" } },
    });
    const ts = Math.floor(Date.now() / 1000);
    const good = sign(raw, SECRET, ts);
    const res = await postWebhook(raw, good);
    assert.equal(res.status, 200);
  });
});
\`\`\`

Add a timestamp skew case. If your verifier rejects signatures older than five minutes (illustrative window), post a valid HMAC with \`ts\` set to now minus 20 minutes and expect rejection. That closes the trivial replay-of-an-old-captured-request path that signature-only checks miss when the timestamp is ignored.

For delivery semantics beyond the payment-specific matrix (retries, ACK timing, ordering guarantees at the transport layer), pair this suite with [/blog/webhook-testing-delivery-ordering-guarantees](/blog/webhook-testing-delivery-ordering-guarantees). Keep payment tests focused on ledger and entitlement invariants; keep delivery tests focused on whether the provider or your queue ever drops or reorders envelopes.

## Idempotency: store the event id, then apply effects

Idempotency for payment webhooks means: given the same provider event id, the handler's observable side effects happen once. The usual implementation is a processed-events table with a unique constraint on \`event_id\`, inserted in the same database transaction as the ledger write. If the insert conflicts, you ACK success without applying the effect again.

| Strategy | Strength | Weakness to test |
|---|---|---|
| Unique \`event_id\` + same TX as ledger | Strong under concurrency | Partial commits if effect is outside the TX |
| Redis \`SET key NX EX\` then effect | Fast | Effect can run twice if Redis key expires before durable write |
| Application check-then-act without lock | Easy to write | Loses under concurrent duplicate POSTs |
| Provider idempotency key only on outbound charges | Wrong layer | Does not protect inbound webhook handlers |

Prefer the unique constraint in the same transaction as the money move. Application-level "select then insert" is a race: two workers both see "not processed," both credit the wallet. Your suite must include a concurrent duplicate delivery case, not only a sequential replay.

\`\`\`sql
CREATE TABLE processed_webhook_events (
  event_id    text PRIMARY KEY,
  event_type  text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
  id           bigserial PRIMARY KEY,
  account_id   text NOT NULL,
  amount_cents integer NOT NULL,
  currency     text NOT NULL,
  source_event text NOT NULL REFERENCES processed_webhook_events(event_id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ledger_entries_source_event_uidx
  ON ledger_entries (source_event);
\`\`\`

The second unique index is deliberate. Even if a bug skips the processed-events insert, the ledger cannot accept two rows for one event. Defense in depth shows up in tests as "force a duplicate insert and expect a constraint violation," not as hope.

\`\`\`ts
import assert from "node:assert/strict";
import { describe, it } from "vitest";

type LedgerRow = { account_id: string; amount_cents: number; source_event: string };

const processed = new Set<string>();
const ledger: LedgerRow[] = [];

function handlePaymentSucceeded(eventId: string, accountId: string, amountCents: number) {
  if (processed.has(eventId)) {
    return { status: 200, applied: false };
  }
  processed.add(eventId);
  ledger.push({ account_id: accountId, amount_cents: amountCents, source_event: eventId });
  return { status: 200, applied: true };
}

describe("idempotent payment_intent.succeeded", () => {
  it("credits once across sequential replay", () => {
    const first = handlePaymentSucceeded("evt_pay_9", "acct_a", 5000);
    const second = handlePaymentSucceeded("evt_pay_9", "acct_a", 5000);
    assert.equal(first.applied, true);
    assert.equal(second.applied, false);
    const rows = ledger.filter((r) => r.source_event === "evt_pay_9");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amount_cents, 5000);
  });
});
\`\`\`

That in-memory sketch is for unit clarity. Integration tests should hit the real database unique constraint under parallel \`Promise.all\` posts. If both requests return 200 and only one ledger row exists, you pass. If two ledger rows exist, you fail the build even when both responses were 200.

## Replay is not the same as retry

Provider retries are expected. Replay attacks and QA replay fixtures look similar on the wire: the same signed body arrives again. The difference is intent and threat model. Your handler should treat them the same: ACK and no second effect. Your tests should still name them differently so security reviews can see the coverage.

| Scenario | Source of duplicate | Signature | Expected handler behavior |
|---|---|---|---|
| Provider retry after 500 | Provider delivery system | Valid | 200, no second ledger row |
| Provider retry after slow 200 | Timeout on provider side | Valid | 200, no second ledger row |
| QA fixture replay | Test harness | Valid (test secret) | 200, no second ledger row |
| Captured request replay days later | Attacker or misconfigured proxy | Valid if skew allows | Reject on skew, or 200 with no effect if still inside window |
| Body-tampered replay | Attacker | Invalid | 401/403, no effect |

A realistic failure story from practice: a billing service showed duplicate "Pro plan" entitlements after a Stripe-style \`invoice.paid\` storm during a regional blip. Symptom: users saw two active seats for one invoice. Wrong theory: the entitlements API was non-idempotent on PUT. Actual cause: the webhook worker wrote the entitlement in a separate service call after committing \`processed_webhook_events\`. When the entitlement call timed out, the worker returned 500. The provider retried. The second attempt saw the event as already processed and returned 200 without retrying the entitlement call, but a parallel worker from an older deploy still had the "not processed" path open for a second event id that represented the same invoice under a different event envelope. Diagnosis: they keyed idempotency on event id only, while the business invariant needed "one entitlement grant per \`invoice_id\`." Fix: add a unique constraint on \`entitlements(invoice_id)\` and make the entitlement upsert idempotent on that business key, not only on the webhook event id. Event-level idempotency is necessary. It is not always sufficient for money and access.

## Out-of-order events: build an explicit sequence matrix

Payment providers do not guarantee that \`payment_intent.succeeded\` arrives before \`charge.succeeded\`, or that refunds arrive after the success event your local projection has applied. Your projection must tolerate early refunds, late successes, and duplicates mixed in. Enumerate sequences for your domain and assert final state, not intermediate comfort.

| Sequence (illustrative) | Final invariant |
|---|---|
| succeeded -> succeeded (dup) | One paid mark, one ledger credit |
| succeeded -> refunded | Net zero (or refunded status), refund row exists |
| refunded -> succeeded | Same final state as above; no illegal "refund without payment" crash |
| failed -> succeeded | Paid wins if both refer to recoverable intent; document the rule |
| succeeded -> dispute.created | Funds held or reversed per policy; status visible |

Do not invent a universal order. Document your product rule, then freeze it in tests. Teams that "just process whatever arrives" without a state machine end up with support macros that manually fix rows after every incident.

\`\`\`ts
import assert from "node:assert/strict";
import { describe, it } from "vitest";

type Status = "none" | "paid" | "refunded" | "failed";

function reducePayment(status: Status, eventType: string): Status {
  switch (eventType) {
    case "payment_intent.succeeded":
      if (status === "refunded") return "refunded";
      return "paid";
    case "payment_intent.payment_failed":
      if (status === "paid" || status === "refunded") return status;
      return "failed";
    case "charge.refunded":
      return "refunded";
    default:
      return status;
  }
}

function applySequence(events: string[]): Status {
  return events.reduce<Status>((s, e) => reducePayment(s, e), "none");
}

describe("out-of-order payment projection", () => {
  it("ends refunded whether refund arrives before or after success", () => {
    const a = applySequence([
      "payment_intent.succeeded",
      "charge.refunded",
    ]);
    const b = applySequence([
      "charge.refunded",
      "payment_intent.succeeded",
    ]);
    assert.equal(a, "refunded");
    assert.equal(b, "refunded");
  });

  it("ignores failed after paid", () => {
    const status = applySequence([
      "payment_intent.succeeded",
      "payment_intent.payment_failed",
    ]);
    assert.equal(status, "paid");
  });
});
\`\`\`

Wire the same sequences through HTTP. Sign each body, POST in the chosen order, then query the account projection. Unit reducers catch logic bugs early. HTTP sequences catch transaction and locking bugs the reducer never sees.

## Concurrent duplicate delivery: the race you must schedule

Sequential replay tests miss the dangerous case. Two POSTs with the same \`event_id\` arrive while both workers are between "check processed" and "insert processed." Use a barrier in the test process or simply fire parallel requests and assert the unique constraint outcome.

\`\`\`ts
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "vitest";

const SECRET = "whsec_test_shared_secret";
const BASE = process.env.PAYMENT_WEBHOOK_BASE_URL ?? "http://127.0.0.1:4010";

function sign(rawBody: string, ts: number): string {
  const payload = \`\${ts}.\${rawBody}\`;
  const digest = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return \`t=\${ts},v1=\${digest}\`;
}

async function postOnce(raw: string) {
  const ts = Math.floor(Date.now() / 1000);
  return fetch(\`\${BASE}/webhooks/payments\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": sign(raw, ts),
    },
    body: raw,
  });
}

describe("concurrent duplicate payment webhook", () => {
  it("allows only one ledger credit for one event id", async () => {
    const eventId = \`evt_race_\${crypto.randomBytes(6).toString("hex")}\`;
    const raw = JSON.stringify({
      id: eventId,
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_race", amount: 1200, currency: "usd", metadata: { account_id: "acct_race" } } },
    });

    const results = await Promise.all([postOnce(raw), postOnce(raw), postOnce(raw)]);
    for (const res of results) {
      assert.ok(res.status === 200 || res.status === 409);
    }

    const q = await fetch(\`\${BASE}/test/ledger?source_event=\${encodeURIComponent(eventId)}\`);
    assert.equal(q.status, 200);
    const body = (await q.json()) as { count: number };
    assert.equal(body.count, 1);
  });
});
\`\`\`

Expose a test-only ledger query endpoint in non-production builds, or query the database from the test harness with a restricted connection string. Do not scrape an admin UI for financial invariants. UI lag creates false failures and false confidence.

Filter Vitest cases with \`-t\` / \`--testNamePattern\` when you want only the race suite in a soak job, for example \`vitest run -t "concurrent duplicate"\`. Do not confuse that with Playwright's \`--grep\` / \`-g\`, which filters browser tests, not Vitest names.

## Side effects beyond the ledger: email, tax, and audit

A successful payment webhook often fans out: ledger credit, entitlement grant, tax export row, receipt email, and an audit event. Idempotency must cover each fan-out or you will send three receipts for one charge after retries. Prefer outbox patterns: the webhook transaction writes \`processed_webhook_events\`, \`ledger_entries\`, and \`outbox_messages\` together. Workers send email from the outbox with their own delivery keys.

When those audit rows claim immutability and strict ordering for finance review, verify them with the same discipline as security audit trails: see [/blog/audit-log-testing-immutability-ordering](/blog/audit-log-testing-immutability-ordering). In the payment suite, assert that one \`payment.captured\` audit row exists per \`event_id\` and that a replay does not append a second capture row. Leave append-only trigger tests in the audit article; reference them rather than duplicating the SQL privilege matrix here.

\`\`\`ts
import assert from "node:assert/strict";
import { describe, it } from "vitest";

type Outbox = { id: string; kind: string; dedupe_key: string; body: string };

const outbox: Outbox[] = [];

function enqueueReceipt(invoiceId: string, email: string) {
  const dedupe_key = \`receipt:\${invoiceId}\`;
  if (outbox.some((m) => m.dedupe_key === dedupe_key)) return;
  outbox.push({
    id: \`obx_\${outbox.length + 1}\`,
    kind: "receipt_email",
    dedupe_key,
    body: JSON.stringify({ invoiceId, email }),
  });
}

describe("receipt outbox dedupe", () => {
  it("enqueues a single receipt for one invoice across webhook replays", () => {
    enqueueReceipt("in_100", "buyer@example.com");
    enqueueReceipt("in_100", "buyer@example.com");
    enqueueReceipt("in_100", "buyer@example.com");
    assert.equal(outbox.filter((m) => m.kind === "receipt_email").length, 1);
  });
});
\`\`\`

## CI shape: fixture bodies, secrets, and artifact trails

Keep signed fixture files in the repo for stable event shapes, and generate signatures at test time with a test secret injected via CI variables. Never commit production webhook secrets. In GitHub Actions, check out with \`actions/checkout@v4\`, set up Node with \`actions/setup-node@v4\`, and upload failure dumps with \`actions/upload-artifact@v4\`.

\`\`\`yaml
name: payment-webhook-tests
on:
  pull_request:
  push:
    branches: [main]

jobs:
  webhook:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: payments_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      PAYMENT_WEBHOOK_BASE_URL: http://127.0.0.1:4010
      WEBHOOK_TEST_SECRET: whsec_ci_only_not_prod
      DATABASE_URL: postgres://postgres:postgres@127.0.0.1:5432/payments_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm run db:migrate:test
      - run: npm run start:webhook:test &
      - run: npx vitest run src/webhooks/payment*.test.ts
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: webhook-test-logs
          path: .tmp/webhook-logs/
\`\`\`

Persist the raw request body, computed signature, response status, and ledger row count on failure. Finance bugs are painful to reproduce from "expected 1, received 2" alone. You want the event id and the parallel request timing.

## Provider-shaped fixtures without hard-coding a single vendor forever

Your production stack may speak Stripe, Adyen, Braintree, or a PSP wrapper. The test ideas stay the same: signed raw body, stable event id, business key uniqueness, order matrix. Prefer adapter interfaces in application code so the suite can swap fixture builders.

\`\`\`ts
export type PaymentWebhookEvent = {
  eventId: string;
  type: string;
  paymentRef: string;
  amountCents: number;
  currency: string;
  accountId: string;
};

export function toProviderJson(event: PaymentWebhookEvent): string {
  return JSON.stringify({
    id: event.eventId,
    type: event.type,
    data: {
      object: {
        id: event.paymentRef,
        amount: event.amountCents,
        currency: event.currency,
        metadata: { account_id: event.accountId },
      },
    },
  });
}
\`\`\`

When a provider documents specific event names, use those names in fixtures and cite the official docs URL in comments or README, not as a substitute for an assertion. For Stripe's event types catalog, the official reference is https://docs.stripe.com/api/events/types. For any field you are unsure about, describe the concept (amount in minor units, currency code, event id) rather than inventing a property name.

## Mapping test depth to risk

Not every product needs the full matrix on every PR. Classify and schedule.

| Depth | Runs when | Covers |
|---|---|---|
| Signature + single happy path | Every PR | Auth gate still wired |
| Sequential replay + business-key unique | Every PR | No double credit on retry |
| Out-of-order pair matrix | Nightly | Projection rules hold |
| Concurrent duplicate storm | Nightly / pre-release | Race on processed-events |
| Full fan-out (email, tax, audit) | Pre-release | Side effects stay single-shot |

PR tests should stay fast and deterministic. Put sleep-based timing tricks in nightly jobs only, and prefer logical barriers over wall-clock waits whenever you can.

## Handler design notes that make tests honest

Return 2xx only after the durable idempotent write succeeds. Returning 200 before the commit invites provider ACK while your process crashes mid-flight, which then depends on whether your "processed" marker was written. Returning 500 on duplicate-key conflicts is usually wrong: the provider will retry forever for an event you already applied. Map unique violations to 200 (already applied) and map unknown event types to a deliberate policy (200 ignore vs 400 vs 500). Document that policy in the test names.

Validate currency and amount against the open invoice or payment intent your system already stored when the user started checkout. A webhook that blindly trusts \`amount\` from the payload without comparing to the expected checkout session is a fraud footgun. Tests should flip the amount in a signed payload (still valid signature, wrong business amount) and expect rejection or quarantine, depending on your risk rules.

Quarantine is underused. When an event fails business validation, write it to a dead-letter table with the raw body and reason, ACK or fail deliberately, and page a human. Tests should assert the dead-letter row exists and that the ledger did not move.

## Local reproduction checklist for flaky payment webhooks

When CI fails once a week on the concurrent suite, resist the urge to delete the test. Capture: event id, number of parallel requests, response status vector, ledger count, processed-events count, and database isolation level. Wrong isolation (read committed with check-then-act) reproduces as intermittent double inserts. Serializable or a proper unique constraint makes the failure mode a clean conflict instead of silent corruption.

Run the race under higher parallelism locally (illustrative: 20 parallel POSTs) before you declare a fix. Fixes that pass with two workers and fail with twenty are still broken.

## Frequently Asked Questions

### Why is HTTP 200 not enough to pass payment webhook testing?

Because providers retry on timeouts and 5xx responses, a handler can ACK successfully while still applying money effects twice, or ACK a duplicate while skipping a failed fan-out. Payment webhook testing has to assert durable invariants: one ledger row per event id, one entitlement per invoice, one receipt outbox message per business key. Status codes only prove that the provider should stop retrying. They do not prove that your books balance. Tie every green status assertion to a state query.

### How do I test out-of-order refunds without a real payment provider?

Build signed fixture bodies for success and refund events that share the same payment reference, then POST them in both orders against a local server with a test webhook secret. Assert the same final projection either way. Use your provider's documented event type strings when you know them, and keep amounts, currencies, and ids explicit in the fixture. A reducer unit test can lock the state machine first; HTTP sequencing then proves transactions and storage behave under that machine.

### Should idempotency keys be the webhook event id or the invoice id?

Both, at different layers. The webhook event id stops duplicate processing of the exact same provider envelope. The invoice id (or payment intent id) stops duplicate business effects when the provider emits multiple event types or replacements for one economic fact. Incident patterns show that event-only keys miss "two different event ids, one invoice" storms. Put unique constraints on both the processed-events table and the business ledger or entitlement table.

### How do payment webhook tests differ from general webhook delivery tests?

Delivery tests ask whether envelopes arrive, retry, and ACK under transport rules. Payment webhook tests ask whether money, access, and receipts stay correct when those envelopes duplicate or reorder. You need both. Share signing helpers and fixture loaders, but keep assertions in separate suites so a finance regression does not hide inside a retry-policy failure, and so delivery changes do not require rewriting ledger expectations.
`,
};
