import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Configure Playwright Traces Only on the First Retry',
  description:
    'Configure Playwright trace on first retry to capture decisive CI evidence while controlling storage, runtime overhead, and noisy test artifacts.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Configure Playwright Traces Only on the First Retry

The first execution fails at 02:14, the retry passes at 02:15, and the HTML report contains the evidence that matters: a trace from the retry rather than an archive from every successful test. That result comes from one small Playwright setting, but using it well requires understanding retry indexes, artifact retention, reporter output, and what a trace can actually prove.

For most CI suites, \'on-first-retry\' is the practical trace mode. It avoids tracing the normal pass while still recording the first attempt to reproduce a failure. This article configures that behavior, verifies the generated artifact, and covers the cases where another mode is more honest.

## What Playwright means by the first retry

Playwright numbers the original test execution as retry 0. If it fails and the project allows retries, the next execution is retry 1. The phrase "first retry" refers to retry 1, not the original failure. With \'trace: \'on-first-retry\'\', Playwright does not record the initial run. It starts tracing when the runner schedules retry 1, then keeps that trace whether the retry passes or fails.

This distinction changes the diagnostic story. Suppose a checkout test times out because the first page load received a transient 503. Its retry succeeds. The trace shows the successful retry, which may reveal timing, network traffic, DOM state, and the different server response, but it does not contain the initial 503 unless that fact is visible elsewhere in logs or attachments. The mode gives a controlled reproduction artifact, not a recording of the first failure.

| Execution | Playwright retry index | Trace with \'on-first-retry\' | Result classification when retry 1 passes |
| --- | ---: | --- | --- |
| Original run | 0 | Not recorded | Contributes the failed attempt |
| First retry | 1 | Recorded and retained | Test becomes flaky |
| Second retry | 2 | Not recorded | Used only if retry 1 also fails |
| Unrelated passing test | 0 | Not recorded | Passed |

There must be at least one configured retry. If \'retries\' is zero, retry 1 never exists and no trace is produced. This is the most common reason a team enables the trace mode and sees nothing in CI.

## Put retry policy and trace policy together

The configuration belongs in \'playwright.config.ts\'. Keep the retry count close to the trace mode so a reviewer can see that the settings are compatible. A common policy is zero retries on a developer laptop and two on CI. That preserves fast local feedback while giving CI a chance to capture the reproduction.

\`\`\`ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : 'list',
  use: {
    baseURL: 'https://staging.example.test',
    trace: {
      mode: 'on-first-retry',
      screenshots: true,
      snapshots: true,
      sources: true,
      attachments: true,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
\`\`\`

The short form, \'trace: \'on-first-retry\'\', uses the same mode with default trace features. The object form is useful when artifact policy needs to be explicit. Screenshots provide the filmstrip, snapshots capture DOM state around actions, sources package test source, and attachments include items attached through test APIs. Disabling a feature can reduce archive size, but it also removes a diagnostic layer. Measure actual traces before changing defaults.

Do not confuse this option with \'context.tracing.start()\'. The browser-context tracing API is valuable when Playwright is used as a library, but Playwright Test configuration integrates trace collection with retries, fixtures, actions, assertions, and report attachments. Manually starting tracing in a test can create partial or duplicate traces and usually misses the runner-level reason the test ended.

For the broader relationship among \'use\', projects, retries, timeouts, and output settings, keep the [Playwright test configuration reference](/blog/playwright-test-config-options-complete-reference) alongside the suite's configuration review.

## Prove the setting with an intentional first-attempt failure

A configuration change should have a testable acceptance check. Create a temporary spec that fails only when \'testInfo.retry\' is zero. The first execution fails by design, retry 1 passes, and Playwright should classify the test as flaky while retaining one trace.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('captures exactly the first retry', async ({ page }, testInfo) => {
  await page.setContent(
    '<main><button>Submit order</button><p role="status">Ready</p></main>',
  );
  await page.getByRole('button', { name: 'Submit order' }).click();

  expect(testInfo.retry, 'temporary verification fails on retry 0').toBeGreaterThan(0);
  await expect(page.getByRole('status')).toHaveText('Ready');
});
\`\`\`

Inside this article's template literal the nested delimiters are escaped, but in the actual spec they are ordinary JavaScript template delimiters. Run the spec with the same CI environment condition that enables retries. Afterward, inspect \'test-results\'. A retried test typically has a result directory containing \'trace.zip\'. The HTML report links to the trace, so opening the report is safer than assuming a fixed nested path across project names and output naming.

Remove the intentional failure after validation. It is a configuration probe, not a permanent flaky test. A better long-term guard is a small CI smoke job that runs a known probe project and asserts the artifact upload step received a nonempty \'test-results\' directory. Keep that job separate from product test results so its designed failure does not distort quality reporting.

## Read the retry trace without inventing a cause

Open a trace from the HTML report or with \'npx playwright show-trace path/to/trace.zip\'. The viewer correlates actions, assertions, console messages, network requests, source locations, metadata, and DOM snapshots. Start with the action that consumed the most time or the assertion that failed. Then work backward through requests and page state.

The retry trace answers questions such as these:

1. Did navigation reach the intended URL before the assertion began?
2. Was the target element attached, visible, stable, and enabled during the action?
3. Did an API request remain pending or return an unexpected status?
4. Did the browser log a client exception during hydration?
5. Did fixture setup consume most of the test timeout?

It cannot, by itself, prove what happened during retry 0 because that execution was not recorded. Compare the trace with the original failure's error message, server request IDs, application telemetry, and worker logs. If retry 1 succeeds, look for state differences rather than treating success as absence of a defect. A cache warmed by the first attempt, a record partially created before timeout, or a service recovered between attempts can all make the second execution follow a different path.

The detailed [Playwright Trace Viewer guide](/blog/playwright-trace-viewer-guide-2026) is useful when the archive exists but the team is still relying on screenshots instead of the action, network, and snapshot timelines.

## Choose a mode by the evidence you need

Trace modes encode different retention decisions. Selecting one should follow the failure question, not habit.

| Mode | Runs recorded | Archives retained | Best fit | Important limitation |
| --- | --- | --- | --- | --- |
| \'on-first-retry\' | Retry 1 only | Retry 1 | Routine CI with retries and bounded artifacts | Does not capture retry 0 |
| \'on-all-retries\' | Every retry | Every retry | Comparing repeated reproduction attempts | More storage when retry counts are high |
| \'retain-on-failure\' | Every run | Failed runs | Capturing the original failure even without retries | Recording overhead also affects passing runs |
| \'retain-on-first-failure\' | Original run only | Original run if it fails | Evidence must come from the triggering attempt | No trace of retry behavior |
| \'on\' | Every run | Every run | Short, targeted diagnostic sessions | Excessive for a broad CI suite |
| \'off\' | None | None | Performance baselines or suites with external diagnostics | No trace-level browser evidence |

If the defect disappears on retry and only the first-run state matters, \'retain-on-first-failure\' can be more informative. If repeated retries take different paths, \'on-all-retries\' allows comparison. \'retain-on-failure\' is attractive for suites without retries, but remember that traces are recorded before Playwright knows whether the run will pass. Retention and recording are separate costs.

Command-line \'--trace on\' is intentionally blunt. It is excellent for a narrow local reproduction, but it overrides the economical CI posture by tracing every selected test. Avoid putting it permanently into the main pipeline command while also claiming that only retries are traced.

## Artifact size is a pipeline concern

The local \'test-results\' directory is only the first stop. CI systems often upload it, preserve the HTML report, and apply their own retention period. A Playwright configuration can limit which runs produce archives, but it cannot limit how long GitHub Actions, GitLab, Jenkins, or another artifact store keeps them.

Design the lifecycle deliberately:

- Upload artifacts even when the test command exits nonzero. In many systems that means an "always" condition on the upload step.
- Preserve \'trace.zip\' as a binary file. Repacking or selectively extracting it can break resource references.
- Give report and raw results compatible retention. An HTML link is useless after its target archive has expired.
- Treat traces as potentially sensitive. DOM snapshots, request URLs, headers visible to the page, test attachments, and source can contain operational data.
- Exclude authentication secrets from application logs and test attachments. Tracing is not a substitute for secret hygiene.

Artifact volume depends on application behavior. A long scenario with frequent DOM changes and large resources can produce a much larger trace than a short API-backed form. Use a representative sample: run a handful of naturally flaky or intentionally failing tests, record archive sizes, and estimate pipeline storage from observed data. Do not publish a universal megabytes-per-test number.

Sharding adds another wrinkle. Each shard writes its own results, often with overlapping directory names if artifacts are merged carelessly. Upload per-shard directories or use unique artifact names, then merge reports using supported Playwright report workflows. Never let shard 4 overwrite shard 1's trace because both upload to a shared mutable path.

## Retry scope can silently change artifact behavior

Retries may be configured globally, per project, or for a describe group through \'test.describe.configure({ retries: number })\'. The effective retry count at the test matters. A project that overrides global retries to zero will never enter the first retry even though the top-level trace mode remains enabled.

Serial groups also affect interpretation. If a test in a serial group fails, Playwright may retry the group together. Setup and earlier tests can run again, and the trace belongs to the specific retried test result that Playwright records. Prefer isolated tests with independent fixtures. A trace is easier to reason about when the result does not depend on another test's side effects.

Worker restart behavior matters too. After a failure, Playwright may start a new worker process for subsequent work. Worker-scoped fixtures can be recreated, producing a retry environment that is cleaner than the original. If an authentication cache or seeded account is worker-scoped, note that difference during triage. The retry trace can look healthy because the retry did not inherit the contaminated process that caused retry 0.

Project matrices multiply traces by effective retries, not merely by source test. Chromium, Firefox, and WebKit are distinct test executions. If only Firefox retry 1 is traced, the artifact should be associated with the Firefox project. Include browser and project in artifact naming and incident notes.

## Avoid trace settings that hide flaky design

A retry is a diagnostic opportunity, not a quality waiver. Playwright reports a test that fails initially and passes on retry as flaky. Keep that classification visible. Do not transform flaky into passed in downstream dashboards, and do not raise retry counts merely to improve the final green rate.

Use the trace to remove the source of nondeterminism:

- Replace arbitrary sleeps with web-first assertions tied to observable readiness.
- Generate isolated test data instead of sharing mutable accounts across workers.
- Wait for the user-visible outcome, not a private implementation event.
- Make cleanup resilient when a preceding assertion fails.
- Capture server correlation identifiers so browser activity can be joined to backend logs.

Network mocking deserves special care. A fully mocked route can make retry traces deterministic, but it may also remove the latency or response behavior behind the original issue. Mark mocked boundaries in the test and keep a smaller set of tests against realistic services. The trace can only expose activity that the scenario permits.

Do not assert that a trace file exists inside every product test. Artifact generation is runner behavior, and reaching into output directories couples tests to reporter internals and naming. Validate the policy at pipeline level with a dedicated probe, then let product tests assert product behavior.

## A review checklist for the final configuration

Before merging the setting, inspect the whole chain rather than the single line:

| Review point | Desired evidence | Failure symptom |
| --- | --- | --- |
| Effective retries | At least one retry in the target CI project | No retry trace is ever created |
| Trace mode | \'on-first-retry\' in the effective \'use\' object | Every run traced, or tracing disabled |
| Reporter access | HTML report or raw result artifact retained | Trace exists on runner but cannot be downloaded |
| Upload condition | Artifact step runs after failures | Failed jobs lose their diagnostics |
| Shard naming | Unique result artifact per shard and project | Later uploads overwrite earlier traces |
| Data handling | Retention and access match trace sensitivity | Sensitive snapshots retained too broadly |
| Flaky reporting | Retry pass remains classified as flaky | Reliability debt disappears from metrics |

Run the intentional probe once locally with retries forced on and once in the real CI environment. Local success proves Playwright configuration; CI success proves artifact plumbing. Those are different systems and both need evidence.

One final check is reporter independence. Run the probe once with the line reporter plus raw results, then with the HTML reporter used by CI. Trace collection belongs to the test result, while the reporter determines how engineers discover it. If a custom reporter drops attachments or a post-processing step relocates archives, the Playwright mode can be correct while the delivered report is incomplete. Preserve the original result metadata during report merging and test the download path from a completed CI job as a user would.

Trace policy also needs a failure path for setup and teardown. A test can fail before the first page action because an automatic fixture throws, or after assertions because cleanup times out. Use a temporary fixture probe to learn what the archive contains in those phases. Runner metadata and fixture steps can remain useful even when no page exists, but an empty browser timeline is expected if context creation never completed.

For teardown failures, verify the context closes and the archive finalizes before the worker exits. Abrupt process termination, an out-of-memory kill, or a CI cancellation may leave no valid ZIP because Playwright never completed artifact writing. Server logs and job-level diagnostics remain necessary for those conditions. Do not promise that first-retry tracing captures failures that terminate the runner itself.

Finally, test trace opening from the retained artifact on a clean machine or isolated job. A local report can accidentally reference files still present in a developer workspace. The delivered ZIP should be self-contained for its supported viewer flow, and access controls should let the on-call engineer retrieve it without granting broader CI administration.

## Frequently Asked Questions

### Why is there no trace when my test fails once?

The mode records retry 1, not the original run. Confirm that the effective retry count is at least one and that the runner actually scheduled a retry. If retries are disabled, use a failure-retention mode when you need the initial attempt.

### Does on-first-retry keep the trace when the retry passes?

Yes. Retry 1 is the selected execution, so its trace is retained even when that attempt succeeds and Playwright labels the overall test flaky.

### Can I enable first-retry tracing for only one Playwright project?

Yes. Put the trace setting in that project's \'use\' object. Remember that project options merge with top-level \'use\', so inspect the effective configuration and ensure the same project has retries enabled.

### Should I use the runner option and browserContext.tracing together?

Usually no. Playwright Test's option includes runner-aware actions, assertions, and attachments. Manual context tracing is intended for library use or unusually controlled segments, and combining them can produce overlapping artifacts.

### Which mode captures the original failure instead of its retry?

Use \'retain-on-first-failure\' when only the original failed run should be recorded and kept, or \'retain-on-failure\' when every run may be recorded but only failed runs retained. Choose based on evidence needs and measured overhead.
`,
};
