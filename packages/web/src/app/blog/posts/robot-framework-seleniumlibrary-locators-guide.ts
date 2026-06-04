import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework SeleniumLibrary Locators Guide (2026)',
  description:
    'Master SeleniumLibrary locators in Robot Framework: id, css, xpath, link strategies, Get WebElement, custom locators, and locator best practices.',
  date: '2026-06-04',
  category: 'Reference',
  content: `
# Robot Framework SeleniumLibrary Locators Guide

Locators are where browser automation lives or dies. A SeleniumLibrary test is only as stable as the strategy it uses to find elements, and the single biggest cause of flaky Robot Framework UI suites is brittle locators - fragile XPath expressions copied from devtools, indexes that shift when the page changes, and class names that the build pipeline mangles. SeleniumLibrary gives you a clean, prefixed locator syntax covering id, name, css, xpath, link text, and more, plus the wait keywords and \`Get WebElement\` access that make those locators robust. Learning the syntax and the selection priority is the highest-leverage skill in the whole library.

This guide is a complete reference to SeleniumLibrary locators in \`.robot\` syntax. We cover every prefix strategy with runnable examples, the default behaviour when you omit a prefix, how to combine locators with the wait keywords like \`Wait Until Element Is Visible\`, when to drop down to \`Get WebElement\` and \`Get WebElements\`, how to register your own custom locator strategy, and a concrete best-practices ranking so you always pick the most stable option available. We also cover the practical headaches that trip up real suites: locating elements inside iframes, reaching into shadow DOM, and debugging a locator that stubbornly refuses to match. The aim is not just a syntax list but a working mental model: given any element on a page, you should be able to name the single most stable way to target it and the right wait to pair with it. Every snippet runs once SeleniumLibrary is imported, with no extra plumbing required. Throughout, the emphasis stays on stability: a locator that works once in a demo but breaks on the next deploy is worse than useless, because it erodes trust in the whole suite. For a related deep dive, the [SeleniumLibrary complete reference on the blog](/blog) expands the keyword surface, and you can install Robot Framework and Selenium skills for your AI agent from the [QA Skills directory](/skills).

## Key Takeaways

- SeleniumLibrary locators use a \`strategy:value\` prefix syntax (\`id:submit\`, \`css:.btn\`)
- Without a prefix, SeleniumLibrary tries id, then name, then a few others - be explicit instead
- Prefer \`id\` and stable \`data-*\` attributes over class-based or positional XPath
- \`link\` and \`partial link\` target anchor text directly
- \`Get WebElement\` / \`Get WebElements\` return Selenium objects for advanced use
- Always pair locators with \`Wait Until Element Is Visible\` rather than fixed sleeps
- You can register custom locator strategies for app-specific attributes

---

## The Locator Syntax: strategy:value

Every SeleniumLibrary locator is a string of the form \`strategy:value\`. The strategy prefix tells the library how to interpret the value. The colon-separated form is unambiguous and is what you should always use.

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Test Cases ***
Locator Strategies Overview
    Open Browser    https://app.example.com/login    chrome

    Input Text       id:email                user@example.com
    Input Password   name:password           secret123
    Click Element    css:.btn-primary
    Click Element    xpath://button[@type='submit']
    Click Link       link:Forgot password?

    Close Browser
\`\`\`

| Strategy | Prefix | Targets |
|----------|--------|---------|
| ID | \`id:\` | The element's \`id\` attribute |
| Name | \`name:\` | The \`name\` attribute (forms) |
| CSS selector | \`css:\` | Any CSS selector |
| XPath | \`xpath:\` | Any XPath expression |
| Link text | \`link:\` | Exact anchor text |
| Partial link | \`partial link:\` | Substring of anchor text |
| Tag name | \`tag:\` | Element tag (\`tag:input\`) |
| Class | \`class:\` | A single class name |
| DOM | \`dom:\` | JavaScript DOM expression |

---

## id and name: The Most Stable Strategies

\`id\` is the gold standard. An id is meant to be unique on the page, it is fast for the browser to resolve, and it rarely changes for cosmetic reasons. Always prefer it when the element has one.

\`\`\`robot
*** Test Cases ***
Id And Name
    Input Text    id:username    alice
    Input Text    name:email     alice@example.com
    Click Button  id:submit-btn
\`\`\`

\`name\` is the natural choice for form fields, which carry a \`name\` attribute that the backend relies on and therefore tends to be stable. Between them, \`id\` and \`name\` cover the majority of form interactions with the most resilient possible locators.

---

## css: The Workhorse

CSS selectors are concise, fast, and expressive enough for nearly everything short of "select by visible text". They are the recommended default when an element lacks a usable id.

\`\`\`robot
*** Test Cases ***
Css Selectors
    Click Element    css:.btn-primary
    Click Element    css:#nav .menu-item.active
    Input Text       css:input[name='search']    laptops
    Click Element    css:[data-test='checkout']
    Click Element    css:ul.results > li:first-child
\`\`\`

The most durable CSS locators target \`data-*\` attributes added specifically for testing, such as \`css:[data-test='checkout']\`. These attributes exist only for your tests, so designers and developers will not change them for styling reasons. Favour attribute selectors over deep descendant chains, which break when the markup is restructured.

---

## xpath: Power and Peril

XPath can do everything CSS can plus select by text content and traverse to ancestors, which is occasionally indispensable. It is also the easiest way to write a hopelessly brittle locator, so use it deliberately.

\`\`\`robot
*** Test Cases ***
Xpath Expressions
    # select by visible text - CSS cannot do this
    Click Element    xpath://button[text()='Save changes']
    Click Element    xpath://a[contains(text(), 'Download')]

    # navigate relationships
    Click Element    xpath://label[text()='Email']/following-sibling::input

    # attribute match (prefer CSS for this)
    Click Element    xpath://input[@data-test='email']
\`\`\`

Good XPath anchors on text or stable attributes. Bad XPath anchors on absolute paths and positional indexes like \`/html/body/div[3]/div[2]/button[1]\`, which shatter on the smallest layout change. If a locator looks like a filesystem path, rewrite it.

| XPath pattern | Verdict |
|---------------|---------|
| \`//button[text()='Save']\` | Good - text-anchored |
| \`//*[@data-test='x']\` | Good - stable attribute |
| \`//label[.='Email']/following::input[1]\` | Acceptable - relationship-based |
| \`/html/body/div[3]/button[1]\` | Bad - absolute, positional |
| \`//div[@class='btn ng-tns-c12']\` | Bad - generated class |

---

## link and partial link: Anchor Text

\`link\` matches an anchor by its exact visible text, and \`partial link\` matches a substring. These are the most readable way to click navigation links and they survive markup changes as long as the wording stays.

\`\`\`robot
*** Test Cases ***
Link Locators
    Click Link    link:Sign up
    Click Link    partial link:Terms
    Page Should Contain Link    link:Contact us
\`\`\`

Use \`link\` for menu items, footer links, and call-to-action anchors. The trade-off is localisation: if your app translates UI text, link-text locators break per language, so for multilingual apps prefer an id or \`data-test\` attribute on the anchor instead.

---

## Default Strategy When No Prefix Is Given

If you omit the prefix, SeleniumLibrary applies an implicit search order, trying \`id\` first, then \`name\`, and falling back to other matches. Relying on this is a readability and reliability hazard - a value that happens to match an id today might match a name tomorrow.

\`\`\`robot
*** Test Cases ***
Implicit Vs Explicit
    # implicit - ambiguous, avoid
    Click Element    submit

    # explicit - clear and stable, prefer
    Click Element    id:submit
\`\`\`

Always write the prefix. The two extra characters eliminate an entire class of "why did it click the wrong element" bugs and make every locator self-documenting.

---

## Waiting: Pair Locators With Wait Keywords

A locator only works if the element exists when you act on it. SeleniumLibrary's wait keywords poll until the element reaches the desired state, replacing fixed sleeps that are simultaneously too slow and too flaky.

\`\`\`robot
*** Test Cases ***
Explicit Waits
    Wait Until Element Is Visible    id:results        timeout=10s
    Wait Until Element Is Enabled    css:.submit-btn   timeout=5s
    Wait Until Page Contains Element xpath://table/tbody/tr
    Wait Until Element Contains      id:status         Complete    timeout=15s
    Wait Until Element Is Not Visible css:.spinner      timeout=10s
\`\`\`

| Wait keyword | Waits until |
|--------------|-------------|
| \`Wait Until Element Is Visible\` | Element is displayed |
| \`Wait Until Element Is Enabled\` | Element is interactable |
| \`Wait Until Page Contains Element\` | Element exists in DOM |
| \`Wait Until Element Contains\` | Element text contains value |
| \`Wait Until Element Is Not Visible\` | Element hidden/removed |

The reliable pattern is wait, then act: \`Wait Until Element Is Visible\` immediately before \`Click Element\` on the same locator. Never use \`Sleep\` to wait for the UI - it wastes time when fast and fails when slow.

---

## Get WebElement and Get WebElements

When a keyword does not cover your need, \`Get WebElement\` returns the underlying Selenium \`WebElement\` and \`Get WebElements\` returns a list. You can then iterate, count, or pass them to other keywords.

\`\`\`robot
*** Test Cases ***
Working With WebElements
    \${rows}=    Get WebElements    css:table.orders tbody tr
    \${count}=   Get Length         \${rows}
    Should Be True    \${count} > 0

    FOR    \${row}    IN    @{rows}
        \${text}=    Get Text    \${row}
        Log    Row: \${text}
    END

    \${first}=    Get WebElement    css:table.orders tbody tr:first-child
    Click Element    \${first}
\`\`\`

A returned element can be handed straight back to action keywords like \`Click Element\`, which is how you act on a specific item discovered at runtime. Reserve this for cases the declarative keywords cannot express - most tests never need it.

---

## Custom Locator Strategies

For app-specific conventions - say every testable element carries a \`data-qa\` attribute - register a custom strategy once and use a clean prefix everywhere. \`Add Location Strategy\` maps a name to an XPath or CSS template.

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Test Cases ***
Custom Locator Strategy
    Add Location Strategy    qa
    ...    xpath://*[@data-qa='\$locator']

    # now use the custom prefix anywhere
    Click Element    qa:checkout-button
    Input Text       qa:email-field    user@example.com
\`\`\`

The \`\$locator\` placeholder is replaced with whatever follows the prefix, so \`qa:checkout-button\` resolves to \`//*[@data-qa='checkout-button']\`. This is a powerful way to enforce a single, stable locator convention across a large suite - define it once and every test reads cleanly.

---

## A Complete Runnable Example

This suite demonstrates the full locator workflow: explicit prefixes, waits paired with actions, a \`data-test\` attribute selector, link text, and a \`Get WebElements\` count - all in idiomatic \`.robot\`.

\`\`\`robot
*** Settings ***
Library           SeleniumLibrary
Suite Teardown    Close All Browsers

*** Variables ***
\${URL}        https://app.example.com
\${BROWSER}    headlesschrome

*** Test Cases ***
Search And Verify Results
    Open Browser    \${URL}/search    \${BROWSER}
    Set Window Size    1920    1080

    # explicit, stable locators
    Wait Until Element Is Visible    id:search-input    timeout=10s
    Input Text                       id:search-input    laptop
    Click Element                    css:[data-test='search-submit']

    # wait for async results, then assert
    Wait Until Element Is Visible    css:.result-list    timeout=15s
    \${results}=    Get WebElements   css:.result-list .result-item
    \${count}=      Get Length        \${results}
    Should Be True    \${count} > 0

    # navigate via link text
    Click Link    link:Next page
    Wait Until Element Is Visible    css:.result-list    timeout=15s
\`\`\`

Run it with \`robot search.robot\`. The waits absorb the application's async timing so the test stays green across environments.

---

## Locator Best Practices: The Priority Ranking

When choosing a locator, work down this list and stop at the first option the element supports. Higher entries are more stable and faster.

| Priority | Strategy | Why |
|----------|----------|-----|
| 1 | \`id:\` | Unique, fast, rarely changes |
| 2 | \`css:[data-test=...]\` | Test-only attribute, immune to styling |
| 3 | \`name:\` | Stable for form fields |
| 4 | \`link:\` text | Readable for navigation (watch i18n) |
| 5 | \`css:\` attribute/short chain | Concise, reasonably stable |
| 6 | \`xpath:\` text-anchored | When you must match by text |
| 7 | \`xpath:\` positional | Last resort - brittle |

The two rules that prevent most flakiness: always write the strategy prefix explicitly, and always pair a locator with a \`Wait Until\` keyword before acting on it. Add \`data-test\` or \`data-qa\` attributes to your application and the entire suite becomes dramatically more stable, because your locators stop depending on markup that exists for other reasons.

---

## Locating Elements Inside iframes and Shadow DOM

Real applications embed content in iframes - payment widgets, embedded maps, rich-text editors - and SeleniumLibrary cannot see inside one until you switch into it. The \`Select Frame\` keyword changes the active frame; \`Unselect Frame\` returns to the main document. Locators only resolve against the currently selected frame.

\`\`\`robot
*** Test Cases ***
Interact Inside An Iframe
    Select Frame    css:iframe#payment
    Input Text      id:card-number    4242424242424242
    Click Button    id:pay-now
    Unselect Frame

    # back in the main document now
    Wait Until Element Is Visible    css:.payment-success    timeout=15s
\`\`\`

Forgetting to \`Select Frame\` is one of the most common "element not found" mysteries - the locator is perfect, but it is being evaluated against the wrong document. Always switch into the frame, do your work, and switch back out so subsequent locators resolve against the main page.

Shadow DOM is handled with the \`Get WebElement\` plus shadow root traversal, or with CSS shadow-piercing where the browser supports it. SeleniumLibrary's \`css:\` strategy can reach shadow content using the standard host selector, and for deeply nested cases you drop to \`Get WebElement\` and walk the shadow root in a custom keyword.

| Scenario | Keyword | Note |
|----------|---------|------|
| Enter iframe | \`Select Frame\` | Locators then resolve inside it |
| Leave iframe | \`Unselect Frame\` | Return to main document |
| Shadow DOM | \`Get WebElement\` + shadow root | For deeply nested components |

---

## Debugging Locators That Do Not Match

When a locator fails, SeleniumLibrary gives you tools to diagnose it without guessing. \`Get Element Count\` returns how many elements a locator matches - zero means the locator is wrong or the element is not present yet, more than one means it is ambiguous. \`Capture Page Screenshot\` and \`Log Source\` capture the page state at the moment of failure.

\`\`\`robot
*** Test Cases ***
Diagnose A Failing Locator
    \${count}=    Get Element Count    css:.result-item
    Log    Matched \${count} elements
    Run Keyword If    \${count} == 0    Log Source
    Run Keyword If    \${count} == 0    Capture Page Screenshot

    # confirm presence before asserting on a specific one
    Should Be True    \${count} > 0    No results found - check locator or wait
\`\`\`

The most useful habit when a locator misbehaves is to check \`Get Element Count\` first. A count of zero tells you to add a \`Wait Until Page Contains Element\` or fix the selector; a count above one tells you to make the locator more specific. \`Log Source\` dumps the current DOM into \`log.html\` so you can see exactly what markup was present, which frequently reveals that the element is inside an unselected iframe or rendered differently than expected.

Pair these diagnostics with SeleniumLibrary's automatic failure screenshots (enabled by default) and most locator problems become obvious from the log report alone, without needing to re-run the test in a debugger.

---

## Frequently Asked Questions

### What is the default locator strategy in SeleniumLibrary?

When you omit a prefix, SeleniumLibrary searches implicitly, trying \`id\` first, then \`name\`, then other matches. This is convenient but ambiguous, because a value can match different attributes as the page evolves. The recommendation is to always write the strategy prefix explicitly - \`id:submit\` rather than \`submit\` - so every locator is unambiguous and self-documenting.

### Should I use CSS or XPath locators in Robot Framework?

Prefer CSS for almost everything: it is concise, fast, and expressive. Reach for XPath only when you need something CSS cannot do, mainly selecting by visible text (\`xpath://button[text()='Save']\`) or traversing to a parent or sibling. Avoid positional, absolute XPath like \`/html/body/div[3]/button[1]\`, which breaks on minor layout changes.

### How do I locate an element by its link text?

Use the \`link\` strategy for exact anchor text, \`Click Link    link:Sign up\`, or \`partial link\` for a substring, \`Click Link    partial link:Terms\`. These are readable and survive markup changes. The caveat is localisation: if your app translates UI text, link-text locators break per language, so prefer an id or \`data-test\` attribute on multilingual apps.

### What is the difference between Get WebElement and Get WebElements?

\`Get WebElement\` returns a single underlying Selenium \`WebElement\` for the first match, while \`Get WebElements\` returns a list of all matches. Use them when declarative keywords are not enough - to count results, iterate rows in a \`FOR\` loop, or pass a discovered element back to \`Click Element\`. Most tests never need them; reach for them only for advanced cases.

### How do I wait for an element before clicking it?

Pair a wait keyword with the action on the same locator: call \`Wait Until Element Is Visible    id:submit    timeout=10s\` immediately before \`Click Element    id:submit\`. SeleniumLibrary polls until the element reaches the state or the timeout elapses. Never use \`Sleep\` for this - fixed delays are too slow when the app is fast and fail when it is slow.

### How do I create a custom locator strategy in SeleniumLibrary?

Call \`Add Location Strategy\` with a name and an XPath or CSS template containing a \`\$locator\` placeholder, for example \`Add Location Strategy    qa    xpath://*[@data-qa='\$locator']\`. Afterward, \`qa:checkout-button\` resolves to \`//*[@data-qa='checkout-button']\`. This enforces one stable, app-specific locator convention across a large suite with a clean prefix everywhere.

### Why are my XPath locators so flaky?

Almost always because they are positional or anchored on generated values - absolute paths like \`/html/body/div[3]\` or framework-generated classes like \`ng-tns-c12\`. Both change whenever the markup or build output shifts. Rewrite them to anchor on a stable id, a \`data-test\` attribute, or visible text, and your locators stop breaking on cosmetic changes.

### What makes a locator stable in Robot Framework?

Stability comes from targeting attributes that exist for identity rather than presentation. An \`id\`, a dedicated \`data-test\`/\`data-qa\` attribute, or a form \`name\` rarely changes for styling reasons, whereas CSS classes and DOM position change constantly. Add test-only attributes to your application and prefer them, falling back to text-anchored locators only when no stable attribute exists.

---

## Conclusion

Locators are the foundation every SeleniumLibrary test stands on, and getting them right is the single most effective thing you can do for suite stability. Always write the strategy prefix explicitly, work down the priority ranking and stop at the first stable option - id, then \`data-test\` attributes, then name - and reserve XPath for text matching and relationship traversal. Pair every locator with a \`Wait Until\` keyword instead of \`Sleep\`, reach for \`Get WebElements\` only when the declarative keywords fall short, and register a custom strategy to enforce a single convention across a large suite.

Want your AI agent to write SeleniumLibrary tests with stable locators by default? Install Robot Framework and Selenium skills from the [QA Skills directory](/skills), and explore more Robot Framework references on the [blog](/blog).
`,
};
