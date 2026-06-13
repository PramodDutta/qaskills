import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Debug Mode + Inspector: Step-Through Test Debugging',
  description:
    'Complete reference for Playwright debug mode and Inspector in 2026: PWDEBUG=1, --debug, page.pause, breakpoints, locator picker, console log streaming, source-mapped step-through.',
  date: '2026-06-05',
  category: 'Reference',
  content: `
# Playwright Debug Mode + Inspector: Step-Through Test Debugging

Playwright Debug Mode and the Playwright Inspector are the two-headed tool that makes flaky tests easy to diagnose in 2026. Set \`PWDEBUG=1\` and a normally headless test run becomes a slow-motion, single-step-through inspection of every Playwright action. The Inspector window shows the current locator highlighted in the page, the source code with the active line marked, a live log of every action and assertion, and a locator picker that lets you point at any element and get the exact \`getByRole\` or \`getByTestId\` call to use. For QA engineers running Playwright with Claude Code, Cursor, or Aider, the Inspector is the single most useful tool when an AI-generated test fails on the first run.

This guide is the complete reference for both. We cover the environment variable mode (\`PWDEBUG=1\`), the CLI flag mode (\`--debug\`), the inline programmatic mode (\`page.pause()\`), and every Inspector UI feature: the action toolbar, the breakpoint sidebar, the locator picker, the console log, and the source view. Every example uses Playwright 1.49+ and TypeScript.

If you are new to Playwright, start with the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). For locator patterns the Inspector emits, see [Playwright Locator Best Practices](/blog/playwright-locator-best-practices-web-first-assertions-2026). The [playwright-e2e skill](/skills/playwright-e2e) installs the same debugging conventions for your AI agent.

## What is Playwright Debug Mode

Debug mode is a runtime mode that does three things at once:

1. Runs the test in headed mode (visible browser window).
2. Slows execution and waits at every action for you to step through.
3. Launches the Playwright Inspector window alongside the browser.

It is not a separate runner. It is the regular \`npx playwright test\` runner with extra hooks enabled. Any test that runs normally also runs in debug mode without code changes.

There are three ways to enter debug mode, each suitable for a different situation.

| Mode | Trigger | Best for |
|---|---|---|
| Environment variable | \`PWDEBUG=1 npx playwright test\` | Debugging the entire run |
| CLI flag | \`npx playwright test --debug\` | One-shot debug session |
| Programmatic | \`await page.pause()\` in the test | Pause at a known point |

## PWDEBUG=1: the global debug switch

Set \`PWDEBUG\` to \`1\` (or \`console\`) before running any Playwright test:

\`\`\`bash
PWDEBUG=1 npx playwright test tests/login.spec.ts
\`\`\`

This:

- Forces \`headed: true\` regardless of config.
- Disables test timeouts so the test does not fail while you are paused.
- Disables \`expect\` timeouts for the same reason.
- Opens the Inspector window.
- Pauses execution before the first action.

You drive the test forward by clicking the Step Over button in the Inspector. Each click advances one Playwright action: one click, one fill, one assertion. The browser shows what the action did. The Inspector shows the log of what happened.

\`PWDEBUG=console\` is a lighter variant: it does not pause before each action, but it logs every action to stdout in real time. Use this when you want a trace of what is happening without the step-through UI.

\`\`\`bash
PWDEBUG=console npx playwright test tests/login.spec.ts
\`\`\`

## --debug: the CLI flag

\`--debug\` is equivalent to \`PWDEBUG=1\` for a single invocation:

\`\`\`bash
npx playwright test tests/login.spec.ts --debug
\`\`\`

This launches the Inspector and pauses at the first action. The flag is more discoverable than the environment variable, and it composes with other test selection flags:

\`\`\`bash
# Debug only the test named "should sign in"
npx playwright test --debug -g "should sign in"

# Debug a single file
npx playwright test tests/checkout.spec.ts --debug

# Debug against only one project
npx playwright test --project=chromium --debug
\`\`\`

When debugging against multiple projects, run only one project at a time. The Inspector pairs with one browser window, and multiple parallel windows make it impossible to follow.

## page.pause(): inline programmatic pause

For situations where the test runs through fine up to a certain point and then misbehaves, \`page.pause()\` is the right tool. Insert it where you want execution to stop:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('should add item to cart', async ({ page }) => {
  await page.goto('/shop');
  await page.getByRole('link', { name: 'Headphones' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();

  // Pause here to inspect the cart state before continuing
  await page.pause();

  await page.getByRole('link', { name: 'Checkout' }).click();
});
\`\`\`

Run the test normally:

\`\`\`bash
npx playwright test tests/cart.spec.ts
\`\`\`

When execution reaches \`await page.pause()\`, the test:

- Switches to headed mode if it was running headless.
- Opens the Inspector window.
- Waits indefinitely for you to click Resume.

You can interact with the browser freely while paused: open DevTools, click around, change the URL. Then either click Resume to continue the test, or step through the remaining actions one at a time.

\`page.pause()\` is a no-op in CI (when there is no display), so you can commit it without breaking the build. That said, leaving it in committed code is bad practice. Use it locally and remove before pushing.

## The Inspector UI: action toolbar

The Inspector window has a toolbar at the top with four primary controls:

| Button | Action | Keyboard |
|---|---|---|
| Resume | Continue until next pause or end | F8 |
| Step Over | Execute next action and stop | F10 |
| Record | Record additional actions to add to the test | (no shortcut) |
| Pick locator | Activate the locator picker | (no shortcut) |

Step Over is the most common command. Each click executes exactly one Playwright action: one \`click()\`, one \`fill()\`, one \`expect()\`. The browser updates to show what the action did, and the Inspector log appends the action with timing.

Resume runs the rest of the test at normal speed. Useful when you have inspected enough and want the test to finish.

Record adds new actions to the current test. Click Record, interact with the page, and Playwright streams the corresponding code into the Inspector. When you stop, the new code is appended to your test file (if \`--output\` was set on the original codegen run, or you can copy from the Inspector).

## The locator picker

The locator picker is the Inspector's most useful feature when debugging selectors. Click "Pick locator" in the toolbar, then hover over any element in the page. The Inspector shows the exact Playwright locator that would target it:

\`\`\`typescript
// Hovering over the "Sign in" button shows:
getByRole('button', { name: 'Sign in' })

// Hovering over the email field shows:
getByLabel('Email')

// Hovering over a result row shows:
getByRole('row', { name: 'Item #1234' })
\`\`\`

Click the element to copy the locator to your clipboard. Paste into your test file and you have a guaranteed-correct locator that survives DOM changes.

The picker respects your config's \`testIdAttribute\`. If you set \`testIdAttribute: 'data-qa'\`, then elements with \`data-qa\` get \`getByTestId(...)\` priority. The picker is the single source of truth for what locator Playwright would generate.

## Breakpoints

The Inspector's source view shows the test code with line numbers. Click in the gutter next to any line to set a breakpoint. The next time the test runs (under debug mode), execution stops at that line.

Breakpoints are stored in the Inspector's memory only. They do not survive a re-launch. For persistent break points, use \`await page.pause()\` in the source.

| Breakpoint style | Persistence | Stops on |
|---|---|---|
| Inspector gutter | Session only | Selected line |
| \`page.pause()\` | Code-persistent | Pause call |
| Failing assertion | Always | Assertion failure |
| Action timeout | Always | Action that hung |

When a test fails because of a timeout, debug mode pauses at the failing action and shows the actionability check that failed: "element not visible", "element is detached", "element receives pointer events". The Inspector log lines just above the failure usually point to the cause.

## Console log streaming

The Inspector log pane shows every Playwright action and the timing in milliseconds. Each entry expands to show:

- The action (\`locator.click\`, \`expect.toBeVisible\`)
- The locator resolved
- The DOM snapshot before and after
- Console messages from the page itself

To see only browser console messages (and not Playwright actions), filter the log by "page console". This is the equivalent of opening DevTools and watching the Console tab, with the bonus of being correlated to test actions.

\`\`\`typescript
// Browser logs are captured automatically. To assert on them:
test('console logs', async ({ page }) => {
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  await page.goto('/dashboard');
  // Run with PWDEBUG=1 and check the Inspector log
});
\`\`\`

## Stepping through assertions

Assertions step the same way as actions. A failing assertion stops on the line of the \`expect()\` call and shows:

- The actual value (what Playwright saw).
- The expected value (what your test asked for).
- The retry timeline (how many polls before the timeout).
- A snapshot of the DOM at the time of failure.

This is far more useful than the typical Jest-style assertion failure, which just shows actual vs. expected. The retry timeline tells you whether the element ever became visible, ever had the right text, or stayed broken the whole time.

\`\`\`typescript
test('order total', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Apply coupon' }).click();
  await expect(page.getByTestId('total')).toHaveText('$45.00');
  // If the total is wrong, debug mode pauses here.
  // The Inspector shows: expected "$45.00", got "$50.00", retried 5 times.
});
\`\`\`

## Headed vs headless

Debug mode always runs headed. You see the browser window. If your tests normally run headless, debug mode overrides that.

If you want to debug a headless run (to see what really happens in CI), use trace viewer instead. See [Playwright show-trace CLI Reference](/blog/playwright-show-trace-cli-reference) for the post-mortem debugging workflow.

## Slow motion

For tests that are too fast to follow even with step-through, add \`slowMo\` to your \`playwright.config.ts\` or as a launch option:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    launchOptions: {
      slowMo: 500, // 500ms between every action
    },
  },
});
\`\`\`

Combined with debug mode, this makes the test look like a slow-motion replay. Useful for screen recording or for explaining a test to a teammate.

## Debug mode in VS Code

The Playwright VS Code extension provides debug mode integration without command-line flags. Right-click any test and choose "Debug Test". The extension launches debug mode, attaches the VS Code debugger, and lets you set breakpoints in VS Code's gutter (not just the Inspector's).

| Feature | Inspector | VS Code |
|---|---|---|
| Step over | Yes | Yes (F10) |
| Breakpoints | Session-only | Persistent in code |
| Variable inspection | Limited | Full (debugger watch panel) |
| Conditional breakpoints | No | Yes |
| Logpoints | No | Yes |
| Locator picker | Yes | Yes (via Inspector window) |

For complex debugging that involves inspecting variables and state, VS Code is the better choice. For pure click-and-see-what-happens debugging, the Inspector is fewer keystrokes.

## Common debugging patterns

### "My test fails on CI but works locally"

Run with \`PWDEBUG=1\` first. If it passes, the issue is timing or environment. Add a trace to CI:

\`\`\`typescript
export default defineConfig({
  use: {
    trace: 'on-first-retry',
  },
});
\`\`\`

After the CI run, download the trace artifact and view with \`npx playwright show-trace trace.zip\`.

### "My locator does not find the element"

Use the locator picker. Pause the test just before the failing locator with \`await page.pause()\`, then click "Pick locator" and hover the element. The Inspector shows the correct locator. If your locator differs, replace it.

### "My assertion times out but the value looks right"

The retry timeline in the Inspector log tells you what Playwright actually saw on each retry. If the value flickered (was correct briefly, then wrong), the issue is in the application, not the test.

### "The test passes but the page state is wrong at the end"

Add \`await page.pause()\` at the end of the test before any cleanup. You can manually inspect the page state. If everything looks right, the issue is your assertion: it does not check what you thought it checked.

## Trace viewer vs. debug mode

Debug mode is interactive: you drive the test and inspect at each step. Trace viewer is post-mortem: you replay a finished test from a trace.zip file.

| Tool | When to use | Strengths |
|---|---|---|
| Debug mode (\`PWDEBUG=1\`) | Live interactive debugging | Locator picker, step-through, breakpoints |
| Trace viewer (\`show-trace\`) | After CI failure | Reproducible, shareable, no rerun |
| VS Code Playwright extension | Day-to-day local dev | Persistent breakpoints, IDE integration |

For trace-based debugging, see [Playwright show-trace CLI Reference](/blog/playwright-show-trace-cli-reference) and [Playwright Trace Viewer 2026](/blog/playwright-test-trace-viewer-official-2026).

## Disabling debug mode programmatically

If you need to skip pause calls in CI but keep them for local dev, use the \`CI\` environment variable check:

\`\`\`typescript
test('with conditional pause', async ({ page }) => {
  await page.goto('/dashboard');
  if (!process.env.CI) {
    await page.pause();
  }
  await page.getByRole('button', { name: 'Continue' }).click();
});
\`\`\`

This is a code smell. The better fix is to remove \`page.pause()\` before committing. Use a pre-commit hook if necessary.

## Inspector log severity levels

The Inspector log uses color coding for severity:

| Color | Meaning |
|---|---|
| Gray | Informational action (succeeded) |
| Green | Successful assertion |
| Yellow | Warning (retry, slow action) |
| Red | Failure or strict mode violation |
| Blue | Console message from the page |

Hover any log line for the full message and stack trace. Right-click for "Copy locator" if the action involved a locator - useful when you want to reuse it elsewhere.

## Debug mode with reporters

Reporters that produce inline output (\`['list']\`, \`['line']\`) work normally in debug mode. Reporters that buffer (\`['html']\`) still produce their output, but you typically do not consult them while debugging - you use the Inspector log instead.

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  reporter: process.env.PWDEBUG ? [['list']] : [['html'], ['list']],
});
\`\`\`

This avoids the HTML report opening at the end of a debug session, which is rarely what you want.

## Debug mode in different browsers

\`PWDEBUG=1\` works for all three engines: Chromium, Firefox, WebKit. The Inspector UI is identical regardless of which browser the test runs against. The browser window content differs, but you debug the same way.

For browser-specific bugs (a test passes in Chromium and fails in WebKit), run debug mode with the failing project:

\`\`\`bash
PWDEBUG=1 npx playwright test --project=webkit -g "failing test name"
\`\`\`

The Inspector shows the WebKit browser. You step through and observe.

## Inspector tips for AI-generated tests

When your AI agent (Claude Code, Cursor, Aider) generates a Playwright test and it fails on the first run, the typical debugging flow is:

1. Run with \`PWDEBUG=1\`.
2. Step through until the failing action.
3. Use the locator picker to find the correct locator.
4. Paste the correct locator into the AI-generated test.
5. Re-run.

This loop is fast (under a minute per fix) and trains the AI agent over time (because the corrected tests inform future generations). The [playwright-e2e skill](/skills/playwright-e2e) ensures the AI emits locators in the style the Inspector picker would produce, so the loop closes faster.

## Frequently Asked Questions

### What does PWDEBUG=1 do in Playwright?

Setting \`PWDEBUG=1\` switches the test runner into debug mode: tests run headed, timeouts are disabled, and the Playwright Inspector window opens. Execution pauses before each action so you can step through one at a time. It is the canonical way to debug a Playwright test locally without code changes.

### How do I open the Playwright Inspector?

Run any test with \`PWDEBUG=1\` (environment variable) or \`--debug\` (CLI flag), or place \`await page.pause()\` in your test code. All three open the Inspector window alongside the browser. The Inspector shows the test source, an action log, and a locator picker.

### What is the difference between --debug and PWDEBUG=1?

They are functionally identical for a single test run. \`--debug\` is the CLI flag (\`npx playwright test --debug\`). \`PWDEBUG=1\` is the environment variable. Use the flag for one-shot debugging, the env var for a debug session covering multiple commands.

### How does page.pause() differ from a breakpoint?

\`page.pause()\` is code-level: it stops execution at that exact line and opens the Inspector. Breakpoints in the Inspector are session-only. Use \`page.pause()\` when you want a reliable, code-tracked pause; use breakpoints for quick ad-hoc inspection during a debug session.

### Can I pick locators from the Inspector?

Yes. Click "Pick locator" in the Inspector toolbar, then hover any element in the page. The Inspector shows the exact Playwright locator (\`getByRole\`, \`getByLabel\`, \`getByTestId\`) that targets it. Click the element to copy the locator to your clipboard.

### How do I debug a test that only fails in CI?

Enable trace recording (\`trace: 'on-first-retry'\` in config), let the CI run produce a trace.zip artifact, download it, and view with \`npx playwright show-trace trace.zip\`. The trace viewer is the post-mortem equivalent of debug mode. See the [show-trace CLI Reference](/blog/playwright-show-trace-cli-reference) guide for details.

### Why does my test pass under PWDEBUG=1 but fail in CI?

Debug mode disables timeouts. If your test fails in CI because of a timeout, it will pass in debug mode because there is no timeout to hit. The fix is to identify the slow operation: either wait for a specific condition (\`page.waitForResponse\`, \`page.waitForLoadState\`) or accept that the action needs more time and bump the action timeout for that one call.

### Can I step through assertions, not just actions?

Yes. Each \`expect(...).toBeVisible()\`, \`expect(...).toHaveText(...)\` etc. is treated as a step. The Inspector log shows the retry timeline for each assertion: how many times Playwright polled before giving up or succeeding. This is unique to debug mode and trace viewer.

## Conclusion

Debug mode and the Inspector are the standard live-debugging surface for Playwright in 2026. \`PWDEBUG=1\`, \`--debug\`, and \`await page.pause()\` cover every situation from full-test step-through to inline mid-test inspection. The locator picker, console log, and action timeline together explain failures in seconds that would otherwise take an hour of \`console.log\` debugging.

For CI debugging, pair debug mode with trace recording and the trace viewer. For day-to-day local development, install the [playwright-e2e skill](/skills/playwright-e2e) so your AI agent (Claude Code, Cursor, Aider) writes tests that are easy to debug with the same Inspector.

Compare debugging approaches across frameworks in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026), and read the [Playwright Best Practices 2026](/blog/playwright-best-practices-2026) guide for the assertion and locator patterns that minimize how often you need debug mode in the first place.
`,
};
