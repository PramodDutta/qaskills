import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Database Triggers: Side Effects, Ordering, and Bypass Paths',
  description: 'database trigger testing proves side effects, ordering, and bypass paths before hidden database logic silently corrupts test data or production flows.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Database Triggers: Side Effects, Ordering, and Bypass Paths

Database trigger testing means proving that database triggers fire at the right time, create the right side effects, preserve ordering, and cannot be skipped by alternate write paths. A useful trigger test does not only assert that one row changed. It verifies the whole contract: initial write -> trigger execution -> side effect rows -> downstream constraints -> rollback behavior.

Triggers are invisible to most API tests. That is why they are useful, and why they are risky. A service can call one innocent INSERT and the database can update inventory, write an audit row, maintain a denormalized counter, reject a tenant boundary violation, or enqueue work through an outbox table. The application may not know which of those happened. QA has to know.

## Build The Trigger Contract Before Writing Tests

Treat every trigger as a small program with inputs, outputs, execution timing, and bypass assumptions. If the team cannot state those four things, the test will drift into checking implementation trivia instead of behavior.

| Contract area | Question to answer | Test evidence |
|---|---|---|
| Timing | Does it run BEFORE, AFTER, or INSTEAD OF the write? | Row values visible before and after the triggering statement |
| Scope | Does it run FOR EACH ROW or once per statement? | Multi-row INSERT, UPDATE, and DELETE examples |
| Side effect | Which tables, columns, or notifications change? | Direct assertions on every expected downstream record |
| Reversibility | What happens on rollback? | Transaction test proves side effects roll back together |
| Bypass | Which write paths can skip it? | Bulk load, disabled trigger, maintenance role, replica, and partition route checks |

A good trigger contract is boring. It reads like a checklist, not a migration comment.

\`\`\`text
Trigger: orders_inventory_after_insert
Event: AFTER INSERT ON orders
Scope: FOR EACH ROW
Inputs: orders.sku, orders.quantity, orders.status
Side effects:
  - decrement inventory.available_count for matching sku
  - insert one row into inventory_events
  - ignore orders with status = "draft"
Failure rule:
  - fail the order insert if inventory would go below zero
Bypass risks:
  - bulk import role
  - disabled triggers during backfill
  - partitioned orders table routing
\`\`\`

That contract drives the test matrix. Do not begin with the trigger function body. Begin with the externally visible promise.

## Model Side Effects As First Class Assertions

Most bad trigger tests assert only the base table. They insert an order, read the order back, and call it done. That proves almost nothing about trigger behavior. A trigger test should read the tables the trigger writes, and it should verify absence as carefully as presence.

Here is a compact PostgreSQL example. The trigger reserves inventory and records an event when a paid order line is inserted.

\`\`\`sql
CREATE TABLE inventory (
  sku text PRIMARY KEY,
  available_count integer NOT NULL CHECK (available_count >= 0)
);

CREATE TABLE order_lines (
  id bigserial PRIMARY KEY,
  order_id text NOT NULL,
  sku text NOT NULL REFERENCES inventory (sku),
  quantity integer NOT NULL CHECK (quantity > 0),
  payment_state text NOT NULL CHECK (payment_state IN ('draft', 'paid'))
);

CREATE TABLE inventory_events (
  id bigserial PRIMARY KEY,
  order_line_id bigint NOT NULL REFERENCES order_lines (id),
  sku text NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
\`\`\`

The trigger function should be small enough that behavior is easy to reason about. The tests should still target the behavior, not the exact PL/pgSQL branch layout.

\`\`\`sql
CREATE OR REPLACE FUNCTION reserve_inventory_for_paid_line()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_state <> 'paid' THEN
    RETURN NEW;
  END IF;

  UPDATE inventory
     SET available_count = available_count - NEW.quantity
   WHERE sku = NEW.sku;

  INSERT INTO inventory_events (order_line_id, sku, delta, reason)
  VALUES (NEW.id, NEW.sku, -NEW.quantity, 'paid_order_line');

  RETURN NEW;
END;
$$;

CREATE TRIGGER order_lines_reserve_inventory
AFTER INSERT ON order_lines
FOR EACH ROW
EXECUTE FUNCTION reserve_inventory_for_paid_line();
\`\`\`

Now test both the positive and negative side effects. The draft row is as important as the paid row because it proves the trigger has a condition, not just activity.

\`\`\`sql
BEGIN;

INSERT INTO inventory (sku, available_count)
VALUES ('SKU-1', 10);

INSERT INTO order_lines (order_id, sku, quantity, payment_state)
VALUES ('ORDER-1', 'SKU-1', 3, 'paid')
RETURNING id;

SELECT available_count
FROM inventory
WHERE sku = 'SKU-1';

SELECT sku, delta, reason
FROM inventory_events
WHERE sku = 'SKU-1'
ORDER BY id;

ROLLBACK;
\`\`\`

Expected evidence:

| Step | Expected result | Why it matters |
|---|---:|---|
| Insert paid line | One order_lines row | Base write succeeded |
| Read inventory | available_count is 7 | Side effect used the inserted quantity |
| Read events | One delta of -3 | Event row exists and matches business reason |
| Rollback | No rows remain | Side effects are part of the same transaction |

The rollback check catches a class of trigger bugs where the trigger calls a nontransactional side channel or writes through an unsafe external function. Most relational triggers run inside the same transaction, but teams sometimes attach notifications, stored procedures, or outbox writes that deserve explicit evidence.

## Test Ordering With Multi-Row Statements

Trigger ordering gets tricky when one SQL statement touches many rows. A row-level trigger may run for each row, but SQL does not promise that every visible side effect will match the order you imagined from the source VALUES list unless your design provides an ordering key.

If ordering matters, write it into the contract. A sequence, identity column, logical timestamp from the same transaction, or monotonic outbox id is better than relying on table scan order.

\`\`\`sql
CREATE TABLE trigger_trace (
  id bigserial PRIMARY KEY,
  trigger_name text NOT NULL,
  source_id bigint NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION trace_order_line_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO trigger_trace (trigger_name, source_id, note)
  VALUES ('order_lines_after_insert', NEW.id, NEW.sku);
  RETURN NEW;
END;
$$;

CREATE TRIGGER order_lines_trace_insert
AFTER INSERT ON order_lines
FOR EACH ROW
EXECUTE FUNCTION trace_order_line_insert();
\`\`\`

A useful ordering test inserts multiple rows in one statement, then orders by the trace identity, not by a guessed physical order.

\`\`\`sql
BEGIN;

INSERT INTO inventory (sku, available_count)
VALUES ('SKU-A', 20), ('SKU-B', 20), ('SKU-C', 20);

INSERT INTO order_lines (order_id, sku, quantity, payment_state)
VALUES
  ('ORDER-2', 'SKU-A', 1, 'paid'),
  ('ORDER-2', 'SKU-B', 2, 'paid'),
  ('ORDER-2', 'SKU-C', 3, 'paid');

SELECT source_id, note
FROM trigger_trace
WHERE trigger_name = 'order_lines_after_insert'
ORDER BY id;

ROLLBACK;
\`\`\`

Do not assert that the first VALUES tuple always produces the first trace row unless the database documentation and your table design support that guarantee. Assert the property your system needs. If the downstream consumer only needs every event once, test set equality. If it needs causal order, add a causal key and test that.

| Ordering need | Bad assertion | Better assertion |
|---|---|---|
| Every side effect exists | Trace rows equal source rows by position | Trace rows contain all source ids exactly once |
| Consumer processes changes in creation order | ORDER BY created_at only | ORDER BY sequence id with a unique constraint |
| Parent change before child change | Hope trigger names run alphabetically | Explicit trigger order or a single trigger function |
| Retry resumes after failure | Last timestamp seen | Last durable sequence value seen |

PostgreSQL can have multiple triggers for the same event on the same table. Their order is determined by the database rules, not by how the migration file looks in review. Other engines differ. This is where trigger testing pays for itself: it catches the gap between migration prose and engine behavior.

## Verify BEFORE And AFTER Semantics Directly

BEFORE triggers are often used to normalize or reject a row before it lands. AFTER triggers are often used to write dependent rows after the base row exists. Mixing those responsibilities makes tests confusing.

Here is a BEFORE trigger that normalizes email addresses. The test should assert the stored row, not a mock of the application formatter.

\`\`\`sql
CREATE TABLE accounts (
  id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION normalize_account_email()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER accounts_normalize_email
BEFORE INSERT OR UPDATE OF email ON accounts
FOR EACH ROW
EXECUTE FUNCTION normalize_account_email();
\`\`\`

The corresponding test is a plain database test.

\`\`\`sql
BEGIN;

INSERT INTO accounts (email)
VALUES ('  QA.User+Demo@Example.COM  ');

SELECT email
FROM accounts;

ROLLBACK;
\`\`\`

Expected result: \`qa.user+demo@example.com\`.

AFTER trigger tests should not inspect mutated NEW values because the base row already exists. They should inspect dependent rows. If a trigger both rewrites the row and writes to another table, split it when possible. If you cannot split it, write two tests: one for stored base-row mutation and one for side effect creation.

## Bypass Paths Are Where Trigger Bugs Hide

The scariest trigger defects are not inside the trigger body. They are in write paths that never fire it.

| Bypass path | How it happens | Test technique |
|---|---|---|
| Disabled trigger | Migration or backfill uses ALTER TABLE DISABLE TRIGGER | CI smoke test queries trigger enabled state |
| Direct maintenance role | Support script writes with elevated privileges | Role-based integration test runs as that role |
| COPY or bulk load | Import job uses a special mode or staging table | Import fixture verifies final side effects |
| Partition route | Parent table trigger not present where writes land | Insert into each partition route and assert effects |
| Replica reads | Test reads from lagging replica after trigger commit | Force primary read for trigger evidence |
| ORM bulk update | updateMany path skips application hooks | DB trigger should still fire, then API test proves it |

Database trigger testing should include metadata checks. These are not substitutes for behavior tests, but they catch accidental trigger removal early.

\`\`\`sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'order_lines'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
\`\`\`

If the result shows a trigger disabled, fail the build. Use this only for triggers that must be active in every test and production-like environment. Migration tests can have their own exceptions, but the exception should be visible in the test name and fixture setup.

Partitioned tables deserve special care. If orders are partitioned by month or tenant, insert through the same route the application uses and through at least one direct partition when that path is allowed. Pair this article with [testing cascade delete behavior](/blog/database-testing-cascade-delete-behavior) when a trigger reacts to deletes, because cascades can multiply the number of rows affected before your trigger ever runs.

## Make Trigger Tests Deterministic Under Concurrency

Concurrency tests should be narrow. They should not become full load tests with random failures and hard-to-read logs. The point is to prove locking, constraints, and trigger side effects under overlapping transactions.

Consider a trigger that decrements inventory. Without a guard, two transactions can both see enough inventory and over-reserve. The CHECK constraint on \`available_count\` helps only if the UPDATE is atomic and the trigger lets the database enforce it.

\`\`\`ts
import { Client } from "pg";
import assert from "node:assert/strict";

async function reserve(client: Client, orderId: string, quantity: number) {
  await client.query(
    "INSERT INTO order_lines (order_id, sku, quantity, payment_state) VALUES ($1, $2, $3, $4)",
    [orderId, "SKU-RACE", quantity, "paid"],
  );
}

export async function testConcurrentTriggerReservation(url: string) {
  // Seed on its own committed connection. Seeding inside one of the racing
  // transactions hides the row from the other connection and the race never happens.
  const setup = new Client({ connectionString: url });
  await setup.connect();
  await setup.query("INSERT INTO inventory (sku, available_count) VALUES ($1, $2)", [
    "SKU-RACE",
    5,
  ]);
  await setup.end();

  const a = new Client({ connectionString: url });
  const b = new Client({ connectionString: url });
  await a.connect();
  await b.connect();

  try {
    await a.query("BEGIN");
    await b.query("BEGIN");

    // The loser blocks on the winner's row lock, then applies its decrement
    // against the committed value and trips the CHECK constraint.
    const outcomes = await Promise.all([
      reserve(a, "ORDER-A", 4)
        .then(() => a.query("COMMIT"))
        .then(() => null, (error: Error) => error),
      reserve(b, "ORDER-B", 4)
        .then(() => b.query("COMMIT"))
        .then(() => null, (error: Error) => error),
    ]);

    const failures = outcomes.filter((o): o is Error => o !== null);
    assert.equal(failures.length, 1);
    assert.match(failures[0].message, /available_count|check constraint/i);

    const check = new Client({ connectionString: url });
    await check.connect();
    const { rows } = await check.query(
      "SELECT available_count FROM inventory WHERE sku = $1",
      ["SKU-RACE"],
    );
    assert.equal(rows[0].available_count, 1);
    await check.end();
  } finally {
    await a.end();
    await b.end();
  }
}
\`\`\`

That example is intentionally small. In a real suite, isolate it with a fresh schema, deterministic seed data, and a short statement timeout. Concurrency tests can hang when a lock is wrong. A hung test tells you less than a failing assertion.

This test pins the losing side. Add its sibling where two smaller reservations (say 2 and 3 against a stock of 5) both succeed. The pair proves both sides of the boundary.

## Check Rollback, Error, And Savepoint Behavior

Trigger side effects should obey transaction boundaries unless the design explicitly says otherwise. Test the three common paths: full rollback, statement error, and savepoint rollback.

\`\`\`sql
BEGIN;

INSERT INTO inventory (sku, available_count)
VALUES ('SKU-ROLLBACK', 9);

INSERT INTO order_lines (order_id, sku, quantity, payment_state)
VALUES ('ORDER-ROLLBACK', 'SKU-ROLLBACK', 2, 'paid');

ROLLBACK;

SELECT count(*) AS inventory_events_after_rollback
FROM inventory_events
WHERE sku = 'SKU-ROLLBACK';
\`\`\`

For savepoints:

\`\`\`sql
BEGIN;

INSERT INTO inventory (sku, available_count)
VALUES ('SKU-SAVEPOINT', 9);

SAVEPOINT before_order;

INSERT INTO order_lines (order_id, sku, quantity, payment_state)
VALUES ('ORDER-SAVEPOINT', 'SKU-SAVEPOINT', 2, 'paid');

ROLLBACK TO SAVEPOINT before_order;

SELECT available_count
FROM inventory
WHERE sku = 'SKU-SAVEPOINT';

SELECT count(*) AS event_count
FROM inventory_events
WHERE sku = 'SKU-SAVEPOINT';

ROLLBACK;
\`\`\`

Expected result: inventory remains 9, and event_count is 0. If this fails, the trigger is writing outside the transaction or a later cleanup path is masking the problem.

## A Failure Story: The Trigger Worked, The Test Path Did Not

The symptom was simple: nightly inventory reconciliation showed negative stock for a handful of SKUs, but API checkout tests had been green for months. The first theory was a race in the reservation trigger. The team wrote a concurrency test, added lock logging, and tried to reproduce overselling with overlapping purchases. Nothing failed.

The actual cause was a bulk import job for marketplace orders. It loaded rows into a staging table, then copied them into the monthly order partition with triggers disabled for speed. The import job inserted the final order lines but skipped the reservation trigger and the inventory event trigger. The API was innocent.

The fix was not a bigger API test. The team changed the import job to write through a stored procedure that performed the same reservation operation as checkout. They added a metadata test that failed if required triggers were disabled outside the migration transaction, and a fixture that imported three marketplace orders end to end. Reconciliation stopped finding negative stock because every write path finally shared the same database behavior.

That is the lesson. Trigger testing is write-path testing. If you only test the happy API path, you have not tested the trigger contract.

## Fit Trigger Checks Into CI Without Making It Brittle

Keep trigger tests close to the database. Running them through the full UI adds noise and hides failure causes. A practical CI layout has three layers.

| Layer | Runtime target | Trigger coverage |
|---|---|---|
| Migration verification | Fresh database after migrations | Trigger exists, enabled, valid function body |
| Database behavior tests | Transactional SQL or thin DB client | Side effects, rollback, ordering, constraints |
| Application integration | API path that writes triggering rows | Confirms the app uses the expected write path |

Use a fresh database or isolated schema per run. Trigger tests mutate core tables, so shared environments produce false failures. If you need partition-specific coverage, generate partitions in the fixture and verify query plans separately. For related planner checks, see [partition pruning verification](/blog/database-testing-partition-pruning-verification), because partition routing and trigger placement often fail together after schema changes.

A minimal CI command can run a setup script, execute database tests, and always drop the schema.

\`\`\`bash
set -euo pipefail

schema="trigger_test_$RANDOM"
createdb "$schema"

psql "$schema" -f migrations/001_schema.sql
psql "$schema" -f tests/trigger_contract.sql

dropdb "$schema"
\`\`\`

In a larger suite, wrap cleanup with a trap so failed tests do not leave databases behind.

\`\`\`bash
set -euo pipefail

schema="trigger_test_$RANDOM"
cleanup() {
  dropdb "$schema" >/dev/null 2>&1 || true
}
trap cleanup EXIT

createdb "$schema"
psql "$schema" -f migrations/001_schema.sql
psql "$schema" -v ON_ERROR_STOP=1 -f tests/trigger_contract.sql
\`\`\`

## What Practitioners Usually Miss

People remember to test the trigger that inserts an audit row. They forget the UPDATE trigger that fires on a denormalized counter and the DELETE trigger that runs during cleanup. They also forget that row-level triggers may fire many times for one statement, while statement-level triggers may fire once even when zero rows change.

Zero-row statements are worth testing.

\`\`\`sql
BEGIN;

UPDATE order_lines
SET payment_state = 'paid'
WHERE order_id = 'ORDER-DOES-NOT-EXIST';

SELECT count(*) AS trace_count
FROM trigger_trace
WHERE trigger_name = 'order_lines_after_update';

ROLLBACK;
\`\`\`

If a statement-level trigger sends a notification when zero rows changed, it can wake workers for nothing. That may be acceptable. It should not be accidental.

Another missed point: trigger tests should use production-like roles. Running every SQL assertion as a database owner hides permission bugs and bypasses. Create a test role with the same privileges as the application runtime. Run the behavior tests as that role, then run metadata checks as a migration or admin role only where required.

## A Compact Trigger Test Checklist

Use this checklist when reviewing a trigger pull request.

| Check | Pass signal | Failure signal |
|---|---|---|
| Positive side effect | Expected dependent rows appear | Only base table changed |
| Negative condition | No side effect when predicate is false | Trigger fires for draft or ignored state |
| Transaction boundary | Rollback removes side effects | Event row remains after rollback |
| Multi-row statement | Every row gets correct effect | Only first or last row handled |
| Ordering contract | Sequence or causal key is asserted | Test relies on timestamp coincidence |
| Bypass path | Bulk/import/maintenance path covered | Only one API endpoint tested |
| Permissions | Runtime role cannot disable or skip trigger | Tests run only as owner |
| Metadata | Trigger exists and enabled after migrations | Trigger missing in fresh schema |

The highest value test is usually not the prettiest one. It is the test that writes through the most suspicious path and then reads the side effect table directly.

## Frequently Asked Questions

### Should database trigger testing run through the API or direct SQL?

Use both, but for different evidence. Direct SQL is best for trigger behavior: side effects, rollback, ordering, permissions, and disabled-trigger checks. API tests are best for proving the application uses the intended write path. If you test only through the API, a failure is harder to diagnose. If you test only through SQL, you can miss an application path that writes to a staging table, uses a bulk route, or calls a stored procedure with different assumptions.

### How do I test triggers without leaving dirty data?

Run each trigger test inside a transaction and roll it back when the database supports transactional DDL and DML for your setup. For CI, prefer a fresh database or schema per job, then drop it with a cleanup trap. Avoid shared QA databases for trigger tests because side effects are the point of the test. Shared state makes failures look random, especially when triggers write audit rows, counters, outbox events, or history tables.

### What is the most common false positive in trigger tests?

The most common false positive is asserting the row that caused the trigger but not the rows the trigger changed. For example, a test inserts an order line, reads the order line back, and passes even though inventory was never reserved. The second false positive is running as a database owner. Owner privileges can mask disabled triggers, missing grants, and write paths that the real application role cannot use.

### Should trigger tests assert exact ordering?

Assert exact ordering only when the product contract requires exact ordering and the schema provides a durable ordering key. Do not rely on incidental row order, timestamp ties, or the order of values in a multi-row statement unless your database engine explicitly guarantees the behavior you need. For most trigger side effects, assert every source row produced exactly one effect. For outbox consumers, add a sequence and test that sequence.
`,
};
