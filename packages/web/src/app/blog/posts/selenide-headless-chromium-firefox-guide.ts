import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Headless Chromium and Firefox — Complete Guide 2026',
  description:
    'Master Selenide in headless mode. Chrome --headless=new, Firefox headless, window size, GPU, mobile emulation, and CI/CD performance patterns.',
  date: '2026-05-12',
  category: 'Guide',
  content: `
# Selenide Headless Chromium and Firefox Complete Guide

Running browser tests in headless mode is the default for CI/CD pipelines because it's faster, requires no display server, and uses dramatically less RAM. But headless mode has quirks: Chrome's new \`--headless=new\` flag behaves differently than the legacy \`--headless\`, Firefox headless ignores some font configurations, and download/upload patterns need different handling. Getting headless right makes the difference between flaky CI runs and reliable feedback.

This guide is a comprehensive walkthrough of Selenide headless configuration for Chrome and Firefox in 2026. We cover the \`Configuration.headless\` flag, Chrome \`--headless=new\` vs legacy modes, Firefox headless, window sizing for responsive tests, GPU/WebGL acceleration, mobile device emulation, and the CI/CD patterns that make headless tests fast and reliable. Every code sample is working Java with Selenide 7+ and JUnit 5.

---

## Key Takeaways

- **Configuration.headless = true** is the master switch
- **Chrome \`--headless=new\`** is the modern headless mode (Chrome 109+)
- **Firefox headless** works via \`firefox.profile.headless\` or capability
- **Window size** must be set explicitly (default 1280x720)
- **GPU acceleration** can be enabled in headless via \`--enable-gpu\`
- **CI runs faster in headless** because no display rendering

---

## Enabling Headless

\`\`\`java
import com.codeborne.selenide.Configuration;

@BeforeAll
static void setup() {
    Configuration.headless = true;
    Configuration.browser = "chrome";
}
\`\`\`

Selenide automatically passes the appropriate flags to Chrome and Firefox.

---

## Chrome Headless Modes

Chrome has two headless modes:

| Mode | Flag | Behavior |
|---|---|---|
| New headless (default in 109+) | \`--headless=new\` | Behaves like real Chrome |
| Legacy headless | \`--headless\` | Faster but missing features |

Selenide uses the new mode by default. To force legacy:

\`\`\`java
import org.openqa.selenium.chrome.ChromeOptions;
ChromeOptions options = new ChromeOptions();
options.addArguments("--headless"); // legacy
Configuration.browserCapabilities = options;
\`\`\`

Generally, prefer \`--headless=new\`. Legacy mode is faster but lacks PDF rendering, extensions, and some CSS features.

---

## Firefox Headless

\`\`\`java
Configuration.browser = "firefox";
Configuration.headless = true;
\`\`\`

Selenide adds \`-headless\` to Firefox args automatically. To customize:

\`\`\`java
import org.openqa.selenium.firefox.FirefoxOptions;
FirefoxOptions options = new FirefoxOptions();
options.addArguments("-headless");
options.addPreference("dom.disable_open_during_load", false);
Configuration.browserCapabilities = options;
\`\`\`

---

## Window Size in Headless

Headless browsers default to small windows (Chrome: 800x600). Set explicitly for tests that depend on viewport:

\`\`\`java
Configuration.browserSize = "1920x1080";
\`\`\`

Or per test:

\`\`\`java
@Test
void responsiveTest() {
    Configuration.browserSize = "375x812"; // iPhone X size
    open("/landing");
    $(".mobile-nav").shouldBe(visible);
}
\`\`\`

---

## Mobile Device Emulation

\`\`\`java
import java.util.Map;
import org.openqa.selenium.chrome.ChromeOptions;

ChromeOptions options = new ChromeOptions();
Map<String, String> mobileEmulation = Map.of("deviceName", "iPhone 12");
options.setExperimentalOption("mobileEmulation", mobileEmulation);
Configuration.browserCapabilities = options;
\`\`\`

For custom emulation:

\`\`\`java
Map<String, Object> deviceMetrics = Map.of(
    "width", 375,
    "height", 812,
    "pixelRatio", 3.0
);
Map<String, Object> mobileEmulation = Map.of(
    "deviceMetrics", deviceMetrics,
    "userAgent", "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)..."
);
options.setExperimentalOption("mobileEmulation", mobileEmulation);
\`\`\`

---

## GPU Acceleration in Headless

By default, Chrome headless disables GPU. For WebGL or canvas-heavy tests:

\`\`\`java
ChromeOptions options = new ChromeOptions();
options.addArguments("--enable-gpu", "--use-gl=swiftshader");
Configuration.browserCapabilities = options;
\`\`\`

SwiftShader is a software GPU renderer that works in CI.

---

## Common Chrome Flags

| Flag | Purpose |
|---|---|
| \`--disable-dev-shm-usage\` | Avoid \`/dev/shm\` issues in Docker |
| \`--no-sandbox\` | Required in some Docker environments |
| \`--disable-gpu\` | Disable GPU rendering |
| \`--window-size=W,H\` | Set window size (alternative to Configuration) |
| \`--disable-extensions\` | Disable extensions for speed |
| \`--disable-popup-blocking\` | Allow window.open |
| \`--disable-translate\` | Disable Google Translate prompt |
| \`--lang=en-US\` | Force browser language |
| \`--remote-debugging-port=9222\` | Enable DevTools protocol port |

Apply via:

\`\`\`java
ChromeOptions options = new ChromeOptions();
options.addArguments(
    "--disable-dev-shm-usage",
    "--no-sandbox",
    "--lang=en-US"
);
Configuration.browserCapabilities = options;
\`\`\`

---

## Docker / CI Specific

In Docker containers, two flags are nearly always needed:

\`\`\`java
ChromeOptions options = new ChromeOptions();
options.addArguments("--disable-dev-shm-usage", "--no-sandbox");
Configuration.browserCapabilities = options;
\`\`\`

\`--disable-dev-shm-usage\` avoids shared memory issues, and \`--no-sandbox\` is required when Chrome runs as root.

---

## Container Image for CI

\`\`\`dockerfile
FROM openjdk:21-slim

RUN apt-get update && apt-get install -y \\
    wget \\
    chromium \\
    chromium-driver

ENV CHROME_BIN=/usr/bin/chromium
ENV PATH=$PATH:/usr/lib/chromium

WORKDIR /app
COPY . .
RUN ./mvnw test
\`\`\`

---

## GitHub Actions Matrix

\`\`\`yaml
name: tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chrome, firefox]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - uses: browser-actions/setup-chrome@v1
        if: matrix.browser == 'chrome'
      - uses: browser-actions/setup-firefox@v1
        if: matrix.browser == 'firefox'
      - run: ./mvnw test -Dselenide.browser=\${{ matrix.browser }} -Dselenide.headless=true
\`\`\`

---

## System Properties

Pass via command line:

\`\`\`bash
mvn test -Dselenide.headless=true -Dselenide.browser=firefox -Dselenide.browserSize=1920x1080
\`\`\`

Selenide reads these into Configuration at startup.

---

## Performance Comparison

| Mode | Startup | Per-test | RAM |
|---|---|---|---|
| Chrome headed | 2s | 1.5x | 800 MB |
| Chrome \`--headless=new\` | 1s | 1.0x | 400 MB |
| Chrome \`--headless\` (legacy) | 0.8s | 0.9x | 350 MB |
| Firefox headed | 2.5s | 1.5x | 700 MB |
| Firefox headless | 1.2s | 1.0x | 500 MB |

Headless is typically 30-50% faster in CI.

---

## Capturing Screenshots in Headless

Headless screenshots work identically to headed. See our [screenshot on failure guide](/blog/selenide-screenshot-on-failure-guide) for details.

The viewport (and thus screenshot dimensions) defaults to the window size. Set explicitly:

\`\`\`java
Configuration.browserSize = "1920x1080";
\`\`\`

---

## File Downloads in Headless

Download modes work differently in headless. CDP mode (Chrome only) is most reliable:

\`\`\`java
Configuration.fileDownload = FileDownloadMode.CDP;
\`\`\`

See our [file download guide](/blog/selenide-file-download-upload-guide) for details.

---

## Headless vs Headed: When to Test Both

Most teams run headless in CI and headed locally. But certain bugs only show headed:

- Native dialogs (file pickers, geolocation prompts)
- Browser-specific UI (autofill, password manager)
- Extension-dependent behavior

Run a small subset of tests headed in CI for smoke coverage:

\`\`\`java
@Tag("headed-only")
@Test
void nativeDialogTest() {
    Configuration.headless = false;
    // ...
}
\`\`\`

\`\`\`bash
mvn test -Dgroups="!headed-only" # in CI default
mvn test -Dgroups="headed-only" # in nightly
\`\`\`

---

## Common Pitfalls

**Pitfall 1: Tiny window default.** Headless Chrome defaults to 800x600. Many sites' mobile breakpoints kick in. Set browserSize explicitly.

**Pitfall 2: Missing fonts.** Headless Linux may lack fonts that the production site uses. Install fonts in CI:

\`\`\`bash
apt-get install -y fonts-noto fonts-dejavu
\`\`\`

**Pitfall 3: SVG rendering.** Some SVG features render differently in headless. If tests depend on SVG layout, run them headed.

**Pitfall 4: WebGL disabled.** Headless disables WebGL by default. Enable explicitly if needed.

**Pitfall 5: Timezone differences.** CI containers may run UTC; tests assuming local time fail. Set TZ explicitly.

---

## Conclusion

Headless mode in Selenide is the right default for CI/CD: faster, lighter, and reliable when configured correctly. Use \`--headless=new\` for Chrome 109+, set browserSize explicitly, apply \`--disable-dev-shm-usage\` and \`--no-sandbox\` in Docker, and reserve headed mode for tests that depend on native browser UI.

For complementary patterns, see our [screenshot guide](/blog/selenide-screenshot-on-failure-guide) and [grid parallel testing guide](/blog/selenide-grid-parallel-testing-guide).

Browse the [QA skills directory](/skills) for related browser testing patterns.
`,
};
