import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'WebdriverIO to Playwright Migration Guide for 2026',
  description:
    'Migrate a WebdriverIO suite to Playwright in 2026. API mapping, before/after specs, services to fixtures, mobile and Appium replacement, and rollout plan.',
  date: '2026-05-04',
  category: 'Migration',
  content: `
# WebdriverIO to Playwright Migration Guide for 2026

WebdriverIO has been the JavaScript SDET's WebDriver client of choice for over a decade. It pioneered async/await testing, introduced the \`browser\` global pattern, and built a rich service ecosystem covering everything from Appium to Lighthouse. In 2026, however, many WebdriverIO teams are evaluating, or actively executing, a migration to Playwright. The drivers are familiar: slower test execution due to the WebDriver protocol overhead, missing modern features like trace viewer and codegen, and a smaller ecosystem of native integrations.

This guide is the migration playbook for SDETs maintaining real WebdriverIO suites. We will walk through the API mapping table, before-and-after spec code, page object refactor, service-to-fixture translation, Appium and mobile testing replacement, parallel execution, and the gotchas we hit on multiple production ports. By the end you will have a checklist, a CI workflow, and enough working code to begin porting your first ten specs the same day.

For broader Playwright references, browse [the blog index](/blog). For Playwright skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Why migrate from WebdriverIO to Playwright

WebdriverIO's biggest selling point was its async/await ergonomics on top of WebDriver. Playwright keeps the ergonomics and removes the WebDriver tax. Commands execute via the Chrome DevTools Protocol (Chromium), WebKit's remote inspector, or Firefox's Juggler bridge, which translates to tens of milliseconds per action instead of WebDriver's hundreds of milliseconds.

The second driver is auto-waiting. WebdriverIO requires explicit waits with \`waitForExist\`, \`waitForDisplayed\`, or implicit timeouts. Playwright's \`Locator\` auto-waits for actionability, visibility, attachment, and stability before performing actions, dramatically reducing flake. The third is tooling. The Playwright trace viewer captures DOM snapshots, network logs, console messages, and screenshots in an interactive HTML report; WebdriverIO teams typically reach for Allure or third-party reporters that do not approach that experience.

## Conceptual model: from browser global to page fixture

WebdriverIO uses a \`browser\` global that represents the current browser session. Every command is a method on \`browser\` or a discovered element. Playwright uses a \`page\` fixture per test, scoped to a browser context. The mental model is similar; the variable name differs.

The other shift is from \`$\` and \`$$\` selectors to Locators. \`const el = await $('.x')\` becomes \`const locator = page.locator('.x')\`. The Locator is lazy and supports chaining, filtering, and nth-element selection without re-querying the DOM.

## API mapping table: WebdriverIO to Playwright

| WebdriverIO | Playwright | Notes |
|---|---|---|
| \`browser.url(u)\` | \`await page.goto(u)\` | Auto-waits |
| \`$('.x')\` | \`page.locator('.x')\` | Lazy locator |
| \`$$('.x')\` | \`page.locator('.x')\` (use \`.all()\`, \`.nth(i)\`) | Same locator API |
| \`el.click()\` | \`await locator.click()\` | Auto-waits |
| \`el.setValue('v')\` | \`await locator.fill('v')\` | One call |
| \`el.getText()\` | \`await locator.textContent()\` | Promise return |
| \`el.waitForDisplayed()\` | \`await expect(locator).toBeVisible()\` | Web-first assertion |
| \`browser.execute(fn)\` | \`await page.evaluate(fn)\` | Direct return |
| \`browser.switchToFrame(el)\` | \`page.frameLocator(selector)\` | Scoped locator |
| \`browser.newWindow(u)\` | \`await context.newPage()\` then \`goto\` | Multi-tab via context |
| \`browser.getCookies()\` | \`await context.cookies()\` | Per-context |
| \`browser.pause(500)\` | \`await page.waitForTimeout(500)\` | Avoid; use assertions |
| \`browser.takeScreenshot()\` | \`await page.screenshot()\` | Same idea |
| \`mock.respond(...)\` | \`page.route(...)\` + \`route.fulfill\` | More powerful |

## Step-by-step migration plan

1. **Week 0** - Install Playwright in \`tests-pw/\`. Leave WebdriverIO untouched.
2. **Week 1** - Port the smoke suite (top 10 specs). Recreate one page object and the most-used service as a fixture.
3. **Weeks 2 to 4** - Bulk port. Use \`npx playwright codegen\` to record locators for unfamiliar UI.
4. **Week 5** - Replace Appium services with Playwright's built-in mobile emulation or, if real devices are required, route to BrowserStack's Playwright endpoint.
5. **Week 6** - Wire Playwright into CI; keep WebdriverIO green in parallel.
6. **Week 7** - Cutover. Delete WebdriverIO dependencies.

## Before and after: a real spec

**WebdriverIO (before)**

\`\`\`typescript
describe('Login flow', () => {
  it('logs in as admin', async () => {
    await browser.url('https://app.example.com/login');
    await $('input[name=email]').setValue('admin@example.com');
    await $('input[name=password]').setValue('secret');
    await $('button[type=submit]').click();
    await $('.user-menu').waitForDisplayed();
    expect(await $('.user-menu').getText()).toContain('admin@example.com');
  });
});
\`\`\`

**Playwright (after)**

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('logs in as admin', async ({ page }) => {
    await page.goto('https://app.example.com/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Password').fill('secret');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.user-menu')).toContainText('admin@example.com');
  });
});
\`\`\`

Mechanically: \`browser.url\` becomes \`page.goto\`, \`$('selector').setValue('v')\` becomes \`page.locator('selector').fill('v')\`, and assertions are web-first.

## Page object migration

WebdriverIO page objects typically use getters that return discovered elements. Playwright uses constructor-initialized Locators.

**WebdriverIO (before)**

\`\`\`typescript
class LoginPage {
  get email() { return $('input[name=email]'); }
  get password() { return $('input[name=password]'); }
  get submit() { return $('button[type=submit]'); }

  async loginAs(email: string, password: string) {
    await this.email.setValue(email);
    await this.password.setValue(password);
    await this.submit.click();
  }

  async open() { await browser.url('/login'); }
}
\`\`\`

**Playwright (after)**

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

  async open() { await this.page.goto('/login'); }
  async loginAs(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
\`\`\`

## Services become fixtures

WebdriverIO's service architecture (image-comparison-service, devtools-service, chromedriver-service) is replaced by Playwright fixtures. Most services have direct Playwright equivalents.

| WebdriverIO service | Playwright equivalent |
|---|---|
| chromedriver-service | Built-in browser management |
| devtools-service | CDP via \`page.context().newCDPSession\` |
| image-comparison-service | \`expect(page).toHaveScreenshot()\` built-in |
| applitools-service | Applitools Playwright SDK |
| browserstack-service | \`connectOptions\` with BrowserStack endpoint |
| sauce-service | Sauce Labs Playwright endpoint |
| appium-service | Mobile emulation via \`devices\` or BrowserStack |
| visual-regression-service | Built-in \`toHaveScreenshot\` or Percy/Chromatic |

A typical service-to-fixture port:

\`\`\`typescript
import { test as base } from '@playwright/test';

export const test = base.extend<{ authenticated: void }>({
  authenticated: async ({ page, context }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(process.env.E2E_EMAIL!);
    await page.getByLabel('Password').fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\\/dashboard/);
    await use();
    await context.clearCookies();
  },
});
\`\`\`

## Mobile and Appium migration

WebdriverIO is the de-facto JavaScript Appium client. If your suite drives real mobile devices, the migration story is split.

| Use case | WebdriverIO | Playwright |
|---|---|---|
| Mobile web in browser | Appium with mobile emulation | \`use: { ...devices['iPhone 13'] }\` |
| Mobile web on real device | Appium with real device farm | BrowserStack/Sauce real-device Playwright |
| Native mobile app | Appium driver | Use Appium directly (Playwright does not drive native apps) |
| Hybrid app webview | Appium with switch contexts | Run on BrowserStack with WebView Playwright endpoint |

For pure mobile web, Playwright's emulation is excellent and fits in three lines of config. For native apps, keep Appium for that portion of your suite and use Playwright for web.

## Network mocking

WebdriverIO has \`browser.mock\` which provides request mocking via CDP. Playwright's \`page.route\` is more ergonomic.

\`\`\`typescript
await page.route('**/api/users', async (route) => {
  await route.fulfill({ json: { users: [{ id: 1, name: 'Mock' }] } });
});
await page.goto('/users');
await expect(page.getByRole('listitem')).toHaveCount(1);
\`\`\`

## Configuration translation

| WebdriverIO config | Playwright config |
|---|---|
| \`baseUrl\` | \`use.baseURL\` |
| \`waitforTimeout\` | \`use.actionTimeout\` |
| \`maxInstances\` | \`workers\` |
| \`capabilities\` (browser list) | \`projects\` |
| \`services\` | Fixtures and config options |
| \`reporters\` | \`reporter\` config key |
| \`framework: 'mocha'\` | Built-in test runner |

## CI changes

A WebdriverIO pipeline typically installs a driver (\`chromedriver\`) and starts a Selenium standalone. A Playwright pipeline installs browsers in one step.

\`\`\`yaml
- run: npm ci
- run: npx playwright install --with-deps
- run: npx playwright test --reporter=html
\`\`\`

For sharded parallel execution:

\`\`\`yaml
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - run: npx playwright test --shard=\${{ matrix.shard }}
\`\`\`

## Gotchas and breaking changes

1. **No \`browser\` global.** Use the \`page\` fixture or destructure additional fixtures.
2. **\`$\` and \`$$\` go away.** Use \`page.locator\` plus \`.all()\` / \`.nth(i)\`.
3. **Implicit waits are gone.** Replace \`waitForExist\` with web-first assertions.
4. **Services need rewriting.** Most map to fixtures; some (BrowserStack, Applitools) have first-party Playwright equivalents.
5. **Hooks signature differs.** WebdriverIO's \`before/after\` hooks become Playwright's \`test.beforeEach\` async function with destructured fixtures.
6. **\`browser.execute\` becomes \`page.evaluate\`.** Same intent, different name.
7. **No autocomplete on string selectors.** Use Locator helpers like \`getByRole\` for stronger typing.
8. **\`browser.url('/x')\` resolves relative to \`baseUrl\`.** Playwright's \`page.goto('/x')\` does too if \`use.baseURL\` is set.
9. **Mocha and Jasmine integrations vanish.** Playwright has its own runner with \`test\`, \`describe\`, \`expect\`.
10. **The trace viewer is the new debugger.** Train your team on it.

## Migration checklist

- [ ] Inventory specs, page objects, services, custom commands.
- [ ] Install Playwright in a sibling directory.
- [ ] Port the smoke suite first.
- [ ] Rewrite page objects with Locator properties.
- [ ] Translate services to fixtures.
- [ ] Replace Appium use cases (mobile web only) with Playwright emulation.
- [ ] Replace BrowserStack/Sauce integration with Playwright endpoints.
- [ ] Replicate capabilities as Playwright projects.
- [ ] Add sharding for CI parallelism.
- [ ] Run both suites in CI; promote Playwright once parity reaches 80%.
- [ ] Delete WebdriverIO dependencies.
- [ ] Train team on trace viewer, fixtures, and codegen.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

Skip the migration if your suite is small (under 50 specs), runs reliably, and your team is productive. Skip it if you have a heavy Appium integration and most of your tests drive native mobile apps; Playwright does not replace that use case. Skip it if you have a custom WebdriverIO service that has no Playwright equivalent and the rewrite is more expensive than maintaining the current suite.

## Conclusion and next steps

WebdriverIO was the right JavaScript WebDriver client for the 2010s and early 2020s. In 2026 Playwright offers a faster runner, native parallelism, richer debugging, and a vibrant ecosystem. The migration is mechanical for 80% of code; page object and service refactors take a week or two. Most teams report 2x to 4x faster CI pipelines after the cutover.

Start with the smoke suite. Run both runners in parallel until Playwright is green for ten working days. Train the team on the trace viewer last; it sells the migration on its own.

Next read: explore the [QA Skills directory](/skills) for Playwright skills, and the [blog index](/blog) for sharding, fixtures, and BrowserStack guides.
`,
};
