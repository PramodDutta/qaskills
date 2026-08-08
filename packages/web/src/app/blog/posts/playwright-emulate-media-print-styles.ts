import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Emulate Media Print Styles Without Guesswork',
  description: 'Use Playwright emulate media print styles to verify printable layouts, hidden controls, colors, page breaks, and PDFs with durable automated tests.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Emulate Media Print Styles Without Guesswork

Playwright emulate media print styles by calling \`page.emulateMedia({ media: 'print' })\` before asserting the page’s printed state. That switches CSS media evaluation to \`print\`, so your test can verify which elements are visible, how computed styles change, whether print-only content appears, and whether screen-only controls disappear. For Chromium-based PDF validation, \`page.pdf()\` adds a second layer: it creates the printable artifact that a user or downstream process will actually consume.

The dependable workflow is two-tiered. Use DOM and computed-style assertions for fast, precise feedback, then use a small number of PDF or screenshot checks for pagination and visual composition. Print testing fails when teams rely only on snapshots, or when they merely call \`emulateMedia\` and assume the stylesheet applied correctly. Emulation changes the active media type. It does not prove that every invoice row, legal disclosure, background color, or page break survived.

This guide builds a runnable Playwright suite around a realistic order invoice. It covers browser fixtures, print-specific CSS, semantic locators, computed styles, pagination markers, PDF inspection, failure diagnosis, and CI stability.

## Model the Printed Contract Before Automating It

A print view is a distinct presentation of the same document. Start by specifying what the printed output must preserve and what it must omit. An invoice, for example, needs seller and buyer details, line items, totals, payment state, and legal text. It should omit navigation, interactive filters, and buttons. A report may require chart legends, timestamp context, and repeated table headers.

Translate those needs into observable layers:

| Contract layer | Example requirement | Strongest automated evidence |
|---|---|---|
| Content | Invoice number and total are present | Role or text assertion |
| Visibility | Navigation and “Pay now” button are absent | Visibility assertion after print emulation |
| Styling | Text becomes black on a white background | Computed CSS assertion |
| Pagination | Summary does not split from its heading | PDF render or page-level visual inspection |
| Artifact | Generated PDF has pages and expected text | PDF metadata and text extraction |
| Accessibility | Screen document retains meaningful structure | Semantic locator and accessibility-focused test |

Do not encode printer hardware behavior as a browser contract. Physical printer margins, ink-saving settings, driver scaling, and paper trays lie outside Playwright’s control. Choose a testable browser-level contract such as A4 output with defined CSS margins, then conduct targeted device acceptance separately if the business depends on particular printers.

The CSS should make intent explicit. Here is a small page fragment and stylesheet that the tests in this article can exercise:

\`\`\`html
<header class="site-header">Acme Shop</header>
<main>
  <h1>Invoice INV-2048</h1>
  <p class="print-only" data-testid="printed-on">Printed copy</p>
  <table aria-label="Invoice items">
    <thead><tr><th>Item</th><th>Amount</th></tr></thead>
    <tbody><tr><td>Support plan</td><td>$120.00</td></tr></tbody>
  </table>
  <section class="invoice-summary" aria-label="Invoice summary">
    <h2>Total</h2><p>$120.00</p>
  </section>
  <button type="button">Pay now</button>
</main>
\`\`\`

\`\`\`css
.print-only { display: none; }

@media print {
  @page { size: A4; margin: 14mm; }
  body { color: #000; background: #fff; font-size: 11pt; }
  .site-header, button { display: none; }
  .print-only { display: block; }
  thead { display: table-header-group; }
  .invoice-summary { break-inside: avoid; }
}
\`\`\`

This CSS is intentionally modest. Real print styles should also account for long URLs, oversized images, fixed-position UI, dark themes, tables wider than the page, and user-generated content.

## Configure a Dedicated Print Test Project

Print checks deserve a named Playwright project because their browser and artifact requirements differ from ordinary cross-browser UI checks. \`page.pdf()\` is supported only in Chromium, so DOM-level print checks can run broadly while artifact generation stays in Chromium.

A valid Playwright configuration can define a Chromium print project without inventing custom framework hooks:

\`\`\`ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-print',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\\.print\\.spec\\.ts/,
    },
  ],
});
\`\`\`

The regular expression is rendered as a JavaScript regex literal matching files that end in \`.print.spec.ts\`. Keep the project small. Running every interaction test under print media adds time without improving print coverage.

Seed deterministic data. Dates, order identifiers, currency, and addresses should not depend on the execution day or the test runner’s locale. If the application renders “Printed at” dynamically, inject a controlled clock or assert only the stable label unless the timestamp itself is the requirement.

| Source of variance | Symptom | Control |
|---|---|---|
| Web fonts | Text wraps differently in CI | Wait for \`document.fonts.ready\` before capture |
| Locale | Currency and dates change | Use a fixed test locale and fixture |
| Data length | Rows spill onto another page | Seed named short and long datasets |
| Animations | Visual diff catches an intermediate state | Disable or finish animations before capture |
| Browser revision | PDF layout changes after upgrade | Pin Playwright and review browser updates |

## Assert the Media Switch Directly

The first test should prove that Playwright activated print media, rather than inferring it from a screenshot. The browser exposes \`matchMedia\`, which gives a clear and stable assertion:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('activates the print media query', async ({ page }) => {
  await page.goto('/invoice/INV-2048');

  await expect.poll(() => page.evaluate(() => matchMedia('screen').matches))
    .toBe(true);

  await page.emulateMedia({ media: 'print' });

  await expect.poll(() => page.evaluate(() => matchMedia('print').matches))
    .toBe(true);
  await expect.poll(() => page.evaluate(() => matchMedia('screen').matches))
    .toBe(false);
});
\`\`\`

This is more diagnostic than starting with “header should be hidden.” If the visibility assertion fails, the direct media assertion tells you whether the problem is emulation or CSS selection.

Emulation persists for the page until changed. If a test needs to return to screen media, call \`await page.emulateMedia({ media: 'screen' })\` after the print assertions and before the screen assertions. Passing \`screen\` is a documented media value and makes the transition explicit.

In a fresh Playwright test, the default browser context and page are isolated, so cross-test leakage is normally avoided. Within a single test, however, be explicit when you compare both modes.

Playwright can also emulate color scheme and reduced motion through documented \`emulateMedia\` options. Keep those axes separate unless the product explicitly supports their combinations. A print test that simultaneously changes media, color scheme, contrast, and reduced motion can fail without revealing which condition caused the change.

## Verify Visibility With User-Facing Locators

Print styles often hide controls and reveal supplemental content. Assert those outcomes with accessible roles, names, and stable test identifiers. Do not couple every check to CSS classes, since classes are implementation details and may change during refactoring.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('shows the invoice content and removes screen controls for print', async ({ page }) => {
  await page.goto('/invoice/INV-2048');
  await expect(page.getByRole('button', { name: 'Pay now' })).toBeVisible();
  await expect(page.getByTestId('printed-on')).toBeHidden();

  await page.emulateMedia({ media: 'print' });

  await expect(page.getByRole('heading', { name: 'Invoice INV-2048' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Invoice items' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Invoice summary' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pay now' })).toBeHidden();
  await expect(page.getByTestId('printed-on')).toBeVisible();
});
\`\`\`

\`toBeHidden\` accepts elements that are not attached or that are not visible. That is often appropriate for a screen-only control, because either removal or CSS hiding satisfies the print requirement. If the implementation must remain in the DOM for a specific reason, assert attachment separately and then inspect computed style.

For locator strategy across a larger suite, follow [Playwright locator best practices for 2026](/blog/playwright-best-practices-locators-2026). Print mode does not justify falling back to long selectors. The same semantic contract that keeps screen tests durable also makes print failures easier to understand.

## Inspect Computed Styles, Not Stylesheet Text

Searching a CSS file for \`@media print\` proves only that a rule exists. It does not prove that the browser selected it, that specificity did not override it, or that the target element received the expected value. Computed styles answer the rendered question.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('applies readable print colors and protects the summary block', async ({ page }) => {
  await page.goto('/invoice/INV-2048');
  await page.emulateMedia({ media: 'print' });

  const styles = await page.getByRole('region', { name: 'Invoice summary' })
    .evaluate(element => {
      const computed = getComputedStyle(element);
      const body = getComputedStyle(document.body);
      return {
        breakInside: computed.breakInside,
        bodyColor: body.color,
        bodyBackground: body.backgroundColor,
      };
    });

  expect(styles.breakInside).toBe('avoid');
  expect(styles.bodyColor).toBe('rgb(0, 0, 0)');
  expect(styles.bodyBackground).toBe('rgb(255, 255, 255)');
});
\`\`\`

Computed values can be browser-normalized. A hex color may become \`rgb(...)\`, and shorthand declarations may be represented through longhand properties. Assert the normalized value observed in supported browsers, not the exact authored text.

There is a subtle limit here: \`break-inside: avoid\` being computed correctly does not prove a block remained on one physical PDF page. It proves the CSS instruction reached the element. The browser’s fragmentation algorithm, available space, oversized content, and nested layout can still produce a split. Use the computed assertion for cause and a rendered artifact for outcome.

## Test Paper Geometry and Long Content

Print defects hide in boundary cases. A one-row invoice can pass while a 45-row invoice drops its header, splits a total, or clips a wide product name. Build explicit fixtures for length and geometry rather than cloning the same happy path.

Recommended cases include:

| Fixture | Risk it isolates | Expected result |
|---|---|---|
| One line item | Excess blank space and minimum layout | A single clean page |
| Enough rows for two pages | Table header and natural fragmentation | Header remains understandable on page two |
| Very long unbroken reference | Horizontal overflow | Text wraps or is safely shortened |
| Large summary block | \`break-inside\` limit | Block moves or degrades acceptably |
| Image-heavy invoice | Intrinsic sizing and load completion | Images fit and are fully loaded |
| Missing optional address | Conditional spacing | No empty labeled section |

A DOM overflow probe catches obvious horizontal clipping before PDF generation:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('does not overflow horizontally with a long reference', async ({ page }) => {
  await page.goto('/invoice/INV-LONG-REFERENCE');
  await page.emulateMedia({ media: 'print' });

  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
  }));

  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth);
});
\`\`\`

This is a useful signal, but browser viewport width under emulated media is not identical to every printable content box. A PDF capture remains necessary for page-boundary confidence.

## Generate a PDF Artifact in Chromium

Playwright’s \`page.pdf()\` generates a PDF using print CSS media by default. Calling \`emulateMedia({ media: 'print' })\` beforehand keeps the test’s intention visible and aligns prior DOM checks with artifact generation. Set paper format or explicit dimensions according to the product contract.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('generates a non-empty A4 invoice PDF', async ({ page }, testInfo) => {
  await page.goto('/invoice/INV-2048');
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const pdfPath = testInfo.outputPath('invoice-INV-2048.pdf');
  const pdf = await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });

  expect(pdf.byteLength).toBeGreaterThan(1000);
});
\`\`\`

The 1000-byte threshold is illustrative, not a quality metric. It catches an obviously empty or failed artifact. It does not validate text, appearance, or page count.

\`printBackground: true\` matters when background fills communicate status or separate table bands. Browsers may omit backgrounds during printing by default. If the product intentionally supports ink-saving output, set and test that contract instead.

\`preferCSSPageSize: true\` gives declared \`@page\` size priority over the \`format\` option. That is useful when CSS owns paper geometry, but teams should avoid conflicting sources. Decide whether the application stylesheet or the test call owns size, then make the other setting a compatible fallback.

## Add Artifact Inspection Without Making Snapshots Brittle

There are three practical artifact strategies:

1. Retain the PDF for human inspection on failure or release candidates.
2. Extract text and metadata with a trusted PDF library or command-line tool available in your environment.
3. Render pages to images and compare selected regions or full pages with reviewed baselines.

Each detects different defects. Text extraction verifies that content made it into the file, but not that it is visible. Image comparison detects layout changes, but can be noisy across browser revisions and font stacks. Page count is stable for fixed fixtures, yet it can encourage overfitted layouts if asserted everywhere.

A shell-level artifact check can use the widely available Poppler utilities when your CI image intentionally includes them:

\`\`\`bash
pdfinfo test-results/invoice/invoice-INV-2048.pdf
pdftotext test-results/invoice/invoice-INV-2048.pdf - | rg "Invoice INV-2048"
pdftoppm -png -r 144 test-results/invoice/invoice-INV-2048.pdf artifacts/invoice-page
\`\`\`

These commands are not part of Playwright, so document and pin the CI system packages that provide them. A cross-platform Node PDF parser may be more convenient, but only choose a package after checking its maintained, documented API.

For images, Playwright’s regular \`page.screenshot()\` captures the browser page, not paginated PDF sheets. It is still useful for quick print-media layout changes:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('matches the compact invoice print layout', async ({ page }) => {
  await page.goto('/invoice/INV-2048');
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  await expect(page).toHaveScreenshot('invoice-print-layout.png', {
    fullPage: true,
    animations: 'disabled',
  });
});
\`\`\`

Keep visual baselines scoped. Mask volatile QR codes or timestamps if they are not under test, seed the same data, and review baseline changes as carefully as application code.

## Diagnose Print CSS That Appears to Be Ignored

Consider a real failure: the test calls \`emulateMedia({ media: 'print' })\`, \`matchMedia('print').matches\` is true, yet the “Pay now” button remains visible. The screenshot looks like the screen page.

Follow the cascade rather than retrying:

1. Inspect the button’s computed \`display\`, \`visibility\`, and relevant matching rules.
2. Confirm the stylesheet finished loading and was not rejected by Content Security Policy or a network error.
3. Check selector specificity. A later rule such as \`.checkout button.primary { display: inline-flex; }\` may override a weaker print rule.
4. Check whether the button lives inside an iframe. Emulation applies to the page, but you must locate and inspect the element in its actual frame.
5. Confirm the UI did not render a second button after the assertion target was selected.

A targeted diagnostic produces useful failure output:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('reports the print cascade for the payment control', async ({ page }) => {
  await page.goto('/invoice/INV-2048');
  await page.emulateMedia({ media: 'print' });

  const diagnostic = await page.getByRole('button', { name: 'Pay now' })
    .evaluate(button => {
      const style = getComputedStyle(button);
      return {
        display: style.display,
        visibility: style.visibility,
        media: matchMedia('print').matches,
        className: button.className,
      };
    });

  console.log(diagnostic);
  expect(diagnostic.media).toBe(true);
  expect(diagnostic.display).toBe('none');
});
\`\`\`

If media is true and display is still visible, the failure is in application CSS or DOM state, not Playwright emulation. Add the diagnostic temporarily or attach it to the test report; do not bury it behind blind retries.

## What People Get Wrong About Print Screenshots

The central misconception is that a full-page screenshot equals a printed page. A screenshot paints one continuous browser document. A PDF fragments that document into paper-sized pages, applies page margins, may repeat table headers, and resolves break rules. Screenshot success therefore cannot prove pagination correctness.

The inverse mistake is using only PDF pixel snapshots. They can tell you that pixels changed, but not why. A single font rasterization change can affect thousands of pixels, while a missing legal paragraph may be hard to diagnose from the diff alone. Layered assertions are stronger:

- Semantic assertions identify missing or extra content.
- \`matchMedia\` confirms the environment.
- Computed styles verify the cascade.
- PDF text confirms artifact inclusion.
- Rendered page images expose fragmentation and overlap.

Another mistake is testing browser print-preview UI. Playwright automates web content, not the operating system’s printer dialog. Test the HTML, CSS, and generated PDF you own. Reserve manual checks for driver-specific options and physical output.

## Fit Print Checks Into the Broader JavaScript Suite

Print behavior crosses component, browser, and artifact boundaries. Pure unit tests can validate formatting functions, totals, and conditional content decisions. Browser tests validate CSS media behavior and document structure. PDF checks validate the final browser artifact. Keeping these layers explicit avoids turning every defect into an expensive end-to-end test.

If you are deciding which runner should own supporting unit and component checks, the [complete JavaScript testing frameworks guide for 2026](/blog/javascript-testing-frameworks-complete-guide-2026) helps separate framework responsibilities. Playwright should remain responsible for behaviors that require a real browser, including media emulation and Chromium PDF generation.

Run fast DOM print checks on pull requests. Run visual PDF comparisons on the Chromium project when print-related files or invoice components change, plus a scheduled full suite to catch unexpected dependencies. Always upload the PDF and rendered diff on failure. A red test without the artifact forces the next engineer to recreate an environment that CI already had.

## Exercise Browser Differences Without Duplicating the Suite

Print CSS belongs to web standards, but layout engines can resolve fragmentation, intrinsic sizing, and font metrics differently. Decide which browser-generated output the product promises. If users can print directly from Chromium, Firefox, and WebKit-based browsers, run the fast semantic and computed-style contract in all supported engines. Keep Chromium-only PDF generation as an artifact check, and add targeted manual acceptance for another engine when a release changes high-risk layout code.

Do not assume that identical computed values guarantee identical pagination. Two engines can both compute \`break-inside\` as \`avoid\` and still place a large block differently because it cannot fit in the remaining page area. A table may repeat its header in one engine but behave differently when nested inside a transformed or overflowed container. Boundary fixtures reveal these differences better than a perfectly sized one-page example.

Use failure classification to prevent needless browser exceptions. If content is missing, that is usually an application defect. If a computed rule is overridden, fix the cascade. If only page fragmentation differs, determine whether the output violates a business requirement or is merely a harmless line-wrap difference. Document a browser-specific expectation only after confirming the product accepts that difference. Blanket test skips convert genuine compatibility gaps into permanent blind spots.

Browser upgrades deserve an explicit visual review. Playwright installs browser builds associated with its package, so a dependency update can legitimately alter font rendering or PDF pagination. Run old and candidate versions against the same fixtures, compare artifacts, and accept new baselines only after checking totals, legal text, clipping, and page order. A mass snapshot update with no document review is not validation.

## Make Asynchronous Content Ready for Printing

Many printable pages are not ready when navigation completes. They load logos, customer data, translations, charts, or tax details after initial HTML. Calling \`page.pdf()\` immediately can capture placeholders or half-rendered content. Waiting for an arbitrary number of milliseconds hides the readiness contract and becomes flaky as environments change.

Expose a meaningful application state. The invoice can remove an accessible loading indicator when required data is rendered, while images use completed load states and fonts expose \`document.fonts.ready\`. The test should wait for the specific heading, total, line-item count, and absence of the loading indicator before switching media and generating the artifact. Network idleness is often a poor proxy because analytics, polling, or streaming requests may continue after the document is ready.

Charts need special care. A canvas chart that animates from zero may be captured mid-transition. Disable animation through application test configuration or wait for a stable, product-owned completion signal. If the print stylesheet substitutes an accessible table or static image for an interactive chart, assert that substitution directly. A chart screenshot with unreadable labels is not useful just because pixels exist.

Images can report complete and still fail to decode. For critical images, evaluate \`HTMLImageElement.decode()\` on located elements and surface rejection as a test failure. Keep external resources under test control; a third-party logo host can make a print regression suite depend on unrelated availability. Prefer deterministic fixtures or a production-equivalent local asset path.

Print actions triggered by the application add another state boundary. If clicking “Print invoice” prepares a special route or toggles a class before calling \`window.print()\`, test the preparation separately from the native dialog. Stub or observe the application-owned call only through documented browser-page techniques, then assert the DOM state that existed at that moment. The operating-system dialog remains outside the web test.

## Review Printed Documents for Privacy Leaks

Screen interfaces sometimes hide sensitive fields behind expandable controls while the DOM still contains them. A broad print rule can unexpectedly reveal those fields, or print a sidebar that includes internal notes. Build negative assertions for secrets and role-restricted data, not just positive assertions for invoice content.

Test at least two permission fixtures when document visibility depends on role. A customer copy must not contain staff notes, internal account identifiers, fraud signals, or action URLs. An administrative copy may include operational fields but should still omit session tokens and hidden form inputs. Text extraction from the generated PDF is especially valuable here because it can find data that is positioned off-page or painted invisibly yet remains embedded in the artifact.

URLs are another leak path. Browsers or stylesheets may print link targets, and a signed download link can contain a credential-like query value. Decide whether URLs should appear, strip temporary tokens from printable labels, and verify the artifact text. Never attach a failed real-customer PDF to a broadly visible CI report. Use synthetic test records, and apply artifact retention controls consistent with the document’s classification.

Finally, check that the title, header, and footer do not expose an internal environment hostname. Browser-generated default headers and footers can include URL and date information. Playwright’s PDF options let the test control whether those templates are displayed. Set the product contract explicitly and inspect a rendered page, since a technically correct invoice body can still ship with an unacceptable staging URL in the margin.

## Frequently Asked Questions

### Does page.emulateMedia create a print preview or PDF?

No. It changes the page’s emulated CSS media type, causing print media queries to match. That makes DOM visibility, layout, and computed-style assertions possible in the normal browser page. It does not open the operating system print dialog or paginate the document into a PDF. In Chromium, call \`page.pdf()\` to generate the printable artifact. Use both when you need precise CSS diagnostics and confidence in page fragmentation.

### Can Playwright test print styles in Firefox and WebKit?

Playwright can emulate media for browser-page assertions across its supported browser engines. PDF generation through \`page.pdf()\` is Chromium-only. A balanced suite can run semantic and computed-style checks in the engines your application supports, then keep artifact-level PDF tests in a named Chromium project. Verify behavior against the Playwright version pinned by your repository, because browser engines and printing behavior evolve with upgrades.

### Why does my PDF omit background colors?

Browsers commonly treat printed backgrounds differently to save ink. With Playwright PDF generation, set \`printBackground: true\` when backgrounds are part of the contract. Also inspect print CSS for declarations that intentionally replace backgrounds, and remember that exact color output can be adjusted by the browser’s print color handling. Assert the required contrast and meaning, not decorative pixels that have no business value.

### Should I use visual snapshots for every printed document?

No. Use them for representative layouts where typography, spacing, and pagination carry meaningful risk. Prefer semantic and computed-style assertions for most variants because they are faster and explain failures directly. Cover boundary fixtures such as long tables and oversized identifiers with selected PDF renders. Keep the browser version, fonts, locale, and data deterministic, and require human review when accepting a changed baseline. This yields useful visual protection without a maintenance-heavy wall of snapshots.
`,
};
