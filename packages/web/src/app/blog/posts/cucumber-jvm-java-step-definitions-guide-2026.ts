import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "Cucumber-JVM Java Step Definitions Guide (2026)",
  description: "Cucumber-JVM step definitions in Java for 2026 — runner setup, glue code, Given/When/Then, hooks, DataTable and parameter types with runnable Maven examples.",
  date: "2026-06-15",
  category: "Java",
  content: `# Cucumber-JVM Java Step Definitions Guide (2026)

**Step definitions are Java methods annotated with \`@Given\`, \`@When\`, or \`@Then\` that bind a Gherkin step to executable code.** In Cucumber-JVM you write feature files in plain Gherkin, point a JUnit runner at them, and Cucumber matches each step line to a step-definition method via a regex or Cucumber Expression. The matched method (your "glue") runs the actual test logic — clicking a UI, calling an API, asserting a result. This guide walks through the full setup with Cucumber-JVM 7.x on JUnit 5, then covers hooks, parameter types, and \`DataTable\`.

---

## What you need

- Java 17+ (Java 21 LTS recommended in 2026)
- Maven or Gradle
- \`cucumber-java\`, \`cucumber-junit-platform-engine\`, and the JUnit Platform Suite API

### Maven setup

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
</dependencies>
\`\`\`

(Use the latest 7.x available to you; verify versions on Maven Central rather than copying blindly.)

---

## Project layout

Cucumber convention puts feature files under \`src/test/resources\` and glue code under \`src/test/java\`, mirroring the package path.

\`\`\`
src/test/
├── java/
│   └── com/example/
│       ├── RunCucumberTest.java     # the runner
│       └── steps/
│           ├── ShoppingSteps.java   # step definitions (glue)
│           └── Hooks.java           # @Before / @After
└── resources/
    └── com/example/
        └── shopping.feature
\`\`\`

---

## The feature file (Gherkin)

\`\`\`gherkin
Feature: Shopping cart

  Scenario: Add a single item to the cart
    Given the cart is empty
    When I add a "Keyboard" priced at 49.99 to the cart
    Then the cart should contain 1 item
    And the cart total should be 49.99

  Scenario Outline: Adding multiple items
    Given the cart is empty
    When I add "<count>" units of "<product>"
    Then the cart should contain <count> items

    Examples:
      | product | count |
      | Mouse   | 3     |
      | Cable   | 5     |
\`\`\`

---

## The runner

With Cucumber-JVM 7 on the JUnit Platform, the modern runner is an empty class annotated with \`@Suite\` + \`@SelectClasspathResource\`. The old \`@RunWith(Cucumber.class)\` style is JUnit 4 and is no longer the recommended approach.

\`\`\`java
package com.example;

import org.junit.platform.suite.api.ConfigurationParameter;
import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectClasspathResource;
import org.junit.platform.suite.api.Suite;

import static io.cucumber.junit.platform.engine.Constants.GLUE_PROPERTY_NAME;
import static io.cucumber.junit.platform.engine.Constants.PLUGIN_PROPERTY_NAME;

@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("com/example")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "com.example.steps")
@ConfigurationParameter(key = PLUGIN_PROPERTY_NAME,
    value = "pretty, html:target/cucumber-report.html, json:target/cucumber.json")
public class RunCucumberTest {
}
\`\`\`

The \`glue\` parameter tells Cucumber **which package(s) to scan for step definitions**. If your steps live in a package the runner does not scan, you get \`UndefinedStepException\` even though the methods exist.

---

## Writing step definitions (the glue)

Each Gherkin step maps to one annotated method. The text after the annotation is a **Cucumber Expression** by default — \`{string}\`, \`{int}\`, \`{double}\`, \`{word}\` capture typed parameters. (You can still use full regex by wrapping the pattern in \`^...$\`.)

\`\`\`java
package com.example.steps;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class ShoppingSteps {

    private final Cart cart = new Cart();

    @Given("the cart is empty")
    public void the_cart_is_empty() {
        cart.clear();
    }

    @When("I add a {string} priced at {double} to the cart")
    public void i_add_item(String name, double price) {
        cart.add(new Item(name, price), 1);
    }

    @When("I add {string} units of {string}")
    public void i_add_units(String count, String product) {
        cart.add(new Item(product, 0.0), Integer.parseInt(count));
    }

    @Then("the cart should contain {int} item(s)")
    public void the_cart_should_contain(int expected) {
        assertEquals(expected, cart.itemCount());
    }

    @Then("the cart total should be {double}")
    public void the_cart_total_should_be(double expected) {
        assertEquals(expected, cart.total(), 0.001);
    }
}
\`\`\`

Two things to note:

- \`{int} item(s)\` — the \`(s)\` makes the trailing "s" optional, so one step definition matches both "1 item" and "3 items".
- The \`Cart\` instance is a field. Because Cucumber creates a **new step-definition instance per scenario**, state in fields is automatically reset between scenarios. To share state across multiple step classes, use dependency injection (PicoContainer is the lightweight default — add \`cucumber-picocontainer\` and constructor-inject a shared world object).

---

## Hooks: \`@Before\`, \`@After\`, and tagged hooks

Hooks run setup/teardown around each scenario. They come from \`io.cucumber.java\` (not the JUnit annotations of the same name).

\`\`\`java
package com.example.steps;

import io.cucumber.java.Before;
import io.cucumber.java.After;
import io.cucumber.java.Scenario;

public class Hooks {

    @Before
    public void setUp(Scenario scenario) {
        System.out.println("Starting: " + scenario.getName());
    }

    @Before("@ui")           // only runs for scenarios tagged @ui
    public void launchBrowser() {
        // start WebDriver
    }

    @After(order = 100)      // higher order runs FIRST on teardown
    public void tearDown(Scenario scenario) {
        if (scenario.isFailed()) {
            // attach a screenshot to the report
            // scenario.attach(bytes, "image/png", "failure");
        }
    }
}
\`\`\`

Key behaviors that trip people up:

- \`@Before\`/\`@After\` run for **every scenario**, not once per feature. For once-per-suite work use \`@BeforeAll\`/\`@AfterAll\` (static methods).
- Tagged hooks (\`@Before("@ui")\`) let you scope setup to a subset of scenarios.
- \`@After\` ordering is **reverse** of \`@Before\`: a higher \`order\` value runs earlier during teardown, so cleanup unwinds correctly.

---

## DataTable: passing tabular data

When a step is followed by a Gherkin table, Cucumber passes it as a \`DataTable\`, or auto-converts it into a \`List<Map>\`, \`List<YourType>\`, or \`Map\`.

\`\`\`gherkin
  Scenario: Bulk add products
    Given the following products exist:
      | name     | price | stock |
      | Keyboard | 49.99 | 12    |
      | Mouse    | 19.99 | 30    |
    Then 2 products are available
\`\`\`

The cleanest binding converts each row into a typed object using a \`@DataTableType\`:

\`\`\`java
import io.cucumber.java.DataTableType;
import io.cucumber.java.en.Given;
import java.util.List;
import java.util.Map;

public class CatalogSteps {

    @DataTableType
    public Product productEntry(Map<String, String> row) {
        return new Product(
            row.get("name"),
            Double.parseDouble(row.get("price")),
            Integer.parseInt(row.get("stock")));
    }

    @Given("the following products exist:")
    public void seedProducts(List<Product> products) {
        products.forEach(catalog::add);
    }
}
\`\`\`

Alternatively, accept the raw table and transform it yourself:

\`\`\`java
@Given("the following products exist:")
public void seed(io.cucumber.datatable.DataTable table) {
    List<Map<String, String>> rows = table.asMaps(); // header-keyed rows
    rows.forEach(r -> catalog.add(/* build from r */));
}
\`\`\`

Use \`table.asMaps()\` when the first row is a header, \`table.asLists()\` for a header-less grid, and a custom \`@DataTableType\` when you want strongly typed domain objects.

---

## Custom parameter types

Beyond the built-in \`{string}\`/\`{int}\`, define your own with \`@ParameterType\` so steps read naturally:

\`\`\`java
import io.cucumber.java.ParameterType;
import java.time.LocalDate;

public class ParamTypes {

    @ParameterType("\\\\d{4}-\\\\d{2}-\\\\d{2}")
    public LocalDate isoDate(String value) {
        return LocalDate.parse(value);
    }
}
\`\`\`

\`\`\`gherkin
    When the order is placed on 2026-06-15
\`\`\`

\`\`\`java
@When("the order is placed on {isoDate}")
public void placedOn(LocalDate date) { order.setDate(date); }
\`\`\`

---

## Sharing state across step classes with PicoContainer

A real suite splits step definitions across many classes (UI steps, API steps, DB steps), and they all need to see the same scenario state. The idiomatic Cucumber-JVM answer is constructor dependency injection via PicoContainer. Add the module:

\`\`\`xml
<dependency>
  <groupId>io.cucumber</groupId>
  <artifactId>cucumber-picocontainer</artifactId>
  <version>7.18.0</version>
  <scope>test</scope>
</dependency>
\`\`\`

Create a plain "world" object to hold shared state, then constructor-inject it into every step class. PicoContainer creates one instance per scenario and hands the *same* instance to each class, so they share state without static fields:

\`\`\`java
public class TestContext {           // the shared "world"
    public Cart cart = new Cart();
    public Response lastResponse;
    public String authToken;
}

public class CartSteps {
    private final TestContext ctx;
    public CartSteps(TestContext ctx) { this.ctx = ctx; }   // injected

    @Given("the cart is empty")
    public void emptyCart() { ctx.cart.clear(); }
}

public class CheckoutSteps {
    private final TestContext ctx;
    public CheckoutSteps(TestContext ctx) { this.ctx = ctx; } // same instance

    @When("I checkout")
    public void checkout() { ctx.lastResponse = ctx.cart.checkout(); }
}
\`\`\`

Because the container is rebuilt per scenario, \`ctx\` is fresh each time — isolation is preserved while still letting unrelated step classes collaborate.

---

## Background, tags, and report output

A \`Background\` block factors out steps repeated at the start of every scenario in a feature, keeping the scenarios focused:

\`\`\`gherkin
Feature: Account

  Background:
    Given a registered user "ada@example.com"
    And the user is logged in

  Scenario: View profile
    When the user opens their profile
    Then the email "ada@example.com" is shown
\`\`\`

The \`Background\` steps run before each scenario in the file — they are not a once-per-feature setup, so keep them cheap.

Tags drive selective execution and tagged hooks. Place \`@tag\` lines above a \`Feature\`, \`Scenario\`, or \`Examples\` block:

\`\`\`gherkin
@smoke @checkout
Scenario: Successful payment
  ...
\`\`\`

Then filter at run time with a tag expression — \`and\`, \`or\`, \`not\` are all supported:

\`\`\`bash
mvn test -Dcucumber.filter.tags="@smoke and not @wip"
\`\`\`

For reporting, the \`PLUGIN_PROPERTY_NAME\` in your runner controls output formats. The common trio is \`pretty\` (console), \`html:\` (a self-contained report), and \`json:\` (machine-readable, consumable by the Cucumber Reports plugin or CI dashboards). Many teams publish the JSON to a dedicated reporting service or generate a rich HTML aggregate in CI from it.

---

## Running it

\`\`\`bash
# Maven
mvn test

# Run only scenarios with a tag
mvn test -Dcucumber.filter.tags="@smoke and not @wip"

# Gradle
./gradlew test
\`\`\`

For BDD strategy beyond the mechanics — how to keep step definitions reusable and avoid the "step explosion" anti-pattern — see the curated practices in our [QA skills directory](/skills) and how Cucumber stacks up against other approaches on the [comparison hub](/compare). More walkthroughs live on the [blog](/blog).

---

## CI usage (GitHub Actions)

\`\`\`yaml
name: bdd-tests
on: [push, pull_request]
jobs:
  cucumber:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven
      - run: mvn -B test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: cucumber-report
          path: target/cucumber-report.html
\`\`\`

---

## Common errors and troubleshooting

- **\`UndefinedStepException\` / steps show as undefined** — the \`glue\` package in your runner does not contain the step class, or the package path is wrong. Cucumber even prints the suggested snippet; copy its method signature.
- **\`DuplicateStepDefinitionException\`** — two methods match the same step text. Make the expressions distinct or delete the duplicate.
- **\`AmbiguousStepDefinitionsException\`** — a step line matches more than one pattern. Tighten one Cucumber Expression/regex.
- **Hooks not firing** — you imported \`org.junit.jupiter.api.BeforeEach\` instead of \`io.cucumber.java.Before\`. The annotations must come from the Cucumber package.
- **State leaking between scenarios** — you made step state \`static\`. Keep it instance-level (Cucumber resets per scenario), and use PicoContainer DI to share across step classes.
- **Tags filter ignored** — pass \`-Dcucumber.filter.tags\`, not the old \`-Dcucumber.options="--tags ..."\` which was removed.

---

## Frequently Asked Questions

### What is the difference between a feature file and a step definition?

A feature file is plain Gherkin describing behavior in business language (\`Given/When/Then\`). A step definition is the Java method that executes when Cucumber matches a step line. Feature files describe *what*; step definitions implement *how*. One step definition can serve many feature files.

### How do I share state between step definition classes in Cucumber-JVM?

Use dependency injection. Add \`cucumber-picocontainer\` and define a shared "world" or context object, then constructor-inject it into each step class. Cucumber creates one instance per scenario and injects the same instance everywhere, so all your step classes see the same state for that scenario.

### Should I use Cucumber Expressions or regular expressions?

Prefer Cucumber Expressions (\`{string}\`, \`{int}\`, \`{double}\`) — they are more readable and give you typed parameters automatically. Drop to full regex only when you need pattern control that expressions cannot express, such as matching one of a fixed set of words or a complex format.

### How are DataTables converted to Java objects?

By default Cucumber gives you a \`DataTable\` you can read as \`asMaps()\` (header-keyed rows) or \`asLists()\`. To get typed objects, register a \`@DataTableType\` method that maps a single row (\`Map<String,String>\`) to your domain class; Cucumber then injects a \`List<YourType>\` directly into the step.

### Do Cucumber hooks run once per feature or once per scenario?

\`@Before\` and \`@After\` run once per scenario. For once-per-run setup and teardown use static \`@BeforeAll\`/\`@AfterAll\`. Tagged hooks like \`@Before("@ui")\` scope the hook to only those scenarios carrying the matching tag.

### Is \`@RunWith(Cucumber.class)\` still the way to run Cucumber-JVM?

No, that is the JUnit 4 style. On Cucumber-JVM 7 with the JUnit Platform you use an empty \`@Suite\` class with \`@IncludeEngines("cucumber")\` and \`@SelectClasspathResource\`, configuring glue and plugins via \`@ConfigurationParameter\`. The old runner still works if you stay on JUnit 4, but the suite approach is recommended.
`,
};
