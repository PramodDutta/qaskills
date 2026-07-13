import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Worker-Scoped Database Fixture per Worker',
  description:
    'Build a Playwright worker-scoped database fixture that isolates parallel tests, cleans up reliably, and stays predictable across retries and shards.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Playwright Worker-Scoped Database Fixture per Worker

Four Playwright workers start together, all insert a user named \`alice\`, and one test deletes the row while another is still asserting against it. The application is behaving correctly. The suite is not. A shared test database has turned independent specifications into concurrent clients of mutable state.

The durable fix is not a longer cleanup hook. Give each Playwright worker its own database, make the database name derivable from Playwright's worker identity, and expose the resulting connection information through a worker-scoped fixture. Tests within one worker may still need row-level isolation, but workers can no longer erase or overwrite one another's data.

This guide builds that fixture against PostgreSQL with the real Playwright Test fixture API and the \`pg\` client. It also covers retries, sharding, schema creation, teardown, connection pools, and the operational limits that appear once a suite creates many databases concurrently.

## The isolation boundary is the worker process

Playwright Test runs test files in worker processes. A worker is an operating-system process with its own browser and fixture lifecycle. A worker-scoped fixture is initialized once for that process, then reused by every test assigned to it. That makes the scope a good match for resources that are expensive to provision yet unsafe to share across workers.

There are two worker identifiers worth distinguishing:

| Playwright value | Meaning | Suitable database use |
|---|---|---|
| \`workerInfo.workerIndex\` | Unique process index, changed when a failed worker restarts | Process-level logging and diagnosis |
| \`workerInfo.parallelIndex\` | Parallel worker index, reused when a failed worker restarts | Naming a per-parallel-slot database |
| \`testInfo.retry\` | Attempt number for a particular test | Row or transaction naming, not worker provisioning |
| \`testInfo.project.name\` | Current Playwright project | Separating browser or environment projects when they run concurrently |

Playwright documents \`parallelIndex\` as the index from zero to \`workers - 1\`, and a restarted worker keeps the same parallel index. That behavior is useful for a database slot: a crashed worker can reconnect to the same named database after Playwright starts its replacement. By contrast, \`workerIndex\` is unique for a process and changes after restart. If a process-specific database is used, a failed run can leave an unreachable orphan unless teardown and later garbage collection are exceptionally careful.

The fixture should therefore model a worker slot, not a test attempt. Put per-test data below that boundary.

## Provisioning PostgreSQL without racing sibling workers

PostgreSQL creates a database from a template. \`CREATE DATABASE\` cannot run inside a transaction, and the connection issuing it must be attached to a different database, normally \`postgres\`. Identifiers also cannot be supplied as ordinary query parameters. Database names must be generated from trusted internal values and quoted safely.

The following fixture creates a database for each project and parallel index, applies a SQL schema, supplies a \`pg.Pool\`, and removes the database after the worker finishes. The administrative URL is expected in \`TEST_DATABASE_URL\`, for example \`postgresql://postgres:postgres@127.0.0.1:5432/postgres\`.

\`\`\`ts
// tests/fixtures/database.ts
import { test as base } from '@playwright/test';
import { Client, Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

type WorkerFixtures = {
  db: Pool;
  databaseName: string;
};

function quoteIdentifier(value: string): string {
  return '"' + value.replaceAll('"', '""') + '"';
}

function safeProjectName(projectName: string): string {
  const readable = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24);
  const hash = createHash('sha256').update(projectName).digest('hex').slice(0, 8);
  return \`\${readable}_\${hash}\`;
}

export const test = base.extend<{}, WorkerFixtures>({
  databaseName: [
    async ({}, use, workerInfo) => {
      const runId = process.env.TEST_RUN_ID ?? 'local';
      const project = safeProjectName(workerInfo.project.name);
      const name = \`pw_\${runId}_\${project}_\${workerInfo.parallelIndex}\`;
      await use(name);
    },
    { scope: 'worker' },
  ],

  db: [
    async ({ databaseName }, use) => {
      const adminUrl = process.env.TEST_DATABASE_URL;
      if (!adminUrl) throw new Error('TEST_DATABASE_URL is required');

      const admin = new Client({ connectionString: adminUrl });
      await admin.connect();
      const identifier = quoteIdentifier(databaseName);

      try {
        await admin.query(\`DROP DATABASE IF EXISTS \${identifier} WITH (FORCE)\`);
        await admin.query(\`CREATE DATABASE \${identifier}\`);
      } finally {
        await admin.end();
      }

      const workerUrl = new URL(adminUrl);
      workerUrl.pathname = \`/\${databaseName}\`;
      const pool = new Pool({ connectionString: workerUrl.toString(), max: 5 });
      const schema = await readFile('tests/fixtures/schema.sql', 'utf8');
      await pool.query(schema);

      try {
        await use(pool);
      } finally {
        await pool.end();
        const cleanup = new Client({ connectionString: adminUrl });
        await cleanup.connect();
        try {
          await cleanup.query(\`DROP DATABASE IF EXISTS \${identifier} WITH (FORCE)\`);
        } finally {
          await cleanup.end();
        }
      }
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
\`\`\`

The two generic arguments to \`extend\` matter. The first describes test-scoped fixtures and is empty here. The second describes worker-scoped fixtures. The tuple syntax supplies both the implementation and \`{ scope: 'worker' }\`. Playwright rejects a worker fixture that depends on a test-scoped fixture, which prevents an inverted lifecycle.

The deliberate \`DROP DATABASE IF EXISTS ... WITH (FORCE)\` before creation supports a replacement process using the same parallel slot. \`WITH (FORCE)\` is available in supported modern PostgreSQL releases and terminates remaining connections to the target database. If the test environment uses an older release, explicitly call \`pg_terminate_backend\` from the admin connection instead.

## Pointing the application at the worker database

A database fixture is useful only if the application under test uses the same database. For an in-process API started by a test helper, pass the worker URL directly. For a single external web server shared by all workers, per-worker databases require request-level routing, separate application instances, or a tenancy mechanism. An environment variable set inside a worker cannot reconfigure a server process that was launched once before the workers existed.

This topology decision is often missed:

| Application topology | How the worker selects its database | Main constraint |
|---|---|---|
| API started inside the worker fixture | Pass the worker connection string at process startup | Startup cost is paid per worker |
| Shared API with test tenant header | Map a trusted test-only tenant key to a database | Test routing must be impossible in production |
| Shared API with schema-based tenancy | Set tenant/schema from authenticated test context | SQL search path and pooling require care |
| Browser talks directly to one fixed staging API | Cannot select a per-worker database safely | Use isolated accounts or deploy one stack per shard |

For a Node application that can be launched per worker, add another worker fixture which depends on \`databaseName\`, constructs the URL, spawns the server on an available port, and yields its base URL. Playwright's built-in \`webServer\` configuration is run-level, so it is not a substitute for a worker-specific server.

Never mutate \`process.env.DATABASE_URL\` in a test-scoped hook and assume it isolates a previously imported application. Modules may have initialized pools during import, and every test in the worker shares the same environment object. Prefer explicit dependency injection or start the application after the worker database is known.

## Keeping tests independent inside one worker

Worker isolation eliminates cross-process collisions. It does not make tests within the same worker independent. Playwright normally executes tests in a file in order, and a worker can execute several files. State left by one test is visible to the next.

There are three reasonable inner isolation strategies:

| Strategy | Reset point | Strength | Cost and limitation |
|---|---|---|---|
| Delete or truncate mutable tables | Before each test | Simple and visible | Foreign keys and sequences need explicit handling |
| Unique records per test | During data creation | Supports parallel tests in one worker | Old rows accumulate and assertions must be scoped |
| Transaction rollback | After each test | Fast for repository-level tests | Browser requests use other connections, so they do not share the transaction |

For browser tests, truncation or unique test data is usually more honest than wrapping the fixture connection in a transaction. The browser sends HTTP requests to an application pool. Rolling back a transaction on the test's \`PoolClient\` does nothing to commits made by the application on another connection.

A small automatic test fixture can truncate known tables before each test while retaining worker-level provisioning:

\`\`\`ts
// Add to the fixture types and base.extend call.
type TestFixtures = {
  resetDatabase: void;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // databaseName and db worker fixtures omitted here
  resetDatabase: [
    async ({ db }, use) => {
      await db.query(
        'TRUNCATE TABLE order_items, orders, users RESTART IDENTITY CASCADE',
      );
      await use();
    },
    { auto: true },
  ],
});
\`\`\`

Because \`resetDatabase\` has the default test scope and \`auto: true\`, it runs before every test that uses this extended \`test\`, even when the test does not mention the fixture. Keep the table list explicit. Dynamically truncating every table can erase migration metadata or reference records that the schema setup intentionally installed.

Fixtures become much easier to reason about when test files import \`test\` and \`expect\` from one project fixture module. A stray import from \`@playwright/test\` silently bypasses automatic fixtures.

## Retries, fully parallel files, and serial groups

After a test failure, Playwright discards the worker process and starts another. The replacement process runs worker fixture setup again. Naming by \`parallelIndex\` plus idempotent recreation means it receives a clean database rather than the failed process's residue.

That clean restart has a diagnostic consequence: a retry does not see the exact database state that caused the first attempt to fail. Preserve evidence before teardown if state is important. A failure hook can query selected tables and attach JSON to the test result, but avoid dumping secrets or entire production-like datasets.

Fully parallel mode allows tests from one file to run in separate workers. The fixture still isolates them because each process has a different parallel index. \`test.describe.configure({ mode: 'serial' })\` keeps a group in one worker, but serial ordering should not be used as a substitute for cleanup. A serial group also causes later tests to be skipped after a failure, which changes the signal provided by the suite.

The [advanced Playwright fixtures guide](/blog/playwright-fixtures-advanced-guide) is useful when composing authentication, server, and data fixtures. For capacity planning across projects and CI machines, the [Playwright parallel execution and sharding guide](/blog/playwright-parallel-sharding-execution-guide) explains the process model around this database pattern.

## Making names safe across CI shards

Parallel indexes are unique only inside one Playwright invocation. Two CI jobs can both create \`pw_local_chromium_0\`. Supply a run identifier that is unique across concurrent jobs, then keep it short enough for PostgreSQL's 63-byte identifier limit.

Good inputs include a CI run ID plus shard number. Sanitize them before interpolation, or hash them. Do not place branch names directly into SQL identifiers because branch names can contain punctuation and can exceed the limit. More importantly, never accept a database identifier from test input or an HTTP request.

A practical naming shape is:

\`\`\`text
pw_<run-hash>_<project-hash>_<parallel-index>
\`\`\`

Hashing makes collisions unlikely, not mathematically impossible. Store the original run, project, and slot as labels in logs. When CI is cancelled before fixture teardown, a scheduled cleanup job can list databases with the \`pw_\` prefix and remove only those older than a chosen retention threshold. PostgreSQL does not record database creation time directly, so an administrative registry table or CI metadata is safer than guessing from the name.

## Schema setup choices that affect suite speed

Replaying all production migrations gives the highest fidelity and catches migrations that cannot build a fresh database. It can also dominate startup time when every worker repeats years of migration history. Loading a schema snapshot is quicker, but it no longer proves that migrations work from the supported baseline.

Separate the purposes. Run migration-chain verification in a focused job. For broad browser coverage, provision from a versioned schema snapshot and apply only migrations added after that snapshot. Refresh the snapshot intentionally and review its diff.

PostgreSQL template databases can clone a prepared schema quickly via \`CREATE DATABASE name TEMPLATE template_name\`. That optimization requires the template to have no other sessions, and every worker receives an exact physical copy. It is effective for large schemas, but operationally more involved than applying SQL. Treat the template as immutable during a run.

Do not use \`pool.query(schemaText)\` if the schema file must be executed by a migration tool with statement parsing, bookkeeping, or nontransactional operations. Call the application's actual migration command or library. The example works for an ordinary SQL fixture but is not a universal migration runner.

## Connection budgets and teardown failures

Per-worker databases do not create separate PostgreSQL servers. All pools still consume connections from one instance. Eight workers with a pool maximum of five can reserve up to forty application-side connections, plus admin and migration connections. Multiple projects and shards multiply that number.

Choose a small test pool. Browser workloads rarely need the production pool size. Monitor \`pg_stat_activity\` when diagnosing intermittent \`too many clients\` failures, and include the application name in connection settings if the driver supports it.

Teardown waits until tests using the fixture finish, then \`pool.end()\` closes idle and checked-out clients as they are returned. A leaked client can make shutdown hang. Always release clients obtained with \`pool.connect()\` in a \`finally\` block. Forced database deletion is a final containment measure, not permission to leak connections.

If setup fails after database creation but before \`use(pool)\`, code placed only after \`use\` may not execute. Production fixture code should wrap the complete post-creation sequence in a broad \`try/finally\`, track whether the pool exists, close it conditionally, and attempt database removal. Preserve the original setup exception if cleanup also fails, while logging the cleanup failure with the database name.

## When a schema per worker is a better boundary

Creating a database requires elevated privileges that managed PostgreSQL services may withhold. A schema per worker can operate with narrower grants and provisions faster. Set a unique schema and configure the application connection's \`search_path\`. However, extensions, database-level settings, and objects outside the schema remain shared. Connection pools must reset session state correctly, and unqualified queries are essential.

Containers provide a stronger boundary by creating a PostgreSQL server per worker, including independent settings and extensions. They cost more memory and startup time. A single transaction is the lightest boundary for in-process data-access tests, but it cannot encompass a browser application's separate connections.

Choose based on the failure mode being contained, not on fixture fashion:

| Boundary | Isolates data | Isolates DB settings | Typical privilege need | Best fit |
|---|---:|---:|---:|---|
| Transaction per test | Yes, for one connection graph | No | Ordinary DML | Repository and service tests |
| Schema per worker | Mostly | No | Schema create/drop | Restricted shared instances |
| Database per worker | Yes | Partly | Database create/drop | Browser suites on a dedicated server |
| Container per worker | Yes | Yes | Container runtime | Extension or configuration-sensitive tests |

## Reviewing the fixture as production infrastructure

Test provisioning code deserves operational review. Check that database names come only from sanitized runner metadata, credentials point to a disposable PostgreSQL instance, and the admin role cannot reach production. Put a positive safety check in front of destructive SQL, such as requiring a known host and database suffix. A mistaken environment variable combined with \`DROP DATABASE ... WITH (FORCE)\` is a serious incident.

Log the run ID, project, parallel index, and final database name at setup. On failure, those fields connect Playwright output to PostgreSQL activity. Measure provisioning duration separately from test duration. When setup becomes slow, evidence will show whether creation, migrations, seed data, or application startup is responsible.

Finally, test the fixture itself. Run two workers that create the same logical record, prove each sees one row, deliberately fail one process, and confirm its replacement starts clean. Cancel a local run and exercise the orphan cleanup procedure. Isolation is a property to verify, not an assumption created by a fixture declaration.

## Frequently Asked Questions

### Should the database name use \`workerIndex\` or \`parallelIndex\`?

Use \`parallelIndex\` for a reusable worker slot. A replacement worker after failure retains that parallel index, while its \`workerIndex\` changes. Include a CI run identifier and project identifier so separate invocations do not collide.

### Can a worker-scoped fixture depend on Playwright's \`page\` fixture?

No. \`page\` is test-scoped, and a longer-lived worker fixture cannot depend on a shorter-lived test fixture. Start worker resources independently, then let test-scoped fixtures depend on them.

### Why not begin a transaction before each browser test and roll it back afterward?

The application normally handles browser requests through its own database connections. Those writes are outside the test connection's transaction. Transaction rollback works only when all relevant operations share the same transaction context.

### How do I inspect a failed worker database before it is dropped?

Attach a targeted snapshot of relevant rows during failure handling, or add an opt-in environment switch that retains failed databases in an isolated development environment. Never enable indefinite retention by default in shared CI, and ensure retained databases have a cleanup policy.

### Does this pattern work with Playwright sharding?

Yes, provided the name includes a run-wide unique value and the shard identity. A parallel index is local to each Playwright process, so it is insufficient by itself when shards share one PostgreSQL server.
`,
};
