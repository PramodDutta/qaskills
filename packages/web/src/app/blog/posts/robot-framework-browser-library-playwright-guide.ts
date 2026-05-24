import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Browser Library (Playwright) Complete Guide',
  description:
    'Complete guide to the Robot Framework Browser library powered by Playwright. Setup, locators, auto-wait, parallel testing, mobile emulation, and CI patterns.',
  date: '2026-05-06',
  category: 'Guide',
  content: `
# Robot Framework Browser Library (Playwright) Complete Guide

The Browser library is the modern face of Robot Framework UI testing, replacing the venerable SeleniumLibrary with a faster, more reliable engine built on Playwright. While SeleniumLibrary maps Robot keywords to Selenium WebDriver, Browser maps them to Playwright's Node-based driver - bringing auto-wait, network interception, modern locators, and dramatically reduced flakiness. For teams starting new Robot suites in 2026, Browser is usually the right default unless legacy Selenium Grid infrastructure mandates SeleniumLibrary.

This complete guide covers the Browser library from setup through advanced patterns. You'll learn the installation process (which requires Node.js alongside Python), the new locator system with built-in CSS, XPath, role, text, and id strategies, the auto-wait behavior that eliminates most explicit waits, network mocking, mobile emulation, parallel execution with pabot, and CI integration. Real test suites and migration patterns from SeleniumLibrary are included. By the end you'll be ready to write or modernize Robot Framework UI test suites with confidence.

## Key Takeaways

- Browser library wraps Playwright - faster and more reliable than Selenium
- Auto-wait built into most keywords - fewer explicit waits needed
- Requires Node.js >= 18 alongside Python >= 3.8
- Supports Chromium, Firefox, WebKit out of the box
- Network interception lets you mock APIs at the browser level
- Built-in screenshot, video, and trace recording
- Test parallelization via pabot scales well

---

## Installation

\`\`\`bash
pip install robotframework-browser
rfbrowser init
\`\`\`

The rfbrowser init command downloads Playwright browsers (chromium, firefox, webkit) and the Node driver.

## Basic Test

\`\`\`robot
*** Settings ***
Library    Browser

*** Test Cases ***
Open And Verify Title
    New Browser    chromium    headless=true
    New Page    https://app.example.com
    Get Title    ==    Example App
    Close Browser
\`\`\`

The keywords feel similar to SeleniumLibrary but with crucial differences - Get Title takes a comparison operator and value, asserting in one step.

## Browser, Context, Page Hierarchy

Playwright separates three layers:

| Concept | What | Robot Keyword |
|---------|------|---------------|
| Browser | The actual browser process | New Browser |
| Context | An isolated session (cookies, storage) | New Context |
| Page | A single tab | New Page |

\`\`\`robot
*** Test Cases ***
Multi Context Example
    New Browser    chromium    headless=true
    New Context    viewport={'width': 1920, 'height': 1080}
    New Page    https://app.example.com
    # ... test interactions
    Close Browser
\`\`\`

## Locators

\`\`\`robot
*** Test Cases ***
Locator Strategies
    New Browser    chromium
    New Page    \${URL}
    Click    id=submit-btn
    Click    css=.btn-primary
    Click    xpath=//button[@type='submit']
    Click    text=Sign in
    Click    role=button[name="Submit"]
    Close Browser
\`\`\`

Role locators are the recommended approach for accessibility-friendly tests.

## Auto Wait

Most actions wait automatically:

\`\`\`robot
*** Test Cases ***
No Explicit Wait Needed
    New Browser    chromium
    New Page    \${URL}
    Click    text=Open Dialog
    Click    text=Confirm
    Get Text    css=.confirmation    ==    Done!
    Close Browser
\`\`\`

Playwright waits for the element to be visible, stable, enabled, and receive events before clicking - eliminating the most common SeleniumLibrary flakiness.

## Explicit Waits When Needed

\`\`\`robot
*** Test Cases ***
Custom Wait Conditions
    New Browser    chromium
    New Page    \${URL}
    Wait For Elements State    css=.spinner    detached    timeout=15s
    Wait For Load State    networkidle
    Wait For Response    matcher=**/api/orders    timeout=30s
    Close Browser
\`\`\`

## Forms

\`\`\`robot
*** Test Cases ***
Form Inputs
    New Browser    chromium
    New Page    \${URL}/signup
    Fill Text    id=email    test@example.com
    Type Text    id=name    Alice    delay=50ms
    Check Checkbox    id=terms
    Select Options By    label    id=country    United States
    Upload File By Selector    id=avatar    /tmp/avatar.png
    Click    text=Sign Up
    Close Browser
\`\`\`

## Assertions

\`\`\`robot
*** Test Cases ***
Built In Assertions
    New Browser    chromium
    New Page    \${URL}
    Get Title    ==    Home
    Get URL    contains    /home
    Get Text    css=.username    ==    Alice
    Get Element Count    css=.product    ==    12
    Get Element States    id=submit    *=    visible    enabled
    Close Browser
\`\`\`

Assertions are inline: action returns a value and the operator compares it.

## Network Interception

\`\`\`robot
*** Test Cases ***
Mock API Response
    New Browser    chromium
    New Context
    New Page    \${URL}/dashboard
    Route To Page With Mock    **/api/user    \${MOCK_USER_JSON}
    Reload
    Get Text    css=.username    ==    Mocked User
    Close Browser

*** Variables ***
\${MOCK_USER_JSON}    {"name": "Mocked User", "email": "mock@test.com"}

*** Keywords ***
Route To Page With Mock
    [Arguments]    \${pattern}    \${body}
    Mock Route To    \${pattern}    response_body=\${body}    content_type=application/json
\`\`\`

## Screenshots And Videos

\`\`\`robot
*** Settings ***
Library    Browser

*** Test Cases ***
Record Everything
    New Browser    chromium
    New Context    recordVideo={'dir': 'videos/'}
    New Page    \${URL}
    Take Screenshot    fullPage=true    filename=homepage.png
    Click    text=Login
    Fill Text    id=username    user
    Take Screenshot    filename=after-username.png
    Close Browser
\`\`\`

Videos are automatically saved to videos/ when recordVideo is configured.

## Mobile Emulation

\`\`\`robot
*** Test Cases ***
Test On Mobile
    New Browser    chromium    headless=true
    New Context    viewport={'width': 375, 'height': 812}    userAgent=Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)
    New Page    \${URL}
    Get Element Count    css=.mobile-menu    ==    1
    Close Browser
\`\`\`

## Multiple Tabs

\`\`\`robot
*** Test Cases ***
Multi Tab Flow
    New Browser    chromium
    New Page    \${URL}
    Click    text=Open in new tab
    Switch Page    NEW
    Get Title    ==    New Tab Title
    Close Page
    Switch Page    CURRENT
    Close Browser
\`\`\`

## Cookies And Storage

\`\`\`robot
*** Test Cases ***
Cookies Set And Read
    New Browser    chromium
    New Context
    Add Cookie    name=session    value=abc123    domain=example.com    path=/
    New Page    \${URL}
    \${cookies}=    Get Cookies
    Length Should Be Greater Than    \${cookies}    0
    Close Browser
\`\`\`

## Authentication State Reuse

For performance, log in once and reuse the storage state:

\`\`\`robot
*** Test Cases ***
Pre Authenticated Test
    New Browser    chromium
    New Context    storageState=auth.json
    New Page    \${URL}/dashboard
    Get Element States    id=dashboard    *=    visible
    Close Browser

Save Auth Once
    New Browser    chromium
    New Context
    New Page    \${URL}/login
    Fill Text    id=username    user
    Fill Text    id=password    pass
    Click    text=Login
    Wait For Load State    networkidle
    Save Storage State    auth.json
    Close Browser
\`\`\`

## Page Object Pattern

Same Resource file pattern as SeleniumLibrary:

\`\`\`robot
*** Settings ***
Documentation    Login page object
Library    Browser

*** Variables ***
\${USERNAME_INPUT}    id=username
\${PASSWORD_INPUT}    id=password
\${LOGIN_BUTTON}    text=Sign In
\${ERROR_MSG}    css=.error

*** Keywords ***
Open Login Page
    New Page    \${BASE_URL}/login

Login With
    [Arguments]    \${user}    \${pass}
    Fill Text    \${USERNAME_INPUT}    \${user}
    Fill Text    \${PASSWORD_INPUT}    \${pass}
    Click    \${LOGIN_BUTTON}

Login Error Should Show
    [Arguments]    \${msg}
    Get Text    \${ERROR_MSG}    ==    \${msg}
\`\`\`

## Trace Viewer

\`\`\`robot
*** Settings ***
Library    Browser

*** Test Cases ***
Test With Trace
    New Browser    chromium
    New Context    tracing=on
    New Page    \${URL}
    Click    text=Buy
    Fill Text    id=card    4242424242424242
    Click    text=Pay
    Save Trace    trace.zip
    Close Browser
\`\`\`

Open the trace in Playwright's trace viewer: npx playwright show-trace trace.zip

## Performance: Suite Vs Test Setup

\`\`\`robot
*** Settings ***
Library    Browser
Suite Setup    Open Suite Browser
Suite Teardown    Close Suite Browser

*** Keywords ***
Open Suite Browser
    New Browser    chromium    headless=true

Close Suite Browser
    Close Browser    ALL

*** Test Cases ***
Test One
    New Context
    New Page    \${URL}
    # ...
    Close Context

Test Two
    New Context
    New Page    \${URL}/other
    # ...
    Close Context
\`\`\`

Reusing the browser across tests is much faster than opening one per test.

## Parallel Execution

\`\`\`bash
pip install robotframework-pabot
pabot --processes 4 tests/
\`\`\`

Each pabot worker creates its own Browser process, so contexts don't bleed.

## Browser Vs SeleniumLibrary Comparison

| Aspect | SeleniumLibrary | Browser |
|--------|----------------|---------|
| Engine | Selenium WebDriver | Playwright |
| Auto-wait | Limited | Built-in |
| Speed | Baseline | 2-3x faster |
| Network mocking | Hard | Built-in |
| Mobile emulation | Manual | Built-in |
| Trace viewer | No | Yes |
| Browsers | Chrome, Firefox, Edge, Safari | Chromium, Firefox, WebKit |
| Setup | Drivers per OS | Single rfbrowser init |
| Maturity | Highest | High |

## Migration From SeleniumLibrary

Most keywords have direct equivalents:

| SeleniumLibrary | Browser |
|----------------|---------|
| Open Browser url chrome | New Browser chromium + New Page url |
| Click Element | Click |
| Input Text | Fill Text |
| Wait Until Element Is Visible | Wait For Elements State visible |
| Element Should Be Visible | Get Element States *= visible |
| Capture Page Screenshot | Take Screenshot |
| Close Browser | Close Browser |

Migration usually takes a day per medium-sized suite if you replace keywords incrementally.

## CI Pipeline

\`\`\`yaml
name: Browser Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: pip install robotframework robotframework-browser
      - run: rfbrowser init
      - run: robot --outputdir results tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results
          path: results/
\`\`\`

## Anti-Patterns

| Anti-Pattern | Better |
|--------------|--------|
| Open Browser per test | Reuse browser at suite level |
| Sleep | Wait For Load State / Wait For Elements State |
| Brittle XPath | Role or test-id locators |
| Tests sharing context | New Context per test |
| Not capturing traces | Always capture in CI |

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    Full checkout flow with Browser library
Library          Browser
Resource         pages/login.resource
Resource         pages/checkout.resource
Suite Setup      New Browser    chromium    headless=true
Suite Teardown   Close Browser    ALL
Test Teardown    Run Keyword If Test Failed    Take Screenshot    fullPage=true

*** Variables ***
\${BASE_URL}    https://shop.example.com

*** Test Cases ***
End To End Purchase
    [Tags]    smoke    e2e
    New Context    viewport={'width': 1920, 'height': 1080}    recordVideo={'dir': 'videos/'}
    Open Login Page
    Login With    test@example.com    SecurePass123!
    Go To Product    SKU-12345
    Add To Cart
    Proceed To Checkout
    Fill Shipping
    Submit Payment    4242424242424242
    Get Text    css=.order-confirmation    contains    Thank you
    Close Context

Mobile Layout Works
    [Tags]    mobile
    New Context    viewport={'width': 375, 'height': 812}
    New Page    \${BASE_URL}
    Get Element Count    css=.mobile-menu-toggle    ==    1
    Close Context
\`\`\`

## Conclusion

Robot Framework's Browser library is the modern choice for new UI test suites. By bringing Playwright's speed, reliability, and ergonomics under Robot's keyword-driven syntax, it produces tests that are both readable and resilient. The migration from SeleniumLibrary is straightforward when done incrementally, and the long-term gains in stability are dramatic. For teams investing in Robot Framework today, Browser is usually the right default.

Start with one new test suite using Browser. Compare its flake rate and run time to your existing SeleniumLibrary suites. Within a sprint or two you'll see the difference, and migration becomes obvious. Explore our [skills directory](/skills) or read the [Playwright test agents guide](/blog/playwright-test-agents-claude-code) for further reading.
`,
};
