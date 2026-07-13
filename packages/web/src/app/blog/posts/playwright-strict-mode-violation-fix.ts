import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright “Strict Mode Violation” Locator Fix',
  description:
    'Fix Playwright strict mode violation errors by diagnosing duplicate matches, narrowing locators safely, and preventing ambiguous clicks from returning.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Playwright “Strict Mode Violation” Locator Fix

The click failed because two buttons called “Save” existed at the same instant. One belonged to the open profile dialog; the other sat behind it in the page toolbar. Playwright refused to guess. That refusal is the meaning of a strict mode violation, and it is usually protecting the test from a false pass rather than creating a flaky failure.

A locator may match any number of nodes while you inspect it with operations such as \`count()\` or \`allTextContents()\`. Strictness is enforced when an operation needs one concrete target, including \`click()\`, \`fill()\`, and many assertions. If that operation sees two candidates, Playwright reports the matching nodes and stops. The durable fix is to express the target's identity, not to silence the error by choosing whichever match happens to be first.

This guide treats the exception as diagnostic evidence. We will reproduce ambiguity, inspect the live match set, narrow within a meaningful container, handle legitimately repeated elements, and decide when \`first()\` or \`nth()\` is honest.

## Reading the strictness error as a DOM report

Start with the complete error, not the locator line alone. Playwright normally prints the number of resolved elements and a short representation of each. Those representations often reveal the missing distinction: different accessible names, a dialog ancestor, a hidden responsive copy, or the same label in two rows.

The important boundary is between operations over a set and operations over one element.

| Locator operation | Multiple matches allowed? | What the result means |
|---|---:|---|
| \`locator.count()\` | Yes | Number of current matches |
| \`locator.allTextContents()\` | Yes | Text for every matched node |
| \`expect(locator).toHaveCount(2)\` | Yes | The collection has the asserted size |
| \`locator.click()\` | No | One uniquely resolved element receives the click |
| \`locator.fill('Ada')\` | No | One uniquely resolved control receives input |
| \`expect(locator).toBeVisible()\` | No | One element is evaluated for visibility |

This distinction explains a common surprise: a locator can be created without error and even logged successfully, then fail at the action. Locators are lazy. They describe how to resolve an element against the current DOM, so a React rerender or an opening overlay can change the match set between statements.

Do not begin by adding a timeout. Auto-waiting waits for actionability, not uniqueness. Two enabled, visible buttons will remain two enabled, visible buttons after thirty seconds. Likewise, \`force: true\` changes selected actionability checks, but does not turn an ambiguous locator into a sound target.

## Reproduce and inventory every match

Turn the exception into a small investigation. The following test deliberately renders a page toolbar and a modal, both with a Save button. It uses only public Playwright Test APIs and is runnable without an application server.



\`\`\`ts
import { expect, test } from '@playwright/test';

test('diagnoses duplicate Save buttons', async ({ page }) => {
  await page.setContent(\`
    <main>
      <button>Save</button>
      <dialog open aria-label="Edit profile">
        <label>Display name <input value="Ada" /></label>
        <button>Cancel</button>
        <button>Save</button>
      </dialog>
    </main>
  \`);

  const saves = page.getByRole('button', { name: 'Save', exact: true });

  await expect(saves).toHaveCount(2);
  expect(await saves.allTextContents()).toEqual(['Save', 'Save']);

  const details = await saves.evaluateAll((buttons) =>
    buttons.map((button) => ({
      text: button.textContent?.trim(),
      inDialog: Boolean(button.closest('dialog')),
      visible: Boolean((button as HTMLElement).offsetParent),
    })),
  );

  expect(details).toEqual([
    { text: 'Save', inDialog: false, visible: true },
    { text: 'Save', inDialog: true, visible: true },
  ]);
});
\`\`\`



In an application test, temporarily add the count assertion immediately before the failing action. Run in UI mode or open the trace and inspect both candidates at that step. \`locator.highlight()\` is useful during local diagnosis, although it belongs in debugging work rather than committed tests. \`evaluateAll()\` can expose discriminating properties, but the eventual production locator should normally use user-facing semantics or a deliberate test contract instead of DOM introspection.

Also check whether the duplicate is transient. A leaving animation may keep the old dialog in the DOM while the new panel appears. A mobile and desktop navigation may both exist, with CSS controlling visibility. A virtualized list may briefly retain an outgoing row. The cause determines whether to improve the locator, await a state transition, or correct the product markup.

## Narrow from the dialog, row, or landmark

When controls repeat, their context is often their real identity. Users do not think “the second Save button”; they think “Save in Edit profile.” Encode that relationship by locating the container first and then querying inside it.



\`\`\`ts
import { expect, test } from '@playwright/test';

test('saves the profile dialog, not the page toolbar', async ({ page }) => {
  await page.setContent(\`
    <header><button>Save</button></header>
    <dialog open aria-labelledby="profile-title">
      <h2 id="profile-title">Edit profile</h2>
      <label>Display name <input value="Ada" /></label>
      <button>Cancel</button>
      <button>Save</button>
    </dialog>
    <p role="status"></p>
    <script>
      document.querySelector('dialog button:last-of-type').onclick = () => {
        document.querySelector('[role=status]').textContent = 'Profile saved';
      };
    </script>
  \`);

  const profileDialog = page.getByRole('dialog', { name: 'Edit profile' });
  await expect(profileDialog).toBeVisible();
  await profileDialog.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(page.getByRole('status')).toHaveText('Profile saved');
});
\`\`\`



This locator survives if a second toolbar button is added or the modal moves within the DOM. It also validates an accessibility relationship: the dialog has an accessible name. The same technique applies to table rows, list items, navigation landmarks, forms, and regions.

For repeated product cards, choose the card by unique content, then the action inside that card. \`filter({ hasText: 'Pro plan' })\` can be appropriate when the distinguishing text is stable. \`filter({ has: page.getByRole('heading', { name: 'Pro plan' }) })\` is more structural and reduces accidental matches from unrelated descendant copy. Remember that the inner locator in \`has\` is evaluated relative to each candidate, so keep it inside the candidate's subtree.

Here is a practical ordering for narrowing an ambiguous locator:

1. Add an accessible name to a role locator when the target is interactive.
2. Scope through a named dialog, form, row, list item, or landmark.
3. Filter a repeated container using a stable child or its own text.
4. Use an exact accessible-name match when substring matching is the only ambiguity.
5. Ask for a test ID when the product has no stable user-visible distinction.
6. Use positional selection only when position is itself the requirement.

For a broader locator design policy, the [Playwright locator strategy guide](/blog/playwright-locator-strategies-getbyrole-guide) explains how role, label, text, and test ID contracts fit together.

## Exact names, substring matching, and duplicate accessible labels

\`getByRole('button', { name: 'Save' })\` can match “Save”, “Save draft”, and “Save as template” because accessible-name matching is not exact by default. Adding \`exact: true\` is a legitimate correction when the intended accessible name is exactly “Save.” It does not help when two buttons genuinely have the same name.

Before changing the selector, inspect the accessible names rather than only visible strings. An icon-only button may derive its name from \`aria-label\`. A control can be named by \`aria-labelledby\`. Text hidden visually may still contribute to the accessibility tree. Conversely, \`aria-hidden\` content may appear on screen but not participate in the computed name.

| Symptom | Likely cause | Strong correction |
|---|---|---|
| Save also matches Save draft | Substring name matching | Add \`exact: true\` |
| Two exact Save buttons in separate forms | Repeated action with different context | Scope to the named form or dialog |
| Desktop and mobile menus both match | Responsive copies coexist in DOM | Scope to the active navigation, or fix hidden semantics |
| Two rows contain the same customer name | Business data is not unique | Filter with another stable field, such as account ID |
| Duplicate test IDs | Broken test contract | Correct the application markup |
| Old and new panels overlap briefly | Transition state is unresolved | Wait for the old panel to detach or become hidden |

Do not “fix” duplicate accessible labels with a complicated CSS path if the product itself gives two indistinguishable controls in the same context. That can be an accessibility or UX defect. A precise test can expose the issue, but markup may need to change so users and assistive technology can distinguish “Save billing address” from “Save shipping address.”

## Filtering visible copies without hiding the design problem

Playwright offers \`filter({ visible: true })\` for cases where the DOM contains visible and invisible copies. It is useful, but visibility should be a meaningful discriminator. If a responsive component renders both variants and only one is displayed, filtering to the visible target can describe the user experience accurately.

The caveat is timing. During an animation, both copies may be visible for a few frames. If the test reaches them then, a strictness error correctly reports an unstable interaction state. Prefer awaiting the definitive UI state, such as a drawer becoming visible and the desktop navigation becoming hidden, before clicking.

Visibility filtering also does not compensate for incorrect accessibility hiding. A visually concealed menu that remains exposed to the accessibility tree can confuse screen-reader users even if Playwright's visible filter selects the clickable one. Pair an interaction check with an accessibility-oriented assertion where the risk matters.

## When first(), last(), and nth() tell the truth

Positional methods are not forbidden. They are dangerous when used as a reflex because they transform an ambiguity into silent selection. They are honest when order is the behavior being tested.

Good examples include clicking the first result after asserting its sort order, inspecting the third step in a fixed progress indicator, or selecting the final breadcrumb item. In those cases, assert the collection and the ordering before acting. If “the first unpaid invoice” is the requirement, locate unpaid invoice rows, assert the first row's invoice number, and then use its action.

Bad examples include \`getByText('Submit').first()\` simply because strictness failed. A banner inserted above the form could redirect the click without breaking the test. \`nth(1)\` is even more opaque unless the index has domain meaning.

The \`or()\` operator deserves the same discipline. It combines alternatives and can resolve to both if both are present. If the workflow genuinely accepts either a security dialog or a New button, \`newButton.or(dialog).first()\` can be used for waiting, followed by an explicit branch that checks which state is visible. Do not use the combined locator for the final action.

## Strictness failures caused by product timing

Not every violation is a selector defect. Consider a search page that keeps stale results while fetching the next query. If two “Acme” rows exist during reconciliation, a row locator can briefly match both. Adding \`nth()\` masks a state-management issue and can click stale data.

Instead, synchronize on an observable state transition. Wait for the loading indicator to disappear, for the response-driven result count to settle, or for the prior row to detach. Prefer web-first assertions, which retry, over fixed sleeps. A timeout such as \`waitForTimeout(500)\` encodes an assumption about machine speed rather than the UI contract.

Traces are especially valuable here because the error contains the DOM snapshot at the failing moment. Compare a passing and failing trace, examine network completion, and check whether an animation or optimistic update overlaps states. This aligns with [current Playwright best practices](/blog/playwright-best-practices-2026): wait for user-observable outcomes, retain traces for CI retries, and avoid implementation-coupled selectors.

## Turn locator uniqueness into a reviewable contract

The best prevention is to assert uniqueness where ambiguity would be costly. Page objects can expose domain locators scoped to stable containers rather than global strings. A checkout page object might return the payment form's Submit button, while a refund dialog object owns its confirmation button.

During review, challenge locators that begin at \`page\` even though the action occurs inside a named component. Also challenge unexplained \`first()\`, \`last()\`, and \`nth()\` calls. A short comment should state why position is contractual if the code cannot communicate it.

Code generation is a useful starting point because it tries to produce unique locators, but generated selectors still need domain review. Test data changes, translations, and responsive layouts can invalidate assumptions. Keep the locator as close as possible to the way a user identifies the element, then add a test ID only for state that lacks stable semantics.

A small diagnostic helper can make failures clearer without weakening them. Before an especially consequential action, assert \`toHaveCount(1)\` and attach candidate details when it fails. Do this selectively, since every extra assertion adds maintenance. The built-in strictness exception already provides strong evidence for most interactions.

## A decision checklist for the next violation

When the message appears, work in this order:

- Confirm the number of matches immediately before the failing action.
- Read each candidate from the error or trace, including its accessible name and ancestor context.
- Decide whether duplicates are permanent, responsive, data-driven, or transitional.
- If context distinguishes the target, scope through that context.
- If the name is a substring collision, make it exact.
- If product data duplicates, add another business discriminator.
- If markup violates a promised test ID or accessible name, fix the application.
- If position is the requirement, assert the ordered collection before selecting by index.
- Rerun with the alternative state that created the duplicate, not only the happy fixture.

Strict mode makes an important claim executable: the test knows which element it is operating on. Preserve that claim. A passing test that clicked an arbitrary match is less useful than a clear failure showing that the UI no longer presents a unique target.

## Review duplicate markup as a product defect

Sometimes the locator investigation should end with an application change. Two elements with the same test ID violate an explicit automation contract. Two visible controls with the same role and name inside one form may be indistinguishable to assistive technology as well as to Playwright. A hidden drawer that remains focusable suggests CSS and ARIA state have drifted apart.

Capture the smallest DOM snapshot that demonstrates the ambiguity and bring it to the component owner. The useful question is not “Which selector can bypass this?” but “How does a user distinguish these actions?” The answer might be a named region, a more descriptive accessible name, correct inert behavior for an overlay, or removal of a duplicate responsive tree. Once markup communicates the distinction, the test usually becomes shorter.

Add a component regression for the underlying condition when it is cheap. Assert unique test IDs, verify the inactive panel is hidden from the accessibility tree, or require the dialog to have a name. The end-to-end locator then checks the workflow while the component test protects the semantic invariant at its source.

## Frequently Asked Questions

### Can I disable strict mode globally for Playwright locators?

Locator actions are designed to be strict, and globally weakening that behavior would remove protection against unintended clicks. Resolve the target uniquely. Legacy selector APIs have had strict options, but migrating backward to silence a locator error is not a sound fix.

### Why does count() pass but click() throw a strict mode violation?

\`count()\` is a collection operation and multiple results are valid. \`click()\` must dispatch to one element, so it requires exactly one resolved match. The same locator can therefore be valid for counting and invalid for clicking.

### Is locator.first() ever stable enough for production tests?

Yes, when first position is part of the asserted behavior. Verify the list's contents or sort order first. If \`first()\` merely hides two unrelated matches, it is fragile because a new earlier element can redirect the action.

### How do I fix two identical buttons in different dialogs?

Locate the intended dialog by role and accessible name, then call \`getByRole('button', { name: 'Save' })\` on that dialog locator. If the dialogs themselves have no distinct accessible names, improve the dialog markup.

### Will a longer timeout resolve an intermittent strictness error?

Usually not. Playwright does not wait for an arbitrary duplicate to disappear merely because an action requires uniqueness. Identify the transition that temporarily creates both elements and wait for its observable completion, or fix the overlapping application state.
`,
};
