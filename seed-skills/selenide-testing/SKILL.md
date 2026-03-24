---
name: Selenide Testing
description: Expert-level Selenide UI testing skill for Java applications. Covers concise fluent API, automatic waits, smart selectors, collections, Page Objects, and integration with JUnit 5 and Gradle/Maven builds.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [selenide, java, selenium, ui-testing, fluent-api, auto-wait, browser-testing]
testingTypes: [e2e, ui, integration]
frameworks: [selenide, junit5, selenium]
languages: [java]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Selenide Testing Skill

You are an expert QA automation engineer specializing in Selenide UI testing for Java applications. When the user asks you to write, review, or debug Selenide tests, follow these detailed instructions.

## Core Principles

1. **Concise fluent API** -- Use Selenide's `$` and `$$` shortcuts instead of verbose Selenium WebDriver calls. Selenide wraps Selenium to provide a cleaner, more readable API.
2. **Automatic waits** -- Selenide waits for elements automatically. Never add `Thread.sleep()` or explicit waits unless absolutely necessary.
3. **Smart selectors** -- Prefer `data-testid` attributes, then CSS selectors. Avoid XPath unless the DOM structure requires it.
4. **Fail-fast assertions** -- Use `shouldBe`, `shouldHave`, `shouldNot` conditions that produce clear error messages with screenshots on failure.
5. **Test isolation** -- Each test must be independent. Use `@BeforeEach` to set up clean state. Never rely on test execution order.

## Project Structure

Always organize Selenide projects with this structure:

```
src/
  test/
    java/
      com/example/
        tests/
          LoginTest.java
          DashboardTest.java
          CheckoutTest.java
        pages/
          LoginPage.java
          DashboardPage.java
          BasePage.java
        config/
          TestConfig.java
        data/
          TestDataFactory.java
        utils/
          TestHelpers.java
    resources/
      selenide.properties
build.gradle        # or pom.xml
```

## Setup

### Maven

```xml
<dependencies>
    <dependency>
        <groupId>com.codeborne</groupId>
        <artifactId>selenide</artifactId>
        <version>7.2.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.2</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Gradle

```groovy
dependencies {
    testImplementation 'com.codeborne:selenide:7.2.0'
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2'
}
```

### Configuration (selenide.properties)

```properties
selenide.browser=chrome
selenide.baseUrl=http://localhost:3000
selenide.timeout=10000
selenide.screenshots=true
selenide.savePageSource=false
selenide.headless=false
selenide.pageLoadTimeout=30000
```

## Basic Test Patterns

### Login Test

```java
import com.codeborne.selenide.*;
import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Condition.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;

class LoginTest {

    @BeforeEach
    void setUp() {
        Configuration.baseUrl = "http://localhost:3000";
        Configuration.browser = "chrome";
        Configuration.timeout = 10000;
    }

    @Test
    void loginWithValidCredentials() {
        open("/login");
        $("#email").setValue("user@test.com");
        $("#password").setValue("password123");
        $("button[type='submit']").click();
        $(".dashboard").shouldBe(visible);
        $(".welcome-message").shouldHave(text("Welcome"));
    }

    @Test
    void loginShowsErrorForInvalidCredentials() {
        open("/login");
        $("#email").setValue("wrong@test.com");
        $("#password").setValue("wrong");
        $("button[type='submit']").click();
        $(".error-message").shouldBe(visible)
            .shouldHave(text("Invalid credentials"));
    }

    @Test
    void loginRequiresEmail() {
        open("/login");
        $("#password").setValue("password123");
        $("button[type='submit']").click();
        $("#email-error").shouldBe(visible);
    }
}
```

## Selectors Reference

```java
// CSS selectors (preferred)
$("[data-testid='login-btn']")        // data-testid (best practice)
$("css-selector")                     // Generic CSS
$("#email")                           // By ID
$(".submit-button")                   // By class

// Text-based selectors
$(byText("Login"))                    // Exact text match
$(withText("Welc"))                   // Contains text
$(byTitle("Submit Form"))             // By title attribute

// Attribute selectors
$(byId("email"))                      // By ID
$(byName("password"))                 // By name
$(byAttribute("role", "button"))      // By any attribute

// XPath (avoid when possible)
$(byXpath("//button[@type='submit']"))

// Collections
$$("li").shouldHave(size(5));
$$("li").first().shouldHave(text("Item 1"));
$$("li").last().shouldHave(text("Item 5"));
$$("li").filterBy(text("Active")).shouldHave(size(2));
$$("li").excludeWith(cssClass("disabled")).shouldHave(size(3));
$$("tr").findBy(text("Alice")).shouldBe(visible);
```

## Conditions Reference

```java
// Visibility
element.shouldBe(visible);
element.shouldBe(hidden);
element.shouldNotBe(visible);
element.shouldBe(exist);
element.shouldNot(exist);

// State
element.shouldBe(enabled);
element.shouldBe(disabled);
element.shouldBe(readonly);
element.shouldBe(focused);
element.shouldBe(selected);
element.shouldBe(checked);

// Text and values
element.shouldHave(text("expected"));
element.shouldHave(exactText("Exact Match"));
element.shouldHave(textCaseSensitive("CaseSensitive"));
element.shouldHave(value("input value"));
element.shouldHave(exactValue("exact input"));

// Attributes and CSS
element.shouldHave(attribute("href", "/link"));
element.shouldHave(attribute("data-state", "active"));
element.shouldHave(cssClass("active"));
element.shouldHave(cssValue("color", "rgb(255, 0, 0)"));
```

## Page Object Model

### Base Page

```java
import com.codeborne.selenide.SelenideElement;
import static com.codeborne.selenide.Selenide.*;

public abstract class BasePage {

    public abstract SelenideElement rootElement();

    public boolean isDisplayed() {
        return rootElement().isDisplayed();
    }

    protected void navigateTo(String path) {
        open(path);
    }
}
```

### Login Page

```java
import com.codeborne.selenide.SelenideElement;
import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Condition.*;

public class LoginPage extends BasePage {

    private final SelenideElement emailField = $("#email");
    private final SelenideElement passwordField = $("#password");
    private final SelenideElement submitButton = $("[data-testid='login-submit']");
    private final SelenideElement errorMessage = $(".error-message");
    private final SelenideElement forgotPasswordLink = $("a[href='/forgot-password']");

    @Override
    public SelenideElement rootElement() {
        return $("[data-testid='login-form']");
    }

    public LoginPage open() {
        navigateTo("/login");
        rootElement().shouldBe(visible);
        return this;
    }

    public DashboardPage loginAs(String email, String password) {
        emailField.setValue(email);
        passwordField.setValue(password);
        submitButton.click();
        return new DashboardPage();
    }

    public LoginPage loginExpectingError(String email, String password) {
        emailField.setValue(email);
        passwordField.setValue(password);
        submitButton.click();
        errorMessage.shouldBe(visible);
        return this;
    }

    public String getErrorMessage() {
        return errorMessage.getText();
    }
}
```

### Test Using Page Objects

```java
import org.junit.jupiter.api.Test;
import static com.codeborne.selenide.Condition.*;

class LoginPageTest {

    private final LoginPage loginPage = new LoginPage();

    @Test
    void successfulLogin() {
        loginPage.open()
            .loginAs("user@test.com", "password123");
        new DashboardPage().welcomeMessage()
            .shouldHave(text("Welcome"));
    }

    @Test
    void invalidLoginShowsError() {
        loginPage.open()
            .loginExpectingError("bad@test.com", "wrong");
        assert loginPage.getErrorMessage().contains("Invalid");
    }
}
```

## Collections and Iteration

```java
import static com.codeborne.selenide.CollectionCondition.*;
import static com.codeborne.selenide.Selenide.$$;

// Size assertions
$$(".todo-item").shouldHave(size(5));
$$(".todo-item").shouldHave(sizeGreaterThan(3));
$$(".todo-item").shouldHave(sizeGreaterThanOrEqual(5));
$$(".todo-item").shouldHave(sizeLessThan(10));

// Text assertions on collections
$$(".menu-item").shouldHave(texts("Home", "About", "Contact"));
$$(".menu-item").shouldHave(exactTexts("Home", "About", "Contact"));
$$(".menu-item").shouldHave(textsInAnyOrder("Contact", "Home", "About"));

// Filtering and finding
$$("tr.user-row")
    .filterBy(text("Active"))
    .shouldHave(size(3));

$$("tr.user-row")
    .findBy(text("Alice"))
    .find(".delete-btn")
    .click();

// Iterating
$$(".product-card").forEach(card -> {
    card.find(".price").shouldBe(visible);
    card.find(".title").shouldNotBe(empty);
});

// First / last / get
$$(".items").first().shouldHave(text("First"));
$$(".items").last().shouldHave(text("Last"));
$$(".items").get(2).shouldHave(text("Third"));
```

## File Upload and Download

```java
// Upload
$("input[type='file']").uploadFile(new File("src/test/resources/test.pdf"));
$("input[type='file']").uploadFromClasspath("test.pdf");

// Download
File file = $("a.download-link").download();
assertThat(file.getName()).isEqualTo("report.pdf");
assertThat(file.length()).isGreaterThan(0);
```

## Working with Frames and Windows

```java
// Frames
switchTo().frame("iframe-name");
$(".inside-frame").shouldBe(visible);
switchTo().defaultContent();

// New windows
String originalWindow = WebDriverRunner.getWebDriver().getWindowHandle();
$("a[target='_blank']").click();
switchTo().window(1);
$(".new-window-content").shouldBe(visible);
switchTo().window(originalWindow);
```

## JavaScript Execution

```java
// Execute JavaScript
executeJavaScript("window.scrollTo(0, document.body.scrollHeight)");
long scrollHeight = executeJavaScript("return document.body.scrollHeight");

// Execute on element
executeJavaScript("arguments[0].click()", $(".hidden-button"));
executeJavaScript("arguments[0].scrollIntoView(true)", $(".target-element"));
```

## Configuration Patterns

```java
import com.codeborne.selenide.Configuration;

// Programmatic configuration
Configuration.browser = "chrome";
Configuration.baseUrl = "http://localhost:3000";
Configuration.timeout = 10000;
Configuration.headless = true;
Configuration.browserSize = "1920x1080";
Configuration.screenshots = true;
Configuration.savePageSource = false;
Configuration.reportsFolder = "build/reports/tests";
Configuration.downloadsFolder = "build/downloads";

// Remote WebDriver configuration
Configuration.remote = "http://selenium-hub:4444/wd/hub";
Configuration.browserCapabilities = new DesiredCapabilities();
Configuration.browserCapabilities.setCapability("browserName", "chrome");
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Selenide Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Run tests
        run: ./gradlew test
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: selenide-reports
          path: build/reports/tests/
```

## Best Practices

1. **Use data-testid selectors** -- Add `data-testid` attributes to elements specifically for testing. They survive CSS refactors and are explicit about their purpose.
2. **Let Selenide handle waits** -- Never use `Thread.sleep()`. Selenide's built-in implicit waits handle dynamic content. Only increase `Configuration.timeout` if you have genuinely slow pages.
3. **One assertion per concept** -- Group related assertions but keep each test focused on one behavior. Use descriptive test method names.
4. **Page Object encapsulation** -- Never expose `SelenideElement` fields publicly. Instead, expose action methods (`loginAs`, `addToCart`) that return the next page object.
5. **Use collections wisely** -- Use `$$()` for lists and tables. Filter with `filterBy` and `findBy` instead of iterating manually.
6. **Configure in properties file** -- Use `selenide.properties` for environment-specific config. Override in CI with system properties (`-Dselenide.headless=true`).
7. **Screenshot on failure** -- Selenide captures screenshots automatically on failure. Configure `reportsFolder` to a CI-accessible location.
8. **Clean browser state** -- Use `@BeforeEach` with `Selenide.clearBrowserCookies()` or open a fresh browser per test for true isolation.
9. **Avoid over-abstracting** -- Page Objects should match user mental models. Don't create deep inheritance hierarchies or overly generic helpers.
10. **Run headless in CI** -- Set `Configuration.headless = true` in CI to avoid display server dependencies and speed up execution.

## Anti-Patterns

1. **Thread.sleep() for synchronization** -- Never use `Thread.sleep()`. Selenide's auto-waiting handles element readiness. If an element takes long, increase the timeout or check if the page has a loading indicator.
2. **XPath as default selector strategy** -- XPath is brittle and hard to read. Use CSS selectors or Selenide's text-based finders instead.
3. **Test interdependency** -- Tests that depend on each other or must run in a specific order will cause cascading failures and are impossible to run in parallel.
4. **Hardcoded URLs** -- Never hardcode full URLs in tests. Use `Configuration.baseUrl` and relative paths.
5. **Ignoring collection assertions** -- Using `$$().get(0).shouldHave(text("x"))` without first asserting the collection size leads to cryptic index errors.
6. **Giant test methods** -- Tests with 50+ lines of actions and assertions are unreadable. Break them into smaller focused tests or extract helper methods.
7. **Testing implementation details** -- Don't assert on CSS classes for styling or internal DOM structure. Assert on user-visible behavior.
8. **Shared mutable state between tests** -- Static variables or class fields that accumulate state across tests cause flaky results.
9. **Catching exceptions in tests** -- Don't wrap Selenide calls in try/catch. Let assertions fail naturally with Selenide's clear error messages and screenshots.
10. **Skipping Page Objects for simple tests** -- Even simple tests benefit from Page Objects. Inline selectors scattered across test files become maintenance nightmares.

## Run Commands

```bash
# Maven
mvn test
mvn test -Dselenide.headless=true
mvn test -Dtest=LoginTest
mvn test -Dselenide.browser=firefox

# Gradle
./gradlew test
./gradlew test --tests "com.example.tests.LoginTest"
./gradlew test -Dselenide.headless=true
```
