import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Kafka in Node.js: Complete 2026 Guide',
  description:
    'A complete 2026 guide to using Testcontainers Kafka in Node.js for integration testing. Covers KafkaContainer setup, producers, consumers, schema registry, wait strategies, and CI/CD patterns with TypeScript, Java, and Python examples.',
  date: '2026-05-21',
  category: 'Tutorial',
  content: `
Testing Kafka producers and consumers without a real broker is one of the hardest problems in microservices testing. Mocks lie. In-memory brokers behave differently from production. The only reliable answer in 2026 is Testcontainers — spinning up an ephemeral Kafka broker in Docker, running your tests against it, and tearing it down when finished. This guide walks through every pattern you need to ship reliable Kafka integration tests in Node.js, with parallel examples in Java and Python so you can transfer the patterns across teams.

## Key Takeaways

- Testcontainers Kafka in Node.js spins up a real Kafka broker per test run with one line of code
- The \`@testcontainers/kafka\` package wraps Confluent Kafka images and exposes brokers on dynamic ports
- Wait strategies (\`Wait.forLogMessage\`, \`Wait.forListeningPorts\`) eliminate flaky startup races
- The withReuse() pattern can cut your Kafka test suite runtime by 80% in local development
- Schema Registry tests need a second container linked over a shared Docker network
- GitHub Actions runs Testcontainers Kafka out of the box on \`ubuntu-latest\` runners

---

## Why Testcontainers Kafka Beats Every Alternative

Before diving into code, it is worth understanding why Testcontainers has become the default choice for Kafka integration testing in 2026.

**Mocks are dangerous.** Mocking KafkaJS or node-rdkafka means your test only verifies that you called \`.send()\` with the right arguments. It does not verify that the broker accepts the message, that partition assignment works, that consumer group rebalancing is handled, or that your serialization round-trips correctly.

**Embedded brokers drift.** Tools like \`kafkajs-mock\` or in-process brokers behave like Kafka 80% of the time and then diverge in subtle ways around offsets, transactions, or compacted topics.

**Docker Compose is too slow for unit-test cadence.** A Compose-managed Kafka stack takes 20-30 seconds to start, and shutdown is unreliable between test runs.

Testcontainers solves all three problems. It uses the same official Confluent images you would run in production, starts in 5-8 seconds with the right wait strategy, and guarantees clean teardown via Docker's reaper container (Ryuk).

Install the QA skill if you want your AI agent to generate these patterns automatically:

\`\`\`bash
npx @qaskills/cli add testcontainers-kafka-node
\`\`\`

Browse all available testing skills at [qaskills.sh/skills](/skills).

---

## Installing Testcontainers Kafka in Node.js

The Node.js ecosystem ships Testcontainers as a core package and per-database/per-broker modules. For Kafka, install the dedicated module:

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/kafka kafkajs
\`\`\`

Or with pnpm:

\`\`\`bash
pnpm add -D testcontainers @testcontainers/kafka kafkajs
\`\`\`

You also need Docker running on the host. On macOS that means Docker Desktop or OrbStack; on Linux any Docker daemon will work. The Testcontainers library reads \`DOCKER_HOST\` from the environment and falls back to the platform default socket.

Your \`package.json\` should now contain something like:

\`\`\`json
{
  "devDependencies": {
    "@testcontainers/kafka": "^11.2.0",
    "testcontainers": "^11.2.0",
    "kafkajs": "^2.2.4",
    "vitest": "^3.1.0"
  }
}
\`\`\`

---

## Your First KafkaContainer Test

The shortest possible Kafka integration test in TypeScript looks like this:

\`\`\`bash
// tests/kafka.basic.spec.ts
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka } from 'kafkajs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Kafka basic round trip', () => {
  let container: StartedKafkaContainer;
  let bootstrapServer: string;

  beforeAll(async () => {
    container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0').start();
    bootstrapServer = container.getBootstrapServers();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  it('produces and consumes a single message', async () => {
    const kafka = new Kafka({
      clientId: 'tc-test',
      brokers: [bootstrapServer],
    });

    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
      topics: [{ topic: 'orders', numPartitions: 1, replicationFactor: 1 }],
    });
    await admin.disconnect();

    const producer = kafka.producer();
    await producer.connect();
    await producer.send({
      topic: 'orders',
      messages: [{ key: 'order-1', value: JSON.stringify({ id: 1, total: 42 }) }],
    });
    await producer.disconnect();

    const consumer = kafka.consumer({ groupId: 'tc-test-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'orders', fromBeginning: true });

    const received: any[] = [];
    await new Promise<void>((resolve) => {
      consumer.run({
        eachMessage: async ({ message }) => {
          received.push(JSON.parse(message.value!.toString()));
          resolve();
        },
      });
    });

    await consumer.disconnect();
    expect(received).toEqual([{ id: 1, total: 42 }]);
  }, 30_000);
});
\`\`\`

This test does four things: starts a real Kafka broker in Docker, creates a topic, produces a message, and consumes it back. There is no mocking, no stubbing, and no environment-specific configuration. The same test runs identically on your laptop, in GitHub Actions, and in a corporate CI runner.

---

## Understanding KafkaContainer Internals

The \`KafkaContainer\` class wraps the official \`confluentinc/cp-kafka\` Docker image and configures it for single-broker development use. Under the hood it:

1. Pulls the image if missing.
2. Generates a Kafka cluster ID via \`kafka-storage random-uuid\`.
3. Configures KRaft mode (no ZooKeeper needed since Kafka 3.5).
4. Sets up two listeners: \`PLAINTEXT\` for inter-broker traffic and \`PLAINTEXT_HOST\` for the host machine.
5. Exposes the host listener on a dynamic high port that Testcontainers maps to localhost.

You can inspect these listeners with:

\`\`\`bash
const container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0').start();
console.log(container.getBootstrapServers()); // localhost:54321
console.log(container.getHost()); // localhost
console.log(container.getMappedPort(9093)); // 54321
\`\`\`

Always use \`getBootstrapServers()\` rather than hardcoding ports. The dynamic port assignment is what enables parallel test execution.

---

## Wait Strategies: The Source of Most Flakiness

The most common Kafka Testcontainers failure mode is "broker not ready" errors when your producer tries to connect before Kafka has finished initializing partition metadata. Testcontainers' default wait strategy waits for the broker port to be listening, but Kafka starts its socket listener before it is actually ready to accept producers.

The fix is to use \`Wait.forLogMessage\` with the right log line:

\`\`\`bash
import { KafkaContainer } from '@testcontainers/kafka';
import { Wait } from 'testcontainers';

const container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
  .withWaitStrategy(
    Wait.forLogMessage(/Kafka Server started/, 1)
  )
  .start();
\`\`\`

For producers using transactions or idempotence, you may want a more aggressive wait:

\`\`\`bash
const container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
  .withStartupTimeout(120_000)
  .withWaitStrategy(
    Wait.forAll([
      Wait.forLogMessage(/Kafka Server started/, 1),
      Wait.forLogMessage(/Awaiting socket connections/, 1),
    ])
  )
  .start();
\`\`\`

Our [Testcontainers best practices guide](/blog/testcontainers-best-practices-2026) covers wait strategy selection and lifecycle design.

---

## Testing Producers in Isolation

Producer-only tests are the simplest case. You start the broker, instantiate your production producer code, and assert on the messages by consuming them with a test-only consumer.

\`\`\`bash
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka, Producer } from 'kafkajs';
import { OrderPublisher } from '../src/order-publisher';

describe('OrderPublisher', () => {
  let container: StartedKafkaContainer;
  let publisher: OrderPublisher;
  let testConsumer: any;

  beforeAll(async () => {
    container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0').start();
    publisher = new OrderPublisher({
      brokers: [container.getBootstrapServers()],
      topic: 'orders',
    });
    await publisher.connect();

    const kafka = new Kafka({ clientId: 'test', brokers: [container.getBootstrapServers()] });
    testConsumer = kafka.consumer({ groupId: 'assertion-group' });
    await testConsumer.connect();
    await testConsumer.subscribe({ topic: 'orders', fromBeginning: true });
  }, 60_000);

  afterAll(async () => {
    await publisher.disconnect();
    await testConsumer.disconnect();
    await container.stop();
  });

  it('publishes an order event with the correct key', async () => {
    const messages: any[] = [];
    testConsumer.run({
      eachMessage: async ({ message }: any) => {
        messages.push({
          key: message.key!.toString(),
          value: JSON.parse(message.value!.toString()),
        });
      },
    });

    await publisher.publish({ orderId: 'ord-42', amount: 199.99 });

    await new Promise((r) => setTimeout(r, 1500));
    expect(messages).toHaveLength(1);
    expect(messages[0].key).toBe('ord-42');
    expect(messages[0].value.amount).toBe(199.99);
  }, 30_000);
});
\`\`\`

This pattern catches serialization bugs, schema mismatches, and key/partition routing errors that pure unit tests cannot find.

---

## Testing Consumers in Isolation

Consumer tests invert the flow: you publish messages with a test producer and verify your production consumer code processes them correctly.

\`\`\`bash
import { Kafka } from 'kafkajs';
import { OrderProcessor } from '../src/order-processor';

it('processes an order event end-to-end', async () => {
  const kafka = new Kafka({ clientId: 'test-prod', brokers: [container.getBootstrapServers()] });
  const producer = kafka.producer();
  await producer.connect();

  const processor = new OrderProcessor({
    brokers: [container.getBootstrapServers()],
    topic: 'orders',
    groupId: 'order-processor',
  });

  const processed: any[] = [];
  processor.onProcessed = (order) => processed.push(order);
  await processor.start();

  await producer.send({
    topic: 'orders',
    messages: [
      { key: 'ord-1', value: JSON.stringify({ orderId: 'ord-1', amount: 50 }) },
      { key: 'ord-2', value: JSON.stringify({ orderId: 'ord-2', amount: 75 }) },
    ],
  });

  await new Promise((r) => setTimeout(r, 2000));
  await producer.disconnect();
  await processor.stop();

  expect(processed).toHaveLength(2);
  expect(processed.map((o) => o.orderId)).toEqual(['ord-1', 'ord-2']);
}, 30_000);
\`\`\`

---

## Schema Registry Integration

When your team uses Confluent Schema Registry for Avro or Protobuf, you need to run a second container alongside Kafka, networked together.

\`\`\`bash
import { GenericContainer, Network } from 'testcontainers';
import { KafkaContainer } from '@testcontainers/kafka';

const network = await new Network().start();

const kafka = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
  .withNetwork(network)
  .withNetworkAliases('kafka')
  .start();

const schemaRegistry = await new GenericContainer('confluentinc/cp-schema-registry:7.6.0')
  .withNetwork(network)
  .withEnvironment({
    SCHEMA_REGISTRY_HOST_NAME: 'schema-registry',
    SCHEMA_REGISTRY_LISTENERS: 'http://0.0.0.0:8081',
    SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: 'PLAINTEXT://kafka:9092',
  })
  .withExposedPorts(8081)
  .start();

const schemaRegistryUrl = \`http://\${schemaRegistry.getHost()}:\${schemaRegistry.getMappedPort(8081)}\`;
\`\`\`

The shared network is critical: containers communicate over their network aliases (\`kafka:9092\`) while your test code on the host uses the mapped ports. See our [Testcontainers best practices guide](/blog/testcontainers-best-practices-2026) for networking and lifecycle patterns.

---

## The withReuse() Pattern for Local Speed

If your test suite has 50+ integration tests, restarting Kafka before each test file is wasteful. Testcontainers supports container reuse: the first run starts a broker, subsequent runs reuse the same broker until you explicitly clean it.

\`\`\`bash
import { KafkaContainer } from '@testcontainers/kafka';

const container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
  .withReuse()
  .start();
\`\`\`

Enable reuse globally by adding \`testcontainers.reuse.enable=true\` to \`~/.testcontainers.properties\` on your dev machine. CI runs ignore reuse by default, so production behavior is unaffected.

The trade-off is that you must clean up topics between tests with the admin client:

\`\`\`bash
const admin = kafka.admin();
await admin.connect();
const topics = await admin.listTopics();
await admin.deleteTopics({ topics: topics.filter((t) => !t.startsWith('_')) });
await admin.disconnect();
\`\`\`

See our [withReuse() pattern guide](/blog/testcontainers-reuse-withreuse-node-guide) for the full pattern.

---

## Java Equivalent with Spring Boot

The same patterns work identically in Java with Spring Boot. The Kafka module is part of Testcontainers core:

\`\`\`bash
// build.gradle
testImplementation 'org.testcontainers:kafka:1.20.4'
testImplementation 'org.testcontainers:junit-jupiter:1.20.4'
testImplementation 'org.springframework.kafka:spring-kafka-test'
\`\`\`

\`\`\`bash
// src/test/java/com/example/OrderPublisherIT.java
@SpringBootTest
@Testcontainers
class OrderPublisherIT {

    @Container
    static KafkaContainer kafka = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.6.0")
    );

    @DynamicPropertySource
    static void kafkaProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
    }

    @Autowired
    private OrderPublisher publisher;

    @Test
    void publishesOrderEvent() throws Exception {
        publisher.publish(new Order("ord-1", new BigDecimal("99.99")));
        // Assert via test consumer...
    }
}
\`\`\`

The Spring Boot \`@DynamicPropertySource\` hook is the cleanest way to inject the broker URL into your application context. See [Testcontainers Spring Boot guide](/blog/testcontainers-kafka-java-spring-boot-guide) for more.

---

## Python Equivalent with pytest

For Python teams, \`testcontainers-python\` provides a Kafka module:

\`\`\`bash
pip install testcontainers[kafka] kafka-python pytest
\`\`\`

\`\`\`bash
# tests/test_order_publisher.py
import json
import pytest
from testcontainers.kafka import KafkaContainer
from kafka import KafkaProducer, KafkaConsumer

@pytest.fixture(scope="module")
def kafka():
    with KafkaContainer("confluentinc/cp-kafka:7.6.0") as container:
        yield container

def test_round_trip(kafka):
    bootstrap = kafka.get_bootstrap_server()

    producer = KafkaProducer(
        bootstrap_servers=bootstrap,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    )
    producer.send("orders", {"id": 1, "total": 42})
    producer.flush()

    consumer = KafkaConsumer(
        "orders",
        bootstrap_servers=bootstrap,
        auto_offset_reset="earliest",
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        consumer_timeout_ms=5000,
    )
    messages = [msg.value for msg in consumer]
    assert messages == [{"id": 1, "total": 42}]
\`\`\`

See [Testcontainers pytest guide](/blog/testcontainers-python-pytest-integration-guide) for fixtures and parallel execution patterns.

---

## Running in GitHub Actions

The default \`ubuntu-latest\` runner has Docker pre-installed, so Testcontainers Kafka works without additional setup:

\`\`\`bash
# .github/workflows/test.yml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
        env:
          TESTCONTAINERS_HOST_OVERRIDE: localhost
\`\`\`

A few production tips for CI:

- **Use \`actions/cache\`** to cache the Docker layer of \`confluentinc/cp-kafka\` — it saves 30-60 seconds per run.
- **Set \`TESTCONTAINERS_RYUK_DISABLED=true\`** only in ephemeral runners; never disable Ryuk on long-lived hosts or you will leak containers.
- **Pin Kafka image versions** rather than using \`:latest\` — a Confluent release can change broker behavior.

See the [GitHub Actions testing guide](/blog/github-actions-testing-ci-cd-guide) for the complete CI configuration.

---

## Debugging Common Failures

**"connect ECONNREFUSED 127.0.0.1:9092"** — You are connecting to the wrong port. Always call \`container.getBootstrapServers()\` rather than hardcoding 9092.

**"Cannot find KafkaContainer"** — Wrong import. Use \`import { KafkaContainer } from '@testcontainers/kafka'\`, not from \`testcontainers\` core.

**"Group coordinator not available"** — The broker started before topic metadata was ready. Add a longer \`withStartupTimeout\` and a log-based wait strategy.

**"Ryuk failed to start"** — Docker Desktop is starved for resources. On macOS increase memory to at least 4 GB; on Linux check \`/var/run/docker.sock\` permissions.

**Tests pass locally but fail in CI** — 90% of the time this is image pull throttling. Authenticate to Docker Hub in CI or mirror images to a registry inside your CI cluster.

---

## Testcontainers Kafka vs Docker Compose for Kafka Tests

A common question is whether to keep using Docker Compose for local Kafka and Testcontainers for CI, or unify on Testcontainers everywhere.

| Concern | Docker Compose | Testcontainers |
|---|---|---|
| Setup speed | 20-30s | 5-10s |
| Cleanup reliability | Manual | Automatic via Ryuk |
| Port collisions | Fixed ports | Dynamic ports |
| Parallel test execution | Hard | Built-in |
| CI integration | Custom scripts | One line |
| Developer ergonomics | Separate \`docker compose up\` | Implicit in tests |

For a broader guide to containerized test setup, see [Testcontainers Docker integration testing](/blog/testcontainers-docker-integration-testing). The short answer: Testcontainers wins for tests, Compose wins for long-running dev environments.

---

## Performance Tuning for Faster Tests

Out of the box, KafkaContainer takes 5-8 seconds to start. Three settings cut that to 3-4 seconds:

\`\`\`bash
const container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
  .withEnvironment({
    KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true',
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: '1',
    KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: '1',
    KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: '1',
    KAFKA_LOG_FLUSH_INTERVAL_MESSAGES: '10000',
    KAFKA_NUM_PARTITIONS: '1',
  })
  .withTmpFs({ '/var/lib/kafka/data': 'rw' })
  .start();
\`\`\`

The \`withTmpFs\` mount keeps Kafka's log directory in RAM, eliminating disk I/O. Combined with reuse, you can run a 100-test Kafka suite in under 30 seconds.

---

## Real-World Test Architecture

Here is the pattern we recommend for production codebases:

\`\`\`bash
// tests/setup/kafka-fixture.ts
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';

let container: StartedKafkaContainer | null = null;

export async function startKafka(): Promise<string> {
  if (!container) {
    container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
      .withReuse()
      .start();
  }
  return container.getBootstrapServers();
}

export async function stopKafka() {
  if (container) {
    await container.stop();
    container = null;
  }
}
\`\`\`

\`\`\`bash
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globalSetup: ['./tests/setup/global-setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
});
\`\`\`

Single-fork execution avoids multiple Kafka brokers in parallel — for most teams the trade-off (slightly longer total runtime) is worth the simplicity.

---

## When NOT to Use Testcontainers Kafka

Testcontainers is not the right tool for every Kafka test scenario:

- **Pure unit tests of your serialization logic** — Use Avro/Protobuf libraries directly with no broker.
- **Contract tests against schemas** — Use Pact or Confluent Schema Registry compatibility checks.
- **Performance load testing** — Use a dedicated Kafka cluster with realistic data volume.
- **Multi-broker failover testing** — Use a real multi-broker setup; Testcontainers single broker cannot simulate ISR changes.

For everything else — producer correctness, consumer offset handling, group rebalancing on a single broker, serialization round-trips, error handling — Testcontainers is the right answer.

---

## Putting It All Together

A production-quality Testcontainers Kafka test suite has six characteristics:

1. **One broker per CI job, reused across tests within that job.**
2. **Dynamic port discovery** via \`getBootstrapServers()\`.
3. **Log-based wait strategies** to eliminate startup races.
4. **Topic cleanup between tests** when using reuse.
5. **Schema Registry on a shared network** if you use Avro or Protobuf.
6. **Tuned Kafka environment variables** to cut startup time.

Install the skill so your AI agent can build this scaffolding for new services automatically:

\`\`\`bash
npx @qaskills/cli add testcontainers-kafka-node
\`\`\`

Combined with the [withReuse() pattern](/blog/testcontainers-reuse-withreuse-node-guide) and the [Testcontainers best practices guide](/blog/testcontainers-best-practices-2026), you have everything you need to make Kafka integration tests a default in your pipeline.

---

## Further Reading

- [Testcontainers PostgreSQL guide](/blog/testcontainers-postgresql-node-complete-guide)
- [Testcontainers Redis guide](/blog/testcontainers-redis-node-complete-guide)
- [Testcontainers RabbitMQ guide](/blog/testcontainers-rabbitmq-node-integration-testing)
- [Docker testing strategies](/blog/docker-testing-strategies-guide)
- [Testcontainers Docker integration guide](/blog/testcontainers-docker-integration-testing)

Browse all Testcontainers skills at [qaskills.sh/skills](/skills).
`,
};
