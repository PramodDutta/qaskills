import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Max Failures CI',
  description:
    'playwright max failures ci: cap noisy CI runs while preserving the first useful failure. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright max failures ci',
  keywords: [
    'playwright max failures ci',
    'playwright maxfailures config',
    'stop playwright after failure',
    'ci fail fast browser tests',
    'playwright max failures flag',
    'preserve first failure evidence',
    'large e2e suite failure cap',
  ],
  relatedSlugs: [
    'playwright-test-config-options-complete-reference',
    'playwright-ci-github-actions-complete-guide-2026',
    'ci-fail-fast-vs-continue-on-error-jobs',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/test-cli',
    'https://playwright.dev/docs/test-configuration',
    'https://playwright.dev/docs/api/class-testconfig#test-config-max-failures',
  ],
  repoEvidence: [
    'packages/web/playwright.config.ts',
    'seed-skills/playwright-cli-agent-loop/SKILL.md',
  ],
  content: `Playwright max failures ci should use a small measured cap that stops waste while retaining the first clear failures, traces, report output, and exit status. Configure the cap only for CI or a focused diagnostic run, then prove run stops at that count. Keep an uncapped control for broad regression discovery.

## What Does Playwright Max Failures CI Control?

Playwright max failures ci controls how many failed tests the runner accepts before ending the current suite run with an error. It limits additional run after the cap, but it does not turn any failed result into a pass.

The official [maxFailures API reference](https://playwright.dev/docs/api/class-testconfig#test-config-max-failures) defines the value for the whole test suite run. After the count is reached, Playwright stops testing and exits with an error, while zero disables the cap.

This setting manages cost and signal volume, not root cause. A cap cannot decide whether failures share one outage, represent split regressions, or come from a damaged test host.

It also cannot guarantee that the earliest failure is the most clear one. Parallel order, project scheduling, dependencies, and retries can change which tests reach the report first.

Use the cap with failure proof already enabled. A stopped suite without traces, screenshots, titles, and report output saves minutes but leaves little support for diagnosis.

The repo config at \`packages/web/playwright.config.ts\` currently sets CI retries to two, workers to one, the dot report, and trace retention on failure. It does not currently set \`maxFailures\`, so adding one would be a deliberate rule change rather than documenting current flow.

Workers set to one make order easier to read for this repo's browser suite. However, retry attempts still affect elapsed time and the point when a test becomes a final failure.

Playwright max failures ci should name the chosen count in job output. Reviewers need to distinguish a run that found three failures and stopped from a complete run that found only three.

The [test config reference](/blog/playwright-test-config-options-complete-reference) covers related runner settings. Keep retries, workers, trace, projects, and the failure cap visible as one rule because they interact during run.

An uncapped local run remains a clear control. It estimates broader impact after the first capped CI record is understood and enough browser capacity is available.

The [QASkills directory](/skills) can supply focused testing workflows for that diagnosis. The cap itself remains an run boundary, not a substitute for failure analysis or suite health.

## How Does Playwright Maxfailures Config Work?

Playwright maxfailures config accepts a nonnegative number in \`defineConfig\`. Setting \`maxFailures: process.env.CI ? 3 : 0\` caps CI at three final test failures while leaving normal local runs uncapped.

The runner counts failed tests across the resolved suite. When it reaches the configured maximum, remaining work is not executed and the run still returns a failing status.

The [Playwright config guide](https://playwright.dev/docs/test-configuration) shows config as the shared home for runner options. A conditional value is preferable when local investigation needs wider coverage than pull-request CI.

The command line can override this rule for one run. According to the [test CLI reference](https://playwright.dev/docs/test-cli), \`--max-failures=N\` stops after N failures and \`-x\` stops after the first.

A command override is clear for a focused diagnostic because it leaves committed rule unchanged. Print the full command so the file makes the active cap reviewable.

Playwright max failures ci interacts with retries in a way teams must test. A test that fails once and passes on retry is reported as flaky rather than a final failed test, so it should not be assumed to consume the cap like a final failure.

Projects and shards also define scope. Each split Playwright run applies its own cap, so four shards with a cap of three can expose up to twelve failed tests before all jobs stop.

Do not describe that as a global cap unless orchestration cancels sibling shards and reports the combined result. The runner option alone has no cross-run counter.

Observation means recording the order, cap, unrun rest, and run status. Assertion means proving a known suite stops at the intended final failure count and still retains expected files.

The config value should be a plain constant or a narrowly parsed host variable. Reject missing, negative, fractional, or nonnumeric input rather than silently converting an invalid CI setting to zero.

Playwright max failures ci works best with stable test identifiers. Report output should include project, file, title, retry, and shard so duplicate names cannot blur the sequence.

The [CI guide](/blog/playwright-ci-github-actions-complete-guide-2026) provides the larger job context. Keep this setting owned by the browser command, with orchestration cancellation tested as a split concern.

## Stop Playwright After Failure: Repository Evidence

Stop Playwright after failure flow must be mapped to what the repo already configures. The file \`packages/web/playwright.config.ts\` supplies the real test directory, file pattern, project, worker rule, retries, report, and trace mode.

Its \`testDir\` points to \`./e2e\`, and \`testMatch\` selects files ending in \`.e2e.ts\`. A cap test must use that resolved collection rather than an invented folder that proves no repo flow.

The config enables \`fullyParallel\`, but sets one worker under CI. This combination permits tests to be scheduled independently while the single CI worker keeps browser run serial in this project.

The current \`forbidOnly\` rule protects CI from focused tests being committed. A failure-cap change must retain that rule because stopping noise cannot justify silently running an incomplete suite.

Retries are two in CI and zero locally. Proof should therefore record retry indexes, since the cap concerns final failed tests rather than every failed attempt.

The trace mode is \`retain-on-failure\`. This is the correct baseline for Playwright max failures ci because stopped runs need files for each failure that reached final status.

The planned config line adds \`maxFailures\` without changing any of those current settings. Review it as one new boundary and avoid unrelated worker or retry edits during the same experiment.

The second repo path, \`seed-skills/playwright-cli-agent-loop/SKILL.md\`, teaches a small proof loop. It says to run the smallest target, inspect trace or screenshot proof, fix only what proof supports, and rerun the exact failure.

That workflow prevents the cap from becoming a reason to guess. The first stopped run narrows the set, while the agent loop validates each root cause with an exact target.

The skill also treats a retry pass as insufficient proof. A flaky first attempt remains proof and should not be erased merely because the final test status did not consume the cap.

Playwright max failures ci should preserve that distinction in its report. Store attempts, final status, and cap decisions separately so flake investigation survives a green retry.

Use the [CI fail-fast comparison](/blog/ci-fail-fast-vs-continue-on-error-jobs) for job-level rule. Playwright's cap stops tests inside one runner run, while workflow fail-fast can cancel split jobs.

## When Should QA Teams Use CI Fail Fast Browser Tests?

QA teams should use CI fail fast browser tests when continued run is expensive and early failures are likely to share one blocking cause. Examples include a dead web server, failed authentication bootstrap, invalid deployment, or missing browser dependency.

A smoke lane can reasonably stop after one failure when every later case depends on the same login or host. Its purpose is rapid right to run, not broad defect sampling.

A large regression lane often needs a small cap above one. Three or five failures can show whether the issue is isolated while preventing hundreds of similar timeouts from consuming the entire runner budget.

Use a known healthy control before adopting the setting. Record complete-suite duration, first-failure time, file size, and distinct failure count across several representative bad runs.

The cap should be high enough to reveal common clusters and low enough to avoid repeated noise. Choose it from measured suite flow rather than copying another repo's number.

Do not use a cap to hide ordinary flake. A flaky suite needs locator, state, data, or host repair, while stopping early only reduces how much instability becomes visible.

Do not use it as the only merge gate for wide refactors. Run an [uncapped scheduled or post-merge lane](/blog/playwright-ci-github-actions-complete-guide-2026) when distinct failures could exist beyond the pull-request cap.

A locator assertion is better when the issue is one uncertain element. A focused CLI command is better when an engineer already knows the failed title and needs one quick trace.

An MCP record is appropriate only when an external agent invokes the test workflow and needs structured results. It should carry the same cap, project, set, and file facts rather than inventing new status semantics.

Playwright max failures ci is especially clear after host prechecks. Verify the server, database, credentials, and browser install first so infrastructure faults receive direct messages before test failures begin.

The [Playwright practices guide](/blog/playwright-testing-best-practices-2026) helps split stable user checks from runner controls. Good assertions improve signal quality before any cap limits its volume.

CI fail fast browser tests need an owner and review date. As suite size, shard count, and average failure cost change, the original cap can become too small or too permissive.

## Playwright Max Failures Flag: Failure Modes and Diagnostics

The Playwright max failures flag can fail rule in two opposite directions. A low value hides distinct regressions, while a high value spends CI time after one shared outage already explains the run.

Reproduce the low-cap risk with three fixed failing tests that have different causes. Set the cap to one, then confirm that only the first final failure is reported and later cases remain unexecuted.

That result proves the mechanism, not that one is the right production value. Compare it with a cap of three and an uncapped run to see the information cost.

Reproduce the high-cap risk with several tests that all depend on one broken bootstrap. Measure elapsed time and duplicate error output after the first conclusive failure.

Product failures come from application flow that violates a user promise. Test defects include stale selectors, shared state, wrong expectations, and fixture leaks that produce false failed results.

Host limitations include server startup faults, capacity pressure, down dependencies, and browser installation errors. Prechecks should report these directly instead of letting many tests fail through secondary symptoms.

Retries can make the stopping point look inconsistent. Record each attempt and final status, then count only the runner's final failed tests when validating the cap.

Parallel workers can also alter ordering. Do not assert one exact first title unless the controlled suite runs with one worker and no project dependency changes.

A grep or file filter creates another scope risk. A command may stop correctly within a narrow set while the report is later described as proof for the whole suite.

Always print set arguments beside the cap. Include config path, project, shard, grep, file paths, workers, retries, and report in the run card.

Playwright max failures ci should never combine \`--pass-with-no-tests\` with a cap validation case. An empty set can produce no cap proof while appearing operationally quiet.

The agent loop in \`seed-skills/playwright-cli-agent-loop/SKILL.md\` says to rerun the exact failure before widening scope. Apply that method after the capped result, but keep the original CI attempt and files.

Use the [config options reference](/blog/playwright-test-config-options-complete-reference) when a failure points toward retry or project interactions. The diagnostic question remains whether the cap stopped at the intended final failure count.

## Preserve First Failure Evidence: Evidence and CI Assertions

Preserve first failure proof by treating files as part of the cap contract. A cap that stops run correctly but discards the first trace is not ready for CI adoption.

Report output should show chronological final failures and their retry history. Include project, file, full title, worker, shard, duration, and final error summary.

Retain traces and screenshots for failed tests under paths that encode test identity and retry. Generic filenames can be overwritten when several failures occur before the cap.

Record the configured cap and its source. State whether it came from \`playwright.config.ts\`, a command argument, or an host parser, because precedence matters during reproduction.

Record the skipped rest as a count when the report can derive it. Avoid labeling those tests passed, failed, or covered because they did not execute.

The run exit status must remain nonzero after the cap triggers. A wrapper that swallows the runner status defeats the merge gate even when Playwright behaves correctly.

Playwright max failures ci should attach a compact JSON run card as well as human report output. Structured proof makes cap, failures, and unrun tests easier to compare across changes.

Do not upload secret-bearing state files without review. Traces and screenshots can contain user data, tokens, or private page content, so CI retention needs access and expiry controls.

Run a controlled suite containing passing tests before, between, and after fixed failures. The assertion can then prove exactly which tests ran and where scheduling stopped.

Use one worker for the mechanism test. Production may use more, but a serial control gives stable proof that the counter stops at the chosen number.

Then repeat with production worker settings and assert bounded flow rather than one exact order. Some already-started work may finish near the cap in a parallel run.

The [Playwright CI guide](/blog/playwright-ci-github-actions-complete-guide-2026) can own file upload details. This article's gate requires the file path and status to survive whatever CI provider stores them.

Preserve first failure proof from flaky attempts too. The final runner status and cap counter can stay distinct from the historical fact that an earlier attempt failed.

## Large E2e Suite Failure Cap Comparison Table

A large e2e suite failure cap needs different values for fast right to run, sampled diagnosis, local breadth, and sharded run. The table compares those choices without claiming one universal number.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| maxFailures 1 | Stop after the first failure for a focused diagnostic or smoke gate | Failure order, cap value, skipped remainder, traces, and final exit status | One early defect hides independent regressions |
| small failure cap | Collect a limited sample of failures in a large regression suite | Distinct root causes, cap value, skipped count, artifacts, and elapsed time | The selected count is not based on measured suite behavior |
| unlimited local run | Inspect broad impact when browser capacity and time are available | Complete result set, duration, attempts, artifacts, and environment details | A shared outage creates repeated noise and wasted time |
| shard-aware cap | Apply and report a cap per shard without claiming a global threshold | Shard id, local cap, sibling status, combined failures, and job status | Per-process counts are mistaken for one suite-wide cap |

The one-failure option is appropriate for narrow diagnostics and dependency-heavy smoke tests. It is usually too restrictive for a wide regression lane where several distinct areas can break.

A small cap gives a sample, but the sample must be reviewed by root cause. Five failures caused by one down service provide less coverage information than two unrelated product regressions.

An unlimited local run is valuable after the first proof is understood. It should use the same commit and host where possible, or differences must be stated in the diagnosis.

A shard-aware cap requires aggregation. Each shard report should state its own cap, and the final job should avoid presenting the sum as complete suite coverage.

Playwright max failures ci can use different caps by lane when those values are explicit. Hidden conditional logic makes reproduction harder and encourages misleading comparisons.

The [QASkills blog](/blog) links neighboring CI controls and test strategy. Keep this matrix in the runbook so changes to suite size trigger a review rather than silent cap drift.

## How Do You Implement Playwright Max Failures CI?

Implement Playwright max failures ci by adding one conditional config value, preserving current failure files, and validating the stop count against a fixed test set. Start with a temporary command override before committing a repo-wide cap.

1. Read \`packages/web/playwright.config.ts\` and record its test selection, retries, workers, reporter, trace mode, and current absence of a failure cap.
2. Run a deterministic failing file with \`--max-failures=1\`, then confirm the command, project, cap, first failure, skipped remainder, trace, and nonzero status.
3. Repeat the same controlled file with a proposed CI cap such as three, while keeping one worker for stable threshold evidence.
4. Add a conditional \`maxFailures\` value only after measured runs justify it, and preserve \`forbidOnly\`, retries, reporter, workers, and trace settings.
5. Run an uncapped control to identify hidden independent failures, then document which lane provides broad coverage beyond the pull-request cap.
6. Repeat with production shards and worker settings, aggregate per-process counts honestly, and review artifact redaction plus retention.

The first code example shows the planned config change in the real repo shape. It adds one line and leaves the current CI proof settings visible.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\\.e2e\\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  maxFailures: process.env.CI ? 3 : 0,
  reporter: process.env.CI ? 'dot' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
\`\`\`

The example is a proposed rule, not a claim about the current file. Measure a suitable count for the repo before making that line part of its release gate.

The second example begins with the focused command from the Playwright agent loop. It retains a trace and prints the shell status without masking the failure.

\`\`\`bash
set +e
npx playwright test e2e/failure-cap.e2e.ts \
  --project=chromium \
  --workers=1 \
  --max-failures=1 \
  --trace=retain-on-failure \
  --reporter=line
status=$?
set -e

printf 'playwright_status=%s cap=1 project=chromium\\n' "$status"
test "$status" -ne 0
test -d test-results
\`\`\`

Use an isolated fixture file with named fixed failures for this check. Do not point the mechanism test at random current defects because its expected count and order would drift.

The success case contains only passing tests and must finish with status zero. It proves that merely configuring a cap does not force a failure or truncate healthy work.

The controlled failure case includes more final failures than the selected cap. Assert the nonzero status, cap count, first trace path, and unrun rest from report proof.

Use the [Playwright CLI skill](/skills/Pramod/playwright-cli) to inspect an exact stopped failure when needed. The same project and test title should be rerun before any broad suite restart.

Playwright max failures ci should be rolled out to one lane first. Compare duration, files, missed distinct failures, and reviewer usefulness before applying it across every shard.

## Frequently Asked Questions

### What is the safest way to use playwright maxfailures config?

Set a measured nonzero cap only in CI, keep local runs uncapped, and print the active value with set arguments. Preserve retries, report output, traces, and nonzero exit status. Validate the cap on fixed failures before using it on a large suite whose order can change.

### How do you verify stop playwright after failure?

Create more fixed failing tests than the selected cap and run them serially with one project. Require exactly the planned final failure count, proof for each reached failure, a known unrun rest, and a nonzero run status. Then repeat under production workers with bounded order assertions.

### When should a QA team choose ci fail fast browser tests?

Choose them for costly suites where early failures often prove a shared blocker, such as down login or deployment startup. Keep an uncapped lane for broad discovery and avoid using the cap to conceal flake. Prechecks should identify host faults before many browser tests report secondary symptoms.

### What causes failures in playwright max failures flag?

Common causes include an invalid cap, CLI and config precedence, retries, parallel scheduling, project scope, shards, and wrapper scripts that swallow status. Empty grep or file selections can also fake quiet flow. Record every set and runner option before diagnosing the cap itself.

### Which evidence should preserve first failure evidence retain?

Retain project, file, title, retry, shard, failure order, configured cap, skipped rest, trace or screenshot path, and final exit status. Keep the original failed attempt even after a retry passes. Redact traces and state files according to their page data and CI access rule.

### How should CI handle large e2e suite failure cap?

CI should tune caps by lane using measured failure cost and reviewer needs, not one copied number. Report per-shard thresholds separately, aggregate outcomes honestly, and schedule uncapped coverage where distinct regressions matter. Revisit the cap as suite size, worker count, and failure patterns change.

## Conclusion

Playwright max failures ci is safe when it reduces repeated work without erasing the first clear proof or overstating coverage. Adoption requires a measured cap, fixed stop-count test, failure order, skipped rest, retained traces, retry history, shard scope, and nonzero final status.

Start with a command override and one controlled failing file before changing shared config. Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow to your CI lane.
`,
};
