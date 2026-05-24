import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cucumber Java BDD: Best Practices 2026',
  description:
    'Best practices for Cucumber-JVM in 2026. Project structure, glue code, dependency injection, data tables, parallel execution, hooks, tagging, reporting, and CI integration for production projects.',
  date: '2026-05-09',
  category: 'BDD',
  content: `
# Cucumber Java BDD: Best Practices 2026

Cucumber-JVM is the most widely-deployed BDD framework in enterprise Java environments. It has survived JUnit 4 to JUnit 5 transitions, Spring Boot major versions, the rise of microservices, and the move from Jenkins to GitHub Actions and GitLab CI. In 2026, Cucumber-JVM 7.x with the JUnit 5 Platform Suite is the canonical stack, and teams that adopt it correctly enjoy fast, parallel, maintainable BDD suites that scale to thousands of scenarios.

But Cucumber-JVM also has more rope to hang yourself with than any other BDD framework. Misused glue code, badly-organized step definitions, brittle dependency injection, and ignored anti-patterns combine to produce the dreaded "BDD doesn't scale" experience that has soured many teams. This guide covers the best practices that separate successful Cucumber-JVM adoptions from failed ones in 2026, based on real engineering teams running 1,000+ scenario suites in production.

We cover project structure, glue code organization, dependency injection via Picocontainer/Spring/Guice, data table strategies, parallel execution, hooks, tagging conventions, reporting, and the most common anti-patterns. Every example is current with Cucumber-JVM 7.20.x and JUnit 5.10+.

## Key Takeaways

- **Use the JUnit 5 Platform Suite engine** -- not the deprecated Cucumber JUnit 4 runner.
- **Organize step definitions by domain** -- not by Given/When/Then.
- **Picocontainer is the simplest DI for Cucumber-JVM**; Spring is best for Spring Boot apps.
- **Tag aggressively** -- @smoke, @regression, @wip, plus domain tags.
- **Parallel execution is mandatory** for suites over 100 scenarios.

---

## 1. Project Structure

A well-organized Cucumber-JVM project in 2026:

\`\`\`
src/test/
  java/com/example/
    runners/
      RunCucumberTest.java       # JUnit 5 Platform Suite
    steps/
      accounts/AccountSteps.java
      checkout/CheckoutSteps.java
      common/CommonSteps.java
    hooks/
      Hooks.java
    support/
      TestContext.java
      ApiClient.java
      PageObjects/*.java
  resources/
    features/
      accounts/signup.feature
      accounts/signin.feature
      checkout/checkout.feature
    junit-platform.properties
    cucumber.properties
\`\`\`

## 2. Maven POM

\`\`\`xml
<dependencies>
  <dependency>
    <groupId>io.cucumber</groupId>
    <artifactId>cucumber-java</artifactId>
    <version>7.20.1</version>
    <scope>test</scope>
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
    <version>1.10.2</version>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>io.cucumber</groupId>
    <artifactId>cucumber-picocontainer</artifactId>
    <version>7.20.1</version>
    <scope>test</scope>
  </dependency>
</dependencies>
\`\`\`

## 3. Test Runner

\`\`\`java
package com.example.runners;

import org.junit.platform.suite.api.ConfigurationParameter;
import org.junit.platform.suite.api.IncludeEngines;
import org.junit.platform.suite.api.SelectClasspathResource;
import org.junit.platform.suite.api.Suite;
import static io.cucumber.junit.platform.engine.Constants.*;

@Suite
@IncludeEngines("cucumber")
@SelectClasspathResource("features")
@ConfigurationParameter(key = GLUE_PROPERTY_NAME, value = "com.example.steps,com.example.hooks")
@ConfigurationParameter(key = PLUGIN_PROPERTY_NAME, value = "pretty, json:target/cucumber.json, html:target/cucumber.html")
@ConfigurationParameter(key = EXECUTION_DRY_RUN_PROPERTY_NAME, value = "false")
@ConfigurationParameter(key = FILTER_TAGS_PROPERTY_NAME, value = "not @wip")
public class RunCucumberTest { }
\`\`\`

## 4. junit-platform.properties

\`\`\`properties
cucumber.execution.parallel.enabled=true
cucumber.execution.parallel.config.strategy=fixed
cucumber.execution.parallel.config.fixed.parallelism=8
cucumber.publish.quiet=true
cucumber.snippet-type=camelcase
\`\`\`

## 5. Step Definitions Organized by Domain

A common anti-pattern is to organize step files by Given/When/Then. Don't. Organize by domain:

\`\`\`java
// src/test/java/com/example/steps/accounts/AccountSteps.java
package com.example.steps.accounts;

import io.cucumber.java.en.Given;
import io.cucumber.java.en.When;
import io.cucumber.java.en.Then;
import com.example.support.TestContext;
import com.example.support.ApiClient;
import static org.assertj.core.api.Assertions.assertThat;

public class AccountSteps {
    private final TestContext context;
    private final ApiClient api;

    public AccountSteps(TestContext context, ApiClient api) {
        this.context = context;
        this.api = api;
    }

    @Given("a registered user with email {string} and password {string}")
    public void registerUser(String email, String password) {
        Account a = api.createAccount(email, password);
        context.setActiveAccount(a);
    }

    @When("the user signs in with email {string} and password {string}")
    public void signin(String email, String password) {
        var resp = api.signIn(email, password);
        context.setLastResponse(resp);
    }

    @Then("the sign-in should succeed with token")
    public void signinSuccess() {
        assertThat(context.getLastResponse().status()).isEqualTo(200);
        assertThat(context.getLastResponse().body().get("token")).isNotNull();
    }
}
\`\`\`

## 6. TestContext: Per-Scenario State

Picocontainer creates a new TestContext per scenario, ensuring isolation:

\`\`\`java
package com.example.support;

import java.util.HashMap;
import java.util.Map;

public class TestContext {
    private Account activeAccount;
    private ApiResponse lastResponse;
    private final Map<String, Object> bag = new HashMap<>();

    public void setActiveAccount(Account a) { this.activeAccount = a; }
    public Account getActiveAccount() { return activeAccount; }
    public void setLastResponse(ApiResponse r) { this.lastResponse = r; }
    public ApiResponse getLastResponse() { return lastResponse; }
    public <T> T get(String key, Class<T> type) { return type.cast(bag.get(key)); }
    public void put(String key, Object value) { bag.put(key, value); }
}
\`\`\`

## 7. Hooks

Centralize hooks in a single class:

\`\`\`java
package com.example.hooks;

import io.cucumber.java.Before;
import io.cucumber.java.After;
import io.cucumber.java.BeforeAll;
import io.cucumber.java.AfterAll;
import io.cucumber.java.Scenario;
import com.example.support.TestContext;
import com.example.support.Database;

public class Hooks {
    private final TestContext context;

    public Hooks(TestContext context) { this.context = context; }

    @BeforeAll
    public static void beforeAll() {
        Database.startContainer();
        Database.migrate();
    }

    @AfterAll
    public static void afterAll() {
        Database.stopContainer();
    }

    @Before
    public void before(Scenario scenario) {
        Database.truncateAllTables();
    }

    @Before("@requires-payment-mock")
    public void startPaymentMock() {
        PaymentMock.start(8090);
    }

    @After
    public void after(Scenario scenario) {
        if (scenario.isFailed()) {
            byte[] screenshot = Screenshots.capture(context);
            scenario.attach(screenshot, "image/png", "Failure screenshot");
        }
        PaymentMock.stop();
    }
}
\`\`\`

## 8. Tagging Conventions

| Tag | Purpose | Run on |
|---|---|---|
| @smoke | Critical path checks | Every PR |
| @regression | Full suite | Nightly |
| @wip | Work in progress | Excluded |
| @flaky | Known-flaky | Manual reruns |
| @api | API-only | Fast subset |
| @ui | UI-required | Slower subset |
| @requires-X | Feature flags | Conditional |

## 9. Data Tables

\`\`\`gherkin
Scenario: Bulk user import
  When I import the following users:
    | email             | role   | active |
    | alice@example.com | admin  | true   |
    | bob@example.com   | user   | true   |
    | carol@example.com | guest  | false  |
  Then 3 users should exist
\`\`\`

\`\`\`java
@When("I import the following users:")
public void importUsers(io.cucumber.datatable.DataTable table) {
    for (Map<String, String> row : table.asMaps()) {
        api.createUser(row.get("email"), row.get("role"), Boolean.parseBoolean(row.get("active")));
    }
}
\`\`\`

## 10. Parallel Execution Gotchas

- **Make TestContext per-scenario** (Picocontainer does this by default).
- **Avoid \`static\` mutable state** -- it leaks between threads.
- **Use thread-local connections** in shared resources.
- **Database isolation**: per-thread schemas, or truncate-between-scenarios with transaction rollback.

## 11. Reporting

Cluecumber for branded HTML:

\`\`\`xml
<plugin>
  <groupId>com.trivago.rta</groupId>
  <artifactId>cluecumber-maven</artifactId>
  <version>3.10.0</version>
  <executions>
    <execution>
      <goals><goal>reporting</goal></goals>
      <phase>post-integration-test</phase>
    </execution>
  </executions>
  <configuration>
    <sourceJsonReportDirectory>target/cucumber-json</sourceJsonReportDirectory>
    <generatedHtmlReportDirectory>target/cluecumber</generatedHtmlReportDirectory>
  </configuration>
</plugin>
\`\`\`

Allure as an alternative:

\`\`\`xml
<dependency>
  <groupId>io.qameta.allure</groupId>
  <artifactId>allure-cucumber7-jvm</artifactId>
  <version>2.27.0</version>
</dependency>
\`\`\`

## 12. CI Integration

\`\`\`yaml
name: BDD CI
on: [push, pull_request]
jobs:
  cucumber:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: mvn -B -Dgroups=smoke test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: cucumber-report, path: target/cluecumber/ }
\`\`\`

## 13. Anti-Patterns to Avoid

- **Imperative steps** ("the user clicks the button labeled X"). Use business steps.
- **Long Backgrounds** -- 8+ steps signals coupled tests.
- **Step definition files per Gherkin keyword** -- organize by domain.
- **Static state across scenarios** -- breaks parallel.
- **No @wip discipline** -- broken scenarios accumulate.

## 14. AI-Assisted Step Authoring

The [cucumber-java](/skills) SKILL.md pack on QASkills lets Claude generate consistent step definitions matching your codebase conventions. See [cursor-skills-md-best-practices](/blog) for installation.

## 15. Advanced Dependency Injection

### Spring Boot Integration
For teams using Spring Boot, Cucumber-JVM integrates via cucumber-spring:

\`\`\`xml
<dependency>
  <groupId>io.cucumber</groupId>
  <artifactId>cucumber-spring</artifactId>
  <version>7.20.1</version>
</dependency>
\`\`\`

Configure with:

\`\`\`java
@CucumberContextConfiguration
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(locations = "classpath:application-test.properties")
public class CucumberSpringConfig {
}
\`\`\`

Step definition classes get full Spring DI:

\`\`\`java
public class OrderSteps {
    @Autowired private OrderService orderService;
    @Autowired private TestContext testContext;
}
\`\`\`

### Guice Integration
For non-Spring projects, Guice is popular:

\`\`\`xml
<dependency>
  <groupId>io.cucumber</groupId>
  <artifactId>cucumber-guice</artifactId>
  <version>7.20.1</version>
</dependency>
\`\`\`

Module configuration:

\`\`\`java
public class TestModule extends AbstractModule {
    @Override
    protected void configure() {
        bind(TestContext.class).in(ScenarioScoped.class);
        bind(ApiClient.class).toInstance(new ApiClient("http://localhost:8080"));
    }
}
\`\`\`

### Picocontainer (Default)
The simplest option: just declare constructor dependencies. Picocontainer instantiates everything per scenario automatically.

## 16. Custom Parameter Types

Define custom parameter types for cleaner Gherkin:

\`\`\`java
@ParameterType("[a-z]+@[a-z]+\\.[a-z]+")
public String email(String email) {
    return email;
}

@ParameterType("\\d{4}-\\d{2}-\\d{2}")
public LocalDate isoDate(String value) {
    return LocalDate.parse(value);
}

@When("I register {email} on {isoDate}")
public void register(String email, LocalDate date) {
    // ...
}
\`\`\`

Now scenarios can read:

\`\`\`gherkin
When I register alice@example.com on 2026-05-01
\`\`\`

## 17. Background Discipline

Long backgrounds signal coupled scenarios. The rule of thumb: if your Background has more than 5 steps, refactor. Common refactorings:

- Move steps to @Before hooks if they're truly common.
- Split the feature into multiple feature files by user persona.
- Use factories instead of explicit Given steps for state setup.

## 18. Data Tables vs Examples vs Inline

| Pattern | When to use |
|---|---|
| Data tables | Setup with structured data (users, items) |
| Examples (Scenario Outline) | Boundary case enumeration |
| Inline values | One-off specific data |

Avoid Scenario Outlines with more than 10 examples; split them by domain instead.

## 19. Hooks Best Practices

- **One hook per concern**: don't combine database reset with screenshot capture in the same hook.
- **Order matters**: use the order parameter to guarantee execution sequence.
- **Tag-filtered hooks**: limit scope so unrelated scenarios aren't affected.
- **Avoid expensive @BeforeAll work**: it runs once but blocks everything.

## 20. Test Data Strategies

For Cucumber-JVM at scale, three strategies work:

1. **Per-scenario truncation**: TRUNCATE all tables in @Before. Fast, reliable.
2. **Transactional rollback**: wrap each scenario in a transaction, roll back in @After.
3. **Per-test-class database**: each thread gets its own schema.

Pick based on whether your scenarios involve UI clients reading committed data (in which case rollback won't work).

## 21. Frequently Asked Questions

**Q: Can I use JUnit 4 with Cucumber 7?**
A: Technically yes via cucumber-junit, but it's deprecated. Migrate to JUnit 5 Platform Suite.

**Q: How do I run only one scenario for debugging?**
A: Use --name "scenario name" or --tags @debug with a temporary tag.

**Q: Should I check in target/cucumber-reports?**
A: No -- add to .gitignore. Reports regenerate every run.

**Q: How do I version step definitions?**
A: Use semantic versioning on the test artifact. Treat step changes as breaking like API changes.

**Q: Can AI generate Cucumber-JVM step definitions?**
A: Yes -- the [cucumber-java](/skills) SKILL.md pack on QASkills teaches Claude to generate step definitions matching your style.

## Conclusion

Cucumber-JVM in 2026 is mature, fast, and production-ready -- but only when used with discipline. The combination of JUnit 5 Platform Suite, Picocontainer DI, domain-organized step files, aggressive tagging, and parallel execution is what makes it scale. See also [cucumber-tags-hooks-complete-reference](/blog).
`,
};
