import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Focus Management Accessibility Testing: Traps, Restoration, and Roving Tabindex',
  description: 'Learn focus management accessibility testing with Playwright: verify dialog traps, Escape restore, roving tabindex, and CI gates that catch regressions.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Focus Management Accessibility Testing: Traps, Restoration, and Roving Tabindex

Focus management accessibility testing is the practice of verifying that keyboard focus moves, stays, and returns exactly where users expect when UI state changes. You test three concrete behaviors: (1) whether Tab and Shift+Tab cycle only inside a modal or drawer while it is open, (2) whether Escape or an explicit close control restores focus to the trigger that opened the overlay, and (3) whether composite widgets such as toolbars, menus, and grids use a roving tabindex so arrow keys move the active item while Tab exits the widget in one step. If any of those fail, keyboard and screen-reader users get stuck, skip interactive controls, or land on the wrong page region after navigation.

QA and test-automation engineers can encode most of these checks in Playwright. Manual keyboard passes still catch timing and announcement gaps that pure DOM assertions miss. The rest of this post shows runnable workflows for traps, restoration, roving tabindex, route changes, CI gating, and the failure modes that usually slip past snapshot-based a11y scans.

## Dialog and Drawer Focus Traps: Open, Cycle, Escape, Restore

A focus trap is intentional confinement of Tab order inside an overlay. Without a trap, Tab leaves the dialog and lands on controls the user cannot see. With a broken trap, Tab never reaches the close button, or Escape closes the overlay while focus remains on a detached node.

### What "good" looks like for a dialog

When the user activates an "Edit profile" button:

1. Focus moves into the dialog on the first meaningful control (often the heading if it is focusable, or the first input).
2. Subsequent Tab presses stay inside the dialog: inputs, buttons, links, and the close control.
3. Shift+Tab from the first focusable control wraps to the last, and Tab from the last wraps to the first.
4. Escape (and the close button) dismisses the dialog and restores focus to "Edit profile".
5. Background content is inert for pointer and keyboard interaction while the dialog is open.

Drawers follow the same contract. The difference is usually animation timing and whether focus should land on a search field inside the drawer rather than the close icon.

### Playwright workflow: trap on open, wrap, Escape restore

\`\`\`ts
import { test, expect, type Page } from '@playwright/test';

async function focusedRoleName(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role'),
      name:
        el.getAttribute('aria-label') ||
        el.innerText?.trim().slice(0, 80) ||
        el.getAttribute('placeholder'),
      id: el.id || null,
    };
  });
}

test('edit profile dialog traps focus and restores on Escape', async ({ page }) => {
  await page.goto('/settings/profile');
  const trigger = page.getByRole('button', { name: 'Edit profile' });
  await trigger.focus();
  await trigger.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Edit profile' });
  await expect(dialog).toBeVisible();

  // Focus should move into the dialog, not remain on the trigger.
  await expect.poll(async () => (await focusedRoleName(page))?.name)
    .not.toBe('Edit profile');

  const inside = dialog.locator(
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  const count = await inside.count();
  expect(count).toBeGreaterThan(1);

  // Walk forward through every focusable control; none should leave the dialog.
  for (let i = 0; i < count + 2; i++) {
    await page.keyboard.press('Tab');
    const stillInside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return !!(dlg && dlg.contains(document.activeElement));
    });
    expect(stillInside).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
\`\`\`

Run only this file or filter by title:

\`\`\`bash
npx playwright test focus-dialog.spec.ts --grep "traps focus"
# equivalent short flag:
npx playwright test focus-dialog.spec.ts -g "traps focus"
\`\`\`

### Common trap defects to assert against

| Defect | Symptom in keyboard use | Playwright signal |
| --- | --- | --- |
| No trap | Tab reaches page footer while dialog is open | \`dialog.contains(activeElement)\` becomes false |
| Incomplete inert background | Shadow host or portal sibling still tabbable | Focus leaves dialog after 1-2 Tabs |
| Missing initial focus | Screen reader stays on trigger; user tabs "nowhere useful" | \`activeElement\` still equals trigger after open |
| Escape without restore | Dialog closes; focus on \`body\` or deleted node | Trigger not focused after close |
| Close button outside tab cycle | Keyboard user cannot dismiss without Escape | Close control never receives focus in Tab loop |

Portal rendering is the usual root cause of incomplete traps. The dialog DOM lives under \`document.body\`, while "inert" was applied only to a React subtree that no longer contains the page chrome. Your tests should open the real route, not a Storybook island that lacks the portal sibling tree.

### Drawer-specific timing

If the drawer animates \`transform\` for 200-300ms, asserting focus immediately after click races the transition. Prefer waiting on a stable condition:

\`\`\`ts
await page.getByRole('button', { name: 'Filters' }).click();
const drawer = page.getByRole('dialog', { name: 'Filters' });
await expect(drawer).toBeVisible();
await expect(drawer.getByLabel('Search filters')).toBeFocused({ timeout: 3000 });
\`\`\`

Do not \`waitForTimeout(300)\` as a policy. Tie the assertion to the control that should receive focus. If design wants focus on the close button instead of the search field, encode that product decision in the test name so a future redesign fails loudly.

## Roving Tabindex in Toolbars, Menus, and Grids

Roving tabindex is the pattern where only one item in a composite widget has \`tabindex="0"\` and the siblings use \`tabindex="-1"\`. Arrow keys move the "roving" zero, and Tab leaves the whole widget in a single stop. This matches [APG toolbar and grid patterns](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/).

### Why Tab-through-every-item fails users

If every toolbar button is in the Tab order, users must Tab fifteen times to leave a formatting bar. That is legal HTML and still a product defect for keyboard efficiency. Focus management accessibility testing therefore includes intentional *reduction* of Tab stops, not only trapping.

### What you verify

1. Entering the widget: Tab lands on the active (or first) item with \`tabindex="0"\`.
2. Arrow navigation: Right/Down moves focus and updates which item has \`0\` vs \`-1\`.
3. Home/End (when implemented): jump to first/last.
4. Tab exits: one Tab from the focused item moves to the next page control outside the widget.
5. Typeahead or selection (menus): Enter activates; Escape closes and restores focus to the menu button.

### Playwright: toolbar roving tabindex

\`\`\`ts
test('formatting toolbar uses roving tabindex with arrows', async ({ page }) => {
  await page.goto('/editor/demo');
  await page.getByRole('toolbar', { name: 'Formatting' }).focus();
  // Some apps focus the toolbar container; others focus the first button.
  // Normalize by Tabbing once into the composite if needed.
  const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
  await toolbar.getByRole('button').first().focus();

  const buttons = toolbar.getByRole('button');
  const n = await buttons.count();
  expect(n).toBeGreaterThan(2);

  await expect(buttons.nth(0)).toHaveAttribute('tabindex', '0');
  for (let i = 1; i < n; i++) {
    await expect(buttons.nth(i)).toHaveAttribute('tabindex', '-1');
  }

  await page.keyboard.press('ArrowRight');
  await expect(buttons.nth(1)).toBeFocused();
  await expect(buttons.nth(1)).toHaveAttribute('tabindex', '0');
  await expect(buttons.nth(0)).toHaveAttribute('tabindex', '-1');

  // One Tab should leave the toolbar, not walk every button.
  await page.keyboard.press('Tab');
  const leftToolbar = await page.evaluate(() => {
    const tb = document.querySelector('[role="toolbar"][aria-label="Formatting"]');
    return !!(tb && !tb.contains(document.activeElement));
  });
  expect(leftToolbar).toBe(true);
});
\`\`\`

### Grid cells and arrow keys

Data grids that claim spreadsheet-like navigation must move focus between cells without requiring Tab for every cell. A practical assertion strategy:

| Interaction | Expected focus target | Failure mode |
| --- | --- | --- |
| Tab into grid | First selected or (0,0) cell / row focusable | Focus lands on wrapper \`div\` with no name |
| ArrowRight | Next cell in row | Focus stays put; only visual highlight moves |
| ArrowDown | Cell below | Skips into pagination controls |
| Tab from focused cell | Control after the grid | Walks every cell (missing roving pattern) |
| Enter on cell | Edit mode or activates link inside cell | Focus lost to \`body\` |

Visual highlight without moving \`document.activeElement\` is the defect people get wrong most often. Designers paint a blue ring with CSS class \`is-active\` while real focus stays on a hidden sink. Screen reader users hear the wrong name; keyboard users who press Enter activate nothing. Always assert \`toBeFocused()\` on the cell or its focusable child, not merely a CSS class.

### Menus vs dialogs

A menu button opens a \`role="menu"\` with menuitems that use roving tabindex (or \`aria-activedescendant\` on the menu). Do not apply a dialog-style Tab trap to a menu unless the design is actually a dialog. Menus typically:

- Move focus to the first (or selected) menuitem on open.
- Use ArrowUp/ArrowDown between items.
- Close on Escape and restore focus to the menu button.
- Close on Tab (focus moves to the next control after the menu button) per APG.

If your "menu" is implemented as a focus-trapped dialog with Tab wrapping, rename the control in the product and in tests. Mixed metaphors confuse both humans and automation.

## Focus Restoration After Route Changes and Modal Close

Restoration is the second half of every trap. Closing without restore dumps focus on \`document.body\`, which often means the next Tab starts at the browser chrome or the first link in the header. After client-side route changes, SPAs frequently leave focus wherever it was, even if that node unmounted.

### Modal close matrix

Test each dismiss path separately. Teams ship Escape restore and forget the X button, or restore on X and forget backdrop click.

\`\`\`ts
const dismissals = [
  { name: 'Escape', run: async (page) => page.keyboard.press('Escape') },
  { name: 'Close button', run: async (page) =>
      page.getByRole('button', { name: 'Close' }).click() },
  { name: 'Cancel', run: async (page) =>
      page.getByRole('button', { name: 'Cancel' }).click() },
] as const;

for (const d of dismissals) {
  test(\`dialog restores focus after \${d.name}\`, async ({ page }) => {
    await page.goto('/billing');
    const trigger = page.getByRole('button', { name: 'Change plan' });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await d.run(page);
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}
\`\`\`

Backdrop click deserves an explicit product decision. If backdrop dismiss is enabled, restoration must still return to the trigger. If backdrop dismiss is disabled, Tab should not land on the dimmed page.

### SPA route changes

After \`router.push\` / Link navigation:

1. Move focus to the main landmark or the new page \`h1\` (often with \`tabindex="-1"\` so it can receive programmatic focus without entering Tab order permanently).
2. Do not leave focus on a nav link that stayed mounted across layouts.
3. Announce the navigation via the new heading focus or a coordinated status message (see related coverage of live regions linked below).

\`\`\`ts
test('client navigation moves focus to main h1', async ({ page }) => {
  await page.goto('/projects');
  await page.getByRole('link', { name: 'Accessibility audit' }).click();
  await expect(page).toHaveURL(/\\/projects\\/accessibility-audit/);

  const heading = page.getByRole('heading', {
    level: 1,
    name: 'Accessibility audit',
  });
  await expect(heading).toBeFocused();
  // Optional: heading may be tabindex=-1
  await expect(heading).toHaveAttribute('tabindex', '-1');
});
\`\`\`

Pair this with landmark checks. Skip links and landmarks interact with focus targets after navigation; if your suite already covers [skip links and landmarks](/blog/accessibility-testing-skip-links-landmarks), keep route-focus tests thin and complementary rather than duplicating landmark presence assertions.

### Nested overlays

Open dialog A, then dialog B from a control inside A. Closing B must restore to the control inside A, not the original page trigger. Closing A afterward restores to the page trigger. Encode stack order explicitly:

\`\`\`ts
test('nested dialogs restore through the stack', async ({ page }) => {
  await page.goto('/admin/users');
  const edit = page.getByRole('button', { name: 'Edit user' });
  await edit.click();
  const dialogA = page.getByRole('dialog', { name: 'Edit user' });
  const deleteBtn = dialogA.getByRole('button', { name: 'Delete user' });
  await deleteBtn.click();
  const dialogB = page.getByRole('dialog', { name: 'Confirm delete' });
  await expect(dialogB).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialogB).toBeHidden();
  await expect(deleteBtn).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialogA).toBeHidden();
  await expect(edit).toBeFocused();
});
\`\`\`

## Playwright Assertions for activeElement and Tab Order

You need a small toolkit: focus probes, Tab order sampling, and grep-able test titles for CI shards.

### Probe helpers worth keeping in fixtures

\`\`\`ts
// fixtures/focus.ts
import { expect, type Page } from '@playwright/test';

export async function activeSelector(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    if (el.id) return \`#\${el.id}\`;
    const name = el.getAttribute('aria-label') || el.getAttribute('name');
    const role = el.getAttribute('role') || el.tagName.toLowerCase();
    return name ? \`\${role}[name="\${name}"]\` : role;
  });
}

export async function tabCycle(
  page: Page,
  steps: number
): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab');
    seen.push((await activeSelector(page)) ?? 'body');
  }
  return seen;
}

export async function expectFocusInside(
  page: Page,
  locator: string
) {
  await expect.poll(async () =>
    page.evaluate((sel) => {
      const root = document.querySelector(sel);
      return !!(root && root.contains(document.activeElement));
    }, locator)
  ).toBe(true);
}
\`\`\`

### Tab order sampling without brittle full-page lists

Full-page Tab order snapshots break on every marketing banner. Prefer scoped cycles: from a known start, Tab N times, assert the sequence of roles/names inside a region.

\`\`\`ts
test('checkout section tab order keeps pay before legal footnote', async ({ page }) => {
  await page.goto('/checkout');
  await page.getByRole('heading', { name: 'Payment' }).click(); // move pointer focus away
  await page.locator('#payment-section').focus();
  const order = await tabCycle(page, 8);
  const payIdx = order.findIndex((s) => /Pay now/i.test(s));
  const legalIdx = order.findIndex((s) => /terms/i.test(s));
  expect(payIdx).toBeGreaterThan(-1);
  expect(legalIdx).toBeGreaterThan(-1);
  expect(payIdx).toBeLessThan(legalIdx);
});
\`\`\`

### Filters in local runs and CI

Playwright's documented filter flags are \`--grep\` (short form \`-g\`) and \`--grep-invert\`, which has no short form. Example:

\`\`\`bash
npx playwright test --grep "@focus" --project=chromium
npx playwright test -g "roving|focus trap" 
npx playwright test --grep-invert "@manual"
\`\`\`

Tag titles with \`@focus\` so a11y shards stay cheap. Keep axe/ complementary scans in another grep group; axe does not prove Tab traps.

### Combining with live status checks

Focus moves and status announcements often ship together (save confirmation while focus returns to a form). When a save keeps you on the same view, assert both focus target and the polite/assertive message. For deeper patterns around status roles, use your suite's [status role announcement tests](/blog/accessibility-testing-status-role-announcements) rather than re-implementing live region polling in every modal spec.

## Failure Story: The Drawer That "Passed" aXe and Still Trapped Users

**Symptom.** Support tickets: "After closing Filters, I have to Tab through the whole header to get back to the product grid." VoiceOver users reported focus "disappearing" for a beat, then landing at the top of the page.

**Wrong theory.** The team blamed the focus trap library version. They upgraded \`focus-trap-react\`, re-ran axe-core in CI (zero violations), and manually verified that Tab wrapped inside the open drawer. Staging looked fine for engineers who always closed the drawer with the mouse.

**Actual cause.** The close path that restored focus only ran in the Escape key handler. The visible "X" button and the "Clear all" primary action both called \`setOpen(false)\` without the shared \`restoreFocus()\` helper. Mouse users never noticed. Escape-only QA scripts never noticed. aXe never notices because restore is a behavior over time, not a static DOM property.

**Fix.**

1. Centralize dismiss: every close path (X, Cancel, Clear, Escape, route change) went through \`closeFilters({ reason })\` which always restored to the previously focused trigger ref.
2. Added Playwright coverage for each dismiss path (table-driven, as shown earlier).
3. Added a CI job filtered with \`npx playwright test -g @focus\` on pull requests that touched \`components/Filters/**\`.

Secondary lesson: the trigger ref must be captured *before* open. Capturing after animation meant restoring to a focusable element inside the now-closed portal, which threw and fell back to \`document.body\`.

## What People Get Wrong About Focus Management Tests

People treat \`document.activeElement\` as optional polish after visual regression and axe. The opposite order works better for overlays: prove focus entry, trap, and restore first. Those three assertions catch entire classes of portal, inert, and router bugs that color-contrast rules will never see. Another frequent miss: asserting \`toBeVisible()\` on a dialog and stopping. Visibility is necessary and nowhere near sufficient for keyboard UX.

Also wrong: copying APG example code into production, then testing only the happy path ArrowRight once. Roving tabindex bugs appear on wrap boundaries (last to first), on Shift+Tab exit, and when items disable dynamically while focused. Disable a toolbar button under focus in a test and assert focus moves to the nearest enabled sibling (or stays with a clear accessible name if the design keeps focus on a disabled control that is still focusable).

## Automated vs Manual Keyboard Checks

| Check | Automate in Playwright? | Manual / assistive tech still needed? | Notes |
| --- | --- | --- | --- |
| Focus moves into dialog on open | Yes | Spot-check with VO/NVDA | Automate per dialog template |
| Tab wraps inside trap | Yes | Occasional | Portal edge cases need real page |
| Escape restores to trigger | Yes | No for standard dialogs | Cover every dismiss path |
| Roving tabindex arrow moves | Yes | Verify announcement text manually | AT verbosity differs |
| \`aria-activedescendant\` updates | Partially (attribute) | Yes | Screen reader utterance varies |
| Focus after client-side route | Yes | Yes for announcement quality | Pair with heading focus |
| Focus not lost on async re-render | Flaky if naive | Yes | Use stable labels, not indexes |
| Browser chrome vs page Tab start | Limited | Yes | Especially after body fallback |
| Mobile screen reader gestures | No (desktop PW) | Yes | Separate device lab |

Use automation as a regression net for contracts you can express with \`activeElement\` and attributes. Use manual passes for speech output and for gesture-driven mobile focus.

Ready-made QA skills install from qaskills.sh with the qaskills CLI when you want packaged prompts and checklists for these keyboard workflows beside your Playwright specs. Keep the skills as authoring aids; the executable source of truth remains the greppable tests in CI.

## CI Gating for Focus Regressions

### Shard design

1. **PR shard (fast):** \`npx playwright test -g @focus --project=chromium\` on affected packages.
2. **Nightly shard:** full \`@focus\` across browsers you support for keyboard (Chromium + WebKit minimum; Firefox if customers use it).
3. **Smoke on main:** one dialog trap + one roving toolbar + one route focus test as release blockers.

### Failure policy

| Signal | Gate | Owner action |
| --- | --- | --- |
| Trap contains failure | Block merge | Fix portal/inert before redesign debate |
| Restore failure on Escape | Block merge | Shared close helper |
| Restore failure on secondary button | Block merge | Same as Escape |
| Roving \`tabindex\` drift | Block merge | Composite widget contract |
| Route h1 focus missing | Warn 1 sprint, then block | App shell responsibility |
| Flaky focus after animation | Quarantine with ticket | Replace timeout with expect.poll |

### Stable selectors beat nth(i)

Prefer \`getByRole\` with accessible names. Indexes in Tab loops are fine for *counting* cycles inside a trap; they are brittle as *identity*. When a marketing link appears inside a dialog, a length assertion should fail: that is a product bug (unexpected focusable), not a test to "fix" by bumping \`count + 1\`.

### Sample CI step

\`\`\`yaml
# .github/workflows/a11y-focus.yml
name: a11y-focus
on:
  pull_request:
    paths:
      - 'components/**'
      - 'app/**'
      - 'e2e/focus/**'
jobs:
  focus:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test e2e/focus --grep "@focus" --project=chromium
\`\`\`

Keep the grep string aligned with tags in test titles. Document the tag convention in the testing README so AI coding agents stop inventing \`--tag focus\` flags that Playwright does not ship.

### Local loop for agents and humans

\`\`\`bash
# Iterate on one failing contract
npx playwright test e2e/focus/dialog-restore.spec.ts -g "Close button" --headed
# Re-run the whole focus pack before pushing
npx playwright test e2e/focus -g @focus
\`\`\`

When an agent proposes a fix that only updates the test expectations (for example, allowing focus on \`body\` after close), reject the change. The contract is product behavior: restore to the trigger. Update the app code or the documented exception list, never silent expectation drift.

## Frequently Asked Questions

### Does axe-core replace focus management accessibility testing?

No. axe-core and similar static engines check many ARIA and name issues, but they do not press Tab, do not prove a trap wraps, and do not verify focus restoration after Escape. You still need Playwright (or equivalent) keyboard sequences plus a short manual AT pass. Treat axe as a parallel gate for attributes and names, not as proof that focus management works. Teams that ship only axe green dashboards still receive keyboard tickets on dialogs and drawers.

### How many Tab presses should a trap test perform?

At least \`focusableCount + 2\` forward Tabs while asserting every stop remains inside the overlay, plus a short Shift+Tab sample from the first control to prove wrap in both directions. Matching exact control order is optional unless product requirements pin a sequence (for example, primary action before destructive). Prefer containment and restore assertions over brittle full-order snapshots that break on every copy change.

### Should every route change move focus to the h1?

For multi-page app shells and significant view swaps, yes: focus the main \`h1\` (often \`tabindex="-1"\`) or another agreed landmark target so keyboard and screen-reader users learn where they arrived. Tiny in-place updates (inline validation, expanding a row) should not steal focus to the page title. Encode the distinction in tests by tagging full navigations \`@focus @navigation\` and leaving disclosure widgets on a different contract.

### When is roving tabindex the wrong pattern?

If the controls are unrelated page actions that users must reach in document order without learning arrow-key behavior, keep them as ordinary Tab stops. Roving tabindex belongs to composite widgets (toolbars, menus, grids, listboxes) where APG patterns set user expectations. Applying arrows to a random stack of marketing buttons adds an invisible skill requirement. Test for the pattern only where design claims a composite role; otherwise assert standard Tab order and skip Arrow assertions.

`,
};
