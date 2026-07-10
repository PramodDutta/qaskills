import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PDF Regression Testing Guide',
  description:
    'Create PDF regression testing that checks text, layout, metadata, and rendered pages so generated documents stay stable across every release.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# PDF Regression Testing Guide

The invoice looks fine in the browser preview, then a customer downloads the PDF and the tax line wraps onto a new page. Another release keeps the layout but drops searchable text because a font rendering path changed. PDF regression testing has to catch both kinds of failures: what a person sees and what downstream systems can extract.

PDFs are awkward test artifacts because they are documents, images, containers, and data sources at the same time. A serious suite checks text extraction, page count, metadata, layout-sensitive rendered output, links, bookmarks when relevant, and tolerance for expected differences such as timestamps or generated IDs. Treating a PDF as a single binary snapshot is usually too brittle and not diagnostic enough.

This guide is for teams that generate reports, invoices, statements, labels, certificates, compliance packets, or QA evidence bundles. For Playwright-specific capture patterns, see the [Playwright screenshots and PDF guide](/blog/playwright-screenshots-pdf-guide-2026). For broader release selection, connect these checks to your [regression testing strategies](/blog/regression-testing-strategies-guide).

## Decide what the PDF contract actually is

Before choosing tools, define what must stay stable. A bank statement may require exact totals, page headers, account masking, and metadata. A marketing export may care about visual appearance and links. A shipping label may care about barcode readability and exact physical dimensions. A test suite that compares everything with equal strictness will either fail constantly or miss what matters.

Break the contract into layers. Text content proves semantic output. Rendered images prove layout. Metadata proves document properties. Structural checks prove the file is usable by viewers and downstream systems. Domain-specific checks prove the business purpose, such as a barcode, signature block, or payment instructions.

| PDF aspect | Example assertion | Tooling fit |
|---|---|---|
| Text content | Invoice number, totals, customer name, legal footer | pdfplumber, PyMuPDF, pypdf |
| Page geometry | A4 or Letter size, expected orientation, page count | PyMuPDF, pypdf |
| Visual layout | Header alignment, table wrapping, chart rendering | PyMuPDF rendering plus image comparison |
| Metadata | Title, author, creation policy, no accidental producer change | pypdf or PyMuPDF metadata |
| Interactive elements | Links, annotations, bookmarks, form fields | pypdf, PyMuPDF |
| Domain artifacts | Barcode decodes, signature placeholder exists | Barcode decoder, OCR, custom checks |

The right suite usually combines several small checks. A visual diff alone may catch a missing total, but it will not explain whether the text disappeared, moved, or changed value. A text assertion alone may miss a footer printed over a table. Layered checks make failures actionable.

## Text extraction regression tests

Text extraction catches semantic regressions quickly. It is especially useful for generated documents where numbers, labels, and legal language matter. The test below uses pdfplumber to extract text from each page and assert normalized content. It deliberately ignores exact line breaks because PDF text extraction order can vary by renderer and font.

\`\`\`python
from pathlib import Path
import re
import pdfplumber


def normalize(text: str) -> str:
    return re.sub(r"\\s+", " ", text).strip()


def extract_pdf_text(path: Path) -> str:
    with pdfplumber.open(path) as pdf:
        return "\\n".join(page.extract_text() or "" for page in pdf.pages)


def test_invoice_pdf_contains_required_business_text():
    text = normalize(extract_pdf_text(Path("artifacts/invoice-INV-1007.pdf")))

    assert "Invoice INV-1007" in text
    assert "Acme QA Labs" in text
    assert "Subtotal $1,200.00" in text
    assert "Tax $96.00" in text
    assert "Total $1,296.00" in text
    assert "Payment due within 30 days" in text
\`\`\`

This is not a replacement for visual testing. It is a fast semantic gate. If this fails, the generated PDF may have the wrong data or may render text as paths instead of searchable text. Both are important. Searchable text matters for accessibility, indexing, copy-paste, legal discovery, and customer support workflows.

Normalize whitespace carefully. Over-normalizing can hide layout defects, while exact line matching can create noise. Use exact text assertions for short labels and values, then reserve layout checks for rendered comparisons.

## Rendering pages and comparing visual output

For layout regression, render pages to images and compare against approved baselines. PyMuPDF can open a PDF and render pages to pixmaps. Pillow can compare images. The example below uses a simple RMS difference threshold. Real suites often add masks for dynamic regions such as timestamps or generated QR codes.

\`\`\`python
from pathlib import Path
import fitz
from PIL import Image, ImageChops, ImageStat


def render_page(pdf_path: Path, page_index: int, output_path: Path) -> None:
    document = fitz.open(pdf_path)
    page = document.load_page(page_index)
    pixmap = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pixmap.save(output_path)
    document.close()


def rms_difference(actual: Path, expected: Path) -> float:
    actual_image = Image.open(actual).convert("RGB")
    expected_image = Image.open(expected).convert("RGB")
    diff = ImageChops.difference(actual_image, expected_image)
    stat = ImageStat.Stat(diff)
    squared = sum(value ** 2 for value in stat.rms) / len(stat.rms)
    return squared ** 0.5


def test_statement_first_page_visual_regression(tmp_path):
    actual_png = tmp_path / "statement-page-1.png"
    render_page(Path("artifacts/monthly-statement.pdf"), 0, actual_png)

    difference = rms_difference(actual_png, Path("baselines/statement-page-1.png"))
    assert difference < 2.0
\`\`\`

The threshold is domain-specific. A value near zero means nearly identical pixels. Antialiasing, font versions, and rendering engines can introduce tiny differences. Calibrate thresholds on your CI environment, not only on a developer laptop. If legal or label output must be pixel-perfect, pin the renderer, fonts, container image, and operating system.

Store rendered baselines with review discipline. Baseline updates should be code-reviewed like UI snapshot changes. The reviewer should see before and after images, not only a binary file diff. A baseline change that moves a total outside a table is a product defect, even if the test can be updated.

## Handling dynamic fields without hiding layout bugs

Generated PDFs often include run dates, document IDs, page numbers, personalized names, or barcodes. Dynamic content creates noise if you compare the whole rendered page. The solution is not to ignore the entire page. Mask or normalize the smallest region or text token that is expected to change.

For text extraction, replace known dynamic values with placeholders before assertions. For visual comparisons, mask rectangular regions in both actual and expected images. Keep masks small and documented. A mask covering the whole header because the date changes is too broad if the header also contains the company name and report title.

Dynamic tables are harder. If row order is not guaranteed, make that an explicit product decision. Financial documents and audit exports usually need stable ordering. Search result exports may not. The test should reflect the contract rather than the current implementation accident.

## Metadata, page count, and document structure

Metadata checks catch surprising release defects. A library upgrade might change the producer field, remove a title, or add creation dates in a different format. Some of those changes are harmless. Others break document management systems or compliance workflows.

| Check | Why it matters | Suggested strictness |
|---|---|---|
| Page count | Detects overflow, missing sections, blank-page insertion | Strict for fixed templates, range-based for variable reports |
| Page size | Shipping labels, forms, and print packets depend on dimensions | Strict with small tolerance |
| Title metadata | Document portals and accessibility tools may display it | Strict when product-owned |
| Creation date | Usually dynamic | Validate presence and format, not exact value |
| Encryption flag | Prevents accidental password protection or missing protection | Strict according to policy |
| Link annotations | Terms, payment, and support links must remain clickable | Strict for required links |

For pypdf-based metadata checks, read the document once and assert properties that are part of the contract. Avoid asserting every metadata field because producers may legitimately change when the rendering library changes. Contract-owned fields deserve strict checks. Tool-generated fields deserve policy checks.

## Testing tables and page breaks

Tables are where many PDF regressions appear. A column width changes, a long product name wraps, a total row splits from its label, or a page break leaves an orphaned header. Visual diff catches some of this, but targeted tests are often clearer.

Create fixture data that stresses the template: long names, empty optional fields, maximum decimal precision, many rows, non-ASCII names if supported, and boundary row counts around page breaks. For a 25-row invoice page, test 24, 25, and 26 rows. For a report section that can grow, test the first page, middle page, and final summary page.

When exact coordinates matter, PyMuPDF can inspect text blocks and bounding boxes. Use coordinate assertions sparingly because they are renderer-sensitive. They are appropriate for labels, certificates, forms, and documents with strict physical requirements. For ordinary reports, visual baselines are usually easier to maintain.

## Fonts, containers, and CI determinism

PDF visual tests are only as stable as the rendering environment. Missing fonts are the most common source of local vs CI differences. If the PDF generator falls back from Inter to Helvetica, a table may wrap differently. If CI has a different fontconfig setup, text metrics change.

Pin fonts in the repository or container image. Make the generator load those fonts explicitly. Run visual PDF tests in a consistent container. Record the PDF library version and the rendering library version. If you use browser-based PDF generation, pin the browser version through your toolchain and avoid relying on system fonts that are not installed in CI.

Locale and timezone also matter. Dates, currency, decimal separators, and page labels can change by environment. Set locale and timezone for deterministic tests unless the product contract explicitly varies by locale. Then create locale-specific baselines and text expectations.

## Comparing generated PDFs without binary snapshots

Binary PDF comparison is attractive because it is simple. It is also usually noisy. PDFs can differ in object IDs, compression, timestamps, metadata, and internal ordering while rendering identically. A binary diff can fail when users see no change, and pass when a semantic field remains present but is drawn in the wrong place as an image.

Prefer semantic and rendered comparisons. Use binary checks only for very specific artifacts where the byte stream itself is the product, such as signed files where any byte change invalidates a signature. Even then, test signature validity and document behavior, not only bytes.

If you must compare raw PDFs, normalize first. Remove or ignore dynamic metadata, ensure deterministic creation settings if the library supports them, and keep the assertion message useful. A failure that says files differ at byte 43821 tells a developer almost nothing about the document regression.

## Integrating PDF checks into release flow

Put fast text and metadata checks in pull request CI. Run visual rendering for the most important templates on pull requests if the environment is stable. Run broader template matrices nightly or before releases: locales, currencies, long data, page break boundaries, and optional sections.

Artifacts are essential. When a PDF test fails, CI should publish the generated PDF, rendered PNGs, baseline PNGs, and diff images. Without artifacts, engineers have to reproduce locally before they can even understand the failure. That slows triage and encourages blind baseline updates.

Assign ownership by document template. Finance owns invoice content, compliance owns legal packet wording, support owns customer exports, and QA owns the regression framework. Baseline approvals should include the product owner for documents that customers or regulators see.

## Accessibility and searchable text checks

A PDF can look correct and still be difficult to use. Searchable text, reading order, tags, alt text for meaningful images, and document title all affect accessibility and downstream workflows. Not every generated PDF needs to be a fully tagged accessible document, but customer-facing and regulated documents should have explicit accessibility expectations.

Text extraction tests are a first signal. If the page renders visually but extract_text returns nothing important, the generator may have converted text to paths or images. That harms search, copy-paste, screen readers, and indexing. For high-value documents, add a check that the extracted text contains section headings in the expected order. Reading order defects often appear when multi-column layouts or absolutely positioned HTML are converted to PDF.

Automated accessibility validation for PDFs is more specialized than web accessibility testing. Use it where the document contract requires tagged PDF compliance, but do not pretend a simple text assertion proves full accessibility. Combine automated checks with manual review for templates that customers depend on.

## Testing generated PDFs from HTML

Many teams generate PDFs from HTML through a browser engine. That makes CSS part of the document contract. Print styles, page margins, font loading, image resolution, and media emulation can all change output. A browser screenshot test is not enough because print layout uses different rules than screen layout.

Keep PDF-specific CSS under test. Use fixture data that triggers page breaks, long table rows, hidden print-only sections, and repeated headers. If the generator waits for network idle, make sure fonts and images are loaded before printing. A missing webfont can change line breaks and produce a visual diff that looks like a content bug.

For Playwright or browser-based generation, pin the browser version in CI. Browser upgrades can be legitimate baseline events, but they should be reviewed. When a browser upgrade changes PDF rendering, generate before and after artifacts for the affected templates and have the template owner approve the new baseline.

## Numeric and financial precision in PDFs

Financial PDFs need more than visible totals. They need consistent rounding, currency symbols, negative number formatting, tax breakdowns, and subtotal relationships. Add semantic tests that recompute totals from the source fixture and compare them to extracted text. This catches cases where the document displays a rounded line item but totals from unrounded values, or where a localization change swaps separators incorrectly.

For multi-currency documents, create fixtures with currencies that have different decimal conventions. Do not assume every amount has two decimal places. If the product supports credits or refunds, include negative values and zero totals. These examples often expose alignment and formatting bugs that ordinary positive invoice fixtures miss.

Keep the calculation source clear. The PDF test should not reimplement the entire billing engine. It should verify that the generated document accurately reflects a known billing result fixture. Business calculation tests belong closer to the billing code; PDF tests verify representation.

## Approval workflow for baseline updates

Baseline updates need a stronger workflow than ordinary snapshot approval because PDFs often leave the engineering organization. A changed invoice, certificate, or compliance report may affect finance, legal, customer support, or external auditors. Route baseline reviews to the owner of the document, not only the developer who changed the template.

The review packet should include the old PDF, new PDF, rendered page images, visual diffs, and a short explanation of why the change is expected. If the change is caused by a library upgrade, mention that. If it is caused by a product requirement, link the requirement in the pull request description. The reviewer should not have to infer whether a moved footer is intentional.

Keep rejected baselines out of the repository. When a visual diff reveals a real defect, preserve the failed artifact in CI or the issue tracker, then fix the template and generate a new candidate. Do not approve a bad baseline to unblock the branch and promise to clean it later. PDF regressions are easy to normalize once they become accepted images.

Baseline hygiene is also audit hygiene: months later, reviewers should still understand why the approved customer document changed in production.

That record matters during renewals and disputes.

## Frequently Asked Questions

### Should I compare PDF files byte for byte?

Usually no. Binary PDFs can change because of metadata, compression, object ordering, or timestamps while the visible document is identical. Prefer text, metadata, structure, and rendered-page comparisons unless the byte stream itself is the contract.

### Which Python library should I use for PDF regression tests?

Use pdfplumber for convenient text extraction, PyMuPDF for rendering and geometry checks, and pypdf for metadata and structural inspection. Many suites use more than one because each library is better at a different layer.

### How do I handle timestamps in visual PDF baselines?

Mask the smallest timestamp region in the rendered image, or generate deterministic timestamps during tests. Do not mask an entire header if only the date changes, because that can hide real layout regressions.

### Why does a PDF visual test pass locally but fail in CI?

The usual causes are missing fonts, different renderer versions, different browser versions for HTML-to-PDF generation, timezone differences, or locale differences. Pin the environment and install fonts explicitly.

### Are text extraction tests enough for invoices and reports?

No. Text checks prove important values exist, but they do not prove layout, page breaks, overlap, or visual readability. For customer-facing documents, combine text assertions with rendered-page regression tests.
`,
};
