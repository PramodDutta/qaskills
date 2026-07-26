import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Skill detail uuid slug tests',
  description:
    'skill detail uuid slug tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'skill detail uuid slug tests',
  keywords: [
    'skill detail uuid slug tests',
    'skill api uuid lookup',
    'skill slug fallback test',
    'dynamic route parameter testing',
    'skill detail 404 response',
    'uuid regex api branch',
  ],
  relatedSlugs: [
    'qaskills-cli-download-fallback-github-content-metadata',
    'testing-versioned-zip-artifact-sha256-etag',
    'api-testing-best-practices-guide',
    'skill-md-format-guide',
  ],
  sources: [
    'https://nextjs.org/docs/app/getting-started/layouts-and-pages',
    'https://www.rfc-editor.org/info/rfc9562',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/[id]/route.ts:UUID_REGEX and GET',
    'packages/web/src/app/api/skills/[id]/content/route.ts:UUID_REGEX and fallbackContent',
  ],
  content: `Skill detail uuid slug tests should send both identifiers through both GET handlers, capture whether the database filters by id or slug, and verify JSON or Markdown output. Include missing UUIDs, unknown slugs, database rejection, and the exact playwright-cli content fallback. Pass only when status, body, content type, query count, and selected field all agree.

The JSON contract is implemented in \`packages/web/src/app/api/skills/[id]/route.ts:UUID_REGEX and GET\`. The Markdown contract is implemented separately in \`packages/web/src/app/api/skills/[id]/content/route.ts:UUID_REGEX and fallbackContent\`, so neither endpoint can stand in for the other.

These tests concern route selection and output, not catalog ranking or author pages. Start from the [QA skills catalog](/skills) when choosing a real consumer fixture, then keep database state controlled inside automated cases.

## Skill detail uuid slug tests: What Must the Suite Prove?

Skill detail uuid slug tests must prove that a route parameter matching the local UUID pattern selects \`skills.id\`, while every other parameter selects \`skills.slug\`. They must then prove each handler's own success, missing-row, fallback, media-type, and exception behavior.

Both route files use the same case-insensitive expression with five hexadecimal groups. The pattern accepts eight, four, four, four, and twelve characters separated by hyphens. It checks shape only, without examining a UUID version or variant bit.

That detail matters because a UUID-shaped missing value never receives slug lookup as a second chance. The expression chooses the id predicate before querying, and zero rows lead straight to missing behavior. The word "fallback" in this contract means slug selection for a non-UUID parameter, not retrying both columns.

For the JSON route, a found row becomes a selected public object. A missing row returns \`{ error: 'Skill not found' }\` with 404, while a thrown query returns \`{ error: 'Failed to fetch skill' }\` with 500. The response media type remains JSON.

For the content route, a found row is passed to \`buildSkillMarkdown\` and returned as \`text/markdown; charset=utf-8\`. A missing row normally returns the same 404 text, but the exact slug \`playwright-cli\` may return stored fallback Markdown instead.

The content catch block checks that same fallback after an exception. Therefore a database rejection for \`playwright-cli\` can still return Markdown with 200, while another identifier returns JSON 500. This difference needs an explicit named case.

The [UUID specification record](https://www.rfc-editor.org/info/rfc9562) identifies RFC 9562 as the UUID standard. Use it to name standards-based fixtures, but use the repository expression as the authority for which text enters the QASkills id branch.

The [API testing guide](/blog/api-testing-best-practices-guide) gives broader response checks. This suite adds the exact query-selection proof required by these two handlers.

## Which QASkills Code Paths Own This Contract?

The JSON route owns one lookup and one projection. It awaits the dynamic \`params\` promise, derives \`isUuid\`, builds an equality predicate against either id or slug, limits the query to one row, and maps a found database record into an API object.

That projection intentionally changes \`authorName\` into \`author\` and exposes selected arrays, counters, flags, and timestamps. Skill detail uuid slug tests should use a representative row and assert a few renamed plus unchanged fields. A full schema snapshot is less useful than contract-focused values.

The content route repeats parameter classification and lookup, but it does not reuse the JSON handler. It passes a found row to \`buildSkillMarkdown\`, wraps the result with a Markdown content type, and reserves JSON for missing or failed cases without fallback content.

Its \`fallbackContent\` helper accepts only exact \`playwright-cli\`. Case changes, author prefixes, and UUIDs do not qualify. The helper calls \`readFallbackPlaywrightCliMarkdown\`, so tests should mock that boundary or use the checked-in fallback through a higher-level consumer check.

Neither route performs a second query when the first predicate returns no rows. Capture query count as one and predicate choice as part of the assertion. A test that checks only 404 cannot distinguish correct classification from an accidental query against the wrong column.

The Next.js [layouts and pages documentation](https://nextjs.org/docs/app/getting-started/layouts-and-pages) describes file-based routes and dynamic segments. Repository signatures add the relevant implementation fact here: each GET receives an object whose \`params\` value is awaited before lookup.

Keep CLI consumption separate from route ownership. The [CLI download fallback article](/blog/qaskills-cli-download-fallback-github-content-metadata) covers its broader source order, while this suite verifies what the content endpoint gives that consumer.

Use the [QASkills blog](/blog) to locate related API contracts, but cite these two route files in each expected-result table. That link between claim and owner keeps failures actionable.

## Skill api uuid lookup: Baseline Cases

A skill api uuid lookup baseline begins with one stored lower-case UUID and one stored slug. Return the same logical row for each case, but record the predicate input so the suite proves the selected column changes.

Use a valid shape such as \`123e4567-e89b-12d3-a456-426614174000\`. Then repeat with upper-case hexadecimal letters because the expression has the case-insensitive flag. Both values should enter the id branch, although the database controls whether either exact value exists.

Do not call every hyphenated string a UUID. A slug such as \`api-test-skill\` does not match the five fixed groups and therefore selects \`skills.slug\`. The test name should say "nonmatching parameter selects slug" rather than implying a second database attempt.

Add near-miss values with one missing hexadecimal character, an extra group, invalid \`g\`, or surrounding spaces. Every near miss selects slug under current code. There is no trimming or URL-decoding logic inside either handler after params arrives.

The found JSON case should assert status 200, parsed JSON, and projection. Check \`id\`, \`slug\`, \`author\`, \`fullDescription\`, and one array from the fixture. Also assert that internal database-only names do not replace the documented response names.

The found content case should assert exact Markdown text from the builder double and a content type containing \`text/markdown; charset=utf-8\`. It should not parse the body as JSON. This catches a handler that accidentally returns the detail object from the sibling route.

Use a single table of identifier fixtures across both endpoints, but keep output assertions endpoint-specific. Shared classification cases prevent pattern drift, while separate handlers preserve differences in body, fallback, and error text.

The [getting started guide](/getting-started) is a useful manual consumer path after API checks pass. It should not be used as the fixture source inside route unit tests.

## Skill slug fallback test: Test Matrix

A skill slug fallback test should make route classification visible alongside output. The rows below include the same missing shapes on both handlers, then call out the content-only fallback and exception difference.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Valid stored UUID | Matching UUID and one row | \`eq(skills.id, id)\` | JSON detail or Markdown content | One limited id query | Slug field selected |
| Valid slug | Nonmatching text and one row | \`eq(skills.slug, id)\` | JSON detail or Markdown content | One limited slug query | Id field selected |
| UUID-shaped value with no row | Matching UUID and zero rows | Id branch missing | JSON 404 on both handlers | No slug retry | Second query hides classification |
| Unknown slug | Nonmatching text and zero rows | Slug branch missing | JSON 404 unless exact content fallback | Fallback checked by content route | JSON detail route returns Markdown |
| Database rejection on JSON and content endpoints | Query throws | Each catch block | JSON 500, or fallback Markdown for playwright-cli content | One failed query | Error text or media type drifts |

The stored UUID row proves id selection with a positive result. Capture the field passed to \`eq\` through a Drizzle mock or inspect generated test SQL at an integration layer. Body success alone cannot establish the predicate.

The stored slug row proves the complementary branch. Keep its text far from UUID shape so fixture intent is obvious. The same row values allow response comparison without mixing classification and projection changes.

The UUID-shaped missing row is the most important negative case. Expect one id query and 404, not an id query followed by slug. If a product change adds two-stage lookup, it should update this test and document collision rules first.

The unknown slug row should use a value other than \`playwright-cli\` for the normal 404. Add a separate exact fallback row for the content handler, since merging them would conceal special behavior.

For database rejection, assert exact endpoint text. The detail route says "Failed to fetch skill," while the content route says "Failed to fetch skill content." Exception messages from the database are not returned.

Run the table against both handler modules in one suite if shared setup stays readable. Otherwise, use matching case names in two files and retain a small classification helper table in each.

Review the [artifact SHA and ETag testing article](/blog/testing-versioned-zip-artifact-sha256-etag) for other content integrity boundaries. Do not add those checks to this identifier suite unless the endpoint begins returning those headers.

## How Should Dynamic route parameter testing Be Exercised?

Dynamic route parameter testing should call the exported GET with a real Request-shaped object and a resolved params promise. This tests the same async boundary used by the route instead of calling a copied regex helper that production never exports.

Mock the database chain at its narrow seams: \`select\`, \`from\`, \`where\`, and \`limit\`. Capture the predicate in \`where\`, then return a row array from \`limit\`. Reset every mock before each parameterized case.

The following sketch emphasizes handler input, selected column, status, and body. The exact Drizzle column comparison depends on the project's test adapter, so the fixture records the received predicate and separately checks the endpoint result.

\`\`\`ts
import { expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

const limit = vi.fn();
const where = vi.fn(() => ({ limit }));
const from = vi.fn(() => ({ where }));
const select = vi.fn(() => ({ from }));

vi.mock('@/db', () => ({ db: { select } }));

test.each([
  ['123e4567-e89b-12d3-a456-426614174000', 'id'],
  ['playwright-e2e', 'slug'],
])('GET classifies %s as %s', async (id, expectedField) => {
  limit.mockResolvedValueOnce([]);
  const { GET } = await import('@/app/api/skills/[id]/route');

  const response = await GET(new NextRequest(\`http://local/api/skills/\${id}\`), {
    params: Promise.resolve({ id }),
  });

  expect(response.status).toBe(404);
  expect(where).toHaveBeenCalledTimes(1);
  expect(String(where.mock.calls[0][0])).toContain(expectedField);
  await expect(response.json()).resolves.toEqual({ error: 'Skill not found' });
});
\`\`\`

In a real suite, prefer an adapter that can identify the compared column reliably instead of depending on a generic string conversion. The key requirement is observable branch selection, not this sketch's exact mock representation.

Add a found row to verify the detail projection. Give \`authorName\` a distinct value, then assert response \`author\` equals it. This detects a direct-row response that would expose the wrong key.

For content, mock \`buildSkillMarkdown\` to return a short fixed document. Assert response text and content type, plus one call with the row object. Then return zero rows and confirm the builder is not called.

Keep a route integration test against a disposable database for one UUID and one slug. Unit doubles give precise branch proof, while the integration pair confirms Drizzle predicates work with actual column values.

The [API testing guide](/blog/api-testing-best-practices-guide) can help separate unit, integration, and browser roles. Avoid testing dynamic params only through a page because page output may hide which API predicate ran.

## Step-by-Step Skill detail 404 response Procedure

Skill detail 404 response coverage should reuse identifiers across the JSON and content handlers. This avoids a false comparison where one endpoint receives a UUID while the other receives an unrelated slug.

1. Create shared parameters for UUID, slug, UUID-shaped missing value, and unknown slug.
2. Invoke both detail and content routes while capturing the selected database predicate.
3. Assert not-found and database-error contracts plus content fallback behavior.
4. Run the CLI content fallback against the same slug fixture as a consumer check.

Step one should include one positive and one missing value for each selected column. Use labels that state both shape and expected field. Keep the special \`playwright-cli\` slug separate from the ordinary unknown slug.

Step two should reset the query chain between calls and assert one \`limit(1)\` operation. A shared stale mock can return the prior row and make a missing case pass incorrectly. The predicate capture should point to id for matching UUIDs and slug for all other strings.

Step three should compare exact status and error body. Both handlers return "Skill not found" for ordinary missing rows, but their 500 text differs. The content handler also changes body and media type when fallback Markdown exists.

Step four is a consumer check, not proof of database classification. Give the CLI the same content-route slug and assert it receives nonempty Markdown. Keep CLI source ordering assertions in its dedicated suite.

Record request parameter, selected field, row count, status, content type, and fallback call count in failures. These values are safe and sufficient for diagnosis. Avoid dumping a full skill body when a short hash or prefix can identify it.

After this sequence, browse [verified QA skills](/skills) and choose one known UUID plus slug pair for a staging smoke check. Do not make that live row the only automated fixture.

## Uuid regex api branch: Assertions and Diagnostics

Uuid regex api branch assertions should test matching and nonmatching boundaries without claiming semantic UUID validation. The local pattern accepts any hexadecimal values in its five group lengths, including values that a stricter validator might reject by version.

Include lower-case and upper-case hex, since the expression uses \`i\`. Include missing hyphens, braces, leading spaces, trailing spaces, short groups, long groups, and non-hex letters as slug-branch cases. Parameter labels should show the expected predicate.

The [RFC 9562 record](https://www.rfc-editor.org/info/rfc9562) gives the standards reference, but the endpoint does not call a standards parser. If requirements later demand version-aware validation, replace or wrap the expression and revise these expectations as an intentional contract change.

The content endpoint needs a direct fallback test. With zero rows for \`playwright-cli\`, mock the fallback reader to return Markdown and assert status 200 plus media type. With an unknown slug, assert 404 and no Markdown response.

\`\`\`ts
import { expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

const readFallbackPlaywrightCliMarkdown = vi.fn(() => '# Playwright CLI');
vi.mock('@/lib/fallback-skill-detail', () => ({ readFallbackPlaywrightCliMarkdown }));
vi.mock('@/db', () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    }),
  },
}));

test('content GET serves the exact slug fallback as Markdown', async () => {
  const { GET } = await import('@/app/api/skills/[id]/content/route');
  const response = await GET(new NextRequest('http://local/api/skills/playwright-cli/content'), {
    params: Promise.resolve({ id: 'playwright-cli' }),
  });

  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
  await expect(response.text()).resolves.toBe('# Playwright CLI');
  expect(readFallbackPlaywrightCliMarkdown).toHaveBeenCalledTimes(1);
});
\`\`\`

Add the database-rejection variant with the same exact slug. It should also use fallback content because catch calls \`fallbackContent(id)\`. An unknown slug under the same rejection should return JSON 500 and never claim a Markdown media type.

For the JSON route, assert no fallback reader is involved. The sibling handler imports no fallback helper, so \`playwright-cli\` with zero rows stays a 404 there. This endpoint difference is a feature of current code, not an inconsistency for the test to hide.

CI diagnostics should name handler, parameter, regex branch, predicate field, status, and media type. Those fields reveal most regressions without exposing full database rows or generated Markdown.

Use the [CLI fallback guide](/blog/qaskills-cli-download-fallback-github-content-metadata) for downstream recovery checks. Keep this report centered on the two route modules.

## What Regressions and Boundaries Prevent False Confidence?

A 200 response does not prove correct lookup selection. If a fixture database returns the same row for every predicate, the test can pass while UUIDs query slug. Make the double sensitive to the compared column or capture that column explicitly.

A 404 response also does not prove classification. Every wrong predicate can return zero rows. Pair each missing case with a query assertion and a positive neighbor using the same identifier class.

Do not describe slug selection as a retry. Current handlers make one predicate choice and one limited query. A two-column fallback could create ambiguous collisions, so any future change needs precedence tests before implementation.

Fallback Markdown must remain content-only and exact-slug-only. Test \`playwright-cli\`, a case variant, an unknown slug, and a UUID-shaped value. This prevents a broad fallback mock from making every content failure look healthy.

Error bodies are intentionally generic. Assert their exact public text and status, but do not require the original database message. Returning internal failure text would change the exposure boundary and should receive separate security review.

The handlers duplicate their UUID pattern, which creates drift risk. Matching parameter tables across both modules will catch one expression changing alone. A future shared helper could reduce duplication, but these tests should still verify both public handlers.

Builder correctness and fallback file contents are nearby contracts, not identifier contracts. Test one exact handoff here, then use the [skill artifact testing article](/blog/testing-versioned-zip-artifact-sha256-etag) for deeper content checks. This keeps failures narrow.

Keep each test row small and plain, with one known key and one known result. Use short ids and slugs that make the chosen path clear at a glance. When a row should fail, make just one part wrong and name that part. This helps the next person find the fault with less guesswork and less log noise.

Skill detail uuid slug tests should keep the same base row for both route files. Change only the key, row count, or thrown fault in each new case. Check the body type as soon as the status and chosen field are known. Then print a short safe label that tells which route and case ran.

Finally, run one real request through each route after schema or routing changes. The [QASkills blog](/blog) can link those results with other route checks, while unit cases retain the branch detail needed for repair.

Use one plain data sheet as the last pre-merge check. It should keep these facts close to the failed case so a maintainer can see what ran without reading a large trace. Skill detail uuid slug tests gain value when the report names both the chosen key and the final body type. That small record also makes old and new route runs easy to compare.

Keep fixture names short and clear. A known id should map to one row, while a known slug should map to the same row through a new key. A missing id and a missing slug should map to no row. The special content slug should map to fallback text only where the source says it can.

Use this compact release list after the main assertions:

- one lower-case UUID that finds a stored row by id
- one upper-case UUID that still takes the same id path
- one UUID-shaped value that finds no row and does not retry
- one plain slug that finds a stored row by slug
- one near-miss UUID that takes the slug path by design
- one unknown slug that returns the shared not-found JSON body
- one playwright-cli content request that uses fallback text after no rows
- one other content request that does not gain that special fallback
- one detail query fault that returns the detail route error text
- one content query fault that returns its own content error text
- one found detail body with the public author field name
- one found content body with the exact Markdown response type

## Frequently Asked Questions

### How do skill detail uuid slug tests prove UUID detection?

Send matching and near-miss parameters through the exported GET, then capture the database predicate. A matching five-group hexadecimal value must select the id column, while every near miss selects slug. Also assert one query, because a hidden second lookup would change the current route contract.

### What belongs in a skill api uuid lookup fixture?

Include a stored UUID, an upper-case matching UUID, a UUID-shaped missing value, and several shape near misses. Give the stored row distinct id, slug, and author values. The suite should assert selected column, query count, response projection, status, and endpoint-specific media type.

### Does a skill slug fallback test retry after a missing UUID?

No. The current handlers choose id when the parameter matches the expression and slug otherwise. They issue one limited query and do not retry another column. A UUID-shaped value with no id row therefore returns 404, even if identical text could exist in a slug field.

### How should dynamic route parameter testing pass params?

Call the exported handler with its Request argument and an object whose \`params\` is a resolved promise containing \`id\`. This follows the route signature and exercises the awaited parameter boundary. Avoid testing only a copied regular expression because that can drift from production code.

### What is the expected skill detail 404 response?

Both handlers return status 404 with JSON \`{ error: 'Skill not found' }\` for ordinary missing rows. The content handler first checks the exact \`playwright-cli\` fallback and may return Markdown instead. The JSON detail handler has no matching fallback and remains a 404.

### What does the uuid regex api branch not validate?

It does not inspect UUID version, variant, provenance, or database existence. It checks only five hexadecimal group lengths with hyphens and ignores letter case. Tests should call this route classification, not full UUID validation, unless the implementation later adopts stricter semantic checks.

## Conclusion

Skill detail uuid slug tests should pair every response assertion with predicate evidence. Cover stored and missing UUIDs, normal and special slugs, both media types, exact error text, one-query behavior, and content fallback after zero rows or a thrown query.

[Browse verified QA skills](/skills), select a catalog skill, and add UUID, slug, missing, and database-error cases to both detail endpoints. Then compare the result with the [API testing guide](/blog/api-testing-best-practices-guide) before merging route changes.`,
};
