import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Python Pytest Integration Complete Guide 2026',
  description:
    'Master Selenium with pytest in 2026. Cover fixtures, parametrize, page objects, parallel runs with pytest-xdist, screenshots on failure, and Grid integration.',
  date: '2026-05-15',
  category: 'Reference',
  content: `
# Selenium Python Pytest Integration Complete Guide 2026

Pytest is the de facto Python testing framework, and Selenium is the most-used browser automation library. Combining them yields a stack that scales from one developer testing one component to enterprise test suites running thousands of cases in parallel against a Grid. The combination works well because both tools embrace fixtures, parametrization, and plain-Python patterns rather than DSLs or magic configuration.

This guide covers Selenium plus pytest end-to-end in 2026. We walk through project layout, fixtures for driver lifecycle, parametrize for cross-browser runs, page object model with Python idioms, parallel execution with pytest-xdist, screenshot-on-failure hooks, integration with Selenium Grid, retry policies for flaky tests, Allure reporting, and CI patterns. For BiDi events see [Selenium BiDi protocol guide](/blog/selenium-bidirectional-bidi-protocol-guide). Browse the [skills directory](/skills) for Selenium AI agent skills.

## Why pytest plus Selenium

Three reasons. First, fixtures. pytest's fixture system is the ideal way to manage WebDriver lifecycle: scope, teardown, parameter injection. Second, parametrize. Run the same test against multiple browsers and configurations with one decorator. Third, ecosystem. pytest-xdist for parallel, pytest-rerunfailures for retries, pytest-html for reports, allure-pytest for richer reports. All composable.

| Feature | pytest plus Selenium | unittest plus Selenium |
|---|---|---|
| Fixture system | Native, composable | Manual setUp/tearDown |
| Parametrize | First-class | Custom decorator |
| Parallel | pytest-xdist | Need external runner |
| Plugins | Rich ecosystem | Limited |
| Verbose output | Better | Basic |

## Project Layout

A typical project structure that scales:

\`\`\`
selenium-tests/
├── pyproject.toml
├── pytest.ini
├── conftest.py              # Project-wide fixtures
├── tests/
│   ├── conftest.py          # Test-specific fixtures
│   ├── test_login.py
│   ├── test_search.py
│   └── test_checkout.py
├── pages/                   # Page objects
│   ├── __init__.py
│   ├── base_page.py
│   ├── login_page.py
│   └── search_page.py
├── data/                    # Test data
│   └── users.json
└── requirements.txt
\`\`\`

\`conftest.py\` files define fixtures available to tests in their directory. Project-wide conftest at root, more specific in tests/.

## Dependencies

\`\`\`text
# requirements.txt
selenium==4.27.0
pytest==8.3.4
pytest-xdist==3.6.0
pytest-rerunfailures==14.0
pytest-html==4.1.1
allure-pytest==2.13.5
\`\`\`

Install with \`pip install -r requirements.txt\`. Pin versions for CI reproducibility.

## WebDriver Fixture

The fundamental fixture creates a driver and yields it to the test, then cleans up.

\`\`\`python
# conftest.py
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

def pytest_addoption(parser):
    parser.addoption(
        "--browser",
        action="store",
        default="chrome",
        choices=["chrome", "firefox", "edge"],
        help="Browser to run tests against",
    )
    parser.addoption(
        "--headless",
        action="store_true",
        default=False,
        help="Run browser in headless mode",
    )
    parser.addoption(
        "--grid-url",
        action="store",
        default=None,
        help="Grid URL for remote execution",
    )

@pytest.fixture(scope="function")
def driver(request):
    browser = request.config.getoption("--browser")
    headless = request.config.getoption("--headless")
    grid_url = request.config.getoption("--grid-url")

    if browser == "chrome":
        opts = ChromeOptions()
        if headless:
            opts.add_argument("--headless=new")
        opts.add_argument("--window-size=1920,1080")
    elif browser == "firefox":
        opts = FirefoxOptions()
        if headless:
            opts.add_argument("-headless")
    else:
        raise ValueError(f"Unknown browser: {browser}")

    if grid_url:
        driver = webdriver.Remote(command_executor=grid_url, options=opts)
    elif browser == "chrome":
        driver = webdriver.Chrome(options=opts)
    elif browser == "firefox":
        driver = webdriver.Firefox(options=opts)

    driver.implicitly_wait(5)
    yield driver
    driver.quit()
\`\`\`

Tests receive the driver as a parameter:

\`\`\`python
# tests/test_login.py
def test_login_success(driver):
    driver.get("https://app.example.com/login")
    driver.find_element(By.ID, "email").send_keys("user@example.com")
    driver.find_element(By.ID, "password").send_keys("demo")
    driver.find_element(By.ID, "submit").click()
    assert "Dashboard" in driver.title
\`\`\`

Run:

\`\`\`bash
pytest tests/ --browser=chrome --headless
pytest tests/ --browser=firefox
pytest tests/ --grid-url=http://grid.example.com:4444 --browser=chrome
\`\`\`

## Parametrize for Cross-Browser

To run the same test on multiple browsers without CLI changes use parametrize.

\`\`\`python
import pytest

@pytest.mark.parametrize("browser", ["chrome", "firefox", "edge"])
def test_cross_browser_login(browser, request):
    # Override the browser fixture via marker
    pass

# Cleaner: parametrize the fixture itself
@pytest.fixture(params=["chrome", "firefox", "edge"])
def driver_multi(request):
    browser = request.param
    # ... same setup as above
    driver = create_driver(browser)
    yield driver
    driver.quit()

def test_login_all_browsers(driver_multi):
    driver_multi.get("https://app.example.com/login")
    # ... assertions
\`\`\`

\`driver_multi\` runs the test once per browser. If you have 10 tests, that's 30 runs. Useful for cross-browser regression suites.

## Page Object Model

Python's class system makes page objects natural.

\`\`\`python
# pages/base_page.py
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

class BasePage:
    def __init__(self, driver, timeout=10):
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def find(self, locator):
        return self.wait.until(EC.presence_of_element_located(locator))

    def click(self, locator):
        self.wait.until(EC.element_to_be_clickable(locator)).click()

    def type(self, locator, text):
        el = self.find(locator)
        el.clear()
        el.send_keys(text)


# pages/login_page.py
from .base_page import BasePage
from selenium.webdriver.common.by import By

class LoginPage(BasePage):
    URL = "https://app.example.com/login"
    EMAIL = (By.ID, "email")
    PASSWORD = (By.ID, "password")
    SUBMIT = (By.ID, "submit")
    ERROR = (By.CSS_SELECTOR, ".error")

    def navigate(self):
        self.driver.get(self.URL)
        return self

    def login(self, email, password):
        self.type(self.EMAIL, email)
        self.type(self.PASSWORD, password)
        self.click(self.SUBMIT)
        return self

    def get_error(self):
        return self.find(self.ERROR).text


# tests/test_login.py
from pages.login_page import LoginPage

def test_login_success(driver):
    page = LoginPage(driver).navigate().login("user@example.com", "demo")
    assert "Dashboard" in driver.title

def test_login_invalid(driver):
    page = LoginPage(driver).navigate().login("bad@example.com", "wrong")
    assert "Invalid credentials" in page.get_error()
\`\`\`

The fluent return-self pattern works well in Python. Page methods return self for chaining or return the next page object for cross-page workflows.

## Parallel Execution

pytest-xdist runs tests across multiple processes.

\`\`\`bash
# Run tests on 4 workers
pytest tests/ -n 4

# Auto-detect CPU count
pytest tests/ -n auto

# Distribute by test file
pytest tests/ -n 4 --dist=loadfile

# Distribute by test scope
pytest tests/ -n 4 --dist=loadscope
\`\`\`

For Selenium tests with Grid, parallel execution dramatically reduces wall time. A 100-test suite that runs in 50 minutes sequentially completes in ~7 minutes with 8 parallel workers (assuming Grid has capacity).

| Workers | Total Suite Time | Throughput |
|---|---|---|
| 1 | 50 min | 2 tests/min |
| 4 | 13 min | 7.7 tests/min |
| 8 | 7 min | 14.3 tests/min |
| 16 | 4 min | 25 tests/min |

Grid must scale to match. If you have 16 pytest workers but only 4 Grid nodes, tests queue up.

## Screenshot on Failure

A common pytest hook captures screenshots when a test fails.

\`\`\`python
# conftest.py
import pytest
import os
from datetime import datetime

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()

    if report.when == "call" and report.failed:
        driver = item.funcargs.get("driver") or item.funcargs.get("driver_multi")
        if driver:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            filename = f"screenshots/{item.name}_{timestamp}.png"
            os.makedirs("screenshots", exist_ok=True)
            driver.save_screenshot(filename)
            print(f"Screenshot saved: {filename}")

            # Attach to Allure if used
            try:
                import allure
                allure.attach.file(filename, name="failure", attachment_type=allure.attachment_type.PNG)
            except ImportError:
                pass
\`\`\`

Every test failure produces a PNG. In CI, upload as artifacts for review.

## Retry Policies

Flaky tests are a fact of Selenium life. Don't retry indefinitely, but a single retry catches transient issues.

\`\`\`bash
pytest tests/ --reruns 2 --reruns-delay 1
\`\`\`

Mark specific tests as flaky to apply retries only there:

\`\`\`python
@pytest.mark.flaky(reruns=3, reruns_delay=2)
def test_known_flaky():
    pass
\`\`\`

Track which tests need retries and fix them. The retry plugin should be a safety net, not a permanent solution.

## Test Data and Fixtures

Combine pytest fixtures with JSON test data.

\`\`\`python
# conftest.py
import json
import pytest

@pytest.fixture(scope="session")
def test_users():
    with open("data/users.json") as f:
        return json.load(f)

@pytest.fixture
def standard_user(test_users):
    return test_users["standard"]

@pytest.fixture
def admin_user(test_users):
    return test_users["admin"]


# tests/test_login.py
def test_standard_user_login(driver, standard_user):
    LoginPage(driver).navigate().login(standard_user["email"], standard_user["password"])

def test_admin_user_login(driver, admin_user):
    LoginPage(driver).navigate().login(admin_user["email"], admin_user["password"])
\`\`\`

Session-scoped data loads once per test session. Function-scoped fixtures wrap it for test-specific access.

## Allure Reporting

For richer test reports beyond pytest-html, use Allure.

\`\`\`bash
pytest tests/ --alluredir=./allure-results
allure serve ./allure-results
\`\`\`

In your tests, decorate for Allure-specific metadata:

\`\`\`python
import allure

@allure.feature("Login")
@allure.story("Standard user login")
@allure.severity(allure.severity_level.CRITICAL)
def test_login_success(driver, standard_user):
    with allure.step("Navigate to login"):
        LoginPage(driver).navigate()
    with allure.step("Submit credentials"):
        LoginPage(driver).login(standard_user["email"], standard_user["password"])
    with allure.step("Verify dashboard"):
        assert "Dashboard" in driver.title
\`\`\`

Allure produces a static HTML site with rich test exploration. Many teams publish this as the canonical test report.

## CI Integration

GitHub Actions pattern:

\`\`\`yaml
name: Selenium Tests

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      selenium-hub:
        image: selenium/hub:4.27.0
        ports: ['4444:4444', '4442:4442', '4443:4443']
      chrome-node:
        image: selenium/node-chrome:4.27.0
        env:
          SE_EVENT_BUS_HOST: selenium-hub
          SE_EVENT_BUS_PUBLISH_PORT: 4442
          SE_EVENT_BUS_SUBSCRIBE_PORT: 4443

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - run: pip install -r requirements.txt

      - name: Run tests
        run: |
          pytest tests/ \\
            --grid-url=http://localhost:4444 \\
            --browser=chrome \\
            -n 4 \\
            --reruns 1 \\
            --alluredir=./allure-results

      - name: Upload Allure results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: allure-results
          path: allure-results

      - name: Upload screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: screenshots
          path: screenshots
\`\`\`

This pattern runs 4 parallel workers against a Grid with one retry, produces Allure results, and uploads screenshots on failure.

## Common Issues

Five gotchas:

1. **ImplicitlyWait plus ExplicitlyWait conflict.** Don't mix. Choose explicit waits via WebDriverWait.
2. **Fixture scope misuse.** Function-scope driver fixtures create a new browser per test. Use module or session scope if startup overhead matters and tests don't pollute each other.
3. **pytest-xdist global state.** Tests sharing module-level globals break under xdist. Move state to fixtures.
4. **Screenshot fails if driver crashed.** Wrap in try/except.
5. **Forgotten driver.quit() leaks browsers.** Always use yield-based fixtures with teardown.

## Conclusion

Pytest plus Selenium is the lightest-weight production-grade web test stack for Python teams in 2026. Fixtures handle driver lifecycle cleanly, parametrize covers cross-browser easily, xdist scales parallel execution, and the plugin ecosystem covers reporting and retries. For new Python projects this is the default choice.

Browse the [skills directory](/skills) for Selenium AI agent skills. Read [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide) for distributed test setups. The next test you write should use this pattern.
`,
};
