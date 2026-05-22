import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium WebDriver Updates 2026: Complete Changelog and Migration Guide',
  description:
    'Detailed changelog of Selenium WebDriver releases through 2026 with breaking changes, new BiDi APIs, Selenium Manager updates, deprecations, and migration steps for Java, Python, and C# teams.',
  date: '2026-05-21',
  category: 'Tutorial',
  content: `
Selenium WebDriver has shipped four point releases through May 2026, and a small but meaningful set of deprecations is reshaping how teams write tests. If you have not been tracking the changelog closely, the cumulative effect can feel large. This guide pulls every notable Selenium WebDriver change from 2026 into a single document with migration steps and code samples in Java, Python, and C#.

## Key Takeaways

- Selenium 4.27 through 4.30 add WebDriver BiDi parity for network, script, log, and input modules
- The CDP-based DevTools API is officially deprecated and will be removed in 5.0
- Selenium Manager now ships with content-addressable caching and mirror URL support for enterprise users
- Several legacy APIs (\`DesiredCapabilities\` constructors, \`TouchActions\`, Java's \`Wait.until()\` with raw \`Function\`) are removed
- All 2026 releases are JDK 11+, Python 3.10+, and .NET 8+ minimum
- Grid 4.30 introduces native OpenTelemetry exporters and improved session request handling

---

## Release Cadence Summary

| Release | Date | Theme |
|---|---|---|
| 4.27 | January 2026 | BiDi script + log modules stable |
| 4.28 | February 2026 | Grid relay improvements, IDE refresh |
| 4.29 | April 2026 | Performance, type hints, ESM/CJS dual package |
| 4.30 | May 2026 | BiDi network interception stable, OTel Grid |

Selenium follows a roughly quarterly release cadence with the bindings staying in lockstep across Java, Python, JavaScript, Ruby, C#, and Kotlin. Each release ships on the same day across all bindings.

---

## Selenium 4.27 (January 2026)

### BiDi Script and Log Modules

The BiDi \`script\` and \`log\` modules were promoted to stable. These two modules give you:

- \`script.addPreloadScript\` — inject JavaScript before any page script runs (useful for stubbing \`window\` globals)
- \`script.evaluate\` — run JavaScript in arbitrary realms (including isolated worlds)
- \`log.entryAdded\` — receive structured browser log events including console messages and JavaScript exceptions

Java:

\`\`\`java
import org.openqa.selenium.bidi.script.Script;
import org.openqa.selenium.bidi.log.Log;

Script script = new Script(driver);
script.addPreloadScript("window.__testHelper = true;");

Log log = new Log(driver);
log.onConsoleEntry(entry -> System.out.println(entry.getText()));
\`\`\`

Python:

\`\`\`python
script_id = driver.script.add_preload_script("window.__testHelper = true;")

@driver.script.on_console_entry
def _(entry):
    print(entry.text)
\`\`\`

C#:

\`\`\`csharp
await driver.Script.AddPreloadScriptAsync("window.__testHelper = true;");
driver.Log.OnConsoleEntry += (s, e) => Console.WriteLine(e.Text);
\`\`\`

### Removed: \`DesiredCapabilities\` Constructors

The constructor-based \`DesiredCapabilities\` API in Java is gone. Use \`ChromeOptions\`, \`FirefoxOptions\`, etc.

\`\`\`java
// Removed in 4.27
new DesiredCapabilities("chrome", "", Platform.ANY);

// Use instead
ChromeOptions options = new ChromeOptions();
\`\`\`

### Removed: \`TouchActions\`

The legacy \`TouchActions\` class is removed across all bindings. Use the W3C-compliant \`Actions\` class with \`PointerInput\` of type \`TOUCH\`:

\`\`\`java
PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
Sequence tap = new Sequence(finger, 0)
    .addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), 100, 200))
    .addAction(finger.createPointerDown(0))
    .addAction(finger.createPointerUp(0));
((RemoteWebDriver) driver).perform(List.of(tap));
\`\`\`

### Deprecated: CDP DevTools API

The \`DevTools\` class and its \`getCdpSession()\` family are deprecated. They still work in 4.27 but emit warnings. Plan to migrate to BiDi equivalents during 4.x.

---

## Selenium 4.28 (February 2026)

### Grid Relay Improvements

Grid's relay mode (used for connecting to Appium servers or vendor cloud endpoints) now supports automatic capability translation. Previously, you had to know the exact capability shape each backend required. With 4.28, you can declare standard W3C capabilities and Grid maps them to whatever the relay expects.

Example \`config.toml\`:

\`\`\`toml
[relay]
url = "http://appium-server:4723"
status-endpoint = "/status"
configs = [
  "5", "{\\"browserName\\":\\"chrome\\",\\"platformName\\":\\"android\\"}"
]
auto-translate = true
\`\`\`

### Selenium IDE 4.4

The IDE skipped to 4.4 (which fixed some recorder bugs) but it was 4.5 in May 2026 that brought the MV3 extension. If you are on IDE 4.3 or older, jump straight to 4.5.

### Python Type Hints (Partial)

Python bindings began adding \`py.typed\` and full type stubs. The job was completed in 4.29, but 4.28 is when most major modules got their type information.

### Deprecated: \`Wait.until(Function)\` in Java

Java's \`WebDriverWait.until\` now requires \`ExpectedCondition<T>\` rather than raw \`java.util.function.Function\`. The change is mechanical:

\`\`\`java
// Old (deprecated in 4.28)
wait.until((Function<WebDriver, WebElement>) d -> d.findElement(By.id("ok")));

// New
wait.until(ExpectedConditions.presenceOfElementLocated(By.id("ok")));
\`\`\`

---

## Selenium 4.29 (April 2026)

### Performance: Batched Element Lookups

When multiple \`findElement\` or \`findElements\` calls happen within a short window, the bindings batch them into a single round-trip. The behavior is automatic and provides 5–10 percent speedups on busy DOMs.

### JavaScript Dual ESM/CJS

The \`selenium-webdriver\` npm package now ships as a dual-format package with separate ESM and CJS entry points. If you have been using \`require()\` with Node ESM workarounds, you can move to clean \`import\` syntax:

\`\`\`javascript
import { Builder, By, until } from 'selenium-webdriver';
\`\`\`

### Python Type Hints Complete

Python bindings now have complete type hints across the public API. If you use \`mypy\` strict mode, you can finally get useful errors on bad calls:

\`\`\`python
from selenium.webdriver import Chrome
from selenium.webdriver.common.by import By

driver: Chrome = Chrome()
# mypy now correctly types element as WebElement
element = driver.find_element(By.ID, "ok")
\`\`\`

### Removed: \`WebDriverException.getSupportUrl()\`

The little-used \`getSupportUrl()\` method on exceptions has been removed in 4.29. If you parsed it for telemetry, switch to inspecting the message text.

---

## Selenium 4.30 (May 2026)

### BiDi Network Interception Stable

The headline change. You can now intercept, modify, and mock network requests across Chrome, Firefox, and Edge using a single API. See the Selenium News May 2026 post for code samples and use cases.

### Grid OpenTelemetry Exporters

Built-in OTLP HTTP and gRPC exporters. Configure with:

\`\`\`bash
java -jar selenium-server-4.30.0.jar hub \
  --tracing-exporter otlp \
  --otlp-endpoint http://collector:4317
\`\`\`

### Session Request Timeout Policy

A new \`--session-request-timeout-policy\` flag controls what happens when a session request exceeds its timeout. The values are \`drop\` (default) and \`hold\`. \`hold\` is useful for CI systems that retry independently.

### Selenium Manager Content-Addressable Cache

Browser and driver binaries are now cached by SHA-256 hash. Inspect with:

\`\`\`bash
selenium-manager --inspect-cache
\`\`\`

### Selenium Manager Mirror URLs

Air-gapped environments can point Selenium Manager at an internal mirror:

\`\`\`bash
export SE_MANAGER_MIRROR_URL=https://mirror.internal.example.com/selenium
\`\`\`

---

## Cumulative Breaking Changes 2026

If you skipped multiple releases, here is the consolidated list of breaking changes.

| Change | Release | Migration |
|---|---|---|
| \`DesiredCapabilities\` constructor removed | 4.27 | Use \`*Options\` classes |
| \`TouchActions\` class removed | 4.27 | Use \`Actions\` with \`PointerInput.Kind.TOUCH\` |
| \`Wait.until(Function)\` in Java deprecated | 4.28 | Use \`ExpectedCondition<T>\` |
| \`WebDriverException.getSupportUrl()\` removed | 4.29 | Parse exception message |
| CDP DevTools API deprecated | 4.27+ | Migrate to BiDi |
| Min JDK 11 → JDK 11+ enforced strictly | 4.27 | Upgrade JDK |
| Min Python 3.10 enforced | 4.27 | Upgrade Python |
| Min .NET 8 enforced | 4.27 | Upgrade runtime |

---

## Java Migration: A Full Example

Here is a small Selenium 3 test rewritten for 4.30:

### Selenium 3 (Legacy)

\`\`\`java
DesiredCapabilities caps = DesiredCapabilities.chrome();
caps.setCapability("chromeOptions", Map.of("args", List.of("--headless")));
WebDriver driver = new RemoteWebDriver(new URL("http://grid:4444/wd/hub"), caps);

WebDriverWait wait = new WebDriverWait(driver, 10);
wait.until(d -> d.findElement(By.id("ok")).isDisplayed());

new TouchActions(driver).singleTap(driver.findElement(By.id("button"))).perform();

DevTools devTools = ((HasDevTools) driver).getDevTools();
devTools.createSession();
devTools.send(Network.enable(Optional.empty(), Optional.empty(), Optional.empty()));

driver.quit();
\`\`\`

### Selenium 4.30 (Modern)

\`\`\`java
ChromeOptions options = new ChromeOptions();
options.addArguments("--headless=new");
WebDriver driver = new RemoteWebDriver(new URL("http://grid:4444"), options);

WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
wait.until(ExpectedConditions.visibilityOfElementLocated(By.id("ok")));

PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
Sequence tap = new Sequence(finger, 0)
    .addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), 50, 50))
    .addAction(finger.createPointerDown(0))
    .addAction(finger.createPointerUp(0));
((RemoteWebDriver) driver).perform(List.of(tap));

Network network = new Network(driver);
network.onBeforeRequestSent(req -> {
    if (req.getUrl().contains("/api/track")) {
        network.failRequest(req.getRequest());
    }
});

driver.quit();
\`\`\`

---

## Python Migration: A Full Example

### Selenium 3 (Legacy)

\`\`\`python
from selenium import webdriver
from selenium.webdriver.common.touch_actions import TouchActions

caps = {"browserName": "chrome", "chromeOptions": {"args": ["--headless"]}}
driver = webdriver.Remote("http://grid:4444/wd/hub", desired_capabilities=caps)

TouchActions(driver).tap(driver.find_element_by_id("button")).perform()
driver.quit()
\`\`\`

### Selenium 4.30 (Modern)

\`\`\`python
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.actions.pointer_input import PointerInput
from selenium.webdriver.common.actions import interaction
from selenium.webdriver.common.action_chains import ActionChains

options = Options()
options.add_argument("--headless=new")
driver = webdriver.Remote("http://grid:4444", options=options)

finger = PointerInput(interaction.POINTER_TOUCH, "finger")
actions = ActionChains(driver)
actions.w3c_actions.devices = [finger]
actions.w3c_actions.pointer_action.move_to(driver.find_element(By.ID, "button"))
actions.w3c_actions.pointer_action.pointer_down()
actions.w3c_actions.pointer_action.pointer_up()
actions.perform()

driver.quit()
\`\`\`

---

## C# Migration: A Full Example

### Selenium 3 (Legacy)

\`\`\`csharp
var caps = new DesiredCapabilities();
caps.SetCapability(CapabilityType.BrowserName, "chrome");
var driver = new RemoteWebDriver(new Uri("http://grid:4444/wd/hub"), caps);

new TouchActions(driver).SingleTap(driver.FindElement(By.Id("button"))).Perform();
driver.Quit();
\`\`\`

### Selenium 4.30 (Modern)

\`\`\`csharp
var options = new ChromeOptions();
options.AddArgument("--headless=new");
IWebDriver driver = new RemoteWebDriver(new Uri("http://grid:4444"), options);

var finger = new PointerInputDevice(PointerKind.Touch, "finger");
var seq = new ActionSequence(finger)
    .AddAction(finger.CreatePointerMove(driver.FindElement(By.Id("button")), 0, 0, TimeSpan.Zero))
    .AddAction(finger.CreatePointerDown(MouseButton.Touch))
    .AddAction(finger.CreatePointerUp(MouseButton.Touch));
((RemoteWebDriver)driver).PerformActions(new List<ActionSequence> { seq });

driver.Quit();
\`\`\`

---

## Should You Upgrade Now?

If you are on 4.20 or older, yes. The cumulative bug fixes and BiDi stabilization make 4.30 substantially better. The breaking changes are minor and mechanical to fix.

If you are on 4.x but pinned to a specific minor release, plan an upgrade window for the next month. The main work is sed-style search-and-replace for \`DesiredCapabilities\` and \`TouchActions\`. Most teams complete the migration in a single afternoon for medium-sized test suites.

If you are still on Selenium 3, you are several years behind and missing significant W3C compliance and reliability improvements. Plan a dedicated migration sprint.

---

## Frequently Asked Questions

### Is BiDi stable enough to rely on?

Yes for the script, log, and network modules. Input and storage modules are still experimental as of 4.30.

### Does Selenium Manager work in CI?

Yes, and most teams have moved to it. Make sure your CI runners have outbound HTTPS to GitHub Releases, or set \`SE_MANAGER_MIRROR_URL\` to an internal mirror.

### What about Selenium 5.0?

Alpha builds are planned for Q3 2026. Selenium 5.0 will remove CDP-only APIs in favor of BiDi. Use 4.x as your migration window.

### How do I keep up with future changes?

Subscribe to the Selenium project's GitHub releases for each binding, follow the official blog, and join the Selenium Slack.

---

## Conclusion

The 2026 Selenium WebDriver changelog is mostly about completing the BiDi transition that started in 4.0. The breaking changes are small, the new features are substantial, and the migration path is clear. Teams that stay current with the 4.x line will be well-positioned when 5.0 arrives later this year.
`,
};
