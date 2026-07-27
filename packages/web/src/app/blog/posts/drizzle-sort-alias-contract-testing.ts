import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Drizzle sort alias contract testing',
  description:
    'Use Drizzle sort alias contract testing to prove each public sort value selects the expected column and unknown values fall back to trending.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Drizzle sort alias contract testing',
  keywords: [
    'Drizzle sort alias contract testing',
    'API sort parameter contract',
    'Drizzle order by mapping test',
    'unknown sort fallback testing',
    'popular alias regression test',
    'highest quality sort API',
  ],
  relatedSlugs: [
    'database-testing-automation-guide',
    'postgres-migration-testing-guide',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'testing-lazy-neon-database-initialization-nextjs-build',
  ],
  sources: [
    'https://orm.drizzle.team/docs/select',
    'https://www.postgresql.org/docs/current/queries-order.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  content: `Drizzle sort alias contract testing proves each public sort string selects the intended descending column by seeding skills whose metrics demand different orders. Compare newest, quality, highest_quality, popular, most_installed, and trending, then send missing, empty, unknown, and case-variant values. Every case must also verify the descending ID tie-breaker.

The fixture design is more important than a large row count. If created time, quality, total installs, and weekly installs all rank rows identically, every alias can map to the wrong column while tests still pass. Contradictory metrics make each branch observable.

The switch appears in \`packages/web/src/app/api/skills/route.ts\`. Sort fields are declared in \`packages/web/src/db/schema/skills.ts\`, and the route appends \`desc(skills.id)\` after its primary order. The separate search schema in \`packages/shared/src/schemas/skill-schema.ts\` accepts a narrower alias set, so tests must identify which boundary they exercise.

Open the sortable [skills directory](/skills) to see the consumer, then verify the HTTP contract with owned store rows. The [PostgreSQL filter testing guide](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) covers multiselect conditions, while this suite isolates ordering.

## What Must Drizzle Sort Alias Contract Testing Prove?

Drizzle sort alias contract testing must prove accepted strings, alias equivalence, primary columns, descending direction, unique ID tie handling, pagination stability, and default behavior. It should also distinguish route aliases from values accepted by other schemas. One generic sorted assertion cannot cover those dimensions.

The route maps newest to creation time. It maps quality and highest_quality to quality score. It maps popular and most_installed to total install count. Trending, a missing value, and every unrecognized value use weekly installs.

Every primary expression is descending. The query then adds ID descending as a second order expression. This unique tiebreaker provides deterministic ordering when several rows share the primary metric and supports stable offset pagination for unchanged data.

The query string is case sensitive because the switch compares raw strings. \`Popular\`, \`QUALITY\`, and values with spaces do not match their lowercase cases. They enter the default trending branch rather than returning validation errors.

An empty sort value also becomes trending before the switch. \`searchParams.get('sort') || 'trending'\` treats an empty string as false. A missing parameter follows the same path, while an unknown nonempty value reaches the switch default.

The shared \`skillSearchSchema\` lists trending, most_installed, newest, and highest_quality. It does not list quality or popular, yet the HTTP GET route accepts those aliases because it reads search parameters directly. Do not claim the shared schema validates this route.

The result payload does not echo the selected sort. Tests infer branch selection from ordered IDs. Add the requested value to assertion names and diagnostics so a failure identifies the input that produced the sequence.

Use the [data testing guide](/blog/database-testing-automation-guide) for owned fixtures and the [Postgres migration guide](/blog/postgres-migration-testing-guide) when sort-column types change. This article keeps the public-to-column mapping as its release gate.

Start with a one-page data set and write the planned first and last ID for each sort before the route is called. Keep all other query fields the same, so the sort value is the sole cause that can move a row. When one case fails, print the four main metrics for the rows that swapped places. This short view tells the team which field won without the noise of a full row or SQL trace.

## How Do You Test the API Sort Parameter Contract?

An API sort parameter contract test sends one request for every documented alias plus missing, empty, unknown, and case-variant controls. It compares the complete ordered ID sequence for a small fixed page. The expected sequence must come from fixture values, not a previous API response.

Seed four or five skills with conflicting metrics. Give skill A the newest timestamp, skill B the highest quality, skill C the most total installs, and skill D the most weekly installs. Add ties so the ID expression also receives coverage.

Use \`page=1&limit=10\` to include the whole controlled fixture when the store is isolated. In a shared store, filter by a unique query or taxonomy value supported by the route, then verify the filter itself does not alter intended metrics.

The route text query checks name and description with case-insensitive matching. A run-specific token in every fixture description can isolate rows without modifying sort behavior. Ensure unrelated rows cannot contain that generated token.

Build a table of input and expected order before sending requests. The HTTP test below assumes helper functions insert rows and derive expected IDs directly from the fixture definitions.

\`\`\`ts
import { expect, test } from 'vitest';

const cases = [
  ['newest', 'createdAt'],
  ['quality', 'qualityScore'],
  ['highest_quality', 'qualityScore'],
  ['popular', 'installCount'],
  ['most_installed', 'installCount'],
  ['trending', 'weeklyInstalls'],
] as const;

test.each(cases)('%s maps to %s descending', async (sort, field) => {
  const expectedIds = orderFixtureIds(fixtures, field);
  const url = new URL('/api/skills', baseUrl);
  url.searchParams.set('q', runToken);
  url.searchParams.set('sort', sort);
  url.searchParams.set('limit', '10');

  const response = await fetch(url);
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.skills.map(({ id }: { id: string }) => id)).toEqual(expectedIds);
});
\`\`\`

The helper should sort by the named primary field descending and then ID descending. Do not use one expected list for both quality aliases unless it was calculated from quality values. Alias equality is an additional assertion, not a substitute for column correctness.

Add response metadata checks for total, page, and total pages after order passes. These values ensure the route did not drop fixtures during filtering. Keep them separate from alias diagnosis so count failures do not conceal a mapping diff.

Browse [API testing skills](/categories/api-testing) for parameterized request patterns. The [skills directory](/skills) remains a useful manual check, but its visible names alone cannot prove every query value reaches the intended Drizzle expression.

Build each URL from one clean base and add the sort value last, with a mode that can omit the key for the no-input case. Save the final URL in the report after any secret or host data is made safe. Check total and page first, then compare IDs in the order returned. The API sort parameter contract is easier to debug when set size, input, and order each have their own clear check.

## What Is a Drizzle Order By Mapping Test?

A Drizzle order by mapping test gives each sortable field a different winner and inspects the IDs returned by the real query. It verifies generated SQL behavior through results rather than matching implementation text alone. A small source assertion can complement this test but should not replace it.

Create four anchor rows. Alpha is newest but has low quality and usage. Bravo has highest quality but an old timestamp. Charlie has highest total installs but low weekly activity, while Delta has highest weekly installs but modest totals.

Assign middle values so the full sequence also differs, not only the first item. A branch mapped incorrectly may still share one winner by accident. Complete ID order gives stronger evidence with little additional fixture cost.

Add two rows tied on every primary metric but with different UUIDs. For each alias, the lexicographically larger UUID should appear first because the route applies descending ID. Use fixed valid UUIDs whose order is visually obvious.

The schema stores quality score, install count, and weekly installs as integers, while creation time is a timestamp. Expected-order helpers should compare timestamp values numerically and strings only for UUID tie order. Avoid locale date parsing.

The official [Drizzle select documentation](https://orm.drizzle.team/docs/select) shows multiple expressions passed to \`orderBy\`. Repository code supplies the actual expressions and sequence. Tests should treat both expressions as one ordering contract.

Run the mapping test against PostgreSQL because text collation and timestamp behavior belong to that layer. A mocked query builder can confirm method calls, but it cannot prove returned row order or pagination across ties.

Drizzle sort alias contract testing should include the generated request URL and ordered fixture metrics on failure. Use the [lazy Neon initialization guide](/blog/testing-lazy-neon-database-initialization-nextjs-build) if test startup concerns obscure the query, but keep connection initialization outside alias expectations.

Give each anchor row one clear field win and one clear field loss, then list the full planned order for all four sort fields. The rows should not all rise or fall as one set. Add two fixed IDs for the tie check only after each main field map passes. This plan keeps a bad column map from looking like a tie fault and keeps a tie fault from hiding the main branch.

## Unknown Sort Fallback Testing

Unknown sort fallback testing proves unrecognized nonempty values use weekly installs descending and ID descending. It should compare their returned sequence with the explicit trending request. A successful response alone does not reveal which default branch ran.

Send a value unlikely to become a future alias, such as \`not_a_sort\`. Assert its IDs equal independently calculated weekly order, then assert they equal the explicit trending IDs. If a future feature adopts that name, update the control intentionally.

Add case variants such as \`Newest\`, \`POPULAR\`, and \`Highest_Quality\`. The current switch performs no lowercasing, so each uses trending. These cases document case sensitivity without claiming it is the ideal API design.

Leading and trailing spaces also remain part of the value after URL decoding. \`%20newest\` and \`newest%20\` should enter the fallback. Avoid client libraries that trim values before constructing the request, or the test will exercise client normalization instead.

Missing and empty values reach trending through the earlier \`||\` expression. Test both because their control flow differs from an unknown nonempty value. Their output should still match the same weekly and ID order.

The route does not return status 400 for these values. If product requirements later demand strict validation, change the expected status and shared boundary together. Current tests should preserve source behavior rather than invent an error contract.

Use a fixture where weekly order differs from created, quality, and total-install order. Otherwise every fallback case can pass without proving the default selected weekly installs.

Drizzle sort alias contract testing should place unknown controls near the explicit trending case. The [API testing guide](/blog/api-testing-complete-guide) offers negative parameter patterns, while this test asserts the repository's particular fallback sequence.

Name each fallback case with the raw value sent on the wire, including blank, mixed case, and space when those facts drive the branch. Compare each result with a weekly-based list made from seed data before comparing it with trending. If the two checks disagree, show both expected lists and the raw input. Unknown sort fallback testing should prove the chosen field, not just that two calls happened to match.

## How Do You Build a Popular Alias Regression Test?

A popular alias regression test proves popular and most_installed produce the same IDs in the same order and that both orders follow install count. Comparing only the pair can miss a shared mapping to the wrong field. Include an independent install-based expectation.

Seed Charlie with the largest install count but low weekly installs and an old timestamp. Seed Delta with the largest weekly count but smaller total installs. This pair fails clearly if popular accidentally moves to trending.

Give two rows equal install counts and different IDs. Both aliases should resolve that tie by descending ID. Alias equality above the tie is not enough because one branch could omit the second expression after a refactor.

Send identical page, limit, text query, and taxonomy filters for both aliases. If other parameters differ, equal or unequal output may come from filtering rather than sort mapping. Build URLs from one helper that changes only sort.

Assert each response contains the same total and page metadata. Then compare IDs with expected install order and with each other. These three checks cover data set, column mapping, and alias equivalence.

The HTTP route recognizes popular even though \`skillSearchSchema\` does not. If an SDK validates against that shared schema before requesting the route, it may never send popular. Keep SDK validation tests separate from the raw route contract.

Review the [skills directory](/skills) consumer before removing an alias. A query value may be used by a page even when a shared schema omits it. Search source call sites and preserve compatibility evidence in the change.

Drizzle sort alias contract testing should report both alias names, primary values, and final IDs. A pairwise diff then shows whether one route case changed or the fixture failed to isolate install count.

Keep popular and most_installed in adjacent rows of the case table, but run each against its own saved install-based list. Then compare their bodies after volatile fields are removed or checked by shape. Use a tied install pair with fixed IDs to test the last sort key in both calls. A popular alias regression test needs all three checks because pair match, field map, and tie order can fail on their own.

## Highest Quality Sort API Aliases

Highest quality sort API behavior gives quality and highest_quality the same descending quality score order. Both should ignore total installs, weekly installs, and creation time except where fixture filters decide row membership. ID resolves equal quality scores.

Seed Bravo with the highest quality and deliberately low usage. Seed another row with the largest install metrics but lower quality. The quality aliases should place Bravo first, while popular and trending should not.

Create an equal-quality pair with fixed IDs. Assert the larger ID leads under both aliases. This guards the secondary order and makes offset pages stable for unchanged rows.

Compare complete sequences against an independently sorted quality list. Then compare quality with highest_quality directly. As with popular, alias equality alone cannot prove both selected the right column.

The shared search schema accepts highest_quality but not quality. The route accepts both because its switch reads the raw string. Name test suites by boundary, such as \`skills route aliases\` and \`shared search input\`, to prevent contradictory expectations.

Quality score defaults to zero in the table schema. Include zero and nonzero rows so default-heavy data does not mask direction. Negative values are not prohibited by this column definition, but test them only if the product allows such records.

Use the [data testing guide](/blog/database-testing-automation-guide) to build explicit row values. The [Postgres migration guide](/blog/postgres-migration-testing-guide) becomes relevant if quality score type, default, or constraints change.

Drizzle sort alias contract testing should avoid wording that equates quality with subjective value. The test checks a stored integer and a public alias, not how that score is calculated during publishing.

Give the top quality row few installs and an old time, then give the top install row a low score and a newer time. This cross makes the winning field plain even in a short log. Keep one zero score and one tied score pair to cover common stored values. The highest quality sort API cases should name the score field in their output so no reader mistakes them for checks of score rules.

## Sort Value, Column, Alias, and Fallback Matrix

The matrix below is the route contract derived from its switch and final \`orderBy\` call. Every row uses descending ID after the primary column. Fallback means the value selects weekly installs rather than returning a validation error.

| sort input | Primary column | Direction | Equivalent alias | Tie column | Fallback |
|---|---|---|---|---|---|
| newest | createdAt | Descending | None | id descending | No |
| quality | qualityScore | Descending | highest_quality | id descending | No |
| highest_quality | qualityScore | Descending | quality | id descending | No |
| popular | installCount | Descending | most_installed | id descending | No |
| most_installed | installCount | Descending | popular | id descending | No |
| trending | weeklyInstalls | Descending | Missing sort | id descending | Default |
| missing or unknown | weeklyInstalls | Descending | trending | id descending | Yes |

The matrix does not include a lowest-first option because the route has no ascending branch. It also does not include hot ranking, which belongs to the leaderboard endpoint. Keep route-specific vocabulary in test data.

Generate parameterized tests from the first six rows, then add separate missing and unknown cases. A missing value cannot be represented by the same URL setter as a string, so test helpers should support omission explicitly.

For every row, calculate expected primary and ID order from the fixture. Equivalent alias checks come after that calculation. This sequence prevents two aliases mapped to the same wrong column from passing.

Pagination assertions should request at least two pages across a primary tie. With fixed data, IDs should not repeat or disappear. The descending unique ID expression is the key reason the route can support stable offset pages under static rows.

Concurrent inserts can still move offset pages because the overall data set changes between requests. Do not claim the tiebreaker creates snapshot isolation. Test static fixture stability and handle live-data consistency as a separate product concern.

Use the [PostgreSQL ORDER BY reference](https://www.postgresql.org/docs/current/queries-order.html) to interpret expression priority. The first unequal expression decides order, and later expressions resolve prior ties according to their own direction.

Read each matrix row as a full order clause, with the main field first and ID last, rather than as two checks that may run on different data. Use a fixed UUID pair whose text order is plain to the eye. Save the two tied IDs and main value with the result. Drizzle sort alias contract testing stays clear when every input has one row that states field, path, peer, and fallback.

## How Do You Run the Sort Contract Procedure?

Run the sort contract procedure in an isolated store or filter every fixture with one unique token. Keep all request parameters fixed except sort. Calculate expectations before the first HTTP call and clean rows by owned IDs.

1. Seed skills whose four sortable fields each imply a different order.
2. Request every documented sort value with a fixed page and limit.
3. Assert the returned ID sequence for each primary column.
4. Compare popular with most_installed and quality with highest_quality.
5. Request missing, empty, case-variant, and unknown sort values.
6. Assert every fallback matches trending order and the ID tiebreaker.

The fixture below gives each field a different leading row and includes an ID tie pair. Add required names, slugs, descriptions, and author values in the insert helper.

\`\`\`ts
const fixtures = [
  {
    id: '00000000-0000-4000-8000-000000000011',
    label: 'newest',
    createdAt: new Date('2026-07-24T12:00:00Z'),
    qualityScore: 10,
    installCount: 20,
    weeklyInstalls: 30,
  },
  {
    id: '00000000-0000-4000-8000-000000000022',
    label: 'quality',
    createdAt: new Date('2026-07-21T12:00:00Z'),
    qualityScore: 99,
    installCount: 10,
    weeklyInstalls: 20,
  },
  {
    id: '00000000-0000-4000-8000-000000000033',
    label: 'popular',
    createdAt: new Date('2026-07-22T12:00:00Z'),
    qualityScore: 20,
    installCount: 900,
    weeklyInstalls: 10,
  },
  {
    id: '00000000-0000-4000-8000-000000000044',
    label: 'trending',
    createdAt: new Date('2026-07-23T12:00:00Z'),
    qualityScore: 30,
    installCount: 30,
    weeklyInstalls: 700,
  },
];

function orderFixtureIds(rows: typeof fixtures, field: keyof (typeof fixtures)[number]) {
  return [...rows]
    .sort((left, right) => {
      const primary = Number(right[field]) - Number(left[field]);
      return primary || right.id.localeCompare(left.id);
    })
    .map(({ id }) => id);
}
\`\`\`

JavaScript converts Date values to numbers in the helper, while integer fields already compare numerically. Validate the helper with a small expected winner table so a comparator bug cannot approve every route branch.

Run page-one full-sequence checks first, then add two-page tie checks. A primary mapping failure should not be hidden inside pagination diagnosis. Keep exact URLs and fixture metrics in the failure artifact.

After automation passes, inspect sort controls on [skills](/skills) and use [database QA skills](/categories/api-testing) for future aliases. The route suite remains the source of truth for raw values, default behavior, and ID ordering.

End the run by deleting the owned IDs and then issuing one filtered count to prove no row with the run token remains. Keep the expected lists in test memory rather than in the store, so cleanup cannot erase the proof used by a failed case. If a page check fails, rerun page one before any two-page case. A clean end and a small rerun path keep sort tests fast, safe, and easy to trust.

Keep a plain trace for each call with raw sort text, chosen expected field, page, limit, total, and the full ordered ID list. When two rows swap, add only their main values and IDs to the fault text, since that pair often shows the wrong field at once. Drizzle sort alias contract testing should make the first bad order clear without a full store dump or a copy of all row data.

Run the alias pair checks only after each member has passed its own field-based list, then run the tie and page cases against the same fixed rows. This order proves field map, alias match, tie key, and page split as four clear facts rather than one large test. Keep one fresh store read before cleanup so a lost fixture row cannot look like a valid sort or page result.

- one run token shared by all owned fixture rows
- one clear winner for each main sort field
- one fixed ID pair for every primary tie
- one saved expected list for each field
- one URL builder that can omit the sort key
- one explicit case for each public alias
- one blank case and one unknown value case
- one mixed-case value to prove raw matching
- one full ID order check before page checks
- all owned rows removed and counted at the end
- one fixed page and limit for the main alias table
- one total count that matches the owned fixture set
- one raw missing-key request with no sort pair at all
- one raw empty-value request with the sort key present
- one unknown value that is not close to a planned alias
- one space-padded value sent without client-side trim work
- one case-variant value sent with its exact wire text
- one weekly-based expected list for all fallback controls
- one created-time list that makes newest stand on its own
- one score-based list shared by both quality aliases
- one total-install list shared by both popular aliases
- one weekly-install list used by the trending branch
- one larger UUID placed first across each primary tie
- one two-page check with no repeated owned ID
- one two-page check with no missing owned ID
- one response body kept in raw order for the main check
- one fault note with only the two rows that changed place
- one source-bound name for every field map test
- no client sort used to repair the route response
- no live user data used to build expected ID lists

## Frequently Asked Questions

### Are every sort option and alias case insensitive?

No. The current route compares raw strings in a case-sensitive switch and does not trim or lowercase them. Lowercase documented values match their cases. Case variants and strings with surrounding spaces enter the default branch, which orders by weekly installs and then descending ID.

### Why do alias tests need contradictory fixture metrics?

When every metric produces the same order, a wrong column can return the expected IDs accidentally. Contradictory values give newest, quality, popular, and trending different winners and sequences. The resulting diff identifies the selected field rather than merely saying one broad sorting check failed.

### What happens when sort is missing or unknown?

A missing or empty value becomes trending before the switch, while an unknown nonempty value reaches the default case. Both paths order by weekly installs descending and then ID descending. The route returns a normal response rather than rejecting the parameter as invalid.

### Do popular and most_installed mean the same thing?

Yes, for this HTTP route both aliases select install count descending and share the same ID tiebreaker. Tests should prove their sequences match an independent install-based expectation and each other. Shared output alone could hide both aliases being mapped to the same incorrect field.

### Why append ID to every primary order?

Sortable metrics are not unique, so several skills can share the same primary value. Descending ID gives those ties a consistent order for unchanged data and reduces duplicates across offset pages. It does not prevent page movement when rows are inserted or updated between requests.

### Does the shared search schema accept every route alias?

No. The shared schema includes trending, most_installed, newest, and highest_quality, while the GET route additionally handles popular and quality. Tests must name their boundary. A raw HTTP contract and a separately validated SDK input can expose different accepted values without being equivalent.

## Conclusion

Drizzle sort alias contract testing needs contradictory metrics, exact ordered IDs, paired alias checks, fallback controls, and primary-tie fixtures. It proves newest, quality, highest_quality, popular, most_installed, and trending select their current columns while missing or unknown inputs use weekly installs with descending ID.

Open the sortable [skills directory](/skills), run every matrix row, and use [database testing skills](/categories/api-testing) before adding or removing an alias. Preserve the expected ID sequences so reviewers can see the selected column, direction, and tiebreaker in one report.`,
};
