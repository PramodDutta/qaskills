import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Data-Grid Keyboard Navigation Accessibility',
  description:
    'Test data-grid keyboard navigation accessibility across arrows, Home, End, paging, selection, editing, focus visibility, and virtualized rows.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Testing Data-Grid Keyboard Navigation Accessibility

Focus enters the revenue grid on row 18, column 4. Pressing End should reach the last cell in row 18, not the bottom of the dataset, not the browser page footer, and not an invisible recycled cell from row 4. That one keystroke crosses semantics, focus management, virtualization, and product-specific behavior.

An accessible data grid is a composite widget. Usually one cell participates in the page's tab sequence, while arrow and navigation keys move focus within the grid. Automation must assert the focused cell, logical coordinates, selection state, editing mode, scroll behavior, and the grid's accessible structure. An axe scan is valuable, but static rules cannot prove this interaction model.

## Write the keyboard contract before the test

The WAI-ARIA Authoring Practices Grid pattern describes conventional navigation, but it is guidance, not a substitute for a product specification. Arrow keys generally move one cell without wrapping. Home and End move to the first and last cell in the current row. Control plus Home and Control plus End move to grid extremes. Page Up and Page Down move an author-determined number of rows.

Document choices that the pattern leaves open:

| Behavior decision | Example product contract | Why automation needs it |
| --- | --- | --- |
| Horizontal boundary | Right Arrow on last column does not move | Prevent accidental row wrapping |
| Vertical boundary | Down Arrow on final row remains in place | Defines stable edge behavior |
| Paging distance | Move by ten logical rows | "One viewport" is unstable across screens |
| Home with modifiers | Home starts row, Control+Home starts grid | Distinguishes two commands |
| Focus target | Cell receives DOM focus | Determines locator and roving tabindex checks |
| Selection coupling | Navigation does not select without Shift | Prevents destructive surprise |
| Edit entry | Enter activates editor, Escape returns to cell | Separates navigation and editing keys |

For a native static HTML table, arrow-key navigation is not expected. Do not add \'role="grid"\' merely because content has rows and columns. Use the grid pattern when the application genuinely provides interactive composite behavior, then accept responsibility for keyboard management.

The grid should expose logical structure through roles such as \'grid\', \'row\', \'columnheader\', \'rowheader\', and \'gridcell\'. Virtualized implementations may also need \'aria-rowcount\', \'aria-colcount\', \'aria-rowindex\', or \'aria-colindex\' so assistive technology can understand positions not all present in the DOM.

## Assert focus movement with Playwright locators

The first test should follow a short path with known cell names and check focus after every key. Use \'locator.press()\' on the currently focused cell and \'expect(locator).toBeFocused()\'. Avoid \'page.keyboard.press()\' until focus is already proven; otherwise the key may go to the body or an unrelated control and create a misleading failure.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('moves through cells without wrapping at grid boundaries', async ({ page }) => {
  await page.goto('/reports/revenue');

  const grid = page.getByRole('grid', { name: 'Quarterly revenue' });
  const q1North = grid.getByRole('gridcell', { name: '$120,000' });
  const q2North = grid.getByRole('gridcell', { name: '$135,000' });
  const q2South = grid.getByRole('gridcell', { name: '$98,000' });

  await q1North.focus();
  await expect(q1North).toBeFocused();

  await q1North.press('ArrowRight');
  await expect(q2North).toBeFocused();

  await q2North.press('ArrowDown');
  await expect(q2South).toBeFocused();

  await q2South.press('Home');
  const southRow = grid.getByRole('row', { name: /South/ });
  await expect(southRow.getByRole('rowheader', { name: 'South' })).toBeFocused();

  await page.locator(':focus').press('End');
  const lastSouthCell = southRow.getByRole('gridcell').last();
  await expect(lastSouthCell).toBeFocused();

  await lastSouthCell.press('ArrowRight');
  await expect(lastSouthCell).toBeFocused();
});
\`\`\`

Accessible names based on currency may repeat, so scope by row or use stable cell labels that include column context. The example uses unique values for brevity. In production tests, locate the row first, then its cell by column relationship or a test ID while separately asserting accessible roles and names.

Calling \'focus()\' establishes an internal starting point, but it does not test tab entry. Add a separate journey that tabs from a known control before the grid, confirms the correct roving-tabindex cell receives focus, presses Tab once more, and confirms focus leaves the composite. That test catches every cell accidentally having \'tabindex="0"\'.

The [accessibility testing automation guide](/blog/accessibility-testing-automation-guide) places keyboard scenarios alongside semantic assertions, automated rules, zoom, contrast, and assistive-technology review.

## Generate a navigation matrix without hiding failures

Repeated key paths benefit from data-driven tests, but keep names diagnostic. Each case declares a start coordinate, key, and expected coordinate. Expose logical positions as accessible attributes or stable test metadata; visible row indexes alone break under sorting.

\`\`\`ts
import { expect, test } from '@playwright/test';

const moves = [
  { name: 'right one column', start: ['2', '2'], key: 'ArrowRight', end: ['2', '3'] },
  { name: 'left at first column stays', start: ['2', '1'], key: 'ArrowLeft', end: ['2', '1'] },
  { name: 'up one row', start: ['3', '2'], key: 'ArrowUp', end: ['2', '2'] },
  { name: 'down at last row stays', start: ['40', '2'], key: 'ArrowDown', end: ['40', '2'] },
  { name: 'home reaches row start', start: ['9', '3'], key: 'Home', end: ['9', '1'] },
  { name: 'end reaches row end', start: ['9', '2'], key: 'End', end: ['9', '4'] },
  { name: 'control home reaches origin', start: ['9', '3'], key: 'Control+Home', end: ['1', '1'] },
  { name: 'control end reaches final cell', start: ['9', '2'], key: 'Control+End', end: ['40', '4'] },
] as const;

for (const move of moves) {
  test(move.name, async ({ page }) => {
    await page.goto('/inventory');
    const grid = page.getByRole('grid', { name: 'Inventory' });
    const cell = (row: string, column: string) =>
      grid.locator(
        '[role="gridcell"][aria-rowindex="' +
          row +
          '"][aria-colindex="' +
          column +
          '"], [role="rowheader"][aria-rowindex="' +
          row +
          '"][aria-colindex="' +
          column +
          '"]',
      );

    const start = cell(...move.start);
    await start.focus();
    await start.press(move.key);

    await expect(cell(...move.end)).toBeFocused();
    await expect(grid).toHaveAttribute('aria-rowcount', '40');
    await expect(grid).toHaveAttribute('aria-colcount', '4');
  });
}
\`\`\`

The selector permits either a data cell or row header because the first column in this product is a row header. Match the application's actual DOM. If indexes are placed on rows rather than cells, locate the indexed row then its child column. ARIA indexes are one-based.

Do not use this matrix to avoid a readable end-to-end sequence. The earlier path detects stateful interactions between moves; the matrix isolates every key and boundary. Both provide different evidence.

## Roving tabindex must have one tab stop

Many grids manage focus with roving tabindex. One cell has \'tabindex="0"\'; other focusable cells have \'tabindex="-1"\'. When navigation moves, the implementation updates the pair and focuses the destination. On re-entry, the last active cell may remain the grid's tab stop according to the product contract.

Assert these invariants after several moves:

1. Exactly one navigable cell inside the grid has \'tabindex="0"\'.
2. That cell is the current or intended re-entry cell.
3. Disabled or hidden cells cannot become stray tab stops.
4. A Tab key leaves the composite rather than visiting every cell.
5. Shift+Tab returns to the preceding page control.

Some implementations use \'aria-activedescendant\' instead: DOM focus remains on the grid container while the attribute points to the active cell ID. In that design, \'toBeFocused()\' belongs on the grid, and tests assert the referenced ID, visible focus styling, and accessible state. Do not require roving tabindex when the product deliberately uses a valid active-descendant pattern.

Either approach needs a visible focus indicator. Programmatic focus assertions cannot establish that users can see it. Use screenshot checks under normal, high-contrast, and forced-colors configurations where supported, plus manual review. Avoid brittle pixel assertions for the entire page; target the focused cell and assert meaningful contrast through an accessibility process.

## Page Up and Page Down need logical expectations

The APG leaves paging distance to the author, typically related to visible rows. Responsive height, browser zoom, pinned rows, and variable row height make "move one viewport" hard to assert as an exact row across environments. Define a logical rule or assert properties rather than an accidental pixel result.

For a fixed page size of ten rows, a test can expect row 7 to move to row 17 on Page Down, clamped at the last row. For viewport-based paging, assert that focus advances, remains in the same column, lands on a visible row, and follows the documented anchor behavior. Then run controlled viewport sizes with expected destinations.

| Paging scenario | Assertion beyond destination | Defect it catches |
| --- | --- | --- |
| Middle of dataset | Column unchanged, row advanced per rule | Horizontal focus drift |
| Near final row | Destination clamped to last logical row | Focus disappears beyond data |
| Page Up near start | Destination clamped to first data row | Negative or header index |
| Variable-height row | Focused cell fully visible | Scroll math uses assumed height |
| Pinned summary row | Summary handled by declared rule | Paging enters non-data region unexpectedly |

Pressing Page Down may also scroll the document if the grid fails to cancel the handled key event. Record the page scroll position or check a stable surrounding landmark remains positioned as expected when the grid itself should consume the command.

## Virtualization changes DOM, not logical position

A virtualized 50,000-row grid may render only a few dozen rows. Control+End can require the component to fetch data, update the virtual window, render the last row, and focus it. Assertions must wait for the logical destination, not sleep for an animation.

Use web-first assertions on \'aria-rowindex\', a stable row key, or visible cell content. Confirm \'aria-rowcount\' communicates the total when known. If the total is unknown or infinite, define what Control+End means; the APG notes it may reach the last row currently present in the DOM when navigation dynamically loads more data.

Test recycled nodes. Focus a cell, scroll or page far enough for its DOM element to be reused, then navigate back. The node's accessible name, selected state, indexes, and tabindex must describe the new logical cell, not stale data. A DOM reference captured before virtualization may point to a detached element, so reacquire locators based on logical identity.

Network behavior is part of the case. Stub a delayed next-page response and verify focus stays on a sensible cell while loading, the grid exposes a useful busy state if designed, and the key is not applied twice when data arrives. Test a failed fetch: focus must not vanish, and recovery controls must be keyboard reachable.

## Navigation and selection are separate state machines

Moving focus should not automatically change selection unless the grid explicitly uses selection-follows-focus. Desktop-style multiselect grids often use Shift+Arrow to extend, Control+A to select all, Shift+Space for a row, and Control+Space for a column. The product must declare supported commands because platform expectations can vary.

For each selection operation, assert three layers:

- DOM focus remains on the intended active cell.
- \'aria-selected\' appears on the selected row or cell elements according to the selection model.
- Visual selection and application state match, including the selected count and subsequent bulk action.

Then press an unmodified arrow. Focus should move while the selection remains or changes according to the contract. Bugs frequently arise because one React state variable drives both active and selected indexes.

Do not infer selection from background color alone. Conversely, an \'aria-selected="true"\' attribute without a visible selection indication is also incomplete. Automated tests cover state; visual and assistive-technology checks cover perception.

## Editing mode must return navigation keys correctly

A grid cell containing a text box creates a conflict: ArrowLeft may move the caret or leave the cell. A common pattern uses Enter or F2 to enter editing, Escape to cancel and return focus to the cell, and Enter to commit. The exact behavior belongs in the component contract.

Test a complete edit cycle:

1. Navigate to the editable quantity cell with grid keys.
2. Press the documented edit command.
3. Confirm the text box, not the cell, has focus.
4. Use ArrowLeft and ArrowRight and assert caret or value behavior, not cell navigation.
5. Press Escape and confirm value rollback plus focus return.
6. Re-enter, change the value, commit, and confirm the cell remains the active navigation point.
7. Press ArrowDown and prove grid navigation has resumed.

Nested comboboxes, links, and buttons require similar mode transitions or key conventions. Role-based locators help ensure the inner control keeps its native semantics. A cell containing an interactive control should not swallow Space or Enter in a way that makes the control unusable.

## Static analyzers cannot certify keyboard behavior

axe-core can detect many semantic and structural problems, but it does not press ArrowDown and decide whether focus moved to the correct logical row. Combine an automated rules scan with interaction tests. The [axe-core with Playwright guide](/blog/axe-core-playwright-accessibility-testing-2026) shows that integration without implying it replaces keyboard coverage.

The complete strategy has four layers:

| Layer | Best at finding | Blind spot |
| --- | --- | --- |
| Rule engine | Invalid ARIA, missing names, structural violations | Stateful key sequences |
| Playwright interaction | Focus, attributes, selection, virtual loading | Screen-reader speech quality |
| Visual checks | Focus visibility, clipping, zoom layout | Semantic announcement |
| Manual assistive technology | Reading and interaction experience | Slow for exhaustive regression matrices |

Run browser projects intentionally. Keyboard event handling should be portable, but platform modifier keys can differ. If the product documents Control on Windows/Linux and Command on macOS, parameterize expected shortcuts by supported platform instead of sending both blindly.

## Keep failures actionable

On failure, attach the active element's role, accessible name, row and column indexes, tabindex, selected state, grid scroll position, and a focused screenshot. Playwright traces are particularly useful because they show key actions and DOM snapshots.

Avoid assertions based only on CSS class names such as \'cell--active\'. They can pass when DOM focus remains elsewhere. Prefer browser focus, accessibility state, and business outcome. CSS can supplement those assertions for visible indication.

Run a compact path on every component change, the key matrix on pull requests, and assistive-technology scenarios at a cadence matched to risk. Any production defect involving a missed key, focus loss, or wrong announcement should become a focused regression case with its original row, column, viewport, and mode conditions.

## Sorting must preserve a meaningful active cell

When a user activates a sortable column header, rows can move under the current cell. Define whether focus follows the same record, stays at the same logical row position, or returns to the header. Following the record is often least surprising for editing, but the product contract decides.

Test with stable row IDs, not the old row number. Sort ascending, assert the announced sort direction, locate the original record at its new \'aria-rowindex\', and verify the declared focus destination. Repeat with descending order and with equal values that exercise tie-breaking. A virtualized grid must update logical indexes after sorting without briefly exposing duplicate positions.

Filtering creates a sharper case. If the focused record disappears, move focus to a documented surviving cell or filter control. Leaving focus on a detached node or silently dropping it to the body breaks the keyboard session.

Column hiding has the same risk horizontally. Hide the active column and verify focus moves to a declared visible neighbor, column indexes are recomputed, and Left or Right navigation skips no reachable data. Restoring the column must not create a second tab stop.

## Frequently Asked Questions

### Should every grid cell be reachable with Tab?

Usually no. A composite grid normally contributes one tab stop, then uses arrow keys internally. Tabbing through every cell makes large grids impractical and does not follow the common grid interaction pattern.

### How do I test a grid that uses aria-activedescendant?

Assert the grid container retains DOM focus and its \'aria-activedescendant\' references the expected cell. Also verify the referenced cell exists, has correct logical attributes, and receives a visible active indication.

### What is the correct Page Down distance?

The author defines it. Document a stable logical or viewport-based rule, then test clamping, column preservation, visibility, and multiple viewport sizes. Do not copy an arbitrary row count from another grid.

### Can axe-core find broken arrow-key navigation?

No. It can find related semantic defects, but a Playwright key sequence or manual keyboard session must exercise navigation and focus movement.

### How should Control+End behave in an infinite grid?

There may be no final dataset row. Define whether it reaches the last loaded row, triggers loading, or is unsupported, communicate that behavior, and test focus stability while data changes.
`,
};
