import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing i18n Pluralization Rules in React',
  description:
    'Test React i18n pluralization for zero, one, few, many, other, and ordinals with i18next, CLDR-driven locale matrices, and real browser rendering.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Testing i18n Pluralization Rules in React

An Arabic cart with 11 items does not use the same grammatical form as one with 3 items, and Russian 21 does not behave like Russian 11. An English-only assertion over 1 and 2 cannot detect either defect. React merely renders the string returned by the localization layer; the real oracle comes from the locale's plural categories and the translation resources that implement them.

i18next delegates plural category selection to \`Intl.PluralRules\` and uses category suffixes such as \`_one\`, \`_few\`, \`_many\`, and \`_other\` in JSON format v4. The interpolation variable must be named \`count\`. An optional \`_zero\` key is an i18next exact-zero override, not a CLDR category guaranteed for every language.

The test plan therefore has three levels: validate which categories a locale can produce, prove every translation key supplies them, and render representative boundary values through the actual React component. For layout, dates, directionality, and translation workflow beyond plurals, read the [internationalization testing guide](/blog/internationalization-testing-i18n-guide). For executing components in a real browser instead of a simulated DOM, use the [Vitest Browser Mode guide](/blog/vitest-browser-mode-guide-2026).

## Stop treating plural as singular versus plural

English cardinal numbers generally select \`one\` for 1 and \`other\` for other values. That two-form intuition breaks quickly. Arabic exposes zero, one, two, few, many, and other categories. Russian uses one, few, many, and other under rules sensitive to the last digits and to decimals. Other locales may use only \`other\`.

The category names are grammatical buckets, not English meanings. \`many\` does not simply mean “a large number,” and \`few\` is not a product threshold. Never encode rules such as “count under five uses few” in component code. Ask \`Intl.PluralRules(locale).select(count)\` or let i18next do it.

| Locale sample | Cardinal categories to expect from \`Intl.PluralRules\` | Values worth pinning |
|---|---|---|
| \`en\` | one, other | 0, 1, 2, 1.5 |
| \`fr\` | one, many, other depending on value domain | 0, 1, 2, 1.5, large powers |
| \`ru\` | one, few, many, other | 1, 2, 5, 11, 21, 22, 25, 1.5 |
| \`ar\` | zero, one, two, few, many, other | 0, 1, 2, 3, 11, 100, 1.5 |
| \`ja\` | other | 0, 1, 2 |

Do not freeze a copied internet chart as the only oracle. JavaScript runtimes implement Unicode locale data, and supported categories are discoverable through \`resolvedOptions().pluralCategories\`. Pin the runtime and test required locales so an ICU-data change is visible rather than accidental.

## Separate cardinal, ordinal, and exact-zero behavior

Cardinal plurals answer “how many?” Ordinal plurals express order, such as first, second, or third. English cardinals use 1 item versus 2 items, while English ordinals distinguish 1st, 2nd, 3rd, and other endings with exceptions for 11th, 12th, and 13th. i18next uses \`ordinal: true\` and ordinal-suffixed keys for that path.

Exact zero is another concept. A product writer may prefer “No notifications” instead of “0 notifications.” i18next can select \`notifications_zero\` when present. That content shortcut should not be mistaken for the locale's \`zero\` category. Test both the exact override and category completeness.

| Requirement | Resource shape | Invocation |
|---|---|---|
| English cardinal | \`item_one\`, \`item_other\` | \`t('item', { count })\` |
| Friendly empty state | Add \`item_zero\` | \`t('item', { count: 0 })\` |
| English ordinal | \`rank_ordinal_one\` and other ordinal categories | \`t('rank', { count, ordinal: true })\` |
| Arabic cardinal | Keys for zero, one, two, few, many, other | \`t('item', { count })\` |
| Japanese cardinal | \`item_other\` | \`t('item', { count })\` |

Keep cardinal and ordinal copy separate even when English strings happen to look compatible. Translators need context, and other languages may organize the forms differently.

## Create an isolated i18next instance per test

The global i18next singleton retains language and resources. Parallel tests that call \`changeLanguage\` can race and produce failures attributed to the wrong locale. Use \`createInstance()\` in unit tests or create one instance per rendered tree.

This runnable Vitest suite initializes real resources and checks values that exercise Russian and Arabic categories. It also proves the English exact-zero override. The expected strings are fixture translations written for testing, not machine-translated production copy.

\`\`\`typescript
import i18next from 'i18next';
import { describe, expect, it } from 'vitest';

const resources = {
  en: {
    translation: {
      cart_zero: 'Cart is empty',
      cart_one: '{{count}} item',
      cart_other: '{{count}} items',
    },
  },
  ru: {
    translation: {
      cart_one: '{{count}} товар',
      cart_few: '{{count}} товара',
      cart_many: '{{count}} товаров',
      cart_other: '{{count}} товара',
    },
  },
  ar: {
    translation: {
      cart_zero: 'لا توجد عناصر',
      cart_one: 'عنصر واحد',
      cart_two: 'عنصران',
      cart_few: '{{count}} عناصر',
      cart_many: '{{count}} عنصرًا',
      cart_other: '{{count}} عنصر',
    },
  },
} as const;

async function translator(language: keyof typeof resources) {
  const instance = i18next.createInstance();
  await instance.init({ lng: language, fallbackLng: false, resources });
  return instance;
}

describe('cart cardinal plurals', () => {
  it.each([
    ['en', 0, 'Cart is empty'],
    ['en', 1, '1 item'],
    ['en', 2, '2 items'],
    ['ru', 1, '1 товар'],
    ['ru', 2, '2 товара'],
    ['ru', 5, '5 товаров'],
    ['ru', 11, '11 товаров'],
    ['ru', 21, '21 товар'],
    ['ar', 0, 'لا توجد عناصر'],
    ['ar', 2, 'عنصران'],
    ['ar', 3, '3 عناصر'],
    ['ar', 11, '11 عنصرًا'],
  ] as const)('%s chooses the right form for %d', async (lng, count, expected) => {
    const i18n = await translator(lng);
    expect(i18n.t('cart', { count })).toBe(expected);
  });
});
\`\`\`

The suite passes \`count\` as a number. A string from an HTML input or API payload should be parsed and validated before translation. Do not rely on coercion, because plural selection is a numeric operation and malformed values need product handling rather than a localization accident.

## Generate representative values from the runtime rules

Hard-coded boundaries are readable and valuable, but a completeness check can discover at least one representative value for every category the runtime reports. Iterate a defined domain, call \`select\`, and fail if any required category has no corresponding resource key.

The finite search domain must match product inputs. Searching integers 0 through 200 will not find categories used only by fractions or huge values. If the UI displays decimal quantities, include decimal probes. If it only shows integer message counts, integer coverage is the correct product scope even if the locale standard defines more possibilities.

\`\`\`typescript
import { expect, test } from 'vitest';

function representatives(locale: string, candidates: number[]) {
  const rules = new Intl.PluralRules(locale, { type: 'cardinal' });
  const found = new Map<string, number>();
  for (const value of candidates) {
    const category = rules.select(value);
    if (!found.has(category)) found.set(category, value);
  }
  return { rules, found };
}

test.each(['en', 'ru', 'ar', 'ja'])('%s integer categories have representative values', (locale) => {
  const candidates = Array.from({ length: 201 }, (_, value) => value);
  const { rules, found } = representatives(locale, candidates);
  const required = rules.resolvedOptions().pluralCategories;

  for (const category of required) {
    expect.soft(found.has(category), \`missing integer representative for \${category}\`).toBe(true);
  }
});
\`\`\`

This exact test is appropriate only when the product domain is integers and every runtime category is reachable by the chosen range. For French or other rules involving special values, expand the candidates or assert against the subset reachable in your application. The senior-testing move is to declare the numeric domain, not force a generic loop to look comprehensive.

## Audit translation resource completeness

A component test can pass in English while Arabic silently falls back to English or to the raw key. Add a resource audit that enumerates every base key requiring pluralization and compares locale files against the categories relevant to the application's number domain.

Distinguish a missing form from an intentionally identical translation. Two categories may use the same text, but both keys can still be required for translator clarity and future copy changes. Configure fallback behavior strictly in tests. \`fallbackLng: false\` makes missing locale data visible instead of hiding it behind the source language.

Resource audit output should name locale, namespace, base key, category, and a representative count. “Translation missing” without the triggering value sends engineers into guesswork. Run audits when locale files change, not only in nightly browser suites.

## Render the React component in Vitest Browser Mode

Unit-testing \`i18n.t\` proves selection and resources. A browser component test proves that React passes a numeric count, rerenders after locale changes, exposes the intended accessible name, and does not concatenate a translated noun outside i18next.

Vitest Browser Mode with the Playwright provider runs in a real browser. The example uses \`vitest-browser-react\` to render an \`I18nextProvider\` tree.

\`\`\`tsx
import i18next from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

function CartBadge({ count }: { count: number }) {
  const { t } = useTranslation();
  return <output aria-label={t('cart', { count })}>{t('cart', { count })}</output>;
}

test('Arabic cart rerenders from two to many category', async () => {
  const i18n = i18next.createInstance();
  await i18n.init({
    lng: 'ar',
    fallbackLng: false,
    resources: {
      ar: {
        translation: {
          cart_two: 'عنصران',
          cart_many: '{{count}} عنصرًا',
          cart_zero: 'لا توجد عناصر',
          cart_one: 'عنصر واحد',
          cart_few: '{{count}} عناصر',
          cart_other: '{{count}} عنصر',
        },
      },
    },
  });

  const screen = render(
    <I18nextProvider i18n={i18n}>
      <CartBadge count={2} />
    </I18nextProvider>,
  );
  await expect.element(screen.getByLabelText('عنصران')).toBeInTheDocument();

  screen.rerender(
    <I18nextProvider i18n={i18n}>
      <CartBadge count={11} />
    </I18nextProvider>,
  );
  await expect.element(screen.getByLabelText('11 عنصرًا')).toBeInTheDocument();
});
\`\`\`

Use the package versions compatible with the repository's Vitest release. Browser configuration still needs a provider, an enabled browser project, and a React Vite plugin. Keep localization selection tests in Node for speed, and reserve real-browser runs for component behavior that Node cannot represent faithfully.

## Test language changes without global races

Applications often let users switch language while a component remains mounted. Test that the visible string changes and that no stale memoization keeps the prior plural form. A \`useMemo\` keyed only on count, for example, can hold English after the language becomes Russian.

Wait for \`changeLanguage\` to resolve before asserting. If resources load over the network, test the loading state and failure state separately. Do not let one test mutate a shared singleton used by another test running concurrently. Per-test instances eliminate most of this class of flake.

When server-side rendering is involved, render one locale on the server and hydrate with the same initial language and resources. A mismatch can cause a hydration warning and a visible text flash. Then add a deliberate locale-change case after hydration.

## Include decimals, negatives, and formatted numbers only when valid

Product domain determines which numbers matter. File counts are nonnegative integers. Distances, weights, ratings, and money can be decimal. A balance can be negative. Each locale's plural rule may treat decimals differently from integers.

Pass the raw numeric value to plural selection and format it for display using locale-aware number formatting. Do not pluralize on a formatted string containing commas or localized digits. If i18next interpolation formatting is configured, assert both selected category and rendered number.

Define behavior for \`NaN\`, infinity, null, and missing count before they reach translations. i18next requires the variable name \`count\` for plural resolution. A component accidentally passing \`{ quantity: 2 }\` should fail a test rather than fall back to an unrelated key.

## Do not snapshot an entire locale catalog

Large snapshots tell reviewers that thousands of strings changed without identifying grammatical correctness. Prefer focused data tables per message, resource completeness checks, and browser assertions over user-visible copy. Snapshot only when the serialized catalog structure itself is the contract.

Translation copy changes frequently. If tests assert exact text for every production string, legitimate translator edits create noise. Structural audits can assert category keys without freezing prose, while a smaller set of curated component tests pins important copy where wording is part of the requirement.

| Test style | Catches | Misses |
|---|---|---|
| \`Intl.PluralRules\` category probe | Runtime category behavior | Resource correctness |
| i18next translation table | Suffix selection and interpolation | React wiring and layout |
| Resource completeness audit | Missing category keys | Linguistic quality |
| Vitest browser component | Rerendering and accessible output | Full catalog coverage |
| Native-speaker review | Context, tone, and grammar | Automated regressions at scale |
| Visual regression | Overflow and directionality | Whether the chosen noun form is correct |

Automation can prove that the right configured branch was selected. It cannot certify that a translation is idiomatic. Keep linguistic review in the release process for new or materially changed copy.

## Debug the failure by asking the runtime

When count 22 renders an unexpected string, log three facts in the failing test: \`new Intl.PluralRules(locale).select(22)\`, i18next's resolved language, and the resource key actually available. This separates wrong locale, wrong category expectation, and missing translation.

Check whether the app resolves \`pt-BR\` to \`pt\`, whether the namespace loaded, and whether resource files use v4 suffixes. Legacy i18next JSON suffix formats differ. A catalog partially migrated from older numeric suffixes can work for English and fail for richer locales.

Also verify the JavaScript runtime includes full locale data. Minimal server builds can support a smaller ICU dataset than browsers. If server and client choose different categories, SSR output may disagree with hydration. Run category probes in every supported runtime class.

## Give translators the numeric context they need

A technically complete set of keys can still be wrong because the translator never saw where the number appears. Supply screenshots or component context, clarify whether the value is cardinal or ordinal, identify the noun's domain, and state whether zero has a product-specific empty message. A key named \`count\` offers almost no linguistic guidance.

Avoid assembling sentences from independently translated fragments. Code such as \`t('showing') + count + t('results')\` fixes English word order and prevents plural rules from governing the whole message. Store the sentence as one pluralized unit with interpolation. If a link or styled element must appear inside it, use the localization library's component interpolation mechanism and test the accessible sentence as a whole.

When translation vendors return resources, run the structural category audit before linguistic review. This catches missing suffixes immediately, leaving reviewers to focus on grammar and context. Then render representative counts in a catalog page that shows locale, key, count, category, and result. Such a page is a review tool, not an automated oracle, but it makes 11-versus-21 problems visible without asking a reviewer to navigate the entire product.

## Frequently Asked Questions

### Is \`_zero\` required for every i18next plural key?

No. It is an optional exact-zero override for copy such as “No messages.” Without it, zero follows the locale's normal plural rule. Require it only where content design calls for a special empty phrase.

### Why does Russian 21 use a different form from Russian 11?

Plural selection follows locale rules involving digit patterns, not a simple size threshold. Use \`Intl.PluralRules('ru').select(value)\` and pin representative values around 1, 11, 21, and related endings.

### Should tests assert translated text or only the selected category?

Use both at different layers. Category and resource audits provide broad structural coverage; a smaller curated set of component tests should assert important user-visible translations and interpolation.

### Can I pass \`'2'\` as the i18next count?

Pass a validated number. Relying on coercion hides malformed input and makes the contract unclear. Parse API or form values before calling \`t('key', { count })\`.

### How do I prevent locale-switch tests from affecting each other?

Create an isolated i18next instance per test or rendered tree and await language changes. Avoid mutating the global singleton while tests execute in parallel.
`,
};
