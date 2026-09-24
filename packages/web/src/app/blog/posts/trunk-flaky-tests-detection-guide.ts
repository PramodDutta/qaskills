import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Trunk Flaky Tests: Detect, Quarantine, and Fix Flaky Tests in CI',
  description: 'Trunk flaky tests guide for QA teams: upload JUnit XML, tune detection monitors, quarantine safely, and turn CI noise into prioritized repairs.',
  date: '2026-09-24',
  category: 'Guide',
  content: `
# Trunk Flaky Tests: Detect, Quarantine, and Fix Flaky Tests in CI

Trunk flaky tests is a CI analytics workflow for finding tests that fail without a product change, separating them from consistently broken tests, and reducing their ability to block healthy pull requests. The practical setup is simple: produce compatible test reports, upload every CI run to Trunk, let Trunk classify tests with monitors, then use quarantine as a temporary CI gate for known flaky failures while the team fixes the root cause.

The payoff is not that flaky tests become acceptable. The payoff is that your build stops treating every intermittent failure as a mystery. QA engineers get a dashboard, historical failure patterns, stack traces, ownership signals, ticketing hooks, and quarantine controls. AI coding agents get enough structured signal to propose a focused repair instead of guessing from one red log.

This guide assumes you already have automated tests running in CI. It focuses on the parts that usually go wrong in real teams: JUnit XML paths, stale reports, runner retries, monitor thresholds, sharded jobs, safe quarantine behavior, and the handoff from detection to repair. If your first priority is repairing known failures before adding a platform, pair this with the [fix flaky tests guide](/blog/fix-flaky-tests-guide). If you are designing a full policy around quarantine, ownership, and CI gates, read the [CI flaky test auto quarantine workflow](/blog/ci-flaky-test-auto-quarantine-workflow) next.

## What Trunk Actually Needs From CI

Trunk does not need you to rewrite your test suite. It needs test results from CI runs, consistently uploaded with enough repository and branch context to compare outcomes over time. The official Trunk Analytics CLI accepts JUnit XML, Bazel Build Event Protocol JSON, and Xcode XCResult paths. The official GitHub Action in \`trunk-io/analytics-uploader\` wraps the same idea for GitHub Actions.

The important detail is that detection improves when uploads cover stable branches, pull requests, and merge branches. Uploading only failed PR jobs gives Trunk a biased sample: it sees pain, but not the healthy baseline. Uploading stable branch jobs gives the system a cleaner signal about whether a test is unstable even when the application code is not changing underneath it.

| Input path | Use it when | Trunk uploader field or flag | QA risk to watch |
|---|---|---|---|
| JUnit XML | Most JavaScript, Python, Ruby, Java, .NET, and browser test suites | \`junit-paths\` or \`--junit-paths\` | Globs that pick up stale XML from previous shards |
| Bazel BEP JSON | Bazel is the source of truth for test execution | \`bazel-bep-path\` or \`--bazel-bep-path\` | Missing test file attribution if BEP metadata is incomplete |
| Xcode XCResult | iOS and macOS jobs using \`xcodebuild\` | \`xcresult-path\` or \`--xcresult-path\` | Uploading the wrong derived-data result bundle |
| Swift xUnit output | Swift tests using \`swift test --xunit-output\` | \`swift-test-xunit-paths\` in the action | Test attribution differs from generic JUnit reporters |

Use the CLI validation step before you wire uploads into every job. It catches empty files, malformed XML, and report shapes that look valid to the runner but are not useful for analytics.

\`\`\`bash
SKU="trunk-analytics-cli-x86_64-unknown-linux.tar.gz"
curl -fL --retry 3 "https://github.com/trunk-io/analytics-cli/releases/latest/download/\${SKU}" | tar -xz
chmod +x trunk-analytics-cli

./trunk-analytics-cli validate --junit-paths "reports/junit/*.xml"
\`\`\`

For a manual smoke upload, use the organization slug and organization API token from Trunk settings. The current CLI reference uses \`--org-url-slug\` for the CLI flag and \`TRUNK_ORG_URL_SLUG\` as the environment variable alternative.

\`\`\`bash
./trunk-analytics-cli upload --junit-paths "reports/junit/*.xml" --org-url-slug "\${TRUNK_ORG_URL_SLUG}" --token "\${TRUNK_API_TOKEN}"
\`\`\`

What people get wrong: they turn on uploads after retries have already hidden the original failure. Runner-level retries can be useful for developer velocity, but they reduce the quality of flaky-test detection because the uploaded report may only contain the final passed attempt. If you need retry data, prefer a reporter that records each attempt or a platform path where pass-on-retry detection can still see the fail-then-pass pattern.

## GitHub Actions Setup That Preserves Failure Data

The GitHub Action is the least custom path for GitHub-hosted repos. The current action README documents \`trunk-io/analytics-uploader@v2\`, with \`junit-paths\`, \`org-slug\`, \`token\`, and \`previous-step-outcome\` as key inputs for JUnit uploads. The official docs page still shows older examples in places, so pin intentionally and review the repository README when upgrading.

Here is a modern GitHub Actions pattern that keeps the test step result, uploads even on failure, and uses artifact names without slashes.

\`\`\`yaml
name: Tests

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  playwright:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup Node
        uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Install
        run: npm ci

      - name: Run Playwright tests
        id: tests
        continue-on-error: true
        run: npx playwright test --reporter=junit
        env:
          PLAYWRIGHT_JUNIT_OUTPUT_NAME: reports/junit/playwright.xml

      - name: Upload test results to Trunk
        if: \${{ !cancelled() }}
        continue-on-error: true
        uses: trunk-io/analytics-uploader@v2
        with:
          junit-paths: "reports/junit/*.xml"
          org-slug: \${{ secrets.TRUNK_ORG_SLUG }}
          token: \${{ secrets.TRUNK_API_TOKEN }}
          previous-step-outcome: \${{ steps.tests.outcome }}

      - name: Upload JUnit artifact
        if: \${{ always() }}
        uses: actions/upload-artifact@v7
        with:
          name: playwright-junit
          path: reports/junit/*.xml

      - name: Fail if tests failed
        if: \${{ steps.tests.outcome == 'failure' }}
        run: exit 1
\`\`\`

That final fail step is deliberate when you are only observing flakiness. Without quarantine, a failing test should still fail CI. The upload step should not become a blanket greenwashing step. You are collecting telemetry first, then deciding which known flaky tests should be quarantined later.

If your framework writes JUnit to a fixed path, clean it before every run. Stale files are one of the most common causes of false analytics. A reused workspace can quietly upload yesterday's failure beside today's pass, making a stable test look intermittent.

\`\`\`bash
rm -rf reports/junit
mkdir -p reports/junit
npm test -- --reporter=junit --outputFile=reports/junit/unit.xml
\`\`\`

## How Detection Monitors Classify Tests

Trunk's current detection model is monitor-based. A monitor is an independent detector that watches for a specific pattern and then performs an action. For classifying monitors, the action changes the test health status. For label monitors, the action applies labels without changing health.

The priority rule matters in triage. If a test activates both a broken-type monitor and a flaky-type monitor, Trunk treats the test as broken until the broken monitor resolves. That is the right bias. A consistently failing test should not be buried under the softer word flaky.

| Monitor type | Pattern it watches | Typical classification | Where it is strongest |
|---|---|---|---|
| Pass-on-retry | A test fails then passes on the same commit | Flaky | Suites that still execute retries and record attempts |
| Failure rate | Failure percentage exceeds a configured threshold over a window | Flaky or broken | Stable branches, merge queues, and high-volume suites |
| Failure count | A rolling count of failures crosses a threshold | Flaky or broken | Main branch jobs where any repeated failure matters |
| Label-only dry run | Same detection pattern, but label action only | No status change | Testing a new monitor before it affects triage |

A good rollout starts with dry-run labels. Create a monitor that applies a label such as \`would-be-flaky\`, let it observe real CI data, review the labeled set, then switch the action to classify test status only after the results match your team's intuition. This is especially useful for large suites where one threshold can capture infrastructure noise, legitimate product regressions, and test smells in the same net.

Branch scoping deserves special attention. A failure on \`main\` after a clean merge means something different from a failure on an experimental PR branch. A merge-queue failure is different again because the candidate has usually passed earlier checks. Use separate monitors for stable branches, PR branches, and merge branches when your workflow has enough volume to justify it.

## Framework Report Recipes That Keep Test Identity Stable

Flaky-test systems live or die on identity. If the same logical test appears as a different name on every run, the history fragments. If parameterized cases collapse into one generic name, one unstable input can make a whole method look unreliable. Your reporter should preserve class, test name, file path if available, and parameter values when they are meaningful.

| Framework | Common JUnit path | Runner command shape | Identity note |
|---|---|---|---|
| Playwright | \`reports/junit/playwright.xml\` | \`npx playwright test --reporter=junit\` | Keep project names stable across browser/device variants |
| Jest | \`reports/junit/jest.xml\` | \`jest --ci --reporters=default --reporters=jest-junit\` | Use \`-t\` or \`--testNamePattern\` for title filtering, not \`--grep\` |
| Vitest | \`reports/junit/vitest.xml\` | \`vitest run --reporter=junit --outputFile=reports/junit/vitest.xml\` | Use \`-t\` for test name filtering |
| Mocha | \`reports/junit/mocha.xml\` | \`mocha --reporter mocha-junit-reporter\` | Mocha title filtering uses \`--grep\` |
| pytest | \`reports/junit/pytest.xml\` | \`pytest --junitxml=reports/junit/pytest.xml\` | Prefer stable test ids for parametrized cases |

A cross-framework monorepo usually uploads multiple globs. Use comma-separated action input paths or a quoted glob for the CLI, and give each job a predictable variant when the same logical tests run across operating systems, browsers, devices, or architectures.

\`\`\`yaml
- name: Upload web test results to Trunk
  if: \${{ !cancelled() }}
  continue-on-error: true
  uses: trunk-io/analytics-uploader@v2
  with:
    junit-paths: "apps/web/reports/junit/*.xml,packages/*/reports/junit/*.xml"
    org-slug: \${{ secrets.TRUNK_ORG_SLUG }}
    token: \${{ secrets.TRUNK_API_TOKEN }}
    variant: "ubuntu-chromium"
    previous-step-outcome: \${{ steps.tests.outcome }}
\`\`\`

Variants prevent a mobile Safari flake from poisoning the identity of the same test on desktop Chrome. Use them when the execution environment is genuinely part of the test behavior. Do not use variants for random build numbers or commit SHAs, because that splits the history into useless one-run buckets.

## Quarantine Is a Gate, Not a Fix

Quarantine in Trunk isolates known flaky failures so they do not block CI, while the tests continue to run and upload results. The current quarantine docs are explicit that broken tests are not auto-quarantine candidates. A broken test represents a real failure, not intermittent noise, and should remain blocking.

There are two common CI shapes. In a two-step shape, your test command runs first with \`continue-on-error\`, then the upload step makes the quarantine decision. In a wrapped shape, \`trunk-analytics-cli test\` runs your command, uploads results, checks quarantine state, and corrects the exit code if all failures are quarantined.

\`\`\`bash
./trunk-analytics-cli test --org-url-slug "\${TRUNK_ORG_URL_SLUG}" --token "\${TRUNK_API_TOKEN}" --junit-paths "reports/junit/*.xml" --allow-empty-test-results npm test
\`\`\`

The safe mental model is this: quarantined failures are still failures in the product quality record, they just stop blocking this CI job. You should still route them to owners, review the quarantine dashboard, and expire or remove quarantine when the test stabilizes.

| Decision | Use when | CI behavior | Follow-up requirement |
|---|---|---|---|
| Observe only | You are new to Trunk or tuning monitors | Failing tests still fail CI | Review dashboards and tune thresholds |
| Manual quarantine | A high-impact test is proven flaky and blocking merges | Known test failures can stop blocking | Ticket with owner and due date |
| Auto-quarantine | Detection signal is trusted and team has repair workflow | Newly flaky tests can be isolated automatically | Monitor quarantine growth weekly |
| Never quarantine override | A test guards money, security, migration, or irreversible data | Failure always blocks | Fix root cause immediately |

The subtle failure mode is build errors outside test execution. If a shard fails before producing JUnit, the uploader may not have a test case to reason about. The CLI supports \`--test-process-exit-code\` for upload workflows so non-test failures do not get mistaken for quarantinable test failures. Even better, upload each test execution separately or emit a synthetic JUnit case for build setup failures.

## Diagnosis Workflow After Trunk Flags a Flake

Once Trunk marks a test flaky, resist the reflex to add sleeps. Start with the history. Look at whether failures cluster on a branch, a runner image, a browser, a time of day, a specific dependency, or a single shard. Then inspect the failure messages. If stack traces differ wildly, the test may be exposing shared fixture contamination rather than one locator problem.

A productive triage loop is:

1. Confirm classification: flaky, broken, manually flagged, or only label-dry-run.
2. Check the branch and variant pattern: stable branch only, PR branch only, one browser, one OS, one shard.
3. Compare first failing attempt to later passing attempt when retries exist.
4. Re-run locally with the same seed, timezone, locale, browser channel, and parallelism.
5. Reduce the test to the smallest nondeterministic boundary: selector, clock, network, database, queue, file system, or shared account.
6. Patch the test or product race, then remove manual quarantine after stable CI evidence.

Here is a lightweight script an agent can use to classify JUnit failures before opening a repair PR. It does not replace Trunk's history, but it gives the agent a local summary to include in the ticket.

\`\`\`js
import { readFileSync } from "node:fs";
import { parseStringPromise } from "xml2js";

const xml = readFileSync("reports/junit/playwright.xml", "utf8");
const report = await parseStringPromise(xml);
const suites = report.testsuites?.testsuite ?? [report.testsuite].filter(Boolean);

const failures = [];
for (const suite of suites) {
  for (const test of suite.testcase ?? []) {
    const failed = Boolean(test.failure?.length || test.error?.length);
    if (!failed) continue;
    failures.push({
      suite: suite.$?.name ?? "unknown-suite",
      name: test.$?.name ?? "unknown-test",
      classname: test.$?.classname ?? "",
      message: test.failure?.[0]?.$?.message ?? test.error?.[0]?.$?.message ?? ""
    });
  }
}

for (const failure of failures) {
  console.log(JSON.stringify(failure));
}
\`\`\`

Vacuous assertions deserve special attention during repair. A flaky assertion is often a weak assertion pretending to be a timing issue. Anchor regexes, assert presence before comparing indexes, and wait for all async work that the test depends on. For example, \`/^(paid|settled)$/\` is a status assertion. \`/paid|settled/\` can pass on text that merely contains one word in the wrong place.

## Ticketing and Ownership Without Creating Noise

Trunk supports ticketing workflows through integrations such as Jira and Linear, and webhooks for custom automation. The most useful tickets include the current status, impact, failure samples, ownership, and the quarantine state. A ticket that only says "test is flaky" is just CI noise moved into a tracker.

For webhook-driven workflows, use thresholds that reflect impact. A flaky test that failed once in an optional nightly job does not need the same escalation as a test that blocks the merge queue repeatedly. Include enough metadata for code owners and AI agents to act without opening five dashboards.

\`\`\`json
{
  "summary": "Fix flaky checkout applies discount test",
  "labels": ["flaky-test", "qa-reliability"],
  "fields": {
    "testName": "CheckoutTests.appliesDiscountForGoldCustomer",
    "status": "flaky",
    "variant": "ubuntu-chromium",
    "branchScope": "main",
    "suspectedCause": "shared customer fixture or async order total update"
  }
}
\`\`\`

If your team uses AI coding agents, put the test history, reproduction command, related source files, and allowed repair boundaries in the ticket. Ready-made QA skills install from qaskills.sh with the \`qaskills\` CLI, but the important part is the contract: the agent should repair the test or product race, not simply mark the test skipped.

## Rollout Plan for a Large Suite

Start with observability, not automatic quarantine. The first week is about report quality and identity stability. The second week is about monitor tuning. The third week is about quarantine policy for the worst offenders. Moving faster is tempting, but auto-quarantine based on bad reports creates trust damage that takes longer to repair than the original flaky suite.

| Week | Goal | Checks | Exit criteria |
|---|---|---|---|
| 1 | Upload all relevant CI results | Validate XML, clean stale files, stable names | Uploads appear for PR and stable branches |
| 2 | Tune monitors | Dry-run labels, branch scopes, variants | Labeled tests match human review |
| 3 | Enable manual quarantine | Admin permissions, audit logs, tickets | Known high-impact flakes stop blocking merges |
| 4 | Consider auto-quarantine | Repair SLA, dashboards, owner reports | Quarantine count trends down or stays bounded |

Measure the queue of quarantined tests like a production incident backlog. If the number only grows, quarantine has become a hiding place. If the number shrinks and PR failures become more actionable, the system is doing its job.

## Frequently Asked Questions

### Does Trunk flaky tests require JUnit XML?

No. JUnit XML is the most common path, but the Trunk Analytics CLI also accepts Bazel BEP JSON and Xcode XCResult paths. The GitHub Action accepts \`junit-paths\`, \`xcresult-path\`, \`bazel-bep-path\`, and \`swift-test-xunit-paths\`. For most web, API, and unit test stacks, JUnit XML is easiest because runners already support it or have mature reporters.

### Should I disable retries before using Trunk?

Disable blind retries when you can, or make sure your reports preserve the failed attempt. Trunk has pass-on-retry detection, but it still needs useful uploaded data. If a runner retries internally and emits only the final pass, your analytics lose the signal. A short-term retry policy is acceptable for velocity, but long-term detection works best when attempts and outcomes are visible.

### When should a flaky test be quarantined?

Quarantine a test only after it is known flaky and is creating more CI disruption than signal. The test should keep running, keep uploading results, and have an owner. Do not quarantine broken tests, security checks, payment checks, migration tests, or anything where a failure must block release. Quarantine is a temporary gate adjustment, not a permanent quality decision.

### Why did Trunk mark a test broken instead of flaky?

Trunk's classifying monitors use severity priority. If a broken-type monitor and a flaky-type monitor are both active for the same test, the broken status wins. That usually means the recent behavior looks consistently failing enough to represent a real regression. Treat it as blocking until the broken monitor resolves, then review whether a flaky monitor is still active.
`,
};
