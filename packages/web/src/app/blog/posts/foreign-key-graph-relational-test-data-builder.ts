import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Build Test Data from Foreign-Key Graphs',
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
  content: `Foreign key graph test data is built by reading enforced relationships, ordering entities from referenced parents to dependent children, inserting each parent first, and passing returned identifiers into child factories. The database remains the final validator. Deterministic values, scenario-level builders, and run-tagged cleanup make failures repeatable without copying any production row.

This tutorial applies the schema-first rules in the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer). Browse the wider [QASkills directory](/skills) when the scenario also needs API, security, or browser-specific test workflows.

## Treat the Schema as a Directed Graph

A relational scenario is not a pile of independent factory calls. Each foreign key creates a dependency edge from the table containing the reference to the table providing the referenced key. For generation, reverse that reading into an insertion instruction: create the referenced parent before the referencing child.

Suppose an organization owns users, users place orders, and orders contain line items. The insertion order is organization, user, order, then line item. The Secure Test Data Engineer source calls this top-down generation and requires every insert to return its created identifier rather than assuming a sequence value.

| Entity | Depends on | Required insertion evidence | Useful returned value |
|---|---|---|---|
| organization | none | valid organization row | organization id |
| user | organization | existing organization id | user id |
| order | user | existing buyer id | order id |
| line item | order and product | existing order and product ids | line item id |
| shipment | order and address | existing order and address ids | shipment id |

This model distinguishes roots from leaves. Root entities can be created without scenario-owned foreign keys, while leaves require every preceding edge to be satisfied. Shared reference data, such as a currency table, should be marked as externally supplied rather than silently regenerated.

PostgreSQL defines a foreign key as a constraint that requires referencing values to match a row in the referenced table. Its [official constraint documentation](https://www.postgresql.org/docs/current/ddl-constraints.html) also explains delete actions, column groups, and self-referential relationships. Those declarations are executable facts, unlike a diagram that may lag migrations.

The graph needs edge metadata, not only table names. Record constrained columns, referenced columns, nullability, update and delete actions, deferrability, and whether multiple columns form one key. A nullable edge can be omitted for one scenario, but a required edge cannot be replaced with a plausible-looking identifier.

Foreign key graph test data becomes maintainable when the graph is stored beside its source evidence. Give each edge the migration filename or introspected constraint name that created it. When an edge changes, reviewers can trace the generated scenario to the exact database declaration.

The [database testing automation guide](/blog/database-testing-automation-guide) places relational fixtures within broader database coverage. This article stays narrower: its target is a valid, inspectable object graph whose construction fails at the first violated dependency.

## Reconcile DDL, ORM, and OpenAPI Contracts

Start from the strongest runtime authority. The assigned skill orders sources as SQL DDL and migrations, ORM models, API schemas, then language types. That order matters because TypeScript can call a field optional while PostgreSQL still rejects a missing value.

An OpenAPI document describes the request boundary, not every stored relation. The [OpenAPI Specification](https://spec.openapis.org/oas/v3.2.0.html) defines a language-neutral API contract and Schema Objects for request and response shapes. It cannot replace an unexposed database constraint unless the service explicitly models that rule.

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

## Plan a Stable Topological Insertion Order

A directed acyclic dependency graph has at least one topological order. For a fixture planner, that means every parent appears before each child that requires it. Multiple valid orders may exist, so choose one deterministic tie-breaker, such as a stable entity name or declared scenario order.

The foreign key graph test data workflow separates dependency ordering from business cardinality. That boundary keeps reusable schema mechanics independent from scenario-specific row counts and roles.

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

Topological order alone does not determine cardinality. A scenario may need two users, three orders, or zero shipments. Keep cardinality in a separate scenario specification so graph mechanics remain reusable and business intent stays readable.

| Planning concern | Graph responsibility | Scenario responsibility |
|---|---|---|
| parent precedes child | yes | no |
| required relation exists | yes | selects participating nodes |
| number of rows | no | yes |
| business role of each row | no | yes |
| returned id propagation | edge contract | assigns id to factory override |
| expected cascade result | edge metadata | selects deletion assertion |

If several roots are independent, a planner could insert them concurrently. Begin sequentially until correctness is proven, because readable failure order is valuable. Concurrency belongs behind evidence that the database, pool, and unique-value strategy support it.

The [test data management strategies guide](/blog/test-data-management-strategies) compares fixture ownership approaches. Use graph planning for scenario shape, then select transaction, schema, or database isolation independently.

## Compose Deterministic Scenario Builders

An entity factory creates one valid row shape. A scenario builder composes factories, performs inserts, captures identifiers, and exposes named results to tests. Combining those responsibilities in one oversized factory hides which relation caused a failure.

Determinism requires more than seeding a generator. Unique fields need worker identifiers and monotonic sequences, while times need a fixed clock. The same seed, schema version, worker inputs, and factory code should reproduce the same pre-insert values.

Builders should accept intent-revealing overrides. \`buildUser({ role: 'admin' })\` tells a reviewer why the row differs. Passing a complete anonymous object forces every test to restate irrelevant defaults and spreads schema changes across the suite.

The scenario below follows the repository skill: parents first, returned identifiers forwarded, one composition point, and no assumed sequence values.

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

Never pass production samples into these builders. If realistic frequency matters, derive approved aggregates locally and feed only those summaries into a synthetic generator. The sibling guide to [aggregate-driven synthetic data](/blog/aggregate-driven-synthetic-test-data-without-production-rows) covers that separate workflow.

Use the [PII-safe reserved namespace guide](/blog/reserved-namespaces-pii-safe-synthetic-test-data) for generated emails, domains, and network-like fields. Safe value spaces complement graph correctness without changing dependency order.

The [synthetic test data generation guide](/blog/synthetic-test-data-generation-guide) adds field-level generation patterns. Graph builders consume those safe entity factories; they do not replace them.

## Handle Cycles, Composite Keys, and Delete Actions

Real schemas are not always acyclic. A self-referential employee manager relation can begin with a nullable manager id, then update the child after both rows exist. Two mutually required immediate foreign keys cannot be solved by ordinary parent-first inserts without schema-supported deferral or another documented creation path.

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

Foreign key graph test data should reject an unexplained cycle during planning. A configuration flag called \`ignoreCycles\` merely postpones the failure. Require a named strategy such as nullable bootstrap or deferrable transaction, plus a test proving the final graph satisfies all constraints.

## Prove Relations Instead of Trusting Setup

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

The [risk-based testing strategy guide](/blog/risk-based-testing-strategy-guide-2026) helps choose which graph variations deserve broad coverage. Prioritize high-impact ownership, payment, authorization, and cascade edges rather than multiplying every harmless optional combination.

## Isolate Parallel Runs and Verify Cleanup

Valid graph construction can still produce flaky suites when workers share unique values or cleanup boundaries. Every generated unique value should include a worker id and sequence where the schema requires uniqueness. Randomness alone is not a collision policy.

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

Run tags must never authorize deletion by themselves in production. Test credentials should be denied production access, and the builder should reject a production connection marker before inserting. The repository skill explicitly forbids generated data in production databases.

A process crash can skip normal teardown. Use disposable infrastructure or an independent sweeper with clear ownership and age safeguards where that risk exists. The builder's job is to make every resource attributable so recovery can act precisely.

## Review the Builder as a Test Contract

Review foreign key graph test data with the same care as application persistence code. It decides which constraints tests exercise, which defaults they hide, and whether parallel runs can contaminate each other. A concise review checklist keeps those decisions visible.

Review graph changes alongside migrations. An added foreign key needs an edge, a parent source, an insertion-order update, a positive relation assertion, a negative case, and cleanup coverage. Treat that set as one change so fixture code cannot lag the constraint that now runs in CI.

Removed constraints need equal scrutiny. Deleting an edge from the builder may allow scenarios the service still assumes are related, while keeping the edge can hide the database's newly permitted state. Record whether business validation replaces the removed database rule and add a test at the layer that now owns it.

Schema transitions may require two compatible graph versions during a rolling deployment. Build fixtures for the actual migration phase under test instead of combining old and new columns into an impossible shape. Name the schema revision in builder provenance so a failure identifies which relation model produced the rows.

Constraint names are valuable review anchors. When a migration renames or replaces a constraint, update expected evidence rather than matching only a generic foreign-key error. Stable SQLSTATE proves the error class, while the current constraint name identifies the exact edge that rejected the row.

Keep fixture-planner tests and real-database tests complementary. Planner tests quickly verify ordering, missing dependencies, and id propagation. PostgreSQL integration tests prove the current DDL actually accepts positive graphs and rejects selected invalid ones, which an in-memory graph model cannot establish.

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

For release gating, the [test impact analysis CI guide](/blog/test-impact-analysis-ci-guide-2026) can map changed migrations and builders to focused database tests. Keep full required suites as the final safety net.

Next, install and apply the [Secure Test Data Engineer skill](/skills/thetestingacademy/secure-test-data-engineer) to one real relational scenario. Start with its highest-value parent-child path, return every created id, and add a zero-residue assertion before expanding the graph.

Use foreign key graph test data first where relationship mistakes create the greatest customer or operational risk. Extend the builder only after that narrow path produces clear constraint and cleanup evidence.

## Frequently Asked Questions

### Should every database table become a graph node?

No. Include tables owned by the scenario and required shared references that explain dependency order. Infrastructure tables, immutable lookup data, and unrelated audit stores can remain external inputs. Document their ownership clearly, because an omitted required reference is different from a deliberately shared root managed outside the builder.

### Can factories insert children before parents inside one transaction?

Ordinary immediate foreign keys still check statements inside the transaction, so transaction wrapping alone does not permit an invalid order. Insert parents first unless the schema explicitly supports a nullable bootstrap or deferrable constraint. Preserve that strategy in graph metadata and test the final constraint evaluation before returning.

### How should a builder handle database-generated identifiers?

Capture identifiers from the insert result and pass them directly into dependent factories. Never predict identity or sequence values, because allocation can have gaps and concurrent writers. Returning created records also lets tests assert defaults and relationships without another ambiguous lookup by a non-unique display field.

### Are ORM relations enough to generate the graph?

ORM metadata is useful, but migrations and SQL DDL remain the runtime authority. Compare both and report disagreements rather than choosing quietly. An ORM may omit a partial unique index, composite key detail, delete action, or constraint added through raw SQL, all of which affect generated scenarios.

### How many scenario builders should a suite have?

Create one builder for each recurring business shape, not every individual test. Parameterize meaningful roles and cardinalities while keeping valid defaults boring. If one builder gains many unrelated flags, split it by intent so schema changes have focused impact and tests reveal which relationship they actually require.

### Does valid relational data require production samples?

No. Constraints, API schemas, fixed defaults, and synthetic generators provide valid shapes without copying records. When frequency matters, compute approved summary statistics locally and generate new rows from those aggregates. Production records never leave their system, and generated datasets retain seed and schema provenance for reproduction.
`,
};
