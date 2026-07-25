import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'PostgreSQL JSONB Filter Testing',
  description:
    'PostgreSQL JSONB filter testing verifies containment, multi-select OR logic, cross-filter AND logic, escaped values, counts, and Drizzle SQL behavior.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'PostgreSQL JSONB filter testing',
  keywords: [
    'PostgreSQL JSONB filter testing',
    'PostgreSQL JSONB containment',
    'Drizzle sql filter test',
    'JSONB array multiselect',
    'OR within facet filter',
    'AND across facet filters',
    'JSONB filter count assertion',
    'skills API integration test',
  ],
  relatedSlugs: [
    'testing-lazy-neon-database-initialization-nextjs-build',
    'testing-typesense-multiselect-facet-filter-queries',
    'testing-leaderboard-cache-filter-isolation-ranking-consistency',
    'testing-versioned-zip-artifact-sha256-etag',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/functions-json.html',
    'https://orm.drizzle.team/docs/operators',
    'https://orm.drizzle.team/docs/sql',
  ],
  content: `
PostgreSQL JSONB filter testing seeds skills with overlapping metadata arrays, calls the listing API with repeated facet parameters, and compares slugs, totals, and order. Prove one-value containment, OR rules inside each facet, AND rules across facet groups, empty input, quoted values, count parity, pagination, and stable sorting through real Drizzle queries.

QASkills stores testing types, frameworks, languages, domains, and agents as JSONB arrays. Its GET skills route builds one containment check for each selected value. It groups checks for the same field with \`or()\`, combines field groups with \`and()\`, and reuses that final condition for both the row query and count query.

## How Does PostgreSQL JSONB Containment Work?

PostgreSQL JSONB containment uses the \`@>\` operator to ask whether the value on the left contains the JSON value on the right. For a metadata array, \`["playwright","cypress"] @> ["playwright"]\` is true. Reversing the operands asks a different question and should fail the focused test.

The official [PostgreSQL JSON functions and operators reference](https://www.postgresql.org/docs/current/functions-json.html) defines \`@>\` and the related JSONB operators. Keep that rule visible in the test name because developers often read containment like a text substring or SQL \`IN\` expression. It compares JSON structure instead.

QASkills converts each selected value into a one-item JSON array with \`JSON.stringify([value])\`, then casts the bound value to \`jsonb\`. The column stays on the left. A direct database case should prove one row with the value matches and one row without it does not.

\`\`\`sql
SELECT slug
FROM skills
WHERE frameworks @> '["playwright"]'::jsonb
ORDER BY slug;
\`\`\`

Use arrays with extra values in the matching row. If every Playwright row contains only Playwright, the fixture cannot prove containment allows a superset. Add one row with both Playwright and Cypress, then expect it to match the one-value right side.

All six catalog array columns are non-null JSONB fields with empty-array defaults. Include an inserted row that relies on those defaults, then read it back before filtering. This proves the database stores an array value instead of SQL null or a missing JSON field.

Tags share the same storage type but are not exposed as a list filter in this route. Keep tags out of the request matrix unless the API adds that parameter. A schema-level check can still confirm its default without claiming public filter support.

PostgreSQL JSONB filter testing should also distinguish exact text values. \`"playwright"\` and \`"Playwright"\` are different JSON strings under this operator. If the product wants case folding or aliases, normalize values before storage and query rather than claiming JSONB containment supplies it.

The [database testing automation guide](/blog/database-testing-automation-guide) explains broader schema and data checks. This tutorial stays on one query contract that powers the [QASkills directory](/skills). A small, clear fixture gives more useful evidence than a copy of the full production catalog.

## How Do You Build a Drizzle sql Filter Test?

A Drizzle sql filter test should inspect behavior through the tagged template or execute the generated condition against PostgreSQL. QASkills writes \`sql\`\${skills.frameworks} @> \${JSON.stringify([value])}::jsonb\`\`, which keeps the selected value in a bound parameter rather than merging it into raw SQL text.

The [Drizzle SQL template documentation](https://orm.drizzle.team/docs/sql) explains how table columns and dynamic values are mapped into a parameterized query. That distinction matters for quoted metadata. A test should verify results for a value containing a quote, not just search a rendered SQL string for the quote.

Keep one small unit around query composition if the route exposes a helper. The current route builds conditions inside GET, so an integration case is often clearer than mocking every Drizzle chain. Seed rows, send a real \`NextRequest\`, and assert the public response.

\`\`\`ts
const fixture = [
  {
    slug: 'pw-ts-web',
    testingTypes: ['e2e'],
    frameworks: ['playwright'],
    languages: ['typescript'],
    domains: ['web'],
    agents: ['claude-code'],
  },
  {
    slug: 'pw-cy-js-web',
    testingTypes: ['e2e', 'visual'],
    frameworks: ['playwright', 'cypress'],
    languages: ['javascript'],
    domains: ['web'],
    agents: ['codex'],
  },
  {
    slug: 'cy-ts-api',
    testingTypes: ['api'],
    frameworks: ['cypress'],
    languages: ['typescript'],
    domains: ['api'],
    agents: ['claude-code'],
  },
];
\`\`\`

Add all required skill columns when inserting the fixture, but keep expected metadata near the test in a compact builder. The production schema has defaults for several counters and flags, while names, slugs, descriptions, authors, and metadata still need valid values.

PostgreSQL JSONB filter testing should run in a transaction or isolated schema when the driver supports it. If the route uses a separate connection that cannot see the test transaction, use unique slugs and explicit cleanup. Never let a shared row alter another test's total.

The schema generates UUID primary keys and requires unique slugs. Let the database create IDs, return them from the insert, and retain them for cleanup. This avoids hard-coded UUID conflicts when two jobs use the same short fixture names.

Set both creation and update times when order is part of the case. Relying on \`defaultNow()\` can give several rows the same timestamp during one bulk insert. Fixed times make newest order plain and keep test output easy to review.

The [Drizzle operator guide](https://orm.drizzle.team/docs/operators) describes \`and\`, \`or\`, comparisons, and common predicates. QASkills mixes those helpers with a custom JSONB fragment. Tests should verify the combined outcome rather than assuming each helper guarantees the product rule.

## How Do You Seed a JSONB Array Multiselect Matrix?

A JSONB array multiselect matrix needs overlap along every tested axis. Three rows are enough for a simple case, but six to eight rows make same-facet and cross-facet rules clearer. Each value should appear alone, with a partner, and in a row that fails another selected facet.

Name fixture slugs after their traits, such as \`pw-ts-web\` or \`cy-js-api\`. These names make a failed list easy to read without printing full rows. Keep user-facing names realistic because text search may be added to the same request.

The matrix should include one skill with an empty optional array. It should also include one with two values in two fields. This reveals code that compares arrays for equality or assumes only one stored value.

| Slug | Frameworks | Languages | Domains | Purpose |
| --- | --- | --- | --- | --- |
| \`pw-ts-web\` | playwright | typescript | web | Single-value baseline |
| \`pw-cy-js-web\` | playwright, cypress | javascript | web | Superset containment |
| \`cy-ts-api\` | cypress | typescript | api | Same-facet alternative |
| \`jest-js-web\` | jest | javascript | web | Non-matching control |
| \`pw-ts-mobile\` | playwright | typescript | mobile | Cross-facet rejection |
| \`none-ts-web\` | empty | typescript | web | Empty-array control |

Use an insert helper that returns generated IDs so cleanup can target exact rows. Do not delete by a common framework value, since that can remove data created by another test. A random run prefix on each slug works well when cases execute in parallel.

PostgreSQL JSONB filter testing also needs deterministic metric values. Set weekly installs, total installs, quality score, and creation times so every supported sort has a known order. Equal primary sort values should be resolved by the route's descending ID tie-breaker.

Keep the fixture under source control and small enough to review. A production dump adds private data, changes over time, and makes expected totals hard to explain. The [API testing complete guide](/blog/api-testing-complete-guide) offers more fixture design patterns for route-level checks.

## Why Use OR Within Facet Filter Groups?

OR within facet filter groups lets a user select Playwright or Cypress without requiring one row to match two separate one-item checks. QASkills maps repeated \`framework\` parameters into several \`@>\` expressions, then passes them to \`or(...frameworkConditions)\`.

Send \`?framework=playwright&framework=cypress\` against the matrix and expect every row containing either value, including the row storing both. Do not expect Jest or the empty framework row.

The test should include each single filter before the combined case. If Playwright alone is wrong, a combined result cannot show whether OR grouping caused the fault. A three-row expectation table makes this easy to diagnose.

\`\`\`ts
it.each([
  ['framework=playwright', ['pw-cy-js-web', 'pw-ts-mobile', 'pw-ts-web']],
  ['framework=cypress', ['cy-ts-api', 'pw-cy-js-web']],
  [
    'framework=playwright&framework=cypress',
    ['cy-ts-api', 'pw-cy-js-web', 'pw-ts-mobile', 'pw-ts-web'],
  ],
])('filters %s', async (query, expectedSlugs) => {
  const response = await GET(
    new NextRequest(\`http://test.local/api/skills?\${query}&sort=newest&limit=20\`),
  );
  const body = await response.json();

  expect(body.skills.map((skill: { slug: string }) => skill.slug).sort()).toEqual(
    expectedSlugs,
  );
  expect(body.total).toBe(expectedSlugs.length);
});
\`\`\`

The exact API parameter is singular, \`framework\`, even though the stored field is \`frameworks\`. Include that mapping in the route test. A client that sends \`frameworks\` will get an unfiltered response because the route does not read that name.

PostgreSQL JSONB filter testing should repeat the OR case for at least one other field, such as language or agent. This guards against a copy error where one condition block uses \`and\` or points to the wrong column.

Repeated parameters preserve their URL order through \`searchParams.getAll()\`, so send both value orders and compare their result sets. Membership should stay equal even if the generated condition order changes.

Keep duplicate selections in one defensive case, such as Playwright twice. The route currently creates two equal predicates joined by OR, which should not duplicate rows. Record that outcome before deciding whether clients or the server should remove duplicate values.

When no values are present, the route leaves that facet out of the condition list. Empty URL parameters still appear as values, so define whether \`?framework=\` should be ignored or treated as an empty string. The current code treats it as a selected empty string and will usually return no match.

## Why Use AND Across Facet Filters?

AND across facet filters makes each selected category narrow the result. A request for Playwright and TypeScript should return rows that meet both field groups. It should not return a Playwright JavaScript row or a Cypress TypeScript row.

QASkills gathers one condition per non-empty facet group, then calls \`and(...conditions)\`. Text search, when present, is another group in the same AND list. This means a skill must satisfy the search term and each selected facet category.

Test one same-facet OR group inside a cross-facet AND request. For example, choose Playwright or Cypress for framework, then choose TypeScript for language and web for domain. The expected set proves both nesting levels at once.

Text search uses case-insensitive \`ilike\` against skill name and description, with percent marks around the query. Add one filter case where only the name matches and another where only the description matches. Both still need to pass every selected JSONB facet.

This text rule is separate from exact JSON string containment. A lowercase search term may find an uppercase name, while a lowercase framework value will not match an uppercase JSON item. One paired test makes that difference clear to maintainers.

PostgreSQL JSONB filter testing should include a zero-result combination that is valid. A valid empty result must return an empty skills array, total zero, current page, and zero total pages. It should not be confused with the route's catch fallback, which returns a similar shape after a database error.

That similarity is a reason to keep direct database checks or test logs. The current GET catch does not expose the error and returns an empty success body. A malformed query could look like a valid no-match case unless the test also watches database errors or exercises the predicate directly.

Use the [offset pagination regression guide](/blog/testing-offset-pagination-duplicate-records) when the result spans pages. Cross-facet filters must apply to both page rows and total count before stable page math can be trusted.

AND behavior should remain explicit in interface copy. If a future design allows "match any selected category," it needs a new query contract and tests. Do not change the grouping to satisfy one UI example without updating the public rule.

## Add a JSONB Filter Count Assertion

A JSONB filter count assertion compares the API's \`total\` with an independent expected set for the same filters. QASkills applies the same \`whereClause\` to the row select and \`count(*)\` select, which should keep totals aligned even when a page limit hides some rows.

Use a result with more matches than the page limit. Request page one with limit two, expect two skills, and expect a larger total. Then request the last page and verify the same total plus the remaining rows.

Do not calculate expected total from \`body.skills.length\`. That repeats the route's page view and cannot catch a missing condition in the count query. Derive expected slugs from the controlled fixture, then compare count and union of all returned pages.

\`\`\`ts
const first = await requestSkills(
  'framework=playwright&language=typescript&page=1&limit=2&sort=newest',
);
const second = await requestSkills(
  'framework=playwright&language=typescript&page=2&limit=2&sort=newest',
);

expect(first.skills).toHaveLength(2);
expect(first.total).toBe(3);
expect(first.totalPages).toBe(2);
expect(second.total).toBe(3);
expect(
  new Set([...first.skills, ...second.skills].map((skill) => skill.slug)),
).toEqual(new Set(['pw-ts-mobile', 'pw-ts-web', 'pw-ts-visual']));
\`\`\`

PostgreSQL JSONB filter testing should cover total pages when total is zero and when total divides evenly by limit. Those edge cases catch off-by-one math around \`Math.ceil(total / limit)\`.

Use stable order for page checks. The skills route appends descending ID after the selected sort, so equal metrics still have a fixed database order. Seed IDs or creation order in a known way, then assert both membership and sequence.

A PostgreSQL count may reach JavaScript as a driver-specific numeric shape, so the route calls \`Number()\` on the first count value. Include a mock-level case for a string count only if the driver can return one. The public total must remain a number in every successful response.

Check that total pages uses the clamped limit rather than the raw query text. A request with limit zero becomes one, while a value above one hundred becomes one hundred. Expected page math should use the same approved bounds.

A count mismatch is a release blocker for filter pages because users may see empty later pages or missing navigation. The [database testing guide](/blog/database-testing-automation-guide) can extend this check to indexes and query plans once functional results pass.

## Create a Skills API Integration Test

A skills API integration test invokes the real GET handler with a test database and realistic URL parameters. It should avoid mocking Drizzle query chains because those mocks can pass while the generated PostgreSQL syntax is invalid. Use a dedicated database, schema, or disposable branch.

Begin with an unfiltered baseline scoped to your fixture. If the database contains other rows, add a unique text query that all fixture descriptions share, or isolate the schema. Expected totals must not depend on unrelated seed content.

Cover parameter limits as well as filters. Page values below one become one, limits are clamped from one to one hundred, and sort labels map to weekly installs, total installs, quality, or creation time. These route rules affect which filtered rows appear.

The integration suite should verify public projection because skill rows return author, scores, arrays, flags, and an ISO creation date. Internal columns and full Markdown should not appear in the list response, even when those database values are populated for detail pages under the same route contract used by public clients.

PostgreSQL JSONB filter testing needs one value with a quote, such as \`browser"edge\`, inserted into a test metadata array. Send the URL-encoded value and expect a match. Because Drizzle binds the JSON string, the quote should remain data rather than alter SQL.

Run this suite after database migrations in CI. A schema change from JSONB arrays to another type should fail the test at the same pull request. Pair it with the [Playwright CLI skill](/skills/Pramod/playwright-cli) for a final browser check of selected filter chips and visible skill cards.

Keep cleanup in a \`finally\` block and report leaked rows as a test failure. Reliable cleanup protects later counts. It also lets the same suite run many times against one short-lived database without manual repair.

## Run the PostgreSQL JSONB Filter Testing Procedure

Run the matrix from one predicate to full route behavior. This order tells the team whether a failure comes from JSONB semantics, Drizzle composition, HTTP parsing, count logic, or presentation. Capture the PostgreSQL and Drizzle versions with integration evidence.

1. Create an isolated database scope and insert the overlapping JSONB fixture with fixed sort metrics.
2. Prove one-item \`@>\` containment for a row that stores one value and a row that stores several.
3. Send each single repeated parameter and compare the complete expected slug set.
4. Send two values within one facet and verify OR membership, including the row containing both.
5. Add values from other facets and verify the nested AND rule plus one valid zero-result case.
6. Test quoted metadata through a URL-encoded parameter and the parameterized Drizzle fragment.
7. Page a result larger than the limit, then compare totals, total pages, order, and the union of rows.
8. Run the same filters through the public page with browser automation and compare selected controls.
9. Delete fixture rows by generated ID and fail the run if cleanup leaves any row behind.

PostgreSQL JSONB filter testing should print stable expected and actual slug lists beside the URL query and selected sort. Avoid dumping connection strings or full row content in CI output.

If only the browser case fails, inspect URL parameter names and client state. If route membership fails but direct containment passes, inspect grouping and request parsing. If direct containment fails, inspect fixture types, casts, and the active PostgreSQL schema.

Run the fast route cases for every change to the skills API. Run the browser flow when filters, URL state, or result cards change. A short nightly database job can also detect changes caused by dependency or database upgrades.

## Keep JSONB Filter Rules Explicit

PostgreSQL JSONB filter testing gives the skills directory a clear rule: alternatives within one facet, required matches across different facets, one shared predicate for rows and counts, and stable order for pagination. It also proves selected values remain data when Drizzle builds each JSONB condition.

Keep the compact fixture beside the API tests and review it when new facets appear. Browse more QA automation patterns in the [QASkills skills directory](/skills), then use the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) to check the same filters through the public interface.

For the next layer, combine this work with the [API testing guide](/blog/api-testing-complete-guide) and [pagination stability guide](/blog/testing-offset-pagination-duplicate-records). Those checks keep predicate logic, response contracts, and page navigation separate while still covering one user task.

## Frequently Asked Questions

### Does JSONB containment match part of a string?

No. The \`@>\` operator compares JSON structure and values, not text substrings. A one-item array on the right matches a left array that contains that exact item. Case differences and partial words remain different JSON strings unless the application normalizes them first.

### Why not store each facet in a join table?

Both designs can work. JSONB arrays keep the current catalog row compact and make containment checks direct. Join tables may offer other constraints and query plans at larger scale. Tests should protect the active contract, while performance evidence and data rules guide any future migration.

### Is JSON.stringify enough to stop SQL injection?

JSON encoding alone is not the full boundary. In QASkills, the encoded value is passed through Drizzle's tagged SQL template as a bound parameter, then cast to JSONB. Test quoted inputs through the real driver and avoid replacing the parameter with raw SQL interpolation.

### Why can a valid empty result hide a query error?

The current skills GET route catches database failures and returns an empty result shape. That resembles a valid filter with no matches. Direct predicate tests, database error observation, and known-match integration cases help distinguish a real zero from a swallowed database failure.

### How many rows does the fixture need?

Use the smallest set that proves overlap, non-match, empty arrays, same-facet alternatives, and cross-facet rejection. Six to eight rows usually provide clear contrast for this focused route suite. Every expected set should be readable from the fixture without querying an outside catalog.

### When should PostgreSQL JSONB filter testing run?

Run route and predicate cases on each API or schema change. Run them after Drizzle and PostgreSQL upgrades, before release, and when a new facet is added. Keep one browser check for URL parameters, selected controls, count labels, and visible cards.
`,
};
