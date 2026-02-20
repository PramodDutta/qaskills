---
name: Race Condition Finder
description: Detect and diagnose race conditions in web applications through concurrent interaction testing, state mutation analysis, and timing-sensitive scenario reproduction.
version: 1.0.0
author: Pramod
license: MIT
tags: [race-condition, concurrency, async, timing, state-management, parallel, debugging]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Race Condition Finder Skill

You are an expert QA automation engineer specializing in detecting, diagnosing, and preventing race conditions in web applications. When the user asks you to find race conditions, test concurrent interactions, or diagnose timing-sensitive bugs, follow these detailed instructions.

## Core Principles

1. **Race conditions are deterministic in cause but non-deterministic in manifestation** -- A race condition exists because of a concrete code flaw (missing lock, unsynchronized state update, absent queue), but it manifests unpredictably. Your tests must make the non-deterministic deterministic by controlling timing and concurrency.

2. **Concurrency bugs hide behind success** -- Most test runs pass even when race conditions exist because the default execution order happens to be safe. You must deliberately create adversarial timing conditions to surface these bugs.

3. **State mutations are the root cause** -- Every race condition involves at least two operations competing to read or write shared state. Identify the shared state first, then construct tests that exercise concurrent access paths against it.

4. **Network latency is an amplifier, not the cause** -- Slow network responses do not create race conditions; they reveal race conditions that already exist in the application logic. Simulate variable latency to expose these hidden flaws.

5. **Reproduce before you fix** -- A race condition that cannot be reliably reproduced in a test will return after the fix. Invest in building a deterministic reproduction before suggesting code changes.

6. **Parallel user actions are the most common trigger** -- Double-clicks, rapid navigation, concurrent form submissions, and multiple tabs operating on the same resource represent the highest-risk scenarios in web applications.

7. **Test the boundaries between client and server state** -- The most dangerous race conditions occur where optimistic UI updates diverge from actual server state. Test that eventual consistency is actually achieved.

## Project Structure

Organize your race condition testing suite with this directory structure:

```
tests/
  race-conditions/
    double-submit.spec.ts
    rapid-navigation.spec.ts
    concurrent-api-calls.spec.ts
    optimistic-update-conflicts.spec.ts
    multi-tab-state.spec.ts
    stale-closure.spec.ts
  fixtures/
    race-condition.fixture.ts
  helpers/
    timing-controller.ts
    request-interceptor.ts
    state-snapshot.ts
    concurrency-utils.ts
  reports/
    race-condition-report.json
playwright.config.ts
```

## Timing Controller

The foundation of race condition testing is the ability to control when asynchronous operations resolve. Build a timing controller that intercepts network requests and holds them until you explicitly release them.

### Request Interception and Delayed Resolution

```typescript
import { Page, Route } from '@playwright/test';

interface PendingRequest {
  route: Route;
  url: string;
  method: string;
  timestamp: number;
  resolve: () => Promise<void>;
}

export class TimingController {
  private pendingRequests: Map<string, PendingRequest[]> = new Map();
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async interceptRoute(urlPattern: string | RegExp): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      const key = this.getRouteKey(route);
      const pending: PendingRequest = {
        route,
        url: route.request().url(),
        method: route.request().method(),
        timestamp: Date.now(),
        resolve: async () => {
          await route.continue();
        },
      };

      if (!this.pendingRequests.has(key)) {
        this.pendingRequests.set(key, []);
      }
      this.pendingRequests.get(key)!.push(pending);
    });
  }

  async holdAndRelease(
    urlPattern: string,
    action: () => Promise<void>,
    delayMs: number = 0
  ): Promise<void> {
    await this.interceptRoute(urlPattern);
    await action();

    if (delayMs > 0) {
      await this.page.waitForTimeout(delayMs);
    }

    await this.releaseAll(urlPattern);
  }

  async releaseAll(key?: string): Promise<void> {
    if (key) {
      const pending = this.pendingRequests.get(key) || [];
      for (const req of pending) {
        await req.resolve();
      }
      this.pendingRequests.delete(key);
    } else {
      for (const [, requests] of this.pendingRequests) {
        for (const req of requests) {
          await req.resolve();
        }
      }
      this.pendingRequests.clear();
    }
  }

  async releaseInOrder(key: string, indices: number[]): Promise<void> {
    const pending = this.pendingRequests.get(key) || [];
    for (const index of indices) {
      if (pending[index]) {
        await pending[index].resolve();
      }
    }
  }

  async releaseInReverseOrder(key: string): Promise<void> {
    const pending = this.pendingRequests.get(key) || [];
    for (let i = pending.length - 1; i >= 0; i--) {
      await pending[i].resolve();
    }
    this.pendingRequests.delete(key);
  }

  getPendingCount(key?: string): number {
    if (key) {
      return (this.pendingRequests.get(key) || []).length;
    }
    let total = 0;
    for (const [, requests] of this.pendingRequests) {
      total += requests.length;
    }
    return total;
  }

  private getRouteKey(route: Route): string {
    const url = new URL(route.request().url());
    return `${route.request().method()}:${url.pathname}`;
  }
}
```

### State Snapshot Utility

Capture application state at multiple points in time to detect inconsistencies caused by race conditions.

```typescript
import { Page } from '@playwright/test';

interface StateSnapshot {
  timestamp: number;
  label: string;
  domState: Record<string, string>;
  localStorageState: Record<string, string>;
  networkPending: number;
  consoleErrors: string[];
}

export class StateSnapshotManager {
  private snapshots: StateSnapshot[] = [];
  private consoleErrors: string[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push(msg.text());
      }
    });
  }

  async capture(label: string, selectors: Record<string, string>): Promise<StateSnapshot> {
    const domState: Record<string, string> = {};

    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const element = this.page.locator(selector);
        domState[key] = await element.textContent() || '';
      } catch {
        domState[key] = '__NOT_FOUND__';
      }
    }

    const localStorageState = await this.page.evaluate(() => {
      const state: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          state[key] = localStorage.getItem(key) || '';
        }
      }
      return state;
    });

    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      label,
      domState,
      localStorageState,
      networkPending: 0,
      consoleErrors: [...this.consoleErrors],
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  compareSnapshots(
    labelA: string,
    labelB: string
  ): Record<string, { before: string; after: string }> {
    const a = this.snapshots.find((s) => s.label === labelA);
    const b = this.snapshots.find((s) => s.label === labelB);
    if (!a || !b) throw new Error(`Snapshot not found: ${!a ? labelA : labelB}`);

    const diffs: Record<string, { before: string; after: string }> = {};
    const allKeys = new Set([...Object.keys(a.domState), ...Object.keys(b.domState)]);

    for (const key of allKeys) {
      if (a.domState[key] !== b.domState[key]) {
        diffs[key] = { before: a.domState[key] || '', after: b.domState[key] || '' };
      }
    }

    return diffs;
  }

  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  clear(): void {
    this.snapshots = [];
    this.consoleErrors = [];
  }
}
```

## Detailed Testing Guides

### 1. Double-Submit Prevention Testing

The most common race condition in web applications is the double-submit problem: a user clicks a submit button twice before the first request completes, creating duplicate records or inconsistent state.

```typescript
import { test, expect } from '@playwright/test';
import { TimingController } from '../helpers/timing-controller';

test.describe('Double Submit Prevention', () => {
  test('rapid double-click on submit button should not create duplicate entries', async ({
    page,
  }) => {
    const timing = new TimingController(page);
    await page.goto('/orders/new');
    await page.fill('#product-name', 'Test Product');
    await page.fill('#quantity', '1');

    let apiCallCount = 0;
    await page.route('**/api/orders', async (route) => {
      apiCallCount++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: `order-${apiCallCount}`, status: 'created' }),
      });
    });

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.dblclick();

    await page.waitForTimeout(3000);
    expect(apiCallCount).toBe(1);

    await expect(submitButton).toBeDisabled();
  });

  test('clicking submit during pending request should show loading state', async ({ page }) => {
    await page.goto('/orders/new');
    await page.fill('#product-name', 'Test Product');

    const requestPromises: (() => void)[] = [];
    await page.route('**/api/orders', async (route) => {
      await new Promise<void>((resolve) => {
        requestPromises.push(resolve);
      });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'order-1', status: 'created' }),
      });
    });

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    await expect(submitButton).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('.loading-spinner')).toBeVisible();

    await submitButton.click({ force: true });
    expect(requestPromises.length).toBe(1);

    requestPromises[0]();
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('form submission via Enter key during pending request should be ignored', async ({
    page,
  }) => {
    await page.goto('/orders/new');
    let apiCallCount = 0;

    await page.route('**/api/orders', async (route) => {
      apiCallCount++;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: `order-${apiCallCount}` }),
      });
    });

    await page.fill('#product-name', 'Test Product');
    await page.press('#product-name', 'Enter');
    await page.press('#product-name', 'Enter');
    await page.press('#product-name', 'Enter');

    await page.waitForTimeout(2000);
    expect(apiCallCount).toBe(1);
  });
});
```

### 2. Rapid Navigation Race Conditions

When users navigate quickly between pages, previous page data fetches may resolve after the new page has rendered, overwriting the current view with stale data.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Rapid Navigation Race Conditions', () => {
  test('fast navigation should display data for the final destination only', async ({ page }) => {
    const responses: { url: string; resolveTime: number }[] = [];

    await page.route('**/api/products/*', async (route) => {
      const url = route.request().url();
      const id = url.split('/').pop();
      const delay = id === '1' ? 3000 : id === '2' ? 2000 : 500;

      responses.push({ url, resolveTime: delay });

      await new Promise((resolve) => setTimeout(resolve, delay));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id, name: `Product ${id}` }),
      });
    });

    await page.goto('/products');
    await page.click('[data-product-id="1"]');
    await page.waitForTimeout(100);
    await page.click('[data-product-id="2"]');
    await page.waitForTimeout(100);
    await page.click('[data-product-id="3"]');

    await page.waitForTimeout(4000);
    await expect(page.locator('.product-name')).toHaveText('Product 3');
    await expect(page.locator('.product-name')).not.toHaveText('Product 1');
  });

  test('browser back button during pending fetch should abort previous request', async ({
    page,
  }) => {
    const abortedRequests: string[] = [];

    page.on('requestfailed', (request) => {
      if (request.failure()?.errorText?.includes('abort')) {
        abortedRequests.push(request.url());
      }
    });

    await page.goto('/products');
    await page.route('**/api/products/1', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: '1', name: 'Product 1' }),
      });
    });

    await page.click('[data-product-id="1"]');
    await page.waitForTimeout(500);
    await page.goBack();

    await page.waitForTimeout(1000);
    expect(abortedRequests.length).toBeGreaterThan(0);
  });

  test('stale closure in useEffect should not update unmounted component state', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('unmounted') || msg.text().includes('memory leak')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/products');
    await page.click('[data-product-id="1"]');
    await page.waitForTimeout(50);
    await page.goBack();
    await page.waitForTimeout(3000);

    expect(consoleErrors).toHaveLength(0);
  });
});
```

### 3. Concurrent API Call Conflicts

When multiple API calls modify the same server-side resource simultaneously, the application must handle conflicts gracefully.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Concurrent API Call Conflicts', () => {
  test('concurrent edits to the same resource should detect conflicts', async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await pageA.goto('/documents/doc-1/edit');
    await pageB.goto('/documents/doc-1/edit');

    await pageA.fill('.editor-content', 'Content from User A');
    await pageB.fill('.editor-content', 'Content from User B');

    await pageA.click('button.save');
    await pageA.waitForResponse('**/api/documents/doc-1');

    await pageB.click('button.save');

    const conflictDialog = pageB.locator('.conflict-dialog');
    await expect(conflictDialog).toBeVisible({ timeout: 5000 });

    await contextA.close();
    await contextB.close();
  });

  test('optimistic update should rollback on server rejection', async ({ page }) => {
    await page.goto('/tasks');

    await page.route('**/api/tasks/task-1/status', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Conflict',
          message: 'Task was modified by another user',
        }),
      });
    });

    const taskCheckbox = page.locator('[data-task-id="task-1"] input[type="checkbox"]');
    await expect(taskCheckbox).not.toBeChecked();
    await taskCheckbox.click();

    await expect(taskCheckbox).toBeChecked();

    await expect(taskCheckbox).not.toBeChecked({ timeout: 3000 });
    await expect(page.locator('.error-toast')).toContainText('modified by another user');
  });

  test('parallel API calls should maintain data consistency', async ({ page }) => {
    await page.goto('/dashboard');
    let callOrder: string[] = [];

    await page.route('**/api/dashboard/**', async (route) => {
      const endpoint = new URL(route.request().url()).pathname.split('/').pop();
      callOrder.push(`start:${endpoint}`);

      const delays: Record<string, number> = {
        stats: 2000,
        notifications: 500,
        activity: 1000,
      };
      const delay = delays[endpoint || ''] || 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
      callOrder.push(`end:${endpoint}`);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ endpoint, timestamp: Date.now() }),
      });
    });

    await page.reload();
    await page.waitForTimeout(3000);

    await expect(page.locator('.dashboard-stats')).toBeVisible();
    await expect(page.locator('.dashboard-notifications')).toBeVisible();
    await expect(page.locator('.dashboard-activity')).toBeVisible();
  });
});
```

### 4. Multi-Tab State Synchronization

Users frequently open applications in multiple browser tabs. State changes in one tab must not corrupt data in another.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Multi-Tab State Synchronization', () => {
  test('editing in one tab should reflect in another tab via storage events', async ({
    context,
  }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await pageA.goto('/settings');
    await pageB.goto('/settings');

    await pageA.fill('#display-name', 'Updated Name');
    await pageA.click('button.save');
    await pageA.waitForResponse('**/api/settings');

    await pageB.waitForTimeout(2000);
    const nameInTabB = await pageB.inputValue('#display-name');
    expect(nameInTabB).toBe('Updated Name');
  });

  test('logout in one tab should invalidate session in all tabs', async ({ context }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await pageA.goto('/dashboard');
    await pageB.goto('/dashboard');

    await pageA.click('button.logout');
    await pageA.waitForURL('**/login');

    await pageB.reload();
    await pageB.waitForURL('**/login');
  });

  test('concurrent cart modifications across tabs should not lose items', async ({ context }) => {
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    await pageA.goto('/shop');
    await pageB.goto('/shop');

    await pageA.click('[data-product="item-a"] .add-to-cart');
    await pageA.waitForResponse('**/api/cart');

    await pageB.click('[data-product="item-b"] .add-to-cart');
    await pageB.waitForResponse('**/api/cart');

    await pageA.goto('/cart');
    const cartItems = await pageA.locator('.cart-item').count();
    expect(cartItems).toBe(2);
  });
});
```

### 5. Debounce and Throttle Verification

Search inputs, auto-save features, and scroll handlers rely on debounce and throttle mechanisms. Verify they work correctly under rapid input.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Debounce and Throttle Verification', () => {
  test('search input should debounce API calls', async ({ page }) => {
    let apiCallCount = 0;
    await page.route('**/api/search**', async (route) => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    await page.goto('/search');
    const searchInput = page.locator('#search-input');

    await searchInput.pressSequentially('testing race conditions', { delay: 50 });
    await page.waitForTimeout(1000);

    expect(apiCallCount).toBeLessThanOrEqual(3);
  });

  test('auto-save should not trigger during active typing', async ({ page }) => {
    let saveCallCount = 0;
    await page.route('**/api/documents/*/autosave', async (route) => {
      saveCallCount++;
      await route.fulfill({ status: 200 });
    });

    await page.goto('/documents/doc-1/edit');
    const editor = page.locator('.editor-content');

    await editor.pressSequentially('This is a long paragraph being typed continuously', {
      delay: 30,
    });
    const callsDuringTyping = saveCallCount;

    await page.waitForTimeout(3000);
    const callsAfterPause = saveCallCount;

    expect(callsDuringTyping).toBe(0);
    expect(callsAfterPause).toBe(1);
  });
});
```

### 6. Concurrent Request Queue Testing

When the application uses a request queue to serialize mutations, test that the queue maintains ordering guarantees under load.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Concurrent Request Queue Testing', () => {
  test('queued mutations should execute in submission order', async ({ page }) => {
    const receivedOrder: string[] = [];

    await page.route('**/api/tasks/reorder', async (route) => {
      const body = JSON.parse(route.request().postData() || '{}');
      receivedOrder.push(body.taskId);
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/tasks');

    for (let i = 1; i <= 5; i++) {
      await page.evaluate((taskId) => {
        fetch('/api/tasks/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: `task-${taskId}` }),
        });
      }, i);
    }

    await page.waitForTimeout(3000);
    expect(receivedOrder).toEqual(['task-1', 'task-2', 'task-3', 'task-4', 'task-5']);
  });

  test('failed request in queue should not block subsequent requests', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/tasks/update', async (route) => {
      requestCount++;
      if (requestCount === 2) {
        await route.fulfill({ status: 500, body: 'Server Error' });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await page.goto('/tasks');

    for (let i = 0; i < 4; i++) {
      await page.click(`[data-task-id="task-${i}"] .update-button`);
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(5000);
    expect(requestCount).toBe(4);
  });
});
```

## Configuration

### Playwright Configuration for Race Condition Testing

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/race-conditions',
  timeout: 30000,
  retries: 3,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on-first-retry',
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'race-conditions-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'race-conditions-slow-network',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-features=NetworkService'],
        },
      },
    },
  ],
  reporter: [
    ['html', { outputFolder: 'reports/race-conditions' }],
    ['json', { outputFile: 'reports/race-condition-report.json' }],
  ],
});
```

### Network Throttling Configuration

```typescript
export const networkProfiles = {
  fast3G: {
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  },
  slow3G: {
    downloadThroughput: (500 * 1024) / 8,
    uploadThroughput: (500 * 1024) / 8,
    latency: 400,
  },
  flaky: {
    downloadThroughput: (100 * 1024) / 8,
    uploadThroughput: (100 * 1024) / 8,
    latency: 2000,
  },
};

export async function applyNetworkProfile(
  page: Page,
  profile: keyof typeof networkProfiles
): Promise<void> {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false,
    ...networkProfiles[profile],
  });
}
```

## Best Practices

1. **Always use single-worker mode for race condition tests.** Running race condition tests in parallel introduces external concurrency that makes failures unreproducible. Set `workers: 1` in your Playwright config for the race condition test project.

2. **Control time explicitly rather than using arbitrary waits.** Instead of `waitForTimeout(3000)`, intercept the specific network request and hold it. This makes tests both faster and more reliable because you are testing the exact timing condition rather than hoping a delay is long enough.

3. **Test with both fast and slow network profiles.** A race condition that only appears on slow 3G networks is still a bug. Run your race condition suite against multiple network throttling profiles to catch latency-sensitive issues.

4. **Capture request ordering in test assertions.** Log the order in which requests are sent and responses are received. Assert on this ordering to detect when responses arrive out of the expected sequence.

5. **Use AbortController patterns in application code.** When testing rapid navigation, verify that the application uses AbortController to cancel in-flight requests for pages the user has already navigated away from. Assert that aborted requests are logged or tracked.

6. **Test optimistic UI rollback paths.** When the application uses optimistic updates, always test the failure path: what happens when the server rejects the optimistic change? The UI must roll back cleanly to the previous state.

7. **Verify idempotency of mutation endpoints.** If the same POST request is sent twice due to a race condition, the server should handle it idempotently. Test that duplicate requests do not create duplicate records.

8. **Test localStorage and sessionStorage synchronization.** When multiple tabs share state through Web Storage, verify that storage event listeners correctly update the UI in all tabs without creating feedback loops.

9. **Assert on final state, not intermediate states.** Race condition tests should assert on the final consistent state of the application after all pending operations have resolved. Intermediate states may be legitimately inconsistent during processing.

10. **Run race condition tests multiple times to verify stability.** A single passing run does not prove the absence of a race condition. Configure your CI to run the race condition suite at least 5 times in sequence. If any run fails, the test should be considered failing.

11. **Use unique identifiers for each test invocation.** When testing double-submit or duplicate creation bugs, use unique test data for each run (timestamps, UUIDs) so that tests do not interfere with each other or with leftover data from previous runs.

12. **Document the exact race window being tested.** Each test should have a comment explaining the specific timing scenario: which operation starts first, what the overlap period is, and what the expected resolution behavior should be.

13. **Use `Promise.allSettled` instead of `Promise.all` for concurrent test operations.** When sending multiple concurrent requests in a test, `Promise.all` short-circuits on the first failure, hiding the behavior of the remaining requests. `Promise.allSettled` lets you observe all outcomes.

## Anti-Patterns to Avoid

1. **Using `page.waitForTimeout()` as the primary synchronization mechanism.** Fixed delays make tests slow and flaky. A 2-second wait might be enough on your machine but fail on CI. Use request interception and explicit resolution control instead.

2. **Testing race conditions with `Promise.all()` alone.** Firing two promises simultaneously does not guarantee they will interleave at the application level. You need request-level interception to control the exact timing of resolution.

3. **Assuming single-threaded JavaScript prevents race conditions.** JavaScript is single-threaded but asynchronous. Two `fetch()` calls can be in flight simultaneously, and their callbacks can interleave in any order. Microtask and macrotask scheduling means race conditions are real in browser code.

4. **Ignoring the test cleanup when requests are held.** If a test fails while holding intercepted requests, those routes remain intercepted. Always use `try/finally` blocks or Playwright fixtures to clean up held requests, even on test failure.

5. **Testing only the happy path of concurrent operations.** Do not just verify that concurrent operations succeed. Test what happens when one fails, when the server returns a conflict, and when the network drops mid-request.

6. **Relying on `disable` attribute alone for double-submit prevention.** A disabled button can be re-enabled by a framework re-render before the request completes. Test that the underlying submission logic also rejects duplicate calls, not just the UI state.

7. **Hardcoding response delays instead of using dynamic interception.** Hardcoded `setTimeout` values in mock responses create brittle tests that depend on specific timing. Use the TimingController pattern where you explicitly release held requests at the right moment.

8. **Not testing the "last write wins" conflict resolution.** Many applications silently apply "last write wins" without telling the user. Test that when two users edit the same resource, the second user is informed of the conflict rather than silently overwriting.

9. **Ignoring WebSocket reconnection race conditions.** When a WebSocket connection drops and reconnects, messages sent during the disconnection period may be lost or delivered out of order. Test the reconnection path for data consistency.

10. **Skipping multi-browser-context tests.** Race conditions between different users require separate browser contexts (not just separate pages). Use `browser.newContext()` to simulate truly independent sessions.

## Debugging Tips

1. **Enable Playwright trace recording for all race condition tests.** The trace viewer shows the exact timeline of network requests, DOM changes, and console output. When a race condition test fails, the trace reveals which request resolved first and how the UI reacted.

2. **Add timestamp logging to your application code temporarily.** When diagnosing a race condition, add `console.log(Date.now(), 'operation-name')` to the suspect code paths. The Playwright console listener will capture these logs, and you can reconstruct the exact sequence of events.

3. **Use the Network tab in Playwright trace to identify out-of-order responses.** Look for cases where a later request resolves before an earlier one. The trace viewer displays request start and end times on a timeline, making overlapping requests visually obvious.

4. **Compare state snapshots before and after the race window.** Use the StateSnapshotManager to capture DOM state immediately before the concurrent operations begin and after they all resolve. The diff reveals which elements changed unexpectedly.

5. **Check for "state update on unmounted component" warnings.** React applications will warn when a state update is attempted on an unmounted component. This warning is a strong signal of a stale closure or unclean effect teardown that constitutes a race condition.

6. **Reproduce on CI before local debugging.** Race conditions often manifest differently on CI (where resources are constrained) versus local development (where everything is fast). If a race condition is reported from CI, try to reproduce it with network throttling locally before adding breakpoints.

7. **Use `page.on('requestfinished')` to build a request timeline.** Register a listener that logs every completed request with its duration and status code. Compare this timeline against the expected sequence to find where the race occurs.

8. **Isolate the race window with binary search timing.** If a race condition occurs intermittently, use binary search on the delay between concurrent operations. Start with a large delay (guaranteed no race) and halve it until the race appears. This identifies the exact timing threshold.

9. **Monitor the Redux or Zustand store during concurrent operations.** If the application uses a state management library, subscribe to store changes and log every state transition during the test. Out-of-order state updates will be visible in the log.

10. **Test with CPU throttling enabled.** Playwright supports CDP-based CPU throttling. Slowing the CPU makes JavaScript execution take longer, widening the race window and making intermittent race conditions more reproducible.

```typescript
async function enableCpuThrottling(page: Page, rate: number = 4): Promise<void> {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Emulation.setCPUThrottlingRate', { rate });
}
```

By following this skill, you will systematically uncover race conditions that manual testing and standard automated tests routinely miss. The key insight is that race conditions are not random -- they are caused by specific code patterns that fail under specific timing conditions. By controlling those timing conditions in your tests, you transform non-deterministic bugs into deterministic, reproducible, and fixable test failures.
