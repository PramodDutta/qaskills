import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Python File Upload (set_input_files) Guide',
  description:
    'Upload files in Playwright Python with set_input_files. Handle multiple files, the FileChooser event, in-memory buffers, drag-and-drop, and validation.',
  date: '2026-06-04',
  category: 'Reference',
  content: `
# Playwright Python File Upload with set_input_files: Complete Guide

File upload is one of those features that looks trivial until you have to automate it. You cannot simply click the "Browse" button and have Playwright drive the operating system's native file picker -- that dialog is outside the browser and outside Playwright's reach. Instead, Playwright gives you a purpose-built API that sets the files directly on the underlying \`<input type="file">\` element, bypassing the OS dialog entirely. In Python that API is \`set_input_files\`, and once you understand it, uploading one file, ten files, or an in-memory buffer becomes a one-line operation.

But real applications make uploads harder than a single visible file input. Some hide the input and trigger uploads through a styled button that opens the picker via JavaScript. Some accept multiple files. Some are drag-and-drop zones with no obvious input at all. And sometimes you need to upload content that does not exist on disk -- a generated CSV, a fixture built in the test itself. Playwright handles every one of these cases, but each needs a slightly different technique: \`set_input_files\` for the common case, the \`FileChooser\` event for hidden inputs triggered by buttons, in-memory buffers for generated content, and \`DataTransfer\` simulation for true drag-and-drop zones.

This guide is a complete, runnable reference to file uploads in Playwright Python for 2026. You will learn the core \`set_input_files\` API, how to upload multiple files at once, how to handle the \`FileChooser\` event for button-triggered pickers, how to upload in-memory buffers without touching disk, how to clear a selection, how to drive drag-and-drop upload zones, and how to assert that the upload actually succeeded. Every example is Python you can paste into a pytest test.

---

## Key Takeaways

- **\`set_input_files\`** sets files directly on a file input, bypassing the OS file picker entirely.
- **Multiple files** upload by passing a list of paths to \`set_input_files\`, when the input has the \`multiple\` attribute.
- **The \`FileChooser\` event** handles uploads triggered by buttons that hide the underlying input.
- **In-memory buffers** let you upload generated content with no file on disk by passing a \`name\`, \`mime_type\`, and \`buffer\` dict.
- **Drag-and-drop zones** require simulating a \`DataTransfer\`, since they listen for drop events rather than an input change.

---

## The Core API: set_input_files

The fundamental method is \`locator.set_input_files(path)\`. You locate the \`<input type="file">\` element and hand it a path; Playwright sets the file on the input and fires the \`change\` event the page is listening for, exactly as if a user had picked the file in the OS dialog. Crucially, no native dialog ever opens, which is what makes this reliable in headless CI.

\`\`\`python
# test_upload.py
from playwright.sync_api import Page, expect


def test_single_file_upload(page: Page) -> None:
    page.goto("https://example.com/upload")

    # Locate the file input and set a file on it -- no OS dialog opens.
    page.get_by_label("Upload your resume").set_input_files("fixtures/resume.pdf")

    page.get_by_role("button", name="Submit").click()
    expect(page.get_by_text("resume.pdf uploaded")).to_be_visible()
\`\`\`

You can locate the input however you like -- by label, by test id, or by CSS. The most robust is usually by its associated label or a test id, since file inputs are often visually hidden behind a styled button:

\`\`\`python
# Different ways to target the file input
page.get_by_label("Profile photo").set_input_files("fixtures/avatar.png")
page.get_by_test_id("file-input").set_input_files("fixtures/avatar.png")
page.locator("input[type='file']").set_input_files("fixtures/avatar.png")
\`\`\`

Use a path relative to where pytest runs, or an absolute path built from \`Path(__file__)\` for portability across machines:

\`\`\`python
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures"
page.get_by_label("Upload").set_input_files(str(FIXTURES / "report.csv"))
\`\`\`

---

## Uploading Multiple Files

When the input carries the \`multiple\` attribute, pass a list of paths and Playwright selects them all in one call. This mirrors a user shift-clicking several files in the picker. Passing multiple paths to a single-file input is an error, so confirm the input accepts multiple first.

\`\`\`python
def test_multiple_file_upload(page: Page) -> None:
    page.goto("https://example.com/gallery/upload")

    # Pass a list to upload several files at once.
    page.get_by_label("Add photos").set_input_files([
        "fixtures/photo1.jpg",
        "fixtures/photo2.jpg",
        "fixtures/photo3.jpg",
    ])

    expect(page.get_by_test_id("upload-count")).to_have_text("3 files selected")
\`\`\`

You can build the list programmatically -- for example, uploading every file in a fixtures directory:

\`\`\`python
from pathlib import Path

def test_upload_all_fixtures(page: Page) -> None:
    page.goto("https://example.com/gallery/upload")
    images = [str(p) for p in (Path(__file__).parent / "images").glob("*.png")]
    page.get_by_label("Add photos").set_input_files(images)
    expect(page.get_by_test_id("upload-count")).to_have_text(f"{len(images)} files selected")
\`\`\`

| Scenario | Argument to set_input_files | Requires |
|---|---|---|
| Single file | \`"path/file.pdf"\` | Any file input |
| Multiple files | \`["a.jpg", "b.jpg"]\` | Input with \`multiple\` |
| Clear selection | \`[]\` | Any file input |
| In-memory content | \`{"name", "mimeType", "buffer"}\` | Any file input |

---

## Handling the FileChooser Event

Many modern UIs hide the real \`<input type="file">\` and present a styled button. Clicking that button calls \`input.click()\` in JavaScript, which would normally open the OS picker. Playwright intercepts this with the \`file_chooser\` event: you arrange to catch the event, click the button that triggers it, and then set files on the chooser. This is the right approach whenever you cannot directly locate the input, or clicking the visible control is what actually triggers the upload.

\`\`\`python
def test_upload_via_button(page: Page) -> None:
    page.goto("https://example.com/upload")

    # Catch the file chooser that the button click will open.
    with page.expect_file_chooser() as fc_info:
        page.get_by_role("button", name="Choose file").click()
    file_chooser = fc_info.value

    # Set the file on the chooser instead of on a located input.
    file_chooser.set_files("fixtures/document.pdf")

    expect(page.get_by_text("document.pdf")).to_be_visible()
\`\`\`

The \`FileChooser\` object also tells you whether the control accepts multiple files via \`file_chooser.is_multiple()\`, and it exposes the originating element through \`file_chooser.element\`. For a multi-file button, set a list exactly as with \`set_input_files\`:

\`\`\`python
def test_upload_multiple_via_chooser(page: Page) -> None:
    page.goto("https://example.com/upload")
    with page.expect_file_chooser() as fc_info:
        page.get_by_role("button", name="Add attachments").click()
    chooser = fc_info.value
    assert chooser.is_multiple()  # confirm the control accepts many files
    chooser.set_files(["fixtures/a.pdf", "fixtures/b.pdf"])
\`\`\`

The \`expect_file_chooser\` context manager is the key: it starts listening *before* the click so the event is not missed. Setting up the listener after the click would race and usually fail.

---

## Uploading In-Memory Buffers

Sometimes the content you want to upload does not exist as a file -- it is generated in the test, like a CSV built from test data or a synthetic image. Rather than writing a temp file, pass a dict with \`name\`, \`mime_type\`, and \`buffer\` (the raw bytes) to \`set_input_files\`. Playwright presents it to the page exactly as if it were a real file, with the name and MIME type you specify.

\`\`\`python
def test_upload_generated_csv(page: Page) -> None:
    page.goto("https://example.com/import")

    # Build content in memory; no file ever touches disk.
    csv_content = "name,email\\nAda Lovelace,ada@example.com\\nAlan Turing,alan@example.com\\n"

    page.get_by_label("Import contacts").set_input_files({
        "name": "contacts.csv",
        "mimeType": "text/csv",
        "buffer": csv_content.encode("utf-8"),
    })

    page.get_by_role("button", name="Import").click()
    expect(page.get_by_text("2 contacts imported")).to_be_visible()
\`\`\`

This is ideal for data-driven tests where each case needs a different file. You generate the bytes per case and upload them without managing temp files or cleanup. The \`buffer\` must be \`bytes\`, so encode strings and read binary fixtures with \`Path.read_bytes()\` when you want to upload existing binary content in memory.

\`\`\`python
from pathlib import Path

# Upload an existing binary file as an in-memory buffer with a custom name
data = Path("fixtures/original.png").read_bytes()
page.get_by_label("Avatar").set_input_files({
    "name": "renamed-avatar.png",
    "mimeType": "image/png",
    "buffer": data,
})
\`\`\`

---

## Clearing a File Selection

To deselect files -- for example, to test that the form rejects an empty submission, or to reset between actions -- pass an empty list to \`set_input_files\`. This clears the input and fires the \`change\` event with no files, which is exactly what a user clearing the field would produce.

\`\`\`python
def test_clearing_selection(page: Page) -> None:
    page.goto("https://example.com/upload")
    input_loc = page.get_by_label("Attachment")

    input_loc.set_input_files("fixtures/doc.pdf")
    expect(page.get_by_text("doc.pdf")).to_be_visible()

    # Clear the selection by passing an empty list.
    input_loc.set_input_files([])
    expect(page.get_by_text("No file chosen")).to_be_visible()
\`\`\`

---

## Driving Drag-and-Drop Upload Zones

Drag-and-drop dropzones are the trickiest case because they do not listen for a file input's \`change\` event -- they listen for native \`dragenter\`, \`dragover\`, and \`drop\` events carrying a \`DataTransfer\` object with the file. If the dropzone *also* contains a hidden file input (many libraries provide one as a fallback), prefer \`set_input_files\` on that hidden input -- it is far simpler and more reliable.

\`\`\`python
def test_dropzone_with_hidden_input(page: Page) -> None:
    page.goto("https://example.com/dropzone")
    # Many dropzones include a hidden <input type=file>; target it directly.
    page.locator(".dropzone input[type='file']").set_input_files("fixtures/data.zip")
    expect(page.get_by_text("data.zip ready to upload")).to_be_visible()
\`\`\`

When there is genuinely no input and the dropzone only handles drop events, simulate a \`DataTransfer\` and dispatch a drop. You create a \`DataTransfer\` via \`page.evaluate_handle\`, attach a file to it, and dispatch a \`drop\` event carrying it on the dropzone element.

\`\`\`python
def test_true_drag_and_drop(page: Page) -> None:
    page.goto("https://example.com/dropzone")

    # Create a DataTransfer object in the page context.
    data_transfer = page.evaluate_handle(
        """async () => {
            const dt = new DataTransfer();
            const res = await fetch('https://example.com/sample.txt');
            const blob = await res.blob();
            const file = new File([blob], 'sample.txt', { type: 'text/plain' });
            dt.items.add(file);
            return dt;
        }"""
    )

    # Dispatch the drop event with the DataTransfer onto the dropzone.
    page.locator(".dropzone").dispatch_event("drop", {"dataTransfer": data_transfer})
    expect(page.get_by_text("sample.txt")).to_be_visible()
\`\`\`

For content generated in the test rather than fetched, build the \`File\` from a base64 string inside the evaluate. The \`set_input_files\`-on-hidden-input route is almost always preferable, so reach for the \`DataTransfer\` simulation only when no input exists.

| Dropzone type | Recommended technique |
|---|---|
| Has hidden file input | \`set_input_files\` on the hidden input |
| Drop-only, no input | Simulate \`DataTransfer\` + dispatch \`drop\` |
| Button opens picker | \`expect_file_chooser\` + \`set_files\` |

---

## Asserting the Upload Succeeded

Setting files is only half the test -- you must verify the application accepted them. The most reliable assertions check the application's own feedback: a filename appearing in the UI, an upload count, a success toast, or a thumbnail. Where the app exposes it, you can also assert the number of files on the input itself via JavaScript.

\`\`\`python
def test_upload_assertions(page: Page) -> None:
    page.goto("https://example.com/upload")
    page.get_by_label("Files").set_input_files(["fixtures/a.pdf", "fixtures/b.pdf"])

    # 1) Assert the app's visible feedback.
    expect(page.get_by_test_id("file-list")).to_contain_text("a.pdf")
    expect(page.get_by_test_id("file-list")).to_contain_text("b.pdf")

    # 2) Assert the input actually holds two files.
    count = page.locator("input[type='file']").evaluate("el => el.files.length")
    assert count == 2
\`\`\`

For uploads that POST to a backend, combine the UI assertion with a check on the network response or a follow-up API call to confirm the server stored the file -- the same pattern you would use for any form submission.

---

## Uploading in the Async API

Everything above uses the synchronous API, which most pytest suites prefer. If your application is built on asyncio, the same methods exist on the async API -- you simply \`await\` them. \`set_input_files\` becomes \`await locator.set_input_files(...)\`, and the file chooser is caught with \`async with page.expect_file_chooser()\`. The arguments are identical; only the call style changes.

\`\`\`python
# test_upload_async.py -- the async equivalent of the core patterns
import pytest
from playwright.async_api import Page, expect


@pytest.mark.asyncio
async def test_single_upload_async(page: Page) -> None:
    await page.goto("https://example.com/upload")
    await page.get_by_label("Upload").set_input_files("fixtures/resume.pdf")
    await expect(page.get_by_text("resume.pdf uploaded")).to_be_visible()


@pytest.mark.asyncio
async def test_chooser_async(page: Page) -> None:
    await page.goto("https://example.com/upload")
    async with page.expect_file_chooser() as fc_info:
        await page.get_by_role("button", name="Choose file").click()
    chooser = await fc_info.value
    await chooser.set_files("fixtures/document.pdf")
\`\`\`

Use \`pytest-asyncio\` for async tests, and remember that the \`page\` fixture from \`pytest-playwright\` returns an async \`Page\` when you import from \`playwright.async_api\`. Mixing sync and async APIs in one test is not supported, so pick one per file.

## Reusable Upload Fixtures and Test Data

For suites with many upload tests, factor the repeated mechanics into fixtures. A common pattern is a fixture that yields a path to a freshly generated fixture file, and another that returns a helper for uploading by label. This keeps individual tests focused on intent rather than plumbing, and centralizes how test files are created and cleaned up.

\`\`\`python
# conftest.py -- reusable upload helpers
import pytest
from pathlib import Path


@pytest.fixture
def csv_file(tmp_path: Path) -> Path:
    # pytest's tmp_path gives a unique temp dir per test, auto-cleaned.
    f = tmp_path / "contacts.csv"
    f.write_text("name,email\nAda,ada@example.com\n")
    return f


@pytest.fixture
def upload(page):
    def _upload(label: str, path) -> None:
        page.get_by_label(label).set_input_files(str(path))
    return _upload
\`\`\`

Tests then become a single readable line, and \`tmp_path\` handles cleanup automatically so no stray files accumulate:

\`\`\`python
def test_import_contacts(page, csv_file, upload):
    page.goto("https://example.com/import")
    upload("Import contacts", csv_file)
    page.get_by_role("button", name="Import").click()
    expect(page.get_by_text("1 contact imported")).to_be_visible()
\`\`\`

Using \`tmp_path\` rather than a checked-in fixtures directory is the cleaner choice when content is generated per test, because it sidesteps cross-test contamination and never pollutes your repository with throwaway files.

## Common Pitfalls and How to Avoid Them

A handful of mistakes account for most failing upload tests. The first is trying to click the visible "Browse" control and expecting Playwright to drive the OS dialog -- it cannot, so always use \`set_input_files\` or the \`file_chooser\` event instead. The second is locating a hidden input that has \`display: none\` and assuming \`set_input_files\` will fail because the element is not visible -- it will not fail, because \`set_input_files\` does not require the input to be visible, unlike a click. That is precisely why it works on hidden inputs that styled buttons sit on top of.

The third pitfall is registering the \`expect_file_chooser\` listener *after* the click, which races and intermittently misses the event. Always open the \`with\` block first, then click inside it. The fourth is passing a list to a single-file input or a single path to an input that needs the \`multiple\` attribute; check the input's attributes when in doubt. Finally, relative paths break when pytest is invoked from a different directory than you expect -- build absolute paths from \`Path(__file__).parent\` for portability across machines and CI.

| Pitfall | Symptom | Fix |
|---|---|---|
| Clicking Browse to open OS dialog | Test hangs forever | Use \`set_input_files\` / file chooser |
| Listener after the click | Flaky "no file chooser" | Open \`with\` block before clicking |
| List into single-file input | Error on \`set_input_files\` | Confirm \`multiple\` attribute |
| Relative fixture path | "ENOENT" in CI only | Build path from \`Path(__file__)\` |

## Generating File Upload Skills with AI Agents

File upload spans four distinct techniques -- direct input, file chooser, in-memory buffer, and drag-and-drop -- and AI coding agents routinely pick the wrong one, most often trying to click the visible button and drive a native dialog that Playwright cannot reach. A QA skill encodes the decision tree (use \`set_input_files\` first, \`expect_file_chooser\` for hidden inputs, buffers for generated content, \`DataTransfer\` only as a last resort) so your agent writes correct upload tests every time.

Browse the [Playwright Python skills at qaskills.sh/skills](/skills) and install one:

\`\`\`bash
# Install a Playwright Python file-upload skill
npx @qaskills/cli add playwright-python-file-upload
\`\`\`

For the surrounding Python testing workflow, see our [pytest complete guide](/blog/pytest-testing-complete-guide), and for recording these flows quickly, our [Playwright Python codegen guide](/blog/playwright-python-codegen-guide).

---

## Frequently Asked Questions

### How do I upload a file in Playwright Python?

Locate the \`<input type="file">\` element and call \`set_input_files\` with the path: \`page.get_by_label("Upload").set_input_files("fixtures/file.pdf")\`. Playwright sets the file directly on the input and fires the \`change\` event, bypassing the OS file picker entirely, which is what makes it reliable in headless CI. Target the input by label or test id, since file inputs are often hidden behind styled buttons.

### How do I upload multiple files at once?

Pass a list of paths to \`set_input_files\`: \`set_input_files(["a.jpg", "b.jpg", "c.jpg"])\`. The input must carry the \`multiple\` attribute, or the call errors. You can build the list programmatically -- for example with \`Path(...).glob("*.png")\` -- to upload every file in a directory. For button-triggered multi-file uploads, use the file chooser and confirm \`chooser.is_multiple()\` first.

### How do I handle a file upload button that opens a dialog?

Use the \`file_chooser\` event. Wrap the button click in \`with page.expect_file_chooser() as fc_info:\`, click the button inside the block, then call \`fc_info.value.set_files("path")\`. The context manager starts listening before the click so the event is not missed. This is the correct approach when the real input is hidden and a styled button triggers the picker via JavaScript.

### Can I upload a file that does not exist on disk?

Yes. Pass a dict with \`name\`, \`mimeType\`, and \`buffer\` (the raw bytes) to \`set_input_files\`. For example, build a CSV string, encode it with \`.encode("utf-8")\`, and pass it as the buffer. Playwright presents it to the page as a real file with your chosen name and MIME type. This is ideal for data-driven tests that generate a different file per case without managing temp files.

### How do I clear a selected file in Playwright?

Call \`set_input_files([])\` with an empty list. This clears the input and fires the \`change\` event with no files, exactly as a user clearing the field would. It is useful for testing empty-submission validation or resetting the field between actions within a single test.

### How do I automate a drag-and-drop upload zone?

First check whether the dropzone includes a hidden \`<input type="file">\` -- most libraries provide one, and you should \`set_input_files\` on it directly because that is far simpler. If the zone only handles drop events, create a \`DataTransfer\` via \`page.evaluate_handle\`, attach a \`File\` to it, and dispatch a \`drop\` event carrying it onto the dropzone with \`dispatch_event("drop", {"dataTransfer": dt})\`.

### How do I verify a file upload succeeded?

Assert on the application's own feedback -- a filename in the UI, an upload count, a success message, or a thumbnail -- using \`expect(locator).to_contain_text(...)\` or \`to_be_visible()\`. You can also assert the input holds the expected number of files via \`locator.evaluate("el => el.files.length")\`. For uploads that POST to a server, additionally check the network response or a follow-up API call to confirm the file was stored.

---

## Conclusion

Playwright Python makes file upload reliable by sidestepping the OS dialog entirely. For the common case, \`set_input_files\` sets a path (or a list of paths) directly on the input and fires the change event. When the input is hidden behind a button, catch the \`file_chooser\` event with \`expect_file_chooser\` and call \`set_files\`. When the content is generated in the test, pass an in-memory buffer dict with a name, MIME type, and bytes. And for true drop-only zones, prefer a hidden input if one exists, falling back to a simulated \`DataTransfer\` only when necessary.

Pick the right technique for the UI, and always assert the application accepted the upload -- a filename, count, or success message, plus a backend check where relevant. To have your AI coding agent choose the correct upload approach every time, install a Playwright Python skill from [qaskills.sh/skills](/skills) and read our [Playwright Python codegen guide](/blog/playwright-python-codegen-guide) for recording these flows fast.
`,
};
