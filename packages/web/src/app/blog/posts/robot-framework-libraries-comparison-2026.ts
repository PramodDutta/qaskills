import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Libraries Comparison 2026',
  description:
    'Compare Robot Framework libraries for UI, API, and database testing so 2026 suites stay readable, stable, maintainable, and easy to extend safely.',
  date: '2026-07-10',
  category: 'Comparison',
  content: `
# Robot Framework Libraries Comparison 2026

The first bad smell in a Robot Framework suite is not a failing keyword. It is a keyword that hides the wrong tool. A browser test opens a page through SeleniumLibrary because that is what the team installed years ago. An API setup calls curl through Process because nobody added RequestsLibrary. A database check reads a CSV export because DatabaseLibrary was never evaluated. The suite still runs, but the abstraction is carrying debt.

Library choice in Robot Framework is architectural. The framework gives you plain-language test cases, variables, resource files, tags, and reports. The library decides what the test can actually control. In 2026, the most common selection question is not "which Robot library is best?" It is "which library should own this layer of behavior?"

For most QA teams, four libraries show up repeatedly: Browser for modern browser automation through Playwright, SeleniumLibrary for WebDriver-based coverage, RequestsLibrary for HTTP APIs, and DatabaseLibrary for SQL checks. They solve different problems. The mistake is treating them as interchangeable because they share Robot syntax.

If you need the broader testing model before choosing libraries, start with [the Robot Framework testing guide](/blog/robot-framework-testing-guide). If your team is already writing Python extensions, pair this comparison with [the custom libraries guide](/blog/robot-framework-custom-libraries-python-guide).

## The selection question before the library question

Robot Framework makes it easy to compose keywords across domains. That flexibility is helpful until a UI test starts doing direct database cleanup, HTTP setup, browser verification, and file parsing in one long scenario. Before selecting a library, define the layer that each test owns.

| Test intent | Preferred library family | Reason |
|---|---|---|
| User workflow through a browser | Browser or SeleniumLibrary | The browser is the system boundary under test |
| REST setup or service contract probe | RequestsLibrary | HTTP calls are faster and clearer than UI setup |
| Database migration or data integrity check | DatabaseLibrary | SQL assertion belongs near the data store |
| Cross-browser WebDriver grid reuse | SeleniumLibrary | Existing grid investment may matter more than newer APIs |
| Modern web app with auto-waiting needs | Browser | Playwright-style waiting reduces many timing keywords |

This table is not a ranking. It is a boundary map. A good Robot suite can use all four libraries, but not all in the same test case unless the scenario truly crosses those boundaries. Keep setup keywords in resource files, keep domain checks close to their owning layer, and do not use browser automation to verify something an HTTP or SQL check can prove faster.

## Browser library for modern UI automation

Robot Framework Browser, often imported as Browser, uses Playwright under the hood. Its strongest fit is a modern web application where auto-waiting, browser contexts, network-aware behavior, and reliable selectors matter. Teams moving from SeleniumLibrary usually notice fewer explicit sleeps and fewer custom waiting keywords.

Browser is not just "SeleniumLibrary with different keyword names." It has a different mental model. Contexts are first-class. Selectors can use Playwright engines. The library expects Node dependencies to be installed during setup. That is a reasonable tradeoff for teams already running JavaScript tooling, but it is a deployment detail that pure Python Robot projects must plan.

\`\`\`robot
*** Settings ***
Library    Browser

*** Test Cases ***
Checkout Shows Card Form
    New Browser    chromium    headless=True
    New Context    viewport={'width': 1366, 'height': 768}
    New Page    https://shop.example.test/cart
    Click    data-testid=checkout
    Get Text    data-testid=checkout-step    ==    Payment
    Get Element States    data-testid=card-number    contains    enabled
    Close Browser
\`\`\`

The keywords are concise because the library handles much of the waiting around elements becoming actionable. That does not remove the need for stable selectors. A Browser suite still needs data-testid or semantic locators chosen intentionally. If every selector is a deep CSS path, changing libraries will not fix flakiness.

Browser is a strong default for new browser suites unless your organization has a hard dependency on WebDriver infrastructure. The cost is operational: installing browser binaries, managing Node on runners, and training the team on Playwright-flavored behavior.

## SeleniumLibrary when WebDriver still has value

SeleniumLibrary remains relevant because many companies have existing Selenium Grid capacity, vendor device clouds, old browsers, and years of custom Robot keywords built on WebDriver. Replacing it just because Browser is newer can waste time if the current suite is stable and covers the right risk.

The library is direct and familiar. Open Browser, Click Element, Input Text, Wait Until Element Is Visible, and Capture Page Screenshot are widely understood. Its weakness is that teams often accumulate sleeps and broad waits to compensate for dynamic UIs. That is not entirely SeleniumLibrary's fault, but the WebDriver model leaves more waiting discipline to the suite author.

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Variables ***
\${BASE_URL}    https://admin.example.test

*** Test Cases ***
Admin Can Disable Feature Flag
    Open Browser    \${BASE_URL}/flags    chrome
    Wait Until Element Is Visible    css:[data-testid="flag-search"]    10s
    Input Text    css:[data-testid="flag-search"]    invoice-v2
    Click Element    css:[data-testid="flag-invoice-v2"] button
    Wait Until Page Contains Element    css:[data-testid="toast-success"]    10s
    Element Text Should Be    css:[data-testid="toast-success"]    Flag updated
    Close Browser
\`\`\`

Use SeleniumLibrary deliberately where WebDriver compatibility is the requirement. Do not keep it only because nobody has revisited the choice. If the team spends more time maintaining waits than asserting behavior, run a small Browser proof of concept on the hardest screens before migrating an entire suite.

## RequestsLibrary for setup, probes, and API checks

RequestsLibrary wraps Python requests for Robot. It is the library to reach for when the system boundary is HTTP and the browser adds no value. It can create sessions, send requests, validate response fields, and prepare data before a UI scenario.

The biggest improvement RequestsLibrary brings is test speed. A browser login flow may take several seconds and fail for UI reasons. An API token creation call can prepare state quickly and leave the UI test focused on the screen under test. That separation improves failure diagnosis.

\`\`\`robot
*** Settings ***
Library    RequestsLibrary
Library    Collections

*** Test Cases ***
Create Order API Returns Persisted Status
    Create Session    orders    https://api.example.test
    &{payload}=    Create Dictionary    sku=keyboard-1    quantity=2
    \${response}=    POST On Session    orders    /orders    json=\${payload}    expected_status=201
    Dictionary Should Contain Key    \${response.json()}    id
    Should Be Equal    \${response.json()}[status]    pending
    \${order_id}=    Set Variable    \${response.json()}[id]
    \${read}=    GET On Session    orders    /orders/\${order_id}    expected_status=200
    Should Be Equal    \${read.json()}[status]    pending
\`\`\`

Be careful with API tests that duplicate all service unit tests. Robot is strongest when a human-readable scenario matters across team boundaries. If the API behavior is highly granular and developer-owned, keep most checks in the service repository and use Robot for cross-service acceptance or QA-owned probes.

## DatabaseLibrary for data assertions with restraint

DatabaseLibrary gives Robot direct SQL access through Python database drivers. It is useful for migration verification, ETL checks, data reconciliation, and confirming that a workflow wrote the expected record when no API exposes the state.

Direct database assertions can also couple tests to implementation details. Use them when the data store is the subject of the test, or when the application does not expose an observable contract. Avoid checking five internal tables after every UI test. That creates brittle tests that fail when the schema changes even though the user behavior is intact.

\`\`\`robot
*** Settings ***
Library    DatabaseLibrary

*** Variables ***
\${DB_NAME}        orders_test
\${DB_USER}        app
\${DB_PASSWORD}    secret
\${DB_HOST}        localhost
\${DB_PORT}        5432

*** Test Cases ***
Migration Backfills Invoice Status
    Connect To Database    psycopg2    \${DB_NAME}    \${DB_USER}    \${DB_PASSWORD}    \${DB_HOST}    \${DB_PORT}
    \${rows}=    Query    select status from invoices where legacy_status = 'PAID' order by id
    Should Not Be Empty    \${rows}
    FOR    \${row}    IN    @{rows}
        Should Be Equal    \${row}[0]    paid
    END
    Disconnect From Database
\`\`\`

The example is a database test, not a UI test with database cleanup attached. Keep that distinction. DatabaseLibrary is excellent when validating SQL-visible transformations. It is risky when used as a shortcut around missing application observability.

## Comparing the four libraries by operating cost

Feature lists rarely decide the right library. Operating cost does. Ask who will maintain the runtime, who debugs failures, and which failures will be understandable in the report.

| Library | Runtime dependencies | Best failure messages usually come from | Maintenance pressure |
|---|---|---|---|
| Browser | Python package, Node tooling, Playwright browsers | Actionability checks, selector failures, page state | Browser binary updates and selector strategy |
| SeleniumLibrary | Python package, browser drivers or Selenium Grid | Explicit waits, WebDriver errors, screenshots | Driver compatibility and wait discipline |
| RequestsLibrary | Python requests stack | HTTP status, response body, schema assertions | Test data and environment routing |
| DatabaseLibrary | Python DB driver, database access | SQL result mismatch or connection failure | Schema churn and credential management |

For a regulated organization, database access and stored artifacts may be the harder part. For a frontend-heavy SaaS team, browser binary updates and selector governance may dominate. For platform QA, RequestsLibrary may be the most heavily used because service flows matter more than UI screens.

## Migration paths that do not break the suite

Robot suites rarely move libraries in one jump. The safest migration is route by route. Pick one flaky SeleniumLibrary area, write the Browser version in parallel, and compare stability for a week. Do not rewrite stable tests for vanity. Move tests when the target library solves a real pain.

For API setup, introduce RequestsLibrary behind resource keywords. A UI test should call Create Test Customer, not know whether that keyword uses an HTTP endpoint, a fixture service, or a direct database insert. That makes the library replaceable later.

For database checks, isolate connection keywords and SQL helpers. Put credentials in environment variables or secret-backed variables, not in test files. Separate destructive cleanup from verification. A failed cleanup keyword can hide the real assertion failure if it is mixed into the same long test body.

## Designing resource files around library boundaries

The cleanest Robot projects usually have resource files that map to domains, not libraries. A checkout resource can use Browser for UI steps and RequestsLibrary for setup, but it should expose business keywords. The library details stay inside.

\`\`\`robot
*** Settings ***
Library       Browser
Library       RequestsLibrary
Resource      auth.resource

*** Keywords ***
Create Paid Cart Through API
    [Arguments]    \${sku}
    Create Session    shop    https://api.example.test
    &{payload}=    Create Dictionary    sku=\${sku}    paymentState=paid
    \${response}=    POST On Session    shop    /test/carts    json=\${payload}    expected_status=201
    RETURN    \${response.json()}[cartId]

Open Cart In Browser
    [Arguments]    \${cart_id}
    New Page    https://shop.example.test/cart/\${cart_id}
    Get Text    data-testid=cart-status    ==    Paid
\`\`\`

This keeps tests readable while allowing the implementation to use the right library. The test case can say Create Paid Cart Through API and Open Cart In Browser. The resource file owns the technical choices.

## Library selection for mixed UI and API products

Many teams test admin panels, public websites, APIs, and nightly jobs in the same repository. Robot can support that, but only if tags, directories, and resource files make the execution model clear.

| Suite area | Suggested tags | Primary library | Run frequency |
|---|---|---|---|
| Critical browser journeys | smoke, ui, release | Browser or SeleniumLibrary | Pull request and release |
| API acceptance checks | api, contract, service | RequestsLibrary | Pull request and scheduled |
| Data reconciliation | data, db, nightly | DatabaseLibrary | Scheduled or migration pipeline |
| Legacy browser coverage | ui, legacy, grid | SeleniumLibrary | Release or targeted compatibility run |
| New frontend flows | ui, modern, chromium | Browser | Pull request for owned screens |

Tags should drive CI selection. Do not force every library into every run. API checks can run quickly on each commit. Database reconciliation may need a seeded environment and should not block unrelated frontend changes unless the change touches that area.

## When a Python custom library is better

Sometimes none of the general libraries gives the right keyword shape. If your tests repeatedly parse domain-specific files, sign internal tokens, compare message envelopes, or call a test data service, write a small Python library. Robot's value is readable orchestration. It should not become a dumping ground for complex logic in keyword syntax.

\`\`\`python
from robot.api.deco import keyword
import requests


class BillingTestData:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    @keyword("Create Invoice Fixture")
    def create_invoice_fixture(self, customer_id: str, amount_cents: int) -> str:
        response = requests.post(
            f"{self.base_url}/test-fixtures/invoices",
            json={"customerId": customer_id, "amountCents": amount_cents},
            timeout=10,
        )
        response.raise_for_status()
        return response.json()["invoiceId"]
\`\`\`

That custom library can still coexist with Browser, RequestsLibrary, and DatabaseLibrary. The goal is not to replace standard libraries. The goal is to keep difficult domain logic in normal Python where it can be typed, reviewed, and unit tested.

## Decision rules for 2026 suites

Choose Browser for new browser automation when the application is modern, dynamic, and mainly tested in evergreen browsers. Choose SeleniumLibrary when WebDriver compatibility, existing grid coverage, or legacy browser requirements are real constraints. Choose RequestsLibrary for HTTP behavior and setup that does not need a browser. Choose DatabaseLibrary when SQL-visible state is the subject of the test or the only reliable oracle.

Most importantly, choose fewer mixed-purpose test cases. A Robot test that drives a browser, sends API calls, checks SQL, and parses files can be valid, but it should be rare and clearly named as an end-to-end workflow. Routine coverage should be layered. That is how Robot remains readable after the first year.

## Governance for library upgrades

Library choice is not a one-time decision. Browser, SeleniumLibrary, RequestsLibrary, and DatabaseLibrary all depend on underlying ecosystems that move at different speeds. Put ownership on upgrades instead of letting the suite discover incompatibilities during a release branch. A small quarterly upgrade lane is usually cheaper than a surprise migration after a browser driver, Playwright browser binary, database driver, or requests dependency changes behavior.

For UI libraries, keep a canary suite that exercises login, a dynamic form, file upload if your product uses it, and one page with heavy client-side rendering. For RequestsLibrary, keep a service with authentication, JSON body, query parameters, and expected error response. For DatabaseLibrary, keep one connection test and one query test per database type your CI supports. These canaries are not product regression coverage. They are library health checks.

When a library upgrade breaks tests, separate suite defects from product defects. A selector that only worked by accident should be fixed in the suite. A changed keyword name should be handled in shared resource files. A driver bug should be pinned and documented. Treat the library layer as infrastructure, because that is what it becomes after hundreds of Robot tests depend on it.

## Frequently Asked Questions

### Should a new Robot UI project start with Browser or SeleniumLibrary?

Start with Browser unless you have a concrete WebDriver requirement such as an existing Selenium Grid, vendor cloud constraint, or browser version that Playwright does not cover. Browser's waiting model is usually a better fit for modern web apps.

### Can Browser and SeleniumLibrary run in the same Robot repository?

Yes, but keep them in separate suites or resource boundaries. Mixing both libraries in one test case is confusing because they manage browser state differently. Use tags and directories to make ownership obvious.

### Is RequestsLibrary only for API test suites?

No. It is also useful for test setup and cleanup around UI tests. The test case should still describe the business step, while the resource keyword can use RequestsLibrary internally.

### When is DatabaseLibrary too risky?

It is risky when tests assert internal tables for behavior that should be verified through an API or UI contract. Use it confidently for migration checks, reconciliation, and data quality tests where the database is the artifact under test.

### How do I avoid library sprawl in Robot Framework?

Create a short library policy per suite area. New keywords should name the behavior, not the library. If a new library is added, require one example suite, setup documentation, and a clear reason existing libraries cannot cover the need.
`,
};
