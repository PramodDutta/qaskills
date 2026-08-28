import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Results Warehouse Schema Design for CI History at Scale',
  description: 'Test results warehouse schema guide for storing CI history at scale, querying flakes, tracking duration, and powering reliable QA decisions.',
  date: '2026-08-28',
  category: 'Reference',
  content: `
# Test Results Warehouse Schema Design for CI History at Scale

A test results warehouse schema is the set of tables, keys, partitions, and derived views that store CI test history so QA teams can query failures, flakes, duration, ownership, and release risk over time. The useful design separates immutable run facts from changing metadata, stores every attempt, and keeps enough context to explain why a test result happened without turning the warehouse into a log dump.

For QA and test-automation engineers, the payoff is practical: faster triage, smarter test selection, stable dashboards, and defensible release decisions.

## Model The CI World As Events And Dimensions

CI history looks simple until retries, matrix jobs, renamed tests, split shards, quarantines, and branch policies enter the room. A schema that stores only "test name, status, duration" will fail the first time a flaky test passes on retry or a renamed package makes history disappear.

Start with a small vocabulary:

| Concept | Meaning | Mutability |
|---|---|---|
| Pipeline run | One CI execution for a commit, PR, branch, or scheduled job | Immutable after completion, except late metadata |
| Job run | One job inside the pipeline, such as unit tests on Node 22 | Immutable after completion |
| Test case | A logical test identity independent of one execution | Slowly changing |
| Test attempt | One execution of one test case in one job attempt | Immutable |
| Artifact | File or URL produced by a run, such as JUnit XML, trace, video, or coverage | Usually immutable |
| Ownership | Team, service, package, or component responsible for a test | Slowly changing |

That split keeps event facts append-only. Append-only facts are easier to backfill, audit, and recompute. Dimensions can change without rewriting billions of result rows.

The core relationship is:

| Parent | Child | Cardinality | Notes |
|---|---|---:|---|
| pipeline_runs | job_runs | 1 to many | Matrix jobs and shards live here |
| job_runs | test_attempts | 1 to many | Every retry attempt is preserved |
| test_cases | test_attempts | 1 to many | Test identity joins history |
| job_runs | artifacts | 1 to many | Raw reports and debug files |
| test_cases | ownership_snapshots | 1 to many | Ownership changes over time |

The word "attempt" is important. If CI retries a failed test and the final check is green, you still need the failed attempt. Otherwise your warehouse cannot answer the questions QA leaders actually ask: which tests are flaky, how much time retries cost, and which failures are hidden by rerun policy?

## The Minimum Useful Schema

Below is a relational starting point. It works in Postgres, and the ideas carry to BigQuery, Snowflake, DuckDB, ClickHouse, or another warehouse. Types and partition syntax vary by engine, but the contracts are the same.

\`\`\`sql
create table pipeline_runs (
  pipeline_run_id text primary key,
  provider text not null,
  repository text not null,
  workflow_name text not null,
  run_number bigint not null,
  commit_sha text not null,
  branch_name text not null,
  pull_request_number bigint,
  trigger_name text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  conclusion text,
  actor text,
  created_at timestamptz not null default now()
);

create index pipeline_runs_repo_started_idx
  on pipeline_runs (repository, started_at desc);

create index pipeline_runs_commit_idx
  on pipeline_runs (repository, commit_sha);
\`\`\`

The pipeline table should not store every test count as hand-maintained columns at first. Derived counts belong in views or summary tables until you know the query patterns. Premature summary columns drift when ingestion is retried or a parser bug is fixed.

\`\`\`sql
create table job_runs (
  job_run_id text primary key,
  pipeline_run_id text not null references pipeline_runs (pipeline_run_id),
  provider_job_id text not null,
  job_name text not null,
  shard_name text,
  runner_os text,
  runtime_name text,
  runtime_version text,
  attempt_number integer not null default 1,
  started_at timestamptz not null,
  finished_at timestamptz,
  conclusion text,
  queue_duration_ms bigint,
  execution_duration_ms bigint,
  unique (pipeline_run_id, provider_job_id, attempt_number)
);

create index job_runs_pipeline_idx
  on job_runs (pipeline_run_id);
\`\`\`

Job-level queue and execution duration are worth storing directly because they often come from the CI provider, not from test reports. They answer a different question than test duration. A job can be slow because it waited for a runner, spent time installing dependencies, or ran slow tests. Do not mix those into one duration if you want useful operations data.

\`\`\`sql
create table test_cases (
  test_case_id text primary key,
  repository text not null,
  suite_name text not null,
  file_path text not null,
  test_name text not null,
  test_name_hash text not null,
  framework text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  is_active boolean not null default true,
  unique (repository, suite_name, file_path, test_name_hash)
);

create index test_cases_path_idx
  on test_cases (repository, file_path);
\`\`\`

Use a stable hash for long test names. Store the full name too. The hash makes indexes and joins smaller, while the full name makes debugging human. If your test framework exposes a stable test id, store it, but do not assume every framework will. Many teams combine file path, suite path, and full test name.

\`\`\`sql
create table test_attempts (
  test_attempt_id text primary key,
  job_run_id text not null references job_runs (job_run_id),
  test_case_id text not null references test_cases (test_case_id),
  attempt_number integer not null,
  status text not null,
  duration_ms bigint not null,
  error_message text,
  error_type text,
  failure_fingerprint text,
  stdout_bytes bigint,
  stderr_bytes bigint,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (job_run_id, test_case_id, attempt_number)
);

create index test_attempts_case_created_idx
  on test_attempts (test_case_id, created_at desc);

create index test_attempts_job_idx
  on test_attempts (job_run_id);

create index test_attempts_status_idx
  on test_attempts (status, created_at desc);
\`\`\`

Statuses should be controlled. Pick a small set such as passed, failed, skipped, timed_out, interrupted, quarantined, and unknown. Keep provider-specific raw values in a separate field if needed. Dashboards become painful when one runner emits "failure", another emits "failed", and a parser adds "FAIL."

## Preserve Retries Without Lying About Final Status

Retries are where many warehouse designs break. CI systems often expose final job conclusion but not the full story at test level. Test frameworks may emit multiple XML files for retries. Browser tests may retry inside the same worker and produce one final result plus retry metadata. Your ingestion needs a clear rule.

Store each attempt as a separate row when the data exists. Then derive final status from attempts.

| Attempt statuses for a test in one job | Final status | Flake signal |
|---|---|---|
| passed | passed | no |
| failed, passed | passed_on_retry | yes |
| failed, failed | failed | no, or persistent failure |
| timed_out, passed | passed_on_retry | yes |
| skipped | skipped | no |
| interrupted | interrupted | unknown |

This query derives final status without losing attempts:

\`\`\`sql
with ordered_attempts as (
  select
    job_run_id,
    test_case_id,
    status,
    attempt_number,
    row_number() over (
      partition by job_run_id, test_case_id
      order by attempt_number desc
    ) as reverse_rank,
    bool_or(status in ('failed', 'timed_out')) over (
      partition by job_run_id, test_case_id
    ) as had_failure
  from test_attempts
)
select
  job_run_id,
  test_case_id,
  case
    when status = 'passed' and had_failure then 'passed_on_retry'
    else status
  end as final_status
from ordered_attempts
where reverse_rank = 1;
\`\`\`

That derived final status lets a release gate use the final result while a flake dashboard uses the hidden failure. The two views should disagree sometimes. That is a feature, not a contradiction.

## Ingestion Contract For JUnit And Playwright

Most teams start by ingesting JUnit XML because almost every test runner can produce it. That is fine, but JUnit is a loose family, not one exact format. Different tools put duration, classname, file, stdout, and retry metadata in different places. Write an ingestion contract that says what your parser accepts and what it does when a field is absent.

| Input field | Warehouse target | Missing-field behavior |
|---|---|---|
| suite name | test_cases.suite_name | Use framework or job name |
| classname | test_cases.suite_name or file hint | Preserve raw value in parser metadata |
| file | test_cases.file_path | Fall back to classname, mark source quality |
| name | test_cases.test_name | Required |
| time | test_attempts.duration_ms | Default to 0 only if framework omits it |
| failure element | status and error fields | Capture short message and fingerprint |
| skipped element | status | Mark skipped |

Here is a TypeScript normalizer that turns parsed report cases into warehouse rows. It avoids framework-specific parser code so the contract stays readable.

\`\`\`ts
import { createHash } from "node:crypto";

type RawCase = {
  repository: string;
  suiteName: string;
  filePath: string | null;
  testName: string;
  framework: string;
  durationSeconds: number | null;
  status: "passed" | "failed" | "skipped" | "timed_out";
  errorMessage?: string;
};

type NormalizedCase = {
  testCaseId: string;
  repository: string;
  suiteName: string;
  filePath: string;
  testName: string;
  testNameHash: string;
  framework: string;
  durationMs: number;
  status: RawCase["status"];
  failureFingerprint: string | null;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeCase(raw: RawCase): NormalizedCase {
  const filePath = raw.filePath ?? "unknown";
  const identity = [raw.repository, raw.suiteName, filePath, raw.testName].join("|");
  const testNameHash = sha256(raw.testName).slice(0, 16);

  return {
    testCaseId: sha256(identity),
    repository: raw.repository,
    suiteName: raw.suiteName,
    filePath,
    testName: raw.testName,
    testNameHash,
    framework: raw.framework,
    durationMs: Math.max(0, Math.round((raw.durationSeconds ?? 0) * 1000)),
    status: raw.status,
    failureFingerprint: raw.errorMessage ? sha256(raw.errorMessage).slice(0, 20) : null
  };
}
\`\`\`

For Playwright, keep trace and video artifacts out of the hot fact table. Store pointers. The warehouse should know an artifact exists and where authorized systems can fetch it. It should not become object storage.

\`\`\`sql
create table artifacts (
  artifact_id text primary key,
  pipeline_run_id text not null references pipeline_runs (pipeline_run_id),
  job_run_id text references job_runs (job_run_id),
  test_case_id text references test_cases (test_case_id),
  artifact_type text not null,
  storage_url text not null,
  byte_size bigint,
  sha256 text,
  created_at timestamptz not null default now()
);

create index artifacts_test_case_idx
  on artifacts (test_case_id, created_at desc);
\`\`\`

Object storage URLs can expire. If that is true in your system, store a stable object key rather than a signed URL. Tests should verify artifact rows never contain secrets in query strings.

## Partition Around Time, Cluster Around Questions

At scale, every schema decision becomes a query bill or a slow dashboard. Partition large fact tables by time. Cluster or index by the fields people filter on: repository, test_case_id, job_run_id, status, created_at, and branch.

The exact DDL depends on the warehouse. The design question is stable: which query should be cheap?

| Query | Needed access path | Schema support |
|---|---|---|
| Failures on this PR | pipeline_run_id -> job_runs -> attempts | Foreign keys or clustered ids |
| Flake rate for one test over 90 days | test_case_id plus time | Index or cluster on test_case_id, created_at |
| Slowest tests on main last week | repository, branch, time, duration | Time partition plus duration sort in summary |
| Failures by owner | test_case_id -> ownership snapshot | Ownership dimension |
| Retry cost by workflow | workflow, time, attempt count | Job and attempt summaries |

A common pattern is raw facts plus daily aggregates. Raw facts answer audits and debug questions. Aggregates feed dashboards.

\`\`\`sql
create materialized view daily_test_case_summary as
select
  date_trunc('day', ta.created_at) as day,
  pr.repository,
  tc.test_case_id,
  tc.file_path,
  count(*) as attempt_count,
  count(*) filter (where ta.status = 'passed') as passed_attempts,
  count(*) filter (where ta.status = 'failed') as failed_attempts,
  count(*) filter (where ta.status = 'timed_out') as timed_out_attempts,
  percentile_cont(0.95) within group (order by ta.duration_ms) as p95_duration_ms,
  avg(ta.duration_ms) as average_duration_ms
from test_attempts ta
join job_runs jr on jr.job_run_id = ta.job_run_id
join pipeline_runs pr on pr.pipeline_run_id = jr.pipeline_run_id
join test_cases tc on tc.test_case_id = ta.test_case_id
group by 1, 2, 3, 4;
\`\`\`

Some warehouses do not support materialized views with percentile functions exactly like this. In that case, compute summaries in a scheduled job. The shape still holds: one row per day, repository, and test case.

## Ownership Is A Slowly Changing Dimension

Ownership is not a string column on test_attempts. Teams reorganize. Files move. Services split. A failure from six months ago should still show the owner at the time, or at least let you reconstruct it. Store ownership snapshots with effective dates.

\`\`\`sql
create table ownership_snapshots (
  ownership_snapshot_id text primary key,
  repository text not null,
  path_prefix text not null,
  owning_team text not null,
  service_name text,
  effective_from timestamptz not null,
  effective_to timestamptz,
  source text not null
);

create index ownership_snapshots_lookup_idx
  on ownership_snapshots (repository, path_prefix, effective_from);
\`\`\`

Path-prefix ownership is not perfect, but it is often good enough to start. If your monorepo already has service metadata, join to that. If ownership is in code owners, ingest it as a versioned source. Do not overwrite history in place unless you are comfortable changing past reports.

## Queries QA Teams Actually Run

Schema quality shows up in the questions it can answer without a week of spreadsheet work. The first set is triage:

\`\`\`sql
select
  tc.file_path,
  tc.test_name,
  ta.status,
  ta.error_type,
  ta.failure_fingerprint,
  ta.duration_ms
from pipeline_runs pr
join job_runs jr on jr.pipeline_run_id = pr.pipeline_run_id
join test_attempts ta on ta.job_run_id = jr.job_run_id
join test_cases tc on tc.test_case_id = ta.test_case_id
where pr.repository = 'checkout-service'
  and pr.pull_request_number = 4821
  and ta.status in ('failed', 'timed_out')
order by ta.duration_ms desc;
\`\`\`

The second set is flake detection. One useful flake proxy is "failed at least once and passed at least once on the same branch in a time window." It is not perfect, but it finds expensive tests quickly.

\`\`\`sql
select
  tc.file_path,
  tc.test_name,
  count(*) filter (where ta.status = 'failed') as failures,
  count(*) filter (where ta.status = 'passed') as passes,
  count(*) as attempts
from test_attempts ta
join test_cases tc on tc.test_case_id = ta.test_case_id
join job_runs jr on jr.job_run_id = ta.job_run_id
join pipeline_runs pr on pr.pipeline_run_id = jr.pipeline_run_id
where pr.repository = 'checkout-service'
  and pr.branch_name = 'main'
  and ta.created_at >= now() - interval '30 days'
group by tc.file_path, tc.test_name
having count(*) filter (where ta.status = 'failed') > 0
   and count(*) filter (where ta.status = 'passed') > 0
order by failures desc, attempts desc
limit 50;
\`\`\`

The third set is duration optimization. If the goal is faster CI, query total cost, not only individual duration. A 5 second test that runs 30,000 times may cost more than a 90 second test that runs twice.

\`\`\`sql
select
  tc.file_path,
  tc.test_name,
  count(*) as attempts,
  percentile_cont(0.95) within group (order by ta.duration_ms) as p95_ms,
  sum(ta.duration_ms) as total_ms
from test_attempts ta
join test_cases tc on tc.test_case_id = ta.test_case_id
join job_runs jr on jr.job_run_id = ta.job_run_id
join pipeline_runs pr on pr.pipeline_run_id = jr.pipeline_run_id
where pr.repository = 'checkout-service'
  and pr.branch_name = 'main'
  and ta.created_at >= now() - interval '14 days'
group by tc.file_path, tc.test_name
order by total_ms desc
limit 25;
\`\`\`

Those queries become inputs to [CI test impact caching strategy](/blog/ci-test-impact-caching-strategy). Test selection needs trustworthy history, especially around which files changed, which tests usually fail, and which suites dominate runtime.

## Failure Story: The Flake Rate Was Half Real

A team built a flake dashboard and found one browser test with a 38 percent failure rate. The symptom was loud: leadership wanted the test deleted. The wrong theory was that the checkout UI was unstable. Engineers spent two days inspecting frontend changes and could not reproduce the failure locally.

The actual cause was schema identity. The parser used only the test title as the test_case_id. Two different files both had a test named "submits form with valid data." One was a checkout test. The other was an admin billing test that hit a seeded account limit in CI. Their attempts merged into one history row. The dashboard accused the wrong test.

The fix was boring and decisive. The team changed identity to repository, suite, file path, and test title hash. They backfilled 90 days of XML. The checkout test dropped to near zero failures, and the billing test showed a real seed-data problem. The lesson: a test results warehouse schema is a product surface. If identity is wrong, every downstream decision can be wrong with nice charts on top.

## What People Get Wrong About Scale

People hear "at scale" and jump to storage volume. Volume matters, but the harder problems are identity, cardinality, and late-arriving facts. A million test attempts per day is manageable in modern warehouses. A million attempts with unstable names, huge error blobs in hot rows, and no retry model becomes hard because every query needs custom cleanup.

Do not put raw stdout, screenshots, traces, or full stack traces in the main attempts table. Store short fields for search and grouping, then link to artifacts. Do not store branch names as unbounded labels in metrics systems unless you understand cardinality cost. In the warehouse, branch names are fine as query dimensions. In monitoring metrics, they can become expensive quickly.

Also avoid rewriting history to make dashboards look clean. If a parser bug created bad rows, write a correction job or versioned backfill. Keep ingestion run metadata so you can explain when data changed.

\`\`\`sql
create table ingestion_runs (
  ingestion_run_id text primary key,
  source_name text not null,
  source_uri text not null,
  parser_name text not null,
  parser_version text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null,
  rows_inserted bigint not null default 0,
  rows_rejected bigint not null default 0,
  error_message text
);
\`\`\`

Parser version is not vanity. When a dashboard jumps, you need to know whether the product changed or the parser changed.

## CI Provider Metadata And Scheduler Metrics

Test history often needs scheduler context: queue duration, runner pool, job state, retries, cancellations, and capacity. Without that context, QA may blame test code for delays caused by runner scarcity. Link job_runs to scheduler metrics rather than stuffing every scheduler sample into the test schema. The companion model for [job scheduler metrics data model monitoring](/blog/job-scheduler-metrics-data-model-monitoring) is the right place for p95 queue latency, run states, and worker capacity.

In the test warehouse, keep enough fields to join:

| Field | Table | Purpose |
|---|---|---|
| provider | pipeline_runs | Distinguish GitHub Actions, Buildkite, Jenkins, or internal CI |
| provider_job_id | job_runs | Join back to CI provider APIs or scheduler tables |
| runner_os | job_runs | Segment platform-specific failures |
| runtime_version | job_runs | Find failures tied to Node, Java, Python, or browser versions |
| queue_duration_ms | job_runs | Separate runner waiting from execution |
| execution_duration_ms | job_runs | Track job runtime independent of queue |

This separation lets a dashboard say, "tests are not slower, the runner queue is slower." That sentence saves engineering hours.

## Data Quality Tests For The Warehouse

Warehouse tests should run like application tests. They protect trust in the metrics. Start with constraints that catch impossible data:

\`\`\`sql
select test_attempt_id
from test_attempts
where duration_ms < 0
   or status not in ('passed', 'failed', 'skipped', 'timed_out', 'interrupted', 'quarantined', 'unknown');
\`\`\`

Then check referential completeness:

\`\`\`sql
select ta.test_attempt_id
from test_attempts ta
left join job_runs jr on jr.job_run_id = ta.job_run_id
left join test_cases tc on tc.test_case_id = ta.test_case_id
where jr.job_run_id is null
   or tc.test_case_id is null;
\`\`\`

And check suspicious identity collisions:

\`\`\`sql
select
  repository,
  test_name,
  count(distinct file_path) as file_count
from test_cases
group by repository, test_name
having count(distinct file_path) > 10
order by file_count desc;
\`\`\`

That last query does not prove a bug, but it surfaces names too generic to trust alone. It is a good smoke test for identity design.

## Rollout Plan For A Growing Warehouse

Do not start with a perfect enterprise data model. Start with immutable facts, stable identity, and a few queries that remove pain. Then expand.

| Phase | Build | Exit criteria |
|---|---|---|
| 1 | Ingest pipeline_runs, job_runs, test_cases, test_attempts | PR failure query works for current CI |
| 2 | Preserve retries and artifacts | Flake dashboard distinguishes final pass from hidden fail |
| 3 | Add ownership snapshots | Failures route to teams without manual spreadsheets |
| 4 | Add daily summaries | Dashboards load quickly over 90 days |
| 5 | Join scheduler and impact data | CI optimization decisions use cost and confidence |

Keep raw report artifacts for a retention window even after parsing. Parser bugs are normal. Backfill is much easier when you still have source reports.

## Schema Evolution Without Breaking History

Test warehouses live longer than test frameworks. You will rename suites, migrate from one browser runner to another, change retry policy, add sharding, and adjust failure categories. Plan for that movement. The safe pattern is to add fields, backfill them, publish a compatibility view, then move dashboards. Avoid changing the meaning of an existing column in place.

| Change | Safer migration | Risky migration |
|---|---|---|
| Add browser name | Add nullable browser_name, backfill from artifacts | Parse browser out of job_name forever |
| Rename status | Add normalized_status view | Rewrite raw status and lose provider value |
| Change identity | Create new test_case_id version and mapping | Overwrite ids with no bridge |
| Add quarantine | Add status plus quarantine dimension | Delete quarantined attempts |
| Split suite | Preserve old suite in historical rows | Force old rows into new suite names |

Identity migrations need special care. If you discover that your test_case_id was too weak, do not pretend history was always correct. Create a mapping table that records old id, new id, migration reason, and effective time. Then dashboards can either show corrected history or clearly mark the boundary.

\`\`\`sql
create table test_case_identity_migrations (
  migration_id text primary key,
  old_test_case_id text not null,
  new_test_case_id text not null,
  repository text not null,
  reason text not null,
  effective_at timestamptz not null,
  created_by text not null,
  created_at timestamptz not null default now()
);
\`\`\`

Backfills should be repeatable. Store parser version, source artifact pointer, row counts, and rejection counts. Run a backfill first into a shadow table or a new partition, compare aggregate counts, then promote it. QA should insist on before-and-after checks: total attempts by day, failures by status, top files by count, and null rates for required dimensions.

\`\`\`sql
select
  date_trunc('day', created_at) as day,
  status,
  count(*) as attempts
from test_attempts
where created_at >= timestamp '2026-08-01'
group by date_trunc('day', created_at), status
order by day, status;
\`\`\`

That query is basic, but it catches ugly backfill mistakes: doubled rows, missing skipped tests, or a parser that turns timeouts into ordinary failures.

## Privacy And Retention Boundaries

CI logs often contain tokens, emails, customer ids, internal hostnames, and stack traces with sensitive paths. A test results warehouse should not ingest raw logs as ordinary queryable text. Store small searchable fields and keep sensitive artifacts behind the access controls designed for artifacts.

| Data | Store in hot table? | Safer handling |
|---|---:|---|
| Full stdout | No | Store byte count and artifact pointer |
| Full stack trace | Usually no | Store top frame, error type, fingerprint |
| Secret-like values | No | Redact before persistence |
| Screenshot | No | Store artifact metadata |
| Test name and file | Yes | Needed for triage |
| Commit SHA | Yes | Needed for traceability |

Add a redaction test to ingestion. It does not have to catch every possible secret to be worth running. It should catch obvious mistakes before they become permanent warehouse rows.

\`\`\`ts
const secretPatterns = [
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /password/i
];

export function looksSensitive(value: string): boolean {
  return secretPatterns.some((pattern) => pattern.test(value));
}

export function safeErrorMessage(message: string, maxLength: number): string {
  const shortened = message.slice(0, maxLength);
  return looksSensitive(shortened) ? "[redacted]" : shortened;
}
\`\`\`

Retention should be explicit. Detailed attempts may be useful for 90 or 180 days. Aggregates may be useful for years. Artifact retention may be shorter because storage costs and privacy risk are higher. The right numbers are organizational choices, but the schema should support tiering from the start.

## Dashboard Contracts Beat Ad Hoc Queries

Once people trust the warehouse, dashboards multiply. Without shared views, every dashboard author writes a slightly different flake definition. Publish a small set of blessed views: latest PR failures, daily test summary, flake candidates, slow tests, and owner health. Treat those views as an API.

\`\`\`sql
create view flake_candidates_30d as
select
  tc.repository,
  tc.file_path,
  tc.test_name,
  count(*) filter (where ta.status in ('failed', 'timed_out')) as failing_attempts,
  count(*) filter (where ta.status = 'passed') as passing_attempts,
  count(*) as total_attempts
from test_attempts ta
join test_cases tc on tc.test_case_id = ta.test_case_id
where ta.created_at >= now() - interval '30 days'
group by tc.repository, tc.file_path, tc.test_name
having count(*) filter (where ta.status in ('failed', 'timed_out')) > 0
   and count(*) filter (where ta.status = 'passed') > 0;
\`\`\`

Version important views. When you change a definition, announce it like an application change. QA metrics lose credibility when yesterday's flake count and today's flake count differ because someone edited SQL quietly.

## Frequently Asked Questions

### What is the best primary key for a test case?

Use a deterministic key built from repository, suite path, file path, and full test name, or use a framework-provided stable id when it truly exists. Do not use only the test title. Many suites reuse titles such as "renders correctly" or "submits form." Store the readable fields beside the hash so people can debug queries. When files move, decide whether history should follow the test or remain attached to the old path, then document that rule.

### Should retries be stored as separate rows?

Yes. Store every attempt when the source data exposes it. Final status is useful for release gates, but retry history is essential for flake analysis and CI cost work. A test that fails once and passes on retry should not look the same as a test that passed cleanly. Keep attempt_number, status, duration, and failure fingerprint. Then derive final status in a view or summary table.

### Where should screenshots, videos, and traces live?

Keep large artifacts in object storage or the CI provider artifact store, then store metadata and pointers in the warehouse. The test_attempts table should contain searchable facts, not binary payloads. Store artifact type, stable object key or URL, byte size, checksum when available, and the related job or test id. Avoid signed URLs with secrets in warehouse rows. A separate artifact table keeps hot queries fast.

### How much history should a CI test warehouse keep?

Keep enough raw history to answer release, flake, and trend questions for your delivery cycle. Many teams start with 90 days of detailed attempts and longer retention for daily summaries. Regulated or enterprise environments may need more. The important point is tiering: detailed facts for recent debugging, compact summaries for long-term trends, and source artifacts long enough to backfill after parser fixes.
`,
};
