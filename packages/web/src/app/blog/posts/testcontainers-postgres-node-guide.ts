import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Postgres in Node.js: Complete Guide (2026)',
  description:
    'Spin up real Postgres in Node.js and TypeScript tests with Testcontainers — PostgreSqlContainer, connection strings, migrations, seeding, reuse, and CI. Runnable code.',
  date: '2026-06-21',
  category: 'Guide',
  content: `
# Testcontainers Postgres in Node.js: Complete Guide (2026)

For years the conventional wisdom for testing database code in Node.js was to mock the database or swap Postgres for SQLite in tests. Both approaches lie to you. Mocks assert that your code calls a function with certain arguments, not that the query is valid SQL or that the schema actually has the columns you reference. SQLite has a different type system, different JSON operators, no \`@>\` array containment, no real \`SERIAL\`/\`GENERATED\` semantics, and a dialect that diverges from Postgres exactly where bugs hide. The result is a green test suite that passes against a database you never ship. Testcontainers takes the opposite bet: spin up a **real, ephemeral Postgres container** for your tests, run your real migrations against it, and throw it away when the suite finishes. Your tests run against the same engine, the same version, and the same SQL dialect as production.

This guide is a complete, runnable walkthrough for Node.js and TypeScript in 2026. You will install \`@testcontainers/postgresql\`, start a container with \`new PostgreSqlContainer().start()\`, pull the connection details with \`getConnectionUri()\`, \`getHost()\`, and \`getPort()\`, and wire that into a \`pg\` Pool, Prisma, or Drizzle client. We will run migrations and seed data inside the test lifecycle, manage \`beforeAll\`/\`afterAll\` in both Vitest and Jest, speed things up with \`.withReuse()\` and the \`testcontainers.reuse.enable\` flag, and get the whole thing running in GitHub Actions where Docker is already available. The final sections cover performance tuning and the specific errors you will hit — Docker not running, port conflicts, and image pull timeouts — with concrete fixes.

If your tests are also slow because the suite is large, the companion [Playwright test sharding and parallel CI guide](/blog/playwright-test-sharding-parallel-ci-guide) shows how to parallelize across machines, and giving each shard its own container pairs naturally with the patterns here. For API-layer testing strategy, see [Postman vs Playwright](/blog/postman-vs-playwright), and for debugging failing browser tests the [Playwright trace CLI analysis guide](/blog/playwright-trace-cli-analysis-guide-2026) is invaluable. You can also browse production-ready testing [skills](/skills).

## Why an Ephemeral Real Database Beats Mocks and SQLite

The core argument is fidelity. A test is only as trustworthy as the gap between what it exercises and what runs in production. That gap is the bug surface.

Mocks have the largest gap. When you mock \`pool.query\`, you are testing that your code formats a string and calls a function — you are not testing the SQL. A typo in a column name, a missing migration, a broken JOIN, an off-by-one in a window function: all pass. Worse, mocks ossify implementation details, so a harmless refactor breaks dozens of tests that were never about behavior.

SQLite shrinks the gap but does not close it. It is a genuinely different engine. It has dynamic typing where Postgres is strict, no native \`UUID\`, different \`NULL\` ordering, no \`RETURNING\` on every statement historically, no Postgres-specific operators (\`@>\`, \`?\`, \`->>\` on JSONB behave differently), and no extensions like \`pgcrypto\` or \`pg_trgm\`. Any code touching those features is untested or, worse, tested against wrong behavior.

Testcontainers closes the gap to nearly zero. You run the *exact* Postgres image tag you deploy. The only differences from production are scale and data, which integration tests are not trying to validate anyway.

| Approach | SQL fidelity | Speed | Isolation | Catches schema/migration bugs |
|---|---|---|---|---|
| Mocked DB | None — tests the call, not the query | Fastest | Perfect | No |
| SQLite in-memory | Partial — different dialect | Very fast | Perfect | Some |
| Shared dev/CI Postgres | High — real engine | Fast (no startup) | Poor — tests collide | Yes, if migrated |
| Testcontainers Postgres | Highest — same image as prod | Fast after first pull | Per-suite/per-worker | Yes |

The shared-database row is the one many teams default to, and its fatal flaw is isolation: parallel tests stomp on each other's data, and "clean up after yourself" is forgotten exactly once and then everyone debugs phantom failures. Testcontainers gives you a fresh, private database with effectively zero cleanup discipline required.

## Installing the Package

Testcontainers for Node ships the Postgres module separately from the core. Install both, plus a driver:

\`\`\`bash
npm install --save-dev testcontainers @testcontainers/postgresql
# plus whichever client you use:
npm install pg
# or
npm install drizzle-orm postgres
# or
npm install @prisma/client && npm install --save-dev prisma
\`\`\`

The only runtime prerequisite is a working Docker daemon (Docker Desktop, Colima, Podman with the Docker socket, or Docker Engine on Linux). Testcontainers talks to the Docker socket; it does not need any special configuration for a default install.

## Starting a Postgres Container

The smallest possible example: start a container, get its connection URI, query it, and stop it.

\`\`\`typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

async function main() {
  // Pin the image tag — never use :latest in tests.
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();

  const client = new Client({ connectionString: container.getConnectionUri() });
  await client.connect();

  const result = await client.query('SELECT 1 AS value');
  console.log(result.rows[0].value); // 1

  await client.end();
  await container.stop();
}

main();
\`\`\`

\`new PostgreSqlContainer('postgres:16-alpine')\` constructs the container definition; \`.start()\` pulls the image (first run only), boots Postgres, and — crucially — **waits until the database is actually accepting connections** before resolving. You never need a manual \`sleep\` or retry loop; the module's wait strategy handles readiness for you.

You can customize the database name, user, and password fluently:

\`\`\`typescript
const container = await new PostgreSqlContainer('postgres:16-alpine')
  .withDatabase('app_test')
  .withUsername('test_user')
  .withPassword('test_pass')
  .start();
\`\`\`

## Reading Connection Details

The container exposes everything your client needs. The single most useful method is \`getConnectionUri()\`, which returns a ready-to-use \`postgresql://\` URL with the host, the *mapped* port, and credentials baked in:

\`\`\`typescript
const uri = container.getConnectionUri();
// e.g. postgresql://test:test@localhost:54213/test
\`\`\`

The port matters: Testcontainers maps Postgres's internal 5432 to a **random free port** on your host to avoid collisions, so never hardcode 5432. Use the accessors when you need the pieces individually:

| Method | Returns | Typical use |
|---|---|---|
| \`getConnectionUri()\` | Full \`postgresql://\` connection string | Pass to Prisma, Drizzle, \`new Pool({ connectionString })\` |
| \`getHost()\` | Host (usually \`localhost\` or \`127.0.0.1\`) | Manual config object |
| \`getPort()\` | Mapped host port (random) | Manual config object |
| \`getMappedPort(5432)\` | Mapped port for an internal port | Same as \`getPort()\`, explicit |
| \`getDatabase()\` | Database name | Manual config object |
| \`getUsername()\` | DB user | Manual config object |
| \`getPassword()\` | DB password | Manual config object |
| \`start()\` | Started container handle | Begins the lifecycle |
| \`stop()\` | void | Tears the container down |

Building a config object manually:

\`\`\`typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: container.getHost(),
  port: container.getPort(),
  database: container.getDatabase(),
  user: container.getUsername(),
  password: container.getPassword(),
});
\`\`\`

## Wiring Up pg, Prisma, and Drizzle

Once you have the URI, every client connects the same way as in production — point it at the container's URI.

**node-postgres (pg):**

\`\`\`typescript
import { Pool } from 'pg';

const pool = new Pool({ connectionString: container.getConnectionUri() });
const { rows } = await pool.query('SELECT now()');
\`\`\`

**Drizzle ORM (with postgres-js):**

\`\`\`typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const sql = postgres(container.getConnectionUri(), { max: 1 });
export const db = drizzle(sql);
// db.select().from(users) ... using your existing schema
\`\`\`

**Prisma** reads its URL from \`DATABASE_URL\`, so set the env var from the container before instantiating the client:

\`\`\`typescript
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = container.getConnectionUri();
const prisma = new PrismaClient();
// run migrations (next section), then prisma.user.findMany() ...
\`\`\`

For Prisma, setting \`DATABASE_URL\` must happen **before** \`new PrismaClient()\` is constructed, since the client reads it at construction time. Do it inside \`beforeAll\` and instantiate Prisma there too.

## Running Migrations and Seeding

A fresh container has the right engine but an empty schema. You must apply your migrations against it before tests run — this is precisely what validates that your migrations actually work.

**Raw SQL migration with pg** — apply a schema file then seed:

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

async function migrateAndSeed(pool: Pool) {
  const schema = readFileSync('./db/schema.sql', 'utf8');
  await pool.query(schema);

  await pool.query(
    'INSERT INTO users (email, name) VALUES (\$1, \$2)',
    ['ada@example.com', 'Ada Lovelace'],
  );
}
\`\`\`

**Drizzle** has a programmatic migrator that runs your generated migration folder:

\`\`\`typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const sql = postgres(container.getConnectionUri(), { max: 1 });
const db = drizzle(sql);
await migrate(db, { migrationsFolder: './drizzle' });
\`\`\`

**Prisma** can apply migrations via the CLI against the container URI:

\`\`\`typescript
import { execSync } from 'node:child_process';

execSync('npx prisma migrate deploy', {
  env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
  stdio: 'inherit',
});
\`\`\`

Run migrations once per container (in \`beforeAll\`), then either seed fresh data per test or wrap each test in a transaction you roll back. The transaction-rollback pattern keeps tests isolated without re-running migrations:

\`\`\`typescript
import { beforeEach, afterEach } from 'vitest';

let client;

beforeEach(async () => {
  client = await pool.connect();
  await client.query('BEGIN');
});

afterEach(async () => {
  await client.query('ROLLBACK'); // undo everything this test did
  client.release();
});
\`\`\`

## Vitest and Jest Lifecycle

You want **one container per test file (or per worker)**, started in \`beforeAll\` and stopped in \`afterAll\`. Starting a container per test is far too slow.

**Vitest:**

\`\`\`typescript
import { beforeAll, afterAll, expect, test } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

let container: StartedPostgreSqlContainer;
let pool: Pool;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  pool = new Pool({ connectionString: container.getConnectionUri() });
  await pool.query(\\\`
    CREATE TABLE users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL)
  \\\`);
}, 60_000); // generous timeout: first run pulls the image

afterAll(async () => {
  await pool?.end();
  await container?.stop();
});

test('inserts and reads a user', async () => {
  await pool.query('INSERT INTO users (email) VALUES (\$1)', ['a@b.com']);
  const { rows } = await pool.query('SELECT email FROM users');
  expect(rows[0].email).toBe('a@b.com');
});
\`\`\`

The \`60_000\` ms timeout on \`beforeAll\` is important: on the very first run Docker has to pull the image, which can exceed the default five-second hook timeout. Jest is nearly identical — swap the import to \`@jest/globals\` and pass the timeout as the third argument to \`beforeAll\`:

\`\`\`typescript
import { beforeAll, afterAll, expect, test } from '@jest/globals';
// ...same body...
beforeAll(async () => {
  /* start container */
}, 60_000);
\`\`\`

For a suite spanning many files, consider a Vitest \`globalSetup\` that starts one container for the entire run and exposes its URI via an env var, trading some isolation for speed. For maximum isolation under parallelism, start one container per worker keyed off \`process.env.VITEST_WORKER_ID\` — this dovetails with the per-shard database idea in the [sharding guide](/blog/playwright-test-sharding-parallel-ci-guide).

## Container Reuse for Faster Iteration

Starting a fresh container every \`beforeAll\` is fine in CI but painful during local TDD where you run the suite repeatedly. The \`.withReuse()\` flag tells Testcontainers to keep the container alive between runs and reattach to it instead of starting a new one:

\`\`\`typescript
const container = await new PostgreSqlContainer('postgres:16-alpine')
  .withReuse()
  .start();
\`\`\`

Reuse is **opt-in at two levels** — both must be enabled. Call \`.withReuse()\` in code, *and* enable it in your environment by creating \`~/.testcontainers.properties\` with:

\`\`\`properties
testcontainers.reuse.enable=true
\`\`\`

With reuse on, the first run starts the container; subsequent runs find the existing one (matched by a hash of its configuration) and reattach in milliseconds. The trade-off is that **state persists between runs** — a user you inserted last run is still there. So when reusing, make tests resilient to existing data (use \`INSERT ... ON CONFLICT DO NOTHING\`, \`TRUNCATE\` in \`beforeAll\`, or transaction rollback per test) rather than assuming an empty database.

Reuse is a local-developer convenience. In CI you generally want a fresh container per run for a clean slate, so guard it:

\`\`\`typescript
const builder = new PostgreSqlContainer('postgres:16-alpine');
if (!process.env.CI) builder.withReuse();
const container = await builder.start();
\`\`\`

Reused containers are not stopped by \`afterAll\` automatically — they linger so the next run can reattach. Clean them up with \`docker rm -f\` or by toggling the property off when you are done.

## Performance and Startup Tips

The headline cost is image pull and boot; everything else is fast. Practical optimizations:

- **Use Alpine tags.** \`postgres:16-alpine\` is a fraction of the size of \`postgres:16\`, so the first pull is much quicker. Behavior is identical for testing purposes.
- **Pin the tag.** \`:latest\` invalidates caches and can silently change behavior. \`postgres:16-alpine\` is reproducible and stays warm in your Docker layer cache.
- **Run tablespace in RAM with tmpfs.** Postgres durability is wasted on throwaway test data. Mounting the data directory as tmpfs removes disk I/O:

\`\`\`typescript
const container = await new PostgreSqlContainer('postgres:16-alpine')
  .withTmpFs({ '/var/lib/postgresql/data': 'rw' })
  .start();
\`\`\`

- **Disable fsync for tests.** Pass startup args that trade durability for speed — perfectly safe for ephemeral databases:

\`\`\`typescript
const container = await new PostgreSqlContainer('postgres:16-alpine')
  .withCommand(['postgres', '-c', 'fsync=off', '-c', 'full_page_writes=off'])
  .start();
\`\`\`

- **One container per file, not per test.** Migrations run once; isolate per test with transaction rollback.
- **Cache the image in CI.** Pull \`postgres:16-alpine\` once and cache the Docker layers, or pre-pull it in a setup step so test startup is just boot time.

Together, tmpfs plus \`fsync=off\` plus an Alpine image typically cuts container boot to a couple of seconds after the first pull.

## Docker in CI: GitHub Actions

GitHub Actions \`ubuntu-latest\` runners ship with Docker preinstalled and running, so Testcontainers works out of the box with no \`services:\` block needed — Testcontainers manages the container itself:

\`\`\`yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      # Pre-pull so the first test's beforeAll doesn't time out on the pull.
      - name: Pre-pull Postgres image
        run: docker pull postgres:16-alpine

      - name: Run tests
        run: npm test
        env:
          # Leave reuse off in CI for a clean slate each run.
          TESTCONTAINERS_RYUK_DISABLED: false
\`\`\`

The \`docker pull\` step is the one tweak worth making — pre-pulling the image in its own step means the image is already local when the first \`beforeAll\` runs, so you avoid the pull happening inside a hook with a tight timeout. Testcontainers' Ryuk companion container handles automatic cleanup of leaked containers; leave it enabled in CI so failed runs do not leave orphans.

## Common Errors and Fixes

| Symptom | Cause | Fix |
|---|---|---|
| \`Could not find a working container runtime\` | Docker daemon not running | Start Docker Desktop/Colima; verify with \`docker ps\` |
| \`connect ENOENT /var/run/docker.sock\` | Testcontainers can't find the socket | Set \`DOCKER_HOST\`, or for Colima \`export DOCKER_HOST=unix://\$HOME/.colima/default/docker.sock\` |
| \`beforeAll\` exceeds 5000 ms and fails | Image pull on first run | Raise hook timeout to 60_000 ms; pre-pull the image in CI |
| \`port is already allocated\` | Stale leaked container holding a port | \`docker rm -f \$(docker ps -aq)\`; ensure Ryuk enabled; you don't bind 5432 yourself |
| \`pull access denied\` / pull timeout | Network/registry issue or rate limit | Pre-pull, authenticate to the registry, or mirror the image |
| Data leaks between runs | \`.withReuse()\` on with persisted state | Truncate in \`beforeAll\`, use transaction rollback, or disable reuse |
| \`role "postgres" does not exist\` | Hardcoded default creds vs container creds | Always read \`getUsername()\`/\`getConnectionUri()\`, never hardcode |

**Docker not running** is by far the most common — the container module cannot do anything without a daemon. Confirm with \`docker ps\` before debugging anything else. On Apple Silicon with Colima or Podman, the socket path differs from Docker Desktop's default, so exporting \`DOCKER_HOST\` is the usual fix. **Port conflicts** almost never come from Testcontainers itself (it maps to random free ports) but from leaked containers from a previous crashed run — clean them up and make sure Ryuk is enabled to prevent recurrence.

## Frequently Asked Questions

### Why use Testcontainers instead of mocking the database?

Mocks test that your code calls a function with certain arguments, not that your SQL is valid or that your schema matches. Typos in column names, broken JOINs, missing migrations, and Postgres-specific operators all slip through. Testcontainers runs your real queries and real migrations against the exact Postgres image you deploy, so the test exercises production behavior. The only differences are scale and data, which integration tests do not validate anyway.

### Is Testcontainers Postgres slow in tests?

The cost is mostly the one-time image pull and the per-container boot, not query execution. Start one container per test file in \`beforeAll\`, not per test, and isolate tests with transaction rollback. Use the \`postgres:16-alpine\` image, mount data on tmpfs, and pass \`fsync=off\`. With those tweaks boot is a couple of seconds, and \`.withReuse()\` makes repeated local runs reattach in milliseconds.

### How do I get the connection string from PostgreSqlContainer?

Call \`container.getConnectionUri()\`, which returns a full \`postgresql://user:pass@host:port/db\` string ready for Prisma, Drizzle, or a \`pg\` Pool. For individual pieces use \`getHost()\`, \`getPort()\`, \`getDatabase()\`, \`getUsername()\`, and \`getPassword()\`. Never hardcode port 5432 — Testcontainers maps Postgres to a random free host port to avoid collisions, and \`getPort()\` returns that mapped value.

### How do I run migrations against a Testcontainers database?

Get the connection URI from the started container, then run your normal migration tool against it inside \`beforeAll\`. With Drizzle call \`migrate(db, { migrationsFolder })\`; with Prisma run \`npx prisma migrate deploy\` with \`DATABASE_URL\` set to the container URI; with raw \`pg\` read a schema SQL file and execute it. Running migrations this way also validates that the migrations themselves actually work.

### What does .withReuse() do and when should I use it?

\`.withReuse()\` keeps the container alive between test runs and reattaches to it instead of starting a fresh one, making repeated local runs near-instant. It requires both the code flag and \`testcontainers.reuse.enable=true\` in \`~/.testcontainers.properties\`. State persists between runs, so make tests resilient to existing data. Use it locally for fast TDD, but disable it in CI where you want a clean slate each run.

### Does Testcontainers work in GitHub Actions?

Yes. The \`ubuntu-latest\` runner ships with Docker installed and running, so Testcontainers works with no extra \`services\` configuration — it manages the container itself. The one recommended tweak is a \`docker pull postgres:16-alpine\` step before tests so the image is local and the first \`beforeAll\` does not time out on the pull. Leave the Ryuk cleanup container enabled to avoid orphaned containers.

### Why does Testcontainers fail with "Could not find a working container runtime"?

The Docker daemon is not running or Testcontainers cannot reach its socket. Start Docker Desktop, Colima, or Docker Engine and confirm with \`docker ps\`. On Apple Silicon using Colima or Podman, the socket lives at a non-default path, so export \`DOCKER_HOST\` to point at it, for example \`unix://\$HOME/.colima/default/docker.sock\`. Testcontainers needs a live Docker daemon for everything it does.

### Should I use one container per test or per suite?

Per suite (or per worker), never per test — starting a container per test is far too slow. Start one container in \`beforeAll\`, run migrations once, then isolate individual tests by wrapping each in a transaction you roll back in \`afterEach\`. Under parallel runners, start one container per worker keyed off the worker ID so concurrent tests get private databases without colliding.

## Conclusion

Testcontainers ends the false trade-off between fast tests and trustworthy tests. By spinning up the exact Postgres image you ship, running your real migrations against it, and tearing it down afterward, you get integration tests with near-production fidelity and per-suite isolation that mocks and SQLite can never match. Start one container per file in \`beforeAll\`, read \`getConnectionUri()\` into your pg, Prisma, or Drizzle client, isolate tests with transaction rollback, and tune startup with an Alpine image, tmpfs, and \`fsync=off\`. In CI, pre-pull the image and let Ryuk handle cleanup.

Want more battle-tested testing patterns you can drop straight into your project? Explore the QA skills directory at [/skills](/skills) for ready-to-use database fixtures, CI templates, and integration-test setups — and if your suite is getting slow, combine per-worker containers with the parallelism patterns in the [Playwright test sharding and parallel CI guide](/blog/playwright-test-sharding-parallel-ci-guide).
`,
};
