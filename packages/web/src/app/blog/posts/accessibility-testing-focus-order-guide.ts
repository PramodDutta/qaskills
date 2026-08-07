import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Accessibility Testing Focus Order Guide for Modern Web Applications',
  description: 'Follow this accessibility testing focus order guide to find keyboard sequence defects, test dynamic interfaces, and automate durable WCAG regressions.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Accessibility Testing Focus Order Guide for Modern Web Applications

This accessibility testing focus order guide shows how to verify that keyboard focus moves through a web interface in an order that preserves meaning and operability. The practical method is to derive the expected sequence from the task and DOM, traverse it with real keyboard input, record the active element and visible focus state at every step, then repeat after menus, dialogs, validation errors, route changes, and responsive layout changes.

Focus order is not a demand that every page move left to right or match pixel position exactly. WCAG 2.4.3 requires a meaningful, operable sequence when sequential navigation affects meaning or operation. More than one sequence can be valid. The test fails when focus jumps unpredictably, reaches hidden or inactive controls, skips a necessary action, enters background content during a modal interaction, or becomes stranded after dynamic content changes.

Automation is valuable for stable sequences and state transitions, but human keyboard review remains essential. A script can tell you which element received focus. It cannot reliably decide whether the order communicates the intended relationship in every design. The strongest workflow combines DOM inspection, keyboard-only task completion, programmatic sequence capture, and assistive-technology spot checks.

## Turn WCAG focus requirements into observable assertions

Start with the normative behavior, then define observable product expectations. WCAG 2.2 Success Criterion 2.4.3, Focus Order, is Level A. Its intent and examples are explained by W3C at https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html. Related criteria affect the same journey: Keyboard, No Keyboard Trap, Focus Visible, Focus Not Obscured, On Focus, and Meaningful Sequence.

These criteria overlap but should not be collapsed into one checkbox.

| Concern | Test question | Example failure |
|---|---|---|
| Keyboard access | Can the operation be completed without a pointer? | A custom menu opens only on mouse hover |
| Focus order | Does sequential focus preserve meaning and operation? | Checkout reaches Place order before required shipping fields |
| No keyboard trap | Can focus leave a component using expected keys? | Tab cycles forever inside a nonmodal widget |
| Focus visible | Can a sighted keyboard user locate focus? | Outline is removed with no replacement |
| Focus not obscured | Is the focused component at least partially visible from author-created overlays? | Sticky cookie banner fully covers the focused footer link |
| On focus | Does merely focusing an element avoid unexpected context change? | Tabbing into a select immediately navigates away |
| Meaningful sequence | Does programmatic reading order preserve meaning? | CSS layout visually moves instructions away from their field |

For each critical journey, write a focus contract. It should name the starting point, sequence landmarks, component-specific navigation model, state changes, and focus destination after completion or dismissal. This is more useful than an exhaustive list of every link when the page contains dynamic or personalized content.

An example contract for an address dialog might say: activating Edit address moves focus to the dialog heading or first appropriate control; Tab and Shift+Tab remain within the modal controls; Escape closes only if the product supports that convention; Save closes and returns focus to Edit address; validation failure moves focus to the error summary or invalid field according to the design; background controls do not receive sequential focus while modal.

## Establish the expected sequence from DOM and task structure

Native sequential focus order generally follows DOM order for focusable elements. CSS can visually rearrange content without changing that order. Before pressing Tab, inspect the DOM around landmarks, headings, controls, help text, and action buttons. Ask which order lets someone understand and complete the task without seeing the layout.

A sound form places labels, inputs, help, and actions in a logical source sequence:

\`\`\`html
<main>
  <h1>Delivery details</h1>
  <form>
    <label for="street">Street address</label>
    <input id="street" name="street" autocomplete="street-address">

    <label for="city">City</label>
    <input id="city" name="city" autocomplete="address-level2">

    <button type="submit">Continue to payment</button>
  </form>
</main>
\`\`\`

Static text is not normally in sequential focus order, but its placement and semantic association still affect understanding. Do not add \`tabindex="0"\` to every heading or paragraph to make a keyboard test "see" it. That creates extra stops and can make operation tedious. Screen readers have reading and structural navigation commands beyond Tab.

Create an expected-sequence table for high-risk screens. Keep selectors semantic and expectations expressed as accessible roles and names, not CSS coordinates.

| Step | User action | Expected focus | Meaning preserved |
|---|---|---|---|
| 1 | Tab from browser chrome | Skip link | Keyboard user can bypass repeated navigation |
| 2 | Tab | Primary navigation entry | Site navigation begins before page task |
| 3 | Activate skip link | Main heading or main region target | Repeated navigation is bypassed |
| 4 | Tab | First form control | Instructions precede the task in DOM |
| 5 | Tab through fields | Continue button | Submission follows required input |
| 6 | Submit invalid form | Error summary | User receives a clear failure destination |

This table is a test oracle, not a universal sequence for every page. A product can use another order if meaning and operation remain intact.

## Detect CSS visual-order conflicts at every breakpoint

Flexbox and Grid can produce a polished visual order that conflicts with DOM focus order. The \`order\` property, reversed flex directions, and explicit grid placement affect presentation, not the sequential navigation sequence. Responsive designs can therefore pass on desktop and become confusing on mobile, or the reverse.

Consider cards displayed with the primary action visually first while the DOM retains a secondary action first:

\`\`\`html
<article class="plan-card">
  <h2>Team plan</h2>
  <a class="details" href="/plans/team">View details</a>
  <button class="choose" type="button">Choose Team</button>
</article>

<style>
  .plan-card {
    display: flex;
    flex-direction: column;
  }

  .choose { order: 1; }
  .details { order: 2; }
</style>
\`\`\`

The code is not automatically a WCAG failure merely because visual and DOM order differ, but it is a warning. If sighted keyboard users see focus jump down to View details and back up to Choose Team, the sequence may undermine the visual relationship. The better fix is usually to make DOM order support the intended reading and interaction order, then style without reordering meaningful content.

Test at narrow, medium, and wide layouts chosen from actual design breakpoints. Do not assume device labels. At each width, capture a screenshot or video while tabbing, and compare focus position with the visual task flow. Zoom and text resizing can activate different responsive arrangements, so include a 200 percent zoom review for critical paths.

What people get wrong is using positive \`tabindex\` values to force focus to match a visual arrangement. Values greater than zero create a separate priority order before ordinary focusable content and become extremely fragile as components are inserted. Fix the DOM or component structure. Reserve \`tabindex="0"\` for custom elements that truly belong in normal order, and \`tabindex="-1"\` for elements that need programmatic focus but not a Tab stop.

## Capture a keyboard trace with Playwright

Playwright sends actual keyboard events to the browser and can inspect the focused element. Use it to capture stable checkpoints, not to assert every personalized navigation link. Start from a known focus state, use Tab or Shift+Tab, and identify the active element by semantic information.

The helper below returns a compact focus snapshot. It reads the active element in the page, including its role attribute, accessible label sources commonly used by the application, and a short text fallback. This is diagnostic metadata; Playwright's role locators remain better for assertions.

\`\`\`ts
import { test, expect, type Page } from '@playwright/test';

type FocusSnapshot = {
  tag: string;
  id: string;
  role: string | null;
  nameHint: string;
};

async function activeFocus(page: Page): Promise<FocusSnapshot | null> {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return null;

    return {
      tag: element.tagName.toLowerCase(),
      id: element.id,
      role: element.getAttribute('role'),
      nameHint:
        element.getAttribute('aria-label') ??
        element.textContent?.trim().slice(0, 80) ??
        '',
    };
  });
}

test('checkout follows the documented keyboard sequence', async ({ page }) => {
  await page.goto('/checkout');
  await page.locator('body').click({ position: { x: 1, y: 1 } });

  const trace: Array<FocusSnapshot | null> = [];
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press('Tab');
    trace.push(await activeFocus(page));
  }

  expect(JSON.stringify(trace, null, 2)).toMatchSnapshot('checkout-focus-order.json');
});
\`\`\`

Snapshotting the whole sequence can become noisy when marketing links change. For critical controls, direct assertions are clearer. Use \`toBeFocused()\` after the keyboard action.

\`\`\`ts
test('invalid submission focuses the error summary', async ({ page }) => {
  await page.goto('/checkout/delivery');
  await page.getByRole('button', { name: 'Continue to payment' }).focus();
  await page.keyboard.press('Enter');

  const summary = page.getByRole('alert');
  await expect(summary).toContainText('Fix the following fields');
  await expect(summary).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Street address')).toBeFocused();
});
\`\`\`

Focus the starting control only when that setup matches the test's purpose. If you are testing natural entry from the top of the page, programmatic focus would bypass the behavior under test. Use role, label, placeholder, or other user-facing locator strategies as appropriate; the [Playwright locator best-practices guide](/blog/playwright-best-practices-locators-2026) explains why DOM-coupled selectors make these checks brittle.

## Test reverse traversal, not just the happy Tab path

Shift+Tab exposes different bugs from forward traversal. Focus guards can work in one direction and leak in the other. Menus can return to the wrong trigger. A dynamically removed element can cause the browser to fall back to the document body, making the next backward step unpredictable.

For each modal, popover, and composite component, start from its first focusable element and traverse backward. For a regular page, enter a component, pass through it, then reverse direction. Confirm that sequence remains understandable and no control is duplicated.

Avoid assertions based only on a count of Tab presses. A new legitimate control would shift every later count. Assert semantic checkpoints and relationships: trigger -> first dialog control, last dialog control -> first when modal, close -> trigger, error summary -> first invalid field. Keep a trace on failure to show the unexpected intermediate element.

A utility can tab until a semantic target with a bounded limit, failing with the visited sequence rather than hanging:

\`\`\`ts
async function tabUntilFocused(
  page: Page,
  target: ReturnType<Page['getByRole']>,
  limit = 20,
): Promise<FocusSnapshot[]> {
  const visited: FocusSnapshot[] = [];

  for (let index = 0; index < limit; index += 1) {
    await page.keyboard.press('Tab');
    const snapshot = await activeFocus(page);
    if (snapshot) visited.push(snapshot);
    if (await target.evaluate((element) => element === document.activeElement)) {
      return visited;
    }
  }

  throw new Error(\`Target not focused. Trace: \${JSON.stringify(visited)}\`);
}
\`\`\`

The bounded loop is important. A focus trap defect should fail with evidence, not stall the test run. Use a smaller limit based on the documented component sequence where possible.

## Verify modal dialogs as stateful focus systems

A modal dialog changes which part of the page is operable. Test focus entry, containment, close behavior, background inertness, and restoration. Native \`<dialog>\` with \`showModal()\` provides browser behavior that is difficult to reproduce correctly by hand, though the application still needs a meaningful label, sensible initial focus, and restoration logic.

\`\`\`html
<button id="edit-address">Edit address</button>

<dialog id="address-dialog" aria-labelledby="address-title">
  <h2 id="address-title">Edit address</h2>
  <label for="dialog-street">Street address</label>
  <input id="dialog-street" name="street">
  <button id="save-address" type="button">Save address</button>
  <button id="cancel-address" type="button">Cancel</button>
</dialog>

<script type="module">
  const trigger = document.querySelector('#edit-address');
  const dialog = document.querySelector('#address-dialog');
  const street = document.querySelector('#dialog-street');

  trigger.addEventListener('click', () => {
    dialog.showModal();
    street.focus();
  });

  dialog.addEventListener('close', () => {
    trigger.focus();
  });
</script>
\`\`\`

The exact initial focus depends on content. A destructive confirmation may focus the least destructive action or a static heading with \`tabindex="-1"\` so users hear context before choices. A long form might focus its heading rather than the first field. Document the design decision instead of applying one rule to every modal.

Test what happens when the trigger disappears while the dialog is open. For example, saving may remove an Edit button from a list row. The fallback focus destination should be deliberate, perhaps the updated row heading or the next logical action. Restoring focus to a detached element silently fails.

Also distinguish modal dialogs from nonmodal popovers. Trapping focus inside a nonmodal disclosure can itself be a keyboard trap because users expect to Tab onward. Component behavior should follow its interaction model, not a generic "focus trap" utility applied everywhere.

## Exercise composite widgets with the keys their pattern defines

Tabs, menus, listboxes, trees, grids, and radio groups often use roving \`tabindex\`. The entire composite may contribute one Tab stop, while arrow keys move among internal items. A test that presses Tab through every option will report a false defect.

Use the component's documented keyboard pattern as the oracle. For a tab list, Tab typically enters the active tab, arrow keys move focus among tabs according to orientation and implementation, and Tab then moves into the active panel or next focusable control. Activation can follow focus or require Enter or Space, depending on the selected pattern and latency.

| Widget | Sequential Tab expectation | Internal navigation to test | State assertion |
|---|---|---|---|
| Radio group | Usually one stop for the group selection | Arrow keys change focused option | Checked state and announced label |
| Tab list | Active tab is the primary stop | Orientation-appropriate arrow keys | Selected tab owns visible panel |
| Menu button | Trigger is in page order | Arrow keys navigate open menu | Escape closes and returns to trigger |
| Listbox | Composite receives focus | Arrow keys move active option | Selection model matches design |
| Data grid | Grid participates in page order | Arrow keys navigate cells | Edit mode has an explicit entry and exit |

The WAI-ARIA Authoring Practices at https://www.w3.org/WAI/ARIA/apg/ provide patterns and examples, but an ARIA role does not add keyboard behavior by itself. The component implementation and tests must supply it.

For custom widgets, assert that only the intended descendant has \`tabindex="0"\` and peers have \`-1\` as state moves. Then use keyboard input to prove the state and focus remain synchronized.

\`\`\`ts
test('arrow navigation updates roving focus in the tab list', async ({ page }) => {
  await page.goto('/account');
  const profile = page.getByRole('tab', { name: 'Profile' });
  const security = page.getByRole('tab', { name: 'Security' });

  await profile.focus();
  await page.keyboard.press('ArrowRight');

  await expect(security).toBeFocused();
  await expect(security).toHaveAttribute('tabindex', '0');
  await expect(profile).toHaveAttribute('tabindex', '-1');
  await expect(security).toHaveAttribute('aria-selected', 'true');
});
\`\`\`

Do not encode arrow behavior from memory. Orientation, reading direction, selection mode, and the chosen ARIA pattern matter. Review the component contract and official pattern before writing the test.

## Handle focus after validation, loading, and route changes

Dynamic applications frequently change content without a full document load. Focus does not automatically move to new headings, errors, or results, and moving it too aggressively can disrupt users. Define which changes are direct consequences of an action and which should be announced without focus movement.

For form validation, common designs focus an error summary whose links take users to invalid fields, or focus the first invalid control. The summary needs programmatic focus, usually via \`tabindex="-1"\` if it is not otherwise interactive. After correction, successful navigation should place focus at a logical destination in the new view, not leave it on a detached submit button.

\`\`\`html
<div id="error-summary" role="alert" tabindex="-1" hidden>
  <h2>Fix the following fields</h2>
  <ul></ul>
</div>

<script type="module">
  function showErrors(messages) {
    const summary = document.querySelector('#error-summary');
    const list = summary.querySelector('ul');
    list.replaceChildren(
      ...messages.map((message) => {
        const item = document.createElement('li');
        item.textContent = message;
        return item;
      }),
    );
    summary.hidden = false;
    summary.focus();
  }
</script>
\`\`\`

Loading states create another failure mode. If the focused button becomes disabled and is replaced with a spinner node, focus may fall to the body. Prefer keeping a stable control when possible, updating its accessible state and label. If replacement is necessary, decide where focus goes when the operation completes or fails.

Client-side route transitions need both focus and announcement design. A route change that visually replaces the page while focus remains in old navigation can force keyboard and screen-reader users to rediscover context. A common approach is to focus the new page heading or main container programmatically, but test for double announcement and avoid adding every heading to normal Tab order.

## Diagnose invisible jumps and focus loss with browser evidence

A realistic defect often appears as "Tab sometimes skips the Save button." Reproduce with a video, focus trace, DOM mutation timing, and browser console. Inspect whether the element is disabled, hidden, covered, detached, assigned negative tabindex, or inside a closed/inert subtree at the moment Tab is pressed.

Consider a responsive account form whose Save button is rendered twice: a desktop footer and a mobile sticky footer. CSS hides one copy visually, but the hidden variant uses off-screen positioning rather than \`display: none\` or the \`hidden\` attribute. Both buttons remain focusable. On narrow screens, focus appears to disappear between Cancel and Save because it lands on the off-screen desktop copy.

The diagnosis is not to add \`tabindex="-1"\` at one breakpoint. Remove the duplicate interaction if possible, or ensure the inactive copy is removed from both accessibility and focus participation using an appropriate rendering strategy. Then test desktop, mobile, zoom, forward traversal, and reverse traversal. Check that only one Save button is exposed by role and name.

Playwright's trace and video can show the timing, while a page-side focus listener creates a small audit trail:

\`\`\`ts
await page.exposeFunction('recordFocus', (entry: unknown) => {
  console.log(JSON.stringify(entry));
});

await page.addInitScript(() => {
  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      void (window as unknown as {
        recordFocus: (entry: unknown) => Promise<void>;
      }).recordFocus({
        tag: target.tagName.toLowerCase(),
        id: target.id,
        text: target.textContent?.trim().slice(0, 60),
      });
    },
    true,
  );
});
\`\`\`

Initialize listeners before application scripts when timing matters. Redact sensitive input and avoid collecting user-entered values. The focus target's role, stable test identifier, and short fixed label are usually enough.

## Combine automated rules with task-based keyboard review

Automated accessibility engines can find positive tabindex values, missing names, some invalid ARIA relationships, and other conditions correlated with focus defects. They cannot infer the intended order of a complex visual task. Run them, but never translate "zero violations" into "focus order passed."

Use three layers:

| Layer | What it catches well | Human judgment still needed |
|---|---|---|
| Static and DOM rules | Invalid attributes, some tabindex misuse, hidden-focus patterns | Whether sequence preserves product meaning |
| Browser keyboard tests | Regression in known checkpoints and state transitions | Whether the oracle itself is sensible |
| Manual keyboard and screen-reader review | Spatial jumps, cognitive flow, announcements, discoverability | Repeatability across releases |

Build a small focus-order suite around business-critical flows: authentication, checkout, account recovery, consent, data creation, and destructive confirmation. Include at least one representative composite widget and one dynamic error path. Run broader exploratory review before major layout or design-system releases.

If your team is selecting a runner for accessibility checks, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) can help separate fast component feedback from browser-level keyboard behavior. Focus order that depends on layout, native tabbing, dialogs, or routing belongs in a real browser even if lower-level tests cover component state.

## Make focus regressions actionable in CI

CI failures should show the expected checkpoint, actual active element, visited sequence, viewport, browser, screenshot, and trace. Without that packet, teams will rerun a flaky-looking failure until it passes. Save artifacts only as long as policy allows, especially for authenticated workflows.

Avoid running focus-order checks with arbitrary DOM snapshots as the only oracle. Prefer semantic checkpoints and bounded traces. Split stable design-system behavior from application journey behavior so ownership is clear. A modal containment failure belongs to the component team if it reproduces in the component fixture; restoration to a deleted trigger may belong to the feature team.

A focused Playwright configuration can retain traces on the first retry and screenshots on failure using documented options:

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/accessibility',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'narrow-chromium',
      use: { browserName: 'chromium', viewport: { width: 390, height: 844 } },
    },
  ],
});
\`\`\`

Cross-browser coverage matters for native controls and focus behavior, but do not multiply every case without purpose. Run the core journey in the browsers your product supports, and run a larger matrix for shared components with browser-specific behavior. Manual assistive-technology combinations should follow your user base and accessibility test strategy.

Track recurring causes, not just failed steps. Positive tabindex, duplicated responsive controls, focus restoration to removed nodes, unstable keys in component rendering, incorrect modal semantics, and CSS reordering are fixable patterns. Feed them into design-system tests and code review guidance.

## Review focus order as part of component API design

The cheapest focus defect is the one a component makes difficult to create. Shared components should expose intent-based callbacks and refs without forcing consumers to manipulate internal DOM order. A dialog can accept an initial-focus target and a restoration strategy. An error summary can offer a documented focus method. A menu should own its roving state and Escape behavior.

Document component invariants alongside examples:

- Which element is the page Tab stop?
- Which keys navigate inside the component?
- When does selection follow focus?
- Where does focus move on open, close, success, and error?
- What happens when the initiating element unmounts?
- How do disabled items participate in navigation?
- Does right-to-left layout change arrow behavior?

Test the invariant in isolation and once inside a realistic page. Component fixtures alone may omit sticky headers, portals, routing, and responsive duplication. Page tests alone make root cause harder to assign.

When an AI coding agent generates a component, ask it to state the keyboard model before producing code and to derive tests from that model. Review against the relevant native HTML behavior or ARIA pattern. Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want a repeatable agent workflow, but the product's meaningful sequence still needs a human-defined oracle.

## Frequently Asked Questions

### Must keyboard focus follow the exact visual order?

Not always. WCAG requires a sequence that preserves meaning and operability when sequential navigation matters. Two independent columns can sometimes be traversed in more than one logical order. However, a sighted keyboard user should not experience confusing jumps that contradict the visual task. Compare DOM order, visual arrangement, and product relationships at each breakpoint. When they conflict, prefer correcting DOM structure over positive tabindex values. Document why the chosen order is meaningful, then verify it with keyboard-only task completion and programmatic checkpoints.

### Should headings receive tabindex zero so keyboard users can reach them?

Generally no. Adding \`tabindex="0"\` puts a heading into the normal sequential Tab order and can create many unnecessary stops. Screen readers provide heading and reading navigation independently. When a dynamic route or error state needs a deliberate focus destination, a heading or container can use \`tabindex="-1"\` and receive programmatic focus without becoming a routine Tab stop. Test the announcement and the next Tab destination. Use native landmarks and heading structure so users can navigate content through the mechanisms their assistive technology provides.

### How do I test focus order when page content is personalized?

Assert stable semantic landmarks and relationships rather than snapshotting every focusable element. Seed deterministic user states for a few representative variants, then verify transitions such as skip link to main content, trigger to dialog, invalid submission to error summary, and close back to a logical control. Capture the visited sequence when a checkpoint is not reached within a bounded number of keys. Supplement those automated cases with exploratory keyboard review of real personalization combinations, especially when recommendations insert controls before or inside the main task.

### Can an accessibility scanner certify that focus order is correct?

No. Automated scanners can flag conditions such as positive tabindex, missing accessible names, invalid ARIA, and some hidden-content problems. They usually cannot determine whether the actual sequential order preserves the meaning of a checkout, editor, dashboard, or responsive layout. Use scanner results as one layer, run browser tests for known focus transitions, and complete critical tasks manually with keyboard and selected assistive technologies. A focus-order pass requires a sensible human-defined oracle, not merely the absence of machine-detected violations.
`,
};
