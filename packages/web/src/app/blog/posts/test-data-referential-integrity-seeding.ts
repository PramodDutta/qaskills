import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Data Referential Integrity Seeding Without Orphan Rows or Flaky Fixtures',
  description: 'Master test data referential integrity seeding with dependency-ordered graphs, safe factories, and pre-flight FK checks that keep integration suites stable.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Test Data Referential Integrity Seeding Without Orphan Rows or Flaky Fixtures

Test data referential integrity seeding is the discipline of building database fixtures so every foreign key, unique constraint, and mandatory relationship resolves before any test assertion runs. Instead of inserting rows in an order that "usually works," you model seed data as a dependency graph, create parents before children, clean up in reverse order when needed, and validate the graph with the same constraints the application enforces in production.

Broken seed integrity produces failures that look like product bugs: 404s on nested resources, null dereference in API serializers, or intermittent unique constraint violations when two tests race to create the same hard-coded email. Teams then sprinkle \`sleep\` calls, disable constraints in test, or truncate entire databases between cases without understanding relationship order. Those shortcuts raise suite time and hide real defects.

This guide shows how to design seed graphs, implement factories that preserve integrity without frozen IDs, handle multi-tenant and soft-delete edge cases, diagnose partial seeds, and verify integrity before the first HTTP call. For wiring seeded data into HTTP-level checks, use patterns from the [Supertest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide). For choosing unit versus integration runners around those checks, see the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026).

## Why referential integrity breaks seed scripts first

Application code usually creates data through domain services that open transactions, generate IDs, and touch all required tables. Seed scripts often bypass those services and insert into tables directly for speed. That is fine when the script respects constraints. It fails when authors:

- Insert child rows before parents exist
- Reuse hard-coded primary keys across tests that run in parallel
- Forget join tables in many-to-many relationships
- Seed soft-deleted parents that active child queries still reference
- Disable foreign keys to "make the fixture load" and never re-enable them
- Mix production dump fragments with synthetic rows that collide on natural keys

Foreign keys are not optional decoration. They are executable documentation of the domain. Your seed pipeline should treat constraint violations as design feedback, not as noise to silence.

| Symptom in tests | Likely seed integrity issue | First diagnostic |
|---|---|---|
| Intermittent unique violation on email | Hard-coded natural key shared across workers | Search fixtures for fixed emails |
| 500 on /orders/:id with missing customer | Order seeded without customer or wrong tenant | Query orphan orders |
| Empty list where setup created rows | Seed committed in another DB or rolled back transaction | Log connection strings and txn boundaries |
| FK violation mid suite after truncate | Truncate order ignored dependencies | Review truncate cascade strategy |
| Works locally, fails in CI | Different constraint set or migration lag | Diff schema from migrate status |

## Model seed graphs as dependency DAGs

Draw tables as nodes and foreign keys as directed edges from child to parent. A valid seed order is a topological order of that graph. Cycles (rare, mutual FKs) need deferred constraints or two-phase inserts with nullables filled later.

Example commerce domain:

- \`organizations\` roots the graph
- \`users\` reference organizations
- \`customers\` reference organizations
- \`products\` reference organizations
- \`orders\` reference customers (and organizations if denormalized)
- \`order_items\` reference orders and products
- \`invoices\` reference orders
- \`payments\` reference invoices

\`\`\`ts
export type SeedNode = {
  name: string;
  dependsOn: string[];
};

export function topoSeedOrder(nodes: SeedNode[]): string[] {
  const byName = new Map(nodes.map((n) => [n.name, n]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const order: string[] = [];

  function visit(name: string) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(\`cycle detected at \${name}\`);
    }
    visiting.add(name);
    const node = byName.get(name);
    if (!node) throw new Error(\`unknown node \${name}\`);
    for (const dep of node.dependsOn) visit(dep);
    visiting.delete(name);
    visited.add(name);
    order.push(name);
  }

  for (const n of nodes) visit(n.name);
  return order;
}

export const commerceSeedGraph: SeedNode[] = [
  { name: 'organizations', dependsOn: [] },
  { name: 'users', dependsOn: ['organizations'] },
  { name: 'customers', dependsOn: ['organizations'] },
  { name: 'products', dependsOn: ['organizations'] },
  { name: 'orders', dependsOn: ['customers', 'organizations'] },
  { name: 'order_items', dependsOn: ['orders', 'products'] },
  { name: 'invoices', dependsOn: ['orders'] },
  { name: 'payments', dependsOn: ['invoices'] },
];
\`\`\`

Generate the graph from the database catalog when possible so migrations that add FKs update seed order automatically:

\`\`\`sql
SELECT
  tc.table_name AS child_table,
  ccu.table_name AS parent_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';
\`\`\`

Hand-maintained graphs drift. Catalog-driven graphs fail when you introduce a new FK without updating factories, which is what you want in CI.

## Foreign key order, deferred constraints, and cascade strategies

Three database features interact with seeding:

1. **Immediate foreign keys** validate on each statement. Parents must exist first.
2. **Deferred foreign keys** (supported in Postgres when constraints are declared deferrable) validate at commit. You can insert in flexible order inside a transaction, then fix references before commit.
3. **ON DELETE CASCADE / SET NULL** affect cleanup and accidental wipes.

For tests, prefer ordinary immediate FKs and correct insert order. Deferred constraints are powerful for circular references such as \`employees.manager_id -> employees.id\`, but they can hide incomplete seeds until commit time, which complicates debugging if you insert outside an explicit transaction.

Cleanup strategies:

| Strategy | Pros | Cons | When to use |
|---|---|---|---|
| Transaction rollback per test | Fast, isolated | Requires single connection and no deliberate commits | Unit-ish DB tests |
| Truncate tables in reverse topo order | Simple mental model | Easy to miss a table; identity restart differs by engine | Small schemas |
| \`TRUNCATE ... CASCADE\` from roots | Short scripts | Can wipe more than intended | Disposable databases |
| Delete by test run id column | Precise | Requires every table to carry run id | Parallel large suites |
| Ephemeral database or schema per worker | Strong isolation | Higher provision cost | CI with dockerized DB |

\`\`\`ts
export async function truncateInReverseOrder(
  query: (sql: string) => Promise<unknown>,
  tablesInSeedOrder: string[],
): Promise<void> {
  const reverse = [...tablesInSeedOrder].reverse();
  // Engine-specific: Postgres supports RESTART IDENTITY CASCADE
  for (const table of reverse) {
    await query(\`TRUNCATE TABLE \${table} RESTART IDENTITY CASCADE\`);
    // If CASCADE already wiped dependents, subsequent truncates are still safe.
  }
}
\`\`\`

Be careful with SQL identifier interpolation. Prefer allowlists of known table names over raw user input when building truncate helpers.

## Factories that preserve integrity without hard-coded IDs

Hard-coded IDs (\`customer_id: 1\`) couple tests together and break under parallel execution. Factories should create parent graphs on demand, return the created entities, and accept overrides for the fields a test cares about.

\`\`\`ts
import { randomUUID } from 'node:crypto';

export type Db = {
  insert: <T extends Record<string, unknown>>(
    table: string,
    row: T,
  ) => Promise<T & { id: string }>;
  findById: <T>(table: string, id: string) => Promise<T | null>;
};

export type Org = { id: string; slug: string; name: string };
export type Customer = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
};
export type Order = {
  id: string;
  organizationId: string;
  customerId: string;
  status: string;
};

let seq = 0;
function nonce(prefix: string) {
  seq += 1;
  return \`\${prefix}-\${seq}-\${randomUUID().slice(0, 8)}\`;
}

export async function seedOrganization(
  db: Db,
  overrides: Partial<Org> = {},
): Promise<Org> {
  return db.insert('organizations', {
    id: overrides.id ?? randomUUID(),
    slug: overrides.slug ?? nonce('org'),
    name: overrides.name ?? 'Acme Test Org',
  });
}

export async function seedCustomer(
  db: Db,
  overrides: Partial<Customer> & { organizationId?: string } = {},
): Promise<{ org: Org; customer: Customer }> {
  const org = overrides.organizationId
    ? ((await db.findById('organizations', overrides.organizationId)) as Org)
    : await seedOrganization(db);

  if (!org) throw new Error('organization not found for customer seed');

  const customer = await db.insert('customers', {
    id: overrides.id ?? randomUUID(),
    organizationId: org.id,
    email: overrides.email ?? \`user-\${nonce('mail')}@example.test\`,
    name: overrides.name ?? 'Pat Customer',
  });

  return { org, customer };
}

export async function seedOrderWithItem(
  db: Db,
  overrides: {
    organizationId?: string;
    customerId?: string;
    productId?: string;
    status?: string;
  } = {},
) {
  const { org, customer } = overrides.customerId
    ? {
        org: overrides.organizationId
          ? ((await db.findById('organizations', overrides.organizationId)) as Org)
          : await seedOrganization(db),
        customer: (await db.findById('customers', overrides.customerId)) as Customer,
      }
    : await seedCustomer(db, { organizationId: overrides.organizationId });

  if (!customer) throw new Error('customer missing');

  const product =
    overrides.productId != null
      ? await db.findById('products', overrides.productId)
      : await db.insert('products', {
          id: randomUUID(),
          organizationId: org.id,
          sku: nonce('sku'),
          name: 'Test Product',
          priceCents: 1200,
        });

  if (!product) throw new Error('product missing');

  const order = await db.insert('orders', {
    id: randomUUID(),
    organizationId: org.id,
    customerId: customer.id,
    status: overrides.status ?? 'open',
  });

  const item = await db.insert('order_items', {
    id: randomUUID(),
    orderId: order.id,
    productId: (product as { id: string }).id,
    quantity: 1,
    unitPriceCents: 1200,
  });

  return { org, customer, product, order, item };
}
\`\`\`

Design rules for factories:

- Creating a child may create parents, never the reverse silently.
- Natural keys use nonces or UUIDs.
- Overrides allow attaching to an existing tenant for multi-entity scenarios.
- Factories return the full subgraph the test might need for assertions and cleanup.
- Avoid global mutable "default org" singletons in parallel suites.

## Scenario builders compose factories into readable stories

Tests read better when they name scenarios rather than listing ten inserts.

\`\`\`ts
export async function scenarioPaidInvoice(db: Db) {
  const graph = await seedOrderWithItem(db, { status: 'closed' });
  const invoice = await db.insert('invoices', {
    id: randomUUID(),
    orderId: graph.order.id,
    totalCents: 1200,
    status: 'open',
  });
  const payment = await db.insert('payments', {
    id: randomUUID(),
    invoiceId: invoice.id,
    amountCents: 1200,
    status: 'captured',
  });
  const paidInvoice = await db.update('invoices', invoice.id, { status: 'paid' });

  return { ...graph, invoice: paidInvoice, payment };
}
\`\`\`

Scenarios call factories, factories enforce integrity, and tests call scenarios by name. Prefer a real \`update\` helper for status transitions so the graph stays consistent with domain rules.

## Multi-tenant and soft-delete edge cases

Multi-tenant systems often denormalize \`organization_id\` onto child tables for isolation. Integrity then means both FK correctness and tenant consistency: an order's customer must belong to the same organization as the order.

\`\`\`ts
export async function assertTenantAlignment(
  query: <T>(sql: string, params?: unknown[]) => Promise<T[]>,
): Promise<void> {
  const rows = await query<{ order_id: string }>(
    \`
    SELECT o.id AS order_id
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    WHERE o.organization_id <> c.organization_id
    \`,
  );
  if (rows.length > 0) {
    throw new Error(
      \`tenant mismatch on orders: \${rows.map((r) => r.order_id).join(', ')}\`,
    );
  }
}
\`\`\`

Soft deletes complicate seeds. If \`customers.deleted_at\` is set but orders still reference the customer, API flows that filter active customers may look empty while FK checks still pass. Decide product rules explicitly:

- Can orders reference soft-deleted customers?
- Do unique indexes on email include only active rows (partial unique indexes)?
- Should seeds create realistic soft-deleted rows in separate scenarios only?

Partial unique indexes deserve special seed attention. A second active user with the same email must fail, while a soft-deleted user with that email may be allowed. Factories that always use fresh emails avoid accidental collisions; dedicated tests should create the conflict intentionally.

## Failure mode: partial seeds that leave orphan rows

A realistic failure mode begins with a seed function that catches errors per table and continues. The organization inserts, the customer fails on a check constraint, and the function returns a half-built object. Later tests see orphan organizations piling up, or worse, the function retries and creates duplicate shells.

Diagnosis:

1. Wrap each scenario in a transaction and commit only on full success.
2. Log the seed graph IDs at completion, not midway.
3. Run integrity predicates after seed and before tests.
4. Fail closed if any FK orphan query returns rows.

\`\`\`ts
export async function withSeedTransaction<T>(
  db: {
    query: (sql: string) => Promise<unknown>;
  },
  fn: () => Promise<T>,
): Promise<T> {
  await db.query('BEGIN');
  try {
    const value = await fn();
    await db.query('COMMIT');
    return value;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
\`\`\`

\`\`\`sql
-- orphan order_items: item without order
SELECT oi.id
FROM order_items oi
LEFT JOIN orders o ON o.id = oi.order_id
WHERE o.id IS NULL;

-- orphan orders: order without customer
SELECT o.id
FROM orders o
LEFT JOIN customers c ON c.id = o.customer_id
WHERE c.id IS NULL;
\`\`\`

If your database already enforces FKs, orphans should be impossible unless constraints were disabled or data was loaded with session_replication_role tricks. Detect those configuration mistakes in CI:

\`\`\`ts
export async function assertForeignKeysEnabled(
  query: <T>(sql: string) => Promise<T[]>,
): Promise<void> {
  // Postgres: ensure FKs exist on critical tables (presence check)
  const fks = await query<{ count: string }>(
    \`
    SELECT COUNT(*)::text AS count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
      AND table_name IN ('orders', 'order_items', 'payments')
    \`,
  );
  if (Number(fks[0]?.count ?? 0) < 3) {
    throw new Error('expected foreign keys on core commerce tables');
  }
}
\`\`\`

## What people get wrong with truncate-and-reload approaches

Truncating all tables before every test is popular and often correct for small schemas. People get it wrong when they:

1. Truncate only "main" tables and leave join tables populated.
2. Truncate in random order without CASCADE and ignore errors.
3. Rely on CASCADE from a child table, which does not wipe parents, then assume a clean world.
4. Reset sequences inconsistently so hard-coded IDs appear to work until parallel workers collide.
5. Truncate shared databases across concurrent jobs.

Prefer one of these coherent models:

- **Per-test transaction rollback** for repositories.
- **Per-file ephemeral schema** for integration suites.
- **Per-worker database** named with worker index for parallel e2e.

\`\`\`bash
# example: worker-local database names in CI
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/app_test_w\${JEST_WORKER_ID:-1}"
npm run db:migrate
npm run test:integration
\`\`\`

When using worker databases, migrate once per worker in a global setup hook, then truncate or reseed cheaply between tests.

## Validating seed integrity before the first test assertion

Add a preflight that scenarios can call, and that CI runs after global seed:

\`\`\`ts
export type IntegrityCheck = {
  name: string;
  sql: string;
};

export const integrityChecks: IntegrityCheck[] = [
  {
    name: 'orders reference existing customers',
    sql: \`
      SELECT COUNT(*)::int AS n
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      WHERE c.id IS NULL
    \`,
  },
  {
    name: 'order_items reference products',
    sql: \`
      SELECT COUNT(*)::int AS n
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE p.id IS NULL
    \`,
  },
  {
    name: 'payments reference invoices',
    sql: \`
      SELECT COUNT(*)::int AS n
      FROM payments p
      LEFT JOIN invoices i ON i.id = p.invoice_id
      WHERE i.id IS NULL
    \`,
  },
  {
    name: 'tenant alignment orders/customers',
    sql: \`
      SELECT COUNT(*)::int AS n
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.organization_id <> c.organization_id
    \`,
  },
];

export async function runIntegrityPreflight(
  query: (sql: string) => Promise<{ n: number }[]>,
): Promise<void> {
  const failures: string[] = [];
  for (const check of integrityChecks) {
    const rows = await query(check.sql);
    const n = rows[0]?.n ?? 0;
    if (n !== 0) failures.push(\`\${check.name}: \${n} bad rows\`);
  }
  if (failures.length) {
    throw new Error(\`seed integrity preflight failed:\\n\${failures.join('\\n')}\`);
  }
}
\`\`\`

Call preflight after global fixtures and after complex scenarios in higher-risk suites. The cost of a few COUNT queries is tiny compared with debugging orphan-induced flakes.

## Seeding through APIs versus direct SQL

Direct SQL is fast and precise for bulk volume. API seeding exercises validation and authorization but is slower and may hide DB-level relationships behind aggregates.

| Approach | Strength | Weakness | Best use |
|---|---|---|---|
| Direct SQL / factories | Speed, exact graph control | Can bypass app invariants | Deep integration and plan tests |
| Domain services | Respects business rules | Heavier setup, side effects | Tests of workflows and policies |
| Public HTTP APIs | True end-to-end | Slowest, auth complexity | Smoke and contract journeys |
| Hybrid | SQL for foundation, API for act | Requires discipline | Most product suites |

Hybrid pattern: factories build org, user, and auth session with SQL; the test acts through HTTP; assertions read via API and occasionally SQL for side effects that APIs do not expose.

\`\`\`ts
import request from 'supertest';
import { app } from '../src/app';
import { seedCustomer, type Db } from '../test/factories';

describe('POST /orders', () => {
  it('creates an order for an existing customer', async () => {
    const db = globalThis.testDb as Db;
    const { org, customer } = await seedCustomer(db);
    const token = await globalThis.issueToken({ orgId: org.id, role: 'agent' });

    const res = await request(app)
      .post('/orders')
      .set('Authorization', \`Bearer \${token}\`)
      .send({ customerId: customer.id, items: [] })
      .expect(201);

    expect(res.body.customerId).toBe(customer.id);
  });
});
\`\`\`

## Parallelism without unique key collisions

Parallel workers need disjoint natural keys and ideally disjoint tenants. Strategies:

1. UUID primary keys everywhere in fixtures.
2. Nonce helper that includes worker id: \`w\${WORKER}-...\`.
3. One organization per test, never a shared global customer.
4. Separate schemas or databases per worker for aggressive isolation.
5. Advisory locks only when a scarce shared resource is unavoidable (for example a single SSO sandbox account).

\`\`\`ts
export function workerPrefix(): string {
  const id = process.env.JEST_WORKER_ID || process.env.VITEST_POOL_ID || '1';
  return \`w\${id}\`;
}

export function uniqueEmail(label: string): string {
  return \`\${workerPrefix()}-\${label}-\${randomUUID().slice(0, 8)}@example.test\`;
}
\`\`\`

## Static fixtures, YAML dumps, and referential integrity

YAML or JSON fixture dumps are readable but age poorly when schemas evolve. If you keep them:

- Validate against the live schema on load.
- Express relationships by stable reference keys that the loader resolves to generated UUIDs.
- Never embed raw numeric PKs that must match serial sequences.

\`\`\`yaml
# fixtures/checkout-happy-path.yml
organizations:
  - ref: acme
    slug: acme-test
    name: Acme
customers:
  - ref: pat
    organization: acme
    email: pat@example.test
orders:
  - ref: order1
    organization: acme
    customer: pat
    status: open
\`\`\`

\`\`\`ts
export type FixtureFile = {
  organizations: { ref: string; slug: string; name: string }[];
  customers: {
    ref: string;
    organization: string;
    email: string;
  }[];
  orders: {
    ref: string;
    organization: string;
    customer: string;
    status: string;
  }[];
};

export async function loadFixture(db: Db, fix: FixtureFile) {
  const refs = new Map<string, string>();

  for (const org of fix.organizations) {
    const row = await seedOrganization(db, { slug: org.slug, name: org.name });
    refs.set(org.ref, row.id);
  }
  for (const c of fix.customers) {
    const organizationId = refs.get(c.organization);
    if (!organizationId) throw new Error(\`missing org ref \${c.organization}\`);
    const { customer } = await seedCustomer(db, {
      organizationId,
      email: c.email,
    });
    refs.set(c.ref, customer.id);
  }
  for (const o of fix.orders) {
    const organizationId = refs.get(o.organization);
    const customerId = refs.get(o.customer);
    if (!organizationId || !customerId) throw new Error('missing refs for order');
    const order = await db.insert('orders', {
      id: randomUUID(),
      organizationId,
      customerId,
      status: o.status,
    });
    refs.set(o.ref, order.id);
  }
  return refs;
}
\`\`\`

The loader resolves symbolic refs to live IDs, which keeps referential integrity even when UUIDs change every run.

## CI pipeline placement for seed integrity

Run migrations first, then integrity preflight on empty schema (should pass with zero orphans), then factory self-tests, then the suite.

\`\`\`yaml
name: integration
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: app_test
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/app_test
      - run: npm run test:seed-factories
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/app_test
      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/app_test
\`\`\`

Factory self-tests should intentionally attempt illegal graphs and expect rejection:

\`\`\`ts
import { describe, expect, it } from 'vitest';

describe('seed integrity', () => {
  it('refuses order_items without a product', async () => {
    const db = globalThis.testDb as Db;
    await expect(
      db.insert('order_items', {
        id: randomUUID(),
        orderId: randomUUID(),
        productId: randomUUID(),
        quantity: 1,
        unitPriceCents: 100,
      }),
    ).rejects.toThrow(/foreign key|Foreign key/i);
  });
});
\`\`\`

## Observability for seed failures in large suites

When a suite with hundreds of scenarios fails once a week on FK violations, you need breadcrumbs:

- Include scenario name in error wrappers.
- Log organization id and primary entity ids on failure.
- Dump a small integrity report artifact in CI on failure.
- Tag fixtures with \`created_by_test\` metadata columns if your schema allows test-only columns (or use a side table) to find leftovers.

Avoid storing secrets in seed data. Use reserved example domains such as \`example.test\` and fake payment tokens clearly marked as non-production.

## Organizational practices that keep seeds healthy

1. **One factory module per aggregate** owned by the team that owns the schema.
2. **No raw INSERT in individual tests** except for negative constraint tests.
3. **Schema migration checklist** includes "update factories and integrity checks."
4. **Periodic orphan scan** on shared staging, not only CI.
5. **Delete dead scenarios** that seed enormous graphs for obsolete features.

Teams that install ready-made QA skills from qaskills.sh with the qaskills CLI can scaffold factory patterns quickly, but domain relationships still need human modeling from the real ER diagram.

## End-to-end example narrative

A payments team adds \`refunds.payment_id\` with a foreign key. Without process, an engineer writes a test that inserts into \`refunds\` using a hard-coded payment id from an old YAML dump. Locally the dump still loads; in CI parallel workers truncate payments and the test flakes.

With test data referential integrity seeding, the engineer extends \`scenarioPaidInvoice\` to return a payment, adds \`seedRefund(paymentId)\`, updates the topological graph, and adds an integrity check that refunds join to payments. The test calls the scenario, receives live IDs, and never mentions numeric primary keys. CI fails only when the scenario is wrong, not when workers interleave.

That is the goal: failures reflect domain mistakes, not fixture archaeology.

## Frequently Asked Questions

### Should I disable foreign keys to speed up test data referential integrity seeding?

Almost never for application test databases. Disabling foreign keys lets invalid graphs enter the database and pushes detection into confusing runtime errors. Bulk loaders for analytics warehouses sometimes disable constraints during load and validate after, but product integration suites should keep constraints on and fix insert order. If seed speed is a problem, bulk insert inside a single transaction with prepared graphs usually recovers most of the performance without sacrificing integrity.

### How do I seed circular references such as a user that references its own manager?

Use a two-phase insert: create rows with a nullable manager reference, then update manager ids once both rows exist, all inside one transaction. If your database supports deferrable foreign keys and your team already uses them in production for this pattern, you can insert with deferred checking and validate at commit. Mirror production constraint definitions; do not invent a test-only circularity mechanism that production does not share.

### Are static production dumps acceptable as seed data?

Full production dumps are risky for privacy, size, and non-determinism. Prefer synthetic factories plus carefully minimized anonymized subsets if you need realistic volume. If a dump is unavoidable for performance labs, strip personal data, stabilize sequences, and run integrity preflight after import. Never let a dump become the only way to create a customer in unit-level integration tests.

### How often should integrity preflight queries run?

Run them after global setup, after any shared scenario used by many tests, and on CI failure as an artifact-generating diagnostic. Running the full orphan suite after every single test can be unnecessary if each test uses transaction rollback or a dedicated tenant. Tune frequency to isolation strength: weaker isolation needs more preflight; strong per-test isolation can rely on constraints and occasional global checks.
`,
};
