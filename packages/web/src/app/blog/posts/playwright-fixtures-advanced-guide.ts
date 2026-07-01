import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Fixtures: The Complete Advanced Guide (2026)',
  description:
    'Master Playwright fixtures with test.extend, custom fixtures, worker-scoped fixtures, auto fixtures, and fixture options. Runnable TypeScript examples for 2026.',
  date: '2026-07-01',
  category: 'Guide',
  content: `
# Playwright Fixtures: The Complete Advanced Guide

Playwright fixtures are the single most powerful feature for keeping large end-to-end suites clean, fast, and maintainable, yet most teams never move past the built-in \`page\` fixture. If your tests are riddled with copy-pasted \`beforeEach\` blocks, shared global state, and helper functions that quietly leak between specs, custom fixtures are the fix. A fixture is a named piece of setup-and-teardown that Playwright resolves lazily, injects into your test by parameter name, and tears down in the correct order automatically. Because fixtures are requested by name, Playwright only runs the setup a test actually needs, which keeps unrelated specs fast and isolated.

This guide is a deep, practical tour of the Playwright fixture system as it stands in 2026. We cover \`test.extend\`, test-scoped versus worker-scoped fixtures, automatic (auto) fixtures, overriding built-in fixtures, fixture options with \`test.use\`, typing everything with TypeScript, and the composition patterns that let a fixture depend on another fixture. Every code block is real, runnable TypeScript you can drop into a \`@playwright/test\` project. By the end you will understand not just the syntax but the execution model: when a fixture runs, how many times it runs, and how teardown interleaves with the rest of your test. If you are newer to the framework, start with our [Playwright tutorial](/blog/playwright-tutorial-beginners-2026) and the broader [Playwright guide](/blog/playwright-e2e-complete-guide), then come back here to level up. Let us get into it.

## What Is a Playwright Fixture?

A fixture is an object (or value, or function) that Playwright creates for a test, hands to the test body, and then disposes of afterwards. Playwright ships with several built-in fixtures: \`page\`, \`context\`, \`browser\`, \`browserName\`, and \`request\`. You have already used them:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('homepage has a title', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page).toHaveTitle(/Playwright/);
});
\`\`\`

Here \`page\` is a fixture. Playwright sees you destructured \`{ page }\`, so it creates a fresh browser page, runs your test, then closes the page. The key insight is that fixtures are pull-based: nothing is created unless a test requests it by name. This is different from \`beforeEach\`, which always runs regardless of whether the test needs its side effects.

## Creating Your First Custom Fixture with test.extend

Custom fixtures are defined by extending the base \`test\` object with \`test.extend\`. You pass an object where each key is a fixture name and each value is a function that receives dependencies and a \`use\` callback. Everything before \`await use(value)\` is setup; everything after is teardown.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

type MyFixtures = {
  greeting: string;
};

export const test = base.extend<MyFixtures>({
  greeting: async ({}, use) => {
    // setup
    const value = 'Hello from a fixture';
    await use(value);
    // teardown (runs after the test finishes)
  },
});

export { expect };
\`\`\`

Now any spec importing this \`test\` can request \`greeting\`:

\`\`\`typescript
import { test, expect } from './fixtures';

test('uses the greeting fixture', async ({ greeting }) => {
  expect(greeting).toBe('Hello from a fixture');
});
\`\`\`

The pattern is always the same: define fixtures in a shared file, export the extended \`test\`, and import it everywhere instead of \`@playwright/test\`.

## Page Object Fixtures: The Killer Use Case

The most valuable custom fixtures wrap Page Object Models so tests never instantiate them manually. Consider a login page object:

\`\`\`typescript
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.getByLabel('Username');
    this.password = page.getByLabel('Password');
    this.submit = page.getByRole('button', { name: 'Sign in' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(user: string, pass: string) {
    await this.username.fill(user);
    await this.password.fill(pass);
    await this.submit.click();
  }
}
\`\`\`

Expose it as a fixture so it is created per test with the current \`page\`:

\`\`\`typescript
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login-page';

type Pages = {
  loginPage: LoginPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },
});
\`\`\`

Your tests become declarative and free of boilerplate:

\`\`\`typescript
import { test, expect } from './fixtures';

test('valid credentials sign the user in', async ({ loginPage, page }) => {
  await loginPage.login('alice', 'correct-horse');
  await expect(page).toHaveURL(/dashboard/);
});
\`\`\`

Notice the fixture depends on the built-in \`page\` fixture simply by destructuring it. Fixture composition is that easy.

## Fixtures That Depend on Other Fixtures

Fixtures can build on each other. An \`authenticatedPage\` fixture can depend on a \`loginPage\` fixture, which depends on \`page\`. Playwright resolves the whole graph in dependency order.

\`\`\`typescript
import { test as base, expect, Page } from '@playwright/test';
import { LoginPage } from './pages/login-page';

type Fixtures = {
  loginPage: LoginPage;
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  authedPage: async ({ page, loginPage }, use) => {
    await loginPage.goto();
    await loginPage.login('alice', 'correct-horse');
    await expect(page).toHaveURL(/dashboard/);
    await use(page);
  },
});

export { expect };
\`\`\`

A test requesting only \`authedPage\` transparently triggers \`loginPage\` and \`page\` first. This composition keeps each fixture single-purpose and reusable.

## Worker-Scoped Fixtures for Expensive Setup

By default fixtures are test-scoped: created and destroyed for every test. When setup is expensive, for example spinning up a database, seeding a tenant, or logging into an admin API, you want it shared across all tests in a worker process. That is a worker-scoped fixture. Declare the scope with a tuple \`[fn, { scope: 'worker' }]\`.

\`\`\`typescript
import { test as base } from '@playwright/test';

type WorkerFixtures = {
  apiToken: string;
};

export const test = base.extend<{}, WorkerFixtures>({
  apiToken: [
    async ({}, use) => {
      // runs once per worker process
      const res = await fetch('https://api.example.com/auth', {
        method: 'POST',
        body: JSON.stringify({ key: process.env.API_KEY }),
      });
      const { token } = await res.json();
      await use(token);
      // teardown once per worker
    },
    { scope: 'worker' },
  ],
});
\`\`\`

The second generic parameter to \`extend\` holds worker-scoped fixture types; the first holds test-scoped ones. A worker-scoped fixture runs once per worker, no matter how many tests in that worker request it, which can slash suite runtime dramatically.

## Test Scope vs Worker Scope: Choosing Correctly

Choosing scope is a trade-off between isolation and speed. Test scope gives perfect isolation at the cost of repeated setup. Worker scope amortizes expensive setup across many tests but requires the fixture value to be safe to share. Use the table below as a decision aid.

| Concern | Test-scoped fixture | Worker-scoped fixture |
|---|---|---|
| Runs how often | Once per test | Once per worker process |
| Isolation | Full, fresh per test | Shared across tests in worker |
| Best for | Page objects, per-test data | DB pool, auth token, seeded tenant |
| Teardown timing | After each test | After all worker tests finish |
| Risk if mutated | None (recreated) | State leaks between tests |
| Config key | default | \`{ scope: 'worker' }\` |

A good rule: if two tests running back-to-back could corrupt each other by sharing the value, keep it test-scoped. If the value is read-only or safely reset, worker scope is a free performance win.

## Automatic (Auto) Fixtures

Sometimes you want a fixture to run for every test without each test having to request it by name, for example enabling console-error tracking, setting up tracing, or asserting no unhandled requests. Mark a fixture \`{ auto: true }\` and it activates automatically.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

type AutoFixtures = {
  failOnConsoleError: void;
};

export const test = base.extend<AutoFixtures>({
  failOnConsoleError: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      await use();
      expect(errors, \`console errors: \${errors.join(', ')}\`).toHaveLength(0);
    },
    { auto: true },
  ],
});

export { expect };
\`\`\`

Every test using this \`test\` now fails if the page logs a console error, and no test had to opt in. Auto fixtures can be either test-scoped or worker-scoped by combining \`auto\` with \`scope\`.

## Overriding Built-In Fixtures

You can redefine a built-in fixture to change its behavior globally. A common example is overriding \`page\` to always start at a base URL, or overriding \`context\` to grant permissions. The override receives the original fixture as a dependency.

\`\`\`typescript
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // grant geolocation before every test
    await page.context().grantPermissions(['geolocation']);
    await page.goto('/');
    await use(page);
  },
});
\`\`\`

Because your override destructures the built-in \`page\`, Playwright still creates the real page first, then your wrapper layers behavior on top. This is the cleanest way to apply cross-cutting setup without \`beforeEach\` sprawl.

## Fixture Options with test.use

Options are a special kind of fixture whose default value can be overridden per file, per describe block, or in \`playwright.config.ts\` via \`use\`. Declare an option by giving it a default in an options tuple \`[defaultValue, { option: true }]\`.

\`\`\`typescript
import { test as base } from '@playwright/test';

type Options = {
  locale: string;
};

export const test = base.extend<Options>({
  locale: ['en-US', { option: true }],
  // a fixture that consumes the option
  greeting: async ({ locale }, use) => {
    const map: Record<string, string> = {
      'en-US': 'Hello',
      'fr-FR': 'Bonjour',
    };
    await use(map[locale] ?? 'Hello');
  },
});
\`\`\`

Now a spec can switch the option without touching the fixture code:

\`\`\`typescript
import { test, expect } from './fixtures';

test.describe('French experience', () => {
  test.use({ locale: 'fr-FR' });

  test('greeting is localized', async ({ greeting }) => {
    expect(greeting).toBe('Bonjour');
  });
});
\`\`\`

You can also set the option project-wide in the config, which pairs perfectly with running the same suite across locales or environments. This is closely related to running the same tests across browsers, covered in our [cross browser testing](/blog/cross-browser-testing-guide) guide.

## Typing Fixtures Properly in TypeScript

Strong typing is what makes fixtures pleasant at scale. The \`extend\` generic signature is \`extend<TestFixtures, WorkerFixtures>\`. Keep two type aliases and merge fixtures from multiple files with a single \`mergeTests\`.

\`\`\`typescript
import { test as base, mergeTests } from '@playwright/test';
import { test as authTest } from './auth-fixtures';
import { test as dbTest } from './db-fixtures';

// Combine independently-defined fixture files into one test object
export const test = mergeTests(authTest, dbTest);

// Or extend the merged result further
type Extra = { requestId: string };
export const finalTest = test.extend<Extra>({
  requestId: async ({}, use) => {
    await use(crypto.randomUUID());
  },
});
\`\`\`

\`mergeTests\` composes fixtures from separate modules without inheritance chains, so large teams can own their fixtures independently. TypeScript infers all fixture parameter types in your test bodies, giving you autocomplete on every custom fixture.

## Fixture Timeouts, Boxing, and Ordering

Two lesser-known controls help in real suites. First, you can set a per-fixture timeout so a slow setup fails fast rather than eating the whole test timeout. Second, \`box: true\` hides a fixture from error traces so failures point at your test, not internal plumbing.

\`\`\`typescript
import { test as base } from '@playwright/test';

export const test = base.extend<{ slowSetup: void }>({
  slowSetup: [
    async ({}, use) => {
      await new Promise((r) => setTimeout(r, 500));
      await use();
    },
    { timeout: 5000, box: true },
  ],
});
\`\`\`

Ordering follows dependencies: setup runs in dependency order, and teardown runs in exact reverse. Worker fixtures always set up before test fixtures and tear down after them, guaranteeing that per-test resources are gone before shared ones close.

## Built-In vs Custom Fixtures Reference

For quick recall, this table maps the common fixtures you will work with and what each is for.

| Fixture | Source | Scope | Typical use |
|---|---|---|---|
| \`page\` | built-in | test | Single tab interactions |
| \`context\` | built-in | test | Cookies, permissions, storage state |
| \`browser\` | built-in | worker | Shared browser instance |
| \`request\` | built-in | test | API calls sharing browser context |
| \`loginPage\` | custom | test | Page object wrapper |
| \`apiToken\` | custom | worker | Expensive auth once per worker |
| \`failOnConsoleError\` | custom (auto) | test | Cross-cutting assertion |
| \`locale\` | custom (option) | n/a | Configurable per file or project |

Keeping this mental model, built-in versus custom, test versus worker, plain versus auto versus option, is what separates a fixture novice from someone who designs a maintainable suite. Explore ready-made [QA skills](/skills) to see these patterns packaged for AI coding agents.

## Storage State and Authentication Fixtures

The most common expensive setup in real suites is logging in. Doing it in every test is slow; doing it once and reusing the session is fast. Playwright's storage state, cookies plus local storage serialized to disk, combines beautifully with a worker-scoped fixture. First, authenticate once in a global setup and save the state, then override the \`context\` fixture to load it.

\`\`\`typescript
// auth.setup.ts - runs once as a setup project
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('alice');
  await page.getByLabel('Password').fill('correct-horse');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.context().storageState({ path: authFile });
});
\`\`\`

Then reuse the saved session by pointing \`storageState\` at the file, so every test starts authenticated without repeating the UI login:

\`\`\`typescript
import { test as base } from '@playwright/test';

export const test = base.extend({
  context: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    });
    await use(context);
    await context.close();
  },
});
\`\`\`

This pattern turns a two-second login into a near-instant cookie load for every test. For suites with multiple roles, save one state file per role and expose an option fixture to select which one a spec uses.

## Common Fixture Pitfalls and How to Avoid Them

Fixtures are powerful but a few mistakes recur. First, forgetting \`await use(value)\` means the fixture never yields control and the test hangs. Second, sharing mutable state through a worker-scoped fixture and then mutating it inside tests causes order-dependent flakiness, keep worker fixtures read-only or reset them. Third, doing heavy work in a test-scoped fixture that only some tests need; if only a few specs use it, that is fine, but if every test triggers it, consider worker scope. Fourth, importing from \`@playwright/test\` in a spec that should import your extended \`test\`, which silently drops all custom fixtures.

\`\`\`typescript
// WRONG: this spec gets none of your custom fixtures
import { test } from '@playwright/test';

// RIGHT: import the extended test so custom fixtures resolve
import { test, expect } from './fixtures';
\`\`\`

A final subtlety: teardown code after \`await use()\` always runs, even if the test fails, so it is the correct place to release resources. Do not put cleanup in the test body where a failed assertion would skip it. Treating the fixture as the owner of a resource's entire lifecycle is the mental shift that makes suites reliable. Package these conventions as reusable [QA skills](/skills) so your whole team applies them consistently.

## Frequently Asked Questions

### What is a fixture in Playwright?

A Playwright fixture is a named unit of setup and teardown that the framework creates on demand and injects into a test by parameter name. Built-in fixtures include \`page\`, \`context\`, and \`browser\`. Custom fixtures, defined with \`test.extend\`, let you share page objects, authentication, and data across specs while Playwright handles lazy creation and automatic cleanup in the correct order.

### How do I create a custom fixture in Playwright?

Use \`test.extend\` to create a new \`test\` object. Pass an object whose keys are fixture names and whose values are async functions receiving dependencies and a \`use\` callback. Code before \`await use(value)\` is setup and code after is teardown. Export the extended \`test\`, then import it in your specs instead of importing from \`@playwright/test\` directly.

### What is the difference between test-scoped and worker-scoped fixtures?

Test-scoped fixtures run once per test and are fully isolated, ideal for page objects and per-test data. Worker-scoped fixtures run once per worker process and are shared across all tests in that worker, ideal for expensive setup like database pools or auth tokens. Declare worker scope with \`[fn, { scope: 'worker' }]\` and put its type in the second generic of \`test.extend\`.

### What are auto fixtures in Playwright?

Auto fixtures run for every test automatically without the test requesting them by name. Mark a fixture with \`{ auto: true }\`. They are perfect for cross-cutting concerns like enabling tracing, tracking console errors, or asserting no failed network requests. Auto fixtures can be test-scoped or worker-scoped by combining the \`auto\` flag with a \`scope\` option in the fixture tuple.

### How do fixture options and test.use work together?

Declare an option fixture with a default value and \`{ option: true }\`. Any fixture can then consume that option by destructuring it. To change the value, call \`test.use({ optionName: value })\` in a spec or describe block, or set it in \`playwright.config.ts\`. This lets you run identical tests under different configurations such as locale, base URL, or feature flags without editing fixture code.

### Can a Playwright fixture depend on another fixture?

Yes. A fixture depends on another simply by destructuring it in its setup function, for example \`async ({ page, loginPage }, use) => {}\`. Playwright resolves the dependency graph automatically, running setup in dependency order and teardown in exact reverse. This composition lets you build small single-purpose fixtures and combine them, such as an \`authedPage\` fixture built on \`loginPage\` built on \`page\`.

### How do I combine fixtures from multiple files?

Use \`mergeTests\` from \`@playwright/test\`. Define fixtures in separate modules, each exporting its own extended \`test\`, then call \`mergeTests(testA, testB)\` to produce one \`test\` object exposing all fixtures. You can extend the merged result further with \`test.extend\`. This keeps ownership decentralized so different teams maintain their own fixtures without a single monolithic file.

## Conclusion

Fixtures turn Playwright from a browser-automation library into a disciplined test framework. Once you replace \`beforeEach\` sprawl with composable, correctly-scoped fixtures, your suite becomes faster, more isolated, and far easier to reason about. Start by wrapping your page objects, add worker-scoped fixtures for expensive setup, sprinkle in auto fixtures for cross-cutting checks, and expose configuration through options. The execution model, pull-based creation, dependency-ordered setup, reverse-ordered teardown, is what makes all of this safe.

Ready to go further? Explore curated [QA skills](/skills) for AI coding agents that ship these fixture patterns out of the box, and pair this guide with our [Playwright guide](/blog/playwright-e2e-complete-guide) for the full end-to-end picture. Browse the [skills directory](/skills) and start building a fixture library your whole team can rely on.
`,
};
