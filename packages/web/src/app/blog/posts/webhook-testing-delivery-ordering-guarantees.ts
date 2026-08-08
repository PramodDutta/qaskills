import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Webhook Testing Delivery Ordering Guarantees Without False Assumptions',
  description: 'Master webhook testing delivery ordering guarantees with reordered, duplicate, concurrent, and retry scenarios that prove safe, convergent event processing.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# Webhook Testing Delivery Ordering Guarantees Without False Assumptions

Webhook testing delivery ordering guarantees starts by writing down what the provider actually promises. If delivery order is not guaranteed, send valid events in reverse order, deliver duplicates, delay an earlier event, and run handlers concurrently. Then assert a durable business outcome, not arrival order. If the provider promises ordering only within a key or stream, test that boundary and prove different keys can progress independently.

Separate five clocks: when the business change happened, when the event was created, when each delivery attempt began, when your endpoint acknowledged it, and when background processing committed. A timestamp sequence in a fixture does not force network arrival or database apply order. Build the HTTP layer with patterns from the [SuperTest Node API testing guide](/blog/supertest-node-api-testing-complete-guide), and protect the event shape independently with the [Pact contract testing guide](/blog/contract-testing-pact-complete-guide).

## Name Every Order Before You Assert One

“The webhooks were out of order” is too vague for diagnosis. A provider can create events in sequence and deliver them over separate requests that race. Your endpoint can acknowledge them in arrival order while workers commit in the opposite order. Logs sorted by ingestion time may create yet another view.

| Order | Example field or evidence | Controlled by | Typical guarantee |
|---|---|---|---|
| Domain occurrence | Subscription activated before invoice paid | Producer's business system | Domain-specific |
| Event creation | Sequence or version assigned to event | Producer | Sometimes per aggregate |
| Delivery attempt | HTTP request reaches endpoint | Provider retry scheduler and network | Often not guaranteed |
| Acknowledgment | Endpoint returns 2xx | Consumer HTTP work | Consumer-controlled |
| Queue consumption | Worker receives job | Broker and partitioning | Depends on configuration |
| Durable apply | Database transaction commits | Consumer workers and database | Must be designed |
| Read projection | API exposes updated state | Projection or cache | May lag commit |

Your test name should identify the layer: “version 8 does not overwrite version 9 when delivery completes late” is strong. “Maintains webhook order” hides the mechanism and tends to overclaim.

Many webhook systems use at-least-once delivery behavior, which means retries and duplicates are normal possibilities. Some providers explicitly decline to guarantee delivery order. Stripe, for example, documents unordered event delivery and recommends retrieving missing objects when necessary at https://docs.stripe.com/webhooks. Always verify the official documentation for the provider and endpoint type you integrate with, because policies vary.

## Convert Provider Language Into a Testable Matrix

Capture the contract before designing fixtures. Include scope, failure behavior, replay behavior, and what the consumer can use to reconstruct state.

| Contract question | Possible answer | Test consequence |
|---|---|---|
| Is order guaranteed? | No | Permute valid event deliveries |
| Is there a per-object sequence? | Monotonic \`version\` | Reject stale applies per object |
| Are events immutable? | Yes | Store raw verified envelope for audit |
| Can deliveries repeat? | Yes | Unique event ID must be idempotent |
| Can separate events describe same state? | Yes | Dedupe key may include type and object ID |
| How are failures retried? | Provider-defined backoff | Test repeat after non-2xx without timing assumptions |
| Can missing state be fetched? | Current object API | Test reconciliation path |
| How long is replay available? | Provider-specific | Retention and recovery tests need that boundary |

Do not invent a sequence field because the fixture would be easier with one. If the real payload has only \`created_at\`, determine whether identical timestamps are possible and whether clocks are authoritative. A timestamp is usually a poor concurrency-control token. Prefer a documented object version, retrieve current authoritative state, or make operations naturally commutative.

Use real signed examples captured from an authorized sandbox, redact secrets, and reduce personal data. Keep hand-authored edge cases too. Provider examples often demonstrate a happy payload but not two events racing for one aggregate.

## Start With a Minimal Adversarial Event Pair

Choose two events whose reverse order would damage a naive consumer. “Customer renamed” and “customer deleted” is better than two independent creations. The fixture below describes a subscription at versions 4 and 5. JSON itself does not impose delivery timing:

\`\`\`json
[
  {
    "id": "evt_paid_v5",
    "type": "subscription.paid",
    "aggregate_id": "sub_42",
    "version": 5,
    "occurred_at": "2026-08-08T09:00:01Z",
    "data": { "status": "active", "paid_through": "2026-09-08" }
  },
  {
    "id": "evt_past_due_v4",
    "type": "subscription.past_due",
    "aggregate_id": "sub_42",
    "version": 4,
    "occurred_at": "2026-08-08T09:00:00Z",
    "data": { "status": "past_due" }
  }
]
\`\`\`

Deliver version 5 first, then version 4. The final stored subscription must remain active at version 5. Also reverse handler completion: start version 4, pause it before commit, fully apply version 5, then release version 4. Arrival-order checks alone will miss the latter race.

For a consumer without versions, ask what convergence means. It may retrieve \`sub_42\` from the provider on either notification and store the current object. It may apply commutative facts rather than mutable snapshots. Or it may buffer until prerequisites appear. These are product designs with different tests.

## Make the Reducer Explicit and Version-Aware

A pure reducer gives the suite a deterministic business oracle. It should distinguish a duplicate event ID from a stale version. The former was already processed; the latter may be a different event whose information is older than current state.

This self-contained Node test rejects both safely:

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

type Event = {
  id: string;
  aggregateId: string;
  version: number;
  status: 'past_due' | 'active' | 'canceled';
};

type State = {
  version: number;
  status: Event['status'];
  processedIds: Set<string>;
};

function apply(state: State, event: Event): State {
  if (state.processedIds.has(event.id)) return state;
  const processedIds = new Set(state.processedIds).add(event.id);
  if (event.version <= state.version) return { ...state, processedIds };
  return { version: event.version, status: event.status, processedIds };
}

test('a late older event cannot overwrite current state', () => {
  const initial: State = {
    version: 3,
    status: 'past_due',
    processedIds: new Set(),
  };
  const newest: Event = {
    id: 'evt_5', aggregateId: 'sub_42', version: 5, status: 'active',
  };
  const older: Event = {
    id: 'evt_4', aggregateId: 'sub_42', version: 4, status: 'past_due',
  };

  const final = apply(apply(apply(initial, newest), older), newest);

  assert.equal(final.version, 5);
  assert.equal(final.status, 'active');
  assert.deepEqual([...final.processedIds].sort(), ['evt_4', 'evt_5']);
});
\`\`\`

Recording a stale event as processed is a deliberate choice here. It prevents endless replay work while retaining an audit that the delivery was seen. A different compliance model may store every attempt and a separate processing outcome. Keep that storage decision out of the generic HTTP controller.

Do not compare versions as strings. Lexicographic order puts \`"10"\` before \`"9"\`. Validate the provider's documented type at the boundary and reject malformed values before business processing.

## Verify Signatures Against the Exact Request Bytes

Ordering tests are worthless if the HTTP fixture bypasses authentication used in production. HMAC signatures commonly cover the raw request body. Parsing JSON and serializing it again can change whitespace or property order, causing a valid signature to fail or an invalid test to pass through a special code path.

The following complete Express and SuperTest test signs the exact bytes it sends. It uses a local illustrative signature contract, so both producer and consumer behavior are visible:

\`\`\`ts
import express from 'express';
import request from 'supertest';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = 'integration-test-secret';
const sign = (body: Buffer): string =>
  createHmac('sha256', secret).update(body).digest('hex');

const app = express();
app.post('/webhooks/subscriptions', express.raw({ type: 'application/json' }), (req, res) => {
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
  const supplied = Buffer.from(req.header('x-test-signature') ?? '', 'hex');
  const expected = Buffer.from(sign(body), 'hex');
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.sendStatus(401);
    return;
  }
  const event = JSON.parse(body.toString('utf8')) as { id: string };
  res.status(202).json({ accepted: event.id });
});

test('verifies the exact raw webhook body', async () => {
  const body = Buffer.from(JSON.stringify({ id: 'evt_5', version: 5 }));
  const response = await request(app)
    .post('/webhooks/subscriptions')
    .set('content-type', 'application/json')
    .set('x-test-signature', sign(body))
    .send(body);

  assert.equal(response.status, 202);
  assert.deepEqual(response.body, { accepted: 'evt_5' });
});
\`\`\`

Production integrations must implement the provider's documented signing format, timestamp tolerance, header parsing, and secret rotation rules, not this illustrative header. Keep the provider verifier behind an adapter and use official SDK behavior where available. The testing principle remains: sign and send the same bytes, and include negative cases for modified bodies, malformed headers, old timestamps where applicable, and wrong secrets.

Return success only after the system has durably accepted responsibility. That may mean committing the event to an inbox table or durable queue, not completing all business work during the HTTP request. A 2xx before durable storage creates an acknowledgment-loss window: the provider stops retrying, then your process crashes before retaining the event.

## Test Duplicate Delivery Independently From Reordering

Duplicates and reordering interact, but they are different dimensions. Run at least four sequences for one aggregate:

| Sequence | Risk exposed | Required final property |
|---|---|---|
| A, B | Baseline | Latest intended state |
| B, A | Delivery reordering | Same converged state |
| A, A, B | Duplicate before progress | Side effect for A occurs once |
| B, A, B | Stale event plus duplicate latest | State and effects remain stable |
| A starts, B commits, A commits | Concurrent completion inversion | Older write cannot win |
| A fails, B succeeds, A retries | Retry after later progress | Retry is safe and acknowledged |

Idempotency must cover side effects, not only the projection row. If \`invoice.paid\` sends an email and increments a loyalty balance, updating the subscription once while sending the email twice is still a duplicate-processing bug.

This runnable in-memory inbox test demonstrates an atomic claim in one process:

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

class Inbox {
  private claimed = new Set<string>();
  readonly effects: string[] = [];

  process(eventId: string, effect: string): boolean {
    if (this.claimed.has(eventId)) return false;
    this.claimed.add(eventId);
    this.effects.push(effect);
    return true;
  }
}

test('duplicate event IDs do not duplicate side effects', () => {
  const inbox = new Inbox();
  assert.equal(inbox.process('evt_5', 'grant-access:sub_42'), true);
  assert.equal(inbox.process('evt_5', 'grant-access:sub_42'), false);
  assert.deepEqual(inbox.effects, ['grant-access:sub_42']);
});
\`\`\`

An in-memory set is only a unit-test oracle. Production needs a durable uniqueness mechanism in the same transactional boundary as state changes or an equivalent idempotency design. A “check then insert” split across transactions races when two workers receive the same event simultaneously.

## Force Concurrent Completion Instead of Hoping for It

Random sleeps make flaky concurrency tests. Use barriers to place the older handler exactly before commit, let the newer handler commit, then release the older one. The repository must enforce the version condition atomically.

This self-contained test models conditional commits:

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

type Snapshot = { version: number; status: string };

class Repository {
  value: Snapshot = { version: 3, status: 'past_due' };

  commit(candidate: Snapshot): boolean {
    if (candidate.version <= this.value.version) return false;
    this.value = candidate;
    return true;
  }
}

test('late completion of an older handler cannot win', async () => {
  const repository = new Repository();
  let releaseOlder: (() => void) | undefined;
  const barrier = new Promise<void>((resolve) => { releaseOlder = resolve; });

  const older = (async () => {
    await barrier;
    return repository.commit({ version: 4, status: 'past_due' });
  })();

  const newerApplied = repository.commit({ version: 5, status: 'active' });
  releaseOlder?.();
  const olderApplied = await older;

  assert.equal(newerApplied, true);
  assert.equal(olderApplied, false);
  assert.deepEqual(repository.value, { version: 5, status: 'active' });
});
\`\`\`

Translate this into a database integration test with two real connections and explicit transaction barriers. The essential database statement must encode the condition, for example updating only where the stored version is lower. Reading the row, comparing in application code, and later writing leaves a race window.

An illustrative PostgreSQL pattern looks like this:

\`\`\`sql
INSERT INTO webhook_inbox (event_id, aggregate_id, event_version, payload)
VALUES ($1, $2, $3, $4::jsonb)
ON CONFLICT (event_id) DO NOTHING;

UPDATE subscriptions
SET status = $2, source_version = $3
WHERE subscription_id = $1
  AND source_version < $3;
\`\`\`

These statements need a transaction strategy appropriate to the application. Assert affected row counts. A zero-row inbox insert means duplicate ID; a zero-row state update can mean stale version or missing aggregate, which may require different telemetry and recovery.

## Choose a Strategy for Missing Prerequisites

Reverse delivery can make an update arrive before its create event. There is no single correct response. Choose one strategy per event family and test its failure boundaries.

| Strategy | How it converges | Test focus | Operational cost |
|---|---|---|---|
| Fetch current object | Query provider using object ID | API failure, rate limit, deleted object | External dependency during processing |
| Upsert snapshot | Later event contains sufficient state | Schema completeness and version guard | Larger payload trust surface |
| Buffer pending event | Wait for prerequisite event | Expiry, poison queue, replay order | More storage and coordination |
| Commutative facts | Store independent facts, derive view | Duplicate fact identity | More complex projection |
| Ordered partition | Serialize by aggregate key internally | Key choice, hot partitions | Throughput constraints |

Fetching current state is often robust when the provider explicitly recommends it, but test authorization, not-found behavior, and a provider API outage. Do not return a terminal success and discard the event if reconciliation failed. Persist retryable work first.

Buffering needs an expiry policy. Create a test where the prerequisite never arrives, advance controlled time, and assert the event moves to a visible recovery state rather than remaining silently pending forever. A dead-letter destination without alert ownership is only a quieter data-loss queue.

Ordered internal consumption does not recreate provider delivery order automatically. If version 5 enters your partition before version 4, serialization processes 5 first. You still need stale-event handling or reconciliation.

## Protect the Payload Contract Without Confusing It With Order

Schema validation catches missing IDs, changed types, and incompatible payloads. It cannot prove delivery sequence, uniqueness, or final convergence. Keep contract tests and behavior tests separate so a green schema suite is not presented as ordering coverage.

This JSON Schema is complete for the illustrative event used here:

\`\`\`json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["id", "type", "aggregate_id", "version", "occurred_at", "data"],
  "properties": {
    "id": { "type": "string", "minLength": 1 },
    "type": { "enum": ["subscription.paid", "subscription.past_due"] },
    "aggregate_id": { "type": "string", "minLength": 1 },
    "version": { "type": "integer", "minimum": 1 },
    "occurred_at": { "type": "string", "format": "date-time" },
    "data": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": { "enum": ["active", "past_due"] },
        "paid_through": { "type": "string", "format": "date" }
      },
      "additionalProperties": true
    }
  },
  "additionalProperties": false
}
\`\`\`

Validate provider evolution rules. Some providers add fields compatibly, so \`additionalProperties: false\` may be too strict for their real contract. It is appropriate only if your agreed illustrative contract rejects additions. In a real consumer-driven contract, model which additions are tolerated and which required semantics must remain.

Store a provider API version or event schema version when one is documented. Replaying an old event through new code is a valuable migration test. Ordering logic that assumes every historical payload contains the newest version field can fail during disaster recovery.

## Diagnose a Realistic False Final State

Imagine production shows an active subscription as \`past_due\`. Logs contain \`past_due\` version 18 at 10:00:00 and \`paid\` version 19 at 10:00:01. Yet the database ends at version 18.

Trace each layer:

1. Confirm both signatures passed against raw bytes.
2. Compare event IDs and aggregate IDs to rule out a duplicate or wrong key.
3. Inspect delivery attempt start times, not only event occurrence times.
4. Inspect worker start and transaction commit times.
5. Check affected row count for the version-guarded update.
6. Check whether a cache or projection later overwrote the database view.
7. Replay the exact two payloads with a barrier before the older commit.

The likely bug is a read-compare-write race: version 18 handler read version 17, paused on another call, version 19 committed, then version 18 wrote without a conditional predicate. A sequential reverse-order test might catch stale overwrite, but the barrier test proves completion inversion and makes the regression deterministic.

Another common defect is returning 200 before queue publication. A process crash then loses the event, while dashboards show successful delivery. Inject a queue failure and assert the endpoint returns a retryable non-2xx response or that a transactional inbox already contains the event before success. The exact response policy belongs to the integration contract.

## What People Get Wrong About Ordering Guarantees

First, absence of a guarantee does not mean random chaos must be reproduced with sleeps. It means the consumer cannot depend on sequence. A small set of deterministic permutations and barriers is stronger than a thousand timing-based runs.

Second, sorting a batch by \`occurred_at\` is not a complete fix. Two workers can receive separate batches, timestamps can tie, earlier events can be missing, and completion can still invert. Sorting is useful inside a bounded replay only when the provider defines the ordering key and all relevant events are present.

Third, an idempotency key does not solve stale updates. Version 18 and version 19 have different event IDs, so both legitimately pass deduplication. The state write still needs a monotonic condition or reconciliation strategy.

Fourth, HTTP 200 does not prove the business state committed. It proves only what your endpoint chose to acknowledge. Tests need an eventual durable-state assertion and, when work is asynchronous, a bounded poll against an observable job or projection status.

## Run the Ordering Suite as a Layered Release Gate

Keep fast permutation tests near the reducer, database race tests near the repository, signed HTTP tests at the adapter, and a small sandbox end-to-end suite against the real provider. This makes failures local while retaining confidence in the integration.

Use unique aggregate IDs per CI worker. Shell concatenation should be explicit, such as \`SUBSCRIPTION_ID="sub_\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"\`. Wait on a business condition with a bounded deadline rather than sleeping for a guessed worker duration. Log event ID, aggregate ID, source version, attempt number, processing outcome, and stored version. Never log signing secrets or unredacted sensitive payloads.

Measure outcomes that reveal degradation: duplicate-suppression count, stale-event count, reconciliation attempts, inbox age, processing latency, and dead-letter depth. Thresholds must come from your service objective and observed baseline, not invented universal numbers.

An AI coding agent can generate permutations from the event transition table and help shrink a failed random sequence into a minimal case. Give it the real schema and documented provider semantics. Review any generated SDK calls or retry claims against official documentation. The most valuable generated artifact is often a table-driven test that states input order and expected final version clearly.

Release when every supported event family has a declared convergence strategy, duplicates cannot repeat effects, stale completion cannot overwrite current state, signed HTTP failures remain retryable, and operations can explain every discarded or deferred event. That is a defensible delivery-ordering guarantee on the consumer side even when the provider promises no delivery order.

## Frequently Asked Questions

### Can I test webhook ordering by sending events in timestamp order?

That only proves the easiest sequence. Send the same valid events forward, reversed, duplicated, and with completion deliberately inverted by a barrier. Assert the final durable state and side effects. Timestamps describe when an event says something happened, but they do not control network arrival or transaction commit. If the provider documents a monotonic version, use it in an atomic state update. Otherwise test the chosen reconciliation, buffering, or commutative-processing strategy.

### Is idempotency enough to handle out-of-order webhooks?

No. Idempotency prevents the same event identity from repeating an effect. Two distinct events for versions 18 and 19 both pass deduplication, and version 18 can still overwrite version 19 if the write is unguarded. Combine durable event-ID uniqueness with a monotonic version condition, authoritative state retrieval, or another explicit convergence design. Test duplicate delivery and stale delivery as separate dimensions, then combine them in sequences such as newest, older, newest again.

### When should a webhook endpoint return a successful response?

Return success after the consumer has durably accepted responsibility according to its design. Often that means an inbox row or durable queue entry has committed, not that every downstream side effect has finished. If the process responds first and crashes before durable storage, the provider may stop retrying and the event is lost. Inject storage and queue failures to verify that acknowledgment behavior. Follow the provider's documented timeout and retry expectations rather than assuming one universal status policy.

### What should I assert when the provider offers no sequence number?

Assert convergence through a strategy the available contract supports. You might retrieve the current object from the provider, upsert a complete snapshot using a documented freshness token, buffer an event until prerequisites exist, or store commutative facts and derive the view. Do not manufacture order from event IDs or loosely synchronized timestamps. Your test should deliver an update before create, simulate a missing prerequisite, exercise reconciliation failure, and verify the final authoritative business state plus visible recovery telemetry.
`,
};
