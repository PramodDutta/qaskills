import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Pagination: Cursor vs Offset Strategies That Catch Data Defects',
  description: 'Master API testing pagination cursor vs offset with invariant-based checks for coverage, ordering, mutation safety, invalid tokens, and reliable automation.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# API Testing Pagination: Cursor vs Offset Strategies That Catch Data Defects

API pagination tests should verify a traversal contract, not only the first response shape. For offset pagination, test boundary arithmetic, stable ordering, total-count semantics, and the effects of inserts or deletes between requests. For cursor pagination, treat the cursor as opaque, follow the server-provided continuation link or token, verify uniqueness and termination, and exercise invalid, expired, and mismatched cursors. In both designs, assert that a complete traversal has no duplicates, no unexplained gaps, and a deterministic order for a fixed dataset.

The core difference is the client's position model. Offset pagination says “skip this many rows,” so concurrent changes before the offset can shift the window. Cursor pagination says “continue after this position in an ordered result,” so a well-designed cursor can remain stable under many inserts, but it introduces token lifecycle and query-binding behaviors. API testing pagination cursor vs offset therefore needs two related but distinct oracle models.

This guide builds runnable TypeScript test helpers, mutation experiments, negative cases, performance probes, and CI data strategies for QA and test-automation engineers. The examples use ordinary HTTP client abstractions so the invariants transfer to Supertest, Playwright request contexts, REST clients, or an AI coding agent's chosen test harness without inventing tool-specific flags.

## Turn the pagination contract into observable invariants

Before writing requests, document what the endpoint promises. A response that contains ten valid items can still be wrong if the second page repeats two items, if equal timestamps reorder between calls, or if a filter is silently lost when following the cursor.

| Contract dimension | Offset question | Cursor question | Cross-strategy invariant |
|---|---|---|---|
| Position | What does \`offset\` count? | Is the token “after” or “before” an item? | Traversal moves in one declared direction |
| Limit | Is zero accepted, rejected, or defaulted? | Is page size encoded or independently supplied? | Server enforces documented bounds |
| Ordering | Which fields make order total and stable? | Which order is embedded or bound to token? | Ties have a deterministic tiebreaker |
| Continuation | Compute next offset or use server link? | Use next cursor or link exactly as returned? | Terminal page is unambiguous |
| Count | Total snapshot, live estimate, or absent? | Usually optional and potentially expensive | Meaning is documented and tested |
| Mutation | Rows may shift before an offset | Cursor should preserve position semantics | Behavior under writes matches promise |

The most important prerequisite is deterministic ordering. Sorting only by \`createdAt\` is not total when two records share a timestamp. Add a unique tiebreaker such as \`id\` and specify direction for both fields. Without that, duplicates and gaps can occur even against a static dataset, and tests will flicker while every individual response appears valid.

A concrete fixture can make the oracle explicit:

\`\`\`ts
type Ticket = {
  id: string;
  createdAt: string;
  priority: 'low' | 'high';
};

const expectedTickets: Ticket[] = [
  { id: 't-105', createdAt: '2026-08-07T10:02:00.000Z', priority: 'high' },
  { id: 't-104', createdAt: '2026-08-07T10:01:00.000Z', priority: 'low' },
  { id: 't-103', createdAt: '2026-08-07T10:01:00.000Z', priority: 'high' },
  { id: 't-102', createdAt: '2026-08-07T10:00:00.000Z', priority: 'low' },
  { id: 't-101', createdAt: '2026-08-07T09:59:00.000Z', priority: 'high' },
];
\`\`\`

The expected order assumes descending \`createdAt\` and descending \`id\` as a tiebreaker. Your API can choose another order, but the test must know it. Seed values on both sides of page boundaries, including tied sort values, because that is where weak queries reveal themselves.

## Build a reusable page assertion without hiding semantics

Use a small response model and keep strategy-specific fields optional only at the shared transport boundary. Individual tests should narrow to the documented shape.

\`\`\`ts
type Page<T> = {
  items: T[];
  nextCursor?: string | null;
  next?: string | null;
  total?: number;
  limit?: number;
  offset?: number;
};

type HttpResponse<T> = {
  status: number;
  headers: Record<string, string | undefined>;
  body: T;
};

interface ApiClient {
  get<T>(path: string): Promise<HttpResponse<T>>;
}

function expectValidItemsPage<T>(response: HttpResponse<Page<T>>): void {
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body.items)).toBe(true);
  expect(response.body.items.length).toBeLessThanOrEqual(
    response.body.limit ?? Number.POSITIVE_INFINITY,
  );
}
\`\`\`

This helper verifies basic structure, not the endpoint's business contract. The scenario still needs unique IDs, exact order, filters, counts, continuation semantics, and error behavior. Helpers should remove transport repetition while leaving the important expectations visible.

If the project uses Node and Express, the [Supertest API testing guide](/blog/supertest-node-api-testing-complete-guide) can supply the request wiring around these assertions. Keep the traversal logic independent so it can also run against a deployed base URL.

Avoid an assertion that every nonterminal page contains exactly \`limit\` items unless the contract guarantees it. Authorization filtering, post-query filtering, deleted records, or implementation details can produce short pages with a valid continuation. The correct terminal signal is the documented absence of a next token or link, not merely \`items.length < limit\`.

## Test offset arithmetic at every boundary

Offset APIs commonly accept \`limit\` and \`offset\` query parameters. A deterministic dataset lets you assert exact slices, including the final partial page and the first empty page after the dataset.

\`\`\`ts
async function fetchOffsetPage(
  client: ApiClient,
  offset: number,
  limit: number,
): Promise<Page<Ticket>> {
  const response = await client.get<Page<Ticket>>(
    \`/api/tickets?offset=\${offset}&limit=\${limit}\`,
  );
  expectValidItemsPage(response);
  expect(response.body.offset).toBe(offset);
  expect(response.body.limit).toBe(limit);
  return response.body;
}

test('offset pages partition a fixed five-ticket dataset', async () => {
  const first = await fetchOffsetPage(api, 0, 2);
  const second = await fetchOffsetPage(api, 2, 2);
  const final = await fetchOffsetPage(api, 4, 2);
  const empty = await fetchOffsetPage(api, 5, 2);

  expect(first.items.map((item) => item.id)).toEqual(['t-105', 't-104']);
  expect(second.items.map((item) => item.id)).toEqual(['t-103', 't-102']);
  expect(final.items.map((item) => item.id)).toEqual(['t-101']);
  expect(empty.items).toEqual([]);
});
\`\`\`

Notice the empty request uses offset five, exactly the dataset size. Also test an offset beyond the size according to the contract. Most list APIs return an empty successful page, but some domain protocols reject an out-of-range page. Assert the documented behavior rather than assuming one universal rule.

Boundary values require explicit decisions:

| Input | Questions to settle | Useful assertion |
|---|---|---|
| \`offset=0\` | Is zero the first position? | First expected item appears |
| Offset omitted | What default applies? | Metadata and item count reflect default |
| Negative offset | Validation status and error code? | No silent coercion to zero |
| Non-integer offset | Rejected or parsed? | Documented validation response |
| \`limit=1\` | Smallest positive page? | One item and correct continuation |
| Limit above maximum | Rejected or capped? | Response follows published policy |
| Offset at total | Empty success or error? | Exact terminal contract |

Do not test only \`offset=0\` and \`limit=10\` on a dataset with three records. That never exercises the skip logic, page seams, or final-page arithmetic. Seed at least \`2 * limit + 1\` items for a compact three-page traversal.

## Traverse every offset page and detect duplicates or gaps

Exact slice tests are useful with a small seed. A generic traversal check scales to larger datasets and randomized scenarios. Collect IDs while advancing by the response's documented page width or by the requested limit, depending on the API contract.

\`\`\`ts
async function collectByOffset(
  client: ApiClient,
  limit: number,
): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;

  for (;;) {
    const page = await fetchOffsetPage(client, offset, limit);
    ids.push(...page.items.map((item) => item.id));

    if (page.items.length === 0) break;
    offset += page.items.length;
  }

  return ids;
}

test('offset traversal covers the seeded snapshot exactly once', async () => {
  const ids = await collectByOffset(api, 2);
  const expectedIds = expectedTickets.map((item) => item.id);

  expect(ids).toEqual(expectedIds);
  expect(new Set(ids).size).toBe(ids.length);
});
\`\`\`

Advancing by received length works only if a short page does not mean terminal and the server treats offset as a count over returned-visible records. Some APIs expect the requested limit as the next increment. Follow the documented contract, and prefer a server-supplied \`next\` link when available because it centralizes continuation construction.

Add a loop guard in tests that consume an unknown service. A pagination defect might return the same page forever. The test should fail with a useful message instead of exhausting the test timeout or CI memory.

\`\`\`ts
async function collectAtMost(
  load: (offset: number) => Promise<Page<Ticket>>,
  maximumPages: number,
): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;

  for (let pageNumber = 0; pageNumber < maximumPages; pageNumber += 1) {
    const page = await load(offset);
    ids.push(...page.items.map((item) => item.id));
    if (page.items.length === 0) return ids;
    offset += page.items.length;
  }

  throw new Error(\`Pagination did not terminate within \${maximumPages} pages\`);
}
\`\`\`

The guard value should exceed the expected page count while remaining bounded. Include the last offset, cursor, and sampled IDs in a real failure message when possible.

## Expose offset drift with controlled concurrent writes

Offset pagination is sensitive to mutations before the current window. A test should demonstrate the API's declared consistency, not necessarily demand snapshot isolation from an endpoint that promises live results.

Imagine descending creation order with limit two:

1. Page one returns \`t-105, t-104\`.
2. Another client inserts \`t-106\` at the front.
3. The original client asks for offset two.
4. The shifted window can return \`t-104, t-103\`, duplicating \`t-104\`.

Write the experiment with explicit data ownership:

\`\`\`ts
test('documents offset behavior when a newer ticket is inserted', async () => {
  const first = await fetchOffsetPage(api, 0, 2);
  expect(first.items.map((item) => item.id)).toEqual(['t-105', 't-104']);

  await seedApi.createTicket({
    id: 't-106',
    createdAt: '2026-08-07T10:03:00.000Z',
    priority: 'high',
  });

  const second = await fetchOffsetPage(api, 2, 2);
  const combined = [...first.items, ...second.items].map((item) => item.id);

  expect(combined).toEqual(['t-105', 't-104', 't-104', 't-103']);
});
\`\`\`

This expectation documents live offset semantics, including the duplicate. If the endpoint promises snapshot consistency through a revision parameter or transaction-bound token, the expected result should instead have no duplicate. The test is valuable because it makes the promise explicit.

Run a symmetric deletion experiment. Deleting an item from before the next offset shifts later rows left, which can create a gap. These tests help product teams decide whether offset is acceptable for back-office tables, exports, infinite scroll, or audit feeds.

| Mutation between pages | Typical offset effect | User-facing risk |
|---|---|---|
| Insert before current position | Previously seen item may repeat | Duplicate card or row |
| Delete before current position | Unseen item may be skipped | Missing result |
| Update sort key forward | Item can move into an earlier page | Missing or duplicate during traversal |
| Update sort key backward | Item can reappear later | Duplicate action or processing |
| Mutation after current position | Often no immediate shift | Later ordering still changes |

Do not label these outcomes bugs until the consistency contract says so. For a frequently changing feed, cursor pagination is often the better interface. For a stable admin query where users jump to page 27 and approximate count matters, offset may be the practical choice.

## Treat cursor values as opaque capabilities

A cursor client should store or follow the token, not decode it and construct the next one. Even if a token looks like Base64-encoded JSON, its format is server-owned and may change, be signed, or contain internal ordering details.

\`\`\`ts
type CursorPage<T> = {
  items: T[];
  nextCursor: string | null;
};

async function fetchCursorPage(
  client: ApiClient,
  limit: number,
  cursor?: string,
): Promise<CursorPage<Ticket>> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor !== undefined) query.set('cursor', cursor);

  const response = await client.get<CursorPage<Ticket>>(
    \`/api/tickets?\${query.toString()}\`,
  );

  expect(response.status).toBe(200);
  expect(Array.isArray(response.body.items)).toBe(true);
  expect(response.body.items.length).toBeLessThanOrEqual(limit);
  return response.body;
}

test('cursor traversal returns every seeded ticket exactly once', async () => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  let cursor: string | undefined;

  for (let pageNumber = 0; pageNumber < 10; pageNumber += 1) {
    const page = await fetchCursorPage(api, 2, cursor);

    for (const item of page.items) {
      expect(seen.has(item.id)).toBe(false);
      seen.add(item.id);
      ordered.push(item.id);
    }

    if (page.nextCursor === null) break;
    expect(page.nextCursor).not.toBe(cursor);
    cursor = page.nextCursor;
  }

  expect(ordered).toEqual(expectedTickets.map((item) => item.id));
});
\`\`\`

The loop checks uniqueness and token progress. Add an explicit terminated flag in production test code so reaching the page guard cannot accidentally pass with an incomplete collection. The expected sequence proves gaps as well as duplicates for the known fixture.

If the API returns a full \`next\` URL, follow it according to the security model. A test should verify its origin and expected path before sending credentials, especially if the client automatically follows server-provided links. This protects against malformed continuation links while keeping cursor construction server-owned.

## Test cursor binding, expiry, and tampering

Cursor negative tests depend on the documented policy. A well-designed token is often bound to some combination of sort, direction, filter, tenant, and page position. Reusing it with incompatible query parameters should not silently return an unrelated page.

Build a matrix with expected API-specific error responses:

| Cursor scenario | Example action | Contract decision to assert |
|---|---|---|
| Malformed token | Send random text | Validation error, not server crash |
| Tampered token | Change one character | Rejected if signed or integrity protected |
| Expired token | Use token after documented lifetime | Defined expiry response and restart guidance |
| Filter mismatch | Obtain under \`priority=high\`, reuse under \`low\` | Reject or preserve bound original filter |
| Sort mismatch | Obtain descending, request ascending | Reject rather than reinterpret position |
| Tenant mismatch | Reuse across authorized tenant contexts | Never disclose or traverse other tenant data |
| Terminal token | Continue after final page if token is absent | Client stops, no fabricated cursor |

A malformed-token test can remain transport-neutral:

\`\`\`ts
test('rejects a malformed cursor without exposing internals', async () => {
  const response = await api.get<{
    code: string;
    message: string;
  }>('/api/tickets?limit=2&cursor=not-a-valid-token');

  expect(response.status).toBe(400);
  expect(response.body.code).toBe('INVALID_CURSOR');
  expect(response.body.message).not.toMatch(/stack|database|sql/i);
});
\`\`\`

The status and code are example contract choices for this endpoint, not universal standards. Replace them with the documented API behavior. The invariant is controlled rejection without internal leakage or a generic 500.

For expiry, avoid sleeping until a real production lifetime elapses. Use a test environment with an injectable clock, a short documented test policy, or a server-side fixture capable of issuing expired tokens. Do not decode and edit the cursor unless tamper testing explicitly needs corrupted input.

Tenant binding is a security test as well as pagination coverage. Acquire a valid cursor as tenant A, authenticate as tenant B, and verify no tenant A items are returned. The service may respond with an invalid-cursor error or treat the token as unusable in B's result set. Either outcome must avoid disclosure.

## Verify cursor behavior during concurrent mutations

For descending keyset pagination based on \`(createdAt, id)\`, a cursor representing the last seen item usually lets the next query request rows strictly older than that tuple. A new item inserted ahead of the cursor should not shift the next window, so the original traversal avoids the duplicate seen with offsets.

\`\`\`ts
test('a new leading item does not shift an existing cursor traversal', async () => {
  const first = await fetchCursorPage(api, 2);
  expect(first.items.map((item) => item.id)).toEqual(['t-105', 't-104']);
  expect(first.nextCursor).not.toBeNull();

  await seedApi.createTicket({
    id: 't-106',
    createdAt: '2026-08-07T10:03:00.000Z',
    priority: 'high',
  });

  const second = await fetchCursorPage(api, 2, first.nextCursor ?? undefined);
  expect(second.items.map((item) => item.id)).toEqual(['t-103', 't-102']);
});
\`\`\`

This does not prove snapshot isolation. The traversal may still reflect updates or deletions after the cursor depending on the service contract. Cursor pagination often provides position stability, not a frozen dataset. Write tests for the exact guarantee.

What people get wrong is claiming cursor pagination eliminates all duplicates and gaps under every mutation. If a row's sort key changes across the cursor boundary, it can move. If records are deleted before they are reached, a live traversal cannot return them. If the ordering key is not unique, the query can still skip tied rows. Cursor design reduces a class of shifting-window defects; it does not replace a consistency model.

## Validate filters, sorting, and authorization across pages

The second page must preserve every query dimension from the first. A common implementation bug creates a cursor from sort values but forgets the filter, or returns a next link missing a parameter.

For a filtered traversal, assert every item on every page:

\`\`\`ts
async function collectHighPriorityTickets(client: ApiClient): Promise<Ticket[]> {
  const collected: Ticket[] = [];
  let cursor: string | undefined;

  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const query = new URLSearchParams({ priority: 'high', limit: '2' });
    if (cursor) query.set('cursor', cursor);

    const response = await client.get<CursorPage<Ticket>>(
      \`/api/tickets?\${query.toString()}\`,
    );
    expect(response.status).toBe(200);

    for (const ticket of response.body.items) {
      expect(ticket.priority).toBe('high');
      collected.push(ticket);
    }

    if (response.body.nextCursor === null) return collected;
    cursor = response.body.nextCursor;
  }

  throw new Error('High-priority pagination did not terminate');
}
\`\`\`

Run the same concept for authorization. Seed alternating records the caller may and may not view, then assert no forbidden ID appears and every authorized expected ID is eventually returned. Page sizes may be short if authorization filtering occurs after a database query, though that architecture can itself create poor pagination semantics. Tests should catch premature termination where a short filtered page incorrectly returns no next cursor while authorized records remain later.

Ordering assertions should compare adjacent items across page seams, not only within each page. Combine the full traversal and verify the comparator over every pair. Tied primary sort values are essential test data.

## Test count metadata without making it the traversal oracle

Offset endpoints often expose \`total\`; cursor endpoints sometimes do. Define whether total is exact, estimated, filter-aware, authorization-aware, and consistent for the duration of traversal. A live total can change between pages, so it may not equal the number collected after concurrent writes.

| Count policy | Valid assertion | Invalid assumption |
|---|---|---|
| Exact static total | Equals seeded visible records | Remains fixed during writes unless promised |
| Exact live total | Matches database at each request time | Same value across traversal |
| Estimated total | Within documented semantics | Exact equality to collected IDs |
| Filtered total | Equals records matching active filter | Represents all unfiltered records |
| Authorization-aware total | Does not reveal forbidden population | Administrator and user see same value |
| No total | Termination uses continuation signal | Client can infer final count early |

Do not stop cursor traversal because \`collected.length >= total\` unless the contract explicitly couples them. Stop on the server's terminal continuation signal. A stale or estimated count must not make the client omit valid pages.

Counts can leak sensitive information. A user who cannot view confidential tickets should not receive a total that includes them unless the product explicitly permits aggregate disclosure. Seed hidden records and assert the count policy alongside item filtering.

## Measure deep-page performance without fragile timing claims

Offset implementations may become more expensive at deep positions because the data store still has to find and skip rows. Cursor queries can use an appropriate ordered index to seek from a key. Performance depends on the database, indexes, filters, query plan, cache, and payload, so avoid universal millisecond thresholds in a shared article.

Build a controlled test or benchmark that compares equivalent pages over a seeded dataset:

\`\`\`ts
type Sample = { strategy: 'offset' | 'cursor'; elapsedMs: number };

async function measure<T>(
  strategy: Sample['strategy'],
  request: () => Promise<T>,
): Promise<Sample> {
  const started = performance.now();
  await request();
  return { strategy, elapsedMs: performance.now() - started };
}

test('records deep-page latency for regression analysis', async () => {
  const offsetSample = await measure('offset', () =>
    api.get('/api/tickets?offset=50000&limit=50'),
  );
  const cursorSample = await measure('cursor', () =>
    api.get(\`/api/tickets?cursor=\${knownDeepCursor}&limit=50\`),
  );

  expect(offsetSample.elapsedMs).toBeGreaterThan(0);
  expect(cursorSample.elapsedMs).toBeGreaterThan(0);
  recordPerformanceSamples([offsetSample, cursorSample]);
});
\`\`\`

The test records samples; it does not claim one noisy request proves a regression. Establish warmed and cold conditions, collect distributions, and gate only against a repository-owned service-level objective with environment controls. Query-plan tests at the data layer can verify index usage more deterministically where supported.

Never log raw cursors casually. They may encode or sign internal position data and can behave like scoped capabilities. Redact them in shared CI artifacts while keeping a stable fingerprint for correlating repeated-token failures.

## Create CI data that makes pagination defects reproducible

Pagination tests fail when seed data is too neat or shared between parallel jobs. Give each run an isolated namespace or tenant, freeze controlled timestamps, and clean up by that namespace. Include enough records to cross several boundaries.

A purposeful seed matrix contains:

- At least three pages plus one item for the chosen limit.
- Multiple rows with the same primary sort value.
- Authorized and unauthorized records.
- Records matching and missing each tested filter.
- Values at the beginning and end of supported sort ranges.
- A mutation target that can be inserted, deleted, or reordered between requests.

| Seed property | Defect exposed |
|---|---|
| Exactly one full page | Almost none of the continuation logic |
| Two tied timestamps across a seam | Missing unique tiebreaker |
| Alternating filter values | Lost filter or premature termination |
| Mixed tenant ownership | Authorization leakage and misleading total |
| Three pages plus one item | Final partial page and terminal signal |
| Controlled leading insert | Offset shift versus cursor position behavior |

Generate expected IDs independently from the API response. If the oracle is “sort whatever the API returned,” the test cannot detect missing records. The source of truth can be the seed specification or a direct administrative data query isolated from the endpoint logic.

Contract testing is complementary. The [Pact contract testing guide](/blog/contract-testing-pact-complete-guide) can help verify that consumer and provider agree on page fields and continuation shapes. Traversal tests still remain necessary because a contract example with one page rarely proves global uniqueness, termination, or mutation behavior.

Ready-made QA skills install from qaskills.sh with the qaskills CLI when an AI agent needs a repeatable pagination test workflow. Give the agent the endpoint contract, safe seed controls, and a maximum page guard. Do not let it infer cursor internals or run unbounded traversal against production.

## Choose the strategy with a testability decision matrix

Testing does not choose product architecture alone, but test evidence makes tradeoffs visible.

| Requirement | Offset fit | Cursor fit | Test emphasis |
|---|---|---|---|
| Jump directly to numbered page | Strong | Usually weak without extra index | Exact random offsets and totals |
| Rapidly changing feed | Prone to window shift | Strong with stable keyset order | Concurrent insert/delete behavior |
| Simple small admin table | Often sufficient | Added token complexity may not pay | Boundaries and validation |
| Very deep traversal | Can become expensive | Often efficient with proper index | Controlled latency distributions |
| Shareable page URL | Human-readable parameters | Opaque token may be awkward | Link persistence and expiry |
| Bidirectional navigation | Straightforward arithmetic | Requires previous/next contract | Direction-bound cursors and seams |
| Auditable frozen export | Needs snapshot/revision support | Needs snapshot/revision support | Consistency token, not strategy label |

Whatever strategy is selected, publish enough contract detail for clients to behave safely. State ordering, parameter limits, terminal signal, cursor opacity, token lifetime if relevant, mutation consistency, and error responses. Then make those statements executable through tests.

The final quality gate should include a fixed traversal, boundary matrix, invalid-input matrix, concurrent mutation experiment, authorization traversal, and a bounded performance observation. This is more valuable than dozens of first-page status assertions.

## Frequently Asked Questions

### How many records should a pagination test seed?

For the main traversal, seed at least three pages plus one record at the chosen limit. That shape exercises full pages, multiple seams, a partial final page, and termination. Add tied sort values across a seam, mixed filters, and authorization boundaries. Small focused tests can use fewer records for validation cases. The key is purposeful placement, not volume. A thousand uniform records may reveal less than seven carefully ordered records if none of them challenge the tiebreaker or filter logic.

### Should cursor tests decode the token to verify its contents?

Usually no. Clients should treat cursors as opaque, and tests at the consumer or public API level should do the same. Verify that the returned token progresses, can retrieve the documented next page, rejects tampering according to policy, and remains bound to relevant query context. Token encoding and signing deserve lower-level provider tests owned by the implementation. Decoding public-test cursors couples the suite to internal format and can block safe server changes that preserve behavior.

### Can cursor pagination still return duplicates or skip records?

Yes, depending on ordering and mutation semantics. A non-unique sort key can skip tied rows. Updating a record's sort value can move it across the cursor boundary. Deleting an unseen row means a live traversal cannot return it. Cursor or keyset pagination prevents the ordinary offset shift caused by many leading inserts, but it does not create snapshot isolation. Test the API's stated consistency model with controlled inserts, deletes, and sort-key updates instead of assuming the strategy name guarantees perfection.

### What should stop an automated pagination traversal?

Use the documented terminal signal, such as a null or absent next cursor, or the absence of a next link. Do not stop merely because a page is shorter than the requested limit unless the contract explicitly defines that as terminal. Add a maximum-page guard, detect repeated cursors, and reject duplicate IDs so a server loop fails quickly with useful diagnostics. Total count can be a cross-check when exact and stable, but it should not replace continuation semantics for a cursor API.
`,
};
