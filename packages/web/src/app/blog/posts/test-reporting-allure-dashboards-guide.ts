import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Reporting — Allure, Dashboards, and Actionable QA Insights',
  description:
    'Complete guide to test reporting and dashboards. Covers Allure Report setup, CI/CD report generation, custom dashboards, trend analysis, and actionable test insights.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
You just finished a massive test run -- 3,400 tests across unit, integration, and end-to-end suites. The CI pipeline shows a green checkmark. But when the engineering director asks "Are we ready to release?", all you can offer is "Tests passed." That answer is not good enough. A single pass/fail status hides critical information: which areas were tested and which were not, how long tests took compared to last week, whether that flaky checkout test failed again, and whether your test suite is growing alongside the codebase or falling behind. **Test reporting** transforms raw test execution data into actionable insights that help you make better release decisions, identify quality trends, and communicate testing value to every stakeholder in your organization. This guide covers everything from setting up **Allure Report** to building custom **test dashboards**, generating reports in CI/CD, and using trend analysis to catch problems before they become production incidents.

## Key Takeaways

- **Test reporting** goes far beyond pass/fail -- it provides visibility into test trends, execution performance, failure patterns, and release readiness that raw results cannot convey
- **Allure Report** is the most feature-rich open-source test reporting framework, supporting 20+ testing frameworks across Java, Python, JavaScript, and other ecosystems with rich categorization, attachments, and history tracking
- **CI/CD report generation** using GitHub Actions and Allure ensures every pipeline run produces a detailed, browsable report with historical trend data published to GitHub Pages or a dedicated report server
- **Custom dashboards** built with Grafana and InfluxDB let you visualize long-term test metrics like pass rate trends, execution time regression, flaky test counts, and coverage changes across releases
- **Audience-specific reporting** is critical -- developers need detailed failure traces, QA leads need trend analysis and coverage gaps, and management needs release readiness summaries and risk assessments
- **AI-powered QA agents** can automate report generation, trend analysis, and bug report writing, turning hours of manual reporting work into minutes

---

## Why Test Reporting Matters

A raw pass/fail result from your test suite is the minimum viable output. It tells you exactly one thing: did everything pass, or did something fail? That is useful for gating a deployment, but it tells you nothing about the health, trajectory, or completeness of your testing effort.

**Stakeholder communication** is the first reason test reporting matters. Your QA team is not the only audience for test results. Product managers need to know if a feature is tested thoroughly enough to ship. Engineering directors need to understand quality trends across sprints. Release managers need a confidence score for go/no-go decisions. Without structured reports, these conversations rely on anecdote and gut feeling -- neither of which scales.

**Trend identification** is the second reason. A test suite that passes today might be degrading in ways that are invisible without historical data. Maybe your end-to-end suite has gotten 40% slower over the last three months because of accumulated test bloat. Maybe your integration test failures have doubled since a database migration. Maybe your pass rate drops every Thursday because of a cron job that pollutes the test environment. You cannot detect these patterns by looking at a single test run.

**Flaky test detection** is the third reason. Flaky tests -- tests that sometimes pass and sometimes fail without any code change -- are the single biggest threat to test suite credibility. A test that fails intermittently trains developers to ignore failures and re-run the pipeline, eroding the trust that makes CI/CD valuable. Proper test reporting tracks flaky tests explicitly, measures their frequency, and gives you the data to prioritize fixing them. For a deep dive on this topic, see our [guide to fixing flaky tests](/blog/fix-flaky-tests-guide).

**Release confidence** is the final reason. When your test report shows high pass rates, stable trends, comprehensive coverage, and zero critical failures, you can ship with confidence. When it shows a spike in failures, declining coverage, or new untested areas, you know to investigate before deploying. Test reporting turns "I think we are ready" into "The data shows we are ready."

---

## Types of Test Reports

Not all test reports serve the same purpose. The format, detail level, and intended audience vary significantly depending on the reporting tool and context.

| Report Type | Format | Audience | Detail Level | Integration |
|---|---|---|---|---|
| **JUnit XML** | XML files | CI/CD systems, parsers | Low -- pass/fail per test, timing, error messages | Universal -- every CI system and test framework supports it |
| **HTML reports** | Static HTML | Developers, QA | Medium -- grouped results with expandable failures | Framework-specific (Playwright HTML Reporter, pytest-html) |
| **Allure Report** | Interactive web app | Everyone | High -- categories, suites, timelines, graphs, attachments, trends | 20+ frameworks via adapters (Playwright, Jest, pytest, JUnit, etc.) |
| **Custom dashboards** | Grafana, Datadog, etc. | QA leads, management | Configurable -- aggregated metrics, trend lines, alerts | Requires data pipeline from CI to metrics store |
| **CI/CD native** | Built-in UI panels | Developers | Low to medium -- test summaries, failure annotations | GitHub Actions, GitLab CI, Jenkins (varies by platform) |

**JUnit XML** is the universal interchange format. Nearly every test framework can produce JUnit XML output, and nearly every CI system can parse it. It is the lowest common denominator -- useful for basic pass/fail reporting and as input to more sophisticated reporting tools, but lacking in rich categorization and visualization.

**Framework-specific HTML reports** are a step up. Playwright's built-in HTML reporter, for example, provides a browsable report with screenshots, traces, and video attachments for failed tests. These reports are excellent for debugging but lack cross-framework aggregation and historical trends.

**Allure Report** is the gold standard for open-source test reporting. It aggregates results from multiple frameworks into a single, interactive web application with categories, severity labels, timeline views, trend graphs, and rich attachments. It is the tool we will focus on most heavily in this guide.

**Custom dashboards** are necessary when you need long-term trend analysis across releases, teams, or projects. Tools like Grafana and Datadog let you build dashboards that track metrics over weeks and months, set up alerts when metrics cross thresholds, and correlate test data with deployment events.

---

## Getting Started with Allure Report

**Allure Report** is an open-source test reporting framework maintained by Qameta Software. It generates an interactive, browsable web report from test results produced by any supported framework. The key concept is that your test framework produces raw result files (typically JSON), and the Allure command-line tool generates the final HTML report from those files.

### Installation

Install the Allure command-line tool globally:

\`\`\`bash
# Using npm
npm install -g allure-commandline

# Using Homebrew (macOS)
brew install allure

# Using Scoop (Windows)
scoop install allure
\`\`\`

### Playwright Integration

Playwright has first-class Allure support via the \`allure-playwright\` adapter:

\`\`\`bash
npm install --save-dev allure-playwright
\`\`\`

Configure it in your \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['allure-playwright', {
      outputFolder: 'allure-results',
      detail: true,
      suiteTitle: true,
    }],
  ],
  // ... rest of your config
});
\`\`\`

Run your tests, then generate and open the report:

\`\`\`bash
npx playwright test
allure generate allure-results --clean -o allure-report
allure open allure-report
\`\`\`

### pytest Integration

For Python projects using pytest, install the \`allure-pytest\` adapter:

\`\`\`bash
pip install allure-pytest
\`\`\`

Run tests with the Allure flag:

\`\`\`bash
pytest --alluredir=allure-results
allure generate allure-results --clean -o allure-report
allure open allure-report
\`\`\`

### Jest and Vitest Integration

For Jest, use \`jest-allure2-reporter\`:

\`\`\`bash
npm install --save-dev jest-allure2-reporter
\`\`\`

For Vitest, use \`allure-vitest\`:

\`\`\`bash
npm install --save-dev allure-vitest
\`\`\`

Configure Vitest in \`vitest.config.ts\`:

\`\`\`typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    reporters: ['default', 'allure-vitest'],
    outputFile: {
      'allure-vitest': 'allure-results',
    },
  },
});
\`\`\`

After running tests with any of these frameworks, the workflow is the same: \`allure generate\` to build the report, \`allure open\` to view it in your browser.

---

## Allure Report Features

Allure is not just a pretty HTML page -- it is a comprehensive test analytics platform. Understanding its features helps you get maximum value from your **test results visualization**.

### Categories and Suites

Allure automatically groups test results by **categories** (based on failure type) and **suites** (based on your test file structure). You can customize categories by adding a \`categories.json\` file to your \`allure-results\` directory:

\`\`\`json
[
  {
    "name": "Product Defects",
    "matchedStatuses": ["failed"],
    "messageRegex": ".*AssertionError.*"
  },
  {
    "name": "Infrastructure Issues",
    "matchedStatuses": ["broken"],
    "messageRegex": ".*TimeoutError.*|.*ECONNREFUSED.*"
  },
  {
    "name": "Flaky Tests",
    "matchedStatuses": ["failed"],
    "flaky": true
  }
]
\`\`\`

This categorization is powerful because it separates genuine product defects from infrastructure issues and known flaky tests, giving you an accurate picture of real quality problems.

### Timeline and Graphs

The **Timeline** tab shows a Gantt chart of test execution, revealing parallelization effectiveness and identifying bottleneck tests that take disproportionately long. The **Graphs** tab provides visual breakdowns of test results by severity, duration, status, and category -- ideal for quick assessment of overall suite health.

### Attachments -- Screenshots, Videos, and Traces

Allure supports attaching arbitrary files to test results. For UI testing, this is invaluable:

\`\`\`typescript
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';

test('checkout flow completes successfully', async ({ page }) => {
  allure.severity('critical');
  allure.feature('Checkout');
  allure.story('Complete Purchase');
  allure.link('https://jira.example.com/browse/SHOP-1234', 'SHOP-1234');

  await test.step('Navigate to product page', async () => {
    await page.goto('/products/widget-pro');
  });

  await test.step('Add item to cart', async () => {
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.getByRole('link', { name: 'Cart (1)' }).click();
  });

  await test.step('Complete checkout', async () => {
    await page.getByRole('button', { name: 'Checkout' }).click();
    // fill payment details...
  });
});
\`\`\`

In this example, **severity labels** (\`critical\`, \`blocker\`, \`normal\`, \`minor\`, \`trivial\`) let you filter the report by business impact. **Feature and story annotations** map tests to your product structure. **Links** connect test results directly to Jira tickets or GitHub issues. **Steps** break down the test into human-readable phases that appear in the Allure report as an expandable tree.

### Trend History

When you preserve the \`allure-report/history\` directory between runs and copy it into \`allure-results/history\` before generating the next report, Allure tracks trends over time. You get graphs showing pass rate changes, new failures, fixed tests, and duration trends across builds. This is the foundation for meaningful **QA reporting** over time, and it becomes even more powerful when automated in CI/CD.

---

## CI/CD Report Generation

Generating Allure reports locally is useful for debugging, but the real value comes from integrating report generation into your CI/CD pipeline so that every build produces a browsable, historical report automatically.

### GitHub Actions Workflow

Here is a complete GitHub Actions workflow that runs Playwright tests, generates an Allure report with trend history, and publishes it to GitHub Pages:

\`\`\`yaml
name: Test and Report
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Playwright tests
        run: npx playwright test
        continue-on-error: true

      - name: Download previous Allure history
        uses: actions/download-artifact@v4
        with:
          name: allure-history
          path: allure-results/history
        continue-on-error: true

      - name: Generate Allure report
        run: |
          npm install -g allure-commandline
          allure generate allure-results --clean -o allure-report

      - name: Upload Allure history for next run
        uses: actions/upload-artifact@v4
        with:
          name: allure-history
          path: allure-report/history
          retention-days: 30

      - name: Deploy to GitHub Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: allure-report

  deploy-report:
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ github.event.repository.html_url }}
    steps:
      - uses: actions/deploy-pages@v4
\`\`\`

This workflow preserves the **history** directory as a build artifact, so each new report generation includes trend data from previous runs. The result is a live report at \`https://your-org.github.io/your-repo/\` that updates on every push.

### Allure Docker Service for Persistent History

For teams that need more robust history management than GitHub artifacts provide, the **Allure Docker Service** runs a persistent Allure server that stores all historical results:

\`\`\`yaml
# docker-compose.yml
version: '3'
services:
  allure:
    image: frankescobar/allure-docker-service
    ports:
      - "5050:5050"
    environment:
      CHECK_RESULTS_EVERY_SECONDS: 5
      KEEP_HISTORY: 1
      KEEP_HISTORY_LATEST: 25
    volumes:
      - ./allure-results:/app/allure-results
      - ./allure-reports:/app/default-reports
\`\`\`

With this setup, your CI pipeline simply uploads result files to the Allure server after each test run, and the server handles report generation, history preservation, and serving the report UI. This approach scales better for teams with multiple projects and high pipeline frequency.

---

## Building Custom Dashboards

Allure provides excellent per-build reporting, but when you need to track **test metrics** across weeks, months, or releases, you need a dedicated metrics dashboard. The most common stack for this is **Grafana** for visualization and **InfluxDB** (or Prometheus) for time-series data storage.

### Architecture Overview

\`\`\`
Test Framework (Playwright, pytest, Jest)
    |
    v
CI/CD Pipeline (GitHub Actions)
    |
    +--> Allure Report (per-build detail)
    |
    +--> Metrics Exporter Script
            |
            v
        InfluxDB (time-series metrics store)
            |
            v
        Grafana Dashboard (visualization + alerts)
\`\`\`

The **metrics exporter script** is a small program that runs after your tests complete, parses the JUnit XML or Allure JSON results, and writes aggregated metrics to InfluxDB. Here is an example in Python:

\`\`\`python
import xml.etree.ElementTree as ET
from influxdb_client import InfluxDBClient, Point
from datetime import datetime

def export_test_metrics(junit_xml_path, project, branch):
    tree = ET.parse(junit_xml_path)
    root = tree.getroot()

    total = int(root.attrib.get('tests', 0))
    failures = int(root.attrib.get('failures', 0))
    errors = int(root.attrib.get('errors', 0))
    skipped = int(root.attrib.get('skipped', 0))
    passed = total - failures - errors - skipped
    duration = float(root.attrib.get('time', 0))

    client = InfluxDBClient(
        url="http://localhost:8086",
        token="your-influxdb-token",
        org="your-org"
    )
    write_api = client.write_api()

    point = (
        Point("test_execution")
        .tag("project", project)
        .tag("branch", branch)
        .field("total", total)
        .field("passed", passed)
        .field("failed", failures + errors)
        .field("skipped", skipped)
        .field("pass_rate", (passed / total * 100) if total > 0 else 0)
        .field("duration_seconds", duration)
        .time(datetime.utcnow())
    )

    write_api.write(bucket="test-metrics", record=point)
    client.close()
\`\`\`

### Key Dashboard Widgets

A well-designed **test dashboard** should include these core widgets:

- **Pass rate trend** -- A line chart showing pass rate percentage over time, with a target line at 98%. This is your primary suite health indicator. Any sustained dip below the target triggers investigation
- **Execution time trend** -- A line chart tracking total suite execution time per build. Gradual increases signal test bloat or performance regression in the application under test
- **Flaky test count** -- A bar chart showing the number of flaky tests detected per week. This should trend toward zero over time as your team systematically fixes or removes flaky tests
- **Test count growth** -- A stacked area chart showing total tests broken down by type (unit, integration, e2e) over time. Healthy projects show proportional growth alongside feature development
- **Failure category breakdown** -- A pie or bar chart showing failures grouped by category (product defect, infrastructure, flaky, environment). This helps you understand whether failures represent real quality issues or test infrastructure problems
- **Coverage trend** -- A line chart tracking code coverage percentage or requirement coverage over time, helping ensure coverage does not silently erode

### Setting Up Grafana Alerts

Dashboards are only useful if someone looks at them. **Grafana alerts** ensure you are notified when metrics cross critical thresholds:

\`\`\`yaml
# Example Grafana alert rule (provisioned via YAML)
groups:
  - name: test-quality-alerts
    rules:
      - alert: PassRateDropped
        expr: test_execution_pass_rate < 95
        for: 3 builds
        labels:
          severity: warning
        annotations:
          summary: "Test pass rate dropped below 95%"

      - alert: ExecutionTimeSpike
        expr: test_execution_duration_seconds > 1800
        for: 2 builds
        labels:
          severity: warning
        annotations:
          summary: "Test suite execution time exceeded 30 minutes"
\`\`\`

---

## Trend Analysis

Generating reports for individual builds is table stakes. The real power of **test reporting** comes from analyzing trends across builds, sprints, and releases to detect problems early and measure improvement over time.

### Detecting Degradation Over Time

A test suite that passes today might be slowly degrading in ways that are invisible without trend analysis. Common degradation patterns include:

- **Gradual pass rate decline** -- The pass rate drops from 99% to 97% to 94% over several weeks. No single build triggers alarm, but the trend is clear. Root causes typically include accumulating flaky tests, test environment drift, or insufficient test maintenance as the application evolves
- **Execution time creep** -- Total suite time increases by 2--3% per sprint. After six months, a 10-minute suite now takes 20 minutes. This happens when new tests are added without removing obsolete ones, or when the application under test becomes slower due to feature accumulation
- **Failure clustering** -- Failures begin concentrating in specific modules or test suites. This often signals a codebase area that is being actively developed without corresponding test maintenance

Track these trends weekly. Add them to your sprint retrospective. When you detect a negative trend, address it before it compounds.

### Tracking Flaky Tests

Flaky tests deserve their own trend analysis. For each test in your suite, track its **pass/fail history** over the last N runs. A test that has failed even once in the last 20 runs without a corresponding code change is flaky.

Useful flaky test metrics include:

- **Flaky test count** -- Total number of tests exhibiting flaky behavior. Track this weekly; it should decrease over time
- **Flaky test rate** -- Flaky tests as a percentage of total tests. Target below 2%
- **Worst offenders** -- The 10 flakiest tests ranked by failure frequency. Fix these first for maximum impact
- **Mean time to fix flaky tests** -- How long flaky tests remain in the suite before being fixed or removed. Shorter is better

### Test Suite Growth Monitoring

Your test suite should grow proportionally to your codebase. If your team ships 50 new features per quarter but only adds 20 new tests, coverage is silently eroding. Track the **test-to-code ratio** over time:

\`\`\`
Test-to-Code Ratio = Lines of test code / Lines of production code
\`\`\`

A healthy ratio varies by project type, but most teams target between 1:1 and 2:1 (test code to production code). If this ratio is declining, your test coverage is falling behind feature development.

### Performance Regression Detection from Test Durations

Your test durations contain hidden performance data. If an API integration test that normally completes in 200ms suddenly starts taking 2 seconds, the application endpoint it tests has likely regressed in performance. By tracking individual test durations over time, you can detect application performance regressions before they are noticed by users or flagged by dedicated performance tests.

Set up alerts for individual tests whose duration exceeds 3x their historical median. This turns your functional test suite into a lightweight performance monitoring tool at zero additional cost.

---

## Reporting for Different Audiences

One of the most common test reporting mistakes is producing a single report and expecting it to serve everyone. **Developers**, **QA leads**, and **management** have fundamentally different needs when it comes to test results.

### Developers -- Detailed Failure Information

Developers need to fix failing tests quickly. Their ideal report contains:

- **Exact failure message and stack trace** with line numbers
- **Screenshots and video recordings** of the moment of failure (for UI tests)
- **Diff output** showing expected vs. actual values
- **Test steps** showing exactly what happened before the failure
- **Environment details** -- OS, browser version, Node version, database state
- **Link to the failing code** in the repository

Allure's per-test detail view is perfect for this audience. Configure your tests to attach maximum context on failure, and developers can diagnose most issues without running the test locally.

### QA Leads -- Trends and Coverage

QA leads need to understand the big picture. Their ideal report contains:

- **Pass rate trends** over the last 10--20 builds
- **Coverage gaps** -- which features, endpoints, or user flows lack test coverage
- **Flaky test inventory** with frequency data and ownership
- **Test suite growth** relative to feature development
- **Execution time trends** to plan infrastructure scaling
- **Failure category breakdown** to distinguish real defects from infrastructure noise

Grafana dashboards are the best tool for this audience. Set up a weekly review cadence where the QA lead reviews the dashboard and creates action items for trend-related issues.

### Management -- Release Readiness and Risk

Management needs a high-level answer to "Can we ship?" Their ideal report contains:

- **Release readiness score** -- a composite metric combining pass rate, coverage, and open critical defects
- **Risk assessment** -- which areas have the lowest coverage or highest failure rates
- **Quality trend summary** -- is quality improving or degrading compared to the last release?
- **Defect escape rate** -- how many bugs reached production in the last release?
- **Testing ROI** -- how much time and money does automated testing save compared to manual testing? See our [test automation ROI guide](/blog/test-automation-roi-business-case) for calculating this

Create a one-page release quality summary that answers these questions with data. Update it before every release decision meeting. This transforms QA from a perceived bottleneck into a strategic partner in release decisions.

---

## Automate Test Reporting with AI Agents

Manual report generation and analysis is time-consuming and error-prone. AI coding agents can automate significant portions of the test reporting workflow, from generating Allure reports to writing detailed bug reports from test failures.

Install the **Allure report generator** skill to give your AI agent the ability to configure Allure integrations, generate reports, and analyze results:

\`\`\`bash
npx @qaskills/cli add allure-report-generator
\`\`\`

For automated bug report writing from test failures, install the **bug report writing** skill:

\`\`\`bash
npx @qaskills/cli add bug-report-writing
\`\`\`

These skills teach your AI agent to parse test results, extract meaningful failure context, correlate failures with code changes, and produce structured reports that save hours of manual analysis.

Browse all available QA skills at the [skills directory](/skills) or get started with the [installation guide](/getting-started). For related topics, see our [QA metrics and KPIs guide](/blog/qa-metrics-kpis-dashboard-guide) for deeper coverage of what to measure, and our [CI/CD pipeline guide](/blog/cicd-testing-pipeline-github-actions) for setting up the pipeline infrastructure that powers automated reporting.

---

## Frequently Asked Questions

### What is the best test reporting tool for CI/CD pipelines?

**Allure Report** is the best general-purpose test reporting tool for CI/CD pipelines. It supports 20+ testing frameworks, generates rich interactive reports with categories, timelines, and trend history, and integrates with every major CI system. For teams that need long-term metrics tracking beyond individual builds, combine Allure with a Grafana dashboard backed by InfluxDB or Prometheus. If you only need basic pass/fail reporting, JUnit XML with your CI system's native rendering (GitHub Actions test summaries, GitLab test reports) is sufficient, but you will outgrow it as your testing practice matures.

### How do I set up Allure Report with Playwright?

Install the \`allure-playwright\` npm package, configure it as a reporter in your \`playwright.config.ts\` with an \`outputFolder\` for results, run your tests normally, then use \`allure generate\` and \`allure open\` to build and view the report. For CI/CD, add a step that preserves the \`allure-report/history\` directory between builds (using artifacts or a persistent storage volume) so that trend graphs accumulate data over time. The setup takes about 15 minutes and immediately gives you categorized results, screenshots on failure, execution timeline, and severity-based filtering.

### How do I track flaky tests in test reports?

Allure tracks flaky tests automatically when you preserve history between builds -- it compares current results with previous runs and flags tests whose status changed without a code change. For more systematic tracking, export test results to a database and query for tests with inconsistent pass/fail patterns over the last N runs. Set a threshold (e.g., any test that failed at least once in the last 20 runs without a code change is flaky) and maintain a flaky test dashboard. The most important step is making flaky test count a visible metric that your team reviews weekly.

### What test metrics should I show to management?

Management needs four things: **release readiness** (a composite score or RAG status combining pass rate, coverage, and open critical defects), **quality trends** (is the defect escape rate improving or worsening release over release), **risk areas** (which modules or features have the lowest test coverage or highest failure rates), and **testing ROI** (hours saved through automation, defects caught before production, reduction in post-release incidents). Present these as a one-page summary with clear visualizations -- avoid raw numbers and technical jargon. A traffic-light system (green/amber/red) for release readiness is particularly effective for executive communication.

### How do I generate test reports automatically in GitHub Actions?

Add a step to your GitHub Actions workflow that runs after your test execution step. Install \`allure-commandline\` globally, download the previous build's history from a stored artifact, run \`allure generate allure-results --clean -o allure-report\`, upload the new history as an artifact for the next build, and deploy the generated report to GitHub Pages using the \`actions/deploy-pages\` action. Set \`continue-on-error: true\` on the test execution step so that reports are generated even when tests fail -- the report is most valuable when there are failures to investigate. The complete workflow YAML is provided in the CI/CD Report Generation section above.
`,
};
