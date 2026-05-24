import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Cucumber Java BDD Complete Guide 2026',
  description:
    'Master Selenium with Cucumber-JVM for BDD in Java. Cover feature files, step definitions, hooks, scenario outlines, parallel runs, Page Objects, and CI patterns.',
  date: '2026-05-17',
  category: 'Reference',
  content: `
# Selenium Cucumber Java BDD Complete Guide 2026

Cucumber-JVM combines the readability of Gherkin scenarios with the depth of Java automation. Business analysts and product managers can read and contribute to feature files; engineers translate Gherkin steps into Java code that drives Selenium. The result is a test suite that doubles as living documentation: a non-engineer can read \`Given a user with admin role, When they navigate to settings, Then admin controls are visible\` and understand what the test does without seeing a line of Java.

This guide covers Selenium + Cucumber-JVM in 2026. We walk through Maven setup, feature file syntax, step definitions, Page Object Model integration, hooks for setup and teardown, scenario outlines for data-driven tests, parallel execution, screenshot-on-failure, reporting with the cucumber-html-reporter, JUnit 5 vs TestNG runners, and CI integration. For BDD theory see [BDD Cucumber testing guide](/blog/bdd-cucumber-testing-guide) and for Selenium fundamentals see [Selenium Java TestNG](/blog/selenium-java-testng-page-object-guide). Browse the [skills directory](/skills).

## Why Cucumber plus Selenium

Three reasons. First, shared understanding. Gherkin features are readable by everyone on the team. Specs by example mean fewer misunderstandings between product, QA, and engineering. Second, reuse. The same step \`Given I am logged in as a standard user\` works across dozens of scenarios; you write the implementation once. Third, reporting. Cucumber HTML reports show feature, scenario, step granularity. Stakeholders can read them without engineering vocabulary.

The trade-off is overhead. Pure Gherkin tests are slower to write than direct Java tests because every step needs a regex pattern and a method. For teams that don't have business stakeholders engaging with tests, the BDD ceremony can feel like ceremony. For teams that do, it pays off.

| Layer | Concern | Author |
|---|---|---|
| Feature files (.feature) | Business behavior | Product/BA/QA |
| Step definitions | Step-to-code mapping | Engineers |
| Page Objects | UI structure | Engineers |
| Selenium driver | Browser automation | Engineers |
| Selenium Grid | Distributed execution | DevOps/SDET |

## Project Layout

\`\`\`
project/
├── pom.xml
├── src/
│   ├── main/java/com/example/
│   │   ├── pages/
│   │   │   ├── BasePage.java
│   │   │   ├── LoginPage.java
│   │   │   └── DashboardPage.java
│   │   └── support/
│   │       └── DriverManager.java
│   └── test/
│       ├── java/com/example/
│       │   ├── steps/
│       │   │   ├── LoginSteps.java
│       │   │   ├── DashboardSteps.java
│       │   │   └── Hooks.java
│       │   └── runner/
│       │       └── TestRunner.java
│       └── resources/
│           └── features/
│               ├── login.feature
│               └── checkout.feature
\`\`\`

## Dependencies

\`\`\`xml
<dependencies>
  <dependency>
    <groupId>io.cucumber</groupId>
    <artifactId>cucumber-java</artifactId>
    <version>7.20.1</version>
  </dependency>
  <dependency>
    <groupId>io.cucumber</groupId>
    <artifactId>cucumber-junit-platform-engine</artifactId>
    <version>7.20.1</version>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.junit.platform</groupId>
    <artifactId>junit-platform-suite</artifactId>
    <version>1.11.4</version>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.seleniumhq.selenium</groupId>
    <artifactId>selenium-java</artifactId>
    <version>4.27.0</version>
  </dependency>
</dependencies>

<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.5.2</version>
      <configuration>
        <properties>
          <configurationParameters>
            cucumber.execution.parallel.enabled=true
            cucumber.execution.parallel.config.strategy=fixed
            cucumber.execution.parallel.config.fixed.parallelism=4
          </configurationParameters>
        </properties>
      </configuration>
    </plugin>
  </plugins>
</build>
\`\`\`

## Feature Files

Feature files use Gherkin syntax: Feature, Scenario, Given/When/Then steps.

\`\`\`gherkin
# src/test/resources/features/login.feature
Feature: User Login
  As a registered user
  I want to log into the application
  So that I can access my dashboard

  Background:
    Given I am on the login page

  @smoke @critical
  Scenario: Successful login with valid credentials
    When I enter email "user@example.com" and password "demo123"
    And I click the submit button
    Then I should see the dashboard

  @regression
  Scenario: Failed login with invalid credentials
    When I enter email "bad@example.com" and password "wrong"
    And I click the submit button
    Then I should see error "Invalid credentials"

  @data-driven
  Scenario Outline: Login with multiple users
    When I enter email "<email>" and password "<password>"
    And I click the submit button
    Then I should see "<result>"

    Examples:
      | email              | password   | result               |
      | admin@example.com  | admin123   | Admin Dashboard      |
      | user@example.com   | demo123    | User Dashboard       |
      | empty@example.com  | wrong      | Invalid credentials  |
\`\`\`

\`Background\` runs before each Scenario. \`@\` tags scope test execution. \`Scenario Outline\` with \`Examples\` runs the scenario once per row.

## Step Definitions

Steps map Gherkin phrases to Java methods.

\`\`\`java
package com.example.steps;

import com.example.pages.DashboardPage;
import com.example.pages.LoginPage;
import com.example.support.DriverManager;
import io.cucumber.java.en.*;
import org.openqa.selenium.WebDriver;
import static org.junit.jupiter.api.Assertions.*;

public class LoginSteps {
    private final WebDriver driver = DriverManager.getDriver();
    private final LoginPage loginPage = new LoginPage(driver);
    private DashboardPage dashboardPage;

    @Given("I am on the login page")
    public void iAmOnLoginPage() {
        loginPage.navigate();
    }

    @When("I enter email {string} and password {string}")
    public void iEnterCredentials(String email, String password) {
        loginPage.enterCredentials(email, password);
    }

    @When("I click the submit button")
    public void iClickSubmit() {
        dashboardPage = loginPage.clickSubmit();
    }

    @Then("I should see the dashboard")
    public void iShouldSeeDashboard() {
        assertTrue(driver.getTitle().contains("Dashboard"));
    }

    @Then("I should see error {string}")
    public void iShouldSeeError(String expected) {
        assertEquals(expected, loginPage.getErrorMessage());
    }

    @Then("I should see {string}")
    public void iShouldSee(String expected) {
        String content = driver.getPageSource();
        assertTrue(content.contains(expected),
            "Expected page to contain: " + expected);
    }
}
\`\`\`

The annotations \`@Given\`, \`@When\`, \`@Then\` map regex patterns to methods. The \`{string}\` placeholder captures the quoted value from the feature.

## Hooks

Hooks run before and after scenarios. They handle setup, teardown, and screenshot capture.

\`\`\`java
package com.example.steps;

import com.example.support.DriverManager;
import io.cucumber.java.*;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;

public class Hooks {
    @Before
    public void beforeScenario(Scenario scenario) {
        System.out.println("Starting: " + scenario.getName());
        DriverManager.createDriver();
    }

    @After
    public void afterScenario(Scenario scenario) {
        if (scenario.isFailed()) {
            byte[] screenshot = ((TakesScreenshot) DriverManager.getDriver())
                .getScreenshotAs(OutputType.BYTES);
            scenario.attach(screenshot, "image/png", "Failure screenshot");
        }
        DriverManager.quitDriver();
    }
}
\`\`\`

\`@Before\` runs before each scenario; \`@After\` runs after. Screenshots attached to a scenario appear in the HTML report.

For tag-specific hooks:

\`\`\`java
@Before("@admin")
public void loginAsAdmin() {
    // Setup specific to scenarios tagged @admin
}

@After("@cleanup")
public void cleanupData() {
    // Cleanup specific to scenarios tagged @cleanup
}
\`\`\`

## Driver Manager

For thread-safe parallel execution, use a ThreadLocal pattern.

\`\`\`java
package com.example.support;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public class DriverManager {
    private static final ThreadLocal<WebDriver> driver = new ThreadLocal<>();

    public static void createDriver() {
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless=new");
        driver.set(new ChromeDriver(options));
    }

    public static WebDriver getDriver() {
        return driver.get();
    }

    public static void quitDriver() {
        if (driver.get() != null) {
            driver.get().quit();
            driver.remove();
        }
    }
}
\`\`\`

ThreadLocal ensures each parallel thread has its own driver instance. Critical for parallel BDD execution.

## Runner

A JUnit 5 runner discovers and executes feature files.

\`\`\`java
package com.example.runner;

import org.junit.platform.suite.api.*;
import static io.cucumber.junit.platform.engine.Constants.*;

@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "com.example.steps")
@ConfigurationParameter(key = PLUGIN_PROPERTY_NAME,
    value = "pretty, html:target/cucumber-report.html, json:target/cucumber.json")
@ConfigurationParameter(key = FILTER_TAGS_PROPERTY_NAME, value = "@smoke")
public class TestRunner {
}
\`\`\`

\`FILTER_TAGS_PROPERTY_NAME\` runs only scenarios with \`@smoke\`. Combine with logical operators: \`@smoke and not @wip\`.

## Page Object Integration

Page objects look like in any Selenium project. The difference is that step definitions use them instead of WebDriver directly.

\`\`\`java
package com.example.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public class LoginPage {
    private final WebDriver driver;
    private final WebDriverWait wait;

    private final By emailField = By.id("email");
    private final By passwordField = By.id("password");
    private final By submitButton = By.id("submit");
    private final By errorMessage = By.cssSelector(".error");

    public LoginPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    public LoginPage navigate() {
        driver.get("https://app.example.com/login");
        return this;
    }

    public LoginPage enterCredentials(String email, String password) {
        driver.findElement(emailField).sendKeys(email);
        driver.findElement(passwordField).sendKeys(password);
        return this;
    }

    public DashboardPage clickSubmit() {
        driver.findElement(submitButton).click();
        return new DashboardPage(driver);
    }

    public String getErrorMessage() {
        return wait.until(d -> d.findElement(errorMessage)).getText();
    }
}
\`\`\`

This is the Page Object pattern from the [Selenium Java TestNG guide](/blog/selenium-java-testng-page-object-guide), no different. Cucumber sits on top.

## Parallel Execution

Cucumber 7+ supports parallel scenarios via JUnit 5 platform.

\`\`\`properties
# junit-platform.properties
cucumber.execution.parallel.enabled=true
cucumber.execution.parallel.config.strategy=fixed
cucumber.execution.parallel.config.fixed.parallelism=4
\`\`\`

Each scenario runs on its own thread. The ThreadLocal driver pattern is essential to prevent driver state from leaking.

For Grid runs, point the driver at the Grid URL. Each parallel thread gets its own Grid session.

## Reporting

The HTML plugin generates a static report.

\`\`\`bash
mvn test
open target/cucumber-report.html
\`\`\`

For richer reports use the cucumber-reporting Maven plugin:

\`\`\`xml
<plugin>
  <groupId>net.masterthought</groupId>
  <artifactId>maven-cucumber-reporting</artifactId>
  <version>5.8.4</version>
  <executions>
    <execution>
      <id>execution</id>
      <phase>verify</phase>
      <goals>
        <goal>generate</goal>
      </goals>
      <configuration>
        <projectName>SeleniumBDD</projectName>
        <outputDirectory>target/cucumber-reports</outputDirectory>
        <inputDirectory>target</inputDirectory>
        <jsonFiles>
          <param>**/cucumber.json</param>
        </jsonFiles>
      </configuration>
    </execution>
  </executions>
</plugin>
\`\`\`

The output includes a feature overview, scenario drill-down, tag breakdown, and trend charts.

## Scenario Outlines and Examples

Data-driven scenarios use Examples tables.

\`\`\`gherkin
Scenario Outline: Cart calculations
  Given the cart contains "<sku>" with quantity <qty>
  When I view the cart
  Then the subtotal should be "<subtotal>"

  Examples:
    | sku       | qty | subtotal |
    | LAPTOP-1  | 1   | $999.99  |
    | LAPTOP-1  | 2   | $1999.98 |
    | PHONE-1   | 3   | $1799.97 |
\`\`\`

Each row becomes a separate scenario. The variables are substituted into the step phrases.

## DataTables

For more complex data within a single scenario, use DataTables.

\`\`\`gherkin
Scenario: Adding multiple items
  Given the following items are added to the cart:
    | sku       | qty | price   |
    | LAPTOP-1  | 1   | $999.99 |
    | PHONE-1   | 2   | $599.99 |
    | CABLE-1   | 3   | $19.99  |
  When I view the cart total
  Then the total should be "$2259.94"
\`\`\`

\`\`\`java
@Given("the following items are added to the cart:")
public void addItems(DataTable table) {
    for (Map<String, String> row : table.asMaps()) {
        String sku = row.get("sku");
        int qty = Integer.parseInt(row.get("qty"));
        cartPage.addItem(sku, qty);
    }
}
\`\`\`

DataTables are useful when a single scenario operates on multiple data items.

## CI Integration

\`\`\`yaml
name: Cucumber Tests

on:
  pull_request:
    branches: [main]

jobs:
  bdd:
    runs-on: ubuntu-latest
    services:
      selenium-hub:
        image: selenium/hub:4.27.0
        ports: ['4444:4444']
      chrome-node:
        image: selenium/node-chrome:4.27.0
        env:
          SE_EVENT_BUS_HOST: selenium-hub

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Run Cucumber tests
        run: mvn verify

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: cucumber-report
          path: target/cucumber-reports
\`\`\`

The \`verify\` phase runs tests and generates the report. CI fails if any scenario fails.

## Conclusion

Selenium + Cucumber-JVM is the right BDD stack for Java teams where business stakeholders engage with tests. The Gherkin layer enables specification-by-example workflows; the Page Object layer keeps UI knowledge encapsulated; ThreadLocal drivers enable parallel execution. For teams without business stakeholder involvement, direct Selenium + TestNG is faster to write and maintain.

Browse the [skills directory](/skills) for Selenium AI agent skills. Read [BDD Cucumber testing guide](/blog/bdd-cucumber-testing-guide) for BDD theory and [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide) for distributed execution.
`,
};
