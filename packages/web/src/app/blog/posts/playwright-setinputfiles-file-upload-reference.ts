import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Playwright setInputFiles File Upload: Reference (2026)",
  description: "The official-style reference for Playwright setInputFiles in 2026 — every overload, buffer/name/mimeType uploads, file chooser, drag-drop, and errors.",
  date: "2026-06-15",
  category: "Playwright",
  content: `# Playwright setInputFiles File Upload: Reference (2026)

\`locator.setInputFiles()\` is the Playwright API for uploading files to an \`<input type="file">\` element. You pass it one path, an array of paths, or in-memory file objects, and Playwright sets the input's selected files — without ever opening the OS file dialog. The simplest case is a single file by path:

\`\`\`typescript
await page.locator('input[type="file"]').setInputFiles('tests/fixtures/avatar.png');
\`\`\`

That one line covers the majority of upload tests. The rest of this reference documents every overload, the in-memory \`{ name, mimeType, buffer }\` form, hidden inputs, the file-chooser pattern, multiple-file and directory uploads, drag-and-drop without an input, and the errors you will hit.

## Why setInputFiles instead of clicking

When a user clicks an upload button, the browser opens a native OS file picker. That dialog is **outside the page**, so Playwright (which drives the page through the browser, not the OS) cannot type into it. \`setInputFiles\` sidesteps the dialog entirely: it sets the files directly on the \`<input>\` element and fires the \`input\` and \`change\` events the page is listening for. This is faster, deterministic, and works headless and in CI where no file dialog exists.

For the broader testing model this fits into, see the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide).

## Signatures and overloads

\`setInputFiles\` accepts a single value (or array) plus an optional options bag. The "value" can be a string path, an array of string paths, an in-memory file payload object, or an array of those objects.

| Argument form | TypeScript type | Meaning |
|---|---|---|
| Single path | \`string\` | Upload one file from disk |
| Multiple paths | \`string[]\` | Upload several files (input needs \`multiple\`) |
| Clear selection | \`[]\` | Empty array removes all selected files |
| In-memory file | \`{ name, mimeType, buffer }\` | Upload a file built in code, no disk file |
| Multiple in-memory | \`Array<{ name, mimeType, buffer }>\` | Several generated files |

The in-memory payload object has exactly three fields:

| Field | Type | Description |
|---|---|---|
| \`name\` | \`string\` | File name shown to the page (e.g. \`report.csv\`) |
| \`mimeType\` | \`string\` | Optional MIME type (e.g. \`text/csv\`). Inferred from \`name\` if omitted |
| \`buffer\` | \`Buffer\` | The raw file contents |

Common options on the second argument include \`noWaitAfter\` and \`timeout\`. The method auto-waits for the element to be present and to be a file input before acting.

## Upload a single file by path

Paths are resolved relative to the current working directory, so prefer an absolute path or one anchored to your project to avoid surprises in CI.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('upload one file', async ({ page }) => {
  await page.goto('https://example.com/upload');

  const file = path.join(__dirname, 'fixtures', 'avatar.png');
  await page.locator('#file-input').setInputFiles(file);

  await expect(page.locator('.filename')).toHaveText('avatar.png');
});
\`\`\`

Using \`path.join(__dirname, ...)\` makes the test independent of where you run it from.

## Upload multiple files

If the \`<input>\` carries the \`multiple\` attribute, pass an array of paths. Without \`multiple\`, the browser keeps only the last file.

\`\`\`typescript
await page.locator('input[type="file"]').setInputFiles([
  'tests/fixtures/a.pdf',
  'tests/fixtures/b.pdf',
  'tests/fixtures/c.pdf',
]);
\`\`\`

\`\`\`html
<input type="file" multiple />
\`\`\`

## Clear the selected files

Pass an empty array to deselect everything. This is the documented way to reset a file input between actions in the same test.

\`\`\`typescript
await page.locator('#file-input').setInputFiles([]);
\`\`\`

## Upload an in-memory file (buffer, name, mimeType)

You don't need a real file on disk. Build the contents as a \`Buffer\` and describe it with \`name\` and \`mimeType\`. This is ideal for generated CSVs, JSON fixtures, or test data you'd rather not commit.

\`\`\`typescript
import { test } from '@playwright/test';

test('upload generated CSV', async ({ page }) => {
  await page.goto('https://example.com/import');

  await page.locator('#csv-input').setInputFiles({
    name: 'report.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('id,score\\n1,42\\n2,17\\n'),
  });
});
\`\`\`

\`mimeType\` is optional; if you omit it, Playwright infers it from the file extension in \`name\`. To upload several generated files at once, pass an array of these objects (the input still needs \`multiple\`).

## Hidden file inputs

A critical, often-misunderstood fact: **\`setInputFiles\` works on hidden inputs.** Many modern UIs hide the real \`<input type="file">\` with CSS (\`display:none\`, zero opacity, off-screen positioning) and show a styled button instead. You do **not** need to make the input visible, and you should not call \`.click()\` on it. Target the input directly and set the files:

\`\`\`typescript
// The input is display:none — that's fine.
await page.locator('input[type="file"]').setInputFiles('tests/fixtures/doc.pdf');
\`\`\`

This is the difference between \`setInputFiles\` and ordinary actions like \`click\` or \`fill\`, which require an actionable (visible, enabled) element. Because \`setInputFiles\` does not simulate a real click on the input, the element's visibility is irrelevant.

## The file chooser pattern

When you can't (or don't want to) locate the underlying input — for example the input is created dynamically only after a click — use the file-chooser event. Playwright emits a \`filechooser\` event when a chooser opens. Set up the wait **before** the click that triggers it, then call \`fileChooser.setFiles(...)\`:

\`\`\`typescript
const fileChooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Upload' }).click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles('tests/fixtures/photo.jpg');
\`\`\`

The order matters: create the \`waitForEvent('filechooser')\` promise *first*, then click, then await it — otherwise the event can fire before you are listening. The \`fileChooser\` object exposes \`setFiles()\` (same value forms as \`setInputFiles\`), \`isMultiple()\`, and \`element()\` to reach the input locator.

You can also handle it with a listener via \`page.on('filechooser', ...)\`, useful when the chooser may open at an unpredictable moment:

\`\`\`typescript
page.on('filechooser', async (fileChooser) => {
  await fileChooser.setFiles('tests/fixtures/photo.jpg');
});
await page.getByRole('button', { name: 'Upload' }).click();
\`\`\`

## Directory upload (webkitdirectory)

For inputs that accept a whole folder via the \`webkitdirectory\` attribute, pass the directory path to \`setFiles\` on a file chooser. Note the caveats:

\`\`\`typescript
const fileChooserPromise = page.waitForEvent('filechooser');
await page.getByText('Select folder').click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles('tests/fixtures/my-folder');
\`\`\`

Caveats: directory upload depends on the page actually using a \`webkitdirectory\` input; it is browser-dependent (a Chromium-era feature) and not uniformly supported across WebKit/Firefox builds; and the directory must exist on disk — you cannot supply an in-memory folder. Prefer the file-chooser route here, and verify behavior per browser in your matrix.

## Drag-and-drop uploads (no input element)

Some drop zones have **no \`<input type="file">\` at all** — they read files from the drop event's \`dataTransfer\`. \`setInputFiles\` cannot help because there is no input. The technique is to build a \`DataTransfer\` with a \`File\` in the page, then dispatch the drag/drop events onto the drop zone using \`locator.dispatchEvent()\`:

\`\`\`typescript
// Build a DataTransfer containing a file, inside the page.
const dataTransfer = await page.evaluateHandle(async () => {
  const dt = new DataTransfer();
  const res = await fetch(
    'data:text/plain;base64,' + btoa('hello drop zone'),
  );
  const blob = await res.blob();
  const file = new File([blob], 'note.txt', { type: 'text/plain' });
  dt.items.add(file);
  return dt;
});

const dropzone = page.locator('#dropzone');
await dropzone.dispatchEvent('dragenter', { dataTransfer });
await dropzone.dispatchEvent('dragover', { dataTransfer });
await dropzone.dispatchEvent('drop', { dataTransfer });
\`\`\`

Because \`dispatchEvent\` constructs and dispatches a real DOM event with your \`dataTransfer\` payload, the app's drop handler receives the file exactly as if a user had dragged it in. This is the standard workaround for \`react-dropzone\`-style components and other custom drop zones.

## Python

The Python API mirrors the TypeScript one. The method is \`set_input_files\`, and the in-memory payload uses \`name\`, \`mime_type\`, and \`buffer\` (a \`bytes\` value, not a Node \`Buffer\`).

\`\`\`python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("https://example.com/upload")

    # Single file by path
    page.locator("#file-input").set_input_files("tests/fixtures/avatar.png")

    # Multiple files (input needs \`multiple\`)
    page.locator("input[type=file]").set_input_files(
        ["tests/fixtures/a.pdf", "tests/fixtures/b.pdf"]
    )

    # In-memory file
    page.locator("#csv-input").set_input_files(
        files=[{
            "name": "report.csv",
            "mimeType": "text/csv",
            "buffer": b"id,score\\n1,42\\n",
        }]
    )

    # Clear the selection
    page.locator("#file-input").set_input_files([])

    browser.close()
\`\`\`

The file-chooser pattern in Python uses \`page.expect_file_chooser()\`:

\`\`\`python
with page.expect_file_chooser() as fc_info:
    page.get_by_role("button", name="Upload").click()
file_chooser = fc_info.value
file_chooser.set_files("tests/fixtures/photo.jpg")
\`\`\`

## Java (quick note)

Java exposes the same capability via \`Locator.setInputFiles(...)\`, accepting a \`Path\`, an array of \`Path\`, or \`FilePayload\` objects (\`new FilePayload("report.csv", "text/csv", bytes)\`). The file chooser uses \`page.waitForFileChooser(() -> { ... })\` and \`fileChooser.setFiles(...)\`. Method names follow Java camelCase (\`setInputFiles\`, not \`set_input_files\`), and you pass \`java.nio.file.Path\` rather than raw strings for disk files.

## Common errors and fixes

These are the failures you will actually encounter.

### "Node is not an HTMLInputElement"

You targeted something that is not an \`<input>\` — usually the styled label/button instead of the real input, or a wrapping \`<div>\`. \`setInputFiles\` only operates on \`<input type="file">\`. Fix your locator to point at the actual input (it is often hidden nearby), or switch to the file-chooser pattern and click the button instead.

### Element is not a file input

Same family of problem: you matched an \`<input>\` of the wrong \`type\` (e.g. \`type="text"\`). Confirm the element is \`type="file"\`. If the page has no file input at all and uses a drop zone, use the DataTransfer drag-and-drop technique instead.

### Path does not exist / non-existent file

A relative path resolved against the wrong working directory, or a typo. Use \`path.join(__dirname, ...)\` (TS) or an absolute path, and verify the fixture is committed and present in CI. A missing file surfaces as a clear path-not-found error.

### Files set but the app shows nothing

The app may listen for a custom event or only react after the file chooser closes. Prefer the file-chooser pattern so the app's own click-driven flow runs, and assert on a visible result (filename text, preview image) rather than on the input value.

To keep AI coding agents generating these patterns correctly — hidden-input handling, the chooser ordering, buffer uploads — install the [playwright-e2e skill](/skills) from the QASkills directory.

## Frequently Asked Questions

### Does Playwright setInputFiles work on hidden file inputs?

Yes. \`setInputFiles\` does not require the element to be visible or actionable, so it works on inputs hidden with \`display:none\`, zero opacity, or off-screen positioning. Target the real \`<input type="file">\` directly and do not click it. This is the recommended approach for modern UIs that hide the native input behind a styled button.

### How do I upload a file without a path using a buffer?

Pass an object with \`name\`, optional \`mimeType\`, and a \`buffer\` (Node \`Buffer\` in TypeScript, \`bytes\` in Python). For example \`{ name: 'data.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\\n1,2\\n') }\`. Playwright treats it as a real uploaded file, so you can generate fixtures in code without touching the disk.

### What is the difference between setInputFiles and the file chooser?

\`setInputFiles\` sets files directly on a known \`<input>\` element and is the simplest, most reliable option. The file-chooser pattern (\`page.waitForEvent('filechooser')\` plus \`fileChooser.setFiles(...)\`) is for when you cannot locate the input — for example it is created only after a click. Both accept the same path, array, and in-memory value forms.

### How do I upload multiple files in Playwright?

Add the \`multiple\` attribute to the input and pass an array of paths or in-memory objects: \`setInputFiles(['a.pdf', 'b.pdf'])\`. Without \`multiple\`, only the last file is kept. Pass an empty array \`[]\` to clear the selection entirely.

### How do I test drag-and-drop file uploads with no input element?

Build a \`DataTransfer\` containing a \`File\` inside the page with \`page.evaluateHandle(...)\`, then dispatch \`dragenter\`, \`dragover\`, and \`drop\` events on the drop zone using \`locator.dispatchEvent('drop', { dataTransfer })\`. This delivers the file to the app's drop handler exactly as a real drag would, which is the standard workaround for custom drop zones with no \`<input type="file">\`.

### Why does Playwright not open the OS file dialog when uploading?

By design. The native OS file picker lives outside the browser page, so Playwright cannot drive it. Instead, \`setInputFiles\` sets the selected files on the input element programmatically and fires the \`input\` and \`change\` events the page expects. This makes uploads fast, deterministic, and fully functional in headless and CI environments where no dialog exists.
`,
};
