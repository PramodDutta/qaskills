import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test RabbitMQ Dead-Letter Queues with Testcontainers',
  description:
    'Test RabbitMQ dead-letter queues with Testcontainers by verifying rejection, expiry, routing keys, x-death headers, policies, and deterministic message recovery.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test RabbitMQ Dead-Letter Queues with Testcontainers

The consumer rejects an invoice event, RabbitMQ republishes it to a dead-letter exchange, and the test waits on the parking queue. If the original queue has one wrong argument, the event disappears instead. A disposable RabbitMQ broker exposes that topology error in the same protocol environment the service uses, without sharing queues or policies with another test run.

Testcontainers is especially useful here because dead-lettering is broker behavior. A mocked channel can verify that code called nack, but it cannot prove exchange binding, routing-key replacement, expiry, x-death metadata, or the interaction between declaration arguments and policies.

## Identify every route a dead message can take

RabbitMQ dead-letters a message from a queue in several important situations: a consumer rejects or negatively acknowledges it with requeue=false, the message expires, the queue exceeds a configured length limit, or a quorum queue reaches its delivery limit. The dead-letter exchange then routes the republished message according to ordinary exchange rules.

For a basic integration test, model the topology explicitly:

| Element | Example name | Responsibility |
|---|---|---|
| Source exchange | billing.events | Receives normal business publications |
| Work queue | invoice.issue | Delivers events to the invoice consumer |
| Dead-letter exchange | billing.dead | Receives messages removed from the work queue |
| Parking queue | invoice.issue.parked | Holds failed messages for inspection or replay |
| Source binding key | invoice.requested | Selects events for the work queue |
| Dead-letter routing key | invoice.failed | Selects dead letters for the parking queue |

Use unique names per test or provision a broker per file or worker. RabbitMQ declarations are idempotent only when the properties match. Reasserting a queue with different arguments closes the channel with a precondition failure, which is useful evidence but confusing when leftover shared topology caused it.

## Start RabbitMQ and declare the failure topology

The Node.js Testcontainers module provides RabbitMQContainer. amqplib supplies the AMQP client. The setup below starts a broker, connects using its mapped URL, and declares a direct exchange pair with a source queue configured for dead-lettering.

\`\`\`typescript
import { RabbitMQContainer, type StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import amqp, { type Channel, type ChannelModel } from 'amqplib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('invoice dead-letter topology', () => {
  let container: StartedRabbitMQContainer;
  let connection: ChannelModel;
  let channel: Channel;

  beforeAll(async () => {
    container = await new RabbitMQContainer('rabbitmq:4.1-management').start();
    connection = await amqp.connect(container.getAmqpUrl());
    channel = await connection.createChannel();

    await channel.assertExchange('billing.events', 'direct', { durable: false });
    await channel.assertExchange('billing.dead', 'direct', { durable: false });
    await channel.assertQueue('invoice.issue', {
      durable: false,
      arguments: {
        'x-dead-letter-exchange': 'billing.dead',
        'x-dead-letter-routing-key': 'invoice.failed',
      },
    });
    await channel.assertQueue('invoice.issue.parked', { durable: false });
    await channel.bindQueue('invoice.issue', 'billing.events', 'invoice.requested');
    await channel.bindQueue('invoice.issue.parked', 'billing.dead', 'invoice.failed');
  }, 60_000);

  afterAll(async () => {
    await channel.close();
    await connection.close();
    await container.stop();
  });

  it('routes a rejected invoice request to the parking queue', async () => {
    const body = Buffer.from(JSON.stringify({ invoiceId: 'inv-402' }));
    channel.publish('billing.events', 'invoice.requested', body, {
      contentType: 'application/json',
      messageId: 'msg-reject-1',
    });

    const delivery = await waitForMessage(channel, 'invoice.issue');
    channel.nack(delivery, false, false);

    const parked = await waitForMessage(channel, 'invoice.issue.parked');
    expect(JSON.parse(parked.content.toString())).toEqual({ invoiceId: 'inv-402' });
    expect(parked.properties.messageId).toBe('msg-reject-1');
    channel.ack(parked);
  });
});
\`\`\`

The image tag should be pinned to a version your service supports. Updating it is an intentional compatibility exercise, not an incidental latest-tag change. The management variant is convenient for diagnostics but AMQP behavior is available in the standard image as well.

waitForMessage is not an amqplib method. It is a small test helper built from the real channel.get API, shown next. Naming it clearly avoids pretending the client automatically waits.

## Poll with a deadline, not an arbitrary sleep

Dead-lettering is asynchronous from the test's perspective. A fixed delay either wastes time or flakes under a slower CI host. Poll channel.get until a message arrives or a diagnostic deadline expires.

\`\`\`typescript
import type { Channel, GetMessage } from 'amqplib';

async function waitForMessage(
  channel: Channel,
  queue: string,
  timeoutMs = 5_000,
): Promise<GetMessage> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const message = await channel.get(queue, { noAck: false });
    if (message) return message;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  const state = await channel.checkQueue(queue);
  throw new Error(
    \`Timed out waiting for \${queue}; ready=\${state.messageCount}, consumers=\${state.consumerCount}\`,
  );
}
\`\`\`

Polling is acceptable in a broker integration test when the interval is short and the deadline is bounded. An event-driven basic.consume helper can be faster, but it needs cancellation and careful rejection handling. channel.get keeps ownership simple: the test receives one message and explicitly acknowledges it.

Always acknowledge messages consumed from inspection queues unless the test specifically studies redelivery. Otherwise teardown closes the channel with unacked deliveries, and a shared broker can present them to a later case.

## Prove rejection semantics, including requeue

The boolean arguments to channel.nack(message, allUpTo, requeue) are easy to reverse. Dead-lettering requires requeue=false. With requeue=true, RabbitMQ places the message back on its source queue, where a consumer can receive it again. channel.reject(message, false) is an alternative for one delivery.

A useful pair of tests establishes both branches:

| Consumer action | Expected source queue | Expected dead-letter queue |
|---|---|---|
| ack(message) | Message removed | Empty |
| reject(message, false) | Message removed | Receives dead letter |
| nack(message, false, false) | Message removed | Receives dead letter |
| nack(message, false, true) | Message becomes eligible again | Empty at that point |

When testing application consumers, prefer invoking the actual handler registration and publishing through AMQP. Throwing an exception does not inherently tell RabbitMQ what to do. The wrapper may ack, nack, reject, reconnect, or leave the delivery unacknowledged. Assert the broker outcome rather than assuming framework defaults.

For redelivery, inspect message.fields.redelivered after requeue and subsequent delivery. Do not build an unbounded poison-message test that immediately requeues forever. Limit deliveries in the consumer, cancel it at the end, or use a quorum-queue delivery policy if that is the production design.

## Verify expiration without racing the broker

Expired messages can be dead-lettered through a per-message expiration property or a queue-level x-message-ttl argument. Queue TTL is convenient for deterministic tests because every message shares the configured limit. Use a small but not microscopic value; scheduling jitter makes a 1 ms expectation needlessly fragile.

\`\`\`typescript
it('dead-letters an unconsumed message after queue TTL', async () => {
  const sourceQueue = 'payment.authorize.expiring';
  const parkedQueue = 'payment.authorize.expired';

  await channel.assertQueue(sourceQueue, {
    durable: false,
    arguments: {
      'x-message-ttl': 250,
      'x-dead-letter-exchange': 'billing.dead',
      'x-dead-letter-routing-key': 'payment.expired',
    },
  });
  await channel.assertQueue(parkedQueue, { durable: false });
  await channel.bindQueue(sourceQueue, 'billing.events', 'payment.requested');
  await channel.bindQueue(parkedQueue, 'billing.dead', 'payment.expired');

  channel.publish(
    'billing.events',
    'payment.requested',
    Buffer.from('{"paymentId":"pay-91"}'),
    { messageId: 'msg-expiry-1' },
  );

  const expired = await waitForMessage(channel, parkedQueue, 5_000);
  expect(expired.properties.messageId).toBe('msg-expiry-1');
  expect(expired.properties.headers['x-first-death-reason']).toBe('expired');
  channel.ack(expired);
});
\`\`\`

Do not consume from the source queue in this case because consumption changes the route being tested. Also avoid sleeping exactly the TTL and immediately asserting. The TTL makes the message eligible for expiration; polling gives the broker time to perform dead-lettering while preserving a firm upper bound.

RabbitMQ expiration behavior can be affected by queue ordering and version-specific details. Design the test around a dedicated empty queue with one message. A backlog of earlier non-expired messages introduces behavior unrelated to the intended assertion.

## Inspect x-death as structured history

When RabbitMQ dead-letters a message, it adds headers describing the event. The x-death header is an array of tables, commonly including queue, reason, count, exchange, routing-keys, and time. RabbitMQ compresses repeated events with the same queue and reason into an entry whose count increases.

Avoid snapshotting the entire AMQP value. Timestamp representations and table details may vary by client and broker. Find the entry for the relevant queue and reason, then assert fields that express the recovery policy.

\`\`\`typescript
type DeathRecord = {
  queue?: string;
  reason?: string;
  count?: number;
  exchange?: string;
  'routing-keys'?: string[];
};

const deaths = parked.properties.headers['x-death'] as DeathRecord[];
const rejected = deaths.find(
  (entry) => entry.queue === 'invoice.issue' && entry.reason === 'rejected',
);

expect(rejected).toMatchObject({
  queue: 'invoice.issue',
  reason: 'rejected',
  exchange: 'billing.events',
});
expect(rejected?.count).toBeGreaterThanOrEqual(1);
\`\`\`

Header shape typing is local test convenience, not an amqplib export. Inspect actual deliveries when adopting it. Also distinguish x-first-death and x-last-death annotations from entries in x-death. Each answers a different operational question.

If an application republishes a parked message itself, decide whether it preserves headers. Blindly copying every header can retain stale death history or internal routing metadata. Deliberately preserving x-death can support retry limits, but test that decision as part of the replay contract.

## Exercise routing-key replacement

Without x-dead-letter-routing-key, a dead-lettered message normally uses its original routing keys for the new exchange, subject to RabbitMQ's rules. Setting the queue argument replaces that route with the configured key. A direct dead-letter exchange makes mistakes obvious: an unmatched key leaves no parked copy.

Test the exact topology used in production. A fanout exchange ignores routing keys. A topic exchange can direct timeout.*, validation.*, and authorization.* failures to separate queues. A headers exchange evaluates headers rather than a string pattern. The exchange type changes what constitutes meaningful coverage.

| Dead-letter exchange type | Valuable assertion | Typical error exposed |
|---|---|---|
| Direct | Exact configured routing key reaches one queue | Misspelling or missing binding |
| Topic | Reason-specific pattern reaches intended parking queue | Pattern too broad or segment mismatch |
| Fanout | Every bound diagnostic queue receives a copy | Unexpected extra binding |
| Headers | Required header set selects recovery workflow | Header lost during republish |

Unroutable dead letters are not automatically stored simply because they came from a queue. The dead-letter exchange needs a matching binding. An integration test should query the intended parking queue and fail with topology details when nothing arrives.

## Prefer policies for mutable production configuration

RabbitMQ documentation recommends policies over hardcoded x-arguments for dead-letter exchange settings because policies can be changed without redeploying applications and deleting queues. Tests should reflect how production config is actually supplied. If operators apply a policy, starting a plain broker and declaring x-arguments proves a different system.

You can create definitions through RabbitMQ configuration, the management HTTP API, or rabbitmqctl inside an appropriately prepared container. The exact Testcontainers setup depends on how your organization packages broker configuration. Keep a contract fixture containing policy name, pattern, priority, applies-to value, and definition, then assert that the declared queue matches and messages follow the expected route.

Hardcoded arguments remain useful for a compact application-owned topology and for focused tests like the examples above. The tradeoff is operational mutability. A queue cannot be redeclared with conflicting x-arguments; changing them usually requires deleting and recreating it. A policy can be updated on a live broker, subject to priority and operator-policy rules.

The companion [RabbitMQ Testcontainers integration guide](/blog/testcontainers-rabbitmq-node-integration-testing) covers container lifecycle, connection setup, and broader publish-consume tests. The [RabbitMQ contract testing guide](/blog/rabbitmq-contract-testing-guide) addresses message schemas and producer-consumer compatibility, which dead-letter routing alone does not validate.

## Isolate cases and keep broker evidence

One broker per test offers maximum isolation but can dominate runtime. One broker per file or worker is a reasonable compromise when every case uses unique exchanges and queues. Generate names from a stable test identifier plus worker ID, and delete auto-delete topology only after messages are settled.

Avoid auto-generated queue names when operational naming is part of the contract. If production expects invoice.issue.parked, assert that exact declaration in a broker dedicated to the case. For general delivery mechanics, server-named exclusive queues reduce collision risk.

On failure, retain these diagnostics in the assertion or test log:

- Queue name and message count from checkQueue.
- Exchange type and binding keys declared by the fixture.
- Message ID or correlation ID published.
- Headers of any message found in the wrong queue.
- Broker container logs near channel closure or precondition failure.
- Consumer cancellation and connection errors.

Do not dump message bodies that may contain secrets or personal data in a real environment. Testcontainers should use synthetic payloads, making diagnostic capture safer.

## Distinguish a DLQ check from a retry-system check

A dead-letter queue is only one component of failure handling. Production designs may send a failed message to a delay queue with TTL, dead-letter it back to the work exchange, increment death history, and eventually park it. Testing a single rejection proves the first hop, not the whole retry loop.

Model each transition with a bounded expectation. Publish one identified message, observe its first failure route, wait for the delay expiry, observe redelivery, and finally verify parking after the configured limit. Ensure the consumer cannot create an infinite cycle if an assertion fails. Teardown should cancel consumers before closing channels and the broker.

Retries can duplicate side effects. Include idempotency tests at the consumer boundary, using a stable message ID and a real persistence store when appropriate. RabbitMQ delivery guarantees do not make application writes exactly once.

## Test topology failure instead of assuming durability

Recovery design should define what happens when the dead-letter exchange is missing or cannot route the message. RabbitMQ does not turn an unroutable dead letter into a durable parking record automatically. A topology smoke test can deliberately omit the parking binding, reject a uniquely identified message, and prove that operational detection sees the loss condition. Keep this destructive case on its own temporary exchange and queue.

Permissions deserve a separate container configuration when production users have restricted configure, write, and read patterns. The application may successfully consume from the work queue but lack permission to declare recovery topology. Test startup should fail clearly rather than running with a partially declared system. Do not grant the test connection administrator rights if the production connection does not have them, except in fixture setup that uses a distinct administrative identity.

Durability also spans broker restart. durable=true on a queue and exchange is insufficient when publications are not persistent, and publisher confirms are separate from consumer acknowledgements. If restart survival is a requirement, publish a persistent message, wait for a broker confirm through a confirm channel, restart the container or broker process using a controlled test setup, and then inspect the expected queue. That scenario is slower and belongs in a focused resilience suite, not every pull request path.

These tests answer different questions: routing cases verify dead-letter rules, permission cases verify deployability, and restart cases verify persistence. Keeping them separate makes failures actionable.

## Frequently Asked Questions

### Why did nack send the message back to the work queue?

The requeue argument was likely true. For channel.nack(message, false, false), the final false instructs RabbitMQ not to requeue, allowing dead-letter configuration to apply. Verify wrapper defaults if a framework owns acknowledgements.

### Can a dead-letter exchange be declared after the source queue?

The source queue can reference an exchange name in its arguments, but dead-lettering will not succeed as intended if the exchange and bindings are absent when the event occurs. Declare and bind the recovery topology before publishing the test message.

### Should each test start its own RabbitMQ container?

Not necessarily. A container per worker or test file is faster and remains reliable with unique topology names and complete cleanup. Use a container per case for tests that change broker-wide policies, plugins, or definitions.

### Why is x-death an array instead of one object?

A message can die in different queues for different reasons. RabbitMQ records multiple histories and compresses repeated matching events by increasing count. Locate the record by queue and reason rather than assuming array position zero.

### Does a DLQ test validate the message schema?

No. It proves broker routing and, if asserted, metadata preservation. Schema compatibility requires producer and consumer checks for payload fields, content type, versioning, and semantic constraints.
`,
};
