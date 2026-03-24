---
name: "Behave BDD Testing"
description: "Python BDD testing with Behave framework using Gherkin feature files, step definitions, environment hooks, and Selenium integration for behavior-driven acceptance testing."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [behave, bdd, python, gherkin, selenium, acceptance-testing, feature-files, step-definitions]
testingTypes: [bdd, acceptance, e2e, integration]
frameworks: [behave]
languages: [python]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Behave BDD Testing

You are an expert QA engineer specializing in Behave, the Python BDD testing framework. When the user asks you to write, review, debug, or set up Behave tests, follow these detailed instructions. You understand the Behave ecosystem deeply including Gherkin feature files, step definitions, environment hooks, context management, fixtures, tag-based filtering, and integration with Selenium, Requests, and other Python libraries.

## Core Principles

1. **Business-Readable Scenarios** — Write Gherkin scenarios in plain language that stakeholders can understand. Avoid technical implementation details in feature files.
2. **Reusable Step Definitions** — Design steps to be generic and composable. Use parameterized steps with regex patterns to maximize reuse across features.
3. **Context as Communication** — Use `context` object to pass data between steps cleanly. Store page objects, API clients, and test data on context in hooks.
4. **Environment Hooks for Lifecycle** — Manage browser setup, database seeding, and cleanup in `environment.py` hooks rather than in step definitions.
5. **Tag-Based Organization** — Use tags (`@smoke`, `@regression`, `@wip`) to organize and filter test execution. Tags drive fixture selection and reporting.
6. **Page Object Pattern** — Separate page interactions from step logic. Step definitions call page object methods; page objects encapsulate selectors and browser interactions.
7. **Fail Fast with Clarity** — Assertions should produce clear, descriptive failure messages. Capture screenshots and logs on failure for debugging.

## Project Structure

```
project-root/
├── features/
│   ├── auth/
│   │   ├── login.feature
│   │   ├── signup.feature
│   │   └── password_reset.feature
│   ├── shopping/
│   │   ├── cart.feature
│   │   └── checkout.feature
│   ├── steps/
│   │   ├── auth_steps.py
│   │   ├── shopping_steps.py
│   │   ├── navigation_steps.py
│   │   └── common_steps.py
│   ├── pages/
│   │   ├── base_page.py
│   │   ├── login_page.py
│   │   ├── dashboard_page.py
│   │   └── cart_page.py
│   ├── fixtures/
│   │   ├── browser.py
│   │   ├── database.py
│   │   └── api_client.py
│   └── environment.py
├── reports/
│   ├── screenshots/
│   └── allure-results/
├── config/
│   ├── dev.ini
│   ├── staging.ini
│   └── prod.ini
├── behave.ini
├── requirements.txt
└── pytest.ini
```

## Detailed Code Examples

### Feature File (Gherkin)

```gherkin
# features/auth/login.feature
@auth
Feature: User Authentication
  As a registered user
  I want to login to the application
  So that I can access my dashboard

  Background:
    Given the application is running
    And I am on the login page

  @smoke @positive
  Scenario: Successful login with valid credentials
    When I enter "user@example.com" as email
    And I enter "SecurePass123" as password
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message containing "Welcome"

  @negative
  Scenario: Login fails with invalid password
    When I enter "user@example.com" as email
    And I enter "wrongpassword" as password
    And I click the login button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page

  @negative
  Scenario Outline: Login fails with invalid inputs
    When I enter "<email>" as email
    And I enter "<password>" as password
    And I click the login button
    Then I should see an error message "<error>"

    Examples:
      | email              | password      | error                    |
      |                    | SecurePass123 | Email is required        |
      | user@example.com   |               | Password is required     |
      | invalid-email      | SecurePass123 | Invalid email format     |
      | nonexist@test.com  | SecurePass123 | Account not found        |

  @data-driven
  Scenario: Login with multiple user roles
    Given the following users exist:
      | name    | email              | role    |
      | Admin   | admin@example.com  | admin   |
      | Editor  | editor@example.com | editor  |
      | Viewer  | viewer@example.com | viewer  |
    When I login as "admin@example.com" with password "AdminPass123"
    Then I should see the admin panel
```

### Step Definitions

```python
# features/steps/auth_steps.py
from behave import given, when, then, step
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage


@given('the application is running')
def step_app_running(context):
    """Verify the application is accessible."""
    context.browser.get(context.base_url)
    assert context.browser.title, "Application did not load"


@given('I am on the login page')
def step_on_login_page(context):
    """Navigate to the login page."""
    context.login_page = LoginPage(context.browser)
    context.login_page.open(context.base_url)


@when('I enter "{value}" as email')
def step_enter_email(context, value):
    """Enter email in the login form."""
    context.login_page.enter_email(value)


@when('I enter "{value}" as password')
def step_enter_password(context, value):
    """Enter password in the login form."""
    context.login_page.enter_password(value)


@when('I click the login button')
def step_click_login(context):
    """Click the login submit button."""
    context.login_page.click_login()


@then('I should be redirected to the dashboard')
def step_on_dashboard(context):
    """Verify user is on the dashboard page."""
    context.dashboard_page = DashboardPage(context.browser)
    assert context.dashboard_page.is_loaded(), "Dashboard did not load"


@then('I should see a welcome message containing "{text}"')
def step_see_welcome(context, text):
    """Verify the welcome message contains expected text."""
    message = context.dashboard_page.get_welcome_message()
    assert text in message, f"Expected '{text}' in '{message}'"


@then('I should see an error message "{expected_error}"')
def step_see_error(context, expected_error):
    """Verify an error message is displayed."""
    error = context.login_page.get_error_message()
    assert error == expected_error, f"Expected '{expected_error}', got '{error}'"


@then('I should remain on the login page')
def step_still_on_login(context):
    """Verify user is still on the login page."""
    assert "/login" in context.browser.current_url


@given('the following users exist')
def step_users_exist(context):
    """Create test users from the table."""
    for row in context.table:
        context.api_client.create_user(
            name=row['name'],
            email=row['email'],
            role=row['role']
        )


@when('I login as "{email}" with password "{password}"')
def step_login_as(context, email, password):
    """Login with specific credentials."""
    context.login_page.enter_email(email)
    context.login_page.enter_password(password)
    context.login_page.click_login()
```

### Page Objects

```python
# features/pages/base_page.py
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException


class BasePage:
    def __init__(self, browser, timeout=10):
        self.browser = browser
        self.timeout = timeout
        self.wait = WebDriverWait(browser, timeout)

    def find_element(self, locator):
        return self.wait.until(EC.visibility_of_element_located(locator))

    def find_elements(self, locator):
        return self.wait.until(EC.visibility_of_all_elements_located(locator))

    def click(self, locator):
        element = self.wait.until(EC.element_to_be_clickable(locator))
        element.click()

    def type_text(self, locator, text):
        element = self.find_element(locator)
        element.clear()
        element.send_keys(text)

    def get_text(self, locator):
        return self.find_element(locator).text

    def is_visible(self, locator, timeout=None):
        try:
            wait = WebDriverWait(self.browser, timeout or self.timeout)
            wait.until(EC.visibility_of_element_located(locator))
            return True
        except TimeoutException:
            return False

    def wait_for_url_contains(self, text):
        self.wait.until(EC.url_contains(text))

    def take_screenshot(self, name):
        self.browser.save_screenshot(f"reports/screenshots/{name}.png")


# features/pages/login_page.py
from selenium.webdriver.common.by import By
from pages.base_page import BasePage


class LoginPage(BasePage):
    EMAIL_INPUT = (By.CSS_SELECTOR, '[data-testid="email-input"]')
    PASSWORD_INPUT = (By.CSS_SELECTOR, '[data-testid="password-input"]')
    LOGIN_BUTTON = (By.CSS_SELECTOR, '[data-testid="login-submit"]')
    ERROR_MESSAGE = (By.CSS_SELECTOR, '[data-testid="error-message"]')

    def open(self, base_url):
        self.browser.get(f"{base_url}/login")
        self.find_element(self.EMAIL_INPUT)

    def enter_email(self, email):
        self.type_text(self.EMAIL_INPUT, email)

    def enter_password(self, password):
        self.type_text(self.PASSWORD_INPUT, password)

    def click_login(self):
        self.click(self.LOGIN_BUTTON)

    def get_error_message(self):
        return self.get_text(self.ERROR_MESSAGE)

    def is_loaded(self):
        return self.is_visible(self.EMAIL_INPUT)
```

### Environment Hooks

```python
# features/environment.py
import os
import configparser
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service


def before_all(context):
    """Set up global configuration."""
    env = os.getenv("TEST_ENV", "dev")
    config = configparser.ConfigParser()
    config.read(f"config/{env}.ini")
    context.base_url = config.get("app", "base_url", fallback="http://localhost:3000")
    context.api_url = config.get("app", "api_url", fallback="http://localhost:3000/api")
    context.implicit_wait = int(config.get("browser", "implicit_wait", fallback="10"))


def before_scenario(context, scenario):
    """Set up browser before each scenario."""
    chrome_options = Options()
    if os.getenv("CI"):
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")

    context.browser = webdriver.Chrome(options=chrome_options)
    context.browser.implicitly_wait(context.implicit_wait)


def after_scenario(context, scenario):
    """Clean up after each scenario."""
    if scenario.status == "failed":
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        name = scenario.name.replace(" ", "_")
        screenshot_path = f"reports/screenshots/{name}_{timestamp}.png"
        context.browser.save_screenshot(screenshot_path)
        print(f"Screenshot saved: {screenshot_path}")

    if hasattr(context, 'browser'):
        context.browser.quit()


def after_all(context):
    """Global teardown."""
    pass


def before_tag(context, tag):
    """Handle tag-specific setup."""
    if tag == "api":
        import requests
        context.session = requests.Session()
        context.session.headers.update({"Content-Type": "application/json"})
    elif tag == "database":
        context.db = create_test_database()


def after_tag(context, tag):
    """Handle tag-specific teardown."""
    if tag == "api" and hasattr(context, 'session'):
        context.session.close()
    elif tag == "database" and hasattr(context, 'db'):
        context.db.close()
```

### API Testing with Behave

```gherkin
# features/api/users_api.feature
@api
Feature: Users API
  As an API consumer
  I want to manage users via REST API
  So that I can integrate with the user system

  @smoke
  Scenario: Create a new user via API
    Given the API is available
    When I send a POST request to "/api/users" with:
      | name  | email              |
      | Alice | alice@example.com  |
    Then the response status code should be 201
    And the response should contain "Alice"

  Scenario: Get user by ID
    Given a user exists with email "bob@example.com"
    When I send a GET request to "/api/users/{user_id}"
    Then the response status code should be 200
    And the response JSON should have key "email" with value "bob@example.com"
```

```python
# features/steps/api_steps.py
import json
import requests
from behave import given, when, then


@given('the API is available')
def step_api_available(context):
    response = requests.get(f"{context.api_url}/health")
    assert response.status_code == 200, "API is not available"
    context.session = requests.Session()
    context.session.headers.update({"Content-Type": "application/json"})


@when('I send a POST request to "{endpoint}" with')
def step_post_request(context, endpoint):
    data = {}
    for row in context.table:
        for heading in context.table.headings:
            data[heading] = row[heading]
    url = f"{context.api_url}{endpoint}"
    context.response = context.session.post(url, json=data)


@when('I send a GET request to "{endpoint}"')
def step_get_request(context, endpoint):
    endpoint = endpoint.replace("{user_id}", str(context.user_id))
    url = f"{context.api_url}{endpoint}"
    context.response = context.session.get(url)


@then('the response status code should be {status_code:d}')
def step_check_status(context, status_code):
    assert context.response.status_code == status_code, \
        f"Expected {status_code}, got {context.response.status_code}: {context.response.text}"


@then('the response should contain "{text}"')
def step_response_contains(context, text):
    assert text in context.response.text, \
        f"Response does not contain '{text}': {context.response.text}"


@then('the response JSON should have key "{key}" with value "{value}"')
def step_json_has_key(context, key, value):
    data = context.response.json()
    assert key in data, f"Key '{key}' not found in response"
    assert str(data[key]) == value, f"Expected '{value}', got '{data[key]}'"
```

### Behave Configuration

```ini
# behave.ini
[behave]
paths = features
format = pretty
color = true
show_timings = true
logging_level = INFO
junit = false
junit_directory = reports
default_tags = ~@wip
stdout_capture = false
stderr_capture = false
```

### CI/CD Integration (GitHub Actions)

```yaml
name: BDD Tests
on: [push, pull_request]

jobs:
  behave-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install allure-behave
      - name: Install Chrome
        run: |
          sudo apt-get update
          sudo apt-get install -y google-chrome-stable
      - name: Run BDD tests
        run: behave --tags=@smoke --format allure_behave.formatter:AllureFormatter -o reports/allure-results
        env:
          CI: true
          TEST_ENV: staging
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-reports
          path: reports/
```

## Best Practices

1. **Write features in business language** — Feature files are living documentation. Use domain terms that stakeholders understand, not technical jargon.
2. **Keep scenarios independent** — Each scenario should set up its own preconditions. Never rely on scenarios running in a specific order.
3. **Use Background for common setup** — Share common Given steps across scenarios using the Background keyword instead of repeating them.
4. **Parameterize with Scenario Outline** — Use Scenario Outline with Examples tables for data-driven testing instead of duplicating scenarios.
5. **Store state on context** — Use the context object to pass data between steps. Avoid global variables or module-level state.
6. **Implement Page Objects** — Separate page interaction logic from step definitions. Steps should read like business operations, not browser commands.
7. **Use tags strategically** — Tag scenarios for filtering (`@smoke`, `@regression`), for fixture selection (`@browser`, `@api`), and for work tracking (`@wip`, `@bug-123`).
8. **Capture screenshots on failure** — Configure `after_scenario` hooks to capture screenshots and browser logs when scenarios fail.
9. **Use fixtures for resource management** — Behave fixtures provide controlled setup/teardown with proper scoping (scenario, feature, or global).
10. **Generate reports** — Integrate with Allure, JUnit, or JSON reporting for CI/CD visibility and historical trend analysis.

## Anti-Patterns to Avoid

1. **Avoid imperative scenarios** — Write `When I login as admin` not `When I click username field And I type admin And I click password And I type secret And I click submit`.
2. **Avoid technical steps in features** — `When I click CSS selector .btn-primary` exposes implementation. Use `When I submit the form` instead.
3. **Avoid scenario coupling** — Never write `Given the previous scenario passed`. Each scenario must be independently executable.
4. **Avoid hard-coded waits** — Use explicit waits (`WebDriverWait`) instead of `time.sleep()`. Fixed delays make tests slow and flaky.
5. **Avoid overly specific assertions** — `Then I should see exactly 47 items` is brittle. Prefer `Then I should see search results` unless the count matters.
6. **Avoid complex step definitions** — If a step definition exceeds 15 lines, extract logic into page objects or helper functions.
7. **Avoid sharing browser state** — Always create a fresh browser instance per scenario. Shared browser state causes cascading failures.
8. **Avoid ignoring context cleanup** — Always close browsers, database connections, and API sessions in `after_scenario` hooks.
9. **Avoid too many scenarios per feature** — Keep features focused. If a feature file exceeds 100 lines, split it into smaller, focused features.
10. **Avoid missing error context** — Assertion messages should include actual values: `assert actual == expected, f"Expected {expected}, got {actual}"`.
