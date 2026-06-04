import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium CDP: execute_cdp_cmd and Script Injection Guide',
  description:
    'Chrome DevTools Protocol from Selenium Python: execute_cdp_cmd, addScriptToEvaluateOnNewDocument injection, network header override, and geolocation spoofing.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# Selenium CDP: execute_cdp_cmd and Script Injection Guide

Selenium WebDriver gives you a standardized, cross-browser way to drive a page, but the WebDriver protocol intentionally exposes only what is portable across every browser. There is a whole layer of Chrome-specific power it does not surface: injecting JavaScript before any page script runs, overriding outgoing network headers, blocking or rewriting requests, faking geolocation, throttling the network, and emulating devices. All of that lives in the Chrome DevTools Protocol (CDP), the same low-level protocol the DevTools panel speaks to the browser. Selenium 4 opened a door to it through a single, deceptively simple method: \`driver.execute_cdp_cmd\`.

This guide is a complete, runnable reference for driving the Chrome DevTools Protocol from Selenium's Python bindings. We start with how \`execute_cdp_cmd\` works and the shape of a CDP command, then move through the techniques engineers reach for most: injecting a script with \`Page.addScriptToEvaluateOnNewDocument\` so it runs before the page's own code, overriding request headers with \`Network.setExtraHTTPHeaders\`, intercepting and faking responses with \`Fetch.enable\`, spoofing geolocation with \`Emulation.setGeolocationOverride\`, throttling the network, and emulating a mobile device. Every example is real Python you can run against a current Chrome and Selenium 4.x.

CDP is the escape hatch that lets a Selenium test do things the plain WebDriver API simply cannot. Used carefully it makes tests more deterministic — you can stub a flaky third-party API, pin a geolocation so a "near me" feature is testable, or inject a feature flag before the app boots. Used carelessly it couples your suite to Chrome and to protocol details that shift between versions. This guide shows both the power and the guardrails so you can decide when reaching past WebDriver into CDP is the right call.

## What execute_cdp_cmd Actually Does

\`execute_cdp_cmd\` sends a single Chrome DevTools Protocol command to the browser and returns the result synchronously. Its signature is \`driver.execute_cdp_cmd(cmd: str, params: dict) -> dict\`. The \`cmd\` string is a CDP method name in \`Domain.method\` form, such as \`Page.navigate\` or \`Network.setExtraHTTPHeaders\`, and \`params\` is a dictionary matching that method's parameter schema from the CDP specification.

\`\`\`python
from selenium import webdriver

driver = webdriver.Chrome()

# A trivial CDP call: read the browser version
info = driver.execute_cdp_cmd("Browser.getVersion", {})
print(info["product"])      # e.g. "Chrome/130.0.6723.69"
print(info["protocolVersion"])

driver.quit()
\`\`\`

Three facts about this method shape everything that follows. First, it is Chromium-only — it works in Chrome and Edge but not Firefox or Safari, because CDP is a Chromium protocol. Second, many CDP domains must be enabled before their commands or events do anything; you call \`Network.enable\`, \`Page.enable\`, or \`Fetch.enable\` once to turn the domain on. Third, \`execute_cdp_cmd\` only sends commands and reads their immediate return value — it does not subscribe to CDP events. For event-driven work like reading every response body as it streams in, Selenium offers the newer BiDi APIs; \`execute_cdp_cmd\` is for the request/response command style.

The CDP method reference is the source of truth for what \`params\` each command accepts. When a call silently does nothing, the usual cause is a missing \`enable\` for that domain or a params key that does not match the schema. The table below lists the domains this guide uses and what they unlock.

| CDP domain | Representative method | Capability |
|---|---|---|
| \`Page\` | \`addScriptToEvaluateOnNewDocument\` | Inject JS before page scripts run |
| \`Network\` | \`setExtraHTTPHeaders\` | Add/override outgoing request headers |
| \`Network\` | \`setUserAgentOverride\` | Spoof the user agent string |
| \`Fetch\` | \`enable\` + \`continueRequest\` | Intercept, block, or fake responses |
| \`Emulation\` | \`setGeolocationOverride\` | Fake GPS coordinates |
| \`Emulation\` | \`setDeviceMetricsOverride\` | Emulate a mobile viewport |

## Injecting Scripts with addScriptToEvaluateOnNewDocument

The most powerful and most commonly used CDP technique is injecting JavaScript that runs before any of the page's own scripts. \`driver.execute_script\` runs code after the page has loaded, which is too late to, say, define a global before the app reads it or to patch a browser API the app calls on startup. \`Page.addScriptToEvaluateOnNewDocument\` registers a script that the browser evaluates at the very start of every new document — before the HTML's inline scripts, before bundled JavaScript, before anything.

\`\`\`python
from selenium import webdriver

driver = webdriver.Chrome()

# This script runs before the page's own scripts on every navigation
driver.execute_cdp_cmd(
    "Page.addScriptToEvaluateOnNewDocument",
    {
        "source": """
            window.__E2E__ = true;
            window.__FEATURE_FLAGS__ = { newCheckout: true, betaSearch: false };
            // Patch a browser API before the app reads it
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        """
    },
)

driver.get("https://example.com")
# The page booted with __FEATURE_FLAGS__ already defined
flags = driver.execute_script("return window.__FEATURE_FLAGS__;")
print(flags)  # {'newCheckout': True, 'betaSearch': False}

driver.quit()
\`\`\`

The distinction from \`execute_script\` is the whole point, so it is worth stating plainly in a table.

| Method | Runs when | Persists across navigations | Use for |
|---|---|---|---|
| \`execute_script\` | After page load, on demand | No (one-shot) | Reading state, triggering actions |
| \`addScriptToEvaluateOnNewDocument\` | Before any page script, every load | Yes (every new document) | Feature flags, API patches, test hooks |

Practical uses of pre-injection are everywhere in test engineering. You can seed feature flags so a test exercises a gated code path without server-side setup. You can stub \`window.fetch\` or \`navigator.geolocation\` before the app captures a reference to them. You can install a test-only hook that the app checks to disable animations or analytics. Because the script re-runs on every new document, it also covers in-page navigations and iframes, which a single \`execute_script\` call would miss.

The method returns an \`identifier\` you can pass to \`Page.removeScriptToEvaluateOnNewDocument\` if you need to stop injecting it mid-session. In most test scenarios you register the script in setup and let it run for the whole test, so removal is rarely needed.

## Overriding Network Headers

\`Network.setExtraHTTPHeaders\` adds headers to every outgoing request the page makes. This is the clean way to attach an auth token, a feature-flag header, a tenant identifier, or a tracing header to all requests without touching application code. Enable the Network domain first, then set the headers.

\`\`\`python
driver.execute_cdp_cmd("Network.enable", {})
driver.execute_cdp_cmd(
    "Network.setExtraHTTPHeaders",
    {
        "headers": {
            "Authorization": "Bearer test-token-abc123",
            "X-Feature-Flag": "new-checkout",
            "X-Tenant-Id": "acme",
        }
    },
)

driver.get("https://api-driven-app.example.com")
# Every XHR/fetch the page issues now carries these headers
\`\`\`

To spoof the user agent — useful for testing how a site responds to different clients — use \`Network.setUserAgentOverride\`, which also lets you set the platform and accept-language to keep the override internally consistent:

\`\`\`python
driver.execute_cdp_cmd("Network.enable", {})
driver.execute_cdp_cmd(
    "Network.setUserAgentOverride",
    {
        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                     "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "acceptLanguage": "en-US",
        "platform": "iPhone",
    },
)
driver.get("https://example.com")
\`\`\`

A caveat worth knowing: \`setExtraHTTPHeaders\` adds headers but cannot remove or read a response's headers, and it applies to requests initiated by the page, not to the top-level navigation triggered by \`driver.get\` in every Chrome version. If you need full control over a specific request or response — including faking the body — you need request interception via the Fetch domain, which is next.

## Intercepting and Faking Requests with Fetch

The \`Fetch\` domain is CDP's request-interception layer. When you enable it with URL patterns, Chrome pauses every matching request and waits for your code to decide what to do: let it continue unchanged, continue with modified headers, fail it (to test error handling), or fulfill it with a fabricated response (to stub an API). Because Selenium's \`execute_cdp_cmd\` does not stream events, the practical pattern with pure Selenium is to set up the interception rules and respond, often combined with Selenium's event listeners. For deterministic stubbing the most reliable approach is to fulfill matching requests immediately.

\`\`\`python
import json
from selenium import webdriver

driver = webdriver.Chrome()

# Pause requests matching the pattern so we can fake their responses
driver.execute_cdp_cmd("Fetch.enable", {
    "patterns": [{"urlPattern": "*/api/products*", "requestStage": "Request"}]
})

# In an event-driven setup you would receive Fetch.requestPaused with a requestId,
# then fulfill it. The fulfillment command looks like this:
fake_body = json.dumps([{"id": 1, "name": "Stubbed Product", "price": 9.99}])
fulfill_params = {
    "requestId": "<requestId-from-event>",
    "responseCode": 200,
    "responseHeaders": [{"name": "Content-Type", "value": "application/json"}],
    "body": __import__("base64").b64encode(fake_body.encode()).decode(),
}
# driver.execute_cdp_cmd("Fetch.fulfillRequest", fulfill_params)
\`\`\`

The body for \`Fetch.fulfillRequest\` must be base64-encoded, which is a common stumbling block — sending raw JSON silently fails. The four ways to handle a paused request map to four test goals:

| Fetch action | CDP method | Test goal |
|---|---|---|
| Continue unchanged | \`Fetch.continueRequest\` | Observe but do not alter |
| Continue with new headers | \`Fetch.continueRequest\` (+ headers) | Inject per-request auth |
| Fail the request | \`Fetch.failRequest\` | Test network-error handling |
| Fake the response | \`Fetch.fulfillRequest\` | Stub an API deterministically |

Because wiring up event listening with raw \`execute_cdp_cmd\` is verbose, many teams use Selenium's higher-level network interception (built on BiDi/CDP) for response stubbing and reserve \`execute_cdp_cmd\` for the one-shot configuration commands like geolocation and device emulation shown below. Either way, the underlying capability is the Fetch domain, and knowing its four actions tells you exactly what is possible.

## Spoofing Geolocation

Testing location-aware features — "stores near me", region-specific pricing, geofenced content — is painful without controlling the browser's reported position. \`Emulation.setGeolocationOverride\` fakes the coordinates that \`navigator.geolocation.getCurrentPosition\` returns. You must also grant the geolocation permission via \`Browser.grantPermissions\` so the page is allowed to read the position.

\`\`\`python
from selenium import webdriver

driver = webdriver.Chrome()

# Grant geolocation permission for the origin
driver.execute_cdp_cmd(
    "Browser.grantPermissions",
    {"origin": "https://example.com", "permissions": ["geolocation"]},
)

# Override the reported position to the Eiffel Tower
driver.execute_cdp_cmd(
    "Emulation.setGeolocationOverride",
    {"latitude": 48.8584, "longitude": 2.2945, "accuracy": 50},
)

driver.get("https://example.com/near-me")

# The page now reads these coordinates from navigator.geolocation
position = driver.execute_script("""
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        );
    });
""")
print(position)  # {'lat': 48.8584, 'lng': 2.2945}

driver.quit()
\`\`\`

Two details make this work reliably. The permission grant must precede the page reading the position, otherwise the browser prompts or rejects and the override never takes effect. And omitting \`accuracy\` causes some pages that check accuracy thresholds to behave unexpectedly, so always supply a realistic value. To simulate a user moving, call \`setGeolocationOverride\` repeatedly with new coordinates between assertions. To clear the override and return to real geolocation, call \`Emulation.clearGeolocationOverride\`.

## Network Throttling and Device Emulation

Two more CDP tricks round out the toolkit. \`Network.emulateNetworkConditions\` throttles bandwidth and latency so you can verify loading states, spinners, and timeouts behave under slow connections. \`Emulation.setDeviceMetricsOverride\` resizes the viewport and sets the device pixel ratio to emulate a phone, which combined with the user-agent override gives a convincing mobile environment.

\`\`\`python
# Throttle to a slow 3G-like profile
driver.execute_cdp_cmd("Network.enable", {})
driver.execute_cdp_cmd(
    "Network.emulateNetworkConditions",
    {
        "offline": False,
        "latency": 400,            # ms round-trip
        "downloadThroughput": 400 * 1024 // 8,   # ~400 kbps
        "uploadThroughput": 400 * 1024 // 8,
    },
)

# Emulate an iPhone-sized viewport
driver.execute_cdp_cmd(
    "Emulation.setDeviceMetricsOverride",
    {"width": 390, "height": 844, "deviceScaleFactor": 3, "mobile": True},
)

driver.get("https://example.com")
\`\`\`

Setting \`offline\` to \`True\` simulates a dropped connection, which is the cleanest way to test offline banners and retry logic. To restore normal conditions, call \`emulateNetworkConditions\` again with \`offline: False\` and large throughput values, and clear the device override with \`Emulation.clearDeviceMetricsOverride\`. These overrides persist for the session until cleared, so reset them in teardown if you reuse a driver across tests with different requirements.

## Combining CDP Overrides into a Reusable Test Fixture

In a real suite you rarely apply a single override in isolation; a test for a mobile, located, throttled experience needs the device metrics, geolocation, and network conditions all set before the page loads, and all cleared afterward so the next test starts clean. Wrapping these into a pytest fixture keeps the CDP plumbing out of the test body and guarantees teardown runs even when an assertion fails.

\`\`\`python
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


@pytest.fixture
def mobile_paris_driver():
    options = Options()
    driver = webdriver.Chrome(options=options)

    # Pre-inject a test hook before any page script runs
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": "window.__E2E__ = true;"},
    )

    # Emulate an iPhone-sized viewport
    driver.execute_cdp_cmd(
        "Emulation.setDeviceMetricsOverride",
        {"width": 390, "height": 844, "deviceScaleFactor": 3, "mobile": True},
    )

    # Grant permission and pin geolocation to Paris
    driver.execute_cdp_cmd(
        "Browser.grantPermissions",
        {"origin": "https://example.com", "permissions": ["geolocation"]},
    )
    driver.execute_cdp_cmd(
        "Emulation.setGeolocationOverride",
        {"latitude": 48.8584, "longitude": 2.2945, "accuracy": 50},
    )

    yield driver

    # Teardown: clear overrides and quit
    driver.execute_cdp_cmd("Emulation.clearGeolocationOverride", {})
    driver.execute_cdp_cmd("Emulation.clearDeviceMetricsOverride", {})
    driver.quit()


def test_near_me_shows_paris_stores(mobile_paris_driver):
    driver = mobile_paris_driver
    driver.get("https://example.com/near-me")
    heading = driver.find_element("css selector", "[data-test='city']").text
    assert "Paris" in heading
\`\`\`

The fixture makes the test read as a plain behavioral statement while the CDP configuration lives in one reusable place. The teardown half is just as important as the setup: overrides set with \`execute_cdp_cmd\` persist for the life of the driver session, so a test that throttles the network or pins geolocation will silently affect every later test that reuses the same driver unless you clear them. Putting the clears after the \`yield\` ensures they run on both pass and failure.

A subtle ordering rule applies to \`addScriptToEvaluateOnNewDocument\`: register it before the first \`driver.get\`, because it only takes effect on documents created after registration. Registering it inside the fixture, before any navigation, guarantees the hook is present on the very first page the test loads. The same is true for device and user-agent overrides that the page reads during its initial render — set them before navigating, not after.

## When to Use CDP and When Not To

CDP is a power tool, and like any power tool it has a right and wrong context. Reach for \`execute_cdp_cmd\` when you need a capability WebDriver does not expose and that capability makes the test more deterministic: injecting feature flags before boot, stubbing a flaky third-party API, pinning geolocation, or simulating offline. These uses remove nondeterminism and let you test code paths that are otherwise unreachable from a black-box test.

Avoid CDP when a portable WebDriver API already does the job, because every CDP call ties your test to Chromium and to protocol specifics that can shift between Chrome versions. Do not use CDP to defeat bot detection in production systems you do not own — that is both fragile and an abuse concern. And remember that a suite leaning heavily on CDP no longer runs unchanged on Firefox or Safari, which may matter for cross-browser coverage. A healthy pattern is to keep the bulk of your suite on standard WebDriver and use CDP surgically, in clearly-commented setup, for the specific things only it can do. When you find yourself needing event streams (every response body, every console message), graduate to Selenium's BiDi APIs, which are the standardized, cross-browser successor to ad-hoc CDP usage.

## Frequently Asked Questions

### What is execute_cdp_cmd in Selenium?

\`execute_cdp_cmd\` is a Selenium 4 method that sends a single Chrome DevTools Protocol command to the browser and returns its result synchronously. You call it as \`driver.execute_cdp_cmd("Domain.method", params_dict)\`, for example \`Network.setExtraHTTPHeaders\` or \`Page.addScriptToEvaluateOnNewDocument\`. It works only in Chromium browsers (Chrome and Edge) and is the primary way to access CDP capabilities that the portable WebDriver protocol does not expose.

### How is addScriptToEvaluateOnNewDocument different from execute_script?

\`execute_script\` runs JavaScript after the page has already loaded, so it is too late to define globals or patch APIs the app reads on startup. \`Page.addScriptToEvaluateOnNewDocument\` registers a script that runs before any of the page's own scripts, on every new document including in-page navigations and iframes. Use the latter for feature flags, API patches, and test hooks that must exist before the application boots.

### Can I use Selenium CDP commands with Firefox?

No. The Chrome DevTools Protocol is a Chromium technology, so \`execute_cdp_cmd\` works only in Chrome and Edge, not Firefox or Safari. If you need cross-browser network interception or event listening, use Selenium's WebDriver BiDi APIs instead, which are the standardized, browser-agnostic successor to ad-hoc CDP usage and work across multiple browser engines.

### Why does my CDP command do nothing?

The two most common causes are a domain that was not enabled and a params dictionary that does not match the CDP schema. Many domains require an explicit \`enable\` call first — for example \`Network.enable\` before \`Network.setExtraHTTPHeaders\`, or \`Fetch.enable\` before interception. Also confirm every key in \`params\` matches the CDP method reference exactly; a misspelled or extra key is silently ignored rather than raising an error.

### How do I fake geolocation in a Selenium test?

Grant the geolocation permission with \`Browser.grantPermissions\` for the origin, then call \`Emulation.setGeolocationOverride\` with \`latitude\`, \`longitude\`, and \`accuracy\`. The permission grant must come before the page reads the position, and supplying a realistic \`accuracy\` avoids issues with pages that check accuracy thresholds. Call \`Emulation.clearGeolocationOverride\` to return to the real position, and re-call the override with new coordinates to simulate movement.

### How do I stub an API response with the Fetch domain?

Enable interception with \`Fetch.enable\` and a URL pattern, which pauses matching requests. When a request is paused you respond with \`Fetch.fulfillRequest\`, supplying a \`responseCode\`, \`responseHeaders\`, and a base64-encoded \`body\` — the body must be base64, which is a frequent mistake. Because \`execute_cdp_cmd\` does not stream events, many teams use Selenium's higher-level network interception for this and reserve \`execute_cdp_cmd\` for one-shot configuration commands.

### Does setExtraHTTPHeaders override the headers on driver.get navigation?

\`Network.setExtraHTTPHeaders\` reliably adds headers to requests the page initiates, such as XHR and fetch calls, but its effect on the top-level navigation triggered by \`driver.get\` is not guaranteed across all Chrome versions. If you must control headers on a specific top-level request or modify the response, use the Fetch domain's request interception, which gives per-request control including the ability to add headers and rewrite the response.

### When should I avoid using CDP in Selenium tests?

Avoid CDP when a standard WebDriver API already accomplishes the task, because every CDP call couples the test to Chromium and to protocol details that can change between Chrome versions, breaking cross-browser coverage. Also avoid using it to defeat bot detection on systems you do not control. Use CDP surgically for capabilities only it provides — feature-flag injection, API stubbing, geolocation, offline simulation — and keep the rest of the suite on portable WebDriver commands.

## Conclusion

The Chrome DevTools Protocol turns Selenium from a black-box page driver into a browser you can reach inside and reconfigure. With \`execute_cdp_cmd\` you inject scripts before the page boots, override outgoing headers, intercept and fake requests, spoof geolocation, throttle the network, and emulate devices — capabilities the portable WebDriver API deliberately omits. The recurring rules are simple: enable the domain first, match the CDP schema exactly, base64-encode fulfilled bodies, and grant permissions before overriding the things they gate.

Use these techniques surgically. Lean on standard WebDriver for the bulk of your suite, drop into CDP for the specific determinism it buys, and graduate to Selenium's BiDi APIs when you need event streams across browsers. For more Selenium and cross-browser testing guides, plus ready-to-install testing skills for your AI coding agent, explore the [QASkills.sh skills directory](/skills) and the full library of deep-dives on the [QASkills.sh blog](/blog).
`,
};
