---
name: UX Friction Logger
description: Identify and log user experience friction points including excessive clicks, confusing navigation, slow interactions, and workflow bottlenecks through automated heuristic analysis
version: 1.0.0
author: Pramod
license: MIT
tags: [ux-testing, friction, usability, click-tracking, workflow-analysis, interaction-cost, usability-heuristics]
testingTypes: [e2e]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# UX Friction Logger Skill

You are an expert UX quality engineer specializing in automated friction detection and usability heuristic analysis. When asked to identify, log, or remediate user experience friction points, follow these comprehensive instructions to systematically uncover workflow bottlenecks, excessive interaction costs, and confusing navigation patterns.

## Core Principles

1. **Every Click Has a Cost** -- Each additional click, scroll, or interaction a user must perform increases cognitive load and the probability of abandonment. Measure interaction cost quantitatively and set strict budgets for critical user journeys.

2. **Friction is Contextual** -- What constitutes friction depends on user intent, device capability, and task urgency. A five-step checkout may be acceptable for a high-value purchase but unacceptable for a quick reorder. Always evaluate friction relative to the task criticality.

3. **Progressive Disclosure Over Information Overload** -- Presenting all options at once creates decision paralysis. Test that interfaces reveal complexity gradually and that primary actions are immediately visible without scrolling or hunting.

4. **Error Recovery Should Be Effortless** -- The cost of recovering from an error must not exceed the cost of the original task. Measure how many additional steps a user needs after encountering an error to return to their intended workflow.

5. **Consistency Reduces Cognitive Load** -- Inconsistent patterns across pages force users to relearn interactions. Audit for consistency in navigation placement, button labeling, form behavior, and feedback mechanisms.

6. **Invisible Friction is Still Friction** -- Users may not consciously notice micro-frustrations like slightly too-small click targets, 200ms delays before feedback, or subtle layout shifts, but these accumulate into overall dissatisfaction. Instrument everything.

7. **Measure, Don't Assume** -- Gut feelings about UX quality are unreliable. Automate quantitative measurement of click counts, time-on-task, scroll depth, and error rates so that friction is tracked objectively across releases.

## Project Structure

```
project-root/
  tests/
    friction/
      config/
        friction.config.ts        # Thresholds and scoring rules
        workflows.ts              # Defined user journey maps
      helpers/
        click-tracker.ts          # Click counting and path recording
        scroll-analyzer.ts        # Scroll depth measurement
        timing-collector.ts       # Interaction timing utilities
        navigation-mapper.ts      # Navigation depth and dead-end detection
        heuristic-scorer.ts       # Nielsen heuristic evaluation scoring
      specs/
        click-to-completion.spec.ts
        navigation-depth.spec.ts
        form-interaction.spec.ts
        error-recovery.spec.ts
        tooltip-dependency.spec.ts
        dead-end-detection.spec.ts
        workflow-steps.spec.ts
        scroll-depth.spec.ts
        heuristic-evaluation.spec.ts
      reports/
        friction-report.ts        # HTML/JSON report generator
  playwright.config.ts
```

## Setting Up the Friction Logger

### Installation and Configuration

```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Friction Configuration

```typescript
// tests/friction/config/friction.config.ts

export interface FrictionThresholds {
  maxClicksToComplete: number;
  maxNavigationDepth: number;
  maxFormFieldTime: number;       // milliseconds per field
  maxErrorRecoverySteps: number;
  maxScrollDepthForCritical: number; // percentage
  maxWorkflowSteps: number;
  maxTooltipDependencies: number;
  maxTimeToInteractive: number;   // milliseconds
}

export const defaultThresholds: FrictionThresholds = {
  maxClicksToComplete: 5,
  maxNavigationDepth: 3,
  maxFormFieldTime: 8000,
  maxErrorRecoverySteps: 3,
  maxScrollDepthForCritical: 50,
  maxWorkflowSteps: 7,
  maxTooltipDependencies: 2,
  maxTimeToInteractive: 3000,
};

export interface WorkflowDefinition {
  name: string;
  description: string;
  startUrl: string;
  successIndicator: string; // selector or URL pattern
  criticalContent?: string[]; // selectors that must be visible without excessive scrolling
  maxAcceptableClicks: number;
}

export const criticalWorkflows: WorkflowDefinition[] = [
  {
    name: 'User Registration',
    description: 'New user completes signup flow',
    startUrl: '/signup',
    successIndicator: '[data-testid="welcome-dashboard"]',
    maxAcceptableClicks: 4,
  },
  {
    name: 'Product Purchase',
    description: 'User finds and purchases a product',
    startUrl: '/',
    successIndicator: '[data-testid="order-confirmation"]',
    criticalContent: ['[data-testid="add-to-cart"]', '[data-testid="price"]'],
    maxAcceptableClicks: 6,
  },
  {
    name: 'Password Reset',
    description: 'User recovers account access',
    startUrl: '/login',
    successIndicator: '[data-testid="password-updated"]',
    maxAcceptableClicks: 5,
  },
];
```

## Click-to-Completion Counting

Track the total number of clicks required to complete critical user journeys. This is the most fundamental friction metric.

```typescript
// tests/friction/helpers/click-tracker.ts

import { Page } from '@playwright/test';

export interface ClickEvent {
  timestamp: number;
  selector: string;
  tagName: string;
  innerText: string;
  url: string;
  coordinates: { x: number; y: number };
}

export interface ClickTrackingResult {
  totalClicks: number;
  uniqueClicks: number;
  redundantClicks: number;
  clickPath: ClickEvent[];
  timeToComplete: number;
  averageTimeBetweenClicks: number;
}

export class ClickTracker {
  private clicks: ClickEvent[] = [];
  private startTime: number = 0;

  async attach(page: Page): Promise<void> {
    this.clicks = [];
    this.startTime = Date.now();

    await page.exposeFunction('__recordClick', (event: ClickEvent) => {
      this.clicks.push(event);
    });

    await page.addInitScript(() => {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const clickEvent = {
          timestamp: Date.now(),
          selector: target.getAttribute('data-testid') || target.id || target.className,
          tagName: target.tagName,
          innerText: target.innerText?.substring(0, 100) || '',
          url: window.location.href,
          coordinates: { x: e.clientX, y: e.clientY },
        };
        (window as any).__recordClick(clickEvent);
      });
    });
  }

  getResults(): ClickTrackingResult {
    const totalClicks = this.clicks.length;
    const uniqueSelectors = new Set(this.clicks.map((c) => `${c.selector}-${c.url}`));
    const redundantClicks = totalClicks - uniqueSelectors.size;

    const intervals = this.clicks
      .slice(1)
      .map((click, i) => click.timestamp - this.clicks[i].timestamp);
    const averageTimeBetweenClicks =
      intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;

    return {
      totalClicks,
      uniqueClicks: uniqueSelectors.size,
      redundantClicks,
      clickPath: this.clicks,
      timeToComplete: this.clicks.length > 0
        ? this.clicks[this.clicks.length - 1].timestamp - this.startTime
        : 0,
      averageTimeBetweenClicks,
    };
  }

  reset(): void {
    this.clicks = [];
    this.startTime = Date.now();
  }
}
```

```typescript
// tests/friction/specs/click-to-completion.spec.ts

import { test, expect } from '@playwright/test';
import { ClickTracker } from '../helpers/click-tracker';
import { criticalWorkflows, defaultThresholds } from '../config/friction.config';

test.describe('Click-to-Completion Analysis', () => {
  let tracker: ClickTracker;

  test.beforeEach(() => {
    tracker = new ClickTracker();
  });

  for (const workflow of criticalWorkflows) {
    test(`${workflow.name}: should complete within ${workflow.maxAcceptableClicks} clicks`, async ({
      page,
    }) => {
      await tracker.attach(page);
      await page.goto(workflow.startUrl);

      // Execute workflow steps -- these would be customized per workflow
      // The test records every click automatically
      await page.click('[data-testid="get-started"]');
      await page.fill('[data-testid="email"]', 'test@example.com');
      await page.click('[data-testid="submit"]');

      const results = tracker.getResults();

      expect(results.totalClicks).toBeLessThanOrEqual(workflow.maxAcceptableClicks);
      expect(results.redundantClicks).toBe(0);
      expect(results.averageTimeBetweenClicks).toBeLessThan(
        defaultThresholds.maxFormFieldTime
      );

      // Log detailed path for analysis
      console.log(`Workflow: ${workflow.name}`);
      console.log(`Total clicks: ${results.totalClicks}`);
      console.log(`Redundant clicks: ${results.redundantClicks}`);
      console.log(`Time to complete: ${results.timeToComplete}ms`);
      results.clickPath.forEach((click, i) => {
        console.log(`  Step ${i + 1}: ${click.tagName} "${click.innerText}" on ${click.url}`);
      });
    });
  }
});
```

## Navigation Depth Analysis

Measure how deep in the navigation hierarchy users must go to reach important content. Deep nesting creates disorientation and abandonment.

```typescript
// tests/friction/helpers/navigation-mapper.ts

import { Page } from '@playwright/test';

export interface NavigationNode {
  url: string;
  title: string;
  depth: number;
  parent: string | null;
  children: string[];
  isDeadEnd: boolean;
  hasBackNavigation: boolean;
  breadcrumbPresent: boolean;
}

export interface NavigationMap {
  nodes: Map<string, NavigationNode>;
  maxDepth: number;
  deadEnds: string[];
  orphanPages: string[];
  averageDepth: number;
}

export class NavigationMapper {
  private visited: Map<string, NavigationNode> = new Map();
  private maxCrawlDepth: number;

  constructor(maxCrawlDepth: number = 5) {
    this.maxCrawlDepth = maxCrawlDepth;
  }

  async mapNavigation(page: Page, startUrl: string): Promise<NavigationMap> {
    await this.crawl(page, startUrl, 0, null);
    return this.buildMap();
  }

  private async crawl(
    page: Page,
    url: string,
    depth: number,
    parentUrl: string | null
  ): Promise<void> {
    if (depth > this.maxCrawlDepth || this.visited.has(url)) return;

    await page.goto(url, { waitUntil: 'networkidle' });

    const title = await page.title();
    const links = await page.$$eval('a[href]', (anchors) =>
      anchors
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith(window.location.origin))
    );

    const hasBreadcrumb = await page.$('[aria-label="breadcrumb"], .breadcrumb, nav.breadcrumbs')
      .then((el) => el !== null);

    const hasBackButton = await page
      .$('a[href*="back"], button[aria-label*="back"], [data-testid="back-button"]')
      .then((el) => el !== null);

    const internalLinks = links.filter(
      (link) => !link.includes('#') && !link.includes('mailto:')
    );

    const node: NavigationNode = {
      url,
      title,
      depth,
      parent: parentUrl,
      children: internalLinks,
      isDeadEnd: internalLinks.length === 0,
      hasBackNavigation: hasBackButton || hasBreadcrumb,
      breadcrumbPresent: hasBreadcrumb,
    };

    this.visited.set(url, node);

    for (const link of internalLinks.slice(0, 10)) {
      await this.crawl(page, link, depth + 1, url);
    }
  }

  private buildMap(): NavigationMap {
    const nodes = this.visited;
    const deadEnds = Array.from(nodes.values())
      .filter((n) => n.isDeadEnd)
      .map((n) => n.url);

    const orphanPages = Array.from(nodes.values())
      .filter((n) => n.depth > 0 && !n.hasBackNavigation)
      .map((n) => n.url);

    const depths = Array.from(nodes.values()).map((n) => n.depth);
    const maxDepth = Math.max(...depths, 0);
    const averageDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;

    return { nodes, maxDepth, deadEnds, orphanPages, averageDepth };
  }
}
```

```typescript
// tests/friction/specs/navigation-depth.spec.ts

import { test, expect } from '@playwright/test';
import { NavigationMapper } from '../helpers/navigation-mapper';
import { defaultThresholds } from '../config/friction.config';

test.describe('Navigation Depth Analysis', () => {
  test('should not exceed maximum navigation depth', async ({ page }) => {
    const mapper = new NavigationMapper(defaultThresholds.maxNavigationDepth + 1);
    const navMap = await mapper.mapNavigation(page, '/');

    expect(navMap.maxDepth).toBeLessThanOrEqual(defaultThresholds.maxNavigationDepth);

    if (navMap.maxDepth > defaultThresholds.maxNavigationDepth) {
      console.log('Pages exceeding depth threshold:');
      navMap.nodes.forEach((node) => {
        if (node.depth > defaultThresholds.maxNavigationDepth) {
          console.log(`  Depth ${node.depth}: ${node.url} - "${node.title}"`);
        }
      });
    }
  });

  test('should have no dead-end pages', async ({ page }) => {
    const mapper = new NavigationMapper();
    const navMap = await mapper.mapNavigation(page, '/');

    expect(navMap.deadEnds).toHaveLength(0);

    if (navMap.deadEnds.length > 0) {
      console.log('Dead-end pages found (no outgoing navigation):');
      navMap.deadEnds.forEach((url) => console.log(`  ${url}`));
    }
  });

  test('should have breadcrumbs on pages deeper than level 1', async ({ page }) => {
    const mapper = new NavigationMapper();
    const navMap = await mapper.mapNavigation(page, '/');

    const deepPagesWithoutBreadcrumbs = Array.from(navMap.nodes.values()).filter(
      (node) => node.depth > 1 && !node.breadcrumbPresent
    );

    expect(deepPagesWithoutBreadcrumbs).toHaveLength(0);
  });
});
```

## Form Field Interaction Time Measurement

Measure how long users spend on each form field to identify confusing labels, unclear validation, or unnecessarily complex inputs.

```typescript
// tests/friction/specs/form-interaction.spec.ts

import { test, expect } from '@playwright/test';

interface FieldInteraction {
  fieldName: string;
  fieldType: string;
  focusTime: number;
  blurTime: number;
  duration: number;
  changeCount: number;
  hadError: boolean;
  errorMessage: string | null;
}

test.describe('Form Field Interaction Time', () => {
  test('should track interaction time per form field', async ({ page }) => {
    const interactions: FieldInteraction[] = [];

    await page.exposeFunction('__recordFieldInteraction', (interaction: FieldInteraction) => {
      interactions.push(interaction);
    });

    await page.addInitScript(() => {
      const fieldData = new Map<
        HTMLElement,
        { focusTime: number; changeCount: number }
      >();

      document.addEventListener('focusin', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('input, select, textarea')) {
          fieldData.set(target, { focusTime: Date.now(), changeCount: 0 });
        }
      });

      document.addEventListener('input', (e) => {
        const target = e.target as HTMLElement;
        const data = fieldData.get(target);
        if (data) data.changeCount++;
      });

      document.addEventListener('focusout', (e) => {
        const target = e.target as HTMLInputElement;
        const data = fieldData.get(target);
        if (!data) return;

        const errorEl = target.closest('.form-group')?.querySelector('.error-message, [role="alert"]');

        const interaction: FieldInteraction = {
          fieldName: target.name || target.id || target.getAttribute('aria-label') || 'unknown',
          fieldType: target.type || target.tagName.toLowerCase(),
          focusTime: data.focusTime,
          blurTime: Date.now(),
          duration: Date.now() - data.focusTime,
          changeCount: data.changeCount,
          hadError: errorEl !== null,
          errorMessage: errorEl?.textContent || null,
        };

        (window as any).__recordFieldInteraction(interaction);
        fieldData.delete(target);
      });
    });

    await page.goto('/signup');

    // Simulate user filling out a form
    await page.fill('[name="firstName"]', 'Jane');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'jane@example.com');
    await page.fill('[name="password"]', 'SecureP@ss123');
    await page.fill('[name="confirmPassword"]', 'SecureP@ss123');
    await page.click('[type="submit"]');

    // Wait for interactions to be recorded
    await page.waitForTimeout(500);

    // Analyze results
    const slowFields = interactions.filter((f) => f.duration > 8000);
    const errorFields = interactions.filter((f) => f.hadError);
    const multiChangeFields = interactions.filter((f) => f.changeCount > 5);

    expect(slowFields).toHaveLength(0);

    console.log('Form interaction analysis:');
    interactions.forEach((field) => {
      const flags = [];
      if (field.duration > 8000) flags.push('SLOW');
      if (field.hadError) flags.push('ERROR');
      if (field.changeCount > 5) flags.push('HIGH-EDITS');
      console.log(
        `  ${field.fieldName} (${field.fieldType}): ${field.duration}ms, ${field.changeCount} changes ${flags.join(' ')}`
      );
    });
  });
});
```

## Error Recovery Effort Tracking

Measure how many additional steps a user needs to recover from an error state and return to their intended workflow.

```typescript
// tests/friction/specs/error-recovery.spec.ts

import { test, expect } from '@playwright/test';
import { ClickTracker } from '../helpers/click-tracker';
import { defaultThresholds } from '../config/friction.config';

test.describe('Error Recovery Effort', () => {
  test('should recover from invalid form submission within threshold', async ({ page }) => {
    const tracker = new ClickTracker();
    await tracker.attach(page);

    await page.goto('/checkout');

    // Submit form with intentionally bad data to trigger errors
    await page.fill('[name="email"]', 'not-an-email');
    await page.fill('[name="cardNumber"]', '1234');
    await page.click('[data-testid="submit-payment"]');

    // Wait for error state
    await page.waitForSelector('[role="alert"], .error-message');

    // Record the starting point of error recovery
    tracker.reset();

    // Simulate recovery: fix the errors
    await page.fill('[name="email"]', 'valid@example.com');
    await page.fill('[name="cardNumber"]', '4111111111111111');
    await page.click('[data-testid="submit-payment"]');

    const results = tracker.getResults();

    expect(results.totalClicks).toBeLessThanOrEqual(defaultThresholds.maxErrorRecoverySteps);

    console.log(`Error recovery required ${results.totalClicks} clicks`);
    console.log(`Recovery time: ${results.timeToComplete}ms`);
  });

  test('should preserve valid form data after validation error', async ({ page }) => {
    await page.goto('/signup');

    await page.fill('[name="firstName"]', 'Jane');
    await page.fill('[name="lastName"]', 'Doe');
    await page.fill('[name="email"]', 'invalid-email');
    await page.click('[type="submit"]');

    await page.waitForSelector('[role="alert"]');

    // Valid fields should still have their values
    const firstName = await page.inputValue('[name="firstName"]');
    const lastName = await page.inputValue('[name="lastName"]');

    expect(firstName).toBe('Jane');
    expect(lastName).toBe('Doe');
  });

  test('should focus on first error field after validation failure', async ({ page }) => {
    await page.goto('/signup');

    await page.click('[type="submit"]'); // Submit empty form

    await page.waitForSelector('[role="alert"]');

    // The first invalid field should be focused
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return {
        tagName: el.tagName,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
      };
    });

    expect(focusedElement.tagName).toMatch(/INPUT|SELECT|TEXTAREA/);
  });
});
```

## Tooltip and Help Dependency Detection

Identify when users are forced to rely on tooltips, help icons, or external documentation to understand basic interface elements.

```typescript
// tests/friction/specs/tooltip-dependency.spec.ts

import { test, expect } from '@playwright/test';
import { defaultThresholds } from '../config/friction.config';

test.describe('Tooltip and Help Dependency', () => {
  test('should not require tooltips for primary actions', async ({ page }) => {
    await page.goto('/dashboard');

    // Find all elements with tooltips or help icons
    const tooltipElements = await page.$$eval(
      '[title], [data-tooltip], [aria-describedby], .tooltip-trigger, [data-tip]',
      (elements) =>
        elements.map((el) => ({
          text: el.textContent?.trim().substring(0, 50),
          tooltip: el.getAttribute('title') || el.getAttribute('data-tooltip') || '',
          tagName: el.tagName,
          isPrimaryAction: el.matches(
            'button.primary, [data-testid*="primary"], .btn-primary, a.cta'
          ),
        }))
    );

    const primaryActionsWithTooltips = tooltipElements.filter((el) => el.isPrimaryAction);

    // Primary actions should be self-explanatory without tooltips
    expect(primaryActionsWithTooltips).toHaveLength(0);

    // Count total tooltip dependencies
    const helpIcons = await page.$$('[aria-label*="help"], .help-icon, [data-testid*="help"]');

    expect(helpIcons.length).toBeLessThanOrEqual(defaultThresholds.maxTooltipDependencies);

    console.log(`Total tooltip-dependent elements: ${tooltipElements.length}`);
    console.log(`Help icons on page: ${helpIcons.length}`);
  });

  test('should have clear labels on form fields without relying on placeholders', async ({
    page,
  }) => {
    await page.goto('/signup');

    const formFields = await page.$$eval(
      'input:not([type="hidden"]):not([type="submit"]), select, textarea',
      (fields) =>
        fields.map((field) => {
          const id = field.id;
          const hasLabel = id
            ? document.querySelector(`label[for="${id}"]`) !== null
            : field.closest('label') !== null;
          const hasAriaLabel = field.hasAttribute('aria-label');
          const hasPlaceholder = field.hasAttribute('placeholder');
          const placeholderOnly = !hasLabel && !hasAriaLabel && hasPlaceholder;

          return {
            name: field.getAttribute('name') || field.id || 'unknown',
            type: field.getAttribute('type') || field.tagName.toLowerCase(),
            hasLabel,
            hasAriaLabel,
            hasPlaceholder,
            placeholderOnly,
          };
        })
    );

    const placeholderOnlyFields = formFields.filter((f) => f.placeholderOnly);

    expect(placeholderOnlyFields).toHaveLength(0);

    if (placeholderOnlyFields.length > 0) {
      console.log('Fields relying only on placeholder text (friction risk):');
      placeholderOnlyFields.forEach((f) => console.log(`  ${f.name} (${f.type})`));
    }
  });
});
```

## Dead-End Page Identification

```typescript
// tests/friction/specs/dead-end-detection.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Dead-End Page Detection', () => {
  test('404 pages should provide navigation options', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz');

    expect(response?.status()).toBe(404);

    const hasHomeLink = await page.$('a[href="/"]').then((el) => el !== null);
    const hasSearchBox = await page
      .$('input[type="search"], [data-testid="search"]')
      .then((el) => el !== null);
    const hasNavigation = await page.$('nav').then((el) => el !== null);

    const hasEscapeRoute = hasHomeLink || hasSearchBox || hasNavigation;
    expect(hasEscapeRoute).toBe(true);
  });

  test('empty search results should provide alternative paths', async ({ page }) => {
    await page.goto('/search?q=xyznonexistentqueryzyx');

    const emptyState = await page.$('[data-testid="empty-results"], .no-results');
    if (emptyState) {
      const hasSuggestions = await page
        .$('[data-testid="search-suggestions"], .suggestions')
        .then((el) => el !== null);
      const hasClearAction = await page
        .$('[data-testid="clear-search"], .clear-search')
        .then((el) => el !== null);
      const hasCategoryLinks = await page
        .$('[data-testid="browse-categories"], .category-links')
        .then((el) => el !== null);

      const hasAlternative = hasSuggestions || hasClearAction || hasCategoryLinks;
      expect(hasAlternative).toBe(true);
    }
  });

  test('completed workflow should offer next steps', async ({ page }) => {
    // Navigate to a completed state (e.g., order confirmation)
    await page.goto('/order-confirmation/test-123');

    const nextStepElements = await page.$$eval(
      'a, button',
      (elements) =>
        elements
          .filter((el) => {
            const text = el.textContent?.toLowerCase() || '';
            return (
              text.includes('continue') ||
              text.includes('dashboard') ||
              text.includes('home') ||
              text.includes('view order') ||
              text.includes('next')
            );
          })
          .map((el) => el.textContent?.trim())
    );

    expect(nextStepElements.length).toBeGreaterThan(0);
  });
});
```

## Workflow Step Counting

```typescript
// tests/friction/specs/workflow-steps.spec.ts

import { test, expect } from '@playwright/test';
import { defaultThresholds } from '../config/friction.config';

interface WorkflowStep {
  stepNumber: number;
  pageUrl: string;
  pageTitle: string;
  primaryAction: string;
  timeOnStep: number;
}

test.describe('Workflow Step Counting', () => {
  test('checkout workflow should not exceed step threshold', async ({ page }) => {
    const steps: WorkflowStep[] = [];
    let stepNumber = 0;

    const recordStep = async (action: string) => {
      stepNumber++;
      steps.push({
        stepNumber,
        pageUrl: page.url(),
        pageTitle: await page.title(),
        primaryAction: action,
        timeOnStep: Date.now(),
      });
    };

    await page.goto('/products/example-product');
    await recordStep('View product');

    await page.click('[data-testid="add-to-cart"]');
    await recordStep('Add to cart');

    await page.click('[data-testid="go-to-cart"]');
    await recordStep('View cart');

    await page.click('[data-testid="proceed-to-checkout"]');
    await recordStep('Begin checkout');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="address"]', '123 Test St');
    await page.click('[data-testid="continue-to-payment"]');
    await recordStep('Enter shipping info');

    await page.fill('[name="cardNumber"]', '4111111111111111');
    await page.click('[data-testid="place-order"]');
    await recordStep('Place order');

    expect(steps.length).toBeLessThanOrEqual(defaultThresholds.maxWorkflowSteps);

    console.log('Checkout workflow steps:');
    steps.forEach((step) => {
      console.log(`  Step ${step.stepNumber}: ${step.primaryAction} (${step.pageUrl})`);
    });
  });
});
```

## Scroll Depth Analysis for Critical Content

```typescript
// tests/friction/specs/scroll-depth.spec.ts

import { test, expect } from '@playwright/test';
import { defaultThresholds } from '../config/friction.config';

test.describe('Scroll Depth Analysis', () => {
  test('critical content should be visible without excessive scrolling', async ({ page }) => {
    await page.goto('/pricing');

    const viewportHeight = page.viewportSize()?.height || 720;
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    const criticalSelectors = [
      '[data-testid="pricing-plans"]',
      '[data-testid="cta-button"]',
      '[data-testid="contact-sales"]',
    ];

    for (const selector of criticalSelectors) {
      const element = await page.$(selector);
      if (!element) continue;

      const boundingBox = await element.boundingBox();
      if (!boundingBox) continue;

      const scrollPercentage = (boundingBox.y / pageHeight) * 100;

      expect(scrollPercentage).toBeLessThanOrEqual(defaultThresholds.maxScrollDepthForCritical);

      if (scrollPercentage > defaultThresholds.maxScrollDepthForCritical) {
        console.log(
          `Critical element "${selector}" requires ${scrollPercentage.toFixed(1)}% scroll depth`
        );
      }
    }
  });

  test('call-to-action should be above the fold', async ({ page }) => {
    await page.goto('/');

    const viewportHeight = page.viewportSize()?.height || 720;

    const ctaElements = await page.$$('[data-testid="primary-cta"], .cta-button, a.cta');
    expect(ctaElements.length).toBeGreaterThan(0);

    const firstCta = ctaElements[0];
    const box = await firstCta.boundingBox();

    expect(box).not.toBeNull();
    if (box) {
      expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight);
    }
  });

  test('should track scroll engagement depth', async ({ page }) => {
    await page.goto('/blog/long-article');

    let maxScrollDepth = 0;

    await page.exposeFunction('__reportScroll', (depth: number) => {
      if (depth > maxScrollDepth) maxScrollDepth = depth;
    });

    await page.addInitScript(() => {
      window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const depth = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        (window as any).__reportScroll(depth);
      });
    });

    // Simulate progressive scrolling
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const scrollSteps = 10;

    for (let i = 1; i <= scrollSteps; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), (pageHeight / scrollSteps) * i);
      await page.waitForTimeout(200);
    }

    console.log(`Maximum scroll depth achieved: ${maxScrollDepth.toFixed(1)}%`);
  });
});
```

## Automated UX Heuristic Evaluation Scoring

Implement Nielsen's 10 usability heuristics as automated checks with quantitative scoring.

```typescript
// tests/friction/helpers/heuristic-scorer.ts

export interface HeuristicResult {
  heuristic: string;
  score: number;       // 0-10
  maxScore: number;
  findings: string[];
  severity: 'pass' | 'minor' | 'major' | 'critical';
}

export interface HeuristicReport {
  overallScore: number;
  maxPossibleScore: number;
  results: HeuristicResult[];
  criticalIssues: string[];
}

export function calculateOverallScore(results: HeuristicResult[]): HeuristicReport {
  const overallScore = results.reduce((sum, r) => sum + r.score, 0);
  const maxPossibleScore = results.reduce((sum, r) => sum + r.maxScore, 0);
  const criticalIssues = results
    .filter((r) => r.severity === 'critical')
    .flatMap((r) => r.findings);

  return { overallScore, maxPossibleScore, results, criticalIssues };
}
```

```typescript
// tests/friction/specs/heuristic-evaluation.spec.ts

import { test, expect } from '@playwright/test';
import { HeuristicResult, calculateOverallScore } from '../helpers/heuristic-scorer';

test.describe('Nielsen Heuristic Evaluation', () => {
  test('should score above minimum heuristic threshold', async ({ page }) => {
    await page.goto('/');
    const results: HeuristicResult[] = [];

    // Heuristic 1: Visibility of System Status
    const hasLoadingIndicators = await page
      .$('[role="progressbar"], .spinner, .loading, [aria-busy]')
      .then((el) => el !== null);
    const hasActiveNavHighlight = await page
      .$('nav [aria-current="page"], nav .active, nav .current')
      .then((el) => el !== null);

    let h1Score = 0;
    const h1Findings: string[] = [];
    if (hasActiveNavHighlight) h1Score += 5;
    else h1Findings.push('No active navigation state indicator found');
    h1Score += 5; // Base score for page loaded state

    results.push({
      heuristic: '1. Visibility of System Status',
      score: h1Score,
      maxScore: 10,
      findings: h1Findings,
      severity: h1Score < 5 ? 'major' : 'pass',
    });

    // Heuristic 2: Match Between System and Real World
    const buttonLabels = await page.$$eval('button, a.btn, [role="button"]', (els) =>
      els.map((el) => el.textContent?.trim() || '')
    );
    const jargonPatterns = /\b(null|undefined|error code|exception|stack trace|NaN|blob|mutex)\b/i;
    const jargonButtons = buttonLabels.filter((label) => jargonPatterns.test(label));

    let h2Score = jargonButtons.length === 0 ? 10 : Math.max(0, 10 - jargonButtons.length * 3);
    results.push({
      heuristic: '2. Match Between System and Real World',
      score: h2Score,
      maxScore: 10,
      findings: jargonButtons.map((label) => `Technical jargon in UI: "${label}"`),
      severity: h2Score < 5 ? 'major' : h2Score < 8 ? 'minor' : 'pass',
    });

    // Heuristic 3: User Control and Freedom
    const hasUndoCapability = await page
      .$('[data-testid="undo"], [aria-label*="undo"], .undo')
      .then((el) => el !== null);
    const hasBackNavigation = await page
      .$('a[href*="back"], [data-testid="back"], nav')
      .then((el) => el !== null);

    let h3Score = 0;
    if (hasBackNavigation) h3Score += 5;
    if (hasUndoCapability) h3Score += 5;
    else h3Score += 2; // Partial credit if back nav exists

    results.push({
      heuristic: '3. User Control and Freedom',
      score: Math.min(h3Score, 10),
      maxScore: 10,
      findings: hasUndoCapability ? [] : ['No undo capability detected'],
      severity: h3Score < 5 ? 'major' : 'pass',
    });

    // Heuristic 4: Consistency and Standards
    const buttonStyles = await page.$$eval('button, .btn', (buttons) => {
      return buttons.map((btn) => {
        const style = window.getComputedStyle(btn);
        return `${style.borderRadius}-${style.fontSize}-${style.fontFamily}`;
      });
    });

    const uniqueStyles = new Set(buttonStyles);
    const consistencyRatio =
      buttonStyles.length > 0 ? 1 - (uniqueStyles.size - 1) / buttonStyles.length : 1;
    let h4Score = Math.round(consistencyRatio * 10);

    results.push({
      heuristic: '4. Consistency and Standards',
      score: h4Score,
      maxScore: 10,
      findings:
        uniqueStyles.size > 3
          ? [`Found ${uniqueStyles.size} distinct button styles -- consider standardizing`]
          : [],
      severity: h4Score < 5 ? 'major' : 'pass',
    });

    // Heuristic 5: Error Prevention
    const hasConfirmDialogs = await page
      .$('[data-testid="confirm-dialog"], [role="alertdialog"]')
      .then((el) => el !== null);
    const hasInputConstraints = await page
      .$$eval('input', (inputs) =>
        inputs.some(
          (i) =>
            i.hasAttribute('maxlength') ||
            i.hasAttribute('pattern') ||
            i.hasAttribute('required') ||
            i.type === 'number'
        )
      );

    let h5Score = 0;
    if (hasInputConstraints) h5Score += 5;
    h5Score += 5; // Base score

    results.push({
      heuristic: '5. Error Prevention',
      score: Math.min(h5Score, 10),
      maxScore: 10,
      findings: hasInputConstraints ? [] : ['No input validation constraints found'],
      severity: h5Score < 5 ? 'major' : 'pass',
    });

    // Calculate overall score
    const report = calculateOverallScore(results);

    console.log('\n=== UX Heuristic Evaluation Report ===');
    console.log(`Overall Score: ${report.overallScore}/${report.maxPossibleScore}`);
    console.log('');
    report.results.forEach((r) => {
      console.log(`${r.heuristic}: ${r.score}/${r.maxScore} [${r.severity}]`);
      r.findings.forEach((f) => console.log(`  - ${f}`));
    });

    if (report.criticalIssues.length > 0) {
      console.log('\nCritical Issues:');
      report.criticalIssues.forEach((issue) => console.log(`  - ${issue}`));
    }

    // Assert minimum acceptable score (60% overall)
    const minimumAcceptable = report.maxPossibleScore * 0.6;
    expect(report.overallScore).toBeGreaterThanOrEqual(minimumAcceptable);
  });
});
```

## Friction Report Generator

```typescript
// tests/friction/reports/friction-report.ts

import * as fs from 'fs';

export interface FrictionFinding {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  page: string;
  description: string;
  metric: string;
  value: number;
  threshold: number;
  recommendation: string;
}

export class FrictionReportGenerator {
  private findings: FrictionFinding[] = [];

  addFinding(finding: FrictionFinding): void {
    this.findings.push(finding);
  }

  generateJSON(outputPath: string): void {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        total: this.findings.length,
        critical: this.findings.filter((f) => f.severity === 'critical').length,
        high: this.findings.filter((f) => f.severity === 'high').length,
        medium: this.findings.filter((f) => f.severity === 'medium').length,
        low: this.findings.filter((f) => f.severity === 'low').length,
      },
      findings: this.findings,
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  }

  generateHTML(outputPath: string): void {
    const severityColors: Record<string, string> = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#2563eb',
    };

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>UX Friction Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    .finding { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0; }
    .severity { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 12px; }
    .metric { font-family: monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>UX Friction Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <h2>Summary: ${this.findings.length} findings</h2>
  ${this.findings
    .map(
      (f) => `
    <div class="finding">
      <span class="severity" style="background: ${severityColors[f.severity]}">${f.severity}</span>
      <strong>${f.category}</strong> on <code>${f.page}</code>
      <p>${f.description}</p>
      <p>Metric: <span class="metric">${f.metric} = ${f.value}</span> (threshold: ${f.threshold})</p>
      <p><em>Recommendation: ${f.recommendation}</em></p>
    </div>`
    )
    .join('')}
</body>
</html>`;

    fs.writeFileSync(outputPath, html);
  }
}
```

## Configuration

### Playwright Configuration

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/friction',
  fullyParallel: false, // Sequential for accurate timing
  retries: 0,           // Friction tests should not retry
  timeout: 60000,       // Longer timeout for navigation crawling
  reporter: [
    ['html', { outputFolder: 'friction-reports' }],
    ['json', { outputFile: 'friction-results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'Desktop Friction',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Friction',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'Tablet Friction',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
});
```

### Environment Configuration

```bash
# .env.friction
BASE_URL=http://localhost:3000
FRICTION_MAX_CLICKS=5
FRICTION_MAX_DEPTH=3
FRICTION_MAX_FIELD_TIME=8000
FRICTION_MAX_RECOVERY_STEPS=3
FRICTION_SCROLL_THRESHOLD=50
FRICTION_MAX_WORKFLOW_STEPS=7
FRICTION_REPORT_FORMAT=html
```

## Best Practices

1. **Define workflows before writing tests.** Document every critical user journey with its start point, success criteria, and acceptable interaction budget before automating friction checks. Without predefined workflows, friction tests measure noise rather than meaningful user pain.

2. **Use data-testid attributes for stable click tracking.** Class names and DOM structure change frequently. Instrument your application with stable `data-testid` attributes on interactive elements so friction metrics remain consistent across UI redesigns.

3. **Separate friction baselines by device class.** Mobile users tolerate different interaction patterns than desktop users. A five-click checkout may be acceptable on desktop but painful on mobile. Configure separate thresholds per viewport size.

4. **Track friction trends over time, not just pass/fail.** A workflow that passes with four clicks today but was three clicks last sprint is trending in the wrong direction. Store historical metrics and alert on regressions even when absolute thresholds are met.

5. **Measure real interaction timing, not just click counts.** A single click that requires 30 seconds of reading dense help text is worse than three obvious clicks. Combine click counting with time-on-step measurement for a complete friction picture.

6. **Automate heuristic evaluation scoring in CI.** Run Nielsen heuristic checks on every pull request so that UX regressions are caught before merge. Set a minimum acceptable score and block PRs that drop below it.

7. **Include error recovery in every workflow test.** Do not only test the happy path. For each critical workflow, also test the recovery path after the most common error states. Users who encounter errors and cannot recover quickly will leave permanently.

8. **Test with realistic data volumes.** An empty dashboard has zero friction; a dashboard with 500 items may require excessive scrolling or searching. Seed test environments with realistic data quantities to uncover volume-dependent friction.

9. **Map dead-end pages and orphan states.** Regularly crawl your application to identify pages with no outgoing navigation and states that trap users. Every page should offer at least one clear next action.

10. **Score tooltip density as a proxy for learnability.** If a page requires more than two help tooltips for core functionality, the interface design needs simplification. Tooltips are a crutch for poor labeling, not a feature.

11. **Validate progressive disclosure patterns.** Ensure that advanced options are hidden behind expandable sections and that primary actions are immediately visible. Test that expanding advanced options does not push primary actions below the fold.

12. **Test with keyboard-only navigation.** Tab order and focus management are both accessibility and friction concerns. If a keyboard user needs 20 tab presses to reach the primary action, that is friction even for mouse users who scan linearly.

## Anti-Patterns to Avoid

1. **Testing only the happy path.** Measuring friction solely on the ideal user journey ignores the reality that most users encounter at least one error, hesitation, or wrong turn. Always include error recovery and exploratory detour scenarios in your friction analysis.

2. **Using arbitrary click thresholds without user research.** Setting a maximum of three clicks because of a design myth ("the three-click rule") ignores context. Base thresholds on actual user research, competitive benchmarks, or task analysis rather than arbitrary numbers.

3. **Conflating page loads with interaction steps.** A single-page application that handles a five-step wizard in one page load is not necessarily less friction than a multi-page flow. Measure logical interaction steps, not URL changes.

4. **Ignoring cognitive friction.** Counting only physical interactions (clicks, scrolls) while ignoring reading time, decision complexity, and information density misses the most common source of user frustration. Include comprehension metrics in your friction model.

5. **Running friction tests against a development server with zero data.** An empty application feels fast and simple. Real friction emerges when pages are populated with hundreds of items, notifications, and competing calls to action. Always test against realistic data states.

6. **Treating all pages equally.** Landing pages, checkout flows, and admin dashboards have fundamentally different friction tolerances. Apply page-type-specific thresholds rather than a single global standard.

7. **Hardcoding selectors in click trackers.** Using brittle CSS selectors in your tracking scripts means your friction tests break with every UI update, creating maintenance burden that discourages teams from keeping friction tests current.

## Debugging Tips

1. **Friction scores are inconsistent between runs.** This usually indicates timing-dependent measurement. Ensure your click tracker uses `page.exposeFunction` to bridge between browser context and Node.js context rather than relying on `page.evaluate` polling. Also verify that `waitForTimeout` calls are sufficient for async operations to complete.

2. **Navigation mapper crawls infinitely.** Set a strict `maxCrawlDepth` and track visited URLs to prevent cycles. Additionally, filter out query parameter variations of the same page (e.g., `/products?page=1` and `/products?page=2` should be treated as the same template).

3. **Click tracker misses dynamically created elements.** If your application adds interactive elements after initial page load, the click event listener attached via `addInitScript` may not capture clicks on elements rendered by client-side routing. Use event delegation on `document` rather than attaching listeners to individual elements.

4. **Form interaction timing is artificially low.** Automated tests fill forms instantly, producing unrealistically fast interaction times. For meaningful timing analysis, either add deliberate delays to simulate human speed or focus on structural metrics (field count, error frequency) rather than raw timing.

5. **Heuristic evaluation scores are too generous.** Automated heuristic checks can only catch surface-level violations. Complement automated scoring with periodic manual heuristic evaluation by UX professionals. Use the automated score as a regression guard, not a quality certification.

6. **Scroll depth reports zero for single-page apps.** SPAs that use virtual scrolling or overflow containers require scroll measurement on the specific scrollable container, not `window.scrollY`. Identify the scrollable parent element and attach the scroll listener to it directly.

7. **Dead-end detection flags legitimate terminal pages.** Pages like "Thank you for your order" are intentionally terminal. Maintain an allowlist of known terminal pages and exclude them from dead-end alerts. The test should verify that terminal pages offer at least a "Return to home" link, not that they have outgoing navigation to other flows.

8. **Click tracking reports duplicate events.** Some UI libraries fire synthetic click events in addition to native browser clicks. Deduplicate by tracking event timestamps and ignoring events that occur within 50ms of a previous event on the same element.

9. **Navigation mapper produces different results per run.** If your application uses A/B testing, feature flags, or personalization, the navigation structure may genuinely differ between runs. Pin feature flags to consistent values in your test environment configuration to ensure repeatable navigation maps.

10. **Friction tests are too slow for CI.** Full navigation crawling and multi-workflow click tracking can take minutes. Split friction tests into fast checks (individual page heuristics, form analysis) that run on every PR and comprehensive crawls that run nightly.
