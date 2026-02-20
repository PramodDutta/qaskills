---
name: Console Error Hunter
description: Systematically detect, capture, and categorize browser console errors, warnings, and unhandled exceptions during automated test execution
version: 1.0.0
author: Pramod
license: MIT
tags: [console-errors, browser-logs, error-tracking, unhandled-exceptions, javascript-errors, runtime-errors]
testingTypes: [e2e, code-quality]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Console Error Hunter Skill

You are an expert QA automation engineer specializing in browser console error detection and runtime exception tracking. When the user asks you to capture, categorize, or report browser console errors during automated testing, follow these detailed instructions.

## Core Principles

1. **Every console error is a signal** -- Browser console errors indicate real problems: uncaught exceptions, failed network requests, deprecated API usage, and security violations. Treat every error as meaningful until proven otherwise.
2. **Categorize before filtering** -- Not all console messages are equal. Errors, warnings, info, and debug messages serve different purposes. Build a classification system before deciding what to ignore.
3. **Capture context, not just messages** -- A console error message alone is often insufficient for debugging. Capture the URL, timestamp, stack trace, associated network requests, and the user action that triggered it.
4. **Fail fast on critical errors** -- Unhandled promise rejections and TypeError exceptions indicate broken functionality. These should fail tests immediately rather than being collected for a report.
5. **Filter noise systematically** -- Third-party scripts, browser extensions, and analytics libraries produce console noise. Maintain an explicit allowlist of known benign messages rather than broadly suppressing errors.
6. **Correlate errors with user actions** -- An error that occurs during page load is different from one triggered by a button click. Map errors to the test step that caused them for actionable debugging.
7. **Track error trends across test runs** -- A single console error might be a fluke. An error that appears in every test run for a week is a systemic issue. Store error data historically.

## Project Structure

Organize your console error hunting suite with this structure:

```
tests/
  console-errors/
    page-load-errors.spec.ts
    navigation-errors.spec.ts
    interaction-errors.spec.ts
    network-error-correlation.spec.ts
  fixtures/
    console-collector.fixture.ts
  helpers/
    error-classifier.ts
    error-reporter.ts
    known-errors.ts
    severity-rules.ts
  reports/
    console-errors.json
    console-errors.html
playwright.config.ts
```

## The Console Collector

The core of this skill is a Playwright fixture that listens to all console events and page errors, classifying and storing them for later assertion.

### Error Classification System

Before building the collector, define the classification taxonomy for console messages.

```typescript
// tests/helpers/error-classifier.ts

export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum ErrorCategory {
  UNCAUGHT_EXCEPTION = 'uncaught_exception',
  UNHANDLED_REJECTION = 'unhandled_rejection',
  NETWORK_ERROR = 'network_error',
  TYPE_ERROR = 'type_error',
  REFERENCE_ERROR = 'reference_error',
  SYNTAX_ERROR = 'syntax_error',
  SECURITY_ERROR = 'security_error',
  DEPRECATION_WARNING = 'deprecation_warning',
  CORS_ERROR = 'cors_error',
  CSP_VIOLATION = 'csp_violation',
  RESOURCE_LOAD_FAILURE = 'resource_load_failure',
  REACT_ERROR = 'react_error',
  THIRD_PARTY = 'third_party',
  UNKNOWN = 'unknown',
}

export interface ClassifiedError {
  message: string;
  category: ErrorCategory;
  severity: Severity;
  timestamp: string;
  url: string;
  stackTrace?: string;
  sourceFile?: string;
  lineNumber?: number;
  columnNumber?: number;
  testStep?: string;
  consoleType: string;
}

export function classifyConsoleMessage(
  type: string,
  text: string,
  url: string
): { category: ErrorCategory; severity: Severity } {
  const message = text.toLowerCase();

  // Critical: Uncaught exceptions
  if (message.includes('uncaught') && message.includes('error')) {
    return { category: ErrorCategory.UNCAUGHT_EXCEPTION, severity: Severity.CRITICAL };
  }

  // Critical: Unhandled promise rejections
  if (message.includes('unhandled') && message.includes('rejection')) {
    return { category: ErrorCategory.UNHANDLED_REJECTION, severity: Severity.CRITICAL };
  }

  // High: TypeError and ReferenceError indicate broken code
  if (message.includes('typeerror')) {
    return { category: ErrorCategory.TYPE_ERROR, severity: Severity.HIGH };
  }
  if (message.includes('referenceerror')) {
    return { category: ErrorCategory.REFERENCE_ERROR, severity: Severity.HIGH };
  }

  // High: SyntaxError means unparseable code
  if (message.includes('syntaxerror')) {
    return { category: ErrorCategory.SYNTAX_ERROR, severity: Severity.HIGH };
  }

  // High: React-specific errors
  if (
    message.includes('react') &&
    (message.includes('error boundary') ||
      message.includes('cannot update') ||
      message.includes('hydration'))
  ) {
    return { category: ErrorCategory.REACT_ERROR, severity: Severity.HIGH };
  }

  // Medium: Network and resource failures
  if (
    message.includes('failed to load resource') ||
    message.includes('net::err_') ||
    message.includes('404')
  ) {
    return { category: ErrorCategory.NETWORK_ERROR, severity: Severity.MEDIUM };
  }

  // Medium: CORS errors
  if (message.includes('cors') || message.includes('cross-origin')) {
    return { category: ErrorCategory.CORS_ERROR, severity: Severity.MEDIUM };
  }

  // Medium: CSP violations
  if (
    message.includes('content security policy') ||
    message.includes('csp') ||
    message.includes('refused to')
  ) {
    return { category: ErrorCategory.CSP_VIOLATION, severity: Severity.MEDIUM };
  }

  // Medium: Security-related
  if (message.includes('security') || message.includes('insecure')) {
    return { category: ErrorCategory.SECURITY_ERROR, severity: Severity.MEDIUM };
  }

  // Low: Deprecation warnings
  if (message.includes('deprecated') || message.includes('will be removed')) {
    return { category: ErrorCategory.DEPRECATION_WARNING, severity: Severity.LOW };
  }

  // Low: Third-party script errors
  const thirdPartyDomains = [
    'google-analytics.com',
    'googletagmanager.com',
    'facebook.net',
    'hotjar.com',
    'intercom.io',
    'sentry.io',
    'segment.com',
  ];
  if (thirdPartyDomains.some((domain) => url.includes(domain) || text.includes(domain))) {
    return { category: ErrorCategory.THIRD_PARTY, severity: Severity.LOW };
  }

  // Default: type-based classification
  if (type === 'error') {
    return { category: ErrorCategory.UNKNOWN, severity: Severity.MEDIUM };
  }
  if (type === 'warning') {
    return { category: ErrorCategory.UNKNOWN, severity: Severity.LOW };
  }

  return { category: ErrorCategory.UNKNOWN, severity: Severity.INFO };
}
```

### Known Errors Allowlist

Maintain an explicit list of console messages that are known and accepted so they do not trigger false failures.

```typescript
// tests/helpers/known-errors.ts

export interface KnownError {
  pattern: RegExp;
  reason: string;
  expiresAt?: string; // ISO date string; forces periodic review
}

export const KNOWN_ERRORS: KnownError[] = [
  {
    pattern: /Download the React DevTools/,
    reason: 'React development mode message; not present in production builds',
  },
  {
    pattern: /Third-party cookie will be blocked/,
    reason: 'Chrome privacy sandbox warning; does not affect functionality',
  },
  {
    pattern: /DevTools failed to load source map/,
    reason: 'Source map loading in test environment; not a production issue',
  },
  {
    pattern: /\[HMR\]/,
    reason: 'Hot Module Replacement messages from webpack dev server',
  },
  {
    pattern: /ResizeObserver loop/,
    reason: 'Known benign browser warning; see https://github.com/WICG/resize-observer/issues/38',
  },
];

export function isKnownError(message: string): { known: boolean; reason?: string } {
  for (const known of KNOWN_ERRORS) {
    if (known.pattern.test(message)) {
      // Check expiration
      if (known.expiresAt && new Date(known.expiresAt) < new Date()) {
        console.warn(`Known error pattern "${known.pattern}" has expired. Review needed.`);
        return { known: false };
      }
      return { known: true, reason: known.reason };
    }
  }
  return { known: false };
}
```

### The Collector Fixture

The fixture wraps page event listeners and provides a clean API for tests to query collected errors.

```typescript
// tests/fixtures/console-collector.fixture.ts
import { test as base, Page, ConsoleMessage } from '@playwright/test';
import {
  classifyConsoleMessage,
  ClassifiedError,
  Severity,
  ErrorCategory,
} from '../helpers/error-classifier';
import { isKnownError } from '../helpers/known-errors';

export class ConsoleCollector {
  private errors: ClassifiedError[] = [];
  private currentStep: string = 'initialization';
  private pageUrl: string = '';

  constructor(private page: Page) {
    this.attachListeners();
  }

  private attachListeners(): void {
    // Capture all console messages
    this.page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text();
      const type = msg.type();

      // Skip non-error types unless they contain error keywords
      if (type !== 'error' && type !== 'warning') {
        if (!text.toLowerCase().includes('error') && !text.toLowerCase().includes('exception')) {
          return;
        }
      }

      const { known } = isKnownError(text);
      if (known) return;

      const { category, severity } = classifyConsoleMessage(type, text, this.pageUrl);
      const location = msg.location();

      this.errors.push({
        message: text,
        category,
        severity,
        timestamp: new Date().toISOString(),
        url: this.pageUrl,
        sourceFile: location.url,
        lineNumber: location.lineNumber,
        columnNumber: location.columnNumber,
        testStep: this.currentStep,
        consoleType: type,
      });
    });

    // Capture uncaught page errors (these are always critical)
    this.page.on('pageerror', (error: Error) => {
      const { known } = isKnownError(error.message);
      if (known) return;

      this.errors.push({
        message: error.message,
        category: ErrorCategory.UNCAUGHT_EXCEPTION,
        severity: Severity.CRITICAL,
        timestamp: new Date().toISOString(),
        url: this.pageUrl,
        stackTrace: error.stack,
        testStep: this.currentStep,
        consoleType: 'pageerror',
      });
    });

    // Track page URL changes
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page.mainFrame()) {
        this.pageUrl = frame.url();
      }
    });
  }

  setStep(step: string): void {
    this.currentStep = step;
  }

  getAllErrors(): ClassifiedError[] {
    return [...this.errors];
  }

  getErrorsBySeverity(severity: Severity): ClassifiedError[] {
    return this.errors.filter((e) => e.severity === severity);
  }

  getErrorsByCategory(category: ErrorCategory): ClassifiedError[] {
    return this.errors.filter((e) => e.category === category);
  }

  getCriticalErrors(): ClassifiedError[] {
    return this.errors.filter(
      (e) => e.severity === Severity.CRITICAL || e.severity === Severity.HIGH
    );
  }

  hasErrors(minSeverity: Severity = Severity.MEDIUM): boolean {
    const severityOrder = [Severity.INFO, Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL];
    const minIndex = severityOrder.indexOf(minSeverity);
    return this.errors.some((e) => severityOrder.indexOf(e.severity) >= minIndex);
  }

  getErrorSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const error of this.errors) {
      const key = `${error.severity}:${error.category}`;
      summary[key] = (summary[key] || 0) + 1;
    }
    return summary;
  }

  clear(): void {
    this.errors = [];
    this.currentStep = 'initialization';
  }

  formatReport(): string {
    if (this.errors.length === 0) return 'No console errors detected.';

    const lines = ['Console Error Report:', `Total errors: ${this.errors.length}`, ''];

    const grouped = new Map<string, ClassifiedError[]>();
    for (const error of this.errors) {
      const key = error.severity;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(error);
    }

    for (const [severity, errors] of grouped) {
      lines.push(`--- ${severity.toUpperCase()} (${errors.length}) ---`);
      for (const error of errors) {
        lines.push(`  [${error.category}] ${error.message.substring(0, 200)}`);
        lines.push(`    URL: ${error.url}`);
        lines.push(`    Step: ${error.testStep}`);
        if (error.sourceFile) {
          lines.push(`    Source: ${error.sourceFile}:${error.lineNumber}:${error.columnNumber}`);
        }
        if (error.stackTrace) {
          lines.push(`    Stack: ${error.stackTrace.split('\n').slice(0, 3).join('\n           ')}`);
        }
        lines.push('');
      }
    }

    return lines.join('\n');
  }
}

export const test = base.extend<{ consoleCollector: ConsoleCollector }>({
  consoleCollector: async ({ page }, use) => {
    const collector = new ConsoleCollector(page);
    await use(collector);
  },
});

export { expect } from '@playwright/test';
```

## Writing the Tests

### Page Load Error Detection

The most fundamental check: visit every important page and verify no console errors appear during initial load.

```typescript
// tests/console-errors/page-load-errors.spec.ts
import { test, expect } from '../fixtures/console-collector.fixture';
import { Severity } from '../helpers/error-classifier';

const PAGES_TO_CHECK = [
  '/',
  '/about',
  '/pricing',
  '/docs',
  '/login',
  '/signup',
  '/dashboard',
  '/settings',
  '/contact',
];

for (const pagePath of PAGES_TO_CHECK) {
  test(`page "${pagePath}" should load without console errors`, async ({
    page,
    consoleCollector,
  }) => {
    consoleCollector.setStep(`navigate to ${pagePath}`);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

    await page.goto(`${baseUrl}${pagePath}`, { waitUntil: 'networkidle' });

    // Wait a bit for any async errors to surface
    await page.waitForTimeout(2000);

    const critical = consoleCollector.getCriticalErrors();

    if (critical.length > 0) {
      console.error(consoleCollector.formatReport());
    }

    expect(critical, `Critical console errors found on ${pagePath}`).toHaveLength(0);
  });
}
```

### Interaction-Triggered Error Detection

Some errors only surface when users interact with the page. This test performs common actions and checks for resulting console errors.

```typescript
// tests/console-errors/interaction-errors.spec.ts
import { test, expect } from '../fixtures/console-collector.fixture';
import { Severity } from '../helpers/error-classifier';

test.describe('Interaction-Triggered Console Errors', () => {
  test('clicking all navigation links should not produce errors', async ({
    page,
    consoleCollector,
  }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    const navLinks = await page.locator('nav a[href]').all();

    for (const link of navLinks) {
      const href = await link.getAttribute('href');
      consoleCollector.setStep(`click nav link: ${href}`);

      try {
        await link.click();
        await page.waitForLoadState('networkidle');
      } catch {
        // Navigation might fail for external links; that is fine
      }

      // Navigate back to check the next link
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
    }

    const errors = consoleCollector.getCriticalErrors();
    if (errors.length > 0) {
      console.error(consoleCollector.formatReport());
    }
    expect(errors).toHaveLength(0);
  });

  test('form submissions should not produce unhandled errors', async ({
    page,
    consoleCollector,
  }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseUrl}/contact`, { waitUntil: 'networkidle' });

    consoleCollector.setStep('fill and submit contact form');

    // Fill form fields if they exist
    const emailField = page.getByLabel('Email');
    if (await emailField.isVisible()) {
      await emailField.fill('test@example.com');
    }

    const messageField = page.getByLabel('Message');
    if (await messageField.isVisible()) {
      await messageField.fill('Test message from console error hunter');
    }

    const submitButton = page.getByRole('button', { name: /submit|send/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);
    }

    const errors = consoleCollector.getCriticalErrors();
    expect(errors).toHaveLength(0);
  });

  test('opening and closing modals should not leak errors', async ({
    page,
    consoleCollector,
  }) => {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(baseUrl, { waitUntil: 'networkidle' });

    // Find and click buttons that might open modals
    const buttons = await page.getByRole('button').all();

    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const buttonText = await buttons[i].textContent();
      consoleCollector.setStep(`click button: "${buttonText?.trim()}"`);

      try {
        await buttons[i].click();
        await page.waitForTimeout(500);

        // Try to close any modal that opened
        const closeButton = page.getByRole('button', { name: /close|dismiss|cancel/i });
        if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await closeButton.click();
          await page.waitForTimeout(300);
        } else {
          // Press Escape as fallback
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
        }
      } catch {
        // Button might not be clickable; continue
      }
    }

    const errors = consoleCollector.getCriticalErrors();
    expect(errors).toHaveLength(0);
  });
});
```

### Network Error Correlation

This test correlates console errors with failed network requests to provide richer context for debugging.

```typescript
// tests/console-errors/network-error-correlation.spec.ts
import { test, expect } from '../fixtures/console-collector.fixture';

interface NetworkFailure {
  url: string;
  method: string;
  status: number;
  resourceType: string;
  timestamp: string;
}

test.describe('Network Error Correlation', () => {
  test('should correlate failed network requests with console errors', async ({
    page,
    consoleCollector,
  }) => {
    const networkFailures: NetworkFailure[] = [];

    // Listen for failed responses
    page.on('response', (response) => {
      if (response.status() >= 400) {
        networkFailures.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          resourceType: response.request().resourceType(),
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Listen for request failures (network errors, timeouts)
    page.on('requestfailed', (request) => {
      networkFailures.push({
        url: request.url(),
        method: request.method(),
        status: 0,
        resourceType: request.resourceType(),
        timestamp: new Date().toISOString(),
      });
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    consoleCollector.setStep('full page load with network monitoring');
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Build correlation report
    const consoleErrors = consoleCollector.getAllErrors();

    if (networkFailures.length > 0 || consoleErrors.length > 0) {
      console.log('=== Network/Console Error Correlation ===');
      console.log(`Network failures: ${networkFailures.length}`);
      console.log(`Console errors: ${consoleErrors.length}`);

      for (const failure of networkFailures) {
        console.log(`  [${failure.status}] ${failure.method} ${failure.url} (${failure.resourceType})`);
        // Find related console errors
        const related = consoleErrors.filter(
          (e) => e.message.includes(failure.url) || e.message.includes(new URL(failure.url).pathname)
        );
        if (related.length > 0) {
          console.log(`    Related console errors: ${related.length}`);
          related.forEach((r) => console.log(`      - ${r.message.substring(0, 150)}`));
        }
      }
    }

    // Fail on critical JS errors (not on missing analytics pixels)
    const criticalNetworkErrors = networkFailures.filter(
      (f) => f.resourceType === 'script' || f.resourceType === 'document' || f.resourceType === 'xhr' || f.resourceType === 'fetch'
    );

    expect(
      criticalNetworkErrors,
      `${criticalNetworkErrors.length} critical network failures detected`
    ).toHaveLength(0);
  });
});
```

## Error Reporting

Generate structured reports that can be consumed by CI systems and dashboards.

```typescript
// tests/helpers/error-reporter.ts
import * as fs from 'fs';
import * as path from 'path';
import { ClassifiedError, Severity, ErrorCategory } from './error-classifier';

export interface ErrorReport {
  timestamp: string;
  testSuite: string;
  totalErrors: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byPage: Record<string, number>;
  errors: ClassifiedError[];
  criticalCount: number;
  highCount: number;
}

export function buildErrorReport(
  errors: ClassifiedError[],
  testSuite: string
): ErrorReport {
  const bySeverity: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byPage: Record<string, number> = {};

  for (const error of errors) {
    bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    byCategory[error.category] = (byCategory[error.category] || 0) + 1;
    byPage[error.url] = (byPage[error.url] || 0) + 1;
  }

  return {
    timestamp: new Date().toISOString(),
    testSuite,
    totalErrors: errors.length,
    bySeverity,
    byCategory,
    byPage,
    errors,
    criticalCount: errors.filter((e) => e.severity === Severity.CRITICAL).length,
    highCount: errors.filter((e) => e.severity === Severity.HIGH).length,
  };
}

export function saveErrorReport(report: ErrorReport, outputDir: string): void {
  fs.mkdirSync(outputDir, { recursive: true });
  const filePath = path.join(outputDir, 'console-errors.json');
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  console.log(`Console error report saved to: ${filePath}`);
}
```

## Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/console-errors',
  timeout: 60_000,
  retries: 1,
  workers: 2,
  reporter: [
    ['html', { outputFolder: 'reports/html' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'firefox',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
});
```

## CI Integration

```yaml
# .github/workflows/console-error-check.yml
name: Console Error Check
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check-console-errors:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Start application
        run: npm run start &
      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 60000
      - name: Run console error tests
        run: npx playwright test
        env:
          BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: console-error-report
          path: reports/
```

## Best Practices

1. **Attach console listeners before navigation** -- If you attach the listener after `page.goto`, you miss errors that occur during page load. Always set up the collector before any navigation.
2. **Use `pageerror` for uncaught exceptions** -- The `console` event captures `console.error()` calls, but `pageerror` captures uncaught exceptions and unhandled promise rejections that never reach the console API.
3. **Include stack traces in reports** -- The `ConsoleMessage.location()` method in Playwright provides the source file, line number, and column. Always capture these for debuggability.
4. **Test across all major browsers** -- Console behavior differs between Chromium, Firefox, and WebKit. An error that surfaces in Firefox might be silent in Chrome. Run your tests in all three engines.
5. **Review the known-errors list quarterly** -- Suppressed errors accumulate. Set expiration dates on known-error entries and review them periodically to ensure they are still valid.
6. **Separate first-party and third-party errors** -- Third-party scripts (analytics, chat widgets, A/B testing) produce errors outside your control. Track them separately to avoid alert fatigue.
7. **Run console error checks in both development and production modes** -- Development builds have extra warnings (React strict mode, HMR) that production builds do not. Test both to catch different classes of issues.
8. **Capture console errors during visual regression tests** -- If you already run screenshot comparison tests, add console error collection to the same runs for free coverage.
9. **Set severity thresholds per environment** -- In staging, warn on medium-severity errors. In production smoke tests, fail on anything above low severity.
10. **Include the user action context in error reports** -- An error message like "Cannot read property 'length' of undefined" is only useful when paired with "this occurred when clicking the 'Add to Cart' button on the /products page."
11. **Use structured logging for machine-readable reports** -- JSON reports are easier to parse in CI pipelines and dashboards than free-form text.
12. **Monitor error volume, not just error presence** -- A page that produces one console warning is different from one that produces 500. Track counts and set volume thresholds.

## Anti-Patterns to Avoid

1. **Suppressing all console.warn messages** -- Warnings exist for a reason. Deprecation warnings indicate upcoming breakage. Security warnings indicate vulnerabilities. Review each before suppressing.
2. **Ignoring errors in third-party iframes** -- If your site embeds a third-party widget in an iframe, errors in that iframe still affect user experience. Monitor cross-origin frames when possible.
3. **Using broad regex patterns in the known-errors list** -- A pattern like `/.*error.*/i` will suppress every legitimate error. Known-error patterns must be as specific as possible.
4. **Only checking the console after test completion** -- Some errors are transient and might be overwritten by subsequent navigation. Check the console at each meaningful step of the test.
5. **Treating console.log as harmless** -- While `console.log` is typically informational, excessive logging in production indicates debug code that was not removed. Flag high-volume `console.log` calls.
6. **Not testing error boundaries** -- React error boundaries catch rendering errors and display fallback UI. If your error boundary triggers, it means something broke. Test that error boundaries are not activated during normal flows.
7. **Collecting errors without acting on them** -- A report that nobody reads is useless. Integrate console error results into your pull request checks so they block merges when thresholds are exceeded.

## Debugging Tips

- **Use Playwright trace files for reproducing errors** -- When a console error appears in CI but not locally, the trace file provides a step-by-step replay including network requests, DOM snapshots, and console output.
- **Check for hydration mismatches in SSR applications** -- Server-rendered HTML that does not match the client-rendered DOM produces console errors in React and Next.js. These are often caused by browser extensions or time-zone-dependent content.
- **Inspect the error source location** -- `ConsoleMessage.location()` returns the file URL, line, and column. Use source maps to map minified locations back to the original source.
- **Filter by resource type for network errors** -- Not all 404s are equal. A missing JavaScript bundle is critical; a missing analytics pixel is not. Use `request.resourceType()` to differentiate.
- **Test with browser extensions disabled** -- Browser extensions inject scripts that produce console errors. Run Playwright in a clean browser context (which it does by default) to avoid false positives.
- **Watch for errors that only appear on slow connections** -- Use Playwright's network throttling to simulate 3G connections. Timeout-related errors and race conditions often only surface under slow network conditions.
- **Check for errors after route transitions in SPAs** -- Single-page applications load new content without full page reloads. Ensure your collector stays active across client-side navigations by listening on the page object, not individual frames.
- **Use `page.on('requestfinished')` to verify all resources loaded** -- Compare the list of requested resources against the list of successfully loaded ones to find silent failures that do not produce console errors.