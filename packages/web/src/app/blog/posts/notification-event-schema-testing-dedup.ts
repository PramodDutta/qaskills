import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Notification Systems: Event Schema, Dedup Keys, and Delivery States',
  description: 'Notification system testing verifies event schema contracts, dedup keys, and delivery states so pipelines avoid silent drops and duplicate spam.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Notification Systems: Event Schema, Dedup Keys, and Delivery States

Notification system testing verifies event schema contracts, deduplication keys, and delivery state machines (queued, sent, delivered, failed, suppressed) so users get exactly-once-ish behavior without silent drops or duplicate spam. You assert that every outbound email, push, SMS, or in-app message starts from a valid event payload, collapses retries under a stable dedup key, and moves only through legal delivery transitions. If schema checks are missing, workers accept garbage and drop it later. If dedup is missing, retries become inbox spam. If state transitions are untested, dashboards lie about what users actually received.

QA engineers and coding agents share the same trap: they test the happy path send call and call the pipeline "covered." Real notification system testing goes deeper. It treats the outbox, preference store, provider stub, and clock as first-class fixtures. The sections below turn those fixtures into assertions you can run in CI.

## Event Schema Contracts for Notification Payloads

Every notification starts as an event. The event is not the rendered email body. It is the contract between producers (billing, auth, social) and the notification worker. Notification system testing begins by rejecting payloads that violate that contract before any provider call happens.

Use a schema the worker actually loads in production. Zod, JSON Schema, or a protobuf decoder all work if the same artifact gates both runtime and tests. Do not maintain a looser "test-only" shape. That gap is where silent drops hide: production rejects a field type, tests never saw that rejection, and the product team files a ticket for "missing notifications."

A practical TypeScript shape looks like this. Keep fields boring and explicit. Channel lists, template ids, and entity references must be constrained, not free-form strings everywhere.

\`\`\`ts
import { z } from 'zod';

const NotificationEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum([
    'order.shipped',
    'invoice.ready',
    'password.reset_requested',
    'comment.mentioned',
  ]),
  occurredAt: z.string().datetime({ offset: true }),
  recipient: z.object({
    userId: z.string().min(1),
    email: z.string().email().optional(),
    phoneE164: z.string().regex(/^\\+[1-9]\\d{7,14}$/).optional(),
    pushTokens: z.array(z.string().min(8)).max(20).optional(),
  }),
  entity: z.object({
    kind: z.enum(['order', 'invoice', 'user', 'comment']),
    id: z.string().min(1),
  }),
  templateId: z.string().regex(/^[a-z0-9._-]{3,64}$/),
  channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])).min(1),
  locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/),
  data: z.record(z.string(), z.unknown()),
  dedupKey: z.string().min(8).max(200).optional(),
});

export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

export function parseNotificationEvent(input: unknown): NotificationEvent {
  return NotificationEventSchema.parse(input);
}
\`\`\`

If you prefer JSON Schema for cross-language producers, pin a draft and assert the same fixtures in both languages. A compact excerpt for the template id and a four-digit campaign code field might look like this in a shared schema file:

\`\`\`ts
const templateIdSchemaFragment = {
  type: 'object',
  required: ['templateId', 'campaignCode'],
  properties: {
    templateId: {
      type: 'string',
      pattern: '^[a-z0-9._-]{3,64}$',
    },
    campaignCode: {
      type: 'string',
      pattern: '^\\\\d{4}$',
    },
  },
  additionalProperties: false,
} as const;
\`\`\`

Test matrix for schema contracts should include valid baselines plus mutations that must fail. Mutation testing beats hand-written "invalid example" lists because agents and humans both forget edge cases.

| Mutation | Expected result | Why it matters |
|---|---|---|
| Drop \`eventId\` | parse throws / 400 at ingest | Without identity you cannot dedup or audit |
| \`channels: []\` | rejected | Empty fanout looks like success with zero sends |
| \`occurredAt\` without timezone | rejected | Clock skew math becomes meaningless |
| Unknown \`type\` string | rejected | Workers should not invent templates for typos |
| \`phoneE164\` missing \`+\` | rejected | SMS providers fail late and obscurely |
| Extra required locale missing | rejected | Renderers fall back silently to wrong language |

What people get wrong here is validating only the HTTP request body at the public API and trusting internal queue messages forever. After one schema migration, old messages still sit in the queue. Notification system testing must include a consumer test that replays a fixture from the previous schema version and asserts either successful migration or an explicit dead-letter with a reason code. Silent skip of "unrecognized" messages is a product bug wearing an ops costume.

Assert schema failures as first-class outcomes, not as log lines. A test that only checks \`expect(logs).toContain('invalid')\` will rot. Prefer:

\`\`\`ts
import assert from 'node:assert/strict';

test('rejects notification event missing entity.id', () => {
  const bad = {
    eventId: '11111111-1111-4111-8111-111111111111',
    type: 'order.shipped',
    occurredAt: '2026-08-27T12:00:00.000Z',
    recipient: { userId: 'user_1', email: 'a@example.com' },
    entity: { kind: 'order' },
    templateId: 'order.shipped.v1',
    channels: ['email'],
    locale: 'en',
    data: { trackingNumber: '1Z999' },
  };

  assert.throws(
    () => parseNotificationEvent(bad),
    (err: unknown) =>
      err instanceof Error && /entity\\.id|Required/i.test(String(err)),
  );
});
\`\`\`

Contract tests also belong at the producer boundary. Billing should not emit \`invoice.ready\` without \`data.amountMinor\` if the template requires it. Put a shared package of event factories in the monorepo so producers and the notification service compile against the same types. When an AI coding agent adds a new template, the failing typecheck is cheaper than a production duplicate blast.

## Dedup Keys: Idempotency Fingerprints That Survive Retries

Deduplication is the difference between "at least once delivery into the worker" and "at most one notification the user cares about." Queues retry. Providers time out after they already accepted the message. Humans click "resend" in admin tools. Without a dedup key, each of those paths is a new email.

A good dedup key is a fingerprint of recipient + template + entity (+ optional channel). It must be stable across retries and unstable across genuinely new business events. \`eventId\` alone is a weak dedup key for user-facing uniqueness because a producer bug that double-emits two different event ids for the same shipment still spams the customer.

Prefer an explicit key from the producer when the business knows the uniqueness rule, and fall back to a deterministic hash in the worker when producers omit it.

\`\`\`ts
import { createHash } from 'node:crypto';
import type { NotificationEvent } from './schema';

export function notificationDedupKey(event: NotificationEvent): string {
  if (event.dedupKey) {
    return event.dedupKey;
  }

  const basis = [
    event.recipient.userId,
    event.templateId,
    event.entity.kind,
    event.entity.id,
    event.channels.slice().sort().join('+'),
  ].join('|');

  return createHash('sha256').update(basis).digest('hex');
}
\`\`\`

Persist that key with a uniqueness constraint before the provider call, not after. The classic race is two workers claiming the same event, both seeing "not sent yet," both calling the provider, then both trying to insert. The database unique index is the serialization point.

\`\`\`sql
CREATE TABLE notification_outbox (
  id              bigserial PRIMARY KEY,
  dedup_key       text NOT NULL,
  event_id        uuid NOT NULL,
  user_id         text NOT NULL,
  template_id     text NOT NULL,
  channel         text NOT NULL,
  state           text NOT NULL,
  provider_ref    text,
  scheduled_for   timestamptz NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_outbox_dedup_unique UNIQUE (dedup_key, channel)
);

CREATE UNIQUE INDEX notification_outbox_event_channel_uidx
  ON notification_outbox (event_id, channel);
\`\`\`

Notification system testing for dedup needs three scenarios at minimum:

1. Same event delivered twice to the worker -> one outbox row per channel, one provider call.
2. Two different \`eventId\` values with the same business fingerprint -> still one user-visible send when policy says so.
3. Same entity but different template (for example shipping vs delivery) -> two sends.

| Scenario | Input | Expected outbox | Expected provider calls |
|---|---|---|---|
| Queue redelivery | identical payload twice | 1 row | 1 |
| Double produce | two eventIds, same user/template/entity | 1 row if fingerprint dedup on | 1 |
| Legitimate follow-up | same order, new template | 2 rows | 2 |
| Channel split | email+push, retry once | 2 rows | 1 per channel |
| Admin resend with new key | explicit new dedupKey | 2 rows | 2 |

A realistic failure story from a SaaS billing team: invoice finalization published \`invoice.ready\` through an at-least-once bus. The worker had idempotency on \`eventId\` only. During a broker outage replay, the producer regenerated event ids while keeping the same invoice id. Customers received three identical PDF-ready emails within twelve minutes. Support volume spiked; finance asked why "the system" looked unreliable. The fix was a unique index on \`(user_id, template_id, entity_id, channel)\` and a worker that treats unique-violation as success with the existing row, not as an error to retry into a new send. The missing test was a second publish with a fresh \`eventId\` and identical business fields.

When you write the assertion, stub the provider and count calls. Do not assert only on final state in the database if the bug is "two HTTP posts before the unique insert."

\`\`\`ts
test('retry with new eventId still sends once for same fingerprint', async () => {
  const provider = { sendEmail: mockSendEmail() };
  const worker = createNotificationWorker({ provider, db });

  const base = makeInvoiceReadyEvent({
    eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    userId: 'user_9',
    invoiceId: 'inv_42',
  });

  await worker.handle(base);
  await worker.handle({
    ...base,
    eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });

  assert.equal(provider.sendEmail.callCount, 1);
  const rows = await db.outbox.findByUser('user_9');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].state, 'sent');
});
\`\`\`

Document when dedup must not collapse sends. Password reset and magic-link style flows often require a new token each request even for the same user. That is a different fingerprint: include a request id or token id in the key, and test that two reset requests produce two messages. Cross-link that class of email carefully with auth tests; see the section on webhooks and magic links below.

## Delivery State Transitions and Illegal Transitions

Delivery is a state machine, not a boolean \`sent\` flag. Notification system testing should encode legal transitions and forbid the rest. A minimal production-grade set is: \`queued\` -> \`sending\` -> \`sent\` -> \`delivered\` | \`failed\`, with \`suppressed\` reachable from \`queued\` (and sometimes from \`sending\` if preferences change mid-flight), and \`failed\` allowed to move to \`queued\` only through an explicit retry path that rotates a retry count.

Illegal examples that must fail tests:

- \`delivered\` -> \`queued\` (rewriting history)
- \`suppressed\` -> \`delivered\` without a new outbox row
- \`failed\` -> \`delivered\` without a provider callback
- any state -> \`sent\` while \`provider_ref\` is null for channels that require one

\`\`\`ts
type DeliveryState =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'suppressed';

const ALLOWED: Record<DeliveryState, readonly DeliveryState[]> = {
  queued: ['sending', 'suppressed', 'failed'],
  sending: ['sent', 'failed', 'suppressed'],
  sent: ['delivered', 'failed'],
  delivered: [],
  failed: ['queued'],
  suppressed: [],
};

export function assertTransition(
  from: DeliveryState,
  to: DeliveryState,
): void {
  if (!ALLOWED[from].includes(to)) {
    throw new Error(\`illegal transition \${from} -> \${to}\`);
  }
}
\`\`\`

Keep transition checks in one function used by both the worker and the tests so the table cannot drift.

State tests belong in three layers:

1. Unit: \`assertTransition\` matrix for every pair.
2. Worker integration: simulate provider success, timeout, and 429; assert resulting states.
3. Webhook/callback integration: provider "delivered" and "bounced" callbacks only move rows that are already \`sent\`.

| From | To | Legal? | Test idea |
|---|---|---|---|
| queued | sending | yes | claim lease on outbox row |
| sending | sent | yes | provider accepts, store provider_ref |
| sent | delivered | yes | provider callback |
| queued | suppressed | yes | preference deny before send |
| delivered | failed | no | must throw |
| suppressed | sent | no | must throw |
| failed | queued | yes | retry job with backoff |
| sent | queued | no | must throw |

Provider callbacks arriving twice should be idempotent. A second \`delivered\` callback for the same \`provider_ref\` must not error the webhook handler and must not append duplicate timeline events. That overlaps with webhook delivery testing; keep the notification row transition idempotent even if the webhook ingress retries.

Also test lease timeouts. If \`sending\` sticks because the process died after the provider accepted the message, a naive reclaimer that resets to \`queued\` will double-send. The safer reclaim path checks provider_ref occupancy or uses the dedup key as the provider idempotency key. Your tests should force a crash between "HTTP 200 from provider" and "commit state=sent" and prove the reclaim path does not call send again.

## Provider Stubbing vs Sandbox APIs

Notification system testing needs a clear split between stubs and vendor sandboxes. Stubs give deterministic CI. Sandboxes give confidence that request shapes still match a real vendor. Using only one of them leaves a blind spot.

Stubs (recommended default in unit and most integration tests):

- In-memory or fetch-mock endpoints that record method, URL, headers, and body.
- Controllable latency, status codes, and partial failures.
- No network, no API keys in CI, no flaky vendor outages.

Sandboxes (scheduled or smoke jobs):

- Real vendor test mode with disposable inboxes or vendor-provided message inspection APIs.
- Validates authentication, payload size limits, and template remote ids.
- Runs less often because of rate limits and cost.

Do not invent SDK method names in tests. Prefer wrapping your own port:

\`\`\`ts
export interface EmailProvider {
  send(input: {
    to: string;
    subject: string;
    html: string;
    idempotencyKey: string;
  }): Promise<{ providerRef: string }>;
}

export function createFetchEmailProvider(baseUrl: string, apiKey: string): EmailProvider {
  return {
    async send(input) {
      const res = await fetch(\`\${baseUrl}/v1/messages\`, {
        method: 'POST',
        headers: {
          authorization: \`Bearer \${apiKey}\`,
          'content-type': 'application/json',
          'idempotency-key': input.idempotencyKey,
        },
        body: JSON.stringify({
          to: input.to,
          subject: input.subject,
          html: input.html,
        }),
      });
      if (!res.ok) {
        throw new Error(\`email provider HTTP \${res.status}\`);
      }
      const body = (await res.json()) as { id: string };
      return { providerRef: body.id };
    },
  };
}
\`\`\`

In CI, inject a stub:

\`\`\`ts
function createRecordingEmailProvider(): EmailProvider & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    async send(input) {
      calls.push(input);
      return { providerRef: \`stub_\${calls.length}\` };
    },
  };
}
\`\`\`

Test both the adapter and the worker. Adapter tests assert header and body mapping with a local HTTP server or a fetch stub. Worker tests assert that the adapter is called once per dedup key and that failures map to \`failed\` with retry metadata. Sandbox tests, when you add them, should assert only coarse properties: message accepted, inspectable recipient matches, remote id stored. Keep sandbox credentials out of developer laptops when possible; use CI secrets and a quarantined project.

A common mistake is stubbing so shallowly that the worker never builds the real MIME or push payload. Then production fails on a 100KB attachment limit or a missing push title. Make the stub assert required fields exist even if it does not speak to a vendor.

Ready-made prompts for API and outbox style checks can be installed from qaskills.sh with the qaskills CLI when your agents need a repeatable checklist, but the assertions above remain stack-agnostic.

## Preference, Unsubscribe, and Suppression Testing

Suppression is a successful outcome, not a skipped test. If a user unsubscribed from marketing, the outbox row should land in \`suppressed\` with a reason, and the provider must not be called. Notification system testing that only checks "email was sent" will force agents to "fix" quiet users by ignoring preferences.

Categories to model explicitly:

- Transactional vs promotional (legal and product rules differ).
- Channel-level opt-out (SMS vs email).
- Global unsubscribe vs product-line unsubscribe.
- Hard bounces and complaint loops from providers.
- Temporary suppressions (rate limits per user, quiet hours).

\`\`\`ts
test('marketing email is suppressed after unsubscribe without provider call', async () => {
  await prefs.unsubscribe({
    userId: 'user_3',
    topic: 'marketing.product_updates',
    channel: 'email',
  });

  const provider = createRecordingEmailProvider();
  const worker = createNotificationWorker({ provider, db, prefs });

  await worker.handle(
    makeEvent({
      type: 'comment.mentioned',
      templateId: 'marketing.product_updates.v2',
      userId: 'user_3',
      channels: ['email'],
      data: { topic: 'marketing.product_updates' },
    }),
  );

  assert.equal(provider.calls.length, 0);
  const row = await db.outbox.latestForUser('user_3');
  assert.equal(row.state, 'suppressed');
  assert.equal(row.suppressedReason, 'user_unsubscribed');
});
\`\`\`

Also test that transactional templates still send after a marketing unsubscribe. Mix-ups here cause either compliance incidents or "I never got my password reset" tickets. Put the classification on the template record in the database, not in tribal knowledge.

List-unsubscribe headers and one-click unsubscribe POST endpoints deserve their own HTTP tests: token validity, auth, idempotent repeat clicks, and the preference row that workers read. If the worker caches preferences, flush or version that cache in tests so an unsubscribe is visible immediately.

| Case | Preference state | Template class | Expected |
|---|---|---|---|
| Happy marketing | opted in | promotional | sent |
| Unsubscribed | opted out | promotional | suppressed, 0 provider calls |
| Unsubscribed | opted out | transactional | sent |
| Hard bounce | bounce suppression | any email | suppressed |
| Quiet hours | local time in quiet window | promotional | queued until window ends |
| Quiet hours | local time in quiet window | security alert | sent immediately |

Quiet hours intersect clock control. Treat them as scheduled sends, not as dropped events.

## Clock Skew and Delayed Sends

Notification pipelines depend on time: delayed digests, reminder offsets, quiet hours, retry backoff, and \`occurredAt\` freshness checks. Notification system testing without a fake clock will flake or miss bugs.

Inject a clock:

\`\`\`ts
export interface Clock {
  now(): Date;
}

export function createFakeClock(startIso: string): Clock & { advanceMs(ms: number): void } {
  let current = new Date(startIso).getTime();
  return {
    now: () => new Date(current),
    advanceMs: (ms) => {
      current += ms;
    },
  };
}
\`\`\`

Scenarios worth automating:

1. Reminder scheduled for T+24h does not send at T+23h59m, does send after advance past T+24h.
2. Event with \`occurredAt\` older than a freshness window is dead-lettered or suppressed with \`stale_event\`, depending on product policy.
3. Retry backoff: attempt 1 immediate, attempt 2 after 30s, attempt 3 after 5m; assert no provider call while clock is inside the wait.
4. Quiet hours across a timezone boundary for a user in \`America/Los_Angeles\` while the worker runs in UTC.
5. Provider callback timestamp skew: callback \`delivered_at\` slightly before \`sent_at\` still accepts delivery if within a small skew tolerance, or records anomaly without illegal transition.

Delayed digests also need batching tests. If five comment events arrive during the window, the user gets one digest with five items, not five digests. Dedup keys for digests usually include the window id (\`user|template|yyyy-mm-dd-hh\`) rather than each comment id. Assert item aggregation separately from send-once behavior.

Clock skew between app servers and the database can reorder \`updated_at\` used for lease reclaim. Prefer monotonic lease tokens or database \`now()\` for reclaim queries. Tests that set application clock and database clock independently catch this class of bug; containers that share one frozen time source can hide it.

## Multi-Channel Fanout Consistency

Fanout means one event becomes N channel-specific outbox rows. Consistency does not mean all channels succeed or fail together in the physical world. It means the worker's bookkeeping is coherent: each requested channel has a row, preferences can suppress a subset, and partial provider failure does not erase successes.

Example: \`channels: ['email', 'push']\`. Email succeeds, push provider returns 503. Expected: email row \`sent\`, push row \`failed\` (retryable), event processing overall marked with partial success rather than rolled back email. Users should not lose the email because push is down.

\`\`\`ts
test('partial fanout success keeps email sent when push fails', async () => {
  const email = createRecordingEmailProvider();
  const push = {
    async send() {
      throw Object.assign(new Error('push unavailable'), { retryable: true });
    },
  };
  const worker = createNotificationWorker({ email, push, db });

  await worker.handle(
    makeEvent({
      channels: ['email', 'push'],
      templateId: 'order.shipped.v1',
      userId: 'user_7',
      entity: { kind: 'order', id: 'ord_55' },
    }),
  );

  const rows = await db.outbox.findByEntity('order', 'ord_55');
  assert.equal(rows.find((r) => r.channel === 'email')?.state, 'sent');
  assert.equal(rows.find((r) => r.channel === 'push')?.state, 'failed');
  assert.equal(email.calls.length, 1);
});
\`\`\`

Consistency checks for multi-channel notification system testing:

- Requested channels minus preference suppressions equals outbox rows created.
- Dedup is per \`(dedup_key, channel)\`, not a single global row that blocks other channels.
- In-app notification can succeed offline while SMS fails; UI badges still update.
- Rendering uses the same \`data\` payload across channels but different templates; a missing push title fails push only.

| Channel set | Preference | Provider results | Expected rows |
|---|---|---|---|
| email, push | both allowed | both ok | sent, sent |
| email, push | push denied | email ok | sent, suppressed |
| email, sms | both allowed | email ok, sms 503 | sent, failed |
| in_app only | allowed | ok | delivered (or sent) |
| email, email (dupe list) | allowed | ok | one email row |

Normalize channel lists in the schema (\`z.array(...).nonempty()\` plus a refine that unique-sorts) so producers cannot request duplicate channels and bypass unique indexes accidentally.

## Relating Notification Tests to Webhooks and Magic-Link Email

Notification pipelines sit next to two other sharp edges: inbound provider webhooks and auth email flows. Keep the suites related without merging them into one blob.

Provider webhooks report delivery, open, bounce, and complaint. Ordering and at-least-once delivery of those webhooks matter when you update outbox state. If a \`bounce\` arrives before your worker committed \`sent\`, a naive handler creates an illegal transition or orphan record. Build on the same discipline as webhook ingress tests for ordering and retries: see [/blog/webhook-testing-delivery-ordering-guarantees](/blog/webhook-testing-delivery-ordering-guarantees) for delivery ordering guarantees, duplicate webhook posts, and out-of-order callbacks. In the notification suite, reuse those fixtures but assert outbox transitions and suppression side effects (complaint -> topic suppress) instead of only ingress ACK behavior.

Auth and passwordless flows stress the opposite uniqueness rule: each request should produce a fresh email with a fresh token, and the old token should invalidate. That still needs schema validation, provider stubbing, and state tracking, but dedup must include the login request id. For end-to-end assertions around link issuance, expiry, and reuse, pair this work with [/blog/testing-passwordless-email-magic-link-flow](/blog/testing-passwordless-email-magic-link-flow). Notification system testing owns "exactly one email per request id, template valid, suppressed when the user blocks security mail" while the magic-link article owns "token redeemed once, expiry honored."

A joint failure mode appears when teams apply invoice-style fingerprint dedup (\`user + template\`) to password reset. The second reset within the dedup TTL never arrives. Write an explicit negative test in the auth notification path so a shared worker library cannot "optimize" those templates.

## Putting the Suite Together in CI

Organize tests so agents and humans know where to add coverage:

1. Schema package tests (pure, fast).
2. Dedup and state machine unit tests (pure).
3. Outbox worker tests with fake clock and recording providers.
4. Preference and suppression tests with a real test database.
5. Webhook callback tests feeding the same database.
6. Optional nightly sandbox smoke against one vendor.

Fail the build on illegal transitions, unique constraint absence (migration tests), and provider call count mismatches. Metrics dashboards are not a substitute for these assertions; they explain production after the spam already shipped.

Keep fixtures small and named by behavior: \`invoiceReadyDoublePublish.json\`, \`marketingUnsubscribed.json\`, \`fanoutPush503.json\`. AI coding agents copy names into new tests more safely than they invent payloads.

## Frequently Asked Questions

### How do I start notification system testing on a legacy worker without a schema?

Introduce a parse step at the worker edge that validates a minimal schema for one high-volume template first. Shadow-validate for a week if needed: log failures without blocking, capture fixtures, then enforce. Add the unique dedup index in a migration with a dry-run query for existing duplicates before enforcing. Do not rewrite the whole platform before the first failing test exists for double-send and illegal transitions.

### Should dedup keys live in the producer or the notification service?

Both. Producers should pass a business-level key when they know uniqueness (invoice id + template). The worker should compute a fallback fingerprint and enforce uniqueness in storage. Producer-only keys fail when any publisher forgets them. Worker-only keys can hide producer intent for cases that must send twice. Tests should cover explicit keys, fallback keys, and collision behavior under concurrency. Add one race test with parallel workers so the unique index, not application memory, is what serializes the first successful send.

### How many provider sandboxes do I need if I stub fetch in CI?

Keep CI on stubs for determinism, then add one sandbox smoke per channel vendor you actually ship to production. Run sandboxes on a schedule or on release candidates, not on every pull request. If a sandbox is down, quarantine that job without disabling stubbed notification system testing that guards dedup and state transitions. Contract tests against recorded HTTP transcripts can bridge the gap when sandboxes are painful.

### What is the minimum state model worth testing before adding opens and clicks?

Start with queued, sending, sent, delivered, failed, and suppressed. Prove illegal transitions throw, reclaim of sending is safe, and callbacks are idempotent. Opens and clicks are engagement analytics; they can attach as side tables later. If you add them early without hard delivery states, dashboards conflate "rendered in UI" with "provider accepted," which hides silent drops and duplicate sends. Ship the six delivery states with tests first, then layer engagement events once provider refs and dedup behavior are stable in CI.
`,
};
