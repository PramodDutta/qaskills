import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Robot Framework Run Keywords: Run Keyword If, Run Keywords, and Control Flow',
  description:
    'How Run Keywords and Run Keyword If actually work in Robot Framework, the AND separator that trips everyone up, and when native IF and TRY blocks replace them entirely.',
  date: '2026-08-23',
  category: 'Reference',
  content: `
# Robot Framework Run Keywords: Run Keyword If, Run Keywords, and Control Flow

\`Run Keywords\` executes several keywords in sequence from a single call, and the keywords are separated by the literal argument \`AND\`. Without \`AND\`, every keyword after the first is silently treated as an **argument** to the first one, which is the single most common mistake with this keyword:

\`\`\`robotframework
*** Test Cases ***
Wrong
    # "Open Browser" gets three arguments; nothing else executes as a keyword.
    Run Keywords    Log    Hello    Open Browser    \${URL}    chrome

Right
    Run Keywords    Log    Hello
    ...             AND    Open Browser    \${URL}    chrome
\`\`\`

\`Run Keyword If\` runs a keyword only when a Python expression is true, with optional \`ELSE IF\` and \`ELSE\` branches:

\`\`\`robotframework
Run Keyword If    \${count} > 0    Log    Found \${count} items
...               ELSE IF    \${count} == 0    Log    Empty result
...               ELSE    Fail    Negative count is impossible
\`\`\`

Both live in the BuiltIn library, so they are available without importing anything. And both are now largely superseded: modern Robot Framework has native \`IF\`, \`ELSE IF\`, \`ELSE\`, \`FOR\`, \`WHILE\`, \`TRY\`, and \`BREAK\`, and native syntax is easier to read, easier to debug, and does not require escaping. Use \`Run Keyword If\` when you need conditional execution inside a keyword argument or a template; use native \`IF\` everywhere else.

## The AND separator, precisely

\`AND\` must be its own cell, in uppercase. These fail in different ways:

| Written as | Result |
|---|---|
| \`AND\` in its own cell | Correct separator |
| \`and\` lowercase | Treated as a plain argument, not a separator |
| \`AND\` appended to the previous argument | Part of that argument's value |
| Omitted entirely | Everything becomes arguments to the first keyword |

The failure is quiet. Robot does not warn that you passed six arguments to a keyword expecting two unless that keyword itself complains, so a test can pass while doing a fraction of what it claims.

If a keyword legitimately needs the string \`AND\` as an argument, escape it:

\`\`\`robotframework
Run Keywords    Log    Salt \\AND Pepper
...             AND    Log    Second keyword runs normally
\`\`\`

## Passing arguments to each keyword

\`Run Keywords\` accepts arguments for each keyword, which is what makes the \`AND\` separator necessary in the first place:

\`\`\`robotframework
*** Keywords ***
Reset Application State
    Run Keywords    Delete All Sessions
    ...             AND    Clear Database Table    orders
    ...             AND    Clear Database Table    order_items
    ...             AND    Log    State reset complete    level=DEBUG
\`\`\`

This is the pattern where \`Run Keywords\` genuinely earns its place: a suite teardown that must attempt every step. Note the behavior that makes it useful there, covered below.

## Failure behavior, and why it matters in teardown

\`Run Keywords\` stops at the first failure in a test body. In a **teardown**, Robot Framework continues executing the remaining keywords and reports all failures at the end. That difference is the reason \`Run Keywords\` remains common in teardowns even in codebases that otherwise use native syntax:

\`\`\`robotframework
*** Test Cases ***
Checkout Completes
    [Teardown]    Run Keywords    Close Browser
    ...           AND    Delete Test Order    \${ORDER_ID}
    ...           AND    Clear Session Cache
    Complete Checkout    \${ORDER_ID}
\`\`\`

If \`Close Browser\` fails because the browser already crashed, the order is still deleted and the cache is still cleared. Written as three separate teardown steps in a user keyword, the first failure would abandon the rest and leak state into the next test.

| Context | First keyword fails | Remaining keywords |
|---|---|---|
| Test body | Test fails | Skipped |
| Teardown | Recorded | Still executed |
| Suite teardown | Recorded | Still executed |

## Run Keyword If and the expression it evaluates

The condition is evaluated as a Python expression after variable substitution. Two consequences catch people out.

**Variables are substituted textually before evaluation.** A string variable needs quotes in the expression, or Python sees a bare name:

\`\`\`robotframework
# Fails: Python evaluates  active == success  as a NameError.
Run Keyword If    \${status} == success    Log    Fine

# Correct: quote the substituted value.
Run Keyword If    '\${status}' == 'success'    Log    Fine
\`\`\`

**Robot's own truthiness differs from Python's for some strings.** The safest habit is to write explicit comparisons rather than relying on a bare variable:

\`\`\`robotframework
# Ambiguous
Run Keyword If    \${flag}    Do Thing

# Explicit and readable
Run Keyword If    \${flag} == True    Do Thing
\`\`\`

The native \`IF\` block uses the same expression rules, so this is not a reason to prefer one over the other; it is a reason to be explicit in both.

## Native syntax, which you should usually prefer

The same logic written both ways:

\`\`\`robotframework
*** Test Cases ***
Old Style
    Run Keyword If    \${count} > 10    Handle Large Result    \${count}
    ...               ELSE IF    \${count} > 0    Handle Small Result    \${count}
    ...               ELSE    Handle Empty Result

New Style
    IF    \${count} > 10
        Handle Large Result    \${count}
    ELSE IF    \${count} > 0
        Handle Small Result    \${count}
    ELSE
        Handle Empty Result
    END
\`\`\`

The native version wins on every axis that matters in a real suite:

| Aspect | \`Run Keyword If\` | Native \`IF\` |
|---|---|---|
| Multiple keywords per branch | Needs nested \`Run Keywords\` | Just write them |
| Readability at depth | Poor, continuation lines | Clear block structure |
| Editor support | Limited | Full syntax awareness |
| Log output | One flat keyword entry | Branch structure visible |
| Assigning variables in a branch | Awkward | Direct |

Variable assignment inside a branch is the clearest example of the gap:

\`\`\`robotframework
IF    '\${env}' == 'staging'
    \${base_url}=    Set Variable    https://staging.example.com
    \${timeout}=     Set Variable    30s
ELSE
    \${base_url}=    Set Variable    https://example.com
    \${timeout}=     Set Variable    10s
END
\`\`\`

Doing that with \`Run Keyword If\` requires \`Set Variable If\` or a helper keyword, and the result is harder to follow than the branch it replaces.

## Where Run Keyword If is still the right tool

Three cases keep it alive.

**Inside a keyword argument**, where a block cannot go:

\`\`\`robotframework
Wait Until Keyword Succeeds    3x    2s
...    Run Keyword If    \${retry_enabled}    Fetch Report    \${report_id}
\`\`\`

**With test templates**, where the body is a single keyword call per row:

\`\`\`robotframework
*** Test Cases ***    LOGIN         EXPECT_ERROR
Valid credentials     good@x.com    \${False}
Locked account        locked@x.com  \${True}

*** Keywords ***
Attempt Login
    [Arguments]    \${login}    \${expect_error}
    Submit Login    \${login}
    Run Keyword If    \${expect_error}    Page Should Contain    Account locked
\`\`\`

**Conditional teardowns**, paired with \`Run Keywords\`:

\`\`\`robotframework
[Teardown]    Run Keywords    Run Keyword If Test Failed    Capture Page Screenshot
...           AND    Close Browser
\`\`\`

\`Run Keyword If Test Failed\` is a distinct BuiltIn keyword and only works in a teardown; calling it from a test body raises an error because the test status is not yet known.

## The related conditional keywords

| Keyword | Use |
|---|---|
| \`Run Keyword If Test Failed\` | Teardown only, runs on failure |
| \`Run Keyword If Test Passed\` | Teardown only, runs on success |
| \`Run Keyword If Timeout Occurred\` | Teardown only |
| \`Run Keyword And Ignore Error\` | Returns status and value, never fails |
| \`Run Keyword And Return Status\` | Returns \`True\` or \`False\` |
| \`Run Keyword And Expect Error\` | Fails unless the expected error occurs |
| \`Set Variable If\` | Conditional value rather than conditional execution |

\`Run Keyword And Return Status\` is the one worth knowing, because it converts a failure into a boolean you can branch on:

\`\`\`robotframework
\${present}=    Run Keyword And Return Status    Page Should Contain    Welcome back
IF    \${present}
    Log    Returning user
ELSE
    Complete Onboarding
END
\`\`\`

Use it deliberately and sparingly. Every call swallows a failure, and a suite built on swallowed failures reports success while testing nothing. If you find several of these in one file, the underlying problem is usually an unstable application state that deserves fixing rather than tolerating.

## Running keywords in a loop

A common need is applying the same keyword across a list. \`Run Keywords\` is the wrong tool here; a \`FOR\` loop is the right one, and it reads far better:

\`\`\`robotframework
*** Variables ***
@{TABLES}    orders    order_items    payments    audit_log

*** Keywords ***
Truncate All Test Tables
    FOR    \${table}    IN    @{TABLES}
        Clear Database Table    \${table}
    END
\`\`\`

Written with \`Run Keywords\`, that becomes four hand-maintained lines that drift out of sync with the variable list. The loop stays correct when the list changes.

When each iteration must continue past a failure, combine the loop with an explicit error-tolerant call rather than relying on teardown semantics:

\`\`\`robotframework
Truncate All Test Tables Tolerantly
    FOR    \${table}    IN    @{TABLES}
        \${ok}=    Run Keyword And Return Status    Clear Database Table    \${table}
        Run Keyword If    not \${ok}    Log    Could not clear \${table}    level=WARN
    END
\`\`\`

This is one of the few places \`Run Keyword If\` still reads well inside a loop body, because the alternative block form adds three lines for a single conditional log.

## TRY and EXCEPT instead of error-swallowing keywords

Modern Robot Framework has native \`TRY\`, \`EXCEPT\`, \`ELSE\`, and \`FINALLY\`, which replaces most uses of \`Run Keyword And Ignore Error\`:

\`\`\`robotframework
*** Test Cases ***
Payment Falls Back To Secondary Gateway
    TRY
        Charge Card    \${CARD}    \${AMOUNT}    gateway=primary
    EXCEPT    Gateway timeout*    type=GLOB
        Log    Primary gateway timed out, retrying on secondary    level=WARN
        Charge Card    \${CARD}    \${AMOUNT}    gateway=secondary
    ELSE
        Log    Primary gateway succeeded
    FINALLY
        Capture Gateway Metrics
    END
\`\`\`

The advantage over \`Run Keyword And Ignore Error\` is that you catch a **specific** error rather than all of them. Blanket error swallowing is how a suite ends up green while the application is broken, because a genuine regression produces an error the test was never meant to tolerate and the test absorbs it anyway.

| Old pattern | Native replacement |
|---|---|
| \`Run Keyword And Ignore Error\` | \`TRY\` / \`EXCEPT\` |
| \`Run Keyword And Return Status\` + \`Run Keyword If\` | \`TRY\` / \`EXCEPT\` / \`ELSE\` |
| \`Run Keyword And Expect Error\` | Still fine, it asserts rather than swallows |
| \`Run Keywords\` in a test body | A named user keyword |
| \`Run Keywords\` in a teardown | Keep it |

\`Run Keyword And Expect Error\` is the exception worth keeping in tests, because it asserts that a specific failure happens. That is a real check, not error tolerance.

## A realistic failure: the teardown that stopped cleaning up

Symptom: tests began leaking database rows into each other, but only when a test failed. Every teardown looked correct.

Diagnosis: a refactor had replaced

\`\`\`robotframework
[Teardown]    Run Keywords    Close Browser    AND    Delete Test Order    \${ORDER_ID}
\`\`\`

with a user keyword containing the two steps in sequence. In a user keyword, the first failing step abandons the rest, so whenever \`Close Browser\` failed (which happened exactly when the test had already failed and left the browser in a bad state), the order was never deleted. The continue-on-failure behavior that made the original work is a property of \`Run Keywords\` **in a teardown**, not of teardowns in general.

The fix, keeping the user keyword but restoring the semantics:

\`\`\`robotframework
*** Keywords ***
Clean Up Test
    [Arguments]    \${order_id}
    Run Keywords    Close Browser
    ...             AND    Delete Test Order    \${order_id}
\`\`\`

## Debugging when a Run Keywords chain misbehaves

Start by reading the log rather than the source. Robot logs \`Run Keywords\` as a single entry with each executed keyword nested beneath it. If the nesting shows one child where you expected four, your \`AND\` separators are not being recognized, and the cause is almost always casing or a missing cell.

\`\`\`bash
robot --loglevel DEBUG --outputdir results tests/checkout.robot
\`\`\`

At \`DEBUG\` level the log shows the arguments each keyword actually received, which makes the "everything became an argument" failure obvious immediately.

For a broader reference on what BuiltIn provides beyond these, see the [Robot Framework BuiltIn keywords reference](/blog/robot-framework-builtin-keywords-reference). If you are structuring a suite around reusable keywords rather than inline control flow, the [keyword-driven testing guide](/blog/robot-framework-keyword-driven-testing-guide) covers the design side.

Ready-made QA skills install from qaskills.sh with the qaskills CLI, including Robot Framework skills that scaffold suites using native control flow by default.

## What people get wrong

The most common structural mistake is reaching for \`Run Keyword If\` out of habit in a codebase that supports native \`IF\`. The result is suites where a three-branch condition sprawls across a dozen continuation lines and nobody can tell which arguments belong to which branch. Native blocks were added precisely because that pattern did not scale.

The second is treating \`Run Keywords\` as a general sequencing tool. If you are chaining five keywords in a test body with \`AND\`, you have written a user keyword with worse syntax. Extract it, give it a name that describes the intent, and call that instead. Reserve \`Run Keywords\` for teardowns, where its continue-on-failure behavior is doing real work that nothing else provides.

## Migrating a legacy suite off Run Keyword If

Large Robot suites accumulate hundreds of these calls. A mechanical migration is safe if you do it in the right order.

**Step 1: find them.**

\`\`\`bash
grep -rn "Run Keyword If\|Run Keywords" tests/ resources/ \
  | grep -v "Run Keyword If Test Failed" \
  | grep -v "Run Keyword If Test Passed" \
  | wc -l
\`\`\`

Excluding the teardown-only variants matters, because those are not migration candidates and counting them inflates the work.

**Step 2: classify before converting.** Not every occurrence should move:

| Location | Action |
|---|---|
| Test body, single condition | Convert to native \`IF\` |
| Test body, chained \`ELSE IF\` | Convert, highest value |
| Teardown with \`Run Keywords\` | Leave alone |
| Inside another keyword's arguments | Leave alone |
| Test template row | Leave alone |
| \`Run Keyword If Test Failed\` | Leave alone |

**Step 3: convert one file, run it, diff the log.** The output XML records every keyword executed, so a converted file should produce the same keyword sequence for the same inputs. If the sequence changes, the conversion changed behavior.

\`\`\`bash
robot --outputdir before tests/checkout.robot
# apply the conversion, then
robot --outputdir after tests/checkout.robot
\`\`\`

Compare the keyword names and statuses between the two \`output.xml\` files. A pure syntax migration leaves them identical.

**Step 4: keep the version floor in mind.** Native \`IF\` and \`TRY\` require a recent enough Robot Framework. Check before you start, because a half-migrated suite that will not parse on the pinned version is worse than one that was never touched:

\`\`\`bash
robot --version
\`\`\`

## Style rules that keep control flow readable

A few conventions do most of the work in suites that stay maintainable:

1. **One condition per keyword.** If a user keyword contains three unrelated \`IF\` blocks, it is doing three jobs and should be three keywords.
2. **Name the condition when it is not obvious.** \`\${is_premium}= Evaluate ...\` followed by \`IF \${is_premium}\` reads better than an inline expression with three operators.
3. **Never nest more than two levels.** Deeper nesting in a test almost always means logic that belongs in the application or in a Python library, not in the suite.
4. **Prefer data-driven tests over branching.** Two rows in a template beat one test with an \`IF\` choosing between two assertions, because each row reports its own pass or fail.
5. **Keep assertions out of branches where possible.** A test whose assertion depends on a runtime condition can pass without ever asserting anything, which is the quietest way for coverage to disappear.

That last point deserves an example, because it is subtle:

\`\`\`robotframework
# Risky: if the banner never appears, nothing is asserted and the test passes.
IF    \${banner_shown}
    Page Should Contain    Welcome back
END

# Better: assert the condition itself, so both outcomes are checked.
IF    \${returning_user}
    Page Should Contain    Welcome back
ELSE
    Page Should Contain    Create your account
END
\`\`\`

The first version is a test that can silently stop testing. The second always makes a claim.

## Frequently Asked Questions

### Why does Run Keywords only execute the first keyword?

Because the \`AND\` separators are missing or malformed, so everything after the first keyword is being passed to it as arguments. \`AND\` must appear in its own cell and in uppercase; lowercase \`and\` is treated as an ordinary argument. Robot Framework does not warn about this, so the test can pass while doing almost nothing. Confirm it by running with \`--loglevel DEBUG\` and looking at the nesting under the \`Run Keywords\` entry in the log: one child instead of several means the separators are not being recognized.

### Should I still use Run Keyword If in new tests?

Usually not. Native \`IF\`, \`ELSE IF\`, \`ELSE\`, and \`END\` are clearer, support multiple keywords per branch without nesting, allow direct variable assignment, and produce better log structure. Keep \`Run Keyword If\` for the places a block cannot go: inside another keyword's arguments, in test template rows, and alongside \`Run Keywords\` in teardowns. Those are genuine constraints rather than style preferences, and in every other position the native block is easier to read and to debug.

### Does Run Keywords stop when a keyword fails?

In a test body, yes: execution stops at the first failure and the rest are skipped. In a teardown, no: Robot Framework continues through the remaining keywords and reports all failures together. That difference is the main reason to keep using \`Run Keywords\` in teardowns, because it guarantees cleanup steps still run after an earlier one fails. Moving the same steps into a user keyword loses that behavior, since a user keyword abandons the remaining steps on the first failure.

### How do I compare a string variable in a condition?

Quote it. The condition is a Python expression evaluated after Robot substitutes the variable's value textually, so \`\${status} == success\` becomes \`active == success\` and raises a \`NameError\` for undefined names. Write \`'\${status}' == 'success'\` so both sides are string literals after substitution. The same rule applies to native \`IF\` conditions, since they use identical evaluation. For numeric comparisons no quotes are needed, and adding them turns a numeric test into a string comparison, which fails in surprising ways for values like \`10\` and \`9\`.
`,
};
