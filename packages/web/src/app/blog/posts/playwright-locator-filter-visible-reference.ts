import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Locator filter() & Visibility Reference 2026',
  description:
    'Playwright locator.filter() and visibility reference: hasText, has, visible option, isVisible(), waitFor({state}), timeout params, and getByRole filters.',
  date: '2026-06-01',
  category: 'Reference',
  content: `
# Playwright Locator filter() & Visibility Reference 2026

Finding the right element on a real page is rarely as simple as "the button labeled Submit." Pages have lists with dozens of near-identical rows, the same word repeated in five places, hidden duplicates left in the DOM for accessibility or animation, and components that render long before they become visible. Playwright's answer is a composable locator system: you start broad, then **narrow** with \`locator.filter()\`, and you assert presence or absence with visibility methods like \`isVisible()\` and \`waitFor({ state })\`. This reference covers all of it for the \`@playwright/test\` runner in TypeScript — the \`filter()\` options (\`hasText\`, \`hasNotText\`, \`has\`, \`hasNot\`, and the \`visible\` option), the visibility methods and their timeout parameters, and how filtering combines with role-based queries.

The reason this matters so much is that locators are **lazy and auto-retrying**. A locator is not a snapshot of elements found at one instant; it is a description of how to find elements, re-evaluated every time you act or assert. That is what makes Playwright resilient to the asynchronous churn of modern apps — but it also means filtering and visibility behave differently from the synchronous "find element now" model you may know from older tools. A filtered locator re-runs its filter on every retry; \`isVisible()\` is an immediate boolean with no waiting; \`waitFor({ state: 'visible' })\` and web-first assertions like \`expect(locator).toBeVisible()\` are the auto-waiting forms. Knowing which is which is the difference between a rock-solid suite and a flaky one. If you want the locator fundamentals first, read the [Playwright locator strategies and getByRole guide](/blog/playwright-locator-strategies-getbyrole-guide) and the [Playwright best practices for 2026](/blog/playwright-best-practices-2026); this article goes deep on narrowing and visibility specifically.

We will cover \`filter()\` with each of its options, chaining filters, the \`visible: true\` filter option for skipping hidden duplicates, the difference between \`isVisible()\` and \`toBeVisible()\`, the four states of \`waitFor()\`, every relevant timeout parameter, applying filters on top of \`getByRole\`, and a comparison and troubleshooting table. An FAQ targeting the exact questions people search closes it out.

## locator.filter(): Narrowing a Set of Matches

\`locator.filter(options)\` returns a **new** locator that matches the subset of the original locator's elements satisfying the given conditions. It does not act on the page; it refines the description. This is the primary tool for picking one row out of a list, and because it returns a locator, you can chain it, pass it around, and assert on it like any other.

| \`filter()\` option | Type | Matches when an element... |
|---|---|---|
| \`hasText\` | \`string \\| RegExp\` | Contains the text (substring, case-insensitive for strings) |
| \`hasNotText\` | \`string \\| RegExp\` | Does NOT contain the text |
| \`has\` | \`Locator\` | Contains a descendant matching the given locator |
| \`hasNot\` | \`Locator\` | Does NOT contain a descendant matching the given locator |
| \`visible\` | \`boolean\` | Is visible (\`true\`) — filters out hidden matches |

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('filter a list row by its text', async ({ page }) => {
  await page.goto('https://example.com/todos');

  // Start broad: every list item
  const items = page.getByRole('listitem');

  // Narrow to the one containing specific text
  const buyMilk = items.filter({ hasText: 'Buy milk' });

  await expect(buyMilk).toBeVisible();
  await buyMilk.getByRole('button', { name: 'Complete' }).click();
  await expect(buyMilk).toHaveClass(/done/);
});
\`\`\`

\`hasText\` with a **string** matches case-insensitively and as a substring, which is forgiving but can over-match. When you need an exact or anchored match, pass a **RegExp**: \`filter({ hasText: /^Buy milk$/ })\` matches the whole text content exactly. \`hasNotText\` is the inverse and is invaluable for excluding a category — "every order row that is not Cancelled."

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('exclude rows with hasNotText and match exactly with RegExp', async ({ page }) => {
  await page.goto('https://example.com/orders');

  const rows = page.getByRole('row');

  // Active orders only: rows that do NOT contain the word "Cancelled"
  const activeOrders = rows.filter({ hasNotText: 'Cancelled' });
  await expect(activeOrders).not.toHaveCount(0);

  // Exact match for a single status using an anchored RegExp
  const exactlyPending = rows.filter({ hasText: /^Pending$/ });
  await expect(exactlyPending).toBeVisible();
});
\`\`\`

The \`has\` and \`hasNot\` options filter by **structure** rather than text — they keep elements that contain (or do not contain) a descendant matching another locator. This is how you select "the card that has a Delete button" without caring about its text:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('filter by the presence of a descendant with has', async ({ page }) => {
  await page.goto('https://example.com/products');

  const cards = page.getByTestId('product-card');

  // Only cards that contain an "Out of stock" badge
  const soldOut = cards.filter({ has: page.getByText('Out of stock') });
  await expect(soldOut).toHaveCount(2);

  // Only cards that do NOT contain a discount tag
  const fullPrice = cards.filter({ hasNot: page.getByTestId('discount-tag') });
  await expect(fullPrice.first()).toBeVisible();
});
\`\`\`

A subtle but important rule for \`has\`/\`hasNot\`: the inner locator is **resolved relative to the outer element**, so it checks whether each candidate contains a matching descendant. Use this for relational selection that text alone cannot express.

## Chaining Filters and Combining With Locators

Because \`filter()\` returns a locator, you chain multiple filters to apply several conditions at once — each \`filter()\` further narrows the set. You can also chain \`filter()\` with normal locator methods like \`getByRole\` to drill into the matched element. This composability is what lets you target a precise element in a busy DOM without brittle CSS or XPath.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('chain multiple filters to pinpoint one row', async ({ page }) => {
  await page.goto('https://example.com/users');

  const targetRow = page
    .getByRole('row')
    .filter({ hasText: 'admin@example.com' }) // the right user
    .filter({ has: page.getByRole('button', { name: 'Edit' }) }) // that is editable
    .filter({ hasNotText: 'Suspended' }); // and not suspended

  // Now drill into that single row to act
  await targetRow.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible();
});
\`\`\`

When chaining, order does not affect correctness — all conditions must hold — but reading filters top to bottom as a sentence keeps tests legible. If a chain still matches more than one element and you genuinely want the first, append \`.first()\`, \`.last()\`, or \`.nth(i)\`; but prefer adding a more specific filter over positional selection, because position is the least stable thing about a page.

## The visible Filter Option: Skipping Hidden Duplicates

Real DOMs frequently contain **hidden duplicates** of an element — a mobile menu and a desktop menu both present in markup, only one visible per viewport; a modal pre-rendered with \`display: none\`; an off-screen carousel slide. A plain text or role locator matches all of them, hidden and visible alike, which leads to strict-mode violations ("locator resolved to 2 elements") or interactions with the wrong, invisible copy. The \`filter({ visible: true })\` option resolves this by keeping only the visible matches.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('use visible: true to ignore a hidden duplicate', async ({ page }) => {
  await page.goto('https://example.com');

  // The page has both a hidden mobile nav and a visible desktop nav with "Sign in"
  const allSignIn = page.getByRole('link', { name: 'Sign in' });
  await expect(allSignIn).toHaveCount(2); // both copies exist in the DOM

  // Narrow to only the visible one — no strict-mode violation
  const visibleSignIn = allSignIn.filter({ visible: true });
  await expect(visibleSignIn).toHaveCount(1);
  await visibleSignIn.click();
});
\`\`\`

The \`visible\` option is the clean, declarative way to express "the one the user can actually see." It is preferable to hacks like \`:visible\` CSS pseudo-selectors or filtering by index, because it states intent directly and re-evaluates on every retry. Note that it only accepts \`true\` in the filtering sense — to assert something is hidden, use \`expect(locator).toBeHidden()\` rather than \`filter({ visible: false })\`. Combine \`visible: true\` with text or structural filters freely: \`filter({ hasText: 'Save', visible: true })\` targets the visible Save control among several.

## isVisible() vs toBeVisible(): Immediate Check vs Auto-Waiting

This is the single most misunderstood distinction in the visibility API, and getting it wrong is the leading cause of flaky visibility tests. \`locator.isVisible()\` returns a boolean **immediately** — it checks the current state right now and does not wait. \`expect(locator).toBeVisible()\` is a **web-first assertion** that retries until the element becomes visible or the timeout expires. If you use \`isVisible()\` to gate an assertion on an element that is still loading, it returns \`false\` instantly and your test fails or branches wrongly, even though the element would have appeared a moment later.

| Method | Waits? | Returns | Use for |
|---|---|---|---|
| \`locator.isVisible()\` | No — immediate | \`Promise<boolean>\` | Branching on current state you know is settled |
| \`expect(locator).toBeVisible()\` | Yes — retries to timeout | assertion (throws on fail) | Asserting an element should appear |
| \`expect(locator).toBeHidden()\` | Yes — retries to timeout | assertion | Asserting an element should disappear |
| \`locator.waitFor({ state })\` | Yes — retries to timeout | \`Promise<void>\` | Pausing until a state is reached |

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('prefer toBeVisible for assertions, isVisible only for settled branches', async ({ page }) => {
  await page.goto('https://example.com/dashboard');

  // CORRECT: auto-waits until the banner appears (or fails at the timeout)
  await expect(page.getByRole('alert')).toBeVisible();

  // RISKY for loading content: returns immediately, no wait
  const loadedNow = await page.getByTestId('chart').isVisible();
  // Only branch on isVisible() when you are certain the UI has settled:
  if (loadedNow) {
    await page.getByRole('button', { name: 'Export chart' }).click();
  }
});
\`\`\`

The rule: **assert with \`toBeVisible()\`; branch with \`isVisible()\` only when the page is known to be in a final state.** A frequent anti-pattern is \`if (await locator.isVisible()) { await locator.click() }\` to "safely" click a maybe-present element — under load this skips clicks that should have happened. If an element is conditionally present, wait for the condition explicitly, or structure the test so the element's presence is deterministic.

## waitFor({ state }) and the Four States

\`locator.waitFor(options)\` pauses until the locator reaches a given state, then resolves. It is the imperative counterpart to web-first assertions, useful when you need to synchronize before doing something that is not itself an auto-waiting action. There are four states.

| \`state\` value | Resolves when the element is... |
|---|---|
| \`'attached'\` | Present in the DOM (visible or not) |
| \`'visible'\` (default) | Present AND visible |
| \`'hidden'\` | Detached OR present but not visible |
| \`'detached'\` | Removed from the DOM entirely |

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('synchronize with waitFor states', async ({ page }) => {
  await page.goto('https://example.com/feed');

  // Wait until the spinner is gone before reading results
  await page.getByTestId('spinner').waitFor({ state: 'hidden', timeout: 15_000 });

  // Wait until at least one result is visible
  await page.getByTestId('result').first().waitFor({ state: 'visible' });

  // Wait for an element to be fully removed from the DOM
  await page.getByRole('dialog').waitFor({ state: 'detached' });

  await expect(page.getByTestId('result')).not.toHaveCount(0);
});
\`\`\`

The distinction between \`hidden\` and \`detached\` matters: \`hidden\` is satisfied if the element is either gone OR present-but-invisible (e.g. \`display: none\`), whereas \`detached\` requires it to be removed from the DOM. Pick \`detached\` when the app actually unmounts the node (common in React when a component conditionally renders), and \`hidden\` when it merely toggles visibility. In most modern tests you can skip explicit \`waitFor\` entirely and rely on auto-waiting assertions; reserve \`waitFor\` for synchronization points where no assertion naturally fits.

## Timeout Parameters Across the Visibility API

Every waiting method accepts a \`timeout\` in milliseconds that overrides the default for that single call. Knowing the layered defaults prevents confusion about why a test waited 5 vs 30 seconds. The action/assertion timeout defaults come from config, and a per-call \`timeout\` wins over them.

| Where | Default | How to override |
|---|---|---|
| Web-first assertion (\`toBeVisible\`) | 5000 ms (\`expect.timeout\`) | \`expect(loc).toBeVisible({ timeout: 10_000 })\` |
| \`locator.waitFor()\` | No default cap beyond test timeout | \`waitFor({ state, timeout: 15_000 })\` |
| Actions (\`click\`, \`fill\`) | No action cap unless set | \`click({ timeout: 8_000 })\` or \`actionTimeout\` in config |
| \`isVisible()\` | 0 — immediate, no wait | A \`timeout\` here only bounds DOM resolution, not visibility |
| Whole test | 30000 ms (\`timeout\`) | \`test.setTimeout()\` or config |

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('override timeouts per call when the default is wrong', async ({ page }) => {
  await page.goto('https://example.com/report');

  // A heavy report can take longer than the 5s assertion default
  await expect(page.getByRole('heading', { name: 'Quarterly Report' })).toBeVisible({
    timeout: 20_000,
  });

  // A flaky third-party widget gets a longer waitFor
  await page.getByTestId('embedded-widget').waitFor({ state: 'visible', timeout: 30_000 });
});
\`\`\`

You can also set global defaults in \`playwright.config.ts\` via \`expect.timeout\` (assertions), \`actionTimeout\` (single actions), and \`timeout\` (per test). Prefer raising a **specific** call's timeout over inflating the global default, because a large global timeout masks genuinely slow paths and makes the whole suite slower to fail. For configuration depth, see the [Playwright test config options complete reference](/blog/playwright-test-config-options-complete-reference).

## Filtering on getByRole and Other Semantic Locators

\`getByRole\` already accepts options like \`name\`, \`exact\`, \`checked\`, \`selected\`, and \`disabled\`, which filter by accessibility attributes at query time. Layering \`filter()\` on top combines semantic targeting with text/structural narrowing — the recommended modern approach because it mirrors how users perceive the page.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('combine getByRole options with filter', async ({ page }) => {
  await page.goto('https://example.com/settings');

  // Role-level filtering: only checked checkboxes
  const enabled = page.getByRole('checkbox', { checked: true });
  await expect(enabled).not.toHaveCount(0);

  // Add a filter to target the row whose label text matches, visible only
  const emailToggleRow = page
    .getByRole('listitem')
    .filter({ hasText: 'Email notifications', visible: true });

  await emailToggleRow.getByRole('switch').click();
  await expect(emailToggleRow.getByRole('switch')).toBeChecked();
});
\`\`\`

| \`getByRole\` option | Effect |
|---|---|
| \`name\` | Match the accessible name (string substring or RegExp) |
| \`exact\` | With a string \`name\`, require an exact, case-sensitive match |
| \`checked\` | Match by checked state (checkbox, radio, switch) |
| \`selected\` | Match by selected state (option, tab) |
| \`disabled\` | Match by disabled state |
| \`expanded\` | Match by aria-expanded state |

Use \`getByRole\` options for accessibility-state filtering and \`filter()\` for text or structural narrowing; together they cover almost every targeting need without resorting to fragile selectors. When neither expresses what you want, \`filter({ has })\` with a nested role locator usually does.

## Troubleshooting Filter and Visibility Issues

| Symptom | Cause | Fix |
|---|---|---|
| "strict mode: resolved to N elements" | Locator matches hidden + visible copies | Add \`.filter({ visible: true })\` or a more specific filter |
| \`isVisible()\` returns false for loading content | It does not wait | Use \`expect(loc).toBeVisible()\` instead |
| \`hasText\` matches too many rows | String match is substring, case-insensitive | Use an anchored RegExp like \`/^Exact$/\` |
| \`filter({ has })\` matches nothing | Inner locator not actually a descendant | Ensure the inner locator targets a child of the outer |
| Click skipped under load | \`if (await loc.isVisible())\` branch | Wait for the element deterministically before clicking |
| Test times out at 5s on a slow page | Default assertion timeout too short | Pass \`{ timeout: ... }\` to that assertion |
| \`waitFor({ state: 'hidden' })\` resolves too early | Element is present but invisible, not removed | Use \`state: 'detached'\` if it should unmount |

The recurring theme: choose the **waiting** form for anything that depends on the page settling (\`toBeVisible\`, \`waitFor\`), and the **immediate** form (\`isVisible\`) only for genuinely settled, synchronous branching. And narrow with declarative filters (\`hasText\`, \`has\`, \`visible: true\`) rather than positional indexing, which is the most fragile possible selector. For flakiness rooted in timing more broadly, the [Playwright retries and flaky test handling guide](/blog/playwright-retries-flaky-test-handling-guide) and the [fix flaky tests guide](/blog/fix-flaky-tests-guide) on the [QA Skills blog](/blog) go further.

## Frequently Asked Questions

### What is the visible option in Playwright locator filter?

\`filter({ visible: true })\` returns a new locator matching only the visible elements among the original matches, discarding hidden duplicates such as a collapsed mobile menu or a \`display: none\` modal still present in the DOM. It is the declarative way to target "the one the user can see" and prevents strict-mode violations when both hidden and visible copies exist. It accepts \`true\`; to assert hidden, use \`toBeHidden()\`.

### Does locator.isVisible() have a timeout parameter?

\`isVisible()\` is an immediate check that returns the current visibility as a boolean without waiting, so it has no meaningful wait timeout — any \`timeout\` only bounds resolving the DOM query, not waiting for visibility. If you need to wait until an element becomes visible, use \`expect(locator).toBeVisible({ timeout })\` or \`locator.waitFor({ state: 'visible', timeout })\`, both of which retry until the timeout elapses.

### What is the difference between isVisible() and toBeVisible()?

\`isVisible()\` checks the current state right now and returns a boolean immediately with no retrying. \`expect(locator).toBeVisible()\` is a web-first assertion that retries until the element is visible or the timeout (default 5000 ms) expires. Use \`toBeVisible()\` for assertions and \`isVisible()\` only for branching when you are certain the page has already settled, never to gate a click on loading content.

### How do I filter a Playwright locator by text?

Use \`locator.filter({ hasText: 'some text' })\` to keep elements containing that text (substring, case-insensitive for strings), or pass a RegExp like \`{ hasText: /^Exact$/ }\` for an anchored, exact match. To exclude, use \`{ hasNotText: '...' }\`. Filters return a new locator, so you can chain several and then drill into the result with \`getByRole\` or other methods to act on the matched element.

### What states can waitFor accept?

\`locator.waitFor({ state })\` accepts \`'attached'\` (in the DOM), \`'visible'\` (the default — present and visible), \`'hidden'\` (detached or present-but-invisible), and \`'detached'\` (removed from the DOM). Choose \`'detached'\` when the app actually unmounts the node and \`'hidden'\` when it only toggles visibility. Each accepts a \`timeout\` to bound the wait independently of the test timeout.

### How do I select a row that contains a specific button?

Use the structural filter \`filter({ has: ... })\`: for example \`page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Edit' }) })\` keeps only rows that contain an Edit button. The inner locator is resolved relative to each candidate row, so it checks for a matching descendant. Chain additional filters (text, visibility) to narrow further, then drill in with \`getByRole\` to click.

### Why does my filter match more than one element?

A string \`hasText\` matches as a case-insensitive substring, so a short term can match several rows; switch to an anchored RegExp like \`/^Term$/\` for exactness. Also confirm hidden duplicates are not inflating the count — add \`{ visible: true }\`. If multiple genuinely valid matches remain, add a more specific structural filter (\`has\`/\`hasNot\`) rather than reaching for \`.nth()\`, which is the least stable selector.

### Should I use waitFor or toBeVisible?

Prefer \`expect(locator).toBeVisible()\` for assertions — it is the web-first, auto-retrying form and reads as an expectation. Use \`waitFor({ state })\` when you need to synchronize before a non-asserting action and no assertion naturally fits, such as waiting for a spinner to reach \`'hidden'\` before reading results. In most modern tests, auto-waiting assertions and actions remove the need for explicit \`waitFor\` entirely.

## Conclusion

Targeting and visibility are where flaky suites are won or lost. \`locator.filter()\` lets you narrow a broad locator declaratively — by text with \`hasText\`/\`hasNotText\`, by structure with \`has\`/\`hasNot\`, and to what the user actually sees with \`visible: true\` — and because filters return locators, you compose them and layer them on \`getByRole\` to express precise intent without fragile selectors. On the visibility side, the cardinal rule is to assert with the auto-waiting \`toBeVisible()\` and synchronize with \`waitFor({ state })\`, reserving the immediate \`isVisible()\` for settled, synchronous branching only. Tune timeouts per call when a specific path is slow rather than inflating global defaults.

To have your AI coding agent generate locators that filter correctly and wait the right way by default, install a Playwright skill from the [QA Skills directory](/skills). Continue with the [locator strategies guide](/blog/playwright-locator-strategies-getbyrole-guide), the [retries and flaky test handling guide](/blog/playwright-retries-flaky-test-handling-guide), and the rest of the [QA Skills blog](/blog).
`,
};
