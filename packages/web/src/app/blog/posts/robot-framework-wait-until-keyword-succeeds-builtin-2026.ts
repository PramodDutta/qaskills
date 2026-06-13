import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework BuiltIn Wait Until Keyword Succeeds Reference',
  description:
    'Complete reference for Robot Framework BuiltIn Wait Until Keyword Succeeds. Covers retry, interval, exponential backoff, timeout strategy, OTP and polling use cases.',
  date: '2026-06-06',
  category: 'Reference',
  content: `
# Robot Framework BuiltIn Wait Until Keyword Succeeds Reference

\`Wait Until Keyword Succeeds\` is the polling primitive of Robot Framework -- the one BuiltIn keyword every engineer reaches for when waiting on an OTP, polling a slow API, retrying a flaky element click, or any other situation where success is reachable but not immediate. This reference covers the full signature, retry and interval semantics including the exponential backoff strategy introduced in Robot Framework 5.0, common patterns with SeleniumLibrary, RequestsLibrary, AppiumLibrary, and Browser Library, and the failure modes that bite teams in CI. If you are searching for \`robot framework wait until keyword succeeds builtin documentation\`, every API surface, idiom, and gotcha lives here in one place.

We assume Robot Framework 6.x or 7.x. Examples are written in plain \`.robot\` syntax and assume Python 3.10+ as the underlying runtime. Where library-specific behavior matters (Selenium vs Browser vs Appium vs Requests) we call it out explicitly.

## Key Takeaways

- The signature is \`Wait Until Keyword Succeeds  <retry>  <retry interval>  <keyword>  *<args>\`
- \`<retry>\` accepts either a count (\`5x\`) or a duration (\`1 min\`). Counts run the keyword that many times max; durations run it until the wall-clock budget is exhausted
- \`<retry interval>\` accepts a time string (\`2s\`, \`500ms\`, \`1 minute\`) or a \`strict:\` / \`strict\` prefix to force exact spacing rather than the default best-effort
- Robot Framework 5.0 added \`<retry interval>\` exponential backoff via \`<initial>:<max>\`. Format: \`1s:30s\` doubles each retry, capped at 30 seconds
- The wrapped keyword can be any Robot Framework keyword -- BuiltIn, library, or user keyword. Arguments after the keyword name are passed through unchanged
- On success, the return value of the wrapped keyword is returned. On the final failure, the wrapped keyword's error message is re-raised

## Why Polling Matters

Every test eventually hits a "wait for this thing to happen" moment. Naive solutions are either too slow (\`Sleep  10s\` everywhere) or too brittle (assuming a single retry is enough). \`Wait Until Keyword Succeeds\` is the structured answer: it polls, it bounds, and it preserves the underlying error so you know why a wait timed out.

Typical applications:

- Waiting on an OTP that arrives in 5-30 seconds via email or SMS
- Waiting for an async job to finish (S3 upload, DB job, webhook delivery)
- Retrying a transient HTTP failure (502, 503, connection reset)
- Waiting for a UI element to appear after a slow client-side fetch
- Polling a status endpoint until it reports "completed"

The pattern in all five is the same: try the keyword, catch the failure, wait a bit, try again, give up after a budget.

## Basic Syntax

\`\`\`robot
*** Settings ***
Library    BuiltIn

*** Test Cases ***
Simple Retry
    Wait Until Keyword Succeeds    5x    2s    Some Keyword

Wait For OTP
    \${otp}=    Wait Until Keyword Succeeds    30s    1s    Get OTP From Inbox
    Should Match Regexp    \${otp}    \\\\d{6}
\`\`\`

The two-argument prefix (\`<retry>\` and \`<retry interval>\`) is required. The third argument is the keyword name. Everything after is forwarded as arguments to the keyword.

## Retry Counts vs Time Budgets

| Form | Meaning | Use when |
|---|---|---|
| \`5x\` | Try up to 5 times | You know the expected step count |
| \`1 min\` | Try until 60 seconds elapse | You only care about wall clock |
| \`100x\` | Try up to 100 times | High-frequency polling with short interval |
| \`5 min\` | 5-minute budget | Long-running async jobs |

Counts are deterministic; durations are not. Prefer counts when test reproducibility matters and you can predict the retry rate.

## Time String Format

Both \`<retry>\` (when used as duration) and \`<retry interval>\` accept Robot Framework's standard time strings:

| String | Meaning |
|---|---|
| \`500ms\` | 0.5 seconds |
| \`5s\` | 5 seconds |
| \`2 min\` | 120 seconds |
| \`1h 30m\` | 90 minutes |
| \`1d\` | 24 hours |

You can also pass a plain number which is interpreted as seconds: \`Wait Until Keyword Succeeds  5  1  Some Keyword\` means up to 5 retries with 1-second intervals.

## Exponential Backoff (Robot Framework 5.0+)

The \`<retry interval>\` argument supports a colon-separated form for exponential backoff:

\`\`\`robot
*** Test Cases ***
Backoff Polling
    Wait Until Keyword Succeeds    2 min    1s:30s    Check Job Status
\`\`\`

This means: start with a 1-second interval, double after each retry, but cap at 30 seconds. The budget is still 2 minutes. Backoff is useful when:

- You do not know how long the operation will take
- You want fast initial polling but kind behavior on slow operations
- You want to be a polite client to an external service

The doubling factor is always 2x and is not configurable; if you need a different shape, write a Python keyword.

## Strict Spacing

By default the retry interval is best-effort. If the wrapped keyword takes 500ms and the interval is 1s, the next attempt fires roughly 1.5s after the first started. With \`strict:\` (or \`strict\` as a separate parameter for the colon form) the next attempt fires at the strict 1s mark even if it means the keyword and the wait overlap.

\`\`\`robot
Wait Until Keyword Succeeds    10s    strict:500ms    Quick Check
\`\`\`

In practice the default is what you want 95% of the time. Strict matters only for high-frequency polling against external systems where attempt frequency itself is part of the test.

## Common Patterns

### Pattern 1: Wait for UI element with SeleniumLibrary

\`\`\`robot
*** Settings ***
Library    SeleniumLibrary

*** Test Cases ***
Login And Wait For Dashboard
    Open Browser    https://example.com    chrome
    Input Text    id=username    user
    Input Text    id=password    pw
    Click Button    id=submit
    Wait Until Keyword Succeeds    30s    1s
    ...    Page Should Contain Element    css=.dashboard
\`\`\`

SeleniumLibrary has its own \`Wait Until Page Contains Element\` keyword that does almost the same thing. Use that instead when the wait is element-shaped. Use \`Wait Until Keyword Succeeds\` when the wait is composite -- multiple keywords, or a keyword from a different library.

### Pattern 2: Wait for OTP via email

\`\`\`robot
*** Settings ***
Library    ImapLibrary
Library    String

*** Test Cases ***
Verify OTP Email
    Open Mailbox    host=imap.example.com    user=test    password=pw
    \${otp}=    Wait Until Keyword Succeeds    1 min    5s
    ...    Read OTP From Latest Email    subject=Your one-time code
    Should Match Regexp    \${otp}    \\\\d{6}

*** Keywords ***
Read OTP From Latest Email
    [Arguments]    \${subject}
    \${msg}=    Wait For Email    sender=noreply@example.com    timeout=3s
    \${body}=    Get Email Body    \${msg}
    \${otp}=    Get Regexp Matches    \${body}    code:\\\\s*(\\\\d{6})    1
    [Return]    \${otp}[0]
\`\`\`

The inner keyword \`Read OTP From Latest Email\` raises if the email is not there yet. \`Wait Until Keyword Succeeds\` keeps trying until it shows up.

### Pattern 3: Poll an async job status

\`\`\`robot
*** Settings ***
Library    RequestsLibrary

*** Test Cases ***
Wait For Job Completion
    \${job_id}=    Trigger Long Job
    \${status}=    Wait Until Keyword Succeeds    5 min    2s:30s
    ...    Job Should Be Complete    \${job_id}
    Should Be Equal    \${status}    succeeded

*** Keywords ***
Job Should Be Complete
    [Arguments]    \${job_id}
    \${resp}=    GET    /jobs/\${job_id}
    Should Be Equal As Numbers    \${resp.status_code}    200
    Should Be Equal    \${resp.json()}[status]    succeeded
    [Return]    succeeded
\`\`\`

Exponential backoff (\`2s:30s\`) keeps initial polling fast and tapers off if the job is slow.

### Pattern 4: Retry a flaky network call

\`\`\`robot
*** Test Cases ***
Resilient API Call
    \${data}=    Wait Until Keyword Succeeds    3x    1s    Fetch User Profile

*** Keywords ***
Fetch User Profile
    \${resp}=    GET    /users/me
    Status Should Be    200    \${resp}
    [Return]    \${resp.json()}
\`\`\`

If the GET fails the first two times, the third try (5 seconds in total) typically succeeds.

## Failure Modes

| Symptom | Cause | Fix |
|---|---|---|
| "Keyword still failing after Nx retries" | Wrapped keyword never reaches success | Inspect actual error in the last attempt's log |
| Test passes locally, hangs in CI | Wrapped keyword is non-deterministic; longer interval needed | Increase retry budget and interval |
| Backoff form rejected | Robot Framework < 5.0 | Upgrade or fall back to fixed interval |
| Inner keyword arguments not interpolated | Misuse of \`\${var}\` vs literal string | Wrap variable resolution in keyword |
| Strict spacing causes overlap warnings | Wrapped keyword slower than interval | Increase interval or remove strict |

## Comparison with Library-Specific Waits

| Wait | Library | Best for |
|---|---|---|
| \`Wait Until Keyword Succeeds\` | BuiltIn | Composite waits, custom predicates |
| \`Wait Until Element Is Visible\` | SeleniumLibrary | Single element appearance |
| \`Wait Until Page Contains\` | SeleniumLibrary | Text appearance |
| \`Wait For Elements State\` | Browser (Playwright) | Element state changes |
| \`Wait Until Created\` | OperatingSystem | File system events |
| \`Wait For Process\` | Process | Subprocess completion |

Library-specific waits are usually more efficient because they tap into the underlying tooling's wait mechanism rather than re-running the entire keyword. Use BuiltIn's \`Wait Until Keyword Succeeds\` when no library wait fits.

## Comparison with Sleep

Pre-2015 Robot Framework tests are full of \`Sleep  10s\`. That pattern is almost always wrong:

| Strategy | Wall time | Reliability | Best for |
|---|---|---|---|
| \`Sleep  10s\` | Always 10s | Brittle | Demos only |
| \`Wait Until Keyword Succeeds  10s  1s  ...\` | 1-10s, avg 3-4s | High | Production tests |
| Library wait | Tool-dependent | Highest | Element/state waits |

A test that uses \`Wait Until Keyword Succeeds\` is faster on average and more reliable. Convert every \`Sleep\` in your suite to a polling wait where possible.

## Return Value Semantics

The wrapped keyword's return value is propagated:

\`\`\`robot
\${value}=    Wait Until Keyword Succeeds    10s    1s    Get Order Total    order-123
Should Be Equal As Numbers    \${value}    99.95
\`\`\`

If the keyword returns nothing, \`\${value}\` is None. If the keyword returns multiple values, you can unpack them:

\`\`\`robot
\${a}    \${b}=    Wait Until Keyword Succeeds    10s    1s    Get Two Values
\`\`\`

## Error Message Propagation

The final failure re-raises the wrapped keyword's most recent error. This means:

\`\`\`robot
Wait Until Keyword Succeeds    5x    1s    Element Should Be Visible    css=.foo
\`\`\`

If \`.foo\` never appears, the test fails with \`Element 'css=.foo' should have been visible.\` rather than a generic "wait expired" message. Useful for debugging.

If you want a custom message, wrap in a user keyword:

\`\`\`robot
*** Keywords ***
Dashboard Should Load
    Element Should Be Visible    css=.dashboard
    Element Should Be Visible    css=.user-menu

*** Test Cases ***
Login Flow
    Click Button    id=login
    Wait Until Keyword Succeeds    30s    1s    Dashboard Should Load
\`\`\`

## Performance Considerations

| Setup | Calls per second | Wall time |
|---|---|---|
| 1s fixed interval | ~1 | linear |
| 500ms fixed interval | ~2 | linear |
| 1s:30s backoff | starts at 1, drops to 0.03 | best-effort cap |
| strict 500ms | exactly 2 | linear |

If the wrapped keyword has side effects (logs, API hits) the call rate matters. Default to a 1s interval unless you have a specific reason to go faster.

## Custom Python Wrapper

For complex retry policies (jitter, custom backoff curves, conditional retries), write a Python keyword:

\`\`\`python
# polling.py
from robot.api.deco import keyword
from robot.libraries.BuiltIn import BuiltIn
import time
import random

@keyword
def wait_with_jitter(timeout, base_interval, keyword_name, *args):
    """Poll a keyword with jittered exponential backoff."""
    builtin = BuiltIn()
    deadline = time.time() + _parse_seconds(timeout)
    interval = _parse_seconds(base_interval)
    while time.time() < deadline:
        try:
            return builtin.run_keyword(keyword_name, *args)
        except Exception:
            time.sleep(interval + random.uniform(0, interval * 0.5))
            interval = min(interval * 2, 30)
    raise AssertionError(f"Keyword '{keyword_name}' did not succeed within {timeout}")

def _parse_seconds(t):
    if isinstance(t, (int, float)): return float(t)
    return BuiltIn().convert_to_number(BuiltIn().convert_time(t))
\`\`\`

Use it from \`.robot\`:

\`\`\`robot
*** Settings ***
Library    polling.py

*** Test Cases ***
Jittered Wait
    Wait With Jitter    1 min    500ms    Some Keyword
\`\`\`

## When to Avoid Wait Until Keyword Succeeds

It is not free. Each retry runs the keyword which may have side effects (HTTP requests, browser interactions, log entries). For waits that have a dedicated library primitive (\`Wait Until Element Is Visible\`), prefer that primitive. For waits longer than 5 minutes, consider a different test structure -- perhaps decoupling the trigger and the assertion into separate tests with an external orchestrator.

## CI Integration

In CI you generally want longer timeouts than locally because runners are slower and more variable:

\`\`\`robot
*** Variables ***
\${WAIT_TIMEOUT}    30s
\${WAIT_INTERVAL}    2s

*** Test Cases ***
Login
    Wait Until Keyword Succeeds    \${WAIT_TIMEOUT}    \${WAIT_INTERVAL}    Dashboard Should Load
\`\`\`

Override the variable from the command line in CI:

\`\`\`bash
robot --variable WAIT_TIMEOUT:2min --variable WAIT_INTERVAL:5s tests/
\`\`\`

## Logging

Each retry logs to the Robot Framework log. By default the log can get noisy if you have many retries. Suppress with \`Set Log Level\` if needed:

\`\`\`robot
Set Log Level    WARN
Wait Until Keyword Succeeds    1 min    1s    Some Noisy Keyword
Set Log Level    INFO
\`\`\`

## Frequently Asked Questions

### What is the difference between Wait Until Keyword Succeeds and Run Keyword And Ignore Error?

\`Run Keyword And Ignore Error\` runs the keyword exactly once and swallows the error. \`Wait Until Keyword Succeeds\` runs the keyword repeatedly until it succeeds or a budget expires. The two are sometimes combined: run-and-ignore inside a retry loop, but you usually just want \`Wait Until Keyword Succeeds\` alone.

### Can I retry on specific exceptions only?

Not natively. \`Wait Until Keyword Succeeds\` retries on any failure. If you need to retry on specific exceptions, write a Python keyword that wraps the call and re-raises immediately on terminal errors.

### How do I make it poll until something becomes false?

Invert the wrapped keyword. Instead of "wait until element is visible" use a keyword "element should not be visible" and call \`Wait Until Keyword Succeeds\` around it. Or use \`Run Keyword And Expect Error\` inside a wrapper.

### Why does my OTP wait time out even though the OTP arrived?

Three usual causes: the IMAP connection is cached and not refreshing, the OTP regex does not match, or the test was looking at the wrong inbox. Add logging inside the wrapped keyword to see what each retry actually returned.

### Does exponential backoff cap the retry count or the wall time?

Wall time. The total budget is the first argument. Backoff just changes how the interval grows between retries. If you exhaust the budget after 4 retries with a 2 min:1s:30s setup, you got 4 retries.

### Can I share variables between retries?

Yes. The wrapped keyword runs in the normal variable scope, so any variables set inside persist. This is sometimes useful for tracking progress across retries but is generally a code smell -- if you need state between attempts you probably want a higher-level orchestration keyword.

### How do I see what was tried on each retry?

The Robot log captures each invocation under the \`Wait Until Keyword Succeeds\` node. Expand it in the HTML log to see every attempt's pass/fail and timing. For CI debugging, save the log as an artifact.

## Conclusion

\`Wait Until Keyword Succeeds\` is the polling primitive that turns brittle \`Sleep\`-based tests into resilient ones. Master the time string formats, learn the exponential backoff syntax, and reach for it any time the test is waiting on an asynchronous outcome. Pair it with library-specific waits where they exist and write Python wrappers when the built-in retry policy is not flexible enough.

For more Robot Framework references, see our [SeleniumLibrary link locator guide](/blog/robot-framework-seleniumlibrary-link-locator-keyword-driven-2026) and browse the [Robot Framework skills](/skills) for AI agent skills that scaffold polling waits automatically. The [Robot Framework comparison](/compare) covers when this tooling beats the alternatives.
`,
};
