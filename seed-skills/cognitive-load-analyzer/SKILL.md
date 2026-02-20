---
name: Cognitive Load Analyzer
description: Analyze web application interfaces for cognitive overload using automated heuristics covering information density, choice complexity, visual hierarchy, and interaction patterns
version: 1.0.0
author: Pramod
license: MIT
tags: [cognitive-load, ux-analysis, information-density, visual-hierarchy, heuristic-evaluation, usability, mental-model]
testingTypes: [e2e, accessibility]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Cognitive Load Analyzer Skill

You are an expert QA engineer specializing in cognitive load analysis for web applications. When the user asks you to analyze interfaces for cognitive overload, evaluate information density, or assess visual hierarchy, follow these detailed instructions to apply systematic heuristics that measure and flag potential usability issues caused by excessive cognitive demands.

## Core Principles

1. **Measure, do not guess** -- Cognitive load can be quantified through proxy metrics: element count per viewport, unique colors, font variations, navigation depth, and interactive element density. Automate these measurements rather than relying on subjective judgment.
2. **Hick's Law governs choice** -- The time to make a decision increases logarithmically with the number of choices. Pages presenting more than seven primary actions force users into decision paralysis. Count and limit choices systematically.
3. **Miller's Law constrains working memory** -- Users can hold approximately seven (plus or minus two) items in working memory. Forms, navigation menus, and data tables exceeding this threshold overload short-term memory. Chunk related items into groups.
4. **Visual hierarchy directs attention** -- When everything is bold, nothing is bold. A clear visual hierarchy uses size, color, weight, and spacing to create a scannable path from primary to secondary to tertiary information.
5. **Progressive disclosure reduces upfront load** -- Show only the information needed for the current step. Advanced options, detailed settings, and edge-case flows should be hidden behind expandable sections, tooltips, or secondary pages.
6. **Consistency reduces learning cost** -- Every inconsistency in layout, terminology, or interaction pattern adds cognitive overhead. Users must re-learn what they already understood. Measure consistency across pages.
7. **White space is functional** -- Dense layouts with minimal spacing force users to parse boundaries between elements. Adequate white space (margins, padding, line height) reduces parsing effort and improves comprehension.
8. **Navigation depth creates memory load** -- Each level of navigation requires users to remember where they are and how to return. Measure navigation depth and breadcrumb availability.

## Project Structure

```
tests/
  cognitive-load/
    metrics/
      element-density.spec.ts
      color-audit.spec.ts
      font-audit.spec.ts
      action-density.spec.ts
      navigation-depth.spec.ts
      form-complexity.spec.ts
    heuristics/
      hicks-law.spec.ts
      millers-law.spec.ts
      progressive-disclosure.spec.ts
      consistency-check.spec.ts
    visual-hierarchy/
      heading-structure.spec.ts
      contrast-ratio.spec.ts
      whitespace-analysis.spec.ts
      focal-points.spec.ts
    interaction/
      modal-frequency.spec.ts
      click-depth.spec.ts
      decision-points.spec.ts
      reading-level.spec.ts
    reports/
      cognitive-load-report.spec.ts
    fixtures/
      page-inventory.ts
      thresholds.ts
    utils/
      cognitive-helpers.ts
      color-utils.ts
      text-analysis.ts
playwright.config.ts
```

## Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/cognitive-load',
  fullyParallel: true,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'cognitive-load-report.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'on',
  },
  projects: [
    {
      name: 'desktop-1920',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'desktop-1366',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
```

```typescript
// tests/cognitive-load/fixtures/thresholds.ts

/**
 * Cognitive load thresholds derived from UX research.
 * These values define acceptable limits for various metrics.
 * Exceeding these thresholds indicates potential cognitive overload.
 */
export const THRESHOLDS = {
  // Hick's Law: maximum primary actions visible at once
  MAX_PRIMARY_ACTIONS: 7,

  // Miller's Law: maximum items in a group without chunking
  MAX_UNCHUNKED_ITEMS: 9,

  // Element density: maximum interactive elements per viewport
  MAX_INTERACTIVE_ELEMENTS_PER_VIEWPORT: 50,

  // Visual variety: maximum unique colors on a single page
  MAX_UNIQUE_COLORS: 12,

  // Typography: maximum unique font size/weight combinations
  MAX_FONT_VARIATIONS: 8,

  // Navigation: maximum depth without breadcrumbs
  MAX_NAV_DEPTH_WITHOUT_BREADCRUMBS: 2,

  // Forms: maximum fields per visible section
  MAX_FORM_FIELDS_PER_SECTION: 7,

  // Reading level: maximum Flesch-Kincaid grade level for UI text
  MAX_READING_GRADE_LEVEL: 8,

  // Modals: maximum sequential modals without returning to base page
  MAX_SEQUENTIAL_MODALS: 2,

  // Whitespace: minimum percentage of viewport that should be whitespace
  MIN_WHITESPACE_PERCENTAGE: 30,

  // Decision points: maximum yes/no decisions per task flow
  MAX_DECISION_POINTS_PER_FLOW: 5,
};
```

```typescript
// tests/cognitive-load/fixtures/page-inventory.ts
export interface PageUnderTest {
  name: string;
  route: string;
  category: 'dashboard' | 'form' | 'list' | 'detail' | 'settings' | 'onboarding';
  criticalFlow?: boolean;
}

export const pageInventory: PageUnderTest[] = [
  { name: 'Dashboard', route: '/dashboard', category: 'dashboard', criticalFlow: true },
  { name: 'Project List', route: '/projects', category: 'list', criticalFlow: true },
  { name: 'Project Detail', route: '/projects/1', category: 'detail' },
  { name: 'Create Project', route: '/projects/new', category: 'form', criticalFlow: true },
  { name: 'Settings', route: '/settings', category: 'settings' },
  { name: 'User Profile', route: '/profile', category: 'form' },
  { name: 'Search Results', route: '/search?q=test', category: 'list' },
  { name: 'Onboarding Step 1', route: '/onboarding/1', category: 'onboarding', criticalFlow: true },
  { name: 'Reports', route: '/reports', category: 'dashboard' },
  { name: 'Team Management', route: '/team', category: 'list' },
];
```

## How-To Guides

### Measuring Element Density Per Viewport

Element density is the most fundamental cognitive load metric. Too many interactive elements per viewport overwhelm users and make it difficult to identify the primary action.

```typescript
// tests/cognitive-load/metrics/element-density.spec.ts
import { test, expect } from '@playwright/test';
import { pageInventory } from '../fixtures/page-inventory';
import { THRESHOLDS } from '../fixtures/thresholds';

test.describe('Element Density Analysis', () => {
  for (const page_info of pageInventory) {
    test(`${page_info.name}: interactive elements within threshold`, async ({ page }) => {
      await page.goto(page_info.route);
      await page.waitForLoadState('networkidle');

      const viewportHeight = page.viewportSize()?.height || 1080;

      // Count all interactive elements in the visible viewport
      const interactiveCount = await page.evaluate((vpHeight) => {
        const interactiveSelectors = [
          'a[href]',
          'button',
          'input',
          'select',
          'textarea',
          '[role="button"]',
          '[role="link"]',
          '[role="tab"]',
          '[role="menuitem"]',
          '[tabindex]:not([tabindex="-1"])',
          '[onclick]',
        ];

        const elements = document.querySelectorAll(interactiveSelectors.join(','));
        let visibleCount = 0;

        elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const isVisible =
            rect.top >= 0 &&
            rect.top < vpHeight &&
            rect.width > 0 &&
            rect.height > 0 &&
            window.getComputedStyle(el).display !== 'none' &&
            window.getComputedStyle(el).visibility !== 'hidden';

          if (isVisible) visibleCount++;
        });

        return visibleCount;
      }, viewportHeight);

      // Log the count for reporting
      console.log(
        `[Cognitive Load] ${page_info.name}: ${interactiveCount} interactive elements in viewport`
      );

      expect(
        interactiveCount,
        `${page_info.name} has ${interactiveCount} interactive elements (threshold: ${THRESHOLDS.MAX_INTERACTIVE_ELEMENTS_PER_VIEWPORT})`
      ).toBeLessThanOrEqual(THRESHOLDS.MAX_INTERACTIVE_ELEMENTS_PER_VIEWPORT);
    });
  }

  test('above-the-fold content has a clear primary action', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Identify primary action buttons (usually larger, more prominent)
    const primaryActions = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'));
      const viewport = window.innerHeight;

      return buttons
        .filter((btn) => {
          const rect = btn.getBoundingClientRect();
          return rect.top < viewport && rect.width > 0;
        })
        .map((btn) => {
          const styles = window.getComputedStyle(btn);
          const rect = btn.getBoundingClientRect();
          return {
            text: btn.textContent?.trim() || '',
            area: rect.width * rect.height,
            fontSize: parseFloat(styles.fontSize),
            fontWeight: parseInt(styles.fontWeight, 10),
            backgroundColor: styles.backgroundColor,
          };
        })
        .sort((a, b) => b.area - a.area);
    });

    // The largest, most prominent button should be clearly distinct
    if (primaryActions.length >= 2) {
      const primary = primaryActions[0];
      const secondary = primaryActions[1];

      // Primary action should be meaningfully larger than secondary
      expect(primary.area).toBeGreaterThan(secondary.area * 1.2);
    }
  });
});
```

### Auditing Color and Font Variations

Excessive color and font variations create visual noise that increases the effort required to parse a page.

```typescript
// tests/cognitive-load/metrics/color-audit.spec.ts
import { test, expect } from '@playwright/test';
import { pageInventory } from '../fixtures/page-inventory';
import { THRESHOLDS } from '../fixtures/thresholds';

test.describe('Color Variation Analysis', () => {
  for (const page_info of pageInventory) {
    test(`${page_info.name}: unique colors within threshold`, async ({ page }) => {
      await page.goto(page_info.route);
      await page.waitForLoadState('networkidle');

      const colorAnalysis = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const colors = new Set<string>();
        const bgColors = new Set<string>();

        allElements.forEach((el) => {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();

          // Only analyze visible elements
          if (rect.width === 0 || rect.height === 0) return;
          if (styles.display === 'none' || styles.visibility === 'hidden') return;

          // Normalize colors to hex
          const textColor = styles.color;
          const bgColor = styles.backgroundColor;

          if (textColor && textColor !== 'rgba(0, 0, 0, 0)') {
            colors.add(textColor);
          }
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            bgColors.add(bgColor);
          }
        });

        return {
          textColors: colors.size,
          backgroundColors: bgColors.size,
          totalUniqueColors: new Set([...colors, ...bgColors]).size,
        };
      });

      console.log(
        `[Cognitive Load] ${page_info.name}: ${colorAnalysis.totalUniqueColors} unique colors ` +
        `(${colorAnalysis.textColors} text, ${colorAnalysis.backgroundColors} background)`
      );

      expect(
        colorAnalysis.totalUniqueColors,
        `${page_info.name} uses ${colorAnalysis.totalUniqueColors} unique colors (threshold: ${THRESHOLDS.MAX_UNIQUE_COLORS})`
      ).toBeLessThanOrEqual(THRESHOLDS.MAX_UNIQUE_COLORS);
    });
  }
});

// tests/cognitive-load/metrics/font-audit.spec.ts
import { test as fontTest, expect as fontExpect } from '@playwright/test';
import { pageInventory } from '../fixtures/page-inventory';
import { THRESHOLDS } from '../fixtures/thresholds';

fontTest.describe('Font Variation Analysis', () => {
  for (const page_info of pageInventory) {
    fontTest(`${page_info.name}: font variations within threshold`, async ({ page }) => {
      await page.goto(page_info.route);
      await page.waitForLoadState('networkidle');

      const fontVariations = await page.evaluate(() => {
        const allText = document.querySelectorAll(
          'p, h1, h2, h3, h4, h5, h6, span, a, button, label, li, td, th, div'
        );
        const variations = new Set<string>();

        allText.forEach((el) => {
          const styles = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();

          if (rect.width === 0 || rect.height === 0) return;
          if (!el.textContent?.trim()) return;

          const key = `${styles.fontFamily.split(',')[0].trim()}-${Math.round(parseFloat(styles.fontSize))}-${styles.fontWeight}`;
          variations.add(key);
        });

        return {
          count: variations.size,
          details: Array.from(variations).sort(),
        };
      });

      console.log(
        `[Cognitive Load] ${page_info.name}: ${fontVariations.count} font variations`
      );

      fontExpect(
        fontVariations.count,
        `${page_info.name} uses ${fontVariations.count} font variations (threshold: ${THRESHOLDS.MAX_FONT_VARIATIONS})`
      ).toBeLessThanOrEqual(THRESHOLDS.MAX_FONT_VARIATIONS);
    });
  }
});
```

### Applying Hick's Law to Navigation and Action Menus

Hick's Law states that decision time increases with the number and complexity of choices. Test that navigation menus, action bars, and option lists stay within manageable bounds.

```typescript
// tests/cognitive-load/heuristics/hicks-law.spec.ts
import { test, expect } from '@playwright/test';
import { THRESHOLDS } from '../fixtures/thresholds';

test.describe('Hick\'s Law: Choice Complexity', () => {
  test('primary navigation has manageable number of items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const navItems = await page.evaluate(() => {
      const nav = document.querySelector('nav[role="navigation"], nav, [data-testid="main-nav"]');
      if (!nav) return { topLevel: 0, total: 0 };

      const topLevelLinks = nav.querySelectorAll(':scope > ul > li > a, :scope > a');
      const allLinks = nav.querySelectorAll('a');

      return {
        topLevel: topLevelLinks.length,
        total: allLinks.length,
      };
    });

    console.log(
      `[Cognitive Load] Navigation: ${navItems.topLevel} top-level items, ${navItems.total} total`
    );

    expect(
      navItems.topLevel,
      `Navigation has ${navItems.topLevel} top-level items (Hick's threshold: ${THRESHOLDS.MAX_PRIMARY_ACTIONS})`
    ).toBeLessThanOrEqual(THRESHOLDS.MAX_PRIMARY_ACTIONS);
  });

  test('dropdown menus do not exceed manageable item count', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Find all dropdown triggers
    const dropdownTriggers = page.locator(
      '[data-testid*="dropdown"], [aria-haspopup="menu"], [aria-haspopup="listbox"]'
    );
    const count = await dropdownTriggers.count();

    for (let i = 0; i < count; i++) {
      const trigger = dropdownTriggers.nth(i);
      if (!(await trigger.isVisible())) continue;

      await trigger.click();

      // Wait for dropdown to appear
      const dropdown = page.locator('[role="menu"], [role="listbox"]').first();
      if (await dropdown.isVisible()) {
        const items = await dropdown.locator('[role="menuitem"], [role="option"], li').all();

        console.log(
          `[Cognitive Load] Dropdown ${i}: ${items.length} items`
        );

        expect(
          items.length,
          `Dropdown menu has ${items.length} items (Hick's threshold: ${THRESHOLDS.MAX_UNCHUNKED_ITEMS})`
        ).toBeLessThanOrEqual(THRESHOLDS.MAX_UNCHUNKED_ITEMS);

        // Close the dropdown
        await page.keyboard.press('Escape');
      }
    }
  });

  test('action bar presents focused set of actions', async ({ page }) => {
    await page.goto('/projects/1');
    await page.waitForLoadState('networkidle');

    const actionButtons = await page.evaluate(() => {
      const actionBar = document.querySelector(
        '[data-testid="action-bar"], .action-bar, [role="toolbar"]'
      );
      if (!actionBar) return 0;

      const buttons = actionBar.querySelectorAll('button, a[role="button"]');
      return Array.from(buttons).filter((btn) => {
        const rect = btn.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length;
    });

    expect(
      actionButtons,
      `Action bar has ${actionButtons} visible actions`
    ).toBeLessThanOrEqual(THRESHOLDS.MAX_PRIMARY_ACTIONS);
  });
});
```

### Measuring Form Complexity

Forms are high-cognitive-load surfaces. Measure field counts, grouping quality, and progressive disclosure usage.

```typescript
// tests/cognitive-load/metrics/form-complexity.spec.ts
import { test, expect } from '@playwright/test';
import { pageInventory } from '../fixtures/page-inventory';
import { THRESHOLDS } from '../fixtures/thresholds';

test.describe('Form Complexity Analysis', () => {
  const formPages = pageInventory.filter((p) => p.category === 'form');

  for (const page_info of formPages) {
    test(`${page_info.name}: form fields per section within threshold`, async ({ page }) => {
      await page.goto(page_info.route);
      await page.waitForLoadState('networkidle');

      const formAnalysis = await page.evaluate((maxFields) => {
        const forms = document.querySelectorAll('form');
        const results: Array<{
          fieldCount: number;
          sectionCount: number;
          maxFieldsInSection: number;
          hasProgressIndicator: boolean;
          requiredFieldCount: number;
        }> = [];

        forms.forEach((form) => {
          const fields = form.querySelectorAll(
            'input:not([type="hidden"]), select, textarea, [role="combobox"], [role="slider"]'
          );

          // Check for fieldset/section grouping
          const sections = form.querySelectorAll(
            'fieldset, [data-testid*="section"], .form-section'
          );

          let maxFieldsInSection = fields.length; // Default: all in one section
          if (sections.length > 0) {
            const sectionFieldCounts = Array.from(sections).map(
              (section) =>
                section.querySelectorAll(
                  'input:not([type="hidden"]), select, textarea'
                ).length
            );
            maxFieldsInSection = Math.max(...sectionFieldCounts);
          }

          const requiredFields = form.querySelectorAll(
            '[required], [aria-required="true"]'
          );
          const progress = document.querySelector(
            '[role="progressbar"], .step-indicator, [data-testid="form-progress"]'
          );

          results.push({
            fieldCount: fields.length,
            sectionCount: Math.max(sections.length, 1),
            maxFieldsInSection,
            hasProgressIndicator: !!progress,
            requiredFieldCount: requiredFields.length,
          });
        });

        return results;
      }, THRESHOLDS.MAX_FORM_FIELDS_PER_SECTION);

      for (const form of formAnalysis) {
        console.log(
          `[Cognitive Load] ${page_info.name}: ${form.fieldCount} fields, ` +
          `${form.sectionCount} sections, max ${form.maxFieldsInSection} per section`
        );

        // Each visible section should have no more than the threshold
        expect(
          form.maxFieldsInSection,
          `Form has ${form.maxFieldsInSection} fields in one section (threshold: ${THRESHOLDS.MAX_FORM_FIELDS_PER_SECTION})`
        ).toBeLessThanOrEqual(THRESHOLDS.MAX_FORM_FIELDS_PER_SECTION);

        // Long forms should have a progress indicator
        if (form.fieldCount > 10) {
          expect(
            form.hasProgressIndicator,
            `Form with ${form.fieldCount} fields lacks a progress indicator`
          ).toBe(true);
        }
      }
    });
  }
});
```

### Analyzing Navigation Depth and Breadcrumbs

Deep navigation structures strain working memory. Users must remember where they are and how to navigate back.

```typescript
// tests/cognitive-load/metrics/navigation-depth.spec.ts
import { test, expect } from '@playwright/test';
import { THRESHOLDS } from '../fixtures/thresholds';

test.describe('Navigation Depth Analysis', () => {
  test('pages beyond depth 2 have breadcrumbs', async ({ page }) => {
    // Crawl the site to discover deep pages
    const deepPages = [
      '/projects/1/settings/notifications',
      '/team/members/123/permissions',
      '/reports/custom/2024/january',
      '/settings/integrations/github/configure',
    ];

    for (const route of deepPages) {
      const depth = route.split('/').filter(Boolean).length;

      if (depth > THRESHOLDS.MAX_NAV_DEPTH_WITHOUT_BREADCRUMBS) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        // Check for breadcrumbs
        const breadcrumbs = page.locator(
          'nav[aria-label="breadcrumb"], [data-testid="breadcrumbs"], .breadcrumbs, nav[aria-label="Breadcrumb"]'
        );

        const hasBreadcrumbs = await breadcrumbs.isVisible().catch(() => false);

        expect(
          hasBreadcrumbs,
          `Page at depth ${depth} (${route}) lacks breadcrumb navigation`
        ).toBe(true);

        if (hasBreadcrumbs) {
          // Breadcrumbs should show the full path
          const crumbs = await breadcrumbs.getByRole('listitem').all();
          expect(crumbs.length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  test('back navigation is always available on deep pages', async ({ page }) => {
    await page.goto('/projects/1/settings/notifications');
    await page.waitForLoadState('networkidle');

    // Either breadcrumbs or a back button must be present
    const hasBreadcrumbs = await page
      .locator('nav[aria-label="breadcrumb"], [data-testid="breadcrumbs"]')
      .isVisible()
      .catch(() => false);

    const hasBackButton = await page
      .locator('[data-testid="back-button"], a[aria-label*="back" i], button[aria-label*="back" i]')
      .isVisible()
      .catch(() => false);

    expect(
      hasBreadcrumbs || hasBackButton,
      'Deep page lacks both breadcrumbs and a back button'
    ).toBe(true);
  });
});
```

### Evaluating Progressive Disclosure

Progressive disclosure hides complexity behind expandable sections, "Show more" links, and multi-step flows. Verify that it is used where appropriate.

```typescript
// tests/cognitive-load/heuristics/progressive-disclosure.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Progressive Disclosure', () => {
  test('advanced settings are hidden by default', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Advanced sections should be collapsed
    const advancedSection = page.locator(
      '[data-testid="advanced-settings"], details:has(summary:text-matches("advanced", "i"))'
    );

    if (await advancedSection.count() > 0) {
      const isExpanded = await advancedSection.first().evaluate((el) => {
        if (el.tagName === 'DETAILS') return (el as HTMLDetailsElement).open;
        return el.getAttribute('aria-expanded') === 'true';
      });

      expect(
        isExpanded,
        'Advanced settings should be collapsed by default'
      ).toBe(false);
    }
  });

  test('long content has show-more controls', async ({ page }) => {
    await page.goto('/projects/1');
    await page.waitForLoadState('networkidle');

    const longTextBlocks = await page.evaluate(() => {
      const textBlocks = document.querySelectorAll('p, [data-testid*="description"]');
      const longBlocks: Array<{ text: string; isTruncated: boolean }> = [];

      textBlocks.forEach((el) => {
        const text = el.textContent || '';
        if (text.length > 300) {
          const styles = window.getComputedStyle(el);
          const isTruncated =
            styles.overflow === 'hidden' ||
            styles.textOverflow === 'ellipsis' ||
            styles.webkitLineClamp !== 'none';

          longBlocks.push({
            text: text.substring(0, 50) + '...',
            isTruncated,
          });
        }
      });

      return longBlocks;
    });

    for (const block of longTextBlocks) {
      expect(
        block.isTruncated,
        `Long text block "${block.text}" should be truncated with show-more`
      ).toBe(true);
    }
  });

  test('multi-step forms show only current step fields', async ({ page }) => {
    await page.goto('/onboarding/1');
    await page.waitForLoadState('networkidle');

    const allFields = await page.locator('input:visible, select:visible, textarea:visible').all();
    const fieldCount = allFields.length;

    console.log(
      `[Cognitive Load] Onboarding step 1: ${fieldCount} visible fields`
    );

    // Each step should have a manageable number of fields
    expect(fieldCount).toBeLessThanOrEqual(7);

    // Progress indicator should show total steps
    const progress = page.locator(
      '[data-testid="step-indicator"], [role="progressbar"]'
    );
    await expect(progress).toBeVisible();
  });
});
```

### Analyzing Whitespace and Information Density

Whitespace is a cognitive relief mechanism. Pages with insufficient whitespace force users to work harder to parse content boundaries.

```typescript
// tests/cognitive-load/visual-hierarchy/whitespace-analysis.spec.ts
import { test, expect } from '@playwright/test';
import { pageInventory } from '../fixtures/page-inventory';
import { THRESHOLDS } from '../fixtures/thresholds';

test.describe('Whitespace Analysis', () => {
  for (const page_info of pageInventory.filter((p) => p.criticalFlow)) {
    test(`${page_info.name}: whitespace percentage meets minimum`, async ({ page }) => {
      await page.goto(page_info.route);
      await page.waitForLoadState('networkidle');

      const whitespaceAnalysis = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        canvas.width = viewportWidth;
        canvas.height = viewportHeight;

        // Count elements that occupy space
        const elements = document.querySelectorAll('*');
        let occupiedArea = 0;
        const totalArea = viewportWidth * viewportHeight;

        const rects: DOMRect[] = [];
        elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top < viewportHeight &&
            rect.bottom > 0
          ) {
            const styles = window.getComputedStyle(el);
            if (styles.display !== 'none' && styles.visibility !== 'hidden') {
              // Only count leaf nodes with content
              if (
                el.children.length === 0 ||
                el.textContent?.trim() ||
                styles.backgroundImage !== 'none'
              ) {
                rects.push(rect);
              }
            }
          }
        });

        // Approximate occupied area using bounding rects
        // This is a simplification but gives a reasonable estimate
        const occupiedPixels = new Set<string>();
        for (const rect of rects) {
          const top = Math.max(0, Math.floor(rect.top));
          const bottom = Math.min(viewportHeight, Math.ceil(rect.bottom));
          const left = Math.max(0, Math.floor(rect.left));
          const right = Math.min(viewportWidth, Math.ceil(rect.right));

          // Sample every 10th pixel for performance
          for (let y = top; y < bottom; y += 10) {
            for (let x = left; x < right; x += 10) {
              occupiedPixels.add(`${x},${y}`);
            }
          }
        }

        const sampledTotal = Math.floor(viewportWidth / 10) * Math.floor(viewportHeight / 10);
        const whitespacePercentage =
          ((sampledTotal - occupiedPixels.size) / sampledTotal) * 100;

        return {
          whitespacePercentage: Math.round(whitespacePercentage),
          totalElements: rects.length,
        };
      });

      console.log(
        `[Cognitive Load] ${page_info.name}: ${whitespaceAnalysis.whitespacePercentage}% whitespace`
      );

      expect(
        whitespaceAnalysis.whitespacePercentage,
        `${page_info.name} has ${whitespaceAnalysis.whitespacePercentage}% whitespace (minimum: ${THRESHOLDS.MIN_WHITESPACE_PERCENTAGE}%)`
      ).toBeGreaterThanOrEqual(THRESHOLDS.MIN_WHITESPACE_PERCENTAGE);
    });
  }
});
```

### Measuring Reading Level of UI Text

User interface text should be written at a reading level accessible to the broadest audience. Use the Flesch-Kincaid grade level formula to assess readability.

```typescript
// tests/cognitive-load/utils/text-analysis.ts

/**
 * Calculate the Flesch-Kincaid grade level of a text.
 * Lower scores indicate easier readability.
 * Target: grade level 8 or below for UI text.
 */
export function fleschKincaidGradeLevel(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);

  if (sentences.length === 0 || words.length === 0) return 0;

  const gradeLevel =
    0.39 * (words.length / sentences.length) +
    11.8 * (syllables / words.length) -
    15.59;

  return Math.max(0, Math.round(gradeLevel * 10) / 10);
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  const vowelGroups = word.match(/[aeiouy]+/g);
  let count = vowelGroups ? vowelGroups.length : 1;

  // Adjust for silent e
  if (word.endsWith('e')) count--;
  if (word.endsWith('le') && word.length > 2) count++;

  return Math.max(1, count);
}

// tests/cognitive-load/interaction/reading-level.spec.ts
import { test, expect } from '@playwright/test';
import { pageInventory } from '../fixtures/page-inventory';
import { THRESHOLDS } from '../fixtures/thresholds';
import { fleschKincaidGradeLevel } from '../utils/text-analysis';

test.describe('Reading Level Analysis', () => {
  for (const page_info of pageInventory) {
    test(`${page_info.name}: UI text reading level`, async ({ page }) => {
      await page.goto(page_info.route);
      await page.waitForLoadState('networkidle');

      const uiText = await page.evaluate(() => {
        const textElements = document.querySelectorAll(
          'h1, h2, h3, h4, p, label, button, a, [role="alert"], [role="status"]'
        );
        const texts: string[] = [];

        textElements.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && text.length > 10) {
            texts.push(text);
          }
        });

        return texts.join('. ');
      });

      if (uiText.length > 50) {
        const gradeLevel = fleschKincaidGradeLevel(uiText);

        console.log(
          `[Cognitive Load] ${page_info.name}: Flesch-Kincaid grade level ${gradeLevel}`
        );

        expect(
          gradeLevel,
          `${page_info.name} text is at grade level ${gradeLevel} (threshold: ${THRESHOLDS.MAX_READING_GRADE_LEVEL})`
        ).toBeLessThanOrEqual(THRESHOLDS.MAX_READING_GRADE_LEVEL);
      }
    });
  }
});
```

### Measuring Modal and Popup Frequency

Modals interrupt the user's flow and add cognitive overhead. Sequential modals compound this effect and should be flagged.

```typescript
// tests/cognitive-load/interaction/modal-frequency.spec.ts
import { test, expect } from '@playwright/test';
import { THRESHOLDS } from '../fixtures/thresholds';

test.describe('Modal and Popup Frequency', () => {
  test('completing a task does not trigger sequential modals', async ({ page }) => {
    await page.goto('/projects/new');
    await page.waitForLoadState('networkidle');

    let modalCount = 0;

    // Monitor for modal appearances
    page.on('console', () => {});

    // Fill out a form and submit
    await page.getByTestId('project-name').fill('Test Project');
    await page.getByTestId('project-description').fill('A test description');
    await page.getByTestId('submit-button').click();

    // Count modals that appear sequentially
    const checkForModals = async () => {
      const modal = page.locator(
        '[role="dialog"], [role="alertdialog"], [data-testid*="modal"]'
      );
      if (await modal.isVisible().catch(() => false)) {
        modalCount++;

        // Dismiss the modal
        const closeButton = modal.getByRole('button', { name: /close|dismiss|ok|got it/i });
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
          await page.waitForTimeout(500);

          // Check if another modal appeared
          await checkForModals();
        }
      }
    };

    await page.waitForTimeout(2000);
    await checkForModals();

    expect(
      modalCount,
      `Task triggered ${modalCount} sequential modals (threshold: ${THRESHOLDS.MAX_SEQUENTIAL_MODALS})`
    ).toBeLessThanOrEqual(THRESHOLDS.MAX_SEQUENTIAL_MODALS);
  });

  test('page load does not trigger immediate modal', async ({ page }) => {
    // First visit should not immediately show a modal (cookie consent excluded)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const modal = page.locator(
      '[role="dialog"]:not([data-testid="cookie-consent"]), [role="alertdialog"]'
    );

    // Give any modals time to appear
    await page.waitForTimeout(2000);

    const isModalVisible = await modal.isVisible().catch(() => false);

    if (isModalVisible) {
      const modalText = await modal.textContent();
      console.log(`[Cognitive Load] Unexpected modal on page load: ${modalText?.substring(0, 100)}`);
    }

    expect(
      isModalVisible,
      'Page load triggered an unexpected modal dialog'
    ).toBe(false);
  });
});
```

## Generating a Cognitive Load Report

Aggregate all metrics into a single report for stakeholder review.

```typescript
// tests/cognitive-load/reports/cognitive-load-report.spec.ts
import { test, expect } from '@playwright/test';
import { pageInventory } from '../fixtures/page-inventory';
import { THRESHOLDS } from '../fixtures/thresholds';
import { fleschKincaidGradeLevel } from '../utils/text-analysis';

interface PageReport {
  name: string;
  route: string;
  metrics: {
    interactiveElements: number;
    uniqueColors: number;
    fontVariations: number;
    formFields: number;
    readingGradeLevel: number;
  };
  score: 'low' | 'medium' | 'high';
  issues: string[];
}

test('generate cognitive load report for all pages', async ({ page }) => {
  const reports: PageReport[] = [];

  for (const pageInfo of pageInventory) {
    await page.goto(pageInfo.route);
    await page.waitForLoadState('networkidle');

    const metrics = await page.evaluate(() => {
      // Collect all metrics in a single evaluation for efficiency
      const interactiveElements = document.querySelectorAll(
        'a[href], button, input, select, textarea, [role="button"]'
      ).length;

      const colors = new Set<string>();
      const fonts = new Set<string>();
      const allElements = document.querySelectorAll('*');

      allElements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        colors.add(styles.color);
        colors.add(styles.backgroundColor);
        fonts.add(`${styles.fontFamily.split(',')[0]}-${Math.round(parseFloat(styles.fontSize))}-${styles.fontWeight}`);
      });

      const formFields = document.querySelectorAll(
        'form input:not([type="hidden"]), form select, form textarea'
      ).length;

      const textContent = document.body.textContent || '';

      return {
        interactiveElements,
        uniqueColors: colors.size,
        fontVariations: fonts.size,
        formFields,
        textContent: textContent.substring(0, 5000),
      };
    });

    const readingGradeLevel = fleschKincaidGradeLevel(metrics.textContent);
    const issues: string[] = [];

    if (metrics.interactiveElements > THRESHOLDS.MAX_INTERACTIVE_ELEMENTS_PER_VIEWPORT) {
      issues.push(`Too many interactive elements: ${metrics.interactiveElements}`);
    }
    if (metrics.uniqueColors > THRESHOLDS.MAX_UNIQUE_COLORS) {
      issues.push(`Too many colors: ${metrics.uniqueColors}`);
    }
    if (metrics.fontVariations > THRESHOLDS.MAX_FONT_VARIATIONS) {
      issues.push(`Too many font variations: ${metrics.fontVariations}`);
    }
    if (readingGradeLevel > THRESHOLDS.MAX_READING_GRADE_LEVEL) {
      issues.push(`Reading level too high: grade ${readingGradeLevel}`);
    }

    const score = issues.length === 0 ? 'low' : issues.length <= 2 ? 'medium' : 'high';

    reports.push({
      name: pageInfo.name,
      route: pageInfo.route,
      metrics: {
        interactiveElements: metrics.interactiveElements,
        uniqueColors: metrics.uniqueColors,
        fontVariations: metrics.fontVariations,
        formFields: metrics.formFields,
        readingGradeLevel,
      },
      score,
      issues,
    });
  }

  // Output the report
  console.log('\n=== Cognitive Load Report ===\n');
  for (const report of reports) {
    console.log(`${report.score.toUpperCase()} | ${report.name} (${report.route})`);
    if (report.issues.length > 0) {
      report.issues.forEach((issue) => console.log(`  - ${issue}`));
    }
  }

  // Fail if any critical-flow page has high cognitive load
  const criticalPages = pageInventory.filter((p) => p.criticalFlow).map((p) => p.name);
  const criticalHighLoad = reports.filter(
    (r) => criticalPages.includes(r.name) && r.score === 'high'
  );

  expect(
    criticalHighLoad.length,
    `${criticalHighLoad.length} critical pages have high cognitive load: ${criticalHighLoad.map((r) => r.name).join(', ')}`
  ).toBe(0);
});
```

## Best Practices

1. **Establish baselines before optimizing** -- Run the full cognitive load analysis on the current state of the application before making changes. Use these baselines to measure improvement and prevent regression.

2. **Prioritize critical user flows** -- Not every page needs the same level of cognitive load optimization. Focus analysis on onboarding flows, core task completion paths, and high-traffic pages first.

3. **Use thresholds from research, not opinion** -- The thresholds in this skill are derived from established UX research (Miller's Law, Hick's Law, Flesch-Kincaid). Adjust them based on your user base, but always ground changes in evidence.

4. **Run cognitive load tests on every viewport** -- Desktop, tablet, and mobile layouts present different cognitive challenges. A sidebar navigation that works on desktop may become an overwhelming hamburger menu on mobile.

5. **Track metrics over time** -- Cognitive load tends to increase gradually as features are added. Track key metrics (element count, color count, font variations) in CI and alert when they trend upward.

6. **Combine automated metrics with manual review** -- Automated heuristics catch quantifiable issues but miss qualitative problems like confusing iconography, misleading labels, or inconsistent mental models. Use automated metrics as a first pass, followed by periodic manual review.

7. **Test with real user data volumes** -- A dashboard with three items looks manageable. The same dashboard with three hundred items may be overwhelming. Test cognitive load at realistic data scales.

8. **Validate chunking and grouping** -- When content exceeds Miller's Law thresholds, verify that it is grouped into meaningful chunks with clear section headers, dividers, or visual grouping cues.

9. **Measure cognitive load during onboarding** -- New users have zero context. The onboarding experience must have the lowest possible cognitive load. Test every onboarding step independently.

10. **Assert progressive disclosure in settings pages** -- Settings pages are notorious for overwhelming users. Verify that advanced options are collapsed, rarely-used features are behind "Show more" toggles, and sections are clearly labeled.

11. **Check heading hierarchy for scannability** -- Pages should have a logical heading hierarchy (H1 > H2 > H3) that allows users to scan and find information quickly. Skipped heading levels or multiple H1 tags break the scanning pattern.

## Anti-Patterns to Avoid

1. **Treating all pages equally** -- A settings page can tolerate higher element density than a landing page. Do not apply identical thresholds to every page category. Calibrate thresholds by page type.

2. **Counting invisible elements** -- Elements that are hidden, off-screen, or behind collapsed sections should not count toward cognitive load metrics. Always filter to visible elements within the current viewport.

3. **Ignoring dynamic content** -- Pages that load additional content via infinite scroll, lazy loading, or real-time updates can exceed cognitive load thresholds after the initial render. Measure after dynamic content loads.

4. **Using cognitive load as the sole quality metric** -- Low cognitive load is necessary but not sufficient. A page with one button and no text has low cognitive load but also low utility. Balance simplicity with functionality.

5. **Applying Hick's Law to dissimilar choices** -- Hick's Law applies most strongly when choices are similar and require comparison. A navigation menu with clearly distinct items (Dashboard, Settings, Profile) imposes less decision cost than a list of similarly-named reports.

6. **Optimizing for experts at the expense of novices** -- Dense, information-rich interfaces serve expert users but overwhelm newcomers. Design for the novice experience and provide expert shortcuts (keyboard commands, power-user views) as progressive enhancements.

## Debugging Tips

- **Metric inconsistencies across browsers**: Different browsers compute styles slightly differently. If color or font counts vary between Chrome and Firefox, normalize computed values by rounding pixel sizes and converting color spaces before comparison.

- **False positives in element density**: Navigation headers, footers, and fixed sidebars contribute to element counts on every page. Consider excluding global chrome elements from per-page analysis by subtracting a baseline element count.

- **Whitespace calculation inaccuracy**: The sampling-based whitespace calculation is an approximation. For precise measurements, use a canvas-based approach that renders the page to a bitmap and counts white pixels. This is slower but more accurate.

- **Reading level skewed by code snippets**: If the page contains code examples or technical identifiers, the Flesch-Kincaid formula produces inflated grade levels. Filter out code blocks and data-testid attributes before measuring reading level.

- **Dynamic content loading changes metrics**: If element density tests produce different results on each run, check for A/B tests, personalized content, or real-time data feeds that change the page composition. Use a deterministic test account with controlled content.

- **Modal detection fails for custom implementations**: Some applications use custom modal implementations that lack standard `role="dialog"` attributes. Add fallback selectors for application-specific modal patterns.

- **Color audit counts transparent colors**: The CSS value `rgba(0, 0, 0, 0)` is technically a color but adds no visual load. Filter out fully transparent colors and colors that match the background.
