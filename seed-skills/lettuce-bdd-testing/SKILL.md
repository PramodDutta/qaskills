---
name: Lettuce BDD Testing
description: Expert-level Lettuce BDD testing skill for Python applications. Covers Gherkin feature files, step definitions, terrain hooks, Selenium integration, data-driven scenarios, and migration guidance to Behave for modern projects.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [lettuce, python, bdd, gherkin, behavior-driven, acceptance-testing, legacy]
testingTypes: [bdd, e2e, acceptance]
frameworks: [lettuce, selenium, behave]
languages: [python]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Lettuce BDD Testing Skill

You are an expert QA automation engineer specializing in Lettuce BDD testing for Python applications. When the user asks you to write, review, or debug Lettuce tests, follow these detailed instructions.

> **Note:** Lettuce is largely unmaintained. For new Python BDD projects, recommend **Behave** instead. This skill covers Lettuce for legacy codebases and migration guidance.

## Core Principles

1. **Behavior specification first** -- Write Gherkin feature files that describe business behavior before implementing step definitions. Features should be readable by non-technical stakeholders.
2. **Reusable step definitions** -- Steps should be generic enough to reuse across scenarios. Use regex groups to parameterize values.
3. **World object for shared state** -- Use Lettuce's `world` object to share browser instances, configuration, and data between steps. Clean it up in terrain hooks.
4. **Terrain for lifecycle** -- Use `terrain.py` for `@before.all`, `@after.all`, `@before.each_scenario`, `@after.each_scenario` hooks to manage setup and teardown.
5. **Migration awareness** -- When working on Lettuce projects, evaluate whether migration to Behave is feasible. Behave has active maintenance, better documentation, and broader ecosystem support.

## Project Structure

Always organize Lettuce projects with this structure:

```
features/
  auth/
    login.feature
    signup.feature
  dashboard/
    dashboard.feature
  steps/
    auth_steps.py
    dashboard_steps.py
    common_steps.py
  pages/
    login_page.py
    dashboard_page.py
    base_page.py
  support/
    browser_manager.py
    test_data.py
terrain.py
requirements.txt
conftest.py           # if combining with pytest
```

## Setup

### Installation

```bash
pip install lettuce selenium webdriver-manager
```

### requirements.txt

```
lettuce==0.2.23
selenium>=4.18.0
webdriver-manager>=4.0.0
```

## Feature File Patterns

### Login Feature (features/auth/login.feature)

```gherkin
Feature: User Login
  As a registered user
  I want to log in to my account
  So that I can access the dashboard

  Background:
    Given I am on the login page

  Scenario: Successful login with valid credentials
    When I enter "user@test.com" as email
    And I enter "password123" as password
    And I click the login button
    Then I should be on the dashboard
    And I should see "Welcome" on the page

  Scenario: Login fails with invalid credentials
    When I enter "bad@test.com" as email
    And I enter "wrong" as password
    And I click the login button
    Then I should see "Invalid credentials" on the page
    And I should be on the login page

  Scenario: Login requires email
    When I enter "password123" as password
    And I click the login button
    Then I should see "Email is required" on the page

  Scenario Outline: Login with various users
    When I enter "<email>" as email
    And I enter "<password>" as password
    And I click the login button
    Then I should see "<expected>" on the page

    Examples:
      | email            | password    | expected             |
      | admin@test.com   | admin123    | Admin Dashboard      |
      | user@test.com    | password123 | Welcome              |
      | bad@test.com     | wrong       | Invalid credentials  |
```

### CRUD Feature (features/dashboard/dashboard.feature)

```gherkin
Feature: Dashboard Item Management
  As an authenticated user
  I want to manage items on my dashboard
  So that I can organize my work

  Background:
    Given I am logged in as "user@test.com"
    And I am on the dashboard

  Scenario: Create a new item
    When I click "Add Item"
    And I fill in "Item Name" with "Test Item"
    And I fill in "Description" with "Test description"
    And I click "Save"
    Then I should see "Test Item" in the items list
    And I should see "Item created successfully"

  Scenario: Delete an existing item
    Given there is an item named "Old Item"
    When I click delete on "Old Item"
    And I confirm the deletion
    Then I should not see "Old Item" in the items list
```

## Step Definitions

### Authentication Steps (features/steps/auth_steps.py)

```python
from lettuce import step, world
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@step(r'I am on the login page')
def navigate_to_login(step):
    world.browser.get(world.base_url + '/login')
    WebDriverWait(world.browser, 10).until(
        EC.presence_of_element_located((By.ID, 'email'))
    )


@step(r'I enter "([^"]*)" as email')
def enter_email(step, email):
    el = world.browser.find_element(By.ID, 'email')
    el.clear()
    el.send_keys(email)


@step(r'I enter "([^"]*)" as password')
def enter_password(step, password):
    el = world.browser.find_element(By.ID, 'password')
    el.clear()
    el.send_keys(password)


@step(r'I click the login button')
def click_login(step):
    button = world.browser.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
    button.click()


@step(r'I should be on the dashboard')
def verify_dashboard(step):
    WebDriverWait(world.browser, 10).until(
        EC.url_contains('/dashboard')
    )
    assert '/dashboard' in world.browser.current_url, \
        f"Expected /dashboard but got {world.browser.current_url}"


@step(r'I should be on the login page')
def verify_login_page(step):
    assert '/login' in world.browser.current_url, \
        f"Expected /login but got {world.browser.current_url}"


@step(r'I should see "([^"]*)" on the page')
def see_text(step, text):
    WebDriverWait(world.browser, 10).until(
        EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{text}')]"))
    )
    assert text in world.browser.page_source, \
        f"Expected to see '{text}' but it was not on the page"


@step(r'I am logged in as "([^"]*)"')
def login_as(step, email):
    world.browser.get(world.base_url + '/login')
    world.browser.find_element(By.ID, 'email').send_keys(email)
    world.browser.find_element(By.ID, 'password').send_keys('password123')
    world.browser.find_element(By.CSS_SELECTOR, 'button[type="submit"]').click()
    WebDriverWait(world.browser, 10).until(
        EC.url_contains('/dashboard')
    )
```

### Common Steps (features/steps/common_steps.py)

```python
from lettuce import step, world
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


@step(r'I click "([^"]*)"')
def click_element_by_text(step, text):
    element = world.browser.find_element(By.XPATH, f"//*[text()='{text}']")
    element.click()


@step(r'I fill in "([^"]*)" with "([^"]*)"')
def fill_in_field(step, label, value):
    field = world.browser.find_element(
        By.XPATH, f"//label[contains(text(), '{label}')]/..//input"
    )
    field.clear()
    field.send_keys(value)


@step(r'I should see "([^"]*)" in the items list')
def see_in_list(step, text):
    WebDriverWait(world.browser, 10).until(
        EC.text_to_be_present_in_element(
            (By.CSS_SELECTOR, '.items-list'), text
        )
    )


@step(r'I should not see "([^"]*)" in the items list')
def not_see_in_list(step, text):
    WebDriverWait(world.browser, 10).until_not(
        EC.text_to_be_present_in_element(
            (By.CSS_SELECTOR, '.items-list'), text
        )
    )


@step(r'I confirm the deletion')
def confirm_delete(step):
    alert = WebDriverWait(world.browser, 5).until(EC.alert_is_present())
    alert.accept()
```

## Terrain (Setup/Teardown)

### terrain.py

```python
from lettuce import before, after, world
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import os


@before.all
def setup():
    world.base_url = os.environ.get('BASE_URL', 'http://localhost:3000')

    chrome_options = Options()
    if os.environ.get('HEADLESS', 'false').lower() == 'true':
        chrome_options.add_argument('--headless=new')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')

    service = Service(ChromeDriverManager().install())
    world.browser = webdriver.Chrome(service=service, options=chrome_options)
    world.browser.implicitly_wait(10)


@before.each_scenario
def before_scenario(scenario):
    world.browser.delete_all_cookies()


@after.each_scenario
def after_scenario(scenario):
    if scenario.failed:
        screenshot_dir = 'screenshots'
        os.makedirs(screenshot_dir, exist_ok=True)
        filename = scenario.name.replace(' ', '_').lower()
        world.browser.save_screenshot(f'{screenshot_dir}/{filename}.png')


@after.all
def teardown(total):
    if hasattr(world, 'browser'):
        world.browser.quit()
    print(f"\nResults: {total.scenarios_ran} scenarios, "
          f"{total.scenarios_passed} passed, "
          f"{total.scenarios_ran - total.scenarios_passed} failed")
```

## Page Object Pattern

### Base Page (features/pages/base_page.py)

```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from lettuce import world


class BasePage:
    def __init__(self):
        self.browser = world.browser
        self.wait = WebDriverWait(self.browser, 10)

    def navigate_to(self, path):
        self.browser.get(world.base_url + path)

    def find_element(self, locator):
        return self.wait.until(EC.presence_of_element_located(locator))

    def find_elements(self, locator):
        return self.wait.until(EC.presence_of_all_elements_located(locator))

    def wait_for_text(self, locator, text):
        self.wait.until(EC.text_to_be_present_in_element(locator, text))

    def get_text(self, locator):
        return self.find_element(locator).text

    def is_displayed(self, locator):
        try:
            return self.find_element(locator).is_displayed()
        except Exception:
            return False
```

### Login Page (features/pages/login_page.py)

```python
from selenium.webdriver.common.by import By
from features.pages.base_page import BasePage


class LoginPage(BasePage):
    URL = '/login'
    EMAIL_FIELD = (By.ID, 'email')
    PASSWORD_FIELD = (By.ID, 'password')
    SUBMIT_BUTTON = (By.CSS_SELECTOR, 'button[type="submit"]')
    ERROR_MESSAGE = (By.CSS_SELECTOR, '.error-message')

    def open(self):
        self.navigate_to(self.URL)
        self.find_element(self.EMAIL_FIELD)
        return self

    def login_as(self, email, password):
        email_el = self.find_element(self.EMAIL_FIELD)
        email_el.clear()
        email_el.send_keys(email)

        password_el = self.find_element(self.PASSWORD_FIELD)
        password_el.clear()
        password_el.send_keys(password)

        self.find_element(self.SUBMIT_BUTTON).click()

    def get_error(self):
        return self.get_text(self.ERROR_MESSAGE)
```

## Migration to Behave

When the project is ready to migrate from Lettuce to Behave, here is the mapping:

| Lettuce | Behave |
|---------|--------|
| `terrain.py` | `environment.py` |
| `@before.all` | `before_all(context)` |
| `@before.each_scenario` | `before_scenario(context, scenario)` |
| `world.browser` | `context.browser` |
| `@step(r'pattern')` | `@given('pattern')`, `@when('pattern')`, `@then('pattern')` |
| `step.sentence` | `context.text` |
| Feature files | Same Gherkin syntax (compatible) |

### Behave Equivalent of Terrain

```python
# environment.py (Behave)
from selenium import webdriver

def before_all(context):
    context.browser = webdriver.Chrome()
    context.base_url = 'http://localhost:3000'

def before_scenario(context, scenario):
    context.browser.delete_all_cookies()

def after_scenario(context, scenario):
    if scenario.status == 'failed':
        context.browser.save_screenshot(f'screenshots/{scenario.name}.png')

def after_all(context):
    context.browser.quit()
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Lettuce BDD Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - name: Start application
        run: python app.py &
      - name: Run Lettuce tests
        run: HEADLESS=true lettuce features/
        env:
          BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: screenshots
          path: screenshots/
```

## Best Practices

1. **Write features before code** -- Feature files should be written collaboratively with stakeholders before step implementation. They are living documentation.
2. **One scenario per behavior** -- Each scenario should test one specific behavior. Avoid scenarios with 20 steps that test multiple things.
3. **Use Background for shared setup** -- Common Given steps should go in `Background` blocks rather than being repeated in every scenario.
4. **Parameterize with Scenario Outline** -- Use `Scenario Outline` with `Examples` tables for data-driven tests instead of duplicating scenarios.
5. **Descriptive step patterns** -- Steps should read like natural English. `Given I am logged in as "admin"` is better than `Given login admin true`.
6. **Clean up in terrain hooks** -- Always clean browser cookies in `@before.each_scenario` and quit the browser in `@after.all` to prevent resource leaks.
7. **Screenshot on failure** -- Capture screenshots in `@after.each_scenario` when a scenario fails. This is critical for CI debugging.
8. **Use Page Objects with steps** -- Combine Lettuce steps with Page Object classes to keep selectors and actions encapsulated.
9. **Tag scenarios for selective runs** -- Use Gherkin tags (`@smoke`, `@regression`) to organize and filter test execution.
10. **Plan migration to Behave** -- For active projects, create a migration plan to Behave. Feature files are compatible; only step definitions and terrain need rewriting.

## Anti-Patterns

1. **Imperative scenarios** -- Writing low-level steps like "Click button with id submit" instead of declarative "When I submit the login form". Scenarios should describe what, not how.
2. **World object as global dump** -- Storing everything on `world` without cleanup. Keep `world` clean and reset state in terrain hooks.
3. **Tightly coupled steps** -- Steps that only work in one specific scenario. Use regex groups to make steps reusable across features.
4. **No explicit waits** -- Relying on `implicitly_wait` alone. Use `WebDriverWait` with expected conditions for dynamic content.
5. **Giant step definition files** -- One `steps.py` with 200 step definitions. Split by feature area into `auth_steps.py`, `dashboard_steps.py`, etc.
6. **Hardcoded test data** -- Embedding user credentials and URLs directly in feature files. Use environment variables and data helpers.
7. **Testing UI details in features** -- Feature files should describe business behavior, not CSS selectors or DOM structure.
8. **Skipping terrain hooks** -- Not using `@before.each_scenario` for cleanup leads to shared state between scenarios and flaky tests.
9. **Ignoring the legacy status** -- Starting new projects with Lettuce instead of Behave. Lettuce lacks community support and modern Python compatibility.
10. **No error screenshots** -- Running tests in CI without capturing screenshots on failure makes debugging impossible.

## Run Commands

```bash
# Run all features
lettuce

# Run specific feature
lettuce features/auth/login.feature

# Run with verbosity
lettuce --verbosity=3

# Run with tag (requires tag support)
lettuce --tag=smoke

# Run headless
HEADLESS=true lettuce features/

# Run with custom base URL
BASE_URL=http://staging.example.com lettuce features/
```
