import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium BiDirectional BiDi Protocol Complete Guide 2026',
  description:
    'Master Selenium BiDi in 2026. Cover WebSocket protocol, network interception, console event subscriptions, Java/Python/JS examples, and migration from CDP.',
  date: '2026-05-13',
  category: 'Reference',
  content: `
# Selenium BiDirectional BiDi Protocol Complete Guide 2026

WebDriver BiDi (Bidirectional protocol) is the W3C standard that brings real-time browser events to the Selenium ecosystem. The classic WebDriver protocol is request-response: you send a command, you get a result. BiDi adds the missing direction: the browser pushes events to your test. This means your test can subscribe to console logs, network requests, JavaScript errors, navigation events, and BroadcastChannel messages without polling.

This guide covers Selenium BiDi end-to-end in 2026. We walk through the architecture, the WebSocket transport, available domains (browsingContext, network, log, script, browser, session), code examples in Java, Python, and JavaScript, network request interception, console event capture, the migration story from Chrome DevTools Protocol (CDP), browser support, and the gotchas teams hit. For driver setup see [Selenium Manager](/blog/selenium-manager-browser-driver-2026), and for distributed runtimes see [Selenium Grid 4](/blog/selenium-grid-4-docker-kubernetes-guide). Browse the [skills directory](/skills) for Selenium AI agent skills.

## Why BiDi

Three reasons. First, cross-browser. CDP is Chromium-only; BiDi is W3C and works in Firefox and Chrome equally (Safari and Edge are aligning). If your test suite spans browsers, BiDi lets you write one event-handling code path. Second, real-time events. Polling the browser via WebDriver every 100ms wastes resources and misses events between polls. BiDi gives you a push stream. Third, standards alignment. Building on a W3C standard means your test code stays compatible across Selenium major versions.

The trade-off is maturity. As of 2026 BiDi covers about 70% of CDP's surface area. For the most exotic CDP features (heap profiling, performance traces) you still need CDP. For mainstream needs (network interception, console, basic auth handling) BiDi is sufficient.

| Capability | BiDi | CDP |
|---|---|---|
| Cross-browser | Yes (Chrome, Firefox) | Chrome/Edge only |
| Standard | W3C draft (2026 candidate) | Chrome-specific |
| Console capture | Yes | Yes |
| Network interception | Yes | Yes |
| Auth handling | Yes | Yes |
| Performance metrics | Limited | Full |
| Heap profiling | No | Yes |
| Code maturity | Mid | Mature |

## Architecture

BiDi rides on top of WebDriver. When you open a session, your test gets a regular HTTP-based WebDriver session plus a WebSocket connection. The WebSocket is BiDi. Commands go over either; events come over BiDi.

\`\`\`
Test Script
    |
    +-- HTTP (WebDriver classic) --> Driver --> Browser
    |
    +-- WebSocket (BiDi)          --> Driver --> Browser
\`\`\`

The driver process (chromedriver, geckodriver) bridges between BiDi and the browser's native protocol. Selenium 4.16+ enables BiDi automatically when you opt in via capabilities.

## Enabling BiDi

You opt into BiDi via the \`webSocketUrl\` capability. Selenium handles the WebSocket connection automatically.

\`\`\`java
// Java
ChromeOptions options = new ChromeOptions();
options.setCapability("webSocketUrl", true);
WebDriver driver = new ChromeDriver(options);

// Now BiDi is available
\`\`\`

\`\`\`python
# Python
options = webdriver.ChromeOptions()
options.set_capability('webSocketUrl', True)
driver = webdriver.Chrome(options=options)
\`\`\`

\`\`\`javascript
// JavaScript (selenium-webdriver)
const { Builder } = require('selenium-webdriver');
const driver = await new Builder()
  .forBrowser('chrome')
  .setChromeOptions(new chrome.Options().setBidi(true))
  .build();
\`\`\`

## Console Log Capture

The most common BiDi use case. Subscribe to log events and capture browser console output.

\`\`\`java
// Java
import org.openqa.selenium.bidi.module.LogInspector;
import java.util.concurrent.CopyOnWriteArrayList;

WebDriver driver = new ChromeDriver(options);
LogInspector logInspector = new LogInspector(driver);
CopyOnWriteArrayList<String> logs = new CopyOnWriteArrayList<>();

logInspector.onConsoleEntry(entry -> {
    logs.add("[" + entry.getLevel() + "] " + entry.getText());
});

driver.get("https://example.com");
// Logs accumulate as the page produces console output

logInspector.onJavaScriptException(error -> {
    System.err.println("JS error: " + error.getText());
    System.err.println("Stack: " + error.getStackTrace());
});
\`\`\`

\`\`\`python
# Python with sync API
from selenium.webdriver.common.bidi.console import Console

logs = []
async with driver.bidi_connection() as connection:
    log_session = await Console(connection).enable()

    async for entry in log_session.iter_log_entries():
        logs.append(f"[{entry.level}] {entry.text}")
        if entry.level == 'error':
            print(f"Browser error: {entry.text}")
\`\`\`

This pattern catches console errors that would otherwise be invisible. Many production bugs only show up as console.error in the browser; without BiDi capture you never see them in your test logs.

## Network Interception

BiDi can intercept network requests, modify them, and return mock responses. This is huge for tests that need to mock backend behavior.

\`\`\`java
// Java
import org.openqa.selenium.bidi.module.Network;
import org.openqa.selenium.bidi.network.AddInterceptParameters;
import org.openqa.selenium.bidi.network.InterceptPhase;

WebDriver driver = new ChromeDriver(options);
Network network = new Network(driver);

String interceptId = network.addIntercept(
    new AddInterceptParameters(
        List.of(InterceptPhase.BEFORE_REQUEST_SENT),
        List.of(new UrlPattern.UrlPatternString("https://api.example.com/products"))
    )
);

network.onBeforeRequestSent(req -> {
    System.out.println("Outbound: " + req.getRequest().getUrl());
    network.continueRequest(req.getRequest().getRequestId());
});
\`\`\`

\`\`\`python
# Python: mock a network response
async with driver.bidi_connection() as conn:
    network = Network(conn)
    intercept_id = await network.add_intercept(
        phases=['responseStarted'],
        url_patterns=['https://api.example.com/products']
    )

    async for req in network.iter_response_started():
        # Modify the response before the page sees it
        mock_body = '{"products": [{"id": 1, "name": "Mock Laptop"}]}'
        await network.provide_response(
            request=req.request_id,
            body=mock_body,
            status_code=200,
            headers={'Content-Type': 'application/json'}
        )
\`\`\`

This pattern lets you test how your frontend handles slow APIs, error responses, or unusual payloads without touching the backend.

## Authentication

BiDi handles HTTP basic auth via the auth-required event.

\`\`\`java
// Java
network.onAuthRequired(authRequest -> {
    network.continueWithAuth(
        authRequest.getRequest().getRequestId(),
        new AuthCredentials("username", "password")
    );
});

driver.get("https://protected.example.com");
\`\`\`

This replaces the older CDP-based basic auth pattern and works across Chrome and Firefox.

## Browsing Context Events

Subscribe to navigation and DOM events.

\`\`\`javascript
// JavaScript
const browsingContext = await driver.getBidi().browsingContext;

browsingContext.on('navigationStarted', (event) => {
  console.log('Navigating to:', event.url);
});

browsingContext.on('domContentLoaded', (event) => {
  console.log('DOM loaded:', event.url);
});

browsingContext.on('load', (event) => {
  console.log('Page loaded:', event.url);
});

await driver.get('https://example.com');
\`\`\`

This gives you fine-grained navigation timing without injecting timing JavaScript into the page.

## Script Domain

The script domain lets you evaluate JavaScript and observe its results, similar to executeScript but with subscription semantics.

\`\`\`python
# Python
async with driver.bidi_connection() as conn:
    script = Script(conn)

    # Subscribe to realm creation (e.g., new iframes)
    realms = await script.iter_realm_created()
    async for realm in realms:
        print(f"New realm: {realm.realm_id} in {realm.context}")

    # Evaluate code in a specific realm
    result = await script.evaluate(
        expression='document.title',
        target={'context': context_id},
        await_promise=False
    )
    print(f"Title: {result.value}")
\`\`\`

The script domain is particularly useful for cross-origin iframe scenarios where classic WebDriver executeScript can't reach.

## Migration from CDP

Selenium has had Chrome DevTools Protocol (CDP) support since 4.0. CDP is Chrome-specific but covers more surface area than BiDi today. Migration is incremental: replace CDP calls with BiDi calls where BiDi has coverage, and keep CDP for the rest.

\`\`\`java
// Old CDP pattern (Selenium 4.x)
import org.openqa.selenium.devtools.DevTools;
import org.openqa.selenium.devtools.v122.console.Console;

DevTools devTools = ((HasDevTools) driver).getDevTools();
devTools.createSession();
devTools.send(Console.enable());
devTools.addListener(Console.messageAdded(), event ->
    System.out.println(event.getMessage())
);

// New BiDi pattern (Selenium 4.16+)
LogInspector logInspector = new LogInspector(driver);
logInspector.onConsoleEntry(entry ->
    System.out.println(entry.getText())
);
\`\`\`

| CDP Domain | BiDi Equivalent | Status |
|---|---|---|
| Console | log | Full |
| Network (requests) | network | Full |
| Page (navigation) | browsingContext | Full |
| Runtime (JS eval) | script | Partial |
| Performance | performance | Limited |
| Profiler | (none yet) | Use CDP |
| HeapProfiler | (none yet) | Use CDP |
| Debugger | (none yet) | Use CDP |

For mainstream test scenarios (console, network, auth) BiDi is sufficient. For deep profiling stay with CDP.

## Browser Support

As of 2026:

- **Chrome 122+**: Full BiDi support
- **Edge 122+**: Full BiDi support (Chromium-based)
- **Firefox 130+**: Full BiDi support
- **Safari**: BiDi support in progress (Tech Preview)

Cross-browser BiDi works today for Chrome and Firefox. Safari catches up through 2026.

## Code Example: Network Latency Test

A complete example: load a page, capture all network requests, assert no resource took longer than 2 seconds.

\`\`\`java
import org.openqa.selenium.bidi.module.Network;
import java.util.concurrent.*;
import java.util.*;

public class NetworkLatencyTest {
    public static void main(String[] args) throws Exception {
        ChromeOptions options = new ChromeOptions();
        options.setCapability("webSocketUrl", true);
        WebDriver driver = new ChromeDriver(options);

        Network network = new Network(driver);
        Map<String, Long> startTimes = new ConcurrentHashMap<>();
        Map<String, Long> durations = new ConcurrentHashMap<>();

        network.onBeforeRequestSent(req -> {
            startTimes.put(req.getRequest().getRequestId(), System.currentTimeMillis());
        });

        network.onResponseCompleted(resp -> {
            Long start = startTimes.get(resp.getRequest().getRequestId());
            if (start != null) {
                durations.put(resp.getRequest().getUrl(), System.currentTimeMillis() - start);
            }
        });

        driver.get("https://example.com");
        Thread.sleep(5000); // Wait for resources to load

        durations.forEach((url, ms) -> {
            if (ms > 2000) {
                System.err.println("SLOW: " + url + " took " + ms + "ms");
            }
        });

        driver.quit();
    }
}
\`\`\`

This captures every network request the page makes and flags any slow ones. Useful for performance regression detection.

## Performance Considerations

BiDi has overhead. Subscribing to high-frequency events (every network request on a page with hundreds of resources) can slow tests by 20-30%. Subscribe only to what you need.

| Event Subscription | Typical Overhead |
|---|---|
| Console (errors only) | Negligible |
| Console (all entries) | Low |
| Network (all requests) | Moderate |
| Network (specific URLs) | Low |
| Browser context (navigation) | Negligible |
| Script (realm creation) | Low |

For high-volume CI runs, scope subscriptions tightly.

## CI Integration

Standard pattern: enable BiDi globally for all tests, capture console errors, fail the test if errors above warn level are emitted.

\`\`\`java
// Test framework base class
@BeforeEach
void setupBidi() {
    ChromeOptions options = new ChromeOptions();
    options.setCapability("webSocketUrl", true);
    driver = new ChromeDriver(options);

    LogInspector log = new LogInspector(driver);
    log.onConsoleEntry(entry -> {
        if (entry.getLevel() == LogLevel.SEVERE) {
            consoleErrors.add(entry.getText());
        }
    });
}

@AfterEach
void assertNoConsoleErrors() {
    if (!consoleErrors.isEmpty()) {
        fail("Browser console errors: " + consoleErrors);
    }
    driver.quit();
}
\`\`\`

This pattern catches frontend regressions like React unhandled promise rejections that would otherwise go undetected.

## Common Issues

Five gotchas:

1. **WebSocket connection drops on long tests.** Firefox occasionally drops the WebSocket after 5+ minutes of inactivity. Add periodic no-op commands to keep alive.
2. **Memory leaks from forgotten listeners.** Unsubscribe in test teardown.
3. **Mismatched browser and driver versions.** BiDi requires both supporting the same protocol version. Use Selenium Manager.
4. **Event ordering not guaranteed.** Network responseStarted may arrive before requestSent on rare occasions. Use request IDs for correlation, not order.
5. **BiDi in Selenium Grid.** Grid 4 supports BiDi but the WebSocket URL needs translation through the Router. Confirm \`webSocketUrl\` is set in capabilities.

## Conclusion

WebDriver BiDi is the future of browser automation events. By 2026 it covers most production test needs and works across Chrome and Firefox. For new test code use BiDi by default and fall back to CDP only for advanced profiling. For existing test code, migrate console and network handling first; they account for 80% of CDP usage in most projects.

Browse the [skills directory](/skills) for Selenium AI agent skills and read [Selenium CDP Chrome DevTools Protocol guide](/blog/selenium-cdp-chrome-devtools-protocol-guide) for the CDP side. The next test you write that needs console capture or network mocking should use BiDi.
`,
};
