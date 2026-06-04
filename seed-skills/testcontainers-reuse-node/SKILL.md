---
name: Testcontainers Reuse (Node)
description: Teaches the agent to speed up Node integration tests with Testcontainers reuse — withReuse(true), TESTCONTAINERS_REUSE_ENABLE, the .testcontainers.properties opt-in, stable hashing for Postgres/MySQL/Kafka, and Ryuk/CI caveats.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [testcontainers, reuse, docker, integration-testing, postgres, kafka, ryuk, node]
testingTypes: [integration, e2e]
frameworks: [testcontainers, vitest, jest]
languages: [typescript]
domains: [api, web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Testcontainers Reuse (Node)

This skill makes the agent use Testcontainers' **reuse** feature to cut local integration-test startup from seconds to milliseconds, while avoiding the footguns: reuse is an explicit developer opt-in (it is *off* in CI by design), it requires a stable container configuration to hash, and a reused container is **not cleaned up by Ryuk**, so test data must be reset by the test, not the container lifecycle.

Use this skill when local integration tests are slow because every run boots a fresh Postgres/MySQL/Kafka, or when the user asks about `withReuse`, `TESTCONTAINERS_REUSE_ENABLE`, or "keep the container alive between runs."

## Core Principles

1. **Reuse is opt-in and local-only.** It activates only when `withReuse(true)` is set AND `testcontainers.reuse.enable=true` is in the user's `~/.testcontainers.properties` (or `TESTCONTAINERS_REUSE_ENABLE=true`). It should stay **off** in CI, where clean state matters more than speed.
2. **Reuse keys on a config hash.** Testcontainers hashes the container's configuration (image, ports, env, command, labels). Any change to that config produces a new container. Keep config stable to actually reuse.
3. **A reused container survives the test run.** Ryuk (the resource-reaper) does *not* kill containers marked for reuse, so they linger for the next run. That is the point — but it means **you** must reset state between runs.
4. **Reset data, not the container.** Truncate tables, delete topics' messages, or use transactions/savepoints — do not rely on a fresh container per test.
5. **Reuse and `.stop()` are mutually exclusive in intent.** Do not call `.stop()` in teardown for a reused container, or you defeat reuse on the next run.
6. **Pin images by digest/tag** so the hash is deterministic across machines and runs.

## Workflow / Patterns

### Pattern 1 — Enable reuse globally (one-time developer setup)

Reuse needs a machine-level opt-in. The agent should instruct the user to create this file (it is intentionally not committed):

```properties
# ~/.testcontainers.properties
testcontainers.reuse.enable=true
```

Equivalent for the current shell (useful in scripts, NOT in CI):

```bash
export TESTCONTAINERS_REUSE_ENABLE=true
```

Without this, `withReuse(true)` is silently ignored and a fresh container starts every time.

### Pattern 2 — A reusable Postgres container with stable hashing

`withReuse(true)` plus a fixed name/labels. The data reset (TRUNCATE) is what makes reuse safe across runs.

```typescript
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

let container: StartedPostgreSqlContainer;
let client: Client;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('appdb')
    .withUsername('test')
    .withPassword('test')
    // A stable label set keeps the config hash constant -> the same
    // container is reused on the next run.
    .withLabels({ project: 'my-app', purpose: 'integration' })
    .withReuse() // <-- opt into reuse
    .start();

  client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();

  // Schema is created idempotently because the container may already exist.
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL
    );
  `);
});

beforeEach(async () => {
  // Reset DATA, not the container. This is the key to safe reuse.
  await client.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await client.end();
  // IMPORTANT: do NOT call container.stop() — that kills the reusable container.
});

test('inserts and reads a user', async () => {
  await client.query(`INSERT INTO users (email) VALUES ('ada@example.com')`);
  const { rows } = await client.query('SELECT email FROM users');
  expect(rows).toEqual([{ email: 'ada@example.com' }]);
});
```

### Pattern 3 — Share one reused container across many test files

Reuse shines when several test files would each spin up their own DB. A small singleton returns the same started container; the hash makes them converge on one Docker container.

```typescript
// test/support/postgres.ts
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let started: Promise<StartedPostgreSqlContainer> | undefined;

export function getPostgres(): Promise<StartedPostgreSqlContainer> {
  if (!started) {
    started = new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('appdb')
      .withUsername('test')
      .withPassword('test')
      .withReuse()
      .start();
  }
  return started;
}
```

```typescript
// any.integration.test.ts
import { getPostgres } from './support/postgres';

test('uses the shared reusable container', async () => {
  const pg = await getPostgres();
  expect(pg.getConnectionUri()).toContain('appdb');
});
```

### Pattern 4 — Reusable MySQL

Same shape, different module. Idempotent schema + per-test reset.

```typescript
import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import mysql from 'mysql2/promise';

let container: StartedMySqlContainer;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.4')
    .withDatabase('appdb')
    .withUsername('test')
    .withUserPassword('test')
    .withReuse()
    .start();

  const conn = await mysql.createConnection(container.getConnectionUri());
  await conn.query(`CREATE TABLE IF NOT EXISTS orders (id INT PRIMARY KEY AUTO_INCREMENT, sku VARCHAR(64))`);
  await conn.end();
});

beforeEach(async () => {
  const conn = await mysql.createConnection(container.getConnectionUri());
  await conn.query('TRUNCATE TABLE orders');
  await conn.end();
});
```

### Pattern 5 — Reusable Kafka (clean up topics, not the broker)

Kafka boot is expensive, so reuse pays off most here. Reset by deleting topics rather than restarting the broker.

```typescript
import { KafkaContainer, type StartedKafkaContainer } from '@testcontainers/kafka';
import { Kafka } from 'kafkajs';

let container: StartedKafkaContainer;
let kafka: Kafka;

beforeAll(async () => {
  container = await new KafkaContainer('confluentinc/cp-kafka:7.6.1')
    .withReuse()
    .start();

  kafka = new Kafka({ brokers: [`${container.getHost()}:${container.getMappedPort(9093)}`] });
});

beforeEach(async () => {
  // Reset state by recreating the topic, not the broker.
  const admin = kafka.admin();
  await admin.connect();
  const topics = await admin.listTopics();
  if (topics.includes('events')) {
    await admin.deleteTopics({ topics: ['events'] });
  }
  await admin.createTopics({ topics: [{ topic: 'events', numPartitions: 1 }] });
  await admin.disconnect();
});

test('produces and consumes an event', async () => {
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({ topic: 'events', messages: [{ value: 'hello' }] });
  await producer.disconnect();
  // ...consume and assert...
});
```

### Pattern 6 — Keep reuse OFF in CI

In CI, isolation beats speed and reused containers can poison subsequent jobs. Gate the behavior on environment.

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const isCI = process.env.CI === 'true';

const builder = new PostgreSqlContainer('postgres:16-alpine')
  .withDatabase('appdb')
  .withUsername('test')
  .withPassword('test');

// Only reuse locally. In CI, start fresh and let Ryuk reap it.
const container = await (isCI ? builder : builder.withReuse()).start();
```

## Best Practices

1. **Document the one-time opt-in** (`~/.testcontainers.properties` with `testcontainers.reuse.enable=true`) in the project README — without it, `withReuse()` is a no-op.
2. **Reset state in `beforeEach`** (TRUNCATE / recreate topics), never by stopping the container. A reused container persists data by design.
3. **Do not call `.stop()`** in `afterAll` for reusable containers; closing only the client connection is enough.
4. **Pin images to a specific tag or digest** so the reuse hash is deterministic across developers' machines.
5. **Keep the container config stable** (fixed env, ports, labels). Adding a dynamic value to the config changes the hash and spawns a new container every run.
6. **Disable reuse in CI** (`CI` env gate) so jobs get clean, Ryuk-reaped containers and never inherit stale state.
7. **Create schema idempotently** (`CREATE TABLE IF NOT EXISTS`) because the container may already exist from a previous run.

## Anti-Patterns

1. **Calling `withReuse()` but expecting CI to reuse.** CI usually lacks the opt-in (and should) — reuse silently disables, masking the intent. Gate it on environment instead.
2. **Calling `container.stop()` in teardown** for a reusable container — it kills the very container the next run wanted to reuse.
3. **Relying on a fresh container per test for isolation.** A reused container keeps old rows/topics. Reset data explicitly.
4. **Putting a timestamp/UUID into the container config** (label, env, name) — it changes the hash each run, so nothing is ever reused.
5. **Leaving reuse on in CI**, letting a stale container leak data into a later job and produce false passes/failures.
6. **Floating image tags (`postgres:latest`)** — the hash and the pulled image drift, breaking reproducible reuse.
7. **Assuming Ryuk will clean up the reused container.** It will not; that container is intentionally exempt and lingers until manually pruned (`docker rm`).

## When to Trigger This Skill

- "My Testcontainers integration tests are slow on every run"
- "How do I use `withReuse(true)` / `TESTCONTAINERS_REUSE_ENABLE`?"
- "Keep the Postgres / MySQL / Kafka container alive between test runs"
- "Reuse isn't working — it starts a new container every time"
- "Should I enable Testcontainers reuse in CI?"
- "Container data leaks between test runs"
- "Where does `.testcontainers.properties` go?"
- "Why doesn't Ryuk clean up my reused container?"
