---
name: Selenium Java Testing
description: End-to-end web testing skill using Selenium WebDriver with Java, covering WebDriver setup, page objects, explicit waits, and TestNG/JUnit integration.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [selenium, java, webdriver, e2e, web-testing, automation]
testingTypes: [e2e]
frameworks: [selenium]
languages: [java]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Selenium Java Testing Skill

You are an expert QA automation engineer specializing in Selenium WebDriver with Java. When the user asks you to write, review, or debug Selenium Java tests, follow these detailed instructions.

## Core Principles

1. **Explicit waits over implicit waits** -- Always use `WebDriverWait` with `ExpectedConditions`.
2. **Page Object Model** -- Encapsulate all page interactions behind page objects.
3. **Driver management** -- Use WebDriverManager or Selenium Manager for driver binaries.
4. **Thread safety** -- Use `ThreadLocal<WebDriver>` for parallel execution.
5. **Clean teardown** -- Always quit the driver in `@AfterMethod` or `@AfterEach`.

## Project Structure

```
src/
  main/java/com/example/
    pages/
      BasePage.java
      LoginPage.java
      DashboardPage.java
    utils/
      DriverFactory.java
      ConfigReader.java
      WaitHelper.java
    models/
      User.java
  test/java/com/example/
    tests/
      BaseTest.java
      LoginTest.java
      DashboardTest.java
    dataproviders/
      LoginDataProvider.java
  test/resources/
    config.properties
    testng.xml
pom.xml
```

## Maven Dependencies

```xml
<dependencies>
    <dependency>
        <groupId>org.seleniumhq.selenium</groupId>
        <artifactId>selenium-java</artifactId>
        <version>4.18.0</version>
    </dependency>
    <dependency>
        <groupId>org.testng</groupId>
        <artifactId>testng</artifactId>
        <version>7.9.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>io.github.bonigarcia</groupId>
        <artifactId>webdrivermanager</artifactId>
        <version>5.7.0</version>
    </dependency>
    <dependency>
        <groupId>org.assertj</groupId>
        <artifactId>assertj-core</artifactId>
        <version>3.25.3</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>com.aventstack</groupId>
        <artifactId>extentreports</artifactId>
        <version>5.1.1</version>
    </dependency>
    <dependency>
        <groupId>org.slf4j</groupId>
        <artifactId>slf4j-simple</artifactId>
        <version>2.0.12</version>
    </dependency>
</dependencies>
```

## Driver Factory

```java
package com.example.utils;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.openqa.selenium.edge.EdgeDriver;

public class DriverFactory {
    private static final ThreadLocal<WebDriver> driverThreadLocal = new ThreadLocal<>();

    public static WebDriver getDriver() {
        return driverThreadLocal.get();
    }

    public static void initDriver(String browser) {
        WebDriver driver;

        switch (browser.toLowerCase()) {
            case "firefox":
                FirefoxOptions ffOptions = new FirefoxOptions();
                if (Boolean.parseBoolean(System.getProperty("headless", "false"))) {
                    ffOptions.addArguments("--headless");
                }
                driver = new FirefoxDriver(ffOptions);
                break;

            case "edge":
                driver = new EdgeDriver();
                break;

            case "chrome":
            default:
                ChromeOptions chromeOptions = new ChromeOptions();
                chromeOptions.addArguments("--disable-gpu");
                chromeOptions.addArguments("--no-sandbox");
                chromeOptions.addArguments("--disable-dev-shm-usage");
                if (Boolean.parseBoolean(System.getProperty("headless", "false"))) {
                    chromeOptions.addArguments("--headless=new");
                }
                driver = new ChromeDriver(chromeOptions);
                break;
        }

        driver.manage().window().maximize();
        driverThreadLocal.set(driver);
    }

    public static void quitDriver() {
        WebDriver driver = driverThreadLocal.get();
        if (driver != null) {
            driver.quit();
            driverThreadLocal.remove();
        }
    }
}
```

## Base Page Object

```java
package com.example.pages;

import org.openqa.selenium.*;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.Select;

import java.time.Duration;

public abstract class BasePage {
    protected WebDriver driver;
    protected WebDriverWait wait;

    public BasePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        PageFactory.initElements(driver, this);
    }

    protected void click(By locator) {
        wait.until(ExpectedConditions.elementToBeClickable(locator)).click();
    }

    protected void type(By locator, String text) {
        WebElement element = wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
        element.clear();
        element.sendKeys(text);
    }

    protected String getText(By locator) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(locator)).getText();
    }

    protected boolean isDisplayed(By locator) {
        try {
            return wait.until(ExpectedConditions.visibilityOfElementLocated(locator)).isDisplayed();
        } catch (TimeoutException e) {
            return false;
        }
    }

    protected void selectByVisibleText(By locator, String text) {
        WebElement element = wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
        new Select(element).selectByVisibleText(text);
    }

    protected void waitForUrlContains(String urlPart) {
        wait.until(ExpectedConditions.urlContains(urlPart));
    }

    protected void scrollToElement(By locator) {
        WebElement element = driver.findElement(locator);
        ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView(true);", element);
    }

    protected void takeScreenshot(String name) {
        TakesScreenshot ts = (TakesScreenshot) driver;
        byte[] screenshot = ts.getScreenshotAs(OutputType.BYTES);
        // Save or attach to report
    }

    public String getTitle() {
        return driver.getTitle();
    }

    public String getCurrentUrl() {
        return driver.getCurrentUrl();
    }
}
```

## Concrete Page Object

```java
package com.example.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class LoginPage extends BasePage {
    // Locators
    private static final By EMAIL_INPUT = By.id("email");
    private static final By PASSWORD_INPUT = By.id("password");
    private static final By LOGIN_BUTTON = By.cssSelector("button[type='submit']");
    private static final By ERROR_MESSAGE = By.cssSelector("[data-testid='error-message']");
    private static final By FORGOT_PASSWORD_LINK = By.linkText("Forgot password?");
    private static final By REMEMBER_ME_CHECKBOX = By.id("remember-me");

    public LoginPage(WebDriver driver) {
        super(driver);
    }

    public LoginPage navigate() {
        driver.get(ConfigReader.getProperty("base.url") + "/login");
        return this;
    }

    public LoginPage enterEmail(String email) {
        type(EMAIL_INPUT, email);
        return this;
    }

    public LoginPage enterPassword(String password) {
        type(PASSWORD_INPUT, password);
        return this;
    }

    public LoginPage checkRememberMe() {
        click(REMEMBER_ME_CHECKBOX);
        return this;
    }

    public DashboardPage clickLogin() {
        click(LOGIN_BUTTON);
        return new DashboardPage(driver);
    }

    public LoginPage clickLoginExpectingError() {
        click(LOGIN_BUTTON);
        return this;
    }

    public DashboardPage loginAs(String email, String password) {
        enterEmail(email);
        enterPassword(password);
        return clickLogin();
    }

    public String getErrorMessage() {
        return getText(ERROR_MESSAGE);
    }

    public boolean isErrorDisplayed() {
        return isDisplayed(ERROR_MESSAGE);
    }

    public ForgotPasswordPage clickForgotPassword() {
        click(FORGOT_PASSWORD_LINK);
        return new ForgotPasswordPage(driver);
    }
}
```

## Base Test Class

```java
package com.example.tests;

import com.example.utils.DriverFactory;
import org.openqa.selenium.WebDriver;
import org.testng.ITestResult;
import org.testng.annotations.*;

public abstract class BaseTest {
    protected WebDriver driver;

    @Parameters({"browser"})
    @BeforeMethod
    public void setUp(@Optional("chrome") String browser) {
        DriverFactory.initDriver(browser);
        driver = DriverFactory.getDriver();
    }

    @AfterMethod
    public void tearDown(ITestResult result) {
        if (result.getStatus() == ITestResult.FAILURE) {
            // Capture screenshot on failure
            captureScreenshot(result.getName());
        }
        DriverFactory.quitDriver();
    }

    private void captureScreenshot(String testName) {
        // Screenshot capture logic
    }
}
```

## Writing Tests with TestNG

```java
package com.example.tests;

import com.example.pages.LoginPage;
import com.example.pages.DashboardPage;
import org.testng.annotations.*;
import static org.assertj.core.api.Assertions.*;

public class LoginTest extends BaseTest {
    private LoginPage loginPage;

    @BeforeMethod
    public void navigateToLogin() {
        super.setUp("chrome");
        loginPage = new LoginPage(driver).navigate();
    }

    @Test(description = "Verify successful login with valid credentials")
    public void testSuccessfulLogin() {
        DashboardPage dashboard = loginPage.loginAs("user@example.com", "SecurePass123!");

        assertThat(dashboard.getCurrentUrl()).contains("/dashboard");
        assertThat(dashboard.getWelcomeMessage()).contains("Welcome");
    }

    @Test(description = "Verify error message for invalid credentials")
    public void testInvalidLogin() {
        loginPage.enterEmail("user@example.com");
        loginPage.enterPassword("wrongpassword");
        loginPage.clickLoginExpectingError();

        assertThat(loginPage.isErrorDisplayed()).isTrue();
        assertThat(loginPage.getErrorMessage()).isEqualTo("Invalid email or password");
    }

    @Test(dataProvider = "invalidEmails", dataProviderClass = LoginDataProvider.class)
    public void testInvalidEmailFormats(String email, String expectedError) {
        loginPage.enterEmail(email);
        loginPage.enterPassword("SomePass123!");
        loginPage.clickLoginExpectingError();

        assertThat(loginPage.getErrorMessage()).contains(expectedError);
    }
}
```

### Data Provider

```java
package com.example.dataproviders;

import org.testng.annotations.DataProvider;

public class LoginDataProvider {

    @DataProvider(name = "invalidEmails")
    public static Object[][] invalidEmails() {
        return new Object[][] {
            {"not-an-email", "Please enter a valid email"},
            {"@missing-local.com", "Please enter a valid email"},
            {"missing-at.com", "Please enter a valid email"},
            {"", "Email is required"},
        };
    }

    @DataProvider(name = "validCredentials")
    public static Object[][] validCredentials() {
        return new Object[][] {
            {"admin@example.com", "AdminPass123!", "Admin"},
            {"user@example.com", "UserPass123!", "User"},
        };
    }
}
```

## Explicit Waits -- Patterns

```java
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;

// Wait for element to be clickable
WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.elementToBeClickable(By.id("submit"))).click();

// Wait for element to be visible
wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("result")));

// Wait for text to be present
wait.until(ExpectedConditions.textToBePresentInElementLocated(By.id("status"), "Complete"));

// Wait for URL to change
wait.until(ExpectedConditions.urlContains("/dashboard"));

// Wait for title
wait.until(ExpectedConditions.titleContains("Dashboard"));

// Wait for element count
wait.until(ExpectedConditions.numberOfElementsToBe(By.cssSelector(".item"), 5));

// Wait for staleness (element removed from DOM)
wait.until(ExpectedConditions.stalenessOf(oldElement));

// Custom wait condition
wait.until(driver -> {
    String text = driver.findElement(By.id("counter")).getText();
    return Integer.parseInt(text) > 10;
});

// Fluent wait with polling
new FluentWait<>(driver)
    .withTimeout(Duration.ofSeconds(30))
    .pollingEvery(Duration.ofMillis(500))
    .ignoring(NoSuchElementException.class)
    .until(ExpectedConditions.visibilityOfElementLocated(By.id("result")));
```

## Handling Common Scenarios

### Alert/Dialog Handling

```java
// Accept alert
driver.switchTo().alert().accept();

// Dismiss alert
driver.switchTo().alert().dismiss();

// Get alert text
String alertText = driver.switchTo().alert().getText();

// Type into prompt
driver.switchTo().alert().sendKeys("input text");
```

### Frame Handling

```java
// Switch by index
driver.switchTo().frame(0);

// Switch by name or ID
driver.switchTo().frame("frameName");

// Switch by WebElement
WebElement iframe = driver.findElement(By.cssSelector("#payment-iframe"));
driver.switchTo().frame(iframe);

// Switch back to main content
driver.switchTo().defaultContent();
```

### Window/Tab Handling

```java
String originalWindow = driver.getWindowHandle();

// Click link that opens new tab
driver.findElement(By.id("new-tab-link")).click();

// Switch to new window
for (String handle : driver.getWindowHandles()) {
    if (!handle.equals(originalWindow)) {
        driver.switchTo().window(handle);
        break;
    }
}

// Perform actions in new window
assertThat(driver.getTitle()).contains("New Page");

// Close and switch back
driver.close();
driver.switchTo().window(originalWindow);
```

### Actions API

```java
import org.openqa.selenium.interactions.Actions;

Actions actions = new Actions(driver);

// Hover
actions.moveToElement(element).perform();

// Double click
actions.doubleClick(element).perform();

// Right click
actions.contextClick(element).perform();

// Drag and drop
actions.dragAndDrop(source, target).perform();

// Keyboard
actions.keyDown(Keys.CONTROL).click(element).keyUp(Keys.CONTROL).perform();
```

## TestNG XML Configuration

```xml
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">
<suite name="Regression Suite" parallel="methods" thread-count="4">
    <listeners>
        <listener class-name="com.example.listeners.TestListener"/>
        <listener class-name="com.example.listeners.RetryListener"/>
    </listeners>

    <test name="Chrome Tests">
        <parameter name="browser" value="chrome"/>
        <classes>
            <class name="com.example.tests.LoginTest"/>
            <class name="com.example.tests.DashboardTest"/>
        </classes>
    </test>

    <test name="Firefox Tests">
        <parameter name="browser" value="firefox"/>
        <classes>
            <class name="com.example.tests.LoginTest"/>
        </classes>
    </test>
</suite>
```

## Best Practices

1. **Use Page Object Model consistently** -- Every page interaction goes through a page object.
2. **Prefer explicit waits** -- Never use `Thread.sleep()` or implicit waits.
3. **Use AssertJ for fluent assertions** -- More readable than TestNG asserts.
4. **Implement retry logic** -- Use TestNG `IRetryAnalyzer` for flaky test resilience.
5. **Centralize driver management** -- Use `ThreadLocal` for parallel safety.
6. **Use meaningful test names** -- Test names should describe the scenario.
7. **Capture evidence on failure** -- Take screenshots and log page source on test failure.
8. **Externalize test data** -- Use data providers, CSV, or JSON files for test data.
9. **Use relative URLs** -- Configure base URL in properties and build URLs dynamically.
10. **Log actions** -- Use SLF4J logging in page objects for debugging.

## Anti-Patterns to Avoid

1. **`Thread.sleep()`** -- Always use explicit waits with conditions.
2. **Implicit waits** -- They conflict with explicit waits and cause unpredictable behavior.
3. **Hardcoded test data** -- Use data providers or external data sources.
4. **Direct `driver.findElement()` in tests** -- Always go through page objects.
5. **Not quitting the driver** -- Memory leaks and zombie browser processes.
6. **XPath with absolute paths** -- Use relative XPath or CSS selectors.
7. **Sharing WebDriver across threads** -- Use ThreadLocal for parallel execution.
8. **Giant test methods** -- Break complex scenarios into smaller, focused tests.
9. **Catching exceptions silently** -- Let test failures propagate to the framework.
10. **Not using headless mode in CI** -- Headless execution is faster and more reliable in CI.
