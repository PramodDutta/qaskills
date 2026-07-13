import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Run PostgreSQL Init Scripts and Migrations with Testcontainers',
  description:
    'Run PostgreSQL init scripts and migrations with Testcontainers for deterministic schemas, version-accurate integration tests, and clean isolation.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Run PostgreSQL Init Scripts and Migrations with Testcontainers

PostgreSQL is accepting connections, but the first repository query fails with \`relation "accounts" does not exist\`. Starting a container proves the server is ready, not that your application's schema exists. Integration setup needs a second, explicit readiness milestone: the intended migrations have completed successfully.

Testcontainers gives the test a disposable PostgreSQL process and its connection URI. Your migration tool still owns schema evolution. Keeping those responsibilities separate produces tests that use the same migration path as deployment and fail at the migration that broke, rather than later inside an unrelated assertion.

## Choose between image initialization and an application migrator

The official PostgreSQL image executes files placed in \`/docker-entrypoint-initdb.d\` only while initializing an empty data directory. That mechanism is useful for bootstrap SQL such as extensions, roles, or a single consolidated schema. Versioned application migrations are usually better run by the same library or CLI used in production.

| Bootstrap mechanism | Runs when | Strongest use | Important limitation |
| --- | --- | --- | --- |
| Image init SQL | First database initialization | Extensions and baseline SQL | Not rerun on an existing volume |
| Application migration library | After container startup | Ordered production migrations | Test must await and surface failures |
| ORM schema synchronization | Application startup | Prototypes or disposable development | Can bypass migration history |
| Restored schema dump | During setup | Large, stable baseline | May conceal defects in old migrations |
| Per-test transaction | Around each case | Fast data rollback | Does not rebuild schema |

Do not combine every technique by default. If an init script creates tables and the migrator tries to create them again, setup becomes ambiguous. A clean design might use init SQL solely for \`CREATE EXTENSION\`, then run all versioned DDL through migrations.

## Start PostgreSQL and run real migrations

The Node Testcontainers module exposes \`PostgreSqlContainer\`. After \`start()\` resolves, connect with the \`pg\` client and execute a migration runner. The example uses \`node-pg-migrate\`'s documented programmatic \`runner\` API and a migrations directory resolved from the test file.

\`\`\`typescript
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { runner as migrate } from 'node-pg-migrate';
import { fileURLToPath } from 'node:url';

describe('account repository against migrated PostgreSQL', () => {
  let postgres: StartedPostgreSqlContainer;
  let client: Client;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:17-alpine')
      .withDatabase('app_test')
      .withUsername('test_user')
      .withPassword('test_password')
      .start();

    await migrate({
      databaseUrl: postgres.getConnectionUri(),
      dir: fileURLToPath(new URL('../migrations', import.meta.url)),
      direction: 'up',
      migrationsTable: 'pgmigrations',
      count: Infinity,
    });

    client = new Client({ connectionString: postgres.getConnectionUri() });
    await client.connect();
  }, 120_000);

  afterAll(async () => {
    await client?.end();
    await postgres?.stop();
  });

  test('enforces a unique account email', async () => {
    await client.query('insert into accounts(email) values ($1)', ['qa@example.test']);
    await expect(
      client.query('insert into accounts(email) values ($1)', ['qa@example.test']),
    ).rejects.toMatchObject({ code: '23505' });
  });
});
\`\`\`

Pin the image to the PostgreSQL major version used in production. \`postgres:latest\` makes a future database release an unreviewed test change. Alpine versus Debian can matter when extensions or locale behavior are involved, so match the production family where those features are tested.

The hook timeout is longer because pulling an image on a cold machine can be slow. It is not a substitute for a migration deadline or container diagnostics. Cache images in CI where practical and inspect container logs when readiness fails.

## Copy a bootstrap script into the entrypoint directory

When init SQL is appropriate, copy it before starting the container. Testcontainers' generic container file-copy API accepts source and target paths. The target filename controls lexical execution order within the entrypoint directory.

\`\`\`typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { fileURLToPath } from 'node:url';

const initScript = fileURLToPath(new URL('./sql/001-bootstrap.sql', import.meta.url));

const postgres = await new PostgreSqlContainer('postgres:17-alpine')
  .withDatabase('inventory_test')
  .withCopyFilesToContainer([
    { source: initScript, target: '/docker-entrypoint-initdb.d/001-bootstrap.sql' },
  ])
  .start();

const client = new Client({ connectionString: postgres.getConnectionUri() });
await client.connect();
const result = await client.query(
  "select extname from pg_extension where extname = 'pgcrypto'",
);
if (result.rowCount !== 1) throw new Error('pgcrypto bootstrap did not run');
await client.end();
await postgres.stop();
\`\`\`

The corresponding SQL can be ordinary, idempotent PostgreSQL:

\`\`\`sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE ROLE report_reader NOLOGIN;
GRANT CONNECT ON DATABASE inventory_test TO report_reader;
\`\`\`

Files are executed by the image entrypoint during initialization, before Testcontainers reports the database ready. A syntax error normally causes initialization to fail, which is exactly what a bootstrap defect should do. Do not mount an init file after \`start()\` and expect the entrypoint to discover it.

## Make schema readiness observable

A TCP connection is only infrastructure readiness. After migrations, query an invariant that represents application readiness: the migration table contains the latest migration, a required enum exists, or a critical constraint is installed. This catches migration runners that silently point at another database or stop early.

| Readiness check | Detects | Avoid |
| --- | --- | --- |
| Latest migration name recorded | Incomplete migration chain | Only checking that a table exists |
| Required extension in \`pg_extension\` | Missing bootstrap privilege or script | Assuming image tag bundles extension |
| Constraint in \`pg_constraint\` | Drift between schema and repository expectation | Testing only successful inserts |
| Application query succeeds | End-to-end mapping readiness | Treating it as migration diagnosis |
| Server version query | Wrong image or remote connection | Unpinned major versions |

Log migration names and elapsed time, not credentials in connection URIs. A URI can contain the generated password. When a migration fails, retain PostgreSQL container logs as a CI artifact and print the migration identifier plus database error fields.

## Test migrations, not only the final schema

A new database proves the up path from zero. Production upgrades often begin with old data and an earlier schema. Add migration-focused cases that start from the previous released migration, insert representative data, apply the new migration, and verify transformation plus constraints.

Suppose a migration changes \`orders.status\` from free text to an enum. Seed valid old statuses, apply the migration, and assert values survive. Seed an unknown status only if the migration specification says how it should be handled. Verify indexes or constraints through catalog queries, not merely through ORM metadata.

Down migrations deserve tests only if rollback is an operationally supported path. Many production databases use forward fixes because destructive rollback is unsafe. Do not pretend reversibility by writing a down migration that drops new data. Align tests with the real release policy.

The [Testcontainers PostgreSQL Node guide](/blog/testcontainers-postgres-node-guide) covers module installation, connection details, and basic lifecycle. Migration testing adds historical state and catalog assertions on top of that foundation.

## Control isolation without restarting for every assertion

Starting one PostgreSQL container per test gives excellent isolation but high startup cost. One per test file or worker is often a better balance. Apply migrations once, then isolate data with transactions, schema recreation, or unique tenants.

Transaction rollback is fast when all application queries use the same transaction boundary. It fails when code opens independent pools, commits internally, or tests background workers. Truncating tables is explicit but must respect foreign keys and sequences. Creating a schema per test isolates names but requires setting \`search_path\` consistently and running migrations into each schema.

Never let parallel workers share the same database name and truncate each other's rows. Testcontainers maps a random host port, but reuse features or a manually shared container can reintroduce collisions. Generate distinct databases or schemas and include worker identity in resource names.

| Isolation model | Startup cost | Handles committed background work | Main risk |
| --- | ---: | --- | --- |
| Container per case | Highest | Yes | Slow suite and Docker pressure |
| Container per file | Medium | Yes with cleanup | File-level concurrency limits |
| Container per worker | Low to medium | Yes with unique data | Cross-test leaks inside worker |
| Transaction per test | Low | Usually no | Independent connections escape rollback |
| Schema per test | Medium | Yes when search path is correct | Connection configuration complexity |

## Detect connection leaks and shutdown problems

Container stop can hang or tests can finish while Node remains alive if pools are not closed. Make the test own every client and pool it creates. Close application servers first, then pools or clients, then the container. This order lets the application finish requests while the database still exists.

Use \`try/finally\` in ad hoc scripts and test framework teardown hooks in suites. If migration setup fails before a client is assigned, optional teardown calls prevent a secondary exception from hiding the original. Avoid suppressing stop failures without logging them, because repeated leaks can exhaust CI disk or Docker resources.

Connection pool size should reflect test concurrency. Ten workers each creating a default pool can overwhelm a small container. Configure compact pools for integration tests and close them deterministically.

## Keep initialization production-like without copying production hazards

Use the same migration files and engine as deployment. Match PostgreSQL major version, required extensions, encoding, and relevant locale. Do not import production data or credentials. Seed the smallest data that exposes the behavior, with synthetic identifiers and safe content.

Avoid relying on superuser capabilities if the deployed application migrator lacks them. The stock image's configured user commonly has broad rights. Create a migration role and runtime role in bootstrap SQL when privilege boundaries matter, then run migrations and application queries with their respective credentials.

The [Testcontainers best practices guide](/blog/testcontainers-best-practices-2026) explains lifecycle, image pinning, CI Docker access, and reuse tradeoffs. For database schemas, add one rule: a successful container start is never your final setup assertion.

## Troubleshoot failures by phase

If the image cannot start, inspect Docker access, pull errors, platform compatibility, and container logs. If PostgreSQL starts but init fails, inspect entrypoint output, file target paths, SQL permissions, and filename ordering. If migrations fail, report the exact migration and SQLSTATE. If tests fail afterward, verify the connection URI used by the application matches the migrated container.

A surprisingly common defect is migrating with one URI and constructing the repository from an environment variable that points elsewhere. Pass the container URI through one test composition root. Assert \`select current_database(), version()\` during setup when diagnosis is unclear.

Do not add arbitrary sleep. The container module already waits for PostgreSQL readiness, and the migration promise is the schema barrier. A sleep adds latency and still races on a slower runner.

## Verify permissions with separate migration and runtime roles

A schema created successfully by a superuser can still fail in production when the application role lacks table or sequence privileges. Bootstrap distinct roles, migrate with the migration role, and connect repositories as the runtime role. Then test allowed reads and writes plus prohibited DDL.

PostgreSQL default privileges apply only to objects subsequently created by the role whose defaults were altered. A grant on existing tables does not automatically cover tables added by later migrations. Add a migration test that creates the newest object and verifies the runtime role can use it. Sequence privileges frequently surface when an insert into an identity or serial-backed column fails despite table insert permission.

Do not weaken the container user simply to make the test pass. The container's initial superuser can create roles, then the test should switch connection strings. Store test passwords only in process memory or isolated configuration and keep URIs out of logs.

## Validate extension and locale assumptions

Extensions are not universally available in every PostgreSQL image. \`CREATE EXTENSION\` can fail because control files are absent, not because SQL is wrong. If production uses PostGIS or another packaged extension, select an image that actually contains it and pin its version family. A vanilla image cannot simulate unavailable binaries through an init script.

Collation, character type, and timezone differences can change sorting or timestamps. Query \`SHOW server_encoding\`, \`SHOW TimeZone\`, and relevant collation metadata when those contracts matter. Configure them through supported PostgreSQL mechanisms rather than issuing session settings in only one test client.

Include non-ASCII seed values, daylight-saving boundaries, and case-sensitive unique keys only where the product relies on them. These are focused migration and repository checks, not reasons to duplicate the entire suite under every locale.

## Test failure atomicity for DDL and data backfills

PostgreSQL supports transactional DDL for many operations, which lets migration tools roll back a failed migration. Some commands and tool configurations require execution outside a transaction. Know which category each migration occupies. A partially applied nontransactional migration needs an explicit recovery plan.

Create a focused destructive test only in the disposable container: apply the previous version, seed data that triggers the known failure condition, run the migration, and inspect schema plus migration metadata afterward. The test should confirm whether rollback leaves the old version usable or whether deployment must stop for manual recovery.

Large backfills may lock tables or exceed a deployment window. An integration test cannot reproduce production volume, but it can verify batching logic, resumable checkpoints, and compatibility between old application code and the intermediate schema. Performance claims require representative environments and should be reported as measurements, not universal timings.

## Seed data after structure unless data is part of migration history

Reference rows required by the application can be inserted by versioned migrations when their lifecycle is truly schema-adjacent, for example a fixed permission catalog. Test-only customers and orders belong in fixtures after migration. Mixing them into init SQL makes every suite carry irrelevant data and can conflict with uniqueness cases.

Use parameterized SQL through the client for test data. Keep deterministic natural keys where assertions need them, and generated unique IDs for parallel isolation. Seed parent records before children and delete in dependency-aware order, or rely on a proven transaction boundary.

Snapshotting a fully migrated database can accelerate very large suites, but validate the snapshot's migration-table version and rebuild it whenever migrations change. Never allow a stale snapshot to skip the migration under test.

## Exercise upgrade compatibility between application versions

Zero-to-latest migration tests miss rolling-deployment compatibility. During a production rollout, old application instances may run briefly against the new schema. For additive changes, start from the released schema, apply the next migration, and run a small repository contract from both old and new code when feasible.

Renaming or dropping a column usually needs an expand-and-contract sequence. First add the new shape while preserving the old, deploy code that can handle both, backfill, then remove the obsolete shape in a later release. Testcontainers can create a database at each phase and let contract tests prove which application version remains compatible.

Keep these checks focused on queries that cross the migration boundary. Duplicating the entire product suite for every historical application version is expensive and hard to maintain. The migration plan should list required compatibility pairs, and CI can execute those pairs with pinned build artifacts or repository revisions in a controlled pipeline.

Also verify connection-pool behavior after a schema change that invalidates prepared statements or cached metadata. A fresh test connection cannot expose every long-lived connection issue. Where the driver and deployment topology make this relevant, prepare a statement before migration, apply the change through another connection, and assert the documented recovery behavior.

## Frequently Asked Questions

### Do PostgreSQL init scripts run every time the container starts?

They run when the official image initializes an empty data directory. With a reused or persistent data volume, they do not rerun. Disposable Testcontainers instances normally begin empty unless reuse or mounts change that assumption.

### Should I put every versioned migration in docker-entrypoint-initdb.d?

Usually no. Run versioned migrations through the production migration tool so ordering, metadata, and failure behavior match deployment. Reserve image initialization for genuine bootstrap concerns.

### How do I know migrations finished before tests execute?

Await the migration runner in setup, then query a readiness invariant such as the latest migration record. Do not launch migrations asynchronously beside the tests.

### Is one PostgreSQL container per test necessary?

Not always. One per file or worker with reliable transaction, schema, or data isolation is often faster. Choose based on whether tested code commits across independent connections.

### Why did the init script work locally but not with container reuse?

The reused data directory was already initialized, so the image skipped entrypoint scripts. Disable reuse for schema-bootstrap tests or explicitly version and migrate the reused database.
`,
};
