import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Infinite-Scroll Screen-Reader Announcements',
  description:
    'Test infinite-scroll screen-reader announcements with stable live regions, focus-safe loading, Playwright checks, and practical assistive-tech coverage.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Testing Infinite-Scroll Screen-Reader Announcements

Twenty more search results appear below the viewport, but a screen-reader user hears nothing. The DOM mutation succeeded, the network request returned, and the sighted loading spinner vanished. The missing behavior is a status transition: the interface never communicated that loading finished or how the result set changed.

Infinite scroll needs more than an accessible list. Users must know when loading begins, when new items arrive, how many were added, whether no more items remain, and whether a failure can be retried. Automation can verify the live-region contract and focus stability. A short pass with real assistive technology remains necessary because browsers and screen readers decide announcement timing outside the DOM API.

## Design one persistent status channel

Create the live region when the page renders and update its text as state changes. Do not insert an already-populated region at the same moment as the announcement; some assistive technologies observe changes more reliably than newly created nodes. A visually hidden element with \`role="status"\` provides polite live-region semantics.

\`\`\`tsx
import { useState } from 'react';

export function ResultsFeed() {
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    setStatus('Loading more results');
    try {
      const response = await fetch(\`/api/results?offset=\${items.length}\`);
      if (!response.ok) throw new Error('Request failed');
      const page: { items: Array<{ id: string; name: string }>; hasMore: boolean } =
        await response.json();
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
      setStatus(
        page.hasMore
          ? \`\${page.items.length} more results loaded, \${items.length + page.items.length} total\`
          : \`\${page.items.length} more results loaded, end of results\`,
      );
    } catch {
      setStatus('Could not load more results');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="results-heading" aria-busy={loading}>
      <h2 id="results-heading">Search results</h2>
      <p className="sr-only" role="status" data-testid="feed-status">{status}</p>
      <ul>{items.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
      {hasMore && <button onClick={loadMore}>Load more results</button>}
    </section>
  );
}
\`\`\`

\`role="status"\` has implicit polite live behavior and atomic announcement semantics. Avoid redundantly adding attributes unless testing shows a compatibility need. The status node stays mounted, and only its text changes.

## Announce completion, not every inserted card

Putting \`aria-live\` on the results container can cause a burst of item names, button labels, prices, and badges. That noise interrupts navigation and scales badly as pages grow. Keep result markup ordinary and announce a concise summary through the dedicated status region.

| Event | Useful announcement | Avoid |
|---|---|---|
| Fetch starts after user action | “Loading more results” | Repeating the query and every existing count |
| Page succeeds | “20 more results loaded, 60 total” | Reading all 20 result titles automatically |
| Final page succeeds | “8 more results loaded, end of results” | Silent disappearance of the load control |
| Empty first response | “No results found” | Announcing “0 loaded” without context |
| Request fails | “Could not load more results” | Raw exception or status code |
| Retry succeeds | New count and total | Repeating prior failure after recovery |

The exact wording belongs to product content design and localization. Tests should assert the approved message or its meaningful tokens. If pluralization differs by locale, exercise representative counts such as one and many through the real message formatter.

## Keep focus where the user put it

Appending items should not move focus. A screen-reader user may be reading the tenth result while an intersection observer triggers a fetch. Programmatically focusing the first new card yanks them away from their context. Likewise, rerendering with unstable keys can remove and recreate the focused element.

If the user activates a visible “Load more” button, keep focus on that button while it remains. On the final page, the button may disappear. Decide where focus should go before implementing this transition. One option is to keep a disabled or non-rendered-state control long enough to announce completion; another is to move focus only after explicit user action to a stable end-of-results element. Automatic scroll-triggered loads should not move focus.

Keyboard users also need an escape from endless content. Provide landmarks, a route to the footer, and preferably a button-based alternative. Infinite loading that continually pushes the footer away can make important links unreachable. The accessibility requirement is broader than the announcement string.

## Verify status and focus with Playwright

Playwright cannot tell you exactly what VoiceOver or NVDA spoke. It can verify prerequisites: the status role exists before updates, its accessible text changes after the request, new list items appear, busy state clears, duplicate loads are blocked, and focus remains stable.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('announces appended results without moving focus', async ({ page }) => {
  await page.route('**/api/results?offset=20', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          { id: 'r-21', name: 'Keyboard testing checklist' },
          { id: 'r-22', name: 'Live region examples' },
        ],
        hasMore: true,
      }),
    });
  });

  await page.goto('/search?q=accessibility');
  const loadMore = page.getByRole('button', { name: 'Load more results' });
  const status = page.getByRole('status');

  await expect(status).toBeAttached();
  await loadMore.focus();
  await loadMore.click();

  await expect(status).toHaveText('2 more results loaded, 22 total');
  await expect(page.getByRole('listitem')).toHaveCount(22);
  await expect(loadMore).toBeFocused();
  await expect(page.getByRole('region', { name: 'Search results' })).toHaveAttribute(
    'aria-busy',
    'false',
  );
});
\`\`\`

The route fixture must match the application's starting count. Seed deterministic initial data so the assertion does not depend on production content. Use role locators to exercise the accessibility tree, and a test ID only when a hidden node has no stable user-facing selector.

## Control IntersectionObserver without testing the browser twice

An observer-triggered feed needs a deterministic way to reach its threshold. Scrolling the sentinel into view through \`locator.scrollIntoViewIfNeeded()\` can exercise the real observer in a browser integration test. Ensure the page is tall enough and wait for the expected request or status, not a fixed timeout.

Keep separate component tests for the state machine: idle, loading, success, end, failure, retry. There, inject or mock the observer callback so rare transitions are deterministic. One end-to-end case should prove the production observer wiring actually starts a load.

Guard against repeated callbacks. IntersectionObserver can fire more than once while a sentinel remains visible. The \`loading\` flag or request identity must prevent duplicate pages. Assert one network request and unique item IDs. Duplicate result announcements are confusing even when the DOM visually hides duplicate cards.

If content height does not fill the viewport after the first page, the sentinel may remain visible and intentionally load additional pages. Define whether auto-fill is expected. Tests should cap it at \`hasMore=false\` and confirm the final announcement occurs once.

## Exercise all terminal states

Success-only automation misses the moments when live feedback matters most. Test an HTTP failure, malformed payload if the client validates data, aborted request during navigation, empty next page, and final page.

On failure, keep existing items and expose a keyboard-operable retry. Associate visible error text with the control when useful, while the status region announces the failure once. Do not set an assertive alert for routine pagination failures unless interruption is genuinely urgent.

On final completion, remove observer activity and ensure no further calls occur. Provide visible end text when it benefits everyone, not only an off-screen announcement. A user revisiting the bottom should be able to perceive that the list is complete.

| State transition | DOM assertion | Network assertion | Focus assertion |
|---|---|---|---|
| Idle to loading | Region becomes busy, loading status appears | One request starts | Active element unchanged |
| Loading to success | Items append, total message replaces loading | Response consumed once | Trigger or reading position retained |
| Loading to error | Existing list remains, retry appears | Failure recorded | Focus is not sent to body |
| Error to retry success | New items append, error message clears | One retry request | Activated retry has predictable successor |
| Loading to end | End text present, trigger or sentinel disabled | No future page request | Final action does not strand focus |

## Avoid live-region timing traps

Rapidly setting status to empty, then loading, then success can be coalesced by the browser accessibility layer. A unit test sees every React state assignment, but assistive technology may hear only the last change or none. Keep announcements meaningful and avoid unnecessary clears.

If identical text must be announced twice, some combinations may not announce an unchanged string. A genuine retry can produce the same count. Test the target screen readers before adding hacks such as alternating whitespace, which can create confusing output. Often including the updated total naturally makes messages distinct.

\`aria-busy="true"\` on the feed region can tell assistive technology that updates are in progress. Set it back to false after items and status are committed. Do not place \`aria-busy\` on the live status itself if that suppresses the announcement in supported combinations.

CSS visually-hidden utilities must keep the status in the accessibility tree. \`display: none\`, \`visibility: hidden\`, and the HTML \`hidden\` attribute generally remove it. Use the established clipped screen-reader-only utility and verify the computed accessibility role with browser tooling.

## Check the accessible structure around the feed

Use a list when the items form a list, and keep each card inside \`li\`. A region labeled by a visible heading helps users navigate back to results. Headings inside cards should follow a sensible hierarchy, but repeated card metadata does not need to become headings.

Virtualized infinite lists can remove off-screen nodes. This saves rendering cost but changes what screen-reader browse mode can access and can invalidate “60 total” when only 12 nodes exist. Test virtualization with the specific library and assistive technologies you support. Consider non-virtualized pagination or an alternative view when full browseability is required.

Do not misuse \`aria-setsize\` and \`aria-posinset\` without a reliable total and supported widget pattern. Ordinary HTML lists communicate structure naturally. If total results are known, visible result-count text can be simpler and more robust.

Automated rule engines can find missing names, invalid attributes, and certain structural problems. They cannot certify that announcement cadence is helpful. The [accessibility testing automation guide](/blog/accessibility-testing-automation-guide) explains that boundary, while the [Playwright accessibility testing guide](/blog/playwright-accessibility-testing-guide-2026) shows how role-driven browser checks fit into a larger suite.

## Run a concise screen-reader protocol

Choose supported browser and screen-reader combinations based on actual users and platform commitments. Common desktop checks include NVDA with Firefox or Chrome on Windows, JAWS with Chrome or Edge, and VoiceOver with Safari on macOS. Behavior can differ, so a pass on one pair is evidence for that pair only.

Begin with the screen reader running before page load. Navigate to results using headings or landmarks, move into several items, trigger or wait for another page, and record what is spoken. Confirm the loading message is not excessively repetitive, completion includes a useful count, reading position remains stable, and the final state is discoverable.

Repeat with keyboard only, browser zoom, reduced motion where scrolling animations exist, and a slow network profile. Automatic loading must not create a focus trap or prevent reaching content after the feed. Test errors by blocking the next-page request, then activate retry without a mouse.

Record browser, screen reader, operating-system versions, speech output summary, and any unexpected repetition. Do not capture user data in recordings. A lightweight protocol run at release boundaries complements fast DOM assertions in every pull request.

## Make announcements resilient to product change

Centralize pagination status formatting so grid, list, and mobile variants do not drift. Pass explicit values for newly added count, total loaded, and completion. Localize through plural-aware messages, and test languages where word order changes.

Analytics can detect duplicate loads and retry rates but cannot prove an announcement occurred. Add development diagnostics for state transitions if race bugs are hard to reproduce, while keeping screen-reader text free of technical identifiers.

When the API changes page size, avoid hard-coded “20 results” copy. Derive the count from unique items actually appended, not the server's requested limit. If the response contains duplicates that are deduplicated client-side, announce the number the user received.

Finally, reconsider whether infinite scroll is the right interaction. Search and administrative products often benefit from explicit pagination, stable URLs, and a reliable position. A “Load more” control can preserve the continuous list while returning agency to keyboard and assistive-technology users.

## Test route changes, filtering, and restored scroll position

Infinite feeds rarely live in isolation. Users change a filter, open a result, return with the browser back button, or share a URL. Each transition can produce misleading announcements if old pagination state survives under a new query.

When a filter changes, cancel the prior request, reset the item collection, and update the visible results heading or count. Announce the new result state after the response, not a stale “more results loaded” message from the abandoned query. In automation, delay the old response, apply the new filter, fulfill both responses out of order, and prove only the current query updates the list and live region.

The status node should remain persistent across ordinary state transitions, but route remounting can be appropriate when the entire search page changes. What matters is that a page-entry summary and later pagination updates do not fire simultaneously. Too many polite messages can queue and be spoken after they are useful. Coordinate ownership between route-level result counts and feed-level load status.

Back navigation requires a product decision. Restoring prior items and scroll position helps all users, but a screen reader also needs a stable place in the accessibility tree. Preserve item keys and restore focus only when the user had explicitly activated a result link. Do not announce every restored page as newly loaded. The content is restoration, not a fresh pagination event.

Write a browser test that loads two pages, focuses a result in the second page, navigates to its detail route, then goes back. Assert the result is present, focus returns to the activated link or another documented target, no duplicate next-page request occurs, and the status does not falsely claim additional items arrived. Browser history and application caches make this a higher-level test than the mocked pagination case.

Changing sort order should replace rather than append results. Mark the region busy during the operation, keep focus on the sort control, and announce a concise completion such as the new sort plus total count. If the implementation reuses the same item nodes in a new order, verify screen-reader browse order follows the visual and DOM order.

URL state improves testability. Encode query, filter, and sort values so reload and sharing reconstruct the result set. Cursor tokens usually should not be exposed directly unless the product supports deep pagination URLs, but the application can store restoration state in history. Whatever strategy is chosen, test refresh after several loads and confirm the end state is neither duplicated nor silently truncated.

These navigation scenarios reveal race conditions that a static accessibility scan cannot see. The live region may be perfectly named yet announce the wrong dataset, focus may return to a removed node, or a stale observer may append old items. Treat query identity and request cancellation as part of the accessibility contract because incorrect status information is as disruptive as no status at all.

## Frequently Asked Questions

### Can Playwright assert what a screen reader actually announces?

It can assert the live-region role, text changes, timing prerequisites, and focus behavior. It does not observe the final speech queue of NVDA, JAWS, or VoiceOver. Validate representative browser and assistive-technology pairs manually.

### Should the entire infinite list have aria-live enabled?

Usually no. Appending many cards can announce excessive content. Keep a persistent, concise status region and leave the semantic list available for normal navigation.

### What should happen to focus when the last page loads?

Automatic loads should not move it. For a user-activated button that disappears, design a stable destination or retained completion control so focus is not lost to the document body, then test that exact transition.

### Is role=status enough, or must aria-live be added?

\`role="status"\` already carries implicit polite live-region behavior. Extra attributes are often redundant. Add them only for a documented compatibility need and retest supported combinations.

### How do virtualized lists affect these tests?

Off-screen items may be removed from the accessibility tree, so DOM counts and announced totals no longer describe browsable nodes. Test the virtualization library with assistive technology and offer a non-virtualized or paginated path when necessary.
`,
};
