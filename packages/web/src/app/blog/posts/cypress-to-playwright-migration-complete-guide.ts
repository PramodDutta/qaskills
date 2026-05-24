import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress to Playwright Migration: Complete Guide for 2026',
  description:
    'Step-by-step guide to migrating a Cypress test suite to Playwright. API mapping, real before/after code, gotchas, CI changes, and a battle-tested checklist.',
  date: '2026-05-01',
  category: 'Migration',
  content: `
# Cypress to Playwright Migration: Complete Guide for 2026

Migrating a real-world Cypress test suite to Playwright is one of the higher-leverage refactors a QA team can undertake in 2026. Playwright now ships with cross-browser parallelism out of the box, native iframe and multi-tab support, a faster runner, built-in tracing, network mocking that does not rely on a proxy hack, and a typed API that plays well with TypeScript. Teams that have made the move regularly report 2x to 4x faster CI pipelines and a dramatic drop in flake percentage.

This guide is the migration playbook we wish we had on day one. It is written for an SDET who already runs a non-trivial Cypress suite (50 to 1,500 specs) and needs to move it to Playwright without freezing feature development. We will cover the conceptual model differences, the exact API mapping table from cy.* commands to Playwright equivalents, network mocking, custom command translation, session caching, configuration, CI changes, parallelization, the rollout strategy, and the common traps that bite teams in week three of the migration. By the end, you will have a concrete plan, a checklist, and enough working code to start porting your first ten specs the same day.

If you are weighing whether to migrate at all, browse [the blog index](/blog) and then come back here once you have committed. For full-stack QA references, see the [QA Skills directory](/skills).

## Why migrate from Cypress to Playwright

Cypress was the right choice for a lot of teams between 2018 and 2022. It introduced a developer-first UI, time-travel debugging, and a tightly coupled assertion model. But several architectural decisions that felt fresh five years ago have become friction. Cypress runs inside the browser, which means real cross-origin support requires workarounds, multi-tab is not supported in the same window, and parallelism without Cypress Cloud is painful. Playwright, by contrast, runs out-of-process and drives the browser via the DevTools protocol or WebKit's remote inspector. It can spawn three browser contexts in parallel inside a single test, switch tabs natively, and intercept requests at the network layer rather than at the application layer.

The second driver is speed. Playwright's test runner is heavily parallelized by default, and even a modest laptop can run six workers in parallel on a clean repo. The third driver is the ecosystem: Playwright now has first-class support for component testing, visual diffing, accessibility scanning, API testing via APIRequestContext, and a trace viewer that is materially better than Cypress's video recording. The fourth is TypeScript ergonomics. Playwright's auto-complete and inference are noticeably tighter, especially around locators, expect matchers, and fixtures.

## Conceptual model: the biggest mental shift

The single most important shift to internalize before writing a line of code is that Playwright commands are async/await and return promises, whereas Cypress commands are queued onto a chainable command list that the runner flushes between assertions. In Cypress you write \`cy.get('.button').click()\`. The chain is registered, Cypress retries the get until the assertion passes, then runs the click. In Playwright you write \`await page.locator('.button').click()\`. The locator is lazy, but the click is awaited explicitly.

That means anywhere you previously relied on Cypress's auto-retry of the entire chain, you now lean on Playwright's auto-waiting at the action level plus \`expect.toHaveText()\` style web-first assertions that poll until the condition is true or the timeout expires. Most of your existing intent translates cleanly. A handful of patterns, particularly ones that chain \`.then()\` to extract a value and feed it into a later command, need to be rewritten as plain JavaScript.

## API mapping table: Cypress to Playwright

The table below is the cheat sheet you will reach for daily during the first two weeks of porting. Pin it to your wall.

| Cypress | Playwright | Notes |
|---|---|---|
| \`cy.visit(url)\` | \`await page.goto(url)\` | Playwright waits for load by default; configurable via \`waitUntil\` |
| \`cy.get(selector)\` | \`page.locator(selector)\` | Locator is lazy; no command queue |
| \`cy.contains(text)\` | \`page.getByText(text)\` | Prefer \`getByRole\`, \`getByLabel\`, \`getByTestId\` |
| \`cy.click()\` | \`await locator.click()\` | Auto-waits for actionability |
| \`cy.type(text)\` | \`await locator.fill(text)\` | Use \`pressSequentially\` for key-by-key typing |
| \`cy.select(value)\` | \`await locator.selectOption(value)\` | Accepts label, value, or index |
| \`cy.check()\` / \`cy.uncheck()\` | \`await locator.check()\` / \`uncheck()\` | Same semantics |
| \`cy.url().should('include', '/x')\` | \`await expect(page).toHaveURL(/\\/x/)\` | Regex or string |
| \`cy.intercept('GET', '/api/users', ...)\` | \`await page.route('**/api/users', ...)\` | Route runs in browser context |
| \`cy.wait('@alias')\` | \`await page.waitForResponse('**/api/users')\` | Or assert on a side effect instead |
| \`cy.fixture('user.json')\` | \`import user from '../fixtures/user.json'\` | Plain ES import |
| \`cy.viewport(1280, 720)\` | \`await page.setViewportSize({ width: 1280, height: 720 })\` | Or set in config |
| \`cy.screenshot()\` | \`await page.screenshot({ path: 'x.png' })\` | Auto on failure with \`screenshot: 'only-on-failure'\` |
| \`cy.session(id, setup)\` | \`storageState\` in config or fixture | See dedicated section below |
| \`cy.task('db:seed')\` | Plain Node call from \`globalSetup\` | Run anything; no IPC bridge needed |
| \`Cypress.Commands.add('login', ...)\` | \`test.extend({ login: async ... })\` | Fixture pattern |

The mapping is conceptually one-to-one for 80% of commands. The remaining 20%, sessions, tasks, custom commands, fixtures, is where teams stall, so we treat them in detail below.

## Step-by-step migration plan

A realistic migration is a six- to ten-week effort for a medium suite. The plan below assumes two people working part-time. Scale workers up or down as needed.

1. **Week 0** - Install Playwright alongside Cypress. Do not delete anything. Add \`@playwright/test\` and run \`npx playwright install\`. Create a sibling \`tests-pw/\` directory.
2. **Week 1** - Migrate the smoke suite (10 to 30 specs). Pick the highest-value, lowest-complexity specs first: login, signup, checkout happy path.
3. **Week 2** - Build shared fixtures. Replicate every custom command as a fixture. Establish the page-object pattern your team prefers.
4. **Weeks 3 to 6** - Port domain by domain. Run both suites in CI in parallel; mark Cypress as \`continue-on-error\` once Playwright reaches 80% parity.
5. **Week 7** - Cutover. Delete Cypress from the default pipeline. Keep it in a manual-trigger workflow for one more sprint as an escape hatch.
6. **Week 8** - Remove Cypress entirely. Uninstall \`cypress\`, \`@cypress/*\` plugins, and any companion packages. Update onboarding docs.

The dual-run-in-CI window is the single most important risk mitigation. It lets you ship the migration in 50 small PRs rather than one big-bang merge.

## Before and after: a real login spec

Below is a real Cypress spec we ported for a SaaS client. The original is 24 lines; the Playwright version is 19 lines and runs 3.4 seconds faster on average.

**Cypress (before)**

\`\`\`typescript
describe('Login flow', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/auth/login').as('login');
    cy.visit('/login');
  });

  it('allows a registered user to log in', () => {
    cy.fixture('users.json').then((users) => {
      const user = users.admin;
      cy.get('[data-test=email]').type(user.email);
      cy.get('[data-test=password]').type(user.password);
      cy.get('[data-test=submit]').click();
      cy.wait('@login').its('response.statusCode').should('eq', 200);
      cy.url().should('include', '/dashboard');
      cy.get('[data-test=user-menu]').should('contain', user.email);
    });
  });
});
\`\`\`

**Playwright (after)**

\`\`\`typescript
import { test, expect } from '@playwright/test';
import users from '../fixtures/users.json';

test.describe('Login flow', () => {
  test('allows a registered user to log in', async ({ page }) => {
    const user = users.admin;
    const loginResponse = page.waitForResponse('**/api/auth/login');

    await page.goto('/login');
    await page.getByTestId('email').fill(user.email);
    await page.getByTestId('password').fill(user.password);
    await page.getByTestId('submit').click();

    const response = await loginResponse;
    expect(response.status()).toBe(200);
    await expect(page).toHaveURL(/\\/dashboard/);
    await expect(page.getByTestId('user-menu')).toContainText(user.email);
  });
});
\`\`\`

Notice three things. First, the fixture is a plain ES import, no Cypress task bridge. Second, we register the response listener before clicking, so the wait does not race. Third, we use \`getByTestId\` rather than a raw CSS selector, which makes the locator survive a UI refactor.

## Network mocking: cy.intercept vs page.route

This is the area teams most often underestimate. Cypress's \`cy.intercept\` is a proxy that lives in the browser; Playwright's \`page.route\` registers a handler the browser calls before issuing the actual network request.

| Capability | Cypress | Playwright |
|---|---|---|
| Stub response body | \`cy.intercept('GET', '/api/x', { body: ... })\` | \`route.fulfill({ json: ... })\` |
| Modify request | \`cy.intercept(req => req.body = ...)\` | \`route.continue({ postData: ... })\` |
| Modify response | \`cy.intercept(req => req.reply(res => ...))\` | \`route.fetch()\` then \`route.fulfill\` |
| Abort | \`req.destroy()\` | \`route.abort()\` |
| Wait for | \`cy.wait('@alias')\` | \`page.waitForResponse(url)\` |

A request modifier in Playwright looks like this:

\`\`\`typescript
await page.route('**/api/users', async (route) => {
  const response = await route.fetch();
  const json = await response.json();
  json.users = json.users.filter((u) => u.active);
  await route.fulfill({ response, json });
});
\`\`\`

The mental model: in Playwright you are writing a tiny reverse proxy. You receive a route object, optionally call \`fetch\` to forward it, optionally mutate, and call \`fulfill\` or \`continue\`. Once the model clicks, it is more powerful than Cypress's API.

## Custom commands become fixtures

\`Cypress.Commands.add\` is the single biggest pattern you will need to translate. The Playwright equivalent is \`test.extend\`, which creates a fixture that any test in the file can request.

\`\`\`typescript
import { test as base } from '@playwright/test';

export const test = base.extend<{ login: (email: string) => Promise<void> }>({
  login: async ({ page }, use) => {
    await use(async (email: string) => {
      await page.goto('/login');
      await page.getByTestId('email').fill(email);
      await page.getByTestId('password').fill('correct-horse-battery');
      await page.getByTestId('submit').click();
      await page.waitForURL(/\\/dashboard/);
    });
  },
});
\`\`\`

Now any spec that imports from this file gets a typed \`login\` function with full IntelliSense. This is materially cleaner than Cypress's global namespace augmentation and survives refactors.

## Session caching: cy.session to storageState

Cypress 10 introduced \`cy.session\` to cache login state across specs. Playwright's solution is \`storageState\`, which serializes cookies and localStorage to JSON. The pattern: log in once in \`globalSetup\`, save state, then reuse.

\`\`\`typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

export default async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://app.example.com/login');
  await page.getByTestId('email').fill(process.env.E2E_EMAIL!);
  await page.getByTestId('password').fill(process.env.E2E_PASSWORD!);
  await page.getByTestId('submit').click();
  await page.waitForURL(/\\/dashboard/);
  await page.context().storageState({ path: 'storage/auth.json' });
  await browser.close();
}
\`\`\`

Then in \`playwright.config.ts\`:

\`\`\`typescript
export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  use: { storageState: 'storage/auth.json' },
});
\`\`\`

Every test inherits the logged-in state, no per-spec login required. To test logged-out flows, set \`storageState: undefined\` on a specific test.

## Configuration translation

Cypress's \`cypress.config.ts\` and Playwright's \`playwright.config.ts\` are structurally similar but the keys differ.

| Cypress key | Playwright key | Notes |
|---|---|---|
| \`baseUrl\` | \`use.baseURL\` | Same idea |
| \`viewportWidth\`/\`viewportHeight\` | \`use.viewport\` | Object shape |
| \`defaultCommandTimeout\` | \`use.actionTimeout\` | Per-action |
| \`pageLoadTimeout\` | \`use.navigationTimeout\` | Per-navigation |
| \`video\` | \`use.video\` | \`'on'\`, \`'off'\`, \`'retain-on-failure'\` |
| \`screenshotOnRunFailure\` | \`use.screenshot\` | \`'only-on-failure'\` recommended |
| \`retries\` | \`retries\` | Same |
| \`reporter\` | \`reporter\` | Different report ecosystem |
| \`env\` | Read via \`process.env\` | Use dotenv |

## CI changes

If you run Cypress in GitHub Actions today, the cutover is straightforward. Install Playwright browsers in a single step, then call \`npx playwright test\`.

\`\`\`yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npm ci
- run: npx playwright install --with-deps
- run: npx playwright test --reporter=html
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
\`\`\`

Playwright parallelizes by default at the test-file level. Set \`workers\` in config or \`--workers\` on the CLI to tune. On a 4-vCPU runner, 4 workers is usually optimal.

## Gotchas and breaking changes

After porting more than 8 Cypress suites, the following list captures every surprise we hit. Skim it now, return to it when something behaves unexpectedly.

1. **Implicit assertions disappear.** Cypress retries the whole chain until an assertion is satisfied. Playwright retries only via \`expect.poll\` or web-first matchers. If you previously wrote \`cy.get('.x').should('contain', 'hi')\` and relied on the implicit retry, you now must write \`await expect(page.locator('.x')).toContainText('hi')\`.
2. **\`cy.then\` callbacks become plain awaits.** Anywhere you wrote \`cy.get('.x').then(($el) => ...)\` rewrites to \`const text = await page.locator('.x').textContent()\`.
3. **Cross-origin works natively.** You no longer need \`cy.origin\` wrappers. Just navigate.
4. **iframes are first class.** Use \`page.frameLocator(selector)\` for nested iframes.
5. **Local storage clears per context.** Cypress preserves localStorage across specs by default in Cypress 10+; Playwright clears it per new context. Use \`storageState\` to persist.
6. **No automatic chaining of values.** A common Cypress idiom is \`cy.get('.x').invoke('text').as('text')\`. Playwright equivalent is plain JS: \`const text = await page.locator('.x').textContent()\`.
7. **\`it.skip\` and \`it.only\` become \`test.skip\` and \`test.only\`.** Same idea, different names.
8. **Hooks signature differs.** Cypress's \`beforeEach\` runs in the Cypress chain; Playwright's runs as an async function with destructured fixtures.
9. **No \`cy.task\` equivalent.** You call Node directly from \`globalSetup\` or a fixture. Easier and more powerful.
10. **Visual testing requires a plugin.** Cypress users on \`cypress-image-snapshot\` should look at \`@playwright/test\`'s built-in \`toHaveScreenshot\`, which is excellent. See our Cypress visual testing guides on [the blog](/blog) for the equivalent ecosystem story.

## Migration checklist

Print this and tape it to the wall above your monitor.

- [ ] Audit current Cypress suite: count specs, custom commands, fixtures, plugins.
- [ ] Install Playwright in a sibling directory (\`tests-pw/\`).
- [ ] Configure \`playwright.config.ts\` with baseURL, retries, projects per browser.
- [ ] Translate the top 5 custom commands into fixtures.
- [ ] Set up \`globalSetup\` for authentication caching.
- [ ] Port the smoke suite (10 to 30 specs).
- [ ] Wire Playwright into CI; keep Cypress green in parallel.
- [ ] Port one domain per week; review PRs for idiomatic patterns.
- [ ] Cut over CI: Playwright becomes required, Cypress becomes optional.
- [ ] Delete Cypress after one sprint of green Playwright runs.
- [ ] Update onboarding docs and the [QA skills directory](/skills) entries.

## When not to migrate

Migration is not a moral imperative. Skip it if your Cypress suite is under 30 specs and rarely flakes; the ROI is poor. Skip it if you depend on a Cypress-only plugin with no Playwright equivalent (rare in 2026; check the plugin ecosystem first). Skip it if you do component testing only and your stack is heavily React-specific. \`@testing-library/react\` plus Vitest often gives you a tighter loop than either tool.

## Deep dive: trace viewer

The Playwright trace viewer is the single feature that sells the migration to skeptics. Generated automatically on retry by default (configurable via \`trace: 'on-first-retry'\` or \`trace: 'retain-on-failure'\`), a trace is a zip file containing every action, network request, console message, and DOM snapshot from the run. Open it locally with \`npx playwright show-trace trace.zip\` or upload to a CI artifact.

What you see in the viewer:

1. **A timeline of every action**, with action name, locator, duration, and pass/fail.
2. **Before/after DOM snapshots** for each action, scrubbable.
3. **A live source frame** showing which line of code produced the action.
4. **Network requests** with full headers and bodies.
5. **Console messages** with stack traces.
6. **Test attachments** (screenshots, videos, custom files).

For Cypress users accustomed to scrubbing through a video, the trace viewer is materially better: clickable, searchable, and tied directly to source. The DOM snapshots let you inspect element trees at any point in the run, including elements that were destroyed before the test finished.

Enable traces in \`playwright.config.ts\`:

\`\`\`typescript
use: {
  trace: 'retain-on-failure', // or 'on-first-retry', 'on', 'off'
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
}
\`\`\`

In CI, save the \`test-results/\` directory as an artifact so engineers can download and inspect traces from failed runs.

## Deep dive: parallelism and sharding

Cypress without Cypress Cloud parallelizes only by running multiple Cypress processes on the same machine. Playwright parallelizes by file at the worker level inside a single Cypress-equivalent process, and by shard across multiple CI runners.

\`\`\`typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 4 : undefined, // auto on local, 4 on CI
  fullyParallel: true,                     // run files in parallel
});
\`\`\`

For sharding across multiple CI runners:

\`\`\`yaml
strategy:
  fail-fast: false
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - run: npx playwright test --shard=\${{ matrix.shard }}
\`\`\`

Four GitHub Actions runners each take a quarter of the test files. Coupled with worker-level parallelism inside each runner (4 workers per machine on a 4-vCPU runner), you get up to 16-way parallelism for free.

When you combine sharding with the HTML reporter, you need to merge the shard reports.

\`\`\`yaml
- run: npx playwright merge-reports --reporter=html ./blob-reports
\`\`\`

This is the equivalent of \`mochawesome-merge\` in the Cypress world but built in.

## Deep dive: TypeScript ergonomics

Playwright's TypeScript types are the best-in-class in the test runner space. Three places where this matters:

### Locator autocomplete

\`page.locator('.x')\` returns a \`Locator\` with full method autocomplete: \`click\`, \`fill\`, \`textContent\`, \`isVisible\`, and 40 more. Cypress's chainable types are looser; the IDE often shows the entire chain as \`any\`.

### Custom fixtures

\`test.extend\` lets you declare typed fixtures that downstream tests automatically pick up.

\`\`\`typescript
import { test as base } from '@playwright/test';

type MyFixtures = {
  authedPage: Page;
  apiClient: APIClient;
};

export const test = base.extend<MyFixtures>({
  authedPage: async ({ page, context }, use) => {
    await context.addCookies([{ name: 'session', value: 'fake-token', url: 'http://localhost' }]);
    await use(page);
  },
  apiClient: async ({}, use) => {
    const client = new APIClient(process.env.API_URL!);
    await use(client);
  },
});
\`\`\`

Now any test using \`async ({ authedPage, apiClient }, ...) => ...\` gets full IntelliSense.

### Strict mode

Playwright supports a strict mode that fails if a locator matches more than one element. This catches a class of bugs where Cypress would silently pick the first match.

\`\`\`typescript
await page.locator('button').click(); // strict mode: fails if multiple buttons
\`\`\`

## Deep dive: API testing alongside UI tests

Cypress has \`cy.request\` for API testing. Playwright has the full \`APIRequestContext\` accessible via the \`request\` fixture.

\`\`\`typescript
test('creates a user via API and verifies in UI', async ({ page, request }) => {
  const response = await request.post('/api/users', {
    data: { name: 'Alice', email: 'alice@example.com' },
  });
  expect(response.ok()).toBeTruthy();
  const user = await response.json();

  await page.goto(\`/users/\${user.id}\`);
  await expect(page.getByText('Alice')).toBeVisible();
});
\`\`\`

The \`request\` fixture inherits cookies from the browser context, so authenticated API calls just work. This is significantly more powerful than \`cy.request\` for hybrid API + UI flows.

## Deep dive: codegen

\`npx playwright codegen https://example.com\` opens a browser and a generator pane. As you interact with the page, the generator writes Playwright code in real time. It is the fastest way to bootstrap tests for an unfamiliar area of an application.

The generated code uses accessibility locators by default (\`getByRole\`, \`getByLabel\`, \`getByText\`) so the locators are resilient. Most teams use codegen as a starting point, then refactor to add assertions and structure.

## Deep dive: UI mode

\`npx playwright test --ui\` opens an interactive dashboard inside your terminal. You can run, re-run, and debug individual tests, scrub through traces of failed runs, set breakpoints, and inspect the DOM at any step. It is the closest thing Playwright has to the Cypress App, and arguably better because it ties together the test list, trace viewer, and live source frame in one window.

Most engineers run \`playwright test --ui\` during development and \`playwright test\` in CI.

## Conclusion and next steps

The Cypress-to-Playwright migration is a one-time, high-leverage investment. The tooling has matured to the point where the migration is mechanical for 80% of code; the remaining 20%, sessions, tasks, custom commands, has well-trodden patterns described above. A two-person team can move a 500-spec suite in six to eight weeks while continuing to ship features.

Start with the smoke suite. Run both runners in parallel. Delete Cypress once Playwright has been green for ten working days. Save the trace viewer for last. It will sell the migration to skeptics on its own.

The biggest win is rarely the speed. It is the daily debugging experience: every flake comes with a trace you can scrub, every refactor breaks fewer tests because locators are accessibility-anchored, every new test is faster to write because codegen gives you a starting point and IntelliSense catches mistakes. After the migration, the suite stops being a tax and starts being a tool.

Next read: browse the [QA Skills directory](/skills) for Playwright-specific skills you can install into Claude Code, and the [blog index](/blog) for deeper dives on fixtures, trace viewer, and CI parallelization.
`,
};
