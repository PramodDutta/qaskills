---
name: Screenshot Baseline Generator
description: Generate and maintain visual regression screenshot baselines with intelligent diffing, responsive breakpoint coverage, and dynamic content masking strategies
version: 1.0.0
author: Pramod
license: MIT
tags: [visual-regression, screenshot-testing, baseline, image-diff, pixel-comparison, responsive-screenshots, visual-testing]
testingTypes: [visual, e2e]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Screenshot Baseline Generator Skill

You are an expert QA engineer specializing in visual regression testing and screenshot baseline management. When the user asks you to create, review, or improve visual regression tests, follow these detailed instructions to generate comprehensive screenshot baselines with intelligent diffing, responsive coverage, dynamic content masking, and CI-integrated baseline update workflows.

## Core Principles

1. **Baselines are contracts** -- A screenshot baseline is a visual contract that says "this is what the page should look like." Any deviation from this contract must be intentional and reviewed. Treat baseline updates with the same rigor as code changes.
2. **Determinism is foundational** -- A screenshot test that produces different images on each run is worse than no test. Eliminate all sources of non-determinism before establishing baselines: animations, timestamps, random content, external images, and network-dependent resources.
3. **Responsive coverage is not optional** -- Users access web applications at dozens of viewport sizes. A visual test that only checks desktop resolution misses layout breakages that affect the majority of users on mobile and tablet devices.
4. **Threshold tuning is an art** -- A zero-threshold comparison flags anti-aliasing differences as failures. An overly generous threshold misses real regressions. Calibrate thresholds per component based on its visual complexity.
5. **Dynamic content must be masked, not ignored** -- Dates, advertisements, user avatars, and randomized content change between runs. Mask these regions with deterministic placeholders rather than excluding them from comparison entirely.
6. **Component-level baselines complement page-level baselines** -- Full-page screenshots catch layout shifts but produce large diffs for small changes. Component-level screenshots provide precise, reviewable diffs for individual UI elements.
7. **Cross-browser baselines are separate baselines** -- Chrome and Firefox render fonts, shadows, and gradients differently. Maintain separate baselines per browser rather than using a single baseline with generous tolerance.
8. **Baseline updates require human approval** -- Automated baseline updates bypass the purpose of visual testing. Every baseline change should be reviewed in a pull request with before/after comparison.
9. **Animations are the enemy of stability** -- CSS animations, transitions, skeleton loaders, and cursor blinks cause pixel-level differences between runs. Disable or wait for animations to complete before capturing screenshots.
10. **Font loading affects every pixel** -- A screenshot captured before web fonts load looks completely different from one captured after. Wait for font loading to complete before any capture.

## Project Structure

```
tests/
  visual/
    baselines/
      desktop/
        homepage.png
        dashboard.png
        settings.png
      tablet/
        homepage.png
        dashboard.png
      mobile/
        homepage.png
        dashboard.png
    components/
      baselines/
        button-primary.png
        card-product.png
        navigation-header.png
        modal-dialog.png
    helpers/
      screenshot-capture.ts
      baseline-manager.ts
      mask-builder.ts
      animation-disabler.ts
      font-loader.ts
      viewport-manager.ts
    tests/
      homepage.visual.test.ts
      dashboard.visual.test.ts
      components.visual.test.ts
      responsive.visual.test.ts
      cross-browser.visual.test.ts
    config/
      visual-test.config.ts
      viewports.ts
      masks.ts
    reports/
      diff-reporter.ts
      baseline-review.ts
```

## Playwright Screenshot Comparison API

Playwright provides built-in screenshot comparison through `toHaveScreenshot()`. Understanding its API is the foundation for all visual testing.

### Basic Screenshot Comparison

```typescript
// homepage.visual.test.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and wait for full load
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for web fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Disable animations globally
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          scroll-behavior: auto !important;
        }
      `,
    });
  });

  test('should match homepage baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match homepage hero section', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toHaveScreenshot('hero-section.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('should match homepage after scrolling to features', async ({ page }) => {
    const features = page.locator('[data-testid="features-section"]');
    await features.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300); // Wait for any scroll-triggered animations

    await expect(features).toHaveScreenshot('features-section.png');
  });
});
```

### Advanced Screenshot Configuration

```typescript
// screenshot-capture.ts
import { Page, Locator, expect } from '@playwright/test';

interface ScreenshotOptions {
  name: string;
  fullPage?: boolean;
  maxDiffPixels?: number;
  maxDiffPixelRatio?: number;
  threshold?: number;
  mask?: Locator[];
  maskColor?: string;
  animations?: 'disabled' | 'allow';
  caret?: 'hide' | 'initial';
  scale?: 'css' | 'device';
  timeout?: number;
}

class ScreenshotCapture {
  constructor(private page: Page) {}

  async prepareForCapture(): Promise<void> {
    // 1. Wait for network to settle
    await this.page.waitForLoadState('networkidle');

    // 2. Wait for all fonts to load
    await this.page.evaluate(() => document.fonts.ready);

    // 3. Wait for all images to load
    await this.page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve, reject) => {
            img.addEventListener('load', resolve);
            img.addEventListener('error', reject);
          });
        })
      );
    });

    // 4. Disable all animations and transitions
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
        /* Disable specific problem animations */
        .skeleton-loader { animation: none !important; opacity: 1 !important; }
        .spinner { animation: none !important; display: none !important; }
        video, .video-player { display: none !important; }
      `,
    });

    // 5. Wait for any remaining React/Vue hydration
    await this.page.waitForTimeout(500);

    // 6. Scroll to top for consistent starting position
    await this.page.evaluate(() => window.scrollTo(0, 0));
  }

  async captureFullPage(options: ScreenshotOptions): Promise<void> {
    await this.prepareForCapture();
    await expect(this.page).toHaveScreenshot(options.name, {
      fullPage: true,
      maxDiffPixels: options.maxDiffPixels ?? 100,
      maxDiffPixelRatio: options.maxDiffPixelRatio,
      threshold: options.threshold ?? 0.2,
      mask: options.mask ?? [],
      maskColor: options.maskColor ?? '#FF00FF',
      animations: 'disabled',
      caret: 'hide',
      scale: options.scale ?? 'css',
      timeout: options.timeout ?? 30000,
    });
  }

  async captureElement(
    locator: Locator,
    options: ScreenshotOptions
  ): Promise<void> {
    await this.prepareForCapture();
    await locator.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(200);

    await expect(locator).toHaveScreenshot(options.name, {
      maxDiffPixels: options.maxDiffPixels ?? 50,
      maxDiffPixelRatio: options.maxDiffPixelRatio,
      threshold: options.threshold ?? 0.2,
      mask: options.mask ?? [],
      maskColor: options.maskColor ?? '#FF00FF',
      animations: 'disabled',
      caret: 'hide',
      timeout: options.timeout ?? 15000,
    });
  }

  async captureViewport(
    viewportWidth: number,
    viewportHeight: number,
    options: ScreenshotOptions
  ): Promise<void> {
    await this.page.setViewportSize({
      width: viewportWidth,
      height: viewportHeight,
    });
    await this.page.waitForTimeout(500); // Wait for responsive layout to settle
    await this.captureFullPage(options);
  }
}
```

## Dynamic Content Masking

Dynamic content is the primary source of false positives in visual regression testing. Masking replaces dynamic regions with a solid color before comparison.

```typescript
// mask-builder.ts
import { Page, Locator } from '@playwright/test';

interface MaskDefinition {
  selector: string;
  reason: string;
  maskColor?: string;
}

class MaskBuilder {
  private masks: MaskDefinition[] = [];

  /**
   * Add common masks that apply to most pages
   */
  addCommonMasks(): MaskBuilder {
    this.masks.push(
      { selector: '[data-testid="current-date"]', reason: 'Dynamic date display' },
      { selector: '[data-testid="current-time"]', reason: 'Dynamic time display' },
      { selector: '[data-testid="user-avatar"]', reason: 'User-specific avatar' },
      { selector: '.relative-time', reason: 'Relative timestamps (e.g., "2 hours ago")' },
      { selector: '[data-testid="notification-count"]', reason: 'Dynamic notification badge' },
      { selector: '.ad-container', reason: 'Advertisement content' },
      { selector: 'iframe[src*="youtube"]', reason: 'Embedded video' },
      { selector: 'iframe[src*="maps"]', reason: 'Embedded map' },
      { selector: '.analytics-widget', reason: 'Live analytics data' },
      { selector: '[data-testid="random-testimonial"]', reason: 'Randomized content' },
    );
    return this;
  }

  /**
   * Add page-specific masks
   */
  addMask(selector: string, reason: string): MaskBuilder {
    this.masks.push({ selector, reason });
    return this;
  }

  /**
   * Resolve all mask definitions to Playwright Locators
   */
  resolve(page: Page): Locator[] {
    return this.masks
      .map(mask => {
        const locator = page.locator(mask.selector);
        return locator;
      });
  }

  /**
   * Alternative: Replace dynamic content with deterministic placeholders
   * This is more stable than masking because it preserves layout
   */
  async replaceDynamicContent(page: Page): Promise<void> {
    await page.evaluate(() => {
      // Replace all relative timestamps with a fixed value
      document.querySelectorAll('.relative-time, time[datetime]').forEach(el => {
        el.textContent = 'Jan 1, 2024';
      });

      // Replace all avatars with a placeholder
      document.querySelectorAll<HTMLImageElement>('img[data-testid="user-avatar"]').forEach(img => {
        img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23ccc" width="40" height="40"/></svg>';
      });

      // Replace notification counts
      document.querySelectorAll('[data-testid="notification-count"]').forEach(el => {
        el.textContent = '0';
      });

      // Replace random content with deterministic content
      document.querySelectorAll('[data-randomized]').forEach(el => {
        el.textContent = 'Deterministic placeholder';
      });

      // Replace live data counters
      document.querySelectorAll('[data-testid="live-count"]').forEach(el => {
        el.textContent = '42';
      });
    });
  }
}

// Usage in tests
const masks = new MaskBuilder()
  .addCommonMasks()
  .addMask('[data-testid="carousel"]', 'Auto-rotating carousel')
  .addMask('.chat-widget', 'Third-party chat widget');
```

## Responsive Breakpoint Screenshot Matrix

Testing across breakpoints requires a systematic approach to viewport management.

```typescript
// viewports.ts
interface ViewportDefinition {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
  hasTouch?: boolean;
}

const standardViewports: ViewportDefinition[] = [
  { name: 'mobile-portrait', width: 375, height: 812, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  { name: 'mobile-landscape', width: 812, height: 375, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
  { name: 'tablet-portrait', width: 768, height: 1024, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'tablet-landscape', width: 1024, height: 768, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'ultrawide', width: 2560, height: 1440 },
];

// Breakpoint-specific viewports matching CSS media queries
const breakpointViewports: ViewportDefinition[] = [
  { name: 'below-sm', width: 639, height: 900 },   // Just below sm (640px)
  { name: 'at-sm', width: 640, height: 900 },       // At sm breakpoint
  { name: 'below-md', width: 767, height: 900 },    // Just below md (768px)
  { name: 'at-md', width: 768, height: 900 },       // At md breakpoint
  { name: 'below-lg', width: 1023, height: 900 },   // Just below lg (1024px)
  { name: 'at-lg', width: 1024, height: 900 },      // At lg breakpoint
  { name: 'below-xl', width: 1279, height: 900 },   // Just below xl (1280px)
  { name: 'at-xl', width: 1280, height: 900 },      // At xl breakpoint
];

// responsive.visual.test.ts
import { test, expect, devices } from '@playwright/test';

for (const viewport of standardViewports) {
  test.describe(`Visual regression at ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      deviceScaleFactor: viewport.deviceScaleFactor,
    });

    test('homepage matches baseline', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);

      const capture = new ScreenshotCapture(page);
      await capture.captureFullPage({
        name: `homepage-${viewport.name}.png`,
        maxDiffPixels: viewport.isMobile ? 200 : 100,
      });
    });

    test('navigation renders correctly', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      const nav = page.locator('[data-testid="main-navigation"]');

      // On mobile, the hamburger menu should be visible
      if (viewport.isMobile) {
        const hamburger = page.locator('[data-testid="mobile-menu-button"]');
        await expect(hamburger).toBeVisible();
      }

      await expect(nav).toHaveScreenshot(`navigation-${viewport.name}.png`, {
        maxDiffPixels: 50,
      });
    });
  });
}

// Test at exact breakpoint boundaries
for (const bp of breakpointViewports) {
  test(`layout at breakpoint boundary ${bp.name} (${bp.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot(`breakpoint-${bp.name}.png`, {
      fullPage: false,
      maxDiffPixels: 150,
    });
  });
}
```

## Component-Level Screenshots

Component screenshots provide granular visual regression coverage with smaller, more reviewable diffs.

```typescript
// components.visual.test.ts
import { test, expect } from '@playwright/test';

test.describe('Component Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to component showcase or Storybook
    await page.goto('/storybook', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content: '*, *::before, *::after { animation: none !important; transition: none !important; }',
    });
  });

  test.describe('Button components', () => {
    test('primary button default state', async ({ page }) => {
      const button = page.locator('[data-testid="button-primary"]');
      await expect(button).toHaveScreenshot('button-primary-default.png', {
        maxDiffPixels: 10,
      });
    });

    test('primary button hover state', async ({ page }) => {
      const button = page.locator('[data-testid="button-primary"]');
      await button.hover();
      await page.waitForTimeout(100);

      await expect(button).toHaveScreenshot('button-primary-hover.png', {
        maxDiffPixels: 10,
      });
    });

    test('primary button disabled state', async ({ page }) => {
      const button = page.locator('[data-testid="button-primary-disabled"]');
      await expect(button).toHaveScreenshot('button-primary-disabled.png', {
        maxDiffPixels: 10,
      });
    });

    test('button with long text wrapping', async ({ page }) => {
      const button = page.locator('[data-testid="button-long-text"]');
      await expect(button).toHaveScreenshot('button-long-text.png', {
        maxDiffPixels: 20,
      });
    });
  });

  test.describe('Card components', () => {
    test('product card with image', async ({ page }) => {
      const card = page.locator('[data-testid="product-card"]').first();
      const masks = new MaskBuilder()
        .addMask('[data-testid="product-price"]', 'Dynamic price')
        .addMask('[data-testid="product-rating"]', 'Dynamic rating');

      await expect(card).toHaveScreenshot('product-card.png', {
        maxDiffPixels: 30,
        mask: masks.resolve(page),
      });
    });

    test('product card skeleton loading state', async ({ page }) => {
      // Navigate to page in loading state
      await page.route('**/api/products/**', route => route.abort());
      await page.goto('/products', { waitUntil: 'domcontentloaded' });

      const skeleton = page.locator('[data-testid="product-card-skeleton"]').first();
      await expect(skeleton).toHaveScreenshot('product-card-skeleton.png', {
        maxDiffPixels: 50,
      });
    });
  });

  test.describe('Modal components', () => {
    test('confirmation dialog', async ({ page }) => {
      await page.locator('[data-testid="open-modal-button"]').click();
      await page.waitForSelector('[data-testid="modal-dialog"]', { state: 'visible' });
      await page.waitForTimeout(300); // Wait for open animation

      const modal = page.locator('[data-testid="modal-dialog"]');
      await expect(modal).toHaveScreenshot('modal-confirmation.png', {
        maxDiffPixels: 20,
      });
    });

    test('modal with backdrop', async ({ page }) => {
      await page.locator('[data-testid="open-modal-button"]').click();
      await page.waitForSelector('[data-testid="modal-overlay"]', { state: 'visible' });
      await page.waitForTimeout(300);

      // Capture the full page to include the backdrop
      await expect(page).toHaveScreenshot('modal-with-backdrop.png', {
        maxDiffPixels: 100,
      });
    });
  });
});
```

## Threshold Configuration

Different components require different comparison thresholds based on their visual complexity and rendering stability.

```typescript
// visual-test.config.ts
interface ThresholdConfig {
  global: {
    maxDiffPixels: number;
    maxDiffPixelRatio: number;
    threshold: number; // Per-pixel color threshold (0-1)
  };
  perComponent: Record<string, {
    maxDiffPixels: number;
    maxDiffPixelRatio?: number;
    threshold?: number;
    reason: string;
  }>;
  perBrowser: Record<string, {
    maxDiffPixels: number;
    reason: string;
  }>;
}

const thresholdConfig: ThresholdConfig = {
  global: {
    maxDiffPixels: 100,
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  },
  perComponent: {
    'icon-svg': {
      maxDiffPixels: 5,
      threshold: 0.1,
      reason: 'SVG icons should be pixel-perfect',
    },
    'text-heavy': {
      maxDiffPixels: 200,
      threshold: 0.3,
      reason: 'Text rendering varies with font hinting; needs higher tolerance',
    },
    'gradient-background': {
      maxDiffPixels: 500,
      maxDiffPixelRatio: 0.02,
      reason: 'GPU-rendered gradients have sub-pixel variations across runs',
    },
    'shadow-heavy': {
      maxDiffPixels: 300,
      threshold: 0.25,
      reason: 'Box shadows render differently across GPU drivers',
    },
    'chart-visualization': {
      maxDiffPixels: 1000,
      maxDiffPixelRatio: 0.05,
      reason: 'Charts with anti-aliased lines need generous tolerance',
    },
    'full-page': {
      maxDiffPixels: 500,
      maxDiffPixelRatio: 0.01,
      reason: 'Full page screenshots accumulate small differences across many elements',
    },
  },
  perBrowser: {
    firefox: {
      maxDiffPixels: 300,
      reason: 'Firefox renders fonts and sub-pixel elements differently from Chromium',
    },
    webkit: {
      maxDiffPixels: 400,
      reason: 'WebKit has distinct rendering for shadows, gradients, and text',
    },
  },
};
```

## Animation and Transition Handling

```typescript
// animation-disabler.ts
import { Page } from '@playwright/test';

class AnimationDisabler {
  /**
   * Inject CSS that disables all animations and transitions
   */
  static async disableAll(page: Page): Promise<void> {
    await page.addStyleTag({
      content: `
        /* Disable CSS animations */
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }

        /* Hide cursor blink */
        * {
          caret-color: transparent !important;
        }

        /* Stop auto-playing videos and GIFs */
        video {
          display: none !important;
        }

        /* Freeze skeleton loaders */
        [class*="skeleton"],
        [class*="shimmer"],
        [class*="pulse"] {
          animation: none !important;
          opacity: 1 !important;
          background: #e0e0e0 !important;
        }

        /* Freeze carousels */
        [class*="carousel"],
        [class*="slider"] {
          animation: none !important;
          transform: none !important;
        }

        /* Disable smooth scrolling */
        html {
          scroll-behavior: auto !important;
        }

        /* Remove blur effects that may render inconsistently */
        [style*="blur"] {
          filter: none !important;
        }
      `,
    });
  }

  /**
   * Wait for all ongoing animations to complete before capture
   */
  static async waitForAnimationsToComplete(page: Page): Promise<void> {
    await page.evaluate(async () => {
      // Wait for Web Animations API animations
      const animations = document.getAnimations();
      if (animations.length > 0) {
        await Promise.all(animations.map(a => a.finished.catch(() => {})));
      }

      // Wait for CSS transitions by checking computed styles
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
    });
  }

  /**
   * Stabilize specific known problematic elements
   */
  static async stabilizeElements(page: Page): Promise<void> {
    await page.evaluate(() => {
      // Replace animated SVG spinners with static versions
      document.querySelectorAll('svg.animate-spin').forEach(el => {
        el.classList.remove('animate-spin');
      });

      // Ensure lazy-loaded images have loaded or show fallback
      document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach(img => {
        if (!img.complete) {
          img.style.backgroundColor = '#f0f0f0';
          img.style.minHeight = '100px';
        }
      });

      // Collapse any toast notifications
      document.querySelectorAll('[role="alert"], .toast, .notification').forEach(el => {
        (el as HTMLElement).style.display = 'none';
      });
    });
  }
}
```

## CI Baseline Update Workflow

Managing baselines in CI requires a disciplined process for updating, reviewing, and approving changes.

```typescript
// baseline-manager.ts
import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

interface BaselineUpdateReport {
  updatedBaselines: string[];
  newBaselines: string[];
  removedBaselines: string[];
  unchangedBaselines: string[];
  totalBaselines: number;
}

class BaselineManager {
  private baselineDir: string;
  private actualDir: string;

  constructor(baselineDir: string, actualDir: string) {
    this.baselineDir = baselineDir;
    this.actualDir = actualDir;
  }

  /**
   * Update baselines from latest test run results
   * This should only be called explicitly, never automatically
   */
  updateBaselines(): BaselineUpdateReport {
    const report: BaselineUpdateReport = {
      updatedBaselines: [],
      newBaselines: [],
      removedBaselines: [],
      unchangedBaselines: [],
      totalBaselines: 0,
    };

    const actualFiles = this.getScreenshotFiles(this.actualDir);
    const baselineFiles = this.getScreenshotFiles(this.baselineDir);

    // Process actual screenshots
    for (const file of actualFiles) {
      const baselinePath = join(this.baselineDir, file);
      const actualPath = join(this.actualDir, file);

      if (!existsSync(baselinePath)) {
        // New baseline
        const dir = join(this.baselineDir, file.substring(0, file.lastIndexOf('/')));
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        copyFileSync(actualPath, baselinePath);
        report.newBaselines.push(file);
      } else {
        // Compare and update if different
        const isDifferent = this.filesAreDifferent(actualPath, baselinePath);
        if (isDifferent) {
          copyFileSync(actualPath, baselinePath);
          report.updatedBaselines.push(file);
        } else {
          report.unchangedBaselines.push(file);
        }
      }
    }

    // Find removed baselines (exist in baselines but not in actual)
    for (const file of baselineFiles) {
      if (!actualFiles.includes(file)) {
        report.removedBaselines.push(file);
      }
    }

    report.totalBaselines = actualFiles.length;
    return report;
  }

  private getScreenshotFiles(dir: string): string[] {
    if (!existsSync(dir)) return [];
    const files: string[] = [];
    const walk = (currentDir: string) => {
      for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
        const fullPath = join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.png')) {
          files.push(relative(dir, fullPath));
        }
      }
    };
    walk(dir);
    return files;
  }

  private filesAreDifferent(file1: string, file2: string): boolean {
    try {
      execSync(`diff "${file1}" "${file2}"`, { stdio: 'ignore' });
      return false;
    } catch {
      return true;
    }
  }
}
```

### Playwright Configuration for Visual Tests

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  snapshotDir: './tests/visual/baselines',
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{ext}',

  // Update baselines only when explicitly requested
  updateSnapshots: process.env.UPDATE_BASELINES === 'true' ? 'all' : 'missing',

  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      maxDiffPixelRatio: 0.01,
      threshold: 0.2,
      animations: 'disabled',
      caret: 'hide',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

## Cross-Browser Screenshot Differences

```typescript
// cross-browser.visual.test.ts
import { test, expect } from '@playwright/test';

test.describe('Cross-Browser Visual Consistency', () => {
  test('homepage renders consistently across browsers', async ({ page, browserName }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const capture = new ScreenshotCapture(page);

    // Each browser gets its own baseline (via projectName in snapshot path)
    await capture.captureFullPage({
      name: 'homepage-cross-browser.png',
      // Higher tolerance for browsers with known rendering differences
      maxDiffPixels: browserName === 'chromium' ? 100 : 500,
      threshold: browserName === 'webkit' ? 0.3 : 0.2,
    });
  });

  test('typography renders acceptably across browsers', async ({ page, browserName }) => {
    await page.goto('/typography-showcase', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const textBlock = page.locator('[data-testid="typography-sample"]');

    await expect(textBlock).toHaveScreenshot('typography-sample.png', {
      // Font rendering varies significantly across browsers
      maxDiffPixelRatio: browserName === 'chromium' ? 0.01 : 0.05,
      threshold: 0.3,
    });
  });

  test('form elements render correctly per browser', async ({ page, browserName }) => {
    await page.goto('/form-showcase', { waitUntil: 'networkidle' });

    // Browser-native form elements look very different across browsers
    // Only compare custom-styled form elements
    const customForm = page.locator('[data-testid="custom-styled-form"]');

    await expect(customForm).toHaveScreenshot('custom-form.png', {
      maxDiffPixels: 200,
      // Mask browser-native select/checkbox/radio elements
      mask: [
        page.locator('select:not([data-custom])'),
        page.locator('input[type="checkbox"]:not([data-custom])'),
        page.locator('input[type="radio"]:not([data-custom])'),
      ],
    });
  });
});
```

## Baseline Generation Workflow

```typescript
// baseline-review.ts
// Script to generate a baseline review report for pull requests

interface BaselineDiff {
  file: string;
  before: string;  // path to old baseline
  after: string;   // path to new screenshot
  diff: string;    // path to diff image
  diffPixels: number;
  diffPercentage: number;
}

function generateReviewReport(diffs: BaselineDiff[]): string {
  let report = '## Visual Regression Report\n\n';
  report += `**Total baselines checked:** ${diffs.length}\n`;
  report += `**Baselines changed:** ${diffs.filter(d => d.diffPixels > 0).length}\n\n`;

  const changed = diffs.filter(d => d.diffPixels > 0);

  if (changed.length === 0) {
    report += 'No visual changes detected.\n';
    return report;
  }

  report += '### Changed Baselines\n\n';
  report += '| Screenshot | Diff Pixels | Diff % | Status |\n';
  report += '|---|---|---|---|\n';

  for (const diff of changed) {
    const status = diff.diffPercentage > 5 ? 'Needs Review' : 'Minor Change';
    report += `| ${diff.file} | ${diff.diffPixels} | ${diff.diffPercentage.toFixed(2)}% | ${status} |\n`;
  }

  report += '\n### Before / After / Diff\n\n';
  for (const diff of changed) {
    report += `#### ${diff.file}\n`;
    report += `| Before | After | Diff |\n`;
    report += `|---|---|---|\n`;
    report += `| ![before](${diff.before}) | ![after](${diff.after}) | ![diff](${diff.diff}) |\n\n`;
  }

  return report;
}
```

## Configuration

```typescript
// visual-test.config.ts
interface VisualTestConfig {
  baselines: {
    directory: string;
    updateMode: 'none' | 'missing' | 'all';
    gitTracked: boolean;
    storageBackend: 'filesystem' | 's3' | 'git-lfs';
  };
  capture: {
    defaultTimeout: number;
    waitForFonts: boolean;
    waitForImages: boolean;
    disableAnimations: boolean;
    hideCaret: boolean;
    networkIdleTimeout: number;
    postLoadDelay: number;
  };
  comparison: {
    defaultMaxDiffPixels: number;
    defaultMaxDiffPixelRatio: number;
    defaultThreshold: number;
    diffOutputDirectory: string;
    generateDiffImage: boolean;
    diffHighlightColor: string;
  };
  viewports: ViewportDefinition[];
  browsers: string[];
  masks: {
    globalMasks: MaskDefinition[];
    pageSpecificMasks: Record<string, MaskDefinition[]>;
  };
  ci: {
    failOnNewBaselines: boolean;
    failOnMissingBaselines: boolean;
    generateReport: boolean;
    reportFormat: 'markdown' | 'html' | 'json';
    uploadArtifacts: boolean;
    artifactRetentionDays: number;
  };
}

const defaultConfig: VisualTestConfig = {
  baselines: {
    directory: './tests/visual/baselines',
    updateMode: 'missing',
    gitTracked: true,
    storageBackend: 'filesystem',
  },
  capture: {
    defaultTimeout: 30000,
    waitForFonts: true,
    waitForImages: true,
    disableAnimations: true,
    hideCaret: true,
    networkIdleTimeout: 5000,
    postLoadDelay: 500,
  },
  comparison: {
    defaultMaxDiffPixels: 100,
    defaultMaxDiffPixelRatio: 0.01,
    defaultThreshold: 0.2,
    diffOutputDirectory: './test-results/visual-diffs',
    generateDiffImage: true,
    diffHighlightColor: '#FF00FF',
  },
  viewports: standardViewports,
  browsers: ['chromium', 'firefox', 'webkit'],
  masks: {
    globalMasks: [
      { selector: '[data-testid="timestamp"]', reason: 'Dynamic timestamp' },
      { selector: '[data-testid="avatar"]', reason: 'User-specific avatar' },
    ],
    pageSpecificMasks: {},
  },
  ci: {
    failOnNewBaselines: false,
    failOnMissingBaselines: true,
    generateReport: true,
    reportFormat: 'markdown',
    uploadArtifacts: true,
    artifactRetentionDays: 30,
  },
};
```

## Best Practices

1. **Establish baselines from a clean state** -- Generate baselines against a known-good deployment, not a development branch. The first baseline set is your visual contract, and it must represent the intended design.

2. **Store baselines in version control** -- Baselines should be committed alongside the code they test. Use Git LFS for large baseline repositories to avoid bloating the repository.

3. **Run visual tests after functional tests pass** -- Visual tests depend on the page being in the correct state. If functional tests fail, visual tests will produce misleading failures.

4. **Use data-testid attributes for element targeting** -- CSS class names change during refactoring. Test IDs are stable selectors that survive design system updates.

5. **Mask all dynamic content explicitly** -- Document every mask with a reason. Undocumented masks hide potential regressions. A mask list is a list of things you have decided not to test visually.

6. **Test interactive states explicitly** -- Default, hover, focus, active, disabled, error, and loading states each need their own baseline. A button that looks correct in its default state may be invisible in its disabled state.

7. **Set viewport size before navigation** -- Set the viewport before page load, not after. Pages that respond to viewport size during initial render may produce different layouts if the viewport changes after load.

8. **Wait for network idle before capture** -- Lazy-loaded images, API responses, and third-party scripts affect the visual state. Wait for the network to settle before capturing.

9. **Review baseline updates in pull requests** -- Add before/after diff images to PR descriptions. Visual changes that are not reviewed are visual regressions that have been silently accepted.

10. **Keep baseline file sizes manageable** -- Use PNG format for baselines (lossless). Compress with tools like optipng but do not use lossy compression. Large baselines slow down CI; consider component-level screenshots over full-page screenshots.

11. **Run visual tests on consistent hardware** -- GPU differences, screen resolution, and operating system font rendering affect screenshots. Run visual tests in Docker containers or CI environments with identical configurations.

12. **Separate visual test suites from functional test suites** -- Visual tests are slower and more sensitive to environment changes. Run them as a separate CI job that can be retriggered independently.

13. **Maintain a threshold changelog** -- When you increase a threshold, document why. Gradually increasing thresholds to make tests pass is a sign of eroding visual quality.

## Anti-Patterns to Avoid

1. **Using the same threshold for all elements** -- A pixel-perfect icon needs a threshold of 5 pixels. A full-page screenshot of a data dashboard needs 500. Using a single threshold either produces false positives for simple elements or false negatives for complex ones.

2. **Automatically updating baselines in CI** -- If your CI pipeline automatically accepts new baselines when tests fail, you have no visual regression testing. Every baseline change must be human-reviewed.

3. **Ignoring font loading timing** -- Screenshots captured before web fonts load show system fonts. This produces massive diffs that are not real regressions. Always await `document.fonts.ready`.

4. **Not disabling animations** -- An animation captured at different frames produces different screenshots. This causes flaky tests that undermine confidence in the entire visual test suite.

5. **Testing only one viewport** -- A page that looks correct at 1920px may be completely broken at 375px. Test at minimum: mobile portrait, tablet, and desktop viewports.

6. **Storing baselines outside version control** -- Baselines in S3 or shared drives become orphaned, outdated, and impossible to associate with specific code versions. Keep them in the repository.

7. **Using percentage-based diff thresholds only** -- A 0.1% difference on a 1920x1080 screenshot is 2,073 pixels. That is enough to miss a completely wrong button. Use absolute pixel counts alongside percentage ratios.

8. **Capturing screenshots during page transitions** -- A screenshot taken while a page is navigating, loading, or animating is non-deterministic. Wait for all asynchronous activity to complete.

## Debugging Tips

1. **Test passes locally but fails in CI** -- The most common cause is font rendering differences. CI machines may not have the same fonts installed. Use web fonts served from the application rather than relying on system fonts. Alternatively, use Docker images with identical font packages.

2. **Screenshots differ by a few pixels every run** -- This is typically caused by sub-pixel anti-aliasing, GPU rendering differences, or undetected animations. Increase the threshold slightly and document the reason. If the difference is consistently in the same location, mask that specific region.

3. **Full-page screenshot height varies between runs** -- Dynamic content (lazy-loaded sections, expandable elements, or API-driven lists) can change the page height. Mock API responses to return deterministic data, or use viewport screenshots instead of full-page captures.

4. **Baseline images are blurry on high-DPI displays** -- Set `scale: 'css'` in the screenshot options to capture at CSS pixel resolution rather than device pixel resolution. This produces consistent images regardless of the display's pixel density.

5. **Modal or tooltip screenshots are empty** -- The element may not be visible at the time of capture. Add an explicit wait for the element to become visible: `await page.waitForSelector('[data-testid="modal"]', { state: 'visible' })`.

6. **Carousel or slider captures show different slides** -- Disable auto-rotation before capturing. Either mock the timer, inject CSS to freeze the carousel, or programmatically navigate to a specific slide before capture.

7. **Browser-specific test fails but the page looks identical visually** -- Browsers render text hinting, box shadows, and gradients differently at the sub-pixel level. Maintain separate baselines per browser (Playwright does this automatically with project names in the snapshot path).

8. **Git repository grows too large from baseline images** -- Switch to Git LFS for storing PNG baselines. Run `git lfs install` and add `*.png filter=lfs diff=lfs merge=lfs -text` to `.gitattributes`. This moves large binary files to separate storage.

9. **Visual test takes too long to run** -- Reduce the number of full-page screenshots. Use component-level screenshots for most checks and reserve full-page captures for critical pages only. Also ensure `waitUntil: 'networkidle'` is not waiting for long-polling connections.

10. **Masks are not covering the right area** -- The element may have shifted position between the baseline capture and the current run. Use `data-testid` selectors rather than position-dependent selectors. If the element's size varies, use a parent container as the mask target.