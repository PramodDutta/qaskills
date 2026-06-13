import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright BrowserContext + Incognito Sessions Reference',
  description:
    'Complete reference for Playwright BrowserContext and incognito sessions: browser.newContext, isolation, storage, cookies, permissions, geolocation, parallel multi-user tests in 2026.',
  date: '2026-06-07',
  category: 'Reference',
  content: `
# Playwright BrowserContext + Incognito Sessions Reference

A \`BrowserContext\` in Playwright is the equivalent of an incognito session in Chrome: a completely isolated browsing environment with its own cookies, localStorage, sessionStorage, IndexedDB, cache, permissions, and history. Two contexts running in the same browser process share nothing - they cannot see each other's state, cannot share authentication, and act as if they were different browsers. This is what makes multi-user testing in Playwright so much faster than Selenium: instead of launching multiple browser binaries (one per user), you create multiple contexts in one browser and run them in parallel.

This guide is the complete reference for \`BrowserContext\` in 2026. We cover \`browser.newContext\` options, isolation guarantees, the storage state pattern for skipping login, multi-user tests, permissions, geolocation, color scheme, locale, viewport, user-agent, and the relationship between context and the test fixture system. Every example is runnable Playwright TypeScript.

For the storage state pattern in detail, see [Playwright APIRequestContext + storageState](/blog/playwright-apirequestcontext-storage-state-guide). For browser fundamentals, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026). The [playwright-e2e skill](/skills/playwright-e2e) configures contexts correctly for AI-generated tests.

## What a BrowserContext provides

Every Playwright test runs in a browser context by default. The \`page\` fixture is shorthand for "the default context's default page". Behind the scenes, \`page = context.newPage()\`. The context is what holds:

| Resource | Per-context | Shared with other contexts? |
|---|---|---|
| Cookies | Yes | No |
| localStorage | Yes | No |
| sessionStorage | Yes | No |
| IndexedDB | Yes | No |
| Cache (HTTP, service worker) | Yes | No |
| Permissions | Yes | No |
| Geolocation | Yes | No |
| Viewport | Yes | No |
| User-agent | Yes | No |
| Color scheme | Yes | No |
| Locale | Yes | No |
| Timezone | Yes | No |
| Browser process | Shared | Yes (faster than separate browsers) |

This is the same isolation a real incognito window provides, achieved at zero cost (no new browser process needed).

## Creating a context

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('two isolated contexts', async ({ browser }) => {
  const userA = await browser.newContext();
  const userB = await browser.newContext();

  const pageA = await userA.newPage();
  const pageB = await userB.newPage();

  await pageA.goto('/');
  await pageB.goto('/');

  // Set a cookie in context A
  await userA.addCookies([{ name: 'theme', value: 'dark', url: '/' }]);

  // Context B cannot see the cookie
  expect((await userB.cookies()).length).toBe(0);

  await userA.close();
  await userB.close();
});
\`\`\`

The \`browser\` fixture is the shared browser process. Each context is independent within that process.

## newContext options

\`browser.newContext(options)\` accepts a wide range of options to configure the context:

| Option | Type | Example |
|---|---|---|
| \`storageState\` | string or object | Reuse cookies/localStorage from a file |
| \`viewport\` | { width, height } | \`{ width: 1920, height: 1080 }\` |
| \`userAgent\` | string | \`'MyTestBot/1.0'\` |
| \`locale\` | string | \`'fr-FR'\` |
| \`timezoneId\` | string | \`'Asia/Tokyo'\` |
| \`geolocation\` | { latitude, longitude } | NYC: \`{ latitude: 40.7, longitude: -74.0 }\` |
| \`permissions\` | string[] | \`['geolocation', 'notifications']\` |
| \`colorScheme\` | 'light' \\| 'dark' \\| 'no-preference' | \`'dark'\` |
| \`reducedMotion\` | 'reduce' \\| 'no-preference' | \`'reduce'\` |
| \`forcedColors\` | 'active' \\| 'none' | \`'active'\` |
| \`isMobile\` | boolean | \`true\` for touch + meta viewport |
| \`hasTouch\` | boolean | \`true\` |
| \`deviceScaleFactor\` | number | \`2\` for retina |
| \`extraHTTPHeaders\` | Record\\<string, string\\> | \`{ 'X-Test': 'true' }\` |
| \`offline\` | boolean | \`true\` to simulate offline |
| \`httpCredentials\` | { username, password } | HTTP basic auth |
| \`ignoreHTTPSErrors\` | boolean | \`true\` for self-signed certs |
| \`baseURL\` | string | \`'https://staging.example.com'\` |
| \`acceptDownloads\` | boolean | Default \`true\` |
| \`recordVideo\` | { dir, size } | Record video of context |
| \`recordHar\` | { path, mode } | Record HAR file |
| \`bypassCSP\` | boolean | Disable Content Security Policy |
| \`proxy\` | { server, username, password } | Per-context proxy |

A typical authenticated context:

\`\`\`typescript
const context = await browser.newContext({
  storageState: 'auth/admin.json',
  viewport: { width: 1280, height: 720 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
  permissions: ['geolocation', 'clipboard-read'],
  geolocation: { latitude: 40.7128, longitude: -74.0060 },
});
\`\`\`

## storageState: skip login

\`storageState\` is the most useful option. It lets you reuse cookies and localStorage from a previous session, effectively starting the context already logged in.

Create the state once (typically in a global setup or auth project):

\`\`\`typescript
import { test as setup } from '@playwright/test';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'auth/admin.json' });
});
\`\`\`

Then reuse it in any context:

\`\`\`typescript
const context = await browser.newContext({ storageState: 'auth/admin.json' });
const page = await context.newPage();
await page.goto('/admin');
// Already logged in
\`\`\`

This is the foundation of Playwright's authentication best practice. See [Playwright APIRequestContext + storageState](/blog/playwright-apirequestcontext-storage-state-guide) for the full workflow including API token reuse.

## Multi-user parallel tests

Two contexts, one browser, two simultaneous users:

\`\`\`typescript
test('two users chat in parallel', async ({ browser }) => {
  const alice = await browser.newContext({ storageState: 'auth/alice.json' });
  const bob = await browser.newContext({ storageState: 'auth/bob.json' });

  const alicePage = await alice.newPage();
  const bobPage = await bob.newPage();

  await alicePage.goto('/chat');
  await bobPage.goto('/chat');

  // Alice sends a message
  await alicePage.getByPlaceholder('Type a message').fill('Hi Bob');
  await alicePage.getByRole('button', { name: 'Send' }).click();

  // Bob receives it in real time
  await expect(bobPage.getByText('Hi Bob')).toBeVisible();

  // Bob replies
  await bobPage.getByPlaceholder('Type a message').fill('Hello Alice');
  await bobPage.getByRole('button', { name: 'Send' }).click();

  // Alice sees Bob's reply
  await expect(alicePage.getByText('Hello Alice')).toBeVisible();
});
\`\`\`

This is the canonical pattern for testing chat, presence, real-time collaboration, multiplayer games, and anything else that requires two users at once. It runs in one browser process, so it is fast and resource-efficient.

## Permissions

The \`permissions\` option pre-grants permissions so the browser does not prompt:

\`\`\`typescript
const context = await browser.newContext({
  permissions: ['geolocation', 'notifications', 'clipboard-read', 'clipboard-write'],
});
\`\`\`

Valid permissions:

| Permission | What it allows |
|---|---|
| \`geolocation\` | navigator.geolocation API |
| \`notifications\` | Notification API |
| \`microphone\` | navigator.mediaDevices.getUserMedia({ audio }) |
| \`camera\` | navigator.mediaDevices.getUserMedia({ video }) |
| \`clipboard-read\` | navigator.clipboard.readText |
| \`clipboard-write\` | navigator.clipboard.writeText |
| \`midi\` | navigator.requestMIDIAccess |
| \`background-sync\` | Background sync |
| \`accelerometer\`, \`gyroscope\`, \`magnetometer\` | Device sensors |
| \`ambient-light-sensor\` | Light sensor |

You can also grant or clear permissions at runtime:

\`\`\`typescript
await context.grantPermissions(['notifications'], { origin: 'https://app.example.com' });
await context.clearPermissions();
\`\`\`

## Geolocation

To test location-based features:

\`\`\`typescript
const context = await browser.newContext({
  geolocation: { latitude: 40.7128, longitude: -74.0060 }, // New York
  permissions: ['geolocation'],
});
\`\`\`

Or set at runtime:

\`\`\`typescript
await context.setGeolocation({ latitude: 35.6762, longitude: 139.6503 }); // Tokyo
\`\`\`

The application's \`navigator.geolocation.getCurrentPosition\` returns the configured coordinates.

## Color scheme, locale, timezone

These three options together control the rendering environment:

\`\`\`typescript
const darkFrench = await browser.newContext({
  colorScheme: 'dark',
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
});

const lightEnglish = await browser.newContext({
  colorScheme: 'light',
  locale: 'en-US',
  timezoneId: 'America/New_York',
});
\`\`\`

You can test both scenarios in the same test file with separate contexts. They run in parallel.

## Viewport and device emulation

For mobile testing without launching a separate browser:

\`\`\`typescript
import { devices } from '@playwright/test';

const iphone = await browser.newContext({ ...devices['iPhone 14 Pro'] });
const ipad = await browser.newContext({ ...devices['iPad Pro'] });
const desktop = await browser.newContext({ ...devices['Desktop Chrome'] });
\`\`\`

The devices catalog includes 100+ presets. You can also customize:

\`\`\`typescript
const custom = await browser.newContext({
  viewport: { width: 411, height: 731 },
  userAgent: 'CustomMobile/1.0',
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
\`\`\`

## HTTP credentials and proxy

For staging environments behind basic auth:

\`\`\`typescript
const context = await browser.newContext({
  httpCredentials: { username: 'preview', password: 'preview-pwd' },
});
\`\`\`

Per-context proxy:

\`\`\`typescript
const context = await browser.newContext({
  proxy: {
    server: 'http://proxy.example.com:8080',
    username: 'proxy-user',
    password: 'proxy-pass',
  },
});
\`\`\`

The proxy applies only to this context, not the entire browser.

## Recording video per context

\`\`\`typescript
const context = await browser.newContext({
  recordVideo: {
    dir: 'videos/',
    size: { width: 1280, height: 720 },
  },
});

const page = await context.newPage();
await page.goto('/');
// ... interactions ...
await context.close(); // Video file is finalized
\`\`\`

Each context records its own video. Closing the context flushes the file. Test fixtures (the default \`page\`) record per-test based on the \`video\` config option.

## Recording HAR files

\`\`\`typescript
const context = await browser.newContext({
  recordHar: {
    path: 'output.har',
    mode: 'full', // 'full' includes bodies; 'minimal' only metadata
  },
});

const page = await context.newPage();
await page.goto('/');
await context.close(); // HAR is written on close
\`\`\`

HAR files capture every network request and response for the lifetime of the context. Useful for replaying or analyzing in tools like Chrome DevTools.

## Test fixtures and contexts

Playwright's test runner creates one context per test by default. You can opt into different scopes:

\`\`\`typescript
// One context per test (default)
test('individual context', async ({ page }) => {
  // page belongs to a fresh context
});

// Share context across tests in a describe block
test.describe.configure({ mode: 'serial' });
test.describe('shared context', () => {
  let sharedContext;
  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext({ storageState: 'auth/admin.json' });
  });
  test.afterAll(async () => {
    await sharedContext.close();
  });
  test('uses shared', async () => {
    const page = await sharedContext.newPage();
    await page.goto('/');
  });
});
\`\`\`

For most tests, the default per-test context is the right choice. Share only when initialization is expensive.

## Context isolation guarantees

Two contexts cannot share:

- Cookies (set in context A is invisible to context B)
- localStorage / sessionStorage / IndexedDB
- HTTP cache
- Service worker registrations
- Authentication state
- Permissions
- Configured geolocation, locale, timezone

They do share:

- The browser binary (same Chromium process)
- The display server (same machine)
- DNS cache (OS-level)

For DNS-level isolation, run different OS users or containers. For everything web-app-level, separate contexts are enough.

## When to use multiple browsers vs multiple contexts

| Need | Multiple browsers | Multiple contexts |
|---|---|---|
| Cross-browser testing (Chromium, Firefox, WebKit) | Yes | No |
| Multi-user same browser | No | Yes |
| Different viewports | No | Yes |
| Different locales | No | Yes |
| OS-level isolation | Yes | No |
| Speed | Slow (extra process) | Fast (no extra process) |

Use multiple browsers (one per project) for cross-engine coverage. Use multiple contexts (within a test) for multi-user or multi-environment scenarios.

## Closing contexts

\`await context.close()\` cleans up:

- All pages in the context.
- All videos and HAR files (flushed to disk).
- All service workers (terminated).

The browser stays running. To close everything, close the browser:

\`\`\`typescript
await browser.close();
\`\`\`

In tests, the fixture system handles this for you. Manual close is needed only when you create contexts explicitly.

## Real-world patterns: chat, collaboration, marketplaces

### Two-sided chat app

\`\`\`typescript
test('customer and support chat', async ({ browser }) => {
  const customer = await browser.newContext({ storageState: 'auth/customer.json' });
  const support = await browser.newContext({ storageState: 'auth/support-agent.json' });

  const customerPage = await customer.newPage();
  const supportPage = await support.newPage();

  await customerPage.goto('/help');
  await supportPage.goto('/support/queue');

  // Customer starts a chat
  await customerPage.getByRole('button', { name: 'Start chat' }).click();
  await customerPage.getByPlaceholder('Type your question').fill('I need help with billing');
  await customerPage.getByRole('button', { name: 'Send' }).click();

  // Support sees the chat in their queue
  await expect(supportPage.getByRole('listitem').filter({ hasText: 'billing' })).toBeVisible();
  await supportPage.getByRole('listitem').filter({ hasText: 'billing' }).click();

  // Support replies
  await supportPage.getByPlaceholder('Reply').fill('Happy to help. What is your issue?');
  await supportPage.getByRole('button', { name: 'Send' }).click();

  // Customer sees the reply
  await expect(customerPage.getByText('Happy to help')).toBeVisible();
});
\`\`\`

### Collaborative editor

\`\`\`typescript
test('two users edit the same document', async ({ browser }) => {
  const alice = await browser.newContext({ storageState: 'auth/alice.json' });
  const bob = await browser.newContext({ storageState: 'auth/bob.json' });

  const alicePage = await alice.newPage();
  const bobPage = await bob.newPage();

  await alicePage.goto('/doc/shared-123');
  await bobPage.goto('/doc/shared-123');

  // Alice types
  await alicePage.locator('.editor').click();
  await alicePage.keyboard.type('Hello from Alice');

  // Bob sees the text in real time
  await expect(bobPage.locator('.editor')).toHaveText('Hello from Alice');

  // Bob appends
  await bobPage.locator('.editor').click();
  await bobPage.keyboard.press('End');
  await bobPage.keyboard.type(' - and Bob');

  // Alice sees the combined text
  await expect(alicePage.locator('.editor')).toHaveText('Hello from Alice - and Bob');
});
\`\`\`

### Marketplace buyer/seller

\`\`\`typescript
test('seller lists, buyer purchases', async ({ browser }) => {
  const seller = await browser.newContext({ storageState: 'auth/seller.json' });
  const buyer = await browser.newContext({ storageState: 'auth/buyer.json' });

  const sellerPage = await seller.newPage();
  await sellerPage.goto('/sell');
  await sellerPage.getByLabel('Title').fill('Test Product');
  await sellerPage.getByLabel('Price').fill('19.99');
  await sellerPage.getByRole('button', { name: 'Publish' }).click();

  const buyerPage = await buyer.newPage();
  await buyerPage.goto('/search?q=Test Product');
  await buyerPage.getByText('Test Product').click();
  await buyerPage.getByRole('button', { name: 'Buy now' }).click();

  await expect(buyerPage.getByText('Order confirmed')).toBeVisible();

  // Seller sees the order in their dashboard
  await sellerPage.goto('/sales');
  await expect(sellerPage.getByText('Test Product').and(sellerPage.getByText('Sold'))).toBeVisible();
});
\`\`\`

## Context options vs page options

A common confusion is when to set an option on the context vs the page. The rule:

- **Context options** apply to every page in the context: viewport, locale, timezone, color scheme, geolocation, permissions.
- **Page options** are runtime: \`page.setViewportSize\`, \`page.emulateMedia\`.

For most options, set on the context for consistency. If you need to change mid-test (rare), use the page-level API:

\`\`\`typescript
const context = await browser.newContext({ colorScheme: 'light' });
const page = await context.newPage();

// Mid-test, switch to dark
await page.emulateMedia({ colorScheme: 'dark' });
await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
\`\`\`

\`page.emulateMedia\` accepts \`{ colorScheme, reducedMotion, forcedColors, media }\`. This is one of the few cases where mid-test environment changes make sense.

## Context-level routes and clocks

Both \`page.route\` and \`page.clock\` have context-level equivalents:

\`\`\`typescript
// Network mock that applies to every page in the context
await context.route('**/api/**', (route) => route.fulfill({ json: {} }));

// Clock install that applies to every page in the context (added in newer versions)
// Use page.clock.install on each page for now
\`\`\`

The context-level route is the right choice for multi-page tests where every page needs the same network mock. The per-page route is the right choice when only one page in the context needs the mock.

## Frequently Asked Questions

### What is a BrowserContext in Playwright?

A \`BrowserContext\` is an isolated browsing environment within a single browser process, equivalent to an incognito window. It has its own cookies, localStorage, cache, permissions, and history. Multiple contexts in the same browser do not share state, which makes them ideal for multi-user testing and parallel scenarios.

### How is BrowserContext different from a new browser?

A new browser launches a separate process (slow, resource-intensive). A new context reuses the same browser process but provides full isolation. Two contexts cannot see each other's cookies or localStorage, but they share the browser binary and run faster than separate browsers.

### How do I share authentication across tests with BrowserContext?

Use \`storageState\`. Log in once in a setup test, call \`context.storageState({ path: 'auth.json' })\`, then create contexts with \`browser.newContext({ storageState: 'auth.json' })\`. The new context starts already logged in. This is the recommended Playwright authentication pattern.

### Can I run two users in parallel with one Playwright browser?

Yes. Create two contexts: \`const alice = await browser.newContext(); const bob = await browser.newContext();\`. Each context has its own cookies and storage. Use them in the same test to simulate multi-user scenarios like chat, presence, or shared editing.

### How do I set permissions like geolocation in a BrowserContext?

Pass \`permissions: ['geolocation']\` and \`geolocation: { latitude: 40.7, longitude: -74.0 }\` to \`browser.newContext\`. The application's \`navigator.geolocation.getCurrentPosition\` returns the configured coordinates without prompting the user.

### Does closing a BrowserContext close the browser?

No. \`context.close()\` releases the context's resources (pages, videos, HAR files) but keeps the browser process running for other contexts. To close everything, call \`browser.close()\`. Playwright's test fixtures handle browser lifecycle automatically.

### Can two contexts share localStorage?

No. localStorage is per-context. Setting \`localStorage\` in context A is invisible to context B even if they are in the same browser. This is one of the core isolation guarantees of \`BrowserContext\`.

### How do I record video for each BrowserContext?

Pass \`recordVideo: { dir: 'videos/' }\` to \`browser.newContext\`. Each context writes its video file when closed. For per-test video without manual setup, use the \`video\` config option in \`playwright.config.ts\`.

## Resource management

Each context holds resources: cookies, localStorage, IndexedDB, the navigation history. Closing a context releases them. For long-running test sessions, close contexts you no longer need:

\`\`\`typescript
test('many contexts', async ({ browser }) => {
  const contexts = await Promise.all(
    Array.from({ length: 10 }, () => browser.newContext())
  );

  // ... do work in each context ...

  // Close all when done
  await Promise.all(contexts.map((c) => c.close()));
});
\`\`\`

In Playwright's test runner, the default context is closed automatically. Manual contexts need explicit close (\`afterEach\` or \`afterAll\` hook).

## Browser process limits

A single Chromium process can host hundreds of contexts in principle, but in practice you start hitting memory limits around 20-50 simultaneous contexts depending on the application's per-page memory footprint. For massively parallel tests, prefer multiple workers (Playwright spawns separate browsers per worker) over many contexts per browser.

| Pattern | Use |
|---|---|
| 1 context per test, multiple workers | Default - fastest |
| Multiple contexts per test | Multi-user scenarios |
| Reused context across tests | Expensive setup, e.g., large data load |

## isContext fixture pattern

To inject a custom-configured context as a test fixture:

\`\`\`typescript
import { test as base } from '@playwright/test';

type MyFixtures = {
  adminContext: import('@playwright/test').BrowserContext;
};

export const test = base.extend\\<MyFixtures\\>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'auth/admin.json',
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });
    await use(context);
    await context.close();
  },
});

// Use in tests
test('admin scenario', async ({ adminContext }) => {
  const page = await adminContext.newPage();
  await page.goto('/admin');
  // ...
});
\`\`\`

Fixtures keep test code clean and ensure consistent context setup across the suite.

## Conclusion

\`BrowserContext\` is the Playwright primitive that makes multi-user, multi-environment, and incognito-style testing fast and reliable in 2026. Use \`storageState\` to skip login, multiple contexts for parallel users, and per-context options (locale, timezone, geolocation, viewport, color scheme) to test multiple environments in the same test file. The cost is near-zero - all contexts share one browser process.

For the authentication pattern that pairs with contexts, see [Playwright APIRequestContext + storageState](/blog/playwright-apirequestcontext-storage-state-guide). For network mocking that applies per-context, see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference).

Install the [playwright-e2e skill](/skills/playwright-e2e) so your AI agent (Claude Code, Cursor, Aider) emits the BrowserContext pattern by default. Compare context-based testing approaches in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026) and read the broader [Playwright Best Practices 2026](/blog/playwright-best-practices-2026) guide.
`,
};
