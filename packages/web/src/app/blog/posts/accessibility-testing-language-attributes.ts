import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Accessibility Testing Language Attributes: From Document Defaults to Multilingual UI',
  description: 'Apply accessibility testing language attributes with DOM audits, Playwright checks, BCP 47 validation, and multilingual workflows that catch speech errors early.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Accessibility Testing Language Attributes: From Document Defaults to Multilingual UI

Accessibility testing language attributes means verifying that the default human language of a page and every meaningful language change can be programmatically determined. In ordinary HTML, the document's primary language belongs on the root \`html\` element with a valid \`lang\` value such as \`en\`, \`fr\`, or \`pt-BR\`. A passage in another language needs its own \`lang\` declaration at the narrowest sensible ancestor. Assistive technology can then select an appropriate pronunciation dictionary and voice.

The testing payoff is concrete: names, instructions, product terms, and language-switcher content are pronounced more predictably; browser translation and hyphenation receive better signals; and multilingual regressions become reviewable in CI. A robust workflow combines a content-language inventory, static DOM assertions, BCP 47 syntax checks, route coverage, dynamic-state tests, and manual listening with at least one screen reader. Merely checking that \`<html lang="en">\` exists is not enough.

WCAG 2.2 Success Criterion 3.1.1 requires the default human language of each page to be programmatically determined at Level A. Success Criterion 3.1.2 requires the human language of each passage or phrase to be programmatically determined when it differs, subject to exceptions for proper names, technical terms, indeterminate words, and words that have become part of the surrounding vernacular. Testing must therefore connect markup to editorial meaning.

## Turn the content model into a language map

Begin by listing page states and language boundaries. The visible locale selected in navigation may not equal the language of every region. A French account page might contain an English legal product name, a German customer quotation, and a user-generated Spanish message. Not every occurrence needs markup, but the decision should be deliberate.

| Content region | Expected declaration | Reason to test |
|---|---|---|
| English document shell | \`<html lang="en">\` | establishes the inherited default |
| Canadian French route | \`<html lang="fr-CA">\` | locale-specific primary language |
| Spanish quotation in English prose | \`<blockquote lang="es">\` | pronunciation changes for a passage |
| localized control label | inherited page language | avoids redundant per-element attributes |
| untranslated user message | language when reliably known | supports correct speech without guessing |
| brand or technical token | usually no language change | may qualify as a proper name or term |

Language identification is not visual decoration. A flag icon, URL prefix, \`data-locale\`, React context, translation key, or server-side locale variable can drive application behavior but does not replace the rendered HTML \`lang\` semantics. Your test oracle must inspect the DOM that assistive technology receives.

Use canonical, sufficiently specific BCP 47 language tags. Common structures include a primary language subtag followed by optional script and region subtags. Examples include \`en-GB\`, \`zh-Hant\`, and \`sr-Latn-RS\`. Do not invent tags from internal locale names such as \`english_USA\`. The IANA Language Subtag Registry is authoritative at https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry, while practical HTML guidance appears at https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/lang.

Exact case is not normally the key conformance issue because language tags are case-insensitive, but conventional casing improves readability: lowercase language, title-case script, uppercase region. More important is choosing the right semantic tag. \`en-US\` on Spanish content is valid syntax but wrong meaning, which an automated grammar check cannot discover.

## Establish a known-good multilingual fixture

A small reference page helps validate custom rules and exposes inheritance clearly. The root supplies English. The French paragraph, Spanish quotation, and Japanese navigation link override that default only where the human language changes.

\`\`\`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Shipping help</title>
  </head>
  <body>
    <main>
      <h1>Shipping help</h1>
      <p>Your order usually leaves our warehouse in two business days.</p>
      <p lang="fr">Votre commande est en cours de préparation.</p>
      <blockquote lang="es">El paquete llegó en buenas condiciones.</blockquote>
      <a href="/ja/help" lang="ja" hreflang="ja">日本語のヘルプ</a>
    </main>
  </body>
</html>
\`\`\`

The link demonstrates two distinct attributes. \`lang="ja"\` describes the language of the link's text. \`hreflang="ja"\` describes the language of the linked resource. One does not substitute for the other. A test that accepts \`hreflang\` as the current phrase language will miss a screen-reader pronunciation problem.

Likewise, \`dir\` and \`lang\` answer different questions. \`lang="ar"\` identifies Arabic, while \`dir="rtl"\` establishes right-to-left direction. Script direction can sometimes be inferred, but explicit direction is often needed for isolated or dynamic mixed-direction content. Test them as related, independent semantics.

## Assert the document default on every rendered route

A route-level check should visit representative pages after redirects and assert the root attribute. Include authenticated layouts, marketing pages, error states, embedded documents, and server-rendered fallbacks. Single-page applications can accidentally preserve the previous route's language after client navigation, so test both a fresh load and in-app navigation.

\`\`\`ts
import { test, expect } from '@playwright/test';

const routes = [
  { path: '/en/account', language: 'en' },
  { path: '/fr-ca/account', language: 'fr-CA' },
  { path: '/es/ayuda', language: 'es' },
];

for (const route of routes) {
  test(route.path + ' exposes the expected document language', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000' + route.path);
    await expect(page.locator('html')).toHaveAttribute('lang', route.language);
  });
}
\`\`\`

The matrix is preferable to a generic “lang is nonempty” rule because it detects valid-but-wrong declarations. If localization routing can fall back, add cases for missing translations and unsupported locales. Decide whether a fallback page remains under the requested URL, redirects to a default locale, or shows a language choice, then assert the resulting document language accordingly.

When a client-side language switcher changes visible content without reloading, the root attribute must update in the same completed state. Avoid asserting immediately after a click if translation bundles load asynchronously. Wait for an observable UI result, then assert both text and language.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('language switch updates content and the document default', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/settings');

  await page.getByRole('button', { name: 'Language' }).click();
  await page.getByRole('menuitem', { name: 'Français' }).click();

  await expect(page.getByRole('heading', { name: 'Paramètres' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page).toHaveURL(/\\/fr\\/parametres$/);
});
\`\`\`

Keep route assertions readable; a direct URL string comparison is even better when query parameters are stable.

| Navigation path | Failure that may appear | Required evidence |
|---|---|---|
| hard load of localized URL | server template uses default language | root attribute after final response |
| client-side locale switch | text changes but root stays stale | localized landmark plus updated \`lang\` |
| browser back navigation | previous locale remains in DOM | history result and root language agree |
| authentication redirect | login shell has wrong default | final URL, heading, and \`lang\` |
| not-found route | generic error uses wrong language | error text and document default align |

## Validate tag structure without confusing syntax and meaning

A tag validator catches empty strings, underscores, impossible ordering, and unregistered subtags. It cannot determine whether the prose is actually French. Keep those two kinds of evidence separate in reporting: “invalid tag syntax” and “language-content mismatch.” The latter usually needs an editorial oracle or manual review.

For a bounded application locale set, the most dependable CI rule is an allowlist of supported document languages. Passage languages may use a larger validated set. The following browser-side audit gathers every explicit declaration, verifies it through \`Intl.Locale\`, and rejects underscores. \`Intl.Locale\` reports structural invalidity, not editorial correctness or guaranteed registry currency.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('explicit language attributes are structurally usable', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/en/catalog');

  const findings = await page.locator('[lang]').evaluateAll((elements) =>
    elements.map((element) => {
      const value = element.getAttribute('lang') || '';
      let valid = value.length > 0 && !value.includes('_');
      try {
        new Intl.Locale(value);
      } catch {
        valid = false;
      }
      return { tag: element.tagName, value, valid };
    })
  );

  expect(findings.filter((item) => !item.valid)).toEqual([]);
});
\`\`\`

Do not use a home-grown pattern as a complete BCP 47 validator. The grammar, grandfathered tags, extensions, private-use sequences, and registry considerations make simplistic regular expressions unreliable. If your product needs strict registry validation, use a maintained standards-aware library already approved by the project or validate against registry data in a dedicated build step.

\`lang=""\` has special semantics: it indicates that the language is unknown. That is different from an omitted attribute, which inherits from an ancestor. Accidentally rendering an empty value on a component can break inheritance for its subtree. Include empty attributes in findings rather than filtering them out as if absent.

## Find passage-level language changes systematically

Passage testing is where automation reaches its limit. A DOM crawler can list explicit declarations and calculate inherited language, but it cannot reliably judge all natural-language text. Build the expected language boundary from content metadata wherever possible. CMS entries, translation catalogs, and typed component props can provide an oracle for quotations, testimonials, code-switching help text, and user-generated content whose language is known.

The browser can report each text-bearing element's nearest inherited language. This diagnostic is helpful when a localized component unexpectedly sits below an empty or wrong declaration.

\`\`\`js
const rows = [...document.querySelectorAll('main *')]
  .filter((element) => (element.textContent || '').trim().length > 0)
  .map((element) => ({
    element: element.tagName.toLowerCase(),
    text: (element.textContent || '').trim().slice(0, 80),
    explicit: element.getAttribute('lang'),
    inherited: element.closest('[lang]')?.getAttribute('lang') || null,
  }));

console.table(rows);
\`\`\`

Run that snippet in development tools or through \`page.evaluate\` while diagnosing. It intentionally produces evidence, not a pass or fail. Parent containers can repeat descendant text, so it is unsuitable as a polished reporting algorithm without filtering direct text nodes.

What people get wrong is wrapping every borrowed word in a language span. WCAG exceptions matter, excessive language switching can make speech choppy, and product names may be pronounced better in the surrounding language. Focus on phrases and passages where pronunciation rules genuinely change. Agree on ambiguous terms with accessibility specialists and native speakers rather than encoding arbitrary automation guesses.

| Content pattern | Automation opportunity | Human judgment still needed |
|---|---|---|
| translated CMS article | compare declared locale to entry locale | confirm translation itself is correct |
| customer quotation with locale metadata | require matching wrapper \`lang\` | verify metadata reflects spoken language |
| product name in a sentence | usually inherit | decide whether it is a proper name exception |
| generated error from external service | detect missing boundary | identify actual language reliably |
| mixed-language educational example | assert authored spans | listen for understandable voice changes |

For user-generated content, avoid pretending a probabilistic detector is certain. If the author selects a language, preserve that metadata and let users correct it. If detection is used, establish confidence handling and an “unknown” state. Incorrectly labeling Polish as Czech can be worse than inheritance because it actively selects the wrong pronunciation rules.

## Test components that cross document boundaries

An iframe contains a separate document, so its root element needs its own default language. The parent page's \`lang\` does not flow into the framed document. Test the iframe URL directly and, when same-origin, inspect its root through a frame locator or frame object. Cross-origin frames require cooperation from the owning system or a separately reachable test endpoint.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('embedded support document declares its own language', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/en/help-shell');

  const supportFrame = page.frameLocator('iframe[title="Support guide"]');
  await expect(supportFrame.locator('html')).toHaveAttribute('lang', 'de');
  await expect(supportFrame.getByRole('heading', { name: 'Hilfe' })).toBeVisible();
});
\`\`\`

Shadow DOM behaves differently. Language is an inherited global semantic, and components should usually inherit from their host context rather than hard-code English internally. If a web component renders fixed Spanish text inside an English page, set \`lang="es"\` on an appropriate host or internal container and test the composed result. If all component strings are localized with the page, an internal hard-coded value is a defect.

SVG supports language metadata with format-specific history and rules. For inline SVG containing meaningful text, test the accessible name and pronunciation manually in the supported assistive technology matrix. Do not assume an HTML audit selector covers standalone SVG documents. Canvas-rendered text has no equivalent DOM language boundary unless the application supplies accessible fallback content.

## Integrate automated accessibility scans without outsourcing the oracle

General accessibility engines can detect a missing root language and some invalid values. They are valuable because they bundle standards knowledge and expose consistent findings, but they cannot understand whether the tag matches the actual prose in every passage. Pair scanner results with route-specific assertions.

\`\`\`ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('localized checkout has no automated language violations', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/fr/paiement');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag21a'])
    .analyze();

  const languageFindings = results.violations.filter((violation) =>
    violation.id.startsWith('html-lang')
  );
  expect(languageFindings).toEqual([]);
});
\`\`\`

This example assumes \`@axe-core/playwright\` is installed as a project dependency. It filters scanner output only to keep the test topic focused; most projects should also run a broader accessibility suite whose other violations are not discarded. Avoid asserting a permanently empty global violation array on a mature site without a triage strategy, because unrelated legacy issues can make teams stop trusting the gate.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when an agent needs a repeatable accessibility review workflow. Keep project-specific locale maps, supported assistive technology, and editorial exceptions in the repository, because generic automation cannot infer those product decisions.

## Diagnose the stale-language single-page application bug

A realistic regression appears after client-side navigation. The user starts at \`/en/products\`, selects Français, and the router renders French strings at \`/fr/produits\`. The application updates an i18n provider and document title, but the server template originally emitted \`<html lang="en">\` and no client effect changes it. Visual review passes. A screen reader continues using English pronunciation rules.

Diagnosis should isolate state transitions:

1. Hard-load the French URL and record root language, visible heading, and title.
2. Hard-load English, switch through the UI, then record the same evidence.
3. Navigate between two French routes to see whether route rendering resets anything.
4. Use browser back and forward to exercise cached state.
5. Inspect whether the language update occurs before or after visible content settles.

If the hard-loaded French page is correct but the UI transition is wrong, the defect is in client synchronization. If both are wrong, inspect server locale selection and root template rendering. If the root briefly becomes correct and then reverts, a competing component or hydration effect owns the attribute. The fix should establish one authoritative locale-to-document synchronization point, followed by tests for each navigation path.

A MutationObserver can help during diagnosis, although it should not be the permanent product solution.

\`\`\`js
const observer = new MutationObserver((records) => {
  for (const record of records) {
    console.log('html lang changed to', document.documentElement.lang);
  }
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['lang'],
});
\`\`\`

This evidence reveals duplicate writers and timing. Remove the observer after debugging or keep equivalent instrumentation behind a development-only boundary.

## Perform a manual speech and direction review

Automated checks cannot prove pronunciation quality. Select representative content that contains ordinary prose, dates, abbreviations, names, quotations, and language changes. With a supported screen reader and voice packs installed, navigate from text before the boundary through the changed passage and back. Listen for a voice or pronunciation-rule transition that preserves meaning without excessive interruptions.

Test at least one desktop combination in the product's support matrix, then cover mobile if the application has significant mobile use. Record operating system, screen reader, browser, voice configuration, page URL, locale, and exact passage. A tester saying “it sounded odd” is hard to reproduce; a compact transcript and boundary description are actionable.

For right-to-left languages, inspect punctuation, numbers, inline code, form controls, and mixed-direction identifiers. \`dir="auto"\` can be useful for user-generated text when direction is unknown, but it is not a language detector. Verify keyboard navigation, selection, and visual ordering separately from pronunciation.

An accessibility language test also intersects with interaction sequence. The [accessibility testing focus order guide](/blog/accessibility-testing-focus-order-guide) helps verify that translated layouts and switchers remain operable in a meaningful order. For teams choosing a runner to implement these checks, the [JavaScript testing frameworks complete guide for 2026](/blog/javascript-testing-frameworks-complete-guide-2026) provides a broader comparison without changing the semantic oracle described here.

## Ship a language-specific release gate

The fastest pull-request layer should assert supported root tags on route fixtures, validate explicit values, and test the locale switcher state transition. Run broader scanner coverage and a larger multilingual route matrix in CI. Schedule manual assistive-technology review for new languages, content-model changes, design-system releases, and high-impact user journeys.

Make failures editorially useful. Report the URL, element selector or content identifier, explicit tag, inherited tag, expected content language, and state transition. Include a short text excerpt only when privacy rules allow it. Never place private user-generated content in CI logs.

The final acceptance question is not “does every element have lang?” It is “can software determine the correct default and meaningful language changes without introducing false switches?” Inheritance is a feature. Use it deliberately, override it precisely, and test the application states in which it can become stale.

## Frequently Asked Questions

### Is a lang attribute required on every HTML element?

No. Language inherits through the DOM, so the root \`html\` declaration supplies the default for descendants. Add another \`lang\` attribute only where the human language changes or where an unknown-language boundary is intentionally represented. Repeating the same value everywhere adds noise and creates more opportunities for inconsistency. Tests should calculate inheritance and focus on the correctness of boundaries, not maximize the number of attributes.

### How specific should a BCP 47 language tag be?

Use the least-specific valid tag that accurately expresses the content and product requirement. \`fr\` is appropriate for general French, while \`fr-CA\` is useful when the content or experience is specifically Canadian French. Script subtags matter when language alone does not identify the writing system needed by the content. Do not append a region merely because the server is located there, and never convert an internal underscore locale directly into HTML without mapping it.

### Can automated tools detect a passage written in the wrong language?

They can find missing, empty, or structurally invalid declarations and compare markup with known content metadata. They cannot reliably judge every passage's actual language, code-switching, proper-name exception, or pronunciation quality. Statistical language detection may support triage, especially for long text, but it should expose uncertainty clearly. Route-specific expectations, native-speaker review, and manual screen-reader listening remain necessary for high-confidence coverage in production interfaces.

### What should happen to lang during a client-side locale switch?

The root language should change as part of the completed locale transition, alongside translated content, title, routing state, and direction where applicable. Tests should wait for a stable localized landmark, then assert \`document.documentElement.lang\`. Also exercise hard loads, history navigation, authentication redirects, and fallback pages. A visual translation with a stale root attribute is a real accessibility defect because speech software may continue applying the previous language's pronunciation rules.
`,
};
