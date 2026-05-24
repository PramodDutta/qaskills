import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Wait Until Keyword Succeeds Complete Guide',
  description:
    'Master Wait Until Keyword Succeeds in Robot Framework. Retry strategies, polling patterns, timeout handling, exception filtering, and real-world test automation examples.',
  date: '2026-05-01',
  category: 'Reference',
  content: `
# Robot Framework Wait Until Keyword Succeeds Complete Guide

Flaky tests are the silent killer of automated test suites. A button that needs an extra 200ms to appear, an API that occasionally returns a 503, a database connection that drops once every hundred runs - these intermittent failures erode trust in automation and force engineers to spend hours debugging non-deterministic behavior. Robot Framework's BuiltIn library provides a powerful tool to neutralize this noise: the Wait Until Keyword Succeeds keyword. Rather than failing on the first error, it lets you retry any keyword with configurable timeouts, polling intervals, and exception handling. When used thoughtfully, it transforms brittle tests into resilient ones; when abused, it hides real bugs behind silent retries.

This complete guide walks through every aspect of Wait Until Keyword Succeeds, from basic syntax to advanced patterns used in production Robot Framework suites. You'll learn the difference between polling and waiting, how to write custom retry keywords, how to combine it with browser and API testing, and how to integrate it into CI/CD pipelines without masking genuine regressions. Whether you're a Robot Framework newcomer or a seasoned automation architect, this reference will sharpen your retry strategy and help you build tests that fail loudly when something is actually broken - and only when something is actually broken.

## Key Takeaways

- Wait Until Keyword Succeeds is part of the BuiltIn library - no import required
- It retries any keyword until success or until the timeout elapses
- Default retry interval is 0 seconds (immediate retry); set it explicitly
- Use it for waiting on async behavior, not as a default wrapper for every step
- Combine with SeleniumLibrary and Browser library for resilient UI tests
- Use with RequestsLibrary for API endpoints that take time to become consistent
- Tag retries explicitly in logs so you can distinguish real waits from masked flakiness

---

## Basic Syntax

The keyword takes a retry limit, a retry interval, and the keyword to execute along with its arguments:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Test Cases ***
Wait For Element Example
    Open Browser    https://app.example.com    chrome
    Wait Until Keyword Succeeds    5x    2s    Click Element    id=submit
    Close Browser
\`\`\`

The arguments mean:
- 5x: retry up to 5 times (or use 30s for time-based limit)
- 2s: wait 2 seconds between attempts
- Click Element: the keyword to retry
- id=submit: arguments passed to that keyword

If the keyword succeeds on any attempt, the suite continues. If all attempts fail, the test fails with the last error.

## Retry Limit Formats

You can specify retry limits two ways:

| Format | Meaning | Example |
|--------|---------|---------|
| Number followed by 'x' | Max attempts | 10x retries up to 10 times |
| Time string | Total wait time | 30s retries until 30 seconds elapsed |

Time strings accept robot framework's standard time format: 10s, 2min, 1h, or numeric seconds.

\`\`\`robot
*** Test Cases ***
Retry By Attempts
    Wait Until Keyword Succeeds    10x    1s    Check Status

Retry By Duration
    Wait Until Keyword Succeeds    30s    2s    Check Status

Retry With Float Interval
    Wait Until Keyword Succeeds    20s    0.5s    Check Status
\`\`\`

## Polling Intervals

The retry interval prevents tight loops from hammering your application. Choose intervals based on what you're waiting for:

\`\`\`robot
*** Keywords ***
Wait For API Health
    [Documentation]    Polls API every 3 seconds for up to 60 seconds
    Wait Until Keyword Succeeds    60s    3s    API Should Be Healthy

API Should Be Healthy
    \${response}=    GET    \${BASE_URL}/health
    Status Should Be    200    \${response}
    Should Be Equal    \${response.json()}[status]    ok
\`\`\`

For UI tests, 250ms-1s intervals are common. For slow async jobs, 5-15s intervals avoid overwhelming the system.

## Practical Example: Login Flow

Here's how Wait Until Keyword Succeeds handles real-world UI flakiness:

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary
Suite Setup    Open Browser    \${BASE_URL}    chrome
Suite Teardown    Close Browser

*** Variables ***
\${BASE_URL}    https://app.example.com
\${USERNAME}    testuser@example.com
\${PASSWORD}    SecurePass123!

*** Test Cases ***
User Can Log In
    Wait Until Keyword Succeeds    10s    1s    Element Should Be Visible    id=login-form
    Input Text    id=username    \${USERNAME}
    Input Password    id=password    \${PASSWORD}
    Click Button    id=login-btn
    Wait Until Keyword Succeeds    20s    2s    Page Should Contain    Welcome
    Element Should Be Visible    id=dashboard
\`\`\`

The first wait gives the page time to render the login form. The second handles the redirect and dashboard load time.

## Custom Retry Keywords

Sometimes built-in checks aren't expressive enough. Wrap complex logic in a custom keyword:

\`\`\`robot
*** Keywords ***
Order Should Be Processed
    [Arguments]    \${order_id}
    \${response}=    GET    \${API}/orders/\${order_id}
    Status Should Be    200    \${response}
    \${status}=    Set Variable    \${response.json()}[status]
    Should Be Equal    \${status}    processed
    Log    Order \${order_id} confirmed processed

Wait For Order Processing
    [Arguments]    \${order_id}    \${timeout}=120s    \${interval}=5s
    Wait Until Keyword Succeeds    \${timeout}    \${interval}
    ...    Order Should Be Processed    \${order_id}

*** Test Cases ***
End To End Order Flow
    \${order_id}=    Place Order
    Wait For Order Processing    \${order_id}
    Verify Email Sent    \${order_id}
\`\`\`

This pattern keeps test cases readable while encapsulating retry policy.

## Comparison With Other Wait Keywords

Robot Framework has multiple waiting mechanisms. Choose the right one:

| Keyword | Use Case | Library |
|---------|----------|---------|
| Wait Until Keyword Succeeds | Retry any keyword | BuiltIn |
| Wait Until Element Is Visible | Wait for DOM element | SeleniumLibrary |
| Wait For Elements State | Wait for Playwright element | Browser |
| Wait Until Page Contains | Wait for page text | SeleniumLibrary |
| Wait Until Created | Wait for file | OperatingSystem |
| Sleep | Fixed delay (avoid) | BuiltIn |

Wait Until Keyword Succeeds is the most flexible - it can wait for anything you can express as a Robot keyword.

## Avoiding Sleep

Sleep is a code smell in test automation. It either wastes time on every run or fails sporadically when the wait is too short. Replace fixed sleeps with explicit conditions:

\`\`\`robot
*** Test Cases ***
Bad Example
    Click Button    Submit
    Sleep    10s
    Element Should Be Visible    id=result

Good Example
    Click Button    Submit
    Wait Until Keyword Succeeds    10s    500ms    Element Should Be Visible    id=result
\`\`\`

The good example fails fast when something breaks while still tolerating slow systems.

## Exception Handling

By default, any failure triggers a retry. Sometimes you want to fail immediately on certain errors and only retry others. Use Run Keyword And Return Status or custom logic:

\`\`\`robot
*** Keywords ***
Check Critical Service
    \${response}=    GET    \${API}/status    expected_status=any
    Run Keyword If    \${response.status_code} == 401
    ...    Fatal Error    Authentication failed - not retrying
    Status Should Be    200    \${response}
\`\`\`

The Fatal Error keyword stops the test immediately, bypassing the retry loop.

## Combining With Browser Library

For Playwright-powered tests via the Browser library:

\`\`\`robot
*** Settings ***
Library    Browser

*** Test Cases ***
Modern UI Wait Pattern
    New Browser    chromium    headless=true
    New Page    https://shop.example.com
    Wait Until Keyword Succeeds    15s    500ms
    ...    Get Element States    id=add-to-cart    ==    visible
    Click    id=add-to-cart
    Wait Until Keyword Succeeds    10s    1s
    ...    Get Text    css=.cart-count    ==    1
\`\`\`

Browser library has built-in waits via Wait For Elements State, but Wait Until Keyword Succeeds wraps more complex assertions.

## Combining With RequestsLibrary

API tests often need to wait for eventual consistency:

\`\`\`robot
*** Settings ***
Library    RequestsLibrary

*** Variables ***
\${BASE_URL}    https://api.example.com

*** Test Cases ***
Webhook Should Be Delivered
    \${webhook_id}=    Register Webhook    https://my.example.com/hook
    Trigger Event
    Wait Until Keyword Succeeds    30s    2s
    ...    Webhook Delivery Should Be Recorded    \${webhook_id}

*** Keywords ***
Webhook Delivery Should Be Recorded
    [Arguments]    \${webhook_id}
    \${response}=    GET    \${BASE_URL}/webhooks/\${webhook_id}/deliveries
    Status Should Be    200    \${response}
    Length Should Be Greater Than    \${response.json()}    0
\`\`\`

## Combining With DatabaseLibrary

Some operations write to a database asynchronously:

\`\`\`robot
*** Settings ***
Library    DatabaseLibrary

*** Test Cases ***
Order Should Persist
    \${order_id}=    Create Order Via API
    Wait Until Keyword Succeeds    20s    1s
    ...    Row Count Is Greater Than X    SELECT * FROM orders WHERE id='\${order_id}'    0

*** Keywords ***
Row Count Is Greater Than X
    [Arguments]    \${query}    \${expected_count}
    \${count}=    Row Count    \${query}
    Should Be True    \${count} > \${expected_count}
\`\`\`

## Tag Retried Tests

When retries happen, they hint at flakiness. Tag tests that rely on retries so you can monitor them:

\`\`\`robot
*** Test Cases ***
Search Returns Results
    [Tags]    flaky-watch    needs-retry
    Open Browser    \${BASE_URL}    chrome
    Input Text    id=search    laptops
    Click Button    Search
    Wait Until Keyword Succeeds    15s    1s
    ...    Element Should Be Visible    css=.search-result
    Close Browser
\`\`\`

Run reports with --tag flaky-watch to track frequency over time.

## Using With Run Keyword And Continue On Failure

Combine retries with continue-on-failure patterns to gather multiple errors:

\`\`\`robot
*** Test Cases ***
Multiple Independent Checks
    Run Keyword And Continue On Failure
    ...    Wait Until Keyword Succeeds    10s    1s    Verify Service A
    Run Keyword And Continue On Failure
    ...    Wait Until Keyword Succeeds    10s    1s    Verify Service B
    Run Keyword And Continue On Failure
    ...    Wait Until Keyword Succeeds    10s    1s    Verify Service C
\`\`\`

This is great for smoke tests that verify multiple subsystems.

## Pattern: Polling A Long Job

Many test scenarios involve kicking off a background job and waiting for completion:

\`\`\`robot
*** Keywords ***
Job Status Should Be
    [Arguments]    \${job_id}    \${expected}
    \${response}=    GET    \${API}/jobs/\${job_id}
    Status Should Be    200    \${response}
    \${actual}=    Set Variable    \${response.json()}[status]
    Should Be Equal    \${actual}    \${expected}
    Log    Job \${job_id} is in expected state: \${expected}

Wait For Job Completion
    [Arguments]    \${job_id}
    Wait Until Keyword Succeeds    5min    10s
    ...    Job Status Should Be    \${job_id}    completed

*** Test Cases ***
Large Import Job Completes
    \${job_id}=    Start Import    huge-dataset.csv
    Wait For Job Completion    \${job_id}
    Verify Import Results    \${job_id}
\`\`\`

The 5-minute total with 10-second polls strikes a balance between fast feedback and respectful load.

## Pattern: Eventually Consistent State

Microservices often propagate state asynchronously across caches and replicas:

\`\`\`robot
*** Keywords ***
User Should Appear In Search
    [Arguments]    \${email}
    \${response}=    GET    \${API}/users/search?email=\${email}
    Status Should Be    200    \${response}
    \${users}=    Set Variable    \${response.json()}[results]
    Length Should Be Greater Than    \${users}    0

Wait For Search Indexing
    [Arguments]    \${email}    \${timeout}=60s
    Wait Until Keyword Succeeds    \${timeout}    3s
    ...    User Should Appear In Search    \${email}

*** Test Cases ***
Newly Created User Searchable
    \${email}=    Create User
    Wait For Search Indexing    \${email}
\`\`\`

## Pattern: Network Resilience

Test for network conditions where the first attempt may fail:

\`\`\`robot
*** Keywords ***
Resilient GET
    [Arguments]    \${url}
    \${response}=    GET    \${url}    expected_status=any
    Status Should Be    200    \${response}
    [Return]    \${response}

*** Test Cases ***
External API Integration
    \${response}=    Wait Until Keyword Succeeds    30s    5s
    ...    Resilient GET    https://api.third-party.example.com/data
    Should Be Equal    \${response.json()}[status]    ok
\`\`\`

## Anti-Patterns

Avoid these mistakes:

| Anti-Pattern | Why Bad | Fix |
|--------------|---------|-----|
| Wrapping every assertion | Hides bugs | Only wrap async waits |
| Tiny timeouts | Causes flakiness | Use realistic timeouts |
| Huge timeouts everywhere | Slows the suite | Tune per scenario |
| No interval | Tight loop hammering | Always set retry interval |
| Retrying server errors silently | Masks outages | Tag and report |

## Logging Retry Behavior

By default, Robot logs each retry attempt. To make this visible in CI logs:

\`\`\`robot
*** Settings ***
Documentation    Test suite with retry logging
Default Tags     ci

*** Keywords ***
Logged Wait
    [Arguments]    \${timeout}    \${interval}    @{kw_and_args}
    Log    Starting wait for \${kw_and_args[0]} (timeout=\${timeout})    INFO
    Wait Until Keyword Succeeds    \${timeout}    \${interval}    @{kw_and_args}
    Log    Wait completed for \${kw_and_args[0]}    INFO
\`\`\`

This produces audit trails for post-run analysis.

## Combining With Set Test Variable

Wait Until Keyword Succeeds can populate state for later steps:

\`\`\`robot
*** Keywords ***
Capture Order ID From Page
    \${id}=    Get Text    css=.order-id
    Should Match Regexp    \${id}    \\\\d{6}
    Set Test Variable    \${ORDER_ID}    \${id}

*** Test Cases ***
Complete Checkout
    Click Button    Pay Now
    Wait Until Keyword Succeeds    10s    500ms    Capture Order ID From Page
    Log    Order ID: \${ORDER_ID}
\`\`\`

## Performance Considerations

Retries cost time. Profile your suite to understand the true cost:

\`\`\`bash
robot --listener listener.py --outputdir results suite.robot
\`\`\`

A custom listener can record retry counts per keyword. Optimize the most expensive retries first - either reduce the timeout, increase the polling rate, or address the underlying flakiness.

## Integration With CI/CD

In Jenkins, GitHub Actions, or GitLab CI, configure retry-aware reporting:

\`\`\`yaml
name: Robot Tests
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
      - run: robot --outputdir results tests/
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: results
          path: results/
\`\`\`

Check the report for tests that retried frequently - these are candidates for refactoring.

## Common Pitfalls

Several gotchas trip up new users:

1. Missing the retry interval defaults to 0, causing tight CPU loops.
2. Putting compound logic in retried keywords can hide which assertion failed.
3. Using Wait Until Keyword Succeeds with assertions that have side effects (like clicking buttons) creates non-idempotent retries.
4. Setting timeouts shorter than the SLA you're testing creates false failures.

## When Not To Use It

Some scenarios call for a different approach:

- Synchronous operations - just call the keyword directly.
- Operations that should never need a retry - failing fast is correct.
- Idempotency-sensitive actions like POST creating a resource - use Wait Until Keyword Succeeds on the GET, not the POST.
- Long-running async jobs where polling overhead matters more than test latency - use webhooks or message queues with explicit listeners.

## Real World Suite Example

Here's a complete suite that ties multiple patterns together:

\`\`\`robot
*** Settings ***
Documentation    End-to-end checkout test suite
Library          SeleniumLibrary
Library          RequestsLibrary
Library          DatabaseLibrary
Resource         keywords/common.resource
Suite Setup      Run Keywords    Open Browser    Connect To Database
Suite Teardown   Run Keywords    Close All Browsers    Disconnect From Database

*** Variables ***
\${BASE_URL}    https://shop.example.com
\${API_URL}     https://api.shop.example.com
\${TIMEOUT_SHORT}    10s
\${TIMEOUT_LONG}     2min

*** Test Cases ***
Anonymous User Completes Purchase
    [Tags]    smoke    checkout
    Go To Home Page
    Add Product To Cart    SKU-12345
    Proceed To Checkout
    Fill Guest Checkout Form    test@example.com
    Submit Payment    4242424242424242
    \${order_id}=    Wait For Order Confirmation
    Wait For Order Processing    \${order_id}
    Verify Order In Database    \${order_id}

*** Keywords ***
Wait For Order Confirmation
    Wait Until Keyword Succeeds    \${TIMEOUT_LONG}    2s
    ...    Element Should Be Visible    css=.order-confirmation
    \${id}=    Get Text    css=.order-id
    [Return]    \${id}

Wait For Order Processing
    [Arguments]    \${order_id}
    Wait Until Keyword Succeeds    \${TIMEOUT_LONG}    5s
    ...    API Order Status Should Be    \${order_id}    processed

API Order Status Should Be
    [Arguments]    \${order_id}    \${expected}
    \${response}=    GET    \${API_URL}/orders/\${order_id}
    Status Should Be    200    \${response}
    Should Be Equal    \${response.json()}[status]    \${expected}

Verify Order In Database
    [Arguments]    \${order_id}
    Wait Until Keyword Succeeds    30s    2s
    ...    Row Count Is Equal To X    SELECT * FROM orders WHERE id='\${order_id}'    1
\`\`\`

## Conclusion

Wait Until Keyword Succeeds is one of the most important tools in the Robot Framework toolkit. Used well, it produces tests that tolerate the natural variability of distributed systems without hiding real failures. Used poorly, it becomes a coverall for sloppy code and a way to extend the lifespan of bugs you should be fixing. The difference is intentionality: every retry should reflect a deliberate decision about what condition you're waiting for, how long is reasonable, and how often you should check.

Take time to audit your suite. Tag the tests that need retries. Measure how often retries actually fire. Refactor the keywords that hide too much complexity. And replace every Sleep call you can find with a condition-based wait. Your future self - and the engineers debugging at 2 AM - will thank you.

For more Robot Framework patterns, explore our [skills directory](/skills) or read the [Robot Framework testing guide](/blog/robot-framework-testing-guide).
`,
};
