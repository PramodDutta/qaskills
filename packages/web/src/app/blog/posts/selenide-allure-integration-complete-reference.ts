import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide + Allure Integration: Complete Reference Guide',
  description:
    'Master Selenide and Allure integration with step annotations, automatic screenshots, page source attachments, browser logs, and CI-ready reports. Java code, Maven, and Gradle examples included.',
  date: '2026-05-21',
  category: 'Tutorial',
  content: `
## Introduction

Selenide gives you a concise UI automation API on top of Selenium, while Allure gives you a beautiful, navigable test report. When you combine them, every Selenide action becomes a self-documenting test step, every failure ships with a screenshot and the full HTML source, and every CI run becomes a shareable artifact that non-engineers can actually read.

This guide is a complete reference for wiring Selenide and Allure together in a real Java project. We'll cover the dependency setup in Maven and Gradle, the listeners and aspects you need, screenshot policies, page source attachments, custom step annotations, and how to publish the report from Jenkins or GitHub Actions.

By the end you'll have a configuration you can drop into any Selenide project, a clear mental model of how Allure intercepts Selenide calls, and patterns for keeping the report clean even when tests grow into the hundreds.

---

## Why Allure for Selenide

Selenide already logs every action with great error messages. So why add Allure on top?

- **Visual timeline.** Allure shows each test as a tree of steps with durations. You can see at a glance which click took 4 seconds.
- **Attachments per step.** Screenshots, page source, network logs, and console output attach to the exact step that produced them.
- **Test categorization.** \`@Epic\`, \`@Feature\`, \`@Story\`, and severity tags let product managers slice the report by area.
- **History and trends.** Allure keeps a history of runs so flaky tests bubble up visually.
- **CI-native.** The report is static HTML that any web server can host, including GitHub Pages and S3.

Selenide ships with first-class Allure support via the \`selenide-allure\` integration module, so the wiring is minimal.

---

## Dependency Setup

### Maven

\`\`\`xml
<properties>
    <selenide.version>7.5.0</selenide.version>
    <allure.version>2.27.0</allure.version>
    <aspectj.version>1.9.22</aspectj.version>
    <junit.version>5.11.0</junit.version>
</properties>

<dependencies>
    <dependency>
        <groupId>com.codeborne</groupId>
        <artifactId>selenide</artifactId>
        <version>\${selenide.version}</version>
    </dependency>
    <dependency>
        <groupId>io.qameta.allure</groupId>
        <artifactId>allure-selenide</artifactId>
        <version>\${allure.version}</version>
    </dependency>
    <dependency>
        <groupId>io.qameta.allure</groupId>
        <artifactId>allure-junit5</artifactId>
        <version>\${allure.version}</version>
    </dependency>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>\${junit.version}</version>
        <scope>test</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-surefire-plugin</artifactId>
            <version>3.2.5</version>
            <configuration>
                <argLine>
                    -javaagent:"\${settings.localRepository}/org/aspectj/aspectjweaver/\${aspectj.version}/aspectjweaver-\${aspectj.version}.jar"
                </argLine>
                <systemProperties>
                    <property>
                        <name>allure.results.directory</name>
                        <value>\${project.build.directory}/allure-results</value>
                    </property>
                </systemProperties>
            </configuration>
            <dependencies>
                <dependency>
                    <groupId>org.aspectj</groupId>
                    <artifactId>aspectjweaver</artifactId>
                    <version>\${aspectj.version}</version>
                </dependency>
            </dependencies>
        </plugin>
        <plugin>
            <groupId>io.qameta.allure</groupId>
            <artifactId>allure-maven</artifactId>
            <version>2.12.0</version>
            <configuration>
                <reportVersion>\${allure.version}</reportVersion>
            </configuration>
        </plugin>
    </plugins>
</build>
\`\`\`

The AspectJ weaver is what lets Allure intercept \`@Step\` annotations at runtime. Without it, steps don't show up in the report.

### Gradle

\`\`\`groovy
plugins {
    id 'java'
    id 'io.qameta.allure' version '2.12.0'
}

ext {
    allureVersion = '2.27.0'
    aspectjVersion = '1.9.22'
}

repositories { mavenCentral() }

dependencies {
    testImplementation 'com.codeborne:selenide:7.5.0'
    testImplementation "io.qameta.allure:allure-selenide:\${allureVersion}"
    testImplementation "io.qameta.allure:allure-junit5:\${allureVersion}"
    testImplementation 'org.junit.jupiter:junit-jupiter:5.11.0'

    testRuntimeOnly "org.aspectj:aspectjweaver:\${aspectjVersion}"
}

test {
    useJUnitPlatform()
    def weaver = configurations.testRuntimeClasspath.find {
        it.name.contains('aspectjweaver')
    }
    jvmArgs "-javaagent:\${weaver}"
    systemProperty 'allure.results.directory',
        "\${buildDir}/allure-results"
}

allure {
    version = allureVersion
    autoconfigure = true
    aspectjweaver = true
    useJUnit5 { version = allureVersion }
}
\`\`\`

The \`io.qameta.allure\` plugin can manage the aspect weaver for you, but I always set \`-javaagent\` manually because it works the same locally and in CI.

---

## Wiring the Selenide Allure Listener

Selenide's events fire through a public listener API. To pipe them into Allure, register the \`AllureSelenide\` listener once before tests run.

\`\`\`java
package com.example.tests;

import com.codeborne.selenide.logevents.SelenideLogger;
import io.qameta.allure.selenide.AllureSelenide;
import org.junit.jupiter.api.BeforeAll;

public abstract class BaseTest {

    @BeforeAll
    static void setUpAllure() {
        SelenideLogger.addListener("AllureSelenide",
            new AllureSelenide()
                .screenshots(true)
                .savePageSource(true)
                .includeSelenideSteps(true));
    }
}
\`\`\`

The three switches matter:

- \`screenshots(true)\` attaches a PNG to every failing step.
- \`savePageSource(true)\` attaches the live HTML at the moment of failure. This is gold for debugging hidden elements.
- \`includeSelenideSteps(true)\` turns every Selenide action (\`open\`, \`click\`, \`shouldHave\`) into its own Allure step.

Once that listener is registered, the report becomes self-documenting with zero per-test wiring.

---

## A Real Test with Rich Steps

Here's a login flow that produces a clean Allure report:

\`\`\`java
package com.example.tests;

import io.qameta.allure.*;
import org.junit.jupiter.api.Test;

import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Selectors.*;
import static com.codeborne.selenide.Condition.*;

@Epic("Authentication")
@Feature("Login")
class LoginTest extends BaseTest {

    @Test
    @Story("Valid credentials succeed")
    @Severity(SeverityLevel.CRITICAL)
    @Description("User can log in with a verified email + password")
    void userCanLogin() {
        openLoginPage();
        submitCredentials("alice@example.com", "SecurePass123!");
        verifyWelcomeBanner("Alice");
    }

    @Step("Open the login page")
    void openLoginPage() {
        open("/login");
        \$("h1").shouldHave(text("Sign in"));
    }

    @Step("Submit credentials for {email}")
    void submitCredentials(String email, String password) {
        \$("#email").setValue(email);
        \$("#password").setValue(password);
        \$(byAttribute("data-testid", "login-button")).click();
    }

    @Step("Verify welcome banner for {name}")
    void verifyWelcomeBanner(String name) {
        \$(".welcome-message").shouldHave(text("Welcome, " + name));
    }
}
\`\`\`

In the Allure report this test renders as a 3-step tree with parameter values inline. Every \`\$(...).click()\` becomes a sub-step. A failure on \`verifyWelcomeBanner\` attaches the screenshot + page source automatically.

---

## Screenshot Strategy

By default \`AllureSelenide\` attaches screenshots on failure. You often want screenshots on key successful steps too.

\`\`\`java
import io.qameta.allure.Allure;
import com.codeborne.selenide.Screenshots;

@Step("Capture full-page screenshot")
public void attachScreenshot(String name) {
    byte[] bytes = ((TakesScreenshot) WebDriverRunner.getWebDriver())
        .getScreenshotAs(OutputType.BYTES);
    Allure.addAttachment(name, "image/png",
        new ByteArrayInputStream(bytes), "png");
}
\`\`\`

For full-page captures across viewports, AShot integrates cleanly:

\`\`\`java
import ru.yandex.qatools.ashot.AShot;
import ru.yandex.qatools.ashot.shooting.ShootingStrategies;

@Step("Capture scrolling screenshot")
public void attachFullPageScreenshot() {
    BufferedImage image = new AShot()
        .shootingStrategy(ShootingStrategies.viewportPasting(100))
        .takeScreenshot(WebDriverRunner.getWebDriver())
        .getImage();
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    ImageIO.write(image, "png", out);
    Allure.addAttachment("full-page", "image/png",
        new ByteArrayInputStream(out.toByteArray()), "png");
}
\`\`\`

---

## Page Source on Failure

Selenide-Allure already saves \`page-source\` as text. To extend it with sanitized HTML or trimmed sections:

\`\`\`java
@Step("Attach sanitized page source")
public void attachSanitizedSource() {
    String html = WebDriverRunner.source();
    String stripped = html.replaceAll("(?s)<script.*?</script>", "");
    Allure.addAttachment("page-source.html",
        "text/html", stripped, "html");
}
\`\`\`

---

## Browser Logs and Network

Adding console and performance logs makes Allure useful for debugging client-side issues.

\`\`\`java
import org.openqa.selenium.logging.LogEntries;
import org.openqa.selenium.logging.LogType;

@Step("Attach browser console logs")
public void attachConsoleLogs() {
    LogEntries logs = WebDriverRunner.getWebDriver()
        .manage().logs().get(LogType.BROWSER);
    String body = logs.getAll().stream()
        .map(e -> e.getLevel() + " " + e.getMessage())
        .collect(Collectors.joining("\\n"));
    Allure.addAttachment("console.log",
        "text/plain", body, "log");
}
\`\`\`

---

## Categorizing Tests

Add an \`allure-results/categories.json\` file in your resources to bucket failures:

\`\`\`json
[
  {
    "name": "Element not found",
    "matchedStatuses": ["failed"],
    "messageRegex": ".*ElementNotFound.*"
  },
  {
    "name": "Timeout",
    "matchedStatuses": ["failed", "broken"],
    "messageRegex": ".*Timeout.*"
  },
  {
    "name": "Assertion failed",
    "matchedStatuses": ["failed"],
    "messageRegex": ".*should have.*"
  }
]
\`\`\`

The report's Categories tab will group failures by these regexes.

---

## Environment Metadata

Allure shows an Environment panel when you create \`allure-results/environment.properties\`. Build it dynamically in a \`@AfterAll\`:

\`\`\`java
@AfterAll
static void writeEnvironment() throws IOException {
    Path file = Paths.get("target/allure-results/environment.properties");
    Files.createDirectories(file.getParent());
    Properties p = new Properties();
    p.setProperty("Browser", Configuration.browser);
    p.setProperty("BrowserVersion", Configuration.browserVersion);
    p.setProperty("BaseUrl", Configuration.baseUrl);
    p.setProperty("Headless", String.valueOf(Configuration.headless));
    try (Writer w = Files.newBufferedWriter(file)) {
        p.store(w, "Selenide environment");
    }
}
\`\`\`

---

## Parametrized Tests and Parameters

Allure captures parameters automatically for JUnit 5 \`@ParameterizedTest\`:

\`\`\`java
@ParameterizedTest(name = "{0} can sign in")
@ValueSource(strings = {"alice", "bob", "charlie"})
@Story("Multiple users can sign in")
void usersCanLogin(String user) {
    open("/login");
    \$("#email").setValue(user + "@example.com");
    \$("#password").setValue("SecurePass123!");
    \$("[type=submit]").click();
    \$(".welcome").shouldBe(visible);
}
\`\`\`

Each parameter value shows up in the report tree.

---

## Generating the Report Locally

After a Maven run:

\`\`\`bash
mvn clean test
mvn allure:report      # generates target/site/allure-maven-plugin
mvn allure:serve       # opens a temporary HTTP server
\`\`\`

Gradle:

\`\`\`bash
./gradlew test
./gradlew allureReport
./gradlew allureServe
\`\`\`

---

## CI Publishing

### GitHub Actions

\`\`\`yaml
- name: Run tests
  run: mvn -B clean test
- name: Allure history
  uses: actions/cache@v4
  with:
    path: target/allure-results/history
    key: allure-history-\${{ github.run_id }}
    restore-keys: allure-history-
- name: Generate Allure report
  uses: simple-elf/allure-report-action@v1
  with:
    allure_results: target/allure-results
    allure_history: allure-history
- name: Publish to GitHub Pages
  uses: peaceiris/actions-gh-pages@v4
  with:
    github_token: \${{ secrets.GITHUB_TOKEN }}
    publish_dir: allure-history
\`\`\`

### Jenkins

Install the Allure Jenkins plugin and add a post-build step:

\`\`\`groovy
post {
    always {
        allure includeProperties: false,
               jdk: '',
               results: [[path: 'target/allure-results']]
    }
}
\`\`\`

---

## Common Pitfalls

- **Missing aspectj weaver.** Symptoms: \`@Step\` methods don't appear. Fix: confirm \`-javaagent\` is on the surefire \`argLine\`.
- **Listener registered too late.** If the listener is added in \`@BeforeEach\`, the first test misses some steps. Use \`@BeforeAll\`.
- **Multiple drivers.** \`AllureSelenide\` listens to Selenide; raw Selenium calls won't appear. Stick to Selenide's API.
- **Big page source.** On heavy SPAs, page source attachments can be megabytes. Trim or disable for stable tests.

---

## Conclusion

Selenide and Allure are designed to coexist. With one listener registration, a working aspect weaver, and a small set of \`@Step\` annotations, you get a production-grade report that any teammate can read. Add screenshots, page source, environment metadata, and a categories file, and your report becomes the first place engineers look when CI turns red.

Once this baseline is in place, every new test you write inherits the reporting for free.
`,
};
