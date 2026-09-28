import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SeleniumBase Guide: Python Browser Testing with pytest',
  description: 'seleniumbase guide for QA engineers: write pytest browser tests, choose BaseCase or sb fixtures, run CI, reports, UC mode, and debug flakes.',
  date: '2026-09-28',
  category: 'Tutorial',
  content: `
# SeleniumBase Guide: Python Browser Testing with pytest

SeleniumBase is an active Python browser automation framework built on top of Selenium, pytest, and related tooling. The current package release I verified on PyPI is \`4.54.12\`, released on September 25, 2026, with Python \`>=3.10\` listed as the requirement. The project has not been renamed or discontinued. Its current docs still present \`BaseCase\`, the \`sb\` pytest fixture, the \`SB()\` context manager, \`Driver()\`, CDP mode, UC mode, Recorder, dashboards, and pytest reports as supported ways to work.

The direct answer for QA teams: use SeleniumBase when raw Selenium is too repetitive but you still want Selenium-compatible browser automation in Python. It gives you automatic waits, cleaner assertions, a pytest plugin, browser selection flags, screenshots on failure, dashboards, reports, reusable sessions, Recorder workflows, and stealth-oriented modes for specific cases. It is not a reason to skip test design. Bad selectors, unclear assertions, shared state, and CI browser drift can still make a SeleniumBase suite unreliable.

This guide focuses on pytest because that is the main shape most automation engineers will use with AI coding agents such as Claude Code, Cursor, and Copilot. If you are still deciding how Python, pytest, and Selenium fit together, read the [Selenium Python pytest integration complete guide](/blog/selenium-python-pytest-integration-complete-guide). If you need a beginner path before adopting a framework layer, start with the [Selenium Python tutorial 2026](/blog/selenium-python-tutorial-2026).

## Install, Verify, and Pin the Runtime

SeleniumBase installs from PyPI with \`pip install seleniumbase\`. The official package page also advertises optional extras and project links, but for a test repository you should pin the dependency in a constraints file or a lockfile and verify the command-line tool in CI. SeleniumBase exposes both \`seleniumbase\` and \`sbase\` console commands, including helpers such as \`sbase get cft\`, \`sbase get chs\`, \`sbase options\`, and \`sbase recorder\`.

\`\`\`bash
python -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install seleniumbase==4.54.12
sbase options
pytest --version
\`\`\`

Use a modern Python version supported by your organization. PyPI lists Python \`>=3.10\`, and the classifiers include current Python 3 releases. In practice, most CI examples should use Python 3.12 or 3.13 unless your application stack forces a narrower choice. The browser side is just as important: Chrome, Chromium, Chrome for Testing, Firefox, Edge, and Safari all imply different local and CI setup.

| Layer | Recommended control | Reason |
| --- | --- | --- |
| Python | Pin in CI, for example \`3.13\` | Keeps pytest plugins and dependencies stable |
| SeleniumBase | Pin \`seleniumbase==4.54.12\` during adoption | Prevents silent framework changes while tests are being ported |
| Browser | Choose with \`--browser\`, \`--chrome\`, \`--edge\`, or \`--firefox\` | Makes cross-browser failures explicit |
| Browser binary | Use \`sbase get cft\`, \`sbase get chromium\`, or system browser | Avoids driver mismatch surprises |
| Reports | Use \`--dashboard\` and \`--html=report.html\` | Gives reviewers artifacts beyond log text |

For AI-generated test changes, make dependency pinning part of the task. Otherwise an agent can write code that passes on its own machine because a transitive package changed, while your CI worker still uses the previous lockfile.

## BaseCase or sb Fixture

SeleniumBase documents many syntax formats, but pytest teams usually choose between \`BaseCase\` inheritance and the \`sb\` fixture. \`BaseCase\` is a good default when you want SeleniumBase to own setup, teardown, and test methods. The \`sb\` fixture is better when your suite already has pytest fixtures for users, tenants, API clients, database state, or feature flags.

| Format | What it looks like | Best fit | Tradeoff |
| --- | --- | --- | --- |
| \`BaseCase\` | Class inherits \`BaseCase\` | New SeleniumBase suite, simple page tests | Less natural when composing many pytest fixtures |
| \`sb\` fixture | Test function accepts \`sb\` | Existing pytest suite or fixture-heavy tests | Requires passing \`sb\` into helpers |
| \`SB()\` context manager | Plain Python context block | Scripts, one-off checks, non-pytest flows | Pytest reports and dashboard features are not the center |
| \`Driver()\` | Improved raw driver object | Migration from raw Selenium | Some SeleniumBase pytest features are absent |
| CDP or UC modes | Specialized Chromium control | Anti-bot or stealth-sensitive diagnostics | Needs careful ethical and reliability boundaries |

A minimal \`BaseCase\` test looks like this. The \`BaseCase.main(__name__, __file__)\` line lets the file route itself through pytest if someone runs it directly with Python.

\`\`\`python
from seleniumbase import BaseCase

BaseCase.main(__name__, __file__)


class TestDemoPage(BaseCase):
    def test_demo_page_submit_changes_content(self):
        self.open("https://seleniumbase.io/demo_page")
        self.assert_text("Automation Practice", "h3")
        self.assert_element("input#myTextInput")
        self.type("input#myTextInput", "qa engineer")
        self.click("button#myButton")
        self.assert_element("tbody#tbodyId")
        self.assert_no_js_errors()
\`\`\`

The same style with the \`sb\` fixture is more composable. This is the pattern I prefer when an AI coding agent is adding tests to a mature pytest repository, because the test can accept ordinary fixtures next to \`sb\`.

\`\`\`python
from seleniumbase import BaseCase


def test_login_round_trip_uses_visible_state(sb: BaseCase):
    sb.open("https://seleniumbase.io/simple/login")
    sb.type("#username", "demo_user")
    sb.type("#password", "secret_pass")
    sb.click('a:contains("Sign in")')
    sb.assert_exact_text("Welcome!", "h1")
    sb.assert_element("img#image1")
    sb.click_link("Sign out")
    sb.assert_text("signed out", "#top_message")
\`\`\`

What people get wrong: they wrap SeleniumBase calls in extra explicit waits copied from raw Selenium. SeleniumBase methods already wait for visibility and interactability in common actions. Extra sleeps and duplicate waits often hide the actual readiness signal. Prefer a meaningful assertion after the action: text changed, an element appears, a URL contains an expected path, or a user-visible state is present.

## Command-Line Flags That Matter in Real Suites

SeleniumBase's pytest plugin adds CLI options for browser choice, headless mode, dashboard, demo mode, UC mode, recorder mode, reuse-session mode, proxy settings, mobile mode, and more. Official examples include \`--headless\`, \`--browser\`, \`--uc\`, \`--demo\`, \`--dashboard\`, \`--html=report.html\`, \`--rs\` or \`--reuse-session\`, \`--crumbs\`, \`--reruns\`, \`--server\`, \`--port\`, \`--proxy\`, \`--mobile\`, and \`--metrics\`.

| Goal | Command | Notes |
| --- | --- | --- |
| Local visible debugging | \`pytest tests/test_login.py --demo\` | Slows and highlights actions so a human can follow |
| Headless CI run | \`pytest tests --headless --browser=chrome\` | Use a real browser target instead of leaving it implicit |
| Shared browser per worker | \`pytest tests --rs --crumbs\` | Reuses a session but clears cookies between tests |
| SeleniumBase dashboard | \`pytest tests --dashboard --html=report.html\` | Produces \`dashboard.html\` and a pytest HTML report |
| Filter pytest tests | \`pytest tests -k login\` | Native pytest selection, useful for agent debugging |
| UC mode smoke | \`pytest tests/test_guarded.py --uc\` | Avoid mixing with normal functional coverage |

Put common defaults in \`pytest.ini\`, but keep environment-specific flags in CI commands. A local developer may want headed Chrome and demo mode. CI should usually run headless with reports and artifacts.

\`\`\`ini
[pytest]
testpaths = tests
python_files = test_*.py *_test.py *_tests.py
addopts =
    -ra
    --strict-markers
markers =
    smoke: fast browser checks for pull requests
    checkout: payment and order-flow coverage
    guarded: tests that touch bot-sensitive pages
\`\`\`

Then run focused slices without changing source code.

Keep selection conventions boring and stable. A marker such as \`smoke\` should mean "safe for every pull request", not "whatever the last engineer wanted to run quickly." A keyword filter such as \`-k login\` is excellent for diagnosis, but it should not become the permanent CI contract because test names change more often than business risk categories. When an AI coding agent adds tests, ask it to add or reuse a marker only if the marker already has a clear definition in \`pytest.ini\`. That keeps CI behavior reviewable and prevents a useful local debugging filter from becoming a hidden release gate.

\`\`\`bash
pytest tests -m smoke --headless --browser=chrome --dashboard --html=report.html
pytest tests -k login --demo --browser=chrome
pytest tests/test_checkout.py -q --headless --reruns=1 --reruns-delay=1
\`\`\`

Use \`--reruns\` sparingly. A retry can reduce noisy failures during a migration, but it can also normalize a broken wait or an order-dependent fixture. If a test needs retries every day, quarantine it, diagnose it, and remove the retry after the root cause is fixed.

## Assertions That Survive UI Change

SeleniumBase makes browser actions concise, so the main quality lever becomes assertions. A weak test clicks through a page and asserts that the final status code is not an exception. A strong test proves the user-visible state changed and that the application did not quietly produce JavaScript errors.

| Weak pattern | Better SeleniumBase assertion | Why it is stronger |
| --- | --- | --- |
| Click and hope | \`sb.assert_text("Welcome!", "h1")\` | Verifies visible state after the action |
| Compare location immediately | \`sb.assert_url_contains("/account")\` after a visible post-login check | Avoids racing navigation |
| Count elements without context | \`sb.assert_element("div.inventory_list")\` plus product text | Proves the expected region loaded |
| Sleep after every click | \`sb.assert_element('button:contains("Checkout")')\` | Waits for the actual UI contract |
| Ignore frontend errors | \`sb.assert_no_js_errors()\` | Catches client-side regressions that leave DOM checks green |

Here is a pattern that keeps page helpers small and assertions in the test. The helper performs a reusable action, while the test still declares the business outcome.

\`\`\`python
from seleniumbase import BaseCase


class LoginPage:
    def sign_in(self, sb: BaseCase, username: str, password: str) -> None:
        sb.open("https://seleniumbase.io/simple/login")
        sb.type("#username", username)
        sb.type("#password", password)
        sb.click('a:contains("Sign in")')


def test_successful_login_shows_welcome_and_allows_logout(sb: BaseCase):
    LoginPage().sign_in(sb, "demo_user", "secret_pass")

    sb.assert_exact_text("Welcome!", "h1")
    sb.assert_element("img#image1")
    sb.click_link("Sign out")
    sb.assert_text("signed out", "#top_message")
    sb.assert_no_js_errors()
\`\`\`

This shape is agent-friendly. If Cursor or Copilot adds a new test, it can reuse \`LoginPage().sign_in(...)\` but still has to assert the user-facing state that makes that test valuable.

## Reports, Logs, Screenshots, and Dashboards

SeleniumBase creates failure logs in \`latest_logs/\` by default. The reports docs list files such as \`basic_test_info.txt\`, \`page_source.html\`, and \`screenshot.png\` for failures. The \`--dashboard\` flag generates \`dashboard.html\`, and \`--html=report.html\` creates a pytest HTML report. The docs also state that combining dashboard usage with pytest HTML can add dashboard information to the HTML report, and if the paths match, the dashboard can become an advanced HTML report after completion.

A practical CI command for a pull request is:

\`\`\`bash
pytest tests \\
  --headless \\
  --browser=chrome \\
  --dashboard \\
  --html=report.html \\
  --self-contained-html \\
  -m smoke
\`\`\`

The shell line continuations above are written for POSIX shells. If your CI runner is Windows PowerShell, rewrite it as one line or use PowerShell continuation syntax. Do not ask an agent to blindly convert shell snippets across shells without running them.

Here is a GitHub Actions workflow using the current action majors specified for this repository's article standards.

\`\`\`yaml
name: seleniumbase-browser-tests

on:
  pull_request:
  push:
    branches:
    - main

jobs:
  browser-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v7
    - uses: actions/setup-python@v7
      with:
        python-version: '3.13'
        cache: pip
    - name: Install test dependencies
      run: |
        python -m pip install --upgrade pip
        python -m pip install seleniumbase==4.54.12
    - name: Run SeleniumBase smoke tests
      run: |
        pytest tests --headless --browser=chrome --dashboard --html=report.html --self-contained-html -m smoke
    - name: Upload SeleniumBase artifacts
      if: always()
      uses: actions/upload-artifact@v7
      with:
        name: seleniumbase-artifacts-\${{ github.run_id }}
        path: |
          report.html
          dashboard.html
          latest_logs/
\`\`\`

The important part is \`if: always()\` on artifact upload. A failed browser test is exactly when the screenshot, page source, and report matter.

## UC Mode, CDP Mode, and Ethical Boundaries

SeleniumBase UC Mode is designed for stealthier Chromium automation. The UC Mode docs explain that services can detect ChromeDriver while it is connected, and SeleniumBase uses underlying Selenium capabilities to disconnect and reconnect as needed. The docs also warn that UC Mode is detectable in headless mode, so do not combine those options and expect stealth.

For QA teams, UC Mode should be a targeted diagnostic tool, not the default way to test your own application. If your app blocks automation on staging because a bot rule is too aggressive, a UC-mode smoke test can help you identify the integration behavior. But your normal regression suite should test product behavior under normal browsers. Otherwise you risk proving that the workaround works rather than proving that users can complete the workflow.

\`\`\`python
from seleniumbase import SB


def main() -> None:
    with SB(uc=True, test=True, locale="en") as sb:
        sb.open("https://seleniumbase.io/simple/login")
        sb.type("#username", "demo_user")
        sb.type("#password", "secret_pass")
        sb.click('a:contains("Sign in")')
        sb.assert_exact_text("Welcome!", "h1")


if __name__ == "__main__":
    main()
\`\`\`

That script is useful as a one-off check, but pytest remains better for suite reporting. Keep UC tests marked separately:

\`\`\`python
import pytest
from seleniumbase import BaseCase


@pytest.mark.guarded
def test_guarded_login_page_loads_in_uc_mode(sb: BaseCase):
    sb.open("https://seleniumbase.io/simple/login")
    sb.assert_element("#username")
    sb.assert_element("#password")
\`\`\`

Then run them intentionally:

\`\`\`bash
pytest tests -m guarded --uc --browser=chrome --dashboard --html=guarded-report.html
\`\`\`

## Recorder Mode and Agent-Assisted Test Creation

SeleniumBase includes Recorder tooling that can record browser actions and export automation scripts. Official docs reference \`sbase mkfile TEST_NAME.py --rec\`, \`sbase recorder\`, and related commands. Recorder output is useful for discovery, especially when a product flow is unfamiliar, but it should not be merged unreviewed. Recorded scripts tend to reflect every click and incidental selector, while durable tests express intent.

Use this workflow with an AI coding agent:

| Stage | Human or tool action | Merge criteria |
| --- | --- | --- |
| Record | Capture the happy path with Recorder | Output is treated as draft code |
| Refactor | Agent extracts page helpers and removes incidental waits | Selectors are readable and stable |
| Assert | QA engineer adds domain assertions | Test proves state change, not only navigation |
| Run | CI executes headless with report artifacts | Failure evidence is uploaded |
| Review | Diff is checked for overbroad selectors and secrets | No credentials, no hardcoded personal data |

An agent prompt that works well: "Convert this recorded SeleniumBase script into pytest using the sb fixture. Keep the login helper small. Replace sleeps with visible assertions. Add one negative assertion that proves the failure banner appears for invalid credentials." That prompt names the design, not just the syntax.

## A Real Failure Mode: Passing Locally, Failing in CI

A common SeleniumBase failure goes like this: tests pass on a laptop in visible Chrome, but CI fails with \`ElementNotVisibleException\` or a timeout on the first click. The cause is rarely "SeleniumBase is flaky." More often it is one of these differences.

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Element exists but cannot be clicked | CI viewport is smaller than local browser | Set \`--window-size=1366,768\` or design a mobile-specific assertion |
| Login fails only in CI | Environment URL, credentials, or bot rule differs | Print the target base URL safely and mark guarded tests separately |
| Reports missing after failure | Artifact upload skipped because job failed | Use \`if: always()\` for report upload |
| Firefox fails but Chrome passes | Browser-specific UI or timing path | Add browser-specific project decision, do not hide it with retries |
| UC mode works headed but fails headless | UC docs warn against headless stealth assumptions | Run UC headed where appropriate or avoid UC for CI gates |

The diagnosis sequence should be mechanical. First, upload \`latest_logs/\`, \`dashboard.html\`, and \`report.html\`. Second, inspect \`page_source.html\` and screenshot before changing selectors. Third, reproduce the same command locally, including \`--headless\`, \`--browser\`, and \`--window-size\`. Fourth, change the assertion to wait for the actual user-facing state instead of adding a sleep.

\`\`\`bash
pytest tests/test_login.py \\
  --headless \\
  --browser=chrome \\
  --window-size=1366,768 \\
  --dashboard \\
  --html=report.html \\
  -vv
\`\`\`

If that command passes locally but fails in CI, the remaining suspects are environment, browser binary, network access, secrets, or service-side rules. At that point, changing SeleniumBase code is usually the wrong first move.

## Frequently Asked Questions

### Is SeleniumBase a replacement for raw Selenium?

SeleniumBase can replace much of the repetitive raw Selenium code in a pytest suite, especially waits, element lookup boilerplate, driver setup, screenshots, and reports. It still uses Selenium and WebDriver concepts underneath, so browser behavior, grid configuration, and selector quality still matter. Treat it as a productive test framework layer, not a magic browser. Teams that already have raw Selenium tests can migrate gradually by introducing \`Driver()\`, \`BaseCase\`, or the \`sb\` fixture in new tests first.

### Should I use BaseCase or the sb fixture?

Use \`BaseCase\` when starting a fresh SeleniumBase suite and you want a clear class-based style. Use the \`sb\` fixture when your tests already depend on pytest fixtures for users, data setup, APIs, or feature flags. The fixture style is usually easier for mature automation repositories because it composes with existing pytest patterns. The most important choice is consistency: do not mix every supported SeleniumBase syntax in the same folder unless there is a clear reason.

### Can SeleniumBase UC mode bypass all bot detection?

No. UC Mode is a specialized Chromium automation mode that can reduce some automation signals, and SeleniumBase documents how it disconnects and reconnects ChromeDriver for stealth-sensitive interactions. It is not a universal guarantee, and the docs warn that UC Mode is detectable in headless mode. QA teams should use it for targeted diagnostics or guarded flows, not as the default regression path. For your own application, normal browser tests are usually the more trustworthy signal.

### What artifacts should CI save for SeleniumBase failures?

Always save \`latest_logs/\`, \`report.html\`, and \`dashboard.html\` when those files exist. Failure logs can include screenshots, page source, and basic test information, which are far more useful than a timeout stack trace alone. In GitHub Actions, put artifact upload behind \`if: always()\` so failed test jobs still publish evidence. If your suite runs in parallel, name artifacts with the run ID or matrix browser so reviewers can match failures to the correct environment.
`,
};
