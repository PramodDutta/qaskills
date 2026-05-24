import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright File Downloads: Complete 2026 Handling Guide',
  description: 'Handle downloads in Playwright: capture filename, save path, read bytes, validate PDF/CSV/Excel content, and run flake-free CI with downloaded artifacts.',
  date: '2026-05-13',
  category: 'Guide',
  content: `
# Playwright File Downloads: Complete 2026 Handling Guide

Browsers trigger downloads as a side effect of clicking links, submitting forms, or running scripts. Testing those downloads from a Playwright test requires three things: capturing the download event, controlling where the file lands, and validating its contents. Playwright provides a small, focused API that handles every common scenario, plus the corner cases like blob URLs and content-disposition mismatches.

This guide covers the full Download API in Playwright 1.49+: event capture, suggested filenames, save paths, byte streams, MIME validation, and the CI patterns that keep downloads from polluting your filesystem. Examples are TypeScript.

For broader Playwright patterns, the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide) is the starting point. The [playwright-e2e skill](/skills/playwright-e2e) helps AI assistants generate downloads-aware tests.

## The basic pattern

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('downloads the report CSV', async ({ page }) => {
  await page.goto('/reports');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download CSV' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('report.csv');
  expect(download.url()).toContain('/exports/report.csv');
});
\`\`\`

The pattern is identical to popups: register \`waitForEvent('download')\` before the trigger.

## Saving the download

\`\`\`typescript
const download = await downloadPromise;
const savePath = './downloads/report.csv';
await download.saveAs(savePath);

// Use the file
import { readFileSync } from 'fs';
const csv = readFileSync(savePath, 'utf8');
expect(csv).toContain('order_id,sku,quantity');
\`\`\`

\`saveAs\` writes the bytes to the path you specify. The original temp file is also retained until \`download.delete()\` is called or the context closes.

## Reading bytes without saving

For validation that does not need a persistent file:

\`\`\`typescript
const download = await downloadPromise;
const stream = await download.createReadStream();
const chunks: Buffer[] = [];
for await (const chunk of stream) {
  chunks.push(Buffer.from(chunk));
}
const buffer = Buffer.concat(chunks);
expect(buffer.length).toBeGreaterThan(0);
\`\`\`

Useful for tests that only verify size or content type without leaving artifacts behind.

## Configuring the download path

By default Playwright writes downloads to a temp directory. Configure a permanent location via \`downloadsPath\` in \`playwright.config.ts\`.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    acceptDownloads: true,
  },
  // Context-level options
  outputDir: './test-results',
});
\`\`\`

\`acceptDownloads: true\` is the default; if disabled the browser cancels downloads automatically.

## Validating PDF content

\`\`\`typescript
import pdf from 'pdf-parse';
import { readFile } from 'fs/promises';

test('downloads invoice PDF', async ({ page }) => {
  await page.goto('/invoices/1');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download invoice' }).click();
  const download = await downloadPromise;
  const path = await download.path();

  const buffer = await readFile(path!);
  const parsed = await pdf(buffer);
  expect(parsed.text).toContain('Invoice #1');
  expect(parsed.numpages).toBeGreaterThan(0);
});
\`\`\`

\`download.path()\` returns the on-disk path Playwright chose; you can read it like any file.

## Validating CSV content

\`\`\`typescript
import { parse } from 'csv-parse/sync';
import { readFile } from 'fs/promises';

test('export CSV has the right columns', async ({ page }) => {
  await page.goto('/exports');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  const download = await downloadPromise;

  const csvText = (await readFile((await download.path())!)).toString('utf8');
  const rows = parse(csvText, { columns: true });
  expect(rows[0]).toHaveProperty('order_id');
  expect(rows[0]).toHaveProperty('sku');
  expect(rows.length).toBeGreaterThan(0);
});
\`\`\`

## Validating Excel files

\`\`\`typescript
import { read, utils } from 'xlsx';
import { readFileSync } from 'fs';

test('Excel export contains a Sheet1', async ({ page }) => {
  await page.goto('/exports');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Excel' }).click();
  const download = await downloadPromise;

  const buffer = readFileSync((await download.path())!);
  const workbook = read(buffer);
  expect(workbook.SheetNames).toContain('Sheet1');
  const sheet = workbook.Sheets['Sheet1'];
  const rows = utils.sheet_to_json<{ order_id: string }>(sheet);
  expect(rows[0].order_id).toBeTruthy();
});
\`\`\`

## Multiple downloads in one test

\`\`\`typescript
test('downloads multiple files', async ({ page }) => {
  await page.goto('/bulk-export');
  const promises = [
    page.waitForEvent('download'),
    page.waitForEvent('download'),
    page.waitForEvent('download'),
  ];
  await page.getByRole('button', { name: 'Export all' }).click();
  const downloads = await Promise.all(promises);
  expect(downloads.map((d) => d.suggestedFilename())).toEqual([
    'orders.csv',
    'invoices.csv',
    'customers.csv',
  ]);
});
\`\`\`

Use \`Promise.all\` to wait for all expected downloads in parallel.

## Filtering by filename

\`\`\`typescript
const downloadPromise = page.waitForEvent('download', {
  predicate: (d) => d.suggestedFilename().endsWith('.pdf'),
});
\`\`\`

Use the predicate to wait for a specific download when multiple may be triggered.

## Failing fast when no download arrives

\`\`\`typescript
const downloadPromise = page.waitForEvent('download', { timeout: 10_000 });
await page.getByRole('button', { name: 'Download' }).click();
const download = await downloadPromise;
\`\`\`

The default timeout is 30 seconds. Lower it to fail fast when the download is critical.

## Blob URLs

Some apps generate downloads via blob URLs (\`URL.createObjectURL\`). Playwright handles them identically: the download event fires and \`download.url()\` returns the blob URL.

\`\`\`typescript
test('downloads from blob URL', async ({ page }) => {
  await page.goto('/blob-export');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate' }).click();
  const download = await downloadPromise;
  expect(download.url()).toMatch(/^blob:/);
});
\`\`\`

## Disabling downloads

For tests that should not trigger downloads (security checks):

\`\`\`typescript
test.use({ acceptDownloads: false });

test('blocks downloads when disabled', async ({ page }) => {
  await page.goto('/restricted');
  // Click would normally trigger download, but the browser cancels it
  await page.getByRole('button', { name: 'Download' }).click();
  // Assert that nothing happened
  await expect(page.getByText('Download blocked')).toBeVisible();
});
\`\`\`

## CI cleanup

By default downloads stay in the temp directory until the browser closes. For tests that produce many large downloads, clean up:

\`\`\`typescript
test.afterEach(async ({ page }) => {
  // Playwright handles temp file cleanup; just be sure to not leave artifacts in test-results
});

const download = await downloadPromise;
const path = './tmp/file.csv';
await download.saveAs(path);
// ... validate
await download.delete(); // delete the temp file
\`\`\`

For full CI patterns, see [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026).

## Recording downloads in HAR

If you want a HAR file that includes the download response:

\`\`\`typescript
const context = await browser.newContext({
  recordHar: { path: 'session.har', mode: 'full' },
});
\`\`\`

The HAR captures the response body of the download for replay or analysis.

## Common pitfalls

**Pitfall 1: Registering \`waitForEvent('download')\` after click.** The event fires and is lost. Always register before the trigger.

**Pitfall 2: Asserting on \`download.url()\` after \`saveAs\`.** The URL is valid until the download completes; verify before saving.

**Pitfall 3: Forgetting \`saveAs\` writes asynchronously.** Always \`await\`.

**Pitfall 4: Validating content before download completes.** If the file is large, \`download.path()\` returns the partial path. Always \`await download.saveAs(path)\` to ensure the file is fully written.

**Pitfall 5: Hard-coded download paths.** Use \`testInfo.outputDir\` for per-test paths to avoid collisions.

## Anti-patterns

- Driving the download via the URL directly with \`page.goto\`. The browser may treat it as a navigation, not a download.
- Skipping the download event and polling the filesystem. Race-prone.
- Saving every download to a global folder. Use \`testInfo.outputPath\` to namespace per test.
- Validating only the filename. Always inspect content for the strongest assertion.

## A complete download workflow

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { readFile } from 'fs/promises';

test('user exports orders as CSV with correct rows', async ({ page }, testInfo) => {
  await page.goto('/orders');
  await page.getByLabel('Status').selectOption('Approved');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export approved' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('approved-orders.csv');
  const savePath = testInfo.outputPath('approved-orders.csv');
  await download.saveAs(savePath);

  const csv = (await readFile(savePath)).toString('utf8');
  expect(csv.split('\\n').length).toBeGreaterThan(1);
  expect(csv.split('\\n')[0]).toBe('order_id,customer_email,total');
});
\`\`\`

\`testInfo.outputPath\` returns a per-test path under \`test-results/<test>/\`, ensuring no collisions across parallel workers.

## Conclusion and next steps

Downloads in Playwright are a five-line pattern: listen, trigger, save, validate. The complexity is in the validation, where format-specific libraries (pdf-parse, csv-parse, xlsx) do the heavy lifting.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate download tests that include content validation. For broader CI patterns including artifact upload, [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026). For multi-page interactions including OAuth, [Playwright Multi-Page and Popup Handling Guide](/blog/playwright-multi-page-popup-handling-guide).
`,
};
