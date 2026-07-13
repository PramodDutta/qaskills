import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Downloads with Random Filenames Using Playwright saveAs()',
  description:
    'Test Playwright downloads with random filenames by capturing the Download object, choosing a stable saveAs path, and validating the actual file safely.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test Downloads with Random Filenames Using Playwright saveAs()

The export button has already returned control to the browser, but the file on disk is named something like \`4d4f87d8-6c0a-43d8-a7c2-7bbf927f8f31\`. That name is Playwright's temporary storage detail, not necessarily the name the application offered to the user. A test that scans the downloads directory for \`orders.csv\` is therefore testing the wrong layer and will eventually become flaky.

Playwright represents a browser download with a \`Download\` object. The object gives a test three distinct things: the source URL, the browser-computed suggested filename, and control over where a durable copy is written. The reliable approach is to arm the download event before the action, await the object, call \`saveAs()\` with a path owned by the current test, and inspect that saved artifact. This article develops that pattern for exports whose names contain timestamps, report IDs, tenant names, or other changing data.

## Why the file under download.path() has a generated name

\`download.path()\` resolves only after a successful download and points at Playwright-managed storage. Its basename is intentionally a generated identifier. Multiple pages and browser contexts can download files without colliding, and Playwright can clean the browser context's downloads when that context closes. Neither property makes the temporary basename a useful product assertion.

\`download.suggestedFilename()\` answers a different question. The browser derives it from response metadata such as \`Content-Disposition\`, or from the HTML \`download\` attribute. Browser engines can make slightly different choices when metadata is ambiguous. Use the suggestion when the application's naming contract matters, but do not treat it as the path at which Playwright stored the bytes.

\`download.saveAs(destination)\` copies the completed artifact to the path selected by the test. It is safe to call while transfer is still in progress because the method waits for completion. This is the useful synchronization boundary: once it resolves, normal Node file APIs can open the destination.

| Download value | What it represents | Good assertion | Fragile assumption |
|---|---|---|---|
| \`download.path()\` | Playwright's temporary local path | The transfer produced a readable temporary file | Its basename matches the UI filename |
| \`download.suggestedFilename()\` | Browser interpretation of download metadata | The suggestion follows an agreed naming pattern | The file already exists under that name |
| \`download.url()\` | URL from which the download started | The export came from the intended endpoint | The URL proves the file contents are correct |
| \`download.failure()\` | Transfer error text, or \`null\` on success | A negative test was actually canceled or failed | A successful click guarantees a successful transfer |
| \`download.saveAs(path)\` | A durable copy at a test-selected location | The saved bytes can be parsed and validated | Parent directories are created automatically |

The parent directory must exist before \`saveAs()\` is called. Put artifacts beneath \`testInfo.outputPath()\`; Playwright gives every test a separate output directory, which prevents parallel workers from writing the same filename. That also keeps traces, screenshots, and downloaded evidence together.

## Capture the event before clicking Export

The most important ordering rule is only two lines long. Start \`page.waitForEvent('download')\` first, without awaiting it, then click the control that initiates the response. Awaiting the event before clicking deadlocks because no user action occurs. Clicking first creates a race because a fast response can emit the event before the listener exists.

The following runnable test saves a monthly CSV under a deterministic test-owned name. It separately checks the suggested name, so a server regression in \`Content-Disposition\` is visible without coupling file access to that changing value.

\`\`\`ts
import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test } from '@playwright/test';

test('downloads the selected month as a valid order export', async ({ page }, testInfo) => {
  await page.goto('/admin/orders');
  await page.getByLabel('Report month').selectOption('2026-06');

  const downloadStarted = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadStarted;

  expect(download.suggestedFilename()).toMatch(/^orders-2026-06-[a-f0-9]{8}\.csv$/);
  expect(download.url()).toContain('/api/order-exports/');

  const savedPath = testInfo.outputPath('downloads', 'orders-june.csv');
  await mkdir(dirname(savedPath), { recursive: true });
  await download.saveAs(savedPath);

  expect(await download.failure()).toBeNull();
  const csv = await readFile(savedPath, 'utf8');
  const lines = csv.trimEnd().split('\n');
  expect(lines[0]).toBe('order_id,created_at,total,currency');
  expect(lines.length).toBeGreaterThan(1);
});
\`\`\`

This example deliberately avoids \`waitForTimeout()\`. The download object and \`saveAs()\` provide the real readiness signals. A fixed delay merely guesses how long an export needs and makes the suite simultaneously slow on good days and unreliable on bad ones.

## Choose a destination policy that survives parallel workers

There are three reasonable destination policies. A deterministic name is easiest when one artifact exists per test. A sanitized suggested name is useful when the product filename itself is part of the evidence. A generated test name plus preserved extension is appropriate when a loop downloads several unrelated files. Whichever policy you use, the directory must belong to the test, not to the worker or entire build.

| Destination policy | Example destination | Best fit | Main risk to control |
|---|---|---|---|
| Stable semantic name | \`testInfo.outputPath('invoice.pdf')\` | One known artifact per test | Later saves in the same test overwrite it |
| Sanitized suggestion | \`outputPath('files', safeName)\` | Naming rules are under test | Untrusted separators or reserved characters |
| Sequence plus extension | \`attachment-03.xlsx\` | Batch exports with variable suggestions | Losing the association with the source row |
| Content-derived name | SHA-256 plus \`.zip\` | Deduplicating identical archives | Hashing adds work and does not explain intent |

Never concatenate an unchecked suggested filename directly onto an artifact directory. A browser normally normalizes a download suggestion, but the response still originates from an application under test. Treat it as untrusted input: take the basename, replace characters outside an allowlist, and reject empty results. Tests often run with broad filesystem permissions, so path discipline matters even in non-production code.

A helper can make the policy explicit without hiding the Download API. It should accept the current \`TestInfo\`, create the target folder, preserve a safe extension, and return both metadata and path. Returning metadata is valuable because callers may need to assert the original suggestion rather than the sanitized form.

## Validate the artifact, not merely its arrival

A completed transfer establishes transport success. It does not establish that the export is the requested report. Common application failures include an HTML login page saved with a \`.csv\` extension, a JSON error object returned as a spreadsheet, a zero-byte archive, a PDF generated for the wrong customer, or a valid workbook with stale rows.

Validation should follow the file format. For text formats, check encoding, headers, row count, and a few domain-critical records. For ZIP files, enumerate entries and reject unsafe paths before extraction. For PDFs, parse text or metadata when those are stable business requirements; do not rely only on the \`%PDF\` signature. For Excel workbooks, inspect worksheet names, typed cell values, formulas, and date serialization with a library built for XLSX.

Use a layered assertion strategy:

1. Confirm \`download.failure()\` is \`null\`.
2. Assert naming metadata only to the precision promised by the product.
3. Save into the test output directory.
4. Check a cheap structural invariant before invoking a heavier parser.
5. Assert the business facts that motivated the export.

For a randomized filename such as \`audit-log-20260713-104455-7812.csv\`, exact equality is usually wrong. A regular expression can assert stable prefix, timestamp shape, allowed identifier alphabet, and extension. Avoid asserting the current wall-clock second unless the requirement truly demands it. CI clock drift and boundary crossings make that brittle. If the test controls time through the application, assert the frozen value instead.

The broader [Playwright file download testing guide](/blog/playwright-file-download-testing-guide-2026) covers PDFs, archives, browser prompts, and remote execution. The focus here is narrower: decouple a volatile suggested name from a stable path used for inspection.

## A reusable save routine with filename hardening

Here is a helper and a second test for invoice PDFs. It removes directory components, permits a conservative filename alphabet, ensures uniqueness within the test, and verifies a PDF signature before a domain parser takes over. All APIs shown are standard Node or Playwright APIs.

\`\`\`ts
import { mkdir, open } from 'node:fs/promises';
import { basename, dirname, extname } from 'node:path';
import type { Download, TestInfo } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function preserveDownload(download: Download, testInfo: TestInfo, label: string) {
  const suggestion = download.suggestedFilename();
  const extension = extname(basename(suggestion)).toLowerCase();
  const safeLabel = label.replace(/[^a-z0-9_-]+/gi, '-');
  const destination = testInfo.outputPath('downloads', \`\${safeLabel}\${extension}\`);

  await mkdir(dirname(destination), { recursive: true });
  await download.saveAs(destination);
  return { destination, suggestion };
}

test('invoice download is a PDF for the displayed invoice', async ({ page }, testInfo) => {
  await page.goto('/billing/invoices/inv_8421');

  const pending = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download invoice' }).click();
  const download = await pending;
  const saved = await preserveDownload(download, testInfo, 'invoice-inv_8421');

  expect(saved.suggestion).toMatch(/^Invoice-inv_8421-[0-9]{6}\.pdf$/);
  const file = await open(saved.destination, 'r');
  const header = Buffer.alloc(5);
  await file.read(header, 0, 5, 0);
  await file.close();
  expect(header.toString('ascii')).toBe('%PDF-');
});
\`\`\`

The helper preserves only the extension from the suggestion. That is a deliberate design decision, not a Playwright requirement. The test-selected label is stable and meaningful in CI artifacts, while the original suggestion remains available for a precise product assertion.

## Diagnosing downloads that never reach saveAs()

When \`waitForEvent('download')\` times out, first determine whether the click actually initiates a browser download. Some applications create an export job, show a toast, poll until it is ready, and only later navigate to a signed object-storage URL. In that workflow, the first click is not the download trigger. Wait for the job state in the UI, then arm the listener immediately before the final link click.

Another common case is a new page. If the export opens a popup that initiates the transfer, the download event belongs to that popup's page, but browser-context-level handling may be easier when page ownership varies. Prefer waiting on the known page when the product behavior is stable because it makes causality clearer.

If a download object exists but saving fails, inspect \`await download.failure()\`. Network cancellation, closed contexts, and server termination can surface there. Keep the context alive until validation completes. Remember that Playwright deletes context-owned downloads when the context closes; copying with \`saveAs()\` before teardown avoids depending on temporary retention.

Remote browser connections add another wrinkle: \`download.path()\` can throw when the browser is connected remotely because the path belongs to the remote host. \`saveAs()\` is the portable choice when the client process needs the file. This distinction is especially important in browser grids and containerized runners.

## What to assert about changing suggested names

Filename assertions should encode a public contract, not an accidental implementation. Product owners may care that an invoice includes its number and ends in PDF. They rarely care which random suffix algorithm the storage service uses. A good assertion captures meaningful tokens and broad format, while allowing entropy to change.

Consider splitting the name and content responsibilities. The naming test asserts \`Content-Disposition\` behavior through \`suggestedFilename()). The export test saves to a fixed path and deeply validates rows. This produces smaller failures: “invoice filename omitted invoice number” is more actionable than a downstream file-not-found caused by expecting yesterday's dynamic name.

International filenames deserve explicit coverage if supported. Browser handling of RFC 5987 \`filename*\` values, Unicode normalization, and forbidden filesystem characters can differ by platform. Assert the user-visible suggestion in one or more targeted cross-browser tests, then sanitize independently for the artifact path. Do not force every content test to repeat the full naming matrix.

For more suite-level guidance on isolated outputs, event-first waiting, and locator choices, see [Playwright best practices for reliable tests](/blog/playwright-best-practices-2026). Those practices matter here because downloads combine browser events with Node-side filesystem work.

## Review checklist for a trustworthy download test

Before merging, read the test as if several workers will execute it on an unfamiliar operating system:

- The event promise is created before the initiating action.
- No sleep stands in for transfer completion.
- The destination directory is created explicitly.
- The destination lives under \`testInfo.outputPath()\` or another per-test directory.
- Volatile name segments are matched by documented shape, not copied from a fixture.
- Suggested names cannot escape the intended directory.
- \`saveAs()\` resolves before file parsing begins.
- The test verifies format and business content, not only file existence.
- Temporary browser paths are not assumed to be stable or locally accessible.
- Failure messages distinguish naming, transfer, structure, and data defects.

The key mental model is simple: the browser suggests a name, Playwright temporarily owns the transfer, and the test chooses the durable artifact path. Keeping those responsibilities separate removes most random-filename flakiness without weakening the assertions that users actually care about.

## Exercise the failure paths users actually encounter

A download feature has more observable failure modes than “file did not appear.” The endpoint may return \`403\` before download headers, the transfer may start and then terminate, the browser may cancel it, or the application may deliver a tiny error document under a plausible extension. Build negative tests around the layer that owns each behavior.

If clicking an expired export link displays an in-page error rather than starting a download, do not wait for a download event. Assert the response or visible message expected by that workflow. Conversely, when a transfer starts and fails later, capture the \`Download\` and check \`failure()\`. Trying to force both behaviors through one helper obscures which event should occur.

Cancellation deserves a focused test only when the product exposes cancellation or recovery behavior. Playwright's \`download.cancel()\` can cancel a transfer, after which \`failure()\` resolves to \`'canceled'\`. That proves browser-side cancellation handling, but it does not simulate every network interruption or prove the server stopped generating the export. Test backend job cancellation at its API boundary when that is the requirement.

Filename metadata also merits a small browser matrix. Chromium, Firefox, and WebKit derive suggestions using browser logic, particularly when \`Content-Disposition\` is malformed or contains international parameters. If the server sends a standards-compliant header, one exact cross-browser check may be enough. If legacy headers are supported, table-drive representative names across projects and document allowed differences instead of forcing one engine's normalization on all others.

Keep the expensive matrix separate from deep content validation. Content bytes should normally be identical regardless of which browser initiated the HTTP request, while filename interpretation can vary. One suite can verify naming across engines and a narrower project can parse large workbooks or archives. This keeps coverage intentional and CI artifact volume under control.

Finally, assert retention behavior at the correct boundary. A file copied by \`saveAs()\` outlives the browser context because it is now owned by the test filesystem. A temporary path does not. Tests that close the context before copying and then report a missing file are verifying teardown timing, not the download feature.

## Frequently Asked Questions

### Why does download.path() return a UUID-like filename?

It points to Playwright-managed temporary storage, where generated names prevent collisions. Use \`suggestedFilename()\` to inspect the browser's proposed name and \`saveAs()\` to create a copy at a meaningful test path.

### Can saveAs() be called before the download finishes?

Yes. The method waits for the transfer to complete before its promise resolves. That makes it a better synchronization point than polling file size or sleeping for a fixed duration.

### Should a test save using suggestedFilename() directly?

Only after applying a deliberate safety policy. At minimum, isolate the basename and reject or replace unsafe characters. Often it is clearer to save under a stable semantic name and assert the suggestion separately.

### How should several downloads from one page be matched to rows?

Trigger and await them sequentially when ordering matters, or associate each event with a unique initiating action and expected metadata. Do not collect files later by directory order, because parallel completion can reorder them.

### Why does path() fail on a remote Playwright connection?

The browser's filesystem path is remote and is not meaningful to the client process. Use \`saveAs()\` to transfer the artifact to a client-accessible destination before inspecting it.
`,
};
