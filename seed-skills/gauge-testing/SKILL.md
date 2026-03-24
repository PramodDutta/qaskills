---
name: "Gauge Testing"
description: "Test automation with Gauge framework using Markdown specifications, step implementations in Java/Python/JavaScript/Ruby/C#, concepts, data-driven testing, and living documentation."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [gauge, thoughtworks, bdd, markdown, specifications, acceptance-testing, living-documentation]
testingTypes: [bdd, acceptance, e2e, integration]
frameworks: [gauge]
languages: [java, python, javascript, ruby, csharp]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Gauge Testing

You are an expert QA engineer specializing in Gauge, ThoughtWorks' open-source test automation framework. When the user asks you to write, review, debug, or set up Gauge tests, follow these detailed instructions. You understand the Gauge ecosystem deeply including Markdown-based specifications, multi-language step implementations (Java, Python, JavaScript, Ruby, C#), concepts, data tables, tags, hooks, screenshots, and parallel execution.

## Core Principles

1. **Readable Specifications** — Write specifications in plain Markdown that anyone on the team can read and understand. Specifications are living documentation, not just tests.
2. **Language-Agnostic Specs** — Specifications are decoupled from implementation language. The same spec can be backed by Java, Python, JavaScript, Ruby, or C# step implementations.
3. **Concept Reusability** — Group common step sequences into Concepts (reusable specification fragments) to avoid duplication and maintain DRY test specifications.
4. **Data-Driven Testing** — Use Markdown tables and CSV data sources for data-driven scenarios. Parameterize specifications rather than duplicating them.
5. **Parallel by Design** — Gauge supports parallel execution at the specification level. Design tests for isolation from the start.
6. **Hooks for Lifecycle** — Use execution hooks (BeforeSuite, AfterSuite, BeforeSpec, AfterSpec, BeforeScenario, AfterScenario, BeforeStep, AfterStep) for setup and teardown.
7. **Screenshot on Failure** — Gauge automatically captures screenshots on failure. Configure custom screenshot strategies for non-browser tests.

## Project Structure

```
project-root/
├── manifest.json                  # Gauge project configuration
├── env/
│   ├── default/
│   │   └── default.properties     # Default environment variables
│   ├── staging/
│   │   └── staging.properties     # Staging environment overrides
│   └── ci/
│       └── ci.properties          # CI environment overrides
├── specs/
│   ├── auth/
│   │   ├── login.spec             # Login specification
│   │   ├── signup.spec            # Signup specification
│   │   └── concepts/
│   │       └── auth.cpt           # Auth-related concepts
│   ├── shopping/
│   │   ├── cart.spec
│   │   ├── checkout.spec
│   │   └── concepts/
│   │       └── shopping.cpt
│   └── api/
│       ├── users_api.spec
│       └── orders_api.spec
├── src/test/java/                 # Java step implementations
│   ├── steps/
│   │   ├── AuthSteps.java
│   │   ├── ShoppingSteps.java
│   │   └── ApiSteps.java
│   ├── pages/
│   │   ├── BasePage.java
│   │   ├── LoginPage.java
│   │   └── DashboardPage.java
│   └── hooks/
│       └── ExecutionHooks.java
├── reports/
│   └── html-report/
└── pom.xml                        # Maven configuration (Java)
```

## Detailed Code Examples

### Specification File (Markdown)

```markdown
# User Authentication

Tags: auth, smoke

## Successful Login
Tags: positive, critical

* Navigate to login page
* Enter email "user@example.com"
* Enter password "SecurePass123"
* Click the login button
* Verify user is on the dashboard
* Verify welcome message contains "Welcome"

## Login with Invalid Credentials
Tags: negative

* Navigate to login page
* Enter email "user@example.com"
* Enter password "wrongpassword"
* Click the login button
* Verify error message "Invalid credentials" is displayed
* Verify user is still on the login page

## Login Validation Errors

|email              |password      |error                 |
|-------------------|-------------|----------------------|
|                   |SecurePass123|Email is required     |
|user@example.com   |             |Password is required  |
|invalid-email      |SecurePass123|Invalid email format  |

* Navigate to login page
* Enter email <email>
* Enter password <password>
* Click the login button
* Verify error message <error> is displayed
```

### Concepts (Reusable Step Groups)

```markdown
# Login as user with email <email> and password <password>
* Navigate to login page
* Enter email <email>
* Enter password <password>
* Click the login button
* Verify user is on the dashboard

# Create a new user with name <name> and email <email>
* Send POST request to "/api/users" with name <name> and email <email>
* Verify response status code is "201"
* Save created user ID

# Add product to cart and verify
* Click "Add to Cart" button for the current product
* Verify cart count increases by "1"
* Verify success notification is displayed
```

### Step Implementations (Java)

```java
// src/test/java/steps/AuthSteps.java
package steps;

import com.thoughtworks.gauge.Step;
import com.thoughtworks.gauge.Table;
import com.thoughtworks.gauge.TableRow;
import com.thoughtworks.gauge.datastore.ScenarioDataStore;
import org.openqa.selenium.WebDriver;
import pages.LoginPage;
import pages.DashboardPage;

import static org.assertj.core.api.Assertions.assertThat;

public class AuthSteps {

    private final LoginPage loginPage;
    private final DashboardPage dashboardPage;

    public AuthSteps() {
        WebDriver driver = DriverFactory.getDriver();
        this.loginPage = new LoginPage(driver);
        this.dashboardPage = new DashboardPage(driver);
    }

    @Step("Navigate to login page")
    public void navigateToLoginPage() {
        loginPage.open();
        assertThat(loginPage.isLoaded()).isTrue();
    }

    @Step("Enter email <email>")
    public void enterEmail(String email) {
        loginPage.enterEmail(email);
    }

    @Step("Enter password <password>")
    public void enterPassword(String password) {
        loginPage.enterPassword(password);
    }

    @Step("Click the login button")
    public void clickLoginButton() {
        loginPage.clickLogin();
    }

    @Step("Verify user is on the dashboard")
    public void verifyOnDashboard() {
        assertThat(dashboardPage.isLoaded())
            .as("User should be on the dashboard")
            .isTrue();
    }

    @Step("Verify welcome message contains <text>")
    public void verifyWelcomeMessage(String text) {
        String message = dashboardPage.getWelcomeMessage();
        assertThat(message)
            .as("Welcome message should contain '%s'", text)
            .contains(text);
    }

    @Step("Verify error message <message> is displayed")
    public void verifyErrorMessage(String message) {
        String actual = loginPage.getErrorMessage();
        assertThat(actual)
            .as("Error message should be '%s'", message)
            .isEqualTo(message);
    }

    @Step("Verify user is still on the login page")
    public void verifyStillOnLoginPage() {
        assertThat(loginPage.isLoaded())
            .as("User should still be on the login page")
            .isTrue();
    }
}
```

### Step Implementations (Python)

```python
# step_impl/auth_steps.py
from getgauge.python import step, before_scenario, after_scenario, data_store
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage


@before_scenario
def setup_browser(context):
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--window-size=1920,1080")
    driver = webdriver.Chrome(options=chrome_options)
    data_store.scenario["driver"] = driver
    data_store.scenario["login_page"] = LoginPage(driver)
    data_store.scenario["dashboard_page"] = DashboardPage(driver)


@after_scenario
def teardown_browser(context):
    driver = data_store.scenario.get("driver")
    if driver:
        driver.quit()


@step("Navigate to login page")
def navigate_to_login():
    page = data_store.scenario["login_page"]
    page.open()
    assert page.is_loaded(), "Login page did not load"


@step("Enter email <email>")
def enter_email(email):
    data_store.scenario["login_page"].enter_email(email)


@step("Enter password <password>")
def enter_password(password):
    data_store.scenario["login_page"].enter_password(password)


@step("Click the login button")
def click_login():
    data_store.scenario["login_page"].click_login()


@step("Verify user is on the dashboard")
def verify_on_dashboard():
    page = data_store.scenario["dashboard_page"]
    assert page.is_loaded(), "Dashboard did not load"


@step("Verify welcome message contains <text>")
def verify_welcome(text):
    page = data_store.scenario["dashboard_page"]
    message = page.get_welcome_message()
    assert text in message, f"Expected '{text}' in '{message}'"


@step("Verify error message <message> is displayed")
def verify_error(message):
    page = data_store.scenario["login_page"]
    actual = page.get_error_message()
    assert actual == message, f"Expected '{message}', got '{actual}'"
```

### Step Implementations (JavaScript)

```javascript
// tests/step_implementation.js
const { Step, BeforeSuite, AfterSuite, BeforeScenario, AfterScenario } = require('gauge-ts');
const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

let driver;

BeforeScenario(async () => {
  driver = await new Builder().forBrowser('chrome').build();
});

AfterScenario(async () => {
  if (driver) await driver.quit();
});

Step('Navigate to login page', async () => {
  await driver.get(process.env.BASE_URL + '/login');
  await driver.wait(until.elementLocated(By.css('[data-testid="email-input"]')), 10000);
});

Step('Enter email <email>', async (email) => {
  const input = await driver.findElement(By.css('[data-testid="email-input"]'));
  await input.clear();
  await input.sendKeys(email);
});

Step('Enter password <password>', async (password) => {
  const input = await driver.findElement(By.css('[data-testid="password-input"]'));
  await input.clear();
  await input.sendKeys(password);
});

Step('Click the login button', async () => {
  await driver.findElement(By.css('[data-testid="login-submit"]')).click();
});

Step('Verify user is on the dashboard', async () => {
  await driver.wait(until.urlContains('/dashboard'), 10000);
  const url = await driver.getCurrentUrl();
  assert(url.includes('/dashboard'), `Expected dashboard URL, got ${url}`);
});

Step('Verify error message <message> is displayed', async (message) => {
  const element = await driver.wait(
    until.elementLocated(By.css('[data-testid="error-message"]')), 10000
  );
  const text = await element.getText();
  assert.strictEqual(text, message, `Expected '${message}', got '${text}'`);
});
```

### Page Object (Java)

```java
// src/test/java/pages/BasePage.java
package pages;

import org.openqa.selenium.*;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;

public abstract class BasePage {
    protected WebDriver driver;
    protected WebDriverWait wait;
    protected String baseUrl;

    public BasePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        this.baseUrl = System.getenv("BASE_URL") != null
            ? System.getenv("BASE_URL") : "http://localhost:3000";
    }

    protected WebElement findElement(By locator) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
    }

    protected void click(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    }

    protected void type(By locator, String text) {
        WebElement element = findElement(locator);
        element.clear();
        element.sendKeys(text);
    }

    protected String getText(By locator) {
        return findElement(locator).getText();
    }

    protected void waitForUrl(String urlPart) {
        wait.until(ExpectedConditions.urlContains(urlPart));
    }

    public void takeScreenshot(String name) {
        TakesScreenshot ts = (TakesScreenshot) driver;
        byte[] screenshot = ts.getScreenshotAs(OutputType.BYTES);
        Gauge.writeMessage("Screenshot: " + name);
        Gauge.captureScreenshot();
    }
}

// src/test/java/pages/LoginPage.java
package pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class LoginPage extends BasePage {
    private static final By EMAIL_INPUT = By.cssSelector("[data-testid='email-input']");
    private static final By PASSWORD_INPUT = By.cssSelector("[data-testid='password-input']");
    private static final By LOGIN_BUTTON = By.cssSelector("[data-testid='login-submit']");
    private static final By ERROR_MESSAGE = By.cssSelector("[data-testid='error-message']");

    public LoginPage(WebDriver driver) { super(driver); }

    public void open() {
        driver.get(baseUrl + "/login");
    }

    public void enterEmail(String email) { type(EMAIL_INPUT, email); }
    public void enterPassword(String password) { type(PASSWORD_INPUT, password); }
    public void clickLogin() { click(LOGIN_BUTTON); }
    public String getErrorMessage() { return getText(ERROR_MESSAGE); }
    public boolean isLoaded() {
        try { findElement(EMAIL_INPUT); return true; }
        catch (Exception e) { return false; }
    }
}
```

### Execution Hooks

```java
// src/test/java/hooks/ExecutionHooks.java
package hooks;

import com.thoughtworks.gauge.*;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public class ExecutionHooks {

    @BeforeSuite
    public void beforeSuite() {
        System.out.println("Test suite starting...");
    }

    @AfterSuite
    public void afterSuite() {
        System.out.println("Test suite completed.");
    }

    @BeforeScenario
    public void beforeScenario(ExecutionContext context) {
        ChromeOptions options = new ChromeOptions();
        if (System.getenv("CI") != null) {
            options.addArguments("--headless", "--no-sandbox", "--disable-dev-shm-usage");
        }
        options.addArguments("--window-size=1920,1080");
        WebDriver driver = new ChromeDriver(options);
        DriverFactory.setDriver(driver);
        System.out.println("Starting scenario: " + context.getCurrentScenario().getName());
    }

    @AfterScenario
    public void afterScenario(ExecutionContext context) {
        if (context.getCurrentScenario().getIsFailing()) {
            DriverFactory.getDriver().manage().window().maximize();
            Gauge.captureScreenshot();
        }
        DriverFactory.getDriver().quit();
    }

    @BeforeStep
    public void beforeStep(ExecutionContext context) {
        // Log step execution for debugging
    }

    @AfterStep
    public void afterStep(ExecutionContext context) {
        if (context.getCurrentStep().getIsFailing()) {
            Gauge.captureScreenshot();
        }
    }
}
```

### Environment Configuration

```properties
# env/default/default.properties
base_url = http://localhost:3000
browser = chrome
headless = false
implicit_wait = 10
screenshot_on_failure = true

# env/ci/ci.properties
base_url = http://staging.example.com
browser = chrome
headless = true
implicit_wait = 15
screenshot_on_failure = true
parallel_execution = true
```

### Data-Driven Testing with CSV

```markdown
# Product Search

Tags: search, data-driven

table: resources/search_data.csv

## Search for products by category
* Navigate to the product catalog
* Search for <query>
* Verify <expected_count> results are displayed
* Verify first result contains <expected_product>
```

```csv
query,expected_count,expected_product
laptop,15,MacBook Pro
headphones,8,Sony WH-1000XM5
keyboard,12,Keychron K8
```

### CI/CD Integration (GitHub Actions)

```yaml
name: Gauge Tests
on: [push, pull_request]

jobs:
  gauge-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Install Gauge
        run: |
          curl -SsL https://downloads.gauge.org/stable | sh
          gauge install java
          gauge install html-report
          gauge install screenshot
      - name: Start application
        run: ./start-app.sh &
      - name: Run Gauge specs
        run: gauge run --tags "smoke" --parallel -n 4 specs/
        env:
          BASE_URL: http://localhost:3000
          CI: true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: gauge-reports
          path: reports/
```

## Best Practices

1. **Write specifications in business language** — Gauge specs are Markdown, making them natural documentation. Write them so product managers can review and understand.
2. **Use concepts for reusable sequences** — Extract common step patterns into `.cpt` concept files to maintain DRY specifications.
3. **Organize specs by feature area** — Group related specifications in directories. Use tags for cross-cutting concerns (smoke, regression).
4. **Use data tables for parameterized scenarios** — Inline tables or CSV files make data-driven testing clean and easy to extend.
5. **Use data stores appropriately** — ScenarioDataStore for scenario scope, SpecDataStore for specification scope, SuiteDataStore for global data.
6. **Implement proper Page Objects** — Keep step implementations thin. Business logic and browser interactions belong in page objects.
7. **Configure environment-specific properties** — Use Gauge's env directory to manage configuration for different environments.
8. **Enable parallel execution** — Use `gauge run --parallel -n <threads>` for faster execution. Design specs to be independent.
9. **Capture screenshots on failure** — Use `Gauge.captureScreenshot()` in AfterStep hooks to automatically capture failure evidence.
10. **Generate HTML reports** — Use gauge's built-in HTML report plugin for comprehensive test results with screenshots and step details.

## Anti-Patterns to Avoid

1. **Avoid implementation details in specs** — Specifications should describe behavior, not browser interactions like `Click CSS #btn-submit`.
2. **Avoid monolithic step files** — Split step implementations by domain (auth, shopping, API) for maintainability.
3. **Avoid coupling between scenarios** — Each scenario must be independently executable. Never depend on previous scenario outcomes.
4. **Avoid hardcoded data** — Use environment properties and data tables. Hardcoded URLs and credentials break portability.
5. **Avoid long scenarios** — Keep scenarios focused on one behavior. If a scenario exceeds 10 steps, extract concepts or decompose.
6. **Avoid ignoring Gauge's data stores** — Use ScenarioDataStore instead of global variables. Data stores are properly scoped and thread-safe.
7. **Avoid skipping hooks** — Always implement AfterScenario to clean up resources (browsers, database records, temp files).
8. **Avoid duplicate steps** — If multiple step files define the same step, Gauge raises ambiguity errors. Centralize shared steps.
9. **Avoid testing external services directly** — Mock external APIs. Gauge tests should verify your application's behavior, not third-party services.
10. **Avoid missing tags** — Tag every specification and scenario. Tags enable selective execution, reporting, and hook targeting.
