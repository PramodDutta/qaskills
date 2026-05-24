import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testcontainers Selenium Grid — Complete Guide 2026',
  description:
    'Master Testcontainers for Selenium Grid. Run browser tests in Docker with Chrome, Firefox, video recording, and CI/CD patterns.',
  date: '2026-05-05',
  category: 'Guide',
  content: `
# Testcontainers Selenium Grid Complete Guide

Running Selenium browser tests reliably across different machines, operating systems, and browser versions has been a perennial pain point for QA teams. Local Chrome installs drift, Mac M-series chips break older selenium-stand-alone JARs, CI runners may not have a display server, and developers waste hours debugging "works on my machine" failures. Testcontainers solves this by running Selenium browsers in Docker containers, programmatically managed by your test runner, with built-in video recording, a real Chrome or Firefox per test, and one-line setup.

This guide is a hands-on walkthrough of Testcontainers with Selenium for Java in 2026. We cover the BrowserWebDriverContainer module, Chrome and Firefox setup, video recording configuration, headless vs headed mode, network handling for app-under-test access, container reuse, and CI/CD configuration. Every code sample is working Java with JUnit 5 and Selenium 4.

---

## Key Takeaways

- **BrowserWebDriverContainer** provides one-line setup for real Chrome or Firefox in Docker
- **VNC video recording** captures every test run automatically for debugging
- **Network containers** let your test app talk to Selenium without exposing ports
- **Compatible with Selenium 4** WebDriver API and modern locators
- **CI/CD setup is trivial** — no need to install browsers on CI runners

---

## Why Use Testcontainers for Selenium

Local Selenium has three big problems. First, browser drift: your local Chrome updates and breaks tests overnight. Second, CI complexity: every CI runner needs Chrome installed, plus the correct ChromeDriver version, plus xvfb if running headless. Third, "works on my machine": developers find different bugs depending on their local browser version.

Testcontainers fixes all three. The browser version is pinned to a specific image tag. CI doesn't need any browser-related setup beyond Docker. Every developer and every CI run gets exactly the same browser.

---

## Installation

Maven:

\`\`\`xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>1.20.4</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>selenium</artifactId>
  <version>1.20.4</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.seleniumhq.selenium</groupId>
  <artifactId>selenium-java</artifactId>
  <version>4.27.0</version>
  <scope>test</scope>
</dependency>
\`\`\`

Verify Docker.

---

## Your First Test

\`\`\`java
import org.junit.jupiter.api.Test;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.testcontainers.containers.BrowserWebDriverContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertTrue;

@Testcontainers
class GoogleSearchTest {

    @Container
    static BrowserWebDriverContainer<?> CHROME = new BrowserWebDriverContainer<>()
        .withCapabilities(new ChromeOptions());

    @Test
    void searchesGoogle() {
        WebDriver driver = new RemoteWebDriver(CHROME.getSeleniumAddress(), new ChromeOptions());
        try {
            driver.get("https://www.google.com");
            assertTrue(driver.getTitle().contains("Google"));
        } finally {
            driver.quit();
        }
    }
}
\`\`\`

The first run pulls the selenium/standalone-chrome image (about 1 GB). Subsequent runs are fast.

---

## BrowserWebDriverContainer API Reference

| Method | Purpose |
|---|---|
| Constructor (no-arg) | Default image with latest Chrome |
| Constructor with image | Custom image like \`selenium/standalone-firefox:4.27.0\` |
| \`.withCapabilities(options)\` | Pass ChromeOptions or FirefoxOptions |
| \`.withRecordingMode(mode, dir)\` | Record video of test runs |
| \`.withReuse(true)\` | Reuse container across runs |
| \`.withNetwork(network)\` | Join custom network |

After start:

| Method | Returns |
|---|---|
| \`getSeleniumAddress()\` | RemoteWebDriver URL |
| \`getHost()\` | Hostname |
| \`getMappedPort(4444)\` | Selenium port |
| \`getMappedPort(5900)\` | VNC port for live viewing |

---

## Video Recording

This is the killer feature. Record every test, save failures:

\`\`\`java
import org.testcontainers.containers.BrowserWebDriverContainer.VncRecordingMode;
import java.io.File;

@Container
static BrowserWebDriverContainer<?> CHROME = new BrowserWebDriverContainer<>()
    .withCapabilities(new ChromeOptions())
    .withRecordingMode(VncRecordingMode.RECORD_FAILING, new File("./videos"));
\`\`\`

Modes:

| Mode | Behavior |
|---|---|
| \`RECORD_ALL\` | Record every test |
| \`RECORD_FAILING\` | Only record tests that fail |
| \`SKIP\` | No recording (default) |

Videos are saved as FLV format with timestamps in filenames.

---

## Firefox Setup

\`\`\`java
import org.openqa.selenium.firefox.FirefoxOptions;

@Container
static BrowserWebDriverContainer<?> FIREFOX = new BrowserWebDriverContainer<>(
    DockerImageName.parse("selenium/standalone-firefox:4.27.0")
).withCapabilities(new FirefoxOptions());
\`\`\`

The two-argument constructor takes a specific image tag.

---

## Testing Your App: Network Bridge Pattern

When your application runs in another container or on the host, Selenium needs to reach it. The cleanest pattern is to put both on a shared network:

\`\`\`java
import org.testcontainers.containers.Network;

static Network network = Network.newNetwork();

@Container
static GenericContainer<?> APP = new GenericContainer<>("my-app:latest")
    .withNetwork(network)
    .withNetworkAliases("app")
    .withExposedPorts(8080);

@Container
static BrowserWebDriverContainer<?> CHROME = new BrowserWebDriverContainer<>()
    .withCapabilities(new ChromeOptions())
    .withNetwork(network);

@Test
void testsApp() {
    WebDriver driver = new RemoteWebDriver(CHROME.getSeleniumAddress(), new ChromeOptions());
    driver.get("http://app:8080");  // Selenium reaches app via network alias
}
\`\`\`

For Spring Boot tests with @LocalServerPort, use Testcontainers' \`Testcontainers.exposeHostPorts\`:

\`\`\`java
@LocalServerPort
private int port;

@BeforeEach
void setup() {
    org.testcontainers.Testcontainers.exposeHostPorts(port);
}

@Test
void test() {
    driver.get("http://host.testcontainers.internal:" + port);
}
\`\`\`

\`host.testcontainers.internal\` is a special hostname that Selenium can use to reach the host.

---

## Live Debugging with VNC

Connect a VNC viewer to watch tests run in real time:

\`\`\`java
System.out.println("VNC: vnc://localhost:" + CHROME.getMappedPort(5900));
\`\`\`

Use a VNC client like RealVNC or Remmina. Useful for debugging flaky tests.

---

## Per-Test vs Per-Class Container

By default, with \`@Container static\`, the container is shared across all tests in the class. To get a fresh browser per test:

\`\`\`java
@Container
BrowserWebDriverContainer<?> chrome = new BrowserWebDriverContainer<>();
\`\`\`

(Drop the \`static\` keyword.) This is slower but provides full isolation. For most tests, per-class is fine because each test can quit and recreate the WebDriver.

---

## Selenide Integration

Selenide users can configure remote URL:

\`\`\`java
import com.codeborne.selenide.Configuration;

@BeforeAll
static void setup() {
    Configuration.remote = CHROME.getSeleniumAddress().toString();
    Configuration.browser = "chrome";
}
\`\`\`

Selenide then uses the Testcontainers Chrome for all \`open()\` calls.

---

## Headless vs Headed

Testcontainers Chrome runs headed inside the container (with a virtual display). You can also force headless:

\`\`\`java
ChromeOptions options = new ChromeOptions();
options.addArguments("--headless=new");

@Container
static BrowserWebDriverContainer<?> CHROME = new BrowserWebDriverContainer<>()
    .withCapabilities(options);
\`\`\`

Headed is slightly slower but matches production user behavior more closely.

---

## Container Reuse

\`\`\`java
@Container
static BrowserWebDriverContainer<?> CHROME = new BrowserWebDriverContainer<>()
    .withCapabilities(new ChromeOptions())
    .withReuse(true);
\`\`\`

Enable in \`~/.testcontainers.properties\`:

\`\`\`
testcontainers.reuse.enable=true
\`\`\`

---

## CI/CD Configuration

\`\`\`yaml
name: test
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
          name: selenium-videos
          path: videos/
\`\`\`

The upload-artifact step captures recorded videos when tests fail.

---

## Common Pitfalls

**Stale WebDriver references.** Each test should create a fresh WebDriver and quit it in @AfterEach. Reusing WebDriver across tests causes state leakage.

**Window size.** Containers default to 1360x1020. Tests for mobile layouts need explicit window resizing.

**Network connectivity.** If your app is on the host, use \`host.testcontainers.internal\` not \`localhost\`.

**Image size.** Selenium images are 1+ GB. Cache aggressively in CI.

**Browser version drift.** Pin to specific tags like \`selenium/standalone-chrome:4.27.0\` not \`latest\`.

---

## Conclusion

Testcontainers with Selenium fixes the worst pain points of browser testing. Pinned browser versions, no CI installation overhead, automatic video recording, easy network setup, and consistent behavior across machines. For Java teams running browser tests in 2026, this is the right default.

Explore the [QA skills directory](/skills) for related browser automation patterns, or read our [Selenide vs Selenium guide](/blog/selenide-vs-selenium-webdriver-2026) for an alternative Java browser automation library.
`,
};
