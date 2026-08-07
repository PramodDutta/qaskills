import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Database Testing Transaction Isolation Levels with Deterministic Concurrency',
  description: 'Use database testing transaction isolation levels to reproduce concurrency anomalies, verify retries, and prevent data corruption with deterministic tests.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Database Testing Transaction Isolation Levels with Deterministic Concurrency

Database testing transaction isolation levels means coordinating two or more real transactions so a test can prove which concurrent histories the application permits. The dependable workflow is to create a known row set, open separate connections, pause each transaction at named barriers, perform reads and writes in a controlled order, and assert both client-visible results and final committed state. A test that merely launches two promises and hopes they overlap is not a concurrency test you can trust.

Isolation labels alone are not the oracle. Database engines implement the SQL isolation levels with different concurrency-control mechanisms and documented nuances. Application code adds read-modify-write logic, locks, optimistic versions, retries, connection pools, and transaction boundaries. Your test must name the business invariant first, then verify it against the exact engine and configuration used in production.

This guide uses PostgreSQL-flavored SQL and TypeScript examples because they are concrete, but the harness design applies broadly. Consult the official documentation for your selected database before translating expected anomalies. Never infer another engine's behavior from a similarly named level.

## Translate business rules into concurrency invariants

Users do not report "a nonrepeatable read." They report that two agents accepted the final seat, an account became negative, or an on-call schedule ended with nobody assigned. Begin with the rule that must remain true after all committed transactions.

Examples include:

- Inventory quantity never drops below zero.
- A username is unique within a tenant.
- At least one doctor remains on call for a shift.
- A payment capture is applied at most once.
- A document edit does not silently overwrite a newer revision.
- A ledger transfer preserves the sum of balances.

Then identify the transaction pattern that threatens it. The same invariant may be protected by a constraint, an atomic SQL statement, row locks, serializable transactions, optimistic version checks, or an idempotency key. The database test should prove the chosen mechanism, not merely observe that one run happened to pass.

| Business invariant | Dangerous interleaving | Candidate control | Final-state oracle |
|---|---|---|---|
| Stock remains nonnegative | Two buyers read quantity 1, both decrement | Conditional atomic update or locking | Quantity and successful order count |
| No lost profile edit | Two writers read version 7, both save | Version column in update predicate | One success, one conflict, version 8 |
| One active username per tenant | Concurrent inserts use same name | Unique database constraint | One committed row |
| At least one on-call doctor | Each transaction disables a different doctor after seeing the other | Serializable policy or explicit locking | On-call count is at least one |
| Transfer conserves money | Partial updates or conflicting transfers | One transaction plus constraints | Sum and per-account rules |
| Event handled once | Duplicate consumers insert same key | Unique event key and conflict handling | One effect and one receipt |

Constraints are powerful test oracles. If the invariant can be expressed in the database, do so, then test how the application reports constraint conflicts. Isolation and constraints solve related but distinct problems.

## Use the standard anomaly vocabulary carefully

Isolation discussions become confusing when teams use terms loosely. Define the history in the test report instead of relying only on a label.

| Phenomenon | Controlled history | Observable symptom | Application example |
|---|---|---|---|
| Dirty read | Transaction B reads A's uncommitted write | B observes a value that A later rolls back | Showing an uncommitted balance |
| Nonrepeatable read | B commits a row update between A's two reads | A sees two values for one row | Pricing changes during one calculation |
| Phantom read | B commits a matching insert or delete between A's predicate reads | A's result set changes | New reservation appears in a range |
| Lost update | Two actors derive writes from the same old value | One committed intent is overwritten | Counter increments once instead of twice |
| Write skew | Transactions read overlapping facts and write different rows | Combined result violates invariant | Both on-call doctors disable themselves |
| Serialization failure | Engine rejects a history that cannot be serialized safely | One transaction aborts and must retry | Concurrent schedule changes conflict |

The SQL standard levels provide a vocabulary, but engine documentation is authoritative for observed behavior. PostgreSQL documents its transaction isolation behavior at https://www.postgresql.org/docs/current/transaction-iso.html. MySQL, SQL Server, Oracle Database, and others have their own semantics, defaults, and lock behavior. Pin the engine image or service version used by CI according to your platform policy, and record it in failure output.

What people get wrong is building a generic test such as "repeatable read prevents phantoms" and running it everywhere. Even when the final assertion passes, it may pass because a query blocked, a snapshot was reused, a range lock was taken, or the interleaving never occurred. State the actual events and whether blocking or aborting is an allowed result.

## Build a deterministic two-connection harness

Every concurrent actor needs a dedicated database connection. If both callbacks accidentally share one connection, they cannot represent independent overlapping transactions. If a pool returns different connections between statements because transaction scoping is wrong, the test is equally invalid.

Use named barriers controlled by the test process. A barrier resolves after all expected participants reach it, letting the harness enforce an interleaving without arbitrary sleeps.

\`\`\`ts
type Barrier = {
  arrive: () => Promise<void>;
};

export function barrier(participants: number): Barrier {
  let arrived = 0;
  let release!: () => void;
  const open = new Promise<void>(resolve => {
    release = resolve;
  });

  return {
    async arrive() {
      arrived += 1;
      if (arrived === participants) release();
      if (arrived > participants) {
        throw new Error('Barrier received too many participants');
      }
      await open;
    },
  };
}
\`\`\`

This one-shot barrier fits a single phase. Create a separate instance for each rendezvous. For more complex schedules, explicit deferred signals such as \`aHasRead\` and \`bHasCommitted\` make the narrative clearer than reusing a cyclic primitive.

Also apply a test-level deadline. Deadlock, unexpected blocking, or a missing signal should fail with the last reached phase instead of hanging the suite. Do not use a short statement timeout as a substitute for schedule control, because slow CI can then change semantics.

## Provision the real engine with isolated test data

Mocks cannot reproduce MVCC snapshots, lock queues, deadlock detection, or serialization checks. Run the production database engine in a disposable environment. Testcontainers is a convenient option when Docker is available, but a dedicated CI database also works if each test has isolated schema or database names and safe cleanup.

This setup uses the documented PostgreSQL container from the Node Testcontainers package and the \`pg\` client. Choose the image tag through your project's controlled dependency policy rather than copying an arbitrary version from an article.

\`\`\`ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';

const image = process.env.POSTGRES_TEST_IMAGE;
if (!image) throw new Error('POSTGRES_TEST_IMAGE must name a pinned PostgreSQL image');

const container = await new PostgreSqlContainer(image).start();
const pool = new Pool({ connectionString: container.getConnectionUri() });

await pool.query(
  'CREATE TABLE inventory (' +
    'sku text PRIMARY KEY, ' +
    'quantity integer NOT NULL CHECK (quantity >= 0), ' +
    'version integer NOT NULL DEFAULT 0' +
  ')',
);
await pool.query(
  "INSERT INTO inventory (sku, quantity) VALUES ('camera-1', 1)",
);

// Run tests, then close the pool before stopping the container.
await pool.end();
await container.stop();
\`\`\`

Use lifecycle hooks in a real suite so resources close even after assertion failure. Avoid reusable containers for isolation tests unless fixture reset is proven. Leftover locks, rows, prepared statements, or changed session settings can contaminate the next case.

If your application supports multiple database products, run product-specific expectations. Do not hide divergent semantics behind the lowest common assertion. The purpose is to show how each supported deployment preserves the same business invariant.

## Prove a lost update before validating its fix

A useful concurrency test can demonstrate that the unsafe implementation fails under the controlled history, then prove the chosen correction. This verifies the harness itself. Consider an application that reads quantity, subtracts one in memory, and writes the new value.

\`\`\`ts
async function unsafePurchase(client: import('pg').PoolClient, sync: Barrier) {
  await client.query('BEGIN');
  const result = await client.query<{ quantity: number }>(
    "SELECT quantity FROM inventory WHERE sku = 'camera-1'",
  );
  const next = result.rows[0].quantity - 1;
  await sync.arrive();
  await client.query(
    "UPDATE inventory SET quantity = $1 WHERE sku = 'camera-1'",
    [next],
  );
  await client.query('COMMIT');
}
\`\`\`

With two buyers and starting quantity 1, both may derive 0. The check constraint does not catch the logical oversell because the stored quantity is not negative. If two orders are created, the business invariant fails even though the inventory row looks plausible. Assert both sides of the accounting equation.

An atomic conditional update is often simpler:

\`\`\`sql
UPDATE inventory
SET quantity = quantity - 1,
    version = version + 1
WHERE sku = 'camera-1'
  AND quantity > 0
RETURNING quantity, version;
\`\`\`

The application treats one returned row as success and zero rows as sold out. The test coordinates two calls and expects exactly one success, one sold-out result, quantity zero, and one order. This does not require the test to assert a particular lock implementation.

\`\`\`ts
test('only one concurrent buyer gets the final item', async () => {
  await resetInventoryAndOrders();
  const start = barrier(2);

  const results = await Promise.all([
    purchaseLastItem('buyer-a', start),
    purchaseLastItem('buyer-b', start),
  ]);

  expect(results.filter(result => result === 'purchased')).toHaveLength(1);
  expect(results.filter(result => result === 'sold-out')).toHaveLength(1);

  const inventory = await pool.query(
    "SELECT quantity FROM inventory WHERE sku = 'camera-1'",
  );
  const orders = await pool.query(
    "SELECT buyer_id FROM orders WHERE sku = 'camera-1'",
  );
  expect(inventory.rows[0].quantity).toBe(0);
  expect(orders.rows).toHaveLength(1);
});
\`\`\`

If the two operations never overlap, the barrier should sit after both transactions have begun and immediately before the contested statement. Instrument phase events in test output so a failure shows whether each buyer reached the intended point.

## Test nonrepeatable and phantom reads as explicit histories

To test a repeated read, transaction A must perform both reads in the same transaction on the same connection. Transaction B must commit between them. Autocommit reads are separate transactions and cannot prove the intended behavior.

The schedule can be expressed as a table before code:

| Phase | Transaction A | Transaction B | Required observation |
|---:|---|---|---|
| 1 | Begin at chosen isolation | Wait | A owns one connection |
| 2 | Read price or predicate | Wait | Save first result |
| 3 | Signal first read | Update or insert, then commit | B's commit completes |
| 4 | Read same row or predicate | Finished | Save second result |
| 5 | Commit or roll back | Finished | Compare according to engine docs |

Set isolation at transaction start using syntax documented by the database. For PostgreSQL:

\`\`\`sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT price_cents FROM products WHERE id = 42;
-- The test harness now lets transaction B update and commit.
SELECT price_cents FROM products WHERE id = 42;
COMMIT;
\`\`\`

The comment represents a harness signal, not a pause typed into an interactive session. Capture timestamps around B's update and commit to distinguish a changed snapshot from blocking.

For a phantom-style predicate, read a stable ordered set such as \`SELECT id FROM reservations WHERE room_id = $1 AND day = $2 ORDER BY id\`. Transaction B inserts a matching row and commits before A repeats the predicate. Assert the exact ID sets. Avoid \`COUNT(*)\` alone if duplicate setup data could produce the same count through an insert and delete.

These tests are educational and may protect reporting transactions, but tie them to real application needs. A transaction that performs only one query cannot suffer a nonrepeatable read within itself. Do not increase isolation globally to satisfy a synthetic test that has no corresponding workflow.

## Reproduce write skew with a cross-row invariant

Write skew is especially important because two transactions update different rows, so ordinary row-level write conflicts may not protect the combined rule. Imagine two doctors, Ada and Lin, both on call. Each transaction checks that another doctor remains on call, then turns its own row off.

\`\`\`sql
CREATE TABLE on_call (
  shift_date date NOT NULL,
  doctor text NOT NULL,
  enabled boolean NOT NULL,
  PRIMARY KEY (shift_date, doctor)
);

INSERT INTO on_call (shift_date, doctor, enabled)
VALUES
  (DATE '2026-08-07', 'Ada', true),
  (DATE '2026-08-07', 'Lin', true);
\`\`\`

Both transactions read a count of two before either writes. Each updates a different row, and the final count can become zero under an isolation mode that permits that history. The invariant spans a predicate, not one row.

\`\`\`ts
async function leaveShift(
  doctor: string,
  client: import('pg').PoolClient,
  afterRead: Barrier,
) {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try {
    const result = await client.query<{ active: string }>(
      "SELECT count(*) AS active FROM on_call " +
      "WHERE shift_date = DATE '2026-08-07' AND enabled = true",
    );
    if (Number(result.rows[0].active) < 2) throw new Error('Coverage required');

    await afterRead.arrive();
    await client.query(
      "UPDATE on_call SET enabled = false " +
      "WHERE shift_date = DATE '2026-08-07' AND doctor = $1",
      [doctor],
    );
    await client.query('COMMIT');
    return 'committed' as const;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
\`\`\`

Then run the schedule at the application's selected level and assert its documented outcome. Under PostgreSQL Serializable, the engine may abort one transaction with a serialization failure to prevent an inconsistent history. Applications using this level must handle retryable failures correctly. Do not assert which actor loses, because scheduling can vary.

The correction could be a serializable transaction with bounded retry, an explicit lock that covers a stable guard row, or a remodeled constraint. Test the business result, permitted abort behavior, and user-facing response.

## Verify retry loops as part of the transaction contract

Increasing isolation without testing retries moves the failure from silent corruption to intermittent user errors. A retry policy should recognize only documented retryable database outcomes, roll back the failed transaction, start a new transaction on a valid connection, apply a bounded attempt count, and preserve idempotency of external effects.

| Retry concern | Test stimulus | Required outcome |
|---|---|---|
| Classification | Inject or naturally create documented serialization conflict | Retry only the intended database condition |
| Fresh transaction | First attempt aborts | Second attempt begins a new transaction context |
| Bound | Every attempt conflicts | Operation returns controlled failure after limit |
| Backoff | Many workers conflict | Retry pressure does not become a tight loop |
| External effects | Attempt sends message or calls service | Effect occurs once after successful commit |
| Observability | One or more attempts abort | Logs and metrics record attempts without secrets |

Do not fake a database error object with an invented code if the driver exposes real structured errors. A deterministic integration test can create a serialization conflict against the actual engine. Keep a smaller unit test for the policy function using error examples captured from official driver behavior.

\`\`\`ts
async function withSerializableRetry<T>(work: () => Promise<T>): Promise<T> {
  const maximumAttempts = 3;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      const retryable = isDocumentedSerializationFailure(error);
      if (!retryable || attempt === maximumAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt * 25));
    }
  }
  throw new Error('Unreachable retry state');
}
\`\`\`

\`isDocumentedSerializationFailure\` is intentionally project-specific. Implement it from the database and driver documentation and preserve the original error as diagnostic context. Do not retry uniqueness violations, validation failures, or arbitrary network errors under the same rule.

Side effects should usually be coupled through an outbox or another design that makes commit state explicit. A test that mocks email and sees two calls during a retried transaction has revealed a real architectural risk even if database rows are correct.

## Test the API boundary and the repository boundary

Repository-level tests give precise schedule control. API-level tests prove that request handling, pool use, transaction scope, error mapping, and idempotency work together. Use both, but do not force every anomaly through HTTP.

For an API test, expose no test-only endpoint that pauses production transactions. Instead, create contention using supported operations and a seed state, or enable a test-environment synchronization adapter behind dependency injection. Never ship a public pause hook.

If the application is a Node API, [Supertest API testing workflows](/blog/supertest-node-api-testing-complete-guide) can help structure HTTP assertions while the database harness controls state. The test should send both requests before awaiting either response, then inspect final state through a trusted query or documented read endpoint.

\`\`\`ts
const [first, second] = await Promise.all([
  request(app)
    .post('/inventory/camera-1/purchases')
    .set('Idempotency-Key', 'buyer-a-final-item')
    .send({ buyerId: 'buyer-a' }),
  request(app)
    .post('/inventory/camera-1/purchases')
    .set('Idempotency-Key', 'buyer-b-final-item')
    .send({ buyerId: 'buyer-b' }),
]);

const statuses = [first.status, second.status].sort();
expect(statuses).toEqual([201, 409]);

const finalState = await readInventoryAndOrders('camera-1');
expect(finalState.quantity).toBe(0);
expect(finalState.orders).toHaveLength(1);
\`\`\`

The exact conflict status is an API contract choice, not a universal requirement. Assert the documented response. Ensure unique idempotency keys in this particular test so the outcome is caused by stock contention, not duplicate-request handling.

Unit-test the retry classifier and invariant functions with the runner already used by the project. If you are selecting the layers and runners, [the JavaScript testing frameworks comparison](/blog/javascript-testing-frameworks-complete-guide-2026) explains their roles. Keep the database container suite clearly labeled as integration testing so contributors know it requires a real engine.

## Diagnose a test that passes locally and hangs in CI

A common failure mode is a lost-update test that passes on a laptop but times out in CI. Logs show transaction A reached its update, transaction B reached the barrier, and neither completed. The harness placed a two-party barrier after A acquired a row lock but before B could acquire the same lock and reach the barrier. The intended rendezvous is impossible.

Diagnose the schedule, not just the timeout:

1. Log a monotonic phase event for begin, first read, barrier arrival, statement start, statement finish, commit, rollback, and connection release.
2. Record connection identity using a database-supported session identifier when safe.
3. Inspect database activity and lock waits in the isolated CI environment using documented observability views.
4. Confirm both actors received different pool clients.
5. Move barriers before contested lock acquisition or use one-way signals to express the desired order.
6. Distinguish an expected block from a harness deadlock with bounded deadlines.
7. Re-run repeatedly and under constrained runner resources.

Arbitrary \`setTimeout\` calls often appear to fix the test by changing scheduling probability. They do not establish causality and will become flaky again. Use explicit handshakes around operations that do not themselves block on the other participant.

Another false pass happens when cleanup commits through one connection while a pooled transaction retains an older snapshot. Create and verify fixtures outside active tested transactions, and make connection ownership obvious in helpers. Always roll back in a \`finally\` or error path before releasing clients.

## Make the isolation suite observable and maintainable

Concurrency failures need a history. Emit a compact timeline with actor, phase, elapsed time, transaction attempt, and outcome. Do not log complete SQL parameter values when they may contain sensitive data. For deterministic fixtures, identifiers such as \`camera-1\` and \`buyer-a\` are enough.

Run a small invariant suite on pull requests and broader stress repetitions on a schedule. Deterministic tests catch known schedules quickly. Stress tests vary worker counts and timing to discover unmodeled histories, but a stress pass is not proof of correctness. When stress finds a failure, reduce it into a deterministic regression schedule.

Recommended suite boundaries are:

- Pure tests for calculations, retry classification, and update predicates.
- Repository integration tests with real connections and named schedules.
- API tests for a few business-critical contention paths.
- Migration tests for constraints and indexes that enforce invariants.
- Scheduled contention tests with multiple workers and invariant queries.

Keep isolation expectations beside the workflow they protect. A central chart saying "we use Read Committed" is too coarse because one repository method may issue an atomic update, another may take locks, and a third may request a different level. Document the transaction boundary and invariant in the test name.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI if an AI coding agent needs a repeatable database-test workflow. Still review generated schedules carefully. Agents are good at enumerating anomalies and writing fixture code, but they can place an impossible barrier or assume generic engine semantics unless the prompt includes the production database documentation and business invariant.

## Establish a release decision from final-state evidence

A concurrency case passes only when the observed history is allowed and the final invariant holds. Acceptable histories may include one successful transaction and one documented conflict, both successful atomic operations with correct combined state, or a serialization abort followed by one successful retry. Unexpected blocking, silent overwrites, duplicate side effects, and unexplained driver errors fail the gate.

| Test result | Client outcomes | Final invariant | Decision |
|---|---|---|---|
| Both operations succeed correctly | Documented success responses | Preserved | Pass |
| One operation conflicts cleanly | One success, one documented conflict | Preserved | Pass |
| Serialization abort retries successfully | Final responses meet contract | Preserved, side effects once | Pass |
| Silent lost update | Both claim success | Violated or one intent missing | Fail |
| Harness deadline | Responses incomplete | Unknown | Inconclusive, fix schedule |
| Unexpected database abort | Unmapped error | Preserved by chance | Fail contract or test setup |

Store the engine identity, schema migration identifier, application commit, isolation setting, attempt count, and event timeline with a failure. Those details let engineers separate a changed database plan or setting from an application regression.

The goal is not to eliminate concurrency. It is to make simultaneous operations resolve according to a known product rule. Once every critical invariant has at least one forced dangerous interleaving and one end-to-end contention check, isolation testing becomes a release control rather than an occasional race-condition hunt.

## Frequently Asked Questions

### Which transaction isolation level should an application use?

There is no universal choice. Start from each business invariant, query pattern, contention profile, and the exact database's documented semantics. An atomic conditional update at the default level may protect inventory better and more cheaply than a broad level change. A cross-row scheduling invariant may need serializable execution, explicit locking, or remodeling. Test the chosen mechanism under a forced dangerous history, measure aborts and latency, and document retry behavior before adopting it widely.

### Can an in-memory database test transaction isolation accurately?

Only if that database is itself a supported production target and its semantics match the behavior you need to prove. In-memory substitutes often differ in snapshots, locking, constraints, SQL, and error reporting. Use them for fast repository feedback where appropriate, but run concurrency invariants against the actual production engine in a disposable container or isolated service. The database's conflict detection and the real driver's error objects are part of the system under test.

### How many times should a concurrency test repeat?

A correctly synchronized regression test should force its target history once per case, so repetition is not the primary source of confidence. Run it multiple times to detect harness leakage and resource sensitivity, but fix any probabilistic coordination you find. Separately run scheduled stress tests with varying workers and workloads to explore unknown histories. When stress exposes corruption, capture the event order and turn it into a named, deterministic regression test.

### Should serialization failures be hidden from API clients?

The application should usually retry documented transient serialization failures within a bounded policy when doing so is safe and idempotent. If attempts are exhausted, return the service's documented conflict or temporary-failure response rather than leaking driver details. Whether the client retries depends on the operation contract. Tests should verify the bound, fresh transaction per attempt, stable external effects, observability, and final invariant, not merely that an exception was caught.
`,
};
