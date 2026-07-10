import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'RabbitMQ Contract Testing Guide',
  description:
    'Create RabbitMQ contract testing for exchanges, routing keys, headers, payload schemas, acknowledgements, and consumer compatibility in CI pipelines.',
  date: '2026-07-10',
  category: 'API Testing',
  content: `
# RabbitMQ Contract Testing Guide

RabbitMQ contract failures are rarely limited to a JSON field. A producer can publish to the right exchange with the wrong routing key. A consumer can bind to a pattern that no longer matches. A message can be valid JSON but missing the header that drives retries or tenant isolation. Contract testing for RabbitMQ has to cover broker topology and message semantics together.

This guide shows how to test exchange declarations, routing keys, headers, payload schemas, and consumer compatibility using real AMQP behavior. For Node integration setup with disposable brokers, see [Testcontainers RabbitMQ Node integration testing](/blog/testcontainers-rabbitmq-node-integration-testing). For the broader event-driven QA strategy around producers and consumers, read [Event-driven architecture testing guide](/blog/event-driven-architecture-testing-guide).

## RabbitMQ contracts include topology

In HTTP APIs, the endpoint path and payload are usually enough to start a contract discussion. In RabbitMQ, the exchange type, queue binding, routing key, delivery mode, content type, headers, and acknowledgement behavior can all be part of the contract. If any one of them drifts, the consumer may never see the message or may process it incorrectly.

Write the contract in a form the team can review. It can be AsyncAPI, JSON files, TypeScript constants, or another internal schema. The important point is that tests derive expectations from it and block accidental changes.

| Contract element | RabbitMQ concept | Test assertion | Breakage example |
|---|---|---|---|
| Exchange name | assertExchange | orders.events exists as topic exchange | Producer publishes to order.events and no queue receives it. |
| Exchange type | direct, topic, fanout, headers | Declared type matches contract | Topic wildcard binding stops working after direct exchange change. |
| Routing key | publish routingKey | Producer sends order.created.v1 | Consumer binding order.*.v1 misses order-created-v1. |
| Queue binding | bindQueue | Queue is bound to exchange with expected pattern | Consumer queue exists but is never routed messages. |
| Payload schema | Message body | Ajv or schema validator accepts body | totalCents becomes string and billing consumer fails. |
| Headers | AMQP properties.headers | Required tenant, event type, version present | Retry or tenant routing cannot classify message. |
| Acknowledgement mode | ack, nack, reject | Consumer acks success and nacks retryable failure | Poison message loops or silently disappears. |

## Verifying topology with amqplib

The amqplib package gives direct access to RabbitMQ channel operations. A topology contract test should connect to a disposable broker, declare the exchange and queue exactly as production code expects, bind the queue, publish a probe message, and assert that it is routed. This catches mismatched exchange type and routing key patterns.

\`\`\`typescript
import amqp from 'amqplib';

test('orders created messages route to the billing queue', async () => {
  const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
  const channel = await connection.createChannel();

  try {
    await channel.assertExchange('orders.events', 'topic', { durable: true });
    const queue = await channel.assertQueue('contract.billing.orders', {
      durable: false,
      exclusive: true,
      autoDelete: true,
    });
    await channel.bindQueue(queue.queue, 'orders.events', 'order.created.v1');

    channel.publish(
      'orders.events',
      'order.created.v1',
      Buffer.from(JSON.stringify({ orderId: 'ord_123', totalCents: 1299 })),
      {
        contentType: 'application/json',
        headers: { eventType: 'OrderCreated', eventVersion: '1' },
      },
    );

    const message = await channel.get(queue.queue, { noAck: true });

    expect(message).not.toBe(false);
    expect(message && message.fields.routingKey).toBe('order.created.v1');
    expect(message && message.properties.headers).toMatchObject({
      eventType: 'OrderCreated',
      eventVersion: '1',
    });
  } finally {
    await channel.close();
    await connection.close();
  }
});
\`\`\`

This test is intentionally small. It does not run the whole billing service. It proves that the declared exchange, binding, routing key, and headers are coherent. Consumer behavior gets its own tests.

## Payload validation is necessary but not sufficient

Message body validation catches shape drift. It does not catch a missing header, nonpersistent delivery mode, wrong exchange, or incorrect routing key. Keep payload validation as one layer in the contract suite.

Use the same schema format your consumers rely on. If messages are JSON, Ajv with JSON Schema is a good fit. If messages use Avro, Protobuf, or another binary format, use that schema tooling. The test should validate both producer fixtures and messages captured from producer code.

\`\`\`typescript
import Ajv from 'ajv';

const orderCreatedSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['orderId', 'customerId', 'totalCents', 'currency'],
  properties: {
    orderId: { type: 'string', minLength: 1 },
    customerId: { type: 'string', minLength: 1 },
    totalCents: { type: 'integer', minimum: 0 },
    currency: { type: 'string', pattern: '^[A-Z]{3}$' },
  },
};

test('producer order.created.v1 payload satisfies consumer schema', () => {
  const message = buildOrderCreatedMessage({
    orderId: 'ord_123',
    customerId: 'cus_456',
    totalCents: 1299,
    currency: 'USD',
  });

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(orderCreatedSchema);

  expect(message.exchange).toBe('orders.events');
  expect(message.routingKey).toBe('order.created.v1');
  expect(message.properties.contentType).toBe('application/json');
  expect(message.properties.headers).toMatchObject({
    eventType: 'OrderCreated',
    eventVersion: '1',
  });
  expect(validate(JSON.parse(message.body.toString('utf8')))).toBe(true);
  expect(validate.errors).toBeNull();
});
\`\`\`

The producer helper returns the exact exchange, routing key, properties, and body passed to channel.publish. If your application constructs those inline, extract the construction. It makes contract drift visible in code review.

## Routing key compatibility

RabbitMQ topic routing keys are string APIs. Changing separators, word order, pluralization, or version placement can break bindings. A consumer bound to order.*.v1 will not receive order.created.us.v1 unless that pattern is updated. A consumer bound to order.# may receive more than intended.

Test the routing matrix explicitly. The contract should state which keys route to which queues and which keys must not. This is especially important when teams use broad wildcard bindings during early development and later discover a consumer is processing unrelated events.

| Routing key | Billing queue | Search index queue | Audit queue | Contract note |
|---|---:|---:|---:|---|
| order.created.v1 | Yes | Yes | Yes | New order affects all three consumers. |
| order.cancelled.v1 | Yes | Yes | Yes | Billing reverses pending charge, search removes availability. |
| order.payment_failed.v1 | Yes | No | Yes | Search should not receive payment-only events. |
| inventory.adjusted.v1 | No | Yes | Yes | Billing must not receive inventory-only event. |
| customer.updated.v1 | No | Yes | Yes | Billing receives this only through a separate customer contract. |
| order.created.v2 | No until migrated | No until migrated | Yes | Audit may observe new versions before business consumers opt in. |

## Consumer compatibility tests

Consumer contract tests should verify that the consumer accepts all messages it claims to support and rejects or dead-letters messages it cannot process. Do not stop at handler unit tests that pass a parsed object. Test the message envelope too, including headers and content type.

A useful consumer test calls the consumer handler with a real amqplib-like message object. It asserts that success leads to ack, retryable failure leads to nack with requeue policy, and invalid contract leads to reject or dead-letter behavior depending on your design.

\`\`\`typescript
test('billing consumer acks a valid order created message', async () => {
  const channel = {
    ack: vi.fn(),
    nack: vi.fn(),
    reject: vi.fn(),
  };

  const message = {
    content: Buffer.from(
      JSON.stringify({
        orderId: 'ord_123',
        customerId: 'cus_456',
        totalCents: 1299,
        currency: 'USD',
      }),
    ),
    properties: {
      contentType: 'application/json',
      headers: { eventType: 'OrderCreated', eventVersion: '1' },
    },
    fields: { routingKey: 'order.created.v1' },
  };

  await handleBillingMessage(message as any, channel as any);

  expect(channel.ack).toHaveBeenCalledWith(message);
  expect(channel.nack).not.toHaveBeenCalled();
  expect(channel.reject).not.toHaveBeenCalled();
});
\`\`\`

This checks the acknowledgement contract. A consumer that processes the message but forgets to ack will create duplicate delivery under manual acknowledgement mode. That is a production behavior, not a test detail.

## Dead-letter and retry contracts

Retries are part of the consumer contract. A retryable downstream timeout and a permanently invalid payload should not behave the same way. RabbitMQ dead-letter exchanges, retry queues, and message headers make this explicit, but tests need to cover them.

| Failure | Consumer action | Routing expectation | Test assertion |
|---|---|---|---|
| JSON parse error | Reject without requeue | Dead-letter as invalid contract | reject called with requeue false, error metric emitted. |
| Missing required header | Reject without requeue | Dead-letter as invalid contract | Consumer does not call business handler. |
| Downstream 503 | Nack with requeue or publish to retry exchange | Message retried under policy | nack or retry publish includes retry count. |
| Duplicate event id | Ack after idempotency check | No retry | Business state unchanged, ack called. |
| Unknown eventVersion | Reject or route to compatibility handler | Version migration path used | No silent success on unsupported version. |

The exact retry design varies by team. The test should match the design and make it visible. Silent catch-and-ack on every error is easy to write and expensive to operate.

## Contract review for exchange changes

Changing an exchange type is a breaking change unless every binding is reviewed. A topic exchange and direct exchange can share the same name in code review, but they do not route the same way. RabbitMQ will also reject redeclaring an existing exchange with a different type in the same broker. That failure may appear during deployment rather than unit tests if you do not test topology.

Treat exchange changes like database migrations. Plan creation, binding migration, dual publish if needed, consumer rollout, and old exchange removal. Contract tests should cover both old and new paths during the migration window if consumers run side by side.

## Publisher confirms and durability expectations

For business-critical messages, the producer contract may include publisher confirms and persistent delivery. A test that only checks channel.publish return value does not prove the broker accepted the message durably. RabbitMQ confirm channels let the producer wait for broker acknowledgement. If the contract says order events must not be fire-and-forget, the producer should use a confirm channel or an equivalent reliability pattern.

You do not need to test RabbitMQ itself. Test that your publisher uses the agreed mode and message properties. If the message should survive broker restart, deliveryMode or persistent settings matter. If the message is transient telemetry, durable persistence may be unnecessary overhead. The contract should distinguish those cases.

| Message type | Reliability expectation | Producer contract check |
|---|---|---|
| Order created | Persistent, broker confirm required | Confirm channel used and persistent property set. |
| Password reset email request | Persistent or retry-backed | Message id and idempotency key present. |
| Search indexing hint | Retryable but not user-blocking | Dead-letter path or replay source documented. |
| Analytics event | Often transient | Loss tolerance documented, no false durability claim. |
| Audit event | Persistent and immutable | Confirm required, audit routing key tested. |

## Message identifiers and idempotency

RabbitMQ can redeliver messages. Consumers should assume at-least-once delivery unless the architecture proves otherwise. Contract tests should verify idempotency fields for events that cause side effects. A billing consumer that charges a card needs an event id or business id it can use to prevent duplicate work.

Put the idempotency key in a stable place: messageId property, eventId header, or payload field. Do not let every producer invent a different location. The consumer contract should state which one it reads. Then test duplicate delivery by calling the handler twice with the same message and asserting the side effect occurs once while both deliveries are acked or handled according to policy.

| Idempotency field | Where it lives | Consumer use |
|---|---|---|
| messageId | AMQP basic properties | Generic deduplication across event types. |
| eventId | Header or payload | Domain event tracking and audit. |
| orderId plus eventType | Payload and header | Entity-specific idempotency when event ids are absent. |
| causationId | Header | Trace workflow that produced the event. |
| correlationId | AMQP property | Connect request, event, and logs across services. |

## Poison messages and parking queues

A malformed message should not block a queue forever. RabbitMQ consumers need a poison-message policy: reject to dead-letter, park after retry count, or alert and stop consumption for severe contract violations. Contract tests should simulate invalid JSON, unsupported version, missing header, and handler exception separately. They are not the same failure.

Dead-letter tests should assert routing, not only method calls. In an integration test with a disposable broker, publish an invalid message, let the consumer process it, and assert it appears on the dead-letter queue with enough metadata to investigate. That metadata may include original exchange, routing key, error reason, and retry count. Without it, dead-letter queues become warehouses of mystery bytes.

## Topology migration tests

Topology migration deserves a temporary contract state. Suppose a direct exchange is being replaced by a topic exchange. During migration, the producer may dual publish, consumers may bind to both exchanges, and the old exchange may be removed later. Tests should encode that stage so a cleanup commit does not happen before every consumer has moved.

Use migration-specific test names. A test called routes order.created.v2 during dual publish is clearer than a generic routing still works. When migration ends, delete the old-path tests in the same pull request that removes the old binding. Leaving stale migration tests around encourages accidental permanent complexity.

| Migration stage | Producer test | Consumer test |
|---|---|---|
| Before migration | Publishes only old exchange and key | Consumes only old binding. |
| Dual publish | Publishes old and new messages from one domain event | Consumer accepts old while new consumer is introduced. |
| Consumer migrated | New message accepted, old still tolerated if backlog exists | Old queue drains without new writes. |
| Cleanup | Old publish path removed | Old binding test removed with explicit review. |

## Observability for contract failures

RabbitMQ contract failures need logs and metrics with broker vocabulary. A message rejected for missing eventVersion should log exchange, routing key, consumer name, message id, and reason. It should not log sensitive payloads by default. Metrics should separate invalid contract, retryable downstream failure, duplicate ignored, and successful ack.

These dimensions make production incidents easier to triage. If invalid_contract_count rises after a producer deploy, the consumer is doing its job by refusing bad messages. If retry_count rises with downstream_timeout, the issue is likely dependency health. If duplicate_ignored rises, redelivery or publisher retry behavior needs investigation.

## Contract fixtures from captured messages

Production captures can improve RabbitMQ contracts, but they need cleaning before they become fixtures. Remove secrets, customer personal data, and environment-specific identifiers. Keep the structural parts that matter: exchange, routing key, headers, content type, message id, and a representative payload shape. Then add the sanitized fixture to the producer and consumer contract suites.

Captured fixtures are especially useful for optional fields. Documentation often shows the ideal message, while production shows combinations created by older clients, partial workflows, or regional rules. A consumer that only accepts the ideal fixture is not compatible with the stream it actually receives.

Treat captured fixtures as evidence, not as a dumping ground. Each one should have a reason: old version replay, missing optional field, maximum line item count, duplicate delivery, unsupported version, or dead-letter case. If nobody can explain the fixture, it will become noise and slow the suite without protecting a real behavior.

Rotate fixtures when the contract version retires. Keeping every historical message forever makes failures harder to interpret and can imply compatibility promises the team no longer offers. Archive retired fixtures with the migration record instead, including the owning consumer, retirement date, and broker version used.

## Frequently Asked Questions

### Is validating the JSON payload enough for RabbitMQ contracts?

No. Payload validation is only one layer. RabbitMQ contracts also include exchange name, exchange type, routing key, queue binding, headers, content type, and acknowledgement behavior.

### Should contract tests declare real exchanges and queues?

Yes, in an isolated broker. Declaring topology in a disposable RabbitMQ instance catches exchange type and binding mistakes that pure unit tests miss. Do not run those tests against a shared production broker.

### How should routing key changes be versioned?

If consumers need to opt in, use a new versioned key or binding and run both paths during migration. Avoid changing a routing key in place unless every consumer binding is updated in the same coordinated release.

### What should happen to invalid messages?

Invalid contract messages should usually be rejected without requeue and sent to a dead-letter path for inspection. Retry loops are for temporary failures, not permanently malformed payloads.

### How do I test acknowledgement behavior?

Pass a realistic message object to the consumer and mock the channel ack, nack, and reject methods. Assert the exact method and requeue choice for success, retryable failure, and invalid contract cases.
`,
};
