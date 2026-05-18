import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cucumber BDD Tutorial for Beginners: Gherkin, Step Definitions, and Automation',
  description:
    'Complete Cucumber BDD tutorial for beginners covering Gherkin syntax, Given/When/Then step definitions in Java and TypeScript, scenario outlines, hooks, tags, and automation with Selenium and Playwright.',
  date: '2026-05-18',
  category: 'Tutorial',
  content: `
Cucumber is the most widely adopted behavior-driven development framework in the testing industry, and for good reason. It lets teams write executable specifications in plain English using Gherkin syntax, then maps those specifications to automated test code through step definitions. This means business stakeholders, developers, and QA engineers all read the same document -- and that document actually runs as a test suite. If you have been writing automated tests in isolation and wondering why your team still argues about what a feature should do, Cucumber BDD closes that gap.

This tutorial takes you from zero to a fully functioning Cucumber project. You will learn Gherkin syntax, write feature files, implement step definitions in both Java and TypeScript, use scenario outlines and data tables for data-driven testing, configure hooks and tags for test organization, generate rich reports, and integrate Cucumber with Selenium and Playwright for browser automation. By the end, you will have a production-ready BDD framework.

---

## Key Takeaways

- **BDD is a collaboration practice first** -- Cucumber provides the tooling, but the real value comes from structured conversations between business, development, and QA before writing any code
- **Gherkin syntax uses Given/When/Then** -- these keywords define preconditions, actions, and expected outcomes in a language everyone on the team can understand
- **Step definitions bridge language and code** -- each Gherkin line maps to a function in Java, TypeScript, JavaScript, Ruby, or any supported language
- **Scenario outlines eliminate duplication** -- parameterized scenarios let you run the same test logic against multiple data combinations from an Examples table
- **Data tables handle complex inputs** -- when a step needs structured data like a list of products or a form with multiple fields, Gherkin data tables provide clean syntax
- **Hooks and tags control execution** -- Before/After hooks manage setup and teardown while tags let you filter which scenarios run in different environments
- **Cucumber integrates with any browser automation library** -- Selenium WebDriver, Playwright, and Cypress can all serve as the automation layer behind your step definitions
- **Reports transform test results into living documentation** -- Cucumber JSON reports feed into tools like Allure, Cucumber HTML Reporter, and custom dashboards

---

## What Is Cucumber BDD?

Cucumber is an open-source testing framework that supports behavior-driven development. Created by Aslak Hellesoy in 2008, it was originally a Ruby tool but has since expanded to support Java (via cucumber-jvm), JavaScript/TypeScript (via cucumber-js), Python (via behave, which uses the same Gherkin syntax), and several other languages.

The core idea is simple: you write test specifications in a structured natural language format called Gherkin, save them in \`.feature\` files, and then write code (step definitions) that executes when each line of the specification runs. The specification is both human-readable documentation and an executable test.

### Why BDD Matters

Traditional test automation often suffers from a disconnect. QA engineers write automated tests that verify technical behaviors, but business stakeholders cannot read those tests to confirm they match the actual requirements. This leads to a cycle where:

1. Business writes requirements in a Word document or Jira ticket
2. Developers interpret those requirements and build features
3. QA writes test cases based on their own interpretation
4. Bugs are found because all three groups had different understandings

BDD breaks this cycle by making the specification itself executable. When the product owner reads a Gherkin scenario and says "yes, that is exactly what I want," and that same scenario passes in automation, everyone has confidence the feature works correctly.

### Three Amigos Sessions

The BDD process typically begins with a **Three Amigos** meeting. Before any feature is implemented, three perspectives gather:

- **Business** -- the product owner or business analyst who defines the "what" and "why"
- **Development** -- the engineer who identifies technical constraints and implementation details
- **QA** -- the tester who asks "what could go wrong?" and surfaces edge cases

Together, they produce concrete examples of how the feature should behave. These examples become your Gherkin scenarios.

---

## Getting Started with Gherkin Syntax

Gherkin is the language Cucumber uses to define test scenarios. It is designed to be readable by non-technical team members while being structured enough for a parser to process. Every Gherkin document lives in a \`.feature\` file.

### The Basic Structure

A feature file has this structure:

\`\`\`gherkin
Feature: User Login
  As a registered user
  I want to log into my account
  So that I can access my dashboard

  Scenario: Successful login with valid credentials
    Given a registered user with email "alice@example.com"
    And the user has password "SecurePass123!"
    When the user navigates to the login page
    And the user enters their email and password
    And the user clicks the login button
    Then the user should see the dashboard
    And the welcome message should display "Hello, Alice"
\`\`\`

Let us break down each element:

**Feature**: A high-level description of the functionality being tested. The text after "Feature:" is the feature name. The indented lines below it are a free-text description -- Cucumber ignores them during execution, but they provide valuable context.

**Scenario**: A single concrete example of the feature's behavior. Each scenario is an independent test case.

**Given**: Establishes the initial context or precondition. Think of it as the "setup" phase.

**When**: Describes the action the user takes. This is the trigger.

**Then**: Defines the expected outcome. This is your assertion.

**And / But**: Continuation keywords that make scenarios more readable. \`And\` after a \`Given\` is treated as another \`Given\`. \`And\` after a \`Then\` is treated as another \`Then\`.

### Keywords Deep Dive

| Keyword | Purpose | Example |
|---|---|---|
| **Feature** | Groups related scenarios | Feature: Shopping Cart |
| **Scenario** | One specific behavior example | Scenario: Add item to empty cart |
| **Given** | Precondition / setup | Given the user is logged in |
| **When** | Action / trigger | When the user clicks "Add to Cart" |
| **Then** | Expected outcome / assertion | Then the cart should contain 1 item |
| **And** | Additional step (inherits previous keyword type) | And the total should be \$29.99 |
| **But** | Negative additional step | But the checkout button should be disabled |
| **Background** | Steps that run before every scenario in a feature | Background: Given a logged-in user |
| **Scenario Outline** | Parameterized scenario template | Scenario Outline: Login with <status> credentials |
| **Examples** | Data table for Scenario Outline | Examples: valid/invalid credential combinations |

### Background Section

When multiple scenarios in a feature share the same setup steps, use a \`Background\` block:

\`\`\`gherkin
Feature: Shopping Cart
  Background:
    Given a registered user is logged in
    And the product catalog has the following items:
      | name        | price  | stock |
      | Laptop      | 999.99 | 10    |
      | Mouse       | 29.99  | 50    |
      | Keyboard    | 79.99  | 30    |

  Scenario: Add single item to cart
    When the user adds "Laptop" to the cart
    Then the cart should contain 1 item
    And the cart total should be 999.99

  Scenario: Add multiple items to cart
    When the user adds "Mouse" to the cart
    And the user adds "Keyboard" to the cart
    Then the cart should contain 2 items
    And the cart total should be 109.98
\`\`\`

The Background steps execute before each scenario -- not once for the entire feature. This is important for test isolation.

---

## Scenario Outlines and Data-Driven Testing

One of Cucumber's most powerful features is the Scenario Outline, which lets you run the same test logic against multiple data combinations without duplicating the scenario.

### Basic Scenario Outline

\`\`\`gherkin
Feature: Login Validation

  Scenario Outline: Login with different credential combinations
    Given the user is on the login page
    When the user enters email "<email>" and password "<password>"
    And the user clicks the login button
    Then the user should see "<result>"

    Examples:
      | email              | password      | result              |
      | alice@example.com  | SecurePass1!  | Dashboard           |
      | bob@example.com    | wrongpass     | Invalid credentials |
      |                    | SecurePass1!  | Email is required   |
      | alice@example.com  |               | Password is required|
      | invalid-email      | SecurePass1!  | Invalid email format|
\`\`\`

The \`<email>\`, \`<password>\`, and \`<result>\` placeholders are replaced with values from the Examples table. Each row becomes a separate test execution. In this example, Cucumber runs five independent tests from a single scenario definition.

### Multiple Examples Tables

You can have multiple Examples tables with different names:

\`\`\`gherkin
Scenario Outline: User registration validation
  Given the user is on the registration page
  When the user submits the form with name "<name>" and email "<email>"
  Then the registration should be "<outcome>"

  Examples: Valid registrations
    | name        | email                | outcome    |
    | Alice Smith | alice@example.com    | successful |
    | Bob Jones   | bob@company.org      | successful |

  Examples: Invalid registrations
    | name | email           | outcome                |
    |      | test@test.com   | Name is required       |
    | Test | invalid-email   | Email format is invalid|
    | Test |                 | Email is required      |
\`\`\`

### Data Tables in Steps

Data tables are different from Examples tables. They provide structured data to a single step:

\`\`\`gherkin
Scenario: Create a user with full profile
  Given the following user details:
    | field     | value              |
    | name      | Alice Smith        |
    | email     | alice@example.com  |
    | role      | admin              |
    | company   | TechCorp           |
  When the admin creates the user
  Then the user should appear in the users list
\`\`\`

You can also use data tables as lists:

\`\`\`gherkin
Scenario: User has correct permissions
  Given the user "Alice" has the following roles:
    | admin     |
    | editor    |
    | reviewer  |
  Then the user should have access to the admin panel
\`\`\`

---

## Step Definitions in Java

Step definitions are the glue between your Gherkin scenarios and your automation code. Each Gherkin step is matched to a Java method annotated with a corresponding Cucumber annotation.

### Project Setup with Maven

Start with the Maven dependencies in your \`pom.xml\`:

\`\`\`xml
<dependencies>
    <dependency>
        <groupId>io.cucumber</groupId>
        <artifactId>cucumber-java</artifactId>
        <version>7.18.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>io.cucumber</groupId>
        <artifactId>cucumber-junit-platform-engine</artifactId>
        <version>7.18.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.junit.platform</groupId>
        <artifactId>junit-platform-suite</artifactId>
        <version>1.10.2</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.seleniumhq.selenium</groupId>
        <artifactId>selenium-java</artifactId>
        <version>4.21.0</version>
        <scope>test</scope>
    </dependency>
</dependencies>
\`\`\`

### Writing Java Step Definitions

\`\`\`java
package com.example.steps;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;
import static org.junit.jupiter.api.Assertions.*;

public class LoginSteps {

    private String currentPage;
    private String userEmail;
    private String resultMessage;

    @Given("a registered user with email {string}")
    public void aRegisteredUserWithEmail(String email) {
        this.userEmail = email;
        // Set up test data -- ensure user exists in test DB
        TestDataHelper.createUser(email, "SecurePass123!");
    }

    @Given("the user has password {string}")
    public void theUserHasPassword(String password) {
        // Store password for login step
        TestContext.setPassword(password);
    }

    @When("the user navigates to the login page")
    public void theUserNavigatesToTheLoginPage() {
        driver.get("https://app.example.com/login");
        currentPage = "login";
    }

    @When("the user enters their email and password")
    public void theUserEntersTheirEmailAndPassword() {
        driver.findElement(By.id("email")).sendKeys(userEmail);
        driver.findElement(By.id("password"))
              .sendKeys(TestContext.getPassword());
    }

    @When("the user clicks the login button")
    public void theUserClicksTheLoginButton() {
        driver.findElement(By.id("login-btn")).click();
    }

    @Then("the user should see the dashboard")
    public void theUserShouldSeeTheDashboard() {
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        wait.until(ExpectedConditions.urlContains("/dashboard"));
        assertTrue(driver.getCurrentUrl().contains("/dashboard"));
    }

    @Then("the welcome message should display {string}")
    public void theWelcomeMessageShouldDisplay(String expectedMessage) {
        String actual = driver.findElement(By.id("welcome-msg")).getText();
        assertEquals(expectedMessage, actual);
    }
}
\`\`\`

### Cucumber Expressions vs Regular Expressions

Cucumber supports two pattern-matching approaches for step definitions:

**Cucumber Expressions** (recommended):

\`\`\`java
@Given("the user has {int} items in the cart")
public void theUserHasItemsInCart(int count) {
    // {int} matches an integer
}

@When("the user searches for {string}")
public void theUserSearchesFor(String query) {
    // {string} matches a quoted string
}

@Then("the price should be {double}")
public void thePriceShouldBe(double price) {
    // {double} matches a decimal number
}
\`\`\`

**Regular Expressions** (when you need more control):

\`\`\`java
@Given("^the user has (\\\\d+) items? in the cart\$")
public void theUserHasItemsInCart(int count) {
    // Regex with capture group
}

@When("^the user (?:searches|looks) for \\"(.+)\\"\$")
public void theUserSearchesFor(String query) {
    // Non-capturing group for alternatives
}
\`\`\`

Cucumber expressions are cleaner and handle most cases. Use regular expressions only when you need features like alternation or optional words that Cucumber expressions cannot handle.

### Handling Data Tables in Java

\`\`\`java
@Given("the following user details:")
public void theFollowingUserDetails(DataTable dataTable) {
    // Convert to a Map for key-value pairs
    Map<String, String> userData = dataTable.asMap(String.class, String.class);
    String name = userData.get("name");
    String email = userData.get("email");

    // Or convert to a list of maps for multi-row tables
    List<Map<String, String>> rows = dataTable.asMaps(String.class, String.class);
    for (Map<String, String> row : rows) {
        System.out.println(row.get("field") + ": " + row.get("value"));
    }
}

@Given("the product catalog has the following items:")
public void theProductCatalogHasItems(DataTable dataTable) {
    // Convert directly to a list of custom objects using a transformer
    List<Product> products = dataTable.asList(Product.class);
}
\`\`\`

---

## Step Definitions in TypeScript

Cucumber-js supports TypeScript natively. Here is how to set up and write step definitions in TypeScript.

### Project Setup

\`\`\`bash
npm init -y
npm install --save-dev @cucumber/cucumber ts-node typescript
npm install --save-dev @playwright/test
\`\`\`

Create a \`cucumber.js\` configuration file:

\`\`\`javascript
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['src/steps/**/*.ts', 'src/support/**/*.ts'],
    paths: ['src/features/**/*.feature'],
    format: [
      'progress-bar',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
    ],
    publishQuiet: true,
  },
};
\`\`\`

### Writing TypeScript Step Definitions

\`\`\`typescript
import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { Browser, Page, chromium, expect } from '@playwright/test';

let browser: Browser;
let page: Page;

Before(async function () {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  page = await context.newPage();
});

After(async function () {
  await browser.close();
});

Given('the user is on the login page', async function () {
  await page.goto('https://app.example.com/login');
});

When(
  'the user enters email {string} and password {string}',
  async function (email: string, password: string) {
    await page.fill('#email', email);
    await page.fill('#password', password);
  }
);

When('the user clicks the login button', async function () {
  await page.click('#login-btn');
});

Then('the user should see {string}', async function (expectedText: string) {
  const bodyText = await page.textContent('body');
  expect(bodyText).toContain(expectedText);
});

Then(
  'the URL should contain {string}',
  async function (expectedPath: string) {
    expect(page.url()).toContain(expectedPath);
  }
);
\`\`\`

### Using World Context in TypeScript

The World object provides shared state across steps within a single scenario:

\`\`\`typescript
import { setWorldConstructor, World } from '@cucumber/cucumber';
import { Browser, Page, BrowserContext, chromium } from '@playwright/test';

interface CustomWorld extends World {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  testData: Record<string, unknown>;
}

class PlaywrightWorld extends World implements CustomWorld {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  testData: Record<string, unknown> = {};

  async init() {
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext();
    this.page = await this.context.newPage();
  }

  async cleanup() {
    await this.context.close();
    await this.browser.close();
  }
}

setWorldConstructor(PlaywrightWorld);
\`\`\`

Then use \`this\` in step definitions:

\`\`\`typescript
Given('the user is on the login page', async function (this: CustomWorld) {
  await this.page.goto('https://app.example.com/login');
});

When('the user adds {string} to the cart', async function (this: CustomWorld, productName: string) {
  this.testData.lastProduct = productName;
  await this.page.click(\`[data-product="\${productName}"] .add-to-cart\`);
});
\`\`\`

---

## Hooks -- Setup and Teardown

Hooks run before and after scenarios, steps, or the entire test suite. They handle setup, teardown, screenshots on failure, and other cross-cutting concerns.

### Java Hooks

\`\`\`java
package com.example.hooks;

import io.cucumber.java.Before;
import io.cucumber.java.After;
import io.cucumber.java.BeforeStep;
import io.cucumber.java.AfterStep;
import io.cucumber.java.Scenario;

public class TestHooks {

    private WebDriver driver;

    @Before
    public void setUp() {
        // Runs before each scenario
        driver = new ChromeDriver();
        driver.manage().window().maximize();
    }

    @After
    public void tearDown(Scenario scenario) {
        // Runs after each scenario
        if (scenario.isFailed()) {
            byte[] screenshot = ((TakesScreenshot) driver)
                .getScreenshotAs(OutputType.BYTES);
            scenario.attach(screenshot, "image/png", "failure-screenshot");
        }
        driver.quit();
    }

    @Before(value = "@database", order = 1)
    public void setUpDatabase() {
        // Runs only for scenarios tagged @database
        // order controls execution sequence (lower runs first)
        DatabaseHelper.seedTestData();
    }

    @After("@database")
    public void cleanUpDatabase() {
        DatabaseHelper.cleanTestData();
    }

    @BeforeStep
    public void beforeEachStep() {
        // Runs before every step -- use sparingly
    }

    @AfterStep
    public void afterEachStep(Scenario scenario) {
        // Useful for logging or intermediate screenshots
    }
}
\`\`\`

### TypeScript Hooks

\`\`\`typescript
import { Before, After, BeforeAll, AfterAll, BeforeStep, AfterStep, Status } from '@cucumber/cucumber';
import { chromium, Browser, Page } from '@playwright/test';

let browser: Browser;

BeforeAll(async function () {
  browser = await chromium.launch({ headless: true });
});

AfterAll(async function () {
  await browser.close();
});

Before(async function () {
  const context = await browser.newContext();
  this.page = await context.newPage();
});

After(async function (scenario) {
  if (scenario.result?.status === Status.FAILED) {
    const screenshot = await this.page.screenshot();
    this.attach(screenshot, 'image/png');
  }
  await this.page.context().close();
});

Before({ tags: '@api' }, async function () {
  // Only runs for scenarios tagged @api
  this.apiClient = new APIClient();
});
\`\`\`

### Hook Execution Order

Understanding hook execution order is critical for debugging:

1. \`BeforeAll\` -- once before all scenarios
2. \`Before\` -- before each scenario (ordered by \`order\` parameter)
3. \`BeforeStep\` -- before each step
4. Step execution
5. \`AfterStep\` -- after each step
6. \`After\` -- after each scenario (ordered by \`order\` parameter, reverse)
7. \`AfterAll\` -- once after all scenarios

---

## Tags for Test Organization

Tags are annotations on features and scenarios that let you filter, organize, and control execution. They start with the \`@\` symbol.

### Applying Tags

\`\`\`gherkin
@smoke @regression
Feature: User Authentication

  @critical @login
  Scenario: Successful login
    Given the user is on the login page
    When the user enters valid credentials
    Then the user should see the dashboard

  @negative @login
  Scenario: Login with invalid password
    Given the user is on the login page
    When the user enters an invalid password
    Then an error message should appear

  @wip
  Scenario: Two-factor authentication
    Given the user has 2FA enabled
    When the user logs in
    Then a verification code should be requested
\`\`\`

### Running Tagged Scenarios

From the command line:

\`\`\`bash
# Run only smoke tests
npx cucumber-js --tags "@smoke"

# Run smoke OR regression tests
npx cucumber-js --tags "@smoke or @regression"

# Run smoke tests that are NOT work-in-progress
npx cucumber-js --tags "@smoke and not @wip"

# Run login tests that are critical
npx cucumber-js --tags "@login and @critical"
\`\`\`

In Java with JUnit:

\`\`\`java
@Suite
@IncludeEngines("cucumber")
@SelectPackages("com.example")
@ConfigurationParameter(key = FILTER_TAGS_PROPERTY_NAME, value = "@smoke and not @wip")
public class SmokeTestRunner {
}
\`\`\`

### Common Tag Strategies

| Tag | Purpose |
|---|---|
| \`@smoke\` | Quick validation of critical paths -- run on every commit |
| \`@regression\` | Full regression suite -- run nightly or before releases |
| \`@wip\` | Work in progress -- skip in CI, run locally |
| \`@critical\` | Business-critical scenarios -- never skip |
| \`@api\` / \`@ui\` | Separate API tests from browser tests |
| \`@slow\` | Long-running tests -- skip during development |
| \`@flaky\` | Known flaky tests -- quarantine and investigate |

---

## Cucumber with Selenium WebDriver

Selenium is the most common browser automation library paired with Cucumber, especially in Java projects.

### Full Example: E-Commerce Checkout

Feature file:

\`\`\`gherkin
@e2e @checkout
Feature: E-Commerce Checkout

  Background:
    Given the user is logged in as "buyer@example.com"
    And the shopping cart is empty

  Scenario: Complete checkout with single item
    Given the user adds "Wireless Mouse" to the cart
    When the user proceeds to checkout
    And the user enters shipping address:
      | street  | 123 Main Street    |
      | city    | San Francisco      |
      | state   | CA                 |
      | zip     | 94102              |
    And the user selects "Standard Shipping"
    And the user confirms the order
    Then the order confirmation page should display
    And the order total should be correct

  Scenario Outline: Checkout with different payment methods
    Given the user has "Laptop Stand" in the cart
    When the user proceeds to checkout
    And the user pays with "<method>"
    Then the payment should be "<status>"

    Examples:
      | method      | status    |
      | credit_card | accepted  |
      | paypal      | accepted  |
      | expired_card| declined  |
\`\`\`

Step definitions with Selenium:

\`\`\`java
public class CheckoutSteps {
    private WebDriver driver;
    private WebDriverWait wait;

    @Before
    public void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless", "--no-sandbox");
        driver = new ChromeDriver(options);
        wait = new WebDriverWait(driver, Duration.ofSeconds(15));
    }

    @Given("the user is logged in as {string}")
    public void theUserIsLoggedInAs(String email) {
        driver.get("https://shop.example.com/login");
        driver.findElement(By.id("email")).sendKeys(email);
        driver.findElement(By.id("password")).sendKeys("TestPass123!");
        driver.findElement(By.id("login-btn")).click();
        wait.until(ExpectedConditions.urlContains("/account"));
    }

    @Given("the shopping cart is empty")
    public void theShoppingCartIsEmpty() {
        driver.get("https://shop.example.com/cart");
        List<WebElement> items = driver.findElements(By.cssSelector(".cart-item"));
        if (!items.isEmpty()) {
            driver.findElement(By.id("clear-cart")).click();
            wait.until(ExpectedConditions.numberOfElementsToBe(
                By.cssSelector(".cart-item"), 0));
        }
    }

    @Given("the user adds {string} to the cart")
    public void theUserAddsToTheCart(String productName) {
        driver.get("https://shop.example.com/products");
        String selector = String.format(
            "//div[contains(@class,'product-card')]"
            + "//h3[text()='%s']"
            + "/ancestor::div[contains(@class,'product-card')]"
            + "//button[contains(@class,'add-to-cart')]",
            productName
        );
        driver.findElement(By.xpath(selector)).click();
        wait.until(ExpectedConditions.visibilityOfElementLocated(
            By.cssSelector(".cart-notification.success")));
    }

    @When("the user enters shipping address:")
    public void theUserEntersShippingAddress(DataTable dataTable) {
        Map<String, String> address = dataTable.asMap();
        driver.findElement(By.id("street")).sendKeys(address.get("street"));
        driver.findElement(By.id("city")).sendKeys(address.get("city"));
        new Select(driver.findElement(By.id("state")))
            .selectByValue(address.get("state"));
        driver.findElement(By.id("zip")).sendKeys(address.get("zip"));
    }

    @Then("the order confirmation page should display")
    public void theOrderConfirmationPageShouldDisplay() {
        wait.until(ExpectedConditions.urlContains("/order-confirmation"));
        WebElement confirmation = driver.findElement(By.id("confirmation-header"));
        assertTrue(confirmation.isDisplayed());
    }
}
\`\`\`

---

## Cucumber with Playwright

Playwright is increasingly popular for Cucumber integration due to its auto-waiting, multi-browser support, and modern API. Here is a complete TypeScript setup.

### Project Structure

\`\`\`
project/
  src/
    features/
      login.feature
      checkout.feature
    steps/
      login.steps.ts
      checkout.steps.ts
    support/
      world.ts
      hooks.ts
    pages/
      login.page.ts
      checkout.page.ts
  cucumber.js
  tsconfig.json
  package.json
\`\`\`

### Page Object with Playwright

\`\`\`typescript
// src/pages/login.page.ts
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('https://app.example.com/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('#login-btn');
  }

  async expectDashboard() {
    await expect(this.page).toHaveURL(/\\/dashboard/);
  }

  async expectError(message: string) {
    const error = this.page.locator('.error-message');
    await expect(error).toHaveText(message);
  }
}
\`\`\`

### Step Definitions with Playwright

\`\`\`typescript
// src/steps/login.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { LoginPage } from '../pages/login.page';
import { expect } from '@playwright/test';

Given('the user is on the login page', async function () {
  this.loginPage = new LoginPage(this.page);
  await this.loginPage.navigate();
});

When(
  'the user logs in with email {string} and password {string}',
  async function (email: string, password: string) {
    await this.loginPage.login(email, password);
  }
);

Then('the user should be on the dashboard', async function () {
  await this.loginPage.expectDashboard();
});

Then('the user should see error {string}', async function (message: string) {
  await this.loginPage.expectError(message);
});
\`\`\`

---

## Reporting and Living Documentation

Cucumber generates structured output that feeds into various reporting tools.

### Built-in Formatters

\`\`\`bash
# HTML report
npx cucumber-js --format html:reports/report.html

# JSON report (feeds into other tools)
npx cucumber-js --format json:reports/report.json

# JUnit XML (for CI/CD integration)
npx cucumber-js --format junit:reports/junit.xml

# Multiple formats simultaneously
npx cucumber-js \\
  --format progress-bar \\
  --format html:reports/report.html \\
  --format json:reports/report.json
\`\`\`

### Allure Reporting

Allure provides rich, interactive test reports. Set up with Cucumber:

\`\`\`bash
npm install --save-dev allure-cucumberjs allure-commandline
\`\`\`

Configure in \`cucumber.js\`:

\`\`\`javascript
module.exports = {
  default: {
    format: ['allure-cucumberjs/reporter'],
    formatOptions: {
      resultsDir: 'allure-results',
    },
  },
};
\`\`\`

Generate and open the report:

\`\`\`bash
npx allure generate allure-results --clean
npx allure open allure-report
\`\`\`

### Cucumber HTML Reporter for Java

In Maven, add the Cucumber reporting plugin:

\`\`\`xml
<plugin>
    <groupId>net.masterthought</groupId>
    <artifactId>maven-cucumber-reporting</artifactId>
    <version>5.8.0</version>
    <executions>
        <execution>
            <id>execution</id>
            <phase>verify</phase>
            <goals><goal>generate</goal></goals>
            <configuration>
                <projectName>My BDD Tests</projectName>
                <outputDirectory>target/cucumber-reports</outputDirectory>
                <jsonFiles>
                    <param>target/cucumber.json</param>
                </jsonFiles>
            </configuration>
        </execution>
    </executions>
</plugin>
\`\`\`

### Living Documentation

The generated reports serve as living documentation. Unlike static wikis or Confluence pages that go stale within weeks, Cucumber reports are regenerated every time the test suite runs. If a scenario fails, it means either the feature is broken or the specification has drifted -- both situations that need immediate attention.

Best practices for living documentation:

- Write feature descriptions that explain business context, not technical details
- Use scenario names that describe the business rule, not the test steps
- Add doc strings for complex data or expected outputs
- Organize features by business domain, not by application layer
- Review feature files in pull requests alongside the code changes

---

## Best Practices and Anti-Patterns

### Do: Write Declarative Scenarios

Good scenarios describe what the user does at a business level, not how the UI works:

\`\`\`gherkin
# Good -- declarative
Scenario: Returning customer applies loyalty discount
  Given a returning customer with Gold membership
  When they purchase a laptop
  Then a 15% loyalty discount should be applied

# Bad -- imperative (too detailed about UI)
Scenario: Returning customer applies loyalty discount
  Given the user navigates to "https://shop.example.com"
  And the user clicks on "Login" link
  And the user types "alice@example.com" in the email field
  And the user types "SecurePass1!" in the password field
  And the user clicks the "Sign In" button
  And the user waits for the dashboard to load
  And the user clicks on "Products" menu
  And the user clicks on "Laptops" category
  And the user clicks "Add to Cart" on the first laptop
  And the user clicks the cart icon
  And the user clicks "Checkout"
\`\`\`

The declarative version communicates the business rule. The imperative version reads like a Selenium script wrapped in Gherkin -- it provides no value over writing the automation code directly.

### Do: Keep Scenarios Independent

Each scenario should be able to run independently, in any order. Never rely on one scenario to set up state for another. Use Background for shared setup and hooks for environment preparation.

### Do: Use Domain Language

Your Gherkin should use the ubiquitous language of your business domain:

\`\`\`gherkin
# Good -- uses domain language
Given an enrolled student with completed prerequisites
When they register for "Advanced Algorithms"
Then they should be added to the class roster

# Bad -- uses generic language
Given user exists in database
When user submits form with course ID 301
Then database has new row in enrollment table
\`\`\`

### Avoid: Too Many Scenarios Per Feature

If a feature file has more than 15-20 scenarios, it is doing too much. Split it into focused feature files:

- \`login-success.feature\` -- happy path scenarios
- \`login-validation.feature\` -- input validation
- \`login-security.feature\` -- lockout, 2FA, session management

### Avoid: Step Definition Duplication

When the same step appears in multiple feature files, write it once and reuse it. Organize step definitions by domain concept (login steps, cart steps, checkout steps), not by feature file.

### Avoid: Testing Implementation Details

Cucumber tests should validate observable behavior, not internal implementation:

\`\`\`gherkin
# Bad -- tests implementation
Then the database should contain a row with email "alice@example.com"
And the Redis cache should be invalidated

# Good -- tests behavior
Then the user profile should display "alice@example.com"
And the next login should require fresh authentication
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: BDD Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  cucumber-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run Cucumber tests
        run: npx cucumber-js --tags "not @wip"

      - name: Generate Allure report
        if: always()
        run: npx allure generate allure-results --clean

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: cucumber-report
          path: allure-report/
\`\`\`

### Jenkins Pipeline

\`\`\`groovy
pipeline {
    agent any
    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }
        stage('Test') {
            steps {
                sh 'npx cucumber-js --format json:reports/cucumber.json --tags "not @wip"'
            }
            post {
                always {
                    cucumber buildStatus: 'UNSTABLE',
                        fileIncludePattern: 'reports/cucumber.json'
                }
            }
        }
    }
}
\`\`\`

---

## Parallel Execution

Running Cucumber scenarios in parallel dramatically reduces execution time.

### JavaScript/TypeScript Parallel Execution

\`\`\`bash
# Use cucumber-js built-in parallel support
npx cucumber-js --parallel 4

# Or use environment-based configuration
CUCUMBER_PARALLEL=4 npx cucumber-js
\`\`\`

### Java Parallel Execution with Maven

\`\`\`xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <version>3.2.5</version>
    <configuration>
        <properties>
            <configurationParameters>
                cucumber.execution.parallel.enabled=true
                cucumber.execution.parallel.config.fixed.parallelism=4
                cucumber.execution.parallel.config.strategy=fixed
            </configurationParameters>
        </properties>
    </configuration>
</plugin>
\`\`\`

When running in parallel, ensure each scenario is truly independent. Shared mutable state between scenarios causes intermittent failures that are difficult to debug.

---

## Advanced Patterns

### Custom Parameter Types

Define reusable parameter types for domain concepts:

\`\`\`typescript
import { defineParameterType } from '@cucumber/cucumber';

defineParameterType({
  name: 'userRole',
  regexp: /admin|editor|viewer|guest/,
  transformer: (role) => role as 'admin' | 'editor' | 'viewer' | 'guest',
});

// Now use it in step definitions
Given('a user with {userRole} role', async function (role: string) {
  await this.createUserWithRole(role);
});
\`\`\`

### Doc Strings

When a step needs a large block of text:

\`\`\`gherkin
Scenario: Submit feedback with detailed message
  Given the user is on the feedback page
  When the user submits the following feedback:
    """
    I found a bug in the checkout process.
    When I add more than 10 items to the cart,
    the total price shows as negative.
    Browser: Chrome 125
    OS: Windows 11
    """
  Then the feedback should be recorded
\`\`\`

In the step definition:

\`\`\`typescript
When('the user submits the following feedback:', async function (docString: string) {
  await this.page.fill('#feedback-textarea', docString);
  await this.page.click('#submit-feedback');
});
\`\`\`

### Rule Keyword (Gherkin 6)

Gherkin 6 introduced the \`Rule\` keyword to group scenarios under a business rule:

\`\`\`gherkin
Feature: Account Withdrawal

  Rule: Withdrawals cannot exceed the current balance

    Scenario: Sufficient balance
      Given the account balance is 500.00
      When the user withdraws 200.00
      Then the withdrawal should succeed
      And the balance should be 300.00

    Scenario: Insufficient balance
      Given the account balance is 100.00
      When the user withdraws 200.00
      Then the withdrawal should be declined
      And the balance should remain 100.00

  Rule: ATM withdrawals are limited to 1000 per day

    Scenario: Within daily limit
      Given the user has not withdrawn today
      When the user withdraws 800.00
      Then the withdrawal should succeed

    Scenario: Exceeds daily limit
      Given the user has already withdrawn 500.00 today
      When the user withdraws 600.00
      Then the withdrawal should be declined
\`\`\`

---

## Debugging Cucumber Tests

When scenarios fail, effective debugging is essential.

### Attach Screenshots on Failure

In Java:

\`\`\`java
@After
public void captureScreenshotOnFailure(Scenario scenario) {
    if (scenario.isFailed() && driver != null) {
        byte[] screenshot = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
        scenario.attach(screenshot, "image/png", scenario.getName());
    }
}
\`\`\`

In TypeScript:

\`\`\`typescript
After(async function (scenario) {
  if (scenario.result?.status === Status.FAILED) {
    const image = await this.page.screenshot({ fullPage: true });
    this.attach(image, 'image/png');

    // Also attach the page URL for context
    this.attach(\`Failed URL: \${this.page.url()}\`, 'text/plain');
  }
});
\`\`\`

### Verbose Logging

\`\`\`bash
# Run with detailed output
npx cucumber-js --format progress-bar --format-options '{"colorsEnabled": true}'

# Enable debug logging
DEBUG=cucumber npx cucumber-js
\`\`\`

### Dry Run

Verify step definitions are wired up without executing them:

\`\`\`bash
npx cucumber-js --dry-run
\`\`\`

This reports any undefined steps, helping you catch missing step definitions before running the full suite.

---

## Conclusion

Cucumber BDD is more than a testing tool -- it is a structured approach to building shared understanding between business and engineering. When practiced correctly, it eliminates the ambiguity that causes bugs, creates living documentation that never goes stale, and gives teams confidence that the software they built is the software the business asked for.

Start with the Three Amigos conversations to generate concrete examples. Write those examples as Gherkin scenarios in feature files. Implement step definitions in Java or TypeScript that connect to your browser automation library. Use hooks and tags to organize execution. Generate reports that serve as living documentation. Integrate into your CI/CD pipeline so every commit validates the specifications.

The common mistake is treating Cucumber as "Selenium with English wrappers." The real value is the collaboration process that produces those English specifications. If only QA writes the feature files, you are missing the point. Get the product owner and developers in the room, produce examples together, and let Cucumber ensure those examples always pass.
`,
};
