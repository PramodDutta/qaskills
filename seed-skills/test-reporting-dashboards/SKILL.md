---
name: Test Reporting & Dashboards
description: Building test reporting dashboards with real-time execution metrics, trend analysis, flaky test detection, coverage visualization, and integration with Allure, ReportPortal, and custom dashboards using Grafana and Prometheus.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [test-reporting, dashboards, allure, reportportal, grafana, prometheus, metrics, analytics, visualization, trend-analysis]
testingTypes: [unit, integration, e2e, api, performance]
frameworks: [playwright, vitest, jest, cypress]
languages: [typescript, javascript, python]
domains: [web, backend, devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Test Reporting & Dashboards Skill

You are an expert in building test reporting systems and quality dashboards. When the user asks you to set up test reporting, create quality metric dashboards, integrate with Allure or ReportPortal, or build custom reporting pipelines, follow these detailed instructions.

## Core Principles

1. **Actionable metrics over vanity numbers** -- Report metrics that drive decisions: defect escape rate, flaky test trends, time-to-fix, and coverage gaps rather than just pass/fail counts.
2. **Real-time visibility** -- Teams need to see test results immediately after execution. Build streaming or near-real-time reporting, not batch overnight reports.
3. **Trend analysis over point-in-time snapshots** -- A single test run is noise. Track trends over weeks and months to identify systemic quality improvements or degradations.
4. **Flaky test identification** -- Automatically detect and report tests that inconsistently pass or fail. Flaky tests erode confidence in the entire suite.
5. **Multi-dimensional filtering** -- Allow users to slice reports by test type, feature area, browser, environment, and time range for targeted investigation.
6. **Automated alerting** -- Configure alerts for quality threshold breaches: coverage drops, new flaky tests, unusual failure spikes, and execution time increases.
7. **Integration with development workflow** -- Reports should integrate into PR reviews, Slack channels, and CI/CD dashboards where developers already work.

## Project Structure

```
test-reporting/
  collectors/
    vitest-collector.ts
    playwright-collector.ts
    jest-collector.ts
    generic-junit-collector.ts
  processors/
    result-aggregator.ts
    trend-calculator.ts
    flaky-detector.ts
    coverage-analyzer.ts
  storage/
    database-schema.ts
    result-store.ts
    migration.ts
  dashboards/
    quality-overview.ts
    execution-trends.ts
    flaky-tests.ts
    coverage-report.ts
    team-performance.ts
  exporters/
    allure-exporter.ts
    html-exporter.ts
    json-exporter.ts
    slack-notifier.ts
    github-pr-commenter.ts
  config/
    reporting-config.ts
    alert-config.ts
  api/
    report-api.ts
    webhook-handler.ts
```

## Test Result Collector

```typescript
// collectors/vitest-collector.ts
export interface TestResult {
  id: string;
  name: string;
  suite: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: { message: string; stack: string };
  retries: number;
  timestamp: string;
  tags: string[];
  environment: string;
  browser?: string;
}

export interface TestRunSummary {
  runId: string;
  timestamp: string;
  duration: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  results: TestResult[];
  environment: string;
  branch: string;
  commit: string;
}

export function parseVitestResults(jsonReport: any): TestRunSummary {
  const results: TestResult[] = [];

  for (const file of jsonReport.testResults || []) {
    for (const test of file.assertionResults || []) {
      results.push({
        id: `${file.name}:${test.fullName}`,
        name: test.title,
        suite: test.ancestorTitles.join(' > '),
        file: file.name,
        status: test.status === 'passed' ? 'passed' : test.status === 'pending' ? 'skipped' : 'failed',
        duration: test.duration || 0,
        error: test.failureMessages?.length > 0
          ? { message: test.failureMessages[0], stack: test.failureMessages.join('\n') }
          : undefined,
        retries: 0,
        timestamp: new Date().toISOString(),
        tags: [],
        environment: process.env.TEST_ENV || 'local',
      });
    }
  }

  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  return {
    runId: `run-${Date.now()}`,
    timestamp: new Date().toISOString(),
    duration: jsonReport.totalTime || 0,
    total: results.length,
    passed,
    failed,
    skipped,
    passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
    results,
    environment: process.env.TEST_ENV || 'local',
    branch: process.env.GIT_BRANCH || 'unknown',
    commit: process.env.GIT_COMMIT || 'unknown',
  };
}
```

## Flaky Test Detector

```typescript
// processors/flaky-detector.ts
export interface FlakyTestReport {
  testId: string;
  testName: string;
  flakyScore: number;
  passRate: number;
  totalRuns: number;
  recentResults: Array<{ date: string; status: string }>;
  firstFlakeDate: string;
  suggestedAction: 'quarantine' | 'investigate' | 'monitor' | 'stable';
}

export function detectFlakyTests(
  history: Array<{ testId: string; testName: string; status: string; date: string }>,
  minRuns = 5,
  flakyThreshold = 0.1
): FlakyTestReport[] {
  const testMap = new Map<string, Array<{ status: string; date: string; name: string }>>();

  for (const result of history) {
    const runs = testMap.get(result.testId) || [];
    runs.push({ status: result.status, date: result.date, name: result.testName });
    testMap.set(result.testId, runs);
  }

  const flakyTests: FlakyTestReport[] = [];

  for (const [testId, runs] of testMap) {
    if (runs.length < minRuns) continue;

    const passed = runs.filter((r) => r.status === 'passed').length;
    const passRate = passed / runs.length;

    // Flaky = not always passing, not always failing
    if (passRate > flakyThreshold && passRate < (1 - flakyThreshold)) {
      const recentResults = runs.slice(-10).map((r) => ({ date: r.date, status: r.status }));

      // Find first flake
      let firstFlake = '';
      for (let i = 1; i < runs.length; i++) {
        if (runs[i].status !== runs[i - 1].status) {
          firstFlake = runs[i].date;
          break;
        }
      }

      const flakyScore = 1 - Math.abs(passRate - 0.5) * 2;

      flakyTests.push({
        testId,
        testName: runs[0].name,
        flakyScore: Math.round(flakyScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        totalRuns: runs.length,
        recentResults,
        firstFlakeDate: firstFlake,
        suggestedAction: flakyScore > 0.7 ? 'quarantine' : flakyScore > 0.4 ? 'investigate' : 'monitor',
      });
    }
  }

  return flakyTests.sort((a, b) => b.flakyScore - a.flakyScore);
}
```

## Trend Calculator

```typescript
// processors/trend-calculator.ts
export interface QualityTrend {
  date: string;
  passRate: number;
  totalTests: number;
  executionTime: number;
  flakyCount: number;
  newFailures: number;
}

export interface TrendAnalysis {
  trends: QualityTrend[];
  direction: 'improving' | 'declining' | 'stable';
  passRateChange: number;
  executionTimeChange: number;
  flakyTestChange: number;
  alerts: string[];
}

export function calculateTrends(
  runs: Array<{ date: string; passRate: number; total: number; duration: number; flakyCount: number; newFailures: number }>,
  windowSize = 7
): TrendAnalysis {
  if (runs.length < 2) {
    return {
      trends: runs.map((r) => ({ ...r, totalTests: r.total, executionTime: r.duration })),
      direction: 'stable',
      passRateChange: 0,
      executionTimeChange: 0,
      flakyTestChange: 0,
      alerts: [],
    };
  }

  const trends: QualityTrend[] = runs.map((r) => ({
    date: r.date,
    passRate: r.passRate,
    totalTests: r.total,
    executionTime: r.duration,
    flakyCount: r.flakyCount,
    newFailures: r.newFailures,
  }));

  const recent = runs.slice(-windowSize);
  const previous = runs.slice(-windowSize * 2, -windowSize);

  const recentAvgPass = average(recent.map((r) => r.passRate));
  const previousAvgPass = previous.length > 0 ? average(previous.map((r) => r.passRate)) : recentAvgPass;
  const passRateChange = recentAvgPass - previousAvgPass;

  const recentAvgTime = average(recent.map((r) => r.duration));
  const previousAvgTime = previous.length > 0 ? average(previous.map((r) => r.duration)) : recentAvgTime;
  const executionTimeChange = ((recentAvgTime - previousAvgTime) / previousAvgTime) * 100;

  const recentFlaky = average(recent.map((r) => r.flakyCount));
  const previousFlaky = previous.length > 0 ? average(previous.map((r) => r.flakyCount)) : recentFlaky;

  const direction = passRateChange > 1 ? 'improving' : passRateChange < -1 ? 'declining' : 'stable';

  const alerts: string[] = [];
  if (passRateChange < -5) alerts.push(`Pass rate dropped ${Math.abs(passRateChange).toFixed(1)}% over the last ${windowSize} runs`);
  if (executionTimeChange > 20) alerts.push(`Execution time increased ${executionTimeChange.toFixed(1)}%`);
  if (recentFlaky > previousFlaky + 2) alerts.push(`Flaky test count increased from ${previousFlaky.toFixed(0)} to ${recentFlaky.toFixed(0)}`);

  return {
    trends,
    direction,
    passRateChange: Math.round(passRateChange * 100) / 100,
    executionTimeChange: Math.round(executionTimeChange * 100) / 100,
    flakyTestChange: Math.round(recentFlaky - previousFlaky),
    alerts,
  };
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}
```

## Slack Notifier

```typescript
// exporters/slack-notifier.ts
export interface SlackNotification {
  channel: string;
  summary: string;
  passRate: number;
  failed: number;
  total: number;
  duration: string;
  buildUrl?: string;
  failures?: Array<{ name: string; error: string }>;
}

export async function sendSlackNotification(
  webhookUrl: string,
  notification: SlackNotification
): Promise<void> {
  const color = notification.passRate >= 95 ? '#36a64f' : notification.passRate >= 80 ? '#ff9900' : '#ff0000';
  const emoji = notification.passRate >= 95 ? ':white_check_mark:' : notification.passRate >= 80 ? ':warning:' : ':x:';

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} Test Results: ${notification.summary}` },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Pass Rate:* ${notification.passRate.toFixed(1)}%` },
        { type: 'mrkdwn', text: `*Failed:* ${notification.failed}/${notification.total}` },
        { type: 'mrkdwn', text: `*Duration:* ${notification.duration}` },
      ],
    },
  ];

  if (notification.failures && notification.failures.length > 0) {
    const failureText = notification.failures
      .slice(0, 5)
      .map((f) => `- ${f.name}: ${f.error.substring(0, 80)}`)
      .join('\n');
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Failures:*\n${failureText}` },
    } as any);
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: notification.channel,
      attachments: [{ color, blocks }],
    }),
  });
}
```

## GitHub PR Comment Reporter

```typescript
// exporters/github-pr-commenter.ts
export async function commentOnPR(params: {
  token: string;
  owner: string;
  repo: string;
  prNumber: number;
  summary: { total: number; passed: number; failed: number; skipped: number; passRate: number; duration: string };
  failures: Array<{ name: string; error: string }>;
}): Promise<void> {
  const { summary, failures } = params;
  const statusIcon = summary.passRate >= 95 ? '**PASSED**' : '**FAILED**';

  let body = `## Test Results ${statusIcon}\n\n`;
  body += `| Metric | Value |\n|--------|-------|\n`;
  body += `| Total Tests | ${summary.total} |\n`;
  body += `| Passed | ${summary.passed} |\n`;
  body += `| Failed | ${summary.failed} |\n`;
  body += `| Skipped | ${summary.skipped} |\n`;
  body += `| Pass Rate | ${summary.passRate.toFixed(1)}% |\n`;
  body += `| Duration | ${summary.duration} |\n\n`;

  if (failures.length > 0) {
    body += `### Failures\n\n`;
    for (const failure of failures.slice(0, 10)) {
      body += `<details><summary>${failure.name}</summary>\n\n\`\`\`\n${failure.error}\n\`\`\`\n</details>\n\n`;
    }
  }

  await fetch(`https://api.github.com/repos/${params.owner}/${params.repo}/issues/${params.prNumber}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `token ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
}
```

## Allure Report Integration

```typescript
// exporters/allure-exporter.ts
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface AllureResult {
  uuid: string;
  name: string;
  status: 'passed' | 'failed' | 'broken' | 'skipped';
  stage: 'finished';
  start: number;
  stop: number;
  steps: AllureStep[];
  labels: Array<{ name: string; value: string }>;
  statusDetails?: { message: string; trace: string };
}

interface AllureStep {
  name: string;
  status: 'passed' | 'failed';
  start: number;
  stop: number;
}

export class AllureExporter {
  private resultsDir: string;

  constructor(outputDir = 'allure-results') {
    this.resultsDir = outputDir;
    mkdirSync(this.resultsDir, { recursive: true });
  }

  exportTestResult(result: any): void {
    const allureResult: AllureResult = {
      uuid: \`\${Date.now()}-\${Math.random().toString(36).substring(7)}\`,
      name: result.name,
      status: this.mapStatus(result.status),
      stage: 'finished',
      start: new Date(result.timestamp).getTime(),
      stop: new Date(result.timestamp).getTime() + result.duration,
      steps: [],
      labels: [
        { name: 'suite', value: result.suite },
        { name: 'severity', value: result.severity || 'normal' },
        { name: 'feature', value: result.feature || result.suite },
        { name: 'story', value: result.name },
      ],
    };

    if (result.error) {
      allureResult.statusDetails = {
        message: result.error.message,
        trace: result.error.stack || '',
      };
    }

    const filePath = join(this.resultsDir, \`\${allureResult.uuid}-result.json\`);
    writeFileSync(filePath, JSON.stringify(allureResult, null, 2));
  }

  private mapStatus(status: string): AllureResult['status'] {
    switch (status) {
      case 'passed': return 'passed';
      case 'failed': return 'failed';
      case 'skipped': return 'skipped';
      default: return 'broken';
    }
  }
}
```

## HTML Report Generator

```typescript
// exporters/html-exporter.ts
export function generateHtmlReport(summary: {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: string;
  passRate: number;
  failures: Array<{ name: string; error: string }>;
  trends: Array<{ date: string; passRate: number }>;
}): string {
  const passColor = summary.passRate >= 95 ? '#22c55e' : summary.passRate >= 80 ? '#f59e0b' : '#ef4444';

  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Test Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 20px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
    .card { padding: 16px; border-radius: 8px; background: #f9fafb; text-align: center; }
    .card h3 { margin: 0; font-size: 2em; }
    .card p { margin: 4px 0 0; color: #6b7280; }
    .pass-rate { color: \${passColor}; font-size: 3em; font-weight: bold; }
    .failures { margin-top: 20px; }
    .failure { padding: 12px; margin: 8px 0; background: #fef2f2; border-radius: 4px; border-left: 4px solid #ef4444; }
    .failure h4 { margin: 0 0 4px; }
    .failure pre { margin: 0; font-size: 0.85em; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Test Execution Report</h1>
  <div class="pass-rate">\${summary.passRate.toFixed(1)}% Pass Rate</div>
  <div class="summary">
    <div class="card"><h3>\${summary.total}</h3><p>Total Tests</p></div>
    <div class="card"><h3>\${summary.passed}</h3><p>Passed</p></div>
    <div class="card"><h3>\${summary.failed}</h3><p>Failed</p></div>
    <div class="card"><h3>\${summary.duration}</h3><p>Duration</p></div>
  </div>
  \${summary.failures.length > 0 ? \`
  <div class="failures">
    <h2>Failures</h2>
    \${summary.failures.map(f => \`
      <div class="failure">
        <h4>\${f.name}</h4>
        <pre>\${f.error}</pre>
      </div>\`).join('')}
  </div>\` : '<p>All tests passed.</p>'}
</body>
</html>\`;
}
```

## Best Practices

1. **Report pass rate trends, not just current numbers** -- A 95% pass rate is meaningless without context. Was it 98% last week? Show the trend.
2. **Detect and highlight flaky tests automatically** -- Flaky tests erode team confidence. Surface them prominently so they get fixed.
3. **Send failure notifications to relevant channels** -- Route failures to the team responsible for the failing feature, not to a generic channel.
4. **Include failure details in reports** -- A report that says "5 tests failed" without explaining why is not useful. Include error messages and stack traces.
5. **Track execution time trends** -- Slowly growing execution times indicate test suite health issues. Alert when CI test time exceeds thresholds.
6. **Integrate reports into PR reviews** -- Developers are most likely to act on test results during code review. Post reports as PR comments.
7. **Archive historical data** -- Keep at least 90 days of test run data for trend analysis and regression investigation.
8. **Make dashboards accessible to non-technical stakeholders** -- Product managers and executives need quality visibility too. Create summary views alongside detailed technical views.
9. **Use consistent test naming** -- Reports are only useful if test names clearly describe what they test. Enforce naming conventions.
10. **Alert on anomalies, not just thresholds** -- A sudden 10% drop in pass rate is an anomaly worth alerting on, even if the pass rate is still above the threshold.

## Anti-Patterns

1. **Reporting only pass/fail counts** -- Raw counts without context (pass rate, trends, severity) do not enable decision-making.
2. **Generating reports that no one reads** -- If reports are not actionable or accessible, they waste effort. Validate that teams use the reports.
3. **Not tracking flaky tests** -- Ignoring flaky tests leads to team distrust of the test suite and desensitization to failures.
4. **Sending all alerts to everyone** -- Alert fatigue is real. Route alerts to the responsible team and escalate only when appropriate.
5. **Building custom dashboards from scratch** -- Use existing tools (Allure, ReportPortal, Grafana) before building custom solutions.
6. **Not versioning report configurations** -- Dashboard configurations should be in version control so changes are tracked and reviewable.
7. **Reporting coverage as the primary quality metric** -- Coverage indicates what is tested, not how well it is tested. Combine with mutation testing scores.
8. **Ignoring slow tests in reports** -- Tests that take 5 minutes each accumulate to hour-long CI runs. Surface slow tests for optimization.
9. **Not correlating test results with deployments** -- Without deployment context, you cannot tell if a test failure is a regression or a pre-existing issue.
10. **Overloading dashboards with information** -- Dashboards with 50 charts are overwhelming. Prioritize the 5-7 most important metrics per view.
