import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Offset Pagination for Duplicate Records',
  description:
    'Test offset pagination for duplicate records under concurrent inserts and deletes, with deterministic ordering, traversal oracles, and snapshot options.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Offset Pagination for Duplicate Records

Page one returns IDs \`[50, 49, 48]\`. Before page two, another request inserts ID \`51\` at the front. The second query skips three rows from the new ordering and returns \`[48, 47, 46]\`. ID \`48\` appears twice even though neither SQL query returned a duplicate row.

That is offset drift. \`LIMIT 3 OFFSET 3\` describes positions in the collection at query time, not a durable continuation point. When rows are inserted, deleted, or moved by an update between requests, the meaning of position three changes. A credible offset-pagination test suite needs both a stable baseline and controlled mutations between page calls.

## Reproduce the shift with a five-line timeline

Use descending creation order and a page size of three:

| Moment | Ordered IDs visible to query | Request | Response |
|---|---|---|---|
| T0 | 50, 49, 48, 47, 46, 45 | \`offset=0&limit=3\` | 50, 49, 48 |
| T1 | 51, 50, 49, 48, 47, 46, 45 | Insert 51 | No page response |
| T2 | 51, 50, 49, 48, 47, 46, 45 | \`offset=3&limit=3\` | 48, 47, 46 |

The duplication is deterministic. The first page's last row moved from index 2 to index 3, which is exactly where the second query begins.

Deletion produces the complementary omission. If ID 50 is deleted after page one, the remaining rows shift left. \`OFFSET 3\` starts at ID 46, so ID 47 is never observed. An update to the sort key can move a row in either direction and cause either symptom.

These are not flaky assertions when setup controls the mutation. They are demonstrations of the consistency guarantees an offset API can and cannot provide.

## Establish a deterministic no-mutation baseline

Before injecting changes, prove the implementation paginates a static collection correctly. Seed records with a total that is not divisible by the limit and traverse pages while asserting exact IDs, response metadata, and uniqueness.

The query must have a total order. \`ORDER BY created_at DESC\` is not deterministic when timestamps tie. Add a unique tie-breaker:

\`\`\`sql
SELECT id, created_at, title
FROM articles
WHERE workspace_id = $1
ORDER BY created_at DESC, id DESC
LIMIT $2 OFFSET $3;
\`\`\`

Without the second ordering column, the database may return tied rows in different relative order between executions, plans, or physical layouts. Pagination can then duplicate or omit records even when no application-level mutation occurs.

A baseline matrix should include exact multiples because terminal metadata is often derived incorrectly.

| Total rows | Limit | Expected offsets requested | Expected sizes |
|---:|---:|---|---|
| 0 | 3 | 0 | 0 |
| 1 | 3 | 0 | 1 |
| 3 | 3 | 0 | 3 |
| 4 | 3 | 0, 3 | 3, 1 |
| 6 | 3 | 0, 3 | 3, 3 |
| 7 | 3 | 0, 3, 6 | 3, 3, 1 |

If the API reports \`total\`, define whether that count is calculated for each request or held stable for a paging session. A live total can increase while a client traverses, so it is not automatically a snapshot size.

## Write a traversal oracle that rejects repeats

The following Vitest helper uses Node's built-in \`fetch\` and assumes an isolated test workspace seeded through supported test infrastructure. It collects pages by offset and fails immediately if an ID appears twice.

\`\`\`ts
import { beforeEach, describe, expect, it } from 'vitest';

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:3000';
const workspaceId = 'offset-duplicate-suite';

type Article = { id: number; createdAt: string; title: string };
type ArticlePage = { items: Article[]; total: number };

async function page(offset: number, limit: number): Promise<ArticlePage> {
  const query = new URLSearchParams({
    workspaceId,
    offset: String(offset),
    limit: String(limit),
  });
  const response = await fetch(\`\${baseUrl}/articles?\${query}\`);
  expect(response.status).toBe(200);
  return response.json();
}

async function seed(ids: number[]): Promise<void> {
  const response = await fetch(\`\${baseUrl}/test-support/articles/reset\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, ids }),
  });
  expect(response.status).toBe(204);
}

describe('article offset pagination', () => {
  beforeEach(async () => {
    await seed([50, 49, 48, 47, 46, 45, 44]);
  });

  it('visits a static collection in deterministic order', async () => {
    const collected: number[] = [];

    for (let offset = 0; offset < 7; offset += 3) {
      const response = await page(offset, 3);
      collected.push(...response.items.map((item) => item.id));
    }

    expect(collected).toEqual([50, 49, 48, 47, 46, 45, 44]);
    expect(new Set(collected).size).toBe(collected.length);
  });
});
\`\`\`

The reset route is test-environment infrastructure, not a production endpoint. Direct database setup or a repository fixture is equally valid. The essential properties are isolation, deterministic sort values, and awaited setup.

Do not use the API's reported \`total\` as the only loop condition in a mutation test. If total changes, the loop can request too many or too few pages. Bound the experiment explicitly and assert the observed sequence.

## Insert ahead of the current offset

To expose duplication, request the first page, insert a record that sorts before it, then request the next offset. Assert the duplicate by identity, not by comparing whole object JSON. The same record may acquire computed fields that change between responses while its ID remains stable.

\`\`\`ts
async function insertArticle(id: number): Promise<void> {
  const response = await fetch(\`\${baseUrl}/test-support/articles\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ workspaceId, id, sortPosition: 'newest' }),
  });
  expect(response.status).toBe(201);
}

it('demonstrates a repeated boundary record after a leading insert', async () => {
  const first = await page(0, 3);
  expect(first.items.map((item) => item.id)).toEqual([50, 49, 48]);

  await insertArticle(51);

  const second = await page(3, 3);
  expect(second.items.map((item) => item.id)).toEqual([48, 47, 46]);

  const combined = [...first.items, ...second.items].map((item) => item.id);
  expect(combined.filter((id) => id === 48)).toHaveLength(2);
});
\`\`\`

Whether this test should pass by finding a duplicate or fail because duplication violates a product promise depends on the API contract. For a live offset endpoint, the test can document the known limitation and ensure clients deduplicate. If the service promises a stable export, the same scenario must expect no repeat, and the implementation needs snapshotting or another continuation model.

Do not mark a deterministic limitation as flaky. Give the test a name that states the model. If product requirements reject duplicates, keep it as a failing acceptance test only within the team's normal defect workflow rather than permanently xfail-ing a critical guarantee without ownership.

## Delete before the next page to expose omissions

After the first response, delete an item that appeared near the front. All later positions move left. The next fixed offset leaps over a record.

\`\`\`ts
async function deleteArticle(id: number): Promise<void> {
  const response = await fetch(
    \`\${baseUrl}/test-support/articles/\${id}?workspaceId=\${workspaceId}\`,
    { method: 'DELETE' },
  );
  expect(response.status).toBe(204);
}

it('demonstrates an omitted record after deleting from the first page', async () => {
  const first = await page(0, 3);
  expect(first.items.map((item) => item.id)).toEqual([50, 49, 48]);

  await deleteArticle(50);

  const second = await page(3, 3);
  expect(second.items.map((item) => item.id)).toEqual([46, 45, 44]);
  expect(second.items.map((item) => item.id)).not.toContain(47);
});
\`\`\`

The record at ID 47 still exists and remains eligible, but it shifted from index 3 to index 2. The client already advanced to offset 3.

A deletion after the offset boundary has a different effect and belongs in a separate case. Controlled placement makes the test diagnostic. Randomly deleting any row can produce inconsistent expectations and is not useful concurrency coverage.

## Sort-key updates can move a row across both pages

Updates are more complex because one row can move without changing collection size. If ID 46 receives a new \`updatedAt\` and the endpoint sorts by that field descending, it may jump into page one after page one was read. The client can miss it entirely because the row now sits before the requested second offset.

Conversely, a row returned on page one can be updated to sort later. It may appear again on page two. Tests should include both directions when the sort field is mutable.

This raises a product design question: should an endpoint intended for traversal sort by a mutable “last activity” field? That order is useful for a live dashboard but unsuitable for a consistent batch export. The same service may need two endpoints or modes with different guarantees.

Use fixed timestamps in the seed and perform an update to a precisely chosen value. Sleeping until the clock changes creates slow, nondeterministic tests and may still tie on databases with coarse timestamp precision.

## Verify uniqueness by stable identity, not display fields

Titles, email addresses, and timestamps are not reliable uniqueness keys. Two legitimate records can share them, and one record can change them. Use the API's stable resource identifier.

Your assertions should distinguish these defect classes:

| Observation | Likely defect or model effect | Assertion |
|---|---|---|
| Same ID appears twice | Boundary shifted backward relative to client | Set size differs from list size |
| Known seeded ID never appears | Boundary shifted forward or unstable tie order | Seed manifest minus collected IDs is nonempty |
| Order changes with static data | Incomplete or nondeterministic \`ORDER BY\` | Exact ID sequence differs |
| Total changes after mutation | Live count semantics | Assert documented per-request count |
| Page contains more than limit | Query or response assembly error | Each page length is within validated limit |

Do not deduplicate the collected list before comparing it to the oracle. That would hide duplicates. Report duplicates and missing IDs separately so a failure tells engineers which direction the boundary moved.

## Separate database-query tests from HTTP contract tests

The drift originates in query semantics, but the API layer adds parsing, limits, filters, serialization, and total metadata. Cover both levels without duplicating every scenario.

Repository integration tests should run against the real database engine used in production. Seed tied sort values, execute the query with offsets, and verify deterministic ordering. These tests are fast enough to cover combinations of filters and sort columns.

API tests should prove a smaller set end to end: parameter validation, first and terminal pages, stable identity across a static traversal, and at least one controlled mutation that represents the documented consistency model. They also verify authentication and workspace scoping.

The [database testing automation guide](/blog/database-testing-automation-guide) covers isolation and deterministic data setup at the storage layer. For request validation, response schema, and error design around pagination, use the [API testing best practices guide](/blog/api-testing-best-practices-guide).

Avoid an in-memory fake repository for the ordering oracle. JavaScript's stable array sort, comparison rules, and null handling may differ from the production database. A fake can test controller wiring but cannot prove SQL pagination behavior.

## Decide whether duplicates are forbidden or documented

Offset pagination is not inherently defective. It is appropriate for relatively static collections, administrative browsing, small result sets, and interfaces where users jump directly to page numbers. The consistency guarantee must match the experience.

There are several response strategies for mutable collections:

| Strategy | Duplicate behavior | Tradeoff |
|---|---|---|
| Live offset | Duplicates and omissions possible during mutation | Simple, supports page-number jumps |
| Client-side ID deduplication | Repeats hidden, omissions still possible | Useful for feeds, not complete exports |
| Snapshot token plus offset | Stable view during token lifetime | Server state, transaction, or versioning cost |
| High-water mark filter | Excludes records newer than traversal start | Does not freeze deletes or all updates |
| Keyset cursor | Stable continuation around inserts before cursor | No arbitrary page jump, mutable sort keys still matter |

A snapshot can be a database snapshot, a materialized result set, a version predicate, or a server-issued token that defines a stable membership boundary. Long-lived database transactions are rarely appropriate across independent HTTP requests because they retain resources and old row versions. Design snapshot semantics explicitly.

If clients deduplicate, test the client accumulator separately. It should preserve the first or latest representation intentionally and must not use a mutable display field as the key. Deduplication cannot recover ID 47 from the deletion example, so it is not a complete consistency solution.

## Test validation and arithmetic boundaries

Offset fields themselves have important edges. Exercise an omitted offset, zero, negative values, non-integers, numbers beyond the supported maximum, and values whose conversion could overflow the database or application numeric type.

The API should reject malformed input with a documented client error rather than coercing \`offset=abc\` to zero. A maximum offset may be justified because large offsets can be expensive: the database often must identify and discard preceding rows. If the service caps values, make the cap explicit in documentation and metadata.

Check \`limit=0\`, negative limits, maximum accepted limit, and one above it. An empty page produced by \`limit=0\` is not the same as an exhausted collection and can confuse clients if zero is silently accepted.

For total counts, ensure filters and tenant predicates match the item query. A count taken without the same authorization scope can leak the existence of records even when items are filtered correctly.

## Run mutation tests without timing races

A concurrency test does not need uncontrolled concurrency. Sequentially issue page one, await a mutation, then issue page two. That creates the exact inter-request state change users experience and produces reproducible evidence.

True concurrent tests are useful when page query and mutation overlap inside a transaction, but they require synchronization points. Use database locks, barriers, or instrumented hooks in an isolated environment rather than sleeps. State which isolation level and commit order the test creates.

Give every run a unique workspace and delete it after completion. Parallel CI workers must not mutate the same fixture rows. If cleanup after a crash is imperfect, attach a run identifier and use age-based janitorial cleanup in the test environment.

Finally, repeat the static baseline enough to catch unstable ordering, but do not substitute repetition for the tied-value fixture. A deterministic tie placed on the boundary is much more effective than hoping the database happens to reorder rows.

## Report drift in terms product owners can evaluate

A mutation experiment should publish the exact first page, intervening change, second page, duplicates, and omissions. “Pagination failed” is less useful than “inserting one newer article repeated ID 48 at the page boundary.” The latter lets product owners decide whether live-feed tolerance, client deduplication, or snapshot work is justified.

Track duplication and omission separately in load or soak diagnostics. A single uniqueness percentage can hide the more serious outcome, missing records from a supposedly complete export. Label observations as measurements from the chosen workload, not universal rates. Mutation frequency, sort distribution, page size, and traversal duration all influence what occurs.

When a snapshot solution ships, keep the live-offset demonstration as a model test if that mode still exists, and add acceptance coverage for the snapshot contract. The suite should explain both behaviors rather than pretending the underlying positional limitation disappeared.

## Frequently Asked Questions

### Why do duplicates appear when the SQL query uses distinct primary keys?

Each individual query can return unique rows while the position represented by \`OFFSET\` changes between queries. An insert before the boundary pushes a previously returned row into the next page's starting position, so it is returned again.

### Can adding \`DISTINCT\` fix duplicate records across pages?

No. \`DISTINCT\` removes duplicates within one query result. Offset drift occurs across separate requests and database states. The repeated row is valid in each page at the moment that page is queried.

### Is ordering by creation time enough for stable offset pages?

Only if creation time is guaranteed unique, which is uncommon. Add a stable unique tie-breaker such as the primary key to produce a total order. This fixes nondeterminism for static data but does not prevent shifts caused by inserts or deletes.

### Should the client always deduplicate IDs?

It can be a sensible defensive measure for an infinite live feed, but it does not recover omitted records and may mask a server guarantee violation. Batch exports and complete traversals need a stronger server-side consistency model.

### How can an offset API provide stable pages while data changes?

Bind requests to a documented snapshot or version boundary, then apply offsets within that stable membership and order. The implementation could use a result token, materialized IDs, or another versioning design. Avoid holding an ordinary database transaction open across long user-driven HTTP paging sessions without careful resource analysis.
`,
};
