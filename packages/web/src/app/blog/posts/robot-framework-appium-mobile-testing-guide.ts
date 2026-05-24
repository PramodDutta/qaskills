import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Appium Mobile Testing Complete Guide',
  description:
    'Mobile app testing with Robot Framework and AppiumLibrary. iOS and Android setup, gestures, locators, hybrid apps, device farms, and CI/CD patterns.',
  date: '2026-05-07',
  category: 'Guide',
  content: `
# Robot Framework Appium Mobile Testing Complete Guide

Mobile testing has become non-negotiable for any product with a mobile presence. The combination of Robot Framework and Appium provides a keyword-driven, cross-platform automation solution that works for native iOS and Android apps, hybrid apps with web views, and even pure mobile web. AppiumLibrary wraps the Appium client in Robot keywords for Open Application, Click Element, Input Text, Swipe, Get Page Source, and dozens more. With a single test suite, you can drive both iOS Simulators and Android Emulators (or real devices), automated entirely from your CI/CD pipeline.

This complete guide walks through setting up Robot Framework with AppiumLibrary, configuring Android and iOS targets, writing reliable mobile tests with proper waits and gestures, handling hybrid web views, integrating with device farms like BrowserStack and Sauce Labs, and bringing it all together in a CI pipeline. Code samples are runnable. By the end you'll have the patterns needed to ship a production mobile test suite.

## Key Takeaways

- AppiumLibrary wraps the Appium WebDriver client for Robot Framework
- iOS requires macOS, Xcode, and a Mac-based CI runner; Android works anywhere
- Use Appium 2 with the UiAutomator2 (Android) and XCUITest (iOS) drivers
- Gestures like Swipe, Pinch, Long Press are first-class Robot keywords
- Device farms (BrowserStack, Sauce Labs) eliminate local device management
- Hybrid apps need context switching between NATIVE_APP and WEBVIEW
- Tag tests by platform so iOS and Android run on appropriate runners

---

## Installation

\`\`\`bash
pip install robotframework robotframework-appiumlibrary
npm install -g appium
appium driver install uiautomator2
appium driver install xcuitest
\`\`\`

Start the Appium server:

\`\`\`bash
appium --port 4723
\`\`\`

## Android Basic Test

\`\`\`robot
*** Settings ***
Library    AppiumLibrary

*** Variables ***
\${APPIUM_URL}    http://localhost:4723
\${PLATFORM}    Android
\${DEVICE}    emulator-5554
\${APP_PATH}    \${CURDIR}/app-release.apk
\${PACKAGE}    com.example.myapp
\${ACTIVITY}    .MainActivity

*** Test Cases ***
Android Login Flow
    Open Application    \${APPIUM_URL}
    ...    platformName=\${PLATFORM}
    ...    deviceName=\${DEVICE}
    ...    app=\${APP_PATH}
    ...    appPackage=\${PACKAGE}
    ...    appActivity=\${ACTIVITY}
    ...    automationName=UiAutomator2
    Wait Until Page Contains Element    id=com.example.myapp:id/login_form
    Input Text    id=com.example.myapp:id/username    user@example.com
    Input Text    id=com.example.myapp:id/password    secret
    Click Element    id=com.example.myapp:id/login_btn
    Wait Until Page Contains    Welcome
    Close Application
\`\`\`

## iOS Basic Test

\`\`\`robot
*** Settings ***
Library    AppiumLibrary

*** Variables ***
\${APPIUM_URL}    http://localhost:4723
\${IOS_DEVICE}    iPhone 15
\${IOS_VERSION}    17.0
\${BUNDLE_ID}    com.example.myapp

*** Test Cases ***
iOS Login Flow
    Open Application    \${APPIUM_URL}
    ...    platformName=iOS
    ...    platformVersion=\${IOS_VERSION}
    ...    deviceName=\${IOS_DEVICE}
    ...    bundleId=\${BUNDLE_ID}
    ...    automationName=XCUITest
    Wait Until Page Contains Element    accessibility_id=loginForm
    Input Text    accessibility_id=usernameField    user@example.com
    Input Text    accessibility_id=passwordField    secret
    Click Element    accessibility_id=loginButton
    Wait Until Page Contains    Welcome
    Close Application
\`\`\`

## Locator Strategies

| Strategy | Syntax | Platform |
|----------|--------|----------|
| id | id=resource-id | Android |
| accessibility id | accessibility_id=label | Both |
| name | name=NavigationBar | Both |
| xpath | xpath=//XCUIElementTypeButton[@name='Login'] | Both |
| class | class=android.widget.Button | Android |
| android uiautomator | android=new UiSelector().text("Login") | Android |
| ios predicate | ios=name == 'Login' | iOS |
| ios class chain | ios_chain=**/XCUIElementTypeButton[\`name == 'Login'\`] | iOS |

## Gestures

\`\`\`robot
*** Test Cases ***
Swipe Up Scrolls List
    Open Application    \${APPIUM_URL}    \${ANDROID_CAPS}
    Wait Until Page Contains Element    id=list-view
    Swipe    500    1500    500    500    duration=600
    Element Should Be Visible    text=Item 50
    Close Application

Pinch To Zoom
    Open Application    \${APPIUM_URL}    \${IOS_CAPS}
    Pinch    accessibility_id=mapView    percent=200    steps=50
    Close Application

Long Press
    Long Press    accessibility_id=messageRow    duration=2000
\`\`\`

## Custom Keywords For Each Platform

\`\`\`robot
*** Keywords ***
Open Android App
    Open Application    \${APPIUM_URL}
    ...    platformName=Android
    ...    automationName=UiAutomator2
    ...    deviceName=\${ANDROID_DEVICE}
    ...    app=\${ANDROID_APP}
    ...    appPackage=\${ANDROID_PACKAGE}
    ...    appActivity=\${ANDROID_ACTIVITY}

Open iOS App
    Open Application    \${APPIUM_URL}
    ...    platformName=iOS
    ...    automationName=XCUITest
    ...    platformVersion=\${IOS_VERSION}
    ...    deviceName=\${IOS_DEVICE}
    ...    bundleId=\${IOS_BUNDLE}

Open App By Platform
    [Arguments]    \${platform}
    Run Keyword If    '\${platform}'=='android'    Open Android App
    Run Keyword If    '\${platform}'=='ios'    Open iOS App
\`\`\`

## Hybrid Apps

For apps with WebView regions, switch contexts:

\`\`\`robot
*** Test Cases ***
Test WebView Content
    Open Application    \${APPIUM_URL}    \${ANDROID_CAPS}
    Click Element    id=open-webview-btn
    \${contexts}=    Get Contexts
    Log    Available contexts: \${contexts}
    Switch To Context    WEBVIEW_com.example.myapp
    Wait Until Page Contains Element    css=.webview-content
    Click Element    css=#submit-form
    Switch To Context    NATIVE_APP
    Click Element    id=back-btn
    Close Application
\`\`\`

## Mobile Web

For mobile browsers:

\`\`\`robot
*** Test Cases ***
Mobile Chrome Test
    Open Application    \${APPIUM_URL}
    ...    platformName=Android
    ...    browserName=Chrome
    ...    automationName=UiAutomator2
    ...    deviceName=\${DEVICE}
    Go To URL    https://app.example.com
    Click Element    css=.menu-toggle
    Element Should Be Visible    css=.mobile-menu
    Close Application
\`\`\`

## Device Farm Integration

### BrowserStack

\`\`\`robot
*** Variables ***
\${BS_USER}    %{BROWSERSTACK_USERNAME}
\${BS_KEY}    %{BROWSERSTACK_ACCESS_KEY}
\${BS_URL}    https://\${BS_USER}:\${BS_KEY}@hub-cloud.browserstack.com/wd/hub

*** Test Cases ***
Run On BrowserStack Android
    Open Application    \${BS_URL}
    ...    platformName=Android
    ...    deviceName=Samsung Galaxy S23
    ...    platformVersion=13.0
    ...    app=bs://abcd1234567890
    ...    project=MyApp
    ...    build=PR-\${BUILD_NUMBER}
    ...    name=Login Test
    Wait Until Page Contains    Welcome
    Close Application
\`\`\`

### Sauce Labs

\`\`\`robot
*** Variables ***
\${SAUCE_USER}    %{SAUCE_USERNAME}
\${SAUCE_KEY}    %{SAUCE_ACCESS_KEY}
\${SAUCE_URL}    https://\${SAUCE_USER}:\${SAUCE_KEY}@ondemand.saucelabs.com:443/wd/hub

*** Test Cases ***
Run On Sauce Labs iOS
    Open Application    \${SAUCE_URL}
    ...    platformName=iOS
    ...    deviceName=iPhone 15
    ...    platformVersion=17.0
    ...    app=storage:filename=myapp.ipa
    ...    name=Login Test
    Wait Until Page Contains    Welcome
    Close Application
\`\`\`

## Waits And Synchronization

\`\`\`robot
*** Test Cases ***
Wait Patterns
    Open Application    \${APPIUM_URL}    \${CAPS}
    Wait Until Page Contains Element    id=loading-spinner    timeout=5s
    Wait Until Page Does Not Contain Element    id=loading-spinner    timeout=30s
    Wait Until Element Is Visible    id=welcome-msg
    Wait Until Element Is Enabled    id=continue-btn
    Close Application
\`\`\`

## Screenshots And Debugging

\`\`\`robot
*** Test Cases ***
Capture Mobile Screenshot
    Open Application    \${APPIUM_URL}    \${CAPS}
    Capture Page Screenshot    homescreen.png
    Click Element    id=settings-btn
    Capture Page Screenshot    settings-page.png
    Close Application
\`\`\`

## Performance Patterns

| Pattern | Notes |
|---------|-------|
| Reset app between tests | Use noReset=true to skip |
| Pre-install app | Set app capability to URL or path |
| Increase newCommandTimeout | For long-running flows |
| Use parallel devices | Pabot with device-specific tags |

## Test Suite Structure

\`\`\`
mobile-tests/
  android/
    smoke/
    regression/
  ios/
    smoke/
    regression/
  shared/
    keywords.resource
    variables.resource
\`\`\`

## CI Pipeline

\`\`\`yaml
name: Mobile Tests
on: [push]
jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - uses: actions/setup-node@v4
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          script: |
            pip install robotframework robotframework-appiumlibrary
            npm install -g appium
            appium driver install uiautomator2
            appium --port 4723 &
            sleep 10
            robot --outputdir results --include android tests/

  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          pip install robotframework robotframework-appiumlibrary
          npm install -g appium
          appium driver install xcuitest
          appium --port 4723 &
          sleep 10
          xcrun simctl boot "iPhone 15" || true
          robot --outputdir results --include ios tests/
\`\`\`

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    End to end mobile checkout flow
Library          AppiumLibrary
Resource         shared/keywords.resource
Suite Setup      Open App By Platform    \${PLATFORM}
Suite Teardown   Close Application
Test Teardown    Run Keyword If Test Failed    Capture Page Screenshot

*** Variables ***
\${PLATFORM}    android
\${APPIUM_URL}    http://localhost:4723

*** Test Cases ***
Browse Catalog And Purchase
    [Tags]    smoke    checkout    \${PLATFORM}
    Wait Until Page Contains    Featured
    Click Element    text=Laptops
    Wait Until Page Contains Element    id=product-list
    Click Element    text=MacBook Pro
    Click Element    id=add-to-cart
    Click Element    id=checkout
    Input Card Details    4242424242424242
    Submit Payment
    Wait Until Page Contains    Thank you for your order

Search Returns Results
    [Tags]    smoke    search
    Input Text    id=search-box    laptop
    Press Keycode    66
    Wait Until Page Contains Element    id=search-results
    \${count}=    Get Matching Xpath Count    //android.widget.TextView[contains(@text, 'Laptop')]
    Should Be True    \${count} > 0
\`\`\`

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Sleep | Slow and flaky | Wait Until Page Contains Element |
| Hardcoded coords | Resolution-dependent | Use accessibility IDs |
| One mega test | Hard to debug | Small focused tests |
| Shared session state | Tests bleed | Reset app between tests |
| No tags by platform | Wrong tests on wrong runner | Platform tags |

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| ChromeDriver mismatch | Old WebView | Update chromedriver autodownload |
| iOS sim won't start | Xcode mismatch | xcode-select --install |
| Appium connection refused | Server not running | appium --port 4723 |
| App not found | Wrong path | Use absolute paths |

## Conclusion

Robot Framework with AppiumLibrary lets you write mobile tests with the same approachable, keyword-driven syntax you use for web and API testing. The cross-platform abstraction means a single test (with platform-specific keywords) can validate both iOS and Android, while device farms remove the burden of physical device management. For organizations standardizing on Robot Framework across the test pyramid, AppiumLibrary is the natural extension to mobile.

Start by automating one critical flow - login or checkout - on both Android emulators and iOS simulators. Once stable, layer in regression tests, parallel runs on device farms, and full CI integration. Read more in our [skills directory](/skills) or the [mobile testing automation guide](/blog/mobile-testing-automation-guide).
`,
};
