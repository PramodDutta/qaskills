import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Localization Testing Checklist Guide',
  description:
    'Use this localization testing checklist to validate translations, layout expansion, locale formats, fallback behavior, and regional release risk.',
  date: '2026-07-10',
  category: 'Reference',
  content: `
# Localization Testing Checklist Guide

The German checkout button is two words longer than the English design allowed. The Arabic settings page mirrors most of the layout, except one icon still points the wrong way. A Japanese legal string fits on desktop but wraps into the price on mobile. Localization testing lives in details like these, where the application is technically translated but not yet safe to ship.

This checklist is written for QA leads, SDETs, and release owners who need practical coverage for localized web and mobile products. It covers text, layout, locale formatting, input behavior, fallback rules, search, analytics, and release signoff. It does not assume that QA owns translation quality alone. Localization is shared work across product, design, engineering, translators, legal, support, and regional stakeholders.

Use this checklist alongside your broader [internationalization testing strategy](/blog/internationalization-testing-i18n-guide). For general release hygiene around web surfaces, connect it with the [web testing checklist](/blog/web-testing-checklist-2026).

## Translation Coverage and String Integrity

Start by proving every user-visible string is localizable and every shipped locale has the expected resource coverage. This is the part teams often automate first because missing keys are cheap to detect and embarrassing to release.

| Check | What to inspect | Automation fit | Release risk |
| --- | --- | --- | --- |
| Missing keys | Locale files compared against source language | High | Raw keys such as \`checkout.pay_now\` appear in production |
| Empty values | Strings present but blank or whitespace | High | Buttons, labels, and validation messages disappear |
| Placeholder mismatch | Variables such as \`{count}\`, \`{name}\`, or ICU tokens | High | Runtime formatting errors or misleading messages |
| Stale translations | Source string changed after translation | Medium | Old legal, pricing, or workflow language persists |
| Hard-coded text | Strings outside localization resources | Medium | English leaks into non-English UI |

Do not treat translation coverage as the full localization test. It only says resources exist. It does not say the screen works.

## Automated Locale File Checks

A simple script can catch missing keys and placeholder mismatches before a build reaches QA. The example below assumes JSON translation files with the same nested key structure.

\`\`\`ts
// scripts/check-locales.ts
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

type Messages = Record<string, string | Messages>;

const localesDir = path.join(process.cwd(), 'src', 'locales');
const source = readJson(path.join(localesDir, 'en.json'));
const localeFiles = fs.readdirSync(localesDir).filter((file) => file.endsWith('.json'));

for (const file of localeFiles) {
  const current = readJson(path.join(localesDir, file));
  const problems = compareMessages(source, current);

  assert.equal(
    problems.length,
    0,
    \`Locale \${file} has problems:\\n\${problems.map((problem) => \`- \${problem}\`).join('\\n')}\`,
  );
}

function readJson(filePath: string): Messages {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Messages;
}

function compareMessages(sourceNode: Messages, targetNode: Messages, prefix = ''): string[] {
  const problems: string[] = [];

  for (const [key, value] of Object.entries(sourceNode)) {
    const fullKey = prefix ? \`\${prefix}.\${key}\` : key;
    const translated = targetNode[key];

    if (translated === undefined) {
      problems.push(\`missing key \${fullKey}\`);
      continue;
    }

    if (typeof value === 'string') {
      if (typeof translated !== 'string' || translated.trim() === '') {
        problems.push(\`empty or non-string value for \${fullKey}\`);
        continue;
      }

      const expectedPlaceholders = placeholders(value);
      const actualPlaceholders = placeholders(translated);

      if (expectedPlaceholders.join(',') !== actualPlaceholders.join(',')) {
        problems.push(\`placeholder mismatch for \${fullKey}\`);
      }
    } else if (typeof translated === 'object' && translated !== null) {
      problems.push(...compareMessages(value, translated as Messages, fullKey));
    } else {
      problems.push(\`nested object expected for \${fullKey}\`);
    }
  }

  return problems;
}

function placeholders(message: string): string[] {
  return Array.from(message.matchAll(/\\{\\s*([a-zA-Z0-9_]+)[^}]*\\}/g))
    .map((match) => match[1])
    .sort();
}
\`\`\`

This script is intentionally conservative. It does not judge translation quality. It makes sure the application can render messages without missing variables or empty labels.

## Layout Expansion and Text Density

English is a poor sizing baseline. German, Finnish, Russian, and many other languages can expand significantly. Chinese and Japanese may be compact but require different line breaking. Arabic and Hebrew require right-to-left layout behavior. A localization checklist must inspect layout under real translated strings, not only pseudo-localization.

Focus on components that have fixed space or high business impact:

- Primary buttons and segmented controls.
- Navigation tabs and breadcrumbs.
- Checkout summaries and pricing rows.
- Form labels, helper text, and validation errors.
- Toasts, dialogs, and confirmation screens.
- Data tables with translated headers.
- Mobile bottom navigation.
- Emails, PDFs, invoices, and receipts.

| UI surface | Failure to look for | Suggested test data |
| --- | --- | --- |
| Button rows | Text truncates, overlaps icons, or wraps unevenly | Long German and French action labels |
| RTL pages | Directional icons, padding, and alignment remain LTR | Arabic or Hebrew locale with mirrored navigation |
| Tables | Header text forces columns too wide or hides values | Translated headers plus long customer names |
| Mobile forms | Labels push inputs below the fold or cover errors | Spanish and German validation strings |
| Transactional email | Subject or CTA breaks in common clients | Real localized templates sent to test inboxes |

Do not approve a locale after checking only the home page. Many localization defects hide in error states because those strings are longer and less frequently reviewed.

## Pseudo-Localization Before Translation Arrives

Pseudo-localization is a preflight technique. It transforms source strings to simulate expansion and non-ASCII characters before human translations are ready. It catches hard-coded strings and fragile layout early.

\`\`\`ts
// src/i18n/pseudo.ts
const accentMap: Record<string, string> = {
  a: 'à',
  e: 'ē',
  i: 'ī',
  o: 'ō',
  u: 'ū',
  A: 'À',
  E: 'Ē',
  I: 'Ī',
  O: 'Ō',
  U: 'Ū',
};

export function pseudoLocalize(message: string): string {
  return \`[!! \${message
    .replace(/[aeiouAEIOU]/g, (char) => accentMap[char] ?? char)
    .replace(/\\{[^}]+\\}/g, (placeholder) => placeholder)} !!]\`;
}
\`\`\`

\`\`\`ts
// src/i18n/pseudo.test.ts
import { describe, expect, it } from 'vitest';
import { pseudoLocalize } from './pseudo';

describe('pseudoLocalize', () => {
  it('expands visible text while preserving ICU-style placeholders', () => {
    const result = pseudoLocalize('Pay {amount} now');

    expect(result).toContain('{amount}');
    expect(result).toContain('Pày');
    expect(result.length).toBeGreaterThan('Pay {amount} now'.length);
  });
});
\`\`\`

Pseudo-localization should not replace real locale testing. It is an early warning system that lets engineers fix layout resilience before translators finish the first pass.

## Locale Formatting: Numbers, Dates, Currency, Units

Regional correctness is not only language. Users expect dates, numbers, currency, measurement units, phone numbers, names, and addresses to match local conventions. The riskiest screens are checkout, billing, booking, compliance, scheduling, and reporting.

Check these behaviors with real locale settings:

- \`1,234.56\` versus \`1.234,56\`.
- Currency symbol placement and currency code visibility.
- 12-hour versus 24-hour time.
- Week start day in calendars.
- Time zone conversion around midnight and daylight saving changes.
- Postal code validation by country.
- Address line order and required fields.
- Name fields that do not assume first plus last.
- Plural rules for zero, one, few, many, and other.

Use platform APIs such as \`Intl.NumberFormat\` and \`Intl.DateTimeFormat\` where possible. Avoid building custom formatting logic unless the domain requires it.

\`\`\`ts
// src/formatters.test.ts
import { describe, expect, it } from 'vitest';

describe('localized currency formatting', () => {
  it('formats EUR for Germany with comma decimal separator', () => {
    const value = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(1234.56);

    expect(value).toContain('1.234,56');
    expect(value).toContain('€');
  });

  it('formats USD for the United States with dollar prefix', () => {
    const value = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(1234.56);

    expect(value).toBe('$1,234.56');
  });
});
\`\`\`

These tests validate your use of the platform API and protect against accidental locale overrides.

## Input, Search, and Sorting Behavior

Localized products often fail at input boundaries. The UI displays translated text, but search assumes ASCII. Sorting looks correct in English but odd in Swedish. Validation rejects names with accents. File exports lose characters. QA should exercise real data, not only translated chrome.

Add locale-specific data sets for:

- Names with accents, apostrophes, spaces, and non-Latin scripts.
- Addresses from countries with different postal code rules.
- Search terms in the target language.
- Product names with diacritics.
- Right-to-left user-generated content mixed with numbers.
- CSV exports opened in expected spreadsheet tools.
- PDF invoices with translated labels and customer data.

For sorting, use locale-aware comparison such as \`Intl.Collator\` in application code where the order is user-visible. Tests should assert representative order in target locales rather than relying on Unicode code point order.

## Fallback and Missing Translation Behavior

Every localized system needs a fallback policy. When a translation is missing, should the app show English, hide the feature, block the build, or show a neutral fallback? The correct answer differs by product area. A missing marketing subtitle may be acceptable for a staging preview. A missing medication instruction or payment disclosure is not.

Document fallback by severity:

| Missing content type | Acceptable fallback | Build behavior |
| --- | --- | --- |
| Decorative marketing copy | Source language in non-production preview | Warn |
| Navigation and primary actions | Source language only during active translation window | Fail before release |
| Legal, consent, payment, safety text | No runtime fallback without owner approval | Block release |
| Error messages | Source language may be acceptable short term with tracking | Fail for committed locale launch |

In production, raw keys should be treated as defects. They signal that the localization layer is leaking implementation details to users.

## Accessibility in Localized Screens

Accessibility checks need to run per locale for high-risk flows. Translated labels change accessible names. RTL layout changes focus expectations. Error messages may be longer and need proper association with fields. Screen reader pronunciation varies by language tag.

Check that:

- The page or app root sets the correct \`lang\` and \`dir\`.
- Form controls retain accessible names after translation.
- Error summaries link to localized field labels.
- Focus order remains logical in RTL.
- Icon-only buttons have localized accessible names.
- Captions, transcripts, and alt text are translated where required.

Automated accessibility tools catch structural issues, but native speaker review is still needed for meaningful alt text, tone, and clarity.

## Release Signoff by Locale

A localization release should not have one generic pass or fail. Track status by locale and by critical flow. A French locale may be ready while Japanese legal review is blocked. A Spanish mobile layout issue may not affect desktop. Make the release decision explicit.

Use a simple matrix:

- Locale.
- Owner.
- Translation status.
- Automated checks.
- Visual smoke.
- Critical flows.
- Legal or regional approval.
- Known issues.
- Ship decision.

When a locale is delayed, hide or disable it deliberately. Do not leave it half discoverable through URL parameters, browser settings, or cached preferences.

## Visual Regression for Localized Layouts

Visual regression is useful for localization when it is scoped carefully. Do not snapshot every page in every locale on every pull request unless your team can afford the review load. Instead, select screens where text expansion, RTL mirroring, or regional data can damage the workflow.

Good candidates include:

- Checkout review with translated shipping and tax labels.
- Account settings with long form labels.
- Navigation at mobile width.
- Pricing pages with localized currency.
- Error-heavy forms.
- PDF or email previews.

Keep baselines per locale and viewport. A German desktop baseline should not be compared to an English mobile baseline. Use stable test data, deterministic dates, and controlled feature flags. If translation text changes frequently, expect visual diffs and route them to the right reviewer instead of treating every diff as a code defect.

## Native Speaker Review and QA Boundaries

Automation can say a string exists, a placeholder is present, and the layout does not overlap. It cannot reliably say the tone is correct for a Japanese enterprise customer or that a Spanish error message sounds natural. Include native speaker or professional linguistic review for launch locales, especially around payment, legal, health, safety, onboarding, and cancellation flows.

QA should make that review actionable. Provide reviewers with screenshots, URLs, locale, device, account state, and the exact string key when possible. A comment that says "translation wrong" is hard to route. A comment that says "\`checkout.payment.decline_message\` is too literal in es-MX on mobile confirmation retry" can be fixed.

## Locale-Aware Test Data

Many teams translate the UI but keep English-only test data. That hides bugs in search, sorting, exports, and display. Add locale-aware data fixtures:

- French customer names with accents.
- German company names with long compound words.
- Japanese product names.
- Arabic notes mixed with numbers.
- Addresses from supported countries.
- Phone numbers with country codes.
- Postal codes that exercise validation rules.

Use the same data in API, UI, export, and email tests where possible. If a Japanese product name displays correctly in the web UI but becomes mojibake in a CSV export, the defect is still part of localization quality.

## Operational Checklist Before Launching a New Locale

Before enabling a locale for users, require evidence rather than optimism:

| Evidence | Owner | Pass condition |
| --- | --- | --- |
| Translation completeness report | Localization manager | No missing required strings |
| Pseudo-localization smoke history | Engineering | No hard-coded text in critical flows |
| Visual review | QA | No blocking layout overlap or truncation |
| Linguistic review | Native reviewer | Approved critical user journeys |
| Regional formatting tests | SDET | Dates, numbers, currency, and address rules pass |
| Support readiness | Support lead | Macros and help content exist for launch scope |

This does not need to be heavyweight. It needs to be visible. Locale launches fail when everyone assumes someone else checked the regional details.

## Emails, PDFs, and Offline Documents

Localized products often test the web screens and forget generated artifacts. Receipts, invoices, account statements, password reset emails, export files, and downloadable PDFs may use separate templates and rendering engines. They also tend to contain legal, tax, or payment language, which raises the cost of mistakes.

Add artifact checks for launch locales:

- Subject lines and preview text in emails.
- CTA labels and unsubscribe text.
- PDF page breaks with long translated labels.
- Currency, tax id, and address formatting on invoices.
- Character encoding in CSV exports.
- Attachment filenames with non-ASCII characters where supported.

Render artifacts in CI when possible, then sample them manually for high-risk locales. A web page can be fixed quickly. A wrong invoice sent to customers becomes a support and compliance problem.

## Locale Negotiation and User Preferences

Applications choose locale from browser headers, account settings, URL paths, cookies, workspace defaults, or regional domains. Test the precedence order. A user who selected French in account settings should not be forced back to English because the browser sends \`en-US\`. A shared workspace may have a default locale that differs from a member's personal preference.

Checklist for negotiation:

- New anonymous visitor gets the expected default.
- Browser language is respected only when product policy allows it.
- Logged-in user preference overrides browser preference.
- URL locale segment overrides temporary preview behavior.
- Unsupported locales fall back to the documented language.
- Changing locale does not reset cart, form, or session state unless explicitly designed.

Locale choice is part of user trust. Unexpected language switches make users think they are in the wrong account or wrong region.

## Defect Triage for Localization Bugs

Classify localization bugs by ownership so they move quickly:

| Bug type | Likely owner | Example |
| --- | --- | --- |
| Missing key | Engineering | Raw key appears in settings page |
| Bad translation | Localization vendor or reviewer | Phrase uses wrong legal term |
| Layout break | Design and frontend | German button overlaps icon |
| Regional rule | Product and backend | Postal code validation rejects valid Canadian code |
| Encoding issue | Platform or export owner | CSV corrupts Japanese characters |

This classification prevents every issue from being dumped on translators. Many localization bugs are engineering bugs with translated text as the trigger.

## Search Engine and Public Page Considerations

For public sites, localization testing should include canonical URLs, hreflang tags, translated metadata, and localized slugs if the product uses them. A page can render correctly for users and still confuse search engines or social previews. QA should verify title tags, descriptions, Open Graph text, and language alternates for launch locales.

Do not let SEO metadata lag behind UI translation. A Spanish pricing page with English title metadata looks unfinished in search results. A wrong canonical can cause localized pages to compete with each other. These checks are small, but they protect discoverability for regional launches.

## Customer Support Feedback Loop

After launch, support tickets are a valuable localization signal. Tag tickets by locale and defect type: unclear translation, broken layout, bad regional rule, or missing content. Feed that back into the checklist. If three tickets mention address validation in Brazil, add a Brazilian address fixture. Localization quality improves when production feedback becomes regression coverage, not just a one-time translation fix.

## Feature Flags and Partial Locale Rollouts

Many teams launch a locale behind a feature flag or only for selected accounts. Test both visibility and exclusion. A disabled locale should not appear in selectors, sitemap output, marketing links, or account preferences. An enabled beta user should keep the locale across login, checkout, email, and support flows. Partial rollout bugs are common because navigation, backend email jobs, and public pages often read different flag sources and cache decisions at different times across services and background workers. Include rollback checks for the same reason.

## Frequently Asked Questions

### Is localization testing the same as translation review?

No. Translation review checks language quality. Localization testing checks whether the translated and regionalized product works: layout, formatting, input, fallback, accessibility, and workflows.

### Which locales should QA test first?

Start with revenue or launch locales, then add stress locales: one long-text language, one right-to-left language, one compact East Asian language, and one locale with different date, number, or address conventions.

### Can pseudo-localization replace testing real translations?

No. Pseudo-localization is useful before translations arrive because it exposes hard-coded strings and layout fragility. Real locale testing is still required for language, regional formats, and user meaning.

### Should missing translations block a release?

It depends on content type. Missing legal, payment, consent, safety, navigation, and primary action text should block a committed locale release. Low-risk preview copy may warn instead.

### What is the most common localization defect in mature products?

Layout and state-specific text. Main screens often get reviewed, while validation errors, empty states, exports, emails, and mobile variants still break under real translated strings.
`,
};
