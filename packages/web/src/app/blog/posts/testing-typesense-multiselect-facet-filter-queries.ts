import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Typesense Facet Filter Testing',
  description:
    'Typesense facet filter testing covers multi-select syntax, AND and OR behavior, escaping, sort mapping, result projection, and facet count assertions.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Typesense facet filter testing',
  keywords: [
    'Typesense facet filter testing',
    'Typesense multi-select filters',
    'filter_by query assertion',
    'facet count extraction',
    'Typesense sort_by testing',
    'search result projection',
    'Typesense filter escaping',
    'search facet integration test',
  ],
  relatedSlugs: [
    'testing-lazy-neon-database-initialization-nextjs-build',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'testing-versioned-zip-artifact-sha256-etag',
  ],
  sources: [
    'https://typesense.org/docs/latest/api/search.html',
    'https://typesense.org/docs/30.2/api/collections.html',
    'https://typesense.org/docs/guide/typesense-js-client-tuning.html',
  ],
  content: `
Typesense facet filter testing sends a controlled search request, captures the generated \`filter_by\` and \`sort_by\` values, and compares returned skills plus facet counts with known documents. Cover one choice, several choices in one facet, choices across facets, special characters, empty filters, every sort label, and missing response fields.

QASkills builds its Typesense query in \`packages/web/src/lib/typesense/search.ts\`. The helper maps web parameters into five array facets, one verified flag, four sort modes, pagination, result projection, and count lists. A useful suite checks each contract separately before one small integration test proves that the parts work together.

## How Do Typesense Multi-Select Filters Work?

Typesense multi-select filters let one request keep several values for the same field. The QASkills helper joins selected values with commas inside square brackets. It then joins different facet expressions with \`&&\`, so the final string is one \`filter_by\` expression.

For example, two framework values produce \`frameworks:=[playwright,cypress]\`. Adding a language produces \`frameworks:=[playwright,cypress] && languages:=[typescript]\`. The unit test should assert this exact string because a small delimiter change can alter which skills the server returns.

The official [Typesense search API](https://typesense.org/docs/latest/api/search.html) defines the filter expression syntax, array fields, facet fields, sorting, and pagination parameters. Read that page beside the installed Typesense version because syntax can gain new options. The repository test should still own the exact subset QASkills sends.

Typesense facet filter testing must separate query shape from server meaning. A mocked client proves QASkills formed the intended string. A controlled collection proves that the running search service treats the bracket list as the team expects.

Use rows with overlap instead of rows that each match only one case. One skill can contain Playwright and TypeScript, another Cypress and TypeScript, and a third Playwright and JavaScript. This set reveals whether same-facet choices act like alternatives while choices in separate facets narrow the result.

The request always searches \`name,description,author\`, even when the query is the wildcard default. Add one assertion for those three fields because dropping author would change a valid search path. A typo there may leave facets working while ordinary text search loses expected skills.

The collection constant is \`skills\`, and each client call walks through collection, documents, then search. Test that chain with one strict mock before using looser fixtures elsewhere. A wrong collection can return a valid empty result, which looks much like a filter with no matches.

The [AI QA skills directory guide](/blog/ai-qa-skills-directory-2026) explains how users discover skills by task and framework. The search test protects that path below the interface. A browser flow can still verify the chips and result cards after the query contract passes.

## What Should a filter_by Query Assertion Prove?

A filter_by query assertion should prove field names, operators, grouping, order, and omission rules. QASkills emits fields in a fixed order: testing types, frameworks, languages, domains, agents, then the verified flag. Empty arrays add no expression, and a false verified flag adds nothing.

Do not assert only that the string contains \`playwright\`. A malformed query could contain the value while using the wrong field or joining facets with the wrong operator. Compare the complete expression for a small matrix of inputs.

| Input case | Expected filter_by | Main risk |
| --- | --- | --- |
| No filters | \`undefined\` | Empty expression sent as a filter |
| One framework | \`frameworks:=[playwright]\` | Wrong field or operator |
| Two frameworks | \`frameworks:=[playwright,cypress]\` | Same-facet grouping changes |
| Framework and language | \`frameworks:=[playwright] && languages:=[typescript]\` | Cross-facet join changes |
| Verified only | \`verified:=true\` | Boolean becomes a string value |
| All fields | Six ordered expressions | A field is lost or reordered |

A mock can expose the search function passed to \`documents().search()\`. Return a minimal result with \`hits\`, \`found\`, and \`facet_counts\` so the helper completes normally. Then inspect only the request object in query-focused cases.

\`\`\`ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.fn();
const documents = vi.fn(() => ({ search }));
const collections = vi.fn(() => ({ documents }));

vi.mock('@/lib/typesense/client', () => ({
  SKILLS_COLLECTION: 'skills',
  getTypesenseClient: () => ({ collections }),
}));

describe('searchSkills filter_by', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search.mockResolvedValue({ hits: [], found: 0, facet_counts: [] });
  });

  it('joins values within a facet and facets across the request', async () => {
    const { searchSkills } = await import('@/lib/typesense/search');

    await searchSkills({
      frameworks: ['playwright', 'cypress'],
      languages: ['typescript'],
      verifiedOnly: true,
    });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        filter_by:
          'frameworks:=[playwright,cypress] && languages:=[typescript] && verified:=true',
      }),
    );
  });
});
\`\`\`

Typesense facet filter testing should also assert \`collections('skills')\`, \`query_by\`, and \`facet_by\`. These constants keep search and the collection schema aligned. The [API testing guide](/blog/api-testing-complete-guide) offers a wider request matrix, while this suite stays focused on one search adapter.

## How Do You Test Facet Count Extraction?

Facet count extraction turns the Typesense response into lists used by filter controls. The helper finds one \`facet_counts\` entry by \`field_name\`, then maps each value and count without changing order. If a field or the whole array is absent, it returns an empty list.

Use a response with all five fields, one field with zero entries, and one unknown field. Assert that known counts survive exactly, unknown data does not leak into another facet, and a missing field becomes \`[]\`. This protects the user interface from \`undefined\` checks.

\`\`\`ts
it('projects count lists and defaults missing facets', async () => {
  search.mockResolvedValue({
    found: 2,
    hits: [],
    facet_counts: [
      {
        field_name: 'frameworks',
        counts: [
          { value: 'playwright', count: 2 },
          { value: 'cypress', count: 1 },
        ],
      },
      {
        field_name: 'languages',
        counts: [{ value: 'typescript', count: 2 }],
      },
    ],
  });

  const { searchSkills } = await import('@/lib/typesense/search');
  const result = await searchSkills({ query: 'browser' });

  expect(result.facets?.frameworks).toEqual([
    { value: 'playwright', count: 2 },
    { value: 'cypress', count: 1 },
  ]);
  expect(result.facets?.agents).toEqual([]);
});
\`\`\`

Do not sort counts in the adapter test unless the product contract calls for it. The current helper preserves provider order. A UI component may sort labels later, but mixing that choice into this test would hide which layer changed the order.

Typesense facet filter testing should compare counts with the filtered result set in the integration case. A count can be valid for the search context yet exceed the visible page because facet counts describe all matches, not only one page. Assert the service contract, not a false equality with \`hits.length\`.

The [Typesense collection schema documentation](https://typesense.org/docs/30.2/api/collections.html) explains which fields must be marked as facets. QASkills marks author, testing types, frameworks, languages, domains, agents, featured, and verified as facet fields. The search request asks for five array fields, so a schema test should keep those names in sync.

Count order deserves a named case because the helper keeps provider order without another sort. Give the mock three framework counts in a known sequence, then require that same sequence in the result. This catches a later object conversion that may reorder numeric-like or mixed labels.

Also test a facet entry whose \`counts\` array is present but empty. That is different from a missing field inside the raw response, even though both map to \`[]\`. Keeping both cases shows that the adapter has one stable output for two valid provider shapes.

Keep one negative case where the provider returns no \`facet_counts\`. That path often appears when a mock is too small, but it can also reveal an index or request issue. The adapter returns empty lists, while service logs and health checks should retain the cause.

## How Do You Verify Typesense sort_by Testing?

Typesense sort_by testing checks the map from public labels to indexed fields. QASkills maps \`trending\` and \`most_installed\` to \`installCount:desc\`, \`newest\` to \`createdAt:desc\`, and \`highest_quality\` to \`qualityScore:desc\`. Missing sort input uses \`trending\`.

A table-driven unit case is ideal because each row has one input and one expected value. Include the undefined case rather than assuming the first map entry acts as a default. The code selects \`params.sort || 'trending'\`, which is the behavior under test.

\`\`\`ts
it.each([
  [undefined, 'installCount:desc'],
  ['trending', 'installCount:desc'],
  ['most_installed', 'installCount:desc'],
  ['newest', 'createdAt:desc'],
  ['highest_quality', 'qualityScore:desc'],
] as const)('maps %s to %s', async (sort, expected) => {
  const { searchSkills } = await import('@/lib/typesense/search');

  await searchSkills({ sort });

  expect(search).toHaveBeenLastCalledWith(
    expect.objectContaining({ sort_by: expected }),
  );
});
\`\`\`

This test records a current product choice: Typesense treats trending like total installs in this adapter. The database API uses weekly installs for its trending sort, so the two search paths can rank results differently. Report that fact as contract drift if both paths are meant to power the same screen.

Typesense facet filter testing should not silently change sort labels to repair the difference. First add a failing parity test and get a product decision. Then update the index field, adapter map, or public label with release notes.

Pagination belongs in the same request-object check. Assert page defaults to one and page size defaults to twenty, then test explicit values. The [offset pagination regression guide](/blog/testing-offset-pagination-duplicate-records) covers stable order across pages, which requires more than checking one \`sort_by\` string.

The TypeScript input narrows sort labels, but runtime callers can still bypass static types. Send one invalid label through a cast and record that the current map yields an undefined sort value. Decide at the API boundary whether rejection, normalization, or provider default order is the approved result.

Keep that negative case outside the table of valid labels so it cannot weaken normal expectations. Accepted labels must always map to one explicit field and direction. Invalid input should have one clear owner instead of drifting through the client by chance.

## What Should Search Result Projection Preserve?

Search result projection should preserve public fields while leaving out provider wrappers and large private content. QASkills reads each hit document and returns id, name, slug, description, author, scores, count, filter arrays, flags, and a created date. It also returns total, page, page size, and normalized facets.

Build one hit with extra fields such as \`fullDescription\`, internal timestamps, and a search highlight. Assert those fields do not appear in the skill summary. This keeps the adapter output small and protects callers from binding to the raw provider response.

Typesense may return highlight data beside each document. The current helper ignores that wrapper by reading only \`hit.document\`. A projection test should include highlight data and prove the result stays unchanged.

Use a second hit with \`created_at\` instead of \`createdAt\`, because the adapter supports that legacy name. A third missing-date case should become the Unix epoch string. If the collection returns a numeric \`createdAt\`, record the actual runtime value and decide whether the adapter should convert it before promising a string.

Typesense facet filter testing gains stronger evidence when result order is checked. The helper maps hits in provider order and does not sort them again. Use two named documents and assert the same sequence reaches the caller.

Do not make the unit test judge relevance scores that QASkills does not expose. A controlled integration can check that a query returns the expected documents, but provider ranking is a separate concern. The [skills directory](/skills) is the best place to inspect the final user result after adapter and interface checks pass.

The projection takes \`featured\` and \`verified\` as booleans without default values. Build complete indexed documents for normal cases, then remove one field in a drift case. The result will reveal whether downstream code accepts undefined data or needs an explicit adapter default.

Creation time has three paths: \`createdAt\`, legacy \`created_at\`, and an epoch fallback. Assert all three in a table and parse each expected string. This captures the current compatibility rule without claiming a numeric Typesense value is already converted.

## How Do You Protect Typesense Filter Escaping?

Typesense filter escaping is a required test target because the current helper inserts values with \`join(',')\`. It does not quote, escape, or validate commas, brackets, backticks, or control characters. A special-character case should expose that behavior rather than claim the adapter is already safe.

Start with values allowed by the QASkills taxonomy, since known framework and agent IDs may avoid special characters. Then add a defensive case for a comma and closing bracket. If user-controlled or future catalog values can reach this helper, the raw string may change the filter expression.

\`\`\`ts
it('exposes unescaped filter values for a product decision', async () => {
  const { searchSkills } = await import('@/lib/typesense/search');

  await searchSkills({ frameworks: ['safe', 'name,with,commas'] });

  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({
      filter_by: 'frameworks:=[safe,name,with,commas]',
    }),
  );
});
\`\`\`

The test above documents a gap; it is not the desired security assertion. Replace it with an escaped expression or input rejection after the team selects a supported grammar. Keep a server-backed case because escaping rules belong to the search service syntax, not a home-grown guess.

Avoid using a broad string replacement without tests for backslashes and quotes. A value can pass one example and still break another delimiter. Prefer a small filter builder with clear input rules, or use an official client feature when the installed version supports structured filters.

Typesense facet filter testing should also check that \`undefined\` is sent when no filter exists. An empty \`filter_by\` string may not behave like omission across versions. The current helper uses \`filterParts.join(' && ') || undefined\`, and that choice deserves one direct assertion.

The [Typesense client tuning guide](https://typesense.org/docs/guide/typesense-js-client-tuning.html) discusses timeouts, retries, and node selection. Escaping tests do not replace those transport checks. Keep syntax, service availability, and retry behavior in separate groups so one failure has one likely cause.

## Build a Search Facet Integration Test

A search facet integration test creates a small temporary collection with the same field names and facet flags as production. Load documents that overlap across frameworks, languages, domains, and agents. Then call the adapter through a configured test client and assert documents plus counts.

Use a unique collection name per run if tests share a Typesense service. The current helper uses the fixed \`skills\` name, so an integration harness may point to a dedicated service or mock that constant before import. Never clear a shared development collection as test cleanup.

The fixture needs enough contrast to expose grouping rules. Include one Playwright TypeScript web skill, one Cypress TypeScript web skill, one Playwright JavaScript web skill, and one Playwright TypeScript mobile skill. Add verified and unverified rows as well.

For each query, save the input, expected slugs, expected total, and selected facet counts. Check a no-filter baseline first. Then apply one value, two values from one facet, values across two facets, and the verified flag.

The QASkills client uses localhost, port 8108, and HTTP when matching environment values are absent, but it creates no client without an API key. Integration setup should set every value so local defaults cannot point at the wrong service. Log host and protocol, while never printing the API key.

The client sets a five-second connection timeout. A filter integration test should stay well below that limit on a local service, while a separate outage case can own timeout behavior. Mixing slow startup with filter assertions creates failures that say nothing about query rules.

Give the integration key access only to the temporary collection required by that test run. Create the schema first, then wait for each document import before sending queries. Delete the collection in a final cleanup step, while preserving any earlier assertion failure. This flow keeps shared search data safe and ties every returned count to one known, fixed, fully reviewed fixture.

Typesense facet filter testing should run this service-backed suite at a lower rate than pure unit cases if startup is costly. Keep the request-shape unit suite on every pull request, then run integration checks for search changes, dependency updates, and release branches.

The [API testing complete guide](/blog/api-testing-complete-guide) can help add response status, timing, and failure cases around a test service. The [Playwright CLI skill](/skills/Pramod/playwright-cli) can then exercise search controls in a real browser without replacing the adapter evidence.

Keep failure output short and useful. Print the input filter, generated \`filter_by\`, expected slugs, actual slugs, and collection version. Do not dump every indexed document unless a local debug flag is set.

## Run the Typesense Facet Filter Testing Matrix

Run checks in an order that isolates local mapping before remote service behavior. This sequence gives fast feedback and makes each failure easier to place. Save the service version for integration results because filter rules may vary by release.

1. Mock the client and verify collection, query, filter, sort, page, page size, and facet request fields.
2. Run single-value and same-facet multi-value cases against the complete \`filter_by\` string.
3. Combine two facet groups and verify the \`&&\` boundary plus the verified flag.
4. Return controlled hits and assert public field projection, order, dates, totals, and defaults.
5. Return full, partial, and missing count arrays and verify facet count extraction.
6. Feed special-character values, record the current raw join, and define the required escape or reject rule.
7. Load an isolated collection and repeat the core cases against a real Typesense service.
8. Use a browser check to confirm selected chips, result cards, count labels, and URL state agree.

Typesense facet filter testing should fail closed when the unit request no longer matches the approved contract. The integration suite can retry a short transport fault, but it should not retry an assertion mismatch. A wrong filter will not become correct with time.

Keep snapshots out of the core query checks. Exact object assertions show which field matters, while large snapshots tend to absorb unrelated client defaults. Use snapshots only for a small, reviewed public result if the team can explain each field.

When the service test fails but the unit test passes, inspect schema flags and service syntax first. When both fail, inspect adapter mapping before the service. This simple split prevents teams from tuning infrastructure to hide a local query bug.

## Apply a Clear Search Contract

Typesense facet filter testing protects the path from selected filters to visible skill results. It proves request shape, sort mapping, projection, count defaults, and server behavior with known documents. It also makes the current lack of special-character escaping visible enough for a product decision.

Keep fast adapter cases near the search helper and run the small collection test for search releases. Explore more automation patterns in the [QASkills directory](/skills), then use the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) to check the public filter flow after deployment.

For related data behavior, compare the [pagination duplicate-record guide](/blog/testing-offset-pagination-duplicate-records) and the [AI QA skills directory guide](/blog/ai-qa-skills-directory-2026). Those checks help teams separate search syntax, result order, and interface state instead of treating them as one vague search failure.

## Frequently Asked Questions

### Should a mocked client replace a real Typesense test?

No. A mock proves the adapter sent the expected request and projected the response as designed. A small real collection proves the active Typesense version accepts that syntax and applies facet rules as expected. Both checks are useful because they fail for different reasons.

### What happens when Typesense is not configured?

The current QASkills client returns \`null\` when its API key is absent. The search helper then returns no skills, total zero, requested pagination defaults, and no facet object. Test that fallback separately so missing configuration does not look like a malformed filter case.

### Are two values in one facet always an OR?

Do not rely on a label alone. Assert the generated bracket expression, then prove its result with overlapping documents in the installed Typesense version. If the product needs a different rule, change the query builder and integration expectation together rather than changing only interface text.

### Why test facet counts when result slugs are correct?

Count lists drive filter labels and can be wrong even when visible hits look right. A field-name mismatch, missing facet flag, or bad response projection may leave result cards correct while counts vanish. Separate assertions catch that partial failure and point to the right layer.

### How should special characters be handled?

Define an accepted value grammar first. Values outside it should be rejected or encoded with syntax verified against official Typesense behavior. The current comma join is not an escaping layer, so tests should expose commas, brackets, quotes, and backslashes before catalog values expand.

### How often should Typesense facet filter testing run?

Run mocked request and projection cases on every pull request. Run the isolated collection suite when search code, schema fields, client versions, or Typesense versions change, plus before release. Keep one browser flow for the final filter controls and result cards.
`,
};
