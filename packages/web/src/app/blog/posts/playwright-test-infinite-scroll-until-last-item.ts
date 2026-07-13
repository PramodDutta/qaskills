import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Infinite Scroll Until the Last Item in Playwright',
  description:
    'Test infinite scroll until the last item in Playwright with deterministic stop signals, bounded loops, network checks, and virtualized-list assertions.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test Infinite Scroll Until the Last Item in Playwright

The thirty-first product never appears. Playwright scrolls, the spinner flashes, and the test keeps nudging the page until its timeout expires. Looking at the screenshot does not reveal whether pagination broke, the loop missed the scroll container, or the application had already reached the end. Infinite scroll turns a simple assertion into a protocol: trigger the next page, observe progress, decide whether the end is real, and stop safely when the system violates that protocol.

A reliable test therefore needs more than repeated \`mouse.wheel()\` calls. It needs an application-specific completion signal, a measurable progress signal, and a hard bound. This tutorial builds those pieces for ordinary append-only feeds and then adapts them for virtualized lists, where DOM count cannot represent the total number of loaded records.

The locator and synchronization choices follow the broader [Playwright best practices for 2026](/blog/playwright-best-practices-2026). When you want to collect several item-level discrepancies without aborting at the first one, the [Playwright soft assertions guide](/blog/playwright-soft-assertions-expect-guide) covers that separate reporting technique.

## Define What “Last Item” Means Before Scrolling

The end of a feed is a product rule, not a browser observation. Ask the API and UI owners how the application communicates completion. Strong implementations expose one or more of these facts:

| End contract | Example | Test strength | Common ambiguity |
|---|---|---|---|
| Known terminal ID | Seeded item \`product-120\` must appear | High | Sort order must be fixed |
| API total count | Response reports \`total: 120\` | High | Filters can change the total |
| Pagination flag | Last response has \`hasNextPage: false\` | High | UI may fail to render returned rows |
| End-of-list marker | Status says “You reached the end” | Medium | Marker may appear after an API error |
| Disabled observer sentinel | Sentinel carries \`data-complete=true\` | Medium | Implementation detail can drift |
| Stable item count | Count stops changing | Low alone | Slow responses resemble completion |

For a controlled end-to-end test, seed a fixed dataset and remember the last record's stable ID. Sort on a unique secondary key so duplicate timestamps cannot reorder records. If the page advertises a total, assert both the final ID and total count. Two independent observations catch more defects: the expected record proves traversal reached the end, while the count detects missing or duplicated rows.

Avoid defining success as “the scroll height stopped changing.” Images, advertisements, collapsing headers, and skeletons alter height without adding records. Conversely, a virtualized list can keep a constant height and reuse the same DOM nodes while its logical window advances.

## Start With a Bounded Progress Loop

The safest basic algorithm scrolls the current last item into view, waits for either a larger item count or the requested terminal item, and limits attempts. Scrolling a locator is more precise than sending wheel events because it targets the list's actual content even when the page has sticky panels or nested scrollers.

\`\`\`typescript
// tests/helpers/scroll-until.ts
import { expect, type Locator } from '@playwright/test';

type ScrollOptions = {
  items: Locator;
  terminalItem: Locator;
  maxLoads?: number;
  progressTimeoutMs?: number;
};

export async function scrollUntilTerminalItem({
  items,
  terminalItem,
  maxLoads = 20,
  progressTimeoutMs = 5_000,
}: ScrollOptions): Promise<void> {
  for (let load = 0; load < maxLoads; load += 1) {
    if (await terminalItem.isVisible()) return;

    const before = await items.count();
    if (before === 0) throw new Error('Feed has no initial items to scroll');

    await items.last().scrollIntoViewIfNeeded();

    await expect
      .poll(
        async () => {
          if (await terminalItem.isVisible()) return 'terminal';
          return (await items.count()) > before ? 'grew' : 'waiting';
        },
        {
          message: \`Expected progress beyond \${before} items\`,
          timeout: progressTimeoutMs,
        },
      )
      .not.toBe('waiting');

    if (await terminalItem.isVisible()) return;

    const after = await items.count();
    if (after <= before) {
      throw new Error(\`Infinite scroll made no progress: still \${after} items after load \${load + 1}\`);
    }
  }

  throw new Error(\`Terminal item was not visible after \${maxLoads} load attempts\`);
}
\`\`\`

The poll waits for a real state transition rather than merely sampling a valid number. It accepts either terminal visibility or growth, then the loop performs its explicit progress check and reports the attempt that stalled.

## Wait for Count Growth or Explicit Completion

After triggering a load, there are two legitimate outcomes: more items appear, or the end signal appears. Model that disjunction directly. \`expect.poll()\` can return a compact status string, keeping retries inside Playwright's assertion system and producing an understandable failure.

\`\`\`typescript
// tests/helpers/scroll-page.ts
import { expect, type Locator } from '@playwright/test';

export async function loadNextPage(
  items: Locator,
  endMarker: Locator,
  timeout = 5_000,
): Promise<'grew' | 'complete'> {
  const before = await items.count();
  await items.last().scrollIntoViewIfNeeded();

  await expect
    .poll(
      async () => {
        if (await endMarker.isVisible()) return 'complete';
        return (await items.count()) > before ? 'grew' : 'waiting';
      },
      {
        message: \`Expected item count to grow beyond \${before} or the end marker to appear\`,
        timeout,
        intervals: [100, 250, 500],
      },
    )
    .not.toBe('waiting');

  return (await endMarker.isVisible()) ? 'complete' : 'grew';
}
\`\`\`

This helper does not use a fixed sleep. A fast response completes quickly, while a slow response gets the configured allowance. If the application renders an end marker only after the final batch, the loop can stop without treating unchanged count as an error.

One nuance remains: \`isVisible()\` is intentionally immediate. That is correct inside \`expect.poll()\`, which supplies the retry behavior. Using \`await endMarker.isVisible()\` once outside a polling or assertion loop would race the UI.

## A Complete Test for a Seeded Catalog

Assume the test environment exposes 73 products sorted by ascending SKU, loads 20 at a time, renders cards with \`data-testid="product-card"\`, and shows a status after the final response. The final seeded SKU is \`SKU-0073\`. The test can express the traversal and final invariants without knowing how many pixels each card occupies.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { loadNextPage } from './helpers/scroll-page';

test('loads the catalog through SKU-0073 without duplicates', async ({ page }) => {
  await page.goto('/catalog?sort=sku-asc');

  const cards = page.getByTestId('product-card');
  const endMarker = page.getByRole('status', { name: 'All products loaded' });
  const finalCard = cards.filter({ hasText: 'SKU-0073' });

  await expect(cards.first()).toBeVisible();

  for (let pageNumber = 1; pageNumber <= 5; pageNumber += 1) {
    if (await finalCard.isVisible()) break;
    const result = await loadNextPage(cards, endMarker);
    if (result === 'complete') break;
  }

  await expect(finalCard).toBeVisible();
  await expect(cards).toHaveCount(73);
  await expect(endMarker).toBeVisible();

  const skus = await cards.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('data-sku')),
  );
  expect(skus).not.toContain(null);
  expect(new Set(skus).size).toBe(skus.length);
  expect(skus.at(-1)).toBe('SKU-0073');
});
\`\`\`

The maximum of five passes comes from the data contract: one initial page plus at most four additional pages covers 73 records at 20 per page. A general helper can accept a larger cap, but a test with known fixtures should use the tightest reasonable value. If pagination accidentally loops page two forever, the duplicate assertion and hard cap expose it quickly.

This test checks four distinct properties: reachability of the final record, exact cardinality, uniqueness, and order. A feed could satisfy any three while violating the fourth. For example, a duplicate record may keep the count at 73 while pushing the final record out, or all records may appear in a nondeterministic order even though each is unique.

## Pair UI Progress With Network Evidence

DOM assertions explain what the user sees. Network observations explain why progress stopped. Wait for the pagination response before triggering the scroll, then inspect only stable contract fields. Registering the wait afterward creates a race when the response is fast.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('last cursor response agrees with the rendered feed', async ({ page }) => {
  await page.goto('/feed');
  const rows = page.getByTestId('feed-row');

  let hasNextPage = true;
  let requests = 0;

  while (hasNextPage && requests < 10) {
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/feed?') &&
        response.request().method() === 'GET' &&
        response.status() === 200,
    );

    await rows.last().scrollIntoViewIfNeeded();
    const response = await responsePromise;
    const body = (await response.json()) as {
      items: Array<{ id: string }>;
      pageInfo: { hasNextPage: boolean };
    };

    expect(body.items.length).toBeGreaterThan(0);
    hasNextPage = body.pageInfo.hasNextPage;
    requests += 1;
  }

  expect(hasNextPage).toBe(false);
  await expect(page.getByText('No more updates')).toBeVisible();
});
\`\`\`

Do not make every scroll helper dependent on one response URL if the UI contract is sufficient. Network-aware tests are valuable at the feature boundary, but they couple to transport details. Keep at least one user-visible test that remains valid if REST pagination becomes GraphQL or server-rendered streaming.

Also account for failed requests. A spinner disappearing after a 500 is not successful completion. Capture responses with status 400 or higher, or assert the application's error alert. Your loop should report “pagination request failed” rather than “last item missing,” because the first diagnosis is immediately actionable.

## Nested Scrollers Need a Different Trigger

Many feeds scroll inside a fixed-height panel while the document itself does not move. \`page.mouse.wheel()\` acts at the current pointer position, so it may scroll the page, a side panel, or nothing. Target the scroll container explicitly.

\`\`\`typescript
const panel = page.getByTestId('activity-scroll-region');

await panel.evaluate((element) => {
  element.scrollTop = element.scrollHeight;
  element.dispatchEvent(new Event('scroll', { bubbles: true }));
});
\`\`\`

Use this only when scrolling the last item is insufficient. Setting \`scrollTop\` is implementation-aware, but deterministic. If the product uses an intersection observer sentinel, scrolling that sentinel into view is even closer to user behavior. Do not call private framework methods or mutate component state just to make a browser test pass.

CSS scroll snapping can move the container away from the bottom after an immediate assignment. In that case, assert the sentinel becomes visible, or set the scroll position through a normal wheel event after placing the pointer over the panel. The appropriate trigger depends on the actual interaction model, which is why a generic “scroll to bottom” utility often becomes flaky across pages.

## Virtualized Lists Change the Assertions

React Window, React Virtualized, and similar libraries keep only a moving window of rows in the DOM. If a 10,000-record feed renders 20 nodes, \`locator.count()\` may remain 20 from beginning to end. The final item can appear while the first item has been recycled. Exact DOM count and all-item duplicate checks are invalid for this architecture.

| Append-only feed assertion | Virtualized equivalent |
|---|---|
| DOM count grows after each load | Visible index range or cursor advances |
| Final DOM count equals API total | Accessible total, API total, or component status equals total |
| Collect every card's ID at the end | Accumulate observed IDs during traversal, if full coverage is required |
| First card remains attached | First logical index eventually leaves the window |
| Last card selector is unique in full DOM | Row with terminal \`aria-rowindex\` becomes visible |

Prefer semantic metadata such as \`aria-rowcount\` on the grid and \`aria-rowindex\` on rows. For a total of 10,000, scroll until a row with \`aria-rowindex="10000"\` appears and assert the grid's \`aria-rowcount\` is \`10000\`. If those attributes are absent, a stable \`data-index\` designed for diagnostics is more reliable than parsing translated text.

A virtualizer may fetch data separately from rendering it. Test both boundaries: assert the final pagination response says no next page, then assert the terminal logical row can be brought into view. That catches a cache that received all records but failed to update the virtualizer's item count.

## Prevent False Completion and Runaway Tests

Three safeguards belong in every infinite-scroll loop.

First, cap page loads based on a contract or a conservative maximum. The Playwright test timeout is only a final circuit breaker and gives a poor error message. Second, track progress using an invariant that must change, such as item count, last stable ID, cursor, or logical index. Third, recognize explicit failure states, including error banners and non-success responses.

Do not stop after the same count appears twice unless the application contract guarantees response latency below the observation window. Count stability is a timeout symptom, not proof of completion. An end marker or \`hasNextPage: false\` is stronger.

Keep diagnostics compact but sufficient. On failure, report attempt number, previous and current count or index, last observed item ID, scroll container metrics, relevant response status, and whether the spinner or end marker was visible. Attach a trace for retries rather than printing every polled value. Excessive logs obscure the transition that mattered.

Finally, test idempotence at the bottom. Trigger another intersection or scroll after completion and assert no duplicate request or row appears if that is the product contract. Many pagination defects live one step beyond the nominal end: a stale cursor fires again, the last page appends twice, or the spinner never clears.

Viewport selection deserves an explicit decision. A narrow mobile viewport can load fewer initial cards and trigger the observer earlier, while a tall desktop viewport may place the sentinel inside the viewport before the first action. Run the full traversal at one controlled size, then add targeted responsive cases for layouts that use a different scroll container or page size. Do not multiply an expensive all-items test across every browser and viewport unless that combination changes pagination behavior.

Keep fixture ordering deterministic. Sorting only by a non-unique timestamp allows records with equal values to trade places between requests, which looks like duplication or omission even when cursor code is functioning as designed. Seed unique timestamps or specify a secondary stable key. Assert the requested sort parameters at the API boundary when order is part of the feature.

Filters introduce another transition worth covering. Load several pages, change the filter, and confirm the cursor, count, end marker, and scroll position reset together. A stale cursor from the previous query can skip the first batch of the new result set. The test should expect a new request based on the new filter and should define a different terminal record for that dataset.

Accessibility provides useful observability. Loading status should be exposed through a status region without announcing every scroll movement, and the end message should be perceivable by keyboard and assistive-technology users. These semantics also give Playwright stable role locators. Treat them as product behavior rather than adding hidden selectors solely for automation.

When the dataset is enormous, do not traverse thousands of pages in every pull request. Use a compact fixture that preserves first, middle, partial-last-page, and completion transitions. Reserve a larger endurance case for scheduled execution. The algorithm is the same, but the small deterministic dataset provides faster failure feedback and a trace a human can actually inspect.

## Frequently Asked Questions

### Should I use mouse.wheel() to test infinite scroll in Playwright?

Use it when wheel interaction itself matters or when the application listens specifically to wheel behavior. For most pagination tests, scrolling the last item or sentinel into view is less sensitive to pointer position and viewport size. A nested panel can also be scrolled directly when its contract is known.

### How do I know infinite scroll has really reached the end?

Combine a product-level end signal with a content assertion. Examples include \`hasNextPage: false\` plus the expected terminal ID, or an end-of-list status plus the seeded total count. An unchanged scroll height by itself is not reliable evidence.

### Why does locator.count() never increase in my feed test?

The list may be virtualized and recycling a fixed number of DOM nodes. Assert a logical row index, accessible row count, terminal record ID, or pagination cursor instead. DOM cardinality is appropriate only for append-only rendering.

### How many scroll attempts should the test allow?

Derive the cap from fixture size and page size when possible. Add a small allowance only if the product can legitimately return partial pages. A bounded loop should fail with its progress details well before the overall test timeout.

### Can I mock pagination responses for this test?

Yes, a routed response is excellent for deterministic UI states such as empty pages, duplicated cursors, slow batches, and server errors. Keep a smaller number of end-to-end tests against the real backend to verify that cursor semantics, response shape, and rendered completion agree.
`,
};
