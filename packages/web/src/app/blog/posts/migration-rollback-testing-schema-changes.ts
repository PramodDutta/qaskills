import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Migration Rollbacks: Down Scripts, Data Loss, and Locks',
  description: 'migration rollback testing workflow for down scripts, data loss checks, lock timing, and CI gates so teams can reverse schema changes safely.',
  date: '2026-08-28',
  category: 'Migration',
  content: `
# Testing Migration Rollbacks: Down Scripts, Data Loss, and Locks

Migration rollback testing means proving that a database schema change can be reversed without corrupting data, blocking production traffic, or leaving application code pointed at the wrong shape. A useful rollback test does not only run the down script. It creates realistic data, applies the up migration, exercises reads and writes, rolls back, and checks data, constraints, indexes, locks, and application behavior.

The practical goal is simple: when a migration fails in production, the team already knows whether rollback is safe, unsafe, or intentionally impossible. That answer needs evidence before the deploy window, not during an incident.

## The Rollback Contract You Actually Need

A rollback contract is a small written agreement between the schema change, the application release, and the operator running the deploy. It says what state can be reversed, what state cannot be reversed, and which checks decide the difference.

Many teams treat migration rollback testing as a binary question: does the down script run? That is too weak. A down script can run cleanly while deleting important columns, widening locks, rebuilding indexes for minutes, or breaking the previous app version because the data has already been transformed. The contract should classify every migration into one of three shapes.

| Migration shape | Rollback expectation | Test focus | Release policy |
|---|---|---|---|
| Additive | Down script can remove new objects before they are used | Object removal, old app compatibility, lock duration | Safe to roll back if no writes depend on new fields |
| Transforming | Rollback may require copied data or dual writes | Data equivalence, trigger behavior, old and new reads | Needs staged rollout and verified backfill reversal |
| Destructive | Rollback cannot restore lost information from the database alone | Backup restore path, export snapshot, operator warning | Down script should fail loudly or require an explicit restore plan |

The point is not to force every migration to be reversible. Some changes should not have a pretend down script. Dropping a column that has already accepted writes cannot be reversed by recreating the column. The data is gone unless you captured it somewhere else. A disciplined down script either restores from a preserved copy, performs a verified inverse transform, or refuses to run with a clear error.

I like to put this comment at the top of irreversible migrations:

\`\`\`sql
-- This rollback is intentionally blocked after production writes.
-- Restore from the pre-migration backup if rollback is required.
DO $$
BEGIN
  RAISE EXCEPTION 'Irreversible migration: customer_notes was dropped after export';
END $$;
\`\`\`

That code is blunt, and blunt is useful. It prevents the most dangerous failure mode: a comforting rollback command that silently creates an empty column and lets the incident continue with partial data.

## Build a Fixture That Can Catch Loss

Rollback tests need data that makes loss visible. A fixture with one row and no edge cases proves almost nothing. Use rows that stress nulls, long strings, duplicate natural keys, Unicode, old enum values, foreign keys, pending transactions, and records created during the compatibility window.

For example, a migration that splits \`users.full_name\` into \`given_name\` and \`family_name\` looks easy until you test mononyms, extra spaces, suffixes, and names entered by an older app version after the new columns exist. Your fixture should include those rows before the up migration and then insert more rows between up and down.

| Data condition | Why it matters during rollback | Example check |
|---|---|---|
| Null and empty values | Down scripts often confuse missing with blank | Compare null counts before and after |
| Boundary lengths | Recreated columns may use a shorter type | Insert max length values before rollback |
| Referential rows | Dropped constraints may not be restored correctly | Verify orphan count remains zero |
| Rows written after up | Old state may not know how to represent new writes | Decide whether rollback blocks or maps them |
| Duplicate candidates | Recreated unique indexes can fail late | Seed duplicates before index recreation |

A minimal PostgreSQL fixture can be plain SQL. Keep it checked in beside the migration test so failures are reviewable.

\`\`\`sql
BEGIN;

CREATE TABLE accounts (
  id bigint PRIMARY KEY,
  email text NOT NULL UNIQUE,
  full_name text,
  status text NOT NULL CHECK (status IN ('active', 'paused', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO accounts (id, email, full_name, status, created_at) VALUES
  (1, 'ada@example.test', 'Ada Lovelace', 'active', '2026-08-01T10:00:00Z'),
  (2, 'prince@example.test', 'Prince', 'paused', '2026-08-02T10:00:00Z'),
  (3, 'spaced@example.test', '  Grace   Hopper  ', 'active', '2026-08-03T10:00:00Z'),
  (4, 'empty@example.test', '', 'closed', '2026-08-04T10:00:00Z'),
  (5, 'null@example.test', NULL, 'active', '2026-08-05T10:00:00Z');

COMMIT;
\`\`\`

This fixture is not realistic because it has five rows. It is realistic because it contains the cases the migration logic is likely to mishandle. Scale tests can add volume later. Correctness tests need sharp rows first.

For foreign key work, connect rollback testing with [database cascade delete behavior](/blog/database-testing-cascade-delete-behavior), because a down script that restores a constraint with the wrong \`ON DELETE\` action can pass schema diff checks and still delete the wrong records next week.

## Use a Repeatable Up, Exercise, Down, Verify Loop

A migration rollback test should run the same sequence every time. Do not ask a developer to remember the order manually. Make the test create a database, apply the baseline, snapshot important facts, run up, perform writes, run down, and compare results.

Here is a compact Node script that uses \`pg\`. It expects a disposable PostgreSQL database and migration SQL files on disk. It is intentionally boring because rollback testing fails when the harness is clever.

\`\`\`ts
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';

type QueryValue = string | number | boolean | null;

async function queryRows(client: Client, sql: string, params: QueryValue[] = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

async function runSqlFile(client: Client, path: string) {
  const sql = await readFile(path, 'utf8');
  await client.query(sql);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await runSqlFile(client, 'test-fixtures/accounts-baseline.sql');

    const before = await queryRows(client, \`
      SELECT id, email, full_name, status
      FROM accounts
      ORDER BY id
    \`);

    await runSqlFile(client, 'migrations/20260827090000_split_full_name.up.sql');

    await client.query(\`
      INSERT INTO accounts (id, email, given_name, family_name, status)
      VALUES (6, 'new@example.test', 'New', 'Writer', 'active')
    \`);

    await runSqlFile(client, 'migrations/20260827090000_split_full_name.down.sql');

    const after = await queryRows(client, \`
      SELECT id, email, full_name, status
      FROM accounts
      WHERE id <= 5
      ORDER BY id
    \`);

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error(\`Rollback changed pre-existing rows: \${JSON.stringify({ before, after })}\`);
    }

    const newRow = await queryRows(client, \`
      SELECT full_name
      FROM accounts
      WHERE id = 6
    \`);

    if (newRow[0]?.full_name !== 'New Writer') {
      throw new Error('Rollback did not map post-up writes back to full_name');
    }
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
\`\`\`

This style catches the thing a unit test misses: the application can write during the interval between up and down. If the old schema cannot represent those writes, the rollback contract should say so and the down migration should block after new-write detection.

## Write Down Scripts as Production Code

Down scripts deserve the same review as up scripts. They can be harder to write because they execute under stress, often after a failed deploy, sometimes while operators are trying to reduce customer impact.

The down script below reverses a split column migration. It recreates the old column, maps current data, checks for unsafe rows, restores the old not-null shape only after data is present, and then drops the new columns.

\`\`\`sql
BEGIN;

ALTER TABLE accounts
  ADD COLUMN full_name text;

UPDATE accounts
SET full_name = trim(both ' ' FROM concat_ws(' ', given_name, family_name));

DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*)
  INTO missing_count
  FROM accounts
  WHERE full_name IS NULL
    AND status <> 'closed';

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Rollback blocked: % active accounts cannot rebuild full_name', missing_count;
  END IF;
END $$;

ALTER TABLE accounts
  DROP COLUMN given_name,
  DROP COLUMN family_name;

COMMIT;
\`\`\`

Notice the guard. It is not decorative. It defines the acceptable loss boundary. If closed accounts can have missing names but active accounts cannot, the down script says that in executable form.

What people get wrong in practice: they test the down migration against the pre-up fixture only. That means the down script never sees data produced by the new app. The first real rollback then hits a value the old schema cannot represent. A better test inserts rows through the new code path before rollback, even if the rollout plan says rollback should happen quickly.

## Prove Locks Before the Deploy Window

Rollback testing must include lock behavior because a rollback can hurt more than the failed migration. The down script might rebuild an index, rewrite a table, validate a constraint, or wait behind a long reader. On PostgreSQL, many \`ALTER TABLE\` operations take locks that block writes. Some operations are fast on an empty local database and painful on a large table.

Do not guess. Measure against a loaded database or a production-size clone. When that is not available, at least run a lock probe with one session holding a read or write and another session attempting the rollback.

| Operation | Common lock risk | Safer pattern to test |
|---|---|---|
| Drop column | Table metadata lock, possible dependent object failures | Separate code compatibility from destructive cleanup |
| Add not-null column | Table scan or rewrite depending on database and version | Add nullable, backfill, validate, then enforce |
| Create index | Write blocking if not concurrent in PostgreSQL | Use concurrent index creation where supported |
| Validate foreign key | Long validation on large child table | Add constraint not valid, then validate later |
| Rename column | Short lock, high app compatibility risk | Use expand and contract instead of rename across releases |

A lock probe can be a pair of SQL sessions. The first holds work open.

\`\`\`sql
BEGIN;

UPDATE accounts
SET status = 'paused'
WHERE id = 1;

SELECT pg_sleep(30);

ROLLBACK;
\`\`\`

The second session sets a short lock timeout and attempts the rollback.

\`\`\`sql
SET lock_timeout = '2s';
SET statement_timeout = '10s';

BEGIN;

ALTER TABLE accounts
  DROP COLUMN given_name,
  DROP COLUMN family_name;

COMMIT;
\`\`\`

If that second session fails on the lock timeout, you learned something useful. The rollback is not free. You can now change the plan: pause writes for that table, split the rollback into smaller steps, or choose a forward fix instead of a down migration.

## Compare Shape, Data, and Behavior

Schema diff is necessary, but it is not enough. After rollback, verify shape, data, constraints, indexes, privileges, and behavior. Privileges matter because migration frameworks often run as a powerful owner while the app connects as a limited user. A rollback that recreates a table can drop grants and pass every owner-level query.

| Verification layer | Query or test | Failure it catches |
|---|---|---|
| Columns and types | Inspect \`information_schema.columns\` | Wrong type, nullable flag, default |
| Constraints | Inspect database catalog tables | Missing check, wrong foreign key action |
| Indexes | Explain a representative query | Recreated index missing or nonselective |
| Data | Compare checksums over important columns | Truncation, nulling, duplicate collapse |
| App behavior | Run old app smoke tests | Code cannot read restored shape |
| Privileges | Connect as app role | Missing grants after recreated objects |

For checksums, prefer deterministic summaries. Do not compare raw dumps if the table contains updated timestamps or sequence-generated values that are expected to change.

\`\`\`sql
SELECT
  count(*) AS row_count,
  md5(string_agg(
    id::text || ':' ||
    coalesce(email, '<null>') || ':' ||
    coalesce(full_name, '<null>') || ':' ||
    status,
    ',' ORDER BY id
  )) AS account_digest
FROM accounts;
\`\`\`

The checksum is not a cryptographic assurance of business correctness. It is a quick tripwire. Pair it with targeted assertions for high-value fields and with smoke tests through the app code.

If the schema change affects vector tables, chunk metadata, or embedding storage, treat rollback as a data model migration rather than a plain column change. The same rule applies to [RAG embedding dimension migration](/blog/rag-testing-embedding-dimension-migration): prove old readers, new writers, mixed dimensions, and reindexing behavior before trusting a rollback story.

## Make CI Run the Dangerous Path

Rollback tests belong in CI, but not always in the fastest lane. A good setup has a short gate for every pull request and a heavier database job before merge or nightly. The pull request job should run focused migrations against sharp fixtures. The heavier job should include volume, lock probes, and old-version application smoke tests.

\`\`\`yaml
name: migration-rollback

on:
  pull_request:
    paths:
      - 'migrations/**'
      - 'src/db/**'
      - '.github/workflows/migration-rollback.yml'

jobs:
  rollback:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: app_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/app_test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:migration-rollback
\`\`\`

The workflow is plain because the policy is where the value lives. If any migration introduces a down script, CI executes it. If a migration is irreversible, CI expects an explicit irreversible marker and a restore plan document. If a migration touches a high-traffic table, CI runs the lock probe.

You can also make an AI coding agent run the same harness while it edits migrations. Ready-made QA skills install from qaskills.sh with the qaskills CLI, but the important part is the contract: the agent should not call the migration done until it has executed the rollback path and summarized the risk.

## A Failure Story: The Rollback That Recreated an Empty Column

Symptom: a checkout deploy failed after the app release because the payment service expected \`orders.tax_breakdown\`, but one region still returned the old response. The operator rolled back the migration. The database command succeeded. Five minutes later, refund calculation started returning zeros for recent orders.

Wrong theory: the team blamed a bad cache because only recent orders were wrong. They restarted workers and cleared Redis. The symptom stayed.

Actual cause: the down script did this:

\`\`\`sql
ALTER TABLE orders
  ADD COLUMN tax_total numeric(12, 2);

ALTER TABLE orders
  DROP COLUMN tax_breakdown;
\`\`\`

It recreated \`tax_total\` but never populated it from \`tax_breakdown\`. Older rows had \`tax_total\` from before the up migration, but rows created during the new release window only had \`tax_breakdown\`. The rollback converted those new rows into rows with null tax. The app handled null as zero.

Fix: the team restored affected rows from the pre-rollback backup and replaced the down script with an inverse transform:

\`\`\`sql
ALTER TABLE orders
  ADD COLUMN tax_total numeric(12, 2);

UPDATE orders
SET tax_total = (
  SELECT coalesce(sum((line->>'amount')::numeric), 0)
  FROM jsonb_array_elements(tax_breakdown) AS line
)
WHERE tax_total IS NULL
  AND tax_breakdown IS NOT NULL;

DO $$
DECLARE
  missing_count integer;
BEGIN
  SELECT count(*)
  INTO missing_count
  FROM orders
  WHERE tax_total IS NULL
    AND tax_breakdown IS NOT NULL;

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'Rollback blocked: tax_total could not be rebuilt for % orders', missing_count;
  END IF;
END $$;
\`\`\`

The durable fix was not the SQL alone. They added a rollback test that inserted an order between up and down, then asserted that refund calculation through the old code returned the same total. That one test would have caught the incident.

## Decide When Forward Fix Beats Rollback

Rollback is not always the right recovery. For many database failures, the safer response is a forward migration that restores compatibility without trying to undo time. If the new app has already written valid data in the new shape, a forward fix can preserve that data while allowing old readers to function.

Use a forward fix when rollback requires lossy mapping, long exclusive locks, or a table rewrite under live traffic. Use rollback when the up migration failed before new writes, when the old app is still deployed, or when the new schema blocks the service from starting.

| Incident condition | Prefer rollback | Prefer forward fix |
|---|---:|---:|
| Up migration failed before commit | Yes | No |
| New app wrote data in new columns | Sometimes | Often |
| Down script drops data | No | Yes |
| Rollback needs long write-blocking lock | Rarely | Often |
| Old app cannot boot against new schema | Often | Sometimes |
| Backup restore is required | Only with operator approval | Often |

Testing helps here because it turns a late argument into a prepared decision. The rollback test output should say more than pass or fail. It should report whether data was preserved, whether locks exceeded the threshold, and whether old app smoke tests passed.

## Review Checklist for Down Scripts

Use this checklist in code review. It is short enough to apply every time and specific enough to catch real defects.

1. The down script has been executed against a disposable database, not only read.
2. The test inserts or updates rows after the up migration and before the down migration.
3. The rollback preserves pre-existing data or blocks with a clear error.
4. Recreated columns restore type, nullability, default, comments, privileges, and constraints.
5. Recreated indexes are checked against representative queries.
6. Foreign keys restore the same delete and update actions.
7. Lock and statement timeouts are set during the test.
8. Old application code can read and write after rollback.
9. Irreversible migrations are marked as irreversible and reference the backup restore plan.
10. CI runs the rollback test for every migration that changes existing data or constraints.

The best rollback test is not dramatic. It is repeatable, a little suspicious, and willing to fail before humans are under pressure.

## Frequently Asked Questions

### Should every database migration have a down script?

No. Every migration should have a rollback plan, but not every migration should pretend to be reversible. Additive migrations usually deserve a working down script. Transforming migrations need inverse data checks or a staged compatibility path. Destructive migrations often should block rollback and point to a backup restore procedure. A fake down script is worse than no down script because it creates confidence while losing data.

### How do I test rollback when production data is too large to copy?

Use two layers. First, run sharp fixture tests in CI with rows designed to expose loss, constraint mistakes, and compatibility failures. Second, run scheduled tests against a masked production-size clone or a sampled clone that preserves table sizes and index distribution. If clone access is impossible, use catalog estimates and lock probes, then mark the result as lower confidence in the release notes.

### What should fail a migration rollback test?

Fail on changed pre-existing business data, unmapped post-up writes, missing constraints, wrong nullability, lost indexes, missing grants, old app smoke-test failures, and lock waits over your deploy threshold. Also fail when an irreversible migration has a runnable down script that recreates empty structures. That is data loss disguised as recovery. The test should force the author to choose a real restore plan.

### Is rollback testing still needed with blue-green deployments?

Yes, because blue-green protects application routing, not database time. Once both environments point at the same database, a schema change can still break the old version or lose data written by the new version. Blue-green works best with expand and contract migrations: add compatible structures, deploy code, backfill, then remove old structures later. Rollback tests prove those compatibility assumptions before traffic moves.
`,
};
