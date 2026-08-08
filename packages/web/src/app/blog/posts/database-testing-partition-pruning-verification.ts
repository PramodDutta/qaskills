import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Database Testing Partition Pruning Verification: Catch Silent Full-Scan Regressions',
  description:
    'Database testing partition pruning verification that proves your planner skips partitions, with EXPLAIN harnesses, CI gates, and failure diagnosis.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Database Testing Partition Pruning Verification: Catch Silent Full-Scan Regressions

Partition pruning is the quiet contract between your schema and the query planner. When it works, a filter on a partition key touches a handful of segments and latency stays flat as the table grows. When it breaks, the query still returns the right rows, but the planner scans every partition. Functional tests stay green. Nightly load slowly dies. That is why **database testing partition pruning verification** belongs in the same CI lane as migration checks, not in a quarterly capacity review.

This guide shows QA and test-automation engineers how to prove pruning with planner output, not with wall-clock hope. You will build harnesses that parse \`EXPLAIN\` (and \`EXPLAIN ANALYZE\` where safe), assert partition counts and scan types, and fail the build when a refactor rewrites a predicate so the key is no longer sargable. The patterns apply to PostgreSQL range and list partitions, with notes for MySQL and SQL Server, and they integrate cleanly with Node and Python API test suites.

If your team already runs API contract suites with SuperTest, treat pruning checks as a sibling gate: same PR, same green bar, different failure signal. For transaction-side guarantees that often ship with partitioned ledgers, pair this work with [database testing transaction isolation levels](/blog/database-testing-transaction-isolation-levels). For HTTP-layer coverage of the services that query those partitions, see the [SuperTest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide).

## What partition pruning actually guarantees

Pruning is a planner optimization. The engine evaluates partition bounds against the query's partition-key predicates **before** (or while) building the plan, and drops partitions that cannot contribute rows. The result set is identical to a full scan with the same \`WHERE\` clause. The difference is I/O, buffer cache pressure, and lock duration on partitions you never needed.

Pruning is **not**:

- A correctness feature for row filters (missing predicates still return extra rows).
- A substitute for indexes inside each partition.
- Guaranteed for every expression that "looks like" a key comparison (functions, casts, and OR-expansion often defeat it).
- Free under every join order (some planners prune after join planning; some need constraint exclusion or partitionwise join flags).

Verification therefore has two layers. Layer one is static: does this SQL shape still prune under the current schema? Layer two is operational: under realistic data volumes and statistics, does the chosen plan still prune? Most silent regressions live in layer one after a "harmless" application change wraps a column in \`DATE_TRUNC\`, casts a UUID, or builds dynamic SQL with \`OR\` instead of \`IN\`.

## Schema fixtures that make pruning testable

You cannot assert pruning on a single unpartitioned table. Tests need a controlled multi-partition layout, known bounds, and enough statistics that the planner does not fall back to a generic plan that scans everything "just in case."

A minimal PostgreSQL fixture for range partitioning on \`created_at\`:

\`\`\`sql
CREATE TABLE events (
  id            bigserial,
  tenant_id     uuid        NOT NULL,
  created_at    timestamptz NOT NULL,
  event_type    text        NOT NULL,
  payload       jsonb       NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_01 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE events_2026_02 PARTITION OF events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE events_2026_03 PARTITION OF events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE events_default PARTITION OF events DEFAULT;

CREATE INDEX events_2026_01_tenant_created
  ON events_2026_01 (tenant_id, created_at);
CREATE INDEX events_2026_02_tenant_created
  ON events_2026_02 (tenant_id, created_at);
CREATE INDEX events_2026_03_tenant_created
  ON events_2026_03 (tenant_id, created_at);
\`\`\`

Seed data so each partition has rows, then \`ANALYZE events\` (or \`ANALYZE\` each child). Empty partitions still prune, but empty tables can produce plans that look "too good" and hide index regressions. A practical seed for CI:

\`\`\`sql
INSERT INTO events (tenant_id, created_at, event_type, payload)
SELECT
  ('00000000-0000-4000-8000-' || lpad((g % 50)::text, 12, '0'))::uuid,
  timestamptz '2026-01-15' + ((g % 70) * interval '1 day'),
  CASE WHEN g % 3 = 0 THEN 'click' WHEN g % 3 = 1 THEN 'view' ELSE 'purchase' END,
  jsonb_build_object('n', g)
FROM generate_series(1, 15000) AS g;

ANALYZE events;
\`\`\`

List partitioning on \`tenant_id\` (or a region code) is equally useful when the product query always filters by tenant. Hybrid designs (list of tenants, range of time under each) need extra care: assert pruning at **both** levels when both predicates are present.

| Layout | Partition key | Typical app filter | Pruning risk if broken |
| --- | --- | --- | --- |
| Monthly range | \`created_at\` | time window + tenant | full history scan on dashboards |
| List by region | \`region_code\` | single region | cross-region I/O and noisy-neighbor load |
| Hash by user id | \`user_id\` | equality on user | often still scans all if planner cannot hash-route |
| Composite list+range | tenant then month | tenant + month | partial prune only (still expensive) |

Hash partitioning is the awkward case for verification. Some engines prune on equality with the hash key; others always touch all partitions for that strategy. Do not write a CI gate that assumes hash pruning unless your engine's docs and \`EXPLAIN\` both show it for your version.

## Reading planner output without lying to yourself

PostgreSQL's \`EXPLAIN (FORMAT TEXT)\` and \`EXPLAIN (FORMAT JSON)\` are the primary oracle. Prefer JSON in automation: stable field names beat regex over indented text.

What you want to see for a good prune on the fixture above, for a query restricted to February 2026:

- An \`Append\` (or partition-wise path) that lists **only** \`events_2026_02\` (and possibly a small set if bounds are half-open and edge cases land on adjacent months).
- No sequential scan of \`events_2026_01\` or \`events_2026_03\` for that window.
- Ideally an index scan or bitmap heap scan on the child, not a seq scan of a huge child (that is a different gate: local index health).

What a broken plan looks like:

- \`Append\` over every child including \`events_default\`.
- A single scan of the parent with no partition elimination note (version-dependent presentation).
- Filters applied as \`Filter:\` after a full child scan instead of as partition constraints.

MySQL 8+ with InnoDB partitioning exposes pruning via \`EXPLAIN\` partitions column (or \`EXPLAIN FORMAT=JSON\`). SQL Server shows partition elimination in the actual plan XML (\`RunTimePartitionSummary\` / estimated partition counts depending on version and actual vs estimated). The **assertion idea** is the same: count partitions touched, fail if count exceeds a budget for a known predicate.

## A Node harness that fails CI when pruning regresses

The following Vitest-style test uses \`pg\` and asserts against JSON plans. Adjust connection bootstrap to your project. The important part is the assertion surface: partition names in the plan, not elapsed milliseconds.

\`\`\`typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

type PlanNode = {
  "Node Type"?: string;
  "Relation Name"?: string;
  "Parent Relationship"?: string;
  Plans?: PlanNode[];
  [key: string]: unknown;
};

function walk(node: PlanNode, visit: (n: PlanNode) => void): void {
  visit(node);
  for (const child of node.Plans ?? []) {
    walk(child, visit);
  }
}

function relationNames(plan: PlanNode): string[] {
  const names: string[] = [];
  walk(plan, (n) => {
    if (typeof n["Relation Name"] === "string") {
      names.push(n["Relation Name"]);
    }
  });
  return names;
}

describe("events partition pruning", () => {
  beforeAll(async () => {
    // Assume migrations + seed already applied in testcontainer or CI job.
    await pool.query("ANALYZE events");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("prunes to February partition for a February window", async () => {
    const sql = \`
      EXPLAIN (FORMAT JSON)
      SELECT id, event_type
      FROM events
      WHERE created_at >= TIMESTAMPTZ '2026-02-01'
        AND created_at <  TIMESTAMPTZ '2026-03-01'
        AND tenant_id = $1
    \`;

    const tenant = "00000000-0000-4000-8000-000000000007";
    const { rows } = await pool.query(sql, [tenant]);
    const root = rows[0]["QUERY PLAN"][0].Plan as PlanNode;
    const scanned = relationNames(root);

    expect(scanned).toContain("events_2026_02");
    expect(scanned).not.toContain("events_2026_01");
    expect(scanned).not.toContain("events_2026_03");
    expect(scanned).not.toContain("events_default");
  });
});
\`\`\`

Why this style beats "query under 50ms":

- Cold cache and shared CI runners make timing flaky.
- A plan can still prune while an index is missing (slower but correct scope).
- A plan can full-scan and still be "fast enough" on tiny CI data, then explode in production.

Extend the harness with a **budget API**: for a known predicate, \`maxPartitionsTouched: 1\` or \`2\` (edge months). Encode budgets next to the SQL in a small registry so product engineers see the contract when they change the query.

\`\`\`typescript
type PruneCase = {
  name: string;
  sql: string;
  params: unknown[];
  allowedRelations: string[];
  forbiddenRelations: string[];
};

const cases: PruneCase[] = [
  {
    name: "tenant dashboard last 7 days in February",
    sql: \`
      EXPLAIN (FORMAT JSON)
      SELECT count(*) FROM events
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <  $3
    \`,
    params: [
      "00000000-0000-4000-8000-000000000007",
      "2026-02-20T00:00:00Z",
      "2026-02-27T00:00:00Z",
    ],
    allowedRelations: ["events_2026_02"],
    forbiddenRelations: [
      "events_2026_01",
      "events_2026_03",
      "events_default",
    ],
  },
];

async function assertPrune(c: PruneCase): Promise<void> {
  const { rows } = await pool.query(c.sql, c.params);
  const root = rows[0]["QUERY PLAN"][0].Plan as PlanNode;
  const scanned = new Set(relationNames(root));

  for (const rel of c.allowedRelations) {
    expect(scanned.has(rel), \`missing \${rel} in \${c.name}\`).toBe(true);
  }
  for (const rel of c.forbiddenRelations) {
    expect(scanned.has(rel), \`unexpected \${rel} in \${c.name}\`).toBe(false);
  }
}
\`\`\`

Run these with Vitest's name filter when debugging one case: \`vitest run -t "prunes to February"\`. That is \`-t\` / \`--testNamePattern\`, not Mocha's \`--grep\`.

## Predicates that kill pruning (and how tests catch them)

The classic production incident is not "we forgot the partition key." It is "we still filter on time, but not in a form the planner can match to bounds."

| Anti-pattern | Example fragment | Why pruning fails | Test signal |
| --- | --- | --- | --- |
| Function on column | \`DATE(created_at) = DATE '2026-02-10'\` | column side not equal to bound form | many children in plan |
| Mismatched types | \`created_at = '2026-02-10'\` without timestamptz care | cast prevents bound match | full Append |
| OR across keys | \`tenant_id = $1 OR tenant_id = $2\` on list partitions | sometimes OK as IN; OR with non-key defeats | depends; assert explicitly |
| Negation only | \`created_at <> $1\` | most partitions still possible | expect multi-partition |
| Parameterized dynamic SQL | string-built \`WHERE\` missing key | app bug | no key in captured SQL |
| Time zone rewrite | convert to local date string then compare text | loses range sargability | full scan |

A focused negative test documents the anti-pattern so a future "cleanup" does not reintroduce it as the "simplified" query:

\`\`\`typescript
it("documents that wrapping created_at defeats pruning", async () => {
  const sql = \`
    EXPLAIN (FORMAT JSON)
    SELECT id FROM events
    WHERE date_trunc('day', created_at) = TIMESTAMPTZ '2026-02-10'
  \`;
  const { rows } = await pool.query(sql);
  const root = rows[0]["QUERY PLAN"][0].Plan as PlanNode;
  const scanned = relationNames(root);
  // This is the bad shape: CI for product queries must NOT look like this.
  expect(scanned.length).toBeGreaterThan(1);
});
\`\`\`

Keep that test labeled as a **catalog of anti-patterns**, not as a required product query. Product queries get positive prune tests only.

## Application-layer capture: prove the SQL you ship still prunes

ORM-generated SQL is where pruning dies in microservices. A repository method that once emitted a range on \`created_at\` starts emitting a client-side filter or a \`BETWEEN\` on a derived column after a refactor.

Strategy:

1. Enable statement logging in the test database or use a driver wrapper that records SQL text + bind parameters for the duration of one test.
2. Feed the captured SQL into the same \`EXPLAIN\` assertion helper.
3. Fail if the captured text lacks the partition key, or if the plan violates the budget.

Python sketch with SQLAlchemy-style event hooks (conceptually; wire to your stack):

\`\`\`python
import json
import re
from dataclasses import dataclass, field

@dataclass
class SqlCapture:
    statements: list[str] = field(default_factory=list)

    def track(self, statement: str) -> None:
        if statement.lstrip().upper().startswith("SELECT"):
            self.statements.append(statement)

def assert_mentions_partition_key(sql: str, key: str = "created_at") -> None:
    # Simple guard: real suites parse AST or use sqlglot if available.
    if not re.search(rf"\\b{re.escape(key)}\\b", sql, flags=re.I):
        raise AssertionError(f"partition key {key} missing from SQL: {sql}")

def partitions_from_explain_json(plan_json: str) -> set[str]:
    data = json.loads(plan_json)
    found: set[str] = set()

    def walk(node: dict) -> None:
        rel = node.get("Relation Name")
        if isinstance(rel, str):
            found.add(rel)
        for child in node.get("Plans") or []:
            walk(child)

    walk(data[0]["Plan"])
    return found
\`\`\`

For Node services tested with SuperTest, open a transaction or use a test-only repository that returns the last SQL. Avoid asserting only HTTP 200: the API can be correct while the warehouse replica burns CPU.

## Realistic failure mode: the off-by-one month and the default partition

**Symptom:** Dashboard p95 jumps after a deploy. Row counts match staging. No error logs. \`pg_stat_user_tables\` shows sequential reads climbing on \`events_default\` and on adjacent months.

**Diagnosis steps:**

1. Capture the slow SQL from \`pg_stat_statements\` or your APM.
2. Run \`EXPLAIN (FORMAT JSON)\` with production-like binds (not \`NULL\`, not full-year ranges).
3. List \`Relation Name\` nodes. If \`events_default\` appears for a query that should be pure February, check whether the app sends end-exclusive vs end-inclusive bounds that spill into March, or whether timestamps land in the default partition because migrations never created March.
4. Check for \`created_at AT TIME ZONE 'UTC'\` on the column side in a new helper.
5. Confirm statistics: \`last_analyze\` stale after a bulk load can produce odd plans; re-\`ANALYZE\` and re-check. If prune still fails after analyze, it is a predicate shape problem, not stats.

**Fix pattern:** restore a closed-open range on the raw column (\`>= start AND < end\`), create missing monthly partitions before the month starts (cron or migration), and add a CI prune case for "last day of month" and "first day of month" binds. Teams that only test mid-month windows miss bound bugs.

**What people get wrong:** treating the default partition as a harmless safety net. It is a **trap for verification**. Data that silently lands in default because a partition was never created will always be scanned when default is included, and some queries that cannot prove exclusion will touch default forever. Your prune tests should usually **forbid** \`events_default\` for happy-path windows, and a separate ops test should assert that default row counts stay near zero.

## EXPLAIN ANALYZE in CI: when to use it and when to refuse

\`EXPLAIN ANALYZE\` executes the query. That is valuable for "did we really touch one partition and return N rows" but dangerous for:

- Unbounded analytics SQL in shared environments.
- Tests that mutate state under READ COMMITTED with side effects.
- Queries that take locks incompatible with parallel CI workers.

Prefer \`EXPLAIN\` (no analyze) for prune membership. Use \`EXPLAIN ANALYZE\` in a **nightly** job with a size-capped replica and statement timeouts:

\`\`\`sql
SET statement_timeout = '5s';

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id
FROM events
WHERE created_at >= TIMESTAMPTZ '2026-02-01'
  AND created_at <  TIMESTAMPTZ '2026-03-01'
  AND tenant_id = '00000000-0000-4000-8000-000000000007';
\`\`\`

Assert on actual rows removed by filters versus planned, and on buffer hits if you track them, but keep partition membership as the primary gate. Buffers are environment-sensitive; partition lists are schema-sensitive.

## CI layout: migrations, freeze data, then prune gate

A reliable pipeline order:

1. Boot Postgres (Testcontainers, service container, or ephemeral schema).
2. Apply migrations including partition DDL.
3. Seed fixed partition-local data; \`ANALYZE\`.
4. Run unit tests.
5. Run **prune verification** suite (fast, plan-only).
6. Run API/integration tests.
7. Optional nightly: \`EXPLAIN ANALYZE\` + larger volumes.

| Stage | Failure meaning | Owner |
| --- | --- | --- |
| Migration apply | DDL broken | platform / backend |
| Seed + analyze | fixture drift | QA tooling |
| Prune suite | predicate or partition map regression | feature team |
| API suite | behavior broken | feature team |
| Nightly analyze | capacity / stats issues | performance |

GitHub Actions sketch (service container). Note shell variable concatenation uses explicit braces so IDs do not glue into one empty expansion:

\`\`\`yaml
jobs:
  db-prune:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_USER: test
          POSTGRES_DB: app_test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: migrate and seed
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/app_test
        run: |
          npm ci
          npm run db:migrate
          npm run db:seed:prune-fixtures
      - name: partition prune tests
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/app_test
          RUN_ID: "\${{ github.run_id }}_\${{ github.run_attempt }}"
        run: npx vitest run src/db/prune --reporter=verbose
\`\`\`

If you inject \`RUN_ID\` into temporary schema names, always write \`\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}\` (or the GitHub equivalents \`\${{ github.run_id }}\` in workflow expressions). Writing \`$CI_PIPELINE_ID_$CI_NODE_INDEX\` in shell is a classic empty-string bug because the shell reads the trailing underscore as part of the name \`CI_PIPELINE_ID_\`, which is unset, so the intended pipeline id disappears.

## Multi-tenant list partitions: budgets and fan-out

For \`PARTITION BY LIST (tenant_id)\` (or a shard key), equality prune is the success case. IN-lists are the gray zone: pruning to 3 tenants is fine; an IN-list of 500 tenants is a product bug wearing a performance costume.

Assertion ideas:

- Single-tenant queries: exactly one child relation (plus none of the others).
- Batch admin queries: \`scanned.length <= max(batchSize, 1)\` and never the full set unless the SQL is explicitly a maintenance job.
- Cross-tenant analytics: expect multi-partition and **route those queries** to a warehouse, not the OLTP primary. A prune test that forces single-partition on analytics will false-fail; tag suites by persona.

\`\`\`typescript
it("single-tenant read touches one list partition", async () => {
  const tenant = "tenant_alpha";
  const { rows } = await pool.query(
    \`
    EXPLAIN (FORMAT JSON)
    SELECT id FROM payments
    WHERE tenant_id = $1 AND created_at >= $2
    \`,
    [tenant, "2026-02-01T00:00:00Z"],
  );
  const root = rows[0]["QUERY PLAN"][0].Plan as PlanNode;
  const scanned = relationNames(root).filter((n) => n.startsWith("payments_"));
  expect(scanned).toEqual(["payments_tenant_alpha"]);
});
\`\`\`

## Join queries and partitionwise joins

Real apps rarely select from one partitioned fact table alone. They join dimensions. Pruning can still apply to the partitioned side when the join condition and filters allow. Failure modes:

- Filter applied only after join, so the fact table is scanned broadly then joined.
- Parameter on the dimension table only (\`WHERE dim.code = $1\`) without a pushable predicate on the fact partition key.
- Disablement of partitionwise join settings in a session that differs from production.

Verification approach: \`EXPLAIN\` the full join as the app emits it, not a simplified single-table rewrite. Assert that fact-side children are limited. If the plan shows a full Append of facts before a hash join to a tiny dimension, file it as a product SQL bug even if the result is correct.

## ORM and query-builder checklists

| Layer | Safe pattern | Unsafe pattern |
| --- | --- | --- |
| Raw SQL | range on column + binds | string-interpolated dates with functions on column |
| Query builder | \`.where('created_at', '>=', start).andWhere('created_at', '<', end)\` | \`.whereRaw('date(created_at) = ?', [day])\` |
| ORM scopes | named scope \`forTenantInRange\` covered by prune test | ad-hoc filters in controllers |
| GraphQL | data loader path reuses repository | resolver builds SQL from field args without key |
| Search hybrid | DB prune then search | search hits all IDs then DB \`IN\` without time key |

Add a repository unit test that freezes the query builder output string (normalized whitespace) and snapshots the SQL shape for critical paths. Snapshots alone are not enough (they do not prove pruning), but combined with \`EXPLAIN\` they catch accidental rewrites early.

## Observability hooks that complement CI

CI proves the shape. Production proves the data distribution did not invent a new default-partition island.

Useful signals (engine-dependent):

- Per-child \`seq_scan\` / \`idx_scan\` ratios in \`pg_stat_user_tables\`.
- \`pg_stat_statements\` mean time for dashboard query fingerprints.
- Application metric: \`db.partitions_estimated\` if you log plan summaries on slow query threshold (sample carefully).
- Alert when default partition row count exceeds an illustrative threshold (for example, more than 0.1% of total rows in a controlled estate; calibrate to your estate, do not copy a number blindly).

Do not alert on a single full-scan plan from an ad-hoc admin query. Alert on **fingerprints** known to be user-facing.

## Putting pruning verification next to isolation and API tests

Partitioned tables often store financial events, audit logs, or multi-tenant facts where isolation bugs and pruning bugs show up together: a long transaction holds locks across more partitions than expected, or a read-your-writes path hits a different partition set than a replica. Keep isolation scenarios in their own suite (same isolation-level playbook you already use for concurrent writers), but share the same fixtures and Testcontainer lifecycle so engineers do not maintain two databases of truth.

When the API is the public surface, a thin SuperTest check can assert business results while the prune suite asserts plans. The HTTP test should not parse \`EXPLAIN\`; keep concerns split. Ready-made QA skills for agent-driven repos can be installed from qaskills.sh with the qaskills CLI when you want a starting harness instead of blank files.

## Checklist you can paste into a PR template

- [ ] New partitioned table has named children for the next N months (or list values), not only DEFAULT.
- [ ] Product queries filter on the partition key without wrapping the column in a non-indexable expression.
- [ ] Bind types match column types (timestamptz vs timestamp vs date).
- [ ] Prune case added or updated for the new SQL fingerprint.
- [ ] Forbidden relations include DEFAULT for happy-path windows.
- [ ] Edge binds: first instant of month, last instant of month, UTC vs app zone.
- [ ] \`ANALYZE\` in fixture setup after seed.
- [ ] Nightly job covers \`EXPLAIN ANALYZE\` only with timeout and row limits.

## Frequently Asked Questions

### Why do functional tests pass when partition pruning is broken?

Because pruning does not change the result set for a correct \`WHERE\` clause. Your assertions on JSON payloads, row counts, and status codes still pass. The failure is operational: more partitions read, more I/O, longer locks, worse cache locality. Only planner-level assertions or production metrics see it. That is why prune verification must be an explicit suite, not an assumption baked into end-to-end tests.

### Should every query in the codebase have a partition pruning test?

No. Cover the fingerprints that are user-facing, high-QPS, or scan large facts: dashboards, tenant exports with time windows, billing period reads, and GDPR erase scans that must stay tenant-local. Skip one-off admin scripts and ad-hoc analytics that intentionally touch many partitions. A small registry of prune cases scales better than a mandate that every repository method needs \`EXPLAIN\`.

### Is EXPLAIN without ANALYZE enough for database testing partition pruning verification?

For plan-time pruning, yes: a plain \`EXPLAIN\` already shows which children survive into the Append and whether indexes are considered. Execution-time pruning is different. When the pruning key is only known at run time (a parameter or a subquery result), you need \`EXPLAIN ANALYZE\` and must read \`loops\` and \`(never executed)\` on each child to see what was actually skipped. Use \`EXPLAIN ANALYZE\` when you must confirm actual rows and buffers, typically in nightly jobs with timeouts. Relying only on wall-clock duration in CI is the weak option; it is noisy and can hide full scans on tiny fixture data.

### How do we test pruning with ORMs that hide SQL?

Capture the SQL at the driver or session event layer during a single test, assert the partition key appears in a sargable form, then run \`EXPLAIN (FORMAT JSON)\` on that text with the same binds. If the ORM cannot emit a sargable predicate, fix the repository (or use a raw query for that path) rather than loosening the prune budget. Snapshots of SQL text help, but the plan assertion remains the source of truth.
`,
};
