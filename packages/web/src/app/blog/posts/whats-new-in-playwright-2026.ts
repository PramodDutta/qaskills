import type { BlogPost } from './index';

export const post: BlogPost = {
  title: "What's New in Playwright 2026: Features, Updates & Releases",
  description:
    'A complete look at what is new in Playwright 2026: test runner upgrades, trace viewer, UI mode, component testing, the Playwright MCP, and migration tips.',
  date: '2026-06-17',
  category: 'Guide',
  content: `
# What's New in Playwright 2026: Features and Updates

Playwright has moved fast over the last year, and if you last upgraded a major version ago, the gap between what you remember and what ships today is substantial. The 2026 release line has sharpened almost every part of the developer experience: the test runner is faster and smarter about retries, the trace viewer now surfaces network and console data inline, UI mode has become the default way most teams author and debug tests, component testing graduated to a much more stable footing, and the Playwright MCP turned the framework into a first-class tool for AI coding agents. This evergreen guide collects what actually changed, what it means in practice, and how to adopt each feature with real, runnable TypeScript you can paste into a project today.

The framework's core promise has not changed: one API to drive Chromium, Firefox, and WebKit, with auto-waiting built into every action so you stop sprinkling arbitrary sleeps through your suite. What has changed is the polish around that core. Web-first assertions retry until the DOM settles, the locator engine is the recommended way to find elements, and tooling like codegen, the trace viewer, and UI mode have matured into things you reach for daily rather than occasionally. If you are brand new to the tool, start with our [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026) and the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide), then come back here to see what the latest releases add on top.

This article is organized by feature area so you can jump to what matters for your team. Every section includes the practical "why" alongside copy-paste examples, and there are reference tables comparing old and new patterns. Whether you are evaluating an upgrade, writing a changelog summary for your team, or just want to know what "Playwright new features 2026" actually means beyond marketing bullet points, this is the reference. Let us start with the test runner, because that is where most of the day-to-day improvements land.

## Test Runner Improvements

The Playwright test runner has tightened up in ways that compound across a large suite. Parallelism is configured per project and the runner shards work across workers automatically, but the bigger win in the 2026 line is smarter retry and reporting behavior. Failed tests now capture richer artifacts by default, and the \`--last-failed\` flag lets you re-run only what broke on the previous run, which makes the inner loop dramatically tighter when you are chasing a single failure.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
\`\`\`

Running only what failed last time is now a single flag, and you can combine it with a grep filter to narrow further:

\`\`\`bash
npx playwright test --last-failed
npx playwright test --grep @smoke --workers=2
\`\`\`

The \`trace: 'on-first-retry'\` setting is the recommended default in 2026: traces are expensive to record on every run but invaluable when something flakes, so recording them only when a test retries gives you the diagnostic data exactly when you need it without slowing down green runs.

## Web-First Assertions and Locators

Locators remain the recommended way to find elements because they are lazy and auto-retrying. The assertion library has expanded so you rarely need to drop down to manual polling. Assertions like \`toBeVisible\`, \`toHaveText\`, and \`toHaveCount\` retry until the condition is met or the timeout expires, which removes a whole category of flaky tests.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('cart updates after adding an item', async ({ page }) => {
  await page.goto('/products');
  await page.getByRole('button', { name: 'Add to cart' }).first().click();

  const badge = page.getByTestId('cart-count');
  await expect(badge).toHaveText('1');
  await expect(page.getByRole('alert')).toContainText('Added to cart');
  await expect(page.getByRole('listitem')).toHaveCount(1);
});
\`\`\`

The recommended locator priority puts user-facing, accessibility-friendly queries first. Here is how the common options compare:

| Locator method | Example | When to use |
|---|---|---|
| getByRole | \`getByRole('button', { name: 'Submit' })\` | Default choice, matches how users and assistive tech see the page |
| getByLabel | \`getByLabel('Email address')\` | Form fields with associated labels |
| getByText | \`getByText('Welcome back')\` | Non-interactive text content |
| getByTestId | \`getByTestId('cart-count')\` | When semantics are ambiguous or text is dynamic |
| CSS / XPath | \`locator('.legacy-class')\` | Last resort for legacy markup |

Prefer the role and label locators wherever possible. They double as a lightweight accessibility check, because if Playwright cannot find an element by its role, neither can a screen reader.

## Trace Viewer Upgrades

The trace viewer is the single most underused debugging tool in Playwright, and the 2026 releases made it more powerful. A trace is a zip file containing a full timeline of your test: DOM snapshots before and after every action, network requests, console logs, and source locations. The viewer now correlates network and console panels with the action timeline, so clicking an action highlights exactly which requests fired and which logs printed during that step.

\`\`\`bash
# Record a trace for a single run
npx playwright test --trace on

# Open a recorded trace
npx playwright show-trace test-results/my-test/trace.zip
\`\`\`

You can also capture traces programmatically when you need fine-grained control, for example wrapping just one risky flow:

\`\`\`typescript
import { test } from '@playwright/test';

test('checkout flow with scoped trace', async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await page.goto('/checkout');
  await page.getByLabel('Card number').fill('4242424242424242');
  await page.getByRole('button', { name: 'Pay now' }).click();
  await context.tracing.stop({ path: 'checkout-trace.zip' });
});
\`\`\`

The time-travel DOM snapshots mean you can hover over any point in the timeline and see exactly what the page looked like, which makes "it works locally but fails in CI" bugs far easier to diagnose.

## UI Mode

UI mode has become the default authoring and debugging surface for most Playwright users. Launched with \`--ui\`, it gives you a watch-mode interface where you can pick tests, run them, watch them execute live, time-travel through each step, and inspect locators and the DOM, all without leaving one window.

\`\`\`bash
npx playwright test --ui
\`\`\`

Inside UI mode you get a built-in locator picker (hover any element and it suggests the best locator), a watch toggle that reruns tests on file save, and the full trace timeline for every run. For teams migrating from older debugging workflows that relied on \`page.pause()\` and the inspector, UI mode replaces almost all of that with a faster, more visual loop. The pick-locator feature in particular has reduced the time it takes to write a new test because you no longer guess at selectors.

## Component Testing Maturity

Component testing lets you mount a single React, Vue, or Svelte component in a real browser and test it in isolation, with the same locator and assertion API you use for end-to-end tests. In the 2026 line this moved to a much more stable footing, with better framework adapters and faster mounting.

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { Counter } from './Counter';

test('counter increments on click', async ({ mount }) => {
  const component = await mount(<Counter initial={0} />);
  await expect(component).toContainText('Count: 0');
  await component.getByRole('button', { name: 'Increment' }).click();
  await expect(component).toContainText('Count: 1');
});
\`\`\`

Component tests run in a real browser, so you get true rendering, real CSS, and real event handling, unlike a JSDOM-based unit test. The trade-off is speed: they are slower than pure unit tests but far faster and more isolated than full E2E. Use them for components with meaningful interactive logic, and reserve full E2E for cross-page user journeys.

## The Playwright MCP

The Playwright MCP (Model Context Protocol) server is one of the most consequential additions for teams using AI coding agents. It exposes the browser to an agent like Claude Code, Cursor, or Copilot through a structured accessibility-tree interface, so the agent can navigate, click, fill forms, and assert without you hand-writing each step. Instead of screenshots and pixel guessing, the agent works against the same semantic locators you would use in a test.

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

Once configured, you can ask an agent to "open the login page, sign in with the test account, and verify the dashboard loads," and it will drive a real browser to do exactly that, then optionally generate a Playwright test from the steps. If you are exploring agentic QA workflows, our guide to [MCP for QA engineers](/blog/mcp-for-qa-engineers-guide) and the [Playwright test agents](/blog/playwright-test-agents-claude-code) walkthrough go deeper. You can also install ready-made Playwright skills from the [QA skills directory](/skills) so your agent follows project conventions out of the box.

## Codegen and Recording

Codegen records your interactions into a runnable test and has improved its locator generation to prefer role-based, resilient selectors over brittle CSS paths. It is the fastest way to scaffold a new test before refining it by hand.

\`\`\`bash
npx playwright codegen http://localhost:3000
npx playwright codegen --device="iPhone 15" https://example.com
\`\`\`

The recorder now emits cleaner assertions and respects your configured \`testIdAttribute\`, so generated tests align with your conventions. Treat codegen output as a starting draft: extract page objects, remove redundant steps, and add meaningful assertions before committing.

## API Testing and Network Control

Playwright is not only for UI. The built-in \`request\` fixture lets you hit APIs directly, and route interception lets you mock or modify network traffic during UI tests, which is invaluable for testing error states deterministically.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('mock a failing API response', async ({ page }) => {
  await page.route('**/api/orders', (route) =>
    route.fulfill({ status: 500, body: JSON.stringify({ error: 'server error' }) })
  );
  await page.goto('/orders');
  await expect(page.getByRole('alert')).toContainText('Something went wrong');
});

test('verify API directly with the request fixture', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.status).toBe('ok');
});
\`\`\`

Mixing API setup with UI assertions is a common 2026 pattern: seed state through the API for speed, then verify the rendered result in the browser.

## Migration and Version Comparison

If you are upgrading from an older version, most code keeps working, but a few patterns are now strongly discouraged. The table below summarizes the shift in recommended practice.

| Area | Old pattern | Recommended in 2026 |
|---|---|---|
| Finding elements | \`page.$('.btn')\`, \`page.click()\` | Locators: \`page.getByRole(...)\` |
| Waiting | \`page.waitForTimeout(2000)\` | Auto-waiting via locators and web-first assertions |
| Debugging | \`page.pause()\` + inspector | UI mode (\`--ui\`) and trace viewer |
| Assertions | manual \`expect(await el.textContent())\` | \`await expect(locator).toHaveText(...)\` |
| Re-running failures | re-run whole suite | \`--last-failed\` |
| Agent automation | custom scripts | Playwright MCP |

To upgrade, bump the package and reinstall browsers:

\`\`\`bash
npm install -D @playwright/test@latest
npx playwright install
\`\`\`

Run your existing suite first to surface any deprecations, then adopt the new patterns incrementally. The deprecation warnings in the latest releases are clear about what to replace.

## Frequently Asked Questions

### What is new in Playwright 2026?

The 2026 line focuses on developer experience: a faster test runner with a \`--last-failed\` flag, a trace viewer that correlates network and console data with the action timeline, UI mode as the default authoring surface, more stable component testing, and the Playwright MCP that lets AI coding agents drive a real browser through semantic locators.

### What are the main Playwright new features in 2026?

The headline additions are the Playwright MCP for agentic automation, matured component testing for React, Vue, and Svelte, an upgraded trace viewer, smarter codegen that emits role-based locators, and improved network mocking. Together they shift Playwright from a pure E2E tool toward a full browser-automation platform usable by both humans and AI agents.

### Is UI mode better than the Playwright inspector?

For most workflows, yes. UI mode (\`npx playwright test --ui\`) combines watch mode, live execution, time-travel through the trace timeline, and a locator picker in one window, replacing the older \`page.pause()\` inspector loop. The inspector still exists for quick interactive sessions, but UI mode is the recommended day-to-day debugging tool in 2026.

### Should I use the Playwright MCP for AI agents?

If your team uses Claude Code, Cursor, or Copilot, the Playwright MCP is worth adopting. It gives agents structured, accessibility-tree access to the browser instead of brittle screenshot guessing, so they can navigate, fill forms, and assert reliably, then generate Playwright tests from the recorded steps.

### How do I upgrade to the latest Playwright version?

Run \`npm install -D @playwright/test@latest\` followed by \`npx playwright install\` to refresh the bundled browsers. Run your existing suite to surface deprecation warnings, then migrate flagged patterns, such as replacing \`page.$\` calls with locators and removing fixed \`waitForTimeout\` calls, one at a time.

### Does Playwright support component testing in 2026?

Yes. The experimental component testing packages for React, Vue, and Svelte are far more stable in the 2026 line. You mount a component in a real browser and test it with the same locator and assertion API as E2E tests, getting real rendering and CSS at the cost of being slower than JSDOM-based unit tests.

### Is Playwright still better than Selenium?

For most modern web applications, Playwright offers faster execution, built-in auto-waiting, and richer tooling out of the box. See our detailed [Selenium vs Playwright comparison](/blog/selenium-vs-playwright-2026) for the full breakdown, including where Selenium's broader language and grid ecosystem still wins.

### What is the recommended trace setting for CI?

Use \`trace: 'on-first-retry'\` in your config. Recording traces on every run is expensive, but capturing them only when a test retries gives you full diagnostic data exactly when a failure occurs, without slowing down passing runs.

## Conclusion

The Playwright 2026 releases reward upgrading. The combination of a tighter test runner, the upgraded trace viewer, UI mode as the default loop, stable component testing, and the Playwright MCP makes the framework faster to author in, easier to debug, and ready for AI-assisted workflows. The migration cost is low because most existing code still runs, and the new patterns, locators over selectors, auto-waiting over sleeps, and UI mode over manual pausing, pay for themselves quickly.

Start by upgrading to the latest version and turning on UI mode for your next test-writing session, then adopt the trace viewer and MCP as your team's needs grow. To go further, browse the [QA skills directory](/skills) for ready-to-install Playwright skills that teach your AI coding agent these exact conventions, and read the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) to lock in the fundamentals.
`,
};
