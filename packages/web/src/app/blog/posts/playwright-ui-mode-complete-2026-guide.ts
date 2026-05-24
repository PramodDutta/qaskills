import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright UI Mode Complete 2026 Guide: Time-Travel Debugging',
  description: 'Master Playwright UI Mode in 2026 with time-travel debugging, watch mode, picker tool, and trace exploration. Complete guide with examples, configuration, and workflows.',
  date: '2026-05-01',
  category: 'Guide',
  content: `
# Playwright UI Mode Complete 2026 Guide: Time-Travel Debugging

Playwright UI Mode launched as a game-changer in mid-2023 and has become the default developer experience for writing and debugging Playwright tests in 2026. Where the classic test runner gave you green checkmarks and stack traces, UI Mode gives you a full visual timeline: every action, every network request, every console message, captured as DOM snapshots you can scrub through like a video. If you have ever tried to debug a flaky test by inserting screenshot calls one line at a time, UI Mode replaces that entire workflow with a single command.

This guide is a complete reference for Playwright UI Mode in 2026. You will learn the keyboard shortcuts that experienced developers actually use, how watch mode integrates with hot module reloading, how the picker tool generates locators that survive across refactors, and how to combine UI Mode with VS Code, Cursor, and Claude Code skills. Every example uses TypeScript and the current Playwright 1.49+ API, and every configuration block reflects what production teams ship today. By the end you will be able to move from "I think this assertion fires before the modal renders" to "I can see the exact snapshot at the moment the assertion ran" in under ten seconds.

If you are new to Playwright in general, start with the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). For framework-specific tooling, the [playwright-e2e skill](/skills/playwright-e2e) gives Claude Code and Cursor the patterns required to write production tests with UI Mode workflows baked in.

## Launching UI Mode

The entry point is a single command line flag. There are no separate binaries, no extra dependencies, no Docker images.

\`\`\`bash
npx playwright test --ui
\`\`\`

That command launches the UI Mode window, discovers every test file matching your \`testMatch\` glob, and presents them in a collapsible tree on the left. You can also target a specific file or test by name:

\`\`\`bash
# Open UI Mode with only one spec
npx playwright test tests/checkout.spec.ts --ui

# Open UI Mode filtered by grep
npx playwright test --ui --grep "@smoke"

# Open UI Mode with a specific project
npx playwright test --ui --project=chromium
\`\`\`

UI Mode respects every flag the headless runner supports, so your existing CI invocation patterns translate directly.

## Anatomy of the UI Mode window

The window has five regions that you will return to repeatedly:

| Region | Purpose | Default shortcut |
|---|---|---|
| Test tree (left) | Browse, filter, run, and rerun tests | F5 to run selected |
| Timeline (top) | Action-by-action scrubber for the current run | Arrow keys to step |
| Action list (left of detail) | Every \`click\`, \`fill\`, \`expect\` call in order | Click to seek |
| Detail pane (center) | DOM snapshot, source, console, network, errors | Tabs at top of pane |
| Watch mode toggle (top right) | Re-run on file save | W |

The timeline is the killer feature. Every captured action appears as a colored band; hover over any pixel and the DOM snapshot at that exact moment fills the center pane. This is genuine time travel: the DOM is reconstructed from a captured snapshot, not a screenshot, so you can hover elements, expand attributes, and copy selectors live.

## Writing your first UI Mode test

Let us write a test that exercises a checkout flow against a demo storefront. Save this to \`tests/checkout.spec.ts\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Checkout flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://demo.qaskills.sh/store');
  });

  test('user can add a product to cart and check out', async ({ page }) => {
    await page.getByRole('link', { name: 'Catalog' }).click();
    await page.getByRole('article', { name: 'Mechanical Keyboard' }).getByRole('button', { name: 'Add to cart' }).click();
    await expect(page.getByRole('status', { name: 'Cart' })).toContainText('1 item');

    await page.getByRole('link', { name: 'Checkout' }).click();
    await page.getByLabel('Full name').fill('Asha Patel');
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByLabel('Shipping address').fill('221B Baker Street, London');
    await page.getByRole('button', { name: 'Place order' }).click();

    await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  });
});
\`\`\`

Open UI Mode with \`npx playwright test tests/checkout.spec.ts --ui\`, click the test, and press the run button. You will see seven actions stream into the action list, each with a corresponding band in the timeline. Click the \`Add to cart\` action; the DOM snapshot scrubs back to that exact moment. Open the Network tab in the detail pane and you will see the cart mutation request, including request and response bodies.

## The picker tool: generating locators visually

The picker is the second-killer feature. Click the crosshair icon at the top of any DOM snapshot, then hover over any element. UI Mode displays the recommended locator in a popover, ranked by stability:

1. \`getByRole\` with an accessible name (most stable)
2. \`getByLabel\`
3. \`getByPlaceholder\` or \`getByText\`
4. \`getByTestId\` (when test IDs exist)
5. CSS or XPath (fallback)

Click the popover to copy the locator to your clipboard. Drop it into your spec and you have a selector that mirrors how an assistive technology would describe the element. The picker also resolves into Shadow DOM and across same-origin iframes automatically.

\`\`\`typescript
// Generated by the picker for the cart status badge
await expect(page.getByRole('status', { name: 'Cart' })).toContainText('1 item');

// Generated by the picker for a deeply nested action
await page.locator('app-checkout').getByRole('button', { name: 'Place order' }).click();
\`\`\`

For deeper locator strategy guidance, see the [Playwright Locator Strategies Guide](/blog/playwright-locator-strategies-getbyrole-guide).

## Watch mode and the inner loop

Press \`W\` while UI Mode is open and a small eye icon turns green. Watch mode now monitors every file imported by the running test and re-executes on save. Combined with \`test.only\` and grep filters, the inner loop becomes:

1. Write or edit a test
2. Save (Cmd-S / Ctrl-S)
3. Watch UI Mode replay the run in under a second
4. Scrub the timeline to inspect any diverged step

Watch mode debounces by 250ms, so saving multiple files in quick succession queues a single rerun. If you change a fixture file or page object, every test that imports it gets re-evaluated.

\`\`\`typescript
// Page object monitored by watch mode
import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;
  readonly orderConfirmed: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orderConfirmed = page.getByRole('heading', { name: 'Order confirmed' });
  }

  async placeOrder(name: string, email: string, address: string) {
    await this.page.getByLabel('Full name').fill(name);
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Shipping address').fill(address);
    await this.page.getByRole('button', { name: 'Place order' }).click();
  }
}
\`\`\`

Edit the page object, save, and UI Mode reruns the dependent specs. If you forget a parameter, the failure surfaces inline with a clickable stack trace that opens the offending file in VS Code or Cursor.

## Filtering, tagging, and the test tree

The test tree supports the same filters you use on the command line, but with live updates. The search box at the top accepts:

| Filter | Example | Matches |
|---|---|---|
| Free text | \`checkout\` | Any test or describe block containing the text |
| Tag | \`@smoke\` | Tests with \`@smoke\` in title |
| File glob | \`*.api.spec.ts\` | Files matching the pattern |
| Project | \`project:chromium\` | Tests for a specific project |
| Status | \`status:failed\` | Most recent run that failed |

Combine filters with spaces. \`@smoke project:webkit status:failed\` shows only smoke tests on WebKit that failed last run. Filters are saved per-workspace and survive UI Mode restarts.

\`\`\`typescript
test.describe('@smoke @critical Checkout', () => {
  test('@happy-path user completes purchase', async ({ page }) => {
    // ...
  });

  test('@edge-case empty cart shows message', async ({ page }) => {
    // ...
  });
});
\`\`\`

## Inspecting console, network, and source

The detail pane has tabs for everything UI Mode captures. Each tab is scoped to the time range you have selected in the timeline.

The Console tab streams \`console.log\`, \`console.warn\`, \`console.error\`, and \`page.on('pageerror')\` output with timestamps. Click any line to seek the timeline to that exact moment. Console messages also bubble up to the action list with a small icon, so noisy console output never gets lost.

The Network tab lists every request the browser made during the run. Columns include method, URL, status, size, and duration. Click a request to see request headers, response headers, request body, and response body. For API calls that return JSON, the body is pretty-printed and searchable.

\`\`\`typescript
test('network mocking captures only mock traffic', async ({ page }) => {
  await page.route('**/api/cart', async (route) => {
    const json = { items: [{ sku: 'KB-001', quantity: 1 }] };
    await route.fulfill({ json });
  });

  await page.goto('https://demo.qaskills.sh/store');
  await page.getByRole('link', { name: 'Cart' }).click();
  await expect(page.getByText('1 item')).toBeVisible();
});
\`\`\`

In UI Mode, mocked requests show a small "mock" badge in the network tab so you can confirm that interception fired exactly when intended.

The Source tab shows the test file with the current action highlighted. Stack traces link directly back to source. The Errors tab shows the diff between actual and expected for any \`expect\` failure, including pretty-printed object diffs for \`toEqual\` and image diffs for \`toHaveScreenshot\`.

## Trace exploration without rerunning

Every UI Mode run automatically records a trace. When you click a previous run in the history sidebar, UI Mode loads the trace without re-executing the test. This is faster than rerunning and lets you debug intermittent failures from CI by downloading the trace file from your artifacts and opening it locally.

\`\`\`bash
# Open a trace from CI artifacts
npx playwright show-trace ./artifacts/trace.zip

# UI Mode also reads traces from the test-results directory
npx playwright test --ui
\`\`\`

CI integration typically looks like this in \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
  ],
  use: {
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

For more on traces, screenshots, and videos in production setups, see [Playwright Screenshots Videos Traces Complete Guide](/blog/playwright-screenshots-videos-traces-complete-guide).

## Working with fixtures in UI Mode

UI Mode treats fixtures as first-class citizens. Each fixture appears in the action list with its setup and teardown clearly marked. This means a fixture that constructs a logged-in page is just as easy to step through as the test that uses it.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

type Fixtures = {
  loggedInPage: import('@playwright/test').Page;
};

export const test = base.extend<Fixtures>({
  loggedInPage: async ({ page, baseURL }, use) => {
    await page.goto(\`\${baseURL}/login\`);
    await page.getByLabel('Email').fill('user@example.com');
    await page.getByLabel('Password').fill('correct-horse-battery-staple');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await use(page);
  },
});

export { expect };
\`\`\`

The login fixture renders four actions in the timeline (goto, two fills, click) followed by the test's own actions. Failures inside the fixture clearly point to the fixture file, not the test.

## Common pitfalls and how UI Mode helps

Most test failures fall into one of five buckets. UI Mode short-circuits the diagnosis for each.

**Element not found.** The action list highlights the failed line in red. Hover the previous action's snapshot to see exactly what the DOM looked like. Often the element existed but the locator missed it due to a wrapping role; the picker on the snapshot regenerates the locator in two clicks.

**Timing race.** Click the offending \`expect\` in the action list. The timeline shows network requests and console events for the surrounding window. If a request finished after the assertion ran, you need to wait for that request explicitly with \`page.waitForResponse\` or rely on auto-waiting locators.

**Wrong page.** The URL bar at the top of the detail pane shows the URL at the moment of the action. If you accidentally navigated to a 404 page after a click, the URL will tell you immediately.

**Hidden modal.** The DOM snapshot lets you expand and collapse hidden subtrees. If a modal is hidden behind an overlay, you will see it in the snapshot tree even though it failed to interact in the actual run.

**Auth missing.** Storage state and cookies appear in a dedicated panel. Verify that your auth fixture wrote the expected token before the action that needed it.

## Anti-patterns to avoid

UI Mode does not turn bad tests into good ones. Watch for these patterns even when you can debug them visually:

- Using \`page.waitForTimeout(N)\` to "give the page time to load". Replace with a deterministic assertion such as \`await expect(locator).toBeVisible()\`.
- Asserting on CSS classes instead of accessible state. Use \`toBeChecked\`, \`toBeDisabled\`, \`toHaveAccessibleName\` instead of \`.cls-active\`.
- Tests that depend on previous test state because UI Mode runs sequentially. Each test should be independent; configure \`fullyParallel: true\` once you fix the implicit dependencies.
- Generating locators with the picker on a stale snapshot. Always pick from a freshly run snapshot to capture the current DOM.
- Leaving \`test.only\` in a committed file. Add a pre-commit hook with \`@playwright/test-only-check\` to prevent this.

## Keyboard shortcuts that save time

These are the shortcuts that experienced UI Mode users hit reflexively. Memorize them in this order.

| Action | Shortcut (macOS) | Shortcut (Windows/Linux) |
|---|---|---|
| Run selected test | F5 | F5 |
| Stop run | Shift-F5 | Shift-F5 |
| Toggle watch mode | W | W |
| Open picker | P | P |
| Next action | ArrowDown | ArrowDown |
| Previous action | ArrowUp | ArrowUp |
| Focus filter | Cmd-F | Ctrl-F |
| Open source for current action | O | O |
| Copy locator under cursor | Cmd-Shift-C | Ctrl-Shift-C |

## Integrating with VS Code and Cursor

Both VS Code and Cursor ship with the Playwright extension. The extension adds a sidebar that mirrors UI Mode's test tree and clicking any test reveals an "Open in UI Mode" link. CodeLens annotations appear above each test for one-click runs. When a test fails, the extension surfaces the failure inline at the failing line and offers a "Show in UI Mode" link to jump to the recorded trace.

For Claude Code users, the [Cursor Playwright Skill Setup Guide](/blog/cursor-playwright-skill-setup-guide) walks through how to give your AI assistant access to the same locator strategies UI Mode generates, so AI-generated tests use \`getByRole\` first instead of brittle CSS selectors.

## CI considerations

UI Mode is a local-only tool by design. In CI you run the headless test runner and capture traces, then download the traces locally to investigate. The recommended CI flow:

\`\`\`yaml
- name: Run Playwright tests
  run: npx playwright test --reporter=html

- name: Upload Playwright report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report
    retention-days: 30

- name: Upload traces
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-traces
    path: test-results/**/trace.zip
\`\`\`

Download \`trace.zip\` from your workflow artifacts and open with \`npx playwright show-trace trace.zip\`. The local UI Mode window opens with the trace pre-loaded, no test execution required.

## Conclusion and next steps

Playwright UI Mode is the difference between blind debugging and informed debugging. Time-travel through DOM snapshots, network requests, and console output collapses what used to be hour-long investigations into minutes. Combine UI Mode with watch mode and the picker, and the inner loop becomes tight enough that you write better tests because the feedback is instant.

Ready to deepen your Playwright skills? Install the [playwright-e2e skill](/skills/playwright-e2e) so Claude Code and Cursor generate tests using the same locator strategies UI Mode prefers. For end-to-end CI patterns, read the [Playwright CI GitHub Actions Complete Guide](/blog/playwright-ci-github-actions-complete-guide-2026). For more advanced debugging workflows, explore the [Playwright Debug Mode Inspector Guide](/blog/playwright-debug-mode-inspector-guide).
`,
};
