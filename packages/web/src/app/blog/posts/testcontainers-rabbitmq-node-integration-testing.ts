import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers RabbitMQ Node.js — Integration Testing Guide 2026',
  description:
    'Complete guide to Testcontainers for RabbitMQ in Node.js. Real queue, exchange, and dead letter tests with Docker, amqplib, and CI/CD patterns.',
  date: '2026-05-03',
  category: 'Guide',
  content: `
# Testcontainers RabbitMQ Node.js Integration Testing Guide

RabbitMQ is the most-deployed open-source message broker in the world, handling billions of messages every second across mission-critical systems at banks, retailers, and SaaS platforms. Testing RabbitMQ-dependent code reliably has always been challenging — in-memory mocks like amqp-mock implement only a fraction of the protocol, shared brokers bleed messages between test runs, and docker-compose stacks couple test execution to a separate startup step. Testcontainers fixes this by spinning up a real RabbitMQ instance per test suite with one line of code.

This guide is a hands-on walkthrough of Testcontainers with RabbitMQ in Node.js for 2026. We cover the official RabbitMQContainer module, queue and exchange setup, publisher confirms, consumer acknowledgments, dead letter exchanges, delayed message exchanges, container reuse, and CI/CD configuration. Every code sample is working TypeScript with Vitest and amqplib.

---

## Key Takeaways

- **RabbitMQContainer** provides one-line setup for real RabbitMQ 3.13+ in tests
- **Management plugin** is enabled by default so you can inspect queues via HTTP API
- **amqplib** is the recommended Node.js client; rascal and amqp-connection-manager wrap it
- **Publisher confirms** are essential for reliable testing
- **Container reuse** drops local startup from 8 seconds to under 1 second
- **CI/CD setup is trivial** because Docker is available on GitHub Actions ubuntu runners

---

## Why Use Testcontainers for RabbitMQ

amqp-mock and other in-memory libraries implement a narrow subset of AMQP. They don't faithfully reproduce publisher confirms, consumer acks, dead letter routing, or topic exchange routing key matching. They lag behind protocol changes. They let you write tests that pass against the mock but fail against real RabbitMQ.

Shared dev brokers accumulate messages between test runs, fail to parallelize, and require careful queue naming to avoid collisions. Docker-compose works but requires a separate startup step.

Testcontainers gives every test suite a fresh broker with isolated state, automatic cleanup, and one-line setup.

---

## Installation

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/rabbitmq
npm install --save-dev vitest amqplib @types/amqplib
\`\`\`

Verify Docker with \`docker info\`.

Vitest config:

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
  },
});
\`\`\`

---

## Your First Test

\`\`\`typescript
import { RabbitMQContainer, StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import amqp, { Connection, Channel } from 'amqplib';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

describe('RabbitMQ integration', () => {
  let container: StartedRabbitMQContainer;
  let connection: Connection;
  let channel: Channel;

  beforeAll(async () => {
    container = await new RabbitMQContainer('rabbitmq:3.13-management').start();
    connection = await amqp.connect(container.getAmqpUrl());
    channel = await connection.createChannel();
  });

  afterAll(async () => {
    await channel.close();
    await connection.close();
    await container.stop();
  });

  it('publishes and consumes a message', async () => {
    const queue = 'test-queue';
    await channel.assertQueue(queue, { durable: false });

    const received = new Promise<string>(resolve => {
      channel.consume(queue, msg => {
        if (msg) {
          channel.ack(msg);
          resolve(msg.content.toString());
        }
      });
    });

    channel.sendToQueue(queue, Buffer.from('hello'));

    expect(await received).toBe('hello');
  });
});
\`\`\`

---

## RabbitMQContainer API Reference

| Method | Purpose |
|---|---|
| \`new RabbitMQContainer(image)\` | Constructor; \`rabbitmq:3.13-management\` recommended |
| \`.withReuse()\` | Reuse container across runs |
| \`.withExposedPorts(...)\` | Override ports |
| \`.withEnvironment(env)\` | Set env vars |
| \`.start()\` | Boot container |

After start:

| Method | Returns |
|---|---|
| \`getHost()\` | Hostname |
| \`getMappedPort(5672)\` | AMQP port |
| \`getMappedPort(15672)\` | Management HTTP API port |
| \`getAmqpUrl()\` | Full amqp:// URI |
| \`getHttpUrl()\` | Management API base URL |

The default username/password is \`guest\`/\`guest\`. The management plugin is enabled in the \`-management\` image variant.

---

## Setting Up Queues and Exchanges

\`\`\`typescript
beforeAll(async () => {
  await channel.assertExchange('orders', 'topic', { durable: false });
  await channel.assertQueue('order.created', { durable: false });
  await channel.bindQueue('order.created', 'orders', 'order.created.*');
});
\`\`\`

The \`durable: false\` flag means the queue does not survive broker restarts. In tests, this is fine and avoids leftover state.

---

## Testing Publisher Confirms

Publisher confirms are essential for reliable production code. Test them against real RabbitMQ:

\`\`\`typescript
it('confirms publication', async () => {
  const confirmChannel = await connection.createConfirmChannel();
  await confirmChannel.assertQueue('confirm-test');

  await new Promise<void>((resolve, reject) => {
    confirmChannel.publish('', 'confirm-test', Buffer.from('data'), {}, err => {
      if (err) reject(err);
      else resolve();
    });
  });

  await confirmChannel.close();
});
\`\`\`

---

## Testing Dead Letter Exchanges

Dead letter routing is where many production bugs hide. Test it explicitly:

\`\`\`typescript
it('routes failed messages to DLX', async () => {
  await channel.assertExchange('dlx', 'direct', { durable: false });
  await channel.assertQueue('dlq', { durable: false });
  await channel.bindQueue('dlq', 'dlx', 'failed');

  await channel.assertQueue('main', {
    durable: false,
    arguments: {
      'x-dead-letter-exchange': 'dlx',
      'x-dead-letter-routing-key': 'failed',
      'x-message-ttl': 100,
    },
  });

  channel.sendToQueue('main', Buffer.from('expires fast'));

  await new Promise(r => setTimeout(r, 300));

  const dlqMessage = await channel.get('dlq');
  expect(dlqMessage).not.toBe(false);
  expect((dlqMessage as any).content.toString()).toBe('expires fast');
});
\`\`\`

---

## Testing Topic Routing

Topic exchanges route based on routing key patterns:

\`\`\`typescript
it('routes by topic pattern', async () => {
  await channel.assertExchange('events', 'topic', { durable: false });
  await channel.assertQueue('user-events', { durable: false });
  await channel.assertQueue('order-events', { durable: false });
  await channel.bindQueue('user-events', 'events', 'user.*');
  await channel.bindQueue('order-events', 'events', 'order.*');

  channel.publish('events', 'user.created', Buffer.from('alice'));
  channel.publish('events', 'order.shipped', Buffer.from('order-1'));

  await new Promise(r => setTimeout(r, 100));

  const userMsg = await channel.get('user-events');
  const orderMsg = await channel.get('order-events');

  expect((userMsg as any).content.toString()).toBe('alice');
  expect((orderMsg as any).content.toString()).toBe('order-1');
});
\`\`\`

---

## Testing Consumer Acknowledgments

\`\`\`typescript
it('redelivers on nack', async () => {
  await channel.assertQueue('retry-test', { durable: false });
  channel.sendToQueue('retry-test', Buffer.from('msg1'));

  let attempts = 0;
  const done = new Promise<void>(resolve => {
    channel.consume('retry-test', msg => {
      if (!msg) return;
      attempts++;
      if (attempts === 1) {
        channel.nack(msg, false, true); // requeue
      } else {
        channel.ack(msg);
        resolve();
      }
    });
  });

  await done;
  expect(attempts).toBe(2);
});
\`\`\`

---

## Per-Test Isolation

Three approaches:

| Pattern | Speed | Use Case |
|---|---|---|
| Delete queues after each test | Fast | Simple CRUD |
| Unique queue names per test | Fast | Read-heavy tests |
| Container per test | Slow | Strong isolation |

Unique queue names per test:

\`\`\`typescript
function uniqueQueue(name: string): string {
  return \`\${name}_\${Date.now()}_\${Math.random().toString(36).slice(2)}\`;
}

it('test 1', async () => {
  const q = uniqueQueue('orders');
  await channel.assertQueue(q, { autoDelete: true });
});
\`\`\`

The \`autoDelete: true\` flag deletes the queue when the last consumer disconnects.

---

## Testing Delayed Messages

For delayed messages, install the rabbitmq-delayed-message-exchange plugin via a custom image:

\`\`\`typescript
container = await new RabbitMQContainer('rabbitmq:3.13-management')
  .withCommand(['rabbitmq-plugins', 'enable', 'rabbitmq_delayed_message_exchange'])
  .start();
\`\`\`

Then use:

\`\`\`typescript
await channel.assertExchange('delayed-ex', 'x-delayed-message', {
  arguments: { 'x-delayed-type': 'direct' },
});
channel.publish('delayed-ex', 'key', Buffer.from('msg'), {
  headers: { 'x-delay': 5000 },
});
\`\`\`

---

## Using the Management HTTP API

The management plugin exposes a REST API at \`getHttpUrl()\`. Useful for inspecting queue depth in tests:

\`\`\`typescript
import fetch from 'node-fetch';

async function queueDepth(name: string): Promise<number> {
  const resp = await fetch(\`\${container.getHttpUrl()}/api/queues/%2F/\${name}\`, {
    headers: {
      Authorization: 'Basic ' + Buffer.from('guest:guest').toString('base64'),
    },
  });
  const json = await resp.json();
  return (json as any).messages;
}
\`\`\`

---

## Container Reuse

\`\`\`typescript
container = await new RabbitMQContainer('rabbitmq:3.13-management')
  .withReuse()
  .start();
\`\`\`

Enable in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

---

## CI/CD Configuration

\`\`\`yaml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
\`\`\`

---

## Common Pitfalls

**Channel reuse.** A single channel should not be shared between publisher and consumer in the same test — use separate channels.

**Forgotten cleanup.** Always close channel and connection before stopping the container.

**Race conditions.** Messages are not always delivered instantly. Use \`await new Promise(r => setTimeout(r, 100))\` or proper await patterns around consumer setup.

**Image variants.** Use \`-management\` variant to get the HTTP API. The plain \`rabbitmq:3.13\` image lacks the plugin.

---

## Conclusion

Testcontainers transforms RabbitMQ integration testing in Node.js. Publisher confirms, dead letter routing, topic patterns, and delayed messages all work exactly like production. Setup is one line, CI requires no configuration, and container reuse keeps local development fast.

Explore the [QA skills directory](/skills) for related queue and event-driven testing patterns, or check our [Kafka guide](/blog/testcontainers-kafka-java-spring-boot-guide) for streaming use cases.
`,
};
