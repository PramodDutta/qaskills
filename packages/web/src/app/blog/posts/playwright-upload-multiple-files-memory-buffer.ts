import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Upload Multiple In-Memory Files with Playwright',
  description:
    'Upload multiple in-memory files with Playwright using real FilePayload buffers, precise assertions, and no temporary fixtures left on disk in CI.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Upload Multiple In-Memory Files with Playwright

A CSV generated five milliseconds ago, a tiny PNG assembled from bytes, and a JSON manifest all need to enter the same multi-file input. Writing those payloads into a fixtures directory first adds cleanup, path handling, and shared-state risk that the upload test does not need. Playwright can assign all three directly from Node.js memory.

The important API is \`locator.setInputFiles()\`. It accepts either paths or file payload objects. Each in-memory payload contains a \`name\`, a \`mimeType\`, and a Node.js \`Buffer\`. Passing an array models a user choosing several files in one selection. The browser receives genuine \`File\` objects, so application code still observes names, media types, byte sizes, and contents through the normal File API.

This technique is especially useful when a test creates data dynamically: export validation, image metadata, per-test identifiers, malformed documents, and size boundaries. It also makes parallel execution safer because workers do not compete for a filename on a shared filesystem. For a wider look at inputs, chooser events, and drag-and-drop variants, see the [Playwright file upload testing guide](/blog/playwright-file-upload-testing-guide-2026).

## What Playwright builds from a FilePayload

An in-memory upload is not a mocked request. Playwright sets the selected files on the actual HTML input and emits the relevant DOM events. If the application later posts \`multipart/form-data\`, that request travels through the browser network stack just as it would for a disk-backed selection.

| FilePayload field | Browser-visible result | Testing consequence |
| --- | --- | --- |
| \`name\` | \`File.name\` and usually the multipart filename | Use realistic extensions and assert server-side filename handling |
| \`mimeType\` | \`File.type\` and normally the part content type | Exercise allowlists without relying on OS MIME detection |
| \`buffer\` | Exact file bytes and \`File.size\` | Generate boundaries, encodings, signatures, and corrupt content precisely |

The filename does not need to exist anywhere. There is no path lookup because \`buffer\` already holds the content. That distinction matters in containerized CI, where a repository-relative fixture may be absent, mounted differently, or copied with altered line endings.

MIME type is metadata, not proof of format. A payload named \`avatar.png\` with \`mimeType: 'image/png'\` can still contain invalid bytes. Good upload suites deliberately separate four questions: does the client accept the extension, does it inspect the media type, does the server inspect magic bytes, and does downstream processing safely reject a corrupt body?

## Selecting three generated files in one operation

Assume the page has \`<input type="file" name="evidence" multiple>\`, shows one row per chosen file, and sends them when the user presses Upload. The following Playwright Test example creates every byte inside the test process. The one-pixel PNG byte sequence is supplied as base64 only to keep the source readable.


\`\`\`ts
import { expect, test } from '@playwright/test';

test('uploads a report, image, and manifest from memory', async ({ page }) => {
  await page.goto('/claims/new');

  const runId = 'claim-4815';
  const csv = Buffer.from(
    ['claim_id,amount,currency', '4815,93.40,USD', '4816,21.00,EUR'].join('\n'),
    'utf8',
  );
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  const manifest = Buffer.from(
    JSON.stringify({ runId, files: ['claims.csv', 'pixel.png'] }),
    'utf8',
  );

  await page.getByLabel('Evidence files').setInputFiles([
    { name: 'claims.csv', mimeType: 'text/csv', buffer: csv },
    { name: 'pixel.png', mimeType: 'image/png', buffer: pixel },
    { name: 'manifest.json', mimeType: 'application/json', buffer: manifest },
  ]);

  const rows = page.getByTestId('selected-file');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('claims.csv');
  await expect(rows.nth(1)).toContainText('pixel.png');
  await expect(rows.nth(2)).toContainText('manifest.json');

  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.getByRole('status')).toHaveText('3 files uploaded');
});
\`\`\`

One call matters here. Repeatedly calling \`setInputFiles\` on a normal input replaces its current file list; it does not append. Provide the complete array when the UI represents a single multi-selection. If the product intentionally accumulates files across repeated picker interactions, test the application workflow through the file chooser and verify that its JavaScript merges selections.

The \`multiple\` attribute is also meaningful. Browsers do not treat a single-file input as a multi-file control. A test should not force an impossible user state and then declare the interface correct. Verify the element is designed for multiple files before passing an array.

## Asserting the FileList before any request leaves

Visible chips catch rendering errors, but they do not prove that the underlying input contains the expected bytes. A focused browser-side assertion can inspect the \`FileList\`. Return only serializable values from \`evaluate\`; Node \`Buffer\` objects cannot cross that boundary as-is.

\`\`\`ts
const input = page.getByLabel('Evidence files');

const selected = await input.evaluate(async (element: HTMLInputElement) => {
  const files = Array.from(element.files ?? []);
  return Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      text: file.type.startsWith('text/') ? await file.text() : null,
    })),
  );
});

expect(selected).toEqual([
  {
    name: 'claims.csv',
    type: 'text/csv',
    size: csv.byteLength,
    text: csv.toString('utf8'),
  },
  {
    name: 'pixel.png',
    type: 'image/png',
    size: pixel.byteLength,
    text: null,
  },
  {
    name: 'manifest.json',
    type: 'application/json',
    size: manifest.byteLength,
    text: null,
  },
]);
\`\`\`

That assertion exposes an easy mistake: the example reads text only when the type begins with \`text/\`, so JSON has \`text: null\`. If the content matters, select by name or include \`application/json\` in the readable set. Tests should make such decisions explicitly rather than infer behavior from file extensions.

Do not duplicate the browser's own File implementation in application tests. Constructing a \`DataTransfer\`, assigning files with page scripts, and manually dispatching \`change\` may be justified for custom drop zones, but it is needless machinery for a standard input. \`setInputFiles\` expresses the intent and lets Playwright manage protocol differences.

## Proving the multipart request contains every payload

UI assertions and HTTP assertions answer different questions. A chip may show the right name while the submission code omits a file or changes its order. The strongest integration test lets the real backend receive the request and verifies stored results. When that is too expensive, intercept the request and inspect enough evidence to prove the browser sent the expected form.

Playwright exposes \`request.postDataBuffer()\` on a captured request. Multipart bodies include generated boundaries, so comparing the entire body to a hand-built string is brittle. It is often better to assert the content type, recognizable filenames, and unique payload markers, while leaving exact multipart parsing to server-side tests.

\`\`\`ts
const uploadRequest = page.waitForRequest((request) => {
  return request.method() === 'POST' && request.url().endsWith('/api/evidence');
});

await page.getByRole('button', { name: 'Upload' }).click();

const request = await uploadRequest;
const contentType = request.headers()['content-type'];
const body = request.postDataBuffer();

expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
expect(body).not.toBeNull();

const multipart = body!.toString('latin1');
expect(multipart).toContain('filename="claims.csv"');
expect(multipart).toContain('filename="pixel.png"');
expect(multipart).toContain('filename="manifest.json"');
expect(multipart).toContain('4815,93.40,USD');
expect(multipart).toContain('claim-4815');
\`\`\`

Latin-1 is used only as a one-byte mapping for searching the captured byte stream. It does not reinterpret the uploaded PNG as meaningful text. Avoid logging the complete multipart body in CI because uploaded test data can contain secrets or large binary sections.

For high-value flows, add an assertion after the response: query a test API for the stored objects, check server-calculated hashes, or download the result and compare its bytes. A request capture proves what left the browser, not what survived validation, object storage, malware scanning, or asynchronous processing.

## Boundaries worth generating instead of storing

Memory payloads are most valuable when the case is parameterized. A few fixture files rarely cover exact byte thresholds or encoding combinations.

| Risk area | Payload to generate | Assertion that finds the defect |
| --- | --- | --- |
| Per-file limit | Buffers at limit minus one, limit, and limit plus one | Accepted files retain exact size; oversized file gets the documented message |
| Aggregate limit | Several individually valid buffers whose sum crosses the cap | Whole selection is rejected or excess items are identified consistently |
| Duplicate names | Two different buffers both named \`results.json\` | UI distinguishes them and server applies the documented collision policy |
| Empty file | \`Buffer.alloc(0)\` with a valid name and type | Zero-byte policy is enforced without a spinner hanging |
| Unicode filename | UTF-8 content named \`résumé-東京.pdf\` | Display, multipart encoding, persistence, and download preserve the name |
| Misleading type | HTML bytes labeled \`image/png\` | Server content inspection rejects the payload safely |

Avoid allocating enormous buffers merely to test a gigabyte limit in every pull request. That can destabilize workers and hide product failures behind runner memory pressure. Put a small boundary under normal CI, test validation logic below the browser layer, and reserve genuinely large uploads for a controlled performance or system suite.

You can generate deterministic pseudo-content without randomness. \`Buffer.alloc(size, 0x61)\` produces repeatable bytes and makes failures reproducible. When data must be unique, derive a short identifier from test metadata but keep the expected value available to the assertion.

## File chooser flows and hidden inputs

\`setInputFiles\` works on a locator for an input, including an input hidden behind a styled button. Prefer locating it through its accessible label when the markup connects the label correctly. If there is no stable input locator because a third-party widget creates it only after a click, use the file chooser event.

\`\`\`ts
const chooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: 'Add attachments' }).click();
const chooser = await chooserPromise;

expect(chooser.isMultiple()).toBe(true);
await chooser.setFiles([
  {
    name: 'console.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('render process exited with code 9', 'utf8'),
  },
  {
    name: 'environment.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ browser: 'chromium' }), 'utf8'),
  },
]);
\`\`\`

Start waiting before clicking. If the event fires before the listener exists, the test waits forever for a chooser that already appeared. Also distinguish a native chooser from a drop zone. A drop zone may have a hidden input underneath, but if the behavior under test includes drag-over state or drop-specific code, use Playwright's drag-and-drop data facilities rather than pretending input assignment validates that path.

Reusable payload factories fit well into fixtures when many tests share domain documents. Keep factories pure: return new buffers, accept the fields that make a scenario meaningful, and avoid a singleton array that a test can mutate. The [advanced Playwright fixtures guide](/blog/playwright-fixtures-advanced-guide) covers worker and test scope when these builders grow into authenticated upload contexts.

## Clearing and replacing an existing selection

Passing an empty array clears the input: \`await input.setInputFiles([])\`. That is useful for testing remove-all behavior, but remember that many applications implement removal in their own state rather than directly in the native input. Exercise the visible Remove control for the user journey, then inspect both the UI and \`FileList\`.

Replacement deserves a separate test when previews, validations, or upload queues are cached. Select files A and B, replace them with C, submit, and assert that neither A nor B appears in the request. Defects here often come from a component updating its labels while retaining an earlier FormData object.

The test should also define ordering expectations. The FileList preserves selection order, but a backend may reorder asynchronous uploads. If order is a product requirement, assert it at the appropriate boundary. If it is not, compare sets rather than introduce a fragile dependency on response timing.

## Diagnosing failures without writing the fixtures

Memory-only inputs can still be debuggable. On failure, log names, media types, sizes, and a cryptographic digest rather than dumping sensitive bytes. A SHA-256 hash lets a developer reproduce and compare the payload without expanding routine logs.

Trace Viewer captures the browser interaction and network metadata, although binary request bodies may not be pleasant to inspect. Attach a small generated payload to Playwright's test report only when policy permits. The rule should be explicit because a report is itself a persisted artifact, which would defeat a strict requirement that data never reach disk.

When a test passes locally and fails in CI, check memory constraints, server request limits, reverse proxy limits, and timeouts before blaming \`setInputFiles\`. The input assignment is synchronous from the application's perspective, while processing and uploading can be asynchronous. Wait for observable completion, not an arbitrary delay.

Finally, keep content assertions close to the layer that owns them. Playwright should prove selection, client validation, request composition, and user feedback. A lower-level API suite can exhaust parser and malware-scanner cases more cheaply. The in-memory technique removes fixture friction; it does not turn the browser suite into the best place for every file security test.

## Validate filename security without manufacturing paths

In-memory payloads make filename attacks easy to express, but browser behavior and server behavior must be separated. The \`name\` field represents the client-supplied filename. It is not a trustworthy destination path. Generate names containing repeated dots, leading dots, Windows separators, POSIX separators, reserved device-like words, right-to-left characters, and very long Unicode sequences according to the product's threat model.

Do not assert that every suspicious name is rejected. A safe service can accept a client name, replace it with an opaque storage key, and retain a sanitized display name. Test the published contract: the object must remain inside its assigned storage namespace, response headers must not become injectable, and later download must not reinterpret the display name as a path.

Browser APIs may normalize some impossible filename details. A real file chooser provides a base name, not an arbitrary local path visible to the website. Playwright's payload lets a test present unusual names, which is valuable at the trust boundary, but API-level tests should carry the exhaustive traversal matrix because they target the server more directly.

For duplicate names, compare bytes or server identifiers, not only labels. Two attachments called \`evidence.txt\` may both be legitimate. A UI that shows two identical chips could be correct while a backend that overwrites the first is not. Submit distinct marker content, fetch both resulting attachment records, and prove that each hash maps to one input.

## Keep generated documents deterministic and reviewable

Factories should expose domain intent. A helper named \`buildCsv({ rows, lineEnding, includeBom })\` communicates more than a generic random-byte generator. Reviewers can see why a scenario exists, and a failure can print the parameters without leaking the entire file.

If a parser defect requires a complex binary document, build the minimum valid structure with a maintained format library, or store one audited binary fixture if generation would obscure the scenario. "No disk fixtures" is a technique, not a rule that every PDF or office document must be hand-assembled from hex.

Use stable seeds for property-style payload generation and report the seed on failure. Random names and contents without replay metadata turn a rare upload failure into an investigation with no evidence. Deterministic generation is also important for screenshots and hashes, which otherwise change on every run.

Finally, release large buffers promptly by keeping them inside test scope. Node will garbage-collect them, but many parallel tests holding multi-megabyte arrays can exceed a CI container's memory limit. Size-sensitive suites should cap worker concurrency and record process memory separately from application upload latency.

## Frequently Asked Questions

### Can setInputFiles append one in-memory file at a time?

No. Each call sets the input's complete selection and normally replaces what was there. Pass all payloads in one array, or drive the product's own accumulation workflow if repeated selections are a requirement.

### Does the buffer need to match the declared MIME type?

Playwright does not validate that relationship for you. The mismatch is useful for negative testing, but production validation should inspect content rather than trust the supplied media type or filename.

### Can I mix filesystem paths and FilePayload objects in one call?

The clearest portable approach is to use one representation for a selection. If some source material lives on disk, read it into a buffer and provide its explicit name and MIME type alongside the generated payloads.

### How do I upload a zero-byte file?

Use \`Buffer.alloc(0)\` as the payload buffer. Assert both the product's stated zero-byte policy and that the interface exits its pending state.

### Will in-memory uploads keep data out of all filesystems?

They prevent your test from creating a fixture file. The browser, tracing, reporters, proxies, application server, or object store may still persist data, so configure those systems according to the sensitivity of the test payload.
`,
};
