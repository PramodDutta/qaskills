import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing Out-of-Order Webhook Delivery",
  description:
    "Test out-of-order webhook delivery with deterministic permutations, idempotent storage, version guards, reconciliation, and assertions on final business state.",
  date: "2026-07-13",
  category: "API Testing",
  content: `
# Testing Out-of-Order Webhook Delivery

\`subscription.canceled\` reaches your endpoint at 10:00:02. Eight seconds later, a delayed \`subscription.updated\` created before the cancellation arrives and marks the customer active again. Both requests have valid signatures, unique event IDs, and 200 responses. The defect is not delivery failure. It is applying arrival order as business order.

Webhook networks can retry, queue, fan out, and traverse different partitions. Even if a provider usually emits events in sequence, consumers should implement only the ordering guarantee the provider actually documents. Tests need to reorder valid events deliberately, run duplicates beside them, and inspect durable business state after processing settles.

## Separate four notions of order

An event can carry several timestamps, none interchangeable by default. Provider creation time says when the event record was produced. Domain effective time says when the business change applies. A resource version or sequence gives a comparable ordering token. Receiver time says when your endpoint accepted the request. Queue processing time says when a worker committed the projection.

| Ordering signal | Can it reject stale updates? | Main caveat |
|---|---|---|
| Monotonic resource version | Yes, within its documented scope | Versions may not compare across resources |
| Provider sequence number | Yes, if gaps and scope are defined | Need a recovery plan for missing sequence values |
| Domain effective timestamp | Sometimes | Equal times and clock precision need a tie-breaker |
| Event creation timestamp | Weakly | Creation may not match transaction commit order |
| Receiver timestamp | No | It records network arrival, the condition under test |
| Event ID | Only for duplicate detection | Uniqueness does not imply ordering |

If the payload contains no trustworthy version, fetch the resource's current state from the provider after receiving a notification and project that snapshot. This turns the webhook into an invalidation signal. It costs an API call and must respect provider rate limits, but it avoids inventing order from timestamps that were never promised to be monotonic.

## Define invariants before generating permutations

“Handles out-of-order events” is too vague for an assertion. Write domain invariants. A canceled subscription must not become active because an older update arrives. A refund recorded before its charge event must eventually attach to that charge. A terminal shipment-delivered state must reject an earlier in-transit transition. Duplicate delivery must not create a second ledger entry.

For each event family, define:

- The identity used for idempotency.
- The entity or aggregate to which ordering applies.
- Which field establishes freshness.
- Legal and terminal state transitions.
- What happens when a predecessor is missing.
- Whether processing is immediate, deferred, or reconciled from source.
- What the endpoint acknowledges when an event is stale.

A stale but valid event is not necessarily an HTTP error. If the consumer has durably recorded and safely ignored it, a success response may prevent useless retries. Authentication failures, malformed payloads, and transient storage errors have different response policies.

## Keep receipt, verification, and application distinct

The HTTP handler should verify the signature against the raw request body, validate the envelope, insert the event into an inbox with a unique provider event ID, and acknowledge according to durability policy. A worker then applies it transactionally. This decomposition makes duplicates and reordering observable rather than dependent on request concurrency.

The [complete webhook testing guide](/blog/webhook-testing-complete-guide-2026) covers signing and endpoint fundamentals. For order tests, always use correctly signed events unless the case is explicitly about authentication. Otherwise a rejected signature never reaches the ordering logic and gives a false sense of coverage.

A useful inbox record includes provider, event ID, type, resource ID, resource version, raw or protected payload, received time, processing status, attempt count, and terminal disposition such as \`applied\`, \`ignored_stale\`, \`duplicate\`, or \`dead_letter\`. Avoid storing sensitive raw payload forever without a retention and access policy.

## Apply versioned updates atomically in Postgres

A read-then-write sequence can race: worker A reads version 7, worker B reads version 7, B commits version 9, then A commits version 8 and regresses state. Put the freshness condition in the database write.

\`\`\`sql
CREATE TABLE subscription_projection (
  subscription_id text PRIMARY KEY,
  status text NOT NULL,
  plan_code text NOT NULL,
  provider_version bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO subscription_projection (
  subscription_id,
  status,
  plan_code,
  provider_version
)
VALUES ($1, $2, $3, $4)
ON CONFLICT (subscription_id) DO UPDATE
SET status = EXCLUDED.status,
    plan_code = EXCLUDED.plan_code,
    provider_version = EXCLUDED.provider_version,
    updated_at = now()
WHERE subscription_projection.provider_version < EXCLUDED.provider_version;
\`\`\`

If version 12 has already committed, an event with version 11 affects zero rows. The worker can record \`ignored_stale\` in the same transaction. Equal versions also affect zero rows, which is correct only if a provider guarantees one canonical state per resource version. If two event types with the same version carry complementary fields, model them differently rather than overwriting one projection row.

The first insert accepts any version because no current projection exists. That can be unsafe for partial events. If \`subscription.updated\` contains the full resource snapshot, it can initialize the row. If it contains only a changed field, receiving version 12 before creation may require buffering or fetching the snapshot.

## Exercise every meaningful delivery permutation

Two events have two orders; three events have six. Exhaustive permutation grows factorially, so enumerate small critical sequences and use property-based generation for longer ones. Compare the final projection with a model that sorts by the provider's trusted version, not with the implementation under test.

This Vitest example tests a pure reducer used before persistence. The same cases should run against the database adapter to prove the SQL guard.

\`\`\`typescript
// subscription-projection.test.ts
import { describe, expect, it } from 'vitest';

type Status = 'trialing' | 'active' | 'canceled';
type Event = {
  id: string;
  subscriptionId: string;
  version: number;
  status: Status;
  planCode: string;
};
type Projection = { version: number; status: Status; planCode: string };

function apply(current: Projection | undefined, event: Event): Projection {
  if (current && event.version <= current.version) return current;
  return { version: event.version, status: event.status, planCode: event.planCode };
}

const created: Event = {
  id: 'evt-create',
  subscriptionId: 'sub-9',
  version: 10,
  status: 'trialing',
  planCode: 'starter',
};
const upgraded: Event = {
  id: 'evt-upgrade',
  subscriptionId: 'sub-9',
  version: 11,
  status: 'active',
  planCode: 'growth',
};
const canceled: Event = {
  id: 'evt-cancel',
  subscriptionId: 'sub-9',
  version: 12,
  status: 'canceled',
  planCode: 'growth',
};

describe('subscription event ordering', () => {
  it.each([
    [created, upgraded, canceled],
    [canceled, upgraded, created],
    [upgraded, created, canceled],
    [canceled, created, upgraded],
  ])('converges to cancellation for delivery order %#', (...events) => {
    const result = events.reduce<Projection | undefined>(apply, undefined);
    expect(result).toEqual({ version: 12, status: 'canceled', planCode: 'growth' });
  });

  it('does not regress when the update is redelivered after cancellation', () => {
    const result = [created, upgraded, canceled, upgraded].reduce<Projection | undefined>(
      apply,
      undefined,
    );
    expect(result?.version).toBe(12);
    expect(result?.status).toBe('canceled');
  });
});
\`\`\`

The rest parameter in the table callback is convenient because each row is an event array. These cases assume every event is a full snapshot. If production payloads are patches, the reference model must apply them in business order and must account for missing bases.

## Make duplicate and stale different outcomes

A duplicate has an event ID already seen. A stale event has a new ID but an older resource version. Both may leave the projection unchanged, yet they mean different things operationally. A surge in duplicates suggests provider retry or slow acknowledgments. A surge in stale unique events suggests transport reordering or delayed queues.

Use a uniqueness constraint for inbox identity:

\`\`\`sql
CREATE TABLE webhook_inbox (
  provider text NOT NULL,
  event_id text NOT NULL,
  resource_id text NOT NULL,
  resource_version bigint,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  disposition text,
  PRIMARY KEY (provider, event_id)
);

INSERT INTO webhook_inbox (
  provider,
  event_id,
  resource_id,
  resource_version,
  event_type,
  payload
)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (provider, event_id) DO NOTHING;
\`\`\`

Scope the uniqueness key according to provider guarantees. If event IDs are globally unique per provider account, provider plus event ID works. In a multi-tenant integration where IDs can repeat across connected accounts, include the account identifier. Guessing the scope can cause one tenant's valid event to suppress another's.

## Buffer gaps only when sequence semantics justify it

If events carry contiguous sequence numbers and every event matters, receiving 105 after 103 exposes missing 104. The consumer can park 105, request a replay, or wait for a bounded interval. This is different from arbitrary version numbers where gaps may be normal.

| Gap strategy | Strength | Operational cost |
|---|---|---|
| Apply latest full snapshot | Fast convergence | Intermediate side effects may never run |
| Buffer until predecessor arrives | Preserves transition order | Needs timeout, storage, and gap recovery |
| Fetch current resource | Uses provider as source of truth | Adds latency, quota use, and outage dependency |
| Dead-letter unexpected gap | Prevents silent corruption | Requires prompt reconciliation tooling |
| Rebuild projection from event history | Deterministic when history is complete | More storage and replay complexity |

Do not buffer forever. Set a deadline and test its expiration with a fake clock. On expiry, reconcile or alert with resource ID, missing sequence, and parked events. Repeatedly returning an error to the webhook provider may generate duplicates without restoring the missing event.

Side effects complicate “latest snapshot wins.” If version 11 represents “send a trial-ending notice” and version 12 represents cancellation, jumping directly to 12 may correctly project state but skip or appropriately suppress the notice. Decide whether side effects derive from transitions, final state, or a separate durable command stream. Test them independently from the projection row.

## Create an HTTP test that delivers signed events backward

Pure reducer tests are fast, but they do not prove endpoint durability, queue publishing, or worker concurrency. An integration test should construct three real provider-style payloads, calculate valid signatures over their exact raw bytes, POST version 12 first, then 10 and 11, and wait until the worker records terminal dispositions.

Assert more than three 2xx responses:

- The projection remains at version 12.
- The v12 inbox row is \`applied\`.
- v10 and v11 are \`ignored_stale\`, not failed indefinitely.
- Each event ID has one inbox row after duplicate redelivery.
- No duplicate email, credit, or audit side effect occurred.
- Metrics count two stale unique events and one duplicate separately.

Use polling on durable state with a deadline rather than sleeping a fixed number of seconds. Async processing time varies in CI. A helper that queries until the expected version appears provides faster success and a useful timeout diagnostic.

The general [API testing best practices guide](/blog/api-testing-best-practices-guide) applies to status, authentication, and schema assertions. The ordering-specific addition is controlling delivery sequence while preserving every other part of the contract.

## Force the race that serial tests miss

Posting events backward one after another tests logical order, not concurrent commits. Add a barrier in the database adapter or worker test so version 11 and version 12 both begin processing before either writes. Release version 12 to commit first, then version 11. Without an atomic \`WHERE current_version < incoming_version\` guard, the stale worker may win last.

Repeat the race enough to cover both commit orders deterministically, not thousands of times probabilistically. Test hooks around the repository boundary are more reliable than adding random sleeps to production handlers. Keep those hooks inaccessible in production builds.

Transaction scope matters. Updating the projection and marking the inbox applied should occur atomically, or recovery must be idempotent. If a worker changes business state then crashes before acknowledging its inbox row, redelivery must not repeat an external side effect. Use an outbox written in the same transaction for downstream messages, with its own unique business key.

## Test events for different resources interleaved together

Ordering is usually per aggregate, not global. A slow event for subscription A must not block subscription B. Test the sequence \`A@5, B@9, A@4, B@10\` and assert each resource advances independently. A single “last seen provider version” for the entire account can incorrectly discard valid events when versions are resource-scoped.

Partitioned queues should use the aggregate ID as the ordering key if the broker offers per-key ordering. That reduces reordering but does not eliminate duplicates, replays, manual redrive, or events arriving through different topics. Keep consumer guards even when infrastructure promises ordered partitions.

For compound business operations spanning resources, define a higher-level reconciliation process. A customer event and subscription event may have incomparable versions. Do not force them into one numeric order unless the provider supplies a shared transaction sequence.

## Observe convergence, not merely handler success

Metrics should expose received, duplicate, stale, applied, deferred, reconciled, and dead-letter counts by provider and event family. Track processing lag using provider time cautiously, and distinguish network delay from queue delay where timestamps permit. Alert on stuck gaps and repeated projection conflicts, not on every expected stale event.

Logs need event ID, aggregate ID, incoming version, current version, disposition, and trace correlation. Redact payload fields. A message such as “ignored older event” without both versions forces incident responders to query the database during an outage.

Schedule reconciliation even after strong ordering logic. Compare a sample or all local projections with provider snapshots, repair drift through the same version-aware path, and record why repair occurred. Test the reconciler against local state that is ahead, behind, missing, and intentionally terminal.

## Do not manufacture guarantees from timestamps

Sorting by \`created_at\` seems reasonable until two events share one-second precision, provider clocks differ across services, or an event record is created after the business transaction it describes. If the provider documents timestamps as ordering keys and supplies a tie-breaker, use that contract. Otherwise treat them as diagnostic metadata.

When no ordering token and no fetch API exist, model only transitions that are safe under commutation. For example, adding immutable ledger entries by unique ID is order-independent; deriving a mutable balance can be a projection over that set. Redesigning state updates to be commutative is often safer than guessing which webhook was last.

## Include manual replay in the ordering test plan

Support teams often redeliver an old webhook from a provider dashboard during incident recovery. That event can arrive days after newer state and through a different ingestion path. Exercise the replay control with a real stale event, confirm signature handling follows the provider's replay behavior, and assert the version guard still classifies it as stale. Administrative replay must not bypass the same inbox and projection rules used by automatic delivery.

Record who initiated a local replay and why, but preserve the provider event ID for deduplication. Creating a fresh internal ID while discarding the original identity can repeat irreversible side effects.

## Frequently Asked Questions

### Should the endpoint return an error for a valid but stale webhook?

Usually no, once the event is durably recorded and classified. Retrying cannot make an older version newer. Return according to the provider's acknowledgment contract and retain the stale disposition for observability.

### Is event ID enough to protect state from reordering?

No. It prevents the same event from applying twice. A unique older event can still overwrite a newer projection unless the consumer also enforces resource freshness or reconciles from source.

### What if the provider supplies timestamps but no version number?

Use timestamps only if their ordering semantics are documented. Otherwise fetch current resource state, use transition rules that cannot regress terminal states, or redesign updates to be order-independent. Receiver time is not a substitute.

### Can an ordered message queue remove these tests?

No. Per-key ordering reduces one source of disorder, but webhook arrival, retries, redrive, multiple topics, and concurrent consumers can still create stale or duplicate processing. Database-level guards remain valuable.

### How do I test a missing sequence without waiting for a real timeout?

Inject the clock or scheduler into the gap manager. Deliver sequence 105 while 104 is absent, advance the fake deadline, and assert the event moves to reconciliation or dead-letter with the expected diagnostic state.
`,
};
