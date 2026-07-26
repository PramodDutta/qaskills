import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Typesense query field coverage testing',
  description:
    'Use Typesense query field coverage testing to prove name, description, and author are searchable while taxonomy and slug remain filter fields.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Typesense query field coverage testing',
  keywords: [
    'Typesense query field coverage testing',
    'Typesense query_by contract test',
    'search author field testing',
    'slug not searchable regression',
    'searchable versus faceted fields',
    'Typesense field coverage matrix',
  ],
  relatedSlugs: [
    'testing-typesense-multiselect-facet-filter-queries',
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-search-response-normalization-contract-tests',
    'database-testing-automation-guide',
  ],
  sources: [
    'https://typesense.org/docs/latest/api/search.html',
    'https://typesense.org/docs/latest/guide/ranking-and-relevance.html',
  ],
  repoEvidence: [
    'packages/web/src/lib/typesense/search.ts',
    'packages/web/src/lib/typesense/client.ts',
    'packages/shared/src/types/skill.ts',
  ],
  content: `Typesense query field coverage testing proves the contract by indexing a unique token in every field, searching with live options, and comparing matching hits with no-hit controls. Name, description, and author tokens must match. Slug and taxonomy tokens must not match free text, although taxonomy filters and facets must still work.

This is a field-role test, not a general search smoke test. A single successful query cannot show which field supplied the match, and a wildcard query cannot test text coverage at all. Controlled tokens make every result explainable and expose an accidental change to \`query_by\` immediately.

The live contract lives in \`packages/web/src/lib/typesense/search.ts\`, where \`searchSkills\` sends \`query_by: 'name,description,author'\`. The collection declared in \`packages/web/src/lib/typesense/client.ts\` contains more fields, but collection membership alone does not make every field part of that query. The shared response shape in \`packages/shared/src/types/skill.ts\` also helps tell fields returned to callers from fields searched by text.

Use the live [skills directory](/skills) to understand the user flow, then keep the automated test below the interface. For multiselect details, compare this contract with the [Typesense facet filter guide](/blog/testing-typesense-multiselect-facet-filter-queries), which covers filter combinations rather than field participation.

## What Must Typesense Query Field Coverage Testing Prove?

Typesense query field coverage testing must prove five distinct roles: text query, filter, facet, sort, and response mapping. It should show that one field can occupy several roles without assuming those roles are interchangeable. That distinction protects relevance, navigation, and API output from one broad check.

The text-hit cases are name, description, and author. Each case needs a token found nowhere else in the indexed rows, test name, collection name, or request options. The target result is one known row with a found count of one, not simply a nonempty hit list.

The no-hit text cases are slug and taxonomy arrays. Their unique tokens should return zero hits when the request uses the live \`query_by\` string. Those same taxonomy values should produce the target row when passed through \`filter_by\`, proving the field works in its set role.

Facets form another independent output. The request asks for testing types, frameworks, languages, domains, and agents through \`facet_by\`. A field may produce facet counts even though its token does not participate in the free-text match.

Sort-only values need their own checks. Quality score, install count, and creation time shape order through supported options, but none belongs in the live text list. Testing a number as a query term would encode a skill the current search path never requests.

The result mapping is narrower than the collection schema. \`SkillSummary\` includes name, slug, description, author, quality score, install count, selected taxonomy arrays, flags, and creation time. A response field can be present for display while remaining absent from \`query_by\`.

Start with a written role ledger before writing checks. The [database testing guide](/blog/database-testing-automation-guide) explains controlled fixtures, while this test narrows that practice to one test search collection. The ledger becomes the review note when schema and request options change on their own.

Keep the base case small and name each row for the fact it proves, with fixed IDs that stay easy to read in local and CI logs. Save the full field list with each run, since a lone pass flag leaves too much doubt about what was sent. When one check fails, run that token by itself before changing the index or the test. This short path helps the team find the first bad fact with less noise.

## How Do You Build a Typesense query_by Contract Test?

A Typesense query_by contract test should run the same options object used by \`searchSkills\`, not a hand-built request that merely resembles it. Mocking the Typesense search call is useful for an exact input check. A test server then checks those inputs against indexed rows.

First, capture the search payload passed through the client chain. The exact string matters because adding slug or dropping author changes public search results. Also check \`facet_by\`, since a code change can keep text fields while it drops browse counts.

\`\`\`ts
import { expect, test, vi } from 'vitest';
import { searchSkills } from '@/lib/typesense/search';

const search = vi.fn().mockResolvedValue({
  found: 0,
  hits: [],
  facet_counts: [],
});
const documents = vi.fn(() => ({ search }));
const collections = vi.fn(() => ({ documents }));

vi.mock('@/lib/typesense/client', () => ({
  SKILLS_COLLECTION: 'skills',
  getTypesenseClient: () => ({ collections }),
}));

test('uses the production query and facet fields', async () => {
  await searchSkills({ query: 'needle', page: 1, pageSize: 20 });

  expect(search).toHaveBeenCalledWith(
    expect.objectContaining({
      q: 'needle',
      query_by: 'name,description,author',
      facet_by: 'testingTypes,frameworks,languages,domains,agents',
    }),
  );
});
\`\`\`

That unit case catches request drift fast, but it does not prove Typesense reads the options as planned. The live layer should index rows that fit \`skillsSchema\`, send one query per token, and check exact row IDs. Keep both layers because each finds a different fault.

Create at least two rows so the test can catch a match that is too broad. Give the target rare values such as \`namelark\`, \`descpine\`, and \`authorcove\`; give the control row unrelated text. Avoid word forms or common parts that search rules might join.

Search one token at a time with the full live field list. Do not change \`query_by\` for each case, because that would test Typesense itself rather than the app contract. Keep page size large enough to see all planned hits, yet check the exact target set.

The official [Typesense search API reference](https://typesense.org/docs/latest/api/search.html) defines \`query_by\`, \`filter_by\`, \`facet_by\`, and \`sort_by\` as distinct inputs. Treat that page as wire proof and the repo options as app proof. Both are needed to explain a failed case well.

Use the [MCP filter schema drift article](/blog/mcp-search-filter-schema-drift-contract-tests) when another transport exposes the same filters. It shows why a passing web request does not automatically protect every client contract.

Keep the mock and live search cases close, but give each one a clear job and a distinct name. The mock should show the app sent the right fields, while the live case should show the search node used them as planned. If both fail, fix the first request fault before reading rank or facet data. This order keeps one bad input from causing a long chain of vague red checks.

## What Does Search Author Field Testing Verify?

Search author field testing checks that an author-only token can find a skill through text and that author remains a valid facet in the collection schema. The live query includes author, while the live facet list does not ask for author counts. Tests must keep that exact split.

Index one skill whose author is \`authorcove\`, then ensure the token appears nowhere in its name, description, slug, or taxonomy. Query \`authorcove\` through \`searchSkills\` and assert the known ID is returned. A copied author token in the description would invalidate the isolation.

The schema marks author with \`facet: true\`, so a direct Typesense request can also check author filters if that result matters to another caller. However, \`searchSkills\` does not now build an author filter or include author in \`facet_by\`. Do not report those missing app features as live results.

Case rules deserve a controlled pair. Use the same token in a different case and record the result under the active Typesense setup. Do not infer language or locale rules from JavaScript string matching, because the search server owns token work.

Author changes can also cause a stale index. Update the author in the test row, query the old and new tokens, and check that the index reflects the test step. Keep sync tests apart unless the repo has an index flow that the suite can run.

The response mapper casts \`doc.author\` to a string and returns it in each skill summary. Assert both discovery and returned value so a mapping regression cannot hide behind the correct hit ID. This gives search author field testing one matching check and one response check.

Browse [API testing skills](/categories/api-testing) for response checks you can reuse. For mapped output beyond this function, the [MCP response normalization contract](/blog/mcp-search-response-normalization-contract-tests) provides its own edge and should not be folded into author coverage.

Use one plain author word that no other row can hold, then print the target ID and the set of fields scanned by the test. A peer can read those facts and know why the hit should exist. Keep the old and new author words in the update case, so stale data is clear at once. Search author field testing works best when each word has one source and one planned hit.

## Slug Not Searchable Regression Cases

A slug not searchable regression case needs a token present only in slug and a request that otherwise matches no field. With \`query_by\` limited to name, description, and author, the target found count is zero. This no-hit check stops a handy ID from quietly becoming free-text content.

Use an artificial slug such as \`slugfjord-only\`, while keeping the displayed name natural and unrelated. Query the complete slug and its distinctive \`slugfjord\` token. Both should miss unless Typesense token settings intentionally produce another controlled result, which the fixture should avoid.

Add a contamination guard before indexing. Flatten every candidate query field and assert it does not contain the slug token. That small precondition makes the negative result meaningful when future fixture edits add descriptive text or repeat an identifier.

A second regression case should place the same token in name while keeping it in slug. That query must now find the row, proving the no-hit case comes from field choice rather than bad input or a down collection. Hit and no-hit twins give a strong cause.

Do not confuse URL lookup with text search. A detail endpoint may find a slug at once, and the search result returns slug for links. Neither fact means slug belongs in \`query_by\`, so test those skills through their own routes.

If a later plan makes slugs searchable, change the ledger, request check, and live test goals together. A one-line request edit without new cases should fail review. The [skills directory](/skills) remains the place to check the final user result after the low-level contract passes.

Typesense query field coverage testing should also use a taxonomy-only negative control. Put \`frameworkquartz\` solely in frameworks and expect no free-text hit. Then apply the framework filter and expect the target, showing the server received a valid indexed field.

Pair each no-hit check with one nearby hit check that uses the same node, index, and page size. That pair shows the node is live and the query can find the row when the word moves into an allowed field. Save both hit counts in one small report, with the field role beside each count. A clear pair is much safer than a lone zero that could come from bad setup.

## How Do Searchable Versus Faceted Fields Differ?

Searchable versus faceted fields differ by the operation named in the request. \`query_by\` chooses fields whose text can satisfy \`q\`; \`filter_by\` narrows candidates by expressions; \`facet_by\` asks for grouped counts. Schema facet flags permit facet operations, but they do not add fields to text search.

The live function builds filters for testing types, frameworks, languages, domains, agents, and the verified flag. It joins active terms with \`&&\`, so picked groups narrow the result together. A field coverage suite should use one value at a time before it tests pairs.

Five taxonomy arrays appear in \`facet_by\`: testing types, frameworks, languages, domains, and agents. Their counts are normalized by \`extractFacetCounts\`, which returns an empty array when a field is absent. Assert both the raw request and the mapped facet object.

Author is a useful edge case. Its schema entry lets it serve as a facet, and its name appears in \`query_by\`, yet the app does not ask for author facets. This proves schema skill, query use, and current output are three distinct facts.

Featured and verified are also marked as facets in the collection. The function can filter verified skills, but its requested facet list excludes both flags. A coverage report should label this as implemented filtering without returned facet counts.

The [facet query testing guide](/blog/testing-typesense-multiselect-facet-filter-queries) covers combination syntax and escaping in greater depth. Here, one successful taxonomy filter is enough to prove the field is filterable while its unique token stays absent from free-text results.

Typesense query field coverage testing becomes easier to review when each check names a role. Prefer labels like \`framework-filter-positive\` and \`framework-query-negative\` over broad names such as \`search works\`. A failed label then points to the request part.

The [ranking and relevance guide](https://typesense.org/docs/latest/guide/ranking-and-relevance.html) explains how query fields shape matches and rank. Use it to read server results, but keep target field roles tied to the app source.

Draw a firm line between what the schema lets a caller ask and what this app asks in its main search call. The first fact comes from the field flags, while the next comes from the request object. Keep both facts in the case name and log when they differ. This makes searchable versus faceted fields clear to a reader who has not seen the code.

## Typesense Field Coverage Matrix

A Typesense field coverage matrix should record requested use, not each task the server could support. The next matrix follows the current schema and \`searchSkills\` payload. A dash means the live function does not ask for that role.

| Field | query_by | filter_by | facet_by | sort_by | Expected token match |
|---|---|---|---|---|---|
| name | Yes | No | No | No | One hit for a name-only token |
| description | Yes | No | No | No | One hit for a description-only token |
| author | Yes | No | No | No | One hit for an author-only token |
| slug | No | No | No | No | Zero hits for a slug-only token |
| taxonomy arrays | No | Yes | Yes | No | Zero text hits; filter returns target |
| qualityScore and installCount | No | No | No | Yes | Zero text hits; supported sort changes order |
| createdAt | No | No | No | Yes | Zero text hits; newest changes order |

The taxonomy row groups fields with matching roles, but live cases should stay apart. One bad framework fixture must not stop checks for languages or domains. Table-driven cases can share setup while they keep one check record per field.

The sort row needs careful wording because \`searchSkills\` maps only supported public values. Install count serves trending and most-installed options in this Typesense path, quality score serves highest quality, and creation time serves newest. The SQL API has a different sort implementation.

The matrix should also record response roles outside the compact table. Slug is returned for links, languages and domains appear in facets, and only selected taxonomy arrays appear in \`SkillSummary\`. Keep those checks near the mapper rather than forcing them into text-match expectations.

Review the matrix whenever either source file changes. A schema-only addition may require indexing coverage without changing user search. A request-only addition can fail at runtime if the schema does not define the named field.

Use [search-focused QA skills](/skills) to turn these rows into agent instructions. Keep the matrix in the test report as evidence, because a raw success count cannot explain why a field was included or excluded.

Read the matrix from left to right during review, and ask which code line owns each yes or no. A schema row can back a facet flag, while a search row can back the query list and sort map. Mark any blank cell as not sent by this path, rather than as a rule for all Typesense use. Typesense query field coverage testing stays sound when each cell has one source and one test.

## Field Token, Query Parameters, and Expected Hits

The token plan should make every field distinguishable at a glance. Reserve lowercase words that do not overlap, avoid punctuation-dependent fragments, and scan all fixtures before indexing. This removes accidental cross-field matches from the test design.

Use \`namelark\` for name, \`descpine\` for description, \`authorcove\` for author, \`slugfjord\` for slug, and one distinct token for each taxonomy value. The target text hit counts are one, one, one, zero, and zero. A second control row should stay absent throughout.

For taxonomy filters, query \`*\` and apply exactly one filter expression. The target should appear, and facet counts should include its value when that field is requested in \`facet_by\`. This isolates filter semantics from text relevance.

Record the actual request payload on failure. Include \`q\`, \`query_by\`, \`filter_by\`, \`facet_by\`, \`sort_by\`, page, and page size, but never log the API key. The values explain most contract failures without exposing credentials.

Test wildcard use only as setup for filters and facets. A wildcard query that returns a row with a slug does not prove slug search, because the wildcard needs no text from any field. Keep wildcard and token checks in different case names.

Result order is not key when each hit query has one planned row. If several rows should match, check the hit set first and rank in its own case. The [database automation guide](/blog/database-testing-automation-guide) offers test data plans that also work for test collections.

Typesense query field coverage testing should save the two comma-bound field strings after the main checks pass. An inline snapshot gives reviewers a clear contract, while exact object matching reports the branch that changed. Do not save the whole server body because time and extra data can add noise.

Choose test words that are short, odd, and easy to spot, then scan all input text for each word before the import starts. Put the scan result in setup, not in the main hit check, so a leak has its own clear cause. Keep query text and filter text in separate case data even when they use the same row. This small rule makes the token plan easy to grow without hidden overlap.

## How Do You Run the Field Coverage Procedure?

Run the field coverage procedure against a test collection with a unique run suffix. This stops local or CI data from adding surprise matches. Delete the collection in cleanup even after a failed check, and keep only the short role report.

1. Create documents with one distinct token in every candidate field.
2. Run \`searchSkills\` with one text token at a time.
3. Assert name, description, and author tokens return the intended ID.
4. Assert slug-only and taxonomy-only tokens return no free-text hits.
5. Apply each taxonomy filter and verify its target plus facet counts.
6. Snapshot the production \`query_by\` and \`facet_by\` strings.

The fixture builder below keeps required schema fields explicit. It also guards against a token leaking into the three searchable values before the document reaches Typesense. Adapt the import path to the test location without changing the production schema.

\`\`\`ts
import { skillsSchema } from '@/lib/typesense/client';

const target = {
  id: '00000000-0000-4000-8000-000000000016',
  name: 'namelark skill',
  slug: 'slugfjord-only',
  description: 'A descpine fixture for isolated matching.',
  author: 'authorcove',
  testingTypes: ['typeember'],
  frameworks: ['frameworkquartz'],
  languages: ['languagecedar'],
  domains: ['domainharbor'],
  agents: ['agentwillow'],
  qualityScore: 71,
  installCount: 19,
  featured: false,
  verified: true,
  createdAt: 1_785_000_000,
};

const searchable = [target.name, target.description, target.author].join(' ');
for (const negativeToken of ['slugfjord', 'frameworkquartz', 'domainharbor']) {
  if (searchable.includes(negativeToken)) throw new Error('fixture leak: ' + negativeToken);
}

expect(skillsSchema.fields.map(({ name }) => name)).toContain('slug');
await collection.documents().import([target], { action: 'upsert' });
\`\`\`

After import, wait for the clear import result rather than using a fixed sleep. Then run the unit input check and live token table. A fault in the first layer means app drift; a fault only in the second points to schema, server, or test data.

Cleanup should use the collection name made by that test run. Never delete the shared dev collection. If test workers share one server, include worker and run IDs in the test name.

Publish the role matrix beside the test result, then inspect [available categories](/categories) and the [skills directory](/skills) as focused user checks. Those pages confirm the interface still presents filters and searchable results after the lower-level suite passes.

End each run with a short proof sheet that lists the collection, field, token, request role, target ID, and hit count. Keep keys and full row text out of that sheet, since they add risk without helping the next check. If cleanup fails, show the owned collection name and stop the next run from using it. A safe close is part of the test, not a task left for a later job.

- one owned collection for each test run
- one rare word for each field role
- one fixed ID for each planned hit
- one no-hit peer for each text field check
- one filter hit for each taxonomy field
- one saved query_by and facet_by value
- one clear count for each search call
- one cleanup check for the owned collection
- no API key in logs or saved output
- no shared index changed by the test

## Frequently Asked Questions

### Does query_by make every schema field searchable?

No. The collection schema defines stored fields, while \`query_by\` picks which fields take part in one text request. The current app names only name, description, and author. A token stored only in slug or taxonomy should therefore miss during that live free-text search.

### Why test facets separately from text queries?

Facets group values and counts for links, while text queries find rows through picked text fields. A taxonomy value can be a useful facet without being searchable prose. Split checks stop a wildcard result or filter match from being mistaken for proof about \`query_by\`.

### Should slug discovery always return zero results?

Only a slug-only token should return zero under the current live field list. If the same token appears in name, description, or author, the row may match through that search field. Fixtures need leak guards so the no-hit case proves field choice rather than token absence.

### Can author support both search and facets?

The schema marks author as fit for facets, and the text request includes author in \`query_by\`. However, \`searchSkills\` does not request author in its \`facet_by\` list or build an author filter. Tests should tell server skill from results exposed by this app function.

### Why use a wildcard query for taxonomy filters?

A wildcard lets the filter choose which test rows remain without help from text rank. It is right for a filter-hit case, but not for proving text field coverage. Token queries and wildcard filter queries should have distinct names, inputs, and target results.

### How often should the field matrix run?

Run fast request-shape checks on each related change and test-server cases in the live search job. Rerun both when the schema, query builder, response map, or Typesense version changes. That plan catches local code drift and changed server rules without the need for hand-run search.

## Conclusion

Typesense query field coverage testing needs isolated tokens, exact live inputs, text hits, and paired no-hit controls. It proves name, description, and author are searchable while slug and taxonomy stay outside free-text matching. Split filter, facet, sort, and response checks keep each field role clear.

Apply the matrix before changing either the schema or query builder. Browse [search testing skills](/skills), then run the field coverage procedure against a test collection and review each stray hit before release.`,
};
