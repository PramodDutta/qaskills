import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Multi-Page & Popup Handling: Complete 2026 Guide',
  description: 'Master Playwright multi-page tests, popups, OAuth flows, and new tabs in 2026. waitForEvent, context.pages, and reliable patterns for inter-tab logic.',
  date: '2026-05-12',
  category: 'Guide',
  content: `
# Playwright Multi-Page and Popup Handling: Complete 2026 Guide

Real web apps spawn extra tabs. A "View full report" link opens a print view. A "Sign in with Google" button opens an OAuth popup. A chat widget opens a new window for video calls. Playwright handles all of them with a uniform model: every new tab is a Page within the same browser context, and you can listen for its creation, navigate it, assert on it, and close it as a peer of the original page.

This guide covers every multi-page pattern you will encounter: target="_blank" links, window.open popups, OAuth flows, embedded iframes that escape into new tabs, and the timing tricks that make these flows reliable. Examples are TypeScript with Playwright 1.49+.

For broader Playwright fundamentals, see the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). Install the [playwright-e2e skill](/skills/playwright-e2e) for AI-generated tests that handle multi-page scenarios correctly.

## The basic pattern

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('clicking external link opens new tab', async ({ context, page }) => {
  await page.goto('https://qaskills.sh');

  const pagePromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'View on GitHub' }).click();
  const newPage = await pagePromise;

  await newPage.waitForLoadState();
  await expect(newPage).toHaveURL(/github\\.com/);
});
\`\`\`

The sequence is critical: register the event listener \`before\` the action that triggers the new page. Otherwise the page event fires and is lost before \`waitForEvent\` starts listening.

## Listing all open pages

\`\`\`typescript
const pages = context.pages();
expect(pages.length).toBe(2);

for (const p of pages) {
  console.log(await p.title());
}
\`\`\`

\`context.pages()\` returns a snapshot at the time of the call. The first entry is usually the original page.

## OAuth flows

A common pattern: clicking "Sign in with Google" opens a popup, the user completes auth, and the popup closes itself, returning control to the original page.

\`\`\`typescript
test('OAuth sign in', async ({ page, context }) => {
  await page.goto('https://qaskills.sh/login');

  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();

  // The popup is a real page; interact normally
  await popup.getByLabel('Email').fill(process.env.GOOGLE_USER!);
  await popup.getByRole('button', { name: 'Next' }).click();
  await popup.getByLabel('Password').fill(process.env.GOOGLE_PASSWORD!);
  await popup.getByRole('button', { name: 'Sign in' }).click();

  // Wait for popup to close itself
  await popup.waitForEvent('close');

  // Back on the original page
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});
\`\`\`

For production OAuth tests, prefer mocking the callback rather than actually logging into Google. See [Playwright Network Mocking Route Handler Guide](/blog/playwright-network-mocking-route-handler-guide).

## target="_blank" links

For links that open in a new tab via \`target="_blank"\`:

\`\`\`typescript
test('blog link opens in new tab', async ({ context, page }) => {
  await page.goto('/');

  const newPagePromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Read the blog' }).click();
  const newPage = await newPagePromise;

  await expect(newPage).toHaveURL(/\\/blog/);
});
\`\`\`

If you want the link to open in the same tab for testing purposes, strip the \`target\` attribute via init script:

\`\`\`typescript
await page.addInitScript(() => {
  document.querySelectorAll('a[target="_blank"]').forEach((a) => a.removeAttribute('target'));
});
\`\`\`

This is useful for printing tests that do not need the popup semantics.

## window.open from JavaScript

\`\`\`typescript
test('window.open spawns a tab', async ({ context, page }) => {
  await page.goto('/');

  const popupPromise = context.waitForEvent('page');
  await page.evaluate(() => window.open('/help', '_blank'));
  const popup = await popupPromise;

  await expect(popup).toHaveURL(/\\/help/);
});
\`\`\`

The popup is a full Page; you can run any standard Playwright action against it.

## Closing the popup explicitly

\`\`\`typescript
await popup.close();
\`\`\`

\`close()\` fires the page close event on the context, which other listeners can observe.

## Filtering by URL or title

When multiple popups may exist, filter:

\`\`\`typescript
const pagePromise = context.waitForEvent('page', {
  predicate: (p) => p.url().includes('/payment'),
});
await page.getByRole('button', { name: 'Pay' }).click();
const paymentPage = await pagePromise;
\`\`\`

\`predicate\` is called for every new page; the first matching one resolves the promise.

## Switching focus between tabs

\`\`\`typescript
await firstPage.bringToFront();
// or
await secondPage.bringToFront();
\`\`\`

The browser focuses the named tab. Useful when popup content depends on having focus.

## Inter-tab communication

Tabs in the same context share the same domain's storage if same-origin. Asserting on cross-tab effects:

\`\`\`typescript
test('localStorage updates from tab A reach tab B', async ({ context, page }) => {
  const tabA = page;
  const tabB = await context.newPage();
  await tabA.goto('/');
  await tabB.goto('/');

  await tabA.evaluate(() => localStorage.setItem('theme', 'dark'));
  await tabB.reload();
  const theme = await tabB.evaluate(() => localStorage.getItem('theme'));
  expect(theme).toBe('dark');
});
\`\`\`

For BroadcastChannel or storage events between tabs, the events fire automatically inside Playwright as in a real browser.

## Print-preview style popups

Some apps open a popup to a static print page. The pattern is identical, but the new page often has no interactive elements.

\`\`\`typescript
test('print view renders the invoice', async ({ context, page }) => {
  await page.goto('/invoices/1');

  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Print' }).click();
  const popup = await popupPromise;

  await expect(popup.getByText('Invoice #1')).toBeVisible();
});
\`\`\`

For actually generating a PDF, use \`page.pdf()\` instead of relying on the print popup.

## Modals vs popups

A modal is a DOM element on the same page; a popup is a separate Page. Tests for modals do not use \`waitForEvent('page')\`.

\`\`\`typescript
// Modal
await page.getByRole('button', { name: 'Confirm delete' }).click();
await expect(page.getByRole('dialog')).toBeVisible();

// Popup
const popupPromise = context.waitForEvent('page');
await page.getByRole('link', { name: 'Open in new window' }).click();
const popup = await popupPromise;
\`\`\`

## Handling dialogs (alert, confirm, prompt)

Native dialogs are not popups. They are JavaScript alerts handled with \`page.on('dialog')\`.

\`\`\`typescript
test('confirms before delete', async ({ page }) => {
  await page.goto('/users');

  page.on('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm');
    expect(dialog.message()).toContain('Are you sure?');
    await dialog.accept();
  });

  await page.getByRole('button', { name: 'Delete user' }).click();
  await expect(page.getByText('User deleted')).toBeVisible();
});
\`\`\`

For \`prompt()\` dialogs:

\`\`\`typescript
page.on('dialog', async (dialog) => {
  if (dialog.type() === 'prompt') {
    await dialog.accept('My answer');
  } else {
    await dialog.accept();
  }
});
\`\`\`

## Common pitfalls

**Pitfall 1: Registering \`waitForEvent\` after the trigger.** The event fires before the listener registers. Always register before clicking.

**Pitfall 2: Forgetting \`await popup.waitForLoadState()\`.** A popup just opened may not have its DOM ready yet. Wait for load before interacting.

**Pitfall 3: Real OAuth in CI.** Google detects automation and blocks login. Mock the callback or use test accounts with reduced security.

**Pitfall 4: Multiple popups in flight.** If two popups open in quick succession, the second one may resolve the wrong promise. Use \`predicate\` to filter.

**Pitfall 5: Closed popups still referenced.** Calling actions on a closed Page throws. Check \`isClosed()\` or wrap in try/catch.

## Anti-patterns

- Skipping the listener and polling \`context.pages()\` until length increases. Race-prone.
- Trying to "navigate" the popup directly via the parent. Use \`popup.goto()\` if you need to redirect.
- Using setTimeout to wait for popup load. Use \`waitForLoadState\`.
- Ignoring popup close events. Always assert that the popup closes when expected.

## A complete inter-tab pattern

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('SSO across tabs', async ({ context, page }) => {
  // Open tab A and click SSO
  await page.goto('https://app.qaskills.sh');
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('button', { name: 'Sign in with SSO' }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState();

  // Complete SSO in popup
  await popup.getByLabel('Email').fill('user@example.com');
  await popup.getByRole('button', { name: 'Continue' }).click();
  await popup.waitForEvent('close');

  // Verify tab A picks up the session
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Open tab B and verify it inherits SSO via context cookies
  const tabB = await context.newPage();
  await tabB.goto('https://app.qaskills.sh');
  await expect(tabB.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
\`\`\`

## Conclusion and next steps

Multi-page tests are routine in Playwright thanks to the unified Page model. Listen for new pages before triggering them, wait for load state, scope assertions to the correct page, and your OAuth, print, and multi-tab flows become rock-solid.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate multi-page tests that follow these patterns. For browser context details, see [Playwright Browser Contexts Isolation Guide](/blog/playwright-browser-contexts-isolation-guide). For OAuth specifically, [Playwright Network Mocking Route Handler Guide](/blog/playwright-network-mocking-route-handler-guide).
`,
};
