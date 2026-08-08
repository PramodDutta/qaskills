import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Locator Scroll Into View Lazy Lists Without Flaky Loops',
  description: 'Use Playwright locator scroll into view lazy lists reliably with runnable patterns for virtualization, loading sentinels, sticky UI, and precise failure diagnosis.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Locator Scroll Into View Lazy Lists Without Flaky Loops

For Playwright locator scroll into view lazy lists, first identify what actually loads the next item. Use \`locator.scrollIntoViewIfNeeded()\` when the target already exists in the DOM but sits outside the viewport. Scroll the list container or its loading sentinel when more DOM nodes are created only after scrolling. For a virtualized list, where off-screen rows are removed, advance in bounded steps and re-resolve the locator after each render.

The reliable pattern is condition-driven, not distance-driven: perform one scroll action, wait for observable progress, then search again. Observable progress can be an increased item count, a changed last-item key, a hidden loading indicator, or a visible end marker. Avoid arbitrary sleeps and giant wheel movements. They hide the loading contract, race with rendering, and produce failures that are hard to distinguish from a missing record.

## Decide which scrolling problem you have

“The item is below the fold” describes several different DOM architectures. Playwright cannot use one universal scroll recipe because the page may delegate scrolling to the window, an inner element, an intersection sentinel, or a virtualizer that continuously recycles nodes.

| List architecture | DOM behavior | Correct control point | Useful progress signal |
|---|---|---|---|
| Static long page | All items already exist | Target locator | Target becomes visible |
| Overflow container | All items exist inside a scroller | Target or container | Container scroll position changes |
| Infinite append | New nodes are appended near bottom | Sentinel or container | Item count or last key advances |
| Virtualized list | Off-screen nodes are removed or reused | Scroll container | Visible key range advances |
| Paginated “load more” | Button requests another page | Button | Button disappears or count advances |

Inspect the DOM before writing the test. Check whether the desired row exists before scrolling with \`await locator.count()\`. Find the element whose \`scrollHeight\` is larger than \`clientHeight\`. Observe whether rows accumulate or stay at a nearly constant count. Look for an intersection sentinel or a load-more button. These facts determine the algorithm.

The distinction between attached and visible matters. A locator can match an attached row that is far below the viewport. In that case, scrolling the locator is direct and stable. If \`count()\` is zero because the row has not been created, calling \`scrollIntoViewIfNeeded()\` on it waits for an element that scrolling itself must create. That is a circular wait.

## Use the locator when the item already exists

Playwright locators auto-wait for actionability when actions are performed. \`scrollIntoViewIfNeeded()\` scrolls the element if it is not completely visible, then the test can assert visibility and interact with it. Prefer a user-facing locator or a stable test id instead of an implementation-specific CSS path.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("opens an existing product below the fold", async ({ page }) => {
  await page.setContent(\`
    <main>
      <ul>
        \${Array.from({ length: 80 }, (_, index) =>
          \`<li style="height:48px"><button>Open product \${index + 1}</button></li>\`
        ).join("")}
      </ul>
    </main>
  \`);

  const target = page.getByRole("button", { name: "Open product 75" });
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible();
  await target.click();
});
\`\`\`

Do not add \`page.waitForTimeout()\` after this by habit. If the next action is a click, Playwright checks that the element is actionable. If the application animates a panel after the click, wait for the panel's visible result. The test then synchronizes with behavior rather than elapsed time.

Sticky headers create a subtle exception. An element may be considered visible while a fixed overlay covers the click point. First ask whether the product should fix the obstruction, since users experience it too. If the overlay is transient, wait for it to disappear. If it is intentional, scroll the container by a small documented offset after bringing the target into view, then assert the relevant geometry.

## Find the real scroll container

When a list has \`overflow: auto\`, wheel input may affect whichever element is under the pointer, and window scrolling may do nothing. A direct container update makes the test's intent explicit. Use \`locator.evaluate()\` for a focused DOM operation, then wait for an application signal.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("scrolls an overflow list to its final row", async ({ page }) => {
  await page.setContent(\`
    <section aria-label="Build history" style="height:220px;overflow:auto">
      \${Array.from({ length: 30 }, (_, index) =>
        \`<article style="height:60px">Build \${index + 1}</article>\`
      ).join("")}
    </section>
  \`);

  const list = page.getByRole("region", { name: "Build history" });
  await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect(page.getByText("Build 30", { exact: true })).toBeVisible();
});
\`\`\`

This operation is appropriate for a test whose concern is list behavior after a scroll position changes. If the test is specifically validating wheel or keyboard accessibility, drive the corresponding user input instead. Mechanism and assertion should match the risk being tested.

| Test objective | Scroll mechanism | Assertion |
|---|---|---|
| Reach content for another workflow | \`scrollIntoViewIfNeeded()\` | Target is actionable |
| Validate container lazy loading | Set container scroll position | New page is appended |
| Validate wheel interaction | Hover container, use mouse wheel | Visible range advances |
| Validate keyboard navigation | Focus list, press supported keys | Focus and range advance |
| Validate sentinel observer | Scroll sentinel into view | Request completes and items appear |

Do not assume the first ancestor with an overflow style is the active scroller. A parent can declare overflow but have no constrained height. Confirm at runtime that \`scrollHeight > clientHeight\`. If nested scrollers exist, log each candidate's dimensions in a failing diagnostic rather than guessing.

## Drive infinite append lists through the sentinel

Many lazy lists place a small element after the current items and observe it with \`IntersectionObserver\`. Bringing that sentinel into view closely matches the application's loading contract. After each step, wait for the result of loading, not for the observer itself.

The following complete page appends five rows each time the sentinel intersects, until row 20 exists. The test loops with a fixed maximum, records the count before scrolling, and uses an assertion to wait for progress.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("loads an item through an intersection sentinel", async ({ page }) => {
  await page.setContent(\`
    <div id="feed"></div>
    <div data-testid="load-sentinel" style="height:2px"></div>
    <script>
      const feed = document.querySelector("#feed");
      let count = 0;
      function appendBatch() {
        const limit = Math.min(count + 5, 20);
        while (count < limit) {
          count += 1;
          const row = document.createElement("article");
          row.textContent = "Incident " + count;
          row.style.height = "120px";
          feed.appendChild(row);
        }
      }
      appendBatch();
      const sentinel = document.querySelector('[data-testid="load-sentinel"]');
      const observer = new IntersectionObserver(() => {
        if (count < 20) appendBatch();
      });
      observer.observe(sentinel);
    </script>
  \`);

  const sentinel = page.getByTestId("load-sentinel");
  const rows = page.getByRole("article");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await page.getByText("Incident 18", { exact: true }).count()) break;
    const before = await rows.count();
    await sentinel.scrollIntoViewIfNeeded();
    await expect.poll(() => rows.count()).toBeGreaterThan(before);
  }

  await expect(page.getByText("Incident 18", { exact: true })).toBeVisible();
});
\`\`\`

The maximum attempt count is a safety boundary, not a timing guess. Derive it from the fixture: initial rows, batch size, and target position. If production data makes that impossible, use a generous explicit cap and fail with the observed first key, last key, row count, and end-marker state.

An observer may not fire a second time if the sentinel remains intersecting after new rows are appended. Real applications often move it below the newly added content, which causes another intersection transition as the user scrolls. If your test fixture or implementation keeps it visible, scroll it out and back in, or use an application design that triggers subsequent loads predictably. Repeatedly calling the same scroll method without changing intersection state is not progress.

## Wait on network responses only when they identify the load

Network synchronization can be precise when each lazy-load action makes a distinctive request. Register the wait before the scroll so a fast response cannot be missed. Then assert the UI result because a successful response does not prove rendering.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("waits for the next feed page and its rendered row", async ({ page }) => {
  await page.route("**/api/feed?cursor=next", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [{ id: "evt-41", title: "Deployment complete" }] }),
    });
  });

  await page.setContent(\`
    <base href="http://example.test/">
    <button id="more">Load more</button><section id="feed"></section>
    <script>
      document.querySelector("#more").addEventListener("click", async () => {
        const response = await fetch("/api/feed?cursor=next");
        const data = await response.json();
        for (const item of data.items) {
          const row = document.createElement("article");
          row.textContent = item.title;
          document.querySelector("#feed").appendChild(row);
        }
      });
    </script>
  \`);

  const responsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/feed?cursor=next") && response.request().method() === "GET"
  );
  await page.getByRole("button", { name: "Load more" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  await expect(page.getByText("Deployment complete", { exact: true })).toBeVisible();
});
\`\`\`

Avoid a broad \`waitForResponse\` predicate that matches analytics, prefetching, or an earlier cursor. Match the HTTP method and the stable request identity. Query parameter matching should reflect whether order is stable. When multiple requests can overlap, UI progress signals are often safer than trying to associate one request with one scroll.

## Traverse virtualized rows without holding stale assumptions

A virtualized list renders only a window of items. The desired row may not exist until its index approaches the visible range, and a row element can be reused for another record. Locators re-query the DOM, which helps, but a previously read element handle or cached text does not represent a permanent row.

Use stable record keys in accessible names or test ids. Scroll one viewport or call a product-supported “jump to index” control if that is what users use. After each action, wait until the last visible key changes. Do not use total DOM row count as progress because it may remain constant by design.

\`\`\`ts
import { test, expect, type Locator } from "@playwright/test";

async function advanceVirtualList(scroller: Locator): Promise<void> {
  await scroller.evaluate((element) => {
    element.scrollTop += Math.max(1, element.clientHeight - 40);
  });
}

test("finds a record in a virtualized audit list", async ({ page }) => {
  await page.goto("/audit");
  const scroller = page.getByRole("region", { name: "Audit events" });
  const target = page.getByRole("row", { name: /event evt-0097\\b/i });
  const visibleRows = scroller.getByRole("row");

  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (await target.count()) {
      await target.scrollIntoViewIfNeeded();
      await expect(target).toBeVisible();
      return;
    }

    const previousLastText = await visibleRows.last().innerText();
    await advanceVirtualList(scroller);
    await expect.poll(async () => visibleRows.last().innerText()).not.toBe(previousLastText);
  }

  throw new Error("evt-0097 was not found after 25 virtual-list advances");
});
\`\`\`

The example expects an application at \`/audit\`, so it belongs in that application's Playwright suite. The helper itself uses documented locator and DOM behavior. Adapt the maximum to known fixture size and viewport window, then include the visible range in the error if your row markup exposes it.

## Recognize end-of-list as a first-class outcome

A search loop must distinguish “not loaded yet” from “does not exist.” Infinite lists should expose an end condition such as an end marker, exhausted cursor, disabled load button, or known total. Without one, a test can only stop at an arbitrary cap and report uncertainty.

| Stop condition | Interpretation | Test response |
|---|---|---|
| Target appears | Search succeeded | Scroll target and continue |
| End marker visible | Target absent from complete dataset | Fail with missing key |
| Last key unchanged after action | Loading stalled or list exhausted | Inspect spinner and request |
| Error panel appears | Backend or rendering failed | Fail with application error |
| Attempt cap reached | Contract gave no conclusive result | Fail with diagnostics |

When you control the product, add accessible status text such as “All 86 results loaded.” It helps users and gives tests a stable observation. Do not expose test-only globals to compensate for an opaque interface if a useful user-facing state can solve both problems.

## Diagnose a list that stops at the same row in CI

Consider a failure where local runs find “Customer 240,” but CI always stops around row 120. The test uses \`page.mouse.wheel(0, 10000)\` ten times and sleeps 500 milliseconds. Screenshots show the same last row and no spinner.

Start by measuring the active scroller. The page window has not moved, but an inner results region owns scrolling. Locally, the pointer happened to rest over that region after a preceding click. In headless CI, layout width moved the region, so wheel events targeted the page body. The fixed sleeps completed successfully while no loading action occurred.

The repair is to locate the results region, perform a direct or user-specific scroll on that element, and wait for its last visible record key to change. Add diagnostics for \`scrollTop\`, \`scrollHeight\`, \`clientHeight\`, first key, and last key. The failure changes from “customer missing after five seconds” to “results region did not advance from customer-120,” which immediately points to scrolling or loading.

## What people get wrong about auto-waiting

Playwright auto-waiting does not invent preconditions. If the target locator matches nothing because scrolling creates it, waiting for that target cannot cause the required scroll. Auto-waiting also does not know that a last-row change represents the business completion of a lazy-load cycle. You must express that condition.

Another mistake is using \`force: true\` on a click after scrolling. Force can bypass actionability checks, but it does not make an obscured or recycled row the right record. It often converts a helpful failure into a click on the wrong visual item. Fix the overlay, locator, or wait instead.

For a broader comparison of test runners and browser-testing ecosystems, see the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). For resilient role, label, text, and test-id choices, continue with the [Playwright locator best practices](/blog/playwright-best-practices-locators-2026).

## Package the algorithm as a domain helper

A generic \`scrollUntilFound(selector)\` helper usually becomes a dumping ground because it cannot know progress, end state, or list identity. Prefer a domain helper such as \`findAuditEvent(id)\` that knows the region, row key, end marker, and diagnostic fields. Keep assertions at the call site when they describe the scenario, but centralize the bounded traversal.

Test the helper against a deterministic fixture with delayed batches, an empty result, a backend error, and a virtualized window. Vary viewport size because it changes intersection and batch behavior. Run at least one project with the production-like browser and responsive breakpoint that matters to the list. A helper proven only against instant local data may still race in CI.

Finally, capture a trace on first retry rather than recording everything forever. The useful evidence is the scroll action, DOM snapshot, requests, and visible state around the point where progress stopped. Combine that with your explicit diagnostic values and lazy-list failures become reproducible engineering problems, not flaky gestures.

## Verify geometry when visibility alone is insufficient

\`toBeVisible()\` answers whether Playwright considers an element visible. It does not assert that the whole row fits inside a particular list viewport, that a sticky toolbar leaves its action button uncovered, or that scrolling has settled after a layout shift. When those details are the feature under test, measure the geometry you actually care about.

Use bounding boxes sparingly because pixel-sensitive assertions can break across fonts, devices, and browser engines. Relative geometry is more robust: the target's top should be at or below the container's top, and its bottom should be at or above the container's bottom. Allow a small documented tolerance only when fractional pixels are expected. If a sticky header occupies part of the region, compare against the header's bottom instead of the container's top.

The following test is self-contained. It scrolls an existing row inside an overflow region, waits for visibility, and checks that the target fits within the region's visible rectangle.

\`\`\`ts
import { test, expect } from "@playwright/test";

test("target row settles inside the list viewport", async ({ page }) => {
  await page.setContent(\`
    <section aria-label="Jobs" style="height:180px;overflow:auto;border:1px solid">
      \${Array.from({ length: 25 }, (_, index) =>
        \`<article style="height:50px">Job \${index + 1}</article>\`
      ).join("")}
    </section>
  \`);

  const region = page.getByRole("region", { name: "Jobs" });
  const target = page.getByText("Job 22", { exact: true });
  await target.scrollIntoViewIfNeeded();
  await expect(target).toBeVisible();

  const geometry = await region.evaluate((container, targetText) => {
    const targetElement = [...container.querySelectorAll("article")]
      .find((element) => element.textContent === targetText);
    if (!targetElement) throw new Error("target row is not attached");
    const containerRect = container.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    return {
      topInside: targetRect.top >= containerRect.top,
      bottomInside: targetRect.bottom <= containerRect.bottom,
    };
  }, "Job 22");

  expect(geometry).toEqual({ topInside: true, bottomInside: true });
});
\`\`\`

Geometry checks are also useful when a row becomes visible, then moves because an image above it receives dimensions or an earlier batch is prepended. In that application, the completion signal should include layout stability meaningful to the user, such as a loading placeholder being replaced or the target remaining inside the viewport across two application events. Avoid polling bounding boxes at extremely short intervals. It creates noise and still cannot explain why the layout moved.

If the list intentionally uses scroll snapping, assert the snapped record identity after the scroll event settles. If it uses smooth scrolling, consider whether animations are disabled in the test environment or whether the user-visible settled state can be awaited. Do not mix a smooth application animation with a fixed 300 millisecond delay. Different CI loads can stretch rendering without changing the product's correctness.

This geometry layer belongs only in tests that protect positioning. A test that needs to click “Job 22” should let the click's actionability and the resulting UI state prove success. Adding rectangles to every scrolling test would couple workflows to layout and create maintenance without additional coverage.

## Frequently Asked Questions

### When should I call locator.scrollIntoViewIfNeeded in a lazy list?

Call it when the locator already matches an attached element and the remaining problem is viewport position. It is also useful for bringing a loading sentinel into view when that sentinel already exists. Do not call it on a target that the application has not rendered yet and expect scrolling to create the target. In that case, scroll the known container or sentinel in bounded steps, wait for a progress signal, and re-check the target locator after each render cycle.

### Is mouse.wheel a reliable way to load every infinite list?

No. Wheel input is valuable when wheel behavior itself is under test, but it depends on pointer position, nested scrollers, layout, and the page's event handling. For setup that merely needs more data, controlling the identified scroll container or sentinel is usually more deterministic. If you do use the mouse, hover the intended region first and assert that a visible range or scroll position advances. A wheel call without a progress assertion can silently affect the wrong element.

### How can I tell whether a list is virtualized?

Inspect the DOM while scrolling. In an append-only list, the number of row nodes generally grows. In a virtualized list, that count stays roughly constant while labels, keys, transforms, or spacer dimensions change. Off-screen records disappear from the DOM, and elements may be reused. Tests should therefore track stable record identities in the visible range, avoid cached element handles, and advance the actual scroll container. Product documentation or the list component's implementation can confirm the behavior.

### What should a lazy-list timeout error include?

Include the target identity, attempt count, active scroll container dimensions, current scroll position, first and last visible record keys, row count, loading-indicator state, end-marker state, and any relevant request failure. Do not dump sensitive row contents. These values separate a wrong container from a stalled request, an exhausted dataset, a recycled virtual row, or an overly small attempt cap. A screenshot and Playwright trace add context, but structured diagnostics often reveal the cause before anyone opens the trace.
`,
};
