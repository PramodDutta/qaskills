import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Event-Driven Architectures: Kafka, RabbitMQ, and Async Systems Guide',
  description:
    'Complete guide to testing event-driven architectures. Covers Kafka testing patterns, RabbitMQ queue verification, async system testing, message contract validation, saga testing, and AI-assisted event testing with QASkills.',
  date: '2026-03-17',
  category: 'Guide',
  content: `
Event-driven architectures have become the backbone of modern distributed systems. From Kafka-powered data pipelines to RabbitMQ-based microservice communication, asynchronous messaging introduces a fundamentally different testing challenge compared to synchronous request-response APIs. Traditional testing approaches -- send request, assert response -- simply do not work when your system is built around eventual consistency, message ordering, and decoupled producers and consumers.

This comprehensive guide covers everything you need to know about testing event-driven architectures in 2026, from foundational patterns to advanced techniques using Testcontainers, contract testing, and AI-assisted test generation through **qaskills.sh**.

## Key Takeaways

- **Event-driven systems require a fundamentally different testing mindset** -- you must account for eventual consistency, message ordering, idempotency, and non-deterministic timing in every test
- **Testcontainers is the gold standard** for integration testing Kafka, RabbitMQ, and Redis Streams with real broker instances in ephemeral Docker containers
- **Contract testing with AsyncAPI and Pact** prevents breaking changes across independently deployed producers and consumers
- **Saga and choreography patterns** need dedicated compensation testing to verify that distributed transactions roll back correctly on failure
- **Dead letter queue monitoring and distributed tracing** are testable concerns -- your test suite should verify observability works, not just business logic
- **QASkills provides installable testing knowledge** for event-driven patterns that AI agents can use to generate production-grade async test suites

---

## Why Event-Driven Architecture Testing is Different

Testing a REST API is conceptually straightforward: send a request, receive a response, assert on the result. Event-driven systems break this model in several critical ways:

**No synchronous response.** When a producer publishes an event to Kafka or RabbitMQ, it does not receive a business-logic response. The producer only knows the broker accepted the message. What happens downstream is invisible to the sender.

**Temporal decoupling.** Consumers may process events milliseconds or minutes after publication. Tests must handle this non-deterministic timing without resorting to brittle \`Thread.sleep()\` calls.

**Multiple consumers.** A single event may trigger actions in five different services. Testing the full chain requires orchestrating multiple consumers and verifying all side effects.

**Message ordering.** Kafka guarantees ordering within a partition, but not across partitions. RabbitMQ provides no ordering guarantees by default. Tests must account for out-of-order delivery.

**Idempotency requirements.** Network failures, consumer restarts, and rebalancing mean consumers may receive the same message multiple times. Every consumer must be testably idempotent.

**Schema evolution.** Events published today must be consumable by consumers deployed months from now. Backward and forward compatibility must be tested explicitly.

These challenges demand specialized testing patterns that go far beyond traditional unit and integration tests.

---

## Testing Fundamentals for Async Systems

Before diving into specific technologies, let us establish the foundational testing concepts for any asynchronous, event-driven system.

### Eventual Consistency Testing

The most common mistake in async testing is asserting on state immediately after publishing an event. Instead, you need polling-based assertions that wait for the system to reach the expected state:

\`\`\`typescript
// BAD: Immediate assertion -- will fail intermittently
await producer.send({ topic: 'orders', messages: [{ value: JSON.stringify(order) }] });
const result = await db.query('SELECT status FROM orders WHERE id = \$1', [order.id]);
expect(result.rows[0].status).toBe('PROCESSING'); // Race condition!

// GOOD: Polling assertion with timeout
await producer.send({ topic: 'orders', messages: [{ value: JSON.stringify(order) }] });
await waitForCondition(
  async () => {
    const result = await db.query('SELECT status FROM orders WHERE id = \$1', [order.id]);
    return result.rows[0]?.status === 'PROCESSING';
  },
  { timeout: 10000, interval: 200, description: 'Order status should become PROCESSING' }
);
\`\`\`

A robust \`waitForCondition\` utility is essential for any event-driven test suite:

\`\`\`typescript
interface WaitOptions {
  timeout: number;
  interval: number;
  description?: string;
}

async function waitForCondition(
  condition: () => Promise<boolean>,
  options: WaitOptions
): Promise<void> {
  const { timeout, interval, description } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(
    \`Timed out after \${timeout}ms waiting for condition: \${description || 'unknown'}\`
  );
}
\`\`\`

### Message Ordering Tests

When your system relies on message ordering, you must explicitly test both the happy path (ordered delivery) and failure scenarios (out-of-order delivery):

\`\`\`typescript
describe('Order event processing', () => {
  it('should process events in order within the same partition key', async () => {
    const orderId = 'order-123';
    const events = [
      { type: 'ORDER_CREATED', orderId, timestamp: 1 },
      { type: 'PAYMENT_RECEIVED', orderId, timestamp: 2 },
      { type: 'ORDER_SHIPPED', orderId, timestamp: 3 },
    ];

    for (const event of events) {
      await producer.send({
        topic: 'order-events',
        messages: [{ key: orderId, value: JSON.stringify(event) }],
      });
    }

    await waitForCondition(async () => {
      const order = await orderRepository.findById(orderId);
      return order?.status === 'SHIPPED';
    }, { timeout: 15000, interval: 300, description: 'Order should reach SHIPPED status' });

    const auditLog = await auditRepository.getEvents(orderId);
    expect(auditLog.map((e: { type: string }) => e.type)).toEqual([
      'ORDER_CREATED',
      'PAYMENT_RECEIVED',
      'ORDER_SHIPPED',
    ]);
  });

  it('should handle out-of-order events gracefully', async () => {
    const orderId = 'order-456';
    // Simulate out-of-order delivery
    await producer.send({
      topic: 'order-events',
      messages: [{ key: orderId, value: JSON.stringify({ type: 'ORDER_SHIPPED', orderId }) }],
    });
    await producer.send({
      topic: 'order-events',
      messages: [{ key: orderId, value: JSON.stringify({ type: 'ORDER_CREATED', orderId }) }],
    });

    await waitForCondition(async () => {
      const dlq = await dlqRepository.getMessages('order-events');
      return dlq.some((m: { orderId: string }) => m.orderId === orderId);
    }, { timeout: 10000, interval: 300, description: 'Out-of-order event should be sent to DLQ' });
  });
});
\`\`\`

### Idempotency Testing

Every consumer must handle duplicate messages safely. Test this explicitly:

\`\`\`typescript
it('should process duplicate messages idempotently', async () => {
  const event = { type: 'PAYMENT_RECEIVED', orderId: 'order-789', amount: 99.99 };
  const message = { key: event.orderId, value: JSON.stringify(event) };

  // Send the same message three times
  await producer.send({ topic: 'payments', messages: [message] });
  await producer.send({ topic: 'payments', messages: [message] });
  await producer.send({ topic: 'payments', messages: [message] });

  await waitForCondition(async () => {
    const payments = await paymentRepository.findByOrderId('order-789');
    return payments.length >= 1;
  }, { timeout: 10000, interval: 300, description: 'Payment should be processed' });

  // Wait a bit more to ensure no additional processing
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const payments = await paymentRepository.findByOrderId('order-789');
  expect(payments).toHaveLength(1);
  expect(payments[0].amount).toBe(99.99);
});
\`\`\`

---

## Kafka Testing Patterns

Apache Kafka is the most widely adopted event streaming platform. Testing Kafka-based systems requires understanding its partitioning model, consumer group mechanics, and exactly-once semantics.

### Producer Testing

Kafka producer tests verify that events are serialized correctly, sent to the right topic, and partitioned as expected:

\`\`\`typescript
import { Kafka, CompressionTypes } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

describe('OrderEventProducer', () => {
  let producer: ReturnType<Kafka['producer']>;
  let registry: SchemaRegistry;

  beforeAll(async () => {
    const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKER!] });
    producer = kafka.producer();
    registry = new SchemaRegistry({ host: process.env.SCHEMA_REGISTRY_URL! });
    await producer.connect();
  });

  afterAll(async () => {
    await producer.disconnect();
  });

  it('should produce a valid order event with correct schema', async () => {
    const orderEvent = {
      orderId: 'test-order-001',
      customerId: 'cust-123',
      items: [{ productId: 'prod-1', quantity: 2, price: 29.99 }],
      totalAmount: 59.98,
      createdAt: new Date().toISOString(),
    };

    const schemaId = await registry.getLatestSchemaId('order-events-value');
    const encodedValue = await registry.encode(schemaId, orderEvent);

    const result = await producer.send({
      topic: 'order-events',
      compression: CompressionTypes.GZIP,
      messages: [
        {
          key: orderEvent.orderId,
          value: encodedValue,
          headers: { 'event-type': 'ORDER_CREATED', 'correlation-id': 'corr-abc-123' },
        },
      ],
    });

    expect(result[0].errorCode).toBe(0);
    expect(result[0].topicName).toBe('order-events');
  });
});
\`\`\`

### Consumer Testing

Consumer tests are more complex because they must verify message processing logic, offset management, and error handling:

\`\`\`typescript
describe('OrderEventConsumer', () => {
  it('should process ORDER_CREATED events and persist to database', async () => {
    const testEvent = {
      orderId: 'consumer-test-001',
      customerId: 'cust-456',
      items: [{ productId: 'prod-2', quantity: 1, price: 49.99 }],
      totalAmount: 49.99,
      createdAt: new Date().toISOString(),
    };

    await producer.send({
      topic: 'order-events',
      messages: [
        {
          key: testEvent.orderId,
          value: JSON.stringify(testEvent),
          headers: { 'event-type': 'ORDER_CREATED' },
        },
      ],
    });

    await waitForCondition(async () => {
      const order = await orderService.getOrder(testEvent.orderId);
      return order !== null && order.status === 'CREATED';
    }, { timeout: 15000, interval: 500, description: 'Order should be persisted with CREATED status' });

    const order = await orderService.getOrder(testEvent.orderId);
    expect(order).toBeDefined();
    expect(order!.customerId).toBe('cust-456');
    expect(order!.totalAmount).toBe(49.99);
  });
});
\`\`\`

### Testcontainers for Kafka

Testcontainers provides real Kafka instances in Docker for integration tests, eliminating the need for shared test environments:

\`\`\`typescript
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka } from 'kafkajs';

describe('Kafka Integration Tests', () => {
  let kafkaContainer: StartedKafkaContainer;
  let kafka: Kafka;

  beforeAll(async () => {
    kafkaContainer = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
      .withExposedPorts(9093)
      .start();

    kafka = new Kafka({
      brokers: [\`\${kafkaContainer.getHost()}:\${kafkaContainer.getMappedPort(9093)}\`],
    });
  }, 60000);

  afterAll(async () => {
    await kafkaContainer.stop();
  });

  it('should produce and consume messages through real Kafka', async () => {
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic: 'test-topic', numPartitions: 3 }],
    });
    await admin.disconnect();

    const producer = kafka.producer();
    await producer.connect();

    const consumer = kafka.consumer({ groupId: 'test-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'test-topic', fromBeginning: true });

    const receivedMessages: string[] = [];
    await consumer.run({
      eachMessage: async ({ message }) => {
        receivedMessages.push(message.value!.toString());
      },
    });

    await producer.send({
      topic: 'test-topic',
      messages: [
        { key: 'key-1', value: 'message-1' },
        { key: 'key-2', value: 'message-2' },
      ],
    });

    await waitForCondition(
      async () => receivedMessages.length === 2,
      { timeout: 10000, interval: 200, description: 'Should receive both messages' }
    );

    expect(receivedMessages).toContain('message-1');
    expect(receivedMessages).toContain('message-2');

    await consumer.disconnect();
    await producer.disconnect();
  });
});
\`\`\`

### Schema Registry Testing

Schema evolution is critical in Kafka environments. Test that schema changes are backward compatible:

\`\`\`typescript
describe('Schema Evolution', () => {
  it('should maintain backward compatibility when adding optional fields', async () => {
    const v1Schema = {
      type: 'record',
      name: 'OrderEvent',
      fields: [
        { name: 'orderId', type: 'string' },
        { name: 'amount', type: 'double' },
      ],
    };

    const v2Schema = {
      type: 'record',
      name: 'OrderEvent',
      fields: [
        { name: 'orderId', type: 'string' },
        { name: 'amount', type: 'double' },
        { name: 'currency', type: ['null', 'string'], default: null },
      ],
    };

    const compatibility = await registry.testCompatibility({
      subject: 'order-events-value',
      schema: JSON.stringify(v2Schema),
      schemaType: 'AVRO',
    });

    expect(compatibility).toBe(true);
  });
});
\`\`\`

---

## RabbitMQ Testing Patterns

RabbitMQ's routing model with exchanges, queues, and bindings offers different testing challenges compared to Kafka's partitioned log model.

### Exchange Routing Tests

Verify that messages are routed to the correct queues based on routing keys and exchange type:

\`\`\`typescript
import amqp from 'amqplib';

describe('RabbitMQ Exchange Routing', () => {
  let connection: amqp.Connection;
  let channel: amqp.Channel;

  beforeAll(async () => {
    connection = await amqp.connect(process.env.RABBITMQ_URL!);
    channel = await connection.createChannel();

    await channel.assertExchange('order-events', 'topic', { durable: true });
    await channel.assertQueue('payment-queue', { durable: true });
    await channel.assertQueue('notification-queue', { durable: true });
    await channel.assertQueue('analytics-queue', { durable: true });

    await channel.bindQueue('payment-queue', 'order-events', 'order.created');
    await channel.bindQueue('notification-queue', 'order-events', 'order.*');
    await channel.bindQueue('analytics-queue', 'order-events', '#');
  });

  afterAll(async () => {
    await channel.close();
    await connection.close();
  });

  it('should route order.created to payment, notification, and analytics queues', async () => {
    channel.publish(
      'order-events',
      'order.created',
      Buffer.from(JSON.stringify({ orderId: 'route-test-1', action: 'created' }))
    );

    const paymentMsg = await waitForMessage(channel, 'payment-queue');
    const notificationMsg = await waitForMessage(channel, 'notification-queue');
    const analyticsMsg = await waitForMessage(channel, 'analytics-queue');

    expect(paymentMsg).toBeDefined();
    expect(notificationMsg).toBeDefined();
    expect(analyticsMsg).toBeDefined();
  });

  it('should route order.shipped only to notification and analytics queues', async () => {
    channel.publish(
      'order-events',
      'order.shipped',
      Buffer.from(JSON.stringify({ orderId: 'route-test-2', action: 'shipped' }))
    );

    const notificationMsg = await waitForMessage(channel, 'notification-queue');
    const analyticsMsg = await waitForMessage(channel, 'analytics-queue');
    const paymentMsg = await channel.get('payment-queue', { noAck: true });

    expect(notificationMsg).toBeDefined();
    expect(analyticsMsg).toBeDefined();
    expect(paymentMsg).toBe(false); // No message in payment queue
  });
});

async function waitForMessage(
  channel: amqp.Channel,
  queue: string,
  timeout = 5000
): Promise<amqp.GetMessage | false> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const msg = await channel.get(queue, { noAck: true });
    if (msg) return msg;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return false;
}
\`\`\`

### Dead Letter Queue Testing

Dead letter queues (DLQs) are critical for error handling in RabbitMQ. Test that failed messages are properly routed:

\`\`\`typescript
describe('Dead Letter Queue', () => {
  it('should route rejected messages to the DLQ', async () => {
    await channel.assertQueue('processing-queue', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'processing-dlq',
      },
    });
    await channel.assertQueue('processing-dlq', { durable: true });

    channel.sendToQueue(
      'processing-queue',
      Buffer.from(JSON.stringify({ orderId: 'dlq-test', invalid: true }))
    );

    // Consumer rejects the message
    const msg = await waitForMessage(channel, 'processing-queue');
    if (msg) {
      channel.nack(msg as amqp.GetMessage, false, false); // reject, no requeue
    }

    const dlqMsg = await waitForMessage(channel, 'processing-dlq');
    expect(dlqMsg).toBeDefined();

    const body = JSON.parse((dlqMsg as amqp.GetMessage).content.toString());
    expect(body.orderId).toBe('dlq-test');
  });

  it('should include death metadata in DLQ messages', async () => {
    // Similar setup as above, then check x-death header
    const dlqMsg = await waitForMessage(channel, 'processing-dlq');
    if (dlqMsg) {
      const headers = (dlqMsg as amqp.GetMessage).properties.headers;
      expect(headers['x-death']).toBeDefined();
      expect(headers['x-death'][0].queue).toBe('processing-queue');
      expect(headers['x-death'][0].reason).toBe('rejected');
    }
  });
});
\`\`\`

### Acknowledgment Testing

Test that your consumers properly acknowledge messages and handle redelivery:

\`\`\`typescript
describe('Message Acknowledgments', () => {
  it('should redelivery unacknowledged messages after consumer disconnect', async () => {
    const queue = 'ack-test-queue';
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from('important-message'), { persistent: true });

    // First consumer receives but does not ack
    const consumer1Channel = await connection.createChannel();
    await consumer1Channel.prefetch(1);
    const msg = await new Promise<amqp.ConsumeMessage>((resolve) => {
      consumer1Channel.consume(queue, (m) => { if (m) resolve(m); }, { noAck: false });
    });

    expect(msg.content.toString()).toBe('important-message');

    // Simulate consumer crash by closing channel without ack
    await consumer1Channel.close();

    // Second consumer should receive the redelivered message
    const redelivered = await waitForMessage(channel, queue);
    expect(redelivered).toBeDefined();
    expect((redelivered as amqp.GetMessage).fields.redelivered).toBe(true);
  });
});
\`\`\`

---

## Testing Event Sourcing and CQRS

Event sourcing and CQRS (Command Query Responsibility Segregation) introduce additional testing dimensions: the event store becomes the source of truth, and read models are projections that must stay in sync.

### Event Store Validation

\`\`\`typescript
describe('Event Store', () => {
  it('should persist events in correct order with monotonic versions', async () => {
    const aggregateId = 'account-es-001';

    await eventStore.append(aggregateId, [
      { type: 'ACCOUNT_OPENED', data: { owner: 'Alice', initialBalance: 1000 } },
      { type: 'FUNDS_DEPOSITED', data: { amount: 500 } },
      { type: 'FUNDS_WITHDRAWN', data: { amount: 200 } },
    ]);

    const events = await eventStore.getEvents(aggregateId);
    expect(events).toHaveLength(3);
    expect(events[0].version).toBe(1);
    expect(events[1].version).toBe(2);
    expect(events[2].version).toBe(3);
    expect(events.map((e: { type: string }) => e.type)).toEqual([
      'ACCOUNT_OPENED',
      'FUNDS_DEPOSITED',
      'FUNDS_WITHDRAWN',
    ]);
  });

  it('should detect optimistic concurrency conflicts', async () => {
    const aggregateId = 'account-es-002';
    await eventStore.append(aggregateId, [
      { type: 'ACCOUNT_OPENED', data: { owner: 'Bob', initialBalance: 500 } },
    ]);

    // Two concurrent writes expecting the same version
    const promise1 = eventStore.append(aggregateId, [
      { type: 'FUNDS_DEPOSITED', data: { amount: 100 } },
    ], { expectedVersion: 1 });

    const promise2 = eventStore.append(aggregateId, [
      { type: 'FUNDS_WITHDRAWN', data: { amount: 200 } },
    ], { expectedVersion: 1 });

    const results = await Promise.allSettled([promise1, promise2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});
\`\`\`

### Projection Testing

Read model projections must be tested to ensure they accurately reflect the event history:

\`\`\`typescript
describe('Account Balance Projection', () => {
  it('should compute correct balance from event stream', async () => {
    const events = [
      { type: 'ACCOUNT_OPENED', data: { initialBalance: 1000 } },
      { type: 'FUNDS_DEPOSITED', data: { amount: 500 } },
      { type: 'FUNDS_DEPOSITED', data: { amount: 250 } },
      { type: 'FUNDS_WITHDRAWN', data: { amount: 300 } },
      { type: 'FUNDS_WITHDRAWN', data: { amount: 150 } },
    ];

    const projection = new AccountBalanceProjection();
    for (const event of events) {
      projection.apply(event);
    }

    expect(projection.getBalance()).toBe(1300); // 1000 + 500 + 250 - 300 - 150
    expect(projection.getTransactionCount()).toBe(4); // excludes ACCOUNT_OPENED
  });
});
\`\`\`

### Replay Testing

A key benefit of event sourcing is the ability to replay events. Test that replay produces consistent state:

\`\`\`java
// Java example using JUnit 5 and AssertJ
@Test
void shouldProduceConsistentStateOnReplay() {
    String aggregateId = "replay-test-001";
    List<DomainEvent> events = List.of(
        new AccountOpened(aggregateId, "Charlie", BigDecimal.valueOf(2000)),
        new FundsDeposited(aggregateId, BigDecimal.valueOf(800)),
        new FundsWithdrawn(aggregateId, BigDecimal.valueOf(500)),
        new InterestApplied(aggregateId, BigDecimal.valueOf(46))
    );

    // Build state from events
    AccountAggregate account1 = AccountAggregate.rehydrate(events);

    // Replay same events into a fresh aggregate
    AccountAggregate account2 = AccountAggregate.rehydrate(events);

    assertThat(account1.getBalance()).isEqualTo(account2.getBalance());
    assertThat(account1.getVersion()).isEqualTo(account2.getVersion());
    assertThat(account1.getBalance()).isEqualByComparingTo(BigDecimal.valueOf(2346));
}
\`\`\`

---

## Contract Testing for Events

Contract testing ensures that producers and consumers agree on message formats without requiring end-to-end integration tests.

### AsyncAPI for Event Documentation and Validation

AsyncAPI is the OpenAPI equivalent for event-driven architectures. Define your event contracts, then validate against them in tests:

\`\`\`typescript
import { validate } from '@asyncapi/parser';

describe('AsyncAPI Contract Validation', () => {
  it('should produce events matching the AsyncAPI specification', async () => {
    const event = orderProducer.createOrderEvent({
      orderId: 'contract-test-001',
      customerId: 'cust-789',
      totalAmount: 149.99,
    });

    const schema = await loadAsyncAPISchema('order-events');
    const validationResult = validateEventAgainstSchema(event, schema, 'OrderCreated');

    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);
  });

  it('should reject events missing required fields', async () => {
    const invalidEvent = { orderId: 'contract-test-002' }; // missing required fields

    const schema = await loadAsyncAPISchema('order-events');
    const validationResult = validateEventAgainstSchema(invalidEvent, schema, 'OrderCreated');

    expect(validationResult.valid).toBe(false);
    expect(validationResult.errors).toContainEqual(
      expect.objectContaining({ field: 'customerId' })
    );
  });
});
\`\`\`

### Pact for Messaging

Pact supports message-based contract testing, allowing independent verification of producers and consumers:

\`\`\`typescript
// Consumer side: define expected messages
import { MessageConsumerPact, synchronousBodyHandler } from '@pact-foundation/pact';

const messagePact = new MessageConsumerPact({
  consumer: 'OrderService',
  provider: 'PaymentService',
  dir: './pacts',
});

describe('Payment Event Consumer Contract', () => {
  it('should accept a valid PaymentCompleted event', () => {
    return messagePact
      .expectsToReceive('a PaymentCompleted event')
      .withContent({
        paymentId: 'pay-001',
        orderId: 'ord-001',
        amount: 99.99,
        currency: 'USD',
        completedAt: '2026-03-17T10:00:00Z',
      })
      .withMetadata({ 'content-type': 'application/json' })
      .verify(
        synchronousBodyHandler((message: unknown) => {
          const handler = new PaymentEventHandler();
          // This should not throw
          handler.handle(message as PaymentCompletedEvent);
        })
      );
  });
});
\`\`\`

\`\`\`java
// Provider (producer) side in Java: verify messages match the pact
@Provider("PaymentService")
@PactBroker(host = "pact-broker.example.com")
class PaymentProviderPactTest {

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verifyPact(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @PactVerifyProvider("a PaymentCompleted event")
    MessageAndMetadata paymentCompletedEvent() {
        PaymentCompletedEvent event = PaymentCompletedEvent.builder()
            .paymentId("pay-001")
            .orderId("ord-001")
            .amount(BigDecimal.valueOf(99.99))
            .currency("USD")
            .completedAt(Instant.parse("2026-03-17T10:00:00Z"))
            .build();

        return new MessageAndMetadata(
            objectMapper.writeValueAsBytes(event),
            Map.of("content-type", "application/json")
        );
    }
}
\`\`\`

---

## Testing Saga and Choreography Patterns

Distributed transactions in event-driven systems often follow the saga pattern -- either orchestration-based (central coordinator) or choreography-based (decentralized, event-driven).

### Orchestrator Saga Testing

\`\`\`typescript
describe('Order Saga Orchestrator', () => {
  it('should complete the full order saga on happy path', async () => {
    const saga = new OrderSagaOrchestrator(eventBus);

    await saga.start({
      orderId: 'saga-001',
      customerId: 'cust-100',
      items: [{ productId: 'prod-1', quantity: 2 }],
      totalAmount: 59.98,
    });

    // Simulate successful payment
    await eventBus.emit('PaymentCompleted', { orderId: 'saga-001', paymentId: 'pay-001' });

    // Simulate successful inventory reservation
    await eventBus.emit('InventoryReserved', { orderId: 'saga-001', reservationId: 'res-001' });

    // Simulate successful shipping
    await eventBus.emit('ShipmentCreated', { orderId: 'saga-001', trackingNumber: 'TRACK-001' });

    await waitForCondition(async () => {
      const state = await saga.getState('saga-001');
      return state === 'COMPLETED';
    }, { timeout: 10000, interval: 300, description: 'Saga should reach COMPLETED state' });
  });

  it('should execute compensation on payment failure', async () => {
    const saga = new OrderSagaOrchestrator(eventBus);
    const compensationLog: string[] = [];

    eventBus.on('CompensationExecuted', (event: { step: string }) => {
      compensationLog.push(event.step);
    });

    await saga.start({
      orderId: 'saga-002',
      customerId: 'cust-101',
      items: [{ productId: 'prod-2', quantity: 1 }],
      totalAmount: 29.99,
    });

    // Simulate payment failure
    await eventBus.emit('PaymentFailed', {
      orderId: 'saga-002',
      reason: 'Insufficient funds',
    });

    await waitForCondition(async () => {
      const state = await saga.getState('saga-002');
      return state === 'COMPENSATED';
    }, { timeout: 10000, interval: 300, description: 'Saga should reach COMPENSATED state' });

    expect(compensationLog).toContain('RELEASE_INVENTORY');
    expect(compensationLog).toContain('CANCEL_ORDER');
  });
});
\`\`\`

### Choreography Testing

In choreography-based sagas, there is no central coordinator. Each service reacts to events independently. Testing requires verifying the full event chain:

\`\`\`typescript
describe('Choreography-based Order Flow', () => {
  it('should propagate events through the full service chain', async () => {
    const eventLog: Array<{ service: string; event: string; timestamp: number }> = [];

    // Subscribe to all relevant events
    const services = ['OrderService', 'PaymentService', 'InventoryService', 'ShippingService'];
    for (const service of services) {
      eventBus.on(\`\${service}:EventProcessed\`, (event: { type: string }) => {
        eventLog.push({ service, event: event.type, timestamp: Date.now() });
      });
    }

    // Trigger the chain
    await orderService.createOrder({
      orderId: 'choreo-001',
      customerId: 'cust-200',
      totalAmount: 79.99,
    });

    await waitForCondition(async () => {
      return eventLog.some(
        (e) => e.service === 'ShippingService' && e.event === 'SHIPMENT_CREATED'
      );
    }, { timeout: 20000, interval: 500, description: 'Full choreography chain should complete' });

    // Verify the event chain order
    const eventTypes = eventLog.map((e) => \`\${e.service}:\${e.event}\`);
    expect(eventTypes).toContain('OrderService:ORDER_CREATED');
    expect(eventTypes).toContain('PaymentService:PAYMENT_PROCESSED');
    expect(eventTypes).toContain('InventoryService:INVENTORY_RESERVED');
    expect(eventTypes).toContain('ShippingService:SHIPMENT_CREATED');
  });
});
\`\`\`

---

## Integration Testing with Docker

Testcontainers is the de facto standard for running real message brokers in tests. Here is a comprehensive setup for testing with multiple brokers.

### Multi-Broker Test Environment

\`\`\`typescript
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { GenericContainer, StartedTestContainer } from 'testcontainers';

describe('Multi-Broker Integration', () => {
  let kafkaContainer: StartedKafkaContainer;
  let rabbitContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;

  beforeAll(async () => {
    // Start all containers in parallel
    const [kafka, rabbit, redis] = await Promise.all([
      new KafkaContainer('confluentinc/cp-kafka:7.6.0').start(),
      new GenericContainer('rabbitmq:3.13-management')
        .withExposedPorts(5672, 15672)
        .start(),
      new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .start(),
    ]);

    kafkaContainer = kafka;
    rabbitContainer = rabbit;
    redisContainer = redis;

    process.env.KAFKA_BROKER = \`\${kafka.getHost()}:\${kafka.getMappedPort(9093)}\`;
    process.env.RABBITMQ_URL = \`amqp://guest:guest@\${rabbit.getHost()}:\${rabbit.getMappedPort(5672)}\`;
    process.env.REDIS_URL = \`redis://\${redis.getHost()}:\${redis.getMappedPort(6379)}\`;
  }, 120000);

  afterAll(async () => {
    await Promise.all([
      kafkaContainer.stop(),
      rabbitContainer.stop(),
      redisContainer.stop(),
    ]);
  });

  it('should bridge events from Kafka to RabbitMQ via the event bridge service', async () => {
    // Publish to Kafka
    await kafkaProducer.send({
      topic: 'external-events',
      messages: [{ key: 'bridge-test', value: JSON.stringify({ source: 'kafka', data: 'test' }) }],
    });

    // Verify message arrives in RabbitMQ
    await waitForCondition(async () => {
      const msg = await rabbitChannel.get('internal-events', { noAck: true });
      if (!msg) return false;
      const body = JSON.parse(msg.content.toString());
      return body.source === 'kafka' && body.data === 'test';
    }, { timeout: 15000, interval: 300, description: 'Message should be bridged from Kafka to RabbitMQ' });
  });
});
\`\`\`

### Java Testcontainers Example

\`\`\`java
@Testcontainers
@SpringBootTest
class KafkaIntegrationTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.0")
    );

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private KafkaTemplate<String, String> kafkaTemplate;

    @Autowired
    private OrderRepository orderRepository;

    @Test
    void shouldConsumeAndPersistOrderEvents() throws Exception {
        String orderJson = """
            {
                "orderId": "tc-java-001",
                "customerId": "cust-300",
                "totalAmount": 199.99
            }
            """;

        kafkaTemplate.send("order-events", "tc-java-001", orderJson).get();

        Awaitility.await()
            .atMost(Duration.ofSeconds(15))
            .pollInterval(Duration.ofMillis(500))
            .untilAsserted(() -> {
                Optional<Order> order = orderRepository.findById("tc-java-001");
                assertThat(order).isPresent();
                assertThat(order.get().getStatus()).isEqualTo(OrderStatus.CREATED);
                assertThat(order.get().getTotalAmount())
                    .isEqualByComparingTo(BigDecimal.valueOf(199.99));
            });
    }
}
\`\`\`

---

## Monitoring and Observability Testing

In event-driven systems, observability is not just a nice-to-have -- it is a testable concern. Your test suite should verify that events are traceable, metrics are emitted, and dead letters are monitored.

### Distributed Tracing Verification

\`\`\`typescript
describe('Event Tracing', () => {
  it('should propagate trace context through the event chain', async () => {
    const traceId = generateTraceId();

    await producer.send({
      topic: 'traced-events',
      messages: [{
        key: 'trace-test',
        value: JSON.stringify({ action: 'test' }),
        headers: {
          'trace-id': traceId,
          'span-id': generateSpanId(),
        },
      }],
    });

    await waitForCondition(async () => {
      const spans = await tracingBackend.getSpansByTraceId(traceId);
      return spans.length >= 3; // producer + consumer + downstream
    }, { timeout: 15000, interval: 500, description: 'All spans should be recorded' });

    const spans = await tracingBackend.getSpansByTraceId(traceId);
    const spanNames = spans.map((s: { name: string }) => s.name);
    expect(spanNames).toContain('kafka.produce');
    expect(spanNames).toContain('kafka.consume');
    expect(spanNames).toContain('order.process');

    // Verify parent-child relationships
    const produceSpan = spans.find((s: { name: string }) => s.name === 'kafka.produce');
    const consumeSpan = spans.find((s: { name: string }) => s.name === 'kafka.consume');
    expect(consumeSpan.parentSpanId).toBe(produceSpan.spanId);
  });
});
\`\`\`

### Dead Letter Monitoring Tests

\`\`\`typescript
describe('DLQ Monitoring', () => {
  it('should emit metrics when messages land in the DLQ', async () => {
    const metricsCollector = new TestMetricsCollector();

    // Send a poison message that will fail processing
    await producer.send({
      topic: 'orders',
      messages: [{ key: 'poison', value: 'not-valid-json{{{' }],
    });

    await waitForCondition(async () => {
      const dlqCount = metricsCollector.getCounter('dlq.messages.total');
      return dlqCount > 0;
    }, { timeout: 15000, interval: 500, description: 'DLQ metric should be incremented' });

    expect(metricsCollector.getCounter('dlq.messages.total')).toBeGreaterThanOrEqual(1);
    expect(metricsCollector.getLastLabel('dlq.messages.total', 'topic')).toBe('orders');
    expect(metricsCollector.getLastLabel('dlq.messages.total', 'error_type')).toBe('DESERIALIZATION');
  });

  it('should trigger alert when DLQ depth exceeds threshold', async () => {
    const alerts: Array<{ name: string; severity: string }> = [];
    alertManager.onAlert((alert: { name: string; severity: string }) => alerts.push(alert));

    // Flood with poison messages
    const poisonMessages = Array.from({ length: 15 }, (_, i) => ({
      key: \`poison-\${i}\`,
      value: 'invalid',
    }));

    await producer.send({ topic: 'orders', messages: poisonMessages });

    await waitForCondition(async () => {
      return alerts.some((a) => a.name === 'DLQ_DEPTH_EXCEEDED');
    }, { timeout: 20000, interval: 500, description: 'DLQ depth alert should fire' });

    const dlqAlert = alerts.find((a) => a.name === 'DLQ_DEPTH_EXCEEDED');
    expect(dlqAlert!.severity).toBe('WARNING');
  });
});
\`\`\`

---

## Performance Testing Async Systems

Performance testing event-driven architectures requires measuring throughput, latency, and backpressure behavior rather than traditional request-response metrics.

### Throughput Testing

\`\`\`typescript
describe('Kafka Throughput', () => {
  it('should handle 10,000 messages per second', async () => {
    const messageCount = 10000;
    const messages = Array.from({ length: messageCount }, (_, i) => ({
      key: \`perf-\${i}\`,
      value: JSON.stringify({ index: i, payload: 'x'.repeat(512) }),
    }));

    const startTime = Date.now();

    // Send in batches of 500
    for (let i = 0; i < messages.length; i += 500) {
      await producer.send({
        topic: 'perf-test',
        messages: messages.slice(i, i + 500),
      });
    }

    const produceTime = Date.now() - startTime;
    const throughput = (messageCount / produceTime) * 1000;

    console.log(\`Producer throughput: \${throughput.toFixed(0)} msgs/sec\`);
    expect(throughput).toBeGreaterThan(5000); // At least 5k msgs/sec

    // Verify all messages consumed
    await waitForCondition(async () => {
      const consumed = await metricsCollector.getCounter('messages.consumed.total');
      return consumed >= messageCount;
    }, { timeout: 30000, interval: 1000, description: 'All messages should be consumed' });
  });
});
\`\`\`

### Backpressure Testing

\`\`\`typescript
describe('Consumer Backpressure', () => {
  it('should handle slow consumers without message loss', async () => {
    const processedMessages: string[] = [];
    const slowConsumer = createConsumer({
      processMessage: async (msg: { value: string }) => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate slow processing
        processedMessages.push(msg.value);
      },
      maxConcurrency: 5,
    });

    // Produce messages faster than the consumer can process
    const totalMessages = 200;
    for (let i = 0; i < totalMessages; i++) {
      await producer.send({
        topic: 'backpressure-test',
        messages: [{ key: \`bp-\${i}\`, value: \`message-\${i}\` }],
      });
    }

    // Wait for all messages to be processed
    await waitForCondition(
      async () => processedMessages.length >= totalMessages,
      { timeout: 60000, interval: 1000, description: 'All messages should eventually be processed' }
    );

    expect(processedMessages).toHaveLength(totalMessages);

    await slowConsumer.disconnect();
  });
});
\`\`\`

---

## AI-Assisted Event Testing with QASkills

The **qaskills.sh** ecosystem provides installable QA skills that encode expert testing knowledge for event-driven architectures directly into AI coding agents.

### Installing Event-Driven Testing Skills

\`\`\`bash
# Install Kafka testing patterns
npx @qaskills/cli add kafka-testing

# Install message queue testing knowledge
npx @qaskills/cli add message-queue-testing

# Install event sourcing testing patterns
npx @qaskills/cli add event-sourcing-cqrs

# Search for async testing skills
npx @qaskills/cli search "event-driven"
npx @qaskills/cli search "async testing"

# Install Testcontainers integration skill
npx @qaskills/cli add testcontainers-docker

# List all installed skills
npx @qaskills/cli list
\`\`\`

When these skills are installed, AI agents like Claude Code gain deep domain knowledge about event-driven testing patterns. Instead of generating generic test stubs, the agent produces tests that include proper eventual consistency assertions, idempotency checks, dead letter queue verification, and schema evolution testing.

### Skill Stacking for Comprehensive Coverage

The most effective approach is **skill stacking** -- installing multiple complementary skills that together cover the full event-driven testing surface:

\`\`\`bash
# Stack skills for comprehensive event-driven testing
npx @qaskills/cli add kafka-testing
npx @qaskills/cli add contract-testing-pact
npx @qaskills/cli add testcontainers-docker
npx @qaskills/cli add api-testing-rest
npx @qaskills/cli add performance-load-testing
\`\`\`

With this skill stack installed, asking your AI agent to "write integration tests for the order event pipeline" produces tests that use Testcontainers for real Kafka instances, include Pact contract verification, test idempotency, verify dead letter handling, and measure throughput -- all from a single prompt.

---

## 10 Best Practices for Event-Driven Testing

1. **Use real brokers in integration tests.** Mocking Kafka or RabbitMQ hides critical issues around serialization, partitioning, and offset management. Testcontainers makes real brokers easy.

2. **Always test idempotency.** Every consumer will eventually receive duplicate messages. Design your tests to send the same message multiple times and verify only one side effect occurs.

3. **Implement polling assertions, never fixed sleeps.** Replace \`Thread.sleep(5000)\` or \`await delay(5000)\` with polling-based assertions that check for the expected state at regular intervals with a timeout.

4. **Test schema evolution explicitly.** When adding or removing fields from events, verify backward and forward compatibility using schema registry compatibility checks.

5. **Verify dead letter queue routing.** Every consumer should have a DLQ strategy, and your tests should verify that poison messages, deserialization failures, and processing errors all route correctly.

6. **Test compensation and rollback.** In saga patterns, the compensation path is at least as important as the happy path. Test that every step can be compensated and that partial failures are handled.

7. **Include tracing context in test assertions.** Verify that trace IDs propagate through the event chain, enabling distributed debugging in production.

8. **Test consumer group rebalancing.** Simulate consumer failures and verify that messages are reprocessed correctly after rebalancing, without data loss or duplication.

9. **Measure and assert on latency.** Set performance budgets for end-to-end event processing latency and fail tests that exceed them.

10. **Use contract tests between teams.** When different teams own producers and consumers, Pact or AsyncAPI contract tests prevent integration breaks without requiring shared test environments.

---

## 8 Anti-Patterns to Avoid

1. **Fixed sleep waits.** Using \`Thread.sleep(5000)\` or \`setTimeout(5000)\` instead of polling assertions makes tests slow and flaky. The test either waits too long (slow CI) or not long enough (intermittent failure).

2. **Mocking the message broker.** Unit tests that mock Kafka or RabbitMQ entirely give false confidence. You miss serialization bugs, configuration errors, and broker-specific behavior.

3. **Shared test topics without isolation.** Multiple test suites writing to the same Kafka topic or RabbitMQ queue create cross-test contamination. Use unique topic or queue names per test run, or use Testcontainers for isolated broker instances.

4. **Ignoring message ordering in assertions.** Asserting on exact message order when your system uses multiple partitions or competing consumers will produce flaky tests. Assert on eventual state rather than processing order when ordering is not guaranteed.

5. **Testing only the happy path.** Event-driven systems fail in complex ways: network partitions, consumer crashes, schema mismatches, poison messages. Testing only successful flows leaves critical failure paths untested.

6. **No idempotency testing.** Assuming consumers will only receive each message once is a guarantee that does not exist in any message broker. At-least-once delivery means duplicates will happen.

7. **Tight coupling between producer and consumer tests.** Testing the full event chain in a single test creates fragile, slow tests. Use contract tests to decouple producer and consumer testing while maintaining compatibility.

8. **Skipping performance testing.** Event-driven systems often have non-obvious performance characteristics. A consumer that handles 100 messages per second in isolation may fail catastrophically under real production load with backpressure from downstream services.

---

## Conclusion

Testing event-driven architectures requires a deliberate shift from synchronous testing patterns to async-aware strategies. The core principles -- eventual consistency assertions, idempotency verification, schema contract testing, and observability validation -- apply regardless of whether you use Kafka, RabbitMQ, Redis Streams, or any other message broker.

The combination of **Testcontainers for real broker instances**, **Pact and AsyncAPI for contract testing**, and **QASkills for AI-assisted test generation** provides a comprehensive testing strategy that catches integration bugs early while maintaining fast developer feedback loops.

Start by installing the relevant QA skills from [qaskills.sh](https://qaskills.sh) to encode expert event-driven testing knowledge into your AI workflow, then build your test suite layer by layer: unit tests for event handlers, integration tests with real brokers, contract tests between services, and performance tests under load. Your event-driven architecture will be as reliable as the tests that guard it.
`,
};
