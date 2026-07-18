import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Python: Handle File Downloads',
  description:
    'Handle file downloads in Playwright for Python with expect_download, save_as paths, content assertions, and CI-safe cleanup for real QA suites.',
  date: '2026-07-18',
  category: 'Tutorial',
  content: `
# Playwright Python: Handle File Downloads

Downloading a CSV, PDF, or ZIP from a UI looks trivial until CI cannot find the file, the browser deletes the temp blob, or two workers race on the same path. Playwright for Python gives you a first-class download event and a \`Download\` object. This tutorial shows how to wait for that event, persist the file, assert contents, and keep parallel jobs from stepping on each other.

For broader locator strategy that keeps the click that starts a download stable, see [Playwright best practices for locators](/blog/playwright-best-practices-locators-2026). If you are comparing Python Playwright with other JS runners for mixed stacks, the [JavaScript testing frameworks complete guide 2026](/blog/javascript-testing-frameworks-complete-guide-2026) is a useful map of ecosystem trade-offs.

## What Playwright considers a download

When the page navigates to a resource with a download disposition, or the browser starts a file download from a click or form submit, Playwright can surface a \`Download\` object. Your job in a test is usually:

1. Arm a waiter **before** the action that triggers the download.
2. Perform the click or submit.
3. Receive the \`Download\`, then call \`save_as\` (or read from the suggested path) to keep the bytes somewhere your assertions control.
4. Assert size, name, MIME hints, or file content.
5. Delete the artifact in teardown so disks do not fill in long CI runs.

If you click first and then start waiting, you race the event. Flakes follow.

## Core pattern: expect_download with a click

The stable pattern pairs a context manager with the user action:

\`\`\`python
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

def test_export_csv(tmp_path: Path) -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("https://example.com/reports")

        with page.expect_download() as download_info:
            page.get_by_role("button", name="Export CSV").click()

        download = download_info.value
        target = tmp_path / download.suggested_filename
        download.save_as(target)

        assert target.exists()
        assert target.stat().st_size > 0
        text = target.read_text(encoding="utf-8")
        assert "order_id" in text.splitlines()[0]
        browser.close()
\`\`\`

Key points:

- \`page.expect_download()\` must wrap the triggering action.
- \`download_info.value\` is the \`Download\` instance after the event fires.
- \`suggested_filename\` comes from the server / browser suggestion. Sanitize or override when you need deterministic paths.
- \`save_as(path)\` copies the download to a path you own. Prefer pytest's \`tmp_path\` (or a job-unique directory) over a fixed \`./downloads/report.csv\`.

## Async API variant

Teams on \`pytest-asyncio\` or async app servers often prefer the async Playwright API. The structure matches the sync version:

\`\`\`python
import pytest
from pathlib import Path
from playwright.async_api import async_playwright

@pytest.mark.asyncio
async def test_invoice_pdf(tmp_path: Path) -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("https://example.com/invoices/42")

        async with page.expect_download() as download_info:
            await page.get_by_role("link", name="Download PDF").click()

        download = await download_info.value
        target = tmp_path / "invoice-42.pdf"
        await download.save_as(target)

        assert target.suffix == ".pdf"
        assert target.stat().st_size > 1000
        await browser.close()
\`\`\`

Do not mix sync page methods with async expect contexts. Pick one API surface per test module.

## Download object fields you actually use

You do not need every property for day-one coverage. Focus on what assertions need.

| Member / method | Use in tests | Notes |
|-----------------|--------------|-------|
| \`suggested_filename\` | Build target path, assert extension | May be empty or generic depending on response headers |
| \`save_as(path)\` | Persist bytes for inspection | Creates parent dirs as needed in typical usage; pass a full path you control |
| \`path()\` | Access Playwright's temporary file | Temporary; prefer \`save_as\` for durable asserts |
| \`failure()\` | Detect failed downloads | Useful when the server returns an error body as a download |
| \`url\` | Sanity-check download URL | Helpful when the same button can hit staging vs CDN paths |
| \`cancel()\` | Abort oversized or unwanted downloads | Use when testing cancel UX or guarding CI disk |

Always consult the Playwright Python docs for the exact method signatures on your installed version before pinning unusual helpers in a shared fixture.

## Waiting strategies that reduce flakes

| Situation | Prefer | Avoid |
|-----------|--------|-------|
| Click causes one file | \`page.expect_download()\` around the click | Sleeping a fixed number of seconds |
| Download starts after a confirm dialog | Expect download around the **confirm** click, not the first open click | Arming the waiter too early on the wrong action |
| Navigation + download | Keep download expectation on the page/context that receives it | Assuming a new tab always appears |
| Auth-gated export | Ensure storage state / cookies are set before the click | Reusing a page mid-logout |
| Slow generation (report build) | Raise test timeout for that case; keep expect_download | Short global timeouts that kill the waiter |

Playwright's download waiter fails if the event never arrives. When debugging, trace whether the click hit the right control, whether the server returned \`Content-Disposition\`, and whether a client-side error toast appeared instead of a file.

## Pytest fixtures for download directories

Centralize paths so parallel workers never share a filename:

\`\`\`python
# conftest.py
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        yield browser
        browser.close()

@pytest.fixture
def page(browser):
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()
    yield page
    context.close()

@pytest.fixture
def download_dir(tmp_path: Path) -> Path:
    d = tmp_path / "dl"
    d.mkdir()
    return d
\`\`\`

Then in tests:

\`\`\`python
def test_zip_export(page, download_dir):
    page.goto("https://example.com/export")
    with page.expect_download() as info:
        page.locator("#export-zip").click()
    download = info.value
    target = download_dir / "export.zip"
    download.save_as(target)
    assert target.exists()
\`\`\`

Notes for CI:

- \`accept_downloads=True\` is the usual context setting when you want Playwright to handle downloads rather than block them. Confirm current defaults for your Playwright version if you rely on implicit behavior.
- \`tmp_path\` is unique per test in pytest, which is exactly what parallel \`pytest -n auto\` needs.
- Upload download artifacts on failure only (many CI systems support \`if: failure()\` style conditions) so successful runs stay light.

## Asserting file content without brittle binaries

Prefer structured checks over full binary equality.

**CSV / TSV:** read text, assert header columns, row count, and one known fixture id.

**JSON export:** \`json.loads\` and assert keys.

**PDF:** assert magic bytes (\`%PDF\`) and minimum size; use a PDF library only when you must assert a visible string.

**ZIP:** open with \`zipfile.ZipFile\` and assert member names.

\`\`\`python
import csv
import io
import zipfile
from pathlib import Path

def assert_csv_has_columns(path: Path, columns: list[str]) -> None:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        assert reader.fieldnames is not None
        for col in columns:
            assert col in reader.fieldnames

def assert_zip_contains(path: Path, member: str) -> None:
    with zipfile.ZipFile(path) as zf:
        assert member in zf.namelist()
\`\`\`

These helpers keep business assertions readable and avoid giant expected fixtures checked into git.

## Multiple downloads and chooser traps

Some UIs fire more than one download (export all formats) or open a file chooser for uploads on the same screen. Do not confuse \`expect_download\` with \`expect_file_chooser\`:

- **Download:** browser receives a file from the server (export).
- **File chooser:** browser asks the user to pick a local file (import).

If a single click produces multiple downloads, arm separate expectations in a documented order, or redesign the test to trigger one format at a time. Ambiguous multi-download flows are a product smell as much as a test problem.

## Headless CI checklist

1. Install browsers in the pipeline with the Playwright Python install flow documented for your version (\`playwright install\` with the browser set you need).
2. Run headed only when debugging locally; CI should stay headless unless you have a recorded reason.
3. Persist traces/videos on failure using Playwright's tracing APIs when download bugs are hard to reproduce.
4. Cap artifact retention: save the downloaded file next to the trace when the assertion fails, delete on pass.
5. Watch disk quotas on shared runners; large video + large ZIP exports add up.

Example CI fragment (GitHub Actions style keys are illustrative of common patterns; match your org's existing workflow):

\`\`\`yaml
- name: Install Python deps
  run: |
    pip install -r requirements.txt
    playwright install chromium
- name: Run download suite
  run: pytest tests/downloads -q --timeout=120
\`\`\`

If your project uses \`pytest-playwright\`, follow that plugin's fixture names instead of hand-rolling browser fixtures. Do not invent plugin option flags; copy them from the plugin docs you already pin in requirements.

## Failure catalog specific to downloads

**Timeout on expect_download.** The click did not start a download. Common causes: wrong locator, disabled button, client validation error, or the app opened a preview tab instead of downloading. Capture a screenshot before the click and after timeout.

**Empty file after save_as.** Server returned an error payload or the stream was cut. Log \`download.url\` and response status from server-side logs. Assert size greater than a realistic minimum.

**Filename differs in CI.** \`suggested_filename\` can depend on headers or locale. Prefer saving to a fixed name in the test when you only care about content.

**Works locally, fails in Linux CI.** Missing system deps for the browser build, or path length / permission issues on the runner user. Run \`playwright install-deps\` only as documented for your environment.

**Parallel tests overwrite files.** Fixed relative paths like \`downloads/out.csv\` without per-test isolation. Switch to \`tmp_path\` or include the test node id in the directory name.

## Security and data hygiene

Export tests often dump PII. Rules that keep you out of trouble:

- Use synthetic accounts and fixture data in shared environments.
- Scrub artifacts before uploading to public CI logs.
- Prefer asserting aggregates (row counts, headers) over printing full file contents in stdout.
- Rotate credentials used by download endpoints the same way you rotate other E2E secrets.

## Putting it together in a page object

Keep download mechanics out of raw tests when more than two specs need the same export:

\`\`\`python
class ReportsPage:
    def __init__(self, page):
        self.page = page

    def goto(self) -> None:
        self.page.goto("https://example.com/reports")

    def export_csv_to(self, target) -> None:
        with self.page.expect_download() as info:
            self.page.get_by_role("button", name="Export CSV").click()
        info.value.save_as(target)
\`\`\`

Tests then read:

\`\`\`python
def test_export_contains_status(page, download_dir):
    reports = ReportsPage(page)
    reports.goto()
    target = download_dir / "report.csv"
    reports.export_csv_to(target)
    assert_csv_has_columns(target, ["order_id", "status"])
\`\`\`

That split keeps locator churn in one class and content assertions in the test, which is what you want when AI coding agents refactor selectors.

## Frequently Asked Questions

### Why does expect_download timeout even though the file appears on my desktop when I click manually?

Manual clicks and automated clicks can hit different elements, or the app may branch on user-agent and serve an inline preview instead of a download. Confirm the locator with Playwright's codegen or inspector, verify the network response headers for the export request, and ensure the test's browser context allows downloads. Also check that the waiter wraps the exact action that triggers the network response, not an earlier navigation click.

### Should I assert on suggested_filename or only on file contents?

Assert the extension or a stable prefix when the product guarantees naming. Prefer content assertions for business correctness, because marketing or localization can change display names without breaking the export contract. When both matter, assert a regex-friendly pattern on the suggested name and a schema check on the body.

### How do I test a download that requires a long-running server-side job?

Separate "job kicked off" from "file ready" if the UI does. Wait for a completion toast or status row using Playwright's web-first assertions, then wrap the final download link click in \`expect_download\`. Raise the test timeout for that scenario only. Polling with fixed \`time.sleep\` calls is brittle; prefer condition-based waits already provided by Playwright locators and expect helpers.

### Can I read the file without save_as?

Playwright exposes a temporary path for the download in typical flows, but tests that only use the temp location become harder to debug when the process cleans up. Saving under \`tmp_path\` (or your CI artifact directory) makes failures inspectable. Use the temporary path only for quick existence checks, then \`save_as\` for anything you open with CSV/PDF/ZIP libraries.
`,
};
