import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright UI Mode debugging guide 2026',
  description:
    'Debug Playwright tests faster with UI Mode in 2026: the test tree, time-travel timeline, watch mode, pick locator, plus source, console, and network tabs.',
  date: '2026-06-25',
  category: 'Tutorial',
  content: `
# Playwright UI Mode: The Complete 2026 Debugging Guide

Playwright UI Mode is the single fastest way to debug an end-to-end test, and in 2026 it has matured into the default workflow for most teams writing browser tests. Launched with a single flag, \`--ui\`, it opens an interactive cockpit that shows your entire test tree, a time-travel timeline of every action, live DOM snapshots you can hover and inspect, a watch mode that re-runs tests on save, a locator picker, and dedicated tabs for source, console, network, and errors. If you have ever sprinkled \`console.log\` through a test and re-run it ten times trying to understand why a click missed, UI Mode replaces that entire ritual.

The reason UI Mode wins is **time travel**. Traditional debugging shows you the page only at the moment your test crashed. UI Mode records a DOM snapshot before and after every single action, so you can scrub backward to the exact step where things went wrong and *see the page as it looked then* — not as it looks now after the failure cascaded. Combined with the action log, the network panel, and the locator picker, you can usually diagnose a flaky test in a minute or two without adding a single line of debug code.

This tutorial walks through every panel and feature with runnable commands and real TypeScript. You will learn how to launch UI Mode, navigate the test tree, read the timeline, use watch mode for tight feedback loops, pick locators interactively, read the source, console, and network tabs, debug flaky tests, and choose between UI Mode, the trace viewer, and \`--debug\`/\`PWDEBUG\`. By the end you will run UI Mode as your default loop. If you build a QA skill library for AI coding agents, these workflows package neatly into reusable [QA skills](/skills) so an agent can drive the debugger for you.

## Launching Playwright UI Mode

UI Mode is built into \`@playwright/test\`; there is nothing to install. You launch it with the \`--ui\` flag on the standard test command. It opens a desktop-style window backed by your local browser.

\`\`\`bash
# Launch UI Mode against your whole suite
npx playwright test --ui

# Launch UI Mode for a single spec file
npx playwright test tests/checkout.spec.ts --ui

# Launch on a specific port (useful in remote/containerized dev)
npx playwright test --ui --ui-port=8080

# Launch and bind to all interfaces for a dev container
npx playwright test --ui --ui-host=0.0.0.0 --ui-port=8080
\\\`\\\`\\\`

When the window opens you see the test tree on the left, a toolbar across the top, and the main viewing area where snapshots and tabs render. Nothing runs automatically — you choose what to execute, which keeps the loop fast.

## Understanding the Test Tree

The left sidebar is the **test tree**: every project, file, describe block, and individual test, nested exactly as in your code. You can run a whole file, a describe block, or a single test by clicking its play button. A checkbox next to each entry lets you queue a subset, and the filter box at the top narrows by title, tag, or status.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Checkout flow', () => {
  test('adds an item to the cart', async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await page.getByPlaceholder('What needs to be done?').fill('Buy milk');
    await page.getByPlaceholder('What needs to be done?').press('Enter');
    await expect(page.getByText('Buy milk')).toBeVisible();
  });

  test('completes a todo', async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');
    await page.getByPlaceholder('What needs to be done?').fill('Write tests');
    await page.getByPlaceholder('What needs to be done?').press('Enter');
    await page.getByRole('checkbox').check();
    await expect(page.getByText('Write tests')).toHaveClass(/completed/);
  });
});
\\\`\\\`\\\`

In UI Mode this renders as a "Checkout flow" group with two runnable tests. Filtering by status — passed, failed, skipped — is how you isolate the one red test among hundreds after a run.

## Time-Travel: The Action Timeline

The defining feature of UI Mode is the **timeline**. Run a test and every action — \`goto\`, \`fill\`, \`press\`, \`check\`, \`expect\` — appears as a row in the action log with its duration. Click any action and the viewing area shows two DOM snapshots: the page **before** and **after** that action ran. Hover the timeline at the top and you scrub through the run frame by frame.

This is what "time travel" means: you are not looking at the live page, you are looking at a recorded snapshot of how the page looked at that exact moment in the test. When an \`expect\` fails, click the action just before it and you see precisely what the page contained — whether the element was missing, hidden, or had different text than you assumed. No re-running, no logging.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('scrub the timeline to find why the assertion failed', async ({ page }) => {
  await page.goto('https://example.com/dashboard');
  await page.getByRole('button', { name: 'Load report' }).click();
  // If this fails, click the action above it in UI Mode and
  // inspect the before/after snapshot to see the real page state
  await expect(page.getByRole('heading', { name: 'Q3 Report' })).toBeVisible();
});
\\\`\\\`\\\`

## Live DOM Snapshots and the Pop-Out Inspector

Each snapshot in the viewing area is a real, interactive DOM — not a screenshot. You can hover elements to highlight them, open the browser-style DevTools inside the snapshot, and confirm exactly which element a locator resolved to. When an action highlights the wrong element, you immediately see your locator matched something unexpected.

The snapshot also shows the **action point** as a red dot, marking where Playwright clicked or typed. If that dot lands on the wrong element — a hidden overlay, a duplicated button — you have found your bug visually. This beats reading a stack trace, because the cause is on screen.

## Watch Mode for Tight Feedback Loops

Watch mode is the productivity multiplier. Toggle the eye icon next to a test (or the whole tree) and Playwright re-runs those tests automatically every time you save a source file. You edit a locator, hit save, and the result updates in under a second without touching the terminal.

\`\`\`bash
# Watch mode is toggled inside the UI, but you can pre-scope
# which tests are watched by filtering the tree first.
npx playwright test tests/login.spec.ts --ui
\\\`\\\`\\\`

Pair watch mode with the pick-locator tool and you get a true edit-and-see loop: change the test, save, watch it re-run, see the new snapshot — all without leaving the window. This is the workflow that replaces the old "edit, switch to terminal, re-run, read output, repeat" cycle.

## Pick Locator: Generate Selectors Interactively

The **Pick locator** button in the toolbar turns your cursor into a selector generator. Click it, then hover any element in a snapshot and UI Mode shows the recommended Playwright locator — usually a role-based one like \`getByRole('button', { name: 'Submit' })\`. Click the element and the locator is copied, ready to paste into your test.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('locators generated with Pick locator', async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
  // These role and placeholder locators were generated by
  // hovering elements with the Pick locator tool in UI Mode
  await page.getByPlaceholder('What needs to be done?').fill('Refactor');
  await page.getByRole('listitem').filter({ hasText: 'Refactor' }).hover();
  await expect(page.getByRole('listitem')).toContainText('Refactor');
});
\\\`\\\`\\\`

Because the tool prefers role-based locators, the selectors it generates are resilient and accessible by default — the same philosophy behind Playwright's recommended locator strategy.

## The Source, Console, Network, and Errors Tabs

Below the timeline sits a row of tabs that give you everything DevTools would, scoped to the selected action.

The **Source** tab shows your test code with the current action highlighted, so you always know which line produced the snapshot you are viewing. The **Console** tab shows browser console messages — \`console.log\`, warnings, and errors emitted by the app during that step. The **Network** tab lists every request the page made, with method, status, timing, and payloads, so you can confirm an API returned 500 right before your UI assertion failed. The **Errors** tab surfaces uncaught exceptions and the assertion failure with its stack.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('network tab reveals a failing API behind a UI bug', async ({ page }) => {
  await page.goto('https://example.com/orders');
  await page.getByRole('button', { name: 'Refresh' }).click();
  // If this assertion fails, open the Network tab in UI Mode:
  // a 500 on GET /api/orders explains the empty list instantly
  await expect(page.getByRole('row')).toHaveCount(10);
});
\\\`\\\`\\\`

This is the moment UI Mode pays for itself: a UI assertion fails, you glance at the Network tab, and the root cause is an API error — something \`console.log\` in the test would never have shown you.

## UI Mode Panels Reference

Here is every major surface in UI Mode and what each one is for.

| Panel / Control | Location | What it does |
|-----------------|----------|--------------|
| Test tree | Left sidebar | Browse, filter, and run projects, files, and individual tests |
| Action log | Center-left | Lists every step (goto, fill, click, expect) with duration |
| Timeline | Top of viewer | Scrub before/after DOM snapshots frame by frame |
| DOM snapshot | Center | Interactive recorded page state at the selected action |
| Watch toggle | Eye icon | Auto re-runs selected tests on file save |
| Pick locator | Toolbar | Hover elements to generate recommended locators |
| Source tab | Bottom tabs | Test code with the current action highlighted |
| Console tab | Bottom tabs | Browser console output for the selected step |
| Network tab | Bottom tabs | All requests with status, timing, and payloads |
| Errors tab | Bottom tabs | Uncaught exceptions and assertion failures |

## Debugging Flaky Tests with UI Mode

Flaky tests usually come from timing, ordering, or state leakage. UI Mode makes them tractable because you can run the same test repeatedly and compare timelines. Run a flaky test five times; when it fails, scrub to the action before the failure and check the snapshot and Network tab. A common pattern is an assertion racing an in-flight request — the Network tab shows the response landed *after* the assertion checked.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('replace a race condition with a web-first assertion', async ({ page }) => {
  await page.goto('https://example.com/search');
  await page.getByPlaceholder('Search').fill('playwright');
  await page.getByRole('button', { name: 'Search' }).click();

  // Flaky version raced the network. The fix is a web-first
  // assertion that auto-retries until results actually render —
  // confirm it in the timeline that results appear after the request.
  await expect(page.getByRole('listitem')).not.toHaveCount(0);
});
\\\`\\\`\\\`

Once you see in the timeline that the result list populated only after the XHR resolved, the fix is obvious: assert on the rendered result rather than a fixed wait. For systematically eliminating flakiness across a suite, our [trace viewer debugging guide](/blog/playwright-trace-viewer-debugging-guide) covers the post-mortem side of the same problem in CI.

## UI Mode vs Trace Viewer vs --debug / PWDEBUG

Playwright ships three debugging tools and they are not interchangeable. UI Mode is your **local development** loop: interactive, watch-mode driven, run-and-edit. The **trace viewer** is for **post-mortem** analysis — it opens a \`trace.zip\` recorded by a CI run on a machine you cannot touch, with the same time-travel UI. The legacy **\`--debug\` / \`PWDEBUG\`** mode opens the Playwright Inspector and steps the test live in a real browser with breakpoints. The table clarifies when to reach for each.

| Aspect | UI Mode (\`--ui\`) | Trace Viewer | \`--debug\` / \`PWDEBUG\` |
|--------|------------------|--------------|------------------------|
| Primary use | Local dev, write and debug tests | Post-mortem of a recorded run | Step-through with live breakpoints |
| Time travel | Yes (before/after snapshots) | Yes (replays recorded trace) | No (live, one direction) |
| Watch mode | Yes, re-runs on save | No | No |
| Pick locator | Yes | No | Yes (in Inspector) |
| Network/console tabs | Yes | Yes | Limited |
| Needs a trace file | No | Yes (\`trace.zip\`) | No |
| Works for CI failures | No (local only) | Yes (open the CI artifact) | No |
| How to launch | \`npx playwright test --ui\` | \`npx playwright show-trace trace.zip\` | \`npx playwright test --debug\` |

The mental model: develop in UI Mode, capture traces in CI, and open those traces in the trace viewer when something fails remotely. Reach for \`--debug\` only when you genuinely need to pause execution on a breakpoint.

## Configuring UI Mode and Traces

You do not configure UI Mode itself much, but you do configure the traces it relies on so the same recording works in CI. Set \`trace\` and \`screenshot\` in \`playwright.config.ts\` and you get artifacts locally and on the runner.

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    // Record a trace on the first retry — perfect for CI post-mortems
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // UI Mode honors projects; you can switch browsers in the tree
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});
\\\`\\\`\\\`

With \`trace: 'on-first-retry'\`, every flaky CI failure produces a \`trace.zip\` you can download and open with \`npx playwright show-trace\` — the exact same interface you already learned in UI Mode. Choosing the right tool for your stack overall is covered in our [AI test automation tools 2026](/blog/ai-test-automation-tools-2026) overview, and if you are weighing frameworks see [Appium vs Playwright 2026](/blog/appium-vs-playwright-2026).

## Keyboard Shortcuts and Power-User Workflows

UI Mode rewards a few muscle-memory habits. Pressing the play button on the root of the tree runs everything, but you rarely want that during development — instead, click the play icon on a single test for the fastest cycle. The filter box accepts status tokens, so typing a status filter and then enabling watch mode means only the currently failing tests re-run on save, which keeps the loop instant even in a thousand-test suite. The action log supports keyboard navigation: select an action and use the arrow keys to step forward and backward through the timeline, watching the before and after snapshots flip without touching the mouse.

\`\`\`bash
# A typical power-user session: scope to one file, let watch mode
# re-run on every save, and iterate on locators with Pick locator.
npx playwright test tests/checkout.spec.ts --ui

# When a test is fixed, widen the filter to the whole describe block
# and confirm nothing else regressed before committing.
npx playwright test tests/checkout.spec.ts --ui -g "Checkout flow"
\\\`\\\`\\\`

Another habit worth building is reading the action durations in the log. A step that takes several seconds when it should be instant often signals an implicit wait or a slow network call, and the duration column surfaces it without any profiling. Combined with the Network tab, a slow action plus a pending request is an immediate diagnosis. Power users also keep two browser projects in the tree — for example chromium and firefox — and re-run the same failing test across both to confirm whether a bug is browser-specific before they spend time fixing it.

## How UI Mode Fits a Team Workflow

UI Mode is local, but it shapes how an entire team debugs. The recommended flow is that every engineer writes and debugs tests in UI Mode, commits the spec, and lets CI run headless with tracing enabled. When CI goes red, the failure artifact is a \`trace.zip\` that anyone can open in the trace viewer using the exact same interface they already know from UI Mode — same timeline, same snapshots, same network tab. That shared mental model is the real payoff: there is one debugging interface, used locally as UI Mode and remotely as the trace viewer, so onboarding a new tester takes an afternoon rather than a week.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('a spec written and debugged in UI Mode, then run headless in CI', async ({
  page,
}) => {
  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('qa@example.com');
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Web-first assertion auto-retries; the same trace recorded in CI
  // opens in the trace viewer with the identical timeline you saw locally.
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
\\\`\\\`\\\`

This continuity is also why teams standardize on role-based locators generated by Pick locator: the selectors are readable in code review, stable across runs, and accessible by default, so the tests double as lightweight accessibility checks. For the framework-level decision of whether Playwright is even the right tool for your platform, weigh the trade-offs in [Appium vs Playwright 2026](/blog/appium-vs-playwright-2026).

## Frequently Asked Questions

### How do I open Playwright UI Mode?

Run \`npx playwright test --ui\` in your project root. UI Mode is built into \`@playwright/test\`, so there is nothing extra to install. It opens an interactive window with your test tree, an action timeline, and tabs for source, console, and network. You can scope it to a file with \`npx playwright test path/to/spec.ts --ui\`.

### What is the difference between UI Mode and trace viewer?

UI Mode is a live local development tool: you run, edit, watch, and pick locators interactively. The trace viewer is a post-mortem tool that opens a recorded \`trace.zip\`, typically downloaded from a CI failure, using the same time-travel interface. Use UI Mode while writing tests locally and the trace viewer to investigate failures that happened on a remote runner.

### Does Playwright UI Mode support watch mode?

Yes. Toggle the eye icon next to a test or the whole tree and Playwright re-runs those tests automatically whenever you save a source file. Watch mode creates a tight edit-and-see loop, so you change a locator, save, and watch the result update in under a second without ever switching back to the terminal.

### How does time travel work in UI Mode?

Playwright records a DOM snapshot before and after every action in your test. In UI Mode you click any action in the log, or scrub the timeline at the top, to view the page exactly as it looked at that moment. This lets you inspect the real page state right before a failed assertion instead of only seeing the post-failure page.

### Can I generate locators in UI Mode?

Yes. Click the Pick locator button in the toolbar, then hover any element in a DOM snapshot. UI Mode displays the recommended Playwright locator, usually a role-based one such as \`getByRole('button', { name: 'Submit' })\`, and clicking the element copies it. The generated locators favor accessibility-friendly selectors, which makes them more resilient than CSS or XPath.

### How is UI Mode different from --debug and PWDEBUG?

UI Mode is a visual, run-and-edit cockpit with time travel and watch mode but no live breakpoints. The \`--debug\` flag (and the \`PWDEBUG=1\` environment variable) opens the Playwright Inspector and steps through the test live in a real browser, letting you pause on breakpoints. Use UI Mode for most debugging and \`--debug\` only when you must pause execution mid-step.

### Can UI Mode help debug flaky tests?

Absolutely. Run a flaky test repeatedly inside UI Mode and compare timelines across runs. When it fails, scrub to the action just before the failure and check the DOM snapshot and the Network tab. A common discovery is an assertion racing an in-flight request, which you fix by switching to a web-first assertion that auto-retries until the UI actually updates.

### Does UI Mode work in CI?

UI Mode itself is a local, interactive tool and does not run in CI. For CI you record traces by setting \`trace: 'on-first-retry'\` in your config, then download the resulting \`trace.zip\` and open it with \`npx playwright show-trace\`. The trace viewer gives you the same time-travel interface, so your UI Mode skills transfer directly to debugging remote failures.

## Conclusion

Playwright UI Mode turns debugging from guesswork into observation. With one flag you get a test tree, a time-travel timeline, live DOM snapshots, watch mode, an interactive locator picker, and source, console, network, and error tabs — everything you need to find why a test failed without adding a single \`console.log\`. Develop locally in UI Mode, record traces in CI, and open those traces in the trace viewer when failures happen on a runner you cannot reach. Reserve \`--debug\` for the rare case you need a live breakpoint.

Make \`npx playwright test --ui\` your default loop this week and your debugging time will collapse. To package these workflows so an AI coding agent can drive the debugger for you, explore the reusable QA skills at [qaskills.sh/skills](/skills), and continue with our [trace viewer debugging guide](/blog/playwright-trace-viewer-debugging-guide) for the CI post-mortem half of the story.
`,
};
