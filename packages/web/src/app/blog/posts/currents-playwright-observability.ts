import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Currents for Playwright: Test Observability and Reporting Guide',
  description:
    'Learn how Currents.dev adds observability to Playwright: parallel orchestration, flaky test detection, CI dashboards, and analytics. Full setup walkthrough.',
  date: '2026-07-06',
  category: 'Guide',
  content: `
# Currents for Playwright: The Complete Test Observability and Reporting Guide

Playwright ships with an excellent built-in HTML reporter, but that report lives and dies with a single run. Open it after a CI job, and you see one snapshot: which tests passed, which failed, and a trace you can scrub through. What it cannot tell you is whether that failing test has been flaky for three weeks, how long your suite has been getting slower, which spec files are the worst offenders across a thousand runs, or how to split a 40-minute suite across ten machines so it finishes in four. Those are observability questions, and they need a platform that stores history, aggregates across runs, and understands your CI topology.

Currents.dev is that platform for Playwright (and Cypress). It is a hosted test observability and reporting service that sits on top of your existing test runner. You do not rewrite your tests. You add a reporter, set an environment variable with a record key, and Currents starts collecting every run, screenshot, trace, and timing into a searchable dashboard. On top of that raw data it layers orchestration (intelligent test splitting across parallel machines), flaky test detection, failure grouping, and trend analytics that answer the "is this getting worse over time" questions the native report cannot.

In this guide we will walk through what Currents actually does under the hood, how to install and configure the \`@currents/playwright\` reporter, how to wire it into GitHub Actions with parallel sharding and orchestration, and how it compares against the Playwright HTML report and Allure. Every code sample is runnable. By the end you will know whether Currents belongs in your pipeline and exactly how to set it up. If you are still building out your Playwright foundation first, start with our [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and then come back here to layer observability on top.

## What Currents Actually Does

Currents is best understood as four capabilities bundled into one service, all fed by the same stream of test results.

**Recording and reporting.** Every time your suite runs, the Currents reporter uploads results, artifacts (screenshots, videos, Playwright traces), stdout, and per-test timings to the Currents backend, keyed by a run ID. The dashboard becomes a permanent, searchable archive. Instead of hunting through CI logs, you open a run in the browser, filter to failures, and inspect the trace inline.

**Orchestration.** When you run Playwright across multiple CI machines, the naive approach is static sharding: machine 1 runs shard 1 of 4, machine 2 runs shard 2 of 4, and so on. The problem is that shards are rarely balanced, so one machine finishes in two minutes and another takes twelve. Currents orchestration replaces static shards with a coordination server that hands out spec files dynamically, so every machine stays busy until the whole suite is done. This typically cuts total wall-clock time significantly.

**Flaky test detection.** Because Currents has run history, it can distinguish a test that failed once and passed on retry (flaky) from a test that consistently fails (a real regression). It surfaces a flakiness score per test and trends it over time so you can prioritize the worst offenders.

**Analytics.** Suite duration trends, failure rates by branch, slowest tests, most-failing specs, and stability metrics are all charted. This is the layer that turns raw pass/fail data into decisions about where to invest engineering time.

## Prerequisites and Account Setup

Before writing any config, you need three things: a Playwright project (version 1.38 or newer is recommended for full reporter compatibility), Node.js 18 or newer, and a Currents account with a project record key.

Sign up at currents.dev, create a project, and copy two values from the project settings: the **Project ID** (a short string like \`abc123\`) and the **Record Key** (a longer secret). The record key authenticates uploads, so treat it like a password. Never commit it to source control. In local development you can put it in a \`.env\` file that is gitignored; in CI you store it as a secret.

Here is the minimal shell setup to confirm your Playwright project is healthy before adding Currents:

\`\`\`bash
# Confirm Node and Playwright versions
node --version        # v18.x or newer
npx playwright --version

# Run your existing suite to establish a baseline
npx playwright test
\`\`\`

Once that green baseline exists, you are ready to add the Currents reporter.

## Installing the Currents Reporter

The integration ships as a single npm package. Install it as a dev dependency:

\`\`\`bash
npm install --save-dev @currents/playwright
\`\`\`

The package provides a Playwright reporter you register in \`playwright.config.ts\`, plus a CLI (\`currents\`) used for orchestration. For non-orchestrated recording, you only need the reporter. The reporter runs alongside your existing reporters, so you keep the local HTML report and add Currents on top.

## Configuring playwright.config.ts

Reporters in Playwright are configured as an array, where each entry is a tuple of \`[reporterName, options]\`. To add Currents, append the \`@currents/playwright\` reporter and give it your project ID and record key. The cleanest pattern reads the record key from an environment variable so the secret never lands in the file.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Retries let Currents distinguish flaky from consistently failing.
  retries: process.env.CI ? 2 : 0,
  // Capture artifacts so Currents has something rich to show.
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  reporter: [
    // Keep the local HTML report for quick local debugging.
    ['html', { open: 'never' }],
    // Add Currents for observability and history.
    [
      '@currents/playwright',
      {
        ci: {
          // Optional: helps Currents group runs correctly in CI.
          group: process.env.CURRENTS_GROUP,
        },
      },
    ],
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
\`\`\`

Notice that \`retries\` is set to 2 in CI. This matters for flaky detection: a test that fails then passes on a retry is exactly what Currents labels as flaky. Without retries, a flake looks identical to a hard failure and you lose the signal. Capturing traces \`on-first-retry\` keeps artifact volume down while still giving you a trace for anything that misbehaved.

## Recording Your First Run

With the reporter configured, recording a run is a matter of exporting the credentials and running Playwright with a small wrapper. For simple recording (no orchestration), use the \`currents record\` CLI, which runs Playwright and streams results to the dashboard:

\`\`\`bash
export CURRENTS_PROJECT_ID="your_project_id"
export CURRENTS_RECORD_KEY="your_record_key"
# A CI build id groups all shards of one logical run together.
export CURRENTS_CI_BUILD_ID="local-$(date +%s)"

npx currents record --command "npx playwright test"
\`\`\`

The \`CURRENTS_CI_BUILD_ID\` is important. It is the key that ties multiple parallel machines into a single run in the dashboard. If ten machines each generate their own build ID, you get ten fragmented runs instead of one unified view. In CI you derive this from the run ID your provider gives you (more on that below).

After the command finishes, the console prints a URL to the recorded run. Open it and you will see the full run: every spec, per-test duration, artifacts on failures, and the beginnings of trend data once you have a few runs recorded.

## Setting Up Orchestration for Parallel Runs

Orchestration is where Currents earns its keep on large suites. Instead of you deciding statically that machine 1 runs specs A-M and machine 2 runs N-Z, the Currents orchestration server hands each machine the next spec file the moment it is free. Every machine pulls work until the queue is empty.

To enable it, each parallel machine runs the same \`currents record\` command with the same \`CURRENTS_CI_BUILD_ID\`. Currents recognizes that these are members of one run and coordinates spec distribution automatically. Here is the pattern for a single orchestrated machine:

\`\`\`bash
export CURRENTS_PROJECT_ID="your_project_id"
export CURRENTS_RECORD_KEY="your_record_key"
# Same build id on every machine ties them into one orchestrated run.
export CURRENTS_CI_BUILD_ID="\${GITHUB_RUN_ID}-\${GITHUB_RUN_ATTEMPT}"

npx currents record \\
  --command "npx playwright test" \\
  --ci-build-id "\${CURRENTS_CI_BUILD_ID}"
\`\`\`

The key insight is that you do not pass \`--shard\` to Playwright at all. With static Playwright sharding you would write \`--shard=1/4\`. With Currents orchestration you drop the shard flag entirely and let the server allocate. Add more machines and the suite finishes faster automatically, with no rebalancing on your part.

## Integrating with GitHub Actions

Here is a complete, runnable GitHub Actions workflow that runs a Playwright suite across four parallel machines with Currents orchestration. The record key comes from repository secrets, and the CI build ID is derived from the GitHub run ID so all four machines report into one Currents run.

\`\`\`yaml
name: E2E Tests with Currents

on:
  push:
    branches: [main]
  pull_request:

jobs:
  playwright:
    name: 'Playwright (machine \${{ matrix.machine }})'
    runs-on: ubuntu-latest
    strategy:
      # Do not cancel the whole matrix if one machine fails.
      fail-fast: false
      matrix:
        # Four machines pulling from the shared orchestration queue.
        machine: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run Playwright with Currents orchestration
        env:
          CURRENTS_PROJECT_ID: \${{ secrets.CURRENTS_PROJECT_ID }}
          CURRENTS_RECORD_KEY: \${{ secrets.CURRENTS_RECORD_KEY }}
          # GITHUB_RUN_ID is identical across all matrix machines,
          # so all four report into a single orchestrated run.
          CURRENTS_CI_BUILD_ID: \${{ github.run_id }}-\${{ github.run_attempt }}
        run: |
          npx currents record \\
            --command "npx playwright test" \\
            --ci-build-id "\${CURRENTS_CI_BUILD_ID}"
\`\`\`

A few details worth calling out. The matrix uses four machines but no \`--shard\` flag, because orchestration handles distribution. \`fail-fast: false\` ensures that a failure on one machine does not cancel the others, so Currents still receives a complete picture of the run. And because \`github.run_id\` is the same value on every matrix leg, all four legs merge into one run in the Currents dashboard rather than appearing as four separate runs.

To add the secrets, go to your repository Settings, then Secrets and variables, then Actions, and add \`CURRENTS_PROJECT_ID\` and \`CURRENTS_RECORD_KEY\`. This is the same secret-management discipline covered in our [CI/CD testing pipeline with GitHub Actions guide](/blog/cicd-testing-pipeline-github-actions).

## Flaky Test Detection in Practice

Flakiness is the single most corrosive problem in a growing test suite. One flaky test teaches the team to re-run failed jobs on reflex, and once that habit forms, real failures get re-run away too. Currents fights this by giving flakiness a number.

Because the reporter uploads retry outcomes, Currents can classify each test result precisely:

| Result pattern | Classification | What it means |
|---|---|---|
| Pass on first attempt | Passed | Healthy |
| Fail, then pass on retry | Flaky | Non-deterministic, needs attention |
| Fail on every attempt | Failed | Real regression, block the merge |
| Pass, later fails intermittently across runs | Flaky (trend) | Degrading stability over time |

The dashboard assigns each test a flakiness rate over a rolling window and lets you sort by it. You attack the top of that list first. This is a fundamentally different workflow from the HTML report, which shows only the current run and cannot tell you that a test has quietly flaked 15 times this month. For deeper strategies on eliminating the underlying causes, pair this with our guide on [how to fix flaky tests](/blog/fix-flaky-tests-guide).

## Currents vs Playwright HTML Report vs Allure

The three most common reporting choices for Playwright teams are the built-in HTML report, Allure, and Currents. They occupy different points on the spectrum from "zero setup, single run" to "hosted platform with history and orchestration."

| Capability | Playwright HTML Report | Allure | Currents |
|---|---|---|---|
| Setup cost | Zero (built in) | Moderate (adapter + CLI) | Low (reporter + key) |
| Hosting | Local / static file | Self-host or static | Managed SaaS |
| Historical trends | No | Limited (needs history store) | Yes, built in |
| Flaky detection | No | Manual / partial | Yes, automatic |
| Parallel orchestration | Static shards only | No | Yes, dynamic |
| Cross-run analytics | No | Basic | Rich dashboards |
| Trace / screenshot inline | Yes | Yes | Yes |
| Cost | Free | Free (OSS) | Paid (free tier available) |
| Best for | Local debugging | Rich per-run reports, on-prem | Team observability at scale |

The honest summary: the HTML report is unbeatable for debugging a single local run and you should always keep it in your reporter array. Allure produces beautiful, richly annotated per-run reports and is a strong choice when you need self-hosted control and do not need orchestration. Currents is the answer when your pain is cross-run: flaky trends, slow-suite creep, and parallel wall-clock time. These are not mutually exclusive. A common setup is HTML plus Currents together, giving you both local debuggability and hosted observability.

## Advanced Configuration and Tagging

Currents becomes far more useful when you feed it metadata. Tags let you slice analytics by feature area, test type, or team ownership. Playwright supports tags directly in test titles and via the \`tag\` option, and Currents indexes them.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('checkout completes with valid card', { tag: ['@smoke', '@checkout'] }, async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByText('Order confirmed')).toBeVisible();
});

test('search returns results', { tag: '@regression' }, async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Search').fill('playwright');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByTestId('results')).toBeVisible();
});
\`\`\`

In the Currents dashboard you can then filter failure rates and durations by \`@smoke\` versus \`@regression\`, which is invaluable when a specific feature area starts degrading. You can also attach custom metadata per run, such as the deployed commit SHA or environment name, so that a spike in failures can be correlated to a specific deploy.

## When Currents Is Worth It (and When It Is Not)

Currents is a paid platform, so it is worth being clear-eyed about the trade-off. It pays off when you have a suite large enough that parallel wall-clock time matters, a team big enough that flaky tests are eroding trust, and enough runs per day that historical trends are meaningful. In those conditions, the time saved on orchestration alone often justifies the cost, and the flaky-test triage workflow is hard to replicate with free tooling.

It is overkill when you have a small suite that runs in under two minutes on a single machine, a solo project, or a codebase where the HTML report already gives you everything you need. Start with the built-in report, add retries and traces, and only reach for Currents when cross-run observability becomes a real bottleneck. As your AI coding agents generate more tests and your suite grows, that inflection point tends to arrive sooner than teams expect, a dynamic we explore in [how AI agents are changing QA testing](/blog/how-ai-agents-changing-qa-testing). You can also browse ready-made Playwright and reporting [QA skills](/skills) to bootstrap your setup.

## Frequently Asked Questions

### What is Currents.dev used for?

Currents.dev is a test observability and reporting platform for Playwright and Cypress. It records every test run into a hosted dashboard, detects flaky tests using retry history, orchestrates parallel runs across multiple CI machines for faster wall-clock time, and provides analytics on suite duration, failure rates, and stability trends that the built-in HTML report cannot show.

### How do I install Currents for Playwright?

Install the reporter with \`npm install --save-dev @currents/playwright\`, then add \`'@currents/playwright'\` to the reporter array in your \`playwright.config.ts\`. Export \`CURRENTS_PROJECT_ID\` and \`CURRENTS_RECORD_KEY\` environment variables from your project settings, and run your suite with \`npx currents record --command "npx playwright test"\` to upload results.

### Is Currents free to use?

Currents offers a free tier suitable for small projects and evaluation, with paid plans that scale by the number of recorded test results and features like extended history retention. The Playwright HTML report and Allure remain free alternatives, but they do not provide hosted history, automatic flaky detection, or dynamic parallel orchestration.

### How does Currents detect flaky tests?

Currents relies on Playwright retries. When a test fails on its first attempt but passes on a retry within the same run, Currents labels it flaky rather than failed. Because it stores run history, it also assigns each test a flakiness rate over a rolling window, letting you sort tests by how often they misbehave and prioritize the worst offenders.

### What is the difference between Currents and the Playwright HTML report?

The Playwright HTML report shows a single run: current pass and fail results plus traces, stored as a local static file. Currents is a hosted platform that aggregates across every run, adding historical trends, automatic flaky detection, cross-machine orchestration, and analytics dashboards. Most teams keep the HTML report for local debugging and add Currents for team-level observability.

### Can Currents speed up my Playwright test suite?

Yes, through orchestration. Instead of static sharding where one machine can finish long before another, Currents dynamically distributes spec files across all parallel machines, keeping every machine busy until the queue is empty. You drop the Playwright \`--shard\` flag and use the same \`CURRENTS_CI_BUILD_ID\` on every machine, and total wall-clock time drops as you add more machines.

### Does Currents work with GitHub Actions?

Yes. You store the record key as a GitHub Actions secret, derive \`CURRENTS_CI_BUILD_ID\` from \`github.run_id\` so all matrix machines report into one run, and run \`npx currents record\` on each machine. With \`fail-fast: false\` on the matrix, every machine finishes and Currents receives a complete, unified picture of the run.

### Should I use Allure or Currents for Playwright?

Choose Allure when you need richly annotated per-run reports and want full self-hosted control without needing orchestration or hosted history. Choose Currents when your pain is cross-run: flaky-test trends, slow-suite creep, and reducing parallel wall-clock time. Allure excels at the single-report experience, while Currents excels at long-term observability and speeding up large suites.

## Conclusion

Playwright gives you a superb runner and a solid single-run report, but observability is a different problem. Currents fills that gap with hosted history, automatic flaky-test detection, dynamic parallel orchestration, and analytics that turn thousands of raw pass/fail results into decisions about where to spend engineering time. The setup is genuinely lightweight: install \`@currents/playwright\`, add one reporter entry, set two environment variables, and wire it into GitHub Actions with a shared CI build ID.

If your suite is small and fast, keep using the built-in HTML report. But once flaky tests start eroding trust or parallel wall-clock time becomes a bottleneck, Currents is one of the fastest observability wins available to a Playwright team. Ready to level up the rest of your testing stack? Explore the full library of Playwright, reporting, and CI [QA skills](/skills) built for AI coding agents and get your suite production-ready.
`,
};
