import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Kafka TypeScript: KafkaContainer.getBootstrapServers Reference',
  description:
    'Complete TypeScript reference for @testcontainers/kafka. Cover KafkaContainer, withExposedPorts, getBootstrapServers, kafkajs producer/consumer tests, and cleanup patterns.',
  date: '2026-06-05',
  category: 'Reference',
  content: `
# Testcontainers Kafka TypeScript: KafkaContainer.getBootstrapServers Reference

The \`@testcontainers/kafka\` module gives Node and TypeScript engineers a way to spin up a real Apache Kafka broker inside Docker for integration tests, with \`StartedKafkaContainer.getBootstrapServers()\` returning the host-side bootstrap string that producers and consumers connect to. In this reference we walk through everything you need to write correct, fast, and reliable Kafka tests in TypeScript -- container construction, port exposure, dynamic broker address resolution, kafkajs producer and consumer wiring, advertised listeners, single-broker vs multi-broker setups, KRaft mode, and explicit cleanup. If you are searching for \`startedkafkacontainer getbootstrapservers\` or \`@testcontainers/kafka typescript\` you should find every API surface and idiom here in one place, with copy-pasteable code that runs against the current @testcontainers/kafka v10+ API surface.

We assume Node 20+, TypeScript 5+, Docker Desktop or an OCI-compatible runtime such as Colima or Rancher Desktop running on the test host, and \`jest\` or \`vitest\` as the runner. Every example is self-contained and uses the official kafkajs client, which is the de facto Node client for Kafka in 2026.

## Key Takeaways

- \`KafkaContainer\` is the v10 class exported from \`@testcontainers/kafka\`. It encapsulates a Confluent Kafka image (Confluent Platform 7.x by default) and exposes \`start()\` which returns a \`StartedKafkaContainer\` with \`getBootstrapServers()\`, \`getHost()\`, \`getMappedPort()\`, \`getId()\`, and \`stop()\`
- \`getBootstrapServers()\` returns a string like \`PLAINTEXT://localhost:49205\` -- you typically pass it through \`.replace('PLAINTEXT://', '')\` or use it as-is depending on your client, but kafkajs accepts the host:port form
- Always call \`.withExposedPorts(9093)\` only if you are overriding the default. The default image already exposes 9092 (broker) and 9093 (advertised listener) -- the container's advertised listener resolves the host bind dynamically so producers outside Docker can reach it
- Use \`KRaft\` mode via \`new KafkaContainer().withKraft()\` to skip Zookeeper entirely. It is the recommended mode for Kafka 3.x and starts roughly 30-40% faster
- Never share a container between unrelated test files unless you use \`.withReuse()\` and accept the topic-isolation overhead. Default is one container per file; clean up in \`afterAll\`

## When to Use Testcontainers for Kafka

Kafka is one of the harder pieces of infrastructure to mock convincingly. The protocol is non-trivial, exactly-once semantics require coordinator interaction, consumer groups need a real group coordinator, and offset commits, rebalances, and partition assignment all behave differently against a real broker than against an in-process stub.

You should reach for Testcontainers Kafka when:

- You are testing a producer that uses transactional writes (\`transactionalId\`, \`enableIdempotence\`)
- You need to verify consumer group rebalance behavior
- You are testing a Kafka Streams or kafkajs admin client topology
- Your code commits offsets and you want to verify the commit landed
- You are integration-testing an end-to-end pipeline: HTTP -> producer -> topic -> consumer -> database

For pure schema or serialization tests, an in-process mock is faster and sufficient. For everything that touches the wire, use a real container.

## Installing the Module

Install the kafka module alongside the core testcontainers package and kafkajs:

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/kafka kafkajs
\`\`\`

Or with pnpm:

\`\`\`bash
pnpm add -D testcontainers @testcontainers/kafka kafkajs
\`\`\`

Both packages are TypeScript-native and ship their own type definitions. The kafka module re-exports types from the core module so you only need a single \`import\` line for most use cases.

## The Minimal Working Example

This is the smallest TypeScript test that boots a broker, produces one message, and consumes it. It is the canonical pattern most teams start from.

\`\`\`typescript
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka, Producer, Consumer } from 'kafkajs';

describe('kafka roundtrip', () => {
  let container: StartedKafkaContainer;
  let kafka: Kafka;
  let producer: Producer;
  let consumer: Consumer;

  beforeAll(async () => {
    container = await new KafkaContainer().withKraft().start();
    const brokers = [container.getBootstrapServers()];
    kafka = new Kafka({ clientId: 'test', brokers });
    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: 'test-group' });
    await producer.connect();
    await consumer.connect();
  }, 120_000);

  afterAll(async () => {
    await consumer.disconnect();
    await producer.disconnect();
    await container.stop();
  });

  it('produces and consumes a single message', async () => {
    await consumer.subscribe({ topic: 'demo', fromBeginning: true });
    const received: string[] = [];
    consumer.run({
      eachMessage: async ({ message }) => {
        received.push(message.value!.toString());
      },
    });
    await producer.send({ topic: 'demo', messages: [{ value: 'hello' }] });
    await new Promise((r) => setTimeout(r, 1500));
    expect(received).toEqual(['hello']);
  });
});
\`\`\`

Note the 120-second timeout on \`beforeAll\` -- pulling the Confluent image on a cold machine can take 60+ seconds the first time. Subsequent runs use the cached image and start in 5-10 seconds.

## getBootstrapServers Anatomy

The string returned by \`getBootstrapServers()\` is a bootstrap-server connection string. Internally Testcontainers wires up the Kafka image's advertised listener so the broker tells clients to reconnect to \`localhost:<mappedPort>\` rather than the in-container hostname. Without that translation kafkajs would receive metadata pointing at an unreachable Docker network address and time out.

The exact return value depends on the image and version, but is typically:

\`\`\`text
localhost:49207
\`\`\`

or in legacy 9.x releases:

\`\`\`text
PLAINTEXT://localhost:49207
\`\`\`

kafkajs accepts both forms because its broker parser strips the protocol prefix. For consistency we recommend always splitting on the colon and using \`brokers: [\\\`\${host}:\${port}\\\`]\` once you have inspected the return value.

## Full Configuration Reference

The fluent builder on \`KafkaContainer\` supports a number of methods that change how the broker is configured before \`start()\`:

| Method | Description | Default |
|---|---|---|
| \`.withKraft()\` | Switch to KRaft mode (no Zookeeper). Recommended for Kafka 3.x | Zookeeper |
| \`.withSaslSslListener(port, sasl, cert)\` | Add a SASL/SSL listener | Off |
| \`.withSslListener(port, cert)\` | Add a plain SSL listener | Off |
| \`.withClusterId(id)\` | Set the KRaft cluster ID | Generated |
| \`.withNetwork(network)\` | Attach to a shared Docker network | Default |
| \`.withNetworkAliases(aliases)\` | Add hostname aliases inside the network | None |
| \`.withEnvironment({ KEY: 'value' })\` | Override broker env vars | Confluent defaults |
| \`.withReuse()\` | Reuse container across test runs | Off |
| \`.withStartupTimeout(ms)\` | Wait up to N ms for readiness | 60000 |

Most teams only need \`.withKraft()\` plus an environment override or two. The Confluent image accepts \`KAFKA_*\` env vars that map directly to broker properties, so you can crank up \`KAFKA_NUM_PARTITIONS\` or set \`KAFKA_AUTO_CREATE_TOPICS_ENABLE=false\` to force explicit admin-API topic creation.

\`\`\`typescript
const container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
  .withKraft()
  .withEnvironment({
    KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false',
    KAFKA_NUM_PARTITIONS: '3',
    KAFKA_DEFAULT_REPLICATION_FACTOR: '1',
  })
  .withStartupTimeout(120_000)
  .start();
\`\`\`

## Producer Patterns

A kafkajs producer connected to a Testcontainer broker behaves exactly like one connected to a real cluster. The two patterns we see most often:

### Idempotent, in-order produce

\`\`\`typescript
const producer = kafka.producer({
  idempotent: true,
  maxInFlightRequests: 1,
  retry: { retries: 8 },
});
await producer.connect();
await producer.send({
  topic: 'orders',
  messages: [
    { key: 'order-1', value: JSON.stringify({ amount: 42 }) },
    { key: 'order-1', value: JSON.stringify({ amount: 43 }) },
  ],
});
\`\`\`

### Transactional produce

\`\`\`typescript
const producer = kafka.producer({
  transactionalId: 'tx-test',
  maxInFlightRequests: 1,
  idempotent: true,
});
await producer.connect();
const txn = await producer.transaction();
try {
  await txn.send({ topic: 'a', messages: [{ value: 'x' }] });
  await txn.send({ topic: 'b', messages: [{ value: 'y' }] });
  await txn.commit();
} catch (e) {
  await txn.abort();
  throw e;
}
\`\`\`

Transactions only succeed if the broker's transaction coordinator is up. With \`.withKraft()\` this happens automatically.

## Consumer Patterns

### Consumer group with fromBeginning

\`\`\`typescript
const consumer = kafka.consumer({ groupId: 'analytics' });
await consumer.connect();
await consumer.subscribe({ topic: 'orders', fromBeginning: true });
await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    console.log({ topic, partition, value: message.value?.toString() });
  },
});
\`\`\`

### Manual offset management

\`\`\`typescript
await consumer.run({
  autoCommit: false,
  eachMessage: async ({ topic, partition, message }) => {
    await processBusinessLogic(message);
    await consumer.commitOffsets([
      { topic, partition, offset: (Number(message.offset) + 1).toString() },
    ]);
  },
});
\`\`\`

## Admin Client Topic Creation

When \`KAFKA_AUTO_CREATE_TOPICS_ENABLE\` is disabled you must create topics explicitly. The admin client is included with kafkajs:

\`\`\`typescript
const admin = kafka.admin();
await admin.connect();
await admin.createTopics({
  topics: [
    { topic: 'orders', numPartitions: 3, replicationFactor: 1 },
    { topic: 'payments', numPartitions: 1, replicationFactor: 1 },
  ],
});
const list = await admin.listTopics();
expect(list).toContain('orders');
await admin.disconnect();
\`\`\`

## Multi-Broker Cluster

For tests that need a multi-broker cluster (replication, leader election, rebalance), you currently spin up multiple \`KafkaContainer\` instances on a shared network. As of v10 there is no native multi-broker helper, so you wire it manually:

\`\`\`typescript
import { Network } from 'testcontainers';
import { KafkaContainer } from '@testcontainers/kafka';

const network = await new Network().start();
const broker1 = await new KafkaContainer()
  .withKraft()
  .withNetwork(network)
  .withNetworkAliases(['kafka-1'])
  .start();
const broker2 = await new KafkaContainer()
  .withKraft()
  .withNetwork(network)
  .withNetworkAliases(['kafka-2'])
  .start();
\`\`\`

For most integration tests a single broker is sufficient. Multi-broker tests are best left to a dedicated test suite that runs less often.

## getBootstrapServers vs getHost + getMappedPort

You can also construct the bootstrap string manually using the lower-level accessors. This is useful if you need to inject the value into an env var or config file:

| Accessor | Returns | Example |
|---|---|---|
| \`getBootstrapServers()\` | Full bootstrap string | \`localhost:49207\` |
| \`getHost()\` | Hostname or IP | \`localhost\` |
| \`getMappedPort(9093)\` | Host-side mapped port | \`49207\` |
| \`getId()\` | Docker container ID | \`abc123...\` |
| \`getName()\` | Container name | \`/upbeat_volta\` |

\`\`\`typescript
const host = container.getHost();
const port = container.getMappedPort(9093);
process.env.KAFKA_BROKERS = \\\`\${host}:\${port}\\\`;
\`\`\`

## Cleanup Gotchas

Three failure modes account for ~90% of "why is my Kafka test hanging" support tickets:

1. **Forgetting to disconnect the producer or consumer.** kafkajs holds open TCP sockets and event loops until disconnect is called. Always disconnect in \`afterAll\` before stopping the container.
2. **Letting Jest finish before the consumer flushes.** Pass \`--detectOpenHandles\` to Jest while debugging to see exactly what is keeping the process alive.
3. **Sharing one container across files with \`testEnvironment: 'node'\` and parallel runners.** Either set \`maxWorkers: 1\` or use a shared global setup file that boots the container once.

The cleanup template most teams converge on:

\`\`\`typescript
afterAll(async () => {
  try { await consumer?.disconnect(); } catch {}
  try { await producer?.disconnect(); } catch {}
  try { await admin?.disconnect(); } catch {}
  await container.stop({ timeout: 10000 });
});
\`\`\`

## Reusing Containers Across Runs

If you set \`TESTCONTAINERS_REUSE_ENABLE=true\` and call \`.withReuse()\` the container survives across \`vitest\` or \`jest\` runs. This shortens the inner dev loop from 10 seconds to under one. The deep dive on this lives in our [withReuse guide](/blog/testcontainers-withreuse-node-typescript-guide).

\`\`\`typescript
const container = await new KafkaContainer().withKraft().withReuse().start();
\`\`\`

You are responsible for cleaning up topics between runs because the container does not restart. The simplest pattern is to delete all topics in \`beforeAll\` if they exist.

## Performance Tips

| Tip | Speedup |
|---|---|
| Use KRaft mode (\`.withKraft()\`) | 30-40% faster startup |
| Pin the image tag (\`cp-kafka:7.6.0\`) | Avoids re-pull on patch versions |
| Reuse containers between runs | 10x faster on warm runs |
| Use a single broker for integration tests | Avoids replication overhead |
| Pre-create topics with the admin client | Avoids first-message latency |
| Disable auto topic creation | Forces explicit, race-free setup |

## Integration with Schema Registry

If your producer uses Confluent Schema Registry you can spin one up with the generic \`GenericContainer\`:

\`\`\`typescript
import { GenericContainer } from 'testcontainers';

const network = await new Network().start();
const broker = await new KafkaContainer()
  .withKraft()
  .withNetwork(network)
  .withNetworkAliases(['kafka'])
  .start();
const registry = await new GenericContainer('confluentinc/cp-schema-registry:7.6.0')
  .withNetwork(network)
  .withExposedPorts(8081)
  .withEnvironment({
    SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: 'PLAINTEXT://kafka:9092',
    SCHEMA_REGISTRY_HOST_NAME: 'registry',
    SCHEMA_REGISTRY_LISTENERS: 'http://0.0.0.0:8081',
  })
  .start();

const registryUrl = \\\`http://\${registry.getHost()}:\${registry.getMappedPort(8081)}\\\`;
\`\`\`

You can then point Avro or Protobuf serializers at \`registryUrl\` and run end-to-end schema-aware tests.

## Comparison: Testcontainers vs Embedded Brokers

| Approach | Setup time | Realism | CI friendly |
|---|---|---|---|
| Testcontainers Kafka | 5-10s warm | High (real broker) | Yes, needs Docker |
| node-rdkafka mock | Instant | Low (mock surface) | Yes |
| MSK Serverless / Confluent Cloud | Slow account setup | High | Requires creds |
| Local Docker Compose | Manual | High | Manual |

For most CI pipelines Testcontainers wins because it is hermetic, requires no shared infrastructure, and produces deterministic test runs.

## Frequently Asked Questions

### Why does getBootstrapServers return a different port each run?

Docker assigns a random ephemeral host-side port to the broker's advertised listener every time you start the container. That is by design -- it means you can run dozens of test files in parallel without port conflicts. Always read the port at runtime; never hardcode it.

### Can I use Bitnami Kafka instead of Confluent?

Yes. Pass the image tag to the constructor: \`new KafkaContainer('bitnami/kafka:3.6.0')\`. The module's wait strategy is tuned for Confluent images, so for Bitnami you may want to override with \`.withWaitStrategy(Wait.forLogMessage(/started.*KafkaServer/))\`.

### How do I test SASL/SSL authentication?

Use \`.withSaslSslListener(9094, sasl, cert)\` and pass matching credentials to kafkajs's \`ssl\` and \`sasl\` config blocks. The module accepts a \`SaslConfiguration\` object with \`mechanism\` (PLAIN, SCRAM-SHA-256, SCRAM-SHA-512) and a list of users. Generate a self-signed cert with \`openssl\` or use a fixture.

### What about Kafka Streams or kStream applications?

Kafka Streams runs in your test process and talks to the container exactly like a producer or consumer would. Pass \`brokers: [container.getBootstrapServers()]\` into the streams config and you are done. Use \`auto.offset.reset = earliest\` to make tests deterministic.

### Why does my consumer hang in CI but pass locally?

Almost always it is a missing \`fromBeginning: true\` plus a race where the producer publishes before the consumer joins the group. The fix is either to wait for \`consumer.run\` to emit a \`GROUP_JOIN\` event before producing, or to use \`fromBeginning: true\` so the consumer reads back from offset 0 regardless of join order.

### Does .withReuse() work with KRaft?

Yes, but be aware that reusing a KRaft broker preserves cluster metadata across runs. If your test asserts on topic count or offset-zero state, you must delete topics in \`beforeAll\`. The \`testcontainers\` reuse hash is computed from the container config, so changing \`.withEnvironment()\` invalidates the reuse.

### How do I run this on Apple Silicon?

The Confluent images publish arm64 manifests as of 7.5.x, so they run natively on M1/M2/M3. Older 6.x images run under qemu emulation, which is 3-5x slower. Pin to 7.5.0 or later for native performance.

## Conclusion

\`@testcontainers/kafka\` v10 makes Kafka integration testing in TypeScript almost as easy as unit testing a pure function. Start a \`KafkaContainer\` with \`.withKraft()\`, pull \`getBootstrapServers()\` after \`.start()\`, hand it to kafkajs, and you have a real broker for the duration of the test file. Disconnect clients in \`afterAll\`, stop the container, and let Docker reclaim the resources. For deeper exploration check our [related Testcontainers guides](/blog/testcontainers-mysql-postgres-node-startedcontainer-reference), the [withReuse() reference](/blog/testcontainers-withreuse-node-typescript-guide), and our curated [QA skills directory](/skills) for AI agent skills that auto-generate Kafka integration tests for you.

Ready to wire this into your agent's skillset? Browse the [Kafka testing skills](/skills) and the [container testing comparison](/compare) to find the right fit.
`,
};
