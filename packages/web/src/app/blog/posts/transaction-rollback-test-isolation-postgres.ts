import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PostgreSQL Test Isolation with Transaction Rollbacks',
  description:
    'Implement PostgreSQL test isolation with transaction rollbacks, dedicated connections, savepoints, and checks for sequences, workers, and parallel suites.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# PostgreSQL Test Isolation with Transaction Rollbacks

The test inserts an invoice, calls the repository, makes six assertions, and then issues \`ROLLBACK\`. The row vanishes atomically, even if assertion four threw. There is no delete query to maintain and no dependency-order puzzle among invoice items, payments, and audit rows.

That is the appeal of transaction rollback isolation in PostgreSQL: begin a transaction before each test, run setup and assertions on the same database session, and roll back in teardown. The pattern is fast and exact for repository and service tests, but only when every write belongs to that transaction. Connection pools, background workers, sequences, commits inside application code, and parallel test processes define its limits.

## The invariant is one test, one checked-out connection

A PostgreSQL transaction belongs to a connection. It does not belong to a test function, process, request, or pool. If setup runs through checked-out connection A while application code obtains connection B from the pool, B cannot see A's uncommitted fixtures under the usual \`READ COMMITTED\` isolation, and its own writes will not be undone when A rolls back.

The isolation contract should therefore be explicit:

| Operation | Required connection | Visibility before rollback |
|---|---|---|
| Fixture inserts | Test's checked-out client | Visible to that client |
| Repository queries | Same client passed into repository | Sees fixture and its own writes |
| Assertions | Same client for database reads | Observes transactional state |
| Teardown \`ROLLBACK\` | Same client that issued \`BEGIN\` | Discards transaction changes |
| Client release | Only after rollback attempt | Returns clean session to pool |

This is easiest when repositories accept a query-capable dependency rather than importing a global pool. The production application can pass the pool because both \`Pool\` and \`PoolClient\` expose \`query()\`; tests pass one client.

## A node-postgres rollback harness

The following Vitest setup uses the real \`pg\` API. It checks out one \`PoolClient\` for each test, begins a transaction, and guarantees rollback before release. The repository receives that client directly.

\`\`\`typescript
import { Pool, type PoolClient } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
let db: PoolClient;

beforeAll(async () => {
  await pool.query(\`
    CREATE TABLE IF NOT EXISTS invoices (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      customer_id text NOT NULL,
      amount_cents integer NOT NULL CHECK (amount_cents >= 0),
      status text NOT NULL
    )
  \`);
});

beforeEach(async () => {
  db = await pool.connect();
  await db.query('BEGIN');
});

afterEach(async () => {
  try {
    await db.query('ROLLBACK');
  } finally {
    db.release();
  }
});

afterAll(async () => {
  await pool.end();
});

async function markPaid(client: PoolClient, invoiceId: string) {
  const result = await client.query<{ status: string }>(
    \`UPDATE invoices
       SET status = 'paid'
     WHERE id = $1
     RETURNING status\`,
    [invoiceId],
  );
  return result.rows[0];
}

test('marks only the selected invoice paid', async () => {
  const inserted = await db.query<{ id: string }>(
    \`INSERT INTO invoices (customer_id, amount_cents, status)
     VALUES ($1, $2, 'open'), ($3, $4, 'open')
     RETURNING id\`,
    ['customer-a', 4200, 'customer-b', 9900],
  );

  await expect(markPaid(db, inserted.rows[0].id)).resolves.toEqual({ status: 'paid' });
  const statuses = await db.query<{ status: string }>(
    'SELECT status FROM invoices ORDER BY id',
  );
  expect(statuses.rows.map((row) => row.status)).toEqual(['paid', 'open']);
});
\`\`\`

Schema creation sits outside per-test transactions because it is suite infrastructure. In a serious codebase, migrations should create the schema before tests, not \`CREATE TABLE IF NOT EXISTS\` in the spec. It is shown only to make the example executable against an empty test database.

The teardown uses \`finally\` so a rollback error does not strand the client outside the pool. In production suites, capture the rollback error before releasing and fail loudly. A client returned while still in a transaction can poison the next borrower with locks, local settings, and uncommitted state.

## Recover from expected SQL errors with savepoints

PostgreSQL marks a transaction as aborted after a statement error. Catching the JavaScript rejection does not restore usability. Every later query fails with "current transaction is aborted" until the transaction or an enclosing savepoint is rolled back.

If a test intentionally provokes a unique, foreign-key, or check-constraint violation and then wants more assertions, create a savepoint before the failing statement and roll back to it afterward.

\`\`\`typescript
import { DatabaseError, type PoolClient } from 'pg';
import { expect, test } from 'vitest';

async function expectSqlState(
  client: PoolClient,
  sqlState: string,
  operation: () => Promise<unknown>,
) {
  await client.query('SAVEPOINT expected_error');
  try {
    await operation();
    throw new Error(\`Expected PostgreSQL SQLSTATE \${sqlState}\`);
  } catch (error) {
    if (!(error instanceof DatabaseError) || error.code !== sqlState) throw error;
  } finally {
    await client.query('ROLLBACK TO SAVEPOINT expected_error');
    await client.query('RELEASE SAVEPOINT expected_error');
  }
}

test('rejects a negative invoice and keeps the test transaction usable', async () => {
  await expectSqlState(db, '23514', () =>
    db.query(
      \`INSERT INTO invoices (customer_id, amount_cents, status)
       VALUES ($1, $2, $3)\`,
      ['customer-negative', -1, 'open'],
    ),
  );

  const count = await db.query<{ count: string }>('SELECT count(*) FROM invoices');
  expect(Number(count.rows[0].count)).toBe(0);
});
\`\`\`

SQLSTATE \`23514\` is a check-constraint violation. Asserting the code is more stable than matching localized server messages. Use unique savepoint names if helpers can nest. PostgreSQL does not provide true nested transactions through another \`BEGIN\`; savepoints are the mechanism for partial rollback inside one transaction.

There is a flaw worth noticing in many naive helpers: throwing the "expected error was not raised" error inside the same \`try\` can be caught as though it were the database error. The example checks its type and code, so the sentinel error is rethrown. That keeps a missing constraint from becoming a false pass.

## Sequences do not roll back with table rows

PostgreSQL sequence advancement is intentionally nontransactional. An identity or \`serial\` column usually calls \`nextval\`; after rollback, the inserted row disappears but the consumed value is not returned. Tests that expect ids 1, 2, 3 will eventually fail or conflict with parallel execution.

Treat generated identifiers as opaque values. Capture them from \`RETURNING\` and thread them into assertions. If a business requirement truly depends on a formatted sequential number, test the allocation behavior explicitly under concurrency rather than resetting a database sequence after every test.

| Database effect | Removed by outer rollback? | Testing note |
|---|---:|---|
| Inserted, updated, deleted rows | Yes | Core benefit of the pattern |
| Transactional DDL such as \`CREATE TABLE\` | Usually yes | Still avoid schema churn in each test |
| Sequence values from \`nextval\` | No | Never assert fixed generated ids |
| Notifications already delivered | Not before commit | \`NOTIFY\` is delivered on commit |
| External HTTP or message broker side effects | No | Stub, compensate, or use isolated infrastructure |
| Writes on another database connection | No | They belong to a different transaction |

Large objects, advisory locks, temporary tables, and session settings have their own lifetimes. If tests use them, review PostgreSQL semantics specifically rather than assuming "rollback cleans everything."

## Application requests usually escape the test transaction

An HTTP integration test starts the application, then calls an endpoint. The server's connection pool lives inside the application and cannot use a \`PoolClient\` checked out by the test process. Wrapping only the fixture setup in a transaction creates invisible fixtures, while wrapping only test assertions leaves server writes committed.

Options for request-level tests include:

1. Give each test or worker a separate database or schema and truncate between cases.
2. Add a test-only transaction propagation mechanism, with careful security boundaries.
3. Run application code in process and inject the test client.
4. Use deterministic resource identifiers and explicit cleanup APIs.

Do not add a production HTTP header that selects an arbitrary database transaction. That creates a severe boundary risk. Some frameworks offer managed test transactions when request handling runs in the same process and context; adopt them only if connection propagation is guaranteed.

Rollback isolation is strongest for repository, data-access, and service tests that can accept a client. Broader end-to-end coverage often needs database-per-worker isolation. The [database testing automation guide](/blog/database-testing-automation-guide) places rollback tests within a wider strategy, while the [Testcontainers PostgreSQL guide](/blog/testcontainers-postgres-node-guide) covers disposable server infrastructure.

## Parallel workers need independent sessions and fixture keys

Separate transactions can execute concurrently, but they are not magically conflict-free. Two workers inserting the same unique email will block or fail. Tests updating the same seeded row can deadlock. Advisory locks and \`SELECT FOR UPDATE\` can serialize the suite.

Use worker-specific data and avoid shared mutable fixtures. A unique suffix based on the worker id is acceptable for values that are not under semantic test. Better still, create rows inside each transaction and pass returned ids. Read-only baseline reference data can be shared if tests never modify it.

Isolation levels matter. At the default \`READ COMMITTED\`, each statement sees committed data as of that statement plus the transaction's own changes. Another test's uncommitted rows are invisible, but committed global setup or cleanup can appear between statements. \`REPEATABLE READ\` gives a stable snapshot but introduces serialization considerations and may not match production behavior. Do not raise isolation solely to mask poorly coordinated fixtures.

## Defer constraints when the schema requires it

Deferrable foreign-key and uniqueness constraints can be checked at transaction commit rather than per statement. A test that always rolls back never commits, so it might miss a deferred violation unless it explicitly requests constraint evaluation.

Use \`SET CONSTRAINTS ALL IMMEDIATE\` before the assertion boundary to force deferred constraints to be checked. If that statement fails, roll back to a savepoint when the test must continue. A dedicated migration or integration test should also exercise a real commit path because commit-time triggers and deferred behavior are part of production semantics.

This is a central tradeoff: rollback tests intentionally avoid commit. They cannot prove everything that happens at commit. Maintain a smaller set of commit-and-clean tests for outbox publication, deferred constraints, transaction callbacks, and integration with change-data capture.

## Prevent accidental COMMIT in code under test

A repository should not usually decide transaction ownership. If a helper issues \`COMMIT\` on the shared client, it destroys the test harness boundary and may persist fixture data. Prefer transaction orchestration at a service or unit-of-work layer, with repositories executing statements only.

When the behavior under test must commit, rollback isolation is the wrong technique for that case. Do not mock \`COMMIT\` into a no-op and claim commit semantics were tested. Move the case to an isolated database or schema and verify the durable result.

A lightweight guard can wrap the client's query method in tests and reject transaction-control SQL from lower layers, but such wrappers are easy to bypass and may interfere with legitimate savepoints. Architectural ownership and code review are stronger than string inspection.

## Compare cleanup strategies honestly

No single database isolation method covers every layer.

| Strategy | Speed profile | Handles server-side pooled requests | Important cost |
|---|---|---:|---|
| Outer transaction rollback | Very fast | No, unless client is injected | Cannot validate commit effects |
| Table truncation | Moderate | Yes | Requires table inventory and locking care |
| Schema per worker | Good after setup | Yes | Search path, migration, and extension complexity |
| Database per worker | Slower provisioning | Yes | More connections and infrastructure |
| Disposable PostgreSQL container | Highest startup cost | Yes | Needs container runtime and migration time |
| Targeted row deletion | Variable | Yes | Fragile with new relations and failed teardown |

A mature suite often combines them: rollback for thousands of repository examples, schema or database isolation for HTTP integration, and a smaller containerized migration suite. The layers should not duplicate every assertion. Each should target the failure modes its isolation model can actually expose.

Measure before replacing rollback with a heavier strategy. Capture connection checkout time, migration time, fixture creation, and query duration independently. A slow suite blamed on transactions may actually spend most of its budget constructing oversized object graphs or waiting for pool connections. Optimization should preserve isolation evidence rather than sharing mutable fixtures merely to reduce setup lines.

When using truncation in another layer, do not run it concurrently with rollback-based workers against the same database. \`TRUNCATE\` takes strong locks and changes the shared baseline outside those workers' assumptions. Separate databases or CI jobs make the boundary much easier to reason about.

## Watch locks and session state while debugging

Rollback releases locks acquired by the transaction, but those locks can block other workers until teardown occurs. A failed assertion does not instantly run teardown if the test is stuck awaiting another query. Configure test timeouts and investigate blockers through PostgreSQL activity views using a separate administrative connection.

Tag sessions with a safe \`application_name\` containing the suite and worker identifier. That makes \`pg_stat_activity\` evidence more useful without placing test data in the tag. Do not terminate arbitrary backends from ordinary test code. A diagnostic script can report blocked and blocking process ids, query states, and transaction age for an operator.

Session-level settings survive transaction rollback unless set with transaction-local semantics. Prefer \`SET LOCAL statement_timeout = '5s'\` inside the test transaction for settings meant to disappear at rollback. If code changes role, search path, timezone, or advisory locks at session scope, reset them before releasing the client or destroy that client.

Prepared statements and temporary tables can also outlive the outer transaction at session level depending on how they are created and managed. Most repository tests never need to inspect them, but a shared harness should define whether a released client is guaranteed pristine. When that guarantee is uncertain after an error, removing the connection from the pool costs less than chasing cross-test contamination.

## Harden teardown against test failures

Teardown must run after assertion errors and application exceptions. Framework \`afterEach\` hooks provide that opportunity, but process crashes and forced termination can still skip them. Since uncommitted PostgreSQL work rolls back when the connection closes, dedicated connections provide a useful last line of defense.

Set a sensible connection and statement timeout for tests. A blocked rollback indicates deeper lock or connection trouble and should not hang CI indefinitely. Log the test name and PostgreSQL backend process id for lock investigations, but do not print credentials or entire sensitive rows.

After rollback, release or destroy the client according to pool guidance. If the session encountered a network or protocol error, returning it to the pool may be unsafe. node-postgres permits releasing a client with an error to remove it rather than reuse it. Build this into a shared harness once, then keep individual specs focused on domain behavior.

## Frequently Asked Questions

### Why can my repository not see rows inserted in beforeEach?

It is probably querying through a different pooled connection. Uncommitted rows are visible to the transaction's connection, not to every session. Inject the checked-out client into both setup and repository calls.

### Should I reset identity sequences after every rollback?

Usually no. Sequence increments are not rolled back, and fixed-id assertions are brittle under concurrency. Capture generated values with \`RETURNING\` and treat them as opaque.

### What should I do after intentionally causing a constraint violation?

Create a savepoint before the statement, assert the SQLSTATE, then \`ROLLBACK TO SAVEPOINT\` so the outer test transaction becomes usable again.

### Can rollback isolation test an outbox publisher that runs after commit?

Not completely. A transaction that never commits cannot exercise commit-triggered publication. Use a commit-capable isolated database case for that behavior and clean it with a broader strategy.

### Is one transaction safe for an entire test file?

It reduces per-test isolation because state from earlier cases remains visible until the file ends. Prefer one outer transaction per test unless suite profiling proves the overhead material and every test establishes its own savepoint discipline.
`,
};
