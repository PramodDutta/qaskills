import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'pytest-playwright Plugin: The Complete 2026 Tutorial',
  description:
    'Master the pytest-playwright plugin in 2026: fixtures, CLI flags, multi-browser runs, storage_state auth, parallel xdist, and trace debugging. Real Python examples throughout.',
  date: '2026-06-27',
  category: 'Tutorial',
  content: `
# pytest-playwright Plugin: The Complete 2026 Tutorial

Playwright for Python ships with a first-class pytest integration called \`pytest-playwright\`, and in 2026 it is the default way Python teams write browser end-to-end tests. The numbers tell the story: Playwright's Python distribution crossed roughly 1.4 million weekly downloads on PyPI this year, overtaking older Selenium-based stacks for new greenfield projects. The reason is simple. Instead of bolting a browser library onto pytest yourself, the plugin hands you ready-made fixtures, a rich set of command-line flags, automatic artifact capture, and seamless parallelism, all in idiomatic pytest style.

If you already know pytest, you will feel at home immediately. A test is just a function that takes a \`page\` fixture and calls methods on it. There is no driver setup, no manual browser launch, no teardown boilerplate. The plugin manages the browser lifecycle, gives every test a fresh isolated browser context, and tears everything down for you. If you are newer to pytest itself, skim our primer on [what pytest is and how it works](/blog/what-is-pytest-python-explained) and our [pytest best practices guide](/blog/pytest-best-practices-2026) first, then come back here to add the browser layer.

This tutorial is comprehensive and example-driven. We cover installation, every fixture the plugin provides, your first real test, the full CLI flag set, configuration via \`pytest.ini\` and \`pyproject.toml\`, parametrizing across browsers, overriding context arguments, auto-using fixtures, parallel execution with \`pytest-xdist\`, authentication with \`storage_state\`, and debugging with the trace viewer. Everything here runs against any modern Python 3.9+ environment. By the end you will have a production-shaped pytest browser suite.

## Installing pytest-playwright

Installation is two commands. The first installs the plugin and its Python dependencies from PyPI; the second downloads the actual browser binaries (Chromium, Firefox, and WebKit) that Playwright drives.

\`\`\`bash
pip install pytest-playwright
playwright install
\`\`\`

The \`pip install pytest-playwright\` step pulls in the \`playwright\` Python package as a dependency and registers the pytest plugin automatically, no extra configuration in \`conftest.py\` is needed for pytest to discover it. The \`playwright install\` step is the one people forget; without it your tests fail at launch because the browser executables are not on disk. On CI you typically run \`playwright install --with-deps\` so the system libraries the browsers need are installed too.

To confirm everything is wired up, create a file and run a trivial test:

\`\`\`python
# test_smoke.py
def test_homepage_title(page):
    page.goto("https://playwright.dev/python/")
    assert "Playwright" in page.title()
\`\`\`

\`\`\`bash
pytest test_smoke.py
\`\`\`

If that passes, the plugin, the browsers, and pytest discovery are all working. Notice you never imported anything from Playwright, the \`page\` argument is a fixture the plugin injects, and that is the heart of how \`pytest-playwright\` works.

## The Fixtures the Plugin Provides

The plugin's power comes from its fixtures. Each one is function-scoped by default, meaning you get a clean instance per test, which is what keeps browser tests isolated and parallel-safe. Here is the full set you will actually use.

| Fixture | Type / scope | What it gives you |
|---|---|---|
| \`page\` | Page, function | A fresh browser tab in an isolated context, the one you use most |
| \`context\` | BrowserContext, function | The isolated context behind the page; make extra tabs here |
| \`browser\` | Browser, session | The shared browser instance for the whole run |
| \`browser_name\` | str, function | "chromium", "firefox", or "webkit" for the current run |
| \`playwright\` | Playwright, session | The root Playwright object for advanced use |
| \`browser_type_launch_args\` | dict, override | Override launch args (headless, slow_mo, channel) |
| \`browser_context_args\` | dict, override | Override context args (base_url, viewport, locale, storage_state) |
| \`is_chromium\` | bool, function | True when the active browser is Chromium |
| \`is_firefox\` | bool, function | True when the active browser is Firefox |
| \`is_webkit\` | bool, function | True when the active browser is WebKit |

The distinction between \`browser\` (session-scoped, shared) and \`context\`/\`page\` (function-scoped, fresh) is the key design decision. Launching a browser is slow, so the plugin does it once per run. Creating a context is cheap and gives perfect isolation, cookies, local storage, and cache are wiped between tests, so it does that per test. The \`browser_type_launch_args\` and \`browser_context_args\` fixtures are special: they are meant to be overridden in your \`conftest.py\` to customize how browsers and contexts are created, which we cover in the configuration section.

## Writing Your First Real Test

A smoke test is fine, but real tests interact with the page. The \`page\` fixture exposes Playwright's full API, navigation, locators, actions, and assertions, with automatic waiting baked in. Here is a small but realistic login-and-search flow.

\`\`\`python
# test_search.py
import re
from playwright.sync_api import Page, expect


def test_search_returns_results(page: Page):
    page.goto("https://playwright.dev/python/")

    # Locators are resolved with auto-waiting; no explicit sleeps needed.
    page.get_by_role("button", name="Search").click()
    search_box = page.get_by_placeholder("Search docs")
    search_box.fill("locator")
    search_box.press("Enter")

    # expect() retries until the assertion passes or times out.
    results = page.get_by_role("listbox")
    expect(results).to_be_visible()
    expect(results.get_by_role("option").first).to_contain_text(re.compile("locator", re.I))


def test_navigation_to_docs(page: Page):
    page.goto("https://playwright.dev/python/")
    page.get_by_role("link", name="Docs").first.click()
    expect(page).to_have_url(re.compile(r"/python/docs/"))
    expect(page.get_by_role("heading", name="Installation")).to_be_visible()
\`\`\`

Two things are worth highlighting. First, import \`expect\` from \`playwright.sync_api\`, not pytest, this is Playwright's own assertion helper, and it retries automatically until the condition holds, which eliminates the flaky \`assert\` race conditions that plague naive browser tests. Second, prefer role-based locators like \`get_by_role\`, they are far more resilient to markup changes than CSS or XPath selectors. The plugin defaults to Playwright's synchronous API, so you write straightforward top-to-bottom code with no \`async\`/\`await\`.

## Command-Line Options

The plugin adds a set of pytest flags that control how the browser runs. These are the levers you reach for constantly, whether you are debugging locally or configuring CI.

| Flag | Effect |
|---|---|
| \`--headed\` | Run with a visible browser window (default is headless) |
| \`--browser chromium\` | Run on a specific engine; repeatable for multiple |
| \`--browser firefox\` | Run on Firefox |
| \`--browser webkit\` | Run on WebKit (Safari's engine) |
| \`--browser-channel chrome\` | Use a branded channel like Chrome or Edge instead of bundled Chromium |
| \`--slowmo 500\` | Slow each action by N milliseconds, great for watching a flow |
| \`--device "iPhone 15"\` | Emulate a device's viewport, user agent, and touch |
| \`--tracing on\` | Record a Playwright trace (on / off / retain-on-failure) |
| \`--video on\` | Record video (on / off / retain-on-failure) |
| \`--screenshot only-on-failure\` | Capture screenshots (on / off / only-on-failure) |
| \`--output dir\` | Directory for traces, videos, and screenshots |

A few examples of how these combine in practice:

\`\`\`bash
# Watch a single test run slowly in a real Chrome window
pytest test_search.py --headed --browser-channel chrome --slowmo 400

# Run the whole suite across all three engines
pytest --browser chromium --browser firefox --browser webkit

# Emulate a phone and keep artifacts only when something fails
pytest --device "iPhone 15" --screenshot only-on-failure --tracing retain-on-failure

# Send all artifacts to a custom folder for CI upload
pytest --tracing retain-on-failure --video retain-on-failure --output test-artifacts
\`\`\`

The \`retain-on-failure\` value for \`--tracing\` and \`--video\` is the single most useful setting for CI. It keeps full traces and videos only for the tests that actually failed, so you get rich debugging artifacts without ballooning storage on a green run. When a CI job goes red, you download the trace and replay the exact failure locally.

## Configuring via pytest.ini and pyproject.toml

Typing flags every run gets old. Pin your defaults in a config file so every invocation, local and CI, behaves consistently. The plugin reads standard pytest config, so you can use \`pytest.ini\`, \`pyproject.toml\`, or \`setup.cfg\`.

Using \`pytest.ini\`:

\`\`\`ini
# pytest.ini
[pytest]
addopts = --headed=false --tracing=retain-on-failure --screenshot=only-on-failure --output=test-results
testpaths = tests
\`\`\`

Using \`pyproject.toml\`, which most modern projects prefer:

\`\`\`toml
# pyproject.toml
[tool.pytest.ini_options]
addopts = "--tracing=retain-on-failure --screenshot=only-on-failure --output=test-results"
testpaths = ["tests"]
markers = [
    "smoke: fast critical-path checks",
    "regression: full regression suite",
]
\`\`\`

With this in place, \`pytest\` alone records traces and screenshots on failure into \`test-results/\`. You can still override per-run on the command line, flags passed directly win over \`addopts\`, so \`pytest --headed\` still pops a window when you need to watch. Centralizing config here also keeps your CI YAML clean: the pipeline just runs \`pytest\` and inherits the right behavior.

## Parametrizing Across Browsers and Overriding Context Args

Cross-browser coverage is where browser testing earns its cost. The plugin makes it declarative: pass multiple \`--browser\` flags and every test runs once per engine, with the \`browser_name\`, \`is_chromium\`, \`is_firefox\`, and \`is_webkit\` fixtures telling each test which engine it is on so you can branch on quirks.

\`\`\`python
# test_cross_browser.py
from playwright.sync_api import Page


def test_renders_everywhere(page: Page, browser_name: str):
    page.goto("https://playwright.dev/python/")
    assert page.get_by_role("heading", name="Playwright").is_visible()
    # Branch on engine-specific behavior when you truly must.
    if browser_name == "webkit":
        # WebKit handles some downloads differently; assert accordingly.
        pass
\`\`\`

\`\`\`bash
pytest test_cross_browser.py --browser chromium --browser firefox --browser webkit
\`\`\`

To customize the browser context, base URL, viewport, locale, timezone, or a saved auth state, override the \`browser_context_args\` fixture in \`conftest.py\`. Returning a dict that merges the plugin's defaults with your additions applies them to every context, and therefore every \`page\`, in the run.

\`\`\`python
# conftest.py
import pytest


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "base_url": "https://staging.example.com",
        "viewport": {"width": 1440, "height": 900},
        "locale": "en-US",
        "timezone_id": "America/New_York",
    }
\`\`\`

With \`base_url\` set, your tests can call \`page.goto("/dashboard")\` with a relative path and the plugin resolves it against the base. To override how the browser itself launches, headless mode, slow motion, a branded channel, override \`browser_type_launch_args\` the same way. Keeping these in \`conftest.py\` means environment differences live in one place, not scattered across test files.

## Auto-Using Fixtures and Parallel Runs With pytest-xdist

For setup that should run around every test without being passed explicitly, use an \`autouse\` fixture. A classic example is setting a default timeout or seeding analytics-blocking on every page.

\`\`\`python
# conftest.py
import pytest
from playwright.sync_api import Page


@pytest.fixture(autouse=True)
def configure_page(page: Page):
    page.set_default_timeout(10_000)  # 10s, applies to every test automatically
    # Block noisy third-party requests to stabilize tests.
    page.route("**/analytics/**", lambda route: route.abort())
    yield
    # Teardown after each test runs here if needed.
\`\`\`

Because every test gets an isolated context, the suite parallelizes cleanly. Install \`pytest-xdist\` and pass \`-n auto\` to fan tests across all CPU cores:

\`\`\`bash
pip install pytest-xdist
pytest -n auto
\`\`\`

This is where the plugin's design pays off. Each xdist worker is a separate process with its own browser, and each test inside it still gets a fresh context. There is no shared mutable browser state across tests, so parallelism does not introduce cross-test contamination, the thing that makes parallel UI tests notoriously flaky in poorly designed suites. The one rule to respect: do not share a single \`storage_state\` file that tests mutate concurrently, and do not depend on test ordering. Keep each test self-contained and \`-n auto\` just works. For more on keeping parallel suites stable, see our [guide to fixing flaky tests](/blog/fix-flaky-tests-guide).

## Handling Authentication With storage_state

Logging in through the UI before every test is slow and brittle. The professional pattern is to authenticate once, save the resulting cookies and local storage to a \`storage_state\` file, and inject that state into every test's context so each test starts already logged in.

First, a one-time setup that performs the login and saves the state. You can run this as its own test or a session-scoped fixture.

\`\`\`python
# conftest.py
import os
import pytest
from playwright.sync_api import Browser


STORAGE = "auth-state.json"


@pytest.fixture(scope="session", autouse=True)
def create_auth_state(browser: Browser):
    if os.path.exists(STORAGE):
        return  # Reuse a recent state; delete the file to force re-login.
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://staging.example.com/login")
    page.get_by_label("Email").fill(os.environ["TEST_USER"])
    page.get_by_label("Password").fill(os.environ["TEST_PASS"])
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")
    context.storage_state(path=STORAGE)
    context.close()


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "storage_state": STORAGE,
    }
\`\`\`

Now every test that uses \`page\` starts authenticated, because the \`browser_context_args\` override injects the saved \`storage_state\` into each context:

\`\`\`python
# test_dashboard.py
from playwright.sync_api import Page, expect


def test_dashboard_loads_when_authenticated(page: Page):
    page.goto("https://staging.example.com/dashboard")
    expect(page.get_by_role("heading", name="Your dashboard")).to_be_visible()
\`\`\`

This pattern slashes runtime, you log in once per session instead of once per test, and it removes login flakiness from every other test. Read \`TEST_USER\` and \`TEST_PASS\` from environment variables, never hardcode credentials, and add \`auth-state.json\` to \`.gitignore\` so you do not commit a live session token.

## Debugging: PWDEBUG, Trace Viewer, and Artifacts

When a test fails, the plugin gives you three escalating debugging tools. The fastest is the **Playwright Inspector**, launched by setting \`PWDEBUG=1\`. It opens a visible browser plus a step-through debugger that pauses on each action and lets you explore locators live.

\`\`\`bash
PWDEBUG=1 pytest test_dashboard.py -k test_dashboard_loads
\`\`\`

For CI failures you cannot reproduce by watching, use the **trace viewer**. If you configured \`--tracing retain-on-failure\`, every failed test leaves a \`trace.zip\` in your output directory. Open it to get a full timeline: a DOM snapshot before and after each action, network logs, console output, and the source line for every step.

\`\`\`bash
# After a failing CI run, download the artifact and replay it
playwright show-trace test-results/test-dashboard-.../trace.zip
\`\`\`

The third tier is plain artifacts, screenshots on failure (\`--screenshot only-on-failure\`) and videos (\`--video retain-on-failure\`). These are cheap to glance at and often enough to spot an obvious layout break. The recommended CI setup combines all three: traces and videos retained on failure for deep debugging, screenshots on failure for a quick visual, and the artifacts uploaded by your pipeline so anyone can pull them down. The trace viewer in particular turns "it fails on CI but not locally" from a multi-hour ordeal into a five-minute replay.

## pytest-playwright vs the Node Test Runner

Many teams ask whether to use the Python plugin or Playwright's native Node runner, \`@playwright/test\`. Both are first-party Microsoft tooling and share the same browser engine and locator API, so the choice is mostly about language ecosystem, not capability.

| Aspect | pytest-playwright (Python) | @playwright/test (Node) |
|---|---|---|
| Language | Python | TypeScript / JavaScript |
| Test runner | pytest (huge plugin ecosystem) | Built-in custom runner |
| Fixtures | pytest fixtures + plugin fixtures | Built-in fixtures + \`test.extend\` |
| Parallelism | \`pytest-xdist\` (\`-n auto\`) | Built-in workers (default on) |
| Auto-wait + locators | Identical (same engine) | Identical (same engine) |
| Trace viewer | Yes, shared tool | Yes, shared tool |
| Built-in retries | via \`pytest-rerunfailures\` | Built-in \`retries\` config |
| Best for | Python teams, mixed API+UI suites | JS/TS teams, frontend-heavy projects |

The honest guidance: pick the runner that matches your team's primary language. A Python shop with API tests already in pytest gets a unified suite, one runner, one set of fixtures, one report, by choosing \`pytest-playwright\`. A frontend team living in TypeScript gets tighter integration and built-in parallelism with \`@playwright/test\`. Neither is faster or more capable at the browser level, because they drive the identical engine. If you want a deeper comparison of the JavaScript side, our [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) covers the Node runner in detail.

## Frequently Asked Questions

### What is the pytest-playwright plugin?

\`pytest-playwright\` is the official pytest integration for Playwright's Python library. It provides ready-made fixtures, \`page\`, \`context\`, \`browser\`, \`browser_name\`, and more, plus command-line flags for headed mode, browser selection, tracing, and screenshots. You write a test as a function taking the \`page\` fixture, and the plugin manages browser launch, per-test isolation, and teardown automatically.

### How do I install pytest-playwright?

Run \`pip install pytest-playwright\` to install the plugin and its Python dependencies, then \`playwright install\` to download the Chromium, Firefox, and WebKit browser binaries. On CI, use \`playwright install --with-deps\` so the system libraries the browsers require are installed too. The plugin auto-registers with pytest, so no extra \`conftest.py\` configuration is needed to start running tests.

### What fixtures does pytest-playwright provide?

The main fixtures are \`page\` (a fresh isolated tab per test), \`context\` (the browser context behind it), \`browser\` (shared per run), \`browser_name\`, \`playwright\`, the \`is_chromium\`/\`is_firefox\`/\`is_webkit\` booleans, and two override hooks, \`browser_type_launch_args\` and \`browser_context_args\`, that let you customize launch and context settings like \`base_url\`, viewport, locale, and \`storage_state\` from \`conftest.py\`.

### How do I run pytest-playwright tests in parallel?

Install \`pytest-xdist\` and run \`pytest -n auto\` to distribute tests across all CPU cores. Because the plugin gives every test an isolated browser context, parallel runs do not contaminate each other. Just keep tests self-contained and avoid sharing a mutable \`storage_state\` file across concurrent workers. Each xdist worker runs its own browser process with fresh per-test contexts inside.

### How do I test on multiple browsers with pytest-playwright?

Pass multiple \`--browser\` flags, for example \`pytest --browser chromium --browser firefox --browser webkit\`. Every test runs once per engine. Inside a test, the \`browser_name\` string and the \`is_chromium\`, \`is_firefox\`, and \`is_webkit\` boolean fixtures tell you which engine is active so you can branch on engine-specific behavior when necessary. You can also pin browser defaults in \`pyproject.toml\`.

### How do I handle login with pytest-playwright?

Authenticate once in a session-scoped fixture, then save cookies and local storage with \`context.storage_state(path="auth-state.json")\`. Override the \`browser_context_args\` fixture to inject \`storage_state\` into every test's context, so each test starts already logged in. This avoids logging in through the UI on every test, which is slow and flaky. Read credentials from environment variables and gitignore the state file.

### How do I debug a failing pytest-playwright test?

Set \`PWDEBUG=1 pytest\` to open the Playwright Inspector with a visible browser and step-through debugger. For CI failures, configure \`--tracing retain-on-failure\` and open the resulting \`trace.zip\` with \`playwright show-trace\` to replay the exact run, DOM snapshots, network, and console included. Add \`--screenshot only-on-failure\` and \`--video retain-on-failure\` for quick visual artifacts.

### Should I use pytest-playwright or the Node @playwright/test runner?

Choose based on your team's primary language, both drive the identical browser engine and locator API, so neither is more capable at the browser level. Python teams, especially those with API tests already in pytest, get a single unified suite with \`pytest-playwright\`. TypeScript and frontend-heavy teams get tighter integration and built-in parallelism with \`@playwright/test\`. The browser behavior is the same either way.

## Conclusion

The \`pytest-playwright\` plugin turns pytest into a full-featured browser testing runner with almost no boilerplate. You install two packages, write functions that take the \`page\` fixture, and the plugin handles browser lifecycle, per-test isolation, multi-browser runs, artifact capture, and parallelism for you. Layer in \`browser_context_args\` overrides for base URL and viewport, \`storage_state\` for fast authenticated tests, \`pytest-xdist\` for parallel speed, and the trace viewer for painless debugging, and you have a production-grade suite that scales with your application.

Start today: \`pip install pytest-playwright && playwright install\`, copy the first-test example above, and run it. Then pin your defaults in \`pyproject.toml\` and add a \`storage_state\` login fixture. When you are ready to give your AI coding agent installable pytest and Playwright skills, browse the [QA skills directory](/skills), and keep leveling up with our [pytest best practices guide](/blog/pytest-best-practices-2026).
`,
};
