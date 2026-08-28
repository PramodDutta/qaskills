import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Selenium2Library Keywords Cheatsheet: SeleniumLibrary API Map for Robot Framework',
  description:
    'Selenium2Library keywords are the Robot Framework browser API now shipped as SeleniumLibrary. Use this cheatsheet for waits, clicks, frames, and migration.',
  date: '2026-08-28',
  category: 'Reference',
  content: `
# Selenium2Library Keywords Cheatsheet: SeleniumLibrary API Map for Robot Framework

**Selenium2Library keywords** are the Robot Framework keyword API for driving browsers through Selenium. The historical package name was Selenium2Library; the maintained library is SeleniumLibrary (\`robotframework-seleniumlibrary\`). You import \`Library    SeleniumLibrary\`, then call keywords such as \`Open Browser\`, \`Click Element\`, \`Input Text\`, and \`Wait Until Element Is Visible\` from \`.robot\` suites. If you are searching old bookmarks for selenium2library keywords, use this cheatsheet: same intent, current library name, and the workflows QA engineers actually run.

Official keyword docs: https://robotframework.org/SeleniumLibrary/SeleniumLibrary.html
Source and issues: https://github.com/robotframework/SeleniumLibrary

## Install, Import, and the Selenium2Library Rename

Install the current package with pip, then import the library by its modern name.

\`\`\`bash
python -m pip install robotframework robotframework-seleniumlibrary
python -m robot --version
\`\`\`

In suite settings:

\`\`\`robotframework
*** Settings ***
Documentation    Smoke login against a local demo app
Library          SeleniumLibrary    timeout=10    implicit_wait=0
Suite Teardown   Close All Browsers

*** Variables ***
\${LOGIN URL}     http://localhost:7272
\${BROWSER}       chrome
\`\`\`

What changed historically: many older tutorials, Stack Overflow answers, and internal wikis still say \`Library    Selenium2Library\`. That was the Selenium 2 era name. The project renamed to SeleniumLibrary. For a long stretch there was a compatibility shim so suites that imported Selenium2Library still resolved. Treat Selenium2Library as a search alias and migration label, not as the package you should pin in new work. New suites should import SeleniumLibrary. When you inherit a repo, grep for both import strings and normalize.

Browser argument strings you will see in practice include \`firefox\`, \`chrome\`, \`headlesschrome\`, \`edge\`, and \`safari\`, plus remote grid options documented in the library. Prefer explicit browser names in CI variables rather than hardcoding per machine.

A small install sanity check I keep in onboarding docs:

\`\`\`bash
python -m pip show robotframework-seleniumlibrary
python -c "import SeleniumLibrary; print(SeleniumLibrary.__version__)"
\`\`\`

If that import fails, your test runner is using a different Python than the one you installed into. That mismatch is more common than a broken library.

## Locator Prefixes You Need Before Any Keyword Table

Every interaction keyword takes a locator. SeleniumLibrary accepts several strategies. The common prefixes are \`id=\`, \`name=\`, \`xpath=\`, \`css=\`, \`class=\`, \`link=\`, \`partial link=\`, and \`tag=\`. A \`jquery=\` strategy may be available depending on configuration. When you omit a prefix, the library applies its default strategies (often id then name). Ambiguous bare strings are a frequent source of flaky clicks.

Deep locator design (relative XPath, CSS specificity, data-testid conventions) belongs in a dedicated guide. For keyword usage here, assume you pass stable locators and keep strategies explicit in shared keywords. For patterns and anti-patterns, see the [Robot Framework SeleniumLibrary locators guide](/blog/robot-framework-seleniumlibrary-locators-guide).

| Prefix | Example | When it fits |
| --- | --- | --- |
| \`id=\` | \`id=submit\` | Stable test ids on controls |
| \`name=\` | \`name=username\` | Classic form fields |
| \`css=\` | \`css=#login form input[type=password]\` | Structure without brittle absolute XPath |
| \`xpath=\` | \`xpath=//button[normalize-space()='Save']\` | Textual buttons, table cells, axes |
| \`link=\` / \`partial link=\` | \`link=Forgot password\` | Anchor text navigation |
| \`class=\` | \`class=primary-btn\` | Only when the class is unique and intentional |

What people get wrong: they copy absolute XPath from DevTools into every keyword argument, then wonder why a one-pixel layout change fails CI. Prefer \`id\`, accessible name patterns, or short CSS rooted at a stable container. Keep XPath for structural relationships you cannot express otherwise.

## Browser Lifecycle Keywords

Lifecycle keywords open, identify, switch, and close WebDriver sessions. Get this layer right and every other keyword becomes boring in a good way.

| Keyword | Role | Notes |
| --- | --- | --- |
| \`Open Browser\` | Create driver + open URL | Pass browser, optional alias, desired capabilities / options |
| \`Create Webdriver\` | Create driver without navigation | Useful when you configure options first |
| \`Switch Browser\` | Change active browser by index/alias | Multi-session flows (admin + user) |
| \`Close Browser\` | Close current browser | Pair with test teardown |
| \`Close All Browsers\` | Close every open session | Prefer as suite teardown insurance |
| \`Set Window Size\` | Resize viewport | Deterministic screenshots and responsive checks |
| \`Maximize Browser Window\` | Maximize OS window | Less reproducible than fixed size in CI |

Runnable pattern for a shared resource file:

\`\`\`robotframework
*** Settings ***
Library    SeleniumLibrary

*** Keywords ***
Open App Chrome
    [Arguments]    \${url}
    Open Browser    \${url}    chrome    alias=app
    Set Window Size    1440    900
    Set Selenium Timeout    15 seconds

Open App Headless
    [Arguments]    \${url}
    Open Browser    \${url}    headlesschrome    alias=app
    Set Window Size    1440    900

Teardown Browsers
    Close All Browsers
\`\`\`

Opinion: in CI, default to headless chrome with an explicit window size. Maximize looks fine on a laptop and produces different screenshots on a tiny container viewport. Fixed size is kinder to visual diffs and to layout assertions.

\`Register Keyword To Run On Failure\` is part of lifecycle hygiene even though it is not an open/close call. Point it at \`Capture Page Screenshot\` (or a custom keyword that dumps HTML and cookies) so the first failure leaves evidence without wrapping every test in try logic.

## Navigation and URL or Title Assertions

After the browser exists, navigation keywords move the page and assertion keywords lock the contract.

Core navigation: \`Go To\`, \`Go Back\`, \`Reload Page\`, \`Get Location\`, \`Get Title\`, \`Get Source\`.

Core asserts: \`Location Should Be\`, \`Location Should Contain\`, \`Title Should Be\`, plus page content checks covered later.

\`\`\`robotframework
*** Test Cases ***
Deep Link Lands On Account Settings
    Open App Chrome    \${BASE URL}/login
    Login As    demo    mode
    Go To    \${BASE URL}/account/settings
    Location Should Contain    /account/settings
    Title Should Be    Account Settings
    Page Should Contain Element    id=save-profile
    [Teardown]    Close Browser
\`\`\`

\`Get Source\` is useful in failure keywords when a screenshot alone cannot show a missing meta tag or a JSON error embedded in HTML. Do not assert on full page source in happy paths; that couples you to noise. Assert on titles, locations, and specific elements.

\`Reload Page\` is the right tool when the app under test depends on a server push or a cache header you just invalidated in a setup keyword. It is the wrong tool as a substitute for waiting. If you reload because an element was not ready, fix the wait.

## Click, Type, and Keys Workflows

Interaction keywords are the ones teams memorize first and misuse longest.

| Keyword | Typical use |
| --- | --- |
| \`Click Element\` | Buttons, custom controls, most clickable nodes |
| \`Click Button\` | \`<button>\` / input button styles as documented |
| \`Click Link\` | Anchors, often with link locator strategy |
| \`Click Image\` | Image inputs / image links |
| \`Double Click Element\` | Desktop-style UIs, editable grids |
| \`Click Element At Coordinates\` | Canvas or hit-area quirks (use sparingly) |
| \`Input Text\` | Clear-and-type into text fields |
| \`Input Password\` | Same as text but value is hidden in logs |
| \`Press Keys\` | Special keys, chords, input that needs key events |
| \`Clear Element Text\` | Explicit clear without typing |
| \`Mouse Over\` | Hover menus before click |
| \`Drag And Drop\` | Sortable lists, kanban cards |

Practical composition:

\`\`\`robotframework
*** Keywords ***
Login As
    [Arguments]    \${user}    \${password}
    Wait Until Element Is Visible    id=username
    Input Text    id=username    \${user}
    Input Password    id=password    \${password}
    Click Button    id=login
    Wait Until Page Contains    Welcome
\`\`\`

Use \`Input Password\` for secrets so Robot logs do not print the value. Use \`Press Keys\` when the app listens for \`Tab\`, \`Enter\`, or modifier combinations that \`Input Text\` does not synthesize the way the front end expects. Prefer \`Click Element\` with a clear locator over coordinate clicks unless you are testing a canvas.

Failure story: a checkout suite started failing only on Fridays after a marketing banner experiment. Symptom: \`Click Element    css=.pay-now\` timed out after the default timeout, even though screenshots showed the button. Wrong theory: Selenium speed was too fast, so someone added \`Set Selenium Speed    0.5 seconds\` and a \`Sleep    2s\` before the click. Pass rate improved locally and still failed in CI. Actual cause: the banner iframe intercepted hit testing on a subset of viewports; the button was visible in the DOM and screenshot crop but not receiving the click. Fix: wait for the banner close control, click it, then \`Wait Until Element Is Enabled    css=.pay-now\` before \`Click Element\`. Removing the global speed hack cut suite time by several minutes (illustrative on a ~40 case file) and restored deterministic failures when the banner selector changed.

## Selects, Checkboxes, Radios, and File Upload

Form controls have dedicated keywords. Using \`Click Element\` on a native \`<select>\` is a common self-inflicted wound.

| Control | Keywords |
| --- | --- |
| Select list | \`Select From List By Label\`, \`Select From List By Value\`, \`Select From List By Index\`, plus matching \`Unselect From List By *\` |
| Checkbox | \`Select Checkbox\`, \`Unselect Checkbox\`, \`Checkbox Should Be Selected\` |
| Radio | \`Select Radio Button\` |
| File | \`Choose File\` |
| Readbacks | \`Get Text\`, \`Get Value\`, \`Get Element Attribute\`, \`Get Element Count\` |

\`\`\`robotframework
*** Keywords ***
Fill Shipping Form
    [Arguments]    \${country}    \${tos}=\${True}
    Select From List By Label    id=country    \${country}
    Select Radio Button    shipping_speed    express
    Run Keyword If    \${tos}    Select Checkbox    id=tos
    Choose File    id=invoice-upload    \${EXECDIR}/fixtures/invoice.pdf
    Element Text Should Be    id=country-echo    \${country}
\`\`\`

\`Choose File\` expects a real filesystem path visible to the machine running the browser. In Grid setups that means the file must exist on the node that owns the browser, or you must use an upload mechanism your Grid supports. Local absolute paths from a laptop will not magically appear on a remote node.

For assertions after selection, prefer \`Get Value\` / list selection keywords over parsing visible text when the visible label and value diverge (common with localized labels and stable option values).

## Waits Versus Sleeps (Prefer Wait Until*)

Sleeps hide race conditions. Explicit waits document the condition you actually need.

| Keyword | Condition |
| --- | --- |
| \`Wait Until Page Contains\` | Text appears somewhere in page |
| \`Wait Until Page Contains Element\` | Locator resolves |
| \`Wait Until Element Is Visible\` | Element is present and visible |
| \`Wait Until Element Is Enabled\` | Element can be interacted with |
| \`Wait Until Element Does Not Contain\` | Text disappears from element |
| Related polls | Pair with \`Element Should Be Visible\` / \`Enabled\` / \`Disabled\` for immediate checks |

Global knobs: \`Set Selenium Timeout\` (default timeout for wait keywords), \`Set Selenium Implicit Wait\` (WebDriver find retries), \`Set Selenium Speed\` (delay after each action). Prefer a moderate library timeout and specific \`timeout=\` arguments on the wait that needs more time. Implicit waits stacked with explicit waits produce confusing timing math; many teams set implicit wait to \`0\` and rely on \`Wait Until*\`.

\`\`\`robotframework
*** Keywords ***
Wait For Dashboard
    Wait Until Page Contains Element    id=dashboard-root    timeout=20s
    Wait Until Element Is Visible    id=dashboard-root
    Wait Until Element Is Enabled    css=[data-action=create]
\`\`\`

Banned pattern: \`Sleep    5s\` before every click "to be safe." It is not safe. It is slow and still races when the backend takes six seconds. Encode the condition.

\`Page Should Contain\` and \`Page Should Contain Element\` are immediate assertions, not polls. If the UI is still loading, wait first, then assert.

## Frames, Windows, and Alerts

Context switching is where otherwise clean suites go mysterious.

Frames: \`Select Frame\`, \`Unselect Frame\`. After selecting a frame, locators resolve inside that frame until you unselect or select another.

Windows: \`Switch Window\`, \`Get Window Handles\`, \`Get Window Titles\`. New tabs from payment providers or OAuth screens need an explicit switch; SeleniumLibrary will not telepathically follow the tab your eyes noticed.

Alerts: \`Handle Alert\`, \`Alert Should Be Present\`, \`Alert Should Not Be Present\`.

\`\`\`robotframework
*** Keywords ***
Accept Nested Payment Frame
    Wait Until Page Contains Element    id=pay-frame
    Select Frame    id=pay-frame
    Wait Until Element Is Visible    id=card-number
    Input Text    id=card-number    4111111111111111
    Click Button    id=pay
    Unselect Frame
    Alert Should Be Present    action=ACCEPT
    Switch Window    NEW
    Location Should Contain    /orders/
    Switch Window    MAIN
\`\`\`

Always restore context in teardown-friendly keywords. Leaving a suite inside a frame makes the next test's \`Click Element    id=logout\` fail with a locator error that looks unrelated.

Table helper worth knowing: \`Get Table Cell\` for classic HTML tables when you need row/column coordinates rather than a fragile XPath soup.

## Cookies, JavaScript, Screenshots, and Failure Hooks

Supporting keywords turn a brittle demo into a maintainable suite.

Cookies: \`Get Cookie\`, \`Add Cookie\`, \`Delete Cookie\`, \`Delete All Cookies\`. Useful for seeding session state in lower environments when full UI login is expensive, with the usual security caveats (do not paste production session cookies into shared CI logs).

JavaScript: \`Execute Javascript\`. Use it to read \`window\` state you cannot reach through the DOM, or to scroll an element into view when a sticky header interferes. Do not use it to bypass the UI you claim to be testing unless the suite's job is explicitly API-plus-UI hybrid setup.

Screenshots: \`Capture Page Screenshot\`, \`Capture Element Screenshot\`. Failure hook: \`Register Keyword To Run On Failure\`.

\`\`\`robotframework
*** Settings ***
Library           SeleniumLibrary
Suite Setup       Register Keyword To Run On Failure    Capture Page Screenshot
Suite Teardown    Close All Browsers
\`\`\`

Element state assertions you will combine with waits: \`Element Should Be Visible\`, \`Element Should Be Enabled\`, \`Element Should Be Disabled\`, \`Element Should Contain\`, \`Element Text Should Be\`.

## Keyword Composition With User Keywords

SeleniumLibrary keywords are building blocks. Suites that call them raw in every test case become unreadable and over-coupled to DOM details. Wrap flows in user keywords, and keep Robot Framework's [BuiltIn keywords reference](/blog/robot-framework-builtin-keywords-reference) nearby for control flow (\`Run Keyword If\`, \`Wait Until Keyword Succeeds\`, \`Should Be Equal\`) that SeleniumLibrary does not duplicate.

\`\`\`robotframework
*** Keywords ***
Checkout With Saved Card
    [Arguments]    \${sku}    \${expect total}
    Search And Open Sku    \${sku}
    Click Element    css=[data-action=add-to-cart]
    Wait Until Page Contains    Cart
    Click Element    css=[data-action=checkout]
    Wait Until Element Is Visible    id=saved-card
    Click Button    id=pay-saved-card
    Wait Until Page Contains    Order confirmed
    Element Should Contain    id=order-total    \${expect total}
\`\`\`

Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want agents to scaffold these user-keyword wrappers from a page object sketch. Keep the generated keywords under review; agents love inventing locators that do not exist.

Composition rules that hold up:

1. One user keyword per user-meaningful action (login, add to cart), not per Selenium call.
2. Assertions that define "done" live at the end of the user keyword, not scattered in callers.
3. Timeouts that are special to a flow are arguments on that keyword, not a global speed change.
4. Teardown still closes browsers even when user keywords embed waits.

## Common Argument Patterns: timeout, error, loglevel, limit

Many SeleniumLibrary keywords share optional arguments. Learn the patterns once.

| Argument | Seen on | Purpose |
| --- | --- | --- |
| \`timeout\` | Wait keywords, some alert APIs | Override default Selenium timeout for this call |
| \`error\` | Wait and some assert-style waits | Custom message when the condition never happens |
| \`loglevel\` | Several diagnostic / run keywords in RF ecosystem | Control how much is logged for that call |
| \`limit\` | Some find / page contain element variants (library version dependent) | Cap matches when multiples exist |

Example with custom error text that CI can grep:

\`\`\`robotframework
Wait Until Element Is Visible    id=dashboard-root    timeout=20s
...    error=Dashboard root never became visible after login; check auth redirect and feature flags.
\`\`\`

\`limit\` appeared in later SeleniumLibrary lines for keywords that count or wait on elements when duplicates are possible. Pin your library version and read the keyword doc entry for the version you run. Do not assume every blog snippet matches your pin.

Also remember Robot Framework's own argument styles: scalar \`\${x}\`, list \`@{y}\`, dict \`&{z}\`, and embedded arguments in keyword names. SeleniumLibrary consumes ordinary scalar arguments for locators and timeouts; your user keywords decide the rest.


## Reading Element State Without Guessing

After you click and type, you still need to read the page. Read keywords are how you prove side effects without screenshot-only reviews.

| Keyword | Returns / asserts | Good for |
| --- | --- | --- |
| \`Get Text\` | Visible text content | Labels, flash messages, table cell text via locator |
| \`Get Value\` | Value property | Inputs, selects after user keywords fill them |
| \`Get Element Attribute\` | Named attribute | \`href\`, \`aria-disabled\`, \`data-*\` hooks |
| \`Get Element Count\` | Integer count | Empty states vs N cards rendered |
| \`Get Title\` / \`Get Location\` | Document title / URL | Post-redirect contracts |
| \`Get Table Cell\` | Cell text by row/column | Dense HTML tables |

\`\`\`robotframework
*** Keywords ***
Cart Should Show Line Count
    [Arguments]    \${expected}
    \${count}=    Get Element Count    css=[data-test=cart-line]
    Should Be Equal As Integers    \${count}    \${expected}
    \${subtotal}=    Get Text    id=cart-subtotal
    Should Not Be Empty    \${subtotal}
\`\`\`

Combine read keywords with BuiltIn assertions. SeleniumLibrary gets the value; BuiltIn decides pass or fail with clear messages. When AI coding agents generate suites, they often assert by clicking again. Prefer reading state once.

\`Element Should Contain\` and \`Element Text Should Be\` cover the common text cases without a temporary variable. Use \`Get *\` when you need to reuse the value (compute tax, pass into the next API call, or log a correlation id).

## Multi-Browser and Alias Workflows

Alias support on \`Open Browser\` matters when one test must be two actors. An admin approves what a buyer submits. Without aliases you fight window handles across processes that should stay separate.

\`\`\`robotframework
*** Keywords ***
Buyer Opens Shop
    Open Browser    \${SHOP URL}    \${BROWSER}    alias=buyer
    Set Window Size    1280    800

Admin Opens Console
    Open Browser    \${ADMIN URL}    \${BROWSER}    alias=admin
    Set Window Size    1280    800

Buyer Step
    [Arguments]    @{kw}
    Switch Browser    buyer
    Run Keyword    @{kw}

Admin Step
    [Arguments]    @{kw}
    Switch Browser    admin
    Run Keyword    @{kw}
\`\`\`

Then the case reads as a script:

\`\`\`robotframework
*** Test Cases ***
Admin Approves Buyer Order
    Buyer Opens Shop
    Admin Opens Console
    Buyer Step    Login As    buyer1    \${BUYER PASS}
    Buyer Step    Place Order For Sku    SKU-9
    Admin Step    Login As    admin    \${ADMIN PASS}
    Admin Step    Approve Latest Order
    Buyer Step    Wait Until Page Contains    Approved
    Close All Browsers
\`\`\`

This pattern beats screenshots of "I manually switched Chrome profiles." It also forces you to name roles, which improves reviews.

## Timeout Strategy That Survives CI

Pick three numbers and write them down in the repo README (illustrative defaults, tune per product):

1. Library default timeout via \`Library    SeleniumLibrary    timeout=10s\` for ordinary waits.
2. Long-path timeout argument (\`20s\` or \`30s\`) on login, SSO redirect, and payment return waits only.
3. Implicit wait at \`0\` unless you have a documented reason.

Then forbid suite-wide \`Set Selenium Speed\` except when debugging a single local failure. Speed delays every keyword, including ones that already waited. Reviewers should reject speed as a "stability fix."

Custom \`error=\` strings should include the business step, not only the locator. "Pay button never enabled after address validation" is operable. "Element not visible" is not.

When a wait fails intermittently, capture page source in the failure keyword in addition to a screenshot. Many SPAs render an empty shell that looks fine as a PNG while the error toast lives in a portal you cropped out.

## Locators Plus Keywords: Ownership Boundaries

Keywords answer *what* to do. Locators answer *where*. Mixing ownership creates pull requests where a text change to a button label forces edits in twenty test cases. Put locators in resource variables or page-specific keyword files. Keep this reference focused on keyword behavior, and keep selector craft in the locators guide linked earlier.

A minimal discipline that works in mid-size repos:

- \`\${LOGIN USER FIELD}\` style variables for shared fields.
- User keywords named after user intent (\`Submit Order\`) that hide the locator and the wait.
- No raw \`xpath=\` in \`*** Test Cases ***\` sections except in spikes you delete before merge.

If an agent proposes a suite that inlines long CSS chains in every case, ask it to extract user keywords before you accept the patch.

## Selenium2Library Migration Notes

When converting a legacy suite:

1. Change \`Library    Selenium2Library\` to \`Library    SeleniumLibrary\`.
2. Re-run the suite; most keyword names carry over.
3. Diff keyword docs for your old pin versus current: wait keyword names, \`Press Keys\` versus older key APIs, and browser option passing evolved across major versions.
4. Replace \`Sleep\` cascades added during migration panic with \`Wait Until*\` conditions.
5. Update CI install to \`robotframework-seleniumlibrary\` and fail the build if an import of Selenium2Library reappears.

Search traffic still says "selenium2library keywords" because that string dominated tutorials for years. The actionable answer is: install SeleniumLibrary, keep the keyword vocabulary, modernize waits and browser options, and treat the old name as a redirect in your team's heads.

## Runnable Suite Skeleton

Put the pieces together in a single file you can actually execute against a demo server (illustrative URLs).

\`\`\`robotframework
*** Settings ***
Documentation     Illustrative SeleniumLibrary suite using current imports
Library           SeleniumLibrary    timeout=10    implicit_wait=0
Suite Setup       Register Keyword To Run On Failure    Capture Page Screenshot
Suite Teardown    Close All Browsers

*** Variables ***
\${BASE URL}       http://localhost:7272
\${BROWSER}        headlesschrome

*** Test Cases ***
Valid Login Shows Welcome
    Open Browser    \${BASE URL}    \${BROWSER}
    Set Window Size    1280    800
    Title Should Be    Login Page
    Input Text    username_field    demo
    Input Password    password_field    mode
    Click Button    login_button
    Wait Until Page Contains    Welcome
    Title Should Be    Welcome Page
    Location Should Contain    welcome
    [Teardown]    Close Browser

Logout From Menu
    Open Browser    \${BASE URL}    \${BROWSER}
    Input Text    username_field    demo
    Input Password    password_field    mode
    Click Button    login_button
    Wait Until Element Is Visible    id=menu
    Click Element    id=menu
    Click Link    Logout
    Wait Until Page Contains    Login
    Title Should Be    Login Page
    [Teardown]    Close Browser
\`\`\`

Run it:

\`\`\`bash
python -m robot -d results suites/login.robot
\`\`\`

Extend with tags (\`[Tags]    smoke\`) and split user keywords into a resource file once the skeleton is green. Keep the official docs open while you specialize: https://robotframework.org/SeleniumLibrary/SeleniumLibrary.html

## Frequently Asked Questions

### Are Selenium2Library keywords different from SeleniumLibrary keywords?

Mostly no at the conceptual level. Selenium2Library was the earlier package name for the same Robot Framework Selenium keyword API. SeleniumLibrary is the current library (\`robotframework-seleniumlibrary\`). Keyword names such as \`Open Browser\`, \`Click Element\`, and \`Wait Until Element Is Visible\` are what you use today. Expect differences at the edges: browser option arguments, some key-press APIs, and wait helpers evolved across major versions. Migrate the import first, then fix call sites that the docs mark as changed for your version pin.

### Should I use Sleep or Wait Until keywords for flaky pages?

Use \`Wait Until Page Contains\`, \`Wait Until Page Contains Element\`, \`Wait Until Element Is Visible\`, or \`Wait Until Element Is Enabled\` with an explicit timeout. \`Sleep\` only pauses; it does not verify readiness, so it fails when the server is slower than your guess and wastes time when the server is faster. Reserve fixed sleeps for rare protocol quirks you cannot observe in the DOM, and document why. Pair waits with \`Set Selenium Timeout\` defaults instead of sprinkling arbitrary pauses.

### How do I install and import the library in a new project?

Create a virtualenv, then run \`pip install robotframework robotframework-seleniumlibrary\`. In suite settings use \`Library    SeleniumLibrary\`. Confirm with \`python -c "import SeleniumLibrary"\` using the same interpreter that runs \`robot\`. Point CI at that interpreter. Old snippets that say Selenium2Library should be updated. Browser drivers must match your chosen browser (\`chrome\`, \`headlesschrome\`, \`firefox\`, and others as documented). Prefer project-pinned versions over whatever the agent installed globally last week.

### Why does Click Element fail when the screenshot shows the button?

Visibility in a screenshot does not guarantee interactability. Another element may cover the control (banners, sticky footers, iframes), the control may be disabled pending validation, or you may still be in the wrong frame or window. Prefer \`Wait Until Element Is Enabled\` before the click, assert you are not inside a stale frame (\`Unselect Frame\` / \`Select Frame\`), and check for overlays. Coordinate clicks hide these issues. Fix the context and enabled state rather than slowing the whole suite with \`Set Selenium Speed\`.

`,
};
