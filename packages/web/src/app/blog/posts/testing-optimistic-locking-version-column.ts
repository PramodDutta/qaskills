import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Optimistic Locking with a Version Column',
  description:
    'Test optimistic locking with a version column by racing stale updates, checking atomic SQL predicates, and proving conflicts preserve committed data.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing Optimistic Locking with a Version Column

Two editors open product 42 at version 7. One changes the price, the other changes the description. If both updates run as ordinary \'UPDATE ... WHERE id = 42\' statements, the second commit can erase the first editor's work without an error. A version predicate converts that silent overwrite into an observable conflict.

The database operation must compare the version and increment it atomically. The test must create two stale views of the same row, race their updates, and prove exactly one wins. Mocking a repository cannot establish any of those properties because the defect lives in SQL row matching and concurrency.

## The invariant lives in one UPDATE statement

A conventional table starts at version 1 and increments on every successful application update. The caller sends the version it read. SQL includes that expected value in the \'WHERE\' clause and increments the column in the same statement:

\'UPDATE products SET name = $1, version = version + 1 WHERE id = $2 AND version = $3 RETURNING ...\'

If another writer already advanced the row, the predicate matches zero rows. PostgreSQL treats zero updated rows as a valid command result, so the repository must translate \'rowCount === 0\' into a domain conflict after distinguishing it from not found if the API promises different responses.

| Property | Required observation | Bug exposed when it fails |
| --- | --- | --- |
| Atomic compare and increment | Version predicate and increment share one statement | Check-then-update race |
| One winner per expected version | Only one concurrent update returns a row | Lost update |
| Monotonic version | Winner moves N to N+1 | Version reused or reset |
| Loser cannot mutate data | Final values equal winner's values | Partial stale write |
| Fresh retry can succeed | Re-read version is accepted | Conflict handling permanently blocks row |

Do not implement locking as \'SELECT version\', compare in JavaScript, then unconditional \'UPDATE\'. Both callers can pass the JavaScript check before either writes. The condition belongs in the write statement evaluated by PostgreSQL.

## Build a repository result that cannot hide zero-row updates

The following TypeScript uses the real \'pg\' API. It distinguishes an updated row from a stale or absent row without claiming that every zero-row result is definitely a version conflict.

\`\`\`ts
import type { Pool, PoolClient } from 'pg';

export type Product = {
  id: number;
  name: string;
  priceCents: number;
  version: number;
};

export type UpdateResult =
  | { kind: 'updated'; product: Product }
  | { kind: 'conflict'; currentVersion: number }
  | { kind: 'not-found' };

export async function updateProduct(
  db: Pool | PoolClient,
  input: { id: number; name: string; priceCents: number; expectedVersion: number },
): Promise<UpdateResult> {
  const updated = await db.query<Product>(
    'UPDATE products ' +
      'SET name = $1, price_cents = $2, version = version + 1 ' +
      'WHERE id = $3 AND version = $4 ' +
      'RETURNING id, name, price_cents AS "priceCents", version',
    [input.name, input.priceCents, input.id, input.expectedVersion],
  );

  if (updated.rows[0]) {
    return { kind: 'updated', product: updated.rows[0] };
  }

  const current = await db.query<{ version: number }>(
    'SELECT version FROM products WHERE id = $1',
    [input.id],
  );

  return current.rows[0]
    ? { kind: 'conflict', currentVersion: current.rows[0].version }
    : { kind: 'not-found' };
}
\`\`\`

The follow-up select is for classification, not correctness. Between the failed update and the select, another transaction can update or delete the row. The response reports the state observed during classification, not a snapshot guaranteed to match the exact instant of conflict. If that nuance is unacceptable, return one generic precondition failure or perform classification inside a transaction with an isolation policy designed for the requirement.

Column aliases matter with \'pg\': PostgreSQL returns \'price_cents\' unless SQL aliases it. The example maps it to the TypeScript field and returns the new version from the winning statement. Do not calculate the returned version in application code as \'expectedVersion + 1\'; let the database response remain authoritative.

For a wider treatment of disposable databases, migrations, fixtures, and cleanup, use the [database test automation guide](/blog/database-testing-automation-guide).

## Race two stale writers against PostgreSQL

An integration test should use a real PostgreSQL instance and two independently checked-out connections. A barrier makes both callers read the same version before either update is released. Avoid timing-only choreography such as "sleep 50 milliseconds" because it does not prove both stale views exist.

\`\`\`ts
import { Pool } from 'pg';
import { afterAll, beforeEach, expect, test } from 'vitest';
import { updateProduct } from './product-repository';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

beforeEach(async () => {
  await pool.query('TRUNCATE products RESTART IDENTITY');
  await pool.query(
    'INSERT INTO products (id, name, price_cents, version) VALUES ($1, $2, $3, $4)',
    [42, 'Mechanical Keyboard', 12000, 7],
  );
});

afterAll(async () => {
  await pool.end();
});

test('one of two updates from version 7 wins and the other conflicts', async () => {
  const clientA = await pool.connect();
  const clientB = await pool.connect();

  try {
    const [viewA, viewB] = await Promise.all([
      clientA.query<{ version: number }>('SELECT version FROM products WHERE id = 42'),
      clientB.query<{ version: number }>('SELECT version FROM products WHERE id = 42'),
    ]);
    expect(viewA.rows[0].version).toBe(7);
    expect(viewB.rows[0].version).toBe(7);

    const [resultA, resultB] = await Promise.all([
      updateProduct(clientA, {
        id: 42,
        name: 'Keyboard, editor A',
        priceCents: 12100,
        expectedVersion: 7,
      }),
      updateProduct(clientB, {
        id: 42,
        name: 'Keyboard, editor B',
        priceCents: 11900,
        expectedVersion: 7,
      }),
    ]);

    expect([resultA.kind, resultB.kind].sort()).toEqual(['conflict', 'updated']);

    const final = await pool.query<{
      name: string;
      priceCents: number;
      version: number;
    }>('SELECT name, price_cents AS "priceCents", version FROM products WHERE id = 42');

    expect(final.rows[0].version).toBe(8);
    const winner = resultA.kind === 'updated' ? resultA.product : resultB.product;
    expect(final.rows[0]).toEqual({
      name: winner.name,
      priceCents: winner.priceCents,
      version: winner.version,
    });
  } finally {
    clientA.release();
    clientB.release();
  }
});
\`\`\`

The test does not assert whether A or B wins. PostgreSQL scheduling is not the product contract. It asserts the outcome set, final version, and final values. This makes the race deterministic at the business level while allowing either legal interleaving.

Each repository call above runs in autocommit mode. PostgreSQL serializes conflicting row updates as needed; once the first statement commits and advances version to 8, the other statement's version-7 predicate matches no current row. If production wraps more work in explicit transactions, add transaction-level tests matching that boundary.

## Assert the loser leaves no partial footprint

A repository may update several tables: the product, an audit record, an outbox event, and inventory projections. Optimistic conflict must roll back all side effects belonging to the losing operation. The simplest way is to execute the versioned update first inside a transaction, check that it returned a row, then write dependent records and commit.

If the code inserts an outbox event before checking \'rowCount\', the stale request can emit an event for a change that never occurred. Extend the race test with counts and identities:

| Store | Winning operation | Losing operation | Final assertion |
| --- | --- | --- | --- |
| \'products\' | One row updated to version 8 | Zero rows updated | Winner's complete values persist |
| \'product_audit\' | One audit entry | No audit entry | Exactly one event references version 8 |
| \'outbox\' | One message queued | No message queued | Payload matches committed row |
| Cache | Invalidated after commit | No independent mutation | Subsequent read returns version 8 |

Do not merely assert row counts. Verify the event payload does not mix A's name with B's price, and that it carries the committed version. A poorly ordered transaction can preserve cardinality while publishing inconsistent content.

If database triggers increment versions, test the trigger directly and remove the application-side increment. Having both layers increment produces surprising jumps. If an ORM manages versions, inspect generated SQL in an integration test or query log. The same atomic predicate is required regardless of abstraction.

## Map conflicts to an honest API response

HTTP APIs commonly expose the version as a resource field or an ETag. A request may send \'expectedVersion\' in JSON or \'If-Match\' with the validator. The response should distinguish malformed input from a valid but stale precondition.

Possible mappings include 409 Conflict or 412 Precondition Failed. If using \'If-Match\', 412 expresses the failed HTTP precondition naturally. If the domain command includes a version field, many APIs choose 409. Consistency and documented semantics matter more than forcing one status universally.

An API-level test should prove:

1. GET returns version 7 or its corresponding ETag.
2. Client A updates with 7 and receives the updated representation at 8.
3. Client B submits the stale 7 and receives the documented conflict status.
4. The conflict response does not claim B's values were stored.
5. A fresh GET returns A's committed representation.
6. B may reapply its intended change against version 8 only through an explicit user or client decision.

Do not automatically retry a stale write with the new version unless the operation is known to be commutative and the product requirement permits it. Retrying a full replacement can still erase the winner. A human-facing editor should normally show the conflict and support merge or refresh.

The [API testing best practices guide](/blog/api-testing-best-practices-guide) covers response contracts, negative cases, and authentication boundaries around this database behavior.

## Distinguish optimistic locking from transaction isolation

PostgreSQL's MVCC and isolation levels govern what transactions see and how conflicting database operations behave. A version column adds an application-visible precondition that can span minutes between a user's read and write, far beyond one database transaction.

At \'READ COMMITTED\', the atomic conditional update is sufficient for the classic stale-editor scenario. At \'REPEATABLE READ\' or \'SERIALIZABLE\', concurrent patterns may also produce serialization errors that require transaction retry. Do not treat SQLSTATE serialization failures and expected version conflicts as identical:

- A version conflict means the resource changed relative to the client's explicit version.
- A serialization failure means PostgreSQL could not serialize the transaction interleaving under the chosen isolation level.
- A deadlock is another database scheduling failure with its own retry considerations.

Tests should cover the production isolation level and error mapping. If the transaction retry wrapper reruns a command, it must preserve idempotency and must not overwrite after refreshing an expected version behind the caller's back.

Pessimistic locking with \'SELECT ... FOR UPDATE\' solves a different problem. It holds a row lock during a transaction, useful when a short critical section must serialize decisions. It cannot hold a database transaction open while a user edits a form. Optimistic versions are suited to disconnected read-modify-write flows with relatively infrequent collision.

## Cover deletes, restores, and bulk operations

Deletion can race with update. A soft delete should usually increment version or otherwise make the old representation stale. A hard delete makes the failed conditional update indistinguishable from not found at the statement level. Define whether the API returns not found, conflict, or a generic precondition failure, then test the race without assuming a follow-up select is timeless.

Restoring a soft-deleted row must not reset version to 1. Reusing an old version can allow an ancient client snapshot to pass after delete and restore. Keep the sequence monotonic for the row identity or issue a new identity.

Bulk updates are dangerous when each item carries a different expected version. A single statement can update matching rows and return their IDs, but the service must decide whether partial success is allowed. Test one stale item among fresh ones. For all-or-nothing semantics, the transaction must roll back every item. For partial semantics, the response must identify successes and conflicts precisely.

Database-side maintenance jobs also need a policy. If a job changes a field visible in the resource contract, it should advance the version. If it updates only operational metadata such as a last-indexed timestamp, incrementing may cause needless user conflicts. Classify columns deliberately and test the chosen behavior.

## Version type and migration details

Use a database integer type with ample range, often \'bigint\' for long-lived high-write rows. JavaScript cannot precisely represent every 64-bit integer as \'number\'. The \'pg\' driver commonly returns PostgreSQL \'bigint\' as a string unless a parser is changed. Align the TypeScript type, JSON representation, and comparison behavior rather than coercing large values unsafely.

Adding a non-null version column to an existing table requires a migration plan. A default can initialize current rows, but application versions during rolling deployment must agree about the column. Test mixed-version compatibility if old and new services overlap. An old writer that ignores the version can still overwrite data and may fail to increment the column.

A migration acceptance suite should verify existing rows receive the intended initial version, new inserts initialize correctly, conditional updates increment once, and legacy write paths are removed or blocked. Observability can count conflict outcomes, but do not publish a universal acceptable conflict rate. Product workflows differ.

## Diagnose flaky concurrency tests

Concurrency tests become flaky when they assert timing instead of state. Use barriers, separate connections, and outcome sets. Log safe identifiers, expected version, returned kind, and final version on failure. Keep the database local to the test environment and reset rows without interfering with parallel test files.

Do not share ID 42 across concurrent suite workers unless each worker has its own schema or database. Generate unique IDs or namespace schemas by worker. A test that conflicts with an unrelated test has demonstrated poor isolation, not optimistic locking.

Run the two-writer case repeatedly in a focused stress job in addition to the deterministic integration test. Repetition can expose side effects and transaction leaks, while the core assertion remains exactly one winner. Avoid converting the suite into an unbounded probabilistic loop on every commit.

## Verify patch semantics do not bypass the version

Partial update endpoints can appear safer because two clients modify different fields, but they still need a concurrency policy. If client A changes price and client B changes description from the same version, automatically merging may be acceptable only when the domain explicitly defines field-level independence. Otherwise the stale patch must conflict.

Test omitted, null, and unchanged fields. The repository must not increment version for a rejected validation request, and the API should define whether a no-op update increments. A no-op that advances the version can create needless conflicts; a no-op that does not advance must still evaluate authorization and the expected version consistently.

Mass-assignment is especially dangerous. Never let a request body write the \'version\' column directly through an ORM spread operation. Send \'expectedVersion\' as a precondition, select allowed mutable fields, and let SQL calculate the next value. Add a negative API case that submits an extremely high version in the payload and proves it cannot force the stored counter.

## Observe conflicts without exposing record contents

Instrument successful updates and version conflicts with operation name, resource type, safe tenant scope, and retry outcome. Avoid logging the full stale request or current row because fields may contain sensitive business data. A conflict counter helps identify a broken client that omits refreshed versions, while a sudden database-error increase points elsewhere.

Trace one request from API precondition through SQL result and response mapping in a test environment. The expected version in telemetry should match the predicate parameter, and a zero-row update should never be logged as successful. If the caller retries after user resolution, use a new request identifier while retaining a safe causal link so operators can distinguish deliberate resolution from an automatic overwrite loop.

## Frequently Asked Questions

### Why not read the version and then issue a separate update?

Because another writer can commit between the read and update. Put the expected version in the update predicate and increment it in that same statement.

### Is rowCount zero always an optimistic-lock conflict?

No. The row may not exist, may have been deleted, or may be excluded by another predicate. Either expose a combined precondition failure or classify with an additional read while acknowledging concurrent state can change again.

### Should the API automatically retry with the newest version?

Usually not for replacement updates. That can overwrite the winner after silently changing the caller's precondition. Automatic retry is safer only for explicitly commutative, idempotent operations with a documented merge rule.

### Does SELECT FOR UPDATE replace a version column?

It can serialize writers inside short database transactions, but it cannot protect a record while a user edits outside the transaction. A version column detects that disconnected stale write.

### Must every database update increment the version?

Every change that affects the client-visible resource contract should. Purely operational metadata may be excluded to avoid false conflicts, but the boundary must be intentional and covered by tests.
`,
};
