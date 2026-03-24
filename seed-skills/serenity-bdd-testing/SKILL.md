---
name: "Serenity BDD Testing"
description: "Java BDD testing with Serenity BDD framework using the Screenplay pattern, Cucumber integration, step libraries, comprehensive reporting, and living documentation generation."
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [serenity, bdd, java, screenplay, cucumber, reporting, living-documentation, step-libraries]
testingTypes: [bdd, acceptance, e2e, integration]
frameworks: [serenity-bdd]
languages: [java]
domains: [web, api, backend]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Serenity BDD Testing

You are an expert QA engineer specializing in Serenity BDD, the Java testing framework that produces rich living documentation. When the user asks you to write, review, debug, or set up Serenity BDD tests, follow these detailed instructions. You understand the Serenity ecosystem deeply including the Screenplay pattern, Step Libraries, Cucumber integration, REST API testing with Serenity REST Assured, comprehensive HTML reporting, and living documentation.

## Core Principles

1. **Living Documentation** — Serenity generates rich HTML reports that serve as living documentation. Write tests that produce meaningful, stakeholder-readable reports.
2. **Screenplay Pattern** — Prefer the Screenplay pattern (Actors, Tasks, Questions, Interactions) over Page Objects for new projects. It scales better and produces clearer reports.
3. **Step Libraries** — Use `@Step` annotated methods in dedicated step classes. Serenity records each step in reports with automatic screenshots.
4. **Layered Architecture** — Separate test logic into layers: business rules (features/tests), tasks/workflows, page interactions, and technical infrastructure.
5. **Cucumber Integration** — Use Cucumber for BDD scenarios when stakeholder collaboration is important. Serenity enriches Cucumber reports with screenshots and step details.
6. **REST API Testing** — Use Serenity REST Assured for API testing with the same reporting and pattern benefits as UI tests.
7. **Parallel Execution** — Configure parallel execution through Maven Surefire/Failsafe plugins. Design tests for isolation and independence.

## Project Structure

```
project-root/
├── pom.xml                           # Maven configuration with Serenity dependencies
├── serenity.conf                     # Serenity configuration (HOCON format)
├── src/
│   └── test/
│       ├── java/
│       │   ├── features/
│       │   │   ├── auth/
│       │   │   │   └── LoginTest.java
│       │   │   ├── shopping/
│       │   │   │   └── CartTest.java
│       │   │   └── CucumberTestRunner.java
│       │   ├── screenplay/
│       │   │   ├── tasks/
│       │   │   │   ├── Login.java
│       │   │   │   ├── NavigateTo.java
│       │   │   │   └── AddToCart.java
│       │   │   ├── questions/
│       │   │   │   ├── DashboardInfo.java
│       │   │   │   └── CartDetails.java
│       │   │   ├── interactions/
│       │   │   │   └── EnterCredentials.java
│       │   │   └── ui/
│       │   │       ├── LoginPage.java
│       │   │       ├── DashboardPage.java
│       │   │       └── CartPage.java
│       │   ├── steps/
│       │   │   ├── AuthSteps.java
│       │   │   ├── NavigationSteps.java
│       │   │   └── ShoppingSteps.java
│       │   ├── stepdefinitions/
│       │   │   ├── LoginStepDefs.java
│       │   │   └── CartStepDefs.java
│       │   └── config/
│       │       └── TestConfig.java
│       └── resources/
│           ├── features/
│           │   ├── auth/
│           │   │   └── login.feature
│           │   └── shopping/
│           │       └── cart.feature
│           └── serenity.conf
├── target/
│   └── site/
│       └── serenity/                 # Generated HTML reports
└── .github/
    └── workflows/
        └── serenity.yml
```

## Detailed Code Examples

### Screenplay Pattern - Tasks

```java
// src/test/java/screenplay/tasks/Login.java
package screenplay.tasks;

import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.Task;
import net.serenitybdd.screenplay.actions.Click;
import net.serenitybdd.screenplay.actions.Enter;
import net.thucydides.core.annotations.Step;
import screenplay.ui.LoginPage;

import static net.serenitybdd.screenplay.Tasks.instrumented;

public class Login implements Task {

    private final String email;
    private final String password;

    public Login(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public static Login withCredentials(String email, String password) {
        return instrumented(Login.class, email, password);
    }

    public static Login asAdmin() {
        return instrumented(Login.class, "admin@example.com", "AdminPass123");
    }

    public static Login asUser() {
        return instrumented(Login.class, "user@example.com", "UserPass123");
    }

    @Override
    @Step("{0} logs in with email #email")
    public <T extends Actor> void performAs(T actor) {
        actor.attemptsTo(
            Enter.theValue(email).into(LoginPage.EMAIL_INPUT),
            Enter.theValue(password).into(LoginPage.PASSWORD_INPUT),
            Click.on(LoginPage.LOGIN_BUTTON)
        );
    }
}

// src/test/java/screenplay/tasks/NavigateTo.java
package screenplay.tasks;

import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.Task;
import net.serenitybdd.screenplay.actions.Open;
import net.thucydides.core.annotations.Step;
import screenplay.ui.LoginPage;

import static net.serenitybdd.screenplay.Tasks.instrumented;

public class NavigateTo {

    public static Task theLoginPage() {
        return instrumented(NavigateToLoginPage.class);
    }

    public static Task theDashboard() {
        return instrumented(NavigateToDashboard.class);
    }

    static class NavigateToLoginPage implements Task {
        LoginPage loginPage;

        @Override
        @Step("{0} navigates to the login page")
        public <T extends Actor> void performAs(T actor) {
            actor.attemptsTo(Open.browserOn(loginPage));
        }
    }

    static class NavigateToDashboard implements Task {
        @Override
        @Step("{0} navigates to the dashboard")
        public <T extends Actor> void performAs(T actor) {
            actor.attemptsTo(Open.url("/dashboard"));
        }
    }
}
```

### Screenplay Pattern - Questions

```java
// src/test/java/screenplay/questions/DashboardInfo.java
package screenplay.questions;

import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.Question;
import net.serenitybdd.screenplay.questions.Text;
import screenplay.ui.DashboardPage;

public class DashboardInfo {

    public static Question<String> welcomeMessage() {
        return Text.of(DashboardPage.WELCOME_MESSAGE);
    }

    public static Question<Boolean> isDisplayed() {
        return actor -> {
            try {
                return DashboardPage.WELCOME_MESSAGE.resolveFor(actor).isVisible();
            } catch (Exception e) {
                return false;
            }
        };
    }

    public static Question<Integer> notificationCount() {
        return actor -> {
            String text = Text.of(DashboardPage.NOTIFICATION_BADGE).answeredBy(actor);
            return Integer.parseInt(text.trim());
        };
    }
}
```

### Screenplay Pattern - UI Targets

```java
// src/test/java/screenplay/ui/LoginPage.java
package screenplay.ui;

import net.serenitybdd.screenplay.targets.Target;
import net.serenitybdd.core.pages.PageObject;
import net.thucydides.core.annotations.DefaultUrl;

@DefaultUrl("/login")
public class LoginPage extends PageObject {
    public static final Target EMAIL_INPUT =
        Target.the("email input").locatedBy("[data-testid='email-input']");

    public static final Target PASSWORD_INPUT =
        Target.the("password input").locatedBy("[data-testid='password-input']");

    public static final Target LOGIN_BUTTON =
        Target.the("login button").locatedBy("[data-testid='login-submit']");

    public static final Target ERROR_MESSAGE =
        Target.the("error message").locatedBy("[data-testid='error-message']");

    public static final Target FORGOT_PASSWORD_LINK =
        Target.the("forgot password link").locatedBy("a[href='/forgot-password']");
}

// src/test/java/screenplay/ui/DashboardPage.java
package screenplay.ui;

import net.serenitybdd.screenplay.targets.Target;

public class DashboardPage {
    public static final Target WELCOME_MESSAGE =
        Target.the("welcome message").locatedBy("[data-testid='welcome-message']");

    public static final Target NOTIFICATION_BADGE =
        Target.the("notification badge").locatedBy("[data-testid='notification-count']");

    public static final Target USER_MENU =
        Target.the("user menu").locatedBy("[data-testid='user-menu']");

    public static final Target LOGOUT_BUTTON =
        Target.the("logout button").locatedBy("[data-testid='logout']");
}
```

### JUnit 5 Test with Screenplay

```java
// src/test/java/features/auth/LoginTest.java
package features.auth;

import net.serenitybdd.junit5.SerenityJUnit5Extension;
import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.abilities.BrowseTheWeb;
import net.serenitybdd.screenplay.ensure.Ensure;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.openqa.selenium.WebDriver;
import screenplay.questions.DashboardInfo;
import screenplay.tasks.Login;
import screenplay.tasks.NavigateTo;
import screenplay.ui.LoginPage;
import net.serenitybdd.screenplay.questions.Text;

@ExtendWith(SerenityJUnit5Extension.class)
@DisplayName("User Authentication")
class LoginTest {

    Actor alice = Actor.named("Alice");

    @BeforeEach
    void setup() {
        alice.can(BrowseTheWeb.with(theDefaultDriver()));
    }

    @Test
    @DisplayName("Should login successfully with valid credentials")
    @Tag("smoke")
    void shouldLoginSuccessfully() {
        alice.attemptsTo(
            NavigateTo.theLoginPage(),
            Login.withCredentials("user@example.com", "SecurePass123")
        );

        alice.attemptsTo(
            Ensure.that(DashboardInfo.welcomeMessage()).contains("Welcome")
        );
    }

    @Test
    @DisplayName("Should show error for invalid credentials")
    @Tag("negative")
    void shouldShowErrorForInvalidCredentials() {
        alice.attemptsTo(
            NavigateTo.theLoginPage(),
            Login.withCredentials("user@example.com", "wrongpassword")
        );

        alice.attemptsTo(
            Ensure.that(Text.of(LoginPage.ERROR_MESSAGE)).isEqualTo("Invalid credentials")
        );
    }

    @Test
    @DisplayName("Should show validation error for empty email")
    @Tag("negative")
    void shouldShowErrorForEmptyEmail() {
        alice.attemptsTo(
            NavigateTo.theLoginPage(),
            Login.withCredentials("", "password123")
        );

        alice.attemptsTo(
            Ensure.that(LoginPage.ERROR_MESSAGE).isDisplayed()
        );
    }
}
```

### Cucumber Integration

```gherkin
# src/test/resources/features/auth/login.feature
@auth
Feature: User Authentication
  As a registered user
  I want to login to the application
  So that I can access my personalized dashboard

  Background:
    Given Alice is on the login page

  @smoke @positive
  Scenario: Successful login with valid credentials
    When she logs in with email "user@example.com" and password "SecurePass123"
    Then she should see the dashboard
    And she should see a welcome message containing "Welcome"

  @negative
  Scenario: Login fails with invalid credentials
    When she logs in with email "user@example.com" and password "wrongpassword"
    Then she should see an error message "Invalid credentials"
```

```java
// src/test/java/stepdefinitions/LoginStepDefs.java
package stepdefinitions;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import net.serenitybdd.screenplay.Actor;
import net.serenitybdd.screenplay.ensure.Ensure;
import net.serenitybdd.screenplay.questions.Text;
import screenplay.questions.DashboardInfo;
import screenplay.tasks.Login;
import screenplay.tasks.NavigateTo;
import screenplay.ui.LoginPage;

public class LoginStepDefs {

    Actor alice;

    @Given("{actor} is on the login page")
    public void onLoginPage(Actor actor) {
        this.alice = actor;
        actor.attemptsTo(NavigateTo.theLoginPage());
    }

    @When("she logs in with email {string} and password {string}")
    public void loginWith(String email, String password) {
        alice.attemptsTo(Login.withCredentials(email, password));
    }

    @Then("she should see the dashboard")
    public void shouldSeeDashboard() {
        alice.attemptsTo(
            Ensure.that(DashboardInfo.isDisplayed()).isTrue()
        );
    }

    @Then("she should see a welcome message containing {string}")
    public void shouldSeeWelcomeMessage(String text) {
        alice.attemptsTo(
            Ensure.that(DashboardInfo.welcomeMessage()).contains(text)
        );
    }

    @Then("she should see an error message {string}")
    public void shouldSeeError(String message) {
        alice.attemptsTo(
            Ensure.that(Text.of(LoginPage.ERROR_MESSAGE)).isEqualTo(message)
        );
    }
}
```

### Step Library Pattern (Classic Approach)

```java
// src/test/java/steps/AuthSteps.java
package steps;

import net.serenitybdd.core.pages.PageObject;
import net.thucydides.core.annotations.Step;
import org.openqa.selenium.By;
import static org.assertj.core.api.Assertions.assertThat;

public class AuthSteps extends PageObject {

    @Step("Navigate to the login page")
    public void navigateToLoginPage() {
        openUrl(getBaseUrl() + "/login");
        waitForElementVisible(By.cssSelector("[data-testid='email-input']"));
    }

    @Step("Enter email: {0}")
    public void enterEmail(String email) {
        find(By.cssSelector("[data-testid='email-input']")).clear();
        find(By.cssSelector("[data-testid='email-input']")).sendKeys(email);
    }

    @Step("Enter password")
    public void enterPassword(String password) {
        find(By.cssSelector("[data-testid='password-input']")).clear();
        find(By.cssSelector("[data-testid='password-input']")).sendKeys(password);
    }

    @Step("Click the login button")
    public void clickLoginButton() {
        find(By.cssSelector("[data-testid='login-submit']")).click();
    }

    @Step("Verify user is on the dashboard")
    public void verifyOnDashboard() {
        waitForCondition()
            .until(driver -> driver.getCurrentUrl().contains("/dashboard"));
        assertThat(getDriver().getCurrentUrl()).contains("/dashboard");
    }

    @Step("Verify welcome message contains: {0}")
    public void verifyWelcomeMessage(String text) {
        String message = find(By.cssSelector("[data-testid='welcome-message']")).getText();
        assertThat(message).contains(text);
    }

    @Step("Verify error message: {0}")
    public void verifyErrorMessage(String expected) {
        String actual = find(By.cssSelector("[data-testid='error-message']")).getText();
        assertThat(actual).isEqualTo(expected);
    }
}
```

### REST API Testing with Serenity

```java
// src/test/java/features/api/UsersApiTest.java
package features.api;

import io.restassured.http.ContentType;
import net.serenitybdd.junit5.SerenityJUnit5Extension;
import net.serenitybdd.rest.SerenityRest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;

import static net.serenitybdd.rest.SerenityRest.*;
import static org.hamcrest.Matchers.*;

@ExtendWith(SerenityJUnit5Extension.class)
@DisplayName("Users API")
class UsersApiTest {

    private static final String BASE_URL = "http://localhost:3000/api";

    @Test
    @DisplayName("Should return list of users")
    @Tag("api")
    @Tag("smoke")
    void shouldReturnUsers() {
        given()
            .baseUri(BASE_URL)
            .contentType(ContentType.JSON)
        .when()
            .get("/users")
        .then()
            .statusCode(200)
            .body("size()", greaterThan(0))
            .body("[0].name", notNullValue())
            .body("[0].email", notNullValue());
    }

    @Test
    @DisplayName("Should create a new user")
    @Tag("api")
    void shouldCreateUser() {
        String userJson = """
            {
                "name": "Alice Johnson",
                "email": "alice@example.com",
                "role": "user"
            }
            """;

        given()
            .baseUri(BASE_URL)
            .contentType(ContentType.JSON)
            .body(userJson)
        .when()
            .post("/users")
        .then()
            .statusCode(201)
            .body("name", equalTo("Alice Johnson"))
            .body("email", equalTo("alice@example.com"))
            .body("id", notNullValue());
    }
}
```

### Serenity Configuration

```hocon
# src/test/resources/serenity.conf
serenity {
  project.name = "My Project Acceptance Tests"
  test.root = "features"
  take.screenshots = FOR_EACH_ACTION
  browser.maximized = true

  webdriver {
    driver = chrome
    autodownload = true
  }
}

headless.mode = true

environments {
  default {
    webdriver.base.url = "http://localhost:3000"
  }
  staging {
    webdriver.base.url = "https://staging.example.com"
  }
  production {
    webdriver.base.url = "https://www.example.com"
  }
}

chrome {
  switches = "--headless;--no-sandbox;--disable-dev-shm-usage;--window-size=1920,1080"
}
```

### Maven Configuration

```xml
<!-- pom.xml (key dependencies) -->
<properties>
    <serenity.version>4.1.0</serenity.version>
    <maven.compiler.source>17</maven.compiler.source>
    <maven.compiler.target>17</maven.compiler.target>
</properties>

<dependencies>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-core</artifactId>
        <version>${serenity.version}</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-junit5</artifactId>
        <version>${serenity.version}</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-screenplay-webdriver</artifactId>
        <version>${serenity.version}</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-cucumber</artifactId>
        <version>${serenity.version}</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-rest-assured</artifactId>
        <version>${serenity.version}</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-ensure</artifactId>
        <version>${serenity.version}</version>
        <scope>test</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>net.serenity-bdd.maven.plugins</groupId>
            <artifactId>serenity-maven-plugin</artifactId>
            <version>${serenity.version}</version>
            <executions>
                <execution>
                    <id>serenity-reports</id>
                    <phase>post-integration-test</phase>
                    <goals>
                        <goal>aggregate</goal>
                    </goals>
                </execution>
            </executions>
        </plugin>
    </plugins>
</build>
```

### CI/CD Integration (GitHub Actions)

```yaml
name: Serenity BDD Tests
on: [push, pull_request]

jobs:
  serenity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Run tests and generate reports
        run: mvn clean verify
        env:
          BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: serenity-reports
          path: target/site/serenity/
```

## Best Practices

1. **Use the Screenplay pattern** for new projects. It produces more readable reports and scales better than Page Objects with step libraries.
2. **Name Targets descriptively** — `Target.the("login button")` produces report entries like "Alice clicks on the login button".
3. **Create Task factory methods** — `Login.asAdmin()`, `Login.withCredentials(email, pass)` improve readability and reusability.
4. **Use Questions for verification** — Separate what you ask (Questions) from what you do (Tasks). This makes tests more composable.
5. **Configure screenshots strategically** — Use `FOR_EACH_ACTION` in CI and `FOR_FAILURES` locally to balance report quality and speed.
6. **Use `@Step` annotations** in step libraries to control how actions appear in Serenity reports.
7. **Run `mvn verify`** (not `mvn test`) to generate Serenity HTML reports. The verify phase triggers report aggregation.
8. **Use environment profiles** in serenity.conf for different environments (local, staging, production).
9. **Combine UI and API tests** — Use Serenity REST Assured for API setup/verification alongside UI tests for true end-to-end coverage.
10. **Archive reports in CI** — Upload Serenity HTML reports as build artifacts for easy access to living documentation.

## Anti-Patterns to Avoid

1. **Avoid bypassing the Screenplay pattern** with direct WebDriver calls in tests. Use Tasks, Questions, and Interactions.
2. **Avoid unnamed Targets** — `Target.the("").locatedBy("...")` produces unreadable reports. Always provide descriptive Target names.
3. **Avoid fat Tasks** — A single Task should represent one user intention. Split complex workflows into composable smaller Tasks.
4. **Avoid mixing Step Libraries and Screenplay** in the same project. Pick one approach and use it consistently.
5. **Avoid skipping `@Step` annotations** — Without `@Step`, actions do not appear in Serenity reports, losing the living documentation benefit.
6. **Avoid hardcoded URLs** — Use serenity.conf environments and `webdriver.base.url` instead of hardcoded strings.
7. **Avoid ignoring report generation** — The Serenity report is a key deliverable. Always run `mvn verify` and archive reports.
8. **Avoid shared browser state** — Each test should start with a clean browser. Use `@BeforeEach` or Serenity's automatic browser management.
9. **Avoid testing implementation** — Test behaviors, not implementation details. Serenity reports should read like business scenarios.
10. **Avoid ignoring test parallelism** — Configure Maven Failsafe for parallel execution. Design tests without shared mutable state.
