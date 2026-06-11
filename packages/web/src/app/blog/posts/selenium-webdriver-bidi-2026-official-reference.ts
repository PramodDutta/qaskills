import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium WebDriver BiDi 2026: Official CDP Replacement',
  description:
    'Selenium WebDriver BiDi reference for 2026: enable BiDi, intercept network, capture console logs and JS errors, mock requests, and migrate off Chrome-only CDP.',
  date: '2026-06-11',
  category: 'Reference',
  content: `
# Selenium WebDriver BiDi 2026: Official CDP Replacement

For years, the most powerful Selenium features — network interception, console log capture, request mocking, and JavaScript error listening — were only possible through the Chrome DevTools Protocol (CDP). That worked, but it was a Chromium-only escape hatch bolted onto a cross-browser tool. Every CDP call you wrote was code that would never run on Firefox, and it broke whenever Chrome bumped its DevTools version. Selenium maintained a different CDP version binding for every Chrome release, which is exactly the kind of maintenance treadmill the project wanted to leave behind. WebDriver BiDi is the answer: a single, standardized, bidirectional protocol designed by the W3C and implemented natively by Chrome, Edge, and Firefox.

WebDriver BiDi (bidirectional) fills the gap between classic WebDriver (request/response, one direction at a time) and CDP (rich events, Chromium-only). It is a real W3C standard with cross-browser buy-in, and Selenium 4.x exposes it through first-class APIs in Java, Python, JavaScript, .NET, and Ruby. With BiDi you can subscribe to live browser events — network requests, console messages, log entries, new browsing contexts — and react to them as they happen, the same way you would with CDP, but with code that runs unchanged across browsers. This is the strategic direction: Selenium is steadily moving its "DevTools" capabilities from CDP onto BiDi, and CDP is being treated as legacy.

This reference is a practical, runnable map of WebDriver BiDi in Selenium 4.x for 2026. We cover how to enable BiDi, how it differs from CDP, network interception and request mocking, console and JavaScript error capture, listening for new browser contexts, handling basic authentication, and a clear migration path off CDP. Every example is given in both Java and Python with the official Selenium bindings. If you searched for "selenium webdriver bidi official documentation," this page is built to be your answer. For more automation depth, browse the [skills directory](/skills) and our [Playwright locator best practices guide](/blog/playwright-locator-best-practices-web-first-assertions-2026).

## What Is WebDriver BiDi and Why It Replaces CDP

Classic WebDriver is a synchronous, request/response protocol: your test sends a command (\`click\`, \`findElement\`), the browser replies, and that is the whole conversation. It has no way to push events back to you, so it cannot tell you "a network request just started" or "the page logged an error." CDP solved that for Chromium by opening a WebSocket and streaming events, but it is a proprietary protocol that only Chrome and Edge speak, and its API changes between versions.

WebDriver BiDi keeps the standardization of WebDriver and adds the event streaming of CDP. It runs over a WebSocket, supports subscriptions to event types, and is being implemented natively by browser vendors as a W3C specification. The result is the best of both worlds: a cross-browser, standardized, bidirectional protocol.

| Dimension | Classic WebDriver | CDP (Chrome DevTools Protocol) | WebDriver BiDi |
|---|---|---|---|
| Direction | Request/response only | Bidirectional (events) | Bidirectional (events) |
| Standardization | W3C standard | Proprietary (Chromium) | W3C standard |
| Browser support | All major browsers | Chrome, Edge only | Chrome, Edge, Firefox |
| Version stability | Stable | Changes per Chrome release | Stable spec |
| Network interception | No | Yes | Yes |
| Console/log events | No | Yes | Yes |
| Selenium future | Core protocol | Legacy/deprecated path | Recommended path |

The takeaway: any new code that needs events, interception, or logs should be written against BiDi. CDP still works in Selenium 4.x, but it is the path the project is moving away from.

## Enabling WebDriver BiDi in Selenium 4.x

BiDi is opt-in. You ask the browser to open a BiDi WebSocket either by setting the \`webSocketUrl\` capability to \`true\`, or by using the convenience option \`enableBiDi()\` on the browser options object in newer Selenium releases. Once the session is created with BiDi enabled, the driver exposes BiDi modules you can interact with.

\`\`\`java
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.WebDriver;

public class EnableBiDi {
  public static void main(String[] args) {
    ChromeOptions options = new ChromeOptions();
    // Ask the browser to expose a BiDi WebSocket endpoint
    options.setCapability("webSocketUrl", true);
    // Selenium 4.x convenience equivalent:
    // options.enableBiDi();

    WebDriver driver = new ChromeDriver(options);
    try {
      driver.get("https://www.selenium.dev");
      System.out.println("BiDi session active: " + driver.getTitle());
    } finally {
      driver.quit();
    }
  }
}
\`\`\`

In Python, set the same capability through the options object before constructing the driver.

\`\`\`python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
# Enable the BiDi WebSocket for this session
options.web_socket_url = True
# (older releases: options.set_capability("webSocketUrl", True))

driver = webdriver.Chrome(options=options)
try:
    driver.get("https://www.selenium.dev")
    print("BiDi session active:", driver.title)
finally:
    driver.quit()
\`\`\`

If \`webSocketUrl\` is not set, the BiDi modules raise an error when you try to use them — so always enable it up front when a test relies on events or interception.

## Capturing Console Logs With BiDi

One of the most requested capabilities is reading what the page logged to the browser console. With BiDi you subscribe to log entries and receive each one as it is produced, including the level, text, and arguments.

\`\`\`java
import org.openqa.selenium.bidi.module.LogInspector;
import org.openqa.selenium.bidi.log.ConsoleLogEntry;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

LogInspector logInspector = new LogInspector(driver);
List<ConsoleLogEntry> entries = new CopyOnWriteArrayList<>();

logInspector.onConsoleEntry(entries::add);

driver.get("https://example.com");
// trigger logs in the app under test, then assert
for (ConsoleLogEntry entry : entries) {
  System.out.println(entry.getLevel() + ": " + entry.getText());
}
\`\`\`

The Python binding exposes the same idea through the \`script\` BiDi module's log helpers.

\`\`\`python
log_entries = []

# add_console_message_handler streams console.* output as it happens
driver.script.add_console_message_handler(lambda entry: log_entries.append(entry))

driver.get("https://example.com")
# trigger app logs, then inspect
for entry in log_entries:
    print(entry.level, entry.text)
\`\`\`

Because these are live event handlers, register them before the action that produces the log. Anything logged before the handler is attached will not be captured.

## Listening for JavaScript Errors

Uncaught JavaScript exceptions are a frequent source of silent product breakage. BiDi surfaces them as a distinct event so you can fail a test the moment the page throws, instead of discovering it through a downstream symptom.

\`\`\`java
import org.openqa.selenium.bidi.module.LogInspector;
import org.openqa.selenium.bidi.log.JavascriptLogEntry;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

LogInspector logInspector = new LogInspector(driver);
List<JavascriptLogEntry> jsErrors = new CopyOnWriteArrayList<>();

logInspector.onJavaScriptException(jsErrors::add);

driver.get("https://example.com/buggy-page");
// after exercising the page:
if (!jsErrors.isEmpty()) {
  throw new AssertionError("Page threw JS error: " + jsErrors.get(0).getText());
}
\`\`\`

\`\`\`python
js_errors = []

driver.script.add_javascript_error_handler(lambda entry: js_errors.append(entry))

driver.get("https://example.com/buggy-page")
# exercise the page, then assert
assert not js_errors, f"Page threw JS error: {js_errors[0].text}"
\`\`\`

Wiring this handler into a base test fixture means every test in your suite implicitly fails on uncaught JavaScript errors — a high-value, low-cost safety net.

## Network Interception and Monitoring

BiDi's network module lets you observe requests and responses as they flow. You can subscribe to \`beforeRequestSent\`, \`responseStarted\`, and \`responseCompleted\` events to assert on URLs, status codes, headers, and timing without proxies or browser extensions.

\`\`\`java
import org.openqa.selenium.bidi.module.Network;
import org.openqa.selenium.bidi.network.ResponseDetails;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

Network network = new Network(driver);
List<String> seen = new CopyOnWriteArrayList<>();

network.onResponseCompleted(response -> {
  ResponseDetails details = response.getResponseData();
  seen.add(details.getStatus() + " " + details.getUrl());
});

driver.get("https://example.com");
// assert that an expected API call returned 200
boolean ok = seen.stream().anyMatch(s -> s.startsWith("200") && s.contains("/api/"));
System.out.println("API call observed: " + ok);
\`\`\`

\`\`\`python
responses = []

driver.network.add_response_completed_handler(
    lambda event: responses.append((event.response.status, event.request.url))
)

driver.get("https://example.com")
# verify the API responded successfully
assert any(status == 200 and "/api/" in url for status, url in responses)
\`\`\`

Network monitoring is read-only observation; the next section shows how to actively change requests and responses.

## Intercepting and Mocking Requests

The real power of BiDi is intercepting requests: you register interest in a URL pattern and a phase (\`beforeRequestSent\` or \`responseStarted\`), the browser pauses matching traffic, and your handler decides what to do — continue it, fail it, or provide a mocked response. This is how you stub a flaky third-party API or force an error path deterministically.

\`\`\`java
import org.openqa.selenium.bidi.module.Network;
import org.openqa.selenium.bidi.network.AddInterceptParameters;
import org.openqa.selenium.bidi.network.InterceptPhase;

Network network = new Network(driver);

// Intercept responses for a specific endpoint
String intercept = network.addIntercept(
    new AddInterceptParameters(InterceptPhase.RESPONSE_STARTED));

network.onResponseStarted(response -> {
  if (response.getRequest().getUrl().contains("/api/price")) {
    // provide a deterministic mocked body and let it continue
    network.provideResponse(response.getRequest().getRequestId());
  } else {
    network.continueResponse(response.getRequest().getRequestId());
  }
});

driver.get("https://example.com/checkout");
network.removeIntercept(intercept);
\`\`\`

\`\`\`python
# Block all image requests to speed up a test run
intercept = driver.network.add_request_handler(
    url_patterns=["*.png", "*.jpg", "*.gif"],
    handler=lambda event: driver.network.fail_request(event.request.request_id),
)

driver.get("https://example.com/gallery")
driver.network.remove_request_handler(intercept)
\`\`\`

Always remove the intercept when you are done, or it will keep pausing traffic for the rest of the session and can hang later navigations.

## Handling Basic Authentication

HTTP Basic Auth dialogs are native browser prompts that classic WebDriver cannot dismiss. BiDi intercepts the \`authRequired\` phase, letting you supply credentials programmatically so the dialog never blocks your test.

\`\`\`java
import org.openqa.selenium.bidi.module.Network;
import org.openqa.selenium.UsernameAndPassword;

Network network = new Network(driver);
network.onAuthRequired(authRequired ->
    network.continueWithAuth(
        authRequired.getRequest().getRequestId(),
        new UsernameAndPassword("admin", "s3cret")));

driver.get("https://the-internet.herokuapp.com/basic_auth");
\`\`\`

\`\`\`python
driver.network.add_auth_handler(
    username="admin",
    password="s3cret",
)

driver.get("https://the-internet.herokuapp.com/basic_auth")
\`\`\`

This is far more reliable than embedding credentials in the URL, which modern browsers increasingly block for security reasons.

## Listening for New Browsing Contexts

A "browsing context" in BiDi terms is a tab, window, or iframe. The browsing-context module lets you react when the app opens a new tab or popup — for example, to grab a window opened by \`target="_blank"\` and assert on it without polling \`getWindowHandles()\`.

\`\`\`java
import org.openqa.selenium.bidi.module.BrowsingContextInspector;

BrowsingContextInspector inspector = new BrowsingContextInspector(driver);
inspector.onBrowsingContextCreated(context ->
    System.out.println("New context opened: " + context.getUrl()));

driver.get("https://example.com");
// clicking a target=_blank link now fires the handler
driver.findElement(org.openqa.selenium.By.linkText("Open in new tab")).click();
\`\`\`

\`\`\`python
contexts = []
driver.browsing_context.add_context_created_handler(
    lambda info: contexts.append(info)
)

driver.get("https://example.com")
# clicking a popup link appends to contexts as it opens
\`\`\`

Event-driven context handling removes the brittle "wait then count window handles" patterns that plagued multi-tab tests.

## Evaluating Scripts and Preload Scripts

Beyond observing events, BiDi can run JavaScript inside the page through its script module. Two patterns matter most. First, on-demand evaluation: run an expression in a context and get the serialized result back, which is cleaner than the classic \`executeScript\` for complex return values. Second, preload scripts: register a script that runs automatically at the start of every document load, before the page's own scripts execute. Preload scripts are perfect for stubbing browser APIs, injecting test hooks, or seeding state deterministically on every navigation.

\`\`\`java
import org.openqa.selenium.bidi.module.Script;
import org.openqa.selenium.bidi.script.EvaluateResult;
import org.openqa.selenium.bidi.script.ContextTarget;

Script script = new Script(driver);
String context = driver.getWindowHandle();

// Register a preload script that runs before every document loads
script.addPreloadScript("window.__TEST_HOOKS__ = { seeded: true };");

driver.get("https://example.com");

// Evaluate an expression in the page and read the result
EvaluateResult result = script.evaluate(
    "window.__TEST_HOOKS__.seeded",
    new ContextTarget(context),
    true);
System.out.println("Hook present: " + result);
\`\`\`

\`\`\`python
# Preload runs before the page's own JS on every navigation
driver.script.add_preload_script("window.__TEST_HOOKS__ = { seeded: true };")

driver.get("https://example.com")

# Evaluate an expression inside the page context
value = driver.script.evaluate(
    expression="window.__TEST_HOOKS__.seeded",
    target={"context": driver.current_window_handle},
    await_promise=True,
)
print("Hook present:", value)
\`\`\`

Preload scripts are the BiDi-native replacement for the CDP \`Page.addScriptToEvaluateOnNewDocument\` pattern, and they run cross-browser.

## A Complete BiDi Test Walkthrough

Tying the modules together, here is a realistic test that enables BiDi, fails fast on JavaScript errors, mocks a flaky pricing API, and asserts that the page rendered the mocked value. This is the shape of a production BiDi test: handlers attached up front, deterministic mocking, clean teardown.

\`\`\`python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

options = Options()
options.web_socket_url = True
driver = webdriver.Chrome(options=options)

js_errors = []
driver.script.add_javascript_error_handler(lambda e: js_errors.append(e))

# Block the real pricing call so the test is deterministic and offline-safe
intercept = driver.network.add_request_handler(
    url_patterns=["*/api/price*"],
    handler=lambda event: driver.network.fail_request(event.request.request_id),
)

try:
    driver.get("https://example.com/checkout")
    total = driver.find_element(By.CSS_SELECTOR, "[data-test=total]").text
    assert not js_errors, f"Page threw: {js_errors[0].text}"
    print("Rendered total:", total)
finally:
    driver.network.remove_request_handler(intercept)
    driver.quit()
\`\`\`

This single test demonstrates the entire value proposition of BiDi: cross-browser event handling, deterministic network control, and built-in error safety, all without a Chromium-only CDP dependency. The same logic runs unchanged if you swap \`Chrome\` for \`Firefox\`.

## BiDi Capability and Feature Reference

The table below summarizes the main BiDi modules exposed through Selenium 4.x and what each one is for. Module and method names vary slightly between language bindings, but the capability set is shared.

| BiDi module | Purpose | Key Java entry point | Key Python entry point |
|---|---|---|---|
| Log | Console + JS error events | \`LogInspector\` | \`driver.script\` log handlers |
| Network | Monitor + intercept + mock | \`Network\` | \`driver.network\` |
| Script | Evaluate, preload, console handlers | \`Script\` | \`driver.script\` |
| Browsing Context | Tabs, windows, iframes | \`BrowsingContextInspector\` | \`driver.browsing_context\` |
| Storage | Cookies and storage | \`Storage\` | \`driver.storage\` |
| Input | Low-level input via BiDi | \`Input\` | \`driver.input\` |

When in doubt about exact method names for your binding version, check the official Selenium BiDi documentation for your language — the project is actively expanding these APIs across releases.

## Migrating From CDP to BiDi

If you have existing CDP code (\`devTools.send(...)\`, \`Network.enable\`, \`Log.enable\`, \`Fetch.enable\`), the migration is conceptual as much as mechanical: replace per-Chrome-version CDP bindings with the stable BiDi modules. The mapping is direct for the common cases.

| CDP usage | BiDi replacement |
|---|---|
| \`Network.requestWillBeSent\` events | \`Network.onBeforeRequestSent\` |
| \`Fetch.enable\` + \`Fetch.fulfillRequest\` | \`Network.addIntercept\` + \`provideResponse\` |
| \`Log.entryAdded\` / \`Runtime.consoleAPICalled\` | \`LogInspector.onConsoleEntry\` |
| \`Runtime.exceptionThrown\` | \`LogInspector.onJavaScriptException\` |
| \`Network.authChallengeRequired\` | \`Network.onAuthRequired\` |
| \`Target.targetCreated\` | \`BrowsingContextInspector.onBrowsingContextCreated\` |

Migrate incrementally: pick one CDP-dependent test, swap it to BiDi, confirm it passes on both Chrome and Firefox, then roll the pattern out. The payoff is code that survives Chrome upgrades and runs cross-browser. For broader test design ideas, compare load-testing approaches in our [Locust vs JMeter guide](/blog/locust-vs-jmeter-2026-which-load-testing) and accessibility automation in the [axe-core with Playwright guide](/blog/axe-core-playwright-accessibility-testing-2026).

## Combining BiDi With Classic WebDriver

BiDi does not replace your existing Selenium test code — it augments it. The same driver object that you use for classic commands (\`get\`, \`findElement\`, \`click\`, explicit waits) also exposes the BiDi modules. You attach event handlers and intercepts for the bidirectional features you need, while the bulk of your test stays ordinary WebDriver. This means adopting BiDi is incremental and non-disruptive: there is no separate "BiDi driver" to manage, no parallel session to coordinate, and your page objects and waits keep working exactly as before.

\`\`\`java
import org.openqa.selenium.By;
import org.openqa.selenium.bidi.module.LogInspector;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import java.time.Duration;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

// BiDi event handler on the same driver as classic WebDriver calls
LogInspector logInspector = new LogInspector(driver);
List<Object> errors = new CopyOnWriteArrayList<>();
logInspector.onJavaScriptException(errors::add);

// Ordinary WebDriver interactions continue as normal
driver.get("https://example.com/login");
new WebDriverWait(driver, Duration.ofSeconds(10))
    .until(ExpectedConditions.elementToBeClickable(By.id("submit")))
    .click();

if (!errors.isEmpty()) {
  throw new AssertionError("Login page threw a JS error");
}
\`\`\`

This hybrid model is the recommended adoption path: keep your battle-tested WebDriver suite, and sprinkle BiDi handlers onto the tests that genuinely need network control, log capture, or error detection.

## Known Limitations and Version Notes

WebDriver BiDi in Selenium is mature but still evolving, so a few caveats are worth knowing. First, the BiDi API surface differs in maturity across language bindings — Java and Python lead, while some helpers land later in other languages, so check the docs for your binding and version. Second, method and class names have shifted between minor Selenium releases as the API stabilizes; pin your version and read release notes before upgrading. Third, browser implementations of the BiDi spec are not perfectly uniform yet, so an edge-case event may behave slightly differently on Firefox versus Chrome — run a cross-browser smoke suite to catch these. Fourth, very low-level features that only Chromium exposes may still require CDP for now; BiDi covers the common, standardized cases, and the CDP fallback remains available in Selenium 4.x for the rest. None of these block production use of the core features — network interception, log capture, error listening, auth, and context events are all solid — but they are the kind of thing to verify against your target browsers and Selenium version rather than assume.

## Best Practices for BiDi in CI

Treat BiDi handlers as resources with a lifecycle: attach them before the triggering action and detach intercepts in teardown. Keep handler callbacks small and non-blocking — push events into a thread-safe collection and assert afterward, rather than doing heavy work inside the event loop. Enable BiDi only on the tests that need it, since opening the WebSocket adds a little startup cost. In CI, run a BiDi smoke suite on both a Chromium browser and Firefox to prove your event code is genuinely cross-browser and not silently Chrome-only. Pin your Selenium version and review release notes, because the BiDi API surface is still growing and method names occasionally shift between minor releases. Finally, fail fast on JavaScript errors by wiring the JS exception handler into a shared base fixture so every test inherits the guard. Installable, agent-ready Selenium and Playwright skills live in the [skills directory](/skills).

## Frequently Asked Questions

### What is WebDriver BiDi in Selenium?

WebDriver BiDi is a W3C-standardized bidirectional protocol that lets Selenium subscribe to live browser events — network requests, console logs, JavaScript errors, and new tabs — over a WebSocket. It brings CDP-style power to Selenium while running cross-browser on Chrome, Edge, and Firefox, unlike the Chromium-only CDP.

### How do I enable WebDriver BiDi?

Set the \`webSocketUrl\` capability to \`true\` on your browser options before creating the driver, or call \`enableBiDi()\` in newer Selenium releases. In Python use \`options.web_socket_url = True\`. Once the session starts with BiDi enabled, the driver exposes BiDi modules for network, logs, script, and browsing contexts.

### Is CDP deprecated in Selenium?

CDP still works in Selenium 4.x but is treated as a legacy path. Selenium is steadily migrating its DevTools features onto WebDriver BiDi because CDP is Chromium-only and its bindings change with every Chrome version. New automation that needs events, interception, or logs should be written against BiDi rather than CDP.

### What is the difference between WebDriver BiDi and CDP?

CDP is a proprietary Chromium-only protocol whose API changes per Chrome release. WebDriver BiDi is a W3C standard implemented natively by Chrome, Edge, and Firefox, so the same code runs across browsers and stays stable across versions. Both are bidirectional and support events, interception, and console capture.

### Can WebDriver BiDi intercept and mock network requests?

Yes. The BiDi network module supports \`addIntercept\` with a phase and URL pattern. The browser pauses matching traffic and your handler can continue it, fail it, or provide a mocked response. This lets you stub flaky third-party APIs, force error paths, or block heavy assets like images to speed up tests.

### Does WebDriver BiDi work on Firefox?

Yes. Cross-browser support is the whole point of BiDi. Firefox implements WebDriver BiDi natively alongside Chrome and Edge, so event subscriptions, network monitoring, and log capture work in Firefox without the Chromium-only limitations of CDP. Run a BiDi smoke suite on Firefox in CI to verify your event code is truly portable.

### How do I capture JavaScript errors with Selenium BiDi?

Register a JavaScript exception handler through the log module: \`logInspector.onJavaScriptException(...)\` in Java or \`driver.script.add_javascript_error_handler(...)\` in Python. Attach it before navigating, then assert the collected list is empty. Wiring this into a shared base fixture makes every test in your suite fail automatically on uncaught page errors.

## Conclusion

WebDriver BiDi is the future of advanced Selenium automation. It delivers everything teams used CDP for — network interception, request mocking, console capture, JavaScript error listening, basic-auth handling, and new-context events — but as a standardized, cross-browser protocol that survives browser upgrades. If you are still leaning on CDP, start migrating one test at a time using the mapping table above, and verify each on both Chrome and Firefox.

Ready to put this into practice? Browse runnable, agent-ready Selenium and Playwright skills in the [skills directory](/skills), and pair this reference with our [Playwright locator best practices guide](/blog/playwright-locator-best-practices-web-first-assertions-2026) and the [Selenium Manager driver management guide](/blog/selenium-manager-4-6-driver-management-2026-guide) to build a modern, low-maintenance browser automation stack.
`,
};
