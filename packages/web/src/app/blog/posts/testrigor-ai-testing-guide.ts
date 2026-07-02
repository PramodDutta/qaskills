import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'testRigor AI Testing Tutorial: The Complete 2026 Guide',
  description:
    'Learn testRigor AI testing with plain-English test steps, self-healing locators, data-driven tables, CI/CD YAML, and a real comparison to Playwright and Selenium.',
  date: '2026-07-02',
  category: 'Guide',
  content: `
# testRigor AI Testing Tutorial: The Complete 2026 Guide

testRigor is one of the most talked-about codeless test automation platforms of 2026, and for a specific reason: it lets you write end-to-end tests in plain English instead of code. Where a Selenium or Playwright test forces you to reason about CSS selectors, XPath, explicit waits, and shadow DOM, a testRigor test reads almost like a manual test case a business analyst would hand you. That single design decision changes who can author tests, how fast a suite gets built, and how much maintenance it demands when the application under test keeps shifting.

This guide is a hands-on, example-driven tutorial for engineers and QA leads evaluating or already using testRigor. You will see how the plain-English command grammar actually works, how testRigor's AI locates elements without brittle selectors, how to drive data-driven and reusable tests, how to handle logins, two-factor codes, and email verification, and how to wire the whole thing into a CI/CD pipeline with YAML. Along the way you will get concrete comparison tables so you can decide honestly whether testRigor fits your team or whether a code-first tool serves you better.

The promise of natural-language testing is real, but it is not magic. Tests still need clear intent, stable test data, and a review discipline, and AI element location can occasionally pick the wrong control on a cluttered screen. By the end of this tutorial you will know both the strengths that make testRigor genuinely productive and the failure modes to watch for. If you want the broader context of where AI-driven testing is heading, our guide on [AI test automation tools for 2026](/blog/ai-test-automation-tools-2026) sets the stage, and you can browse ready-to-use automation skills in the [QA skills directory](/skills).

## What testRigor Actually Is

testRigor is a cloud-based, AI-powered test automation platform built around a controlled natural-language grammar. You describe user actions and expectations in English sentences, and testRigor's engine translates them into browser and mobile interactions. It supports web, native mobile (iOS and Android), desktop, and API testing from the same test syntax, which is unusual: most tools specialize in one surface.

The core value proposition is maintainability. Traditional automated suites break constantly because they depend on implementation details, DOM structure, element IDs, and class names, that developers change without telling QA. testRigor tests reference elements the way a human does, "the Submit button", "the email field", "the third row of the table", so a redesign that keeps the visible behavior intact usually keeps the tests passing.

testRigor is a commercial SaaS product with per-seat and per-test-run pricing tiers rather than an open-source library you install. That is an important tradeoff to internalize early: you are buying a managed platform and its AI, not a framework you fully control. For teams that value time-to-coverage over infrastructure ownership, that is exactly the point.

## Writing Your First Plain-English Test

A testRigor test is a sequence of plain-English steps. Each line is a command the engine understands. Here is a complete login-and-verify test written the testRigor way:

\`\`\`
login
click "Sign In"
enter "qa-user@example.com" into "Email"
enter "Sup3rSecret!" into "Password"
click "Log In"
check that page contains "Welcome back"
check that page contains "Dashboard"
\`\`\`

Notice what is absent: no selectors, no \`page.locator()\`, no waits. testRigor resolves "Email" and "Password" against visible labels, placeholders, and nearby text. The \`check that page contains\` assertion waits automatically until the text appears or a timeout is reached, so you rarely write explicit synchronization.

You can be more precise when a screen has ambiguity. Positional and relational phrasing disambiguates elements:

\`\`\`
click "Edit" below "Billing Address"
click "Delete" to the right of "Old Invoice"
enter "500" into the "Amount" field roughly below "Line Item 2"
\`\`\`

These relational commands are the heart of testRigor's resilience. Because they describe layout relationships a user perceives, they survive class-name churn and DOM restructuring that would shatter an XPath.

## How testRigor's AI Locates Elements

Under the hood testRigor combines several signals to find the element you named: visible text, ARIA labels, associated \`<label>\` tags, placeholder text, proximity to other elements, and a computer-vision layer that reads the rendered page the way a person sees it. When you write \`click "Submit"\`, the engine ranks all candidate elements by how well they match that description and picks the best one.

This is functionally a self-healing locator strategy. If a developer renames a button's CSS class or swaps a \`<button>\` for a styled \`<div>\`, the visible text "Submit" is unchanged, so the test keeps working. This is the same problem that code-first frameworks solve with role-based locators and auto-healing engines; we cover the code-first version in [Playwright auto-healing locators](/blog/playwright-auto-healing-locators). testRigor pushes that idea all the way to the surface so you never write a selector at all.

The tradeoff is determinism. On a cluttered screen with three buttons that say "Save", the AI must guess, and it can guess wrong. The fix is to add disambiguating context, and to keep an eye on runs where the engine reports a low-confidence match.

| Location signal | What it reads | Breaks when |
|---|---|---|
| Visible text | Rendered label on the control | The user-facing copy changes |
| ARIA / label | Accessibility name of the element | Accessibility markup is removed |
| Proximity | Nearby text and layout position | The layout is heavily rearranged |
| Computer vision | The rendered pixels of the page | The control is visually hidden |

## Data-Driven Testing with Tables

Real suites need to run the same flow against many inputs. testRigor supports data-driven testing through table-based data sets that you reference by column name. Define a data set, then loop the test across its rows:

\`\`\`
# Data set named "checkout_cases" with columns: card, expected
# Row 1: 4242424242424242 | Payment successful
# Row 2: 4000000000000002 | Card declined

for each row in "checkout_cases"
enter stored value "card" into "Card Number"
click "Pay Now"
check that page contains stored value "expected"
\`\`\`

Stored values are testRigor's variables. You can capture a value from the page and reuse it later, which is essential for flows that generate an order ID or confirmation number:

\`\`\`
grab value from "Order Number" and save it as "orderId"
click "View Orders"
check that page contains stored value "orderId"
\`\`\`

This gives you the parameterization power of a code-based framework's \`test.each\` without writing loops in a programming language. For large matrices you connect testRigor to a CSV or database source so the test data lives outside the test definition.

## Reusable Steps and Custom Commands

As a suite grows, repetition creeps in. testRigor lets you define reusable rules, named sequences of steps you call like a function. Define once, call everywhere:

\`\`\`
# Define a reusable rule
after clicking "Add to Cart" then:
check that page contains "Added to cart"
click "Continue Shopping"

# Define a named subprocedure
create rule "loginAsAdmin" as:
enter "admin@example.com" into "Email"
enter stored value "adminPassword" into "Password"
click "Log In"
check that page contains "Admin Panel"
\`\`\`

Then a test simply invokes the rule:

\`\`\`
loginAsAdmin
click "User Management"
check that page contains "Active Users"
\`\`\`

This mirrors the Page Object pattern from code-first frameworks: it keeps intent in the test and mechanics in one place, so a UI change means editing a single rule instead of forty tests. Treating reusable rules as your equivalent of page objects is the single most important discipline for keeping a testRigor suite maintainable at scale.

## Handling Login, 2FA, and Email Verification

Authentication is where most automation projects stall, and testRigor has first-class support for the hard cases. Basic login is a few plain-English lines. The interesting part is time-based one-time passwords and email or SMS verification, which testRigor can read automatically.

For a TOTP-based two-factor login, you provide the secret and testRigor generates the current code:

\`\`\`
enter "user@example.com" into "Email"
enter stored value "password" into "Password"
click "Continue"
enter stored value from 2fa "MY_2FA_SECRET" into "Verification Code"
click "Verify"
check that page contains "Dashboard"
\`\`\`

For email verification, testRigor can log into a mailbox, read the latest message, and extract a link or code:

\`\`\`
click "Send Verification Email"
check email and click link in email
check that page contains "Email verified"
\`\`\`

This built-in handling of email and 2FA removes the single most common reason engineers give up on end-to-end automation. If you are comparing how different platforms tackle this, our overview of [AI test automation tools for 2026](/blog/ai-test-automation-tools-2026) covers the landscape of managed verification support.

## Cross-Browser and Mobile Testing

testRigor runs the same test across Chrome, Firefox, Safari, and Edge without change, and the same natural-language test can target native mobile apps. You specify the target environment in the test suite settings or override it per run. Because the test references user-facing elements, not DOM internals, the identical steps work on desktop web and mobile web with minimal adjustment.

For native mobile, testRigor drives the app through its own device cloud or a connected device farm, and the same commands, \`click "Buy"\`, \`enter "..." into "Search"\`, apply. Mobile-specific gestures are also expressible:

\`\`\`
swipe up
scroll down to "Add to Wishlist"
tap "Buy Now"
check that page contains "Order Confirmed"
\`\`\`

| Surface | Supported | testRigor approach |
|---|---|---|
| Web (all major browsers) | Yes | Same test, choose browser at run time |
| Native iOS / Android | Yes | Device cloud, same command grammar |
| Desktop apps | Yes | Vision-based control location |
| API testing | Yes | \`call\` and JSON assertion commands |

## Integrating testRigor into CI/CD

You can trigger testRigor suites from any CI system through its REST API or CLI, then poll for results and fail the build on regressions. Here is a GitHub Actions workflow that kicks off a suite on every pull request:

\`\`\`yaml
name: testRigor E2E
on:
  pull_request:
    branches: [main]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger testRigor suite
        run: |
          curl -X POST \\
            "https://api.testrigor.com/api/v1/apps/\${{ secrets.TESTRIGOR_APP_ID }}/retest" \\
            -H "auth-token: \${{ secrets.TESTRIGOR_AUTH_TOKEN }}" \\
            -H "Content-Type: application/json" \\
            -d '{"branch":"'"\$GITHUB_HEAD_REF"'","commit":"'"\$GITHUB_SHA"'"}'
\`\`\`

testRigor blocks the response until the run finishes and returns a non-zero exit code on failure, so the job goes red when a test breaks. For GitLab CI the shape is the same:

\`\`\`yaml
testrigor:
  stage: test
  image: curlimages/curl:latest
  script:
    - |
      curl -X POST \\
        "https://api.testrigor.com/api/v1/apps/\$TESTRIGOR_APP_ID/retest" \\
        -H "auth-token: \$TESTRIGOR_AUTH_TOKEN" \\
        -H "Content-Type: application/json" \\
        -d "{\\"branch\\":\\"\$CI_COMMIT_REF_NAME\\"}"
  only:
    - merge_requests
\`\`\`

Store \`TESTRIGOR_APP_ID\` and \`TESTRIGOR_AUTH_TOKEN\` as protected CI secrets, never in the repository. Because testRigor executes in its own cloud, your CI runner stays lightweight; it only needs to make an authenticated HTTP call and wait.

## testRigor vs Playwright vs Selenium

The honest question every team asks is whether to adopt a codeless platform or a code-first framework. There is no universal answer, so weigh the tradeoffs against your team's makeup.

| Dimension | testRigor | Playwright | Selenium |
|---|---|---|---|
| Test authoring | Plain English | TypeScript / JS / Python | Multiple languages |
| Who can write tests | QA, BA, non-coders | Developers, SDETs | Developers, SDETs |
| Locator strategy | AI, self-healing | Role-based, code | CSS / XPath, manual |
| Maintenance burden | Low | Medium | High |
| Infrastructure | Managed cloud | Self-hosted | Self-hosted |
| Cost model | Commercial SaaS | Open source | Open source |
| Full control / extensibility | Limited | High | High |

testRigor wins when time-to-coverage, non-coder participation, and low maintenance matter most, and when a managed cloud is acceptable. Code-first tools win when you need deep control, custom logic, offline execution, or you already have a strong engineering team that prefers to own the stack. Many organizations run both: testRigor for broad business-flow coverage authored by QA, and Playwright for developer-owned component and integration tests. For the developer side of that split, see our [AI test generation with Playwright guide](/blog/ai-test-generation-playwright-2026).

## Debugging Failed testRigor Runs

When a test fails, testRigor gives you a step-by-step execution log with a screenshot captured at every step, the exact command that failed, and the reason the engine could not proceed. The most common failure categories are an ambiguous element the AI could not resolve, an assertion whose expected text never appeared, and a timing issue where the page took longer than the timeout to reach the expected state. Because each step is a plain-English sentence, the log reads like a narrative of what the test tried to do, which makes root-causing far faster than sifting through a stack trace.

For ambiguous-element failures, open the screenshot at the failing step and add disambiguating context to the command, a section anchor, a positional phrase, or the surrounding label, so the AI has an unambiguous target. For assertion failures, confirm whether the app actually changed or whether the expected copy was reworded; testRigor makes real regressions and stale expectations look similar in the log, so read the screenshot carefully. For timing failures, prefer a specific \`check that page contains\` assertion over a blind wait, because the assertion polls until the condition is true and fails fast with a clear message. A short habit of reproducing the failing step in isolation, rather than rerunning the whole suite, keeps your debugging loop tight and your suite trustworthy over the long term.

## Best Practices for Reliable testRigor Suites

A few disciplines separate a testRigor suite that pays for itself from one that becomes flaky noise. First, write one intent per test. A test that logs in, edits a profile, and checks out is hard to diagnose when it fails; three focused tests tell you exactly what broke. Second, always disambiguate when a screen has repeated labels, use "below", "to the right of", and section context so the AI never has to guess. Third, isolate test data. Each run should create or reset the data it needs rather than depending on state left by a previous run, because shared mutable data is the number one cause of intermittent failures.

Fourth, centralize repeated flows in reusable rules and treat those rules like page objects, one place to edit when the UI changes. Fifth, review low-confidence matches. testRigor surfaces when it was uncertain about an element; treat those warnings as tech debt and add disambiguation before they turn into false passes. Finally, keep tests independent and runnable in any order so you can parallelize freely in CI. These practices apply to any AI-driven suite; our piece on [self-healing test maintenance strategies](/blog/ai-test-maintenance-self-healing-strategies) goes deeper on keeping automated coverage stable over time.

## Frequently Asked Questions

### What is testRigor and how does it work?

testRigor is a cloud-based, AI-powered test automation platform that lets you write end-to-end tests in plain English instead of code. You describe user actions like "click Sign In" and expectations like "check that page contains Welcome". Its AI engine locates elements using visible text, accessibility labels, proximity, and computer vision, then executes across web, mobile, and desktop.

### Is testRigor better than Selenium for automation?

It depends on your team. testRigor is better when you want low-maintenance tests authored by non-coders and fast time-to-coverage on a managed cloud. Selenium is better when you need full control, custom logic, offline execution, and no per-run cost. Selenium's CSS and XPath locators break more often, while testRigor's AI location is more resilient but less deterministic.

### Do I need to know how to code to use testRigor?

No. The primary appeal of testRigor is that tests are written in a controlled natural-language grammar, so QA analysts, business analysts, and manual testers can author full automation without programming. Advanced features like API assertions and reusable rules add power, but you never write CSS selectors, XPath, or a programming language to build working tests.

### How does testRigor handle two-factor authentication?

testRigor has built-in support for time-based one-time passwords and email or SMS verification. For TOTP you provide the 2FA secret and testRigor generates the current code with a command like "enter stored value from 2fa". For email verification it can log into a mailbox, read the latest message, and click the verification link automatically, removing a common automation blocker.

### Can testRigor tests run in a CI/CD pipeline?

Yes. testRigor exposes a REST API and CLI you trigger from GitHub Actions, GitLab CI, Jenkins, or any CI system. A pipeline step makes an authenticated HTTP call to start a suite, waits for the run to finish, and receives a non-zero exit code on failure so the build goes red. Because execution happens in testRigor's cloud, CI runners stay lightweight.

### How does testRigor reduce test maintenance?

testRigor tests reference elements the way a human perceives them, by visible text, position, and accessibility name, rather than by DOM internals like CSS classes or XPath. When developers restructure markup or rename classes without changing visible behavior, the tests keep passing. This self-healing AI location dramatically cuts the constant selector-fixing that plagues code-first suites.

### Is testRigor free or paid?

testRigor is a commercial SaaS product with paid subscription tiers based on seats and test runs, not an open-source library. It offers trial access for evaluation. Unlike free frameworks such as Selenium or Playwright, you are paying for a managed platform, its AI element location, cloud execution, and built-in verification handling rather than self-hosting an open-source stack.

### What kinds of applications can testRigor test?

testRigor tests web applications across Chrome, Firefox, Safari, and Edge, native iOS and Android mobile apps, desktop applications, and APIs, all using the same plain-English command grammar. This cross-surface support is unusual; most tools specialize in a single environment. The same test intent can often be reused across web and mobile with only minor adjustments.

## Conclusion

testRigor represents a genuine shift in how test automation gets authored: from selector-heavy code that only engineers can maintain to plain-English intent that anyone on a QA team can write and read. Its AI-driven element location, self-healing behavior, built-in 2FA and email verification, and cross-surface support solve the exact pain points that cause traditional suites to rot. The tradeoffs are real, it is a commercial managed platform with less low-level control than a code-first framework, but for teams that prioritize coverage, maintainability, and non-coder participation, that tradeoff pays off quickly.

The winning teams pair the right tool with the right discipline: one intent per test, disambiguated element references, isolated data, and reusable rules that act as page objects. Do that, and testRigor becomes a durable part of your quality pipeline rather than another flaky suite.

Ready to build a resilient, low-maintenance automation practice? Explore hands-on automation and AI-testing skills, including natural-language testing, self-healing locators, and CI integration, in the [QA skills directory](/skills) and start shipping better tests today.
`,
};
