import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Trace Viewer 2026: Annotations, Network, Sources',
  description:
    'Complete 2026 guide to the Playwright trace viewer: trace.zip anatomy, Actions tab, Network, Console, Sources, Snapshot, Step-info, comparing and sharing traces.',
  date: '2026-06-08',
  category: 'Reference',
  content: `
# Playwright Test Trace Viewer 2026: Annotations, Network, Sources

The Playwright trace viewer is the single most powerful debugging tool in the modern browser-testing stack. A trace.zip file captures the complete state of a test run - every DOM snapshot at every action, every network request with body and headers, every console message, every screenshot, the test source code with the active line highlighted, and the precise timing of everything that happened. The trace viewer replays this in a browser-based UI where you can scrub the timeline, click any action to see the DOM at that instant, inspect any network call, and read the console output in chronological order with the actions that triggered it. It is the closest thing to "time travel debugging" in browser automation, and as of Playwright 1.49 it is the standard troubleshooting interface for failing tests.

This guide is the complete 2026 reference for the trace viewer UI. We cover the trace.zip file format, the five main panes (Timeline, Snapshot, Actions, Network, Source), the annotation system, comparing two traces side by side, sharing traces with teammates via trace.playwright.dev, and the patterns for getting the maximum value out of trace recording in CI. Every section maps to a screen the viewer actually shows.

For the CLI that launches the viewer, see [Playwright show-trace CLI Reference](/blog/playwright-show-trace-cli-reference). For attaching traces to Allure reports, see [Playwright trace.attach + Allure Export](/blog/playwright-trace-attach-allure-export-guide). The [playwright-e2e skill](/skills/playwright-e2e) configures trace recording correctly for every test.

## What a trace.zip contains

A Playwright trace.zip is a single archive with multiple internal files:

| File | Contents |
|---|---|
| \`trace.trace\` | Newline-delimited JSON of all Playwright actions |
| \`trace.network\` | Newline-delimited JSON of all network events |
| \`resources/\` | Binary blobs (images, fonts, downloaded files) |
| \`screencast/\` | Video frames (when video was enabled) |
| \`screenshots/\` | Individual screenshots from \`screenshot: 'only-on-failure'\` |
| \`scripts/\` | Source code of the test |
| \`stacks/\` | Stack traces for each action |

You usually do not look inside the zip. The viewer parses it and presents the data.

## Opening the viewer

Three ways:

\`\`\`bash
# Local CLI
npx playwright show-trace trace.zip

# In the HTML report (click "View Trace")
npx playwright show-report

# Hosted viewer (drag trace.zip onto the page)
# https://trace.playwright.dev
\`\`\`

All three render the same UI. The hosted viewer parses the trace locally in your browser - the data never leaves your machine.

## The five main panes

When the viewer loads, you see five panes arranged around the main screen:

| Pane | Position | Contains |
|---|---|---|
| Timeline | Top | Chronological action bars |
| Actions | Left side | List of all actions and assertions |
| Snapshot | Center | DOM at the selected action |
| Network | Bottom | All HTTP requests |
| Source | Right side | Test source with line highlight |

You click an action in the Actions pane, and all other panes update to reflect that moment.

## Timeline

The Timeline at the top shows every action as a colored bar. Width = duration. Color encodes status:

| Color | Meaning |
|---|---|
| Green | Action succeeded |
| Red | Action failed (timeout, assertion failure) |
| Gray | Soft event (page load, network request) |

You can drag-select a region of the timeline to zoom in. Use the timeline to find slow actions (wide bars) or failing ones (red bars) at a glance.

A horizontal cursor moves with your selection in the Actions pane. Network requests appear as a separate row below the actions, so you can see exactly which action triggered which fetch.

## Actions pane

Every \`page.goto\`, \`locator.click\`, \`page.fill\`, \`expect\`, and other Playwright call appears as a line in the Actions pane. Each line shows:

- The method name and arguments.
- The duration in milliseconds.
- The status (success or failure).
- A stack trace icon you can click to see where in your test code the action was called from.

Click an action to focus the viewer on that moment. The Snapshot pane updates to show the DOM before and after, the Source pane highlights the line of the test, and the Network pane filters to requests that happened around that action.

## Snapshot pane

The Snapshot pane is the most distinctive trace viewer feature. It shows the DOM at the selected action, fully interactive: you can hover elements, click into them, open DevTools-like panels.

There are three snapshot modes:

| Mode | What you see |
|---|---|
| Before | DOM just before the action ran |
| Action | DOM during the action (e.g., during a click) |
| After | DOM after the action completed |

Toggle between them with the buttons at the top of the Snapshot pane. The "Before" snapshot shows what Playwright saw when it decided to act; "After" shows the result.

The snapshot is a reconstruction, not a screenshot. You can:

- Scroll the page.
- Hover elements to see them highlighted.
- Inspect the computed styles.
- Use the locator picker (same as the one in the Inspector).

For an iframe-heavy page, you can click into iframes and inspect their content. This is impossible with screenshots alone.

## Network pane

The Network pane lists every HTTP request and WebSocket frame during the test. Each row shows:

- Method (GET, POST, PUT, etc.)
- URL.
- Status code (color-coded: green 2xx, yellow 3xx, red 4xx/5xx).
- MIME type.
- Size.
- Duration.

Click a request to expand its details:

- Request headers.
- Request body (for POST/PUT/PATCH).
- Response headers.
- Response body (with syntax highlighting for JSON, HTML, etc.).
- Timing breakdown (DNS, TCP, TTFB, content download).

This is sufficient to diagnose most "the API call failed" cases without needing to reproduce the failure locally.

## Console pane

The Console pane (sometimes called the Logs tab) shows every \`console.log\`, \`console.warn\`, \`console.error\` from the page, plus Playwright's own diagnostic messages. Filter by log level (Error, Warn, Info, Log, Debug).

When the page logs an unhandled exception, it appears as an Error in the Console with a full stack trace. This often identifies the root cause of a test failure that looks like "the button is not visible" but is actually a JavaScript error preventing the button from rendering.

## Source pane

The Source pane shows your test file with line numbers. The currently selected action's line is highlighted. You can scroll the source to see the surrounding context.

Click any line in the source to jump to the next action on that line. Useful when you want to step through assertions in a long test.

If your test was bundled (Webpack, Vite, esbuild), the trace contains source maps and the viewer shows the original TypeScript, not the compiled output.

## Step info pane

For each action, the Step Info pane (collapsible right side) shows:

- The full Playwright call stack from your test to the failing action.
- The actionability checks Playwright performed (element attached, visible, stable, enabled).
- The exact selector resolution: how the locator was interpreted, which DOM nodes matched.
- The retry log: how many times each web-first assertion polled before passing or timing out.

The retry log is gold for diagnosing intermittent failures. It tells you whether an assertion was correct briefly and then went bad (race condition in the app) or stayed wrong the whole time (the app is broken).

## Annotations

Playwright tests can attach annotations that appear in the trace viewer. Common annotations:

\`\`\`typescript
import { test } from '@playwright/test';

test('with annotations', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'jira', description: 'TICKET-1234' });
  testInfo.annotations.push({ type: 'severity', description: 'critical' });
  testInfo.annotations.push({ type: 'note', description: 'flaky on Mondays' });

  await page.goto('/');
});
\`\`\`

In the viewer, annotations show as labels next to the test name. You can filter the report by annotation, useful for finding all "critical" failures or all tests linked to a specific JIRA ticket.

## Step annotations via test.step

Group related actions into a named step:

\`\`\`typescript
import { test } from '@playwright/test';

test('grouped steps', async ({ page }) => {
  await test.step('Log in', async () => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: 'Sign in' }).click();
  });

  await test.step('Open cart', async () => {
    await page.getByRole('link', { name: 'Cart' }).click();
    await expect(page).toHaveURL('/cart');
  });

  await test.step('Checkout', async () => {
    await page.getByRole('button', { name: 'Checkout' }).click();
    // ...
  });
});
\`\`\`

The trace viewer shows each step as a collapsible group in the Actions pane. Click to expand and see the underlying actions. Steps make long tests scannable.

## Comparing two traces

The viewer can compare a "before" trace with an "after" trace - useful when you fix a flaky test and want to confirm the new run differs only in the way you intended.

Open trace.playwright.dev and drag two trace.zip files. The viewer puts them side by side with the timelines synchronized. You can step through both simultaneously.

Common comparisons:

| Compare | Purpose |
|---|---|
| Passing vs failing run | Find the divergence point |
| Before vs after a fix | Verify the change works |
| Chromium vs Firefox | Find engine-specific issues |
| Local vs CI | Find environment-specific issues |

## Sharing traces

Traces are typically 1-10 MB and self-contained. Common sharing patterns:

1. **Slack/email attachment**: Send the trace.zip file directly.
2. **GitHub Issue**: Drag the file into a comment. GitHub preserves it.
3. **trace.playwright.dev URL**: There is no permanent URL (the viewer parses locally), so for sharing live, screen-share the viewer.
4. **CI artifact link**: Most CI systems generate a link to the trace artifact in build logs.

If you need a permanent shareable URL, host the trace.zip in S3 / GCS and link to it. The recipient drags it into trace.playwright.dev.

## Trace anatomy by tab

The viewer's tab navigation at the top:

| Tab | Shows |
|---|---|
| Actions | Default, all Playwright calls |
| Source | Test source code |
| Metadata | Test name, browser, viewport, retries |
| Errors | Filtered to failures only |
| Console | Browser console output |
| Network | All HTTP/WS traffic |
| Attachments | testInfo.attach payloads |

The Attachments tab is where screenshots, videos, and custom files appear. If you call \`testInfo.attach('debug-data', ...)\` in your test, the attachment shows up here.

## CI integration

The recommended trace configuration:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [['html', { open: 'never' }], ['list']],
});
\`\`\`

Then upload \`test-results/\` and \`playwright-report/\` as CI artifacts. Every failing test ends up with a trace.zip you can pull down and open.

## Diagnosing intermittent failures with traces

Intermittent failures are the hardest to debug because they only manifest occasionally. The trace viewer is the right tool for them:

1. **Enable retries with trace recording**: \`retries: 2, trace: 'on-first-retry'\`.
2. **Wait for the failure to recur in CI**. With retries, the test still passes overall but generates a trace.
3. **Compare the trace with a passing trace** in the viewer (drag both into trace.playwright.dev).
4. **Find the divergence point**. Usually one specific action has different timing or returns different data between runs.

Common intermittent failure patterns the trace viewer surfaces:

| Pattern | What the trace shows |
|---|---|
| Race condition | Two requests in different order between runs |
| Animation timing | "Before" snapshot has different opacity/transform |
| Network jitter | Same request takes 10x longer in one run |
| Element re-render | Locator matches a different node ID |
| Auth token expiry | One run gets 200, another gets 401 |

The Step Info pane is especially useful: it shows the actionability checks that were run. A flaky click that occasionally fails because "element receives pointer events" tells you the element is sometimes covered by another element.

## Trace viewer keyboard shortcuts

| Shortcut | Action |
|---|---|
| Left arrow | Previous action |
| Right arrow | Next action |
| Cmd/Ctrl + F | Search actions |
| Cmd/Ctrl + Shift + P | Open locator picker |
| Space | Toggle pane focus |
| Esc | Close current overlay |

These speed up navigation significantly once you internalize them.

## Performance and storage

Trace recording adds approximately 10-20% to test runtime. The default \`on-first-retry\` strategy avoids this cost for tests that pass on first try, recording only when needed.

Trace file size scales with test duration and DOM complexity:

| Test duration | DOM complexity | Typical size |
|---|---|---|
| 5-10 s | Simple page | 0.5-2 MB |
| 30 s | Medium app | 2-10 MB |
| 1 min | Complex app, video on | 20-50 MB |
| 5 min | Long, video on | 100-200 MB |

For very long tests, prefer \`trace: 'on-first-retry'\` and \`video: 'retain-on-failure'\` to control storage.

## Sources tab: TypeScript source maps

If your project uses TypeScript, Vite, or any bundler, the trace contains source maps. The Sources tab in the viewer shows your original TypeScript file with proper line numbers - not the compiled JavaScript. This makes debugging compiled tests as easy as debugging raw source.

For projects with mixed JavaScript and TypeScript, the source map indicates which language the file uses. The viewer highlights the correct line either way.

## Snapshot privacy and sensitive data

DOM snapshots capture everything visible on the page, including any text the user typed or that was rendered from server data. If your tests involve real user data (production-like), the trace can contain PII. Some considerations:

- **Local-only traces**: traces stay on the machine that ran the test. No data is transmitted unless you upload to trace.playwright.dev.
- **CI artifact retention**: traces archived as CI artifacts may persist for the retention window of your CI provider. Configure shorter retention for sensitive tests.
- **Redaction**: if you must avoid PII in traces, use \`page.route\` to replace sensitive response data with redacted versions during the test.

## Network pane filtering

The Network pane has filters at the top:

| Filter | Shows |
|---|---|
| All | Every request |
| Failed | Status 4xx, 5xx |
| Slow | Top 10% by duration |
| Fetch/XHR | Application API calls |
| Document | Page navigations |
| JS/CSS | Static resources |
| Images | All image requests |
| Media | Video/audio |
| WS | WebSocket frames |

The "Failed" filter is the most useful for diagnosis - it surfaces the requests that returned errors. Often the failing test is failing because of an unobserved 500 in a background API call.

## Trace viewer in the Playwright VS Code extension

The official Playwright VS Code extension embeds the trace viewer. After a test runs, the extension panel shows the trace inline next to the test code. This is the fastest local debugging surface - no separate command needed.

To open a trace in the VS Code extension:

1. Run the test from the Playwright sidebar (Run All / Run with Trace).
2. After completion, the trace icon appears next to the test name.
3. Click the icon to open the trace in a side panel.

The panel has the same Timeline, Actions, Network, Console, and Source tabs as the standalone viewer. The advantage is integration: clicking a line in the Source jumps to your editor on that line.

## Custom trace categories

When recording traces, you can choose what to capture:

\`\`\`typescript
await context.tracing.start({
  screenshots: true,
  snapshots: true,
  sources: true,
  // 'attachments' captures any testInfo.attach payloads in the trace
});
\`\`\`

| Option | Cost | Value |
|---|---|---|
| \`screenshots\` | Medium (1-2 MB) | Visual context, video-like scrubbing |
| \`snapshots\` | Medium (1-3 MB) | Interactive DOM at every action |
| \`sources\` | Small (50 KB) | Source code in viewer |
| \`attachments\` | Variable | User-added artifacts |

The default \`trace: 'on-first-retry'\` enables all of these. For storage-constrained environments, disable \`screenshots\` (the snapshots already provide most visual context) or \`attachments\`.

## Frequently Asked Questions

### How do I open a Playwright trace.zip file?

Run \`npx playwright show-trace trace.zip\` to open in a local viewer, or drag the file onto https://trace.playwright.dev for the hosted viewer. Both render the same UI: timeline, snapshot, actions list, network, console, and source code panes.

### What does the Snapshot pane show in the Playwright trace viewer?

A reconstruction of the DOM at the selected action. You can hover elements, scroll, and inspect computed styles - it is interactive, not a screenshot. Toggle between "Before", "Action", and "After" snapshots to see the DOM state before, during, and after the action.

### How do I see network requests in a Playwright trace?

The Network pane lists every HTTP and WebSocket request. Click any request to see headers, body, response, and timing breakdown. Network rows on the timeline align with the actions that triggered them, so you can correlate UI events with API calls.

### Can I compare two Playwright traces side by side?

Yes. Open trace.playwright.dev and drag two trace.zip files. The viewer puts them side by side with synchronized timelines. Useful for comparing a passing run with a failing one, or before-and-after a fix.

### What is the difference between actions and steps in the trace viewer?

Actions are individual Playwright calls (\`click\`, \`fill\`, \`expect\`). Steps are named groups defined with \`await test.step('Name', async () => { ... })\`. The viewer collapses steps in the Actions pane so long tests stay readable.

### How big can a Playwright trace.zip be?

Typical traces are 1-10 MB. With video and many snapshots, large tests can hit 50-200 MB. The viewer handles up to several hundred MB on modern machines. For storage control, prefer \`trace: 'on-first-retry'\` over \`trace: 'on'\`.

### How do I share a Playwright trace with a teammate?

Send the trace.zip file directly (Slack, email, GitHub Issue). The recipient opens it with \`npx playwright show-trace\` or drags it into trace.playwright.dev. The hosted viewer parses locally, so the file content never leaves the recipient's machine.

### What annotations can I add to a Playwright trace?

Via \`testInfo.annotations.push({ type, description })\`. Common types: \`jira\`, \`severity\`, \`note\`, \`flaky\`. The viewer displays annotations next to the test name and allows filtering. Combine with \`test.step\` for grouped, annotated actions.

## Conclusion

The Playwright trace viewer is the single most effective debugging tool in the modern test stack. The five panes (Timeline, Snapshot, Actions, Network, Source) plus the Console, Step Info, and Annotations tabs cover every dimension of a test run. Configure \`trace: 'on-first-retry'\` in CI and every failing test produces a complete diagnostic trace you can replay locally.

For the CLI that opens traces, see [Playwright show-trace CLI Reference](/blog/playwright-show-trace-cli-reference). For attaching traces to Allure reports, see [Playwright trace.attach + Allure Export](/blog/playwright-trace-attach-allure-export-guide). For broader Playwright best practices, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026).

Install the [playwright-e2e skill](/skills/playwright-e2e) so your AI agent (Claude Code, Cursor, Aider) configures trace recording correctly in every project it scaffolds. Compare debugging approaches across frameworks in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026).
`,
};
