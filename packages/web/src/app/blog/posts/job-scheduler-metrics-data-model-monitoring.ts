import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Job Scheduler Metrics Data Model for p95 Latency, Duration, and Run States',
  description: 'Job scheduler execution metrics p95 latency average duration monitoring data model for queues, workers, retries, stuck runs, and CI automation health.',
  date: '2026-08-28',
  category: 'Reference',
  content: `
# Job Scheduler Metrics Data Model for p95 Latency, Duration, and Run States

A job scheduler metrics data model defines how you store and query execution metrics such as p95 latency, average duration, queue time, retries, failures, cancellations, and run states. For QA teams, it answers the real monitoring question: are jobs slow because work takes longer, because the scheduler queues them, because workers are scarce, or because retries are hiding failures?

The model should separate job definitions, job runs, state transitions, worker heartbeats, and metric rollups. That separation makes p95 latency meaningful instead of a dashboard number nobody can explain.

## Name The Timers Before You Chart Them

Scheduler monitoring fails when teams use "duration" to mean five different things. A run can wait in a queue, reserve a worker, download dependencies, execute user code, upload artifacts, retry after failure, and then finalize. Average duration across all of that may be useful for capacity planning, but it is not enough for diagnosis.

Define these timers first:

| Timer | Starts | Ends | What it tells you |
|---|---|---|---|
| enqueue latency | Job accepted | Job becomes runnable | Delay from dependencies, rate limits, or scheduling windows |
| queue latency | Runnable | Worker starts execution | Worker capacity and priority pressure |
| startup duration | Worker assigned | User command starts | Image pull, checkout, dependency setup |
| execution duration | User command starts | User command exits | Test, build, or task runtime |
| finalization duration | User command exits | Run marked complete | Artifact upload, result parsing, callbacks |
| total run duration | Job accepted | Terminal state | User-visible run time |

p95 latency should be attached to a specific timer. "p95 job latency is 12 minutes" is vague. "p95 queue latency for Playwright shards on linux-large is 12 minutes" points to capacity, priority, or worker image problems.

Use average duration too, but treat it as a cost metric, not a tail-risk metric. Average execution duration helps estimate worker hours. p95 queue latency helps explain why developers are waiting.

## Core Tables For Scheduler History

The schema below is intentionally plain SQL. It is a foundation you can adapt to Postgres, BigQuery, Snowflake, ClickHouse, or another store. The important choice is to keep run facts and state transitions separate.

\`\`\`sql
create table job_definitions (
  job_definition_id text primary key,
  repository text not null,
  workflow_name text not null,
  job_name text not null,
  default_priority integer not null default 100,
  timeout_seconds integer not null,
  created_at timestamptz not null,
  retired_at timestamptz,
  unique (repository, workflow_name, job_name)
);

create table job_runs (
  job_run_id text primary key,
  job_definition_id text not null references job_definitions (job_definition_id),
  external_run_id text,
  commit_sha text,
  branch_name text,
  pull_request_number bigint,
  trigger_name text not null,
  priority integer not null,
  requested_worker_pool text not null,
  attempt_number integer not null default 1,
  created_at timestamptz not null,
  runnable_at timestamptz,
  started_at timestamptz,
  command_started_at timestamptz,
  command_finished_at timestamptz,
  finished_at timestamptz,
  terminal_state text,
  exit_code integer
);
\`\`\`

The run table stores timestamps, not only precomputed durations. Durations can be recomputed after parser fixes, timezone fixes, or state-machine changes. You can still materialize rollups later.

\`\`\`sql
create table job_state_transitions (
  transition_id text primary key,
  job_run_id text not null references job_runs (job_run_id),
  from_state text,
  to_state text not null,
  reason text,
  occurred_at timestamptz not null,
  actor_type text not null,
  actor_id text
);

create index job_state_transitions_run_idx
  on job_state_transitions (job_run_id, occurred_at);

create index job_runs_pool_created_idx
  on job_runs (requested_worker_pool, created_at desc);
\`\`\`

State transitions explain what happened when terminal_state is not enough. A canceled run can be canceled by a user, by a superseding commit, by a scheduler timeout, or by a worker loss. Those are different bugs.

## A State Machine QA Can Assert

A scheduler should have a finite set of states. If run states are free-form strings, monitoring becomes taxonomy cleanup. Pick states that match your product, then test legal transitions.

| State | Meaning | Terminal |
|---|---|---:|
| accepted | Scheduler stored the request | No |
| blocked | Dependencies or concurrency limits prevent running | No |
| queued | Runnable and waiting for worker | No |
| assigned | Worker reserved | No |
| starting | Worker preparing environment | No |
| running | User command is executing | No |
| finalizing | Command finished and scheduler is collecting results | No |
| succeeded | Completed successfully | Yes |
| failed | Completed with failure | Yes |
| timed_out | Exceeded timeout | Yes |
| canceled | Canceled intentionally | Yes |
| lost | Worker disappeared or heartbeat expired | Yes |

Represent legal transitions as data so tests can validate them:

\`\`\`ts
type RunState =
  | "accepted"
  | "blocked"
  | "queued"
  | "assigned"
  | "starting"
  | "running"
  | "finalizing"
  | "succeeded"
  | "failed"
  | "timed_out"
  | "canceled"
  | "lost";

const allowedTransitions: Record<RunState, RunState[]> = {
  accepted: ["blocked", "queued", "canceled"],
  blocked: ["queued", "canceled"],
  queued: ["assigned", "canceled", "timed_out"],
  assigned: ["starting", "lost", "canceled"],
  starting: ["running", "failed", "lost", "timed_out"],
  running: ["finalizing", "failed", "timed_out", "lost", "canceled"],
  finalizing: ["succeeded", "failed", "lost"],
  succeeded: [],
  failed: [],
  timed_out: [],
  canceled: [],
  lost: []
};

export function isLegalTransition(from: RunState, to: RunState): boolean {
  return allowedTransitions[from].includes(to);
}
\`\`\`

Then test it:

\`\`\`ts
import { describe, expect, test } from "vitest";
import { isLegalTransition } from "./runState";

describe("scheduler run state machine", () => {
  test("allows queued jobs to be assigned", () => {
    expect(isLegalTransition("queued", "assigned")).toBe(true);
  });

  test("does not allow terminal jobs to restart", () => {
    expect(isLegalTransition("succeeded", "running")).toBe(false);
    expect(isLegalTransition("failed", "queued")).toBe(false);
  });
});
\`\`\`

This looks like application code, but it is also monitoring hygiene. Illegal transitions create impossible durations. If a run jumps from accepted to succeeded, queue latency and execution duration are unknowable unless you repair the event stream.

## Compute p95 Latency And Average Duration From Facts

Once timestamps are clean, the metrics are straightforward. The important part is grouping. p95 queue latency across all jobs hides the hot pool. p95 execution duration across all branches hides scheduled load tests. Segment by dimensions that explain the system without exploding cardinality.

\`\`\`sql
select
  requested_worker_pool,
  date_trunc('hour', created_at) as hour,
  percentile_cont(0.95) within group (
    order by extract(epoch from (started_at - runnable_at)) * 1000
  ) as p95_queue_latency_ms,
  avg(extract(epoch from (command_finished_at - command_started_at)) * 1000) as average_execution_duration_ms,
  count(*) as run_count
from job_runs
where runnable_at is not null
  and started_at is not null
  and command_started_at is not null
  and command_finished_at is not null
  and created_at >= now() - interval '24 hours'
group by requested_worker_pool, date_trunc('hour', created_at)
order by hour desc, requested_worker_pool;
\`\`\`

For dashboards, materialize summaries. Keep raw runs for debugging and rollups for fast charts.

\`\`\`sql
create table scheduler_metric_rollups_hourly (
  rollup_hour timestamptz not null,
  repository text,
  workflow_name text,
  job_name text,
  worker_pool text not null,
  trigger_name text,
  run_count bigint not null,
  success_count bigint not null,
  failure_count bigint not null,
  timeout_count bigint not null,
  canceled_count bigint not null,
  lost_count bigint not null,
  p50_queue_latency_ms double precision,
  p95_queue_latency_ms double precision,
  p99_queue_latency_ms double precision,
  average_execution_duration_ms double precision,
  p95_execution_duration_ms double precision,
  primary key (rollup_hour, worker_pool, workflow_name, job_name, trigger_name)
);
\`\`\`

The primary key here is an example, not a universal rule. If job_name cardinality is too high for your monitoring path, roll up by workflow or pool first. In a warehouse, high-cardinality dimensions are often acceptable. In a metrics backend, they can become expensive. The tradeoff connects directly to [observability testing metric cardinality](/blog/observability-testing-metric-cardinality).

## Dimensions That Explain Scheduler Behavior

Good dimensions help QA separate causes. Bad dimensions create cardinality noise or privacy risk.

| Dimension | Keep? | Reason |
|---|---:|---|
| worker_pool | Yes | Capacity and image differences show up here |
| repository | Yes | Ownership and workload grouping |
| workflow_name | Yes | Build, test, deploy, scan patterns differ |
| job_name | Usually | Useful, but watch generated names |
| branch_name | Warehouse yes, metrics maybe no | High cardinality in active PR-heavy repos |
| commit_sha | Warehouse yes, metrics no | Needed for traceability, terrible as a metric label |
| actor email | Usually no | Privacy risk and poor aggregation |
| error message | Warehouse limited, metrics no | Fingerprint instead of raw text |
| worker_id | Warehouse yes, metrics carefully | Needed for hot-worker diagnosis |

Do not let monitoring labels copy your warehouse columns blindly. Warehouse tables can store rich context because queries happen on demand. Metrics systems need bounded labels because every unique label set may create a time series.

## Worker Heartbeats And Capacity

Run records tell you what jobs did. Worker records tell you what capacity existed. Without worker data, queue latency is hard to diagnose. Was the queue slow because there were no workers, because workers were stuck starting images, or because a priority class starved?

\`\`\`sql
create table worker_heartbeats (
  heartbeat_id text primary key,
  worker_id text not null,
  worker_pool text not null,
  scheduler_version text not null,
  runner_version text not null,
  state text not null,
  active_job_run_id text,
  cpu_used_percent double precision,
  memory_used_percent double precision,
  disk_used_percent double precision,
  observed_at timestamptz not null
);

create index worker_heartbeats_pool_time_idx
  on worker_heartbeats (worker_pool, observed_at desc);
\`\`\`

Heartbeat cadence should be frequent enough to catch lost workers but not so frequent that monitoring drowns in samples. For many internal schedulers, 10 to 30 seconds is a reasonable starting point. For short jobs, you may need event-based worker state changes instead of relying only on heartbeats.

Use worker data to compute available capacity:

\`\`\`sql
select
  worker_pool,
  date_trunc('minute', observed_at) as minute,
  count(distinct worker_id) filter (where state = 'idle') as idle_workers,
  count(distinct worker_id) filter (where state = 'busy') as busy_workers,
  count(distinct worker_id) filter (where state = 'starting') as starting_workers,
  count(distinct worker_id) filter (where state = 'lost') as lost_workers
from worker_heartbeats
where observed_at >= now() - interval '2 hours'
group by worker_pool, date_trunc('minute', observed_at)
order by minute desc, worker_pool;
\`\`\`

Queue latency plus worker capacity is a much stronger signal than either alone.

## Monitoring Cards That QA Will Use

A scheduler dashboard should answer "what changed?" in under a minute. Dense, boring cards beat decorative charts. Put the run state counts next to latency percentiles and retry cost.

| Card | Primary metric | Drilldown |
|---|---|---|
| Queue health | p95 queue latency by pool | queued runs by priority and age |
| Execution cost | average and p95 execution duration | slowest workflows and jobs |
| Reliability | failure, timeout, lost rates | terminal state reason and worker pool |
| Retry pressure | attempts per logical run | flaky jobs and transient infrastructure |
| Capacity | idle, busy, starting, lost workers | worker version and pool |
| Freshness | latest heartbeat and latest rollup time | ingestion lag |

Prometheus-style metrics are useful for alerts. Keep label sets bounded:

\`\`\`text
scheduler_job_runs_total{worker_pool="linux-large",workflow="e2e",state="succeeded"} 42
scheduler_queue_latency_ms_bucket{worker_pool="linux-large",workflow="e2e",le="1000"} 18
scheduler_queue_latency_ms_bucket{worker_pool="linux-large",workflow="e2e",le="5000"} 37
scheduler_queue_latency_ms_bucket{worker_pool="linux-large",workflow="e2e",le="+Inf"} 42
scheduler_workers{worker_pool="linux-large",state="busy"} 12
\`\`\`

Do not add commit_sha, job_run_id, raw branch, or actor as labels. Put those in logs or warehouse facts.

## Alert On Symptoms With Diagnostic Context

Alerts should fire on user pain and include enough context to route the incident. "Scheduler slow" is a weak alert. "p95 queue latency above 10 minutes for linux-large e2e jobs for 15 minutes, idle workers below 2" is actionable.

\`\`\`yaml
alerts:
  - name: e2e_queue_latency_high
    condition: p95_queue_latency_ms > 600000
    window: 15m
    dimensions:
      worker_pool: linux-large
      workflow_name: e2e
    include:
      - queued_run_count
      - idle_worker_count
      - lost_worker_count
      - newest_scheduler_version
  - name: worker_loss_rate_high
    condition: lost_worker_rate > 0.05
    window: 10m
    dimensions:
      worker_pool: linux-large
    include:
      - active_job_count
      - recent_worker_ids
\`\`\`

That YAML is a monitoring contract. Your implementation may be Datadog, Grafana, Honeycomb, CloudWatch, or a custom system. The contract is what matters: threshold, window, dimensions, and context.

## Failure Story: Average Duration Hid A Queue Incident

A QA team reported that e2e tests were "twice as slow." The symptom was developer wait time: PR checks that usually finished in 18 minutes were taking 40 minutes. The first theory was test bloat. People blamed a recent UI test merge because it added several scenarios.

The warehouse told a different story after the timers were split. Average execution duration had moved from 11.4 to 12.1 minutes, an illustrative but minor change. p95 queue latency moved from 3 minutes to 24 minutes for one worker pool. Worker heartbeats showed many workers stuck in starting state after a base image update. The tests were slightly slower, but the incident was capacity startup failure.

The fix was to roll back the worker image, add a startup-duration metric, and alert when starting workers exceeded a threshold while queued jobs aged. The team kept the new UI tests. The diagnosis changed because the data model had queue latency, startup duration, execution duration, and worker state as separate facts.

## What People Get Wrong In Scheduler Metrics

The big mistake is averaging terminal runs and ignoring the runs that never reached normal execution. Canceled, timed_out, and lost runs are not noise. They are often the scheduler's most important signal. A dashboard that filters to succeeded runs may show great duration while developers are rerunning broken jobs all afternoon.

The second mistake is measuring from job creation to finish and calling it execution duration. That makes test suites look slow when the runner queue is the real bottleneck. It also makes optimization work political. Test owners get asked to delete tests when the platform team needs more workers or a faster image.

The third mistake is keeping only current state. Current queue depth matters, but history explains regressions. You need state transitions and timestamps to answer when the issue started, which scheduler version was active, and whether a deploy changed behavior.

## Connect Scheduler Metrics To Test Results

Scheduler metrics explain job-level health. Test results explain test-level behavior. Join them carefully. Do not put every test attempt in the scheduler schema, and do not put every worker heartbeat in the test results schema. Use ids and rollups.

A load-testing platform has similar modeling pressure: requests, runs, workers, percentiles, and artifacts need different tables. The design patterns in [load testing platform data model schema design](/blog/load-testing-platform-data-model-schema-design) transfer well to scheduler systems because both are mostly time-series facts with operational dimensions.

Here is a join query that tells QA whether failing test jobs were also scheduler-stressed:

\`\`\`sql
select
  jr.job_run_id,
  jd.repository,
  jd.workflow_name,
  jd.job_name,
  jr.terminal_state,
  extract(epoch from (jr.started_at - jr.runnable_at)) * 1000 as queue_latency_ms,
  extract(epoch from (jr.command_finished_at - jr.command_started_at)) * 1000 as execution_duration_ms,
  s.timeout_count,
  s.lost_count
from job_runs jr
join job_definitions jd on jd.job_definition_id = jr.job_definition_id
left join scheduler_metric_rollups_hourly s
  on s.rollup_hour = date_trunc('hour', jr.created_at)
  and s.worker_pool = jr.requested_worker_pool
  and s.workflow_name = jd.workflow_name
where jd.repository = 'web-app'
  and jr.created_at >= now() - interval '24 hours'
  and jr.terminal_state in ('failed', 'timed_out', 'lost')
order by jr.created_at desc;
\`\`\`

This kind of query prevents the standard argument where test engineers and platform engineers each bring one chart and neither chart contains enough context.

## Data Quality Checks For Monitoring

Scheduler metrics are only as good as the event stream. Add tests for impossible timestamps, missing terminal states, negative durations, and stale workers.

\`\`\`sql
select job_run_id
from job_runs
where started_at is not null
  and runnable_at is not null
  and started_at < runnable_at;
\`\`\`

\`\`\`sql
select job_run_id
from job_runs
where terminal_state in ('succeeded', 'failed', 'timed_out', 'canceled', 'lost')
  and finished_at is null;
\`\`\`

\`\`\`ts
type WorkerHeartbeat = {
  workerId: string;
  observedAtMs: number;
};

export function staleWorkers(
  heartbeats: WorkerHeartbeat[],
  nowMs: number,
  maxAgeMs: number
): string[] {
  // A worker appears many times in a heartbeat log. Judge staleness on its
  // LATEST beat, or a worker that beat seconds ago still gets flagged for a
  // row it wrote an hour earlier.
  const latest = new Map<string, number>();
  for (const heartbeat of heartbeats) {
    const prev = latest.get(heartbeat.workerId);
    if (prev === undefined || heartbeat.observedAtMs > prev) {
      latest.set(heartbeat.workerId, heartbeat.observedAtMs);
    }
  }
  return [...latest.entries()]
    .filter(([, observedAtMs]) => nowMs - observedAtMs > maxAgeMs)
    .map(([workerId]) => workerId);
}
\`\`\`

These checks should run before rollups. Bad facts create bad percentiles. Once bad percentiles land in dashboards, people make platform decisions from fiction.

## Rollout Path For A Team Starting From Logs

If your scheduler currently has only logs, do not try to build the final dashboard first. Instrument the lifecycle.

| Step | Add | Validation |
|---|---|---|
| 1 | job_runs with lifecycle timestamps | No negative or missing required durations |
| 2 | state transitions | Illegal transitions are rejected or flagged |
| 3 | worker heartbeats | Queue spikes can be compared to capacity |
| 4 | hourly rollups | Dashboard loads without scanning raw rows |
| 5 | alerts with context | On-call can route queue, worker, or execution incidents |

Start with one worker pool and one workflow if needed. A narrow complete slice beats a wide schema with half-populated columns.

## Retries Need Their Own Metrics

Retries make scheduler dashboards look healthier than they are when you model only the final run. A logical job may have three attempts: one lost worker, one timeout, and one success. The final conclusion is success, but the scheduler consumed three slots and delayed feedback. QA should measure both logical outcome and attempt cost.

Add a logical group id when your scheduler supports retries:

\`\`\`sql
alter table job_runs
  add column logical_job_id text;

create index job_runs_logical_job_idx
  on job_runs (logical_job_id, attempt_number);
\`\`\`

Then compute retry pressure:

\`\`\`sql
select
  jd.repository,
  jd.workflow_name,
  jd.job_name,
  count(distinct jr.logical_job_id) as logical_jobs,
  count(*) as attempts,
  round(count(*)::numeric / nullif(count(distinct jr.logical_job_id), 0), 2) as attempts_per_job
from job_runs jr
join job_definitions jd on jd.job_definition_id = jr.job_definition_id
where jr.created_at >= now() - interval '7 days'
  and jr.logical_job_id is not null
group by jd.repository, jd.workflow_name, jd.job_name
having count(*) > count(distinct jr.logical_job_id)
order by attempts_per_job desc;
\`\`\`

Attempts per job is a practical QA metric because it converts flakiness, worker loss, and transient platform failures into capacity cost. If a workflow has a 1.35 attempts-per-job rate, the team is buying 35 percent more scheduler work for the same logical feedback. That number is illustrative, but the interpretation is real.

## Priority And Fairness Belong In The Model

Schedulers usually have priority rules: release jobs beat nightly jobs, paid tenant jobs beat free tenant jobs, main-branch jobs beat experimental branches, or security scans run in reserved pools. If you do not store priority class and scheduling reason, p95 queue latency can look unfair without showing whether it was designed that way.

| Field | Example values | Why it matters |
|---|---|---|
| priority_class | release, pull_request, nightly, backfill | Separates intentional service levels |
| scheduling_reason | normal, dependency_released, concurrency_wait | Explains blocked time |
| concurrency_key | repo-main, deploy-prod | Finds hot locks |
| preempted_by | release-job-123 | Explains interrupted lower-priority work |
| deadline_at | timestamp | Measures deadline misses |

A fairness query compares queue latency by priority class within a worker pool:

\`\`\`sql
select
  priority_class,
  count(*) as runs,
  percentile_cont(0.95) within group (
    order by extract(epoch from (started_at - runnable_at)) * 1000
  ) as p95_queue_latency_ms
from job_runs
where requested_worker_pool = 'linux-large'
  and runnable_at is not null
  and started_at is not null
  and created_at >= now() - interval '24 hours'
group by priority_class
order by p95_queue_latency_ms desc;
\`\`\`

This does not prove unfairness by itself. It gives platform and QA teams the right next question: is this priority gap intended, documented, and acceptable for the affected workflow?

## Histogram Buckets Should Match User Pain

If you export queue latency as a histogram, choose buckets around decisions people care about. Buckets of 1 ms, 2 ms, and 5 ms are useless for a CI scheduler where users care about minutes. Buckets of 1 minute, 5 minutes, 10 minutes, 20 minutes, and 60 minutes may be much more useful.

| Timer | Example bucket shape | Reason |
|---|---|---|
| queue latency | 10s, 30s, 1m, 5m, 10m, 30m | Developer wait thresholds |
| startup duration | 5s, 15s, 30s, 1m, 3m | Image and environment setup |
| execution duration | 30s, 2m, 5m, 15m, 45m | Job runtime distribution |
| finalization duration | 5s, 15s, 1m, 5m | Artifact and callback issues |

Bucket choice is a testing concern. If your p95 calculation comes from histogram buckets, coarse buckets can hide regressions. If queue latency jumps from 40 seconds to 4 minutes and your buckets only show below 5 minutes, the dashboard may look unchanged. QA should review buckets when scheduler behavior or workflow duration changes.

You can unit test bucket assignment:

\`\`\`ts
const queueLatencyBucketsMs = [10000, 30000, 60000, 300000, 600000, 1800000];

export function bucketForLatency(durationMs: number): string {
  for (const bucket of queueLatencyBucketsMs) {
    if (durationMs <= bucket) {
      return String(bucket);
    }
  }
  return "+Inf";
}
\`\`\`

\`\`\`ts
import { describe, expect, test } from "vitest";
import { bucketForLatency } from "./buckets";

describe("queue latency buckets", () => {
  test("places a four minute wait in the five minute bucket", () => {
    expect(bucketForLatency(240000)).toBe("300000");
  });

  test("places very long waits in the overflow bucket", () => {
    expect(bucketForLatency(3600000)).toBe("+Inf");
  });
});
\`\`\`

The bucket names are strings because many metrics systems expose the upper bound label as text. Keep the values consistent across services or your dashboards will compare unlike histograms.

## Rollup Correctness Tests

Rollups are production code. A broken hourly summary can create a false incident or hide a real one. Test rollup jobs with a tiny fixture where you know the p95, average duration, and terminal counts.

\`\`\`json
[
  { "jobRunId": "a", "queueLatencyMs": 1000, "executionDurationMs": 10000, "terminalState": "succeeded" },
  { "jobRunId": "b", "queueLatencyMs": 2000, "executionDurationMs": 12000, "terminalState": "succeeded" },
  { "jobRunId": "c", "queueLatencyMs": 10000, "executionDurationMs": 11000, "terminalState": "failed" },
  { "jobRunId": "d", "queueLatencyMs": 20000, "executionDurationMs": 9000, "terminalState": "lost" }
]
\`\`\`

For four rows, a nearest-rank p95 returns the largest value. Some SQL percentile functions interpolate instead. Decide which definition your dashboard uses and document it. Mixed percentile definitions are a subtle source of "why does Grafana disagree with the warehouse?" arguments.

The same fixture should assert terminal counts: two succeeded, one failed, one lost. It should assert that null command timestamps are excluded from execution-duration averages but still counted in terminal-state totals when appropriate. That nuance matters for lost and canceled runs.

## SLOs By Workflow, Not One Global Number

A global scheduler SLO is easy to announce and hard to use. Unit tests, browser tests, nightly load tests, release deployments, and data backfills do not share the same user expectation. Give each workflow class its own service objective.

| Workflow class | Example queue p95 objective | Example terminal-state objective |
|---|---:|---|
| Pull request unit tests | Under 2 minutes | Lost rate below 0.5 percent |
| Pull request browser tests | Under 5 minutes | Timeout rate below 2 percent |
| Release validation | Under 1 minute | Lost rate near zero |
| Nightly load tests | Under 30 minutes | Completion before business hours |
| Backfills | Capacity capped | No starvation of PR jobs |

The exact numbers are illustrative. The important move is segmentation. A nightly queue spike should not page the PR on-call unless it threatens interactive developer feedback. A release-validation queue spike probably should page quickly.

## Detect Stuck Runs Before Users Report Them

State transitions let you find jobs that stopped moving. A stuck run is different from a slow run. A slow run is still making progress inside a known state. A stuck run has exceeded the normal age for that state and may need scheduler intervention.

Define maximum state ages by workflow class:

| State | Pull request max age | Nightly max age | Likely diagnosis |
|---|---:|---:|---|
| blocked | 10 minutes | 2 hours | Dependency or concurrency key never released |
| queued | 5 minutes | 30 minutes | Worker capacity or priority starvation |
| assigned | 2 minutes | 5 minutes | Worker reservation did not start |
| starting | 5 minutes | 15 minutes | Image pull, checkout, or setup problem |
| finalizing | 3 minutes | 10 minutes | Artifact upload or callback failure |

Here is a warehouse query for stuck queued runs:

\`\`\`sql
select
  jr.job_run_id,
  jd.repository,
  jd.workflow_name,
  jd.job_name,
  jr.requested_worker_pool,
  jr.priority,
  jr.runnable_at,
  extract(epoch from (now() - jr.runnable_at)) / 60 as queued_minutes
from job_runs jr
join job_definitions jd on jd.job_definition_id = jr.job_definition_id
where jr.terminal_state is null
  and jr.runnable_at is not null
  and jr.started_at is null
  and now() - jr.runnable_at > interval '5 minutes'
order by queued_minutes desc;
\`\`\`

Do not rely only on p95 alerts for stuck runs. A single release validation job stuck behind a broken concurrency lock may not move the pool's p95, but it can block a production deploy. Stuck-run checks are targeted alarms. Percentile checks are population health signals. You need both.

Automated recovery should leave evidence. If the scheduler requeues a stuck assigned job, write a transition with reason "worker_start_timeout" or similar. Silent repair makes the dashboard look clean while hiding platform instability. QA should test the recovery path and the audit event together.

## Frequently Asked Questions

### What is p95 latency for a job scheduler?

p95 latency is the value below which 95 percent of measured scheduler timings fall. The timing must be named. For example, p95 queue latency measures how long runnable jobs wait for workers, while p95 execution duration measures the tail of command runtime. Do not publish one p95 number without saying which timer, worker pool, workflow, and time window it covers. Otherwise the chart cannot guide action.

### Should average duration be used for scheduler alerts?

Average duration is useful for cost and trend analysis, but it is usually weak for alerts. A few terrible waits can harm developers while the average still looks fine, and a large number of tiny jobs can hide slow important jobs. Alert on p95 or p99 for queue and startup latency, plus rates for timed_out, lost, and failed states. Keep averages for capacity planning and weekly optimization work.

### How should canceled jobs be modeled?

Canceled jobs should be terminal runs with a reason when available. Separate user cancellation, superseded commits, dependency cancellation, scheduler policy, and timeout-like cancellation. Do not delete canceled jobs from history. They affect developer wait time and scheduler load, and they often explain missing test results. State transitions should show where the run was canceled, such as queued, running, or finalizing.

### What labels are safe for scheduler metrics?

Use bounded labels such as worker_pool, workflow_name, terminal_state, trigger_name, and priority_class. Be careful with job_name if it is generated dynamically. Avoid commit_sha, job_run_id, pull request number, full branch name, actor, raw error message, and file path in metrics labels. Store those in logs or warehouse tables instead. Good labels make alert grouping useful without creating unbounded time-series cardinality.
`,
};
