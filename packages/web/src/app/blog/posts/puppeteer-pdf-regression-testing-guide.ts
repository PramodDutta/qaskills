import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Puppeteer PDF Regression Testing Guide',
  description:
    'Learn Puppeteer PDF regression testing with print CSS checks, repeatable rendering, page snapshots, PDF metadata, and CI-friendly document diffs.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Puppeteer PDF Regression Testing Guide

The invoice looked perfect in Chrome and still shipped with the tax table split across two printed pages. Nobody noticed because the browser test asserted the DOM, not the PDF bytes that customers downloaded. Puppeteer is useful here because it can drive the same Chromium print pipeline your application relies on, save the output, and let a regression suite inspect both the rendered pages and the document metadata.

PDF regression testing is different from screenshot testing. A screenshot validates a viewport. A PDF validates print media, page boxes, paper size, margins, font embedding behavior, pagination, headers, footers, and generated content such as page numbers. Puppeteer gives you a direct API for that print path through \`page.pdf()\`, but a durable test suite needs more than calling that method once. You need deterministic data, predictable fonts, isolation from animation and network drift, and a comparison strategy that can tell a harmless timestamp change from a broken layout.

This guide focuses on Puppeteer, not a generic visual testing lecture. We will cover how to render PDFs repeatably, how to inspect text and page count, how to rasterize pages for image diffs, how to test print-only CSS, and how to keep CI artifacts useful when the failure appears only in a generated document. If you are deciding whether Puppeteer or Playwright should own browser automation more broadly, the separate [Puppeteer vs Playwright testing comparison](/blog/puppeteer-vs-playwright-testing) is a better starting point. If your stack already leans toward Playwright, the [Playwright screenshots and PDF guide](/blog/playwright-screenshots-pdf-guide-2026) covers the parallel workflow.

## Reproducing Chromium's Print Path

Puppeteer renders a PDF from a page that already exists in Chromium. The usual shape is simple: open a page, wait until application data is stable, switch to print media if needed, call \`page.pdf()\`, and store the file as a test artifact. The hard part is making sure that every run sees the same inputs.

PDF output can change because of four common causes:

| Source of drift | What changes in the PDF | Practical control |
|---|---|---|
| Live data | Totals, rows, names, page breaks | Seed the scenario or route the API response |
| Fonts | Text width, line wrapping, glyph fallback | Install fonts in CI and wait for \`document.fonts.ready\` |
| Time zones | Date strings, generated file names | Set test data explicitly and run CI with a fixed \`TZ\` |
| Network timing | Missing images or late charts | Wait for a page-level readiness signal, not only \`networkidle0\` |

The first test should not compare pixels. It should prove the PDF can be produced from a controlled route, with the expected paper size and minimum content. That catches broken auth, server failures, and missing print assets before you invest in visual diffs.

\`\`\`typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer';

const outputDir = path.join(process.cwd(), 'artifacts', 'pdf');

async function renderInvoicePdf(invoiceId: string) {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--font-render-hinting=none'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(\`http://localhost:3000/invoices/\${invoiceId}/print\`, {
      waitUntil: 'networkidle0',
    });
    await page.emulateMediaType('print');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('[data-pdf-ready="true"]');

    const filePath = path.join(outputDir, \`invoice-\${invoiceId}.pdf\`);
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '12mm', right: '12mm', bottom: '16mm', left: '12mm' },
    });

    return filePath;
  } finally {
    await browser.close();
  }
}

const pdfPath = await renderInvoicePdf('INV-1007');
console.log(pdfPath);
\`\`\`

The readiness selector is deliberate. A page can be network-idle while a client-side chart is still drawing or a web font is still resolving. Put a small readiness flag in the print route after the data, fonts, and expensive client components are complete. That is cleaner than sprinkling arbitrary waits through the test.

## Print CSS Checks Before Visual Diffs

Many PDF regressions start as CSS mistakes: a component ignores \`@media print\`, a sticky header remains sticky in paged media, a \`break-inside: avoid\` rule disappears during refactoring, or a design-system token changes a margin that used to align with the printable area. Puppeteer lets you inspect the computed print styles before generating the PDF. These assertions are cheap and explain failures better than a red pixel overlay.

| Print behavior | CSS or DOM signal to assert | Failure it catches early |
|---|---|---|
| Screen-only navigation hidden | \`display: none\` under print media | Navbar appears at top of every PDF |
| Legal footer visible | Footer element exists and is not hidden | Required disclosure missing |
| Section kept together | \`break-inside: avoid\` or \`page-break-inside: avoid\` | Signature block split from terms |
| Backgrounds printed | \`printBackground: true\` and non-transparent styles | Status badge loses meaning |
| CSS page size honored | \`preferCSSPageSize: true\` with \`@page\` | Letter output produced instead of A4 |

Here is a focused style test that runs before the heavier PDF comparison:

\`\`\`typescript
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/invoices/INV-1007/print', {
  waitUntil: 'networkidle0',
});
await page.emulateMediaType('print');

const printState = await page.evaluate(() => {
  const nav = document.querySelector('[data-testid="app-nav"]');
  const summary = document.querySelector('[data-testid="invoice-summary"]');
  const footer = document.querySelector('[data-testid="legal-footer"]');

  return {
    navDisplay: nav ? getComputedStyle(nav).display : 'missing',
    summaryBreakInside: summary ? getComputedStyle(summary).breakInside : 'missing',
    footerDisplay: footer ? getComputedStyle(footer).display : 'missing',
    pageReady: Boolean(document.querySelector('[data-pdf-ready="true"]')),
  };
});

assert.equal(printState.navDisplay, 'none');
assert.match(printState.summaryBreakInside, /avoid/);
assert.notEqual(printState.footerDisplay, 'none');
assert.equal(printState.pageReady, true);

await browser.close();
\`\`\`

This is not a replacement for rendering the PDF. It is a fast diagnostic layer. When the style test fails, the fix is usually obvious. When the style test passes but the visual PDF diff fails, you know to look at pagination, fonts, image rasterization, or content dimensions.

## Reading the PDF Like a Document

Visual diffs are powerful, but they are not always the first assertion you want. A PDF can be parsed for page count, text, metadata, and rough structural clues. Document-level checks catch missing sections without being sensitive to antialiasing. They also help when legal, finance, or compliance teams care about exact text more than screenshots.

Use a PDF parser for these assertions. The common Node package \`pdf-parse\` can read text and page count. It will not preserve every layout detail, but it is good enough for smoke checks around generated documents.

\`\`\`typescript
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import pdf from 'pdf-parse';

const buffer = await fs.readFile('artifacts/pdf/invoice-INV-1007.pdf');
const parsed = await pdf(buffer);

assert.equal(parsed.numpages, 2);
assert.match(parsed.text, /Invoice INV-1007/);
assert.match(parsed.text, /Payment due: 2026-08-01/);
assert.match(parsed.text, /Subtotal\\s+USD 1,250\\.00/);
assert.match(parsed.text, /Tax\\s+USD 100\\.00/);
assert.doesNotMatch(parsed.text, /Internal draft only/);
\`\`\`

Be careful with strict whitespace. PDF text extraction can join columns or insert newlines differently across library versions. Assert important phrases, totals, dates, and forbidden strings, not a full copied page. Full-text snapshots become noisy because the text order in a PDF is not always the reading order a human sees.

Document checks are also good for negative assertions. If a print route accidentally includes admin-only notes, debug JSON, or a hidden feature flag panel, text extraction will often catch it even when the visual diff is hard to read.

## Turning Pages Into Diffable Images

The most reliable visual comparison pattern is: render PDF, rasterize each page to PNG, compare those PNGs against approved baselines. Puppeteer creates the PDF, and a separate tool turns pages into images. Teams commonly use Poppler tools such as \`pdftoppm\`, ImageMagick, or a Node wrapper around PDF rendering. The principle is more important than the wrapper: pin the renderer in CI so the baseline and current run use the same rasterization engine.

A practical diff pipeline has three layers:

| Layer | Artifact | Assertion style |
|---|---|---|
| Generation | PDF file | Exists, non-empty, parseable |
| Rasterization | One PNG per page | Page count matches expected output |
| Comparison | Diff PNG and numeric mismatch | Threshold tuned for antialiasing, not layout shifts |

The following script uses ImageMagick's \`magick compare\` command after pages have been rasterized into PNG files. The exact rasterizer can vary by environment, but the comparison idea is stable.

\`\`\`bash
mkdir -p artifacts/pdf/pages artifacts/pdf/diff
pdftoppm -png -r 144 artifacts/pdf/invoice-INV-1007.pdf artifacts/pdf/pages/invoice

magick compare \
  -metric AE \
  test-baselines/pdf/invoice-1.png \
  artifacts/pdf/pages/invoice-1.png \
  artifacts/pdf/diff/invoice-1.png
\`\`\`

Absolute-error thresholds should be small for documents. A one-pixel antialiasing change near a glyph is usually harmless. A shifted table border, missing logo, or extra page is not. I prefer a low numeric threshold plus manual review of the generated diff artifact on failure. If the tool reports 70 changed pixels on a two-page invoice and the diff image shows only text smoothing, approve it. If it reports thousands of changed pixels, treat it as a layout regression until proven otherwise.

Do not baseline every customer document shape. Pick representative fixtures: one single-page invoice, one multi-page invoice, one invoice with discount rows, one with a long billing address, one localized version if your typography changes by locale, and one document with the maximum row count you claim to support.

## Pagination Is the Main Bug Surface

PDFs fail at page boundaries. Web components are often built for infinite scroll, then asked to behave like paper. A table row can split across pages. A signature block can land alone on a blank final sheet. A header can repeat incorrectly. A page number can be off by one because a cover page is optional.

Puppeteer cannot directly hand you a semantic page model, so you need indirect checks. Use fixed fixtures whose expected page count is known. Parse text for section ordering. Rasterize pages and inspect artifacts. For important page breaks, add print-only markers to the DOM and measure their position before printing.

\`\`\`typescript
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.goto('http://localhost:3000/reports/annual-risk-summary/print', {
  waitUntil: 'networkidle0',
});
await page.emulateMediaType('print');
await page.waitForSelector('[data-pdf-ready="true"]');

const layout = await page.evaluate(() => {
  const marker = document.querySelector('[data-print-marker="executive-signoff"]');
  const tableRows = [...document.querySelectorAll('[data-testid="risk-row"]')];

  return {
    signoffTop: marker?.getBoundingClientRect().top ?? -1,
    viewportHeight: window.innerHeight,
    rowHeights: tableRows.map((row) => row.getBoundingClientRect().height),
  };
});

assert.ok(layout.signoffTop > 0);
assert.ok(layout.rowHeights.every((height) => height < 120));

await browser.close();
\`\`\`

This kind of DOM measurement does not prove final pagination, but it catches pathological inputs that will create ugly PDFs. If a row is 480 pixels tall because a long unbroken string escaped wrapping, it will likely damage the PDF. Use DOM measurements to catch the shape of the problem, then use the PDF artifact to confirm the real document output.

## Making CI Output Reviewable

A PDF regression test that says "expected 0 but got 1" is nearly useless. The CI job should upload the current PDF, page PNGs, and diff images. Store the baseline path in the test name. Include the route, fixture id, paper format, and commit SHA in artifact names. Make the failed document easy to open without reproducing the run locally.

For CI, keep the browser environment boring. Install the fonts your app uses. Set \`TZ=UTC\` or the business time zone your documents require. Disable live analytics and third-party widgets on print routes. Stub data through your backend test fixture, not through random browser interception if the document depends on server-rendered content.

Baseline review should be explicit. Do not auto-update PDFs in CI. A changed total, changed page count, or shifted disclaimer deserves a human review. Keep a small approval command that regenerates baselines locally after the reviewer confirms the new output is intended.

## Debugging Failures From the Artifact Backward

When a PDF test fails, start from the artifact rather than the assertion line. Open the current PDF, the baseline page image, and the diff image side by side. If the PDF itself is wrong, stay in the print route. If the PDF is correct but the page PNG is wrong, inspect the rasterizer version or font installation. If only the diff threshold fails, inspect antialiasing and masking.

Keep a small failure checklist for reviewers. Did the page count change? Did the first changed pixel appear near a page boundary? Did text wrap differently because a font changed? Did a hidden screen element appear under print media? Did a chart, barcode, signature, or logo fail to load? Each answer points to a different owner.

Avoid approving baselines from CI artifacts alone. A local approval run should regenerate the PDF from a known fixture, show the artifact, and update only the matching baseline files. If a command updates every PDF baseline, the review becomes impossible. Tight approval workflow protects the suite from becoming a rubber stamp.

PDF failures also deserve product language in the bug report. "Image diff exceeded threshold" is not enough. Write "invoice tax table starts on page two without its header" or "terms footer overlaps signature line." A document regression is a user-facing defect, and the report should describe the broken document, not only the tool output.

## Handling Dynamic Fields Without Ignoring Layout

Generated documents often contain fields that legitimately change: invoice issue dates, reference numbers, user names, build ids, and payment links. The lazy answer is to raise the pixel threshold until the test passes. That hides real layout damage. A better answer is to make dynamic fields explicit in the fixture and stable in the baseline.

For core regression fixtures, prefer fixed test values. An invoice dated \`2026-07-10\` is just as useful as one dated today, and it will not create daily churn. If the document must show the current date, isolate that behavior in a text assertion and keep visual baselines on deterministic documents. Do not let a timestamp force reviewers to approve a fresh PNG every morning.

Some dynamic content needs masking. For example, a payment QR code may be generated from a one-time token. If the QR position, size, and quiet zone are the layout contract, mask only the interior of the QR image during comparison and separately assert that the element exists with the expected dimensions. Keep the mask small and documented. A broad white rectangle across half the page turns the diff into decoration.

There is also a product question hiding here. If a PDF's legal value depends on a generated field, do not mask that field. Parse and assert it. A signature timestamp, total amount, customer address, invoice id, tax id, or payment terms should be verified as document data. Visual masking is for volatile rendering artifacts, not for business facts.

Baseline review should always show the unmasked PDF as an artifact. The masked comparison tells the automated suite whether the known volatile region changed. The unmasked PDF lets a reviewer confirm that the document still makes sense to a human. That distinction keeps the regression suite strict without making it brittle.

## Frequently Asked Questions

### Should I compare the PDF bytes directly?

Usually no. PDF files can contain metadata, object ordering, compression choices, and timestamps that change even when the pages look identical. Compare parsed document facts and rasterized page images instead. Byte comparison is only reasonable when you fully control the generator and strip volatile metadata.

### Why does my Puppeteer PDF differ between laptop and CI?

Fonts are the first suspect. Chromium can wrap text differently when CI falls back to another font. Install the same fonts, wait for \`document.fonts.ready\`, pin the container image, and avoid relying on system fonts that are not present in Linux.

### Is \`networkidle0\` enough before calling \`page.pdf()\`?

It is a useful signal, but it is not enough for rich pages. A chart may render after network idle, and a font can still be settling. Add an application-owned readiness marker such as \`data-pdf-ready="true"\` after the print route has finished its own work.

### How many PDF baselines should a suite keep?

Keep enough to cover layout classes, not every data permutation. A short document, a long document, a localized document, and a boundary case with long strings usually provide more value than dozens of nearly identical customer examples.
`,
};
