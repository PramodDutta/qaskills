import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Multiple Tabs & Windows: Complete Guide 2026',
  description:
    'Handle multiple tabs, popups, and browser windows in Playwright TypeScript. Learn context.newPage(), waitForEvent("page"), tab switching, and OAuth flows.',
  date: '2026-06-04',
  category: 'Reference',
  content: `
# Playwright Multiple Tabs & Windows: Complete Guide 2026

Modern web applications rarely live in a single tab. A user clicks "View invoice" and a PDF opens in a new tab. They click "Sign in with Google" and an OAuth popup appears. They Ctrl-click a product link to compare items side by side. If your Playwright tests cannot follow the browser as it spawns new pages, you are testing only half of the real user journey. This guide is a complete, practical reference for handling **multiple tabs and windows in Playwright** with TypeScript and the official \`@playwright/test\` runner.

The mental model that makes everything click: in Playwright there is no separate concept of a "tab" versus a "window." Both are represented by a \`Page\` object. A \`BrowserContext\` is an isolated browser session (think of it as one incognito profile) that can own many pages. When a link with \`target="_blank"\` opens, or \`window.open()\` fires, the existing context emits a \`'page'\` event and a brand-new \`Page\` is born inside that same context. Because it shares the context, the new page also shares cookies, localStorage, and the authentication state of its opener. That single fact is what makes multi-tab OAuth flows possible, and it is the thread running through every example below.

Over the next sections you will learn how to create pages manually with \`context.newPage()\`, capture popups triggered by clicks using \`page.waitForEvent('page')\` and \`context.waitForEvent('page')\`, enumerate every open tab with \`context.pages()\`, switch focus between tabs, bring a background tab forward, close tabs cleanly, and wire all of it into a realistic Google/GitHub-style OAuth login. We finish with a troubleshooting table, performance notes, and a frequently-asked-questions block covering the exact errors people hit in production suites. If you want a broader foundation first, the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and the [Playwright best practices for 2026](/blog/playwright-best-practices-2026) pair well with this reference.

## Tabs vs Windows vs Contexts: The Core Model

Before writing a line of code, internalize the hierarchy. A \`Browser\` is a single launched Chromium, Firefox, or WebKit instance. Inside it you create one or more \`BrowserContext\` objects. Inside each context you create one or more \`Page\` objects. Tabs and OS-level windows are both just pages from Playwright's perspective — the windowing is a presentation detail the operating system handles, not something the automation API distinguishes.

| Concept | Playwright type | Isolation | Shares cookies/auth? | Created by |
|---|---|---|---|---|
| Browser | \`Browser\` | Full process | No | \`chromium.launch()\` |
| Context | \`BrowserContext\` | Cookies, storage, cache | No (between contexts) | \`browser.newContext()\` |
| Tab | \`Page\` | DOM only | Yes (within a context) | \`context.newPage()\`, \`target="_blank"\`, \`window.open()\` |
| Window | \`Page\` | DOM only | Yes (within a context) | \`window.open(url, name, 'popup')\` |

The practical consequence: if you want two tabs that **share a login**, put them in the same context. If you want two **independent users** (for example, testing a chat between Alice and Bob), give each their own context. The official Playwright fixture \`page\` already hands you one page inside one freshly isolated context per test, which is why test isolation works out of the box. To reach the context from a test, use \`page.context()\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('a page belongs to a context', async ({ page, context }) => {
  // The injected 'page' fixture lives inside the injected 'context' fixture
  expect(page.context()).toBe(context);

  // At the start, the context owns exactly one page
  expect(context.pages()).toHaveLength(1);
  expect(context.pages()[0]).toBe(page);
});
\`\`\`

## Creating Tabs Manually with context.newPage()

The simplest multi-tab scenario does not involve a click at all — you explicitly open a second tab in code. This is ideal when you want to drive two parts of an app in parallel and you control both URLs directly. \`context.newPage()\` returns a \`Promise<Page>\` that resolves once the blank page is ready to navigate.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('open a second tab manually in the same context', async ({ context }) => {
  const dashboard = await context.newPage();
  await dashboard.goto('https://example.com/dashboard');

  // Second tab shares cookies and storage with the first
  const settings = await context.newPage();
  await settings.goto('https://example.com/settings');

  // Both pages are live; assert on each independently
  await expect(dashboard).toHaveTitle(/Dashboard/);
  await expect(settings.getByRole('heading', { name: 'Settings' })).toBeVisible();

  // context.pages() now reports two tabs
  expect(context.pages()).toHaveLength(2);
});
\`\`\`

Because both pages share the context, an action on one is visible to the other after a reload. If you save a setting in the \`settings\` tab, reloading \`dashboard\` reflects it — exactly how a real browser behaves across tabs of the same profile. This is the foundation for tests that verify cross-tab synchronization, such as a logout in one tab invalidating the session in another.

When you genuinely need isolated sessions instead, create separate contexts. A common pattern is a two-user real-time test:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('two isolated users via separate contexts', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alice = await aliceContext.newPage();
  const bob = await bobContext.newPage();

  await alice.goto('https://chat.example.com');
  await bob.goto('https://chat.example.com');

  // Alice and Bob have entirely separate cookies — log each in independently
  // ... login steps for each ...

  await alice.getByPlaceholder('Message').fill('Hello Bob');
  await alice.getByRole('button', { name: 'Send' }).click();

  await expect(bob.getByText('Hello Bob')).toBeVisible();

  await aliceContext.close();
  await bobContext.close();
});
\`\`\`

## Capturing Popups: page.waitForEvent('page')

The most common real-world case is a tab you did **not** open in code — the app opened it for you in response to a click. Here the golden rule is: **start waiting for the new page before you trigger the action that opens it.** If you click first and then start listening, you can miss the \`'page'\` event entirely because it already fired. The idiomatic way to express "do these two things concurrently and resolve both" is \`Promise.all\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('capture a popup opened by a click', async ({ page, context }) => {
  await page.goto('https://example.com');

  const [popup] = await Promise.all([
    // 1. Arm the listener FIRST
    context.waitForEvent('page'),
    // 2. Then perform the action that opens the new tab
    page.getByRole('link', { name: 'Open report' }).click(),
  ]);

  // 3. Wait for the popup to finish loading before asserting
  await popup.waitForLoadState();
  await expect(popup).toHaveURL(/\\/report/);
  await expect(popup.getByRole('heading', { name: 'Quarterly Report' })).toBeVisible();
});
\`\`\`

There are two events you can listen to, and choosing correctly matters. \`page.waitForEvent('popup')\` resolves only for pages opened **by that specific page** (a true popup whose \`opener\` is your page). \`context.waitForEvent('page')\` resolves for **any** new page in the context regardless of which page opened it. Use the page-level \`'popup'\` event when you know exactly which page triggers the popup; use the context-level \`'page'\` event when the trigger might be indirect or you simply want the next page that appears.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('page-level popup event is more specific', async ({ page }) => {
  await page.goto('https://example.com/invoices');

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Print invoice' }).click();
  const popup = await popupPromise;

  await popup.waitForLoadState('domcontentloaded');
  await expect(popup).toHaveTitle(/Invoice/);
  await popup.close();
});
\`\`\`

Notice the alternative style above: instead of \`Promise.all\`, you can assign the promise to a variable, perform the click, then \`await\` the variable. Both are correct and both satisfy the "arm before act" rule because the promise is created before the click. Use whichever reads more clearly in your suite. The variable style is often easier to follow when several assertions precede the await.

### waitForEvent options and predicates

\`waitForEvent\` accepts a second argument that can be a **predicate function** or an options object. The predicate lets you ignore pages you do not care about — useful when a click opens several tabs (ad trackers, analytics) and you only want the one matching a URL.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('filter the right popup with a predicate', async ({ context, page }) => {
  await page.goto('https://example.com');

  const [reportTab] = await Promise.all([
    context.waitForEvent('page', {
      // Only resolve for the page whose URL contains /report
      predicate: (p) => p.url().includes('/report'),
      timeout: 15_000,
    }),
    page.getByRole('link', { name: 'Open everything' }).click(),
  ]);

  await reportTab.waitForLoadState();
  await expect(reportTab).toHaveURL(/\\/report/);
});
\`\`\`

| \`waitForEvent\` parameter | Type | Default | Purpose |
|---|---|---|---|
| \`event\` | \`string\` | required | Event name: \`'page'\`, \`'popup'\`, \`'request'\`, \`'response'\`, \`'close'\` |
| \`optionsOrPredicate\` | \`function\` or \`object\` | none | A predicate \`(arg) => boolean\`, or an options object |
| \`options.predicate\` | \`(arg) => boolean\` | none | Resolve only when predicate returns true |
| \`options.timeout\` | \`number\` (ms) | \`30000\` | Max wait before throwing; \`0\` disables the timeout |

## Listing and Switching Between Open Tabs

Once several tabs are open, you need to enumerate them and pick the one you want. \`context.pages()\` returns a synchronous array of every live \`Page\` in creation order. There is no "active tab" pointer in Playwright — every page is independently scriptable at all times, so "switching tabs" simply means calling methods on a different \`Page\` reference rather than issuing a focus command.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('enumerate and act on a specific tab', async ({ page, context }) => {
  await page.goto('https://example.com');

  // Open two extra tabs via clicks
  await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Docs' }).click()]);
  await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: 'Blog' }).click()]);

  const pages = context.pages();
  expect(pages).toHaveLength(3);

  // Find a tab by URL rather than relying on index order
  const blogTab = pages.find((p) => p.url().includes('/blog'));
  expect(blogTab).toBeDefined();

  await blogTab!.bringToFront();
  await expect(blogTab!.getByRole('heading', { name: 'Blog' })).toBeVisible();
});
\`\`\`

Relying on array index (\`pages[1]\`) is fragile because tabs can open in nondeterministic order, especially when the app fires several at once. Prefer \`find()\` with a URL or title check. If you must wait for a tab to reach a known URL before grabbing it, combine the \`'page'\` event with \`waitForURL\`:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('wait for a new tab to reach a specific URL', async ({ context, page }) => {
  await page.goto('https://example.com');

  const newPagePromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Checkout' }).click();
  const checkout = await newPagePromise;

  // Block until the checkout tab navigates to the payment page
  await checkout.waitForURL('**/payment**', { timeout: 20_000 });
  await expect(checkout.getByRole('heading', { name: 'Payment' })).toBeVisible();
});
\`\`\`

### bringToFront() and why focus rarely matters

\`page.bringToFront()\` activates a tab visually, which matters for the rare app that pauses work in backgrounded tabs (using the Page Visibility API or \`requestAnimationFrame\` throttling). In most tests you never need it — Playwright interacts with backgrounded pages perfectly well because it does not require a tab to be foreground to read the DOM, click, or fill. Reach for \`bringToFront()\` only when you have a genuine visibility-dependent behavior to exercise, such as a video that pauses when its tab is hidden.

## Closing Tabs Cleanly

Leaked pages slow a suite down and can leave dangling network activity. Close popups you are done with using \`page.close()\`. After closing, that \`Page\` is no longer usable and \`context.pages()\` no longer lists it. You can also listen for the \`'close'\` event to react when a page closes on its own (for example, an OAuth popup that closes itself after redirecting).

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('close a popup and confirm it is gone', async ({ page, context }) => {
  await page.goto('https://example.com');

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Help' }).click();
  const help = await popupPromise;

  await help.waitForLoadState();
  await expect(help).toHaveTitle(/Help/);

  // Tidy up: close the popup, original page keeps working
  await help.close();
  expect(context.pages()).not.toContain(help);

  // The opener page is still fully interactive
  await expect(page.getByRole('button', { name: 'Help' })).toBeVisible();
});
\`\`\`

When you create your own contexts (not the fixture-provided one), close them in test teardown or a \`finally\` block so that no browser session lingers between tests. The built-in \`context\` fixture is closed automatically by the test runner, so you only manage contexts you created yourself.

## Multi-Tab OAuth Login Flows

The capstone scenario is "Sign in with Google/GitHub." The flow is: your app opens a popup pointed at the identity provider, the user authenticates there, the provider redirects back, the popup closes (or posts a message), and the original tab becomes logged in. Because the popup lives in the **same context** as your app, the session cookie set during the redirect is automatically available to your main page — this is the whole reason the shared-context model exists.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('OAuth login through a popup window', async ({ page, context }) => {
  await page.goto('https://app.example.com/login');

  // 1. Clicking the SSO button opens the identity provider in a popup
  const [oauthPopup] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Sign in with Google' }).click(),
  ]);

  // 2. Drive the provider's login form inside the popup
  await oauthPopup.waitForLoadState();
  await oauthPopup.getByLabel('Email').fill(process.env.OAUTH_EMAIL!);
  await oauthPopup.getByRole('button', { name: 'Next' }).click();
  await oauthPopup.getByLabel('Password').fill(process.env.OAUTH_PASSWORD!);
  await oauthPopup.getByRole('button', { name: 'Sign in' }).click();

  // 3. The popup usually closes itself after redirecting back
  await oauthPopup.waitForEvent('close');

  // 4. The original page now reflects the authenticated session
  await expect(page.getByRole('button', { name: 'Account' })).toBeVisible();
  await expect(page).toHaveURL(/\\/dashboard/);
});
\`\`\`

In CI you rarely want to type real Google credentials on every run — it is slow, brittle, and trips bot detection. The robust approach is to perform this popup login **once** in a setup project, then persist the resulting cookies with \`context.storageState()\` and reuse them in every other test. That technique is covered in depth in the [Playwright storageState authentication reference](/blog/playwright-storagestate-authentication-reference), and it pairs naturally with the multi-tab knowledge here: you authenticate via the popup a single time, save the state, and skip the popup forever after.

Some providers do not close the popup but instead use \`window.postMessage\` to hand a token back to the opener. In that case, listen for the message on the main page rather than waiting for \`'close'\`:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('OAuth that posts a message back instead of closing', async ({ page, context }) => {
  await page.goto('https://app.example.com/login');

  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Continue with GitHub' }).click(),
  ]);

  await popup.getByLabel('Username or email address').fill(process.env.GH_USER!);
  await popup.getByLabel('Password').fill(process.env.GH_PASS!);
  await popup.getByRole('button', { name: 'Sign in' }).click();
  await popup.getByRole('button', { name: 'Authorize' }).click();

  // App listens for postMessage and updates without the popup closing first
  await expect(page.getByText('Signed in as')).toBeVisible({ timeout: 20_000 });
});
\`\`\`

## Handling target="_blank" Links and window.open

Two HTML patterns spawn tabs. A link with \`target="_blank"\` opens its \`href\` in a new tab when clicked. A script calling \`window.open(url)\` does the same programmatically. Both surface to Playwright as a \`'page'\` event, so the capture code is identical. The only nuance: a \`target="_blank"\` link can be Ctrl/Cmd-clicked to force a new tab even if it normally navigates in place. You can reproduce that modifier click explicitly.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('force new tab with a modifier click', async ({ page, context }) => {
  await page.goto('https://example.com');

  const [newTab] = await Promise.all([
    context.waitForEvent('page'),
    // Cmd-click on macOS, Control-click elsewhere opens in a new tab
    page.getByRole('link', { name: 'Product' }).click({
      modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'],
    }),
  ]);

  await newTab.waitForLoadState();
  await expect(newTab).toHaveURL(/\\/product/);
});
\`\`\`

If you would rather **not** open a new tab at all — for example you want to assert that an \`href\` is correct without leaving the current page — read the attribute directly instead of clicking:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('verify a link target without opening it', async ({ page }) => {
  await page.goto('https://example.com');
  const link = page.getByRole('link', { name: 'Terms' });
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('href', '/legal/terms');
});
\`\`\`

## Common Errors and How to Fix Them

These are the failures teams hit most often when working with multiple tabs. Keep this table handy when a multi-tab test goes red.

| Symptom | Likely cause | Fix |
|---|---|---|
| \`waitForEvent('page')\` times out | Listener armed after the click; event already fired | Create the wait promise BEFORE the click (use \`Promise.all\`) |
| Assertions on popup fail intermittently | Acting before the popup finished loading | \`await popup.waitForLoadState()\` or \`waitForURL\` first |
| Wrong tab selected | Relying on \`pages()[index]\` ordering | Select with \`pages().find(p => p.url().includes(...))\` |
| \`page.click: Target page... has been closed\` | Using a popup after \`close()\` or after it self-closed | Re-query the right page; do not reuse a closed \`Page\` |
| OAuth popup login not reflected in main tab | Popup created in a different context | Capture via the same context so cookies are shared |
| Test is slow logging in via popup every run | Re-authenticating each test | Persist \`storageState()\` once and reuse it |

## Performance and Isolation Tips

Each context carries its own cache and storage, so spinning up many contexts is heavier than spinning up many pages within one context. When tabs should share a session, prefer extra **pages**; reserve extra **contexts** for genuinely separate users. Close popups and self-created contexts promptly to release memory and stop background network chatter that can leak into the next test. For broader suite-level performance — parallelism, sharding, and worker counts — see the [Playwright vs Puppeteer bundle size and performance comparison](/blog/playwright-vs-puppeteer-bundle-size-2026), which digs into runtime cost. To browse ready-made, install-ready testing skills for your AI coding agent, head to the [QA Skills directory](/skills).

A final reliability tip: avoid \`page.waitForTimeout()\` (a hard sleep) anywhere in multi-tab code. Hard sleeps are the number-one source of flaky popup tests because the time a new tab takes to load varies wildly across machines and CI. Always wait on a concrete signal — a load state, a URL, or a visible element — instead. Playwright's web-first assertions like \`expect(popup).toHaveURL(...)\` retry automatically until the condition holds or the timeout elapses, which is exactly the resilient behavior you want when a second tab is still settling.

## Frequently Asked Questions

### How do I switch between tabs in Playwright?

There is no explicit "switch" command because every \`Page\` is scriptable at all times. To act on a different tab, call methods on that tab's \`Page\` reference. Get the reference from \`context.pages()\` (filter by URL with \`find()\`) or from the \`'page'\`/\`'popup'\` event when it opened. Use \`page.bringToFront()\` only when the app changes behavior for backgrounded tabs.

### Why does waitForEvent('page') time out even though a tab opened?

Almost always because you started listening after clicking. The \`'page'\` event fires the instant the tab opens, so if your \`waitForEvent\` call runs afterward it has already missed it. Create the wait promise before the click — either with \`Promise.all([context.waitForEvent('page'), click()])\` or by assigning the promise to a variable, then clicking, then awaiting the variable.

### What is the difference between page.waitForEvent('popup') and context.waitForEvent('page')?

\`page.waitForEvent('popup')\` resolves only for pages opened by that specific page (its opener is your page). \`context.waitForEvent('page')\` resolves for any new page in the context no matter which page opened it. Use the page-level event when you know the exact trigger; use the context-level event for indirect triggers or when you just want the next page that appears.

### Do tabs opened by clicks share login and cookies?

Yes, as long as they open in the same \`BrowserContext\`. A tab from \`target="_blank"\`, \`window.open()\`, or \`context.newPage()\` inherits that context's cookies, localStorage, and session. That shared state is what makes OAuth popups work: the session cookie set during the redirect is immediately visible to the original page. Separate contexts do not share anything.

### How do I close a specific tab in Playwright?

Call \`await somePage.close()\` on the \`Page\` you want to close. After closing, that page is no longer usable and disappears from \`context.pages()\`. The opener page keeps working normally. For pages that close themselves (like OAuth popups after redirect), wait on \`page.waitForEvent('close')\` to know when it happened.

### How can I handle a "Sign in with Google" popup in Playwright?

Capture the popup with \`context.waitForEvent('page')\` armed before clicking the SSO button, drive the provider's login form inside the popup page, then wait for the popup to close or for your main page to show a logged-in state. Because the popup shares the context, the resulting session cookie is available to your app automatically. For CI, do this once and reuse \`storageState()\` afterward.

### Can I run two different users in parallel tabs?

Yes — but give each user a separate \`BrowserContext\` so their cookies and sessions stay isolated. Use \`browser.newContext()\` twice, create a page in each, and drive them independently. This is the standard pattern for testing real-time features like chat or collaborative editing where Alice and Bob must be logged in as distinct accounts.

### Should I use bringToFront() in every multi-tab test?

No. Playwright reads the DOM, clicks, and fills on backgrounded tabs without any focus change, so \`bringToFront()\` is unnecessary in the vast majority of tests. Use it only when the application genuinely behaves differently while a tab is hidden — for example a video or animation that pauses via the Page Visibility API.

## Conclusion

Multiple tabs and windows stop being intimidating once you hold the core model in your head: a context owns many pages, tabs and windows are both just pages, and same-context pages share authentication. From there the entire API is small — \`context.newPage()\` to open one yourself, \`waitForEvent('page')\` or \`waitForEvent('popup')\` to catch one the app opens, \`context.pages()\` to enumerate them, method calls on a chosen \`Page\` to "switch," and \`page.close()\` to clean up. Always arm your listener before the action, always wait for a real load signal before asserting, and never sprinkle hard sleeps into popup code.

Put these patterns to work in your own suite, and when you want your AI coding agent to write multi-tab tests that follow these conventions automatically, install a ready-made Playwright skill from the [QA Skills directory](/skills). Keep exploring with the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and the rest of the [QA Skills blog](/blog) for deeper dives into locators, fixtures, network mocking, and CI.
`,
};
