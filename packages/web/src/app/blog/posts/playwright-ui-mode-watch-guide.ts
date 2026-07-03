import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright UI Mode & Watch Guide: Time-Travel Debugging in 2026',
  description:
    'A complete guide to Playwright UI mode and watch mode: the test tree, time-travel timeline, live DOM snapshots, pick locator, and watch-on-save explained.',
  date: '2026-07-03',
  category: 'Tutorial',
  content: `
# Playwright UI Mode & Watch Guide: Time-Travel Debugging in 2026

Playwright's **UI mode** is the single fastest way to write, run, and debug end-to-end tests. Launched with \`npx playwright test --ui\`, it opens a full graphical test runner: a filterable test tree on the left, a time-travel timeline of every action across the top, and live DOM snapshots you can hover, click, and inspect for any step. Turn on **watch mode** and Playwright re-runs your test the instant you save the file, closing the write-run-fix loop to a couple of seconds.

This guide walks through everything UI mode does — the test tree, the timeline, DOM snapshots, the **Pick locator** tool, watch mode, and the Source, Call, Network, Console, and Log tabs. You'll learn when to reach for UI mode versus the standalone Trace Viewer versus \`--debug\`, and pick up practical tips that make debugging feel effortless. If you're new to the framework, start with our [complete Playwright end-to-end testing guide](/blog/playwright-e2e-complete-guide) and come back here to master the debugger.

## What Is Playwright UI Mode?

UI mode is an interactive, browser-based test runner that ships inside Playwright — you don't install anything extra. It launches a local web app that talks to the Playwright test runner over a socket, so every run you trigger streams its actions, snapshots, and logs straight into the interface.

Start it from your project root:

\`\`\`bash
# Launch UI mode for the whole project
npx playwright test --ui

# Pin it to a host/port (useful in remote dev containers)
npx playwright test --ui-host=0.0.0.0 --ui-port=8123

# Open UI mode scoped to a single file
npx playwright test tests/checkout.spec.ts --ui
\`\`\`

The window that opens has three regions. On the left is the **test tree** — every spec, describe block, and test in your suite. Across the top of the main panel is the **timeline**, a horizontal strip of every action Playwright took. Below it is the **action list** paired with the **DOM snapshot viewer**, and a row of tabs (Actions, Metadata, Source, Call, Log, Console, Network, Attachments) that give you the full forensic picture of any step.

Unlike a plain \`npx playwright test\` run that dumps text to your terminal, UI mode keeps the whole run resident in memory. You can click any past action and the DOM snapshot rewinds to exactly what the page looked like at that moment. That is the "time-travel" superpower, and it's why most teams never go back to \`console.log\` debugging.

## Getting Started: Your First UI Mode Session

Let's use a small but realistic test so every feature has something to show. Save this as \`tests/checkout.spec.ts\`:

\`\`\`ts
import { test, expect } from '@playwright/test';

test.describe('Checkout flow', () => {
  test('adds an item and reaches the cart', async ({ page }) => {
    await page.goto('https://demo.playwright.dev/todomvc');

    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill('Buy Playwright license');
    await newTodo.press('Enter');

    await expect(page.getByTestId('todo-title')).toHaveText('Buy Playwright license');

    await page.getByRole('checkbox', { name: 'Toggle Todo' }).check();
    await expect(page.getByTestId('todo-item')).toHaveClass(/completed/);
  });
});
\`\`\`

Now run \`npx playwright test --ui\`. Expand the tree, click the test, and hit the play button (or press the run shortcut). Playwright executes the test in a real browser under the hood while the timeline fills in left-to-right. When it finishes green, you have a complete, explorable recording of the run sitting in front of you.

## The Test Tree: Finding and Filtering Tests

The left panel mirrors your suite structure — projects, files, \`describe\` blocks, and individual tests, each with a status dot (passed, failed, skipped, or not-yet-run). For anything beyond a handful of specs, the filter bar at the top is where you'll live.

You can filter by free text (matches test titles), and toggle chips filter by status and by project. A few patterns worth memorizing:

- Type part of a test title to narrow instantly — \`checkout\` shows only tests whose title contains "checkout".
- Click the **Failed** chip after a run to collapse everything except red tests — invaluable on a large suite.
- Use \`@tag\` syntax in the filter to match tests annotated with \`test('... @smoke', ...)\`.
- Switch projects (Chromium, Firefox, WebKit, or your custom projects) with the project selector so you're not re-running everything.

Each test row has its own play button, so you can run one test in isolation without touching the rest of the suite. Hover a row and you'll also see buttons to run and to watch just that test.

## Time-Travel Timeline: Every Action Recorded

The timeline is the horizontal filmstrip across the top of the main panel. Each segment is one action — \`goto\`, \`fill\`, \`press\`, \`check\`, \`expect\` — colored by category and sized by how long it took. Slow steps are literally wider, so a flaky wait or a heavy navigation jumps out visually.

Hover across the timeline and the DOM snapshot below scrubs frame-by-frame, exactly like scrubbing a video. This is the fastest way to answer "what did the page actually look like right before that click failed?" You'll often spot the problem — a modal covering the button, a spinner still visible, the wrong element in focus — without reading a single log line.

Click a segment to select that action. The action list highlights the matching step, the DOM snapshot jumps to that moment, and every tab (Call, Log, Network, Console) re-scopes to that action. Selecting an \`expect\` that failed shows you the "before" and "after" snapshots side by side so you can see whether the element was ever going to satisfy the assertion.

## Live DOM Snapshots: Inspect Any Step

The DOM snapshots in UI mode are not screenshots — they are real, interactive HTML captures of the page at each action. That distinction matters. You can:

- Open your browser's DevTools on the snapshot and inspect the live element tree.
- Hover elements to see the box model and computed layout.
- Confirm whether a locator would have matched by poking at the actual DOM Playwright saw.

Because the snapshot is the real DOM, it captures exactly the state Playwright's auto-waiting was evaluating. If a test failed because an element was \`hidden\` or \`detached\`, the snapshot proves it. Snapshots are captured **before** and **after** each action, so you can compare the page state on either side of a click to understand what the action changed.

## Pick Locator: Generate Selectors by Clicking

The **Pick locator** button (in the toolbar above the DOM snapshot) turns any snapshot into a locator-authoring surface. Click it, then hover over elements in the snapshot — Playwright highlights each candidate and shows the locator it would generate, preferring user-facing, resilient options in this order: role, label, placeholder, text, and finally test id.

Click an element and the generated locator drops into the locator input, ready to copy into your test. This is how you should be writing selectors in 2026 — let Playwright suggest \`getByRole('button', { name: 'Checkout' })\` instead of hand-crafting a brittle \`.btn.btn-primary:nth-child(3)\` chain.

\`\`\`ts
// What Pick locator typically hands you — accessible and stable:
await page.getByRole('button', { name: 'Checkout' }).click();
await page.getByLabel('Email address').fill('qa@example.com');
await page.getByPlaceholder('What needs to be done?').fill('Ship it');

// Instead of fragile, structure-coupled CSS:
await page.click('div.container > form > button.btn-primary');
\`\`\`

There's also a companion **locator playground**: type a locator into the input and UI mode highlights every match in the current snapshot in real time, telling you how many elements it resolves to. If it lights up two elements when you expected one, you've found your \`strict mode\` violation before it ever fails a run.

## Watch Mode: Re-Run on Every Save

Watch mode is the feature that changes how you work. In the test tree, click the **eye icon** next to a test (or a whole file) to watch it. From then on, every time you save a file that the test depends on, Playwright automatically re-runs it and refreshes the timeline and snapshots.

\`\`\`bash
# Watch mode is a toggle inside UI mode — no separate CLI flag needed.
# 1. Launch UI mode:
npx playwright test --ui
# 2. Click the eye icon on a test or file to watch it.
# 3. Edit tests/checkout.spec.ts, hit save, and watch it re-run instantly.
\`\`\`

The loop becomes: tweak a locator, save, glance at the timeline to see it pass or fail, repeat. You never leave the UI, never re-type a command, and never wait for the whole suite. Watch is dependency-aware — if your test imports a page object or a fixture and you edit that file, the watched test re-runs too.

A practical workflow for building a new test:

1. Write a rough skeleton with the actions you expect.
2. Watch the single test.
3. Save; if a locator fails, open the failing snapshot and use **Pick locator** to grab the correct one.
4. Paste it in, save again — green.
5. Add the next assertion and repeat.

Most engineers can author a solid, non-flaky test in a fraction of the time this way. If flakiness is your real problem, pair this with our [guide to fixing flaky tests](/blog/fix-flaky-tests-guide).

## The Tabs: Source, Call, Log, Console, Network

Below the timeline sits a tab row that turns UI mode from a viewer into a forensic tool. Each tab re-scopes to whatever action you've selected.

- **Actions** — the ordered list of every step; the spine of the whole view.
- **Metadata** — run info: browser, viewport, start time, duration.
- **Source** — your test file with the current action's line highlighted, so you always know which line of code produced the selected step.
- **Call** — the exact API call, its parameters, and the resolved locator, plus timing and whether auto-waiting had to retry.
- **Log** — Playwright's internal step log: what it waited for, which element it resolved, and why an action retried or timed out. This is usually where the root cause of a failure hides.
- **Console** — everything the page printed to \`console.*\`, so app-side errors surface next to the step that triggered them.
- **Network** — every request the page made during the action, with method, status, and timing; click a request to see headers and the response body.
- **Attachments** — screenshots, videos, traces, and any custom attachments your test produced.

When a test fails, the fastest triage is: select the failed action, read the **Log** tab for the "waiting for locator" message, glance at the **DOM snapshot** to confirm the element's state, and check **Network** if the failure smells like a slow or errored API call.

## UI Mode Panels & Tabs Reference

| Panel / Tab | What it shows | Best for |
|---|---|---|
| Test tree | All specs, describe blocks, tests with status | Finding, filtering, and running specific tests |
| Timeline | Horizontal filmstrip of every action, sized by duration | Spotting slow steps and scrubbing page state |
| DOM snapshot | Real interactive HTML before/after each action | Inspecting element state at the moment of failure |
| Pick locator | Click-to-generate resilient locators | Authoring role/label/text selectors fast |
| Locator playground | Live-highlight matches for a typed locator | Catching strict-mode multi-matches early |
| Source tab | Test file with the current line highlighted | Mapping an action back to your code |
| Call tab | API call, params, resolved locator, timing | Understanding what an action actually did |
| Log tab | Internal wait/retry log | Root-causing timeouts and flaky waits |
| Console tab | Page-side console output | Surfacing app JavaScript errors |
| Network tab | Requests with status, headers, response bodies | Debugging API-driven failures |
| Attachments | Screenshots, videos, traces | Grabbing artifacts for a bug report |

## UI Mode vs Trace Viewer vs Debug Mode

Playwright gives you three debugging surfaces and they overlap enough to confuse people. Here's how to choose.

**UI mode** (\`--ui\`) is for *local development* — writing tests and debugging failures on your own machine with live re-runs. It's the richest experience and the one you'll use daily.

**Trace Viewer** opens a \`trace.zip\` produced by a *previous* run, typically in CI. It has the same timeline, snapshots, and tabs as UI mode, but it's a post-mortem viewer for a recording rather than a live runner — you can't re-run or watch. It's how you debug a failure that happened on a machine you don't control.

**Debug mode** (\`--debug\`, backed by the Playwright Inspector) pauses execution and lets you step through actions line-by-line while the real browser is open. Use it when you need to interactively poke the live page mid-test or step through tricky timing.

\`\`\`bash
# Local authoring and debugging — your daily driver:
npx playwright test --ui

# Post-mortem a CI failure from its trace artifact:
npx playwright show-trace trace.zip

# Step through a single test line-by-line with the Inspector:
npx playwright test tests/checkout.spec.ts --debug
\`\`\`

To make sure CI always gives you a trace to open later, configure trace capture in \`playwright.config.ts\`:

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Keep a full trace only for tests that failed and are being retried.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  retries: process.env.CI ? 2 : 0,
});
\`\`\`

| Feature | UI mode (\`--ui\`) | Trace Viewer | Debug mode (\`--debug\`) |
|---|---|---|---|
| Primary use | Local authoring & debugging | Post-mortem of a past run | Interactive line-by-line stepping |
| Re-run tests | Yes | No | Yes (steps through) |
| Watch on save | Yes | No | No |
| Time-travel snapshots | Yes | Yes | Live page instead |
| Works in CI | No (local only) | Yes (opens artifacts) | No (needs a terminal) |
| Pick locator | Yes | Yes | Yes (via Inspector) |
| Network & console tabs | Yes | Yes | Limited |
| Input | Live test runner | \`trace.zip\` file | Live paused browser |

The short version: author and debug locally in **UI mode**, ship traces from CI and open failures in the **Trace Viewer**, and drop to **\`--debug\`** only when you need to interactively step through a stubborn timing issue.

## Running a Single Test or a Single Step

You rarely want to run the entire suite while iterating. UI mode makes narrowing trivial:

- **Single test** — click the play button on any row in the test tree.
- **Single file** — click play on the file node to run every test in it.
- **From a specific action** — you can't resume a live run mid-test, but you can inspect any single step in isolation by clicking it in the action list, which scopes every tab to just that step.
- **Only failed** — filter to the Failed chip, then run just those.

From the CLI you can pre-filter what UI mode even loads:

\`\`\`bash
# Only load tests whose title matches a pattern:
npx playwright test --ui -g "checkout"

# Only load a specific project:
npx playwright test --ui --project=chromium

# Only load one directory:
npx playwright test tests/smoke/ --ui
\`\`\`

Combining a title grep with watch mode on a single test is the tightest possible feedback loop for fixing one broken spec.

## CI Note: UI Mode Is Local-Only

This trips people up, so it's worth stating plainly: **UI mode is a local development tool and does not run in CI.** It needs an interactive browser window and a live socket connection to the runner, neither of which exists on a headless CI agent. There is no \`--ui\` flag you add to your pipeline.

What you use in CI is the plain runner plus **trace capture**. Your pipeline runs \`npx playwright test\`, and on failure it produces \`trace.zip\`, screenshots, and videos as artifacts. You download those and open the trace locally with \`npx playwright show-trace\` — which gives you the same timeline, snapshots, and tabs you know from UI mode, just for a run that already happened.

\`\`\`yaml
# .github/workflows/e2e.yml — no --ui here; capture traces instead.
name: E2E
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: \${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
\`\`\`

So the mental model is: **UI mode for your machine, Trace Viewer for CI failures.** They share a codebase and a look, but only one of them ever runs on the pipeline.

## Practical Tips for UI Mode

A handful of habits make UI mode dramatically more useful:

1. **Alias the command.** Add \`"tui": "playwright test --ui"\` to your \`package.json\` scripts so it's \`npm run tui\`.
2. **Watch one test, not the file, while debugging** — fewer re-runs, faster feedback.
3. **Lean on Pick locator for every new selector.** It bakes in accessibility-first best practices automatically.
4. **Read the Log tab first on failures.** The "waiting for locator ... to be visible" line usually tells you the answer before you even look at the snapshot.
5. **Use the locator playground to catch strict-mode issues** — if your locator matches two elements in the snapshot, fix it now.
6. **Keep the Network tab open for API-driven apps.** Half of "flaky" UI failures are actually slow or 500-ing backend calls.
7. **Open DevTools on a snapshot** when you need computed styles or the full element tree — it's the real DOM, so everything works.

For teams comparing frameworks, our [Cypress vs Playwright comparison for 2026](/blog/cypress-vs-playwright-2026) covers how UI mode stacks up against Cypress's own runner. And if you're assembling a broader QA toolchain, browse the ready-to-install [QA skills library](/skills) for agent-friendly Playwright and debugging skills.

## Frequently Asked Questions

### How do I enable watch mode in Playwright UI mode?

Watch mode lives inside UI mode, not as a separate CLI flag. Launch \`npx playwright test --ui\`, then click the eye icon next to any test or file in the test tree. Playwright will re-run that test automatically every time you save a dependent file — including page objects and fixtures it imports. Toggle the eye off to stop watching.

### What is the command to open Playwright UI mode?

Run \`npx playwright test --ui\` from your project root. To scope it, add a file path (\`npx playwright test tests/login.spec.ts --ui\`), a title filter (\`-g "checkout"\`), or a project (\`--project=chromium\`). In remote containers, bind it with \`--ui-host=0.0.0.0 --ui-port=8123\` so you can reach it from your host browser.

### Can I run Playwright UI mode in CI?

No. UI mode is strictly a local development tool — it needs an interactive browser window and a live socket to the test runner, which headless CI agents don't have. In CI you run the plain \`npx playwright test\` and capture traces, then download \`trace.zip\` and open it locally with \`npx playwright show-trace\` for the same time-travel debugging experience.

### What is the difference between UI mode and Trace Viewer?

UI mode is a live test runner for local authoring: you can run, watch, and re-run tests with instant feedback. Trace Viewer is a post-mortem viewer that opens a \`trace.zip\` from a run that already finished, usually in CI. They share the same timeline, DOM snapshots, and tabs, but Trace Viewer cannot run or watch tests — it only replays a recording.

### How does Pick locator generate selectors in Playwright?

Click the Pick locator button above the DOM snapshot, then hover elements in the snapshot. Playwright generates a locator for each, preferring resilient, user-facing options in order: role, label, placeholder, text, then test id. Clicking an element drops the suggested locator into the input to copy into your test — for example \`getByRole('button', { name: 'Checkout' })\` instead of a brittle CSS chain.

### Why isn't my test re-running when I save in watch mode?

Confirm the eye icon is actually toggled on for that test or file — watching is per-node, not global. Also make sure you're editing a file the test depends on; watch is dependency-aware, so an unrelated file won't trigger a re-run. If saves still do nothing, check that your editor is writing to disk (some "auto-save" setups debounce) and that no build error is blocking the runner.

### Does UI mode show network requests and console logs?

Yes. Select any action and the Network tab lists every request that action made — method, status, timing, headers, and response body — while the Console tab shows the page's \`console.*\` output for that step. This makes UI mode ideal for debugging API-driven failures, since you can correlate a failed assertion with the exact backend call that returned a 500 or timed out.

### Can I debug a single failing test without running the whole suite?

Absolutely. In the test tree, click the play button on just that test's row, or filter to the Failed chip after a run and run only the reds. You can also pre-scope UI mode from the CLI with a title grep (\`-g "login"\`) or a file path. Pair a single-test run with watch mode for the tightest possible fix-and-verify loop.

## Conclusion

Playwright UI mode collapses the write-run-debug cycle into one interactive surface: a filterable test tree, a time-travel timeline, real DOM snapshots, click-to-generate locators, and watch-on-save that re-runs the instant you hit save. Learn the tabs — especially Log and Network — and you'll diagnose most failures in seconds without ever adding a \`console.log\`. Keep UI mode for local work, lean on the Trace Viewer for CI failures, and drop to \`--debug\` only for stubborn timing bugs.

Ready to level up your whole QA workflow? Explore the [QA skills library](/skills) for install-ready Playwright, debugging, and accessibility skills built for AI coding agents.
`,
};
