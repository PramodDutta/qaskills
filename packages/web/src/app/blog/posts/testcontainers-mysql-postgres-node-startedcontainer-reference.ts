import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers MySQL + Postgres Node: StartedContainer Reference',
  description:
    'Complete TypeScript reference for @testcontainers/mysql and @testcontainers/postgresql. Cover MySqlContainer, PostgreSqlContainer, getConnectionUri, jest fixtures, cleanup.',
  date: '2026-06-05',
  category: 'Reference',
  content: `
# Testcontainers MySQL + Postgres Node: StartedContainer Reference

If you write integration tests against a real database from Node.js or TypeScript, the \`@testcontainers/mysql\` and \`@testcontainers/postgresql\` modules are the most reliable way to get a hermetic, throwaway instance per test file. This reference walks through every method on \`MySqlContainer\`, \`StartedMySqlContainer\`, \`PostgreSqlContainer\`, and \`StartedPostgreSqlContainer\`, including \`getConnectionUri\`, \`withDatabase\`, \`withUsername\`, \`withPassword\`, environment overrides, healthcheck behavior, and the jest fixture pattern most teams converge on. Whether you are searching for \`mysqlcontainer testcontainers node\` or \`startedpostgresqlcontainer @testcontainers/postgresql\`, you should find a copy-pasteable example here.

We assume Node 20+, TypeScript 5+, Docker installed and reachable, and a recent version of \`jest\` or \`vitest\` as the runner. Examples use the official \`mysql2\` and \`pg\` clients, plus \`drizzle-orm\` and \`prisma\` for ORM patterns where relevant.

## Key Takeaways

- \`MySqlContainer\` and \`PostgreSqlContainer\` follow the same fluent builder pattern: \`.withDatabase(name)\`, \`.withUsername(user)\`, \`.withPassword(pw)\`, \`.start()\` -> returns \`Started*Container\`
- \`getConnectionUri()\` returns a complete DSN string suitable for passing to \`new Client({ connectionString })\` in pg or to \`mysql2/promise\`'s \`createConnection\`
- The default images are official: \`mysql:8.0\` and \`postgres:16-alpine\`. Pin major and minor versions explicitly to avoid surprise upgrades
- Use one container per test file for isolation, or one shared container with truncated tables between tests. Both patterns are valid; pick based on suite size
- Always handle cleanup in \`afterAll\`: stop the container, close pool connections, and release any \`Client\` instances

## Installing the Modules

Each database has its own module, plus the core testcontainers package:

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/mysql @testcontainers/postgresql mysql2 pg
\`\`\`

For pnpm users in a monorepo:

\`\`\`bash
pnpm add -D testcontainers @testcontainers/mysql @testcontainers/postgresql mysql2 pg
\`\`\`

Types are shipped with the packages. No \`@types/*\` install is required.

## MySqlContainer: Minimal Example

The smallest TypeScript test that boots MySQL, runs a query, and tears down:

\`\`\`typescript
import { MySqlContainer, StartedMySqlContainer } from '@testcontainers/mysql';
import { createConnection } from 'mysql2/promise';

describe('mysql roundtrip', () => {
  let container: StartedMySqlContainer;

  beforeAll(async () => {
    container = await new MySqlContainer('mysql:8.0').start();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  it('inserts and reads a row', async () => {
    const conn = await createConnection(container.getConnectionUri());
    await conn.query('CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(50))');
    await conn.query('INSERT INTO users VALUES (1, ?)', ['Ada']);
    const [rows] = await conn.query('SELECT name FROM users WHERE id = 1');
    expect((rows as { name: string }[])[0].name).toBe('Ada');
    await conn.end();
  });
});
\`\`\`

The first run pulls the \`mysql:8.0\` image (about 600MB) which can take a minute. Subsequent runs use the cached layer and start in 8-15 seconds.

## PostgreSqlContainer: Minimal Example

\`\`\`typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

describe('postgres roundtrip', () => {
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  it('inserts and reads a row', async () => {
    const client = new Client({ connectionString: container.getConnectionUri() });
    await client.connect();
    await client.query('CREATE TABLE users (id INT PRIMARY KEY, name TEXT)');
    await client.query('INSERT INTO users VALUES (1, $1)', ['Ada']);
    const res = await client.query('SELECT name FROM users WHERE id = 1');
    expect(res.rows[0].name).toBe('Ada');
    await client.end();
  });
});
\`\`\`

Alpine images are roughly 200MB so first-run pull is much faster than for MySQL.

## getConnectionUri Anatomy

| Database | Example URI |
|---|---|
| MySQL | \`mysql://test:test@localhost:49234/test\` |
| Postgres | \`postgresql://test:test@localhost:49235/test\` |

The default username, password, and database name are all \`test\` unless overridden. Both clients accept the URI form directly:

\`\`\`typescript
// pg
const client = new Client({ connectionString: container.getConnectionUri() });

// mysql2
const conn = await createConnection(container.getConnectionUri());

// drizzle
const db = drizzle(postgres(container.getConnectionUri()));

// prisma
process.env.DATABASE_URL = container.getConnectionUri();
\`\`\`

## Customizing the Database

Both modules expose a fluent builder for the standard env vars:

\`\`\`typescript
const mysql = await new MySqlContainer('mysql:8.0')
  .withDatabase('app')
  .withUsername('app_user')
  .withRootPassword('rootpw')
  .withUserPassword('apppw')
  .start();

const pg = await new PostgreSqlContainer('postgres:16-alpine')
  .withDatabase('app')
  .withUsername('app_user')
  .withPassword('apppw')
  .start();
\`\`\`

The URI returned by \`getConnectionUri()\` reflects these overrides.

## Full Method Reference -- MySqlContainer

| Method | Description |
|---|---|
| \`.withDatabase(name)\` | Sets \`MYSQL_DATABASE\` |
| \`.withUsername(name)\` | Sets \`MYSQL_USER\` (cannot be root) |
| \`.withRootPassword(pw)\` | Sets \`MYSQL_ROOT_PASSWORD\` |
| \`.withUserPassword(pw)\` | Sets \`MYSQL_PASSWORD\` |
| \`.withCommand([...])\` | Override the entrypoint command |
| \`.withEnvironment({...})\` | Add or override env vars |
| \`.withExposedPorts(3306)\` | Optional port pinning |
| \`.withNetwork(network)\` | Attach to a shared Docker network |
| \`.withNetworkAliases([...])\` | Add hostname aliases |
| \`.withReuse()\` | Enable cross-run reuse |
| \`.withStartupTimeout(ms)\` | Wait up to N ms for readiness |
| \`.start()\` | Resolve to a \`StartedMySqlContainer\` |

## Full Method Reference -- PostgreSqlContainer

| Method | Description |
|---|---|
| \`.withDatabase(name)\` | Sets \`POSTGRES_DB\` |
| \`.withUsername(name)\` | Sets \`POSTGRES_USER\` |
| \`.withPassword(pw)\` | Sets \`POSTGRES_PASSWORD\` |
| \`.withCopyFilesToContainer([...])\` | Copy seed SQL into the image |
| \`.withCommand([...])\` | Override entrypoint |
| \`.withEnvironment({...})\` | Add or override env vars |
| \`.withExposedPorts(5432)\` | Optional port pinning |
| \`.withNetwork(network)\` | Attach to a shared network |
| \`.withReuse()\` | Enable cross-run reuse |
| \`.withStartupTimeout(ms)\` | Wait up to N ms for readiness |
| \`.start()\` | Resolve to a \`StartedPostgreSqlContainer\` |

## StartedContainer Accessors

Both \`StartedMySqlContainer\` and \`StartedPostgreSqlContainer\` inherit from the core \`StartedContainer\` class and add database-specific helpers:

| Accessor | Returns | Example |
|---|---|---|
| \`getConnectionUri()\` | Full DSN | \`postgresql://test:test@localhost:5432/test\` |
| \`getHost()\` | Host or IP | \`localhost\` |
| \`getMappedPort(3306)\` | Host port | \`49234\` |
| \`getDatabase()\` | Database name | \`test\` |
| \`getUsername()\` | Username | \`test\` |
| \`getUserPassword()\` (mysql) | User password | \`test\` |
| \`getRootPassword()\` (mysql) | Root password | \`test\` |
| \`getPassword()\` (postgres) | Password | \`test\` |
| \`getId()\` | Container ID | \`abc123...\` |

## The Jest Fixture Pattern

Most teams converge on one of two patterns: per-file containers or a shared container with truncation. We strongly recommend per-file when test files are small, and shared with truncation when you have 20+ files.

### Per-file pattern

\`\`\`typescript
let container: StartedPostgreSqlContainer;
let client: Client;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();
  await client.query('CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)');
}, 60_000);

afterAll(async () => {
  await client.end();
  await container.stop();
});

beforeEach(async () => {
  await client.query('TRUNCATE users RESTART IDENTITY CASCADE');
});
\`\`\`

### Shared container pattern (globalSetup)

In \`jest.config.ts\`:

\`\`\`typescript
export default {
  globalSetup: '<rootDir>/test/globalSetup.ts',
  globalTeardown: '<rootDir>/test/globalTeardown.ts',
};
\`\`\`

\`globalSetup.ts\`:

\`\`\`typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';

export default async function () {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  (global as any).__PG_CONTAINER__ = container;
}
\`\`\`

\`globalTeardown.ts\`:

\`\`\`typescript
export default async function () {
  await (global as any).__PG_CONTAINER__?.stop();
}
\`\`\`

Inside individual tests you then read \`process.env.DATABASE_URL\` to construct clients. Truncate tables in \`beforeEach\` for isolation. This pattern shaves 30-60 seconds off a 20-file suite.

## Seeding Schema and Data

There are three common approaches:

### Inline SQL via the client

Fastest for small fixtures:

\`\`\`typescript
await client.query(\\\`
  CREATE TABLE users (id SERIAL, name TEXT);
  CREATE TABLE orders (id SERIAL, user_id INT, amount NUMERIC);
\\\`);
\`\`\`

### Copy files into the image

Postgres auto-executes any \`.sql\` files in \`/docker-entrypoint-initdb.d\`:

\`\`\`typescript
const container = await new PostgreSqlContainer('postgres:16-alpine')
  .withCopyFilesToContainer([
    { source: './fixtures/schema.sql', target: '/docker-entrypoint-initdb.d/01-schema.sql' },
    { source: './fixtures/seed.sql', target: '/docker-entrypoint-initdb.d/02-seed.sql' },
  ])
  .start();
\`\`\`

MySQL works the same way; mount to \`/docker-entrypoint-initdb.d/\`.

### Run migrations against the live container

For Drizzle:

\`\`\`typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const client = new Client({ connectionString: container.getConnectionUri() });
await client.connect();
const db = drizzle(client);
await migrate(db, { migrationsFolder: './drizzle' });
\`\`\`

For Prisma:

\`\`\`typescript
import { execSync } from 'node:child_process';
process.env.DATABASE_URL = container.getConnectionUri();
execSync('npx prisma migrate deploy', { stdio: 'inherit' });
\`\`\`

## Pool vs Single Client

For most integration tests a single \`Client\` (pg) or \`Connection\` (mysql2) is sufficient. Switch to a pool only if you are testing concurrent access patterns:

\`\`\`typescript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: container.getConnectionUri(), max: 10 });
const results = await Promise.all(
  Array.from({ length: 50 }, (_, i) => pool.query('INSERT INTO users (name) VALUES ($1)', [\\\`user\${i}\\\`])),
);
await pool.end();
\`\`\`

Always call \`pool.end()\` in \`afterAll\` before \`container.stop()\`. Otherwise Jest will detect open handles and the process will hang.

## Healthcheck and Wait Strategy

Both containers ship a built-in wait strategy. Postgres waits for the log message \`database system is ready to accept connections\` (appearing twice -- once during init, once for real). MySQL waits for the socket plus the absence of "Init InnoDB" messages. You almost never need to override these, but for slow CI machines bump the timeout:

\`\`\`typescript
.withStartupTimeout(180_000)
\`\`\`

## Comparison: MySQL vs Postgres in Testcontainers

| Aspect | MySQL | Postgres |
|---|---|---|
| Default image | \`mysql:8.0\` (~600MB) | \`postgres:16-alpine\` (~230MB) |
| Cold start time | 15-30s | 5-15s |
| Default user | \`test\` | \`test\` |
| Default db | \`test\` | \`test\` |
| Native arm64? | Yes (8.0.32+) | Yes (alpine variant) |
| Entrypoint init | \`/docker-entrypoint-initdb.d\` | \`/docker-entrypoint-initdb.d\` |
| Connection URI scheme | \`mysql://\` | \`postgresql://\` |

If you can pick either, prefer Postgres for tests. The image is smaller, startup is faster, and the alpine variant runs cleanly on Apple Silicon.

## Multiple Databases

A single \`PostgreSqlContainer\` can host multiple logical databases. Connect as the superuser and create what you need:

\`\`\`typescript
const container = await new PostgreSqlContainer('postgres:16-alpine')
  .withDatabase('main')
  .withUsername('app')
  .withPassword('pw')
  .start();

const adminClient = new Client({
  connectionString: container.getConnectionUri().replace('/main', '/postgres'),
});
await adminClient.connect();
await adminClient.query('CREATE DATABASE analytics OWNER app');
await adminClient.end();
\`\`\`

## Reusing Containers

If \`TESTCONTAINERS_REUSE_ENABLE=true\` and you call \`.withReuse()\`, the container survives the runner exiting:

\`\`\`typescript
const container = await new PostgreSqlContainer('postgres:16-alpine')
  .withReuse()
  .start();
\`\`\`

This saves 5-15 seconds per run on iterative work. See the dedicated [withReuse guide](/blog/testcontainers-withreuse-node-typescript-guide) for details and the cleanup obligations that come with it.

## CI Considerations

| CI provider | Docker support | Notes |
|---|---|---|
| GitHub Actions | Yes (linux runners) | Use \`ubuntu-latest\`; Docker is pre-installed |
| GitLab CI | Yes (DinD service) | Add \`services: [docker:dind]\` |
| CircleCI | Yes (machine executor or remote Docker) | Use \`setup_remote_docker\` |
| Vercel | No | Tests must mock or skip |
| Cloudflare Pages | No | Same |

For GitHub Actions a minimal step is:

\`\`\`yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: pnpm install
- run: pnpm test
\`\`\`

No \`services:\` block is required because Testcontainers manages the Docker lifecycle itself.

## Cleanup Gotchas

1. **Pool leaks**: \`new Pool()\` without \`.end()\` keeps the process alive past Jest's last test. Always end pools in \`afterAll\`.
2. **Forgotten clients**: a stray \`new Client()\` without \`.end()\` produces the same leak. Use the pool pattern or ensure each Client has a matching end.
3. **Container stop order**: stop the container LAST. If you stop it before closing pool connections, those connections raise \`ECONNREFUSED\` during teardown.
4. **Image churn**: pin tags. Using \`postgres:latest\` means surprise upgrades and broken tests across teams.

## Frequently Asked Questions

### Should I share a container across all test files?

It depends. For small suites (under 10 files) per-file containers are simpler and more isolated. For larger suites the cold-start cost adds up and a single shared container with table truncation is faster. The shared pattern also forces you to think about test isolation explicitly, which is a positive.

### How do I run migrations before each test?

Don't. Run migrations once in \`beforeAll\` (or in globalSetup). Truncate tables in \`beforeEach\` to reset state. Migrations are slow and re-running them per test multiplies suite time.

### Can I use Prisma with Testcontainers?

Yes. Boot the container, set \`process.env.DATABASE_URL = container.getConnectionUri()\` before importing the Prisma client, then run \`prisma migrate deploy\` to apply migrations. Prisma's client reads the env var at construction time so the order matters.

### What about Drizzle?

Same pattern: boot the container, build the connection string, hand it to \`drizzle()\`. Drizzle's migrator runs in-process against any pg or mysql2 client, so no shell exec is required.

### Why does the Postgres URI start with postgresql:// instead of postgres://?

Both schemes are valid and pg accepts either. The module uses \`postgresql://\` because it is the IANA-registered form. If you have config code that hard-codes \`postgres://\` you can substitute it with a string replace.

### Can I run two containers in the same test?

Absolutely. Spin up MySQL and Postgres side by side if your app needs both. Each container gets a different ephemeral host port so there is no conflict. Just remember to stop both in \`afterAll\`.

### My test pulls the image on every run. How do I cache it?

Locally Docker caches images automatically. In CI you may need to add an image-pull step before the test job and configure Docker layer caching. GitHub Actions has \`docker/setup-buildx-action\` and the \`type=gha\` cache backend if your test infrastructure pulls images frequently.

## Conclusion

\`@testcontainers/mysql\` and \`@testcontainers/postgresql\` v10 give you hermetic, throwaway database instances per test file with two lines of TypeScript. Use \`.withDatabase\`, \`.withUsername\`, \`.withPassword\` to override defaults, read \`getConnectionUri()\` to wire pg, mysql2, Drizzle, or Prisma, and clean up clients before stopping the container. Pair this with our [Kafka reference](/blog/testcontainers-kafka-typescript-getbootstrapservers-reference) for full-stack integration testing, and consult the [withReuse guide](/blog/testcontainers-withreuse-node-typescript-guide) when iteration speed becomes a bottleneck.

Looking to add a Testcontainers skill to your AI coding agent? Browse the [Testcontainers skills](/skills) directory and the [database testing comparison](/compare) for the right fit.
`,
};
