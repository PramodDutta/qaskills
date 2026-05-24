import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Screenshot on Failure — Complete Guide 2026',
  description:
    'Master Selenide screenshots on test failure. Configuration, custom paths, page source capture, Allure integration, and CI/CD artifact upload.',
  date: '2026-05-11',
  category: 'Guide',
  content: `
# Selenide Screenshot on Failure Complete Guide

When a browser test fails in CI at 3am, the first thing every engineer wants is a screenshot of what the page looked like at the moment of failure. Selenide automates this completely — out of the box, every failed assertion produces a PNG screenshot, an HTML page source dump, and a console log line pointing to the file path. This is one of the most powerful Selenide features, yet many teams never go beyond the defaults. This guide walks through every aspect of screenshot configuration, from default behavior to custom screenshot strategies, Allure integration, and CI/CD artifact upload patterns.

We cover the \`screenshots\` configuration flag, custom \`reportsFolder\` paths, page source capture, manual screenshot APIs, the \`Screenshots\` utility class, integration with Allure for inline screenshot rendering, and the GitHub Actions / GitLab CI patterns that publish failure screenshots as build artifacts. Every code sample is working Java with Selenide 7+ and JUnit 5.

---

## Key Takeaways

- **Selenide auto-captures screenshots on every \`should\` failure** — no setup required
- **Configuration.screenshots** is the master toggle (default true)
- **Configuration.savePageSource** captures HTML alongside (default true)
- **Configuration.reportsFolder** controls where files are saved (default \`build/reports/tests\`)
- **Manual screenshots** via \`Selenide.screenshot()\` work mid-test
- **Allure integration** embeds screenshots into HTML reports
- **CI artifact upload** is one extra step in GitHub Actions / GitLab CI

---

## Default Behavior

Out of the box, every test that fails on a Selenide assertion produces:

1. A PNG screenshot named \`screenshotN.png\`
2. An HTML page source named \`pageN.html\`
3. A console log line: \`Screenshot: file:/path/to/screenshot.png\`

The files go to \`build/reports/tests/<test_class>/<test_method>/\` by default (configurable).

\`\`\`java
@Test
void loginShows() {
    open("/login");
    $("#email").shouldBe(visible);
    $("#missing").shouldBe(visible); // FAILS - screenshot taken
}
\`\`\`

---

## Configuration Options

\`\`\`java
import com.codeborne.selenide.Configuration;

@BeforeAll
static void setup() {
    Configuration.screenshots = true; // default true
    Configuration.savePageSource = true; // default true
    Configuration.reportsFolder = "build/reports/tests";
    Configuration.reportsUrl = "https://ci.example.com/job/123/artifacts/"; // for log links
}
\`\`\`

| Property | Default | Purpose |
|---|---|---|
| \`screenshots\` | true | Take screenshot on failure |
| \`savePageSource\` | true | Save HTML on failure |
| \`reportsFolder\` | \`build/reports/tests\` | Where to save |
| \`reportsUrl\` | null | Override URL in console output |
| \`fastSetValue\` | false | Affects screenshot timing on input |

---

## Disabling Screenshots

For tests that don't need them (e.g., pure API tests using Selenide for setup):

\`\`\`java
Configuration.screenshots = false;
Configuration.savePageSource = false;
\`\`\`

---

## Custom Reports Folder

Per-test class:

\`\`\`java
@BeforeAll
static void setup() {
    Configuration.reportsFolder = "target/test-reports/" + System.currentTimeMillis();
}
\`\`\`

Or per system property:

\`\`\`bash
mvn test -Dselenide.reportsFolder=target/screenshots
\`\`\`

---

## Manual Screenshot API

For taking screenshots at any point, not just on failure:

\`\`\`java
import com.codeborne.selenide.Selenide;

@Test
void documentsFlow() {
    open("/home");
    Selenide.screenshot("home-loaded");

    $(".nav .products").click();
    Selenide.screenshot("products-page");
}
\`\`\`

The \`screenshot(name)\` method returns the absolute path to the saved file:

\`\`\`java
String path = Selenide.screenshot("checkout");
System.out.println("Saved to: " + path);
\`\`\`

---

## Element Screenshots

You can screenshot a specific element:

\`\`\`java
import com.codeborne.selenide.commands.TakeScreenshot;
import java.io.File;

File elementShot = $(".product-card").screenshot();
\`\`\`

Useful for visual regression testing of single components.

---

## The Screenshots Utility Class

\`\`\`java
import com.codeborne.selenide.Screenshots;

// Get the last automatic screenshot
File lastScreen = Screenshots.getLastScreenshot();

// Print all screenshots from this test
Screenshots.startContext("my-test");
// ... tests run, screenshots accumulate
List<File> all = Screenshots.finishContext();
\`\`\`

---

## Allure Integration

For rich HTML reports with embedded screenshots:

\`\`\`java
import com.codeborne.selenide.logevents.SelenideLogger;
import io.qameta.allure.selenide.AllureSelenide;

@BeforeAll
static void setupAllure() {
    SelenideLogger.addListener("allure", new AllureSelenide()
        .screenshots(true)
        .savePageSource(true)
        .includeSelenideSteps(true)
    );
}
\`\`\`

With Allure, every failed step shows a thumbnail screenshot inline, with click-to-expand to full size. The page source is also attached as a downloadable HTML file.

See our [AllureSelenide includeSelenideSteps reference](/blog/selenide-allureselenide-includeselenidesteps-reference) for deeper coverage.

---

## CI Artifact Upload: GitHub Actions

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
        if: failure()
        with:
          name: screenshots
          path: build/reports/tests/**/*.png
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: page-sources
          path: build/reports/tests/**/*.html
\`\`\`

The \`if: failure()\` ensures uploads only happen when tests fail.

---

## CI Artifact Upload: GitLab CI

\`\`\`yaml
test:
  image: openjdk:21
  script:
    - ./mvnw test
  artifacts:
    when: on_failure
    paths:
      - build/reports/tests/
    expire_in: 1 week
\`\`\`

---

## CI Artifact Upload: Jenkins

\`\`\`groovy
post {
    failure {
        archiveArtifacts artifacts: 'build/reports/tests/**/*', allowEmptyArchive: true
    }
}
\`\`\`

---

## Visual Regression Pattern

For visual regression tests, combine Selenide's element screenshots with a diff library like aShot or applitools:

\`\`\`java
import io.qameta.allure.Attachment;

@Test
void checkoutLooksRight() {
    open("/checkout");
    File current = $(".checkout-form").screenshot();
    File baseline = new File("baselines/checkout-form.png");

    BufferedImage diff = ImageComparison.compare(baseline, current);
    if (!ImageComparison.isMatch(diff)) {
        attach(diff);
        fail("Visual regression detected");
    }
}

@Attachment(value = "diff", type = "image/png")
byte[] attach(BufferedImage img) {
    try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
        ImageIO.write(img, "png", baos);
        return baos.toByteArray();
    } catch (Exception e) { return new byte[0]; }
}
\`\`\`

---

## Naming Strategy

By default, screenshots are named \`screenshot1.png\`, \`screenshot2.png\`, etc. This is unhelpful when you have 100 failures. Override the naming:

\`\`\`java
import com.codeborne.selenide.impl.DefaultFileNamer;

Configuration.fileNamer = new DefaultFileNamer() {
    @Override
    public String generateFileName() {
        return System.currentTimeMillis() + "_" + Thread.currentThread().getName();
    }
};
\`\`\`

Or use Allure which names screenshots after the step that failed.

---

## Headless vs Headed Considerations

In headless mode, screenshots are taken from the virtual viewport. By default this is 1280x800 in Chrome headless. To match production user behavior, set the window size:

\`\`\`java
Configuration.browserSize = "1920x1080";
\`\`\`

---

## Debugging Locally with Screenshots

When debugging a flaky test locally, sprinkle manual screenshots throughout to understand state changes:

\`\`\`java
@Test
void flaky() {
    open("/login");
    Selenide.screenshot("01-page-loaded");

    $("#email").setValue("a@b.com");
    Selenide.screenshot("02-email-entered");

    $("#password").setValue("secret");
    Selenide.screenshot("03-password-entered");

    $("#submit").click();
    Selenide.screenshot("04-after-submit");
}
\`\`\`

Then inspect the directory after the run.

---

## Common Pitfalls

**Pitfall 1: Disk fills up in CI.** Long-running CI jobs accumulate screenshots. Set retention to 1 week or less.

**Pitfall 2: Screenshots fail silently.** If the browser session has died, screenshot capture throws. Wrap critical assertions in try/catch.

**Pitfall 3: Lazy SelenideElement screenshot before page loads.** Element screenshots require the element exist. Call \`shouldBe(visible)\` first.

**Pitfall 4: Reports folder permissions.** In Docker-based CI, ensure the folder is writable by the test user.

**Pitfall 5: Conflict with Selenium screenshot listener.** Don't register your own ScreenshotTakingListener — Selenide already has one.

---

## Conclusion

Selenide's automatic screenshot-on-failure is one of the highest-ROI features in browser testing. Combined with page source capture, Allure integration, and CI artifact upload, it turns a 3am debugging mystery into a click-through investigation. Customize the reports folder, use Allure for rich reports, and ensure CI uploads artifacts on failure.

For complementary patterns, see our [AllureSelenide reference](/blog/selenide-allureselenide-includeselenidesteps-reference) and [headless Chromium guide](/blog/selenide-headless-chromium-firefox-guide).

Browse the [QA skills directory](/skills) for related browser testing patterns.
`,
};
