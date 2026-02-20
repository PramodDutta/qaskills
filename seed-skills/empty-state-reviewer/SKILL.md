---
name: Empty State Reviewer
description: Audit empty states across web applications ensuring proper messaging, helpful CTAs, illustration rendering, and graceful handling when data is unavailable
version: 1.0.0
author: Pramod
license: MIT
tags: [empty-states, zero-data, placeholder, cta, onboarding, data-loading, null-state, no-results]
testingTypes: [e2e]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Empty State Reviewer Skill

You are an expert QA engineer specializing in empty state testing across web applications. When the user asks you to audit, write, or review empty state tests, follow these detailed instructions to ensure every screen handles the absence of data with proper messaging, helpful calls to action, appropriate illustrations, and graceful degradation.

## Core Principles

1. **Every data-dependent view has an empty state** -- Any screen that displays dynamic data must have a designed empty state. If data can be absent, the empty experience must be intentional, not accidental.
2. **Empty is not broken** -- Users must clearly distinguish between "no data yet" and "something went wrong." Empty states and error states require different messaging, different visuals, and different recovery paths.
3. **CTAs guide the next action** -- An empty state without a call to action is a dead end. Every empty screen must offer at least one clear path forward, whether that is creating content, adjusting filters, or navigating elsewhere.
4. **First-time experience sets the tone** -- New users encounter empty states on every screen during onboarding. These first impressions shape whether users activate or abandon the product. Treat first-use empty states as a distinct design surface.
5. **Illustrations and icons must render** -- Empty state illustrations are often SVGs or images loaded from CDNs. Broken images in empty states compound the feeling of emptiness. Verify that every visual asset loads correctly.
6. **Permission-based emptiness needs explanation** -- When content exists but the user lacks permission to see it, the empty state must communicate the restriction without revealing sensitive details. "No items" and "You don't have access" are fundamentally different messages.
7. **Empty states must be responsive** -- Empty state layouts should look correct on all viewport sizes. A centered illustration that works on desktop may overflow or become invisible on mobile.

## Project Structure

```
tests/
  empty-states/
    fresh-account/
      dashboard-empty.spec.ts
      profile-empty.spec.ts
      notifications-empty.spec.ts
      settings-defaults.spec.ts
    filtered-empty/
      search-no-results.spec.ts
      filter-no-match.spec.ts
      date-range-empty.spec.ts
    deleted-all/
      last-item-deleted.spec.ts
      bulk-delete-empty.spec.ts
    error-states/
      network-error.spec.ts
      server-error.spec.ts
      timeout-state.spec.ts
    permission-restricted/
      unauthorized-view.spec.ts
      role-limited-empty.spec.ts
    component-types/
      list-empty.spec.ts
      table-empty.spec.ts
      grid-empty.spec.ts
      card-collection-empty.spec.ts
      chart-no-data.spec.ts
    cta-verification/
      cta-functionality.spec.ts
      cta-navigation.spec.ts
    visual/
      illustration-rendering.spec.ts
      responsive-empty-states.spec.ts
    fixtures/
      empty-state-inventory.ts
      test-accounts.ts
    utils/
      empty-state-helpers.ts
      data-cleanup.ts
playwright.config.ts
```

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/empty-states',
  fullyParallel: true,
  retries: 1,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'empty-state-results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
```

```typescript
// tests/empty-states/fixtures/empty-state-inventory.ts

/**
 * A comprehensive inventory of all screens that can display empty states.
 * Maintaining this inventory ensures complete coverage and prevents
 * new screens from shipping without designed empty states.
 */
export interface EmptyStateScenario {
  name: string;
  route: string;
  trigger: 'fresh-account' | 'filtered' | 'deleted-all' | 'error' | 'permission';
  expectedElements: {
    heading: string | RegExp;
    description?: string | RegExp;
    illustration?: boolean;
    ctaText?: string;
    ctaRoute?: string;
  };
}

export const emptyStateInventory: EmptyStateScenario[] = [
  {
    name: 'Dashboard - No projects',
    route: '/dashboard',
    trigger: 'fresh-account',
    expectedElements: {
      heading: /no projects yet/i,
      description: /create your first project/i,
      illustration: true,
      ctaText: 'Create Project',
      ctaRoute: '/projects/new',
    },
  },
  {
    name: 'Notifications - No notifications',
    route: '/notifications',
    trigger: 'fresh-account',
    expectedElements: {
      heading: /no notifications/i,
      description: /you're all caught up/i,
      illustration: true,
    },
  },
  {
    name: 'Search - No results',
    route: '/search?q=xyznonexistent',
    trigger: 'filtered',
    expectedElements: {
      heading: /no results found/i,
      description: /try a different search/i,
      ctaText: 'Clear Search',
    },
  },
  {
    name: 'Team Members - No access',
    route: '/team',
    trigger: 'permission',
    expectedElements: {
      heading: /access restricted/i,
      description: /contact your administrator/i,
    },
  },
];

export const freshAccountRoutes = [
  '/dashboard',
  '/projects',
  '/notifications',
  '/activity',
  '/favorites',
  '/recent',
  '/teams',
  '/reports',
];
```

```typescript
// tests/empty-states/utils/data-cleanup.ts
import { Page } from '@playwright/test';

/**
 * Utility functions for creating empty state conditions.
 * These helpers ensure tests start from a known empty state.
 */
export async function deleteAllItems(page: Page, listSelector: string): Promise<void> {
  const items = await page.locator(listSelector).all();

  for (const item of items) {
    await item.getByTestId('item-menu').click();
    await page.getByTestId('delete-option').click();
    await page.getByTestId('confirm-delete').click();
    await page.waitForTimeout(300);
  }
}

export async function clearAllFilters(page: Page): Promise<void> {
  const clearButton = page.getByTestId('clear-all-filters');
  if (await clearButton.isVisible()) {
    await clearButton.click();
    await page.waitForLoadState('networkidle');
  }
}

export async function setupFreshAccount(page: Page, apiBaseUrl: string): Promise<void> {
  // Use API to create a fresh test account with no data
  const response = await page.request.post(`${apiBaseUrl}/api/test/create-empty-account`, {
    data: {
      email: `empty-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    },
  });

  const { token } = await response.json();
  await page.evaluate((t) => {
    localStorage.setItem('auth-token', t);
  }, token);
}
```

## How-To Guides

### Auditing Fresh Account Empty States

The most important empty state scenario is the fresh account experience. Every screen a new user visits should have a designed empty state that guides them toward activation.

```typescript
// tests/empty-states/fresh-account/dashboard-empty.spec.ts
import { test, expect } from '@playwright/test';
import { freshAccountRoutes } from '../fixtures/empty-state-inventory';

test.describe('Fresh Account Empty States', () => {
  test.use({
    storageState: 'tests/fixtures/fresh-account-state.json',
  });

  for (const route of freshAccountRoutes) {
    test(`${route} has a designed empty state`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // The page must not show a loading spinner indefinitely
      const spinner = page.getByTestId('loading-spinner');
      if (await spinner.isVisible()) {
        await expect(spinner).not.toBeVisible({ timeout: 5000 });
      }

      // The page must have either content or an empty state
      const hasContent = await page.getByTestId('content-list').isVisible().catch(() => false);
      const hasEmptyState = await page.getByTestId('empty-state').isVisible().catch(() => false);

      expect(
        hasContent || hasEmptyState,
        `${route} shows neither content nor empty state`
      ).toBe(true);

      if (hasEmptyState) {
        // Verify essential empty state elements
        const heading = page.getByTestId('empty-state-heading');
        await expect(heading).toBeVisible();
        const headingText = await heading.textContent();
        expect(headingText?.trim().length).toBeGreaterThan(0);

        // Description should provide context
        const description = page.getByTestId('empty-state-description');
        await expect(description).toBeVisible();
        const descText = await description.textContent();
        expect(descText?.trim().length).toBeGreaterThan(10);
      }
    });
  }

  test('dashboard empty state has create project CTA', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="empty-state"]');

    const cta = page.getByTestId('empty-state-cta');
    await expect(cta).toBeVisible();
    await expect(cta).toBeEnabled();

    const ctaText = await cta.textContent();
    expect(ctaText?.toLowerCase()).toContain('create');

    // CTA should navigate to the creation flow
    await cta.click();
    await expect(page).toHaveURL(/\/(projects\/new|create)/);
  });

  test('notification empty state does not show CTA', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForSelector('[data-testid="empty-state"]');

    // Notifications cannot be "created" so there should be no primary CTA
    const heading = page.getByTestId('empty-state-heading');
    await expect(heading).toContainText(/no notifications|all caught up/i);

    // But there may be a secondary link to notification settings
    const settingsLink = page.getByTestId('notification-settings-link');
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/settings.*notification/i);
    }
  });
});
```

### Testing Filtered-to-Empty Results

Users often apply filters that narrow results to zero. The application must clearly communicate that the empty state is due to filter criteria, not missing data.

```typescript
// tests/empty-states/filtered-empty/filter-no-match.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Filtered Empty States', () => {
  test('filter combination yielding zero results shows filter-specific empty state', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForSelector('[data-testid="content-list"]');

    // Store the unfiltered count
    const unfilteredCount = await page.getByTestId('item-count').textContent();
    expect(parseInt(unfilteredCount || '0', 10)).toBeGreaterThan(0);

    // Apply a filter that yields no results
    await page.getByTestId('filter-status').selectOption('archived');
    await page.getByTestId('filter-tag').selectOption('nonexistent-tag');
    await page.waitForLoadState('networkidle');

    // Must show a filter-specific empty state, not the fresh-account empty state
    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();

    const heading = page.getByTestId('empty-state-heading');
    const headingText = await heading.textContent();

    // Should mention filters, not onboarding
    expect(headingText?.toLowerCase()).toMatch(
      /no (matching|results)|nothing matches|no items match/i
    );

    // Must offer a "Clear Filters" action
    const clearButton = page.getByTestId('clear-filters-cta');
    await expect(clearButton).toBeVisible();

    // Clearing filters should restore results
    await clearButton.click();
    await page.waitForSelector('[data-testid="content-list"]');
    const restoredCount = await page.getByTestId('item-count').textContent();
    expect(parseInt(restoredCount || '0', 10)).toBeGreaterThan(0);
  });

  test('date range with no data shows appropriate message', async ({ page }) => {
    await page.goto('/activity');
    await page.waitForSelector('[data-testid="content-list"], [data-testid="empty-state"]');

    // Set date range far in the future
    await page.getByTestId('date-from').fill('2099-01-01');
    await page.getByTestId('date-to').fill('2099-12-31');
    await page.getByTestId('apply-date-filter').click();
    await page.waitForLoadState('networkidle');

    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();

    const description = page.getByTestId('empty-state-description');
    await expect(description).toContainText(/no activity.*date range|try a different.*period/i);
  });

  test('search within a section shows section-specific empty state', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForSelector('[data-testid="content-list"]');

    // Search for something that does not exist within this section
    const searchInput = page.getByTestId('section-search');
    await searchInput.fill('xyznonexistentproject');
    await page.waitForLoadState('networkidle');

    const emptyState = page.getByTestId('empty-state');
    await expect(emptyState).toBeVisible();

    // The empty state should reference the search query
    const description = page.getByTestId('empty-state-description');
    const text = await description.textContent();
    expect(text).toContain('xyznonexistentproject');
  });
});
```

### Testing the Deleted-All-Items State

When a user deletes the last item in a collection, the application must transition smoothly from the content view to the empty state.

```typescript
// tests/empty-states/deleted-all/last-item-deleted.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Deleted All Items Empty State', () => {
  test('deleting the last item transitions to empty state', async ({ page }) => {
    // Setup: ensure exactly one item exists
    await page.goto('/api/test/setup-single-item');
    await page.goto('/projects');
    await page.waitForSelector('[data-testid="content-list"]');

    // Verify one item is present
    const items = await page.getByTestId('project-item').all();
    expect(items.length).toBe(1);

    // Delete the item
    await items[0].getByTestId('item-menu').click();
    await page.getByTestId('delete-option').click();

    // Confirm deletion
    const confirmDialog = page.getByTestId('confirm-dialog');
    await expect(confirmDialog).toBeVisible();
    await page.getByTestId('confirm-delete').click();

    // Should transition to empty state
    await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 5000 });

    // The empty state should be the "create first" variant, not the filtered variant
    const heading = page.getByTestId('empty-state-heading');
    await expect(heading).toContainText(/no projects|get started|create/i);

    // CTA should be available
    const cta = page.getByTestId('empty-state-cta');
    await expect(cta).toBeVisible();
  });

  test('bulk delete of all items shows empty state', async ({ page }) => {
    // Setup: ensure multiple items exist
    await page.goto('/api/test/setup-multiple-items?count=5');
    await page.goto('/projects');
    await page.waitForSelector('[data-testid="content-list"]');

    // Select all items
    await page.getByTestId('select-all-checkbox').check();

    // Bulk delete
    await page.getByTestId('bulk-delete').click();
    await page.getByTestId('confirm-delete').click();

    // Should show empty state after all items are deleted
    await expect(page.getByTestId('empty-state')).toBeVisible({ timeout: 10000 });

    // Undo option should be available briefly
    const undoToast = page.getByTestId('undo-toast');
    if (await undoToast.isVisible()) {
      await expect(undoToast).toContainText(/undo|restore/i);
    }
  });

  test('empty state after deletion differs from error state', async ({ page }) => {
    await page.goto('/api/test/setup-single-item');
    await page.goto('/projects');
    await page.waitForSelector('[data-testid="content-list"]');

    // Delete the item
    await page.getByTestId('project-item').first().getByTestId('item-menu').click();
    await page.getByTestId('delete-option').click();
    await page.getByTestId('confirm-delete').click();

    await expect(page.getByTestId('empty-state')).toBeVisible();

    // Must not show error indicators
    const errorIcon = page.getByTestId('error-icon');
    await expect(errorIcon).not.toBeVisible();

    // Must not show "try again" or "retry" messaging
    const emptyText = await page.getByTestId('empty-state').textContent();
    expect(emptyText?.toLowerCase()).not.toContain('error');
    expect(emptyText?.toLowerCase()).not.toContain('retry');
    expect(emptyText?.toLowerCase()).not.toContain('went wrong');
  });
});
```

### Testing Error-Caused Empty States

Network failures, server errors, and timeouts can produce empty screens. These must be clearly differentiated from intentional empty states.

```typescript
// tests/empty-states/error-states/network-error.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Error-Caused Empty States', () => {
  test('network error shows error state, not empty state', async ({ page }) => {
    // Block the API endpoint
    await page.route('**/api/projects**', (route) => route.abort('failed'));

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Should show an error state, not a "no items" empty state
    const errorState = page.getByTestId('error-state');
    await expect(errorState).toBeVisible();

    // Must clearly communicate the error
    const errorMessage = page.getByTestId('error-message');
    await expect(errorMessage).toContainText(
      /unable to load|connection error|something went wrong/i
    );

    // Must offer a retry action
    const retryButton = page.getByTestId('retry-button');
    await expect(retryButton).toBeVisible();
  });

  test('retry button recovers from network error', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api/projects**', async (route) => {
      requestCount++;
      if (requestCount <= 1) {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // First load fails
    await expect(page.getByTestId('error-state')).toBeVisible();

    // Retry should succeed
    await page.getByTestId('retry-button').click();
    await page.waitForSelector(
      '[data-testid="content-list"], [data-testid="empty-state"]'
    );

    // Error state should be gone
    await expect(page.getByTestId('error-state')).not.toBeVisible();
  });

  test('server 500 error shows error state with support info', async ({ page }) => {
    await page.route('**/api/projects**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const errorState = page.getByTestId('error-state');
    await expect(errorState).toBeVisible();

    // Error state should offer support contact or reference ID
    const errorContent = await errorState.textContent();
    expect(errorContent?.toLowerCase()).toMatch(
      /support|help|contact|reference|error id/i
    );
  });

  test('timeout shows appropriate loading timeout message', async ({ page }) => {
    await page.route('**/api/projects**', async (route) => {
      // Simulate a timeout by never responding
      await new Promise(() => {}); // Never resolves
    });

    await page.goto('/projects');

    // The loading spinner should eventually transition to a timeout message
    const spinner = page.getByTestId('loading-spinner');
    if (await spinner.isVisible()) {
      // Wait for the application's timeout threshold
      await page.waitForSelector('[data-testid="timeout-state"], [data-testid="error-state"]', {
        timeout: 30000,
      });
    }

    // Must show timeout-specific messaging
    const timeoutState = page.getByTestId('timeout-state').or(page.getByTestId('error-state'));
    await expect(timeoutState).toBeVisible();
  });
});
```

### Testing Illustration and Icon Rendering

Empty state illustrations are critical visual elements. Broken images make empty states feel even more broken.

```typescript
// tests/empty-states/visual/illustration-rendering.spec.ts
import { test, expect } from '@playwright/test';
import { emptyStateInventory } from '../fixtures/empty-state-inventory';

test.describe('Empty State Illustration Rendering', () => {
  const scenariosWithIllustrations = emptyStateInventory.filter(
    (s) => s.expectedElements.illustration
  );

  for (const scenario of scenariosWithIllustrations) {
    test(`illustration renders on ${scenario.name}`, async ({ page }) => {
      // Navigate to the empty state
      await page.goto(scenario.route);
      await page.waitForSelector('[data-testid="empty-state"]');

      // Check for illustration element (could be SVG, img, or div with background)
      const illustration = page.getByTestId('empty-state-illustration');
      await expect(illustration).toBeVisible();

      // If it is an img tag, verify it loaded successfully
      const tagName = await illustration.evaluate((el) => el.tagName.toLowerCase());

      if (tagName === 'img') {
        const isLoaded = await illustration.evaluate((el: HTMLImageElement) => {
          return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
        });
        expect(isLoaded, `Illustration image failed to load on ${scenario.name}`).toBe(true);
      }

      if (tagName === 'svg') {
        // SVG should have a viewBox and visible paths
        const hasViewBox = await illustration.evaluate(
          (el) => el.hasAttribute('viewBox')
        );
        expect(hasViewBox).toBe(true);

        const pathCount = await illustration.locator('path, circle, rect').count();
        expect(pathCount).toBeGreaterThan(0);
      }

      // Illustration should have alt text for accessibility
      const altText = await illustration.getAttribute('alt');
      const ariaLabel = await illustration.getAttribute('aria-label');
      const role = await illustration.getAttribute('role');

      if (role !== 'presentation' && role !== 'none') {
        expect(
          altText || ariaLabel,
          `Illustration on ${scenario.name} missing accessible text`
        ).toBeTruthy();
      }
    });
  }

  test('illustrations do not overflow container on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    for (const scenario of scenariosWithIllustrations.slice(0, 5)) {
      await page.goto(scenario.route);
      await page.waitForSelector('[data-testid="empty-state"]');

      const illustration = page.getByTestId('empty-state-illustration');
      if (await illustration.isVisible()) {
        const box = await illustration.boundingBox();
        if (box) {
          expect(box.width).toBeLessThanOrEqual(375);
          expect(box.x).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
```

### Testing Permission-Restricted Empty States

When content exists but the user cannot see it due to permissions, the messaging must be distinct from "no data" scenarios.

```typescript
// tests/empty-states/permission-restricted/unauthorized-view.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Permission-Restricted Empty States', () => {
  test.use({
    storageState: 'tests/fixtures/viewer-role-state.json',
  });

  test('restricted page shows permission message, not empty state', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');

    // Should NOT show the generic empty state
    const genericEmpty = page.getByTestId('empty-state');
    await expect(genericEmpty).not.toBeVisible();

    // Should show a permission-specific message
    const restricted = page.getByTestId('restricted-state');
    await expect(restricted).toBeVisible();

    const message = await restricted.textContent();
    expect(message?.toLowerCase()).toMatch(
      /permission|access|restricted|authorized|role/i
    );
  });

  test('restricted state does not reveal hidden content details', async ({ page }) => {
    await page.goto('/team/secret-project');
    await page.waitForLoadState('networkidle');

    const pageContent = await page.textContent('body');

    // Should not reveal names, counts, or details of restricted items
    expect(pageContent).not.toMatch(/\d+ items? hidden/i);
    expect(pageContent).not.toContain('secret-project');
  });

  test('restricted state offers upgrade or contact path', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    const restricted = page.getByTestId('restricted-state');
    if (await restricted.isVisible()) {
      // Should offer a way to request access or upgrade
      const actionLink = restricted.getByRole('link').or(restricted.getByRole('button'));
      await expect(actionLink).toBeVisible();

      const actionText = await actionLink.textContent();
      expect(actionText?.toLowerCase()).toMatch(
        /contact|request|upgrade|admin|support/i
      );
    }
  });
});
```

### Testing Component-Level Empty States (Lists, Tables, Grids, Charts)

Different UI components have different empty state patterns. A table shows "No rows," a chart shows "No data to display," and a grid shows placeholder cards or centered messaging.

```typescript
// tests/empty-states/component-types/table-empty.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Table Empty States', () => {
  test('empty table shows message row, not blank table', async ({ page }) => {
    await page.goto('/api/test/clear-table-data');
    await page.goto('/reports/table-view');
    await page.waitForLoadState('networkidle');

    const table = page.getByRole('table');

    if (await table.isVisible()) {
      // Table headers should still be visible
      const headers = await table.getByRole('columnheader').all();
      expect(headers.length).toBeGreaterThan(0);

      // An empty message row or overlay must be present
      const emptyRow = page.getByTestId('table-empty-row');
      const emptyOverlay = page.getByTestId('table-empty-overlay');

      const hasEmptyIndicator =
        (await emptyRow.isVisible().catch(() => false)) ||
        (await emptyOverlay.isVisible().catch(() => false));

      expect(hasEmptyIndicator).toBe(true);
    } else {
      // Alternative: table is replaced entirely with empty state
      await expect(page.getByTestId('empty-state')).toBeVisible();
    }
  });

  test('empty table does not show pagination controls', async ({ page }) => {
    await page.goto('/api/test/clear-table-data');
    await page.goto('/reports/table-view');
    await page.waitForLoadState('networkidle');

    const pagination = page.getByTestId('pagination');
    await expect(pagination).not.toBeVisible();

    const rowCount = page.getByTestId('row-count');
    if (await rowCount.isVisible()) {
      const text = await rowCount.textContent();
      expect(text).toMatch(/0|no/i);
    }
  });
});

// tests/empty-states/component-types/chart-no-data.spec.ts
import { test as chartTest, expect as chartExpect } from '@playwright/test';

chartTest.describe('Chart Empty States', () => {
  chartTest('chart with no data shows placeholder, not broken chart', async ({ page }) => {
    await page.goto('/api/test/clear-analytics-data');
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const chart = page.getByTestId('analytics-chart');

    if (await chart.isVisible()) {
      // Chart should show a "No data" overlay, not an empty axes frame
      const noDataOverlay = chart.getByTestId('chart-no-data');
      await chartExpect(noDataOverlay).toBeVisible();
      await chartExpect(noDataOverlay).toContainText(/no data|not enough data/i);
    }
  });
});
```

### Comprehensive Empty State Audit Script

This utility runs a systematic audit of all known empty state scenarios and generates a coverage report.

```typescript
// tests/empty-states/utils/empty-state-helpers.ts
import { Page, expect } from '@playwright/test';
import { EmptyStateScenario } from '../fixtures/empty-state-inventory';

export async function auditEmptyState(
  page: Page,
  scenario: EmptyStateScenario
): Promise<AuditResult> {
  const result: AuditResult = {
    scenario: scenario.name,
    route: scenario.route,
    passed: true,
    issues: [],
  };

  await page.goto(scenario.route);
  await page.waitForLoadState('networkidle');

  // Check heading
  const heading = page.getByTestId('empty-state-heading');
  if (!(await heading.isVisible().catch(() => false))) {
    result.issues.push('Missing empty state heading');
    result.passed = false;
  } else if (scenario.expectedElements.heading) {
    const text = await heading.textContent();
    if (typeof scenario.expectedElements.heading === 'string') {
      if (!text?.includes(scenario.expectedElements.heading)) {
        result.issues.push(
          `Heading mismatch: expected "${scenario.expectedElements.heading}", got "${text}"`
        );
        result.passed = false;
      }
    }
  }

  // Check description
  if (scenario.expectedElements.description) {
    const desc = page.getByTestId('empty-state-description');
    if (!(await desc.isVisible().catch(() => false))) {
      result.issues.push('Missing empty state description');
      result.passed = false;
    }
  }

  // Check illustration
  if (scenario.expectedElements.illustration) {
    const illustration = page.getByTestId('empty-state-illustration');
    if (!(await illustration.isVisible().catch(() => false))) {
      result.issues.push('Missing empty state illustration');
      result.passed = false;
    }
  }

  // Check CTA
  if (scenario.expectedElements.ctaText) {
    const cta = page.getByTestId('empty-state-cta');
    if (!(await cta.isVisible().catch(() => false))) {
      result.issues.push(`Missing CTA button: "${scenario.expectedElements.ctaText}"`);
      result.passed = false;
    } else {
      const ctaText = await cta.textContent();
      if (!ctaText?.includes(scenario.expectedElements.ctaText)) {
        result.issues.push(
          `CTA text mismatch: expected "${scenario.expectedElements.ctaText}", got "${ctaText}"`
        );
        result.passed = false;
      }
    }
  }

  return result;
}

export interface AuditResult {
  scenario: string;
  route: string;
  passed: boolean;
  issues: string[];
}
```

## Best Practices

1. **Maintain an empty state inventory** -- Keep a central list of every screen and component that can display an empty state. Review this inventory during feature planning to ensure new screens include designed empty states from the start.

2. **Differentiate empty state types visually** -- Use distinct visual treatments for "no data yet" (welcoming, onboarding-focused), "filtered to empty" (actionable, clear-filters focused), "error" (apologetic, retry-focused), and "restricted" (informational, upgrade-focused).

3. **Test with real fresh accounts** -- Do not simulate empty states by hiding data. Create actual fresh accounts with no data. This catches edge cases like default items, system-generated content, or tutorial data that may appear on "empty" screens.

4. **Verify CTAs actually work** -- It is not enough to check that a CTA button exists. Click it and verify it navigates to the correct destination and that the target page loads properly.

5. **Test the transition, not just the state** -- Deleting the last item in a list must smoothly transition from the content view to the empty state without flashing, layout shifts, or intermediate broken states.

6. **Use visual regression for empty states** -- Empty states are design-sensitive surfaces. Use screenshot comparison to catch unintended changes to illustrations, layout, spacing, and typography.

7. **Test empty states on every viewport** -- Empty state layouts (especially those with large illustrations) can break on small viewports. Test on mobile, tablet, and desktop sizes.

8. **Verify loading states precede empty states** -- When data takes time to load, a loading indicator must appear before the empty state. Showing an empty state and then replacing it with content creates a jarring flash.

9. **Empty state messaging should be specific** -- "No items" is less helpful than "No projects yet. Create your first project to get started." Generic messaging provides no guidance.

10. **Test empty states with screen readers** -- Empty states must be announced by screen readers. The heading, description, and CTA should be navigable with keyboard-only interaction and have appropriate ARIA roles.

11. **Ensure empty states are not cached** -- If a user creates their first item and then navigates back, they should see the new item, not a cached empty state. Verify that empty states do not persist after data is created.

12. **Test concurrent empty-to-content transitions** -- In real-time applications (WebSocket updates), another user might add data while you are viewing an empty state. The empty state should transition to the content view without requiring a page refresh.

## Anti-Patterns to Avoid

1. **Using the same empty state for all scenarios** -- A "No data" message that appears identically on the dashboard, search results, and error pages fails to communicate context. Each trigger type (fresh, filtered, error, permission) deserves a distinct message.

2. **Hiding the empty state behind infinite spinners** -- If the API returns an empty array, show the empty state immediately. Do not spin a loading indicator indefinitely waiting for data that will never arrive.

3. **Showing raw technical errors as empty states** -- A JSON error response, a stack trace, or a "null" on the page is not an empty state. Catch all error conditions and present them with user-friendly messaging.

4. **Placing CTAs that lead nowhere** -- A "Create Project" button that is disabled, returns a 404, or requires permissions the user does not have is worse than no CTA at all. Verify every CTA leads to a functional destination.

5. **Forgetting to test empty states on mobile** -- Large illustrations that look centered on desktop can overflow or push content off-screen on mobile. Always test empty states at mobile viewport sizes.

6. **Testing only the happy-path empty state** -- Most teams test the fresh-account empty state but forget filtered-empty, deleted-all, error-caused, and permission-restricted variants. Test all five trigger types for every data-dependent screen.

7. **Not testing the reverse transition** -- After seeing an empty state and creating data, navigating back to the list should show the new data. If it still shows the empty state due to caching, that is a bug.

## Debugging Tips

- **Empty state not appearing**: Check the API response. If the endpoint returns `null` instead of an empty array `[]`, the component may not recognize it as empty. Verify that the empty check handles both `null`, `undefined`, and `[]`.

- **Wrong empty state type showing**: If the filtered-empty state appears when it should be the fresh-account state, check whether filter parameters persist in the URL or session storage. Clear all filters before evaluating the base empty state.

- **Illustrations failing to load**: Check the browser Network tab for 404 errors on SVG or image assets. CDN caching or path changes during deployment often break illustration URLs. Use local fallback SVGs as a safety net.

- **Flash of empty state before content loads**: This occurs when the component renders before the API response arrives. The fix is either to show a loading state until data is confirmed, or to use server-side rendering to avoid the intermediate empty render.

- **CTA button disabled unexpectedly**: Check whether the CTA depends on permissions or feature flags that differ between test environments. Log the permission state in the test to identify which guard is preventing the CTA from being interactive.

- **Layout shift when transitioning from empty to content**: If the empty state and content view have different heights, the transition causes visible layout shift. Use CSS `min-height` to ensure the container maintains a consistent size during transitions.

- **Screen reader not announcing empty state**: Ensure the empty state container has `role="status"` or is wrapped in an `aria-live="polite"` region so that screen readers announce it when it appears dynamically.

- **Empty state tests flaky in CI**: If tests pass locally but fail in CI, check whether test data cleanup between runs is incomplete. Use API calls to explicitly clear data before each test rather than relying on database rollbacks.
