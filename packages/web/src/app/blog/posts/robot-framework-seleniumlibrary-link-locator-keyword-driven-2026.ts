import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework SeleniumLibrary link= Locator + Keyword-Driven Guide',
  description:
    'Master Robot Framework SeleniumLibrary link= locator and keyword-driven testing. Covers Click Link, css selectors, xpath, page objects, and CI patterns.',
  date: '2026-06-07',
  category: 'Guide',
  content: `
# Robot Framework SeleniumLibrary link= Locator + Keyword-Driven Guide

Robot Framework's SeleniumLibrary ships with one of the most expressive locator vocabularies of any test framework -- \`id=\`, \`name=\`, \`css=\`, \`xpath=\`, and the underrated \`link=\` strategy that matches anchor text exactly. Combined with the keyword-driven test architecture that Robot Framework was built for, you can write functional UI tests that read like product specifications. This guide covers every locator strategy SeleniumLibrary supports, when to reach for \`link=\` over \`css=\`, how to structure keyword-driven tests around page objects, and how to keep the suite maintainable as your application grows. If you are searching for \`robot framework seleniumlibrary keyword-driven testing\` or \`link= locator seleniumlibrary robot framework\`, this reference covers the canonical patterns.

We assume Robot Framework 6.x or 7.x, SeleniumLibrary 6.x, Python 3.10+, and either Chrome or Firefox installed locally for browser tests. Examples use Chrome unless stated otherwise.

## Key Takeaways

- SeleniumLibrary supports eight locator strategies: \`id\`, \`name\`, \`class\`, \`tag\`, \`xpath\`, \`css\`, \`link\`, and \`partial link\`
- \`link=Anchor Text\` matches \`<a>\` elements by exact visible text. \`partial link=Anchor\` matches by substring
- \`Click Link\` is shorthand for \`Click Element\` with a \`link=\` prefix; both work equivalently
- Keyword-driven testing means tests are sequences of named keywords (\`Login As Admin\`, \`Add To Cart\`) rather than raw library calls; the test layer reads as business steps
- Page objects in Robot Framework are typically separate \`.robot\` or \`.resource\` files containing keywords plus variable definitions for locators

## Why SeleniumLibrary Still Matters

In 2026 most teams pick Playwright or Cypress for new UI test suites. SeleniumLibrary still wins three battles:

- **WebDriver compatibility**: Selenium drives every browser, including IE-mode in Edge for legacy enterprise apps
- **Robot Framework ecosystem**: keyword-driven authoring, BDD-style structure, native integration with Robot reports, easy onboarding for testers who do not write Python
- **Battle-tested**: years of stability, fewer breaking changes than Playwright's quarterly major versions

If you have a Robot Framework suite already, SeleniumLibrary is the right tool. If you are starting fresh and want browser parity with parallel execution out of the box, look at the Browser library (Playwright backend) instead.

## Locator Strategy Reference

| Prefix | Matches | Example |
|---|---|---|
| \`id=\` | Element by id attribute | \`id=username\` |
| \`name=\` | Element by name attribute | \`name=password\` |
| \`class=\` | Element by class attribute | \`class=btn-primary\` |
| \`tag=\` | First element of tag type | \`tag=button\` |
| \`xpath=\` | XPath expression | \`xpath=//button[@type='submit']\` |
| \`css=\` | CSS selector | \`css=button.primary\` |
| \`link=\` | Anchor by exact visible text | \`link=Sign In\` |
| \`partial link=\` | Anchor by partial visible text | \`partial link=Sign\` |

If you omit the prefix, SeleniumLibrary tries to guess: it treats the value as an \`id\` first, then \`name\`. Always include the prefix for clarity.

## The link= Locator

\`link=\` is a shortcut for "find an \`<a>\` whose visible text equals this value". It compiles to an XPath like \`//a[normalize-space(text())='Sign In']\` under the hood.

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Test Cases ***
Click Sign In Link
    Open Browser    https://example.com    chrome
    Click Element    link=Sign In
    # equivalent to:
    Click Link    Sign In
\`\`\`

The text match is exact and case-sensitive. Whitespace is normalized so \`link=Sign In\` matches \`<a>  Sign In  </a>\`. For substring matching use \`partial link=\`:

\`\`\`robot
Click Element    partial link=Sign
\`\`\`

This matches \`Sign In\`, \`Sign Up\`, \`Sign Out\` -- whichever appears first.

## When to Use link= vs css= vs xpath=

| Scenario | Best locator | Why |
|---|---|---|
| Anchor with unique visible text | \`link=\` | Most readable, language-aligned |
| Anchor with stable id | \`id=\` | Fastest, immune to text changes |
| Anchor inside a list item with no id | \`css=li.product a\` | Structural targeting |
| Anchor by hidden attribute | \`xpath=//a[@data-cy='cta']\` | When data-cy attributes are added |
| Anchor with i18n text | \`css=\` or \`id=\` | \`link=\` breaks across locales |

The big tradeoff with \`link=\` is internationalization. If your test suite runs against \`en-US\` and \`de-DE\` builds, \`link=Sign In\` works on the English build and breaks on the German one. Either parameterize the text via a variable file or switch to a stable \`data-cy\` attribute.

## Keyword-Driven Test Structure

The keyword-driven philosophy says: tests should be expressed as sequences of business-meaningful keywords. The implementation of those keywords lives in resource files. The test reads top-to-bottom as a spec; the implementation is replaceable.

A minimal example:

\`\`\`robot
*** Settings ***
Resource    resources/login_page.resource
Resource    resources/checkout_page.resource

*** Test Cases ***
Buy A Product
    Login As Customer    ada@example.com    pw
    Browse To Product    SKU-123
    Add To Cart
    Proceed To Checkout
    Pay With Stored Card
    Order Confirmation Should Be Visible
\`\`\`

The test is six lines, every line is a business action, no locators or library calls appear. The implementations live in the resource files:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Variables ***
\${EMAIL_FIELD}      id=email
\${PASSWORD_FIELD}   id=password
\${SIGN_IN_LINK}     link=Sign In
\${SUBMIT_BUTTON}    css=button[type='submit']

*** Keywords ***
Login As Customer
    [Arguments]    \${email}    \${password}
    Click Element    \${SIGN_IN_LINK}
    Input Text    \${EMAIL_FIELD}    \${email}
    Input Text    \${PASSWORD_FIELD}    \${password}
    Click Button    \${SUBMIT_BUTTON}
    Wait Until Page Contains Element    css=.dashboard    timeout=10s
\`\`\`

This is the page object pattern as Robot Framework expresses it: variables for locators, keywords for actions, both centralized in a resource file.

## Comparison: Keyword-Driven vs Data-Driven vs Behavior-Driven

| Style | Test reads as | Implementation lives in | Best for |
|---|---|---|---|
| Keyword-driven | Sequence of named actions | Resource files | Functional UI tests |
| Data-driven | Single template + data table | Templates with \`Test Template\` | Many similar inputs |
| Behavior-driven (BDD) | Given/When/Then | Step files (Robot or Gherkin) | Stakeholder readability |

Robot Framework can mix all three. Keyword-driven is the default and easiest starting point.

## Full SeleniumLibrary Workflow Example

A complete e-commerce login + add-to-cart flow demonstrating every locator strategy:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary
Suite Setup       Open Browser    https://shop.example.com    chrome
Suite Teardown    Close Browser

*** Variables ***
\${TIMEOUT}    15s

*** Test Cases ***
Anonymous User Logs In Via Header Link
    [Documentation]    Tests the link= locator on the sticky header
    Click Element    link=Sign In
    Wait Until Element Is Visible    id=login-form    timeout=\${TIMEOUT}
    Input Text    id=email    ada@example.com
    Input Password    id=password    secret
    Click Button    css=button.primary[type='submit']
    Wait Until Page Contains Element    css=[data-testid='user-menu']    timeout=\${TIMEOUT}

User Adds Product To Cart Via Partial Link Match
    [Documentation]    Tests partial link= locator on category page
    Click Element    partial link=Headphones
    Wait Until Element Is Visible    xpath=//h1[contains(., 'Headphones')]    timeout=\${TIMEOUT}
    Click Element    css=article.product:first-of-type a
    Wait Until Element Is Visible    id=add-to-cart    timeout=\${TIMEOUT}
    Click Button    id=add-to-cart
    Wait Until Page Contains    Added to cart

User Verifies Cart Contents
    Click Link    Cart
    Wait Until Element Is Visible    css=.cart-line-item    timeout=\${TIMEOUT}
    \${count}=    Get Element Count    css=.cart-line-item
    Should Be Equal As Numbers    \${count}    1
\`\`\`

The test methodically demonstrates:

- \`link=Sign In\` for the header link
- \`partial link=Headphones\` for any "Headphones" related anchor
- \`xpath=\` for an h1 with substring content
- \`css=\` for structural targeting (\`:first-of-type\`)
- \`id=\` for stable form elements

## SeleniumLibrary Keyword Reference (Most Common)

| Keyword | Purpose | Example |
|---|---|---|
| \`Open Browser\` | Launch a browser | \`Open Browser  url  chrome\` |
| \`Close Browser\` | Close the current browser | \`Close Browser\` |
| \`Click Element\` | Click any element by locator | \`Click Element  link=Sign In\` |
| \`Click Link\` | Click anchor by text | \`Click Link  Sign In\` |
| \`Click Button\` | Click button by locator | \`Click Button  id=submit\` |
| \`Input Text\` | Type into input | \`Input Text  id=q  hello\` |
| \`Input Password\` | Type into password field (masked log) | \`Input Password  id=pw  secret\` |
| \`Wait Until Element Is Visible\` | Wait for element | \`Wait Until Element Is Visible  css=.ok\` |
| \`Wait Until Page Contains\` | Wait for text | \`Wait Until Page Contains  Welcome\` |
| \`Wait Until Page Contains Element\` | Wait for any element | \`Wait Until Page Contains Element  link=Home\` |
| \`Page Should Contain\` | Assert text present | \`Page Should Contain  Welcome\` |
| \`Element Should Be Visible\` | Assert element visible | \`Element Should Be Visible  id=ok\` |
| \`Get Element Count\` | Count matching elements | \`\${n}=  Get Element Count  css=li\` |
| \`Get Text\` | Read element text | \`\${t}=  Get Text  id=msg\` |
| \`Get Value\` | Read input value | \`\${v}=  Get Value  id=q\` |

## Page Object Pattern in .resource Files

\`resources/login_page.resource\`:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary
Documentation    Login page object

*** Variables ***
\${LOGIN_URL}           https://example.com/login
\${EMAIL_FIELD}         id=email
\${PASSWORD_FIELD}      id=password
\${SIGN_IN_BUTTON}      css=button.primary[type='submit']
\${FORGOT_LINK}         link=Forgot password
\${ERROR_BANNER}        css=.error-banner

*** Keywords ***
Open Login Page
    Go To    \${LOGIN_URL}
    Wait Until Element Is Visible    \${EMAIL_FIELD}    timeout=10s

Login With Credentials
    [Arguments]    \${email}    \${password}
    Input Text    \${EMAIL_FIELD}    \${email}
    Input Password    \${PASSWORD_FIELD}    \${password}
    Click Button    \${SIGN_IN_BUTTON}

Click Forgot Password Link
    Click Element    \${FORGOT_LINK}

Login Error Should Be Shown
    [Arguments]    \${expected_message}
    Wait Until Element Is Visible    \${ERROR_BANNER}    timeout=5s
    Element Text Should Be    \${ERROR_BANNER}    \${expected_message}
\`\`\`

\`tests/login.robot\`:

\`\`\`robot
*** Settings ***
Resource    ../resources/login_page.resource
Suite Setup       Open Browser    about:blank    chrome
Suite Teardown    Close Browser

*** Test Cases ***
Successful Login
    Open Login Page
    Login With Credentials    ada@example.com    correct_pw
    Wait Until Page Contains    Dashboard

Login With Wrong Password Shows Error
    Open Login Page
    Login With Credentials    ada@example.com    wrong
    Login Error Should Be Shown    Invalid email or password
\`\`\`

The test files contain no locators -- they describe business behavior. The resource file owns the structural details.

## Variable Files for Configuration

Locators that vary by environment (URLs, host names, locale-specific text) belong in a variable file:

\`\`\`python
# variables/staging.py
LOGIN_URL = 'https://staging.example.com/login'
SIGN_IN_TEXT = 'Sign In'
\`\`\`

\`\`\`robot
*** Settings ***
Variables    variables/staging.py
Library    SeleniumLibrary

*** Test Cases ***
Sign In
    Go To    \${LOGIN_URL}
    Click Element    link=\${SIGN_IN_TEXT}
\`\`\`

Switch with the command line: \`robot --variablefile variables/production.py tests/\`.

## Headless and CI Configuration

For CI you typically want headless Chrome:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Keywords ***
Open Test Browser
    \${options}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    sys, selenium.webdriver
    Call Method    \${options}    add_argument    --headless=new
    Call Method    \${options}    add_argument    --disable-gpu
    Call Method    \${options}    add_argument    --no-sandbox
    Create Webdriver    Chrome    options=\${options}
\`\`\`

A simpler form using \`Open Browser\` with options dictionary works in SeleniumLibrary 6.x+:

\`\`\`robot
Open Browser    \${URL}    chrome    options=add_argument("--headless=new");add_argument("--no-sandbox")
\`\`\`

## GitHub Actions Workflow

\`\`\`yaml
name: Robot Framework Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install robotframework robotframework-seleniumlibrary
      - uses: browser-actions/setup-chrome@v1
      - run: robot --outputdir results tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: robot-results
          path: results/
\`\`\`

## Comparison: SeleniumLibrary vs Browser Library

| Feature | SeleniumLibrary | Browser (Playwright) |
|---|---|---|
| Backend | Selenium WebDriver | Playwright |
| Wait strategy | Explicit waits required | Auto-waiting |
| Speed | Baseline | 2-4x faster |
| Locators | id, css, xpath, link, etc. | css, xpath, text, role |
| Parallel run | External (pabot) | Built-in browser contexts |
| Browser support | All major | Chromium, Firefox, WebKit |
| Maintenance | Mature, slow change | Fast iteration, occasional breaks |
| Learning curve | Lower for Selenium veterans | Lower for Playwright veterans |

Pick SeleniumLibrary for incumbent suites and broad browser support. Pick Browser for greenfield speed-critical projects.

## Debugging Locator Failures

When a locator fails to match, three quick diagnostics:

1. \`Log Source\` -- writes the full DOM to the log. Lets you confirm the element is actually present.
2. \`Get WebElements\` -- returns a list of matched elements. Length zero means the locator missed; length > 1 means it ambiguous.
3. \`Capture Page Screenshot\` -- save what the test sees at the moment of failure.

\`\`\`robot
*** Test Cases ***
Debug Locator
    Click Element    link=Sign In
    Run Keyword If    '\${TEST STATUS}' == 'FAIL'    Capture Page Screenshot
    [Teardown]    Log Source
\`\`\`

## Common Antipatterns

| Antipattern | Fix |
|---|---|
| \`Sleep  5s\` everywhere | Replace with \`Wait Until Element Is Visible\` |
| Long xpath with positional indices | Use ids or data-cy attributes |
| Locators inline in test cases | Extract to resource file |
| \`link=\` on i18n sites | Use \`id=\` or data-cy attributes |
| One mega resource file | Split per page object |
| No \`Open Browser\` in Suite Setup | Browser reopens per test (slow) |

## Frequently Asked Questions

### What is the difference between Click Element and Click Link?

\`Click Link\` is a shorthand that prepends \`link=\` to the locator. So \`Click Link  Sign In\` is identical to \`Click Element  link=Sign In\`. Use \`Click Link\` when you are clicking by anchor text and want the most readable form. Use \`Click Element\` when the locator is anything else.

### Is link= case-sensitive?

Yes. \`link=Sign In\` does not match \`link=sign in\`. SeleniumLibrary does not provide a case-insensitive option; if you need that, fall back to \`xpath=//a[translate(text(),'ABC...','abc...')='sign in']\` or rely on \`partial link=\` which is also case-sensitive but more tolerant of leading/trailing text.

### Can I use link= for buttons that look like links?

No. \`link=\` only matches \`<a>\` elements. For a button styled as a link, use \`xpath=//button[normalize-space()='Sign In']\` or \`css=button.link-style\`.

### How do I handle dynamic IDs that include hashes?

Use \`css=[data-testid='login-form']\` or any other stable attribute. If your team has not yet added \`data-testid\` attributes, lobby for it -- they make tests robust against id churn.

### What is the difference between resource files and library files?

Resource files are pure Robot Framework -- variables, keywords, and settings written in the .robot syntax. Library files are Python modules that expose keywords via the Robot Framework API. Use resource files for keyword composition; use library files when you need real Python logic.

### How do I share browser session across multiple test files?

Move \`Open Browser\` to \`Suite Setup\` and put it in a parent suite (a directory with \`__init__.robot\`). All tests in the directory share the same browser. Use \`Delete All Cookies\` between tests for isolation.

### How do keyword-driven tests differ from BDD-style tests?

Keyword-driven is "named action sequences" -- there is no Given/When/Then structure required. BDD adds the Given/When/Then framing for stakeholder readability. Robot Framework can do either; keyword-driven is the default and simpler starting point.

## Conclusion

The \`link=\` locator is the most readable way to target anchors in SeleniumLibrary, and combining it with keyword-driven test structure produces test code that doubles as living documentation. Centralize your locators in resource files, parameterize anything that varies by environment, and lean on Wait Until keywords to keep tests robust.

For more Robot Framework references, see our [Wait Until Keyword Succeeds guide](/blog/robot-framework-wait-until-keyword-succeeds-builtin-2026), browse the [Robot Framework skills](/skills) directory for AI agent skills that scaffold page objects and keyword libraries, and use the [Robot vs Playwright comparison](/compare) to choose the right framework for your next project.
`,
};
