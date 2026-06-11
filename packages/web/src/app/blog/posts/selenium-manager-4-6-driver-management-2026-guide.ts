import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium Manager 4.6+ Driver Management 2026 Guide',
  description:
    'Selenium Manager 4.6+ guide to automatic driver management: version resolution, the ~/.cache/selenium cache, offline mode, proxy config, the CLI, and CI setup.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# Selenium Manager 4.6+ Driver Management 2026 Guide

For most of Selenium's history, getting a test to run meant a frustrating preamble: download the right ChromeDriver, match it to your installed Chrome version, put it on your PATH or point a system property at it, and repeat the whole dance every time Chrome auto-updated. Teams leaned on third-party tools like WebDriverManager to automate this, but that was an external dependency you had to add, version, and trust. Selenium 4.6 changed the game by shipping Selenium Manager — a built-in, zero-configuration driver manager written in Rust and bundled inside the Selenium bindings themselves. From 4.6 onward, if you do nothing at all, Selenium figures out which browser you have, downloads the exactly matching driver, caches it, and runs your test.

Selenium Manager is the official answer to "driver hell." It runs automatically and silently whenever Selenium cannot find a usable driver on your system. It detects the installed browser version, resolves the correct driver version, downloads it from the official endpoints, stores it in a shared cache, and hands the path back to the binding — all without a single line of setup code. Because it ships inside Selenium, there is no extra dependency to manage and no version skew between your driver manager and your Selenium release. If a driver is already cached and valid, it is reused; if your browser updates, Selenium Manager quietly fetches the new matching driver on the next run.

This guide is a complete, runnable reference to Selenium Manager 4.6+ for 2026. We cover how it replaces WebDriverManager, how it resolves browser and driver versions, the cache layout under \`~/.cache/selenium\`, offline mode, proxy configuration, forcing specific browser versions, the standalone \`selenium-manager\` CLI, debugging with verbose logs, and best practices for CI. Examples are given for Java, Python, and the CLI. If you searched for "selenium manager 4.6 driver management," this is your reference. For more automation depth, explore the [skills directory](/skills) and our [WebDriver BiDi reference](/blog/selenium-webdriver-bidi-2026-official-reference).

## What Selenium Manager Does and When It Runs

Selenium Manager is a command-line binary bundled with every Selenium 4.6+ language binding. The binding does not call it on every run — it calls it as a fallback. When you create a driver, Selenium first looks for a usable driver: one you configured explicitly via a system property or PATH. If it finds one, Selenium Manager never runs. If it does not, the binding shells out to the bundled \`selenium-manager\` binary, which detects your browser, resolves and downloads the matching driver, and returns the path.

This "only when needed" design means Selenium Manager is invisible in the happy path and a safety net otherwise. The simplest possible test in 4.6+ needs no driver setup whatsoever.

\`\`\`java
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

public class NoSetupNeeded {
  public static void main(String[] args) {
    // No System.setProperty, no WebDriverManager — Selenium Manager handles it
    WebDriver driver = new ChromeDriver();
    driver.get("https://www.selenium.dev");
    System.out.println(driver.getTitle());
    driver.quit();
  }
}
\`\`\`

\`\`\`python
from selenium import webdriver

# No executable_path, no third-party manager — Selenium Manager resolves the driver
driver = webdriver.Chrome()
driver.get("https://www.selenium.dev")
print(driver.title)
driver.quit()
\`\`\`

Both examples download and cache the correct driver automatically on first run, then reuse it afterward.

## Selenium Manager vs WebDriverManager

WebDriverManager (the popular library by Boni García) pioneered automatic driver resolution for the JVM and is still excellent, but Selenium Manager now covers the core use case natively for every language binding. The key difference: Selenium Manager is built in and language-agnostic, while WebDriverManager is a separate Java dependency with a richer feature set.

| Aspect | WebDriverManager | Selenium Manager |
|---|---|---|
| Distribution | External Maven dependency | Bundled in Selenium 4.6+ |
| Languages | Java (primary) | All bindings (Java, Python, .NET, Ruby, JS) |
| Setup code | \`WebDriverManager.chromedriver().setup();\` | None — automatic fallback |
| Browser version detection | Yes | Yes |
| Driver download + cache | Yes | Yes |
| Browser download (Chrome for Testing) | Yes | Yes |
| Extra advanced features | Docker, version history, more | Focused on core resolution |
| Maintenance burden | You version the dependency | Ships with Selenium |

For most teams in 2026, Selenium Manager removes the need for WebDriverManager entirely. Keep WebDriverManager only if you rely on a feature Selenium Manager does not yet cover. If you migrate, delete the dependency and remove every \`WebDriverManager.xxxdriver().setup()\` call — they are no longer needed.

## How Version Resolution Works

Selenium Manager resolves drivers in a deterministic sequence. First it discovers the installed browser and its exact version (for example Chrome 126.0.6478.x) by probing standard install locations and reading version metadata. Then it maps that browser version to the correct driver version using the official version data published by the browser vendors. Finally it downloads that driver from the official endpoints — Chrome for Testing for Chromium-family drivers, and the vendor endpoints for GeckoDriver (Firefox) and EdgeDriver.

If Selenium Manager cannot find a browser, it can also download a matching browser binary (Chrome for Testing) so the test can still run. The whole chain — detect browser, resolve driver, download, cache — happens in milliseconds when cached and seconds on a cold first run.

\`\`\`bash
# See exactly what Selenium Manager resolves for your system
selenium-manager --browser chrome --debug
\`\`\`

The output shows the detected browser version, the resolved driver version, and where each binary was found or downloaded — invaluable when a CI machine resolves something different from your laptop.

## The Selenium Manager Cache

Downloaded drivers and browsers are stored in a shared cache so they are fetched once and reused across projects and runs. By default the cache lives at \`~/.cache/selenium\` on Linux and macOS, and \`%USERPROFILE%\\.cache\\selenium\` on Windows. Inside, drivers and browsers are organized by type and version.

\`\`\`text
~/.cache/selenium/
  chromedriver/
    linux64/
      126.0.6478.126/
        chromedriver
  geckodriver/
    linux64/
      0.34.0/
        geckodriver
  chrome/
    linux64/
      126.0.6478.126/
        chrome
  selenium-manager.json   # cached metadata + TTL for resolution
\`\`\`

Selenium Manager caches not just binaries but also the resolution metadata, with a time-to-live, so it does not hit the network on every single run. If the cache holds a valid driver for your browser version and the metadata is still fresh, no download happens at all. You can relocate the cache with the \`SE_CACHE_PATH\` environment variable, which is the standard approach for sharing a warm cache across CI jobs.

## Offline Mode

In locked-down or air-gapped environments you may need Selenium Manager to never reach the network. Offline mode tells it to use only what is already cached and to fail clearly rather than attempting a download. Combine it with a pre-warmed cache that you populate during image build or a one-time online run.

\`\`\`bash
# Pre-warm the cache once (online), then ship the cache into the offline environment
SE_CACHE_PATH=/opt/selenium-cache selenium-manager --browser chrome --driver-version 126.0.6478.126

# In the offline environment, force offline resolution from that cache
SE_OFFLINE=true SE_CACHE_PATH=/opt/selenium-cache selenium-manager --browser chrome --offline
\`\`\`

In code, set the same environment variables before creating the driver. With \`SE_OFFLINE=true\`, if the matching driver is not already cached, the run fails fast with a clear message instead of hanging on a blocked network request.

## Proxy Configuration

Behind a corporate proxy, Selenium Manager needs to know how to reach the download endpoints. It respects the standard \`HTTPS_PROXY\` / \`HTTP_PROXY\` environment variables, and also accepts a \`--proxy\` flag on the CLI and an \`SE_HTTP_PROXY\` setting. Point it at your proxy and it will route driver and browser downloads through it.

\`\`\`bash
# Via standard proxy env vars
export HTTPS_PROXY=http://proxy.corp.example:8080
selenium-manager --browser chrome

# Or explicitly on the CLI
selenium-manager --browser chrome --proxy http://proxy.corp.example:8080
\`\`\`

\`\`\`python
import os
from selenium import webdriver

# Set the proxy before the driver is created so Selenium Manager picks it up
os.environ["HTTPS_PROXY"] = "http://proxy.corp.example:8080"

driver = webdriver.Chrome()
driver.get("https://www.selenium.dev")
driver.quit()
\`\`\`

If downloads fail behind a proxy, run the CLI with \`--debug\` to confirm the proxy is being applied to the outbound requests.

## Forcing a Specific Browser or Driver Version

Sometimes you must pin versions — to reproduce a bug on an older Chrome, or to match a fixed browser image in CI. Selenium Manager lets you force a browser version, and it will resolve and download the matching driver for that version (downloading the browser too, if needed, via Chrome for Testing).

\`\`\`bash
# Force a specific Chrome version; the matching driver is resolved automatically
selenium-manager --browser chrome --browser-version 125

# Or pin the driver version directly
selenium-manager --driver chromedriver --driver-version 125.0.6422.141
\`\`\`

In Java, set the desired browser version through the browser options; Selenium Manager reads it and resolves accordingly.

\`\`\`java
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

ChromeOptions options = new ChromeOptions();
options.setBrowserVersion("125");          // pin the browser version
options.addArguments("--headless=new");
ChromeDriver driver = new ChromeDriver(options);
driver.get("https://www.selenium.dev");
driver.quit();
\`\`\`

Pinning is the reliable way to keep CI deterministic when you do not want browser auto-updates to silently change what your tests run against.

## The selenium-manager CLI

Selenium Manager is a standalone binary you can invoke directly, which is the best way to debug resolution and pre-warm caches. The binary ships inside the Selenium package; locate it under your installation's manager directory, or call it through the Python helper. Its core job is to print the resolved driver (and browser) paths as machine-readable output the bindings consume.

\`\`\`bash
# Print version
selenium-manager --version

# Resolve a Chrome driver and emit the result as JSON
selenium-manager --browser chrome --output json

# Resolve a Firefox driver with debug logging
selenium-manager --browser firefox --debug

# Clear stale metadata by clearing the cache (then it re-resolves)
selenium-manager --clear-cache
\`\`\`

\`\`\`python
# Locate the bundled binary from Python
from selenium.webdriver.common.selenium_manager import SeleniumManager

path = SeleniumManager()._get_binary()
print("selenium-manager binary:", path)
\`\`\`

Running the CLI by hand answers the most common question in driver debugging: "what driver does Selenium actually think it should use here?"

## Debugging With SE_MANAGER Logs

When a driver fails to resolve, verbose logging is your fastest path to the cause. Pass \`--debug\` to the CLI, or surface Selenium Manager's logs through the binding's logging. The logs show the detected browser version, the resolution decision, the download URL, the cache hit or miss, and the final path returned.

\`\`\`bash
# Maximum detail from the CLI
selenium-manager --browser chrome --debug --output json
\`\`\`

\`\`\`python
import logging
from selenium import webdriver

# Surface Selenium (and Selenium Manager) diagnostics
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("selenium")
logger.setLevel(logging.DEBUG)

driver = webdriver.Chrome()
driver.quit()
\`\`\`

If you see Selenium Manager downloading a driver on every run when you expect a cache hit, check that \`SE_CACHE_PATH\` is consistent between runs and that the cache directory is writable — a read-only or per-job-ephemeral cache forces repeated downloads.

## Selenium Manager Configuration Reference

Selenium Manager is configured almost entirely through environment variables and CLI flags. The table below lists the most useful ones for day-to-day work and CI.

| Setting | Type | Purpose |
|---|---|---|
| \`SE_CACHE_PATH\` | Env var | Override the cache location (default \`~/.cache/selenium\`) |
| \`SE_OFFLINE\` | Env var | Force offline mode; never attempt downloads |
| \`SE_AVOID_STATS\` | Env var | Disable anonymous usage statistics collection |
| \`SE_HTTP_PROXY\` / \`HTTPS_PROXY\` | Env var | Route downloads through a proxy |
| \`--browser\` | CLI flag | Target browser (chrome, firefox, edge) |
| \`--browser-version\` | CLI flag | Force a specific browser version |
| \`--driver-version\` | CLI flag | Force a specific driver version |
| \`--offline\` | CLI flag | Resolve only from cache |
| \`--debug\` | CLI flag | Verbose resolution logging |
| \`--output json\` | CLI flag | Machine-readable result for tooling |
| \`--clear-cache\` | CLI flag | Remove cached drivers/metadata |

Set \`SE_AVOID_STATS=true\` in CI if your policy prohibits outbound telemetry, and standardize \`SE_CACHE_PATH\` across jobs so all of them share one warm cache.

## Using Selenium Manager in CI

The biggest CI win is caching. Point \`SE_CACHE_PATH\` at a directory your CI caches between runs, pre-warm it once, and every subsequent job reuses the drivers instead of re-downloading them. Pin browser versions when you need determinism, set \`SE_AVOID_STATS=true\` to suppress telemetry, and use \`--debug\` in a one-off step if resolution ever fails on the runner.

\`\`\`yaml
# GitHub Actions snippet
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      SE_CACHE_PATH: \${{ github.workspace }}/.selenium-cache
      SE_AVOID_STATS: "true"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v4
        with:
          path: \${{ github.workspace }}/.selenium-cache
          key: selenium-cache-\${{ runner.os }}
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
      # First run warms the cache; later runs reuse it automatically
      - run: mvn test
\`\`\`

With the cache restored, Selenium Manager finds the driver already present and skips the network entirely, shaving real time off every build. For complementary CI testing patterns, see our [Locust vs JMeter load-testing guide](/blog/locust-vs-jmeter-2026-which-load-testing) and the [Playwright test agents reference](/blog/playwright-test-agents-planner-generator-healer-official-2026).

## Managing Firefox and Edge Drivers

Selenium Manager is not Chrome-only — it resolves GeckoDriver for Firefox and EdgeDriver for Microsoft Edge with the same automatic flow. You write the same zero-setup driver construction, and Selenium Manager detects the installed browser, maps it to the right driver, and caches it. This uniformity is a major advantage over the old days of juggling three separate driver downloads and three sets of system properties.

\`\`\`java
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.edge.EdgeDriver;

// GeckoDriver resolved and cached automatically
FirefoxDriver firefox = new FirefoxDriver();
firefox.get("https://www.selenium.dev");
firefox.quit();

// EdgeDriver resolved and cached automatically
EdgeDriver edge = new EdgeDriver();
edge.get("https://www.selenium.dev");
edge.quit();
\`\`\`

\`\`\`python
from selenium import webdriver

# No GeckoDriver download step, no PATH setup
firefox = webdriver.Firefox()
firefox.quit()

edge = webdriver.Edge()
edge.quit()
\`\`\`

On the CLI you simply change the \`--browser\` value to \`firefox\` or \`edge\` to inspect resolution for those browsers. The cache layout keeps each driver type in its own subtree, so Chrome, Firefox, and Edge drivers coexist without conflict.

## Migrating Off Manual Driver Setup

If you are upgrading an older Selenium project to 4.6+, migration is mostly deletion. Remove every \`System.setProperty("webdriver.chrome.driver", ...)\` line, every \`executable_path=\` argument in Python, every committed \`chromedriver\` binary in your repo, and every \`WebDriverManager.xxxdriver().setup()\` call. Then run your suite — Selenium Manager fills the gap automatically. The table below maps old patterns to their modern replacement.

| Legacy pattern | Modern replacement |
|---|---|
| \`System.setProperty("webdriver.chrome.driver", path)\` | Nothing — automatic |
| \`webdriver.Chrome(executable_path="...")\` | \`webdriver.Chrome()\` |
| \`WebDriverManager.chromedriver().setup()\` | Nothing — automatic |
| Committed \`chromedriver\` binary in repo | Delete it; use the cache |
| Manual PATH export in CI scripts | Cache \`SE_CACHE_PATH\` instead |
| Per-browser download steps | Single zero-config construction |

After migrating, your test code becomes shorter and your CI scripts lose their driver-download steps. The one thing to add back is cache configuration: set \`SE_CACHE_PATH\` and cache that directory so CI does not re-download drivers on every run. Note that the \`executable_path\` argument was removed in Selenium 4.x in favor of the \`Service\` object, but for the common case you no longer need either — Selenium Manager handles it.

## Frequently Asked Questions

### What is Selenium Manager?

Selenium Manager is a built-in driver manager bundled with Selenium 4.6 and later. Written in Rust and shipped inside every language binding, it automatically detects your browser, resolves the matching driver version, downloads it from official endpoints, caches it, and hands the path to Selenium — all with zero setup code. It runs only when a usable driver is not already configured.

### Do I still need WebDriverManager with Selenium 4.6+?

For most teams, no. Selenium Manager covers automatic driver detection, download, and caching natively for all bindings, so you can delete the WebDriverManager dependency and remove every \`setup()\` call. Keep WebDriverManager only if you depend on an advanced feature it offers that Selenium Manager does not yet provide, such as certain Docker or version-history helpers.

### Where does Selenium Manager store drivers?

By default it caches drivers and browsers under \`~/.cache/selenium\` on Linux and macOS, and \`%USERPROFILE%\\.cache\\selenium\` on Windows. Binaries are organized by type and version, alongside cached resolution metadata with a TTL. You can relocate the cache by setting the \`SE_CACHE_PATH\` environment variable, which is the standard way to share a warm cache across CI jobs.

### How do I force a specific browser version with Selenium Manager?

Use \`--browser-version\` on the CLI, or set the browser version through your options object in code — for example \`options.setBrowserVersion("125")\` in Java. Selenium Manager resolves and downloads the matching driver for that version, fetching the browser too via Chrome for Testing if it is not installed. Pinning keeps CI deterministic against browser auto-updates.

### Can Selenium Manager work offline?

Yes. Set \`SE_OFFLINE=true\` (or pass \`--offline\`) so Selenium Manager resolves only from the local cache and never attempts a download. Pre-warm the cache during one online run or image build, point \`SE_CACHE_PATH\` at it, and ship that cache into the air-gapped environment. If a needed driver is missing, the run fails fast with a clear message.

### How do I debug Selenium Manager driver resolution?

Run the standalone binary with \`selenium-manager --browser chrome --debug\`, which prints the detected browser version, the resolved driver version, the download URL, and cache hits or misses. In code, enable DEBUG logging on the \`selenium\` logger. If it downloads on every run, verify \`SE_CACHE_PATH\` is consistent and the cache directory is writable.

### How do I configure a proxy for Selenium Manager?

Selenium Manager respects the standard \`HTTPS_PROXY\` and \`HTTP_PROXY\` environment variables, and also accepts a \`--proxy\` CLI flag and \`SE_HTTP_PROXY\` setting. Export the proxy before creating the driver so downloads route through it. If downloads still fail, run the CLI with \`--debug\` to confirm the proxy is being applied to the outbound requests.

### What is SE_AVOID_STATS?

\`SE_AVOID_STATS\` is an environment variable that disables Selenium Manager's anonymous usage statistics collection. Set \`SE_AVOID_STATS=true\` in environments where outbound telemetry is prohibited, such as locked-down CI runners or compliance-sensitive networks. It does not affect driver resolution or downloads — only the optional, anonymous stats reporting that Selenium Manager would otherwise send.

## Conclusion

Selenium Manager ended the era of manual driver downloads and PATH juggling. From Selenium 4.6 onward, the default experience is: write a test, run it, and the correct driver appears automatically. Understanding the pieces — version resolution, the \`~/.cache/selenium\` cache, offline mode, proxy support, version pinning, the \`selenium-manager\` CLI, and the \`SE_\` environment variables — lets you make that automation deterministic and fast in CI, and debug it instantly when something goes wrong.

Ready to modernize your Selenium stack? Explore runnable, agent-ready Selenium and Playwright skills in the [skills directory](/skills), and pair this guide with our [WebDriver BiDi reference](/blog/selenium-webdriver-bidi-2026-official-reference) and [Playwright locator best practices guide](/blog/playwright-locator-best-practices-web-first-assertions-2026) to build a low-maintenance, future-proof browser automation suite.
`,
};
