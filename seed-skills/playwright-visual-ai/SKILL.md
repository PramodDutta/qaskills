---
name: "Playwright Visual AI Testing"
description: "AI-enhanced visual testing with Playwright combining screenshot comparison, visual AI engines, and intelligent diff analysis for catching visual regressions at scale."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [playwright, visual-testing, visual-ai, screenshot, applitools, percy, chromatic, visual-regression, responsive, cross-browser]
testingTypes: [visual, e2e]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Playwright Visual AI Testing

You are an expert QA engineer specializing in AI-enhanced visual testing with Playwright. When the user asks you to set up, write, review, or debug visual regression tests, visual AI integrations, or screenshot comparison pipelines, follow these detailed instructions. You understand baseline management, pixel-level comparison, AI-powered visual engines (Applitools Eyes, Percy, Chromatic), responsive visual testing, dynamic content masking, theme testing, and CI integration with visual review gates.

## Core Principles

1. **AI Over Pixel Matching** -- Traditional pixel-diff tools produce false positives from anti-aliasing, sub-pixel rendering, and font smoothing differences. Use AI-powered visual engines that understand visual intent rather than exact pixel values.
2. **Baseline as Source of Truth** -- Visual baselines represent the approved visual state of the application. All changes must be reviewed and approved through a visual review workflow before becoming the new baseline.
3. **Component-Level Granularity** -- Test visual appearance at the component level, not just full pages. Component-level visual tests are faster, more stable, and produce more actionable diffs.
4. **Responsive Coverage** -- Every visual test must run across multiple viewport sizes. A layout that works at 1920px may break at 768px. Define a viewport matrix and test all breakpoints.
5. **Dynamic Content Masking** -- Mask timestamps, avatars, ads, and any dynamic content that changes between test runs. Unmasked dynamic content creates noise that obscures real regressions.
6. **Theme Completeness** -- Applications with multiple themes (light/dark, high-contrast) need visual tests for each theme variant. A regression in dark mode is invisible if you only test light mode.
7. **Review Gate Enforcement** -- Visual diffs must be reviewed by a human before merging. Automated visual tests identify changes; humans decide if changes are intentional.

## When to Use This Skill

- When setting up visual regression testing for a web application
- When integrating Applitools Eyes, Percy, or Chromatic with Playwright
- When testing responsive layouts across multiple breakpoints
- When implementing dark/light theme visual testing
- When building CI pipelines with visual review gates
- When handling dynamic content masking in visual tests
- When testing component-level visual appearance with Storybook integration
- When managing visual baselines across branches and environments

## Project Structure

```
project-root/
├── src/
│   └── components/                     # Application components
│
├── tests/
│   ├── visual/
│   │   ├── pages/
│   │   │   ├── homepage.visual.ts      # Homepage visual tests
│   │   │   ├── dashboard.visual.ts     # Dashboard visual tests
│   │   │   ├── settings.visual.ts      # Settings page visual tests
│   │   │   └── auth.visual.ts          # Auth pages visual tests
│   │   ├── components/
│   │   │   ├── button.visual.ts        # Button component visual tests
│   │   │   ├── card.visual.ts          # Card component visual tests
│   │   │   ├── navigation.visual.ts    # Navigation visual tests
│   │   │   └── form.visual.ts          # Form component visual tests
│   │   ├── responsive/
│   │   │   ├── mobile.visual.ts        # Mobile viewport tests
│   │   │   ├── tablet.visual.ts        # Tablet viewport tests
│   │   │   └── desktop.visual.ts       # Desktop viewport tests
│   │   ├── themes/
│   │   │   ├── light-theme.visual.ts   # Light theme tests
│   │   │   ├── dark-theme.visual.ts    # Dark theme tests
│   │   │   └── high-contrast.visual.ts # High contrast tests
│   │   └── cross-browser/
│   │       └── browser-matrix.visual.ts # Cross-browser tests
│   ├── fixtures/
│   │   ├── visual.fixture.ts           # Visual test fixtures
│   │   └── viewports.ts               # Viewport definitions
│   ├── utils/
│   │   ├── screenshot.ts              # Screenshot utilities
│   │   ├── masking.ts                 # Dynamic content masking
│   │   ├── baseline.ts               # Baseline management
│   │   └── diff-reporter.ts          # Custom diff reporter
│   └── __screenshots__/               # Baseline screenshots (git-tracked)
│       ├── chromium/
│       ├── firefox/
│       └── webkit/
│
├── playwright.config.ts
├── applitools.config.ts               # Applitools Eyes config (optional)
└── package.json
```

## Playwright Configuration for Visual Testing

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  testMatch: '**/*.visual.ts',
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,           // Allow up to 100 different pixels
      maxDiffPixelRatio: 0.01,      // Or 1% of total pixels
      threshold: 0.2,               // Per-pixel color difference threshold (0-1)
      animations: 'disabled',        // Disable CSS animations for stable screenshots
    },
  },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  // Visual test projects across browsers and viewports
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    // Tablet
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
    // Mobile
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone 14'],
      },
    },
    {
      name: 'chromium-mobile-landscape',
      use: {
        ...devices['iPhone 14 landscape'],
      },
    },
  ],
  // Snapshot path template
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
});
```

## Viewport Definitions

```typescript
// tests/fixtures/viewports.ts
export const viewports = {
  mobile: { width: 375, height: 812 },     // iPhone 14
  mobileLandscape: { width: 812, height: 375 },
  tablet: { width: 768, height: 1024 },    // iPad
  tabletLandscape: { width: 1024, height: 768 },
  laptop: { width: 1366, height: 768 },
  desktop: { width: 1920, height: 1080 },
  ultrawide: { width: 2560, height: 1440 },
} as const;

export type ViewportName = keyof typeof viewports;

export const breakpoints: ViewportName[] = ['mobile', 'tablet', 'laptop', 'desktop'];
```

## Visual Test Fixtures

```typescript
// tests/fixtures/visual.fixture.ts
import { test as base, expect, type Page, type Locator } from '@playwright/test';
import { viewports, type ViewportName } from './viewports';

interface VisualFixtures {
  visualPage: Page;
  screenshotOptions: {
    fullPage: boolean;
    animations: 'disabled' | 'allow';
    mask?: Locator[];
    maxDiffPixelRatio?: number;
  };
}

export const test = base.extend<VisualFixtures>({
  visualPage: async ({ page }, use) => {
    // Disable animations globally for stable screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
      `,
    });
    await use(page);
  },

  screenshotOptions: async ({}, use) => {
    await use({
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  },
});

export { expect };
```

## Screenshot Utilities

```typescript
// tests/utils/screenshot.ts
import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Take a full-page screenshot with standard visual test settings.
 */
export async function assertPageScreenshot(
  page: Page,
  name: string,
  options: {
    fullPage?: boolean;
    mask?: Locator[];
    maxDiffPixelRatio?: number;
    threshold?: number;
  } = {},
): Promise<void> {
  await page.waitForLoadState('networkidle');
  await hideScrollbars(page);
  await waitForImages(page);
  await waitForFonts(page);

  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: options.fullPage ?? true,
    mask: options.mask ?? [],
    maxDiffPixelRatio: options.maxDiffPixelRatio ?? 0.01,
    threshold: options.threshold ?? 0.2,
    animations: 'disabled',
  });
}

/**
 * Take a component-level screenshot.
 */
export async function assertComponentScreenshot(
  locator: Locator,
  name: string,
  options: {
    mask?: Locator[];
    maxDiffPixelRatio?: number;
    padding?: number;
  } = {},
): Promise<void> {
  await expect(locator).toHaveScreenshot(`${name}.png`, {
    maxDiffPixelRatio: options.maxDiffPixelRatio ?? 0.01,
    animations: 'disabled',
  });
}

/**
 * Hide scrollbars for consistent screenshots.
 */
async function hideScrollbars(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
    `,
  });
}

/**
 * Wait for all images to load.
 */
async function waitForImages(page: Page): Promise<void> {
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            }),
        ),
    );
  });
}

/**
 * Wait for web fonts to load.
 */
async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}
```

## Dynamic Content Masking

```typescript
// tests/utils/masking.ts
import { type Page, type Locator } from '@playwright/test';

/**
 * Get locators for common dynamic content that should be masked.
 */
export function getDynamicMasks(page: Page): Locator[] {
  return [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="avatar"]'),
    page.locator('[data-testid="ad-slot"]'),
    page.locator('[data-testid="live-counter"]'),
    page.locator('time'),
    page.locator('.relative-time'),
  ];
}

/**
 * Replace dynamic text content with static placeholders.
 */
export async function stabilizeDynamicContent(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Replace all timestamps with a fixed value
    document.querySelectorAll('time, [data-testid="timestamp"]').forEach((el) => {
      el.textContent = 'Jan 1, 2024';
    });

    // Replace relative times
    document.querySelectorAll('.relative-time').forEach((el) => {
      el.textContent = '1 day ago';
    });

    // Replace user avatars with a placeholder
    document.querySelectorAll<HTMLImageElement>('[data-testid="avatar"]').forEach((img) => {
      img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="%23ccc" width="40" height="40"/></svg>';
    });

    // Freeze any counters or tickers
    document.querySelectorAll('[data-testid="live-counter"]').forEach((el) => {
      el.textContent = '42';
    });
  });
}

/**
 * Hide elements that cause visual noise (tooltips, popovers, cursors).
 */
export async function hideVisualNoise(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      [role="tooltip"],
      [data-radix-popper-content-wrapper],
      .tooltip,
      .popover {
        visibility: hidden !important;
      }
      * {
        cursor: none !important;
        caret-color: transparent !important;
      }
    `,
  });
}
```

## Page-Level Visual Tests

### Homepage Visual Tests

```typescript
// tests/visual/pages/homepage.visual.ts
import { test, expect } from '../../fixtures/visual.fixture';
import { assertPageScreenshot } from '../../utils/screenshot';
import { getDynamicMasks, stabilizeDynamicContent } from '../../utils/masking';
import { viewports, breakpoints } from '../../fixtures/viewports';

test.describe('Homepage Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should match homepage baseline', async ({ page }) => {
    await stabilizeDynamicContent(page);
    await assertPageScreenshot(page, 'homepage-full', {
      mask: getDynamicMasks(page),
    });
  });

  test('should match hero section', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"]');
    await expect(hero).toHaveScreenshot('homepage-hero.png', {
      animations: 'disabled',
    });
  });

  test('should match navigation bar', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toHaveScreenshot('homepage-nav.png');
  });

  test('should match footer', async ({ page }) => {
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toHaveScreenshot('homepage-footer.png');
  });

  // Responsive visual tests
  for (const breakpoint of breakpoints) {
    test(`should match at ${breakpoint} viewport`, async ({ page }) => {
      await page.setViewportSize(viewports[breakpoint]);
      await stabilizeDynamicContent(page);
      await assertPageScreenshot(page, `homepage-${breakpoint}`, {
        mask: getDynamicMasks(page),
      });
    });
  }
});
```

### Dashboard Visual Tests

```typescript
// tests/visual/pages/dashboard.visual.ts
import { test, expect } from '../../fixtures/visual.fixture';
import { assertPageScreenshot, assertComponentScreenshot } from '../../utils/screenshot';
import { getDynamicMasks, stabilizeDynamicContent } from '../../utils/masking';

test.describe('Dashboard Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to dashboard
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should match dashboard layout', async ({ page }) => {
    await stabilizeDynamicContent(page);
    await assertPageScreenshot(page, 'dashboard-full', {
      mask: getDynamicMasks(page),
    });
  });

  test('should match sidebar navigation', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"]');
    await assertComponentScreenshot(sidebar, 'dashboard-sidebar');
  });

  test('should match stats cards', async ({ page }) => {
    await stabilizeDynamicContent(page);
    const statsSection = page.locator('[data-testid="stats-cards"]');
    await assertComponentScreenshot(statsSection, 'dashboard-stats');
  });

  test('should match dashboard with collapsed sidebar', async ({ page }) => {
    await page.click('[data-testid="sidebar-toggle"]');
    await page.waitForTimeout(300); // Wait for collapse animation
    await assertPageScreenshot(page, 'dashboard-collapsed-sidebar');
  });

  test('should match empty state', async ({ page }) => {
    // Navigate to section with no data
    await page.goto('/dashboard/reports?filter=empty');
    await page.waitForLoadState('networkidle');

    const emptyState = page.locator('[data-testid="empty-state"]');
    await assertComponentScreenshot(emptyState, 'dashboard-empty-state');
  });
});
```

## Component Visual Tests

```typescript
// tests/visual/components/button.visual.ts
import { test, expect } from '../../fixtures/visual.fixture';

test.describe('Button Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/storybook/button'); // Or a dedicated visual test page
  });

  test('should match primary button variants', async ({ page }) => {
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'];

    for (const variant of variants) {
      const button = page.locator(`[data-testid="button-${variant}"]`);
      await expect(button).toHaveScreenshot(`button-${variant}.png`);
    }
  });

  test('should match button sizes', async ({ page }) => {
    const sizes = ['sm', 'default', 'lg', 'icon'];

    for (const size of sizes) {
      const button = page.locator(`[data-testid="button-size-${size}"]`);
      await expect(button).toHaveScreenshot(`button-size-${size}.png`);
    }
  });

  test('should match button hover state', async ({ page }) => {
    const button = page.locator('[data-testid="button-default"]');
    await button.hover();
    await expect(button).toHaveScreenshot('button-hover.png');
  });

  test('should match button focus state', async ({ page }) => {
    const button = page.locator('[data-testid="button-default"]');
    await button.focus();
    await expect(button).toHaveScreenshot('button-focus.png');
  });

  test('should match button disabled state', async ({ page }) => {
    const button = page.locator('[data-testid="button-disabled"]');
    await expect(button).toHaveScreenshot('button-disabled.png');
  });

  test('should match button with loading spinner', async ({ page }) => {
    const button = page.locator('[data-testid="button-loading"]');
    // Freeze the spinner animation
    await page.addStyleTag({
      content: '[data-testid="button-loading"] svg { animation: none !important; }',
    });
    await expect(button).toHaveScreenshot('button-loading.png');
  });
});
```

```typescript
// tests/visual/components/form.visual.ts
import { test, expect } from '../../fixtures/visual.fixture';

test.describe('Form Component Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/storybook/form');
  });

  test('should match input default state', async ({ page }) => {
    const input = page.locator('[data-testid="input-default"]');
    await expect(input).toHaveScreenshot('input-default.png');
  });

  test('should match input with value', async ({ page }) => {
    const input = page.locator('[data-testid="input-default"] input');
    await input.fill('John Doe');
    await input.blur();
    await expect(page.locator('[data-testid="input-default"]')).toHaveScreenshot(
      'input-with-value.png',
    );
  });

  test('should match input error state', async ({ page }) => {
    const input = page.locator('[data-testid="input-error"]');
    await expect(input).toHaveScreenshot('input-error.png');
  });

  test('should match select dropdown', async ({ page }) => {
    const select = page.locator('[data-testid="select-default"]');
    await select.click();
    await page.waitForTimeout(100);
    // Screenshot includes the open dropdown
    await expect(page).toHaveScreenshot('select-open.png', {
      fullPage: false,
    });
  });

  test('should match complete form layout', async ({ page }) => {
    const form = page.locator('[data-testid="complete-form"]');
    await expect(form).toHaveScreenshot('form-complete.png');
  });
});
```

## Theme Visual Tests

```typescript
// tests/visual/themes/dark-theme.visual.ts
import { test, expect } from '../../fixtures/visual.fixture';
import { assertPageScreenshot } from '../../utils/screenshot';
import { getDynamicMasks, stabilizeDynamicContent } from '../../utils/masking';

test.describe('Dark Theme Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set dark theme via cookie/localStorage/class
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should match homepage in dark theme', async ({ page }) => {
    await stabilizeDynamicContent(page);
    await assertPageScreenshot(page, 'homepage-dark', {
      mask: getDynamicMasks(page),
    });
  });

  test('should match navigation in dark theme', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toHaveScreenshot('nav-dark.png');
  });

  test('should match cards in dark theme', async ({ page }) => {
    const card = page.locator('[data-testid="card"]').first();
    await expect(card).toHaveScreenshot('card-dark.png');
  });

  test('should match form inputs in dark theme', async ({ page }) => {
    await page.goto('/login');
    const form = page.locator('form');
    await expect(form).toHaveScreenshot('login-form-dark.png');
  });

  test('should match dashboard in dark theme', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await stabilizeDynamicContent(page);
    await assertPageScreenshot(page, 'dashboard-dark', {
      mask: getDynamicMasks(page),
    });
  });
});
```

```typescript
// tests/visual/themes/light-theme.visual.ts
import { test, expect } from '../../fixtures/visual.fixture';
import { assertPageScreenshot } from '../../utils/screenshot';
import { getDynamicMasks, stabilizeDynamicContent } from '../../utils/masking';

test.describe('Light Theme Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.classList.remove('dark');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should match homepage in light theme', async ({ page }) => {
    await stabilizeDynamicContent(page);
    await assertPageScreenshot(page, 'homepage-light', {
      mask: getDynamicMasks(page),
    });
  });

  test('should match contrast between themes', async ({ page }) => {
    // Take light screenshot
    await expect(page).toHaveScreenshot('theme-comparison-light.png', {
      fullPage: false,
    });

    // Switch to dark
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
    await page.waitForTimeout(100);

    await expect(page).toHaveScreenshot('theme-comparison-dark.png', {
      fullPage: false,
    });
  });
});
```

## Cross-Browser Visual Tests

```typescript
// tests/visual/cross-browser/browser-matrix.visual.ts
import { test, expect } from '@playwright/test';
import { assertPageScreenshot } from '../../utils/screenshot';
import { stabilizeDynamicContent, getDynamicMasks } from '../../utils/masking';

test.describe('Cross-Browser Visual Consistency', () => {
  const criticalPages = ['/', '/login', '/pricing', '/about'];

  for (const pagePath of criticalPages) {
    test(`should render ${pagePath} consistently`, async ({ page, browserName }) => {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      await stabilizeDynamicContent(page);

      const pageName = pagePath === '/' ? 'homepage' : pagePath.slice(1);
      await assertPageScreenshot(page, `${pageName}-${browserName}`, {
        mask: getDynamicMasks(page),
        // Higher tolerance for cross-browser due to rendering engine differences
        maxDiffPixelRatio: 0.02,
        threshold: 0.3,
      });
    });
  }
});
```

## Applitools Eyes Integration

```typescript
// applitools.config.ts
import { type EyesConfig } from '@applitools/eyes-playwright';

export const config: EyesConfig = {
  apiKey: process.env.APPLITOOLS_API_KEY!,
  appName: 'My Application',
  matchLevel: 'Layout', // 'Strict' | 'Layout' | 'Content' | 'Exact'
  batch: {
    name: `Visual Tests - ${process.env.CI ? 'CI' : 'Local'}`,
    id: process.env.GITHUB_RUN_ID || `local-${Date.now()}`,
  },
  browser: [
    { width: 1920, height: 1080, name: 'chrome' },
    { width: 1920, height: 1080, name: 'firefox' },
    { width: 1920, height: 1080, name: 'safari' },
    { width: 768, height: 1024, name: 'chrome' },
    { width: 375, height: 812, name: 'chrome' },
  ],
  accessibilityValidation: {
    level: 'AA',
    guidelinesVersion: 'WCAG_2_1',
  },
};
```

```typescript
// tests/visual/applitools-example.visual.ts
import { test } from '@playwright/test';
import { Eyes, Target, VisualGridRunner, Configuration } from '@applitools/eyes-playwright';

let runner: VisualGridRunner;
let eyes: Eyes;

test.beforeAll(() => {
  runner = new VisualGridRunner({ testConcurrency: 5 });
});

test.beforeEach(async ({ page }) => {
  eyes = new Eyes(runner);

  const configuration = new Configuration();
  configuration.setApiKey(process.env.APPLITOOLS_API_KEY!);
  configuration.setAppName('My Application');
  configuration.setBatch({
    name: 'Visual AI Tests',
    id: process.env.GITHUB_RUN_ID,
  });

  // Render on multiple browsers via Ultrafast Grid
  configuration.addBrowser(1920, 1080, 'chrome');
  configuration.addBrowser(1920, 1080, 'firefox');
  configuration.addBrowser(768, 1024, 'chrome');
  configuration.addDeviceEmulation('iPhone 14');

  eyes.setConfiguration(configuration);
  await eyes.open(page, 'My Application', test.info().title);
});

test.afterEach(async () => {
  await eyes.close(false);
});

test.afterAll(async () => {
  const results = await runner.getAllTestResults(false);
  console.log('Applitools results:', results.toString());
});

test('homepage visual AI check', async ({ page }) => {
  await page.goto('/');

  // Full page check with AI
  await eyes.check('Homepage', Target.window().fully());

  // Region check
  await eyes.check(
    'Hero Section',
    Target.region('[data-testid="hero-section"]'),
  );

  // Layout match level for responsive components
  await eyes.check(
    'Navigation',
    Target.region('nav').layout(),
  );
});

test('dashboard visual AI check', async ({ page }) => {
  await page.goto('/dashboard');

  // Ignore dynamic regions
  await eyes.check(
    'Dashboard',
    Target.window()
      .fully()
      .ignoreRegions('[data-testid="timestamp"]', '[data-testid="live-counter"]'),
  );

  // Strict check for critical UI
  await eyes.check(
    'Stats Cards',
    Target.region('[data-testid="stats-cards"]').strict(),
  );
});
```

## Percy Integration

```typescript
// tests/visual/percy-example.visual.ts
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Percy Visual Tests', () => {
  test('should capture homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Homepage', {
      widths: [375, 768, 1280, 1920],
      minHeight: 1024,
      percyCSS: `
        [data-testid="timestamp"] { visibility: hidden; }
        [data-testid="avatar"] { visibility: hidden; }
      `,
    });
  });

  test('should capture dashboard states', async ({ page }) => {
    await page.goto('/dashboard');

    // Default state
    await percySnapshot(page, 'Dashboard - Default');

    // With sidebar collapsed
    await page.click('[data-testid="sidebar-toggle"]');
    await percySnapshot(page, 'Dashboard - Sidebar Collapsed');

    // With modal open
    await page.click('[data-testid="create-button"]');
    await page.waitForSelector('[role="dialog"]');
    await percySnapshot(page, 'Dashboard - Create Modal');
  });

  test('should capture form validation states', async ({ page }) => {
    await page.goto('/login');

    // Empty form
    await percySnapshot(page, 'Login - Empty');

    // With validation errors
    await page.click('button[type="submit"]');
    await page.waitForSelector('.error-message');
    await percySnapshot(page, 'Login - Validation Errors');
  });
});
```

## Baseline Management

```typescript
// tests/utils/baseline.ts
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../__screenshots__');

/**
 * Update all visual baselines (run after intentional visual changes).
 * Usage: npx playwright test --update-snapshots
 */
export function getBaselineInfo(): {
  totalBaselines: number;
  lastUpdated: string;
  browsers: string[];
} {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    return { totalBaselines: 0, lastUpdated: 'never', browsers: [] };
  }

  const browsers = fs
    .readdirSync(SCREENSHOTS_DIR)
    .filter((f) => fs.statSync(path.join(SCREENSHOTS_DIR, f)).isDirectory());

  let totalBaselines = 0;
  for (const browser of browsers) {
    const browserDir = path.join(SCREENSHOTS_DIR, browser);
    const files = fs.readdirSync(browserDir).filter((f) => f.endsWith('.png'));
    totalBaselines += files.length;
  }

  const lastUpdated = execSync('git log -1 --format=%ci -- tests/__screenshots__/')
    .toString()
    .trim();

  return { totalBaselines, lastUpdated, browsers };
}

/**
 * List all baseline files that have changed since the base branch.
 */
export function getChangedBaselines(baseBranch: string = 'main'): string[] {
  try {
    const output = execSync(
      `git diff --name-only ${baseBranch}...HEAD -- tests/__screenshots__/`,
    ).toString();
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}
```

## CI/CD Integration

### GitHub Actions with Visual Review Gate

```yaml
# .github/workflows/visual-tests.yml
name: Visual Regression Tests
on:
  pull_request:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      # Run visual tests
      - run: npx playwright test tests/visual/
        env:
          APPLITOOLS_API_KEY: ${{ secrets.APPLITOOLS_API_KEY }}
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}

      # Upload screenshot diffs as artifacts
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diffs
          path: |
            test-results/
            playwright-report/

      # Post screenshot diff summary as PR comment
      - uses: actions/github-script@v7
        if: failure()
        with:
          script: |
            const fs = require('fs');
            const diffDir = 'test-results';
            let comment = '## Visual Regression Report\n\n';
            comment += 'Visual differences were detected. Please review the artifacts.\n';
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment,
            });
```

## Common Commands

```bash
# Run all visual tests
npx playwright test tests/visual/

# Update baselines after intentional changes
npx playwright test tests/visual/ --update-snapshots

# Run visual tests for a specific browser
npx playwright test tests/visual/ --project=chromium-desktop

# Run only theme tests
npx playwright test tests/visual/themes/

# Run responsive tests
npx playwright test tests/visual/responsive/

# View visual diff report
npx playwright show-report

# Run with trace for debugging
npx playwright test tests/visual/ --trace on
```

## Best Practices

1. **Use AI-powered visual engines for production** -- pixel-level comparison (toHaveScreenshot) works for development, but AI engines like Applitools reduce false positives by 90%+ in CI environments.
2. **Disable all animations before screenshots** -- CSS animations, transitions, and blinking cursors cause non-deterministic screenshots. Inject a style tag that disables all animations.
3. **Wait for fonts, images, and network idle** -- screenshots taken before assets load will differ from baselines. Always call `waitForLoadState('networkidle')` and wait for `document.fonts.ready`.
4. **Mask all dynamic content** -- timestamps, user avatars, live counters, and ads change between runs. Mask them to eliminate noise and focus on real regressions.
5. **Test at component granularity** -- full-page screenshots are brittle because any component change invalidates the entire baseline. Component-level screenshots isolate changes.
6. **Define a viewport matrix** -- test at minimum: mobile (375px), tablet (768px), laptop (1366px), and desktop (1920px). Many layout bugs only appear at specific breakpoints.
7. **Track baselines in git** -- commit `__screenshots__/` to the repository so visual changes are code-reviewed alongside code changes.
8. **Set appropriate diff thresholds** -- `maxDiffPixelRatio: 0.01` catches real regressions while tolerating sub-pixel rendering differences. Adjust per platform.
9. **Run visual tests in CI on a consistent OS** -- font rendering differs between macOS, Linux, and Windows. Always generate baselines on the same OS as CI.
10. **Review visual diffs before approving PRs** -- automated tests detect changes; humans decide if changes are acceptable. Never auto-approve visual changes.

## Anti-Patterns

1. **Not disabling animations** -- animated elements produce different screenshots on every run, generating constant false positives.
2. **Using pixel-exact comparison in CI** -- sub-pixel rendering differences between CI and local environments make pixel-exact comparison unusable at scale.
3. **Taking screenshots before page is fully loaded** -- network requests, lazy-loaded images, and web fonts cause inconsistent screenshots.
4. **Full-page screenshots only** -- a single changed component invalidates the entire page baseline, making it impossible to identify what actually changed.
5. **Sharing baselines across browsers** -- Chromium, Firefox, and WebKit render differently. Each browser needs its own baseline set.
6. **Not masking dynamic content** -- timestamps and live data create meaningless diffs that desensitize reviewers to actual regressions.
7. **Generating baselines on different OS than CI** -- font rendering is OS-specific. Baselines generated on macOS will always differ from Linux CI screenshots.
8. **Running visual tests in parallel without isolation** -- parallel visual tests that share browser state or viewport settings cause random failures.
9. **Ignoring anti-aliasing differences** -- set a per-pixel `threshold` (0.2-0.3) to tolerate anti-aliasing variations without missing real color changes.
10. **Auto-approving all visual changes** -- visual review exists to catch unintended regressions. Auto-approval defeats the purpose of visual testing entirely.
