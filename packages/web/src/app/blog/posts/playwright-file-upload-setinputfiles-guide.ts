import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright File Upload with setInputFiles: Complete Guide',
  description:
    'File upload in Playwright: setInputFiles single/multiple files, Buffer uploads, hidden inputs, the filechooser event, directory and drag-and-drop uploads.',
  date: '2026-06-18',
  category: 'Reference',
  content: `
# Playwright File Upload with setInputFiles: Complete Guide

Uploading files is one of the most common — and most fiddly — interactions to automate. Native OS file dialogs cannot be driven by browser automation, so Playwright deliberately bypasses them. Instead of clicking the picker and steering a system dialog, you hand file paths (or in-memory bytes) directly to the underlying \`<input type="file">\` element with \`locator.setInputFiles()\`. This page is a complete, copy-paste reference covering every upload scenario in both TypeScript and Python.

The core idea: Playwright sets the files on the input element programmatically, then the page's normal change-event logic runs exactly as if a human had picked them. No OS dialog ever appears, which is what makes uploads fast and headless-safe.

## The setInputFiles Basics

\`setInputFiles\` is a method on a \`Locator\` (or \`ElementHandle\`) that targets an \`<input type="file">\`. You pass it one path, several paths, an in-memory file descriptor, or an empty array to clear the selection.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('upload a single file', async ({ page }) => {
  await page.goto('https://example.com/upload');

  // Target the file input and set one file by path
  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/photo.png');

  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.getByText('photo.png uploaded')).toBeVisible();
});
\`\`\`

\`\`\`python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com/upload")

    page.locator('input[type="file"]').set_input_files("tests/fixtures/photo.png")

    page.get_by_role("button", name="Upload").click()
    page.wait_for_selector("text=photo.png uploaded")
    browser.close()
\`\`\`

Paths are resolved relative to the current working directory of the test process, so prefer absolute paths or paths anchored to a known fixtures folder to avoid surprises across local and CI runs.

## Parameter Reference

\`setInputFiles\` accepts a flexible first argument and an optional options object. This table is the canonical breakdown.

| Argument form | Type | Meaning |
|---|---|---|
| \`'path/to/file'\` | string | Single file from disk |
| \`['a.png', 'b.pdf']\` | string[] | Multiple files (input must have \`multiple\`) |
| \`[]\` | empty array | Clears the current selection |
| \`{ name, mimeType, buffer }\` | object | In-memory file; no disk file needed |
| \`[{...}, {...}]\` | object[] | Multiple in-memory files |
| \`{ timeout: 5000 }\` | options | Max wait for the element (ms) |
| \`{ noWaitAfter: true }\` | options | Do not wait for navigation after setting |

The in-memory descriptor object has exactly three fields: \`name\` (the filename the page will see), \`mimeType\` (e.g. \`image/png\`), and \`buffer\` (a \`Buffer\` in Node or \`bytes\` in Python). This is the mechanism for generating test files on the fly without touching the filesystem.

## Uploading Multiple Files

When the input declares the \`multiple\` attribute, pass an array of paths. Playwright sets them all in one call and a single \`change\` event fires.

\`\`\`typescript
test('upload multiple files', async ({ page }) => {
  await page.goto('https://example.com/gallery');

  await page.locator('#images').setInputFiles([
    'tests/fixtures/one.png',
    'tests/fixtures/two.png',
    'tests/fixtures/three.png',
  ]);

  await expect(page.locator('.thumbnail')).toHaveCount(3);
});
\`\`\`

\`\`\`python
page.locator("#images").set_input_files([
    "tests/fixtures/one.png",
    "tests/fixtures/two.png",
    "tests/fixtures/three.png",
])
assert page.locator(".thumbnail").count() == 3
\`\`\`

If you pass multiple paths to an input that lacks the \`multiple\` attribute, Playwright raises an error, because the DOM itself only accepts a single file there. Check the attribute in the page markup if you hit that.

## Clearing a Selection

To deselect everything — useful when testing reset buttons or re-upload flows — pass an empty array.

\`\`\`typescript
// Select a file...
await page.locator('#avatar').setInputFiles('tests/fixtures/avatar.png');
// ...then clear it
await page.locator('#avatar').setInputFiles([]);
await expect(page.locator('#avatar')).toHaveJSProperty('files.length', 0);
\`\`\`

\`\`\`python
page.locator("#avatar").set_input_files("tests/fixtures/avatar.png")
page.locator("#avatar").set_input_files([])
\`\`\`

Clearing is the correct way to reset; do not try to set an empty string or \`null\`, which are not valid inputs.

## Uploading From a Buffer (In-Memory Files)

Often you do not want a real file checked into the repo — you want to generate content at runtime (a CSV with specific rows, a malformed image, a 10 KB random blob). The buffer form lets you do exactly that.

\`\`\`typescript
test('upload an in-memory CSV', async ({ page }) => {
  await page.goto('https://example.com/import');

  const csv = 'name,email\\nAlice,alice@example.com\\nBob,bob@example.com\\n';

  await page.locator('#csv').setInputFiles({
    name: 'contacts.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf-8'),
  });

  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByText('2 contacts imported')).toBeVisible();
});
\`\`\`

\`\`\`python
csv = "name,email\\nAlice,alice@example.com\\nBob,bob@example.com\\n"

page.locator("#csv").set_input_files(files=[{
    "name": "contacts.csv",
    "mimeType": "text/csv",
    "buffer": csv.encode("utf-8"),
}])

page.get_by_role("button", name="Import").click()
page.wait_for_selector("text=2 contacts imported")
\`\`\`

This is the most powerful upload technique because it decouples your tests from fixture files entirely. It is ideal for data-driven testing where each test case needs slightly different file content. Combine it with the patterns in our [QA skills directory](/skills) to template fixture generation across a suite.

## Uploading to a Hidden Input

Most modern upload UIs hide the real \`<input type="file">\` behind a styled button or drop zone. \`setInputFiles\` does **not** require the input to be visible — it works directly on the DOM element regardless of CSS. This is a deliberate and very useful exception to Playwright's usual visibility checks.

\`\`\`typescript
test('upload through a styled drop zone with hidden input', async ({ page }) => {
  await page.goto('https://example.com/dropzone');

  // The visible UI is a div; the real input is display:none.
  // Target the hidden input directly — no need to click the pretty button.
  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/doc.pdf');

  await expect(page.getByText('doc.pdf')).toBeVisible();
});
\`\`\`

\`\`\`python
page.locator('input[type="file"]').set_input_files("tests/fixtures/doc.pdf")
\`\`\`

If the input is dynamically created only after a click (some frameworks add it on demand), click the trigger first, then locate and set. But if the input already exists in the DOM — even hidden — go straight to it and skip the click entirely. That is faster and far less flaky.

## The filechooser Event Pattern

Sometimes the input is created lazily, or you genuinely want to react to the moment the chooser opens — for instance the button is what you can see and the input is created by its click handler. For those cases, listen for the \`filechooser\` event and set files on the chooser it gives you.

\`\`\`typescript
test('handle the filechooser event', async ({ page }) => {
  await page.goto('https://example.com/upload');

  // Start waiting BEFORE the click that triggers the chooser
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Choose file' }).click(),
  ]);

  await fileChooser.setFiles('tests/fixtures/report.xlsx');
  await expect(page.getByText('report.xlsx')).toBeVisible();
});
\`\`\`

\`\`\`python
with page.expect_file_chooser() as fc_info:
    page.get_by_role("button", name="Choose file").click()
file_chooser = fc_info.value
file_chooser.set_files("tests/fixtures/report.xlsx")
\`\`\`

The ordering matters: you must register the wait *before* the action that opens the chooser, otherwise the event fires before you are listening and the test hangs. The \`FileChooser\` object also exposes \`isMultiple()\` so you can assert whether the input accepts more than one file.

## Directory Uploads

For inputs that accept whole folders (the \`webkitdirectory\` attribute), pass a directory path to \`setInputFiles\`. Playwright enumerates the directory contents and presents them to the page.

\`\`\`typescript
test('upload an entire directory', async ({ page }) => {
  await page.goto('https://example.com/bulk');

  // Pass the folder path; Playwright walks it and uploads the files inside
  await page.locator('input[webkitdirectory]').setInputFiles('tests/fixtures/batch');

  await expect(page.getByText(/\\d+ files queued/)).toBeVisible();
});
\`\`\`

\`\`\`python
page.locator("input[webkitdirectory]").set_input_files("tests/fixtures/batch")
\`\`\`

Directory upload support depends on the browser honoring \`webkitdirectory\`; it is well supported in Chromium-based browsers. Keep the fixture directory small and deterministic so counts in assertions stay stable.

## Drag-and-Drop Upload

Some drop zones do not have a backing file input at all and only respond to drag-and-drop DataTransfer events. \`setInputFiles\` cannot help there because there is no \`<input>\`. You synthesize the drop with a \`DataTransfer\` object created in the page context.

\`\`\`typescript
test('drag and drop a file onto a drop zone', async ({ page }) => {
  await page.goto('https://example.com/drag-upload');

  // Build a DataTransfer with a file inside the browser context
  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    const file = new File(['hello world'], 'note.txt', { type: 'text/plain' });
    dt.items.add(file);
    return dt;
  });

  // Dispatch the drop on the target zone
  await page.locator('#drop-zone').dispatchEvent('drop', { dataTransfer });
  await expect(page.getByText('note.txt')).toBeVisible();
});
\`\`\`

This approach builds the file in-browser, so it does not read from disk. It is the only reliable way to test pure drag-and-drop zones, and it is worth confirming the target actually listens for \`drop\` rather than a hidden input first — many "drop zones" do have an input and the simpler \`setInputFiles\` will work.

## Approaches Compared

Which technique to reach for depends on how the page is built. This table maps page structure to the right method.

| Page structure | Best approach | Why |
|---|---|---|
| Visible or hidden \`<input type="file">\` | \`setInputFiles\` on the input | Simplest, fastest, no click needed |
| Input created on click | \`filechooser\` event | Input does not exist until the click |
| Generated/dynamic file content | Buffer descriptor | No fixture file on disk required |
| Folder picker (\`webkitdirectory\`) | \`setInputFiles\` with a dir path | Playwright walks the directory |
| Pure drop zone, no input | \`dispatchEvent('drop')\` + DataTransfer | No input element exists to set |

For end-to-end flows that include uploads on mobile viewports, our [Playwright mobile emulation](/blog/playwright-mobile-emulation) guide covers the device and touch settings to pair with these patterns.

## Waiting for the Upload to Complete

Setting the files is instant, but the *upload* — the network request that ships the bytes to the server — is asynchronous. A frequent mistake is asserting success immediately after \`setInputFiles\` and getting a flaky failure because the request has not finished. Wait on a real signal: a confirmation element, a network response, or a UI state change.

\`\`\`typescript
test('wait for the upload network response', async ({ page }) => {
  await page.goto('https://example.com/upload');

  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/big.pdf');

  // Click upload and wait for the server response in one coordinated step
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/upload') && r.status() === 200
    ),
    page.getByRole('button', { name: 'Upload' }).click(),
  ]);

  expect((await response.json()).status).toBe('ok');
});
\`\`\`

\`\`\`python
with page.expect_response(
    lambda r: "/api/upload" in r.url and r.status == 200
) as resp_info:
    page.get_by_role("button", name="Upload").click()

assert resp_info.value.json()["status"] == "ok"
\`\`\`

Waiting on the network response, rather than a fixed \`sleep\`, is what makes upload tests fast *and* reliable. Auto-waiting on a visible confirmation element works equally well when the API is internal.

## Asserting What Was Selected

Before submitting, you often want to assert that the right files landed on the input. The selected files live on the input element's \`files\` FileList, which you can read with \`toHaveJSProperty\` or by evaluating in the page.

\`\`\`typescript
// Assert count and the first file's name without submitting
const input = page.locator('input[type="file"]');
await input.setInputFiles(['tests/fixtures/a.png', 'tests/fixtures/b.png']);

await expect(input).toHaveJSProperty('files.length', 2);

const names = await input.evaluate((el: HTMLInputElement) =>
  Array.from(el.files ?? []).map((f) => f.name)
);
expect(names).toEqual(['a.png', 'b.png']);
\`\`\`

\`\`\`python
input_el = page.locator('input[type="file"]')
input_el.set_input_files(["tests/fixtures/a.png", "tests/fixtures/b.png"])

names = input_el.evaluate(
    "el => Array.from(el.files).map(f => f.name)"
)
assert names == ["a.png", "b.png"]
\`\`\`

This lets you verify selection logic independently of the upload request, which is invaluable when debugging whether a failure is in the picker step or the server step.

## Reusable Upload Fixtures

In a real suite you upload in dozens of tests, so wrap the pattern in a fixture or helper. The example below adds a typed helper that accepts either a path or generated content, keeping individual tests terse.

\`\`\`typescript
// fixtures/upload.ts
import { test as base, Page } from '@playwright/test';

type UploadFixtures = {
  uploadCsv: (selector: string, rows: string[][]) => Promise<void>;
};

export const test = base.extend<UploadFixtures>({
  uploadCsv: async ({ page }: { page: Page }, use) => {
    await use(async (selector, rows) => {
      const csv = rows.map((r) => r.join(',')).join('\\n') + '\\n';
      await page.locator(selector).setInputFiles({
        name: 'data.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csv, 'utf-8'),
      });
    });
  },
});

export { expect } from '@playwright/test';
\`\`\`

\`\`\`typescript
// a test using the fixture
import { test, expect } from './fixtures/upload';

test('import generated contacts', async ({ page, uploadCsv }) => {
  await page.goto('https://example.com/import');
  await uploadCsv('#csv', [
    ['name', 'email'],
    ['Alice', 'alice@example.com'],
  ]);
  await page.getByRole('button', { name: 'Import' }).click();
  await expect(page.getByText('1 contact imported')).toBeVisible();
});
\`\`\`

Centralizing upload logic this way means a UI change touches one helper rather than every test. Many such reusable patterns are catalogued in the [QA skills directory](/skills) as drop-in skills.

## Common Errors and Fixes

The errors below cover the vast majority of upload failures. Match the message to the cause.

\`\`\`text
Error: locator.setInputFiles: Node is not an HTMLInputElement
\`\`\`

This means your locator matched a button, label, or wrapper div instead of the actual \`<input type="file">\`. Inspect the DOM and target the input directly (it may be hidden — that is fine). If the input genuinely does not exist yet, switch to the \`filechooser\` event pattern.

\`\`\`text
Error: Non-multiple file input can only accept single file
\`\`\`

You passed an array of paths to an input without the \`multiple\` attribute. Either pass a single path or fix the test to match the input's real capability.

\`\`\`text
Error: ENOENT: no such file or directory, stat 'tests/fixtures/photo.png'
\`\`\`

The path does not resolve from the test process's working directory. Use an absolute path or anchor it with \`path.join(__dirname, ...)\`. This is the most common CI-only failure because the working directory differs from local.

\`\`\`typescript
import path from 'node:path';
await page.locator('#file').setInputFiles(
  path.join(__dirname, 'fixtures', 'photo.png')
);
\`\`\`

## MIME Types and Large Files

For path-based uploads, the browser infers the MIME type from the file extension and contents, just as a real upload would. For **buffer** uploads, you set \`mimeType\` explicitly — and getting it wrong is a frequent cause of server-side validation rejecting a perfectly valid byte stream. Always match the \`mimeType\` to what your application expects.

| File kind | Typical \`mimeType\` |
|---|---|
| PNG image | \`image/png\` |
| JPEG image | \`image/jpeg\` |
| PDF document | \`application/pdf\` |
| CSV data | \`text/csv\` |
| Plain text | \`text/plain\` |
| ZIP archive | \`application/zip\` |
| JSON | \`application/json\` |

Large files deserve care. Buffer uploads hold the entire file in memory in the test process, so multi-hundred-megabyte buffers can exhaust the runner. For large-file scenarios prefer a real path on disk (streamed by Playwright) over an in-memory buffer, and raise the action timeout so a slow upload network round-trip does not trip the default. If you are comparing tooling for heavy upload or API workloads, our [Postman vs Playwright](/blog/postman-vs-playwright) breakdown is a useful reference, and [what's new in Playwright 2026](/blog/whats-new-in-playwright-2026) covers recent upload-related API refinements.

## Uploading in API and Hybrid Tests

Not every upload needs a browser. When you are testing the upload endpoint itself rather than the UI, Playwright's \`request\` API context can POST multipart form data directly, which is faster and avoids rendering the page at all. This is the right tool when the file picker is incidental and the server contract is what you care about.

\`\`\`typescript
test('upload via the API request context', async ({ request }) => {
  const response = await request.post('https://example.com/api/upload', {
    multipart: {
      title: 'Quarterly report',
      file: {
        name: 'report.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 fake bytes'),
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  expect((await response.json()).id).toBeDefined();
});
\`\`\`

\`\`\`python
response = request_context.post(
    "https://example.com/api/upload",
    multipart={
        "title": "Quarterly report",
        "file": {
            "name": "report.pdf",
            "mimeType": "application/pdf",
            "buffer": b"%PDF-1.4 fake bytes",
        },
    },
)
assert response.ok
\`\`\`

A hybrid strategy is common in mature suites: drive the UI upload once to prove the end-to-end flow works, then cover the many edge cases (bad MIME types, oversized files, missing fields) at the API layer where tests run in milliseconds. For a fuller treatment of when to choose API-level versus browser-level testing, see our [Postman vs Playwright](/blog/postman-vs-playwright) comparison.

## Frequently Asked Questions

### How do I upload a file in Playwright?

Target the \`<input type="file">\` element with a locator and call \`setInputFiles\` with the file path: \`await page.locator('input[type="file"]').setInputFiles('path/to/file.png')\`. Playwright sets the file directly on the DOM element and fires the normal change event, so no OS file dialog ever appears. This works in headless mode and is the recommended approach for almost all uploads.

### How do I upload multiple files in Playwright?

Pass an array of paths to \`setInputFiles\`, for example \`setInputFiles(['a.png', 'b.png'])\`. The input element must declare the \`multiple\` attribute, otherwise Playwright raises an error because the DOM only accepts one file there. All files are set in a single call and one change event fires, mirroring a real multi-select.

### Can Playwright upload a file without a real file on disk?

Yes. Pass an in-memory descriptor object with \`name\`, \`mimeType\`, and \`buffer\` fields: \`setInputFiles({ name: 'data.csv', mimeType: 'text/csv', buffer: Buffer.from(content) })\`. This generates the file content at runtime with no fixture file checked into the repo, which is ideal for data-driven tests where each case needs different file contents.

### How do I upload to a hidden file input in Playwright?

\`setInputFiles\` does not require the input to be visible, so you can target a hidden input directly even if it is styled with \`display:none\` behind a custom button. Just locate the \`input[type="file"]\` and call \`setInputFiles\` — no need to click the visible trigger first, which makes the test faster and less flaky.

### What is the filechooser event in Playwright?

The \`filechooser\` event fires when the page opens a file picker, typically after a button click. You wait for it, then call \`setFiles\` on the \`FileChooser\` object it provides. Use this when the file input is created only on demand by a click handler. Register the wait before the click, or the event fires before you are listening and the test hangs.

### Why does Playwright say "Node is not an HTMLInputElement"?

Your locator matched something other than the actual file input — usually a label, button, or wrapper div. Inspect the DOM and target the \`<input type="file">\` directly, even if it is hidden. If the input is created dynamically and does not exist when you call \`setInputFiles\`, switch to the filechooser event pattern instead.

### How do I test drag-and-drop file upload in Playwright?

For drop zones with no backing input, build a \`DataTransfer\` containing a \`File\` inside the page context with \`evaluateHandle\`, then dispatch a \`drop\` event on the zone: \`locator.dispatchEvent('drop', { dataTransfer })\`. This synthesizes the drop entirely in the browser. First confirm there is truly no hidden input, since \`setInputFiles\` is simpler when one exists.

### How do I clear a selected file in Playwright?

Call \`setInputFiles\` with an empty array: \`await page.locator('#file').setInputFiles([])\`. This deselects all files and is the correct way to test reset or re-upload flows. Do not pass an empty string or \`null\` — only an empty array is valid. You can verify with \`toHaveJSProperty('files.length', 0)\`.

## Conclusion

Playwright's \`setInputFiles\` covers the full spectrum of upload testing: single and multiple files, in-memory buffers, hidden inputs, directories, the filechooser event for lazy inputs, and synthesized drag-and-drop for input-less zones. Match the technique to the page structure, mind your MIME types on buffer uploads, and use absolute paths to stay green in CI.

Want battle-tested upload helpers and fixtures you can drop into your suite today? Explore the [QASkills directory](/skills) for ready-made Playwright skills, including file-upload utilities and data-driven fixture generators.
`,
};
