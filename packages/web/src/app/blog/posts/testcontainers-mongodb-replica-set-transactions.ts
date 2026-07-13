import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test MongoDB Transactions with a Testcontainers Replica Set',
  description:
    'Test MongoDB transactions with a Testcontainers replica set using Node.js, real commit and rollback assertions, deterministic startup, and clean isolation.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test MongoDB Transactions with a Testcontainers Replica Set

The test reaches \`session.startTransaction()\` and MongoDB replies that transaction numbers are allowed only on a replica set member or mongos. The application code is fine. The disposable \`mongo\` container is running as a standalone server, while multi-document transactions require replica-set or sharded-cluster semantics.

A single-node replica set is enough to exercise transaction behavior in an integration suite. Testcontainers can start the MongoDB process, expose its random host port, initialize the replica set, and tear everything down. The MongoDB Node.js driver then executes the same session and transaction APIs used by the application.

## Why an ordinary MongoDB container rejects the test

MongoDB guarantees atomicity for changes to one document without a multi-document transaction. The transaction API is needed when one business operation must update multiple documents or collections together. MongoDB’s production documentation states that standalone deployments do not support transactions and that multi-document transactions are available on replica sets.

| Deployment used by the test | Multi-document transaction | Change streams | Suitable purpose |
|---|---:|---:|---|
| Standalone \`mongod\` | No | No | Basic CRUD, indexes, aggregation behavior |
| Single-node replica set | Yes | Yes | Transaction and change-stream integration tests |
| Multi-node replica set | Yes | Yes | Elections, failover, read preference, replication lag |
| Sharded cluster | Yes | Yes | Cross-shard routing and distributed transaction behavior |

A single node proves transaction commit, abort, visibility, and driver usage. It does not prove high availability or election recovery. Match the topology to the risk being tested.

## Start and initialize a single-node replica set

The Node Testcontainers MongoDB module starts a useful standalone instance, but a portable explicit approach is to use the core \`GenericContainer\` API, pass \`--replSet\` to \`mongod\`, and call \`rs.initiate()\` inside the container. The connection uses \`directConnection=true\`, which is appropriate for this mapped single-node test topology.

\`\`\`typescript
// test/mongo-replica-set.ts
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import { MongoClient } from 'mongodb';

const MONGO_PORT = 27017;
const REPLICA_SET = 'rs0';

export async function startMongoReplicaSet(): Promise<{
  container: StartedTestContainer;
  uri: string;
}> {
  const container = await new GenericContainer('mongo:8.0')
    .withCommand(['--replSet', REPLICA_SET, '--bind_ip_all'])
    .withExposedPorts(MONGO_PORT)
    .withWaitStrategy(Wait.forLogMessage(/Waiting for connections/))
    .start();

  const initiation = await container.exec([
    'mongosh',
    '--quiet',
    '--eval',
    \`rs.initiate({
      _id: '\${REPLICA_SET}',
      members: [{ _id: 0, host: '127.0.0.1:\${MONGO_PORT}' }]
    })\`,
  ]);

  if (initiation.exitCode !== 0) {
    await container.stop();
    throw new Error(\`Replica-set initiation failed: \${initiation.stderr}\`);
  }

  const uri = [
    \`mongodb://\${container.getHost()}:\${container.getMappedPort(MONGO_PORT)}\`,
    \`/?replicaSet=\${REPLICA_SET}&directConnection=true\`,
  ].join('');

  const deadline = Date.now() + 20_000;
  let lastError: unknown;

  while (Date.now() < deadline) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1_000 });
    try {
      await client.connect();
      const hello = await client.db('admin').command({ hello: 1 });
      if (hello.isWritablePrimary === true) {
        await client.close();
        return { container, uri };
      }
    } catch (error) {
      lastError = error;
    } finally {
      await client.close().catch(() => undefined);
    }
  }

  await container.stop();
  throw new Error(\`Replica set did not elect a primary: \${String(lastError)}\`);
}
\`\`\`

There are two waits for different states. The log wait proves \`mongod\` accepts connections, which must happen before initiation. The \`hello\` polling proves the initiated member became writable primary, which must happen before a transaction. Replacing either with a fixed sleep makes startup slower on fast machines and flaky on slow ones.

The configuration advertises the member internally as \`127.0.0.1:27017\`. The host-side driver connects through Testcontainers’ mapped port and uses direct connection mode, so it does not attempt normal multi-host discovery. This pattern is intentionally for a single-node integration topology, not a production connection-string example.

For ordinary nontransactional coverage, the higher-level module remains simpler. The [Testcontainers MongoDB Node integration guide](/blog/testcontainers-mongodb-node-integration-testing) explains its CRUD-focused setup.

## Write the business operation so the session reaches every write

Starting a transaction does nothing for operations that omit the \`session\` option. Every read and write intended to participate must use the same \`ClientSession\`.

Consider a checkout that reserves inventory and inserts an order. If either operation fails, neither change may remain.

\`\`\`typescript
// src/checkout.ts
import {
  type ClientSession,
  type Collection,
} from 'mongodb';

type Product = { sku: string; available: number };
type Order = { orderId: string; sku: string; quantity: number };

export async function placeOrder(
  products: Collection<Product>,
  orders: Collection<Order>,
  session: ClientSession,
  order: Order,
): Promise<void> {
  await session.withTransaction(async () => {
    const reservation = await products.updateOne(
      { sku: order.sku, available: { $gte: order.quantity } },
      { $inc: { available: -order.quantity } },
      { session },
    );

    if (reservation.modifiedCount !== 1) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    await orders.insertOne(order, { session });
  });
}
\`\`\`

The inventory predicate and decrement occur in one update, avoiding a separate read-then-write race. The order insert uses the same session. Do not parallelize transaction operations with \`Promise.all()\`. MongoDB’s driver documentation does not support parallel operations within a single transaction.

## Prove commit through state, not a mocked method call

An integration test should verify durable state after the transaction completes. It should not merely spy on \`commitTransaction\` or assert that \`withTransaction\` was invoked.

\`\`\`typescript
// test/checkout.integration.test.ts
import { MongoClient, type Db } from 'mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { placeOrder } from '../src/checkout';
import { startMongoReplicaSet } from './mongo-replica-set';

describe('placeOrder transaction', () => {
  let client: MongoClient;
  let db: Db;
  let stopMongo: () => Promise<void>;

  beforeAll(async () => {
    const started = await startMongoReplicaSet();
    client = new MongoClient(started.uri);
    await client.connect();
    db = client.db('checkout_test');
    stopMongo = async () => started.container.stop().then(() => undefined);
  }, 60_000);

  beforeEach(async () => {
    await db.dropDatabase();
    await db.collection('products').insertOne({ sku: 'camera-1', available: 3 });
  });

  afterAll(async () => {
    await client.close();
    await stopMongo();
  });

  it('commits the reservation and order together', async () => {
    const session = client.startSession();
    try {
      await placeOrder(
        db.collection('products'),
        db.collection('orders'),
        session,
        { orderId: 'order-100', sku: 'camera-1', quantity: 2 },
      );
    } finally {
      await session.endSession();
    }

    expect(await db.collection('products').findOne({ sku: 'camera-1' }))
      .toMatchObject({ available: 1 });
    expect(await db.collection('orders').findOne({ orderId: 'order-100' }))
      .toMatchObject({ quantity: 2 });
  });
});
\`\`\`

Reads after \`withTransaction\` returns occur outside the transaction and demonstrate committed visibility. The client closes before the container so connections shut down cleanly.

## Force a second-write failure and verify rollback

The most valuable transaction test places the failure after the first mutation. Create a unique index on \`orderId\`, seed a conflicting order, then attempt a checkout. The inventory update succeeds inside the transaction, the insert fails with a duplicate key, and MongoDB aborts the transaction.

\`\`\`typescript
it('rolls back inventory when the order insert fails', async () => {
  const products = db.collection('products');
  const orders = db.collection('orders');
  await orders.createIndex({ orderId: 1 }, { unique: true });
  await orders.insertOne({ orderId: 'duplicate', sku: 'old-sku', quantity: 1 });

  const session = client.startSession();
  try {
    await expect(
      placeOrder(products, orders, session, {
        orderId: 'duplicate',
        sku: 'camera-1',
        quantity: 2,
      }),
    ).rejects.toMatchObject({ code: 11000 });
  } finally {
    await session.endSession();
  }

  expect(await products.findOne({ sku: 'camera-1' }))
    .toMatchObject({ available: 3 });
  expect(await orders.countDocuments({ orderId: 'duplicate' })).toBe(1);
});
\`\`\`

This failure comes from MongoDB itself, not a test-only throw inserted between operations. It proves the transaction handles a real database constraint failure and that the first collection mutation does not leak.

Also test the business rejection path where stock is insufficient. It should insert no order and preserve inventory. That path throws before the second write, so it complements rather than replaces the duplicate-key rollback test.

## Observe uncommitted data from the right viewpoint

Changes inside a transaction are not visible outside it until commit. A useful isolation test can pause the transaction after a write, query through a second session or client, and confirm the old state remains visible. Keep such coordination deterministic with promises or barriers, not sleeps.

Inside the transaction, reads using the same session should see its own writes. Outside, ordinary reads should not. After commit, the outside reader should see both changes. This distinguishes true transaction behavior from sequential writes that merely happen quickly.

Do not over-specify MongoDB’s internal lock timing. Assert the visibility guarantee your application depends on. Tests for a particular read concern or write concern should set those options explicitly and document why.

## Transaction options are production decisions

\`withTransaction()\` implements the driver’s convenient transaction API and may retry certain transient transaction errors. The callback can therefore run more than once. It must not perform non-idempotent external side effects such as sending an email, charging a card, or publishing an uncoordinated message.

| Concern | Sensible test question | Common mistake |
|---|---|---|
| Callback retry | Is database work safe if callback reruns? | External API call inside transaction callback |
| Read preference | Are transaction reads routed to primary? | Testing secondary reads inside transaction |
| Write concern | Does commit durability match policy? | Assuming test default proves production setting |
| Transaction lifetime | Does work remain short and bounded? | Waiting on user or remote service inside transaction |
| Error labels | Does application handle transient errors? | Matching only error text |

The single-node test verifies correctness of your unit of work, but it is poor at producing realistic failover errors. If transient retry behavior is critical, add targeted driver-level tests or a multi-node environment capable of stepping down a primary.

## Isolation and suite performance

Starting MongoDB per test gives maximum isolation and terrible throughput for most suites. Starting one container per test file or worker is a more practical balance. Drop a dedicated database before each test or generate a database name per test.

Be careful with parallel workers. If one shared database is dropped while another test is using it, failures will look like transaction bugs. Generate names from the worker ID and test identity, or allocate a container per worker. Keep collection indexes in setup so every isolated database has the same constraints.

Container reuse can speed local development, but automatic cleanup and known state are more valuable in CI. Follow the lifecycle and image-pinning guidance in the [Testcontainers best practices guide](/blog/testcontainers-best-practices-2026).

## Do not confuse transactional rollback with test cleanup

Wrapping each test’s setup in a MongoDB transaction and aborting it afterward sounds attractive, but application transactions cannot nest freely and application code may use its own sessions. Cleanup through a surrounding transaction can change the behavior under test.

Use database deletion, collection cleanup, or unique databases for isolation. Reserve transactions for the application behavior being verified. After a rollback test, query outside the session to demonstrate state, then clean normally before the next case.

## Troubleshoot replica-set startup precisely

If the driver still reports a standalone topology, inspect the URI for \`replicaSet=rs0\`, run the \`hello\` command, and confirm \`setName\` is \`rs0\` and \`isWritablePrimary\` is true. If initiation fails, print \`container.exec()\` stdout and stderr plus container logs.

A timeout before initiation often means the process is not accepting connections. A timeout afterward can mean primary election is not complete. A host discovery error usually indicates the replica-set member advertises an address the host-side driver cannot resolve. Direct connection mode avoids discovery for this single-node mapped topology but must not be copied blindly to multi-node testing.

Pin the MongoDB image major version used in production, or test an intentional upgrade matrix. Using \`latest\` makes a CI run consume a new database version without a code change, which undermines reproducibility.

## Test an explicit abort chosen by application logic

Database errors are not the only reason to abort. A workflow may inspect several documents and decide that a business invariant no longer holds. Test that branch through the public service function and verify the session ends without durable mutations.

Avoid returning a success-shaped value from inside \`withTransaction()\` when the business operation actually failed. Throw a typed application error so the convenient transaction API aborts and the caller receives an unambiguous result. If the contract uses a result object instead, the callback must explicitly abort and the service must prevent subsequent writes.

An explicit-abort test should assert both collections plus any counters or audit records involved. It should also prove the session remains usable only according to driver expectations. Usually the application ends the session after one unit of work rather than trying to reuse a complicated transaction state.

## Verify unique constraints exist before relying on the rollback case

The duplicate-order example depends on a unique index. \`insertOne\` will happily accept duplicate values when setup forgot the index, causing the test to commit and fail for the wrong reason. Assert index creation as part of database migration coverage, and keep integration setup consistent with production schema.

For tests that create indexes in \`beforeEach\`, remember that \`dropDatabase()\` removes them. Recreate indexes after the drop, not once before the suite. A shared schema bootstrap function reduces drift between application startup and tests.

Constraint choice also matters. An application-level “find then insert” duplicate check is vulnerable to concurrent requests. The unique index supplies the atomic guarantee, while the transaction determines whether related writes roll back when that guarantee rejects the insert.

## Exercise concurrent reservations separately

The sequential commit and rollback cases do not prove behavior when two buyers compete for the last item. Start two sessions, run \`placeOrder\` concurrently against availability one, and expect exactly one order plus inventory zero. The other call should fail through the stock predicate or a transient transaction conflict handled by policy.

Do not assert which order wins unless the product guarantees priority. Assert the invariant: inventory never becomes negative, one durable order exists, and both sessions close. Run the scenario repeatedly because concurrency tests can pass accidentally under one schedule.

Keep this test distinct from driver retry testing. \`withTransaction()\` may retry a callback after a transient conflict, so capture final outcomes rather than callback invocation counts. If a callback increments an in-memory counter, that counter can exceed the number of committed transactions and is not a valid business assertion.

## Know what the single node cannot simulate

A one-member replica set cannot elect a replacement when its primary stops. It also has no secondary from which to test read preference, replication delay, or majority acknowledgment under member loss. Do not describe the suite as failover coverage.

For high-availability behavior, build a multi-member fixture with addresses reachable by both containers and the test process, then exercise primary stepdown under controlled conditions. That topology is slower and operationally harder, so reserve it for code that owns retry, resume, or read-routing behavior.

The fast single-node suite should remain the default transaction gate. A smaller multi-node suite can run on a schedule or before releases. Separating them preserves quick feedback without pretending topology risk is covered.

## Capture logs before automatic teardown

When a transaction test times out, collect \`mongod\` logs before stopping the container. The logs may show primary transitions, aborted transactions, connection closure, or command errors that the driver wraps. Testcontainers can read container logs while it is running; make that collection conditional on failure to keep normal output concise.

Redact application payloads if test documents contain sensitive fixtures. Database command monitoring can be powerful, but enabling full command bodies indiscriminately may expose credentials or personal data in CI artifacts.

## Frequently Asked Questions

### Why does MongoDB require a replica set for a two-collection transaction?

MongoDB exposes multi-document transactions on replica sets and sharded clusters, not standalone deployments. A normal single \`mongod\` container is standalone unless started and initialized with replica-set configuration.

### Is one replica-set member sufficient for transaction tests?

Yes for commit, abort, session use, and transactional visibility. It does not test elections, redundancy, replication lag, or recovery after primary loss. Those risks require multiple members.

### Must every MongoDB operation receive the session option?

Every operation intended to participate in the transaction must use the same session. An insert without \`{ session }\` executes outside the transaction and will not roll back with it.

### Why use directConnection in this Testcontainers URI?

The member advertises its container-local address while the test connects through a randomly mapped host port. Direct connection mode lets the driver target that exposed single node. It is a test-topology choice, not general production guidance.

### Can withTransaction call its callback more than once?

Yes, the convenient transaction API can retry on certain transient errors. Keep the callback’s work safe to rerun and move irreversible external side effects outside it, commonly through an outbox pattern.
`,
};
