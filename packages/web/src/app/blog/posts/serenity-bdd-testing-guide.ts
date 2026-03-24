import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Serenity BDD: Living Documentation Testing Guide',
  description:
    'Master Serenity BDD with the Screenplay pattern, actors, tasks, questions, living documentation reports, and Cucumber integration for expressive test automation.',
  date: '2026-03-24',
  category: 'Tutorial',
  content: `
## Introduction to Serenity BDD

Serenity BDD (formerly known as Thucydides) is a comprehensive test automation library that goes beyond simple test execution. It produces rich, narrative-style reports that serve as living documentation of your application's behavior. Serenity BDD encourages the use of the Screenplay pattern, a modern alternative to the Page Object pattern that models tests in terms of actors performing tasks and asking questions about the system.

The framework is available for both Java (Serenity BDD) and JavaScript/TypeScript (Serenity/JS). It integrates with Cucumber, JUnit 5, and Playwright or WebdriverIO for browser automation. The combination of the Screenplay pattern with Serenity's reporting capabilities creates a testing framework that is both highly maintainable and produces documentation that business stakeholders can understand.

In this guide, we will cover the Screenplay pattern in depth, walk through building a complete test suite with actors, tasks, and questions, explore Cucumber integration, and show how to generate and customize Serenity's living documentation reports.

---

## The Screenplay Pattern Explained

The Screenplay pattern models test automation around these core concepts:

- **Actors** represent users or systems interacting with the application
- **Abilities** define what an actor can do (browse the web, call an API)
- **Tasks** represent high-level business activities an actor performs
- **Interactions** are low-level actions (click, type, navigate)
- **Questions** retrieve information from the system for assertions

This approach creates a clear, layered architecture:

\`\`\`
Specification Layer  -->  Actors perform Tasks
Task Layer          -->  Tasks composed of Interactions
Interaction Layer   -->  Direct system interactions
Question Layer      -->  Retrieve observable state
\`\`\`

### Why Screenplay Over Page Objects

The Page Object pattern has served the testing community well, but it has limitations:

1. Page Objects tend to grow into large, unwieldy classes
2. Cross-page workflows require awkward method chaining
3. The pattern does not clearly separate "doing" from "observing"
4. Reuse across different contexts is difficult

The Screenplay pattern addresses these issues by decomposing tests into small, composable units that can be freely mixed and matched.

---

## Setting Up Serenity BDD

### Java Setup with Maven

\`\`\`xml
<dependencies>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-core</artifactId>
        <version>4.1.0</version>
    </dependency>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-screenplay</artifactId>
        <version>4.1.0</version>
    </dependency>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-screenplay-webdriver</artifactId>
        <version>4.1.0</version>
    </dependency>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-cucumber</artifactId>
        <version>4.1.0</version>
    </dependency>
    <dependency>
        <groupId>net.serenity-bdd</groupId>
        <artifactId>serenity-junit5</artifactId>
        <version>4.1.0</version>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>net.serenity-bdd.maven.plugins</groupId>
            <artifactId>serenity-maven-plugin</artifactId>
            <version>4.1.0</version>
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
\`\`\`

### Serenity/JS Setup with TypeScript

\`\`\`bash
npm init -y
npm install --save-dev @serenity-js/core \\
  @serenity-js/web @serenity-js/playwright \\
  @serenity-js/cucumber @serenity-js/assertions \\
  @serenity-js/serenity-bdd @cucumber/cucumber \\
  typescript @types/node
\`\`\`

Configure \`serenity.conf.ts\`:

\`\`\`typescript
import { configure } from '@serenity-js/core';
import {
  SerenityBDDReporter,
} from '@serenity-js/serenity-bdd';

configure({
  crew: [
    new SerenityBDDReporter(),
  ],
});
\`\`\`

---

## Actors and Abilities

### Defining Actors

Actors are the central figures in Screenplay tests. Each actor has a name and a set of abilities:

\`\`\`java
// Java
import net.serenity.screenplay.Actor;
import net.serenity.screenplay.abilities.BrowseTheWeb;
import net.serenity.screenplay.abilities.CallAnApi;

Actor alice = Actor.named("Alice")
    .whoCan(BrowseTheWeb.with(driver))
    .whoCan(CallAnApi.at("https://api.example.com"));

Actor bob = Actor.named("Bob")
    .whoCan(CallAnApi.at("https://api.example.com"));
\`\`\`

\`\`\`typescript
// TypeScript (Serenity/JS)
import { actorCalled, Cast } from '@serenity-js/core';
import { BrowseTheWebWithPlaywright } from '@serenity-js/playwright';
import { CallAnApi } from '@serenity-js/rest';

const alice = actorCalled('Alice')
  .whoCan(
    BrowseTheWebWithPlaywright.using(browser),
    CallAnApi.at('https://api.example.com'),
  );
\`\`\`

### Custom Abilities

Create custom abilities for domain-specific interactions:

\`\`\`java
public class ManageDatabase implements Ability {
    private final DataSource dataSource;

    public ManageDatabase(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public static ManageDatabase using(DataSource ds) {
        return new ManageDatabase(ds);
    }

    public static ManageDatabase as(Actor actor) {
        return actor.abilityTo(ManageDatabase.class);
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }
}

// Usage
Actor dbAdmin = Actor.named("DB Admin")
    .whoCan(ManageDatabase.using(testDataSource));
\`\`\`

---

## Tasks: High-Level Business Actions

Tasks represent meaningful business activities. They are composed of smaller interactions and other tasks.

### Defining Tasks

\`\`\`java
// Java
import net.serenity.screenplay.Task;
import net.serenity.screenplay.Actor;
import static net.serenity.screenplay.Tasks.instrumented;

public class Login implements Task {

    private final String email;
    private final String password;

    public Login(String email, String password) {
        this.email = email;
        this.password = password;
    }

    public static Login withCredentials(
            String email, String password) {
        return instrumented(
            Login.class, email, password);
    }

    @Override
    @Step("{0} logs in with #email")
    public <T extends Actor> void performAs(T actor) {
        actor.attemptsTo(
            Navigate.to("/login"),
            Enter.theValue(email)
                .into(LoginPage.EMAIL_FIELD),
            Enter.theValue(password)
                .into(LoginPage.PASSWORD_FIELD),
            Click.on(LoginPage.LOGIN_BUTTON),
            WaitUntil.the(DashboardPage.WELCOME_MESSAGE,
                isVisible())
        );
    }
}

// Usage in test
alice.attemptsTo(
    Login.withCredentials(
        "alice@example.com", "SecurePass123!")
);
\`\`\`

\`\`\`typescript
// TypeScript (Serenity/JS)
import { Task } from '@serenity-js/core';
import { Navigate, Enter, Click } from '@serenity-js/web';

const Login = {
  withCredentials: (email: string, password: string) =>
    Task.where(\\\`#actor logs in as \\\${email}\\\`,
      Navigate.to('/login'),
      Enter.theValue(email).into(LoginPage.emailField),
      Enter.theValue(password).into(LoginPage.passwordField),
      Click.on(LoginPage.loginButton),
    ),
};

// Usage
await actorCalled('Alice').attemptsTo(
  Login.withCredentials('alice@example.com', 'SecurePass123!'),
);
\`\`\`

### Composing Tasks

Tasks can be composed from other tasks, creating readable high-level workflows:

\`\`\`java
public class PlaceOrder implements Task {

    private final String productName;

    public PlaceOrder(String productName) {
        this.productName = productName;
    }

    public static PlaceOrder forProduct(String name) {
        return instrumented(PlaceOrder.class, name);
    }

    @Override
    @Step("{0} places an order for #productName")
    public <T extends Actor> void performAs(T actor) {
        actor.attemptsTo(
            SearchForProduct.named(productName),
            AddToCart.theFirstResult(),
            ProceedToCheckout.withStandardShipping(),
            ConfirmOrder.now()
        );
    }
}

// In the test
alice.attemptsTo(
    Login.withCredentials("alice@example.com", "Pass123!"),
    PlaceOrder.forProduct("Mechanical Keyboard"),
    VerifyOrderConfirmation.isDisplayed()
);
\`\`\`

This reads almost like natural language: Alice logs in, places an order for a mechanical keyboard, and verifies the order confirmation is displayed.

---

## Questions: Observing System State

Questions retrieve information from the system under test. They are the observation counterpart to the action-oriented Tasks.

### Defining Questions

\`\`\`java
// Java
import net.serenity.screenplay.Question;

public class CartTotal implements Question<String> {

    @Override
    public String answeredBy(Actor actor) {
        return Text.of(CartPage.TOTAL_AMOUNT)
            .answeredBy(actor);
    }

    public static CartTotal displayed() {
        return new CartTotal();
    }
}

public class NumberOfCartItems implements Question<Integer> {

    @Override
    public Integer answeredBy(Actor actor) {
        return Text.of(CartPage.ITEM_COUNT)
            .answeredBy(actor)
            .map(Integer::parseInt);
    }

    public static NumberOfCartItems inTheCart() {
        return new NumberOfCartItems();
    }
}
\`\`\`

### Using Questions in Assertions

\`\`\`java
// Java with Serenity assertions
alice.attemptsTo(
    AddToCart.theProduct("Wireless Mouse")
);

alice.should(
    seeThat(CartTotal.displayed(), equalTo("\$29.99")),
    seeThat(NumberOfCartItems.inTheCart(), equalTo(1))
);
\`\`\`

\`\`\`typescript
// TypeScript (Serenity/JS)
import { Ensure, equals } from '@serenity-js/assertions';
import { Text } from '@serenity-js/web';

await alice.attemptsTo(
  Ensure.that(
    Text.of(CartPage.totalAmount),
    equals('\$29.99'),
  ),
  Ensure.that(
    Text.of(CartPage.itemCount),
    equals('1'),
  ),
);
\`\`\`

### Composing Questions

Questions can build on other questions:

\`\`\`java
public class OrderSummary {

    public static Question<Boolean> isComplete() {
        return actor -> {
            String status = OrderStatus.displayed()
                .answeredBy(actor);
            String total = OrderTotal.displayed()
                .answeredBy(actor);
            return "Confirmed".equals(status)
                && total != null
                && !total.isEmpty();
        };
    }

    public static Question<Map<String, String>> details() {
        return actor -> {
            Map<String, String> summary = new HashMap<>();
            summary.put("status",
                OrderStatus.displayed().answeredBy(actor));
            summary.put("total",
                OrderTotal.displayed().answeredBy(actor));
            summary.put("items",
                OrderItemCount.displayed().answeredBy(actor));
            return summary;
        };
    }
}
\`\`\`

---

## Living Documentation Reports

Serenity BDD's standout feature is its comprehensive living documentation. Reports are generated automatically from test execution data.

### Generating Reports

After running tests, generate the full Serenity report:

\`\`\`bash
# Java (Maven)
mvn verify
mvn serenity:aggregate

# Serenity/JS
npx serenity-bdd run
\`\`\`

### Report Contents

Serenity reports include:

**Test Results Overview**: A dashboard showing pass/fail rates, test counts by feature, and trend charts over time.

**Feature Documentation**: Each feature is presented as a narrative with scenarios expanded to show individual steps, their status, and execution time.

**Step-by-Step Screenshots**: When configured, Serenity captures screenshots at each step, creating a visual record of the test execution path.

**Requirements Coverage**: Maps tests to requirements (features, capabilities, themes) showing which business requirements have test coverage.

**Tag-Based Filtering**: Reports can be filtered by tags, allowing stakeholders to focus on areas they care about.

### Configuring Screenshots

\`\`\`properties
# serenity.properties
serenity.take.screenshots=AFTER_EACH_STEP
serenity.reports.show.step.details=true
serenity.report.accessibility=true

# Screenshot strategy options:
# FOR_EACH_ACTION - every UI interaction
# AFTER_EACH_STEP - after completing each step
# FOR_FAILURES - only on failures
# DISABLED - no screenshots
\`\`\`

### Custom Report Sections

Add custom information to reports using annotations:

\`\`\`java
@Narrative(text = {
    "As a premium customer",
    "I want to receive priority shipping",
    "So that my orders arrive faster"
})
@WithTags({
    @WithTag("epic:shipping"),
    @WithTag("component:checkout")
})
public class PriorityShippingTest {

    @Test
    @Title("Premium customer gets free priority shipping")
    @Description("Verifies that customers with premium membership "
        + "automatically receive free priority shipping")
    @Manual(reason = "Requires premium account setup")
    public void premiumCustomerGetsFreeShipping() {
        // test implementation
    }
}
\`\`\`

### Report Themes and Customization

Customize the report appearance for your organization:

\`\`\`properties
# serenity.properties
serenity.project.name=MyApp Test Suite
serenity.report.show.manual.tests=true
serenity.report.show.releases=true
serenity.report.show.progress=true
serenity.report.show.history=true
serenity.report.show.tag.menus=true
\`\`\`

---

## Cucumber Integration

Serenity BDD integrates seamlessly with Cucumber, combining Gherkin specifications with the Screenplay pattern and rich reporting.

### Feature Files with Serenity

\`\`\`gherkin
@shopping
Feature: Shopping Cart Management

  As a customer browsing the store
  I want to manage items in my cart
  So that I can purchase the products I need

  Background:
    Given Alice is a registered customer

  @smoke @happy-path
  Scenario: Add a single item to the cart
    Given Alice is browsing the product catalog
    When she adds "Wireless Mouse" to her cart
    Then her cart should contain 1 item
    And the cart total should be "\$29.99"

  @regression
  Scenario Outline: Add multiple items to the cart
    Given Alice has "<existing>" items in her cart
    When she adds "<product>" to her cart
    Then her cart should contain "<total>" items

    Examples:
      | existing | product          | total |
      | 0        | Wireless Mouse   | 1     |
      | 1        | USB-C Hub        | 2     |
      | 2        | Monitor Stand    | 3     |
\`\`\`

### Step Definitions with Screenplay

\`\`\`java
public class ShoppingStepDefinitions {

    @Given("{actor} is a registered customer")
    public void actorIsRegistered(Actor actor) {
        actor.whoCan(BrowseTheWeb.with(driver));
        actor.attemptsTo(
            Login.withCredentials(
                actor.getName().toLowerCase()
                    + "@example.com",
                "TestPass123!")
        );
    }

    @Given("{actor} is browsing the product catalog")
    public void actorBrowsesCatalog(Actor actor) {
        actor.attemptsTo(
            Navigate.to("/products")
        );
    }

    @When("{actor} adds {string} to her/his cart")
    public void actorAddsToCart(
            Actor actor, String product) {
        actor.attemptsTo(
            SearchForProduct.named(product),
            AddToCart.theFirstResult()
        );
    }

    @Then("{actor}'s cart should contain {int} item(s)")
    public void cartShouldContainItems(
            Actor actor, int count) {
        actor.should(
            seeThat(NumberOfCartItems.inTheCart(),
                equalTo(count))
        );
    }

    @Then("the cart total should be {string}")
    public void cartTotalShouldBe(String total) {
        alice.should(
            seeThat(CartTotal.displayed(), equalTo(total))
        );
    }
}
\`\`\`

Notice how Cucumber's \`{actor}\` parameter type integrates with Serenity's actor system, allowing step definitions to work with any actor name used in the Gherkin.

### Running Cucumber with Serenity

\`\`\`java
@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("/features")
@ConfigurationParameter(
    key = PLUGIN_PROPERTY_NAME,
    value = "io.cucumber.core.plugin.SerenityReporterParallel")
@ConfigurationParameter(
    key = GLUE_PROPERTY_NAME,
    value = "com.example.stepdefinitions")
public class CucumberTestSuite {
}
\`\`\`

---

## Page Elements and Targets

Define page elements as Targets for use in Interactions and Questions:

\`\`\`java
public class LoginPage {
    public static final Target EMAIL_FIELD =
        Target.the("email field")
            .locatedBy("#email");

    public static final Target PASSWORD_FIELD =
        Target.the("password field")
            .locatedBy("#password");

    public static final Target LOGIN_BUTTON =
        Target.the("login button")
            .locatedBy("[data-testid='login-submit']");

    public static final Target ERROR_MESSAGE =
        Target.the("error message")
            .locatedBy(".error-notification");

    // Dynamic targets with parameters
    public static Target menuItem(String name) {
        return Target.the("menu item: " + name)
            .locatedBy("//nav//a[contains(text(), '{0}')]")
            .of(name);
    }
}
\`\`\`

The descriptive names in \`Target.the()\` appear in the living documentation, making reports readable even for non-technical stakeholders.

---

## REST API Testing with Screenplay

Serenity's Screenplay pattern works for API testing too:

\`\`\`java
public class CreateUser implements Task {
    private final Map<String, String> userData;

    public CreateUser(Map<String, String> userData) {
        this.userData = userData;
    }

    public static CreateUser withDetails(
            Map<String, String> data) {
        return instrumented(CreateUser.class, data);
    }

    @Override
    @Step("{0} creates a new user account")
    public <T extends Actor> void performAs(T actor) {
        actor.attemptsTo(
            Post.to("/api/users")
                .with(request -> request
                    .header("Content-Type", "application/json")
                    .body(userData))
        );
    }
}

// In the test
bob.attemptsTo(
    CreateUser.withDetails(Map.of(
        "name", "Charlie",
        "email", "charlie@example.com",
        "role", "editor"
    ))
);

bob.should(
    seeThat(TheResponse.statusCode(), equalTo(201)),
    seeThat(TheResponse.body("name", String.class),
        equalTo("Charlie"))
);
\`\`\`

---

## CI/CD Integration

### GitHub Actions

\`\`\`yaml
name: Serenity BDD Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Run tests
        run: mvn clean verify

      - name: Generate Serenity report
        if: always()
        run: mvn serenity:aggregate

      - name: Publish report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: serenity-report
          path: target/site/serenity/

      - name: Deploy report to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \\\${{ secrets.GITHUB_TOKEN }}
          publish_dir: target/site/serenity
\`\`\`

---

## Best Practices

### Name Tasks and Questions Clearly

Use business-domain language in your task and question names. The names appear directly in reports, so they should make sense to stakeholders:

\`\`\`java
// Good - business language
alice.attemptsTo(
    PlaceOrder.forProduct("Laptop Stand"),
    ApplyDiscountCode.of("SAVE20")
);
alice.should(
    seeThat(OrderTotal.afterDiscount(), equalTo("\$39.99"))
);

// Avoid - technical implementation details
alice.attemptsTo(
    ClickElement.withId("add-to-cart"),
    TypeIntoField.withSelector("#discount-code", "SAVE20"),
    ClickElement.withId("apply-discount")
);
\`\`\`

### Keep Tasks Small and Focused

Each task should represent a single coherent business action. If a task is doing too many things, break it into smaller tasks that can be composed.

### Use Actors to Model Different Perspectives

When testing involves multiple user roles, create separate actors:

\`\`\`java
Actor customer = Actor.named("Customer")
    .whoCan(BrowseTheWeb.with(customerDriver));
Actor admin = Actor.named("Admin")
    .whoCan(BrowseTheWeb.with(adminDriver));
Actor api = Actor.named("API Client")
    .whoCan(CallAnApi.at(baseUrl));

// Multi-actor scenario
customer.attemptsTo(PlaceOrder.forProduct("Widget"));
admin.attemptsTo(ApproveOrder.forCustomer("Customer"));
customer.should(
    seeThat(OrderStatus.displayed(), equalTo("Approved"))
);
\`\`\`

### Invest in Living Documentation

Configure report themes, add narratives to features, and use meaningful tags. The living documentation is one of Serenity BDD's greatest strengths, providing real value when it is maintained as a first-class artifact.

---

## Conclusion

Serenity BDD with the Screenplay pattern offers a powerful, well-structured approach to test automation. By modeling tests around actors performing tasks and asking questions, you create test code that reads like specifications and produces reports that serve as living documentation.

The framework's ability to generate comprehensive, narrative-style reports from test execution data bridges the communication gap between technical and business teams. Whether integrated with Cucumber for BDD or used with JUnit for developer-focused testing, Serenity BDD brings clarity and maintainability to test automation at any scale.
`,
};
