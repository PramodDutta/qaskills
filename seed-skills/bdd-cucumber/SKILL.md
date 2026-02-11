---
name: BDD/Cucumber Patterns
description: Behavior-Driven Development skill using Cucumber, covering feature files, step definitions, Gherkin best practices, data tables, scenario outlines, and hooks.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [bdd, cucumber, gherkin, feature-files, step-definitions, behavior-driven]
testingTypes: [bdd, e2e]
frameworks: [cucumber]
languages: [typescript, java]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# BDD/Cucumber Patterns Skill

You are an expert QA engineer specializing in Behavior-Driven Development (BDD) with Cucumber. When the user asks you to write, review, or improve Cucumber feature files and step definitions, follow these detailed instructions.

## Core Principles

1. **Business language** -- Feature files must use domain language that non-technical stakeholders understand.
2. **Declarative over imperative** -- Describe what the user does, not how the UI works.
3. **Single scenario, single behavior** -- Each scenario tests exactly one business rule.
4. **Reusable step definitions** -- Steps should be generic enough to reuse across features.
5. **Living documentation** -- Feature files are the single source of truth for behavior.

## Project Structure (TypeScript)

```
features/
  auth/
    login.feature
    registration.feature
    password-reset.feature
  products/
    product-listing.feature
    product-search.feature
  checkout/
    cart.feature
    payment.feature
  step-definitions/
    auth.steps.ts
    products.steps.ts
    checkout.steps.ts
    common.steps.ts
  support/
    world.ts
    hooks.ts
    custom-parameter-types.ts
  pages/
    login.page.ts
    products.page.ts
cucumber.js
tsconfig.json
```

## Project Structure (Java)

```
src/
  test/
    java/com/example/
      steps/
        AuthSteps.java
        ProductSteps.java
        CommonSteps.java
      pages/
        LoginPage.java
        ProductsPage.java
      hooks/
        Hooks.java
      runners/
        TestRunner.java
    resources/
      features/
        auth/
          login.feature
          registration.feature
        products/
          product-listing.feature
```

## Writing Feature Files

### Good Feature File

```gherkin
Feature: User Login
  As a registered user
  I want to log into the application
  So that I can access my personalized dashboard

  Background:
    Given the login page is displayed

  @smoke @auth
  Scenario: Successful login with valid credentials
    When I log in with valid credentials
    Then I should see the dashboard
    And I should see a welcome message

  @auth @negative
  Scenario: Login fails with incorrect password
    When I log in with an incorrect password
    Then I should see an error message "Invalid email or password"
    And I should remain on the login page

  @auth @negative
  Scenario: Login fails with non-existent email
    When I log in with a non-registered email
    Then I should see an error message "Invalid email or password"

  @auth @security
  Scenario: Account locks after multiple failed attempts
    When I attempt to log in 5 times with incorrect passwords
    Then my account should be temporarily locked
    And I should see a message about account lockout
```

### Scenario Outline (Data-Driven)

```gherkin
Feature: Form Validation
  As a user
  I want to see clear validation messages
  So that I can correct my input

  @validation
  Scenario Outline: Email validation
    Given I am on the registration page
    When I enter "<email>" in the email field
    And I submit the form
    Then I should see the validation message "<message>"

    Examples:
      | email               | message                     |
      |                     | Email is required           |
      | not-an-email        | Please enter a valid email  |
      | @missing.com        | Please enter a valid email  |
      | valid@example.com   |                             |

  @validation
  Scenario Outline: Password strength validation
    Given I am on the registration page
    When I enter "<password>" in the password field
    And I move to the next field
    Then the password strength indicator should show "<strength>"

    Examples:
      | password        | strength |
      | abc             | weak     |
      | abcdef12        | medium   |
      | SecurePass123!  | strong   |
```

### Data Tables

```gherkin
Scenario: Create multiple users
  Given the following users exist:
    | email               | name       | role   |
    | admin@example.com   | Admin User | admin  |
    | user1@example.com   | User One   | user   |
    | user2@example.com   | User Two   | viewer |
  When I navigate to the user management page
  Then I should see 3 users in the list

Scenario: Verify user profile details
  Given I am logged in as "admin@example.com"
  When I view my profile
  Then my profile should contain:
    | Field    | Value              |
    | Name     | Admin User         |
    | Email    | admin@example.com  |
    | Role     | Administrator      |

Scenario: Add items to cart
  When I add the following items to my cart:
    | product     | quantity | price  |
    | Widget A    | 2        | 29.99  |
    | Widget B    | 1        | 49.99  |
  Then my cart total should be "$109.97"
```

## Step Definitions (TypeScript)

```typescript
// step-definitions/auth.steps.ts
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';

Given('the login page is displayed', async function (this: CustomWorld) {
  await this.page.goto('/login');
  await expect(this.page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

When('I log in with valid credentials', async function (this: CustomWorld) {
  await this.loginPage.login('user@example.com', 'SecurePass123!');
});

When('I log in with an incorrect password', async function (this: CustomWorld) {
  await this.loginPage.login('user@example.com', 'wrongpassword');
});

When('I log in with a non-registered email', async function (this: CustomWorld) {
  await this.loginPage.login('nonexistent@example.com', 'SomePass123!');
});

Then('I should see the dashboard', async function (this: CustomWorld) {
  await expect(this.page).toHaveURL(/\/dashboard/);
});

Then('I should see a welcome message', async function (this: CustomWorld) {
  await expect(this.page.getByText(/welcome/i)).toBeVisible();
});

Then('I should see an error message {string}', async function (this: CustomWorld, message: string) {
  await expect(this.page.getByRole('alert')).toHaveText(message);
});

Then('I should remain on the login page', async function (this: CustomWorld) {
  await expect(this.page).toHaveURL(/\/login/);
});

When('I attempt to log in {int} times with incorrect passwords', async function (
  this: CustomWorld,
  attempts: number
) {
  for (let i = 0; i < attempts; i++) {
    await this.loginPage.login('user@example.com', `wrong${i}`);
  }
});

Then('my account should be temporarily locked', async function (this: CustomWorld) {
  await expect(this.page.getByText(/locked/i)).toBeVisible();
});
```

### Step Definitions with Data Tables

```typescript
// step-definitions/common.steps.ts
import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { CustomWorld } from '../support/world';

Given('the following users exist:', async function (this: CustomWorld, dataTable: DataTable) {
  const users = dataTable.hashes();
  for (const user of users) {
    await this.apiClient.post('/api/users', {
      email: user.email,
      name: user.name,
      role: user.role,
      password: 'DefaultPass123!',
    });
  }
});

Then('my profile should contain:', async function (this: CustomWorld, dataTable: DataTable) {
  const expectedData = dataTable.rowsHash();
  for (const [field, value] of Object.entries(expectedData)) {
    const element = this.page.getByLabel(field);
    await expect(element).toHaveValue(value as string);
  }
});

When('I add the following items to my cart:', async function (this: CustomWorld, dataTable: DataTable) {
  const items = dataTable.hashes();
  for (const item of items) {
    await this.page.getByText(item.product).click();
    await this.page.getByLabel('Quantity').fill(item.quantity);
    await this.page.getByRole('button', { name: 'Add to Cart' }).click();
  }
});
```

## Step Definitions (Java)

```java
package com.example.steps;

import io.cucumber.java.en.*;
import io.cucumber.datatable.DataTable;
import static org.assertj.core.api.Assertions.*;
import java.util.List;
import java.util.Map;

public class AuthSteps {
    private final LoginPage loginPage;
    private final DashboardPage dashboardPage;

    public AuthSteps() {
        this.loginPage = new LoginPage(DriverFactory.getDriver());
        this.dashboardPage = new DashboardPage(DriverFactory.getDriver());
    }

    @Given("the login page is displayed")
    public void theLoginPageIsDisplayed() {
        loginPage.navigate();
        assertThat(loginPage.isDisplayed()).isTrue();
    }

    @When("I log in with valid credentials")
    public void iLogInWithValidCredentials() {
        loginPage.loginAs("user@example.com", "SecurePass123!");
    }

    @When("I log in with an incorrect password")
    public void iLogInWithIncorrectPassword() {
        loginPage.loginAs("user@example.com", "wrongpassword");
    }

    @Then("I should see the dashboard")
    public void iShouldSeeTheDashboard() {
        assertThat(dashboardPage.isDisplayed()).isTrue();
    }

    @Then("I should see an error message {string}")
    public void iShouldSeeAnErrorMessage(String expectedMessage) {
        assertThat(loginPage.getErrorMessage()).isEqualTo(expectedMessage);
    }

    @Given("the following users exist:")
    public void theFollowingUsersExist(DataTable dataTable) {
        List<Map<String, String>> users = dataTable.asMaps();
        for (Map<String, String> user : users) {
            apiClient.createUser(
                user.get("email"),
                user.get("name"),
                user.get("role")
            );
        }
    }
}
```

## World and Hooks

### Custom World (TypeScript)

```typescript
// support/world.ts
import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, Page, chromium } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

export class CustomWorld extends World {
  browser!: Browser;
  page!: Page;
  loginPage!: LoginPage;
  apiClient: any;
  testData: Map<string, any> = new Map();

  constructor(options: IWorldOptions) {
    super(options);
  }

  async init() {
    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext();
    this.page = await context.newPage();
    this.loginPage = new LoginPage(this.page);
  }

  async cleanup() {
    await this.page?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(CustomWorld);
```

### Hooks

```typescript
// support/hooks.ts
import { Before, After, BeforeAll, AfterAll, BeforeStep, AfterStep, Status } from '@cucumber/cucumber';
import { CustomWorld } from './world';

Before(async function (this: CustomWorld) {
  await this.init();
});

After(async function (this: CustomWorld, scenario) {
  if (scenario.result?.status === Status.FAILED) {
    const screenshot = await this.page.screenshot();
    this.attach(screenshot, 'image/png');
    console.log(`Scenario failed: ${scenario.pickle.name}`);
  }
  await this.cleanup();
});

Before({ tags: '@auth' }, async function (this: CustomWorld) {
  // Set up authentication state for auth-tagged scenarios
  await this.apiClient?.login('admin@example.com', 'AdminPass123!');
});

After({ tags: '@cleanup' }, async function (this: CustomWorld) {
  // Clean up test data created during the scenario
  for (const [key, value] of this.testData.entries()) {
    await this.apiClient?.delete(`/api/${key}/${value}`);
  }
});
```

## Gherkin Best Practices

### Declarative vs Imperative

```gherkin
# BAD -- Imperative (too detailed, UI-coupled)
Scenario: Login
  Given I navigate to "https://example.com/login"
  When I click on the email field
  And I type "user@example.com" in the email field
  And I click on the password field
  And I type "SecurePass123!" in the password field
  And I click the "Sign In" button
  Then I should be redirected to "/dashboard"
  And the h1 element should contain "Welcome"

# GOOD -- Declarative (business-focused)
Scenario: Successful login
  Given I am on the login page
  When I log in with valid credentials
  Then I should see my dashboard
  And I should see a welcome message
```

### Tags for Organization

```gherkin
@auth @regression
Feature: User Authentication

  @smoke @critical
  Scenario: Successful login
    ...

  @negative
  Scenario: Login with invalid password
    ...

  @security @slow
  Scenario: Account lockout after failed attempts
    ...
```

Run selective tests:
```bash
# Run smoke tests only
npx cucumber-js --tags "@smoke"

# Run auth tests that are not slow
npx cucumber-js --tags "@auth and not @slow"

# Run critical or smoke tests
npx cucumber-js --tags "@critical or @smoke"
```

## Configuration

### cucumber.js (TypeScript)

```javascript
module.exports = {
  default: {
    require: ['step-definitions/**/*.ts', 'support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: [
      'progress',
      'json:reports/cucumber-report.json',
      'html:reports/cucumber-report.html',
    ],
    paths: ['features/**/*.feature'],
    publishQuiet: true,
  },
  smoke: {
    require: ['step-definitions/**/*.ts', 'support/**/*.ts'],
    requireModule: ['ts-node/register'],
    tags: '@smoke',
    paths: ['features/**/*.feature'],
  },
};
```

### TestRunner (Java)

```java
package com.example.runners;

import io.cucumber.testng.AbstractTestNGCucumberTests;
import io.cucumber.testng.CucumberOptions;
import org.testng.annotations.DataProvider;

@CucumberOptions(
    features = "src/test/resources/features",
    glue = {"com.example.steps", "com.example.hooks"},
    plugin = {
        "pretty",
        "html:target/cucumber-reports/cucumber.html",
        "json:target/cucumber-reports/cucumber.json",
        "io.qameta.allure.cucumber7jvm.AllureCucumber7Jvm"
    },
    tags = "@smoke or @regression",
    monochrome = true,
    dryRun = false
)
public class TestRunner extends AbstractTestNGCucumberTests {

    @Override
    @DataProvider(parallel = true)
    public Object[][] scenarios() {
        return super.scenarios();
    }
}
```

## Best Practices

1. **Write features before code** -- BDD means features drive development.
2. **Use domain language** -- Avoid technical terms in feature files.
3. **Keep scenarios short** -- 3-8 steps per scenario is ideal.
4. **One behavior per scenario** -- Do not test multiple things in one scenario.
5. **Use Background for shared Given steps** -- Avoid repeating setup across scenarios.
6. **Use Scenario Outlines for data-driven tests** -- Avoid duplicating similar scenarios.
7. **Tag strategically** -- Use tags for test selection, not as test metadata.
8. **Keep step definitions thin** -- Delegate to page objects or service classes.
9. **Use a consistent voice** -- First person ("I") or third person ("the user"), not both.
10. **Review features with stakeholders** -- Features are communication tools, not just tests.

## Anti-Patterns to Avoid

1. **UI details in features** -- "I click the blue button" is implementation detail.
2. **Technical jargon** -- "The API returns a 200 status" is not business language.
3. **Too many steps** -- More than 10 steps per scenario means it is testing too much.
4. **Coupled scenarios** -- Each scenario must be independent.
5. **Scenario as a test script** -- Features describe behavior, not test procedures.
6. **Unused step definitions** -- Remove dead code; it confuses maintenance.
7. **Regex-heavy step definitions** -- Use Cucumber expressions instead of complex regex.
8. **Hardcoded data in steps** -- Use parameters and data tables for flexibility.
9. **No tags** -- Without tags, you cannot run subsets of tests.
10. **Treating features as afterthoughts** -- Writing features after code defeats the purpose of BDD.
