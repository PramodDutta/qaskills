import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Database Testing Cascade Delete Behavior Without Orphan Surprises',
  description: 'Prove database testing cascade delete behavior with fixtures, constraint assertions, and API-level checks so ON DELETE rules match product intent and compliance needs.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Database Testing Cascade Delete Behavior Without Orphan Surprises

Database testing for cascade delete behavior means proving what actually happens to dependent rows when a parent row is deleted: children removed (\`ON DELETE CASCADE\`), children blocked (\`RESTRICT\` / \`NO ACTION\`), children orphaned with nulls (\`SET NULL\`), or children pointed at a default (\`SET DEFAULT\`). You do not "unit test" cascade by reading a migration file once. You insert a realistic parent/child graph, delete through the same path production uses (SQL, ORM, or API), and assert the resulting row counts, foreign keys, and side effects.

Cascade is easy to misconfigure because multiple layers can disagree. The database constraint might cascade while the ORM still tries to delete children in memory. The API might soft-delete a parent while children remain hard-active. A second foreign key without cascade can abort a delete that the first key would have allowed. Compliance requirements (retain invoices, erase personal data) can forbid naive cascade even when it is convenient for developers.

This guide gives QA and test-automation engineers a concrete harness for cascade delete: schema inventory, fixture graphs, SQL and API assertions, multi-level chains, soft-delete interactions, and a realistic failure mode where tests pass against an ORM in-memory cascade while production relies on a different database rule. Pair isolation-aware setup from [database testing transaction isolation levels](/blog/database-testing-transaction-isolation-levels) with HTTP verification from the [SuperTest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) when deletes enter through REST.

## Inventory every delete rule before you write assertions

Start with the schema, not with the test file. Extract foreign keys and their delete actions from the database you actually run in CI.

PostgreSQL inventory example:

\`\`\`sql
SELECT
  tc.table_name AS child_table,
  kcu.column_name AS child_column,
  ccu.table_name AS parent_table,
  ccu.column_name AS parent_column,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
  AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY parent_table, child_table;
\`\`\`

Record results in a living table for the product domain (illustrative shop schema):

| Parent | Child | FK column | ON DELETE rule | Product intent |
|---|---|---|---|---|
| customers | orders | customer_id | RESTRICT | Keep order history; block customer erase until orders closed |
| orders | order_items | order_id | CASCADE | Items are owned by the order |
| orders | shipments | order_id | CASCADE | Shipments do not outlive the order row |
| products | order_items | product_id | RESTRICT | Do not destroy products referenced by history |
| customers | addresses | customer_id | CASCADE | Addresses are personal data owned by customer |
| organizations | projects | org_id | CASCADE | Tenant wipe removes projects |
| projects | project_members | project_id | CASCADE | Membership rows go with project |

If product intent and \`delete_rule\` disagree, the test suite should fail until migration or product docs change. Cascade testing is often a requirements test as much as a mechanical one.

## Model the graph you will delete

Cascade bugs hide in depth and breadth. A single parent with one child is necessary but not sufficient. Build fixtures that include:

1. **Depth:** grandparent -> parent -> child chains.
2. **Breadth:** one parent, many children across tables.
3. **Mixed rules:** one child cascades, another restricts.
4. **Optional FKs:** \`SET NULL\` columns that must null out rather than disappear.
5. **Self-references:** category trees, manager hierarchies.

SQL seed for a mixed-rule graph:

\`\`\`sql
BEGIN;

INSERT INTO customers (id, email) VALUES
  ('cust_1', 'ada@example.com');

INSERT INTO addresses (id, customer_id, line1) VALUES
  ('addr_1', 'cust_1', '1 Test Street');

INSERT INTO products (id, sku) VALUES
  ('prod_1', 'SKU-1');

INSERT INTO orders (id, customer_id, status) VALUES
  ('ord_1', 'cust_1', 'paid');

INSERT INTO order_items (id, order_id, product_id, qty) VALUES
  ('oi_1', 'ord_1', 'prod_1', 2);

INSERT INTO shipments (id, order_id, carrier) VALUES
  ('ship_1', 'ord_1', 'UPS');

COMMIT;
\`\`\`

Expected mechanical outcomes for this graph under the intent table above:

| Action | Expected result |
|---|---|
| \`DELETE FROM orders WHERE id = 'ord_1'\` | \`order_items\` and \`shipments\` for \`ord_1\` gone; \`products\` and \`customers\` remain |
| \`DELETE FROM customers WHERE id = 'cust_1'\` while \`ord_1\` exists | Error (RESTRICT on orders); customer and address remain |
| Close/remove orders first, then delete customer | Customer and addresses removed; products remain |

## Write database-level tests that assert row fate

Use a transaction per test when your isolation strategy allows rollback, or recreate schemas for heavy DDL. The isolation article covers trade-offs; here we focus on assertions.

Node + \`pg\` example (runnable shape; wire pool config to your CI database):

\`\`\`ts
// tests/db/cascade-orders.test.ts
import type { PoolClient } from 'pg';
import { pool } from '../support/db';

// BEGIN/ROLLBACK must run on one checked-out client. pool.query() may hand each
// statement a different connection, so the ROLLBACK would not undo the seed.
let client: PoolClient;

async function count(table: string, where: string, params: unknown[]): Promise<number> {
  const res = await client.query(
    \`SELECT COUNT(*)::int AS n FROM \${table} WHERE \${where}\`,
    params,
  );
  return res.rows[0].n as number;
}

describe('order delete cascade', () => {
  beforeEach(async () => {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(\`
      INSERT INTO customers (id, email) VALUES ('cust_1', 'ada@example.com');
      INSERT INTO products (id, sku) VALUES ('prod_1', 'SKU-1');
      INSERT INTO orders (id, customer_id, status) VALUES ('ord_1', 'cust_1', 'paid');
      INSERT INTO order_items (id, order_id, product_id, qty)
        VALUES ('oi_1', 'ord_1', 'prod_1', 2);
      INSERT INTO shipments (id, order_id, carrier)
        VALUES ('ship_1', 'ord_1', 'UPS');
    \`);
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
    client.release();
  });

  it('cascades items and shipments when an order is deleted', async () => {
    await client.query(\`DELETE FROM orders WHERE id = $1\`, ['ord_1']);

    expect(await count('orders', 'id = $1', ['ord_1'])).toBe(0);
    expect(await count('order_items', 'order_id = $1', ['ord_1'])).toBe(0);
    expect(await count('shipments', 'order_id = $1', ['ord_1'])).toBe(0);
    expect(await count('products', 'id = $1', ['prod_1'])).toBe(1);
    expect(await count('customers', 'id = $1', ['cust_1'])).toBe(1);
  });
});
\`\`\`


Assert RESTRICT with an expected error:

\`\`\`ts
it('blocks customer delete while paid orders exist', async () => {
  await expect(
    pool.query(\`DELETE FROM customers WHERE id = $1\`, ['cust_1']),
  ).rejects.toMatchObject({
    code: '23503', // PostgreSQL foreign_key_violation
  });

  expect(await count('customers', 'id = $1', ['cust_1'])).toBe(1);
  expect(await count('orders', 'id = $1', ['ord_1'])).toBe(1);
});
\`\`\`

Do not hardcode SQLSTATE codes for databases you do not run. MySQL and SQL Server surface constraint failures differently. Prefer asserting that the delete rejects and that row counts are unchanged if you need portability, and add engine-specific code checks only in engine-specific suites.

## Test multi-level cascade chains

Grandparent deletes can remove entire subtrees. Verify both success paths and stop conditions.

Schema sketch:

\`\`\`sql
CREATE TABLE organizations (
  id TEXT PRIMARY KEY
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL
);

CREATE TABLE project_invoices (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  total_cents INT NOT NULL
);
\`\`\`

| Delete target | With only members | With invoices present |
|---|---|---|
| \`projects\` row | Members cascade away | Delete fails; members remain |
| \`organizations\` row | Projects and members cascade | Fails if any project still has invoices |

Test both columns of the table. Teams often test happy cascade and forget the RESTRICT leaf that should protect financial records.

\`\`\`ts
it('refuses org delete when a project invoice exists', async () => {
  await pool.query(\`
    INSERT INTO organizations (id) VALUES ('org_1');
    INSERT INTO projects (id, org_id) VALUES ('proj_1', 'org_1');
    INSERT INTO project_members (id, project_id, user_id)
      VALUES ('pm_1', 'proj_1', 'user_1');
    INSERT INTO project_invoices (id, project_id, total_cents)
      VALUES ('inv_1', 'proj_1', 5000);
  \`);

  await expect(
    pool.query(\`DELETE FROM organizations WHERE id = $1\`, ['org_1']),
  ).rejects.toBeTruthy();

  expect(await count('organizations', 'id = $1', ['org_1'])).toBe(1);
  expect(await count('project_members', 'id = $1', ['pm_1'])).toBe(1);
  expect(await count('project_invoices', 'id = $1', ['inv_1'])).toBe(1);
});
\`\`\`

## Distinguish ORM cascade from database cascade

This is the failure mode that burns staging.

**Symptom:** Application tests pass. Production delete either leaves orphans or throws a constraint error the ORM suite never saw.

**Root cause patterns:**

1. ORM configured with relationship cascade (\`cascade: ['remove']\` style in various ORMs) while the database FK is \`NO ACTION\`.
2. Database FK is \`CASCADE\` but tests always load children and delete through the ORM unit of work, masking missing DB cascade when a raw SQL admin script deletes parents.
3. Soft-delete plugin filters children so counts look like cascade when rows still exist.

**Diagnosis:**

1. Print the live FK delete rules from \`information_schema\` in CI once per schema migration job.
2. Run one test that deletes using raw SQL only, without hydrating children.
3. Run one test that deletes through the public API only.
4. Compare leftover rows with \`SELECT\` including soft-deleted rows if you use \`deleted_at\`.

Raw SQL parent delete without ORM:

\`\`\`ts
it('database cascade removes members without ORM hydration', async () => {
  await pool.query(\`
    INSERT INTO organizations (id) VALUES ('org_2');
    INSERT INTO projects (id, org_id) VALUES ('proj_2', 'org_2');
    INSERT INTO project_members (id, project_id, user_id)
      VALUES ('pm_2', 'proj_2', 'user_2');
  \`);

  await pool.query(\`DELETE FROM organizations WHERE id = $1\`, ['org_2']);

  expect(await count('projects', 'id = $1', ['proj_2'])).toBe(0);
  expect(await count('project_members', 'id = $1', ['pm_2'])).toBe(0);
});
\`\`\`

If this fails while ORM delete tests pass, your safety net is incomplete for admin scripts, data repairs, and other services sharing the database.

## API-level cascade tests with SuperTest

Product users rarely run SQL. If delete is exposed as \`DELETE /customers/:id\`, assert observable API behavior and leftover state.

\`\`\`ts
// tests/api/customer-delete.cascade.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { pool } from '../support/db';

describe('DELETE /customers/:id cascade policy', () => {
  it('returns 409 when open orders block erase', async () => {
    await pool.query(\`
      INSERT INTO customers (id, email) VALUES ('cust_9', 'x@example.com');
      INSERT INTO orders (id, customer_id, status) VALUES ('ord_9', 'cust_9', 'paid');
    \`);

    const res = await request(app).delete('/customers/cust_9').expect(409);

    expect(res.body).toMatchObject({
      error: expect.stringMatching(/orders|constraint|conflict/i),
    });

    const customers = await pool.query(
      \`SELECT id FROM customers WHERE id = $1\`,
      ['cust_9'],
    );
    expect(customers.rowCount).toBe(1);
  });

  it('erases customer and addresses when no blocking orders exist', async () => {
    await pool.query(\`
      INSERT INTO customers (id, email) VALUES ('cust_10', 'y@example.com');
      INSERT INTO addresses (id, customer_id, line1)
        VALUES ('addr_10', 'cust_10', '9 Cascade Road');
    \`);

    await request(app).delete('/customers/cust_10').expect(204);

    const customers = await pool.query(
      \`SELECT id FROM customers WHERE id = $1\`,
      ['cust_10'],
    );
    const addresses = await pool.query(
      \`SELECT id FROM addresses WHERE customer_id = $1\`,
      ['cust_10'],
    );
    expect(customers.rowCount).toBe(0);
    expect(addresses.rowCount).toBe(0);
  });
});
\`\`\`

API tests catch authorization gaps too: a cascade that works in SQL might be forbidden for non-admin roles. Include a 403 case when policy demands it.

## Soft delete versus hard cascade

Many systems set \`deleted_at\` on parents and leave children untouched, or cascade soft deletes in application code. Database \`ON DELETE CASCADE\` does not run on an \`UPDATE\`.

| Mechanism | Parent operation | Child effect | How to test |
|---|---|---|---|
| Hard FK cascade | \`DELETE\` parent | Children removed by DB | Row absences after SQL delete |
| ORM hard remove cascade | ORM delete parent | Children deleted if configured | SQL counts after API/ORM delete |
| Soft delete parent only | \`UPDATE\` parent | Children still active unless app cascades | Children still selectable; parent filtered |
| Tombstone table | Move parent to archive | Children may block or move | Archive counts + live counts |

Soft-delete test sketch:

\`\`\`ts
it('soft-deleting a project hides it but keeps members until hard purge', async () => {
  await request(app).delete('/projects/proj_3').expect(204);

  const live = await pool.query(
    \`SELECT id FROM projects WHERE id = $1 AND deleted_at IS NULL\`,
    ['proj_3'],
  );
  const all = await pool.query(\`SELECT id, deleted_at FROM projects WHERE id = $1\`, [
    'proj_3',
  ]);
  const members = await pool.query(
    \`SELECT id FROM project_members WHERE project_id = $1\`,
    ['proj_3'],
  );

  expect(live.rowCount).toBe(0);
  expect(all.rows[0].deleted_at).not.toBeNull();
  expect(members.rowCount).toBeGreaterThan(0);
});
\`\`\`

Document whether a later hard purge job performs true deletes (and thus DB cascade) or manually cleans children. Schedule tests for the purge job separately.

## SET NULL and SET DEFAULT paths

Not every dependent should disappear. Optional ownership fields often use \`ON DELETE SET NULL\`.

\`\`\`sql
ALTER TABLE notes
  ADD CONSTRAINT notes_author_fk
  FOREIGN KEY (author_id) REFERENCES users(id)
  ON DELETE SET NULL;
\`\`\`

\`\`\`ts
it('nulls note authors when a user is hard-deleted', async () => {
  await pool.query(\`
    INSERT INTO users (id, email) VALUES ('user_5', 'n@example.com');
    INSERT INTO notes (id, author_id, body) VALUES ('note_5', 'user_5', 'hello');
  \`);

  await pool.query(\`DELETE FROM users WHERE id = $1\`, ['user_5']);

  const res = await pool.query(\`SELECT author_id FROM notes WHERE id = $1\`, ['note_5']);
  expect(res.rows[0].author_id).toBeNull();
});
\`\`\`

What people get wrong: asserting that the note row was deleted because "user data should vanish," while the schema intentionally preserves content with a null author for audit reasons. Align tests with legal and product policy, not with a generic privacy slogan.

## Trigger-augmented deletes

Databases sometimes use \`BEFORE DELETE\` / \`AFTER DELETE\` triggers for audit logs or denormalized counters. Cascade still runs according to FK rules, but side tables change.

| Side effect | Assertion idea |
|---|---|
| Audit row written | \`SELECT COUNT(*) FROM audit_log WHERE entity_id = ...\` |
| Counter decremented | Parent org \`project_count\` reduced |
| External outbox event | Outbox table contains \`ProjectDeleted\` |

Test at least one trigger side effect when triggers are part of the delete contract. Do not assume cascade alone is the whole story.

## Concurrent deletes and isolation

Two transactions deleting related subtrees can deadlock or see partial states depending on isolation level. Cascade amplifies lock scope because children are touched too.

Practical QA checks:

1. Under \`READ COMMITTED\` (common default), a concurrent insert of a child during parent delete may race; assert your app retries or fails cleanly.
2. Keep cascade tests single-threaded unless you are explicitly writing concurrency tests.
3. When using rolled-back transactions around tests, remember concurrent sessions do not see uncommitted seeds.

See the isolation levels guide for setup patterns. For cascade specifically, prefer dedicated concurrency tests over sprinkling parallel deletes through functional suites.

## Migration tests for rule changes

When a PR changes \`ON DELETE RESTRICT\` to \`CASCADE\` (or the reverse), add an explicit migration behavior test:

\`\`\`ts
it('migration 182 makes order_items cascade with orders', async () => {
  // Assume migrations already applied in test DB bootstrap.
  // Pin the assertion to one specific FK (order_items.order_id -> orders.id).
  // Filtering only by child table would let any other CASCADE FK satisfy it.
  const rules = await pool.query(\`
    SELECT rc.delete_rule
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = rc.constraint_name
     AND kcu.constraint_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = rc.constraint_name
     AND ccu.constraint_schema = rc.constraint_schema
    WHERE kcu.table_name = 'order_items'
      AND kcu.column_name = 'order_id'
      AND ccu.table_name = 'orders'
      AND ccu.column_name = 'id'
  \`);

  expect(rules.rows).toHaveLength(1);
  expect(rules.rows[0].delete_rule).toBe('CASCADE');
});
\`\`\`

Also keep a data path test: old rule behavior should fail CI after migration if product now expects cascade. Schema assertion alone can pass while a second FK still blocks deletes.

## Compliance-oriented scenarios

Cascade intersects GDPR-style erase requests and financial retention:

| Data class | Typical delete policy | Test emphasis |
|---|---|---|
| PII addresses | Cascade or erase with user | Addresses gone after erase |
| Orders / invoices | Restrict or anonymize | Cannot hard-delete customer with legal retention rows; PII fields scrubbed |
| Marketing prefs | Cascade with profile | No orphaned prefs rows |
| Audit logs | Restrict or separate store | Logs remain with pseudonymous ids |

Anonymize-instead-of-delete test sketch:

\`\`\`ts
it('anonymizes customer PII but retains order totals for retention', async () => {
  await request(app).post('/customers/cust_1/erase').expect(202);

  const customer = await pool.query(\`SELECT email, name FROM customers WHERE id = $1\`, [
    'cust_1',
  ]);
  const orders = await pool.query(\`SELECT total_cents FROM orders WHERE customer_id = $1\`, [
    'cust_1',
  ]);

  expect(customer.rows[0].email).toMatch(/erased|redacted|orphan/i);
  expect(orders.rowCount).toBeGreaterThan(0);
});
\`\`\`

Here cascade may be the wrong tool; tests document the real policy.

## What people get wrong: trusting the migration screenshot

Engineers open a GUI diagram, see a cascade line, and skip tests. Diagrams drift. ORMs generate different DDL on different engines. A SQLite dev DB may not enforce FKs unless \`PRAGMA foreign_keys = ON\`. CI must enable enforcement and read rules from the live engine.

SQLite reminder for local tests:

\`\`\`ts
await pool.query('PRAGMA foreign_keys = ON');
\`\`\`

Without that, cascade and restrict tests both lie.

## Harness layout for AI agents

Give agents a fixed pattern so they stop inventing one-off deletes:

\`\`\`ts
// tests/support/cascadeHarness.ts
import type { Pool } from 'pg';

export async function seedOrderGraph(pool: Pool, ids: {
  customerId: string;
  orderId: string;
  productId: string;
}): Promise<void> {
  const { customerId, orderId, productId } = ids;
  await pool.query(
    \`INSERT INTO customers (id, email) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING\`,
    [customerId, \`\${customerId}@example.com\`],
  );
  await pool.query(
    \`INSERT INTO products (id, sku) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING\`,
    [productId, \`SKU-\${productId}\`],
  );
  await pool.query(
    \`INSERT INTO orders (id, customer_id, status) VALUES ($1, $2, 'paid')\`,
    [orderId, customerId],
  );
  await pool.query(
    \`INSERT INTO order_items (id, order_id, product_id, qty)
     VALUES ($1, $2, $3, 1)\`,
    [\`oi_\${orderId}\`, orderId, productId],
  );
}

export async function expectGone(
  pool: Pool,
  table: string,
  id: string,
): Promise<void> {
  const res = await pool.query(\`SELECT 1 FROM \${table} WHERE id = $1\`, [id]);
  if (res.rowCount !== 0) {
    throw new Error(\`expected \${table}.\${id} to be absent\`);
  }
}
\`\`\`

Agents should call harness functions rather than scattering half-complete inserts. Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want this style of database testing skill shared across repos.

## CI packaging

Run cascade suites against the same engine family as production. Container example fragment:

\`\`\`yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_PASSWORD: test
      POSTGRES_USER: test
      POSTGRES_DB: app_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U test -d app_test"
      --health-interval 5s
      --health-timeout 5s
      --health-retries 10

steps:
  - run: npm run db:migrate:test
  - run: npm run test:db:cascade
    env:
      DATABASE_URL: postgres://test:test@localhost:5432/app_test
\`\`\`

Fail the migration job if FK inventory drifts from a committed snapshot when you want schema review gates:

\`\`\`bash
psql "$DATABASE_URL" -f scripts/fk-inventory.sql -o /tmp/fk.txt
diff -u db/fk-inventory.golden.txt /tmp/fk.txt
\`\`\`

Golden files create noise on intentional migrations; update them in the same PR that changes rules.

## End-to-end story: fixing a false CASCADE

1. Inventory shows \`order_items\` is \`ON DELETE RESTRICT\` while docs say cascade.
2. SQL test deleting orders fails on items.
3. Product confirms items should go with draft orders only; paid orders should restrict.
4. You split FKs or encode status checks in the app before delete.
5. Tests cover draft cascade path and paid restrict path separately.
6. API returns 204 for draft delete and 409 for paid delete.
7. ORM remove cascades are disabled for orders so SQL and API agree.

That story is more valuable than a generic "always cascade children" rule.

## Frequently Asked Questions

### How do I test ON DELETE CASCADE without deleting production-like reference data?

Use disposable primary keys in a dedicated test database or transaction-rolled-back fixtures. Seed only the graph required for the assertion, delete that parent, and assert children counts. Never point cascade experiments at shared staging tenants without a reset strategy. When reference data must exist, clone it into per-test schemas or use containerized databases created for the job. Prefer raw SQL seeds over UI setup so the graph is exact and fast.

### Why do ORM delete tests pass while raw SQL deletes fail?

Because ORM relationship cascades can delete children in application code before issuing parent deletes, while raw SQL relies only on database foreign key actions. Production admin scripts, other languages, or bulk SQL jobs will hit the database rules. Always include at least one raw SQL parent delete that does not hydrate children, and inventory live \`delete_rule\` values in CI so ORM config and DDL cannot silently diverge.

### Should cascade behavior be tested in unit tests or integration tests?

Prefer integration tests against a real engine with foreign keys enforced. Pure unit tests with mocked repositories only prove that your service called \`deleteChildren\`; they do not prove the database will protect or remove rows under concurrent access or non-ORM paths. Lightweight unit tests can still guard service-level policy decisions (refuse erase when invoices exist) when the repository is faked, but they complement rather than replace engine-level cascade tests.

### How does soft delete interact with foreign key cascade rules?

Soft delete is usually an \`UPDATE\`, so \`ON DELETE CASCADE\` does not run. Children remain unless application code soft-deletes them too or a later hard-purge job issues real \`DELETE\` statements. Tests must query with and without soft-delete filters, assert whether children stay visible, and cover the purge job if hard deletes eventually cascade. Mixing soft delete on parents with hard FK cascade expectations is a common source of false confidence.
`,
};
