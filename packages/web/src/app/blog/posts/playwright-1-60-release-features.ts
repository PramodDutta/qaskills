import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright 1.60 New Features: A 2026 Reference Guide',
  description:
    'A complete reference to Playwright 1.60 new features in 2026: locator.drop(), tracing.startHar(), page.screencast, browser.bind(), the trace CLI, system theme, and UI search.',
  date: '2026-07-13',
  category: 'Reference',
  content: `
# Playwright 1.60 New Features: A 2026 Reference Guide

Playwright 1.60 is one of the more feature-dense releases of the 2026 cycle. It sharpens drag-and-drop with a first-class \`locator.drop()\` API, adds HAR recording through \`tracing.startHar()\`, ships an annotated \`page.screencast\` for narrated video, introduces \`browser.bind()\` so one browser instance is shared across the CLI, the MCP server, and your test runner, and layers on a standalone \`npx playwright trace\` command. On top of that you get a system theme option, in-app search with Cmd/Ctrl+F in both UI mode and the Trace Viewer, and a batch of diagnostic improvements. This reference walks each feature with a short, runnable example and the upgrade path so you can adopt them one at a time.

If you want the wider context for the year, pair this page with our [What's New in Playwright 2026](/blog/whats-new-playwright-2026) overview. For a catalog of ready-made QA automation skills you can drop into an AI coding agent, browse the [skills directory](/skills).

## Upgrading to Playwright 1.60

The upgrade is a normal dependency bump. Nothing in 1.60 forces a breaking change for existing suites, so most teams can move in a single commit and adopt the new APIs gradually.

\`\`\`ts
// Bump the package and refresh the browser binaries.
// npm i -D @playwright/test@1.60
// npx playwright install --with-deps
\`\`\`

After the install, confirm the version so you know the new APIs are actually present before you start calling them.

\`\`\`ts
// npx playwright --version
// Expected: Version 1.60.x
\`\`\`

The rule of thumb for every feature below: adopt it in one test file first, run that file in isolation, then roll it out across the suite. None of these APIs require a config rewrite, so incremental adoption is the safe path.

It is worth pinning the exact version in your \`package.json\` rather than floating on a caret range while you evaluate the new APIs. That way a teammate who runs \`npm install\` gets the same binaries you tested against, and a CI cache miss cannot silently pull a different patch. Once the team is comfortable, you can relax the pin. This is standard hygiene for any test-tooling upgrade, but it matters more here because several of the new features (screencast attachments, trace CLI subcommands) surface in the HTML report, and you want every reviewer looking at the same report shape.

## New APIs at a glance

The table below summarizes the headline additions so you can scan what is new before reading the deep dives.

| API | Purpose | Scope | Typical caller |
| --- | --- | --- | --- |
| \`locator.drop(target)\` | Ergonomic drag-and-drop onto a target locator | Locator | Test code |
| \`tracing.startHar()\` | Record network traffic as a HAR archive | BrowserContext tracing | Test setup |
| \`page.screencast()\` | Capture annotated video of a page session | Page | Test code |
| \`browser.bind()\` | Share one browser across CLI, MCP, and tests | Browser | Fixtures / global setup |
| \`npx playwright trace\` | Open, merge, and inspect traces from the CLI | CLI | Terminal |
| \`use.colorScheme: 'system'\` | Follow the OS light or dark theme | Config / test | Config |

Each row maps to a section below. The columns matter: an API scoped to \`Locator\` is called on an element handle, while a \`tracing\` API is called on the context, and getting the scope wrong is the most common early mistake.

## locator.drop(): first-class drag-and-drop

Before 1.60 the idiomatic way to drag was \`locator.dragTo(target)\`, which is still supported. The new \`locator.drop()\` reads as the natural inverse and pairs cleanly with a preceding hover or press when you need finer control over the gesture. It resolves the source locator, performs a press, moves to the center of the target locator, and releases.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('reorder a kanban card with drop', async ({ page }) => {
  await page.goto('/board');

  const card = page.getByRole('listitem', { name: 'Write release notes' });
  const doneColumn = page.getByRole('list', { name: 'Done' });

  await card.drop(doneColumn);

  await expect(doneColumn.getByText('Write release notes')).toBeVisible();
});
\`\`\`

The upgrade path is trivial: existing \`dragTo\` calls keep working, so you only reach for \`drop()\` in new tests or when the source-centric reading is clearer. For HTML5 drag-and-drop that depends on native \`dragstart\` events, keep an eye on the target application's event handling and add explicit \`hover()\` steps if a widget needs a settle frame between grab and release.

## tracing.startHar(): record network as HAR

HAR (HTTP Archive) files capture every request and response for a session. Playwright 1.60 exposes \`tracing.startHar()\` so you can record a HAR alongside, or independently of, a normal trace. This is useful for diffing API traffic between runs, replaying a session against a mock, or attaching a network log to a bug report.

\`\`\`ts
import { test } from '@playwright/test';

test('capture network as HAR', async ({ page, context }) => {
  await context.tracing.startHar({ path: 'checkout.har', content: 'embed' });

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.getByText('Order confirmed').waitFor();

  await context.tracing.stopHar();
});
\`\`\`

The \`content\` option controls whether response bodies are embedded in the archive or omitted for size. Use \`'embed'\` when you want a fully self-contained replayable archive, and omit bodies for large media responses. The upgrade path is additive: HAR recording is off by default, so nothing changes until you opt in per test or in a fixture.

## page.screencast(): annotated video

Playwright has recorded video for years through the \`video\` config option. What 1.60 adds is \`page.screencast()\`, a programmatic capture that lets you start and stop recording inside a test and attach annotations (captions or markers) at specific moments. That makes it ideal for narrated walkthroughs, demo recordings, and failure clips where you want a label on screen at the exact step that broke.

\`\`\`ts
import { test } from '@playwright/test';

test('record an annotated onboarding clip', async ({ page }) => {
  const cast = await page.screencast({ path: 'onboarding.webm' });

  await page.goto('/welcome');
  await cast.annotate('Step 1: create a workspace');
  await page.getByLabel('Workspace name').fill('Acme QA');
  await page.getByRole('button', { name: 'Continue' }).click();

  await cast.annotate('Step 2: invite a teammate');
  await page.getByLabel('Email').fill('teammate@example.com');
  await page.getByRole('button', { name: 'Send invite' }).click();

  await cast.stop();
});
\`\`\`

For a full tutorial on both the classic \`video\` config and the newer screencast approach, see our dedicated guide on [recording video of Playwright tests](/blog/playwright-screencast-video-recording). The upgrade path: \`page.screencast()\` is opt-in per test and coexists with the global \`video\` setting, so you can keep suite-wide video on and add annotated clips only where they add value.

## browser.bind(): one browser everywhere

A recurring 2026 pain point is running three browsers: one for the Playwright CLI codegen, one for the [MCP server](/blog/mcp-server-testing-guide-2026) driving an AI agent, and one for your test runner. \`browser.bind()\` lets you register a single launched browser as the shared instance so the CLI, an MCP session, and your tests all attach to the same process. That means shared auth state, a single window to watch, and no port juggling.

\`\`\`ts
import { chromium } from '@playwright/test';

// In global setup: launch once and bind it as the shared browser.
async function globalSetup() {
  const browser = await chromium.launch({ headless: false });
  await browser.bind({ name: 'shared' });
  // The CLI and MCP server can now attach to the 'shared' browser
  // instead of launching their own instances.
}

export default globalSetup;
\`\`\`

The upgrade path here is opt-in and mostly a workflow change. If you never mix the CLI, MCP, and test runner in one session, you can ignore \`browser.bind()\` entirely. If you do, binding removes the most common source of confusion (which window am I looking at) and lets a single authenticated session flow across all three tools.

## npx playwright trace: the trace CLI

Traces were previously opened through \`npx playwright show-trace\`. Playwright 1.60 promotes trace handling to a richer \`npx playwright trace\` command that can open a trace, merge multiple trace files, and print a summary without launching the full viewer. This is handy in CI where you want a quick text summary of what a trace contains before deciding to download it.

\`\`\`ts
// Open a single trace in the viewer:
// npx playwright trace open trace.zip

// Merge shard traces into one before opening:
// npx playwright trace merge shard-1.zip shard-2.zip -o merged.zip

// Print a summary without opening the UI:
// npx playwright trace info trace.zip
\`\`\`

The upgrade path: \`show-trace\` still works, so no scripts break. Migrate CI helper scripts to \`trace info\` when you want a fast, headless summary, and use \`trace merge\` when a sharded run produces one trace per shard that you would rather review as a single timeline.

## System theme and appearance

Playwright 1.60 adds \`'system'\` as a value for \`colorScheme\`, so a context follows the host operating system's light or dark preference instead of a hardcoded choice. This is convenient when you want local runs to match your desktop appearance while CI can still pin an explicit value for determinism.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    // Follow the OS theme locally; pin 'light' or 'dark' in CI for stable snapshots.
    colorScheme: process.env.CI ? 'light' : 'system',
  },
});
\`\`\`

You can still override per test with \`await page.emulateMedia({ colorScheme: 'dark' })\`. The upgrade path is a one-line config change, and because visual snapshots depend on theme, keep CI pinned to an explicit scheme so golden images stay stable across machines.

## Developer experience: search and diagnostics

Two changes in 1.60 are pure developer-experience wins that ship the moment you upgrade: an in-app search box across the tooling, and richer error output on failed actions. Neither requires a config change, and together they cut the time between a red run and understanding what went wrong.

### Cmd/Ctrl+F search in UI mode and Trace Viewer

Both UI mode and the Trace Viewer gained a Cmd/Ctrl+F search box in 1.60. In UI mode it filters the test tree by title; in the Trace Viewer it searches across action names, network URLs, and console output. For large suites and long traces this turns a scroll hunt into an instant jump.

| Surface | Shortcut | Searches over |
| --- | --- | --- |
| UI mode | Cmd/Ctrl+F | Test titles and file paths |
| Trace Viewer | Cmd/Ctrl+F | Action log, network requests, console messages |
| Report HTML | Cmd/Ctrl+F | Browser-native page find |

There is no code to write here, which is the point: the search is a pure developer-experience win that ships the moment you upgrade. Combine Trace Viewer search with the new \`trace info\` CLI to triage failures quickly, first summarizing a trace in the terminal, then opening it and jumping straight to the failing action. On a suite with hundreds of tests, filtering the UI-mode tree to a single feature area before you hit run is a small change that compounds across a workday.

### Enhanced diagnostics

Beyond the headline APIs, 1.60 tightens error output. Action timeouts now include a compact locator resolution summary (what the locator matched, how many elements, and why the wait failed), and attachments from \`page.screencast()\` and \`tracing.startHar()\` are surfaced directly in the HTML report next to the failing step. If you assert against the accessibility tree, these diagnostics pair especially well with role-based locators covered in our [ARIA snapshot testing guide](/blog/playwright-aria-snapshot-testing-guide).

\`\`\`ts
import { test, expect } from '@playwright/test';

test('diagnostic-friendly assertion', async ({ page }) => {
  await page.goto('/settings');
  // On failure, the error now reports how many elements the role matched
  // and the last-known state of the locator wait.
  await expect(page.getByRole('switch', { name: 'Email notifications' })).toBeChecked();
});
\`\`\`

The upgrade path is nothing: better diagnostics arrive automatically. The practical change is that you should read the new resolution summary before reaching for a screenshot, because it often names the exact reason a locator failed to resolve.

## Version-by-version highlights: 1.59 to 1.60

The table below places 1.60 in context against the prior release so you can see what carried over and what is genuinely new.

| Area | Playwright 1.59 | Playwright 1.60 |
| --- | --- | --- |
| Drag-and-drop | \`locator.dragTo()\` | Adds \`locator.drop()\` |
| Network capture | Route-based recording | Adds \`tracing.startHar()\` |
| Video | \`use.video\` config | Adds annotated \`page.screencast()\` |
| Browser sharing | Separate instances per tool | Adds \`browser.bind()\` |
| Trace tooling | \`show-trace\` | Adds \`npx playwright trace\` (open, merge, info) |
| Theme | \`'light'\` / \`'dark'\` | Adds \`'system'\` |
| Search | Report find only | Cmd/Ctrl+F in UI mode and Trace Viewer |

Read this as a migration map. Everything in the 1.59 column still works in 1.60, so the release is a superset. When you upgrade, you gain the right column without losing the left, which is why the recommended approach is a single dependency bump followed by opt-in adoption per feature.

## Putting it together

A realistic 1.60 setup combines several of these features: bind one browser for a shared session, record a HAR for the API-heavy flows, capture an annotated screencast for the critical path, and pin the theme in CI. The example below shows how the pieces layer without conflicting.

\`\`\`ts
import { test } from '@playwright/test';

test('critical checkout flow, fully instrumented', async ({ page, context }) => {
  await context.tracing.startHar({ path: 'checkout.har', content: 'embed' });
  const cast = await page.screencast({ path: 'checkout.webm' });

  await page.goto('/cart');
  await cast.annotate('Reviewing cart');
  await page.getByRole('button', { name: 'Checkout' }).click();

  await cast.annotate('Placing order');
  await page.getByRole('button', { name: 'Place order' }).click();
  await page.getByText('Order confirmed').waitFor();

  await cast.stop();
  await context.tracing.stopHar();
});
\`\`\`

The instrumentation is additive and each piece can be toggled independently, so you can start with just the screencast, add HAR when you need network diffs, and layer in \`browser.bind()\` only when your workflow mixes the CLI, MCP, and test runner.

One caution: instrumentation has a cost. Recording a HAR with embedded bodies and an annotated screencast on every test would bloat your artifacts and slow the run. Reserve the fully-instrumented pattern for a small set of business-critical journeys (checkout, signup, payment) and keep the rest of the suite lean. A practical split is to gate the heavy instrumentation behind a project or a tag, so a dedicated CI job records everything for the critical paths while the main run stays fast. That keeps the signal high without paying the storage and time cost on hundreds of routine tests.

## Frequently Asked Questions

### Does locator.drop() replace dragTo()?

No. Both are supported in 1.60 and do the same underlying gesture. \`dragTo()\` reads from the source perspective (drag this to there) while \`drop()\` reads from the action perspective (drop it onto there). Use whichever makes a given test clearer. Existing \`dragTo()\` calls need no migration, so pick \`drop()\` only for new tests where its phrasing fits better.

### Is HAR recording a replacement for tracing?

No, they capture different things. A trace records actions, snapshots, and the full timeline for the Trace Viewer, while \`tracing.startHar()\` records only network traffic in the portable HAR format. Use a trace to debug why a step failed, and a HAR to diff API traffic between runs or replay a session against a mock. Many teams record both on their most important flows.

### How is page.screencast() different from the video config option?

The \`video\` config option records the whole session automatically for every test. \`page.screencast()\` is called inside a test so you control exactly when recording starts and stops, and it supports \`annotate()\` to overlay captions at specific moments. Use the config option for blanket failure clips, and screencast for narrated walkthroughs or demos where the on-screen labels matter.

### What problem does browser.bind() actually solve?

It removes the confusion of running three separate browsers when you mix the Playwright CLI, the MCP server driving an AI agent, and your test runner in one session. Binding registers a single launched browser as the shared instance so all three attach to the same process, giving you one window to watch and shared authentication state instead of three isolated sessions.

### Will upgrading to 1.60 break my existing suite?

In almost all cases, no. Playwright 1.60 is a superset of 1.59: every prior API keeps working and the new features are opt-in. The safest path is a single dependency bump, \`npx playwright install --with-deps\` to refresh binaries, then a full suite run to confirm green before you start adopting the new APIs one file at a time.

### Should I pin colorScheme in CI or use 'system'?

Pin an explicit \`'light'\` or \`'dark'\` in CI. Visual snapshots depend on theme, so a \`'system'\` value that follows the host OS would make golden images differ between machines. Use \`'system'\` for local runs to match your desktop, and gate the config on an environment variable so CI stays deterministic while local development stays convenient.

### Does the new trace CLI replace show-trace?

Not entirely. \`npx playwright show-trace\` still works and opens the viewer. The new \`npx playwright trace\` command adds subcommands: \`open\` for the viewer, \`merge\` to combine sharded traces into one timeline, and \`info\` to print a headless summary. Migrate CI helper scripts to \`trace info\` for fast summaries, but you are not required to change anything to upgrade.

### Where do screencast and HAR files show up after a run?

Both are written to the path you pass and, on 1.60, are also surfaced as attachments in the HTML report next to the step that produced them. That means a reviewer opening the report can play the annotated clip or download the HAR without hunting through the output directory. Configure your CI to upload the report artifact and the linked files travel with it.
`,
};
