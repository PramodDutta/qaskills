import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Trace CLI Analysis Guide 2026: npx playwright trace',
  description:
    'Analyze Playwright traces from the terminal with npx playwright trace and --debug=cli. Built for AI agents and headless CI. Modes, examples, and CI setup.',
  date: '2026-06-20',
  category: 'Guide',
  content: `
# Playwright Trace CLI Analysis Guide 2026: npx playwright trace

For years, debugging a failed Playwright test meant downloading a \`trace.zip\` and opening the graphical Trace Viewer in a browser. That works beautifully on a developer's laptop and not at all inside a headless CI runner or an AI agent loop, where there is no display, no human, and no patience for a GUI. Playwright 1.59 closes that gap with terminal-native trace tooling: \`npx playwright trace <trace.zip>\` prints the full timeline of actions, network calls, console output, and errors straight to stdout, and the new \`--debug=cli\` flag gives agents an interactive, text-only debugger.

This is a genuinely new capability, not a wrapper around the old viewer. The CLI trace reader is built so that an automated system — a CI job, a bot, an LLM-driven agent — can read why a test failed without a screen. The output is plain text, grep-able, and structured for machine consumption. For an agent that writes tests, runs them, and reads the failure to self-correct, this is the missing feedback channel.

This guide walks through the new CLI trace commands end to end: how to enable trace capture in your config, every trace mode and when to use it, how to read actions, network, console, and errors from terminal output, how the CLI reader differs from the GUI viewer, the \`--debug=cli\` agent debugger, and how to wire all of it into CI so failures surface as readable logs instead of opaque artifacts. For the wider release context, see our [Playwright 1.59 agentic release features guide](/blog/playwright-1-59-agentic-release-features-guide) and [what's new in Playwright 2026](/blog/whats-new-in-playwright-2026).

## What the CLI Trace Tooling Is

Playwright has always recorded a *trace* — a zipped bundle containing a frame-by-frame record of everything a test did: each action, the DOM snapshot before and after, network requests with headers and bodies, console messages, and the final error if any. Historically you consumed it through \`npx playwright show-trace trace.zip\`, which boots a local web server and opens the visual viewer.

The 1.59 CLI tooling adds a headless consumer for that same bundle. \`npx playwright trace trace.zip\` parses the archive and writes a readable report to the terminal. No browser, no display, no clicking. The same data, projected into text. That single design choice is what makes it usable in environments where the GUI never could run.

## Enabling Trace Capture in playwright.config

You cannot analyze a trace you never recorded. Trace capture is controlled by the \`trace\` option in your project config. The most common production setting captures a trace only when a test fails on its first retry, which keeps artifacts small while still catching every real failure.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 2,
  use: {
    trace: 'on-first-retry',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
\`\`\`

You can also force tracing on per-test for a known-flaky spec, or capture programmatically when you control the context directly.

\`\`\`typescript
// Programmatic capture for a single flow.
await context.tracing.start({ screenshots: true, snapshots: true });
await page.goto('https://qaskills.sh/skills');
await page.click('text=Playwright');
await context.tracing.stop({ path: 'traces/skills-flow.zip' });
\`\`\`

## Trace Mode Reference

The \`trace\` option accepts several modes, and picking the right one balances debuggability against artifact size and run time. Tracing everything is great for an agent loop but expensive for a thousand-test CI run. This table summarizes the modes.

| Mode | When a trace is saved | Typical use |
|---|---|---|
| \`off\` | Never | Fastest runs, no debugging |
| \`on\` | Every test, always | Local agent loops, deep debugging |
| \`retain-on-failure\` | Only when a test fails | Default for most CI suites |
| \`on-first-retry\` | When a test fails and is retried once | Balanced CI default, small artifacts |
| \`on-all-retries\` | On every retry attempt | Diagnosing intermittent flakiness |

For AI agents that read traces to self-correct, \`on\` is usually right because the agent wants the trace of *every* run, pass or fail. For human-reviewed CI, \`on-first-retry\` is the sweet spot.

## Reading a Trace from the Terminal

Once a trace exists, point the CLI at it. The base command prints a structured summary: the test title, the ordered list of actions with durations, any error, and pointers to the network and console sections.

\`\`\`bash
npx playwright trace test-results/skills-flow/trace.zip
\`\`\`

A typical action listing looks like a numbered timeline, each line showing the API call, its target selector, and how long it took. You read it top to bottom to reconstruct exactly what the test attempted and where it stalled.

\`\`\`bash
# Show only the actions section.
npx playwright trace trace.zip --actions

# Show network requests (method, url, status, timing).
npx playwright trace trace.zip --network

# Show captured console messages from the page.
npx playwright trace trace.zip --console

# Show the failing error and its stack with the last snapshot.
npx playwright trace trace.zip --errors
\`\`\`

The flags compose, so you can pull a focused slice. For a failing test, \`--errors --network\` is the fast path: it shows you the exception and the requests that were in flight when it happened, which is usually enough to spot a 500 response or a timed-out fetch.

## Reading Network, Console, and Errors

The network section is where most real failures are diagnosed. The CLI prints each request with method, URL, status code, and timing, so a backend error that broke the UI is immediately visible. The example below filters a trace for failed requests using ordinary shell tools, which is exactly how an agent or CI script would triage.

\`\`\`bash
# Surface only non-2xx responses from the trace network log.
npx playwright trace trace.zip --network | grep -E ' (4[0-9]{2}|5[0-9]{2}) '
\`\`\`

Console output catches the other big class of failures: client-side exceptions that never reached your assertions. A React error boundary, an uncaught promise rejection, or a failed asset load shows up here.

\`\`\`bash
# Pull console errors and warnings only.
npx playwright trace trace.zip --console | grep -iE 'error|warn'
\`\`\`

The errors section ties it together by printing the thrown exception, its stack, and the selector or action that was executing. For a "locator not found" failure, this tells you exactly which selector the test waited on, which you can cross-reference against the action timeline to see what the page looked like just before.

## How --debug=cli Works for Agents

The second half of the 1.59 tooling is \`--debug=cli\`, an interactive debugger that runs entirely in the terminal. Where the GUI Inspector opens a window, \`--debug=cli\` pauses execution and exposes a text REPL where an agent can step through actions, inspect the current DOM, evaluate selectors, and resume — all over stdin/stdout. That is the part that matters: an LLM agent can drive it because it is just text.

\`\`\`bash
# Launch a single spec under the terminal debugger.
npx playwright test skills.spec.ts --debug=cli
\`\`\`

Inside the session the agent issues commands to step, inspect, and query. A typical agent loop reads the paused state, decides a selector is wrong, queries an alternative against the live DOM, confirms it resolves, then rewrites the test. The same idea powers the broader agent features in the [Playwright 1.59 agentic guide](/blog/playwright-1-59-agentic-release-features-guide). You can also script the inspection programmatically with \`page.pause()\` when running under the CLI debugger.

\`\`\`typescript
test('debuggable flow', async ({ page }) => {
  await page.goto('https://qaskills.sh');
  // Under --debug=cli, this drops into the terminal debugger
  // instead of opening the GUI inspector.
  await page.pause();
  await page.click('text=Leaderboard');
});
\`\`\`

## CLI Trace vs GUI Trace Viewer

The two tools read the same trace bundle but serve different operators. The GUI viewer is unbeatable for a human doing exploratory debugging — you scrub a timeline, see DOM snapshots, hover network waterfalls. The CLI reader wins everywhere a human and a display are absent. This table maps each to its job.

| Aspect | CLI: npx playwright trace | GUI: npx playwright show-trace |
|---|---|---|
| Output | Plain text to stdout | Interactive web app |
| Requires a display | No | Yes (opens a browser) |
| Works in headless CI | Yes | No (needs tunneling/artifact download) |
| Usable by AI agents | Yes, designed for it | No |
| DOM snapshot scrubbing | No (text only) | Yes, full visual timeline |
| Network waterfall visualization | Text list | Visual waterfall |
| Best operator | CI scripts, bots, agents | Human developers |
| Grep-able / pipeable | Yes | No |

The practical rule: capture traces the same way for both, then choose your reader by who is looking. Humans run \`show-trace\`; pipelines and agents run \`trace\`. They are complementary, not competing.

## Integrating CLI Trace into CI

The biggest win is surfacing failures *as readable logs in the CI output itself*, so you do not have to download an artifact to learn why a job went red. After the test step, find any trace zips and print their error and network sections to the job log.

\`\`\`bash
# Run the suite, do not fail the script yet.
npx playwright test || TEST_FAILED=1

# For every trace produced, dump errors + network to the CI log.
for trace in $(find test-results -name 'trace.zip'); do
  echo "===== TRACE: \${trace} ====="
  npx playwright trace "\${trace}" --errors --network
  echo "==============================="
done

# Now propagate the original failure.
exit \${TEST_FAILED:-0}
\`\`\`

This turns an opaque "1 test failed" into a fully-explained failure inline in the GitHub Actions log: the exception, the selector, and the offending HTTP response, all without leaving the browser tab you already have open on the run. For a complete matrix and reporting setup you can build on, browse the Playwright CI skills in the [QASkills directory](/skills).

## Using It in Agent Loops

The end-to-end agent pattern stitches everything together. The agent runs tests with \`trace: 'on'\`, and when a test fails it does not guess — it reads the trace. The script below is the shape of what an agent harness executes after a failing run, capturing the machine-readable triage the model then reasons over.

\`\`\`bash
# Agent triage: collect a compact failure report from the trace.
TRACE=$(find test-results -name 'trace.zip' | head -1)

{
  echo '## ACTIONS'
  npx playwright trace "\${TRACE}" --actions | tail -20
  echo '## ERROR'
  npx playwright trace "\${TRACE}" --errors
  echo '## FAILED REQUESTS'
  npx playwright trace "\${TRACE}" --network | grep -E ' (4|5)[0-9]{2} ' || echo 'none'
} > /tmp/agent-trace-report.txt
\`\`\`

The agent feeds \`/tmp/agent-trace-report.txt\` back into its context, sees that the click targeted a selector that the network log shows never rendered because an API returned 500, and rewrites the test to wait on the correct state. That loop — run, read trace, correct — is exactly what the terminal trace tooling was built to enable. It also pairs naturally with screen recording for human review; see the [Playwright screencast API video recording guide](/blog/playwright-screencast-api-video-recording-guide) when you want a visual artifact alongside the text trace.

## Comparing Two Traces to Diagnose Flakiness

Intermittent failures are the hardest to debug because the same test passes and fails on identical code. The CLI reader makes diff-based triage practical: capture a trace from a passing run and a failing run, dump both to text, and diff them. The difference is almost always the smoking gun — a request that returned 200 in one and 503 in the other, or an action that fired before a different page state.

\`\`\`bash
# Capture text reports from a passing and a failing trace.
npx playwright trace traces/pass.zip --actions --network > /tmp/pass.txt
npx playwright trace traces/fail.zip --actions --network > /tmp/fail.txt

# Diff them to isolate exactly what changed between runs.
diff /tmp/pass.txt /tmp/fail.txt
\`\`\`

This is the kind of mechanical comparison a human would spend twenty minutes on in the GUI viewer, reduced to a single \`diff\`. It is also trivial for an agent to run and reason over, which is why flaky-test investigation is one of the strongest use cases for the terminal tooling. For deeper flakiness strategy, the [QASkills directory](/skills) collects skills dedicated to stabilizing intermittent Playwright suites.

## Trace Size and Performance Considerations

Traces are not free. Each captured trace stores DOM snapshots, screenshots, and full network payloads, so a long test with thousands of actions can produce a multi-megabyte archive. The table below shows roughly how capture settings affect artifact size and run overhead so you can tune sensibly.

| Setting | Relative size | Run overhead | Notes |
|---|---|---|---|
| \`screenshots: false, snapshots: false\` | Smallest | Minimal | Actions + network only, no visuals |
| \`screenshots: true, snapshots: false\` | Medium | Low | Good for CLI triage, no DOM scrub |
| \`screenshots: true, snapshots: true\` | Large | Moderate | Full GUI viewer fidelity |
| \`sources: true\` added | Largest | Moderate | Bundles test source for the viewer |

For agent and CI workflows that consume traces via the CLI, you rarely need full DOM snapshots, since the text reader does not render them. Capturing with \`snapshots: false\` shrinks artifacts substantially while preserving everything the terminal reader actually prints — actions, network, console, and errors.

\`\`\`typescript
// Lean capture tuned for CLI / agent consumption.
await context.tracing.start({ screenshots: true, snapshots: false });
\`\`\`

## Common Pitfalls

A few things trip people up. First, if you set \`trace: 'on-first-retry'\` but \`retries: 0\`, no trace is ever saved because there is no retry — agents that need every trace must use \`trace: 'on'\`. Second, the CLI reader needs the full \`trace.zip\`; pointing it at an unzipped directory or a partial artifact fails. Third, very large traces (long tests with thousands of actions) produce a lot of text — pipe through \`--errors\` or \`tail\` rather than dumping the whole timeline into an agent's context window. Fourth, remember that secrets travel in network payloads: a trace can contain auth tokens and request bodies, so treat \`trace.zip\` artifacts as sensitive and avoid uploading them to public storage.

## Frequently Asked Questions

### How do I analyze a Playwright trace from the terminal?

Run \`npx playwright trace path/to/trace.zip\`. Introduced in Playwright 1.59, this command parses the trace archive and prints a readable report — actions, network requests, console messages, and errors — directly to stdout with no browser or display required. Add flags like \`--errors\`, \`--network\`, or \`--console\` to focus on one section. It is designed for headless CI and AI agents that cannot use the graphical viewer.

### What is the difference between npx playwright trace and show-trace?

\`npx playwright trace\` reads a trace bundle and prints plain text to the terminal, so it works in headless CI and for AI agents. \`npx playwright show-trace\` opens the interactive graphical Trace Viewer in a browser, which is ideal for human developers scrubbing a visual timeline and DOM snapshots but useless without a display. Both read the same \`trace.zip\`; choose the CLI reader for automation and the GUI for human exploratory debugging.

### How do I enable trace capture in Playwright?

Set the \`trace\` option under \`use\` in \`playwright.config.ts\`. Common values are \`'on-first-retry'\` for balanced CI artifacts, \`'retain-on-failure'\` to save only failing tests, and \`'on'\` to capture every run, which suits AI agent loops. You can also capture programmatically with \`context.tracing.start()\` and \`context.tracing.stop({ path: 'trace.zip' })\` when you control the browser context directly in a script.

### What does --debug=cli do in Playwright?

\`--debug=cli\` launches Playwright's terminal-based debugger instead of the graphical Inspector. It pauses test execution and exposes a text REPL over stdin and stdout where you can step through actions, inspect the live DOM, evaluate selectors, and resume. Because it is entirely text, AI agents can drive it programmatically to diagnose a failing selector and self-correct, which the windowed GUI inspector cannot support.

### Can AI agents read Playwright traces automatically?

Yes, that is the primary design goal of the 1.59 CLI trace tooling. An agent runs tests with tracing on, and on failure it executes \`npx playwright trace trace.zip --errors --network\` to get machine-readable text. The agent feeds that report into its context, identifies the failing selector or the HTTP error that broke the page, and rewrites the test. The plain-text, grep-able output is what makes this run-read-correct loop possible.

### Which trace mode should I use for CI?

For most CI suites, use \`'on-first-retry'\`. It captures a trace only when a test fails and is retried, keeping artifacts small while catching every real failure. Note this requires \`retries\` to be at least 1, or no trace is ever saved. Use \`'retain-on-failure'\` if you do not run retries, and reserve \`'on'\` for agent loops or deep local debugging where you want every single run traced.

### How do I surface trace errors directly in CI logs?

After the test step, loop over the produced trace files and print their error and network sections to the job output: \`for t in $(find test-results -name trace.zip); do npx playwright trace "$t" --errors --network; done\`. This writes the exception, failing selector, and offending HTTP responses inline in the CI log, so you understand why a job failed without downloading and opening any artifact.

## Combining CLI Trace with Other Artifacts

The text trace is most powerful when combined with the other artifacts Playwright produces. A screenshot tells a human reviewer what the page looked like at the moment of failure, a video shows the sequence, and the CLI trace explains the precise actions and requests behind it. A complete failure bundle typically pairs the terminal trace report with a screenshot and, for human review, a recorded video. When you need that visual layer, capture video alongside tracing in the same config block.

\`\`\`typescript
// playwright.config.ts — text trace for agents, video for humans
export default defineConfig({
  retries: 2,
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
\`\`\`

The agent reads the text trace to self-correct; a human glances at the video and screenshot when they want to confirm the fix visually. This layered approach gives you the best of both worlds without choosing one consumer over the other.

## Conclusion

The terminal trace tooling in Playwright 1.59 finally makes trace analysis work where it matters most for modern testing — inside headless CI and AI agent loops. Capture traces with the right mode in your config, read them with \`npx playwright trace\` and its focused flags, drop into \`--debug=cli\` when an agent needs to inspect a live page, and pipe error and network sections into your CI logs so failures explain themselves. The GUI viewer is still the best tool for a human at a desk; the CLI reader is the tool for everything and everyone else.

Put it into practice: explore production-ready Playwright CI and agent configurations in the [QASkills directory](/skills), get the full release picture in the [Playwright 1.59 agentic features guide](/blog/playwright-1-59-agentic-release-features-guide), and add a visual layer to your text triage with the [Playwright screencast API video recording guide](/blog/playwright-screencast-api-video-recording-guide).
`,
};
