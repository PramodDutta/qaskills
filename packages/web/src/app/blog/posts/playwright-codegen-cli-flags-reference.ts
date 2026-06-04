import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Codegen CLI Flags: The Complete Reference (2026)',
  description:
    'Every Playwright codegen CLI flag explained: --target, -o/--output, --save-trace, --save-storage, --load-storage, --device, --color-scheme, --viewport-size.',
  date: '2026-06-03',
  category: 'Reference',
  content: `
# Playwright Codegen CLI Flags Complete Reference

\`playwright codegen\` is the fastest way to bootstrap a Playwright test. You launch it, click around a real website, and Playwright writes the corresponding test code in real time -- choosing resilient locators, inserting auto-waiting actions, and emitting clean, idiomatic source. But the bare \`npx playwright codegen <url>\` invocation only scratches the surface. The codegen recorder is controlled by a rich set of command-line flags that decide which language it emits, where the code is written, whether it records a trace, which authenticated state it loads, what device it emulates, and which color scheme it forces. Knowing those flags turns codegen from a toy into a serious productivity tool.

This is a complete, runnable reference for every meaningful \`playwright codegen\` flag in 2026. We will cover \`--target\` for language and framework selection, \`-o/--output\` for writing straight to a file, \`--save-storage\` and \`--load-storage\` for capturing and reusing login state, \`--save-trace\` for recording a debuggable trace while you record, and the emulation flags \`--device\`, \`--viewport-size\`, \`--color-scheme\`, \`--geolocation\`, \`--lang\`, and \`--timezone\`. We also cover practical recipes -- recording into an already-authenticated session, generating a Python pytest file, emulating an iPhone in dark mode -- plus a full flag table you can keep next to your terminal. Every command here runs against a real Playwright install (\`npm init playwright@latest\` or \`pip install playwright\`). If you want recorded tests that already follow best practices, pair this with the [playwright-codegen skill](/skills) on QASkills. Let's start with the basics.

## The Basic Invocation

At its simplest, codegen takes a URL, opens a browser plus a recorder window, and emits TypeScript as you interact:

\`\`\`bash
# Launch the recorder against a URL (TypeScript by default)
npx playwright codegen https://practice.qaskills.sh

# You can also start with no URL and navigate manually
npx playwright codegen
\`\`\`

Two windows appear: the browser you drive, and the Playwright Inspector showing generated code live. Every click, fill, and navigation appends a line. The recorder is smart about locators -- it prefers \`getByRole\`, \`getByLabel\`, and \`getByText\` over brittle CSS, and inserts \`expect\` assertions when you use the assertion toolbar. The flags below shape what that recorder produces.

## --target: Choose Language and Framework

The single most important flag is \`--target\`, which selects the output language and test runner. By default codegen emits \`playwright-test\` (TypeScript with the Playwright Test runner). Common targets:

\`\`\`bash
# TypeScript with the Playwright Test runner (default)
npx playwright codegen --target=playwright-test https://practice.qaskills.sh

# Plain JavaScript library style (no test runner)
npx playwright codegen --target=javascript https://practice.qaskills.sh

# Python with pytest
npx playwright codegen --target=python-pytest https://practice.qaskills.sh

# Synchronous Python library style
npx playwright codegen --target=python https://practice.qaskills.sh

# Async Python
npx playwright codegen --target=python-async https://practice.qaskills.sh

# Java (JUnit)
npx playwright codegen --target=java https://practice.qaskills.sh

# C# (.NET, NUnit)
npx playwright codegen --target=csharp https://practice.qaskills.sh
\`\`\`

Pick the target that matches your project's stack. \`playwright-test\` gives you a ready-to-run \`.spec.ts\`; \`python-pytest\` gives you a \`test_*.py\` with proper fixtures; the bare \`javascript\`/\`python\` targets emit library-style scripts you embed elsewhere.

## -o / --output: Write Straight to a File

By default, recorded code only appears in the Inspector window and you copy-paste it. The \`-o\` (or \`--output\`) flag writes it directly to a file when you close the recorder -- no copy-paste, no lost code:

\`\`\`bash
# Write a TypeScript spec to disk on exit
npx playwright codegen -o tests/checkout.spec.ts https://practice.qaskills.sh

# Combine with a target: write a pytest file
npx playwright codegen --target=python-pytest -o tests/test_checkout.py https://practice.qaskills.sh
\`\`\`

When you finish recording and close the windows, the file is written (or overwritten). Pair \`-o\` with \`--target\` and the file extension you choose -- codegen does not infer the language from the extension, so always set \`--target\` explicitly to match.

## --save-storage and --load-storage: Capture and Reuse Login

The most powerful codegen workflow is recording inside an authenticated session. Logging in by hand on every recording is tedious; instead, log in once, save the session with \`--save-storage\`, then load it on every future recording with \`--load-storage\`. The saved file is the standard Playwright \`storageState\` JSON (cookies plus localStorage).

Step one -- record a login and save the resulting state:

\`\`\`bash
# Log in manually in the recorder; on exit, the session is written to auth.json
npx playwright codegen --save-storage=auth.json https://practice.qaskills.sh/login
\`\`\`

Step two -- start every subsequent recording already logged in:

\`\`\`bash
# Reuse the saved session; the browser opens pre-authenticated
npx playwright codegen --load-storage=auth.json https://practice.qaskills.sh/dashboard
\`\`\`

This is transformative for apps behind a login wall. You authenticate once, and every recording session after that lands on an authenticated page with no login steps cluttering your generated test.

## --save-trace: Record a Trace While You Record

\`--save-trace\` captures a full Playwright trace of your recording session to a zip file. This is handy when a site behaves oddly during recording and you want to inspect every action, network call, and DOM snapshot afterward in the Trace Viewer:

\`\`\`bash
# Record and simultaneously save a trace zip
npx playwright codegen --save-trace=session-trace.zip https://practice.qaskills.sh

# Then replay the trace to inspect everything that happened
npx playwright show-trace session-trace.zip
\`\`\`

The trace includes timeline, screenshots, the DOM at each step, console output, and network activity -- a complete forensic record of your session that complements the generated code.

## --device: Emulate a Mobile Device

\`--device\` applies a Playwright device descriptor -- viewport, user agent, device scale factor, and touch support -- so you record exactly as a real phone would render the page:

\`\`\`bash
# Record as an iPhone 15
npx playwright codegen --device="iPhone 15" https://practice.qaskills.sh

# Record as a Pixel 7
npx playwright codegen --device="Pixel 7" https://practice.qaskills.sh
\`\`\`

The generated code includes the device configuration so the resulting test reproduces the same mobile context. Use this whenever you are recording flows that differ on mobile (hamburger menus, touch gestures, responsive layouts).

## --viewport-size, --color-scheme, and Other Emulation Flags

For desktop recording you can set an exact viewport, force a color scheme, set geolocation, language, and timezone. These flags shape the environment the recorder runs in so your captured test matches the conditions you care about.

\`\`\`bash
# Exact desktop viewport
npx playwright codegen --viewport-size="1440,900" https://practice.qaskills.sh

# Force dark mode (tests prefers-color-scheme: dark)
npx playwright codegen --color-scheme=dark https://practice.qaskills.sh

# Force light mode
npx playwright codegen --color-scheme=light https://practice.qaskills.sh

# Set geolocation (lat,long) -- pair with --lang for locale-aware sites
npx playwright codegen --geolocation="48.8566,2.3522" --lang=fr-FR https://practice.qaskills.sh

# Set the browser timezone
npx playwright codegen --timezone="America/New_York" https://practice.qaskills.sh
\`\`\`

\`--color-scheme\` is especially useful for testing dark-mode UIs: record once in light, once in dark, and you get two specs covering both themes. \`--lang\` sets the \`Accept-Language\` header and \`navigator.language\`, which matters for internationalized sites.

## Selecting the Browser Engine

Like the rest of the Playwright CLI, codegen lets you choose which engine drives the recording with \`-b\`/\`--browser\` and run headless (rarely useful for codegen since you need to interact, but available) with \`--channel\` for branded builds:

\`\`\`bash
# Record in Firefox
npx playwright codegen -b firefox https://practice.qaskills.sh

# Record in WebKit (Safari engine)
npx playwright codegen -b webkit https://practice.qaskills.sh

# Record in branded Google Chrome rather than bundled Chromium
npx playwright codegen --channel=chrome https://practice.qaskills.sh
\`\`\`

Recording in the engine you will actually test against ensures the locators codegen picks behave identically when the test runs.

## Combining Flags: Real-World Recipes

The flags compose. Here are three recipes that solve common real tasks.

**Recipe 1 -- Authenticated pytest file, written to disk:**

\`\`\`bash
# 1. Save login state once
npx playwright codegen --save-storage=auth.json https://practice.qaskills.sh/login
# 2. Record an authenticated flow into a pytest file
npx playwright codegen \\
  --target=python-pytest \\
  --load-storage=auth.json \\
  -o tests/test_dashboard.py \\
  https://practice.qaskills.sh/dashboard
\`\`\`

**Recipe 2 -- iPhone dark-mode TypeScript spec with a trace:**

\`\`\`bash
npx playwright codegen \\
  --device="iPhone 15" \\
  --color-scheme=dark \\
  --save-trace=mobile-dark.zip \\
  -o tests/mobile-dark.spec.ts \\
  https://practice.qaskills.sh
\`\`\`

**Recipe 3 -- Localized French session in Firefox at a specific viewport:**

\`\`\`bash
npx playwright codegen \\
  -b firefox \\
  --lang=fr-FR \\
  --timezone="Europe/Paris" \\
  --viewport-size="1366,768" \\
  -o tests/fr-home.spec.ts \\
  https://practice.qaskills.sh
\`\`\`

## The Inspector Toolbar: Recording Assertions and Picking Locators

The flags configure how codegen launches, but a lot of its power lives in the Inspector window's toolbar once recording starts. Understanding it turns codegen from a click-recorder into an assertion-aware test generator. The toolbar has three modes you toggle while recording, and each changes what the next interaction produces.

The **Record** mode (the default) emits an action for everything you do -- clicks become \`click()\`, typing becomes \`fill()\`, selecting a dropdown becomes \`selectOption()\`. The **Assert visibility** mode lets you click an element and codegen writes \`await expect(locator).toBeVisible()\` instead of an action. The **Assert text** mode writes \`await expect(locator).toContainText(...)\`, and **Assert value** writes \`toHaveValue(...)\` for inputs. These assertion modes are how you build a test that actually verifies behavior rather than just walking through clicks.

\`\`\`bash
# Launch codegen, then in the Inspector:
#  1. Click "Record" and walk through the flow
#  2. Click "Assert text", click the success message -> generates toContainText
#  3. Click "Assert visibility", click a banner -> generates toBeVisible
npx playwright codegen -o tests/signup.spec.ts https://practice.qaskills.sh/signup
\`\`\`

There is also a **Pick locator** mode: click it, hover any element, and codegen shows you the exact locator it would generate -- without recording an action. This is invaluable when you are hand-writing a test and just need the right \`getByRole\` expression for one stubborn element. Copy the suggested locator straight into your editor. Treat the Inspector as a live locator oracle, not just a recorder, and you will write hand-authored tests faster too.

## Reviewing and Hardening Generated Code

Codegen output is a starting point, not a finished test. Always review what it emits before committing, because the recorder cannot know your intent. Three habits make the difference between throwaway generated code and a maintainable test.

First, **collapse redundant navigation**. Codegen records every intermediate page load, including ones caused by clicks that you would not assert on. Remove navigation lines that are implied by the next action's auto-waiting. Second, **add the assertions the recorder missed**. The recorder only adds assertions you explicitly triggered with the toolbar, so a recorded flow often has actions but no verification at the end -- add an \`await expect(...)\` that proves the flow succeeded. Third, **parameterize hard-coded data**. Codegen bakes in the literal email and password you typed; lift those into variables, fixtures, or test data so the test is not tied to one account.

\`\`\`typescript
// Before: raw codegen output (actions only, hard-coded data)
import { test } from '@playwright/test';
test('test', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh/login');
  await page.getByLabel('Email').fill('qa.user@example.com');
  await page.getByLabel('Password').fill('Sup3rS3cret!');
  await page.getByRole('button', { name: 'Sign in' }).click();
});

// After: named, parameterized, and asserted
import { test, expect } from '@playwright/test';
const USER = { email: 'qa.user@example.com', password: 'Sup3rS3cret!' };
test('user can sign in and reach the dashboard', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh/login');
  await page.getByLabel('Email').fill(USER.email);
  await page.getByLabel('Password').fill(USER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
\`\`\`

This review pass takes a minute and converts a brittle recording into a test you trust. For tests that emerge from codegen already following these conventions, the [playwright-codegen skill](/skills) on QASkills applies the hardening automatically.

## codegen vs. open: Two Ways to Launch

It helps to know how \`codegen\` relates to the sibling \`open\` command. \`npx playwright open <url>\` launches the same instrumented browser but without the code-recording panel -- it is for inspecting a page, trying selectors via the Pick locator tool, and emulating devices, without generating a test. \`codegen\` is \`open\` plus the recorder. Many of the emulation flags documented here (\`--device\`, \`--viewport-size\`, \`--color-scheme\`, \`--lang\`, \`--timezone\`) work identically on both commands, so you can use \`open\` for exploration and \`codegen\` when you are ready to capture.

\`\`\`bash
# Inspect and try selectors, no recording
npx playwright open --device="iPhone 15" https://practice.qaskills.sh

# Same emulation, but record a test
npx playwright codegen --device="iPhone 15" -o tests/mobile.spec.ts https://practice.qaskills.sh
\`\`\`

Use \`open\` to explore an unfamiliar app and find the locators that work, then switch to \`codegen\` with the same flags to record the real flow. This two-step rhythm -- explore, then capture -- produces cleaner recordings than diving straight into recording on a page you do not yet understand.

## Complete Flag Reference

| Flag | Argument | Purpose |
|---|---|---|
| \`--target\` | language id | Output language/runner (playwright-test, python-pytest, java, csharp, ...) |
| \`-o\`, \`--output\` | file path | Write generated code to a file on exit |
| \`--save-storage\` | file path | Save cookies + localStorage (login state) on exit |
| \`--load-storage\` | file path | Load a saved session so recording starts authenticated |
| \`--save-trace\` | zip path | Record a Playwright trace of the session |
| \`--device\` | descriptor | Emulate a device (e.g. "iPhone 15", "Pixel 7") |
| \`--viewport-size\` | \`W,H\` | Exact desktop viewport dimensions |
| \`--color-scheme\` | light/dark | Force prefers-color-scheme |
| \`--geolocation\` | \`lat,long\` | Set browser geolocation |
| \`--lang\` | locale | Set Accept-Language and navigator.language |
| \`--timezone\` | tz id | Set the browser timezone |
| \`-b\`, \`--browser\` | engine | chromium / firefox / webkit |
| \`--channel\` | channel | Branded build (chrome, msedge) |
| \`--ignore-https-errors\` | (none) | Ignore TLS errors during recording |

## Codegen Targets at a Glance

| Target value | Language | Style |
|---|---|---|
| \`playwright-test\` | TypeScript | Playwright Test runner (default) |
| \`javascript\` | JavaScript | Library style, no runner |
| \`python-pytest\` | Python | pytest with fixtures |
| \`python\` | Python | Sync library style |
| \`python-async\` | Python | Async library style |
| \`java\` | Java | JUnit |
| \`csharp\` | C# | NUnit / .NET |

## Recording API Tests and Other Limits

It is worth being clear about what codegen does and does not do, so you reach for it at the right times. Codegen records **browser interactions** -- everything that happens through clicking, typing, and navigating a page. It does not record pure API calls; if your goal is an API test using Playwright's request context, codegen is not the tool, and you should hand-write the \`request.get\`/\`request.post\` calls instead. Codegen also will not capture logic you want around the actions: conditionals, loops, data-driven parameterization, or custom assertions beyond the toolbar's visibility/text/value checks. Those are things you add in the review pass.

A second limitation is that codegen records against the **current state** of the app. If a flow depends on data that must exist first (a product in the catalog, a user in a particular state), you need that data present before you record, and the recording will hard-code references to it. This is another reason the parameterization step matters: lift the recorded specifics into fixtures so the test can recreate its own preconditions. Used with these limits in mind -- great for capturing UI flows, not a substitute for thoughtful test design -- codegen is a genuine accelerator.

## A Practical Codegen Workflow

Putting the pieces together, here is the workflow that gets the most value out of codegen day to day. First, if the app is behind login, capture auth once with \`--save-storage\`. Second, explore the target page with \`npx playwright open\` (or codegen's Pick locator mode) to understand its structure and confirm the locators you want are findable by role. Third, record the real flow with \`--load-storage\`, the right \`--target\`, and \`-o\` to write straight to a file. Fourth, do the review pass: remove redundant navigation, parameterize hard-coded data, and add the assertions that prove the flow succeeded. Fifth, run the generated test to confirm it passes, and only then commit.

\`\`\`bash
# 1. Capture auth once
npx playwright codegen --save-storage=auth.json https://practice.qaskills.sh/login
# 2. (explore with open if the page is unfamiliar)
# 3. Record the authenticated flow into a typed file
npx playwright codegen --load-storage=auth.json --target=playwright-test \\
  -o tests/checkout.spec.ts https://practice.qaskills.sh/cart
# 4. (edit tests/checkout.spec.ts -- parameterize + assert)
# 5. Verify it passes before committing
npx playwright test tests/checkout.spec.ts
\`\`\`

This five-step rhythm turns codegen from a novelty into a repeatable part of authoring tests, and it scales to a team: everyone follows the same capture-explore-record-harden-verify loop and produces consistent, reviewed specs rather than raw recordings.

## Frequently Asked Questions

### How do I record a Playwright test in Python instead of TypeScript?

Use the \`--target\` flag. Pass \`--target=python-pytest\` to generate a pytest file with fixtures, \`--target=python\` for a synchronous library-style script, or \`--target=python-async\` for async code. Combine it with \`-o tests/test_flow.py\` to write straight to disk. Codegen does not infer language from the file extension, so always set \`--target\` explicitly to match the output file you want.

### How do I save the generated code to a file automatically?

Add \`-o\` (or \`--output\`) with a file path, for example \`npx playwright codegen -o tests/checkout.spec.ts <url>\`. When you close the recorder window, Playwright writes the generated code to that file, overwriting it if it exists -- no copy-paste from the Inspector required. Pair \`-o\` with \`--target\` so the emitted language matches the extension you chose, since the two are set independently.

### How do I record while already logged in to a site?

Use the two-step storage-state workflow. First run codegen with \`--save-storage=auth.json\` and log in manually; on exit, your cookies and localStorage are written to \`auth.json\`. Then start every later recording with \`--load-storage=auth.json\`, which opens the browser already authenticated. This removes login steps from your generated tests and is the standard way to record flows behind an authentication wall.

### What does --save-trace do during codegen?

\`--save-trace=session.zip\` records a complete Playwright trace of your recording session alongside the generated code. The trace captures the timeline, screenshots, the DOM at each step, console messages, and network activity. After recording, replay it with \`npx playwright show-trace session.zip\` to inspect exactly what happened. It is most useful when a site misbehaves during recording and you need a forensic view beyond the emitted source.

### How do I emulate a mobile device while recording?

Pass \`--device\` with a Playwright device descriptor, such as \`--device="iPhone 15"\` or \`--device="Pixel 7"\`. This sets the mobile viewport, user agent, device scale factor, and touch support, and the generated test includes that device configuration so it reproduces the same context. Use it whenever the mobile experience differs from desktop -- hamburger navigation, touch gestures, or responsive breakpoints you want captured.

### Can codegen force dark mode?

Yes. Use \`--color-scheme=dark\` to make the browser report \`prefers-color-scheme: dark\`, or \`--color-scheme=light\` for light mode. This is ideal for testing theme-aware UIs: record one spec in light and another in dark to cover both. The flag sets the emulation at the context level, so any CSS or JavaScript that reacts to the color scheme behaves exactly as it would for a real user with that system preference.

### Which browser does codegen use, and can I change it?

By default codegen drives bundled Chromium. Change it with \`-b\` (or \`--browser\`): \`-b firefox\` records in Firefox and \`-b webkit\` records in the Safari engine. Use \`--channel=chrome\` or \`--channel=msedge\` to drive an installed branded build instead of bundled Chromium. Record in the engine you will actually test against so the locators codegen selects behave identically when the generated test runs in CI.

### Does codegen pick good locators automatically?

Yes -- this is its main strength. The recorder prefers resilient, user-facing locators in priority order: \`getByRole\`, \`getByLabel\`, \`getByPlaceholder\`, and \`getByText\`, falling back to test IDs and CSS only when nothing better exists. It also inserts auto-waiting actions and adds \`expect\` assertions when you use the assertion toolbar. The result is far more maintainable than hand-written CSS selectors, though you should still review and tidy the output before committing.

## Conclusion

\`playwright codegen\` is far more capable than its default invocation suggests. \`--target\` picks your language and runner, \`-o\` writes code straight to disk, the \`--save-storage\`/\`--load-storage\` pair lets you record inside an authenticated session, \`--save-trace\` gives you a forensic record, and the emulation flags -- \`--device\`, \`--viewport-size\`, \`--color-scheme\`, \`--lang\`, \`--timezone\` -- reproduce exactly the conditions you want to test. Compose them and you can generate an authenticated, mobile, dark-mode, localized test in a single command.

Keep the two reference tables above next to your terminal. For recorded tests that already follow Playwright best practices out of the box, add the [playwright-codegen skill](/skills) from QASkills, browse the full [skills catalog](/skills), or find more Playwright CLI walkthroughs on the [QASkills blog](/blog).
`,
};
