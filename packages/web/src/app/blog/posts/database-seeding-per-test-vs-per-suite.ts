import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Database Seeding per Test vs per Suite',
  description:
    'Compare database seeding per test vs per suite, including transaction rollback, fixture ownership, parallel workers, and hybrid patterns for reliable fast suites.',
  date: '2026-07-13',
  category: 'Comparison',
  content: `
# Database Seeding per Test vs per Suite

At test 137, an assertion expects three active subscriptions and finds four. The extra row came from test 42, which passed hours earlier on a developer laptop but ran immediately before this case in CI. Whether that failure is possible is largely determined by seed frequency and cleanup boundaries.

Seeding per test buys a fresh, explicit starting state. Seeding per suite amortizes setup but makes every case a tenant of shared mutable data. Neither policy is universally correct. The right choice depends on database reset cost, process topology, the kinds of writes under test, and how clearly the team can enforce ownership of shared fixtures.

## The isolation boundary is the real decision

The phrase seed per test can describe several mechanisms. One team truncates and reloads tables before each case. Another creates a transaction, inserts only required rows, and rolls it back afterward. A third provisions a database from a template. Their performance and fidelity differ sharply even though the logical promise is the same: each test begins from a known state unaffected by previous cases.

Per-suite seeding also has variants. Data may be loaded once for a file, once for a worker process, once for the entire CI job, or once into an environment reused by several jobs. As the boundary grows, setup is cheaper per case and coordination risk rises.

| Seed boundary | Isolation | Typical setup cost | Parallel requirement |
|---|---|---|---|
| Every test with rollback | High for transactional code | Low after connection is ready | Separate connection or transaction per worker |
| Every test with truncate and insert | High, including committed writes | Medium to high | Database per worker or serialized resets |
| Every test file | Moderate | Moderate | File-scoped schema or worker ownership |
| Every worker process | Moderate when data is immutable | Low | Unique database or schema per worker |
| Entire suite | Low for mutable records | Lowest amortized cost | Strict row ownership and collision-free keys |

The comparison should therefore be framed as an isolation contract, not a single setup hook preference.

## Per-test seeds make causality visible

A case that inserts its own account, plan, and invoice documents its prerequisites in executable form. When it fails, the investigator needs to reason about the case and its fixture builder, not a thousand-line global dataset plus an unknown execution history.

This approach is strongest when tests exercise mutations, constraints, cascades, background processing, or status transitions. It naturally supports random test order and selective execution. Running one test from an editor behaves like running it in the whole suite because the starting state is reconstructed.

The cost can be significant if setup naively reloads a production-shaped snapshot. Good per-test seeding is normally narrow. Insert the minimum relational graph necessary for the behavior, and use builders with explicit overrides. Defaults should be valid but boring. A test for an expired subscription should say expiresAt: yesterday instead of relying on a globally named customer that happens to be expired.

Here is a Vitest example using node-postgres. A transaction begins before each test, seed helpers use the same checked-out client, and rollback removes every write. This is a real API pattern, with one important constraint: application queries in the test must use this client or a transaction-aware injection path.

\`\`\`typescript
import { Pool, type PoolClient } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createInvoiceRepository } from '../src/invoice-repository';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
let client: PoolClient;

beforeAll(async () => {
  await pool.query('select 1');
});

beforeEach(async () => {
  client = await pool.connect();
  await client.query('begin');
});

afterEach(async () => {
  await client.query('rollback');
  client.release();
});

afterAll(async () => {
  await pool.end();
});

describe('invoice repository', () => {
  it('returns only overdue invoices for the account', async () => {
    await client.query(
      'insert into accounts (id, name) values ($1, $2)',
      ['acct-17', 'Northwind Test'],
    );
    await client.query(
      \`insert into invoices (id, account_id, due_at, paid_at)
       values ($1, $2, $3, null), ($4, $2, $5, null), ($6, $2, $7, now())\`,
      [
        'inv-overdue', 'acct-17', '2026-01-01',
        'inv-future', '2027-01-01',
        'inv-paid', '2026-01-02',
      ],
    );

    const repository = createInvoiceRepository(client);
    const result = await repository.findOverdue('acct-17', new Date('2026-07-13'));

    expect(result.map((invoice) => invoice.id)).toEqual(['inv-overdue']);
  });
});
\`\`\`

This is fast because rollback is cheaper than truncating tables, but it cannot represent every system. If application code opens another connection, commits independently, or hands work to a queue consumer, those writes sit outside the wrapping transaction. A test can pass while leaving residue behind.

## Per-suite data rewards immutability

Seeding once works well for reference datasets that cases only read: country codes, tax rules, feature definitions, product catalogs, or a fixed authorization matrix. Loading those records before every case wastes work without increasing isolation if no case is allowed to mutate them.

The danger begins when a convenient global user becomes everybody's target. One test suspends it, another changes its locale, and a third counts its orders. Cleanup code attempts to restore properties but misses a newly added column. The suite becomes order-dependent while each case looks locally reasonable.

A defensible suite-scoped seed has rules:

- Shared rows are read-only to tests.
- Mutable entities are created with case-owned identifiers.
- The database is reset before the suite, not assumed clean from a previous run.
- Parallel workers cannot choose the same keys or mutate the same namespace.
- Schema migrations complete before the seed is loaded.
- Teardown is a safety net, while setup establishes correctness.

The following Jest-style pattern loads immutable lookup rows once and creates a unique order inside each test. The seed is idempotent through PostgreSQL's on conflict clause, but the database should still be dedicated to the test run.

\`\`\`typescript
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

beforeAll(async () => {
  await pool.query('truncate table order_items, orders, products restart identity cascade');
  await pool.query(
    \`insert into products (sku, name, price_cents)
     values ('SKU-BOOK', 'Testing Book', 4500),
            ('SKU-MUG', 'QA Mug', 1200)
     on conflict (sku) do update
     set name = excluded.name, price_cents = excluded.price_cents\`,
  );
});

afterAll(async () => {
  await pool.end();
});

test('calculates the total from the shared product catalog', async () => {
  const orderId = randomUUID();
  await pool.query(
    'insert into orders (id, customer_id, status) values ($1, $2, $3)',
    [orderId, 'customer-for-total-test', 'draft'],
  );
  await pool.query(
    'insert into order_items (order_id, sku, quantity) values ($1, $2, $3)',
    [orderId, 'SKU-BOOK', 2],
  );

  const result = await pool.query(
    \`select sum(p.price_cents * i.quantity)::int as total_cents
     from order_items i join products p using (sku)
     where i.order_id = $1\`,
    [orderId],
  );

  expect(result.rows[0].total_cents).toBe(9000);
});
\`\`\`

The catalog is shared because the scenario reads it. The order is private because the scenario writes it. That division is more important than the lifecycle hook names.

## Transaction rollback has sharp edges

Rollback is the most attractive per-test implementation for relational repositories, yet teams often adopt it without checking transaction boundaries.

First, database connections matter. A transaction belongs to one connection. If the test starts a transaction through a setup client while the application uses a pool, application writes will commit on other connections. Dependency injection, an ambient transaction mechanism, or a repository-level test is needed to keep operations together.

Second, asynchronous work may run after the assertion or on another process. An outbox relay, queue worker, or scheduled task cannot generally share the caller's transaction. Tests covering these components should use committed data in an isolated database or schema, then perform deterministic cleanup.

Third, some database operations cannot be realistically exercised inside a disposable transaction. Connection termination, transaction isolation conflicts, advisory locks, certain migration operations, and commit-triggered behavior need a real commit boundary.

Fourth, sequences are not necessarily reset by rollback in PostgreSQL. A rolled-back insert may still consume a sequence value. Tests should not assume consecutive IDs. Assert identity and relationships using returned values, not that the next row gets ID 4.

| Behavior under test | Rollback seed suitability | Better option when unsuitable |
|---|---|---|
| Repository query and ordinary CRUD | Excellent | None needed if one connection is used |
| Unique and foreign-key constraints | Strong | Ensure constraints are not deferred unexpectedly |
| Outbox published after commit | Poor | Isolated schema with committed seed |
| Multi-connection locking | Poor | Dedicated database and coordinated clients |
| Database migration | Poor | Fresh database upgraded through real migrations |
| Trigger executing in same transaction | Strong | Assert trigger output before rollback |
| Sequence gap behavior | Misleading | Commit operations and inspect actual sequence semantics |

Treat rollback as one isolation mechanism, not a magical sandbox.

## Truncate, delete, schemas, and template databases

When tests need committed transactions, resetting physical state becomes necessary. Truncate is usually faster and clearer than issuing deletes table by table, but foreign keys influence ordering. PostgreSQL supports TRUNCATE ... CASCADE, which is powerful and should be confined to a disposable test database. Never point a reset routine at a shared or production-like database without multiple safeguards.

Schema-per-worker isolation is a practical parallel strategy. Each worker receives a unique schema, runs migrations there, and sets search_path for its connections. This avoids one worker truncating another worker's tables. It also reveals code that incorrectly assumes the public schema. Extensions and cluster-level objects may still be shared, so schemas are not equivalent to separate database servers.

Database-per-worker isolation is stronger. Provision a clean database from a pre-migrated template, assign it to one worker, and drop it afterward. The startup cost can be controlled with container snapshots, PostgreSQL template databases, or one server hosting several worker databases. This model suits integration tests that commit, spawn workers, or change session settings.

Containers add environmental isolation, not automatically data isolation. A single container shared by parallel test workers can still suffer collisions. Decide whether the container belongs to the job, worker, file, or test. The [database testing automation guide](/blog/database-testing-automation-guide) covers the wider test architecture around real engines, migrations, and query behavior.

## Measure setup cost without hiding contamination

The performance discussion often compares a crude per-test reload with an optimized global seed. That is not a fair experiment. Compare credible implementations: per-test rollback with narrow builders, per-worker immutable seeds, and database templates for committed workflows.

Measure at least these components:

| Metric | What it reveals | Collection point |
|---|---|---|
| Migration duration | Cost before any fixture exists | Worker or database provisioning log |
| Seed duration | Direct lifecycle overhead | Around the seed transaction |
| Test duration distribution | Cases dominated by data setup | Test runner reporter |
| Reset duration | Cost of truncate, rollback, or database drop | Teardown instrumentation |
| Retry pass rate | Likely order dependence or race exposure | CI history |
| Isolated-versus-suite result | Hidden fixture coupling | Random-order validation job |

Avoid declaring success based solely on total runtime. If suite seeding saves one minute but creates failures that cannot be reproduced alone, the maintenance cost overwhelms the gain. Conversely, if rollback reduces a database suite from hours to minutes while preserving commit coverage elsewhere, it is a substantial improvement.

Randomize test order periodically. Run individual cases, files, and shards independently. Execute the suite with more workers than usual. These variations expose shared-state assumptions that a fixed local order conceals.

## Use a hybrid policy tied to data ownership

For many systems, the best answer is neither purely per-test nor purely per-suite. Seed immutable platform data once per worker, then create mutable scenario records per test. Wrap repository-focused tests in transactions, and give commit-dependent integration tests a worker-owned schema. Run migration tests against newly provisioned databases.

A policy can classify data instead of prescribing one hook:

1. Reference data is loaded once and must not be modified.
2. Scenario data is created by the test that owns it.
3. Generated identifiers are captured, never assumed.
4. External side effects use test-specific correlation IDs.
5. Cleanup removes leftovers, but no test relies on cleanup to establish its initial state.
6. Parallel execution assigns an isolated namespace before any seed runs.

This policy also makes builders more useful. A builder should insert a valid entity graph through supported repository or SQL paths and return actual identifiers. It should not silently create dozens of unrelated records. Defaults reduce noise, while explicit overrides describe the behavior being tested.

Factories must track schema evolution. Compile-time types help with application fields but do not guarantee database defaults, constraints, or migration compatibility. Keep a focused seed validation test that provisions from migrations and loads every shared dataset. Fail early if a new non-null column breaks the seed.

For governance of synthetic data, masking, ownership, and lifecycle beyond database rows, consult the [test data management strategies guide](/blog/test-data-management-strategies). Seed frequency is one decision inside that larger system.

## Decide with failure modes, not preference

Choose per-test seeding when mutation is central, cases must run independently, selective execution is common, or debugging shared residue is expensive. Prefer suite or worker seeding for large immutable reference sets, read-heavy scenarios, and costly provisioning that can be safely partitioned.

Reject per-suite mutation when keys collide, case order matters, or cleanup is incomplete. Reject rollback-only isolation when the behavior crosses connections or requires commit. In both directions, the deciding evidence is whether the isolation contract matches the production behavior under test.

A useful review asks concrete questions. Which records can this case modify? Who else can see them? What persists after failure? Does another process participate? Can a single test reproduce its result? What happens with four workers? How is a schema change reflected? If the answers are explicit, the hook placement usually becomes obvious.

## Detect accidental writes to shared fixtures

A hybrid policy fails if nobody enforces the read-only half. Protect suite-scoped reference rows with more than a comment. Test builders can allocate mutable keys from a reserved prefix, while shared rows use a distinct namespace. After each case, query audit columns or compare a checksum of designated reference tables. A changed checksum should fail with the table and primary keys involved.

Database permissions offer a stronger boundary. Run scenario mutations through a role that can select reference tables but cannot update or delete them. Setup uses a separate owner role to load the catalog. This catches a new application path that attempts to modify global fixtures, although it may diverge from production permissions and therefore needs clear test-environment documentation.

Track fixture provenance in failure output. Recording builder name, owning test ID, worker ID, and created primary keys makes leaked rows attributable. The metadata can live in a test-only registry rather than production tables. When teardown discovers residue, report it before deletion so the suite exposes the ownership defect instead of quietly masking it.

These controls turn seed frequency into an enforceable architecture. Without them, shared data gradually becomes mutable because using the existing row is easier than creating a case-owned entity.

## Frequently Asked Questions

### Does rolling back after every test reset PostgreSQL sequences?

No. Sequence increments are not generally rolled back with the transaction. Tests should use returned identifiers and avoid assertions that depend on gapless numeric values. Reset sequences only when the behavior specifically requires a known sequence state.

### Can parallel tests share one seeded database safely?

They can when shared records are immutable and every mutable record uses a worker or test-owned namespace. If tests truncate tables, use fixed keys, or update common rows, assign separate schemas or databases instead.

### Should API end-to-end tests seed through the public API?

Use the public API when setup behavior is part of the scenario. For unrelated prerequisites, direct database builders are often faster and more deterministic, provided they preserve required invariants. Keep a smaller set that validates creation through the public interface.

### How should failed tests clean up committed rows?

Start from an isolated worker database or schema so teardown can drop the whole namespace. Row-by-row cleanup in afterEach is fragile because process crashes skip it. Cleanup is useful for resource control, but fresh setup must guarantee correctness.

### Is one giant production-like seed realistic?

It may resemble production volume, but it usually obscures causality and becomes stale. Use generated or sanitized datasets for dedicated performance and migration exercises. Functional cases are clearer with narrow data that expresses the exact state transition under test.
`,
};
