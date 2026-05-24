import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers PostgreSQL Node.js — Complete Guide 2026',
  description:
    'Master Testcontainers for PostgreSQL in Node.js. Real integration tests with Docker, migrations, seeding, connection pooling, and CI/CD patterns.',
  date: '2026-05-01',
  category: 'Guide',
  content: `
# Testcontainers PostgreSQL Node.js Complete Guide

Testing applications that depend on PostgreSQL has historically been a painful tradeoff. You either use an in-memory shim like pg-mem that drifts from real Postgres behavior, share a single database that bleeds state between tests, or stand up a heavyweight docker-compose stack that takes 30 seconds to boot. Testcontainers solves this by giving every test suite (or every individual test) a fresh, real, isolated PostgreSQL instance running in a Docker container, programmatically lifecycle-managed by your test runner. In 2026, Testcontainers has become the de facto standard for integration testing in Node.js because it eliminates the entire class of "works on my machine" bugs that plague teams trying to validate database logic.

This guide walks you through everything you need to build production-grade integration tests against PostgreSQL using Testcontainers and Node.js. We will cover installation, container lifecycle, schema migrations, seeding strategies, transactional rollback patterns, connection pooling, CI/CD configuration, and the common pitfalls that catch teams the first time they roll this out. Code samples use TypeScript with Vitest and node-postgres, but every pattern translates to Jest, Mocha, Knex, Drizzle, Prisma, TypeORM, and Sequelize without modification.

---

## Key Takeaways

- **Testcontainers runs a real PostgreSQL** Docker image per test suite — no mocks, no shims, no drift from production behavior
- **PostgreSqlContainer** is the official Node.js module that wraps PostgreSQL with sensible defaults and helper methods like \`getConnectionUri()\`
- **Container reuse** via the \`.withReuse()\` flag cuts test suite startup from 30 seconds to under 1 second after the first run
- **Migrations should run inside the test setup** to mirror production schema exactly, not via a separate seeding script
- **Connection pooling matters** — exhausting pool slots is the most common cause of flaky Testcontainers suites
- **CI/CD setup is one line** in GitHub Actions: Docker is already available on \`ubuntu-latest\` runners

---

## Why Testcontainers for PostgreSQL

Before Testcontainers, Node.js teams had three options for testing Postgres-dependent code, each with serious tradeoffs.

Option one was an in-memory mock like pg-mem. These libraries claim to be drop-in PostgreSQL replacements, but in reality they reimplement only a subset of SQL behavior. JSONB operators, full-text search, window functions, generated columns, and stored procedures either do not work or behave subtly differently. Worse, they let you write tests that pass against the mock but fail in production. We have seen teams ship migration bugs that mocked databases happily accepted.

Option two was a shared development database. Every developer connects to the same Postgres instance, runs the test suite, and prays nobody else is doing the same thing. Tests must clean up after themselves, transactions interact unpredictably, and parallel CI jobs become impossible. Test data accumulates over months and corrupts assertions.

Option three was docker-compose. Spin up a Postgres container before the test suite, tear it down after. This works, but the developer experience is poor: tests cannot be run without first running \`docker-compose up\`, container lifecycle is decoupled from test lifecycle, and parallel test runs require careful port management.

Testcontainers solves all of these problems by making container management a first-class part of the test runner. Each test (or each suite) gets a fresh container with a unique port, connection details exposed as a string, automatic cleanup when the test process exits, and full SQL compatibility because it is running real PostgreSQL.

---

## Installation and Setup

Install the core Testcontainers package and the PostgreSQL module:

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/postgresql
npm install --save-dev vitest pg @types/pg
\`\`\`

You will also need Docker running locally. On macOS and Windows, install Docker Desktop. On Linux, install Docker Engine and ensure your user is in the \`docker\` group. Verify with \`docker info\` — if that command works, Testcontainers will work.

Add a Vitest configuration to give containers enough time to boot:

\`\`\`typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
    isolate: true,
  },
});
\`\`\`

The \`forks\` pool with isolation gives each test file its own process, which prevents container handle leaks across files. The 60-second timeout accommodates the cold start of pulling the Postgres image on first run; subsequent runs are dramatically faster because Docker caches the image.

---

## Your First Test

Here is the minimal example that proves the setup works:

\`\`\`typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

describe('PostgreSQL integration', () => {
  let container: StartedPostgreSqlContainer;
  let client: Client;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    client = new Client({ connectionString: container.getConnectionUri() });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await container.stop();
  });

  it('runs a simple query', async () => {
    const result = await client.query('SELECT 1 + 1 AS sum');
    expect(result.rows[0].sum).toBe(2);
  });

  it('creates and queries a table', async () => {
    await client.query(\`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL
      )
    \`);
    await client.query("INSERT INTO users (email) VALUES ('alice@example.com')");
    const result = await client.query('SELECT * FROM users');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe('alice@example.com');
  });
});
\`\`\`

When you run \`npx vitest\`, you will see Vitest pause for several seconds during \`beforeAll\` as Docker pulls the \`postgres:16-alpine\` image (about 100 MB). Subsequent runs reuse the cached image. The container starts, the connection succeeds, both tests pass, and the container is torn down.

---

## PostgreSqlContainer API Reference

| Method | Description | Default |
|---|---|---|
| \`new PostgreSqlContainer(image)\` | Constructor; image defaults to \`postgres:13.3-alpine\` | \`postgres:13.3-alpine\` |
| \`.withDatabase(name)\` | Override default database name | \`test\` |
| \`.withUsername(name)\` | Override default username | \`test\` |
| \`.withPassword(pwd)\` | Override default password | \`test\` |
| \`.withReuse()\` | Reuse container across runs (TC v10+) | disabled |
| \`.withExposedPorts(port)\` | Expose additional ports | 5432 |
| \`.withEnvironment(env)\` | Set additional env vars | none |
| \`.withCommand(cmd)\` | Override Docker CMD | postgres default |
| \`.withCopyFilesToContainer(files)\` | Copy files into container | none |
| \`.start()\` | Boot container, return \`StartedPostgreSqlContainer\` | required |

After start, the container exposes:

| Method | Returns |
|---|---|
| \`getHost()\` | Hostname (usually \`localhost\`) |
| \`getMappedPort(5432)\` | Random host port mapped to container 5432 |
| \`getConnectionUri()\` | Full \`postgres://user:pass@host:port/db\` URI |
| \`getDatabase()\` | Database name |
| \`getUsername()\` | Username |
| \`getPassword()\` | Password |
| \`getName()\` | Docker container name |
| \`getId()\` | Docker container ID |

---

## Running Migrations Inside Tests

The biggest mistake teams make is running migrations as a separate step. Instead, run them in your test setup so the schema matches production exactly and tests fail fast if a migration is broken.

Here is the pattern with Drizzle:

\`\`\`typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

let container: StartedPostgreSqlContainer;
let pool: Pool;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  db = drizzle(pool);
  await migrate(db, { migrationsFolder: './drizzle' });
}, 60_000);

afterAll(async () => {
  await pool.end();
  await container.stop();
});
\`\`\`

With Knex:

\`\`\`typescript
import knex from 'knex';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  db = knex({
    client: 'pg',
    connection: container.getConnectionUri(),
  });
  await db.migrate.latest({ directory: './migrations' });
});
\`\`\`

With Prisma, you cannot point Prisma at a connection string at runtime out of the box. You must set the \`DATABASE_URL\` environment variable before invoking Prisma's migration runner:

\`\`\`typescript
import { execSync } from 'child_process';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
});
\`\`\`

---

## Seeding Test Data

Once migrations have run, seed the data your tests need. Three patterns work well.

**Pattern one: Truncate-and-seed per test.** Simple but slow because you pay the truncate cost for every test:

\`\`\`typescript
beforeEach(async () => {
  await db.execute(sql\`TRUNCATE TABLE users, orders, products RESTART IDENTITY CASCADE\`);
  await seedUsers(db, 10);
  await seedProducts(db, 50);
});
\`\`\`

**Pattern two: Transactional rollback.** Wrap each test in a transaction and roll it back. Fast but does not work for code that uses its own transactions:

\`\`\`typescript
beforeEach(async () => {
  await db.query('BEGIN');
});

afterEach(async () => {
  await db.query('ROLLBACK');
});
\`\`\`

**Pattern three: Per-suite container.** Spin up one container per describe block, seed once, and trust each test not to interfere. Fastest, but requires test discipline:

\`\`\`typescript
describe('user service', () => {
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    // setup once
  });

  afterAll(async () => {
    await container.stop();
  });

  it('test 1', async () => { /* uses different user IDs */ });
  it('test 2', async () => { /* uses different user IDs */ });
});
\`\`\`

For most projects, pattern three is the right default with transactional rollback as a fallback for tests that mutate shared state.

---

## Container Reuse for Fast Local Iteration

Each container takes 2 to 5 seconds to start. If you have 50 test files each spinning up their own container, that is 2 to 4 minutes of overhead. Testcontainers v10+ supports container reuse: tag a container as reusable and Testcontainers will reuse the same container across test runs.

\`\`\`typescript
container = await new PostgreSqlContainer('postgres:16-alpine')
  .withReuse()
  .start();
\`\`\`

This requires enabling reuse in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

With reuse enabled, the first test run starts a container. Subsequent runs check for an existing container with a matching label hash, find it, and connect immediately. Test suite startup drops from 30 seconds to under 1 second on warm machines.

Important: container reuse only works on local development. CI should not reuse containers because each CI run is a fresh environment. The configuration is safe to commit because the \`.testcontainers.properties\` file is per-user, not per-repo.

---

## CI/CD Configuration

GitHub Actions makes Testcontainers trivial because Docker is preinstalled on \`ubuntu-latest\` runners:

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
          cache: pnpm
      - run: pnpm install
      - run: pnpm test
\`\`\`

That is it. No services configuration, no docker-compose file, no port mapping. Testcontainers does everything.

For GitLab CI, you need to use the Docker-in-Docker pattern:

\`\`\`yaml
test:
  image: node:20
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  script:
    - npm test
\`\`\`

For CircleCI, use the \`setup_remote_docker\` step. For Jenkins, ensure the build agent has Docker socket access.

---

## Common Pitfalls

**Container handle leaks.** If your test process exits abruptly (Ctrl-C, an unhandled rejection), containers may not stop. Testcontainers ships a "Ryuk" sidecar container that watches your test process and reaps containers when it dies, but Ryuk requires the Docker socket to be mounted. On some CI systems and dev containers, Ryuk is disabled. Set \`TESTCONTAINERS_RYUK_DISABLED=true\` only if you have your own cleanup logic.

**Connection pool exhaustion.** Each test might open a connection pool with 10 connections. PostgreSQL defaults to 100 max connections. If you run 11 test files in parallel, you can exhaust the pool. Either reduce \`max\` in your pool config or run tests sequentially.

**Forgetting to await stop().** TypeScript will not warn you if you forget to await \`container.stop()\`. The test passes but the container leaks. Always await both \`start\` and \`stop\`.

**Image versions drift.** Always pin to a specific tag like \`postgres:16-alpine\`, never \`postgres:latest\`. Without pinning, your tests can break overnight when a new Postgres minor version ships.

**Slow image pulls in CI.** If your CI does not cache Docker layers, every run pulls the full image. GitHub Actions has good Docker layer caching via the \`buildx\` action; configure it for self-hosted runners that do not preserve state.

---

## Advanced Patterns

**Custom Postgres images.** If your production uses an extension like \`pgvector\` or \`postgis\`, point Testcontainers at the matching image:

\`\`\`typescript
container = await new PostgreSqlContainer('pgvector/pgvector:pg16').start();
await client.query('CREATE EXTENSION vector');
\`\`\`

**Loading SQL fixtures from files.** Copy a SQL file into the container and run it on startup:

\`\`\`typescript
container = await new PostgreSqlContainer('postgres:16-alpine')
  .withCopyFilesToContainer([
    {
      source: './fixtures/initial.sql',
      target: '/docker-entrypoint-initdb.d/initial.sql',
    },
  ])
  .start();
\`\`\`

Any \`.sql\` file dropped in \`/docker-entrypoint-initdb.d/\` runs automatically when the container starts.

**Network sharing for multi-container tests.** If your test needs Postgres plus Redis plus your app server, put them on a shared network:

\`\`\`typescript
import { Network } from 'testcontainers';

const network = await new Network().start();
const postgres = await new PostgreSqlContainer('postgres:16-alpine')
  .withNetwork(network)
  .withNetworkAliases('postgres')
  .start();
\`\`\`

---

## Conclusion

Testcontainers transforms PostgreSQL integration testing in Node.js from a painful tradeoff into a solved problem. You get real Postgres, isolated per suite, no docker-compose, fast cold starts, and one-line CI/CD setup. The patterns in this guide — migrations in setup, transactional rollback or per-suite seeding, container reuse for local dev — scale from a 10-test project to a 10,000-test monorepo.

To go further, explore the broader QA skills directory at [/skills](/skills) for related testing patterns, or read our [Testcontainers Best Practices 2026](/blog/testcontainers-best-practices-2026) deep dive on architectural patterns for large-scale integration suites.
`,
};
