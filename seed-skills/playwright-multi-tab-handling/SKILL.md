---
name: Playwright Multi-Tab & Window Handling
description: Teaches the agent to handle popups, new tabs, and multiple browser windows in Playwright using waitForEvent('page'), context pages, and reliable tab switching for OAuth and target=_blank links.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [playwright, multi-tab, popup, new-window, oauth, browser-context, target-blank, automation]
testingTypes: [e2e, integration]
frameworks: [playwright]
languages: [typescript]
domains: [web]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Playwright Multi-Tab & Window Handling

This skill makes the agent write correct, race-free code for any flow that opens a second tab or popup: `target="_blank"` links, "Open in new window" buttons, OAuth/SSO consent screens, payment redirects, and PDF preview tabs. The central rule is that a new page is an **event** you must subscribe to *before* the click, never a thing you poll for afterward.

Use this skill whenever a test clicks something and a new tab/window appears, or whenever the agent sees `page.waitForTimeout` being used to "wait for the popup."

## Core Principles

1. **Subscribe before you click.** Register `context.waitForEvent('page')` (or `page.waitForEvent('popup')`) *before* the action that triggers the popup, then `await` both together. Subscribing after the click is a race.
2. **A tab belongs to a `BrowserContext`, not a `Page`.** All tabs in one context share cookies/storage. `context.pages()` is the live list of open tabs.
3. **Always `await newPage.waitForLoadState()`** before asserting — the page object resolves the moment the tab exists, not when it has loaded.
4. **Switch by holding a reference, never by index.** Index order is not guaranteed across browsers. Capture the returned `Page` object.
5. **Close popups you opened.** Leaked tabs slow the suite and can hold modal focus. Close them or rely on context teardown.
6. **Cross-origin popups are fine within a context.** OAuth on a different domain still arrives as a `page` event; you do not need a new context.

## Workflow / Patterns

### Pattern 1 — Capture a popup from a `target="_blank"` link

The canonical, race-free shape uses `Promise.all`: start listening, then click, in one expression.

```typescript
import { test, expect } from '@playwright/test';

test('opens docs in a new tab', async ({ context, page }) => {
  await page.goto('https://example.com/app');

  // Subscribe BEFORE the click, await both together.
  const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: 'Open docs' }).click(),
  ]);

  // The page object exists, but the tab may still be loading.
  await newPage.waitForLoadState('domcontentloaded');

  await expect(newPage).toHaveURL(/\/docs/);
  await expect(newPage.getByRole('heading', { name: 'Documentation' })).toBeVisible();

  await newPage.close();
  // Original tab is still fully usable.
  await expect(page.getByRole('button', { name: 'Back to app' })).toBeVisible();
});
```

### Pattern 2 — `page.waitForEvent('popup')` for window.open

When the element calls `window.open()`, the `popup` event on the *opener page* is the most precise listener — it ties the new page to the exact opener.

```typescript
test('handles a window.open popup', async ({ page }) => {
  await page.goto('https://example.com/share');

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Share to LinkedIn' }).click();
  const popup = await popupPromise;

  await popup.waitForLoadState();
  await expect(popup).toHaveURL(/linkedin\.com/);
  await popup.close();
});
```

### Pattern 3 — Multi-tab OAuth / SSO consent flow

The provider page opens in a popup, you authenticate there, the popup closes itself, and the original tab becomes authenticated. Wait for the popup to *close* before asserting on the main page.

```typescript
test('logs in via Google OAuth popup', async ({ page }) => {
  await page.goto('https://example.com/login');

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  const oauth = await popupPromise;

  // Drive the provider's consent screen inside the popup.
  await oauth.waitForLoadState('domcontentloaded');
  await oauth.getByLabel('Email').fill(process.env.OAUTH_EMAIL!);
  await oauth.getByRole('button', { name: 'Next' }).click();
  await oauth.getByLabel('Password').fill(process.env.OAUTH_PASSWORD!);
  await oauth.getByRole('button', { name: 'Sign in' }).click();
  await oauth.getByRole('button', { name: 'Allow' }).click();

  // The provider closes its own window; wait for that, then assert on main page.
  await oauth.waitForEvent('close');
  await expect(page.getByText('Signed in as')).toBeVisible({ timeout: 15_000 });
});
```

### Pattern 4 — Several tabs open at once, switch deterministically

Hold each `Page` in a variable. Never rely on `context.pages()[1]` order.

```typescript
test('manages three tabs by reference', async ({ context, page }) => {
  await page.goto('https://example.com/reports');

  const [reportA] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: 'Report A' }).click(),
  ]);
  const [reportB] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: 'Report B' }).click(),
  ]);

  await reportA.waitForLoadState();
  await reportB.waitForLoadState();

  // Bring a specific tab to the foreground (affects screenshots / focus).
  await reportB.bringToFront();
  await expect(reportB.getByRole('heading')).toHaveText('Report B');

  await reportA.bringToFront();
  await expect(reportA.getByRole('heading')).toHaveText('Report A');

  // context.pages() === [page, reportA, reportB] — but assert by reference, not index.
  expect(context.pages()).toHaveLength(3);
});
```

### Pattern 5 — Reusable helper to capture and load a new tab

Wrap the race-free dance once so tests stay readable.

```typescript
import { type BrowserContext, type Page } from '@playwright/test';

/** Runs `action`, returns the newly opened, fully-loaded tab. */
export async function openInNewTab(
  context: BrowserContext,
  action: () => Promise<void>,
  loadState: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded',
): Promise<Page> {
  const [newPage] = await Promise.all([context.waitForEvent('page'), action()]);
  await newPage.waitForLoadState(loadState);
  return newPage;
}

// Usage:
test('uses the helper', async ({ context, page }) => {
  await page.goto('https://example.com');
  const invoice = await openInNewTab(context, () =>
    page.getByRole('link', { name: 'View invoice' }).click(),
  );
  await expect(invoice).toHaveTitle(/Invoice/);
  await invoice.close();
});
```

### Pattern 6 — Force same-tab navigation when you do NOT want a popup

Sometimes a `target="_blank"` link makes assertions harder than they need to be. Strip the attribute before clicking so navigation stays in one page.

```typescript
test('forces same-tab navigation', async ({ page }) => {
  await page.goto('https://example.com');
  const link = page.getByRole('link', { name: 'Terms' });
  await link.evaluate((el) => el.removeAttribute('target'));
  await link.click();
  await expect(page).toHaveURL(/\/terms/);
});
```

## Best Practices

1. **Use `Promise.all([waitForEvent, click])`** as the default shape — it makes the subscribe-before-click ordering structurally impossible to get wrong.
2. **Prefer `page.waitForEvent('popup')`** over `context.waitForEvent('page')` when one specific element triggers the new window — it scopes the wait to the right opener.
3. **Always `waitForLoadState`** on the new page before any locator or URL assertion.
4. **Type your helpers** (`Page`, `BrowserContext`) so downstream tests get autocomplete and the popup is never `any`.
5. **For OAuth, wait on `popup.waitForEvent('close')`** as the signal that auth finished, then assert on the main page.
6. **Set a generous `timeout` on the post-popup assertion** (OAuth redirects are slow); 15s is reasonable.
7. **Reuse `storageState`** for repeated logins instead of driving the OAuth popup in every test — drive it once in global setup, save state, reuse it.

## Anti-Patterns

1. **Clicking, then calling `context.waitForEvent('page')`.** The event may already have fired; you will hang until timeout. Subscribe first.
2. **`await page.waitForTimeout(3000)` to "let the tab open."** Flaky and slow. Use the event.
3. **Selecting the tab via `context.pages()[1]`.** Tab order is not portable across Chromium/Firefox/WebKit. Hold the returned reference.
4. **Asserting on a new page before `waitForLoadState`.** The page object exists immediately; its content does not.
5. **Spawning a fresh `browser.newContext()` for an OAuth popup.** A popup in the same context shares the session you need; a new context throws away cookies.
6. **Leaving popups open** across many tests — memory grows and focus-stealing modals cause unrelated failures.
7. **Driving the main page while the popup is mid-auth.** Finish the popup flow (or wait for its `close`) first.

## When to Trigger This Skill

- "Clicking this link opens a new tab and my test can't find the element"
- "How do I handle a popup / `window.open` in Playwright?"
- "Test the Google / GitHub / SSO OAuth login flow"
- "A `target=_blank` link breaks my assertions"
- "I have multiple tabs open and need to switch between them"
- "Handle the payment redirect that opens in a new window"
- "My popup test is flaky / times out waiting for the new page"
