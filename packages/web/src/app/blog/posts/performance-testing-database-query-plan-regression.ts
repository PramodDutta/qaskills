import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Performance Testing Database Query Plan Regression in CI and Production',
  description: 'Build performance testing database query plan regression checks that catch scan, join, estimate, memory, and latency failures before releases reach production.',
  date: '2026-08-08',
  category: 'Performance',
  content: `
# Performance Testing Database Query Plan Regression in CI and Production

Performance testing database query plan regression means detecting when the optimizer chooses a materially worse execution strategy for an important query. The practical method is to capture machine-readable plans under representative schema, statistics, parameters, and data distribution, then assert a small set of risk-based invariants. Pair those structural checks with measured execution and service-level load tests. A plan change is evidence to investigate, not automatically a defect.

For PostgreSQL, use \`EXPLAIN (FORMAT JSON)\` for inexpensive structural checks and \`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)\` in a controlled database when real execution evidence is needed. Track scan and join nodes, estimated versus actual rows, buffer reads, temporary I/O, sort behavior, loops, planning time, and execution time. Never compare raw plan JSON byte for byte: costs and identifiers can change while performance remains healthy.

The workflow below gives QA and test-automation engineers runnable SQL and TypeScript patterns. It focuses on reproducibility, safe baselines, diagnosis, and CI signals that remain useful as data grows.

## Understand what a plan regression actually is

The database optimizer estimates the cost of candidate strategies and chooses one. A regression occurs when the selected strategy causes unacceptable resource use or latency for the workload that matters. The plan can change because application SQL, indexes, schema, statistics, configuration, PostgreSQL upgrades, parameter values, or data distribution changed.

| Change source | Example | Plan consequence | Test fixture requirement |
|---|---|---|---|
| Query text | Added expression around indexed column | Index condition no longer usable | Exercise exact generated SQL |
| Schema | Composite index reordered | Extra filter or sort work | Apply production migrations |
| Statistics | Skew not represented well | Severe row-estimate error | Analyze representative data |
| Parameters | Rare value becomes common value | One cached plan fits poorly | Test parameter classes |
| Data growth | Table crosses cost threshold | Scan choice changes | Scale-aware dataset |
| Configuration | Work memory reduced | Sort or hash spills | Record server settings |
| Database upgrade | Planner behavior changes | Different join order | Replay critical query set |

Do not define regression as "the plan differs from yesterday." An optimizer is allowed to find a better plan. Conversely, an identical-looking plan can slow down because it processes far more rows or spills to disk. The oracle should connect structure and observed cost to a service objective.

Use three layers:

1. Static plan checks catch obviously dangerous shapes without executing the query.
2. Controlled execution checks expose actual rows, loops, buffers, spills, and duration.
3. End-to-end load tests reveal pooling, contention, caching, serialization, and application overhead.

Each layer answers a different question. Keeping them separate makes failures actionable.

## Choose queries from workload evidence

Start with queries that dominate user latency, database time, I/O, or incident history. A convenient query that runs once per day may matter less than a slightly slower statement executed thousands of times. Use production-safe observability, slow-query logs, application traces, or PostgreSQL's statement statistics facilities according to your operational policy.

Build a catalog with stable query IDs. Normalize only for grouping; retain executable SQL and parameter classes in protected fixtures.

| Catalog field | Example | Why it matters |
|---|---|---|
| Query ID | \`orders-by-account-page\` | Stable CI and dashboard key |
| Owning feature | Account order history | Routes failure to the right team |
| Parameter class | Large account, first page | Captures selectivity |
| Expected rows | 50 maximum | Defines business result size |
| Risk invariant | No unbounded sequential scan on orders | Fast structural gate |
| Execution budget | Environment-calibrated threshold | Detects measured slowdown |
| Dataset profile | Skewed, 2 percent large accounts | Makes result reproducible |

Numbers in a fixture should describe the test environment and be marked illustrative when presented as examples. There is no universal rule that a sequential scan over a particular number of rows is bad. Sequential scans are efficient when much of a table is needed. The problem is an access path that conflicts with the query's expected selectivity and latency goal.

## Create representative data distribution

Uniform random data hides many planner failures. Production often has a few large tenants, many small tenants, correlated columns, recent-data hotspots, soft deletion, and status skew. Create deterministic data that represents those shapes without copying sensitive production records.

This schema supports an account order-history query:

\`\`\`sql
CREATE TABLE accounts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL
);

CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  account_id bigint NOT NULL REFERENCES accounts(id),
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  total_cents integer NOT NULL CHECK (total_cents >= 0)
);

CREATE INDEX orders_account_created_idx
  ON orders (account_id, created_at DESC, id DESC);
\`\`\`

Populate the database with a deterministic series. The counts below are illustrative fixture sizes, not performance recommendations. Account 1 is deliberately much larger than the rest so tests can exercise different selectivity classes.

\`\`\`sql
INSERT INTO accounts (name)
SELECT 'account-' || value
FROM generate_series(1, 1000) AS value;

INSERT INTO orders (account_id, status, created_at, total_cents)
SELECT
  CASE WHEN value <= 50000 THEN 1 ELSE 2 + (value % 999) END,
  CASE WHEN value % 10 = 0 THEN 'cancelled' ELSE 'paid' END,
  TIMESTAMPTZ '2032-01-01 00:00:00+00' - (value || ' seconds')::interval,
  1000 + (value % 25000)::integer
FROM generate_series(1, 100000) AS value;

ANALYZE accounts;
ANALYZE orders;
\`\`\`

The explicit \`ANALYZE\` is essential. A schema populated moments ago may have missing or unrepresentative statistics, so the test would measure bootstrap behavior rather than the release database's likely choice. Keep data generation and migration scripts versioned with the query catalog.

For larger realism, generate profiles outside the main test transaction and reuse a versioned database snapshot. Verify its schema migration, row counts, selected distributions, and statistics age before each run. A stale fixture that everyone trusts is more dangerous than a small fixture whose limits are visible.

## Capture PostgreSQL plans as JSON

The target query uses keyset pagination, limiting results for one account without a global offset:

\`\`\`sql
SELECT id, status, created_at, total_cents
FROM orders
WHERE account_id = $1
  AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT 50;
\`\`\`

For a non-executing structural plan, substitute typed literals in a test-only statement or prepare the statement and explain its execution form. The simplest reproducible capture in \`psql\` is:

\`\`\`sql
EXPLAIN (FORMAT JSON)
SELECT id, status, created_at, total_cents
FROM orders
WHERE account_id = 1
  AND (created_at, id) < (TIMESTAMPTZ '2032-01-01 00:00:00+00', 9223372036854775807)
ORDER BY created_at DESC, id DESC
LIMIT 50;
\`\`\`

PostgreSQL returns a JSON array containing a plan object. Node properties such as \`Node Type\`, \`Relation Name\`, \`Plan Rows\`, and child \`Plans\` are documented outputs, but fields vary by node and by whether analysis options are enabled. Write traversal code that treats optional fields as optional.

Execution plans require greater care:

\`\`\`sql
BEGIN;

EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT id, status, created_at, total_cents
FROM orders
WHERE account_id = 1
  AND (created_at, id) < (TIMESTAMPTZ '2032-01-01 00:00:00+00', 9223372036854775807)
ORDER BY created_at DESC, id DESC
LIMIT 50;

ROLLBACK;
\`\`\`

\`ANALYZE\` executes the statement. A SELECT is safe relative to data mutation, but functions and triggers in other statement types can have side effects. For UPDATE, DELETE, or INSERT plans, use an isolated database and a transaction where rollback actually contains all effects. External calls and sequence advancement may not be undone as expected. Never run arbitrary analyzed statements against production as part of CI.

## Traverse plan nodes without snapshot brittleness

A recursive TypeScript walker can collect nodes from the JSON structure. This example defines only the fields it reads and preserves unknown properties.

\`\`\`ts
export type PlanNode = {
  'Node Type': string;
  'Relation Name'?: string;
  'Index Name'?: string;
  'Plan Rows'?: number;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  'Shared Read Blocks'?: number;
  'Shared Hit Blocks'?: number;
  'Temp Read Blocks'?: number;
  'Temp Written Blocks'?: number;
  Plans?: PlanNode[];
  [key: string]: unknown;
};

export function flattenPlan(root: PlanNode): PlanNode[] {
  const result: PlanNode[] = [];
  const visit = (node: PlanNode): void => {
    result.push(node);
    for (const child of node.Plans ?? []) visit(child);
  };
  visit(root);
  return result;
}

export function findNodes(root: PlanNode, nodeType: string): PlanNode[] {
  return flattenPlan(root).filter((node) => node['Node Type'] === nodeType);
}
\`\`\`

Do not strip all detail into a single fingerprint. Keep the original plan artifact for diagnosis. The compact representation is only for comparisons and dashboards.

A stable summary might include node type, relation, index, estimated row bucket, and selected runtime counters. Exclude total cost from hard equality because it depends on statistics and cost configuration. Store the database version and relevant settings with the artifact so changes can be interpreted.

## Assert structural invariants tied to the query

The order-history query is selective, ordered, and limited. A reasonable invariant for the representative dataset is that the plan uses \`orders_account_created_idx\` and does not sequentially scan \`orders\`. That is a query-specific decision, not a global ban on sequential scans.

\`\`\`ts
import { expect, test } from 'vitest';
import type { PlanNode } from './plan-tree';
import { flattenPlan } from './plan-tree';
import { loadPlanFixture } from './plan-fixture';

test('order history keeps its selective access path', async () => {
  const root: PlanNode = await loadPlanFixture('orders-by-account-page');
  const nodes = flattenPlan(root);

  const scansOrdersSequentially = nodes.some(
    (node) => node['Node Type'] === 'Seq Scan' && node['Relation Name'] === 'orders',
  );
  const usesExpectedIndex = nodes.some(
    (node) => node['Index Name'] === 'orders_account_created_idx',
  );

  expect(scansOrdersSequentially).toBe(false);
  expect(usesExpectedIndex).toBe(true);
});
\`\`\`

\`loadPlanFixture\` should be an adapter that runs EXPLAIN against the isolated test database and returns the root \`Plan\` object. Keep database transport separate from assertions so tests can also evaluate captured incident plans.

Other valuable query-specific invariants include:

- A tenant filter appears in an index condition rather than only as a late filter.
- A join does not create an illustrative million-row intermediate result when the final output is small.
- A bounded query retains its limit near the top of the plan.
- A known memory-sensitive sort does not write temporary blocks in the calibrated environment.
- Partitioned queries prune irrelevant partitions.
- A lookup does not loop an expensive inner node once per unexpectedly large outer row.

Avoid asserting an exact join algorithm unless the workload makes alternatives demonstrably unsafe. Nested loop, hash join, and merge join can each be correct. Assert the bad consequence, such as excessive loop multiplication or processed rows, whenever possible.

## Compare estimated and actual cardinality

Cardinality estimates drive plan choice. A plan may currently be fast but fragile because the optimizer expects one row and receives one hundred thousand. Estimate error is multiplicative, so use a ratio that handles zero carefully.

\`\`\`ts
import type { PlanNode } from './plan-tree';

export function cardinalityError(node: PlanNode): number | null {
  const estimated = node['Plan Rows'];
  const actual = node['Actual Rows'];
  const loops = node['Actual Loops'] ?? 1;

  if (estimated === undefined || actual === undefined) return null;
  const totalActual = actual * loops;
  if (estimated === 0 && totalActual === 0) return 1;
  if (estimated === 0 || totalActual === 0) return Number.POSITIVE_INFINITY;
  return Math.max(estimated / totalActual, totalActual / estimated);
}

export function worstEstimate(root: PlanNode): { node: PlanNode; ratio: number } | null {
  const stack = [root];
  let worst: { node: PlanNode; ratio: number } | null = null;

  while (stack.length > 0) {
    const node = stack.pop() as PlanNode;
    const ratio = cardinalityError(node);
    if (ratio !== null && (!worst || ratio > worst.ratio)) worst = { node, ratio };
    stack.push(...(node.Plans ?? []));
  }
  return worst;
}
\`\`\`

Interpret \`Actual Rows\` with \`Actual Loops\`. PostgreSQL reports per-loop averages for plan nodes, so multiplying by loops gives a more useful total row-work indicator for many diagnostics. Still retain raw fields because parallel execution and node semantics can require careful interpretation.

Do not set one universal ratio threshold across all nodes. A large ratio on an estimate near zero may have little effect, while a moderate error high in a large join can be devastating. Combine ratio, total actual rows, node position, and observed time. Treat a sudden increase from the query's calibrated baseline as a triage signal.

## Detect sorting, hashing, and temporary I/O problems

Plans become slow when work exceeds memory and spills to temporary storage, or when a query performs an avoidable large sort. With \`BUFFERS\`, inspect temporary read and written blocks where available. Sort nodes may also expose method and space fields in analyzed output.

| Symptom | Plan evidence | Likely investigation |
|---|---|---|
| Sort spill | External sort method or temp block I/O | Row volume, ordering index, memory setting |
| Hash batching | Multiple batches or temp I/O | Estimate error, memory, join size |
| Repeated inner work | High loops on costly child | Join order, index, correlated subquery |
| Late filtering | Many rows removed after scan | Predicate and index condition |
| Excess heap reads | Large shared reads for small result | Covering/access path and cache state |

Warm and cold cache runs answer different questions. A warm run emphasizes CPU and logical work after pages are cached. A cold run is difficult to reproduce safely on shared infrastructure and should not be simulated by disrupting a host cache used by other workloads. Use isolated infrastructure or interpret shared reads from a controlled freshly restored database.

Run multiple measured executions and report distributions rather than declaring victory from one duration. The first run can include connection establishment, plan compilation, filesystem cache misses, and JIT decisions depending on configuration. Separate those costs when the application experiences them differently.

## Calibrate duration checks instead of hard-coding folklore

CI machines vary. A fixed 20 ms threshold copied from a laptop is likely to flicker or become so loose that it never catches anything. Establish a dedicated performance environment or calibrate against stable reference queries. Compare candidate and baseline under the same resource class and database snapshot.

A paired test sequence can alternate baseline and candidate query forms to reduce time drift. Record several samples, discard only warm-up samples according to a declared rule, and compare medians and upper percentiles. All example thresholds should be justified from measurement and product objectives.

Structural checks can remain strict in ordinary CI because they are less sensitive to host speed. Run execution budgets on a controlled lane. If that lane is unavailable, publish plan artifacts and flag review rather than pretending noisy timing is precise.

The following shell commands capture environment evidence using documented PostgreSQL utilities:

\`\`\`bash
psql "\${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -c "SELECT version();"
psql "\${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -c "SHOW work_mem;"
psql "\${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -c "SHOW random_page_cost;"
psql "\${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -f testdata/orders.sql
psql "\${DATABASE_URL}" -X -v ON_ERROR_STOP=1 -f plans/orders-by-account-page.sql > plan.json
\`\`\`

The braced variable form protects the variable boundary. The command fails on SQL errors and avoids user startup files through \`-X\`, improving reproducibility. Protect connection strings in CI logs and artifact metadata.

## Correlate plan checks with end-to-end load

A good query plan can still produce poor API latency because of connection-pool queues, lock contention, application serialization, or repeated queries. Conversely, an API test can show a slowdown without identifying the database cause. Run both and correlate by query ID or trace attributes.

A small k6 scenario can exercise the order-history endpoint. Threshold values below are illustrative and must be replaced with service objectives for the test environment.

\`\`\`js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const baseUrl = __ENV.BASE_URL;
  if (!baseUrl) throw new Error('BASE_URL is required');

  const response = http.get(\`\${baseUrl}/accounts/1/orders?limit=50\`);
  check(response, {
    'status is 200': (result) => result.status === 200,
    'has orders array': (result) => Array.isArray(result.json('orders')),
  });
}
\`\`\`

The [k6 versus JMeter guide](/blog/k6-vs-jmeter-2026) can help choose the load driver that fits the team's workflow. Tool choice does not change the database discipline: control data shape, record query plans, and avoid mixing unrelated workload changes into a plan comparison.

Average or p95 endpoint latency may stay acceptable while a small population suffers. The [p99 tail latency analysis guide](/blog/performance-testing-p99-tail-latency-analysis) explains how to investigate the slow tail. Parameter classes matter here: a few very large accounts can dominate p99 even when typical accounts are fast.

## Diagnose a sudden sequential scan regression

Suppose the order-history endpoint's p99 rises after a harmless-looking refactor. EXPLAIN shows a sequential scan and sort instead of the composite index. The SQL changed from \`account_id = $1\` to \`account_id::text = $1\` because a request parameter remained a string and an ORM generated a cast on the column.

Start with evidence. Capture exact SQL and bind types from the application, not a manually rewritten query. Compare candidate and prior plans against the same snapshot. Check whether the expected index exists and is valid. Inspect predicate expressions and casts. Verify statistics were analyzed. Run representative small and large account parameters. Then measure buffers and actual rows in isolation.

The cast on the indexed column can prevent the original integer index condition from matching. Fix parameter typing so the comparison remains on compatible types, then add a regression assertion that the order-history query has an index condition on the intended access path. Also retain the API load scenario because a future regression may arise from N+1 queries without changing this plan.

Another common failure looks like a missing index but is really a data-fixture defect. If the CI table has only twenty rows, a sequential scan may be rational. Adding a hard "no Seq Scan" assertion produces a false failure. Seed a representative scale and skew first, then justify the invariant for that dataset.

## What people get wrong about plan regression testing

The most common error is snapshotting the complete EXPLAIN text. Formatting, cost estimates, generated identifiers, worker details, and harmless plan alternatives create noisy diffs. Engineers learn to approve updates without investigation. Keep the full artifact for diagnosis, but assert risk-bearing properties.

Another mistake is forcing a preferred plan by disabling planner strategies in the test session. That proves PostgreSQL can use the desired node, not that it will choose it under production settings. Planner switches can help diagnosis, but they should not define the passing condition unless production deliberately uses the same configuration.

Teams also benchmark empty or uniformly random tables. The optimizer problem emerges from scale, skew, correlation, and parameter selectivity. Finally, a faster single execution is not proof of a better release. Cache state and noise can dominate. Compare distributions in a controlled environment and retain structural evidence.

## Build the CI gate and review workflow

Split the gate by cost and confidence. On every migration or critical-query change, restore or generate the fixture, run \`ANALYZE\`, capture static JSON plans, and evaluate structural invariants. On a controlled performance lane, execute analyzed plans and load scenarios. On database upgrades, replay the full critical catalog.

| Gate result | Automated action | Reviewer evidence |
|---|---|---|
| Invariant satisfied, timing stable | Pass | Summary and artifact link |
| Plan changed, no risk invariant failed | Pass with review signal | Old and new tree summary |
| Estimate or I/O warning | Investigate | Actual rows, loops, buffers |
| Structural invariant failed | Block | Exact query, parameters, schema |
| Unsafe execution context | Do not run | Environment validation failure |

Store baseline artifacts with the schema, fixture, query, parameter class, PostgreSQL version, and selected settings. A baseline update should explain why the new behavior is acceptable. Never refresh baselines automatically after a failure, because that erases the signal the gate exists to preserve.

AI coding agents can help write plan walkers and propose query-specific invariants when given real plan JSON, schema, parameter classes, and the service objective. Ask the agent to cite the exact plan fields behind every conclusion. Review advice that blindly bans sequential scans, mandates one join type, or invents fixed performance thresholds. Database optimization is contextual.

A mature regression suite does not freeze the optimizer. It makes meaningful change visible, connects that change to measured user impact, and preserves enough evidence for a fast explanation. That is the difference between a brittle snapshot test and an operational performance control.

## Frequently Asked Questions

### Should CI fail whenever a PostgreSQL plan changes?

No. Optimizers may choose an equivalent or better plan after data, statistics, configuration, or database changes. Fail on query-specific risk invariants or a measured regression under controlled conditions. Preserve the full old and new plans for review, but compare stable properties such as access paths, processed rows, loops, estimate error, and temporary I/O. An unexplained plan change can create a review signal without automatically blocking every release.

### Is EXPLAIN ANALYZE safe to run on any query?

No. \`EXPLAIN ANALYZE\` executes the statement. Use an isolated test database for data-changing queries and wrap work in a transaction only when rollback contains all effects. External calls, some sequence effects, and nontransactional behavior may escape the rollback. Even SELECT statements can invoke functions with side effects. Validate the query catalog and target environment before running analyzed plans, and never point an automated CI performance job at production by accident.

### How large should the performance fixture be?

Large enough to reproduce the optimizer choices and data distributions relevant to the query, but no larger than necessary for repeatable feedback. Model tenant skew, status distribution, temporal hotspots, column correlation, and parameter classes, not just total row count. Mark fixture counts as environment-specific, analyze the populated tables, and verify the profile before testing. For expensive workloads, use a versioned sanitized snapshot in a dedicated performance lane and a smaller shape-preserving fixture in pull requests.

### Which plan fields belong in a regression assertion?

Choose fields connected to a known risk: node and relation type, index name, estimated and actual rows, loops, rows removed by filters, shared reads, temporary reads and writes, sort behavior, and execution time. Treat fields as optional because node types and EXPLAIN options differ. Avoid exact full-plan equality and universal rules about join or scan types. Keep query text, bind classes, database version, schema, fixture profile, and relevant settings beside every captured artifact.
`,
};
