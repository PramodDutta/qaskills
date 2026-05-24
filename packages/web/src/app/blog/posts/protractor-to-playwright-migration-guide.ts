import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Protractor to Playwright Migration Guide for 2026',
  description:
    'Migrate a legacy Protractor Angular suite to Playwright in 2026. API mapping, by.binding/by.model patterns, page object refactor, CI changes, checklist.',
  date: '2026-05-07',
  category: 'Migration',
  content: `
# Protractor to Playwright Migration Guide for 2026

Protractor was deprecated in April 2022 and reached end-of-life shortly after. Yet thousands of enterprise Angular suites still run on it. The Angular team's official recommendation is Playwright (or Cypress) for new projects, and most large Angular shops have already executed or scoped a Protractor migration. If you are reading this in 2026 and still on Protractor, you are running unmaintained software, and every quarter that passes raises the risk of a CVE, Selenium version incompatibility, or driver protocol drift.

This guide is the migration playbook for SDETs maintaining real Protractor suites. We cover the API mapping table, before-and-after spec code, the angular-specific patterns (\`by.binding\`, \`by.model\`, \`by.repeater\`, \`waitForAngular\`), page object refactor, async/await translation, Jasmine to Playwright runner, parallel execution, and the gotchas we hit on multiple production ports.

For broader Playwright references, browse [the blog index](/blog). For Playwright skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Why migrate from Protractor to Playwright

The simplest reason: Protractor is unmaintained. No security patches, no driver protocol updates, no support for new Angular versions, no compatibility with Selenium 4.x without monkey patches. Every quarter, the risk of staying on Protractor grows.

The second reason: Playwright is materially better than Protractor at the things Protractor did well. Async waiting (Protractor's \`waitForAngular\` was clever but brittle), parallel execution, debugging tools, and cross-browser support are all stronger in Playwright. The migration is a multi-week project for a medium suite, but every team we have seen complete it reports the result is faster, more reliable, and easier to maintain.

## Conceptual model: drop ControlFlow, embrace async/await

Protractor inherited Selenium WebDriver's ControlFlow, a promise queue that let you write sequential-looking code without explicit awaits. In 2017 Selenium dropped ControlFlow in favor of async/await; Protractor followed but never fully shed the old patterns. If your suite is on \`SELENIUM_PROMISE_MANAGER: true\` you must first migrate to async/await within Protractor, then migrate to Playwright. If you are already on async/await, skip that intermediate step.

The other conceptual shift is from \`element(by.*)\` queries to Locators. Protractor's locators are eager DOM queries; Playwright's Locators are lazy queries re-evaluated on every action. This is a noticeable upgrade for flake-prone suites.

## API mapping table: Protractor to Playwright

| Protractor | Playwright | Notes |
|---|---|---|
| \`browser.get(url)\` | \`await page.goto(url)\` | Auto-waits |
| \`element(by.css('.x'))\` | \`page.locator('.x')\` | Lazy locator |
| \`element.all(by.css('.x'))\` | \`page.locator('.x')\` (use \`.all()\`, \`.nth(i)\`) | Same locator API |
| \`element(by.id('x'))\` | \`page.locator('#x')\` | Direct CSS |
| \`element(by.binding('user.name'))\` | \`page.locator('[ng-bind="user.name"]')\` or refactor | See section |
| \`element(by.model('user.email'))\` | \`page.locator('[ng-model="user.email"]')\` | Or use \`getByLabel\` |
| \`element(by.repeater('user in users'))\` | \`page.locator('[ng-repeat="user in users"]')\` | Or test-id refactor |
| \`element.click()\` | \`await locator.click()\` | Auto-waits |
| \`element.sendKeys('v')\` | \`await locator.fill('v')\` | One call |
| \`element.getText()\` | \`await locator.textContent()\` | Promise return |
| \`browser.waitForAngular()\` | Not needed; web-first assertions handle it | Trust the framework |
| \`browser.executeScript(s)\` | \`await page.evaluate(() => ...)\` | Direct return |
| \`browser.switchTo().frame(el)\` | \`page.frameLocator(selector)\` | Scoped locator |
| \`browser.refresh()\` | \`await page.reload()\` | Same |

## Step-by-step migration plan

1. **Week 0** - Audit your Protractor suite. If still on SELENIUM_PROMISE_MANAGER, first migrate to async/await within Protractor.
2. **Week 1** - Install Playwright in \`tests-pw/\`. Port the smoke suite (10 to 20 tests).
3. **Week 2** - Translate page objects. Replace \`by.binding\`/\`by.model\` with test-ids or accessibility locators.
4. **Weeks 3 to 6** - Bulk port. Use \`npx playwright codegen\` to record locators.
5. **Week 7** - Wire Playwright into CI; keep Protractor green in parallel for one sprint.
6. **Week 8** - Cutover. Delete Protractor dependencies.

## Before and after: a real spec

**Protractor (before, async/await flavor)**

\`\`\`typescript
import { browser, by, element } from 'protractor';

describe('Login flow', () => {
  beforeEach(async () => {
    await browser.get('/login');
  });

  it('logs in as admin', async () => {
    await element(by.model('user.email')).sendKeys('admin@example.com');
    await element(by.model('user.password')).sendKeys('secret');
    await element(by.buttonText('Sign in')).click();
    await browser.waitForAngular();
    expect(await element(by.binding('user.email')).getText())
      .toContain('admin@example.com');
  });
});
\`\`\`

**Playwright (after)**

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('logs in as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('[data-testid=user-menu]'))
    .toContainText('admin@example.com');
});
\`\`\`

Three things to notice. First, \`waitForAngular\` disappears; Playwright's web-first assertions auto-retry until Angular settles. Second, \`by.model\` becomes \`getByLabel\` if the form has proper labels. Third, \`by.binding\` becomes a test-id you add to your Angular templates.

## Angular-specific locator strategy

Protractor's killer feature was its Angular-aware locators (\`by.binding\`, \`by.model\`, \`by.repeater\`). Playwright does not have these. The migration strategy depends on your Angular template hygiene.

| Protractor locator | Playwright migration strategy |
|---|---|
| \`by.binding('user.name')\` | Add \`[data-testid=user-name]\` to the template, use \`page.getByTestId('user-name')\` |
| \`by.model('user.email')\` | Use \`page.getByLabel('Email')\` if labels are proper |
| \`by.repeater('u in users')\` | Add \`[data-testid=user-row]\` to the repeater item, use \`page.locator('[data-testid=user-row]')\` |
| \`by.exactBinding('user.name')\` | Same as \`by.binding\`; add a test-id |
| \`by.options('opt in opts')\` | Use \`getByRole('option')\` or test-ids |

This is a one-time refactor that improves your Angular templates regardless of the test framework. Most teams find their templates were lacking in accessibility and test-ids before the migration, and emerge in better shape afterward.

## Page object migration

Protractor page objects look almost identical to Playwright ones structurally; the difference is the locator API.

**Protractor (before)**

\`\`\`typescript
import { by, element } from 'protractor';

export class LoginPage {
  email = element(by.model('user.email'));
  password = element(by.model('user.password'));
  submit = element(by.buttonText('Sign in'));

  async loginAs(email: string, password: string) {
    await this.email.sendKeys(email);
    await this.password.sendKeys(password);
    await this.submit.click();
  }
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

  async loginAs(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}
\`\`\`

## Jasmine to Playwright runner

Protractor uses Jasmine by default. Playwright provides its own runner with similar but not identical semantics.

| Jasmine | Playwright |
|---|---|
| \`describe(name, fn)\` | \`test.describe(name, fn)\` |
| \`it(name, fn)\` | \`test(name, fn)\` |
| \`beforeEach(fn)\` | \`test.beforeEach(fn)\` |
| \`expect(x).toBe(y)\` | \`expect(x).toBe(y)\` |
| \`fdescribe\` / \`fit\` | \`test.describe.only\` / \`test.only\` |
| \`xdescribe\` / \`xit\` | \`test.describe.skip\` / \`test.skip\` |
| \`spyOn\` | Not built in; use \`vi.spyOn\` from Vitest or Sinon |

For unit-style tests with extensive spies and mocks, keep Jasmine or migrate to Vitest. Playwright is purpose-built for E2E.

## CI changes

Protractor CI typically requires installing Chrome, ChromeDriver, and configuring Selenium standalone. Playwright CI is one install command.

\`\`\`yaml
- run: npm ci
- run: npx playwright install --with-deps
- run: npx playwright test --reporter=html
\`\`\`

For sharded parallel execution across multiple CI runners:

\`\`\`yaml
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - run: npx playwright test --shard=\${{ matrix.shard }}
\`\`\`

## Gotchas and breaking changes

1. **\`browser.waitForAngular\` vanishes.** Trust Playwright's web-first assertions; they auto-retry.
2. **\`by.binding\`/\`by.model\`/\`by.repeater\` vanish.** Add test-ids or accessibility-based locators to templates.
3. **\`getText\` returns a Promise immediately.** No more ControlFlow magic.
4. **Multi-browser is much simpler.** Set \`projects\` in config.
5. **No \`browser.params\`.** Use \`process.env\` and read from \`playwright.config.ts\`.
6. **No \`onPrepare\` callback.** Use \`globalSetup\` in \`playwright.config.ts\`.
7. **\`ng-app\` autodetect goes away.** Not needed; assertions handle waits.
8. **iframes are first-class.** \`page.frameLocator\` replaces \`switchTo().frame\`.
9. **Jasmine \`done\` callbacks become async functions.** Pure async/await everywhere.
10. **Browser launching is automatic.** Do not call \`browser.start\` or \`browser.quit\`.

## Migration checklist

- [ ] Audit Protractor suite and Angular template test-id coverage.
- [ ] If still on SELENIUM_PROMISE_MANAGER, migrate to async/await first.
- [ ] Install Playwright in a sibling directory.
- [ ] Add test-ids to Angular templates for Protractor locators that have no Playwright equivalent.
- [ ] Port the smoke suite first.
- [ ] Rewrite page objects with Locator properties.
- [ ] Translate fixtures and hooks.
- [ ] Configure projects for multi-browser execution.
- [ ] Add sharding for CI parallelism.
- [ ] Run both suites in CI; promote Playwright once parity reaches 80%.
- [ ] Delete Protractor and Jasmine dependencies (for E2E only).
- [ ] Train team on the trace viewer and UI mode.
- [ ] Update onboarding docs and the [QA Skills directory](/skills).

## When not to migrate

There is no case where staying on Protractor is correct in 2026. The tool is unmaintained. If your suite is too large to migrate, consider freezing it and writing all new tests in Playwright; over time, the Protractor footprint shrinks.

## Conclusion and next steps

Protractor served Angular teams well from 2013 to 2022. In 2026 it is unmaintained and a liability. Playwright is the official Angular team recommendation and offers materially better tooling, performance, and reliability. The migration is mechanical for the bulk of code; the locator refactor for \`by.binding\`/\`by.model\` patterns takes the most planning.

Start with the smoke suite. Run both runners in parallel until Playwright is green for ten working days. Train the team on the trace viewer last; it sells the migration on its own.

Next read: explore the [QA Skills directory](/skills) for Playwright skills, and the [blog index](/blog) for Angular-specific testing strategies.
`,
};
