import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium with Python Tutorial: Complete Automation Guide for 2026',
  description:
    'Learn Selenium WebDriver with Python from scratch. Covers setup, locators, explicit waits, Page Object Model, pytest integration, headless mode, dropdowns, alerts, frames, screenshots, Grid, and CI/CD.',
  date: '2026-05-18',
  category: 'Tutorial',
  content: `
Selenium remains the most widely adopted browser automation framework in the world. Its language-agnostic WebDriver protocol, massive community, and compatibility with every major browser make it the industry standard for web automation. When combined with Python's clean syntax and the pytest testing framework, Selenium becomes an incredibly productive tool for building reliable end-to-end test suites. This tutorial walks you through everything you need to know to use Selenium with Python effectively in 2026.

## Key Takeaways

- Selenium 4 with Python offers a mature, stable platform for browser automation with W3C WebDriver protocol compliance
- Explicit waits with \`WebDriverWait\` and expected conditions eliminate flaky tests caused by timing issues
- The Page Object Model pattern is essential for maintainable Selenium test suites at any scale
- pytest fixtures and parametrize decorators integrate naturally with Selenium for clean test organization
- Headless browser execution and Selenium Grid enable fast parallel test runs in CI/CD environments
- Python's ecosystem (requests, faker, pandas) complements Selenium for data-driven and API-augmented testing

---

## Setting Up Selenium with Python

### Prerequisites

You need Python 3.10 or newer and pip installed on your system. Verify your installation:

\`\`\`bash
python --version   # Python 3.12.x or higher recommended
pip --version
\`\`\`

### Installing Selenium

\`\`\`bash
pip install selenium
\`\`\`

As of Selenium 4.6+, you no longer need to manually download browser drivers. Selenium Manager handles driver management automatically. It detects your installed browser versions and downloads the matching driver binaries.

### Verifying the Installation

\`\`\`python
from selenium import webdriver

driver = webdriver.Chrome()
driver.get("https://www.google.com")
print(f"Page title: {driver.title}")
driver.quit()
\`\`\`

If this script opens Chrome and prints the page title, your setup is working correctly.

### Setting Up a Project

Create a proper project structure:

\`\`\`bash
mkdir selenium-python-project
cd selenium-python-project
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

pip install selenium pytest pytest-html faker
pip freeze > requirements.txt
\`\`\`

Recommended project layout:

\`\`\`
selenium-python-project/
  pages/              # Page Object classes
    __init__.py
    base_page.py
    login_page.py
    dashboard_page.py
  tests/              # Test files
    __init__.py
    conftest.py       # Shared fixtures
    test_login.py
    test_dashboard.py
  data/               # Test data files
    users.json
  utils/              # Helper utilities
    __init__.py
    config.py
  pytest.ini          # pytest configuration
  requirements.txt
\`\`\`

For AI coding agents, you can install a Selenium-specific skill to get best practices and patterns automatically:

\`\`\`bash
npx @qaskills/cli add selenium-python-testing
\`\`\`

---

## Locator Strategies

Finding elements on the page is the foundation of every Selenium test. Selenium 4 provides multiple locator strategies, and choosing the right one is crucial for test stability.

### By ID

\`\`\`python
from selenium.webdriver.common.by import By

element = driver.find_element(By.ID, "username")
\`\`\`

IDs are fast and unique (when present), but many modern frameworks generate dynamic IDs that change between page loads.

### By Name

\`\`\`python
element = driver.find_element(By.NAME, "email")
\`\`\`

### By CSS Selector

\`\`\`python
# Simple selectors
element = driver.find_element(By.CSS_SELECTOR, "[data-testid='submit-btn']")
element = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
element = driver.find_element(By.CSS_SELECTOR, ".form-group > input.email-field")

# Attribute contains
element = driver.find_element(By.CSS_SELECTOR, "[class*='active']")
\`\`\`

### By XPath

\`\`\`python
# Absolute XPath (avoid -- extremely fragile)
# element = driver.find_element(By.XPATH, "/html/body/div/form/input[1]")

# Relative XPath (acceptable when CSS cannot express the query)
element = driver.find_element(By.XPATH, "//input[@placeholder='Enter your email']")
element = driver.find_element(By.XPATH, "//button[contains(text(), 'Submit')]")
element = driver.find_element(By.XPATH, "//div[@class='card']//h3[text()='Product A']")

# XPath axes for complex relationships
parent = driver.find_element(By.XPATH, "//span[text()='Price']/..")
sibling = driver.find_element(By.XPATH, "//label[text()='Email']/following-sibling::input")
\`\`\`

### By Link Text

\`\`\`python
element = driver.find_element(By.LINK_TEXT, "Forgot Password?")
element = driver.find_element(By.PARTIAL_LINK_TEXT, "Forgot")
\`\`\`

### Finding Multiple Elements

\`\`\`python
all_links = driver.find_elements(By.TAG_NAME, "a")
product_cards = driver.find_elements(By.CSS_SELECTOR, "[data-testid='product-card']")

for card in product_cards:
    title = card.find_element(By.CSS_SELECTOR, ".card-title").text
    print(f"Product: {title}")
\`\`\`

### Locator Priority Recommendation

1. \`data-testid\` attributes (most stable)
2. ID (when stable and present)
3. Name attribute
4. CSS selectors
5. XPath (only when CSS cannot express the query)

---

## Waits: Eliminating Flaky Tests

Timing issues are the number one cause of flaky Selenium tests. Modern web applications are asynchronous -- elements load, animations play, and API calls complete at unpredictable times. Waits solve this problem.

### Implicit Waits (Avoid)

\`\`\`python
driver.implicitly_wait(10)  # Waits up to 10 seconds for every find_element call
\`\`\`

Implicit waits apply globally and can mask real issues. They also do not work with expected conditions. Prefer explicit waits.

### Explicit Waits (Recommended)

\`\`\`python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

wait = WebDriverWait(driver, 10)

# Wait for element to be visible
element = wait.until(
    EC.visibility_of_element_located((By.CSS_SELECTOR, "[data-testid='dashboard']"))
)

# Wait for element to be clickable
button = wait.until(
    EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='submit-btn']"))
)
button.click()

# Wait for element to disappear
wait.until(
    EC.invisibility_of_element_located((By.CSS_SELECTOR, ".loading-spinner"))
)

# Wait for text to be present
wait.until(
    EC.text_to_be_present_in_element(
        (By.CSS_SELECTOR, "[data-testid='status']"), "Complete"
    )
)

# Wait for URL to change
wait.until(EC.url_contains("/dashboard"))

# Wait for title
wait.until(EC.title_contains("Dashboard"))
\`\`\`

### Custom Wait Conditions

\`\`\`python
def element_has_attribute(locator, attribute, value):
    def check(driver):
        element = driver.find_element(*locator)
        if element.get_attribute(attribute) == value:
            return element
        return False
    return check

element = wait.until(
    element_has_attribute(
        (By.CSS_SELECTOR, "[data-testid='upload']"), "data-status", "complete"
    )
)
\`\`\`

---

## Page Object Model with Python

The Page Object Model separates page structure from test logic, making tests readable and maintainable.

### Base Page Class

\`\`\`python
# pages/base_page.py
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By


class BasePage:
    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def find(self, locator: tuple[str, str]) -> WebElement:
        return self.wait.until(EC.visibility_of_element_located(locator))

    def find_all(self, locator: tuple[str, str]) -> list[WebElement]:
        self.wait.until(EC.presence_of_element_located(locator))
        return self.driver.find_elements(*locator)

    def click(self, locator: tuple[str, str]):
        self.wait.until(EC.element_to_be_clickable(locator)).click()

    def type_text(self, locator: tuple[str, str], text: str):
        element = self.find(locator)
        element.clear()
        element.send_keys(text)

    def get_text(self, locator: tuple[str, str]) -> str:
        return self.find(locator).text

    def is_displayed(self, locator: tuple[str, str]) -> bool:
        try:
            return self.find(locator).is_displayed()
        except Exception:
            return False

    def wait_for_url(self, partial_url: str):
        self.wait.until(EC.url_contains(partial_url))

    def take_screenshot(self, name: str):
        self.driver.save_screenshot(f"screenshots/{name}.png")
\`\`\`

### Login Page

\`\`\`python
# pages/login_page.py
from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class LoginPage(BasePage):
    URL = "/login"

    # Locators
    EMAIL_INPUT = (By.CSS_SELECTOR, "[data-testid='email-input']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "[data-testid='password-input']")
    LOGIN_BUTTON = (By.CSS_SELECTOR, "[data-testid='login-btn']")
    ERROR_MESSAGE = (By.CSS_SELECTOR, "[data-testid='error-message']")
    REMEMBER_ME = (By.CSS_SELECTOR, "[data-testid='remember-me']")

    def open(self):
        self.driver.get(f"{self.driver.base_url}{self.URL}")
        return self

    def enter_email(self, email: str):
        self.type_text(self.EMAIL_INPUT, email)
        return self

    def enter_password(self, password: str):
        self.type_text(self.PASSWORD_INPUT, password)
        return self

    def click_login(self):
        self.click(self.LOGIN_BUTTON)
        return self

    def login(self, email: str, password: str):
        self.enter_email(email)
        self.enter_password(password)
        self.click_login()
        return self

    def get_error_message(self) -> str:
        return self.get_text(self.ERROR_MESSAGE)

    def check_remember_me(self):
        self.click(self.REMEMBER_ME)
        return self
\`\`\`

### Dashboard Page

\`\`\`python
# pages/dashboard_page.py
from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class DashboardPage(BasePage):
    WELCOME_TEXT = (By.CSS_SELECTOR, "[data-testid='welcome-text']")
    USER_AVATAR = (By.CSS_SELECTOR, "[data-testid='user-avatar']")
    STATS_CARDS = (By.CSS_SELECTOR, "[data-testid='stat-card']")
    LOGOUT_BUTTON = (By.CSS_SELECTOR, "[data-testid='logout-btn']")

    def get_welcome_text(self) -> str:
        return self.get_text(self.WELCOME_TEXT)

    def get_stats_count(self) -> int:
        return len(self.find_all(self.STATS_CARDS))

    def is_loaded(self) -> bool:
        self.wait_for_url("/dashboard")
        return self.is_displayed(self.WELCOME_TEXT)

    def logout(self):
        self.click(self.LOGOUT_BUTTON)
\`\`\`

---

## pytest Integration

pytest is the standard testing framework for Python. It integrates naturally with Selenium through fixtures and provides powerful test organization features.

### conftest.py with Fixtures

\`\`\`python
# tests/conftest.py
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service


@pytest.fixture(scope="session")
def browser_options():
    options = Options()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return options


@pytest.fixture
def driver(browser_options):
    driver = webdriver.Chrome(options=browser_options)
    driver.base_url = "http://localhost:3000"
    driver.implicitly_wait(0)  # We use explicit waits only
    yield driver
    driver.quit()


@pytest.fixture
def logged_in_driver(driver):
    """Fixture that provides an already-authenticated browser session."""
    from pages.login_page import LoginPage

    login_page = LoginPage(driver)
    login_page.open().login("test@example.com", "password123")
    return driver
\`\`\`

### Writing Tests

\`\`\`python
# tests/test_login.py
import pytest
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage


class TestLogin:
    def test_successful_login(self, driver):
        login_page = LoginPage(driver)
        dashboard_page = DashboardPage(driver)

        login_page.open().login("admin@example.com", "password123")

        assert dashboard_page.is_loaded()
        assert "Welcome" in dashboard_page.get_welcome_text()

    def test_invalid_credentials(self, driver):
        login_page = LoginPage(driver)
        login_page.open().login("wrong@example.com", "wrongpass")

        error = login_page.get_error_message()
        assert "Invalid email or password" in error

    @pytest.mark.parametrize(
        "email,password,expected_error",
        [
            ("", "password123", "Email is required"),
            ("admin@example.com", "", "Password is required"),
            ("not-an-email", "password123", "Invalid email format"),
            ("admin@example.com", "short", "Password too short"),
        ],
    )
    def test_validation_errors(self, driver, email, password, expected_error):
        login_page = LoginPage(driver)
        login_page.open()

        if email:
            login_page.enter_email(email)
        if password:
            login_page.enter_password(password)
        login_page.click_login()

        assert expected_error in login_page.get_error_message()
\`\`\`

### Running Tests

\`\`\`bash
# Run all tests
pytest tests/ -v

# Run a specific test file
pytest tests/test_login.py -v

# Run tests matching a pattern
pytest tests/ -k "login" -v

# Run with HTML report
pytest tests/ --html=reports/report.html --self-contained-html

# Run in parallel (requires pytest-xdist)
pip install pytest-xdist
pytest tests/ -n 4 -v
\`\`\`

### pytest.ini Configuration

\`\`\`ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
markers =
    smoke: Smoke tests for quick validation
    regression: Full regression suite
    slow: Tests that take longer than 30 seconds
\`\`\`

---

## Headless Browser Execution

Headless mode runs the browser without a visible window, making it ideal for CI/CD pipelines and faster local test runs.

### Chrome Headless

\`\`\`python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument("--headless=new")  # Use the new headless mode
options.add_argument("--window-size=1920,1080")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")

driver = webdriver.Chrome(options=options)
\`\`\`

### Firefox Headless

\`\`\`python
from selenium import webdriver
from selenium.webdriver.firefox.options import Options

options = Options()
options.add_argument("--headless")
options.add_argument("--width=1920")
options.add_argument("--height=1080")

driver = webdriver.Firefox(options=options)
\`\`\`

### Conditional Headless in Fixtures

\`\`\`python
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


@pytest.fixture
def driver():
    options = Options()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--no-sandbox")

    if os.getenv("CI") or os.getenv("HEADLESS"):
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)
    driver.base_url = os.getenv("BASE_URL", "http://localhost:3000")
    yield driver
    driver.quit()
\`\`\`

---

## Handling Dropdowns, Alerts, and Frames

### Select Dropdowns

\`\`\`python
from selenium.webdriver.support.ui import Select

select_element = driver.find_element(By.CSS_SELECTOR, "[data-testid='country-select']")
select = Select(select_element)

# Select by visible text
select.select_by_visible_text("United States")

# Select by value attribute
select.select_by_value("us")

# Select by index
select.select_by_index(2)

# Get currently selected option
selected = select.first_selected_option.text

# Get all options
options = [opt.text for opt in select.options]
\`\`\`

### Custom Dropdowns (Non-Select)

Many modern frameworks use custom dropdown components instead of \`<select>\` elements:

\`\`\`python
# Click to open dropdown
driver.find_element(By.CSS_SELECTOR, "[data-testid='custom-dropdown']").click()

# Wait for options to appear and select one
wait.until(
    EC.visibility_of_element_located(
        (By.CSS_SELECTOR, "[data-testid='dropdown-options']")
    )
)
driver.find_element(By.XPATH, "//li[text()='Option A']").click()
\`\`\`

### JavaScript Alerts

\`\`\`python
# Accept an alert
alert = wait.until(EC.alert_is_present())
alert_text = alert.text
alert.accept()

# Dismiss an alert
alert = wait.until(EC.alert_is_present())
alert.dismiss()

# Type into a prompt
alert = wait.until(EC.alert_is_present())
alert.send_keys("My input text")
alert.accept()
\`\`\`

### Frames and Iframes

\`\`\`python
# Switch to frame by element
iframe = driver.find_element(By.CSS_SELECTOR, "iframe[data-testid='payment-frame']")
driver.switch_to.frame(iframe)

# Interact with elements inside the frame
driver.find_element(By.CSS_SELECTOR, "[data-testid='card-number']").send_keys("4242424242424242")

# Switch back to main content
driver.switch_to.default_content()

# Switch to frame by index
driver.switch_to.frame(0)

# Switch to frame by name or ID
driver.switch_to.frame("frame-name")
\`\`\`

### Windows and Tabs

\`\`\`python
# Get current window handle
original_window = driver.current_window_handle

# Click a link that opens a new tab
driver.find_element(By.LINK_TEXT, "Open in new tab").click()

# Wait for new window and switch to it
wait.until(lambda d: len(d.window_handles) > 1)
new_window = [w for w in driver.window_handles if w != original_window][0]
driver.switch_to.window(new_window)

# Do something in the new tab
assert "New Page" in driver.title

# Close new tab and switch back
driver.close()
driver.switch_to.window(original_window)
\`\`\`

---

## Screenshots and Visual Debugging

### Taking Screenshots

\`\`\`python
# Full page screenshot
driver.save_screenshot("screenshots/full_page.png")

# Element screenshot
element = driver.find_element(By.CSS_SELECTOR, "[data-testid='chart']")
element.screenshot("screenshots/chart_element.png")
\`\`\`

### Screenshot on Failure with pytest

\`\`\`python
# tests/conftest.py
import pytest
import os
from datetime import datetime


@pytest.fixture(autouse=True)
def screenshot_on_failure(request, driver):
    yield
    if request.node.rep_call and request.node.rep_call.failed:
        os.makedirs("screenshots", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        test_name = request.node.name
        driver.save_screenshot(f"screenshots/{test_name}_{timestamp}.png")


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    setattr(item, f"rep_{rep.when}", rep)
\`\`\`

---

## Selenium Grid for Parallel and Remote Execution

Selenium Grid lets you distribute tests across multiple machines and browsers.

### Starting Grid with Docker Compose

\`\`\`yaml
# docker-compose.yml
version: "3.8"
services:
  selenium-hub:
    image: selenium/hub:4.18
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"

  chrome-node:
    image: selenium/node-chrome:4.18
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
    shm_size: "2gb"
    deploy:
      replicas: 2

  firefox-node:
    image: selenium/node-firefox:4.18
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
    shm_size: "2gb"
\`\`\`

### Connecting to Grid

\`\`\`python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument("--no-sandbox")

driver = webdriver.Remote(
    command_executor="http://localhost:4444",
    options=options,
)
driver.get("https://example.com")
print(driver.title)
driver.quit()
\`\`\`

### Running Multiple Browsers via pytest

\`\`\`python
# tests/conftest.py
import pytest
from selenium import webdriver


@pytest.fixture(params=["chrome", "firefox"])
def driver(request):
    browser = request.param
    if browser == "chrome":
        options = webdriver.ChromeOptions()
    elif browser == "firefox":
        options = webdriver.FirefoxOptions()

    options.add_argument("--headless=new" if browser == "chrome" else "--headless")

    driver = webdriver.Remote(
        command_executor="http://localhost:4444",
        options=options,
    )
    yield driver
    driver.quit()
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: Selenium Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      selenium:
        image: selenium/standalone-chrome:4.18
        ports:
          - 4444:4444
        options: --shm-size=2gb

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Start application
        run: |
          npm start &
          sleep 10

      - name: Run Selenium tests
        run: pytest tests/ -v --html=reports/report.html
        env:
          SELENIUM_REMOTE_URL: http://localhost:4444
          BASE_URL: http://localhost:3000

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-report
          path: reports/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: failure-screenshots
          path: screenshots/
\`\`\`

---

## Action Chains and Advanced Interactions

\`\`\`python
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

actions = ActionChains(driver)

# Hover over an element
menu_item = driver.find_element(By.CSS_SELECTOR, "[data-testid='nav-menu']")
actions.move_to_element(menu_item).perform()

# Double click
element = driver.find_element(By.CSS_SELECTOR, "[data-testid='editable-cell']")
actions.double_click(element).perform()

# Right click (context menu)
element = driver.find_element(By.CSS_SELECTOR, "[data-testid='file-item']")
actions.context_click(element).perform()

# Drag and drop
source = driver.find_element(By.CSS_SELECTOR, "[data-testid='drag-source']")
target = driver.find_element(By.CSS_SELECTOR, "[data-testid='drop-target']")
actions.drag_and_drop(source, target).perform()

# Keyboard shortcuts
actions.key_down(Keys.CONTROL).send_keys("a").key_up(Keys.CONTROL).perform()

# Chain multiple actions
actions.move_to_element(menu_item) \\
    .click() \\
    .send_keys("search term") \\
    .send_keys(Keys.ENTER) \\
    .perform()
\`\`\`

---

## JavaScript Execution

Sometimes you need to execute JavaScript directly for operations that Selenium cannot handle natively:

\`\`\`python
# Scroll to element
element = driver.find_element(By.CSS_SELECTOR, "[data-testid='footer']")
driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth'});", element)

# Scroll to bottom of page
driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

# Remove element attribute
driver.execute_script(
    "arguments[0].removeAttribute('disabled');",
    driver.find_element(By.CSS_SELECTOR, "[data-testid='submit-btn']")
)

# Get computed style
color = driver.execute_script(
    "return window.getComputedStyle(arguments[0]).color;",
    driver.find_element(By.CSS_SELECTOR, "[data-testid='error-text']")
)

# Set localStorage
driver.execute_script("localStorage.setItem('token', 'test-token-123');")

# Get page performance metrics
performance = driver.execute_script(
    "return JSON.stringify(window.performance.timing);"
)
\`\`\`

---

## Data-Driven Testing with pytest

### Parametrized Tests

\`\`\`python
import pytest

@pytest.mark.parametrize(
    "username,password,expected",
    [
        ("admin@example.com", "admin123", True),
        ("user@example.com", "user123", True),
        ("invalid@example.com", "wrong", False),
    ],
    ids=["admin-login", "user-login", "invalid-login"],
)
def test_login_scenarios(driver, username, password, expected):
    login_page = LoginPage(driver)
    login_page.open().login(username, password)

    if expected:
        assert DashboardPage(driver).is_loaded()
    else:
        assert "Invalid" in login_page.get_error_message()
\`\`\`

### Loading Test Data from JSON

\`\`\`python
import json

def load_test_data(filename):
    with open(f"data/{filename}") as f:
        return json.load(f)

users = load_test_data("users.json")

@pytest.mark.parametrize("user", users, ids=[u["name"] for u in users])
def test_user_profiles(driver, user):
    login_page = LoginPage(driver)
    login_page.open().login(user["email"], user["password"])
    # Assert based on user role
\`\`\`

---

## Cookie and Storage Management

Managing cookies and browser storage is essential for tests that deal with authentication, user preferences, and session management.

\`\`\`python
# Get all cookies
all_cookies = driver.get_cookies()

# Get a specific cookie
session_cookie = driver.get_cookie("session_id")

# Add a cookie
driver.add_cookie({
    "name": "auth_token",
    "value": "abc123",
    "domain": "localhost",
    "path": "/",
    "secure": False,
})

# Delete a specific cookie
driver.delete_cookie("auth_token")

# Delete all cookies
driver.delete_all_cookies()

# Access localStorage via JavaScript
token = driver.execute_script("return localStorage.getItem('authToken');")
driver.execute_script("localStorage.setItem('theme', 'dark');")
driver.execute_script("localStorage.removeItem('tempData');")
driver.execute_script("localStorage.clear();")

# Access sessionStorage
driver.execute_script("return sessionStorage.getItem('formDraft');")
\`\`\`

### Cookie-Based Authentication Shortcut

Instead of going through the login UI every time, you can set authentication cookies directly:

\`\`\`python
import requests

def authenticate_via_cookies(driver, base_url, email, password):
    """Login via API and inject cookies into the browser session."""
    session = requests.Session()
    response = session.post(
        f"{base_url}/api/auth/login",
        json={"email": email, "password": password},
    )
    response.raise_for_status()

    # Navigate to the domain first (cookies require matching domain)
    driver.get(base_url)

    # Inject each cookie from the API session
    for cookie in session.cookies:
        driver.add_cookie({
            "name": cookie.name,
            "value": cookie.value,
            "domain": cookie.domain,
            "path": cookie.path,
            "secure": cookie.secure,
        })

    # Refresh the page to apply cookies
    driver.refresh()
\`\`\`

This approach is significantly faster than using the login UI and reduces test execution time, especially in large suites where many tests require authentication.

---

## Handling File Uploads and Downloads

### File Upload

\`\`\`python
import os

# Standard file input
file_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
file_path = os.path.abspath("data/sample-document.pdf")
file_input.send_keys(file_path)

# Wait for upload to complete
wait.until(
    EC.visibility_of_element_located(
        (By.CSS_SELECTOR, "[data-testid='upload-success']")
    )
)
\`\`\`

### File Download

\`\`\`python
import os
import time
from selenium.webdriver.chrome.options import Options

# Configure Chrome to download files to a specific directory
download_dir = os.path.abspath("downloads")
os.makedirs(download_dir, exist_ok=True)

options = Options()
prefs = {
    "download.default_directory": download_dir,
    "download.prompt_for_download": False,
    "download.directory_upgrade": True,
}
options.add_experimental_option("preferences", prefs)

driver = webdriver.Chrome(options=options)
driver.get("http://localhost:3000/reports")

# Click download button
driver.find_element(By.CSS_SELECTOR, "[data-testid='download-report']").click()

# Wait for file to appear
def wait_for_download(directory, timeout=30):
    end_time = time.time() + timeout
    while time.time() < end_time:
        files = os.listdir(directory)
        # Filter out temporary Chrome download files
        completed = [f for f in files if not f.endswith(".crdownload")]
        if completed:
            return os.path.join(directory, completed[0])
        time.sleep(1)
    raise TimeoutError("Download did not complete in time")

downloaded_file = wait_for_download(download_dir)
assert downloaded_file.endswith(".pdf")
\`\`\`

---

## Logging and Reporting

Good logging makes debugging failed tests straightforward, especially in CI environments where you cannot watch the browser.

\`\`\`python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler("test_execution.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("selenium_tests")


class BasePage:
    def __init__(self, driver):
        self.driver = driver
        self.logger = logging.getLogger(self.__class__.__name__)

    def click(self, locator):
        self.logger.info(f"Clicking element: {locator}")
        element = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable(locator)
        )
        element.click()

    def type_text(self, locator, text):
        self.logger.info(f"Typing into {locator}: {'*' * len(text)}")
        element = WebDriverWait(self.driver, 10).until(
            EC.visibility_of_element_located(locator)
        )
        element.clear()
        element.send_keys(text)
\`\`\`

### Allure Reporting

\`\`\`python
import allure

@allure.feature("Authentication")
@allure.story("Login")
@allure.severity(allure.severity_level.CRITICAL)
def test_successful_login(driver):
    with allure.step("Navigate to login page"):
        login_page = LoginPage(driver)
        login_page.open()

    with allure.step("Enter valid credentials"):
        login_page.login("admin@example.com", "password123")

    with allure.step("Verify dashboard is loaded"):
        dashboard = DashboardPage(driver)
        assert dashboard.is_loaded()

    allure.attach(
        driver.get_screenshot_as_png(),
        name="dashboard_screenshot",
        attachment_type=allure.attachment_type.PNG,
    )
\`\`\`

Run tests with Allure:

\`\`\`bash
pip install allure-pytest
pytest tests/ --alluredir=allure-results
allure serve allure-results
\`\`\`

---

## Best Practices Summary

1. **Always use explicit waits.** \`WebDriverWait\` with expected conditions is the only reliable way to handle dynamic content. Never use \`time.sleep()\`.

2. **Implement the Page Object Model.** Even for small projects, POM pays for itself immediately in readability and maintenance.

3. **Use data-testid selectors.** Coordinate with developers to add \`data-testid\` attributes. They are the most stable selector strategy.

4. **Run headless in CI.** Headless mode is faster and does not require a display server. Use \`--headless=new\` for Chrome.

5. **Take screenshots on failure.** Automatic screenshots with timestamps make debugging CI failures dramatically faster.

6. **Use pytest fixtures for setup and teardown.** Fixtures are cleaner than setup/teardown methods and support dependency injection.

7. **Parallelize with pytest-xdist.** Run tests across multiple processes with \`pytest -n auto\` to cut execution time.

8. **Use Selenium Grid for cross-browser testing.** Docker Compose makes it trivial to spin up Chrome and Firefox nodes.

9. **Keep tests independent.** Each test should create its own data and not depend on other tests having run first.

10. **Prefer API setup over UI setup.** Use \`requests\` to seed test data via API calls rather than clicking through the UI.

---

## Enhancing Your AI Agent with Selenium Skills

If you use AI coding agents for test generation, installing a Selenium-specific QA skill gives the agent deep knowledge of Python-Selenium patterns, locator strategies, and the Page Object Model:

\`\`\`bash
npx @qaskills/cli add selenium-python-testing
\`\`\`

Browse the full catalog of testing skills at [qaskills.sh/skills](/skills).

---

## Conclusion

Selenium with Python remains one of the most practical and battle-tested combinations for browser automation in 2026. The framework's maturity, combined with Python's readability and pytest's powerful fixture system, creates a testing stack that scales from small projects to enterprise test suites with thousands of tests.

Start with the fundamentals in this tutorial: set up your project with a clean structure, use explicit waits and stable selectors, organize your code with the Page Object Model, and automate execution with pytest fixtures and CI/CD pipelines. As your suite grows, add Selenium Grid for cross-browser parallel execution and integrate with reporting tools for visibility into test health.

The patterns in this guide reflect real-world experience from teams running Selenium at scale. Follow them, and you will build a test suite that is fast, reliable, and a genuine asset to your development workflow.
`,
};
