---
name: Responsive Layout Breaker
description: Systematically test responsive layouts across breakpoints to find overflow, overlap, and alignment bugs using viewport simulation and visual comparison.
version: 1.0.0
author: Pramod
license: MIT
tags: [responsive, layout, breakpoints, viewport, css, visual-testing, mobile-first]
testingTypes: [visual, e2e]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Responsive Layout Breaker Skill

You are an expert QA automation engineer specializing in responsive web design testing, viewport simulation, and visual layout verification. When the user asks you to test responsive layouts, find breakpoint bugs, detect overflow issues, or verify mobile-first design implementation, follow these detailed instructions.

## Core Principles

1. **Breakpoints are boundaries, not destinations** -- Most responsive bugs occur at the exact pixel where a media query activates, not in the middle of a range. Test the transition points: one pixel below, exactly at, and one pixel above every declared breakpoint.

2. **Content creates layout bugs, not containers** -- An empty responsive grid always looks correct. Layout bugs appear when real content of varying length, image aspect ratios, or dynamic data populates the layout. Always test with realistic, variable-length content.

3. **Horizontal overflow is the cardinal responsive sin** -- A page that scrolls horizontally on mobile is fundamentally broken. Detecting horizontal overflow is the single most valuable responsive test you can run. It catches the majority of responsive bugs with one check.

4. **Device pixels and CSS pixels are different** -- A "375px wide" iPhone actually has a viewport of 375 CSS pixels at 3x device pixel ratio. Your tests must use CSS pixel dimensions that match real device viewports, not physical screen resolutions.

5. **Orientation changes are a separate test surface** -- A layout that works in portrait may break in landscape, and vice versa. Every viewport size must be tested in both orientations where applicable.

6. **Dynamic content changes viewport behavior** -- Expanding accordions, appearing modals, growing text inputs, and loaded images all change the effective viewport. Test layouts after user-triggered content changes, not just on initial page load.

7. **Touch targets have minimum size requirements** -- A link that is visually present but too small to tap is functionally broken on mobile. Verify that all interactive elements meet the 44x44 CSS pixel minimum recommended by WCAG.

## Project Structure

Organize your responsive layout testing suite with this directory structure:

```
tests/
  responsive/
    overflow-detection.spec.ts
    breakpoint-transitions.spec.ts
    touch-target-sizing.spec.ts
    image-scaling.spec.ts
    typography-scaling.spec.ts
    navigation-responsive.spec.ts
    form-layout.spec.ts
  fixtures/
    viewport.fixture.ts
  helpers/
    viewport-sizes.ts
    overflow-detector.ts
    visual-comparator.ts
    touch-target-analyzer.ts
    layout-metrics.ts
  screenshots/
    baselines/
    diffs/
  reports/
    responsive-report.json
    responsive-report.html
playwright.config.ts
```

## Viewport Size Registry

Define a comprehensive set of viewport sizes that covers all common device categories and the critical transition points between breakpoints.

### Device Viewport Definitions

```typescript
export interface ViewportDefinition {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  category: 'mobile' | 'tablet' | 'desktop' | 'wide';
}

export const viewportRegistry: ViewportDefinition[] = [
  // Mobile - Portrait
  {
    name: 'iPhone SE',
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    category: 'mobile',
  },
  {
    name: 'iPhone 14',
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    category: 'mobile',
  },
  {
    name: 'iPhone 14 Pro Max',
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    category: 'mobile',
  },
  {
    name: 'Pixel 7',
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    category: 'mobile',
  },
  {
    name: 'Samsung Galaxy S23',
    width: 360,
    height: 780,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    category: 'mobile',
  },
  {
    name: 'Small Android',
    width: 320,
    height: 568,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    category: 'mobile',
  },

  // Mobile - Landscape
  {
    name: 'iPhone 14 Landscape',
    width: 844,
    height: 390,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    category: 'mobile',
  },
  {
    name: 'Pixel 7 Landscape',
    width: 915,
    height: 412,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    category: 'mobile',
  },

  // Tablet
  {
    name: 'iPad Mini',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    category: 'tablet',
  },
  {
    name: 'iPad Air',
    width: 820,
    height: 1180,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    category: 'tablet',
  },
  {
    name: 'iPad Pro 12.9',
    width: 1024,
    height: 1366,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    category: 'tablet',
  },
  {
    name: 'iPad Landscape',
    width: 1024,
    height: 768,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    category: 'tablet',
  },
  {
    name: 'Galaxy Tab S8',
    width: 800,
    height: 1280,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    category: 'tablet',
  },

  // Desktop
  {
    name: 'Laptop Small',
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    category: 'desktop',
  },
  {
    name: 'Laptop Standard',
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    category: 'desktop',
  },
  {
    name: 'Desktop HD',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    category: 'desktop',
  },

  // Wide
  {
    name: 'Ultrawide',
    width: 2560,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    category: 'wide',
  },
  {
    name: '4K Display',
    width: 3840,
    height: 2160,
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
    category: 'wide',
  },
];

export function getBreakpointTransitionSizes(breakpoints: number[]): number[] {
  const transitionSizes: number[] = [];
  for (const bp of breakpoints) {
    transitionSizes.push(bp - 1);
    transitionSizes.push(bp);
    transitionSizes.push(bp + 1);
  }
  return transitionSizes;
}

export const commonBreakpoints = {
  tailwind: [640, 768, 1024, 1280, 1536],
  bootstrap: [576, 768, 992, 1200, 1400],
  materialUI: [600, 900, 1200, 1536],
};
```

### Overflow Detection Utility

The most critical responsive test is checking for horizontal overflow. Build a utility that comprehensively detects all forms of overflow.

```typescript
import { Page } from '@playwright/test';

export interface OverflowResult {
  hasHorizontalOverflow: boolean;
  hasVerticalOverflow: boolean;
  documentWidth: number;
  viewportWidth: number;
  overflowAmount: number;
  overflowingElements: OverflowingElement[];
}

export interface OverflowingElement {
  selector: string;
  tagName: string;
  className: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  overflowRight: number;
  textContent: string;
}

export class OverflowDetector {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async detectHorizontalOverflow(): Promise<OverflowResult> {
    const result = await this.page.evaluate(() => {
      const viewportWidth = document.documentElement.clientWidth;
      const documentWidth = document.documentElement.scrollWidth;
      const hasHorizontalOverflow = documentWidth > viewportWidth;
      const overflowAmount = Math.max(0, documentWidth - viewportWidth);

      const overflowingElements: OverflowingElement[] = [];

      if (hasHorizontalOverflow) {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          if (rect.right > viewportWidth + 1) {
            overflowingElements.push({
              selector:
                el.tagName.toLowerCase() +
                (el.id ? `#${el.id}` : '') +
                (el.className && typeof el.className === 'string'
                  ? '.' + el.className.trim().split(/\s+/).join('.')
                  : ''),
              tagName: el.tagName,
              className: typeof el.className === 'string' ? el.className : '',
              boundingBox: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
              overflowRight: Math.round(rect.right - viewportWidth),
              textContent: (el.textContent || '').substring(0, 100),
            });
          }
        }
      }

      return {
        hasHorizontalOverflow,
        hasVerticalOverflow:
          document.documentElement.scrollHeight > document.documentElement.clientHeight,
        documentWidth,
        viewportWidth,
        overflowAmount,
        overflowingElements: overflowingElements.slice(0, 20),
      };
    });

    return result;
  }

  async detectOverflowAfterAction(action: () => Promise<void>): Promise<OverflowResult> {
    await action();
    await this.page.waitForTimeout(500);
    return this.detectHorizontalOverflow();
  }

  async detectTextOverflow(): Promise<OverflowingElement[]> {
    return await this.page.evaluate(() => {
      const results: OverflowingElement[] = [];
      const textElements = document.querySelectorAll(
        'p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, label, button'
      );

      for (const el of textElements) {
        const style = window.getComputedStyle(el);
        const htmlEl = el as HTMLElement;
        const isOverflowing =
          htmlEl.scrollWidth > htmlEl.clientWidth &&
          style.overflow !== 'hidden' &&
          style.textOverflow !== 'ellipsis';

        if (isOverflowing) {
          const rect = el.getBoundingClientRect();
          results.push({
            selector:
              el.tagName.toLowerCase() +
              (el.id ? `#${el.id}` : '') +
              (el.className && typeof el.className === 'string'
                ? '.' + el.className.trim().split(/\s+/).join('.')
                : ''),
            tagName: el.tagName,
            className: typeof el.className === 'string' ? el.className : '',
            boundingBox: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
            overflowRight: htmlEl.scrollWidth - htmlEl.clientWidth,
            textContent: (el.textContent || '').substring(0, 100),
          });
        }
      }

      return results;
    });
  }
}
```

## Detailed Testing Guides

### 1. Horizontal Overflow Detection Across All Viewports

This is the most critical responsive test. Run it against every target viewport size and every major page.

```typescript
import { test, expect } from '@playwright/test';
import { viewportRegistry } from '../helpers/viewport-sizes';
import { OverflowDetector } from '../helpers/overflow-detector';

const pages = ['/', '/about', '/pricing', '/blog', '/contact', '/dashboard'];

for (const viewport of viewportRegistry) {
  for (const pagePath of pages) {
    test(`No horizontal overflow on ${pagePath} at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      browser,
    }) => {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.deviceScaleFactor,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });
      const page = await context.newPage();
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      const detector = new OverflowDetector(page);
      const result = await detector.detectHorizontalOverflow();

      if (result.hasHorizontalOverflow) {
        const overflowers = result.overflowingElements
          .map((el) => `${el.selector} (overflow: ${el.overflowRight}px)`)
          .join('\n  ');
        expect(
          result.hasHorizontalOverflow,
          `Horizontal overflow of ${result.overflowAmount}px at ${viewport.name} on ${pagePath}.\nOverflowing elements:\n  ${overflowers}`
        ).toBe(false);
      }

      await context.close();
    });
  }
}
```

### 2. Breakpoint Transition Testing

Test that layouts transition smoothly at breakpoint boundaries without visual artifacts, overlapping elements, or layout jumps.

```typescript
import { test, expect } from '@playwright/test';
import { getBreakpointTransitionSizes, commonBreakpoints } from '../helpers/viewport-sizes';

const transitionWidths = getBreakpointTransitionSizes(commonBreakpoints.tailwind);

test.describe('Breakpoint Transitions', () => {
  for (const width of transitionWidths) {
    test(`Layout is correct at ${width}px width`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const overlaps = await page.evaluate(() => {
        const elements = document.querySelectorAll(
          'header, nav, main, aside, footer, section, .card, .grid > *'
        );
        const rects = Array.from(elements).map((el) => ({
          selector:
            el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : '') +
            (el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
              : ''),
          rect: el.getBoundingClientRect(),
        }));

        const overlappingPairs: string[] = [];
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i].rect;
            const b = rects[j].rect;
            if (a.width === 0 || a.height === 0 || b.width === 0 || b.height === 0) continue;

            const overlapsHorizontally = a.left < b.right && a.right > b.left;
            const overlapsVertically = a.top < b.bottom && a.bottom > b.top;

            if (overlapsHorizontally && overlapsVertically) {
              const overlapArea =
                Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const overlapHeight =
                Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              const area = overlapArea * overlapHeight;

              if (area > 100) {
                overlappingPairs.push(
                  `${rects[i].selector} overlaps ${rects[j].selector} (${Math.round(area)}px2)`
                );
              }
            }
          }
        }

        return overlappingPairs;
      });

      expect(
        overlaps,
        `Overlapping elements at ${width}px:\n${overlaps.join('\n')}`
      ).toHaveLength(0);
    });
  }
});
```

### 3. Touch Target Size Verification

Mobile users need touch targets that are large enough to tap accurately. WCAG recommends at least 44x44 CSS pixels for interactive elements.

```typescript
import { test, expect } from '@playwright/test';
import { viewportRegistry } from '../helpers/viewport-sizes';

const mobileViewports = viewportRegistry.filter(
  (v) => v.isMobile && v.category === 'mobile'
);

for (const viewport of mobileViewports) {
  test(`Touch targets meet minimum size on ${viewport.name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const undersizedTargets = await page.evaluate(() => {
      const interactiveSelectors =
        'a, button, input, select, textarea, [role="button"], [tabindex]';
      const elements = document.querySelectorAll(interactiveSelectors);
      const minSize = 44;
      const violations: Array<{ selector: string; width: number; height: number }> = [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        ) {
          continue;
        }
        if (rect.width === 0 || rect.height === 0) continue;

        if (rect.width < minSize || rect.height < minSize) {
          violations.push({
            selector:
              el.tagName.toLowerCase() +
              (el.id ? `#${el.id}` : '') +
              (el.className && typeof el.className === 'string'
                ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
                : ''),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }

      return violations;
    });

    const criticalViolations = undersizedTargets.filter(
      (t) => t.width < 30 || t.height < 30
    );

    expect(
      criticalViolations,
      `${criticalViolations.length} touch targets critically undersized on ${viewport.name}:\n${criticalViolations
        .map((v) => `  ${v.selector}: ${v.width}x${v.height}px`)
        .join('\n')}`
    ).toHaveLength(0);

    await context.close();
  });
}
```

### 4. Image Scaling and Aspect Ratio Testing

Images that do not scale correctly cause overflow, layout shifts, and visual distortion on responsive layouts.

```typescript
import { test, expect } from '@playwright/test';
import { viewportRegistry } from '../helpers/viewport-sizes';

test.describe('Image Responsive Behavior', () => {
  const testViewports = viewportRegistry.filter(
    (v) =>
      v.name === 'Small Android' || v.name === 'iPad Air' || v.name === 'Desktop HD'
  );

  for (const viewport of testViewports) {
    test(`Images scale correctly on ${viewport.name}`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const imageIssues = await page.evaluate((viewportWidth) => {
        const images = document.querySelectorAll('img');
        const issues: Array<{
          src: string;
          naturalWidth: number;
          displayWidth: number;
          overflow: boolean;
          distorted: boolean;
        }> = [];

        for (const img of images) {
          const rect = img.getBoundingClientRect();
          if (rect.width === 0) continue;

          const overflow = rect.right > viewportWidth;
          const naturalRatio = img.naturalWidth / img.naturalHeight;
          const displayRatio = rect.width / rect.height;
          const distorted = Math.abs(naturalRatio - displayRatio) > 0.1;

          if (overflow || distorted) {
            issues.push({
              src: img.src.substring(0, 100),
              naturalWidth: img.naturalWidth,
              displayWidth: Math.round(rect.width),
              overflow,
              distorted,
            });
          }
        }

        return issues;
      }, viewport.width);

      expect(
        imageIssues.filter((i) => i.overflow),
        `Images overflowing viewport on ${viewport.name}`
      ).toHaveLength(0);

      expect(
        imageIssues.filter((i) => i.distorted),
        `Distorted images on ${viewport.name}`
      ).toHaveLength(0);

      await context.close();
    });
  }
});
```

### 5. Navigation Responsive Behavior

Test that navigation menus adapt correctly across breakpoints, including hamburger menu toggling, dropdown positioning, and overlay behavior.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Navigation Responsive Behavior', () => {
  test('hamburger menu appears on mobile and desktop nav is hidden', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await expect(
      page.locator('.hamburger-menu, [aria-label="Toggle menu"]')
    ).toBeVisible();
    await expect(
      page.locator('nav.desktop-nav, .nav-links:not(.mobile)')
    ).toBeHidden();
  });

  test('hamburger menu opens and closes correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const hamburger = page.locator('.hamburger-menu, [aria-label="Toggle menu"]');
    await hamburger.click();
    await expect(page.locator('.mobile-nav, [role="navigation"]')).toBeVisible();

    await hamburger.click();
    await expect(page.locator('.mobile-nav, .nav-overlay')).toBeHidden();
  });

  test('desktop nav is visible and hamburger is hidden on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    await expect(page.locator('nav.desktop-nav, .nav-links')).toBeVisible();
    await expect(
      page.locator('.hamburger-menu, [aria-label="Toggle menu"]')
    ).toBeHidden();
  });

  test('navigation dropdown does not overflow viewport on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const hamburger = page.locator('.hamburger-menu, [aria-label="Toggle menu"]');
    await hamburger.click();

    const nav = page.locator('.mobile-nav, [role="navigation"]');
    const navBox = await nav.boundingBox();

    if (navBox) {
      expect(navBox.x).toBeGreaterThanOrEqual(0);
      expect(navBox.x + navBox.width).toBeLessThanOrEqual(375 + 1);
    }
  });
});
```

### 6. Typography Scaling Verification

Font sizes, line heights, and text wrapping must adapt smoothly across viewport sizes to maintain readability.

```typescript
import { test, expect } from '@playwright/test';

test.describe('Typography Scaling', () => {
  const viewportWidths = [320, 375, 768, 1024, 1920];

  for (const width of viewportWidths) {
    test(`Text is readable at ${width}px viewport width`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const typographyIssues = await page.evaluate(() => {
        const issues: string[] = [];
        const bodyElements = document.querySelectorAll('p, li, td, span');
        const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');

        for (const el of bodyElements) {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          if (fontSize < 12 && style.display !== 'none' && el.textContent?.trim()) {
            issues.push(`Body text too small: ${fontSize}px in ${el.tagName}`);
          }
        }

        for (const el of headingElements) {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          const lineHeight = parseFloat(style.lineHeight);
          const ratio = lineHeight / fontSize;

          if (ratio < 1.1 || ratio > 2.0) {
            issues.push(
              `Heading line-height ratio out of range: ${ratio.toFixed(2)} for ${el.tagName} (${fontSize}px)`
            );
          }
        }

        return issues;
      });

      expect(
        typographyIssues,
        `Typography issues at ${width}px:\n${typographyIssues.join('\n')}`
      ).toHaveLength(0);
    });
  }
});
```

## Configuration

### Playwright Configuration for Responsive Testing

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/responsive',
  timeout: 30000,
  retries: 1,
  workers: 4,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'desktop-safari',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  reporter: [
    ['html', { outputFolder: 'reports/responsive' }],
    ['json', { outputFile: 'reports/responsive-report.json' }],
  ],
});
```

## Best Practices

1. **Test at breakpoint boundaries, not just named device sizes.** If your CSS has a breakpoint at 768px, test at 767px, 768px, and 769px. The transition between layout modes is where bugs hide, not the middle of a range.

2. **Use real device viewports, not arbitrary round numbers.** Test at 375px (iPhone), 390px (iPhone 14), 412px (Pixel), not at 400px or 500px. Real device dimensions expose layout issues that occur on actual user devices.

3. **Always test with long text content.** Inject longer-than-expected strings into headings, buttons, and labels. Internationalized content (German, Finnish) routinely produces text 40% longer than English. Test with extended text to catch truncation and overflow issues.

4. **Verify that `overflow-x: hidden` is not masking bugs.** A common anti-pattern is applying `overflow-x: hidden` to the body to hide horizontal scroll. This masks the symptom without fixing the cause. Test that no element extends beyond the viewport, even if the scrollbar is hidden.

5. **Test keyboard navigation at mobile breakpoints.** Mobile layouts often change navigation structure (collapsing menus, hiding sidebars). Verify that keyboard Tab order still makes logical sense after the layout adapts.

6. **Capture full-page screenshots, not just viewport screenshots.** Viewport-only screenshots miss overflow that occurs below the fold. Use Playwright's `fullPage: true` option for visual comparison tests.

7. **Test with browser zoom levels of 100%, 150%, and 200%.** Many users, especially those with visual impairments, browse at increased zoom levels. A 1920px viewport at 200% zoom behaves like a 960px viewport for CSS media queries.

8. **Verify that sticky and fixed positioning works across viewports.** Sticky headers, fixed navigation, and floating action buttons must not overlap content or disappear at certain viewport sizes. Test scroll behavior with fixed elements at every breakpoint.

9. **Test form layouts separately from content layouts.** Forms have unique responsive challenges: label positioning, input widths, error message placement, and submit button alignment. Dedicated form layout tests catch issues that page-level tests miss.

10. **Test dynamic content changes at each viewport size.** Accordion expansions, tab switches, and dropdown openings can cause layout reflows that push content off-screen or create unexpected scrollbars. Test these interactions at every viewport size.

11. **Validate that CSS Grid and Flexbox fallbacks work for older viewports.** If your application supports older browsers, verify that grid and flex layouts degrade gracefully. Test with feature-reduced browser modes.

12. **Automate visual regression screenshots at each breakpoint.** Take baseline screenshots at every viewport size and compare on each test run. This catches subtle layout shifts that are invisible to overflow detection but visible to users.

## Anti-Patterns to Avoid

1. **Testing only at "mobile," "tablet," and "desktop" sizes.** Three viewport sizes are grossly insufficient. There are dozens of common device sizes, and bugs hide in the gaps between them. Test at a minimum of 15 viewport widths.

2. **Using `page.setViewportSize()` without setting `isMobile` and `hasTouch`.** Viewport size alone does not simulate a mobile device. Mobile browsers behave differently: they have different default font sizes, scroll behavior, and touch event handling. Set all device emulation properties.

3. **Ignoring landscape orientation on mobile devices.** Mobile users rotate their phones regularly. A layout that works in portrait but breaks in landscape (or vice versa) is a real bug that affects real users. Test both orientations.

4. **Testing responsive behavior only on the home page.** Different pages have different layouts. A pricing page with a comparison table, a blog post with embedded media, and a dashboard with charts all have distinct responsive challenges. Test every page template.

5. **Assuming CSS media queries fire at the exact pixel specified.** Browser rendering engines may have sub-pixel differences. Test at breakpoint-1, breakpoint, and breakpoint+1 to account for rounding behavior.

6. **Not testing with dynamically loaded content.** A page that looks correct before an API response arrives may overflow after data renders. Wait for all network requests to complete before measuring layout.

7. **Using fixed pixel widths in test assertions instead of relative values.** An element that is "250px wide" is correct on a 1920px viewport but may be too wide on a 320px viewport. Assert that elements are proportionally sized relative to their container, not at specific pixel dimensions.

8. **Skipping font loading in visual regression tests.** System fonts and web fonts render differently. If your visual comparison tests run before custom fonts load, you will get false diffs when fonts load faster or slower than expected. Wait for `document.fonts.ready` before taking screenshots.

## Debugging Tips

1. **Use Playwright's `page.screenshot({ fullPage: true })` to capture the entire scrollable area.** When an overflow issue is reported, the full-page screenshot shows exactly where content extends beyond the viewport boundary.

2. **Add a red border to overflowing elements for visual identification.** Inject a style that adds `outline: 3px solid red` to any element whose bounding rect extends beyond the viewport. This makes overflow immediately visible in screenshots.

```typescript
await page.addStyleTag({
  content: `
    * {
      outline: 1px solid rgba(255, 0, 0, 0.1) !important;
    }
  `,
});
```

3. **Use Chrome DevTools device mode "Responsive" to manually drag the viewport.** Before writing automated tests, manually drag the viewport width from 320px to 1920px slowly. Watch for layout jumps, overflow, and overlapping elements at specific widths.

4. **Check computed styles at the breakpoint boundary.** Use `page.evaluate()` to read the computed value of CSS properties (flex-direction, grid-template-columns, display) at the exact breakpoint to verify the media query activated.

5. **Log all CSS media queries and their activation state.** Use `window.matchMedia()` to programmatically check which breakpoints are active at the current viewport size. This confirms that your CSS breakpoints are firing as expected.

```typescript
const activeBreakpoints = await page.evaluate(() => {
  const breakpoints = [640, 768, 1024, 1280, 1536];
  return breakpoints.map((bp) => ({
    breakpoint: bp,
    active: window.matchMedia(`(min-width: ${bp}px)`).matches,
  }));
});
```

6. **Test with real content from your CMS or API.** Synthetic test data is often too uniform. Real content has varying lengths, missing fields, and unexpected characters that expose layout issues synthetic data does not.

7. **Use Playwright's built-in device emulation rather than just viewport sizing.** `devices['iPhone 14']` sets viewport, deviceScaleFactor, userAgent, isMobile, and hasTouch simultaneously. This catches issues that depend on browser behavior (like mobile tap highlighting) rather than just viewport width.

By systematically applying these tests across your application's pages and the full range of viewport sizes, you will catch responsive layout bugs before they reach users on real devices. The core strategy is simple: test at every breakpoint boundary with realistic content and assert that nothing overflows, overlaps, or becomes unreachable.
