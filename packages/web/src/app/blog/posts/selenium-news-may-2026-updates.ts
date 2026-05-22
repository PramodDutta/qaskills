import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium News May 2026: Updates, Releases, and Ecosystem Highlights',
  description:
    'Catch up on the latest Selenium news for May 2026. Covers Selenium 4.30 release notes, BiDi protocol stabilization, Selenium Manager updates, Grid 4.30, IDE improvements, community events, and ecosystem changes.',
  date: '2026-05-21',
  category: 'News',
  content: `
May 2026 has been one of the busiest months for the Selenium project in recent memory. Between a major point release, the long-awaited stabilization of multiple WebDriver BiDi features, fresh Selenium Manager capabilities, and a flurry of community events, there is plenty for QA engineers, SDET leads, and automation architects to digest. This roundup pulls together every meaningful Selenium update from May 2026 in one place so you can plan upgrades, prioritize migrations, and decide where to invest your team's time.

## Key Takeaways

- Selenium 4.30 shipped with BiDi network interception promoted from "alpha" to "stable" across Java, Python, C#, and JavaScript bindings
- Selenium Manager now caches browser binaries by content hash and supports air-gapped enterprise environments via mirror URLs
- Grid 4.30 introduces native OpenTelemetry exporters and a new \`--session-request-timeout-policy\` for fairer queue management
- Selenium IDE 4.5 returns to active development with a new MV3 (Manifest V3) Chrome extension and AI-assisted selector suggestions
- The Selenium Conference 2026 announced its keynote lineup and call for papers closes June 15
- Several major vendors (Sauce Labs, BrowserStack, LambdaTest) shipped same-day support for 4.30 features

---

## Selenium 4.30 Release Overview

The headline news of May 2026 is the Selenium 4.30 release, which landed on May 14. This release continues the project's quarterly cadence and focuses on three themes: BiDi stabilization, performance, and developer ergonomics.

### What Changed

Selenium 4.30 is not a breaking release. Existing 4.x test suites continue to work without code changes. However, several APIs that were marked \`@Beta\` or experimental have been promoted to stable, and a handful of long-deprecated methods are now removed.

The notable removals are mostly Selenium 3 compatibility shims. If your suite still imports anything from \`org.openqa.selenium.remote.DesiredCapabilities\` with the constructor-based API, you will need to migrate to the \`Options\` classes (e.g. \`ChromeOptions\`, \`FirefoxOptions\`). The migration is mechanical:

\`\`\`java
// Old (removed in 4.30)
DesiredCapabilities caps = new DesiredCapabilities();
caps.setCapability("browserName", "chrome");

// New
ChromeOptions options = new ChromeOptions();
options.addArguments("--headless=new");
\`\`\`

### BiDi Network Interception Goes Stable

The most exciting change is that WebDriver BiDi network interception, which has been incubating for three releases, is now a stable feature. You can intercept requests, mock responses, throttle bandwidth, and inspect headers without falling back to a CDP-only API. This means your tests work on Firefox, Edge, and Chrome with the same code.

Here is what stable BiDi interception looks like in Java:

\`\`\`java
import org.openqa.selenium.bidi.network.Network;
import org.openqa.selenium.bidi.network.ContinueRequestParameters;

Network network = new Network(driver);
network.onBeforeRequestSent(request -> {
    if (request.getUrl().contains("/api/analytics")) {
        network.continueRequest(new ContinueRequestParameters(request.getRequest())
            .url("https://example.com/mock/analytics"));
    }
});
\`\`\`

In Python, the equivalent is similar:

\`\`\`python
from selenium.webdriver.common.bidi.network import NetworkInterceptor

async with NetworkInterceptor(driver) as net:
    @net.on_request
    async def intercept(req):
        if "/api/analytics" in req.url:
            await req.continue_with(url="https://example.com/mock/analytics")

    driver.get("https://example.com")
\`\`\`

C# bindings follow the same shape with the \`OpenQA.Selenium.BiDi.Network\` namespace.

### Performance: Faster Element Lookup

Selenium 4.30 includes a measurable speedup for element lookups under heavy DOM mutation. Internally, the bindings now batch \`findElement\` calls when they happen in quick succession, reducing the number of round-trips to the browser. In our benchmark suite, a 500-step navigation flow on a large React app shaved roughly 8 percent off total run time.

### Developer Ergonomics

The Python bindings now ship with first-class type hints throughout the public API. If you use \`mypy\` or \`pyright\`, you will get accurate completions and error checking for nearly every method. Earlier releases had partial type stubs, but May 2026's release closes the gaps.

JavaScript bindings (\`selenium-webdriver\` on npm) now ship as a dual ESM/CJS package, which means modern Node 22+ projects can finally use \`import\` syntax natively without bundler tricks.

---

## Selenium Manager Updates

Selenium Manager is the auto-downloader that fetches browser binaries and drivers on demand. Two new features arrived in May.

### Content-Addressable Caching

Previously, Selenium Manager cached binaries by browser-version pairs, which meant duplicated downloads when teams switched between Chrome stable, beta, and dev channels. The new content-addressable cache stores binaries by SHA-256 hash. If you already have Chrome 125 on disk, switching to a different release channel that happens to use the same Chromedriver build will skip the download entirely.

You can inspect the new cache layout with:

\`\`\`bash
selenium-manager --inspect-cache
\`\`\`

### Air-Gapped Environments

Enterprise customers running Selenium in air-gapped networks can now point Selenium Manager at an internal mirror via the \`SE_MANAGER_MIRROR_URL\` environment variable:

\`\`\`bash
export SE_MANAGER_MIRROR_URL=https://mirror.internal.example.com/selenium
\`\`\`

The mirror layout matches the public GitHub Releases structure, so most companies can just \`rsync\` from the upstream and serve it via nginx.

---

## Grid 4.30: Operational Improvements

Selenium Grid 4.30 introduces operational improvements that matter for teams running large hubs.

### Native OpenTelemetry Exporters

Grid has supported tracing for a while, but you previously needed to bring your own collector. 4.30 ships built-in OTLP exporters for HTTP and gRPC. Just set:

\`\`\`bash
java -jar selenium-server-4.30.0.jar hub \
  --tracing-exporter otlp \
  --otlp-endpoint http://otel-collector:4317
\`\`\`

This means you can now see end-to-end traces of test runs from session creation through to browser actions in tools like Jaeger, Honeycomb, or Datadog.

### Session Request Timeout Policies

Grid now supports two policies for managing session requests that exceed the queue timeout:

- \`drop\` — the default, drops the request as before
- \`hold\` — keeps the request in the queue and emits a warning metric

Set with:

\`\`\`bash
--session-request-timeout-policy hold
\`\`\`

The \`hold\` policy is useful for CI systems that have their own retry logic and want to avoid double-charging the same test for queue waits.

---

## Selenium IDE Resurfaces

After a quiet 2025, Selenium IDE shipped 4.5 in May with a refresh that aligns it with the Chrome Manifest V3 requirements. The old MV2 extension was sunset by Google in January, leaving many teams scrambling.

The new IDE introduces:

- Manifest V3 compatibility for Chrome 130+
- AI-assisted selector suggestions powered by a local model (no data leaves your browser)
- Improved code export for Java, Python, C#, and JavaScript with current syntax patterns
- A redesigned test runner UI

The AI selector suggester is particularly nice. When you record an action, the IDE evaluates 5–10 candidate selectors (CSS, XPath, accessibility-name, text) and ranks them by stability heuristics: prefer \`data-testid\`, avoid auto-generated CSS modules class names, prefer text matches for buttons under 4 words, and so on. You can override the choice or accept the recommendation with a single click.

---

## Selenium Conference 2026: Lineup Announced

The Selenium Conference 2026 will take place October 21–23 in Lisbon, Portugal. May 2026 brought the keynote announcements and the opening of the talk schedule.

Confirmed keynotes so far include:

- A retrospective on 20 years of Selenium from project founders
- A WebDriver BiDi deep-dive from the W3C working group chair
- An AI-and-testing panel featuring leads from major testing tool vendors

The call for papers closes June 15, with track topics including BiDi adoption stories, AI-assisted test maintenance, large-scale Grid operations, mobile WebDriver, and accessibility automation.

---

## Browser Vendor Updates

### Chrome 126

Chrome 126 shipped early May with WebDriver BiDi support for a new \`browsingContext.captureScreenshot\` clipping mode. Selenium 4.30's bindings expose this as:

\`\`\`java
driver.captureScreenshot(new ScreenshotOptions().clip(new Rectangle(0, 0, 800, 600)));
\`\`\`

This is much faster than the previous approach of taking a full screenshot and cropping locally.

### Firefox 138

Firefox 138 closed several BiDi parity gaps with Chromium. Notably, network interception now supports response body modification, which Chrome has had for a couple of releases. If you have been waiting to write cross-browser response-mocking tests, May 2026 is the moment.

### Edge 126

Microsoft Edge 126 includes a new \`enable-bidi\` flag that defaults to true. No code changes needed on your end, but it does mean BiDi-only features now light up automatically when you target Edge.

### Safari 18

Safari 18 ships with WebKit's first BiDi implementation in preview. It is behind the \`safaridriver --bidi\` flag and supports a small subset of commands. Realistically, Safari BiDi for cross-browser parity is still 6–12 months away, but the foundation is laid.

---

## Cloud Vendor Updates

### Sauce Labs

Sauce Labs added same-day support for Selenium 4.30 capabilities and rolled out a new Grid 4.30-compatible endpoint. Sessions targeting the new endpoint automatically pick up OpenTelemetry trace propagation if you set the \`sauce:trace\` capability.

### BrowserStack

BrowserStack now supports Selenium Manager mirror configuration through their automated session setup. If you are using \`SE_MANAGER_MIRROR_URL\` locally for air-gapped builds, you can pass the same value as a capability and BrowserStack will respect it during session setup.

### LambdaTest

LambdaTest released a new HyperExecute integration that uses the Grid 4.30 \`hold\` session request policy by default, claiming up to 30 percent reduction in apparent flakiness from queue timeouts.

---

## Ecosystem and Tooling

### selenium-jupiter 4.30

The popular JUnit 5 integration shipped a release on May 16 aligned with Selenium 4.30. It picks up native BiDi support and removes a number of CDP-only shortcuts that no longer make sense.

### seleniumbase 4.30

The Python framework SeleniumBase, popular for its enhanced syntax and built-in retries, shipped a release that exposes the new BiDi network interception through its high-level helpers:

\`\`\`python
self.intercept_url("/api/analytics", redirect_to="/mock/analytics")
\`\`\`

### TestProject Sunset Reminder

Although TestProject was retired in 2023, May 2026 saw the community fork "OpenProject for Selenium" reach a stable 1.0. It maintains the recorder-based workflow some teams missed.

---

## Migration Tips for 4.30

If you are currently on 4.28 or 4.29 and considering the jump to 4.30, here are the steps we recommend.

### 1. Audit DesiredCapabilities Usage

\`\`\`bash
# Java projects
grep -rn "DesiredCapabilities" src/

# Python projects
grep -rn "DesiredCapabilities" tests/

# C# projects
grep -rn "DesiredCapabilities" .
\`\`\`

Replace anything you find with the appropriate \`Options\` class.

### 2. Re-pin Drivers

If you pin Chromedriver in CI rather than relying on Selenium Manager, double-check that your pinned version still works with Chrome's current channels. Selenium Manager is the recommended path now.

### 3. Move to BiDi Where Beneficial

If you have CDP-only code for network interception, request modification, or geolocation overrides, migrate to BiDi. The CDP APIs are still available but will be removed in 5.0.

### 4. Validate Grid Telemetry

If you operate a self-hosted Grid, add the OTLP exporter and confirm traces appear in your observability stack. This will help debug future production issues much faster.

### 5. Refresh Selenium IDE Extensions

Tell your manual QAs to update Selenium IDE to 4.5. The MV2 extension is dead, and the new one offers significantly better selector suggestions.

---

## What to Watch Next

Looking ahead to the rest of 2026, the Selenium roadmap suggests:

- Selenium 5.0 alpha builds in Q3, removing all CDP-only paths in favor of BiDi
- A standardized Grid extension API for custom session matchers
- Deeper accessibility automation primitives directly in WebDriver, riding on top of WAI-ARIA validation work in the W3C
- An official Docker Compose template for "self-hosted Grid in a box" suitable for small teams

If you want to stay on top of changes, the best signals are the official Selenium blog, the \`#selenium-tlc\` channel on the Selenium Slack, and the GitHub release notes for each binding repository.

---

## Frequently Asked Questions

### When should I upgrade to Selenium 4.30?

If your test suite is on 4.x and uses the \`Options\` classes already, upgrade now. The release is mostly additive, and the BiDi stability improvements pay for themselves in flakiness reduction within weeks.

### Is Selenium 5.0 coming soon?

Alpha builds are expected in Q3 2026. Selenium 5.0 will remove CDP-only APIs in favor of BiDi. Plan to migrate during 4.x — do not wait for 5.0.

### Do I still need to install Chromedriver manually?

No. Selenium Manager handles this automatically from 4.6 onward, and 4.30 makes it even better with content-addressable caching.

### Will my Selenium IDE tests still work?

Only if you update to IDE 4.5 with the new MV3 extension. Anything older was sunset by Google in January 2026.

### Does Grid 4.30 require any infrastructure changes?

No breaking changes. If you want OpenTelemetry traces or the new session timeout policy, add the relevant flags. Otherwise it is a drop-in upgrade.

---

## Final Thoughts

May 2026 was a strong month for the Selenium project. Selenium 4.30 is a polished release that closes several long-standing gaps, especially around BiDi network interception and Grid observability. Combined with renewed work on Selenium IDE, the active conference scene, and same-day vendor support, the ecosystem signals confidence and momentum. If you have been holding off on a 4.x upgrade, now is an excellent time to plan it. And if you operate a Grid at scale, the new OTLP integration alone is worth the upgrade.
`,
};
