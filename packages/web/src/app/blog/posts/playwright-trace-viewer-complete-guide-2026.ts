import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Trace Viewer: Complete 2026 Guide with show-trace CLI',
  description: 'Master the Playwright Trace Viewer in 2026. Learn how to capture, open, and analyze trace.zip files with the show-trace CLI, trace.on configuration, screenshots, snapshots, network logs, and console output for debugging flaky tests.',
  date: '2026-05-22',
  category: 'Guide',
  content: `
The Playwright Trace Viewer is the single most powerful debugging tool in the entire test automation ecosystem. When a test fails in CI at 3 AM, the trace tells you exactly what happened: the DOM at each step, every network request, console logs, source code, and a frame-by-frame timeline you can scrub through like a video editor.

This complete 2026 guide walks through every aspect of the Trace Viewer: how to enable trace recording, how to open trace.zip files with the \`show-trace\` CLI, how to read every panel, and how to use traces to solve the kinds of flaky-test mysteries that used to take days to debug.

---

## Table of Contents

1. [What Is the Playwright Trace Viewer?](#what-is-trace-viewer)
2. [Enabling Trace Recording](#enabling-trace-recording)
3. [Opening a Trace with show-trace CLI](#opening-trace-show-trace-cli)
4. [Trace Viewer UI Walkthrough](#trace-viewer-ui-walkthrough)
5. [Trace Configuration Options](#trace-configuration-options)
6. [Trace in CI: Best Practices](#trace-in-ci-best-practices)
7. [Debugging Flaky Tests with Trace](#debugging-flaky-tests-with-trace)
8. [Trace File Format Internals](#trace-file-format-internals)
9. [Frequently Asked Questions](#frequently-asked-questions)

---

## What Is the Playwright Trace Viewer? {#what-is-trace-viewer}

The Trace Viewer is a graphical, browser-based tool that lets you replay any recorded Playwright test step by step. Instead of guessing what went wrong from a stack trace, you scrub through the actual DOM snapshots that Playwright captured at each action.

A trace is stored as a single \`.zip\` file (typically named \`trace.zip\`) containing:

- **Action log:** every Playwright API call (click, fill, expect) with timestamps
- **DOM snapshots:** the full HTML before and after each action
- **Screenshots:** PNG captures at each step
- **Network requests:** every request/response with headers and bodies
- **Console messages:** logs, warnings, errors from the page
- **Source code:** which line of your test code triggered each action
- **Test annotations:** describe blocks, fixtures, and metadata

Unlike video recordings, the trace is **interactive**: you can hover the DOM, inspect element styles, and even click on logged elements to see which locator selected them.

### Why Trace Viewer Beats Other Debug Tools

| Tool                  | What It Shows         | Interactive? | Works in CI? |
| --------------------- | --------------------- | ------------ | ------------ |
| Video recording       | Visual only           | No           | Yes          |
| Screenshots           | Single frame          | No           | Yes          |
| Headed mode           | Live browser          | Yes          | No           |
| Playwright Inspector  | Live debug only       | Yes          | No           |
| **Trace Viewer**      | **Everything, replayable** | **Yes**      | **Yes**      |

---

## Enabling Trace Recording {#enabling-trace-recording}

You can enable tracing globally in \`playwright.config.ts\` or per-test. The most common configuration is to record traces only on first retry, which keeps CI artifacts small while still capturing failures.

### Global Configuration

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 1,
  use: {
    // 'on-first-retry' is the recommended default
    trace: 'on-first-retry',

    // Other options:
    // 'on' - record every test (heavy, useful locally)
    // 'off' - never record
    // 'retain-on-failure' - record all, keep only failed
    // 'on-all-retries' - record on every retry
  },
});
\`\`\`

### Programmatic API

For non-test scripts or custom fixtures, use the \`context.tracing\` API:

\`\`\`typescript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();

// Start tracing
await context.tracing.start({
  screenshots: true,
  snapshots: true,
  sources: true,
});

const page = await context.newPage();
await page.goto('https://example.com');
await page.getByRole('link', { name: 'More information' }).click();

// Stop and save
await context.tracing.stop({ path: 'trace.zip' });
await browser.close();
\`\`\`

### Per-Test Tracing

Sometimes you want trace on only for a single notoriously flaky test:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('flaky checkout flow', async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  try {
    await page.goto('/checkout');
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page).toHaveURL('/thank-you');
  } finally {
    await context.tracing.stop({ path: \`trace-\${test.info().title}.zip\` });
  }
});
\`\`\`

---

## Opening a Trace with show-trace CLI {#opening-trace-show-trace-cli}

Once you have a \`trace.zip\` file, the \`show-trace\` command launches the viewer in your default browser.

### Basic Usage

\`\`\`bash
npx playwright show-trace trace.zip
\`\`\`

This opens a local web server (default port 7050) and points your browser at the trace.

### Opening Traces from CI Artifacts

When a test fails in CI, Playwright stores the trace under \`test-results/<test-name>/trace.zip\`. Download the artifact and run:

\`\`\`bash
# After downloading the GitHub Actions artifact
unzip artifact.zip -d ./traces
npx playwright show-trace ./traces/test-results/checkout-flow/trace.zip
\`\`\`

### Opening from a URL

\`show-trace\` accepts URLs, useful when CI exposes artifacts via HTTPS:

\`\`\`bash
npx playwright show-trace https://ci.example.com/builds/123/trace.zip
\`\`\`

### Public Trace Viewer

Anthropic-style public hosting: you can also drag-and-drop \`trace.zip\` onto **trace.playwright.dev** in any browser. No installation required, useful for sharing traces with non-developers like designers or PMs.

### CLI Options

| Flag                    | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| \`--port <number>\`     | Use a specific port instead of 7050                     |
| \`--host <hostname>\`   | Bind to a specific host (default \`localhost\`)         |
| \`--browser <name>\`    | Open in chromium / firefox / webkit instead of default  |

---

## Trace Viewer UI Walkthrough {#trace-viewer-ui-walkthrough}

The Trace Viewer UI is organized into five major regions. Mastering each panel turns trace reading into a near-instant skill.

### 1. The Timeline (Top Bar)

A horizontal strip with thumbnails of every screenshot taken during the test. Hover any point on the timeline to see that exact frame; click to jump the entire UI to that point in the test.

The timeline is invaluable for **visual diff** debugging: you can immediately spot the frame where a modal appeared late, a button disappeared, or a layout shift broke a locator.

### 2. Actions Panel (Left)

A list of every Playwright API call, color-coded:

- **Green:** action succeeded
- **Red:** action failed
- **Yellow:** action retried

Click an action to:
- See **Before** and **After** DOM snapshots in the center
- Highlight the element that was clicked/filled in the snapshot
- See the source code line in the bottom panel

### 3. DOM Snapshot Viewer (Center)

This is the killer feature. The center panel renders the **actual HTML** at that moment in time, with the targeted element highlighted in pink. You can:

- Open DevTools on the snapshot (right-click) to inspect element styles
- See pseudo-states (hover, focus) that Playwright applied
- Toggle **Before** and **After** to see what changed

### 4. Tabs Panel (Right)

Tabs for diving deeper into one specific dimension:

| Tab        | Contents                                                      |
| ---------- | ------------------------------------------------------------- |
| Call       | Locator strategy + arguments + timeout                        |
| Log        | Internal Playwright log for that action (retry attempts etc.) |
| Errors     | Stack trace if the action failed                              |
| Console    | All \`console.log/warn/error\` from the page                  |
| Network    | All XHR / fetch / document loads with bodies and headers      |
| Source     | The exact test source file with the current line highlighted  |
| Attachments| Screenshots, videos, custom attachments                       |
| Metadata   | Browser, viewport, test config                                |

### 5. Source Panel (Bottom)

Shows your test source code with the currently-selected action highlighted. Lets you jump back and forth between test code and runtime behavior without switching tools.

---

## Trace Configuration Options {#trace-configuration-options}

Beyond the simple \`trace: 'on-first-retry'\` flag, the trace recorder accepts a granular object form:

\`\`\`typescript
export default defineConfig({
  use: {
    trace: {
      mode: 'on-first-retry',
      screenshots: true,        // include PNG screenshots
      snapshots: true,          // include DOM snapshots
      sources: true,            // bundle source code
      attachments: true,        // include test.info().attach() data
    },
  },
});
\`\`\`

### Trade-offs Table

| Option       | Disk Size Impact | Debug Value | Recommended For              |
| ------------ | ---------------- | ----------- | ---------------------------- |
| screenshots  | Medium           | High        | Always on                    |
| snapshots    | High             | Very High   | Always on                    |
| sources      | Low              | Medium      | On in dev, off in heavy CI   |
| attachments  | Variable         | High        | On if using \`info.attach\`  |

Disabling \`sources\` shaves several megabytes per trace but means you cannot navigate from action to source line. For most teams, keep all four on.

---

## Trace in CI: Best Practices {#trace-in-ci-best-practices}

### Recipe 1: GitHub Actions Artifact Upload

\`\`\`yaml
- name: Run Playwright tests
  run: npx playwright test

- name: Upload trace on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-traces
    path: test-results/
    retention-days: 7
\`\`\`

### Recipe 2: Slack-Friendly Failure Summary

Use \`test.info().attach()\` to add the trace URL to the failure message:

\`\`\`typescript
test.afterEach(async ({}, testInfo) => {
  if (testInfo.status !== 'passed') {
    const traceLink = \`https://ci.example.com/run/\${process.env.RUN_ID}/trace.zip\`;
    testInfo.annotations.push({ type: 'trace', description: traceLink });
  }
});
\`\`\`

### Recipe 3: Keep Trace Size Manageable

Traces over 100 MB indicate a problem. Common causes:

- Recording an entire 10-minute test instead of one user journey
- Many large images uploaded during the run
- High-resolution screenshots on \`screenshots: true\` (default is sane)

Split mega-tests into smaller specs to keep each trace under 20 MB.

---

## Debugging Flaky Tests with Trace {#debugging-flaky-tests-with-trace}

The trace is purpose-built for flaky-test forensics. Here is a step-by-step workflow that has saved teams thousands of hours.

### Step 1: Reproduce in CI, Not Locally

Flaky tests almost always reproduce in CI. Set \`trace: 'on-first-retry'\` and \`retries: 2\` so the trace from the first retry is captured.

### Step 2: Open the Trace and Find the Red Action

The Actions panel shows the failed step in red. Click it.

### Step 3: Compare Before vs After Snapshot

- Does the element exist in **Before**?  If not, the page rendered late.
- Does the element exist but is hidden? Check the \`Call\` tab for the locator and inspect Styles in DevTools.
- Did the URL change between snapshots? You may be racing a navigation.

### Step 4: Check Network and Console Tabs

- **Network:** look for a failed XHR right before the failure. Often a stale auth token or 503 from a flaky backend.
- **Console:** look for thrown errors, especially React/Vue hydration warnings.

### Step 5: Verify the Fix Eliminates the Race

Re-run with \`--repeat-each=20\` after applying your fix. The trace from any new failure tells you immediately whether your fix was sufficient.

---

## Trace File Format Internals {#trace-file-format-internals}

Power users sometimes need to parse traces programmatically (e.g., for custom dashboards). A \`trace.zip\` contains:

\`\`\`
trace.zip
├── trace.trace          # JSON-lines log of every action
├── trace.network        # JSON-lines log of network events
├── trace.stacks         # source maps and stack frames
├── resources/
│   ├── <sha1>.html      # DOM snapshots
│   ├── <sha1>.png       # screenshots
│   └── <sha1>.css       # captured stylesheets
└── test-info.json       # test config and metadata
\`\`\`

Each \`.trace\` line is a JSON object describing a single event. You can stream-read these to extract metrics like "average click duration" or "p95 navigation time."

---

## Frequently Asked Questions {#frequently-asked-questions}

### Where do trace files get stored by default?

In \`test-results/<test-name>/trace.zip\` relative to your project root.

### How do I open a trace without installing Playwright?

Drag and drop the \`trace.zip\` onto **trace.playwright.dev** in any browser.

### Can I record traces for non-test scripts?

Yes, use \`context.tracing.start()\` and \`context.tracing.stop({ path })\` directly.

### Does trace recording slow down tests?

Yes, by roughly 10–25%. That is why \`on-first-retry\` is the standard CI default.

### Can I view traces offline?

Yes. \`npx playwright show-trace\` runs entirely on localhost with no external requests.

### Can I attach custom data to a trace?

Use \`testInfo.attach('name', { body, contentType })\` and the data appears in the Attachments tab.

### How do I share a trace with a teammate?

Either ZIP the trace file and email it, or upload to a shared bucket and send the URL to \`show-trace\`.

### Are traces compatible across Playwright versions?

Mostly forward-compatible. A trace produced by Playwright 1.40 opens in 1.50 viewer. Reverse compatibility is not guaranteed.

---

## Related QASkills Skills

Install the Playwright debugging skill collection for instant access in your AI coding agent:

\`\`\`bash
npx qaskills add playwright-trace-viewer
npx qaskills add playwright-debugging
npx qaskills add playwright-ci-best-practices
\`\`\`

Browse the full directory at [qaskills.sh/skills](https://qaskills.sh/skills).

---

The Trace Viewer is the difference between guessing why a test failed and knowing why a test failed. Turn it on in CI today and your flaky-test backlog will shrink within a week.
`,
};
