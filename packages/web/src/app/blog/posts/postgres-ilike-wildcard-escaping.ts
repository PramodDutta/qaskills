import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Postgres ILIKE wildcard escaping',
  description:
    'Use Postgres ILIKE wildcard escaping tests to cover percent, underscore, backslash, Unicode, and literal substring search expectations in APIs.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Postgres ILIKE wildcard escaping',
  keywords: [
    'Postgres ILIKE wildcard escaping',
    'escape percent in ILIKE',
    'Postgres underscore wildcard test',
    'Drizzle substring search edge cases',
    'Unicode case insensitive search',
    'ILIKE backslash escape testing',
  ],
  relatedSlugs: [
    'database-testing-automation-guide',
    'postgres-migration-testing-guide',
    'testing-postgresql-jsonb-multiselect-filters-drizzle',
    'testing-lazy-neon-database-initialization-nextjs-build',
  ],
  sources: [
    'https://www.postgresql.org/docs/current/functions-matching.html',
    'https://orm.drizzle.team/docs/operators',
    'https://www.postgresql.org/docs/current/collation.html',
  ],
  repoEvidence: [
    'packages/web/src/app/api/skills/route.ts',
    'packages/web/src/db/schema/skills.ts',
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  content: `Postgres ILIKE wildcard escaping tests should first decide whether search input means literal text or a user pattern. Seed rows that differ only around percent, underscore, and backslash characters, then call the real API. Compare returned IDs with both contracts before changing escape logic or declaring a defect.

The current search in \`packages/web/src/app/api/skills/route.ts\` places raw query text between two percent signs and applies \`ilike\` to skill names and descriptions. Drizzle binds the pattern value, but PostgreSQL still interprets wildcard characters inside that value. Tests must separate parameter safety from match breadth.

## What Must Postgres ILIKE Wildcard Escaping Tests Prove?

Postgres ILIKE wildcard escaping tests must reveal the current pattern and the intended product rule. A plain word should act as a case-insensitive substring, while percent and underscore may expand matches unless escaped. The suite should show exact returned skill IDs for each input.

The route reads \`q\` from URL search parameters and skips text conditions when it is empty. For nonempty text, it creates \`%\${query}%\` twice, once for \`skills.name\` and once for \`skills.description\`. The two predicates are joined with an OR condition.

That design has two distinct layers. Drizzle parameterization keeps the pattern as a bound value rather than SQL syntax, while ILIKE treats characters inside that value according to pattern rules. A quote test covers value transport, but it does not prove percent is literal.

The searched columns in \`packages/web/src/db/schema/skills.ts\` are non-null text fields. Seed both columns because a match in either one returns the row. Give the non-target column neutral text so each assertion explains which predicate matched.

The publishing schema at \`packages/shared/src/schemas/skill-schema.ts\` limits names and descriptions when skills are created through validated paths. It does not define the meaning of the GET query text. Search tests should therefore send special query characters directly to the endpoint.

Postgres ILIKE wildcard escaping also needs an explicit empty-query control. The current route does not build \`%%\` for empty input; it omits the text filter and applies pagination plus sorting. Assert that behavior separately from literal empty-string matching.

The [database testing guide](/blog/database-testing-automation-guide) offers broader fixture advice. This suite should stay small enough that every extra or missing returned ID points to one pattern rule.

## How Do You Escape Percent in ILIKE?

To escape percent in ILIKE, first prove what an unescaped percent does against discriminating rows. PostgreSQL defines percent as matching any sequence of zero or more characters in a LIKE pattern. ILIKE applies the same pattern structure while comparing case without case sensitivity.

The official [PostgreSQL pattern matching documentation](https://www.postgresql.org/docs/current/functions-matching.html) describes percent, underscore, and the escape mechanism. Use it as the semantic source, then test the actual database collation and query builder. Do not replace a repository test with examples copied from documentation.

Seed names such as \`Rate 100% Ready\`, \`Rate 100X Ready\`, and \`Plain Rate\`. Querying \`100%\` under current wrapping can match more than the row containing a literal percent. Exact result sets make this expansion visible.

If the product requires literal substring search, escape backslash first, then percent and underscore before adding outer percent wildcards. The exact SQL escape character must match the helper. Test the generated pattern as an observable diagnostic, not as the only assertion.

\`\`\`typescript
function escapeLikeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (character) => \`\\\${character}\`);
}

const escapedQuery = escapeLikeLiteral(query);
const condition = or(
  ilike(skills.name, \`%\${escapedQuery}%\`),
  ilike(skills.description, \`%\${escapedQuery}%\`),
);
\`\`\`

This code is a proposed literal strategy, not the current route. Verify it against the chosen PostgreSQL escape behavior before adoption. A raw helper unit test cannot prove that the database receives and interprets the same pattern.

Keep an unescaped contract test if wildcard search is intentional. In that product design, percent expansion is a feature, and escaping would be a regression. Name tests around intended matches rather than around a fixed implementation preference.

The Drizzle [operator documentation](https://orm.drizzle.team/docs/operators) shows \`ilike\` as a query condition. It does not choose whether user input should be literal. That decision belongs in the product contract and exact-result tests.

Use the [Postgres migration testing guide](/blog/postgres-migration-testing-guide) when collation or index changes accompany the search rule. The small wildcard fixture should run before and after such changes with identical expected IDs.

## What Is a Postgres Underscore Wildcard Test?

A Postgres underscore wildcard test uses rows that differ by exactly one character at the marked position. Under pattern semantics, one underscore matches one character. Under literal semantics, it should match only text containing an actual underscore.

Seed \`api_test\`, \`apiXtest\`, \`api-test\`, and \`apitest\` in separate skill names. Search for \`api_test\` and capture returned IDs. The unescaped pattern can match the first three, while the no-character row should remain different.

Place neutral descriptions on these rows. If every description contains the query by accident, the OR predicate can hide name behavior. A second group can move the same cases into descriptions to prove both columns use the same rule.

Add strings with two underscores and strings at the start or end. The route's outer percent signs already allow text on either side, so assertions should focus on character positions inside the query. Record the interpolated pattern beside failures.

Postgres ILIKE wildcard escaping should test mixed percent and underscore text too. A query such as \`v_%\` combines one-character and any-sequence rules. Small rows can show whether escaping covers both symbols or only one.

Do not use broad containment assertions. Requiring one expected row while ignoring extra rows misses the main defect in literal search. Sort returned IDs in the test only when API ordering is not part of this specific case.

The [JSONB filter testing article](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) covers other conditions on the same route. Keep wildcard fixtures free of filter values unless the test intentionally checks condition composition.

## Drizzle Substring Search Edge Cases

Drizzle substring search edge cases include empty text, percent, underscore, backslash, quotes, mixed symbols, long values, and matches in either searched column. Run them through the GET endpoint so URL parsing and query building remain part of the test.

Plain mixed-case text provides the first control. Seed a name with a unique ASCII token, query lower and upper forms, and require the same row. This proves the ILIKE branch runs before special patterns complicate results.

A single quote should travel as data in a bound pattern. Seed \`Runner's Kit\`, encode the query through \`URLSearchParams\`, and require that row without a server error. Do not build a request URL by string concatenation when the test is meant to isolate SQL behavior.

Percent and underscore then reveal pattern expansion. Backslash explores the chosen escape behavior, while a percent preceded by backslash tests whether the database treats that pair as literal under current settings. Keep raw input and parsed query in diagnostics.

The endpoint caps \`limit\` at 100 and defaults to 20. Special patterns can match many rows, so use a small isolated fixture or set a sufficient valid limit. Otherwise, pagination may hide expected rows and resemble an escaping failure.

\`\`\`typescript
const cases = [
  { query: 'needle', expectedSlugs: ['plain-needle'] },
  { query: '100%', expectedSlugs: currentPatternMatches.percent },
  { query: 'api_test', expectedSlugs: currentPatternMatches.underscore },
  { query: String.raw\`path\\name\`, expectedSlugs: currentPatternMatches.backslash },
  { query: "runner's", expectedSlugs: ['quoted-name'] },
];

for (const item of cases) {
  const url = new URL('/api/skills', 'http://test.local');
  url.searchParams.set('q', item.query);
  url.searchParams.set('limit', '100');

  const response = await GET(new NextRequest(url));
  const body = await response.json();
  expect(body.skills.map((skill: { slug: string }) => skill.slug).sort()).toEqual(
    [...item.expectedSlugs].sort(),
  );
}
\`\`\`

This example expects a predeclared result set for current pattern behavior. Create a second expected map for literal intent rather than deriving expected rows with the same escape helper. Independent expected data can catch defects in helper logic.

Long text should test validation and query cost separately. The route shown here does not apply the shared creation schema to \`q\`, so record response behavior without inventing a search length limit. Performance thresholds need measured evidence and a distinct plan.

Use the [API testing category](/categories/api-testing) for route harness patterns. The assertion should still name each seeded row and why it must or must not match.

## How Does Unicode Case Insensitive Search Behave?

Unicode case insensitive search behavior depends on PostgreSQL rules and the active collation. Seed known pairs in the same database used by the application, then record exact matches. Avoid stating that ILIKE performs one universal form of Unicode case folding.

PostgreSQL provides detailed [collation support documentation](https://www.postgresql.org/docs/current/collation.html). A collation can affect comparison behavior, and different providers or settings may produce different results. Save the database and column collation with any Unicode test report.

Start with ASCII case pairs as a stable route control. Then choose a few non-ASCII pairs relevant to supported content and write them with source escapes when needed. Each case should list the stored value, query value, collation, and returned IDs.

Do not mix normalization with case in one first test. A composed value and a decomposed value can differ even if they look alike, while upper and lower forms test another rule. Separate matrices make the cause of a missing match much easier to find.

Postgres ILIKE wildcard escaping remains relevant when Unicode text contains percent or underscore beside letters. Test special characters and case in stages before one combined case. That sequence shows whether failure comes from wildcard semantics or collation behavior.

The route searches names and descriptions with the same operator, yet indexes or later migrations may differ. Keep one Unicode case in each column. Assert exact rows after clearing any cache or search service that is not part of this direct database route.

The [lazy database initialization article](/blog/testing-lazy-neon-database-initialization-nextjs-build) explains a separate connection concern. Here, require a real runtime connection so the test uses the same PostgreSQL comparison rules as deployed queries.

## ILIKE Backslash Escape Testing

ILIKE backslash escape testing must distinguish a literal backslash from a backslash used to quote a wildcard. Store paths and labels that include backslashes, then query raw and escaped forms through URL search parameters. Compare exact results under the documented database configuration.

Backslash crosses several parsers. A TypeScript string, URL encoding, request parser, query pattern, and PostgreSQL matcher may each interpret text. Use \`String.raw\` or explicit escapes in source, then assert the parsed \`q\` value before evaluating matches.

Create rows with \`path\\name\`, \`pathXname\`, \`rate\\%done\`, and \`rate100done\`. These fixtures separate literal path text from escape sequences and wildcard reach. Put a unique neutral value in each description to avoid accidental OR matches.

Test the current route first without changing it. If behavior differs from literal product intent, preserve that failing characterization as evidence, then add the escape strategy. Rerun the same rows after the change.

An escape helper should transform backslash before percent and underscore. Otherwise, added escape characters can themselves be escaped twice or interpreted as original input. Unit tests can verify the transformed string, but only a database-backed test proves final matches.

Do not interpolate a raw ESCAPE clause from user input. Keep any chosen escape marker fixed in query code and keep the search value bound. The product decision concerns pattern meaning, not permission to construct SQL syntax from a request.

Postgres ILIKE wildcard escaping needs one ordinary path control without wildcard symbols. That row proves backslash transport before a combined escape case fails. Save both raw query and expected literal value in assertion output.

The [database skills catalog](/skills) can provide reusable integration setup. Retain this focused fixture even if a broader search suite exists, because one-character differences make escape regressions easy to diagnose.

## Query Input, SQL Pattern, and Match Matrix

The matrix compares current percent-wrapped behavior with a possible literal-substring contract. It does not claim measured results for every collation. Fill exact IDs from the isolated fixture and flag any row that differs from the chosen product rule.

| User input | Interpolated pattern | Fixture text | Current match | Literal-intent match | Test purpose |
|---|---|---|---|---|---|
| \`needle\` | \`%needle%\` | \`plain needle text\` | Yes | Yes | Plain control |
| \`100%\` | \`%100%%\` | \`100X ready\` | Possible by pattern | No | Percent expansion |
| \`api_test\` | \`%api_test%\` | \`apiXtest\` | Possible by pattern | No | One-character wildcard |
| \`path\\name\` | Wrapped raw text | Literal backslash path | Record | Yes | Escape transport |
| \`v_%\` | Wrapped mixed pattern | Several version labels | Record exact IDs | Literal only | Mixed wildcards |
| Mixed-case token | Wrapped query | Stored case pair | Collation based | Collation based | ILIKE case rule |

Use "possible by pattern" only in planning notes. The automated test must replace it with exact expected IDs for its known database and fixtures. Vague booleans cannot catch an extra row.

The literal-intent column is a proposed contract, not an assertion that current code already meets it. Product owners should choose between the two columns. Tests can then pin the chosen set and remove ambiguity from later fixes.

Include the actual page and limit in run output. A broad wildcard may exceed one page, and missing rows could reflect pagination rather than match behavior. Isolated data keeps the table easy to review.

Run the same matrix on names and descriptions. The route ORs both predicates, so a second fixture group confirms equal escaping. Do not place the target token in both columns of one row.

The [skills directory](/skills) is the user-facing search surface. Use its API contract for exact result checks, then leave presentation order and filter controls to their own browser tests.

## How Do You Run the Wildcard Procedure?

Run the wildcard procedure with a known set of skills whose text differs at one meaningful character. Capture result IDs, not just counts, for each query. Decide the product contract before treating expanded matches as defects.

1. Seed neutral skill rows that isolate plain text, percent, underscore, backslash, and case pairs.
2. Place each target in either the name or description, but not both at once.
3. Send every query through URL search parameters with a large enough valid page limit.
4. Record returned IDs and compare them with the current PostgreSQL pattern rules.
5. Write down whether the product expects literal substring or wildcard input.
6. Add escaping only when literal meaning is the approved contract.
7. Rerun the same fixtures and require exact result sets for both searched columns.

### Make each failed match plain to read

Keep the first seed set small, since each row must show one clear match rule. Give each row a short slug that says which mark it has and where. Put plain text in the other field so the OR branch cannot mask the cause. When a query fails, print the slugs and the raw text that was sent.

Run the plain word case first and check both lower and upper case forms. Next run one percent sign and one underscore against rows that differ by one mark. Test a backslash on its own before it is paired with a wildcard. This order points to the first rule that does not match the written search goal.

Keep the old result set next to the new literal set while a fix is reviewed. A wide old match can be valid proof of the code that is live now. The new set states what the team wants after the change. Postgres ILIKE wildcard escaping is safer when those two facts are not mixed in one vague check.

Read the full set of IDs for each case, not just the first hit. Save the page size and sort mode with that set so a later run uses the same view. If the set is too large, shrink the seed data before changing the check. Small proof makes an extra match much easier to spot and explain.

Use a fresh seed for each run, and keep each slug short enough to scan at once. Let one clear set show the pass or fail state for each mark. When a row should stay out, name the one rule that keeps it out. When a row should match, name the field and raw text that caused the hit.

- The seed slug, stored name, and stored description for each row, with just one field holding the target search text
- The raw query value before URL work and the parsed value read from search parameters after the request is built
- The outer percent-wrapped pattern used by the current route, kept as a debug fact rather than the source of expected IDs
- The fixed literal pattern produced by the proposed helper, with backslash handled before percent and underscore are marked
- The exact result slug set for plain text under lower and upper query forms, proving the ILIKE path runs at all
- The exact result slug set for one percent input against literal-percent, no-percent, empty-gap, and long-gap seed rows
- The exact result slug set for one underscore input against literal-underscore, one-letter, no-letter, and two-letter rows
- The parsed path text and exact result slugs for a lone backslash before any escaped wildcard pair is added
- The exact matches for mixed percent and underscore input, with no containment check that could ignore extra rows
- The name-only and description-only result sets for each special mark, proving both sides of the OR use the same rule
- The active database and column collation facts saved beside each non-ASCII case instead of a broad case-folding claim
- The composed, decomposed, upper, and lower text cases kept in separate rows so normalization does not mask case behavior
- The page, limit, filter, and sort values used for each request, with enough room to return the whole isolated seed set
- The response status, total, first slug, last slug, and full sorted fixture slug set used by each exact match assertion
- The quote-bearing control that proves value binding and request transport without being used as proof of wildcard meaning
- The empty-query control that proves the route omits text predicates rather than sending a percent-only pattern to PostgreSQL
- The database and Drizzle versions used by the run, plus the fixed escape rule approved for the product search contract
- The cleanup result for all seed rows, with the next run blocked until no old wildcard fixture remains in the test store
- A short diff between the old and new slug sets, with each added or dropped row tied to one approved match rule
- The same fixed query set run twice in one clean store, proving no seed order or prior call changes its matches
- The Postgres ILIKE wildcard escaping case name on each report so broad search checks cannot claim this narrow proof

Begin with a plain token and quote-bearing token. Those controls verify routing, URL encoding, database access, and parameter handling. Fix any failure there before changing wildcard code.

Next, run percent and underscore cases against rows with one-character differences. Capture the pattern for diagnosis, but compute expected IDs by hand from the documented rule. This prevents the production helper from generating its own oracle.

Then test literal backslashes and escaped wildcard sequences. Assert the parsed request value so an extra source-language escape cannot impersonate a database issue. Keep the database collation in the report.

After the current behavior is stable, choose literal or pattern intent. A literal decision should lead to one fixed escape helper and database-backed tests. A pattern decision should lead to clear user-facing guidance and exact expansion tests.

Finally, rerun other route filters with one plain query. Escaping changes should not break JSONB filters, sort choice, page bounds, or the two-column OR. Keep those checks small because their full contract belongs elsewhere.

The [JSONB filter guide](/blog/testing-postgresql-jsonb-multiselect-filters-drizzle) supports that composition check. Use [QA testing skills](/skills) to package the exact wildcard matrix for later search changes.

## Frequently Asked Questions

### Is an unescaped percent sign a SQL injection flaw?

Not by itself. A bound ILIKE value can still contain legal wildcard characters that broaden pattern matches without becoming SQL syntax. Treat parameter safety and literal-search intent as separate claims. Test quotes for safe value transport, then test percent with exact rows for match breadth.

### What does underscore mean inside an ILIKE pattern?

An underscore is the single-character wildcard in PostgreSQL LIKE-style patterns. It can match one character where it appears, while percent can match any sequence. A literal-substring product must escape underscore, and its test should include one-character substitutions plus a row containing an actual underscore.

### Should the API allow users to enter wildcards?

That choice depends on the search experience. Power-user pattern input can be valid when it is documented and bounded, while a simple catalog often expects literal text. Write the decision first, then assert exact result IDs. Do not label documented wildcard expansion as a defect.

### Does ILIKE compare all Unicode text the same way?

No universal claim is safe without the database configuration. Case-insensitive comparisons can depend on collation and provider behavior. Test representative stored and query pairs in the target PostgreSQL environment, record its collation, and keep normalization cases separate from upper-versus-lower comparisons.

### Why must backslash be escaped before other wildcards?

An escape helper adds backslashes before percent and underscore. If original backslashes are not handled first, the transformed pattern can lose the distinction between user data and new escape markers. Unit-test the helper output, then verify final matches through PostgreSQL with literal path fixtures.

### What should an empty query return?

The current route skips the text-search condition when \`q\` is empty, then applies other filters, sorting, and pagination. That differs from intentionally running an ILIKE \`%%\` predicate. Pin the observed route response separately so wildcard fixes do not change empty-search behavior by accident.

### Can the test assert only that one expected row appears?

No. Wildcard defects often add unintended rows rather than removing the target row. Require the complete set of returned fixture IDs, with pagination controlled. A containment assertion would pass when percent or underscore silently expands a literal query far beyond the expected match.

## Conclusion

Postgres ILIKE wildcard escaping starts with a product decision between pattern input and literal substring input. Exact fixture IDs then prove what percent, underscore, backslash, and case rules do through the real Drizzle route.

Characterize current behavior before adding an escape helper, and keep parameter safety distinct from wildcard meaning. Record collation, parsed query text, page bounds, and both searched columns whenever results differ.

Browse [database testing skills](/skills) and run the wildcard matrix against your search contract. Revisit the [database automation guide](/blog/database-testing-automation-guide) when migrations alter collation, indexes, or query plans.`,
};
