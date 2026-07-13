import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Create a PostgreSQL Database per Test with Testcontainers',
  description:
    'Create a PostgreSQL database per test with Testcontainers, safe parallel naming, real migrations, connection cleanup, and fast suite-level container reuse.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Create a PostgreSQL Database per Test with Testcontainers

Test A commits an order, Test B deletes all orders in \`beforeEach\`, and the result depends on which worker reaches PostgreSQL first. Both tests are “isolated” only by convention. Giving each test its own database turns that convention into a server-enforced namespace: tables, sequences, extensions, and migration state cannot leak across database boundaries.

Starting a PostgreSQL container for every test gives strong isolation but usually spends more time booting servers than exercising code. A better balance for many Node suites is one Testcontainers PostgreSQL instance per test process, plus one newly created database per test. The container provides a real supported PostgreSQL engine; a small fixture provisions unique databases, applies migrations, hands the application a connection URI, closes pools, and drops the database afterward.

## Pick the isolation boundary before writing hooks

PostgreSQL offers several isolation techniques, and they protect against different leak paths. Transaction rollback is fast but fails when application code opens another connection or commits independently. Schema-per-test separates object names but requires every query, extension, and migration tool to honor \`search_path\`. Database-per-test provides a broad boundary while sharing one server process. Container-per-test also separates server settings, but at greater startup cost.

| Boundary | Separates tables and sequences | Handles committed multi-connection work | Separates server configuration | Typical cost |
|---|---:|---:|---:|---|
| Rollback transaction | Within one connection | No | No | Lowest |
| Schema per test | Yes, with correct search path | Usually | No | Low |
| Database per test | Yes | Yes | No | Moderate provisioning |
| PostgreSQL container per test | Yes | Yes | Yes | Highest startup and resource use |

Choose database-per-test when the system uses pools, background consumers, advisory locks, migrations, or explicit commits that make transaction wrapping unrealistic. Choose a container per test only when the test changes cluster-level settings, PostgreSQL versions, roles, authentication, replication, or extensions whose installation cannot be shared safely.

The phrase “one container per suite” needs a precise scope. Vitest may run files in multiple worker processes. Each process can start its own container unless you centralize setup. That is still correct, but resource use differs from one container for an entire CI job. Measure the actual runner topology before optimizing.

## Start PostgreSQL once, administer through the postgres database

The Testcontainers Node PostgreSQL module exposes \`PostgreSqlContainer\`. After \`start()\`, the returned container provides host, mapped port, username, password, database, and connection URI getters. Pin a PostgreSQL image version that matches production's major version; floating tags make failures hard to reproduce.

This Vitest fixture starts a server for the file, connects to the administrative \`postgres\` database, creates a randomly named test database, runs a real migration function, and returns a URI. Identifiers cannot be parameter placeholders, so the helper permits only a generated lowercase hexadecimal name and quotes it defensively.

\`\`\`ts
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from '../src/db/migrate';

let container: StartedPostgreSqlContainer;
let admin: Client;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16.4-alpine')
    .withDatabase('postgres')
    .withUsername('test_admin')
    .withPassword('test_password')
    .start();

  admin = new Client({ connectionString: container.getConnectionUri() });
  await admin.connect();
});

afterAll(async () => {
  await admin.end();
  await container.stop();
});

function quoteGeneratedDatabase(name: string): string {
  if (!/^test_[a-f0-9]{32}$/.test(name)) throw new Error('Unsafe database identifier');
  return \`"\${name}"\`;
}

export async function createTestDatabase() {
  const name = \`test_\${randomUUID().replaceAll('-', '')}\`;
  await admin.query(\`CREATE DATABASE \${quoteGeneratedDatabase(name)} TEMPLATE template0\`);

  const url = new URL(container.getConnectionUri());
  url.pathname = \`/\${name}\`;
  await migrate(url.toString());
  return { name, connectionString: url.toString() };
}

export async function dropTestDatabase(name: string) {
  await admin.query(
    \`SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()\`,
    [name],
  );
  await admin.query(\`DROP DATABASE IF EXISTS \${quoteGeneratedDatabase(name)}\`);
}
\`\`\`

\`migrate\` represents the application's actual migration entry point, not a Testcontainers method. It should resolve only after the schema is ready and close any connection it owns. Using the same migrations deployed to production catches ordering, SQL dialect, extension, constraint, and rollback assumptions that an ORM's in-memory substitute cannot.

\`TEMPLATE template0\` creates a pristine database using PostgreSQL's standard untouched template. If your application requires locale or encoding options, specify and test them deliberately. Do not interpolate user-controlled identifiers into this helper; generated names make a narrow validator practical.

## Give every test a lifecycle object, not a global URL

The fixture should make cleanup difficult to forget. A helper that returns only a string encourages callers to lose the database name or leave a pool open. Return an object containing the connection string and a cleanup function, or wrap provisioning in a callback with \`try/finally\`.

The application must build its pool after it receives the per-test URL. Import-time singleton pools are a common obstacle: the first test initializes \`DATABASE_URL\`, and every later test silently reuses that pool. Prefer an application factory that accepts configuration and dependencies.

\`\`\`ts
import { Pool } from 'pg';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { createApi } from '../src/api';
import { createTestDatabase, dropTestDatabase } from './postgres-fixture';

let database: Awaited<ReturnType<typeof createTestDatabase>>;
let pool: Pool;

beforeEach(async () => {
  database = await createTestDatabase();
  pool = new Pool({ connectionString: database.connectionString, max: 4 });
});

afterEach(async () => {
  await pool.end();
  await dropTestDatabase(database.name);
});

test('two requests for the same idempotency key create one payment', async () => {
  const api = createApi({ pool });
  const payload = { orderId: 'order_204', amountMinor: 1299, currency: 'GBP' };

  const [first, second] = await Promise.all([
    api.inject({ method: 'POST', url: '/payments', headers: { 'idempotency-key': 'k-204' }, payload }),
    api.inject({ method: 'POST', url: '/payments', headers: { 'idempotency-key': 'k-204' }, payload }),
  ]);

  expect([first.statusCode, second.statusCode].sort()).toEqual([200, 201]);
  const result = await pool.query(
    'SELECT order_id, amount_minor, currency FROM payments WHERE order_id = $1',
    ['order_204'],
  );
  expect(result.rows).toEqual([
    { order_id: 'order_204', amount_minor: 1299, currency: 'GBP' },
  ]);
});
\`\`\`

This scenario only makes sense against a database capable of enforcing the production uniqueness rule under concurrency. A mocked repository can prove how the service reacts to a simulated conflict, but it cannot prove the migration created the correct unique index or that two PostgreSQL transactions race as expected.

If a test fails before \`pool\` is assigned, unconditional teardown may mask the original error. Production fixtures should track initialization stages and clean up only resources that exist. A callback-style fixture naturally scopes those resources and can preserve the database on failure when a debug flag is set.

## Parallel execution is a naming and capacity problem

Random UUID-based names prevent collisions across files, workers, and retry attempts. Worker numbers alone are insufficient because one worker can execute multiple tests concurrently, and retries can overlap during abnormal termination. Keep names below PostgreSQL's identifier length limit and avoid test titles, which may contain spaces, Unicode, quotes, or secrets.

Database isolation does not create unlimited capacity. All tests still share CPU, memory, disk, WAL, connection limits, and container networking. A suite with 20 concurrent databases and pools of 10 connections can ask for 200 sessions before migration clients are counted. Set small test pool sizes and tune test-worker counts from observed resource usage.

| Parallel failure | Evidence | Fixture response |
|---|---|---|
| Database name collision | \`database already exists\` | Use UUID entropy, not truncated timestamps |
| Connection exhaustion | \`too many clients\` | Reduce pool max or worker count |
| Drop reports active sessions | Database remains after teardown | Close app pool, terminate stragglers, then drop |
| Migration dead time | Workers wait during setup | Use a prepared template or snapshot only after measuring |
| Host overload | All tests slow together | Cap concurrency instead of raising timeouts |

Avoid changing global server parameters in ordinary tests. \`ALTER SYSTEM\`, shared roles, and shared extensions reintroduce cross-test state even when databases differ. Tests that need those operations belong in a separately isolated container.

## Dropping a database requires closing every connection

PostgreSQL refuses to drop a database with active sessions. Call \`pool.end()\` and stop background workers before cleanup. Terminating remaining backends is a pragmatic test-only safety net, not a substitute for application shutdown. If termination is always necessary, the suite is revealing a lifecycle bug worth fixing.

Cleanup should connect through a different database, usually \`postgres\`. A client connected to the target cannot drop its own database. Keep the administrative connection private to the fixture and never expose its elevated credentials to application code.

When a test times out, normal \`afterEach\` hooks may still run, but a killed CI process cannot clean anything. Container teardown removes all remaining databases at job end. That containment is a major advantage over running these tests against a shared external PostgreSQL server.

The [Testcontainers PostgreSQL guide for Node](/blog/testcontainers-postgres-node-guide) covers basic startup, connection getters, wait behavior, and image selection. The per-test design adds a second lifecycle inside the container and therefore needs explicit ownership of both layers.

## Migration speed without schema drift

Applying the entire migration history to every test database is the clearest fidelity baseline. Start there and measure. If it dominates runtime, optimize without replacing the schema with hand-written \`CREATE TABLE\` shortcuts.

One option is a prepared template database. Run migrations once into a database, close every connection, then create test databases with \`CREATE DATABASE new_name TEMPLATE prepared_name\`. PostgreSQL copies the template's state. The template must not have active connections, and tests must never connect to or modify it.

Another option is Testcontainers' PostgreSQL snapshot support, which can restore container database state. Snapshot semantics operate at a different scope from creating multiple databases, so choose one lifecycle model and understand its concurrency constraints. Do not set the container's working database to \`postgres\` if using the module's snapshot workflow, because snapshot operations need the system database to drop and restore the connected database.

Prepared templates can hide migration nondeterminism if built only once. Retain at least one CI job that migrates from empty on every relevant change. Record schema preparation time separately from test time before accepting the complexity.

## Extensions, roles, and cluster-scoped behavior

\`CREATE EXTENSION\` is issued per database for many extensions, even though extension files exist at the server level. Include those statements in migrations and let every test database exercise them. The chosen image must contain the required extension binaries; a plain PostgreSQL image cannot simulate a production image with PostGIS simply through configuration.

Roles are cluster-wide. Creating a role named \`app_reader\` in every test races because all databases share the cluster. Either create shared roles once during container setup, generate unique role names, or move role-specific tests to their own containers. Similar caution applies to tablespaces, replication slots, and server settings.

Database names are isolation boundaries for application data, not complete PostgreSQL clusters. Make that distinction explicit in the test plan so a security test of grants is not accidentally run under the all-powerful container user.

## Diagnose failures while preserving useful evidence

Log the generated database name and container ID at debug level, but do not print passwords in normal output. On failure, query migration version, active sessions, and a bounded list of relevant rows before cleanup if that aids diagnosis. Avoid dumping whole databases that may contain synthetic-but-sensitive fixtures.

A local opt-in such as \`KEEP_TEST_DATABASE=1\` can skip the drop and print a safe connection hint while the container remains alive. It should be disabled in CI, where retained resources create confusion and the process may not remain available anyway.

Differentiate failures by phase: container startup, database creation, migration, application assertion, pool shutdown, and database drop. Wrapping all of them in “database setup failed” throws away the primary value of a structured fixture.

The broader [database testing automation guide](/blog/database-testing-automation-guide) helps decide which constraints, migrations, query plans, and concurrency behaviors deserve integration coverage. Per-test databases are infrastructure for those tests, not a reason to turn every domain unit test into an integration test.

## An isolation review for the finished fixture

Before rolling the pattern across a repository, confirm that:

- The PostgreSQL image major version matches the supported production major.
- Test names never become SQL identifiers.
- Database identifiers are unique across workers and retries.
- Identifiers are validated and quoted, while values use query parameters.
- The application pool is constructed after provisioning.
- All pools and workers close before the database is dropped.
- Migrations are the production migration path, not a test-only schema.
- Cluster-scoped roles or settings are not mutated concurrently.
- Worker count and pool sizes fit the server's session capacity.
- Container shutdown remains the final cleanup boundary.

The resulting tests can commit, retry, open multiple connections, and execute real constraints without negotiating shared table cleanup. That is the practical payoff: isolation is established before application code runs rather than repaired after each test.

## Treat fixture performance as a measured budget

Record container startup, database creation, migration, test execution, and cleanup as separate timings during a representative CI run. Optimizing the largest phase is more effective than enabling container reuse blindly. Docker image pull time may dominate a cold runner, while migration history may dominate a warm developer machine.

Testcontainers can reuse containers only under specific configuration and lifecycle choices, but reuse across unrelated runs weakens the clean-server assumption. Prefer the normal disposable lifecycle in CI. Cache or pre-pull the pinned image through runner infrastructure when image transfer is the bottleneck, without turning a long-lived database into shared test state.

Database creation itself is usually much cheaper than server startup, but copying a large prepared template consumes storage and I/O. Keep seed data minimal. Tests should insert the records that make their scenario legible rather than cloning a production-sized catalog into every database. Use a separate performance dataset for query-plan or load tests.

Measure teardown too. Slow drops often reveal leaked sessions or background jobs. Adding a force-termination query can make the clock green while concealing that the application never shuts down. Log the names and application names of remaining sessions in a diagnostic build, then fix lifecycle ownership.

Set a clear suite budget, for example a locally acceptable setup latency and a CI maximum derived from pipeline goals. These are engineering targets, not universal statistics. Revisit them when the migration count, PostgreSQL image, runner class, or worker topology changes. A fixture that was efficient at fifty migrations may need a prepared template at five hundred, but the optimization should follow evidence. Publish phase timings occasionally so slow fixture growth is visible before developers start bypassing integration tests.

## Frequently Asked Questions

### Is one PostgreSQL container per test more isolated than one database per test?

Yes, because it also isolates roles, server settings, extensions installed at the image or cluster level, and resource state. Most CRUD and migration tests do not need that extra boundary, so shared-server databases are usually faster.

### Can CREATE DATABASE use a $1 parameter for the database name?

No. PostgreSQL parameters represent data values, not identifiers. Generate the name internally, validate it against a strict allowlist, and quote it as an identifier.

### Why must the pool close before DROP DATABASE?

PostgreSQL will not drop a database while sessions are connected. End application pools and background workers first; termination from an admin connection is a test cleanup fallback for stragglers.

### Should migrations run for every test database?

That is the best fidelity baseline. If measured migration time is excessive, clone a fully migrated template database while retaining separate coverage that migrates cleanly from empty.

### Does per-test database isolation make test transactions unnecessary?

It removes the need to roll back solely for cross-test cleanup. Tests should still exercise transactions when atomicity, isolation levels, deadlocks, retries, or application behavior depend on them.
`,
};
