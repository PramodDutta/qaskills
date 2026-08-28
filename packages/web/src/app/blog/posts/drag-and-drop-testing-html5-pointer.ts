import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Drag and Drop: HTML5 Events, Pointer Fallbacks, and Reordering',
  description: 'Drag and drop testing guide for HTML5 events, pointer fallbacks, and sortable reordering so QA teams catch broken uploads and list moves early.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Drag and Drop: HTML5 Events, Pointer Fallbacks, and Reordering

Drag and drop testing proves that a user can grab an item, move it over a valid target, release it, and get the exact state change the product promises. For QA engineers, the practical answer is to test both paths: native HTML5 drag events with a real \`DataTransfer\` object, and pointer or mouse fallback behavior for custom sortable widgets that do not use the browser's native drag pipeline.

The hard part is not making the item move once on your laptop. The hard part is proving that uploads, canvas targets, nested drop zones, virtualized lists, keyboard alternatives, rejected file types, and optimistic reorder saves all behave consistently across browsers and CI.

## The Contract Behind a Drag Gesture

A drag gesture is a contract between input, hit testing, state, and persistence. The test should name which contract it is checking before it sends a single event. Native file upload by drag is different from dragging a Kanban card. A rich text editor dragging selected content is different again. Treating all of them as one category is how suites become flaky and still miss bugs.

For product testing, split the behavior into four observable promises:

| Promise | Observable signal | Common failure |
| --- | --- | --- |
| Pickup | Source enters dragging state, cursor or class changes, accessible state updates | The test moves too fast and never starts a drag |
| Targeting | Valid targets highlight, invalid targets reject the payload | Coordinates hit a child element instead of the drop zone |
| Drop | Payload is accepted, transformed, or rejected according to rules | \`drop\` fires without \`dragover.preventDefault()\` in app code |
| Commit | UI state persists to local state, API, storage, or DOM order | Optimistic reorder looks right until reload |

Native HTML5 drag and drop uses events such as \`dragstart\`, \`dragenter\`, \`dragover\`, \`drop\`, and \`dragend\`. The payload travels through a \`DataTransfer\` object. Custom pointer implementations listen to \`pointerdown\`, \`pointermove\`, and \`pointerup\`, often with a movement threshold before the drag officially starts. Selenium, Playwright, Cypress, and WebDriver BiDi can all interact with parts of this stack, but they do not all synthesize the same browser internals.

That distinction matters. If your component listens for HTML5 drag events, low-level pointer movement may never populate \`dataTransfer\`. If your component uses pointer events, dispatching a synthetic \`drop\` may bypass the actual sortable logic. The right test tool depends on the implementation contract, not the label on the feature.

For teams that already maintain interaction coverage, keep drag cases near adjacent input tests. A drag suite pairs naturally with [Playwright keyboard and mouse interactions reference](/blog/playwright-keyboard-mouse-interactions-reference) because the same locator stability and timing rules apply. It also sits beside [clipboard interactions testing permissions](/blog/clipboard-interactions-testing-permissions) when the product moves structured data between browser APIs rather than simple clicks.

## Identify the Implementation Before Choosing the Test

Start by inspecting the UI behavior, not the framework. A React component may use native \`draggable\`; another React component may use pointer events through a sortable library. The same visual gesture can have completely different event requirements.

Use DevTools or a quick instrumentation test to answer these questions:

| Question | Native HTML5 answer | Pointer sortable answer |
| --- | --- | --- |
| Does the source have \`draggable="true"\`? | Usually yes | Usually no |
| Is \`dataTransfer\` read or written? | Yes | Rarely |
| Does movement start after a small threshold? | Browser-controlled | Library-controlled |
| Does it support files from the OS? | Yes, through \`DataTransfer.files\` | No, unless custom code handles it |
| Can the order change without a \`drop\` event? | Usually no | Often yes |

A fast way to learn is to add temporary event logging in a local branch or use the browser console. Do not ship the logger. The point is to avoid writing a test that "passes" by cheating around the real implementation.

\`\`\`js
const events = [
  'dragstart',
  'dragenter',
  'dragover',
  'drop',
  'dragend',
  'pointerdown',
  'pointermove',
  'pointerup'
];

for (const eventName of events) {
  document.addEventListener(
    eventName,
    (event) => {
      console.log(eventName, event.target && event.target.id);
    },
    true
  );
}
\`\`\`

If the console shows \`dragstart\` followed by \`drop\`, write an HTML5 drag test. If it shows pointer events and transforms while the pointer moves, write a pointer test. If it shows both, separate them: one test should verify native payload acceptance and one should verify pointer reordering. Mixed implementations are common in page builders, file managers, and design tools.

What people get wrong in practice: they test the final DOM order only. That catches the easy happy path and misses the contract users feel. A broken hover target, missing reject state, or failed keyboard alternative can leave the final order correct in a scripted test while the real UI is unusable.

## Native HTML5 Drag Tests With DataTransfer

Native HTML5 drag tests should create a real \`DataTransfer\` in the browser context, attach the payload, and dispatch the sequence the application expects. For file drops, use a \`File\` object. For structured internal drags, set a MIME type that matches production code.

The browser allows a drop only when the target cancels the default behavior during \`dragover\`. That is not a trivia detail. It is the reason many synthetic tests look correct while real users cannot drop. Your test should exercise \`dragover\` before \`drop\` unless your automation API already does that with a real gesture.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('accepts a text card through native drag events', async ({ page }) => {
  await page.goto('/board');

  const result = await page.evaluate(() => {
    const source = document.querySelector('[data-testid="card-a"]');
    const target = document.querySelector('[data-testid="done-column"]');

    if (!(source instanceof HTMLElement) || !(target instanceof HTMLElement)) {
      throw new Error('Drag source or target was not found');
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', 'card-a');

    source.dispatchEvent(new DragEvent('dragstart', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));

    target.dispatchEvent(new DragEvent('dragenter', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));

    target.dispatchEvent(new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));

    // dispatchEvent returns FALSE when a handler called preventDefault,
    // which is exactly what a drop handler does to accept the drop.
    const dropAccepted = !target.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));

    source.dispatchEvent(new DragEvent('dragend', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));

    return { dropAccepted };
  });

  expect(result.dropAccepted).toBe(true);
  await expect(page.getByTestId('done-column')).toContainText('Card A');
});
\`\`\`

That test is intentionally explicit. It is not the only style, but it makes the payload and event order visible. For a component library, I prefer this kind of contract test over a single opaque helper because failures point to the exact boundary: source, target, payload, or commit.

For file drops, assert the preview and the backing input or upload request. A preview alone can be a lie if the app shows the dropped file name but never sends it.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('drops a png file into the upload zone', async ({ page }) => {
  await page.goto('/profile');

  const uploadRequest = page.waitForRequest((request) => {
    return request.url().includes('/api/avatar') && request.method() === 'POST';
  });

  await page.evaluate(() => {
    const zone = document.querySelector('[data-testid="avatar-drop-zone"]');

    if (!(zone instanceof HTMLElement)) {
      throw new Error('Upload drop zone was not found');
    }

    const file = new File(['fake image bytes'], 'avatar.png', {
      type: 'image/png'
    });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    zone.dispatchEvent(new DragEvent('dragenter', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));

    zone.dispatchEvent(new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));

    zone.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));
  });

  await expect(page.getByText('avatar.png')).toBeVisible();
  await uploadRequest;
});
\`\`\`

Official browser behavior is documented at https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API and the \`DataTransfer\` details are at https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer. Use those docs when developers argue that a synthetic click should be enough for a drag feature. It is not.

## Pointer Fallbacks for Sortable Interfaces

Pointer-based drag is common in modern boards, menu builders, playlist editors, and grid layouts. These widgets often avoid native HTML5 drag because native drag has inconsistent previews, awkward touch support, and poor control over transforms. Testing them means moving the pointer like a person would.

The mechanics are simple: find the source bounding box, press near its center or handle, move enough to pass the library's activation threshold, move over the target position, then release. The details are where flakiness lives.

| Detail | Bad test | Better test |
| --- | --- | --- |
| Start point | Clicks the top-left corner | Starts on the drag handle or center |
| Movement | Jumps directly to target | Moves in steps with a threshold-crossing move |
| Target | Uses fixed screen coordinates | Computes boxes from locators |
| Assertion | Checks item text exists | Checks ordered list of IDs and persisted save |

\`\`\`ts
import { test, expect } from '@playwright/test';

test('reorders tasks with pointer movement', async ({ page }) => {
  await page.goto('/tasks');

  const firstHandle = page.getByTestId('task-alpha-handle');
  const thirdRow = page.getByTestId('task-charlie-row');

  const sourceBox = await firstHandle.boundingBox();
  const targetBox = await thirdRow.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Could not measure drag source or target');
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height - 8;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 12);
  await page.mouse.move(endX, endY, { steps: 8 });
  await page.mouse.up();

  await expect(page.getByTestId('task-list')).toHaveAttribute(
    'data-order',
    'bravo,charlie,alpha'
  );
});
\`\`\`

That first small move is not decorative. Many libraries require movement of 4 to 10 pixels before activating a drag. A direct teleport to the final coordinate can skip over internal states. If you only reproduce the final coordinate, you are not testing a drag gesture; you are testing a lucky implementation path.

Touch support deserves its own run when mobile matters. Pointer events unify mouse, pen, and touch in the platform, but test libraries may still need browser contexts with touch enabled. Do not claim mobile drag coverage from a desktop mouse test unless the code path is demonstrably shared.

\`\`\`ts
import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['Pixel 7'],
  hasTouch: true
});

test('moves a dashboard tile on a touch viewport', async ({ page }) => {
  await page.goto('/dashboard');

  const tile = page.getByTestId('tile-revenue');
  const target = page.getByTestId('slot-bottom-left');

  const tileBox = await tile.boundingBox();
  const targetBox = await target.boundingBox();

  if (!tileBox || !targetBox) {
    throw new Error('Could not measure tile or target slot');
  }

  await page.touchscreen.tap(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2);
  await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 10
  });
  await page.mouse.up();

  await expect(page.getByTestId('slot-bottom-left')).toContainText('Revenue');
});
\`\`\`

If that looks odd, it is because browser automation touch APIs are still less expressive than mouse APIs in many stacks. For critical mobile drag, supplement browser tests with component-level pointer event tests and at least one manual or device-lab check before large releases.

## Reordering Tests Need State Assertions

Reordering is not done when pixels move. It is done when the product's source of truth records the new order and reload reproduces it. A good drag and drop testing suite checks immediate order, network payload, and post-reload order for at least one key path.

Here is a focused Playwright pattern that captures the save request and verifies the order without depending on fragile animation timing:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('saves reordered checklist items', async ({ page }) => {
  await page.goto('/checklist/42');

  const savePromise = page.waitForRequest((request) => {
    if (!request.url().includes('/api/checklists/42/items/reorder')) {
      return false;
    }

    return request.method() === 'POST';
  });

  const handle = page.getByTestId('item-login-tests-handle');
  const destination = page.getByTestId('item-payment-tests-row');

  const start = await handle.boundingBox();
  const end = await destination.boundingBox();

  if (!start || !end) {
    throw new Error('Could not measure checklist drag elements');
  }

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2 + 16);
  await page.mouse.move(end.x + end.width / 2, end.y + end.height + 4, { steps: 12 });
  await page.mouse.up();

  const request = await savePromise;
  const body = request.postDataJSON() as { orderedIds: string[] };

  expect(body.orderedIds).toEqual(['signup-tests', 'payment-tests', 'login-tests']);
  await page.reload();
  await expect(page.getByTestId('checklist-order')).toHaveText(
    'Signup tests, Payment tests, Login tests'
  );
});
\`\`\`

Do not assert by index alone if the list can filter or virtualize. Prefer stable IDs exposed in data attributes or accessible labels. In virtualized lists, rows outside the viewport do not exist in the DOM, so a "move item from row 2 to row 100" test has to scroll deliberately and assert against the model or API response.

For lists with optimistic updates, add a failed-save case. Users remember when the UI quietly lies. Mock a server rejection and assert that the list either rolls back or shows a retry state, whichever the product promised.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('shows rollback when reorder save fails', async ({ page }) => {
  await page.route('/api/lists/7/reorder', async (route) => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'List changed on the server' })
    });
  });

  await page.goto('/lists/7');

  const handle = page.getByTestId('row-delta-handle');
  const target = page.getByTestId('row-alpha');
  const sourceBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Could not measure row drag elements');
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y - 8, { steps: 8 });
  await page.mouse.up();

  await expect(page.getByRole('alert')).toContainText('List changed on the server');
  await expect(page.getByTestId('list-order')).toHaveText('Alpha, Bravo, Charlie, Delta');
});
\`\`\`

## Drop Zones, Files, and Rejection Paths

File drop testing should spend as much time on rejection as acceptance. Upload bugs often hide in edges: zero-byte files, multiple files when only one is allowed, unsupported MIME types, oversized files, folders, and files with names that need escaping in the UI.

Build a matrix before automating. It keeps product rules separate from browser mechanics.

| Case | Test data | Expected result |
| --- | --- | --- |
| Valid single file | \`invoice.pdf\`, \`application/pdf\` | Queued or uploaded |
| Wrong type | \`avatar.exe\`, \`application/octet-stream\` | Rejected with clear message |
| Too large | Synthetic size over limit | Rejected before upload if possible |
| Multiple files | Two valid files | Accepted or rejected according to product rule |
| Duplicate file | Same name and size twice | Deduped or shown as two separate files by design |

Browsers do not let tests create true operating-system folder drops in a portable way. If folder upload is important, test the app's file filtering and manual folder input separately, then run a smaller real-browser exploratory check on each supported platform.

A rejection test should assert that no upload request was sent. Otherwise the UI can show "unsupported file" while still posting the payload.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('rejects unsupported dropped files without posting upload', async ({ page }) => {
  const uploadRequests: string[] = [];

  page.on('request', (request) => {
    if (request.url().includes('/api/uploads')) {
      uploadRequests.push(request.url());
    }
  });

  await page.goto('/documents');

  await page.evaluate(() => {
    const zone = document.querySelector('[data-testid="document-drop-zone"]');

    if (!(zone instanceof HTMLElement)) {
      throw new Error('Document drop zone was not found');
    }

    const file = new File(['binary'], 'installer.exe', {
      type: 'application/octet-stream'
    });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    zone.dispatchEvent(new DragEvent('dragover', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));

    zone.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer
    }));
  });

  await expect(page.getByRole('alert')).toContainText('Only PDF files are allowed');
  expect(uploadRequests).toEqual([]);
});
\`\`\`

This is one place where ready-made QA skills installed from qaskills.sh with the qaskills CLI can save setup time, especially if your team keeps repeating the same file drop and pointer move helpers across repositories.

## Accessibility and Keyboard Equivalence

Drag and drop is not automatically accessible. Many sortable interfaces need keyboard controls, announcements, focus preservation, and a non-pointer way to complete the same task. Your automated suite should not pretend a mouse-only drag is acceptable unless the product explicitly excludes keyboard users, and most products should not.

A workable keyboard pattern is: focus a handle, press Space to pick up, use Arrow keys to move, press Space to drop, and announce the result through a live region. The exact keys vary by component, but the test contract is stable.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('reorders a task with keyboard controls', async ({ page }) => {
  await page.goto('/tasks');

  const handle = page.getByRole('button', { name: 'Move Billing tests' });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');

  await expect(page.getByRole('status')).toContainText(
    'Billing tests moved to position 3'
  );
  await expect(page.getByTestId('task-list')).toHaveAttribute(
    'data-order',
    'auth-tests,search-tests,billing-tests'
  );
});
\`\`\`

Accessibility assertions should include state and outcome. If the handle uses \`aria-pressed\`, \`aria-grabbed\`, or another state attribute, check it during pickup and after drop. If the product uses live regions, check the announced message. If focus jumps to the body after a reorder, keyboard users lose their place. That is a real bug, not a polish issue.

## A Failure Story: The Card That Only Failed in CI

Symptom: a Kanban reorder test passed locally and failed in CI about one run out of five. The screenshot showed the card hovering between columns, but the final assertion still saw the old order.

Wrong theory: the team blamed animation timing. They added waits after each pointer move. The failure rate went down for a day, then came back when CI ran on a slower worker.

Actual cause: the test started the drag at the row center, but the product had added a checkbox on the left side and a drag handle on the right. On some viewport widths, the computed center landed over the checkbox label, which called \`preventDefault\` on pointer down. The drag library never activated. The screenshot looked like movement because the mouse moved, but the source item did not enter the library's dragging state.

Fix: the test measured the drag handle locator, not the row, and asserted the item had \`data-dragging="true"\` after the threshold move. The final reorder assertion stayed, but the test now failed early with a useful message if pickup did not happen.

The lesson is not "add more waits." The lesson is to assert the middle of the gesture. Pickup is a state transition. Targeting is a state transition. Drop is a state transition. If you only assert the end, you have no idea which transition failed.

## Helper Design That Does Not Hide Bugs

Helpers are useful when they encode product mechanics, not when they erase them. A good helper takes locators, measures boxes at runtime, performs threshold movement, and returns enough signal for the test to assert domain behavior.

\`\`\`ts
import type { Locator, Page } from '@playwright/test';

export async function dragLocatorToLocator(
  page: Page,
  source: Locator,
  target: Locator
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Could not measure source or target for drag');
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 10);
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();
}
\`\`\`

Keep the helper boring. Do not catch and swallow errors. Do not add arbitrary sleeps. Do not assert product-specific outcomes inside a generic pointer helper. That belongs in the test, where a failure can say "invoice moved to approved column" instead of "drag failed."

Use data attributes for stable measurement points. The best locator is often the handle, not the whole row. If designers move text, badges, or icons, the handle should remain the input target. When the handle is hidden until hover, move to the row first and assert the handle is visible before dragging.

## CI Stability Checklist

Drag tests fail in CI when the environment differs from the developer machine in ways the test accidentally depended on. Viewport, device scale factor, animation preference, browser engine, and data setup all matter.

| Risk | Control |
| --- | --- |
| Responsive layout changes coordinates | Set explicit viewport per project |
| Animation races reorder assertions | Assert model state or wait for save response |
| Virtualized rows unmount during movement | Scroll deliberately and assert row visibility |
| Browser engine behavior differs | Run native drag tests in the engines you support |
| Test data order differs | Seed known IDs and assert by ID |

For Playwright, use \`--grep\` or \`-g\` when isolating drag tests. Do not use Vitest's \`-t\` flag for Playwright. If you split tests by browser, keep at least one native drag test on Chromium and one on WebKit or Firefox when your user base justifies it.

\`\`\`yaml
name: drag-drop-tests

on:
  pull_request:

jobs:
  drag-drop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test --grep "drag|drop|reorder"
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: drag-drop-report
          path: playwright-report
\`\`\`

Trace viewer is especially helpful for drag tests because it shows mouse positions, action timing, DOM snapshots, and network calls together. When a test fails, inspect whether the pointer started on the intended element and whether the target existed at release time. Screenshots alone rarely tell the full story.

## Browser Differences Worth Testing

You do not need to run every drag case in every browser, but you should know which cases are browser-sensitive. Native HTML5 drag, file drops, and touch-related pointer behavior are the usual candidates. A sortable list implemented entirely in your JavaScript library may behave similarly across engines, while a file drop into a browser-owned \`DataTransfer\` path can expose differences in event timing and supported properties.

Use a tiered matrix:

| Case type | Minimum coverage | Expanded coverage |
| --- | --- | --- |
| Pointer reorder | Main supported browser on every PR | All supported engines nightly |
| Native file drop | Chromium on every PR | Chromium plus WebKit or Firefox before release |
| Touch drag | Mobile-sized context on PR if core | Real device or cloud device before release |
| Accessibility reorder | One browser every PR | Add screen reader exploratory checks for major releases |

The goal is not to worship matrices. The goal is to put expensive coverage where the risk lives. If analytics show that half your users are on Safari and your app has a native file drop workflow, WebKit coverage is not optional for release confidence. If an internal admin panel only runs on managed Chromium, a leaner matrix is reasonable.

Also verify scroll behavior. Dragging near the edge of a scroll container is a different interaction from dragging inside a fully visible list. Many libraries auto-scroll, but tests that move too quickly can outrun the scroll logic. Write one case that drags an item from the visible top toward an off-screen destination and asserts both the scroll position and final order.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('auto-scrolls while dragging to a lower list position', async ({ page }) => {
  await page.goto('/roadmap');

  const scroller = page.getByTestId('roadmap-scroll');
  const handle = page.getByTestId('item-api-contracts-handle');

  await scroller.evaluate((element) => {
    element.scrollTop = 0;
  });

  const start = await handle.boundingBox();
  const scrollBox = await scroller.boundingBox();

  if (!start || !scrollBox) {
    throw new Error('Could not measure drag handle or scroll container');
  }

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + start.width / 2, scrollBox.y + scrollBox.height - 6, {
    steps: 14
  });

  await expect.poll(async () => {
    return scroller.evaluate((element) => element.scrollTop);
  }).toBeGreaterThan(40);

  await page.mouse.up();
});
\`\`\`

That test catches a class of bugs hidden by small fixtures. If every test list has five rows, you never learn whether users can move row two below row fifty.

## Test Data for Drag and Drop

Drag tests need boring, named data. Avoid random titles and avoid relying on whatever rows a shared staging database happens to contain. Use IDs that describe the scenario: \`card-ready\`, \`card-blocked\`, \`slot-archive\`, \`file-too-large\`. The names make traces readable and reduce the temptation to assert by visible position alone.

For upload zones, generate small files in memory whenever possible. For reorder flows, seed a known order and expose that order through the DOM or API response. For cross-list moves, make source and target rules explicit: accepted status, blocked status, permission level, and maximum item count. The data is part of the test contract.

One compact fixture table in your test plan can prevent weeks of confusing failures:

| Fixture | Purpose | Must not change |
| --- | --- | --- |
| Three-card board | Simple reorder and cross-column move | Card IDs and starting order |
| Full backlog | Auto-scroll and virtualization | Destination item IDs |
| Upload sandbox | File accept and reject paths | Size limit and allowed MIME list |
| Locked board | Permission rejection | User role and disabled target |

When a drag test fails, the first question should be about behavior, not whether the seed data drifted overnight. Stable fixtures make that possible.

## Frequently Asked Questions

### Should I test drag and drop with real mouse movement or synthetic events?

Use real pointer or mouse movement for sortable widgets and synthetic HTML5 drag events for features that depend on \`DataTransfer\`, such as file drops or native draggable payloads. The implementation decides the test style. If the product supports both native and pointer paths, keep separate tests. A single synthetic \`drop\` test can prove payload handling, but it cannot prove pickup thresholds, handles, hover targeting, or touch behavior.

### Why does my drop event fire but the application ignores it?

The usual cause is an incomplete event sequence or a missing payload. Many apps require \`dragover\` before \`drop\`, and native drop acceptance often depends on the target canceling default browser behavior. The app may also check a specific MIME type in \`dataTransfer\`. Log the events, inspect what the production handler reads, and make the test provide the same payload a real browser gesture would provide.

### How do I make drag reorder tests less flaky in CI?

Measure element boxes at runtime, start on the drag handle, move enough to cross the activation threshold, and assert an intermediate dragging state before release. Avoid fixed coordinates and arbitrary sleeps. Wait for the save request or model update, then verify persisted order after reload for one critical path. Most flaky reorder tests are missing one of those controls, especially stable start points.

### Do drag and drop tests need accessibility coverage?

Yes, if the feature is part of a serious user workflow. A pointer-only passing test says nothing about keyboard access, focus preservation, or screen reader announcements. Add at least one keyboard reorder test that focuses the handle, picks up the item, moves it, drops it, and checks the live-region message or accessible state. That test catches bugs a mouse script will never see.
`,
};
