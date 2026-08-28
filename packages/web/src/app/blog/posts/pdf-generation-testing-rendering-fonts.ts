import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing PDF Generation: Font Embedding, Raster Diffs, and Viewer Drift',
  description: 'pdf generation testing for embedded fonts, tofu glyphs, margins, multi-page layout, text extract checks, and cross-viewer PNG diffs in continuous CI.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing PDF Generation: Font Embedding, Raster Diffs, and Viewer Drift

PDF generation testing verifies that your system emits a valid PDF with the right pages, fonts, text, images, and geometry, then proves the file still renders correctly in real viewers. Do it in layers: assert the \`%PDF-\` magic and page count, check font embedding and missing glyphs, extract text with \`pdftotext\`, rasterize pages to PNGs and compare with a pixel threshold, and keep invoice or statement baselines in CI. A green download alone is not coverage.

Treat the PDF as both a binary contract and a visual product. Customers open it in Chrome print preview, macOS Preview, Acrobat, and mobile readers. Those paths disagree about fonts, spacing, and soft hyphenation. Your suite has to catch structure bugs and pixel drift before finance or support finds them.

## Byte Gates Before You Argue About Pixels

Start every PDF generation testing suite with cheap byte and metadata checks. They fail fast, run on any OS image, and prevent you from rasterizing garbage. Confirm the file begins with \`%PDF-\`, ends with a trailer marker in normal cases, reports a stable page count, and declares an expected page size. Tools such as \`pdfinfo\` from Poppler are enough for metadata. You do not need a full PDF parser to catch truncated downloads, empty bodies, or accidental HTML error pages saved with a \`.pdf\` extension.

\`\`\`ts
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function assertPdfMagic(path: string): Promise<void> {
  const bytes = await readFile(path);
  const header = bytes.subarray(0, 5).toString('utf8');
  if (header !== '%PDF-') {
    throw new Error(\`Expected %PDF- magic, got \${JSON.stringify(header)}\`);
  }
}

export async function readPageCount(path: string): Promise<number> {
  const { stdout } = await execFileAsync('pdfinfo', [path]);
  const match = stdout.match(/^Pages:\\s+(\\d+)/m);
  if (!match) {
    throw new Error('pdfinfo did not report Pages');
  }
  return Number(match[1]);
}
\`\`\`

Keep a fixture matrix for generators you actually ship: HTML-to-PDF from a headless browser, server-side libraries that draw with a canvas-like API, and templating engines that merge data into a fixed layout. Each generator fails differently. Browser print paths are sensitive to CSS, webfonts, and animation. Library paths are sensitive to font files on disk, subsetting, and image encoding.

| Gate | What it proves | Typical tool |
|---|---|---|
| Magic bytes | Response is a PDF, not HTML or JSON | Byte assert on \`%PDF-\` |
| Page count | Pagination and blank-page bugs | \`pdfinfo\` |
| Page size | Letter vs A4 vs custom crop | \`pdfinfo\` or parser |
| Embedded fonts | Required faces are inside the file | Font listing / embedding check |
| Extracted text | Content exists independent of pixels | \`pdftotext\` |
| Raster diff | Layout and glyph rendering | pdfium or Poppler render + PNG compare |

Wire the download path the same way you would for any binary export. In Playwright, wait for the download event, save the file, then run the byte gates before any visual work. If your product also exports tabular reports, keep the PDF lane separate from [CSV export testing for injection and encoding](/blog/csv-export-testing-injection-encoding). Both are download contracts, but CSV risks formula injection while PDF risks fonts, pagination, and viewer drift.

\`\`\`ts
import { test, expect } from '@playwright/test';
import { assertPdfMagic, readPageCount } from './pdfAssert';

test('invoice download is a real multi-page PDF', async ({ page }) => {
  await page.goto('/invoices/1001');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await downloadPromise;
  const target = await download.path();
  if (!target) {
    throw new Error('Playwright did not retain a download path');
  }

  await assertPdfMagic(target);
  expect(await readPageCount(target)).toBe(2);
});
\`\`\`

## Font Embedding, Subsetting, and Missing Glyph Tofu

Fonts are the most common silent PDF defect. A document can open, show the right strings when you copy text, and still look wrong because the viewer substituted a fallback face. PDF generation testing must distinguish three states: fonts fully embedded, fonts subset-embedded, and fonts referenced but not embedded. Subsetting is normal and desirable for size. Missing embedding is a defect when the target machines do not have that face installed.

Missing glyphs show up as tofu boxes, blank gaps, or wrong script shapes. The bug is often not "font missing entirely" but "subset built from Latin fixtures while production data includes Polish diacritics, Vietnamese tones, or emoji." Seed fixtures with the real Unicode ranges your customers use. If you only test \`John Smith\` and \`Invoice #1\`, you will ship tofu for \`Łukasz\` and \`Nguyễn\`.

| Symptom | Wrong first theory | Better check |
|---|---|---|
| Boxes instead of letters | CSS color or opacity | Glyph coverage for that code point |
| Text shifts between viewers | "Preview is buggy" | Embedding vs system fallback face |
| File size suddenly huge | Uncompressed images only | Full font embedded without subset |
| Copy/paste text is correct, look is wrong | "Visual flake" | Different face metrics after substitution |
| RTL looks mirrored or reordered | Generator bug only | Logical vs visual order + shaping |

A practical embedding check is to list fonts in the PDF and assert expected faces are marked embedded or subset. Pair that with a text fixture that forces those faces to render uncommon glyphs. Then rasterize. Text extraction alone will not catch tofu if the extractor reads the Unicode map while the page stream cannot paint the outline.

When HTML-to-PDF is your generator, freeze webfont loading the same way you freeze animation before screenshots. Fonts that arrive after first paint produce intermittent metric shifts. Techniques from [visual testing animation freeze strategies](/blog/visual-testing-animation-freeze-strategies) transfer directly: wait for \`document.fonts.ready\`, disable transitions, and avoid live clocks in the print stylesheet before you print or snapshot.

## Page Geometry: Size, Margins, Pagination, and Image DPI

Page geometry bugs feel cosmetic until legal statements put totals on the wrong page or clip signatures. Assert MediaBox / crop intent through metadata or a parser, then assert margins visually with raster diffs on sparse pages. Empty regions make threshold compares noisy if you only look at full-page hashes, so prefer region masks for header, footer, body, and totals blocks.

Pagination deserves its own fixtures: short one-page invoice, medium two-page statement, and a deliberately long multi-page report that forces table row breaks. Check that repeating headers do not collide with the first body row, that orphaned totals do not sit alone with misleading context, and that page numbers are monotonic. For HTML-to-PDF, \`break-inside\` and table row fragmentation are frequent sources of drift between Chrome versions.

Images add DPI and color-space risk. A logo that looks sharp on a Retina UI can print soft if the PDF embeds a low-resolution bitmap stretched across inches. Conversely, embedding multi-megabyte PNGs without downsampling explodes file size and slows email delivery. Your PDF generation testing should record expected image dimensions in points or inches, not only CSS pixels from the web preview.

\`\`\`ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function extractPdfText(path: string): Promise<string> {
  const { stdout } = await execFileAsync('pdftotext', ['-layout', path, '-']);
  return stdout;
}

export async function assertContainsAll(
  path: string,
  needles: string[],
): Promise<void> {
  const text = await extractPdfText(path);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(\`Missing text \${JSON.stringify(needle)}\`);
    }
  }
}
\`\`\`

Use layout-preserving extraction when column order matters. Plain extraction can reorder reading order in multi-column layouts and give false confidence. Still treat extraction as a content oracle, not a visual oracle. A perfect text dump can hide overlapping strings, white text on white backgrounds, or glyphs painted outside the crop box.

## Text Extraction Versus Visual Raster Diffs Across Viewers

PDF generation testing needs both oracles because they catch different classes of bugs. Text extraction catches missing line items, wrong currency codes, truncated account numbers, and localization mistakes. Raster diffs catch kerning changes, wrong face substitution, margin collapse, watermark opacity, and stamp placement. Neither replaces the other.

Cross-viewer diffs are where teams get burned. Chrome print, Preview, and Acrobat can all be "correct" relative to the PDF spec while disagreeing on hinting, overprint-ish effects, or how they rasterize thin lines. Decide which viewer is contractual for customers, then treat others as compatibility smoke. Do not chase pixel identity across every viewer. Chase identity against a chosen rasterizer in CI, plus spot checks on the contractual viewer during releases.

| Oracle | Strengths | Blind spots |
|---|---|---|
| Structure / magic | Fast CI signal | Ignores layout |
| \`pdftotext\` | Stable content asserts | Misses tofu and overlap |
| Single rasterizer PNG | Repeatable layout gate | May not match customer viewer |
| Multi-viewer spot check | Real user risk | Expensive and noisy |
| Form field inspect | Interactive PDFs | Irrelevant for flat invoices |

A good default is: Poppler or pdfium rasterization in CI at a fixed DPI, perceptual or absolute pixel threshold with anti-alias tolerance, masked dynamic regions (timestamps, QR payloads if they rotate), and a small manual matrix for Acrobat and Preview on release candidates. Store baselines as page PNGs or a lossless intermediate, not as the PDF alone. When the PDF generator changes intentionally, refresh baselines in the same PR that changes output.

## Failure Story: The Invoice Total Matched Until Finance Opened Acrobat

Symptom: nightly Playwright jobs downloaded invoices, asserted \`%PDF-\`, page count 2, and extracted text that included the grand total. Support still received screenshots from finance where the total appeared clipped on page two and the customer address used a different typeface.

Wrong theory: the team blamed "Acrobat being strict" and added a larger pixel threshold to silence CI diffs from Chrome print. The text oracle still passed, so the suite stayed green.

Actual cause: the HTML-to-PDF path loaded a marketing webfont for headings but only subsetted glyphs present in English fixtures. Production invoices included street names with diacritics. Chrome on the CI image had the full face installed as a system fallback, so local rasterization looked acceptable. Acrobat on locked-down finance laptops did not. The fallback face had wider metrics, which pushed the totals block into the bottom margin and clipped it under a fixed footer.

Fix: embed the licensed face with a subset built from a Unicode fixture pack that includes every required script range, assert embedding in CI, add a raster mask around the totals region with a tight threshold, and fail the job if \`pdfinfo\` or a font listing step cannot prove embedding. After that, the Acrobat-only clipping reproduced in CI as a totals-region pixel failure even when full-page extraction still saw the correct characters.

That incident is also the template for what people get wrong: they treat text extraction as proof of visual correctness. Extraction proves characters exist in the content stream or Unicode map. It does not prove the page paints those glyphs with the intended face, size, and metrics inside the printable area.

## What People Get Wrong About PDF Snapshots

Teams often snapshot the on-screen HTML preview and call it PDF coverage. The preview is a useful early signal, but print CSS, page breaks, headers, footers, and embedded fonts diverge from screen CSS. Another mistake is hashing the entire PDF binary. Incremental generator changes, timestamp metadata, and non-deterministic object IDs flip the hash without a user-visible change. Prefer normalized structure checks plus page rasters.

People also overfit to one machine. A developer laptop with design fonts installed will never reveal embedding gaps. CI images must omit those faces or explicitly verify embedding so fallback cannot hide the bug. Finally, teams ignore file size and image DPI until email gateways start stripping attachments. Add a soft budget assert for bytes and a hard assert for required logo resolution.

If you are building the QA skill set for this work, practice outside the product suite: small generators, deliberate tofu fixtures, and side-by-side viewer opens. Resources such as qaskills.sh and the qaskills CLI are useful for drilling export and visual judgment without waiting for a full app environment.

## Playwright Downloads, CLI Wrappers, and Structure Assertions

Runnable Node samples should stay close to real CI agents. Download with Playwright, assert magic bytes, query page count with \`pdfinfo\`, extract text with \`pdftotext\`, then optionally rasterize. Keep CLI wrappers thin so you can swap Poppler for another renderer later without rewriting business asserts.

\`\`\`ts
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function assertStablePayload(
  path: string,
  allowedHashes: string[],
): Promise<void> {
  const bytes = await readFile(path);
  const digest = sha256(bytes);
  if (!allowedHashes.includes(digest)) {
    throw new Error(\`Unexpected PDF digest \${digest}\`);
  }
}
\`\`\`

Binary digest asserts are appropriate only when the generator is fully deterministic and you control metadata. Many HTML-to-PDF pipelines are not. Prefer digest checks for small library-built PDFs with frozen clocks and frozen IDs. For browser print pipelines, rely on page count, text needles, font embedding, and raster thresholds instead.

\`\`\`ts
import { readFile } from 'node:fs/promises';

export type RasterizePage = (
  pdfPath: string,
  pageIndexZeroBased: number,
  outPngPath: string,
  dpi: number,
) => Promise<void>;

export async function comparePagePng(
  baselinePath: string,
  candidatePath: string,
  threshold: number,
  rasterDiff: (a: Buffer, b: Buffer) => number,
): Promise<void> {
  const a = await readFile(baselinePath);
  const b = await readFile(candidatePath);
  const score = rasterDiff(a, b);
  if (score > threshold) {
    throw new Error(\`Raster diff \${score} exceeded threshold \${threshold}\`);
  }
}

// Inject a Poppler- or pdfium-backed rasterizePage that pins DPI.
export async function assertPageLooksLike(
  rasterizePage: RasterizePage,
  pdfPath: string,
  pageIndex: number,
  baselinePng: string,
  candidatePng: string,
  threshold: number,
  rasterDiff: (a: Buffer, b: Buffer) => number,
): Promise<void> {
  await rasterizePage(pdfPath, pageIndex, candidatePng, 150);
  await comparePagePng(baselinePng, candidatePng, threshold, rasterDiff);
}
\`\`\`

Keep the renderer behind an interface so product tests never hard-code CLI details. Production compares should decode PNGs to RGBA, ignore compressed-byte identity, apply per-channel thresholds, and support bounding-box masks. The product rule is pinning DPI, color management assumptions, and which pages are in scope for PDF generation testing each release.

## CI Pipelines That Compare Page PNGs

CI should promote PDF generation testing from a laptop ritual to a gate. Install Poppler (or your chosen renderer) on the job image, generate fixtures for a frozen dataset, upload failure artifacts, and fail on threshold breaches. Use \`actions/upload-artifact@v4\` to retain the candidate PDF, page PNGs, and a diff montage when a job fails. Engineers need those artifacts more than a red X.

\`\`\`yaml
name: pdf-generation-testing
on:
  pull_request:
jobs:
  pdf:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install poppler utilities
        run: sudo apt-get update && sudo apt-get install -y poppler-utils
      - name: Install dependencies
        run: npm ci
      - name: Generate and compare invoice PDFs
        run: npm run test:pdf
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: pdf-diff-artifacts
          path: |
            artifacts/pdf/**
            artifacts/png/**
            artifacts/diff/**
\`\`\`

Keep baselines in git for small suites, or in object storage for large ones. Refreshing baselines must be deliberate: a labeled PR, a short rationale, and a visual review of the page PNGs. Auto-accepting diffs because "fonts look fine to me" recreates the Acrobat finance failure.

Parallelize by document type rather than by random page. Invoices, remittance advices, and multi-page statements have different risk profiles. A one-page receipt can share a fast job. A 40-page statement may need sampled pages plus mandatory first/last/totals pages.

## Unicode, RTL, and Form Fields in Generated PDFs

Unicode and bidirectional text expose shaping bugs that Latin-only fixtures never touch. Include Arabic or Hebrew samples if you ship those locales. Assert both extracted logical text and raster appearance. It is possible for extraction to return the right characters while glyphs render in the wrong order or with broken ligation. For mixed LTR numbers inside RTL paragraphs, add a fixture that finance will recognize as wrong at a glance, such as account numbers and currency amounts.

Form fields appear when you generate fillable PDFs for tax packs, claims, or onboarding. Flat raster diffs will not prove field names, types, or tab order. Inspect the form catalog: required fields present, read-only flags correct, and default values matching the seed data. If your product flattens forms before customer download, assert flattening by confirming fields are absent and pixels show the filled values.

Accessibility tags and bookmarks are optional product requirements, but if you promise them, test them. A tagged PDF that loses heading structure after a generator upgrade is a regression even when pixels match.

## Generators Under Test: HTML-to-PDF and Server Libraries

HTML-to-PDF paths need deterministic print CSS, loaded fonts, and frozen time. Disable animations, replace live relative dates with fixed stamps in test builds, and avoid network-dependent assets during print. Server-side libraries (including workflows conceptually similar to pdf-lib style composition) need explicit font bytes registered before draw calls. If the library subsets automatically, your Unicode fixtures still matter because the subset is only as complete as the strings you drew.

Test each generator behind the same product-level contract: page count, required text, embedded fonts, max file size, and raster thresholds for critical regions. That contract lets you swap engines without rewriting every assertion. Document known viewer limitations next to the contract so QA does not file bugs against Acrobat for differences you already accepted.

Regression baselines for invoices and statements should include edge amounts (zero total, negative adjustment, long legal footnotes), edge identities (long names, multi-line addresses), and edge locales. Refresh baselines when legal copy changes, not when a dependency quietly changes hinting. When dependency upgrades alter rasterization, treat that as a conscious visual change with artifact review, the same way you would treat a UI screenshot suite.

## Frequently Asked Questions

### What does pdf generation testing include in a minimum CI gate?

A minimum gate asserts \`%PDF-\` magic, expected page count, a short list of required text needles via \`pdftotext\`, and at least one raster comparison for a critical region such as totals or letterhead. Add an embedding check whenever custom fonts are contractually required. That set catches truncated downloads, blank pages, missing line items, and many font substitution bugs without demanding pixel identity across every viewer on every commit.

### How should teams compare Chrome print, Preview, and Acrobat output?

Pick one rasterizer as the CI source of truth, usually Poppler or pdfium at a pinned DPI, and keep Preview plus Acrobat as release smoke on a small fixture pack. Require pixel identity only against the CI rasterizer. For the human viewers, look for clipped content, wrong faces, and broken RTL rather than exact anti-alias matches. Record which viewer customers are told to use for legal documents so support can answer consistently.

### Why do text extraction tests pass while customers still see tofu?

Extraction can read Unicode mappings even when the page cannot paint outlines for every code point on a machine without the face installed. Customers then see boxes or fallback glyphs while \`pdftotext\` still prints the correct characters. Fix this by embedding or subsetting fonts with fixtures that cover real scripts, asserting embedding in CI, and raster-diffing pages that include those glyphs on an image that lacks the face as a system font.

### When is hashing the PDF file a bad idea for regressions?

Full-file hashes fail when generators write timestamps, non-stable object IDs, or compressed streams that change without user-visible differences. Use hashes only for fully deterministic builders with frozen metadata. Otherwise prefer structure asserts, extracted text, font embedding checks, and masked page PNG comparisons with an explicit pixel threshold so intentional layout changes are reviewed as visual diffs instead of silently churning digests every build.
`,
};
