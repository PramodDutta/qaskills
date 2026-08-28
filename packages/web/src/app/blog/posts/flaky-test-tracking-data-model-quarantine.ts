import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Flaky Test Tracking Schema: Quarantine, Ownership, and Retry Budgets',
  description:
    'Design a flaky test tracking schema with quarantine states, ownership routing, and retry budgets so CI flakes stay visible, owned, and bounded.',
  date: '2026-08-28',
  category: 'Reference',
  content: `
# Flaky Test Tracking Schema: Quarantine, Ownership, and Retry Budgets

A flaky test tracking schema is the set of entities, keys, and state transitions that record intermittent failures as first-class data: which test identity flaked, on which attempt, under which retry budget, who owns the quarantine, and what exit criteria allow it back into the blocking suite. Concretely, it stores TestIdentity, ExecutionAttempt, FlakeSignal, QuarantineRecord, OwnerAssignment, and RetryBudget rows so dashboards and CI gates can answer "is this flake known, owned, and still within budget?" without reading raw JUnit blobs on every run.

For QA and test-automation engineers (including those pairing with AI coding agents), this model turns flake chatter into an operable workflow: auto-detect, quarantine with a ticket, route ownership, burn retry budget, and either fix or fail loudly when the budget is exhausted. Pair the warehouse view with [flake rate trending metrics](/blog/qa-metrics-flake-rate-trending) so signal quality and schema design reinforce each other.

## Canonical Entities Your Tracker Must Persist

Treat flake tracking as a domain model, not a spreadsheet of red jobs. Six entities cover nearly every CI policy you will automate later.

| Entity | Purpose | Mutability | Primary consumers |
|---|---|---|---|
| TestIdentity | Stable logical test across renames and moves | Slowly changing | Joins, ownership, quarantine |
| ExecutionAttempt | One run of one identity in one job attempt | Append-only | Flake math, duration, retries |
| FlakeSignal | Derived intermittent pattern over a window | Recomputed | Quarantine candidates, alerts |
| QuarantineRecord | Explicit policy that softens or skips blocking | State machine | CI gates, PR comments |
| OwnerAssignment | Team, person, or service accountable | Slowly changing | Escalation, digests |
| RetryBudget | Cap on automatic re-runs and accounting of spend | Mutable counters + caps | Job wrappers, cost control |

Keep facts and policy apart. ExecutionAttempt never stores "quarantined=true" as the only truth. Quarantine is a policy overlay evaluated at gate time. That separation lets you replay history after you fix a buggy classifier.

A practical TypeScript shape for the domain (warehouse columns can mirror these fields):

\`\`\`ts
type TestIdentityId = string; // content-addressed or surrogate UUID

interface TestIdentity {
  id: TestIdentityId;
  suitePath: string;          // logical suite, e.g. "checkout.cart"
  titleNormalized: string;    // whitespace/case folded title
  identityHash: string;       // hash(suitePath + "\\0" + titleNormalized)
  filePath?: string;          // fragile locator, optional
  sourceLine?: number;        // fragile locator, optional
  framework: 'playwright' | 'vitest' | 'jest' | 'junit' | 'other';
  repo: string;
  firstSeenAt: string;        // ISO-8601
  lastSeenAt: string;
}

interface ExecutionAttempt {
  attemptId: string;
  identityId: TestIdentityId;
  pipelineRunId: string;
  jobRunId: string;
  attemptNumber: number;      // 1..N within the job policy
  status: 'passed' | 'failed' | 'timed_out' | 'skipped' | 'cancelled';
  durationMs: number;
  startedAt: string;
  errorFingerprint?: string;  // normalized message hash
  shardId?: string;
  branch: string;
  commitSha: string;
}

interface FlakeSignal {
  signalId: string;
  identityId: TestIdentityId;
  windowStart: string;
  windowEnd: string;
  passCount: number;
  failCount: number;
  flipCount: number;          // consecutive status changes across attempts/runs
  flakeScore: number;         // 0..1 illustrative score from your classifier
  classifierVersion: string;
}

interface QuarantineRecord {
  quarantineId: string;
  identityId: TestIdentityId;
  state: QuarantineState;
  reason: string;
  ticketUrl?: string;
  createdBy: string;
  ownerTeam: string;
  enteredAt: string;
  expiresAt?: string;
  exitCriteria: ExitCriteria;
  lastReviewedAt?: string;
}

type QuarantineState =
  | 'candidate'
  | 'active'
  | 'fix_in_progress'
  | 'exiting'
  | 'closed_fixed'
  | 'closed_deleted'
  | 'rejected';

interface OwnerAssignment {
  identityId: TestIdentityId;
  ownerTeam: string;
  ownerUser?: string;
  escalationSlackChannel?: string;
  oncallRotationId?: string;
  routingRuleId: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

interface RetryBudget {
  budgetId: string;
  scope: 'test' | 'suite' | 'ci_job';
  scopeKey: string;           // identityId, suitePath, or job name
  maxAttempts: number;
  maxFailFlips: number;
  maxExtraMinutes: number;
  spentAttempts: number;
  spentFailFlips: number;
  spentExtraMinutes: number;
  window: 'job' | 'day' | 'week';
  resetAt?: string;
}
\`\`\`

If an AI coding agent generates importers or migrations from this model, pin \`classifierVersion\` and schema version in every FlakeSignal and QuarantineRecord. Replays without version stamps silently rewrite history.

## Identity Keys That Survive Rename And Move

Most flake systems die when someone renames a \`describe\` block. File path plus line number looks precise and then collapses on the next format. Prefer a logical identity, keep physical locators as hints.

Recommended identity recipe:

1. Normalize suite path: join nested suite titles with \`.\`, collapse whitespace, lower-case if your framework is case-insensitive in display only.
2. Normalize test title the same way. Strip Playwright project or browser suffixes if they are matrix dimensions, not part of the test name.
3. Compute \`identityHash = sha256(suitePath + "\\0" + titleNormalized + "\\0" + repo)\`.
4. Store \`filePath\` and \`sourceLine\` as secondary attributes for IDE deep links, never as the primary key.
5. When a rename is detected (same file/line cluster, new title, high overlap of recent commits touching that file), write an identity alias row instead of inventing a brand-new history.

\`\`\`sql
create table test_identities (
  identity_id uuid primary key,
  repo text not null,
  suite_path text not null,
  title_normalized text not null,
  identity_hash char(64) not null,
  file_path text,
  source_line int,
  framework text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  unique (repo, identity_hash)
);

create table test_identity_aliases (
  alias_id uuid primary key,
  from_identity_id uuid not null references test_identities (identity_id),
  to_identity_id uuid not null references test_identities (identity_id),
  reason text not null,
  detected_at timestamptz not null,
  confidence numeric(4,3) not null,
  check (from_identity_id <> to_identity_id)
);

create index test_identities_file_idx
  on test_identities (repo, file_path);
\`\`\`

What breaks in practice:

| Key strategy | Survives rename? | Survives move? | Good for flakes? |
|---|---|---|---|
| Full title string only | No | Partially | Weak: collisions across suites |
| File + line | No | No | Weak: formatter churn |
| Suite + title hash | Usually | Usually | Strong baseline |
| Suite + title hash + alias graph | Yes, with review | Yes, with review | Production grade |

Playwright reporters often expose \`titlePath\`. Vitest exposes suite nesting differently. Normalize before hashing. When you need to re-run one flaky case locally, use real flags only: Vitest \`-t\` / \`--testNamePattern\`, Playwright \`--grep\` / \`-g\`. Do not invent framework flags in automation scripts your agents copy.

Identity collision handling needs explicit fields, not hope. Two different tests can normalize to the same suite path and title when matrix projects, locale prefixes, or generated titles collapse under folding. Store a \`collisionGroupId\` on TestIdentity when the upsert path detects that a new physical locator (\`filePath\` + \`sourceLine\` cluster) disagrees with an existing identity that already has a different primary file hint. Also store \`disambiguator\` (optional string) drawn from a stable dimension you choose once: Playwright project name only when the same title is intentionally maintained per browser, or a parameterized case id when the title alone is not unique. Never put timestamps or commit SHAs into the identity hash; those guarantee collisions become permanent forks.

When a collision is suspected, write a \`test_identity_collisions\` row with \`left_identity_id\`, \`right_identity_id\`, \`detected_at\`, \`evidence\` (JSON of recent attempt samples), and \`resolution\` (\`pending_review\`, \`merged_alias\`, \`split_with_disambiguator\`, \`false_positive\`). Gate logic must treat \`pending_review\` identities as not safely quarantinable for auto-promotion: open \`candidate\` only, never \`active\`, until a human picks merge versus split. If you merge, create a \`test_identity_aliases\` edge and re-point open QuarantineRecord and OwnerAssignment rows to the surviving identity in one transaction. If you split, bump \`disambiguator\`, recompute \`identity_hash\`, and copy recent ExecutionAttempt foreign keys carefully so FlakeSignal windows do not silently dilute across both ids.

Operational runbook for rename storms after a large suite move: freeze auto-alias merges for that repo for 24 hours, run a report of identities whose \`file_path\` changed while \`identity_hash\` stayed constant versus hashes that appeared with high title similarity (for example Levenshtein on \`title_normalized\` under a 0.15 relative distance and same parent suite). Require two reviewers when alias \`confidence\` is below 0.85. Document the threshold in the classifier config next to \`classifierVersion\` so agents cannot invent a softer merge policy mid-incident.

## Quarantine State Machine And Exit Criteria

Quarantine is not "mute forever." It is a time-boxed policy with an owner and an exit plan. Model it as a state machine your CI gate evaluates.

\`\`\`ts
const transitions: Record<QuarantineState, QuarantineState[]> = {
  candidate: ['active', 'rejected'],
  active: ['fix_in_progress', 'exiting', 'closed_deleted', 'rejected'],
  fix_in_progress: ['active', 'exiting', 'closed_fixed'],
  exiting: ['closed_fixed', 'active'], // bounce back if flakes return
  closed_fixed: [],
  closed_deleted: [],
  rejected: [],
};

interface ExitCriteria {
  minGreenRuns: number;          // e.g. 20 consecutive non-flaky job observations
  maxAllowedFlips: number;       // e.g. 0 flips in the exit window
  requireOwnerAck: boolean;
  requireTicketClosed: boolean;
  maxAgeDays: number;            // hard expiry forces re-decision
}
\`\`\`

Suggested default exit criteria for product UI tests (illustrative, tune per suite risk):

| Suite risk | minGreenRuns | maxAllowedFlips | maxAgeDays | Blocking while active? |
|---|---:|---:|---:|---|
| Smoke / release gate | 40 | 0 | 14 | Soft-fail with required owner comment |
| Extended regression | 20 | 1 | 30 | Non-blocking, still reported |
| Nightly deep suite | 10 | 2 | 45 | Non-blocking |

CI evaluation order that keeps humans sane:

1. Resolve TestIdentity for each attempt in the job.
2. Load active QuarantineRecord for that identity (if any).
3. Compute whether the attempt would have failed the job without quarantine.
4. If quarantined and failed: mark attempt \`failed_quarantined\`, do not fail the required check, emit a PR annotation.
5. If quarantined and the exit criteria window is satisfied: move to \`exiting\` and require one more clean main-branch verification before \`closed_fixed\`.
6. If quarantine expired without fix: auto-escalate owner and optionally restore blocking.

Store every state change as an event. Auditors ask "who muted this?" months later.

Quarantine exit has edge cases that a naive consecutive-green counter will mishandle. Define what counts as a green observation on ExitCriteria with explicit fields: \`countBranchScope\` (\`main_only\` or \`main_and_release\`), \`countJobNames\` (allowlist of required jobs), \`ignoreSkippedAsGreen\` (default true), and \`requireDistinctCommits\` (default true so twenty greens on the same SHA do not satisfy \`minGreenRuns\`). When a quarantined test is \`skipped\` because the whole shard aborted, do not increment green runs and do not increment flips; record \`observationKind = 'non_evaluable'\` on a side table or event payload so dashboards do not look artificially quiet.

If flakes return during \`exiting\`, bounce to \`active\` and reset the green streak, but preserve \`enteredAt\` and extend \`expiresAt\` only through an explicit \`expiry_extension\` event with actor and reason. Silent expiry creep is how mute lists return. When \`requireTicketClosed\` is true and the ticket reopens after you reached \`closed_fixed\`, do not auto-reactivate quarantine; open a new \`candidate\` linked via \`reopenOfQuarantineId\` so history stays append-friendly. Partial suite deletions are another exit path: if ingest marks the identity \`last_seen_at\` stale beyond a configured \`deletedAfterDays\` and the file hint no longer exists on default branch, allow transition to \`closed_deleted\` without green runs, still requiring owner ack when \`requireOwnerAck\` is set.

Runbook for stuck \`fix_in_progress\`: after \`slaAckHours * 2\` without a quarantine event, post to \`escalationSlackChannel\`, set \`lastReviewedAt\`, and optionally strip \`ownerUser\` so the team queue no longer looks falsely assigned. For disputed exits (owner claims fixed, gate still sees flips), require a \`classifierVersion\` pin and a link to at least three \`attemptId\` values in the bounce event note. Never clear ExecutionAttempt history to force an exit; fix the product or tighten the test, then let the streak rebuild under the same identity.

\`\`\`sql
create table quarantine_records (
  quarantine_id uuid primary key,
  identity_id uuid not null references test_identities (identity_id),
  state text not null,
  reason text not null,
  ticket_url text,
  created_by text not null,
  owner_team text not null,
  entered_at timestamptz not null,
  expires_at timestamptz,
  exit_min_green_runs int not null,
  exit_max_allowed_flips int not null,
  exit_require_owner_ack boolean not null default true,
  exit_require_ticket_closed boolean not null default true,
  exit_max_age_days int not null,
  last_reviewed_at timestamptz
);

create table quarantine_events (
  event_id uuid primary key,
  quarantine_id uuid not null references quarantine_records (quarantine_id),
  from_state text,
  to_state text not null,
  actor text not null,
  note text,
  at timestamptz not null default now()
);
\`\`\`

## Ownership Routing And On-Call Escalation Fields

Unowned quarantine is invisible debt. Ownership should resolve from code location first, then suite taxonomy, then a default team.

Routing fields worth storing on OwnerAssignment and denormalizing onto QuarantineRecord at create time:

- \`ownerTeam\`: durable team slug (\`payments-qa\`, \`buyer-web\`).
- \`ownerUser\`: optional current assignee for the active quarantine.
- \`codeownersPath\`: matched CODEOWNERS pattern when known.
- \`escalationSlackChannel\`: where day-2 digests post.
- \`oncallRotationId\`: pager or Opsgenie/PagerDuty schedule id for budget exhaustion.
- \`slaAckHours\`: hours until an unacked \`candidate\` or expired quarantine pages the rotation.
- \`routingRuleId\`: which rule created the assignment (for debugging bad routes).

Example CODEOWNERS-aware resolver sketch:

\`\`\`ts
type RoutingInput = {
  filePath?: string;
  suitePath: string;
  codeowners: Array<{ pattern: string; teams: string[] }>;
  suiteTeamMap: Record<string, string>;
  defaultTeam: string;
};

function resolveOwnerTeam(input: RoutingInput): { team: string; ruleId: string } {
  if (input.filePath) {
    for (const row of input.codeowners) {
      if (minimatch(input.filePath, row.pattern) && row.teams[0]) {
        return { team: row.teams[0], ruleId: \`codeowners:\${row.pattern}\` };
      }
    }
  }
  const suitePrefix = input.suitePath.split('.')[0] ?? '';
  if (input.suiteTeamMap[suitePrefix]) {
    return {
      team: input.suiteTeamMap[suitePrefix],
      ruleId: \`suite:\${suitePrefix}\`,
    };
  }
  return { team: input.defaultTeam, ruleId: 'default' };
}
\`\`\`

Escalation should be data-driven. When \`RetryBudget\` for a scope is exhausted, or a quarantine sits in \`active\` past \`expiresAt\`, write an \`EscalationEvent\` and notify once per window (dedupe by \`identityId + day\`). Flooding Slack teaches people to ignore flake channels.

## Retry Budgets: Caps, Scopes, And Accounting

Retries hide flakes and burn minutes. A retry budget makes the trade explicit at three scopes:

| Scope | \`scopeKey\` example | Typical cap | Why it exists |
|---|---|---|---|
| test | identity hash / id | 2 extra attempts | Stop infinite per-test reruns |
| suite | \`checkout.cart\` | 10 extra attempts / job | Contain a noisy area |
| ci_job | \`e2e-chromium\` | 15 extra attempts or 20 extra minutes | Protect the whole pipeline |

Accounting rules that keep numbers honest:

1. Only count attempts that ran because of failure or timeout, not scheduled matrix parallelism.
2. Count a fail->pass flip toward \`spentFailFlips\` even if the job ends green.
3. Charge \`spentExtraMinutes\` from wall time of retry attempts only.
4. Reset \`job\` window budgets at job start. Reset \`day\`/\`week\` budgets on a fixed timezone boundary you document.
5. When any scope is exhausted: no more automatic retries; surface the raw failure; open or reopen a QuarantineRecord candidate if flake score is high.

JSON document you can attach to job metadata or store in the warehouse:

\`\`\`json
{
  "budgetId": "budget_e2e_chromium_job",
  "scope": "ci_job",
  "scopeKey": "e2e-chromium",
  "maxAttempts": 15,
  "maxFailFlips": 8,
  "maxExtraMinutes": 20,
  "spentAttempts": 11,
  "spentFailFlips": 6,
  "spentExtraMinutes": 14,
  "window": "job",
  "policyOnExhaustion": "fail_job_and_open_candidate"
}
\`\`\`

Job wrapper pseudopolicy (illustrative):

\`\`\`yaml
# ci fragment: evaluate budgets before scheduling another retry
on:
  workflow_run_attempt:
    evaluate:
      - scope: test
        max_attempts: 2
      - scope: suite
        max_attempts: 10
      - scope: ci_job
        max_attempts: 15
        max_extra_minutes: 20
    on_exhaustion:
      fail_required_check: true
      comment_pr: true
      open_quarantine_candidate: true
\`\`\`

Budgets belong next to flake tracking because quarantine without retry accounting creates two failure modes: teams quarantine everything to save minutes, or teams retry forever and never quarantine. The schema forces a single conversation: spend budget, then decide policy.

Retry budget accounting edge cases show up the first week you turn the caps on. Cancelled attempts after a ctrl-c or runner preemption should not charge \`spentAttempts\` if \`status = cancelled\` and no test body started; charge them if the attempt ran long enough to produce an error fingerprint or exceeded a \`minChargeDurationMs\` you store on the budget policy. Timed-out attempts always charge attempts and extra minutes, and they count as a fail flip when the previous attempt for that identity in the same job passed. Skipped retries scheduled by the framework but never executed (for example shard already marked failed) must not charge; store \`scheduledButNotRun\` on the attempt or omit the row entirely, and document which choice your importer makes.

Nested scopes need deterministic debit order. Evaluate test scope first, then suite, then \`ci_job\`. If the test budget is exhausted, skip further retries for that identity even when the job budget still has headroom. If the job budget is exhausted, freeze retries for all identities in that job, including those still under their per-test caps. Persist a \`RetryBudgetLedger\` row per debit with \`budgetId\`, \`attemptId\`, \`deltaAttempts\`, \`deltaFailFlips\`, \`deltaExtraMinutes\`, and \`decision\` (\`allow_retry\`, \`deny_test_cap\`, \`deny_suite_cap\`, \`deny_job_cap\`, \`deny_quarantine_policy\`). Ledger rows make offline reconciliation possible when two wrappers double-count; the warehouse sum of deltas must match \`spent*\` counters or you emit a \`budget_drift\` alert.

Day and week windows create timezone traps. Store \`resetTimezone\` (IANA name) on the budget and compute \`resetAt\` in that zone, not in the runner's local clock. When a job straddles midnight, charge the window that was active at \`startedAt\` of each retry attempt, not the window at job enqueue time. For matrix children that share one logical \`ci_job\` budget, use a single \`scopeKey\` for the parent workflow job name and pass \`budgetId\` into each shard via env; do not give every shard a fresh 15-attempt cap or you quietly multiply spend by shard count. When reconciliation finds overspend already committed, do not rewrite history: set \`spentAttempts\` to the true sum, mark the budget \`overspent\`, and force \`policyOnExhaustion\` behavior on the next scheduling decision.

## Warehouse Tables And JSON Schema Contracts

Beyond identities and quarantine, persist attempts and signals in append-friendly tables. Partition by \`started_at\` day or week if volume is high.

\`\`\`sql
create table execution_attempts (
  attempt_id uuid primary key,
  identity_id uuid not null references test_identities (identity_id),
  pipeline_run_id text not null,
  job_run_id text not null,
  attempt_number int not null check (attempt_number >= 1),
  status text not null,
  duration_ms int not null,
  started_at timestamptz not null,
  error_fingerprint text,
  shard_id text,
  branch text not null,
  commit_sha char(40) not null
);

create index execution_attempts_identity_started_idx
  on execution_attempts (identity_id, started_at desc);

create index execution_attempts_job_idx
  on execution_attempts (job_run_id, attempt_number);

create table flake_signals (
  signal_id uuid primary key,
  identity_id uuid not null references test_identities (identity_id),
  window_start timestamptz not null,
  window_end timestamptz not null,
  pass_count int not null,
  fail_count int not null,
  flip_count int not null,
  flake_score numeric(5,4) not null,
  classifier_version text not null
);

create table retry_budgets (
  budget_id uuid primary key,
  scope text not null,
  scope_key text not null,
  max_attempts int not null,
  max_fail_flips int not null,
  max_extra_minutes int not null,
  spent_attempts int not null default 0,
  spent_fail_flips int not null default 0,
  spent_extra_minutes int not null default 0,
  window text not null,
  reset_at timestamptz,
  unique (scope, scope_key, window)
);

create table owner_assignments (
  assignment_id uuid primary key,
  identity_id uuid not null references test_identities (identity_id),
  owner_team text not null,
  owner_user text,
  escalation_slack_channel text,
  oncall_rotation_id text,
  routing_rule_id text not null,
  effective_from timestamptz not null,
  effective_to timestamptz
);
\`\`\`

Publish a JSON Schema for ingress events so reporters and agents validate before insert:

\`\`\`json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.local/schemas/execution-attempt-event.json",
  "type": "object",
  "required": [
    "attemptId",
    "identity",
    "pipelineRunId",
    "jobRunId",
    "attemptNumber",
    "status",
    "durationMs",
    "startedAt",
    "branch",
    "commitSha"
  ],
  "properties": {
    "attemptId": { "type": "string", "minLength": 1 },
    "identity": {
      "type": "object",
      "required": ["suitePath", "titleNormalized", "repo", "framework"],
      "properties": {
        "suitePath": { "type": "string" },
        "titleNormalized": { "type": "string" },
        "repo": { "type": "string" },
        "framework": {
          "type": "string",
          "enum": ["playwright", "vitest", "jest", "junit", "other"]
        },
        "filePath": { "type": "string" },
        "sourceLine": { "type": "integer", "minimum": 1 }
      }
    },
    "pipelineRunId": { "type": "string" },
    "jobRunId": { "type": "string" },
    "attemptNumber": { "type": "integer", "minimum": 1 },
    "status": {
      "type": "string",
      "enum": ["passed", "failed", "timed_out", "skipped", "cancelled"]
    },
    "durationMs": { "type": "integer", "minimum": 0 },
    "startedAt": { "type": "string", "format": "date-time" },
    "errorFingerprint": { "type": "string" },
    "shardId": { "type": "string" },
    "branch": { "type": "string" },
    "commitSha": { "type": "string", "minLength": 40, "maxLength": 40 }
  },
  "additionalProperties": false
}
\`\`\`

## Ingest Pipeline From JUnit And Playwright JSON

Build an append-only ingest path. Never update an ExecutionAttempt in place except to repair a confirmed parser bug (and then write a compensating audit row).

Recommended stages:

1. **Collect artifacts** in CI with GitHub Actions \`actions/upload-artifact@v4\` (keep checkout and setup on \`actions/checkout@v4\` and \`actions/setup-node@v4\` when you bootstrap Node importers).
2. **Parse** JUnit XML and Playwright JSON into ExecutionAttempt events. Map retries to \`attemptNumber\`.
3. **Upsert TestIdentity** by \`identity_hash\`; refresh \`last_seen_at\`, file hints, and framework.
4. **Insert attempts** idempotently on \`attempt_id\` (or a natural key of \`job_run_id + identity_hash + attempt_number\`).
5. **Recompute FlakeSignal** for affected identities over rolling windows (for example 7 days and 50 runs, pick one primary window for gates).
6. **Propose quarantine candidates** when flake score crosses threshold and no active quarantine exists.
7. **Refresh RetryBudget spend** from the job's attempt list before the next retry decision (online) and again in the warehouse (offline reconciliation).

Minimal Playwright JSON mapping notes: use the test's full title path for suite/title, preserve project name as a dimension on the job or attempt (browser/project), not inside the identity unless you truly maintain separate tests per project. For JUnit, \`classname\` often carries suite semantics; \`name\` is the title; retries may appear as duplicate rows or as surefire rerun markers depending on the tool.

Importer skeleton:

\`\`\`ts
async function ingestPlaywrightReport(report: PlaywrightReport, ctx: IngestContext) {
  for (const suite of walkSuites(report)) {
    for (const test of suite.tests) {
      const identity = await upsertIdentity({
        repo: ctx.repo,
        suitePath: normalizeSuite(test.titlePath.slice(0, -1)),
        titleNormalized: normalizeTitle(test.titlePath.at(-1) ?? test.title),
        filePath: test.location?.file,
        sourceLine: test.location?.line,
        framework: 'playwright',
      });

      let attemptNumber = 1;
      for (const result of test.results) {
        await insertAttempt({
          attemptId: stableAttemptId(ctx.jobRunId, identity.id, attemptNumber),
          identityId: identity.id,
          pipelineRunId: ctx.pipelineRunId,
          jobRunId: ctx.jobRunId,
          attemptNumber,
          status: mapStatus(result.status),
          durationMs: result.duration,
          startedAt: result.startTime,
          errorFingerprint: fingerprint(result.error),
          branch: ctx.branch,
          commitSha: ctx.commitSha,
          shardId: ctx.shardId,
        });
        attemptNumber += 1;
      }
    }
  }
}
\`\`\`

After ingest, a scheduled classifier can open \`candidate\` quarantines. Humans (or a narrowly scoped bot with team policy) promote \`candidate\` -> \`active\` with a ticket URL. That human gate prevents a bad classifier from silencing a real regression overnight.

If you want a ready-made starting point for QA automation skills that generate importers, gate scripts, and review checklists, install from [qaskills.sh](https://qaskills.sh) with the qaskills CLI and adapt the flake-tracking workflows to your warehouse.

## CI Gates That Read The Model

The schema only pays rent when required checks consult it. A typical pull-request gate:

1. Download the job's parsed attempt summary (or query the warehouse with a short freshness SLA).
2. For each failed identity without an \`active\` / \`fix_in_progress\` quarantine, fail the check.
3. For quarantined failures, pass the required check but post a PR comment listing identity, owner, ticket, expiry, and budget spend.
4. If retry budget exhausted mid-job, fail immediately with a budget exhaustion report.
5. If a quarantine is past \`expiresAt\`, fail or warn per policy, and escalate.

Illustrative gate output as markdown in a PR comment:

\`\`\`ts
function buildPrComment(rows: GateRow[]): string {
  const lines = [
    '### Flake quarantine gate',
    '',
    '| Test | Owner | State | Expires | Budget spend |',
    '|---|---|---|---|---|',
  ];
  for (const r of rows) {
    lines.push(
      \`| \${r.title} | \${r.ownerTeam} | \${r.state} | \${r.expiresAt ?? 'n/a'} | \${r.spentAttempts}/\${r.maxAttempts} |\`,
    );
  }
  lines.push('', 'Failed identities without quarantine block merge.');
  return lines.join('\\n');
}
\`\`\`

Keep the required GitHub check name stable. Flapping check names break branch protection. Prefer one check that reads the model over five ad hoc scripts that disagree.

Auto-quarantine should usually create \`candidate\` rows plus a draft PR comment, not silently mute. Promotion to \`active\` needs an owner and ticket. Teams that skip that step recreate the classic muted-test graveyard.

## Failure Story: The Soft-Pass That Hid A Race

Symptom: a checkout end-to-end test failed about one in eight runs on \`main\`, always green after a single retry. The dashboard showed "stable" because the job conclusion was pass. Mobile web releases started seeing intermittent empty carts in production the same week.

Wrong theory: the team blamed shared staging inventory and sprinkled \`waitForTimeout\` calls. Retries still "fixed" CI. Someone proposed quarantining the entire cart suite.

Actual cause: the flaky test tracking data was incomplete. Retries were not stored as ExecutionAttempt rows, so FlakeSignal flip counts stayed near zero. Quarantine candidates never opened. A client-side race between discount hydration and add-to-cart only appeared under shard contention. Production traffic hit the race; CI hid it behind an unbounded per-test retry.

Fix: persist every attempt, cap the test retry budget at one extra attempt, open a quarantine \`candidate\` when fail->pass flips appear inside a job, and require an owner before \`active\`. With attempts visible, the race reproduced under Playwright \`--grep\` on the cart title with parallel workers. The product fix serialized hydration; the test dropped the arbitrary timeout. Flake score collapsed, quarantine exited through \`closed_fixed\`, and cart defects stopped correlating with "green" CI days.

## What People Get Wrong About Quarantine

The common mistake is treating quarantine as a boolean mute flag on the test case. That design cannot express expiry, ownership, exit criteria, or budget interaction. It also cannot answer whether a green job spent half its minutes babysitting known flakes. If you only need mute, you do not have flake tracking; you have a skip list.

A second mistake: computing flake rate only on final job status. Final status erases the evidence. Your schema must prefer attempt-level truth, then roll up. Use the attempt stream when you [fix flaky tests](/blog/fix-flaky-tests-guide); otherwise you will "fix" symptoms that were never measured.

A third mistake: identity keyed by file and line. Formatters and refactors then look like miracle cures (history vanishes) or sudden epidemics (new identities appear). Hash suite plus title, keep aliases, and review merges when confidence is high.

## Operating Cadence For Teams Using AI Agents

Give agents narrow, schema-shaped tasks instead of "clean up flakes":

1. Generate a migration for a new column on \`quarantine_records\` with a backfill plan.
2. Write an importer for one reporter format and golden fixtures.
3. Propose \`candidate\` quarantines from last week's FlakeSignal table as a markdown report, not as direct \`active\` writes.
4. Open tickets with identity hash, sample failing attempt ids, and owner team already resolved.
5. Draft a PR comment body from gate rows without changing branch protection.

Humans keep promotion authority, expiry extensions, and budget cap changes. Agents accelerate mechanical work around a stable flaky test tracking schema.

Weekly review query themes (illustrative):

- Identities with highest \`flip_count\` and no quarantine.
- Quarantines past 50% of \`maxAgeDays\` without \`fix_in_progress\`.
- Jobs with retry budget utilization above 80% for three consecutive days.
- Owner teams with the largest count of \`active\` quarantines per thousand tests.

Those reviews keep the model honest. Schema without cadence becomes an expensive skip list.

## Frequently Asked Questions

### How is a flaky test tracking schema different from storing raw CI logs?

Raw logs are evidence; the schema is the operable contract. Logs can explain a single failure, but they do not give you stable TestIdentity keys, quarantine state transitions, ownership routing, or retry budget accounting across weeks. A flaky test tracking schema extracts attempts and policy into queryable entities so gates and dashboards share one definition of "known flake." Keep logs as artifacts linked from attempts. Do not pretend a log index is a quarantine system.

### Should quarantine automatically skip the test in the framework config?

Prefer gate-level quarantine over permanent \`test.skip\` in source. Framework skips hide the test from attempt streams and quietly rot. Gate-level policy still runs the test (or runs it in a non-blocking lane), records ExecutionAttempt rows, burns or preserves retry budget per policy, and preserves exit criteria. Use source skips only when the product surface is gone, and close the QuarantineRecord as \`closed_deleted\` so history stays coherent.

### How do retry budgets interact with quarantined tests?

Decide explicitly and store the decision on the QuarantineRecord or budget policy. Common pattern: quarantined identities get at most one retry for signal collection, and spend counts toward the suite and job budgets so muted flakes cannot monopolize the runner. When the job budget is exhausted, stop retrying even quarantined tests and report raw results. Never give quarantined tests unlimited retries; that recreates hidden cost with nicer names.

### What is the minimum viable model if we only have a week to ship?

Ship TestIdentity (suite plus title hash), ExecutionAttempt (every retry), QuarantineRecord with states \`candidate\`, \`active\`, and \`closed_fixed\`, OwnerAssignment with team only, and a single ci_job RetryBudget. Add FlakeSignal as a nightly batch view. Wire one PR gate that reads active quarantines and posts owners. That thin slice already beats mute lists and final-status flake myths, and it leaves clear extension points for aliases, escalation SLAs, and per-test budgets.
`,
};
