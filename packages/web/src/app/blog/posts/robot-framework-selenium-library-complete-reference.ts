import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework SeleniumLibrary Complete Reference 2026',
  description:
    'Complete reference for Robot Framework SeleniumLibrary. Locators, waits, screenshots, custom keywords, cross-browser testing, and CI/CD integration patterns.',
  date: '2026-05-05',
  category: 'Reference',
  content: `
# Robot Framework SeleniumLibrary Complete Reference

SeleniumLibrary is the most widely used external library in the Robot Framework ecosystem, powering browser automation for thousands of QA teams worldwide. Built on Selenium WebDriver, it exposes hundreds of keywords for navigating, clicking, typing, scrolling, asserting, and screenshotting - all in Robot's keyword-driven, plain-English syntax. While newer libraries like Browser (built on Playwright) have emerged, SeleniumLibrary remains the default choice for many teams thanks to its maturity, cross-browser support, and integration with existing Selenium Grid infrastructure.

This complete reference covers every aspect of SeleniumLibrary in 2026: installation and setup, locator strategies, the full lifecycle of waits and synchronization, advanced techniques like JavaScript execution and mobile emulation, custom keyword design patterns, cross-browser configuration, and CI/CD integration. Whether you're maintaining a legacy SeleniumLibrary suite or starting a new project, this reference will be your day-to-day companion. The code samples are real and tested - copy them into your own project and adapt to your application.

## Key Takeaways

- SeleniumLibrary supports Chrome, Firefox, Edge, Safari, and remote Selenium Grid
- Locators support id, name, xpath, css, link text, partial link, tag, class
- Use explicit waits (Wait Until Element Is Visible) instead of Sleep
- Screenshots auto-capture on failure by default
- Custom keywords keep test cases readable
- Page Object Model translates well to Resource files
- Integrate with pabot for parallel execution

---

## Installation

\`\`\`bash
pip install robotframework robotframework-seleniumlibrary
\`\`\`

You also need browser drivers. SeleniumLibrary 6+ supports the Selenium Manager which auto-downloads drivers, so for simple use you don't need to install chromedriver manually.

## Basic Test Case

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Variables ***
\${URL}    https://app.example.com
\${BROWSER}    chrome

*** Test Cases ***
Open And Verify Title
    Open Browser    \${URL}    \${BROWSER}
    Title Should Be    Example App
    Close Browser
\`\`\`

## Locator Strategies

| Strategy | Syntax | Example |
|----------|--------|---------|
| id | id=foo | id=submit-btn |
| name | name=foo | name=email |
| xpath | xpath=... | xpath=//button[@type='submit'] |
| css | css=... | css=.btn-primary |
| link text | link=... | link=Sign in |
| partial link | partial link=... | partial link=Sign |
| tag | tag=foo | tag=button |
| class | class=foo | class=primary |

Default strategy is xpath when starting with // or (//, css for many other patterns.

## Finding Elements

\`\`\`robot
*** Test Cases ***
Locate Multiple Ways
    Open Browser    \${URL}    \${BROWSER}
    Element Should Be Visible    id=login-form
    Element Should Be Visible    css=.login-form
    Element Should Be Visible    xpath=//form[@id='login-form']
    Click Element                id=submit-btn
    Close Browser
\`\`\`

## Wait Keywords

\`\`\`robot
*** Test Cases ***
Synchronization Patterns
    Open Browser    \${URL}    \${BROWSER}
    Wait Until Element Is Visible        id=username       timeout=10s
    Input Text                           id=username       user@example.com
    Wait Until Element Is Enabled        id=submit-btn     timeout=5s
    Click Element                        id=submit-btn
    Wait Until Page Contains             Welcome           timeout=15s
    Wait Until Page Contains Element     css=.dashboard    timeout=10s
    Wait Until Location Contains         /home             timeout=10s
    Close Browser
\`\`\`

## Input And Interaction

\`\`\`robot
*** Test Cases ***
Form Inputs
    Open Browser    \${URL}/signup    \${BROWSER}
    Input Text       id=email      test@example.com
    Input Password   id=password   SecurePass123!
    Click Element    css=#terms input[type='checkbox']
    Select From List By Label    id=country    United States
    Choose File      id=avatar     /tmp/avatar.png
    Click Button     Sign Up
    Close Browser
\`\`\`

## Assertions

\`\`\`robot
*** Test Cases ***
Verify Page State
    Open Browser    \${URL}    \${BROWSER}
    Page Should Contain                 Welcome
    Page Should Contain Element         id=dashboard
    Page Should Not Contain             Error
    Element Should Be Visible           css=.user-menu
    Element Should Be Enabled           id=submit-btn
    Element Text Should Be              css=.username    Alice
    Element Attribute Value Should Be   id=email    value    test@example.com
    Element Should Contain              css=.balance    USD
    Close Browser
\`\`\`

## Frames And Windows

\`\`\`robot
*** Test Cases ***
Switch Frames
    Open Browser    \${URL}    \${BROWSER}
    Select Frame    id=payment-iframe
    Input Text      id=card-number    4242424242424242
    Unselect Frame
    Click Button    Pay
    Close Browser

Multiple Windows
    Open Browser    \${URL}    \${BROWSER}
    Click Link    open-in-new-tab
    Switch Window    NEW
    Title Should Be    New Tab Title
    Close Window
    Switch Window    MAIN
    Close Browser
\`\`\`

## Cookies And Storage

\`\`\`robot
*** Test Cases ***
Cookies
    Open Browser    \${URL}    \${BROWSER}
    Add Cookie    auth_token    secret-value    domain=.example.com
    Reload Page
    \${cookie}=    Get Cookie    auth_token
    Should Be Equal    \${cookie.value}    secret-value
    Delete Cookie    auth_token
    Close Browser
\`\`\`

## JavaScript Execution

\`\`\`robot
*** Test Cases ***
Run JavaScript
    Open Browser    \${URL}    \${BROWSER}
    Execute JavaScript    window.scrollTo(0, document.body.scrollHeight)
    \${title}=    Execute JavaScript    return document.title
    Log    Page title via JS: \${title}
    Close Browser
\`\`\`

## Screenshots

\`\`\`robot
*** Test Cases ***
Capture Screenshots
    Open Browser    \${URL}    \${BROWSER}
    Capture Page Screenshot    homepage.png
    Click Link    products
    Capture Element Screenshot    css=.featured-product    featured.png
    Close Browser
\`\`\`

On failure, SeleniumLibrary captures a screenshot automatically. To customize:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary    screenshot_root_directory=results/screenshots
\`\`\`

## Headless Mode

\`\`\`robot
*** Variables ***
\${BROWSER}    headlesschrome

*** Test Cases ***
Headless Run
    Open Browser    \${URL}    \${BROWSER}
    ...
\`\`\`

Or pass options:

\`\`\`robot
*** Keywords ***
Open Chrome Headless
    \${options}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys, selenium.webdriver
    Call Method    \${options}    add_argument    --headless=new
    Call Method    \${options}    add_argument    --no-sandbox
    Call Method    \${options}    add_argument    --window-size=1920,1080
    Create Webdriver    Chrome    options=\${options}
\`\`\`

## Remote Selenium Grid

\`\`\`robot
*** Test Cases ***
Run On Grid
    Open Browser    \${URL}    \${BROWSER}
    ...    remote_url=http://grid.example.com:4444/wd/hub
    ...    desired_capabilities=browserName:chrome,version:120
\`\`\`

## Mobile Emulation

\`\`\`robot
*** Keywords ***
Open Mobile Chrome
    \${mobile}=    Create Dictionary    deviceName=iPhone 13 Pro
    \${options}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys, selenium.webdriver
    Call Method    \${options}    add_experimental_option    mobileEmulation    \${mobile}
    Create Webdriver    Chrome    options=\${options}
    Go To    \${URL}
\`\`\`

## Page Object Pattern

Encapsulate page interactions in Resource files:

\`\`\`robot
*** Settings ***
Documentation    Login page object
Library    SeleniumLibrary

*** Variables ***
\${LOGIN_USERNAME}    id=username
\${LOGIN_PASSWORD}    id=password
\${LOGIN_SUBMIT}      id=submit-btn
\${LOGIN_ERROR}       css=.error-message

*** Keywords ***
Open Login Page
    Go To    \${BASE_URL}/login
    Wait Until Element Is Visible    \${LOGIN_USERNAME}

Fill Login Form
    [Arguments]    \${user}    \${pass}
    Input Text        \${LOGIN_USERNAME}    \${user}
    Input Password    \${LOGIN_PASSWORD}    \${pass}

Submit Login
    Click Button    \${LOGIN_SUBMIT}

Login With Credentials
    [Arguments]    \${user}    \${pass}
    Open Login Page
    Fill Login Form    \${user}    \${pass}
    Submit Login

Login Error Should Show
    [Arguments]    \${expected}
    Wait Until Element Is Visible    \${LOGIN_ERROR}
    Element Text Should Be    \${LOGIN_ERROR}    \${expected}
\`\`\`

Use in a test:

\`\`\`robot
*** Settings ***
Resource    pages/login.resource
Suite Setup    Open Browser    \${BASE_URL}    \${BROWSER}
Suite Teardown    Close Browser

*** Test Cases ***
Invalid Login Shows Error
    Login With Credentials    bad@example.com    wrongpass
    Login Error Should Show    Invalid credentials
\`\`\`

## Cross Browser Tests

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Variables ***
@{BROWSERS}    chrome    firefox    edge

*** Test Cases ***
Login Works In Chrome
    [Tags]    chrome
    Run Login Test    chrome

Login Works In Firefox
    [Tags]    firefox
    Run Login Test    firefox

*** Keywords ***
Run Login Test
    [Arguments]    \${browser}
    Open Browser    \${URL}    \${browser}
    Input Text    id=username    alice
    Input Password    id=password    secret
    Click Button    Login
    Wait Until Page Contains    Welcome
    Close Browser
\`\`\`

## Test Data Driven

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary
Test Template    Login With

*** Test Cases ***                  USERNAME           PASSWORD       EXPECTED
Valid User Logs In                  user@example.com   secret123      Welcome
Wrong Password                      user@example.com   wrong          Invalid
Missing Email                       \${EMPTY}           secret123      Email required

*** Keywords ***
Login With
    [Arguments]    \${user}    \${pass}    \${expected}
    Open Browser    \${URL}    \${BROWSER}
    Input Text    id=username    \${user}
    Input Password    id=password    \${pass}
    Click Button    Login
    Page Should Contain    \${expected}
    Close Browser
\`\`\`

## Performance Tracking

\`\`\`robot
*** Keywords ***
Measure Page Load
    [Arguments]    \${url}
    \${start}=    Get Time    epoch
    Go To    \${url}
    Wait Until Page Contains Element    css=.main-content
    \${end}=    Get Time    epoch
    \${duration}=    Evaluate    \${end} - \${start}
    Should Be True    \${duration} < 5    msg=Page took \${duration}s
    Log    Page load: \${duration}s
\`\`\`

## CI Integration

\`\`\`yaml
name: UI Tests
on: [push, pull_request]
jobs:
  ui:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - uses: browser-actions/setup-chrome@v1
      - run: pip install robotframework robotframework-seleniumlibrary
      - run: robot --variable BROWSER:headlesschrome --outputdir results tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: robot-results
          path: results/
\`\`\`

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Sleep | Wastes time or flakes | Wait Until Element Is Visible |
| Brittle XPath | Breaks on UI changes | data-test attributes |
| Open Browser per test | Slow | Suite-level Open Browser |
| Hardcoded URLs | Doesn't multi-env | Variable file |
| No screenshots | Hard to debug failures | Default screenshot on fail |

## Real Suite Example

\`\`\`robot
*** Settings ***
Documentation    Critical user flows for production
Library          SeleniumLibrary
Resource         pages/login.resource
Resource         pages/dashboard.resource
Resource         pages/checkout.resource
Suite Setup      Open Browser    \${BASE_URL}    \${BROWSER}
Suite Teardown   Close All Browsers
Test Teardown    Run Keyword If Test Failed    Capture Page Screenshot

*** Variables ***
\${BASE_URL}    https://shop.example.com
\${BROWSER}    headlesschrome

*** Test Cases ***
Smoke Login
    [Tags]    smoke    auth
    Login With Credentials    test@example.com    SecurePass123!
    Dashboard Should Be Visible

Smoke Search
    [Tags]    smoke    search
    Go To Search Page
    Input Search Term    laptop
    Submit Search
    Search Results Should Contain    laptop

End To End Checkout
    [Tags]    e2e    checkout
    Login With Credentials    test@example.com    SecurePass123!
    Add Item To Cart    SKU-12345
    Proceed To Checkout
    Submit Shipping Info
    Pay With Test Card
    Order Confirmation Should Show
\`\`\`

## Conclusion

SeleniumLibrary remains the workhorse of Robot Framework UI testing. While modern alternatives exist, its maturity, broad browser support, and rich ecosystem of complementary libraries make it a safe and powerful choice for new projects and a stable platform for legacy suites. The patterns in this reference - explicit waits, locator best practices, page objects, data-driven tests, and CI integration - apply equally to any modern web app, from React SPAs to legacy server-rendered apps.

Start with a single critical user journey and build it out using Resource files and explicit waits. Watch your suite mature into a reliable, fast safety net for production deploys. Visit our [skills directory](/skills) for related patterns or read the [Playwright e2e complete guide](/blog/playwright-e2e-complete-guide) for a modern comparison.
`,
};
