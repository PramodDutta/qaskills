import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Grid Parallel Testing — Complete Guide 2026',
  description:
    'Master Selenide with Selenium Grid for parallel browser testing. Remote URL, hub-node, cross-browser, Docker, and CI/CD scaling patterns.',
  date: '2026-05-14',
  category: 'Guide',
  content: `
# Selenide Grid Parallel Testing Complete Guide

Running browser tests serially on a single machine is fine for 10 tests, painful for 100, and impossible for 1000+. Selenium Grid solves this by distributing tests across a pool of browser nodes — local, cloud, or Docker — and Selenide integrates with Grid via a single configuration property. Combined with JUnit 5 parallel execution and Docker-based browser nodes, you can run hundreds of tests in minutes instead of hours.

This guide is a comprehensive walkthrough of running Selenide tests against Selenium Grid in 2026. We cover the \`Configuration.remote\` property, Docker-based Selenium Grid setup (Hub + Chrome + Firefox nodes), parallel test execution patterns, cross-browser matrix testing, cloud Grid services (Sauce Labs, BrowserStack, LambdaTest), and CI/CD configuration. Every code sample is working Java with Selenide 7+ and JUnit 5.

---

## Key Takeaways

- **Configuration.remote** points Selenide at a Selenium Grid hub URL
- **Grid 4.x** is the modern Selenium architecture (replaces Grid 3 hub/nodes)
- **JUnit 5 parallel execution** scales tests across grid nodes
- **Docker Selenium** is the easiest way to run a local Grid
- **Cloud Grids** (Sauce Labs, BrowserStack) work with the same Configuration.remote
- **Per-thread driver isolation** is built into Selenide

---

## Local Selenium Grid with Docker

Start a Grid hub plus Chrome and Firefox nodes:

\`\`\`yaml
# docker-compose.yml
version: '3.8'
services:
  selenium-hub:
    image: selenium/hub:4.27.0
    ports:
      - "4442:4442"
      - "4443:4443"
      - "4444:4444"

  chrome:
    image: selenium/node-chrome:4.27.0
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4

  firefox:
    image: selenium/node-firefox:4.27.0
    shm_size: 2gb
    depends_on:
      - selenium-hub
    environment:
      - SE_EVENT_BUS_HOST=selenium-hub
      - SE_EVENT_BUS_PUBLISH_PORT=4442
      - SE_EVENT_BUS_SUBSCRIBE_PORT=4443
      - SE_NODE_MAX_SESSIONS=4
\`\`\`

Start:

\`\`\`bash
docker compose up -d
\`\`\`

Hub is now available at \`http://localhost:4444\`.

---

## Configuring Selenide

\`\`\`java
import com.codeborne.selenide.Configuration;

@BeforeAll
static void setup() {
    Configuration.remote = "http://localhost:4444/wd/hub";
    Configuration.browser = "chrome";
    Configuration.browserSize = "1920x1080";
}
\`\`\`

That's it. Every Selenide command now routes through the Grid.

---

## Cross-Browser Matrix

Run the same test in Chrome and Firefox:

\`\`\`java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class CrossBrowserTest {

    @ParameterizedTest
    @ValueSource(strings = { "chrome", "firefox" })
    void worksInBrowser(String browser) {
        Configuration.browser = browser;
        open("/login");
        $("#email").setValue("a@b.com");
        $("#submit").click();
        $(".dashboard").shouldBe(visible);
    }
}
\`\`\`

JUnit 5 runs the test once per browser.

---

## JUnit 5 Parallel Execution

To run multiple tests in parallel:

\`\`\`properties
# junit-platform.properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.mode.classes.default=concurrent
junit.jupiter.execution.parallel.config.strategy=fixed
junit.jupiter.execution.parallel.config.fixed.parallelism=4
\`\`\`

Selenide handles per-thread driver isolation via thread-local WebDriver instances. Each test thread gets its own browser session from the Grid.

---

## Maven Surefire Parallel

\`\`\`xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-surefire-plugin</artifactId>
  <version>3.5.1</version>
  <configuration>
    <parallel>methods</parallel>
    <threadCount>4</threadCount>
    <useUnlimitedThreads>false</useUnlimitedThreads>
    <forkCount>1</forkCount>
    <reuseForks>true</reuseForks>
  </configuration>
</plugin>
\`\`\`

---

## Cloud Grid: Sauce Labs

\`\`\`java
String username = System.getenv("SAUCE_USERNAME");
String accessKey = System.getenv("SAUCE_ACCESS_KEY");

Configuration.remote = String.format(
    "https://%s:%s@ondemand.saucelabs.com/wd/hub",
    username, accessKey
);
Configuration.browser = "chrome";
\`\`\`

For Sauce-specific options like build name:

\`\`\`java
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.MutableCapabilities;

ChromeOptions chromeOptions = new ChromeOptions();
MutableCapabilities sauceOptions = new MutableCapabilities();
sauceOptions.setCapability("name", "Login Test");
sauceOptions.setCapability("build", "PR-" + System.getenv("BUILD_NUMBER"));
sauceOptions.setCapability("tags", new String[]{ "smoke", "checkout" });
chromeOptions.setCapability("sauce:options", sauceOptions);

Configuration.browserCapabilities = chromeOptions;
\`\`\`

---

## Cloud Grid: BrowserStack

\`\`\`java
String username = System.getenv("BROWSERSTACK_USERNAME");
String accessKey = System.getenv("BROWSERSTACK_ACCESS_KEY");

Configuration.remote = String.format(
    "https://%s:%s@hub-cloud.browserstack.com/wd/hub",
    username, accessKey
);

MutableCapabilities caps = new MutableCapabilities();
caps.setCapability("browserName", "Chrome");
caps.setCapability("browserVersion", "latest");
caps.setCapability("bstack:options", Map.of(
    "os", "Windows",
    "osVersion", "11",
    "buildName", "Build-1",
    "sessionName", "Login Test"
));
Configuration.browserCapabilities = caps;
\`\`\`

---

## Cloud Grid: LambdaTest

\`\`\`java
String username = System.getenv("LT_USERNAME");
String accessKey = System.getenv("LT_ACCESS_KEY");

Configuration.remote = String.format(
    "https://%s:%s@hub.lambdatest.com/wd/hub",
    username, accessKey
);
\`\`\`

---

## CI/CD with Grid: GitHub Actions

\`\`\`yaml
name: cross-browser-tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      selenium-hub:
        image: selenium/hub:4.27.0
        ports:
          - 4444:4444
      chrome:
        image: selenium/node-chrome:4.27.0
        env:
          SE_EVENT_BUS_HOST: selenium-hub
          SE_EVENT_BUS_PUBLISH_PORT: 4442
          SE_EVENT_BUS_SUBSCRIBE_PORT: 4443
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - run: ./mvnw test -Dselenide.remote=http://localhost:4444/wd/hub
\`\`\`

---

## Scaling: How Many Parallel Tests?

| Resource | Effect |
|---|---|
| Hub | Coordinates ~50-100 sessions, low CPU |
| Chrome node | 1 session uses ~1 GB RAM, 1 CPU |
| Firefox node | Similar to Chrome |

For local Docker on a 16 GB machine, 8-12 parallel sessions is comfortable.

In cloud Grids, you typically pay per session-minute, so parallelism is limited by your plan.

---

## Session Timeouts

\`\`\`java
Configuration.pageLoadTimeout = 60_000; // page load
Configuration.browserCapabilities.setCapability("idleTimeout", 90); // sec
\`\`\`

Sauce Labs and BrowserStack have additional session timeouts configured per-capability.

---

## Video Recording on Cloud Grids

Most cloud Grids record video automatically. Selenide doesn't need any special setup — the video URL appears in the cloud dashboard.

For local Docker Selenium, use the video-enabled image:

\`\`\`yaml
chrome:
  image: selenium/node-chrome:4.27.0
chrome-video:
  image: selenium/video:ffmpeg-7.1
  volumes:
    - ./videos:/videos
  depends_on:
    - chrome
  environment:
    - DISPLAY_CONTAINER_NAME=chrome
    - FILE_NAME=chrome-test.mp4
\`\`\`

---

## Per-Test Capabilities

If different tests need different capabilities, use a custom WebDriver provider:

\`\`\`java
import com.codeborne.selenide.WebDriverProvider;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.remote.RemoteWebDriver;

public class MyChromeProvider implements WebDriverProvider {
    @Override
    public WebDriver createDriver(org.openqa.selenium.Capabilities capabilities) {
        ChromeOptions opts = new ChromeOptions();
        opts.setCapability("name", "MyTest");
        try {
            return new RemoteWebDriver(new URL(Configuration.remote), opts);
        } catch (Exception e) { throw new RuntimeException(e); }
    }
}

Configuration.browser = MyChromeProvider.class.getName();
\`\`\`

---

## Common Pitfalls

**Pitfall 1: Browser state between tests.** Sessions are reused unless you call \`Selenide.closeWebDriver()\` between tests. For full isolation, set \`Configuration.holdBrowserOpen = false\` and don't reuse drivers.

**Pitfall 2: Capacity issues.** Running 20 tests against 4 nodes queues up requests. Match parallelism to grid capacity.

**Pitfall 3: Slow first test.** Image pull + node startup can take 30 seconds. Pre-warm in CI.

**Pitfall 4: Stale Configuration.** Setting \`Configuration.remote\` mid-test has no effect on already-running drivers.

**Pitfall 5: Forgotten cleanup.** Cloud Grids charge per session-minute. Ensure drivers quit on test failure.

---

## Conclusion

Selenide + Selenium Grid scales browser testing from minutes to seconds by parallelizing across nodes. Local Docker Grid is great for CI and development; cloud Grids (Sauce, BrowserStack, LambdaTest) extend the matrix to dozens of OS/browser combinations. JUnit 5 parallel execution combined with Selenide's per-thread driver isolation makes the integration almost free.

For complementary patterns, see our [headless guide](/blog/selenide-headless-chromium-firefox-guide) and [Testcontainers Selenium guide](/blog/testcontainers-selenium-grid-guide).

Browse the [QA skills directory](/skills) for related browser automation patterns.
`,
};
