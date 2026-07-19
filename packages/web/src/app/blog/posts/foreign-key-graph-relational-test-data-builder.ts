import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Foreign Key Graph Test Data Builder',
  description:
    'Build foreign key graph test data from SQL constraints with deterministic factories, ordered inserts, relation checks, and residue-safe cleanup in CI.',
  date: '2026-07-18',
  updated: '2026-07-18',
  category: 'Tutorial',
  primaryKeyword: 'foreign key graph test data',
  keywords: [
    'foreign key graph test data',
    'relational test data builder',
    'database fixture dependency graph',
    'schema driven test data',
    'deterministic data factories',
    'foreign key test fixtures',
    'relational database testing',
    'test data cleanup',
  ],
  relatedSlugs: [
    'negative-api-tests-no-partial-write-row-count',
    'test-data-cleanup-residue-assertion-run-tag',
    'reserved-namespaces-pii-safe-synthetic-test-data',
    'aggregate-driven-synthetic-test-data-without-production-rows',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/ddl-constraints.html',
    'https://www.postgresql.org/docs/current/tutorial-transactions.html',
    'https://spec.openapis.org/oas/v3.2.0.html',
  ],
  content: `Foreign key graph test data reads each enforced link, puts parent rows before child rows, and passes each new id into the next builder. The DB checks the completed graph, while fixed values, named cases, and run-tag cleanup make failed tests easy to repeat without copying any live row.

This tutorial applies the schema-first rules in the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). Browse the wider [QASkills directory](/skills) when the scenario also needs API, security, or browser-specific test workflows.

## How Does a Database Fixture Dependency Graph Work?

A database fixture dependency graph treats each foreign key as a link between two tables. For setup, that link means the parent row must exist before a child can point to it, which turns a set of factories into one clear insert plan.

Suppose an organization owns users, users place orders, and orders contain line items. The insertion order is organization, user, order, then line item. The Secure Test Data Engineer source calls this top-down generation and requires every insert to return its created identifier rather than assuming a sequence value.

| Entity | Depends on | Required insertion evidence | Useful returned value |
|---|---|---|---|
| organization | none | valid organization row | organization id |
| user | organization | existing organization id | user id |
| order | user | existing buyer id | order id |
| line item | order and product | existing order and product ids | line item id |
| shipment | order and address | existing order and address ids | shipment id |

This model distinguishes roots from leaves, since root rows need no case-owned foreign keys while leaves require each prior link. Shared reference data, such as a currency table, should be marked as supplied rather than silently rebuilt.

PostgreSQL says a foreign key requires a child value to match a key in a parent row. Its [official constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) also covers delete rules, grouped columns, and self-links that run in the DB while a diagram may be out of date.

The graph needs facts about each link, not just table names, so store the child and parent columns, null rules, delete rules, deferral, and any grouped key. A nullable link may be skipped, but a required link must use a real parent.

Foreign key graph test data becomes maintainable when the graph is stored beside its source evidence. Give each edge the migration filename or introspected constraint name that created it. When an edge changes, reviewers can trace the generated scenario to the exact database declaration.

The [database testing automation guide](/blog/database-testing-automation-guide) puts linked fixtures inside broad DB coverage. This article has a smaller goal: build a valid graph that names the first broken link clearly.

## How Should Schema Driven Test Data Reconcile Contracts?

Start from the strongest run-time source: the skill orders SQL DDL and schema files, ORM models, API schemas, then language types. That order matters because TypeScript can call a field optional while PostgreSQL still rejects a missing value.

OpenAPI defines the request edge, but it does not show each stored link. The [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html) defines request and response shapes, while SQL remains the source for any DB rule the API does not expose.

Use an inventory table before writing builders:

| Question | DDL or migration | ORM model | OpenAPI | Generation decision |
|---|---:|---:|---:|---|
| Is the column nullable? | authoritative | compare | request only | obey DDL for stored rows |
| Is the request field required? | indirect | compare | authoritative | generate omitted-key negative case |
| Is the value unique? | authoritative | compare | often absent | add worker and sequence uniqueness |
| Which table owns the relation? | authoritative | maps code | usually hidden | derive graph edge from DDL |
| Which enum reaches clients? | stored values | code mapping | public contract | test every declared boundary |
| What happens on delete? | authoritative | may annotate | rarely represented | verify cascade or rejection |

Do not silently resolve disagreements. If the API accepts a string longer than the database column permits, the mismatch is a defect and a test target. If an ORM marks a relation optional while the migration uses \`NOT NULL\`, report both locations before choosing the database-enforced path.

The inventory procedure is ordered and reproducible:

1. Read migrations in application order and list primary, unique, check, and foreign-key constraints.
2. Compare current ORM declarations with the resulting database shape, recording every mismatch as a finding.
3. Map OpenAPI request fields onto stored columns, including defaults, omitted fields, and server-generated values.
4. Build graph nodes for scenario-owned entities and annotated edges for enforced relationships.
5. Review unknown ownership, optionality, or cascade behavior before generating any row.

Avoid deriving the graph solely from existing fixture code. Legacy fixtures may encode assumptions that constraints no longer permit. Likewise, do not query production rows to learn relations. Schema files provide shapes and rules while production records remain inside their system.

The [OpenAPI-to-test-suite guide](/blog/openapi-spec-to-test-suite-generation) can generate request-boundary cases after this reconciliation. Its outputs should feed the same field map rather than creating a competing set of defaults.

## How Do Foreign Key Test Fixtures Choose Insert Order?

A directed acyclic dependency graph has at least one topological order. For a fixture planner, that means every parent appears before each child that requires it. Multiple valid orders may exist, so choose one deterministic tie-breaker, such as a stable entity name or declared scenario order.

Foreign key graph test data keeps insert order separate from row counts and roles. This split lets one graph plan serve many clear test cases without hiding what each case needs.

The planner should fail before database writes when a required dependency is absent. A missing product factory in a checkout scenario is a planning error, not an invitation to insert a random product identifier. Early failure gives a direct message and avoids partial setup.

The following graph definition keeps relation evidence visible and returns a stable order. It is grounded in the source skill's requirement to insert along the dependency graph.

\`\`\`typescript
type Entity = 'organization' | 'user' | 'product' | 'order' | 'lineItem';

type Dependency = {
  child: Entity;
  parent: Entity;
  constraint: string;
  required: boolean;
};

const dependencies: Dependency[] = [
  { child: 'user', parent: 'organization', constraint: 'users_org_id_fkey', required: true },
  { child: 'order', parent: 'user', constraint: 'orders_user_id_fkey', required: true },
  { child: 'lineItem', parent: 'order', constraint: 'line_items_order_id_fkey', required: true },
  { child: 'lineItem', parent: 'product', constraint: 'line_items_product_id_fkey', required: true },
];

export function insertionOrder(nodes: Entity[], edges: Dependency[]): Entity[] {
  const nodeSet = new Set(nodes);
  const incoming = new Map(nodes.map((node) => [node, 0]));
  const children = new Map(nodes.map((node) => [node, [] as Entity[]]));

  for (const edge of edges.filter((item) => item.required)) {
    if (!nodeSet.has(edge.child) || !nodeSet.has(edge.parent)) {
      throw new Error('Scenario omits dependency for ' + edge.constraint);
    }
    incoming.set(edge.child, (incoming.get(edge.child) ?? 0) + 1);
    children.get(edge.parent)?.push(edge.child);
  }

  const ready = nodes.filter((node) => incoming.get(node) === 0).sort();
  const ordered: Entity[] = [];
  while (ready.length > 0) {
    const parent = ready.shift()!;
    ordered.push(parent);
    for (const child of (children.get(parent) ?? []).sort()) {
      const remaining = (incoming.get(child) ?? 0) - 1;
      incoming.set(child, remaining);
      if (remaining === 0) ready.push(child);
    }
    ready.sort();
  }

  if (ordered.length !== nodes.length) throw new Error('Required dependency cycle detected');
  return ordered;
}
\`\`\`

This planner treats only required edges as ordering requirements. Optional edges still need deliberate values when a scenario enables them. Store those edges for validation, but do not force an unrelated optional parent into every graph.

Topological order does not set row counts. A case may need two users, three orders, or no shipments. Keep those counts in the case spec so the graph stays useful and the test intent stays clear.

| Planning concern | Graph responsibility | Scenario responsibility |
|---|---|---|
| parent precedes child | yes | no |
| required relation exists | yes | selects participating nodes |
| number of rows | no | yes |
| business role of each row | no | yes |
| returned id propagation | edge contract | assigns id to factory override |
| expected cascade result | edge metadata | selects deletion assertion |

Independent roots can be inserted at the same time, but start with a fixed sequence. A clear order makes setup failures easier to read. Add parallel work only after the DB, pool, and unique-value rules prove it is safe.

The [test data management strategies guide](/blog/test-data-management-strategies) compares ways to own fixtures. Use the graph to set row shape, then choose transaction, schema, or DB isolation as a separate step.

## How Do Deterministic Data Factories Build Full Scenarios?

An entity factory builds one valid row. A case builder calls those factories, writes rows, saves ids, and returns named values to the test. Keeping the two jobs apart shows which link failed and keeps small factories easy to reuse.

Determinism requires more than seeding a generator. Unique fields need worker identifiers and monotonic sequences, while times need a fixed clock. The same seed, schema version, worker inputs, and factory code should reproduce the same pre-insert values.

Builders should accept intent-revealing overrides. \`buildUser({ role: 'admin' })\` tells a reviewer why the row differs. Passing a complete anonymous object forces every test to restate irrelevant defaults and spreads schema changes across the suite.

The code below follows the skill's core rules. It creates parents first, passes back each new id, and avoids guessed sequence values.

\`\`\`typescript
type Db = {
  one<T>(table: string, values: Record<string, unknown>): Promise<T>;
};

type Created = {
  organization: { id: string; testRunId: string };
  buyer: { id: string; organizationId: string };
  order: { id: string; buyerId: string };
  lineItems: Array<{ id: string; orderId: string; productId: string }>;
};

export async function seedCheckoutScenario(
  db: Db,
  input: { testRunId: string; workerId: string; productIds: [string, string] },
): Promise<Created> {
  const organization = await db.one<Created['organization']>('organizations', {
    name: 'Test Organization ' + input.workerId,
    testRunId: input.testRunId,
  });

  const buyer = await db.one<Created['buyer']>('users', {
    organizationId: organization.id,
    email: 'buyer-' + input.workerId + '@example.test',
    role: 'member',
    testRunId: input.testRunId,
  });

  const order = await db.one<Created['order']>('orders', {
    buyerId: buyer.id,
    status: 'pending',
    testRunId: input.testRunId,
  });

  const lineItems = await Promise.all(
    input.productIds.map((productId, index) =>
      db.one<Created['lineItems'][number]>('line_items', {
        orderId: order.id,
        productId,
        quantity: index + 1,
        testRunId: input.testRunId,
      }),
    ),
  );

  return { organization, buyer, order, lineItems };
}
\`\`\`

Products are inputs because this scenario treats the catalog as managed reference data. Another suite could own product creation and include products as graph roots. Ownership must be explicit so cleanup never deletes shared rows accidentally.

The builder returns entities rather than only ids because tests often assert stored defaults and relationships. Keep that result minimal enough to discourage broad snapshot assertions. A checkout test should name the fields tied to its behavior, not freeze every database column.

Foreign key graph test data also needs provenance. Add a generator name, seed, schema version, and run tag where the schema permits. Provenance distinguishes generated records from shared fixtures and gives cleanup a precise selection key.

Never give these builders live row samples. When a test needs common value mixes, compute approved summary counts inside the source system. Feed only those reviewed counts to the builder, as shown in the [aggregate-driven synthetic data guide](/blog/aggregate-driven-synthetic-test-data-without-production-rows).

Use the [PII-safe reserved namespace guide](/blog/reserved-namespaces-pii-safe-synthetic-test-data) for generated emails, domains, and network-like fields. Safe value spaces complement graph correctness without changing dependency order.

The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) adds field-level generation patterns. Graph builders consume those safe entity factories; they do not replace them.

## Which Cycles Challenge a Relational Test Data Builder?

Some schemas contain cycles. A manager link can start as null, then be set after both staff rows exist. Two links that are both required at once need a DB-supported deferral rule or another stated create path. Plain parent-first inserts cannot solve that shape.

Do not disable constraints to make a cycle disappear. The constraint is part of the product contract. If the database declares a deferrable constraint, test its intended transaction behavior explicitly and force evaluation before treating setup as successful.

PostgreSQL transactions group multiple statements into one atomic operation: either all effects happen or none do. The [official transaction tutorial](https://www.postgresql.org/docs/current/tutorial-transactions.html) explains this all-or-nothing boundary. A graph builder can use that boundary for setup, but it must still surface constraint failures before returning.

Composite foreign keys are one edge with multiple column pairs. Never model each column as an independent optional edge, because a mixed pair can reference no real parent. Keep the ordered column tuple together in graph metadata and pass all returned key parts into the child factory.

Delete actions change cleanup and behavior tests:

| Declared action | Generation implication | Required behavior check |
|---|---|---|
| \`ON DELETE CASCADE\` | child requires parent during insert | deleting parent removes matching children |
| \`ON DELETE RESTRICT\` | child blocks parent deletion | deletion fails while child exists |
| \`ON DELETE NO ACTION\` | timing may depend on deferral | constraint is satisfied by check time |
| \`ON DELETE SET NULL\` | referencing columns must permit null | child remains with null reference |
| \`ON DELETE SET DEFAULT\` | default must identify a valid row when checked | child receives declared default |

Do not infer delete behavior from an ORM relation name. Read the migration and retain the constraint name in test evidence. The graph represents enforced storage behavior, while domain services may apply stricter deletion rules before SQL executes.

For a nullable self-reference, use an explicit two-phase plan: insert the root with null, insert the child with the root id, then update the root only if the scenario requires a cycle. Every phase should name the permitted nullability and expected final edge.

Foreign key graph test data should stop when it finds a cycle with no plan. An \`ignoreCycles\` switch only hides the real fault. Require a named method, such as a nullable first pass or deferred check, then test the finished graph.

## How Should Relational Database Testing Prove Each Link?

A successful insert proves the database accepted that statement, but it does not prove the scenario expresses the intended business relationship. Query the created rows through stable identifiers and assert every selected edge. This catches factory wiring mistakes that still satisfy a different valid parent.

Use focused relational assertions rather than one enormous serialized snapshot. Verify the buyer belongs to the created organization, the order belongs to that buyer, and each line item references both the order and expected product. The graph provides the assertion inventory.

Negative relation cases come mechanically from constraints. Try a missing parent, an id from the wrong table where types permit it, a deleted parent, and each documented delete action. The source skill requires the right rejection and no partial write, not merely a non-success response.

The companion article on a [negative API test with no partial write](/blog/negative-api-tests-no-partial-write-row-count) shows how to capture before and after row counts around a rejected request. Apply that method whenever one API command writes several graph nodes.

\`\`\`typescript
import { expect, test } from 'vitest';

test('creates the checkout graph with the expected edges', async () => {
  const created = await seedCheckoutScenario(db, {
    testRunId: 'run-checkout-17',
    workerId: 'worker-2',
    productIds: ['product-a', 'product-b'],
  });

  const rows = await loadCheckoutGraph(db, created.order.id);
  expect(rows.order.buyerId).toBe(created.buyer.id);
  expect(rows.buyer.organizationId).toBe(created.organization.id);
  expect(rows.lineItems.map((row) => row.orderId)).toEqual([
    created.order.id,
    created.order.id,
  ]);
  expect(rows.lineItems.map((row) => row.productId).sort()).toEqual([
    'product-a',
    'product-b',
  ]);
});
\`\`\`

Assert constraint identity when the driver exposes stable SQLSTATE and constraint fields. Message text can vary by server version or localization. A named constraint connects failure evidence directly to the schema edge under test.

Also test the scenario builder itself. Provide a fake database adapter that records insertion order and returned ids, then verify each child receives the exact parent key. Keep at least one real PostgreSQL test because a fake cannot prove actual constraint semantics.

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps rank graph cases. Test ownership, payment, access, and cascade links first when a fault would cause harm. Do not multiply every harmless optional pair.

## How Does Test Data Cleanup Work Across Parallel Runs?

Test data cleanup works across parallel runs by pairing each worker with distinct values and its own cleanup scope. Valid graphs can still cause flaky tests when workers share those inputs. Randomness alone is not a safe collision rule.

In CI, foreign key graph test data must remain attributable after a worker crashes. Stable run tags let normal teardown and independent recovery identify exactly the same owned rows.

Choose isolation separately from generation. A single-connection repository test can roll back its transaction, while an HTTP test may write through the application's pool and escape the test connection. Shared environments usually need run tags on every owned row.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) helps place connection-aware database checks after migrations. Do not claim rollback coverage when setup and application requests use different sessions.

For run-tag cleanup, propagate the same \`test_run_id\` through every scenario-owned table. Delete leaves before roots unless declared cascades are themselves under test. Then count tagged rows across all owned tables and fail if any residue remains.

The sibling [test data cleanup residue assertion](/blog/test-data-cleanup-residue-assertion-run-tag) provides the full residue contract. It treats cleanup as an assertion-producing phase rather than an unobserved teardown hook.

| Isolation mode | Graph builder responsibility | Cleanup evidence |
|---|---|---|
| transaction rollback | use the injected connection | zero tagged rows or rollback confirmation |
| schema per worker | target that worker schema | schema removal and connection closure |
| database per run | target only disposable database | database disposal result |
| shared environment | tag every owned row | per-table residue counts equal zero |

Run tags must not grant delete rights in a live DB. Test accounts must have no live access, and the builder must stop if it sees a live connection marker. A tag says who owns a row; it is not a security check.

A process crash can skip normal teardown. Use disposable infrastructure or an independent sweeper with clear ownership and age safeguards where that risk exists. The builder's job is to make every resource attributable so recovery can act precisely.

## Use This Relational Test Data Builder in CI

Review foreign key graph test data with the same care as application persistence code. It decides which constraints tests exercise, which defaults they hide, and whether parallel runs can contaminate each other. A concise review checklist keeps those decisions visible.

Review graph changes alongside migrations. An added foreign key needs an edge, a parent source, an insertion-order update, a positive relation assertion, a negative case, and cleanup coverage. Treat that set as one change so fixture code cannot lag the constraint that now runs in CI.

Removed constraints need equal scrutiny. Deleting an edge from the builder may allow scenarios the service still assumes are related, while keeping the edge can hide the database's newly permitted state. Record whether business validation replaces the removed database rule and add a test at the layer that now owns it.

Schema transitions may require two compatible graph versions during a rolling deployment. Build fixtures for the actual migration phase under test instead of combining old and new columns into an impossible shape. Name the schema revision in builder provenance so a failure identifies which relation model produced the rows.

Constraint names are valuable review anchors. When a migration renames or replaces a constraint, update expected evidence rather than matching only a generic foreign-key error. Stable SQLSTATE proves the error class, while the current constraint name identifies the exact edge that rejected the row.

Use planner tests and real DB tests for different jobs. Planner tests check order, missing links, and id flow quickly. PostgreSQL tests prove that current SQL accepts valid graphs and rejects selected bad ones. An in-memory graph cannot prove the last point.

Do not let a comprehensive builder become a universal test setup. Large graphs increase cleanup scope and make failures harder to attribute. Each scenario should include only entities required for its behavior, plus explicit shared references, while reusing the same underlying graph metadata.

1. Confirm every graph edge cites current DDL or a migration constraint.
2. Confirm the chosen insertion order places every required parent before its children.
3. Confirm each generated identifier comes from the database response, never an assumed sequence.
4. Confirm deterministic defaults, fixed time, worker-safe uniqueness, and intent-named overrides.
5. Confirm cycles and composite keys have named, schema-supported strategies.
6. Confirm positive edge assertions and negative constraint cases both exist.
7. Confirm ownership tags reach every generated row and cleanup proves zero residue.
8. Confirm no production row, dump, or sample enters generation or external tooling.

Add the builder to CI only after one forced failure demonstrates useful evidence. Break a parent id deliberately, observe the named constraint failure, then restore it. This drill verifies that the database remains the final validator instead of a mocked repository layer.

Start with one parent and one child. Save both returned IDs, assert the link from a fresh query, and delete only those rows. A short first case makes order, ownership, and cleanup faults easy to see before the graph grows.

For release gating, the [test impact analysis CI guide](/blog/test-impact-analysis-ci-guide-2026) can map changed migrations and builders to focused database tests. Keep full required suites as the final safety net.

Next, install and apply the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to one real relational scenario. Start with its highest-value parent-child path, return every created id, and add a zero-residue assertion before expanding the graph.

Use foreign key graph test data first where relationship mistakes create the greatest customer or operational risk. Extend the builder only after that narrow path produces clear constraint and cleanup evidence.

## Frequently Asked Questions

### Should every database table become a graph node?

No. Include tables owned by the case and shared roots that explain the insert order. System tables, fixed lookup data, and unrelated audit stores can stay outside the graph. State who owns them, because a missing required parent differs from a shared root managed by another tool.

### Can factories insert children before parents inside one transaction?

Ordinary immediate foreign keys still check statements inside the transaction, so transaction wrapping alone does not permit an invalid order. Insert parents first unless the schema explicitly supports a nullable bootstrap or deferrable constraint. Preserve that strategy in graph metadata and test the final constraint evaluation before returning.

### How should a builder handle database-generated identifiers?

Read each id from the insert result and pass it straight to child builders. Never guess identity or sequence values, because other writes can leave gaps or claim the next value. Returning each new row also lets tests check defaults and links without a second lookup by a display field.

### Are ORM relations enough to generate the graph?

ORM metadata is useful, but migrations and SQL DDL remain the runtime authority. Compare both and report disagreements rather than choosing quietly. An ORM may omit a partial unique index, composite key detail, delete action, or constraint added through raw SQL, all of which affect generated scenarios.

### How many scenario builders should a suite have?

Build one case helper for each business shape that appears often, not for each test. Let callers set clear roles and row counts while safe defaults stay plain. Split a helper when flags cover unrelated flows, so schema changes affect a small area and tests still show which links matter.

### Does valid relational data require production samples?

No. SQL rules, API schemas, fixed defaults, and synthetic builders can make valid rows without copied records. If value frequency matters, compute approved counts inside the source system and make fresh rows from them. Keep live records in place, and save the seed and schema version for replay.
`,
};
