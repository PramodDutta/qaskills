import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium CDP Chrome DevTools Protocol Complete Guide 2026',
  description:
    'Master Selenium with CDP. Cover network interception, performance metrics, heap snapshots, mock geolocation, and migration paths from CDP to BiDi.',
  date: '2026-05-14',
  category: 'Reference',
  content: `
# Selenium CDP Chrome DevTools Protocol Complete Guide 2026

Chrome DevTools Protocol (CDP) is the wire format that Chrome and Chromium-based browsers expose for tooling. The Chrome DevTools you click open with F12 is just one CDP client; Selenium can be another. Selenium 4 added first-class CDP support, letting tests do things that plain WebDriver can't: intercept network requests, mock geolocation, capture performance metrics, snapshot the heap, throttle network, and emulate slow CPUs.

This guide covers Selenium CDP end-to-end in 2026. We walk through the architecture, enabling CDP in your driver, common use cases with code in Java, Python, and JavaScript, the relationship between CDP and BiDi, browser version dependencies, performance considerations, and the migration story toward BiDi for Chromium-only features. For BiDi coverage see [Selenium BiDi protocol guide](/blog/selenium-bidirectional-bidi-protocol-guide), and for driver management see [Selenium Manager](/blog/selenium-manager-browser-driver-2026). Browse the [skills directory](/skills) for Selenium AI agent skills.

## Why CDP

Three reasons. First, capabilities WebDriver doesn't have. Network interception, geolocation mocking, throttling, heap snapshots. CDP exposes hundreds of methods covering these. Second, Chromium-wide coverage. Chrome, Edge, Brave, Opera, Vivaldi all support CDP because they share the same underlying engine. Third, mature tooling. CDP has been around since 2011 and the surface area is well documented.

The trade-off is Chrome lock-in. CDP doesn't work on Firefox or Safari. For multi-browser test suites you write CDP for Chrome and either skip or fall back to WebDriver for other browsers. BiDi is the W3C cross-browser successor, but until BiDi achieves feature parity (still in progress in 2026) CDP remains the option for advanced Chromium features.

| Use Case | CDP | BiDi | Plain WebDriver |
|---|---|---|---|
| Network interception | Yes | Yes | No |
| Geolocation mocking | Yes | Limited | No |
| CPU throttling | Yes | No | No |
| Heap snapshots | Yes | No | No |
| Performance metrics | Yes | Limited | No |
| Console capture | Yes | Yes | No |
| Cross-browser | No | Yes | Yes |

## Enabling CDP

Selenium auto-attaches CDP when you use Chrome or Edge. Access it through \`HasDevTools\`.

\`\`\`java
// Java
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.devtools.DevTools;
import org.openqa.selenium.devtools.HasDevTools;

WebDriver driver = new ChromeDriver();
DevTools devTools = ((HasDevTools) driver).getDevTools();
devTools.createSession();
\`\`\`

\`\`\`python
# Python
driver = webdriver.Chrome()
# Use driver.execute_cdp_cmd directly for sync calls
\`\`\`

\`\`\`javascript
// JavaScript
const driver = await new Builder().forBrowser('chrome').build();
const cdpConnection = await driver.createCDPConnection('page');
\`\`\`

## Version Pinning

CDP is versioned. Each Selenium release supports a range of Chrome CDP versions. If your installed Chrome is far ahead of what your Selenium version supports, CDP calls may fail with "Cannot find class for v###" errors.

\`\`\`java
// Selenium 4.27 supports up to v131 by default
import org.openqa.selenium.devtools.v131.network.Network;

// If your Chrome is v130, pin to v130
import org.openqa.selenium.devtools.v130.network.Network;
\`\`\`

The simplest fix is to keep Selenium current. Selenium 4 releases monthly to track Chrome's six-week cadence. Stale Selenium pinned to v122 against Chrome v131 will not work.

| Selenium Version | CDP Range Supported |
|---|---|
| 4.20 | v119-v122 |
| 4.24 | v123-v125 |
| 4.27 | v126-v131 |
| 4.30 (planned) | v130-v134 |

## Network Interception

The most common CDP use case. Intercept requests, modify them, mock responses.

\`\`\`java
// Java: block analytics requests
import org.openqa.selenium.devtools.v131.network.Network;
import org.openqa.selenium.devtools.v131.network.model.RequestPattern;
import org.openqa.selenium.devtools.v131.fetch.Fetch;
import org.openqa.selenium.devtools.v131.fetch.model.RequestPaused;

devTools.send(Network.enable(Optional.empty(), Optional.empty(), Optional.empty()));

devTools.send(Fetch.enable(
    Optional.of(List.of(new RequestPattern(
        Optional.of("*google-analytics*"),
        Optional.empty(),
        Optional.empty()
    ))),
    Optional.empty()
));

devTools.addListener(Fetch.requestPaused(), event -> {
    System.out.println("Blocked: " + event.getRequest().getUrl());
    devTools.send(Fetch.failRequest(
        event.getRequestId(),
        ErrorReason.BLOCKEDBYCLIENT
    ));
});
\`\`\`

\`\`\`python
# Python: mock an API response
driver.execute_cdp_cmd('Network.enable', {})
driver.execute_cdp_cmd('Network.setRequestInterception', {
    'patterns': [{'urlPattern': '*api/products*'}]
})

# Then handle the requestIntercepted event via WebSocket or polling
mock_body = '{"products": [{"id": 1, "name": "Mock"}]}'
\`\`\`

For sustained interception use the higher-level Selenium 4 \`NetworkInterceptor\` API (Java) which wraps the CDP calls.

## Geolocation Mocking

Test geo-aware features without VPN.

\`\`\`java
// Java
import org.openqa.selenium.devtools.v131.emulation.Emulation;

devTools.send(Emulation.setGeolocationOverride(
    Optional.of(40.7128),    // latitude
    Optional.of(-74.0060),   // longitude
    Optional.of(100)         // accuracy in meters
));

driver.get("https://maps.example.com");
// Browser will return New York City for geolocation queries
\`\`\`

\`\`\`python
# Python
driver.execute_cdp_cmd('Emulation.setGeolocationOverride', {
    'latitude': 40.7128,
    'longitude': -74.0060,
    'accuracy': 100
})
\`\`\`

This is huge for testing localized content, currency conversion, regional pricing, and geo-restricted features.

## Network Throttling

Simulate slow networks (3G, slow WiFi) to test loading states and lazy loading.

\`\`\`java
import org.openqa.selenium.devtools.v131.network.model.ConnectionType;

devTools.send(Network.emulateNetworkConditions(
    false,                    // offline
    200,                      // latency ms
    100_000,                  // download throughput bytes/sec (100 KB/s)
    50_000,                   // upload throughput bytes/sec
    Optional.of(ConnectionType.CELLULAR3G)
));

driver.get("https://example.com");
// Page loads under 3G-like conditions
\`\`\`

\`\`\`python
driver.execute_cdp_cmd('Network.emulateNetworkConditions', {
    'offline': False,
    'latency': 200,
    'downloadThroughput': 100_000,
    'uploadThroughput': 50_000
})
\`\`\`

| Profile | Latency | Download | Upload |
|---|---|---|---|
| 3G fast | 150 ms | 1.5 Mbps | 750 Kbps |
| 3G slow | 400 ms | 400 Kbps | 400 Kbps |
| 4G | 50 ms | 4 Mbps | 3 Mbps |
| WiFi | 5 ms | 30 Mbps | 15 Mbps |

## CPU Throttling

Test how UIs perform on slow devices.

\`\`\`java
devTools.send(Emulation.setCPUThrottlingRate(4));  // 4x slower than baseline
driver.get("https://example.com");
\`\`\`

A 4x throttle simulates a low-end Android phone. Combine with network throttling for realistic mobile testing.

## Performance Metrics

Capture detailed performance telemetry.

\`\`\`java
import org.openqa.selenium.devtools.v131.performance.Performance;

devTools.send(Performance.enable(Optional.empty()));

driver.get("https://example.com");

// Read metrics
var metrics = devTools.send(Performance.getMetrics());
metrics.forEach(m ->
    System.out.println(m.getName() + ": " + m.getValue())
);

// Sample output:
// Timestamp: 1715432109.45
// AudioHandlers: 0
// JSHeapUsedSize: 12345678
// JSHeapTotalSize: 23456789
// FirstContentfulPaint: 0.45
// LargestContentfulPaint: 1.23
\`\`\`

The same metrics show up in Chrome DevTools Performance tab. CDP exposes them programmatically.

## Heap Snapshots

For memory leak detection.

\`\`\`java
import org.openqa.selenium.devtools.v131.heapprofiler.HeapProfiler;

devTools.send(HeapProfiler.enable());
devTools.send(HeapProfiler.startSampling(Optional.of(32768)));

// ... run test scenarios ...

var profile = devTools.send(HeapProfiler.stopSampling());

// Write to file
Files.writeString(Path.of("heap.json"), profile.toJson());
\`\`\`

Open the resulting heap snapshot in Chrome DevTools to analyze. Useful for identifying memory leaks that only manifest in long-running test sessions.

## Console Capture

CDP console capture. BiDi has a higher-level API for this; CDP is still useful for legacy projects or when you need more detail (stack traces, source URLs).

\`\`\`java
import org.openqa.selenium.devtools.v131.log.Log;
import org.openqa.selenium.devtools.v131.runtime.Runtime;

devTools.send(Log.enable());
devTools.send(Runtime.enable());

devTools.addListener(Runtime.consoleAPICalled(), event -> {
    System.out.println("[" + event.getType() + "] " + event.getArgs());
});

devTools.addListener(Runtime.exceptionThrown(), event -> {
    System.err.println("Uncaught exception: " + event.getExceptionDetails().getText());
});
\`\`\`

## Device Emulation

Emulate mobile devices including viewport, user agent, and touch.

\`\`\`java
import org.openqa.selenium.devtools.v131.emulation.model.ScreenOrientation;

devTools.send(Emulation.setDeviceMetricsOverride(
    390, 844, 3.0, true,
    Optional.empty(), Optional.empty(),
    Optional.empty(), Optional.empty(),
    Optional.empty(),
    Optional.of(new ScreenOrientation(ScreenOrientation.Type.PORTRAITPRIMARY, 0)),
    Optional.empty(), Optional.empty(), Optional.empty(), Optional.empty()
));

devTools.send(Network.setUserAgentOverride(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...",
    Optional.empty(), Optional.empty(), Optional.empty()
));
\`\`\`

iPhone 14 Pro emulation in one call. Compared to launching real iOS simulators this is significantly faster and more deterministic.

## Authentication

Handle HTTP basic auth.

\`\`\`java
devTools.send(Fetch.enable(
    Optional.of(List.of(new RequestPattern(
        Optional.of("*"),
        Optional.empty(),
        Optional.of(RequestStage.RESPONSE)
    ))),
    Optional.of(true)  // handleAuthRequests
));

devTools.addListener(Fetch.authRequired(), event -> {
    devTools.send(Fetch.continueWithAuth(
        event.getRequestId(),
        new AuthChallengeResponse(
            AuthChallengeResponse.Response.PROVIDECREDENTIALS,
            Optional.of("user"),
            Optional.of("password")
        )
    ));
});
\`\`\`

This is the recommended way to handle basic auth dialogs in Chrome from Selenium 4 onwards.

## Cookie Manipulation

CDP exposes cookies in ways WebDriver's basic cookie API can't.

\`\`\`java
import org.openqa.selenium.devtools.v131.storage.Storage;

// Set a cookie with all options
devTools.send(Network.setCookies(List.of(
    new CookieParam(
        "auth_token",
        "abc123",
        Optional.empty(),
        Optional.of(".example.com"),
        Optional.of("/"),
        Optional.of(true),    // secure
        Optional.of(true),    // httpOnly
        Optional.of(CookieSameSite.NONE),
        Optional.empty(),     // expires
        Optional.empty(),     // priority
        Optional.empty(),     // sameParty
        Optional.empty(),     // sourceScheme
        Optional.empty()      // sourcePort
    )
)));

// Get all storage info
var storage = devTools.send(Storage.getCookies(Optional.empty()));
\`\`\`

WebDriver's classic cookie API can't set SameSite=None cookies or cross-domain cookies; CDP can.

## Migration to BiDi

For new code in 2026, prefer BiDi over CDP where BiDi has coverage. The migration is incremental:

| Feature | Move to BiDi When |
|---|---|
| Console capture | Now (BiDi covers this fully) |
| Network interception | Now (BiDi covers this fully) |
| Auth handling | Now (BiDi covers this fully) |
| Network throttling | Not yet (CDP only) |
| CPU throttling | Not yet (CDP only) |
| Heap snapshots | Not yet (CDP only) |
| Performance metrics | Partial (BiDi limited) |
| Device emulation | Not yet (CDP only) |

A common pattern in 2026: use BiDi for cross-browser concerns (console, network) and CDP for Chrome-specific advanced features.

## Common Issues

Five things that bite teams:

1. **CDP version mismatch.** Update Selenium to match your Chrome.
2. **Multiple sessions.** \`createSession()\` opens a session per tab. If your test opens new tabs, create sessions for each.
3. **Listener memory leaks.** Long-running test suites accumulate listeners. Tear down with \`devTools.close()\`.
4. **CDP not available in headless old.** Use \`--headless=new\` for full CDP support.
5. **Network.enable adds overhead.** Don't leave it on if not capturing; disable when done.

## Conclusion

CDP gives Selenium tests the power of Chrome DevTools. For network interception, throttling, geolocation mocking, and performance metrics, it remains the right tool in 2026. For console and basic network interception, prefer BiDi for cross-browser compatibility. For advanced Chromium-only features, stay with CDP.

Browse the [skills directory](/skills) for Selenium AI agent skills and read [Selenium BiDi protocol guide](/blog/selenium-bidirectional-bidi-protocol-guide) for the BiDi side. The next test that needs to throttle network or mock geolocation should use CDP today.
`,
};
