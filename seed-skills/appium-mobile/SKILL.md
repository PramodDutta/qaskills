---
name: Appium Mobile Testing
description: Mobile application testing skill using Appium for iOS and Android, covering device capabilities, selectors, gestures, and cross-platform testing strategies.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [appium, mobile, ios, android, automation, cross-platform]
testingTypes: [mobile, e2e]
frameworks: [appium]
languages: [java, typescript]
domains: [mobile]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Appium Mobile Testing Skill

You are an expert QA automation engineer specializing in mobile testing with Appium. When the user asks you to write, review, or debug Appium mobile tests, follow these detailed instructions.

## Core Principles

1. **Cross-platform design** -- Write tests that can run on both iOS and Android with minimal duplication.
2. **Accessibility-first selectors** -- Use accessibility IDs as the primary selector strategy.
3. **Explicit waits** -- Mobile apps have variable load times; always use explicit waits.
4. **Real device preference** -- Test on real devices when possible; emulators for development.
5. **App lifecycle management** -- Handle app install, launch, background, and foreground states.

## Project Structure (Java)

```
src/
  main/java/com/example/
    pages/
      BasePage.java
      LoginPage.java
      HomePage.java
    utils/
      DriverFactory.java
      GestureHelper.java
      WaitHelper.java
      CapabilityBuilder.java
    config/
      AppConfig.java
  test/java/com/example/
    tests/
      BaseTest.java
      LoginTest.java
      HomeTest.java
    data/
      TestDataProvider.java
  test/resources/
    apps/
      app-debug.apk
      app-release.ipa
    config/
      android.properties
      ios.properties
pom.xml
```

## Project Structure (TypeScript with WebdriverIO)

```
tests/
  mobile/
    specs/
      login.spec.ts
      home.spec.ts
    pages/
      base.page.ts
      login.page.ts
      home.page.ts
    utils/
      gestures.ts
      helpers.ts
    config/
      wdio.android.conf.ts
      wdio.ios.conf.ts
    apps/
      android/
        app-debug.apk
      ios/
        app-release.ipa
package.json
```

## Desired Capabilities

### Android Capabilities

```java
UiAutomator2Options options = new UiAutomator2Options()
    .setDeviceName("Pixel 6")
    .setPlatformVersion("14")
    .setApp(System.getProperty("user.dir") + "/apps/app-debug.apk")
    .setAppPackage("com.example.myapp")
    .setAppActivity("com.example.myapp.MainActivity")
    .setAutomationName("UiAutomator2")
    .setNoReset(false)
    .setFullReset(false)
    .setNewCommandTimeout(Duration.ofSeconds(300))
    .setAutoGrantPermissions(true);

// For running on a real device
options.setUdid("emulator-5554");

// Performance options
options.setCapability("disableWindowAnimation", true);
options.setCapability("skipServerInstallation", false);
```

### iOS Capabilities

```java
XCUITestOptions options = new XCUITestOptions()
    .setDeviceName("iPhone 15 Pro")
    .setPlatformVersion("17.0")
    .setApp(System.getProperty("user.dir") + "/apps/MyApp.ipa")
    .setBundleId("com.example.myapp")
    .setAutomationName("XCUITest")
    .setNoReset(false)
    .setAutoAcceptAlerts(true)
    .setNewCommandTimeout(Duration.ofSeconds(300));

// For simulators
options.setCapability("useSimulator", true);

// For real devices
options.setUdid("device-udid-here");
options.setCapability("xcodeOrgId", "YOUR_TEAM_ID");
options.setCapability("xcodeSigningId", "iPhone Developer");
```

### WebdriverIO Configuration (TypeScript)

```typescript
// wdio.android.conf.ts
export const config: WebdriverIO.Config = {
  runner: 'local',
  port: 4723,
  specs: ['./tests/mobile/specs/**/*.spec.ts'],
  capabilities: [{
    platformName: 'Android',
    'appium:deviceName': 'Pixel 6',
    'appium:platformVersion': '14',
    'appium:app': './apps/android/app-debug.apk',
    'appium:automationName': 'UiAutomator2',
    'appium:noReset': false,
    'appium:autoGrantPermissions': true,
  }],
  framework: 'mocha',
  mochaOpts: {
    timeout: 60000,
  },
  services: ['appium'],
};
```

## Page Object Model

### Base Page (Java)

```java
package com.example.pages;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.pagefactory.AppiumFieldDecorator;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;

public abstract class BasePage {
    protected AppiumDriver driver;
    protected WebDriverWait wait;

    public BasePage(AppiumDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
        PageFactory.initElements(new AppiumFieldDecorator(driver, Duration.ofSeconds(10)), this);
    }

    protected WebElement waitForElement(String accessibilityId) {
        return wait.until(ExpectedConditions.visibilityOfElementLocated(
            AppiumBy.accessibilityId(accessibilityId)
        ));
    }

    protected void tap(String accessibilityId) {
        waitForElement(accessibilityId).click();
    }

    protected void type(String accessibilityId, String text) {
        WebElement element = waitForElement(accessibilityId);
        element.clear();
        element.sendKeys(text);
    }

    protected String getText(String accessibilityId) {
        return waitForElement(accessibilityId).getText();
    }

    protected boolean isDisplayed(String accessibilityId) {
        try {
            return waitForElement(accessibilityId).isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }

    protected void hideKeyboard() {
        try {
            driver.hideKeyboard();
        } catch (Exception ignored) {
            // Keyboard not visible
        }
    }
}
```

### Login Page (Java)

```java
package com.example.pages;

import io.appium.java_client.AppiumBy;
import io.appium.java_client.AppiumDriver;
import io.appium.java_client.pagefactory.AndroidFindBy;
import io.appium.java_client.pagefactory.iOSXCUITFindBy;
import org.openqa.selenium.WebElement;

public class LoginPage extends BasePage {

    @AndroidFindBy(accessibility = "email-input")
    @iOSXCUITFindBy(accessibility = "email-input")
    private WebElement emailInput;

    @AndroidFindBy(accessibility = "password-input")
    @iOSXCUITFindBy(accessibility = "password-input")
    private WebElement passwordInput;

    @AndroidFindBy(accessibility = "login-button")
    @iOSXCUITFindBy(accessibility = "login-button")
    private WebElement loginButton;

    @AndroidFindBy(accessibility = "error-message")
    @iOSXCUITFindBy(accessibility = "error-message")
    private WebElement errorMessage;

    public LoginPage(AppiumDriver driver) {
        super(driver);
    }

    public LoginPage enterEmail(String email) {
        emailInput.clear();
        emailInput.sendKeys(email);
        return this;
    }

    public LoginPage enterPassword(String password) {
        passwordInput.clear();
        passwordInput.sendKeys(password);
        return this;
    }

    public HomePage tapLogin() {
        loginButton.click();
        return new HomePage(driver);
    }

    public LoginPage tapLoginExpectingError() {
        loginButton.click();
        return this;
    }

    public HomePage loginAs(String email, String password) {
        enterEmail(email);
        enterPassword(password);
        hideKeyboard();
        return tapLogin();
    }

    public String getErrorMessage() {
        return errorMessage.getText();
    }

    public boolean isErrorDisplayed() {
        try {
            return errorMessage.isDisplayed();
        } catch (Exception e) {
            return false;
        }
    }
}
```

### Login Page (TypeScript with WebdriverIO)

```typescript
// pages/login.page.ts
export class LoginPage {
  get emailInput() { return $('~email-input'); }
  get passwordInput() { return $('~password-input'); }
  get loginButton() { return $('~login-button'); }
  get errorMessage() { return $('~error-message'); }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.setValue(email);
    await this.passwordInput.setValue(password);
    if (driver.isKeyboardShown()) {
      await driver.hideKeyboard();
    }
    await this.loginButton.click();
  }

  async getErrorText(): Promise<string> {
    await this.errorMessage.waitForDisplayed({ timeout: 5000 });
    return this.errorMessage.getText();
  }

  async isErrorVisible(): Promise<boolean> {
    return this.errorMessage.isDisplayed();
  }
}

export const loginPage = new LoginPage();
```

## Selector Strategies -- Priority Order

1. **Accessibility ID** (preferred for both platforms):
   ```java
   driver.findElement(AppiumBy.accessibilityId("login-button"));
   ```
   ```typescript
   $('~login-button')  // WebdriverIO shorthand for accessibility ID
   ```

2. **ID** (Android resource-id):
   ```java
   driver.findElement(AppiumBy.id("com.example.myapp:id/login_btn"));
   ```

3. **Class Name**:
   ```java
   driver.findElement(AppiumBy.className("android.widget.Button"));
   ```

4. **UiAutomator selector** (Android):
   ```java
   driver.findElement(AppiumBy.androidUIAutomator(
       "new UiSelector().text(\"Login\").className(\"android.widget.Button\")"
   ));
   ```

5. **iOS Predicate String**:
   ```java
   driver.findElement(AppiumBy.iOSNsPredicateString(
       "type == 'XCUIElementTypeButton' AND name == 'Login'"
   ));
   ```

6. **iOS Class Chain**:
   ```java
   driver.findElement(AppiumBy.iOSClassChain(
       "**/XCUIElementTypeButton[`name == 'Login'`]"
   ));
   ```

7. **XPath** (slowest -- last resort):
   ```java
   driver.findElement(By.xpath("//android.widget.Button[@text='Login']"));
   ```

## Gesture Handling

### Java Gesture Helper

```java
package com.example.utils;

import io.appium.java_client.AppiumDriver;
import org.openqa.selenium.Dimension;
import org.openqa.selenium.Point;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Pause;
import org.openqa.selenium.interactions.PointerInput;
import org.openqa.selenium.interactions.Sequence;

import java.time.Duration;
import java.util.Collections;

public class GestureHelper {
    private final AppiumDriver driver;

    public GestureHelper(AppiumDriver driver) {
        this.driver = driver;
    }

    public void swipeUp() {
        Dimension size = driver.manage().window().getSize();
        int startX = size.getWidth() / 2;
        int startY = (int) (size.getHeight() * 0.8);
        int endY = (int) (size.getHeight() * 0.2);
        performSwipe(startX, startY, startX, endY);
    }

    public void swipeDown() {
        Dimension size = driver.manage().window().getSize();
        int startX = size.getWidth() / 2;
        int startY = (int) (size.getHeight() * 0.2);
        int endY = (int) (size.getHeight() * 0.8);
        performSwipe(startX, startY, startX, endY);
    }

    public void swipeLeft() {
        Dimension size = driver.manage().window().getSize();
        int startX = (int) (size.getWidth() * 0.8);
        int endX = (int) (size.getWidth() * 0.2);
        int y = size.getHeight() / 2;
        performSwipe(startX, y, endX, y);
    }

    public void swipeRight() {
        Dimension size = driver.manage().window().getSize();
        int startX = (int) (size.getWidth() * 0.2);
        int endX = (int) (size.getWidth() * 0.8);
        int y = size.getHeight() / 2;
        performSwipe(startX, y, endX, y);
    }

    public void longPress(WebElement element) {
        Point center = getCenter(element);
        PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
        Sequence longPressSeq = new Sequence(finger, 0);
        longPressSeq.addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), center.getX(), center.getY()));
        longPressSeq.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        longPressSeq.addAction(new Pause(finger, Duration.ofSeconds(2)));
        longPressSeq.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
        driver.perform(Collections.singletonList(longPressSeq));
    }

    public void doubleTap(WebElement element) {
        Point center = getCenter(element);
        PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
        Sequence doubleTapSeq = new Sequence(finger, 0);
        doubleTapSeq.addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), center.getX(), center.getY()));
        doubleTapSeq.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        doubleTapSeq.addAction(new Pause(finger, Duration.ofMillis(50)));
        doubleTapSeq.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
        doubleTapSeq.addAction(new Pause(finger, Duration.ofMillis(100)));
        doubleTapSeq.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        doubleTapSeq.addAction(new Pause(finger, Duration.ofMillis(50)));
        doubleTapSeq.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
        driver.perform(Collections.singletonList(doubleTapSeq));
    }

    private void performSwipe(int startX, int startY, int endX, int endY) {
        PointerInput finger = new PointerInput(PointerInput.Kind.TOUCH, "finger");
        Sequence swipe = new Sequence(finger, 0);
        swipe.addAction(finger.createPointerMove(Duration.ZERO, PointerInput.Origin.viewport(), startX, startY));
        swipe.addAction(finger.createPointerDown(PointerInput.MouseButton.LEFT.asArg()));
        swipe.addAction(finger.createPointerMove(Duration.ofMillis(600), PointerInput.Origin.viewport(), endX, endY));
        swipe.addAction(finger.createPointerUp(PointerInput.MouseButton.LEFT.asArg()));
        driver.perform(Collections.singletonList(swipe));
    }

    private Point getCenter(WebElement element) {
        Point loc = element.getLocation();
        Dimension size = element.getSize();
        return new Point(loc.getX() + size.getWidth() / 2, loc.getY() + size.getHeight() / 2);
    }
}
```

## Common Test Patterns

### Handling Permissions Dialogs

```java
// Android -- auto-grant in capabilities
options.setAutoGrantPermissions(true);

// iOS -- auto-accept alerts in capabilities
options.setAutoAcceptAlerts(true);

// Manual handling
public void handlePermissionDialog(boolean allow) {
    try {
        if (driver instanceof AndroidDriver) {
            String buttonText = allow ? "Allow" : "Deny";
            driver.findElement(AppiumBy.xpath(
                "//android.widget.Button[@text='" + buttonText + "']"
            )).click();
        } else if (driver instanceof IOSDriver) {
            String buttonLabel = allow ? "Allow" : "Don't Allow";
            driver.findElement(AppiumBy.accessibilityId(buttonLabel)).click();
        }
    } catch (Exception ignored) {
        // No dialog present
    }
}
```

### App Lifecycle Management

```java
// Background app for N seconds
driver.runAppInBackground(Duration.ofSeconds(5));

// Terminate and relaunch
((AndroidDriver) driver).terminateApp("com.example.myapp");
((AndroidDriver) driver).activateApp("com.example.myapp");

// Check if app is installed
boolean isInstalled = ((AndroidDriver) driver).isAppInstalled("com.example.myapp");

// Install app
((AndroidDriver) driver).installApp("/path/to/app.apk");
```

## Best Practices

1. **Use accessibility IDs** -- They work cross-platform and are the most reliable.
2. **Avoid XPath** -- XPath is slow on mobile, especially iOS.
3. **Handle keyboards** -- Always hide the keyboard after typing.
4. **Use explicit waits** -- Mobile apps load at variable speeds.
5. **Test on real devices** -- Emulators do not catch all device-specific issues.
6. **Test different orientations** -- Verify portrait and landscape modes.
7. **Test interruptions** -- Incoming calls, notifications, low battery scenarios.
8. **Test network conditions** -- Slow, offline, and switching between WiFi/cellular.
9. **Test deep links** -- Verify the app handles custom URL schemes correctly.
10. **Use appium-doctor** -- Run it before setting up to verify your environment.

## Anti-Patterns to Avoid

1. **Hardcoded sleep** -- Use explicit waits instead of `Thread.sleep()`.
2. **XPath-heavy selectors** -- Slow and brittle on mobile.
3. **Ignoring platform differences** -- iOS and Android have different UX patterns.
4. **Not resetting app state** -- Tests that depend on previous test state are flaky.
5. **Testing only on emulators** -- Real devices behave differently.
6. **Ignoring app permissions** -- Not handling permission dialogs causes test failures.
7. **Not handling keyboard** -- The keyboard can obscure elements and cause failures.
8. **Large test suites on single device** -- Use parallel device execution.
9. **Not testing offline behavior** -- Network conditions vary for mobile users.
10. **Ignoring app performance** -- Mobile users notice lag more than desktop users.
