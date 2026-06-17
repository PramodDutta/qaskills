import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright File Upload with setInputFiles: Complete Reference',
  description:
    'Complete Playwright file upload reference: setInputFiles for single, multiple, buffer, and MIME examples, hidden inputs, file choosers, drag-and-drop, and clearing files.',
  date: '2026-06-17',
  category: 'Reference',
  content: `
# Playwright File Upload with setInputFiles: Complete Reference

File upload is one of the most common interactions automated testers need to handle, and Playwright makes it deterministic with the \`setInputFiles\` method. Instead of automating a flaky native OS file-picker dialog, Playwright sets the files directly on the underlying \`<input type="file">\` element, which is fast, reliable, and works headlessly in CI. This reference documents every supported file-upload pattern: uploading a single file, multiple files, in-memory buffers with explicit MIME types, handling hidden inputs, intercepting the file chooser, drag-and-drop uploads, and clearing a selection.

The two core APIs are \`locator.setInputFiles()\` and \`page.setInputFiles()\`. Both accept a path string, an array of paths, a file-payload object (name + mimeType + buffer), or an array of payloads. This page gives you exact, runnable TypeScript and Python examples for each, plus reference tables for the accepted argument shapes and common errors. It mirrors the behavior described in the Playwright official docs while adding the edge cases that trip teams up in real suites.

New to the framework? Start with the [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026) and the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide). For ready-made upload helpers, browse the automation [skills](/skills).

---

## The setInputFiles API at a Glance

\`setInputFiles\` targets a file input and assigns the files programmatically. The method is available on both the \`Locator\` (preferred) and the \`Page\` (legacy, selector-based) objects.

\`\`\`typescript
// Preferred: locator-based
await page.locator('input[type="file"]').setInputFiles('path/to/file.pdf');

// Legacy: page-based with a selector string
await page.setInputFiles('input[type="file"]', 'path/to/file.pdf');
\`\`\`

| Argument shape | What it does |
|---|---|
| \`'path/to/file.pdf'\` | Upload one file from disk |
| \`['a.png', 'b.png']\` | Upload multiple files (input must allow \`multiple\`) |
| \`{ name, mimeType, buffer }\` | Upload an in-memory file payload |
| \`[{...}, {...}]\` | Upload multiple in-memory payloads |
| \`[]\` (empty array) | Clear the current selection |

The locator-based form benefits from Playwright's auto-waiting and is the recommended modern API.

## Upload a Single File

The simplest case: point at a file on disk relative to the working directory.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test('upload a single file', async ({ page }) => {
  await page.goto('https://example.com/upload');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'resume.pdf'));

  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('resume.pdf uploaded')).toBeVisible();
});
\`\`\`

Always resolve paths with \`path.join(__dirname, ...)\` so the test works regardless of the directory the runner is invoked from.

## Upload Multiple Files

If the input has the \`multiple\` attribute, pass an array of paths.

\`\`\`typescript
test('upload multiple files', async ({ page }) => {
  await page.goto('https://example.com/gallery');

  await page.locator('input[type="file"]').setInputFiles([
    path.join(__dirname, 'fixtures', 'photo1.png'),
    path.join(__dirname, 'fixtures', 'photo2.png'),
    path.join(__dirname, 'fixtures', 'photo3.png'),
  ]);

  await expect(page.getByText('3 files selected')).toBeVisible();
});
\`\`\`

If the input lacks \`multiple\`, passing more than one file throws an error. Check the attribute first when in doubt.

## Upload a Buffer with MIME (No File on Disk)

A standout Playwright feature: you can upload a file that exists only in memory by passing a payload object with \`name\`, \`mimeType\`, and \`buffer\`. This is ideal for generated content, fixtures you do not want to commit, or testing specific MIME handling. This is the canonical "playwright upload file buffer mime example."

\`\`\`typescript
test('upload an in-memory buffer with explicit MIME', async ({ page }) => {
  await page.goto('https://example.com/upload');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'report.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('id,name\\n1,Alice\\n2,Bob\\n'),
  });

  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.getByText('report.csv')).toBeVisible();
});
\`\`\`

Uploading multiple buffers at once:

\`\`\`typescript
await page.locator('input[type="file"]').setInputFiles([
  { name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('first') },
  { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from('{"ok":true}') },
]);
\`\`\`

| Field | Type | Required | Notes |
|---|---|---|---|
| \`name\` | string | Yes | File name presented to the page |
| \`mimeType\` | string | Yes | Content type, e.g. \`image/png\` |
| \`buffer\` | Buffer | Yes | Raw file bytes |

## Common MIME Types Reference

When building buffer payloads, use the correct MIME type so the application-under-test handles the file as expected.

| File type | MIME type |
|---|---|
| PNG image | \`image/png\` |
| JPEG image | \`image/jpeg\` |
| PDF | \`application/pdf\` |
| CSV | \`text/csv\` |
| Plain text | \`text/plain\` |
| JSON | \`application/json\` |
| ZIP archive | \`application/zip\` |
| Excel (xlsx) | \`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\` |

## How setInputFiles Works Under the Hood

Understanding the mechanism explains why \`setInputFiles\` is so reliable. A real user clicking a file input opens a native OS dialog that automation cannot drive deterministically — it lives outside the browser's DOM. Instead of fighting that dialog, Playwright bypasses it: it attaches the files directly to the input element's internal file list and then dispatches the \`input\` and \`change\` DOM events that the page's JavaScript listens for. From the application's perspective, the result is indistinguishable from a user having picked the files in the dialog.

This is why the input does not need to be visible, why no actual OS dialog appears, and why the method works identically in headless and headed modes. It also means any framework-level handlers bound to the \`change\` event — React \`onChange\`, Vue \`@change\`, vanilla listeners — fire exactly as they would for a real selection. The only requirement is that an \`<input type="file">\` element exists in the DOM for Playwright to target. When that element is created lazily on click, you switch to the file-chooser event because there is no element to address until the click happens.

This design is a major reliability advantage over older WebDriver-based approaches, which historically struggled with the native dialog. If you are comparing tooling at the framework level, our [Selenium vs Playwright comparison](/blog/selenium-vs-playwright-2026) covers how the two differ on exactly this kind of browser interaction.

## Handling Hidden File Inputs

Many modern UIs hide the real \`<input type="file">\` and show a styled button instead. \`setInputFiles\` works on hidden inputs because it sets files directly on the DOM element — it does not require the element to be visible or click it. This is a key advantage over click-driven approaches.

\`\`\`typescript
test('upload via a visually hidden input', async ({ page }) => {
  await page.goto('https://example.com/styled-upload');

  // The input is display:none; setInputFiles still works
  await page.locator('input[type="file"]').setInputFiles(
    path.join(__dirname, 'fixtures', 'avatar.png')
  );

  await expect(page.getByAltText('avatar preview')).toBeVisible();
});
\`\`\`

If the input is not in the DOM until a trigger is clicked, click the trigger first, then call \`setInputFiles\`. For inputs added only on a click event, prefer the file-chooser pattern below.

## Intercepting the File Chooser

When the page opens a native file dialog on click (and no input is directly addressable), listen for the \`filechooser\` event. Set up the waiter before the click to avoid a race.

\`\`\`typescript
test('handle the native file chooser', async ({ page }) => {
  await page.goto('https://example.com/chooser');

  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Choose file' }).click(),
  ]);

  await fileChooser.setFiles(path.join(__dirname, 'fixtures', 'doc.pdf'));
  await expect(page.getByText('doc.pdf')).toBeVisible();
});
\`\`\`

The \`FileChooser\` object also exposes \`isMultiple()\` so you can branch on whether multiple files are accepted.

## Drag-and-Drop File Uploads

Some apps only accept files via a drag-and-drop zone with no underlying input. Playwright can simulate a drop by dispatching a \`DataTransfer\` with a file. This is more involved but fully scriptable.

\`\`\`typescript
test('drag and drop a file onto a dropzone', async ({ page }) => {
  await page.goto('https://example.com/dropzone');

  const buffer = Buffer.from('hello dropzone').toString('base64');

  const dataTransfer = await page.evaluateHandle(async (b64) => {
    const dt = new DataTransfer();
    const res = await fetch('data:text/plain;base64,' + b64);
    const blob = await res.blob();
    const file = new File([blob], 'dropped.txt', { type: 'text/plain' });
    dt.items.add(file);
    return dt;
  }, buffer);

  await page.locator('#dropzone').dispatchEvent('drop', { dataTransfer });
  await expect(page.getByText('dropped.txt')).toBeVisible();
});
\`\`\`

If the app actually uses a hidden file input under the dropzone, prefer \`setInputFiles\` — it is far simpler and less brittle.

## Clearing a File Selection

Pass an empty array to clear the currently selected files.

\`\`\`typescript
// Remove any selected files
await page.locator('input[type="file"]').setInputFiles([]);
\`\`\`

This is useful when testing a "remove file" flow or resetting state between assertions within one test.

## Uploading to a Specific Input Among Many

Pages with several file inputs (avatar, cover photo, attachments) need a precise locator so you target the right one. Prefer accessible locators — \`getByLabel\`, a nearby \`data-testid\`, or scoping within a section — over brittle nth-child selectors.

\`\`\`typescript
test('upload to the correct input among several', async ({ page }) => {
  await page.goto('https://example.com/profile/edit');

  // By associated label
  await page.getByLabel('Avatar').setInputFiles(
    path.join(__dirname, 'fixtures', 'avatar.png')
  );

  // By test id
  await page.getByTestId('cover-upload').setInputFiles(
    path.join(__dirname, 'fixtures', 'cover.jpg')
  );

  // Scoped within a section, then the only file input inside it
  await page
    .getByRole('region', { name: 'Attachments' })
    .locator('input[type="file"]')
    .setInputFiles([
      path.join(__dirname, 'fixtures', 'doc1.pdf'),
      path.join(__dirname, 'fixtures', 'doc2.pdf'),
    ]);
});
\`\`\`

When inputs are genuinely indistinguishable, fall back to \`.nth(0)\` / \`.nth(1)\`, but treat that as a last resort because reordering the markup silently breaks the test.

## Waiting Correctly Around Uploads

\`setInputFiles\` itself resolves once the files are set on the element, but the application often does asynchronous work afterward — reading the file, generating a preview, or sending a request. Do not insert fixed \`waitForTimeout\` delays. Instead wait on the observable result.

\`\`\`typescript
test('wait for the preview, not a fixed delay', async ({ page }) => {
  await page.goto('https://example.com/upload');

  await page.locator('input[type="file"]').setInputFiles(
    path.join(__dirname, 'fixtures', 'avatar.png')
  );

  // Good: wait for the rendered preview to appear
  await expect(page.getByRole('img', { name: 'preview' })).toBeVisible();

  // Avoid: await page.waitForTimeout(2000);  // flaky and slow
});
\`\`\`

Playwright's web-first \`expect\` retries automatically until the condition holds or the timeout elapses, so an assertion on the post-upload UI is both faster and more reliable than a hardcoded sleep.

## Python Examples

Playwright for Python exposes identical semantics. Use \`set_input_files\` (snake_case) and a dict for buffer payloads.

\`\`\`python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com/upload")

    # Single file from disk
    page.locator('input[type="file"]').set_input_files("fixtures/resume.pdf")

    # In-memory buffer with MIME
    page.locator('input[type="file"]').set_input_files({
        "name": "report.csv",
        "mimeType": "text/csv",
        "buffer": b"id,name\\n1,Alice\\n2,Bob\\n",
    })

    # Clear selection
    page.locator('input[type="file"]').set_input_files([])

    browser.close()
\`\`\`

| Capability | TypeScript | Python |
|---|---|---|
| Method name | \`setInputFiles\` | \`set_input_files\` |
| Buffer field | \`buffer: Buffer\` | \`"buffer": bytes\` |
| File chooser | \`page.waitForEvent('filechooser')\` | \`page.expect_file_chooser()\` |
| Clear files | \`setInputFiles([])\` | \`set_input_files([])\` |

## Verifying the Upload and Asserting on Results

Setting the file is only half the test — you must assert the application accepted it. There are three reliable verification layers: the visible UI, the input's own value, and the outbound network request. Use whichever matches what your app exposes.

\`\`\`typescript
test('verify upload at multiple layers', async ({ page }) => {
  await page.goto('https://example.com/upload');

  // Capture the multipart request the page sends on submit
  const uploadPromise = page.waitForRequest((req) =>
    req.url().includes('/api/upload') && req.method() === 'POST'
  );

  const input = page.locator('input[type="file"]');
  await input.setInputFiles(path.join(__dirname, 'fixtures', 'photo.png'));

  // 1) Assert the DOM input now reports one file
  const fileCount = await input.evaluate((el: HTMLInputElement) => el.files?.length ?? 0);
  expect(fileCount).toBe(1);

  await page.getByRole('button', { name: 'Submit' }).click();

  // 2) Assert the network request actually fired
  const request = await uploadPromise;
  expect(request.method()).toBe('POST');

  // 3) Assert the UI confirms success
  await expect(page.getByText('Upload complete')).toBeVisible();
});
\`\`\`

| Verification layer | How | When to use |
|---|---|---|
| Visible UI text | \`expect(locator).toBeVisible()\` | App shows a success/preview message |
| DOM input value | \`input.evaluate(el => el.files.length)\` | No visible confirmation rendered |
| Network request | \`page.waitForRequest(...)\` | Verify the multipart upload fires |

## Uploading from Test Fixtures and Generated Files

A clean pattern is to generate the file inside the test directory, upload it, then clean up — or skip disk entirely with a buffer. The buffer approach keeps the repository free of committed binaries and makes the test self-describing.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('generate a large CSV in memory and upload it', async ({ page }) => {
  await page.goto('https://example.com/import');

  // Build a 1,000-row CSV without touching the filesystem
  const rows = ['id,email'];
  for (let i = 1; i <= 1000; i++) {
    rows.push(\`\${i},user\${i}@example.com\`);
  }
  const csv = rows.join('\\n');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'bulk-users.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });

  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByText('1000 rows imported')).toBeVisible();
});
\`\`\`

This is also the recommended way to test file-size and format validation: craft a buffer of an exact size or an intentionally wrong MIME type and assert the app rejects it.

## Testing Upload Validation and Rejections

Robust upload features reject oversized files and disallowed types. Buffer payloads make negative testing trivial because you control the exact bytes and MIME.

\`\`\`typescript
test('rejects an executable disguised by extension', async ({ page }) => {
  await page.goto('https://example.com/upload');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'malware.png',          // wrong extension on purpose
    mimeType: 'application/octet-stream',
    buffer: Buffer.from([0x4d, 0x5a]), // MZ header of a PE binary
  });

  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.getByText('Unsupported file type')).toBeVisible();
});
\`\`\`

| Validation case | How to construct it |
|---|---|
| Oversized file | \`Buffer.alloc(11 * 1024 * 1024)\` for an 11 MB file |
| Wrong MIME type | Set \`mimeType\` to something the app rejects |
| Empty file | \`Buffer.from('')\` |
| Too many files | Pass an array longer than the allowed count |

## setInputFiles vs the File Chooser: Which to Use

Both approaches end with files attached to an input, but they suit different markup. \`setInputFiles\` is the default choice: it is synchronous-feeling, works on hidden inputs, and needs no event coordination. The file-chooser event is for cases where no input is reachable in the DOM until the user clicks, or where the page deliberately opens the OS dialog.

| Factor | \`setInputFiles\` | \`filechooser\` event |
|---|---|---|
| Requires addressable input | Yes | No |
| Works on hidden inputs | Yes | N/A |
| Needs \`Promise.all\` coordination | No | Yes |
| Buffer payload support | Yes | Yes (\`setFiles\`) |
| Simplicity | High | Moderate |
| Best for | Standard and styled inputs | Dynamic / OS-dialog flows |

The decision rule: try \`setInputFiles\` on the input first. Only reach for the \`filechooser\` event when the input genuinely does not exist until a click creates it, or when the app calls \`input.click()\` itself and you cannot intercept the element directly.

## Page vs Locator API

Historically uploads used \`page.setInputFiles(selector, files)\`. The modern, recommended form is \`locator.setInputFiles(files)\`. The locator API gains Playwright's auto-waiting and retry-ability, integrates with the same accessible selectors you use elsewhere, and reads more clearly. Both accept identical file argument shapes, so migration is a mechanical rewrite.

\`\`\`typescript
// Legacy page API (still supported)
await page.setInputFiles('#avatar', 'fixtures/avatar.png');

// Recommended locator API
await page.locator('#avatar').setInputFiles('fixtures/avatar.png');

// Even better with an accessible locator
await page.getByLabel('Avatar').setInputFiles('fixtures/avatar.png');
\`\`\`

Prefer the locator form in new code; reserve the page form only when you already have a selector string and a quick edit is all you need. For broader locator strategy, see the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide).

## Common Errors and Fixes

| Error / symptom | Cause | Fix |
|---|---|---|
| "Non-multiple file input can only accept single file" | Passed an array to a non-\`multiple\` input | Pass a single file or add \`multiple\` |
| "ENOENT: no such file or directory" | Wrong relative path | Use \`path.join(__dirname, ...)\` |
| Upload silently does nothing | Input not in DOM yet | Trigger it, or use the file-chooser event |
| Server rejects the file | Wrong \`mimeType\` in buffer payload | Set the correct MIME type |
| File chooser never resolves | Waiter set up after the click | Use \`Promise.all\` to set the waiter first |
| Path works locally, fails in CI | Relative cwd differs in CI | Always resolve with \`__dirname\` |

## Frequently Asked Questions

### How do I upload a file in Playwright?

Use \`setInputFiles\` on a locator targeting the file input: \`await page.locator('input[type="file"]').setInputFiles('path/to/file.pdf')\`. Playwright sets the file directly on the DOM element, so it works headlessly and even on hidden inputs without automating a native OS dialog.

### What does setInputFiles do in Playwright?

\`setInputFiles\` assigns one or more files to an \`<input type="file">\` element programmatically. It accepts a path string, an array of paths, an in-memory payload object with \`name\`, \`mimeType\`, and \`buffer\`, or an empty array to clear the selection. It is available on both the Locator and Page objects.

### How do I upload a file from a buffer in Playwright?

Pass a payload object instead of a path: \`setInputFiles({ name: 'report.csv', mimeType: 'text/csv', buffer: Buffer.from('...') })\`. This uploads a file that exists only in memory, which is ideal for generated content and testing specific MIME-type handling without committing fixture files to disk.

### Can Playwright upload to a hidden file input?

Yes. \`setInputFiles\` sets files directly on the DOM element and does not require the input to be visible or clickable. Many modern UIs hide the real input behind a styled button, and \`setInputFiles\` works on those hidden inputs without any extra steps.

### How do I handle a native file chooser dialog in Playwright?

Listen for the \`filechooser\` event before the click using \`Promise.all\`, then call \`fileChooser.setFiles(...)\`. This pattern handles cases where clicking a button opens the OS dialog and the file input is not directly addressable, avoiding a race between the waiter and the click.

### How do I upload multiple files in Playwright?

Pass an array of paths to \`setInputFiles\`, for example \`setInputFiles(['a.png', 'b.png'])\`. The target input must have the \`multiple\` attribute; otherwise Playwright throws an error stating a non-multiple input can only accept a single file. You can also pass an array of buffer payloads.

### How do I clear selected files in Playwright?

Call \`setInputFiles([])\` with an empty array on the file input locator. This removes any previously selected files, which is useful for testing remove-file flows or resetting state between assertions inside a single test.

### Does Playwright file upload work the same in Python?

Yes. The Python binding uses \`set_input_files\` (snake_case) with identical argument shapes: a path, a list of paths, or a dict with \`name\`, \`mimeType\`, and \`buffer\` (bytes). The file-chooser pattern uses \`page.expect_file_chooser()\`. The semantics match the TypeScript API exactly.

## Conclusion

\`setInputFiles\` is the deterministic, CI-friendly way to handle file uploads in Playwright. Reach for the locator-based form first; use buffer payloads with explicit MIME types when you need in-memory files; fall back to the \`filechooser\` event only when no input is addressable; and pass an empty array to clear a selection. With these patterns you can cover every upload scenario without touching a flaky native dialog.

Put it into practice with the upload helpers in the [QASkills skills directory](/skills), and round out your suite with the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) and our [Cypress vs Playwright comparison](/blog/cypress-vs-playwright-2026).
`,
};
