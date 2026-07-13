import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Test Kafka Consumer Rebalancing with Testcontainers",
  description:
    "Test Kafka consumer rebalancing with Testcontainers and KafkaJS by adding group members, observing assignments, and proving every partition stays owned.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Test Kafka Consumer Rebalancing with Testcontainers

Consumer A owns all four partitions. Consumer B joins the same group. Within seconds, the group must stop, coordinate, and redistribute ownership without leaving a partition abandoned or assigning one partition to both active members. That transition, rather than ordinary message consumption, is the subject of a rebalance test.

A broker in a container gives this test something a mock cannot: group membership, heartbeats, coordinator state, partition assignment, and real client events. Testcontainers supplies the disposable Kafka process, while KafkaJS supplies consumers and a \`GROUP_JOIN\` instrumentation event whose assignment can be inspected. The combination supports a deterministic assertion about ownership after membership changes.

This tutorial uses TypeScript, \`@testcontainers/kafka\`, KafkaJS, and Vitest. It deliberately tests a topic with multiple partitions. A one-partition topic cannot demonstrate meaningful distribution to a second consumer.

## Model the invariant before starting Kafka

“A rebalance happened” is an implementation observation, not a complete outcome. Define what must be true after the group stabilizes.

For two healthy consumers and four partitions in one topic, useful invariants are:

- both consumers join the same group;
- the union of their assignments equals partitions 0, 1, 2, and 3;
- their assignment sets do not overlap;
- neither consumer owns all partitions after the second member joins;
- produced records are processed once by the application-level test probe during the stable phase.

Do not require a particular mapping such as A gets 0 and 2 while B gets 1 and 3 unless the configured assigner guarantees that exact result and the mapping itself is the contract. Kafka assignment can vary with client member identity, assigner strategy, and protocol behavior.

| Assertion | Stable contract? | Reason |
|---|---:|---|
| All topic partitions have one active owner | Yes | Missing or duplicate ownership breaks group processing |
| Both consumers receive at least one of four partitions | Usually | With two members and enough partitions, distribution is expected |
| Consumer A always receives partition 0 | No | Member IDs and assignment details can vary |
| Rebalance completes within a bounded test timeout | Yes, locally scoped | A hung group must fail rather than stall CI |
| Records arrive in a global cross-partition order | No | Kafka orders records within a partition, not across all partitions |

These invariants keep the test valuable across broker and client upgrades without making it vague.

## Start a disposable broker and create a partitioned topic

The Kafka Testcontainers module exposes \`KafkaContainer\`. A started container provides a host and mapped Kafka listener port that KafkaJS can use from the host test process. The example creates the topic through KafkaJS Admin rather than depending on auto-topic creation.

\`\`\`ts
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { Admin, Kafka, logLevel } from 'kafkajs';
import { afterAll, beforeAll } from 'vitest';

let container: StartedKafkaContainer;
let kafka: Kafka;
let admin: Admin;

beforeAll(async () => {
  container = await new KafkaContainer('confluentinc/cp-kafka:7.6.1').start();

  const broker = \`\${container.getHost()}:\${container.getMappedPort(9093)}\`;
  kafka = new Kafka({
    clientId: 'rebalance-integration-test',
    brokers: [broker],
    logLevel: logLevel.NOTHING,
  });

  admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({
    waitForLeaders: true,
    topics: [{ topic: 'orders.rebalance.test', numPartitions: 4 }],
  });
}, 120_000);

afterAll(async () => {
  await admin?.disconnect();
  await container?.stop();
});
\`\`\`

Pinning an image version makes broker changes intentional. The specific tag is an example, so align it with versions approved by your project. Container startup time varies by machine and fresh image pulls. A focused hook timeout is clearer than raising every test timeout.

Use a unique topic or container per independently running suite. Reusing a fixed topic against a shared broker creates state leakage from offsets and prior group members. Starting one broker for a file and creating unique topics per test often balances speed and isolation.

## Capture assignments from KafkaJS GROUP_JOIN events

KafkaJS exposes instrumentation listeners through \`consumer.on()\`. The \`consumer.events.GROUP_JOIN\` event includes \`memberAssignment\`, an object mapping topic names to partition arrays. Register the listener before connecting and subscribing so the initial join is not missed.

A small probe records every assignment snapshot and allows the test to wait for a matching state:

\`\`\`ts
import type { Consumer } from 'kafkajs';

type Assignment = Record<string, number[]>;

class GroupJoinProbe {
  private snapshots: Assignment[] = [];

  attach(consumer: Consumer) {
    consumer.on(consumer.events.GROUP_JOIN, ({ payload }) => {
      this.snapshots.push(payload.memberAssignment);
    });
  }

  latest(topic: string): number[] {
    return this.snapshots.at(-1)?.[topic] ?? [];
  }

  async waitFor(
    predicate: (assignment: Assignment) => boolean,
    timeoutMs = 15_000,
  ): Promise<Assignment> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const latest = this.snapshots.at(-1);
      if (latest && predicate(latest)) return latest;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    throw new Error(\`No matching assignment, observed \${JSON.stringify(this.snapshots)}\`);
  }
}
\`\`\`

This bounded poll observes in-memory event data. It does not sleep for an assumed rebalance duration. An event-driven promise implementation can be more elegant, but it must handle the event arriving before the waiter is registered. Keeping snapshots also improves the timeout message.

Instrumentation listeners should be lightweight. KafkaJS documents that listeners are asynchronous and the consumer does not block waiting for them, but expensive work still adds noise. Record state and let the test assert outside the listener.

## Add a second consumer and assert partition redistribution

Both consumers must share a \`groupId\` and subscribe to the same topic. Start A first and wait until it owns all partitions. Then start B and wait until both probes show nonempty assignments whose union covers the topic without overlap.

\`\`\`ts
import { expect, it } from 'vitest';

it('reassigns four partitions when a second consumer joins', async () => {
  const topic = 'orders.rebalance.test';
  const groupId = 'orders-workers-rebalance-case';
  const consumerA = kafka.consumer({ groupId });
  const consumerB = kafka.consumer({ groupId });
  const probeA = new GroupJoinProbe();
  const probeB = new GroupJoinProbe();
  probeA.attach(consumerA);
  probeB.attach(consumerB);

  try {
    await consumerA.connect();
    await consumerA.subscribe({ topic, fromBeginning: true });
    await consumerA.run({ eachMessage: async () => {} });

    await probeA.waitFor((assignment) => assignment[topic]?.length === 4);

    await consumerB.connect();
    await consumerB.subscribe({ topic, fromBeginning: true });
    await consumerB.run({ eachMessage: async () => {} });

    const deadline = Date.now() + 20_000;
    let partitionsA: number[] = [];
    let partitionsB: number[] = [];

    while (Date.now() < deadline) {
      partitionsA = probeA.latest(topic);
      partitionsB = probeB.latest(topic);
      const union = new Set([...partitionsA, ...partitionsB]);
      const overlap = partitionsA.filter((partition) => partitionsB.includes(partition));

      if (union.size === 4 && overlap.length === 0 && partitionsB.length > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(partitionsA.length).toBeGreaterThan(0);
    expect(partitionsB.length).toBeGreaterThan(0);
    expect([...new Set([...partitionsA, ...partitionsB])].sort()).toEqual([0, 1, 2, 3]);
    expect(partitionsA.filter((partition) => partitionsB.includes(partition))).toEqual([]);
  } finally {
    await Promise.allSettled([consumerA.disconnect(), consumerB.disconnect()]);
  }
}, 60_000);
\`\`\`

The \`finally\` block matters. A failed assertion must still remove group members and network clients or later tests inherit an active consumer. \`Promise.allSettled()\` attempts both disconnects even if one has already failed.

The empty \`eachMessage\` handler is appropriate only because this test focuses on assignment. A behavior test should record messages and offsets. KafkaJS's \`run()\` starts the consumption loop, which is necessary for normal group operation.

## Prove records remain consumable after the join

Assignment snapshots say the coordinator distributed partitions. They do not prove the application resumes processing correctly. Produce one uniquely keyed record directly to each partition after the two-consumer state stabilizes, then wait until all four records are observed.

Direct partition selection removes ambiguity about key hashing:

\`\`\`ts
const received = new Map<string, { consumer: string; partition: number }>();

async function runRecordingConsumer(consumer, name: string, topic: string) {
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ partition, message }) => {
      const value = message.value?.toString();
      if (value) received.set(value, { consumer: name, partition });
    },
  });
}

const producer = kafka.producer();
await producer.connect();
await producer.send({
  topic: 'orders.rebalance.test',
  messages: [0, 1, 2, 3].map((partition) => ({
    partition,
    key: \`order-\${partition}\`,
    value: \`rebalance-marker-\${partition}\`,
  })),
});
await producer.disconnect();
\`\`\`

Wait on \`received.size === 4\` with a bounded eventually helper, then assert each marker's recorded partition. Do not require equal message counts per consumer from four records unless assignment equality is guaranteed. The stronger invariant is that every partition's new marker is processed by some current group member.

“Exactly once” needs careful language. A Kafka consumer can process a record and fail before committing its offset, leading to redelivery. A \`Map\` hides duplicates by overwriting the same value. If duplicates are part of the risk, store an array of deliveries and assert the application's idempotency behavior. Kafka's delivery and transaction semantics cannot be established by counting four unique map keys.

For a broader Node setup, lifecycle, and networking treatment, see the [Testcontainers Kafka guide](/blog/testcontainers-kafka-node-complete-guide). If message schemas are the primary concern, the [AsyncAPI contract testing guide for Kafka](/blog/asyncapi-contract-testing-kafka-guide) covers a different layer than group coordination.

## Remove a member and observe takeover

Joining is only half the lifecycle. Disconnect consumer B and verify A eventually owns all four partitions again. A graceful \`disconnect()\` differs from a crashed process: the former can leave the group promptly, while failure detection depends on heartbeats and session timeout.

\`\`\`ts
await consumerB.disconnect();

await probeA.waitFor(
  (assignment) => assignment['orders.rebalance.test']?.length === 4,
  20_000,
);

expect(probeA.latest('orders.rebalance.test').sort()).toEqual([0, 1, 2, 3]);
\`\`\`

That is a graceful-leave test. A crash-style test can stop heartbeats by terminating a separate worker process or applying a network disruption, then wait for the broker to evict it. Do not label \`disconnect()\` as a crash simulation. The timing and operational path are different.

Container-level broker restart is another distinct scenario. It exercises client reconnect and coordinator recovery, not merely group membership. Keep it in a separate test with appropriate broker persistence assumptions.

| Membership change | How to induce it | What the test should prove |
|---|---|---|
| Graceful join | Connect and run consumer B | Existing ownership is redistributed across active members |
| Graceful leave | Call \`consumerB.disconnect()\` | Remaining member takes abandoned partitions |
| Consumer crash | Terminate isolated consumer process or cut its network | Session expiry leads to takeover after bounded delay |
| Subscription change | Resubscribe according to supported client flow | Assignments reflect the new topic set |
| Broker interruption | Stop or pause broker infrastructure | Clients recover or fail according to retry policy |

## Avoid assertions during the unstable window

During a rebalance, a snapshot from A can be newer than the snapshot from B. Reading them at one arbitrary instant may show temporary overlap or missing coverage because the local probes have not observed corresponding events yet. The test should wait until a combined stable predicate holds, then assert.

That wait must be bounded and explain observations on failure. Fixed delays are especially harmful here: a short delay flakes on busy CI, while a long delay wastes every successful run. Event snapshots plus a deadline adapt to actual completion.

KafkaJS may emit multiple group-join events as members coordinate. Do not assert an exact event count. What matters is the latest stable assignment and successful processing after it. If the test intends to detect a rebalance storm, define a time window and acceptable count based on a concrete client configuration, then measure it separately.

Test hooks should also separate container readiness from group readiness. A listening broker port does not mean topic leaders are elected, and topic creation does not mean consumers joined. \`waitForLeaders: true\` handles one boundary; the group event handles another.

## Make partition and group state isolated

Kafka retains committed offsets by group ID. Reusing \`orders-workers-rebalance-case\` across tests can affect \`fromBeginning\` behavior and record assertions. Generate a deterministic unique group ID per test case, or recreate the container when isolation requirements justify the startup cost.

Topic deletion and recreation can be asynchronous and broker-configuration dependent. Unique topic names are often simpler. Include a short run identifier, but log it in failure output so broker diagnostics remain traceable.

Do not parallelize several membership tests against the same group ID. They will correctly rebalance with each other and incorrectly fail each other's expected topology. This is not Testcontainers flakiness, it is shared test identity.

Resource cleanup order should stop consumers, disconnect producers and admin clients, then stop the broker. When a test times out, ensure the framework still executes teardown. Open KafkaJS clients can keep the Node process alive and turn a useful assertion failure into a hanging worker.

## Reading failures like a distributed-systems test

When the second consumer never receives a partition, inspect evidence at each boundary:

1. Did B connect and subscribe to the identical topic string?
2. Are A and B configured with the exact same group ID?
3. Did \`run()\` start on both clients?
4. Does the topic actually have more than one partition?
5. What \`GROUP_JOIN\` payloads were recorded for each consumer?
6. Did the broker logs report coordinator, heartbeat, or protocol errors?

Do not immediately increase timeouts. A group with one partition will never give both consumers nonempty assignments, regardless of waiting. An old client left alive will legitimately join the group and take partitions that the test expected A or B to own.

Container logs, client instrumentation, topic metadata, and the probe's snapshots form a compact diagnostic package. Avoid enabling verbose protocol logging for every successful CI run. Capture it on failure or behind an environment switch, because large logs obscure the assignment evidence.

## Assert offset behavior across reassignment

Partition ownership is temporary, but committed group offsets must survive the owner change. Create a focused test where consumer A processes and commits a marker on partition 0, consumer B joins, and whichever member owns partition 0 receives only the next marker. This catches handlers that rely on process-local progress rather than Kafka offsets.

Control commits explicitly for this case. KafkaJS defaults and batch behavior can otherwise make the test's exact commit point unclear. Keep automatic offset settings aligned with production, or use the documented \`resolveOffset\` and \`commitOffsetsIfNecessary\` facilities inside \`eachBatch\` when manual batch control is the behavior under test.

Do not assert that no duplicate can ever occur around a crash. If a handler completes a side effect before its offset commit and loses ownership, the new consumer may receive the record again. The correct integration assertion may be that the downstream idempotency key prevents a duplicate side effect. Rebalance testing and idempotency testing meet at this boundary.

Also test the opposite ordering error: committing before the business operation can lose work if the consumer crashes. A containerized broker does not make the external database atomic. If the architecture uses an outbox, inbox, or Kafka transaction, exercise that mechanism rather than claiming exactly-once behavior from consumer grouping alone.

## Choose broker realism according to the failure

Testcontainers provides a real Kafka broker, but a single container is not a production cluster. It will not reproduce leader movement across brokers, rack awareness, rolling upgrades, or a coordinator moving after node failure. Use this test for client-group semantics and fast integration feedback.

For cluster-level rebalance risks, run a smaller scheduled environment with multiple brokers and controlled node termination. Keep assertions at the same invariant level: eventual complete ownership, bounded processing pause, offset continuity, and no unauthorized duplicate effects. Measure pause duration rather than hard-coding a universal threshold, then set the product's limit from its service objective.

Mocks remain useful below this layer. A unit test can force the application's revoke callback or cancellation path instantly. It cannot prove that the configured KafkaJS client receives the real protocol event. Use both according to the boundary being claimed.

## Frequently Asked Questions

### How many partitions are needed to test two Kafka consumers receiving work?

At least two partitions are needed for both consumers to own something, assuming both subscribe to the topic and share a group. Four partitions make coverage and non-overlap assertions easy while still keeping the test small.

### Why not mock the Kafka group coordinator?

A mock can test application callbacks but not real membership, heartbeats, protocol negotiation, or broker assignment. Testcontainers runs those mechanisms in Kafka, which is the behavior this test is intended to validate.

### Is consumer.disconnect() a valid simulation of a crashed worker?

No. It models a graceful leave. A crash stops without coordinating departure, so reassignment occurs after failure detection. Use a separate process or controlled network failure for that scenario.

### Should the test assert exact partition numbers per consumer?

Usually it should assert coverage, no overlap, and a useful distribution. Exact ownership couples the test to assigner and member details unless the chosen assignment is explicitly part of the system contract.

### What does a GROUP_JOIN event prove?

It proves the KafkaJS consumer joined and received a member assignment at that point. It does not prove messages were processed, offsets were committed, or handlers are idempotent. Produce partition-specific markers to test those behaviors.
`,
};
