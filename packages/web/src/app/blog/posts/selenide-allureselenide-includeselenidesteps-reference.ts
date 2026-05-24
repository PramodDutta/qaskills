import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide AllureSelenide includeSelenideSteps — Complete Reference',
  description:
    'Master AllureSelenide listener with includeSelenideSteps, screenshots, page source, step naming, and Allure 2 integration patterns.',
  date: '2026-05-12',
  category: 'Reference',
  content: `
# Selenide AllureSelenide includeSelenideSteps Complete Reference

Allure Report is the most popular HTML test reporting tool in the Java testing ecosystem, and Selenide provides first-class integration via the \`AllureSelenide\` listener. When configured correctly, every Selenide action — every \`should\`, every \`click\`, every \`setValue\` — becomes a step in the Allure report, with optional screenshots and page source attachments. The result is reports that read like guided tours of what the test did, perfect for debugging, regression analysis, and showing stakeholders what your tests cover.

This reference is a comprehensive guide to the AllureSelenide listener and the critical \`includeSelenideSteps\` option in 2026. We cover the listener registration pattern, screenshot configuration, page source attachments, step naming, integration with JUnit 5, Spring Boot, and CI/CD reporting pipelines. Every code sample is working Java with Selenide 7+ and Allure 2.27+.

---

## Key Takeaways

- **AllureSelenide listener** subscribes to Selenide events and emits Allure steps
- **includeSelenideSteps(true)** is the flag that turns every Selenide action into an Allure step
- **screenshots(true)** attaches screenshots to each step
- **savePageSource(true)** attaches HTML on each step
- **Register once per test run**, typically in @BeforeAll
- **Use with the Allure JUnit 5 extension** for full integration

---

## Installation

\`\`\`xml
<dependency>
  <groupId>io.qameta.allure</groupId>
  <artifactId>allure-selenide</artifactId>
  <version>2.27.0</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>io.qameta.allure</groupId>
  <artifactId>allure-junit5</artifactId>
  <version>2.27.0</version>
  <scope>test</scope>
</dependency>
\`\`\`

Gradle:

\`\`\`gradle
testImplementation 'io.qameta.allure:allure-selenide:2.27.0'
testImplementation 'io.qameta.allure:allure-junit5:2.27.0'
\`\`\`

---

## Basic Setup

\`\`\`java
import com.codeborne.selenide.logevents.SelenideLogger;
import io.qameta.allure.selenide.AllureSelenide;
import org.junit.jupiter.api.BeforeAll;

class BaseTest {
    @BeforeAll
    static void setupAllure() {
        SelenideLogger.addListener("allure", new AllureSelenide()
            .screenshots(true)
            .savePageSource(true)
            .includeSelenideSteps(true)
        );
    }
}
\`\`\`

This registers the listener once. Every Selenide action thereafter produces an Allure step.

---

## What includeSelenideSteps(true) Does

Without \`includeSelenideSteps(true)\`, only user-defined steps (\`@Step\` methods, \`Allure.step(...)\` calls) appear in the report. With it enabled, every Selenide action becomes a step:

\`\`\`
[Step] Open: https://example.com/login
[Step] Click: $("#submit")
  [Attachment] screenshot.png
  [Attachment] page-source.html
[Step] Should be visible: $("#dashboard")
\`\`\`

Without \`includeSelenideSteps(true)\`, the report shows only the test method name and any explicit \`@Step\` annotations.

---

## AllureSelenide Configuration Options

| Method | Default | Effect |
|---|---|---|
| \`.screenshots(true)\` | true | Attach screenshot on each step |
| \`.savePageSource(true)\` | true | Attach HTML source on each step |
| \`.includeSelenideSteps(true)\` | false | Emit step per Selenide action |
| \`.onStepFailure(...)\` | default | Customize behavior on failure |
| \`.onStepFinish(...)\` | default | Customize behavior on success |

---

## Conditional Screenshots

Attaching a screenshot on every step is verbose. To attach only on failure:

\`\`\`java
SelenideLogger.addListener("allure", new AllureSelenide()
    .screenshots(false)
    .savePageSource(false)
    .includeSelenideSteps(true)
);
\`\`\`

Then in the test:

\`\`\`java
@Step("Take screenshot")
void attachScreenshot() {
    File png = Selenide.screenshot("manual");
    Allure.addAttachment("screenshot", "image/png",
        new FileInputStream(png), ".png");
}
\`\`\`

Or wrap in a fail-only listener using \`onStepFailure\`:

\`\`\`java
.onStepFailure((step, throwable) -> {
    Allure.addAttachment("error screenshot", "image/png",
        new ByteArrayInputStream(Screenshots.takeScreenShotAsImage()), ".png");
})
\`\`\`

---

## Step Naming

By default, Selenide emits step names like \`"$("#submit").click()"\`. To customize naming, wrap Selenide calls in \`@Step\` methods:

\`\`\`java
public class LoginPage {
    @Step("Log in as {user}")
    public DashboardPage loginAs(String user, String password) {
        $("#user").setValue(user);
        $("#password").setValue(password);
        $("#submit").click();
        return new DashboardPage();
    }
}
\`\`\`

The Allure report now shows \`Log in as alice\` as the top-level step, with Selenide actions as substeps.

---

## Page Source Size

\`savePageSource(true)\` saves the entire HTML, which can be hundreds of KB per page. For long test suites, this adds up. Disable on success, keep on failure:

\`\`\`java
SelenideLogger.addListener("allure", new AllureSelenide()
    .screenshots(true)
    .savePageSource(false)
    .includeSelenideSteps(true)
    .onStepFailure((step, throwable) -> {
        String html = Selenide.webdriver().driver().getWebDriver().getPageSource();
        Allure.addAttachment("page source", "text/html",
            new ByteArrayInputStream(html.getBytes()), ".html");
    })
);
\`\`\`

---

## Generating Reports

After tests run, generate the report:

\`\`\`bash
mvn test
allure serve target/allure-results
\`\`\`

Or use the Allure Maven plugin:

\`\`\`xml
<plugin>
  <groupId>io.qameta.allure</groupId>
  <artifactId>allure-maven</artifactId>
  <version>2.12.0</version>
  <configuration>
    <reportVersion>2.27.0</reportVersion>
  </configuration>
</plugin>
\`\`\`

\`mvn allure:serve\` opens the report in your browser.

---

## CI/CD Allure Report Upload

GitHub Actions with allure-report-action:

\`\`\`yaml
name: tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - run: ./mvnw test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: allure-results
          path: target/allure-results
      - uses: simple-elf/allure-report-action@v1
        if: always()
        with:
          allure_results: target/allure-results
          allure_report: allure-report
      - uses: peaceiris/actions-gh-pages@v3
        if: always()
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_branch: gh-pages
          publish_dir: allure-report
\`\`\`

---

## Annotations Worth Knowing

| Annotation | Purpose |
|---|---|
| \`@DisplayName\` | Test display name (JUnit) |
| \`@Description\` | Long-form test description |
| \`@Epic\` / \`@Feature\` / \`@Story\` | Hierarchy in report |
| \`@Severity\` | BLOCKER, CRITICAL, NORMAL, MINOR, TRIVIAL |
| \`@Owner\` | Test owner |
| \`@Link\` | Link to issue tracker |
| \`@Step\` | Custom step in report |
| \`@Attachment\` | Generate attachment from method return |

---

## @Step Example

\`\`\`java
import io.qameta.allure.Step;

public class CheckoutPage {
    @Step("Apply coupon: {code}")
    public CheckoutPage applyCoupon(String code) {
        $("#coupon").setValue(code);
        $("#apply").click();
        return this;
    }

    @Step("Place order")
    public OrderConfirmationPage placeOrder() {
        $("#place-order").click();
        return new OrderConfirmationPage();
    }
}
\`\`\`

In the Allure report, the test shows clear narrative steps with Selenide actions as substeps under each.

---

## Step Hierarchy

When you call a \`@Step\` method that internally uses Selenide, the report shows:

\`\`\`
- Apply coupon: SAVE10  <-- @Step
  - $("#coupon").setValue("SAVE10")  <-- Selenide
  - $("#apply").click()  <-- Selenide
- Place order  <-- @Step
  - $("#place-order").click()  <-- Selenide
\`\`\`

This is the perfect balance: high-level narrative plus low-level actions.

---

## Common Pitfalls

**Pitfall 1: Forgetting to register the listener.** Without \`SelenideLogger.addListener(...)\`, no Selenide steps appear in the report.

**Pitfall 2: Multiple listener registrations.** Calling \`addListener\` in every test class causes duplicate steps. Register once in \`@BeforeAll\` of a base class.

**Pitfall 3: Too much detail.** Enabling screenshots and page source for every step produces 500 MB reports. Use \`onStepFailure\` instead.

**Pitfall 4: Missing allure-junit5.** Without it, JUnit 5 tests don't appear in the report.

**Pitfall 5: Forgetting to remove listener in tests that need different config.** Use \`SelenideLogger.removeListener("allure")\` and re-register if needed.

---

## Comparison: With vs Without includeSelenideSteps

| Aspect | With | Without |
|---|---|---|
| Report verbosity | High | Low |
| Debugging value | Excellent | Limited to @Step |
| Storage size | Larger | Smaller |
| Best for | Failed tests | Stable suites |

---

## Conclusion

The AllureSelenide listener with \`includeSelenideSteps(true)\` transforms test reports from a list of pass/fail flags into a guided narrative of what each test did. Combined with \`@Step\` for high-level naming, screenshots on failure, and CI publishing of the HTML report, you get a debugging experience that justifies the small storage cost.

For complementary patterns, see our [screenshot guide](/blog/selenide-screenshot-on-failure-guide) and [soft assertions reference](/blog/selenide-soft-assertions-complete-reference).

Browse the [QA skills directory](/skills) for related Java testing patterns.
`,
};
