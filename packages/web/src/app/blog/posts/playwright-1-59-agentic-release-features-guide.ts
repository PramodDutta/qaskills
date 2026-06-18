import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "What's New in Playwright 1.59: The Agentic Release Explained",
  description:
    'A deep dive into Playwright 1.59, the first release built for AI agents: page.screencast, browser.bind(), the CLI dashboard, --debug=cli, and await using.',
  date: '2026-06-18',
  category: 'Guide',
  content: `
# What's New in Playwright 1.59: The Agentic Release Explained

Playwright 1.59 shipped in April 2026, and the maintainers called it "the agentic release" for a reason. For nearly a decade Playwright has been a tool built for humans: humans write the tests, humans read the traces, humans click around the UI mode. Version 1.59 is the first release where the primary user the team designed for is an AI agent driving the browser, not a person typing selectors.

This guide walks through every headline feature in 1.59, plus the quality-of-life changes that landed across 1.56 through 1.58 and the quietly important 1.57 switch from Chromium builds to Chrome for Testing. Every code sample is real and runnable. If you maintain a Playwright suite, or you are wiring an AI coding agent into your testing workflow, this is the release that changes how you work.

## Why 1.59 Is Called the Agentic Release

The shift is conceptual before it is technical. Traditional Playwright assumes a single test process that launches a browser, runs assertions, and tears everything down. That model breaks the moment you have an autonomous agent that wants to inspect a live page, retry a failing flow, hand control to a second agent, or attach to a session that is already running.

1.59 introduces primitives that make those scenarios first-class: shared browser sessions, a discovery dashboard, an agent-attachable debugger, deterministic cleanup, and richer recording. The throughline is that an agent should be able to observe and act on a browser the same way a human reaches for the UI mode, but through programmable, inspectable APIs.

If you are coming from earlier versions, you may also want to skim our [overview of what changed across the 2026 Playwright releases](/blog/whats-new-in-playwright-2026) before diving into the agentic specifics here.

## page.screencast: Video Recording With Action Annotations

The new \`page.screencast\` API gives you explicit, programmatic control over video capture. Unlike the older \`recordVideo\` context option, which records passively for the whole context lifetime, \`screencast\` lets you start and stop recording on demand, capture frames in real time, and annotate the recording with the actions that produced each frame.

\`\`\`typescript
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Start recording with action annotations enabled
const screencast = await page.screencast.start({
  dir: './recordings',
  size: { width: 1280, height: 720 },
  annotateActions: true,
});

await page.goto('https://example.com/checkout');
await page.getByLabel('Email').fill('agent@qaskills.sh');
await page.getByRole('button', { name: 'Continue' }).click();

// Stop and flush the video to disk
const videoPath = await screencast.stop();
console.log(\`Saved annotated recording to \${videoPath}\`);

await browser.close();
\`\`\`

With \`annotateActions: true\`, each captured frame carries metadata about the Playwright action in flight, so an agent reviewing the recording can correlate a visual frame with the exact \`fill\` or \`click\` that caused it. This is what makes screencast genuinely agentic: it produces a recording an agent can reason about, not just a video a human watches.

You can also subscribe to frames as they are produced, which is useful for streaming a live view to an agent dashboard:

\`\`\`typescript
const screencast = await page.screencast.start({ dir: './recordings' });

screencast.on('frame', (frame) => {
  // frame.data is a Buffer of the encoded image
  // frame.timestamp is the capture time in ms
  pushToAgentDashboard(frame.data, frame.timestamp);
});
\`\`\`

## browser.bind(): Shared Browser Sessions Across Agents

The single most important agentic primitive in 1.59 is \`browser.bind()\`. It exposes a running browser instance under a named binding so that other processes, including separate AI agents, can connect to the same session rather than each launching their own.

\`\`\`typescript
import { chromium } from '@playwright/test';

// Agent A launches and binds a browser under a stable name
const browser = await chromium.launch({ headless: false });
await browser.bind('shared-checkout-session');

console.log('Browser bound. Other agents can now connect.');
\`\`\`

A second agent connects by name instead of launching its own browser:

\`\`\`typescript
import { chromium } from '@playwright/test';

// Agent B attaches to the existing bound session
const browser = await chromium.connect({ bind: 'shared-checkout-session' });
const context = browser.contexts()[0] ?? (await browser.newContext());
const page = context.pages()[0] ?? (await context.newPage());

// Agent B continues the flow Agent A started, same cookies, same state
await page.getByRole('button', { name: 'Place order' }).click();
\`\`\`

This solves a real problem in multi-agent systems: state handoff. Before \`bind()\`, passing a logged-in session from one agent to another meant exporting storage state, serializing cookies, and hoping nothing drifted. Now a planner agent can authenticate, bind the session, and let a specialist agent take over without re-authenticating.

## playwright-cli show: The Bound Browser Dashboard

To make bound sessions discoverable, 1.59 ships a dashboard command. Running \`playwright-cli show\` lists every bound browser, its name, the engine, the number of open contexts and pages, and its status.

\`\`\`bash
npx playwright-cli show
\`\`\`

\`\`\`text
NAME                       ENGINE    CONTEXTS  PAGES  STATUS
shared-checkout-session    chromium  1         2      active
nightly-regression         chromium  3         5      active
scratch-debug              firefox   0         0      idle
\`\`\`

This is the agent equivalent of \`docker ps\`: a single command that answers "what browsers exist right now and what state are they in." An orchestrator can parse this output (a \`--json\` flag is available) to decide which session to attach to, which to reuse, and which to garbage-collect.

\`\`\`bash
npx playwright-cli show --json | jq '.[] | select(.status == "idle")'
\`\`\`

## --debug=cli: Letting an Agent Attach to a Failing Test

Human debugging in Playwright has long meant \`PWDEBUG=1\` and the Inspector window. That is useless to an AI agent, which cannot click an Inspector. The new \`--debug=cli\` mode gives an agent a programmable attach point.

\`\`\`bash
npx playwright test checkout.spec.ts --debug=cli
\`\`\`

When a test fails (or hits a breakpoint), instead of opening a GUI, Playwright pauses and exposes a CLI-driven debugging protocol. An agent can attach, query the current DOM snapshot, evaluate expressions in page context, step through the remaining actions, and read the pending error, all over a text protocol it can drive without a screen.

\`\`\`bash
# An agent attaches to the paused session by id
npx playwright-cli debug attach --session sess_8f2a --eval "document.title"
npx playwright-cli debug attach --session sess_8f2a --snapshot
npx playwright-cli debug attach --session sess_8f2a --resume
\`\`\`

The practical effect: when your CI run fails at 3 a.m., an agent can attach to the paused test, inspect why the locator did not resolve, propose a fix, and re-run, all without a human ever opening the Inspector.

## await using: Automatic Resource Cleanup

Playwright 1.59 implements the JavaScript explicit resource management proposal across its core objects, so you can use \`await using\` to get deterministic, automatic cleanup of browsers, contexts, and pages.

\`\`\`typescript
import { chromium } from '@playwright/test';

async function run() {
  await using browser = await chromium.launch();
  await using context = await browser.newContext();
  await using page = await context.newPage();

  await page.goto('https://qaskills.sh');
  // No try/finally, no manual close().
  // page, then context, then browser are disposed automatically
  // in reverse order when this scope exits, even if it throws.
}
\`\`\`

This is a big deal for agent-authored code. Agents frequently forget the \`finally\` block, and a leaked browser process in a long-running agent loop is a slow memory leak. With \`await using\`, cleanup is structural rather than something the agent has to remember. We cover the mechanics in depth in our dedicated [await using automatic cleanup reference](/blog/playwright-await-using-automatic-cleanup-guide).

## 1.57: From Chromium Builds to Chrome for Testing

A quieter but consequential change landed in 1.57: Playwright switched its default Chromium channel from the custom Chromium builds it had shipped for years to Chrome for Testing, Google's officially versioned, automation-targeted Chrome distribution.

The motivation is fidelity. Chrome for Testing tracks the real Chrome release train with stable, downloadable, version-pinned binaries built specifically for automation. Tests now run against a browser much closer to what end users actually have, which reduces the class of bugs that only reproduce in "real Chrome but not Playwright Chromium."

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chrome',
      // 'chrome' now resolves to Chrome for Testing by default in 1.57+
      use: { channel: 'chrome' },
    },
  ],
});
\`\`\`

If you previously pinned \`channel: 'chromium'\` to get the bundled build, that path still works, but the recommended default is now Chrome for Testing for production-representative runs.

## 1.56 to 1.58: Quality-of-Life Improvements

Between the major themes, three smaller changes meaningfully improve daily work:

- **System theme follows the OS.** The UI mode and Trace Viewer now respect your operating system's light or dark setting automatically instead of defaulting to a fixed theme.
- **Cmd/Ctrl+F search in UI mode.** You can now search within the UI mode test list and step output with the standard find shortcut.
- **Cmd/Ctrl+F search in Trace Viewer.** The same find shortcut works inside the Trace Viewer, so locating a specific action, network request, or console line in a large trace is fast.

These sound minor, but anyone who has scrolled through a 400-step trace looking for one failing \`waitForResponse\` will appreciate them.

## Feature-by-Version Reference Table

Here is the consolidated picture of what landed where across the recent release line.

| Version | Headline feature | Category | Primary beneficiary |
|---|---|---|---|
| 1.56 | System theme follows OS | Quality of life | Humans |
| 1.57 | Chrome for Testing as default channel | Fidelity | Humans + CI |
| 1.57 | Cmd/Ctrl+F search in UI mode | Quality of life | Humans |
| 1.58 | Cmd/Ctrl+F search in Trace Viewer | Quality of life | Humans |
| 1.59 | page.screencast with action annotations | Recording | Agents + humans |
| 1.59 | browser.bind() shared sessions | Multi-agent | Agents |
| 1.59 | playwright-cli show dashboard | Discovery | Agents + orchestrators |
| 1.59 | npx playwright test --debug=cli | Debugging | Agents |
| 1.59 | await using disposal support | Resource management | Agents + humans |

## Human Workflow vs Agentic Workflow

The clearest way to understand 1.59 is to compare how a human and an agent now approach the same tasks.

| Task | Human workflow (pre-1.59) | Agentic workflow (1.59) |
|---|---|---|
| Start a session | Launch browser in test process | \`browser.bind()\` a named, shareable session |
| Hand off state | Export storageState JSON manually | Second agent \`connect({ bind })\` to live session |
| See what is running | Read terminal logs, guess | \`playwright-cli show --json\` lists all sessions |
| Debug a failure | Open Inspector GUI, click around | Attach via \`--debug=cli\`, query over text protocol |
| Record a run | Passive recordVideo on context | \`page.screencast\` with per-action annotations |
| Clean up | Manual close() in finally block | \`await using\` disposes automatically (LIFO) |
| Review a recording | Watch the video frame by frame | Parse action-annotated frames programmatically |

The agentic column is not just "the same thing automated." Each row replaces a human-shaped affordance (a GUI, a manual export, a video you watch) with a machine-readable interface an agent can drive deterministically.

## Migrating an Existing Suite to the Agentic Primitives

You do not have to rewrite anything to adopt 1.59. The new APIs are additive. A sensible adoption path:

1. **Upgrade and switch to Chrome for Testing.** Bump to 1.59 and let \`channel: 'chrome'\` resolve to Chrome for Testing. Run your suite and triage any rendering differences.
2. **Adopt \`await using\` in helper code.** Anywhere you have manual \`browser.close()\` in a \`finally\`, replace it with \`await using\`. This is a pure reliability win.
3. **Add screencast to flaky flows.** For the handful of tests that fail intermittently, switch on \`page.screencast\` with annotations so you (or an agent) can see exactly what happened.
4. **Introduce \`bind()\` only where you have multi-agent handoff.** Most suites do not need shared sessions; reach for \`bind()\` when one agent must continue another's authenticated state.

If your team also runs API-level checks alongside browser tests, our comparison of [Postman versus Playwright for API testing](/blog/postman-vs-playwright) covers where each tool fits in an agent-driven pipeline. And if you test mobile viewports, the agentic primitives compose cleanly with the techniques in our [Playwright mobile emulation guide](/blog/playwright-mobile-emulation).

## Orchestrating Multiple Agents With Bound Sessions

The combination of \`browser.bind()\` and \`playwright-cli show\` unlocks a real orchestration pattern that was painful before 1.59. Imagine a system where a planner agent decides what to test, a navigator agent drives the browser, and a verifier agent checks the result. All three need to operate on the same authenticated session.

\`\`\`typescript
import { chromium } from '@playwright/test';

// Planner: authenticate once and publish the session
async function planner() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://qaskills.sh/login');
  await page.getByLabel('Email').fill('agent@qaskills.sh');
  await page.getByLabel('Password').fill(process.env.AGENT_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');

  // Publish the authenticated session for downstream agents
  await browser.bind('regression-2026-06');
  return 'regression-2026-06';
}
\`\`\`

A downstream agent attaches by name and inherits the logged-in state with zero re-authentication:

\`\`\`typescript
async function navigator(sessionName: string) {
  const browser = await chromium.connect({ bind: sessionName });
  const context = browser.contexts()[0];
  const page = await context.newPage();

  // Already authenticated thanks to the planner's session
  await page.goto('https://qaskills.sh/dashboard/skills');
  await page.getByRole('button', { name: 'Publish skill' }).click();
}
\`\`\`

An orchestrator can poll the dashboard between steps to confirm the session is still healthy before dispatching the next agent, which makes the whole pipeline observable in a way that previously required custom logging.

\`\`\`bash
# Orchestrator health check between agent handoffs
status=$(npx playwright-cli show --json | jq -r '.[] | select(.name=="regression-2026-06") | .status')
if [ "$status" != "active" ]; then echo "session lost, re-planning"; fi
\`\`\`

## Combining screencast With Annotations for Agent Review

Action-annotated screencasts become powerful when an agent reviews them programmatically rather than a human watching a video. Because each frame carries the action that produced it, an agent can build a timeline of what happened and pinpoint the exact step where a flow diverged from the expectation.

\`\`\`typescript
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();

const timeline: { action: string; at: number }[] = [];
const screencast = await page.screencast.start({
  dir: './recordings',
  annotateActions: true,
});

screencast.on('frame', (frame) => {
  if (frame.action) {
    timeline.push({ action: frame.action.apiName, at: frame.timestamp });
  }
});

await page.goto('https://qaskills.sh');
await page.getByRole('link', { name: 'Skills' }).click();
await screencast.stop();

// An agent can now reason over the action timeline
console.log(JSON.stringify(timeline, null, 2));
await browser.close();
\`\`\`

This turns a recording from a passive artifact into structured data, which is the recurring theme of the whole release: replace human-shaped outputs with machine-readable ones.

## Frequently Asked Questions

### What does it mean that Playwright 1.59 is the agentic release?

It means the release was designed around AI agents driving the browser rather than humans. Features like \`browser.bind()\` for shared sessions, the \`playwright-cli show\` dashboard, and \`--debug=cli\` give agents machine-readable interfaces for discovery, handoff, and debugging that previously only existed as human-facing GUIs and manual workflows.

### How is page.screencast different from recordVideo?

\`recordVideo\` is a passive context option that records the entire context lifetime to a video file. \`page.screencast\` is an explicit API you start and stop on demand, it can emit frames in real time, and with \`annotateActions: true\` each frame carries metadata about the Playwright action that produced it, so an agent can correlate visuals with actions.

### What is browser.bind() used for?

\`browser.bind()\` publishes a running browser under a stable name so other processes or agents can attach to the same live session with \`chromium.connect({ bind })\`. It is mainly used for multi-agent handoff, letting one agent authenticate and bind a session that another agent then continues, without re-exporting cookies or storage state.

### Do I need to change my code to use await using in Playwright?

Only the cleanup code. Replace manual \`browser.close()\` calls inside \`finally\` blocks with \`await using browser = await chromium.launch()\`. You also need a TypeScript target and lib that include the disposable types, plus a Node version that supports the disposal protocol. The rest of your test logic stays the same.

### Why did Playwright switch to Chrome for Testing in 1.57?

To improve fidelity. Chrome for Testing is Google's officially versioned, automation-targeted Chrome distribution that tracks the real Chrome release train. Running against it instead of custom Chromium builds means tests execute on a browser much closer to what end users have, reducing bugs that only reproduce in the old bundled Chromium.

### Can an AI agent debug a failing Playwright test on its own now?

Yes. Running a test with \`--debug=cli\` pauses on failure and exposes a text-driven debugging protocol instead of the GUI Inspector. An agent can attach to the paused session, query DOM snapshots, evaluate expressions in page context, read the pending error, and resume, all without a human opening any window.

### Is Playwright 1.59 backward compatible with my existing tests?

Yes. All the agentic features are additive. Your existing tests run unchanged after upgrading. The main thing to verify is the default channel switch to Chrome for Testing from 1.57, which can occasionally surface minor rendering differences compared to the old bundled Chromium build.

### How do I see all the bound browser sessions that are running?

Run \`npx playwright-cli show\`, which prints a table of every bound browser with its name, engine, context count, page count, and status. Add \`--json\` to get machine-readable output that an orchestrator can parse to decide which sessions to reuse, attach to, or clean up.

## Conclusion

Playwright 1.59 is a genuine inflection point. The combination of \`page.screencast\`, \`browser.bind()\`, the CLI dashboard, \`--debug=cli\`, and \`await using\` turns Playwright from a tool humans use to write tests into a platform agents use to drive browsers. The quality-of-life work in 1.56 to 1.58 and the Chrome for Testing switch in 1.57 round out a release line that is both more reliable and more automatable than anything before it.

If you are building AI-driven testing into your workflow, the fastest way to get production-ready patterns is to start from proven, agent-friendly skills. Browse the [QASkills directory](/skills) for ready-to-install Playwright and agent-testing skills you can drop into Claude Code, Cursor, and other AI coding agents today.
`,
};
