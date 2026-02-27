import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Internationalization Testing — i18n, l10n, and Locale Automation',
  description:
    'Complete guide to internationalization and localization testing. Covers i18n validation, locale-specific bugs, date and currency formatting, RTL layouts, and automation strategies.',
  date: '2026-02-23',
  category: 'Guide',
  content: `
Internationalization testing is the practice of verifying that your application can adapt to different languages, regions, and cultural conventions without engineering changes. If your product serves -- or plans to serve -- users outside a single locale, **i18n testing** is not optional. A date displayed as 03/04/2026 means March 4th to an American user and April 3rd to a European user. A price shown as \$1,000.00 is meaningless to a user who expects 1.000,00 EUR. A form label that reads perfectly in English may overflow its container when translated into German. And an entire layout can break when rendered in a right-to-left language like Arabic or Hebrew.

This guide covers the complete internationalization and **localization testing** stack -- from understanding the difference between i18n and l10n, to catching locale-specific bugs in dates, numbers, and currencies, to validating RTL layouts, managing translation quality, handling Unicode edge cases, implementing pseudo-localization, and integrating all of it into your CI/CD pipeline. Whether you are internationalizing a greenfield application or retrofitting an existing product for new markets, these techniques will help you ship software that works correctly for every user, everywhere.

---

## Key Takeaways

- **Internationalization (i18n) is architecture; localization (l10n) is content** -- i18n makes your code locale-agnostic, while l10n adapts content (translations, formats, imagery) for a specific locale. Both need dedicated testing strategies.
- **Date, time, number, and currency formatting are the most common sources of locale bugs** -- hardcoded formats like \`MM/DD/YYYY\` or \`\$\` symbols will break in non-US locales. Always use the \`Intl\` API or equivalent locale-aware formatters.
- **RTL layout testing is essential for Arabic, Hebrew, Urdu, and Farsi** -- CSS logical properties (\`margin-inline-start\` instead of \`margin-left\`) and bidirectional text handling require dedicated visual and functional validation.
- **Translation expansion causes UI breakage** -- German and Finnish translations are typically 30-40% longer than English. Pseudo-localization catches these issues before real translations arrive.
- **Character encoding bugs are silent and destructive** -- UTF-8 should be enforced everywhere (database, API, HTML, HTTP headers), and your tests should include CJK characters, emoji, diacritics, and special symbols.
- **AI coding agents with i18n skills can automate locale bug detection** -- from finding hardcoded strings to validating RTL layouts, specialized QA skills catch i18n defects that generic testing misses entirely.

---

## i18n vs l10n: What's the Difference?

The terms **internationalization** and **localization** are often used interchangeably, but they refer to distinct engineering concerns. Understanding the difference is critical because each requires a different testing approach.

### Internationalization (i18n)

Internationalization is the process of designing and building your application so that it **can** support multiple locales without requiring code changes. It is an architectural concern. i18n work includes:

- **Externalizing all user-facing strings** into resource files or translation management systems instead of hardcoding them in source code
- **Using locale-aware APIs** for formatting dates, numbers, currencies, and plurals instead of manual string manipulation
- **Supporting bidirectional text** by using CSS logical properties and proper HTML \`dir\` attributes
- **Handling variable-length text** in UI components so that longer translations do not break layouts
- **Supporting Unicode (UTF-8)** throughout the entire stack -- database, API, file storage, and rendering

The "18" in i18n refers to the 18 letters between the "i" and the "n" in "internationalization." Similarly, the "10" in l10n refers to the 10 letters in "localization."

### Localization (l10n)

Localization is the process of adapting your internationalized application for a **specific** locale. It is a content and configuration concern. l10n work includes:

- **Translating strings** into the target language, accounting for context, tone, and cultural conventions
- **Configuring locale-specific formats** for dates, times, numbers, currencies, addresses, and phone numbers
- **Adapting images and icons** that contain text or culturally specific symbols
- **Adjusting content for cultural norms** -- color meanings, reading direction, name formats, and form field expectations

### Why Both Need Testing

**i18n testing** validates that your code architecture correctly handles locale-switching, dynamic text, and formatting delegation. You test i18n even in a single-language application to ensure the foundation is solid. **l10n testing** validates that each specific locale works correctly -- that French translations display properly, that Japanese line-breaking is correct, and that Arabic layouts mirror as expected.

| Aspect | i18n Testing | l10n Testing |
|--------|-------------|-------------|
| **Focus** | Code architecture and locale readiness | Locale-specific content and behavior |
| **When** | During development, before translations | After translations and locale configs |
| **Who** | Engineers and QA | QA, translators, and local reviewers |
| **Automated?** | Highly automatable | Mix of automated and manual review |
| **Examples** | No hardcoded strings, Intl API usage | French date formats, Japanese truncation |

---

## Common i18n Bugs

Internationalization bugs are insidious because they often only manifest in specific locales, which means they slip through English-only testing. Here are the most frequent categories of **i18n bugs** and how to catch them.

### Hardcoded Strings

The most fundamental i18n bug is user-facing text written directly in source code rather than loaded from a translation resource file. Hardcoded strings cannot be translated and will display in the development language regardless of the user's locale.

\`\`\`typescript
// Bad: hardcoded string
const message = 'No results found';

// Good: externalized string
const message = t('search.noResults');
\`\`\`

Hardcoded strings are easy to introduce during rapid development and surprisingly difficult to find in large codebases. Static analysis tools and linters like \`eslint-plugin-i18next\` can flag them automatically.

### String Concatenation with Variables

Building sentences by concatenating strings with variables is a classic i18n antipattern. Different languages have different word orders, and concatenation locks you into a single grammatical structure.

\`\`\`typescript
// Bad: concatenation assumes English word order
const msg = 'Welcome, ' + userName + '! You have ' + count + ' items.';

// Good: interpolation allows translators to reorder
const msg = t('welcome.message', { name: userName, count: count });
// English: "Welcome, {name}! You have {count} items."
// Japanese: "{name}\u3055\u3093\u3001\u3088\u3046\u3053\u305D\uFF01{count}\u4EF6\u306E\u30A2\u30A4\u30C6\u30E0\u304C\u3042\u308A\u307E\u3059\u3002"
\`\`\`

### Date and Number Format Assumptions

Hardcoding date formats or number separators is one of the most common causes of **locale testing** failures. What looks like a minor formatting choice can cause real confusion.

### Text Truncation from Translation Expansion

English is one of the more compact languages. When translated, text commonly expands by 30-40% for languages like German, Finnish, and Greek. UI elements with fixed widths or tight padding will overflow or truncate.

### Common i18n Bug Reference

| Bug Type | Example | Impact | Detection |
|----------|---------|--------|-----------|
| Hardcoded strings | \`"Submit"\` in JSX | Untranslatable UI | Linter, static analysis |
| String concatenation | \`"Hello " + name\` | Broken word order | Code review, linter |
| Hardcoded date format | \`MM/DD/YYYY\` | Ambiguous dates | Locale switching test |
| Hardcoded currency | \`"\$" + amount\` | Wrong currency symbol | Multi-locale test |
| Fixed-width containers | \`width: 120px\` on button | Text overflow in German | Pseudo-localization |
| ASCII-only validation | \`/^[a-zA-Z]+\$/\` | Rejects valid names (\u00D1, \u00FC, \u00E7) | Unicode input tests |
| Hardcoded plurals | \`count + " items"\` | Wrong for singular, wrong for languages with complex plural rules | ICU MessageFormat check |
| LTR-only layout | \`margin-left: 16px\` | Broken in RTL locales | RTL visual test |
| Sort by byte value | \`array.sort()\` | Wrong order for accented characters | Locale-aware sort test |

---

## Testing Date, Time, and Number Formats

Date, time, and number formatting is where **internationalization testing** gets concrete. These are not theoretical concerns -- they are the bugs your users actually report. The core principle is simple: **never format dates, times, numbers, or currencies manually**. Always delegate to locale-aware APIs.

### Date and Time Formatting

The same date can be represented completely differently across locales:

| Locale | Date Format | Example |
|--------|------------|---------|
| en-US | MM/DD/YYYY | 03/04/2026 |
| en-GB | DD/MM/YYYY | 04/03/2026 |
| de-DE | DD.MM.YYYY | 04.03.2026 |
| ja-JP | YYYY/MM/DD | 2026/03/04 |
| ko-KR | YYYY. MM. DD. | 2026. 03. 04. |
| ar-SA | DD/MM/YYYY (Hijri calendar) | \u0660\u0669/\u0660\u0668/\u0661\u0664\u0664\u0667 |

Use the \`Intl.DateTimeFormat\` API (or its equivalent in your language) instead of building date strings manually:

\`\`\`typescript
// Locale-aware date formatting
const date = new Date('2026-03-04T14:30:00Z');

// US English
new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(date);
// "March 4, 2026"

// German
new Intl.DateTimeFormat('de-DE', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(date);
// "4. M\u00E4rz 2026"

// Japanese
new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(date);
// "2026\u5E743\u67084\u65E5"
\`\`\`

### Timezone Handling

Timezone bugs are among the hardest i18n issues to reproduce and test. A timestamp stored as UTC and displayed in the user's local time can shift the date entirely -- an event at 11 PM UTC on March 4th is March 5th in Tokyo.

\`\`\`typescript
// Testing timezone-sensitive displays
const timestamp = '2026-03-04T23:30:00Z';

// New York (UTC-5)
new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  dateStyle: 'full',
  timeStyle: 'long',
}).format(new Date(timestamp));
// "Wednesday, March 4, 2026 at 6:30:00 PM EST"

// Tokyo (UTC+9)
new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  dateStyle: 'full',
  timeStyle: 'long',
}).format(new Date(timestamp));
// "2026\u5E743\u67085\u65E5\u6728\u66DC\u65E5 8:30:00 JST"
\`\`\`

Notice how the same UTC timestamp renders as March 4th in New York but March 5th in Tokyo. Your tests must cover these boundary cases.

### Currency Formatting

Currency formatting varies in symbol, position, and number format:

\`\`\`typescript
const amount = 1234567.89;

// US Dollar
new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(amount);
// "\$1,234,567.89"

// Euro (German locale)
new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
}).format(amount);
// "1.234.567,89\u00A0\u20AC"

// Japanese Yen (no decimals)
new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
}).format(amount);
// "\uFFE51,234,568"

// Indian Rupee (lakh/crore grouping)
new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
}).format(amount);
// "\u20B912,34,567.89"
\`\`\`

### Number Separators

The decimal separator and thousands grouping separator are swapped between many locales. This is not cosmetic -- it changes the meaning of the number:

| Locale | One Million and a Half | Thousands Separator | Decimal Separator |
|--------|----------------------|--------------------|--------------------|
| en-US | 1,000,000.50 | Comma | Period |
| de-DE | 1.000.000,50 | Period | Comma |
| fr-FR | 1 000 000,50 | Non-breaking space | Comma |
| en-IN | 10,00,000.50 | Comma (lakh grouping) | Period |

**Test strategy:** For each supported locale, create test fixtures that format known values and assert the output matches the expected locale-specific format. Run these tests as part of your unit test suite to catch regressions immediately.

---

## RTL Layout Testing

Right-to-left (RTL) languages -- Arabic, Hebrew, Urdu, Farsi, and others -- require that the entire UI layout be mirrored. **RTL testing** is not simply about text direction; it involves navigation order, icon placement, animations, and interactive elements.

### What Changes in RTL

When you switch from an LTR to an RTL locale, the following should mirror:

- **Text alignment** flips from left to right
- **Navigation** flows from right to left (sidebar on the right, back buttons on the right)
- **Icons with directional meaning** (arrows, progress indicators) must mirror
- **Margins and padding** swap sides
- **Scroll direction** remains unchanged (scrollbars stay on the right in most implementations)
- **Numbers, phone numbers, and code** remain LTR even within RTL text (bidirectional text)

### CSS Logical Properties

The single most impactful architectural decision for RTL support is using CSS logical properties instead of physical properties:

\`\`\`css
/* Physical properties -- break in RTL */
.card {
  margin-left: 16px;
  padding-right: 24px;
  text-align: left;
  border-left: 2px solid blue;
}

/* Logical properties -- work in both LTR and RTL */
.card {
  margin-inline-start: 16px;
  padding-inline-end: 24px;
  text-align: start;
  border-inline-start: 2px solid blue;
}
\`\`\`

| Physical Property | Logical Property |
|---|---|
| \`margin-left\` | \`margin-inline-start\` |
| \`margin-right\` | \`margin-inline-end\` |
| \`padding-left\` | \`padding-inline-start\` |
| \`padding-right\` | \`padding-inline-end\` |
| \`text-align: left\` | \`text-align: start\` |
| \`float: left\` | \`float: inline-start\` |
| \`border-left\` | \`border-inline-start\` |
| \`left: 0\` | \`inset-inline-start: 0\` |

### Playwright RTL Testing

You can automate RTL layout validation with Playwright by setting the HTML \`dir\` attribute and taking visual snapshots:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('RTL layout tests', () => {
  test('navigation mirrors in Arabic locale', async ({ page }) => {
    // Set RTL direction
    await page.goto('/');
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    });

    // Verify sidebar is on the right side
    const sidebar = page.locator('[data-testid="sidebar"]');
    const box = await sidebar.boundingBox();
    const viewport = page.viewportSize();
    expect(box.x).toBeGreaterThan(viewport.width / 2);

    // Visual snapshot for RTL regression
    await expect(page).toHaveScreenshot('homepage-rtl.png');
  });

  test('bidirectional text renders correctly', async ({ page }) => {
    await page.goto('/profile');
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
    });

    // Verify that embedded LTR content (emails, URLs) is still LTR
    const emailField = page.locator('[data-testid="email-display"]');
    const computedDir = await emailField.evaluate(
      (el) => getComputedStyle(el).direction
    );
    expect(computedDir).toBe('ltr');
  });
});
\`\`\`

### Visual Regression for RTL

Automated visual regression testing is particularly valuable for RTL because layout mirroring issues are visual by nature -- they are difficult to catch with DOM assertions alone. Capture baseline screenshots in both LTR and RTL modes and compare on every pull request.

\`\`\`typescript
const locales = [
  { lang: 'en', dir: 'ltr' },
  { lang: 'ar', dir: 'rtl' },
  { lang: 'he', dir: 'rtl' },
];

for (const locale of locales) {
  test(\`visual regression - \${locale.lang}\`, async ({ page }) => {
    await page.goto('/dashboard');
    await page.evaluate(
      ({ lang, dir }) => {
        document.documentElement.setAttribute('dir', dir);
        document.documentElement.setAttribute('lang', lang);
      },
      locale
    );
    await expect(page).toHaveScreenshot(
      \`dashboard-\${locale.lang}.png\`
    );
  });
}
\`\`\`

---

## Translation Testing

Even with a perfectly internationalized codebase, **localization testing** can fail at the translation layer. Missing translations, incorrect context, and inadequate handling of pluralization rules are common issues.

### Missing Translations

The most basic l10n bug is a missing translation key. When a key has no translation for a given locale, the application typically falls back to the default language (usually English) or displays the raw key string. Both outcomes are bad -- one creates a jarring mixed-language experience, the other displays gibberish.

**Detection strategy:** Export your full set of translation keys and compare across all supported locales. Any key present in the default locale but missing in a target locale is a gap. This can be automated in CI:

\`\`\`bash
# Compare English keys against French keys
diff <(jq -r 'paths | join(".")' locales/en.json | sort) \\
     <(jq -r 'paths | join(".")' locales/fr.json | sort)
\`\`\`

### Translation String Length Expansion

When English text is translated, it almost always gets longer. The expansion factor varies by target language:

| Target Language | Typical Expansion | Example |
|----------------|-------------------|---------|
| German | 30-35% | "Save" becomes "Speichern" |
| Finnish | 30-40% | "Search" becomes "Hae" (shorter!) or "Hakutulokset" (longer for "Search results") |
| French | 15-20% | "Settings" becomes "Param\u00E8tres" |
| Japanese | -10 to +10% | Often comparable or shorter in characters but wider in pixels |
| Arabic | 20-25% | Variable, plus RTL layout shift |

Buttons, navigation tabs, table headers, and modal titles are the UI elements most commonly broken by translation expansion. A button that fits "Submit" will not fit "Absenden best\u00E4tigen."

### Pluralization Rules

English has two plural forms: singular and plural. Many languages have more complex rules. Polish has four forms. Arabic has six. Russian has three. The ICU MessageFormat standard handles this:

\`\`\`
// English: 2 forms
{count, plural, one {# item} other {# items}}

// Polish: 4 forms
{count, plural,
  one {# element}
  few {# elementy}
  many {# element\u00F3w}
  other {# elementu}
}

// Arabic: 6 forms
{count, plural,
  zero {\u0644\u0627 \u0639\u0646\u0627\u0635\u0631}
  one {\u0639\u0646\u0635\u0631 \u0648\u0627\u062D\u062F}
  two {\u0639\u0646\u0635\u0631\u0627\u0646}
  few {# \u0639\u0646\u0627\u0635\u0631}
  many {# \u0639\u0646\u0635\u0631\u064B\u0627}
  other {# \u0639\u0646\u0635\u0631}
}
\`\`\`

**Test with representative count values:** 0, 1, 2, 5, 12, 21, 100, 101. These values trigger different plural forms across most languages.

### Context-Dependent Translations

The same English word can require different translations depending on context. "Post" as a noun (a blog post) and "Post" as a verb (to post a comment) are different words in many languages. Translation keys should include context hints:

\`\`\`json
{
  "post.noun": "Beitrag",
  "post.verb": "Ver\u00F6ffentlichen",
  "save.action": "Speichern",
  "save.noun": "Ersparnis"
}
\`\`\`

---

## Character Encoding and Unicode

Character encoding issues are among the most destructive i18n bugs because they corrupt data silently. A user's name stored with the wrong encoding becomes garbled text (\`MÃ¼ller\` instead of \`M\u00FCller\`), and once data is corrupted, it is extremely difficult to recover.

### UTF-8 Everywhere

The single most important encoding rule is: **use UTF-8 for everything**. This means:

- **Database**: Ensure your database and every column uses UTF-8 encoding (or \`utf8mb4\` in MySQL, which supports the full Unicode range including emoji)
- **API responses**: Set \`Content-Type: application/json; charset=utf-8\` headers
- **HTML**: Include \`<meta charset="UTF-8">\` in the document head
- **File storage**: Save source files and translation files as UTF-8 without BOM
- **HTTP requests**: Ensure form submissions and API requests use UTF-8 encoding

### Testing with Diverse Character Sets

Your i18n test suite should include input and display tests with characters from multiple scripts:

| Script | Test Characters | Common Issues |
|--------|----------------|---------------|
| Latin Extended | \u00E9, \u00FC, \u00F1, \u00E7, \u00E5, \u00F8, \u00DF | Broken by ASCII-only validation |
| CJK (Chinese, Japanese, Korean) | \u4F60\u597D, \u3053\u3093\u306B\u3061\u306F, \uC548\uB155 | Double-width characters break fixed-width layouts |
| Arabic | \u0645\u0631\u062D\u0628\u0627 | RTL direction, connecting letters |
| Cyrillic | \u041F\u0440\u0438\u0432\u0435\u0442 | Looks like Latin but different codepoints |
| Devanagari | \u0928\u092E\u0938\u094D\u0924\u0947 | Complex ligatures and combining marks |
| Emoji | \uD83D\uDE80\uD83C\uDF0D\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66 | Multi-byte sequences, ZWJ sequences, varies by platform |

### Database and API Encoding Validation

Write explicit tests that round-trip special characters through your entire stack:

\`\`\`typescript
test('Unicode round-trip through API and database', async () => {
  const testNames = [
    'M\u00FCller',           // German umlaut
    '\u5C71\u7530\u592A\u90CE',           // Japanese Kanji
    '\u0645\u062D\u0645\u062F',            // Arabic
    'O\\'Brien',         // Apostrophe
    '\uD83D\uDE80 Rocket User', // Emoji
    'Caf\u00E9',             // Accented Latin
  ];

  for (const name of testNames) {
    const response = await api.createUser({ name });
    const fetched = await api.getUser(response.id);
    expect(fetched.name).toBe(name);
  }
});
\`\`\`

### String Length vs. Character Count

Be aware that string length in JavaScript counts UTF-16 code units, not visible characters. An emoji like \uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66 (family emoji) has a \`.length\` of 11 but displays as one character. Use \`Intl.Segmenter\` for accurate grapheme counting:

\`\`\`typescript
const text = '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66';

// Wrong: counts UTF-16 code units
text.length; // 11

// Correct: counts grapheme clusters
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
[...segmenter.segment(text)].length; // 1
\`\`\`

---

## Pseudo-Localization

**Pseudo-localization** is a development technique that replaces English strings with accented or visually modified versions to expose i18n issues without needing real translations. It is one of the most cost-effective i18n testing strategies because it catches problems early, during development, before translators are even involved.

### What Pseudo-Localization Looks Like

A pseudo-localized string transforms "Settings" into something like "\u015C\u00E9\u0163\u0163\u00EF\u00F1\u011F\u015F" or "[!!_\u015C\u00E9\u0163\u0163\u00EF\u00F1\u011F\u015F_!!]". The transformation typically includes:

- **Accented characters** replacing ASCII letters to test Unicode rendering (a becomes \u00E0, e becomes \u00E9)
- **String expansion** adding extra characters (padding with underscores or brackets) to simulate translation expansion
- **Bookending** with markers like \`[!!\` and \`!!]\` to make truncation visible -- if you cannot see the end markers, the string is being cut off
- **Right-to-left markers** optionally embedded to test bidirectional text handling

### Pseudo-Localization Implementation

Many i18n libraries support pseudo-localization out of the box. Here is a simple implementation:

\`\`\`typescript
const PSEUDO_MAP: Record<string, string> = {
  a: '\u00E0', b: '\u0183', c: '\u00E7', d: '\u010F', e: '\u00E9',
  f: '\u0192', g: '\u011F', h: '\u0125', i: '\u00EF', j: '\u0135',
  k: '\u0137', l: '\u013C', m: '\u1E3F', n: '\u00F1', o: '\u00F6',
  p: '\u00FE', q: '\u01A3', r: '\u0155', s: '\u0161', t: '\u0163',
  u: '\u00FC', v: '\u1E7D', w: '\u0175', x: '\u0445', y: '\u00FD',
  z: '\u017E',
};

function pseudoLocalize(text: string): string {
  const accented = text
    .split('')
    .map((char) => PSEUDO_MAP[char.toLowerCase()] || char)
    .join('');

  // Add ~35% expansion padding
  const padding = '~'.repeat(Math.ceil(text.length * 0.35));
  return \`[!! \${accented}\${padding} !!]\`;
}

pseudoLocalize('Settings');
// "[!! \u0161\u00E9\u0163\u0163\u00EF\u00F1\u011F\u0161~~~ !!]"
\`\`\`

### Integrating Pseudo-Localization into Development

The most effective approach is to make pseudo-localization a locale option that developers can toggle during local development:

1. **Add a pseudo locale** (e.g., \`en-XA\` for pseudo-accented, \`ar-XB\` for pseudo-RTL) to your locale configuration
2. **Configure your i18n library** to use the pseudo-localization transform when the pseudo locale is active
3. **Add a locale switcher** to your development UI so developers can toggle between English and pseudo-localized views
4. **Run visual regression tests** in pseudo-locale mode to catch expansion and truncation issues before real translations arrive

Libraries like \`@formatjs/cli\` include built-in pseudo-localization transforms. React Intl, i18next, and vue-i18n all support custom formatters that can apply pseudo-localization.

### What Pseudo-Localization Catches

| Issue | How Pseudo-Localization Reveals It |
|-------|-----------------------------------|
| Hardcoded strings | Appear as un-transformed English amid pseudo text |
| Text truncation | End markers \`!!]\` are cut off |
| Layout overflow | Expanded text breaks containers |
| Unicode rendering | Accented characters fail to display |
| Concatenation bugs | Pseudo text appears fragmented |
| Missing translations | English keys visible without transformation |

---

## CI/CD Integration

Internationalization testing should be automated and integrated into your CI/CD pipeline so that i18n regressions are caught on every pull request, not during manual QA cycles weeks later. For a deeper dive on CI/CD testing pipelines, see our [CI/CD pipeline guide](/blog/cicd-testing-pipeline-github-actions).

### Automated i18n Checks

Add these checks to your CI pipeline:

**1. Missing Translation Keys**

Compare translation files across locales and fail the build if any key is present in the source locale but missing in a target locale:

\`\`\`yaml
# GitHub Actions example
- name: Check translation completeness
  run: |
    node scripts/check-translations.js --source en --targets fr,de,ja,ar
    # Exits with non-zero if missing keys found
\`\`\`

**2. Hardcoded String Detection**

Use ESLint rules to flag user-facing strings that are not wrapped in translation functions:

\`\`\`json
{
  "rules": {
    "i18next/no-literal-string": ["error", {
      "ignore": ["data-testid", "className", "key"],
      "ignoreCallee": ["console.log", "console.error"]
    }]
  }
}
\`\`\`

**3. Pseudo-Localization Visual Tests**

Run your visual regression suite with pseudo-localization enabled to catch text expansion and truncation:

\`\`\`yaml
- name: Visual regression (pseudo-locale)
  run: |
    LOCALE=en-XA npx playwright test --project=visual
\`\`\`

### Locale Matrix Testing

Run your full test suite across multiple locales using CI matrix builds:

\`\`\`yaml
strategy:
  matrix:
    locale: [en-US, de-DE, ja-JP, ar-SA, fr-FR, zh-CN]
steps:
  - name: Run tests for \${{ matrix.locale }}
    run: LOCALE=\${{ matrix.locale }} npx playwright test
    env:
      TEST_LOCALE: \${{ matrix.locale }}
\`\`\`

This approach runs your entire E2E suite in each locale, catching locale-specific rendering and functional bugs. The trade-off is increased CI time, so you may choose to run the full matrix on main branch merges and a subset (e.g., en-US, ar-SA, ja-JP) on pull requests.

### Visual Regression for Locale Variants

Capture baseline screenshots for every supported locale and compare on each build. This catches:

- **RTL layout breakage** in Arabic and Hebrew
- **Text overflow** from translation expansion in German and Finnish
- **Font rendering issues** with CJK characters
- **Locale-specific component differences** (date pickers, number inputs)

---

## Automate i18n Testing with AI Agents

Manual internationalization testing across multiple locales is time-consuming and error-prone. AI coding agents equipped with specialized QA skills can automate the most tedious parts of **i18n testing** and catch locale bugs that generic testing misses entirely.

### Install i18n Testing Skills

QA Skills offers specialized skills designed for internationalization and localization testing:

\`\`\`bash
# Find and fix localization bugs -- hardcoded strings, locale-specific
# formatting, missing translations, and l10n antipatterns
npx @qaskills/cli add localization-bug-finder

# Detect timezone-related bugs -- UTC conversion errors, DST handling,
# timezone-dependent display logic, and cross-timezone data integrity
npx @qaskills/cli add timezone-bug-hunter
\`\`\`

These skills teach your AI coding agent to:

- **Scan for hardcoded strings** and suggest externalization to translation files
- **Identify date/number formatting antipatterns** like manual string concatenation instead of \`Intl\` API usage
- **Detect timezone handling bugs** including UTC conversion errors, DST boundary issues, and timezone-dependent business logic
- **Flag CSS physical properties** that will break in RTL layouts and suggest logical property replacements

### Complementary Skills for i18n Testing

For comprehensive locale testing, combine the i18n-specific skills with these related skills:

\`\`\`bash
# Visual regression testing -- catch layout breakage from
# translation expansion and RTL mirroring
npx @qaskills/cli add visual-regression

# Responsive layout testing -- verify that translated content
# works across all viewport sizes
npx @qaskills/cli add responsive-layout-breaker
\`\`\`

Browse the full catalog of 95+ QA testing skills at [qaskills.sh/skills](/skills), or get started with the [installation guide](/getting-started).

### What AI Agents Catch That Manual Testing Misses

AI coding agents with i18n skills are particularly effective at:

- **Exhaustive scanning**: Reviewing every file in a codebase for hardcoded strings, something impractical for manual review on large projects
- **Pattern recognition**: Identifying locale-sensitive code patterns (date formatting, string concatenation, CSS physical properties) across diverse codebases
- **Consistency enforcement**: Ensuring that every new feature follows i18n best practices before it is merged
- **Regression prevention**: Checking that previously fixed i18n issues do not reappear in new code

---

## Frequently Asked Questions

### What is the difference between internationalization testing and localization testing?

**Internationalization testing** (i18n testing) validates that your application's code architecture correctly supports multiple locales -- that strings are externalized, formatting uses locale-aware APIs, layouts support bidirectional text, and Unicode is handled properly throughout the stack. It tests the foundation. **Localization testing** (l10n testing) validates that a specific locale works correctly -- that French translations are accurate and complete, that German text does not overflow UI elements, and that Arabic layouts are properly mirrored. i18n testing happens during development; l10n testing happens after translations and locale-specific content are applied.

### How do you test RTL layouts automatically?

The most effective automated approach combines **Playwright or Cypress E2E tests** that set the HTML \`dir="rtl"\` attribute with **visual regression snapshots**. Set the document direction to RTL, navigate to key pages, and capture screenshots for comparison against baselines. For functional RTL testing, write assertions that verify element positions (e.g., sidebar should be on the right side of the viewport) and that directional icons are mirrored. Run these tests in your CI pipeline with a locale matrix that includes at least one RTL locale (Arabic or Hebrew).

### What is pseudo-localization and why should I use it?

Pseudo-localization replaces English strings with accented or expanded versions (e.g., "Settings" becomes "[!! \u0161\u00E9\u0163\u0163\u00EF\u00F1\u011F\u0161~~~ !!]") to reveal i18n issues without real translations. It catches hardcoded strings (they stay in plain English), text truncation (end markers get cut off), layout overflow (expanded text breaks containers), and Unicode rendering problems. The key advantage is timing: you can find and fix i18n issues during development, before translations arrive, when fixes are cheapest.

### How many locales should I test in CI?

At minimum, test three representative locales: **one LTR Latin-script language** (English or French), **one RTL language** (Arabic or Hebrew), and **one CJK language** (Japanese, Chinese, or Korean). This covers the major layout directions and character set categories. If your application supports specific high-priority markets, add those locales. Run the full locale matrix on main branch builds and a subset on pull requests to balance coverage with CI speed.

### How do I handle plural rules across languages?

Use the **ICU MessageFormat** standard (supported by libraries like FormatJS, i18next, and vue-i18n) instead of building conditional logic manually. ICU MessageFormat defines plural categories (\`zero\`, \`one\`, \`two\`, \`few\`, \`many\`, \`other\`) that each language maps to specific number ranges. English uses only \`one\` and \`other\`. Arabic uses all six categories. Polish uses \`one\`, \`few\`, \`many\`, and \`other\`. Your translation files should include all required plural forms for each target language, and your i18n tests should verify rendering with representative count values (0, 1, 2, 5, 12, 21, 100) that trigger different plural categories.
`,
};
