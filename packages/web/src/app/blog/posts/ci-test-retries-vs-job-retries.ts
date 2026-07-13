import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Retries vs Job Retries in CI',
  description:
    'Compare test retries vs job retries in CI, contain flaky failures, preserve evidence, and choose the cheapest recovery boundary for each fault.',
  date: '2026-07-13',
  category: 'Comparison',
  content: `
# Test Retries vs Job Retries in CI

A browser assertion times out after 30 seconds. Repeating that one test may recover in another 30 seconds. Restarting its CI job may spend eight minutes rebuilding a container, seeding a database, and executing 400 tests that already passed. Yet if the runner lost its network route, repeating only the assertion is useless. Retry policy begins with identifying the failed boundary, not choosing an arbitrary number.

Test retries and job retries answer different questions. A test retry asks whether the same test passes in a fresh test-worker context. A job retry asks whether the entire CI unit succeeds after provisioning and setup happen again. Both can reduce interruption from transient faults. Both can also hide defects, inflate compute, and destroy the evidence needed to fix recurring failures.

This guide builds a practical decision model for senior SDETs and platform engineers. The aim is not zero retries. It is a controlled policy in which each retry has a diagnosed purpose, a bounded cost, and a visible outcome.

## The failure boundary determines the retry boundary

A retry should reset the smallest layer capable of removing the suspected transient state. Going smaller leaves the fault intact. Going larger discards healthy work and adds unrelated variability.

Consider a checkout test that fails because a button animation delayed actionability. The browser worker is healthy, the application is reachable, and the fixture exists. A test-level retry gives the assertion another clean execution and classifies the case as flaky. Now consider the same test failing because Docker could not pull the browser image. No test process started, so a test retry cannot run. The job, or perhaps the workflow, is the first meaningful recovery unit.

| Observed failure | State likely contaminated | Smallest useful recovery | Why |
|---|---|---|---|
| Element becomes actionable late | Current test or browser context | Test retry | Recreates test state without repeating compilation |
| One test leaks tenant data | Worker process or test fixture | Test retry with worker restart | Isolates the leaking execution while retaining job setup |
| Database service never becomes ready | Job services and setup | Job retry | Every test would encounter the same unavailable dependency |
| Runner loses disk or network | CI runner | Job retry on a new runner | In-process repetition inherits the broken host |
| Build artifact is corrupt | Producer job or workflow | Upstream job retry | Consumer test retries reuse the same bad artifact |
| Assertion consistently exposes a race | Product behavior | No automatic recovery | Repetition would conceal a reproducible defect |

The table is diagnostic, not a routing algorithm. A 502 could originate in an application race, a test environment, an ingress rollout, or an exhausted runner. Attach request IDs, runner metadata, service health, and test traces before assigning the symptom to a retry tier.

## What a test retry actually resets

Framework semantics matter. Playwright Test discards the worker process after a test failure and starts another worker for the next test or retry. Hooks run again in the new worker. A retry is therefore more substantial than rerunning the final assertion, but it does not rebuild the CI runner or redo steps outside the test command.

The result categories are valuable: a test that passes first time is passed, one that fails first and passes on retry is flaky, and one that exhausts retries is failed. Preserve that distinction in reports. If CI publishes only the final green status, the organization has converted known instability into invisible debt.

Configure different policies for pull requests and diagnostic jobs rather than scattering retry loops inside tests:

\`\`\`ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

One retry is often enough to separate an intermittent case from a deterministic failure without tripling runtime. That is a starting point, not a universal standard. A suite with expensive destructive scenarios may permit no retries. A low-cost compatibility matrix may tolerate one while the team gathers data. Avoid setting a high global count because a small group of unstable tests will dominate wall time.

Do not put retries around individual assertions merely because they fail. Playwright assertions already retry their condition until the assertion timeout. Retrying the whole test is for rerunning scenario state, not extending a wait by another syntax. Likewise, a loop around a payment submission can create duplicate orders unless the system supports an idempotency key and the test verifies it.

## What a CI job retry repeats

A job rerun repeats the steps defined for that job and may trigger dependent jobs, depending on the CI platform and action chosen. It usually provisions a new runner, restores caches, downloads artifacts, starts services, installs dependencies, and invokes the test process again. That broader reset is exactly why it can recover from runner or service failures. It is also why it is expensive.

GitHub Actions does not turn every failed job into an automatic built-in retry by adding a generic “retries” key. Failed jobs can be rerun through the UI, CLI, or REST API. If an organization automates reruns, the automation must avoid recursion and should select only infrastructure-class failures. The official REST endpoint for failed jobs in a workflow run is concrete enough to wrap in a guarded operations tool:

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

: "\${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "\${OWNER:?OWNER is required}"
: "\${REPO:?REPO is required}"
: "\${RUN_ID:?RUN_ID is required}"

curl --fail-with-body --request POST \\
  --header "Accept: application/vnd.github+json" \\
  --header "Authorization: Bearer \${GITHUB_TOKEN}" \\
  --header "X-GitHub-Api-Version: 2022-11-28" \\
  "https://api.github.com/repos/\${OWNER}/\${REPO}/actions/runs/\${RUN_ID}/rerun-failed-jobs"
\`\`\`

The endpoint returns 201 when the rerun is created. The caller needs Actions write permission. Keep the decision outside the failed workflow when possible, because a workflow that reruns itself can create a costly feedback loop. Record the original run ID, rerun attempt, classifier reason, and approving rule.

Job retries also change the evidence. Temporary files from the old runner disappear. Service container logs may be gone unless they were uploaded in an always-running cleanup step. A good workflow collects diagnostics before it becomes eligible for rerun. Recovery without evidence is operationally convenient but technically uninformative.

## Cost and signal differ sharply

Suppose a job spends two minutes installing dependencies, one minute migrating a database, and seven minutes running 500 tests. One test fails at minute nine. A test retry might add seconds. A failed-job rerun can add ten minutes and repeat 499 successful tests. The difference becomes material across shards and browser projects.

| Decision dimension | Test retry | Job retry |
|---|---|---|
| Repeated scope | One failed test, usually with hooks | Setup, services, command, and all selected tests |
| Best target | Scenario-local nondeterminism | Runner, service, cache, or orchestration faults |
| Typical evidence | Trace, screenshot, test attempt metadata | Provisioning logs, service logs, runner diagnostics |
| Risk of duplicate side effects | Confined to retried scenario | Applies to every non-idempotent job step |
| Runtime amplification | Proportional to failed tests | Proportional to full failed jobs |
| Classification value | Identifies a framework-reported flaky test | Shows the job can pass in a newly provisioned environment |
| Main blind spot | Cannot repair pre-test infrastructure | Can obscure which test or setup stage was transient |

Expected cost can be estimated without pretending the numbers are universal. For each retry tier, multiply observed eligibility rate by average repeated duration and execution volume. Add queue delay separately because congested CI can make a five-minute job rerun block a developer much longer. Compare that cost with the saved human investigation time and the risk of allowing a flaky pass.

This is why a broad “retry everything twice” rule is rarely defensible. It treats a cheap locator delay and a broken Kubernetes namespace as the same event.

## A classifier before a rerun

Automatic job recovery should require a machine-readable reason. Start with failure sources that have stable signatures: runner eviction, image pull failure, service health timeout, or a provider outage response. Keep product assertions, snapshot differences, schema mismatches, and security failures ineligible.

Build the classifier from structured outputs where available. Exit codes alone are weak because test commands often use one code for every failure. JUnit properties, Playwright JSON, service health results, and CI annotations offer better inputs. A useful decision record includes the failed stage, detected signature, whether tests began, previous run attempt, and selected recovery scope.

\`\`\`ts
type Failure = {
  testsStarted: boolean;
  runAttempt: number;
  log: string;
  failedTests: number;
};

export function recoveryFor(failure: Failure): 'none' | 'test' | 'job' {
  if (failure.runAttempt > 1) return 'none';

  const infrastructureSignatures = [
    /no space left on device/i,
    /failed to pull image/i,
    /runner lost communication/i,
  ];

  if (
    !failure.testsStarted &&
    infrastructureSignatures.some((pattern) => pattern.test(failure.log))
  ) {
    return 'job';
  }

  if (failure.testsStarted && failure.failedTests > 0) return 'test';
  return 'none';
}
\`\`\`

This deliberately conservative example does not call the rerun endpoint. It produces a recommendation that another authorized component can enforce. In production, version the rules and test them against a labeled history of incidents. A false infrastructure classification can greenwash a product regression.

## Preserving failure evidence before recovery

Every retry policy needs an evidence contract. For a test attempt, retain the initial failure trace, console messages, network failures, screenshot, test seed, worker index, and relevant application correlation IDs. For a job attempt, capture runner image, dependency lockfile hash, cache hit status, service readiness output, container logs, and resource pressure.

Upload these artifacts with a condition that runs even after failure. Name them with both the workflow attempt and test retry index. Otherwise the successful attempt can overwrite the original evidence. Retention can be shorter for passing retries than for final failures, but it should be long enough for triage.

Playwright's first-retry trace is useful when the retry itself fails or behaves differently. If you need the original failing execution, choose a trace mode that retains failures, or configure capture according to the investigation question. Confirm artifact behavior in your installed version rather than assuming the label means “first failure.”

The companion [AI flaky test detection guide](/blog/ai-flaky-test-detection-guide) explains how attempt history can feed clustering and ownership. The retry layer should emit that history, not flatten it into a binary result.

## Side effects make retries dangerous

Read-only search scenarios are relatively safe to repeat. Tests that charge cards, send messages, mutate shared fixtures, publish packages, or rotate credentials are different. Before enabling any retry, ask whether the repeated unit is idempotent.

At test level, generate a stable idempotency key for the logical operation and assert that the backend created one resource across attempts. Prefer isolated accounts and cleanup based on unique run identifiers. Never rely on the failed attempt having reached cleanup.

At job level, review every setup and teardown step. A rerun might apply a migration twice, append duplicate seed data, deploy the same revision again, or notify customers twice. Package publishing and production deployment jobs generally need explicit operator control plus platform-native idempotency, not blind automatic reruns.

Load tests deserve special treatment because repeating a job can double traffic while the original load generator is still winding down. The [load testing CI/CD integration guide](/blog/load-testing-ci-cd-integration-guide) covers gates and environment coordination for that workflow. A retry controller must verify that the previous generator has stopped before scheduling another run.

## A rollout policy that does not normalize flakes

Begin by measuring first-attempt outcomes with retries disabled or fully reported. Classify failures for several weeks of representative execution. Then introduce one retry only for an identified tier and compare: developer interruptions, time to signal, compute consumption, and age of unresolved flaky tests.

Set ownership and expiry. A test that becomes flaky should create or update a defect with its first-seen date, recent frequency, affected branches, and evidence link. If it exceeds an agreed threshold, quarantine may protect the main signal, but the quarantine remains a visible failing lane. Retrying is not closure.

For job recovery, cap attempts at the orchestration layer and require a different runner where runner health is implicated. Disable automatic recovery when the same signature rises across many repositories, because that pattern suggests a shared incident. A platform status event is more honest than hundreds of private green reruns.

Finally, audit passed-on-retry results as failures of reliability even if they do not block merging. A green commit and a healthy test system are separate dimensions. Dashboards should show first-pass rate, flaky-pass rate, job-rerun rate, final failure rate, and repeated minutes.

## Matrix and shard failures need ownership rules

A matrix expands one logical check into operating systems, runtimes, browsers, or regions. If one cell fails, rerunning the entire matrix repeats healthy cells unless the platform can target the failed job. That can make job recovery far more expensive than the label suggests. Preserve the matrix coordinates in the classifier and prefer rerunning only the failed cell and its actual dependents.

Sharded test jobs add a different trap. A framework retry stays on the shard that owns the failed test. A job rerun may receive the same shard definition, but timing-based distribution can move tests if the sharding plan is recalculated. Then the rerun is not an exact reproduction. Persist the original test list or shard manifest as an artifact when reproducibility matters.

Dependencies also determine the recovery graph. If an integration job consumed a verified immutable build artifact, rerunning its producer wastes work and introduces the possibility of a different artifact. If the artifact is missing or failed integrity validation, the producer is precisely what must be repeated. Encode artifact digests and provenance so the controller can tell these cases apart.

Ownership should follow the failed boundary. Test flake records go to the team responsible for the scenario or product area. Runner image, cache, and service-start failures go to the CI platform owner. Shared dependency outages should open one incident rather than hundreds of test defects. Clear routing prevents retries from becoming an inbox where every intermittent symptom waits untriaged.

Cancellation is another outcome, not a failure signature. A superseded pull-request run, concurrency-group cancellation, or operator stop should not enter the retry classifier. Repeating canceled work can compete with the newer run that intentionally replaced it. Preserve the platform conclusion separately from test exit status.

Timeouts need stage-specific treatment. A test timeout after a captured trace belongs to test triage, while a job-level timeout during dependency installation points toward runner, registry, or step configuration. A workflow global timeout may terminate healthy jobs because another branch hung. Record which clock expired before selecting recovery.

Finally, test the retry controller itself. Feed it labeled synthetic events for assertions, runner loss, cancellation, permission failure, and exhausted attempts. Verify that it never schedules more than the cap, never retries an ineligible deployment, and emits an auditable reason. Recovery automation is production software, and an incorrect loop can cost more than the flakes it was built to contain.

## Frequently Asked Questions

### Should a test that passes on retry make the CI check green?

That is a release-risk decision. Playwright can report it as flaky while the process still succeeds. Mature teams often allow a small, owned flaky set to remain non-blocking temporarily, but track first-attempt failure separately and enforce an expiry. Critical payment, migration, or security checks may fail the gate on any unsuccessful attempt.

### How many test retries should a pull request use?

Start with zero for trustworthy suites or one while diagnosing known intermittency. More attempts rapidly increase latency and the chance that a genuine probabilistic defect eventually passes. Use observed attempt distributions to justify any higher value, and scope it to the affected project or test group.

### Can a job rerun prove the original failure was infrastructure?

A green rerun does not prove the diagnosis. A successful fresh job is consistent with an infrastructure transient, but it can also occur when product behavior is nondeterministic. Classification needs evidence from the failed attempt, such as a runner disconnect before tests started, not success alone.

### Should setup commands have their own shell retry loops?

Only for operations whose transient modes and idempotency are understood, such as a bounded package download retry. A loop inside a step is a third recovery scope and must have logging, backoff, and a cap. Do not wrap migrations or deployments merely because they sometimes fail.

### What metric reveals excessive retrying fastest?

First-pass success rate paired with repeated CI minutes is more revealing than final pass rate. A stable final pass rate can conceal worsening flakes, while repeated minutes exposes the operational cost. Break both measures down by test, job, repository, and failure signature.
`,
};
