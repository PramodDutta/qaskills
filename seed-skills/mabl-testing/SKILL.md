---
name: Mabl AI Testing
description: AI-powered testing patterns with Mabl including auto-healing tests, visual regression, API testing, performance monitoring, CI/CD integration, and intelligent test maintenance using Mabl's machine learning capabilities.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [mabl, ai-testing, auto-healing, visual-regression, low-code, performance-monitoring, cicd-integration, intelligent-testing, cloud-testing]
testingTypes: [e2e, visual, api, performance, accessibility]
frameworks: [mabl]
languages: [javascript, typescript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Mabl AI Testing Skill

You are an expert in Mabl AI-powered testing platform. When the user asks you to create tests with Mabl, configure auto-healing test strategies, set up visual regression testing, integrate Mabl with CI/CD pipelines, or optimize test maintenance using Mabl's AI capabilities, follow these detailed instructions.

## Core Principles

1. **AI-first test maintenance** -- Leverage Mabl's machine learning to automatically detect and adapt to UI changes. Configure auto-healing thresholds rather than manually updating selectors.
2. **Visual change intelligence** -- Use Mabl's visual regression to detect unintended UI changes while training the model to ignore expected dynamic content areas.
3. **Environment-aware testing** -- Configure separate environments (staging, production) with appropriate credentials and feature flags. Never run destructive tests against production.
4. **API and UI test correlation** -- Combine API tests with UI tests to validate end-to-end flows. Use API calls for test data setup and UI interactions for user journey validation.
5. **Continuous testing in CI/CD** -- Integrate Mabl deployments events with your CI/CD pipeline so tests run automatically on every deployment.
6. **Performance baseline tracking** -- Use Mabl's performance monitoring to establish baselines and detect regressions in page load times and API response times.
7. **Collaborative test design** -- Structure tests so both technical and non-technical team members can create, review, and maintain tests using Mabl's low-code interface.

## Project Structure

```
mabl-tests/
  plans/
    smoke/
      login-smoke-plan.json
      checkout-smoke-plan.json
    regression/
      auth-regression-plan.json
      catalog-regression-plan.json
      checkout-regression-plan.json
    api/
      user-api-plan.json
      product-api-plan.json
  journeys/
    auth/
      login-valid-credentials.json
      login-invalid-credentials.json
      registration-flow.json
      password-reset.json
    checkout/
      add-to-cart.json
      guest-checkout.json
      registered-checkout.json
      payment-methods.json
    navigation/
      homepage-navigation.json
      search-and-filter.json
      breadcrumb-navigation.json
  snippets/
    login-reusable.json
    logout-reusable.json
    add-product-to-cart.json
    navigate-to-category.json
  data/
    test-users.csv
    product-data.csv
    payment-methods.csv
  config/
    environments.json
    labels.json
    notifications.json
  scripts/
    mabl-cli-deploy.sh
    mabl-api-trigger.ts
    result-parser.ts
  monitoring/
    performance-baselines.json
    alert-config.json
```

## Mabl CLI Integration

```typescript
// scripts/mabl-api-trigger.ts
interface MablDeploymentEvent {
  environment_id: string;
  application_id: string;
  plan_labels?: string[];
  revision?: string;
  properties?: Record<string, string>;
}

interface MablExecutionResult {
  event_id: string;
  status: 'succeeded' | 'failed' | 'running' | 'queued';
  plan_execution_summaries: PlanExecutionSummary[];
}

interface PlanExecutionSummary {
  plan_id: string;
  plan_name: string;
  status: string;
  journey_executions: JourneyExecution[];
}

interface JourneyExecution {
  journey_id: string;
  journey_name: string;
  status: string;
  duration_ms: number;
  start_time: string;
  end_time: string;
  browser: string;
  steps_passed: number;
  steps_failed: number;
  app_href?: string;
}

export class MablApiClient {
  private baseUrl = 'https://api.mabl.com';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async triggerDeploymentEvent(event: MablDeploymentEvent): Promise<string> {
    const response = await fetch(`${this.baseUrl}/events/deployment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`key:${this.apiKey}`).toString('base64')}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`Mabl API error: ${response.status} ${await response.text()}`);
    }

    const result = await response.json();
    return result.id;
  }

  async getExecutionResult(eventId: string): Promise<MablExecutionResult> {
    const response = await fetch(
      `${this.baseUrl}/execution/result/event/${eventId}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`key:${this.apiKey}`).toString('base64')}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Mabl API error: ${response.status}`);
    }

    return response.json();
  }

  async waitForCompletion(
    eventId: string,
    timeoutMs = 1800000,
    pollIntervalMs = 30000
  ): Promise<MablExecutionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.getExecutionResult(eventId);

      if (result.status === 'succeeded' || result.status === 'failed') {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Mabl execution timed out after ${timeoutMs}ms`);
  }

  async getApplications(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/applications`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`key:${this.apiKey}`).toString('base64')}`,
      },
    });
    const data = await response.json();
    return data.applications || [];
  }

  async getEnvironments(applicationId: string): Promise<any[]> {
    const response = await fetch(
      `${this.baseUrl}/applications/${applicationId}/environments`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`key:${this.apiKey}`).toString('base64')}`,
        },
      }
    );
    const data = await response.json();
    return data.environments || [];
  }
}
```

## CI/CD Integration

```typescript
// scripts/mabl-ci-integration.ts
import { MablApiClient, MablExecutionResult } from './mabl-api-trigger';

interface CIConfig {
  apiKey: string;
  applicationId: string;
  environmentId: string;
  planLabels: string[];
  revision: string;
  failOnTestFailure: boolean;
  timeoutMinutes: number;
}

export async function runMablInCI(config: CIConfig): Promise<{
  success: boolean;
  summary: string;
  results: MablExecutionResult;
}> {
  const client = new MablApiClient(config.apiKey);

  console.log('Triggering Mabl deployment event...');
  const eventId = await client.triggerDeploymentEvent({
    environment_id: config.environmentId,
    application_id: config.applicationId,
    plan_labels: config.planLabels,
    revision: config.revision,
    properties: {
      ci_build: process.env.BUILD_NUMBER || 'local',
      branch: process.env.BRANCH_NAME || 'unknown',
    },
  });

  console.log(`Deployment event created: ${eventId}`);
  console.log('Waiting for test execution...');

  const results = await client.waitForCompletion(
    eventId,
    config.timeoutMinutes * 60 * 1000
  );

  const summary = buildSummary(results);
  console.log(summary);

  const success = results.status === 'succeeded';

  if (!success && config.failOnTestFailure) {
    process.exitCode = 1;
  }

  return { success, summary, results };
}

function buildSummary(results: MablExecutionResult): string {
  const lines: string[] = ['=== Mabl Test Results ==='];
  lines.push(`Overall status: ${results.status.toUpperCase()}`);

  for (const plan of results.plan_execution_summaries) {
    lines.push(`\nPlan: ${plan.plan_name} (${plan.status})`);

    for (const journey of plan.journey_executions) {
      const icon = journey.status === 'succeeded' ? 'PASS' : 'FAIL';
      const duration = (journey.duration_ms / 1000).toFixed(1);
      lines.push(`  [${icon}] ${journey.journey_name} (${duration}s, ${journey.browser})`);
      lines.push(`    Steps: ${journey.steps_passed} passed, ${journey.steps_failed} failed`);

      if (journey.app_href) {
        lines.push(`    Details: ${journey.app_href}`);
      }
    }
  }

  return lines.join('\n');
}
```

## GitHub Actions Integration

```yaml
# .github/workflows/mabl-tests.yml
name: Mabl Test Suite
on:
  deployment_status:
  push:
    branches: [main, staging]

jobs:
  mabl-tests:
    if: github.event_name == 'push' || github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Mabl CLI
        run: npm install -g @mablhq/mabl-cli

      - name: Run Mabl Tests
        env:
          MABL_API_KEY: ${{ secrets.MABL_API_KEY }}
        run: |
          mabl deployments create \
            --application-id ${{ vars.MABL_APP_ID }} \
            --environment-id ${{ vars.MABL_ENV_ID }} \
            --labels smoke,regression \
            --revision ${{ github.sha }} \
            --await-completion

      - name: Parse Results
        if: always()
        run: npx tsx scripts/result-parser.ts
```

## Result Parser

```typescript
// scripts/result-parser.ts
interface MablTestOutput {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  failures: Array<{
    journeyName: string;
    failureReason: string;
    stepNumber: number;
    screenshot?: string;
  }>;
}

export function parseMablOutput(rawOutput: string): MablTestOutput {
  const lines = rawOutput.split('\n');
  const output: MablTestOutput = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    failures: [],
  };

  for (const line of lines) {
    if (line.includes('[PASS]')) output.passed++;
    if (line.includes('[FAIL]')) {
      output.failed++;
      output.failures.push({
        journeyName: line.match(/\] (.+?) \(/)?.[1] || 'Unknown',
        failureReason: 'See Mabl dashboard for details',
        stepNumber: 0,
      });
    }
    if (line.includes('[SKIP]')) output.skipped++;
  }

  output.totalTests = output.passed + output.failed + output.skipped;
  return output;
}

export function generateJUnitXml(output: MablTestOutput): string {
  const testcases = [];

  for (let i = 0; i < output.passed; i++) {
    testcases.push(`    <testcase name="test_${i + 1}" classname="mabl.smoke" time="0"/>`);
  }

  for (const failure of output.failures) {
    testcases.push(`    <testcase name="${failure.journeyName}" classname="mabl.regression">
      <failure message="${failure.failureReason}"/>
    </testcase>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="Mabl Tests" tests="${output.totalTests}" failures="${output.failed}" skipped="${output.skipped}">
${testcases.join('\n')}
  </testsuite>
</testsuites>`;
}
```

## Performance Monitoring Configuration

```typescript
// monitoring/performance-config.ts
export interface PerformanceThreshold {
  metric: string;
  warningMs: number;
  criticalMs: number;
  percentile: number;
}

export const defaultThresholds: PerformanceThreshold[] = [
  { metric: 'first_contentful_paint', warningMs: 1500, criticalMs: 3000, percentile: 95 },
  { metric: 'largest_contentful_paint', warningMs: 2500, criticalMs: 4000, percentile: 95 },
  { metric: 'cumulative_layout_shift', warningMs: 100, criticalMs: 250, percentile: 95 },
  { metric: 'total_blocking_time', warningMs: 200, criticalMs: 600, percentile: 95 },
  { metric: 'time_to_interactive', warningMs: 3000, criticalMs: 5000, percentile: 95 },
  { metric: 'dom_content_loaded', warningMs: 1500, criticalMs: 3000, percentile: 95 },
];

export function evaluatePerformance(
  metrics: Record<string, number>,
  thresholds = defaultThresholds
): { status: 'pass' | 'warning' | 'critical'; details: string[] } {
  const details: string[] = [];
  let worstStatus: 'pass' | 'warning' | 'critical' = 'pass';

  for (const threshold of thresholds) {
    const value = metrics[threshold.metric];
    if (value === undefined) continue;

    if (value > threshold.criticalMs) {
      worstStatus = 'critical';
      details.push(`CRITICAL: ${threshold.metric} = ${value}ms (threshold: ${threshold.criticalMs}ms)`);
    } else if (value > threshold.warningMs) {
      if (worstStatus !== 'critical') worstStatus = 'warning';
      details.push(`WARNING: ${threshold.metric} = ${value}ms (threshold: ${threshold.warningMs}ms)`);
    } else {
      details.push(`PASS: ${threshold.metric} = ${value}ms`);
    }
  }

  return { status: worstStatus, details };
}
```

## Visual Regression Configuration

Mabl's visual regression testing uses machine learning to detect unintended visual changes while ignoring expected dynamic content. Configure visual testing effectively by following these patterns.

For dynamic content areas like timestamps, user-generated content, and advertisements, create visual ignore regions that tell Mabl to skip those areas during comparison. This prevents false positives from content that changes between test runs.

For critical pages like login, checkout, and pricing, enable strict visual comparison with a low sensitivity threshold. Even minor visual changes on these pages can impact conversion rates and should be reviewed.

For content-heavy pages like blogs and documentation, use a higher sensitivity threshold to allow for minor text reflow and content updates while still catching major layout breaks.

Review visual changes weekly using Mabl's visual change dashboard. Approve expected changes to update baselines and investigate unexpected changes to determine if they are bugs or intentional modifications.

## Reusable Flow (Snippet) Patterns

Mabl snippets are reusable test flows that can be embedded in multiple journeys. Design snippets for common operations that appear across multiple test scenarios.

Authentication snippets handle the login flow for different user roles. Create separate snippets for admin login, standard user login, and guest access. Each snippet should navigate to the login page, enter credentials, submit the form, and verify the expected landing page.

Navigation snippets handle moving between sections of the application. Create snippets for navigating to specific product categories, opening user settings, or accessing the admin panel.

Data setup snippets handle creating test data through API calls within the journey. Instead of navigating through the UI to create a test product or user, use Mabl's API step to call your application's API directly. This is faster and more reliable than UI-based data creation.

Cleanup snippets handle removing test data after the journey completes. Add cleanup snippets at the end of journeys that create persistent data to prevent test data accumulation.

## Monitoring and Alerting Configuration

Configure Mabl alerts to notify the right people at the right time. Set up Slack integration for real-time failure notifications to the QA channel. Configure email alerts for daily summary reports sent to engineering managers. Use PagerDuty or Opsgenie integration for critical test failures that need immediate attention.

Create alert rules based on test labels. Critical smoke test failures should trigger immediate alerts. Regression test failures can be batched into daily summaries. Performance threshold breaches should be sent to the performance engineering team.

Monitor test execution trends in the Mabl dashboard. Track the number of tests run per day, the pass rate over time, the average execution duration, and the number of auto-healed steps. These metrics indicate the health of your test suite and the effectiveness of Mabl's AI capabilities.

## Best Practices

1. **Use reusable flows (snippets) for common actions** -- Login, logout, navigation to specific pages, and data setup should be reusable snippets shared across journeys.
2. **Configure auto-healing thresholds carefully** -- Start with Mabl's default auto-healing and adjust based on your application's change frequency. Over-aggressive healing hides real bugs.
3. **Set up visual baselines before enabling regression** -- Run journeys multiple times to establish stable visual baselines before enabling regression detection.
4. **Label plans by test type and priority** -- Use labels like "smoke", "regression", "critical" to trigger appropriate subsets in different CI stages.
5. **Configure environment-specific credentials** -- Use Mabl's credential management for each environment rather than hardcoding values in journeys.
6. **Enable performance monitoring on critical journeys** -- Not every journey needs performance tracking. Focus on user-facing critical paths.
7. **Review auto-healing weekly** -- Check Mabl's auto-healing log to verify that healed steps are correct and the underlying issues are addressed.
8. **Use API steps for test data setup** -- Instead of navigating the UI to create test data, use API steps within journeys for faster, more reliable data setup.
9. **Set up notification channels** -- Configure Slack, email, or PagerDuty notifications for failed critical test plans.
10. **Maintain a clean journey library** -- Archive unused journeys, remove stale plans, and keep the active test suite focused and fast.

## Anti-Patterns

1. **Creating one massive journey for everything** -- Long journeys are slow, hard to debug, and prone to flaky failures. Break complex flows into focused journeys.
2. **Ignoring Mabl's auto-healing results** -- Auto-healing is not a substitute for fixing the root cause. Review healed steps and update the application or tests accordingly.
3. **Testing against production with write operations** -- Write operations (create user, place order) against production pollute real data. Use staging or read-only production tests.
4. **Not using variables for dynamic data** -- Hardcoded usernames, dates, and IDs make tests brittle. Use Mabl variables and data tables for dynamic values.
5. **Skipping visual regression on critical pages** -- Visual changes on login, checkout, and pricing pages can impact revenue. Always enable visual regression for these.
6. **Running full regression on every commit** -- Full regression suites take time. Run smoke tests on every commit and full regression nightly or on release branches.
7. **Not configuring retry for flaky journeys** -- Some journeys fail due to network timing. Configure 1 retry to reduce false failures in CI.
8. **Ignoring performance degradation trends** -- A gradual increase in page load time is easy to miss without monitoring. Set up performance alerts for trending metrics.
9. **Creating journeys without assertions** -- A journey that navigates without asserting outcomes provides no value. Always include verification steps.
10. **Not sharing snippets across teams** -- Duplicate login and navigation flows across teams waste time and create inconsistencies. Use shared snippet libraries.

## Mabl API Testing Patterns

Mabl supports API testing within journeys and as standalone API plans. Use API steps for test data setup, backend validation, and service health checks.

### Inline API Steps

Within a UI journey, add API steps to create test data before interacting with the UI. For example, before testing a product detail page, call the API to create a product with known attributes. This is faster and more reliable than navigating through admin UI to create test data.

### Response Validation

Mabl API steps support response validation including status code assertion, JSON body field validation, response time assertion, header verification, and JSON schema validation. Use these validations to ensure your APIs return correct data alongside your UI tests.

### Chaining API Calls

Mabl supports extracting values from one API response and using them in subsequent calls. This enables testing multi-step API workflows like creating a user, using the returned user ID to create an order, and then verifying the order appears in the user's order list.

### API Monitoring

Set up dedicated API plans that run on a schedule (every 5 minutes) to monitor critical API endpoints. These plans act as synthetic monitoring, alerting you to API issues before users report them. Configure separate alert channels for API monitoring versus functional test failures.
