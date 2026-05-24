import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Nightwatch.js to Playwright Migration Guide for 2026',
  description:
    'Migrate a Nightwatch.js test suite to Playwright in 2026. API mapping, before/after specs, page object porting, BrowserStack changes, and rollout plan.',
  date: '2026-05-03',
  category: 'Migration',
  content: `
# Nightwatch.js to Playwright Migration Guide for 2026

Nightwatch.js earned a loyal following by offering a fluent, command-chain API on top of Selenium WebDriver. For years it powered E2E suites at Mozilla, Atlassian, and countless startups. As of 2026 the maintainers have steered Nightwatch toward feature parity with newer entrants by adding Playwright as an underlying driver, but the writing is on the wall: teams that want first-class trace tooling, modern parallelism, and a richer ecosystem of integrations are migrating directly to Playwright's native test runner.

This guide is the migration playbook for SDETs maintaining real Nightwatch suites. We cover the API mapping table, before-and-after test code, page object refactor, BrowserStack and SauceLabs migration, parallel execution, and the gotchas we hit on three different production ports. It assumes a working knowledge of Nightwatch's command API, page objects, and globals file. By the end, you will have a checklist, a CI workflow, and enough working code to start porting your first ten specs the same day.

For broader Playwright references, browse [the blog index](/blog). For Playwright skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Why migrate from Nightwatch to Playwright

Nightwatch's strengths were its readability and Selenium integration. In 2026, two of those strengths have eroded. First, Playwright's API is at least as readable and substantially less verbose. Second, the Selenium dependency that powered Nightwatch is now a tax: extra latency on every command, additional driver binaries to manage, and inability to access modern CDP features like network interception out of the box.

Playwright gives you a single-binary install, sub-millisecond command latency, native parallelism, web-first assertions that auto-retry, multi-tab and multi-context support, and a trace viewer that obsoletes the third-party reporters Nightwatch teams typically bolt on. The migration is mechanical for 80% of the codebase; the remaining 20%, custom commands, page object refactors, and BrowserStack integration, has well-documented patterns covered below.

## Conceptual model: from chainable commands to async/await

Nightwatch chains commands on the \`browser\` object. Each call returns \`browser\`, so you can write \`browser.url('...').waitForElementVisible('.x').click('.y').end()\`. Under the hood Nightwatch queues the commands and executes them sequentially.

Playwright is async/await. Commands return promises; you await each one. The Locator object is lazy, but every action you perform on it is explicit. Most Nightwatch tests translate one-to-one with two changes: add \`async\` to the function signature, and \`await\` each command.

## API mapping table: Nightwatch to Playwright

The table below covers the commands you reach for daily.

| Nightwatch | Playwright | Notes |
|---|---|---|
| \`browser.url(u)\` | \`await page.goto(u)\` | Auto-waits for load |
| \`browser.waitForElementVisible('.x')\` | \`await expect(page.locator('.x')).toBeVisible()\` | Web-first assertion |
| \`browser.click('.x')\` | \`await page.locator('.x').click()\` | Auto-waits for actionability |
| \`browser.setValue('.x', 'val')\` | \`await page.locator('.x').fill('val')\` | One call |
| \`browser.getText('.x', cb)\` | \`const t = await page.locator('.x').textContent()\` | Returns directly |
| \`browser.assert.containsText('.x', 't')\` | \`await expect(page.locator('.x')).toContainText('t')\` | Web-first assertion |
| \`browser.execute(fn, [args], cb)\` | \`await page.evaluate(fn, args)\` | Direct return |
| \`browser.frame('id')\` | \`page.frameLocator('iframe#id')\` | Scoped locator |
| \`browser.windowHandles(cb)\` | \`context.pages()\` | Multi-tab via context |
| \`browser.cookie('get', 'name', cb)\` | \`await context.cookies()\` | Array of objects |
| \`browser.useXpath()\` | \`page.locator('xpath=...')\` | Locator with prefix |
| \`browser.pause(500)\` | \`await page.waitForTimeout(500)\` | Avoid; prefer assertions |
| \`browser.end()\` | Automatic on test end | Use \`afterEach\` if needed |

## Step-by-step migration plan

1. **Week 0** - Install Playwright in a sibling \`tests-pw/\` directory. Leave Nightwatch untouched.
2. **Week 1** - Port the smoke suite (top 10 specs). Recreate one page object and one custom command as a fixture.
3. **Weeks 2 to 4** - Bulk port. Use \`npx playwright codegen\` to record locators on areas you do not know well.
4. **Week 5** - Wire Playwright into CI; keep Nightwatch green in parallel.
5. **Week 6** - Cutover. Delete Nightwatch dependencies and config files.

## Before and after: a real spec

**Nightwatch (before)**

\`\`\`javascript
module.exports = {
  'Login flow': function (browser) {
    browser
      .url('https://app.example.com/login')
      .waitForElementVisible('input[name=email]', 5000)
      .setValue('input[name=email]', 'admin@example.com')
      .setValue('input[name=password]', 'secret')
      .click('button[type=submit]')
      .waitForElementVisible('.user-menu', 5000)
      .assert.containsText('.user-menu', 'admin@example.com')
      .end();
  },
};
\`\`\`

**Playwright (after)**

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('.user-menu')).toContainText('admin@example.com');
});
\`\`\`

The Playwright version is shorter, uses accessibility-anchored locators, and benefits from automatic actionability waits. Locator changes when the design team renames a CSS class will not break the test.

## Page object migration

Nightwatch page objects live in a \`page_objects/\` directory and use a specific structure with \`elements\`, \`commands\`, and \`sections\`. Translate them to plain TypeScript classes.

**Nightwatch page object (before)**

\`\`\`javascript
module.exports = {
  url: '/login',
  elements: {
    email: 'input[name=email]',
    password: 'input[name=password]',
    submit: 'button[type=submit]',
  },
  commands: [{
    loginAs(email, password) {
      return this
        .navigate()
        .waitForElementVisible('@email', 5000)
        .setValue('@email', email)
        .setValue('@password', password)
        .click('@submit');
    },
  }],
};
\`\`\`

**Playwright page object (after)**

\`\`\`typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.email = page.getByLabel('Email');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async goto() { await this.page.goto('/login'); }
  async loginAs(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
\`\`\`

The Playwright class is plain TypeScript; no DSL. Engineers joining the team can read it without learning a framework convention.

## Custom commands become fixtures

Nightwatch lets you add custom commands by exporting a function from \`commands/\`. Playwright's equivalent is \`test.extend\`, which creates a fixture.

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

Tests that import this \`test\` and request the \`loggedIn\` fixture start logged in. Cleaner than the Nightwatch \`before\` hook because fixtures are typed and reusable.

## Network mocking and request interception

Nightwatch does not have first-class network mocking; teams typically wire up a separate mock server or use Selenium's CDP commands directly. Playwright's \`page.route\` is one line.

\`\`\`typescript
await page.route('**/api/users', async (route) => {
  await route.fulfill({ json: { users: [{ id: 1, name: 'Mock' }] } });
});
await page.goto('/users');
await expect(page.getByRole('listitem')).toHaveCount(1);
\`\`\`

This single capability obviates a lot of Nightwatch boilerplate.

## Globals and environment config

Nightwatch uses a \`nightwatch.conf.js\` and a \`globalsModule\` for per-environment configuration. Playwright uses \`playwright.config.ts\` with \`use\` and \`projects\`.

| Nightwatch | Playwright |
|---|---|
| \`launch_url\` | \`use.baseURL\` |
| \`globals.waitForConditionTimeout\` | \`use.actionTimeout\` |
| \`screenshots.on_failure\` | \`use.screenshot: 'only-on-failure'\` |
| \`test_workers\` | \`workers\` |
| \`environments\` | \`projects\` |

## BrowserStack and SauceLabs migration

Nightwatch teams often pair with BrowserStack or SauceLabs via the Selenium endpoint. Both providers now offer first-class Playwright endpoints.

\`\`\`typescript
// playwright.config.ts for BrowserStack
import { defineConfig } from '@playwright/test';

const caps = {
  browser: 'chrome',
  os: 'OSX',
  os_version: 'Ventura',
  'browserstack.username': process.env.BSTACK_USERNAME,
  'browserstack.accessKey': process.env.BSTACK_KEY,
};

export default defineConfig({
  use: {
    connectOptions: {
      wsEndpoint: \`wss://cdp.browserstack.com/playwright?caps=\${encodeURIComponent(JSON.stringify(caps))}\`,
    },
  },
});
\`\`\`

Replace the WebDriver URL with the BrowserStack Playwright endpoint and pass capabilities as a query parameter. Tests run on the cloud as before, but with Playwright's faster execution and richer traces.

## Parallel execution

Nightwatch parallelizes by spawning worker processes via the \`test_workers\` option. Playwright does the same by default; set \`workers\` in \`playwright.config.ts\` or pass \`--workers=N\` on the CLI. For sharded execution across multiple CI runners, use the \`--shard=X/Y\` flag.

\`\`\`yaml
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - run: npx playwright test --shard=\${{ matrix.shard }}
\`\`\`

## Gotchas and breaking changes

1. **Implicit waits gone.** Replace every \`waitForElementVisible\` with a web-first assertion.
2. **Selector strategy improves.** \`page.locator('@email')\` does not work; use plain CSS or accessibility locators.
3. **No \`browser\` global.** Each test has its own \`page\` fixture.
4. **Callbacks become awaits.** \`browser.getText('.x', (result) => ...)\` becomes \`const t = await page.locator('.x').textContent()\`.
5. **\`browser.end()\` is automatic.** Playwright closes the context after each test.
6. **Page objects need rewriting, not transpiling.** The Nightwatch \`@elementName\` syntax has no equivalent.
7. **iframes are easy.** \`page.frameLocator(selector)\` returns a locator scoped to the frame. No more \`browser.frame()\`.
8. **Geolocation, permissions, viewport are config options.** Set them in \`use.geolocation\` or per-test \`test.use({ geolocation: ... })\`.

## Migration checklist

- [ ] Inventory specs, page objects, custom commands, globals.
- [ ] Install Playwright in a sibling directory.
- [ ] Port the smoke suite first.
- [ ] Rewrite page objects as plain TypeScript classes.
- [ ] Translate custom commands to fixtures.
- [ ] Replicate environments as Playwright projects.
- [ ] Wire BrowserStack or SauceLabs via the Playwright endpoint.
- [ ] Add sharding for CI parallelism.
- [ ] Cut over CI; delete Nightwatch dependencies.
- [ ] Train team on the trace viewer.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

If your Nightwatch suite is small (under 50 tests), runs reliably, and your team is productive, the ROI is low. If you have a heavy Nightwatch ecosystem integration (custom reporters, internal plugins), audit the migration cost before committing.

## Conclusion and next steps

Nightwatch served the JavaScript QA community well. In 2026 Playwright offers a faster runner, native parallelism, better debugging, and a richer ecosystem. The migration is mechanical for the bulk of code; page object and custom command refactors take a week or two. Most teams report 2x to 3x faster CI pipelines after the cutover.

Start with the smoke suite. Run both runners in parallel until Playwright is green for ten working days. Train the team on the trace viewer last; it sells the migration on its own.

Next read: explore the [QA Skills directory](/skills) for Playwright skills, and the [blog index](/blog) for sharding, fixtures, and BrowserStack guides.
`,
};
