import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright show-trace CLI: Open trace.zip Locally',
  description:
    'Complete reference for npx playwright show-trace: open trace.zip files, --port, --host, viewing CI traces, trace.playwright.dev, and attaching to Allure reports.',
  date: '2026-06-06',
  category: 'Reference',
  content: `
# Playwright show-trace CLI: Open trace.zip Locally

\`npx playwright show-trace trace.zip\` is the single command you reach for after a Playwright test fails in CI. The trace file - a zipped bundle of DOM snapshots, network requests, console messages, action logs, and screenshots - tells you everything about what happened during the failing run. The \`show-trace\` CLI opens this file in a local browser-based trace viewer where you can replay the test action by action, scrub through DOM snapshots, inspect network calls, and read console output. There is no other Playwright tool as efficient for diagnosing real failures.

This guide is the definitive reference for the \`show-trace\` CLI in 2026. We cover the command itself, every flag, the trace.playwright.dev hosted viewer, attaching traces to Allure reports, and the workflow for sharing traces with teammates who do not have Playwright installed. Every example uses Playwright 1.49+ and shows the exact CLI invocation.

For an overview of Playwright debugging tools, see [Playwright Debug Mode + Inspector](/blog/playwright-debug-mode-inspector-2026). For the trace viewer UI itself, see [Playwright Test Trace Viewer 2026](/blog/playwright-test-trace-viewer-official-2026). The [playwright-e2e skill](/skills/playwright-e2e) configures trace recording automatically.

## What is a Playwright trace

A Playwright trace is a single \`.zip\` file containing:

- A timeline of every action and assertion the test performed.
- A DOM snapshot before and after each action.
- All network requests with their headers, body, and response.
- All browser console messages.
- A screenshot at every step (when configured).
- A video of the test run (when configured).
- Source code references with line numbers.

The trace is recorded by the Playwright runtime when you enable it in config. The default is to record only on retries, which keeps storage low while still capturing failures.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    trace: 'on-first-retry', // record only when a test retries
  },
});
\`\`\`

Other valid \`trace\` values:

| Value | Behavior |
|---|---|
| \`'off'\` | No traces ever |
| \`'on'\` | Record every test (large artifacts) |
| \`'retain-on-failure'\` | Record always, keep only for failures |
| \`'on-first-retry'\` | Record only on first retry (recommended) |
| \`'on-all-retries'\` | Record on every retry |

After the run, the trace appears in \`test-results/<test-name>/trace.zip\`. CI systems usually archive this as a build artifact.

## The show-trace command

\`\`\`bash
npx playwright show-trace trace.zip
\`\`\`

This:

1. Starts a local HTTP server on a free port (default 9322).
2. Opens your default browser at \`http://localhost:9322\`.
3. Loads the specified trace file.
4. Serves the trace viewer UI (the same UI as the Playwright Inspector trace tab).

The command stays running until you press Ctrl-C. While running, you can refresh the page, navigate within the viewer, and inspect every detail of the recorded test.

\`\`\`bash
# Open a trace from a CI artifact you downloaded
npx playwright show-trace ~/Downloads/trace.zip

# Open the trace from the latest local test run
npx playwright show-trace test-results/login-spec-ts-should-sign-in-chromium/trace.zip
\`\`\`

You do not need Playwright installed in the project where the trace was recorded. Any directory with \`npx\` works. This is what makes traces shareable.

## --port: choose the port

If port 9322 is in use, override it:

\`\`\`bash
npx playwright show-trace --port 9999 trace.zip
\`\`\`

This is useful when you want to open multiple traces at once for side-by-side comparison:

\`\`\`bash
# Terminal 1
npx playwright show-trace --port 9322 trace-old.zip

# Terminal 2
npx playwright show-trace --port 9323 trace-new.zip
\`\`\`

Each opens in a separate tab. You can switch between them to compare a passing run with a failing one.

## --host: bind to a network interface

By default the viewer listens on \`127.0.0.1\` (localhost only). To expose to your LAN:

\`\`\`bash
npx playwright show-trace --host 0.0.0.0 trace.zip
\`\`\`

Useful for showing a trace to a teammate on the same network without sharing the file. They open \`http://<your-ip>:9322\` and see the viewer.

For sharing across the internet, use the hosted trace.playwright.dev (covered later) rather than exposing your local server.

## --browser: pick which browser opens

The viewer launches your system default browser. Override with:

\`\`\`bash
npx playwright show-trace --browser chromium trace.zip
\`\`\`

Valid values: \`chromium\`, \`firefox\`, \`webkit\`. Useful when the trace was recorded in WebKit and you want the viewer in the same engine for fidelity.

## --output: extract trace artifacts

\`--output\` extracts the trace contents to a directory without opening the viewer:

\`\`\`bash
npx playwright show-trace --output extracted/ trace.zip
\`\`\`

The directory then contains:

| File or directory | Contents |
|---|---|
| \`trace.network\` | Newline-delimited JSON of network events |
| \`trace.trace\` | Newline-delimited JSON of all actions |
| \`resources/\` | Binary resources (images, fonts, etc.) |
| \`screencast/\` | Video frames (if video was enabled) |

This is mostly useful for tooling that needs to parse trace data programmatically (custom dashboards, AI failure analysis). For human inspection, just open the viewer.

## Viewing a trace without installing Playwright

The hosted viewer at \`https://trace.playwright.dev\` accepts a trace.zip via drag-and-drop. You upload the file, the viewer parses it locally in your browser (the data never leaves your machine), and you see the same UI as \`show-trace\` produces.

This is the recommended workflow for sharing traces:

1. Download the trace.zip from your CI artifact storage.
2. Open https://trace.playwright.dev in any browser.
3. Drag the trace.zip onto the page.
4. Inspect the failure exactly as you would with \`show-trace\`.

There is no installation, no port, no command line. The price is that you must trust trace.playwright.dev with the trace data (technically you can verify the page parses locally by going offline after load).

## CI integration: recording traces

The recommended CI configuration:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
\`\`\`

In CI:

- Tests run with retries enabled.
- A failing test retries once with full trace recording.
- If the retry fails, trace.zip is preserved in \`test-results/\`.
- Your CI workflow uploads the entire \`test-results/\` directory as an artifact.

GitHub Actions example:

\`\`\`yaml
- name: Run Playwright tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-results
    path: test-results/
    retention-days: 7
\`\`\`

When a test fails, the GitHub UI shows the artifact link. You download \`playwright-results.zip\`, extract, and run \`show-trace\` on the relevant trace.zip inside.

## A complete CI-to-local workflow

End-to-end, the workflow looks like this:

\`\`\`bash
# 1. Test fails on CI
# GitHub Actions shows "playwright-results.zip" as an artifact

# 2. Download from GitHub Actions
gh run download <run-id> --name playwright-results

# 3. Locate the failing test's trace
ls playwright-results/test-results/
# login-spec-ts-should-sign-in-chromium/
# signup-spec-ts-should-validate-email-chromium/

# 4. Open the trace
npx playwright show-trace playwright-results/test-results/login-spec-ts-should-sign-in-chromium/trace.zip

# 5. Browser opens, viewer loads, debug
\`\`\`

This loop typically takes under a minute and tells you exactly what went wrong.

## Attaching traces to Allure reports

If you use Allure for test reporting, you can attach the trace.zip to each Allure test result so it appears alongside the screenshot and video. Use \`allure-playwright\`:

\`\`\`bash
npm install -D allure-playwright
\`\`\`

Configure in \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['html'],
    ['allure-playwright', { detail: true, suiteTitle: false }],
  ],
  use: {
    trace: 'on-first-retry',
  },
});
\`\`\`

After a run, the Allure report includes a "Trace" attachment for each failed test. Allure renders it as a downloadable file with a link to open in trace.playwright.dev.

For a deeper walkthrough, see [Playwright trace.attach + Allure Export](/blog/playwright-trace-attach-allure-export-guide).

## Manual trace attachments

You can also attach a trace explicitly from within a test:

\`\`\`typescript
import { test } from '@playwright/test';
import * as fs from 'fs';

test('with manual trace attach', async ({ page, context }, testInfo) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  await page.goto('https://example.com');
  await page.getByRole('button', { name: 'Continue' }).click();

  const tracePath = testInfo.outputPath('trace.zip');
  await context.tracing.stop({ path: tracePath });

  await testInfo.attach('trace', {
    path: tracePath,
    contentType: 'application/zip',
  });
});
\`\`\`

The trace.zip appears in the HTML report as an attachment. From there, you can download and open with \`show-trace\`, or upload to trace.playwright.dev.

## What you see in the trace viewer

The viewer has five panes:

| Pane | Contents |
|---|---|
| Timeline | Chronological actions with timing bars |
| Snapshot | DOM at the selected action (before/after) |
| Actions | Detailed log of every Playwright call |
| Network | All HTTP requests with headers/bodies |
| Source | Test source code with the current line highlighted |

Click any action in the Actions pane: the Snapshot updates to show the DOM at that moment, the Source highlights the line, and the Network filters to the relevant requests. This correlation across panes is what makes the trace viewer so much more useful than separate logs.

For the detailed UI walkthrough, see [Playwright Test Trace Viewer 2026](/blog/playwright-test-trace-viewer-official-2026).

## Trace files vs HTML reports for failure diagnosis

The HTML report and the trace.zip cover different needs. The HTML report is the summary surface - it tells you which tests failed, how long they took, and a one-line error. The trace.zip is the deep surface - it tells you exactly what the page looked like when the test failed, what HTTP requests were in flight, what the console said, and what locator Playwright tried.

| Diagnostic question | Tool |
|---|---|
| Which tests failed? | HTML report |
| How long did the suite take? | HTML report |
| What error did the assertion produce? | HTML report (and trace) |
| What did the page look like when it failed? | Trace |
| Was a network request hanging? | Trace network pane |
| Was there a console error explaining the failure? | Trace console |
| What was the DOM state before the failing action? | Trace snapshot |
| Did the locator match the right element? | Trace step info |

For most CI failures, the workflow is: open the HTML report, find the failing test, click "View Trace", drill into the action that turned red, examine the snapshot. The whole loop is under 30 seconds when set up correctly.

## Reading trace.network and trace.trace manually

The trace.zip contents are documented JSON. If you need to extract data programmatically (e.g., to feed an LLM-based failure-analysis tool), the format is:

\`\`\`bash
# Extract to a directory
npx playwright show-trace --output extracted/ trace.zip

# Inspect the action log
cat extracted/trace.trace | head -20
# Each line is a JSON object: { type, timestamp, action, snapshotName, ... }

# Inspect network events
cat extracted/trace.network | head -20
# Each line is a JSON object: { type, requestId, url, method, status, ... }
\`\`\`

The schema is reasonably stable across Playwright versions; the viewer itself parses these files. For automated triage, you can grep for assertion failures, count network errors, or extract timing data.

## show-report vs show-trace

| Command | Opens |
|---|---|
| \`npx playwright show-report\` | The HTML report directory (playwright-report/) |
| \`npx playwright show-trace\` | A single trace.zip file |

The HTML report is the overview: pass/fail count, durations, errors. Each test in the report has a "View Trace" button that calls \`show-trace\` under the hood.

\`\`\`bash
# Open the overview report
npx playwright show-report

# Click "View Trace" in the report -> opens show-trace for that test
\`\`\`

You usually start with show-report (the overview) and drill into show-trace (the detail) for the specific failing test.

## Trace files for headless and headed runs

Traces are identical between headed and headless runs. The viewer reconstructs the DOM and renders it client-side regardless of how the test was originally run. This is what enables debugging a CI-only failure from a local machine.

## Troubleshooting common show-trace issues

### "Failed to load trace.zip"

The most common cause is a corrupted download from CI artifact storage. Re-download. The second cause is a file size mismatch when the upload was truncated; check the artifact size in your CI logs against the trace.zip size locally.

### "Trace contains no actions"

This usually means \`tracing.start\` was never called for that test. Check your \`playwright.config.ts\` for the \`trace\` option. If it is \`'off'\`, no trace is produced even on failure. Set to \`'on-first-retry'\` or \`'retain-on-failure'\`.

### "Port already in use"

Another \`show-trace\` instance is running on the default port. Use \`--port 9999\` or close the existing instance. \`lsof -i :9322\` lists processes using the default port.

### Browser does not open

The viewer launches your default browser. If that fails, the terminal still shows the URL (\`http://localhost:9322\`). Open it manually in any browser.

### Snapshot looks blank

The trace was likely recorded with \`snapshots: false\`. Default is \`true\` for tests; if you manually called \`tracing.start({ snapshots: false })\`, change it. DOM snapshots are the core of the viewer's usefulness.

## Recording traces selectively

Sometimes you only want a trace for one specific failing scenario, not the entire suite. Use \`test.use({ trace: 'on' })\` for that test only:

\`\`\`typescript
import { test } from '@playwright/test';

test.describe('important flow', () => {
  test.use({ trace: 'on' });

  test('always record this one', async ({ page }) => {
    await page.goto('/');
    // ...
  });
});
\`\`\`

Or per-test:

\`\`\`typescript
test('focused trace', async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await page.goto('/');
  // ...
  await context.tracing.stop({ path: 'focused-trace.zip' });
});
\`\`\`

The second pattern gives you the trace.zip file directly, ready to open with show-trace.

## Performance notes

A trace.zip is typically 1-10 MB for a 30-second test, including DOM snapshots and screenshots. With video, it can hit 50 MB. For very long tests (5+ minutes), use \`trace: 'on-first-retry'\` instead of \`'on'\` so you only pay the storage cost when needed.

The viewer loads a 50 MB trace in 2-5 seconds on a modern machine. Trace files are reasonable to attach to bug reports, Slack messages, or GitHub issues.

## Trace artifacts vs flaky-test heuristics

Trace artifacts are factual: they show exactly what happened on that run. They do not tell you whether the failure is reproducible or whether it is a one-off. For that you need flaky-test detection - typically by running the test multiple times and counting failures.

Most CI systems can be configured to retry on failure (\`retries: 2\` in Playwright config), then surface tests that pass on retry as "flaky" rather than "failed". Combined with traces from the failing attempts, you have everything you need to diagnose a flaky test.

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  retries: 2,
  use: { trace: 'on-first-retry' },
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'results.xml' }],
  ],
});
\`\`\`

The JUnit XML report distinguishes between failed and flaky outcomes; many CI dashboards (CircleCI, BuildKite, Datadog Test Optimization) visualize the distinction.

## Comparing two traces in trace.playwright.dev

A surprisingly useful pattern: download a passing run's trace and a failing run's trace, then load both in trace.playwright.dev. You can step through them side by side and find the divergence point - usually one specific action or network call that produces different results.

Common divergences:

| Divergence | Likely cause |
|---|---|
| Different request body | Stale data fixture, time-based input |
| Different response | Backend race condition, cache state |
| Element matched different node | DOM re-render race |
| Different actionability check failed | Timing-sensitive layout |
| Different network latency | Real CI network jitter |

Once you find the divergence, you fix the root cause: stabilize the input, mock the backend, or add a deterministic wait.

## Frequently Asked Questions

### What does npx playwright show-trace do?

It opens a Playwright trace.zip file in a local browser-based trace viewer. The viewer shows a timeline of every test action, DOM snapshots at each step, all network requests, console output, and the test source code. It is the canonical way to debug a Playwright test after the fact, especially for CI failures.

### How do I open trace.zip without installing Playwright?

Use the hosted viewer at https://trace.playwright.dev. Drag your trace.zip file onto the page; the viewer parses it locally in your browser. No installation, no command line. This is also the easiest way to share a trace with someone who does not have Playwright set up.

### Where does Playwright store trace.zip files?

In \`test-results/<test-name>/trace.zip\` after a test run with tracing enabled. CI systems usually archive this directory as a build artifact. Locally, \`npx playwright show-report\` opens the report which links to each trace via "View Trace" buttons.

### How do I change the port the trace viewer runs on?

Pass \`--port\`: \`npx playwright show-trace --port 9999 trace.zip\`. The default is 9322. Useful when 9322 is taken or when running multiple viewers in parallel for side-by-side comparison of two traces.

### Can I attach a Playwright trace to an Allure report?

Yes. Install \`allure-playwright\` and configure it as a reporter in \`playwright.config.ts\`. With \`trace: 'on-first-retry'\` enabled, every failed test's trace.zip is automatically attached to its Allure result. See the [trace.attach + Allure Export guide](/blog/playwright-trace-attach-allure-export-guide) for the full pattern.

### What is the difference between show-report and show-trace?

\`show-report\` opens the high-level HTML report (pass/fail summary, durations, errors). \`show-trace\` opens a single trace.zip file with step-by-step playback. The HTML report links to traces via "View Trace" buttons, so you usually use show-report first and drill in via show-trace.

### Can I view a Playwright trace offline?

Yes. \`npx playwright show-trace\` runs entirely locally - it spins up a local HTTP server and serves the viewer from your machine. No internet required after Playwright is installed. trace.playwright.dev also parses traces locally in your browser, so you can use it offline after the initial page load.

### How large can a Playwright trace.zip be?

Typical traces are 1-10 MB for a 30-second test. With video recording enabled and many DOM snapshots, traces can hit 50 MB or larger. The viewer handles up to several hundred MB on modern machines. For very long tests, prefer \`trace: 'on-first-retry'\` over \`'on'\` to keep storage manageable.

## Conclusion

\`npx playwright show-trace trace.zip\` and the hosted trace.playwright.dev viewer are the two ways to inspect a Playwright trace in 2026. The local CLI is best for fast iteration on your machine; the hosted viewer is best for sharing failures with teammates who do not have Playwright installed.

Configure your CI to record traces with \`trace: 'on-first-retry'\`, upload \`test-results/\` as an artifact, and any failing test becomes a one-command diagnostic session. For automatic trace attachment to Allure reports, see [Playwright trace.attach + Allure Export](/blog/playwright-trace-attach-allure-export-guide). For the trace viewer UI itself, see [Playwright Test Trace Viewer 2026](/blog/playwright-test-trace-viewer-official-2026).

The [playwright-e2e skill](/skills/playwright-e2e) configures trace recording in every Playwright project Claude Code, Cursor, or Aider scaffolds. Install once and every test you generate is ready to debug.
`,
};
