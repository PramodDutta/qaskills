import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Isolation per Worker Database: A Parallel-Safe Design',
  description: 'Implement playwright test isolation per worker database with restart-safe naming, worker fixtures, migrations, cleanup, and diagnostics for reliable parallel runs.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Test Isolation per Worker Database: A Parallel-Safe Design

The safest playwright test isolation per worker database pattern assigns one database namespace to each concurrent Playwright slot, provisions it in a worker-scoped fixture, points that worker's application instance at the database, and removes it after the worker finishes. Use \`parallelIndex\` for a restart-stable slot identifier, add a run and shard namespace for cross-process uniqueness, and give every test ownership of the rows it creates.

Per-worker isolation prevents workers from deleting, updating, or discovering one another's data while keeping database setup far cheaper than creating a database for every test. It does not eliminate test-level cleanup. Tests within the same worker usually reuse that worker process and database, so each case must still begin from a known state or use unique records.

This guide builds the topology with Playwright Test and PostgreSQL-oriented TypeScript examples. The lifecycle applies to other relational databases, although database creation, connection termination, and cloning commands differ. If your suite focuses on HTTP contracts rather than a browser, the [Supertest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide) provides the complementary request-layer design.

## Choose the isolation boundary from the collision you need to stop

Before writing fixtures, identify where tests interfere. A shared database can be reliable when every test uses immutable reference data and unique records. Per-worker databases become valuable when setup and cleanup are broad, application queries are difficult to namespace, or parallel files exercise the same uniqueness constraints.

| Isolation boundary | Setup cost | Parallel safety | State reset responsibility | Good fit |
|---|---:|---:|---|---|
| One database for the run | Low | Low without strict data namespacing | Every test or suite | Read-heavy smoke checks |
| One schema per worker | Moderate | High if search path is controlled | Tests inside worker | PostgreSQL suites with schema-aware migrations |
| One database per worker | Moderate to high | High | Tests inside worker | Integration and browser suites with broad SQL behavior |
| One database per test | Very high | Highest | Fixture teardown | Small, destructive migration checks |
| Transaction rollback per test | Low after connection setup | High only within one connection boundary | Fixture rollback | Repository tests without multi-process behavior |

A browser flow usually crosses multiple connections: browser to application, application to pool, perhaps a job worker to another pool. Wrapping the test process in a transaction does not roll back writes made through those other connections. Per-worker databases put the isolation boundary below all connections used by that worker's application instance.

Do not choose a database solely because "parallel tests are flaky." Confirm collision evidence first: duplicate-key errors, missing records after another test's cleanup, counts that vary with worker count, or audit rows owned by a different case. Network races and UI synchronization problems require different fixes.

## Understand Playwright worker identity across failures

Playwright Test executes tests in worker processes. Two identifiers matter. \`workerIndex\` identifies a specific worker process and changes when Playwright starts a replacement after a failure. \`parallelIndex\` represents a parallel slot and remains the same for the replacement. Both are available through worker information, and corresponding environment variables are documented.

| Event | \`parallelIndex\` | \`workerIndex\` | Database implication |
|---|---:|---:|---|
| Initial worker starts | Slot number from zero | Unique process number | Provision slot database |
| Another worker runs concurrently | Different slot | Different process | Must use another database |
| Worker is replaced after failure | Same slot | New unique process number | Reuse or recreate the slot database deliberately |
| Separate CI shard starts | Can repeat | Can repeat in another process | Add shard and run namespace |
| Another Playwright project runs | Slot may overlap depending on execution | Process identity differs | Include project identity if databases differ |

For a fixed pool of databases, \`parallelIndex\` is the more useful suffix because a replacement worker maps back to the same slot. Using only \`workerIndex\` can orphan a database after a failed test and create a fresh one for the replacement. That may hide the residue you needed to diagnose and steadily consume database resources.

Playwright's official parallelism documentation describes the lifecycle at https://playwright.dev/docs/test-parallel. Recheck that reference when upgrading or designing around worker behavior.

## Design a collision-proof database name

A local run with four workers can use names such as \`pw_local_chromium_0\` through \`pw_local_chromium_3\`. CI needs more scope because separate jobs and shards can reach the same database server. Build names only from controlled components:

- A fixed test prefix.
- A CI run identifier or local developer namespace.
- A shard or job identifier when several processes run concurrently.
- A normalized Playwright project name.
- The parallel slot index.

Database identifiers have engine-specific length and character constraints. Normalize untrusted environment values, cap length, and add a stable digest when truncation could cause collisions. Never interpolate a raw branch name or pull-request title into administrative SQL.

The following helper permits only lowercase letters, digits, and underscores after normalization:

\`\`\`ts
import { createHash } from 'node:crypto';

function segment(value: string, fallback: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const compact = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '');
  return compact || fallback;
}

export function workerDatabaseName(input: {
  runId: string;
  shardId: string;
  projectName: string;
  parallelIndex: number;
}): string {
  const readable = [
    'pw',
    segment(input.runId, 'local'),
    segment(input.shardId, 'one'),
    segment(input.projectName, 'default'),
    String(input.parallelIndex),
  ].join('_');
  const digest = createHash('sha256').update(readable).digest('hex').slice(0, 8);
  return [readable.slice(0, 48), digest].join('_');
}
\`\`\`

The digest is not a security control. It only reduces collision risk after truncation. The resulting name still needs validation at the SQL boundary.

## Separate the control connection from worker connections

Creating and dropping databases requires a connection to a control database, not to the target you are dropping. Store two concepts:

1. An administrative connection URL scoped to a disposable test server.
2. A derived worker application URL whose database component points to the assigned test database.

Do not grant database-creation privileges to the application account in production. This workflow belongs on a dedicated local or CI database server with credentials limited to test resources. Fail closed if the host is not an approved test host or the required run namespace is absent.

\`\`\`ts
export function withDatabaseName(adminUrl: string, databaseName: string): string {
  const url = new URL(adminUrl);
  url.pathname = '/' + databaseName;
  return url.toString();
}

export function assertDisposableTarget(adminUrl: string): void {
  const url = new URL(adminUrl);
  const allowedHosts = new Set(['127.0.0.1', 'localhost', 'postgres']);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error('Refusing to provision a worker database on a non-test host');
  }
}
\`\`\`

An allowlist like this must match your actual CI network. A dedicated environment marker and server-side role restrictions provide additional protection. Do not copy a production hostname into the set.

## Implement the worker-scoped database fixture

Playwright fixtures support worker scope. A worker fixture initializes once for a worker process and can serve multiple test files assigned to that process. Declare worker fixture types in the second generic parameter to \`extend\`.

The lifecycle should be explicit:

1. Calculate the database name from run, shard, project, and \`parallelIndex\`.
2. Connect to the disposable control database.
3. remove stale database state for this exact namespace, if policy allows.
4. Create the database and run migrations.
5. Yield a typed handle to tests and application fixtures.
6. Close application pools.
7. Drop the database, with diagnostic logging if cleanup fails.

Here is the fixture shape. The helper implementations are shown separately so the Playwright lifecycle stays readable.

\`\`\`ts
import { test as base } from '@playwright/test';
import {
  createWorkerDatabase,
  dropWorkerDatabase,
  migrateWorkerDatabase,
} from './worker-database-admin';
import { workerDatabaseName, withDatabaseName } from './worker-database-name';

export type WorkerDatabase = {
  name: string;
  url: string;
};

type WorkerFixtures = {
  workerDatabase: WorkerDatabase;
};

export const test = base.extend<{}, WorkerFixtures>({
  workerDatabase: [async ({}, use, workerInfo) => {
    const adminUrl = requiredEnv('E2E_DATABASE_ADMIN_URL');
    const name = workerDatabaseName({
      runId: process.env.CI_RUN_ID ?? 'local',
      shardId: process.env.CI_SHARD_ID ?? 'one',
      projectName: workerInfo.project.name,
      parallelIndex: workerInfo.parallelIndex,
    });
    const url = withDatabaseName(adminUrl, name);

    await createWorkerDatabase(adminUrl, name);
    await migrateWorkerDatabase(url);

    try {
      await use({ name, url });
    } finally {
      await dropWorkerDatabase(adminUrl, name);
    }
  }, { scope: 'worker' }],
});

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error('Missing required environment variable: ' + name);
  return value;
}
\`\`\`

This fixture provisions on each worker process start. A replacement process with the same \`parallelIndex\` will calculate the same name. Therefore \`createWorkerDatabase\` must have an explicit stale-state policy. Recreating the database yields clean retry conditions, while preserving a failed database can aid diagnosis. Pick one and record it. Do not let accidental "already exists" errors decide.

## Make administrative SQL safe and teardown-aware

PostgreSQL cannot use a normal value parameter where SQL expects a database identifier. The safest design generates names internally, validates them again, and quotes them with a small, well-reviewed helper or a trusted SQL-formatting library. The example below accepts only the normalized format created above.

\`\`\`ts
import { Client } from 'pg';

function validatedIdentifier(name: string): string {
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error('Unsafe database identifier');
  }
  return '"' + name + '"';
}

export async function createWorkerDatabase(
  adminUrl: string,
  name: string,
): Promise<void> {
  assertDisposableTarget(adminUrl);
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    await client.query('DROP DATABASE IF EXISTS ' + validatedIdentifier(name));
    await client.query('CREATE DATABASE ' + validatedIdentifier(name));
  } finally {
    await client.end();
  }
}
\`\`\`

Dropping can fail if application or job-worker connections remain open. Closing the pool is the first remedy. Forcefully terminating connections is database-specific and can hide a pool leak, so use it only in a disposable environment with careful filtering. Log active connection metadata before cleanup when possible.

The fixture's \`finally\` block runs during ordinary teardown, but no process-level cleanup is guaranteed after a hard kill, machine loss, or runner cancellation. Add a separate janitor that deletes only databases bearing an old, validated test-run namespace. Retention time and target checks should make a mistaken broad deletion impossible.

## Bind the application instance to the same worker database

Creating a database does nothing if the application server still points at a global URL. This is the most common architectural miss in browser suites. Each worker needs an application instance whose connection pool is created after the worker database URL is known.

| Application topology | Can use per-worker database? | Required design |
|---|---:|---|
| In-process API handler | Yes | Construct handler with worker pool |
| One Node server fixture per worker | Yes | Start on an available port with worker URL |
| One global server for entire Playwright run | Not directly | Change server topology or use another data namespace |
| External shared staging service | Usually no | Use API-supported tenant isolation instead |
| Browser plus separate background worker | Yes, with care | Start both processes using identical worker URL |

A worker-scoped application fixture can depend on the database fixture. Start the process with a copied environment, wait for a real readiness endpoint, and stop it before database teardown. The exact start command belongs to your application, so the example uses an existing package script rather than claiming a universal server flag.

\`\`\`ts
import { spawn, type ChildProcess } from 'node:child_process';
import getPort from 'get-port';
import { test as workerTest } from './worker-database-fixture';
import { stopChild, waitForReady } from './process-lifecycle';

type AppFixtures = {
  appUrl: string;
};

export const test = workerTest.extend<{}, AppFixtures>({
  appUrl: [async ({ workerDatabase }, use) => {
    const port = await getPort();
    const child: ChildProcess = spawn('npm', ['run', 'start:e2e'], {
      env: {
        ...process.env,
        DATABASE_URL: workerDatabase.url,
        PORT: String(port),
      },
      stdio: 'pipe',
    });
    const url = 'http://127.0.0.1:' + port;
    await waitForReady(url, child);

    try {
      await use(url);
    } finally {
      await stopChild(child);
    }
  }, { scope: 'worker' }],
});
\`\`\`

\`waitForReady\` and \`stopChild\` must be real repository utilities with bounded waits, exit handling, and captured logs. Do not paste fake helpers and assume the lifecycle is complete. If the application spawns descendants, ensure teardown stops the process tree in a platform-appropriate way.

## Give each test a clean starting state inside its worker

Worker isolation prevents cross-worker collisions, not contamination between tests scheduled on the same worker. Choose one test-level reset strategy based on the application boundary.

| Reset strategy | Strength | Limitation |
|---|---|---|
| Unique record IDs per test | Supports parallel and realistic flows | Old rows accumulate until worker teardown |
| Targeted deletion by owner ID | Keeps database small | Every table relation must be understood |
| Truncate application tables | Simple state reset | Unsafe if tests inside a worker run concurrently |
| Restore a template snapshot | Fast for large schemas | Engine-specific and operationally complex |
| Transaction rollback | Very fast | Cannot contain writes from independent app connections |

For Playwright browser tests, unique data plus targeted cleanup is usually the most transparent. Build a test-scoped namespace from stable test information or generate an ID in the fixture. Avoid using a human-readable test title alone because titles can contain unsupported characters and may repeat across projects.

\`\`\`ts
import { randomUUID } from 'node:crypto';
import { test as workerTest } from './worker-fixtures';

type TestData = {
  testNamespace: string;
  createdOrderIds: string[];
};

export const test = workerTest.extend<TestData>({
  testNamespace: async ({}, use) => {
    await use('case_' + randomUUID().replace(/-/g, ''));
  },
  createdOrderIds: async ({ workerDatabase }, use) => {
    const ids: string[] = [];
    await use(ids);
    await deleteOrdersByIds(workerDatabase.url, ids);
  },
});
\`\`\`

The cleanup deletes exact IDs recorded by the case. It does not issue "delete all orders," which could interfere if tests in the same worker are configured to run concurrently. Teardown should tolerate a record already being removed by the tested behavior while still reporting unexpected database errors.

## Seed reference data once and scenario data per test

Separate immutable reference data from mutable scenario data. Migrations or worker setup can install currency codes, product catalog fixtures, or permission definitions that tests only read. Each test creates its own customers, orders, and sessions.

| Data class | Provision time | Mutation policy | Example |
|---|---|---|---|
| Schema | Worker setup | Only migrations | Tables and indexes |
| Immutable reference | Worker setup | Read-only in tests | Country or role definitions |
| Scenario entity | Test setup | Owned by one test | Customer and order |
| Authentication identity | Worker or test setup | Avoid shared mutations | Dedicated account |
| Diagnostic residue | Failure path | Retain by explicit policy | Database dump or selected rows |

Seed through stable APIs or SQL utilities that return created identities. Do not rely on insertion order or hard-coded numeric primary keys unless the schema contract guarantees them. A generated unique namespace makes it easy to query all rows belonging to a failing case.

When direct SQL setup bypasses validation that the application normally enforces, use builders that produce schema-valid data and reserve intentionally invalid rows for explicit database tests. Otherwise browser tests may investigate impossible states.

## Handle retries without hiding contaminated state

Playwright discards a worker process after a test failure and starts another worker when more tests need to run. With retry configuration, the retry can run in a fresh worker process. A \`parallelIndex\`-named database gives you a choice:

- Drop and recreate the slot database when the replacement worker starts. This maximizes isolation for the retry.
- Preserve the failed database under a diagnostic name, then create a clean database for the slot. This improves forensics at additional storage cost.
- Reuse the dirty database. This is rarely desirable because the retry result now depends on partial state.

A useful diagnostic policy renames or dumps only on the first failure, associates the artifact with run, project, slot, and test identity, and caps retention. Database credentials and sensitive test data must not be uploaded indiscriminately.

Do not interpret "passes on retry" as success for isolation. Compare first-attempt logs with database ownership data. A retry can pass precisely because recreation removed contamination, proving a defect in test cleanup rather than product flakiness.

## Diagnose the realistic failure: parallelIndex is correct but data still crosses workers

Suppose database logs show distinct names for slot 0 and slot 1, yet a worker reads an order created by the other. The naming helper appears correct, migrations ran twice, and targeted cleanup uses the right IDs.

Trace every connection creator. A frequent root cause is an application module that creates its pool at import time from the process environment. The test fixture later changes \`DATABASE_URL\`, but the already-created pool remains connected to the original shared database. Another cause is a background worker launched outside the fixture and still reading the global URL.

Diagnose in this order:

1. Log the database name from the fixture, application readiness endpoint, and a SQL \`current_database()\` query.
2. Add run, project, and parallel-slot fields to application logs.
3. Search for every pool or ORM client constructor and record when it runs.
4. Verify browser requests reach the worker-specific port, not a global server.
5. Confirm job consumers and scheduled tasks inherit the same database URL.

The fix is lifecycle ordering: derive the URL, then construct every connection-owning component. Changing more cleanup code will not correct a pool connected to the wrong database.

## Size CI capacity and make failures observable

Per-worker databases trade collision risk for resource use. Worker count multiplied by projects, shards, application pools, and background processes can exceed database connection or storage limits. Estimate the upper bound before enabling full parallelism.

| Capacity input | Calculation concern | Mitigation |
|---|---|---|
| Playwright workers per process | One database and app pool each | Set worker count to tested capacity |
| CI shards | Parallel indexes repeat across shards | Unique shard namespace |
| Browser projects | May run concurrently | Project in database name |
| Pool maximum | Multiplied by app instances | Test-specific smaller pool configuration |
| Migration duration | Repeated for every worker start | Template database or schema strategy after measurement |
| Failed-run retention | Databases survive cancellations | Validated age-based janitor |

Attach a small isolation manifest to test artifacts: sanitized database name, run namespace, shard, project, parallel index, worker index, application port, migration revision, and cleanup result. Never include passwords or full connection URLs. This manifest makes "wrong database" bugs diagnosable without verbose debug logging.

Use Playwright's supported \`--workers\` option when deliberately testing capacity or reproducing collisions. Run once with one worker and once with the intended parallel count. A failure that appears only in parallel is evidence about state or resource contention, not a reason to leave CI permanently serial.

## Review the design against the full test stack

The database fixture is only one layer of the suite. Confirm that the runner configuration, application lifecycle, API clients, browser contexts, and cleanup utilities all derive state from the same worker assignment. The [JavaScript testing frameworks complete guide for 2026](/blog/javascript-testing-frameworks-complete-guide-2026) can help clarify which responsibilities belong in Playwright versus a faster unit or service-level runner.

Before rollout, prove the design with a deliberate collision test. Run two cases concurrently that attempt to create the same business-unique value. Each should succeed in its own database. Then add a control test inside one worker showing that the uniqueness constraint still rejects duplicates. Isolation should remove cross-test interference without disabling real constraints.

Finish with these gates:

- Database names are unique across runs, shards, projects, and parallel slots.
- The administrative role and host are disposable-test resources only.
- Every application and background connection is created after the worker URL exists.
- Tests within a worker own and clean their mutable records.
- Replacement workers follow an explicit recreate or preserve policy.
- Teardown closes pools before dropping databases.
- Cancellation residue is handled by a narrowly validated janitor.
- Logs identify the run and slot without exposing credentials.
- CI capacity covers the maximum concurrent pools and migrations.

Per-worker databases are effective because they make the unit of parallel state explicit. Reliability comes from the entire lifecycle, not the database name alone: controlled provisioning, correct application binding, test-owned records, restart-aware cleanup, and evidence that proves each process reached its assigned database.

## Frequently Asked Questions

### Should I use workerIndex or parallelIndex in the database name?

Prefer \`parallelIndex\` for the slot portion when a replacement worker should map to the same isolation slot. Playwright documents that \`workerIndex\` is unique to a worker process and changes after a restart, while \`parallelIndex\` remains stable for that slot. Neither value is globally unique across separate CI jobs or shards. Add an explicit run, shard, and project namespace. You may still log \`workerIndex\` because it helps distinguish the original process from its replacement during failure analysis.

### Does one database per Playwright worker remove the need for cleanup?

No. It prevents concurrent workers from sharing records, but multiple tests can run sequentially in the same worker and reuse its database. They can still leak state into later cases. Give each test unique entities and perform targeted cleanup, or restore a known baseline using a strategy compatible with your application's connections. Broad truncation is unsafe if tests inside a worker can run concurrently. Worker teardown is the final resource cleanup, not the only test-isolation mechanism.

### Can Playwright's global web server use a different database for each worker?

A single global application server normally has one configured connection environment, so it cannot transparently point each request at a different worker database. Use a worker-scoped application instance, redesign the application for an explicit safe test namespace, or select another isolation boundary. Starting a database per worker while every browser still reaches the same global server provides no isolation. Verify the effective database through an application health diagnostic or database query, not only through fixture logs.

### How should abandoned worker databases be removed after cancelled CI runs?

Use a separate cleanup job that targets only internally generated test database names, validates the disposable server, and deletes resources older than an agreed retention window. Include a run identifier and creation metadata so age and ownership are provable. Never build a broad wildcard from an untrusted branch name. Ordinary fixture teardown should remain the first cleanup path, while the janitor handles hard kills and lost runners. Preserve selected failed databases only under an explicit, access-controlled diagnostic policy.
`,
};
