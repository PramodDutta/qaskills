---
name: Docker Testcontainers
description: Integration testing with real dependencies in throwaway Docker containers using the Testcontainers Node.js API - GenericContainer, exposed ports, wait strategies, module containers, Docker Compose environments, and reliable cleanup.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [testcontainers, docker, integration-testing, postgres, redis, containers, ci, node]
testingTypes: [integration, database]
frameworks: [jest, vitest]
languages: [typescript]
domains: [api, devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Docker Testcontainers

This skill makes an AI agent write integration tests that spin up real databases, caches, and message brokers in disposable Docker containers via the `testcontainers` Node.js library - instead of mocking them or depending on a shared dev server. Trigger it when tests need a real Postgres, Redis, Kafka, or any service with Docker image, when a repo already imports `testcontainers`, or when the user complains that mocked repositories keep hiding SQL and serialization bugs.

## Core Principles

1. **Test against the real engine, not a lookalike.** SQLite in place of Postgres misses JSONB operators, transaction isolation behavior, and case-sensitivity rules. Run the exact image and major version production uses (`postgres:16-alpine`, not `latest`).
2. **Always use mapped ports.** Containers bind to random free host ports. Read them with `container.getMappedPort(5432)` and `container.getHost()`; hardcoding `localhost:5432` collides with local services and parallel CI jobs.
3. **Wait strategies, not sleeps.** A started container is not a ready service. Use `Wait.forLogMessage`, `Wait.forListeningPorts`, `Wait.forHttp`, or `Wait.forHealthCheck` so tests begin exactly when the dependency is usable.
4. **One container per suite, clean state per test.** Container startup costs seconds; start in `beforeAll`, then reset state between tests with `TRUNCATE`, `FLUSHALL`, or transaction rollbacks - not by restarting the container.
5. **Cleanup must survive failures.** Stop containers in `afterAll`; Testcontainers' Ryuk sidecar reaps anything left behind if the process dies, so never disable it in CI.
6. **Pin image tags.** `redis:latest` changing under you turns a green suite red with zero code changes. Pin to a major-minor tag and upgrade deliberately.

## Setup

```bash
npm install --save-dev testcontainers @testcontainers/postgresql
# Requires a running Docker daemon (Docker Desktop, Colima, or CI's dockerd)
docker info
```

## Patterns

### 1. GenericContainer: Redis with a wait strategy

```ts
// tests/cache.integration.test.ts
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { createClient, RedisClientType } from 'redis';

describe('rate limiter backed by Redis', () => {
  let container: StartedTestContainer;
  let client: RedisClientType;

  beforeAll(async () => {
    container = await new GenericContainer('redis:7.4-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .withStartupTimeout(30_000)
      .start();

    client = createClient({
      url: `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
    });
    await client.connect();
  }, 60_000);

  afterEach(async () => {
    await client.flushAll();
  });

  afterAll(async () => {
    await client.quit();
    await container.stop();
  });

  it('blocks the 6th request within a window', async () => {
    for (let i = 0; i < 5; i++) {
      expect(await isAllowed(client, 'user-1')).toBe(true);
    }
    expect(await isAllowed(client, 'user-1')).toBe(false);
  });
});

async function isAllowed(client: RedisClientType, key: string): Promise<boolean> {
  const count = await client.incr(`rl:${key}`);
  if (count === 1) await client.expire(`rl:${key}`, 60);
  return count <= 5;
}
```

### 2. Module container: Postgres with real migrations

```ts
// tests/orders.repository.integration.test.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { runMigrations } from '../src/db/migrate';
import { OrdersRepository } from '../src/db/orders-repository';

let pg: StartedPostgreSqlContainer;
let pool: Pool;
let repo: OrdersRepository;

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('shop_test')
    .withUsername('shop')
    .withPassword('shop')
    .start();

  pool = new Pool({ connectionString: pg.getConnectionUri() });
  await runMigrations(pool); // the SAME migrations production runs
  repo = new OrdersRepository(pool);
}, 90_000);

beforeEach(async () => {
  await pool.query('TRUNCATE orders RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
  await pg.stop();
});

it('persists JSONB line items and filters with the @> operator', async () => {
  await repo.create({ customerId: 'c1', items: [{ sku: 'SKU-1', qty: 2 }] });
  await repo.create({ customerId: 'c2', items: [{ sku: 'SKU-9', qty: 1 }] });

  const matches = await repo.findByItemSku('SKU-1'); // uses items @> '[{"sku":"SKU-1"}]'
  expect(matches).toHaveLength(1);
  expect(matches[0].customerId).toBe('c1');
});
```

### 3. Docker Compose environment for multi-service tests

```ts
// tests/api.e2e.integration.test.ts
import { DockerComposeEnvironment, StartedDockerComposeEnvironment, Wait } from 'testcontainers';

let environment: StartedDockerComposeEnvironment;
let apiBaseUrl: string;

beforeAll(async () => {
  environment = await new DockerComposeEnvironment('.', 'docker-compose.test.yml')
    .withWaitStrategy('api-1', Wait.forHttp('/health', 3000).forStatusCode(200))
    .withWaitStrategy('postgres-1', Wait.forListeningPorts())
    .up(['api', 'postgres']);

  const api = environment.getContainer('api-1');
  apiBaseUrl = `http://${api.getHost()}:${api.getMappedPort(3000)}`;
}, 120_000);

afterAll(async () => {
  await environment.down({ timeout: 10_000 });
});

it('serves orders through the full stack', async () => {
  const created = await fetch(`${apiBaseUrl}/orders`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sku: 'SKU-1', qty: 1 }),
  });
  expect(created.status).toBe(201);

  const list = await fetch(`${apiBaseUrl}/orders`);
  const orders = (await list.json()) as Array<{ sku: string }>;
  expect(orders.map((o) => o.sku)).toContain('SKU-1');
});
```

### 4. Faster local loops: container reuse and env wiring

```ts
// Opt-in reuse keeps the container alive between test runs locally.
// Requires testcontainers.reuse.enable=true in ~/.testcontainers.properties
const pg = await new PostgreSqlContainer('postgres:16-alpine')
  .withDatabase('shop_test')
  .withReuse()
  .start();

// Hand the dynamic URL to the code under test the same way prod config does
process.env.DATABASE_URL = pg.getConnectionUri();
```

```ts
// Copying fixtures and running one-off commands inside a container
const container = await new GenericContainer('postgres:16-alpine')
  .withEnvironment({ POSTGRES_PASSWORD: 'shop' })
  .withCopyFilesToContainer([
    { source: './tests/fixtures/seed.sql', target: '/docker-entrypoint-initdb.d/seed.sql' },
  ])
  .withExposedPorts(5432)
  .start();

const { exitCode, output } = await container.exec(['psql', '-U', 'postgres', '-c', 'SELECT 1']);
expect(exitCode).toBe(0);
expect(output).toContain('1 row');
```

## Best Practices

- Raise the test framework timeout for `beforeAll` hooks that pull images (60-120 seconds); the first CI run downloads layers.
- Use module packages (`@testcontainers/postgresql`, `@testcontainers/kafka`, `@testcontainers/elasticsearch`) before reaching for `GenericContainer`; they encode correct wait strategies and credentials.
- In CI, pre-pull hot images (`docker pull postgres:16-alpine`) in a cached step to cut suite time.
- Keep integration tests in a separate script (`"test:integration": "vitest run --config vitest.integration.config.ts"`) so unit tests stay Docker-free and fast.
- Pass connection details via the same env vars production reads (`DATABASE_URL`, `REDIS_URL`); never add test-only config paths to the app.
- Log container output on failure with `container.logs()` streamed to the test reporter when diagnosing startup issues.

## Anti-Patterns

- `await sleep(3000)` after `start()` instead of a wait strategy - slow on good days, flaky on loaded CI runners.
- One shared, long-lived "test database" server that every developer and CI job mutates; state leaks make failures non-reproducible.
- Restarting the container between tests for isolation; truncate tables or roll back transactions instead and save minutes per suite.
- Mocking the repository layer in "integration" tests - the SQL is exactly the thing that needs testing.
- Using `:latest` tags or a different database engine than production.
- Disabling Ryuk (`TESTCONTAINERS_RYUK_DISABLED=true`) in CI to "fix" a permissions issue, then leaking containers until the runner dies; fix the Docker socket permissions instead.

## When to Trigger This Skill

- The user asks for integration tests against a real Postgres, MySQL, MongoDB, Redis, Kafka, RabbitMQ, Elasticsearch, or LocalStack instance.
- A repository imports `testcontainers` or `@testcontainers/*`, or contains a `docker-compose.test.yml`.
- Mock-heavy tests keep missing SQL syntax errors, migration drift, or serialization bugs that only a real engine catches.
- CI needs hermetic, parallel-safe integration tests without a provisioned shared database.
- Repository, DAO, or ORM code (Drizzle, Prisma, Knex, TypeORM) needs verification against the production database engine and real migrations.
