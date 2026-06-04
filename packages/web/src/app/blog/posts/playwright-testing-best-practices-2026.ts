import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Testing Best Practices for 2026: The Full Guide',
  description:
    'Playwright best practices for 2026: web-first assertions, role-based locators, no hard waits, fixtures, parallelism, test isolation, and a fast CI pipeline.',
  date: '2026-06-04',
  category: 'Reference',
  content: `
# Playwright Testing Best Practices 2026

Playwright has won the end-to-end testing race for a reason: it was designed around the failure modes that made older tools flaky. Auto-waiting is built in, assertions retry automatically, and the browser context model gives you cheap, perfect isolation. But the tool only delivers reliable, fast suites if you use it the way it was meant to be used. Plenty of teams adopt Playwright and then port their old habits straight over -- hard \`waitForTimeout\` calls, brittle CSS selectors, shared global state -- and end up with the same flaky mess they were trying to escape. The framework is not magic; the practices are.

This guide collects the practices that separate a Playwright suite you trust from one you constantly babysit, current for 2026. We cover web-first assertions and why \`await expect()\` is non-negotiable, user-facing locators (\`getByRole\` over CSS), the elimination of hard waits, fixtures for setup and authentication, the project/context model for full test isolation, parallelism and sharding for speed, network mocking for determinism, the Trace Viewer for debugging, and a complete CI configuration. Every recommendation comes with runnable TypeScript and a clear "do this, not that" so you can apply it immediately. Two summary tables -- a do/don't matrix and a config reference -- sit near the end. If you want these baked into a reusable starting point, the [playwright-e2e skill](/skills) on QASkills encodes them. Let's begin with the single most important one.

## Use Web-First Assertions, Always

The most common source of flakiness in any UI test is a check that runs before the UI has settled. Playwright's answer is **web-first assertions**: \`await expect(locator).toBeVisible()\` does not check once and fail -- it retries the assertion until it passes or a timeout elapses. This single behavior eliminates an entire category of timing bugs. The rule is absolute: every assertion against the page must use \`await expect(locator)\`, never a synchronous boolean check.

\`\`\`typescript
// tests/assertions.spec.ts
import { test, expect } from '@playwright/test';

test('web-first assertions retry automatically', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh/dashboard');

  // GOOD: retries until the heading appears (handles async render)
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  // GOOD: retries until the text matches
  await expect(page.getByTestId('cart-count')).toHaveText('3');

  // BAD: checks once, immediately -- flaky if the element renders late
  // const isVisible = await page.getByRole('heading').isVisible();
  // expect(isVisible).toBe(true);
});
\`\`\`

The difference is everything. \`isVisible()\` returns the current state at the instant it runs; if the element appears 50ms later, your test fails intermittently. \`await expect(...).toBeVisible()\` polls until the condition holds. Use the locator-based \`expect\` matchers -- \`toBeVisible\`, \`toHaveText\`, \`toHaveValue\`, \`toHaveCount\`, \`toBeEnabled\` -- and your timing problems largely disappear.

## Prefer User-Facing Locators

Locators are how you find elements, and the locator strategy you choose determines how resilient your tests are to UI change. The best practice is to locate elements the way a user perceives them -- by role and accessible name -- not by implementation details like CSS classes or DOM structure. Playwright's recommended priority order is \`getByRole\`, then \`getByLabel\`/\`getByPlaceholder\` for form fields, then \`getByText\`, then \`getByTestId\` as a deliberate escape hatch, and CSS/XPath only as a last resort.

\`\`\`typescript
// tests/locators.spec.ts
import { test, expect } from '@playwright/test';

test('locate by role and accessible name', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh/login');

  // GOOD: resilient, mirrors how a user finds these
  await page.getByLabel('Email').fill('qa.user@example.com');
  await page.getByLabel('Password').fill('Sup3rS3cret!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // BAD: breaks the moment a class name or DOM nesting changes
  // await page.locator('.form-control#email-input').fill('...');
  // await page.locator('div > form > button.btn-primary').click();
});
\`\`\`

Role-based locators have a second benefit: if you cannot find an element by its role and accessible name, that is often a real accessibility bug worth fixing. Reserve \`getByTestId\` (with a \`data-testid\` attribute) for cases where no user-facing handle exists -- it is stable but invisible to users, so use it sparingly and intentionally.

## Never Use Hard Waits

\`page.waitForTimeout(3000)\` is the single worst pattern in Playwright. It is flaky in two directions: too short and the test fails on a slow run; too long and you waste seconds on every execution, multiplied across the suite. Because Playwright actions and assertions already auto-wait, hard waits are never necessary. Replace every one with a condition-based wait.

\`\`\`typescript
// tests/no-hard-waits.spec.ts
import { test, expect } from '@playwright/test';

test('wait for conditions, never for time', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh/products');
  await page.getByRole('button', { name: 'Load more' }).click();

  // GOOD: wait for the actual result of the action
  await expect(page.getByRole('listitem')).toHaveCount(20);

  // GOOD: wait for a specific network response if you must
  await page.getByRole('button', { name: 'Refresh' }).click();
  await page.waitForResponse((r) => r.url().includes('/api/products') && r.ok());

  // BAD: arbitrary sleep -- flaky and slow
  // await page.waitForTimeout(3000);
});
\`\`\`

If you ever feel the urge to add a \`waitForTimeout\`, the right move is to identify what you are actually waiting for -- an element, a network call, a URL change -- and wait for that with \`expect\`, \`waitForResponse\`, or \`waitForURL\`. The only legitimate use of \`waitForTimeout\` is debugging, and it should never survive into committed code.

## Lean on Fixtures for Setup and Auth

Fixtures are Playwright's dependency-injection system. Instead of repeating setup in every test or stuffing it into \`beforeEach\`, you define a fixture once and request it by name. The two highest-value uses are authentication (covered next) and providing ready-made page objects or test data. Custom fixtures keep tests focused on behavior, not plumbing.

\`\`\`typescript
// fixtures.ts
import { test as base, expect, Page } from '@playwright/test';

// A page object encapsulating the login screen.
class LoginPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('https://practice.qaskills.sh/login'); }
  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}

// Extend the base test with a typed fixture.
export const test = base.extend<{ loginPage: LoginPage }>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
export { expect };
\`\`\`

\`\`\`typescript
// tests/uses-fixture.spec.ts
import { test, expect } from '../fixtures';

test('login via the page-object fixture', async ({ loginPage, page }) => {
  await loginPage.goto();
  await loginPage.login('qa.user@example.com', 'Sup3rS3cret!');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
\`\`\`

Fixtures compose, are lazily instantiated (only created when a test requests them), and have automatic teardown via the code after \`use()\`. This is far cleaner than \`beforeEach\`/\`afterEach\` chains.

## Authenticate Once with a Setup Project

Logging in through the UI in every test is slow and wasteful. The 2026 best practice is a dedicated **setup project** that logs in once, saves the authenticated \`storageState\` to disk, and a main project that loads it -- so every test starts authenticated with zero login overhead. This combines two features: project dependencies and \`storageState\`.

\`\`\`typescript
// auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh/login');
  await page.getByLabel('Email').fill('qa.user@example.com');
  await page.getByLabel('Password').fill('Sup3rS3cret!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  // Save cookies + localStorage for every other test to reuse.
  await page.context().storageState({ path: authFile });
});
\`\`\`

\`\`\`typescript
// playwright.config.ts (excerpt)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /auth\\.setup\\.ts/ },
    {
      name: 'chromium',
      use: { storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'], // run setup first, then load its state
    },
  ],
});
\`\`\`

The \`dependencies: ['setup']\` line makes the setup project run before \`chromium\`, and \`storageState\` injects the saved session into every test in that project. Login happens exactly once per run instead of once per test.

## Guarantee Test Isolation

Flaky suites are often suites where tests leak state into each other. Playwright makes isolation cheap: each test gets a **fresh browser context** -- a clean slate with no shared cookies, localStorage, or cache. The best practice is to never rely on order between tests, never share mutable module-level state, and let each test set up exactly what it needs.

\`\`\`typescript
// tests/isolation.spec.ts
import { test, expect } from '@playwright/test';

// Each test below runs in its own context. No shared cookies or storage.
test('test A starts clean', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh');
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

test('test B also starts clean -- A did not leak in', async ({ page }) => {
  await page.goto('https://practice.qaskills.sh');
  // No login state from any prior test bleeds into here.
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});
\`\`\`

Because contexts are isolated by default, the main thing you must avoid is **introducing** shared state yourself -- a module-level array tests push into, a database row one test creates and another depends on, or test ordering assumptions. Write every test so it could run alone, in any order, and pass.

## Maximize Parallelism and Shard in CI

Playwright runs test files in parallel across worker processes by default. You can also parallelize tests within a single file using \`test.describe.configure({ mode: 'parallel' })\`. For large suites, **shard** the run across multiple CI machines. These two levers cut a 30-minute suite to a few minutes.

\`\`\`typescript
// playwright.config.ts (excerpt)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Use all available cores locally; cap workers in CI for stability.
  workers: process.env.CI ? 4 : undefined,
  fullyParallel: true, // parallelize within files too
});
\`\`\`

\`\`\`bash
# Run within-file tests in parallel by marking the describe block
# test.describe.configure({ mode: 'parallel' }) at the top of the file.

# Shard across 4 machines in CI (each runs a quarter of the tests)
npx playwright test --shard=1/4
npx playwright test --shard=2/4
npx playwright test --shard=3/4
npx playwright test --shard=4/4
\`\`\`

Sharding pairs perfectly with a CI matrix: spin up four jobs, each running one shard, and the wall-clock time drops by roughly 4x. The only requirement is that your tests are truly isolated -- which, if you followed the previous section, they are.

## Make Tests Deterministic with Network Mocking

Tests that hit real third-party APIs are slow and flaky -- the network fails, rate limits trigger, data changes. For deterministic tests, mock the network at the boundary with \`page.route()\`. This is essential for error states you cannot easily trigger against a live backend (500s, timeouts, empty results).

\`\`\`typescript
// tests/mocking.spec.ts
import { test, expect } from '@playwright/test';

test('renders an empty state when the API returns no products', async ({ page }) => {
  // Intercept the API call and return a controlled response.
  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('https://practice.qaskills.sh/products');
  await expect(page.getByText('No products found')).toBeVisible();
});

test('shows an error banner on a 500', async ({ page }) => {
  await page.route('**/api/products', (route) =>
    route.fulfill({ status: 500, body: 'Internal Server Error' }),
  );
  await page.goto('https://practice.qaskills.sh/products');
  await expect(page.getByRole('alert')).toContainText('Something went wrong');
});
\`\`\`

Mock external dependencies and unstable data; test your own backend live in a dedicated integration suite. This split keeps your UI tests fast and deterministic while still covering integration in a controlled place.

## Debug with Traces, Not console.log

When a test fails -- especially in CI where you cannot watch it -- the Trace Viewer is the fastest path to the root cause. Enable trace capture on retry, and on failure you get a complete, interactive recording: a timeline, the DOM at every step, network calls, console output, and before/after snapshots for each action.

\`\`\`typescript
// playwright.config.ts (excerpt)
export default defineConfig({
  use: {
    trace: 'on-first-retry', // capture a trace only when a test retries
  },
  retries: process.env.CI ? 2 : 0,
});
\`\`\`

\`\`\`bash
# After a failing CI run, download the trace artifact, then:
npx playwright show-trace trace.zip
\`\`\`

The Trace Viewer shows exactly which action failed, what the page looked like before and after, and what the network was doing -- making "it failed in CI but I can't reproduce it" a solved problem. This single feature replaces hours of \`console.log\` archaeology.

## A Complete CI Configuration

Pulling it together, here is a production-grade GitHub Actions workflow that installs dependencies and browsers, shards across machines for speed, and uploads the HTML report and traces so failures are debuggable:

\`\`\`yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=\${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report-\${{ matrix.shard }}
          path: |
            playwright-report/
            test-results/
          retention-days: 14
\`\`\`

The matrix runs four shards in parallel, \`--with-deps\` installs the OS libraries the browser needs, and \`if: always()\` uploads the report and traces even when tests fail -- exactly when you need them.

## Do This, Not That

| Do | Don't | Why |
|---|---|---|
| \`await expect(loc).toBeVisible()\` | \`await loc.isVisible()\` | Web-first assertions retry; boolean checks do not |
| \`getByRole('button', { name })\` | \`locator('.btn-primary')\` | Role locators survive CSS/DOM changes |
| \`await expect(loc).toHaveCount(n)\` | \`await page.waitForTimeout(3000)\` | Wait for conditions, never for time |
| Setup project + \`storageState\` | Log in via UI in every test | Authenticate once, not per test |
| Fresh context per test | Shared module-level state | Isolation prevents cross-test leakage |
| \`page.route()\` to mock | Hit real third-party APIs | Determinism and error-state coverage |
| Trace Viewer on retry | \`console.log\` debugging | Full interactive failure forensics |
| Shard across CI machines | One sequential CI job | Cuts wall-clock time roughly Nx |

## Config Reference

| Config key | Recommended value | Effect |
|---|---|---|
| \`fullyParallel\` | \`true\` | Parallelize tests within files, not just across them |
| \`workers\` | \`process.env.CI ? 4 : undefined\` | All cores locally, capped in CI for stability |
| \`retries\` | \`process.env.CI ? 2 : 0\` | Retry only in CI to smooth transient infra flakiness |
| \`trace\` | \`'on-first-retry'\` | Record a debuggable trace exactly when needed |
| \`screenshot\` | \`'only-on-failure'\` | Failure snapshots without success noise |
| \`use.storageState\` | path to auth file | Start every test authenticated |

## Frequently Asked Questions

### What is a web-first assertion and why does it matter?

A web-first assertion is one that retries automatically until it passes or times out -- in Playwright these are the \`await expect(locator)\` matchers like \`toBeVisible()\` and \`toHaveText()\`. They matter because UI state often settles asynchronously; a one-shot check like \`await locator.isVisible()\` reads the state at a single instant and fails intermittently when an element renders a moment late. Using web-first assertions eliminates the largest single category of test flakiness.

### How should I choose locators in Playwright?

Locate elements the way a user perceives them. Playwright's recommended priority is \`getByRole\` with an accessible name first, then \`getByLabel\` and \`getByPlaceholder\` for form fields, then \`getByText\`, then \`getByTestId\` as a deliberate escape hatch, and CSS or XPath only as a last resort. Role-based locators survive class-name and DOM-structure changes that break CSS selectors, and a missing accessible name often signals a real accessibility bug worth fixing.

### Why are hard waits like waitForTimeout bad?

\`waitForTimeout\` is flaky in both directions: too short and the test fails on a slow run, too long and you waste seconds on every execution across the whole suite. Because Playwright actions and assertions already auto-wait, hard waits are never necessary. Replace each one by waiting for the actual condition -- an element via \`expect\`, a network call via \`waitForResponse\`, or a URL via \`waitForURL\`. The only valid use of \`waitForTimeout\` is temporary local debugging.

### How do I avoid logging in for every test?

Use a dedicated setup project. Create an \`auth.setup.ts\` that logs in once and saves \`storageState\` to a file, then configure your main project with \`storageState\` pointing at that file and \`dependencies: ['setup']\` so setup runs first. Login then happens exactly once per run, and every test starts authenticated with zero per-test overhead. This is the single biggest speed win for suites behind a login wall.

### How does Playwright keep tests isolated?

Playwright gives every test a fresh browser context by default -- a clean slate with no shared cookies, localStorage, or cache -- so tests cannot leak state into one another through the browser. The isolation is automatic; the discipline required of you is to avoid introducing shared state yourself, such as module-level mutable variables, database rows one test creates and another depends on, or assumptions about execution order. Write each test to pass alone, in any order.

### How do I make my Playwright suite run faster in CI?

Combine two levers. First, enable parallelism with \`fullyParallel: true\` and a sensible \`workers\` count so files and in-file tests run concurrently. Second, shard the run across multiple CI machines with \`--shard=1/4\` through \`--shard=4/4\` driven by a CI matrix, so four jobs each run a quarter of the tests. Together these can cut a 30-minute suite to a few minutes. Sharding requires that your tests be truly isolated.

### When should I mock the network versus hit a real backend?

Mock external and third-party dependencies, and any unstable or hard-to-trigger data, with \`page.route()\` -- this keeps UI tests fast and deterministic and lets you cover error states like 500s, timeouts, and empty results that are awkward to produce against a live system. Test your own backend live in a separate, dedicated integration suite. This split gives you reliable UI tests while still validating real integration in a controlled place.

### What is the best way to debug a test that only fails in CI?

Enable trace capture with \`trace: 'on-first-retry'\` and upload the trace artifact from CI. When a test fails, download \`trace.zip\` and open it with \`npx playwright show-trace\`. The Trace Viewer gives you an interactive timeline, the DOM at every step, network activity, console output, and before/after snapshots for each action, so you can see exactly what happened. It turns "fails in CI but I can't reproduce it" into a solved problem and replaces \`console.log\` archaeology.

## Conclusion

A reliable Playwright suite in 2026 is the product of a handful of disciplined practices, not luck. Use web-first \`await expect()\` assertions so checks retry instead of flaking. Locate elements by role and accessible name so tests survive UI churn. Delete every hard wait in favor of condition-based waiting. Lean on fixtures and a setup project so authentication happens once. Trust Playwright's per-test context for isolation, and never introduce shared state. Parallelize and shard to keep the suite fast, mock the network for determinism, and capture traces so every failure is debuggable.

Adopt them in that order and your suite goes from something you babysit to something you trust on every commit. For these practices encoded as a reusable, drop-in starting point, grab the [playwright-e2e skill](/skills) from QASkills, browse the full [skills catalog](/skills), or read more Playwright deep-dives on the [QASkills blog](/blog).
`,
};
