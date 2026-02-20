---
name: Localization Bug Finder
description: Detect localization and internationalization defects including untranslated strings, text expansion overflow, RTL layout issues, and locale-specific formatting errors
version: 1.0.0
author: Pramod
license: MIT
tags: [localization, i18n, l10n, translation, rtl, text-expansion, locale-testing, internationalization]
testingTypes: [e2e, accessibility]
frameworks: [playwright]
languages: [typescript, javascript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Localization Bug Finder Skill

You are an expert QA automation engineer specializing in localization and internationalization testing. When the user asks you to write, review, or debug localization tests, follow these detailed instructions to detect untranslated strings, text expansion overflow, RTL layout issues, and locale-specific formatting errors across web applications.

## Core Principles

1. **Locale-agnostic test design** -- Write tests that can run against any locale without hardcoding expected translated strings. Use translation keys or data-testid attributes as anchors instead of translated text.
2. **Pseudo-localization first** -- Before testing with real translations, use pseudo-localization to surface hardcoded strings, concatenation issues, and layout problems without waiting for translator delivery.
3. **Visual integrity across locales** -- Text expansion in languages like German, Finnish, and Greek can break layouts. Every UI component must be verified for overflow, truncation, and wrapping under expanded text conditions.
4. **RTL is not a mirror** -- Right-to-left layout testing requires more than CSS `direction: rtl`. Verify logical properties, bidirectional text mixing, icon directionality, and navigation flow reversal.
5. **Format-sensitive validation** -- Numbers, currencies, dates, and pluralization rules vary dramatically across locales. Never assume English formatting rules apply universally.
6. **Separation of concerns** -- Translation content belongs in resource bundles, not in source code. Tests must verify that the i18n pipeline is correctly wired, not that translations are linguistically correct.
7. **Automated regression** -- Localization bugs tend to regress silently. Integrate locale-aware checks into CI pipelines to catch regressions on every pull request.

## Project Structure

Organize localization test projects with this structure:

```
tests/
  localization/
    untranslated-strings/
      scan-untranslated.spec.ts
      pseudo-locale.spec.ts
    text-expansion/
      overflow-detection.spec.ts
      truncation-audit.spec.ts
    rtl/
      layout-verification.spec.ts
      bidi-text.spec.ts
    formatting/
      number-format.spec.ts
      currency-format.spec.ts
      date-format.spec.ts
      pluralization.spec.ts
    locale-switching/
      switch-without-reload.spec.ts
      persistence.spec.ts
  fixtures/
    locale.fixture.ts
    translation-data.fixture.ts
  helpers/
    pseudo-localizer.ts
    text-expansion-calculator.ts
    locale-format-validator.ts
  config/
    supported-locales.ts
    expansion-ratios.ts
playwright.config.ts
```

## Detecting Untranslated Strings

Untranslated strings are the most common localization defect. They appear when developers add new UI text without adding corresponding translation keys, or when the i18n framework falls back to the default locale silently.

### Scanning the DOM for Untranslated Content

```typescript
import { test, expect, Page } from '@playwright/test';

interface UntranslatedResult {
  element: string;
  text: string;
  selector: string;
}

async function scanForUntranslatedStrings(
  page: Page,
  sourceLocale: string,
  targetLocale: string
): Promise<UntranslatedResult[]> {
  // Navigate to the page with the source locale first
  await page.goto(`/?locale=${sourceLocale}`);
  await page.waitForLoadState('networkidle');

  const sourceTexts = await page.evaluate(() => {
    const textNodes: { text: string; selector: string }[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const text = node.textContent?.trim();
          if (!text || text.length < 2) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript'].includes(tag)) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement!;
      const selector = parent.getAttribute('data-testid')
        || parent.id
        || `${parent.tagName.toLowerCase()}.${parent.className}`;
      textNodes.push({
        text: node.textContent!.trim(),
        selector,
      });
    }
    return textNodes;
  });

  // Now navigate to the target locale
  await page.goto(`/?locale=${targetLocale}`);
  await page.waitForLoadState('networkidle');

  const targetTexts = await page.evaluate(() => {
    const texts = new Set<string>();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text && text.length >= 2) texts.add(text);
    }
    return Array.from(texts);
  });

  const targetTextSet = new Set(targetTexts);
  const untranslated: UntranslatedResult[] = [];

  for (const source of sourceTexts) {
    if (targetTextSet.has(source.text)) {
      // Text is identical in both locales -- possibly untranslated
      const isLikelyUntranslated = /[a-zA-Z]{3,}/.test(source.text);
      if (isLikelyUntranslated) {
        untranslated.push({
          element: source.selector,
          text: source.text,
          selector: source.selector,
        });
      }
    }
  }

  return untranslated;
}

test.describe('Untranslated String Detection', () => {
  test('should have no untranslated strings in German locale', async ({ page }) => {
    const untranslated = await scanForUntranslatedStrings(page, 'en', 'de');

    if (untranslated.length > 0) {
      console.table(untranslated);
    }

    expect(untranslated, `Found ${untranslated.length} untranslated strings`).toHaveLength(0);
  });

  test('should have no untranslated strings in Japanese locale', async ({ page }) => {
    const untranslated = await scanForUntranslatedStrings(page, 'en', 'ja');
    expect(untranslated).toHaveLength(0);
  });
});
```

### Pseudo-Localization Testing

Pseudo-localization replaces characters with accented equivalents and adds padding to simulate text expansion, making untranslated or hardcoded strings immediately visible without real translations.

```typescript
function pseudoLocalize(text: string): string {
  const charMap: Record<string, string> = {
    a: '\u00e5', b: '\u0183', c: '\u00e7', d: '\u00f0', e: '\u00e9',
    f: '\u0192', g: '\u011d', h: '\u0125', i: '\u00ee', j: '\u0135',
    k: '\u0137', l: '\u013c', m: '\u1e3f', n: '\u00f1', o: '\u00f6',
    p: '\u00fe', q: '\u01eb', r: '\u0155', s: '\u0161', t: '\u0163',
    u: '\u00fb', v: '\u1e7d', w: '\u0175', x: '\u1e8b', y: '\u00fd',
    z: '\u017e',
    A: '\u00c5', B: '\u0182', C: '\u00c7', D: '\u00d0', E: '\u00c9',
    F: '\u0191', G: '\u011c', H: '\u0124', I: '\u00ce', J: '\u0134',
    K: '\u0136', L: '\u013b', M: '\u1e3e', N: '\u00d1', O: '\u00d6',
    P: '\u00de', Q: '\u01ea', R: '\u0154', S: '\u0160', T: '\u0162',
    U: '\u00db', V: '\u1e7c', W: '\u0174', X: '\u1e8a', Y: '\u00dd',
    Z: '\u017d',
  };

  const pseudoChars = text
    .split('')
    .map((char) => charMap[char] || char)
    .join('');

  // Add ~35% padding to simulate text expansion
  const padding = Math.ceil(text.length * 0.35);
  const padStr = '~'.repeat(padding);

  return `[${pseudoChars}${padStr}]`;
}

test('pseudo-localized page should show no raw English strings', async ({ page }) => {
  // Assuming the app supports a pseudo locale like 'xx-PS'
  await page.goto('/?locale=xx-PS');
  await page.waitForLoadState('networkidle');

  const visibleTexts = await page.evaluate(() => {
    const texts: string[] = [];
    const elements = document.querySelectorAll(
      'h1, h2, h3, p, span, button, a, label, th, td, li'
    );
    elements.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 2) texts.push(text);
    });
    return texts;
  });

  const nonPseudoStrings = visibleTexts.filter((text) => {
    // Pseudo-localized strings are wrapped in brackets and contain accented chars
    const isPseudo = text.startsWith('[') && text.includes('~');
    const isNumeric = /^\d+([.,]\d+)*$/.test(text);
    const isBrandName = ['QASkills', 'GitHub', 'Google'].some((brand) =>
      text.includes(brand)
    );
    return !isPseudo && !isNumeric && !isBrandName;
  });

  if (nonPseudoStrings.length > 0) {
    console.log('Untranslated strings found:', nonPseudoStrings);
  }

  expect(nonPseudoStrings).toHaveLength(0);
});
```

## Text Expansion Overflow Detection

Languages like German, Finnish, and Greek can expand English text by 30-50%. Short labels expand even more dramatically. A 5-character English button can become 15 characters in German.

### Expansion Ratio Reference

```typescript
const EXPANSION_RATIOS: Record<string, Record<string, number>> = {
  // Source text length ranges mapped to expansion factors
  short: {   // 1-10 characters
    de: 1.80, fi: 1.80, el: 1.60, fr: 1.50, es: 1.40, pt: 1.40,
    ru: 1.50, ja: 0.60, zh: 0.50, ko: 0.70, ar: 1.25, he: 1.20,
  },
  medium: {  // 11-70 characters
    de: 1.50, fi: 1.50, el: 1.40, fr: 1.30, es: 1.30, pt: 1.30,
    ru: 1.40, ja: 0.55, zh: 0.45, ko: 0.65, ar: 1.20, he: 1.15,
  },
  long: {    // 71+ characters
    de: 1.35, fi: 1.35, el: 1.30, fr: 1.20, es: 1.20, pt: 1.20,
    ru: 1.30, ja: 0.50, zh: 0.40, ko: 0.60, ar: 1.15, he: 1.10,
  },
};

function getExpansionRatio(textLength: number, locale: string): number {
  const range = textLength <= 10 ? 'short' : textLength <= 70 ? 'medium' : 'long';
  return EXPANSION_RATIOS[range]?.[locale] ?? 1.3;
}
```

### Overflow Detection Tests

```typescript
import { test, expect } from '@playwright/test';

interface OverflowResult {
  selector: string;
  text: string;
  containerWidth: number;
  textWidth: number;
  overflowPx: number;
}

test.describe('Text Expansion Overflow Detection', () => {
  const expandedLocales = ['de', 'fi', 'el', 'fr'];

  for (const locale of expandedLocales) {
    test(`should have no text overflow in ${locale} locale`, async ({ page }) => {
      await page.goto(`/?locale=${locale}`);
      await page.waitForLoadState('networkidle');

      const overflows: OverflowResult[] = await page.evaluate(() => {
        const results: OverflowResult[] = [];
        const interactiveElements = document.querySelectorAll(
          'button, a, label, [role="tab"], [role="menuitem"], th, .badge, .chip, .tag, nav a'
        );

        interactiveElements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const style = window.getComputedStyle(htmlEl);

          // Skip elements with intentional overflow handling
          if (style.overflow === 'hidden' && style.textOverflow === 'ellipsis') return;
          if (style.overflow === 'scroll' || style.overflow === 'auto') return;

          const isOverflowing =
            htmlEl.scrollWidth > htmlEl.clientWidth ||
            htmlEl.scrollHeight > htmlEl.clientHeight;

          if (isOverflowing) {
            const text = htmlEl.textContent?.trim() || '';
            results.push({
              selector:
                htmlEl.getAttribute('data-testid') ||
                htmlEl.id ||
                `${htmlEl.tagName}.${htmlEl.className}`,
              text: text.substring(0, 80),
              containerWidth: htmlEl.clientWidth,
              textWidth: htmlEl.scrollWidth,
              overflowPx: htmlEl.scrollWidth - htmlEl.clientWidth,
            });
          }
        });

        return results;
      });

      if (overflows.length > 0) {
        console.table(overflows);
      }

      expect(
        overflows,
        `Found ${overflows.length} text overflow issues in ${locale} locale`
      ).toHaveLength(0);
    });
  }

  test('buttons should accommodate 180% text expansion', async ({ page }) => {
    await page.goto('/?locale=de');
    await page.waitForLoadState('networkidle');

    const buttons = page.locator('button:visible');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (!box) continue;

      // Verify no button is clipped at viewport edge
      const viewport = page.viewportSize();
      if (viewport) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      }

      // Verify text is not being clipped vertically
      const scrollHeight = await button.evaluate(
        (el) => el.scrollHeight
      );
      expect(scrollHeight).toBeLessThanOrEqual(box.height + 2); // 2px tolerance
    }
  });
});
```

## RTL Layout Verification

Right-to-left languages such as Arabic, Hebrew, and Persian require comprehensive layout reversal. This goes far beyond setting `direction: rtl` on the document.

### RTL Layout Test Suite

```typescript
import { test, expect, Page } from '@playwright/test';

async function verifyRTLLayout(page: Page): Promise<string[]> {
  const violations: string[] = [];

  const results = await page.evaluate(() => {
    const issues: string[] = [];

    // Check document direction
    const htmlDir = document.documentElement.getAttribute('dir');
    const htmlLang = document.documentElement.getAttribute('lang');
    if (htmlDir !== 'rtl') {
      issues.push(`Document dir="${htmlDir}" but expected "rtl"`);
    }

    // Check for physical CSS properties that should be logical
    const allElements = document.querySelectorAll('*');
    allElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const testId =
        (el as HTMLElement).getAttribute('data-testid') ||
        `${el.tagName.toLowerCase()}.${(el as HTMLElement).className?.toString().substring(0, 30)}`;

      // Check that text alignment follows RTL
      if (style.textAlign === 'left') {
        const isInput = ['INPUT', 'TEXTAREA'].includes(el.tagName);
        const isCode = ['CODE', 'PRE'].includes(el.tagName);
        if (!isInput && !isCode) {
          issues.push(`${testId}: text-align is "left" in RTL context`);
        }
      }

      // Check flexbox direction
      if (style.display === 'flex' || style.display === 'inline-flex') {
        // In RTL, row direction should visually reverse
        if (style.direction !== 'rtl' && style.flexDirection === 'row') {
          issues.push(`${testId}: flex container may not respect RTL direction`);
        }
      }
    });

    return issues;
  });

  violations.push(...results);
  return violations;
}

test.describe('RTL Layout Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?locale=ar');
    await page.waitForLoadState('networkidle');
  });

  test('document should have dir="rtl" attribute', async ({ page }) => {
    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });

  test('navigation should flow right-to-left', async ({ page }) => {
    const nav = page.locator('nav').first();
    const navItems = nav.locator('a:visible');
    const count = await navItems.count();

    if (count >= 2) {
      const firstBox = await navItems.first().boundingBox();
      const lastBox = await navItems.last().boundingBox();

      // In RTL, the first nav item should be on the right side
      expect(firstBox!.x).toBeGreaterThan(lastBox!.x);
    }
  });

  test('icons should be mirrored for directional content', async ({ page }) => {
    // Check that back/forward arrows are mirrored in RTL
    const backButtons = page.locator(
      '[aria-label*="back"], [aria-label*="previous"], [data-testid*="back"]'
    );
    const count = await backButtons.count();

    for (let i = 0; i < count; i++) {
      const transform = await backButtons.nth(i).evaluate((el) => {
        return window.getComputedStyle(el).transform;
      });
      // Expect scaleX(-1) or a rotation that mirrors the icon
      const isMirrored =
        transform.includes('-1') || transform.includes('180');
      expect(isMirrored).toBe(true);
    }
  });

  test('form labels should align to the right of inputs', async ({ page }) => {
    const labels = page.locator('label:visible');
    const count = await labels.count();

    for (let i = 0; i < count; i++) {
      const label = labels.nth(i);
      const forAttr = await label.getAttribute('for');
      if (!forAttr) continue;

      const input = page.locator(`#${forAttr}`);
      if ((await input.count()) === 0) continue;

      const labelBox = await label.boundingBox();
      const inputBox = await input.boundingBox();

      if (labelBox && inputBox) {
        // In RTL horizontal layout, label should be to the right of input
        // or above it (stacked layout is fine)
        const isRightOf = labelBox.x >= inputBox.x + inputBox.width - 5;
        const isAbove = labelBox.y + labelBox.height <= inputBox.y + 5;
        expect(isRightOf || isAbove).toBe(true);
      }
    }
  });

  test('bidirectional text should render correctly', async ({ page }) => {
    // Inject a test element with mixed LTR and RTL content
    await page.evaluate(() => {
      const div = document.createElement('div');
      div.setAttribute('data-testid', 'bidi-test');
      div.innerHTML = '<p>This contains <span dir="ltr">English text</span> within Arabic</p>';
      document.body.appendChild(div);
    });

    const bidiElement = page.locator('[data-testid="bidi-test"] span[dir="ltr"]');
    await expect(bidiElement).toBeVisible();
    const dir = await bidiElement.getAttribute('dir');
    expect(dir).toBe('ltr');
  });
});
```

## Number, Currency, and Date Locale Formatting

### Format Validation Tests

```typescript
import { test, expect } from '@playwright/test';

const LOCALE_FORMAT_EXPECTATIONS: Record<
  string,
  {
    numberSample: string;      // How 1234567.89 should display
    dateSeparator: string;     // Common date separator
    currencyPosition: 'before' | 'after';
    decimalSeparator: string;
    thousandsSeparator: string;
  }
> = {
  'en-US': {
    numberSample: '1,234,567.89',
    dateSeparator: '/',
    currencyPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  'de-DE': {
    numberSample: '1.234.567,89',
    dateSeparator: '.',
    currencyPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  'fr-FR': {
    numberSample: '1\u202f234\u202f567,89',
    dateSeparator: '/',
    currencyPosition: 'after',
    decimalSeparator: ',',
    thousandsSeparator: '\u202f',
  },
  'ja-JP': {
    numberSample: '1,234,567.89',
    dateSeparator: '/',
    currencyPosition: 'before',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  'ar-SA': {
    numberSample: '1,234,567.89',
    dateSeparator: '/',
    currencyPosition: 'after',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
};

test.describe('Locale-Specific Formatting', () => {
  for (const [locale, expected] of Object.entries(LOCALE_FORMAT_EXPECTATIONS)) {
    test(`number formatting should match ${locale} conventions`, async ({ page }) => {
      await page.goto(`/?locale=${locale}`);
      await page.waitForLoadState('networkidle');

      // Find elements that display numeric content
      const numericElements = page.locator(
        '[data-type="number"], [data-type="currency"], [data-type="price"]'
      );
      const count = await numericElements.count();

      for (let i = 0; i < count; i++) {
        const text = await numericElements.nth(i).textContent();
        if (!text) continue;

        // Verify decimal separator
        const hasCorrectDecimal = text.includes(expected.decimalSeparator);
        expect(hasCorrectDecimal).toBe(true);
      }
    });

    test(`date formatting should match ${locale} conventions`, async ({ page }) => {
      await page.goto(`/?locale=${locale}`);
      await page.waitForLoadState('networkidle');

      const dateElements = page.locator('[data-type="date"], time');
      const count = await dateElements.count();

      for (let i = 0; i < count; i++) {
        const text = await dateElements.nth(i).textContent();
        if (!text) continue;

        // Verify the date uses the expected separator
        expect(text).toContain(expected.dateSeparator);
      }
    });
  }
});
```

### Pluralization Rule Testing

```typescript
import { test, expect } from '@playwright/test';

// Pluralization categories vary by language
// English: one, other
// Arabic: zero, one, two, few, many, other
// Polish: one, few, many, other
const PLURAL_TEST_CASES: Record<string, number[]> = {
  en: [0, 1, 2, 5, 21, 100],
  ar: [0, 1, 2, 3, 11, 100],
  pl: [0, 1, 2, 5, 12, 22],
  ru: [0, 1, 2, 5, 11, 21],
  ja: [0, 1, 2, 100], // Japanese has no plural forms
};

test.describe('Pluralization Rules', () => {
  for (const [locale, counts] of Object.entries(PLURAL_TEST_CASES)) {
    for (const count of counts) {
      test(`${locale}: pluralization correct for count=${count}`, async ({ page }) => {
        await page.goto(`/test-plurals?locale=${locale}&count=${count}`);
        await page.waitForLoadState('networkidle');

        const pluralText = page.locator('[data-testid="plural-result"]');
        await expect(pluralText).toBeVisible();

        const text = await pluralText.textContent();

        // Verify the text is not showing a raw key like {count} items
        expect(text).not.toMatch(/\{.*\}/);
        // Verify it contains the actual count
        expect(text).toContain(count.toString());
      });
    }
  }
});
```

## String Concatenation Detection

String concatenation is one of the most destructive anti-patterns in internationalization. Concatenated strings break word order assumptions in other languages.

```typescript
import { test, expect } from '@playwright/test';

test.describe('String Concatenation Detection', () => {
  test('should detect concatenation patterns in source code', async () => {
    // This is a static analysis test that runs on source files
    const { execSync } = require('child_process');

    // Search for common concatenation anti-patterns in source
    const patterns = [
      // Direct string concatenation with translated parts
      "\\+ .*t\\('",
      "t\\('.*\\+ ",
      // Template literals mixing translated and untranslated
      '`\\$\\{t\\(',
      // String.concat with translations
      "\\.concat\\(.*t\\('",
    ];

    for (const pattern of patterns) {
      const result = execSync(
        `grep -rn "${pattern}" src/components/ src/pages/ --include="*.tsx" --include="*.ts" || true`,
        { encoding: 'utf-8' }
      );

      if (result.trim()) {
        console.warn('Potential concatenation issue found:');
        console.warn(result);
      }

      expect(result.trim()).toBe('');
    }
  });
});
```

## Locale Switching Without Page Reload

Modern web applications should support changing locale at runtime without a full page reload. This tests the reactivity of the i18n system.

```typescript
import { test, expect, Page } from '@playwright/test';

async function switchLocaleAndVerify(
  page: Page,
  fromLocale: string,
  toLocale: string
): Promise<void> {
  // Capture content before switch
  const headingBefore = await page.locator('h1').first().textContent();

  // Perform locale switch via UI (typical dropdown or menu)
  const localeSelector = page.locator(
    '[data-testid="locale-switcher"], [aria-label="Change language"]'
  );
  await localeSelector.click();

  const targetOption = page.locator(
    `[data-locale="${toLocale}"], [value="${toLocale}"]`
  );
  await targetOption.click();

  // Wait for translations to update without page reload
  await page.waitForFunction(
    (prevText) => {
      const h1 = document.querySelector('h1');
      return h1 && h1.textContent !== prevText;
    },
    headingBefore,
    { timeout: 5000 }
  );

  // Verify page did NOT reload
  const navigationEntries = await page.evaluate(() => {
    return performance.getEntriesByType('navigation').length;
  });
  expect(navigationEntries).toBe(1); // Only the initial navigation

  // Verify content actually changed
  const headingAfter = await page.locator('h1').first().textContent();
  expect(headingAfter).not.toBe(headingBefore);

  // Verify the HTML lang attribute updated
  const lang = await page.getAttribute('html', 'lang');
  expect(lang).toBe(toLocale);
}

test.describe('Locale Switching', () => {
  test('should switch from English to German without reload', async ({ page }) => {
    await page.goto('/?locale=en');
    await page.waitForLoadState('networkidle');
    await switchLocaleAndVerify(page, 'en', 'de');
  });

  test('should switch from English to Arabic and update direction', async ({ page }) => {
    await page.goto('/?locale=en');
    await page.waitForLoadState('networkidle');
    await switchLocaleAndVerify(page, 'en', 'ar');

    const dir = await page.getAttribute('html', 'dir');
    expect(dir).toBe('rtl');
  });

  test('should persist locale preference after navigation', async ({ page }) => {
    await page.goto('/?locale=en');
    await page.waitForLoadState('networkidle');
    await switchLocaleAndVerify(page, 'en', 'fr');

    // Navigate to a different page
    await page.click('a[href="/about"]');
    await page.waitForLoadState('networkidle');

    // Verify locale persisted
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBe('fr');
  });

  test('should handle rapid locale switching without race conditions', async ({ page }) => {
    await page.goto('/?locale=en');
    await page.waitForLoadState('networkidle');

    const locales = ['de', 'fr', 'es', 'ja', 'ar'];
    const localeSelector = page.locator('[data-testid="locale-switcher"]');

    for (const locale of locales) {
      await localeSelector.click();
      await page.locator(`[data-locale="${locale}"]`).click();
      // Small delay to simulate rapid switching
      await page.waitForTimeout(100);
    }

    // After rapid switching, the final locale should be the last one
    await page.waitForTimeout(1000);
    const finalLang = await page.getAttribute('html', 'lang');
    expect(finalLang).toBe('ar');
  });
});
```

## Configuration

### Playwright Configuration for Locale Testing

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/localization',
  fullyParallel: true,
  retries: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'locale-test-results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Test all supported locales in Chrome
    ...['en', 'de', 'fr', 'es', 'ja', 'ar', 'he', 'zh', 'ko', 'pt', 'ru'].map(
      (locale) => ({
        name: `chromium-${locale}`,
        use: {
          ...devices['Desktop Chrome'],
          locale,
          timezoneId: getTimezoneForLocale(locale),
        },
      })
    ),
    // RTL-specific project for visual testing
    {
      name: 'rtl-testing',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'ar',
        timezoneId: 'Asia/Riyadh',
      },
      testMatch: '**/rtl/**',
    },
  ],
});

function getTimezoneForLocale(locale: string): string {
  const timezones: Record<string, string> = {
    en: 'America/New_York',
    de: 'Europe/Berlin',
    fr: 'Europe/Paris',
    es: 'Europe/Madrid',
    ja: 'Asia/Tokyo',
    ar: 'Asia/Riyadh',
    he: 'Asia/Jerusalem',
    zh: 'Asia/Shanghai',
    ko: 'Asia/Seoul',
    pt: 'America/Sao_Paulo',
    ru: 'Europe/Moscow',
  };
  return timezones[locale] || 'UTC';
}
```

## Best Practices

1. **Use ICU MessageFormat for pluralization** -- Never construct plural strings manually. Use a library like `intl-messageformat` or the built-in `Intl.PluralRules` API that handles the six CLDR plural categories (zero, one, two, few, many, other).

2. **Externalize all user-facing strings** -- Every string visible to users must come from a resource bundle. This includes error messages, tooltips, aria-labels, placeholder text, and even alt text for images.

3. **Avoid string concatenation** -- Never build sentences by concatenating translated fragments. Different languages have different word orders. Use parameterized messages with placeholders like `{name} has {count} items` instead of `name + " has " + count + " items"`.

4. **Design UI with 40% expansion headroom** -- When designing layouts, assume text will expand by at least 40% from English. Use flexible containers, wrapping, and avoid fixed-width elements for text content.

5. **Test with real RTL content, not just the `dir` attribute** -- Use actual Arabic or Hebrew text in tests. Synthetic RTL testing misses issues with bidirectional text mixing, number rendering within RTL contexts, and punctuation placement.

6. **Implement locale-aware sorting** -- Use `Intl.Collator` for string comparison and sorting. Alphabetical order varies by locale (Swedish treats characters with diacritics differently than German).

7. **Handle locale-specific input validation** -- Phone numbers, postal codes, names, and addresses have different formats per locale. Never hardcode validation patterns for a single locale.

8. **Use CSS logical properties** -- Replace `margin-left` with `margin-inline-start`, `padding-right` with `padding-inline-end`, `text-align: left` with `text-align: start`. This ensures layouts adapt automatically to text direction.

9. **Store translations in version control** -- Keep translation files alongside code so that changes to UI strings are tracked and reviewed. Use CI checks to ensure all locales have complete translations.

10. **Test with the longest language first** -- German and Finnish produce the longest translations from English. If your UI works with German, it will likely work with all European languages.

11. **Separate locale from language** -- A user may want English language with European date formats (en-GB) or French language with Canadian number formatting (fr-CA). Support full locale codes, not just language codes.

12. **Automate screenshot comparisons per locale** -- Use visual regression testing to catch layout shifts that only appear in specific locales. A 2px shift in English might become a 20px overflow in Finnish.

## Anti-Patterns to Avoid

1. **Hardcoding date formats** -- Never use `moment().format('MM/DD/YYYY')` or manual date string construction. Always use `Intl.DateTimeFormat` or a locale-aware library. The date "01/02/2026" means January 2nd in the US but February 1st in Europe.

2. **Concatenating translated strings** -- `t('welcome') + ', ' + userName + '!'` breaks in languages where the greeting structure differs. Use `t('welcomeUser', { name: userName })` with parameterized messages instead.

3. **Using images containing text** -- Text baked into images cannot be translated. Use CSS or SVG with translatable text overlays. If images with text are unavoidable, provide locale-specific image variants.

4. **Assuming character width uniformity** -- CJK characters are typically double-width compared to Latin characters. Thai and Arabic scripts have different height characteristics. Never calculate layout based on character count alone.

5. **Ignoring font fallback for non-Latin scripts** -- Your beautiful custom font probably does not support Arabic, Thai, or CJK characters. Define a comprehensive `font-family` fallback chain that includes system fonts for these scripts.

6. **Treating locale as a global singleton** -- In server-side rendering, locale must be per-request, not per-process. A shared global locale variable causes one user's language preference to leak into another user's response.

7. **Stripping diacritics for comparison** -- Never normalize accented characters away for string comparison or search. In many languages, characters with and without diacritics are entirely different letters with different meanings.

## Debugging Tips

1. **Enable i18n debug mode** -- Most i18n libraries (react-i18next, next-intl, vue-i18n) support a debug mode that logs missing keys, fallback usage, and namespace loading. Enable this in development to catch issues early.

2. **Use browser DevTools to simulate locales** -- Chrome DevTools allows overriding the browser locale via Sensors tab. This is faster than changing system settings for quick locale testing.

3. **Check the Network tab for translation file loading** -- If translations are loaded asynchronously, verify that the correct locale bundle is being fetched. Look for 404 errors on translation files or unexpected fallback to the default locale.

4. **Inspect computed CSS for physical vs logical properties** -- Use DevTools to check whether elements use physical properties (`margin-left`, `text-align: left`) that will not flip in RTL. Search for these in the computed styles panel.

5. **Test with very long words** -- German compound words like "Geschwindigkeitsbegrenzung" (speed limit) are a single word that cannot be hyphenated by default. Test that CSS `overflow-wrap: break-word` or `hyphens: auto` is applied to text containers.

6. **Verify Content-Language headers** -- Check that the server sends the correct `Content-Language` HTTP header matching the requested locale. Some CDNs and caches use this header for content negotiation.

7. **Watch for timezone-locale mismatches** -- A user with locale `ja-JP` but timezone `America/New_York` should see Japanese formatting with Eastern Time dates. Verify that locale formatting and timezone handling are independent concerns.

8. **Use Unicode bidirectional algorithm visualizers** -- When debugging RTL text rendering issues, use tools like the Unicode BiDi Reference Implementation or browser extensions that highlight bidi control characters to understand how mixed-direction text is being resolved.

9. **Log the full ICU locale chain** -- When a translation is missing, the resolution chain matters: `fr-CA` -> `fr` -> `en` -> key itself. Log which level the fallback reached to understand why a user sees an unexpected language.

10. **Check for invisible Unicode characters** -- Translation files sometimes contain zero-width spaces, byte order marks, or other invisible characters that cause string comparisons to fail silently. Use a hex editor or `xxd` to inspect suspicious translation values.
