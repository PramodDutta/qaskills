import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Appium 2 Mobile Automation Reference (Android + iOS) 2026',
  description:
    'Complete Appium 2 reference for Android and iOS: architecture, UiAutomator2 and XCUITest drivers, capabilities, locators, gestures, real devices, parallel runs, and CI.',
  date: '2026-06-04',
  category: 'Reference',
  content: `
# Appium 2 Mobile Automation Reference (Android + iOS) 2026

Appium remains the most widely used open-source framework for automating native, hybrid, and mobile-web apps across Android and iOS, and Appium 2 reshaped how the tool is packaged and extended. The single biggest change is that drivers and plugins are no longer bundled with the server: Appium 2 ships a lean core, and you install exactly the drivers you need — UiAutomator2 for Android, XCUITest for iOS — through a dedicated CLI. That modularity makes upgrades cleaner, lets driver teams release on their own cadence, and keeps your toolchain minimal. The protocol underneath is W3C WebDriver, so the client libraries feel familiar to anyone who has written Selenium.

This reference is a practical, end-to-end map of Appium 2 in 2026. We cover the client-server architecture, installing and managing drivers with the Appium CLI, the capabilities that define a session, every locator strategy worth knowing, gesture automation via the W3C Actions API and platform mobile commands, running on emulators versus real devices, parallel execution across a device farm, and wiring it all into CI. Examples are given in both Java (the most common enterprise client) and Python (the most common scripting client), and they are runnable, not pseudocode. If you searched for "appium official documentation mobile app automation android ios," this page is built to be the answer.

Mobile test automation rewards discipline: stable locators, explicit waits, and a clean Page Object layer keep a suite alive as the app evolves. For installable QA skills and deeper guides, see the [skills directory](/skills) and the [blog](/blog), including the [Appium mobile testing complete guide](/blog/appium-mobile-testing-complete-guide) and the [mobile testing automation guide](/blog/mobile-testing-automation-guide).

## Appium 2 Architecture

Appium is a client-server system speaking the W3C WebDriver protocol over HTTP. Your test (the *client*) sends JSON commands to the Appium *server*, which translates them into platform-specific automation calls and routes them to the device through a *driver*. On Android the UiAutomator2 driver drives Google's UiAutomator2 framework; on iOS the XCUITest driver drives Apple's XCUITest. The server is just a relay and translator — the real automation happens inside the OS-level frameworks the drivers wrap.

The key Appium 2 shift: the server core knows nothing about platforms. Drivers are plugins you install separately, each registering the endpoints and behaviors for its platform. This means a fresh \`appium\` install does nothing useful until you add a driver. It also means a driver bug or new feature ships as a driver update, decoupled from the server release train.

| Layer | Android | iOS | Role |
|---|---|---|---|
| Client | Java/Python/JS Appium client | Same | Sends WebDriver commands |
| Server | Appium 2 core | Appium 2 core | Translates + routes |
| Driver | UiAutomator2 | XCUITest | Platform automation bridge |
| OS framework | UiAutomator2 | XCUITest | Actually drives the UI |

Because the protocol is WebDriver, the client API surface is nearly identical across platforms; the differences live in capabilities and a handful of platform-specific commands.

## Installing Appium 2 and Drivers

Install the Appium 2 server from npm, then add drivers with the \`appium driver\` subcommand. This explicit step is the heart of the Appium 2 model.

\`\`\`bash
# Install the Appium 2 server globally
npm install -g appium

# Add the Android and iOS drivers
appium driver install uiautomator2
appium driver install xcuitest

# Verify what is installed
appium driver list --installed

# Run the doctor to check system dependencies (SDKs, Xcode, etc.)
appium driver doctor uiautomator2
appium driver doctor xcuitest

# Start the server
appium
\`\`\`

The \`doctor\` command for each driver checks the platform prerequisites — Android SDK, ADB, and \`ANDROID_HOME\` for UiAutomator2; Xcode, the command-line tools, and Carthage/Homebrew bits for XCUITest. Fix every red item before writing a single test; most "session failed to start" issues trace back to a missing SDK or an unset environment variable. Keep drivers current with \`appium driver update <name>\`.

## Capabilities: Defining a Session

Capabilities are the key-value bag that tells Appium what to automate. In Appium 2, vendor-specific capabilities must carry the \`appium:\` prefix; only a small set of standard W3C keys (like \`platformName\`) go unprefixed. Here is a complete Android session in Java.

\`\`\`java
// AndroidSession.java
import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;
import java.net.URL;

public class AndroidSession {
    public static AndroidDriver create() throws Exception {
        UiAutomator2Options options = new UiAutomator2Options()
            .setPlatformName("Android")
            .setAutomationName("UiAutomator2")
            .setDeviceName("Pixel_7_API_34")
            .setApp("/abs/path/to/app-debug.apk")
            .setAppPackage("com.example.app")
            .setAppActivity(".MainActivity")
            .setNewCommandTimeout(java.time.Duration.ofSeconds(120));

        return new AndroidDriver(new URL("http://127.0.0.1:4723/"), options);
    }
}
\`\`\`

The Python equivalent for an iOS session uses the same concepts through the \`UiAutomator2Options\`/\`XCUITestOptions\` pattern.

\`\`\`python
# ios_session.py
from appium import webdriver
from appium.options.ios import XCUITestOptions

def create_ios_driver():
    options = XCUITestOptions()
    options.platform_name = "iOS"
    options.automation_name = "XCUITest"
    options.device_name = "iPhone 16"
    options.platform_version = "18.2"
    options.app = "/abs/path/to/MyApp.app"
    options.set_capability("appium:newCommandTimeout", 120)
    return webdriver.Remote("http://127.0.0.1:4723/", options=options)
\`\`\`

The most important capabilities, and their meaning, are summarized below.

| Capability | Platform | Purpose |
|---|---|---|
| \`platformName\` | Both | "Android" or "iOS" (standard W3C key) |
| \`appium:automationName\` | Both | "UiAutomator2" or "XCUITest" |
| \`appium:app\` | Both | Path/URL to the .apk or .app/.ipa |
| \`appium:deviceName\` | Both | Emulator/simulator name or device label |
| \`appium:appPackage\` / \`appium:appActivity\` | Android | Launch coordinates for the app |
| \`appium:udid\` | Both | Target a specific real device by ID |
| \`appium:newCommandTimeout\` | Both | Seconds before idle session is killed |

## Locator Strategies

Finding elements reliably is the make-or-break skill in mobile automation. Appium exposes several locator strategies; the cross-platform **accessibility id** should be your first choice because it maps to \`content-desc\` on Android and the accessibility identifier on iOS, and developers can set it deliberately for testability.

\`\`\`python
# locators.py
from appium.webdriver.common.appiumby import AppiumBy

# Cross-platform: accessibility id (best default)
el = driver.find_element(AppiumBy.ACCESSIBILITY_ID, "login_button")

# Standard id and class
el = driver.find_element(AppiumBy.ID, "com.example.app:id/username")
el = driver.find_element(AppiumBy.CLASS_NAME, "android.widget.EditText")

# XPath (powerful but slowest and most brittle)
el = driver.find_element(AppiumBy.XPATH, "//android.widget.Button[@text='Sign in']")

# Android-only: UiAutomator selector (fast, expressive)
el = driver.find_element(
    AppiumBy.ANDROID_UIAUTOMATOR,
    'new UiSelector().textContains("Sign in")',
)

# iOS-only: class chain and predicate string
el = driver.find_element(AppiumBy.IOS_CLASS_CHAIN, '**/XCUIElementTypeButton[\`label == "Sign in"\`]')
el = driver.find_element(AppiumBy.IOS_PREDICATE, "label == 'Sign in' AND visible == 1")
\`\`\`

The trade-offs matter for suite stability and speed.

| Strategy | Platform | Speed | Brittleness | When to use |
|---|---|---|---|---|
| Accessibility id | Both | Fast | Low | Default choice |
| id | Both | Fast | Medium | Stable resource IDs |
| UiAutomator | Android | Fast | Low | Rich Android queries |
| iOS class chain | iOS | Fast | Low | Hierarchy-based iOS lookups |
| iOS predicate | iOS | Fast | Low | Attribute-based iOS lookups |
| XPath | Both | Slow | High | Last resort only |

Avoid XPath where you can: it traverses the whole UI tree, is the slowest strategy, and breaks the instant the layout shifts. Push your developers to add accessibility IDs — it is the single highest-leverage thing you can do for mobile test stability.

## Gestures: Taps, Swipes, and Scrolls

Modern Appium drives gestures two ways: the low-level W3C Actions API (portable across platforms) and high-level driver "mobile:" commands (concise but platform-specific). Here is a portable swipe using the Actions API in Java.

\`\`\`java
// Swipe.java — W3C Actions API, works on both platforms
import org.openqa.selenium.interactions.PointerInput;
import org.openqa.selenium.interactions.Sequence;
import java.time.Duration;
import java.util.List;

public static void swipe(AndroidDriver driver, int startX, int startY, int endX, int endY) {
    PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
    Sequence swipe = new Sequence(finger, 1);
    swipe.addAction(finger.createPointerMove(Duration.ZERO,
        PointerInput.Origin.viewport(), startX, startY));
    swipe.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
    swipe.addAction(finger.createPointerMove(Duration.ofMillis(600),
        PointerInput.Origin.viewport(), endX, endY));
    swipe.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
    driver.perform(List.of(swipe));
}
\`\`\`

For everyday scrolling and tapping, the driver-level mobile commands are far less verbose. In Python:

\`\`\`python
# gestures.py — high-level mobile: commands
# Android scroll into view via UiAutomator
driver.find_element(
    AppiumBy.ANDROID_UIAUTOMATOR,
    'new UiScrollable(new UiSelector().scrollable(true))'
    '.scrollIntoView(new UiSelector().text("Settings"))',
)

# iOS scroll using the mobile: scroll command
driver.execute_script("mobile: scroll", {"direction": "down"})

# Long press / tap via mobile: commands (Android)
el = driver.find_element(AppiumBy.ACCESSIBILITY_ID, "item_1")
driver.execute_script("mobile: longClickGesture", {
    "elementId": el.id, "duration": 1000,
})
\`\`\`

Prefer high-level mobile commands for readability; drop to the Actions API only when you need a precise multi-touch or custom gesture the driver does not expose.

## Emulators vs Real Devices

Emulators (Android) and simulators (iOS) are free, fast to spin up, and trivially parallelizable, which makes them ideal for the bulk of functional tests in CI. Real devices catch what virtual ones cannot: actual GPU and CPU behavior, real network conditions, biometric hardware, camera, push notifications, and device-specific quirks. A healthy strategy runs the majority of tests on emulators and a curated smoke/critical subset on a real-device farm.

| Factor | Emulator / Simulator | Real device |
|---|---|---|
| Cost | Free | Hardware or cloud farm fees |
| Speed to provision | Seconds | Slower; physical management |
| Parallelism | Easy, many instances | Limited by device count |
| Fidelity | Good for UI logic | Highest; real sensors/perf |
| Best for | Bulk functional tests | Smoke, performance, hardware paths |

To target a specific real device, pass its \`appium:udid\`. For Android you also need the device authorized for ADB; for iOS the device must be provisioned in your developer account and trusted. Cloud farms (BrowserStack, Sauce Labs, LambdaTest) abstract this away by exposing real devices behind the same WebDriver endpoint — you change the server URL and add vendor capabilities, and your tests are otherwise unchanged.

## Parallel Execution

Mobile suites are slow, so parallelism is essential. The model is one Appium session per device, with your test runner distributing tests across sessions. Appium 2 can run multiple sessions on one server, but for robust parallel runs many teams give each device its own server port and ADB/WDA port to avoid contention.

\`\`\`python
# conftest.py — pytest-xdist parallel device assignment
import pytest
from appium import webdriver
from appium.options.android import UiAutomator2Options

DEVICES = [
    {"udid": "emulator-5554", "systemPort": 8200},
    {"udid": "emulator-5556", "systemPort": 8201},
]

@pytest.fixture
def driver(worker_id):
    # worker_id is "gw0", "gw1", ... under pytest-xdist
    idx = 0 if worker_id == "master" else int(worker_id.replace("gw", ""))
    cfg = DEVICES[idx % len(DEVICES)]
    options = UiAutomator2Options()
    options.platform_name = "Android"
    options.automation_name = "UiAutomator2"
    options.udid = cfg["udid"]
    options.set_capability("appium:systemPort", cfg["systemPort"])
    options.app = "/abs/path/app-debug.apk"
    drv = webdriver.Remote("http://127.0.0.1:4723/", options=options)
    yield drv
    drv.quit()
\`\`\`

The two critical capabilities for parallel Android runs are \`appium:systemPort\` (UiAutomator2's per-device port — must be unique) and a unique \`appium:udid\`. On iOS the analogous capability is \`appium:wdaLocalPort\`. Assign these deterministically per worker, as above, and the runs will not collide.

## CI Integration

Running Appium in CI means provisioning an emulator (or connecting to a cloud farm), starting the server, and executing the suite. The example below shows a GitHub Actions job that boots an Android emulator and runs a Python Appium suite. For a deeper CI treatment, see the [GitHub Actions testing CI/CD guide](/blog/github-actions-testing-ci-cd-guide).

\`\`\`yaml
# .github/workflows/appium.yml
name: Appium Android
on: [push]
jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - name: Install Appium + driver
        run: |
          npm install -g appium
          appium driver install uiautomator2
      - name: Install Python deps
        run: pip install Appium-Python-Client pytest pytest-xdist
      - name: Run Appium server in background
        run: appium --log appium.log &
      - name: Run tests on emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          script: pytest tests/ -n 2
\`\`\`

For real-device or large-scale runs, point the server URL at a cloud provider and supply that vendor's capabilities; the rest of the pipeline is identical. Always upload the Appium server log and any screenshots as build artifacts so failures are debuggable after the runner is gone.

## Waits and Synchronization

Mobile UIs are asynchronous: screens animate in, network calls populate lists, and spinners block interaction. The single largest source of flaky mobile tests is acting on an element before it is ready. The fix is the same discipline as web automation — prefer explicit waits over fixed sleeps, and never scatter \`Thread.sleep\` or \`time.sleep\` through a suite. Explicit waits poll for a specific condition and proceed the instant it is met, which is both faster and far more reliable than a blind fixed delay.

\`\`\`java
// Waits.java — explicit wait for an element to be clickable
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import io.appium.java_client.AppiumBy;
import java.time.Duration;

public static void tapWhenReady(AndroidDriver driver) {
    new WebDriverWait(driver, Duration.ofSeconds(15))
        .until(ExpectedConditions.elementToBeClickable(
            AppiumBy.accessibilityId("login_button")))
        .click();
}
\`\`\`

\`\`\`python
# waits.py — Python explicit wait for visibility
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from appium.webdriver.common.appiumby import AppiumBy

def wait_visible(driver, accessibility_id, timeout=15):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located(
            (AppiumBy.ACCESSIBILITY_ID, accessibility_id))
    )
\`\`\`

The \`appium:newCommandTimeout\` capability is a related safety net: it kills an idle session after the given number of seconds, preventing a hung test from holding a device hostage in a shared farm. Set it generously (60–120 seconds) so legitimate slow steps do not trip it, but not so high that a truly stuck session blocks the queue indefinitely. Combining short, targeted explicit waits in tests with a sane session-level command timeout is the combination that keeps a large mobile suite green.

## The Page Object Model for Mobile

Raw locators scattered through test bodies rot quickly — the moment a developer renames an accessibility id, dozens of tests break and you hunt through the suite fixing each one. The Page Object Model (POM) solves this by giving each screen a class that owns its locators and exposes intention-revealing methods. Tests then read like user stories and locator changes touch exactly one file.

\`\`\`python
# screens/login_screen.py — a mobile Page Object
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class LoginScreen:
    USERNAME = (AppiumBy.ACCESSIBILITY_ID, "username")
    PASSWORD = (AppiumBy.ACCESSIBILITY_ID, "password")
    SUBMIT = (AppiumBy.ACCESSIBILITY_ID, "login_button")

    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 15)

    def login(self, user: str, pwd: str) -> None:
        self.wait.until(EC.visibility_of_element_located(self.USERNAME)).send_keys(user)
        self.driver.find_element(*self.PASSWORD).send_keys(pwd)
        self.driver.find_element(*self.SUBMIT).click()
\`\`\`

\`\`\`python
# test_login.py — the test stays at the level of user intent
from screens.login_screen import LoginScreen

def test_valid_login(driver):
    LoginScreen(driver).login("ada", "s3cret")
    # assert dashboard screen is shown ...
\`\`\`

Because the same POM pattern applies identically to Android and iOS — only the locator values differ — a well-structured POM layer lets you share most test logic across platforms, with platform-specific locators isolated in the screen classes. This is the architecture that makes a cross-platform Appium suite maintainable as the app grows. For a deeper treatment of the pattern across tools, see the [page object model complete guide](/blog/page-object-model-complete-guide).

## Frequently Asked Questions

### What changed between Appium 1 and Appium 2?

The headline change is that drivers and plugins are decoupled from the server. Appium 2 ships a lean core and you install drivers (UiAutomator2, XCUITest) and plugins through the \`appium driver\` and \`appium plugin\` CLIs. Vendor capabilities now require the \`appium:\` prefix, and the protocol is fully W3C WebDriver. This modularity makes upgrades cleaner and lets drivers release independently of the server.

### Which driver do I use for Android and iOS?

Use UiAutomator2 for Android and XCUITest for iOS. Install them with \`appium driver install uiautomator2\` and \`appium driver install xcuitest\`. These drivers wrap Google's and Apple's native automation frameworks respectively. Set the matching \`appium:automationName\` capability ("UiAutomator2" or "XCUITest") in your session so the server routes to the correct driver.

### What is the best locator strategy in Appium?

Accessibility id is the best default because it works on both platforms (mapping to \`content-desc\` on Android and the accessibility identifier on iOS) and developers can set it deliberately for testability. Use platform-native strategies — UiAutomator selectors on Android, class chain or predicate strings on iOS — for richer queries. Avoid XPath except as a last resort, because it is the slowest and most brittle option.

### How do I run Appium tests in parallel?

Run one Appium session per device and distribute tests with your runner (for example pytest-xdist or TestNG). Give each device a unique \`appium:udid\` and a unique per-device port: \`appium:systemPort\` for UiAutomator2 on Android and \`appium:wdaLocalPort\` for XCUITest on iOS. Assign these deterministically per worker so sessions do not collide on the same port or device.

### Can I test on real devices instead of emulators?

Yes. Pass the device's \`appium:udid\` and ensure it is authorized — ADB authorization on Android, developer provisioning and trust on iOS. Real devices give the highest fidelity for performance, sensors, and hardware paths. Cloud farms like BrowserStack or Sauce Labs expose real devices behind the same WebDriver endpoint, so you only change the server URL and add vendor capabilities.

### Do I need Xcode and Android SDK installed?

Yes. The XCUITest driver requires Xcode and its command-line tools on macOS, and the UiAutomator2 driver requires the Android SDK with ADB and a configured \`ANDROID_HOME\`. Run \`appium driver doctor uiautomator2\` and \`appium driver doctor xcuitest\` to verify every prerequisite, and fix all reported issues before writing tests — most session-startup failures trace back to a missing SDK or unset environment variable.

### How do I perform gestures like swipe and scroll?

Use the high-level driver mobile commands for everyday gestures: \`mobile: scroll\` on iOS and \`UiScrollable.scrollIntoView\` on Android for scrolling, and gesture commands like \`mobile: longClickGesture\`. For precise or multi-touch gestures, drop to the W3C Actions API with a \`PointerInput\` sequence, which is portable across both platforms. Prefer the mobile commands for readability and reserve the Actions API for custom gestures.

## Conclusion

Appium 2 keeps everything that made Appium the default for cross-platform mobile automation — a WebDriver-based API, native Android and iOS support, real-device and emulator coverage — while making the toolchain modular through installable drivers. The path to a reliable suite is consistent regardless of platform: install and doctor your drivers, define clean capabilities, prefer accessibility-id locators, drive gestures with high-level mobile commands, isolate parallel runs with unique ports, and capture logs in CI.

From here, build a Page Object layer over these primitives so locators live in one place and tests read like user stories. For installable, agent-ready QA skills covering mobile and beyond, see the [skills directory](/skills), and continue with the [Appium mobile testing complete guide](/blog/appium-mobile-testing-complete-guide) and the [mobile testing automation guide](/blog/mobile-testing-automation-guide) on the [blog](/blog).
`,
};
