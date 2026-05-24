import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Puppeteer to Playwright Migration Guide for 2026',
  description:
    'Step-by-step Puppeteer to Playwright migration in 2026. API mapping, before/after code, multi-browser testing, codegen, parallelization, and a proven checklist.',
  date: '2026-05-05',
  category: 'Migration',
  content: `
# Puppeteer to Playwright Migration Guide for 2026

Puppeteer was Google's gift to browser automation in 2017. It introduced a clean async/await API on top of the Chrome DevTools Protocol, brought headless Chrome to the mainstream, and inspired the next generation of E2E tooling. Many of the original Puppeteer engineers later joined Microsoft and built Playwright, which is essentially Puppeteer's spiritual successor with cross-browser support, a built-in test runner, automatic waiting, and a richer ecosystem.

In 2026 the case for staying on Puppeteer is narrow: scraping, PDF generation, headless screenshotting, and other non-test browser automation. For E2E testing, Playwright wins on essentially every axis. This guide is the migration playbook for teams running Puppeteer test suites who want to move to Playwright without rewriting from scratch.

For broader Playwright references, browse [the blog index](/blog). For Playwright skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Why migrate from Puppeteer to Playwright

Puppeteer is a great browser-control library. It is not a test framework. To use Puppeteer for testing you must bolt on Jest or Mocha, write your own retry logic, manage browser launching and teardown, and implement your own parallel execution. Playwright bundles a first-class test runner, web-first assertions that auto-retry, parallelism, sharding, projects (multi-browser matrix), tracing, snapshots, and a UI mode. The migration from Puppeteer to Playwright is typically a net code reduction.

The second driver is cross-browser support. Puppeteer drives Chromium and (experimentally) Firefox; Playwright drives Chromium, Firefox, and WebKit with a single API. If you ship a web app that supports Safari users, Playwright is the only modern option.

## Conceptual model: similar but tighter

Puppeteer and Playwright look almost identical at a glance: both use async/await, both expose a \`Page\` object, both drive the browser via CDP. The differences emerge once you go beyond a happy-path script.

1. **Locators vs ElementHandles.** Puppeteer uses ElementHandles, which are bound to a DOM node at the moment of retrieval and become stale if the DOM updates. Playwright uses Locators, which are lazy queries re-evaluated on each action. Locators eliminate a class of flaky tests.
2. **Web-first assertions.** Puppeteer offers no assertions; you reach for Jest's \`expect\`. Playwright's \`expect\` auto-retries until the condition holds or the timeout expires. Most explicit \`waitFor\` calls disappear.
3. **Built-in test runner.** Puppeteer scripts are scripts; Playwright tests are tests with hooks, fixtures, and parallel workers.

## API mapping table: Puppeteer to Playwright

| Puppeteer | Playwright | Notes |
|---|---|---|
| \`puppeteer.launch()\` | \`chromium.launch()\` / managed by runner | Test runner launches automatically |
| \`browser.newPage()\` | \`context.newPage()\` / managed by runner | Page fixture provided |
| \`page.goto(url)\` | \`page.goto(url)\` | Same |
| \`page.$(selector)\` | \`page.locator(selector)\` | Lazy locator |
| \`page.$$(selector)\` | \`page.locator(selector).all()\` | Locator API |
| \`page.click(selector)\` | \`page.locator(selector).click()\` | Auto-waits |
| \`page.type(selector, text)\` | \`page.locator(selector).fill(text)\` | One call |
| \`page.waitForSelector(s)\` | \`expect(page.locator(s)).toBeVisible()\` | Web-first assertion |
| \`page.waitForResponse(url)\` | \`page.waitForResponse(url)\` | Same |
| \`page.setRequestInterception(true)\` + \`page.on('request', ...)\` | \`page.route(url, handler)\` | Cleaner API |
| \`page.evaluate(fn)\` | \`page.evaluate(fn)\` | Same |
| \`page.screenshot()\` | \`page.screenshot()\` | Same |
| \`page.pdf()\` | \`page.pdf()\` | Same (Chromium only) |
| \`page.cookies()\` | \`context.cookies()\` | Per-context |
| \`page.setViewport(...)\` | \`page.setViewportSize(...)\` | Slightly different name |
| \`page.exposeFunction(name, fn)\` | \`page.exposeFunction(name, fn)\` | Same |

## Step-by-step migration plan

1. **Week 0** - Install Playwright in \`tests-pw/\`. Leave Puppeteer scripts in place.
2. **Week 1** - Port the smoke flows. Replace Jest's \`describe\`/\`test\` with Playwright's runner.
3. **Week 2** - Replace request interception with \`page.route\`.
4. **Week 3** - Wire CI; run both suites in parallel.
5. **Week 4** - Cutover. Delete Puppeteer dependencies.
6. **Optional Week 5** - Add Firefox and WebKit projects to widen coverage.

## Before and after: a real test

**Puppeteer + Jest (before)**

\`\`\`typescript
import puppeteer, { Browser, Page } from 'puppeteer';

describe('Login', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch();
  });
  afterAll(async () => {
    await browser.close();
  });
  beforeEach(async () => {
    page = await browser.newPage();
  });
  afterEach(async () => {
    await page.close();
  });

  it('logs in as admin', async () => {
    await page.goto('https://app.example.com/login');
    await page.type('input[name=email]', 'admin@example.com');
    await page.type('input[name=password]', 'secret');
    await page.click('button[type=submit]');
    await page.waitForSelector('.user-menu');
    const text = await page.$eval('.user-menu', (el) => el.textContent);
    expect(text).toContain('admin@example.com');
  });
});
\`\`\`

**Playwright (after)**

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('logs in as admin', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('.user-menu')).toContainText('admin@example.com');
});
\`\`\`

The Playwright version is half the lines, has no manual browser lifecycle, and uses accessibility-anchored locators.

## Request interception

Puppeteer's request interception requires \`setRequestInterception(true)\`, an event listener, and explicit \`continue\` or \`abort\`. Playwright's \`page.route\` collapses this into a single call.

**Puppeteer (before)**

\`\`\`typescript
await page.setRequestInterception(true);
page.on('request', (req) => {
  if (req.url().includes('/api/users')) {
    req.respond({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ users: [] }),
    });
  } else {
    req.continue();
  }
});
\`\`\`

**Playwright (after)**

\`\`\`typescript
await page.route('**/api/users', async (route) => {
  await route.fulfill({ json: { users: [] } });
});
\`\`\`

For requests not matched by your routes, Playwright continues them automatically. Cleaner mental model.

## Cross-browser projects

Once you have ported the suite to Playwright, you can run it across Chromium, Firefox, and WebKit by adding a \`projects\` array to your config.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
\`\`\`

\`npx playwright test\` now runs the entire suite three times, one per browser, in parallel. This is the single biggest reason teams migrate from Puppeteer.

## Configuration translation

| Puppeteer | Playwright |
|---|---|
| \`puppeteer.launch({ headless: false })\` | \`use.headless: false\` |
| \`browser.newPage()\` viewport | \`use.viewport\` |
| \`devtools: true\` | \`use.launchOptions.devtools: true\` |
| \`slowMo: 100\` | \`use.launchOptions.slowMo: 100\` |
| \`args: ['--no-sandbox']\` | \`use.launchOptions.args: ['--no-sandbox']\` |
| \`ignoreHTTPSErrors: true\` | \`use.ignoreHTTPSErrors: true\` |
| \`userAgent: '...'\` | \`use.userAgent: '...'\` |

## Authentication caching

Puppeteer scripts often log in at the start of every spec. Playwright's \`storageState\` lets you log in once in \`globalSetup\` and reuse the state across tests.

\`\`\`typescript
// global-setup.ts
import { chromium } from '@playwright/test';
export default async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.E2E_EMAIL!);
  await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\\/dashboard/);
  await page.context().storageState({ path: 'auth.json' });
  await browser.close();
};
\`\`\`

## CI changes

Puppeteer's CI requires installing the Chromium it depends on, often via \`puppeteer install\` or a pre-baked Docker image. Playwright provides \`npx playwright install --with-deps\` for the same purpose.

\`\`\`yaml
- run: npm ci
- run: npx playwright install --with-deps
- run: npx playwright test --reporter=html
\`\`\`

Sharding works identically to other Playwright migrations.

## Gotchas and breaking changes

1. **\`page.$\` returns Locator, not ElementHandle.** A handful of advanced operations on ElementHandle (\`asElement\`, \`evaluateHandle\`) require porting; Locator covers 95% of needs.
2. **\`waitForSelector\` becomes an assertion.** Use \`expect(locator).toBeVisible()\`.
3. **\`page.type\` becomes \`fill\`.** \`fill\` replaces the value; \`pressSequentially\` types key by key like Puppeteer's \`type\`.
4. **\`setRequestInterception\` is gone.** Use \`page.route\`.
5. **Browser lifecycle is automatic.** Do not call \`browser.launch\` or \`browser.close\` in tests; the runner handles it.
6. **PDF generation is Chromium-only in both.** No change needed.
7. **\`page.exposeFunction\` works identically.** Useful for ergonomic test helpers.
8. **\`page.cookies\` is now context-scoped.** Use \`context.cookies()\`.
9. **\`page.goBack\`, \`page.reload\` are identical.** No port needed.
10. **\`puppeteer-cluster\` patterns are obsolete.** Playwright's worker model replaces it.

## Migration checklist

- [ ] Inventory Puppeteer scripts.
- [ ] Install Playwright in a sibling directory.
- [ ] Port the smoke suite first.
- [ ] Replace request interception with \`page.route\`.
- [ ] Replace Jest hooks with Playwright fixtures.
- [ ] Add cross-browser projects (Firefox + WebKit) if relevant.
- [ ] Set up \`storageState\` for authentication caching.
- [ ] Wire Playwright into CI; keep Puppeteer green in parallel.
- [ ] Delete Puppeteer dependencies.
- [ ] Train team on the trace viewer.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your Puppeteer code is for non-test browser automation (scraping, PDF generation, headless screenshotting), Puppeteer is still an excellent choice. The Puppeteer team continues to ship. Migration only makes sense for test suites.

## Conclusion and next steps

Puppeteer started the modern era of browser automation. Playwright is the next chapter, and the migration is straightforward for teams that have written idiomatic Puppeteer tests. You gain a test runner, web-first assertions, cross-browser support, tracing, and parallelism, all without rewriting your fundamental approach. The locator pattern alone reduces flake noticeably.

Start with the smoke suite. Run both runners in parallel until Playwright is green for ten working days. Add Firefox and WebKit projects last; they will sell the migration on their own.

Next read: explore the [QA Skills directory](/skills) for Playwright skills, and the [blog index](/blog) for cross-browser testing, sharding, and trace-viewer guides.
`,
};
