import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Allure Reporting Java Complete Guide 2026',
  description:
    'Master Allure reporting with Selenium and Java in 2026. Cover Maven setup, annotations, steps, attachments, history, environment, and CI integration patterns.',
  date: '2026-05-18',
  category: 'Reference',
  content: `
# Selenium Allure Reporting Java Complete Guide 2026

Allure Report is the most polished open-source test report tool in 2026. For Selenium + Java projects it turns a wall of green and red dots into an interactive site with features, stories, severity levels, attached screenshots, trend graphs, and historical comparisons. Engineering teams find bugs faster because Allure surfaces what changed since the last release; managers get the at-a-glance summary they want; QA teams get the drill-down detail they need.

This guide covers Allure with Selenium + Java end-to-end in 2026. We walk through Maven setup with TestNG and JUnit 5, the @Step and @Attachment annotations, severity and feature annotations, environment properties, history retention, the local serve workflow, the CI integration pattern with GitHub Pages or Allure Server, and patterns for attaching screenshots, videos, and network logs. For Selenium fundamentals see [Selenium Java TestNG](/blog/selenium-java-testng-page-object-guide) and for Grid see [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide). Browse the [skills directory](/skills).

## Why Allure

Three reasons. First, presentation. Allure looks good. Stakeholders engage with reports they actually want to look at. Second, history. Allure retains test history across runs, so a flaky test becomes immediately visible (it shows up as inconsistent across last N runs). Third, attachments. Screenshots, videos, network logs, server logs all attach to specific tests and appear inline in the report.

The trade-off is the two-step generation: tests write JSON to a results directory; Allure CLI converts the directory into an HTML site. This means CI needs both a Java step (run tests) and an Allure step (generate report). Many CI templates handle this automatically in 2026.

| Feature | Allure | TestNG HTML | JUnit XML |
|---|---|---|---|
| Interactive UI | Yes | No | No |
| History retention | Yes | No | No |
| Severity tags | Yes | No | No |
| Step-level detail | Yes | No | No |
| Attachments | Yes | Limited | No |
| Trend charts | Yes | No | No |
| Open source | Yes | Yes | N/A |

## Dependencies

\`\`\`xml
<dependencies>
  <dependency>
    <groupId>io.qameta.allure</groupId>
    <artifactId>allure-testng</artifactId>
    <version>2.27.0</version>
  </dependency>
  <!-- Or for JUnit 5 -->
  <dependency>
    <groupId>io.qameta.allure</groupId>
    <artifactId>allure-junit5</artifactId>
    <version>2.27.0</version>
  </dependency>
  <dependency>
    <groupId>io.qameta.allure</groupId>
    <artifactId>allure-attachments</artifactId>
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
        <argLine>
          -javaagent:"\${settings.localRepository}/org/aspectj/aspectjweaver/1.9.22/aspectjweaver-1.9.22.jar"
        </argLine>
        <systemPropertyVariables>
          <allure.results.directory>\${project.build.directory}/allure-results</allure.results.directory>
        </systemPropertyVariables>
      </configuration>
      <dependencies>
        <dependency>
          <groupId>org.aspectj</groupId>
          <artifactId>aspectjweaver</artifactId>
          <version>1.9.22</version>
        </dependency>
      </dependencies>
    </plugin>

    <plugin>
      <groupId>io.qameta.allure</groupId>
      <artifactId>allure-maven</artifactId>
      <version>2.13.0</version>
    </plugin>
  </plugins>
</build>
\`\`\`

The AspectJ weaver is required for Allure's annotation processing.

## Install Allure CLI

\`\`\`bash
# macOS
brew install allure

# Linux
curl -o allure-2.30.0.tgz -OLs https://github.com/allure-framework/allure2/releases/download/2.30.0/allure-2.30.0.tgz
tar -zxvf allure-2.30.0.tgz -C /opt/
sudo ln -s /opt/allure-2.30.0/bin/allure /usr/local/bin/allure
\`\`\`

Verify with \`allure --version\`. The CLI converts the results directory into an HTML site.

## Basic Test with Allure Annotations

\`\`\`java
package com.example.tests;

import com.example.pages.LoginPage;
import io.qameta.allure.*;
import org.testng.Assert;
import org.testng.annotations.*;

@Epic("Authentication")
@Feature("Login")
public class LoginTest extends BaseTest {

    @Test(description = "Standard user login")
    @Story("Successful login")
    @Severity(SeverityLevel.CRITICAL)
    @Description("Verifies a valid user can log in and reach the dashboard")
    @Owner("alice@example.com")
    @TmsLink("JIRA-123")
    @Issue("BUG-456")
    public void testLoginSuccess() {
        LoginPage page = new LoginPage(driver);
        page.navigate();
        page.loginAs("user@example.com", "demo");
        Assert.assertTrue(driver.getTitle().contains("Dashboard"));
    }
}
\`\`\`

These annotations populate Allure's metadata fields. \`Epic\`, \`Feature\`, \`Story\` create the hierarchical navigation. \`Severity\` drives the priority filter. \`TmsLink\` and \`Issue\` create clickable links to JIRA or your tracker.

| Annotation | Purpose |
|---|---|
| @Epic | Top-level grouping (e.g., "Authentication") |
| @Feature | Mid-level (e.g., "Login") |
| @Story | Specific behavior (e.g., "Successful login") |
| @Severity | BLOCKER, CRITICAL, NORMAL, MINOR, TRIVIAL |
| @Description | Test description in report |
| @Owner | Email or username |
| @TmsLink | Link to test management system |
| @Issue | Link to issue tracker |
| @Link | Generic external link |

## Step Annotations

The \`@Step\` annotation creates a step in the Allure report.

\`\`\`java
package com.example.pages;

import io.qameta.allure.Step;
import org.openqa.selenium.WebDriver;

public class LoginPage {
    @Step("Navigate to login page")
    public LoginPage navigate() {
        driver.get("https://app.example.com/login");
        return this;
    }

    @Step("Enter credentials: {email}")
    public LoginPage enterCredentials(String email, String password) {
        driver.findElement(emailField).sendKeys(email);
        driver.findElement(passwordField).sendKeys(password);
        return this;
    }

    @Step("Click submit")
    public DashboardPage submit() {
        driver.findElement(submitButton).click();
        return new DashboardPage(driver);
    }
}
\`\`\`

In the Allure report each step appears as a collapsible block. Parameters in the @Step value (e.g., \`{email}\`) substitute the actual argument values.

Steps can also be defined inline with \`Allure.step\`:

\`\`\`java
@Test
public void testCheckout() {
    Allure.step("Login as standard user", () -> {
        loginPage.navigate().loginAs("u", "p");
    });
    Allure.step("Add item to cart", () -> {
        productPage.addToCart("ABC-123");
    });
    Allure.step("Complete checkout", () -> {
        checkoutPage.submit();
    });
}
\`\`\`

Lambda-based steps work well for ad-hoc steps within tests.

## Attachments

Attach screenshots, HTML pages, network logs, or any binary or text data.

\`\`\`java
import io.qameta.allure.Allure;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.testng.ITestResult;

@AfterMethod
public void attachScreenshotOnFailure(ITestResult result) {
    if (result.getStatus() == ITestResult.FAILURE && driver != null) {
        Allure.addAttachment(
            "Failure screenshot",
            "image/png",
            new ByteArrayInputStream(
                ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES)
            ),
            "png"
        );
        Allure.addAttachment(
            "Page source",
            "text/html",
            driver.getPageSource()
        );
        Allure.addAttachment(
            "Browser logs",
            "text/plain",
            String.join("\\n", captureBrowserLogs())
        );
    }
}
\`\`\`

Attachments appear inline in the test detail view. PNG and HTML attachments render directly; text attachments are downloadable.

The \`@Attachment\` annotation is shorthand for return value capture:

\`\`\`java
@Attachment(value = "Screenshot", type = "image/png")
public byte[] takeScreenshot(WebDriver driver) {
    return ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
}
\`\`\`

Call \`takeScreenshot(driver)\` in test cleanup and Allure attaches the result automatically.

## Environment Information

The \`environment.properties\` file in the results directory adds metadata.

\`\`\`properties
# allure-results/environment.properties
Browser=Chrome
BrowserVersion=122
OS=Ubuntu 22.04
Url=https://staging.example.com
Build=2026.05.18-rc.42
Branch=feature/login-fixes
\`\`\`

This appears in the report's Overview tab. Generate it dynamically in CI:

\`\`\`bash
cat > target/allure-results/environment.properties <<EOF
Browser=\$BROWSER
BrowserVersion=\$BROWSER_VERSION
OS=\$RUNNER_OS
Build=\$GITHUB_SHA
Branch=\$GITHUB_REF_NAME
EOF
\`\`\`

## Categories

Categorize test failures by patterns. Common categories: infrastructure failures, product bugs, test bugs.

\`\`\`json
// allure-results/categories.json
[
  {
    "name": "Infrastructure issues",
    "matchedStatuses": ["broken"],
    "messageRegex": ".*WebDriverException.*|.*ConnectionRefused.*"
  },
  {
    "name": "Test data issues",
    "matchedStatuses": ["broken"],
    "messageRegex": ".*Test data not found.*"
  },
  {
    "name": "Product bugs",
    "matchedStatuses": ["failed"],
    "messageRegex": ".*Expected.*"
  }
]
\`\`\`

The Categories tab groups failures by category, helping triage.

## History

Allure retains history across runs. To enable, copy the previous \`allure-report/history\` directory into the new \`allure-results/history\` before generating the new report.

\`\`\`bash
# Before running tests, restore history
if [ -d "previous-report/history" ]; then
  cp -r previous-report/history target/allure-results/
fi

# Run tests
mvn test

# Generate report
allure generate target/allure-results -o allure-report --clean
\`\`\`

In CI, store the report as an artifact between runs:

\`\`\`yaml
- name: Restore history
  uses: actions/cache@v4
  with:
    path: allure-history
    key: allure-history-\${{ github.run_id }}
    restore-keys: |
      allure-history-

- name: Run tests
  run: |
    mkdir -p target/allure-results
    if [ -d allure-history/history ]; then
      cp -r allure-history/history target/allure-results/
    fi
    mvn test

- name: Generate report
  run: allure generate target/allure-results -o allure-report --clean

- name: Save history
  run: cp -r allure-report/history allure-history/
\`\`\`

## Local Serve

For local development, serve directly without static generation:

\`\`\`bash
mvn test
allure serve target/allure-results
\`\`\`

This starts a local web server and opens the report in your browser. Convenient for inspecting test failures during development.

## CI Integration

GitHub Actions with GitHub Pages:

\`\`\`yaml
name: Selenium with Allure

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Run tests
        run: mvn test
        continue-on-error: true

      - name: Restore Allure history
        uses: actions/cache@v4
        with:
          path: allure-history
          key: allure-history-\${{ github.run_id }}
          restore-keys: allure-history-

      - name: Generate Allure report
        uses: simple-elf/allure-report-action@master
        with:
          allure_results: target/allure-results
          gh_pages: gh-pages
          allure_history: allure-history

      - name: Publish to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_branch: gh-pages
          publish_dir: allure-history
\`\`\`

The report becomes available at https://<org>.github.io/<repo>/.

## Allure Server (Self-hosted)

For organizations not wanting GitHub Pages, Allure Server is a Docker image that hosts a multi-project report server with project-level isolation.

\`\`\`bash
docker run -d -p 5050:5050 \\
  -v $(pwd)/allure-projects:/app/projects \\
  frankescobar/allure-docker-service
\`\`\`

Upload results via API:

\`\`\`bash
curl -X POST "http://allure-server:5050/allure-docker-service/send-results?project_id=selenium-suite" \\
  -H "Content-Type: multipart/form-data" \\
  -F "results=@target/allure-results.zip"

curl -X GET "http://allure-server:5050/allure-docker-service/generate-report?project_id=selenium-suite"
\`\`\`

Reports are accessible at http://allure-server:5050/allure-docker-service/projects/selenium-suite/reports/latest/.

## Cucumber Integration

For Cucumber projects use allure-cucumber7-jvm:

\`\`\`xml
<dependency>
  <groupId>io.qameta.allure</groupId>
  <artifactId>allure-cucumber7-jvm</artifactId>
  <version>2.27.0</version>
</dependency>
\`\`\`

Cucumber tags map to Allure annotations: \`@severity=critical\` becomes \`@Severity(CRITICAL)\`. Feature names become Allure features. Scenario names become test names.

## Patterns That Work

Five patterns we recommend:

1. **Annotate page methods with @Step.** This makes the report read like a test journal.
2. **Capture screenshot, page source, and console logs on failure.** All three together usually pinpoint the root cause.
3. **Use Severity tags for triage.** Critical tests get fixed first; trivial tests can wait.
4. **Always include environment.properties.** Reports without environment context are hard to interpret.
5. **Restore history between runs.** Without history, flaky tests are invisible.

## Conclusion

Allure is the right open-source reporting choice for Selenium + Java in 2026. The interactive UI, history retention, and rich attachment support make it ideal for teams that need to communicate test results beyond engineering. Pair it with TestNG or JUnit 5 and configure CI to publish reports automatically.

Browse the [skills directory](/skills) for Selenium AI agent skills. Read [Selenium Java TestNG](/blog/selenium-java-testng-page-object-guide) for the test framework setup and [Selenium Cucumber](/blog/selenium-cucumber-java-bdd-complete-guide) for BDD reports.
`,
};
