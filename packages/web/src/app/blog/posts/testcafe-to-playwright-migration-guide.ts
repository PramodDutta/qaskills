import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'TestCafe to Playwright Migration Guide for 2026',
  description:
    'Migrate a TestCafe test suite to Playwright in 2026. API mapping, before/after specs, Selector to Locator translation, ClientFunction patterns, CI changes.',
  date: '2026-05-06',
  category: 'Migration',
  content: `
# TestCafe to Playwright Migration Guide for 2026

TestCafe carved out a unique niche when DevExpress released it in 2016. By injecting its driver into the page rather than using WebDriver, it ran tests on any browser with no setup, supported IE11 long after other tools dropped it, and let teams write tests without dealing with browser drivers. For mid-2010s SaaS teams, that was a meaningful advantage.

In 2026 those advantages have diminished. The injection-based architecture limits some interception capabilities, parallel execution is more constrained than Playwright's, the trace and debugging tooling is less mature, and the ecosystem has not kept pace. Teams running TestCafe at scale increasingly migrate to Playwright. This guide covers the migration mechanics: API mapping, Selector-to-Locator translation, hooks, ClientFunction, role-based locators, CI changes, and the rollout plan.

For broader Playwright references, browse [the blog index](/blog). For Playwright skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Why migrate from TestCafe to Playwright

TestCafe's primary advantage was zero browser setup. Playwright matches this with \`npx playwright install --with-deps\`, a single command that fetches every supported browser. TestCafe's second advantage, automatic waiting for assertions, is also matched by Playwright's web-first assertions. The decisive differences are now:

1. **Parallelism.** TestCafe parallelizes by concurrency factor and browser instance; Playwright parallelizes at the test-file level with explicit worker counts. Playwright is faster in nearly every scenario.
2. **Tooling.** The Playwright trace viewer, codegen, and UI mode are best-in-class.
3. **Ecosystem.** Playwright has first-party support from Microsoft, an active GitHub community, and integrations with every major test cloud.
4. **Network mocking.** Playwright's \`page.route\` is more powerful than TestCafe's \`RequestMock\`.

## Conceptual model: from TestController to Page

TestCafe tests receive a \`t\` controller representing the test execution session. Every action is a method on \`t\` (\`t.click\`, \`t.typeText\`). Selectors are first-class objects created with \`Selector('...')\`.

Playwright tests receive a \`page\` fixture. Every action is a method on \`page.locator(...)\` or directly on \`page\` (\`page.goto\`, \`page.evaluate\`). Locators are first-class objects created with \`page.locator('...')\` or the accessibility helpers (\`getByRole\`, \`getByLabel\`, \`getByTestId\`).

## API mapping table: TestCafe to Playwright

| TestCafe | Playwright | Notes |
|---|---|---|
| \`fixture('').page('url')\` | \`test.beforeEach(async ({ page }) => page.goto('url'))\` | Per-test navigation |
| \`Selector('.x')\` | \`page.locator('.x')\` | Lazy locator |
| \`t.click(sel)\` | \`await sel.click()\` | Where sel is a locator |
| \`t.typeText(sel, 'val')\` | \`await sel.fill('val')\` | One call |
| \`t.expect(sel.innerText).contains('x')\` | \`await expect(sel).toContainText('x')\` | Web-first assertion |
| \`t.expect(sel.exists).ok()\` | \`await expect(sel).toBeAttached()\` | Or \`toBeVisible\` |
| \`t.expect(sel.count).eql(3)\` | \`await expect(sel).toHaveCount(3)\` | Auto-retries |
| \`t.navigateTo(url)\` | \`await page.goto(url)\` | Same |
| \`t.hover(sel)\` | \`await sel.hover()\` | Same |
| \`t.pressKey('enter')\` | \`await page.keyboard.press('Enter')\` | Or \`locator.press('Enter')\` |
| \`t.takeScreenshot()\` | \`await page.screenshot()\` | Same idea |
| \`ClientFunction(fn)\` | \`page.evaluate(fn)\` | Direct execution |
| \`RequestMock()\` | \`page.route(url, handler)\` | More flexible |
| \`t.eval(() => location.href)\` | \`await page.url()\` | Or \`page.evaluate\` |

## Step-by-step migration plan

1. **Week 0** - Install Playwright in \`tests-pw/\`. Leave TestCafe in place.
2. **Week 1** - Port the smoke suite (10 to 20 tests). Recreate a Selector helper file as a Locator helper file.
3. **Weeks 2 to 3** - Bulk port. Use \`npx playwright codegen\` to record locators.
4. **Week 4** - Wire Playwright into CI; keep TestCafe green in parallel.
5. **Week 5** - Cutover. Delete TestCafe dependencies.

## Before and after: a real spec

**TestCafe (before)**

\`\`\`typescript
import { Selector } from 'testcafe';

fixture('Login flow').page('https://app.example.com/login');

test('logs in as admin', async (t) => {
  const email = Selector('input[name=email]');
  const password = Selector('input[name=password]');
  const submit = Selector('button[type=submit]');
  const userMenu = Selector('.user-menu');

  await t
    .typeText(email, 'admin@example.com')
    .typeText(password, 'secret')
    .click(submit)
    .expect(userMenu.innerText).contains('admin@example.com');
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

The Playwright version is shorter and uses accessibility-anchored locators that survive UI refactors.

## Selector to Locator translation

TestCafe Selectors and Playwright Locators differ in subtle ways.

| TestCafe Selector | Playwright Locator |
|---|---|
| \`Selector('.x')\` | \`page.locator('.x')\` |
| \`Selector('.x').nth(1)\` | \`page.locator('.x').nth(1)\` |
| \`Selector('.x').filter('.y')\` | \`page.locator('.x').filter({ has: page.locator('.y') })\` |
| \`Selector('.x').withText('hi')\` | \`page.locator('.x', { hasText: 'hi' })\` |
| \`Selector('.x').parent()\` | \`page.locator('.x').locator('..')\` |
| \`Selector('.x').sibling('.y')\` | Use combined CSS or XPath |
| \`Selector('.x').count\` | \`await page.locator('.x').count()\` |
| \`Selector('.x').exists\` | \`await page.locator('.x').count() > 0\` |
| \`Selector('.x').innerText\` | \`await page.locator('.x').innerText()\` |

## Hooks and fixtures

TestCafe uses \`fixture(...).before\` / \`.after\` and \`test.before\` / \`.after\` for hooks. Playwright uses \`test.beforeEach\` / \`test.afterEach\` plus extensible fixtures.

\`\`\`typescript
import { test as base } from '@playwright/test';

export const test = base.extend<{ loggedIn: void }>({
  loggedIn: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(process.env.E2E_EMAIL!);
    await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\\/dashboard/);
    await use();
  },
});
\`\`\`

Any test that imports this \`test\` and requests \`loggedIn\` starts in an authenticated state.

## ClientFunction and Role helpers

TestCafe's \`ClientFunction\` lets you run code in the browser and return values. Playwright's \`page.evaluate\` does the same with cleaner async semantics.

\`\`\`typescript
// TestCafe
const getUrl = ClientFunction(() => window.location.href);
await t.expect(getUrl()).contains('/dashboard');

// Playwright
const url = await page.evaluate(() => window.location.href);
expect(url).toContain('/dashboard');
// Or simpler:
await expect(page).toHaveURL(/\\/dashboard/);
\`\`\`

## Network mocking

TestCafe's \`RequestMock\` is a separate object you attach to a test. Playwright's \`page.route\` is inline.

\`\`\`typescript
// TestCafe
const mock = RequestMock()
  .onRequestTo('https://api.example.com/users')
  .respond({ users: [] }, 200);

fixture('Users').requestHooks(mock);

// Playwright
await page.route('**/api/users', async (route) => {
  await route.fulfill({ json: { users: [] } });
});
\`\`\`

The Playwright version is one block of code in the test rather than a setup statement outside it.

## Configuration translation

| TestCafe \`.testcaferc.json\` | Playwright \`playwright.config.ts\` |
|---|---|
| \`browsers\` | \`projects\` |
| \`concurrency\` | \`workers\` |
| \`baseUrl\` | \`use.baseURL\` |
| \`screenshots\` | \`use.screenshot\` |
| \`videoPath\` | \`use.video\` |
| \`assertionTimeout\` | \`expect.timeout\` |
| \`pageLoadTimeout\` | \`use.navigationTimeout\` |
| \`reporter\` | \`reporter\` |

## CI changes

A TestCafe pipeline is short; a Playwright pipeline is similarly short.

\`\`\`yaml
- run: npm ci
- run: npx playwright install --with-deps
- run: npx playwright test --reporter=html
\`\`\`

Sharding works the same way as for other Playwright migrations.

## Gotchas and breaking changes

1. **No \`t\` controller.** Use \`page\`, \`context\`, and fixtures.
2. **No automatic waiting on Selector creation.** Locators are lazy and re-evaluated on action; assertions auto-retry.
3. **Browser launch flags differ.** Migrate \`-e\` and \`--no-sandbox\` to \`launchOptions.args\`.
4. **\`Selector.with({boundTestRun: t})\` patterns vanish.** Locators are always scoped to a Page.
5. **Live mode becomes UI mode.** \`npx playwright test --ui\` is the equivalent and arguably better.
6. **Hover and drag have richer Playwright APIs.** Use \`locator.dragTo()\` for drag.
7. **\`t.eval\` becomes \`page.evaluate\`.** Same intent, different name.
8. **iframes are first-class.** \`page.frameLocator(selector)\` works without \`t.switchToIframe\` ceremony.
9. **No automatic concurrency cap by browser instance.** Set \`workers\` explicitly.
10. **Network mocking is per-page.** Move it inside tests or fixtures.

## Migration checklist

- [ ] Inventory TestCafe specs, helpers, RequestMocks, ClientFunctions.
- [ ] Install Playwright in a sibling directory.
- [ ] Port the smoke suite first.
- [ ] Translate Selectors to Locators.
- [ ] Translate ClientFunctions to \`page.evaluate\`.
- [ ] Replace RequestMocks with \`page.route\`.
- [ ] Set up fixtures for shared setup.
- [ ] Configure projects for multi-browser execution.
- [ ] Wire Playwright into CI; keep TestCafe green in parallel.
- [ ] Delete TestCafe dependencies.
- [ ] Train team on the trace viewer and UI mode.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your TestCafe suite is small (under 50 tests), runs reliably, and your team is productive, the ROI is low. If you depend on IE11 support and Playwright cannot drive a legacy browser you need, retain TestCafe for that subset and migrate the rest.

## Conclusion and next steps

TestCafe was an excellent tool for its era. In 2026 Playwright offers faster execution, richer tooling, and a stronger ecosystem. The migration is mechanical for the bulk of code; Selector-to-Locator translation and hook restructuring take a week or two. Most teams report 2x to 3x faster CI pipelines after the cutover.

Start with the smoke suite. Run both runners in parallel until Playwright is green for ten working days. Train the team on the trace viewer last; it sells the migration on its own.

Next read: explore the [QA Skills directory](/skills) for Playwright skills, and the [blog index](/blog) for sharding, fixtures, and UI-mode guides.
`,
};
