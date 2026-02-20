---
name: Error Message Reviewer
description: Audit error messages across an application for clarity, actionability, consistency, and user-friendliness by cataloging and grading every error surface.
version: 1.0.0
author: Pramod
license: MIT
tags: [error-messages, ux-writing, microcopy, user-experience, error-handling, copywriting]
testingTypes: [e2e, code-quality]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Error Message Reviewer Skill

You are an expert QA engineer specializing in error message quality, UX microcopy, and security-conscious error handling. When asked to audit, review, or improve error messages across a web application, follow these comprehensive instructions to systematically evaluate every error surface for clarity, consistency, actionability, and safety.

## Core Principles

1. **Every Error Must Be Actionable** -- An error message that says "An error occurred" gives the user nothing to work with. Every error must communicate three things: what happened, why it happened, and what the user can do to resolve it. The message "Your session expired. Please sign in again to continue." is vastly superior to "Error 401."

2. **Never Expose Internal Implementation Details** -- Stack traces, database column names, SQL queries, internal IP addresses, framework exception types, and server file paths must never appear in user-facing error messages. These are security vulnerabilities that assist attackers while simultaneously confusing legitimate users. Treat every leaked internal detail as a severity-high bug.

3. **Consistency Is a Quality Signal** -- Error messages across the entire application must share a consistent tone, sentence structure, capitalization scheme, punctuation style, and visual treatment. A user who encounters "Oops! Something broke" on one page and "FATAL ERROR: Operation failed (code 0x8004)" on another will lose trust in the product.

4. **Localization Readiness Is Not Optional** -- All error messages must be externalizable to translation files from day one. Hardcoded strings with concatenated variables, embedded HTML, or culture-specific idioms produce localization defects. Design error strings with parameterized ICU message templates that translators can adapt without touching code.

5. **Error States Are Part of the UX** -- Errors are not edge cases. They are regular, predictable parts of the user experience. Treat error message design with the same care as feature design: write them intentionally, review them in context, test them with real users, and iterate on them.

6. **Grade Severity Honestly** -- Not all errors are equal. A failed password reset is more critical than a tooltip that did not load. Assign severity levels to each error surface and allocate review effort accordingly. Critical paths such as authentication, payment, and data submission deserve the highest scrutiny.

7. **Audit Exhaustively Before Fixing** -- Resist the urge to fix individual messages in isolation. First, catalog every error surface in the application. Then analyze patterns, identify systemic issues, and fix them at the source. Fixing one message at a time produces inconsistent results.

## Project Structure

Organize your error message review suite with this directory structure:

```
tests/
  error-messages/
    form-validation-messages.spec.ts
    api-error-responses.spec.ts
    auth-error-flows.spec.ts
    network-error-states.spec.ts
    empty-state-messages.spec.ts
    boundary-error-messages.spec.ts
  fixtures/
    error-collector.fixture.ts
  helpers/
    error-catalog.ts
    error-grader.ts
    message-rules.ts
    security-scanner.ts
    tone-analyzer.ts
  reports/
    error-catalog.json
    error-grades.html
  data/
    known-good-messages.json
    banned-phrases.json
playwright.config.ts
```

Each spec file targets a specific category of error surfaces. The helpers directory contains the grading logic, the security scanner for leaked internals, and the tone analyzer for consistency checking. Reports are generated as both machine-readable JSON and human-readable HTML.

## Detailed Guide

### Step 1: Catalog Every Error Surface

Before grading anything, build a complete inventory of every place the application can display an error. This includes form validation messages, toast notifications, modal dialogs, inline alerts, HTTP error pages, empty states triggered by failures, and console error boundaries.

```typescript
// helpers/error-catalog.ts
import { Page, Locator } from '@playwright/test';

export interface ErrorSurface {
  id: string;
  page: string;
  trigger: string;
  selector: string;
  messageText: string;
  messageType: 'inline' | 'toast' | 'modal' | 'banner' | 'page' | 'tooltip';
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  timestamp: string;
  screenshot?: string;
}

export class ErrorCatalog {
  private surfaces: ErrorSurface[] = [];

  async collectInlineErrors(page: Page): Promise<ErrorSurface[]> {
    const errorSelectors = [
      '[role="alert"]',
      '[aria-invalid="true"] ~ .error-message',
      '.field-error',
      '.validation-error',
      '.form-error',
      '.input-error-message',
      '[data-testid*="error"]',
      '.text-red-500',
      '.text-destructive',
    ];

    const found: ErrorSurface[] = [];

    for (const selector of errorSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();

      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const text = await element.textContent();

        if (text && text.trim().length > 0) {
          found.push({
            id: `inline-${found.length}`,
            page: page.url(),
            trigger: 'form-submission',
            selector,
            messageText: text.trim(),
            messageType: 'inline',
            severity: 'major',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    this.surfaces.push(...found);
    return found;
  }

  async collectToastErrors(page: Page): Promise<ErrorSurface[]> {
    const toastSelectors = [
      '[role="status"]',
      '.toast-error',
      '.notification-error',
      '[data-sonner-toast][data-type="error"]',
      '.Toastify__toast--error',
    ];

    const found: ErrorSurface[] = [];

    for (const selector of toastSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();

      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const text = await element.textContent();

        if (text && text.trim().length > 0) {
          found.push({
            id: `toast-${found.length}`,
            page: page.url(),
            trigger: 'async-operation',
            selector,
            messageText: text.trim(),
            messageType: 'toast',
            severity: 'major',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    this.surfaces.push(...found);
    return found;
  }

  async collectModalErrors(page: Page): Promise<ErrorSurface[]> {
    const modalSelectors = [
      '[role="dialog"] [role="alert"]',
      '.modal-error',
      '.dialog-error-body',
      '[role="alertdialog"]',
    ];

    const found: ErrorSurface[] = [];

    for (const selector of modalSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();

      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        const text = await element.textContent();

        if (text && text.trim().length > 0) {
          found.push({
            id: `modal-${found.length}`,
            page: page.url(),
            trigger: 'critical-operation',
            selector,
            messageText: text.trim(),
            messageType: 'modal',
            severity: 'critical',
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    this.surfaces.push(...found);
    return found;
  }

  getAllSurfaces(): ErrorSurface[] {
    return [...this.surfaces];
  }

  exportAsJSON(): string {
    return JSON.stringify(this.surfaces, null, 2);
  }
}
```

### Step 2: Build a Grading Rubric

Each error message should be scored against a well-defined rubric. The rubric evaluates clarity, actionability, tone, security, accessibility, and localization readiness.

```typescript
// helpers/error-grader.ts
import { ErrorSurface } from './error-catalog';

export interface GradeResult {
  surface: ErrorSurface;
  scores: {
    clarity: number;        // 0-10: Is the message understandable?
    actionability: number;  // 0-10: Does it tell the user what to do next?
    tone: number;           // 0-10: Is it empathetic and professional?
    security: number;       // 0-10: Does it avoid leaking internals?
    accessibility: number;  // 0-10: Is it screen-reader friendly?
    localization: number;   // 0-10: Is it ready for translation?
  };
  totalScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: string[];
  recommendations: string[];
}

const BANNED_PHRASES = [
  'an error occurred',
  'something went wrong',
  'unexpected error',
  'oops',
  'uh oh',
  'whoops',
  'please try again later',
  'contact support',
  'error code',
  'null',
  'undefined',
  'NaN',
  'exception',
  'stack trace',
];

const INTERNAL_LEAK_PATTERNS = [
  /at\s+\w+\s+\(.*:\d+:\d+\)/i,       // stack trace lines
  /\/usr\/|\/var\/|\/home\//i,          // server file paths
  /SELECT\s+.*FROM/i,                   // SQL queries
  /postgres|mysql|mongo|redis/i,         // database names
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // IP addresses
  /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i,  // Node.js error codes
  /TypeError|ReferenceError|SyntaxError/i, // JS exception types
  /node_modules/i,                       // dependency paths
  /\.ts:\d+|\.js:\d+/i,                 // source file references
];

export class ErrorGrader {
  gradeMessage(surface: ErrorSurface): GradeResult {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const message = surface.messageText.toLowerCase();

    // Clarity scoring
    let clarity = 10;
    if (surface.messageText.length < 10) {
      clarity -= 4;
      issues.push('Message is too short to be meaningful');
      recommendations.push('Expand the message to explain what happened');
    }
    if (surface.messageText.length > 200) {
      clarity -= 2;
      issues.push('Message is excessively long');
      recommendations.push('Shorten to under 200 characters for scannability');
    }
    for (const phrase of BANNED_PHRASES) {
      if (message.includes(phrase)) {
        clarity -= 3;
        issues.push(`Contains vague phrase: "${phrase}"`);
        recommendations.push(`Replace "${phrase}" with a specific description of the problem`);
      }
    }

    // Actionability scoring
    let actionability = 10;
    const actionWords = ['try', 'click', 'check', 'verify', 'update', 'enter', 'select', 'refresh', 'sign in', 'log in', 'contact'];
    const hasAction = actionWords.some((word) => message.includes(word));
    if (!hasAction) {
      actionability -= 5;
      issues.push('Message does not suggest a next action');
      recommendations.push('Add a clear call-to-action telling the user what to do');
    }

    // Tone scoring
    let tone = 10;
    const aggressivePhrases = ['you must', 'you failed', 'invalid', 'illegal', 'forbidden', 'bad request', 'wrong'];
    for (const phrase of aggressivePhrases) {
      if (message.includes(phrase)) {
        tone -= 2;
        issues.push(`Uses potentially aggressive language: "${phrase}"`);
        recommendations.push(`Soften "${phrase}" to be more empathetic`);
      }
    }

    // Security scoring
    let security = 10;
    for (const pattern of INTERNAL_LEAK_PATTERNS) {
      if (pattern.test(surface.messageText)) {
        security -= 5;
        issues.push(`Potential information leak detected: ${pattern.source}`);
        recommendations.push('Remove internal implementation details from user-facing message');
      }
    }

    // Accessibility scoring
    let accessibility = 10;
    if (surface.messageText === surface.messageText.toUpperCase() && surface.messageText.length > 5) {
      accessibility -= 3;
      issues.push('Message is in ALL CAPS which is hostile to screen readers');
      recommendations.push('Use sentence case for screen reader compatibility');
    }

    // Localization scoring
    let localization = 10;
    if (/\{0\}|\$\{/.test(surface.messageText)) {
      localization -= 2;
      issues.push('Uses code-style interpolation visible to the user');
    }

    const scores = {
      clarity: Math.max(0, clarity),
      actionability: Math.max(0, actionability),
      tone: Math.max(0, tone),
      security: Math.max(0, security),
      accessibility: Math.max(0, accessibility),
      localization: Math.max(0, localization),
    };

    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);
    const maxScore = 60;
    const percentage = (totalScore / maxScore) * 100;

    let grade: GradeResult['grade'];
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';
    else grade = 'F';

    return { surface, scores, totalScore, grade, issues, recommendations };
  }
}
```

### Step 3: Write Playwright Tests That Trigger Error States

The core of this skill is writing tests that deliberately trigger every error state in the application and then grade the resulting messages.

```typescript
// tests/error-messages/form-validation-messages.spec.ts
import { test, expect } from '@playwright/test';
import { ErrorCatalog, ErrorSurface } from '../helpers/error-catalog';
import { ErrorGrader, GradeResult } from '../helpers/error-grader';

test.describe('Form Validation Error Messages', () => {
  let catalog: ErrorCatalog;
  let grader: ErrorGrader;

  test.beforeEach(() => {
    catalog = new ErrorCatalog();
    grader = new ErrorGrader();
  });

  test('login form shows clear errors for empty submission', async ({ page }) => {
    await page.goto('/login');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    const errors = await catalog.collectInlineErrors(page);

    expect(errors.length).toBeGreaterThan(0);

    for (const error of errors) {
      const grade = grader.gradeMessage(error);
      expect(grade.grade).not.toBe('F');
      expect(grade.scores.security).toBeGreaterThanOrEqual(8);
      expect(grade.scores.clarity).toBeGreaterThanOrEqual(6);
    }
  });

  test('registration form validates email format with helpful message', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[name="email"]', 'not-an-email');
    await page.fill('[name="password"]', 'short');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);

    const errors = await catalog.collectInlineErrors(page);

    for (const error of errors) {
      const grade = grader.gradeMessage(error);
      expect(grade.scores.actionability).toBeGreaterThanOrEqual(5);

      // The message should tell the user what valid input looks like
      const messageText = error.messageText.toLowerCase();
      const isHelpful =
        messageText.includes('example') ||
        messageText.includes('format') ||
        messageText.includes('like') ||
        messageText.includes('must be') ||
        messageText.includes('should');
      expect(isHelpful).toBe(true);
    }
  });

  test('payment form errors never expose card processing details', async ({ page }) => {
    await page.goto('/checkout');
    // Trigger payment validation errors
    await page.fill('[name="cardNumber"]', '0000000000000000');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    const errors = await catalog.collectInlineErrors(page);
    const toasts = await catalog.collectToastErrors(page);
    const allErrors = [...errors, ...toasts];

    for (const error of allErrors) {
      const grade = grader.gradeMessage(error);
      // Payment errors must have perfect security scores
      expect(grade.scores.security).toBe(10);

      // Must never contain processor-specific details
      const forbidden = ['stripe', 'braintree', 'adyen', 'processor', 'gateway', 'merchant'];
      for (const term of forbidden) {
        expect(error.messageText.toLowerCase()).not.toContain(term);
      }
    }
  });
});
```

### Step 4: Test API Error Responses

API error responses that reach the frontend must also be reviewed. Many applications pass raw API error messages directly to the UI without transformation.

```typescript
// tests/error-messages/api-error-responses.spec.ts
import { test, expect } from '@playwright/test';

interface APIErrorResponse {
  status: number;
  body: {
    error?: string;
    message?: string;
    details?: unknown;
  };
}

test.describe('API Error Response Quality', () => {
  const endpoints = [
    { method: 'POST', path: '/api/auth/login', body: { email: '', password: '' } },
    { method: 'POST', path: '/api/users', body: { email: 'invalid' } },
    { method: 'GET', path: '/api/resources/nonexistent-id' },
    { method: 'DELETE', path: '/api/resources/unauthorized-id' },
    { method: 'PUT', path: '/api/settings', body: { theme: 999 } },
  ];

  for (const endpoint of endpoints) {
    test(`${endpoint.method} ${endpoint.path} returns a safe error`, async ({ request }) => {
      const response = await request.fetch(endpoint.path, {
        method: endpoint.method,
        data: endpoint.body,
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status() >= 400) {
        const body = await response.json();
        const message = body.message || body.error || JSON.stringify(body);

        // Must not contain stack traces
        expect(message).not.toMatch(/at\s+\w+\s+\(.*:\d+:\d+\)/);

        // Must not contain SQL
        expect(message).not.toMatch(/SELECT|INSERT|UPDATE|DELETE.*FROM/i);

        // Must not contain file paths
        expect(message).not.toMatch(/\/usr\/|\/var\/|\/home\/|node_modules/);

        // Must not expose database details
        expect(message).not.toMatch(/postgres|mysql|mongo|constraint|violates/i);

        // Must be a reasonable length
        expect(message.length).toBeLessThan(500);
        expect(message.length).toBeGreaterThan(5);
      }
    });
  }
});
```

### Step 5: Analyze Network Error States

Users frequently encounter network errors when their connection is unstable. Test that the application handles offline states, timeouts, and server errors gracefully.

```typescript
// tests/error-messages/network-error-states.spec.ts
import { test, expect } from '@playwright/test';
import { ErrorCatalog } from '../helpers/error-catalog';
import { ErrorGrader } from '../helpers/error-grader';

test.describe('Network Error Message Quality', () => {
  test('shows helpful message when API is unreachable', async ({ page, context }) => {
    await page.goto('/dashboard');

    // Simulate network failure for API calls
    await context.route('**/api/**', (route) => route.abort('connectionrefused'));

    // Trigger an action that requires API
    await page.click('[data-testid="refresh-data"]');
    await page.waitForTimeout(2000);

    const catalog = new ErrorCatalog();
    const grader = new ErrorGrader();
    const errors = [
      ...(await catalog.collectInlineErrors(page)),
      ...(await catalog.collectToastErrors(page)),
    ];

    expect(errors.length).toBeGreaterThan(0);

    for (const error of errors) {
      const grade = grader.gradeMessage(error);
      // Network errors must suggest checking connectivity
      expect(grade.scores.actionability).toBeGreaterThanOrEqual(6);
      expect(grade.scores.clarity).toBeGreaterThanOrEqual(6);
    }
  });

  test('handles slow responses without confusing timeout messages', async ({ page, context }) => {
    // Simulate very slow API
    await context.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 30000));
      await route.fulfill({ status: 504, body: 'Gateway Timeout' });
    });

    await page.goto('/dashboard');
    await page.click('[data-testid="load-more"]');

    // Wait for the timeout UI to appear
    await page.waitForTimeout(15000);

    const catalog = new ErrorCatalog();
    const errors = await catalog.collectInlineErrors(page);

    for (const error of errors) {
      const message = error.messageText.toLowerCase();
      // Should not say "504" or "gateway timeout" to the user
      expect(message).not.toContain('504');
      expect(message).not.toContain('gateway timeout');
    }
  });
});
```

### Step 6: Generate the Error Catalog Report

After running all tests, produce a consolidated report that lists every error surface, its grade, and prioritized recommendations.

```typescript
// helpers/error-reporter.ts
import * as fs from 'fs';
import { GradeResult } from './error-grader';

export class ErrorReporter {
  private results: GradeResult[] = [];

  addResult(result: GradeResult): void {
    this.results.push(result);
  }

  generateSummary(): {
    totalSurfaces: number;
    averageScore: number;
    gradeDistribution: Record<string, number>;
    criticalIssues: GradeResult[];
  } {
    const totalSurfaces = this.results.length;
    const averageScore =
      this.results.reduce((sum, r) => sum + r.totalScore, 0) / totalSurfaces;

    const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const result of this.results) {
      gradeDistribution[result.grade]++;
    }

    const criticalIssues = this.results.filter(
      (r) => r.scores.security < 8 || r.grade === 'F'
    );

    return { totalSurfaces, averageScore, gradeDistribution, criticalIssues };
  }

  writeJSONReport(outputPath: string): void {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: this.generateSummary(),
      results: this.results,
    };
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  }

  writeHTMLReport(outputPath: string): void {
    const summary = this.generateSummary();
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Error Message Audit Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; }
    .grade-A { color: #16a34a; } .grade-B { color: #2563eb; }
    .grade-C { color: #d97706; } .grade-D { color: #ea580c; }
    .grade-F { color: #dc2626; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { text-align: left; padding: 0.5rem; border-bottom: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <h1>Error Message Audit Report</h1>
  <p>Total surfaces audited: ${summary.totalSurfaces}</p>
  <p>Average score: ${summary.averageScore.toFixed(1)} / 60</p>
  <h2>Grade Distribution</h2>
  <ul>
    ${Object.entries(summary.gradeDistribution)
      .map(([grade, count]) => `<li class="grade-${grade}">${grade}: ${count}</li>`)
      .join('')}
  </ul>
  <h2>All Results</h2>
  <table>
    <thead><tr><th>Page</th><th>Message</th><th>Grade</th><th>Issues</th></tr></thead>
    <tbody>
      ${this.results
        .sort((a, b) => a.totalScore - b.totalScore)
        .map(
          (r) => `<tr>
          <td>${r.surface.page}</td>
          <td>${r.surface.messageText.substring(0, 80)}</td>
          <td class="grade-${r.grade}">${r.grade} (${r.totalScore}/60)</td>
          <td>${r.issues.join('; ')}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;
    fs.writeFileSync(outputPath, html);
  }
}
```

## Configuration

### Playwright Configuration for Error Message Testing

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/error-messages',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'on',
    trace: 'on-first-retry',
  },
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reports/error-audit-results.json' }],
  ],
  projects: [
    {
      name: 'error-audit-chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
```

### Custom Message Rules Configuration

```typescript
// helpers/message-rules.ts
export interface MessageRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (message: string) => boolean;
  recommendation: string;
}

export const defaultRules: MessageRule[] = [
  {
    id: 'no-technical-jargon',
    name: 'No Technical Jargon',
    description: 'Error messages should not contain technical terms unfamiliar to end users',
    severity: 'error',
    check: (msg) => /exception|stack|null pointer|segfault|core dump/i.test(msg),
    recommendation: 'Replace technical terms with plain language descriptions',
  },
  {
    id: 'no-blame-language',
    name: 'No Blame Language',
    description: 'Error messages should not blame the user for the error',
    severity: 'warning',
    check: (msg) => /you (did|made|caused|broke)|your fault|your error/i.test(msg),
    recommendation: 'Use passive voice or focus on the system state rather than user actions',
  },
  {
    id: 'minimum-length',
    name: 'Minimum Message Length',
    description: 'Error messages must be at least 15 characters to be meaningful',
    severity: 'error',
    check: (msg) => msg.trim().length < 15,
    recommendation: 'Expand the message to describe the problem and suggest a solution',
  },
  {
    id: 'no-raw-http-codes',
    name: 'No Raw HTTP Status Codes',
    description: 'Users should never see raw HTTP status codes as the primary error message',
    severity: 'error',
    check: (msg) => /^(4\d{2}|5\d{2})\b/.test(msg.trim()),
    recommendation: 'Translate HTTP status codes into human-readable explanations',
  },
  {
    id: 'sentence-case',
    name: 'Sentence Case',
    description: 'Error messages should use sentence case, not ALL CAPS or Title Case',
    severity: 'warning',
    check: (msg) => msg === msg.toUpperCase() && msg.length > 10,
    recommendation: 'Convert to sentence case for better readability and accessibility',
  },
  {
    id: 'no-period-missing',
    name: 'Proper Punctuation',
    description: 'Multi-sentence error messages should end with proper punctuation',
    severity: 'info',
    check: (msg) => msg.includes('. ') && !/[.!?]$/.test(msg.trim()),
    recommendation: 'End multi-sentence messages with a period',
  },
  {
    id: 'has-recovery-action',
    name: 'Recovery Action Present',
    description: 'Error messages should include a recovery action or next step',
    severity: 'error',
    check: (msg) => {
      const actionVerbs = ['try', 'click', 'refresh', 'check', 'update', 'contact', 'sign in', 'reload'];
      return !actionVerbs.some((verb) => msg.toLowerCase().includes(verb));
    },
    recommendation: 'Add a clear action the user can take to recover from the error',
  },
];
```

## Best Practices

1. **Catalog first, fix second.** Build a complete inventory of every error surface before changing any individual message. Fixing messages piecemeal produces inconsistency.

2. **Test errors in context, not in isolation.** An error message that reads well in a spreadsheet might be confusing when displayed inside a small tooltip with truncated text. Always verify messages in the actual UI.

3. **Maintain a banned phrases list.** Keep a centralized list of phrases that must never appear in error messages, such as "something went wrong" or "an error occurred." Run automated checks against this list in CI.

4. **Separate user-facing messages from developer logs.** Errors sent to logging services can be as verbose and technical as needed. The user-facing message must be a separate, curated string.

5. **Include error codes for support channels.** If users need to contact support, give them a short, memorable error code (like "ERR-1042") that support staff can look up. Never make error codes the primary message.

6. **Test with screen readers.** Error messages must be announced by assistive technology. Verify that ARIA live regions are used correctly and that messages are read aloud when they appear.

7. **Test localized versions.** If the application supports multiple languages, audit error messages in every locale. Machine-translated error messages are frequently nonsensical.

8. **Grade on a rubric, not gut feeling.** Use a consistent scoring system with defined criteria. Subjective "this seems fine" reviews miss systemic patterns.

9. **Check error message consistency across related flows.** The password reset flow and the login flow should use the same tone, format, and vocabulary for similar errors.

10. **Monitor error messages in production.** Track which error messages users actually see using analytics. The most frequently shown error messages deserve the most attention.

11. **Validate that errors disappear after correction.** When a user fixes the problem (enters a valid email after an invalid one), the error message must clear immediately. Stale error messages erode trust.

12. **Test empty and boundary states.** Submit forms with maximum-length inputs, special characters, and empty fields. These boundary cases frequently produce unhelpful or broken error messages.

## Anti-Patterns to Avoid

1. **Generic catch-all messages.** Displaying "Something went wrong" for every error is lazy and unhelpful. Each error type should have its own tailored message.

2. **Exposing stack traces to users.** This is both a UX failure and a security vulnerability. Never render raw exception output in the UI.

3. **Blaming the user.** Messages like "You entered an invalid email" feel accusatory. Prefer "Please enter a valid email address" which focuses on the solution.

4. **Using error codes as the sole message.** "Error 403" means nothing to most users. Always accompany codes with a human-readable explanation.

5. **Hardcoding error strings in components.** Error messages scattered across dozens of component files become impossible to audit and maintain. Centralize them in a messages file or i18n system.

6. **Showing technical HTTP status pages.** A raw Nginx 502 Bad Gateway page tells the user nothing useful and looks unprofessional.

7. **Hiding errors silently.** Swallowing errors without showing any feedback leaves users confused about why their action did not succeed.

8. **Using humor in critical errors.** A lighthearted "Oops!" is acceptable for a non-critical tooltip failure. It is inappropriate for a failed payment or a data loss scenario.

9. **Displaying multiple duplicate errors.** When a form submission triggers three identical "Required field" messages with no indication of which field they refer to, the UX is broken.

10. **Inconsistent capitalization and punctuation.** Mixing "Email is required." with "PASSWORD MUST NOT BE EMPTY" and "please provide a username" across the same form signals a lack of quality control.

## Debugging Tips

1. **Use Playwright's page.on('console') listener** to capture all console output during error state tests. Console warnings often reveal error message rendering issues that are not visible in the UI.

2. **Intercept network responses with page.route()** to simulate specific HTTP error codes and verify the corresponding UI messages. Test 400, 401, 403, 404, 422, 429, 500, 502, 503, and 504 responses individually.

3. **Take screenshots at the moment each error appears.** Visual evidence is invaluable when reporting error message quality issues to designers and copywriters.

4. **Check the DOM for hidden error elements.** Some error messages exist in the DOM but are hidden by CSS. Use page.locator().isVisible() to verify that error messages intended for display are actually visible.

5. **Test error message timing.** Use performance.now() or Playwright's built-in timing to verify that error messages appear within 200ms of the triggering action. Delayed error feedback feels broken.

6. **Inspect ARIA attributes on error containers.** Verify that error message containers have role="alert" or aria-live="polite" so assistive technology announces them.

7. **Test error recovery flows end-to-end.** After triggering an error, verify that correcting the input and resubmitting clears the error and proceeds normally. Error states that persist after correction are severe bugs.

8. **Validate error message rendering at different viewport sizes.** Long error messages may overflow or get truncated on mobile viewports. Test at 320px, 375px, and 768px widths.

9. **Compare error messages across browsers.** Some browsers add their own error text (especially for form validation). Verify that custom error messages override browser defaults consistently.

10. **Log the raw API response alongside the displayed message.** When a UI error message does not match the API error, it indicates a missing or incorrect error transformation layer in the frontend code.
