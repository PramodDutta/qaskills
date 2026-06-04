import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework BuiltIn Keywords Reference and Cheatsheet 2026',
  description:
    'Robot Framework BuiltIn keywords reference: Run Keyword If, Wait Until Keyword Succeeds, Set Variable, Should Be Equal, Evaluate, Log, and a full cheatsheet.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# Robot Framework BuiltIn Keywords Reference 2026

The BuiltIn library is the part of Robot Framework you never import yet use in almost every line. It is loaded automatically into every suite, and it supplies the verbs that turn a list of steps into actual logic: conditionals, loops, retries, variable manipulation, assertions, logging, and the bridge to raw Python through \`Evaluate\`. You can write entire libraries' worth of test logic without leaving BuiltIn, and most flaky or unmaintainable Robot suites are flaky precisely because their authors never learned which BuiltIn keyword fits which job.

This reference is a practical cheatsheet for the BuiltIn keywords that earn their keep in real automation: \`Run Keyword If\` and its conditional cousins, \`Wait Until Keyword Succeeds\` for retries, the \`Set Variable\` family for scoping data, the \`Should Be\` assertion keywords, \`Evaluate\` for inline Python, \`Log\` for diagnostics, \`Repeat Keyword\` for loops, the \`TRY\`/\`EXCEPT\` blocks for error handling, and the explicit verdict keywords \`Fail\`, \`Pass Execution\`, and \`Skip\` that keep your test reports honest. Every example is plain \`.robot\` syntax you can paste into a suite and run. We will note the keywords that are being phased out in favour of native \`IF\`/\`FOR\` syntax, because writing modern Robot Framework means knowing both. If you want a deeper retry-focused companion, the [Wait Until Keyword Succeeds guide on the blog](/blog) goes further, and you can install Robot Framework skills for your AI agent from the [QA Skills directory](/skills).

## Key Takeaways

- BuiltIn is always loaded - you never write \`Library BuiltIn\`
- Native \`IF\`/\`FOR\`/\`TRY\` syntax has largely replaced \`Run Keyword If\` and \`Run Keyword Unless\`
- \`Wait Until Keyword Succeeds\` is the retry primitive for async behaviour
- \`Set Variable\`, \`Set Test Variable\`, \`Set Suite Variable\`, and \`Set Global Variable\` control scope
- \`Evaluate\` runs arbitrary Python expressions inline
- \`Should Be Equal\`, \`Should Contain\`, and \`Should Match\` are your core assertions
- \`Log\` and \`Log To Console\` are different - know which writes where

---

## Variables: The Set Family

Robot Framework's variable scoping is controlled by which \`Set\` keyword you use. \`Set Variable\` creates a local variable; the others widen the scope deliberately.

\`\`\`robot
*** Test Cases ***
Variable Scopes
    \${local}=        Set Variable          hello
    Set Test Variable    \${test_scoped}    visible to rest of this test
    Set Suite Variable   \${suite_scoped}   visible to all tests in suite
    Set Global Variable  \${global_scoped}  visible to all suites
    Log    \${local}
\`\`\`

\`Set Variable If\` is a compact conditional assignment - it returns one value or another based on a condition, avoiding a full \`IF\` block for simple cases:

\`\`\`robot
*** Test Cases ***
Conditional Assignment
    \${count}=    Set Variable    7
    \${label}=    Set Variable If    \${count} > 5    many    few
    Should Be Equal    \${label}    many
\`\`\`

| Keyword | Scope | Lifetime |
|---------|-------|----------|
| \`Set Variable\` | Local | Current keyword/test |
| \`Set Test Variable\` | Test | Remainder of current test |
| \`Set Suite Variable\` | Suite | All tests in the suite |
| \`Set Global Variable\` | Global | All suites in the run |

Reach for the narrowest scope that works. Overusing \`Set Global Variable\` creates hidden coupling between suites that is painful to debug.

---

## Conditionals: Native IF vs Run Keyword If

Modern Robot Framework (3.1+) has native \`IF\`/\`ELSE IF\`/\`ELSE\` blocks. They are clearer than the older \`Run Keyword If\` and should be your default in new code.

\`\`\`robot
*** Test Cases ***
Native If Block
    \${status}=    Get Order Status    \${order_id}
    IF    '\${status}' == 'SHIPPED'
        Log    Order is on its way
    ELSE IF    '\${status}' == 'PENDING'
        Log    Still processing
    ELSE
        Fail    Unexpected status: \${status}
    END
\`\`\`

The older \`Run Keyword If\` still works and you will meet it in existing suites. It runs a keyword only when its condition is true, with \`ELSE IF\` and \`ELSE\` passed as literal strings:

\`\`\`robot
*** Test Cases ***
Legacy Run Keyword If
    \${status}=    Get Order Status    \${order_id}
    Run Keyword If    '\${status}' == 'SHIPPED'    Log    On its way
    ...    ELSE IF    '\${status}' == 'PENDING'    Log    Processing
    ...    ELSE    Fail    Unexpected status
\`\`\`

Prefer the native \`IF\`. \`Run Keyword If\` is harder to read, harder to nest, and its string-based \`ELSE\` markers are a frequent source of subtle bugs.

---

## Run Keyword and Its Variants

The \`Run Keyword\` family lets you call a keyword whose name is itself a variable, or run keywords conditionally on success or failure. These remain useful even in modern code.

\`\`\`robot
*** Test Cases ***
Dynamic And Defensive Execution
    # call a keyword by name held in a variable
    \${kw}=    Set Variable    Log
    Run Keyword    \${kw}    dynamic dispatch works

    # run cleanup only if the main action failed
    Run Keyword And Ignore Error    Risky Step
    \${passed}    \${value}=    Run Keyword And Return Status    Maybe Fails
    Run Keyword If    not \${passed}    Log    recovered gracefully
\`\`\`

| Keyword | Purpose |
|---------|---------|
| \`Run Keyword\` | Call a keyword whose name is dynamic |
| \`Run Keyword And Ignore Error\` | Swallow failures, return status + message |
| \`Run Keyword And Return Status\` | Return True/False instead of failing |
| \`Run Keyword And Continue On Failure\` | Record failure but keep going |
| \`Run Keywords\` | Run several keywords in sequence |

\`Run Keyword And Return Status\` is the idiomatic way to branch on whether something worked without aborting the test - capture the boolean and feed it to an \`IF\`.

---

## Loops: Native FOR vs Repeat Keyword

Native \`FOR\` loops are the modern way to iterate. They support lists, ranges, dictionaries, and enumerate-style indexing.

\`\`\`robot
*** Test Cases ***
Native For Loops
    FOR    \${item}    IN    apple    banana    cherry
        Log    \${item}
    END

    FOR    \${i}    IN RANGE    1    4
        Log    iteration \${i}
    END

    FOR    \${index}    \${name}    IN ENUMERATE    alice    bob
        Log    \${index}: \${name}
    END
\`\`\`

\`Repeat Keyword\` is the simpler tool when you just need to run the same keyword a fixed number of times with no loop variable:

\`\`\`robot
*** Test Cases ***
Repeat A Keyword
    Repeat Keyword    3 times    Log    ping
    Repeat Keyword    5          Click Button    id=load-more
\`\`\`

Use \`FOR\` when you need the iteration value or index; use \`Repeat Keyword\` for a plain "do this N times". Both are far clearer than recursion or copy-pasted steps.

---

## Retries: Wait Until Keyword Succeeds

\`Wait Until Keyword Succeeds\` retries any keyword until it passes or a limit is reached. It takes a retry limit, a polling interval, the keyword, and that keyword's arguments. This is the BuiltIn answer to async UIs and eventually-consistent backends.

\`\`\`robot
*** Test Cases ***
Retry Until Ready
    # retry up to 10 times, waiting 1 second between attempts
    Wait Until Keyword Succeeds    10x    1s    Element Should Be Visible    id=results

    # or retry for a total of 30 seconds
    Wait Until Keyword Succeeds    30s    2s    Status Should Be    200
\`\`\`

| Argument | Meaning | Example |
|----------|---------|---------|
| Retry limit | Max attempts or total time | \`10x\` or \`30s\` |
| Retry interval | Wait between attempts | \`1s\`, \`500ms\` |
| Keyword | The keyword to retry | \`Element Should Be Visible\` |
| Arguments | Passed to that keyword | \`id=results\` |

Use it for genuine waiting, not as a blanket wrapper around every step - wrapping everything in retries hides real regressions behind silent retries.

---

## Assertions: The Should Be Family

BuiltIn's assertion keywords are the backbone of verification. \`Should Be Equal\` is exact-match; the comparison variants and \`Should Contain\`/\`Should Match\` cover the rest.

\`\`\`robot
*** Test Cases ***
Core Assertions
    Should Be Equal             \${actual}    expected
    Should Be Equal As Numbers  \${price}     19.99
    Should Be Equal As Strings  \${id}        12345
    Should Not Be Equal         \${a}         \${b}
    Should Contain              \${response}  success
    Should Not Contain          \${response}  error
    Should Match                \${email}     *@example.com
    Should Match Regexp         \${id}        ^ORD-\\\\d+\$
    Should Be True              \${count} > 0
    Should Be Empty             \${error_list}
    Should Not Be Empty         \${results}
\`\`\`

The \`As Numbers\`/\`As Strings\` variants matter: \`Should Be Equal\` treats everything as a string by default, so \`Should Be Equal    \${1}    1.0\` fails, while \`Should Be Equal As Numbers    \${1}    1.0\` passes. Pick the comparison that matches your intent.

| Keyword | Checks |
|---------|--------|
| \`Should Be Equal\` | Exact equality (string by default) |
| \`Should Be Equal As Numbers\` | Numeric equality |
| \`Should Contain\` | Substring / membership |
| \`Should Match\` | Glob pattern (\`*\`, \`?\`) |
| \`Should Match Regexp\` | Regular expression |
| \`Should Be True\` | Python-truthy expression |

---

## Evaluate: Inline Python

\`Evaluate\` runs a Python expression and returns its result. It is the escape hatch for anything Robot's keyword syntax makes awkward - arithmetic, string formatting, list comprehensions, calling standard-library functions.

\`\`\`robot
*** Test Cases ***
Inline Python With Evaluate
    \${sum}=       Evaluate    2 + 3 * 4
    \${upper}=     Evaluate    "\${name}".upper()
    \${rounded}=   Evaluate    round(\${value}, 2)
    \${ts}=        Evaluate    datetime.datetime.now().isoformat()    modules=datetime
    \${ids}=       Evaluate    [x for x in range(5) if x % 2 == 0]
\`\`\`

The \`modules=\` argument imports standard-library modules for use inside the expression. \`Evaluate\` is powerful but keep expressions short - if you find yourself writing multi-line logic, move it into a proper Python keyword library instead.

---

## Logging: Log vs Log To Console

\`Log\` writes to the Robot log file (\`log.html\`) at a chosen level. \`Log To Console\` writes directly to stdout during execution. They serve different purposes and confusing them is a common beginner mistake.

\`\`\`robot
*** Test Cases ***
Logging Diagnostics
    Log    This goes to log.html
    Log    A warning message    level=WARN
    Log    \${dictionary}        level=INFO
    Log To Console    This prints to the terminal as the test runs
    Log Many    \${var1}    \${var2}    \${var3}
\`\`\`

| Keyword | Destination | Use |
|---------|-------------|-----|
| \`Log\` | log.html (post-run report) | Captured diagnostics, variable dumps |
| \`Log To Console\` | Terminal stdout (live) | Real-time progress during long runs |
| \`Log Many\` | log.html | Dump several values at once |

Use \`Log\` for everything that belongs in the report, and \`Log To Console\` sparingly for live feedback on long-running suites.

---

## A Complete Runnable Example

This suite ties the keywords together: variables, a native conditional, a retry, assertions, inline Python, and logging - all pure BuiltIn.

\`\`\`robot
*** Settings ***
Documentation    Demonstrates core BuiltIn keywords end to end.

*** Variables ***
\${THRESHOLD}    100

*** Test Cases ***
Process An Order
    \${total}=    Evaluate    49.99 * 3
    Set Test Variable    \${order_total}    \${total}

    IF    \${order_total} > \${THRESHOLD}
        Log    Large order: \${order_total}    level=INFO
        \${tier}=    Set Variable    premium
    ELSE
        \${tier}=    Set Variable    standard
    END

    Should Be Equal    \${tier}    premium
    Should Be Equal As Numbers    \${order_total}    149.97

    # retry a flaky readiness check
    Wait Until Keyword Succeeds    5x    1s    Order Is Ready    \${order_total}

    Log To Console    Order processed at tier \${tier}

*** Keywords ***
Order Is Ready
    [Arguments]    \${amount}
    Should Be True    \${amount} > 0
\`\`\`

Run it with \`robot order.robot\` and inspect \`log.html\` for the captured \`Log\` output and the retry timeline.

---

## Deprecated and Legacy Keywords to Recognise

You will encounter these in older suites. They still work, but new code should use the native replacements.

| Legacy keyword | Modern replacement |
|----------------|--------------------|
| \`Run Keyword If\` | Native \`IF\` / \`ELSE IF\` / \`ELSE\` |
| \`Run Keyword Unless\` | Native \`IF NOT\` |
| \`:FOR\` (old loop syntax) | Native \`FOR ... END\` |
| \`Exit For Loop If\` | Still valid, but pairs with native \`FOR\` |
| \`Run Keyword And Ignore Error\` for control flow | Native \`TRY\`/\`EXCEPT\` |

Native \`TRY\`/\`EXCEPT\`/\`FINALLY\` (added in Robot Framework 5) is now the idiomatic way to handle expected failures, replacing the older pattern of \`Run Keyword And Ignore Error\` followed by status checks.

---

## Error Handling with TRY/EXCEPT

The native \`TRY\`/\`EXCEPT\`/\`FINALLY\` blocks let you catch expected failures cleanly, with optional pattern matching on the error message and a \`FINALLY\` block that always runs. This is far more readable than the old \`Run Keyword And Ignore Error\` dance and supports proper cleanup.

\`\`\`robot
*** Test Cases ***
Handle Expected Failures
    TRY
        Risky Operation
    EXCEPT    Connection refused*    type=GLOB
        Log    Backend was down, retrying path
        Fallback Operation
    EXCEPT    AS    \${error}
        Log    Unexpected error: \${error}
        Fail    Could not recover
    FINALLY
        Log    Cleanup always runs
    END
\`\`\`

The \`EXCEPT\` clause can match a literal message, a glob (\`type=GLOB\`), or a regexp (\`type=REGEXP\`), and \`AS \${error}\` captures the message into a variable. The \`FINALLY\` block runs whether or not an exception occurred, making it the right place for teardown that must happen regardless. This structure replaces the brittle pattern of running a keyword, ignoring its error, then inspecting a status string - logic that was easy to get subtly wrong.

| Clause | Purpose |
|--------|---------|
| \`TRY\` | Wraps the code that might fail |
| \`EXCEPT    pattern\` | Handles a matching error |
| \`EXCEPT    AS \${e}\` | Captures the error message |
| \`FINALLY\` | Always runs - cleanup |

---

## Collections and Strings via BuiltIn

While dedicated \`Collections\` and \`String\` libraries exist, BuiltIn covers the common cases. \`Get Length\` works on any sequence, \`Create List\` and \`Create Dictionary\` build inline data structures, and \`Get Variable Value\` reads a variable with a default fallback.

\`\`\`robot
*** Test Cases ***
Inline Data Structures
    @{fruits}=    Create List    apple    banana    cherry
    \${len}=       Get Length     \${fruits}
    Should Be Equal As Integers    \${len}    3

    &{user}=    Create Dictionary    name=alice    role=admin
    Should Be Equal    \${user}[role]    admin

    # read a variable that may not exist, with a default
    \${maybe}=    Get Variable Value    \${UNDEFINED_VAR}    fallback
    Should Be Equal    \${maybe}    fallback
\`\`\`

\`Create List\` and \`Create Dictionary\` are invaluable for building test data inline, and \`Get Variable Value\` with a default is the clean way to handle optional configuration that may or may not have been set by a higher scope or the command line. These keywords mean you can do a surprising amount of data manipulation without importing anything beyond the always-present BuiltIn.

---

## Flow Control: Fail, Pass Execution, and Skip

BuiltIn provides explicit keywords to control a test's verdict beyond ordinary assertions. \`Fail\` aborts the current test immediately with a message you supply. \`Pass Execution\` ends the test as passed, optionally setting tags - useful when a precondition makes the rest of the test moot. \`Skip\` marks the test skipped rather than passed or failed, which is the honest verdict when an environment cannot support it.

\`\`\`robot
*** Test Cases ***
Explicit Verdicts
    \${feature_on}=    Get Variable Value    \${FEATURE_FLAG}    \${False}
    IF    not \${feature_on}
        Skip    Feature flag is off in this environment
    END

    \${role}=    Get Current User Role
    Run Keyword If    '\${role}' == 'guest'
    ...    Pass Execution    Guests have nothing to verify here    tags=guest-path

    Run Keyword If    '\${role}' == 'banned'    Fail    Banned user should never reach this screen
\`\`\`

The distinction is important for honest reporting. \`Skip\` keeps your pass rate meaningful by not counting environment-incompatible tests as passes, \`Pass Execution\` short-circuits cleanly when there is genuinely nothing left to check, and \`Fail\` gives a clear, intentional failure message rather than letting the test die on an obscure downstream assertion. Using these deliberately makes your test report tell the truth about what actually ran.

| Keyword | Verdict | Use when |
|---------|---------|----------|
| \`Fail\` | Failed | A hard, intentional failure with a clear message |
| \`Pass Execution\` | Passed | Nothing left to verify; stop cleanly |
| \`Skip\` | Skipped | Environment cannot support this test |

---

## Frequently Asked Questions

### Do I need to import the BuiltIn library in Robot Framework?

No. The BuiltIn library is loaded automatically into every suite, so every BuiltIn keyword - \`Log\`, \`Should Be Equal\`, \`Set Variable\`, \`Run Keyword If\`, and the rest - is available without any \`Library BuiltIn\` line in your Settings section. You only import other libraries like SeleniumLibrary or RequestsLibrary explicitly.

### Should I use Run Keyword If or the native IF block?

Use the native \`IF\`/\`ELSE IF\`/\`ELSE\` block in new code. It is clearer, nests cleanly, and avoids the string-based \`ELSE\` markers that make \`Run Keyword If\` error-prone. \`Run Keyword If\` still works and appears in older suites, but native \`IF\` (Robot Framework 3.1+) is the modern, recommended approach.

### What is the difference between Set Variable and Set Test Variable?

\`Set Variable\` creates a local variable scoped to the current keyword or test body. \`Set Test Variable\` widens the scope so the variable is visible throughout the rest of the current test case, including inside keywords it calls. Use the narrowest scope that works; widen only when a later step genuinely needs the value.

### How does Wait Until Keyword Succeeds work?

It retries a keyword until it passes or a limit is hit. The first argument is the retry limit (\`10x\` for attempts or \`30s\` for total time), the second is the interval between attempts (\`1s\`), then the keyword name and its arguments. If any attempt succeeds the suite continues; if all fail, the test fails with the last error. Use it for real async waits, not as a blanket retry wrapper.

### What is the difference between Log and Log To Console?

\`Log\` writes to the Robot log report (\`log.html\`) at a chosen level like INFO or WARN, which is where captured diagnostics belong. \`Log To Console\` writes directly to the terminal stdout while the test runs, useful for live progress on long suites. Use \`Log\` for the report and \`Log To Console\` sparingly for real-time feedback.

### When should I use Evaluate in Robot Framework?

Use \`Evaluate\` for short inline Python the keyword syntax makes awkward: arithmetic, string formatting, rounding, list comprehensions, or calling a standard-library function via the \`modules=\` argument. Keep expressions to a single line; if logic grows, move it into a dedicated Python keyword library rather than cramming it into \`Evaluate\`.

### How do I compare numbers instead of strings in assertions?

Use \`Should Be Equal As Numbers\` rather than \`Should Be Equal\`. By default \`Should Be Equal\` compares string representations, so \`Should Be Equal    \${1}    1.0\` fails while \`Should Be Equal As Numbers    \${1}    1.0\` passes. Similarly use \`Should Be Equal As Strings\` to force string comparison when values might be parsed as numbers.

### What is the difference between FOR and Repeat Keyword?

Use the native \`FOR\` loop when you need the iteration value or index - it iterates lists, ranges, dictionaries, and supports \`IN ENUMERATE\`. Use \`Repeat Keyword\` when you simply need to run the same keyword a fixed number of times with no loop variable, such as \`Repeat Keyword    3 times    Click Button    id=next\`.

---

## Conclusion

The BuiltIn library is the logic layer of every Robot Framework suite, and fluency with it is what separates readable, resilient tests from brittle ones. Use native \`IF\` and \`FOR\` over the legacy \`Run Keyword If\` and old loop syntax, scope variables with the narrowest \`Set\` keyword that works, reach for \`Wait Until Keyword Succeeds\` only for genuine async waits, choose the right \`Should Be\` variant for your data type, and keep \`Evaluate\` expressions short. Knowing both the modern syntax and the legacy keywords lets you write clean new tests and confidently maintain old ones.

Want your AI agent to generate idiomatic Robot Framework that uses these keywords correctly? Install Robot Framework skills from the [QA Skills directory](/skills), and explore more Robot Framework references on the [blog](/blog).
`,
};
