import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Manager Browser Driver Setup Complete Guide 2026',
  description:
    'Master Selenium Manager in 2026. Cover auto-driver detection, browser download, cache locations, offline mode, CI patterns, and the chromedriver replacement story.',
  date: '2026-05-12',
  category: 'Reference',
  content: `
# Selenium Manager Browser Driver Setup Complete Guide 2026

Selenium Manager is the built-in driver and browser manager that ships with Selenium 4.6 and newer. It removes the need for WebDriverManager or manual chromedriver downloads. When you instantiate a WebDriver, Selenium Manager detects your local browser version, downloads the matching driver, caches it, and returns a ready-to-use driver path. The pattern is invisible to most tests: \`new ChromeDriver()\` just works.

This guide covers Selenium Manager end-to-end in 2026. We walk through how it works, configuration options, the cache layout, offline mode for air-gapped environments, the new browser download feature that fetches Chrome itself, behavior with Selenium Grid, CI integration patterns, and the gotchas that bite teams. We also cover migration from WebDriverManager since most established projects still use it. For Grid coverage see [Selenium Grid 4 Docker and Kubernetes](/blog/selenium-grid-4-docker-kubernetes-guide) and the [skills directory](/skills).

## Why Selenium Manager

Three reasons. First, no more dependency on third-party drivers. WebDriverManager from Boni Garcia was the de facto standard for years, but it required a separate library and added a network dependency to your test setup. Selenium Manager is in the official client libraries. Second, browser version matching. Chrome updates every six weeks. ChromeDriver must match Chrome's major version. Manual management was painful; Selenium Manager handles it. Third, CI simplicity. CI runners no longer need pre-installed drivers; Selenium Manager downloads on demand.

The trade-off is the first-run network latency. Selenium Manager downloads the driver on first use, which adds a few seconds. For CI runs that's negligible; for hot-path test development it's manageable with caching.

| Feature | Selenium Manager | WebDriverManager (Boni Garcia) |
|---|---|---|
| Bundled with Selenium | Yes (4.6+) | No (external lib) |
| Auto driver detection | Yes | Yes |
| Auto browser download | Yes (4.16+) | No |
| Cache location | Per-user | Per-user |
| Offline mode | Yes | Partial |
| Language coverage | All Selenium bindings | Java only |
| Maintenance | Selenium project | Boni Garcia |

## How It Works

Selenium Manager is a Rust binary shipped inside each Selenium client library. When your code calls \`new ChromeDriver()\` or equivalent:

1. The client library invokes Selenium Manager.
2. Selenium Manager detects the installed Chrome version via OS-specific commands.
3. It checks the local cache for a matching ChromeDriver.
4. If missing, it downloads the matching driver from googlechromelabs.github.io.
5. It returns the driver path to the client library.
6. The client library spawns the driver process and the WebDriver session begins.

Steps 2 through 4 happen in under a second after first cache. The first cold run takes 5-10 seconds while the driver downloads.

\`\`\`bash
# Default cache locations
# Linux/macOS:
~/.cache/selenium/

# Windows:
%USERPROFILE%\\.cache\\selenium\\
\`\`\`

The cache is keyed by browser, version, and OS-arch. ChromeDriver 122.0.0.0 for Linux x64 lives at:

\`\`\`
~/.cache/selenium/chromedriver/linux64/122.0.0.0/chromedriver
\`\`\`

## Configuration

Most tests need no configuration. For specific needs use Java system properties (other languages have similar mechanisms):

\`\`\`bash
# Set custom cache path
java -Dselenium.cache.path=/var/cache/selenium -jar tests.jar

# Force a specific driver version
java -Dselenium.driver.version=119.0.6045.105 -jar tests.jar

# Skip browser detection (use specified version)
java -Dselenium.browser.version=122 -jar tests.jar

# Set timeout for downloads
java -Dselenium.download.timeout=120 -jar tests.jar

# Proxy for downloads
java -Dselenium.proxy=http://proxy.corp:8080 -jar tests.jar
\`\`\`

In Python you set environment variables:

\`\`\`bash
export SE_CACHE_PATH=/var/cache/selenium
export SE_DRIVER_VERSION=119.0.6045.105
pytest tests/
\`\`\`

The CLI version of Selenium Manager has more options:

\`\`\`bash
# Direct invocation (advanced)
selenium-manager --browser chrome --browser-version 122
# Returns: {"driver_path":"/path/to/chromedriver","browser_path":"/path/to/chrome"}

# List cache contents
selenium-manager --debug
\`\`\`

## Browser Download

As of Selenium 4.16, Selenium Manager can download Chrome itself, not just ChromeDriver. This is huge for CI: you no longer need apt-get install google-chrome or a base image with Chrome.

\`\`\`java
// Java
ChromeOptions options = new ChromeOptions();
options.setBrowserVersion("122");

// Selenium Manager will download Chrome 122 if not installed
WebDriver driver = new ChromeDriver(options);
\`\`\`

\`\`\`python
# Python
options = webdriver.ChromeOptions()
options.browser_version = '122'
driver = webdriver.Chrome(options=options)
\`\`\`

Behind the scenes Selenium Manager fetches Chrome for Testing builds, which are official Google-signed binaries published for testing purposes. They are cached alongside drivers:

\`\`\`
~/.cache/selenium/chrome/linux64/122.0.6261.94/chrome
\`\`\`

This is the right pattern for CI: rely on Selenium Manager for both browser and driver. Your Dockerfile only needs the JDK and your test code.

## Supported Browsers

Selenium Manager supports five browser families in 2026:

| Browser | Driver | Auto-Download |
|---|---|---|
| Chrome | chromedriver | Yes |
| Chromium | chromedriver | Yes |
| Edge | msedgedriver | Yes |
| Firefox | geckodriver | Yes |
| Internet Explorer | IEDriverServer | Yes (Windows only) |
| Safari | safaridriver | Pre-installed only |

Safari is special. It's bundled with macOS and the driver is enabled via \`safaridriver --enable\`. Selenium Manager doesn't download it.

## Offline Mode

For air-gapped environments (banks, regulated workloads) Selenium Manager supports offline mode. Pre-populate the cache and disable network access:

\`\`\`bash
# Pre-populate cache on an online machine
SE_OFFLINE=false java -Dselenium.cache.path=/shared/cache -jar smoke-test.jar

# Bundle the cache into your air-gapped environment
tar czf selenium-cache.tar.gz /shared/cache

# On air-gapped machine
mkdir -p ~/.cache/selenium
tar xzf selenium-cache.tar.gz -C ~/.cache/selenium

# Run with offline mode
SE_OFFLINE=true java -jar tests.jar
\`\`\`

In offline mode Selenium Manager only consults the cache. If a driver is missing, the test fails fast rather than attempting a download.

## CI Integration Patterns

The most common CI patterns:

\`\`\`yaml
# GitHub Actions: minimal setup
name: Selenium Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Cache Selenium cache
        uses: actions/cache@v4
        with:
          path: ~/.cache/selenium
          key: selenium-\${{ runner.os }}-\${{ hashFiles('pom.xml') }}
      - run: mvn test
\`\`\`

The Selenium cache action speeds up subsequent runs by reusing downloaded drivers and browsers. First run is ~30 seconds slower; cached runs are immediate.

For Docker-based CI:

\`\`\`dockerfile
FROM eclipse-temurin:17-jdk

WORKDIR /app
COPY . .

# Pre-populate cache during build
RUN ./mvnw test -DskipTests=false -Dtest=SmokeTest \\
    -Dselenium.cache.path=/opt/selenium-cache

ENV SE_CACHE_PATH=/opt/selenium-cache
ENV SE_OFFLINE=true

CMD ["./mvnw", "test"]
\`\`\`

The pre-populated cache means runtime test execution doesn't need network access. Great for parallel CI runs.

## Behavior with Selenium Grid

When using RemoteWebDriver against a Grid, Selenium Manager does not download drivers. The Grid coordinator and nodes manage their own drivers. Your test code just sends the session request.

\`\`\`java
// Test code (no Selenium Manager involvement)
WebDriver driver = new RemoteWebDriver(
  new URL("http://grid.example.com:4444/wd/hub"),
  new ChromeOptions()
);
\`\`\`

The Selenium node containers (\`selenium/node-chrome:4.27.0\` etc.) come with drivers pre-installed and use them directly. Selenium Manager is not invoked on the nodes either.

For Dynamic Grid (per-session containers) Selenium Manager could be relevant if you build custom node images. The official images skip it.

## Migration from WebDriverManager

Many Java projects use \`io.github.bonigarcia:webdrivermanager\`. Migration is straightforward: remove the dependency and the setup calls.

\`\`\`java
// Before: WebDriverManager setup
import io.github.bonigarcia.wdm.WebDriverManager;

@BeforeAll
static void setupDriver() {
    WebDriverManager.chromedriver().setup();
}

@Test
void example() {
    WebDriver driver = new ChromeDriver();
    // ...
}

// After: nothing
@Test
void example() {
    WebDriver driver = new ChromeDriver();
    // ...
}
\`\`\`

Remove from pom.xml:

\`\`\`xml
<!-- DELETE -->
<dependency>
  <groupId>io.github.bonigarcia</groupId>
  <artifactId>webdrivermanager</artifactId>
  <version>5.6.4</version>
</dependency>
\`\`\`

Selenium Manager runs automatically. WebDriverManager is no longer needed. WebDriverManager still works fine, but for new projects there's no reason to add it.

## Debugging

When something goes wrong, enable Selenium Manager debug logs:

\`\`\`bash
# Java
java -Dselenium.debug=true -jar tests.jar

# Python
import logging
logging.getLogger('selenium.webdriver.common.selenium_manager').setLevel(logging.DEBUG)
\`\`\`

Or invoke the manager directly:

\`\`\`bash
# Locate the binary
find ~/ -name "selenium-manager" 2>/dev/null
# Usually in:
#   ~/.m2/repository/.../selenium-manager-*/selenium-manager
#   site-packages/selenium/webdriver/common/...

# Test it
selenium-manager --browser chrome --debug
\`\`\`

Debug output shows the detected browser version, the chosen driver version, the download URL, and the cache path. 90% of issues are network or proxy related; the debug output identifies which.

## Common Issues

Five things that bite teams:

1. **Corporate proxy not configured.** Selenium Manager respects \`HTTP_PROXY\`/\`HTTPS_PROXY\` env vars and Java \`-Dhttp.proxyHost\`. Configure both.
2. **Cache permission errors.** Container users sometimes can't write to \`~/.cache\`. Set \`SE_CACHE_PATH\` to a writable directory.
3. **Driver version mismatch with browser.** If you specify \`browserVersion=119\` but your installed Chrome is 122, the driver downloaded will be for 119 and the session will fail. Don't pin unnecessarily.
4. **Beta browser channels.** Chrome Beta or Chrome Dev sometimes have driver versions Selenium Manager hasn't indexed. Wait a day or use Chrome Stable.
5. **Network timeout during CI.** Pre-warm cache or use a custom \`SE_CACHE_PATH\` baked into the image.

## Performance Tuning

For high-volume CI a few optimizations help:

\`\`\`yaml
# Pre-warm cache in Docker base image
FROM eclipse-temurin:17-jdk AS warmup
RUN mvn -q dependency:resolve
RUN java -cp lib/* com.example.SeleniumWarmup

# Final image inherits warmed cache
FROM eclipse-temurin:17-jre
COPY --from=warmup ~/.cache/selenium ~/.cache/selenium
\`\`\`

| Optimization | Impact | When |
|---|---|---|
| Pre-warmed cache in image | -10s per cold container | High container churn |
| Cache action in GH Actions | -10s per run | Many runs per day |
| Pinned browser version | Deterministic cache hit | Reproducibility |
| Local mirror for drivers | -5s per cold run | Behind corporate proxy |
| SE_OFFLINE in production | No network calls | Air-gapped environments |

## Conclusion

Selenium Manager is the right default for browser and driver management in 2026. It removes a class of setup complexity from every Selenium project, supports auto browser download, works offline, and integrates with all client libraries. For new projects, just use it. For existing projects with WebDriverManager, migration is a matter of removing a dependency and a few setup calls.

If you are setting up a CI pipeline today, bake a cache pre-warm into your Docker image and skip WebDriverManager entirely. Browse the [skills directory](/skills) for Selenium AI agent skills and read [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide) for distributed test setups.
`,
};
