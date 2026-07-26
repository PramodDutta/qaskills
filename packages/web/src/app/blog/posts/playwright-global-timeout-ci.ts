import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Global Timeout CI',
  description:
    'playwright global timeout ci: cap total browser-suite time without masking test causes. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'playwright global timeout ci',
  keywords: [
    'playwright global timeout ci',
    'playwright globaltimeout config',
    'cap total e2e runtime',
    'playwright ci job timeout',
    'global versus test timeout',
    'browser suite deadline',
    'diagnose global timeout exceeded',
  ],
  relatedSlugs: [
    'playwright-test-config-options-complete-reference',
    'playwright-test-timeout-exceeded-after-hook-fix',
    'playwright-ci-github-actions-complete-guide-2026',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/test-timeouts',
    'https://playwright.dev/docs/api/class-testconfig#test-config-global-timeout',
    'https://playwright.dev/docs/ci',
  ],
  repoEvidence: ['packages/web/playwright.config.ts', 'packages/web/package.json'],
  content: `Playwright global timeout CI configuration should cap the complete Playwright run above its measured normal duration and below the CI job limit. Keep per-test deadlines unchanged so individual causes remain visible. Validate the cap with a controlled suite overrun, reporter output, elapsed time, and final job status.

## What Does Playwright Global Timeout CI Control?

Playwright global timeout CI controls the maximum wall-clock duration of one complete Playwright test run. It spans projects, workers, retries, fixtures, tests, and runner activity rather than timing one test body.

This outer runner deadline answers a different operational question from a test timeout. It stops a suite that is globally stalled even when no single test exceeds its own local allowance.

The official [Playwright timeout guide](https://playwright.dev/docs/test-timeouts) separates test, expect, action, navigation, fixture, hook, and global limits. Teams should preserve that distinction in configuration, logs, and incident review.

A global cap does not diagnose why the suite became slow. Per-test errors, trace evidence, worker logs, the last completed test, and infrastructure data still identify the failing boundary.

It also does not replace the CI platform timeout. The platform needs a larger outer limit so Playwright can report its own global failure and the job can retain evidence.

Playwright global timeout CI works best as a final safety boundary after normal duration has been measured across representative shards and browser projects. Guessing a small round number can convert harmless variance into recurring suite-wide failures.

The release condition is not merely a nonzero configuration value. A controlled overrun must stop at the intended layer, preserve useful reporter output, and leave enough job time for artifact handling.

For broader runner settings, use the [Playwright configuration reference](/blog/playwright-test-config-options-complete-reference). This guide focuses only on the relationship among suite, test, startup, and job deadlines.

## How Does Playwright Globaltimeout Config Work?

Playwright globaltimeout config uses the top-level \`globalTimeout\` field in \`defineConfig\`. A zero or absent value leaves the whole run without that Playwright-level deadline, while a positive millisecond value bounds the run.

The official [TestConfig globalTimeout reference](https://playwright.dev/docs/api/class-testconfig#test-config-global-timeout) defines this value for the entire test run. It is independent from the default timeout assigned to each test.

Set the field conditionally when local development benefits from interactive debugging without a suite cap. CI should receive an explicit value derived from expected duration and its outer job budget.

Configuration loads before test discovery and execution. Once the run crosses the deadline, Playwright terminates the remaining work and reports that the global timeout was exceeded.

Observation means recording configured values and actual elapsed time. Assertion means proving the process fails for the suite-wide reason, rather than because the controlled test hit its individual deadline first.

Keep the global cap higher than the longest expected complete run, including retries and project ordering. Keep it lower than the platform limit by enough time for reporters, trace packaging, and CI upload steps.

Playwright global timeout CI should not be multiplied blindly after every failure. If one test always consumes most of the budget, fix or isolate that test while retaining a defensible suite deadline.

The [CI guide](https://playwright.dev/docs/ci) documents installation and execution patterns across providers. Provider-specific timeout syntax remains outside Playwright and should be reviewed beside this runner value.

## Cap Total E2e Runtime: Repository Evidence

To cap total E2E runtime in this repository, begin with \`packages/web/playwright.config.ts\`. That file defines the current test directory, base URL, retries, workers, reporter, browser project, and web server used by the web package.

The configuration already varies retries and workers through \`process.env.CI\`. A CI-only \`globalTimeout\` follows that existing environment boundary without changing local runner behavior.

The current reporter is \`html\` in CI and \`list\` locally. This matters because a controlled deadline test should verify the configured reporter still produces its expected terminal signal and retained output.

The file also gives the web server a 120-second startup timeout. That startup setting has a separate purpose and must not be mistaken for the whole-suite cap.

The second evidence file, \`packages/web/package.json\`, defines \`test:e2e\` as \`playwright test\`. The new setting therefore reaches the existing command without a separate wrapper or hidden shell timer.

That manifest pins the package scripts reviewers and CI operators actually invoke. Recording the script name beside the global deadline makes the result reproducible from repository state.

The current project has one Chromium entry, but duration can change as projects or shards are added. Recalculate the suite budget after such changes rather than assuming the original cap still represents normal work.

Use the [CI setup guide](/blog/playwright-ci-github-actions-complete-guide-2026) to align platform steps and caches. Playwright global timeout CI remains one layer inside that larger job.

Repository evidence supports where to place the option and which command exercises it. Runtime evidence must still prove elapsed behavior because source review cannot show how quickly a given CI executor runs.

## When Should QA Teams Use Playwright CI Job Timeout?

A Playwright CI job timeout should provide the final platform safety limit when a process, container, upload, or command outside Playwright stops making progress. It should remain longer than the Playwright suite deadline.

Use both layers when browser tests are costly, run in shared infrastructure, or can hang because of environmental failures. The inner runner cap yields Playwright-specific diagnostics, while the outer job cap guarantees resource reclamation.

A practical prerequisite is a duration baseline from successful and retry-heavy runs. Choose a Playwright global cap above expected suite variance, then reserve a clear cleanup interval before the job limit.

The control case deliberately exceeds the Playwright cap while each test retains a larger local timeout. The runner should report the global deadline before the CI platform sends its own termination signal.

Use a test timeout when one scenario, hook, or fixture needs a bounded lifecycle. Use an action or expect timeout when a single browser operation or assertion needs a focused deadline.

Use the web-server timeout when application startup is the concern. Startup failures should identify the server boundary instead of consuming the complete suite allowance.

A locator assertion remains the correct tool for user-visible readiness. Raising a suite deadline cannot make an incorrect selector, missing element, or broken response become valid.

The [timeout failure guide](/blog/playwright-test-timeout-exceeded-after-hook-fix) helps separate test and cleanup issues. Apply it before treating every slow test as a suite-capacity problem.

Playwright global timeout CI should be introduced only when owners know which layer will fire first. Write those expected inequalities in configuration comments or operations documentation.

## Global Versus Test Timeout: Failure Modes and Diagnostics

Global versus test timeout failures become confusing when every deadline uses the same duration. Reviewers then cannot tell whether one scenario failed locally or the full run exhausted its budget.

A product failure occurs when an application action or response never reaches its expected state. Its evidence should remain tied to the affected test, even if enough such failures later consume the global cap.

A test defect occurs when a hook leaks work, a fixture waits without a bound, retries repeat a deterministic error, or a test extends its own timeout to conceal slowness. Fix that local cause instead of increasing the suite limit.

An environment limitation occurs when CPU starvation, slow browser installation, constrained networking, or an unhealthy web server expands many tests together. Compare shard duration and worker utilization before blaming product behavior.

The primary risk is a suite cap that expires before reporters preserve useful evidence. Leave headroom inside the CI job, use reporter output that flushes during execution, and record the last completed test.

Another risk is using the cap to hide one consistently slow test. Plot per-test duration or inspect the slowest entries so a larger global allowance does not become the only response.

If the process ends near one test's deadline, inspect its error text and configured local timeout. If it ends near the suite cap with several active workers, the global signal should be explicit.

If the CI platform reports cancellation before Playwright emits a global error, the deadline order is wrong. Increase the job limit or reduce the Playwright cap while preserving a realistic suite budget.

The [testing practices guide](/blog/playwright-testing-best-practices-2026) favors isolated, observable tests. Those properties also improve timeout diagnosis because each failure retains a clear owner and state boundary.

## Browser Suite Deadline: Evidence and CI Assertions

A browser suite deadline needs a reviewable record of configured deadlines, elapsed suite time, last completed test, reporter output, and CI job status. Without those fields, a cancellation cannot be assigned confidently.

Create a dedicated controlled fixture that runs longer than a small test-only global cap but remains below the CI platform limit. Do not slow the production suite or depend on an external service to create the overrun.

Override the global value for this contract check through a separate configuration or environment-controlled test config. The normal release cap should remain based on real suite duration.

Ensure the controlled test's local timeout exceeds the test global cap. Otherwise, Playwright correctly reports a test timeout and the intended suite-wide branch never executes.

Capture monotonic start and finish times around the command. Compare elapsed duration with a tolerance for process startup and shutdown rather than requiring an exact millisecond match.

Require a nonzero command exit, text identifying the global timeout, and absence of the CI provider's forced-cancellation marker. The last completed test should remain visible in the chosen reporter output.

Keep traces or screenshots only when they help a separate browser failure. A global timeout contract can usually rely on runner output and timing without creating sensitive page artifacts.

Playwright global timeout CI also needs one normal control run beneath the cap. That result proves the configuration does not reject the expected focused suite under ordinary conditions.

Publish the compact timing record even when the contract passes. Trend data can reveal that normal duration is approaching the cap before releases begin failing.

## Diagnose Global Timeout Exceeded Comparison Table

Diagnose global timeout exceeded results by matching the observed layer to its intended scope. The same word "timeout" can describe four distinct controls with different owners.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| \`globalTimeout\` | Bound every project, retry, worker, and test in one run | Configured cap, elapsed run, last test, reporter result | Reporters lose time needed to preserve evidence |
| Test timeout | Bound one test with its fixture and hook lifecycle | Test title, local timeout, steps, trace, error | A suite problem is misread as one slow test |
| Web-server timeout | Bound application startup before tests begin | Server command, health output, startup duration | Startup delay consumes unrelated suite analysis |
| CI job timeout | Reclaim the complete job after inner tools finish | Provider event, job duration, step status | Platform termination hides Playwright diagnostics |

The Playwright cap should normally fire before the CI job cap. The difference between them is an operational reserve, not unused waste.

Test timeouts should remain small enough to identify local stalls. Extending every test until it equals the global value destroys the diagnostic hierarchy.

The web-server limit should reflect startup behavior only. If startup succeeds and later becomes unhealthy, browser assertions and server logs should reveal that different failure.

The CI job row also covers post-test uploads and cleanup. Those steps need their own bounded behavior, but Playwright cannot manage work after its process exits.

Use the table during incident review and record which clock expired first. Playwright global timeout CI is successful only when that order matches the designed deadline hierarchy.

## How Do You Implement Playwright Global Timeout CI?

Implement Playwright global timeout CI by selecting a measured cap, adding it at the top configuration level, and proving both an ordinary run and a controlled overrun. Keep the platform job limit larger.

1. Read \`packages/web/playwright.config.ts\` and \`packages/web/package.json\`, then record the current command, projects, retries, workers, reporter, and startup limit.
2. Measure representative successful and retry-heavy CI durations before selecting the whole-suite deadline.
3. Add a CI-only \`globalTimeout\` above expected complete duration and below the provider's job limit.
4. Run a focused normal suite and require success beneath the cap without changing individual test limits.
5. Trigger an isolated controlled overrun whose test timeout is larger, then require the global error and nonzero exit.
6. Save timing and reporter evidence, verify upload headroom, and document the deadline order for future reviews.

The configuration change is deliberately small. Thirty minutes is an example value and must be replaced when repository duration data supports another budget.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalTimeout: process.env.CI ? 30 * 60_000 : undefined,
  timeout: 60_000,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    trace: 'on-first-retry',
  },
});
\`\`\`

The package command should stay explicit so CI logs show the runner and reporter. A separate contract config can inject a short global cap without modifying release values.

\`\`\`json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:timeout-contract": "playwright test tests/global-timeout.contract.spec.ts --config=playwright.timeout-contract.config.ts --reporter=dot"
  }
}
\`\`\`

Run \`pnpm --filter @qaskills/web test:e2e:timeout-contract\` in a job whose platform timeout exceeds the contract cap. Save the exit code, elapsed seconds, last completed title, and terminal excerpt.

Do not add fixed waits to ordinary specifications for this proof. A dedicated contract fixture keeps the release suite fast and makes the expected failure unmistakable.

Review the [configuration reference](/blog/playwright-test-config-options-complete-reference) before combining project-level overrides. Then use the [Playwright CLI skill](/skills/Pramod/playwright-cli) for focused runner and evidence workflows.

### Set and Review a Real CI Time Budget

Begin with ten clean CI runs from the same branch, browser set, and worker size; keep the full run time for each job. Mark runs that used retries; a sound cap starts with facts, not a guess.

Sort the times and look at the slow end, not just the mean; one fast run says very little. A retry-heavy run shows the cost of real faults; leave room above that slow end for normal host noise.

List each clock in one short plan before a config change is made; put the test limit first. Put the full run cap next; put the CI job cap last, with clear space between each value.

For a small suite, that plan may use seconds rather than hours; for a large suite, it may use many minutes. The size is not the rule; the order and proof are what make the plan safe.

Keep the web start limit on its own line in the plan; a slow app start has a clear owner. It should not look like a test fault; the runner log must show when that stage ends.

Run the normal focus set and save its start time, end time, exit code, and last test name; it should end well below the cap. This is the pass control. Keep it next to the forced overrun.

Build the overrun from local test code that has no web or cloud need; that makes the time easy to set. Give the test a longer limit than the short run cap. The full run clock must fail first.

Watch the live log while the forced case runs; a few test names should still reach the report. The final line should name the full run limit. A job kill message means the outer clock won.

Let the next CI step save the small text report even though the test step failed; bound that upload step as well. Do not let it wait for a large file set. The aim is a clear fault with quick proof.

Check that no browser or web task stays alive after the runner ends; a child task can use the rest of the job time. It can also make the next run slow. Process cleanup belongs in the cap check.

If the normal run moves close to the cap, inspect test times before raising it; find the first large shift. Check new retries and added projects. A trend is more useful than one late job.

If all tests grow at once, compare the CI host and app start time; the cause may be less CPU or slow disk. If one test grows, keep the fix with that test. The suite cap should not hide either case.

Write the chosen value and the data date in the review note; state how much time remains before the job cap. State which step saves the report. These three facts let a new owner judge the rule.

Repeat the forced check when the runner, reporter, or CI host setup changes; those parts shape shutdown and log output. The [Playwright CI guide](/blog/playwright-ci-github-actions-complete-guide-2026) can help map that check to the job.

Do not run the forced overrun in the main release suite; give it a small file and a short test config. This keeps the expected fault from using the real budget. It also keeps the report easy to scan.

Review the time plan once each quarter or after a large suite change; remove old room that no longer has a cause. Add room only with new data. A cap that no one checks soon stops being useful.

When a real global fault occurs, save the planned clocks beside the observed times; name the last test that ended. Name each worker that was still busy. The [timeout fault guide](/blog/playwright-test-timeout-exceeded-after-hook-fix) can help trace the slow part.

Playwright global timeout CI is healthy when normal work has space and a stuck run ends on its own terms; the CI host should still have time to save proof. That is the result the contract test must show.

Check a shard on its own before you use the full run cap for all shards; each shard should have a known size and end time. A small shard that hangs can still hold the whole job. Keep its last test name in the log.

Count retry time as real run time, since the cap does not know why a test runs twice; a high retry rate can use all spare room. Fix the root fault before you add more time. Keep the retry count in each trend row.

Keep queue wait time out of the Playwright clock when the CI host has not begun the test step; the job view should show that wait on its own. This keeps a busy queue from looking like a slow suite.

Give report upload a small file set and a hard stop; a failed run should not scan old trace files. Clear the output path at job start. Then the time left after the runner can serve its one clear task.

Test the cap with the same worker count used by the main job; a one-worker check may not show how fast many tasks stop. Watch each child end. No worker should keep the job open after the main fault.

If the suite has a set of serial tests, list their full cost in the time plan; they cannot gain speed from more workers. Place their slowest clean run in the base sum. This makes the cap fit the true test shape.

Keep one owner for the inner cap and one owner for the outer job rule; both names can point to the same team. The key is that each fault has a first call. A clear owner cuts guesswork when the clock fires.

At each review, ask if normal work fits, if the forced run stops first, and if the report still lands; those three yes answers prove the clock order. Any no should block a blind rise in the time cap.

## Frequently Asked Questions

### What is the safest way to use playwright globaltimeout config?

Base the value on measured complete-suite duration, retries, projects, and normal CI variance. Keep it above expected Playwright work and below the provider job timeout. Preserve smaller local deadlines, prove a controlled global overrun, and reserve enough job time for reporter completion and artifact handling.

### How do you verify cap total e2e runtime?

Run one focused suite that finishes beneath the cap and one isolated fixture that intentionally exceeds a shorter contract cap. Require a global-timeout message, nonzero exit, expected elapsed range, visible last test, reporter output, and no provider cancellation. Both controls establish the intended boundary.

### When should a QA team choose playwright ci job timeout?

Use the CI job timeout as the outer resource limit for commands, containers, uploads, and cleanup beyond Playwright itself. Configure a smaller Playwright global deadline inside it whenever runner-specific diagnostics matter. The reserved interval should cover orderly process exit and evidence retention under failure.

### What causes failures in global versus test timeout?

Equal or poorly ordered limits make the cause ambiguous. Other causes include leaking fixtures, long hooks, deterministic retries, constrained workers, slow application startup, or a job cap that kills Playwright first. Compare configured values, elapsed time, last completed test, and exact termination message before adjusting budgets.

### Which evidence should browser suite deadline retain?

Retain the Playwright global value, test timeout, web-server limit, CI job limit, command, project and retry settings, elapsed run time, last completed test, reporter excerpt, process exit code, and provider status. Add artifact paths only when they answer a specific browser failure.

### How should CI handle diagnose global timeout exceeded?

CI should preserve streaming logs, allow Playwright to fail before platform cancellation, and continue bounded upload steps after the runner exits. Mark the test step failed, retain compact timing evidence, and classify whether product, test, or environment behavior consumed the budget before changing the configured cap.

## Conclusion

Playwright global timeout CI should remain an inner suite safety boundary, not a substitute for focused test deadlines or diagnosis. Adopt it only after normal duration is measured and a controlled overrun proves the correct error, timing, reporter output, and cleanup headroom.

Compare related guidance in the [QASkills blog](/blog) and browse the [skills directory](/skills). Open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli), install it, and apply this focused deadline verification workflow.`,
};
