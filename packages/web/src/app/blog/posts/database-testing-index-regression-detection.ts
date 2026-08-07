import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Database Testing Index Regression Detection Before Latency Spikes Hit Production',
  description: 'Use database testing index regression detection to baseline EXPLAIN plans, catch missing indexes in migrations, and fail CI when query cost explodes.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Database Testing Index Regression Detection Before Latency Spikes Hit Production

Database testing index regression detection is the practice of treating query access paths as testable contracts: capture the plans and index inventory that critical queries need, re-run those checks on every schema migration and query change, and fail CI when a plan shifts from index scan to sequential scan, when an expected index disappears, or when a new migration introduces duplicate or contradictory indexes without justification.

Row-count assertions and green API tests do not catch this class of defect. An endpoint can return the correct JSON while the database quietly reads millions of rows. The failure shows up later as elevated p95 latency, lock contention, or an on-call page after data volume grows. Index regression detection moves that signal left into pull requests, where EXPLAIN output and catalog diffs are still cheap.

This guide walks through baselining plans for critical query shapes, automating catalog and EXPLAIN comparisons for Postgres and MySQL-style engines, distinguishing planner quirks from true regressions, and connecting database checks to HTTP-level suites such as those covered in the [Supertest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide). For organizing the surrounding unit and integration layers, see the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026).

## What an index regression looks like before users feel it

An index regression is any change that worsens the access path for a production query relative to an agreed baseline. Concrete forms include:

- A migration drops or renames an index that hot queries still need.
- A query rewrite changes predicates so an existing index is no longer applicable.
- Statistics or column type changes cause the planner to prefer a sequential scan at production scale.
- A composite index column order no longer matches the filter and sort pattern.
- A partial or filtered index predicate no longer covers the workload after a business rule change.
- New duplicate indexes inflate write cost without helping reads.

At small local volumes, EXPLAIN may still choose a sequential scan even when an index exists. That is why detection combines three layers: inventory assertions ("index X exists on table Y columns..."), plan shape assertions on realistically seeded volumes, and optional timing budgets on staging-sized data sets.

| Detection layer | Catches | Misses | Typical CI cost |
|---|---|---|---|
| Index inventory diff | Dropped, missing, accidental duplicates | Planner not using a present index | Low |
| EXPLAIN shape baseline | Seq scans, wrong join order signals, missing index conditions | Cost model differences across versions | Medium |
| Seeded volume EXPLAIN ANALYZE | Real row estimates and timing drift | Requires safe non-prod data and longer jobs | Higher |
| API latency smoke | User-visible regressions end to end | Root cause ambiguity, env noise | Medium |

## Inventory critical query shapes, not every SQL string in the repo

Start with a query catalog driven by production evidence: top total time statements from \`pg_stat_statements\`, slow query logs, or APM database spans. For each entry record:

- Stable query id and human name
- Owning service and repository path
- Tables and expected indexes
- Acceptable plan operators (for example index scan or bitmap heap scan allowed, sequential scan forbidden above N estimated rows)
- Parameter placeholders and a representative bind set for EXPLAIN
- Minimum seed volume required for the assertion to be meaningful

\`\`\`ts
export type QueryContract = {
  id: string;
  name: string;
  sql: string;
  params: unknown[];
  relations: string[];
  requiredIndexes: string[];
  forbiddenPlanNodes?: string[];
  maxEstimatedCost?: number;
  minSeedRows?: Record<string, number>;
};

export const checkoutContracts: QueryContract[] = [
  {
    id: 'orders.open_by_customer',
    name: 'Open orders for customer',
    sql: \`
      SELECT id, status, total_cents
      FROM orders
      WHERE customer_id = $1 AND status = $2
      ORDER BY created_at DESC
      LIMIT 20
    \`,
    params: ['00000000-0000-4000-8000-000000000001', 'open'],
    relations: ['orders'],
    requiredIndexes: ['orders_customer_id_status_created_at_idx'],
    forbiddenPlanNodes: ['Seq Scan'],
    maxEstimatedCost: 50,
    minSeedRows: { orders: 20000 },
  },
];
\`\`\`

Do not try to baseline every ORM-generated variant on day one. Ten contracts that protect checkout, auth session lookup, and search will outperform a noisy dump of hundreds of brittle plans.

## Capture EXPLAIN baselines in a repeatable harness

Use the database's EXPLAIN facility in a transaction that rolls back when you only need plans. Prefer JSON format when the engine supports it so tests assert structure instead of parsing ASCII art.

Postgres example using a lightweight Node helper:

\`\`\`ts
import { Client } from 'pg';

export type PlanNode = {
  'Node Type'?: string;
  'Relation Name'?: string;
  'Index Name'?: string;
  'Total Cost'?: number;
  Plans?: PlanNode[];
};

export async function explainPostgres(
  client: Client,
  sql: string,
  params: unknown[],
): Promise<PlanNode> {
  const explainSql = \`EXPLAIN (FORMAT JSON) \${sql}\`;
  const result = await client.query(explainSql, params);
  const wrapper = result.rows[0]['QUERY PLAN'];
  // driver may already parse JSON
  const parsed = typeof wrapper === 'string' ? JSON.parse(wrapper) : wrapper;
  return parsed[0].Plan as PlanNode;
}

export function collectNodeTypes(plan: PlanNode, acc: string[] = []): string[] {
  if (plan['Node Type']) acc.push(plan['Node Type']);
  for (const child of plan.Plans || []) collectNodeTypes(child, acc);
  return acc;
}

export function findSeqScans(plan: PlanNode, out: PlanNode[] = []): PlanNode[] {
  if (plan['Node Type'] === 'Seq Scan') out.push(plan);
  for (const child of plan.Plans || []) findSeqScans(child, out);
  return out;
}
\`\`\`

MySQL and MariaDB expose EXPLAIN in tabular or JSON forms depending on version. Assert on \`access_type\` values such as \`ref\` or \`range\` versus \`ALL\` for full scans when your version returns those fields. Stick to documented EXPLAIN columns for your engine version; do not invent proprietary field names.

\`\`\`ts
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { checkoutContracts } from './contracts';
import { collectNodeTypes, explainPostgres, findSeqScans } from './explain';

describe('orders open_by_customer plan', () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('uses an index and stays under cost budget', async () => {
    const contract = checkoutContracts[0];
    const plan = await explainPostgres(client, contract.sql, contract.params);
    const nodes = collectNodeTypes(plan);
    const seq = findSeqScans(plan).filter((n) => n['Relation Name'] === 'orders');

    expect(seq, JSON.stringify(plan, null, 2)).toHaveLength(0);
    expect(nodes.some((n) => n.includes('Index'))).toBe(true);
    if (contract.maxEstimatedCost !== undefined) {
      expect(plan['Total Cost'] ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
        contract.maxEstimatedCost,
      );
    }
  });
});
\`\`\`

Cost budgets are environment sensitive. Prefer relative checks ("no sequential scan on \`orders\`") as hard gates and treat absolute cost numbers as soft budgets adjusted per engine version.

## Detect missing, unused, and duplicate indexes on migration PRs

Plan assertions protect known queries. Migration review still needs catalog diffs so indexes are not dropped "because nothing in this service referenced them" when another service did.

Query Postgres catalogs for a normalized inventory:

\`\`\`sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
\`\`\`

Normalize definitions by stripping volatile formatting before diffing. Snapshot the inventory in CI for the base branch and the PR branch database after migrations apply.

\`\`\`ts
export type IndexRow = {
  schema: string;
  table: string;
  name: string;
  def: string;
};

export function normalizeIndexDef(def: string): string {
  return def.replace(/\\s+/g, ' ').trim().toLowerCase();
}

export function diffIndexes(base: IndexRow[], head: IndexRow[]) {
  const key = (r: IndexRow) => \`\${r.schema}.\${r.table}.\${r.name}\`;
  const baseMap = new Map(base.map((r) => [key(r), normalizeIndexDef(r.def)]));
  const headMap = new Map(head.map((r) => [key(r), normalizeIndexDef(r.def)]));

  const removed: string[] = [];
  const added: string[] = [];
  const changed: string[] = [];

  for (const [k, def] of baseMap) {
    if (!headMap.has(k)) removed.push(k);
    else if (headMap.get(k) !== def) changed.push(k);
  }
  for (const k of headMap.keys()) {
    if (!baseMap.has(k)) added.push(k);
  }
  return { removed, added, changed };
}
\`\`\`

Policy examples:

- Removing an index listed in any query contract fails CI.
- Removing an index not in any contract requires a PR label such as \`db-index-removal\` and a human checklist.
- Adding a duplicate index on the same columns with the same predicates fails unless justified in migration notes.
- Renames show up as remove+add; detect renames by identical normalized definitions when names differ.

Duplicate detection heuristic:

\`\`\`ts
export function findDuplicateIndexes(rows: IndexRow[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const row of rows) {
    const norm = normalizeIndexDef(row.def).replace(row.name.toLowerCase(), '<name>');
    const list = groups.get(norm) || [];
    list.push(\`\${row.table}.\${row.name}\`);
    groups.set(norm, list);
  }
  return [...groups.values()].filter((g) => g.length > 1);
}
\`\`\`

Unused index detection in production uses statistics such as \`pg_stat_user_indexes\` over a long window. In CI you rarely prove unused safely. Instead, flag brand new indexes that no contract references as "unproven" and require an owner note. Do not auto-drop indexes from CI.

## Seed enough volume that the planner behaves honestly

Empty tables lie. With a handful of rows, a sequential scan is often the correct choice even when a perfect index exists. Your test then cannot distinguish "index missing" from "planner ignored index because the table is tiny."

For each contract, define \`minSeedRows\` and enforce it before EXPLAIN. Use bulk inserts in a migration test database, not production snapshots containing personal data.

\`\`\`ts
export async function ensureSeedVolume(
  client: Client,
  mins: Record<string, number>,
): Promise<void> {
  for (const [table, minimum] of Object.entries(mins)) {
    const countRes = await client.query(\`SELECT COUNT(*)::int AS c FROM \${table}\`);
    const count = countRes.rows[0].c as number;
    if (count >= minimum) continue;
    throw new Error(
      \`table \${table} has \${count} rows; need at least \${minimum} for plan assertions\`,
    );
  }
}
\`\`\`

Better: a seeder that idempotently fills synthetic rows:

\`\`\`sql
INSERT INTO orders (id, customer_id, status, total_cents, created_at)
SELECT
  gen_random_uuid(),
  ('00000000-0000-4000-8000-' || lpad((g % 1000)::text, 12, '0'))::uuid,
  CASE WHEN g % 5 = 0 THEN 'open' ELSE 'closed' END,
  (100 + g % 5000),
  now() - (g || ' minutes')::interval
FROM generate_series(1, 30000) AS g
WHERE (SELECT COUNT(*) FROM orders) < 30000;
\`\`\`

Analyze after seed so statistics match the bulk load:

\`\`\`sql
ANALYZE orders;
\`\`\`

Without ANALYZE, plans may still be wrong after mass inserts in the same session.

## Automate plan comparison across pull requests

Store a checked-in baseline only when necessary. Prefer computing the plan on a database migrated from main and from the PR, then comparing them in the job. Checked-in JSON baselines drift with Postgres minor versions and are noisy.

Comparison algorithm that works in practice:

1. Apply migrations from main to database A; seed; EXPLAIN contracts; store plans.
2. Apply migrations from PR to database B with the same seed script; EXPLAIN contracts.
3. Diff node types for protected relations, required index names, and optional cost ratios.
4. Fail on newly introduced sequential scans for protected relations or missing required indexes.

\`\`\`ts
export type PlanSummary = {
  nodeTypes: string[];
  indexNames: string[];
  seqScanRelations: string[];
  totalCost: number;
};

export function summarize(plan: PlanNode): PlanSummary {
  const nodeTypes: string[] = [];
  const indexNames: string[] = [];
  const seqScanRelations: string[] = [];

  const walk = (n: PlanNode) => {
    if (n['Node Type']) nodeTypes.push(n['Node Type']);
    if (n['Index Name']) indexNames.push(n['Index Name']);
    if (n['Node Type'] === 'Seq Scan' && n['Relation Name']) {
      seqScanRelations.push(n['Relation Name']);
    }
    for (const c of n.Plans || []) walk(c);
  };
  walk(plan);

  return {
    nodeTypes,
    indexNames,
    seqScanRelations,
    totalCost: plan['Total Cost'] ?? 0,
  };
}

export function regress(
  base: PlanSummary,
  head: PlanSummary,
  protectedRelations: string[],
): string[] {
  const problems: string[] = [];
  for (const rel of protectedRelations) {
    const baseHadSeq = base.seqScanRelations.includes(rel);
    const headHasSeq = head.seqScanRelations.includes(rel);
    if (!baseHadSeq && headHasSeq) {
      problems.push(\`introduced Seq Scan on \${rel}\`);
    }
  }
  if (base.totalCost > 0 && head.totalCost / base.totalCost > 5) {
    problems.push(
      \`estimated cost grew from \${base.totalCost} to \${head.totalCost}\`,
    );
  }
  return problems;
}
\`\`\`

Five-times cost growth is a heuristic, not a universal law. Tune per query after observing noise. Some teams only fail on operator shape changes and report cost growth as a warning annotation on the PR.

## Failure mode: index exists but the planner ignores it

A painful on-call pattern: \`\\d orders\` shows the index, the migration looks correct, yet EXPLAIN still chooses a sequential scan at production scale. Common causes:

1. **Predicate mismatch.** The query wraps the column in a function (\`WHERE lower(email) = $1\`) but the index is on raw \`email\`.
2. **Type mismatch.** The parameter is text while the column is uuid, preventing index use.
3. **Composite order.** Index is \`(status, customer_id)\` but the query filters only \`customer_id\`.
4. **Partial index miss.** Index is \`WHERE status = 'open'\` but the query uses a bind for status or a different status set.
5. **Stale statistics.** ANALYZE has not run after a bulk import.
6. **Low selectivity.** The planner believes the filter returns most rows; sequential scan is cheaper.
7. **OR conditions across columns** that cannot each use the same index efficiently.

Diagnosis workflow:

\`\`\`sql
EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS)
SELECT id, status, total_cents
FROM orders
WHERE customer_id = '00000000-0000-4000-8000-000000000001'
  AND status = 'open'
ORDER BY created_at DESC
LIMIT 20;
\`\`\`

Compare estimated rows versus actual rows. If estimates are wildly low or high, fix statistics targets or rewrite the query before adding more indexes. If the index condition is absent from the plan, fix the predicate or index definition.

Regression tests should assert not only "no seq scan" but also that the expected index name appears when your engine exposes it. That catches the case where some other accidental index is used while the intended one is dead weight.

## What teams get wrong when they only assert row counts

API tests that insert three orders and assert \`expect(body).toHaveLength(3)\` prove filtering logic at toy scale. They never prove the access path. Engineers then "optimize" by dropping unused-looking indexes based on local development databases, and production degrades.

Another mistake is snapshotting full EXPLAIN ANALYZE text and expecting exact string matches. Volatile costs, workers, and parallel query settings create perpetual diffs. Summarize to stable fields: node types, relation names, index names, and filtered flags.

A third mistake is running plan tests only against SQLite in unit tests while production is Postgres. SQLite index behavior and planner choices differ. Run database testing index regression detection against the same engine family you ship, ideally the same major version.

## Connect index regressions to API latency suites

Database contracts are necessary but not always sufficient. An ORM might emit a different query than the one you baselined. Bridge the layers:

1. For critical endpoints, enable database query logging in test and assert that the expected SQL shape is issued N times (catching N+1 as well).
2. Keep a small Supertest or similar HTTP suite that runs against a seeded API with volume data and budgets response time generously enough to avoid flakes but tightly enough to catch multi-second regressions.
3. When the HTTP budget fails, dump the EXPLAIN of the contract queries in the same job for triage.

\`\`\`ts
import request from 'supertest';
import { app } from '../src/app';

describe('GET /customers/:id/orders latency smoke', () => {
  it('responds within budget on seeded volume', async () => {
    const started = Date.now();
    const res = await request(app)
      .get('/customers/00000000-0000-4000-8000-000000000001/orders')
      .set('Authorization', \`Bearer \${process.env.TEST_TOKEN}\`)
      .expect(200);
    const elapsed = Date.now() - started;
    expect(Array.isArray(res.body)).toBe(true);
    expect(elapsed).toBeLessThan(500);
  });
});
\`\`\`

Latency smoke tests are not replacements for EXPLAIN contracts; they are a backstop when query generation drifts.

## CI layout for migration pull requests

Suggested pipeline stages:

| Stage | Purpose | Blocks merge |
|---|---|---|
| migrate | Apply PR migrations to ephemeral DB | Yes on failure |
| seed-volume | Load synthetic rows + ANALYZE | Yes |
| index-inventory | Diff catalogs vs main | Yes on protected removals |
| explain-contracts | Run query contract suite | Yes on shape regression |
| api-smoke | HTTP budgets on critical routes | Yes if stable in your env |
| report | Upload plan JSON artifacts | No |

\`\`\`yaml
# .github/workflows/db-index-regression.yml
name: db-index-regression
on:
  pull_request:
    paths:
      - 'migrations/**'
      - 'db/**'
      - 'src/**/*.sql'
      - 'tests/db/**'

jobs:
  plans:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: app_test
        ports:
          - 5432:5432
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
      - run: npm run db:seed:volume
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/app_test
      - run: npm run test:db:indexes
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/app_test
\`\`\`

Path filters keep the job focused, but remember that pure query rewrites in application code without migration changes can also regress plans. Either also trigger on DAO/repository paths or run a subset of contracts in the main test workflow.

## ORM and query builder specifics without overclaiming APIs

Whether you use raw SQL, a query builder, or an ORM, the contract should assert the SQL that actually reaches the database. Many ORMs can log or explain statements through hooks or database proxies. If you cannot intercept reliably, maintain dual forms: the repository method under test and a parallel SQL string used only for EXPLAIN that is code-reviewed against the repository implementation.

Avoid asserting internal ORM plan caches or undocumented hint APIs. When you need to force index usage in production, use documented engine mechanisms appropriate to your database and treat that as a smell: forced indexes often hide selectivity or statistics problems.

## Partial indexes, JSON fields, and expression indexes

Modern schemas use partial indexes for hot states, GIN indexes for JSON documents, and expression indexes for normalized columns. Extend contracts with notes about these forms:

| Index style | Contract extra assertion | Common regression |
|---|---|---|
| B-tree composite | Index name present; no seq scan | Wrong column order after query change |
| Partial | Query predicates still match partial condition | Status enum expanded, partial predicate stale |
| Expression | Query uses same expression as index | App stops lowercasing before compare |
| GIN/JSONB | Operators remain indexable (documented engine ops) | Switched to non-indexable filter pattern |

Add specialized seeds that match partial predicates. A partial index on open orders does not help a suite that only seeds closed orders.

## Write amplification and too many indexes

Index regression is not only about missing indexes. Every extra index slows writes and bloats storage. Detection should flag when a table accumulates many overlapping indexes. A simple CI heuristic: fail review if a table gains a second index whose leading columns are identical to an existing one without an explicit allowlist entry.

Document write-path tables (for example high-volume event ingestion) with a maximum index count in the contract file. Read-heavy dimension tables can afford more.

## Operational rollout plan

Week 1: identify top ten queries by total time; write contracts; run EXPLAIN manually; fix any existing seq scan surprises.

Week 2: seed volume script; automated contract tests on PR migrations; index inventory diff.

Week 3: wire API latency smokes; publish plan artifacts; teach the team how to read failures.

Week 4: add duplicate index heuristics; set ownership for each contract; review false positives and tune cost ratios.

Ready-made QA skills install from qaskills.sh with the qaskills CLI if you want scaffolding for catalog diffs and contract runners, but the query list must come from your production telemetry.

## Interpreting a red plan job without blaming the messenger

When CI fails with \`introduced Seq Scan on orders\`, engineers sometimes "fix" the test by raising thresholds. Prefer this response order:

1. Read the uploaded plan JSON for both base and head.
2. Confirm seed volumes and ANALYZE ran.
3. Check whether the SQL text changed.
4. Check whether an index was dropped or altered.
5. Reproduce locally with the same Postgres major version.
6. Only then adjust the contract if the new plan is intentionally better at production scale (rare for new sequential scans on large tables).

If the new plan is a better join strategy with higher estimated cost but lower actual time on ANALYZE, consider switching that contract to EXPLAIN ANALYZE budgets on a nightly job instead of hard cost ceilings on every PR.

## Frequently Asked Questions

### How much data do I need for database testing index regression detection to be trustworthy?

Enough that the planner prefers an index when the index is present for your protected predicates. For many multi-tenant SaaS tables that means tens of thousands of rows with realistic skew, not millions, in CI. The exact number is empirical: seed until a known good index is used, then keep a margin. Production-scale timing belongs in staging benchmarks; CI needs stable shape detection more than perfect millisecond parity.

### Should I commit EXPLAIN JSON files into git as golden snapshots?

Only if you control engine version tightly and summarize to stable fields. Full EXPLAIN output is often too volatile across minor versions, settings, and statistics. Computing base versus head plans inside CI on ephemeral databases reduces spurious diffs. If you do commit snapshots, store summarized node types and index names, not raw cost fields alone.

### Can I rely on ORM schema synchronization instead of migrations for these tests?

You need a schema that matches production intent. If your team already uses versioned migrations for production, apply those same migrations in the index regression job. ORM sync shortcuts can drift from production DDL, including index names and partial predicates, which undermines the entire suite. Align the test database creation path with the production path as closely as practical.

### How do I stop developers from deleting failing plan tests to ship?

Make failures actionable with artifacts and clear messages, keep the protected query list small and business-critical, and require a documented exception process for intentional plan changes. Pair ownership of each contract with the service team that owns the data. When plan tests are noisy or unowned, deletion becomes the path of least resistance. When they cleanly point to a missing index on checkout, teams keep them.
`,
};
