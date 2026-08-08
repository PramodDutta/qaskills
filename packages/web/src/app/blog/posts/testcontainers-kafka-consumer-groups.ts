import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Kafka Consumer Groups: Deterministic Integration Tests',
  description: 'Master testcontainers Kafka consumer groups with deterministic rebalance, offset, restart, and retry tests that expose real messaging defects before CI.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Testcontainers Kafka Consumer Groups: Deterministic Integration Tests

Testing Kafka consumer groups with Testcontainers means starting a real broker for the test suite, giving every test a unique topic and group ID, and asserting externally visible group behavior rather than sleeping for an assumed amount of time. A useful test proves which records were processed, when offsets became committed, how work moved after a member joined or left, and what happened when processing failed. That is much closer to production than a mocked consumer callback.

The reliable pattern is: create infrastructure once for an isolated suite, create topic state explicitly, subscribe consumers before producing when timing matters, and wait on an observable condition with a deadline. Use the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) to place these slower integration checks beside unit and contract tests. If the consumer ultimately drives a browser-visible workflow, the [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) helps keep that final UI assertion independent from Kafka timing.

## Define the consumer-group contract before writing the fixture

A consumer-group test is valuable only when it names the behavior under test. “Message was consumed” is not enough. The same message can be observed before its offset is durable, by the wrong group, twice after a restart, or by two instances because the handler writes are not idempotent. Start with a contract that distinguishes delivery, ownership, progress, and side effects.

| Contract question | Observable evidence | Common false positive |
|---|---|---|
| Did the group receive every intended record? | Collected keys or durable output rows match the fixture | A single callback ran |
| Did partitions have only one active owner per group? | Instance logs identify disjoint partition assignments | Two consumers both started successfully |
| Was progress committed? | Administrative offset reads reach expected offsets | Handler resolved in memory |
| Can another group read independently? | Second group receives the full fixture | Reusing one group and expecting replay |
| Does restart resume correctly? | Restarted member begins after committed progress | Topic was recreated, hiding resume behavior |
| Is retry safe? | Final side effects are correct after an induced failure | Callback count alone equals one |

Kafka normally provides at-least-once delivery to application code. Exactly-once outcomes require more than a consumer setting: transaction boundaries, producer behavior, database design, and idempotency all matter. Phrase assertions around the product guarantee. If a billing consumer promises one ledger entry per event ID, assert the unique ledger result after a replay. Do not claim the callback can never execute twice.

## Build one broker fixture with unique test namespaces

The following Vitest fixture uses Testcontainers for Node and KafkaJS. It starts one broker for the file, then gives each test unique names. The image is configurable so local and CI runs can use the same reviewed image reference. Install the documented packages used by the project and keep their resolved versions in the lockfile.

\`\`\`ts
// kafka-test-context.ts
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka } from 'kafkajs';

let container: StartedKafkaContainer;

export async function startKafka(): Promise<void> {
  const image = process.env.KAFKA_TEST_IMAGE;
  if (!image) {
    throw new Error('KAFKA_TEST_IMAGE must name the approved Kafka image');
  }
  container = await new KafkaContainer(image).start();
}

export async function stopKafka(): Promise<void> {
  await container.stop();
}

export function kafkaClient(clientId: string): Kafka {
  return new Kafka({
    clientId,
    brokers: [container.getHost() + ':' + container.getMappedPort(9093)],
    retry: { retries: 5 },
  });
}

export function uniqueName(prefix: string): string {
  return prefix + '-' + crypto.randomUUID();
}
\`\`\`

Testcontainers maps the broker port and advertises an address reachable from the test process. Build the bootstrap address from the started container’s documented host and mapped Kafka listener port. Hard-coding \`localhost:9092\` bypasses port mapping and often works on one laptop while failing under parallel CI.

Use one container per suite when tests can be separated by names. Starting a broker for every individual assertion maximizes isolation but makes diagnosis and runtime worse. Conversely, sharing a fixed topic and group across the whole repository leaks offsets and records between cases. A practical boundary is one container per test file or worker, with a unique topic and group per test.

## Create topics explicitly and fail early on setup errors

Automatic topic creation can obscure spelling mistakes and lets broker defaults decide partition count. An integration test should create the topology that its assertion assumes.

\`\`\`ts
// kafka-helpers.ts
import type { Kafka } from 'kafkajs';

export async function createTopic(
  kafka: Kafka,
  topic: string,
  numPartitions: number,
): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();
  try {
    const created = await admin.createTopics({
      waitForLeaders: true,
      topics: [{ topic, numPartitions, replicationFactor: 1 }],
    });
    if (!created) {
      const topics = await admin.listTopics();
      if (!topics.includes(topic)) {
        throw new Error('Topic was neither created nor listed: ' + topic);
      }
    }
  } finally {
    await admin.disconnect();
  }
}

export async function produceKeyed(
  kafka: Kafka,
  topic: string,
  records: Array<{ key: string; value: string }>,
): Promise<void> {
  const producer = kafka.producer();
  await producer.connect();
  try {
    await producer.send({
      topic,
      messages: records.map((record) => ({
        key: record.key,
        value: record.value,
      })),
    });
  } finally {
    await producer.disconnect();
  }
}
\`\`\`

The helper treats a false \`createTopics\` result carefully because KafkaJS returns whether topics were created. It verifies that the desired topic exists instead of assuming setup succeeded. A single broker necessarily uses replication factor one. That setup can test client protocol, groups, offsets, serialization, and application handling, but not replica failover or quorum behavior.

| Fixture decision | Prefer | Avoid |
|---|---|---|
| Bootstrap address | Started container accessor | Literal host port |
| Topic naming | Unique, test-owned name | Shared \`events\` topic |
| Group naming | Unique except in restart tests | Process-global group constant |
| Partition count | Explicit from scenario | Broker default |
| Broker lifecycle | Suite or worker boundary | Unbounded singleton across suites |
| Cleanup | Disconnect clients, then stop container | Rely on process exit |

## Synchronize on evidence, never arbitrary sleeps

Kafka group coordination is asynchronous. A consumer connects, joins, receives an assignment, fetches, handles records, and commits according to its configuration. A fixed pause guesses how long that chain takes. On a fast machine it wastes time; under load it expires before the useful event.

Use a polling helper with a monotonic deadline and an error that reports what remained missing:

\`\`\`ts
// eventually.ts
export async function eventually(
  description: string,
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 10_000,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  let checks = 0;

  while (performance.now() < deadline) {
    checks += 1;
    if (await predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(
    'Timed out waiting for ' + description + ' after ' + checks + ' checks',
  );
}
\`\`\`

This helper is appropriate for test-owned in-memory observations. For production side effects, poll the database or service API instead. The most credible oracle sits outside the callback that could fail. If the callback appends an ID to an array before the database transaction rejects, the array says “processed” while the product state says otherwise.

What people get wrong is waiting for a consumer to connect and treating that as group readiness. Connection proves a transport session, not that the member owns a partition. Starting \`consumer.run\` and then producing usually works because Kafka retains records, but it does not prove the member was assigned before the action. When ordering matters, expose a readiness signal from the application or use a probe record whose durable effect can be observed before the measured phase begins.

## Prove one group shares work without over-specifying the assignment

Kafka assigns a partition to at most one consumer within the same group at a time. With two consumers and four partitions, each record should be handled by one member, but the exact partition-to-member mapping can change with the partition assigner and membership timing. Assert disjoint processing and complete coverage, not that consumer A owns partitions zero and one.

\`\`\`ts
// consumer-groups.test.ts
import { afterAll, beforeAll, expect, test } from 'vitest';
import {
  kafkaClient,
  startKafka,
  stopKafka,
  uniqueName,
} from './kafka-test-context';
import { createTopic, produceKeyed } from './kafka-helpers';
import { eventually } from './eventually';

beforeAll(startKafka, 60_000);
afterAll(stopKafka);

test('members in one group divide records without duplicate ownership', async () => {
  const topic = uniqueName('orders');
  const groupId = uniqueName('order-indexers');
  const kafka = kafkaClient('group-sharing-test');
  await createTopic(kafka, topic, 4);

  const seenBy = new Map<string, string>();
  const duplicates: string[] = [];
  const joined = new Set<string>();
  const consumers = ['alpha', 'beta'].map((member) =>
    kafka.consumer({ groupId }),
  );

  for (let index = 0; index < consumers.length; index += 1) {
    const consumer = consumers[index];
    const member = ['alpha', 'beta'][index];
    consumer.on(consumer.events.GROUP_JOIN, () => {
      joined.add(member);
    });
    await consumer.connect();
    await consumer.subscribe({ topics: [topic], fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ message }) => {
        const key = message.key?.toString();
        if (!key) throw new Error('Expected every fixture record to have a key');
        if (seenBy.has(key)) duplicates.push(key);
        seenBy.set(key, member);
      },
    });
  }

  try {
    await eventually('both consumers to join the group', () => joined.size === 2);
    const records = Array.from({ length: 12 }, (_, index) => ({
      key: 'order-' + index,
      value: JSON.stringify({ orderId: index }),
    }));
    await produceKeyed(kafka, topic, records);
    await eventually('all 12 unique order keys', () => seenBy.size === 12);

    expect([...seenBy.keys()].sort()).toEqual(
      records.map((record) => record.key).sort(),
    );
    expect(duplicates).toEqual([]);
    expect(new Set(seenBy.values()).size).toBeGreaterThan(1);
  } finally {
    await Promise.all(consumers.map((consumer) => consumer.disconnect()));
  }
});
\`\`\`

The final assertion that both consumers participate is valid here because four partitions provide available work and the test is explicitly about distribution. The KafkaJS group-join instrumentation gate prevents the batch from being produced before both members have joined. Instrumentation is diagnostic test synchronization, while complete, non-duplicate outcomes remain the product assertion. If an application wraps the client, prefer an application-supported readiness signal rather than reaching through that abstraction from every test.

## Verify independent groups receive independent copies

Two group IDs maintain separate offsets. That makes fan-out possible: an indexing group and an audit group can both consume every order event. The test must use distinct group IDs against the same topic and compare the complete fixture.

\`\`\`ts
import { expect, test } from 'vitest';
import { kafkaClient, uniqueName } from './kafka-test-context';
import { createTopic, produceKeyed } from './kafka-helpers';
import { eventually } from './eventually';

test('independent groups each receive the full event stream', async () => {
  const topic = uniqueName('account-events');
  const kafka = kafkaClient('fan-out-test');
  await createTopic(kafka, topic, 2);

  const fixture = ['created', 'verified', 'activated'];
  const received = new Map<string, string[]>([
    ['search', []],
    ['audit', []],
  ]);
  const consumers = [...received.keys()].map((name) => ({
    name,
    client: kafka.consumer({ groupId: uniqueName(name) }),
  }));

  for (const consumer of consumers) {
    await consumer.client.connect();
    await consumer.client.subscribe({ topics: [topic], fromBeginning: true });
    await consumer.client.run({
      eachMessage: async ({ message }) => {
        received.get(consumer.name)?.push(message.value?.toString() ?? '');
      },
    });
  }

  try {
    await produceKeyed(
      kafka,
      topic,
      fixture.map((value, index) => ({ key: String(index), value })),
    );
    await eventually('both groups to receive three records', () =>
      [...received.values()].every((values) => values.length === fixture.length),
    );
    expect(received.get('search')?.sort()).toEqual([...fixture].sort());
    expect(received.get('audit')?.sort()).toEqual([...fixture].sort());
  } finally {
    await Promise.all(consumers.map(({ client }) => client.disconnect()));
  }
});
\`\`\`

Do not compare arrival order across partitions. Kafka ordering is per partition, not a total order for a topic. If order matters, use one key so related records select the same partition, then assert the sequence for that key. A fixture spread across two partitions may arrive in a different interleaving while remaining entirely correct.

## Test committed offsets through restart behavior

Offsets matter because they determine recovery. The most understandable test consumes a first batch, disconnects cleanly, starts a new consumer with the same group, produces a second batch, and proves only the new records create new side effects. Keep the topic intact between phases.

\`\`\`ts
import { expect, test } from 'vitest';
import { kafkaClient, uniqueName } from './kafka-test-context';
import { createTopic, produceKeyed } from './kafka-helpers';
import { eventually } from './eventually';

test('a replacement member resumes after committed progress', async () => {
  const topic = uniqueName('notifications');
  const groupId = uniqueName('notification-sender');
  const kafka = kafkaClient('restart-test');
  await createTopic(kafka, topic, 1);

  const delivered: string[] = [];
  async function runConsumer() {
    const consumer = kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topics: [topic], fromBeginning: true });
    await consumer.run({
      eachMessage: async ({ message }) => {
        const key = message.key?.toString();
        if (!key) throw new Error('Missing notification key');
        delivered.push(key);
      },
    });
    return consumer;
  }

  let consumer = await runConsumer();
  await produceKeyed(kafka, topic, [
    { key: 'n-1', value: 'first' },
    { key: 'n-2', value: 'second' },
  ]);
  await eventually('first batch', () => delivered.length === 2);
  await consumer.disconnect();

  consumer = await runConsumer();
  try {
    await produceKeyed(kafka, topic, [{ key: 'n-3', value: 'third' }]);
    await eventually('replacement member to receive new record', () =>
      delivered.includes('n-3'),
    );
    expect(delivered).toEqual(['n-1', 'n-2', 'n-3']);
  } finally {
    await consumer.disconnect();
  }
});
\`\`\`

This checks graceful restart under the client’s normal auto-commit behavior. It does not prove crash timing. To test failure between side effect and offset commit, deliberately control the processing and commit model used by the application, then terminate or reject at a named boundary. Keep that scenario separate because its expected outcome may include redelivery.

| Failure boundary | Likely observation | Correct application assertion |
|---|---|---|
| Before handler starts | Record remains available | Event eventually processed |
| During handler, before durable side effect | Handler may retry or group may redeliver | No partial business state |
| After side effect, before offset commit | Record can be delivered again | Idempotency prevents duplicate outcome |
| After offset commit | Group resumes after record | Durable effect already exists |
| Member leaves during rebalance | Partitions transfer | All records covered, no simultaneous ownership |

## Diagnose the realistic CI failure: intermittent missing records

Imagine a test that starts two consumers, produces ten records, sleeps 500 milliseconds, and expects ten array entries. It passes locally and reports seven or nine in CI. Increasing the sleep to two seconds appears to fix it, then the failure returns when workers contend for CPU.

The diagnosis begins with a timeline. Record container start, topic creation, each consumer connection, each subscription, handler observations with topic-partition-offset, disconnect, and assertion time. Preserve container logs on failure. The first differing event usually reveals one of four causes:

1. The assertion ran before handlers completed.
2. One consumer joined after the batch was already drained, invalidating an assertion that both must participate.
3. Multiple tests reused a group ID, so another worker advanced offsets.
4. The test compared a cross-partition arrival order that Kafka never guaranteed.

Replace the pause with a deadline around the exact outcome. Generate topic and group names per test. If participation matters, add a controlled second phase after membership is observable. Sort only where order is explicitly irrelevant, and preserve partition-local order where it is the contract. Larger sleeps conceal all four causes without correcting any of them.

Capture enough context in the handler to make a failure actionable:

\`\`\`ts
type Observation = {
  member: string;
  topic: string;
  partition: number;
  offset: string;
  key: string | null;
};

const observations: Observation[] = [];

function recordObservation(
  member: string,
  event: {
    topic: string;
    partition: number;
    message: { offset: string; key: Buffer | null };
  },
): void {
  observations.push({
    member,
    topic: event.topic,
    partition: event.partition,
    offset: event.message.offset,
    key: event.message.key?.toString() ?? null,
  });
}
\`\`\`

Offsets are represented as strings by KafkaJS. Keep them as strings in diagnostic output unless numeric calculation is necessary, because offsets can exceed the safe integer range of JavaScript numbers. When comparing positions, use \`BigInt\` only after validating the value is a base-10 integer.

## Make retry and poison-record tests product-specific

A poison record can loop forever, block a partition, be skipped, or be routed to a dead-letter topic. There is no universal right answer. Write the expected policy into the test and observe its durable consequence.

For a dead-letter policy, produce one valid payload, one malformed payload, and another valid payload with the same key so they remain ordered in one partition. Assert that valid side effects exist, the malformed event appears in the configured dead-letter destination with identifying metadata, and the partition advances according to policy. If the implementation retries, instrument an attempt count in the test adapter but keep the primary assertions on outputs.

Avoid using a globally invalid serializer merely to force failure. That can fail in the producer before Kafka receives anything. Produce valid bytes that violate the consumer’s application schema, such as JSON missing a required property. Then the scenario exercises the intended handler branch.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when an agent needs a repeatable checklist for this kind of integration test. The skill should still follow the repository’s real consumer policy, image choice, and observability conventions rather than generating generic sleeps.

## Scale the suite without turning Kafka into shared mutable state

Parallel execution is safe when every test owns its namespace and the broker has enough resources. It becomes unsafe when group IDs, transaction IDs, topic names, or output database rows collide. Include the worker identity only as one component of a unique name, not as the sole unique value, because a worker number repeats across CI jobs.

In shell configuration, delimit composed variables so expansion is unambiguous:

\`\`\`bash
export KAFKA_TEST_NAMESPACE="\${CI_PIPELINE_ID:-local}_\${CI_NODE_INDEX:-0}"
npm run test:integration
\`\`\`

Inside tests, add a random UUID or test case slug. Random naming is appropriate for infrastructure identity, while deterministic event keys make assertions and logs readable. Report the generated names on failure so engineers can connect test output with broker logs.

Set suite timeouts based on a cold container start plus a bounded processing deadline, not by multiplying arbitrary sleeps. A local developer may reuse an image cache, while a new CI worker must pull the image. Pre-pull the approved image in CI where practical, and distinguish an image-pull failure from a consumer assertion timeout.

Finally, disconnect consumers and producers in \`finally\` blocks. A failed assertion should not leave a running member that changes group behavior for the next test. Stop the container after clients close so disconnect errors are not hidden behind a broker shutdown.

## Review checklist for a trustworthy group test

| Review item | Passing evidence |
|---|---|
| Isolation | Unique topic and group IDs are visible in failure output |
| Topology | Topic and partition count are explicitly created |
| Readiness | Assertions poll a product or protocol signal with a deadline |
| Ordering | Only partition-local ordering is assumed |
| Progress | Restart or administrative evidence covers offsets when relevant |
| Delivery model | Assertions allow redelivery where at-least-once applies |
| Side effects | Durable outputs, not only callback counters, are checked |
| Diagnostics | Topic, partition, offset, key, and member are captured |
| Cleanup | All clients disconnect and the container stops |
| CI parity | Image reference and package lock are controlled |

The central discipline is to test Kafka as a stateful coordination system, not as a slow function call. Names isolate state. Partition-aware fixtures express ordering. External observations prove outcomes. Deadlines replace guesses. With those pieces, Testcontainers Kafka consumer groups become dependable regression tests for rebalances, recovery, and delivery semantics rather than a source of random red builds.

## Frequently Asked Questions

### Should every consumer-group test start its own Kafka container?

Usually no. A container per suite or test worker offers a useful balance when each case creates unique topics and group IDs. A container per test gives stronger process isolation but increases startup time and image pressure. Share only inside a well-defined lifecycle, never as an unbounded global service across unrelated jobs. Tests for broker restart, configuration changes, or destructive failure injection should receive their own container because they intentionally mutate infrastructure state that names alone cannot isolate.

### How can a test know that a Kafka consumer is ready?

Choose a signal that matches the scenario. A connection event only proves transport connectivity. For a black-box application test, send a probe record and wait for its durable side effect before beginning the measured phase. For a component with supported instrumentation, expose assignment information and wait until the expected partition set is non-empty. Avoid fixed delays. Every wait should have a deadline and print current assignments, observed records, or output state so a timeout explains what failed to become ready.

### Can these tests prove exactly-once processing?

They can prove an application outcome under specific failure scenarios, but a callback count is not proof of exactly-once semantics. Kafka consumers may receive a record again when failure occurs after a side effect but before the offset is committed. Test the actual guarantee, such as one ledger row per event ID, by injecting failure at named boundaries and checking durable state after recovery. If transactions span Kafka and another datastore, document the coordination design and test each recovery window explicitly.

### Why does a consumer-group test pass locally but fail in parallel CI?

The usual causes are shared topic or group names, assertions based on short sleeps, resource contention delaying rebalances, or environmental mismatch in the broker image. Print generated resource names and topic-partition-offset observations, then compare the first missing event in the timeline. Give each case a unique namespace, wait on explicit outcomes, close consumers in \`finally\`, and keep the container image consistent. If failures remain, run the single test with one worker to separate concurrency leakage from a genuine protocol or application defect.
`,
};
