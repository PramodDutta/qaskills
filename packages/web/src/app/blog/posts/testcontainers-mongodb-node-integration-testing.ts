import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers MongoDB Node.js — Integration Testing Guide 2026',
  description:
    'Complete guide to Testcontainers for MongoDB in Node.js. Real integration tests with Docker, Mongoose, replica sets, aggregation, and CI/CD patterns.',
  date: '2026-05-02',
  category: 'Guide',
  content: `
# Testcontainers MongoDB Node.js Integration Testing Guide

MongoDB is the most-deployed document database in the world, and Node.js is the most popular runtime that connects to it. Yet testing MongoDB-dependent code well has historically been a struggle. The mongodb-memory-server package was good enough for years, but it does not support change streams, transactions require replica sets that mongodb-memory-server only emulates partially, and aggregation pipeline behavior occasionally diverges from real MongoDB. Testcontainers fixes all of this by running a real MongoDB instance in a Docker container, programmatically managed by your test runner, with one-line setup.

This guide is a deep walkthrough of using Testcontainers with MongoDB in Node.js for 2026. We cover installation, container lifecycle, replica set configuration for transaction testing, schema migration patterns, fixture seeding, change streams, aggregation pipelines, container reuse for fast local dev, and CI/CD setup. Every example is working TypeScript with Vitest and either the official mongodb driver or Mongoose.

---

## Key Takeaways

- **MongoDbContainer** is the official module for one-line MongoDB setup
- **Transactions require a replica set** — MongoDbContainer can configure this for you
- **Change streams** require a replica set and only work against real MongoDB, not in-memory mocks
- **Container reuse** brings local startup from 5 seconds to under 1 second
- **CI/CD setup is trivial** because Docker is available on GitHub Actions ubuntu runners

---

## Why Use Testcontainers for MongoDB

mongodb-memory-server has been the de facto standard for years, and it works well for basic CRUD testing. But it has limitations. Change streams do not work because they require oplog tailing on a replica set; mongodb-memory-server only emulates a replica set superficially. Transactions work but with subtle differences in error behavior. Some aggregation operators behave inconsistently. The version of MongoDB bundled with mongodb-memory-server lags behind the latest releases.

Testcontainers solves all of these by running real MongoDB. Your tests see exactly the same behavior they will see in production, including change streams, transactions, and the latest aggregation operators.

---

## Installation

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/mongodb
npm install --save-dev vitest mongodb
# or
npm install --save-dev vitest mongoose
\`\`\`

Verify Docker is running with \`docker info\`.

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

## Your First Test (mongodb driver)

\`\`\`typescript
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import { MongoClient, Db } from 'mongodb';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

describe('MongoDB integration', () => {
  let container: StartedMongoDBContainer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    container = await new MongoDBContainer('mongo:7.0').start();
    client = new MongoClient(container.getConnectionString(), {
      directConnection: true,
    });
    await client.connect();
    db = client.db('test');
  });

  afterAll(async () => {
    await client.close();
    await container.stop();
  });

  it('inserts and finds a document', async () => {
    const users = db.collection('users');
    await users.insertOne({ name: 'Alice', age: 30 });
    const result = await users.findOne({ name: 'Alice' });
    expect(result?.age).toBe(30);
  });
});
\`\`\`

Note the \`directConnection: true\` option. MongoDbContainer starts MongoDB as a single-node replica set so transactions work, and the driver needs directConnection to skip SRV lookup.

---

## With Mongoose

\`\`\`typescript
import mongoose from 'mongoose';

let connection: typeof mongoose;

beforeAll(async () => {
  container = await new MongoDBContainer('mongo:7.0').start();
  connection = await mongoose.connect(container.getConnectionString(), {
    directConnection: true,
    dbName: 'test',
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await container.stop();
});

it('saves a Mongoose document', async () => {
  const User = mongoose.model('User', new mongoose.Schema({ name: String, age: Number }));
  await User.create({ name: 'Bob', age: 25 });
  const found = await User.findOne({ name: 'Bob' });
  expect(found?.age).toBe(25);
});
\`\`\`

---

## MongoDbContainer API Reference

| Method | Purpose |
|---|---|
| \`new MongoDBContainer(image)\` | Constructor; image like \`mongo:7.0\` |
| \`.withReuse()\` | Reuse container across runs |
| \`.withExposedPorts(port)\` | Override exposed port |
| \`.withCommand(cmd)\` | Override Docker CMD |
| \`.withEnvironment(env)\` | Set env vars |
| \`.start()\` | Boot container |

After start:

| Method | Returns |
|---|---|
| \`getHost()\` | Hostname |
| \`getMappedPort(27017)\` | Mapped port |
| \`getConnectionString()\` | mongodb:// URI |
| \`getName()\` | Container name |

---

## Per-Test Isolation

Two patterns work well.

**Pattern 1: Drop collections between tests.** Simple, works for most cases:

\`\`\`typescript
afterEach(async () => {
  const collections = await db.collections();
  await Promise.all(collections.map(c => c.deleteMany({})));
});
\`\`\`

**Pattern 2: Use a unique database per test.** Clean isolation but slightly slower:

\`\`\`typescript
let testDb: Db;
beforeEach(async () => {
  const dbName = \`test_\${Date.now()}_\${Math.random().toString(36).slice(2)}\`;
  testDb = client.db(dbName);
});
afterEach(async () => {
  await testDb.dropDatabase();
});
\`\`\`

---

## Testing Transactions

Transactions require a replica set, which MongoDbContainer provides automatically:

\`\`\`typescript
it('rolls back on error', async () => {
  const accounts = db.collection('accounts');
  await accounts.insertMany([
    { _id: 'a', balance: 100 },
    { _id: 'b', balance: 0 },
  ]);

  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      await accounts.updateOne({ _id: 'a' }, { $inc: { balance: -50 } }, { session });
      await accounts.updateOne({ _id: 'b' }, { $inc: { balance: 50 } }, { session });
      throw new Error('simulated failure');
    });
  } catch (e) {
    // expected
  } finally {
    await session.endSession();
  }

  const a = await accounts.findOne({ _id: 'a' });
  expect(a?.balance).toBe(100); // unchanged because txn rolled back
});
\`\`\`

This test would not work reliably against mongodb-memory-server because of transaction emulation gaps.

---

## Testing Change Streams

Change streams stream document changes in real time. They require a replica set:

\`\`\`typescript
it('emits change events', async () => {
  const events: any[] = [];
  const users = db.collection('users');
  const stream = users.watch();
  stream.on('change', (change) => events.push(change));

  await new Promise(r => setTimeout(r, 100)); // let stream initialize

  await users.insertOne({ name: 'Carol' });
  await users.updateOne({ name: 'Carol' }, { $set: { age: 28 } });

  await new Promise(r => setTimeout(r, 500));
  await stream.close();

  expect(events.length).toBe(2);
  expect(events[0].operationType).toBe('insert');
  expect(events[1].operationType).toBe('update');
});
\`\`\`

This was effectively impossible to test with mongodb-memory-server.

---

## Testing Aggregation Pipelines

Aggregation pipelines are where production behavior matters most:

\`\`\`typescript
it('aggregates correctly', async () => {
  const orders = db.collection('orders');
  await orders.insertMany([
    { customer: 'alice', total: 100 },
    { customer: 'alice', total: 50 },
    { customer: 'bob', total: 200 },
  ]);

  const result = await orders.aggregate([
    { $group: { _id: '$customer', total: { $sum: '$total' } } },
    { $sort: { total: -1 } },
  ]).toArray();

  expect(result).toEqual([
    { _id: 'bob', total: 200 },
    { _id: 'alice', total: 150 },
  ]);
});
\`\`\`

---

## Indexing in Tests

Always create the same indexes in tests as in production:

\`\`\`typescript
beforeAll(async () => {
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
});

it('enforces unique index', async () => {
  await db.collection('users').insertOne({ email: 'a@b.com' });
  await expect(
    db.collection('users').insertOne({ email: 'a@b.com' })
  ).rejects.toThrow(/duplicate key/);
});
\`\`\`

Without the index, the duplicate would succeed and your test would falsely pass.

---

## Container Reuse

\`\`\`typescript
container = await new MongoDBContainer('mongo:7.0')
  .withReuse()
  .start();
\`\`\`

Enable in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

Local test startup drops from 5 seconds to under 1 second.

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

## Comparison: Testcontainers vs mongodb-memory-server

| Feature | Testcontainers | mongodb-memory-server |
|---|---|---|
| Real MongoDB | Yes | Embedded |
| Latest MongoDB version | Any tagged image | Lags behind |
| Change streams | Full support | Limited |
| Transactions | Full | Mostly works |
| Startup time (cold) | 5-8s | 3-5s |
| Startup time (warm) | < 1s with reuse | 2-3s |
| CI complexity | Zero | Zero |
| Resource usage | Container overhead | In-process |
| Multi-engine consistency | Yes | No |

For new projects in 2026, Testcontainers is the better default. mongodb-memory-server still has its place for ultra-fast unit tests, but anything touching transactions, change streams, or recent aggregation features should use Testcontainers.

---

## Common Pitfalls

**Missing directConnection.** Without \`directConnection: true\`, the driver attempts SRV lookup and fails. Always include it.

**Replica set not ready.** MongoDbContainer waits for the replica set to be ready before returning from start(), but if you switch to GenericContainer manually, you need to wait yourself.

**Resource limits.** MongoDB containers use 1-2 GB RAM by default. If you spin up many in parallel, your machine will swap.

**Forgetting to close.** Always close the client in afterAll, or your test process will hang.

---

## Conclusion

Testcontainers with MongoDB gives Node.js teams real, isolated MongoDB instances per test suite, with full support for transactions, change streams, and the latest aggregation operators. The setup is one line, CI requires no configuration, and container reuse keeps local iteration fast. For new projects, this is the right default for any test that touches MongoDB.

Explore the [QA skills directory](/skills) for more integration testing patterns, or compare with our [PostgreSQL guide](/blog/testcontainers-postgresql-node-complete-guide) for multi-engine architectures.
`,
};
