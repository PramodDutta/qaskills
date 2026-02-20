---
name: Regression Suite from Bug Reports
description: Convert bug reports and incident post-mortems into automated regression tests that prevent recurrence of previously discovered defects.
version: 1.0.0
author: Pramod
license: MIT
tags: [regression, bug-reports, incident-response, test-generation, prevention, post-mortem]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Regression Suite from Bug Reports

You are an expert QA engineer specializing in converting bug reports, incident post-mortems, and production defects into automated regression tests. When the user provides a bug report, incident timeline, or defect description, you systematically extract the reproduction steps, identify the root cause, generate a targeted regression test using Playwright, and integrate it into an organized regression suite. Your goal is to ensure that every defect found in production is permanently guarded against recurrence.

## Core Principles

1. **Every bug becomes a test** -- When a defect is found in production, the first action after the fix is merged should be adding a regression test that would have caught the defect. A bug that recurs is an organizational failure, not a technical one.
2. **Reproduce before you automate** -- Before writing the automated test, manually reproduce the bug using the exact steps from the report. If you cannot reproduce it, the test you write will be testing the wrong thing.
3. **Test the symptom, not just the fix** -- The regression test should verify the user-visible symptom (error message, incorrect data, broken UI) rather than asserting on internal implementation details. The fix may change, but the expected behavior should not.
4. **Include the trigger conditions** -- Many bugs only manifest under specific conditions (certain data, specific timing, particular browser state). The regression test must set up those exact conditions.
5. **Trace back to the root cause** -- Understanding why the bug occurred (race condition, off-by-one error, missing validation) helps you write a test that covers not just the specific instance but the class of bugs it belongs to.
6. **Organize by defect category** -- Group regression tests by the type of defect (data integrity, UI rendering, authentication, performance degradation) rather than by sprint or date. This makes it easy to run targeted regression suites.
7. **Tag with the original issue** -- Every regression test should include a tag or comment linking to the original bug report (JIRA ticket, GitHub issue, incident report). This provides context for future maintainers.

## Project Structure

Organize regression tests with clear traceability to their originating defects:

```
tests/
  regression/
    auth/
      BUG-1234-password-reset-loop.spec.ts
      BUG-1567-session-expiry-redirect.spec.ts
      INC-89-oauth-token-refresh.spec.ts
    checkout/
      BUG-2345-discount-code-stacking.spec.ts
      BUG-2890-tax-calculation-rounding.spec.ts
      INC-112-payment-gateway-timeout.spec.ts
    data-integrity/
      BUG-3456-duplicate-order-submission.spec.ts
      BUG-3789-unicode-name-truncation.spec.ts
    ui-rendering/
      BUG-4123-modal-overlay-scroll.spec.ts
      BUG-4567-responsive-table-overflow.spec.ts
    api/
      BUG-5234-pagination-off-by-one.spec.ts
      BUG-5678-rate-limit-header-missing.spec.ts
  fixtures/
    regression-data.ts
    bug-report-parser.ts
  helpers/
    regression-utils.ts
    incident-tracker.ts
  reports/
    regression-coverage.json
    defect-recurrence.json
  playwright.regression.config.ts
```

## Detailed Guide: Parsing Bug Reports

### Bug Report Structure

A well-structured bug report contains the information needed to write a regression test. Extract these elements systematically.

```typescript
interface BugReport {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'fixed' | 'verified' | 'closed';
  reportedDate: string;
  fixedDate?: string;
  reporter: string;
  assignee?: string;
  environment: {
    browser?: string;
    os?: string;
    viewport?: string;
    userRole?: string;
    featureFlags?: string[];
  };
  preconditions: string[];
  stepsToReproduce: string[];
  expectedBehavior: string;
  actualBehavior: string;
  rootCause?: string;
  fixDescription?: string;
  affectedComponents: string[];
  relatedBugs?: string[];
  screenshots?: string[];
  logs?: string[];
}

interface IncidentReport {
  id: string;
  title: string;
  severity: 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4';
  startTime: string;
  endTime: string;
  duration: string;
  impactDescription: string;
  affectedUsers: number;
  timeline: TimelineEntry[];
  rootCause: string;
  fixApplied: string;
  preventionMeasures: string[];
  lessonsLearned: string[];
}

interface TimelineEntry {
  time: string;
  event: string;
  action?: string;
  actor?: string;
}

interface RegressionTestSpec {
  bugId: string;
  testTitle: string;
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  preconditions: string[];
  steps: TestStep[];
  assertions: TestAssertion[];
  tags: string[];
  metadata: {
    rootCause: string;
    fixCommit?: string;
    relatedTests?: string[];
  };
}

interface TestStep {
  action: string;
  target?: string;
  value?: string;
  waitFor?: string;
}

interface TestAssertion {
  type: 'visible' | 'hidden' | 'text' | 'url' | 'count' | 'attribute' | 'api-response' | 'network';
  target?: string;
  expected: string | number | boolean;
  description: string;
}
```

### Parsing Bug Reports into Test Specifications

```typescript
function parseBugReport(report: BugReport): RegressionTestSpec {
  const category = categorizeDefect(report);
  const priority = mapSeverityToPriority(report.severity);
  const steps = convertStepsToTestSteps(report.stepsToReproduce);
  const assertions = deriveAssertions(report);

  return {
    bugId: report.id,
    testTitle: `[${report.id}] ${report.title}`,
    category,
    priority,
    preconditions: report.preconditions,
    steps,
    assertions,
    tags: [report.id, category, priority, ...report.affectedComponents],
    metadata: {
      rootCause: report.rootCause || 'Unknown',
      relatedTests: report.relatedBugs,
    },
  };
}

function categorizeDefect(report: BugReport): string {
  const title = report.title.toLowerCase();
  const components = report.affectedComponents.map((c) => c.toLowerCase());

  if (components.includes('auth') || title.includes('login') || title.includes('session')) {
    return 'auth';
  }
  if (components.includes('payment') || title.includes('checkout') || title.includes('cart')) {
    return 'checkout';
  }
  if (title.includes('data') || title.includes('duplicate') || title.includes('corrupt')) {
    return 'data-integrity';
  }
  if (title.includes('display') || title.includes('layout') || title.includes('render') || title.includes('css')) {
    return 'ui-rendering';
  }
  if (components.includes('api') || title.includes('endpoint') || title.includes('response')) {
    return 'api';
  }
  if (title.includes('performance') || title.includes('slow') || title.includes('timeout')) {
    return 'performance';
  }

  return 'general';
}

function mapSeverityToPriority(severity: BugReport['severity']): 'P0' | 'P1' | 'P2' | 'P3' {
  const mapping: Record<string, 'P0' | 'P1' | 'P2' | 'P3'> = {
    critical: 'P0',
    high: 'P1',
    medium: 'P2',
    low: 'P3',
  };
  return mapping[severity];
}

function convertStepsToTestSteps(steps: string[]): TestStep[] {
  return steps.map((step) => {
    const navigateMatch = step.match(/navigate to|go to|open|visit\s+(.+)/i);
    if (navigateMatch) {
      return { action: 'navigate', target: navigateMatch[1].trim() };
    }

    const clickMatch = step.match(/click\s+(?:on\s+)?(.+)/i);
    if (clickMatch) {
      return { action: 'click', target: clickMatch[1].trim() };
    }

    const typeMatch = step.match(/(?:enter|type|input|fill)\s+["'](.+?)["']\s+(?:in|into)\s+(.+)/i);
    if (typeMatch) {
      return { action: 'fill', target: typeMatch[2].trim(), value: typeMatch[1].trim() };
    }

    const waitMatch = step.match(/wait\s+(?:for\s+)?(.+)/i);
    if (waitMatch) {
      return { action: 'wait', waitFor: waitMatch[1].trim() };
    }

    const selectMatch = step.match(/select\s+["'](.+?)["']\s+(?:from|in)\s+(.+)/i);
    if (selectMatch) {
      return { action: 'select', target: selectMatch[2].trim(), value: selectMatch[1].trim() };
    }

    return { action: 'manual', target: step };
  });
}

function deriveAssertions(report: BugReport): TestAssertion[] {
  const assertions: TestAssertion[] = [];

  // The expected behavior should now be true (the bug is fixed)
  assertions.push({
    type: 'visible',
    expected: true,
    description: `Expected: ${report.expectedBehavior}`,
  });

  // The actual (buggy) behavior should no longer occur
  assertions.push({
    type: 'hidden',
    expected: true,
    description: `Should NOT exhibit: ${report.actualBehavior}`,
  });

  return assertions;
}
```

## Detailed Guide: Generating Playwright Regression Tests

### Test Generator Implementation

```typescript
function generatePlaywrightTest(spec: RegressionTestSpec): string {
  const tags = spec.tags.map((t) => `@${t}`).join(' ');

  let testCode = `import { test, expect } from '@playwright/test';

/**
 * Regression test for ${spec.bugId}
 *
 * Root cause: ${spec.metadata.rootCause}
 * Category: ${spec.category}
 * Priority: ${spec.priority}
 *
 * Original bug: ${spec.testTitle}
 */
test.describe('${spec.bugId}: ${spec.testTitle}', () => {
  test.describe.configure({ tag: [${spec.tags.map((t) => `'${t}'`).join(', ')}] });

`;

  // Generate precondition setup
  if (spec.preconditions.length > 0) {
    testCode += `  test.beforeEach(async ({ page }) => {\n`;
    for (const precondition of spec.preconditions) {
      testCode += `    // Precondition: ${precondition}\n`;
    }
    testCode += `  });\n\n`;
  }

  // Generate the main regression test
  testCode += `  test('should not exhibit the original defect', async ({ page }) => {\n`;

  for (const step of spec.steps) {
    testCode += generateStepCode(step);
  }

  testCode += `\n    // Assertions: verify the bug is fixed\n`;
  for (const assertion of spec.assertions) {
    testCode += generateAssertionCode(assertion);
  }

  testCode += `  });\n`;
  testCode += `});\n`;

  return testCode;
}

function generateStepCode(step: TestStep): string {
  switch (step.action) {
    case 'navigate':
      return `    await page.goto('${step.target}');\n`;
    case 'click':
      return `    await page.getByRole('button', { name: '${step.target}' }).click();\n`;
    case 'fill':
      return `    await page.getByLabel('${step.target}').fill('${step.value}');\n`;
    case 'wait':
      return `    await page.waitForSelector('${step.waitFor}');\n`;
    case 'select':
      return `    await page.getByLabel('${step.target}').selectOption('${step.value}');\n`;
    case 'manual':
      return `    // Manual step: ${step.target}\n    // TODO: Implement this step\n`;
    default:
      return `    // Unknown action: ${step.action}\n`;
  }
}

function generateAssertionCode(assertion: TestAssertion): string {
  switch (assertion.type) {
    case 'visible':
      return `    // ${assertion.description}\n    await expect(page.locator('[data-testid="success-indicator"]')).toBeVisible();\n`;
    case 'hidden':
      return `    // ${assertion.description}\n    await expect(page.locator('[data-testid="error-indicator"]')).toBeHidden();\n`;
    case 'text':
      return `    // ${assertion.description}\n    await expect(page.locator('body')).toContainText('${assertion.expected}');\n`;
    case 'url':
      return `    // ${assertion.description}\n    await expect(page).toHaveURL(${JSON.stringify(assertion.expected)});\n`;
    case 'count':
      return `    // ${assertion.description}\n    await expect(page.locator('[data-testid="item"]')).toHaveCount(${assertion.expected});\n`;
    default:
      return `    // ${assertion.description}\n    // TODO: Implement assertion\n`;
  }
}
```

### Real-World Regression Test Examples

#### Example 1: Duplicate Order Submission

```typescript
// tests/regression/data-integrity/BUG-3456-duplicate-order-submission.spec.ts
import { test, expect } from '@playwright/test';

/**
 * BUG-3456: Double-clicking the "Place Order" button creates duplicate orders
 *
 * Root cause: The submit button was not disabled after the first click,
 * and the API endpoint did not implement idempotency. Users who double-clicked
 * or experienced slow network responses would submit the same order twice.
 *
 * Fix: Added client-side button disabling on first click and server-side
 * idempotency key validation.
 *
 * Severity: Critical (financial impact - users were charged twice)
 */
test.describe('BUG-3456: Duplicate order submission prevention', () => {
  test.describe.configure({ tag: ['@BUG-3456', '@data-integrity', '@P0', '@checkout'] });

  test.beforeEach(async ({ page }) => {
    // Set up a user with items in cart ready for checkout
    await page.goto('/test-setup/checkout-ready');
    await page.waitForSelector('[data-testid="checkout-form"]');
  });

  test('should disable the submit button after first click', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: 'Place Order' });

    // Verify button starts enabled
    await expect(submitButton).toBeEnabled();

    // Click the submit button
    await submitButton.click();

    // Button should be immediately disabled to prevent double-click
    await expect(submitButton).toBeDisabled();
  });

  test('should not create duplicate orders on rapid double-click', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: 'Place Order' });

    // Intercept API calls to count order creation requests
    let orderCreationCount = 0;
    await page.route('**/api/orders', async (route) => {
      if (route.request().method() === 'POST') {
        orderCreationCount++;
      }
      await route.continue();
    });

    // Rapidly click the submit button twice
    await submitButton.dblclick();

    // Wait for the order confirmation page
    await page.waitForURL('**/order-confirmation/**');

    // Only one order should have been created
    expect(orderCreationCount).toBe(1);
  });

  test('should handle network retry without creating duplicates', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: 'Place Order' });
    let requestCount = 0;

    // Simulate a network failure on the first attempt, success on retry
    await page.route('**/api/orders', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.abort('connectionrefused');
      } else {
        await route.continue();
      }
    });

    await submitButton.click();

    // Wait for retry and eventual success
    await page.waitForURL('**/order-confirmation/**', { timeout: 15000 });

    // The confirmation page should show exactly one order
    const orderItems = page.locator('[data-testid="order-item"]');
    const count = await orderItems.count();
    expect(count).toBeGreaterThan(0);
  });
});
```

#### Example 2: Session Expiry Redirect Loop

```typescript
// tests/regression/auth/BUG-1567-session-expiry-redirect.spec.ts
import { test, expect } from '@playwright/test';

/**
 * BUG-1567: Session expiry causes infinite redirect loop
 *
 * Root cause: When the session expired, the server redirected to /login.
 * The /login page made an API call to check auth status, which returned 401,
 * which triggered another redirect to /login, creating an infinite loop.
 *
 * Fix: The /login page no longer makes the auth status check API call.
 * The auth middleware excludes /login and /register from redirect targets.
 *
 * Severity: Critical (users locked out of application)
 */
test.describe('BUG-1567: Session expiry redirect loop', () => {
  test.describe.configure({ tag: ['@BUG-1567', '@auth', '@P0'] });

  test('should redirect to login page exactly once when session expires', async ({ page }) => {
    // Track all navigation events
    const navigations: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigations.push(frame.url());
      }
    });

    // Start with an expired session by clearing auth cookies
    await page.goto('/dashboard');
    await page.context().clearCookies();

    // Trigger an action that requires authentication
    await page.reload();

    // Wait for the login page to load
    await page.waitForURL('**/login**', { timeout: 10000 });

    // Verify we are on the login page
    await expect(page.getByRole('heading', { name: /log in|sign in/i })).toBeVisible();

    // Count redirects to /login -- there should be exactly one
    const loginRedirects = navigations.filter((url) => url.includes('/login'));
    expect(loginRedirects.length).toBeLessThanOrEqual(2); // initial + one redirect

    // Verify the page is stable (not still redirecting)
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('should preserve the original URL as a redirect target after login', async ({ page }) => {
    // Navigate to a protected page
    await page.goto('/dashboard/settings');

    // Clear cookies to simulate session expiry
    await page.context().clearCookies();
    await page.reload();

    // Should redirect to login with a return URL
    await page.waitForURL('**/login**');
    const currentUrl = page.url();
    expect(currentUrl).toContain('redirect=');
    expect(currentUrl).toContain('dashboard');
  });
});
```

#### Example 3: Tax Calculation Rounding Error

```typescript
// tests/regression/checkout/BUG-2890-tax-calculation-rounding.spec.ts
import { test, expect } from '@playwright/test';

/**
 * BUG-2890: Tax calculation shows $0.01 discrepancy on certain totals
 *
 * Root cause: Tax was calculated per item and then summed, rather than
 * calculating tax on the subtotal. Floating point rounding on individual
 * items accumulated errors. For example, 3 items at $33.33 with 8% tax:
 * Per-item: round(33.33 * 0.08) * 3 = 2.67 * 3 = $8.01
 * On subtotal: round(99.99 * 0.08) = round(7.9992) = $8.00
 *
 * Fix: Tax is now calculated on the subtotal, then rounded once.
 *
 * Severity: Medium (cosmetic for small orders, significant for large orders)
 */
test.describe('BUG-2890: Tax calculation rounding', () => {
  test.describe.configure({ tag: ['@BUG-2890', '@checkout', '@P1'] });

  test('should calculate tax on subtotal, not per-item', async ({ page }) => {
    // Set up cart with items that trigger the rounding issue
    await page.goto('/test-setup/cart');

    // Add 3 items at $33.33 each
    await page.evaluate(async () => {
      await fetch('/api/test/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { productId: 'test-product-1', price: 33.33, quantity: 3 },
          ],
        }),
      });
    });

    // Navigate to checkout to see the tax calculation
    await page.goto('/checkout');
    await page.waitForSelector('[data-testid="order-summary"]');

    // Verify subtotal
    const subtotal = page.locator('[data-testid="subtotal"]');
    await expect(subtotal).toHaveText('$99.99');

    // Verify tax is calculated correctly on the subtotal
    // 99.99 * 0.08 = 7.9992 -> rounded to $8.00
    const tax = page.locator('[data-testid="tax"]');
    await expect(tax).toHaveText('$8.00');

    // Verify the total is consistent
    const total = page.locator('[data-testid="total"]');
    await expect(total).toHaveText('$107.99');
  });

  test('should maintain consistent rounding for various item counts', async ({ page }) => {
    const testCases = [
      { price: 33.33, quantity: 3, expectedSubtotal: '99.99', expectedTax: '8.00' },
      { price: 16.67, quantity: 6, expectedSubtotal: '100.02', expectedTax: '8.00' },
      { price: 9.99, quantity: 7, expectedSubtotal: '69.93', expectedTax: '5.59' },
      { price: 0.99, quantity: 100, expectedSubtotal: '99.00', expectedTax: '7.92' },
    ];

    for (const tc of testCases) {
      await page.evaluate(async (data) => {
        await fetch('/api/test/cart/clear', { method: 'POST' });
        await fetch('/api/test/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [{ productId: 'test-product', price: data.price, quantity: data.quantity }],
          }),
        });
      }, tc);

      await page.goto('/checkout');
      await page.waitForSelector('[data-testid="order-summary"]');

      const subtotal = await page.locator('[data-testid="subtotal"]').textContent();
      const tax = await page.locator('[data-testid="tax"]').textContent();

      expect(subtotal).toBe(`$${tc.expectedSubtotal}`);
      expect(tax).toBe(`$${tc.expectedTax}`);
    }
  });
});
```

#### Example 4: Unicode Name Truncation

```typescript
// tests/regression/data-integrity/BUG-3789-unicode-name-truncation.spec.ts
import { test, expect } from '@playwright/test';

/**
 * BUG-3789: User names with multi-byte Unicode characters are truncated incorrectly
 *
 * Root cause: The database column was VARCHAR(50) which counts bytes in some
 * encodings. A name with CJK characters or emoji uses 3-4 bytes per character,
 * so a 20-character name could exceed 50 bytes and be silently truncated.
 * The API validation checked string.length (which counts code units) but the
 * database enforced byte limits.
 *
 * Fix: Changed the column to NVARCHAR (character-based limit) and updated
 * API validation to check byte length in addition to character length.
 *
 * Severity: High (data loss for international users)
 */
test.describe('BUG-3789: Unicode name handling', () => {
  test.describe.configure({ tag: ['@BUG-3789', '@data-integrity', '@P1'] });

  const unicodeNames = [
    { name: 'Tanaka Taro', script: 'CJK Japanese' },
    { name: 'Kim Minjun', script: 'CJK Korean' },
    { name: 'Zhang Wei', script: 'CJK Chinese' },
    { name: 'Jose Garcia', script: 'Latin with diacritics' },
    { name: 'Ivan Petrov', script: 'Cyrillic' },
    { name: 'Ahmad Bin Said', script: 'Arabic transliteration' },
  ];

  for (const { name, script } of unicodeNames) {
    test(`should store and display ${script} names correctly`, async ({ page }) => {
      // Navigate to profile settings
      await page.goto('/settings/profile');
      await page.waitForSelector('[data-testid="profile-form"]');

      // Enter the Unicode name
      const nameInput = page.getByLabel('Display Name');
      await nameInput.clear();
      await nameInput.fill(name);

      // Save the profile
      await page.getByRole('button', { name: 'Save' }).click();

      // Wait for success confirmation
      await expect(page.getByText('Profile updated')).toBeVisible();

      // Reload the page to verify the name was persisted correctly
      await page.reload();
      await page.waitForSelector('[data-testid="profile-form"]');

      // The name should be exactly what was entered, not truncated
      const savedName = await page.getByLabel('Display Name').inputValue();
      expect(savedName).toBe(name);
      expect(savedName.length).toBe(name.length);
    });
  }
});
```

#### Example 5: API Pagination Off-by-One

```typescript
// tests/regression/api/BUG-5234-pagination-off-by-one.spec.ts
import { test, expect } from '@playwright/test';

/**
 * BUG-5234: API pagination returns duplicate items on page boundaries
 *
 * Root cause: The pagination query used OFFSET-based pagination with
 * `OFFSET = page * limit` instead of `OFFSET = (page - 1) * limit`.
 * This caused the first item of each page to be a duplicate of the
 * last item on the previous page. Page 1 returned items 1-10 correctly,
 * but page 2 returned items 10-19 instead of 11-20.
 *
 * Fix: Changed offset calculation to `(page - 1) * limit` and added
 * cursor-based pagination as the primary method.
 *
 * Severity: Medium (data display issues, confusing user experience)
 */
test.describe('BUG-5234: Pagination off-by-one', () => {
  test.describe.configure({ tag: ['@BUG-5234', '@api', '@P2'] });

  test('should not return duplicate items across pages', async ({ request }) => {
    // Fetch page 1
    const page1Response = await request.get('/api/products?page=1&limit=10');
    expect(page1Response.ok()).toBe(true);
    const page1Data = await page1Response.json();

    // Fetch page 2
    const page2Response = await request.get('/api/products?page=2&limit=10');
    expect(page2Response.ok()).toBe(true);
    const page2Data = await page2Response.json();

    // Extract IDs from both pages
    const page1Ids = page1Data.items.map((item: { id: string }) => item.id);
    const page2Ids = page2Data.items.map((item: { id: string }) => item.id);

    // Verify no overlap between pages
    const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);

    // Verify each page has the expected number of items
    expect(page1Data.items).toHaveLength(10);
    expect(page2Data.items).toHaveLength(10);
  });

  test('should return correct total count and page metadata', async ({ request }) => {
    const response = await request.get('/api/products?page=1&limit=10');
    const data = await response.json();

    expect(data.pagination).toBeDefined();
    expect(data.pagination.currentPage).toBe(1);
    expect(data.pagination.perPage).toBe(10);
    expect(data.pagination.totalPages).toBeGreaterThan(0);
    expect(data.pagination.totalItems).toBeGreaterThan(0);

    // Verify total pages calculation is correct
    const expectedPages = Math.ceil(data.pagination.totalItems / 10);
    expect(data.pagination.totalPages).toBe(expectedPages);
  });

  test('should handle last page with fewer items than page size', async ({ request }) => {
    // Get total count first
    const firstResponse = await request.get('/api/products?page=1&limit=10');
    const firstData = await firstResponse.json();
    const totalPages = firstData.pagination.totalPages;
    const totalItems = firstData.pagination.totalItems;

    // Fetch the last page
    const lastResponse = await request.get(`/api/products?page=${totalPages}&limit=10`);
    const lastData = await lastResponse.json();

    // Last page should have the remaining items
    const expectedLastPageItems = totalItems % 10 || 10;
    expect(lastData.items).toHaveLength(expectedLastPageItems);
  });

  test('should return empty array for pages beyond total', async ({ request }) => {
    const response = await request.get('/api/products?page=99999&limit=10');
    const data = await response.json();

    expect(data.items).toHaveLength(0);
    expect(response.ok()).toBe(true); // Should not error, just return empty
  });
});
```

## Detailed Guide: Incident Post-Mortem to Regression Tests

### Converting Incident Timelines to Test Scenarios

```typescript
function convertIncidentToTests(incident: IncidentReport): RegressionTestSpec[] {
  const tests: RegressionTestSpec[] = [];

  // Primary test: verify the root cause cannot recur
  tests.push({
    bugId: incident.id,
    testTitle: `[${incident.id}] Root cause prevention: ${incident.title}`,
    category: categorizeIncident(incident),
    priority: mapIncidentSeverity(incident.severity),
    preconditions: extractPreconditions(incident),
    steps: extractReproductionSteps(incident),
    assertions: deriveIncidentAssertions(incident),
    tags: [incident.id, 'incident', 'post-mortem'],
    metadata: {
      rootCause: incident.rootCause,
    },
  });

  // Additional tests: verify each prevention measure
  for (let i = 0; i < incident.preventionMeasures.length; i++) {
    const measure = incident.preventionMeasures[i];
    tests.push({
      bugId: `${incident.id}-PM${i + 1}`,
      testTitle: `[${incident.id}] Prevention measure ${i + 1}: ${measure}`,
      category: categorizeIncident(incident),
      priority: 'P1',
      preconditions: [],
      steps: [],
      assertions: [{
        type: 'visible',
        expected: true,
        description: `Verify: ${measure}`,
      }],
      tags: [incident.id, 'prevention-measure'],
      metadata: {
        rootCause: incident.rootCause,
      },
    });
  }

  return tests;
}

function categorizeIncident(incident: IncidentReport): string {
  const title = incident.title.toLowerCase();
  if (title.includes('outage') || title.includes('downtime')) return 'availability';
  if (title.includes('data loss') || title.includes('corruption')) return 'data-integrity';
  if (title.includes('security') || title.includes('breach')) return 'security';
  if (title.includes('performance') || title.includes('latency')) return 'performance';
  return 'general';
}

function mapIncidentSeverity(severity: IncidentReport['severity']): 'P0' | 'P1' | 'P2' | 'P3' {
  const mapping: Record<string, 'P0' | 'P1' | 'P2' | 'P3'> = {
    SEV1: 'P0',
    SEV2: 'P0',
    SEV3: 'P1',
    SEV4: 'P2',
  };
  return mapping[severity];
}

function extractPreconditions(incident: IncidentReport): string[] {
  const preconditions: string[] = [];
  const timeline = incident.timeline;

  if (timeline.length > 0) {
    const firstEvent = timeline[0];
    preconditions.push(`System in state described at ${firstEvent.time}: ${firstEvent.event}`);
  }

  return preconditions;
}

function extractReproductionSteps(incident: IncidentReport): TestStep[] {
  return incident.timeline
    .filter((entry) => entry.action)
    .map((entry) => ({
      action: 'manual',
      target: `${entry.event} (${entry.time})`,
    }));
}

function deriveIncidentAssertions(incident: IncidentReport): TestAssertion[] {
  return [
    {
      type: 'visible',
      expected: true,
      description: `System should not exhibit: ${incident.impactDescription}`,
    },
    {
      type: 'visible',
      expected: true,
      description: `Root cause should be addressed: ${incident.rootCause}`,
    },
  ];
}
```

## Configuration

### Playwright Configuration for Regression Tests

```typescript
// playwright.regression.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/regression',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { outputFolder: 'reports/regression-html' }],
    ['json', { outputFile: 'reports/regression-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'regression-critical',
      testMatch: '**/*.spec.ts',
      grep: /@P0/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression-high',
      testMatch: '**/*.spec.ts',
      grep: /@P1/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'regression-full',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### CI Integration

```yaml
# .github/workflows/regression-tests.yml
name: Regression Tests
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

jobs:
  regression-critical:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run P0 regression tests
        run: npx playwright test --config=playwright.regression.config.ts --project=regression-critical
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: regression-report-critical
          path: reports/

  regression-full:
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule' || github.event_name == 'push'
    needs: regression-critical
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Run full regression suite
        run: npx playwright test --config=playwright.regression.config.ts --project=regression-full
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: regression-report-full
          path: reports/
```

## Detailed Guide: Regression Coverage Tracking

### Tracking Defect-to-Test Mapping

```typescript
interface RegressionCoverage {
  totalBugsReported: number;
  totalBugsWithTests: number;
  coveragePercentage: number;
  uncoveredBugs: string[];
  testsByCategory: Record<string, number>;
  testsByPriority: Record<string, number>;
  recurrenceRate: number;
  lastUpdated: string;
}

function generateRegressionCoverageReport(
  allBugs: BugReport[],
  existingTests: string[]
): RegressionCoverage {
  const coveredBugIds = new Set<string>();
  for (const testFile of existingTests) {
    // Extract bug ID from filename (e.g., BUG-1234-description.spec.ts)
    const match = testFile.match(/(BUG-\d+|INC-\d+)/);
    if (match) {
      coveredBugIds.add(match[1]);
    }
  }

  const fixedBugs = allBugs.filter((b) => b.status === 'fixed' || b.status === 'closed');
  const uncoveredBugs = fixedBugs
    .filter((b) => !coveredBugIds.has(b.id))
    .map((b) => b.id);

  const testsByCategory: Record<string, number> = {};
  const testsByPriority: Record<string, number> = {};

  for (const bug of fixedBugs.filter((b) => coveredBugIds.has(b.id))) {
    const category = categorizeDefect(bug);
    testsByCategory[category] = (testsByCategory[category] || 0) + 1;

    const priority = mapSeverityToPriority(bug.severity);
    testsByPriority[priority] = (testsByPriority[priority] || 0) + 1;
  }

  // Calculate recurrence rate (bugs that were re-opened after being closed)
  const reopenedBugs = allBugs.filter((b) => b.relatedBugs && b.relatedBugs.length > 0);
  const recurrenceRate = fixedBugs.length > 0
    ? (reopenedBugs.length / fixedBugs.length) * 100
    : 0;

  return {
    totalBugsReported: fixedBugs.length,
    totalBugsWithTests: coveredBugIds.size,
    coveragePercentage: fixedBugs.length > 0
      ? (coveredBugIds.size / fixedBugs.length) * 100
      : 0,
    uncoveredBugs,
    testsByCategory,
    testsByPriority,
    recurrenceRate,
    lastUpdated: new Date().toISOString(),
  };
}
```

## Best Practices

1. **Write the regression test before closing the bug** -- The definition of "fixed" should include "regression test added." Do not close a bug ticket until its corresponding test is merged and passing.

2. **Name test files with the bug ID** -- Use the pattern `BUG-XXXX-short-description.spec.ts`. This makes it trivial to find the test for a specific bug and vice versa.

3. **Include the root cause in test comments** -- A comment explaining why the bug occurred helps future maintainers understand what the test is protecting against. When refactoring, this context prevents accidental removal.

4. **Test the exact reproduction steps** -- Do not simplify the reproduction steps. If the bug only manifests when you navigate to page A, then page B, then back to page A, the test must follow that exact sequence.

5. **Run critical regression tests on every deployment** -- P0 and P1 regression tests should run on every pull request and deployment. The full suite can run nightly.

6. **Group tests by defect category** -- Organize regression tests by the type of defect (auth, data-integrity, UI, API) rather than by sprint or date. This enables targeted execution when changes affect a specific area.

7. **Include negative assertions** -- The test should verify both that the correct behavior now occurs (positive) and that the buggy behavior no longer occurs (negative).

8. **Use network interception for timing-sensitive bugs** -- If the bug was caused by a race condition or network timing, use Playwright's route interception to deterministically reproduce the timing conditions.

9. **Track regression test coverage as a metric** -- Maintain a dashboard showing what percentage of closed bugs have corresponding regression tests. Aim for 100% coverage of P0 and P1 bugs.

10. **Link tests to incident post-mortems** -- When an incident post-mortem produces action items, one of those action items should always be "add regression test." Link the test to the post-mortem document.

11. **Review regression tests during bug triage** -- When a new bug is reported, check whether a similar regression test already exists. If it does and the bug still occurred, the test has a gap that needs to be fixed.

12. **Do not delete regression tests** -- Even if the code they test is refactored or the feature is redesigned, the underlying behavior they protect against may still be possible. Archive rather than delete.

## Anti-Patterns to Avoid

1. **Writing regression tests that test the fix, not the symptom** -- If the fix changed the order of database operations, do not test the order of database operations. Test that the user-visible symptom (duplicate orders, incorrect totals) no longer occurs.

2. **Skipping regression tests for "simple" bugs** -- Simple bugs are the most likely to recur because developers assume they are too obvious to need a test. Every fixed bug needs a test, regardless of perceived simplicity.

3. **Regression tests that depend on specific test data** -- If the test relies on a specific product being in the database, it will fail when the test data changes. Use setup/teardown to create the required data.

4. **Putting all regression tests in a single file** -- A monolithic regression test file is impossible to maintain. Organize by category and bug ID.

5. **Regression tests without the bug ID** -- If a regression test cannot be traced back to its originating bug report, it loses its context. Always include the bug ID in the test name and comments.

6. **Testing only in the browser that reported the bug** -- If a bug was reported in Chrome, also test in Firefox and Safari. The underlying cause may affect multiple browsers.

7. **Ignoring flaky regression tests** -- A regression test that passes intermittently provides false security. If a regression test is flaky, fix it immediately. It may be a sign that the bug fix is incomplete.

8. **Not running regression tests in the same environment as production** -- If the bug only occurred in production due to environment-specific configuration, the regression test must run in an environment that matches production.

9. **Writing overly broad regression tests** -- A test that verifies the entire checkout flow because one step had a bug is too broad. Test the specific step that failed, with the specific conditions that triggered the failure.

10. **Deleting regression tests when refactoring** -- If you are refactoring the code that a regression test covers, update the test to match the new implementation. Do not delete it. The behavior it protects against can still occur.

## Debugging Tips

1. **When a regression test fails after a code change**, check the diff. The change may have inadvertently reintroduced the original bug. Compare the current behavior with the bug report's "actual behavior" description.

2. **When you cannot reproduce the bug from the report**, ask the reporter for additional context: exact data values, browser version, network conditions, user permissions. Many bugs require specific state that is not captured in the initial report.

3. **When the regression test is flaky**, the bug may be timing-related. Use Playwright's `waitForSelector`, `waitForResponse`, or `waitForURL` instead of fixed timeouts. If the bug was a race condition, use network interception to control timing.

4. **When the same bug recurs despite having a regression test**, the test may not cover all the conditions that trigger the bug. Review the root cause analysis and add additional test scenarios for the uncovered trigger conditions.

5. **When regression tests are slow**, prioritize by severity. Run P0 tests on every commit, P1 tests on every PR, and the full suite nightly. Use Playwright's parallel execution to speed up the full suite.

6. **When the regression suite becomes too large**, do not reduce it. Instead, use tags and projects to run subsets. A large regression suite is a sign of a mature quality process, not a problem.

7. **When team members skip writing regression tests**, make it a part of the definition of done for bug fixes. Enforce it through code review checklists and CI gates.

8. **When the bug report lacks reproduction steps**, spend time reproducing the bug manually before writing the automated test. An automated test based on guessed reproduction steps will test the wrong thing.

9. **When multiple bugs have the same root cause**, write a single comprehensive regression test that covers the root cause, then add specific tests for each symptom. This provides both deep and wide coverage.

10. **When a regression test breaks during an unrelated change**, the test may have hidden dependencies on global state. Ensure each regression test sets up its own preconditions and does not rely on the state left by other tests.
