import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'python -m playwright install: Fix Browser Install Errors',
  description: 'Fix Python Playwright install browser errors by aligning environments, caches, dependencies, and CI setup so tests launch Chromium, Firefox, or WebKit.',
  date: '2026-07-18',
  category: 'Guide',
  content: `
# python -m playwright install: Fix Browser Install Errors

Installing the Python package and installing Playwright's browser binaries are separate operations. That distinction explains the most common launch failure: \`pip install playwright\` succeeds, test discovery works, and the first browser launch says the executable does not exist. The package provides the Python API and driver integration. The install command downloads the browser builds Playwright expects.

This guide diagnoses Python Playwright install browser errors from the outside in: interpreter, package, browser cache, operating-system libraries, network, then CI persistence. The examples are designed for test engineers who need a repeatable repair, not a one-off local workaround. For framework context, see the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). After the browser launches, use the [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) to keep UI checks resilient.

## Understand the two-part installation

A clean setup installs the Python dependency inside the intended environment and then invokes Playwright through that same Python interpreter.

\`\`\`bash
python -m venv .venv
source .venv/bin/activate
python -m pip install playwright pytest-playwright
python -m playwright install chromium
\`\`\`

On Windows PowerShell, activation syntax differs, but the invariant stays the same: \`python -m pip\` and \`python -m playwright\` must resolve to the interpreter that runs the tests. Installing only Chromium is useful when the project tests only Chromium. Omit the browser name when the suite genuinely requires Playwright's default supported browser set.

| Layer | What it supplies | Typical failure signal | Corrective action |
|---|---|---|---|
| Python environment | Interpreter and installed packages | \`No module named playwright\` | Install with that interpreter's \`-m pip\` |
| Playwright package | API and command module | CLI module cannot start | Fix the active virtual environment |
| Browser download | Compatible browser executable | Launch reports a missing executable | Run \`python -m playwright install\` |
| System libraries | Native dependencies used by browsers | Browser exits immediately with a library error | Install documented OS dependencies |
| Test configuration | Browser choice and launch options | One project fails while another starts | Align installed browsers with configured projects |

Do not treat a system Chrome installation as a universal substitute. Playwright normally uses browser binaries matched to its package expectations. Branded channels are a separate configuration choice and should be installed and configured intentionally.

## Prove which Python environment owns the command

Multiple Python installations are common on laptops, CI runners, and agent workspaces. A shell may resolve \`pip\` from one environment and \`python\` from another. An IDE can also run tests with a different interpreter than the terminal.

Capture the interpreter path and package location before reinstalling anything:

\`\`\`bash
python -c "import sys; print(sys.executable)"
python -m pip show playwright
python -c "import playwright; print(playwright.__file__)"
python -m playwright install chromium
\`\`\`

The executable and package paths should belong to the intended virtual environment. Then run the test through the same interpreter, for example \`python -m pytest\`. This removes ambiguity introduced by a globally installed \`pytest\` executable.

| Observation | Interpretation | Next check |
|---|---|---|
| Package path is outside \`.venv\` | The wrong environment is active | Activate the environment or call its Python explicitly |
| \`pip show\` finds nothing | Package is absent for this interpreter | Run \`python -m pip install playwright\` |
| Install succeeds but IDE still fails | IDE test runner uses another interpreter | Select the project interpreter in the IDE |
| Root and non-root runs differ | They use different home directories or caches | Install and test as the same runtime user |

An AI coding agent should record these paths in its diagnostic output. Repeating the install command without environment evidence can populate several caches while leaving the failing test environment untouched.

## Verify launch with the smallest possible probe

Before debugging fixtures, marks, page objects, or application URLs, launch one browser with a standalone script. The probe separates browser installation from the test framework and product under test.

\`\`\`python
from playwright.sync_api import sync_playwright

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_content("<title>install probe</title><h1>ready</h1>")
    assert page.title() == "install probe"
    assert page.get_by_role("heading", name="ready").is_visible()
    print(browser.version)
    browser.close()
\`\`\`

Save it as \`probe_playwright.py\` and run it with \`python probe_playwright.py\`. It uses no network and no pytest plugin. If it fails before \`new_page\`, concentrate on the browser executable and native environment. If it passes, the installation is functional and the original failure belongs to test configuration, fixtures, launch arguments, or application access.

For async suites, use the async Playwright API in production tests, but keep the diagnostic probe small. Mixing sync and async APIs incorrectly produces a different class of error from missing browser files.

## Repair cache and browser-path mismatches

Playwright stores downloaded browsers in platform-specific cache locations by default. The exact directory varies by operating system. Problems appear when installation and execution disagree about the runtime user, home directory, container layer, or \`PLAYWRIGHT_BROWSERS_PATH\`.

That environment variable is documented for choosing a shared browser location. It must have the same value during installation and execution.

\`\`\`bash
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers"
python -m playwright install chromium
python -m pytest tests/ui
\`\`\`

This project-local example is explicit and easy to cache in CI. Quote the path, and avoid committing downloaded browser directories to source control. They are generated artifacts, can be large, and are tied to package expectations and host platform.

Use this decision sequence when an executable is reported missing:

1. Confirm the failing command's \`sys.executable\`.
2. Confirm that interpreter imports the expected Playwright package.
3. Check whether \`PLAYWRIGHT_BROWSERS_PATH\` is set in either the install or test step.
4. Compare the operating-system user and working environment for both steps.
5. Re-run the browser install with the exact runtime interpreter and path setting.

Avoid deleting a shared cache as the first response. Other projects or jobs may be using it. A targeted reinstall into a known location is safer and produces clearer evidence. If a cache is genuinely corrupt, identify its exact project-owned path before removing it.

## Supply Linux browser dependencies correctly

A downloaded executable can still fail at startup when the Linux image lacks native libraries. Playwright provides documented commands that install browser system dependencies on supported Linux distributions. Where the runner permits package installation, combine dependency and browser setup:

\`\`\`bash
python -m playwright install --with-deps chromium
\`\`\`

Another documented form installs dependencies separately:

\`\`\`bash
python -m playwright install-deps chromium
python -m playwright install chromium
\`\`\`

System dependency installation may require privileges because it uses the host package manager. In locked-down CI, build a container image with the dependencies ahead of time or use the official Playwright Python container image that matches the project strategy. Do not paste an old hand-maintained list of Linux packages into every repository. Browser dependency requirements change, and the documented installer or maintained image is less error-prone.

| Failure stage | Error characteristics | Likely category |
|---|---|---|
| Before executable starts | Path says executable is absent | Browser download or cache mismatch |
| Immediately after process start | Missing shared library or loader message | Linux system dependency |
| Browser starts, page never loads | Navigation timeout or DNS failure | Application network access, not installation |
| Headed launch fails on server | Display-related message | Use headless mode or a supported display setup |

Read the earliest browser-process error, not only the final pytest traceback. The first native error usually names the missing layer more directly.

## Unblock downloads behind proxies and certificates

Corporate networks can allow Python package downloads through an internal mirror while blocking Playwright's browser download host. That is why \`pip install\` may work and \`playwright install\` may fail with certificate, connection, or timeout errors.

Playwright documents \`HTTPS_PROXY\` for proxying browser downloads. It also documents \`NODE_EXTRA_CA_CERTS\` when a custom certificate authority must be trusted by the download process.

\`\`\`bash
export HTTPS_PROXY="https://proxy.example.test:8443"
export NODE_EXTRA_CA_CERTS="/etc/company-ca/root.pem"
python -m playwright install chromium
\`\`\`

Use real values from the organization's network team or secret store. Never commit proxy credentials or private certificate material. If downloads must come from an internal artifact mirror, follow the official Playwright environment-variable documentation and the organization's approved mirror configuration rather than rewriting URLs inside installed packages.

Distinguish a slow transfer from a trust failure. A timeout points toward connectivity or proxy performance; an issuer or certificate verification message points toward the CA chain. Turning off certificate verification is not a sound CI fix because it hides interception and supply-chain risk.

## Make browser installation reproducible in CI

Install the Python dependencies first, then install the browsers expected by the suite. Run both steps after selecting the Python runtime. A minimal GitHub Actions job for Chromium can look like this:

\`\`\`yaml
name: ui-tests

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with:
          python-version: '3.x'
      - run: python -m pip install -r requirements.txt
      - run: python -m playwright install --with-deps chromium
      - run: python -m pytest tests/ui
\`\`\`

The YAML uses documented GitHub Actions keys and Playwright commands. Pin application dependencies in the repository's dependency file according to the team's policy. When the Playwright package changes, its expected browser build can change too, so the browser installation belongs after dependency resolution.

Caching browser downloads can reduce job time, but it introduces cache-key responsibility. Include enough dependency and platform information to prevent an older cache from masquerading as a valid install. A cold CI job should still be able to rebuild the environment from declared dependencies alone.

For a browser matrix, install what each job needs rather than assuming one job's filesystem is visible to another. CI jobs are commonly isolated. If an artifact or cache transfers browsers between jobs, preserve the same browser path and compatible operating system.

## Separate install failures from test failures

Once the offline probe launches, stop changing the browser installation. Move up the stack and classify the failing test.

| Test symptom after a successful probe | Area to investigate | Useful evidence |
|---|---|---|
| Fixture cannot find browser name | pytest project or fixture configuration | Requested browser versus installed browser |
| Navigation times out | Base URL, server readiness, DNS, firewall | Response from the target inside the runner |
| Element lookup times out | Locator or application state | Playwright trace and DOM snapshot |
| Browser closes during test | Fixture scope, teardown, resource limits | Earliest close event and worker logs |
| Only parallel CI fails | Shared accounts, ports, files, or capacity | Per-worker isolation and resource metrics |

Playwright tracing can capture browser actions, DOM snapshots, network activity, and other debugging evidence when enabled through documented test configuration or API calls. It helps with a running browser and failing scenario. It cannot repair an executable that was never installed, so do not expect a trace from a launch failure.

A good incident note records the Python executable, Playwright package source, browser requested, runtime user, browser-path setting, operating system image, install command, and the earliest error. That evidence turns a vague "Playwright is broken" report into a layer-specific repair another engineer can reproduce.

## Frequently Asked Questions

### Why does pip install playwright not install a usable browser?

The Python package and Playwright-managed browser binaries are separate installation layers. Pip installs the API package into a Python environment. Run \`python -m playwright install\`, optionally naming the browser required by the suite, with the same interpreter that runs tests. On Linux, native browser dependencies may also be needed. Keeping these steps explicit makes local, container, and CI environments reproducible.

### Should I run the install command on every CI job?

Each isolated job must have access to compatible browser files and operating-system dependencies. Running the install step is the simplest reliable approach. A carefully keyed cache or a prebuilt image can reduce download time, but it must align with the resolved Playwright dependency, platform, browser path, and runtime user. Always retain a cold-build path so a stale cache cannot become an undocumented prerequisite.

### What if Chromium works but Firefox or WebKit reports a missing executable?

Installing one browser does not populate the others. Compare the browsers named by the test configuration or pytest matrix with the browser arguments used during installation. Install every browser the job actually exercises, or narrow the project matrix deliberately. Then run a minimal launch probe for the failing browser. This distinguishes a missing binary from a browser-specific native dependency or product-test failure.

### Is PLAYWRIGHT_BROWSERS_PATH required for Python tests?

No. Playwright has default platform-specific cache locations. Set \`PLAYWRIGHT_BROWSERS_PATH\` when the team needs an explicit shared, project-local, or CI-cached location. The critical rule is consistency: installation and test execution must see the same value and permissions. If one step sets the variable and another does not, a successful download can still be invisible when the browser launches.
`,
};
