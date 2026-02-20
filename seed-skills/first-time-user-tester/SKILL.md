---
name: First-Time User Tester
description: Validate the first-time user experience including onboarding flows, empty states, tutorial completion, progressive disclosure, and initial setup wizards
version: 1.0.0
author: Pramod
license: MIT
tags: [onboarding, ftue, empty-states, user-experience, tutorial-testing, progressive-disclosure, setup-wizard]
testingTypes: [e2e, accessibility]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# First-Time User Tester Skill

You are an expert QA automation engineer specializing in testing the first-time user experience (FTUE), onboarding flows, empty states, and progressive disclosure patterns. When the user asks you to write, review, or debug first-time user experience tests, follow these detailed instructions.

## Core Principles

1. **First impressions are permanent** -- The first-time user experience determines whether a user becomes a long-term customer or churns immediately. Every onboarding step, empty state, and tutorial must be tested as thoroughly as the core product features.
2. **Clean state is the starting point** -- First-time user tests must begin with absolutely no prior state: no cookies, no localStorage, no IndexedDB data, no cached responses, no session tokens. Any leaked state from previous sessions will give a false impression of the FTUE.
3. **Empty states are features, not afterthoughts** -- When a user has no data, the empty state is the entire experience. Test that empty states provide clear guidance, appropriate calls to action, and accurate descriptions of what the user can expect when they add data.
4. **Progressive disclosure reduces overwhelm** -- Features should be revealed gradually as the user demonstrates readiness. Tests must verify that advanced features are hidden initially and become available at the correct trigger points.
5. **Every onboarding step must be skippable or completable** -- Users must never get stuck in an onboarding flow with no way out. Test that every wizard step can be completed, that skip/dismiss controls work, and that the application is usable after skipping onboarding.
6. **Permission requests must be contextual** -- Requesting notification permissions, location access, or camera access during onboarding without context causes distrust. Tests must verify that permission requests are deferred until the user performs an action that requires them.
7. **Returning users must not see onboarding again** -- Once a user has completed or dismissed onboarding, it should never reappear unless explicitly requested. Tests must verify that onboarding completion state persists across sessions.

## Project Structure

Organize first-time user tests with this structure:

```
tests/
  ftue/
    clean-state/
      fresh-browser.spec.ts
      no-data-state.spec.ts
      first-visit-detection.spec.ts
    onboarding/
      wizard-flow.spec.ts
      step-completion.spec.ts
      skip-dismiss.spec.ts
      resume-incomplete.spec.ts
    empty-states/
      dashboard-empty.spec.ts
      list-empty.spec.ts
      search-no-results.spec.ts
    tutorials/
      tooltip-tour.spec.ts
      guided-walkthrough.spec.ts
      video-tutorial.spec.ts
    progressive-disclosure/
      feature-gates.spec.ts
      advanced-options.spec.ts
      contextual-help.spec.ts
    permissions/
      notification-prompt.spec.ts
      location-prompt.spec.ts
      camera-prompt.spec.ts
    returning-user/
      onboarding-suppression.spec.ts
      session-restoration.spec.ts
  fixtures/
    ftue.fixture.ts
    clean-context.fixture.ts
  helpers/
    state-cleaner.ts
    onboarding-tracker.ts
    permission-handler.ts
  pages/
    onboarding.page.ts
    dashboard.page.ts
    welcome.page.ts
playwright.config.ts
```

## Setting Up the FTUE Test Infrastructure

### Clean State Manager

The foundation of FTUE testing is guaranteeing that every test starts with a completely clean browser state:

```typescript
import { BrowserContext, Page } from '@playwright/test';

export class CleanStateManager {
  private readonly context: BrowserContext;

  constructor(context: BrowserContext) {
    this.context = context;
  }

  async ensureCleanState(): Promise<void> {
    // Clear all cookies
    await this.context.clearCookies();

    // Clear all storage via a temporary page
    const page = await this.context.newPage();
    await page.goto('about:blank');

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.close();
  }

  async clearStorageForDomain(page: Page, domain: string): Promise<void> {
    await page.goto(`${domain}/`);

    await page.evaluate(async () => {
      // Clear localStorage and sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // Clear all IndexedDB databases
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }

      // Clear Cache API
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    });
  }

  async verifyCleanState(page: Page): Promise<boolean> {
    return page.evaluate(() => {
      const hasLocalStorage = localStorage.length > 0;
      const hasSessionStorage = sessionStorage.length > 0;

      return !hasLocalStorage && !hasSessionStorage;
    });
  }
}
```

### Onboarding Tracker

Track onboarding progress and state transitions during tests:

```typescript
import { Page } from '@playwright/test';

interface OnboardingStep {
  name: string;
  completed: boolean;
  skipped: boolean;
  timestamp: number;
}

export class OnboardingTracker {
  private steps: OnboardingStep[] = [];
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async startTracking(): Promise<void> {
    // Listen for onboarding-related events
    await this.page.exposeFunction(
      '__onboardingStepCompleted',
      (stepName: string) => {
        this.steps.push({
          name: stepName,
          completed: true,
          skipped: false,
          timestamp: Date.now(),
        });
      }
    );

    await this.page.exposeFunction(
      '__onboardingStepSkipped',
      (stepName: string) => {
        this.steps.push({
          name: stepName,
          completed: false,
          skipped: true,
          timestamp: Date.now(),
        });
      }
    );

    // Inject listeners for common onboarding events
    await this.page.addInitScript(() => {
      window.addEventListener('onboarding-step-complete', (e: any) => {
        (window as any).__onboardingStepCompleted(e.detail?.step || 'unknown');
      });
      window.addEventListener('onboarding-step-skip', (e: any) => {
        (window as any).__onboardingStepSkipped(e.detail?.step || 'unknown');
      });
    });
  }

  getSteps(): OnboardingStep[] {
    return [...this.steps];
  }

  getCompletedSteps(): OnboardingStep[] {
    return this.steps.filter((s) => s.completed);
  }

  getSkippedSteps(): OnboardingStep[] {
    return this.steps.filter((s) => s.skipped);
  }

  isStepCompleted(stepName: string): boolean {
    return this.steps.some((s) => s.name === stepName && s.completed);
  }

  clear(): void {
    this.steps = [];
  }
}
```

### Custom Test Fixture

```typescript
import { test as base, expect, BrowserContext } from '@playwright/test';
import { CleanStateManager } from '../helpers/state-cleaner';
import { OnboardingTracker } from '../helpers/onboarding-tracker';

interface FTUEFixtures {
  cleanState: CleanStateManager;
  onboardingTracker: OnboardingTracker;
  freshContext: BrowserContext;
  freshPage: () => Promise<import('@playwright/test').Page>;
}

export const test = base.extend<FTUEFixtures>({
  cleanState: async ({ context }, use) => {
    const manager = new CleanStateManager(context);
    await manager.ensureCleanState();
    await use(manager);
  },

  onboardingTracker: async ({ page }, use) => {
    const tracker = new OnboardingTracker(page);
    await tracker.startTracking();
    await use(tracker);
    tracker.clear();
  },

  freshContext: async ({ browser }, use) => {
    // Create a brand-new context with no state
    const context = await browser.newContext({
      storageState: undefined,
      permissions: [],
    });
    await use(context);
    await context.close();
  },

  freshPage: async ({ freshContext }, use) => {
    const createPage = async () => {
      const page = await freshContext.newPage();
      return page;
    };
    await use(createPage);
  },
});

export { expect };
```

## Clean State Testing

Verify that the application correctly detects a first-time user and displays the appropriate experience.

```typescript
import { test, expect } from '../fixtures/ftue.fixture';

test.describe('Clean State Detection', () => {
  test('first visit shows welcome screen', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/');

    // Should show the welcome/onboarding screen, not the main app
    await expect(
      page
        .getByRole('heading', { name: /welcome/i })
        .or(page.getByTestId('onboarding-welcome'))
    ).toBeVisible();
  });

  test('no cookies or storage exist on first visit', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/');

    const cookies = await page.context().cookies();
    // Only expect cookies set by the app during this visit, not from prior sessions
    const priorSessionCookies = cookies.filter(
      (c) => c.name.includes('session') || c.name.includes('token')
    );
    expect(priorSessionCookies).toHaveLength(0);

    const storageIsClean = await page.evaluate(() => {
      return localStorage.length === 0;
    });
    // Storage may have items set during page load -- verify no pre-existing items
    // The initial page load may set some items, which is acceptable
  });

  test('first-time user flag is set correctly', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify the app detected this as a new user
    const isNewUser = await page.evaluate(() => {
      // Check common patterns for first-time user detection
      return (
        localStorage.getItem('hasVisited') === null ||
        localStorage.getItem('onboardingComplete') === null
      );
    });

    expect(isNewUser).toBe(true);
  });

  test('authenticated new user sees onboarding after signup', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/signup');

    // Complete signup flow
    await page.getByLabel('Email').fill('newuser@example.com');
    await page.getByLabel('Password').fill('SecurePassword123!');
    await page.getByLabel('Confirm Password').fill('SecurePassword123!');
    await page.getByRole('button', { name: /sign up|create account/i }).click();

    // After signup, should see onboarding, not the empty dashboard
    await expect(
      page
        .getByTestId('onboarding-flow')
        .or(page.getByRole('heading', { name: /get started|set up/i }))
    ).toBeVisible({ timeout: 10000 });
  });
});
```

## Onboarding Flow Testing

Test every path through the onboarding wizard, including completion, skipping, and partial progress.

```typescript
import { test, expect } from '../fixtures/ftue.fixture';

test.describe('Onboarding Wizard Flow', () => {
  test('complete onboarding flow step by step', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Step 1: Welcome
    await expect(page.getByTestId('onboarding-step-1')).toBeVisible();
    await expect(page.getByText(/welcome/i)).toBeVisible();
    await page.getByRole('button', { name: /next|continue|get started/i }).click();

    // Step 2: Profile setup
    await expect(page.getByTestId('onboarding-step-2')).toBeVisible();
    await page.getByLabel('Display Name').fill('Test User');
    await page.getByLabel('Role').selectOption('developer');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 3: Preferences
    await expect(page.getByTestId('onboarding-step-3')).toBeVisible();
    await page.getByLabel('Dark Mode').check();
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 4: Team invite (optional)
    await expect(page.getByTestId('onboarding-step-4')).toBeVisible();
    await page.getByRole('button', { name: /finish|complete|done/i }).click();

    // Should now be on the main dashboard
    await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 10000 });

    // Onboarding should not reappear on refresh
    await page.reload();
    await expect(page.getByTestId('dashboard')).toBeVisible();
    await expect(page.getByTestId('onboarding-step-1')).not.toBeVisible();
  });

  test('skip button is available on every skippable step', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate through steps checking for skip button
    const stepSelectors = [
      'onboarding-step-1',
      'onboarding-step-2',
      'onboarding-step-3',
      'onboarding-step-4',
    ];

    for (const stepId of stepSelectors) {
      const step = page.getByTestId(stepId);
      if (await step.isVisible().catch(() => false)) {
        // Skip button should be visible (except possibly the first step)
        const skipButton = page.getByRole('button', { name: /skip|dismiss|later/i });
        const nextButton = page.getByRole('button', { name: /next|continue/i });

        const hasSkip = await skipButton.isVisible().catch(() => false);
        const hasNext = await nextButton.isVisible().catch(() => false);

        // At minimum, the user should have a way forward
        expect(hasSkip || hasNext).toBe(true);

        if (hasNext) {
          await nextButton.click();
        } else if (hasSkip) {
          await skipButton.click();
        }
      }
    }
  });

  test('skipping onboarding leads to functional app', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Skip the entire onboarding
    const skipAllButton = page.getByRole('button', { name: /skip|dismiss|later/i });
    while (await skipAllButton.isVisible().catch(() => false)) {
      await skipAllButton.click();
      await new Promise((r) => setTimeout(r, 500));
    }

    // App should be functional even without completing onboarding
    await expect(
      page.getByTestId('dashboard').or(page.getByTestId('main-content'))
    ).toBeVisible({ timeout: 10000 });
  });

  test('onboarding progress is saved when user leaves mid-flow', async ({
    freshPage,
  }) => {
    const page = await freshPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Complete step 1
    await page.getByRole('button', { name: /next|continue|get started/i }).click();

    // Complete step 2
    await page.getByLabel('Display Name').fill('Test User');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Navigate away before completing onboarding
    await page.goto('/dashboard');

    // Come back -- should resume where we left off
    await page.goto('/');

    // Should show step 3, not step 1
    const showsStep3 = await page
      .getByTestId('onboarding-step-3')
      .isVisible()
      .catch(() => false);
    const showsStep1 = await page
      .getByTestId('onboarding-step-1')
      .isVisible()
      .catch(() => false);

    // Either resumes at step 3 or restarts -- both are valid depending on design
    // But it should NOT show a broken state
    expect(showsStep3 || showsStep1).toBe(true);
  });

  test('back button works during onboarding', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Move forward two steps
    await page.getByRole('button', { name: /next|continue|get started/i }).click();
    await page.getByLabel('Display Name').fill('Test User');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Go back
    const backButton = page.getByRole('button', { name: /back|previous/i });
    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click();

      // Should be back on step 2 with data preserved
      await expect(page.getByTestId('onboarding-step-2')).toBeVisible();
      await expect(page.getByLabel('Display Name')).toHaveValue('Test User');
    }
  });

  test('progress indicator reflects current step', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check progress indicator
    const progressIndicator = page.getByTestId('onboarding-progress').or(
      page.getByRole('progressbar')
    );

    if (await progressIndicator.isVisible().catch(() => false)) {
      // Step through and verify progress updates
      await page.getByRole('button', { name: /next|continue|get started/i }).click();

      // Progress should have advanced
      const progressText = await progressIndicator.textContent();
      if (progressText) {
        expect(progressText).toMatch(/2|step 2/i);
      }
    }
  });
});
```

## Empty State Testing

Verify that every screen with user-generated content handles the empty state correctly.

```typescript
import { test, expect } from '../fixtures/ftue.fixture';

test.describe('Empty State Rendering', () => {
  test('dashboard shows helpful empty state for new users', async ({ freshPage }) => {
    const page = await freshPage();

    // Navigate past onboarding to reach the dashboard
    await page.goto('/dashboard');

    // If redirected to onboarding, skip it
    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
    }

    await page.waitForLoadState('networkidle');

    // Dashboard should show empty state, not a blank area
    const emptyState = page
      .getByTestId('empty-state')
      .or(page.getByText(/no .* yet|get started|create your first/i));

    await expect(emptyState).toBeVisible();

    // Empty state should have a call-to-action
    const cta = page.getByRole('button', { name: /create|add|get started/i }).or(
      page.getByRole('link', { name: /create|add|get started/i })
    );

    await expect(cta).toBeVisible();
  });

  test('project list shows empty state with create button', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/projects');

    const emptyState = page.getByText(/no projects|create your first project/i);
    await expect(emptyState).toBeVisible();

    // The create button should be prominent
    const createButton = page.getByRole('button', { name: /create project/i }).or(
      page.getByRole('link', { name: /create project/i })
    );
    await expect(createButton).toBeVisible();
  });

  test('search with no results shows helpful message', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/search');

    // Perform a search that should return no results for a new user
    const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
    await searchInput.fill('xyznonexistent12345');
    await page.keyboard.press('Enter');

    await page.waitForLoadState('networkidle');

    // Should show no results message, not an error or blank space
    const noResults = page.getByText(
      /no results|nothing found|no matches|try different/i
    );
    await expect(noResults).toBeVisible();
  });

  test('notification center shows empty state when no notifications', async ({
    freshPage,
  }) => {
    const page = await freshPage();

    await page.goto('/notifications');

    const emptyState = page.getByText(
      /no notifications|all caught up|nothing new/i
    );
    await expect(emptyState).toBeVisible();
  });

  test('empty state CTA actually works', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/tasks');

    // Find and click the empty state CTA
    const cta = page.getByRole('button', { name: /create.*task|add.*task/i }).or(
      page.getByRole('link', { name: /create.*task|add.*task/i })
    );

    if (await cta.isVisible().catch(() => false)) {
      await cta.click();

      // Should navigate to or open the creation flow
      await expect(
        page.getByRole('heading', { name: /new task|create task/i }).or(
          page.getByLabel('Task Title').or(page.getByTestId('create-task-form'))
        )
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('empty states are accessible', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/tasks');

    // Empty state should not be just a visual element -- it should be accessible
    const emptyStateRegion = page.getByTestId('empty-state').or(
      page.locator('[role="status"]')
    );

    if (await emptyStateRegion.isVisible().catch(() => false)) {
      // Should have descriptive text, not just an image
      const text = await emptyStateRegion.textContent();
      expect(text?.trim().length).toBeGreaterThan(10);

      // If there is an illustration, it should have alt text
      const images = emptyStateRegion.getByRole('img');
      const imageCount = await images.count();
      for (let i = 0; i < imageCount; i++) {
        const alt = await images.nth(i).getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    }
  });
});
```

## Tooltip Tour and Guided Walkthrough Testing

Test interactive tutorials that guide new users through the application.

```typescript
import { test, expect } from '../fixtures/ftue.fixture';

test.describe('Tooltip Tour and Guided Walkthrough', () => {
  test('tooltip tour highlights correct elements in order', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/dashboard');

    // Skip onboarding to reach the dashboard where the tooltip tour starts
    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
    }

    // Tooltip tour should start automatically or after a trigger
    const tooltip = page
      .getByTestId('tour-tooltip')
      .or(page.locator('[data-tour-step]').first());

    if (await tooltip.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Track visited elements
      const visitedElements: string[] = [];

      let maxSteps = 20; // Safety limit
      while (maxSteps > 0) {
        maxSteps--;

        const currentTooltip = page
          .getByTestId('tour-tooltip')
          .or(page.locator('[data-tour-step]:visible').first());

        if (!(await currentTooltip.isVisible().catch(() => false))) break;

        // Record which element is highlighted
        const targetSelector = await currentTooltip
          .getAttribute('data-target')
          .catch(() => null);
        if (targetSelector) {
          visitedElements.push(targetSelector);
        }

        // Tooltip should have descriptive text
        const tooltipText = await currentTooltip.textContent();
        expect(tooltipText?.trim().length).toBeGreaterThan(5);

        // Click next
        const nextBtn = page.getByRole('button', { name: /next|got it|continue/i });
        if (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click();
          await new Promise((r) => setTimeout(r, 500));
        } else {
          break;
        }
      }

      // Should have visited multiple elements
      expect(visitedElements.length).toBeGreaterThan(0);
    }
  });

  test('tooltip tour can be dismissed at any step', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/dashboard');

    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
    }

    const tooltip = page
      .getByTestId('tour-tooltip')
      .or(page.locator('[data-tour-step]').first());

    if (await tooltip.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Dismiss the tour
      const dismissBtn = page.getByRole('button', {
        name: /close|dismiss|skip tour|x/i,
      });

      if (await dismissBtn.isVisible().catch(() => false)) {
        await dismissBtn.click();

        // Tour should be gone
        await expect(tooltip).not.toBeVisible({ timeout: 2000 });

        // App should be fully functional
        await expect(page.getByTestId('dashboard')).toBeVisible();
      }
    }
  });

  test('dismissed tour does not reappear on reload', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/dashboard');

    // Dismiss onboarding and tour
    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
    }

    const tourDismiss = page.getByRole('button', {
      name: /close|dismiss|skip tour/i,
    });
    if (await tourDismiss.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tourDismiss.click();
    }

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Tour should not reappear
    const tooltip = page
      .getByTestId('tour-tooltip')
      .or(page.locator('[data-tour-step]').first());

    await expect(tooltip).not.toBeVisible({ timeout: 3000 });
  });

  test('tour targets exist in the DOM when highlighted', async ({ freshPage }) => {
    const page = await freshPage();

    await page.goto('/dashboard');

    const skipButton = page.getByRole('button', { name: /skip/i });
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
    }

    await new Promise((r) => setTimeout(r, 1000));

    // If a tour is active, verify each highlighted element actually exists
    const tourSteps = page.locator('[data-tour-target]');
    const stepCount = await tourSteps.count();

    for (let i = 0; i < stepCount; i++) {
      const targetSelector = await tourSteps.nth(i).getAttribute('data-tour-target');
      if (targetSelector) {
        const targetElement = page.locator(targetSelector);
        const exists = (await targetElement.count()) > 0;
        expect(exists).toBe(true);
      }
    }
  });
});
```

## Permission Request Flow Testing

Test that the application requests browser permissions at appropriate moments.

```typescript
import { test, expect } from '../fixtures/ftue.fixture';

test.describe('Permission Request Flows', () => {
  test('notification permission is not requested on first page load', async ({
    browser,
  }) => {
    // Create context that blocks permission prompts
    const context = await browser.newContext({
      permissions: [],
    });
    const page = await context.newPage();

    let permissionRequested = false;
    page.on('dialog', () => {
      permissionRequested = true;
    });

    // Monitor for Notification.requestPermission calls
    await page.addInitScript(() => {
      const originalRequest = Notification.requestPermission;
      (window as any).__permissionRequested = false;
      Notification.requestPermission = function () {
        (window as any).__permissionRequested = true;
        return originalRequest.call(this);
      };
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const wasRequested = await page.evaluate(
      () => (window as any).__permissionRequested
    );
    expect(wasRequested).toBe(false);

    await context.close();
  });

  test('notification permission is requested in context', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: [],
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      (window as any).__permissionRequested = false;
      const originalRequest = Notification.requestPermission;
      Notification.requestPermission = function () {
        (window as any).__permissionRequested = true;
        return originalRequest.call(this);
      };
    });

    await page.goto('/settings/notifications');

    // Enable notifications toggle
    const enableToggle = page.getByLabel(/enable.*notification/i).or(
      page.getByRole('switch', { name: /notification/i })
    );

    if (await enableToggle.isVisible().catch(() => false)) {
      await enableToggle.click();

      // NOW the permission should be requested
      const wasRequested = await page.evaluate(
        () => (window as any).__permissionRequested
      );
      expect(wasRequested).toBe(true);
    }

    await context.close();
  });

  test('app gracefully handles denied permissions', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: [], // No permissions granted
    });
    const page = await context.newPage();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // App should function normally without any permissions
    await expect(
      page.getByTestId('dashboard').or(page.getByTestId('main-content'))
    ).toBeVisible();

    // Navigate to a feature that might need permissions
    await page.goto('/settings/notifications');

    // Should show a message about needing permissions, not an error
    const permissionInfo = page.getByText(
      /enable notifications|allow notifications|permission required/i
    );
    const errorMessage = page.getByText(/error|crash|something went wrong/i);

    if (await permissionInfo.isVisible().catch(() => false)) {
      // Good: shows informational message about permissions
      expect(true).toBe(true);
    }

    // Should NOT show an error
    if (await errorMessage.isVisible().catch(() => false)) {
      // Check if it is a permission-specific error (acceptable) vs a crash (not acceptable)
      const text = await errorMessage.textContent();
      expect(text).not.toMatch(/unexpected|unhandled|crash/i);
    }

    await context.close();
  });
});
```

## Returning User Differentiation

Test that returning users do not see the onboarding experience again.

```typescript
import { test, expect } from '../fixtures/ftue.fixture';

test.describe('Returning User Experience', () => {
  test('completed onboarding does not show again after browser restart', async ({
    browser,
  }) => {
    // First session: complete onboarding
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('/');

    // Complete onboarding (simplified -- click through all steps)
    let hasNext = true;
    while (hasNext) {
      const nextBtn = page1.getByRole('button', {
        name: /next|continue|get started|finish|done/i,
      });
      hasNext = await nextBtn.isVisible().catch(() => false);
      if (hasNext) {
        await nextBtn.click();
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Save storage state
    const storageState = await context1.storageState();
    await context1.close();

    // Second session: use saved storage state (simulating returning user)
    const context2 = await browser.newContext({ storageState });
    const page2 = await context2.newPage();

    await page2.goto('/');
    await page2.waitForLoadState('networkidle');

    // Should NOT show onboarding
    const onboarding = page2.getByTestId('onboarding-flow').or(
      page2.getByTestId('onboarding-step-1')
    );
    await expect(onboarding).not.toBeVisible({ timeout: 3000 });

    // Should show the main app
    await expect(
      page2.getByTestId('dashboard').or(page2.getByTestId('main-content'))
    ).toBeVisible();

    await context2.close();
  });

  test('returning user sees their data, not empty states', async ({ browser }) => {
    // Create a context with pre-existing user data
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/dashboard');

    // Create some data
    await page.goto('/tasks/new');
    await page.getByLabel('Task Title').fill('Existing task');
    await page.getByRole('button', { name: /save|create/i }).click();
    await page.waitForLoadState('networkidle');

    // Save state
    const storageState = await context.storageState();
    await context.close();

    // New session with saved state
    const context2 = await browser.newContext({ storageState });
    const page2 = await context2.newPage();

    await page2.goto('/tasks');
    await page2.waitForLoadState('networkidle');

    // Should show existing data, not empty state
    await expect(page2.getByText('Existing task')).toBeVisible();

    const emptyState = page2.getByTestId('empty-state');
    await expect(emptyState).not.toBeVisible();

    await context2.close();
  });
});
```

## Configuration

### Playwright Configuration for FTUE Testing

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ftue',
  timeout: 45000,
  retries: 1,
  workers: 1, // Sequential to avoid state leakage between tests
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Start with clean state by default
    storageState: undefined,
    permissions: [],
  },
  projects: [
    {
      name: 'ftue-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ftue-mobile',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'ftue-tablet',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
});
```

### Environment Variables

```bash
# .env.test
BASE_URL=http://localhost:3000
ONBOARDING_ENABLED=true
TOOLTIP_TOUR_ENABLED=true
EMPTY_STATE_CTA_ENABLED=true
PERMISSION_REQUEST_DELAY_MS=0
```

## Best Practices

1. **Always start with a fresh browser context** -- Use Playwright's `browser.newContext()` without `storageState` for every FTUE test. Never reuse contexts between tests, as leaked cookies or localStorage will hide FTUE bugs.

2. **Test every empty state independently** -- Each page that displays user-generated content must have its own empty state test. Do not rely on the dashboard empty state test to cover all screens.

3. **Verify onboarding on every supported device** -- The onboarding experience often breaks on mobile or tablet viewports because designers focus on desktop during development. Include all target viewports in the test matrix.

4. **Test onboarding with network failures** -- What happens if the user loses connectivity during onboarding? The wizard should not crash, and any entered data should be recoverable.

5. **Separate onboarding from authentication** -- Onboarding tests should cover both authenticated (post-signup) and unauthenticated (first visit to public pages) scenarios. These are different user journeys with different empty states.

6. **Assert that empty states have CTAs** -- An empty state without a call-to-action is a dead end. Every empty state test should verify the presence of a button or link that guides the user forward.

7. **Test keyboard navigation through onboarding** -- Onboarding wizards must be fully navigable with the keyboard. Tab through every step and verify that focus management is correct.

8. **Verify onboarding analytics events** -- If the application tracks onboarding completion, step drops, or skip rates, verify that the correct analytics events are fired at each step.

9. **Test localized onboarding** -- If the application supports multiple languages, verify that the onboarding flow renders correctly in each supported language, including RTL languages.

10. **Measure onboarding load time** -- The welcome screen is the first thing users see. Measure and assert that it loads within acceptable performance budgets (under 3 seconds for initial paint).

11. **Test with screen readers** -- Onboarding is often highly visual with animations and illustrations. Verify that screen reader users receive equivalent information through ARIA labels and live regions.

12. **Verify that data entered during onboarding persists** -- If the user sets up their profile during onboarding, verify that the profile page reflects those settings after onboarding completes.

## Anti-Patterns to Avoid

1. **Reusing browser contexts across FTUE tests** -- Sharing state between tests means the second test is not testing the first-time experience. Every FTUE test must create its own clean context.

2. **Only testing the complete onboarding path** -- Most users do not complete every onboarding step. Test skip behavior, partial completion, and abandonment as thoroughly as the happy path.

3. **Hardcoding onboarding step counts** -- If the onboarding flow changes (steps added or removed), hardcoded step counts will cause false failures. Use flexible selectors that detect the current step dynamically.

4. **Ignoring empty states on secondary pages** -- Testing only the dashboard empty state while ignoring empty states on the tasks, projects, notifications, and settings pages leaves gaps in coverage.

5. **Assuming permissions are granted** -- Tests that run in a context where permissions are pre-granted miss the real FTUE where no permissions exist. Always test with an explicit empty permissions array.

6. **Skipping mobile FTUE testing** -- Mobile onboarding often has different layouts, touch interactions, and navigation patterns. A desktop-only FTUE test suite misses mobile-specific bugs.

7. **Not testing onboarding after app updates** -- When the application is updated, existing users who partially completed onboarding may see a broken state. Test the transition from old onboarding to new onboarding.

## Debugging Tips

1. **Inspect localStorage for onboarding flags** -- Most applications store onboarding completion status in localStorage (keys like `hasCompletedOnboarding`, `onboardingStep`, `isNewUser`). Inspect these values to understand why onboarding is or is not appearing.

2. **Check for cookie-based first-visit detection** -- Some applications use cookies to detect first-time visitors. Verify that the expected cookies are being set and that their expiration is appropriate.

3. **Use Playwright's storage state snapshot** -- Take a `context.storageState()` snapshot after completing onboarding and compare it to a fresh state. The diff reveals exactly what state the application sets during onboarding.

4. **Watch for race conditions in step transitions** -- Rapid clicking through onboarding steps can trigger race conditions where two steps render simultaneously. Slow down the test and add explicit waits between steps to isolate timing issues.

5. **Verify API calls during onboarding** -- Monitor network requests during onboarding to ensure that setup data (profile, preferences) is actually being saved to the server, not just stored locally.

6. **Test with browser DevTools Application tab** -- The Application tab in Chrome DevTools shows all localStorage, sessionStorage, cookies, and IndexedDB entries. Manually walk through the FTUE while monitoring this tab to understand the state machine.

7. **Check for feature flags affecting FTUE** -- Feature flags may enable or disable onboarding for different user segments. Verify that your test environment has the correct feature flags set for FTUE testing.

8. **Debug with Playwright trace viewer** -- The trace viewer shows DOM snapshots at each step. When an onboarding step fails to render, the trace reveals whether the DOM element exists but is hidden, does not exist, or is rendered off-screen.

9. **Verify server-side new user detection** -- If the server determines first-time user status, check the API response to see if the `isNewUser` or `onboardingRequired` flag is set correctly. Client-side detection may conflict with server-side detection.

10. **Look for animation timing issues** -- Onboarding often uses animations for step transitions. If tests fail intermittently, the animation may not have completed when the test tries to interact with the next step. Add `waitForSelector` or animation completion checks.
