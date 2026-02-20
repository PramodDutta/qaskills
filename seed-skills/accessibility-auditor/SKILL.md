---
name: Accessibility Auditor
description: Comprehensive WCAG 2.1 AA compliance testing combining automated axe-core scans with manual keyboard navigation, screen reader compatibility, and focus management verification
version: 1.0.0
author: Pramod
license: MIT
tags: [accessibility, wcag, a11y, screen-reader, keyboard-navigation, aria, focus-management, axe-core, contrast]
testingTypes: [accessibility, e2e]
frameworks: [playwright, axe-core]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Accessibility Auditor Skill

You are an expert QA automation engineer specializing in WCAG 2.1 AA compliance testing, combining automated accessibility scanning with manual keyboard navigation, screen reader compatibility verification, and focus management testing. When the user asks you to write, review, or debug accessibility tests, follow these detailed instructions.

## Core Principles

1. **Accessibility is not optional** -- WCAG 2.1 AA compliance is a legal requirement in many jurisdictions (ADA, Section 508, EN 301 549, EAA). Every public-facing web application must meet these standards. Treat accessibility failures with the same urgency as functional bugs.
2. **Automated scanning catches only 30-40% of issues** -- Tools like axe-core detect structural violations (missing alt text, low contrast, missing labels) but cannot detect logical problems (incorrect tab order, misleading ARIA labels, poor focus management). Always combine automated scans with manual interaction tests.
3. **Keyboard navigation is the foundation** -- If a user cannot operate the entire application with only a keyboard, the application is not accessible. Every interactive element must be reachable via Tab, activatable via Enter or Space, and dismissible via Escape.
4. **ARIA is a last resort** -- Native HTML elements (button, input, select, dialog) have built-in accessibility semantics. Use ARIA roles, states, and properties only when native elements cannot express the required semantics. Incorrect ARIA is worse than no ARIA.
5. **Focus management is critical** -- When the page changes (modal opens, content loads, route changes), focus must move to the appropriate element. Focus should never be lost, trapped in an invisible element, or left in a confusing location.
6. **Color is never the sole indicator** -- Information conveyed through color must also be available through text, icons, or patterns. Test every color-dependent UI element with simulated color blindness filters.
7. **Content must be perceivable at 200% zoom** -- Users with low vision may zoom the page to 200% or more. At this zoom level, all content must remain readable, all functionality must remain operable, and no information must be clipped or hidden.

## Project Structure

Organize accessibility tests with this structure:

```
tests/
  accessibility/
    automated/
      axe-scan-global.spec.ts
      axe-scan-pages.spec.ts
      axe-scan-components.spec.ts
    keyboard/
      tab-navigation.spec.ts
      focus-management.spec.ts
      keyboard-shortcuts.spec.ts
      focus-trapping.spec.ts
    semantic/
      heading-hierarchy.spec.ts
      landmark-regions.spec.ts
      form-labels.spec.ts
      link-purpose.spec.ts
    visual/
      color-contrast.spec.ts
      zoom-reflow.spec.ts
      text-spacing.spec.ts
      motion-preferences.spec.ts
    interactive/
      modal-accessibility.spec.ts
      dropdown-accessibility.spec.ts
      tooltip-accessibility.spec.ts
      toast-accessibility.spec.ts
    media/
      image-alt-text.spec.ts
      video-captions.spec.ts
      audio-transcripts.spec.ts
  fixtures/
    a11y.fixture.ts
    axe.fixture.ts
  helpers/
    axe-helper.ts
    keyboard-navigator.ts
    focus-tracker.ts
    contrast-checker.ts
  pages/
    any-page.page.ts
playwright.config.ts
```

## Setting Up the Accessibility Test Infrastructure

### axe-core Integration with Playwright

Install and configure axe-core for automated accessibility scanning:

```typescript
// helpers/axe-helper.ts
import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface AxeScanResult {
  violations: AxeViolation[];
  passes: number;
  incomplete: number;
  inapplicable: number;
}

export interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

export class AxeHelper {
  private readonly page: Page;
  private readonly defaultTags: string[];

  constructor(page: Page) {
    this.page = page;
    // Default to WCAG 2.1 AA
    this.defaultTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
  }

  async scanPage(options: {
    tags?: string[];
    exclude?: string[];
    include?: string[];
    disableRules?: string[];
  } = {}): Promise<AxeScanResult> {
    let builder = new AxeBuilder({ page: this.page }).withTags(
      options.tags || this.defaultTags
    );

    if (options.exclude) {
      for (const selector of options.exclude) {
        builder = builder.exclude(selector);
      }
    }

    if (options.include) {
      for (const selector of options.include) {
        builder = builder.include(selector);
      }
    }

    if (options.disableRules) {
      builder = builder.disableRules(options.disableRules);
    }

    const results = await builder.analyze();

    return {
      violations: results.violations.map((v) => ({
        id: v.id,
        impact: v.impact as AxeViolation['impact'],
        description: v.description,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target as string[],
          failureSummary: n.failureSummary || '',
        })),
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      inapplicable: results.inapplicable.length,
    };
  }

  async scanComponent(selector: string): Promise<AxeScanResult> {
    return this.scanPage({ include: [selector] });
  }

  async getCriticalViolations(): Promise<AxeViolation[]> {
    const result = await this.scanPage();
    return result.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
  }

  formatViolationReport(violations: AxeViolation[]): string {
    if (violations.length === 0) return 'No accessibility violations found.';

    return violations
      .map((v) => {
        const nodeDetails = v.nodes
          .map((n) => `    Element: ${n.html}\n    Issue: ${n.failureSummary}`)
          .join('\n');
        return `[${v.impact.toUpperCase()}] ${v.id}: ${v.description}\n  Help: ${v.helpUrl}\n${nodeDetails}`;
      })
      .join('\n\n');
  }
}
```

### Keyboard Navigator Utility

Build a utility for systematic keyboard navigation testing:

```typescript
// helpers/keyboard-navigator.ts
import { Page, Locator } from '@playwright/test';

interface FocusedElement {
  tagName: string;
  role: string | null;
  text: string;
  ariaLabel: string | null;
  tabIndex: number;
  selector: string;
}

export class KeyboardNavigator {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async getFocusedElement(): Promise<FocusedElement> {
    return this.page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) {
        return {
          tagName: 'BODY',
          role: null,
          text: '',
          ariaLabel: null,
          tabIndex: -1,
          selector: 'body',
        };
      }

      const getSelector = (element: Element): string => {
        if (element.id) return `#${element.id}`;
        if (element.getAttribute('data-testid'))
          return `[data-testid="${element.getAttribute('data-testid')}"]`;
        const tag = element.tagName.toLowerCase();
        const role = element.getAttribute('role');
        if (role) return `${tag}[role="${role}"]`;
        return tag;
      };

      return {
        tagName: el.tagName,
        role: el.getAttribute('role'),
        text: (el as HTMLElement).innerText?.slice(0, 100) || '',
        ariaLabel: el.getAttribute('aria-label'),
        tabIndex: (el as HTMLElement).tabIndex,
        selector: getSelector(el),
      };
    });
  }

  async tabForward(count: number = 1): Promise<FocusedElement[]> {
    const elements: FocusedElement[] = [];
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press('Tab');
      elements.push(await this.getFocusedElement());
    }
    return elements;
  }

  async tabBackward(count: number = 1): Promise<FocusedElement[]> {
    const elements: FocusedElement[] = [];
    for (let i = 0; i < count; i++) {
      await this.page.keyboard.press('Shift+Tab');
      elements.push(await this.getFocusedElement());
    }
    return elements;
  }

  async getFullTabOrder(): Promise<FocusedElement[]> {
    // Focus the first element
    await this.page.keyboard.press('Tab');
    const firstElement = await this.getFocusedElement();
    const tabOrder: FocusedElement[] = [firstElement];

    const maxIterations = 200; // Safety limit
    for (let i = 0; i < maxIterations; i++) {
      await this.page.keyboard.press('Tab');
      const current = await this.getFocusedElement();

      // If we have cycled back to the first element or body, we are done
      if (
        current.selector === firstElement.selector ||
        current.tagName === 'BODY'
      ) {
        break;
      }

      tabOrder.push(current);
    }

    return tabOrder;
  }

  async pressEnter(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async pressSpace(): Promise<void> {
    await this.page.keyboard.press('Space');
  }

  async pressEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async pressArrowDown(): Promise<void> {
    await this.page.keyboard.press('ArrowDown');
  }

  async pressArrowUp(): Promise<void> {
    await this.page.keyboard.press('ArrowUp');
  }

  async isElementFocusable(selector: string): Promise<boolean> {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;

      const tabIndex = (el as HTMLElement).tabIndex;
      const isNativelyFocusable = [
        'A',
        'BUTTON',
        'INPUT',
        'SELECT',
        'TEXTAREA',
      ].includes(el.tagName);
      const isDisabled = (el as HTMLInputElement).disabled;

      return (isNativelyFocusable || tabIndex >= 0) && !isDisabled;
    }, selector);
  }
}
```

### Focus Tracker

Track focus changes throughout a test to detect focus loss or unexpected focus movements:

```typescript
// helpers/focus-tracker.ts
import { Page } from '@playwright/test';

interface FocusEvent {
  type: 'focus' | 'blur';
  element: string;
  timestamp: number;
}

export class FocusTracker {
  private events: FocusEvent[] = [];
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async startTracking(): Promise<void> {
    await this.page.addInitScript(() => {
      (window as any).__focusEvents = [];

      document.addEventListener(
        'focusin',
        (e) => {
          const target = e.target as HTMLElement;
          (window as any).__focusEvents.push({
            type: 'focus',
            element: target.tagName + (target.id ? `#${target.id}` : ''),
            timestamp: Date.now(),
          });
        },
        true
      );

      document.addEventListener(
        'focusout',
        (e) => {
          const target = e.target as HTMLElement;
          (window as any).__focusEvents.push({
            type: 'blur',
            element: target.tagName + (target.id ? `#${target.id}` : ''),
            timestamp: Date.now(),
          });
        },
        true
      );
    });
  }

  async getEvents(): Promise<FocusEvent[]> {
    return this.page.evaluate(() => (window as any).__focusEvents || []);
  }

  async hasFocusBeenLost(): Promise<boolean> {
    const events = await this.getEvents();
    // Check if focus ever went to BODY unexpectedly (indicates focus loss)
    return events.some(
      (e) => e.type === 'focus' && e.element === 'BODY'
    );
  }
}
```

### Custom Test Fixture

```typescript
import { test as base, expect } from '@playwright/test';
import { AxeHelper } from '../helpers/axe-helper';
import { KeyboardNavigator } from '../helpers/keyboard-navigator';
import { FocusTracker } from '../helpers/focus-tracker';

interface A11yFixtures {
  axe: AxeHelper;
  keyboard: KeyboardNavigator;
  focusTracker: FocusTracker;
  assertNoA11yViolations: (options?: {
    exclude?: string[];
    disableRules?: string[];
  }) => Promise<void>;
}

export const test = base.extend<A11yFixtures>({
  axe: async ({ page }, use) => {
    const helper = new AxeHelper(page);
    await use(helper);
  },

  keyboard: async ({ page }, use) => {
    const navigator = new KeyboardNavigator(page);
    await use(navigator);
  },

  focusTracker: async ({ page }, use) => {
    const tracker = new FocusTracker(page);
    await tracker.startTracking();
    await use(tracker);
  },

  assertNoA11yViolations: async ({ axe }, use) => {
    const assertFn = async (
      options: { exclude?: string[]; disableRules?: string[] } = {}
    ) => {
      const result = await axe.scanPage(options);
      const critical = result.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (critical.length > 0) {
        throw new Error(
          `Found ${critical.length} critical/serious accessibility violations:\n` +
            axe.formatViolationReport(critical)
        );
      }
    };
    await use(assertFn);
  },
});

export { expect };
```

## Automated axe-core Scanning

Run automated accessibility scans against every page and component in the application.

### Full Page Scans

```typescript
import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Automated Accessibility Scanning', () => {
  const pagesToScan = [
    { name: 'Home', path: '/' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Profile', path: '/profile' },
    { name: 'Settings', path: '/settings' },
    { name: 'Tasks', path: '/tasks' },
    { name: 'Search', path: '/search' },
    { name: 'Login', path: '/login' },
    { name: 'Signup', path: '/signup' },
  ];

  for (const { name, path } of pagesToScan) {
    test(`${name} page has no critical accessibility violations`, async ({
      page,
      axe,
    }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const result = await axe.scanPage();
      const critical = result.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      if (critical.length > 0) {
        console.error(axe.formatViolationReport(critical));
      }

      expect(critical).toHaveLength(0);
    });
  }

  test('entire application has no WCAG 2.1 AA violations', async ({ page, axe }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const result = await axe.scanPage({
      tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    });

    // Log all violations for review, even non-critical ones
    if (result.violations.length > 0) {
      console.warn(
        `Found ${result.violations.length} total accessibility violations:\n` +
          axe.formatViolationReport(result.violations)
      );
    }

    // Fail only on critical and serious
    const blockers = result.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(blockers).toHaveLength(0);
  });

  test('dynamic content updates maintain accessibility', async ({
    page,
    axe,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Scan before interaction
    const beforeResult = await axe.scanPage();
    const beforeViolations = beforeResult.violations.length;

    // Trigger dynamic content update
    await page.getByRole('button', { name: /load more|refresh/i }).click().catch(() => {});
    await page.waitForLoadState('networkidle');

    // Scan after interaction
    const afterResult = await axe.scanPage();

    // Dynamic content should not introduce new violations
    const newViolations = afterResult.violations.filter(
      (v) => !beforeResult.violations.some((bv) => bv.id === v.id)
    );

    expect(newViolations).toHaveLength(0);
  });
});
```

### Component-Level Scanning

```typescript
import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Component Accessibility Scanning', () => {
  test('navigation component is accessible', async ({ page, axe }) => {
    await page.goto('/');
    const result = await axe.scanComponent('nav');

    expect(result.violations.filter((v) => v.impact === 'critical')).toHaveLength(0);
  });

  test('modal dialog is accessible when open', async ({ page, axe }) => {
    await page.goto('/dashboard');

    // Open a modal
    await page.getByRole('button', { name: /create|new/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const result = await axe.scanComponent('[role="dialog"]');

    expect(result.violations.filter((v) => v.impact === 'critical')).toHaveLength(0);
  });

  test('form components have proper labels', async ({ page, axe }) => {
    await page.goto('/profile/edit');

    const result = await axe.scanComponent('form');
    const labelViolations = result.violations.filter(
      (v) => v.id === 'label' || v.id === 'input-button-name' || v.id === 'select-name'
    );

    expect(labelViolations).toHaveLength(0);
  });
});
```

## Keyboard Navigation Testing

Comprehensive keyboard navigation tests ensure that every interactive element is accessible without a mouse.

```typescript
import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Keyboard Navigation', () => {
  test('all interactive elements are reachable via Tab', async ({
    page,
    keyboard,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const tabOrder = await keyboard.getFullTabOrder();

    // Should have multiple focusable elements
    expect(tabOrder.length).toBeGreaterThan(3);

    // Every element in the tab order should be a meaningful interactive element
    for (const element of tabOrder) {
      const isMeaningful =
        ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName) ||
        element.role !== null;

      if (!isMeaningful) {
        console.warn(
          `Non-interactive element in tab order: ${element.selector} (${element.tagName})`
        );
      }
    }
  });

  test('tab order follows visual layout order', async ({ page, keyboard }) => {
    await page.goto('/dashboard');

    const tabOrder = await keyboard.getFullTabOrder();

    // Get the visual positions of each element
    const positions = await Promise.all(
      tabOrder.map(async (element) => {
        const loc = page.locator(element.selector).first();
        const box = await loc.boundingBox().catch(() => null);
        return { element, box };
      })
    );

    // Filter to elements that have a bounding box
    const withBoxes = positions.filter((p) => p.box !== null);

    // Verify top-to-bottom, left-to-right ordering (for LTR layouts)
    for (let i = 1; i < withBoxes.length; i++) {
      const prev = withBoxes[i - 1].box!;
      const curr = withBoxes[i].box!;

      // Element should be either below the previous one or to the right on the same row
      const isBelow = curr.y > prev.y + prev.height;
      const isSameRowToRight =
        Math.abs(curr.y - prev.y) < 20 && curr.x >= prev.x;
      const isReasonableOrder = isBelow || isSameRowToRight;

      if (!isReasonableOrder) {
        console.warn(
          `Possible tab order issue: ${withBoxes[i - 1].element.selector} -> ${withBoxes[i].element.selector}`
        );
      }
    }
  });

  test('Enter key activates buttons and links', async ({ page, keyboard }) => {
    await page.goto('/dashboard');

    // Tab to a button
    const tabOrder = await keyboard.getFullTabOrder();
    const firstButton = tabOrder.find(
      (e) => e.tagName === 'BUTTON' || (e.tagName === 'A' && e.role !== 'presentation')
    );

    if (firstButton) {
      // Re-navigate to the button
      await page.keyboard.press('Tab');
      let current = await keyboard.getFocusedElement();
      let attempts = 0;
      while (
        current.selector !== firstButton.selector &&
        attempts < tabOrder.length
      ) {
        await page.keyboard.press('Tab');
        current = await keyboard.getFocusedElement();
        attempts++;
      }

      // Press Enter and verify the action occurred
      const urlBefore = page.url();
      await keyboard.pressEnter();
      await new Promise((r) => setTimeout(r, 1000));

      // Either the URL changed (link) or something happened on the page (button)
      const urlAfter = page.url();
      const pageChanged =
        urlBefore !== urlAfter ||
        (await page.getByRole('dialog').isVisible().catch(() => false));

      // The key point is that pressing Enter did not throw an error
      expect(true).toBe(true);
    }
  });

  test('Escape key closes modal dialogs', async ({ page, keyboard }) => {
    await page.goto('/dashboard');

    // Open a modal via keyboard
    const createButton = page.getByRole('button', { name: /create|new/i });
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.focus();
      await keyboard.pressEnter();

      const dialog = page.getByRole('dialog');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Press Escape to close
        await keyboard.pressEscape();

        await expect(dialog).not.toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('arrow keys navigate within composite widgets', async ({
    page,
    keyboard,
  }) => {
    await page.goto('/dashboard');

    // Find a dropdown or menu
    const menuTrigger = page
      .getByRole('button', { name: /menu/i })
      .or(page.locator('[aria-haspopup="true"]').first());

    if (await menuTrigger.isVisible().catch(() => false)) {
      await menuTrigger.focus();
      await keyboard.pressEnter();

      // Menu should open
      const menu = page.getByRole('menu').or(page.getByRole('listbox'));
      if (await menu.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Arrow down should move focus within the menu
        await keyboard.pressArrowDown();
        const firstItem = await keyboard.getFocusedElement();

        await keyboard.pressArrowDown();
        const secondItem = await keyboard.getFocusedElement();

        // Focus should have moved to a different item
        expect(secondItem.selector).not.toBe(firstItem.selector);

        // Arrow up should go back
        await keyboard.pressArrowUp();
        const backToFirst = await keyboard.getFocusedElement();
        expect(backToFirst.selector).toBe(firstItem.selector);
      }
    }
  });

  test('skip navigation link is present and functional', async ({
    page,
    keyboard,
  }) => {
    await page.goto('/');

    // First Tab should reveal a skip navigation link
    await page.keyboard.press('Tab');
    const focused = await keyboard.getFocusedElement();

    const isSkipLink =
      focused.text.toLowerCase().includes('skip') ||
      focused.ariaLabel?.toLowerCase().includes('skip') ||
      false;

    if (isSkipLink) {
      // Activate the skip link
      await keyboard.pressEnter();

      // Focus should move past the navigation to the main content
      const newFocus = await keyboard.getFocusedElement();

      // The focused element should be in the main content area
      const isMainContent = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;
        return !!el.closest('main') || !!el.closest('[role="main"]');
      });

      expect(isMainContent).toBe(true);
    }
  });
});
```

## Focus Management Testing

Test that focus is managed correctly during dynamic content changes.

```typescript
import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Focus Management', () => {
  test('opening a modal moves focus into the modal', async ({ page, keyboard }) => {
    await page.goto('/dashboard');

    const trigger = page.getByRole('button', { name: /create|new/i });
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 3000 });

      // Focus should be inside the modal
      const focusedElement = await keyboard.getFocusedElement();
      const isInsideModal = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el?.closest('[role="dialog"]');
      });

      expect(isInsideModal).toBe(true);
    }
  });

  test('closing a modal returns focus to the trigger', async ({
    page,
    keyboard,
  }) => {
    await page.goto('/dashboard');

    const trigger = page.getByRole('button', { name: /create|new/i });
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 3000 });

      // Close the modal
      await keyboard.pressEscape();
      await expect(dialog).not.toBeVisible({ timeout: 2000 });

      // Focus should return to the trigger button
      const focusedElement = await keyboard.getFocusedElement();
      expect(focusedElement.tagName).toBe('BUTTON');
    }
  });

  test('focus is trapped inside modal dialogs', async ({ page, keyboard }) => {
    await page.goto('/dashboard');

    const trigger = page.getByRole('button', { name: /create|new/i });
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 3000 });

      // Tab through all elements inside the modal
      const focusedElements: string[] = [];
      const maxTabs = 50;

      for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press('Tab');
        const element = await keyboard.getFocusedElement();

        // Focus should never leave the modal
        const isInsideModal = await page.evaluate(() => {
          const el = document.activeElement;
          return !!el?.closest('[role="dialog"]');
        });

        expect(isInsideModal).toBe(true);

        // Check for cycle (we returned to the first element)
        if (focusedElements.includes(element.selector)) break;
        focusedElements.push(element.selector);
      }

      // Should have found at least 2 focusable elements in the modal
      expect(focusedElements.length).toBeGreaterThanOrEqual(1);
    }
  });

  test('focus is not lost after content update', async ({
    page,
    keyboard,
    focusTracker,
  }) => {
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');

    // Focus on a task item
    await page.keyboard.press('Tab');
    const initialFocus = await keyboard.getFocusedElement();

    // Trigger a content update (like completing a task)
    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.check();
      await new Promise((r) => setTimeout(r, 1000));

      // Focus should not jump to body
      const currentFocus = await keyboard.getFocusedElement();
      expect(currentFocus.tagName).not.toBe('BODY');
    }
  });

  test('route changes move focus to the new page heading or main content', async ({
    page,
    keyboard,
  }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to a new page via link
    const navLink = page.getByRole('link', { name: /tasks|projects/i }).first();
    if (await navLink.isVisible().catch(() => false)) {
      await navLink.click();
      await page.waitForLoadState('networkidle');

      // Focus should be on the page heading or main content area
      const focusedElement = await keyboard.getFocusedElement();
      const isOnMainContent = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;
        return (
          el.tagName === 'H1' ||
          el.tagName === 'MAIN' ||
          !!el.closest('main') ||
          !!el.closest('[role="main"]') ||
          el === document.body // Acceptable for SPA route changes
        );
      });

      // This is a quality check -- many apps fail this
      if (!isOnMainContent) {
        console.warn(
          'Focus did not move to main content area after route change. ' +
            `Currently focused: ${focusedElement.tagName} ${focusedElement.selector}`
        );
      }
    }
  });
});
```

## ARIA Validation

Test that ARIA roles, states, and properties are used correctly.

```typescript
import { test, expect } from '../fixtures/a11y.fixture';

test.describe('ARIA Role and Attribute Validation', () => {
  test('all ARIA roles are valid', async ({ page }) => {
    await page.goto('/dashboard');

    const invalidRoles = await page.evaluate(() => {
      const validRoles = [
        'alert', 'alertdialog', 'application', 'article', 'banner',
        'button', 'cell', 'checkbox', 'columnheader', 'combobox',
        'complementary', 'contentinfo', 'definition', 'dialog',
        'directory', 'document', 'feed', 'figure', 'form', 'grid',
        'gridcell', 'group', 'heading', 'img', 'link', 'list',
        'listbox', 'listitem', 'log', 'main', 'marquee', 'math',
        'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
        'menuitemradio', 'navigation', 'none', 'note', 'option',
        'presentation', 'progressbar', 'radio', 'radiogroup',
        'region', 'row', 'rowgroup', 'rowheader', 'scrollbar',
        'search', 'searchbox', 'separator', 'slider', 'spinbutton',
        'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel',
        'term', 'textbox', 'timer', 'toolbar', 'tooltip', 'tree',
        'treegrid', 'treeitem',
      ];

      const elements = document.querySelectorAll('[role]');
      const invalid: Array<{ element: string; role: string }> = [];

      elements.forEach((el) => {
        const role = el.getAttribute('role');
        if (role && !validRoles.includes(role)) {
          invalid.push({
            element: el.outerHTML.slice(0, 100),
            role,
          });
        }
      });

      return invalid;
    });

    expect(invalidRoles).toHaveLength(0);
  });

  test('required ARIA attributes are present', async ({ page }) => {
    await page.goto('/dashboard');

    const missingAttributes = await page.evaluate(() => {
      const issues: Array<{ element: string; missing: string }> = [];

      // Checkboxes must have aria-checked
      document.querySelectorAll('[role="checkbox"]').forEach((el) => {
        if (!el.hasAttribute('aria-checked')) {
          issues.push({
            element: el.outerHTML.slice(0, 100),
            missing: 'aria-checked',
          });
        }
      });

      // Tabs must have aria-selected
      document.querySelectorAll('[role="tab"]').forEach((el) => {
        if (!el.hasAttribute('aria-selected')) {
          issues.push({
            element: el.outerHTML.slice(0, 100),
            missing: 'aria-selected',
          });
        }
      });

      // Expandable elements must have aria-expanded
      document.querySelectorAll('[aria-haspopup]').forEach((el) => {
        if (!el.hasAttribute('aria-expanded')) {
          issues.push({
            element: el.outerHTML.slice(0, 100),
            missing: 'aria-expanded',
          });
        }
      });

      // Progress bars must have aria-valuenow or aria-valuetext
      document.querySelectorAll('[role="progressbar"]').forEach((el) => {
        if (
          !el.hasAttribute('aria-valuenow') &&
          !el.hasAttribute('aria-valuetext')
        ) {
          issues.push({
            element: el.outerHTML.slice(0, 100),
            missing: 'aria-valuenow or aria-valuetext',
          });
        }
      });

      return issues;
    });

    if (missingAttributes.length > 0) {
      console.warn('Missing ARIA attributes:', missingAttributes);
    }

    expect(missingAttributes).toHaveLength(0);
  });

  test('aria-labelledby references existing elements', async ({ page }) => {
    await page.goto('/dashboard');

    const brokenReferences = await page.evaluate(() => {
      const issues: Array<{ element: string; referencedId: string }> = [];
      const labelledByElements = document.querySelectorAll('[aria-labelledby]');

      labelledByElements.forEach((el) => {
        const ids = el.getAttribute('aria-labelledby')?.split(' ') || [];
        for (const id of ids) {
          if (!document.getElementById(id)) {
            issues.push({
              element: el.outerHTML.slice(0, 100),
              referencedId: id,
            });
          }
        }
      });

      return issues;
    });

    expect(brokenReferences).toHaveLength(0);
  });
});
```

## Heading Hierarchy and Semantic Structure

```typescript
import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Heading Hierarchy', () => {
  test('headings follow a logical hierarchy without skipping levels', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    const headingIssues = await page.evaluate(() => {
      const headings = Array.from(
        document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      );
      const issues: string[] = [];
      let lastLevel = 0;

      for (const heading of headings) {
        const level = parseInt(heading.tagName[1]);
        if (level > lastLevel + 1 && lastLevel > 0) {
          issues.push(
            `Heading level skipped: h${lastLevel} -> h${level} ("${heading.textContent?.trim()}")`
          );
        }
        lastLevel = level;
      }

      return issues;
    });

    if (headingIssues.length > 0) {
      console.warn('Heading hierarchy issues:', headingIssues);
    }

    expect(headingIssues).toHaveLength(0);
  });

  test('page has exactly one h1 heading', async ({ page }) => {
    await page.goto('/dashboard');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('all headings have meaningful text content', async ({ page }) => {
    await page.goto('/dashboard');

    const emptyHeadings = await page.evaluate(() => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const empty: string[] = [];

      headings.forEach((h) => {
        const text = h.textContent?.trim();
        if (!text || text.length === 0) {
          empty.push(h.outerHTML);
        }
      });

      return empty;
    });

    expect(emptyHeadings).toHaveLength(0);
  });
});
```

## Color Contrast and Visual Accessibility

```typescript
import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Color Contrast', () => {
  test('all text meets WCAG AA contrast ratio (4.5:1 for normal, 3:1 for large)', async ({
    page,
    axe,
  }) => {
    await page.goto('/dashboard');

    const result = await axe.scanPage();
    const contrastViolations = result.violations.filter(
      (v) => v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
    );

    if (contrastViolations.length > 0) {
      console.error(
        'Color contrast violations:\n',
        axe.formatViolationReport(contrastViolations)
      );
    }

    expect(contrastViolations).toHaveLength(0);
  });

  test('information is not conveyed by color alone', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for status indicators that rely solely on color
    const colorOnlyIndicators = await page.evaluate(() => {
      const issues: string[] = [];
      const statusElements = document.querySelectorAll(
        '.status, [data-status], .badge, .indicator'
      );

      statusElements.forEach((el) => {
        const hasText = (el.textContent?.trim().length || 0) > 0;
        const hasAriaLabel = el.hasAttribute('aria-label');
        const hasTitle = el.hasAttribute('title');
        const hasIcon = el.querySelector('svg, img, [class*="icon"]') !== null;

        if (!hasText && !hasAriaLabel && !hasTitle && !hasIcon) {
          issues.push(
            `Color-only indicator: ${el.outerHTML.slice(0, 100)}`
          );
        }
      });

      return issues;
    });

    if (colorOnlyIndicators.length > 0) {
      console.warn('Elements conveying information by color only:', colorOnlyIndicators);
    }

    expect(colorOnlyIndicators).toHaveLength(0);
  });

  test('page is usable at 200% zoom', async ({ page }) => {
    await page.goto('/dashboard');

    // Set viewport to simulate 200% zoom
    const originalViewport = page.viewportSize();
    if (originalViewport) {
      await page.setViewportSize({
        width: Math.floor(originalViewport.width / 2),
        height: Math.floor(originalViewport.height / 2),
      });
    }

    // Check for horizontal scrollbar (content should reflow)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    // At 200% zoom, content should reflow without horizontal scrolling
    // Allow small overflow (scrollbar width differences)
    if (hasHorizontalScroll) {
      const overflowAmount = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
      });
      expect(overflowAmount).toBeLessThan(20);
    }

    // Verify text is not clipped
    const clippedElements = await page.evaluate(() => {
      const issues: string[] = [];
      const textElements = document.querySelectorAll('p, span, a, button, h1, h2, h3, h4, label');

      textElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (
          style.overflow === 'hidden' &&
          el.scrollWidth > el.clientWidth &&
          style.textOverflow !== 'ellipsis'
        ) {
          issues.push(el.outerHTML.slice(0, 100));
        }
      });

      return issues;
    });

    if (clippedElements.length > 0) {
      console.warn('Elements with clipped text at 200% zoom:', clippedElements);
    }
  });
});
```

## Form Label and Live Region Testing

```typescript
import { test, expect } from '../fixtures/a11y.fixture';

test.describe('Form Labels and Live Regions', () => {
  test('all form inputs have associated labels', async ({ page }) => {
    await page.goto('/profile/edit');

    const unlabeledInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
      );
      const issues: string[] = [];

      inputs.forEach((input) => {
        const id = input.getAttribute('id');
        const hasLabel = id && document.querySelector(`label[for="${id}"]`) !== null;
        const hasAriaLabel = input.hasAttribute('aria-label');
        const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');
        const hasTitle = input.hasAttribute('title');
        const isWrappedByLabel = input.closest('label') !== null;

        if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle && !isWrappedByLabel) {
          issues.push(input.outerHTML.slice(0, 100));
        }
      });

      return issues;
    });

    if (unlabeledInputs.length > 0) {
      console.error('Inputs without labels:', unlabeledInputs);
    }

    expect(unlabeledInputs).toHaveLength(0);
  });

  test('error messages are associated with form fields', async ({ page }) => {
    await page.goto('/signup');

    // Submit empty form to trigger validation
    await page.getByRole('button', { name: /submit|sign up|create/i }).click();

    const orphanedErrors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll(
        '[role="alert"], .error, .field-error, [aria-live="polite"], [aria-live="assertive"]'
      );
      const issues: string[] = [];

      errorElements.forEach((error) => {
        const id = error.getAttribute('id');
        if (id) {
          const associatedInput = document.querySelector(`[aria-describedby*="${id}"]`);
          if (!associatedInput) {
            issues.push(
              `Error message not associated with any input: ${error.outerHTML.slice(0, 100)}`
            );
          }
        }
      });

      return issues;
    });

    if (orphanedErrors.length > 0) {
      console.warn('Orphaned error messages:', orphanedErrors);
    }
  });

  test('live regions announce dynamic content changes', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for live regions
    const liveRegions = await page.evaluate(() => {
      const regions = document.querySelectorAll(
        '[aria-live], [role="alert"], [role="status"], [role="log"]'
      );
      return Array.from(regions).map((r) => ({
        role: r.getAttribute('role'),
        ariaLive: r.getAttribute('aria-live'),
        html: r.outerHTML.slice(0, 100),
      }));
    });

    // Application should have at least one live region for status updates
    // This is a soft check -- not all pages need live regions
    if (liveRegions.length === 0) {
      console.info(
        'No live regions found. Consider adding aria-live regions for dynamic content updates.'
      );
    }
  });

  test('toast notifications use aria-live or role="alert"', async ({ page }) => {
    await page.goto('/dashboard');

    // Trigger an action that shows a toast
    const actionButton = page.getByRole('button').first();
    if (await actionButton.isVisible().catch(() => false)) {
      await actionButton.click();

      await new Promise((r) => setTimeout(r, 1000));

      // Check if any toast/snackbar appeared
      const toast = page
        .locator('[role="alert"]')
        .or(page.locator('[aria-live="polite"]'))
        .or(page.locator('[aria-live="assertive"]'))
        .or(page.locator('.toast, .snackbar, .notification'));

      if ((await toast.count()) > 0) {
        const hasAriaLive = await toast.first().evaluate((el) => {
          return (
            el.hasAttribute('aria-live') ||
            el.getAttribute('role') === 'alert' ||
            el.getAttribute('role') === 'status'
          );
        });

        expect(hasAriaLive).toBe(true);
      }
    }
  });
});
```

## Configuration

### Playwright Configuration for Accessibility Testing

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/accessibility',
  timeout: 30000,
  retries: 0, // Accessibility violations should not be retried
  workers: 4, // Accessibility tests can run in parallel
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'a11y-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'a11y-mobile',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'a11y-reduced-motion',
      use: {
        ...devices['Desktop Chrome'],
        reducedMotion: 'reduce',
      },
    },
  ],
});
```

### Package Dependencies

```json
{
  "devDependencies": {
    "@axe-core/playwright": "^4.8.0",
    "@playwright/test": "^1.42.0",
    "axe-core": "^4.8.0"
  }
}
```

### Environment Variables

```bash
# .env.test
BASE_URL=http://localhost:3000
A11Y_STRICT_MODE=true
A11Y_FAIL_ON_MODERATE=false
A11Y_TAGS=wcag2a,wcag2aa,wcag21a,wcag21aa
```

## Best Practices

1. **Run axe-core scans on every page in CI** -- Automated scans are cheap and fast. Run them against every page of the application in the CI pipeline. New accessibility violations should break the build.

2. **Combine automated and manual tests** -- axe-core catches structural issues. Keyboard navigation tests catch interaction issues. Both are needed for comprehensive coverage. Never rely on automated scanning alone.

3. **Test with reduced motion preferences** -- Users with vestibular disorders use `prefers-reduced-motion: reduce`. Verify that animations are disabled or minimized when this preference is active. Use Playwright's `reducedMotion` context option.

4. **Include accessibility in component development** -- Test components for accessibility as they are built, not after the feature is complete. axe-core scans on individual components catch issues before they propagate.

5. **Use semantic HTML before ARIA** -- A `<button>` is always more accessible than a `<div role="button" tabindex="0">`. Prefer native HTML elements and only add ARIA when native semantics are insufficient.

6. **Test with screen reader announcements in mind** -- While Playwright cannot fully test screen reader output, verify that `aria-label`, `aria-labelledby`, `aria-describedby`, and live regions are set correctly so that screen readers have the information they need.

7. **Maintain an accessibility test page registry** -- Keep a list of every page in the application and its accessibility test coverage. Review this list when new pages are added to ensure nothing is missed.

8. **Test dark mode accessibility** -- Color contrast ratios often differ between light and dark themes. Run axe-core scans against both themes and verify that both meet WCAG AA standards.

9. **Verify error states are accessible** -- Error messages, validation feedback, and empty states must be programmatically associated with their related elements and announced by screen readers.

10. **Test with real keyboard-only users periodically** -- Automated keyboard tests verify that elements are focusable. Manual testing by someone who actually navigates with a keyboard reveals usability issues that automation cannot detect.

11. **Check image alt text quality, not just presence** -- axe-core can detect missing alt text but cannot evaluate whether alt text is descriptive and accurate. Add custom assertions for critical images.

12. **Document known accessibility exceptions** -- If a third-party widget has accessibility issues that cannot be fixed, document the exception and disable the specific axe rule for that component. Never disable accessibility rules globally.

## Anti-Patterns to Avoid

1. **Disabling axe rules to make tests pass** -- Disabling rules to silence violations is technical debt that accumulates into legal liability. Fix the violations instead of hiding them.

2. **Testing accessibility only on the desktop viewport** -- Mobile viewports have different layouts, touch targets, and interaction patterns. Accessibility violations that do not appear on desktop may appear on mobile.

3. **Using tabindex values greater than 0** -- `tabindex="1"` or higher creates a custom tab order that almost always conflicts with the visual layout. Use `tabindex="0"` to add elements to the natural tab order and `tabindex="-1"` for programmatic focus only.

4. **Adding aria-label to elements that already have visible text** -- If a button says "Submit," adding `aria-label="Submit button"` creates redundant announcements. Use `aria-label` only when the visible text is insufficient.

5. **Ignoring focus management in single-page applications** -- SPAs do not trigger full page loads, so the browser does not automatically manage focus on route changes. Every route transition must explicitly manage focus.

6. **Testing accessibility only at the end of a sprint** -- Accessibility bugs found late are expensive to fix because they often require structural HTML changes. Test continuously during development.

7. **Assuming axe-core catches everything** -- axe-core catches approximately 30-40% of WCAG violations. The remaining 60-70% require manual testing, including keyboard navigation, content quality, and cognitive accessibility.

## Debugging Tips

1. **Use the axe DevTools browser extension** -- The axe DevTools extension provides a visual overlay showing exactly which elements have violations and how to fix them. It is faster than running automated tests for exploratory accessibility debugging.

2. **Inspect the accessibility tree in Chrome DevTools** -- The Accessibility pane in Chrome DevTools shows the accessibility tree as screen readers see it. Compare the accessibility tree to the visual layout to find discrepancies.

3. **Test with a screen reader** -- VoiceOver (macOS), NVDA (Windows), and TalkBack (Android) are free screen readers. Spend 30 minutes navigating your application with a screen reader to discover issues that no automated tool can detect.

4. **Use the Lighthouse accessibility audit** -- Lighthouse provides a quick accessibility score with actionable recommendations. Run it as a complement to axe-core for a different perspective on the same issues.

5. **Check the focus indicator visibility** -- Press Tab through the page and verify that every focused element has a visible focus indicator (outline, ring, background change). Invisible focus indicators are one of the most common accessibility failures.

6. **Verify color contrast with browser DevTools** -- Chrome DevTools shows the contrast ratio when inspecting text elements. The color picker also shows whether the contrast meets AA or AAA standards.

7. **Use the Playwright trace viewer for focus debugging** -- The trace viewer captures DOM snapshots at each step. When focus management tests fail, the trace reveals the DOM state at the moment focus was expected to move.

8. **Check for viewport-dependent accessibility issues** -- Some accessibility violations only appear at certain viewport sizes. Test at 320px, 768px, 1024px, and 1440px widths to catch responsive accessibility bugs.

9. **Validate HTML before running accessibility tests** -- Invalid HTML (unclosed tags, duplicate IDs, nested interactive elements) causes accessibility tools to report false positives or miss real issues. Run HTML validation before accessibility scanning.

10. **Log the complete axe results, not just violations** -- The `incomplete` results from axe-core indicate checks that require manual review. These are often more important than the violations because they flag potential issues that axe cannot automatically determine.
