import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Management System Schema Design: Cases, Runs, and Results',
  description:
    'Test management system schema design for cases, runs, and results: entity keys, status transitions, imports, and queries that keep QA history trustworthy.',
  date: '2026-08-28',
  category: 'Reference',
  content: `
# Test Management System Schema Design: Cases, Runs, and Results

A test management system schema design is the relational (or document) contract that stores how QA defines work, schedules it, executes it, and records outcomes. At minimum it must cover TestCase, Suite, Plan, Run, Execution (attempt), Result, Attachment, and Defect link entities, plus the keys that keep those rows joinable across projects and tenants. If those pieces collapse into a single "test result" blob, you lose case history, retry truth, coverage by plan, and any honest flaky-rate math.

This reference is for QA and test-automation engineers who build or harden a TMS, including teams that use AI coding agents to generate DDL, importers, and query helpers.

## Entity Map From Case Definition To Verdict

Start with a vocabulary that separates definition from execution. Definitions change slowly. Executions are append-only facts.

| Entity | Role | Typical mutability |
|---|---|---|
| TestCase | Logical test identity with steps, expected results, tags, and ownership | Versioned updates |
| Suite | Ordered or tagged grouping of cases for navigation and ownership | Slowly changing |
| Plan | Selected cases (and optional suite slices) intended for a release or cycle | Mutable until locked |
| Run | One scheduled or triggered execution of a plan (or ad-hoc case set) against an environment | Immutable after close |
| Execution | One attempt to run one case inside a run | Immutable |
| Result | Verdict fields for an execution: status, duration, message, classifier | Immutable (corrections as new rows) |
| Attachment | Evidence files or URLs tied to an execution or result | Immutable |
| DefectLink | Join from a failing result (or case) to a defect tracker issue | Soft-deletable |

Cardinality that keeps reporting sane:

| Parent | Child | Cardinality | Constraint to enforce |
|---|---|---:|---|
| Suite | TestCase membership | many to many | Membership is not identity; cases can live in many suites |
| Plan | PlanItem (case + version pin) | 1 to many | Pin a case_version_id, not only case_id |
| Run | Execution | 1 to many | Every selected plan item can produce zero or more attempts |
| Execution | Result | 1 to 1 (or 1 to many if you store intermediate probes) | Prefer one authoritative result row per execution |
| Execution | Attachment | 1 to many | Traces, screenshots, logs, JUnit fragments |
| Result | DefectLink | 1 to many | One failure can map to multiple issues across systems |

What people get wrong is treating the Suite as the source of truth for identity. Suites are navigation and ownership aids. Identity lives on the TestCase key. When a case moves from "Smoke" to "Regression," history must follow the case, not evaporate because the suite membership row changed.

Keep catalog edits out of the event stream. When step text changes, write a new case version. When a run finishes, do not rewrite its executions to match the latest step text. Auditors and flake dashboards both depend on that rule.

## Stable Case Keys Versus Attempt Rows

Identity and execution must not share a primary key. A case key is stable across renames of the display title. An execution key is unique per attempt inside a run.

Recommended identity fields:

- \`tenant_id\`: multi-tenant or multi-business-unit partition.
- \`project_id\`: product or repo boundary inside a tenant.
- \`case_key\`: human-stable string such as \`BILLING-LOGIN-001\` or a hash of package + title used only as a fallback when no key exists yet.
- \`case_id\`: surrogate UUID primary key.
- \`case_version_id\`: immutable snapshot of steps, expected results, and priority at a point in time.

Recommended execution fields:

- \`run_id\`: the parent run.
- \`execution_id\`: surrogate for the attempt.
- \`attempt_number\`: 1-based retry index within the run for that case.
- \`case_id\` and \`case_version_id\`: what was intended, and which text was shown to the tester or automation.
- \`executor_type\`: \`manual\`, \`automation\`, \`imported\`.
- \`started_at\` / \`finished_at\`: timestamps used later for lead-time joins.

\`\`\`ts
export type CaseStatus = 'draft' | 'ready' | 'deprecated';
export type ResultStatus =
  | 'passed'
  | 'failed'
  | 'blocked'
  | 'skipped'
  | 'error'
  | 'in_progress';

export type TestCase = {
  caseId: string;
  tenantId: string;
  projectId: string;
  caseKey: string;
  title: string;
  status: CaseStatus;
  currentVersionId: string;
  ownerTeam: string;
  tags: string[];
};

export type CaseVersion = {
  caseVersionId: string;
  caseId: string;
  versionNumber: number;
  stepsMarkdown: string;
  expectedMarkdown: string;
  priority: 'p0' | 'p1' | 'p2' | 'p3';
  createdAt: string;
  createdBy: string;
};

export type Execution = {
  executionId: string;
  runId: string;
  caseId: string;
  caseVersionId: string;
  attemptNumber: number;
  executorType: 'manual' | 'automation' | 'imported';
  startedAt: string;
  finishedAt: string | null;
};

export type Result = {
  resultId: string;
  executionId: string;
  status: ResultStatus;
  durationMs: number | null;
  message: string | null;
  failureFingerprint: string | null;
  recordedAt: string;
};
\`\`\`

Use \`failureFingerprint\` for clustering, not as identity. Fingerprints change when assertion messages change. Case keys must not. If automation only knows a Playwright title path, map external identity to \`case_id\` instead of stuffing titles into \`case_key\`.

## Status Enums, Transitions, And Retries

Statuses live in two layers: case lifecycle and result verdict. Mixing them produces illegal states like a deprecated case that is still \`in_progress\` with no run context.

Case lifecycle (illustrative): \`draft -> ready\` (enter plans), \`ready -> deprecated\` (keep history, warn on new plan items), and rare \`deprecated -> ready\` restores with a new version if steps changed.

Result verdicts need an explicit retry policy. Store every attempt. A common final-verdict rule: any \`passed\` attempt wins for the run (flake signal still uses earlier fails); else use the latest \`blocked\`, \`skipped\`, \`failed\`, or \`error\`.

\`\`\`sql
create table result_status_dim (
  status text primary key,
  is_terminal boolean not null,
  counts_as_executed boolean not null,
  counts_as_failure boolean not null
);

insert into result_status_dim (status, is_terminal, counts_as_executed, counts_as_failure) values
  ('passed', true, true, false),
  ('failed', true, true, true),
  ('error', true, true, true),
  ('blocked', true, true, false),
  ('skipped', true, false, false),
  ('in_progress', false, false, false);
\`\`\`

Enforce transitions in application code or with a constraint table. Do not allow \`passed -> failed\` on the same \`execution_id\`. Corrections become a new execution or a separate \`result_corrections\` audit table. Silent overwrites destroy flake metrics.

For automation retries inside one CI job, map each retry to a new \`execution\` row under the same \`run_id\` and \`case_id\` with an incremented \`attempt_number\`. For manual retests the next day, prefer a new \`run_id\` unless your product explicitly supports continue-run semantics.

## Tenancy, Projects, And Composite Keys

Multi-project and multi-tenant designs fail when unique constraints are global by accident. \`case_key\` must be unique inside \`(tenant_id, project_id)\`, not across the whole database. The same applies to plan names, run numbers, and external defect ids when those ids are only unique per tracker project.

Suggested uniqueness:

| Table | Unique constraint | Reason |
|---|---|---|
| test_cases | (tenant_id, project_id, case_key) | Stable business key per project |
| case_versions | (case_id, version_number) | Monotonic versions per case |
| suites | (tenant_id, project_id, suite_key) | Avoid colliding "Smoke" names |
| plans | (tenant_id, project_id, plan_key) | Cycle identifiers stay local |
| runs | (plan_id, run_number) or (project_id, run_key) | Human-facing run numbers restart per plan |
| executions | (run_id, case_id, attempt_number) | Exactly one row per attempt |

Always carry \`tenant_id\` on child tables even when implied by \`project_id\`. Row-level security and export jobs stay simpler, and a missing join cannot leak another tenant's attachments. Environment is not a tenant: store name, browser matrix, app version, and config hash on the run (or via \`environment_version_id\`).

## Versioning Steps And Expected Results

Step text is evidence. When a failure says "step 4 failed," that step 4 must be reconstructible months later. Pin \`case_version_id\` on every execution.

A practical versioning rule:

- Editing title tags or owner without changing steps may skip a version bump if you accept weaker auditability.
- Editing steps, expected results, prerequisites, or priority always creates a new \`case_versions\` row and updates \`test_cases.current_version_id\`.
- Plans that are locked should keep their pinned \`case_version_id\` values even if the catalog moves forward.

\`\`\`json
{
  "caseKey": "CHECKOUT-COUPON-002",
  "versionNumber": 7,
  "steps": [
    { "ordinal": 1, "action": "Open cart with one in-stock item", "expected": "Cart subtotal renders" },
    { "ordinal": 2, "action": "Apply coupon SAVE10", "expected": "Discount line equals 10 percent of subtotal" },
    { "ordinal": 3, "action": "Place order", "expected": "Order confirmation shows discounted total" }
  ],
  "createdAt": "2026-08-20T14:02:11Z",
  "createdBy": "qa.owner@example.com"
}
\`\`\`

Pick one canonical step form (JSON or markdown) for diffing. If AI agents propose step edits, bump the version in the same transaction. Attachments may reference \`step_ordinal\` so a screenshot lands on the failing action; keep binaries on the execution side, not inside case versions.

## Ingesting JUnit, Allure, And Playwright Reports

Most TMS databases grow through imports, not only through UI clicks. Design an ingestion seam that normalizes vendor reports into Execution and Result rows without inventing a second schema.

Core import flow:

1. Create or resolve a \`run\` for the CI pipeline run id / workflow run id.
2. Resolve each report test to a \`case_id\` via mapping table or auto-provisioned case with a generated \`case_key\`.
3. Insert \`execution\` rows for each attempt present in the report.
4. Insert \`result\` rows with status mapping.
5. Store the raw report as an attachment on the run for replay.

Status mapping sketch:

| Source | Source value | TMS ResultStatus |
|---|---|---|
| JUnit | failure | failed |
| JUnit | error | error |
| JUnit | skipped | skipped |
| JUnit | (no failure node) | passed |
| Playwright | passed | passed |
| Playwright | timedOut | failed |
| Playwright | interrupted | error |
| Allure | broken | error |

\`\`\`ts
export type ImportedCaseRef = {
  externalSystem: 'junit' | 'allure' | 'playwright';
  externalId: string;
  title: string;
  suitePath: string[];
};

export function mapJUnitStatus(testcase: {
  failure?: unknown;
  error?: unknown;
  skipped?: unknown;
}): ResultStatus {
  if (testcase.skipped !== undefined) return 'skipped';
  if (testcase.failure !== undefined) return 'failed';
  if (testcase.error !== undefined) return 'error';
  return 'passed';
}

export async function importJUnitCase(args: {
  resolveCase: (ref: ImportedCaseRef) => Promise<{ caseId: string; caseVersionId: string }>;
  ref: ImportedCaseRef;
  runId: string;
  attemptNumber: number;
  status: ResultStatus;
  durationMs: number;
  message: string | null;
  recordedAt: string;
}): Promise<{ executionId: string; resultId: string }> {
  const resolved = await args.resolveCase(args.ref);
  const executionId = crypto.randomUUID();
  const resultId = crypto.randomUUID();
  const failureFingerprint = args.message
    ? args.message.replace(/\\d+/g, '#').slice(0, 500)
    : null;

  await persistExecutionResult({
    execution: {
      executionId,
      runId: args.runId,
      caseId: resolved.caseId,
      caseVersionId: resolved.caseVersionId,
      attemptNumber: args.attemptNumber,
      executorType: 'imported',
      startedAt: args.recordedAt,
      finishedAt: args.recordedAt,
    },
    result: {
      resultId,
      executionId,
      status: args.status,
      durationMs: args.durationMs,
      message: args.message,
      failureFingerprint,
      recordedAt: args.recordedAt,
    },
  });

  return { executionId, resultId };
}

declare function persistExecutionResult(args: {
  execution: Execution;
  result: Result;
}): Promise<void>;
\`\`\`

Idempotency matters: unique on \`(run_external_id, report_case_id, attempt_number)\` so reruns do not duplicate rows. Preserve Playwright attempt numbers instead of collapsing to the final status. Store attachment URLs with content-type and sha256 so traces are not uploaded twice.

Teams that want a ready-made QA skills install for agent workflows can use the qaskills CLI from qaskills.sh to pull focused skill packs into their coding agents; the schema still lives in your database, the skills only help agents edit it consistently.

## SQL DDL Sketches That Match The Types

Postgres-oriented DDL mirroring the TypeScript contracts. Keep the keys even if you later move analytics to a warehouse.

\`\`\`sql
create table test_cases (
  case_id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  case_key text not null,
  title text not null,
  status text not null check (status in ('draft', 'ready', 'deprecated')),
  current_version_id uuid,
  owner_team text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, project_id, case_key)
);

create table case_versions (
  case_version_id uuid primary key,
  case_id uuid not null references test_cases (case_id),
  version_number int not null,
  steps_markdown text not null,
  expected_markdown text not null,
  priority text not null check (priority in ('p0', 'p1', 'p2', 'p3')),
  created_at timestamptz not null,
  created_by text not null,
  unique (case_id, version_number)
);

create table plans (
  plan_id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  plan_key text not null,
  name text not null,
  locked_at timestamptz,
  unique (tenant_id, project_id, plan_key)
);

create table plan_items (
  plan_item_id uuid primary key,
  plan_id uuid not null references plans (plan_id),
  case_id uuid not null references test_cases (case_id),
  case_version_id uuid not null references case_versions (case_version_id),
  unique (plan_id, case_id)
);

create table runs (
  run_id uuid primary key,
  plan_id uuid references plans (plan_id),
  tenant_id uuid not null,
  project_id uuid not null,
  run_key text not null,
  environment_name text not null,
  app_version text,
  started_at timestamptz not null,
  finished_at timestamptz,
  created_by text not null,
  unique (project_id, run_key)
);

create table executions (
  execution_id uuid primary key,
  run_id uuid not null references runs (run_id),
  case_id uuid not null references test_cases (case_id),
  case_version_id uuid not null references case_versions (case_version_id),
  attempt_number int not null check (attempt_number >= 1),
  executor_type text not null check (executor_type in ('manual', 'automation', 'imported')),
  started_at timestamptz not null,
  finished_at timestamptz,
  unique (run_id, case_id, attempt_number)
);

create table results (
  result_id uuid primary key,
  execution_id uuid not null unique references executions (execution_id),
  status text not null references result_status_dim (status),
  duration_ms int,
  message text,
  failure_fingerprint text,
  recorded_at timestamptz not null
);

create table attachments (
  attachment_id uuid primary key,
  execution_id uuid references executions (execution_id),
  run_id uuid references runs (run_id),
  content_type text not null,
  storage_url text not null,
  sha256 text not null,
  step_ordinal int,
  created_at timestamptz not null default now()
);

create table defect_links (
  defect_link_id uuid primary key,
  result_id uuid not null references results (result_id),
  tracker text not null,
  external_id text not null,
  url text not null,
  linked_at timestamptz not null,
  unlinked_at timestamptz,
  unique (result_id, tracker, external_id)
);

create table external_case_map (
  tenant_id uuid not null,
  project_id uuid not null,
  external_system text not null,
  external_id text not null,
  case_id uuid not null references test_cases (case_id),
  primary key (tenant_id, project_id, external_system, external_id)
);
\`\`\`

Index results by fingerprint, executions by run, and runs by \`started_at\`.

## Query Patterns For Coverage, Flakes, And Plan Pass Rates

Pass rate by plan (final verdict per case per run, using latest attempt):

\`\`\`sql
with latest_attempts as (
  select distinct on (e.run_id, e.case_id)
    e.run_id,
    e.case_id,
    e.execution_id,
    e.attempt_number
  from executions e
  order by e.run_id, e.case_id, e.attempt_number desc
),
final_results as (
  select
    r.run_id,
    p.plan_id,
    p.name as plan_name,
    la.case_id,
    res.status
  from runs r
  join plans p on p.plan_id = r.plan_id
  join latest_attempts la on la.run_id = r.run_id
  join results res on res.execution_id = la.execution_id
)
select
  plan_id,
  plan_name,
  count(*) as cases_executed,
  count(*) filter (where status = 'passed') as cases_passed,
  round(
    100.0 * count(*) filter (where status = 'passed') / nullif(count(*), 0),
    2
  ) as pass_rate_pct
from final_results
group by plan_id, plan_name
order by plan_name;
\`\`\`

Flaky rate for a window (illustrative: cases with both pass and fail attempts in the same run, divided by cases executed). Label dashboard numbers illustrative until you calibrate on your history.

\`\`\`sql
with attempt_pivot as (
  select
    e.run_id,
    e.case_id,
    bool_or(res.status = 'passed') as any_pass,
    bool_or(res.status in ('failed', 'error')) as any_fail
  from executions e
  join results res on res.execution_id = e.execution_id
  join runs r on r.run_id = e.run_id
  where r.started_at >= now() - interval '28 days'
  group by e.run_id, e.case_id
)
select
  case_id,
  count(*) as runs_seen,
  count(*) filter (where any_pass and any_fail) as flaky_runs,
  round(
    100.0 * count(*) filter (where any_pass and any_fail) / nullif(count(*), 0),
    2
  ) as flaky_rate_pct
from attempt_pivot
group by case_id
having count(*) filter (where any_pass and any_fail) > 0
order by flaky_rate_pct desc, runs_seen desc;
\`\`\`

Plan coverage against the catalog belongs in a view over \`plan_items\` and tags, not a cached integer on the plan row. Cached integers drift after imports.

## Where A TMS Model Differs From A CI Warehouse

A TMS schema captures QA intent: which steps applied, which defects block a release, which attachments a human inspected. A CI results warehouse is an append-only analytics store for high-volume automation history, shard matrices, and long-range flake trends. You often need both.

When load and performance work enters the picture, keep those shapes in a dedicated design rather than overloading \`executions\` with virtual-user metrics. The sibling write-up on [load testing platform data model schema design](/blog/load-testing-platform-data-model-schema-design) shows how arrival rates, scenarios, and thresholds differ from case attempts. Cross-link build ids or environment hashes so functional and load incidents share a timeline without merging tables early.

Practical split: TMS owns case versions, plans, manual work, defect links, and curated imports; the warehouse owns raw job attempts, duration histograms, and infra dimensions; shared keys include \`commit_sha\`, \`pipeline_run_id\`, and \`project_id\`. Import summaries into TMS for release gates; leave full attempt grain in the warehouse.

## Joining Result Timestamps To Lead Time And Defect Metrics

Release managers ask how long defects stay open relative to the failing result that discovered them. Keep honest clocks: \`results.recorded_at\` (discovery), tracker \`created_at\` / \`resolved_at\` (cycle time), and \`defect_links.linked_at\` (association lag). For correlation patterns between QA signals and delivery speed, use the approach in [QA metrics for lead time and defect correlation](/blog/qa-metrics-lead-time-defect-correlation). Preserve timestamptz values and never overwrite \`recorded_at\` when someone edits a comment.

Illustrative join:

\`\`\`sql
select
  dl.external_id as defect_id,
  res.recorded_at as failed_at,
  d.created_at as defect_created_at,
  d.resolved_at as defect_resolved_at,
  extract(epoch from (d.created_at - res.recorded_at)) / 3600 as hours_to_file,
  extract(epoch from (d.resolved_at - res.recorded_at)) / 3600 as hours_fail_to_resolve
from defect_links dl
join results res on res.result_id = dl.result_id
join defect_mirror d on d.tracker = dl.tracker and d.external_id = dl.external_id
where res.status in ('failed', 'error')
  and dl.unlinked_at is null;
\`\`\`

\`defect_mirror\` is a local cache of tracker fields. The TMS is not the system of record for defect state, but mirrored columns keep reporting alive when the tracker API is down.

## Failure Story: Pass Rate Looked Fine, Release Was Not

Symptom: a release dashboard showed a 96% plan pass rate (illustrative) for the checkout plan two hours before launch. Support still caught a payment regression in the first hour of traffic.

Wrong theory: leadership blamed missing automated coverage and asked for more UI tests without inspecting the schema. The plan had plenty of cases. Automation was green in CI.

Actual cause: the importer collapsed Playwright retries into a single execution row and stored only the final \`passed\` status. A payment case failed on attempt 1 and passed on attempt 2. The TMS never saw the failure, so defect linking never fired, and the flaky-rate view stayed quiet. Separately, two manual cases still pointed at an older \`case_version_id\` with outdated coupon labels; testers marked \`blocked\`, and the dashboard excluded blocked from the pass-rate denominator while still counting those items as planned coverage.

Fix: emit one \`executions\` row per attempt with unique \`(run_id, case_id, attempt_number)\`. Recalculate plan pass rate from latest attempts while showing flake badges from earlier fails. Show executed, passed, failed, blocked, and skipped as separate columns. Backfill defect links for failures hidden by retries in the previous fourteen days of reports (illustrative window). On the next run the payment case lit up as flaky, and the gate required a linked defect or an explicit waive before publishing green. Pass rate without attempt grain is a vanity number.

## Operational Guardrails For Teams And Agents

Encode invariants as constraints plus repository assertions so AI agents cannot simplify them away: \`attempt_number >= 1\` unique with run and case; plan items pin \`case_version_id\`; results reference executions 1:1; imports are idempotent on an external natural key; \`tenant_id\` is denormalized onto event tables.

\`\`\`yaml
name: tms-schema-smoke
on:
  pull_request:
  push:
    branches: [main]
jobs:
  migrate-and-query:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Install dependencies
        run: npm ci
      - name: Apply migrations
        run: npm run db:migrate
      - name: Run schema contract tests
        run: npm test -- -t 'tms-schema'
      - name: Upload migration logs
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: migrate-logs
          path: logs/migrate/
\`\`\`

Contract tests should insert a case, bump a version, lock a plan pin, import a tiny JUnit fixture twice, and assert execution count stays stable. Query helpers that accept \`project_id\` must still filter \`tenant_id\` from the session.

## Catalog Hygiene And Daily Workflow

Deprecate cases instead of deleting them when they have executions. Soft-delete catalog rows if needed; never hard-delete cascades into results. Put tags in a \`case_tags\` junction, keep priority on the executed version (with a denormalized current priority for UI), and record suite membership \`added_at\` / \`removed_at\` if you must answer what Smoke contained for an old release.

Daily flow: author a case from \`draft\` to \`ready\`; build a plan with pinned versions; import automation into a run keyed by pipeline id; finish remaining items manually with step-scoped attachments; link defects; review pass rate, flakes, and open links before sign-off. Migrate spreadsheet TMSs in layers and mark uncertain history as \`executor_type = 'imported'\` rather than inventing attempt fiction.

## Frequently Asked Questions

### Do I need separate tables for manual and automated results?

No. Use one \`executions\` and \`results\` pair with an \`executor_type\` discriminator and optional automation metadata columns or a side table for job ids. Separate tables force every dashboard to union streams and invite divergent status enums. Keep attempt grain identical so flake math does not change meaning between manual retests and CI retries. If automation carries huge payloads, store them as attachments or in the CI warehouse, not as a second verdict model.

### How should we handle renamed tests from Playwright or JUnit?

Do not rename \`case_key\` to match the new title. Add or update a row in \`external_case_map\` so the new external id points at the existing \`case_id\`. Optionally store the latest observed title as a non-identity field for search. If you lack a map and auto-create cases from titles, you will split history on every refactor. Prefer an explicit key in test annotations when your framework allows custom annotations or tags.

### When does a plan item pin a case version versus tracking latest?

Pin when the plan is a release gate or audit artifact. Tracking latest is acceptable for an open exploratory cycle where authors still edit steps daily, but convert to pins before lock. Mixed mode creates confusion: pin at lock time in a single transaction that copies \`current_version_id\` into \`plan_items.case_version_id\` for every item. After lock, catalog edits must not mutate those pins.

### Can one schema serve both TMS workflows and long-term CI analytics?

It can start that way for small volumes, then strain under matrix jobs and multi-year retention. Use the TMS model for intent, manual work, defects, and curated imports; offload ultra-high-cardinality CI attempts to a warehouse shaped for analytics. Share identifiers so you can join when needed, and keep load-test metrics in their own model rather than overloading case attempts. Clear boundaries beat a single mega-table that satisfies no query well.
`,
};
