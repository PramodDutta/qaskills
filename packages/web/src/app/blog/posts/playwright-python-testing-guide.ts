import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright with Python: Complete Testing Guide for 2026',
  description:
    'Master Playwright testing with Python. Covers pip install, sync vs async API, locators, auto-waiting, pytest-playwright fixtures, tracing, screenshots, API testing, codegen, and CI/CD integration.',
  date: '2026-05-18',
  category: 'Tutorial',
  content: `
Playwright for Python brings the power of Microsoft's browser automation framework to the Python ecosystem. With auto-waiting, powerful locators, built-in tracing, and first-class pytest integration through pytest-playwright, it offers a modern alternative to Selenium that eliminates entire categories of flaky tests. This guide covers everything you need to build production-grade test suites with Playwright and Python in 2026.

## Key Takeaways

- Playwright's auto-waiting eliminates the need for explicit waits, drastically reducing flaky tests compared to Selenium
- The sync API is simpler for most test automation needs, while the async API unlocks performance for advanced use cases
- pytest-playwright provides fixtures for browser, context, and page that handle lifecycle management automatically
- Playwright's trace viewer is the most powerful debugging tool available in any browser automation framework
- Codegen generates working test code by recording your browser interactions, accelerating test creation
- API testing with Playwright's request context lets you combine UI and API tests in a single framework
- Multi-browser testing across Chromium, Firefox, and WebKit requires zero code changes

---

## Setting Up Playwright with Python

### Installation

\`\`\`bash
pip install playwright pytest-playwright
playwright install
\`\`\`

The \`playwright install\` command downloads browser binaries for Chromium, Firefox, and WebKit. If you only need specific browsers:

\`\`\`bash
playwright install chromium
playwright install firefox
\`\`\`

### Verifying the Installation

\`\`\`python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)
    page = browser.new_page()
    page.goto("https://example.com")
    print(f"Title: {page.title()}")
    browser.close()
\`\`\`

### Project Structure

\`\`\`
playwright-python-project/
  pages/                # Page Object classes
    __init__.py
    base_page.py
    login_page.py
    dashboard_page.py
  tests/                # Test files
    __init__.py
    conftest.py         # Shared fixtures
    test_login.py
    test_dashboard.py
    test_api.py
  data/                 # Test data
    users.json
  pytest.ini            # pytest configuration
  requirements.txt
\`\`\`

For AI coding agents, install a Playwright Python skill for best practices:

\`\`\`bash
npx @qaskills/cli add playwright-python-testing
\`\`\`

---

## Sync vs Async API

Playwright for Python provides two APIs. The synchronous API is simpler and recommended for most testing scenarios. The asynchronous API is useful when you need concurrent operations.

### Synchronous API

\`\`\`python
from playwright.sync_api import sync_playwright

def test_homepage():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("https://example.com")
        assert page.title() == "Example Domain"
        browser.close()
\`\`\`

### Asynchronous API

\`\`\`python
import asyncio
from playwright.async_api import async_playwright

async def test_homepage_async():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("https://example.com")
        title = await page.title()
        assert title == "Example Domain"
        await browser.close()

asyncio.run(test_homepage_async())
\`\`\`

### When to Use Each

Use the **sync API** for standard test automation. It is easier to read, debug, and maintain. Use the **async API** when you need to run operations concurrently, such as monitoring multiple pages simultaneously or building a web scraper that processes pages in parallel.

With pytest-playwright, the sync API is the default and integrates seamlessly with pytest fixtures.

---

## Locators and Auto-Waiting

Playwright's locator system is fundamentally different from Selenium's. Locators are lazy -- they do not query the DOM until an action is performed. And every action automatically waits for the element to be actionable (visible, enabled, stable) before proceeding.

### Built-in Locators

\`\`\`python
# By role (recommended -- tests accessibility too)
page.get_by_role("button", name="Submit")
page.get_by_role("heading", name="Welcome")
page.get_by_role("link", name="Learn more")
page.get_by_role("textbox", name="Email")

# By label (for form inputs)
page.get_by_label("Email address")
page.get_by_label("Password")

# By placeholder
page.get_by_placeholder("Enter your email")

# By text
page.get_by_text("Welcome back")
page.get_by_text("Sign up", exact=True)

# By alt text (images)
page.get_by_alt_text("Company logo")

# By title attribute
page.get_by_title("Close dialog")

# By test ID
page.get_by_test_id("submit-button")
page.get_by_test_id("user-card")
\`\`\`

### CSS and XPath Selectors

\`\`\`python
# CSS selector
page.locator("[data-testid='product-card']")
page.locator("css=input[type='email']")

# XPath selector
page.locator("xpath=//button[contains(text(), 'Submit')]")
\`\`\`

### Locator Filtering

\`\`\`python
# Filter by text
page.get_by_role("listitem").filter(has_text="Python")

# Filter by nested locator
page.get_by_role("listitem").filter(
    has=page.get_by_role("button", name="Delete")
)

# Chain locators
page.locator("[data-testid='user-card']").first
page.locator("[data-testid='user-card']").nth(2)
page.locator("[data-testid='user-card']").last
\`\`\`

### Auto-Waiting in Action

\`\`\`python
# Playwright automatically waits for the button to be visible,
# enabled, and stable before clicking. No explicit wait needed.
page.get_by_role("button", name="Submit").click()

# For text input, Playwright waits for the field to be visible and editable
page.get_by_label("Email").fill("user@example.com")

# Assertions also auto-wait with configurable timeout
from playwright.sync_api import expect

expect(page.get_by_test_id("success-message")).to_be_visible()
expect(page.get_by_test_id("loading-spinner")).to_be_hidden()
expect(page.get_by_role("heading")).to_have_text("Dashboard")
\`\`\`

This auto-waiting behavior is the single biggest improvement over Selenium. You never need to write \`WebDriverWait\` or \`expected_conditions\` -- Playwright handles it all internally.

---

## pytest-playwright Fixtures

The pytest-playwright plugin provides fixtures that manage the browser lifecycle automatically.

### Built-in Fixtures

\`\`\`python
# tests/test_example.py

def test_basic_navigation(page):
    """The 'page' fixture is provided by pytest-playwright.
    It gives you a fresh page in a new browser context."""
    page.goto("https://example.com")
    assert page.title() == "Example Domain"


def test_with_browser_context(context):
    """The 'context' fixture gives you a browser context.
    You can create multiple pages from it."""
    page1 = context.new_page()
    page2 = context.new_page()

    page1.goto("https://example.com")
    page2.goto("https://playwright.dev")

    assert "Example" in page1.title()
    assert "Playwright" in page2.title()


def test_with_browser(browser):
    """The 'browser' fixture gives you the browser instance.
    Create contexts with custom settings."""
    context = browser.new_context(
        viewport={"width": 375, "height": 667},
        user_agent="Custom Agent",
    )
    page = context.new_page()
    page.goto("https://example.com")
    context.close()
\`\`\`

### Custom Fixtures in conftest.py

\`\`\`python
# tests/conftest.py
import pytest
from playwright.sync_api import Page, BrowserContext


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "viewport": {"width": 1920, "height": 1080},
        "ignore_https_errors": True,
    }


@pytest.fixture
def authenticated_page(page: Page) -> Page:
    """Fixture that provides a page with an authenticated session."""
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email").fill("test@example.com")
    page.get_by_label("Password").fill("password123")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")
    return page


@pytest.fixture
def mobile_page(browser):
    """Fixture for mobile viewport testing."""
    context = browser.new_context(
        viewport={"width": 375, "height": 667},
        is_mobile=True,
        has_touch=True,
    )
    page = context.new_page()
    yield page
    context.close()
\`\`\`

### Running Tests

\`\`\`bash
# Run all tests
pytest tests/ -v

# Run with specific browser
pytest tests/ --browser chromium
pytest tests/ --browser firefox
pytest tests/ --browser webkit

# Run on all browsers
pytest tests/ --browser chromium --browser firefox --browser webkit

# Run headed (visible browser)
pytest tests/ --headed

# Run in slow motion for debugging
pytest tests/ --headed --slowmo 500
\`\`\`

---

## Assertions with expect()

Playwright provides a rich assertion library that auto-waits for conditions to be met.

### Page Assertions

\`\`\`python
from playwright.sync_api import expect

# URL assertions
expect(page).to_have_url("https://example.com/dashboard")
expect(page).to_have_url("**/dashboard")  # Glob pattern

# Title
expect(page).to_have_title("Dashboard - My App")
expect(page).to_have_title("Dashboard", exact=False)
\`\`\`

### Locator Assertions

\`\`\`python
submit_btn = page.get_by_role("button", name="Submit")

# Visibility
expect(submit_btn).to_be_visible()
expect(submit_btn).to_be_hidden()

# Enabled/Disabled
expect(submit_btn).to_be_enabled()
expect(submit_btn).to_be_disabled()

# Text content
expect(page.get_by_test_id("heading")).to_have_text("Welcome")
expect(page.get_by_test_id("heading")).to_contain_text("Welcome")

# Attributes
expect(page.get_by_test_id("input")).to_have_attribute("placeholder", "Enter email")
expect(page.get_by_test_id("link")).to_have_attribute("href", "/about")

# CSS class
expect(page.get_by_test_id("card")).to_have_class("active")

# Count
expect(page.get_by_test_id("list-item")).to_have_count(5)

# Value (for inputs)
expect(page.get_by_label("Name")).to_have_value("John Doe")

# Checked state
expect(page.get_by_role("checkbox")).to_be_checked()
expect(page.get_by_role("checkbox")).not_to_be_checked()
\`\`\`

### Custom Timeout

\`\`\`python
# Override the default 5-second timeout for a specific assertion
expect(page.get_by_test_id("slow-content")).to_be_visible(timeout=30000)
\`\`\`

---

## Page Object Model with Playwright Python

### Base Page

\`\`\`python
# pages/base_page.py
from playwright.sync_api import Page, expect


class BasePage:
    def __init__(self, page: Page):
        self.page = page

    def navigate(self, path: str):
        self.page.goto(f"http://localhost:3000{path}")

    def get_title(self) -> str:
        return self.page.title()

    def wait_for_navigation(self, url_pattern: str):
        self.page.wait_for_url(url_pattern)

    def take_screenshot(self, name: str):
        self.page.screenshot(path=f"screenshots/{name}.png")
\`\`\`

### Login Page

\`\`\`python
# pages/login_page.py
from playwright.sync_api import Page, expect
from pages.base_page import BasePage


class LoginPage(BasePage):
    def __init__(self, page: Page):
        super().__init__(page)
        self.email_input = page.get_by_label("Email")
        self.password_input = page.get_by_label("Password")
        self.login_button = page.get_by_role("button", name="Sign in")
        self.error_message = page.get_by_test_id("error-message")

    def open(self):
        self.navigate("/login")
        return self

    def login(self, email: str, password: str):
        self.email_input.fill(email)
        self.password_input.fill(password)
        self.login_button.click()
        return self

    def assert_error_visible(self, message: str):
        expect(self.error_message).to_be_visible()
        expect(self.error_message).to_contain_text(message)

    def assert_login_button_disabled(self):
        expect(self.login_button).to_be_disabled()
\`\`\`

### Using Page Objects in Tests

\`\`\`python
# tests/test_login.py
import pytest
from pages.login_page import LoginPage


class TestLogin:
    def test_successful_login(self, page):
        login_page = LoginPage(page)
        login_page.open().login("admin@example.com", "password123")

        page.wait_for_url("**/dashboard")
        assert "Dashboard" in page.title()

    def test_invalid_credentials(self, page):
        login_page = LoginPage(page)
        login_page.open().login("wrong@example.com", "wrongpass")
        login_page.assert_error_visible("Invalid email or password")

    @pytest.mark.parametrize(
        "email,password,error",
        [
            ("", "pass123", "Email is required"),
            ("user@example.com", "", "Password is required"),
        ],
    )
    def test_validation(self, page, email, password, error):
        login_page = LoginPage(page)
        login_page.open().login(email, password)
        login_page.assert_error_visible(error)
\`\`\`

---

## Tracing and Debugging

Playwright's trace viewer is one of its most valuable features. It records every action, network request, and DOM snapshot during test execution, letting you replay the entire test with full visibility.

### Enabling Traces

\`\`\`python
# In conftest.py
import pytest
from playwright.sync_api import BrowserContext


@pytest.fixture
def context(context: BrowserContext):
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    yield context
    context.tracing.stop(path="traces/trace.zip")
\`\`\`

### Viewing Traces

\`\`\`bash
playwright show-trace traces/trace.zip
\`\`\`

The trace viewer opens in a browser window showing a timeline of every action, DOM snapshots at each step, network requests and responses, and console logs.

### Conditional Tracing (On Failure Only)

\`\`\`python
@pytest.fixture
def context(context: BrowserContext, request):
    context.tracing.start(screenshots=True, snapshots=True)
    yield context
    if request.node.rep_call and request.node.rep_call.failed:
        trace_path = f"traces/{request.node.name}.zip"
        context.tracing.stop(path=trace_path)
    else:
        context.tracing.stop()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)
\`\`\`

### Screenshots

\`\`\`python
# Full page screenshot
page.screenshot(path="screenshots/full_page.png", full_page=True)

# Element screenshot
page.get_by_test_id("chart").screenshot(path="screenshots/chart.png")

# Screenshot with clip region
page.screenshot(
    path="screenshots/header.png",
    clip={"x": 0, "y": 0, "width": 1920, "height": 200},
)
\`\`\`

### Video Recording

\`\`\`python
@pytest.fixture(scope="session")
def browser_context_args(browser_context_args):
    return {
        **browser_context_args,
        "record_video_dir": "videos/",
        "record_video_size": {"width": 1280, "height": 720},
    }
\`\`\`

---

## API Testing with Playwright

Playwright includes a built-in API testing client that shares authentication state with browser tests.

### Standalone API Tests

\`\`\`python
from playwright.sync_api import APIRequestContext


def test_create_user(request_context: APIRequestContext):
    response = request_context.post(
        "http://localhost:3000/api/users",
        data={
            "name": "Jane Doe",
            "email": "jane@example.com",
        },
    )
    assert response.status == 201

    body = response.json()
    assert body["name"] == "Jane Doe"
    assert body["email"] == "jane@example.com"
    assert "id" in body


def test_get_users(request_context: APIRequestContext):
    response = request_context.get("http://localhost:3000/api/users")
    assert response.status == 200

    users = response.json()
    assert len(users) > 0


def test_delete_user(request_context: APIRequestContext):
    # Create a user first
    create_response = request_context.post(
        "http://localhost:3000/api/users",
        data={"name": "Temp User", "email": "temp@example.com"},
    )
    user_id = create_response.json()["id"]

    # Delete the user
    delete_response = request_context.delete(
        f"http://localhost:3000/api/users/{user_id}"
    )
    assert delete_response.status == 204
\`\`\`

### Combining API and UI Tests

\`\`\`python
def test_api_created_data_appears_in_ui(page, request_context):
    # Create data via API
    response = request_context.post(
        "http://localhost:3000/api/products",
        data={"name": "Test Product", "price": 29.99},
    )
    product_id = response.json()["id"]

    # Verify in UI
    page.goto("http://localhost:3000/products")
    expect(page.get_by_text("Test Product")).to_be_visible()

    # Cleanup via API
    request_context.delete(f"http://localhost:3000/api/products/{product_id}")
\`\`\`

---

## Codegen: Recording Tests

Playwright's codegen tool records your browser interactions and generates working test code.

### Using Codegen

\`\`\`bash
# Open codegen targeting your app
playwright codegen http://localhost:3000

# Generate code in Python
playwright codegen --target python http://localhost:3000

# Generate with a specific viewport
playwright codegen --viewport-size "375,667" http://localhost:3000

# Generate with device emulation
playwright codegen --device "iPhone 13" http://localhost:3000
\`\`\`

Codegen opens two windows: the browser where you interact with the application, and an inspector window showing the generated code. Every click, type, and navigation is recorded as Playwright Python code that you can copy into your test files.

### Tips for Effective Codegen

1. Perform the user flow you want to test step by step
2. Copy the generated code into a test file
3. Replace hardcoded selectors with page object references
4. Add meaningful assertions (codegen generates basic ones but you should add more)
5. Parameterize test data

---

## Network Interception

\`\`\`python
# Mock an API response
def test_with_mocked_api(page):
    page.route(
        "**/api/products",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='[{"id": 1, "name": "Mocked Product", "price": 9.99}]',
        ),
    )

    page.goto("http://localhost:3000/products")
    expect(page.get_by_text("Mocked Product")).to_be_visible()


# Modify request headers
def test_with_custom_headers(page):
    def add_auth_header(route):
        headers = {**route.request.headers, "Authorization": "Bearer test-token"}
        route.continue_(headers=headers)

    page.route("**/*", add_auth_header)
    page.goto("http://localhost:3000/dashboard")


# Abort specific requests (block images for faster tests)
def test_without_images(page):
    page.route("**/*.{png,jpg,jpeg,gif,svg}", lambda route: route.abort())
    page.goto("http://localhost:3000")


# Wait for a specific network response
def test_wait_for_api(page):
    with page.expect_response("**/api/data") as response_info:
        page.goto("http://localhost:3000/data")

    response = response_info.value
    assert response.status == 200
    data = response.json()
    assert len(data) > 0
\`\`\`

---

## Multi-Browser and Device Testing

### Running Across Browsers

\`\`\`bash
pytest tests/ --browser chromium --browser firefox --browser webkit
\`\`\`

### Device Emulation

\`\`\`python
from playwright.sync_api import sync_playwright

def test_mobile_layout():
    with sync_playwright() as p:
        iphone = p.devices["iPhone 13"]
        browser = p.webkit.launch()
        context = browser.new_context(**iphone)
        page = context.new_page()
        page.goto("http://localhost:3000")

        # Mobile menu should be visible
        expect(page.get_by_test_id("mobile-menu")).to_be_visible()
        expect(page.get_by_test_id("desktop-nav")).to_be_hidden()

        context.close()
        browser.close()
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: Playwright Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          playwright install --with-deps chromium

      - name: Start application
        run: npm start &

      - name: Run tests
        run: pytest tests/ -v --browser chromium

      - name: Upload traces on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: traces/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: screenshots
          path: screenshots/
\`\`\`

### Docker

\`\`\`dockerfile
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
CMD ["pytest", "tests/", "-v"]
\`\`\`

---

## Advanced Patterns

### Authentication State Reuse

\`\`\`python
# Save authentication state
def test_save_auth_state(page):
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email").fill("admin@example.com")
    page.get_by_label("Password").fill("password123")
    page.get_by_role("button", name="Sign in").click()
    page.wait_for_url("**/dashboard")

    # Save storage state (cookies + localStorage)
    page.context.storage_state(path="auth_state.json")


# Reuse in conftest.py
@pytest.fixture
def authenticated_context(browser):
    context = browser.new_context(storage_state="auth_state.json")
    yield context
    context.close()
\`\`\`

### File Downloads

\`\`\`python
def test_download_report(page):
    with page.expect_download() as download_info:
        page.get_by_role("button", name="Download Report").click()

    download = download_info.value
    assert download.suggested_filename == "report.pdf"
    download.save_as(f"downloads/{download.suggested_filename}")
\`\`\`

### File Uploads

\`\`\`python
def test_upload_file(page):
    page.goto("http://localhost:3000/upload")

    # Upload via file input
    page.get_by_test_id("file-input").set_input_files("data/sample.pdf")
    page.get_by_role("button", name="Upload").click()
    expect(page.get_by_text("Upload successful")).to_be_visible()

    # Upload multiple files
    page.get_by_test_id("file-input").set_input_files([
        "data/file1.pdf",
        "data/file2.pdf",
    ])
\`\`\`

### Parallel Execution

\`\`\`bash
pip install pytest-xdist
pytest tests/ -n 4 --browser chromium
\`\`\`

### Handling Dialogs

\`\`\`python
def test_confirm_dialog(page):
    # Register dialog handler BEFORE triggering the dialog
    page.on("dialog", lambda dialog: dialog.accept())

    page.goto("http://localhost:3000/settings")
    page.get_by_role("button", name="Delete Account").click()

    # The dialog was automatically accepted
    expect(page.get_by_text("Account deleted")).to_be_visible()


def test_dismiss_dialog(page):
    page.on("dialog", lambda dialog: dialog.dismiss())

    page.goto("http://localhost:3000/settings")
    page.get_by_role("button", name="Delete Account").click()

    # The dialog was dismissed, so the account still exists
    expect(page.get_by_test_id("account-settings")).to_be_visible()


def test_prompt_dialog(page):
    def handle_prompt(dialog):
        assert dialog.type == "prompt"
        dialog.accept("My response text")

    page.on("dialog", handle_prompt)
    page.get_by_role("button", name="Enter Name").click()
\`\`\`

### Handling iframes

\`\`\`python
def test_iframe_interaction(page):
    page.goto("http://localhost:3000/embedded-content")

    # Access iframe by selector
    frame = page.frame_locator("[data-testid='payment-iframe']")

    # Interact with elements inside the iframe
    frame.get_by_label("Card number").fill("4242424242424242")
    frame.get_by_label("Expiry").fill("12/28")
    frame.get_by_label("CVC").fill("123")
    frame.get_by_role("button", name="Pay").click()

    # Assert something in the parent page
    expect(page.get_by_text("Payment successful")).to_be_visible()
\`\`\`

### Geolocation and Permissions

\`\`\`python
def test_geolocation(browser):
    context = browser.new_context(
        geolocation={"latitude": 40.7128, "longitude": -74.0060},
        permissions=["geolocation"],
    )
    page = context.new_page()
    page.goto("http://localhost:3000/store-locator")

    page.get_by_role("button", name="Find Nearby Stores").click()
    expect(page.get_by_text("New York")).to_be_visible()

    context.close()
\`\`\`

---

## Data-Driven Testing with Playwright Python

Parameterized tests are essential for covering multiple scenarios without duplicating test code.

\`\`\`python
import pytest
import json


def load_test_data(filename):
    with open(f"data/{filename}") as f:
        return json.load(f)


login_scenarios = load_test_data("login_scenarios.json")


@pytest.mark.parametrize(
    "scenario",
    login_scenarios,
    ids=[s["name"] for s in login_scenarios],
)
def test_login_scenarios(page, scenario):
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email").fill(scenario["email"])
    page.get_by_label("Password").fill(scenario["password"])
    page.get_by_role("button", name="Sign in").click()

    if scenario["expected_result"] == "success":
        page.wait_for_url("**/dashboard")
        expect(page.get_by_test_id("welcome")).to_be_visible()
    else:
        expect(page.get_by_test_id("error")).to_contain_text(
            scenario["expected_error"]
        )
\`\`\`

### Generating Tests from External Files

\`\`\`python
import csv

def load_csv_test_data(filepath):
    with open(filepath, newline="") as f:
        return list(csv.DictReader(f))


search_test_data = load_csv_test_data("data/search_queries.csv")


@pytest.mark.parametrize(
    "test_data",
    search_test_data,
    ids=[d["query"] for d in search_test_data],
)
def test_search_results(page, test_data):
    page.goto("http://localhost:3000/search")
    page.get_by_role("searchbox").fill(test_data["query"])
    page.keyboard.press("Enter")

    expected_count = int(test_data["min_results"])
    if expected_count == 0:
        expect(page.get_by_test_id("no-results")).to_be_visible()
    else:
        expect(page.get_by_test_id("result-card")).to_have_count(
            expected_count, timeout=10000
        )
\`\`\`

---

## Accessibility Testing with Playwright

Playwright integrates with accessibility testing tools to catch a11y violations automatically.

\`\`\`python
def test_accessibility_violations(page):
    page.goto("http://localhost:3000")

    # Use Playwright's built-in accessibility snapshot
    snapshot = page.accessibility.snapshot()
    assert snapshot is not None

    # Check for common issues
    # All images should have alt text
    images = page.locator("img")
    count = images.count()
    for i in range(count):
        alt = images.nth(i).get_attribute("alt")
        assert alt is not None and alt.strip() != "", (
            f"Image at index {i} is missing alt text"
        )

    # All form inputs should have associated labels
    inputs = page.locator("input:not([type='hidden'])")
    input_count = inputs.count()
    for i in range(input_count):
        input_el = inputs.nth(i)
        input_id = input_el.get_attribute("id")
        aria_label = input_el.get_attribute("aria-label")
        aria_labelledby = input_el.get_attribute("aria-labelledby")

        has_label = (
            aria_label
            or aria_labelledby
            or (input_id and page.locator(f"label[for='{input_id}']").count() > 0)
        )
        assert has_label, f"Input at index {i} has no accessible label"
\`\`\`

For comprehensive a11y testing, combine with the axe-core library:

\`\`\`python
def test_axe_accessibility(page):
    page.goto("http://localhost:3000")

    # Inject axe-core and run scan
    page.evaluate("""
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/axe-core@4/axe.min.js';
        document.head.appendChild(script);
    """)
    page.wait_for_function("typeof axe !== 'undefined'")

    results = page.evaluate("axe.run()")
    violations = results["violations"]

    for violation in violations:
        print(f"  {violation['id']}: {violation['description']}")
        for node in violation["nodes"]:
            print(f"    - {node['html']}")

    assert len(violations) == 0, (
        f"Found {len(violations)} accessibility violations"
    )
\`\`\`

---

## Best Practices Summary

1. **Use role-based locators** as your primary locator strategy. They test accessibility and are resilient to code changes.

2. **Trust auto-waiting.** Do not add explicit waits unless you have a very specific reason. Playwright handles timing internally.

3. **Use pytest-playwright fixtures.** Let the plugin manage browser, context, and page lifecycle.

4. **Enable tracing on failure.** The trace viewer provides complete test playback including DOM snapshots and network requests.

5. **Use codegen for quick test scaffolding.** Record interactions and refine the generated code into proper page objects.

6. **Combine API and UI tests.** Use API calls for test data setup and cleanup, and UI interactions for the flows you are actually testing.

7. **Run tests across browsers.** Playwright makes cross-browser testing trivial with the \`--browser\` flag.

8. **Keep tests independent.** Each test should create its own state and not depend on other tests.

9. **Use storage state for auth.** Save and reuse authentication state to avoid repeating login flows.

10. **Parallelize with pytest-xdist.** Playwright tests are isolated by design and run well in parallel.

---

## Debugging Playwright Tests

### Headed Mode with Slow Motion

\`\`\`bash
# Run tests with a visible browser and slow motion
pytest tests/ --headed --slowmo 1000
\`\`\`

This opens the browser and adds a 1-second delay between every action, making it easy to follow what the test is doing.

### Playwright Inspector

\`\`\`bash
# Launch with Playwright Inspector
PWDEBUG=1 pytest tests/test_login.py -s
\`\`\`

The inspector provides step-by-step execution with a "Resume" button, a locator picker that highlights elements on hover, and a console for evaluating locators interactively.

### Console Logging

\`\`\`python
def test_debug_with_logging(page):
    page.goto("http://localhost:3000/products")

    # Capture console messages
    messages = []
    page.on("console", lambda msg: messages.append(msg.text))

    # Perform actions
    page.get_by_role("button", name="Load More").click()

    # Check for JavaScript errors
    errors = [m for m in messages if "error" in m.lower()]
    assert len(errors) == 0, f"Console errors found: {errors}"
\`\`\`

### Page Error Detection

\`\`\`python
def test_no_page_errors(page):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    page.goto("http://localhost:3000")
    page.get_by_role("link", name="Products").click()
    page.get_by_role("link", name="About").click()

    assert len(errors) == 0, f"Page errors detected: {errors}"
\`\`\`

---

## Enhancing Your AI Agent

Install a Playwright Python skill for your AI coding agent to generate tests that follow best practices:

\`\`\`bash
npx @qaskills/cli add playwright-python-testing
\`\`\`

Browse all available QA skills at [qaskills.sh/skills](/skills).

---

## Conclusion

Playwright with Python is the most productive browser automation stack available in 2026 for teams that want reliability, speed, and cross-browser coverage. Its auto-waiting eliminates flaky tests, pytest-playwright simplifies test lifecycle management, and the trace viewer provides debugging capabilities that no other framework can match.

Start with the patterns in this guide: install Playwright, write tests using role-based locators, organize code with the Page Object Model, and set up CI/CD with trace collection on failure. As your suite grows, add API testing for data setup, use codegen for rapid test creation, and parallelize execution across browsers.

The combination of Python's readability and Playwright's modern automation capabilities creates a testing experience that is both powerful and approachable. Whether you are migrating from Selenium or starting fresh, Playwright Python is a strong choice for building test suites that your team will actually maintain and trust.
`,
};
