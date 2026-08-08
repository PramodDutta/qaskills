import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Download Suggested Filename Validation That Proves the Export',
  description: 'Use Playwright download suggested filename validation to verify names, headers, bytes, isolation, and export behavior without flaky filesystem waits.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Download Suggested Filename Validation That Proves the Export

Playwright download suggested filename validation should start waiting for the \`download\` event before the user action, capture the resulting \`Download\` object, and compare \`download.suggestedFilename()\` with the product's expected name. Then verify that the transfer completed and inspect the saved bytes. The filename assertion proves the browser's proposed name, while content checks prove that the expected export actually arrived.

Do not poll the operating system Downloads folder or assume the clicked link's text becomes the filename. Playwright creates downloads inside the browser context's temporary area and deletes those files when that context closes. The browser calculates a suggested name from the download response and page behavior. Use the event object while the test context is alive, save a copy into the test's output directory when an artifact is needed, and give every parallel test a unique path.

This workflow catches wrong \`Content-Disposition\` headers, missing extensions, stale report names, cross-test collisions, HTML error pages masquerading as files, and downloads that start but fail. The examples use Playwright Test and Node.js APIs with explicit assertions rather than fixed sleeps.

## Treat the filename as one layer of the export contract

A download has several independently testable properties. The filename communicates identity and file type to the user. The response headers influence browser behavior. The transfer status tells you whether bytes completed. The payload determines whether the export is genuine and belongs to the requested record. Testing only one layer leaves common defects undetected.

| Contract layer | Example expectation | Suitable evidence |
|---|---|---|
| Trigger | Export CSV button starts one download | one captured \`download\` event |
| Suggested name | \`orders-2026-08.csv\` | \`suggestedFilename()\` exact value |
| Completion | browser reports no transfer failure | \`await download.failure()\` returns \`null\` |
| File bytes | nonempty UTF-8 CSV with expected header | saved file or readable stream |
| Record identity | requested order IDs appear | parsed content assertions |
| Isolation | concurrent workers do not overwrite | \`testInfo.outputPath()\` per test |

The official Playwright Download API is documented at https://playwright.dev/docs/api/class-download. A \`Download\` is emitted when the download starts. Operations that need the completed file, including saving it, wait for completion. This timing model is why a download event is a better synchronization boundary than watching a folder.

Before coding, define which parts are product requirements. If the specification promises \`customer-4821-invoices.csv\`, assert it exactly. If the server intentionally adds a current timestamp, either control time in the test environment or validate the documented structure and separately prove the record identity. Avoid a loose \`.includes('.csv')\` check that would accept \`unrelated.csv\`.

Download checks fit naturally into a layered JavaScript test suite. A pure filename builder can cover many normalization cases, a server integration test can inspect headers, and a browser test can verify the user's observed result. The [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides the broader framework context for deciding which layer should own each assertion.

## Capture the event before clicking the export control

The essential ordering is simple: create the event promise, trigger the action, then await the promise. Do not await \`waitForEvent\` before clicking because the click would never execute. Do not click first because a fast response can emit the event before the listener exists.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('suggests the agreed monthly orders filename', async ({ page }) => {
  await page.goto('/reports/orders?month=2026-08');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('orders-2026-08.csv');
  expect(await download.failure()).toBeNull();
});
\`\`\`

The click locator is based on role and accessible name because it represents the user action. If a page has several export buttons, scope to the report section or row that owns the expected download. Do not solve ambiguity with \`.nth(2)\`. The [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) explains how to build that stable user-facing contract.

The failure check matters. The download event means a transfer began, not necessarily that it completed successfully. \`download.failure()\` resolves to \`null\` for a successful transfer or a string describing a failure. Call it before the browser context closes.

| Sequence | Result | Review decision |
|---|---|---|
| wait promise, click, await promise | event cannot be missed | preferred |
| click, then wait for event | race with fast download | reject |
| await event, then click | test stalls before action | reject |
| click and sleep, scan folder | timing and path assumptions | reject |
| event plus filename only | name covered, bytes unproven | add content checks for critical exports |

## Save into the test output directory without collisions

When later assertions need a filesystem path, use \`download.saveAs()\`. Create the destination directory and derive it through Playwright Test's \`testInfo.outputPath()\`, which places it under the current test's unique output area. This design works with parallel workers and keeps artifacts associated with the test.

\`\`\`ts
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('saves a completed export in this test output', async ({ page }, testInfo) => {
  await page.goto('/reports/orders?month=2026-08');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  const suggested = download.suggestedFilename();

  expect(suggested).toBe('orders-2026-08.csv');
  expect(path.posix.basename(suggested)).toBe(suggested);
  expect(path.win32.basename(suggested)).toBe(suggested);

  const destination = testInfo.outputPath('downloads', suggested);
  await mkdir(path.dirname(destination), { recursive: true });
  await download.saveAs(destination);

  const file = await stat(destination);
  expect(file.isFile()).toBe(true);
  expect(file.size).toBeGreaterThan(0);
});
\`\`\`

The basename assertion is a defensive invariant before a suggested name is joined into a path. Browsers sanitize download names, but test code should not grant an external value authority to choose directories. If the product permits user-created report labels in filenames, also define the expected normalization for slashes, control characters, reserved names, and unsupported characters on each target platform.

Do not write every worker to \`./downloads/export.csv\`. Two parallel tests can overwrite each other, a stale file can make a failed test appear successful, and local leftovers can change results. A unique per-test directory eliminates those false passes.

## Verify CSV structure instead of only checking file size

A nonempty file can still be a login page, JSON error document, or CSV with the wrong columns. For a controlled fixture that contains no quoted commas or embedded newlines, a small parser may be enough. Production-grade CSV features require a real, established CSV parser selected by the project, but do not invent one solely for a snippet.

This runnable example uses a deliberately simple export contract: the fixture values contain no commas, quotes, or newlines. It reads the saved file, strips an optional UTF-8 byte-order mark, and validates headers and row identity.

\`\`\`ts
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('downloads the requested order rows', async ({ page }, testInfo) => {
  await page.goto('/reports/orders?fixture=two-orders');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;
  const destination = testInfo.outputPath('downloads', 'orders.csv');

  await mkdir(path.dirname(destination), { recursive: true });
  await download.saveAs(destination);

  const text = (await readFile(destination, 'utf8')).replace(/^﻿/, '').trim();
  const lines = text.split(/\\r?\\n/);

  expect(lines[0]).toBe('order_id,status,total');
  expect(lines.slice(1)).toEqual([
    'ORD-1042,paid,49.00',
    'ORD-1043,pending,19.50',
  ]);
});
\`\`\`

The test controls ordering through its fixture. If production export order is not a contract, parse rows and compare by order ID instead of making the test accidentally require a sort. Also assert the declared media type at the server integration layer, because a CSV-looking body delivered as an unexpected type can still produce inconsistent browser behavior and downstream handling.

For larger or complex CSV files, validate with the same parser family used by downstream consumers if possible. Check column names, delimiter, encoding, quoting, line endings only when contractually relevant, representative values, and row count. Keep personal data out of CI artifacts by seeding synthetic records.

## Validate binary identity with signatures and parsers

An extension is not evidence of a file format. An application can return an HTML error page named \`invoice.pdf\`. At minimum, inspect the expected file signature and domain text or metadata. PDF begins with the ASCII signature \`%PDF-\`, but that alone is not a complete validity check. A project that relies on readable PDFs should parse them with a maintained PDF library or perform a downstream rendering check.

\`\`\`ts
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';

test('invoice export is a PDF for the requested invoice', async ({ page }, testInfo) => {
  await page.goto('/invoices/INV-1042');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download invoice' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('invoice-INV-1042.pdf');

  const destination = testInfo.outputPath('downloads', 'invoice-INV-1042.pdf');
  await mkdir(path.dirname(destination), { recursive: true });
  await download.saveAs(destination);

  const bytes = await readFile(destination);
  expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(5);
});
\`\`\`

The size threshold is intentionally minimal because no fabricated document-size claim belongs in a generic test. Add a stronger, product-specific lower bound only when a controlled fixture makes it stable. A hard-coded “PDF must exceed one megabyte” assertion can fail after legitimate compression or pass for a large error page.

| File type | Fast identity check | Stronger content proof |
|---|---|---|
| CSV | decoded header and expected delimiter | standards-aware parse and row assertions |
| JSON | \`JSON.parse\` succeeds | schema and record identity checks |
| PDF | \`%PDF-\` signature | parser, text extraction, or render check |
| ZIP | archive signature | enumerate entries and inspect required files |
| PNG | PNG signature | decode dimensions and selected pixels if meaningful |
| XLSX | ZIP container signature | workbook parser and sheet/cell assertions |

Choose assertions based on user harm. A filename regression is visible and annoying. A mislabeled or corrupt compliance report can block an audit. A cross-customer data export is a serious privacy defect and requires identity and authorization assertions beyond browser mechanics.

## Hash a download directly from its stream

When a test needs content identity but does not need a retained file, \`download.createReadStream()\` exposes the transfer as a Node.js readable stream. Hashing avoids choosing a filesystem location and can compare a deterministic fixture to a known digest. Only use a fixed expected digest for byte-stable output. PDFs containing timestamps or generated IDs are usually not byte-stable.

\`\`\`ts
import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

async function sha256Download(download: import('@playwright/test').Download): Promise<string> {
  const hash = createHash('sha256');
  const stream = await download.createReadStream();

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

test('downloads the byte-stable public key fixture', async ({ page }) => {
  const expectedDigest = process.env.TEST_PUBLIC_KEY_SHA256;
  if (!expectedDigest) {
    throw new Error('TEST_PUBLIC_KEY_SHA256 is required');
  }

  await page.goto('/settings/security');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download test public key' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('test-public-key.pem');
  expect(await sha256Download(download)).toBe(expectedDigest);
});
\`\`\`

The expected digest must come from the repository's reviewed, byte-stable fixture manifest through the test environment. A hash assertion is exact but opaque when it fails. Pair it with a filename check and, for text formats, a readable semantic assertion so triage does not stop at “digest changed.”

Streaming is also useful for large exports because the test need not load the entire payload into one buffer. Still enforce an application-level timeout through Playwright Test configuration, and keep test data bounded. An unbounded generated export can consume CI time even when streaming protects memory.

## Test server-driven naming at the response boundary

The suggested filename often comes from the response's \`Content-Disposition\` header. A browser can also use an HTML \`download\` attribute or URL-derived name. End-to-end tests should assert what users receive. Add API or server integration coverage for the header construction when naming rules include user labels, Unicode, dates, or record identifiers.

A deterministic test server can demonstrate the browser behavior. The following Playwright spec starts a local Node HTTP server, serves one page and one CSV response, then checks the suggested name and body. It uses an ASCII filename so browser-platform normalization does not obscure the contract.

\`\`\`ts
import http from 'node:http';
import { once } from 'node:events';
import { expect, test } from '@playwright/test';

test('uses the server Content-Disposition filename', async ({ page }) => {
  const server = http.createServer((request, response) => {
    if (request.url === '/export') {
      response.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="orders-2026-08.csv"',
      });
      response.end('order_id,status\\nORD-1042,paid\\n');
      return;
    }

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end('<a href="/export">Export CSV</a>');
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('expected a TCP server address');
    }

    await page.goto(\`http://127.0.0.1:\${address.port}\`);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Export CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('orders-2026-08.csv');
  } finally {
    server.close();
    await once(server, 'close');
  }
});
\`\`\`

For international filenames, implement the standards-compliant header encoding in the application and test supported browsers and operating systems. Do not hand-build header encoding from a remembered fragment in a UI test. Use the server framework's documented response API and verify the final observed name.

## Separate product naming rules from browser normalization

Suppose a user names a report \`North/West: Q3\`. The server cannot assume every character is a safe filename character on every client. Product requirements should define a display title and a download-name normalization policy. The test then controls the title and asserts the agreed result, such as \`North-West-Q3.csv\`.

What people get wrong is using a broad regular expression to make an unstable name “pass,” for example accepting any string ending in \`.csv\`. That does not prove customer ID, report type, date range, or sanitization. Another mistake is asserting a developer's temporary UUID filename when the UI promises a human-readable export. Decide at the product boundary which identity the filename must expose.

| Naming concern | Weak assertion | Contract-focused assertion |
|---|---|---|
| extension | ends with \`.csv\` | exact report basename plus \`.csv\` |
| date range | contains a year | exact controlled range in agreed format |
| record identity | contains digits | exact synthetic record ID |
| unsafe characters | browser did something | expected application normalization |
| localization | accepts any nonempty name | expected locale-specific title and stable extension |
| duplicate exports | OS adds a suffix | each test gets isolated output, suggested name stays canonical |

The browser's suggested name should remain canonical even if a desktop Downloads folder would add \`(1)\` to avoid an existing file. Playwright's context-managed download is not a simulation of every operating system save dialog. Test the web application's filename contract in Playwright, then cover native shell behavior separately only if the product owns it.

## Detect the HTML error page disguised as an export

A common failure mode occurs after authentication expires. The export request is redirected to a login page, but middleware retains or adds \`Content-Disposition: attachment; filename="orders.csv"\`. The Playwright test sees the expected suggested name and a successful transfer, so a filename-only check passes. A user opens the file and finds HTML.

Diagnosis should capture four observations: the filename, transfer failure result, response behavior if instrumented at the application boundary, and payload prefix or parse error. A saved file that begins with \`<!doctype html>\` explains why CSV parsing failed. Check authentication cookies and server logs, then fix response authorization or redirect behavior. Do not weaken the CSV assertion.

Another failure appears when the server sends \`filename="report.csv"\` for every export. Content is correct, but users cannot identify which report they saved. Exact filename validation isolates the header-building defect even when all data checks pass.

Use a diagnostic helper that attaches the downloaded file only when policy allows the synthetic content. With Playwright Test, \`testInfo.attach()\` can attach a path or body. Do not attach real customer exports or credentials. Generate small synthetic records specifically for download tests.

## Handle popups, multiple downloads, and cancellation intentionally

The download event belongs to the page that initiates it. If clicking opens a popup and the popup triggers the download, capture the popup first, then wait for that page's download event. Model the real flow instead of registering listeners on every page and accepting the first event.

If one action intentionally generates multiple downloads, a single \`waitForEvent\` captures only one. The cleanest product contract may be a ZIP archive rather than several automatic files. Where multiple downloads are intended, register the required event promises or collect events with a bounded, deterministic completion signal from the UI. Do not wait for “no more events” using an arbitrary quiet period.

Cancellation deserves its own scenario if users can cancel. \`download.cancel()\` requests cancellation, and the resulting failure can report cancellation. That is different from a network failure. Keep cancellation assertions out of the happy-path filename test.

Downloads initiated through a remote browser connection can make direct temporary-path access unsuitable. \`saveAs()\` and \`createReadStream()\` are the portable application-facing tools for tests. Avoid coupling an assertion to an internal temporary directory layout.

Popup handling should preserve the same event-before-action ordering at both stages. First register a popup promise on the original page, click the control that opens it, and await the popup. Then register the download promise on that popup before clicking its final download control. If navigation in the popup starts the download automatically, register the popup's download listener as soon as the popup object is available and synchronize on the application state that precedes the automatic transfer. Document that flow, because moving the listener to the original page will create a timeout that looks like a slow download.

When the application exposes a “Generate report” phase before the download, distinguish generation from transfer. Wait for the server-backed ready state, then capture the browser download. A spinner disappearing proves only that generation UI changed. The resulting file still needs its own completion and payload checks. If generation is asynchronous and returns a report ID, seed a small deterministic report and verify that the ID represented in the downloaded content matches the one shown in the UI.

## Design a maintainable download test suite

Put naming logic close to its source. Unit-test a pure application filename builder with many characters and locales, integration-test response headers, and retain a small number of Playwright journeys that verify what the browser suggests and what the user receives. This pyramid produces detailed failures without making every input combination launch a browser.

| Suite layer | Inputs | Main assertion | Speed and scope |
|---|---|---|---|
| filename unit test | report type, dates, labels | normalized basename | fast, broad combinations |
| server integration test | authenticated export request | status, media type, disposition | medium, header contract |
| Playwright browser test | visible export journey | suggested name and bytes | slower, user-observed behavior |
| parser contract test | generated payload | schema and domain values | medium, content correctness |
| exploratory browser pass | unusual locale and platform | save experience and usability | selective manual evidence |

Use stable time and synthetic data. If the filename contains today's date, inject or freeze the application's clock where the architecture supports it. Computing expected dates independently in the test can create midnight and timezone races. Make the chosen timezone part of the export specification.

Keep filenames readable in test output. When an assertion fails, print expected and received values, report the requested fixture, and preserve a safe payload artifact. Do not automatically retry an export that charges money, schedules work, or consumes a one-time token. The test should reset domain state before any whole-test retry.

The two essential review questions are simple: Did the browser propose the exact name promised to the user, and do the completed bytes represent the requested export? When both have direct evidence, a green result means much more than “click did not throw.”

## Frequently Asked Questions

### Does suggestedFilename return the final filesystem path?

No. \`download.suggestedFilename()\` returns the browser's suggested basename, not a destination path selected by the operating system. Playwright keeps the downloaded file in context-managed temporary storage until you save or stream it, and those temporary downloads are removed when the context closes. Use \`testInfo.outputPath()\` to create a unique artifact destination and \`download.saveAs()\` to copy the completed file. Validate the basename before joining it into any path, especially when report labels can originate from user input.

### Is waiting for the download event enough to prove success?

No. The event is emitted when the download starts. Call \`await download.failure()\` and expect \`null\`, or use \`saveAs()\` or \`createReadStream()\`, which wait for completion as needed. Then inspect the content. A transfer can start and fail, and a successful file can still contain an authentication page or server error. For critical exports, validate the suggested name, completion status, format signature or parser result, and synthetic record identity. Each assertion covers a different failure mode.

### How should I test filenames that contain dates or user-entered text?

Control the inputs and define normalization explicitly. Seed a known report title, set the application clock or date range through supported test seams, and assert the exact expected basename. Include focused unit cases for slashes, whitespace, Unicode, reserved characters, and empty labels according to the product policy. Avoid a permissive expression that checks only the extension. Also define timezone ownership for date-derived names, otherwise a CI worker and application server can legitimately calculate different calendar dates near midnight.

### Why should I avoid polling my normal Downloads folder?

Folder polling races the transfer, depends on machine-specific browser settings, collides across workers, and can mistake a stale file for a new success. Playwright already exposes the precise download event and object for the current page and browser context. Capture that event before the click, assert the suggested name, and save into the current test's unique output path if filesystem analysis is required. This approach works in isolated CI environments and gives each failure a clear owner without deleting or scanning unrelated files on the machine.
`,
};
