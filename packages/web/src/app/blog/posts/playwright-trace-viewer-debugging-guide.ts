import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Trace Viewer: Debug Failed Tests Completely (2026)',
  description:
    'Master the Playwright Trace Viewer to debug flaky and failed tests. Learn to capture traces, read the timeline, scrub DOM snapshots, inspect network and console, and ship traces in CI.',
  date: '2026-06-23',
  category: 'Guide',
  content: `
# Playwright Trace Viewer: Debug Failed Tests Completely (2026)

A test passes a hundred times on your laptop, then fails once in CI at 2 a.m. with a cryptic timeout. You re-run the job, it goes green, and you move on without ever understanding what happened. That is the slow death of trust in an end-to-end suite. The Playwright Trace Viewer exists precisely to break this cycle. Instead of squinting at a stack trace and a single screenshot, you get a full recording of the test run: every action on a timeline, a DOM snapshot captured before and after each step that you can scrub through like a video, the complete network log, console messages, the source line that triggered each action, and the exact call log Playwright produced while waiting for elements.

This guide walks through everything you need to debug failed and flaky Playwright tests with traces in 2026. You will learn what a trace actually captures and why it beats console logs, how to enable tracing in \`playwright.config.ts\` with the right mode for your situation, how to open a trace three different ways, how to read the timeline and scrub DOM snapshots, how to inspect network and console panels, how to use traces to root-cause flaky tests, how to upload traces as artifacts from GitHub Actions, how to drive tracing programmatically in library mode, and how the Trace Viewer combines with the Inspector and UI mode. Every section includes runnable code you can paste into a real project. By the end you will treat a failed CI run not as a mystery but as a recording you can rewind.

## What the Trace Viewer Is and Why It Beats Console Logs

The Playwright Trace Viewer is a GUI that replays a recorded trace of a test run. A trace is a single \`.zip\` file that bundles a chronological timeline of every action (clicks, fills, navigations, assertions), DOM snapshots taken immediately before and after each action, screenshots, the full network waterfall, console output, the test source with the active line highlighted, and Playwright's internal call log showing exactly how it tried to locate and act on each element.

Console logs answer "what did my code print." A trace answers "what was the page actually doing, what did the user-facing DOM look like at that instant, what requests were in flight, and why did Playwright decide the element was not ready." When a click times out, console logs tell you the click failed. The trace shows you the live DOM at that moment so you can see the modal overlay covering your button, the spinner that never disappeared, or the second matching element that made the locator ambiguous. That difference turns a 30-minute guessing session into a 30-second diagnosis.

Crucially, traces are deterministic post-mortem artifacts. You do not need to reproduce the failure locally. The CI machine recorded everything; you just download the zip and replay it. This is the single biggest reason traces dominate debugging workflows for flaky tests, which by definition resist local reproduction.

## Enabling Traces in playwright.config.ts and the Tradeoffs

Tracing is controlled by the \`trace\` option inside the \`use\` block of your config. The most common production-grade setting is \`'on-first-retry'\`: tests run without tracing overhead on the first attempt, and a trace is recorded only when a test fails and Playwright retries it. This gives you a trace for exactly the runs that failed, with zero cost on the green path.

\`\`\`typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
\`\`\`

The tradeoff is straightforward: more capture means more confidence but more cost in run time and disk. Recording snapshots and screenshots for every action on every run (\`trace: 'on'\`) can noticeably slow a large suite and produce gigabytes of artifacts. Recording nothing (\`'off'\`) is fast but leaves you blind when something breaks. The retry-gated modes are the sweet spot for CI, while \`'on'\` is useful for local debugging sessions where you want a trace no matter what.

| Trace mode | What it records | When to use it |
| --- | --- | --- |
| \`'off'\` | Nothing | Default for fast local loops where you do not need a recording |
| \`'on'\` | Every test, always | Local debugging of a specific failing test; never in large CI suites |
| \`'retain-on-failure'\` | Every test, but keeps the trace only if the test fails | When even the first failure must produce a trace and you accept the per-run overhead |
| \`'on-first-retry'\` | Only when a failed test is retried (attempt 2) | Recommended CI default; zero overhead on green, trace on the first retry |
| \`'on-all-retries'\` | Every retry attempt after the first | Deeply flaky tests where you want to compare multiple retry recordings |

A practical rule: use \`'on-first-retry'\` in CI with \`retries: 2\`, and switch a single test to \`'on'\` locally via \`--trace on\` when you are actively hunting a bug.

## What a Trace Captures

A trace is far richer than a screenshot. Understanding each panel is what lets you debug fast. The Trace Viewer surfaces the captured data in dedicated panels, and each one answers a specific class of question.

| Captured data | Panel in the viewer | How you use it |
| --- | --- | --- |
| Actions timeline | Top timeline bar | See the order and duration of every step; spot the action that hung |
| Before/after DOM snapshots | Snapshot canvas (Before / Action / After) | Inspect the real page at the moment of each action; scrub to see state changes |
| Screenshots filmstrip | Hover the timeline | Visual filmstrip of the run; jump to the frame where the UI broke |
| Network requests | Network tab | Check status codes, payloads, timing, and failed or pending requests |
| Console messages | Console tab | Read \`console.log\`, warnings, and uncaught page errors |
| Test source | Source tab | See the highlighted line of test code that triggered the selected action |
| Call log | Log / Call tab | Read Playwright's internal waiting log: why a locator was not actionable yet |
| Metadata | Header | Browser, viewport, duration, and which retry produced the trace |

The DOM snapshot is the standout feature. Playwright captures a full serialized snapshot of the page before and after each action, so you can open the snapshot canvas, hover elements, and even open browser DevTools against the recorded DOM. This is not a static image; it is the actual rendered HTML at that instant, which is why you can detect overlapping elements, hidden inputs, and unexpected layout shifts.

## Opening a Trace: Three Ways

There are three ways to open a trace, and you will use all of them depending on context.

The first is the local CLI, which opens the standalone viewer for any \`trace.zip\`:

\`\`\`bash
# Open a trace produced on this machine or downloaded from CI
npx playwright show-trace test-results/my-test-chromium/trace.zip

# Open the most recent HTML report, which links to traces inline
npx playwright show-report
\`\`\`

The second is the hosted viewer at \`trace.playwright.dev\`. Drag any \`trace.zip\` onto that page and it renders entirely in your browser. Nothing is uploaded to a server; the trace is parsed client-side. This is ideal for sharing a trace with a teammate who does not have the repo checked out: they download the zip from CI and drop it on the site.

The third is the HTML report. When you run with \`reporter: [['html']]\`, every failed test in the report has an attached trace. Click the test, then click the trace thumbnail, and the embedded Trace Viewer opens right inside the report. In CI you publish the \`playwright-report\` directory as an artifact, and anyone can open it locally with \`npx playwright show-report ./playwright-report\`.

## Reading the Timeline and Scrubbing DOM Snapshots

When the viewer opens, the timeline runs across the top. Each action is a labeled segment whose width is proportional to its duration. The first thing to look for is the segment that is unusually wide or the one at the very end where the test failed; that is almost always your culprit. Click it and the rest of the panels sync to that moment.

Below the timeline is the snapshot canvas with three tabs: Before, Action, and After. Before shows the DOM immediately prior to the action; Action shows the page during the action with the targeted element highlighted; After shows the resulting DOM. Scrubbing between Before and After for a failing click reveals whether the element was even present, whether it was covered by another element, or whether a navigation wiped the page out from under you.

The snapshot is interactive. Hover any element and the viewer shows the selector Playwright would generate for it, which is gold when your locator was ambiguous. You can also pop open DevTools against the snapshot to inspect computed styles and the element tree exactly as it was. For flaky timing bugs, scrubbing the filmstrip frame by frame around the failure point usually exposes the spinner or async render that your test raced against. If you want a deeper foundation on locator strategy and the assertions that drive these snapshots, the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) pairs well with this workflow.

## Inspecting Network and Console

Click the Network tab and you get the full request waterfall for the test, scoped to the selected timeline range. Each row shows method, URL, status, size, and timing. This is where you catch the failures that have nothing to do with the DOM: an API that returned 500, an auth token request that returned 401, a request that is still pending (no status) because the backend hung. Select a request to see headers, the request payload, and the response body. A test that "clicks submit and nothing happens" is very often a 4xx or 5xx visible only in this panel.

The Console tab shows everything the page logged during the run: your application's \`console.log\` and \`console.warn\`, plus uncaught JavaScript errors and unhandled promise rejections. An uncaught \`TypeError\` thrown during a React render will appear here even though it never surfaced in your test assertion, and it frequently explains why a subsequent action could not find the element it expected. Reading network and console together tells you whether a failure originated in the backend, the frontend, or the test itself.

## Using Traces for Flaky-Test Diagnosis

Flaky tests are the highest-value use of traces because you cannot reproduce them on demand. With \`trace: 'on-first-retry'\`, the green first attempt is invisible, but the moment a flaky test fails and retries, you get a recording of the failing attempt. Compare the failing trace's timeline against your mental model of a healthy run. The classic flaky signatures are visible immediately: an action that fired before a network request finished (visible as a pending request in the Network tab overlapping the action), a DOM snapshot showing a loading skeleton instead of real content, or a console error from a race in app code.

A reliable workflow: open the failing trace, click the action that failed, read the call log to see what Playwright was waiting for, then scrub the Before snapshot to see what the page actually showed. If the call log says it was waiting for an element to be visible and the snapshot shows a spinner, you have a synchronization bug, not a Playwright bug, and the fix is a web-first assertion like \`await expect(locator).toBeVisible()\` rather than a hard-coded \`waitForTimeout\`. For a structured method covering the six root causes and how each one looks in a trace, see the dedicated [guide to fixing flaky tests](/blog/fix-flaky-tests-guide).

## Traces in CI: Uploading Artifacts in GitHub Actions

In CI, the trace is only useful if you can retrieve it. The standard pattern is to run the suite with retry-gated tracing, then upload both the HTML report and the raw \`test-results\` directory as artifacts so anyone can download and replay them. Upload on failure (or always) so a green run does not bloat storage.

\`\`\`yaml
name: e2e
on:
  push:
    branches: [main]
  pull_request:

jobs:
  playwright:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install browsers
        run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload report and traces
        if: \${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: |
            playwright-report/
            test-results/
          retention-days: 14
\`\`\`

After the job finishes, open the run in GitHub, download the \`playwright-report\` artifact, unzip it, and run \`npx playwright show-report ./playwright-report\` (or drag a \`trace.zip\` from \`test-results\` onto \`trace.playwright.dev\`). The \`if: \${{ !cancelled() }}\` guard ensures artifacts upload even when the test step fails, which is exactly the run you care about. If you are wiring up the broader pipeline around this, the [CI/CD testing pipeline guide for GitHub Actions](/blog/cicd-testing-pipeline-github-actions) covers caching, sharding, and matrix builds that keep trace-producing runs fast.

## Programmatic Tracing with context.tracing (Library Mode)

When you use Playwright as a library rather than through the test runner, for example in a Node script, a custom automation, or a non-test integration, you control tracing directly on the browser context. You start tracing, run your steps, then stop and write the trace to a path. This is also how you record a trace around a specific block of an otherwise untraced flow.

\`\`\`typescript
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Begin recording screenshots, DOM snapshots, and source.
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });

  const page = await context.newPage();
  await page.goto('https://example.com/login');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('s3cret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');

  // Stop and write the trace to disk; open it with show-trace.
  await context.tracing.stop({ path: 'trace.zip' });

  await context.close();
  await browser.close();
})();
\`\`\`

Run the script, then open the result with \`npx playwright show-trace trace.zip\`. You can also call \`context.tracing.startChunk()\` and \`stopChunk({ path })\` to capture multiple discrete traces from a single long-running context, which is handy when you want one trace file per logical scenario inside a bigger automation job.

## Combining the Trace Viewer with the Inspector and UI Mode

Traces are post-mortem, but Playwright gives you two live tools that complement them. The Inspector, launched with \`PWDEBUG=1\` or by passing \`--debug\`, opens a stepping debugger that pauses before each action, highlights the targeted element on the live page, and lets you step forward one action at a time while watching the real browser. Use the Inspector when you can reproduce the failure locally and want to single-step; use the trace when you cannot reproduce it and only have the recording.

\`\`\`bash
# Step through a single test interactively with the Inspector
npx playwright test tests/login.spec.ts --debug

# Open UI mode: a watch-mode runner with a built-in trace timeline
npx playwright test --ui
\`\`\`

UI mode is the bridge between the two. It runs your tests in a watch-mode GUI that records a trace for every run automatically and shows the same timeline, snapshots, network, and console panels as the standalone Trace Viewer, live, as you re-run tests. In practice many engineers debug locally in UI mode and reserve the standalone Trace Viewer and \`trace.playwright.dev\` for CI traces they download. If you are new to the runner itself, the [beginner Playwright tutorial](/blog/playwright-tutorial-beginners-2026) introduces these commands in context before you lean on traces day to day.

## Best Practices and Gotchas

Keep traces lean. Recording \`trace: 'on'\` across a thousand-test suite will balloon artifact storage and slow runs; prefer \`'on-first-retry'\` in CI and reserve \`'on'\` for targeted local debugging. Set a sane \`retention-days\` on your CI artifacts so old traces do not accumulate forever.

Treat traces as sensitive. Snapshots and network payloads can contain secrets: bearer tokens in request headers, session cookies, personal data in API responses, and credentials typed into forms. Never attach a raw trace from a production-data run to a public issue or a public CI artifact without scrubbing it. Use dedicated test accounts and synthetic data, and restrict who can download artifacts on repos that touch real data.

Mind the snapshot boundaries. DOM snapshots are captured around actions, so state changes that happen with no Playwright action between them may not produce a distinct snapshot. If you need to inspect a precise intermediate state, add an explicit assertion (which counts as an action and triggers a snapshot) at that point. Also remember that traces capture the browser, not your test runner internals, so a bug in a fixture or a custom helper may need ordinary debugging on top of the trace. Finally, when a trace looks empty or truncated, check that the test actually reached the failing line and that tracing was enabled for that attempt; a test that crashes during setup before the first traced action will yield a sparse trace.

## Conclusion

The Playwright Trace Viewer converts a flaky CI failure from an unsolvable mystery into a recording you can rewind action by action. Enable \`trace: 'on-first-retry'\` in your config, upload \`playwright-report\` and \`test-results\` as artifacts from GitHub Actions, and when a test fails you will have the timeline, DOM snapshots, network log, console output, source, and call log waiting for you. Open it with \`npx playwright show-trace\`, drag it onto \`trace.playwright.dev\` to share, or scrub it live in UI mode. The DOM snapshot scrubbing alone will catch the overlays, spinners, and races that screenshots and console logs hide.

Ready to bake these debugging patterns straight into your AI coding agent's workflow? Browse the [QASkills.sh skills directory](/skills) for ready-to-install Playwright, flaky-test, and CI debugging skills your agent can use on every run.

## Frequently Asked Questions

### How do I open a Playwright trace.zip file?

Run \`npx playwright show-trace path/to/trace.zip\` to open it in the standalone viewer, or drag the zip onto \`trace.playwright.dev\` to view it entirely in your browser with nothing uploaded to a server. If you have the HTML report, run \`npx playwright show-report\` and click the trace attached to any failed test.

### What is the difference between trace 'on' and 'on-first-retry'?

\`'on'\` records a trace for every test on every run, which is thorough but slow and produces large artifacts, so it suits local debugging only. \`'on-first-retry'\` records nothing on the first attempt and captures a trace only when a failed test is retried, giving you zero overhead on green runs and a recording for exactly the failures you care about in CI.

### Why is my Playwright trace empty or missing?

The most common causes are that tracing was not enabled for the attempt that failed (for example with \`'on-first-retry'\` and \`retries: 0\`, no retry ever runs), the test crashed during setup before the first traced action, or the artifact upload step did not run because it lacked an \`if: !cancelled()\` guard. Verify the \`trace\` mode, your retry count, and the CI upload condition.

### Can I view a trace without installing Playwright?

Yes. Open \`trace.playwright.dev\` in any modern browser and drag a \`trace.zip\` onto the page. The trace is parsed entirely client-side, so you do not need Node, the Playwright package, or the repo checked out. This makes it the easiest way to share a trace with a teammate or stakeholder.

### How do traces help debug flaky tests specifically?

Flaky tests rarely reproduce locally, so the trace recorded on the failing CI attempt is often your only evidence. The timeline shows which action hung, the call log shows what Playwright was waiting for, the network tab reveals pending or failed requests overlapping the action, and the DOM snapshot shows whether the page was still loading. Together these expose the synchronization race behind the flake.

### Do Playwright traces contain sensitive data?

They can. DOM snapshots include form values, and the network panel includes request headers and response bodies, which may contain tokens, cookies, or personal data. Treat traces as sensitive: use synthetic test data and dedicated test accounts, restrict who can download CI artifacts, and never post a raw production-data trace to a public issue without scrubbing it first.

### What is the difference between the Trace Viewer and the Inspector?

The Trace Viewer replays a recorded trace after the run finished, so it is a post-mortem tool ideal for failures you cannot reproduce. The Inspector, launched with \`--debug\` or \`PWDEBUG=1\`, pauses a live test before each action and lets you step through interactively against the real browser. Use the Inspector when you can reproduce locally and the Trace Viewer when you only have the CI recording.

### How do I upload Playwright traces in GitHub Actions?

Add an \`actions/upload-artifact@v4\` step with \`if: \${{ !cancelled() }}\` so it runs even when tests fail, and point its \`path\` at both \`playwright-report/\` and \`test-results/\`. After the run, download the artifact from the GitHub Actions run page, unzip it, and open it with \`npx playwright show-report\` or by dragging a \`trace.zip\` onto \`trace.playwright.dev\`.
`,
};
