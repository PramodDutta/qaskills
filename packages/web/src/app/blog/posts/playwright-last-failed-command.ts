import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Last Failed Command',
  description:
    'playwright last failed command: rerun only the previous Playwright failures locally and in CI. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright last failed command',
  keywords: [
    'playwright last failed command',
    'playwright test last failed',
    'rerun failed playwright tests',
    'playwright last run failures',
    'agent smallest failing test',
    'ci rerun failed specs',
    'playwright failure cache',
  ],
  relatedSlugs: [
    'playwright-cli-debug-tests-traces-agents-guide-2026',
    'playwright-retries-flaky-test-handling-guide',
    'playwright-ci-github-actions-complete-guide-2026',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/test-cli',
    'https://playwright.dev/docs/running-tests',
    'https://playwright.dev/docs/test-retries',
  ],
  repoEvidence: ['seed-skills/playwright-cli-agent-loop/SKILL.md', 'packages/web/package.json'],
  content: `The playwright last failed command reads the failure set saved by the prior Playwright run, then selects only those tests for a new run. Use it after a real failing run in the same workspace. In CI, preserve and inspect the last-run file, reject an empty selection, and fall back to the full suite when state is absent.

## What Does Playwright Last Failed Command Control?

The playwright last failed command controls test selection for the next Playwright process. It does not rerun a failure inside the same process, heal a test, or prove that the whole suite now passes.

The official [Playwright command line reference](https://playwright.dev/docs/test-cli) defines \`--last-failed\` as selecting only prior failures. It also documents a last-run JSON file under the output directory and an option to choose another file.

That saved file is the key input, not the current Git diff or a scan of old reports. If the file belongs to another branch, project, or browser set, its test IDs may no longer describe the fault under review.

The normal local use is short and direct. Run the target, make an evidence-backed fix, invoke the saved failure set, then widen the scope to the affected file or project.

\`seed-skills/playwright-cli-agent-loop/SKILL.md\` states this order as part of its agent loop. It asks the agent to run the exact failure, inspect a trace or call log, make a focused change, use \`--last-failed\`, and then run the wider affected scope.

The command is valuable because it preserves focus when several tests failed in one prior run. It is not a substitute for the [Playwright debug and trace guide](/blog/playwright-cli-debug-tests-traces-agents-guide-2026), which helps explain why those tests failed.

This selection also does not replace retries. A retry repeats a test during one run and classifies its outcome, while the saved failure command starts a later run from prior state.

Treat zero selected tests as a fact that needs an explanation, not as automatic success. The prior run may have passed, written its state elsewhere, cleaned the output directory, or never started.

The [QA skills directory](/skills) includes related workflows, but this command should remain a small proof step. Its result says the recorded failures now pass or fail under the new run settings.

A trustworthy playwright last failed command record therefore names the source run, saved file, selected test IDs, current settings, and result. Those details stop a quick green rerun from being read as full release proof.

## How Does Playwright Test Last Failed Work?

Playwright test last failed reads the runner's saved list and matches those identities against the tests collected now. It then runs the selected tests with the current command options and current source code.

By default, current Playwright writes the state to \`<outputDir>/.last-run.json\`. The same command reference provides \`--last-failed-file <file>\` and the \`PLAYWRIGHT_LAST_RUN_OUTPUT_FILE\` environment variable for an explicit path.

An explicit path helps CI because jobs often clear \`test-results\` or run steps from new containers. It also lets the pipeline publish one small state file separately from traces, videos, and HTML reports.

Selection happens after Playwright has loaded its config and collected tests. A renamed title, removed project, changed file path, or different grep filter can make a saved identity impossible to select.

Current options still matter on the second invocation. If the first run used Chromium but the rerun starts all projects, the evidence no longer answers the same browser question.

Pass the same config, project, shard assumptions, and meaningful environment data to both runs. Do not copy secret values into the evidence record; save only the names and safe values needed to explain selection.

The [running tests guide](https://playwright.dev/docs/running-tests) shows file, project, headed, UI, and debug controls for current runs. These controls can narrow a known scope without any saved state.

That makes a file or grep filter a sound fallback when the failed test is known but the last-run file is gone. The fallback should be marked as a different selection method rather than labeled as \`--last-failed\`.

The [flaky test handling guide](/blog/playwright-retries-flaky-test-handling-guide) explains why a passing repeat needs context. A later pass may show a good fix, a random timing change, or a different test setup.

The playwright last failed command is an observation and execution tool, not a final assertion by itself. CI must still check selected count, exit status, report contents, and the wider suite rule.

## Rerun Failed Playwright Tests: Repository Evidence

To rerun failed playwright tests as this repository expects, begin with \`seed-skills/playwright-cli-agent-loop/SKILL.md\`. Its core rule says to minimize each run with file names, grep, projects, and last-failed mode before using the full suite.

The file provides an npm script that maps to \`playwright test --last-failed\`. It also shows the focused line reporter form, which keeps agent output short while the normal artifact settings retain deeper proof.

The documented loop puts the same failed test before the saved set. That first focused rerun confirms the fix against the exact browser, title, and path that supplied the error.

After \`--last-failed\` passes, the loop runs the affected file. This wider step catches nearby tests that were not in the saved list but share a fixture, helper, page object, or changed product code.

The file warns against treating a retry pass as proof. That warning applies here too, because both retries and later invocations can turn red into green without identifying the cause.

\`packages/web/package.json\` supplies the second local contract. Its \`test:e2e\` script resolves the installed Playwright test CLI and runs \`test\`, while \`test:post-flow\` builds, runs unit checks, and then invokes E2E.

Use those package-owned scripts for the wider check instead of inventing an unrelated command. The saved failure step may call the CLI directly, but the final status should still match the repository's supported test entry.

The package file also keeps unit and E2E stages distinct. A last-failed browser pass cannot repair a failed build or unit suite, and CI should not skip those earlier gates.

The [Playwright CI guide](/blog/playwright-ci-github-actions-complete-guide-2026) gives the larger pipeline setting. Within that flow, save the prior list before cleanup and attach it beside the rerun report.

A playwright last failed command is most useful when its narrow status is labeled correctly. Call it a focused verification, then record which wider checks ran before merge.

## When Should QA Teams Use Playwright Last Run Failures?

Playwright last run failures are useful after a repeatable failing invocation has produced a valid state file. They save time when one edit needs quick proof across the exact failures already seen.

An agent should use this mode after it has read the first error and retained a trace, screenshot, or call log. Rerunning too soon can replace useful failure data before anyone has inspected it.

It also fits local work where the same checkout, output directory, and config stay in place. The saved identities are most reliable when only the intended code fix changed between runs.

Use a file path when every test in one spec should run regardless of prior status. Use \`-g\` when one known title is the smallest target and no saved file is needed.

Use project filters when the defect belongs to one browser, device, or setup. Pair the project with the saved mode when the first run and rerun must stay on the same target.

Use retries to classify transient results within one invocation. The official [retry guide](https://playwright.dev/docs/test-retries) distinguishes passed tests, flaky tests that pass on retry, and tests that fail all retries.

Use the full suite after shared code changes, uncertain selection, stale state, or a missing prior file. A narrow rerun can prove the known fault, but it cannot find failures that the old run never selected.

The [Playwright practices article](/blog/playwright-testing-best-practices-2026) helps set that wider scope. It is safer to spend extra run time than to claim broad confidence from a stale set.

Avoid this command as the first test on a fresh CI runner unless a prior state file was restored on purpose. A new runner has no sound local history from which to select.

The playwright last failed command works best as one rung in a clear ladder: exact test, prior failures, affected scope, then required suite. Each rung answers a larger question and keeps its own report.

## Agent Smallest Failing Test: Failure Modes and Diagnostics

An agent smallest failing test should be selected from real evidence, not guessed from a changed filename. The prior report must identify the test, project, path, and error before the agent chooses its first rerun.

The main failure mode in CI is missing state. A prior step may remove the output directory, run in another container, or publish only the HTML report while discarding \`.last-run.json\`.

Check file presence and parse the saved result before invoking the command. Record its checksum and safe path so later steps can show that they used the intended input.

The second failure mode is silent zero selection. Tests may have been renamed, a project may be absent, or current grep and shard options may exclude every saved identity.

Use a machine-readable reporter or list step to count selected tests. Do not infer selection from exit code zero because an empty run can finish without proving the original failure.

Stale state creates another risk. A file copied from the main branch may point at failures unrelated to the current pull request, while a cached green state may hold no failures at all.

Product faults still fail when the same app behavior remains wrong under a valid rerun. Test defects include bad fixtures, weak waits, renamed titles, and a harness that reads the wrong state path.

Environment faults include missing browser binaries, changed service URLs, lost credentials, and resource pressure. Those faults need their own label because repeating only the prior test does not make the environment comparable.

The [debug workflow](/blog/playwright-cli-debug-tests-traces-agents-guide-2026) should remain available when the rerun fails differently. Compare traces and setup facts before changing selectors or timeouts.

A good diagnostic record explains why each test was selected and why any saved test was not. The playwright last failed command then becomes reviewable instead of an opaque speed trick.

## CI Rerun Failed Specs: Evidence and CI Assertions

CI rerun failed specs should retain the prior failure list, selected IDs, rerun report, and fallback decision. These four facts show what the focused step knew and what it actually proved.

Run the first failing invocation and state capture in a job where failure is allowed to continue to evidence steps. Preserve the original nonzero status even when the next focused run passes.

If jobs are separate, upload the explicit last-run file with a short retention period. Download it into a known path and pass that path with \`--last-failed-file\` rather than relying on an output directory guess.

The first code example mirrors the agent loop in \`seed-skills/playwright-cli-agent-loop/SKILL.md\`. It saves both statuses and does not let the shell stop before the focused rerun.

\`\`\`bash
set +e
npx playwright test --project=chromium --reporter=json > prior-run.json
prior_status=$?
set -e

test -f test-results/.last-run.json
npx playwright test \
  --last-failed \
  --project=chromium \
  --reporter=list
rerun_status=$?

printf 'prior=%s rerun=%s\n' "$prior_status" "$rerun_status"
test "$prior_status" -ne 0
exit "$rerun_status"
\`\`\`

This sample expects the first run to fail because it models a repair check. A routine pipeline should not force a known failure merely to use last-failed mode.

The second example records the decision data around the package-owned E2E entry. Its zero-selection branch runs the full script from \`packages/web/package.json\` and labels the reason.

\`\`\`typescript
type RerunDecision = {
  sourceFile: string;
  priorFailures: string[];
  selectedTestIds: string[];
  fallback: 'none' | 'missing-state' | 'zero-selection' | 'stale-state';
  rerunExitCode: number | null;
};

const decision = await loadLastRun('test-results/.last-run.json');

if (!decision || decision.selectedTestIds.length === 0) {
  await recordFallback(decision ? 'zero-selection' : 'missing-state');
  await run('pnpm', ['--filter', '@qaskills/web', 'test:e2e']);
} else {
  await run('npx', ['playwright', 'test', '--last-failed', '--reporter=json']);
}
\`\`\`

Do not overwrite the first report with the rerun report. Give each file a distinct name and attach the state file so a reviewer can map input to result.

Keep the initial failure status in a summary even when policy lets a verified fix proceed. A red-then-green chain is useful engineering history and may reveal a flaky test over time.

The [CI setup guide](/blog/playwright-ci-github-actions-complete-guide-2026) covers caches and browser setup. Do not put last-run state in a broad shared cache, since branch and config boundaries are easy to cross.

A playwright last failed command CI gate passes only when selected count is positive, the focused run is green, and the required wider fallback or suite also meets policy. No single zero exit should bypass that chain.

## Playwright Failure Cache Comparison Table

A playwright failure cache is a small selection file, not a test artifact cache for browsers or dependencies. Its trust depends on where it came from, which config wrote it, and whether current tests still match.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| \`--last-failed\` | Recheck failures saved by the prior run | Failure file, selected IDs, rerun report, and status | State is missing, stale, or selects nothing |
| File or grep filter | Select a known scope without saved state | Command, file or title, project, and report | Manual filter omits a related failure |
| Retries | Classify a result inside one invocation | Attempt history, trace, and final class | A flaky pass is treated as a fix |
| Full suite | Restore broad confidence after a focused check | Suite report, config, build, and environment facts | Cost leads teams to skip it without policy |

The saved mode is fastest when its input is current and complete. A file filter is clearer when the failure name is known but the state file cannot cross a job boundary.

Retries answer whether a test result changes across attempts in one run. They do not create the same proof as a source edit followed by a new invocation.

The full suite remains the final choice when shared setup changed or state cannot be trusted. It can also refresh the saved list for a later focused debugging loop.

Use the [skills page](/skills) to find test workflow guidance, then tie cache policy to repository scripts. A playwright last failed command should never invent its own meaning for a missing file.

Record cleanup rules as part of the matrix decision. Delete state after the branch or job completes, and never carry it into an unrelated release check.

## How Do You Implement Playwright Last Failed Command?

Implement the playwright last failed command as a guarded sequence with named inputs and outputs. The aim is a fast check that cannot pass merely because its prior state disappeared.

1. Run the known failing scope with the same config, project, environment class, and output directory planned for the later focused invocation.
2. Save the first report and last-run file before any cleanup, then record the first exit status, failed test IDs, source commit, and config hash.
3. Inspect the failure evidence, make only the supported code change, and rerun the exact test before reading the wider saved set.
4. Invoke \`npx playwright test --last-failed\` with matching project options, then count selected tests and retain a separate report.
5. Fall back to the affected file or full repository E2E script when state is missing, stale, invalid, or selects no current test.
6. Run the required wider suite, publish both reports and the fallback reason, then remove branch-specific state from the runner.

Keep a controlled example with two tests, where one passes and one fails. The saved rerun should select only the failed identity and report a count of one.

Rename that failed test in a negative case and verify the harness detects zero selection. The fallback should run instead of marking the job green.

Repeat the check with a different project filter and require a clear mismatch result. This proves that browser scope belongs in the evidence contract.

Run the package's supported E2E command after the focused check. The [best practices guide](/blog/playwright-testing-best-practices-2026) gives reasons to keep tests isolated while still widening confidence after shared edits.

Use the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli) for hands-on inspection when a trace needs a live page. Keep that manual session separate from the runner state used for CI proof.

Finish by deleting copied state and checking that the next fresh job takes the expected fallback path. A clean runner test is the best defense against hidden dependence on old output.

## Frequently Asked Questions

### What is the safest way to use playwright test last failed?

Use it only after a real prior run in the same code and config context, then verify the saved file and selected count. Keep the first report before rerunning. After the focused pass, run the affected file or required suite so the small selection is not mistaken for broad release proof.

### How do you verify rerun failed playwright tests?

Create two stable tests where one fails, then inspect the saved failure list before the next invocation. The second run must select exactly that failed test and produce its own report. Fix the fixture, rerun the saved set, and confirm both the positive count and zero exit status.

### When should a QA team choose playwright last run failures?

Choose it during a tight repair loop when the prior state is current, the same workspace remains available, and several known failures need quick proof. Prefer a file, grep, or project filter when state is absent. Use the full suite when shared code changed or selection trust is weak.

### What causes failures in agent smallest failing test?

Common causes are stale test IDs, renamed titles, changed project filters, missing browser setup, and an agent that guessed scope before reading the first report. Keep the original trace and command. A changed error or zero selection should pause code edits until the runner state and environment are checked.

### Which evidence should ci rerun failed specs retain?

Retain the first report, last-run file, selected test IDs, both exit statuses, source commit, config and project names, rerun report, and fallback reason. Redact secrets while keeping safe environment labels. This set proves which failures entered the check, what ran later, and why CI widened or stopped.

### How should CI handle playwright failure cache?

Store it as a short-lived job artifact tied to one commit and config, not as a shared dependency cache. Verify its path and checksum after download, reject empty selection, and remove it after use. The [retry guide](/blog/playwright-retries-flaky-test-handling-guide) should govern flaky results separately from saved selection.

## Conclusion

The playwright last failed command is safe when the prior file is current, selected count is positive, both reports remain visible, and a clear rule widens coverage when state is weak. Adopt it after controlled failure, rename, missing-file, project-mismatch, and fresh-runner cases all take the planned path.

Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused verification workflow. Use the [QA skills directory](/skills) to choose the next wider check before treating the rerun as release evidence.`,
};
