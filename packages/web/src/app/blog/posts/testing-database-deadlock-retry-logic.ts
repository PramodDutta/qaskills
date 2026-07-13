import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Database Deadlock Retry Logic',
  description:
    'Test database deadlock retry logic by forcing a real PostgreSQL cycle, checking SQLSTATE 40P01, bounded backoff, transaction replay, and side effects.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing Database Deadlock Retry Logic

Transaction A locks account 101 and waits for account 202. Transaction B already holds 202 and asks for 101. PostgreSQL detects the cycle, aborts one transaction, and returns SQLSTATE \`40P01\`. That victim is not evidence that retry logic works. The application must recognize the retryable error, discard the failed transaction, replay the complete unit of work on a new transaction, and stop after a defined number of attempts.

A useful test creates that wait-for cycle deliberately. Random concurrent updates may occasionally deadlock, but they cannot produce a dependable regression test. This tutorial uses PostgreSQL and Node.js with \`pg\` to coordinate locks, then shows what to assert beyond eventual success.

## Construct the two-lock cycle on purpose

Deadlocks need incompatible locks and inconsistent acquisition order. Two rows are enough. Connection A begins and updates the first row. Connection B begins and updates the second. Each then attempts the row held by the other. PostgreSQL's detector chooses a victim; the survivor can continue once the victim is rolled back.

| Moment | Connection A | Connection B | Database state |
|---|---|---|---|
| 1 | Begin, update row 101 | Idle | A holds row 101 lock |
| 2 | Waiting at barrier | Begin, update row 202 | A holds 101, B holds 202 |
| 3 | Request row 202 | Request row 101 | Circular wait exists |
| 4 | One statement errors with \`40P01\` | Other unblocks | Victim transaction is aborted |
| 5 | Roll back victim | Commit survivor if appropriate | Locks are released |

Control steps 1 and 2 with barriers in the test process. Do not use arbitrary sleeps to “give the other transaction time.” A slow CI worker can invert the sequence, while a fast local run may miss the overlap entirely.

The following Vitest integration test proves the database can be driven into a real deadlock. It uses two dedicated clients because a pool query does not guarantee session affinity across the transaction.

\`\`\`typescript
import { afterAll, beforeAll, expect, it } from 'vitest';
import { Client } from 'pg';

const connectionString = process.env.TEST_DATABASE_URL!;
const setup = new Client({ connectionString });

beforeAll(async () => {
  await setup.connect();
  await setup.query(\`
    CREATE TABLE IF NOT EXISTS deadlock_accounts (
      id integer PRIMARY KEY,
      balance integer NOT NULL
    )
  \`);
  await setup.query(
    \`INSERT INTO deadlock_accounts (id, balance)
     VALUES (101, 1000), (202, 1000)
     ON CONFLICT (id) DO UPDATE SET balance = EXCLUDED.balance\`,
  );
});

afterAll(async () => {
  await setup.query('DROP TABLE IF EXISTS deadlock_accounts');
  await setup.end();
});

it('PostgreSQL aborts one side of a coordinated deadlock', async () => {
  const a = new Client({ connectionString });
  const b = new Client({ connectionString });
  await Promise.all([a.connect(), b.connect()]);

  try {
    await Promise.all([a.query('BEGIN'), b.query('BEGIN')]);
    await a.query('UPDATE deadlock_accounts SET balance = balance - 1 WHERE id = 101');
    await b.query('UPDATE deadlock_accounts SET balance = balance - 1 WHERE id = 202');

    const results = await Promise.allSettled([
      a.query('UPDATE deadlock_accounts SET balance = balance + 1 WHERE id = 202'),
      b.query('UPDATE deadlock_accounts SET balance = balance + 1 WHERE id = 101'),
    ]);

    const deadlockErrors = results.filter(
      (result): result is PromiseRejectedResult =>
        result.status === 'rejected' && result.reason?.code === '40P01',
    );
    expect(deadlockErrors).toHaveLength(1);
  } finally {
    await Promise.allSettled([a.query('ROLLBACK'), b.query('ROLLBACK')]);
    await Promise.all([a.end(), b.end()]);
  }
});
\`\`\`

The SQL uses template literals, so their backticks are escaped in this article's TypeScript source. In an actual test file they are ordinary JavaScript template literal delimiters.

## Retry the transaction function, never a single statement

After PostgreSQL reports a deadlock, the transaction is in an aborted state. Retrying the failed \`UPDATE\` on the same client before rollback produces another error. The safe abstraction retries a callback that begins a new transaction and replays all reads, validation, and writes inside it.

\`\`\`typescript
import { Pool, type PoolClient } from 'pg';

type RetryOptions = {
  maxAttempts: number;
  baseDelayMs: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

export async function withDeadlockRetry<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      const code = (error as { code?: string }).code;
      if (code !== '40P01' || attempt === options.maxAttempts) throw error;
      await sleep(options.baseDelayMs * attempt);
    } finally {
      client.release();
    }
  }

  throw new Error('Unreachable retry state');
}
\`\`\`

This sample implements bounded linear backoff for clarity. A production policy might use capped exponential backoff plus jitter to stop many victims from re-entering at the same instant. The important contract is injectable delay, a finite attempt count, a fresh transaction per attempt, and strict error classification.

Whether \`40001\` serialization failures share the policy is an application decision. Do not label every database exception retryable. Unique violations, invalid SQL, permission errors, and failed constraints usually need to surface immediately.

## Assert the policy without waiting in wall-clock time

Test backoff through the injected \`sleep\` function. A unit test can make the callback throw an object with \`code: '40P01'\` twice, then succeed. Assert three callback invocations and the requested delays. Another test always throws and asserts that the third error escapes when \`maxAttempts\` is three.

Also verify that a non-retryable code produces one attempt and no delay. This negative case prevents an innocent refactor from turning authentication or constraint failures into slow, repeated operations.

| Policy case | Work outcomes | Expected attempts | Delay calls | Final result |
|---|---|---:|---|---|
| Immediate success | success | 1 | none | value returned |
| One deadlock then success | \`40P01\`, success | 2 | one | value returned |
| Budget exhausted | \`40P01\` on every try | \`maxAttempts\` | attempts minus one | last error thrown |
| Constraint violation | \`23505\` | 1 | none | original error thrown |
| Callback throws application error | ordinary \`Error\` | 1 | none | same error thrown |
| Rollback itself reports an error | \`40P01\` followed by rollback issue | policy-defined | policy-defined | primary failure should remain diagnosable |

Mocking the transaction callback tests policy mechanics, not PostgreSQL behavior. Keep that fast unit suite and retain at least one real-engine integration test to verify SQLSTATE classification and transaction lifecycle.

## Test replay safety, not merely eventual commit

The callback may run more than once. Any side effect performed before commit can happen even when the transaction is later aborted. Sending an email, charging a payment method, or publishing directly to a broker inside the retryable callback is unsafe unless the operation is idempotent under a stable key.

Prefer recording an outbox row in the same database transaction. The transaction rollback removes the unsuccessful attempt's outbox entry, and a separate dispatcher publishes after commit. Assert that one committed business change produces one committed outbox message despite a forced retry.

Sequence generators deserve nuance. PostgreSQL sequences are not rolled back, so identifiers can have gaps after a victim transaction. Tests should not expect contiguous IDs. They should expect uniqueness and correct relationships.

Other values may legitimately change on replay. A \`now()\` call, refreshed row read, or generated random token can differ. Decide which values must remain stable across attempts. An externally visible idempotency key should usually be allocated outside the callback and reused, while transaction-local timestamps may be recomputed.

## Verify state after both transactions settle

An eventual 200 response is a weak assertion. Query durable state with a separate connection after all competing transactions have committed or rolled back. For a transfer, verify conservation: the source decreased once, destination increased once, and total balance stayed constant. For inventory, verify no negative quantity and one reservation record.

Do not inspect from a still-open participant transaction because its snapshot and locks can distort the result. The verification client should begin after the concurrent work settles or use an isolation level appropriate to the assertion.

Useful invariants include:

- Exactly one business operation record exists for the idempotency key.
- Ledger debits and credits balance.
- No transaction remains \`idle in transaction\` after the test.
- The pool has returned all checked-out clients.
- A non-victim transaction was not replayed unnecessarily.

The broad [database testing automation guide](/blog/database-testing-automation-guide) places these concurrency invariants alongside schema and query checks.

## Keep the database detector fast in test environments

PostgreSQL waits for \`deadlock_timeout\` before checking for a deadlock, unless detection is triggered through other lock-wait processing. Production defaults and permissions may make an intentional deadlock test slower than a unit test. If your disposable database allows a lower session setting, change it only for the test sessions and understand that the parameter may require privileges depending on deployment.

Do not hard-code an expectation that detection completes in an exact number of milliseconds. Shared runners and container scheduling add variability. Bound the overall test generously enough to distinguish a broken barrier from normal detection, and use a test-runner timeout as a final guard.

If a managed database prevents changing the parameter, keep the real deadlock scenario in an integration job rather than hundreds of test cases. Unit tests should cover the retry state machine exhaustively.

## Use a real PostgreSQL version in an isolated fixture

SQLite, an in-memory repository, and a mocked pool cannot reproduce PostgreSQL row locks or SQLSTATE \`40P01\`. Run the concurrency test against the same major PostgreSQL version used by the service. Testcontainers is well suited because each suite can receive a disposable engine and schema. The [Testcontainers best practices guide](/blog/testcontainers-best-practices-2026) explains lifecycle and reuse tradeoffs.

Isolation must extend to test data. Parallel workers that update the same two rows can create extra wait edges and change which transaction becomes the victim. Give each test unique row IDs or a dedicated schema/database. Never run deliberate deadlocks against a shared developer database.

Clean up in \`finally\` with \`Promise.allSettled\`. Once one side rejects, the other may still be waiting or completing. Rolling back and closing both sessions prevents a failed assertion from leaving locks that poison the next test.

## Diagnose flaky deadlock tests as coordination bugs

If no deadlock appears, log each milestone: transaction begun, first lock acquired, second lock requested, error received, rollback complete. Usually one transaction reached its second update before the other acquired its first lock. A reusable barrier that resolves only after both first updates finish removes that race.

If both operations fail, inspect cleanup and test-runner cancellation. The database normally selects one victim, allowing the other to continue, but the harness may roll both back after observing the first rejection. That is acceptable in a detector test if the assertion only concerns \`40P01\`; it is not sufficient for an end-to-end retry-success test.

If the chosen victim varies, the system is behaving normally. PostgreSQL's victim selection should not be part of your business contract. Assert that exactly one participant receives the deadlock code, or structure the retry integration so either side can recover.

## Prove the attempt ceiling under continuing contention

The hardest integration case is repeated deadlock, because the competitor must coordinate with each new transaction attempt. Build a controllable adversary rather than hoping organic load collides repeatedly. At each attempt, let the adversary acquire the opposite row, synchronize at a barrier, and create the cycle. Release and reset after the victim rolls back.

This harness is more complex than the core application code. Keep it in a dedicated concurrency test module, document its state transitions, and give every awaited barrier a timeout so a failed participant cannot hang the suite. Most teams get better value from exhaustive unit testing of the ceiling plus one real deadlock and one real recovery scenario.

Monitor attempt counts in production, but do not turn the test into a claim about a universal retry number. A cap of three may suit a short API transaction and be wrong for a batch job. The test should encode the service's chosen latency and correctness tradeoff.

## Exercise isolation-level interactions deliberately

Deadlocks can occur under common PostgreSQL isolation levels, while serializable transactions can additionally fail with \`40001\` even without a lock cycle. Run the production transaction at its real isolation level in the integration fixture. A test that silently uses the server default may certify a different retry surface from the deployed service.

Read-only transactions are not automatically immune. Explicit locks, foreign-key checks, and schema operations can participate in waits. Map the statements the workflow actually issues, including triggers. A simple two-row harness validates the retry mechanism; a workflow-specific case validates the lock order created by real SQL.

If the permanent fix is consistent lock acquisition order, keep a regression test that launches the two business operations and asserts both complete without a deadlock retry. The generic forced-deadlock test still belongs around the shared retry utility because future workloads can encounter cycles outside that one fix.

## Observe connection and transaction hygiene

A retry loop can succeed functionally while leaking one client per failed attempt. Under load, the pool then exhausts and turns a rare deadlock into a service outage. Expose pool state through the library's supported diagnostics or wrap acquisition and release in test instrumentation. Assert that every attempt releases exactly the client it acquired.

Rollback must precede release. Returning an aborted transaction to a pool can contaminate the next borrower. In failure injection tests, make \`work\` throw before its first statement, after a write, and during commit simulation where the database wrapper permits it. Each path should attempt appropriate cleanup while preserving the primary error.

Connection loss during rollback is not another deadlock retry signal. The session's commit outcome may be uncertain, especially when the connection drops around \`COMMIT\`. Escalate that state according to the application's idempotency design rather than blindly replaying it as though PostgreSQL had confirmed an abort.

## Inspect retry telemetry without asserting log prose

Emit a counter for deadlock victims, an attempt histogram, and a final-exhaustion counter tagged with a bounded operation name. Avoid transaction IDs, SQL text, and customer identifiers in metric labels. In the integration test, capture the metric sink and assert one retry observation plus no exhaustion after recovery.

Logs can include the SQLSTATE, attempt number, maximum attempts, and a correlation identifier. Tests should assert structured fields rather than a complete formatted sentence, because log wording is not the business contract. Confirm that passwords, query parameters, and full statements are absent.

Telemetry must distinguish a database deadlock from an application-level optimistic conflict. Combining them into “retry” conceals whether lock ordering, transaction length, or user concurrency needs attention. A rising \`40P01\` rate after deployment deserves investigation even if every request eventually succeeds.

## Frequently Asked Questions

### Can I reproduce a deadlock with two promises using one pooled client?

No reliable transaction-level cycle exists on one PostgreSQL session. Acquire two dedicated clients, begin a transaction on each, and hold them until the scenario completes. A pool's convenience \`query\` method is not a transaction boundary.

### Should the application retry SQLSTATE \`40P01\` on the same transaction?

Reusing the victim transaction is invalid because PostgreSQL has aborted it. Roll back, obtain a clean transaction context, and replay the entire unit of work so its reads and validations are consistent.

### Is \`40001\` the same as a deadlock error?

The codes represent distinct failures: \`40001\` is a serialization failure and \`40P01\` is a deadlock. Both may be retryable in your design, but classify and test them explicitly because their causes and frequency differ.

### Why do primary keys have gaps after the retry test?

PostgreSQL sequence increments are not rolled back with the transaction. A failed attempt can consume a sequence value. Assert uniqueness and referential correctness, not contiguous numbering.

### How many deadlock retries should a service allow?

There is no universal count. Choose a finite cap from the operation's latency budget, contention pattern, and idempotency guarantees. Tests should prove that exact cap and that the last database error remains visible when it is exhausted.
`,
};
