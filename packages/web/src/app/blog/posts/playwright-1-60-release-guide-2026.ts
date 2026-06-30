import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright 1.60 New Features — The Complete 2026 Release Guide',
  description:
    'Everything new in Playwright 1.60 (May 2026): test agents (planner, generator, healer), the MCP server, ARIA snapshots, Screencast API, and browser.bind().',
  date: '2026-06-30',
  category: 'Reference',
  content: `
# Playwright 1.60: Every New Feature, Explained

Playwright 1.60 landed in May 2026, and it is one of the most agent-focused releases the project has shipped. Building directly on the 1.59 line, this version doubles down on three themes: making AI agents first-class testing citizens, hardening accessibility-driven assertions, and giving developers richer debugging surfaces. If you have been following the project, 1.60 is less a single headline feature and more a consolidation — the test agents introduced as previews are now production-ready, the Model Context Protocol (MCP) server is more capable, and ARIA snapshots have matured into a recommended assertion style.

For QA engineers and SDETs, the practical impact is significant. The planner, generator, and healer agents change how you author and maintain suites: you can describe what to test in natural language, let Playwright explore the app, and generate or repair tests automatically. The MCP server lets any agent that speaks MCP — Claude Code, Cursor, and others — drive a browser through Playwright's structured tooling. And on the runtime side, \`browser.bind()\`, an upgraded Screencast API, and UI mode improvements make day-to-day debugging faster.

This guide walks through every meaningful change in 1.60 with real, runnable TypeScript and CLI examples. We cover upgrading safely, the test agents and how to invoke them, the MCP server, ARIA snapshots, the Screencast API, \`page.clock\` patterns, \`browser.bind()\`, UI mode and system theme, and a migration checklist. For broader context, pair this with our [what's new in Playwright 2026 overview](/blog/whats-new-playwright-2026), the [1.59 Screencast API deep dive](/blog/playwright-1-59-screencast-api-guide-2026), and the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide). You can also find agent-ready Playwright skills in the [QA skills directory](/skills).

## Key Takeaways

- **Test agents are production-ready**: the planner, generator, and healer agents move from preview to stable, drivable from the CLI and your IDE.
- **MCP server matures**: Playwright's MCP server exposes structured browser tools so any MCP-capable agent can navigate, assert, and snapshot.
- **ARIA snapshots are the recommended assertion**: \`toMatchAriaSnapshot\` captures the accessibility tree as a stable, human-readable contract.
- **Screencast API and UI mode** get quality-of-life upgrades, including better recording controls and faster trace stepping.
- **\`browser.bind()\` and system theme** simplify connecting to existing browsers and matching OS dark/light preference.

## Upgrading to 1.60

Upgrade the package and refresh browser binaries. The browser download is required because 1.60 ships updated Chromium, Firefox, and WebKit builds.

\`\`\`bash
# Upgrade Playwright and its test runner
npm install -D @playwright/test@1.60

# Always re-install browsers after a version bump
npx playwright install --with-deps

# Confirm the version
npx playwright --version
\`\`\`

If you pin browsers in CI, update the cache key to include the new version so stale binaries are not reused. Run your existing suite first; 1.60 is backwards compatible with 1.59 test code, so a clean run before adopting new features is the safest path.

## Test Agents: Planner, Generator, Healer

The marquee feature of the 1.59/1.60 line is the trio of test agents. Instead of hand-writing every selector and assertion, you describe intent and let Playwright drive a real browser to produce or repair tests. The three agents have distinct jobs:

| Agent | Input | Output | When to use |
| --- | --- | --- | --- |
| Planner | App URL + goal | A test plan (steps, scenarios) | Starting coverage on a new flow |
| Generator | A plan or prompt | Runnable spec files | Turning a plan into real tests |
| Healer | A failing test + live app | A repaired test | Fixing tests after UI changes |

The agents are exposed through the CLI and integrate with MCP-capable IDEs. A typical end-to-end flow looks like this:

\`\`\`bash
# 1. Plan: explore the app and produce a structured test plan
npx playwright agent plan \\
  --url https://demo.qaskills.sh/checkout \\
  --goal "Verify a logged-in user can add an item and complete checkout"

# 2. Generate: turn the approved plan into spec files
npx playwright agent generate \\
  --plan plans/checkout.plan.md \\
  --out tests/checkout.spec.ts

# 3. Heal: repair a test that broke after a UI change
npx playwright agent heal \\
  --test tests/checkout.spec.ts \\
  --url https://demo.qaskills.sh/checkout
\`\`\`

The generator produces idiomatic Playwright with role-based locators and auto-waiting assertions, not brittle CSS selectors. A generated checkout test typically looks like this:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('logged-in user completes checkout', async ({ page }) => {
  await page.goto('https://demo.qaskills.sh/checkout');

  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.getByText('1 item in cart')).toBeVisible();

  await page.getByRole('link', { name: 'Checkout' }).click();
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Pay now' }).click();

  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
});
\`\`\`

The healer is the most novel of the three for maintenance-heavy teams. When a selector breaks because a label changed, the healer re-explores the live app, finds the new equivalent element, and proposes a patch — turning what used to be a manual triage chore into a reviewable diff. For a deeper look at the agent workflow inside Claude Code, see our [Playwright test agents guide](/blog/playwright-e2e-complete-guide).

## The Playwright MCP Server

Playwright ships an MCP (Model Context Protocol) server that exposes browser automation as structured tools any MCP client can call. This is what lets an agent navigate, click, type, and snapshot without you writing glue code. Start it with the CLI:

\`\`\`bash
# Launch the Playwright MCP server (stdio transport)
npx @playwright/mcp@latest

# Or run headed for visible debugging
npx @playwright/mcp@latest --headed
\`\`\`

To register it with an MCP-capable client like Claude Code, add it to your MCP config:

\`\`\`json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
\`\`\`

Once connected, the agent works against the accessibility tree rather than raw pixels, which makes its actions deterministic and its snapshots stable. This pairs naturally with ARIA snapshots, covered next.

## ARIA Snapshots: The Recommended Assertion

ARIA snapshots capture a page's accessibility tree as a readable YAML-like structure and assert against it with \`toMatchAriaSnapshot\`. They are more resilient than DOM or pixel snapshots because they reflect semantic roles, not markup details. In 1.60 they are the recommended way to lock down complex UI state.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('navigation matches accessibility contract', async ({ page }) => {
  await page.goto('https://demo.qaskills.sh');

  await expect(page.getByRole('navigation')).toMatchAriaSnapshot(\`
    - navigation:
      - link "Leaderboard"
      - link "Skills"
      - link "Blog"
      - link "Agents"
      - link "Packs"
  \`);
});
\`\`\`

You can also capture a snapshot programmatically to seed the expected value, then commit it:

\`\`\`typescript
const snapshot = await page.getByRole('main').ariaSnapshot();
console.log(snapshot); // paste into toMatchAriaSnapshot during authoring
\`\`\`

Because the snapshot describes roles and accessible names, it doubles as a lightweight accessibility check — if a button loses its accessible name, the snapshot fails, surfacing the regression immediately.

## Screencast API Improvements

The Screencast API, introduced in the 1.59 line, gains finer control in 1.60 for capturing video of a session on demand rather than only via the global \`video\` config. This is useful for recording just the failing portion of a long suite. For the full background, see our [1.59 Screencast API guide](/blog/playwright-1-59-screencast-api-guide-2026).

\`\`\`typescript
import { test } from '@playwright/test';

test('record only the critical interaction', async ({ page }) => {
  await page.goto('https://demo.qaskills.sh/dashboard');

  // Start an on-demand screencast for the section that matters
  const recording = await page.context().startScreencast({
    dir: 'recordings/',
    size: { width: 1280, height: 720 },
  });

  await page.getByRole('button', { name: 'Generate report' }).click();
  await page.getByRole('progressbar').waitFor({ state: 'detached' });

  const path = await recording.stop();
  console.log('Saved screencast to', path);
});
\`\`\`

On-demand recording keeps artifact sizes small in CI while still giving you video evidence for the exact step you care about.

## Deterministic Time with page.clock

Flaky tests around timers, debounces, and "expires in N minutes" UIs are tamed with \`page.clock\`, which lets you install a controllable clock and fast-forward time. This API stabilizes in the 1.60 line as the standard way to test time-dependent behavior.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('session banner appears after inactivity', async ({ page }) => {
  // Freeze time at a known instant before navigating
  await page.clock.install({ time: new Date('2026-05-15T10:00:00Z') });
  await page.goto('https://demo.qaskills.sh/app');

  // Jump 15 minutes forward without real waiting
  await page.clock.fastForward('15:00');

  await expect(page.getByText('Your session is about to expire')).toBeVisible();
});
\`\`\`

Combining \`page.clock\` with ARIA snapshots gives you fast, deterministic coverage of UI that used to require fragile real-time waits.

## browser.bind(): Connecting to Existing Browsers

\`browser.bind()\` simplifies attaching Playwright to a browser you launched or controlled elsewhere — for example, a browser an agent already opened, or a long-lived session you want to reuse across tests. It returns a Playwright \`Browser\` handle bound to the existing instance.

\`\`\`typescript
import { chromium } from '@playwright/test';

// Bind to an already-running browser exposing a CDP endpoint
const browser = await chromium.bind('http://localhost:9222');
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('https://demo.qaskills.sh');
console.log(await page.title());

// bind() does not close the underlying browser on disconnect
await browser.close();
\`\`\`

This is especially handy in agent workflows where the MCP server or a separate process owns the browser lifecycle and your test code just needs to drive an existing tab.

## UI Mode and System Theme

UI mode — the interactive runner you launch with \`--ui\` — gets faster trace stepping, clearer watch-mode indicators, and better filtering by tag or file in 1.60. It also now respects your operating system's color scheme by default, switching between light and dark to match the OS.

\`\`\`bash
# Launch the interactive UI mode
npx playwright test --ui

# Run only tests tagged @smoke in watch mode
npx playwright test --ui --grep @smoke
\`\`\`

If you prefer to force a theme regardless of the OS preference, the runner exposes a theme toggle in its settings, and your tests can emulate either scheme independently:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('dark mode renders the dark logo', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('https://demo.qaskills.sh');
  await expect(page.getByAltText('QASkills dark logo')).toBeVisible();
});
\`\`\`

## Wiring Agents into Your Config

The test agents read your existing \`playwright.config.ts\`, so they generate tests that respect your \`baseURL\`, projects, and reporters. Keeping the config tidy makes generated output cleaner. A typical 1.60 config that the generator and healer cooperate with looks like this:

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['html'], ['junit', { outputFile: 'results/junit.xml' }]],
  use: {
    baseURL: 'https://demo.qaskills.sh',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
\`\`\`

Because \`baseURL\` is set, the generator emits relative \`page.goto('/checkout')\` calls instead of hardcoded URLs, and the healer re-runs against the same projects you defined. This keeps agent-authored tests consistent with hand-written ones.

## Trace Viewer and Debugging

The trace viewer remains the fastest way to debug a failure, and 1.60 improves stepping performance for large traces produced by long agent-generated suites. Record a trace on retry (as in the config above) and open it:

\`\`\`bash
# Run, then open the recorded trace for a failing test
npx playwright test tests/checkout.spec.ts
npx playwright show-trace test-results/checkout-*/trace.zip
\`\`\`

The trace bundles a DOM snapshot per action, network logs, console output, and any on-demand screencast you captured. Combined with ARIA snapshots, this gives you both a semantic assertion and a visual timeline, which is exactly the evidence you want when reviewing a healer-proposed patch before merging it.

## Reusable Fixtures with Agent-Generated Tests

Agent output composes with custom fixtures, so shared setup like authentication is written once and reused. Define a fixture that logs in and provides an authenticated page:

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

type Fixtures = { authedPage: import('@playwright/test').Page };

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('qa@example.com');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await use(page);
  },
});

export { expect };
\`\`\`

When you point the generator at a flow behind login and tell it to use this fixture, it imports your custom \`test\` and writes scenarios against \`authedPage\` instead of re-authenticating in every spec. This keeps suites DRY even as agents scale up coverage.

## Feature Summary

| Feature | What it does | How you use it |
| --- | --- | --- |
| Planner agent | Explores app, writes a test plan | \`npx playwright agent plan\` |
| Generator agent | Turns a plan into spec files | \`npx playwright agent generate\` |
| Healer agent | Repairs broken tests | \`npx playwright agent heal\` |
| MCP server | Browser tools for any MCP client | \`npx @playwright/mcp@latest\` |
| ARIA snapshots | Asserts the accessibility tree | \`toMatchAriaSnapshot\` |
| Screencast API | On-demand video recording | \`context.startScreencast()\` |
| page.clock | Deterministic timer control | \`page.clock.install/fastForward\` |
| browser.bind() | Attach to an existing browser | \`chromium.bind(endpoint)\` |
| UI mode + theme | Faster runner, OS theme | \`playwright test --ui\` |

## How the Agents Change Maintenance Economics

The most underrated impact of 1.60 is not authoring speed but maintenance cost. In most mature suites, the dominant expense is not writing new tests — it is repairing existing ones after the UI shifts. A renamed button, a restructured form, or a moved navigation link can cascade into dozens of red tests, and triaging each one by hand is the work nobody enjoys. The healer agent attacks exactly this cost center.

When a test fails because a locator no longer resolves, the healer re-explores the live application, finds the semantically equivalent element using the accessibility tree, and proposes a minimal patch. Crucially, it produces a diff you review rather than silently rewriting your tests, so you keep human judgment in the loop while eliminating the tedious detective work. Teams piloting this workflow report that the review step takes seconds compared to the minutes of manual inspection it replaces, and that the agent's role-based fixes tend to be more durable than the brittle CSS selectors a rushed human might reach for.

The planner and generator change the front end of the lifecycle in a complementary way. Instead of staring at a blank spec file, an engineer describes the flow in plain language, lets the planner explore and enumerate scenarios, and reviews a generated draft. The human still owns correctness, naming, and edge cases, but the boilerplate of navigation and locator discovery is handled. The net effect across the 1.59 and 1.60 line is that Playwright is shifting from a framework you write tests in to a framework that helps write and keep tests for you — with the developer firmly in the reviewer's seat. To see this workflow in the context of an AI IDE, read the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide).

## Migration Checklist

Adopting 1.60 is low-risk if you follow a short checklist. First, bump \`@playwright/test\` to 1.60 and run \`npx playwright install --with-deps\`. Second, run your existing suite unchanged to confirm green before touching anything. Third, pick one flaky time-dependent test and convert its real waits to \`page.clock\`. Fourth, replace one brittle DOM snapshot with a \`toMatchAriaSnapshot\` assertion. Finally, experiment with the healer agent on a recently broken test to see how its proposed patches read. Roll the agents and MCP server out gradually rather than across the whole suite at once.

## Frequently Asked Questions

### What are the main new features in Playwright 1.60?

Playwright 1.60 (May 2026) makes the planner, generator, and healer test agents production-ready, matures the MCP server for agent-driven browsing, promotes ARIA snapshots via \`toMatchAriaSnapshot\` as the recommended assertion, and adds quality-of-life upgrades to the Screencast API, UI mode, \`page.clock\`, \`browser.bind()\`, and system theme support.

### How do I upgrade to Playwright 1.60?

Run \`npm install -D @playwright/test@1.60\` then \`npx playwright install --with-deps\` to refresh browser binaries. The release is backwards compatible with 1.59 test code, so run your existing suite first to confirm a clean baseline before adopting new features like agents or ARIA snapshots.

### What are the Playwright test agents?

They are three CLI- and IDE-drivable agents. The planner explores an app and produces a structured test plan from a natural-language goal. The generator turns that plan into runnable spec files using role-based locators. The healer re-explores a live app to repair tests that broke after UI changes, proposing a reviewable patch.

### What is the Playwright MCP server used for?

The MCP server exposes browser automation as structured Model Context Protocol tools, letting any MCP-capable agent — such as Claude Code or Cursor — navigate, click, type, and snapshot through Playwright. It works against the accessibility tree, making agent actions deterministic. Launch it with \`npx @playwright/mcp@latest\`.

### What are ARIA snapshots and why use them?

ARIA snapshots capture a page's accessibility tree as a readable structure and assert against it with \`toMatchAriaSnapshot\`. They are more stable than DOM or pixel snapshots because they reflect semantic roles and accessible names rather than markup. They also double as a lightweight accessibility check when names or roles regress.

### How does page.clock fix flaky time-based tests?

\`page.clock.install()\` replaces the page's timers with a controllable clock, and \`page.clock.fastForward()\` advances time without real waiting. This makes tests for debounces, timeouts, and "expires in N minutes" UIs fast and deterministic, eliminating the arbitrary real-time \`waitForTimeout\` calls that cause flakiness.

### What does browser.bind() do?

\`browser.bind()\` (for example \`chromium.bind(endpoint)\`) attaches Playwright to an already-running browser exposed over a CDP endpoint, returning a normal \`Browser\` handle. It is ideal for agent workflows where the MCP server or another process owns the browser lifecycle and your test only needs to drive the existing instance.

## Conclusion

Playwright 1.60 is a milestone for AI-assisted testing. The planner, generator, and healer agents turn test authoring and maintenance into a guided, reviewable workflow; the MCP server makes Playwright the de facto browser layer for agents; and ARIA snapshots, \`page.clock\`, the Screencast API, and \`browser.bind()\` sharpen the everyday developer experience. Upgrade on a clean baseline, adopt one feature at a time, and let the healer prove its value on your flakiest tests first.

Ready to put 1.60 to work? Browse agent-ready Playwright and testing skills in the [QASkills.sh directory](/skills), and keep going with our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide), the [what's new in Playwright 2026 overview](/blog/whats-new-playwright-2026), and the [1.59 Screencast API guide](/blog/playwright-1-59-screencast-api-guide-2026).
`,
};
