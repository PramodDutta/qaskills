import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Assert That a Playwright List Has No Duplicate Items',
  description:
    'Detect duplicate list items in Playwright with stable keys, normalized text, retrying assertions, and diagnostics that identify every repeated record.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Assert That a Playwright List Has No Duplicate Items

The customer table says it contains 50 records, yet two rows carry the same order ID. A count assertion passes because the duplicate displaced another record. A text snapshot may also pass if it was updated after the regression. Duplicate detection needs its own invariant: extract the identity users rely on, normalize it deliberately, and prove that every rendered identity occurs once.

This sounds like a one-line \`Set\` comparison, but the interesting test-design work comes before that line. What counts as identity? Is case significant? Can virtualization recycle DOM nodes? Is the list still loading? Should hidden template rows count? The answers determine whether the assertion catches a data defect or manufactures noise.

## Choose the field that defines sameness

A row is not duplicate merely because two customers share the name “Alex Kim.” Conversely, two cards with different status labels may still duplicate the same product. Select a key that the product treats as unique, ideally a stable ID exposed in visible text, an accessible label, a link destination, or a test-oriented attribute.

| Collection | Weak comparison | Better uniqueness key | Reason |
|---|---|---|---|
| Orders | Entire row text | Order number | Status and amount can legitimately change |
| Search suggestions | Display label alone | Destination URL or entity ID | Different entities may have the same label |
| Shopping cart | Product title | SKU plus selected variant | Size or color creates distinct line items |
| Audit events | Timestamp | Event identifier | Several events may share timestamp precision |
| User directory | Person name | Account ID or normalized email | Names are not globally unique |

Visible identity is preferable when the acceptance criterion is user-facing. A \`data-testid\` key is appropriate when the UI intentionally hides the database ID but the test must validate pagination or merge behavior. Do not read React internals or framework-generated keys. They are implementation details and can remain unique while the product displays duplicate business records.

## A direct assertion with useful failure output

Suppose each order row contains a link named with its order number. Wait for the loading indicator to disappear, assert the expected row count if the contract provides one, then extract keys from the specific descendant locator.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('orders contain no repeated order numbers', async ({ page }) => {
  await page.goto('/orders');

  await expect(page.getByRole('progressbar')).toBeHidden();
  const rows = page.getByRole('row').filter({ has: page.getByRole('link', { name: /^ORD-/ }) });
  await expect(rows).toHaveCount(50);

  const orderNumbers = await rows
    .getByRole('link', { name: /^ORD-/ })
    .allTextContents();
  const normalized = orderNumbers.map((value) => value.trim());
  const frequencies = new Map<string, number>();

  for (const orderNumber of normalized) {
    frequencies.set(orderNumber, (frequencies.get(orderNumber) ?? 0) + 1);
  }

  const duplicates = [...frequencies.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));

  expect(duplicates, 'duplicate order numbers').toEqual([]);
});
\`\`\`

Comparing \`new Set(normalized).size\` with \`normalized.length\` is mathematically sufficient, but its failure says only that two numbers differ. The frequency map reports which values repeated and how often. That turns a red build into a queryable defect rather than a reproduction exercise.

The \`allTextContents()\` call returns immediately for the currently matched elements. The preceding web-first assertions provide the synchronization boundary. Without them, a test can inspect the first page while rows are still streaming in and produce a false pass because only three unique items exist at that instant.

## Normalize according to the product contract

Normalization is not generic cleanup. It defines equivalence. Trimming outer whitespace is usually safe because layout whitespace is not identity. Lowercasing is correct for case-insensitive email addresses in many product contracts, but wrong for case-sensitive coupon codes or identifiers. Removing punctuation from an order number can accidentally collapse two legal values.

| Normalization | Appropriate example | Dangerous counterexample |
|---|---|---|
| \`trim()\` | Text nodes padded by layout whitespace | Leading spaces are meaningful fixed-width data |
| \`toLocaleLowerCase('en-US')\` | Product-defined case-insensitive usernames | Case-sensitive repository paths |
| Unicode \`normalize('NFC')\` | Canonically equivalent human names | Byte-exact tokens or signatures |
| Collapse internal whitespace | Titles rendered from rich text | Search terms where spacing changes meaning |
| Strip currency formatting | Comparing numeric amounts | Detecting duplicate display strings |

Put normalization in a named function so reviewers can see the equivalence policy. Avoid a long chain embedded in the assertion.

\`\`\`ts
function canonicalEmail(rendered: string): string {
  return rendered.trim().normalize('NFC').toLocaleLowerCase('en-US');
}

function repeatedValues(values: readonly string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts].filter(([, count]) => count > 1);
}

test('directory has unique email accounts', async ({ page }) => {
  await page.goto('/people');
  const emails = page.getByTestId('person-email');

  await expect(emails.first()).toBeVisible();
  await expect
    .poll(async () => emails.count(), { message: 'wait for directory to stabilize' })
    .toBeGreaterThan(20);

  const values = (await emails.allTextContents()).map(canonicalEmail);
  expect(repeatedValues(values), 'repeated canonical emails').toEqual([]);
});
\`\`\`

The polling example only proves a lower bound, not completion. Use it when the interface has no fixed total but does expose a reliable minimum for the fixture. A better application contract would expose an end-of-results marker, settled loading state, or total count. Synchronize on that signal whenever available.

## Make the assertion retry the whole observation

Playwright's locator assertions retry, but a generic \`expect(array)\` assertion does not. Once \`allTextContents()\` has returned, the array is a snapshot. If rows can temporarily duplicate while client-side reconciliation replaces placeholders, wrap extraction and comparison in \`expect.poll\` so the entire observation repeats.

\`\`\`ts
test('live search results settle without duplicate products', async ({ page }) => {
  await page.goto('/catalog');
  await page.getByRole('searchbox').fill('mechanical keyboard');

  const productLinks = page.getByTestId('search-results').getByRole('link');

  await expect.poll(
    async () => {
      const hrefs = await productLinks.evaluateAll((links) =>
        links.map((link) => (link as HTMLAnchorElement).href),
      );
      const repeated = repeatedValues(hrefs);
      return { total: hrefs.length, repeated };
    },
    {
      message: 'product destinations should become unique',
      timeout: 10_000,
      intervals: [100, 250, 500, 1_000],
    },
  ).toEqual({ total: 24, repeated: [] });
});
\`\`\`

This is appropriate only if transient duplication is allowed. If users can observe the duplicated rows and that flash is the defect, retrying until it disappears masks the problem. In that case, capture each render checkpoint or assert immediately after the triggering response. Test the user contract, not the final DOM merely because it is easier.

For cases where you want to gather several independent collection problems before ending the test, [Playwright soft assertions](/blog/playwright-soft-assertions-expect-guide) can preserve multiple diagnostics. Do not use soft assertions to continue into destructive actions after list identity has already proven unsafe.

## Empty values are duplicates too, sometimes

Two blank keys make a \`Set\` smaller and will be reported as a duplicate, but “duplicate blank” is less actionable than “two rows are missing IDs.” Validate completeness separately before uniqueness:

\`\`\`ts
const ids = await page.getByTestId('invoice-id').allTextContents();
const cleaned = ids.map((id) => id.trim());

expect(cleaned, 'every invoice needs a rendered ID').not.toContain('');
expect(repeatedValues(cleaned), 'invoice IDs must be unique').toEqual([]);
\`\`\`

Separate assertions communicate separate failure classes. The same principle applies to malformed keys. If order IDs must match \`/^ORD-\\d{8}$/\`, check the format as well as uniqueness. Five unique strings reading \`undefined\` plus a suffix generated by the UI are not valid business identities.

## Pagination requires a scope decision

“No duplicates” can mean within the current page, across sequential pages, or across the complete filtered result. These are different guarantees. For cursor pagination, retain a set across navigation and fail with the pages on which an ID appeared.

\`\`\`ts
test('cursor pagination never repeats an article', async ({ page }) => {
  await page.goto('/articles');
  const seenOnPage = new Map<string, number>();

  for (let pageNumber = 1; pageNumber <= 5; pageNumber += 1) {
    const cards = page.getByTestId('article-card');
    await expect(cards).toHaveCount(20);

    const ids = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute('data-article-id') ?? ''),
    );

    for (const id of ids) {
      expect(id, \`missing article ID on page \${pageNumber}\`).not.toBe('');
      expect(
        seenOnPage.get(id),
        \`article \${id} repeated on pages \${seenOnPage.get(id)} and \${pageNumber}\`,
      ).toBeUndefined();
      seenOnPage.set(id, pageNumber);
    }

    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(new RegExp(\`page=\${pageNumber + 1}\`));
  }
});
\`\`\`

For infinite scroll, continue until an explicit end marker or a fixture-known total is reached. Scrolling an arbitrary five times tests only that window. If the dataset changes during the test, even a correct offset-based API can repeat records; seed or isolate data when the acceptance criterion assumes a stable collection.

## Virtualized lists change what the DOM can prove

A virtual scroller may render only twelve nodes for ten thousand records and recycle those nodes as the viewport moves. \`locator.allTextContents()\` can only inspect mounted elements. It cannot prove global uniqueness. Choose among three honest approaches:

| Approach | What it proves | Cost or caveat |
|---|---|---|
| Scroll and accumulate stable IDs | Every item encountered through the UI traversal | Requires reliable end detection and recycled-node handling |
| Assert the backing API response | Payload contains unique records | Does not prove rendering avoids duplicates |
| Use a small non-virtual fixture | Renderer maps known items once | Does not exercise long-list window transitions |
| Combine API and viewport checks | Data uniqueness plus representative rendering | More setup and two clearly scoped assertions |

Do not disable virtualization in the test environment and then claim coverage of a production-only duplication bug caused by window boundaries. A focused fixture with enough records to cross several virtual windows is usually more valuable than a huge random dataset.

## Duplicate diagnostics that shorten triage

When a failure occurs, attach the extracted keys and contextual rows. Playwright already captures traces according to configuration, but a compact JSON attachment lets a reviewer see the collision immediately.

\`\`\`ts
test('inventory SKUs are unique', async ({ page }, testInfo) => {
  await page.goto('/inventory');
  const rows = page.getByTestId('inventory-row');
  await expect(rows).toHaveCount(100);

  const records = await rows.evaluateAll((nodes) =>
    nodes.map((node, index) => ({
      index,
      sku: node.querySelector('[data-testid="sku"]')?.textContent?.trim() ?? '',
      text: node.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
    })),
  );
  const duplicates = repeatedValues(records.map((record) => record.sku));

  if (duplicates.length > 0) {
    await testInfo.attach('rendered-inventory.json', {
      body: Buffer.from(JSON.stringify({ duplicates, records }, null, 2)),
      contentType: 'application/json',
    });
  }

  expect(duplicates).toEqual([]);
});
\`\`\`

Record indexes help identify adjacency patterns, such as the last record of one API page repeating as the first of the next. Full row text provides context without changing the uniqueness key. Be careful with personal or secret data in CI attachments. Redact fields or use synthetic fixtures.

## Common assertions that miss the defect

• \`toHaveCount(expected)\` checks quantity, not distinctness. Use it as a loading and completeness guard.
• Comparing sorted visible labels proves a known fixture exactly, but becomes brittle if irrelevant labels change.
• \`toHaveText([...])\` is excellent when the entire ordered collection is the contract. It is excessive when only identity uniqueness matters.
• Checking each row against the immediately previous row catches adjacent duplicates only. Sorting, grouping, or pagination can separate repeats.
• Running a database uniqueness query does not prove the frontend avoided appending the same response twice.

Good Playwright tests keep locators user-oriented, synchronize with observable states, and assert the narrow business invariant. The [Playwright best practices guide](/blog/playwright-best-practices-2026) places this pattern within broader locator and isolation choices.

## Package diagnostics without hiding identity choice

When many suites need the same frequency reporting, create a matcher for already extracted primitive values. Keep normalization and locator selection in each test so the business identity remains visible.

\`\`\`ts
import { expect as baseExpect } from '@playwright/test';

export const expect = baseExpect.extend({
  toContainUniqueValues(received: readonly string[]) {
    const indexes = new Map<string, number[]>();
    received.forEach((value, index) => {
      indexes.set(value, [...(indexes.get(value) ?? []), index]);
    });
    const duplicates = [...indexes]
      .filter(([, positions]) => positions.length > 1)
      .map(([value, positions]) => ({ value, positions }));
    return {
      pass: duplicates.length === 0,
      message: () => \`duplicate values: \${JSON.stringify(duplicates, null, 2)}\`,
    };
  },
});
\`\`\`

Unit-test the matcher with empty, unique, adjacent, separated, and three-occurrence inputs. It deliberately does not trim or lowercase, because those rules belong to the collection's contract.

## Locate duplication in the payload or renderer

Observe the collection API when triage needs layer ownership. Compare unique payload IDs and unique rendered IDs separately. If the payload is clean but DOM keys repeat, investigate state reconciliation, pagination append logic, list keys, or virtualization. If the response already repeats IDs, the browser is exposing an upstream defect.

\`\`\`ts
const responsePromise = page.waitForResponse((response) =>
  response.url().includes('/api/orders?') && response.request().method() === 'GET',
);
await page.goto('/orders');
const payload = (await (await responsePromise).json()) as {
  items: Array<{ id: string }>;
};
expect(repeatedValues(payload.items.map((item) => item.id))).toEqual([]);

const rendered = await page.getByTestId('order-row').evaluateAll((rows) =>
  rows.map((row) => row.getAttribute('data-order-id') ?? ''),
);
expect(repeatedValues(rendered)).toEqual([]);
\`\`\`

This diagnostic pattern should not turn every UI case into a response-implementation assertion. Use it where the cross-layer invariant is valuable and label each failure by layer.

Sorting and filters create special collision windows. Run uniqueness after reversing sort, removing a filter, refreshing a cursor, and navigating backward. Seed records with equal timestamps to expose unstable pagination order. When a duplicate displaces another row, compare the complete expected ID set so the missing identity is reported too.

## Handle duplicate labels with composite keys

Sometimes no single rendered field is unique. A flight list may repeat a flight number across dates, and a cart can contain the same SKU in multiple fulfillment groups. Compose only the fields defined by the domain:

\`\`\`ts
const keys = await page.getByTestId('flight-row').evaluateAll((rows) =>
  rows.map((row) => {
    const number = row.querySelector('[data-testid="flight-number"]')?.textContent?.trim();
    const date = row.querySelector('time')?.getAttribute('datetime');
    return JSON.stringify([number, date]);
  }),
);
expect(repeatedValues(keys)).toEqual([]);
\`\`\`

JSON encoding avoids delimiter collisions that occur with \`number + ':' + date\` when values can contain the separator. Validate every component before composing it. A unique combination containing missing values may still hide malformed rows.

Duplicate accessibility names are a separate concern. Two “Edit” buttons can be valid if their row context disambiguates them, while identical standalone links may be unusable. Do not substitute an accessibility-name uniqueness rule for record identity. Test accessible naming with the relevant role and context.

Finally, account for intentional repetitions such as pinned items also shown in the main feed. The product may require deduplication across sections or may deliberately show two views of one record. Scope the locator and assertion to the stated user expectation, and name the test so reviewers can see whether cross-section repetition is allowed.

## Frequently Asked Questions

### Should I compare text or a data attribute for duplicate rows?

Use the business identity closest to the requirement. Choose visible text when users identify the record by that text. Choose a stable attribute when labels can collide legitimately or the true identifier is intentionally not displayed. Never use framework-generated node IDs.

### Why did my uniqueness test pass before all results loaded?

Generic assertions on extracted arrays do not auto-retry, and a partial list can be perfectly unique. Wait for an explicit completion signal or expected count before extraction, or place the complete extraction inside \`expect.poll\` when eventual settlement is the intended behavior.

### How can I report all repeated values instead of the first one?

Build a frequency map and compare the filtered entries with an empty array. Include counts and, when useful, row indexes or page numbers. This produces one failure containing every collision without weakening the assertion.

### Does a Set handle duplicate objects from \`evaluateAll\`?

Not by value. JavaScript sets compare object references, so separately created objects remain distinct even when their fields match. Map records to a primitive key such as SKU, ID, or canonical email before constructing the set or frequency map.

### How do I test uniqueness in an infinite or virtual list?

Traverse until a trustworthy end condition while accumulating stable keys, and ensure the fixture crosses multiple rendering windows. If exhaustive UI traversal is impractical, split the claim: validate payload uniqueness at the API boundary and test representative virtual-window transitions in the browser.
`,
};
