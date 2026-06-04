import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium WebDriver BiDi Protocol Reference 2026',
  description:
    'Selenium WebDriver BiDi protocol reference: bidirectional events, network interception, console log capture, and the Selenium 4.6+ BiDi API in Java and Python.',
  date: '2026-06-04',
  category: 'Reference',
  content: `
# Selenium WebDriver BiDi Protocol Reference 2026

For most of its history, Selenium spoke to browsers over classic WebDriver — a request/response protocol where your test sends a command and waits for a single reply. That model is perfect for "click this" and "read that text," but it has a fundamental blind spot: it cannot listen. There is no way in classic WebDriver to be told "a console error just appeared" or "the page just made a network request" the instant it happens. You can only poll. WebDriver BiDi closes that gap. It is a bidirectional protocol — a WebSocket connection over which the browser pushes events to your test in real time while you can still send commands. BiDi is a W3C standard, it is cross-browser by design, and as of Selenium 4.6 and later it is exposed through stable, ergonomic APIs in both Java and Python.

This guide is a practical 2026 reference for using WebDriver BiDi from Selenium. We explain what BiDi is and how it differs from both classic WebDriver and the Chrome-only DevTools Protocol, then work through the capabilities engineers reach for most: subscribing to browser events, capturing console log messages as they are emitted, listening for and reacting to JavaScript exceptions, intercepting and modifying network requests and responses, and monitoring navigation and DOM events. Every technique is shown in both Java and Python so you can drop it into whichever binding your team uses, running against Selenium 4.x and a current Chrome or Firefox.

The reason BiDi matters in 2026 is that it makes Selenium tests both more capable and more portable at the same time. The event-driven things you previously did with brittle, Chromium-only \`execute_cdp_cmd\` calls — reading every console message, stubbing a network response, catching an uncaught exception — are now first-class, standardized, and work across browser engines. If you have a suite leaning on raw CDP, BiDi is the path to the same power without locking yourself to Chrome.

## What WebDriver BiDi Is and Why It Exists

WebDriver BiDi ("BiDi" for bidirectional) is a W3C specification for a two-way communication channel between an automation client and a browser. Where classic WebDriver uses HTTP and is strictly command-then-response, BiDi runs over a WebSocket so the browser can push events to the client unprompted. Your test can subscribe to a category of events — log entries, network requests, navigation — and a callback fires every time one occurs, all while you continue issuing normal commands.

The crucial design goal is standardization. The Chrome DevTools Protocol delivers similar event-driven power, but it is a Chromium-only, vendor-controlled protocol that changes without notice between Chrome versions. BiDi is governed by the same W3C process as WebDriver itself, which means browser vendors implement it to a shared spec and your event-driven test code runs on Chrome, Edge, and Firefox alike. The table below frames the three protocols so the role of BiDi is clear.

| Protocol | Direction | Standard | Browser support | Best for |
|---|---|---|---|---|
| Classic WebDriver | Command then response | W3C | All major browsers | Driving the page (click, type, read) |
| Chrome DevTools (CDP) | Bidirectional | Vendor (Chromium) | Chrome/Edge only | Chrome-specific event work |
| WebDriver BiDi | Bidirectional | W3C | Chrome, Edge, Firefox | Cross-browser events + interception |

In Selenium terms you do not abandon classic WebDriver when you adopt BiDi — you use both. The same \`driver\` object drives the page with familiar commands and, through its BiDi modules, subscribes to events and intercepts the network. Selenium negotiates a BiDi-capable session for you when you opt in, then surfaces the protocol through high-level helper classes rather than making you craft raw WebSocket messages.

## Enabling BiDi in a Selenium Session

To use BiDi you must request a BiDi-enabled session. In recent Selenium versions you opt in through the browser options, and Selenium establishes the WebSocket alongside the classic session. The exact toggle has evolved across 4.x releases, but the principle is the same in both bindings: enable web-socket/BiDi on the options, then create the driver.

\`\`\`java
// Java — enable BiDi via ChromeOptions
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

ChromeOptions options = new ChromeOptions();
options.setCapability("webSocketUrl", true); // requests a BiDi session

ChromeDriver driver = new ChromeDriver(options);
// driver now exposes BiDi modules: Network, LogInspector, etc.
\`\`\`

\`\`\`python
# Python — enable BiDi via options
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

options = Options()
options.set_capability("webSocketUrl", True)  # requests a BiDi session

driver = webdriver.Chrome(options=options)
# driver.script, driver.network, and helper modules are now usable
\`\`\`

Once the session is BiDi-capable, Selenium's helper APIs become available. In Java these are dedicated classes such as \`LogInspector\`, \`Network\`, and the \`bidi\` module accessors you construct around the driver. In Python the functionality is exposed through driver attributes and the \`selenium.webdriver.common.bidi\` modules. The remaining sections use these helpers; the only prerequisite is the BiDi-enabled session shown here.

A note on versions: BiDi support has matured steadily through Selenium 4.6 onward, and the helper class names and import paths have shifted as features stabilized. The capabilities described here — log capture, exception listening, network interception — are available in current 4.x releases, but always check your installed Selenium version's API for the exact class and method names, since BiDi is an actively evolving surface.

## Capturing Console Log Messages

One of the most immediately useful BiDi features is real-time console log capture. Classic WebDriver's logging API was limited and inconsistent across browsers; BiDi standardizes a \`log.entryAdded\` event that fires for every console message the moment it is emitted. You register a handler and collect entries as the page runs, then assert on them.

\`\`\`java
// Java — capture console logs with LogInspector
import org.openqa.selenium.bidi.module.LogInspector;
import org.openqa.selenium.bidi.log.ConsoleLogEntry;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

List<ConsoleLogEntry> logs = new CopyOnWriteArrayList<>();

try (LogInspector inspector = new LogInspector(driver)) {
    inspector.onConsoleEntry(logs::add);

    driver.get("https://example.com");

    // Assert no error-level console messages appeared
    long errors = logs.stream()
        .filter(e -> "error".equals(e.getLevel().toString().toLowerCase()))
        .count();
    org.junit.jupiter.api.Assertions.assertEquals(0, errors, "Unexpected console errors");
}
\`\`\`

\`\`\`python
# Python — capture console logs
log_entries = []

def collect(entry):
    log_entries.append(entry)

driver.script.add_console_message_handler(collect)

driver.get("https://example.com")

# Assert no error-level console messages appeared
errors = [e for e in log_entries if getattr(e, "level", "").lower() == "error"]
assert not errors, f"Unexpected console errors: {errors}"
\`\`\`

The power here is timing: because the handler fires on the \`log.entryAdded\` event, you capture messages that appear during page load, during async operations, and during user interactions — not just whatever happened to be in a buffer when you polled. A common, high-value test is asserting that a page produces zero console errors, which catches a whole class of regressions (failed asset loads, uncaught promise rejections logged as errors, framework warnings) that functional assertions miss entirely. Each entry carries its level, text, source, and timestamp, so you can filter precisely.

## Listening for JavaScript Exceptions

Closely related to console logging is BiDi's ability to surface uncaught JavaScript exceptions through the same log stream as \`javascript\`-type entries (and, depending on the binding, a dedicated exception handler). An uncaught exception in the page often does not fail a Selenium test on its own — the click succeeded, the assertion on visible text passed — yet the application is silently broken. BiDi lets you catch these so a thrown error fails the test.

\`\`\`java
// Java — treat uncaught JS exceptions as test failures
import org.openqa.selenium.bidi.module.LogInspector;
import org.openqa.selenium.bidi.log.JavascriptLogEntry;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.List;

List<JavascriptLogEntry> jsErrors = new CopyOnWriteArrayList<>();

try (LogInspector inspector = new LogInspector(driver)) {
    inspector.onJavaScriptException(jsErrors::add);

    driver.get("https://example.com/checkout");
    driver.findElement(org.openqa.selenium.By.id("pay")).click();

    org.junit.jupiter.api.Assertions.assertTrue(
        jsErrors.isEmpty(),
        "Page threw JS exceptions: " + jsErrors
    );
}
\`\`\`

\`\`\`python
# Python — capture JavaScript exceptions
js_exceptions = []

def on_exception(entry):
    js_exceptions.append(entry)

driver.script.add_javascript_error_handler(on_exception)

driver.get("https://example.com/checkout")
driver.find_element("id", "pay").click()

assert not js_exceptions, f"Page threw JS exceptions: {js_exceptions}"
\`\`\`

Wiring exception capture into a base test class — so every test in the suite automatically fails on an uncaught page error — is one of the highest-leverage uses of BiDi. It converts a category of invisible defects into loud, immediate test failures without writing a single new assertion per test. The handler delivers the error text and, where available, a stack trace, so failures are actionable rather than just "something threw."

## Intercepting and Modifying Network Traffic

BiDi's network module is the standardized, cross-browser answer to request interception. You can observe requests and responses as events, and you can register interception phases that pause matching requests so your code can continue them, fail them, or provide a fake response. This is exactly the capability that previously required Chrome-only CDP \`Fetch\` calls, now available on Firefox and Edge too.

The two everyday patterns are observing traffic and stubbing it. Observing is a read-only subscription:

\`\`\`java
// Java — observe network requests before they are sent
import org.openqa.selenium.bidi.module.Network;

try (Network network = new Network(driver)) {
    network.onBeforeRequestSent(event ->
        System.out.println("Request: " + event.getRequest().getMethod()
            + " " + event.getRequest().getUrl())
    );
    driver.get("https://example.com");
}
\`\`\`

\`\`\`python
# Python — observe network requests
def on_request(event):
    print("Request:", event.request.method, event.request.url)

driver.network.add_request_handler(on_request)
driver.get("https://example.com")
\`\`\`

Stubbing intercepts a request and supplies a fabricated response, which makes tests deterministic by removing dependence on a live backend or flaky third party. The shape below shows providing a fake response for a matching URL; consult your Selenium version for the exact builder names, as the network-intercept API is one of the newer BiDi surfaces.

\`\`\`python
# Python — fail requests to a flaky analytics host so they never block the test
def block_analytics(event):
    if "analytics.example.com" in event.request.url:
        driver.network.fail_request(event.request.request_id)
    else:
        driver.network.continue_request(event.request.request_id)

driver.network.add_intercept(phases=["beforeRequestSent"])
driver.network.add_request_handler(block_analytics)
driver.get("https://example.com")
\`\`\`

The interception actions mirror the four decisions you can make about any paused request, and they map directly to test goals.

| BiDi network action | Test goal |
|---|---|
| Continue request | Observe traffic without altering it |
| Continue with modified headers | Inject auth or feature-flag headers per request |
| Fail request | Verify error handling and block flaky third parties |
| Provide response | Stub an API deterministically for fast, reliable tests |

Because this all runs over the standardized BiDi protocol, the same interception logic that stubs an endpoint in Chrome also stubs it in Firefox. That cross-browser parity is the practical payoff of BiDi over CDP: write the interception once, run it everywhere.

## Monitoring Navigation and DOM Events

Beyond logs and network, BiDi exposes browsing-context events such as navigation start, DOM content loaded, and load completion. Subscribing to these lets a test react to lifecycle moments precisely rather than guessing with sleeps. For example, you can confirm that a single-page-app route change actually triggered a fragment navigation, or measure the time between navigation start and DOM-ready.

\`\`\`python
# Python — react to navigation lifecycle events
def on_load(event):
    print("Loaded:", event.url)

driver.script.pin  # (illustrative) ensure session is active
# Subscribe to the load event for the current browsing context
driver.network  # network and browsing-context modules share the BiDi session

# Conceptually: register a handler for browsingContext.load
# then navigate and let the handler fire
driver.get("https://example.com")
\`\`\`

The browsing-context events are especially useful for SPAs where classic "wait for page load" semantics do not apply because navigation happens without a full document reload. By listening for the specific BiDi events, a test synchronizes on the real lifecycle the browser reports rather than on a heuristic. As with the other modules, the exact handler names depend on your Selenium version, but the model is identical: enable BiDi, register a handler, and your callback runs each time the event fires.

## Building a BiDi Safety Net Into Your Base Test Class

The single highest-return way to adopt BiDi is to wire console-error and exception capture into the base class that every test inherits from, so the entire suite gains a safety net with zero per-test effort. Any test that drives a page now fails automatically if the page logs an error or throws an uncaught exception, surfacing a whole category of defects that functional assertions never catch.

\`\`\`java
// Java — JUnit 5 base class that fails on console errors or JS exceptions
import org.junit.jupiter.api.*;
import org.openqa.selenium.bidi.module.LogInspector;
import org.openqa.selenium.bidi.log.ConsoleLogEntry;
import org.openqa.selenium.bidi.log.JavascriptLogEntry;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public abstract class BiDiBaseTest {
    protected ChromeDriver driver;
    private LogInspector inspector;
    private final List<ConsoleLogEntry> consoleErrors = new CopyOnWriteArrayList<>();
    private final List<JavascriptLogEntry> jsErrors = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() {
        ChromeOptions options = new ChromeOptions();
        options.setCapability("webSocketUrl", true);
        driver = new ChromeDriver(options);

        inspector = new LogInspector(driver);
        inspector.onConsoleEntry(entry -> {
            if ("error".equalsIgnoreCase(entry.getLevel().toString())) {
                consoleErrors.add(entry);
            }
        });
        inspector.onJavaScriptException(jsErrors::add);
    }

    @AfterEach
    void tearDown() {
        try {
            Assertions.assertTrue(consoleErrors.isEmpty(), "Console errors: " + consoleErrors);
            Assertions.assertTrue(jsErrors.isEmpty(), "JS exceptions: " + jsErrors);
        } finally {
            inspector.close();
            driver.quit();
        }
    }
}
\`\`\`

\`\`\`python
# Python — pytest fixture that fails on console errors or JS exceptions
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


@pytest.fixture
def bidi_driver():
    options = Options()
    options.set_capability("webSocketUrl", True)
    driver = webdriver.Chrome(options=options)

    console_errors = []
    js_errors = []
    driver.script.add_console_message_handler(
        lambda e: console_errors.append(e) if getattr(e, "level", "").lower() == "error" else None
    )
    driver.script.add_javascript_error_handler(js_errors.append)

    yield driver

    driver.quit()
    assert not console_errors, f"Console errors: {console_errors}"
    assert not js_errors, f"JS exceptions: {js_errors}"
\`\`\`

Two design choices make this robust. First, the assertions live in teardown (the \`@AfterEach\` / post-\`yield\` block) so they run after the test body and catch errors emitted at any point during the test, not just at one checkpoint. Second, the handlers filter to error level only — capturing every \`console.log\` would make the net too noisy to be useful, while errors and uncaught exceptions are almost always real problems worth failing on.

When a test in this suite starts failing on a console error, the failure message includes the error text and source, so triage is fast: either the application genuinely regressed, or a known-benign third-party warning needs an allow-list. Maintaining a small allow-list of acceptable messages keeps the net tight without drowning in false positives. This base-class pattern, more than any single advanced feature, is what makes BiDi a practical everyday upgrade rather than a niche tool.

## Migrating from CDP to BiDi

If your suite uses \`execute_cdp_cmd\` for event-driven work, BiDi is the migration target, and the mapping is mostly mechanical. Console capture that you did by enabling the CDP \`Log\`/\`Runtime\` domains becomes the BiDi log handler. Network interception you did with CDP \`Fetch.enable\` and \`Fetch.fulfillRequest\` becomes the BiDi network module's intercept and provide-response calls. Exception capture you scraped from \`Runtime.exceptionThrown\` becomes the BiDi JavaScript-exception handler.

The motivation to migrate is portability and longevity. CDP can break between Chrome releases because it is vendor-controlled and unversioned for stability; BiDi is a W3C standard with a compatibility commitment and works across Chrome, Edge, and Firefox. The table summarizes the common translations.

| What you want | Old CDP approach | BiDi approach |
|---|---|---|
| Read console messages | Enable \`Log\`/\`Runtime\`, parse events | Log handler (\`log.entryAdded\`) |
| Catch JS exceptions | Parse \`Runtime.exceptionThrown\` | JavaScript-exception handler |
| Stub a response | \`Fetch.enable\` + \`Fetch.fulfillRequest\` | Network intercept + provide response |
| Block a request | \`Fetch.failRequest\` | Network \`fail_request\` |
| Cross-browser support | Not possible (Chrome only) | Built in (Chrome/Edge/Firefox) |

Keep CDP only for the rare capability BiDi does not yet cover and that is genuinely Chrome-specific. For everything event-driven that BiDi supports, prefer it — the test reads more clearly, survives Chrome updates, and runs on more browsers.

## Frequently Asked Questions

### What is WebDriver BiDi in Selenium?

WebDriver BiDi is a W3C-standardized bidirectional protocol that runs over a WebSocket between your Selenium test and the browser, letting the browser push events to your test in real time while you still send commands. It powers event-driven features like console log capture, JavaScript exception listening, and network interception. Unlike the Chrome DevTools Protocol, BiDi is a cross-browser standard supported by Chrome, Edge, and Firefox.

### How is WebDriver BiDi different from the Chrome DevTools Protocol?

Both are bidirectional and event-capable, but CDP is a Chromium-only, vendor-controlled protocol that can change between Chrome versions, while BiDi is governed by the W3C and implemented to a shared spec across browsers. In practice that means BiDi event code runs unchanged on Chrome, Edge, and Firefox, whereas CDP code is locked to Chromium. For new event-driven work, prefer BiDi; reserve CDP for the rare Chrome-specific capability BiDi does not yet cover.

### How do I enable BiDi in a Selenium session?

Request a BiDi-capable session through the browser options before creating the driver. In both Java and Python you set the \`webSocketUrl\` capability to \`true\` on the options object — \`options.setCapability("webSocketUrl", true)\` in Java or \`options.set_capability("webSocketUrl", True)\` in Python — then construct the driver. Selenium establishes the WebSocket alongside the classic session, after which the BiDi helper modules for logs, network, and events become available on the driver.

### Can I capture browser console logs with Selenium BiDi?

Yes. BiDi standardizes a log event that fires for every console message as it is emitted, and Selenium exposes it through a handler — \`LogInspector.onConsoleEntry\` in Java or \`driver.script.add_console_message_handler\` in Python. You register the handler, drive the page, and collect entries with their level, text, and timestamp. A common high-value test asserts that a page produces zero error-level console messages, catching regressions that functional assertions miss.

### Does WebDriver BiDi work in Firefox?

Yes. Cross-browser support is the defining advantage of BiDi over CDP. Because BiDi is a W3C standard, Firefox implements it to the same specification as Chrome and Edge, so your event-driven and network-interception code runs on Firefox without modification. This is the main reason to migrate event-driven tests off Chrome-only \`execute_cdp_cmd\` calls and onto the BiDi APIs.

### How do I intercept and stub network requests with BiDi?

Use Selenium's BiDi network module. Register an intercept for a phase such as \`beforeRequestSent\`, add a request handler, and for matching URLs decide whether to continue the request, fail it, or provide a fabricated response. Failing requests is ideal for blocking flaky third-party hosts and testing error handling, while providing a response stubs an API for deterministic tests. Because it runs over BiDi, the same interception works across Chrome, Edge, and Firefox.

### Should I migrate my CDP code to BiDi?

For event-driven work, yes. Console capture, exception listening, and network interception all have direct BiDi equivalents that are clearer, survive Chrome version updates, and run cross-browser. The migration is largely mechanical: CDP \`Fetch\` interception becomes the BiDi network module, and CDP log/runtime event parsing becomes BiDi log and exception handlers. Keep CDP only for genuinely Chrome-specific capabilities that BiDi does not yet expose.

### Do I still use classic WebDriver commands with BiDi?

Yes, you use both on the same driver. Classic WebDriver commands still drive the page — clicking, typing, and reading elements work exactly as before. BiDi adds an event channel on top through the driver's BiDi modules, so you subscribe to logs, exceptions, and network events while continuing to issue normal commands. BiDi augments classic WebDriver rather than replacing it; a typical test mixes page-driving commands with BiDi event handlers.

## Conclusion

WebDriver BiDi gives Selenium the one thing classic WebDriver never had: the ability to listen. Over a standardized WebSocket the browser streams console messages, JavaScript exceptions, network requests, and navigation events to your test in real time, while you keep driving the page with the commands you already know. Capturing console errors, failing tests on uncaught exceptions, and stubbing network responses are now first-class, cross-browser capabilities in both Java and Python — no Chrome-only CDP required.

Adopt BiDi incrementally: enable it on your options, add a console-error and exception handler to a base test class to catch silent failures everywhere, then move network stubbing off CDP for cross-browser parity. Because BiDi is a W3C standard, the investment is durable across browser updates and engines. For more Selenium, cross-browser, and AI-assisted testing guides, plus ready-to-install testing skills for your AI coding agent, explore the [QASkills.sh skills directory](/skills) and the full library of references on the [QASkills.sh blog](/blog).
`,
};
