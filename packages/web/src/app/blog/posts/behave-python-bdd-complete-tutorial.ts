import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Behave Python BDD: Complete Tutorial 2026',
  description:
    'Hands-on Behave Python BDD tutorial. Installation, project structure, feature files, step definitions, hooks, tags, scenario outlines, fixtures, reporting, parallel execution, and Selenium/Playwright integration for 2026.',
  date: '2026-05-08',
  category: 'Tutorial',
  content: `
# Behave Python BDD: Complete Tutorial 2026

Behave is the most widely-used Behavior-Driven Development framework in the Python ecosystem. Designed as a direct port of Cucumber's philosophy to Python, it has been the safe default for Python teams adopting BDD since 2013. In 2026 it remains the most readable, easiest-to-onboard BDD framework for Python developers and QA engineers, especially when combined with modern browser automation tools like Playwright.

This tutorial walks through everything you need to build a complete Behave BDD suite from scratch: installation, project structure, your first feature file, hooks via environment.py, tags, scenario outlines, data tables, fixtures, reporting, parallel execution via behavex, and integration with Selenium and Playwright. Every example is current with Behave 1.2.6+ running on Python 3.13.

By the end you will have a production-ready Behave project that scales from a handful of scenarios to hundreds, with clean step definitions, proper isolation, parallel CI runs, and stakeholder-friendly Allure reports.

## Key Takeaways

- **Behave is the closest Python equivalent to Cucumber-JVM**.
- **Project structure is convention-driven** -- features/, steps/, environment.py.
- **Hooks live in environment.py** -- before_all, before_scenario, after_step.
- **Tags filter what runs** -- @smoke for fast checks, @regression for full suite.
- **Parallel execution uses behavex** -- not built-in.

---

## 1. Installation

\`\`\`bash
pip install behave allure-behave playwright pytest-html
playwright install chromium
\`\`\`

For Python 3.13 ensure you have venv set up:

\`\`\`bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install behave==1.2.6.dev6 allure-behave
\`\`\`

## 2. Project Structure

The Behave convention:

\`\`\`
my-project/
  features/
    accounts/
      signin.feature
      signup.feature
    steps/
      accounts_steps.py
      common_steps.py
    environment.py
  behave.ini
  requirements.txt
\`\`\`

## 3. Your First Feature File

\`\`\`gherkin
# features/accounts/signin.feature
Feature: User sign-in

  Background:
    Given a registered user with email "alice@example.com" and password "Sup3rS3cret!"

  @smoke @auth
  Scenario: Successful sign-in
    Given the user is on the sign-in page
    When they enter email "alice@example.com" and password "Sup3rS3cret!"
    And they submit the form
    Then they should be redirected to the dashboard

  Scenario Outline: Invalid sign-in attempts
    Given the user is on the sign-in page
    When they enter email "<email>" and password "<password>"
    And they submit the form
    Then they should see error "<error>"

    Examples:
      | email             | password    | error                |
      | not-an-email      | Sup3rS3cret!| Invalid email        |
      | alice@example.com | wrong       | Invalid credentials  |
      | unknown@x.com     | whatever    | Invalid credentials  |
\`\`\`

## 4. Step Definitions

\`\`\`python
# features/steps/accounts_steps.py
from behave import given, when, then
from playwright.sync_api import expect

@given('a registered user with email "{email}" and password "{password}"')
def step_create_user(context, email, password):
    context.api.create_user(email=email, password=password)
    context.email = email
    context.password = password

@given("the user is on the sign-in page")
def step_open_signin(context):
    context.page.goto(f"{context.base_url}/signin")
    expect(context.page.locator("h1")).to_contain_text("Sign in")

@when('they enter email "{email}" and password "{password}"')
def step_enter_credentials(context, email, password):
    context.page.fill('[data-testid="email"]', email)
    context.page.fill('[data-testid="password"]', password)

@when("they submit the form")
def step_submit(context):
    context.page.click('[data-testid="submit"]')

@then("they should be redirected to the dashboard")
def step_redirected(context):
    expect(context.page).to_have_url(f"{context.base_url}/dashboard")

@then('they should see error "{error}"')
def step_see_error(context, error):
    expect(context.page.locator('[role="alert"]')).to_contain_text(error)
\`\`\`

## 5. environment.py: Hooks Done Right

\`\`\`python
# features/environment.py
import os
from playwright.sync_api import sync_playwright
from api_helpers import ApiClient

def before_all(context):
    context.base_url = os.getenv("BASE_URL", "http://localhost:3000")
    context.api = ApiClient(context.base_url)
    context.playwright = sync_playwright().start()
    context.browser = context.playwright.chromium.launch(
        headless=os.getenv("HEADLESS", "true").lower() == "true",
        slow_mo=int(os.getenv("SLOWMO", "0")),
    )

def before_scenario(context, scenario):
    context.browser_ctx = context.browser.new_context(
        viewport={"width": 1280, "height": 720},
        record_video_dir="reports/videos" if "video" in scenario.tags else None,
    )
    context.page = context.browser_ctx.new_page()
    context.api.reset()

def after_step(context, step):
    if step.status == "failed":
        path = f"reports/screenshots/{context.scenario.name}-{step.name}.png"
        context.page.screenshot(path=path, full_page=True)

def after_scenario(context, scenario):
    context.browser_ctx.close()

def after_all(context):
    context.browser.close()
    context.playwright.stop()
\`\`\`

## 6. Tags

Tag scenarios for selective execution:

\`\`\`bash
behave --tags @smoke
behave --tags @smoke,@regression
behave --tags "@smoke and not @wip"
\`\`\`

Combine with environment variables for CI:

\`\`\`bash
behave --tags @smoke -D base_url=https://staging.example.com
\`\`\`

## 7. Scenario Outlines and Data Tables

Data tables for complex setup:

\`\`\`gherkin
Scenario: Bulk add items to cart
  Given the user is logged in
  When they add the following items to the cart:
    | Item    | Quantity |
    | Widget  | 2        |
    | Gadget  | 1        |
    | Gizmo   | 3        |
  Then the cart total quantity should be 6
\`\`\`

\`\`\`python
@when("they add the following items to the cart:")
def step_add_items(context):
    for row in context.table:
        context.page.goto(f"{context.base_url}/catalog?q={row['Item']}")
        for _ in range(int(row['Quantity'])):
            context.page.click('[data-testid="add-to-cart"]')
\`\`\`

## 8. Allure Reporting

Run Behave with allure-behave:

\`\`\`bash
behave -f allure_behave.formatter:AllureFormatter -o reports/allure-results
allure serve reports/allure-results
\`\`\`

Allure produces a navigable HTML report with screenshots, videos, and history.

## 9. Parallel Execution with behavex

Install behavex:

\`\`\`bash
pip install behavex
\`\`\`

Run with parallel processes:

\`\`\`bash
behavex --parallel-processes 4 --parallel-scheme scenario --tags @smoke
\`\`\`

## 10. behave.ini Configuration

\`\`\`ini
[behave]
default_format = pretty
show_skipped = false
junit = true
junit_directory = reports/junit
logging_clear_handlers = true

[behave.userdata]
base_url = http://localhost:3000
headless = true
\`\`\`

## 11. CI Integration

GitHub Actions:

\`\`\`yaml
name: BDD Tests
on: [push]
jobs:
  behave:
    runs-on: ubuntu-22.04
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.13' }
      - run: pip install -r requirements.txt
      - run: playwright install chromium
      - run: behavex --parallel-processes 2 --tags @smoke
        env: { BASE_URL: 'http://localhost:3000' }
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: behave-report-\${{ matrix.shard }}, path: reports/ }
\`\`\`

## 12. Best Practices

1. **One feature file per user story** - keeps the suite navigable.
2. **Step definitions in steps/ by domain** - accounts_steps.py, checkout_steps.py.
3. **Background should be short** - 3-5 steps max.
4. **Use scenario outlines for boundary cases** - not for unrelated scenarios.
5. **Tag every scenario** - @smoke, @regression, @wip discipline.

## 13. AI-Assisted Authoring

The [behave](/skills) SKILL.md pack on QASkills teaches Claude or Cursor to generate Behave step definitions matching your house style. See [cursor-skills-md-best-practices](/blog) for setup.

## 14. Advanced Behave Patterns

### Userdata for Configuration
behave's --userdata flag passes config to scenarios:

\`\`\`bash
behave -D base_url=https://staging.example.com -D headless=false
\`\`\`

In environment.py:

\`\`\`python
def before_all(context):
    userdata = context.config.userdata
    context.base_url = userdata.get('base_url', 'http://localhost:3000')
    context.headless = userdata.getbool('headless', True)
\`\`\`

### Tag Combination Logic
behave supports rich tag expressions:

\`\`\`bash
behave --tags='@smoke and not @flaky'
behave --tags='@critical or @release-1.5'
behave --tags='@regression and (@api or @ui)'
\`\`\`

### Custom Formatters
Beyond pretty, JSON, JUnit, behave supports custom formatters:

\`\`\`python
# formatters/slack.py
from behave.formatter.base import Formatter
import requests

class SlackFormatter(Formatter):
    def feature(self, feature): ...
    def scenario(self, scenario): ...
    def step(self, step): ...
    def end_of_run(self):
        requests.post(SLACK_WEBHOOK, json={'text': f'{self.passed}/{self.total} passed'})
\`\`\`

### Per-Step Hooks
\`\`\`python
def before_step(context, step):
    context.step_start = time.time()

def after_step(context, step):
    elapsed = time.time() - context.step_start
    if elapsed > 5:
        print(f'Slow step ({elapsed:.1f}s): {step.name}')
\`\`\`

### Behave with Selenium
\`\`\`python
# environment.py
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

def before_scenario(context, scenario):
    options = Options()
    options.add_argument('--headless=new')
    context.driver = webdriver.Chrome(options=options)

def after_scenario(context, scenario):
    if scenario.status == 'failed':
        context.driver.save_screenshot(f'reports/{scenario.name}.png')
    context.driver.quit()
\`\`\`

### API Steps with httpx
\`\`\`python
import httpx

@given('I have authenticated as {role}')
def step_auth(context, role):
    creds = USERS[role]
    r = httpx.post(f'{context.base_url}/auth/login', json=creds)
    r.raise_for_status()
    context.token = r.json()['token']
    context.headers = {'Authorization': f'Bearer {context.token}'}

@when('I create an order for {amount:f}')
def step_create_order(context, amount):
    r = httpx.post(
        f'{context.base_url}/orders',
        json={'amount': amount},
        headers=context.headers,
    )
    context.response = r
\`\`\`

## 15. Async Behave

Behave 1.2.6+ supports async step definitions:

\`\`\`python
from behave.api.async_step import async_run_until_complete

@async_run_until_complete
@given('the service is healthy')
async def step_service_healthy(context):
    async with httpx.AsyncClient() as client:
        r = await client.get(f'{context.base_url}/health')
        assert r.status_code == 200
\`\`\`

## 16. Behave + Playwright Async API

\`\`\`python
from playwright.async_api import async_playwright
from behave.api.async_step import async_run_until_complete

def before_all(context):
    context.loop = asyncio.new_event_loop()

@async_run_until_complete
@given('the page is loaded')
async def step_page_loaded(context):
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page()
        await page.goto(context.base_url)
\`\`\`

## 17. Reporting Recipes

### Allure with Screenshots
\`\`\`python
import allure

@allure.step
def after_step(context, step):
    if step.status == 'failed':
        png = context.page.screenshot()
        allure.attach(png, name='failure', attachment_type=allure.attachment_type.PNG)
\`\`\`

### Slack Notifications
After CI runs, send results to Slack via a simple webhook hook (see Custom Formatters above).

### JIRA Integration
Map @JIRA-1234 tags to JIRA tickets. After a run, post results to JIRA via REST API.

## 18. Frequently Asked Questions

**Q: Can Behave run in parallel without behavex?**
A: Not natively. behavex is the standard parallel runner.

**Q: How do I share state between scenarios?**
A: Avoid it. State should be reset between scenarios via factories and database truncation.

**Q: Can I use pytest fixtures in Behave?**
A: Not directly. Behave uses its own context model. For pytest fixtures, choose pytest-bdd instead.

**Q: Behave on Windows?**
A: Yes -- fully supported. Just use forward slashes in paths or Path objects.

**Q: AI agents for Behave?**
A: Yes -- the [behave-python](/skills) SKILL.md pack on QASkills teaches Claude or Cursor to generate Behave step definitions matching your conventions.

## Conclusion

Behave is the most approachable Python BDD framework, with conventions that map cleanly to Cucumber-JVM. The combination with Playwright produces stable, readable, parallel-capable suites that scale comfortably. For context on alternatives see [cucumber-vs-behave-python-bdd-comparison](/blog).
`,
};
