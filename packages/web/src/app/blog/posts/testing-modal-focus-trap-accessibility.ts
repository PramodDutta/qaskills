import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Modal Focus-Trap Accessibility',
  description:
    'Test modal focus-trap accessibility with Playwright by verifying initial focus, Tab cycling, Escape behavior, background isolation, and focus restoration.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Testing Modal Focus-Trap Accessibility

Press Tab on the dialog's final button. If focus lands on the browser chrome, an obscured page link, or nowhere visible, the modal is not behaving as a keyboard boundary. A focus trap is more than “focus stayed somewhere inside.” It must establish a sensible starting point, cycle in both directions, let users close the dialog through its supported keyboard behavior, prevent background interaction, and return focus to a meaningful place.

Automated checks can cover those transitions with real keyboard input. They should complement, not replace, screen-reader review and manual evaluation of whether the chosen focus target makes sense for the content.

## Start with the dialog's semantic contract

A modal dialog normally exposes \`role="dialog"\` or \`role="alertdialog"\`, an accessible name, and \`aria-modal="true"\`. The rest of the page must be unavailable to interaction while it is open, through platform behavior such as the native \`<dialog>\` modal mode or correctly managed inertness and focus handling in a custom implementation.

| Contract item | Automated observation | Human question that remains |
|---|---|---|
| Dialog role | Role locator finds exactly one open dialog | Is a modal necessary for this task? |
| Accessible name | Role locator resolves the expected name | Does the title describe the decision clearly? |
| Initial focus | \`document.activeElement\` is the intended descendant | Is that target the least surprising starting point? |
| Focus containment | Forward and reverse Tab stay inside | Is the tab order logical and efficient? |
| Escape close | Dialog closes when design permits | Could closing discard work without warning? |
| Focus restoration | Trigger or logical successor receives focus | Is that element still meaningful after the action? |

\`aria-modal\` communicates modality to assistive technology; it does not implement a keyboard trap. Likewise, a backdrop is visual, not a focus-management mechanism. Tests should verify behavior rather than infer it from attributes.

## Choose initial focus from the task, not a universal rule

The first focused element is not always the first button. A short confirmation can focus its least destructive action. A form can focus its first invalid or primary input. A long informational dialog may place \`tabindex="-1"\` on a static heading or introductory block so screen-reader users hear context without the content scrolling past.

Avoid automatically focusing a destructive confirmation when an accidental Enter could activate it. For irreversible choices, a Cancel button or static heading may be safer. The expected target belongs in the test because it is a product decision.

The following Playwright test opens a delete confirmation, checks semantics and initial focus, then traverses the boundary in both directions. It uses keyboard events rather than calling \`focus()\` on each control, so browser tab order participates in the result.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('delete confirmation traps keyboard focus and restores the trigger', async ({ page }) => {
  await page.goto('/projects/alpha/settings');

  const trigger = page.getByRole('button', { name: 'Delete project' });
  await trigger.focus();
  await trigger.press('Enter');

  const dialog = page.getByRole('alertdialog', { name: 'Delete Alpha?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');

  const cancel = dialog.getByRole('button', { name: 'Cancel' });
  const confirm = dialog.getByRole('button', { name: 'Delete permanently' });
  await expect(cancel).toBeFocused();

  await page.keyboard.press('Shift+Tab');
  await expect(confirm).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(confirm).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
\`\`\`

This case has two tabbable controls, so the exact sequence is a stable interface. A complex dialog with optional fields needs a different technique, because enumerating an assumed order can become brittle when a legitimate control is added.

## Prove containment for a changing set of controls

For a modal with dynamic validation, date pickers, or optional sections, assert the invariant after each Tab: the active element remains a descendant of the dialog. Also check that traversal eventually cycles, with an upper bound that prevents an infinite loop in the test.

\`\`\`typescript
import { expect, type Locator, type Page } from '@playwright/test';

async function expectFocusInside(dialog: Locator) {
  await expect
    .poll(async () =>
      dialog.evaluate((element) =>
        element.contains(element.ownerDocument.activeElement),
      ),
    )
    .toBe(true);
}

async function tabUntilFocusCycles(page: Page, dialog: Locator, limit = 20) {
  const firstMarker = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    return element?.getAttribute('data-focus-id') ?? element?.textContent?.trim();
  });
  if (!firstMarker) throw new Error('Focused element needs a stable marker');

  for (let presses = 1; presses <= limit; presses += 1) {
    await page.keyboard.press('Tab');
    await expectFocusInside(dialog);
    const marker = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement | null;
      return element?.getAttribute('data-focus-id') ?? element?.textContent?.trim();
    });
    if (marker === firstMarker) return presses;
  }

  throw new Error('Focus did not cycle within ' + limit + ' Tab presses');
}
\`\`\`

Production pages do not need \`data-focus-id\` solely for this helper if controls have stable accessible names or test IDs. The key is to avoid serializing an element handle across rerenders. Read the active element after each key press.

A containment-only check can miss a trap that alternates between two controls while skipping a required third field. Pair it with targeted assertions for critical controls or compare a discovered set of tabbable elements carefully. Implementing the browser's complete sequential-focus algorithm in test code is surprisingly difficult because shadow DOM, disabled fieldsets, radio groups, visibility, and positive \`tabindex\` affect order. Prefer user-level traversal plus a small number of contract assertions.

## Reverse traversal catches different defects

Many focus-trap implementations install a sentinel after the last control and forget the sentinel before the first. Forward Tab appears correct; Shift+Tab escapes immediately. Every modal keyboard test should exercise both directions.

Start at the expected initial target and press Shift+Tab. Focus should move to the last tabbable element in the dialog. Then press Tab to return. For a one-control dialog, both keys should keep focus on that control. For a dialog with no naturally focusable actions, the container or heading needs a programmatic focus strategy and the design deserves manual review.

Positive \`tabindex\` values complicate traversal and should generally be avoided. Tests that assert DOM order are easier to reason about when interactive elements use natural order or \`tabindex="0"\`.

## Escape behavior must match the transaction

Escape commonly dismisses a modal, but not every dialog may close immediately. A progress dialog during an irreversible operation may disable dismissal; an edited form may open a nested discard confirmation. The test should encode the agreed behavior rather than requiring Escape universally.

| Dialog state | Reasonable Escape result | Focus destination |
|---|---|---|
| Read-only help | Close immediately | Help trigger |
| Unsaved form | Close or present discard decision, per design | Trigger after final close |
| Destructive confirmation | Cancel and close | Destructive-action trigger |
| Blocking operation | Remain open if cancellation is unsafe | Stay on meaningful dialog element |
| Nested discard confirmation | Close topmost dialog first | Element that opened the nested dialog |

When Escape is supported, send it through \`page.keyboard\` while focus is inside the dialog. Calling a component's close function directly bypasses the keyboard integration under test. Assert both that the dialog is gone and that focus is restored.

If an application intentionally prevents Escape, provide an obvious keyboard-focusable close or cancel path. A test can press Escape, assert the dialog remains, and verify the cancellation control is reachable.

## Focus restoration depends on what changed

Returning focus to the opener is the default because it preserves the user's position. It fails when the opener disappears. Deleting a table row removes its Delete button; closing the modal cannot focus a detached node. The logical successor might be the next row's action, the previous row, the table heading, or a status message.

Test both cancellation and successful completion. Cancellation usually returns to the same trigger. Success may need a different target because content changed. Assert a specific accessible outcome rather than merely checking that \`document.body\` is not active.

Restoration can race with framework rerendering. The close operation may focus the trigger and then a state update replaces it, dropping focus to body. Wait for the final UI state before asserting; Playwright's web-first \`toBeFocused()\` will retry. If the final target never appears, that is a product defect, not a reason to call \`focus()\` from the test.

## Background isolation is more than a backdrop

While the modal is open, keyboard focus must not reach page controls. Pointer behavior should also prevent activation behind the overlay. Assistive technology should perceive the rest of the document as unavailable according to the implementation's modality strategy.

Test keyboard containment first. Then attempt a normal Playwright click on a known background control and expect it not to be actionable, or assert that its resulting state does not occur. Avoid \`force: true\` because it deliberately bypasses the user-facing actionability protection you want to test.

For custom dialogs, inspect whether background roots receive \`inert\` or an appropriate accessibility-tree treatment. Do not require a particular attribute if the component uses a valid native mechanism. Behavior and accessibility-tree exposure are the contract.

The [accessibility testing automation guide](/blog/accessibility-testing-automation-guide) explains how these focused interaction checks fit into a broader test strategy.

## Nested dialogs need a stack, not two independent traps

Opening a date picker dialog or discard confirmation from a modal creates layered focus ownership. Only the topmost modal should trap focus. Escape should close the top layer, restore focus to its opener inside the parent dialog, and leave the parent trap active. A second Escape may then close the parent if permitted.

Test the sequence explicitly:

1. Open the parent and record its expected initial control.
2. Open the child from a control inside the parent.
3. Traverse the child's boundary without reaching parent controls.
4. Press Escape and verify focus returns to the child opener.
5. Traverse the parent again to prove its trap resumed.

Portals do not invalidate this requirement. A child dialog may be a sibling in the DOM rather than a descendant of the parent's element. Assertions should locate the active topmost dialog and evaluate focus against that layer, not assume visual nesting equals DOM nesting.

## Scan semantics with axe, then keep interaction tests

An axe-core integration can detect many dialog naming, ARIA, and document issues. It cannot press Tab repeatedly and judge focus restoration across application state changes. Use both layers.

Run the automated scan with the modal open because that is when \`aria-modal\`, names, hidden background, and dialog content exist. If your suite uses \`@axe-core/playwright\`, create an \`AxeBuilder({ page })\`, scope when appropriate, call \`analyze()\`, and assert that the violations array is empty or meets a reviewed policy. The [axe-core with Playwright guide](/blog/axe-core-playwright-accessibility-testing-2026) covers that API and reporting.

Do not suppress an entire rule because one third-party widget fails inside a dialog. Scope an exclusion narrowly, record ownership, and retain the keyboard tests. A scan that is green after broad exclusions provides little protection.

## Test dialogs under realistic content pressure

Focus bugs often appear when validation inserts an error summary, localization lengthens buttons, a permission removes one action, or mobile layout makes the body scroll. Parameterize the states that alter the tabbable set rather than testing only the ideal desktop modal.

Useful variants include:

- One enabled action versus several actions.
- Validation errors that add links at the top.
- A disabled primary button that later becomes enabled.
- Long content requiring internal scrolling.
- Right-to-left text, without assuming visual direction changes Tab order.
- Mobile viewport with the on-screen keyboard affecting layout.

If content can scroll, initial focus should not scroll the heading out of view unexpectedly. This is partly visual and needs human review, but Playwright can record screenshots and check that the focused element is in the viewport.

## Avoid brittle focus assertions

CSS focus rings are not a reliable proxy for active focus. The application may use \`:focus-visible\`, which behaves differently for pointer and keyboard input. Assert \`toBeFocused()\` on the locator and separately perform visual testing if the ring's appearance matters.

Do not sprinkle \`waitForTimeout()\` after every Tab. Keyboard handling and focus changes should be observable through retrying assertions. If an animation delays activation, wait on the dialog's stable visible state or the target's focus, with a bounded assertion timeout.

Role locators keep tests aligned with semantics. A selector such as \`.modal > div:nth-child(3)\` can traverse the right node while missing that the control lost its accessible name. Exact role names also reveal duplicate dialogs accidentally left mounted.

## Review failures as a state transition

When a focus assertion fails, capture the active element's tag, role, accessible name, and a short DOM path, plus the set of visible dialogs. “Expected Cancel to be focused” is useful; “body was focused after dialog rerendered” is much better.

Classify the transition: open -> initial target, final -> first on Tab, first -> final on Shift+Tab, Escape -> restored target, child close -> parent opener. That classification points to the lifecycle hook or trap boundary likely responsible.

Check for console errors and detached openers. Verify only one active trap library instance owns global key handlers. In React development modes, effect setup and cleanup may expose lifecycle bugs that do not appear in a simplistic production-only test. The fix belongs in focus management, not in a longer assertion timeout.

## Cover keyboard entry paths, not only mouse clicks

Open the dialog with Enter and Space on a native button, not only with \`click()\`. Focus restoration depends on a real opener, and a pointer-driven test can miss a key handler that moves focus twice or leaves it on body. If a menu item launches the modal, test that exact path because the menu may unmount before the dialog records its return target.

Also verify that focus cannot enter the modal before it opens. A visually hidden but mounted dialog whose controls remain tabbable creates an unexpected detour through the page. Tab across the surrounding interface while closed, or assert the implementation's hidden state removes descendants from sequential navigation.

When opening is animated, the trap should activate at a deliberate lifecycle point. Activating too early can focus an element still hidden; activating too late lets a fast keyboard user move into the background. The test can open, immediately press Tab, and assert the final active element remains in the dialog without relying on a fixed animation sleep.

## Include browser and component-library upgrades in regression scope

Native \`<dialog>\` behavior and focus libraries interact with browser engines, portals, and framework lifecycle changes. Run the compact confirmation test in every browser engine the product supports. Keep the larger dynamic traversal in at least one engine to control suite cost.

When upgrading a dialog component library, review defaults for initial focus, Escape, outside clicks, scroll lock, and restoration. A semver-compatible visual change can still alter keyboard behavior. Pin the behavioral contract in application tests rather than assuming the library's own suite covers your composition.

If the component is shared across products, publish a small conformance harness with configurable trigger, dialog, and expected focus targets. Consumers should still add scenario tests for disappearing openers, nested layers, and task-specific initial focus.

## Frequently Asked Questions

### Is \`aria-modal="true"\` enough to create a focus trap?

That attribute communicates modal semantics but does not move focus, cycle Tab, disable background controls, or restore focus. Native dialog behavior or application focus-management code must implement those interactions.

### What should receive focus when a modal opens?

Choose from the content and risk: a static heading for long text, the first meaningful form field, or a safe action for a short confirmation. Avoid a universal “first tabbable element” rule when it creates surprise or destructive activation risk.

### How do I test a dialog whose trigger is deleted after confirmation?

Define a logical successor, such as the next row's action, the table heading, or a completion status. Assert that target after the final rerender instead of expecting focus on a detached trigger.

### Should a focus-trap test enumerate every tabbable element?

For a small stable confirmation, exact order is valuable. For a dynamic form, verify containment and cycling, then assert critical controls separately. Reimplementing the browser's complete tab-order algorithm in a helper is fragile.

### Can axe-core replace keyboard traversal tests?

An axe-core scan cannot replace keyboard traversal. Automated rules identify semantic and ARIA violations, but they do not exercise Tab loops, nested dialog ownership, Escape behavior, or focus restoration after state changes.
`,
};
