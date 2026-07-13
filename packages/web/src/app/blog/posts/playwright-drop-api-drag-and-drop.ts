import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright drop() API: Testing Drag and Drop the Modern Way',
  description:
    'Test drag and drop in Playwright with the new locator.drop() API, dragTo(), and manual mouse control. Covers kanban boards, sortable lists, file drops, and flakiness fixes.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Playwright drop() API: Testing Drag and Drop the Modern Way

Drag and drop is one of the most satisfying interactions to build and one of the most miserable to test. A kanban card that snaps into a new column, a sortable to-do list that reshuffles, a file you toss onto an upload zone: users love these gestures, and automated tests hate them. The reason is simple. "Drag and drop" is not one thing. It is a family of implementations (native HTML5 drag events, pointer-driven libraries, custom mouse handlers) and each one listens for a different sequence of browser events.

Playwright 1.60 shipped a new \`locator.drop()\` method that makes the most common case dramatically cleaner, and it sits alongside the older \`dragTo()\` helper and the fully manual mouse API. This tutorial walks through all three approaches with runnable TypeScript, shows exactly when each one works and when it fails, and gives you a repeatable recipe for killing the flakiness that plagues drag-and-drop suites. If you are catching up on the release, our overview of [what's new in Playwright 2026](/blog/whats-new-playwright-2026) puts \`drop()\` in context alongside the other 1.60 features.

## Why drag and drop is hard to automate

A human drag is continuous: you press, you move a few hundred pixels while the browser fires dozens of intermediate events, and you release. The DOM under the hood may be reacting to any of several different event streams:

- **HTML5 native drag** uses \`dragstart\`, \`drag\`, \`dragenter\`, \`dragover\`, \`drop\`, and \`dragend\`. Elements opt in with the \`draggable="true"\` attribute, and data rides along in a \`DataTransfer\` object.
- **Mouse or pointer based drag** (used by libraries like the modern successors to react-beautiful-dnd, SortableJS, and most canvas apps) ignores HTML5 drag events entirely. It listens for \`mousedown\`, a stream of \`mousemove\` events, and \`mouseup\`, then repositions elements itself.
- **Pointer Events** drag is the same idea but using \`pointerdown\`, \`pointermove\`, and \`pointerup\`, which unifies mouse, touch, and pen.

If your test simulates the wrong event family, nothing happens. The card does not move, no error is thrown, and your assertion fails with a cryptic "expected element in column B" message. That is why the single most important step is identifying which implementation you are testing before you write a line of code. Open DevTools, inspect the draggable element for a \`draggable\` attribute, and check the library. If \`draggable="true"\` is present, you are almost certainly in HTML5 territory. If not, you need mouse or pointer simulation.

There is a second, subtler reason drag tests break: distance and timing thresholds. Many libraries intentionally ignore tiny movements so that an accidental one-pixel drag during a click is not treated as a real drag. They wait until the pointer has traveled some minimum distance, often five to ten pixels, before they enter drag mode. A high level helper that jumps straight from source to target in a single logical step can undershoot that threshold, and the library never activates. This is why so many "the API does nothing" reports resolve once intermediate movement is added. Keep both dimensions in mind as you read the approaches below: the event family decides whether the library listens at all, and the movement pattern decides whether it believes the gesture is real.

One more practical note before the code. Drag and drop is inherently stateful across three moments: the press, the travel, and the release. A test that asserts only the final position tells you the drop worked but not why it failed when it does. When you are debugging, it helps to assert intermediate state too, for example that a drag placeholder appeared after the press, so you know exactly which of the three moments broke. The Trace Viewer, covered later, makes those intermediate moments visible frame by frame.

## The three approaches at a glance

Playwright gives you three tools for the job. Here is how they compare.

| Approach | API | Event family driven | Best for | Control level |
| --- | --- | --- | --- | --- |
| \`drop()\` | \`target.drop(source)\` or \`source.dragTo(target)\` | HTML5 drag + mouse fallback | Kanban, sortable lists, most component libraries | Low, high level |
| \`dragTo()\` | \`source.dragTo(target)\` | HTML5 drag + mouse | Same as above, source-first phrasing | Low, high level |
| Manual mouse | \`hover\` / \`mouse.down\` / \`mouse.move\` / \`mouse.up\` | Raw mouse or pointer | Custom handlers, precise offsets, momentum, canvas | High, full control |

The rule of thumb: reach for \`drop()\` or \`dragTo()\` first. Drop to the manual mouse API only when the high level helpers fail, which happens more often than the docs admit for libraries that require intermediate \`mousemove\` events or a minimum drag distance.

## Approach 1: the new locator.drop() API

The \`drop()\` method reads naturally: you call it on the **target** and pass the **source**. It performs a full drag sequence, dispatching both HTML5 drag events and mouse events so it covers the majority of real world components without configuration.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('move a card into the Done column with drop()', async ({ page }) => {
  await page.goto('/board');

  const card = page.getByTestId('card-write-tests');
  const doneColumn = page.getByTestId('column-done');

  // Read the target: "drop the card onto the Done column".
  await doneColumn.drop(card);

  await expect(doneColumn.getByTestId('card-write-tests')).toBeVisible();
  await expect(page.getByTestId('column-todo').getByTestId('card-write-tests')).toHaveCount(0);
});
\`\`\`

The mental model is worth internalizing: \`target.drop(source)\` mirrors the English sentence "drop the source onto the target." That is the inverse of \`dragTo()\`, which reads "drag the source to the target." Both end in the same place; pick whichever phrasing makes the test read cleanly to your team and stay consistent.

\`drop()\` accepts a \`sourcePosition\` and \`targetPosition\` so you can control exactly where within each element the press and release happen. This matters for sortable lists where dropping on the top half of an item versus the bottom half decides the insertion index.

\`\`\`ts
test('insert above the second item using targetPosition', async ({ page }) => {
  await page.goto('/sortable');

  const dragged = page.getByRole('listitem').filter({ hasText: 'Task A' });
  const target = page.getByRole('listitem').filter({ hasText: 'Task C' });

  // Release near the top edge of Task C so Task A lands above it.
  await target.drop(dragged, { targetPosition: { x: 20, y: 4 } });

  const order = await page.getByRole('listitem').allInnerTexts();
  expect(order.indexOf('Task A')).toBeLessThan(order.indexOf('Task C'));
});
\`\`\`

## Approach 2: the classic dragTo()

\`dragTo()\` has been in Playwright for years and is the source-first sibling of \`drop()\`. Functionally the two overlap heavily; \`dragTo()\` is worth knowing because most existing suites and Stack Overflow answers use it, and because its options object is where you configure \`force\` and positions.

\`\`\`ts
test('reorder a list with dragTo()', async ({ page }) => {
  await page.goto('/sortable');

  const first = page.getByRole('listitem').nth(0);
  const third = page.getByRole('listitem').nth(2);

  await first.dragTo(third);

  await expect(page.getByRole('listitem').nth(2)).toHaveText('Task A');
});
\`\`\`

When a library only reacts after the pointer physically enters the drop zone, add \`force: true\` to skip actionability checks that can stall on overlapping drag ghosts, and pass explicit positions so the release lands inside the target's hit area.

\`\`\`ts
test('force a drag into an overlapped drop zone', async ({ page }) => {
  await page.goto('/board');

  const card = page.getByTestId('card-1');
  const column = page.getByTestId('column-review');

  await card.dragTo(column, {
    force: true,
    sourcePosition: { x: 10, y: 10 },
    targetPosition: { x: 30, y: 30 },
  });

  await expect(column.getByTestId('card-1')).toBeVisible();
});
\`\`\`

## Approach 3: manual mouse control for full precision

When the high level helpers do not trigger a library, the manual mouse API is your escape hatch. You reproduce the human gesture step by step: hover the source, press the button, move in one or more increments, then release. The critical insight is that many pointer-based libraries require **at least one intermediate \`mousemove\`** and often a minimum drag distance before they treat the gesture as a real drag rather than a click.

\`\`\`ts
test('manual mouse drag with intermediate moves', async ({ page }) => {
  await page.goto('/board');

  const card = page.getByTestId('card-1');
  const target = page.getByTestId('column-done');

  const cardBox = await card.boundingBox();
  const targetBox = await target.boundingBox();
  if (!cardBox || !targetBox) throw new Error('elements not visible');

  // Press in the center of the card.
  await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
  await page.mouse.down();

  // Move in steps so the library registers a real drag, not a click.
  await page.mouse.move(cardBox.x + 40, cardBox.y + 40, { steps: 5 });
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height / 2,
    { steps: 10 },
  );

  await page.mouse.up();

  await expect(target.getByTestId('card-1')).toBeVisible();
});
\`\`\`

The \`steps\` option interpolates the movement into that many discrete \`mousemove\` events. Five to ten steps is usually enough. Some libraries also want a brief settle between \`mousedown\` and the first move; if a drag still will not start, insert a \`await page.mouse.move(x, y)\` a few pixels away before the big move to cross the activation threshold.

## Approach 4: HTML5 native drag with a synthetic DataTransfer

Pure HTML5 drag components read data out of a \`DataTransfer\` object. The high level helpers handle this, but some strict implementations check for specific data types or a payload, and there you dispatch the events yourself. This is the lowest level path and you rarely need it, but it is the definitive tool for a native \`draggable="true"\` widget that ignores everything else.

\`\`\`ts
test('native HTML5 drag with a synthetic DataTransfer', async ({ page }) => {
  await page.goto('/native-dnd');

  const source = page.getByTestId('drag-source');
  const target = page.getByTestId('drop-target');

  // Create a DataTransfer inside the page and thread it through the events.
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());

  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.dispatchEvent('dragover', { dataTransfer });
  await target.dispatchEvent('drop', { dataTransfer });
  await source.dispatchEvent('dragend', { dataTransfer });

  await expect(target).toContainText('Dropped');
});
\`\`\`

Dispatching events bypasses Playwright's actionability checks entirely, so it is fast and immune to overlap issues, but it is also the least faithful to a real user because no pixels actually move. Use it as a targeted fix, not a default.

A common gotcha with the native path is forgetting the \`dragover\` event. The HTML5 spec requires the drop target to call \`preventDefault()\` inside its \`dragover\` handler to signal that it accepts the drop; if you skip dispatching \`dragover\`, a strictly-compliant target rejects the subsequent \`drop\` and your test silently fails. When a synthetic native drag does nothing, the first thing to check is whether every event in the sequence (\`dragstart\`, \`dragenter\`, \`dragover\`, \`drop\`, \`dragend\`) is present and dispatched on the correct element. The source fires \`dragstart\` and \`dragend\`; the target fires \`dragenter\`, \`dragover\`, and \`drop\`. Mixing those up is the number one cause of native drag tests that appear to run but change nothing on screen.

## File drag and drop onto an upload zone

Dropping a file is a special case of native drag: the \`DataTransfer\` carries a \`File\` object rather than text. Many upload widgets accept both a hidden \`<input type="file">\` and a drop zone. If your only goal is to attach the file, prefer \`setInputFiles\` because it is rock solid. Use a synthetic drop only when the app's logic specifically lives in the \`drop\` handler.

\`\`\`ts
import { test, expect } from '@playwright/test';
import fs from 'node:fs';

test('drop a file onto the upload zone', async ({ page }) => {
  await page.goto('/upload');

  const buffer = fs.readFileSync('tests/fixtures/report.pdf');
  const dropZone = page.getByTestId('drop-zone');

  const dataTransfer = await page.evaluateHandle((data) => {
    const dt = new DataTransfer();
    const file = new File([new Uint8Array(data)], 'report.pdf', { type: 'application/pdf' });
    dt.items.add(file);
    return dt;
  }, Array.from(buffer));

  await dropZone.dispatchEvent('dragenter', { dataTransfer });
  await dropZone.dispatchEvent('drop', { dataTransfer });

  await expect(page.getByText('report.pdf')).toBeVisible();
});

test('the simpler path: setInputFiles', async ({ page }) => {
  await page.goto('/upload');
  await page.getByTestId('file-input').setInputFiles('tests/fixtures/report.pdf');
  await expect(page.getByText('report.pdf')).toBeVisible();
});
\`\`\`

## Choosing an approach: when each one fails

No single method wins everywhere. This table maps common failure symptoms to the approach that fixes them.

| Symptom | Likely cause | Approach that works |
| --- | --- | --- |
| \`drop()\` runs but the card does not move | Library needs intermediate mousemoves | Manual mouse with \`steps\` |
| Nothing happens on a \`draggable="true"\` widget | Strict DataTransfer check | Native \`dispatchEvent\` with DataTransfer |
| Drag starts but never releases in the target | Drag ghost overlaps the drop zone | \`dragTo\` with \`force: true\` and \`targetPosition\` |
| Drop lands in the wrong list position | Insertion index depends on release Y | \`targetPosition\` fine-tuning |
| Works headed, fails headless | Timing or animation not settled | Add settle wait, disable animations |
| File drop handler never fires | Using \`setInputFiles\` on a drop-only widget | Synthetic \`DataTransfer\` with a \`File\` |

## Fixing drag-and-drop flakiness

Flaky drag tests almost always trace to one of four root causes. Work through them in order.

**1. Animations that have not finished.** CSS transitions on cards mean the element is still moving when your assertion runs. Disable animations globally in your test setup so positions are deterministic.

\`\`\`ts
test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  });
});
\`\`\`

**2. Asserting too early.** After the drop, wait for the observable end state, never a fixed timeout. Playwright's web-first assertions retry automatically, so assert on the DOM result rather than sleeping.

\`\`\`ts
// Good: retries until the card appears in the new column.
await expect(page.getByTestId('column-done').getByTestId('card-1')).toBeVisible();

// Bad: guesses at timing and will flake under load.
await page.waitForTimeout(500);
\`\`\`

**3. Missing intermediate moves.** As covered above, add \`steps\` to \`mouse.move\` so the library sees a continuous gesture.

**4. Scroll and viewport.** If the target column is off screen, the drop misses. Scroll the target into view first, or use \`drop()\` which auto-scrolls, and keep a stable viewport size in your config. When your app leans on the accessibility tree to expose drag state, our [ARIA snapshot testing guide](/blog/playwright-aria-snapshot-testing-guide) shows how to assert the resulting structure without brittle selectors.

## Cross-browser notes

Drag and drop behaves subtly differently across the three engines Playwright drives. Chromium is the most forgiving and both \`drop()\` and manual mouse simulation work reliably. WebKit is stricter about the activation distance for pointer-based libraries, so intermediate moves matter more there. Firefox historically had the shakiest native HTML5 drag support, and dispatching synthetic events is often more reliable than the high level helpers on Firefox for pure native widgets.

| Engine | \`drop()\` reliability | Manual mouse | Native dispatch | Note |
| --- | --- | --- | --- | --- |
| Chromium | High | High | High | Best default target |
| WebKit | Medium to high | High | High | Needs activation distance |
| Firefox | Medium | High | High | Prefer dispatch for native DnD |

Run your drag suite across all three in CI rather than trusting Chromium alone. A test that passes headed on your Mac can fail headless on a Linux runner, and the cross-browser matrix is where those gaps surface.

Device emulation adds another wrinkle. If you emulate a mobile device, Playwright switches to touch input, and drag-and-drop libraries that only bound mouse handlers will not respond to touch gestures at all. For touch-based drag you use \`page.touchscreen\` or the pointer helpers with \`hasTouch: true\` on the context, and you should verify separately from your desktop suite because the code paths inside most libraries are genuinely different. Do not assume a green desktop drag test means the mobile gesture works; test it explicitly if your app supports touch reordering.

## Putting it together: a reusable helper

For a large suite, wrap the fallback logic in one helper so individual tests stay readable. Try the high level API first and fall back to the manual gesture only when needed.

\`\`\`ts
import { type Page, type Locator } from '@playwright/test';

export async function robustDrag(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('drag endpoints not visible');

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2 + 20, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
}
\`\`\`

You can browse ready-made Playwright interaction skills, including drag-and-drop page objects, in the [QA skills catalog](/skills) to bootstrap your suite instead of writing every helper from scratch. If you drive Playwright through an AI agent, the patterns in our [MCP server testing guide](/blog/mcp-server-testing-guide-2026) pair well with these gestures.

## Frequently Asked Questions

### What is the difference between drop() and dragTo() in Playwright?

They perform the same drag sequence but read in opposite directions. \`target.drop(source)\` is called on the destination and reads "drop the source onto the target," while \`source.dragTo(target)\` is called on the item and reads "drag the source to the target." Both dispatch HTML5 and mouse events. Choose whichever phrasing makes your tests clearest and use it consistently across the suite.

### Why does my drag test pass headed but fail headless?

The usual cause is timing. In headed mode the extra rendering latency accidentally gives the library enough time to register the gesture, while headless runs faster and drops the intermediate events. Disable CSS animations, add \`steps\` to your \`mouse.move\` calls, and replace fixed \`waitForTimeout\` calls with retrying \`expect\` assertions on the final DOM state. Those three changes fix the large majority of headless-only failures.

### How do I test file drag and drop in Playwright?

For most upload widgets, use \`setInputFiles\` on the hidden \`<input type="file">\` because it is the most reliable path. Only reach for a synthetic drop when the app's logic lives specifically in the \`drop\` handler. In that case, build a \`DataTransfer\` inside \`page.evaluateHandle\`, add a \`File\` to it, and dispatch \`dragenter\` and \`drop\` on the drop zone with that handle.

### Does Playwright's drop() work for HTML5 native drag and drop?

Yes for the common case. \`drop()\` dispatches both HTML5 drag events and mouse events, so it handles most \`draggable="true"\` widgets out of the box. Strict native components that check for a specific \`DataTransfer\` payload can still ignore it, and there you dispatch \`dragstart\`, \`dragover\`, \`drop\`, and \`dragend\` yourself with a synthetic \`DataTransfer\` handle for full control.

### Why does nothing happen when I call dragTo on a sortable list?

Many pointer-based libraries require at least one intermediate \`mousemove\` and a minimum drag distance before they treat the action as a drag. A single high level call can move too directly for them. Switch to the manual mouse API, add several \`steps\` to the movement, and move a few pixels away from the start position first to cross the library's activation threshold.

### How do I control where an item drops in a sorted list?

Use the \`targetPosition\` option to control the release point within the target element. Sortable lists compute the insertion index from where you release along the target's vertical axis, so dropping near the top edge inserts above and near the bottom inserts below. Pass a small \`y\` value like 4 for above and a value near the item's height for below, then assert on the resulting order.

### Should I disable animations in drag-and-drop tests?

Yes. CSS transitions mean elements are still moving when your assertions run, which produces intermittent failures and wrong position reads. Inject a global stylesheet in \`beforeEach\` that sets \`transition\` and \`animation\` to \`none\` on every element. This makes positions deterministic without changing the logic you are testing and removes one of the most common sources of drag-and-drop flakiness.
`,
};
