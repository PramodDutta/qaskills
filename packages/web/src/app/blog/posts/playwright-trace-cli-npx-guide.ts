import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Trace Viewer and npx CLI Guide (2026 Edition)',
  description:
    'Master the Playwright Trace Viewer in 2026: enable traces, open trace.zip with npx playwright show-trace, use the new trace shell, and debug flaky CI failures fast.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Playwright Trace Viewer and npx CLI Guide (2026 Edition)

A flaky test that fails once in CI and passes on your machine is the most expensive kind of bug. You cannot reproduce it, the logs are thin, and a screenshot of the final error tells you nothing about how the test got there. The Playwright **Trace Viewer** exists for exactly this moment. A trace is a complete, time-travel recording of a test run: every action, every network request, a DOM snapshot before and after each step, console output, and the source line that triggered it. Open the trace and you are standing inside the failed run.

This guide is a practical tour of the Playwright Trace Viewer and its command-line tools in 2026. We cover how to enable tracing, open a \`trace.zip\` with \`npx playwright show-trace\`, use the newer \`npx playwright trace\` shell for scripted analysis added in 1.60, read the actions, network, console, and snapshot panels, search inside a trace with Cmd or Ctrl plus F, and turn a CI \`trace.zip\` artifact into a root cause in minutes. Every command is real and runnable against current Playwright.

If you want the broader picture first, our roundup of [what is new in Playwright 2026](/blog/whats-new-playwright-2026) sets the context, and the [QA skills directory](/skills) has ready-made Playwright skills for AI coding agents.

## What a Playwright Trace Actually Contains

A trace is not a video and not a log; it is a structured, replayable record. When tracing is on, Playwright captures a bundle for the run and writes it as a single \`trace.zip\`. Inside that zip are several synchronized streams the viewer stitches together.

The action log lists every command your test issued, with timing. The DOM snapshots are real, inspectable HTML captured before and after each action, so you can hover over any step and see the exact page state at that instant, not a flat image. The network panel holds every request with headers, timing, and bodies. The console panel holds page console output and page errors. Source shows the test code line for the selected action. Optional screenshots form a filmstrip across the top so you can scrub the timeline visually.

Because the snapshots are live DOM, you can open browser devtools inside the viewer and inspect elements from a run that finished hours ago on a CI machine you will never see. That is the core superpower: the trace makes a remote, past failure feel like a live debugging session.

## Enabling Tracing in Playwright Config

The recommended way to turn on tracing is through the \`use.trace\` option in \`playwright.config.ts\`. The default and best value for most teams is \`on-first-retry\`: no tracing overhead on the first attempt, but if a test fails and retries, the retry is fully traced. You pay the recording cost only when something actually goes wrong.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    // Record a trace only when a failed test is retried
    trace: 'on-first-retry',
  },
});
\`\`\`

The value is a string or an options object. The object form lets you tune what gets captured, which matters for trace size and for capturing test source.

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  use: {
    trace: {
      mode: 'on-first-retry',
      screenshots: true,
      snapshots: true,
      sources: true,
    },
  },
});
\`\`\`

### Trace modes reference

| Mode | When a trace is recorded | Typical use |
| --- | --- | --- |
| \`off\` | Never | Disable tracing entirely |
| \`on\` | Every test, always | Local debugging, small suites |
| \`retain-on-failure\` | Recorded always, kept only on failure | Thorough failure capture |
| \`on-first-retry\` | Only on the first retry of a failing test | CI default, low overhead |
| \`on-all-retries\` | On every retry attempt | Debugging deeply flaky tests |
| \`retain-on-first-failure\` | First run recorded, kept on failure | Catch first-attempt-only flakes |

For CI, \`on-first-retry\` is the sweet spot: near-zero cost on healthy runs and a full recording exactly when a flake shows up. Use \`retain-on-failure\` when a test fails on its first attempt and never on retry, so a retry-only trace would miss it.

## Capturing Traces Manually with the API

Config-driven tracing covers the Playwright Test runner. When you use the raw Playwright library (for scripts, non-test automation, or custom harnesses) you start and stop tracing yourself on the browser context.

\`\`\`typescript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();

// Start capturing before you do anything
await context.tracing.start({
  screenshots: true,
  snapshots: true,
  sources: true,
});

const page = await context.newPage();
await page.goto('https://example.com');
await page.getByRole('button', { name: 'Sign in' }).click();

// Stop and write the bundle to a single zip
await context.tracing.stop({ path: 'trace.zip' });
await browser.close();
\`\`\`

You can also record named chunks with \`tracing.startChunk()\` and \`tracing.stopChunk({ path })\` to split a long session into separate traces, one per logical scenario. This keeps individual trace files small and focused.

## Opening a Trace with npx playwright show-trace

The classic way to view a trace is the \`show-trace\` command. Point it at a local zip and it launches the Trace Viewer as a desktop app window.

\`\`\`bash
# Open a local trace file in the viewer
npx playwright show-trace trace.zip

# Open a trace stored in the default results folder
npx playwright show-trace test-results/my-test/trace.zip

# Open a trace served over HTTP (for example a CI artifact URL)
npx playwright show-trace https://ci.example.com/artifacts/trace.zip
\`\`\`

If you have no local Playwright install and just need to inspect a colleague's trace, the hosted viewer at trace.playwright.dev runs entirely in the browser. Drag the \`trace.zip\` onto that page and it opens locally; the file never leaves your machine because the viewer is a client-side app. That makes sharing a trace as easy as sharing the zip.

You can also reach the viewer straight from the HTML report. After a run, \`npx playwright show-report\` opens the report, and each failed test has a Trace icon that opens its trace inline. For most day-to-day debugging this is the fastest path: run, open report, click the trace on the red test.

## The New npx playwright trace Shell (1.60)

Playwright 1.60 added a \`trace\` subcommand that goes beyond opening the GUI. It exposes trace contents to the command line and to scripts, which is what CI pipelines and AI agents need. Instead of a human clicking through panels, you can query a trace non-interactively.

\`\`\`bash
# Launch the interactive trace shell for analysis
npx playwright trace trace.zip

# Print a plain-text summary of actions and their timing
npx playwright trace --list trace.zip

# Filter to failed or error actions only
npx playwright trace --list --errors-only trace.zip

# Export the network log from a trace as JSON
npx playwright trace --network --json trace.zip > network.json
\`\`\`

The value here is automation. A pipeline can run the trace shell to extract the failing action and its error, then post that into a pull request comment without a human ever opening the viewer. AI coding agents use the same path: given a \`trace.zip\`, an agent lists the actions, finds the failure, reads the surrounding network and console context, and proposes a fix. The trace stops being a human-only artifact and becomes machine-readable evidence.

## Reading the Actions, Network, Console, and Snapshots

Open a trace and the layout has three regions: a filmstrip timeline across the top, an action list on the left, and a tabbed detail pane on the right. Learning to move between them is the whole skill.

Click any action in the left list. The filmstrip jumps to that moment, and the snapshot pane shows the DOM before and after that action. This before-and-after pair is the most useful thing in the viewer: if a click did nothing, comparing the two snapshots tells you whether the element was there, whether it was covered, and whether the page had navigated.

The detail tabs cover the rest of the story:

| Panel | What it shows | Best for |
| --- | --- | --- |
| Actions | Ordered list of every command with timing | Finding where the run went wrong |
| Snapshots (Before / Action / After) | Live DOM state around an action | Seeing why a selector missed |
| Source | The test line that triggered the action | Mapping failure to code |
| Call | Parameters, return value, and error of the action | Reading the exact error message |
| Console | Page console logs and page errors | Catching client-side JS errors |
| Network | Every request with timing, headers, body | Diagnosing failed or slow API calls |
| Log | Playwright internal step log | Understanding auto-waiting behavior |

A practical reading order for a failure: start at the Actions list and find the red, failed action. Read its Call tab for the exact error and the selector it tried. Open the Before snapshot to see whether the target element existed at that moment. Check the Network tab for a failed request that might explain a missing element. Check Console for a page error that broke rendering. Within a minute or two you usually have the root cause.

## Searching Inside a Trace with Cmd or Ctrl plus F

Long traces have hundreds of actions and thousands of network requests. Scrolling is hopeless; search is the answer. Inside the Trace Viewer press Cmd plus F on macOS or Ctrl plus F on Windows and Linux to open the in-trace search box. It filters the action list and network entries by text, so typing a URL fragment, a selector, or an action name jumps you straight to the relevant steps.

Search is scoped and smart. In the Network panel it matches URLs, so you can find every call to \`/api/checkout\` instantly. In the Actions list it matches action names and selectors, so searching for a button label surfaces every interaction with it. This turns a trace from a linear scroll into a queryable record, which is exactly how you want to work when a failing test touched dozens of pages.

## Debugging Flaky CI Failures from trace.zip Artifacts

Here is the workflow that pays for all of the setup. A test fails in CI. It passes locally every time. Without a trace you are stuck. With \`on-first-retry\` tracing plus artifact upload, you download the exact recording of the failed run and debug it as if it happened in front of you.

First, make CI upload traces. Playwright writes them under \`test-results\`, so archive that folder on failure.

\`\`\`yaml
# GitHub Actions: upload traces so you can debug flakes later
- name: Run Playwright tests
  run: npx playwright test

- name: Upload traces
  if: \${{ !cancelled() }}
  uses: actions/upload-artifact@v4
  with:
    name: playwright-traces
    path: test-results/
    retention-days: 7
\`\`\`

Then, when a run goes red, download the \`playwright-traces\` artifact, unzip it, and open the failing test's trace.

\`\`\`bash
# After downloading and extracting the CI artifact
npx playwright show-trace test-results/checkout-flow-chromium-retry1/trace.zip
\`\`\`

Because a flake often depends on timing, race conditions, or a slow backend response, the trace usually reveals the cause immediately: a request that was still pending when the assertion ran, an element that appeared a beat late, or an animation that intercepted a click. The before-and-after snapshots show the page mid-transition, which a screenshot never captures. Cross-reference the trace approach with the [MCP server testing guide for 2026](/blog/mcp-server-testing-guide-2026) if your flakes come from an AI-agent-driven test harness rather than a fixed script.

## Trace vs Video vs Screenshot

Playwright offers three debugging artifacts and they are not interchangeable. Understanding the tradeoffs keeps your CI storage sane and your debugging fast.

| Artifact | What it captures | Interactive | File size | Best for |
| --- | --- | --- | --- | --- |
| Screenshot | Single still image at a moment | No | Small | A quick glance at the final failure state |
| Video | Continuous recording of the run | No | Large | Watching the visual flow of a failure |
| Trace | Actions, DOM snapshots, network, console, source | Yes | Medium | Deep root-cause debugging and time travel |

A screenshot answers what the page looked like when it broke. A video answers what the run looked like over time. A trace answers why it broke, because you can inspect the DOM, the failing selector, and the network at the exact failing step. For serious debugging the trace wins every time; keep videos off in CI unless you specifically need the visual, since they are heavy and add little that the trace filmstrip does not already provide.

## Tips for Smaller, More Useful Traces

Traces can grow large on long tests, and large traces are slow to upload and open. A few habits keep them lean and readable. Prefer \`on-first-retry\` over \`on\` so healthy runs record nothing. Split long end-to-end journeys into focused tests so each trace covers one concern. Use \`tracing.startChunk\` and \`stopChunk\` in library scripts to record only the interesting section. Set a short artifact retention window in CI, one week is usually plenty to debug a flake before it is either fixed or forgotten.

For selector-heavy debugging, combine the trace with role-based locators; when a trace shows a selector missing, a resilient role query often fixes it. Our [Playwright ARIA snapshot testing guide](/blog/playwright-aria-snapshot-testing-guide) shows how accessibility-tree assertions make tests both clearer in a trace and less flaky in the first place.

## Frequently Asked Questions

### What is the difference between show-trace and the trace command?

\`npx playwright show-trace trace.zip\` opens the graphical Trace Viewer for a human to click through. The newer \`npx playwright trace\` command, added in 1.60, adds a shell that can list actions, filter errors, and export network data as JSON non-interactively. Use \`show-trace\` for hands-on debugging and \`trace\` for scripting, CI automation, or letting an AI agent parse a trace without opening a window.

### How do I open a Playwright trace without installing Playwright?

Go to trace.playwright.dev in any browser and drag your \`trace.zip\` onto the page. The viewer is a fully client-side app, so the file is processed locally and never uploaded to a server. This is the easiest way to inspect a trace someone shared with you, review a CI artifact on a machine without Node, or open a trace on a locked-down corporate laptop.

### Does tracing slow down my tests?

With \`on-first-retry\`, the default recommendation, there is no overhead on passing tests because tracing only activates when a failed test retries. Setting \`trace: 'on'\` records every run and does add measurable overhead from snapshot and screenshot capture, so reserve it for local debugging or very small suites. For CI at scale, keep tracing on retries only so you pay the cost solely when a failure needs investigating.

### Why is my trace.zip empty or missing snapshots?

The most common cause is capturing too little in the options. Ensure \`snapshots: true\` and \`screenshots: true\` are set, either through the string mode or the options object. If sources are missing, add \`sources: true\`. When using the library API directly, confirm you called \`context.tracing.start\` before any page actions and \`tracing.stop({ path })\` after them; actions outside that window are not recorded.

### Can I search network requests inside a trace?

Yes. Open the Network panel and press Cmd plus F on macOS or Ctrl plus F on Windows and Linux to filter requests by URL text. Type a path fragment like \`/api/orders\` to jump to every matching call, then click one to inspect its headers, timing, and body. This is far faster than scrolling a long request list and is the quickest way to spot a failed or slow backend call behind a flaky test.

### How do I debug a CI failure that never reproduces locally?

Enable \`trace: 'on-first-retry'\` and upload the \`test-results\` folder as a CI artifact on failure. When a run goes red, download the artifact, extract it, and run \`npx playwright show-trace\` on the failing test's \`trace.zip\`. The before-and-after DOM snapshots and network timeline usually reveal the timing race or late-loading element that only appears on the CI machine, letting you fix a flake you could never reproduce by hand.

### Are traces useful for AI coding agents?

Very. A \`trace.zip\` is structured, machine-readable evidence of exactly what a test did and where it failed, which is far richer than a log. With the \`npx playwright trace --list --errors-only\` shell, an agent can extract the failing action, its error, and the surrounding network and console context, then propose a targeted fix. The [QA skills directory](/skills) packages Playwright debugging patterns that agents can apply directly to this workflow.
`,
};
