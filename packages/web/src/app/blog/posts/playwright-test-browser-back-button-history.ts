import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Test Browser Back-Button History in Playwright",
  description:
    "Test browser back-button history in Playwright with real navigation, URL and UI assertions, history-state checks, bfcache awareness, and deterministic fixtures.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Test Browser Back-Button History in Playwright

Click a product card, change a filter, open its details, then press Back. The URL may return while the list resets to page one, the scroll position jumps, or a stale detail view remains mounted. A useful Playwright history test observes all of those layers instead of treating \`page.goBack()\` as the assertion.

## Browser history is more than the previous URL

The history stack records entries for document navigations and for calls to \`history.pushState()\`. A browser may restore a prior document from the back-forward cache, rebuild it through a network request, or let a client router render from its own cache. Those paths can produce the same address with different UI state.

| Layer | Example failure after Back | What to assert |
|---|---|---|
| Address | Detail URL remains | \`expect(page).toHaveURL()\` |
| Router state | Wrong tab renders | Selected tab or heading |
| Form state | Search query disappears | Input value |
| Scroll | Results return at top | \`window.scrollY\` with tolerance |
| Network | Page unexpectedly refetches | Request count when caching is contractual |
| Accessibility | Focus lands nowhere useful | Active element when product requires restoration |

Write the test from user-visible history semantics first. An implementation assertion such as “popstate fired once” is insufficient if the page still restores incorrectly.

## Build history through the same actions as a user

Do not jump straight to the final URL and then call Back. There will be no meaningful application entry to return to. Navigate through links, router controls, and form submissions that create the stack under test.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('Back restores catalog filters after viewing a result', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('checkbox', { name: 'In stock' }).check();
  await page.getByLabel('Maximum price').fill('100');
  await page.getByRole('button', { name: 'Apply filters' }).click();

  await expect(page).toHaveURL(/inStock=true/);
  await expect(page).toHaveURL(/maxPrice=100/);
  const filteredUrl = page.url();

  await page.getByRole('link', { name: 'Trail camera' }).click();
  await expect(page).toHaveURL(/\/products\/trail-camera$/);
  await expect(page.getByRole('heading', { name: 'Trail camera' })).toBeVisible();

  const response = await page.goBack();
  expect(response === null || response.ok()).toBeTruthy();
  await expect(page).toHaveURL(filteredUrl);
  await expect(page.getByRole('checkbox', { name: 'In stock' })).toBeChecked();
  await expect(page.getByLabel('Maximum price')).toHaveValue('100');
  await expect(page.getByRole('link', { name: 'Trail camera' })).toBeVisible();
});
\`\`\`

\`goBack()\` returns a response for a document navigation and may return \`null\` for same-document history. Treating \`null\` as an automatic failure makes SPA tests incorrect. The observable page is the authoritative outcome.

## Distinguish pushState entries from full document navigations

Traditional links can create a new document. React, Vue, Angular, and other client routers often call \`pushState\`, then update the existing document. Both add history, but waiting strategies differ.

| Navigation type | Typical signal | Back behavior | Playwright synchronization |
|---|---|---|---|
| Full document | New HTML response | Previous document loads or restores | \`goBack()\` plus web assertion |
| SPA route | URL and component change | Router handles \`popstate\` | URL assertion plus component assertion |
| Hash navigation | Fragment changes | Scroll or tab may change | Hash and target state assertion |
| \`replaceState\` update | Current entry replaced | No extra entry | Verify Back skips replaced value |
| Modal route | Overlay plus route | Back should close overlay | Assert modal hidden and underlying state retained |

The [Playwright best-practices article](/blog/playwright-best-practices-2026) is relevant here: web-first assertions wait for eventual rendering and provide better diagnostics than arbitrary sleeps.

## Test Back and Forward as a paired contract

Many defects appear only after traversing the same entries twice. Back may restore a list correctly, while Forward shows blank data because a component cleanup removed cached state.

\`\`\`ts
test('Back closes a routed modal and Forward reopens it', async ({ page }) => {
  await page.goto('/inbox');
  await page.getByRole('link', { name: 'Invoice received' }).click();

  const dialog = page.getByRole('dialog', { name: 'Message' });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL('/inbox/messages/42');

  await page.goBack();
  await expect(page).toHaveURL('/inbox');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL('/inbox/messages/42');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Quarterly invoice')).toBeVisible();
});
\`\`\`

Avoid \`waitForTimeout()\`. A fixed delay neither describes the condition nor adapts to a fast or slow machine. Wait for the URL and the stable UI property that defines completion.

## Verify replaceState does not pollute the stack

Search boxes often replace the current history entry for every keystroke, then push an entry when a filter is committed. If the implementation pushes on each key, a user may press Back ten times to leave the screen.

Create a sentinel page before the search page, type a query, and verify one Back returns to the sentinel:

\`\`\`ts
test('typing a draft query replaces history instead of adding entries', async ({ page }) => {
  await page.goto('/account');
  await page.getByRole('link', { name: 'Search help' }).click();
  await expect(page).toHaveURL('/help/search');

  await page.getByRole('searchbox').pressSequentially('refund');
  await expect(page).toHaveURL(/q=refund/);
  await expect(page.getByText('Refund a card payment')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL('/account');
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible();
});
\`\`\`

This test intentionally avoids reading \`history.length\`. That property includes the browser's context history and does not reveal how many app entries are traversable in a portable way.

## Inspect history.state only when it is part of the design

Routers place keys, indexes, or application payloads in \`window.history.state\`. Direct inspection is legitimate for an application-owned state contract, but brittle for undocumented router internals.

\`\`\`ts
test('wizard restores the selected shipping method from history state', async ({ page }) => {
  await page.goto('/checkout/shipping');
  await page.getByLabel('Express delivery').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL('/checkout/payment');

  await page.goBack();
  await expect(page).toHaveURL('/checkout/shipping');
  await expect(page.getByLabel('Express delivery')).toBeChecked();

  const state = await page.evaluate(() => window.history.state);
  expect(state).toMatchObject({ checkout: { shippingMethod: 'express' } });
});
\`\`\`

If that payload is merely a router version's private shape, assert the checked radio instead. A dependency upgrade should not break tests when user behavior is unchanged.

## Cover scroll restoration without pixel-perfect fragility

Browsers usually restore scroll on history traversal when \`history.scrollRestoration\` is \`auto\`. Virtual lists and asynchronous content complicate that promise. Test an acceptable range around a semantic item rather than demanding an identical pixel.

First make the viewport deterministic. Scroll a named result into view, record its bounding rectangle or scroll offset, open details, then return. After Back, assert that the item is in the viewport. This tolerates fonts and minor layout shifts while catching a jump to the top.

\`\`\`ts
test.use({ viewport: { width: 1280, height: 720 } });

test('Back returns to the previously viewed result area', async ({ page }) => {
  await page.goto('/articles');
  const article = page.getByRole('link', { name: 'Testing cache invalidation' });
  await article.scrollIntoViewIfNeeded();
  const before = await article.boundingBox();
  expect(before).not.toBeNull();

  await article.click();
  await expect(page).toHaveURL(/\/articles\/cache-invalidation/);
  await page.goBack();
  await expect(page).toHaveURL('/articles');

  await expect(article).toBeVisible();
  const after = await article.boundingBox();
  expect(after).not.toBeNull();
  expect(after!.y).toBeGreaterThanOrEqual(0);
  expect(after!.y).toBeLessThan(720);
});
\`\`\`

For an infinite list, restore the data window before checking position. A locator cannot be visible if the virtualized row has not been recreated.

## Account for the back-forward cache

The back-forward cache, commonly called bfcache, can preserve an entire document for instant traversal. Its use varies by browser, page features, response headers, and resource pressure. A test should not assume a navigation response proves or disproves restoration.

Listen for the browser's \`pageshow\` event and its \`persisted\` flag only if bfcache eligibility is the feature under test. For ordinary functional coverage, assert state after traversal under each supported browser project.

| Goal | Stable assertion | Fragile shortcut |
|---|---|---|
| User returns to filtered results | URL, controls, visible results | Require a specific response object |
| Draft survives Back | Field content | Assume component never remounted |
| Page is bfcache restored | \`pageshow.persisted\` in a targeted browser test | Infer from speed |
| Stale private data is cleared | Visible account and sensitive content | Only count requests |

Security-sensitive pages deserve special coverage. After logout, Back must not expose usable private content. Cached pixels may briefly appear depending on the browser, but the application must prevent actions and promptly render an unauthenticated state.

## Model redirects and intermediate entries explicitly

Authentication redirects, canonical URL redirects, and payment-provider returns complicate the stack. If clicking “Billing” goes through \`/login?next=/billing\`, the expected Back target depends on whether the login used replacement or added entries.

Capture the journey as a sequence before coding:

1. Start at a known public page.
2. Trigger the protected destination.
3. Complete or simulate authentication.
4. Confirm the final destination.
5. Traverse Back once and state the expected screen.
6. Traverse again only if the product contract requires an intermediate entry.

Do not assert what the browser “normally” does when the application controls redirects. Agree on the intended journey with product and security stakeholders.

## Make data and routing deterministic

History tests become noisy when list data changes between visits. Seed a product with a stable accessible name, or intercept the relevant endpoint with a realistic response. Avoid over-mocking navigation itself, because the browser must execute the real router and history APIs.

Popups are separate top-level pages with separate history stacks. If a link opens a new tab, pressing Back on the original page does not close the popup. Use the [multi-page and popup handling guide](/blog/playwright-multi-page-popup-handling-guide) for that topology and call \`goBack()\` on the specific \`Page\` whose stack you built.

Service workers can also serve cached documents and data. Decide whether the test covers the production service worker or routing behavior without it. Mixing both intentions produces failures that are hard to classify.

## Debug an unexpected Back result

Trace Viewer is especially useful because its action timeline shows snapshots around \`goBack()\`. Add temporary logging for \`page.on('framenavigated', ...)\` and browser console messages, then remove noisy instrumentation once the cause is known.

| Observed result | Investigation |
|---|---|
| URL changes, component does not | Check the router's popstate subscription and stale effects |
| Two Back calls are needed | Find an unintended pushState, redirect, or hash entry |
| Filter URL returns, controls reset | Check state initialization order and query parsing |
| Works in Chromium only | Run named browser projects and inspect bfcache differences |
| Back returns to blank page | Confirm the test created a previous in-app entry |
| Intermittent top-of-page jump | Wait for list hydration and inspect manual scroll restoration |

Network-idle is rarely the right global signal for SPAs with polling or analytics. Prefer a heading, result count, selected control, or application readiness marker.

## Design a compact history regression suite

Cover one representative full navigation, one client-routed transition, one replace-state input, one modal route, and the most valuable restoration behavior such as filter or scroll. Add logout-back security coverage and a redirect journey if applicable. Running those cases across supported engines offers more value than cloning every link test with a Back step.

History is a sequence contract. Keep a written sequence beside each test, build it through real actions, and assert the state a person expects at each traversal point.

## Add adversarial history sequences

Single Back actions are a starting point. Real defects often require a longer sequence. Test list -> detail -> edit -> save -> Back and decide whether the user sees the saved detail, an edit form, or the list. An edit page containing submitted secrets should not reappear through a cached document. Payment confirmation pages should normally resist resubmission when traversed.

Exercise a route whose query string changes without a component remount. Apply sort, page, and filter values in separate actions, then step backward through each intended entry. If the product deliberately uses \`replaceState\` for transient controls, assert that those changes collapse into one entry. This produces a precise navigation contract instead of an arbitrary count.

Forms deserve two branches. For an unsaved form, Back may show a confirmation dialog or preserve a draft. For a submitted form, Back must not post the request again. Count mutation requests around traversal and assert the resulting record count. Browser dialogs can be handled through Playwright's \`page.on('dialog')\` or \`page.once('dialog')\`, but register the handler before the action that triggers it.

Test hash-based tabs where the fragment is the state. Start at \`/docs#install\`, click the API tab, and verify the URL becomes \`#api\`. Back should select Install and scroll its panel into view. A router that ignores \`hashchange\` can update the address while leaving the wrong tab active.

For pagination, record a stable item on page three, open it, and return. Assert page three, the sort direction, and the item. Do not depend on its absolute row number when other records can be inserted. Seed a fixed dataset or mock only the data endpoint while leaving navigation real.

Cross-origin history needs careful expectations. If the journey leaves the application for an identity or payment provider, Playwright can traverse it, but third-party content and redirects are less deterministic. Prefer a provider sandbox and assert only the contractual milestones. Never route a production payment or identity tenant from CI.

Include error pages. A detail route might return 404, then Back should restore the prior results rather than a blank shell. An offline transition might fail to load, yet Back should recover cached content once connectivity returns. When service-worker behavior is in scope, run that scenario in a separate project so unrelated history tests are not affected by worker registration state.

Test multiple rapid Back requests only if the product supports impatient input. Two \`goBack()\` calls launched concurrently are not a good general test because navigation can cancel another navigation. Instead press the browser-level shortcut sequentially through \`page.keyboard.press('Alt+Left')\` on platforms where that shortcut is part of the product requirement, or call and await each traversal. Platform shortcuts vary, while \`goBack()\` remains the portable default.

Accessibility checks can observe focus restoration after closing a routed dialog. If the triggering card remains in the document, focus should usually return there. For a full document restoration, the product may intentionally focus the main heading. Agree on that behavior before asserting it, because browsers differ in native focus restoration.

## Frequently Asked Questions

### Why does page.goBack() sometimes return null?

Same-document navigation, including many \`pushState\` and hash transitions, may not produce a network response. Assert the resulting URL and UI instead of requiring a response.

### Should I click the browser toolbar's Back button?

\`page.goBack()\` invokes the browser history traversal needed for functional automation. It is more portable than trying to automate browser chrome, which Playwright does not expose as page content.

### How can I prove a search field did not add one history entry per character?

Enter the search page from a known sentinel page, type the full value, call Back once, and assert that the sentinel returns. This tests the traversable behavior without relying on \`history.length\`.

### Can a test force bfcache restoration?

Not reliably. Eligibility and eviction are browser decisions. You can detect a persisted \`pageshow\` in a targeted test, but functional tests should accept either restoration or reload when both satisfy the product contract.

### Why does Back work in headed mode but fail in CI?

Look for timing assumptions, unstable seed data, viewport-dependent virtual lists, and different browser projects. Use web-first assertions and a trace rather than adding a fixed delay.
`,
};
