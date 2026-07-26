import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Typesense timestamp mapping contract tests',
  description:
    'Use Typesense timestamp mapping contract tests to verify int64 dates become valid SkillSummary ISO strings and catch field-name or fallback drift.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'Typesense timestamp mapping contract tests',
  keywords: [
    'Typesense timestamp mapping contract tests',
    'Typesense int64 date conversion',
    'search document timestamp contract',
    'createdAt epoch fallback test',
    'Typesense camel snake date fields',
    'SkillSummary date mapping test',
  ],
  relatedSlugs: [
    'testing-typesense-multiselect-facet-filter-queries',
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-search-response-normalization-contract-tests',
    'database-testing-automation-guide',
  ],
  sources: [
    'https://typesense.org/docs/latest/api/collections.html',
    'https://typesense.org/docs/latest/api/search.html',
  ],
  repoEvidence: [
    'packages/web/src/lib/typesense/client.ts',
    'packages/web/src/lib/typesense/search.ts',
    'packages/shared/src/types/skill.ts',
  ],
  content: `Typesense timestamp mapping contract tests prove that each search hit exposes createdAt as a valid ISO string, not merely a value cast to TypeScript string. Stub int64 seconds, milliseconds, aliases, missing data, and invalid data, then assert runtime type, parsed instant, fallback behavior, and untouched search metadata.

This check currently reveals a real boundary gap: the schema declares an int64, while the mapper returns a truthy value unchanged. A type assertion cannot turn a number into text, so the suite should fail on that numeric fixture until the mapper performs an explicit, documented conversion.

## What Must Typesense Timestamp Mapping Contract Tests Prove?

Typesense timestamp mapping contract tests must connect the indexed document shape to the runtime \`SkillSummary\` contract. They prove the input field name and type, timestamp unit rule, returned JavaScript type, exact instant, and fallback for unusable input, since compile-time compatibility alone does not satisfy this boundary.

The producer-side declaration appears in \`packages/web/src/lib/typesense/client.ts\`. Its skills collection schema defines \`createdAt\` as \`int64\` and uses that field for newest sorting, but an integer has no built-in distinction between epoch seconds and epoch milliseconds, so the indexing contract must state the unit.

The consumer-side interface lives in \`packages/shared/src/types/skill.ts\`; \`SkillSummary.createdAt\` is declared as a string. Components and sort helpers can therefore pass it to \`Date\` APIs while believing the runtime value already follows a text date contract.

The mapper in \`packages/web/src/lib/typesense/search.ts\` reads truthy \`doc.createdAt\`, then truthy \`doc.created_at\`, then an ISO Unix epoch fallback. Both field reads use \`as string\`, which affects static checking only, so a nonzero number remains a number in the returned object.

That gap needs four independent assertions. First, \`typeof skill.createdAt\` must equal \`string\`; second, \`Date.parse\` must produce a finite value, third, that value must equal the intended instant, and fourth, invalid or absent input must follow one declared fallback.

The Typesense [collections documentation](https://typesense.org/docs/latest/api/collections.html) is the approved reference for collection fields and their declared types. Keep the repository schema as the exact local source. The test should fail if either the declaration or response mapping drifts without a coordinated contract change.

Use the [search response normalization article](/blog/mcp-search-response-normalization-contract-tests) as a nearby pattern. Timestamp checks focus on one field, while broader response tests cover arrays, identifiers, and optional values. Narrow failures make a numeric leak easier to diagnose.

A strong first case uses an epoch value whose seconds and milliseconds interpretations are far apart. Avoid a tiny number that maps near 1970 under both rules. Save the expected ISO literal in the case row so reviewers can verify the intended instant.

Give the hit a short name and slug, then keep all fields but the date the same in each case. This lets a failed diff point straight at the one value under test. It also stops a missing tag or score from drawing focus away from the date leak.

Read the result as a caller would, without a cast in the test and without a helper that hides its type. Check the plain value first, then ask the date tools to parse it. This order makes a number fail at the seam where it first breaks the shared type promise.

## How Should Typesense int64 Date Conversion Work?

Typesense int64 date conversion must begin with a unit contract. If indexed integers are seconds, multiply by one thousand before constructing a date; if they are milliseconds, pass them directly, while supporting both requires an explicit, tested discriminator rather than a silent guess spread across call sites.

A practical compatibility rule can treat finite absolute values below one trillion as seconds and larger values as milliseconds. That threshold is a product choice, not a Typesense date feature, so place it in one mapper helper and pin values on each side with tests.

Numeric strings need the same unit decision after strict number parsing. A loose parser can accept trailing text and mask bad documents, so require the full trimmed string to match a signed integer form before converting it as an epoch value.

ISO input may appear during a migration or in mocked results, even though the current collection field is int64. Decide whether to accept parseable text as a compatibility branch and, when accepted, normalize it through \`new Date(parsed).toISOString()\` so offsets and fractional forms return one shape.

Reject non-finite numbers, empty strings, invalid calendar text, objects, and arrays. A date object should enter only when the contract names it as supported. Every rejected value should reach one explicit fallback instead of leaking through a truthy check.

The conversion oracle can stay small and deterministic:

\`\`\`typescript
const EPOCH_ISO = '1970-01-01T00:00:00.000Z';

function expectedIso(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const milliseconds = Math.abs(value) < 1_000_000_000_000 ? value * 1_000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? EPOCH_ISO : date.toISOString();
  }

  if (typeof value === 'string' && value.trim() !== '') {
    if (/^-?\\d+$/.test(value.trim())) return expectedIso(Number(value));
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }

  return EPOCH_ISO;
}
\`\`\`

Keep this expected helper in test code only if production uses an independently reviewed implementation. Importing the production converter into the expected-value path can let one defect control both sides. Literal expected dates for core rows provide the safest oracle.

Typesense timestamp mapping contract tests should include negative epochs only if the product supports dates before 1970. The absolute threshold handles their unit choice symmetrically. State the range contract so an out-of-range date does not cause platform-specific output.

The [Typesense facet query test](/blog/testing-typesense-multiselect-facet-filter-queries) covers filter construction and result grouping. Date conversion should not alter those fields. Include unchanged facet and pagination checks in one integration case to guard accidental map refactors.

Write the unit in the case name, the seed data, and the expected date so no one must infer it. A row called \`seconds to ISO\` is clear when it fails years after the first fix. The same plain label helps a code review spot a wrong extra factor of one thousand.

Keep math out of the main route test when a literal date can state the result with less doubt. A pure helper case can check the scale rule at each edge. The mapped hit case should use known input and known text, which makes the final fact easy to read.

## What Is the Search Document Timestamp Contract?

The search document timestamp contract states what the index stores and what web code returns. For this repository, the declared producer field is camel-case \`createdAt\` with an int64 type. The desired consumer value is an ISO string that represents the same instant.

Write the unit next to the indexer that creates documents, not only next to the reader. The current repository evidence shows the collection schema and search mapper, but no unit conversion in the mapper. A test cannot infer whether an unexplained integer was intended as seconds or milliseconds.

The contract should name accepted compatibility inputs during migration. For example, it may allow int64 seconds, int64 milliseconds, numeric strings, ISO text, and the snake-case alias for old documents. Each accepted form still returns one canonical ISO representation.

The fallback must also be explicit. Current code uses \`new Date(0).toISOString()\` only when both candidate fields are falsy. Because invalid nonempty text is truthy, it currently bypasses that fallback and returns an invalid string.

Zero deserves its own row because JavaScript treats it as falsy. A camel-case value of zero currently falls through to the alias or epoch fallback. If zero means the Unix epoch, field precedence should not depend on truthiness.

The [Typesense search documentation](https://typesense.org/docs/latest/api/search.html) is the approved reference for document hits, sorting, facets, and result metadata. Tests should stub a response at that public result boundary. They need not imitate network transport or a live cluster to verify mapping.

Keep IDs, names, scores, and arrays valid in timestamp fixtures. If several fields are malformed, a failure may not point to date logic. One controlled hit with a single changed timestamp makes the contract plain.

Use the [MCP schema drift test](/blog/mcp-search-filter-schema-drift-contract-tests) to frame producer and consumer ownership. A field can satisfy TypeScript after a cast while violating runtime data. Contract tests must inspect real values after the mapping call.

Typesense timestamp mapping contract tests should fail with both actual type and rendered value in the message. A report such as \`number 1700000000\` immediately identifies a no-op cast. A generic deep-equality diff can bury that fact among many skill fields.

One source value should lead to one saved instant, no matter which accepted form brought it into the mapper. Put the raw value next to the final text in the test row. This pair shows whether the fault came from field choice, unit scale, parse rules, or final text output.

Browse the [skill categories](/categories) only to choose a sound search fixture shape, not to supply live test data. A local hit keeps the clock and source row fixed. That fixed state makes the check fast enough to run with each change to the map.

## CreatedAt Epoch Fallback Test Cases

A createdAt epoch fallback test needs absent, null, zero, invalid, and out-of-range inputs. These values exercise both fallback selection and date validation. Keep alias presence explicit because the current \`||\` chain couples falsy values to field precedence.

For no date fields, expect \`1970-01-01T00:00:00.000Z\`. This is the current visible fallback and a valid ISO string. Assert the literal and a finite parse result, so a later text typo cannot pass merely because it is a string.

For null or an empty string in camel case with no alias, expect the same epoch. If compatibility accepts an alias, a null primary may permit that alias. State this rule in the case label instead of treating every fallback input alike.

For numeric zero, expect the epoch from the primary field itself. Add a conflicting alias with a later date and expect zero to retain precedence under a corrected definedness check. This case catches truthiness logic that wrongly selects the alias.

For invalid nonempty text, expect the declared fallback rather than raw text. The current mapper returns the invalid value because it is truthy. This test should remain red until validation is implemented, just like the numeric runtime-type case.

For \`NaN\`, positive infinity, negative infinity, and huge values beyond the chosen date range, expect fallback. JSON cannot carry every special number over a real wire, but a mocked result can still reveal whether the helper validates finite input. Keep wire-valid cases as the required core.

Do not treat fallback as a valid source timestamp during sort tests. It is a consumer safety value for an unusable hit, while Typesense sorting already happened on indexed integers. Count or log fallback use separately if product monitoring later needs data repair signals.

The [database testing article](/blog/database-testing-automation-guide) can help compare indexed dates with source rows in a larger pipeline check. This mapper suite stays local to search output. An index synchronization test should own whether the original database instant was encoded correctly.

Make fallback cases use fixed UTC values and no local time parsing. ISO strings with \`Z\` avoid host timezone differences. CI should produce the same expected text in every region.

Keep the first bad case simple: one invalid word, no alias, and no other odd field in the hit. The result should be the fixed epoch text and a valid parsed time. Once that case is clear, add null, blank, huge, and mixed-field rows with names that say why each one falls back.

A fallback should be easy to count in a test report because it may point to old or damaged index data. The map can stay safe while a later job repairs those docs. Do not let a safe date hide the raw cause in test logs, but keep broad hit data out of them.

## How Do Typesense Camel Snake Date Fields Interact?

Typesense camel snake date fields need a deterministic precedence rule during migration. The current mapper tries \`createdAt\` before \`created_at\`, but only when the first value is truthy. A correct compatibility branch should normally prefer a defined and valid primary value.

Test a hit with only camel case and another with only snake case. Both should return the same ISO instant when values represent the same time. These controls prove each field is wired before a conflict row tests priority.

Next, provide two valid but different dates. Expect camel case to win because it is the declared schema field and the mapper lists it first. Print both inputs on failure so the selected source is obvious.

Then provide invalid camel case and valid snake case. The contract must choose whether validation falls through to the alias or sends the whole hit to fallback. Either policy can be tested, but it must be stated; the brief's migration goal favors a valid alias before epoch fallback.

Zero in camel case and a nonzero alias form the key falsy conflict. A definedness test should preserve zero as a valid epoch. The current \`||\` expression selects the alias, so this row exposes field priority drift and truthiness in one check.

Do not merge arbitrary snake-case fields across the whole document unless the broader mapping contract approves them. This article concerns date compatibility only. Narrow alias support prevents hidden schema variants from becoming permanent by accident.

The [search filter contract article](/blog/mcp-search-filter-schema-drift-contract-tests) can own request-field aliases and validation. Here, assert which timestamp source was used and the final ISO value. Keep query construction unchanged in the fixture.

Typesense timestamp mapping contract tests should also verify that a future removal of \`created_at\` is deliberate. Mark alias rows as compatibility cases with an owner and removal condition. A surprise deletion should fail until old indexed documents are migrated.

Typesense timestamp mapping contract tests should choose fields by a written rule, not by which value JavaScript treats as true. Zero is a real time at the epoch and must not vanish, while a small definedness check is easy to test with zero, null, blank text, and two fields that name different days.

Keep the old field case near the new field case so a reader can compare their paths in one screen. Do not make one suite load a live old index. Two fixed hits give the same proof with less state and make the planned alias removal safe to review.

## SkillSummary Date Mapping Test Design

A SkillSummary date mapping test should call \`searchSkills\` with a stubbed Typesense result and inspect the returned skill at runtime. Casting a fixture to the expected interface before mapping would hide the very mismatch under test. Keep the document typed as \`Record<string, unknown>\`.

Stub \`getTypesenseClient\` or its chained collection search method so the production mapper runs unchanged. Return one hit, a found count, and small facet arrays. Then assert date results alongside page, page size, total, and one facet.

The interface in \`packages/shared/src/types/skill.ts\` says \`createdAt\` is text. Add \`expect(typeof value).toBe('string')\` before parsing. This first assertion produces a direct message when a number escapes through a type assertion.

Next, parse the string and require a finite millisecond value. Then compare it with the expected instant, not just an ISO-shaped regular expression. A date can look valid yet represent seconds as milliseconds near January 1970.

Use literals for the two main integer cases. For example, epoch seconds \`1_700_000_000\` and milliseconds \`1_700_000_000_000\` both represent \`2023-11-14T22:13:20.000Z\` under the dual-unit rule. Their equal output makes a unit error easy to spot.

This test sketch keeps the result boundary visible:

\`\`\`typescript
import { expect, test, vi } from 'vitest';
import { searchSkills } from '@/lib/typesense/search';

test.each([
  ['seconds', 1_700_000_000, '2023-11-14T22:13:20.000Z'],
  ['milliseconds', 1_700_000_000_000, '2023-11-14T22:13:20.000Z'],
] as const)('maps %s to an ISO SkillSummary date', async (_kind, input, iso) => {
  stubTypesenseSearch({
    found: 1,
    hits: [{ document: makeSkillDocument({ createdAt: input }) }],
    facet_counts: [],
  });

  const result = await searchSkills({ query: '*', page: 2, pageSize: 1 });
  expect(typeof result.skills[0].createdAt).toBe('string');
  expect(result.skills[0].createdAt).toBe(iso);
  expect(Date.parse(result.skills[0].createdAt)).toBe(Date.parse(iso));
  expect(result.page).toBe(2);
  expect(result.pageSize).toBe(1);
});
\`\`\`

Do not mock \`Date\` for these fixed values. UTC epoch conversion is deterministic. A fake clock matters only if production uses the current time, which this fallback and mapping contract should not do.

Use the [response normalization guide](/blog/mcp-search-response-normalization-contract-tests) to extend this pattern to other fields. Keep one date-only suite so a failure from timestamp conversion does not block every unrelated assertion with the same broad snapshot.

Add a static type test only as a supplement. It can prove consumers expect a string but cannot prove a numeric document becomes one. Runtime assertions are mandatory at this cast boundary.

The best map test checks one hit and a few outer result fields, then stops before it turns into a full search test. This narrow scope leaves room for a clear type check and exact date. Use [API testing skills](/categories/api-testing) when the suite needs a stub that can keep the client chain small.

Give the stub its own fresh object for each row because map code may read arrays and fields more than once. Shared objects can be changed by one case and taint the next. Fresh data also makes it safe for test workers to run date rows at the same time.

## Timestamp Input and Expected ISO Output Matrix

The matrix below assumes one documented compatibility converter that accepts seconds, milliseconds, numeric strings, ISO text, and a snake-case alias. If the product chooses a narrower rule, remove accepted rows with a versioned index migration rather than vague expectations.

| Document field | Input type | Example value | Expected SkillSummary value | Parseable | Test result |
|---|---|---|---|---|---|
| \`createdAt\` | Int64 seconds | \`1700000000\` | \`2023-11-14T22:13:20.000Z\` | Yes | Convert seconds |
| \`createdAt\` | Int64 milliseconds | \`1700000000000\` | \`2023-11-14T22:13:20.000Z\` | Yes | Preserve instant |
| \`createdAt\` | Numeric string | \`"1700000000"\` | \`2023-11-14T22:13:20.000Z\` | Yes | Parse then convert |
| \`created_at\` | Int64 seconds | \`1700000000\` | \`2023-11-14T22:13:20.000Z\` | Yes | Compatibility alias |
| Both fields | Different valid values | Camel plus snake | Camel-derived ISO | Yes | Primary wins |
| Neither field | Missing | No value | \`1970-01-01T00:00:00.000Z\` | Yes | Epoch fallback |
| \`createdAt\` | Invalid text | \`"not-a-date"\` | \`1970-01-01T00:00:00.000Z\` | Yes | Reject then fallback |

Add boundary values around the unit threshold to the pure converter suite. The table stays focused on common documents. Boundary rows should state the exact policy because a one-unit shift can change the interpreted year by decades.

For both-field tests, assert source precedence and final instant. Do not accept either output. Compatibility exists to make mixed index versions predictable, so ambiguity defeats its purpose.

The [Typesense multiselect test](/blog/testing-typesense-multiselect-facet-filter-queries) should remain green with every timestamp row. Include one facet count and one total in the stub. A date fix must not drop search metadata while rebuilding mapped objects.

Typesense timestamp mapping contract tests should keep current failures visible in review. Numeric nonzero values now escape as numbers, and invalid truthy text escapes as text. Mark those cases as expected failures only until the conversion change lands, not as permanent skipped tests.

Read the matrix from the two plain integer rows down to the bad input rows. This order proves valid dates first, then moves to old names and safe fallback. A failed first row points to base conversion, while a failed later row points to a small rule layered on that base.

Keep each expected string in UTC and use the full millisecond form, even when all three digits are zero. One text shape makes equality checks direct. It also keeps callers from seeing several forms for the same time based on which branch produced the result.

## How Do You Implement the Mapping Contract Procedure?

Implement the mapping contract procedure with a pure conversion table and a smaller \`searchSkills\` integration table. The pure layer covers many values. The integration layer proves the collection result passes through the converter and keeps other response fields intact.

1. Create one complete hit fixture for int64 seconds, int64 milliseconds, numeric text, ISO text, camel and snake aliases, zero, missing values, and invalid values, with literal expected ISO output for every row.
2. Stub the Typesense collection search chain with one controlled hit plus fixed found and facet data, while leaving the production \`searchSkills\` mapper and pagination logic untouched.
3. Call \`searchSkills\` with fixed query, page, page size, and sort values, then save its first \`SkillSummary\` without casting that returned date in the test.
4. Assert \`createdAt\` is a JavaScript string, \`Date.parse\` is finite, and the parsed millisecond instant equals the literal expected value for that input representation.
5. Assert the explicit Unix epoch fallback for absent or rejected dates, and test zero with a conflicting alias so falsy primary data cannot silently lose field precedence.
6. Assert total, page, page size, and representative facet fields remain unchanged, then retain one failing numeric case until the mapper replaces its current no-op string assertion.

Keep the stub reset in final cleanup because client singletons and mock chains can leak between cases. A timestamp from an earlier hit can make a missing-field case pass for the wrong reason. Fresh result objects remove that source of confusion.

Run pure cases with the web unit tests and the mapped result cases whenever Typesense search code changes. Add one live-cluster check only when index schema migrations need proof. The local contract should not need credentials or network access.

Use [search and contract testing skills](/skills) to select a repeatable fixture style. Then connect one database instant to its indexed integer in a separate pipeline test. That broader check owns producer encoding, while this suite owns consumer conversion.

On failure, print field source, runtime type, raw value, expected ISO, actual value, and parsed milliseconds. Do not print the whole result hit. A six-field diagnostic is enough to identify wrong units, alias priority, invalid parsing, or missing conversion.

Run one final case with two hits that have dates one day apart and preserve their returned order. The map must change values, not sort them again. This check guards a well-meant client sort that could fight the order Typesense has already chosen for the query.

Keep that order case free of equal dates and equal scores, so the expected first item is plain. Assert both slugs and both ISO strings. The result then proves date work did not move hits, lose one item, or rewrite the outer page facts.

## Frequently Asked Questions

### Does an int64 Typesense field have a date unit?

No, an integer field stores a number; the application contract must say whether timestamp values represent seconds or milliseconds. Tests should pin that unit beside the indexer and mapper. If both forms are supported during migration, define one explicit discriminator and boundary cases.

### Why does a TypeScript string cast not convert the value?

A type assertion changes compiler interpretation and emits no runtime conversion. Therefore, \`doc.createdAt as string\` can return a number inside an object typed as \`SkillSummary\`. Assert \`typeof\` on the mapped result before parsing so this mismatch fails with a clear message.

### Should missing createdAt use the Unix epoch?

The current mapper names the Unix epoch as its fallback when both date fields are falsy. A contract test should pin that exact ISO text. Product code may later choose omission or rejection, but the fallback and consumer type must change together with explicit migration coverage.

### Which field wins when createdAt and created_at both exist?

Camel-case \`createdAt\` should win because it is the declared collection field and appears first in mapping order. Use defined and valid checks instead of truthiness, so numeric zero keeps priority. Add a conflict fixture with two dates and require one exact output.

### Can Date.parse alone prove timestamp mapping is correct?

No, parseability proves syntax but not the intended instant or runtime source. Seconds treated as milliseconds can still produce a valid 1970 date. Compare parsed milliseconds with a literal expected instant, and separately assert the value is a string plus the correct field won.

### Should search sorting use the mapped ISO string?

Typesense performs newest sorting on the indexed numeric \`createdAt\` before the web mapper creates \`SkillSummary\` values. Mapping tests should preserve requested sort parameters and returned order. A separate index contract must ensure all stored integers use compatible units for numeric sorting.

## Conclusion

Typesense timestamp mapping contract tests enforce a runtime boundary that casts cannot provide: each accepted timestamp form becomes one valid ISO string with a known instant and deterministic field priority. Keep numeric, invalid, zero, alias, and fallback rows together so unit or truthiness drift fails quickly.

Browse [search and contract-testing skills](/skills), add the two integer fixtures first, and make the current numeric leak visible. Then use the [response normalization guide](/blog/mcp-search-response-normalization-contract-tests) to protect the rest of the mapped skill while the date converter changes.`,
};
