---
name: Cognitive Load Analyzer
description: Evaluate interface complexity by measuring information density, decision points, visual hierarchy, and task completion paths to reduce user cognitive burden.
version: 1.0.0
author: Pramod
license: MIT
tags: [cognitive-load, ux, information-architecture, complexity, usability, heuristics]
testingTypes: [e2e, accessibility]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Cognitive Load Analyzer Skill

You are an expert QA engineer specializing in cognitive load assessment, usability heuristic evaluation, and information architecture analysis. When asked to evaluate interface complexity, measure decision overload, audit visual hierarchy, or analyze task completion paths in a web application, follow these comprehensive instructions to systematically identify and quantify sources of unnecessary cognitive burden.

## Core Principles

1. **Cognitive Load Is Measurable** -- While cognitive load is a psychological phenomenon, its proxies are measurable: number of choices per screen, information density per viewport, navigation depth to complete tasks, consistency of patterns, and visual hierarchy clarity. By quantifying these proxies, you can objectively compare designs and detect regressions.

2. **Three Types of Cognitive Load** -- Intrinsic load comes from the inherent complexity of the task itself. Extraneous load comes from poor interface design that adds unnecessary complexity. Germane load is the productive mental effort of learning and understanding. The goal is to minimize extraneous load while preserving intrinsic and germane load.

3. **Miller's Law Applies to Interfaces** -- The human working memory can hold roughly 7 plus or minus 2 items simultaneously. Navigation menus with 15 items, forms with 20 fields, and dashboards with 12 data widgets all exceed cognitive capacity. Chunk information into groups of 5-7 items maximum.

4. **Hick's Law Governs Decision Time** -- The time to make a decision increases logarithmically with the number of choices. A page with 3 clear options is cognitively easy. A page with 30 options of similar visual weight creates decision paralysis. Reduce choices or create clear visual hierarchy to guide attention.

5. **Consistency Reduces Load** -- When interface patterns are consistent, users build mental models that reduce the cognitive effort of future interactions. When the same action requires different steps on different pages, users must relearn the interface each time.

6. **Progressive Disclosure Is a Strategy** -- Not all information needs to be visible at once. Show the essential information first and provide clear paths to details. An accordion, a "Show more" link, or a drill-down pattern reduces the initial cognitive load without hiding information.

7. **Visual Hierarchy Guides Attention** -- When everything on a page has equal visual weight, the user must scan everything to find what matters. Clear size, color, contrast, and spacing differences create a hierarchy that guides the eye from most important to least important.

## Project Structure

Organize your cognitive load analysis suite with this directory structure:

```
tests/
  cognitive-load/
    information-density.spec.ts
    choice-overload.spec.ts
    navigation-complexity.spec.ts
    form-complexity.spec.ts
    visual-hierarchy.spec.ts
    consistency-audit.spec.ts
    task-completion-paths.spec.ts
  fixtures/
    cognitive-page.fixture.ts
  helpers/
    density-calculator.ts
    choice-counter.ts
    hierarchy-analyzer.ts
    consistency-checker.ts
    task-path-tracer.ts
    cognitive-score.ts
  reports/
    cognitive-load-report.json
    cognitive-load-report.html
  thresholds/
    cognitive-thresholds.json
playwright.config.ts
```

Each spec file measures a different dimension of cognitive load. The helpers directory contains the measurement algorithms. Thresholds define the acceptable limits for each metric.

## Detailed Guide

### Step 1: Build an Information Density Calculator

Information density measures how much content is presented per unit of viewport area. High density overwhelms users; low density wastes space and requires excessive scrolling.

```typescript
// helpers/density-calculator.ts
import { Page } from '@playwright/test';

export interface DensityMetrics {
  totalTextElements: number;
  totalWordCount: number;
  totalInteractiveElements: number;
  totalImages: number;
  viewportArea: number;
  visibleContentArea: number;
  textDensity: number;          // words per 1000px of viewport height
  interactiveDensity: number;   // interactive elements per viewport
  informationUnits: number;     // distinct information groups
  densityScore: number;         // 0-100 composite score
}

export class DensityCalculator {
  async calculate(page: Page): Promise<DensityMetrics> {
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('No viewport size available');

    const viewportArea = viewport.width * viewport.height;

    const measurements = await page.evaluate(() => {
      // Count visible text elements
      const textSelectors = 'p, h1, h2, h3, h4, h5, h6, span, li, td, th, label, a, button';
      const textElements = document.querySelectorAll(textSelectors);
      let totalWords = 0;
      let visibleTextElements = 0;

      textElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          const text = el.textContent?.trim();
          if (text && text.length > 0) {
            visibleTextElements++;
            totalWords += text.split(/\s+/).filter((w) => w.length > 0).length;
          }
        }
      });

      // Count interactive elements visible in the viewport
      const interactiveSelectors = [
        'a[href]', 'button', 'input', 'select', 'textarea',
        '[role="button"]', '[role="link"]', '[role="tab"]',
        '[role="menuitem"]', '[onclick]', '[tabindex]:not([tabindex="-1"])',
      ];
      const interactiveElements = document.querySelectorAll(interactiveSelectors.join(', '));
      let visibleInteractive = 0;
      interactiveElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
          visibleInteractive++;
        }
      });

      // Count images in viewport
      const images = document.querySelectorAll('img, svg, [role="img"]');
      let visibleImages = 0;
      images.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight) {
          visibleImages++;
        }
      });

      // Calculate visible content area
      const bodyRect = document.body.getBoundingClientRect();
      const visibleContentArea = Math.min(bodyRect.height, window.innerHeight) * bodyRect.width;

      // Count distinct information groups (sections, cards, panels)
      const groupSelectors = 'section, article, .card, .panel, [role="region"], [role="group"], fieldset';
      const groups = document.querySelectorAll(groupSelectors);
      let visibleGroups = 0;
      groups.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight) {
          visibleGroups++;
        }
      });

      return {
        visibleTextElements,
        totalWords,
        visibleInteractive,
        visibleImages,
        visibleContentArea,
        visibleGroups,
      };
    });

    const viewportHeightK = viewport.height / 1000;
    const textDensity = measurements.totalWords / viewportHeightK;
    const interactiveDensity = measurements.visibleInteractive;

    // Composite density score (0-100, lower is less dense)
    let densityScore = 50;
    if (textDensity > 500) densityScore += 15;
    if (textDensity > 800) densityScore += 15;
    if (textDensity < 100) densityScore -= 10;
    if (interactiveDensity > 20) densityScore += 10;
    if (interactiveDensity > 40) densityScore += 10;
    if (measurements.visibleGroups > 8) densityScore += 10;
    densityScore = Math.max(0, Math.min(100, densityScore));

    return {
      totalTextElements: measurements.visibleTextElements,
      totalWordCount: measurements.totalWords,
      totalInteractiveElements: measurements.visibleInteractive,
      totalImages: measurements.visibleImages,
      viewportArea,
      visibleContentArea: measurements.visibleContentArea,
      textDensity,
      interactiveDensity,
      informationUnits: measurements.visibleGroups,
      densityScore,
    };
  }
}
```

### Step 2: Build a Choice Overload Counter

Choice overload occurs when users face too many options of similar visual weight, causing decision paralysis.

```typescript
// helpers/choice-counter.ts
import { Page } from '@playwright/test';

export interface ChoiceMetrics {
  navigationItemCount: number;
  formFieldCount: number;
  callToActionCount: number;
  filterOptionCount: number;
  tabCount: number;
  cardChoiceCount: number;
  totalDecisionPoints: number;
  choiceOverloadScore: number;  // 0-100, higher = more overload
  issues: string[];
}

export class ChoiceCounter {
  async count(page: Page): Promise<ChoiceMetrics> {
    const metrics = await page.evaluate(() => {
      const issues: string[] = [];

      // Count top-level navigation items
      const navItems = document.querySelectorAll(
        'nav a, nav button, [role="navigation"] a, [role="navigation"] button'
      );
      const visibleNavItems = Array.from(navItems).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const navigationItemCount = visibleNavItems.length;
      if (navigationItemCount > 7) {
        issues.push(`Navigation has ${navigationItemCount} items (recommended: 5-7)`);
      }

      // Count visible form fields
      const formFields = document.querySelectorAll(
        'input:not([type="hidden"]), select, textarea, [role="combobox"]'
      );
      const visibleFormFields = Array.from(formFields).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight;
      });
      const formFieldCount = visibleFormFields.length;
      if (formFieldCount > 7) {
        issues.push(`${formFieldCount} form fields visible (recommended: 3-5 per step)`);
      }

      // Count call-to-action buttons
      const ctaButtons = document.querySelectorAll(
        'button[type="submit"], .btn-primary, .cta, [data-testid*="cta"]'
      );
      const visibleCTAs = Array.from(ctaButtons).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight;
      });
      const callToActionCount = visibleCTAs.length;
      if (callToActionCount > 2) {
        issues.push(`${callToActionCount} CTAs competing for attention (recommended: 1-2)`);
      }

      // Count filter options
      const filterElements = document.querySelectorAll(
        '[data-testid*="filter"], .filter-option, .facet'
      );
      const filterOptionCount = filterElements.length;
      if (filterOptionCount > 10) {
        issues.push(`${filterOptionCount} filter options visible (use progressive disclosure)`);
      }

      // Count tabs
      const tabs = document.querySelectorAll('[role="tab"], .tab, .nav-tab');
      const tabCount = tabs.length;
      if (tabCount > 6) {
        issues.push(`${tabCount} tabs visible (recommended: 4-6, use overflow for more)`);
      }

      // Count choice cards in viewport
      const cards = document.querySelectorAll('.card, article, .product-card, .pricing-card');
      const visibleCards = Array.from(cards).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight;
      });
      const cardChoiceCount = visibleCards.length;
      if (cardChoiceCount > 9) {
        issues.push(`${cardChoiceCount} choice cards in viewport (recommended: 6-9)`);
      }

      return {
        navigationItemCount,
        formFieldCount,
        callToActionCount,
        filterOptionCount,
        tabCount,
        cardChoiceCount,
        issues,
      };
    });

    const totalDecisionPoints =
      metrics.navigationItemCount +
      metrics.formFieldCount +
      metrics.callToActionCount +
      metrics.tabCount +
      metrics.cardChoiceCount;

    let overloadScore = 0;
    if (totalDecisionPoints > 10) overloadScore += 15;
    if (totalDecisionPoints > 20) overloadScore += 15;
    if (totalDecisionPoints > 30) overloadScore += 20;
    if (metrics.navigationItemCount > 7) overloadScore += 10;
    if (metrics.formFieldCount > 7) overloadScore += 10;
    if (metrics.callToActionCount > 2) overloadScore += 10;
    if (metrics.cardChoiceCount > 9) overloadScore += 10;
    if (metrics.tabCount > 6) overloadScore += 10;
    overloadScore = Math.min(100, overloadScore);

    return {
      ...metrics,
      totalDecisionPoints,
      choiceOverloadScore: overloadScore,
    };
  }
}
```

### Step 3: Build a Visual Hierarchy Analyzer

Visual hierarchy determines the order in which users process page information. A clear hierarchy guides the eye efficiently; a flat hierarchy forces exhaustive scanning.

```typescript
// helpers/hierarchy-analyzer.ts
import { Page } from '@playwright/test';

export interface HierarchyMetrics {
  headingLevels: Array<{ level: number; count: number; text: string[] }>;
  headingHierarchyValid: boolean;
  fontSizeVariations: number;
  whitespaceRatio: number;
  primaryActionClear: boolean;
  visualWeightDistribution: 'balanced' | 'top-heavy' | 'flat' | 'clear-hierarchy';
  hierarchyScore: number;  // 0-100, higher is better
  issues: string[];
}

export class HierarchyAnalyzer {
  async analyze(page: Page): Promise<HierarchyMetrics> {
    const data = await page.evaluate(() => {
      const issues: string[] = [];

      // Analyze heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const levelMap = new Map<number, string[]>();
      headings.forEach((h) => {
        const level = parseInt(h.tagName.charAt(1));
        if (!levelMap.has(level)) levelMap.set(level, []);
        levelMap.get(level)?.push(h.textContent?.trim().substring(0, 50) || '');
      });

      const headingLevels = Array.from(levelMap.entries()).map(([level, texts]) => ({
        level,
        count: texts.length,
        text: texts,
      }));

      // Check for skipped heading levels
      const sortedLevels = Array.from(levelMap.keys()).sort();
      let hierarchyValid = true;
      for (let i = 1; i < sortedLevels.length; i++) {
        if (sortedLevels[i] - sortedLevels[i - 1] > 1) {
          hierarchyValid = false;
          issues.push(`Heading hierarchy skips from h${sortedLevels[i - 1]} to h${sortedLevels[i]}`);
        }
      }

      const h1Count = levelMap.get(1)?.length || 0;
      if (h1Count === 0) {
        issues.push('Page has no h1 heading');
        hierarchyValid = false;
      }
      if (h1Count > 1) {
        issues.push(`Page has ${h1Count} h1 headings (recommended: exactly 1)`);
      }

      // Count distinct font sizes
      const allElements = document.querySelectorAll('body *');
      const fontSizes = new Set<string>();
      allElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.display !== 'none' && el.textContent?.trim()) {
          fontSizes.add(style.fontSize);
        }
      });
      const fontSizeVariations = fontSizes.size;
      if (fontSizeVariations > 8) {
        issues.push(`${fontSizeVariations} distinct font sizes (recommended: 4-6)`);
      }

      // Calculate whitespace ratio
      const bodyRect = document.body.getBoundingClientRect();
      const totalArea = bodyRect.width * Math.min(bodyRect.height, window.innerHeight);
      let contentArea = 0;
      const contentEls = document.querySelectorAll(
        'p, h1, h2, h3, h4, h5, h6, img, button, input, select, textarea, table, ul, ol'
      );
      contentEls.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0) {
          contentArea += rect.width * rect.height;
        }
      });
      const whitespaceRatio = totalArea > 0 ? 1 - contentArea / totalArea : 0;
      if (whitespaceRatio < 0.2) {
        issues.push(`Only ${(whitespaceRatio * 100).toFixed(0)}% whitespace (recommended: 30-50%)`);
      }

      // Check primary CTA clarity
      const primaryButtons = document.querySelectorAll(
        'button[type="submit"], .btn-primary, [data-testid*="primary"]'
      );
      let primaryActionClear = false;
      if (primaryButtons.length === 1) {
        const style = window.getComputedStyle(primaryButtons[0]);
        const bg = style.backgroundColor;
        primaryActionClear =
          bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)' && bg !== 'transparent';
      }
      if (primaryButtons.length > 1) {
        issues.push(`${primaryButtons.length} primary CTAs compete for attention`);
      }

      return {
        headingLevels,
        headingHierarchyValid: hierarchyValid,
        fontSizeVariations,
        whitespaceRatio,
        primaryActionClear,
        issues,
      };
    });

    let distribution: HierarchyMetrics['visualWeightDistribution'];
    if (data.headingHierarchyValid && data.whitespaceRatio > 0.3 && data.fontSizeVariations <= 6) {
      distribution = 'clear-hierarchy';
    } else if (data.fontSizeVariations <= 3) {
      distribution = 'flat';
    } else if (data.whitespaceRatio < 0.2) {
      distribution = 'top-heavy';
    } else {
      distribution = 'balanced';
    }

    let score = 50;
    if (data.headingHierarchyValid) score += 15;
    if (data.primaryActionClear) score += 10;
    if (data.whitespaceRatio >= 0.3 && data.whitespaceRatio <= 0.5) score += 10;
    if (data.fontSizeVariations >= 4 && data.fontSizeVariations <= 6) score += 10;
    if (data.fontSizeVariations > 8) score -= 10;
    if (data.whitespaceRatio < 0.2) score -= 15;
    if (!data.headingHierarchyValid) score -= 10;
    score = Math.max(0, Math.min(100, score));

    return {
      ...data,
      visualWeightDistribution: distribution,
      hierarchyScore: score,
    };
  }
}
```

### Step 4: Build a Consistency Checker

Consistency across pages reduces the cognitive cost of learning the interface.

```typescript
// helpers/consistency-checker.ts
import { Page } from '@playwright/test';

export interface ConsistencyIssue {
  category: 'naming' | 'layout' | 'interaction' | 'visual' | 'navigation';
  description: string;
  severity: 'high' | 'medium' | 'low';
  pages: string[];
  recommendation: string;
}

export interface ConsistencyMetrics {
  issues: ConsistencyIssue[];
  consistencyScore: number;
}

export class ConsistencyChecker {
  private snapshots: Array<{
    url: string;
    buttonLabels: string[];
    navStructure: string[];
    headingPattern: string[];
    layoutPattern: string;
  }> = [];

  async captureSnapshot(page: Page): Promise<void> {
    const snapshot = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      const buttonLabels = Array.from(buttons)
        .map((b) => b.textContent?.trim())
        .filter(Boolean) as string[];

      const navLinks = document.querySelectorAll('nav a, [role="navigation"] a');
      const navStructure = Array.from(navLinks)
        .map((a) => a.textContent?.trim())
        .filter(Boolean) as string[];

      const headings = document.querySelectorAll('h1, h2, h3');
      const headingPattern = Array.from(headings).map(
        (h) => `${h.tagName}:${h.textContent?.trim().substring(0, 30)}`
      );

      const mainContent = document.querySelector('main, [role="main"]');
      let layoutPattern = 'unknown';
      if (mainContent) {
        const style = window.getComputedStyle(mainContent);
        if (style.display === 'grid') layoutPattern = 'grid';
        else if (style.display === 'flex') layoutPattern = 'flex';
        else layoutPattern = 'block';
      }

      return { buttonLabels, navStructure, headingPattern, layoutPattern };
    });

    this.snapshots.push({ url: page.url(), ...snapshot });
  }

  analyze(): ConsistencyMetrics {
    const issues: ConsistencyIssue[] = [];

    if (this.snapshots.length < 2) {
      return { issues, consistencyScore: 100 };
    }

    // Check navigation consistency
    const navStructures = this.snapshots.map((s) => JSON.stringify(s.navStructure));
    if (new Set(navStructures).size > 1) {
      issues.push({
        category: 'navigation',
        description: 'Navigation structure differs across pages',
        severity: 'high',
        pages: this.snapshots.map((s) => s.url),
        recommendation: 'Use a consistent navigation component on all pages',
      });
    }

    // Check button label consistency for common actions
    const allLabels = this.snapshots.flatMap((s) => s.buttonLabels);
    const saveVariants = allLabels.filter((l) =>
      /^(save|submit|confirm|apply|done|ok|update)$/i.test(l)
    );
    const uniqueSaveLabels = new Set(saveVariants.map((l) => l.toLowerCase()));
    if (uniqueSaveLabels.size > 2) {
      issues.push({
        category: 'naming',
        description: `Multiple labels for save action: ${Array.from(uniqueSaveLabels).join(', ')}`,
        severity: 'medium',
        pages: this.snapshots.map((s) => s.url),
        recommendation: 'Standardize on a single label for the primary save action',
      });
    }

    const cancelVariants = allLabels.filter((l) =>
      /^(cancel|close|dismiss|back|discard)$/i.test(l)
    );
    const uniqueCancelLabels = new Set(cancelVariants.map((l) => l.toLowerCase()));
    if (uniqueCancelLabels.size > 2) {
      issues.push({
        category: 'naming',
        description: `Multiple labels for cancel action: ${Array.from(uniqueCancelLabels).join(', ')}`,
        severity: 'medium',
        pages: this.snapshots.map((s) => s.url),
        recommendation: 'Standardize on a single label for the cancel action',
      });
    }

    // Check layout consistency
    const layouts = this.snapshots.map((s) => s.layoutPattern);
    if (new Set(layouts).size > 2) {
      issues.push({
        category: 'layout',
        description: `${new Set(layouts).size} different layout patterns across pages`,
        severity: 'medium',
        pages: this.snapshots.map((s) => s.url),
        recommendation: 'Use a consistent layout system for similar page types',
      });
    }

    let score = 100;
    for (const issue of issues) {
      if (issue.severity === 'high') score -= 20;
      else if (issue.severity === 'medium') score -= 10;
      else score -= 5;
    }

    return { issues, consistencyScore: Math.max(0, score) };
  }
}
```

### Step 5: Build a Task Path Tracer

Measuring how many steps common tasks require reveals unnecessary workflow complexity.

```typescript
// helpers/task-path-tracer.ts
import { Page } from '@playwright/test';

export interface TaskStep {
  action: string;
  url: string;
  elementInteracted: string;
  timestamp: number;
  cognitiveEffort: 'low' | 'medium' | 'high';
}

export interface TaskPath {
  taskName: string;
  steps: TaskStep[];
  totalSteps: number;
  totalTimeMs: number;
  pagesVisited: number;
  backtrackCount: number;
  cognitiveScore: number;
}

export class TaskPathTracer {
  private steps: TaskStep[] = [];
  private startTime: number = 0;
  private visitedUrls: Set<string> = new Set();
  private urlSequence: string[] = [];

  startTask(): void {
    this.steps = [];
    this.startTime = Date.now();
    this.visitedUrls = new Set();
    this.urlSequence = [];
  }

  recordStep(
    action: string,
    page: Page,
    elementDescription: string,
    effort: TaskStep['cognitiveEffort'] = 'low'
  ): void {
    const url = page.url();
    this.visitedUrls.add(url);
    this.urlSequence.push(url);

    this.steps.push({
      action,
      url,
      elementInteracted: elementDescription,
      timestamp: Date.now(),
      cognitiveEffort: effort,
    });
  }

  completeTask(taskName: string): TaskPath {
    const totalTimeMs = Date.now() - this.startTime;

    let backtrackCount = 0;
    const seen = new Set<string>();
    for (const url of this.urlSequence) {
      if (seen.has(url)) backtrackCount++;
      seen.add(url);
    }

    let cognitiveScore = 0;
    cognitiveScore += this.steps.length * 5;
    cognitiveScore += backtrackCount * 15;
    cognitiveScore += (this.visitedUrls.size - 1) * 10;
    for (const step of this.steps) {
      if (step.cognitiveEffort === 'high') cognitiveScore += 10;
      else if (step.cognitiveEffort === 'medium') cognitiveScore += 5;
    }

    return {
      taskName,
      steps: [...this.steps],
      totalSteps: this.steps.length,
      totalTimeMs,
      pagesVisited: this.visitedUrls.size,
      backtrackCount,
      cognitiveScore: Math.min(100, cognitiveScore),
    };
  }
}
```

### Step 6: Write Cognitive Load Tests

```typescript
// tests/cognitive-load/information-density.spec.ts
import { test, expect } from '@playwright/test';
import { DensityCalculator } from '../helpers/density-calculator';

const pages = [
  { name: 'Homepage', path: '/' },
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Settings', path: '/settings' },
  { name: 'Product Listing', path: '/products' },
];

test.describe('Information Density Analysis', () => {
  const calculator = new DensityCalculator();

  for (const pg of pages) {
    test(`${pg.name} has acceptable information density`, async ({ page }) => {
      await page.goto(pg.path);
      await page.waitForLoadState('networkidle');

      const metrics = await calculator.calculate(page);

      expect(metrics.textDensity).toBeGreaterThan(50);
      expect(metrics.textDensity).toBeLessThan(800);
      expect(metrics.totalInteractiveElements).toBeLessThanOrEqual(30);

      if (metrics.informationUnits > 0) {
        expect(metrics.informationUnits).toBeLessThanOrEqual(8);
      }

      expect(metrics.densityScore).toBeLessThan(80);
    });
  }
});
```

```typescript
// tests/cognitive-load/choice-overload.spec.ts
import { test, expect } from '@playwright/test';
import { ChoiceCounter } from '../helpers/choice-counter';

test.describe('Choice Overload Analysis', () => {
  const counter = new ChoiceCounter();

  test('navigation has 7 or fewer top-level items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const metrics = await counter.count(page);
    expect(metrics.navigationItemCount).toBeLessThanOrEqual(7);
  });

  test('forms show 7 or fewer fields at once', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    const metrics = await counter.count(page);
    expect(metrics.formFieldCount).toBeLessThanOrEqual(7);
  });

  test('no more than 2 competing CTAs per viewport', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const metrics = await counter.count(page);
    expect(metrics.callToActionCount).toBeLessThanOrEqual(2);
  });

  test('total decision points stay under threshold', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const metrics = await counter.count(page);
    expect(metrics.totalDecisionPoints).toBeLessThanOrEqual(25);
    expect(metrics.choiceOverloadScore).toBeLessThan(50);
  });
});
```

```typescript
// tests/cognitive-load/visual-hierarchy.spec.ts
import { test, expect } from '@playwright/test';
import { HierarchyAnalyzer } from '../helpers/hierarchy-analyzer';

test.describe('Visual Hierarchy Analysis', () => {
  const analyzer = new HierarchyAnalyzer();

  test('heading hierarchy does not skip levels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const metrics = await analyzer.analyze(page);
    expect(metrics.headingHierarchyValid).toBe(true);
  });

  test('whitespace ratio is between 20% and 70%', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const metrics = await analyzer.analyze(page);
    expect(metrics.whitespaceRatio).toBeGreaterThan(0.2);
    expect(metrics.whitespaceRatio).toBeLessThan(0.7);
  });

  test('font size variations stay reasonable', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const metrics = await analyzer.analyze(page);
    expect(metrics.fontSizeVariations).toBeLessThanOrEqual(8);
  });

  test('hierarchy score meets minimum threshold', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const metrics = await analyzer.analyze(page);
    expect(metrics.hierarchyScore).toBeGreaterThanOrEqual(50);
  });
});
```

```typescript
// tests/cognitive-load/consistency-audit.spec.ts
import { test, expect } from '@playwright/test';
import { ConsistencyChecker } from '../helpers/consistency-checker';

test.describe('Cross-Page Consistency Audit', () => {
  test('navigation and terminology are consistent across pages', async ({ page }) => {
    const checker = new ConsistencyChecker();
    const pagesToVisit = ['/', '/dashboard', '/settings', '/products', '/about'];

    for (const path of pagesToVisit) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await checker.captureSnapshot(page);
    }

    const result = checker.analyze();

    const highSeverity = result.issues.filter((i) => i.severity === 'high');
    expect(highSeverity.length).toBe(0);
    expect(result.consistencyScore).toBeGreaterThanOrEqual(70);
  });
});
```

```typescript
// tests/cognitive-load/task-completion-paths.spec.ts
import { test, expect } from '@playwright/test';
import { TaskPathTracer } from '../helpers/task-path-tracer';

test.describe('Task Completion Path Complexity', () => {
  test('user registration takes 5 or fewer steps', async ({ page }) => {
    const tracer = new TaskPathTracer();
    tracer.startTask();

    await page.goto('/register');
    tracer.recordStep('Navigate to registration', page, 'URL', 'low');

    await page.fill('[name="name"]', 'Test User');
    tracer.recordStep('Enter name', page, 'name input', 'low');

    await page.fill('[name="email"]', 'test@example.com');
    tracer.recordStep('Enter email', page, 'email input', 'low');

    await page.fill('[name="password"]', 'SecurePass123!');
    tracer.recordStep('Enter password', page, 'password input', 'medium');

    await page.click('button[type="submit"]');
    tracer.recordStep('Submit form', page, 'submit button', 'low');

    const result = tracer.completeTask('User Registration');
    expect(result.totalSteps).toBeLessThanOrEqual(6);
    expect(result.backtrackCount).toBe(0);
    expect(result.pagesVisited).toBeLessThanOrEqual(2);
  });

  test('search task takes 3 or fewer steps', async ({ page }) => {
    const tracer = new TaskPathTracer();
    tracer.startTask();

    await page.goto('/');
    tracer.recordStep('Start at homepage', page, 'homepage', 'low');

    await page.fill('input[type="search"], [data-testid="search-input"]', 'test');
    tracer.recordStep('Enter search query', page, 'search input', 'low');

    await page.keyboard.press('Enter');
    tracer.recordStep('Execute search', page, 'keyboard', 'low');

    const result = tracer.completeTask('Search');
    expect(result.totalSteps).toBeLessThanOrEqual(4);
    expect(result.backtrackCount).toBe(0);
  });
});
```

## Configuration

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/cognitive-load',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'on',
    video: 'off',
    trace: 'on-first-retry',
  },
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'reports/cognitive-load-results.json' }],
  ],
  projects: [
    {
      name: 'cognitive-desktop',
      use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'cognitive-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        isMobile: true,
      },
    },
  ],
});
```

### Cognitive Load Thresholds Configuration

```json
{
  "informationDensity": {
    "maxWordsPerViewportK": 600,
    "maxInteractiveElements": 30,
    "maxInformationUnits": 8,
    "maxDensityScore": 75
  },
  "choiceOverload": {
    "maxNavigationItems": 7,
    "maxFormFieldsVisible": 7,
    "maxCTAs": 2,
    "maxTabs": 6,
    "maxCardChoices": 9,
    "maxTotalDecisionPoints": 25,
    "maxOverloadScore": 50
  },
  "visualHierarchy": {
    "maxFontSizeVariations": 6,
    "minWhitespaceRatio": 0.3,
    "maxWhitespaceRatio": 0.6,
    "minHierarchyScore": 60
  },
  "taskComplexity": {
    "maxStepsForCommonTask": 5,
    "maxPagesForCommonTask": 3,
    "maxBacktracks": 0,
    "maxCognitiveScore": 40
  }
}
```

## Best Practices

1. **Measure cognitive load on every critical page.** Homepage, dashboard, checkout, settings, and search results are high-traffic pages where cognitive load directly impacts conversion.

2. **Test at mobile viewport sizes.** Mobile screens increase information density. A dashboard manageable at 1440px may be overwhelming at 375px.

3. **Count decisions, not just elements.** A list of 20 read-only rows differs from 20 selectable options. Focus on elements requiring user decisions.

4. **Audit consistency across at least 5 pages.** Single-page checks reveal nothing about cross-page coherence. Compare navigation, terminology, and layout patterns.

5. **Measure task completion paths for the top 5 user tasks.** Registration, search, purchase, settings change, and content creation paths should all be under 5 steps.

6. **Use progressive disclosure to reduce visible complexity.** Hide secondary information behind expandable sections, tabs, or drill-down patterns.

7. **Apply Miller's Law to every grouping.** Navigation menus, form sections, card grids, and tab bars should contain 5-7 items maximum.

8. **Apply Hick's Law to CTAs.** One primary CTA and at most one secondary per viewport. Multiple competing CTAs cause paralysis.

9. **Validate heading hierarchy semantically.** Headings must follow logical order without skipping levels for both accessibility and scannability.

10. **Maintain 30-50% whitespace.** Whitespace is a cognitive aid that separates information into digestible chunks. Below 30% feels cramped.

11. **Standardize action labels across the application.** "Save" on one page and "Submit" on another for the same action forces reinterpretation.

12. **Track cognitive load metrics over time.** As features accumulate, complexity creeps upward. Monitor per sprint to catch it early.

## Anti-Patterns to Avoid

1. **Showing everything at once.** Displaying all settings, all options, and all data on a single page forces users to process hundreds of items.

2. **Too many navigation levels.** Navigation deeper than 3 levels forces users to track their position, consuming working memory.

3. **Inconsistent terminology.** Using "Save," "Submit," "Apply," "Confirm," and "Done" interchangeably for the same action creates confusion.

4. **Visual monotony.** When every element has the same size, color, and weight, there is no hierarchy to guide scanning.

5. **Hidden primary actions.** When the most important action is buried below the fold or styled identically to secondary actions, users cannot find it.

6. **Excessive form fields on one screen.** A 15-field registration form is intimidating. Break it into 3-4 steps of 3-5 fields.

7. **No default selections.** Forcing every choice from scratch instead of providing smart defaults adds unnecessary cognitive work.

8. **Ambiguous icons without labels.** Unlabeled icons require guessing. A gear icon could mean settings, configuration, tools, or preferences.

9. **Identical visual weight for different importance levels.** When errors, info, and success messages look the same, users cannot quickly triage.

10. **Context switching between pages for sub-tasks.** Navigating to a separate page for a sub-task during checkout disrupts the primary workflow.

## Debugging Tips

1. **Use the squint test.** Squint at the page until text is unreadable. The hierarchy should still be apparent through size, color, and spacing. If everything blurs uniformly, the hierarchy is flat.

2. **Count decisions per viewport.** Scroll to any point and count every element requiring a user decision. More than 7 indicates overload.

3. **Time yourself completing common tasks.** If you, an expert, take more than 30 seconds, a new user will struggle significantly more.

4. **Screenshot at multiple breakpoints** (320px, 375px, 768px, 1024px, 1440px) and compare density. Mobile breakpoints often reveal hidden problems.

5. **Map the information architecture.** Draw a tree of the page structure. Any branch deeper than 3 levels is a simplification candidate.

6. **Read headings as a table of contents.** Extract all headings and read them as a list. If they do not tell a coherent story, the structure needs work.

7. **Use a contrast checker** to verify the visual hierarchy uses sufficient differentiation. Prominent elements need high contrast; secondary ones need less.

8. **Test with first-time users.** Cognitive load is highest for newcomers. Observe someone unfamiliar completing tasks. Note every hesitation, wrong click, and backtrack.

9. **Track scroll depth and time-on-page.** Users scrolling past important content or spending disproportionate time indicates architecture problems.

10. **Compare similar pages side by side.** Place settings next to profile, or search results next to category page. Inconsistencies become immediately visible.
