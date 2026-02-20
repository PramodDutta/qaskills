---
name: Flaky Test Quarantine
description: Detect, quarantine, and systematically fix flaky tests with automated retry analysis, root cause categorization, and CI pipeline integration for test reliability
version: 1.0.0
author: Pramod
license: MIT
tags: [flaky-tests, test-reliability, quarantine, test-retry, ci-stability, test-maintenance, non-deterministic]
testingTypes: [code-quality, e2e]
frameworks: [playwright, jest, vitest]
languages: [typescript, javascript]
domains: [devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Flaky Test Quarantine

Flaky tests are tests that produce different outcomes (pass or fail) when run against the same code under the same conditions. They erode confidence in the test suite, train developers to ignore failures, and slow down CI pipelines with unnecessary retries. A single flaky test in a suite of 500 can cause the entire pipeline to require re-runs, wasting developer time and compute resources. This skill provides a systematic approach to detecting, quarantining, categorizing, and fixing flaky tests while maintaining CI pipeline stability.

## Core Principles

1. **Detection Before Quarantine**: A test must be proven flaky through repeated execution before it is quarantined. A single failure does not make a test flaky; it might indicate a real bug. Multi-run analysis with statistical tracking separates genuine flakiness from legitimate failures.

2. **Quarantine Is Not Deletion**: Quarantined tests must remain in the codebase and continue running in a separate pipeline. Quarantine is a temporary holding pattern that prevents flaky tests from blocking the main pipeline while preserving the test and tracking its behavior.

3. **Root Cause Categorization Drives Fixes**: Different types of flakiness require different fixing strategies. Timing issues need explicit waits, state leakage needs proper cleanup, external dependencies need mocking, and race conditions need synchronization. Categorizing the root cause directs the fix.

4. **Flakiness Is Measurable**: Track the flakiness rate (failures per total runs) for every test over time. This metric determines quarantine decisions, fix prioritization, and verifies that fixes actually resolved the issue.

5. **Zero-Tolerance Pipeline**: The main CI pipeline must be green to merge. Allowing occasional failures or manual re-runs normalizes flakiness and makes it impossible to distinguish real failures from known flaky ones.

6. **Fix the Root Cause, Not the Symptom**: Adding retries or increasing timeouts masks flakiness without fixing it. These approaches hide real issues and increase overall test execution time. Address the underlying non-determinism.

7. **Isolation Verification**: After fixing a flaky test, verify the fix by running the test in isolation and in the full suite multiple times. Some flakiness only manifests under specific ordering or parallel execution conditions.

## Project Structure

```
project-root/
├── tests/
│   ├── e2e/
│   │   ├── checkout.spec.ts
│   │   ├── search.spec.ts
│   │   └── user-profile.spec.ts
│   ├── unit/
│   │   ├── payment.test.ts
│   │   └── cart.test.ts
│   └── quarantine/
│       ├── README.md
│       └── quarantine-registry.json
├── scripts/
│   ├── detect-flaky.ts
│   ├── quarantine-manager.ts
│   ├── flaky-report.ts
│   └── verify-fix.ts
├── .github/
│   └── workflows/
│       ├── main-ci.yml
│       ├── quarantine-ci.yml
│       └── flaky-detection.yml
├── config/
│   ├── playwright.config.ts
│   ├── jest.config.ts
│   └── vitest.config.ts
└── flaky-test.config.ts
```

## Flaky Test Detection

### Multi-Run Detection Script

The most reliable way to detect flaky tests is to run the test suite multiple times and compare results. A test that fails even once across multiple runs of identical code is flaky.

```typescript
// scripts/detect-flaky.ts
import { execSync } from 'child_process';
import * as fs from 'fs';

interface TestResult {
  testName: string;
  file: string;
  runs: number;
  passes: number;
  failures: number;
  flakinessRate: number;
  failureMessages: string[];
}

interface DetectionConfig {
  runs: number;
  testCommand: string;
  resultPattern: string;
  flakinessThreshold: number;
}

const config: DetectionConfig = {
  runs: 10,
  testCommand: 'npx playwright test --reporter=json',
  resultPattern: 'test-results/results.json',
  flakinessThreshold: 0.1, // 10% failure rate = flaky
};

async function detectFlakyTests(): Promise<TestResult[]> {
  const resultsByTest = new Map<string, TestResult>();

  console.log(`Running test suite ${config.runs} times to detect flaky tests...`);

  for (let run = 1; run <= config.runs; run++) {
    console.log(`\n--- Run ${run}/${config.runs} ---`);

    try {
      execSync(config.testCommand, {
        stdio: 'pipe',
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_NAME: `test-results/run-${run}.json`,
        },
      });
    } catch {
      // Test failures are expected; we continue regardless
    }

    const resultsFile = `test-results/run-${run}.json`;
    if (!fs.existsSync(resultsFile)) continue;

    const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));

    for (const suite of results.suites || []) {
      for (const spec of suite.specs || []) {
        const key = `${suite.file}::${spec.title}`;

        if (!resultsByTest.has(key)) {
          resultsByTest.set(key, {
            testName: spec.title,
            file: suite.file,
            runs: 0,
            passes: 0,
            failures: 0,
            flakinessRate: 0,
            failureMessages: [],
          });
        }

        const entry = resultsByTest.get(key)!;
        entry.runs++;

        const passed = spec.tests.every((t: any) => t.status === 'passed');
        if (passed) {
          entry.passes++;
        } else {
          entry.failures++;
          const failMsg = spec.tests
            .filter((t: any) => t.status === 'failed')
            .map((t: any) => t.results?.[0]?.error?.message || 'Unknown error')
            .join('; ');
          entry.failureMessages.push(failMsg);
        }
      }
    }
  }

  // Calculate flakiness rates
  const allResults: TestResult[] = [];
  for (const result of resultsByTest.values()) {
    result.flakinessRate = result.failures / result.runs;
    allResults.push(result);
  }

  // Filter to only flaky tests (failed some but not all runs)
  const flakyTests = allResults.filter(
    (r) => r.flakinessRate > 0 && r.flakinessRate < 1 && r.flakinessRate >= config.flakinessThreshold
  );

  console.log(`\nDetected ${flakyTests.length} flaky tests out of ${allResults.length} total tests`);

  // Write report
  fs.writeFileSync(
    'test-results/flaky-detection-report.json',
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalRuns: config.runs,
        totalTests: allResults.length,
        flakyTests: flakyTests.sort((a, b) => b.flakinessRate - a.flakinessRate),
      },
      null,
      2
    )
  );

  return flakyTests;
}

detectFlakyTests().catch(console.error);
```

### Automated Flaky Detection in CI

```yaml
# .github/workflows/flaky-detection.yml
name: Flaky Test Detection
on:
  schedule:
    - cron: '0 2 * * 0'   # Run weekly at 2 AM Sunday
  workflow_dispatch:        # Manual trigger

jobs:
  detect-flaky:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        run: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run test suite (attempt ${{ matrix.run }})
        run: npx playwright test --reporter=json
        continue-on-error: true
        env:
          PLAYWRIGHT_JSON_OUTPUT_NAME: results-${{ matrix.run }}.json
      - uses: actions/upload-artifact@v4
        with:
          name: results-${{ matrix.run }}
          path: results-${{ matrix.run }}.json

  analyze:
    needs: detect-flaky
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          path: all-results
      - name: Analyze flakiness
        run: npx ts-node scripts/analyze-flaky-results.ts all-results/
      - name: Create issue if flaky tests found
        if: steps.analyze.outputs.flaky_count > 0
        uses: actions/github-script@v7
        with:
          script: |
            const report = require('./flaky-report.json');
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Flaky Tests Detected: ${report.count} tests`,
              body: report.markdown,
              labels: ['flaky-test', 'test-reliability'],
            });
```

## Automatic Quarantine Tagging

### Quarantine Registry

```typescript
// tests/quarantine/quarantine-registry.json
{
  "version": 1,
  "lastUpdated": "2024-06-15T10:00:00.000Z",
  "quarantinedTests": [
    {
      "id": "q-001",
      "testName": "should complete checkout with PayPal",
      "file": "tests/e2e/checkout.spec.ts",
      "quarantinedAt": "2024-06-10T14:30:00.000Z",
      "quarantinedBy": "ci-bot",
      "reason": "Flakiness rate 35% over last 50 runs",
      "rootCause": "timing",
      "rootCauseDetail": "PayPal iframe loads inconsistently, waitForSelector timeout",
      "flakinessRate": 0.35,
      "priority": "high",
      "assignee": "team-payments",
      "jiraTicket": "QA-1234",
      "status": "investigating"
    },
    {
      "id": "q-002",
      "testName": "should display search results with filters",
      "file": "tests/e2e/search.spec.ts",
      "quarantinedAt": "2024-06-12T09:00:00.000Z",
      "quarantinedBy": "developer-jane",
      "reason": "Intermittent failure on CI (passes locally)",
      "rootCause": "state-leakage",
      "rootCauseDetail": "Previous test leaves search index in dirty state",
      "flakinessRate": 0.20,
      "priority": "medium",
      "assignee": "team-search",
      "jiraTicket": "QA-1235",
      "status": "fix-in-progress"
    }
  ]
}
```

### Quarantine Manager

```typescript
// scripts/quarantine-manager.ts
import * as fs from 'fs';
import * as path from 'path';

interface QuarantineEntry {
  id: string;
  testName: string;
  file: string;
  quarantinedAt: string;
  quarantinedBy: string;
  reason: string;
  rootCause: RootCause;
  rootCauseDetail: string;
  flakinessRate: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee: string;
  jiraTicket?: string;
  status: 'new' | 'investigating' | 'fix-in-progress' | 'fix-ready' | 'verified';
}

type RootCause =
  | 'timing'
  | 'state-leakage'
  | 'external-dependency'
  | 'race-condition'
  | 'resource-contention'
  | 'environment-specific'
  | 'test-data'
  | 'unknown';

const REGISTRY_PATH = path.resolve(__dirname, '../tests/quarantine/quarantine-registry.json');

function loadRegistry(): { version: number; quarantinedTests: QuarantineEntry[] } {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return { version: 1, quarantinedTests: [] };
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
}

function saveRegistry(registry: { version: number; quarantinedTests: QuarantineEntry[] }): void {
  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

export function quarantineTest(entry: Omit<QuarantineEntry, 'id' | 'quarantinedAt'>): void {
  const registry = loadRegistry();
  const id = `q-${String(registry.quarantinedTests.length + 1).padStart(3, '0')}`;

  registry.quarantinedTests.push({
    ...entry,
    id,
    quarantinedAt: new Date().toISOString(),
  });

  saveRegistry(registry);
  console.log(`Quarantined test: ${entry.testName} (${id})`);
}

export function unquarantineTest(id: string): void {
  const registry = loadRegistry();
  const index = registry.quarantinedTests.findIndex((t) => t.id === id);

  if (index === -1) {
    console.error(`Test ${id} not found in quarantine`);
    return;
  }

  const removed = registry.quarantinedTests.splice(index, 1)[0];
  saveRegistry(registry);
  console.log(`Unquarantined test: ${removed.testName} (${id})`);
}

export function getQuarantinedTestNames(): Set<string> {
  const registry = loadRegistry();
  return new Set(registry.quarantinedTests.map((t) => t.testName));
}
```

### Playwright Quarantine Integration

```typescript
// config/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';

// Load quarantine registry
const quarantineRegistry = JSON.parse(
  fs.readFileSync('tests/quarantine/quarantine-registry.json', 'utf-8')
);
const quarantinedFiles = new Set(
  quarantineRegistry.quarantinedTests.map((t: any) => t.file)
);

const isQuarantineRun = process.env.QUARANTINE_RUN === 'true';

export default defineConfig({
  testDir: './tests/e2e',

  // In main pipeline: exclude quarantined test files
  // In quarantine pipeline: only run quarantined test files
  testMatch: isQuarantineRun
    ? [...quarantinedFiles].map((f) => f.replace('tests/e2e/', ''))
    : undefined,
  testIgnore: isQuarantineRun
    ? undefined
    : [...quarantinedFiles].map((f) => f.replace('tests/e2e/', '')),

  retries: isQuarantineRun ? 3 : 0,   // Retries only in quarantine pipeline
  timeout: 30000,

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
});
```

### Annotation-Based Quarantine with Custom Fixture

```typescript
// tests/e2e/fixtures/quarantine-fixture.ts
import { test as base } from '@playwright/test';
import * as fs from 'fs';

interface QuarantineInfo {
  isQuarantined: boolean;
  reason?: string;
  jiraTicket?: string;
}

const quarantineRegistry = JSON.parse(
  fs.readFileSync('tests/quarantine/quarantine-registry.json', 'utf-8')
);

const quarantinedMap = new Map(
  quarantineRegistry.quarantinedTests.map((t: any) => [t.testName, t])
);

export const test = base.extend<{ quarantine: QuarantineInfo }>({
  quarantine: async ({}, use, testInfo) => {
    const entry = quarantinedMap.get(testInfo.title);
    const isQuarantineRun = process.env.QUARANTINE_RUN === 'true';

    if (entry && !isQuarantineRun) {
      testInfo.annotations.push({
        type: 'quarantine',
        description: `Quarantined: ${entry.reason} (${entry.jiraTicket || 'no ticket'})`,
      });
      test.skip(true, `Quarantined: ${entry.reason}`);
    }

    await use({
      isQuarantined: !!entry,
      reason: entry?.reason,
      jiraTicket: entry?.jiraTicket,
    });
  },
});

export { expect } from '@playwright/test';
```

### Using the Quarantine Fixture in Tests

```typescript
// tests/e2e/checkout.spec.ts
import { test, expect } from './fixtures/quarantine-fixture';

test.describe('Checkout Flow', () => {
  test('should complete checkout with credit card', async ({ page }) => {
    // This test is stable - runs normally
    await page.goto('/products/1');
    await page.click('[data-testid="add-to-cart"]');
    await page.goto('/checkout');
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.click('[data-testid="place-order"]');
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });

  test('should complete checkout with PayPal', async ({ page, quarantine }) => {
    // This test is in the quarantine registry - will be skipped in main pipeline
    await page.goto('/products/1');
    await page.click('[data-testid="add-to-cart"]');
    await page.goto('/checkout');
    await page.click('[data-testid="pay-with-paypal"]');
    // PayPal iframe interaction...
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
  });
});
```

## Root Cause Categories and Fixing Strategies

### Timing Issues

Timing flakiness occurs when tests assume operations complete within a fixed time. The fix is to replace arbitrary timeouts with explicit condition waits.

```typescript
// FLAKY: Uses fixed timeout
test('should show notification after save', async ({ page }) => {
  await page.click('[data-testid="save-button"]');
  await page.waitForTimeout(2000); // Arbitrary wait - FLAKY
  const notification = page.locator('[data-testid="notification"]');
  await expect(notification).toBeVisible();
});

// FIXED: Waits for specific condition
test('should show notification after save', async ({ page }) => {
  await page.click('[data-testid="save-button"]');
  const notification = page.locator('[data-testid="notification"]');
  await expect(notification).toBeVisible({ timeout: 10000 }); // Explicit condition wait
});
```

### State Leakage Between Tests

State leakage happens when one test modifies shared state (database, browser storage, global variables) that another test depends on.

```typescript
// FLAKY: Tests share state
test.describe('User Settings', () => {
  test('should enable dark mode', async ({ page }) => {
    await page.goto('/settings');
    await page.click('[data-testid="dark-mode-toggle"]');
    // Leaves dark mode enabled for next test
  });

  test('should show default light theme', async ({ page }) => {
    await page.goto('/settings');
    // FAILS if previous test ran first and enabled dark mode
    await expect(page.locator('body')).toHaveClass(/light-theme/);
  });
});

// FIXED: Each test manages its own state
test.describe('User Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Reset user preferences before each test
    await page.evaluate(() => localStorage.clear());
    await page.request.post('/api/test/reset-user-preferences');
  });

  test('should enable dark mode', async ({ page }) => {
    await page.goto('/settings');
    await page.click('[data-testid="dark-mode-toggle"]');
    await expect(page.locator('body')).toHaveClass(/dark-theme/);
  });

  test('should show default light theme', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('body')).toHaveClass(/light-theme/);
  });
});
```

### External Dependency Flakiness

```typescript
// FLAKY: Depends on external payment API availability
test('should process payment', async ({ page }) => {
  await page.goto('/checkout');
  await page.fill('[data-testid="card"]', '4242424242424242');
  await page.click('[data-testid="pay"]');
  // External payment gateway may be slow or down
  await expect(page.locator('[data-testid="success"]')).toBeVisible();
});

// FIXED: Mock external dependency
test('should process payment', async ({ page }) => {
  // Intercept external API calls
  await page.route('**/api.stripe.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'pi_mock_123',
        status: 'succeeded',
        amount: 2999,
      }),
    });
  });

  await page.goto('/checkout');
  await page.fill('[data-testid="card"]', '4242424242424242');
  await page.click('[data-testid="pay"]');
  await expect(page.locator('[data-testid="success"]')).toBeVisible();
});
```

### Race Conditions

```typescript
// FLAKY: Race condition between navigation and assertion
test('should load dashboard data', async ({ page }) => {
  await page.goto('/dashboard');
  // Data might not have loaded yet
  const count = await page.locator('[data-testid="item-count"]').textContent();
  expect(parseInt(count!)).toBeGreaterThan(0);
});

// FIXED: Wait for the data to be in the expected state
test('should load dashboard data', async ({ page }) => {
  await page.goto('/dashboard');

  // Wait for the loading state to complete
  await page.waitForResponse((response) =>
    response.url().includes('/api/dashboard') && response.status() === 200
  );

  // Now assert on the data
  const countLocator = page.locator('[data-testid="item-count"]');
  await expect(countLocator).not.toHaveText('0');
  const count = await countLocator.textContent();
  expect(parseInt(count!)).toBeGreaterThan(0);
});
```

## Retry with Exponential Backoff

```typescript
// scripts/retry-runner.ts
import { execSync } from 'child_process';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;      // milliseconds
  maxDelay: number;       // milliseconds
  backoffMultiplier: number;
}

const defaultConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

export async function runWithRetry(
  command: string,
  config: RetryConfig = defaultConfig
): Promise<{ success: boolean; attempts: number; lastError?: string }> {
  let lastError = '';

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${config.maxRetries + 1}: ${command}`);
      execSync(command, { stdio: 'inherit' });
      return { success: true, attempts: attempt };
    } catch (error: any) {
      lastError = error.message;
      console.log(`Attempt ${attempt} failed: ${lastError}`);

      if (attempt <= config.maxRetries) {
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        const jitter = delay * (0.5 + Math.random() * 0.5); // Add jitter
        console.log(`Retrying in ${Math.round(jitter)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, jitter));
      }
    }
  }

  return { success: false, attempts: config.maxRetries + 1, lastError };
}
```

## Flakiness Rate Tracking

```typescript
// scripts/flaky-report.ts
import * as fs from 'fs';

interface TestHistory {
  testName: string;
  file: string;
  recentRuns: Array<{
    date: string;
    passed: boolean;
    duration: number;
    ciRunId: string;
  }>;
  totalRuns: number;
  totalFailures: number;
  flakinessRate: number;
  trend: 'improving' | 'stable' | 'degrading';
  lastFailure: string | null;
  averageDuration: number;
}

const HISTORY_PATH = 'test-results/flakiness-history.json';

export function updateHistory(runResults: any[], ciRunId: string): void {
  const history: Map<string, TestHistory> = loadHistory();

  for (const result of runResults) {
    const key = `${result.file}::${result.testName}`;

    if (!history.has(key)) {
      history.set(key, {
        testName: result.testName,
        file: result.file,
        recentRuns: [],
        totalRuns: 0,
        totalFailures: 0,
        flakinessRate: 0,
        trend: 'stable',
        lastFailure: null,
        averageDuration: 0,
      });
    }

    const entry = history.get(key)!;
    entry.recentRuns.push({
      date: new Date().toISOString(),
      passed: result.passed,
      duration: result.duration,
      ciRunId,
    });

    // Keep last 100 runs
    if (entry.recentRuns.length > 100) {
      entry.recentRuns = entry.recentRuns.slice(-100);
    }

    entry.totalRuns++;
    if (!result.passed) {
      entry.totalFailures++;
      entry.lastFailure = new Date().toISOString();
    }

    // Calculate flakiness rate over recent runs
    const recentFailures = entry.recentRuns.filter((r) => !r.passed).length;
    entry.flakinessRate = recentFailures / entry.recentRuns.length;

    // Calculate trend (compare last 25 runs with previous 25)
    if (entry.recentRuns.length >= 50) {
      const recent25 = entry.recentRuns.slice(-25);
      const previous25 = entry.recentRuns.slice(-50, -25);
      const recentRate = recent25.filter((r) => !r.passed).length / 25;
      const previousRate = previous25.filter((r) => !r.passed).length / 25;

      if (recentRate < previousRate - 0.05) entry.trend = 'improving';
      else if (recentRate > previousRate + 0.05) entry.trend = 'degrading';
      else entry.trend = 'stable';
    }

    entry.averageDuration =
      entry.recentRuns.reduce((sum, r) => sum + r.duration, 0) / entry.recentRuns.length;
  }

  saveHistory(history);
  generateReport(history);
}

function generateReport(history: Map<string, TestHistory>): void {
  const flakyTests = [...history.values()]
    .filter((t) => t.flakinessRate > 0 && t.flakinessRate < 1)
    .sort((a, b) => b.flakinessRate - a.flakinessRate);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalTests: history.size,
      flakyTests: flakyTests.length,
      flakinessPercentage: ((flakyTests.length / history.size) * 100).toFixed(1),
      criticalFlaky: flakyTests.filter((t) => t.flakinessRate > 0.3).length,
      degradingTests: flakyTests.filter((t) => t.trend === 'degrading').length,
    },
    tests: flakyTests.map((t) => ({
      testName: t.testName,
      file: t.file,
      flakinessRate: `${(t.flakinessRate * 100).toFixed(1)}%`,
      trend: t.trend,
      totalRuns: t.totalRuns,
      lastFailure: t.lastFailure,
      averageDuration: `${Math.round(t.averageDuration)}ms`,
    })),
  };

  fs.writeFileSync('test-results/flakiness-report.json', JSON.stringify(report, null, 2));
  console.log(`Flakiness report: ${flakyTests.length} flaky tests detected`);
}

function loadHistory(): Map<string, TestHistory> {
  if (!fs.existsSync(HISTORY_PATH)) return new Map();
  const data = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'));
  return new Map(Object.entries(data));
}

function saveHistory(history: Map<string, TestHistory>): void {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(Object.fromEntries(history), null, 2));
}
```

## CI Integration

### Main Pipeline (Excludes Quarantined Tests)

```yaml
# .github/workflows/main-ci.yml
name: Main CI Pipeline
on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      # Run tests excluding quarantined tests (zero retries)
      - name: Run stable tests
        run: npx playwright test --retries=0
        env:
          QUARANTINE_RUN: 'false'

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results/
```

### Quarantine Pipeline (Runs Only Quarantined Tests)

```yaml
# .github/workflows/quarantine-ci.yml
name: Quarantine Pipeline
on:
  push:
    branches: [main]
  schedule:
    - cron: '0 */4 * * *'   # Every 4 hours

jobs:
  quarantine-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      # Run only quarantined tests with retries
      - name: Run quarantined tests
        run: npx playwright test --retries=3
        continue-on-error: true  # Don't fail the pipeline
        env:
          QUARANTINE_RUN: 'true'

      - name: Update flakiness tracking
        run: npx ts-node scripts/flaky-report.ts
        env:
          CI_RUN_ID: ${{ github.run_id }}

      - name: Check for recovered tests
        run: |
          npx ts-node scripts/check-recovered.ts
        # Outputs tests that passed all retries, candidates for unquarantine
```

## Test Isolation Verification

```typescript
// scripts/verify-fix.ts
import { execSync } from 'child_process';

interface VerificationResult {
  testName: string;
  isolatedRuns: { passed: number; failed: number };
  suiteRuns: { passed: number; failed: number };
  verdict: 'fixed' | 'still-flaky' | 'order-dependent';
}

async function verifyFix(testFile: string, testName: string): Promise<VerificationResult> {
  const RUNS = 20;
  const result: VerificationResult = {
    testName,
    isolatedRuns: { passed: 0, failed: 0 },
    suiteRuns: { passed: 0, failed: 0 },
    verdict: 'still-flaky',
  };

  console.log(`Verifying fix for "${testName}" with ${RUNS} runs...`);

  // Phase 1: Run the test in isolation
  console.log('\nPhase 1: Isolated runs');
  for (let i = 0; i < RUNS; i++) {
    try {
      execSync(
        `npx playwright test "${testFile}" --grep "${testName}" --retries=0`,
        { stdio: 'pipe' }
      );
      result.isolatedRuns.passed++;
    } catch {
      result.isolatedRuns.failed++;
    }
  }
  console.log(`  Isolated: ${result.isolatedRuns.passed}/${RUNS} passed`);

  // Phase 2: Run the test within the full suite
  console.log('\nPhase 2: Full suite runs');
  for (let i = 0; i < RUNS; i++) {
    try {
      execSync(`npx playwright test --retries=0`, { stdio: 'pipe' });
      result.suiteRuns.passed++;
    } catch {
      result.suiteRuns.failed++;
    }
  }
  console.log(`  Suite: ${result.suiteRuns.passed}/${RUNS} passed`);

  // Determine verdict
  if (result.isolatedRuns.failed === 0 && result.suiteRuns.failed === 0) {
    result.verdict = 'fixed';
  } else if (result.isolatedRuns.failed === 0 && result.suiteRuns.failed > 0) {
    result.verdict = 'order-dependent';
  } else {
    result.verdict = 'still-flaky';
  }

  console.log(`\nVerdict: ${result.verdict}`);
  return result;
}
```

## Configuration

### Jest Quarantine Configuration

```typescript
// config/jest.config.ts
import type { Config } from 'jest';
import * as fs from 'fs';

const quarantineRegistry = JSON.parse(
  fs.readFileSync('tests/quarantine/quarantine-registry.json', 'utf-8')
);
const quarantinedPatterns = quarantineRegistry.quarantinedTests.map(
  (t: any) => t.file
);

const isQuarantineRun = process.env.QUARANTINE_RUN === 'true';

const config: Config = {
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: isQuarantineRun ? [] : quarantinedPatterns,
  testPathPattern: isQuarantineRun ? quarantinedPatterns.join('|') : undefined,

  // No retries in main pipeline
  ...(isQuarantineRun ? {} : { bail: 1 }),

  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'test-results', outputName: 'junit.xml' }],
  ],
};

export default config;
```

### Vitest Quarantine Configuration

```typescript
// config/vitest.config.ts
import { defineConfig } from 'vitest/config';
import * as fs from 'fs';

const quarantineRegistry = JSON.parse(
  fs.readFileSync('tests/quarantine/quarantine-registry.json', 'utf-8')
);
const quarantinedFiles = quarantineRegistry.quarantinedTests.map((t: any) => t.file);

const isQuarantineRun = process.env.QUARANTINE_RUN === 'true';

export default defineConfig({
  test: {
    include: isQuarantineRun ? quarantinedFiles : ['tests/**/*.test.ts'],
    exclude: isQuarantineRun ? [] : quarantinedFiles,
    retry: isQuarantineRun ? 3 : 0,
    reporters: ['verbose', 'json'],
    outputFile: 'test-results/results.json',
  },
});
```

## Best Practices

1. **Establish a flakiness budget.** Set a target for overall suite flakiness (e.g., less than 2% of tests are flaky at any time). Track this metric and treat exceeding the budget as a team priority.

2. **Automate quarantine decisions.** When a test exceeds a configurable flakiness threshold (e.g., 15% failure rate over 50 runs), automatically quarantine it and create a tracking ticket.

3. **Run quarantined tests in a separate CI job.** This keeps the main pipeline reliable while still executing quarantined tests to track their behavior and detect if a code change inadvertently fixes them.

4. **Assign ownership for quarantined tests.** Every quarantined test should have an assignee and a tracking ticket. Unowned quarantined tests accumulate indefinitely.

5. **Set time limits on quarantine.** A test quarantined for more than 30 days without progress should be escalated. Indefinite quarantine is equivalent to deletion.

6. **Fix by root cause category.** Maintain a playbook for each root cause type. Timing issues require wait-for-condition patterns, state leakage requires setup/teardown improvements, and external dependencies require mocking.

7. **Verify fixes with multi-run confirmation.** A fix is not verified by a single passing run. Run the previously flaky test at least 20 times in both isolated and full-suite modes to confirm stability.

8. **Use test annotations to communicate quarantine status.** Annotate quarantined tests in the code so developers reviewing test files understand which tests are quarantined and why.

9. **Track flakiness trends over time.** Monitor whether the overall flakiness rate is improving or degrading. This reveals systemic issues and measures the effectiveness of reliability efforts.

10. **Review test infrastructure alongside test code.** Flakiness often originates from CI runner resource constraints, Docker networking issues, or shared test databases. Investigate infrastructure when flakiness patterns span unrelated tests.

## Anti-Patterns to Avoid

1. **Adding retries to the main pipeline as a permanent solution.** Retries mask flakiness and increase pipeline duration. They should only be used temporarily in quarantine pipelines while fixes are in progress.

2. **Deleting flaky tests instead of fixing them.** Flaky tests often cover real functionality. Deleting them trades test reliability for reduced test coverage. Always fix first; only delete if the test provides no value.

3. **Increasing timeouts globally to address timing flakiness.** Raising the global timeout from 30 seconds to 60 seconds slows down the entire suite and does not fix the underlying issue. Use targeted explicit waits.

4. **Blaming the test framework for flakiness.** While framework bugs exist, the vast majority of flakiness is caused by test design issues. Investigate test code before concluding the framework is at fault.

5. **Quarantining tests without creating tracking tickets.** Quarantine without accountability leads to a growing graveyard of disabled tests. Every quarantine action must create a tracked work item.

6. **Running flaky detection only once.** Flakiness evolves as the codebase changes. Schedule weekly flaky detection runs to catch newly flaky tests before they accumulate.

7. **Fixing flakiness by adding sleep statements.** Fixed sleeps are inherently unreliable because system performance varies. Replace sleeps with condition-based waits that react to actual state changes.

## Debugging Tips

1. **Enable trace recording on retry.** Configure Playwright to capture traces on first retry (`trace: 'on-first-retry'`). Traces provide a complete timeline of actions, network requests, and DOM snapshots for diagnosing intermittent failures.

2. **Compare passing and failing run logs side by side.** The difference between a passing and failing run often reveals the root cause: a missing API response, a slower DOM update, or a different data state.

3. **Check test execution order.** Run the failing test after specific other tests to identify order-dependent flakiness. Use `--shard` or randomized ordering to expose hidden dependencies.

4. **Examine CI runner resource utilization.** High CPU or memory usage on CI runners causes timing-related flakiness. Check runner metrics during test execution to identify resource contention.

5. **Look for time-zone and locale sensitivity.** Tests that pass in one time zone but fail in another often involve date formatting or comparison. CI runners may use different locales than development machines.

6. **Inspect network timing in traces.** Network-related flakiness shows up as variable response times or timeout errors in traces. Consider mocking slow or unreliable external services.

7. **Run the test in a loop locally.** Use `for i in $(seq 1 50); do npx playwright test "test-name" || echo "FAILED on run $i"; done` to reproduce flakiness locally before attempting a fix.

8. **Check for shared mutable state.** Global variables, module-level caches, and singleton patterns can leak state between tests when running in parallel. Review test setup and teardown for completeness.

9. **Verify database cleanup completeness.** If tests share a database, ensure that beforeEach/afterEach hooks clean up all relevant tables. Missing cleanup of junction tables or audit logs is a common cause of state leakage.

10. **Use deterministic test data.** Random data generation without fixed seeds can cause tests to pass or fail depending on the generated values. Use seeded random generators or fixed test data when determinism matters.
