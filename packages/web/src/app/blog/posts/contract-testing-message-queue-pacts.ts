import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Contract Testing Message Queue Pacts: Async Contracts Without Spinning Up Brokers',
  description: 'Apply contract testing message queue pacts to validate async payloads, metadata, and producer output without standing up Kafka or RabbitMQ in every CI job.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# Contract Testing Message Queue Pacts: Async Contracts Without Spinning Up Brokers

Contract testing message queue pacts prove that a message consumer can handle the payload a producer claims to emit, without requiring a live Kafka cluster, RabbitMQ node, or cloud SQS account in the unit-test path. In Pact's message model, the consumer writes expectations about the JSON (or binary) body and optional metadata such as a queue name or content type. Pact records those expectations into a contract file. The producer later maps each interaction description to a function that builds the real message and lets Pact verify the output still matches.

That separation is the entire point. Transport concerns (acks, consumer groups, dead-letter queues, partition keys) still need integration tests somewhere, but schema and semantic breaks should fail in seconds on a laptop. Teams that only exercise HTTP with SuperTest often ship silent async breaks: a field renamed in an \`OrderPlaced\` event, a price that changed from string to number, a metadata routing key that no longer matches the binding. Message pacts catch those classes of defects at the boundary that actually matters to the consumer.

This article walks through handler isolation, consumer expectations with \`@pact-foundation/pact\`, producer verification with \`MessageProviderPact\`, metadata strategy, matcher discipline, a realistic rename failure, and CI publish gates. Official docs: https://docs.pact.io/implementation_guides/javascript/docs/messages and https://docs.pact.io. For HTTP-level API testing patterns that sit beside these contracts, see the [SuperTest Node API testing guide](/blog/supertest-node-api-testing-complete-guide). For the broader Pact mental model beyond queues, use the [Pact complete guide](/blog/contract-testing-pact-complete-guide).

## Separate the handler from the transport before you write a pact

Message contract tests collapse if your "handler" still opens a network connection to a broker. The unit under test must accept a plain payload (and maybe metadata) and return a result or throw. Adapters that commit offsets, nack messages, or publish replies live outside the pact boundary.

| Layer | Responsibility | In message pact? |
|---|---|---|
| Transport adapter | Poll queue, ack/nack, decode envelopes | No |
| Envelope decoder | Strip vendor wrappers, expose body + headers | Thin adapter only |
| Domain handler | Validate business payload, call services | Yes (consumer) |
| Domain producer | Build payload from internal state | Yes (provider) |
| Broker topology | Exchanges, topics, DLQs | Integration tests |

A clean consumer handler for an inventory reservation event might look like this:

\`\`\`ts
// src/inventory/reservation-handler.ts
export type ReservationRequested = {
  reservationId: string;
  sku: string;
  quantity: number;
  warehouseCode: string;
};

export type HandlerResult =
  | { ok: true }
  | { ok: false; reason: string };

export function handleReservationRequested(
  event: ReservationRequested,
): HandlerResult {
  if (!event.reservationId || !event.sku) {
    return { ok: false, reason: 'missing_identity' };
  }
  if (!Number.isInteger(event.quantity) || event.quantity < 1) {
    return { ok: false, reason: 'invalid_quantity' };
  }
  if (!/^[A-Z]{3,5}$/.test(event.warehouseCode)) {
    return { ok: false, reason: 'invalid_warehouse' };
  }
  // Persist or call domain services here in production code.
  return { ok: true };
}
\`\`\`

The adapter that actually reads from the broker stays thin:

\`\`\`ts
// src/inventory/sqs-adapter.ts
import {
  handleReservationRequested,
  type ReservationRequested,
} from './reservation-handler';

export type QueueMessage = {
  body: string;
  attributes?: Record<string, string>;
};

export async function onSqsMessage(message: QueueMessage): Promise<void> {
  const parsed = JSON.parse(message.body) as ReservationRequested;
  const result = handleReservationRequested(parsed);
  if (!result.ok) {
    throw new Error(\`handler_rejected:\${result.reason}\`);
  }
}
\`\`\`

Pact's consumer test targets \`handleReservationRequested\` (or a small wrapper that unwraps Pact's message object), not \`onSqsMessage\`. That keeps failures about contract shape, not about AWS credentials.

## Write the consumer message expectation that becomes the contract

Using the v4-style asynchronous interaction API from \`@pact-foundation/pact\`, the consumer declares what it can handle. Matchers keep volatile ids flexible while locking field presence and types.

\`\`\`ts
// test/pact/reservation.consumer.pact.spec.ts
import path from 'node:path';
import {
  Matchers,
  Pact,
  v4SynchronousBodyHandler,
  type LogLevel,
} from '@pact-foundation/pact';
import { handleReservationRequested } from '../../src/inventory/reservation-handler';

const { like, integer, regex } = Matchers;
const logLevel = (process.env.PACT_LOG_LEVEL ?? 'INFO') as LogLevel;

describe('ReservationRequested message consumer', () => {
  const messagePact = new Pact({
    consumer: 'inventory-service',
    provider: 'orders-service',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel,
  });

  it('accepts a reservation request for a known warehouse', async () => {
    await messagePact
      .addAsynchronousInteraction()
      .given('a paid order ready for reservation')
      .expectsToReceive('a ReservationRequested event', (builder) => {
        builder
          .withJSONContent({
            reservationId: like('res_01HZX'),
            sku: like('SKU-1042'),
            quantity: integer(2),
            warehouseCode: regex('^[A-Z]{3,5}$', 'DUB1'),
          })
          .withMetadata({
            contentType: 'application/json',
            queue: 'inventory.reservations',
          });
      })
      .executeTest(
        v4SynchronousBodyHandler((body) => {
          const result = handleReservationRequested(body);
          if (!result.ok) {
            throw new Error(result.reason);
          }
        }),
      );
  });
});
\`\`\`

Key points that teams miss:

1. The interaction description (\`a ReservationRequested event\`) must match the provider mapping later.
2. Provider state (\`given\`) documents the world the producer assumes, even when async producers do not "respond" to a request.
3. Metadata is part of the contract when consumers depend on it for routing or deserialization.
4. The handler must fail hard on unusable messages so the pact is not written for a payload the consumer would drop in production.

If you still use older message consumer helpers in a legacy package version, follow that version's documented class names. Do not invent APIs. Prefer the patterns published at https://docs.pact.io/implementation_guides/javascript/docs/messages for your installed major version.

## Verify the producer can emit the same payload shape

On the producer side, Pact plays the queue. You map each consumer interaction description to a function that returns the message body the service would publish. Optional metadata helpers assert headers or queue names.

\`\`\`ts
// test/pact/reservation.provider.pact.spec.ts
import path from 'node:path';
import {
  MessageProviderPact,
  providerWithMetadata,
} from '@pact-foundation/pact';
import { buildReservationRequestedEvent } from '../../src/orders/reservation-events';

describe('orders-service message provider', () => {
  const pact = new MessageProviderPact({
    provider: 'orders-service',
    providerVersion: process.env.GIT_SHA ?? 'local-dev',
    pactUrls: [
      path.resolve(
        process.cwd(),
        'pacts',
        'inventory-service-orders-service.json',
      ),
    ],
    messageProviders: {
      'a ReservationRequested event': providerWithMetadata(
        () => buildReservationRequestedEvent({ orderId: 'ord_demo_1' }),
        {
          contentType: 'application/json',
          queue: 'inventory.reservations',
        },
      ),
    },
  });

  it('meets inventory-service reservation contracts', async () => {
    await pact.verify();
  });
});
\`\`\`

Producer builder under test:

\`\`\`ts
// src/orders/reservation-events.ts
export type ReservationRequested = {
  reservationId: string;
  sku: string;
  quantity: number;
  warehouseCode: string;
};

export function buildReservationRequestedEvent(input: {
  orderId: string;
}): ReservationRequested {
  // Production code would load the order aggregate. Tests stub that seam.
  return {
    reservationId: \`res_\${input.orderId}\`,
    sku: 'SKU-1042',
    quantity: 2,
    warehouseCode: 'DUB1',
  };
}
\`\`\`

Provider verification should stub IO: databases, other queues, feature services. You are proving message shape from the producer module, not retesting the entire order pipeline. Keep a narrow builder or application service as the seam.

## Metadata, routing keys, and content types that HTTP pacts ignore

HTTP contracts encode method, path, and headers. Message contracts encode whatever your bus uses to deliver and interpret payloads. If the consumer only JSON-parses \`body\` and ignores attributes, metadata can stay minimal. If the consumer switches decoders based on \`contentType\` or routes on a topic name, those fields belong in the pact.

| Metadata key | When to contract it | Risk if omitted |
|---|---|---|
| \`contentType\` | Multiple codecs on one queue | Consumer parses with wrong decoder |
| \`queue\` / \`topic\` | Binding verified in pact metadata | Wrong destination ships unnoticed |
| \`schemaVersion\` | Explicit envelope versioning | Silent dual-write confusion |
| \`correlationId\` | Usually generated | Prefer matchers, not exact values |
| Cloud event \`type\` | Event type routing | Consumer ignores new type strings |

Illustrative envelope with an explicit version field inside the body (often clearer than only metadata):

\`\`\`ts
export type ReservationRequestedV2 = {
  schemaVersion: '2';
  reservationId: string;
  sku: string;
  quantity: number;
  warehouseCode: string;
  requestedBy: string;
};
\`\`\`

When you introduce v2, add a new interaction description rather than silently changing v1. Consumers that only understand v1 keep their pact green while v2 adopters add a second interaction. Dual-publish periods become intentional, not accidental.

## Matchers that survive volatile IDs without hiding real breaks

Matchers are how message pacts stay stable. Over-matching (everything is \`like\`) hides breaks. Under-matching (exact UUIDs) makes contracts brittle.

| Field class | Matcher strategy | Example |
|---|---|---|
| Opaque ids | \`like\` sample string | \`reservationId\` |
| Enums | \`regex\` or explicit enum matcher | warehouse codes |
| Counts | integer / decimal matchers | \`quantity\` |
| Money | Decide string vs number once | never both |
| Timestamps | type-oriented matchers | ISO strings |
| Nested optional blocks | Optional matchers if supported | address block |

Consumer expectation focused on money type safety:

\`\`\`ts
.withJSONContent({
  orderId: like('ord_01'),
  currency: regex('^[A-Z]{3}$', 'EUR'),
  // Lock the type: producer must emit a number, not "10.00".
  totalCents: integer(1000),
  lines: [
    {
      sku: like('SKU-9'),
      quantity: integer(1),
      unitPriceCents: integer(1000),
    },
  ],
})
\`\`\`

What people get wrong: using a matcher so loose that both \`"2"\` and \`2\` pass when the consumer's TypeScript types only accept a number. Your handler test should still assert runtime types if the language would coerce values. Pact matchers and handler assertions are complementary.

## Failure mode: provider renames a field the consumer never sees in CI

### Story

\`orders-service\` renames \`warehouseCode\` to \`warehouse\` in the reservation event as part of a "cleanup" PR. Unit tests in orders still pass because they assert on the new field. Inventory's SuperTest suite still passes because HTTP APIs never changed. Kafka is shared in staging; a consumer lag dashboard looks fine. Days later, inventory stops reserving stock for a subset of orders. The messages land on the queue, get parsed, fail validation, and dead-letter. Nobody has a red contract build.

### Diagnosis

1. Inspect a dead-letter payload and compare it to the inventory handler's required fields.
2. Search both repos for \`ReservationRequested\` types. Notice the field rename is not coordinated.
3. Check whether a message pact exists. In this story, it did not.
4. Add the consumer pact and provider verification. Provider verification fails immediately on missing \`warehouseCode\`.

### Fix path

Restore the old field or dual-write during migration, add the pact, and only then remove the legacy name:

\`\`\`ts
// Temporary dual-write builder during migration
export function buildReservationRequestedEvent(input: {
  orderId: string;
}): ReservationRequested & { warehouse?: string } {
  const warehouseCode = 'DUB1';
  return {
    reservationId: \`res_\${input.orderId}\`,
    sku: 'SKU-1042',
    quantity: 2,
    warehouseCode,
    warehouse: warehouseCode,
  };
}
\`\`\`

Consumer pact still requires \`warehouseCode\` until inventory deploys a version that reads \`warehouse\`. Then inventory updates the pact, orders verifies against the new contract, and the dual-write is removed in a third PR. That sequence is boring on purpose. Contract testing message queue pacts make the boring sequence enforceable.

## What people get wrong about "just test with a local RabbitMQ"

Spinning up a broker in Docker is valuable for topology and delivery guarantees. It is a weak substitute for consumer-driven contracts:

1. **Shared fixtures hide breaks.** Producers and consumers can both adapt to the same docker-compose JSON fixture and still disagree in production when only one side deploys.
2. **Environment drift.** Local Rabbit is not SQS is not SNS is not Pub/Sub. You end up testing the adapter more than the payload contract.
3. **Slow feedback.** Container boot and queue purge costs multiply across microrepos.
4. **No broker of contracts.** Without a pact file and optional Pact Broker, you lack a versioned artifact that says "consumer v42 needs producer fields X."

Use broker-backed integration tests for delivery, ordering assumptions you actually require, and poison-message behavior. Use message pacts for shape, required fields, and metadata that cross team boundaries. The complementary HTTP side of the same service can stay on SuperTest for request/response APIs while events use message pacts.

## Broker publish flow and can-i-deploy gates for message pacts

After consumer CI writes the pact file, publish it to a Pact Broker (or PactFlow) with the consumer app version. Provider CI verifies against the broker-selected pacts, then publishes verification results. Deployment gates call can-i-deploy style checks so inventory only ships if orders still satisfies its contracts, and vice versa depending on your matrix.

Illustrative CI fragment (tool names and flags must match your chosen CLI version; treat this as structure, not a copy-paste of every flag):

\`\`\`yaml
# .github/workflows/inventory-consumer.yml
name: inventory-consumer
on: [push]
jobs:
  contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run test:pact:consumer
      - name: Publish pacts
        if: github.ref == 'refs/heads/main'
        env:
          PACT_BROKER_BASE_URL: \${{ secrets.PACT_BROKER_BASE_URL }}
          PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
          GIT_SHA: \${{ github.sha }}
        run: npm run pact:publish
\`\`\`

Provider side:

\`\`\`yaml
# .github/workflows/orders-provider.yml
name: orders-provider
on: [push]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run test:pact:provider
        env:
          PACT_BROKER_BASE_URL: \${{ secrets.PACT_BROKER_BASE_URL }}
          PACT_BROKER_TOKEN: \${{ secrets.PACT_BROKER_TOKEN }}
          GIT_SHA: \${{ github.sha }}
\`\`\`

Keep pact files out of "maybe" folders. Either commit them for small teams or publish exclusively from CI with broker as source of truth. Mixing both without discipline creates stale local files that hide real broker failures.

## Multi-consumer topics and fan-out contracts

One producer event often has several consumers: inventory, analytics, email. Each consumer should own its pact with the producer. The producer verifies all of them. That means a field analytics never reads can still be required by inventory, and removing it fails inventory's verification even if analytics stays green.

| Consumer | Cares about | Ignores |
|---|---|---|
| inventory-service | sku, quantity, warehouseCode | marketing UTM fields |
| analytics-service | orderId, totals, timestamps | warehouseCode |
| email-service | customer email, orderId | warehouseCode |

Do not collapse these into one "platform" consumer pact unless one team truly owns all reading logic. Fan-out is exactly where consumer-driven contracts earn their keep.

## Testing poison messages and negative contracts carefully

Pact consumer tests usually encode happy paths the consumer accepts. Negative cases (missing fields) are often better as plain unit tests on the handler without writing a pact that claims the provider will send invalid messages. You generally do not want a contract that says "provider will send broken payloads." Keep rejection logic in unit tests:

\`\`\`ts
// test/unit/reservation-handler.spec.ts
import { handleReservationRequested } from '../../src/inventory/reservation-handler';

describe('handleReservationRequested rejections', () => {
  it('rejects missing sku', () => {
    const result = handleReservationRequested({
      reservationId: 'res_1',
      sku: '',
      quantity: 1,
      warehouseCode: 'DUB1',
    });
    expect(result).toEqual({ ok: false, reason: 'missing_identity' });
  });

  it('rejects non-positive quantity', () => {
    const result = handleReservationRequested({
      reservationId: 'res_1',
      sku: 'SKU-1',
      quantity: 0,
      warehouseCode: 'DUB1',
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_quantity' });
  });
});
\`\`\`

Use contracts for the provider's promised good messages. Use unit tests for consumer resilience.

## Local developer loop without a broker

A fast loop looks like this:

1. Change consumer handler requirements.
2. Update consumer pact expectation.
3. Run consumer pact tests; produce updated file.
4. In producer repo (or monorepo package), run verification against that file.
5. Fix producer builder or negotiate the change.
6. Only then touch Docker-based topology tests if routing changed.

Monorepo tip: store pacts in an artifact directory and run provider verification in the same pipeline job matrix to avoid publish lag during early development. Multi-repo tip: use a broker earlier so versions stay explicit.

If your agents scaffold tests, point them at message handler seams rather than generated full-stack environments. Ready-made QA skills from qaskills.sh (via the qaskills CLI) can encode the consumer/provider file layout so agents stop inventing in-memory Redis stand-ins for every async boundary.

## Alignment with HTTP contracts on the same service

Orders may expose \`POST /orders\` (HTTP pact or SuperTest) and also emit \`ReservationRequested\` (message pact). Those are different consumers and different risks. An HTTP consumer might never see warehouse codes, while inventory only sees the event. Document the dual surface in the service README:

\`\`\`markdown
## Contracts
- HTTP: checkout-web -> orders-service (Pact)
- Messages: inventory-service <- orders-service ReservationRequested (message Pact)
- Messages: analytics-service <- orders-service OrderPaid (message Pact)
\`\`\`

Cross-link failing builds in PR templates so reviewers know which surface broke.

## Performance and determinism notes

Message pact tests should be deterministic. Avoid \`Date.now()\` in provider builders without matchers on the consumer side. Avoid reading unsettled feature flags. Seed clocks or pass fixed timestamps into builders. Keep verification parallel-safe: no single shared global port, no leftover files from previous runs in the same working directory without unique paths.

Illustrative timing budget for a small suite (measure your own): consumer message tests under a few seconds, provider verification under a few seconds per consumer pact. If verification needs minutes, you are probably bootstrapping too much application runtime.

## Checklist before you claim async contracts are covered

1. Handlers are transport-free and unit-testable.
2. Consumer interactions use matchers that lock types and required fields.
3. Metadata that affects decoding or routing is in the contract.
4. Provider maps interaction descriptions exactly.
5. Provider verification stubs IO and still runs real serializers.
6. Multi-consumer topics have per-consumer pacts.
7. CI publishes consumer contracts and verifies providers on main builds.
8. Migration renames use dual-write plus staged pact updates.
9. Broker topology tests exist separately for delivery guarantees you actually need.
10. Dead-letter dashboards are not your only contract signal.

## Frequently Asked Questions

### Do message queue pacts replace integration tests with Kafka or SQS?

No. They replace the subset of integration tests that only existed to assert JSON field names and types across services. You still need integration coverage for delivery semantics, IAM permissions, retry/backoff, and poison-message handling when those risks matter. The gain is that field renames fail before you pay for containers and shared environments.

### Which side writes the contract first in async Pact?

The consumer writes the expectation first, same as HTTP consumer-driven contracts. The producer verifies later. For brand-new events designed by the producer team, collaborate on a draft interaction, but still let the consumer's test own the committed contract so unused fields do not accumulate forever.

### Can one pact file cover both HTTP and message interactions?

Pact supports modeling different interaction types, but operationally many teams keep clarity by separating HTTP and message flows in configuration and CI jobs. Follow the guidance for your PactJS major version. Clarity beats cleverness: reviewers should see immediately whether a failure is a REST break or an event break.

### How do I version breaking changes to an event?

Add a new interaction (or schema version field) rather than silently changing an existing one. Dual-publish old and new events until all consumers verify against the new contract and deploy. Then remove the old interaction from consumer pacts and drop the legacy producer path. Message pacts make each step a CI-visible gate instead of a calendar guess.
`,
};
