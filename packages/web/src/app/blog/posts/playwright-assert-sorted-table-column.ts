import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Assert That a Table Column Is Sorted in Playwright',
  description:
    'Assert sorted table columns in Playwright across numbers, dates, nulls, and locale-aware text with stable extraction and diagnostic failures.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Assert That a Table Column Is Sorted in Playwright

The arrow beside “Invoice total” points upward, but the rows read £9.50, £120.00, and £21.00. The UI state claims ascending order while the backend has supplied strings and compared them lexicographically. A useful Playwright test must verify the row sequence, not merely the header icon or \`aria-sort\` attribute.

Sorting assertions become difficult at the boundaries: formatted currency is not a JavaScript number, date labels may omit a timezone, localized words do not follow code-point order, and placeholder cells need an explicit position. The test needs to extract what the user sees, normalize it according to the column contract, produce an independent expected order, and preserve enough evidence to explain a mismatch.

This guide builds those assertions with Playwright locators and standard JavaScript comparison APIs. It complements [Playwright soft assertions](/blog/playwright-soft-assertions-expect-guide) when a page has several sortable columns, and the broader [Playwright test design practices](/blog/playwright-best-practices-2026) for resilient locator choices.

## Test the ordering contract, not the chevron

A sortable grid exposes at least three different behaviors. Clicking a header changes sort state, accessibility metadata announces that state, and data rows appear in a corresponding order. None proves the others. A regression can rotate the icon without sending the query, return correctly sorted data while leaving \`aria-sort\` stale, or sort only the currently rendered virtualized window.

Write the expected contract before implementing a comparator:

| Decision | Examples | Why the assertion needs it |
|---|---|---|
| Value type | Decimal, instant, calendar date, localized label | Determines parsing and comparison |
| Direction | Ascending or descending | Determines expected sequence |
| Missing-value policy | First, last, or grouped separately | Prevents accidental \`NaN\` behavior |
| Text collation | Locale, case sensitivity, numeric segments | Browser and server must agree |
| Tie behavior | Stable input order or secondary key | Equal primary values otherwise permit several valid outputs |
| Scope | Current page, all loaded rows, or entire result set | A UI test only observes data actually present |

The arrow still matters. Assert \`aria-sort="ascending"\` or \`descending\` on the column header because it is part of the accessible interface, then separately compare row values. Avoid a CSS class such as \`.sort-up\` when an ARIA state is available.

## Extract one cell per data row

Begin from rows, not from every matching cell in the document. Header, footer, hidden responsive copies, and summary rows often share the same column selector. A row-scoped locator lets the test enforce the important invariant that each visible data row contributes exactly one value.

\`\`\`typescript
import { expect, Locator, test } from '@playwright/test';

async function columnTexts(rows: Locator, testId: string): Promise<string[]> {
  const count = await rows.count();
  const values: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const cell = rows.nth(index).getByTestId(testId);
    await expect(cell, \`missing \${testId} in row \${index}\`).toHaveCount(1);
    values.push((await cell.innerText()).trim());
  }

  return values;
}

test('sorts invoices by numeric total', async ({ page }) => {
  await page.goto('/invoices');
  const rows = page.getByRole('row').filter({
    has: page.getByTestId('invoice-total'),
  });

  await page.getByRole('columnheader', { name: 'Invoice total' }).click();
  await expect(
    page.getByRole('columnheader', { name: 'Invoice total' }),
  ).toHaveAttribute('aria-sort', 'ascending');

  const displayed = await columnTexts(rows, 'invoice-total');
  const actual = displayed.map(parseMoney);
  const expected = [...actual].sort((left, right) => left - right);

  expect(actual).toEqual(expected);
});

function parseMoney(text: string): number {
  const normalized = text.replace(/[£,$\s]/g, '');
  const value = Number(normalized);
  if (!Number.isFinite(value)) throw new Error(\`Cannot parse money: \${text}\`);
  return value;
}
\`\`\`

The copied array is essential. \`Array.prototype.sort\` sorts in place, so \`expect(actual.sort(...)).toEqual(actual)\` compares an array to itself and passes regardless of its original order. Modern runtimes also provide \`toSorted\`, but the spread-copy pattern works across more supported Node versions.

\`innerText()\` reflects rendered text and is appropriate when formatting is the user-facing contract. If the cell exposes a machine value in \`data-sort-value\`, test it only when that attribute is a documented part of the component contract. Otherwise the test may validate an internal value while the displayed value is wrong.

## Parse numbers without erasing their meaning

The simple money parser above is deliberately limited to a known en-GB display. A global regex that removes every non-digit breaks negative signs, decimal separators, percentages, accounting parentheses, and non-breaking spaces. There is no universal inverse for \`Intl.NumberFormat\`, so parsing must match the product's supported format.

| Display | Naive failure | Contract-aware normalization |
|---|---|---|
| \`$1,234.50\` | \`Number\` returns \`NaN\` | Remove known currency and group comma |
| \`1.234,50 €\` | Treats dot as decimal | Remove dot groups, change decimal comma to dot |
| \`(42.00)\` | Becomes positive 42 | Interpret parentheses as negative |
| \`12.5%\` | Compares 12.5 rather than 0.125 | Decide whether display percent or ratio is the domain value |
| \`not available\` or \`N/A\` | Becomes zero after over-cleaning | Map to a missing-value sentinel |
| \`1 234\` | Ordinary space rule misses NBSP | Normalize the exact Unicode grouping characters |

Prefer asserting against a fixture with unambiguous values, including 2, 10, and 100. That trio catches lexical sorting immediately. Add negative, equal, missing, and fractional values based on the real column. Do not create a huge random dataset that makes a failed sequence hard to understand.

For localized numeric displays, use a dedicated parser owned by application code when possible and unit-test it exhaustively. The Playwright test can then check that rendered rows use the same intended ordering. Duplicating a complicated parser in the test risks reproducing the production bug.

## Compare dates at the correct semantic level

“Date” can mean an instant, such as \`2026-07-13T09:30:00Z\`, or a calendar date, such as \`2026-07-13\` without a time or zone. Converting every label with \`new Date(label)\` hides that distinction and accepts implementation-dependent strings.

An invoice issued on 13 July should be compared as year, month, and day in the business calendar. An audit event should be compared as an epoch timestamp. If a \`datetime\` attribute contains an ISO instant while the cell displays a localized label, reading that attribute is a sound semantic contract for a \`<time>\` element.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('sorts audit events newest first', async ({ page }) => {
  await page.goto('/audit');
  const header = page.getByRole('columnheader', { name: 'Occurred' });
  await header.click();
  await header.click();
  await expect(header).toHaveAttribute('aria-sort', 'descending');

  const times = page.locator('tbody tr time');
  const isoValues = await times.evaluateAll((elements) =>
    elements.map((element) => {
      const value = element.getAttribute('datetime');
      if (!value) throw new Error('Audit time has no datetime attribute');
      return value;
    }),
  );

  const actual = isoValues.map((value) => {
    const millis = Date.parse(value);
    if (Number.isNaN(millis)) throw new Error(\`Invalid ISO instant: \${value}\`);
    return millis;
  });
  const expected = [...actual].sort((left, right) => right - left);

  expect(actual).toEqual(expected);
});
\`\`\`

Avoid assuming that two clicks always mean descending if the component has an unsorted state or three-state cycle. Establish the initial state or click until the accessible state says what the test needs. The row assertion should wait for data refresh, not merely for the attribute transition.

For server-side sorting, intercept the response or wait for a visible loading indicator to complete. Reading rows immediately after the click can capture the old order. A web-first assertion on a known first row is useful when the fixture is controlled. For a generic helper, poll the extracted sequence until it is sorted, with a bounded timeout, rather than adding a fixed sleep.

## Use Intl.Collator for human text order

JavaScript's default sort compares UTF-16 code units. Uppercase letters, accents, and embedded numbers consequently produce an order few users expect. \`Intl.Collator\` implements locale-aware comparison and exposes options that should mirror the product.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('sorts Swedish product names with numeric segments', async ({ page }) => {
  await page.goto('/sv/products');
  await page.getByRole('columnheader', { name: 'Produkt' }).click();

  const actual = await page
    .locator('tbody [data-testid="product-name"]')
    .allInnerTexts();
  const collator = new Intl.Collator('sv-SE', {
    sensitivity: 'base',
    numeric: true,
    usage: 'sort',
  });
  const expected = [...actual].sort(collator.compare);

  expect(actual).toEqual(expected);
});
\`\`\`

Swedish is a useful test because Å, Ä, and Ö have locale-specific placement that differs from English assumptions. The \`numeric: true\` option puts “Product 2” before “Product 10.” \`sensitivity: 'base'\` ignores case and accent differences for primary comparison, so it is correct only if the product specifies that behavior.

When the backend uses database collation, ensure its locale and strength align with the browser expectation. A browser can faithfully compare using \`sv-SE\` while PostgreSQL or an API service uses a different collation. The failing end-to-end test is then revealing a real cross-layer contract mismatch, not test flakiness.

## Make ties and nulls deterministic

Consider totals \`[10, null, 10, 2]\`. A comparator that subtracts values converts \`null\` to zero and silently places it near real values. Model missingness before comparison.

\`\`\`typescript
type SortValue = { amount: number | null; invoiceId: string };

function compareAmountAscending(left: SortValue, right: SortValue): number {
  if (left.amount === null && right.amount === null) {
    return left.invoiceId.localeCompare(right.invoiceId);
  }
  if (left.amount === null) return 1;
  if (right.amount === null) return -1;

  return (
    left.amount - right.amount ||
    left.invoiceId.localeCompare(right.invoiceId)
  );
}
\`\`\`

This contract puts nulls last and uses invoice ID as a secondary key. If the UI promises stable sorting instead, capture the pre-click order and assert that equal values retain their relative indices. Do not accidentally impose an ID tie-breaker that the product never promised.

Descending order also needs a null decision. Reversing the complete ascending array moves nulls to the front. Many grids keep nulls last in both directions, so descending should reverse only the value comparison, not the missing-value clauses.

## Assert a virtualized or paginated table honestly

\`allInnerTexts()\` returns current DOM matches. In a virtualized grid, that may be only twelve visible rows from a dataset of thousands. Passing the assertion proves that the rendered window is ordered, not that the entire query result is ordered.

For pagination, verify several layers independently:

- Confirm the outgoing API request carries the expected sort field and direction.
- Assert the current page is internally ordered.
- Compare the last value on page one with the first value on page two, considering ties.
- Test backend ordering at the API or repository layer over a larger controlled dataset.

Virtual scrolling can be sampled by scrolling and collecting stable row identifiers, but DOM recycling complicates deduplication. Use that as a targeted component scenario, not as the only proof of global order. A component test can inject a fixed data source and validate calls to the sorting model more cheaply.

## Produce a failure that identifies the bad pair

An equality diff of 500 values is noisy. Add a small diagnostic that reports the first adjacent inversion. Adjacent comparison is sufficient: a sequence is sorted if no neighboring pair violates the comparator.

\`\`\`typescript
function firstInversion<T>(
  values: readonly T[],
  compare: (left: T, right: T) => number,
): number {
  for (let index = 1; index < values.length; index += 1) {
    if (compare(values[index - 1], values[index]) > 0) return index;
  }
  return -1;
}

const badIndex = firstInversion(actual, (left, right) => left - right);
expect(
  badIndex,
  badIndex < 0
    ? 'column is sorted'
    : \`row \${badIndex - 1} (\${actual[badIndex - 1]}) precedes row \${badIndex} (\${actual[badIndex]})\`,
).toBe(-1);
\`\`\`

Keep the full sequence as an attachment or log only when the test fails. The adjacent values direct the engineer to the formatting or comparator edge involved. Screenshot and trace retention then show whether the table was still loading.

## Prove both directions without copying the test

Ascending and descending cases share extraction and parsing, but their expected comparators should remain visible at the call site. Parameterize the direction, expected ARIA value, and comparator. Do not derive descending by reversing the ascending result when nulls must remain last. A two-case table is enough to exercise the header cycle while preserving readable failures.

Start each case from a known page state. Reloading is often clearer than assuming the previous parameterized case leaves the next case one click away from its desired direction. If initial ordering is supplied by a URL query, navigate with that query and assert it before clicking. This prevents test order from becoming an invisible prerequisite.

Include a dataset whose first and last values change between directions. A fixture containing identical values can make both cases pass without demonstrating movement. For stable ties, assign distinct row IDs and compare the ID sequence within each equal-value group. The primary value assertion and the stability assertion answer different questions, so label their failure messages separately.

## Choose the assertion layer by defect risk

| Layer | Best evidence | Blind spot |
|---|---|---|
| Comparator unit test | Many numeric, date, locale, tie, and null cases run quickly | Does not prove the UI invokes it |
| React component test | Header interaction, ARIA state, and rendered row sequence | May replace real server sorting |
| Playwright browser test | Integrated behavior and actual browser collation | Expensive for exhaustive combinations |
| API test | Global ordering across pages and server collation | Cannot detect stale icons or rendered formatting |
| Database test | Query ordering and null placement | Bypasses serialization and UI mapping |

A senior test strategy uses several narrow proofs. Put combinatorial comparator cases below the browser, then retain a few Playwright journeys for wiring, accessibility, rendering, and server integration. One enormous end-to-end scenario across every locale is slower and usually gives worse diagnostics.

Use soft assertions only when continuing provides independent evidence. For example, collecting failures for three columns can be helpful in a read-only grid. Continuing after the header failed to enter the requested state may cause downstream messages based on the wrong direction, so hard-assert the prerequisite first.

## Frequently Asked Questions

### Why does my sorted assertion always pass after calling sort()?

\`sort()\` mutates the original array. If the expected and actual variables reference that same array, both become sorted before comparison. Create the expected value from \`[...actual]\` or use \`toSorted()\` in a runtime that supports it.

### Should a Playwright test read displayed currency or a raw data attribute?

Read displayed text when the user-visible representation is the contract, using a parser tailored to that format. A semantic raw attribute is appropriate when the component explicitly defines it and another assertion verifies the display. Do not validate only hidden data while ignoring a misleading label.

### How do I wait for server-side sorting to finish?

Wait on a meaningful completion signal: the sorting network response, disappearance of a loading state, or a web-first assertion for a known boundary row. A fixed timeout is vulnerable to both slow CI and needlessly long local runs.

### Is localeCompare enough for names containing numbers?

Not without matching options. Construct \`Intl.Collator\` with the required locale and \`numeric: true\` when labels such as Item 2 and Item 10 should use natural numeric order. Align sensitivity and collation with the server contract.

### Can row-order assertions prove that an entire paginated result is sorted?

No. They prove only the observed page or rendered window. Add API-level checks for global ordering and verify page boundaries. For a virtualized table, explicitly state how much data the browser assertion observes.
`,
};
