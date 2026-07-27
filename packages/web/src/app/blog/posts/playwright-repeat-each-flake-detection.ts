import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Repeat Each Flake Detection',
  description:
    'playwright repeat each flake detection: reproduce intermittent failures without confusing retries. Repo evidence maps checks and CI-safe steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Playwright',
  primaryKeyword: 'playwright repeat each flake detection',
  keywords: [
    'playwright repeat each flake detection',
    'playwright repeateach config',
    'repeat playwright test twenty times',
    'repeateach versus retries',
    'reproduce intermittent e2e failure',
    'playwright flake confirmation',
    'multi run browser test',
  ],
  relatedSlugs: [
    'playwright-retries-flaky-test-handling-guide',
    'fix-flaky-tests-guide',
    'flaky-test-quarantine-test-impact-analysis-guide-2026',
    'playwright-testing-best-practices-2026',
  ],
  sources: [
    'https://playwright.dev/docs/test-cli',
    'https://playwright.dev/docs/api/class-testconfig#test-config-repeat-each',
    'https://playwright.dev/docs/test-retries',
  ],
  repoEvidence: ['seed-skills/flaky-test-quarantine/SKILL.md', 'packages/web/playwright.config.ts'],
  content: `Playwright repeat each flake detection runs every selected test several independent times, while retries rerun only a failed test attempt. Start with one suspected case, set \`--retries=0\`, hold workers and data fixed, and record every result. Then compare isolated repetition with the full suite before classifying the fault.

## What Does Playwright Repeat Each Flake Detection Control?

Playwright repeat each flake detection controls how many fresh executions Playwright schedules for each selected test. It measures whether the same test can change result across a defined sample.

The \`repeatEach\` setting applies to every selected test, so a value of twenty creates twenty executions per test and gives each pass or fail one clear place in the run log. Each run gets its own repeat index and should begin through the normal fixture lifecycle.

Retries have a different trigger. They create another attempt only after a test fails, and Playwright can classify a later pass as flaky within that test run.

That difference affects the sample and lets the team count quiet passes as well as clear faults. Repetition includes passes that never need recovery, while retries focus on failed attempts and can make a job end green after an initial fault.

The [test retries guide](https://playwright.dev/docs/test-retries) explains retry behavior, worker replacement after failure, and result classes. A retry record is useful, but it does not replace an unbiased set of repeated executions.

Repetition also does not prove root cause. Twenty passes reduce evidence for an easy-to-trigger fault, but they cannot show that the test is free from every timing, order, or load issue.

Twenty mixed results prove non-determinism only when code, data, browser, worker count, and service state were held steady. If those inputs moved, the sample may compare different conditions.

This workflow does not replace a clear assertion. A repeated test that checks only page load can pass while the business state is wrong in every run.

Use the [flaky test handling guide](/blog/playwright-retries-flaky-test-handling-guide) to decide how retries affect normal CI. Keep the reproduction lane separate so recovery settings cannot hide its pass and failure counts.

The release rule is to repeat before quarantine, then reproduce after a fix with the same sample. A team should retain the run count, failures, repeat indexes, workers, order context, and trace paths.

Playwright repeat each flake detection is a measurement tool, not a cure. It creates evidence that guides work on state, waits, data, resource load, or application code.

## How Does Playwright Repeateach Config Work?

Playwright repeateach config can be set in the test configuration or by the \`--repeat-each\` command option. The command line is best for a short investigation because the change stays visible in the run record.

The [TestConfig repeatEach reference](https://playwright.dev/docs/api/class-testconfig#test-config-repeat-each) defines how often every test runs. A config value suits a dedicated stress project, but it can multiply a broad suite by mistake.

The [Playwright test CLI guide](https://playwright.dev/docs/test-cli) documents \`--repeat-each\`, \`--retries\`, and \`--workers\`. Put all three in the captured command so a reviewer knows which scheduling rules applied.

Start with \`--retries=0\` so each red or green row maps to one planned run in the saved report. This keeps each repeat result direct and prevents a failed repeat from gaining a passing retry that changes the job's visible outcome.

Start with one worker when the first goal is to confirm a test-local timing fault and keep the first sample free from cross-test load. A single worker reduces parallel pressure and makes result order easier to inspect.

Next, repeat with the normal worker count. A fault that appears only under parallel work may involve shared accounts, ports, files, database rows, or server limits.

Each scheduled execution should run its fixture setup and teardown. A test that stores mutable state in a module, process, account, or remote service can still leak data across repeats.

Observation and assertion remain separate. A report may observe that repeat index seven took longer, while the test assertion must still identify the incorrect page or API state.

Do not randomize order, browser, workers, and data in the first sample. Change one factor after the baseline so each comparison has a useful meaning.

The [Playwright testing practices guide](/blog/playwright-testing-best-practices-2026) favors isolated tests and user-facing checks. Those rules make a repeated result easier to trust because fewer hidden inputs survive between runs.

Playwright repeat each flake detection should use a fixed command, a clean output folder, and a result parser that keeps every repeat. A final green line alone is not enough evidence.

## Repeat Playwright Test Twenty Times: Repository Evidence

Repeat Playwright test twenty times after one failure has been narrowed to the smallest specification and test title. The repository guidance supports repeated proof before quarantine and after a fix.

\`seed-skills/flaky-test-quarantine/SKILL.md\` defines a flaky test as one that changes outcome under the same conditions. It says one failure may be a real bug and calls for multi-run tracking.

That file also warns that retries and larger timeouts can mask the cause. Its isolation workflow runs a named test many times with retries disabled, then compares those results with full-suite runs.

The repository example uses a script loop rather than \`repeatEach\`, but the goal is the same. Count direct outcomes while keeping the test and run settings explicit.

The file's quarantine policy records a flake rate instead of relying on memory. It also requires an owner, category, issue, and expiry when a proven flaky test leaves the main lane.

The web package supplies a concrete scheduling contrast in \`packages/web/playwright.config.ts\`. It sets two retries and one worker in CI, while local runs have zero retries and an unset worker count.

A diagnostic command must override or account for those values. Running with the normal CI config can turn one failing attempt into a later pass and can reduce the concurrency that exposed the issue.

Use \`--repeat-each=20 --retries=0 --workers=1\` for the first isolated sample. Then change only workers for a parallel sample, or change only selection for a suite sample.

The [fix flaky tests guide](/blog/fix-flaky-tests-guide) covers waits, selectors, data, and shared state. Repetition tells the team whether a proposed fix changed outcomes; it does not choose the fix.

Record the exact git revision with the command. Two twenty-run samples from different code cannot support a clean before-and-after rate without that identity. Playwright repeat each flake detection follows repository policy when it proves variation first, keeps normal CI strict, and verifies a fix in both isolated and suite settings.

## When Should QA Teams Use Repeateach Versus Retries?

Repeateach versus retries is a choice between sampling and recovery. Use repetition to expose a suspected intermittent fault, and use retries only under the team's stated CI classification policy.

Choose repetition after a failure cannot be reproduced with one normal run. It is also useful after a fix, when the team needs a matching sample to show that the known trigger no longer appears.

Choose retries when the runner must label failed and recovered attempts during an ordinary suite. Do not read a retry pass as proof that the first failure was harmless.

Choose one worker to test whether the fault exists without parallel pressure. If it disappears, restore the normal worker count and inspect shared state rather than declaring the issue fixed.

Choose full-suite repetition only after the selected test sample is understood. Repeating hundreds of tests can consume large resources and can make the original signal hard to find.

A strong control runs a test that should fail for a fixed reason. The result parser must count that failure every time, proving that reports do not discard failed repeats.

Use a locator assertion when the concern is one delayed page state. Repetition should not replace the web-first wait that gives the test a sound condition.

Use a seed or owned order control when random data affects the case. The seed belongs in every result so another engineer can rerun the same input.

Use the [quarantine and impact guide](/blog/flaky-test-quarantine-test-impact-analysis-guide-2026) only after direct evidence confirms variation. Quarantine without a repeat record can hide a real and stable product defect.

Do not use retries to increase the sample size. Their conditional trigger creates unequal attempt counts between passing and failing tests.

Playwright repeat each flake detection is suitable when the team can freeze the key inputs and retain each result. If the environment is changing, first make those changes observable.

## Reproduce Intermittent E2e Failure: Failure Modes and Diagnostics

Reproduce intermittent e2e failure by starting with one hypothesis and one changed input. A large repeat count cannot rescue a sample whose browser, data, or service shifts without a record.

A product fault appears when the same valid user flow sometimes yields an invalid server or UI state. A trace may show duplicate writes, stale reads, or an event that arrives in the wrong order.

A test fault appears when selectors race, fixtures leak, promises are not awaited, or assertions depend on time. The product can remain correct while the test observes it at the wrong edge.

An environment limit appears when CPU, memory, network, database capacity, or browser startup changes the timing. Compare duration and worker load without calling that evidence a product bug.

The first common mistake leaves retries enabled. A failed repeat can pass on retry, and a short summary may hide how many direct repeats failed.

The second mistake changes several factors at once. Moving from one local worker to four CI workers with new data and another browser produces no clean comparison.

The third mistake counts only process exit codes. A job can exit with failure after one bad repeat, but the team still needs the complete pass and failure distribution.

The fourth mistake reuses one account whose server state grows on every run. Later repeats then test a different account history, even if browser contexts are new.

The fifth mistake deletes traces after a green final attempt. Keep trace paths for failed repeat indexes and, when useful, one nearby pass for contrast.

Use the [flaky test handling guide](/blog/playwright-retries-flaky-test-handling-guide) to interpret retry labels. In the reproduction lane, direct outcomes should remain visible without recovery.

Playwright repeat each flake detection diagnosis should end with a short class: product, test, environment, or unresolved. State the evidence and next probe rather than assigning blame from one stack trace.

## Playwright Flake Confirmation: Evidence and CI Assertions

Playwright flake confirmation requires at least one pass and one failure under the same declared conditions. The record must make those conditions specific enough for another run.

Keep the repeat index, test title, project, result, duration, retry index, worker count, and trace path in one plain row that can be checked by hand. Add data seed, order context, account, and service revision when they can affect behavior.

Report direct passes and failures as counts plus a rate, with the raw rows close by so no one must trust a sum alone. For example, three failures in twenty direct repeats is fifteen percent for that sample, not a promise about all future runs.

Keep retry index at zero in the first sample. If the normal lane uses retries, run a separate comparison and label recovered attempts without merging them into direct repeats.

Store one machine-readable report such as JSON beside the human summary. A parser can group repeat indexes while the trace and error message explain each failed case.

Prove cleanup after every run and list each reset with a short pass or fail mark in the same run record. Created orders, files, users, or feature flags must return to their start state, or the next repeat has a new input.

CI should save artifacts under a run-specific path. Parallel or repeated tests must not overwrite one trace with another file of the same name.

Record the command in the job summary. A result without \`--repeat-each\`, \`--retries\`, and \`--workers\` leaves the main scheduling question unanswered.

After a fix, use the same first sample and then the full-suite sample. If only the isolated case improves, the suite may still supply the trigger.

The [skills catalog](/skills) can provide repeatable review steps, but the repository should own thresholds and quarantine policy. A generic run count cannot decide the risk of each product area. Playwright repeat each flake detection passes its evidence gate when every execution is counted, failed traces remain distinct, and input plus cleanup records make the sample repeatable.

## Multi Run Browser Test Comparison Table

A multi run browser test needs an option that matches the current question. This table keeps sample purpose, proof, and misuse risk beside each scheduling choice.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| \`repeatEach\` | Sample independent executions for an intermittent condition | Repeat index, direct result, workers, order, and trace | Retries hide a failed repeat |
| Retries | Classify recovery inside one normal test run | Retry index, first error, final result, and worker change | A later pass looks like a fix |
| Single worker | Probe test-local behavior with less shared pressure | Worker count, stable data, duration, and direct results | The setting removes the real trigger |
| Full-suite repetition | Compare isolation with normal suite load and order | Suite order, selected revision, resources, and traces | Cost grows while the signal gets buried |

The \`repeatEach\` row gives the cleanest direct sample. Keep the selected test narrow and preserve all outcomes rather than only the last console line.

The retry row belongs to CI policy and failure classification. It can reveal that a first attempt failed, but its sample is conditional and should not be merged with repetition.

The single-worker row is a probe, not a final setting. A pass there and failure with normal workers points toward shared state or load that deserves another controlled test.

Full-suite repetition is valuable when order and resource pressure are plausible. Limit its duration, name the target test, and keep suite order with each failed trace.

All rows require fixed code and data. Without those controls, a larger sample can create a precise count of unrelated changes.

The [blog index](/blog) connects this matrix with test isolation and CI design. Use a broader guide only after the focused record identifies which run setting changes the result.

Playwright repeat each flake detection should move through the rows in order of cost. Begin narrow, restore real concurrency, then add full-suite pressure when evidence supports that step.

## How Do You Implement Playwright Repeat Each Flake Detection?

Implement Playwright repeat each flake detection with a focused no-retry command, a distinct artifact path, and a report that counts direct outcomes by repeat index. Compare one worker with normal workers before repeating the full suite.

1. Read \`seed-skills/flaky-test-quarantine/SKILL.md\` and write the suspected trigger, fixed inputs, sample size, and classification rule.
2. Run the smallest named test with \`--repeat-each=20 --retries=0 --workers=1\` and retain every direct result.
3. Prove the reporter counts a fixed failure, then inspect pass, failure, duration, repeat index, and trace data.
4. Repeat with the normal worker count while keeping browser, data, code, and selected test unchanged.
5. Run the relevant suite sample, clean all shared state, and classify the fault with its owner and next probe.
6. Apply the same samples after the fix, compare rates, and keep normal CI retries separate from this evidence.

The first command follows the repository's detection-before-quarantine rule. It repeats only the suspected file and disables recovery so each result remains direct.

\`\`\`bash
npx playwright test failing.spec.ts \
  --grep "submits one order" \
  --repeat-each=20 \
  --retries=0 \
  --workers=1 \
  --trace=retain-on-failure
\`\`\`

Save the command, exit status, and report directory even when all twenty pass. A no-failure sample is evidence about the stated conditions, not proof that the past fault was false.

The second command restores parallel work without adding retries. It changes one scheduling factor and can expose a race in shared accounts, files, ports, or backend data.

\`\`\`bash
npx playwright test failing.spec.ts \
  --grep "submits one order" \
  --repeat-each=10 \
  --retries=0 \
  --workers=4 \
  --output=artifacts/repeat-four-workers
\`\`\`

\`packages/web/playwright.config.ts\` sets one CI worker and two CI retries for its normal web suite. The explicit diagnostic flags prevent that policy from changing this direct sample.

Use a fixed output path for each command and clear it before the run. Otherwise, a trace from an old sample may be mistaken for the current repeat index.

Parse the report rather than scraping colored terminal text, and save the parsed rows as a small file that the next run can read. Keep each test result's status, duration, project, retry value, repeat index, error, and attachments.

Confirm that a known failing control produces the planned number of direct failures. This catches a grep that selected no tests or a reporter that dropped repeat results.

Fix all random seeds when the test owns generated data. If a random input is the suspected trigger, record each seed and rerun that exact seed in a separate case.

Create a new browser context through the normal fixture for every repeat. Also reset remote state, since context isolation does not clear a server account or shared database.

Do not place \`test.skip\` around the suspected case during the sample. A skipped repeat adds no pass or failure evidence and may make a report look complete.

Do not use \`--last-failed\` as the first reproduction command. It changes selection based on a prior run and can omit nearby tests that supply an order trigger.

Compare one-worker and four-worker results with the same test revision. A change in rate suggests a concurrency hypothesis, but it still needs a targeted shared-state check.

Next, run the full suite once or a bounded number of times with the target test named in the report. Avoid twenty full-suite runs unless risk and cost support that sample.

The [quarantine impact guide](/blog/flaky-test-quarantine-test-impact-analysis-guide-2026) can help set an owner and expiry after variation is proven. Quarantine should never become an untracked permanent retry lane.

Use the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli) when browser inspection can help narrow one failed trace. Keep the maintained reproduction in Playwright Test so CI can run the exact sample.

For a fix, preserve the original commands in an issue or test note. Run them on the fixed revision and state how many direct failures occurred before and after.

Do not claim a zero-percent future rate from a finite sample. Say that no failure appeared in the stated number of runs under the stated settings.

If the fixed sample still has one failure, keep the case open. A lower observed rate can make a fault harder to find without removing its effect.

Write the final report in six fields: revision, command, sample size, direct pass count, direct failure count, and artifact path. Add the class and owner after review.

Playwright repeat each flake detection succeeds when it makes intermittent behavior countable and rerunnable. The team can then fix the cause instead of trusting a lucky retry.

## Frequently Asked Questions

### What is the safest way to use playwright repeateach config?

Set \`repeatEach\` through an explicit command for a focused investigation, with retries disabled and workers recorded. Keep code, browser, data, and service state fixed. Store every direct result by repeat index, then use config only if a dedicated repeated project is truly needed.

### How do you verify repeat playwright test twenty times?

Check that the report contains twenty direct results for each selected test and that every retry index is zero. Include one fixed failing control to prove failures are counted. Also confirm the grep selected the intended title and each failed repeat has a distinct artifact path.

### When should a QA team choose repeateach versus retries?

Choose \`repeatEach\` to sample an intermittent condition or verify a fix across independent executions. Choose retries for a documented normal-run recovery and classification policy. Never combine their results as one rate because repetition is unconditional while retries run only after a failure.

### What causes failures in reproduce intermittent e2e failure?

Real product races, missing awaits, weak locators, leaked fixtures, shared accounts, changing data, and resource pressure can all change outcomes. Hold most inputs fixed and compare one factor at a time. Use traces, durations, seeds, workers, and order records to classify the failed repeats.

### Which evidence should playwright flake confirmation retain?

Retain revision, command, test title, repeat index, direct status, duration, project, worker count, data seed, order context, error, and trace path. Report pass and failure counts without calling a finite sample a future guarantee. Preserve cleanup results for shared server state too.

### How should CI handle multi run browser test?

Run a focused one-worker sample first, then a normal-worker sample and a bounded suite comparison. Disable retries in the reproduction lane, use unique output paths, and upload machine-readable results plus failed traces. Keep the normal release retry policy in a separate job and summary.

## Conclusion

Playwright repeat each flake detection separates repeated sampling from failed-attempt recovery. Use \`repeatEach\` with zero retries to count direct outcomes, then change workers or suite scope one factor at a time.

Adoption needs the exact command, revision, repeat indexes, results, order context, workers, trace paths, and cleanup proof. A finite all-pass sample supports only the conditions and count that were run.

Browse the [skills catalog](/skills), then open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli). Install it and apply this focused verification workflow before retries or quarantine hide an intermittent failure.`,
};
