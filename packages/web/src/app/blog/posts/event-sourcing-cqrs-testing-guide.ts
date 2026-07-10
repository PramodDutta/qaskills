import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Event Sourcing and CQRS Testing Guide',
  description:
    'Test event sourcing and CQRS systems with command rules, event replay, projection consistency, snapshots, and read-model regression checks with confidence.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Event Sourcing and CQRS Testing Guide

In an event-sourced system, the database row is not the source of truth. The history is. That changes testing completely. You are no longer only checking that a command returned 200 or that a table contains a new balance. You are checking that the right events were appended, that invalid commands produced no events, that projections can rebuild from history, and that read models eventually tell the same story as the write side.

CQRS adds another testing wrinkle because the command model and query model are intentionally different. A command can be correct while the projection lags, duplicates an event, or mishandles replay after a schema change. The test suite needs to separate command invariants from projection consistency. For adjacent event-driven concerns, read the [event-driven architecture testing guide](/blog/event-driven-architecture-testing-guide). For service boundary coverage around distributed systems, pair this with [microservices testing strategies](/blog/microservices-testing-strategies).

## Test Events as the Contract

Events are not implementation detail in event sourcing. They are the durable record. A good command test asserts emitted events, stream version, and rejection behavior. It does not assert only the final state of an aggregate object.

Suppose an account can be opened, credited, debited, and frozen. The command tests should answer:

| Command case | Expected event behavior | Extra invariant |
|---|---|---|
| Open account with valid owner | \`AccountOpened\` appended to new stream | Initial balance is zero |
| Debit available funds | \`AccountDebited\` appended after current version | Balance cannot go negative |
| Debit frozen account | No event appended | Rejection reason is explicit |
| Duplicate command id | No duplicate event | Idempotency key is honored |
| Credit after replay | Event uses current schema version | Old events still rebuild state |

The expected event list is the cleanest test output. If a command changes from one event to two, reviewers should see that explicitly. If an event's field name changes, a compatibility test should fail before consumers do.

## Given When Then for Aggregates

Aggregate tests work well in a given-when-then shape: given prior events, when a command is handled, then new events are produced or the command is rejected. This pattern keeps tests independent from databases and projections.

\`\`\`typescript
type AccountEvent =
  | { type: 'AccountOpened'; accountId: string; ownerId: string }
  | { type: 'AccountCredited'; accountId: string; amount: number }
  | { type: 'AccountDebited'; accountId: string; amount: number }
  | { type: 'AccountFrozen'; accountId: string; reason: string };

type DebitCommand = {
  type: 'DebitAccount';
  accountId: string;
  amount: number;
};

function decideDebit(history: AccountEvent[], command: DebitCommand): AccountEvent[] {
  const frozen = history.some((event) => event.type === 'AccountFrozen');
  const balance = history.reduce((total, event) => {
    if (event.type === 'AccountCredited') return total + event.amount;
    if (event.type === 'AccountDebited') return total - event.amount;
    return total;
  }, 0);

  if (frozen) throw new Error('Account is frozen');
  if (balance < command.amount) throw new Error('Insufficient funds');

  return [
    {
      type: 'AccountDebited',
      accountId: command.accountId,
      amount: command.amount,
    },
  ];
}

const history: AccountEvent[] = [
  { type: 'AccountOpened', accountId: 'acct-1', ownerId: 'user-1' },
  { type: 'AccountCredited', accountId: 'acct-1', amount: 100 },
];

const events = decideDebit(history, {
  type: 'DebitAccount',
  accountId: 'acct-1',
  amount: 40,
});

console.assert(events[0].type === 'AccountDebited');
console.assert(events[0].amount === 40);
\`\`\`

This is fast and precise. It will not catch EventStore connection bugs or projection lag, but it should catch domain rule mistakes before integration tests run.

## Event Store Integration Tests

At least some tests should append to and read from the real event store. These tests prove stream naming, expected revision handling, serialization, and metadata conventions. The example below uses the official EventStoreDB JavaScript client shape.

\`\`\`typescript
import {
  EventStoreDBClient,
  FORWARDS,
  START,
  jsonEvent,
} from '@eventstore/db-client';

const client = EventStoreDBClient.connectionString('esdb://localhost:2113?tls=false');
const streamName = 'account-acct-1';

await client.appendToStream(streamName, [
  jsonEvent({
    type: 'AccountOpened',
    data: { accountId: 'acct-1', ownerId: 'user-1' },
  }),
  jsonEvent({
    type: 'AccountCredited',
    data: { accountId: 'acct-1', amount: 100 },
  }),
]);

const events = client.readStream(streamName, {
  direction: FORWARDS,
  fromRevision: START,
});

const seen: string[] = [];
for await (const resolvedEvent of events) {
  seen.push(resolvedEvent.event?.type ?? '');
}

console.assert(seen.join(',') === 'AccountOpened,AccountCredited');
\`\`\`

Integration tests should use unique stream names, often with a test id suffix. Never share an event stream across parallel tests. Event stores are append-only by design, so cleanup is not always deletion. Isolation by stream name is simpler.

## Projection Tests Need Replay, Not Only Live Updates

Projection bugs hide during normal happy-path testing. A projector may handle the latest event correctly but fail when rebuilding from the beginning. Another may be idempotent during live consumption but duplicate rows during replay. Test both modes.

| Projection risk | Live test | Replay test |
|---|---|---|
| Event handler missing | New event does not update read model | Rebuild lacks historical data |
| Duplicate processing | Same event delivered twice | Replay creates duplicate rows |
| Event schema change | Latest event maps correctly | Old version maps through upgrader |
| Ordering assumption | Works in observed order only | Rebuild from full stream proves order handling |
| Partial failure | One read model updated, another skipped | Check checkpoint and retry behavior |

A projection test should feed events into the projector and inspect the read model. The read model can be an in-memory repository for unit tests and a real database for integration tests.

\`\`\`typescript
type AccountReadModel = {
  accountId: string;
  ownerId: string;
  balance: number;
  frozen: boolean;
};

function projectAccount(
  current: AccountReadModel | undefined,
  event: { type: string; data: Record<string, unknown> }
): AccountReadModel {
  switch (event.type) {
    case 'AccountOpened':
      return {
        accountId: String(event.data.accountId),
        ownerId: String(event.data.ownerId),
        balance: 0,
        frozen: false,
      };
    case 'AccountCredited':
      return { ...current!, balance: current!.balance + Number(event.data.amount) };
    case 'AccountDebited':
      return { ...current!, balance: current!.balance - Number(event.data.amount) };
    case 'AccountFrozen':
      return { ...current!, frozen: true };
    default:
      return current!;
  }
}

const replay = [
  { type: 'AccountOpened', data: { accountId: 'acct-1', ownerId: 'user-1' } },
  { type: 'AccountCredited', data: { accountId: 'acct-1', amount: 100 } },
  { type: 'AccountDebited', data: { accountId: 'acct-1', amount: 40 } },
].reduce<AccountReadModel | undefined>(projectAccount, undefined);

console.assert(replay?.balance === 60);
\`\`\`

Replay tests become your safety net for refactoring projectors. If rebuilding a read model from production history is part of recovery, it deserves regression coverage.

## Consistency Windows and Query Assertions

CQRS systems often accept eventual consistency. That does not mean tests should sleep randomly. Define the consistency window and poll for the expected read model state with a clear timeout. The timeout is part of the contract.

For example, if a debit command returns success, the account summary page might be allowed to update within two seconds. A test can issue the command, poll the query endpoint until the new balance appears, and fail with diagnostic information if the projection misses the window.

Avoid asserting immediate query state unless the architecture promises synchronous projection. If the team expects eventual consistency, the test should express that. Otherwise, it will become flaky under legitimate asynchronous behavior.

## Snapshots and Schema Evolution

Snapshots speed aggregate rehydration, but they add another test surface. A snapshot is only safe if events after the snapshot produce the same state as replaying from the beginning. Test that equivalence for important aggregates.

Event schema evolution needs similar discipline. Old events do not disappear. If \`AccountCredited\` version 1 stored \`amount\` as cents and version 2 stores a money object, the upcaster or handler must support both. Keep a fixture stream with old events and replay it in CI.

| Artifact | Regression check |
|---|---|
| Snapshot | Snapshot plus later events equals full replay state |
| Upcaster | Old event version maps to current internal event |
| Projection checkpoint | Restart resumes without skipping or duplicating |
| Event metadata | Correlation id and causation id survive append and read |
| Stream naming | Commands append to the expected aggregate stream |

These tests prevent a common failure: the current code works for events written today, but recovery from last year's history breaks.

## Operational Failure Tests

Event-sourced systems also need resilience checks. What happens if appending succeeds but publishing to a downstream bus fails? What happens if a projector processes an event and crashes before checkpointing? What happens if two commands race against the same stream version?

Expected revision tests are valuable. Two concurrent debits should not both append against the same original version if only one should win. The loser should retry by reading new history or return a conflict, depending on business rules. Do not bury this behavior inside generic database transaction tests. It is central to event sourcing correctness.

## Auditing Event Meaning With Product Examples

Event names should make sense to the business. A stream full of \`AccountUpdated\` events is difficult to test because every handler must inspect a payload blob to know what happened. Specific events such as \`AccountFrozen\`, \`CreditLimitChanged\`, and \`DebitRejected\` make tests clearer and projections safer.

Use product examples to audit event design. Take a support scenario and ask whether the event history explains it without reading current database rows. If a customer asks why a payment failed, can the stream show authorization, debit attempt, rejection reason, and notification? If not, the event model may be losing information that tests should expose.

Testing event meaning is not only philosophical. Vague events create weak assertions. A test that expects \`AccountUpdated\` with a large object snapshot is harder to review than a test that expects \`AccountDebited\` with amount, currency, command id, and causation id. Specific events reduce accidental coupling because consumers subscribe to facts, not internal state dumps.

Schema review belongs here too. New event fields should be intentional, serializable, and understandable to future consumers. Removing or renaming fields is a compatibility change, not a refactor. Keep example event JSON in tests so reviewers see the durable contract.

Events also need negative examples. If an account debit is rejected, decide whether that rejection is an event or only a command response. Some domains need rejection events for audit and customer support. Others do not want failed attempts in the aggregate stream. Either choice can be valid, but tests should make the choice explicit. Otherwise one handler may emit rejection history while another silently drops it.

Use event examples in product reviews. A product owner can often spot missing meaning faster than a framework expert. If the event history cannot explain the user's story, the model is probably too technical or too vague.

Keep those examples stable across releases. When a new implementation changes event names or payloads, the review should ask whether the business meaning improved or merely the code changed shape. Event sourcing makes history permanent, so naming discipline has long-term operational cost.

That cost shows up during audits, customer support investigations, replay tooling, and incident reviews. A clear event vocabulary pays for itself when the system is under pressure.

It also makes automated tests easier to review because expected histories read like domain narratives instead of technical diffs.

That readability protects future maintainers.

It also helps auditors follow causality without reading code.

That is practical governance.

## Idempotency, Concurrency, and Poison Events

Event-sourced systems need explicit tests for duplicate commands. A command handler may receive the same request twice because a client retried after a timeout. If the command has an idempotency key, the second attempt should not append a second business event. Test this at the aggregate level and the event store level. The aggregate test proves the decision rule. The integration test proves the command id or causation metadata is actually checked before append.

Concurrency tests should create two commands from the same starting version. For example, two debits might both look valid against a balance of 100, but together they overdraw the account. The event store's expected revision check should let one append win and force the other to re-read or fail with a conflict. A test that bypasses expected revision is not testing the real safety mechanism.

Poison events are another practical concern. A projection may encounter an event it cannot deserialize, an unknown event type, or a payload that violates a new assumption. The wrong behavior is to spin forever on the same event while the checkpoint never advances and no alert fires. A robust projection strategy might move the event to a dead-letter stream, stop with a clear operational error, or skip only if the event type is explicitly ignored. Pick a policy and test it.

Use fixed event fixtures for poison cases. One fixture can contain an older event version. Another can contain an unknown event type from a future producer. A third can contain malformed data that should be rejected. The projection test should assert the chosen behavior and the observability output, such as log event, metric, or dead-letter record. That evidence matters during recovery.

Idempotent projection handling is equally important. Event delivery may be at least once. If a projector processes \`AccountCredited\` twice with the same event id, the balance should not double unless the read model intentionally stores every delivery attempt. Store processed event ids or use database constraints where appropriate, then test duplicate delivery. This is one of the few places where a boring unique constraint can save a financial incident.

## Designing Read Models for Testability

A read model that is impossible to rebuild locally is a warning sign. Projection tests are easier when the projector accepts events and a repository interface, rather than hiding database access behind global state. That design lets unit tests replay event arrays quickly and integration tests swap in a real database.

Expose projection checkpoints in non-production diagnostics. Tests should be able to ask which stream position or event id the projector has processed. Without that visibility, an eventual consistency failure says only "expected balance 60." With checkpoint visibility, the failure can say "projector stopped before event 43." That changes debugging from guessing to inspection.

Also test query semantics directly. CQRS read models often denormalize for speed, which means query filters can drift from command invariants. If frozen accounts should not appear in an "eligible for debit" view, write a projection replay that freezes an account and then query the read model. Do not assume the command side prevents every invalid display. Users make decisions from read models.

Finally, include rebuild time in non-functional checks. A replay that is correct but takes twelve hours may be unacceptable for disaster recovery. You do not need a full production replay in every pull request, but scheduled tests should track rebuild duration for representative streams and read models. Correctness and recoverability belong together in event-sourced systems.

## Frequently Asked Questions

### Should aggregate tests use the real event store?

Most aggregate rule tests should not. They should use prior events as input and assert new events as output. Keep separate integration tests for serialization, stream naming, expected revision, and EventStoreDB behavior.

### How do I test eventual consistency without flaky sleeps?

Poll the query model until the expected state appears or a defined timeout expires. Include the command id, stream name, and last projection checkpoint in the failure message so the failure is diagnosable.

### Are snapshots part of the test contract?

Yes, if production relies on them. Test that loading from a snapshot plus subsequent events produces the same aggregate state as replaying the full stream. Also test snapshot version compatibility when aggregate state changes.

### What should a projection replay test assert?

Assert the rebuilt read model, idempotency, and checkpoint behavior. Replaying the same event sequence twice should not create duplicates unless the read model is intentionally append-only.

### Can CQRS tests ignore the read side if command tests are strong?

No. Command tests prove the write-side decisions. CQRS also needs query tests because customers and downstream services consume projections, not aggregate internals.
`,
};
