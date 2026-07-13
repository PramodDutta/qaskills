import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'HTML5 Drag and Drop with DataTransfer in Playwright',
  description:
    'Implement HTML5 drag and drop with DataTransfer in Playwright, including custom MIME payloads, file drops, event diagnostics, and reliable outcome checks.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# HTML5 Drag and Drop with DataTransfer in Playwright

Inside the drop event, the application asks for application/vnd.inventory-item+json and parses a warehouse identifier. Playwright's locator.dragTo() can perform a physical drag, but it has no argument for that custom payload. To test this interface, create DataTransfer in the page, retain its JavaScript handle, and dispatch the native drag events with that handle attached.

This is an integration between two worlds. Playwright commands run in Node.js, while DataTransfer belongs to the browser execution context. JSHandle bridges them without flattening the object into JSON. The technique is most valuable for custom drop zones, editors, uploads, and boards that implement the HTML Drag and Drop API rather than a pointer-only interaction library.

## Decide whether dragTo or DataTransfer matches the widget

Playwright already offers locator.dragTo(target). Use it first for elements that respond to a normal mouse drag and do not demand application-specific transfer data. It performs a hover, mouse down, movement, and mouse up sequence. That is a good fit for sliders, canvas gestures, and drag libraries driven by pointer events.

DataTransfer dispatch is a different path. It targets code listening for dragstart, dragenter, dragover, drop, and dragend. These handlers may exchange strings by MIME type or accept File objects. Inspect the component or listen to events before choosing.

| Interface implementation | Preferred Playwright mechanism | Why |
|---|---|---|
| Native draggable source with custom MIME data | dispatchEvent plus DataTransfer handle | Carries the exact payload into the drop handler |
| Library based on pointer events | mouse API or locator.dragTo | The library may never read DragEvent.dataTransfer |
| Reorder control with keyboard support | locator.focus and keyboard.press | Covers the accessible interaction contract |
| OS file chooser | locator.setInputFiles | Models selection through an input element |
| Custom file drop surface | DataTransfer containing File objects | Exercises drag-specific validation and presentation |
| Coordinate-sensitive canvas | page.mouse movement sequence | DOM drag events do not describe canvas hit testing |

The two techniques can coexist. One test can validate the custom transfer schema, while another uses a real mouse sequence to catch hitbox or overlay regressions. Do not claim that synthetic dispatch proves pointer geometry or that dragTo proves MIME serialization.

## Carry a browser object through the event sequence

page.evaluateHandle() returns a reference to an object that remains in the page's JavaScript realm. Pass that handle as dataTransfer when dispatching events. The same object should reach every event in one logical drag.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('moves inventory into the selected warehouse', async ({ page }) => {
  await page.goto('/inventory/transfer');

  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.effectAllowed = 'move';
    transfer.setData(
      'application/vnd.inventory-item+json',
      JSON.stringify({ itemId: 'ITEM-88', fromWarehouse: 'LON' }),
    );
    return transfer;
  });

  const source = page.getByTestId('inventory-item-ITEM-88');
  const destination = page.getByTestId('warehouse-BER');

  await source.dispatchEvent('dragstart', { dataTransfer });
  await destination.dispatchEvent('dragenter', { dataTransfer });
  await destination.dispatchEvent('dragover', { dataTransfer });
  await destination.dispatchEvent('drop', { dataTransfer });
  await source.dispatchEvent('dragend', { dataTransfer });

  await expect(destination.getByTestId('inventory-item-ITEM-88')).toBeVisible();
  await expect(page.getByText('Transferred to Berlin warehouse')).toBeVisible();

  await dataTransfer.dispose();
});
\`\`\`

Disposing the handle releases the remote reference. A short test would release it when the page closes anyway, but explicit disposal is good hygiene in a large suite or helper that creates many handles.

dispatchEvent waits for the event listener execution associated with dispatch, not for every asynchronous consequence. Web requests, state reconciliation, and animations may continue. Assert a response, a rendered state, or another observable completion condition. Playwright expectations retry, so a visible success message or settled location is preferable to a timeout.

Playwright documents this DataTransfer construction pattern for Chromium and Firefox. Do not assume the handle-based example will run in WebKit. Keep a project-specific skip with a stated reason, or cover WebKit through a supported pointer path when cross-engine dragging is required.

## Confirm that the source serializes the right payload

Sometimes the source handler, not the test, should populate transfer data. Create an empty object, fire dragstart, then inspect its types and values inside the page. This validates application serialization instead of supplying an ideal payload that production code might never create.

\`\`\`typescript
test('dragstart exposes the document reference consumed by folders', async ({ page }) => {
  await page.goto('/documents');

  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await page.getByTestId('document-DOC-301').dispatchEvent('dragstart', {
    dataTransfer: transfer,
  });

  const captured = await transfer.evaluate((value) => ({
    types: Array.from(value.types),
    reference: value.getData('application/x-document-reference'),
    effectAllowed: value.effectAllowed,
  }));

  expect(captured.types).toContain('application/x-document-reference');
  expect(captured.reference).toBe('DOC-301');
  expect(captured.effectAllowed).toBe('move');

  await transfer.dispose();
});
\`\`\`

Keep protocol assertions focused on public behavior between source and destination. Avoid checking private component state or calling internal handlers. MIME names, serialized values, and accepted operations form a useful browser-level contract because the destination genuinely depends on them.

DataTransfer setData values are strings. If the application transfers structured data, serialize it exactly as production does and test malformed JSON separately. If the handler expects text/uri-list, observe its parsing rules, including whether comments or multiple lines are supported. Exact protocol knowledge is safer than assuming every drag carries text/plain.

## Deliver files to a drop-only surface

When an upload area lacks a file input or has meaningful drag-specific behavior, place browser File objects into DataTransfer.items. Construct them in page.evaluateHandle so they remain valid browser objects.

\`\`\`typescript
test('previews a dropped JSON manifest', async ({ page }) => {
  await page.goto('/releases/import');

  const transfer = await page.evaluateHandle(() => {
    const dataTransfer = new DataTransfer();
    const body = JSON.stringify({ version: '2.4.0', artifacts: ['web.tar.gz'] });
    const file = new File([body], 'release-manifest.json', {
      type: 'application/json',
    });
    dataTransfer.items.add(file);
    return dataTransfer;
  });

  const zone = page.getByTestId('manifest-drop-zone');
  await zone.dispatchEvent('dragenter', { dataTransfer: transfer });
  await expect(zone).toHaveAttribute('data-dragging', 'true');
  await zone.dispatchEvent('dragover', { dataTransfer: transfer });
  await zone.dispatchEvent('drop', { dataTransfer: transfer });

  await expect(page.getByText('release-manifest.json')).toBeVisible();
  await expect(page.getByText('Version 2.4.0')).toBeVisible();

  await transfer.dispose();
});
\`\`\`

If a normal input exists, setInputFiles is more direct for the upload transport. Retain the drop test for behavior unique to dragging, such as active-zone styling, file-count rejection, or directory-drop messaging. Testing the same upload backend repeatedly through both surfaces offers little extra value unless their client paths differ.

File MIME type is supplied by the test and should reflect the case. Applications that validate only the filename need extension cases. Applications that inspect magic bytes require content with those bytes, ideally tested closer to the server parser as well. Browser-side checks cannot establish that an uploaded file is safe.

## Test drop effects and cancellation behavior

HTML drag negotiation has two relevant properties. effectAllowed is normally set by the source and describes permitted operations. dropEffect is chosen for the current target and modifier state. Valid values are constrained by the web platform, so use copy, move, link, or none where appropriate.

A document organizer might copy when dragging from a template gallery and move when dragging from the current folder. Test both business outcomes, not just property assignment. A copy should leave the source and create a destination entry. A move should remove the source only after persistence succeeds.

Drop eligibility frequently depends on dragover calling preventDefault. Synthetic dispatch still invokes that code, but a test that fires drop directly may bypass visual and eligibility logic encoded during dragover. Include dragover unless the destination contract demonstrably does not use it.

You can observe cancellation by adding a temporary capturing listener before interaction:

\`\`\`typescript
const wasCancelled = page.evaluate(() => {
  return new Promise<boolean>((resolve) => {
    const zone = document.querySelector('[data-testid="archive-zone"]');
    zone?.addEventListener(
      'dragover',
      (event) => queueMicrotask(() => resolve(event.defaultPrevented)),
      { once: true },
    );
  });
});

await page.getByTestId('archive-zone').dispatchEvent('dragover', {
  dataTransfer,
});
expect(await wasCancelled).toBe(true);
\`\`\`

Use this as diagnostic or focused contract coverage, not as the only assertion. A handler can cancel correctly and still fail to update the application.

## Add coordinates for insertion algorithms

Sortable lists often calculate an index from clientY relative to child rectangles. dispatchEvent accepts mouse-event initialization fields alongside dataTransfer. Read the target box and choose a position representing the desired insertion boundary.

\`\`\`typescript
const secondRow = page.getByTestId('playlist-row').nth(1);
const box = await secondRow.boundingBox();
if (!box) throw new Error('Second playlist row is not rendered');

await secondRow.dispatchEvent('dragover', {
  dataTransfer,
  clientX: box.x + box.width / 2,
  clientY: box.y + box.height * 0.8,
});
await secondRow.dispatchEvent('drop', {
  dataTransfer,
  clientX: box.x + box.width / 2,
  clientY: box.y + box.height * 0.8,
});
\`\`\`

Be aware of coordinate spaces. boundingBox returns main-frame viewport coordinates and accounts for frame position. DOM DragEvent client coordinates are viewport-relative. For ordinary main-frame elements, these values align. Nested frames and transformed elements deserve a dedicated check.

If physical movement is the feature, use the mouse instead. The [Playwright keyboard and mouse reference](/blog/playwright-keyboard-mouse-interactions-reference) covers stepwise movement and modifier keys. Dispatch is strongest when the event data contract is the risk; mouse control is strongest when hit testing and motion are the risk.

## Assert rejection as carefully as acceptance

A drop zone defines what it refuses. Unsupported MIME types, stale entity versions, excessive file counts, permission failures, and forbidden cross-project moves are all realistic branches.

| Rejection case | Transfer construction | Evidence to collect |
|---|---|---|
| Unknown custom type | Set application/x-unrecognized | No mutation request, rejection copy visible |
| Stale optimistic version | JSON payload with prior version | Conflict message and source restored |
| Copy not permitted | effectAllowed set to move for copy-only zone | Zone remains inactive |
| Multiple files prohibited | Add two File entries | Count-specific validation is rendered |
| Cross-tenant object | Payload identifies another workspace | Authorization response and unchanged target |
| Corrupt structured value | Required MIME type with invalid JSON | Controlled error, no uncaught page exception |

Monitor the mutation endpoint with page.waitForResponse when a request is expected. For a path that must not call the server, attach page.on('request') or route the endpoint and count attempts. Ensure monitoring begins before dispatch so a fast request is not missed.

Also listen for page errors in cases involving malformed payloads. A rejected drag should result in deliberate feedback, not an uncaught JSON parse error that leaves a highlight stuck on screen. The best assertion combines no unauthorized mutation, stable source state, and user-understandable feedback.

## Diagnose synthetic drag discrepancies

The first diagnostic question is whether the app uses native drag events. Search the runtime event path or attach listeners through page.evaluate. If pointerdown and pointermove occur but dragstart never does during a manual operation, DataTransfer dispatch is probably not the appropriate tool.

Next, inspect the receiving node. Event delegation may place the drop listener on a list while the visible card occupies the coordinates. dispatchEvent targets the locator exactly and then bubbles, so a child target can produce a different event.target from dispatching on the container. Match the real DOM path the handler expects.

| Failure signature | Plausible explanation | Next check |
|---|---|---|
| No visual active state | dragenter targets the wrong node | Inspect listeners and event.target |
| Active state never clears | dragleave or drop cleanup did not execute | Verify final event and handler exception |
| Correct type, empty value | Source overwrote or cleared data | Inspect immediately after dragstart |
| Request succeeds, UI stays old | Cache or state reconciliation issue | Await response and inspect client update |
| Works in Chromium only | Engine-specific DataTransfer behavior | Run focused project matrix and reduce assumptions |
| Event listener ignores dispatch | Code checks event.isTrusted | Cover logic below UI and keep manual trust-boundary validation |

Synthetic events have isTrusted=false. Playwright cannot turn a script-dispatched event into a trusted browser event. Most application drop handlers should not depend on trust, but security-sensitive software may. Do not remove such a guard just to satisfy a test without reviewing its purpose.

Trace Viewer is useful here because it preserves DOM snapshots, network activity, and test actions. Add temporary in-page logging of event types and transfer types when needed. Keep the final spec free of broad timeouts. Auto-waiting and web-first assertions provide better synchronization.

## Structure helpers around the transfer protocol

A generic drag(source, target) helper is too vague for a payload-dependent application. Instead, expose intent: createInventoryTransfer(item), createDocumentReference(id), or dropManifest(fileSpec). Typed helper parameters make the MIME schema visible and stop unrelated scenarios from quietly diverging.

Keep locators in the scenario or a focused page object. Let helpers create and dispose handles with try/finally if they own the lifecycle. Do not return a disposed handle or leak hundreds across a worker.

Separate three levels of confidence:

1. Component tests enumerate handler branches and visual drag states.
2. Playwright protocol tests verify source serialization, destination acceptance, and persistence.
3. A small interaction test uses dragTo or page.mouse when pointer hit testing matters.

This layered design is more diagnostic than repeating a long event sequence for every entity. It also allows browser coverage to be proportional to risk. DataTransfer implementation details can vary across engines, so run at least a representative cross-browser set when drag and drop is business-critical. The [Playwright best practices guide](/blog/playwright-best-practices-2026) discusses project matrices, resilient locators, and trace-first troubleshooting.

Accessible alternatives require their own cases. A keyboard reorder command may update the same model but travels through different focus, announcement, and shortcut logic. A successful DataTransfer scenario says nothing about those semantics.

## Respect navigation and handle lifetime

A JSHandle belongs to the execution context that created it. Full-page navigation destroys that context, so a DataTransfer created before navigation cannot be used afterward. Create the handle only after page.goto and any redirect chain has settled. If the drop action itself navigates, do not attempt to inspect or dispose the old object through evaluation after the context disappears. Page closure will release it.

Single-page application route changes usually preserve the main context, but component replacement can invalidate locators. Resolve source and destination after the interface reaches its ready state. Playwright locators re-resolve elements for each action, whereas an ElementHandle points to one DOM node that may have been detached. That makes locators preferable for the event sequence.

Popup destinations pose a different boundary. A browser drag cannot carry a script-created DataTransfer between separate pages by passing one handle. Test the source serialization in its page and the destination acceptance with a new page-local object, then keep a manual or pointer-level check if cross-window dragging is a supported product feature.

Helpers should use try/finally when disposal can occur in the same context. If the action may navigate, catch the context-destroyed condition only around cleanup, not around assertions. Broadly suppressing evaluation errors can hide that navigation happened too early or the wrong element handled the drop.

## Frequently Asked Questions

### Why not always use locator.dragTo()?

dragTo models pointer movement and is concise when the widget reacts to mouse input. It does not let you populate arbitrary MIME entries or attach File objects. Choose DataTransfer dispatch when the destination reads that browser object.

### Why is evaluateHandle required instead of page.evaluate?

page.evaluate serializes its return value, and DataTransfer is not meaningfully represented as JSON. evaluateHandle keeps a reference to the live object in the page, which can then be supplied to dispatchEvent and inspected later.

### Can one DataTransfer handle be reused for several independent drags?

Create a new handle for each logical operation. Reuse within the events of one drag, then dispose it. Carrying types or items into a later scenario can conceal missing setup and does not resemble a new user gesture.

### How do I test a drop target inside an iframe?

Use a FrameLocator to locate the target, but create the DataTransfer in the same frame's execution context when possible. Objects belong to a JavaScript realm, and cross-frame transfer of handles may not behave as expected.

### Does dispatchEvent prove that a user can physically reach the drop zone?

No. It verifies event handling and payload behavior on the selected element. Add a pointer-driven case for overlays, hitboxes, scrolling, and movement if those are material risks to the interface.
`,
};
