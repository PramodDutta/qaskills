import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Fixtures: Complete Reference 2026',
  description: 'Complete reference for Playwright fixtures in 2026: built-in fixtures, custom fixtures, worker scope, options, override patterns, and TypeScript typing.',
  date: '2026-05-05',
  category: 'Reference',
  content: `
# Playwright Fixtures: Complete Reference 2026

Fixtures are how Playwright moves shared setup out of every test and into a typed, reusable layer. Anything you set up before a test, tear down after, or pass into a test as a parameter is a fixture. The runner instantiates each fixture on demand, dependency-resolves its inputs, scopes its lifetime, and disposes it cleanly when the dependent tests finish. In 2026 mastering fixtures is the difference between a 200-test suite that compiles in 4 seconds and one that takes 40.

This reference covers every built-in fixture, every custom fixture pattern, every scope (test vs worker), and the override mechanics that let you bend fixtures without rewriting tests. Every example is TypeScript with strict mode and Playwright 1.49+.

For broader Playwright fundamentals, the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide) is the entry point. The [playwright-e2e skill](/skills/playwright-e2e) ensures AI assistants generate fixtures that follow these patterns.

## Built-in fixtures

Every test receives access to these out of the box:

| Fixture | Type | Scope | Purpose |
|---|---|---|---|
| \`page\` | Page | test | Fresh Page instance |
| \`context\` | BrowserContext | test | Browser context for the test |
| \`browser\` | Browser | worker | Shared browser instance across tests in a worker |
| \`browserName\` | string | worker | One of 'chromium', 'firefox', 'webkit' |
| \`request\` | APIRequestContext | test | API client tied to the context cookies |
| \`baseURL\` | string \\| undefined | test | The configured base URL |
| \`viewport\` | ViewportSize \\| null | test | Configured viewport |
| \`deviceScaleFactor\` | number | test | Configured DPR |
| \`isMobile\` | boolean | test | Whether mobile emulation is active |
| \`hasTouch\` | boolean | test | Whether touch is enabled |
| \`locale\` | string | test | Configured locale |
| \`timezoneId\` | string | test | Configured timezone |
| \`storageState\` | string \\| StorageState \\| undefined | test | Initial storage state |
| \`userAgent\` | string | test | User-Agent header |

Use them via destructuring:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('uses base URL', async ({ page, baseURL }) => {
  await page.goto(baseURL!);
  await expect(page).toHaveTitle(/QASkills/);
});
\`\`\`

## Defining custom fixtures

Use \`test.extend\` to add fixtures. The first generic is the new fixture type.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

type Fixtures = {
  todoList: { add: (text: string) => Promise<void> };
};

export const test = base.extend<Fixtures>({
  todoList: async ({ page }, use) => {
    await page.goto('/todos');
    const add = async (text: string) => {
      await page.getByLabel('New todo').fill(text);
      await page.keyboard.press('Enter');
    };
    await use({ add });
    // teardown after test
    await page.evaluate(() => localStorage.clear());
  },
});

export { expect };
\`\`\`

\`\`\`typescript
import { test, expect } from './fixtures';

test('adds a todo', async ({ todoList, page }) => {
  await todoList.add('Buy milk');
  await expect(page.getByText('Buy milk')).toBeVisible();
});
\`\`\`

The function receives the existing fixtures (\`{ page }\` here), a \`use\` callback, and returns nothing. Code before \`use\` is setup; code after \`use\` is teardown.

## Fixture scopes

Fixtures default to \`test\` scope: one instance per test. Set \`scope: 'worker'\` to share across all tests in a worker.

\`\`\`typescript
type Fixtures = {
  expensiveResource: { client: SomeClient };
};

export const test = base.extend<{}, Fixtures>({
  expensiveResource: [
    async ({}, use) => {
      const client = await SomeClient.connect();
      await use({ client });
      await client.close();
    },
    { scope: 'worker' },
  ],
});
\`\`\`

Worker-scoped fixtures live as long as the worker process. Use them for database connections, browser instances, or any setup whose cost amortizes across many tests.

## Automatic fixtures

A fixture annotated \`auto: true\` runs for every test, even when no test destructures it. Useful for global setup like preventing console errors.

\`\`\`typescript
type Fixtures = {
  failOnConsoleError: void;
};

export const test = base.extend<Fixtures>({
  failOnConsoleError: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
\`\`\`

Every test now fails if the page logs an error, without each spec needing to opt in.

## Option fixtures

Options are configuration values that can be overridden per project or per file. Declare with \`[defaultValue, { option: true }]\`.

\`\`\`typescript
type Options = {
  todoCount: number;
};

export const test = base.extend<Options>({
  todoCount: [10, { option: true }],
});
\`\`\`

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'small', use: { todoCount: 5 } },
    { name: 'large', use: { todoCount: 100 } },
  ],
});
\`\`\`

Within a test, override per spec with \`test.use\`:

\`\`\`typescript
test.use({ todoCount: 25 });
\`\`\`

## Override built-in fixtures

You can override the built-in \`page\` fixture to wrap every test's page in custom behavior, for example to inject auth.

\`\`\`typescript
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('access_token', 'test-token');
    });
    await use(page);
  },
});
\`\`\`

Every test that uses the new \`test\` import inherits the override.

## Authentication fixtures

The canonical example: log in once per worker and reuse the storage state.

\`\`\`typescript
// auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
\`\`\`

\`\`\`typescript
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /auth\\.setup\\.ts/ },
  {
    name: 'logged-in',
    use: { storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
\`\`\`

Every test in \`logged-in\` starts authenticated. The setup runs once per CI invocation.

## Per-user authentication

For multi-role tests, define one fixture per role.

\`\`\`typescript
type Fixtures = {
  adminPage: Page;
  memberPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  memberPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/member.json' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
\`\`\`

\`\`\`typescript
test('admin can delete user', async ({ adminPage }) => {
  await adminPage.goto('/users');
  await adminPage.getByRole('button', { name: 'Delete' }).first().click();
});

test('member sees no delete option', async ({ memberPage }) => {
  await memberPage.goto('/users');
  await expect(memberPage.getByRole('button', { name: 'Delete' })).toHaveCount(0);
});
\`\`\`

## Database fixtures

Set up isolated test data per test or per worker.

\`\`\`typescript
type Fixtures = {
  testUser: { id: string; email: string };
};

export const test = base.extend<Fixtures>({
  testUser: async ({}, use, workerInfo) => {
    const user = await db.createUser({
      email: \`user-\${workerInfo.workerIndex}-\${Date.now()}@example.com\`,
    });
    await use(user);
    await db.deleteUser(user.id);
  },
});
\`\`\`

\`workerInfo\` gives you a per-worker index, useful for partitioning data so concurrent workers do not collide.

## Reusing fixtures across files

Define fixtures in one file and import everywhere.

\`\`\`typescript
// fixtures/index.ts
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { CheckoutPage } from '../pages/CheckoutPage';

type Fixtures = {
  checkout: CheckoutPage;
};

export const test = base.extend<Fixtures>({
  checkout: async ({ page }, use) => {
    const checkout = new CheckoutPage(page);
    await use(checkout);
  },
});

export { expect };
\`\`\`

\`\`\`typescript
// tests/checkout.spec.ts
import { test, expect } from '../fixtures';

test('user completes checkout', async ({ checkout }) => {
  await checkout.fillContact('Asha', 'asha@example.com');
  await checkout.placeOrder();
  await expect(checkout.orderConfirmed).toBeVisible();
});
\`\`\`

## Composing multiple extend calls

You can extend an extended test to layer fixtures from different modules.

\`\`\`typescript
import { test as authTest } from './auth-fixtures';
import { test as dbTest } from './db-fixtures';
// Note: in real code, merge the types yourself or pick one base
\`\`\`

The mergeTests utility in \`@playwright/test\` 1.40+ handles this cleanly:

\`\`\`typescript
import { mergeTests } from '@playwright/test';
import { test as authTest } from './auth-fixtures';
import { test as dbTest } from './db-fixtures';

export const test = mergeTests(authTest, dbTest);
\`\`\`

## Timeouts on fixtures

By default a fixture inherits the test's timeout. Override for slow setups.

\`\`\`typescript
export const test = base.extend({
  slowResource: [
    async ({}, use) => {
      const resource = await spinUp();
      await use(resource);
      await resource.close();
    },
    { timeout: 60_000 },
  ],
});
\`\`\`

## Fixture failures and \`testInfo\`

Fixtures receive \`TestInfo\` if declared as the third parameter. Use it to attach files or read configuration.

\`\`\`typescript
export const test = base.extend({
  capturedScreenshot: async ({ page }, use, testInfo) => {
    await use();
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('screenshot', {
        body: await page.screenshot(),
        contentType: 'image/png',
      });
    }
  },
});
\`\`\`

The attached file shows up in the HTML report.

## Common pitfalls

**Pitfall 1: Forgetting \`await use()\`.** A fixture must call \`use()\` to hand off to the test. Without it, the test never runs.

**Pitfall 2: Sharing mutable state without scoping.** A test-scoped fixture that mutates a worker-scoped resource needs explicit cleanup, or tests see each other's leftovers.

**Pitfall 3: Heavy fixtures at test scope.** A 2-second-to-spin-up resource at test scope multiplies cost by N tests. Promote to worker scope.

**Pitfall 4: Circular fixtures.** Two fixtures that depend on each other never resolve. Inline one or split the responsibility.

**Pitfall 5: Importing the wrong test.** When you build \`test.extend\`, you must re-export and import the new \`test\`. Tests that import the original \`@playwright/test\` do not see your fixtures.

## Anti-patterns

- Putting test data in fixtures and asserting on it from many tests. Tests should declare their own data unless the fixture is genuinely shared.
- Mixing setup and assertions in a fixture. Fixtures provide; tests assert.
- Reaching into \`process.env\` from inside a fixture without an option fallback. Make fixtures testable in isolation.
- Stateful worker-scoped fixtures without idempotent cleanup. A test that fails mid-fixture leaves state behind.

## Fixture lifecycle diagram

| Phase | What runs |
|---|---|
| Worker startup | Worker-scoped fixtures' setup, in dependency order |
| Test discovery | None |
| For each test | Test-scoped fixtures' setup, then test body |
| After test | Test-scoped fixtures' teardown (reverse order) |
| Worker shutdown | Worker-scoped fixtures' teardown |

Failures in setup propagate as test failures with the fixture's stack trace; failures in teardown propagate as separate errors in the report.

## Conclusion and next steps

Fixtures are the secret to Playwright suites that scale. Default to test scope, promote to worker when cost demands, lean on options for project-level variation, and treat each fixture as a single-purpose unit.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate fixtures that respect these patterns. For broader test config, read the [Playwright Test Config Options Complete Reference](/blog/playwright-test-config-options-complete-reference). For sharing context state, see [Playwright Browser Contexts Isolation Guide](/blog/playwright-browser-contexts-isolation-guide).
`,
};
