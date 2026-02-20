---
name: Dark Mode Bug Finder
description: Detect dark mode rendering issues including contrast failures, missing theme tokens, image inversions, and transition glitches across components.
version: 1.0.0
author: Pramod
license: MIT
tags: [dark-mode, theming, contrast, accessibility, css-variables, color-scheme]
testingTypes: [visual, e2e, accessibility]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Dark Mode Bug Finder Skill

You are an expert QA automation engineer specializing in dark mode testing, theme validation, and visual accessibility verification. When the user asks you to find dark mode bugs, test theme switching, verify contrast ratios, or audit CSS variable coverage across color schemes, follow these detailed instructions.

## Core Principles

1. **Every color must come from a theme token** -- Hardcoded color values (hex, rgb, named colors) in CSS are dark mode bugs waiting to happen. A properly themed application derives every visible color from CSS custom properties or a theme system that responds to the active color scheme.

2. **WCAG contrast ratios are non-negotiable** -- Text must maintain a minimum 4.5:1 contrast ratio against its background in both light and dark modes. Large text (18px+ or 14px+ bold) requires 3:1 minimum. Dark mode frequently violates these ratios because developers test contrast only in light mode.

3. **Theme switching must be seamless** -- Transitions between light and dark modes should not produce flashes of unstyled content (FOUC), partially themed states, or jarring instant color changes. Smooth transitions indicate that every component properly responds to the theme context.

4. **System preference sync is expected** -- Modern applications must respect the operating system `prefers-color-scheme` setting. Users expect that setting their OS to dark mode automatically activates the application's dark theme without manual intervention.

5. **Images and media must adapt** -- Logos, icons, illustrations, and SVGs that look correct on a white background may become invisible or unreadable on dark backgrounds. Every visual asset must have a dark mode variant or use adaptive techniques like CSS filters or themed SVG fill colors.

6. **Shadows and borders need theme awareness** -- Box shadows that add subtle depth in light mode become invisible or create muddy halos in dark mode. Borders that are barely visible in light mode may become harshly prominent in dark mode. Both require theme-specific values.

7. **Third-party components must integrate** -- Embedded widgets, iframes, third-party UI libraries, and user-generated content must all participate in the theme. A bright white embedded map in an otherwise dark interface is a dark mode failure even though the application code is correct.

## Project Structure

Organize your dark mode testing suite with this directory structure:

```
tests/
  dark-mode/
    contrast-validation.spec.ts
    css-variable-audit.spec.ts
    hardcoded-colors.spec.ts
    theme-transitions.spec.ts
    system-preference-sync.spec.ts
    image-adaptation.spec.ts
    component-coverage.spec.ts
    focus-indicators.spec.ts
  fixtures/
    theme-helpers.ts
    color-utils.ts
  helpers/
    contrast-calculator.ts
    theme-detector.ts
    color-parser.ts
    screenshot-comparator.ts
  reports/
    dark-mode-report.json
    dark-mode-report.html
playwright.config.ts
```

## Color Utility Library

Build a color utility that parses CSS color values and calculates WCAG contrast ratios programmatically.

### WCAG Contrast Calculator

```typescript
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALargeText: boolean;
  foreground: RGB;
  background: RGB;
}

export function parseColor(color: string): RGB | null {
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }

  const hexMatch = color.match(/^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    };
  }

  const shortHexMatch = color.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
  if (shortHexMatch) {
    return {
      r: parseInt(shortHexMatch[1] + shortHexMatch[1], 16),
      g: parseInt(shortHexMatch[2] + shortHexMatch[2], 16),
      b: parseInt(shortHexMatch[3] + shortHexMatch[3], 16),
    };
  }

  return null;
}

export function relativeLuminance(rgb: RGB): number {
  const [rs, gs, bs] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(fg: RGB, bg: RGB): number {
  const lum1 = relativeLuminance(fg);
  const lum2 = relativeLuminance(bg);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function checkContrast(fg: RGB, bg: RGB): ContrastResult {
  const ratio = contrastRatio(fg, bg);
  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
    passesAALargeText: ratio >= 3,
    foreground: fg,
    background: bg,
  };
}

export function isLightColor(rgb: RGB): boolean {
  return relativeLuminance(rgb) > 0.5;
}

export function isDarkColor(rgb: RGB): boolean {
  return relativeLuminance(rgb) < 0.2;
}
```

### Theme Detection and Switching Helpers

```typescript
import { Page } from '@playwright/test';

export interface ThemeColors {
  background: string;
  text: string;
  primary: string;
  backgroundLuminance: number;
}

export async function getActiveColorScheme(page: Page): Promise<'light' | 'dark'> {
  return page.evaluate(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
}

export async function setThemeViaMediaQuery(
  page: Page,
  scheme: 'light' | 'dark'
): Promise<void> {
  await page.emulateMedia({ colorScheme: scheme });
  await page.waitForTimeout(300);
}

export async function toggleThemeViaUI(page: Page): Promise<boolean> {
  const toggleSelectors = [
    '[data-testid="theme-toggle"]',
    '[aria-label*="theme" i]',
    '[aria-label*="dark" i]',
    '[aria-label*="light" i]',
    'button:has([class*="moon"])',
    'button:has([class*="sun"])',
    '.theme-toggle',
    '#theme-toggle',
  ];

  for (const selector of toggleSelectors) {
    const element = page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      await element.click();
      await page.waitForTimeout(500);
      return true;
    }
  }

  return false;
}

export async function getCurrentThemeColors(page: Page): Promise<ThemeColors> {
  return page.evaluate(() => {
    const body = document.body;
    const style = window.getComputedStyle(body);
    const rootStyle = window.getComputedStyle(document.documentElement);

    const bg = style.backgroundColor;
    const bgMatch = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    let luminance = 0;
    if (bgMatch) {
      const [r, g, b] = [+bgMatch[1] / 255, +bgMatch[2] / 255, +bgMatch[3] / 255].map(
        (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
      );
      luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    return {
      background: bg,
      text: style.color,
      primary:
        rootStyle.getPropertyValue('--color-primary').trim() ||
        rootStyle.getPropertyValue('--primary').trim() ||
        'unknown',
      backgroundLuminance: luminance,
    };
  });
}
```

## Detailed Testing Guides

### 1. WCAG Contrast Ratio Validation in Dark Mode

Programmatically verify that all text elements meet WCAG AA contrast requirements against their effective background in dark mode.

```typescript
import { test, expect } from '@playwright/test';
import { setThemeViaMediaQuery } from '../fixtures/theme-helpers';

interface ContrastIssue {
  element: string;
  text: string;
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  fontSize: string;
}

test.describe('WCAG Contrast Validation in Dark Mode', () => {
  test('all text meets WCAG AA contrast requirements', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'dark');
    await page.goto('/', { waitUntil: 'networkidle' });

    const issues: ContrastIssue[] = await page.evaluate(() => {
      const results: ContrastIssue[] = [];
      const textSelectors =
        'h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, button, input, textarea';
      const textElements = document.querySelectorAll(textSelectors);

      function parseRGB(color: string) {
        const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
      }

      function getLuminance(r: number, g: number, b: number) {
        const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
          c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
        );
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      }

      function getContrast(fg: { r: number; g: number; b: number }, bg: { r: number; g: number; b: number }) {
        const l1 = getLuminance(fg.r, fg.g, fg.b);
        const l2 = getLuminance(bg.r, bg.g, bg.b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      function getEffectiveBackground(el: Element): string {
        let current: Element | null = el;
        while (current) {
          const style = window.getComputedStyle(current);
          const bg = style.backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
            return bg;
          }
          current = current.parentElement;
        }
        return 'rgb(0, 0, 0)';
      }

      textElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const text = el.textContent?.trim() || '';
        if (text.length === 0) return;

        const fgRgb = parseRGB(style.color);
        const bgRgb = parseRGB(getEffectiveBackground(el));
        if (!fgRgb || !bgRgb) return;

        const ratio = getContrast(fgRgb, bgRgb);
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = parseInt(style.fontWeight) || 400;
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
        const required = isLargeText ? 3.0 : 4.5;

        if (ratio < required) {
          results.push({
            element: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`,
            text: text.substring(0, 40),
            foreground: style.color,
            background: getEffectiveBackground(el),
            ratio: Math.round(ratio * 100) / 100,
            required,
            fontSize: style.fontSize,
          });
        }
      });

      return results;
    });

    expect(
      issues,
      `WCAG AA contrast failures in dark mode:\n${issues
        .map(
          (i) =>
            `  ${i.element} "${i.text}": ${i.ratio}:1 (need ${i.required}:1) fg=${i.foreground} bg=${i.background}`
        )
        .join('\n')}`
    ).toHaveLength(0);
  });

  test('placeholder text meets contrast requirements in dark mode', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'dark');
    await page.goto('/login', { waitUntil: 'networkidle' });

    const placeholderIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');

      inputs.forEach((input) => {
        const el = input as HTMLInputElement;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return;

        const bgMatch = style.backgroundColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (!bgMatch) return;
        const bgLum =
          (0.299 * +bgMatch[1] + 0.587 * +bgMatch[2] + 0.114 * +bgMatch[3]) / 255;

        if (bgLum < 0.2) {
          const borderMatch = style.borderColor.match(
            /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/
          );
          if (borderMatch) {
            const borderLum =
              (0.299 * +borderMatch[1] + 0.587 * +borderMatch[2] + 0.114 * +borderMatch[3]) / 255;
            if (Math.abs(bgLum - borderLum) < 0.05) {
              issues.push(
                `Input "${el.name || el.type}": border barely visible in dark mode`
              );
            }
          }
        }
      });

      return issues;
    });

    expect(
      placeholderIssues,
      `Input visibility issues in dark mode:\n${placeholderIssues.join('\n')}`
    ).toHaveLength(0);
  });
});
```

### 2. CSS Variable Coverage Audit

Verify that all CSS custom properties used for theming are defined in both light and dark mode, and that color-related variables change between themes.

```typescript
import { test, expect } from '@playwright/test';
import { setThemeViaMediaQuery } from '../fixtures/theme-helpers';

test.describe('CSS Variable Coverage Audit', () => {
  test('all theme CSS variables are defined in dark mode', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'light');
    await page.goto('/', { waitUntil: 'networkidle' });

    const lightVars = await page.evaluate(() => {
      const root = document.documentElement;
      const style = window.getComputedStyle(root);
      const vars: Record<string, string> = {};

      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            const styleRule = rule as CSSStyleRule;
            if (styleRule.style) {
              for (let i = 0; i < styleRule.style.length; i++) {
                const prop = styleRule.style[i];
                if (prop.startsWith('--')) {
                  vars[prop] = style.getPropertyValue(prop).trim();
                }
              }
            }
          }
        } catch {
          // Cross-origin stylesheets are not readable
        }
      }
      return vars;
    });

    await setThemeViaMediaQuery(page, 'dark');
    await page.waitForTimeout(500);

    const darkVars = await page.evaluate((varNames: string[]) => {
      const root = document.documentElement;
      const style = window.getComputedStyle(root);
      const results: Record<string, { defined: boolean; value: string }> = {};

      for (const name of varNames) {
        const value = style.getPropertyValue(name).trim();
        results[name] = { defined: value !== '', value };
      }
      return results;
    }, Object.keys(lightVars));

    const undefinedInDark: string[] = [];
    const unchangedColorVars: string[] = [];

    for (const [varName, info] of Object.entries(darkVars)) {
      if (!info.defined) {
        undefinedInDark.push(varName);
      } else if (
        info.value === lightVars[varName] &&
        (varName.includes('color') ||
          varName.includes('bg') ||
          varName.includes('background') ||
          varName.includes('text') ||
          varName.includes('border') ||
          varName.includes('shadow'))
      ) {
        unchangedColorVars.push(`${varName}: ${info.value}`);
      }
    }

    expect(
      undefinedInDark,
      `CSS variables undefined in dark mode:\n${undefinedInDark.join('\n')}`
    ).toHaveLength(0);

    if (unchangedColorVars.length > 0) {
      console.warn(
        `Color variables unchanged between themes (may be intentional):\n${unchangedColorVars.join('\n')}`
      );
    }
  });

  test('no CSS variables resolve to empty values in dark mode', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'dark');
    await page.goto('/', { waitUntil: 'networkidle' });

    const emptyVars = await page.evaluate(() => {
      const empty: string[] = [];
      const root = document.documentElement;
      const style = window.getComputedStyle(root);

      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            const styleRule = rule as CSSStyleRule;
            if (styleRule.style) {
              for (let i = 0; i < styleRule.style.length; i++) {
                const prop = styleRule.style[i];
                if (prop.startsWith('--')) {
                  const value = style.getPropertyValue(prop).trim();
                  if (value === '') {
                    empty.push(prop);
                  }
                }
              }
            }
          }
        } catch {
          // Skip cross-origin sheets
        }
      }
      return [...new Set(empty)];
    });

    expect(
      emptyVars,
      `Empty CSS variables in dark mode:\n${emptyVars.join('\n')}`
    ).toHaveLength(0);
  });
});
```

### 3. Hardcoded Color Detection

Find elements that use hardcoded colors instead of theme tokens, which will fail to adapt in dark mode.

```typescript
import { test, expect } from '@playwright/test';
import { setThemeViaMediaQuery } from '../fixtures/theme-helpers';

test.describe('Hardcoded Color Detection', () => {
  test('no visible elements use hardcoded white backgrounds in dark mode', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'dark');
    await page.goto('/', { waitUntil: 'networkidle' });

    const whiteBackgrounds = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('*');

      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        if (style.display === 'none' || style.visibility === 'hidden') return;

        const bg = style.backgroundColor;
        const match = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (match) {
          const [r, g, b] = [+match[1], +match[2], +match[3]];
          if (r > 240 && g > 240 && b > 240 && rect.width > 50 && rect.height > 20) {
            const tag = el.tagName.toLowerCase();
            const cls =
              el.className && typeof el.className === 'string'
                ? '.' + el.className.trim().split(/\s+/)[0]
                : '';
            issues.push(
              `${tag}${cls}: white background (${bg}) at ${Math.round(rect.width)}x${Math.round(rect.height)}px`
            );
          }
        }
      });

      return issues;
    });

    expect(
      whiteBackgrounds,
      `Elements with hardcoded white backgrounds in dark mode:\n${whiteBackgrounds.join('\n')}`
    ).toHaveLength(0);
  });

  test('no text uses hardcoded dark colors that become invisible in dark mode', async ({
    page,
  }) => {
    await setThemeViaMediaQuery(page, 'dark');
    await page.goto('/', { waitUntil: 'networkidle' });

    const darkTextIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const textElements = document.querySelectorAll(
        'h1, h2, h3, h4, h5, h6, p, span, a, li, label'
      );

      textElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return;

        const text = el.textContent?.trim() || '';
        if (text.length === 0) return;

        const colorMatch = style.color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (colorMatch) {
          const [r, g, b] = [+colorMatch[1], +colorMatch[2], +colorMatch[3]];
          const luminance =
            (0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255));

          if (luminance < 0.1) {
            issues.push(
              `${el.tagName.toLowerCase()} "${text.substring(0, 30)}": dark text (${style.color}) likely invisible on dark background`
            );
          }
        }
      });

      return issues;
    });

    expect(
      darkTextIssues,
      `Dark text on dark backgrounds:\n${darkTextIssues.join('\n')}`
    ).toHaveLength(0);
  });

  test('inline styles do not contain hardcoded color values', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const inlineColorIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('[style]');
      const colorRegex =
        /(color|background|border|shadow)\s*:\s*(#[0-9a-fA-F]{3,8}|rgb|hsl|white|black)/gi;

      elements.forEach((el) => {
        const styleAttr = el.getAttribute('style') || '';
        const matches = styleAttr.match(colorRegex);
        if (matches) {
          const tag = el.tagName.toLowerCase();
          issues.push(`${tag}: inline ${matches.join(', ')}`);
        }
      });

      return issues;
    });

    if (inlineColorIssues.length > 0) {
      console.warn(
        `Inline hardcoded colors found (may not respect dark mode):\n${inlineColorIssues.join('\n')}`
      );
    }
  });
});
```

### 4. Theme Transition Testing

Verify that switching between light and dark mode produces no visual artifacts, flashes, or partially-themed states.

```typescript
import { test, expect } from '@playwright/test';
import {
  setThemeViaMediaQuery,
  toggleThemeViaUI,
  getCurrentThemeColors,
} from '../fixtures/theme-helpers';

test.describe('Theme Transition Testing', () => {
  test('no flash of unstyled content when loading in dark mode', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'dark');

    let flashDetected = false;
    page.on('console', (msg) => {
      if (msg.text().includes('FOUC_DETECTED')) {
        flashDetected = true;
      }
    });

    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const bg = window.getComputedStyle(document.documentElement).backgroundColor;
        const match = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (match) {
          const luminance = (+match[1] + +match[2] + +match[3]) / 3;
          if (luminance > 200) {
            console.log('FOUC_DETECTED: white background during dark mode load');
          }
        }
      });

      if (document.documentElement) {
        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class', 'data-theme', 'style'],
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    expect(flashDetected, 'Flash of light content detected during dark mode page load').toBe(
      false
    );
  });

  test('theme change via system preference updates all components', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'light');
    await page.goto('/', { waitUntil: 'networkidle' });
    const lightColors = await getCurrentThemeColors(page);

    await setThemeViaMediaQuery(page, 'dark');
    await page.waitForTimeout(500);
    const darkColors = await getCurrentThemeColors(page);

    expect(
      lightColors.background,
      'Background should change between light and dark modes'
    ).not.toBe(darkColors.background);

    expect(
      darkColors.backgroundLuminance,
      `Dark mode background luminance ${darkColors.backgroundLuminance.toFixed(2)} is too high`
    ).toBeLessThan(0.3);
  });

  test('all major components respond to theme change', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'light');
    await page.goto('/', { waitUntil: 'networkidle' });

    const lightComponentColors = await page.evaluate(() => {
      const selectors =
        'header, nav, main, footer, aside, [class*="card"], [class*="sidebar"]';
      const components = document.querySelectorAll(selectors);
      const colors: Record<string, string> = {};
      components.forEach((el, i) => {
        const tag = el.tagName.toLowerCase();
        colors[`${tag}-${i}`] = window.getComputedStyle(el).backgroundColor;
      });
      return colors;
    });

    await setThemeViaMediaQuery(page, 'dark');
    await page.waitForTimeout(500);

    const darkComponentColors = await page.evaluate(() => {
      const selectors =
        'header, nav, main, footer, aside, [class*="card"], [class*="sidebar"]';
      const components = document.querySelectorAll(selectors);
      const colors: Record<string, string> = {};
      components.forEach((el, i) => {
        const tag = el.tagName.toLowerCase();
        colors[`${tag}-${i}`] = window.getComputedStyle(el).backgroundColor;
      });
      return colors;
    });

    const unchangedComponents: string[] = [];
    for (const [key, lightColor] of Object.entries(lightComponentColors)) {
      if (
        darkComponentColors[key] &&
        darkComponentColors[key] === lightColor &&
        lightColor !== 'rgba(0, 0, 0, 0)'
      ) {
        unchangedComponents.push(`${key}: ${lightColor}`);
      }
    }

    if (unchangedComponents.length > 0) {
      console.warn(
        `Components unchanged between themes (review manually):\n${unchangedComponents.join('\n')}`
      );
    }
  });

  test('visual comparison between light and dark modes', async ({ browser }) => {
    const pages = ['/', '/about', '/pricing', '/login'];

    for (const pagePath of pages) {
      const lightCtx = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        colorScheme: 'light',
      });
      const lightPage = await lightCtx.newPage();
      await lightPage.goto(pagePath, { waitUntil: 'networkidle' });
      await expect(lightPage).toHaveScreenshot(
        `${pagePath.replace(/\//g, '-') || 'home'}-light.png`,
        { fullPage: true }
      );
      await lightCtx.close();

      const darkCtx = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        colorScheme: 'dark',
      });
      const darkPage = await darkCtx.newPage();
      await darkPage.goto(pagePath, { waitUntil: 'networkidle' });
      await expect(darkPage).toHaveScreenshot(
        `${pagePath.replace(/\//g, '-') || 'home'}-dark.png`,
        { fullPage: true }
      );
      await darkCtx.close();
    }
  });
});
```

### 5. Image and SVG Dark Mode Adaptation

Verify that logos, icons, and images remain visible and appropriate in dark mode.

```typescript
import { test, expect } from '@playwright/test';
import { setThemeViaMediaQuery } from '../fixtures/theme-helpers';

test.describe('Image and SVG Dark Mode Adaptation', () => {
  test('SVG icons should not have hardcoded dark fills in dark mode', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'dark');
    await page.goto('/', { waitUntil: 'networkidle' });

    const svgIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const svgs = document.querySelectorAll('svg');

      svgs.forEach((svg, index) => {
        const rect = svg.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const paths = svg.querySelectorAll(
          'path, circle, rect, line, polygon, polyline'
        );
        paths.forEach((path) => {
          const fill = path.getAttribute('fill');
          const stroke = path.getAttribute('stroke');

          if (fill === '#000' || fill === '#000000' || fill === 'black') {
            issues.push(`SVG[${index}]: hardcoded black fill (invisible on dark bg)`);
          }
          if (stroke === '#000' || stroke === '#000000' || stroke === 'black') {
            issues.push(`SVG[${index}]: hardcoded black stroke (invisible on dark bg)`);
          }
        });
      });

      return issues;
    });

    expect(
      svgIssues,
      `SVG dark color issues:\n${svgIssues.join('\n')}`
    ).toHaveLength(0);
  });

  test('logo adapts between light and dark modes', async ({ page }) => {
    await setThemeViaMediaQuery(page, 'light');
    await page.goto('/', { waitUntil: 'networkidle' });

    const lightLogo = await page.evaluate(() => {
      const logo = document.querySelector(
        '[data-testid="logo"], .logo, header img, nav img'
      );
      if (!logo) return null;
      const img = logo as HTMLImageElement;
      return img.src || img.currentSrc || window.getComputedStyle(logo).backgroundImage;
    });

    await setThemeViaMediaQuery(page, 'dark');
    await page.waitForTimeout(500);

    const darkLogo = await page.evaluate(() => {
      const logo = document.querySelector(
        '[data-testid="logo"], .logo, header img, nav img'
      );
      if (!logo) return null;
      const img = logo as HTMLImageElement;
      return img.src || img.currentSrc || window.getComputedStyle(logo).backgroundImage;
    });

    if (lightLogo && darkLogo && lightLogo === darkLogo) {
      console.warn(
        'Logo source is identical in both modes -- verify it is visible on dark backgrounds'
      );
    }
  });
});
```

### 6. Focus Indicator Visibility in Dark Mode

Verify that keyboard focus indicators remain visible against dark backgrounds.

```typescript
import { test, expect } from '@playwright/test';
import { setThemeViaMediaQuery } from '../fixtures/theme-helpers';

test.describe('Focus Indicator Visibility', () => {
  test('focus indicators are visible on all interactive elements in dark mode', async ({
    page,
  }) => {
    await setThemeViaMediaQuery(page, 'dark');
    await page.goto('/', { waitUntil: 'networkidle' });

    const focusIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const interactive = document.querySelectorAll('a, button, input, select, textarea');

      interactive.forEach((el) => {
        const htmlEl = el as HTMLElement;
        const rect = htmlEl.getBoundingClientRect();
        if (rect.width === 0) return;

        htmlEl.focus();
        const style = window.getComputedStyle(htmlEl);
        const outlineColor = style.outlineColor;
        const outlineWidth = parseFloat(style.outlineWidth);
        const boxShadow = style.boxShadow;

        const hasVisibleOutline = outlineWidth > 0 && outlineColor !== 'transparent';
        const hasBoxShadowFocus = boxShadow !== 'none';

        if (!hasVisibleOutline && !hasBoxShadowFocus) {
          const tag = htmlEl.tagName.toLowerCase();
          const text = htmlEl.textContent?.substring(0, 25)?.trim() || '';
          issues.push(
            `${tag} "${text}": no visible focus indicator in dark mode`
          );
        }

        htmlEl.blur();
      });

      return issues;
    });

    expect(
      focusIssues,
      `Missing focus indicators in dark mode:\n${focusIssues.join('\n')}`
    ).toHaveLength(0);
  });
});
```

## Configuration

### Playwright Configuration for Dark Mode Testing

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/dark-mode',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  projects: [
    {
      name: 'light-mode',
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
    },
    {
      name: 'dark-mode',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },
    {
      name: 'dark-mode-mobile',
      use: { ...devices['iPhone 14'], colorScheme: 'dark' },
    },
  ],
  reporter: [
    ['html', { outputFolder: 'reports/dark-mode' }],
    ['json', { outputFile: 'reports/dark-mode-report.json' }],
  ],
});
```

## Best Practices

1. **Use CSS custom properties for all colors.** Every color in your application should be a CSS variable that changes based on the active theme. This includes text, backgrounds, borders, shadows, and semi-transparent overlays.

2. **Test both entry points to dark mode.** Users may activate dark mode via the system preference or via an in-app toggle. Both paths must produce identical results. Test `prefers-color-scheme` media query and manual theme switching.

3. **Validate contrast ratios automatically.** Do not rely on visual inspection for contrast. Use programmatic WCAG contrast ratio calculation on every text element against its effective background. Automate this in CI.

4. **Test the initial paint in dark mode.** Many dark mode bugs manifest only on the first render: a flash of white content before the theme loads. Test by loading pages directly in dark mode, not by toggling after load.

5. **Audit third-party components.** Library components (date pickers, rich text editors, charting libraries) often have their own theming systems. Verify that they respond correctly to your application's theme or apply manual overrides.

6. **Use the `color-scheme` CSS property.** Setting `color-scheme: dark` on the root element tells the browser to render native UI elements (scrollbars, form controls, selection highlights) in dark mode colors. Without it, native elements remain light.

7. **Test shadows and elevation.** Box shadows that use fixed colors like `rgba(0, 0, 0, 0.1)` may be invisible in dark mode. Dark mode shadows often need lighter colors or different opacity values to maintain the visual hierarchy.

8. **Verify image and icon adaptation.** Logos, icons, and illustrations must either have dark mode variants or use CSS techniques (filter: invert, fill: currentColor for SVGs) to remain visible and aesthetically appropriate.

9. **Store theme preference persistently.** When a user selects a theme, it must persist across sessions via localStorage, a cookie, or a server-side preference. Test that refreshing the page and opening new tabs maintain the selected theme.

10. **Test with reduced motion preferences.** Theme transitions should respect `prefers-reduced-motion`. Users who disable animations should see instant theme changes without transitions.

11. **Validate selection and highlight colors.** Text selection (::selection), search highlights, and focus rings often use hardcoded colors that clash with dark backgrounds. Test these pseudo-elements explicitly.

12. **Check embedded content.** Iframes, embedded videos, and third-party widgets may not respond to your theme. Verify that they do not create bright rectangles in an otherwise dark interface.

## Anti-Patterns to Avoid

1. **Inverting all colors with CSS filter.** Using `filter: invert(1)` on the entire page is not dark mode. It destroys images, creates unreadable text on complex backgrounds, and produces color distortions.

2. **Hardcoding color values in components.** Writing `color: #333` or `background: white` creates elements that cannot respond to theme changes. Always use CSS variables or theme utility classes.

3. **Testing dark mode only visually.** Looking at screenshots and deciding "it looks fine" misses contrast ratio violations, invisible text on similar backgrounds, and theme tokens that resolve to identical values in both modes.

4. **Assuming transparent backgrounds inherit correctly.** An element with `background: transparent` inherits the visual background of its parent, but the computed style is still `transparent`. Contrast calculations must walk up the DOM to find the effective background.

5. **Using a single toggle class on body.** While `body.dark` is a common pattern, it is fragile. If any component renders outside the body's class context (portals, modals appended to document), it will miss the theme. Use CSS custom properties on `:root` instead.

6. **Ignoring scrollbar theming.** Untreated scrollbars remain bright white in dark mode, creating a distracting visual artifact. Use the `color-scheme` property or explicit scrollbar pseudo-element styling.

7. **Skipping mobile dark mode testing.** Mobile browsers handle `prefers-color-scheme` differently from desktop browsers. Test on actual mobile viewports with dark color scheme emulation enabled.

8. **Not testing error states and empty states in dark mode.** Error messages, empty state illustrations, and loading skeletons often use hardcoded colors that look fine in light mode but become invisible or jarring in dark mode.

## Debugging Tips

1. **Use browser rendering emulation.** Chrome DevTools allows you to emulate `prefers-color-scheme: dark` without changing your OS settings. Navigate to the Rendering tab and select "dark" from the color scheme dropdown.

2. **Inject diagnostic CSS.** Add `* { outline: 2px solid red !important; }` temporarily to see which elements have their own background colors versus inheriting from parents. This reveals elements that are "invisible" in dark mode.

3. **Log computed colors in tests.** When a contrast test fails, log both the computed foreground color and the effective background color (walking up the DOM). The issue is often an intermediate transparent layer.

4. **Check CSS specificity conflicts.** Dark mode styles sometimes lose to more specific light mode selectors. Use the browser's computed styles panel to see which CSS rule is winning.

5. **Verify localStorage and cookie theme storage.** If the theme resets on page reload, check that the preference is being written and read correctly from storage. A common bug is reading the preference after the initial render, causing a flash of the wrong theme.

6. **Test with high contrast mode.** Windows High Contrast Mode and macOS Increase Contrast settings interact with dark mode in unexpected ways. Verify that your theme does not produce illegible results when both are active.

7. **Use Playwright's screenshot comparison.** Take screenshots in both light and dark modes and visually compare them. Elements that look identical in both screenshots are likely not responding to the theme at all.

8. **Audit CSS variable resolution.** Use `getComputedStyle(document.documentElement).getPropertyValue('--your-variable')` to verify that each CSS variable resolves to the expected value in the active theme.

9. **Check for CSS media query ordering.** If dark mode styles are defined before the base light mode styles, they may be overridden. Verify that `@media (prefers-color-scheme: dark)` blocks appear after the base styles in the cascade.

10. **Test with server-side rendering.** In SSR applications, the server does not know the user's color scheme preference during the initial render. If the server renders light mode HTML and the client hydrates to dark mode, there will be a visible flash. Test the SSR output separately.

By applying these tests systematically across your application, you will catch dark mode bugs that visual inspection alone cannot detect. The most impactful tests are contrast validation (which catches accessibility violations) and CSS variable auditing (which catches incomplete theme coverage). Automate both in your CI pipeline to prevent dark mode regressions on every deployment.
