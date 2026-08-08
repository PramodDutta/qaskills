import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest GlobalSetup Teardown Database Workflows That Clean Up Reliably',
  description: 'Implement jest globalsetup teardown database workflows with PostgreSQL schemas, worker-safe test data, failure diagnostics, and dependable CI cleanup.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Jest GlobalSetup Teardown Database Workflows That Clean Up Reliably

A sound Jest globalSetup teardown database workflow provisions one test resource before the selected suites run, publishes only serializable connection metadata to test workers, and removes the resource after the run. For PostgreSQL, a practical pattern is to create a uniquely named schema inside a CI-provided database, store that schema name in a small state file, connect each test through a helper that sets \`search_path\`, and drop the schema in \`globalTeardown\`.

Do not try to place a database client on a global in setup and read it from test files. Jest documents that values assigned to the global object in \`globalSetup\` are available to \`globalTeardown\`, not to test suites. Tests execute in separate environments and may run in multiple workers. Pass plain metadata through a file or preexisting environment configuration, then create a client or pool inside the process that uses it.

The examples below use PostgreSQL and the documented \`pg\` package API. They assume \`TEST_DATABASE_URL\` points to a disposable database service. The workflow creates a schema, not an entire PostgreSQL server, which keeps privileges limited and setup quick while preserving run-level namespacing.

## Decide what globalSetup should own

Global setup is best for expensive resources shared by the test run: a schema, a container endpoint created outside Jest, a seeded immutable catalog, or an emulator process. It is a poor place for per-test mutable state because Jest calls it once, not before every test.

| Lifecycle need | Correct Jest layer | Database example |
|---|---|---|
| Once before all selected suites | \`globalSetup\` | Create a unique schema and base tables |
| Before each test environment starts | \`setupFiles\` | Load run metadata into that worker's environment |
| Once per test file | \`beforeAll\` and \`afterAll\` | Open and close a pool owned by the file |
| Before or after each test | \`beforeEach\` and \`afterEach\` | Begin rollback boundary or delete owned rows |
| Once after all selected suites | \`globalTeardown\` | Drop the unique schema |

Jest's current configuration reference is https://jestjs.io/docs/configuration. It states that a global setup module exports a synchronous or asynchronous function and receives global and project configuration. In a multi-project runner, that setup runs only when at least one test from its project is selected. Teardown has the corresponding behavior.

This distinction matters when a repository uses \`projects\`. Putting a single setup at an unrelated root and then selecting only an API project can produce a different lifecycle than expected. Keep database lifecycle configuration with the project that owns the database tests.

## Build a minimal project around an external PostgreSQL service

The package scripts and dependencies can remain simple:

\`\`\`json
{
  "name": "orders-api-tests",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "test:db": "jest --config jest.db.config.cjs --runInBand",
    "test:db:parallel": "jest --config jest.db.config.cjs"
  },
  "devDependencies": {
    "jest": "^30.0.0",
    "pg": "^8.0.0"
  }
}
\`\`\`

The ranges are illustrative package manifest constraints, not a claim that one patch release is required. If the repository already pins supported versions in a lockfile, keep those. \`--runInBand\` is useful for first proving the lifecycle, but the design should also survive normal worker execution.

Use a state directory ignored by version control:

\`\`\`text
test/
  database/
    global-setup.cjs
    global-teardown.cjs
    load-state.cjs
    connection.cjs
    state-path.cjs
  integration/
    orders.test.cjs
.tmp/
  jest-db-state.json
jest.db.config.cjs
\`\`\`

The database URL comes from the environment. Do not write it to the state file or logs. The state file contains only a generated schema identifier.

## Configure the database test project explicitly

\`\`\`js
// jest.db.config.cjs
const config = {
  displayName: 'database-integration',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.test.cjs'],
  globalSetup: '<rootDir>/test/database/global-setup.cjs',
  globalTeardown: '<rootDir>/test/database/global-teardown.cjs',
  setupFiles: ['<rootDir>/test/database/load-state.cjs'],
  testTimeout: 15_000,
};

module.exports = config;
\`\`\`

\`setupFiles\` executes in each test environment before test code. Here it loads run metadata. It is not responsible for provisioning, migrating, or deleting the shared resource.

| Config key | Scope | Failure symptom when misused |
|---|---|---|
| \`globalSetup\` | Once for the selected project | Every file tries to provision independently if replaced with a file hook |
| \`setupFiles\` | Once per test environment | Repeating migrations or schema creation causes races |
| \`globalTeardown\` | Once after suites | Resource leaks if cleanup exists only in successful tests |
| \`testTimeout\` | Each test | Raising it does not extend external CI service startup |

Keep the configuration in CommonJS here so setup files run without a TypeScript configuration loader. Jest can load TypeScript configuration and setup modules when configured appropriately, but lifecycle code is a risky place for transform ambiguity. Plain JavaScript reduces bootstrapping dependencies.

## Generate an identifier that is safe to quote

Never interpolate an arbitrary branch name into SQL. Generate the schema name inside setup from controlled characters, validate it, and quote it as an identifier. PostgreSQL parameter placeholders represent values, not identifiers, so a schema or table name cannot be supplied as \`$1\`.

\`\`\`js
// test/database/state-path.cjs
const path = require('node:path');

const statePath = path.join(
  process.cwd(),
  '.tmp',
  'jest-db-state.json',
);

module.exports = { statePath };
\`\`\`

The global setup creates the directory, connects, provisions the schema, records the state atomically enough for this single coordinator, and closes its client:

\`\`\`js
// test/database/global-setup.cjs
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { Client } = require('pg');
const { statePath } = require('./state-path.cjs');

function quoteIdentifier(identifier) {
  if (!/^jest_[a-f0-9]{16}$/.test(identifier)) {
    throw new Error('Refusing to use an unsafe PostgreSQL identifier');
  }
  return '"' + identifier + '"';
}

module.exports = async function globalSetup() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL is required for database tests');
  }

  const schema = 'jest_' + crypto.randomBytes(8).toString('hex');
  const quotedSchema = quoteIdentifier(schema);
  const client = new Client({ connectionString });

  await client.connect();
  try {
    await client.query('CREATE SCHEMA ' + quotedSchema);
    await client.query(
      'CREATE TABLE ' + quotedSchema + '.orders (' +
        'id uuid PRIMARY KEY, ' +
        'customer_email text NOT NULL, ' +
        'status text NOT NULL, ' +
        'created_at timestamptz NOT NULL DEFAULT now()' +
      ')',
    );

    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(
      statePath,
      JSON.stringify({ schema }) + '\\n',
      { encoding: 'utf8', mode: 0o600 },
    );

    global.__JEST_DATABASE_SCHEMA__ = schema;
  } finally {
    await client.end();
  }
};
\`\`\`

Every variable is assigned before use, the connection is always closed, and unsafe identifiers are rejected. If schema creation succeeds but writing the state file fails, setup throws. That rare partial-provisioning case deserves a janitor based on schema age, discussed later, because teardown may not have enough state to locate the schema.

## Publish metadata to workers without sharing live clients

The setup file reads and validates state:

\`\`\`js
// test/database/load-state.cjs
const fs = require('node:fs');
const { statePath } = require('./state-path.cjs');

const raw = fs.readFileSync(statePath, 'utf8');
const parsed = JSON.parse(raw);

if (
  typeof parsed.schema !== 'string' ||
  !/^jest_[a-f0-9]{16}$/.test(parsed.schema)
) {
  throw new Error('Invalid Jest database state file');
}

process.env.JEST_DATABASE_SCHEMA = parsed.schema;
\`\`\`

Only the generated schema crosses the process boundary. Each worker already inherits \`TEST_DATABASE_URL\` from the command environment. The test helper owns actual connections:

\`\`\`js
// test/database/connection.cjs
const { Pool } = require('pg');

let pool;

function schemaName() {
  const schema = process.env.JEST_DATABASE_SCHEMA;
  if (!schema || !/^jest_[a-f0-9]{16}$/.test(schema)) {
    throw new Error('JEST_DATABASE_SCHEMA is unavailable or invalid');
  }
  return schema;
}

function databasePool() {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL is required');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      max: 4,
    });
  }
  return pool;
}

async function withSchemaClient(work) {
  const client = await databasePool().connect();
  try {
    const schema = schemaName();
    await client.query('SET search_path TO \"' + schema + '\"');
    return await work(client);
  } finally {
    client.release();
  }
}

async function closeDatabasePool() {
  if (pool) {
    const current = pool;
    pool = undefined;
    await current.end();
  }
}

module.exports = {
  closeDatabasePool,
  withSchemaClient,
};
\`\`\`

The schema has already passed a strict allowlist before being interpolated. Setting \`search_path\` on every checked-out client is necessary because a pool may hand the test any connection. A session setting performed once on one client does not configure every future pooled connection.

For deeper choices around rollback, read committed behavior, and serialization anomalies, use [database transaction isolation levels](/blog/database-testing-transaction-isolation-levels). Global provisioning and transaction isolation complement each other: one separates the run, the other controls concurrent observations within that run.

## Write parallel-safe tests inside the shared run schema

A shared schema does not automatically make parallel tests independent. If every test deletes all rows in \`beforeEach\`, workers can erase each other's fixtures. Give each test unique primary keys and query by those identifiers.

\`\`\`js
// test/integration/orders.test.cjs
const crypto = require('node:crypto');
const {
  closeDatabasePool,
  withSchemaClient,
} = require('../database/connection.cjs');

afterAll(async () => {
  await closeDatabasePool();
});

test('stores a pending order', async () => {
  const id = crypto.randomUUID();

  await withSchemaClient(async (client) => {
    await client.query(
      'INSERT INTO orders (id, customer_email, status) VALUES ($1, $2, $3)',
      [id, 'buyer@example.test', 'pending'],
    );

    const result = await client.query(
      'SELECT id, customer_email, status FROM orders WHERE id = $1',
      [id],
    );

    expect(result.rows).toEqual([
      {
        id,
        customer_email: 'buyer@example.test',
        status: 'pending',
      },
    ]);
  });
});

test('updates only the addressed order', async () => {
  const id = crypto.randomUUID();

  await withSchemaClient(async (client) => {
    await client.query(
      'INSERT INTO orders (id, customer_email, status) VALUES ($1, $2, $3)',
      [id, 'ops@example.test', 'pending'],
    );
    await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      ['paid', id],
    );
    const result = await client.query(
      'SELECT status FROM orders WHERE id = $1',
      [id],
    );

    expect(result.rows[0]).toEqual({ status: 'paid' });
  });
});
\`\`\`

This test module closes its own pool. It does not drop the schema. Teardown is the run coordinator and removes all rows at once by dropping the namespace.

When these tests exercise an HTTP application rather than direct queries, inject the same database configuration into the application created by the test. The request patterns in [Supertest Node API testing](/blog/supertest-node-api-testing-complete-guide) pair naturally with this schema lifecycle. Do not start a second application database configuration that points at a developer schema.

## Teardown should be idempotent and preserve the primary failure

Teardown obtains the schema from the documented global handoff when possible and falls back to the state file. It validates again, drops the schema, closes the client, and removes the file.

\`\`\`js
// test/database/global-teardown.cjs
const fs = require('node:fs/promises');
const { Client } = require('pg');
const { statePath } = require('./state-path.cjs');

function validateSchema(schema) {
  if (typeof schema !== 'string' || !/^jest_[a-f0-9]{16}$/.test(schema)) {
    throw new Error('Refusing to drop an unsafe PostgreSQL schema name');
  }
  return schema;
}

module.exports = async function globalTeardown() {
  let schema = global.__JEST_DATABASE_SCHEMA__;

  if (!schema) {
    const raw = await fs.readFile(statePath, 'utf8');
    schema = JSON.parse(raw).schema;
  }

  schema = validateSchema(schema);

  const client = new Client({
    connectionString: process.env.TEST_DATABASE_URL,
  });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS \"' + schema + '\" CASCADE');
  } finally {
    await client.end();
    await fs.rm(statePath, { force: true });
  }
};
\`\`\`

\`IF EXISTS\` makes the database operation safe when a prior cleanup already removed the schema. File removal is also tolerant of absence. Validation happens before any destructive statement.

There is a policy choice when teardown fails after tests already failed. Jest reports teardown errors, but teams should also preserve test reports and database logs as CI artifacts. Do not catch and suppress a failed drop. A leak is operationally important. Instead, run a separately authorized janitor that removes old test schemas based on trustworthy metadata and a conservative age threshold.

| Cleanup condition | Teardown response | Operational follow-up |
|---|---|---|
| Schema exists | Drop it with \`CASCADE\` | None |
| Schema already absent | Continue because \`IF EXISTS\` is idempotent | Check for duplicate cleanup only if frequent |
| Database unavailable | Fail teardown visibly | Restore service, run controlled janitor |
| State invalid | Refuse destructive SQL | Inspect artifact, never guess the identifier |
| Process killed before teardown | No in-process cleanup possible | Scheduled age-based janitor |

## A realistic failure: Jest hangs after every assertion passes

The report shows all tests green, yet Jest does not exit promptly and warns about open handles. Global teardown drops the schema successfully. The cause is not the schema lifecycle. One test file created a \`Pool\` and never called \`pool.end()\`. Dropping database objects does not close TCP sockets held by worker processes.

Diagnose the owner instead of adding \`--forceExit\`:

1. Run the smallest failing test file with \`--runInBand\`.
2. Inventory resources created inside test environments: pools, servers, timers, queue clients, and subscriptions.
3. Add explicit \`afterAll\` cleanup beside the code that creates each resource.
4. Confirm every checked-out database client reaches a \`finally\` release.
5. Use Jest's documented open-handle diagnostics when needed, but fix ownership rather than forcing process termination.

\`--forceExit\` can make CI finish while connections, unfinished writes, or missing cleanup remain. It is an escape hatch for diagnosis, not a lifecycle design.

A second failure mode occurs when tests intermittently report that relation \`orders\` does not exist. The setup created it, but a pool client queried the default \`public\` schema because \`search_path\` was set only on the setup client. The fix is the \`withSchemaClient\` boundary shown above, which configures every acquired connection before work.

## What people get wrong: global means coordinator, not shared object

The word \"global\" invites the idea of one live client visible everywhere. In Jest it describes when the hook runs, not a safe shared-memory model across sandboxed test environments and workers. Store only enough metadata to let each environment construct its own resource handle.

Teams also put migrations in \`beforeAll\` inside every file. Under parallel execution, several workers race to create the same tables. Move run-level migrations to global setup, or give every worker and test file its own namespace if isolation demands it.

Another common mistake is using a fixed schema such as \`jest_test\`. Two CI jobs then share and drop the same resource. A generated run identifier prevents cross-job collision. Shell identifiers should also be composed safely. For example, a CI script can export \`TEST_RUN_ID=\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}\`. Braces prevent greedy variable-name parsing. The SQL identifier still needs an allowlist before use.

Finally, do not point this workflow at a database containing valuable schemas. Use a dedicated test database and credentials whose permissions match the required setup and teardown operations. Defense is layered: disposable service, limited account, generated prefix, strict validation, quoted identifier, and idempotent cleanup.

## Scale the pattern for migrations, seeds, and workers

Real services usually apply migrations rather than issuing one \`CREATE TABLE\`. Invoke the repository's existing documented migration entry point from global setup after creating the schema, and configure it to target that schema. Do not invent a second migration implementation in test code.

Seed only data shared immutably across tests, such as a country-code catalog. Mutable entities should be created by the test that owns them. A shared seed row edited by two workers reintroduces order dependence.

Choose isolation based on behavior:

| Isolation shape | Cost | Parallel safety | Good fit |
|---|---:|---|---|
| One schema per Jest run, unique rows per test | Low | Good with disciplined queries | Most integration suites |
| One schema per worker | Medium | Stronger | Suites with unavoidable broad cleanup |
| One schema per test file | Higher | Strong | Legacy tests with file-level fixtures |
| Transaction rollback per test | Low after setup | Strong within connection constraints | Repository tests that keep work on one connection |
| One database per run | Highest privilege and startup cost | Strong | Extension, collation, or database-level behavior |

Jest exposes worker identity through an environment variable in worker processes, but provisioning worker-specific resources requires a clear coordinator and cleanup registry. Start with one run schema and unique test ownership. Add complexity only after measuring actual contention.

## Make failures observable for humans and coding agents

Log safe lifecycle facts: schema identifier, migration phase, elapsed setup stage, and cleanup outcome. Never log the connection URL. Use custom error messages that identify whether failure occurred connecting, provisioning, writing state, loading worker state, or dropping resources.

An AI coding agent should be told these invariants:

- \`globalSetup\` may create run-scoped resources and write non-secret metadata.
- Test files may not read setup globals or reuse setup clients.
- Every pool or server created in a test environment has a neighboring cleanup hook.
- Every database client release occurs in \`finally\`.
- Tests own unique rows and never perform unscoped deletes.
- Teardown validates generated names before destructive SQL.
- A forced process exit is not an accepted fix for leaked handles.

These rules are concrete enough for automated review. A code agent can locate new \`Pool\` calls, check for \`end()\` ownership, flag hard-coded schema names, and verify parameterized values.

## A release-ready verification sequence

First run the lifecycle serially to simplify attribution:

\`\`\`bash
TEST_DATABASE_URL='postgresql://tester:tester@127.0.0.1:5432/app_test' \\
  npm run test:db
\`\`\`

Then run normal parallel mode repeatedly against the disposable service. Confirm that two separate CI jobs can overlap without sharing a schema. Interrupt a run intentionally in a safe test environment and verify the janitor procedure detects the abandoned prefixed schema without touching newer runs.

Review database logs when tests fail. A Jest timeout alone cannot tell whether a query blocked on a lock, the pool exhausted its clients, the service disconnected, or an assertion waited on application behavior. Connection metadata, query correlation, and PostgreSQL activity views provide the missing layer.

The final acceptance criteria are simple: setup fails fast without configuration, no secret enters the state file, workers connect independently, parallel tests own their data, every process closes its handles, teardown refuses unsafe identifiers, and interrupted runs have an external recovery path.

## Frequently Asked Questions

### Can Jest tests access variables assigned in globalSetup?

Test suites should not rely on them. Jest documents that global variables created in \`globalSetup\` can be read in \`globalTeardown\`, not in test suites. Tests run in separate environments and may execute in workers. Publish small non-secret metadata through a controlled file or prepare environment configuration before starting Jest, then create clients inside each test process. A live database connection is not a serializable handoff and remains owned by the setup process. Keep the global value only as a convenient teardown reference.

### Should globalSetup start the database server itself?

It can coordinate a documented emulator or container API, but CI orchestration is often a better owner for the server. Let the CI service, container platform, or local development command start PostgreSQL and expose \`TEST_DATABASE_URL\`. Then Jest owns a narrower schema lifecycle. This separates infrastructure readiness from test data isolation, reduces setup privileges, and makes service logs accessible even if Jest crashes. If setup starts a process, teardown must retain the exact handle needed to stop it, and an out-of-process cleanup path is still required for hard termination.

### How do I prevent database tests from colliding across Jest workers?

Create a unique namespace for the run, then make each test own uniquely identified rows. Avoid broad \`DELETE FROM table\` cleanup while workers are active. For stronger isolation, use a transaction rollback pattern when all work stays on the same connection, or provision a schema per worker or file with a cleanup registry. The correct level depends on application connection behavior and test cost. Start by reproducing under normal parallel execution, because \`--runInBand\` can conceal shared-state races even though it is useful for initial diagnosis.

### Will globalTeardown always run if the CI job is canceled?

No in-process hook can guarantee cleanup after a hard kill, machine loss, or externally canceled job. Global teardown handles normal completion and ordinary test failures, but infrastructure needs a second line of defense. Prefix generated resources, attach trustworthy creation metadata, and run a conservative janitor with restricted credentials to remove resources older than an agreed threshold. Keep cleanup idempotent so teardown and the janitor can overlap safely. Never broaden a destructive query because state is missing; invalid or absent identifiers should cause cleanup to stop and alert.
`,
};
