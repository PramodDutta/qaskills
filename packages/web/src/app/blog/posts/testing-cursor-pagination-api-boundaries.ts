import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Cursor-Pagination API Boundaries',
  description:
    'Test cursor-pagination API boundaries with stable ordering, opaque cursor validation, empty and terminal pages, mutation checks, and traversal invariants.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Cursor-Pagination API Boundaries

An empty \`items\` array can mean three different things: the collection has no records, a filter matches nothing, or a valid cursor points beyond the last returned item. Those states may share a payload shape, but they do not share a contract. Cursor-pagination tests need to establish which state the server represents and whether its metadata lets a client stop safely.

The central invariant is continuity over a stable order. Starting without a cursor and repeatedly following the server's next cursor should visit the eligible records exactly once, in the defined order, and terminate. Boundary tests then attack every word in that statement: starting, following, eligible, exactly once, ordered, and terminate.

## Write down the page contract before asserting fields

Cursor APIs vary. Some return \`nextCursor\`; Relay-style connections use edges and \`pageInfo\`; others place cursors in Link headers. Do not impose one fashionable shape. Extract the semantic commitments from the API specification.

A simple response might be:

\`\`\`json
{
  "items": [
    { "id": "evt_104", "createdAt": "2026-07-13T09:15:00Z" },
    { "id": "evt_103", "createdAt": "2026-07-13T09:15:00Z" }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOi...",
  "hasMore": true
}
\`\`\`

Before testing, resolve these decisions:

| Contract question | Example answer | Why the test needs it |
|---|---|---|
| Sort direction | \`createdAt DESC, id DESC\` | Defines adjacency and tie behavior |
| Cursor position | After the last returned row | Determines whether boundary rows repeat |
| Cursor opacity | Clients must not parse or edit it | Tests should follow, not reconstruct, valid cursors |
| Limit range | 1 through 100, default 25 | Defines validation boundaries |
| Terminal metadata | \`nextCursor: null\`, \`hasMore: false\` | Gives clients a stopping rule |
| Invalid cursor response | HTTP 400 with stable error code | Separates bad input from empty data |
| Filter binding | Cursor valid only for original filters | Prevents traversal across a changed result set |

If these are undocumented, the test effort has already found a product ambiguity. Settle it with API owners instead of encoding whatever today's implementation happens to return.

## Seed ties, not just conveniently ordered timestamps

A cursor based only on a non-unique sort column is not a complete position. Two events can share \`createdAt\`. If a page ends between them and the next query asks for rows with \`createdAt < lastCreatedAt\`, the remaining tied rows are skipped. If it uses \`<=\`, the boundary row repeats.

Seed a deterministic fixture that forces the tie across a page boundary:

| Logical position | ID | Created at | Purpose |
|---:|---|---|---|
| 1 | \`evt_105\` | 09:16:00 | Row before tie group |
| 2 | \`evt_104\` | 09:15:00 | First tied row, end of page when limit is 2 |
| 3 | \`evt_103\` | 09:15:00 | Second tied row, start of next page |
| 4 | \`evt_102\` | 09:14:00 | Ordinary following row |
| 5 | \`evt_101\` | 09:13:00 | Terminal row |

The server needs a unique tie-breaker, commonly the primary key, included in both ordering and cursor state. For descending order, the conceptual continuation predicate is:

\`\`\`sql
SELECT id, created_at, payload
FROM events
WHERE tenant_id = $1
  AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT $4;
\`\`\`

This is PostgreSQL row-value syntax. Other databases may express the comparison as \`created_at < $2 OR (created_at = $2 AND id < $3)\`. Tests should assert observable continuity, not the SQL form, but a tie fixture reveals whether the query and encoded cursor agree.

## Verify the first page without fabricating a cursor

The initial request omits the cursor entirely unless the contract explicitly uses an empty value. Do not send \`cursor=\`, \`cursor=null\`, and no parameter interchangeably. Frameworks may parse them differently.

The first-page assertions should cover status, size, ordering, and continuation metadata. This Vitest example uses the built-in \`fetch\` available in current Node runtimes and an API seeded with known test records.

\`\`\`ts
import { beforeAll, describe, expect, it } from 'vitest';

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';

type EventRecord = { id: string; createdAt: string };
type EventPage = {
  items: EventRecord[];
  nextCursor: string | null;
  hasMore: boolean;
};

async function getPage(params: URLSearchParams): Promise<{
  status: number;
  body: EventPage;
}> {
  const response = await fetch(\`\${baseUrl}/test-tenants/t_cursor/events?\${params}\`);
  return { status: response.status, body: await response.json() };
}

describe('GET /events cursor boundaries', () => {
  beforeAll(async () => {
    const response = await fetch(\`\${baseUrl}/test-support/seed-cursor-events\`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId: 't_cursor' }),
    });
    expect(response.ok).toBe(true);
  });

  it('returns the first two records in the complete descending order', async () => {
    const { status, body } = await getPage(new URLSearchParams({ limit: '2' }));

    expect(status).toBe(200);
    expect(body.items.map((item) => item.id)).toEqual(['evt_105', 'evt_104']);
    expect(body.nextCursor).toEqual(expect.any(String));
    expect(body.hasMore).toBe(true);
  });
});
\`\`\`

The \`test-support\` endpoint is illustrative infrastructure that must be implemented and protected in the test environment, not exposed in production. A suite can seed directly through a repository or database fixture instead. What matters is that setup creates exact IDs and timestamps and completes before the request.

Avoid asserting cursor text. An opaque cursor may change encoding, signing, or version while preserving its contract. Assert that a nonterminal page supplies a nonempty token, then pass that exact token to the next request.

## Cross the tie boundary with the returned token

The second request must use the cursor obtained from page one. Recreating a base64 token from guessed fields accidentally tests cursor internals and may bypass signing or versioning behavior.

\`\`\`ts
it('continues after a tied timestamp without repeating the boundary row', async () => {
  const first = await getPage(new URLSearchParams({ limit: '2' }));
  const cursor = first.body.nextCursor;
  expect(cursor).not.toBeNull();

  const second = await getPage(
    new URLSearchParams({ limit: '2', cursor: cursor as string }),
  );

  expect(second.status).toBe(200);
  expect(second.body.items.map((item) => item.id)).toEqual(['evt_103', 'evt_102']);
  expect(second.body.items.some((item) => item.id === 'evt_104')).toBe(false);
  expect(second.body.hasMore).toBe(true);
});
\`\`\`

This one case detects two classic comparator defects: skipping \`evt_103\` because its timestamp equals the last row's timestamp, and repeating \`evt_104\` because the continuation comparison is inclusive.

Assert exact IDs when the seed is controlled. In a shared mutable environment, exact list assertions become unreliable and the environment is unsuitable for this boundary test. Use an isolated tenant or namespace rather than weakening assertions to \`length <= limit\`.

## Define the last full page and the short final page

Two different endings need coverage. When total eligible records are not a multiple of the limit, the final page is short. When the total is an exact multiple, the last page is full, and the server may need a lookahead row or another mechanism to know there is no continuation.

For five records and limit two, expected sizes are 2, 2, 1. The last response should contain \`evt_101\`, advertise no more data, and provide no usable next cursor according to the chosen schema.

For four records and limit two, sizes are 2, 2. The second response is full but terminal. A naive implementation that says \`hasMore = items.length === limit\` incorrectly reports another page. Tests should create this exact-multiple collection because a short final page cannot expose the defect.

| Dataset size | Limit | Expected page sizes | Boundary being tested |
|---:|---:|---|---|
| 0 | 2 | 0 | Empty collection starts terminal |
| 1 | 2 | 1 | First page is also last |
| 4 | 2 | 2, 2 | Full terminal page |
| 5 | 2 | 2, 2, 1 | Short terminal page |
| 5 | 1 | 1, 1, 1, 1, 1 | Every row is a cursor boundary |

Whether the API returns \`nextCursor: null\`, omits the field, or echoes a cursor with \`hasMore: false\` is a contract choice. Prefer an unambiguous stop signal, and assert exactly that documented form.

## Treat an empty initial result differently from exhaustion

An empty unfiltered collection should return a successful empty page unless the specification says otherwise. It is not a 404, because the collection resource exists. A filter with no matches likewise commonly returns 200 and no items.

Exhaustion is subtler. Some APIs never allow a client to request beyond the end because the last page has no next cursor. A client can still replay an older terminal-adjacent cursor after records are deleted, producing an empty page. Define how metadata behaves in that state.

Tests should avoid inventing an “end cursor” if the server never issued one. Instead:

1. Obtain a valid cursor from a nonterminal response.
2. Delete all records after its position through controlled setup.
3. Follow the cursor.
4. Assert successful emptiness and terminal metadata, or the documented snapshot-expired response.

This distinguishes a valid but now exhausted position from malformed input.

## Invalid, tampered, and mismatched cursors are client errors

Returning an empty page for every cursor decode failure is dangerous. It makes corrupted client state indistinguishable from successful exhaustion. A malformed base64 value, invalid signature, unsupported cursor version, missing sort field, or cursor issued for another filter should produce the documented client error.

Use black-box mutations on a real token. Do not rely only on random garbage, which exercises the earliest decoder branch.

\`\`\`ts
it('rejects a tampered cursor instead of treating it as exhaustion', async () => {
  const first = await getPage(new URLSearchParams({ limit: '2' }));
  const issued = first.body.nextCursor as string;
  const finalCharacter = issued.endsWith('A') ? 'B' : 'A';
  const tampered = issued.slice(0, -1) + finalCharacter;

  const response = await fetch(
    \`\${baseUrl}/test-tenants/t_cursor/events?\${new URLSearchParams({
      limit: '2',
      cursor: tampered,
    })}\`,
  );
  const error = await response.json();

  expect(response.status).toBe(400);
  expect(error).toMatchObject({ code: 'INVALID_CURSOR' });
});
\`\`\`

If cursors are not signed, a one-character edit may still decode to a valid but different position. The API should at minimum validate schema, types, version, scope, and allowed sort information. Signed cursors protect integrity but are not encryption; do not place secrets in a base64-encoded cursor.

Test filter binding by requesting page one with \`status=active\`, then following its cursor with \`status=archived\`. Acceptable designs reject the mismatch or encode all filter state so the cursor alone defines continuation. Silently combining a position from one ordering domain with another filter risks missing or leaking data.

## Traverse the entire collection and assert invariants

Examples for first and last pages give precise diagnostics. A traversal test catches composition defects across every boundary. It should guard against infinite loops as well as duplicates.

\`\`\`ts
async function collectAllIds(limit: number): Promise<string[]> {
  const ids: string[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;

  for (let pageNumber = 0; pageNumber < 20; pageNumber += 1) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor !== null) params.set('cursor', cursor);
    const { status, body } = await getPage(params);
    expect(status).toBe(200);
    ids.push(...body.items.map((item) => item.id));

    if (!body.hasMore) return ids;
    expect(body.nextCursor).toEqual(expect.any(String));
    cursor = body.nextCursor;
    expect(seenCursors.has(cursor as string)).toBe(false);
    seenCursors.add(cursor as string);
  }

  throw new Error('cursor traversal did not terminate within 20 pages');
}

it('visits every seeded event exactly once', async () => {
  const ids = await collectAllIds(2);
  expect(ids).toEqual(['evt_105', 'evt_104', 'evt_103', 'evt_102', 'evt_101']);
  expect(new Set(ids).size).toBe(ids.length);
});
\`\`\`

The page cap turns a repeated cursor into a fast diagnostic instead of a hung build. Size equality with a set detects duplicate IDs, while the exact sequence checks ordering and omissions.

For a larger dataset, compare against a trusted seed manifest rather than querying the same paginated endpoint by another route. An oracle built from the implementation under test can share its defect.

## Mutations between requests need a declared consistency model

Cursor pagination is often chosen because it behaves better than offsets while records are inserted. “Better” is not a complete guarantee. Under a live keyset model sorted newest first, a new record inserted before page one's position should not shift later pages or cause a duplicate, but the traversal may not include that new record because it lies before the cursor.

Updates are harder. If a record's sort key changes from behind the cursor to ahead of it, it may be skipped or seen differently depending on timing. Deletes naturally reduce what remains. Snapshot-based APIs can promise a stable view, while live APIs usually cannot promise all concurrent changes.

Write tests for the promised model:

- insert before the cursor and confirm already-returned rows do not repeat;
- insert after the cursor and define whether it may appear;
- delete the next row and confirm traversal continues;
- update a sort key only if the API documents its consistency semantics;
- expire an old cursor if cursors have a documented lifetime.

Do not assert snapshot isolation against an API that promises live traversal. Conversely, do not accept duplicates if the product promises stable snapshot pages.

For general status, schema, authorization, and observability practices, use the [API testing best practices guide](/blog/api-testing-best-practices-guide). The [complete API testing guide](/blog/api-testing-complete-guide) places pagination within the broader service test strategy.

## Security boundaries travel with the cursor

A cursor obtained by tenant A must not reveal or position a traversal in tenant B. Repeat the issued token under another authenticated tenant and expect the API's documented invalid-cursor or authorization response. The safest behavior avoids confirming whether the foreign cursor itself was valid.

Authorization changes also matter. If a user's permission narrows between page requests, the next page must enforce current authorization or a documented snapshot authorization model. A cursor is not an access token unless the API explicitly designs it as one, and even then it needs integrity, scope, and expiry controls.

Limit validation belongs in this boundary suite. Exercise zero, negative, nonnumeric, and above-maximum values. Assert whether an omitted limit uses a default and whether excessive values are rejected or capped. Silent capping should be documented because clients may otherwise infer incorrect page counts.

Finally, avoid logging full cursors at info level. They may encode identifiers or filter state. Tests can assert error codes and correlation IDs without requiring sensitive tokens in operational logs.

## Observe cursor failures without exposing cursor contents

Production telemetry should distinguish successful termination, invalid tokens, filter mismatches, and expired snapshots. Tests can assert the stable error code and correlation identifier while verifying that raw cursor payloads and signing material are absent from client responses. Operational logs may store a one-way fingerprint for grouping repeated failures, subject to the service's data policy.

Measure traversal behavior with page size, page latency, and termination reason rather than decoded cursor fields. The cursor format is an implementation detail that should be free to evolve through versioning. An alert on rising invalid-cursor rates can reveal a broken deployment or incompatible client without teaching dashboards to parse tokens.

## Frequently Asked Questions

### Should a terminal page return a next cursor?

It depends on the documented schema, but clients need one unambiguous stopping rule. A common contract uses \`nextCursor: null\` and \`hasMore: false\`. Test both short and full terminal pages because length alone cannot reliably determine continuation.

### How do I test an opaque cursor without knowing its encoding?

Request a real first page, capture the exact token, and send it unchanged on the next request. Assert records and metadata, not cursor bytes. For integrity behavior, mutate an issued token as a black box and expect the documented invalid-cursor response.

### Why must the sort order include a unique tie-breaker?

A cursor must identify one exact boundary. If several records share the last row's timestamp or score, that value alone cannot distinguish which tied records were returned. Adding a stable unique key to ordering and cursor state prevents skips and repeats at the tie.

### What should an API return for a malformed cursor?

A clear client error, commonly HTTP 400 with a stable machine-readable code, is preferable to an empty success. Empty success falsely tells the client that traversal completed. Follow the API's specified error envelope and avoid leaking decoder or signature details.

### Can cursor pagination guarantee a snapshot while data changes?

Only if the implementation provides a snapshot mechanism, versioned read, or equivalent contract. Keyset continuation alone stabilizes position but does not freeze mutable data. Test inserts, deletes, and sort-key updates according to the consistency model the API actually promises.
`,
};
