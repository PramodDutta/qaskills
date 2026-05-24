import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Browser Contexts & Isolation: Complete 2026 Guide',
  description: 'Master Playwright browser contexts in 2026: per-test isolation, storage state, cookies, permissions, multiple users, and performance tradeoffs.',
  date: '2026-05-12',
  category: 'Guide',
  content: `
# Playwright Browser Contexts and Isolation: Complete 2026 Guide

A browser context is Playwright's unit of isolation. Each context has its own cookies, localStorage, sessionStorage, IndexedDB, cache, and service workers. Two contexts running in the same browser process behave as if they were two incognito windows: they cannot see each other's auth, settings, or data. The default Playwright test fixture creates a fresh context per test, which is the cheapest form of test isolation in any browser test framework.

This guide is a complete reference for browser contexts in Playwright 1.49+. We will cover the default fixture model, explicit context creation, storage state, multi-user patterns, permissions, geolocation, and the performance tradeoffs of context creation.

For the bigger picture, the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide) covers fundamentals. The [playwright-e2e skill](/skills/playwright-e2e) ensures AI assistants generate context-correct tests.

## Context vs page vs browser

| Concept | Scope |
|---|---|
| Browser | A single process (Chromium, Firefox, WebKit) |
| Context | An isolated session within a browser, with its own cookies and storage |
| Page | A tab within a context |

A browser can have many contexts; a context can have many pages. The default test fixture creates one context with one page per test.

## The default fixture

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('starts fresh every test', async ({ page, context }) => {
  await page.goto('/');
  expect((await context.cookies()).length).toBe(0);
});
\`\`\`

Each \`test\` callback gets a freshly minted context with no cookies, no storage, no service workers. The previous test cannot leak state.

## Creating contexts manually

For tests that need multiple sessions:

\`\`\`typescript
test('two users see each other in chat', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = await aliceContext.newPage();
  const bobPage = await bobContext.newPage();

  await alicePage.goto('/chat');
  await bobPage.goto('/chat');

  await alicePage.getByLabel('Message').fill('Hello Bob');
  await alicePage.getByRole('button', { name: 'Send' }).click();
  await expect(bobPage.getByText('Hello Bob')).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});
\`\`\`

Always \`close()\` contexts you create manually; they otherwise leak.

## Storage state

The fastest auth pattern: log in once, save the context's storage to disk, then load it in every test.

\`\`\`typescript
// auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate as user', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
\`\`\`

\`\`\`typescript
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
  {
    name: 'authenticated',
    use: { storageState: 'playwright/.auth/user.json' },
    dependencies: ['setup'],
  },
],
\`\`\`

Every test in the \`authenticated\` project starts with the cookies and localStorage written by the setup. Login runs once; tests run pre-authenticated.

## Multi-role auth

For tests that need different user types:

\`\`\`typescript
// auth.setup.ts
setup('admin user', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
});

setup('member user', async ({ page }) => {
  await loginAs(page, 'member');
  await page.context().storageState({ path: 'playwright/.auth/member.json' });
});
\`\`\`

Per-role fixtures:

\`\`\`typescript
type Fixtures = { adminPage: Page; memberPage: Page };

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
test('admin can delete a user', async ({ adminPage }) => {
  await adminPage.goto('/users');
  await adminPage.getByRole('button', { name: 'Delete' }).first().click();
});
\`\`\`

## Cookies API

For programmatic cookie control:

\`\`\`typescript
await context.addCookies([
  {
    name: 'session_id',
    value: 'abc123',
    domain: 'qaskills.sh',
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
  },
]);

const cookies = await context.cookies();
await context.clearCookies();
\`\`\`

\`addCookies\` is faster than logging in for tests that only need the session token.

## Context options

| Option | Purpose |
|---|---|
| \`viewport\` | Initial viewport size |
| \`deviceScaleFactor\` | DPI ratio |
| \`isMobile\` | Set mobile device flag |
| \`hasTouch\` | Enable touch events |
| \`userAgent\` | Override User-Agent header |
| \`locale\` | Set the locale |
| \`timezoneId\` | Set the timezone |
| \`geolocation\` | Set initial location |
| \`permissions\` | Grant browser permissions |
| \`colorScheme\` | Light or dark mode |
| \`reducedMotion\` | Reduce animations |
| \`storageState\` | Initial storage |
| \`baseURL\` | Base URL for navigation |
| \`extraHTTPHeaders\` | Add headers to every request |
| \`httpCredentials\` | Basic auth credentials |
| \`ignoreHTTPSErrors\` | Bypass TLS errors (testing) |
| \`proxy\` | HTTP proxy |
| \`recordVideo\` | Video recording config |
| \`recordHar\` | HAR recording config |
| \`serviceWorkers\` | 'allow' or 'block' |

Most are set in \`playwright.config.ts\` under \`use\`. They apply to the default fixture context.

## Permissions

\`\`\`typescript
test.use({
  permissions: ['geolocation', 'clipboard-read'],
  geolocation: { latitude: 19.076, longitude: 72.8777 },
});
\`\`\`

Or imperatively:

\`\`\`typescript
test('grants permission mid-test', async ({ context, page }) => {
  await context.grantPermissions(['notifications']);
  // ...
  await context.clearPermissions();
});
\`\`\`

See [Playwright Emulation Geolocation Permissions Guide](/blog/playwright-emulation-geolocation-permissions-guide).

## Sharing contexts: the cost

Creating a new context costs roughly 100-200ms (Chromium). For long suites with hundreds of tests, that adds up. Alternatives:

1. \`storageState\` re-used across tests (default pattern; cheap).
2. Worker-scoped browser, fresh context per test (also default; cheap).
3. Worker-scoped context with manual cleanup between tests (uncommon; risky).

Option 3 is rarely worth it. The default per-test context is fast enough for almost every suite.

## Persistent contexts

For end-to-end tests that need a real persistent profile (cookies, extensions, etc.), use \`launchPersistentContext\`.

\`\`\`typescript
import { chromium } from '@playwright/test';

const context = await chromium.launchPersistentContext('./user-data', {
  viewport: { width: 1280, height: 720 },
  headless: false,
});

const page = await context.newPage();
await page.goto('/');
\`\`\`

Persistent contexts share the same disk profile across runs. Useful for tests that need browser extensions or pre-installed certificates.

## HTTP credentials

For sites behind HTTP Basic auth:

\`\`\`typescript
test.use({
  httpCredentials: {
    username: 'staging',
    password: process.env.STAGING_PASSWORD!,
  },
});
\`\`\`

The credentials are sent on every navigation.

## extraHTTPHeaders

For test bypass tokens or feature flags:

\`\`\`typescript
test.use({
  extraHTTPHeaders: {
    'x-test-mode': 'integration',
    'x-feature-flag': 'new-checkout',
  },
});
\`\`\`

Headers apply to every request the context makes.

## Recording HAR per context

\`\`\`typescript
const context = await browser.newContext({
  recordHar: { path: 'session.har', mode: 'minimal' },
});
const page = await context.newPage();
await page.goto('/');
await context.close(); // writes session.har
\`\`\`

The HAR file captures every request and response, useful for offline replay (see [Playwright Network Mocking Route Handler Guide](/blog/playwright-network-mocking-route-handler-guide)).

## Common pitfalls

**Pitfall 1: Not closing manual contexts.** Leaked contexts hold open browser resources and slow subsequent tests.

**Pitfall 2: Sharing storageState across roles.** \`playwright/.auth/user.json\` overwritten by both admin and member setups races. Use distinct paths per role.

**Pitfall 3: Stale storage state.** If your app cycles tokens (e.g., 24-hour expiry), the storage state expires too. Re-run the setup project on a schedule.

**Pitfall 4: Forgetting to close pages.** Pages within a context do not auto-close until the context closes. For tests that open many pages, explicitly close each.

**Pitfall 5: Cookies set before navigation.** \`addCookies\` requires the domain to match. If the cookie's domain is set incorrectly, the browser ignores it.

## Anti-patterns

- Logging in within every test. Use storage state.
- Sharing one context across all tests. Loses isolation; race conditions multiply.
- Manually clearing cookies between tests. The default per-test context handles it.
- Mixing manual context creation with the default fixture. Pick one and stick to it.

## A complete multi-user pattern

\`\`\`typescript
import { test as base, expect } from '@playwright/test';
import { Page } from '@playwright/test';

type Fixtures = {
  adminPage: Page;
  customerPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
  customerPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({ storageState: 'playwright/.auth/customer.json' });
    const page = await ctx.newPage();
    await use(page);
    await ctx.close();
  },
});

export { expect };

test('admin invites customer', async ({ adminPage, customerPage }) => {
  await adminPage.goto('/team');
  await adminPage.getByRole('button', { name: 'Invite' }).click();
  await adminPage.getByLabel('Email').fill('customer@example.com');
  await adminPage.getByRole('button', { name: 'Send invite' }).click();

  await customerPage.goto('/inbox');
  await expect(customerPage.getByText('You have been invited')).toBeVisible();
});
\`\`\`

## Conclusion and next steps

Contexts are Playwright's superpower for isolation. Use the default per-test context for ninety-five percent of tests, storage state for auth, manual contexts for multi-user scenarios, and persistent contexts only when you genuinely need a stable profile.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate context-correct tests. For auth specifically, [Playwright Fixtures Complete Reference](/blog/playwright-fixtures-complete-reference-2026). For permissions and emulation, [Playwright Emulation Geolocation Permissions Guide](/blog/playwright-emulation-geolocation-permissions-guide).
`,
};
