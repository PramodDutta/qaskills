import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Open a New Authenticated Tab in the Same Playwright Context",
  description:
    "Open authenticated Playwright tabs in one browser context, test popup flows without login duplication, and avoid storage-state and event-ordering mistakes.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Open a New Authenticated Tab in the Same Playwright Context

The login cookie belongs to the browser context, not to the \`Page\` object that completed the sign-in form. Create a second page with \`context.newPage()\`, and it sees the same context-scoped cookies immediately. Open a second browser context instead, and Playwright deliberately gives you a separate session.

That one ownership rule resolves most “new tab is logged out” failures. The remaining work is choosing the correct API for a tab the test creates versus a popup the application creates, waiting before the triggering click, and understanding which browser data is truly shared.

## Start from Playwright's storage boundary

A \`Browser\` is the running browser process. A \`BrowserContext\` is an isolated profile-like container inside it. A \`Page\` is a tab or popup inside one context. Pages in the same context share cookies and origin storage according to browser rules, while maintaining independent documents, histories, frames, and JavaScript heaps.

| State or capability | Shared by pages in one context? | Practical consequence |
|---|---|---|
| HTTP cookies | Yes | A session cookie set during login authenticates later tabs |
| localStorage | Yes, for the same origin | A new same-origin page can read existing keys after navigation |
| IndexedDB | Yes, for the same origin | Token databases and application caches are visible across tabs |
| sessionStorage | No, do not rely on sharing | It is scoped to a top-level browsing context and may be copied only in specific opener cases |
| Context routes and permissions | Yes | Network routing and granted permissions apply to every page in that context |
| DOM and JavaScript globals | No | Locators and in-page variables belong to their individual pages |
| Playwright timeout settings | Often fixture or page configured | Configure explicitly when multiple pages require identical behavior |

The word “authenticated” can hide several mechanisms. Cookie sessions are straightforward. Applications using localStorage tokens also work across same-origin pages in one context. Applications storing tokens only in sessionStorage require special analysis; a page created with \`context.newPage()\` should not be assumed to inherit it. If the product depends on opener-copy behavior, test the real link or \`window.open()\` path rather than manufacturing a tab.

For a deeper explanation of isolation and context lifetime, read the [Playwright browser contexts guide](/blog/playwright-browser-contexts-isolation-guide). Here the objective is intentional sharing within a single test.

## Create a tab directly after authentication

In Playwright Test, the built-in \`page\` fixture already belongs to a fresh context for the test. Obtain that context from \`page.context()\`, sign in, then create another page on it. There is no need to serialize storage state or copy cookies between the two pages.

\`\`\`typescript
// tests/account-tabs.spec.ts
import { test, expect } from '@playwright/test';

test('opens billing in another authenticated tab', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('owner@example.test');
  await page.getByLabel('Password').fill('correct-horse-battery-staple');
  await Promise.all([
    page.waitForURL('**/dashboard'),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);

  const context = page.context();
  const billingPage = await context.newPage();
  await billingPage.goto('/settings/billing');

  await expect(billingPage.getByRole('heading', { name: 'Billing' })).toBeVisible();
  await expect(billingPage).toHaveURL(/\\/settings\\/billing$/);

  await billingPage.getByRole('button', { name: 'Update payment method' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
\`\`\`

The second page is not a clone. It begins at \`about:blank\`, then navigation sends the shared cookie. If login sets its cookie during a redirect, wait for the authenticated landing page or a specific authenticated response before opening the second page. Creating it while sign-in is still in flight can race ahead of cookie persistence.

Closing the extra page is optional because the test context is disposed automatically, but explicit closure can make long scenarios and resource expectations clearer. Never close the shared context inside a test that uses the built-in \`page\` fixture unless you intend to end every page in that fixture.

## Capture a popup before clicking its opener

When product code opens the tab, the test should observe that event instead of creating a substitute. Start waiting before the click so a fast popup cannot occur between the action and listener registration. Use the source page's \`popup\` event when the relationship to that opener matters.

\`\`\`typescript
// tests/invoice-preview.spec.ts
import { test, expect } from '@playwright/test';

test('invoice preview popup keeps the current session', async ({ page }) => {
  await page.goto('/invoices/INV-204');
  await expect(page.getByText('Signed in as Finance Owner')).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Open printable invoice' }).click();
  const preview = await popupPromise;

  await preview.waitForLoadState('domcontentloaded');
  await expect(preview).toHaveURL(/\\/invoices\\/INV-204\\/print$/);
  await expect(preview.getByText('Invoice INV-204')).toBeVisible();
  await expect(preview.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
});
\`\`\`

\`page.waitForEvent('popup')\` resolves when the new page has been created and its initial request has started. It does not promise that the final application document is fully rendered. Use a web assertion on meaningful content, a URL assertion, or an appropriate load state. \`networkidle\` is rarely a good universal readiness signal because analytics, polling, and live connections can keep the network active.

If any page in the context could create the new tab, wait on \`context.waitForEvent('page')\` instead. That broader event is useful for indirect flows, but the opener-specific popup event communicates intent better when available.

## Avoid the classic listener race

This sequence is wrong:

\`\`\`typescript
await page.getByText('Open report').click();
const popup = await page.waitForEvent('popup');
\`\`\`

The event may fire during the click. By the time the waiter exists, the only popup has already been emitted and the test times out. Create the promise first, perform the action second, await the promise third. A \`Promise.all()\` form is also valid:

\`\`\`typescript
const [popup] = await Promise.all([
  page.waitForEvent('popup'),
  page.getByText('Open report').click(),
]);
\`\`\`

Prefer the separate-promise style when the trigger itself needs several actions or when naming improves readability. Both register the event wait before the click.

Do not solve the race with a fixed timeout. Waiting 500 milliseconds before looking for pages neither recovers a missed event nor proves which page was created. Event-first synchronization is deterministic and faster.

## Verify that the new page belongs to the expected context

During diagnosis, assert identity rather than inferring it from a successful navigation:

\`\`\`typescript
expect(preview.context()).toBe(page.context());
expect(page.context().pages()).toContain(preview);
\`\`\`

\`context.pages()\` returns all current pages in that context. It can help clean up an application that opens more windows than expected, but avoid selecting “the last page” as the main synchronization technique. Extensions, service pages in specialized setups, or two rapid popups make positional assumptions fragile.

| Need | Preferred API | Why |
|---|---|---|
| Test itself wants another tab | \`page.context().newPage()\` | Deliberately reuses the authenticated context |
| Click opens a page from known opener | \`page.waitForEvent('popup')\` | Captures the opener relationship without a race |
| Any page may spawn a new page | \`context.waitForEvent('page')\` | Observes creation across the whole context |
| Inspect current tabs after an unexpected event | \`context.pages()\` | Useful diagnostic snapshot, not event synchronization |
| Separate user or incognito session | \`browser.newContext()\` | Creates isolation on purpose |

## Reusing storage state is not the same as reusing a live context

\`storageState()\` serializes selected authentication storage so another context can start in a signed-in condition. It is ideal for authenticating once in setup and creating isolated test contexts later. It is unnecessary for two tabs that should participate in the same live user session.

\`\`\`typescript
// This creates another isolated context initialized from a snapshot.
const snapshot = await page.context().storageState();
const isolatedContext = await browser.newContext({ storageState: snapshot });
const isolatedPage = await isolatedContext.newPage();
\`\`\`

The isolated page may begin with equivalent cookies and storage, but subsequent changes are not shared. If tab A logs out, tab B in the same context sees cookie removal; the page in \`isolatedContext\` has its own copy. That difference is essential when testing cross-tab coordination, logout propagation, session rotation, or account switching.

Storage-state setup for Python has equivalent concepts and a different language API. The [Playwright Python authentication storage-state guide](/blog/playwright-python-authentication-storage-state-guide) is relevant when a cross-language suite needs the same login bootstrap strategy.

## Exercise cross-tab session changes, not just initial access

Opening an authenticated page proves initial sharing. The harder defects occur when one tab mutates the session. Useful scenarios include:

- Logging out in one tab, then navigating the other to a protected resource.
- Switching organization in one tab and checking whether the second tab refreshes its tenant data.
- Rotating a short-lived access token while two tabs issue requests.
- Revoking the session server-side and verifying both pages handle 401 without redirect loops.
- Updating a preference through localStorage and checking the product's intended storage-event behavior.

Browser \`storage\` events fire in other documents, not the document that performed the localStorage mutation. A same-context multi-page test can catch code that accidentally only updates the active tab. Cookies do not emit a comparable general-purpose page event, so applications typically discover changes on requests, broadcasts, or navigation.

For logout, assert server behavior rather than merely checking that a login button appears. After signing out on one page, request a protected route from the other and confirm the server rejects or redirects it. A stale DOM can remain visible after credentials are invalidated.

## Handle target blank, window.open, and rel attributes correctly

A link with \`target="_blank"\` commonly creates a popup page in the same browser context. \`rel="noopener"\` removes or limits the JavaScript opener relationship for security, but it does not create a new Playwright context or a separate cookie jar. Therefore authentication should still be shared.

Cross-origin pages also receive cookies for their own origin according to domain and SameSite rules. “Same context” does not mean a cookie for \`app.example.test\` is sent to \`payments.vendor.test\`. An external identity or payment popup may authenticate through its own cookie and then redirect or message the opener. Model those domain boundaries honestly.

Popup blockers are less prominent under Playwright automation because the click is programmatic through the browser, but product code may still require a trusted user gesture. Trigger the real control rather than evaluating \`window.open()\` directly unless the goal is specifically to unit-test downstream page handling.

## Keep page objects page-specific and context services shared

A page object should receive the \`Page\` it controls. Reusing a dashboard page object against a popup while it internally closes over the original fixture page produces assertions on the wrong document. Construct \`new InvoicePreviewPage(preview)\` after capturing the popup.

Context-wide helpers, such as a route recorder or permission setup, can receive \`BrowserContext\`. This division mirrors Playwright ownership. It also keeps TypeScript types helpful: a method that creates tabs belongs on a context-aware fixture, while a locator belongs on a page-aware object.

Avoid global variables holding the “current page.” Multiple pages are equally active in Playwright; they do not require bringing one to front for ordinary interactions. Explicit variables such as \`dashboardPage\` and \`previewPage\` prevent accidental locator calls on the wrong tab.

## Debug an apparently logged-out second tab

First, compare \`secondPage.context() === firstPage.context()\`. If false, the test created isolation. If true, inspect context cookies after login with \`context.cookies()\` and confirm the relevant cookie's domain, path, secure flag, and expiry. Navigate the second page to the exact origin expected to receive it.

If authentication uses localStorage, navigate to that origin before inspecting it with \`page.evaluate(() => localStorage)\`; origin storage is not accessible from \`about:blank\`. If it uses sessionStorage, revisit the product design and opening mechanism. If a service worker mediates auth, ensure it is active in the context and avoid assuming a new page is controlled before navigation completes.

Finally, distinguish UI redirection from actual credential absence. The new page might request a protected URL successfully, then client code redirect because tenant selection or an in-memory bootstrap value is missing. Network traces and server response status will identify which layer failed.

## Test token refresh with two pages contending

Short-lived access tokens expose a failure that a simple cookie check misses. Two pages can notice expiry together and each start a refresh request. Depending on server rotation rules, the second refresh may invalidate the first result, log out one tab, or overwrite a newer token with an older response. A same-context Playwright scenario is a realistic way to create that contention.

Prepare the account with a token near expiry through an API or test fixture, open two pages in the context, and synchronize both to issue protected requests. Route observation can count refresh calls without stubbing their responses. Assert the product's intended policy: perhaps one tab refreshes while the other waits through a BroadcastChannel, or the server safely accepts idempotent concurrent refresh. Then verify both pages can request protected data after the race.

Do not put token values in Playwright traces or assertion messages. Count calls, inspect safe status codes, and use redacted server diagnostics. If the application stores bearer tokens in localStorage, remember that both pages can write it. The final value, not only each refresh response, determines the next request.

You can coordinate the initial requests with application-visible controls rather than evaluating internal functions. For deterministic server timing, hold refresh responses behind a test fixture barrier and release them in a chosen order. This proves stale-response protection: a late response carrying an older token generation must not overwrite a later accepted generation.

Cross-tab refresh tests should be few and focused. Most retry and token-selection logic belongs in unit or integration tests with an injected credential store. The browser test establishes that the chosen coordination primitive actually crosses page boundaries and that context-owned storage behaves as assumed.

When the application uses a service worker for refresh, wait for the worker-controlled page rather than assuming installation completed after the first navigation. Open the second tab only after the authenticated page reports readiness, then verify both requests pass through the intended handler. This separates a worker lifecycle race from a session-sharing defect.

Keep the account fixture exclusive if refresh rotates server-side credentials. Parallel tests sharing one user can invalidate each other's tokens even though their browser contexts are isolated. Separate test accounts or server-issued sessions make the multi-tab result attributable to the pages in this scenario.

## Frequently Asked Questions

### Does context.newPage copy cookies from the first page?

It does not copy them from a page. Both pages consult the same cookie store owned by their browser context, so cookies already set for the destination URL are available automatically.

### Why is localStorage present but sessionStorage missing in my new tab?

localStorage is shared by same-origin documents in the context. sessionStorage is tied to a top-level browsing context. If opener behavior is part of the requirement, open the tab through the application's real link and test that exact browser behavior.

### Should I use page.waitForEvent('popup') or context.waitForEvent('page')?

Use \`popup\` when a known page triggers the new window. Use the context's \`page\` event when the creator is unknown or indirect. In both cases, register the waiter before the action.

### Will rel="noopener" cause the popup to lose authentication?

No. It affects the opener relationship, not the BrowserContext's cookie and origin-storage containers. Cross-origin cookie rules still apply normally.

### When should two authenticated pages use separate contexts?

Use separate contexts when they represent distinct users, isolated sessions, or independent snapshots. Use one context when the product behavior under test depends on shared login, logout, local storage, or cross-tab coordination.
`,
};
