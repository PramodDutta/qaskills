import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Autocomplete Keyboard Accessibility',
  description:
    'Test autocomplete keyboard accessibility across arrows, Enter, Escape, focus, ARIA state, and screen-reader announcements with resilient automation.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Testing Autocomplete Keyboard Accessibility

Type "san", press ArrowDown twice, and the input still owns DOM focus while a visual highlight moves to "San Diego." That is often correct. Many autocompletes use \`aria-activedescendant\` so the text field keeps focus and points to the active option. A test that expects focus to move into the popup will reject a valid pattern and miss the state assistive technology actually consumes.

Keyboard testing for an autocomplete must join four layers: input value, popup visibility, active option, and committed selection. The ARIA combobox pattern defines relationships, but product decisions still determine whether typing filters immediately, whether inline completion appears, and what Escape restores.

## Identify the implemented combobox pattern

The editable input typically has \`role="combobox"\`, \`aria-expanded\`, and \`aria-controls\` referencing a listbox popup. It may use \`aria-activedescendant\` to identify an option while DOM focus remains on the input. Options use \`role="option"\` and expose selection state when appropriate.

| State | Input focus | \`aria-expanded\` | Active descendant | Popup |
|---|---|---:|---|---|
| Initial | On input after Tab | \`false\` | Absent | Hidden |
| Results open, none active | On input | \`true\` | Often absent | Visible |
| Arrow navigation | On input | \`true\` | ID of active option | Visible |
| Selection committed | Usually on input | \`false\` | Cleared or product-dependent | Hidden |
| Escape closes popup | On input | \`false\` | Cleared | Hidden |

Do not locate the popup by CSS class alone. Query the combobox's \`aria-controls\` target and confirm it has the expected role. Duplicate IDs or a stale reference can look fine visually while breaking the accessibility tree.

## A keyboard journey in Playwright

This example tests a city autocomplete with listbox behavior. It relies on roles for user-facing controls, then reads ARIA attributes for the relationship that cannot be inferred from pixels.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('navigates and commits a city without moving DOM focus', async ({ page }) => {
  await page.goto('/travel');
  const city = page.getByRole('combobox', { name: 'Departure city' });

  await city.fill('san');
  await expect(city).toHaveAttribute('aria-expanded', 'true');

  const listboxId = await city.getAttribute('aria-controls');
  expect(listboxId).toBeTruthy();
  const listbox = page.locator('#' + listboxId);
  await expect(listbox).toHaveRole('listbox');

  await city.press('ArrowDown');
  await expect(city).toBeFocused();

  const activeId = await city.getAttribute('aria-activedescendant');
  expect(activeId).toBeTruthy();
  const activeOption = page.locator('#' + activeId);
  await expect(activeOption).toHaveRole('option');
  await expect(activeOption).toHaveText('San Diego');

  await city.press('Enter');
  await expect(city).toHaveValue('San Diego');
  await expect(city).toHaveAttribute('aria-expanded', 'false');
  await expect(city).toBeFocused();
});
\`\`\`

The application in this example emits CSS-safe IDs for the controlled listbox and its options. If an application permits punctuation with CSS meaning in generated IDs, escape them through an installed CSS escaping utility or resolve them with \`document.getElementById\` in the page. The important assertion is that the referenced element exists and represents the active option.

Avoid \`waitForTimeout\` after typing. Wait for \`aria-expanded\`, a known option, a loading-state transition, or the relevant network response. Debounce duration is an implementation detail.

## Arrow keys must update more than a highlight

Down Arrow generally opens the popup if suggestions are available and moves to a next option. Up Arrow moves in the opposite direction. Whether navigation wraps from last to first is a product choice unless the adopted component pattern specifies it. Encode the chosen behavior consistently.

For each key, verify:

| Observable | Why it matters |
|---|---|
| DOM focus remains on editable input | Typing and screen-reader interaction remain coherent |
| Active descendant points to an existing option | Assistive technology can identify the highlight |
| Active option is scrolled into view | Keyboard users can see their position |
| Input value follows documented model | List autocomplete and inline autocomplete differ |
| Disabled options are skipped | Unavailable items cannot be selected |

Testing a background-color class proves only styling. Testing \`aria-selected\` alone can also be insufficient because some patterns distinguish active focus from selected value. Read the component's intended semantics.

## Enter commits, unless another control owns it

When an option is active, Enter normally accepts it, closes the popup, and leaves focus on the combobox. The underlying value may be an ID while the field displays a label. Assert both through public form behavior if possible, such as submitting and observing the chosen city ID at a test endpoint.

When no option is active, behavior varies. Free-form comboboxes may retain typed text. Restricted selectors may reject it or leave the popup open. Document this branch and test it explicitly.

Composition input is a special case. During an IME composition session, Enter can commit composed text rather than select a suggestion. Browser automation of full IME behavior is limited, so cover composition-event handling at the component level and perform manual checks with relevant input methods.

## Escape has two possible jobs

ARIA guidance commonly gives Escape the job of dismissing the popup without accepting a suggestion. Some editable combobox patterns use a second Escape to clear the field when the popup is already closed. Products may instead preserve the query.

A precise test starts from known state:

\`\`\`ts
test('Escape dismisses suggestions and preserves the typed query', async ({ page }) => {
  await page.goto('/travel');
  const city = page.getByRole('combobox', { name: 'Departure city' });

  await city.fill('lon');
  await expect(city).toHaveAttribute('aria-expanded', 'true');
  await city.press('ArrowDown');
  await city.press('Escape');

  await expect(city).toHaveAttribute('aria-expanded', 'false');
  await expect(city).toHaveValue('lon');
  await expect(city).not.toHaveAttribute('aria-activedescendant', /.+/);
  await expect(city).toBeFocused();
});
\`\`\`

If the product restores the previously committed value instead, change the value assertion to that contract. Do not merely assert that a popup locator is invisible; stale active-descendant state remains an accessibility defect.

## Tab is navigation, not an implicit Enter

Tab should move to the next focusable control. Some autocomplete designs commit an active suggestion on Tab, while others leave the text untouched. Unexpected selection is particularly harmful when a user is simply moving through a form.

Test forward and reverse traversal. After Shift+Tab returns, the accessible name, current value, and expanded state should still be coherent. Ensure listbox options are not separate Tab stops when the pattern uses active descendant. A popup filled with focusable links or buttons is not a simple listbox and may require a grid or dialog pattern.

The [accessibility testing automation guide](/blog/accessibility-testing-automation-guide) explains how automated and manual evidence fit together. The [axe-core with Playwright guide](/blog/axe-core-playwright-accessibility-testing-2026) can detect certain ARIA relationship violations, but it cannot prove this keyboard state machine behaves correctly.

## Async results and stale responses

Autocomplete requests race. A user types \`ca\`, then \`cam\`; the slower \`ca\` response must not replace the newer list. Keyboard focus can compound the error by leaving \`aria-activedescendant\` pointing to an option removed by a late response.

Route two requests with controlled completion order, then assert only the newest query's results appear and active state resets safely. This is an application-specific network test, not a reason to mock every accessibility scenario.

Loading state should be perceivable without being excessively chatty. A live region can announce "Loading suggestions" and a result count, but announcing on every keystroke can overwhelm screen-reader users. Test DOM changes and then manually listen with supported screen reader and browser combinations.

## Screen-reader behavior is not fully automatable

DOM and accessibility-tree assertions provide strong evidence, not a recording of what every screen reader speaks. Announcements depend on browser, operating system, screen reader, verbosity settings, and timing.

| Evidence source | Can verify | Cannot reliably verify alone |
|---|---|---|
| Playwright DOM assertions | Roles, attributes, focus, values, referenced IDs | Spoken phrasing and interruption behavior |
| Accessibility scanner | Many name, role, and ARIA validity rules | Correct keyboard sequence |
| Browser accessibility tree inspection | Exposed semantic nodes | End-user announcement timing across AT |
| Manual screen-reader pass | Actual interaction for one stack | Every platform combination |

Maintain a manual matrix based on supported platforms, for example NVDA with Firefox or Chrome on Windows, VoiceOver with Safari on macOS and iOS, and TalkBack with Chrome on Android where mobile use matters. Do not claim universal screen-reader support from one stack.

## Accessible names and status messages

The combobox needs a stable accessible name from a visible label or another valid labeling relationship. Placeholder text is not a robust substitute because it disappears and often describes format rather than purpose.

When results update, expose useful status without moving focus. Messages such as "4 suggestions available" can be placed in a polite live region. No-results and error states also need perceivable text. Avoid using the option list itself as the only announcement mechanism.

Test that the live-region text changes after results settle, but avoid asserting exact punctuation unless copy is a product contract. Duplicate hidden regions can cause repeated speech even though the visible UI looks correct.

## Virtualized listboxes

Large datasets often render only visible options. \`aria-activedescendant\` must reference an element present in the DOM. When ArrowDown advances beyond the viewport, the component must render and scroll the next option before or as it becomes active.

Test transitions across the virtualization boundary, not only the first three items. Verify the active ID exists after every press and the option is visible. If \`aria-setsize\` and \`aria-posinset\` are used to expose logical position, validate them against the full result count.

Do not assume locator count equals total results in a virtualized popup. Use product status text or API fixture knowledge for total size while checking the rendered window separately.

## Pointer and keyboard state must converge

Hover can move a visual highlight, and click can commit an option. After a pointer selection, keyboard reopening should not retain a stale active descendant. After keyboard selection, clicking the clear button should reset both visible value and form value.

Touch interfaces lack hover and physical arrow keys, but the semantic combobox must remain operable through mobile assistive technology. Keep touch-specific coverage separate from desktop key-event assumptions.

The clear button needs its own accessible name and focus behavior. Clearing should not unexpectedly focus the document body or reopen suggestions unless that behavior is intentional.

## Test the whole state machine, not every pixel

A compact suite can cover entry into the field, query and async results, Down and Up movement, boundary behavior, Enter selection, Escape dismissal, Tab departure, invalid/free-form input, no results, service error, and reopening after a committed choice.

Build assertions around semantics and state transitions. Use screenshots for layout and overlap, especially at zoom, but not as the only evidence for keyboard operation. Test at 200 percent zoom and narrow viewports manually or visually to ensure the popup and active option are not clipped.

Keep fixtures small and distinctive. Options with the same prefix and different labels reveal movement more clearly than a hundred generated cities. Include a disabled option and an option with supplementary description if those exist in production.

## Home, End, Page Up, and Page Down

Some combobox implementations support Home and End for cursor movement in the editable field, while others use them to move to the first and last option when the popup is open. The adopted interaction model must resolve that tension. Do not copy a select-only listbox expectation onto an editable text input without checking the relevant ARIA pattern and product behavior.

Page Up and Page Down can move by a viewport-sized group in long popups. If implemented, assert the destination is active and rendered, not that it advances by a hard-coded number of rows. Responsive height and variable option descriptions can change how many items fit.

On macOS, platform text-editing shortcuts add another dimension. Manual testing should confirm that common line and document navigation commands do not unexpectedly select suggestions. Automation can cover declared web keys, but it should not claim every operating-system convention from one runner.

## Repeated labels and rich options

Two options may share the visible name "Springfield" and differ by state or country. The accessible option name must include enough context for a nonvisual user to choose. A visual secondary line that is hidden from the accessibility tree creates ambiguity.

Test the computed accessible names with role locators and verify Enter commits the correct underlying ID. Do not solve repeated labels by locating the second matching option with an index; that hides whether a user can distinguish them.

Rich options can contain icons, badges, or highlighted query substrings. Decorative icons should not pollute names, and splitting matching text across spans should not destroy the combined label. If an option contains independent interactive controls, a simple listbox option is probably the wrong semantic design.

## Validation after focus leaves the field

Restricted autocompletes often require a committed option, not arbitrary text. The component may look valid because the display value remains after Tab while its hidden ID is empty. Submit the form or inspect a public validation message to distinguish typed text from a committed choice.

Errors need an accessible relationship to the combobox, commonly through a description mechanism, and the invalid state must be exposed. Correcting the query and selecting a valid option should remove stale error semantics. Test both transitions.

Do not validate on every arrow movement if that announces an error while the user is still exploring. The product's validation timing is part of keyboard usability and deserves manual review.

## Browser and framework event differences

Synthetic component tests that call an onKeyDown handler miss default browser behavior, event composition, and focus management. Keep them for reducer-level state transitions, then run browser tests with real key presses.

Framework rerenders can replace the active option node while leaving the same ID. That can be valid if the reference remains present, but brief gaps may prevent assistive technology from receiving the update. Avoid asserting only the final settled DOM for timing-sensitive regressions; observe that every reported active ID resolves during rapid navigation when practical.

Key repeat is another real interaction. Holding ArrowDown produces repeated events. The component should not enqueue stale async state updates that move backward or commit a removed option. A focused stress test can issue several presses quickly and assert a valid final descendant without depending on exact operating-system repeat timing.

## International text and bidirectional results

Test queries with accents, combining characters, non-Latin scripts, and right-to-left labels supported by the product. Filtering behavior may normalize text while the committed label preserves its correct spelling. Keyboard semantics should remain based on logical direction defined by the component, with visual direction reviewed in the relevant locale.

Do not assume one JavaScript string code unit equals one user-perceived character when testing inline completion or deletion. Emoji and combining sequences can reveal caret bugs. Browser-level caret inspection is awkward, so combine targeted component logic tests with manual editing checks.

Localized live-region messages need the same result count semantics as visible text. A grammatically broken but technically present announcement is still a usability defect.

## Frequently Asked Questions

### Should DOM focus move from the input into each autocomplete option?

Not when the component uses the common \`aria-activedescendant\` combobox pattern. Focus remains on the input, and the attribute points to the active option. Other composite patterns exist, so identify the implementation before asserting.

### What should Escape do after a suggestion is highlighted?

It should at least dismiss the popup without accidentally committing the highlight. Whether it preserves typed text, restores a prior value, or clears on a second press is a documented product decision that needs its own assertion.

### Can axe-core prove ArrowDown and Enter work correctly?

No. A scanner can find many static semantic defects, but it does not execute and judge the complete keyboard state machine. Combine scanner results with Playwright key sequences and manual assistive-technology checks.

### How do I test announcements from a screen reader in CI?

Assert the semantic inputs to announcements, including roles, active descendant, names, and live-region updates. Actual spoken output and timing still require manual testing on supported screen-reader and browser combinations.

### How should a test handle a virtualized option list?

Drive beyond the initially rendered window and require the newly active option to exist, be visible, and be referenced by the combobox. Do not equate rendered DOM option count with the full result count.
`,
};
