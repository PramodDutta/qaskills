import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenide Configuration and baseUrl Complete Guide (2026)',
  description:
    'Complete guide to Selenide Configuration: baseUrl with open("/login"), timeout, browser, headless, browserSize, and every Configuration option. Java.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# Selenide Configuration and baseUrl Complete Guide

Most Selenide problems that look like bugs are actually configuration problems. A test that opens the wrong environment, a CI run that times out because the default four seconds was never tuned, a screenshot folder that nobody can find, a browser window so small that a responsive layout collapses and your locators miss - all of these trace back to the static \`Configuration\` class. Selenide centralises every global setting in this one place, and learning it properly is the difference between a suite you fight and a suite that just runs.

This guide walks through \`Configuration\` end to end, starting with the single most useful setting - \`baseUrl\` - and the \`open("/path")\` pattern it unlocks, then covering timeouts, browser selection, headless mode, window sizing, page load strategy, reporting, and the precedence rules that decide which value actually wins. Everything is Java, every snippet runs inside a JUnit 5 setup method, and the goal is a configuration block you can paste into any project and adjust by environment. If you want the assertion side of Selenide next, the [Selenide condition references on the blog](/blog) cover that, and you can install a Selenide skill for your AI agent from the [QA Skills directory](/skills) so it scaffolds this configuration correctly from the start.

---

## baseUrl and the open("/path") Pattern

\`Configuration.baseUrl\` is the foundation. Set it once, and every relative path you pass to \`open\` is resolved against it. This is what lets the same test run against localhost, staging, and production by changing a single value.

\`\`\`java
import com.codeborne.selenide.Configuration;
import static com.codeborne.selenide.Selenide.open;

Configuration.baseUrl = "https://staging.example.com";

open("/login");        // -> https://staging.example.com/login
open("/dashboard");    // -> https://staging.example.com/dashboard
open("/orders?page=2");// -> https://staging.example.com/orders?page=2
\`\`\`

If you pass an absolute URL to \`open\`, \`baseUrl\` is ignored for that call, which is occasionally useful for hitting a third-party page. But the discipline of relative paths everywhere is what makes environment switching trivial.

The natural way to feed \`baseUrl\` is an environment variable or system property, so the value lives in CI config rather than source:

\`\`\`java
Configuration.baseUrl = System.getProperty("base.url", "http://localhost:3000");
\`\`\`

Run with \`-Dbase.url=https://staging.example.com\` and the whole suite retargets. No code change, no recompile.

---

## Configuration Precedence: Who Wins

\`Configuration\` fields can be set three ways, and they resolve in a strict order. Understanding this prevents the classic "I set it in code but CI ignores it" confusion.

| Source | Example | Precedence |
|--------|---------|-----------|
| System property | \`-Dselenide.timeout=10000\` | Highest |
| \`Configuration.x = ...\` in code | \`Configuration.timeout = 8000\` | Middle |
| Built-in default | \`timeout = 4000\` | Lowest |

A system property always beats a value assigned in code. This is deliberate: it lets CI override anything without touching the test source. The practical rule is to set sensible defaults in code, then let \`-Dselenide.*\` flags override per environment.

\`\`\`java
// In code: a reasonable default
Configuration.timeout = 6000;

// On the CI command line, override for a slow environment:
// mvn test -Dselenide.timeout=15000
\`\`\`

---

## timeout and pollingInterval

\`Configuration.timeout\` is the maximum time, in milliseconds, that any \`should\`/\`shouldNot\` assertion will wait for its condition to become true. The default of 4000 is fine for fast local apps and frequently too short for loaded CI environments.

\`\`\`java
Configuration.timeout = 8000;            // wait up to 8s for conditions
Configuration.pollingInterval = 200;     // re-check every 200ms (default 200)
\`\`\`

Raising \`timeout\` does not slow down passing tests - a condition that becomes true after 300ms returns immediately. It only changes how long Selenide tolerates a not-yet-true condition before failing. Tune it up for CI; there is rarely a reason to go below the default locally.

\`pageLoadTimeout\` is separate and governs full document loads:

\`\`\`java
Configuration.pageLoadTimeout = 30000;   // max 30s for open() to finish loading
\`\`\`

---

## browser and browserVersion

\`Configuration.browser\` selects the driver. Accepted values include \`chrome\`, \`firefox\`, \`edge\`, and \`safari\`, plus the headless variants are controlled separately via the \`headless\` flag rather than a special browser name on modern Selenide.

\`\`\`java
Configuration.browser = "chrome";        // default
Configuration.browser = "firefox";
Configuration.browser = "edge";
Configuration.browserVersion = "126";    // optional pinned version
\`\`\`

Because Selenide ships with Selenium Manager, you do not download or manage drivers yourself - the correct \`chromedriver\` or \`geckodriver\` is resolved automatically for the installed browser. Pinning \`browserVersion\` is useful when you run a specific browser build in CI for reproducibility.

---

## headless Mode

\`Configuration.headless = true\` runs the browser with no visible window. This is the standard for CI, where there is no display, and it is meaningfully faster than headed mode.

\`\`\`java
Configuration.browser = "chrome";
Configuration.headless = true;
\`\`\`

A common and effective pattern is to drive this from an environment variable so local runs are headed (easy to watch) and CI runs are headless automatically:

\`\`\`java
Configuration.headless = Boolean.parseBoolean(
    System.getProperty("headless", "false")
);
\`\`\`

Locally you see the browser; in CI you pass \`-Dheadless=true\`. One flag, no branching logic in your tests.

---

## browserSize, browserPosition, and start-maximized

\`Configuration.browserSize\` sets the window dimensions as a \`"widthxheight"\` string. This matters more than it looks: responsive layouts swap entire DOM structures at breakpoints, so a too-small default window can make desktop locators vanish.

\`\`\`java
Configuration.browserSize = "1920x1080";   // explicit desktop viewport
Configuration.browserPosition = "0x0";      // top-left of the screen
\`\`\`

To open maximized instead of a fixed size, set \`startMaximized\`:

\`\`\`java
Configuration.startMaximized = true;        // overrides browserSize
\`\`\`

For CI consistency, prefer an explicit \`browserSize\` over \`startMaximized\` - a fixed viewport produces identical layouts on every machine, whereas "maximized" depends on the agent's screen resolution. Set a deliberate size and your visual and layout-dependent tests stop being machine-specific.

---

## pageLoadStrategy

\`Configuration.pageLoadStrategy\` controls how long \`open\` blocks waiting for the document. The three values trade completeness for speed.

| Strategy | open() returns when | Use when |
|----------|--------------------|----------|
| \`normal\` | Full load event fired (all resources) | Default; safest |
| \`eager\` | DOMContentLoaded fired (HTML parsed) | SPAs; faster, skips slow assets |
| \`none\` | As soon as the document is created | You wait explicitly afterward |

\`\`\`java
Configuration.pageLoadStrategy = "eager";   // good default for SPAs
\`\`\`

For single-page apps, \`eager\` is often the sweet spot: it stops waiting for analytics scripts and images that have nothing to do with your test, while Selenide's element waits handle the rest. Use \`none\` only if you are immediately waiting on a specific element yourself.

---

## Reporting: reportsFolder, savePageSource, screenshots

Selenide can capture a screenshot and the page HTML automatically on failure, which turns an opaque CI red into a self-explanatory artifact.

\`\`\`java
Configuration.reportsFolder = "build/reports/tests";
Configuration.screenshots = true;        // capture screenshot on failure (default true)
Configuration.savePageSource = true;     // also dump HTML on failure (default true)
\`\`\`

The screenshot and the saved \`.html\` land in \`reportsFolder\`, and the path is printed in the failure message so you can jump straight to it. Point \`reportsFolder\` at a directory your CI archives as build artifacts and every failure comes with visual evidence attached.

---

## remote for Selenium Grid

To run against a Grid or a cloud provider, set \`Configuration.remote\` to the hub URL. Selenide then sends all sessions there instead of launching a local browser.

\`\`\`java
Configuration.remote = "http://selenium-hub:4444/wd/hub";
Configuration.browser = "chrome";
Configuration.browserSize = "1920x1080";
\`\`\`

Combine \`remote\` with \`browser\` and \`browserVersion\` to request a specific capability from the Grid. Leaving \`remote\` null (the default) runs locally. This single switch is all that separates a local run from a distributed one.

---

## holdBrowserOpen and reopenBrowserOnFail

Two debugging conveniences. \`holdBrowserOpen\` keeps the browser window open after the test finishes, so you can inspect the final state while developing locally. Never enable it in CI.

\`\`\`java
Configuration.holdBrowserOpen = true;     // local debugging only
\`\`\`

\`reopenBrowserOnFail\` controls whether Selenide spins up a fresh browser if the current session has died (for example after a crash). It defaults to true and is what makes a suite resilient to the occasional dead WebDriver session.

\`\`\`java
Configuration.reopenBrowserOnFail = true; // default; keep it on for stability
\`\`\`

---

## A Complete Configuration Block

Here is a production-ready setup driven entirely by system properties, with sane defaults for local development. Drop it in a JUnit 5 base class and extend it.

\`\`\`java
package org.example;

import com.codeborne.selenide.Configuration;
import org.junit.jupiter.api.BeforeAll;

public abstract class BaseTest {

    @BeforeAll
    static void configureSelenide() {
        Configuration.baseUrl = System.getProperty("base.url", "http://localhost:3000");
        Configuration.browser = System.getProperty("browser", "chrome");
        Configuration.headless = Boolean.parseBoolean(System.getProperty("headless", "false"));
        Configuration.browserSize = System.getProperty("browser.size", "1920x1080");
        Configuration.timeout = Long.parseLong(System.getProperty("selenide.timeout", "8000"));
        Configuration.pageLoadStrategy = "eager";
        Configuration.pageLoadTimeout = 30000;
        Configuration.reportsFolder = "build/reports/tests";
        Configuration.screenshots = true;
        Configuration.savePageSource = true;

        // Optional Grid: -Dremote=http://selenium-hub:4444/wd/hub
        String remote = System.getProperty("remote");
        if (remote != null && !remote.isBlank()) {
            Configuration.remote = remote;
        }
    }
}
\`\`\`

A test that extends it stays clean, with no configuration noise:

\`\`\`java
package org.example;

import org.junit.jupiter.api.Test;

import static com.codeborne.selenide.Selenide.$;
import static com.codeborne.selenide.Selenide.open;
import static com.codeborne.selenide.Condition.visible;

class LoginTest extends BaseTest {

    @Test
    void userCanReachLoginForm() {
        open("/login");                       // resolved against baseUrl
        $("#email").shouldBe(visible);
        $("#password").shouldBe(visible);
        $("button[type=submit]").shouldBe(visible);
    }
}
\`\`\`

Run it locally with no flags, against staging with \`-Dbase.url=https://staging.example.com -Dheadless=true\`, and against a Grid by adding \`-Dremote=...\`. The same code, three environments.

---

## Configuration via properties File

Instead of system properties, you can put settings in \`src/test/resources/selenide.properties\`. Selenide reads it automatically at startup, and \`selenide.\`-prefixed keys map to \`Configuration\` fields.

\`\`\`properties
selenide.baseUrl=http://localhost:3000
selenide.browser=chrome
selenide.headless=true
selenide.timeout=8000
selenide.browserSize=1920x1080
selenide.pageLoadStrategy=eager
\`\`\`

This is handy for a stable team default checked into the repo, with system properties still available to override any single value per run.

---

## Common Configuration Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Absolute URLs in \`open\` | Cannot switch environments | Set \`baseUrl\`, pass relative paths |
| Default 4s timeout in CI | Random failures on slow agents | Raise \`Configuration.timeout\` |
| \`startMaximized\` in CI | Layout differs per machine | Use explicit \`browserSize\` |
| Setting config after \`open\` | Setting ignored for that session | Configure in \`@BeforeAll\` before any \`open\` |
| \`holdBrowserOpen=true\` left on | CI hangs / leaks browsers | Guard it behind a local-only flag |

The subtle one is timing: many \`Configuration\` fields are read when the browser opens, so set everything in \`@BeforeAll\` (or before the first \`open\`) rather than mid-test. Changing \`browserSize\` after the window exists, for instance, has no effect on the already-open window.

---

## Per-Thread Configuration for Parallel Runs

When you run tests in parallel - JUnit 5's parallel execution or TestNG thread pools - the static \`Configuration\` fields are shared across all threads, which is usually fine because they are read-only after setup. The browser session itself, however, is held per thread by Selenide's \`WebDriverRunner\`, so each test gets its own isolated browser. The rule is: configure the static fields once before any thread starts, and never mutate \`Configuration\` from inside a parallel test.

\`\`\`java
import com.codeborne.selenide.Configuration;
import org.junit.jupiter.api.BeforeAll;

public abstract class ParallelBaseTest {

    @BeforeAll
    static void configureOnce() {
        // set once, before the thread pool spins up - safe
        Configuration.baseUrl = System.getProperty("base.url", "http://localhost:3000");
        Configuration.browser = "chrome";
        Configuration.headless = true;
        Configuration.timeout = 8000;
        Configuration.reopenBrowserOnFail = true;
    }
}
\`\`\`

To enable JUnit 5 parallelism, add a \`junit-platform.properties\` file on the test classpath:

\`\`\`properties
junit.jupiter.execution.parallel.enabled=true
junit.jupiter.execution.parallel.mode.default=concurrent
junit.jupiter.execution.parallel.config.strategy=fixed
junit.jupiter.execution.parallel.config.fixed.parallelism=4
\`\`\`

Each test method now runs on its own thread with its own browser, while sharing the immutable \`Configuration\`. If you genuinely need a different browser per thread, drive it through a system property read at setup rather than mutating the static field mid-run, which would race across threads.

---

## Timeouts, Retries, and the fastSetValue Trick

Beyond \`timeout\`, a few performance-oriented settings are worth knowing for large suites. \`Configuration.fastSetValue\` makes \`setValue\` inject text via JavaScript instead of simulating individual keystrokes, which is dramatically faster for long inputs - at the cost of not firing every keystroke event the page might listen for.

\`\`\`java
Configuration.fastSetValue = true;   // faster text entry, skips per-key events
Configuration.clickViaJs = false;    // keep real clicks unless a native click is blocked
\`\`\`

\`clickViaJs\` forces clicks through JavaScript rather than the WebDriver native click. Leave it \`false\` by default - native clicks better reflect real user behaviour and catch overlay bugs that a JS click would silently bypass. Flip it on only for the rare element that a native click cannot reach.

| Setting | Default | Effect when enabled |
|---------|---------|---------------------|
| \`fastSetValue\` | false | \`setValue\` uses JS injection - fast, skips keystroke events |
| \`clickViaJs\` | false | Clicks via JS - bypasses overlays, less realistic |
| \`reopenBrowserOnFail\` | true | New browser if session dies mid-suite |
| \`pollingInterval\` | 200ms | How often conditions are re-checked |

The guiding principle is realism first, speed second. Reach for \`fastSetValue\` and \`clickViaJs\` only when a measured bottleneck or a genuinely unreachable element justifies trading away fidelity. For everything else, the native interactions give you better bug detection.

---

## Environment-Specific Configuration Profiles

A mature suite typically runs against several environments - local, CI, staging, production smoke - each wanting slightly different settings. Rather than scattering conditionals through your code, centralise the differences behind a single environment key and resolve everything from it. This keeps the base class clean and makes adding a new environment a one-line change.

\`\`\`java
import com.codeborne.selenide.Configuration;
import org.junit.jupiter.api.BeforeAll;

public abstract class EnvAwareBaseTest {

    @BeforeAll
    static void configure() {
        String env = System.getProperty("env", "local");

        switch (env) {
            case "ci" -> {
                Configuration.baseUrl = "http://app:3000";
                Configuration.headless = true;
                Configuration.timeout = 12000;       // slower shared agents
                Configuration.browserSize = "1920x1080";
            }
            case "staging" -> {
                Configuration.baseUrl = "https://staging.example.com";
                Configuration.headless = true;
                Configuration.timeout = 10000;
            }
            default -> {                              // local
                Configuration.baseUrl = "http://localhost:3000";
                Configuration.headless = false;       // watch it run
                Configuration.timeout = 6000;
                Configuration.holdBrowserOpen = false;
            }
        }

        // shared across all environments
        Configuration.browser = "chrome";
        Configuration.screenshots = true;
        Configuration.savePageSource = true;
        Configuration.reportsFolder = "build/reports/tests";
    }
}
\`\`\`

Run locally with no flags, and switch the whole profile with \`-Denv=ci\` or \`-Denv=staging\`. Each environment gets its own timeout and visibility, while the reporting and browser settings stay shared. This pattern scales cleanly: a new environment is just another \`case\`, and there is exactly one place to look when a setting behaves differently between environments. Combined with the system-property overrides described earlier, you retain the ability to tweak any single value per run without editing the profile itself.

---

## Frequently Asked Questions

### How does Selenide baseUrl work with open()?

\`Configuration.baseUrl\` is the prefix every relative path passed to \`open\` is resolved against. Set \`baseUrl = "https://staging.example.com"\` and \`open("/login")\` navigates to \`https://staging.example.com/login\`. Passing an absolute URL to \`open\` bypasses \`baseUrl\` for that call. This pattern lets one test suite target localhost, staging, or production by changing a single value.

### What is the default Selenide timeout and how do I change it?

The default \`Configuration.timeout\` is 4000 milliseconds, the maximum any \`should\` assertion waits for its condition. Change it with \`Configuration.timeout = 8000\` in code, or override per run with the system property \`-Dselenide.timeout=8000\`. Raising it does not slow passing tests; conditions that become true early return immediately.

### How do I run Selenide tests in headless mode?

Set \`Configuration.headless = true\` before the browser opens, typically in an \`@BeforeAll\` method. A clean pattern is \`Configuration.headless = Boolean.parseBoolean(System.getProperty("headless", "false"))\`, so local runs are headed for debugging and CI passes \`-Dheadless=true\`. Headless mode needs no display and runs faster, making it the CI default.

### How do I set the browser window size in Selenide?

Use \`Configuration.browserSize = "1920x1080"\` (a width-by-height string). For CI, prefer an explicit size over \`Configuration.startMaximized = true\`, because a fixed viewport produces identical layouts on every machine while maximized depends on the agent's resolution. Set the size before the first \`open\`, since it is applied when the window is created.

### Which Configuration value wins: code or system property?

A system property always wins. The precedence is system property (highest), then a value assigned via \`Configuration.x =\` in code, then the built-in default. This lets CI override any setting with \`-Dselenide.*\` flags without editing test source. The practical approach is sensible defaults in code, overridden per environment on the command line.

### What does pageLoadStrategy do in Selenide?

\`Configuration.pageLoadStrategy\` controls how long \`open\` blocks. \`normal\` waits for the full load event, \`eager\` returns at DOMContentLoaded (good for SPAs, skips slow assets), and \`none\` returns as soon as the document exists. For single-page apps, \`eager\` is usually the best balance, since Selenide's element waits handle the rest.

### How do I run Selenide against Selenium Grid?

Set \`Configuration.remote = "http://selenium-hub:4444/wd/hub"\` to the Grid hub URL. All sessions then route to the Grid instead of a local browser. Combine it with \`Configuration.browser\` and \`browserVersion\` to request a specific capability. Leaving \`remote\` null runs locally, so a single optional flag switches between local and distributed execution.

### Where do Selenide failure screenshots get saved?

In the directory set by \`Configuration.reportsFolder\` (defaults to \`build/reports/tests\`). With \`Configuration.screenshots\` and \`savePageSource\` enabled (both default true), each failure writes a PNG and an HTML dump there, and the paths print in the failure message. Point \`reportsFolder\` at a directory your CI archives as artifacts so every red build carries visual evidence.

---

## Conclusion

Selenide's \`Configuration\` class is the control panel for your entire suite. Master \`baseUrl\` and the relative-path \`open\` pattern first - it is what makes multi-environment testing painless. Then tune \`timeout\` for your CI, drive \`headless\` and \`browserSize\` from system properties for consistent runs, pick the right \`pageLoadStrategy\` for your app, and enable the screenshot and page-source capture so failures explain themselves. Remember the precedence rule - system properties beat code - and set everything before the first \`open\`.

Want your AI agent to scaffold this configuration correctly every time? Install a Selenide skill from the [QA Skills directory](/skills), and find more Selenide and Java automation references on the [blog](/blog).
`,
};
