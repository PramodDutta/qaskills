import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Database Unique-Constraint Race Conditions',
  description:
    'Test database unique-constraint race conditions with synchronized PostgreSQL inserts, SQLSTATE assertions, rollback checks, and recovery verification.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing Database Unique-Constraint Race Conditions

Two signup requests check for \`sam@example.test\`, both see no account, and both attempt the insert. Only the database can arbitrate that final race. If the application treats the losing insert as an unexpected 500, the uniqueness constraint protected the data but the user journey still failed.

A useful concurrency test does not mock the repository and does not merely issue two promises that might execute sequentially. It creates a real unique constraint, aligns independent PostgreSQL connections at the contested write, releases them together, and proves three outcomes: exactly one row commits, the loser receives SQLSTATE \`23505\`, and application recovery returns the winning record or a deliberate conflict response.

## Define the invariant in PostgreSQL

Use a database constraint that matches the product invariant. A pre-insert \`SELECT\` is an optimization for friendly validation, not protection against races. For case-insensitive email uniqueness, PostgreSQL can use a unique index on a normalized expression:

\`\`\`sql
CREATE TABLE app_user (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX app_user_email_lower_uq
  ON app_user (lower(email));
\`\`\`

This invariant treats \`Sam@example.test\` and \`sam@example.test\` as duplicates. Confirm that this matches identity rules. Unicode case folding, whitespace, provider-specific mailbox behavior, and PostgreSQL collation choices can complicate normalization. Often the safest design stores a separately normalized key produced by one reviewed function and constrains that column.

| Invariant shape | PostgreSQL mechanism | Race test focus |
|---|---|---|
| One exact value | \`UNIQUE (username)\` | Two inserts with identical text |
| Case-normalized identity | Unique expression index or normalized column | Values differing only by case |
| Unique within tenant | \`UNIQUE (tenant_id, external_id)\` | Same key in one tenant, allowed in another |
| Unique only for active records | Partial unique index with \`WHERE\` | Competing active rows and inactive exception |
| Idempotency key | Unique constraint on request key | Retried command returns original outcome |

Name constraints and indexes deliberately. Error handling can then recognize the intended conflict without converting every uniqueness violation into “already exists.” A violation on an internal audit identifier may indicate a real defect and should not be masked.

## Synchronize independent inserts at the database boundary

The Node \`pg\` pool example below uses two checked-out clients and explicit transactions. Advisory locks form a test barrier: both workers acquire a shared advisory lock, prepare their transactions, and block while a coordinator holds an exclusive lock. Releasing the coordinator lets both proceed toward the insert.

For a simpler and still valuable test, a promise barrier immediately before two parameterized inserts is often sufficient. It does not guarantee identical CPU instructions, but independent connections plus a slow or gated transaction make overlap observable. The following runnable Jest-style test uses a JavaScript barrier and PostgreSQL's real conflict behavior.

\`\`\`typescript
import { Pool, type PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

function barrier(parties: number) {
  let arrived = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  return async () => {
    arrived += 1;
    if (arrived === parties) release();
    await gate;
  };
}

async function competingInsert(client: PoolClient, ready: () => Promise<void>, name: string) {
  await client.query('BEGIN');
  try {
    await ready();
    const result = await client.query(
      'INSERT INTO app_user (id, email, display_name) VALUES ($1, $2, $3) RETURNING id',
      [randomUUID(), 'sam@example.test', name],
    );
    await client.query('COMMIT');
    return { kind: 'created' as const, id: result.rows[0].id as string };
  } catch (error) {
    await client.query('ROLLBACK');
    const pgError = error as { code?: string; constraint?: string };
    return {
      kind: 'failed' as const,
      code: pgError.code,
      constraint: pgError.constraint,
    };
  }
}

test('one of two concurrent normalized emails wins', async () => {
  const first = await pool.connect();
  const second = await pool.connect();
  const ready = barrier(2);

  try {
    const outcomes = await Promise.all([
      competingInsert(first, ready, 'Sam A'),
      competingInsert(second, ready, 'Sam B'),
    ]);

    expect(outcomes.filter((item) => item.kind === 'created')).toHaveLength(1);
    expect(outcomes.filter((item) => item.kind === 'failed')).toEqual([
      expect.objectContaining({ code: '23505', constraint: 'app_user_email_lower_uq' }),
    ]);

    const stored = await pool.query(
      'SELECT id, email FROM app_user WHERE lower(email) = lower($1)',
      ['SAM@example.test'],
    );
    expect(stored.rowCount).toBe(1);
  } finally {
    first.release();
    second.release();
  }
});
\`\`\`

The test must run against an isolated schema or database. Delete its rows through fixture teardown, or create a fresh disposable database. Never aim a destructive concurrency test at a shared developer database.

## Force the loser to wait on an uncommitted winner

The strongest deterministic case controls commit order. Transaction A inserts the unique value but does not commit. Transaction B attempts the same key and waits while PostgreSQL determines whether A will commit. Then the test commits A and asserts B fails with \`23505\`.

This scenario verifies the database's behavior under genuine contention rather than fast sequential rejection. Implement coordination in the test process: signal after A's insert resolves, start B's insert, verify it has not settled during a short diagnostic window, and commit A. Avoid asserting an exact wait duration. Scheduler and CI load make timing thresholds flaky.

There is an equally important rollback variant. If A inserts and rolls back, B should be able to proceed and commit. That case catches application code that treats a temporary wait or retryable transaction state as a permanent duplicate.

| Winner action | Expected competing insert | Final row count |
|---|---|---|
| First transaction commits | Second receives unique violation | One |
| First transaction rolls back | Second succeeds | One |
| Losing transaction retries unchanged INSERT | It fails again after winner committed | One |
| Loser switches to read-after-conflict | It retrieves winner according to policy | One |

Be cautious when proving that B is blocked. A five-millisecond “not resolved yet” assertion is not proof. PostgreSQL activity views can show lock waits, but querying them requires permissions and adds version-sensitive details. The essential assertions are the controlled transaction order and final outcomes.

## Assert SQLSTATE instead of message text

PostgreSQL assigns \`23505\` to unique violations. Driver error messages contain quoted values, schema names, localization-sensitive prose, and sometimes details you should not expose. Application mapping should key off structured fields such as \`code\` and, when available, \`constraint\`.

Do not translate every \`23505\` into the same HTTP response. A user-facing duplicate email can map to 409 Conflict or an idempotent lookup, while an unexpected collision on a generated internal key merits logging and investigation. Match the named invariant you intend to recover from.

At the API boundary, assert sanitized output. The response should not reveal raw SQL, table names, or full constraint details. Internal logs can include correlation identifiers and constraint names, with values redacted according to data policy.

Drivers require a rollback after a statement error inside an explicit transaction. If the service catches \`23505\` and immediately queries on the same failed transaction without rollback, PostgreSQL returns “current transaction is aborted.” Add a recovery test that proves the connection becomes usable and returns to the pool cleanly.

## Test the application's chosen conflict policy

The database outcome is fixed, but product behavior is a design choice. For account creation, duplicates may return a neutral response to prevent account enumeration. For idempotent order submission, the same idempotency key should return the original operation. For a unique slug, the service might generate a new candidate and retry a bounded number of times.

Test one policy explicitly:

\`\`\`typescript
async function createOrFindUser(email: string, displayName: string) {
  try {
    const inserted = await pool.query(
      'INSERT INTO app_user (id, email, display_name) VALUES ($1, $2, $3) RETURNING *',
      [randomUUID(), email, displayName],
    );
    return { created: true, user: inserted.rows[0] };
  } catch (error) {
    const pgError = error as { code?: string; constraint?: string };
    if (pgError.code !== '23505' || pgError.constraint !== 'app_user_email_lower_uq') {
      throw error;
    }
    const existing = await pool.query(
      'SELECT * FROM app_user WHERE lower(email) = lower($1)',
      [email],
    );
    if (existing.rowCount !== 1) throw error;
    return { created: false, user: existing.rows[0] };
  }
}
\`\`\`

Read-after-conflict has its own transaction considerations. Under an outer transaction snapshot, the winning row's visibility depends on isolation level and when the snapshot was established. Test through the same transaction boundaries the service actually uses.

## ON CONFLICT changes what must be asserted

\`INSERT ... ON CONFLICT DO NOTHING\` avoids an exception, but success from the driver's perspective does not mean a row was inserted. Check \`rowCount\` or use \`RETURNING\`. If no row returns, perform the intended lookup or report conflict.

\`ON CONFLICT ... DO UPDATE\` is an upsert with real write semantics. It can fire update triggers, change timestamps, overwrite newer values, and create lock contention. Tests should assert which fields the loser may update and which winning values remain untouched. Do not use a no-op update merely to obtain a row without considering trigger and bloat consequences.

Specify the conflict target accurately. A broad statement that works today can behave differently after another unique index is added. When the SQL names columns or a constraint, migration tests should ensure that target still represents the intended invariant.

For idempotency, store enough result state with the unique key to distinguish “in progress,” “succeeded,” and “failed safely to retry.” A unique key alone prevents duplicates but does not tell a concurrent caller what response it should receive.

## Isolation levels and serialization failures are separate cases

Unique violations and serialization failures are not interchangeable. Under Serializable isolation, PostgreSQL may abort a transaction with SQLSTATE \`40001\` when concurrent behavior cannot be serialized. The correct response is usually to retry the entire transaction with fresh state, not to report a duplicate.

Deadlocks use \`40P01\` and also require transaction-level handling. Write separate tests and observability for these codes. A catch block that labels all database errors as uniqueness conflict will hide operational problems.

At Read Committed, each statement sees an appropriate snapshot, and a competing unique insert can wait for another transaction. At Repeatable Read or Serializable, subsequent reads and retries inside the same transaction may not see what a new transaction would. Mirror production isolation in the test configuration.

## Build a production-faithful disposable environment

SQLite is not a substitute for a PostgreSQL race test. Conflict timing, transaction semantics, error codes, expression indexes, and driver behavior differ. Run the real engine version used by production, ideally from the same major release line.

Testcontainers is a practical option for starting disposable PostgreSQL in integration tests. Apply real migrations rather than recreating an approximate table in test setup. The [Testcontainers best-practices guide](/blog/testcontainers-best-practices-2026) covers container lifecycle and reuse decisions. Broader fixture and query-layer concerns appear in the [database testing automation guide](/blog/database-testing-automation-guide).

Keep pool size at least two for a two-connection race. A pool of one turns concurrent promises into serialized queries and produces a misleading green test. Also set sensible statement and test timeouts so a broken barrier cannot hang CI indefinitely. On failure, log sanitized outcomes and transaction steps.

Parallel test workers need unique schemas, databases, or key values. A fixed email makes the test readable, but another worker can collide before the intended barrier. Generate a per-test suffix while preserving the same normalized relationship within each pair.

## Review race tests for false confidence

A test that calls \`Promise.all\` on two repository methods may still share one connection or hit an in-memory lock that serializes the calls. Prove two sessions exist, and place the barrier near the actual SQL write. Conversely, do not expose test-only synchronization endpoints in production code. Coordinate injected dependencies or direct integration fixtures.

Run the deterministic two-transaction cases on every relevant change. Stress tests with dozens of contenders can supplement them, but they are less diagnostic. If 50 requests produce one insert and 49 conflicts, also assert pool health, latency bounds using generous environment-aware thresholds, and no leaked transactions.

The final database state is necessary but insufficient. A system can end with one row while returning 500 to every caller or leaking connections. Assert per-caller outcomes, persistence, response sanitization, and a subsequent ordinary query through the same pool.

## Prove connection-pool recovery after the collision

Concurrency defects often surface after the unique violation, when a failed transaction is returned to the pool or a waiting client is never released. Extend the race test with a pool-health phase. After both contenders settle, issue ordinary inserts and reads through newly acquired clients. They should complete without an aborted-transaction error and within the suite's normal timeout.

Instrument acquisition and release counts in the test environment if the driver exposes pool events. The pool should return to its pre-test checked-out count even when an assertion fails, which is why releases belong in finally blocks. A hanging test after a correct row-count assertion frequently indicates that one branch kept a client or left a query blocked.

Test cancellation deliberately when the service has request deadlines. Hold the winner transaction open, start the contender, then abort the request using the driver's supported cancellation mechanism. Roll back the relevant transaction and prove the connection can execute a fresh query before release. Do not simulate cancellation by simply abandoning a promise, because the database query can continue consuming a pool slot.

Observe server-side sessions during development. PostgreSQL activity can reveal sessions idle in transaction, waiting on locks, or executing the duplicate insert. Production monitoring should alert on long idle transactions and pool saturation independently of uniqueness counts. A burst of expected duplicate requests can still become an availability problem if every loser waits behind a slow winner.

Add a bounded latency check only after the correctness test is deterministic. Avoid a narrow millisecond threshold in shared CI. A more stable assertion is that the loser settles after the winner commits and before a generous test deadline. Performance characterization belongs in a controlled environment where connection counts, storage, and load are known.

Connection proxies deserve their own run. Transaction-pooling systems can change session affinity and make session-level features unsuitable for coordination. The application should not rely on advisory locks or temporary state unless its deployment mode supports them. The core unique constraint works across these layouts, but a test-only barrier based on session behavior may need to remain outside the proxied path.

Finally, verify observability semantics. Emit one structured conflict event for the recognized business invariant, not an error stack at the same severity as data corruption. Include request correlation and constraint identity, but hash or redact personal values. Unexpected unique constraints, rollback failures, and leaked clients should remain errors. This separation lets operations teams distinguish normal contention from a broken transaction handler.

A complete race test therefore finishes with four layers of evidence: individual caller results, one durable row, a usable pool, and correctly classified telemetry. Stopping at the row count proves database integrity but leaves the service's ability to process the next request untested. Run the test repeatedly during its initial review to confirm coordination, then rely on the deterministic case rather than turning every CI run into an uncontrolled stress campaign.

## Frequently Asked Questions

### Why is SELECT then INSERT still unsafe inside a transaction?

At common isolation levels, another transaction can make the same observation before either insert. A unique constraint arbitrates the write. Higher isolation may produce a serialization failure, which still needs explicit retry handling.

### How can I make the race deterministic without sleep calls?

Use two checked-out connections and a promise barrier immediately before the inserts. For stronger control, hold the first transaction open after its insert, start the competing insert, then choose whether the first commits or rolls back.

### Should the service retry a 23505 error?

Usually not with the identical insert after the winner committed. Map the recognized constraint to conflict or read the existing idempotent result. Retry SQLSTATE \`40001\` as a whole transaction under a bounded policy instead.

### Why does the test pass with a pool size of one?

The driver serializes both operations on one connection, so the intended overlap never occurs. Require two independent sessions and verify the test database permits them.

### Can a unique index replace an application-level duplicate check?

It must be the final integrity guard. An earlier check can still provide faster, friendlier feedback, but the insert path must handle the constraint race because the check and write are not atomic.
`,
};
