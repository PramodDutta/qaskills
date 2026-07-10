import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Postgres Migration Testing Guide',
  description: 'Postgres migration testing guide for validating schema changes, rollback safety, lock risk, data integrity, and backward-compatible releases.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Postgres Migration Testing Guide

The migration passed on an empty database and locked the production orders table for nine minutes. That is the difference between syntax testing and migration testing. Postgres will happily accept a statement that is correct SQL and still dangerous for the data shape, traffic pattern, or deployment order you actually run.

Migration tests should answer four questions before release: does the migration apply to a realistic previous schema, does existing data survive with the intended shape, can old and new application versions coexist during rollout, and is the rollback or forward-fix plan credible? A unit test around the query builder is not enough.

For containerized database fixtures, use [a Testcontainers Postgres Node guide](/blog/testcontainers-postgres-node-guide). For cross-service expectations around data shape, pair migration checks with [a data contract testing guide for 2026](/blog/data-contract-testing-guide-2026).

## Test the migration against the schema users actually have

A migration file is a delta. Testing it against a freshly created latest schema misses the point. The test should start from the previous released schema, seed representative data, apply the migration, and assert the result. If your migration tool supports migrating to a specific version, use that. If not, keep a fixture SQL file for the prior state.

| Migration type | Data risk | Test focus |
|---|---|---|
| Add nullable column | Low structural risk | Default application behavior and read compatibility |
| Add non-null column with default | Table rewrite or lock risk depending on version and expression | Existing rows, default value, deployment timing |
| Split column | Data transformation risk | Backfill correctness and dual-read period |
| Add index | Lock and duration risk | Concurrent index strategy and query plan |
| Drop column | Backward compatibility risk | Old app version does not read it during rollout |

The following test uses Testcontainers for Node and the \`pg\` client. It starts Postgres, creates the old schema, seeds data, applies a migration, and verifies data integrity.

\`\`\`ts
import assert from 'node:assert/strict';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';

const oldSchema = \`
  create table customers (
    id uuid primary key,
    email text not null,
    full_name text not null
  );

  insert into customers (id, email, full_name)
  values ('00000000-0000-0000-0000-000000000001', 'maya@example.test', 'Maya Rao');
\`;

const migration = \`
  alter table customers add column first_name text;
  alter table customers add column last_name text;

  update customers
  set first_name = split_part(full_name, ' ', 1),
      last_name = nullif(substring(full_name from position(' ' in full_name) + 1), '');
\`;

const container = await new PostgreSqlContainer('postgres:16-alpine').start();
const client = new pg.Client({ connectionString: container.getConnectionUri() });

try {
  await client.connect();
  await client.query(oldSchema);
  await client.query(migration);

  const result = await client.query(
    'select email, first_name, last_name from customers where email = $1',
    ['maya@example.test'],
  );

  assert.equal(result.rows[0].first_name, 'Maya');
  assert.equal(result.rows[0].last_name, 'Rao');
} finally {
  await client.end();
  await container.stop();
}
\`\`\`

This is not a generic database smoke test. It verifies the exact transformation that can corrupt customer names if written carelessly.

## Backward compatibility is a deployment property

Many teams deploy app and database changes separately. During a rolling deployment, old and new application versions may run against the same database. A migration that works after all pods restart can still break while half the fleet is old.

Use expand and contract thinking. First add structures in a way old code tolerates. Then deploy code that writes both or reads new shape. Then backfill. Then switch reads. Only later drop old structures.

| Change | Compatible first step | Unsafe shortcut |
|---|---|---|
| Rename column | Add new column, dual-write, backfill, switch reads, drop old column later | \`alter table rename column\` while old app still reads old name |
| Tighten nullability | Backfill, add validation checks, then set not null | Add \`not null\` before old writers populate the value |
| Change enum values | Add new value before code emits it | Deploy code that writes unknown enum first |
| Split table | Create new table and sync data during transition | Move data and remove old table in one deploy |
| Drop index | Verify no active query plan needs it | Drop during peak because tests still pass |

A migration test can simulate compatibility by running old-version queries after the migration. If old code will still execute for several minutes, prove those queries continue to work.

\`\`\`ts
import assert from 'node:assert/strict';
import pg from 'pg';

async function oldAppReadCustomer(client: pg.Client, id: string) {
  return client.query('select id, email, full_name from customers where id = $1', [id]);
}

async function newAppReadCustomer(client: pg.Client, id: string) {
  return client.query(
    'select id, email, first_name, last_name, full_name from customers where id = $1',
    [id],
  );
}

const id = '00000000-0000-0000-0000-000000000001';

await client.query('begin');
try {
  await client.query(migration);

  const oldResult = await oldAppReadCustomer(client, id);
  const newResult = await newAppReadCustomer(client, id);

  assert.equal(oldResult.rows[0].full_name, 'Maya Rao');
  assert.equal(newResult.rows[0].first_name, 'Maya');

  await client.query('rollback');
} catch (error) {
  await client.query('rollback');
  throw error;
}
\`\`\`

Wrapping in a transaction is useful for test cleanup when the migration permits it. Some real migrations, such as concurrent index creation, cannot run inside a transaction block. Your test harness should respect Postgres rules instead of forcing every migration through the same wrapper.

## Lock behavior deserves its own review

Postgres migrations fail production most painfully through locks and long rewrites. A migration test on tiny data will not prove production duration, but it can catch obviously unsafe statements and enforce patterns.

| Operation | Risk | Safer pattern |
|---|---|---|
| \`create index\` on a large active table | Blocks writes during index build | \`create index concurrently\` outside a transaction |
| Adding column with volatile default | Table rewrite or expensive evaluation | Add nullable column, backfill, then add default |
| Large single update | Long locks and replication lag | Batch backfill by primary key ranges |
| Adding foreign key immediately validated | Full table scan and lock pressure | Add constraint not valid, validate later when appropriate |
| Dropping column used by old app | Runtime errors | Contract phase after code no longer references it |

Static checks can help. For example, flag \`CREATE INDEX\` without \`CONCURRENTLY\` in migrations touching known large tables. That does not replace DBA review, but it catches mistakes before a human sees the pull request.

## Data integrity assertions should be domain-specific

Counting rows before and after is not enough. If a migration splits names, assert names. If it moves invoices, assert totals. If it changes status values, assert the mapping. The test should encode the business invariant at risk.

For financial tables, assert sums by account and currency. For permissions, assert effective access for representative users. For audit logs, assert timestamps and actor ids survive. Migration tests are strongest when seeded data includes edge cases: nulls, old enum values, duplicate-like records, maximum lengths, and records from previous product eras.

Avoid generating only pristine data. Production databases carry historical compromises. If a migration assumes every \`full_name\` contains a space, seed one name without a space and one with extra whitespace.

## Rollback testing is not always down migration worship

Some teams require down migrations. Others prefer forward fixes. Either policy can work if it is explicit and tested. The release risk is not the absence of a down file. The risk is discovering during an incident that nobody knows how to recover.

| Policy | Test expectation | Operational note |
|---|---|---|
| Reversible migration | Apply up, assert, apply down, assert old shape | Works best for structural changes without destructive data loss. |
| Forward-only with repair | Apply up, simulate failure, apply fix migration | Common for complex production databases. |
| Backup restore | Verify restore process separately | Recovery time matters more than SQL elegance. |
| Blue-green database | Validate cutover and fallback routing | Higher infrastructure cost. |
| Manual DBA runbook | Runbook has rehearsed commands and checks | Do not leave it as tribal memory. |

For destructive changes, a down migration may create false confidence. Dropping a column and then recreating it does not restore the lost values. In those cases, test the expand-contract path and backup or archival strategy.

## Migration test data management

Keep migration fixtures close to the migrations they protect. A giant shared seed file makes it hard to know which rows matter. Small, named fixtures are easier to review: \`customers_before_name_split.sql\`, \`orders_before_status_enum_change.sql\`, and so on.

Use realistic constraints. If production has foreign keys, unique indexes, and check constraints, the old schema fixture should have them too. Otherwise the test can pass with data that production would never contain or fail to catch constraint interactions.

When migrations are generated by an ORM, still read the SQL. ORM-generated migrations can be correct for an empty development database and poor for a large live table. The test should execute the generated SQL, not a hand-written imitation.

## Backfills need progress and restart tests

Schema changes often ship with a backfill. The dangerous part is not only the SQL transformation. It is whether the job can run in batches, resume after failure, avoid rewriting the same rows forever, and leave the application correct while partial progress exists.

A backfill test should seed rows in several states: already migrated, unmigrated, malformed but tolerated, and newly written during the transition. Then run the backfill twice. The second run should be idempotent. If the second run changes counts unexpectedly, the production job may be unsafe to retry.

| Backfill concern | Test assertion | Production reason |
|---|---|---|
| Idempotency | Running the job twice produces the same final rows | Jobs are retried after deploy failures. |
| Batching | Each batch advances by primary key or stable cursor | Long transactions increase lock and replication risk. |
| Partial state | New application reads both old and new columns | Users interact while backfill is still running. |
| Error handling | Bad row is reported without halting all progress when policy allows | Historical data is rarely perfect. |
| Completion check | Remaining unmigrated count reaches zero | Release owner needs a clear cutover signal. |

Do not hide backfills inside application startup. A migration that starts a long data rewrite when the first web process boots is hard to observe and hard to stop. Prefer an explicit job with logs, metrics, and a safe restart story.

\`\`\`ts
async function backfillCustomerNames(client: pg.Client, limit: number) {
  await client.query(
    \`update customers
     set first_name = split_part(full_name, ' ', 1),
         last_name = nullif(substring(full_name from position(' ' in full_name) + 1), '')
     where first_name is null
     and id in (
       select id from customers where first_name is null order by id limit $1
     )\`,
    [limit],
  );
}

await backfillCustomerNames(client, 100);
await backfillCustomerNames(client, 100);

const remaining = await client.query('select count(*)::int as count from customers where first_name is null');
assert.equal(remaining.rows[0].count, 0);
\`\`\`

This test is small, but it verifies restart behavior. In production, the same principle should be backed by progress metrics and operational alerts.

## Extensions, permissions, and replicas are part of the surface

A migration can pass in a local superuser database and fail in staging because the deploy role lacks permission to create an extension, alter an owned type, or validate a constraint. It can pass on the primary and hurt read replicas through replication lag. QA should make those environment assumptions visible.

| Environment assumption | Test or review action |
|---|---|
| Required extension exists | Apply migration in a database that matches provisioned extensions. |
| Deploy role has limited privileges | Run migrations with the same role used in CI or staging. |
| Read replicas serve traffic | Estimate backfill volume and monitor replication delay. |
| Application uses prepared statements | Test compatibility when column types change. |
| Logical replication or CDC exists | Verify downstream consumers tolerate schema transition. |

This is where migration testing intersects with release engineering. The SQL file is only one artifact. The role, database version, extension set, and traffic topology decide whether it is safe.

## Reviewing generated ORM migrations

ORM migration generators are productive, but they do not understand your production table size or rollout sequence. Review generated SQL for renames detected as drop-add pairs, blocking index creation, broad updates, and constraint validation. If the generated migration is unsafe, edit it. The database does not care that a tool produced it.

Keep a checklist in pull requests for risky migrations: previous schema tested, representative data seeded, compatibility with old app checked, lock-sensitive statements reviewed, backfill restart behavior proven, rollback or forward fix documented. That checklist is short enough to use and specific enough to catch real incidents.

## Observe the migration after it ships

Pre-release tests reduce risk, but production still needs migration observability. Add logging around start, finish, rows touched, batch number, and failure reason. For long backfills, emit progress metrics that show remaining rows and batch duration. That gives the release owner a way to decide whether to continue, pause, or roll forward with a fix.

Post-deploy checks should match the migration's intent. If a column was backfilled, query the unmigrated count. If an index was added for a slow query, inspect the query plan or performance signal. If a constraint was validated, confirm the validation completed. A migration is not done just because the deploy step exited zero.

This is also where QA can add value outside code. Ask for the exact production verification query before release. If nobody can write it, the migration's success criteria are not clear enough.

For very large tables, add a dry-run estimate to the review: expected rows touched, batch size, lock-sensitive statements, and rollback decision point. The estimate will be approximate, but writing it down exposes unsafe assumptions before deployment night.

Clear verification queries also make handoff easier when database and application owners are different people.

## Frequently Asked Questions

### Should every migration have an integration test?

Every risky migration should. Adding a nullable column to a small table may only need review. Transformations, drops, constraints, indexes on large tables, and compatibility-sensitive changes deserve executable tests.

### Can I run Postgres migration tests against SQLite?

No for serious migration coverage. Postgres locking, constraints, JSONB, indexes, transactions, and SQL dialect behavior differ. Use a real Postgres instance, often through containers.

### How do I test \`create index concurrently\`?

Run it against Postgres outside a transaction block, because Postgres does not allow concurrent index creation inside a transaction. Your migration harness may need per-migration transaction settings.

### What is the best rollback test?

The best test matches your operational policy. If you use down migrations, apply up and down against seeded data. If you use forward fixes, rehearse the fix path and prove data can be recovered or safely ignored.

### Why did a migration pass tests but fail in production?

Common gaps are unrealistic row counts, missing old data shapes, lock behavior not reviewed, old app versions still running, or environment-specific extensions and permissions. Add a regression fixture for the missed condition.
`,
};
