import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Python: Upload Files (Local Paths and Buffers)',
  description: 'Master Playwright Python upload files with local paths, in-memory buffers, file choosers, validation checks, fixtures, and reliable CI-safe tests.',
  date: '2026-07-18',
  category: 'Tutorial',
  content: `
# Playwright Python: Upload Files (Local Paths and Buffers)

File upload tests fail for reasons that ordinary form tests never encounter: the fixture path changes in CI, the page creates its input only after a click, the server rejects the MIME type, or the test proves a filename appeared without proving the bytes arrived intact. Playwright's Python API handles the browser side cleanly once the test identifies the real upload mechanism.

This tutorial covers local files, multiple selection, in-memory payloads, file chooser events, validation, and test design. For runner context across the ecosystem, see the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). Although its examples use JavaScript ecosystems broadly, the locator principles in the [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) apply directly to Python upload controls.

## Model the upload as three separate contracts

An end-to-end upload includes browser selection, application transport, and server processing. If a test compresses all three into “the filename is visible,” it cannot tell whether bytes were transmitted or merely previewed in the DOM.

| Layer | Observable behavior | Useful oracle |
|---|---|---|
| Browser selection | Input owns the chosen file metadata | Selected filename or input file count |
| Request and storage | Backend receives the expected bytes and metadata | Success response plus retrieval, checksum, or API record |
| Application processing | Virus scan, parsing, thumbnailing, or validation completes | Stable status and a user-visible result |

Choose the layer each test owns. A fast UI validation test can stop before transport. A critical document workflow should upload, wait for processing, and retrieve or inspect the resulting record. Keeping the contracts explicit prevents a flaky ten-second end-to-end scenario from replacing all focused coverage.

## Upload one file from a repository-stable path

Use \`Locator.set_input_files()\` on an \`<input type="file">\`. Playwright sets the files directly, so the input does not need to be visually clickable. Resolve fixtures relative to the test module with \`pathlib.Path\`, not the shell's current directory.

\`\`\`python
from pathlib import Path

from playwright.sync_api import Page, expect

FIXTURES = Path(__file__).parent / "fixtures"


def test_uploads_identity_document(page: Page) -> None:
    page.goto("https://app.example.test/profile/documents")

    file_input = page.get_by_label("Identity document")
    file_input.set_input_files(FIXTURES / "identity-sample.pdf")

    expect(page.get_by_text("identity-sample.pdf", exact=True)).to_be_visible()
    page.get_by_role("button", name="Upload document").click()
    expect(page.get_by_role("status")).to_have_text("Upload complete")
\`\`\`

The accessible label locator survives wrapper markup better than a CSS path such as \`div:nth-child(3) input\`. If the page has no label, use a stable test ID or improve the application accessibility. Do not force-click a hidden input simply to open the operating system dialog. Direct file assignment is deterministic and avoids automating native UI.

Keep the fixture small and non-sensitive. A committed sample should contain synthetic data, a clear purpose, and enough structure for the server parser. Never commit a real passport, medical attachment, private key, or production export to make the test realistic.

## Select multiple files and verify the collection semantics

Pass a list of paths when the input supports multiple selection. Verify both membership and ordering only if the product contract specifies order. Browsers expose a selected file list, but applications may reorder after upload by filename or completion time.

\`\`\`python
from pathlib import Path

from playwright.sync_api import Page, expect


def test_attaches_two_evidence_files(page: Page) -> None:
    fixture_dir = Path(__file__).parent / "fixtures"
    page.goto("https://app.example.test/incidents/new")

    page.get_by_label("Evidence files").set_input_files([
        fixture_dir / "console-output.txt",
        fixture_dir / "failure-screen.png",
    ])

    selected = page.get_by_test_id("selected-file")
    expect(selected).to_have_count(2)
    expect(page.get_by_text("console-output.txt", exact=True)).to_be_visible()
    expect(page.get_by_text("failure-screen.png", exact=True)).to_be_visible()
\`\`\`

Passing more than one file to an input that lacks the \`multiple\` attribute does not represent a valid user action. Assert the page's capability before treating it as a multi-file test. If product requirements limit the count, add cases at the boundary and just over it, then check that rejected files are not sent.

| Scenario | Input | Expected result |
|---|---|---|
| Minimum accepted | One allowed file | File appears and upload can proceed |
| Maximum accepted | Exact configured count | All selected files are represented once |
| Over limit | One more than maximum | Clear error and no partial surprise upload |
| Mixed types | Allowed plus forbidden type | Behavior matches documented all-or-partial policy |

## Generate files in memory when the bytes are the test

Playwright accepts file payload dictionaries containing \`name\`, \`mimeType\`, and \`buffer\`. In-memory data avoids creating temporary files and makes boundary content visible beside the assertion. It is ideal for parser cases, Unicode filenames, exact byte limits, and deliberately malformed payloads.

\`\`\`python
import json

from playwright.sync_api import Page, expect


def test_imports_customer_json_from_memory(page: Page) -> None:
    payload = {
        "customers": [
            {"externalId": "C-101", "name": "Asha Rao"},
            {"externalId": "C-102", "name": "Luis Díaz"},
        ]
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    page.goto("https://app.example.test/admin/import")
    page.get_by_label("Customer data file").set_input_files(
        {
            "name": "customers-unicode.json",
            "mimeType": "application/json",
            "buffer": body,
        }
    )

    page.get_by_role("button", name="Start import").click()
    expect(page.get_by_role("status")).to_have_text("Imported 2 customers")
\`\`\`

The MIME type is metadata, not proof that content is valid. A serious test matrix changes name, declared MIME type, and bytes independently. This catches servers that trust extensions, clients that reject a valid file based only on naming, and parsers that return a generic 500 for malformed content.

| Test dimension | Representative values | Risk exposed |
|---|---|---|
| Filename | normal, Unicode, spaces, very long | Encoding and display defects |
| Declared MIME | correct, missing-like generic type, misleading type | Metadata trust assumptions |
| Content | valid, empty, truncated, wrong format | Parser and validation behavior |
| Size | just below, exactly at, just above limit | Off-by-one and buffering defects |

Avoid allocating a massive buffer just to test a UI size limit if the application validates metadata or a lower integration layer can exercise streaming more safely. Large in-memory payloads increase worker memory and can destabilize parallel CI. Use the smallest value that crosses the documented boundary.

## Capture a file chooser created by a user action

Some applications create the file input dynamically or route selection through a toolbar button. In that case, start waiting for the file chooser before clicking. The \`expect_file_chooser()\` context manager prevents the event race, then the returned chooser receives paths or payloads through \`set_files()\`.

\`\`\`python
from pathlib import Path

from playwright.sync_api import Page, expect


def test_uploads_from_editor_toolbar(page: Page) -> None:
    image = Path(__file__).parent / "fixtures" / "diagram.png"
    page.goto("https://app.example.test/knowledge/new")

    with page.expect_file_chooser() as chooser_info:
        page.get_by_role("button", name="Insert image").click()

    chooser_info.value.set_files(image)
    expect(page.get_by_role("img", name="diagram.png")).to_be_visible()
\`\`\`

The ordering is essential. Clicking first and then waiting can miss a chooser event that already fired. Use this flow only when the product action truly owns the chooser. If a stable file input already exists, locator-based assignment is simpler and provides a more direct failure location.

## Clear a selection and cover replacement behavior

Passing an empty list clears selected files. This matters for forms that allow users to reconsider a document before submission. Test both the browser state represented by the application and any preview cleanup.

\`\`\`python
def test_can_remove_a_selected_attachment(page: Page) -> None:
    input_control = page.get_by_label("Release notes attachment")
    input_control.set_input_files(
        {
            "name": "notes.txt",
            "mimeType": "text/plain",
            "buffer": b"candidate release notes",
        }
    )
    expect(page.get_by_text("notes.txt", exact=True)).to_be_visible()

    input_control.set_input_files([])

    expect(page.get_by_text("notes.txt", exact=True)).not_to_be_visible()
    expect(page.get_by_role("button", name="Publish")).to_be_disabled()
\`\`\`

Replacement deserves a separate case when the product performs a preview, checksum, or validation asynchronously. Select file A, wait for its preview, select file B, and assert that stale metadata from A disappears. This catches race conditions where the slower validation response wins after the user has already changed the file.

## Prove what the server received

A green toast proves only what the UI claims. For a critical upload, add an oracle beyond the selection preview. The strongest option is often a supported API or application screen that retrieves the stored record. Compare stable properties: original filename, size, processing status, parsed row count, or a checksum calculated by the test.

Network observation can verify request timing or status, but multipart bodies are an awkward primary assertion and tie tests to transport details. Prefer the application's durable output. If the feature creates an attachment record, navigate to it and download through the product's supported path, then compare bytes or a digest in a controlled test environment.

\`\`\`python
import hashlib

from playwright.sync_api import Page, expect


def test_preserves_uploaded_text(page: Page) -> None:
    original = b"alpha,bravo\\n1,2\\n"
    expected_digest = hashlib.sha256(original).hexdigest()

    page.goto("https://app.example.test/datasets")
    page.get_by_label("Dataset file").set_input_files({
        "name": "rows.csv",
        "mimeType": "text/csv",
        "buffer": original,
    })
    page.get_by_role("button", name="Upload").click()

    expect(page.get_by_test_id("sha256")).to_have_text(expected_digest)
\`\`\`

This example assumes the product deliberately displays a digest. If it does not, use a documented test API or validate the parsed outcome. Do not add production-only debugging fields just to satisfy an end-to-end test unless the field has operational value and passes security review.

## Make fixtures portable across laptops and CI workers

The current working directory may be the repository root locally and a package subdirectory in CI. \`Path(__file__).parent\` anchors fixtures to the test file. Before browser interaction, optionally assert that the fixture exists and report its resolved path, so a missing checkout fails as setup rather than as an opaque browser error.

Use unique server-side names when parallel tests could collide, but keep local fixture names deterministic. Clean up uploaded records through a fixture or supported API after the test. A worker-scoped shared account plus a single filename is a classic source of retries and cross-test deletion.

Never make a test depend on a file from a developer's Downloads folder. Avoid generated timestamps in committed expected data. For temporary disk files that must exercise streaming behavior, use pytest's temporary directory support and write only the bytes needed for that case.

## Diagnose upload failures from the outside inward

When a test fails, locate the broken layer before increasing timeouts.

1. Confirm the locator resolves the intended file input or the chooser event actually fires.
2. Confirm the fixture exists, is readable, and contains the expected bytes.
3. Assert the application shows the selected name or preview.
4. Observe the upload response and visible validation result.
5. Query or navigate to the durable record and inspect processing state.

Trace and screenshot evidence can show whether a button was disabled, an error banner appeared, or a preview never completed. Do not attach confidential upload bodies to public CI artifacts. Playwright traces may retain DOM, network, and screenshot information, so apply the same artifact retention and access rules used for other sensitive test evidence.

## Frequently Asked Questions

### Can Playwright automate the operating system file dialog?

You normally do not need to automate native dialog controls. Assign files directly with \`locator.set_input_files()\`, or capture the browser file chooser event and call \`set_files()\`. These methods are deterministic and work within Playwright's browser model. Trying to drive Finder, Explorer, or a Linux desktop dialog introduces platform-specific selectors, focus races, and CI display requirements without improving coverage of the web application's behavior.

### When should I use a buffer instead of a local fixture?

Use a buffer when exact generated bytes are central to the case: malformed JSON, Unicode content, CSV boundaries, or a precise size. Use a local fixture when the file format is complex, reviewers benefit from inspecting it, or the real parser needs a valid binary document or image. Buffers reduce filesystem setup, while fixtures improve reuse. In both cases, keep data synthetic and small enough for parallel CI.

### Why does the upload pass locally but fail in CI?

First check path resolution and filename case, since CI often runs from a different directory on a case-sensitive filesystem. Then check whether the fixture was committed, the worker can read it, and parallel tests reuse the same server record. If selection succeeds but processing fails, inspect the application response and job state. Raising the timeout only helps when the operation is legitimately slower, not when the wrong file path or shared data is involved.

### How do I test a hidden file input?

Locate the actual \`input[type=file]\` through an accessible label, test ID, or focused CSS selector, then call \`set_input_files()\` directly. Visibility is not required for this assignment. If the input does not exist until a button is clicked, use \`expect_file_chooser()\` around that click. Avoid forcing UI actions on a hidden control, because that tests CSS mechanics rather than the user's supported upload flow.
`,
};
