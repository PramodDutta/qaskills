import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Load Testing Platform Data Model: Schema Design for k6, Gatling, and JMeter Results',
  description:
    'A normalized load testing platform data model: the seven core entities, the schema that stores k6, Gatling, and JMeter results together, and the indexes that keep queries fast.',
  date: '2026-08-23',
  category: 'Performance',
  content: `
# Load Testing Platform Data Model: Schema Design for k6, Gatling, and JMeter Results

A load testing platform needs seven core entities: **project, scenario, scenario_version, run, run_metric, sample_rollup, and threshold_result**. The critical design decision is that you never store raw per-request samples in the same table you query for dashboards. Raw samples land in an append-only, time-partitioned table (or object storage), and every read path goes through pre-aggregated rollups keyed by (run_id, endpoint, window).

The second decision that matters: k6, Gatling, and JMeter disagree about almost everything except "a request happened, it took N milliseconds, and it either passed or failed." Model that intersection as your canonical schema and push every tool-specific field into a JSON column. Teams that try to model the union of all three tools end up with sixty nullable columns and no working queries.

This guide gives you the entity list, the DDL, the ingestion mapping for all three tools, and the indexes that keep p95 queries under a second when a single run produces twenty million samples.

## The seven entities and what each one owns

| Entity | Grain | Why it exists |
|---|---|---|
| \`project\` | One per system under test | Ownership, retention policy, access control |
| \`scenario\` | One per named test (checkout, search) | Stable identity across script rewrites |
| \`scenario_version\` | One per script content hash | Comparing runs is only valid within a version |
| \`run\` | One execution | Environment, tool, git SHA, start and end |
| \`run_metric\` | One per (run, metric, endpoint) | The summary numbers dashboards read |
| \`sample_rollup\` | One per (run, endpoint, time bucket) | Time series without touching raw samples |
| \`threshold_result\` | One per (run, threshold expression) | Pass or fail, and by how much |

The entity most teams miss is \`scenario_version\`. Without it, a chart comparing this week's p95 to last quarter's silently compares two different scripts. Hash the script file plus its data files, store the hash, and refuse to draw a trend line across versions without an explicit override.

## Core DDL

Postgres syntax; the shape ports to any relational store.

\`\`\`sql
CREATE TABLE project (
  id            BIGSERIAL PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  retention_days INT NOT NULL DEFAULT 90,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scenario (
  id          BIGSERIAL PRIMARY KEY,
  project_id  BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,
  UNIQUE (project_id, slug)
);

CREATE TABLE scenario_version (
  id           BIGSERIAL PRIMARY KEY,
  scenario_id  BIGINT NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
  script_sha   TEXT NOT NULL,
  tool         TEXT NOT NULL CHECK (tool IN ('k6','gatling','jmeter')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scenario_id, script_sha)
);
\`\`\`

The \`tool\` CHECK constraint lives on the version, not the run, because a scenario rewritten from JMeter to k6 is a new version by definition. That models the migration honestly instead of pretending the numbers are continuous.

\`\`\`sql
CREATE TABLE run (
  id                  BIGSERIAL PRIMARY KEY,
  scenario_version_id BIGINT NOT NULL REFERENCES scenario_version(id),
  environment         TEXT NOT NULL,
  git_sha             TEXT,
  ci_run_url          TEXT,
  started_at          TIMESTAMPTZ NOT NULL,
  ended_at            TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running','passed','failed','aborted','errored')),
  vus_peak            INT,
  tool_meta           JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX run_scenario_started_idx
  ON run (scenario_version_id, started_at DESC);
CREATE INDEX run_env_started_idx
  ON run (environment, started_at DESC);
\`\`\`

\`tool_meta\` is where tool-specific configuration goes: k6 executor options, Gatling injection profile, JMeter thread group settings. Query it with the JSONB operators when you need it, and never add a column for a field only one tool emits.

## The canonical metric table

\`\`\`sql
CREATE TABLE run_metric (
  run_id       BIGINT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL,
  metric       TEXT NOT NULL,
  count        BIGINT NOT NULL,
  error_count  BIGINT NOT NULL DEFAULT 0,
  min_ms       DOUBLE PRECISION,
  mean_ms      DOUBLE PRECISION,
  p50_ms       DOUBLE PRECISION,
  p90_ms       DOUBLE PRECISION,
  p95_ms       DOUBLE PRECISION,
  p99_ms       DOUBLE PRECISION,
  max_ms       DOUBLE PRECISION,
  PRIMARY KEY (run_id, endpoint, metric)
);
\`\`\`

Two things people get wrong here.

**Percentiles are not averageable.** You cannot store p95 per endpoint and then average across endpoints to get a run-level p95. If you need a run-level percentile, either compute it during ingestion from the full sample set or store a mergeable sketch (t-digest or HDR histogram) in a \`BYTEA\` column and merge those. Averaging percentiles is the single most common correctness bug in load testing dashboards.

**\`endpoint\` must be a template, not a URL.** Store \`/orders/{id}\`, never \`/orders/84213\`. If you store raw URLs, cardinality explodes and every group-by melts. All three tools support naming requests; use it.

## Time series without the raw samples

\`\`\`sql
CREATE TABLE sample_rollup (
  run_id      BIGINT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  bucket_ts   TIMESTAMPTZ NOT NULL,
  count       BIGINT NOT NULL,
  error_count BIGINT NOT NULL,
  p50_ms      DOUBLE PRECISION,
  p95_ms      DOUBLE PRECISION,
  p99_ms      DOUBLE PRECISION,
  sketch      BYTEA,
  PRIMARY KEY (run_id, endpoint, bucket_ts)
);
\`\`\`

Pick one bucket width and keep it fixed (one second for runs under ten minutes, five seconds beyond that). Variable bucket widths make every downstream query conditional. The \`sketch\` column holds the serialized histogram so you can re-derive any percentile later and merge buckets correctly when zooming out.

Raw samples, if you keep them at all, go in a separate partitioned table with a short retention:

\`\`\`sql
CREATE TABLE raw_sample (
  run_id     BIGINT NOT NULL,
  ts         TIMESTAMPTZ NOT NULL,
  endpoint   TEXT NOT NULL,
  duration_ms DOUBLE PRECISION NOT NULL,
  status     INT,
  ok         BOOLEAN NOT NULL
) PARTITION BY RANGE (ts);
\`\`\`

Partition by day, drop partitions on a schedule, and never let a dashboard query touch this table directly.

## Mapping the three tools onto one schema

This is the table to keep next to your ingestion code.

| Canonical field | k6 | Gatling | JMeter |
|---|---|---|---|
| \`endpoint\` | \`name\` tag (falls back to \`url\`) | request name | \`label\` |
| \`duration_ms\` | \`http_req_duration\` | response time | \`elapsed\` |
| \`ok\` | check result / \`http_req_failed\` inverted | \`OK\` status | \`success\` |
| \`ts\` | sample timestamp | \`timestamp\` | \`timeStamp\` (epoch ms) |
| \`status\` | \`status\` tag | HTTP status | \`responseCode\` |
| run-level config | options object | injection profile | thread group |

The traps, one per tool:

**k6** emits \`http_req_duration\` as the request time excluding the initial connection by default, while \`http_req_waiting\` is time to first byte. Decide which one your platform calls "response time" and record the choice in \`tool_meta\`, because comparing a k6 \`http_req_duration\` against a JMeter \`elapsed\` is not apples to apples: JMeter's \`elapsed\` includes receiving the full response body.

**JMeter** writes \`timeStamp\` as epoch milliseconds and, in the default JTL layout, that timestamp marks the **start** of the sample. Gatling and k6 report differently enough that if you bucket by raw timestamp without normalizing, a JMeter run's traffic appears shifted by roughly one response time against the others. Normalize to sample start on ingestion and note it in the schema comment.

**Gatling** simulation logs are tab separated and change format between major versions. Parse defensively and fail the ingest loudly on an unexpected column count rather than silently writing nulls.

## Ingestion sketch

\`\`\`ts
// ingest/normalize.ts
export interface CanonicalSample {
  runId: number;
  ts: Date;
  endpoint: string;
  durationMs: number;
  status: number | null;
  ok: boolean;
}

export function fromK6(line: string, runId: number): CanonicalSample | null {
  const row = JSON.parse(line);
  if (row.type !== 'Point' || row.metric !== 'http_req_duration') return null;
  const tags = row.data.tags ?? {};
  return {
    runId,
    ts: new Date(row.data.time),
    // Named requests keep cardinality bounded; raw URLs do not.
    endpoint: tags.name ?? tags.url ?? 'unnamed',
    durationMs: row.data.value,
    status: tags.status ? Number(tags.status) : null,
    ok: tags.expected_response === 'true',
  };
}
\`\`\`

\`\`\`ts
// ingest/jmeter.ts
export function fromJmeterCsvRow(cols: Record<string, string>, runId: number): CanonicalSample {
  const elapsed = Number(cols.elapsed);
  const started = Number(cols.timeStamp);
  if (!Number.isFinite(elapsed) || !Number.isFinite(started)) {
    throw new Error('malformed JTL row: elapsed and timeStamp must be numeric');
  }
  return {
    runId,
    ts: new Date(started),
    endpoint: cols.label,
    durationMs: elapsed,
    status: cols.responseCode ? Number(cols.responseCode) : null,
    // JMeter writes the literal strings "true" and "false" in this column.
    ok: cols.success === 'true',
  };
}
\`\`\`

Throwing on a malformed row rather than coercing \`NaN\` is deliberate. A load testing platform that silently ingests garbage produces confident wrong numbers, which is worse than an ingest failure someone has to look at.

## Threshold results as first-class rows

\`\`\`sql
CREATE TABLE threshold_result (
  run_id     BIGINT NOT NULL REFERENCES run(id) ON DELETE CASCADE,
  expression TEXT NOT NULL,
  scope      TEXT NOT NULL,
  passed     BOOLEAN NOT NULL,
  observed   DOUBLE PRECISION,
  limit_value DOUBLE PRECISION,
  PRIMARY KEY (run_id, expression, scope)
);
\`\`\`

Storing the observed value alongside the pass or fail is what turns a red build into a useful signal: "p95 was 412ms against a 400ms limit" tells you to look at a small regression, while "p95 was 3.9s" tells you something broke. If you only store the boolean, every failure looks equally severe. The mechanics of writing those limits are covered in the [k6 thresholds and checks guide](/blog/k6-thresholds-checks-complete-guide).

## Indexes and the queries they serve

| Query | Index |
|---|---|
| Last 20 runs for a scenario | \`run (scenario_version_id, started_at DESC)\` |
| Trend of p95 for one endpoint | \`run_metric (run_id, endpoint, metric)\` PK, joined to run |
| Time series for a run's chart | \`sample_rollup\` PK, range-scanned on \`bucket_ts\` |
| All failing thresholds this week | partial index on \`threshold_result (run_id) WHERE NOT passed\` |

\`\`\`sql
CREATE INDEX threshold_failures_idx
  ON threshold_result (run_id)
  WHERE NOT passed;
\`\`\`

The partial index is small because most thresholds pass, and it answers the "what is broken" query without scanning the table.

## A realistic failure mode

Symptom: the p95 chart for a scenario shows a clean flat line at exactly 1000ms for several runs, then jumps.

Diagnosis: the ingestion path was writing \`durationMs\` from a tool field capped by a client-side timeout. Every request that timed out recorded 1000ms and \`ok = true\`, because the parser mapped only HTTP status and the timeouts never produced a status. The percentile was real, but it was measuring the timeout, not the server.

The fix is a constraint the data model can enforce: a sample with no status is not automatically OK.

\`\`\`sql
ALTER TABLE raw_sample
  ADD CONSTRAINT sample_ok_requires_status
  CHECK (ok = false OR status IS NOT NULL);
\`\`\`

Put integrity rules in the schema where you can. Ingestion code gets rewritten; constraints outlive it.

## Retention that respects the shape of the data

Three tiers, keyed off \`project.retention_days\`:

1. **Raw samples**: 7 days. They exist for incident forensics, not trends.
2. **Rollups**: the project retention window, typically 90 days.
3. **Run metrics and threshold results**: keep indefinitely. They are tiny and they are your history.

Deleting a \`run\` cascades to metrics, rollups, and thresholds, so retention jobs only need to select run IDs older than the window and delete them in batches. Raw samples are handled by dropping partitions, which is instant compared to a bulk \`DELETE\`.

## The queries your dashboard actually runs

Four queries cover most of a load testing platform's read traffic. Write them first, then confirm the indexes above serve them.

**Latest run per scenario, for the overview page:**

\`\`\`sql
SELECT DISTINCT ON (sv.scenario_id)
       sv.scenario_id, r.id AS run_id, r.status, r.started_at
FROM run r
JOIN scenario_version sv ON sv.id = r.scenario_version_id
WHERE r.environment = $1
ORDER BY sv.scenario_id, r.started_at DESC;
\`\`\`

**Trend of one endpoint's p95 across the last twenty runs of a version:**

\`\`\`sql
SELECT r.started_at, r.git_sha, m.p95_ms
FROM run_metric m
JOIN run r ON r.id = m.run_id
WHERE r.scenario_version_id = $1
  AND m.endpoint = $2
  AND m.metric = 'http_req_duration'
  AND r.status IN ('passed','failed')
ORDER BY r.started_at DESC
LIMIT 20;
\`\`\`

Note the status filter. Aborted and errored runs produce partial metrics, and including them puts phantom dips in every trend line. This is the second most common dashboard bug after averaging percentiles.

**Regression check against the previous run**, which is the query a CI comment posts:

\`\`\`sql
WITH ordered AS (
  SELECT m.endpoint, m.p95_ms, r.started_at,
         ROW_NUMBER() OVER (PARTITION BY m.endpoint ORDER BY r.started_at DESC) AS rn
  FROM run_metric m
  JOIN run r ON r.id = m.run_id
  WHERE r.scenario_version_id = $1 AND r.status IN ('passed','failed')
)
SELECT c.endpoint, c.p95_ms AS current_p95, p.p95_ms AS previous_p95,
       ROUND(((c.p95_ms - p.p95_ms) / NULLIF(p.p95_ms, 0) * 100)::numeric, 1) AS pct_change
FROM ordered c
JOIN ordered p ON p.endpoint = c.endpoint AND p.rn = 2
WHERE c.rn = 1
ORDER BY pct_change DESC NULLS LAST;
\`\`\`

The \`NULLIF\` guard matters: a previous p95 of zero is possible when an endpoint had no successful samples, and without the guard the whole query fails on a division error rather than returning the row that would have told you the endpoint was broken.

## Evolving the schema without breaking history

Load testing platforms accumulate history that outlives every design decision, so plan for three specific changes.

**New tool support.** Adding Locust or Artillery should touch exactly two places: the \`tool\` CHECK constraint and a new normalizer function. If it touches the canonical tables, the canonical model was wrong. Treat that as the design test whenever you are tempted to add a column.

**New percentiles.** Someone will ask for p99.9. If you stored only fixed columns, that request means re-running history, which is impossible. If you stored a \`sketch\` per rollup bucket, it is a query. This is the strongest argument for keeping histogram sketches even when the fixed columns feel sufficient today.

**Endpoint renames.** A script rewrite that renames \`checkout\` to \`checkout-v2\` breaks every trend line, and no schema constraint catches it because both are valid strings. Keep a small \`endpoint_alias (scenario_id, from_name, to_name)\` table and resolve through it at query time. It costs one join and saves the history that people actually care about.

\`\`\`sql
CREATE TABLE endpoint_alias (
  scenario_id BIGINT NOT NULL REFERENCES scenario(id) ON DELETE CASCADE,
  from_name   TEXT NOT NULL,
  to_name     TEXT NOT NULL,
  PRIMARY KEY (scenario_id, from_name)
);
\`\`\`

Resist the urge to rewrite historical rows on rename. Rewriting means the numbers in your database no longer match the artifacts the tool produced, and the first time someone reconciles a dashboard against a raw JTL file, that mismatch costs an afternoon.

## What people get wrong

The most common mistake is modeling the tool instead of the measurement. A schema with a \`jmeter_thread_group\` column, a \`k6_executor\` column, and a \`gatling_injection\` column is a schema that cannot answer "did checkout get slower this month" without a three-way conditional. The canonical tables should be tool-agnostic and boring; the interesting per-tool detail belongs in \`tool_meta\` where it is available but not load-bearing.

The second mistake is treating a load test result as a single number. A run is a distribution over time, per endpoint, under a specific concurrency profile. A data model that stores one p95 per run throws away the ability to answer why, and "why" is the entire point of running the test. If you are still choosing between generators before you build this, the [JMeter, Locust, and Gatling comparison](/blog/jmeter-vs-locust-vs-gatling-comparison) covers what each one gives you to ingest.

For teams wiring this into an AI-assisted workflow, ready-made QA skills install from qaskills.sh with the qaskills CLI, including performance-testing skills that generate the scenario scripts this schema stores.

## Sizing the tables before you build

A quick estimate keeps the design honest. Take a ten-minute run at 500 requests per second across twelve named endpoints:

| Table | Rows from that one run | Growth driver |
|---|---|---|
| \`run\` | 1 | runs per day |
| \`run_metric\` | 12 | endpoints per run |
| \`sample_rollup\` | 7,200 | endpoints x duration / bucket width |
| \`raw_sample\` | 300,000 | requests per second x duration |

Two hundred runs a month puts \`run_metric\` at 2,400 rows and \`sample_rollup\` at 1.44 million, both trivial for Postgres. \`raw_sample\` reaches 60 million rows in the same month, which is exactly why it is partitioned and dropped on a short cycle rather than kept alongside everything else.

The ratio is the point: rollups are roughly forty times smaller than raw samples, and run metrics are four orders of magnitude smaller. Design so that ninety-nine percent of your queries hit the smallest table that can answer them.

## Correctness checks worth writing once

Three assertions catch most ingestion bugs before they reach a dashboard, and they belong in your test suite rather than in a runbook.

\`\`\`sql
-- 1. Rollup counts must reconcile with the run summary.
SELECT r.id
FROM run r
JOIN run_metric m ON m.run_id = r.id AND m.metric = 'http_req_duration'
JOIN (
  SELECT run_id, endpoint, SUM(count) AS rollup_count
  FROM sample_rollup GROUP BY run_id, endpoint
) sr ON sr.run_id = m.run_id AND sr.endpoint = m.endpoint
WHERE sr.rollup_count <> m.count;
\`\`\`

A non-empty result means samples were dropped between the rollup writer and the summary writer, usually because one of them filtered on status and the other did not.

\`\`\`sql
-- 2. Percentiles must be monotonic within a row.
SELECT run_id, endpoint
FROM run_metric
WHERE p50_ms > p95_ms OR p95_ms > p99_ms OR p99_ms > max_ms;
\`\`\`

This catches percentile columns populated from different sample sets, which happens when a retry path recomputes some fields and not others.

\`\`\`sql
-- 3. A finished run must have an end time and a terminal status.
SELECT id FROM run
WHERE status IN ('passed','failed')
  AND (ended_at IS NULL OR ended_at < started_at);
\`\`\`

Clock skew between load generators is real, and a negative duration silently poisons any query that computes throughput as count divided by elapsed seconds.

## Frequently Asked Questions

### Should I store raw samples at all?

Keep them for a short window, typically seven days, and only in a partitioned table you can drop cheaply. Raw samples are worth having when someone asks why a specific run behaved strangely at minute six, because rollups cannot answer questions you did not anticipate when you chose the bucket width. They are not worth having beyond that: storage grows linearly with every run, and no dashboard should query them. Ship rollups plus a mergeable histogram sketch, and treat raw retention as an incident-response budget rather than a data-warehouse decision.

### How do I compare a JMeter run to a k6 run for the same scenario?

Carefully, and only after normalizing what each tool measures. JMeter's \`elapsed\` includes reading the response body, while k6's \`http_req_duration\` excludes connection setup and \`http_req_waiting\` is time to first byte. Record which field you ingested in \`tool_meta\`, and surface it in the UI next to the number. In practice, treat a tool change as a new \`scenario_version\` and do not draw a continuous trend line across the boundary. Comparing the two is legitimate for a migration report; it is misleading on a dashboard.

### Why separate run_metric from sample_rollup?

They answer different questions and have very different row counts. \`run_metric\` holds one row per endpoint per run, so a hundred runs of a twenty-endpoint scenario is two thousand rows, and it powers every trend chart and threshold check. \`sample_rollup\` holds one row per endpoint per time bucket, so a single ten-minute run at one-second buckets is twelve thousand rows on its own. Keeping them apart means your trend queries never scan time-series data, and your time-series queries never aggregate across runs.

### Can I use a time-series database instead of Postgres?

Yes for the rollup and raw-sample tiers, where a time-series store handles retention and downsampling natively. The entity tables (project, scenario, scenario_version, run, threshold_result) still want a relational store, because they are about identity, foreign keys, and constraints rather than time. A common split is Postgres for entities plus a time-series backend for samples, joined by \`run_id\`. Starting with Postgres for everything is a reasonable default until a single run regularly exceeds a few million samples.
`,
};
