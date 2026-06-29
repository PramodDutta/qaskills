import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest + Playwright Python: E2E Testing Tutorial (2026)',
  description:
    'Learn end-to-end browser testing with Playwright Python and the pytest-playwright plugin: fixtures, locators, parametrization, traces, parallelism, and CI.',
  date: '2026-06-29',
  category: 'Tutorial',
  content: `
# pytest + Playwright Python: E2E Testing Tutorial (2026)

End-to-end browser testing in Python has never been smoother than it is in 2026, and the combination of Playwright and the official \`pytest-playwright\` plugin is why. Playwright gives you a fast, reliable cross-browser automation engine with auto-waiting baked in, and \`pytest-playwright\` wires that engine into pytest with ready-made \`page\`, \`context\`, and \`browser\` fixtures so you can write a real E2E test in about five lines. No driver downloads, no Selenium Grid, no manual waits.

This tutorial walks you through everything you need to ship a production-grade Playwright Python E2E suite with pytest. We will install the toolchain, write your first test, learn the built-in fixtures and how to extend them in \`conftest.py\`, master locators and auto-waiting, parametrize tests across data and browsers, toggle headed and headless runs, capture traces and screenshots automatically on failure, run the whole thing in parallel with \`pytest-xdist\`, and wire it into CI. Every snippet is real and runnable.

By the end you will have a suite that runs fast, debugs itself with traces, and scales across browsers and workers without ceremony. If you are coming from a unit-testing background and want a refresher on pytest itself, our [pytest testing complete guide](/blog/pytest-testing-complete-guide) is a good companion. And if you are deciding between Python and TypeScript for Playwright, the patterns here apply to both, but this tutorial stays in Python the whole way. Let us get the toolchain installed.

## Installing pytest-playwright and the Browsers

Playwright for Python ships as a pip package, and \`pytest-playwright\` is the official pytest plugin that adds the fixtures. Installing both takes two commands, plus one more to download the browser binaries Playwright drives.

\`\`\`bash
# Install the pytest plugin (pulls in playwright itself)
pip install pytest-playwright

# Download the browser binaries (Chromium, Firefox, WebKit)
playwright install

# On Linux CI you may also need system dependencies
playwright install --with-deps chromium
\`\`\`

A clean project layout to start from:

\`\`\`bash
my-e2e-tests/
  conftest.py          # shared fixtures and config
  pytest.ini           # pytest settings
  tests/
    test_login.py
    test_search.py
  requirements.txt
\`\`\`

Pin your versions in \`requirements.txt\` so CI is reproducible:

\`\`\`bash
pytest==8.3.4
pytest-playwright==0.6.2
pytest-xdist==3.6.1
\`\`\`

Verify everything is wired up with a one-liner:

\`\`\`bash
python -c "from playwright.sync_api import sync_playwright; print('Playwright ready')"
\`\`\`

If that prints \`Playwright ready\` and \`playwright install\` finished without errors, you are ready to write tests. The plugin auto-registers its fixtures, so there is nothing to import in your test files to get \`page\` working.

## Writing Your First E2E Test

The \`pytest-playwright\` plugin gives every test a function-scoped \`page\` fixture, a fresh browser page isolated from other tests. You ask for it as a function argument and you are off.

\`\`\`python
# tests/test_first.py
from playwright.sync_api import Page, expect


def test_homepage_has_title(page: Page):
    page.goto("https://playwright.dev/")
    expect(page).to_have_title(lambda title: "Playwright" in title)


def test_get_started_link(page: Page):
    page.goto("https://playwright.dev/")
    page.get_by_role("link", name="Get started").click()
    expect(page.get_by_role("heading", name="Installation")).to_be_visible()
\`\`\`

Run it:

\`\`\`bash
# Runs headless by default
pytest

# Run a single file with verbose output
pytest tests/test_first.py -v
\`\`\`

That is a complete, reliable E2E test. There are no explicit waits, because \`get_by_role(...).click()\` auto-waits for the link to be actionable and \`expect(...).to_be_visible()\` retries until the heading appears or times out. This auto-waiting is the foundation of the whole framework, and it is what makes Playwright tests dramatically less flaky than their Selenium counterparts. If you are migrating an existing Selenium suite to get here, see our [Selenium vs Playwright 2026 comparison](/blog/selenium-vs-playwright-2026).

## The Built-in page, context, and browser Fixtures

The plugin exposes a hierarchy of fixtures that mirror Playwright's object model. Knowing their scopes is the key to writing correct, isolated tests.

| Fixture | What it is | Default scope |
|---|---|---|
| \`browser\` | The launched browser process | session |
| \`context\` | An isolated browser context (cookies, storage) | function |
| \`page\` | A single tab inside the context | function |
| \`browser_name\` | String: \`chromium\`, \`firefox\`, or \`webkit\` | session |
| \`browser_type_launch_args\` | Override launch options | session |
| \`browser_context_args\` | Override context options | function |

Because \`context\` and \`page\` are function-scoped, every test gets a clean, isolated browser state, no leaked cookies, no shared local storage. That isolation is what lets you run tests in parallel safely.

You override fixtures by redefining the args fixtures. For example, to set a viewport and locale for every context:

\`\`\`python
# conftest.py
import pytest


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "viewport": {"width": 1440, "height": 900},
        "locale": "en-US",
        "ignore_https_errors": True,
    }
\`\`\`

You can also request a raw \`context\` and open multiple pages when a test needs two tabs:

\`\`\`python
def test_two_tabs(context):
    page_one = context.new_page()
    page_two = context.new_page()
    page_one.goto("https://example.com")
    page_two.goto("https://example.org")
    assert page_one.title() != page_two.title()
\`\`\`

## Locators and Auto-Waiting

Locators are Playwright's way of describing how to find an element. They are lazy and re-resolve on every action, which is why stale-element errors do not exist here. Prefer user-facing locators that mirror how a person perceives the page.

\`\`\`python
from playwright.sync_api import Page, expect


def test_locator_strategies(page: Page):
    page.goto("https://example.com/login")

    # By accessible role and name (preferred)
    page.get_by_role("button", name="Sign in").click()

    # By associated label
    page.get_by_label("Email").fill("user@test.com")

    # By placeholder
    page.get_by_placeholder("Search products").fill("laptop")

    # By visible text
    page.get_by_text("Forgot password?").click()

    # By test id (when there is no accessible identity)
    page.get_by_test_id("submit-order").click()

    # Web-first assertions auto-retry until they pass or time out
    expect(page.get_by_role("alert")).to_have_text("Welcome back")
\`\`\`

Use this priority order when choosing a locator: role, then label and placeholder for form fields, then text for content, then test id, and only fall back to a CSS or XPath selector for awkward cases. The table below maps assertions you will reach for constantly.

| Goal | Web-first assertion |
|---|---|
| Element is visible | \`expect(loc).to_be_visible()\` |
| Element has exact text | \`expect(loc).to_have_text("X")\` |
| Element contains text | \`expect(loc).to_contain_text("X")\` |
| Input has value | \`expect(loc).to_have_value("X")\` |
| Element count | \`expect(loc).to_have_count(3)\` |
| Page URL matches | \`expect(page).to_have_url(re.compile("/ok"))\` |
| Element is enabled | \`expect(loc).to_be_enabled()\` |

Never reach for \`page.wait_for_timeout(2000)\` (a fixed sleep) to fix a timing bug. Add a real web-first assertion instead, it polls the live DOM and disappears the flakiness instead of papering over it. For more on stamping out flaky tests, read our [guide to fixing flaky tests](/blog/fix-flaky-tests-guide).

## Fixtures and conftest.py

\`conftest.py\` is where you share fixtures across test files without importing them. This is the right place for login helpers, base-URL configuration, and authenticated sessions.

A reusable authenticated-page fixture that logs in once per test:

\`\`\`python
# conftest.py
import pytest
from playwright.sync_api import Page


@pytest.fixture
def logged_in_page(page: Page) -> Page:
    page.goto("https://example.com/login")
    page.get_by_label("Email").fill("user@test.com")
    page.get_by_label("Password").fill("s3cret")
    page.get_by_role("button", name="Sign in").click()
    # Wait for the post-login landmark before handing the page over
    page.get_by_role("heading", name="Dashboard").wait_for()
    return page


@pytest.fixture(scope="session")
def base_url() -> str:
    import os
    return os.environ.get("BASE_URL", "https://example.com")
\`\`\`

Tests just request the fixture and skip the login boilerplate entirely:

\`\`\`python
# tests/test_dashboard.py
from playwright.sync_api import expect


def test_dashboard_shows_username(logged_in_page):
    expect(logged_in_page.get_by_test_id("user-name")).to_have_text("user")
\`\`\`

For real suites, store an authenticated storage state once and reuse it across tests to avoid logging in repeatedly, which is faster and more reliable than a per-test login. If you build page objects on top of these fixtures, our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) covers the Page Object Model pattern in detail.

## Parametrizing Tests

pytest's \`@pytest.mark.parametrize\` works seamlessly with Playwright fixtures, letting you run the same flow against many inputs. This is how you cover search terms, form permutations, or feature flags without copy-pasting tests.

\`\`\`python
import pytest
from playwright.sync_api import Page, expect


@pytest.mark.parametrize(
    "query,expected",
    [
        ("laptop", "Laptops"),
        ("phone", "Phones"),
        ("camera", "Cameras"),
    ],
)
def test_search_results(page: Page, query: str, expected: str):
    page.goto("https://example.com")
    page.get_by_placeholder("Search products").fill(query)
    page.get_by_role("button", name="Search").click()
    expect(page.get_by_role("heading")).to_contain_text(expected)
\`\`\`

To run the same test across multiple browsers, pass \`--browser\` flags on the command line, the plugin parametrizes the \`page\` fixture for you:

\`\`\`bash
# Run every test in all three engines
pytest --browser chromium --browser firefox --browser webkit
\`\`\`

That single command turns your suite into a cross-browser suite with no code changes. Combine parametrization with multiple browsers and you get broad coverage from a tiny amount of code.

You can also parametrize at the fixture level when the variation belongs to setup rather than to a single test. For example, parametrizing a \`viewport\` fixture lets every test that depends on it run once on a desktop layout and once on a mobile layout, which is a clean way to catch responsive regressions without duplicating assertions.

\`\`\`python
import pytest


@pytest.fixture(params=[
    {"width": 1440, "height": 900},
    {"width": 390, "height": 844},
])
def sized_page(page, request):
    page.set_viewport_size(request.param)
    return page


def test_nav_is_responsive(sized_page):
    sized_page.goto("https://example.com")
    # Runs once at desktop width and once at mobile width
    assert sized_page.title() != ""
\`\`\`

Keep parametrization focused: a handful of meaningful cases per test beats an exhaustive matrix that takes an hour to run and tells you little.

## Headed vs Headless, Slow-mo, and Debugging

By default tests run headless, which is what you want in CI. During local development you often want to watch the browser, slow it down, or pause and inspect.

\`\`\`bash
# Watch the browser while tests run
pytest --headed

# Slow every action by 500ms so you can follow along
pytest --headed --slowmo 500

# Open the Playwright Inspector and step through
PWDEBUG=1 pytest tests/test_login.py
\`\`\`

You can also drop into the inspector programmatically with \`page.pause()\`, which freezes the run and opens a live tool where you can hover elements to generate locators:

\`\`\`python
def test_explore(page):
    page.goto("https://example.com")
    page.pause()  # opens the Inspector; pick locators interactively
\`\`\`

| Flag | Effect | Use when |
|---|---|---|
| \`--headed\` | Shows the browser UI | Local development |
| \`--slowmo N\` | Delays each action N ms | Watching a flow |
| \`PWDEBUG=1\` | Opens the Inspector | Stepping through |
| \`--browser firefox\` | Switches engine | Cross-browser checks |
| \`--video on\` | Records a video | Reproducing a failure |

## Traces and Screenshots on Failure

The trace is Playwright's killer debugging feature: a complete, time-travel recording of a test run including DOM snapshots, network, console, and action timings. Capture traces and screenshots automatically when a test fails and you will almost never need to reproduce a flaky failure by hand.

\`\`\`bash
# Capture a trace and screenshot, but only when a test fails
pytest --tracing retain-on-failure --screenshot only-on-failure

# Always record, useful while building a new test
pytest --tracing on --video on
\`\`\`

Open a recorded trace in the interactive viewer:

\`\`\`bash
playwright show-trace test-results/.../trace.zip
\`\`\`

The viewer lets you scrub through every action, see the DOM exactly as it was at each step, and inspect the network and console. This single tool turns mysterious CI failures into a five-minute diagnosis. For a complete walkthrough of reading traces, see our [Playwright trace viewer debugging guide](/blog/playwright-trace-viewer-debugging-guide).

| Option | Values | Recommended setting |
|---|---|---|
| \`--tracing\` | \`on\`, \`off\`, \`retain-on-failure\` | \`retain-on-failure\` in CI |
| \`--screenshot\` | \`on\`, \`off\`, \`only-on-failure\` | \`only-on-failure\` |
| \`--video\` | \`on\`, \`off\`, \`retain-on-failure\` | \`retain-on-failure\` |
| \`--output\` | directory path | \`test-results\` |

## Parallel Execution With pytest-xdist

Playwright tests are isolated per function, so they parallelize cleanly. The \`pytest-xdist\` plugin distributes tests across multiple worker processes, cutting wall-clock time on large suites.

\`\`\`bash
# Run across as many workers as you have CPU cores
pytest -n auto

# Pin to a specific number of workers
pytest -n 4

# Combine with cross-browser and trace capture
pytest -n auto --browser chromium --tracing retain-on-failure
\`\`\`

Because each test gets its own function-scoped \`context\` and \`page\`, there is no shared state to corrupt across workers. A few rules keep parallel runs reliable:

- Make tests independent, never rely on order or on data another test created.
- Use unique test data per test (timestamps or UUIDs) so two workers do not collide on the same record.
- Avoid session-scoped mutable fixtures shared across workers; \`pytest-xdist\` runs each worker in its own process.

\`\`\`python
import uuid


def test_create_unique_account(page):
    email = f"user-{uuid.uuid4().hex[:8]}@test.com"
    page.goto("https://example.com/signup")
    page.get_by_label("Email").fill(email)
    page.get_by_role("button", name="Create account").click()
    # Each worker uses a distinct email, so no collisions
\`\`\`

## Configuring CI for Playwright Python

The final piece is running your suite in CI on every push. Here is a complete GitHub Actions workflow that installs dependencies, downloads browsers with system deps, runs the suite in parallel with traces, and uploads artifacts on failure.

\`\`\`bash
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Install browsers
        run: playwright install --with-deps
      - name: Run E2E tests
        run: pytest -n auto --tracing retain-on-failure --screenshot only-on-failure
      - name: Upload traces on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: test-results/
\`\`\`

A matching \`pytest.ini\` keeps settings out of the command line:

\`\`\`bash
# pytest.ini
[pytest]
addopts = --tracing retain-on-failure --screenshot only-on-failure
testpaths = tests
\`\`\`

With \`--with-deps\`, CI installs the OS libraries the browsers need, and uploading \`test-results/\` on failure means every red build comes with a trace you can open locally. That closes the loop: fast local development, parallel CI, and self-documenting failures.

A couple of CI refinements pay off as the suite grows. Cache the pip dependencies and the Playwright browser binaries between runs so you are not re-downloading hundreds of megabytes on every push; the browser cache lives under a versioned directory, so key the cache on your \`pytest-playwright\` version to invalidate it cleanly on upgrades. Shard the suite across multiple CI machines with \`pytest -n auto\` per runner plus a matrix strategy when a single runner can no longer finish in your target time budget. And gate merges on the E2E job so a red trace blocks the pull request rather than slipping into the main branch, where it is far more expensive to chase down. These are small changes, but together they keep the feedback loop tight even as the test count climbs into the hundreds. To go further with AI agents that write and maintain these tests for you, browse the [best Claude Code skills for automated testing](/blog/best-claude-code-skills-for-automated-testing) and grab ready-made Playwright skills from the directory at [/skills](/skills).

## Frequently Asked Questions

### How do I install Playwright for Python with pytest?

Run \`pip install pytest-playwright\` to get the plugin and Playwright itself, then \`playwright install\` to download the Chromium, Firefox, and WebKit browser binaries. On Linux CI add \`playwright install --with-deps\` to also pull the required system libraries. After that the \`page\`, \`context\`, and \`browser\` fixtures are available automatically with no imports needed in your test files.

### What is the difference between the page, context, and browser fixtures?

\`browser\` is the launched browser process and is session-scoped, so it is shared. \`context\` is an isolated browser context with its own cookies and storage and is function-scoped, so each test gets a clean one. \`page\` is a single tab inside the context, also function-scoped. This hierarchy gives every test full isolation, which is what makes parallel execution safe.

### How do I run Playwright Python tests in parallel?

Install \`pytest-xdist\` and run \`pytest -n auto\` to distribute tests across all CPU cores, or \`pytest -n 4\` for a fixed number of workers. Because each test gets its own function-scoped context and page, there is no shared state to corrupt. Keep tests independent and use unique data like UUID-based emails so two workers never collide on the same record.

### How do I capture screenshots and traces on test failure?

Pass \`--screenshot only-on-failure\` and \`--tracing retain-on-failure\` to pytest, or set them in \`pytest.ini\` so they always apply. Failures then drop a screenshot and a full trace zip into \`test-results\`. Open the trace with \`playwright show-trace path/to/trace.zip\` to scrub through every action with DOM snapshots, network, and console, which makes flaky CI failures fast to diagnose.

### How do I run Playwright tests in headed mode?

Add the \`--headed\` flag, for example \`pytest --headed\`, to watch the browser as tests run. Combine it with \`--slowmo 500\` to delay each action by 500 milliseconds so you can follow along. For interactive debugging, run \`PWDEBUG=1 pytest\` to open the Playwright Inspector, or call \`page.pause()\` inside a test to freeze the run and pick locators by hovering elements.

### How do I test across multiple browsers with pytest-playwright?

Pass repeated \`--browser\` flags on the command line: \`pytest --browser chromium --browser firefox --browser webkit\`. The plugin parametrizes the \`page\` fixture so every test runs once per engine with no code changes. This turns your suite into a cross-browser suite instantly and is the recommended way to catch engine-specific rendering and behavior differences.

### Why are my Playwright tests still flaky even with auto-waiting?

The most common cause is reaching for \`page.wait_for_timeout()\` (a fixed sleep) instead of a web-first assertion. Replace every sleep with assertions like \`expect(locator).to_be_visible()\` or \`to_have_text()\`, which poll the live DOM until they pass. Also avoid order-dependent tests, use unique data per test, and turn on traces so you can see exactly where the timing actually breaks.

### Do I need conftest.py for Playwright Python tests?

You do not need it to start, since the fixtures work out of the box. But \`conftest.py\` is where you share fixtures across files without imports, such as a logged-in-page fixture, a base-URL setting, or custom context arguments like viewport and locale. As your suite grows it becomes the central place for reusable setup, keeping individual test files focused on assertions.

## Conclusion

You now have a complete, modern Playwright Python E2E workflow: installed with two pip commands, built on the auto-fixtured \`page\`, \`context\`, and \`browser\` objects, written with resilient role-based locators and auto-retrying web-first assertions, parametrized across data and browsers, debuggable with traces and screenshots on failure, parallelized with \`pytest-xdist\`, and running in CI on every push. That is a suite that stays fast and stays reliable as it grows.

The best next step is to write one real test against your own app today, turn on \`--tracing retain-on-failure\`, and feel how much faster debugging gets when every failure ships with a time-travel recording. When you are ready to let AI agents write and maintain these tests alongside you, explore the Playwright and pytest skills in the QASkills directory at [/skills](/skills) and wire them into your coding agent.
`,
};
