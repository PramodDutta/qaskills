import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Java TestNG Page Object Complete Guide 2026',
  description:
    'Master Selenium with Java and TestNG. Cover Page Object Model, PageFactory, fluent waits, data providers, parallel runs, listeners, and CI integration patterns.',
  date: '2026-05-16',
  category: 'Reference',
  content: `
# Selenium Java TestNG Page Object Complete Guide 2026

Selenium plus Java plus TestNG is the most-deployed enterprise web test stack. Twenty years of accumulated practice has produced patterns that work at scale: the Page Object Model for maintainability, PageFactory for lazy element initialization, fluent waits for reliability, TestNG data providers for parametrization, parallel execution for speed, and listeners for cross-cutting concerns like screenshots and reporting.

This guide covers Selenium + Java + TestNG end-to-end in 2026. We walk through project layout with Maven, the WebDriverManager-versus-Selenium-Manager story, the Page Object Model with PageFactory, fluent waits, data-driven testing with @DataProvider, TestNG parallel execution, listeners and retry analyzers, Allure reporting, and CI integration. For BiDi events see [Selenium BiDi protocol guide](/blog/selenium-bidirectional-bidi-protocol-guide) and for Grid see [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide). Browse the [skills directory](/skills) for AI agent skills.

## Why Java plus TestNG

Three reasons. First, type safety. Java's compile-time checks catch class of errors before tests run. Renaming a page method updates all callers; misspelling a method name fails the build. Second, TestNG features. Data providers, dependent tests, groups, parallel execution, listeners. JUnit has caught up in many areas but TestNG remains denser per-feature. Third, ecosystem maturity. Twenty years of Selenium-Java patterns, frameworks, and code samples mean Stack Overflow has the answer to almost any question.

| Feature | TestNG | JUnit 5 |
|---|---|---|
| Data providers | @DataProvider | @ParameterizedTest |
| Groups | @Test(groups=) | Tags |
| Parallel | XML config or parallel attribute | Property-based |
| Listeners | First-class | Extensions API |
| Dependent tests | @Test(dependsOnMethods=) | Manual |
| Soft assertions | Built-in | AssertJ |
| Retry analyzer | Built-in interface | RetryingTest plugin |

## Project Layout

Maven structure:

\`\`\`
selenium-tests/
├── pom.xml
├── src/
│   ├── main/java/
│   │   └── com/example/
│   │       ├── pages/
│   │       │   ├── BasePage.java
│   │       │   ├── LoginPage.java
│   │       │   └── DashboardPage.java
│   │       └── utils/
│   │           ├── DriverFactory.java
│   │           └── ConfigReader.java
│   └── test/java/
│       └── com/example/tests/
│           ├── BaseTest.java
│           ├── LoginTest.java
│           └── CheckoutTest.java
├── src/test/resources/
│   ├── testng.xml
│   └── config.properties
└── target/
\`\`\`

## Dependencies

\`\`\`xml
<dependencies>
  <dependency>
    <groupId>org.seleniumhq.selenium</groupId>
    <artifactId>selenium-java</artifactId>
    <version>4.27.0</version>
  </dependency>
  <dependency>
    <groupId>org.testng</groupId>
    <artifactId>testng</artifactId>
    <version>7.10.2</version>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>io.qameta.allure</groupId>
    <artifactId>allure-testng</artifactId>
    <version>2.27.0</version>
  </dependency>
</dependencies>

<build>
  <plugins>
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <version>3.5.2</version>
      <configuration>
        <suiteXmlFiles>
          <suiteXmlFile>src/test/resources/testng.xml</suiteXmlFile>
        </suiteXmlFiles>
        <parallel>methods</parallel>
        <threadCount>4</threadCount>
      </configuration>
    </plugin>
  </plugins>
</build>
\`\`\`

Selenium Manager (built into 4.6+) replaces WebDriverManager. No external lib needed.

## DriverFactory

A factory pattern centralizes driver creation.

\`\`\`java
package com.example.utils;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.openqa.selenium.remote.RemoteWebDriver;
import java.net.URL;
import java.time.Duration;

public class DriverFactory {

    public static WebDriver create(String browser, boolean headless, String gridUrl) throws Exception {
        WebDriver driver;
        switch (browser.toLowerCase()) {
            case "chrome":
                ChromeOptions chromeOptions = new ChromeOptions();
                if (headless) chromeOptions.addArguments("--headless=new");
                chromeOptions.addArguments("--window-size=1920,1080");
                driver = gridUrl != null
                    ? new RemoteWebDriver(new URL(gridUrl), chromeOptions)
                    : new ChromeDriver(chromeOptions);
                break;
            case "firefox":
                FirefoxOptions firefoxOptions = new FirefoxOptions();
                if (headless) firefoxOptions.addArguments("-headless");
                driver = gridUrl != null
                    ? new RemoteWebDriver(new URL(gridUrl), firefoxOptions)
                    : new FirefoxDriver(firefoxOptions);
                break;
            default:
                throw new IllegalArgumentException("Unknown browser: " + browser);
        }
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));
        return driver;
    }
}
\`\`\`

## Base Test Class

The BaseTest centralizes driver lifecycle.

\`\`\`java
package com.example.tests;

import com.example.utils.DriverFactory;
import org.openqa.selenium.WebDriver;
import org.testng.ITestResult;
import org.testng.annotations.*;

public abstract class BaseTest {
    protected WebDriver driver;

    @BeforeMethod
    @Parameters({"browser", "headless", "gridUrl"})
    public void setUp(
        @Optional("chrome") String browser,
        @Optional("false") String headless,
        @Optional String gridUrl
    ) throws Exception {
        driver = DriverFactory.create(browser, Boolean.parseBoolean(headless), gridUrl);
    }

    @AfterMethod
    public void tearDown(ITestResult result) {
        if (result.getStatus() == ITestResult.FAILURE) {
            // Screenshot capture handled by listener
        }
        if (driver != null) driver.quit();
    }
}
\`\`\`

Parameters come from testng.xml or command line.

## Page Object Model

Page objects encapsulate UI structure.

\`\`\`java
package com.example.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

public abstract class BasePage {
    protected WebDriver driver;
    protected WebDriverWait wait;

    public BasePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    protected WebElement find(By locator) {
        return wait.until(ExpectedConditions.presenceOfElementLocated(locator));
    }

    protected void click(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    }

    protected void type(By locator, String text) {
        WebElement el = find(locator);
        el.clear();
        el.sendKeys(text);
    }
}


public class LoginPage extends BasePage {
    private static final String URL = "https://app.example.com/login";
    private final By emailField = By.id("email");
    private final By passwordField = By.id("password");
    private final By submitButton = By.id("submit");
    private final By errorMessage = By.cssSelector(".error");

    public LoginPage(WebDriver driver) {
        super(driver);
    }

    public LoginPage navigate() {
        driver.get(URL);
        return this;
    }

    public DashboardPage loginAs(String email, String password) {
        type(emailField, email);
        type(passwordField, password);
        click(submitButton);
        return new DashboardPage(driver);
    }

    public String getErrorMessage() {
        return find(errorMessage).getText();
    }
}
\`\`\`

The fluent interface returns either the same page (for chained actions) or the next page object (for cross-page workflows).

## PageFactory (Alternative)

PageFactory is the older pattern using @FindBy annotations. It still works but lazy initialization can mask timing issues.

\`\`\`java
public class LoginPagePF {
    @FindBy(id = "email")
    private WebElement emailField;

    @FindBy(id = "password")
    private WebElement passwordField;

    @FindBy(id = "submit")
    private WebElement submitButton;

    public LoginPagePF(WebDriver driver) {
        PageFactory.initElements(driver, this);
    }

    public void login(String email, String password) {
        emailField.sendKeys(email);
        passwordField.sendKeys(password);
        submitButton.click();
    }
}
\`\`\`

In 2026 we recommend explicit \`find()\` calls over PageFactory. PageFactory's StaleElementReference issues are well documented and the modern WebDriverWait pattern is more reliable.

## Tests

\`\`\`java
package com.example.tests;

import com.example.pages.LoginPage;
import org.testng.Assert;
import org.testng.annotations.*;

public class LoginTest extends BaseTest {

    @Test(description = "Standard user can log in")
    public void testLoginSuccess() {
        LoginPage page = new LoginPage(driver).navigate();
        var dashboard = page.loginAs("user@example.com", "demo");
        Assert.assertTrue(driver.getTitle().contains("Dashboard"));
    }

    @Test(description = "Invalid credentials show error")
    public void testLoginFailure() {
        LoginPage page = new LoginPage(driver).navigate();
        page.loginAs("bad@example.com", "wrong");
        Assert.assertEquals(page.getErrorMessage(), "Invalid credentials");
    }
}
\`\`\`

## Data Providers

For data-driven testing.

\`\`\`java
@DataProvider(name = "loginCredentials")
public Object[][] loginCredentials() {
    return new Object[][] {
        {"user1@example.com", "demo123", true},
        {"user2@example.com", "demo123", true},
        {"bad@example.com", "wrong", false},
        {"", "", false},
    };
}

@Test(dataProvider = "loginCredentials")
public void testLoginScenarios(String email, String password, boolean shouldSucceed) {
    LoginPage page = new LoginPage(driver).navigate();
    page.loginAs(email, password);
    if (shouldSucceed) {
        Assert.assertTrue(driver.getTitle().contains("Dashboard"));
    } else {
        Assert.assertFalse(driver.getTitle().contains("Dashboard"));
    }
}
\`\`\`

For external data, read from JSON or CSV in the provider method.

## Parallel Execution

TestNG XML controls parallelism.

\`\`\`xml
<!-- src/test/resources/testng.xml -->
<!DOCTYPE suite SYSTEM "http://testng.org/testng-1.0.dtd">
<suite name="SeleniumSuite" parallel="methods" thread-count="4">
  <parameter name="browser" value="chrome"/>
  <parameter name="headless" value="false"/>
  <parameter name="gridUrl" value="http://localhost:4444"/>

  <test name="LoginTests">
    <classes>
      <class name="com.example.tests.LoginTest"/>
    </classes>
  </test>

  <test name="CheckoutTests">
    <classes>
      <class name="com.example.tests.CheckoutTest"/>
    </classes>
  </test>
</suite>
\`\`\`

\`parallel="methods"\` runs test methods in parallel. \`thread-count="4"\` uses 4 threads. Combined with Grid, this gives substantial speedup.

| Parallelism Mode | Granularity | Use Case |
|---|---|---|
| methods | Method-level | Maximum parallelism |
| classes | Class-level | Tests in same class share state |
| instances | Test instances | Multiple browsers per class |
| tests | TestNG \`<test>\` nodes | Coarse-grained |

## Listeners

TestNG listeners catch cross-cutting concerns.

\`\`\`java
public class ScreenshotListener implements ITestListener {
    @Override
    public void onTestFailure(ITestResult result) {
        WebDriver driver = ((BaseTest) result.getInstance()).driver;
        if (driver != null) {
            File ss = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
            String name = result.getMethod().getMethodName() + "-" + System.currentTimeMillis() + ".png";
            try {
                Files.copy(ss.toPath(), Path.of("target/screenshots", name));
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
\`\`\`

Register the listener in testng.xml:

\`\`\`xml
<suite name="SeleniumSuite">
  <listeners>
    <listener class-name="com.example.utils.ScreenshotListener"/>
  </listeners>
  <!-- ... -->
</suite>
\`\`\`

## Retry Analyzer

For known-flaky tests.

\`\`\`java
public class RetryAnalyzer implements IRetryAnalyzer {
    private int retryCount = 0;
    private static final int MAX_RETRIES = 2;

    @Override
    public boolean retry(ITestResult result) {
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            return true;
        }
        return false;
    }
}

@Test(retryAnalyzer = RetryAnalyzer.class)
public void testFlakyScenario() {
    // ...
}
\`\`\`

Apply to specific tests, not globally. Globally applying retries hides real flakiness.

## Allure Reporting

\`\`\`bash
mvn clean test
allure serve target/allure-results
\`\`\`

Annotate tests for Allure metadata:

\`\`\`java
@Test
@Description("Standard user login flow")
@Severity(SeverityLevel.CRITICAL)
@Feature("Authentication")
@Story("Successful login")
public void testLoginSuccess() {
    Allure.step("Navigate to login", () -> new LoginPage(driver).navigate());
    Allure.step("Submit credentials", () -> new LoginPage(driver).loginAs("u", "p"));
    Allure.step("Verify dashboard", () -> Assert.assertTrue(driver.getTitle().contains("Dashboard")));
}
\`\`\`

## CI Integration

\`\`\`yaml
name: Selenium Java Tests

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
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Run tests
        run: |
          mvn test \\
            -DgridUrl=http://localhost:4444 \\
            -Dbrowser=chrome

      - name: Allure report
        if: always()
        uses: simple-elf/allure-report-action@master
        with:
          allure_results: target/allure-results

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: screenshots
          path: target/screenshots
\`\`\`

## Conclusion

Selenium + Java + TestNG is the enterprise-grade web test stack of 2026. Page Object Model with explicit WebDriverWait, TestNG parallel execution, listener-driven screenshots, and Allure reporting cover the needs of teams running thousands of tests across many environments. For new Java projects this remains the default.

Browse the [skills directory](/skills) for Selenium AI agent skills. Read [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide) for distributed runtimes and [Selenium BiDi protocol guide](/blog/selenium-bidirectional-bidi-protocol-guide) for advanced event handling.
`,
};
