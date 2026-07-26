import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP leaderboard truncation contract testing',
  description:
    'MCP leaderboard truncation contract testing with repository-backed tests, bounded results, metadata checks, and clear failure signals for QA teams.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP leaderboard truncation contract testing',
  keywords: [
    'MCP leaderboard truncation contract testing',
    'MCP leaderboard limit test',
    'leaderboard order preservation',
    'missing skills array fallback',
    'MCP top skills contract',
    'leaderboard metadata retention',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://zod.dev/api',
    'https://json-schema.org/draft/2020-12/json-schema-core',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'packages/web/src/app/api/leaderboard/route.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP leaderboard truncation contract testing should feed a ranked API fixture through \`get_leaderboard\` and compare the complete tool payload. Success preserves source order, rank fields, filter, timestamps, and every retained record while returning the first bounded items. Reordering, metadata loss, excess results, mutation, or failure on an absent skills array disproves the contract.

## What must MCP leaderboard truncation contract testing prove?

MCP leaderboard truncation contract testing must prove that the tool changes only the length of the \`skills\` array. It should preserve API order, each retained object, and response-level metadata without recomputing rank or timestamps.

The bounded count is \`min(requested limit, source length)\`, not always the requested number. A source containing fewer records should remain shorter, while a missing array should become an empty array.

The tool implementation in \`packages/mcp/src/index.ts\` registers \`get_leaderboard\` with a Zod number from one through fifty and a default of ten. Its handler fetches \`/api/leaderboard\`, spreads the response object, and replaces \`skills\` with a leading slice.

The API evidence in \`packages/web/src/app/api/leaderboard/route.ts\` selects up to fifty skills, applies filter-specific ordering, adds one-based ranks, serializes creation times, and returns \`filter\` plus \`updatedAt\`. Those fields are inputs to the MCP tool, not values the tool should create.

Package metadata in \`packages/mcp/package.json\` identifies the built server and its Zod dependency. Record that version when process-level fixtures are retained.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) defines the surrounding call and result model. The ranking, response metadata, and truncation behavior remain QASkills repository contracts.

The [Zod API documentation](https://zod.dev/api) explains the number, minimum, maximum, and default schema operations used by the tool registration. Tests should exercise those bounds through the protocol instead of calling \`slice\` alone.

The [JSON Schema 2020-12 core specification](https://json-schema.org/draft/2020-12/json-schema-core) can support a portable fixture schema. Behavioral equality still proves ordering and preservation more clearly than shape validation alone.

Use the [leaderboard page](/leaderboard) to understand visible ranking, but do not scrape rendered rows for this test. A controlled API fixture gives stable ids, ranks, dates, and filter labels.

MCP leaderboard truncation contract testing should separate upstream ranking from downstream slicing. If source order is wrong, the web API owns the first defect; if a correct fixture changes inside the tool, the MCP package owns it.

The [leaderboard cache and ranking guide](/blog/testing-leaderboard-cache-filter-isolation-ranking-consistency) covers filter isolation upstream. This suite starts with the JSON response received by the MCP process and verifies what survives.

Passing requires exact deep equality for retained objects and untouched metadata. Counting output records alone would miss reversed rank order, stripped fields, or a new timestamp.

## Which repository behavior defines the contract?

The web route reads the \`filter\` query parameter and defaults it to \`all\`. It uses that value in the cache key and in the returned response object.

For \`all\`, rows are ordered by descending install count. Other route branches use weekly installs plus creation date, a weighted hot expression, or descending creation date.

Every branch limits database output to fifty before response mapping. The route then assigns \`rank: i + 1\`, retains selected skill fields, converts \`createdAt\` to an ISO string, and adds response timestamps.

The MCP tool does not pass a filter query. Its current request targets \`/api/leaderboard\`, so normal integration behavior receives the route's default \`all\` ranking.

Inside the tool, \`getJson<{ skills?: unknown[] }>\` supplies a TypeScript view but does not validate runtime JSON. The handler then creates a new top-level object with spread syntax.

The replacement expression is \`(response.skills ?? []).slice(0, limit)\`. It preserves references and ordering for retained entries, leaves the source array untouched, and converts nullish \`skills\` to an empty list.

Any top-level response fields survive the spread unless the \`skills\` replacement uses the same key. Current route fields \`filter\` and \`updatedAt\` should therefore remain byte-equivalent after JSON parsing.

The result passes through \`jsonTextResult\`, which serializes the object with indentation and places it in one text content item. Tests should parse that text before comparing semantic JSON.

If fetching or parsing throws, the catch returns an MCP tool result marked with \`isError: true\`. That error path is distinct from a successful empty fallback.

Input validation happens before the callback. Values below one, above fifty, or wrong in type should not cause an API request or reach array slicing.

The default of ten should apply only when the protocol call omits \`limit\`. Test that path through the registered tool because a direct helper invocation could bypass Zod defaults.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) explains how clients call the server. This contract test should use the same stdio entry point with a local API origin.

Keep fixture records deliberately nonalphabetic and nonsequential by id. If values happen to sort naturally, an accidental re-sort could pass unnoticed.

MCP leaderboard truncation contract testing needs source snapshots as well as output snapshots. Deep-freeze or clone the fixture and prove the local server's array did not change after the tool request.

## How should QA teams test MCP leaderboard limit test?

An MCP leaderboard limit test should provide more records than requested and compare output with \`source.skills.slice(0, limit)\`. It must also compare every top-level field other than the intentionally replaced array.

Create five records with ranks, slugs, install counts, quality scores, verification flags, and ISO creation times. Give them values that reveal reordering or field reconstruction.

Return a fixed \`filter\` and \`updatedAt\` from a local \`/api/leaderboard\` endpoint. Reject query parameters because the current MCP handler sends none.

Call the built server with limits one, three, five, and fifty in separate cases. The first three cover truncation and equality; fifty proves a larger limit does not pad a short source.

Call once without \`limit\` using at least twelve source records. Require exactly the first ten so the Zod default is exercised.

The first example checks the typical leading slice and metadata preservation through the protocol. It parses the text item because the handler intentionally returns formatted JSON text.

\`\`\`typescript
import { expect, it } from 'vitest';

it('returns the first requested skills without changing metadata', async () => {
  const source = {
    skills: [
      { rank: 1, slug: 'zeta-check', installCount: 91, createdAt: '2026-07-01T00:00:00.000Z' },
      { rank: 2, slug: 'alpha-check', installCount: 74, createdAt: '2026-06-02T00:00:00.000Z' },
      { rank: 3, slug: 'middle-check', installCount: 53, createdAt: '2026-05-03T00:00:00.000Z' },
    ],
    filter: 'all',
    updatedAt: '2026-07-25T09:00:00.000Z',
  };
  const api = await startLeaderboardApi(source);
  const mcp = await startMcp({ apiUrl: api.url });

  const result = await mcp.callTool('get_leaderboard', { limit: 2 });
  expect(result.isError).not.toBe(true);
  expect(JSON.parse(result.content[0].text)).toEqual({
    skills: source.skills.slice(0, 2),
    filter: source.filter,
    updatedAt: source.updatedAt,
  });
  expect(api.requests).toEqual([{ method: 'GET', pathname: '/api/leaderboard', search: '' }]);
  expect(source.skills).toHaveLength(3);
});
\`\`\`

The odd slug order catches alphabetic sorting, while descending counts make the fixture believable. Exact equality catches omitted dates, regenerated ranks, and number-to-string changes.

Add a source record with extra unknown metadata. Because the tool types entries as \`unknown\` and slices them without mapping, that field should survive in retained items.

Do not require the formatted JSON whitespace. Semantic parsing avoids brittle indentation checks while still verifying the complete output object.

MCP leaderboard truncation contract testing should assert one HTTP call per tool invocation. Duplicate fetches can create inconsistent timestamps and unnecessary load.

## Test matrix for leaderboard order preservation

The leaderboard order preservation matrix should cover input validation, defaulting, typical truncation, short arrays, missing arrays, and metadata. Every row needs an exact source fixture and expected result.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| MCP leaderboard limit test | Five records with limit three | Exact first three objects | Wrong count, padding, or different objects | \`packages/mcp/src/index.ts\` |
| Minimum bound | Three records with limit one | Only source index zero remains | Empty result or extra record | Zod tool schema |
| Maximum bound | Fifty records with limit fifty | All fifty retain order | Rejection or lost record | Zod tool schema |
| Default limit | Twelve records and omitted limit | First ten records | All twelve or no request | Zod default |
| leaderboard order preservation | Slugs are not alphabetic | Output follows source sequence | Sort by slug, count, or rank | Array slice behavior |
| missing skills array fallback | Metadata object without \`skills\` | \`skills: []\` plus metadata | Error result or missing metadata | Nullish fallback |
| Null skills boundary | \`skills: null\` from local fixture | Empty list and retained fields | Runtime failure | Nullish fallback |
| MCP top skills contract | Source has two records, limit fifty | Exactly two records, no padding | Fabricated entries or changed ranks | Slice contract |
| leaderboard metadata retention | Fixed filter, updated time, extra key | Every top-level field survives | Field removed or regenerated | Response spread |
| Invalid limit | Zero, fifty-one, string, or fraction where rejected | Schema error and no API request | Callback fetches or slices | Zod registration |

Use a separate row for malformed runtime \`skills\`, such as an object. The current expression would fail because the value lacks \`slice\`, so expect an MCP error result rather than an empty fallback.

That malformed response case belongs to producer-consumer drift, not normal API behavior. It can reveal why runtime response validation may be valuable without claiming such validation exists.

For exact maximum coverage, generate fifty distinct immutable records. Verify rank one through fifty before serving them so the fixture itself cannot hide gaps.

The [MCP server contract guide](/blog/mcp-server-contract-testing-guide) provides surrounding protocol checks. This table owns array selection and object preservation inside the returned text.

## What failures expose missing skills array fallback?

A missing skills array fallback defect appears when metadata-only API JSON causes an error, removes metadata, or returns a non-array value. The expected success object contains the original fields plus \`skills: []\`.

Test both an absent property and an explicit null because the nullish expression covers both. Use another malformed object value to prove non-null wrong types take the error path.

An empty source array should remain an empty array. It should not trigger a second API call, use cached data from a prior fixture, or produce an error flag.

Keep metadata in every fallback fixture. Without it, a handler that returns only \`{ skills: [] }\` would pass while violating top-level preservation.

The second example verifies the web route response boundary and the MCP fallback separately. It uses a mocked cache result to avoid coupling this response-shape test to database ordering.

\`\`\`typescript
import { beforeEach, expect, it, vi } from 'vitest';
import { cacheGetOrSet } from '@/lib/cache';
import { GET } from '@/app/api/leaderboard/route';

vi.mock('@/lib/cache', () => ({ cacheGetOrSet: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it('serializes ranked records and response metadata unchanged', async () => {
  vi.mocked(cacheGetOrSet).mockResolvedValue({
    skills: [
      {
        rank: 1,
        slug: 'first-skill',
        installCount: 88,
        createdAt: '2026-07-20T10:00:00.000Z',
      },
    ],
    filter: 'all',
    updatedAt: '2026-07-25T09:00:00.000Z',
  });

  const response = await GET(new Request('http://local/api/leaderboard'));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    skills: [
      {
        rank: 1,
        slug: 'first-skill',
        installCount: 88,
        createdAt: '2026-07-20T10:00:00.000Z',
      },
    ],
    filter: 'all',
    updatedAt: '2026-07-25T09:00:00.000Z',
  });
});
\`\`\`

This route example proves serialization of a controlled result, not database ranking. Keep ordering queries and cache behavior in their dedicated upstream suite.

For the MCP fallback, serve \`{ filter: 'all', updatedAt: fixed }\` from the local endpoint. Require the same values and an added empty array in parsed tool text.

Do not confuse a missing array with an HTTP failure. Non-success status causes \`fetchWithTimeout\` to throw and should produce an MCP error result.

MCP leaderboard truncation contract testing should include a prior successful call before the missing-array case. The second output must not retain records from the first response.

Use fresh response objects for every request. Shared mutable fixtures can make accidental tool mutation appear as a server bug on later cases.

## CI coverage for MCP top skills contract

CI coverage for MCP top skills contract should run focused web route tests and built-package MCP tests. The two layers share a response boundary but have different owners and failure signals.

Build \`@qaskills/mcp\` before launching its stdio entry point. Record the version from \`packages/mcp/package.json\` with failed transcripts.

Use a local API server with fixed JSON and a request ledger. Public leaderboard data changes too often to support exact ranking or timestamp assertions.

Run limit cases as a table so one fixture definition drives expected \`slice\` output. Include source length in test names to make short-array behavior clear.

Set one timeout for MCP protocol calls and another for process teardown. A missing response and an open child require different diagnostics.

Retain requested limit, source hash, source order, parsed result, raw tool content, request ledger, child exit state, and package version. These artifacts locate drift without querying production.

Block release for wrong validation bounds, changed order, metadata loss, record mutation, padding, excess records, stale carryover, or fallback errors. Formatting-only differences in JSON text should not block semantic equality.

Run upstream ranking checks when \`packages/web/src/app/api/leaderboard/route.ts\` changes. Run downstream slice checks whenever the MCP handler, SDK, or package metadata changes.

Use [getting started](/getting-started) for user setup, not CI state. Tests should set API origin, working directory, and process environment explicitly.

MCP leaderboard truncation contract testing should produce deterministic output on every runner. Fixed clocks in route tests prevent \`updatedAt\` from changing snapshots.

## How should leaderboard metadata retention be asserted?

Leaderboard metadata retention should be asserted with exact top-level equality after replacing only \`skills\` by its expected prefix. This pattern automatically covers current and future metadata keys.

Construct the expected object as \`{ ...source, skills: source.skills.slice(0, limit) }\`. Then deep-compare it with the parsed tool result.

Include \`filter\`, \`updatedAt\`, and a synthetic extra field in the local response. The extra field proves preservation comes from spreading the source rather than a fixed allowlist.

Within retained records, compare every field and type. Rank must remain numeric, timestamps must remain strings, and booleans must not become text.

Check omitted records are absent by unique slug and id. A length assertion alone cannot detect replacement by the wrong source items.

Prove the source object remains unchanged after the call. Freeze the fixture when practical, or compare it with a deep clone retained before serving.

Do not require object key order after JSON parsing. Semantic JSON equality matters, while source array order remains strict and meaningful.

The tool should not recalculate rank after truncation. Since it takes a leading prefix, existing ranks should already begin at one and remain unchanged.

If the local fixture begins at rank six, the tool should preserve ranks six onward rather than renumber them. That diagnostic case proves the MCP layer does not claim ownership of ranking.

MCP leaderboard truncation contract testing can link results to the [live leaderboard](/leaderboard) for context, but release assertions must stay on controlled data. The live page can change while a fixed test case must yield the same list each time.

## Step-by-step test implementation

Implement MCP leaderboard truncation contract testing in six steps, keeping API ranking evidence separate from MCP truncation. Each step should preserve source data for later comparison.

1. Read \`packages/mcp/src/index.ts\`, \`packages/web/src/app/api/leaderboard/route.ts\`, and \`packages/mcp/package.json\` to record bounds, default, route shape, rank creation, and package identity.
2. Build ranked fixtures for minimum, typical, default, maximum, short, empty, absent, null, and malformed array cases with fixed response metadata.
3. Serve each fixture from a local \`/api/leaderboard\`, launch the built MCP server, and call \`get_leaderboard\` through initialized stdio.
4. Parse the returned text and assert leading records, exact order, complete retained objects, metadata equality, fallback behavior, request count, and source immutability.
5. Inject invalid limits and HTTP or runtime-shape failures, then verify no false success, no stale carryover, bounded timeouts, and complete child cleanup.
6. Run web and MCP suites in CI, retain compact failed fixtures, and assign defects to ranking, cache, API response, schema validation, slicing, or harness ownership.

Generate expected prefixes with the native \`slice\` expression in test code. Handwritten expected arrays can accidentally duplicate the same indexing defect across cases.

Keep route filter tests distinct from MCP calls because the current MCP tool does not pass a filter. A test that adds one would describe proposed behavior rather than production.

Call default and explicit ten in separate cases. Equal output does not prove the same validation path, but the pair can expose missing default application.

Close the fake server only after its request ledger is asserted. Early teardown can turn a duplicate late request into an ignored socket error.

Browse [verified QA skills](/skills) for user context, but never seed contract fixtures from changing production ranks. Synthetic records make every expected position reviewable.

## Failure triage and regression ownership

Start triage by comparing the local source response with parsed tool output. If source order is already wrong, the web route or fixture owns the first investigation.

If invalid limits reach the local API, inspect the MCP input schema and SDK validation path. The handler should not fetch before bounded input is accepted.

If output has the right length but wrong records, inspect sorting or indexing added around the slice. Compare unique slugs at every source position.

If records are right but metadata is missing, inspect the response spread and JSON serialization. A fixed reconstruction often drops new top-level fields.

If missing \`skills\` causes an error, confirm the property is truly absent or null. A wrong non-null type is outside the current fallback and should follow the error path.

If ranks or timestamps change, compare the API response before the MCP call. The web route owns creation, while the MCP tool should preserve values.

If only CI fails, compare package build hashes, Node versions, local server timing, and fixture clocks. Avoid changing expected order until identical source JSON is reproduced.

Use one decision path: validate limit, capture API JSON, compare source order, compare prefix, compare retained fields, compare metadata, then inspect process health. The first mismatch gives a precise owner.

Attach the smallest failing fixture and one nearby passing boundary. A fifty-record dump is unnecessary when a three-record case demonstrates reversal.

MCP leaderboard truncation contract testing failures should name the lost field, changed index, or invalid bound. Broad ranking labels slow both web and MCP owners.

A useful rank log starts with the limit, source count, result count, and source hash on one line. Those three whole numbers and the hash show a bad bound, changed fixture, or short list at once.

Print source slugs and result slugs as two small lists in the same strict order and test case. A moved, lost, or added row then stands out without a large object diff or a full response dump.

For each kept row, print rank, slug, install count, and one fixed date field from the source. This sample is small, yet it can catch a new rank, count, or date map in the MCP layer.

Place \`filter\`, \`updatedAt\`, and any extra top-level key above the row list, since they describe the whole response. If one is gone, the fault is not part of normal array slice work alone.

For a missing list case, print the source key set, result key set, and parsed tool error flag. This shows that \`skills\` was added while all other keys stayed in place with a sound tool result.

For a bad limit, print the raw call args, value type, and the local API request count. A count of zero proves the schema stopped the call before any fetch or response mapping began.

Use the [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) when the stdio call itself fails before any local API request. Keep rank checks paused until one plain tool call can pass through the same child and return text.

When a test fails only in CI, compare the fixed source hash and package build hash before any rank claim. If either hash differs, the rig or test data changed before the tool had a chance to slice.

The final note should name one source index, one result index, the first mismatched field, the limit, the source hash, the package build, and the local API request count used by that case. This small set leads a reviewer straight to the bad step, shows which side changed first, and keeps nearby rows that still pass in view during review.

Do not hide an order bug with a set match, even when all expected slugs and ids from the same fixed response body are present in both lists. Rank is tied to place and source order, so the returned array must remain strict for every tested limit, source length, and package build.

## Frequently Asked Questions

### How can tests prove bounded leaderboard results preserve order and metadata?

Serve a fixed ranked response through a local API, call \`get_leaderboard\` with a known limit, and parse its text result. Compare it with the original object after replacing only \`skills\` by the leading slice. Also prove the source fixture and request count remain unchanged.

### What should an MCP leaderboard limit test expect for short input?

It should return \`min(limit, source length)\` records, never padded entries. A two-record source with limit fifty remains two records in the same order. Each object, rank, and timestamp should remain exact, while response-level fields such as filter and updated time should also survive.

### How is leaderboard order preservation tested without production data?

Use synthetic records whose slug, id, and score orders differ, then require the exact source sequence after truncation. This fixture reveals alphabetic or numeric re-sorting. Controlled data is preferable because live ranks, install counts, and timestamps can change between requests and make failures ambiguous.

### What should the missing skills array fallback return?

When \`skills\` is absent or null, the current handler should return a successful object with \`skills: []\` and all other response metadata retained. A non-null object or string is different because it lacks \`slice\`; that malformed producer shape should become an MCP error result.

### Which fields belong in leaderboard metadata retention assertions?

Assert every top-level field from the API response, including current \`filter\` and \`updatedAt\`, plus all fields in retained skill records. Preserve numeric ranks, timestamp strings, booleans, and unknown extra keys. Ignore JSON key ordering, but require strict array order and semantic value equality.

## Conclusion

MCP leaderboard truncation contract testing proves that a validated limit selects only a leading prefix while leaving upstream ranking evidence intact. Exact object comparisons, fallback cases, and invalid bounds keep web ranking and MCP slicing responsibilities clear.

Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this bounded-result matrix before the next MCP release. Check the [live leaderboard](/leaderboard) only after the fixed source and MCP result agree in the test run.`,
};
