import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md Array Normalization Testing',
  description:
    'SKILL.md array normalization testing compares YAML lists, inline arrays, CSV strings, empty values, mixed types, trimming, and parser consistency.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md array normalization testing',
  keywords: [
    'SKILL.md array normalization testing',
    'YAML list normalization',
    'comma separated frontmatter',
    'toStringArray parser',
    'empty skill metadata array',
    'mixed YAML array values',
    'frontmatter whitespace trimming',
    'seed skill parser matrix',
  ],
  relatedSlugs: [
    'testing-markdown-xss-react-markdown-rehype-sanitize',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'malformed-skill-md-frontmatter-parser-tests',
    'agent-skill-dangerous-command-static-analysis-tests',
  ],
  sources: [
    'https://yaml.org/spec/1.2.2/',
    'https://github.com/jonschlinkert/gray-matter',
    'https://zod.dev/basics',
  ],
  content: `
SKILL.md array normalization testing feeds YAML sequences, inline lists, comma-separated strings, empty values, numbers, and mixed items into the real parser. The suite then checks that each supported metadata field becomes the expected string array before schema rules decide whether those values are allowed.

QASkills uses six list fields for tags, test types, frameworks, languages, domains, and agents. Browse the [QA skills directory](/skills) to see those facets, then inspect the [Playwright CLI skill](/skills/Pramod/playwright-cli) as a useful package with several list forms and realistic values.

## How Does YAML List Normalization Work?

YAML list normalization begins after [gray-matter](https://github.com/jonschlinkert/gray-matter) has parsed the frontmatter block into JavaScript values, then the shared parseSkillMd function passes each supported list field to one helper. That helper maps a YAML array through String, splits a string on commas, and returns an empty array for every other type.

The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) supports block sequences and flow sequences, which both normally reach the helper as arrays. A plain scalar reaches it as a string, while numbers, booleans, objects, and null reach the fallback path unless they appear inside an array.

\`\`\`typescript
function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
\`\`\`

That small function has an asymmetric contract because CSV strings are trimmed and empty items disappear. YAML array items become strings without trimming or filtering, so \`[e2e, 7, null]\` becomes \`['e2e', '7', 'null']\`.

Write tests for behavior before deciding whether to change it, since the current result may be accepted compatibility for old files or data that the schema should reject. A test should show the exact stage and value rather than label every conversion as safe.

| Source form | Parser input type | Current normalized value | Next check |
| --- | --- | --- | --- |
| Block sequence | Array | Each item passed through String | Zod field rules |
| Flow sequence | Array | Each item passed through String | Zod field rules |
| CSV scalar | String | Split, trim, remove empty items | Zod field rules |
| Empty scalar | Null or string | Empty array or filtered array | Required-list rule |
| Number scalar | Number | Empty array | Missing-list behavior |
| Object | Object | Empty array | Shape error policy |

Use the [SKILL.md format guide](/blog/skill-md-format-guide) as the author-facing form. The parser suite may accept older forms, but new docs should still recommend one clear style.

SKILL.md array normalization testing must compare all six fields. A helper change affects every facet, even if one test only mentions tags. Parameterized rows keep that blast radius visible.

## When Is Comma Separated Frontmatter Accepted?

Comma separated frontmatter is accepted when gray-matter returns the field as a string. The helper splits at every comma, trims each part, and removes empty parts. This supports old files such as \`frameworks: playwright, vitest\`, but it cannot represent one item that contains a comma.

State that tradeoff in tests. A CSV scalar is a compatibility input, not a lossless list format. When one label may contain a comma, authors need a YAML sequence with a safely quoted item.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';

function skillWith(line: string): string {
  return [
    '---',
    'name: Array Parser',
    'description: Check old and current list forms.',
    'version: 1.0.0',
    'author: QA Team',
    'license: MIT',
    'testingTypes: e2e',
    'languages: typescript',
    line,
    '---',
    '',
    'Use this skill to test list parsing with clear checks.',
  ].join('\\n');
}

describe('comma separated frontmatter', () => {
  it('splits, trims, and removes empty CSV entries', () => {
    const parsed = parseSkillMd(skillWith('frameworks: playwright, vitest, , jest'));

    expect(parsed.frontmatter.frameworks).toEqual(['playwright', 'vitest', 'jest']);
  });

  it('keeps a quoted comma inside a YAML sequence item', () => {
    const parsed = parseSkillMd(skillWith('tags: ["api, contract", qa]'));

    expect(parsed.frontmatter.tags).toEqual(['api, contract', 'qa']);
  });
});
\`\`\`

Do not write a test that expects CSV input to preserve an embedded comma because the current syntax cannot tell whether the comma separates items or belongs inside one item. Test the limit and direct authors to a YAML sequence.

Add spacing rows with no spaces, one space, tabs around values, leading commas, trailing commas, and repeated commas. The current string path drops blank entries. If preserving an empty item becomes a real need, change the contract and schema together.

The [Agent Skills portability guide](/blog/agent-skills-open-standard-portability) helps teams choose forms other tools can read. YAML sequences are easier to share than a local CSV shortcut, so compatibility tests should not turn the shortcut into the only documented form.

SKILL.md array normalization testing should keep one CSV fixture for each of the six fields. This proves old packages remain readable while the preferred writer emits standard arrays.

## How Do You Test the toStringArray Parser?

A toStringArray parser test reaches the private helper through parseSkillMd and checks the public parsed result. This avoids exporting an implementation detail only for tests. It also includes gray-matter conversion, field defaults, and the object shape that callers use.

Build a case table with a frontmatter line and expected array. Run each row against tags, testingTypes, frameworks, languages, domains, and agents. The same source syntax may later get a field-specific schema result, but normalization should remain clear.

\`\`\`typescript
const cases = [
  { yaml: '[playwright, vitest]', expected: ['playwright', 'vitest'] },
  { yaml: 'playwright, vitest', expected: ['playwright', 'vitest'] },
  { yaml: '[]', expected: [] },
  { yaml: '""', expected: [] },
  { yaml: '[7, true, null]', expected: ['7', 'true', 'null'] },
  { yaml: '7', expected: [] },
] as const;

for (const field of ['tags', 'testingTypes', 'frameworks', 'languages', 'domains', 'agents'] as const) {
  it.each(cases)(\`normalizes \${field}: $yaml\`, ({ yaml, expected }) => {
    const raw = baseSkill.replace('__FIELD__', \`\${field}: \${yaml}\`);
    const parsed = parseSkillMd(raw);

    expect(parsed.frontmatter[field]).toEqual(expected);
  });
}
\`\`\`

The mixed array case documents current conversion, not approval. Zod may reject values such as \`7\` for a constrained field. Keep a parser assertion and a later schema assertion so a future normalization change does not hide why validation changed.

Test missing fields too because the parser passes undefined into the helper, which returns an empty array. This is useful for optional arrays but required lists still need schema checks.

The [validation in CI guide](/blog/validate-skill-md-in-ci-pipeline) shows where parse and schema stages belong. Parse tests answer "what value did we read," while schema tests answer "is that value valid for this skill."

Prefer direct equality over broad containment because a duplicate, lost item, extra blank, or changed order can affect filters and agent support. Exact arrays make those faults easy to see.

Use focused test data because very long seed files are good for broad checks but can obscure one helper rule. A small valid base file with one replaced line gives fast, clear failures.

## Handle an Empty Skill Metadata Array

An empty skill metadata array can come from a missing field, an empty YAML sequence, an empty quoted string, a CSV string with only commas, null, or an unsupported scalar. These inputs do not all mean the same thing, even when the parser returns \`[]\`.

Build a decision table before changing behavior:

- A missing optional field may normalize to an empty list without error.
- A missing required field should fail schema validation after parsing.
- An explicit empty sequence can be valid syntax but invalid domain data.
- An empty string can mean an author supplied a field with no items.
- Null may show an incomplete edit and deserves a useful field error.
- A number or object is the wrong source shape and should not vanish without evidence.

The current parser turns null, numbers, booleans, objects, and undefined into an empty array. Because information is lost at that point, the schema may report only a missing minimum item rather than the original wrong type. Record that limitation in the test plan.

One option is to keep raw data for diagnostics before normalization. Another is to make the parser reject unsupported source types. Choose based on backward compatibility, then add tests before implementation.

SKILL.md array normalization testing should never infer a default framework, language, or agent from an empty field. Defaults can publish false compatibility claims. Let schema validation or a clear author prompt handle missing lists.

The [high-quality skill guide](/blog/how-to-write-high-quality-qa-skills) explains why explicit metadata helps discovery. Use that rule in error messages: tell the author which field needs at least one supported value.

Test blank CSV values with spaces and tabs. The string path trims and filters them, so the result should be empty. Test a YAML sequence containing an empty quoted item separately because the array path currently preserves it as an empty string.

That difference is a good regression case. If the team later filters both paths, the test update should cite the new compatibility rule and confirm no valid item is lost.

Preserve source-shape evidence until the validator has made its choice, since an empty result alone cannot show whether the author omitted a field or supplied an object. A small parsed-source record can improve errors without changing the normalized object that current callers already expect.

Check downstream storage with one route test because a blank or padded list can enter JSON data and then fail exact filters long after parsing. The route case should seed one clean skill and one bad value, then prove invalid metadata never becomes a visible filter choice.

## Convert Mixed YAML Array Values

Mixed YAML array values may contain strings, numbers, booleans, null, nested arrays, or objects. The current helper converts every top-level item with String. That can create surprising values such as \`"a,b"\` for a nested array and \`"[object Object]"\` for an object.

Do not claim this conversion validates the list. It only normalizes a JavaScript array to a string array. The schema must reject values outside supported enums or formats, and broad fields such as tags may need explicit shape protection.

Add mixed cases that reveal each conversion:

- \`[e2e, 7]\` becomes \`['e2e', '7']\`.
- \`[true, false]\` becomes \`['true', 'false']\`.
- \`[null]\` becomes \`['null']\`.
- \`[[api, web]]\` may become \`['api,web']\`.
- \`[{name: playwright}]\` may become \`['[object Object]']\`.
- \`[' api ', e2e]\` keeps spaces in the quoted first array item.

These outcomes may be defects for the product contract. The test should first show present behavior, then a schema or desired-behavior test should fail until the parser rejects or cleans the source. Avoid blessing odd strings merely because TypeScript now sees \`string[]\`.

The [frontmatter schema guide](/blog/cursor-skill-md-frontmatter-schema-guide) provides valid examples for common fields. Pair each mixed invalid row with one valid row so the suite keeps helpful input working.

For tags, decide whether any nonempty string is allowed. If so, objects and nested arrays still need rejection because their string output was not authored text. For agents and test types, enum checks should reject unknown strings after normalization.

SKILL.md array normalization testing should include error-path assertions as well as parser output. A parser unit test can record current conversion, while a validator test requires a field-specific issue. This two-part design supports a safe migration.

Do not use JSON stringification as an automatic fix. It would preserve structure as text but still turn wrong source shapes into misleading tags. Reject unsupported shapes unless a written use case says otherwise.

## Verify Frontmatter Whitespace Trimming

Frontmatter whitespace trimming differs between CSV strings and YAML sequence items. CSV values pass through trim, while array values pass only through String. This means \`frameworks: playwright, vitest\` is clean, but a quoted sequence item such as \`" playwright "\` keeps its spaces.

Write paired cases for each syntax. The result should either document the difference or enforce one chosen rule. Do not hide it with \`.map(value => value.trim())\` in the assertion because callers receive the untrimmed value.

Whitespace can change filters, equality, and lookup. A framework named \`" playwright "\` will not match \`"playwright"\`, even though the page may make the space hard to see. An agent ID with a tab can fail installation routing.

Test ordinary spaces, tabs, carriage returns inside quoted scalars, nonbreaking space policy, and blank items. Keep source and parsed values in failed messages with visible escapes.

The [QA skills directory](/skills) relies on exact facet values. Add one API or seed test that proves a normalized framework reaches the expected filter, while parser unit tests cover the full whitespace table.

Decide where trimming belongs. Parser-level trimming gives every caller one value, but it may remove intentional spaces in free-form tags. Schema transforms can set field-specific behavior. Writer validation can stop bad output before it reaches storage.

State the rule per field:

- Agent IDs, languages, frameworks, domains, and test types should match canonical values without outer space.
- Tags may still reject outer space while allowing inner spaces such as "visual testing".
- Empty items should not become discoverable values.
- Duplicate values after trimming need a clear keep, reject, or deduplicate rule.

SKILL.md array normalization testing turns those rules into visible cases. Without it, one helper change can fix CSV data while leaving YAML sequence data inconsistent.

## Build a Seed Skill Parser Matrix

A seed skill parser matrix runs all checked-in SKILL.md packages through parse, schema, and selected metadata checks. The current repository contains 413 seed files, which makes the catalog a valuable compatibility corpus.

Do not replace focused unit cases with this matrix. Most seeds use normal values, so they may not cover commas, mixed types, or empty items. The broad matrix finds accidental breaks across real authors, file layouts, and field combinations.

For each file, record path, parse result, schema result, list field types, and any blank or padded item. Fail with the file path and field so owners can repair one package quickly.

\`\`\`typescript
for (const filePath of seedSkillPaths) {
  it(\`parses list metadata in \${filePath}\`, async () => {
    const raw = await readFile(filePath, 'utf8');
    const parsed = parseSkillMd(raw);

    for (const field of arrayFields) {
      expect(Array.isArray(parsed.frontmatter[field]), \`\${filePath}: \${field}\`).toBe(true);
      expect(
        parsed.frontmatter[field].every((value) => value === value.trim() && value.length > 0),
        \`\${filePath}: \${field}\`,
      ).toBe(true);
    }
  });
}
\`\`\`

If that stricter check fails on existing files, produce an audit first. Do not silently rewrite 413 packages in a parser test. Classify invalid source, compatibility syntax, and parser defect, then plan migrations.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) should stay as a named smoke case because it is a promoted skill and uses several metadata arrays. A named case gives faster context than only a generated file index.

Track catalog counts only as evidence at the tested commit. New skills will change the count. Discover paths at runtime and assert a sensible nonzero floor rather than freezing 413 forever.

SKILL.md array normalization testing gains confidence from both layers: small tables prove rules, and the seed matrix proves those rules work on current content. Neither layer can replace the other during review because one explains the rule while the other measures its effect on checked-in packages.

Add a catalog summary that counts each source form by field, but keep the report free of full bodies and private repository data. This evidence shows whether a planned compatibility change affects one old file or a broad set of packages before code behavior moves.

Run duplicate and canonical-value checks beside parsing because two source values can become equal after trimming or case rules change. Report both source items and the chosen policy, then require an explicit migration rather than dropping one value during a routine build.

Shard the broad matrix by stable file path when CI time grows, and keep one final job that joins all shard reports. Each path must run once, while missing shards or duplicate paths should fail the job instead of producing a partial green result.

## Run the Normalization Procedure

Run the normalization procedure whenever gray-matter, YAML parsing, shared types, schemas, writers, seed files, or list facets change. Keep each result tied to the exact repository commit.

1. Create a minimal valid SKILL.md with placeholders for all six list fields.
2. Replace one field with a block sequence, flow sequence, CSV scalar, or edge value.
3. Parse through parseSkillMd without mocking gray-matter or the helper.
4. Compare the exact normalized array, including order, duplicates, spaces, and empty items.
5. Validate the parsed object and assert field-specific outcomes for unsupported values.
6. Repeat the case across tags, testingTypes, frameworks, languages, domains, and agents.
7. Run all discovered seed packages through the broad parser and schema matrix.
8. Save the smallest new failure as a focused unit case before repairing code.
9. Review compatibility notes before changing CSV or mixed-type behavior.

Run unit tables in the shared package because the parser lives there. Run the catalog matrix from a package that can resolve seed paths in CI. Avoid environment-specific absolute paths.

Separate expected invalid fixtures from the seed catalog. Production seeds should remain valid, while a test fixture folder can hold malformed and legacy forms with clear expected results.

Use the [CI skill validation guide](/blog/validate-skill-md-in-ci-pipeline) to make this matrix a required check. Report parse, normalization, and schema failures as distinct labels.

When behavior changes, update docs and migration tools with the code. A parser that suddenly stops accepting CSV strings can break older packages. A parser that starts trimming array items can merge values and affect duplicates.

Keep SKILL.md array normalization testing deterministic because no network, clock, database, or browser is needed for the core matrix. Failures should be fast, local, and repeatable across supported Node versions.

Publish a compatibility note when accepted source forms change, with the old input, new rule, repair command, and first release that enforces it. Run the old row during the notice window so maintainers can see the planned break before packages stop loading.

For a parser fix, compare catalog reports from the base and proposed commit, then review every changed normalized value. A count-only report is not enough because one altered agent ID can break the install path even when total list sizes stay equal.

## Define a Stable Compatibility Contract

A stable compatibility contract names accepted source forms, normalized results, rejected shapes, trimming rules, duplicate rules, and error behavior. It lets maintainers improve the parser without guessing which odd inputs are accidental dependencies.

Prefer YAML sequences for new content. Keep CSV support only if existing packages need it, and document that commas cannot appear inside one CSV item. Reject objects and nested lists unless a real field use case supports them.

Define whether array items are trimmed. Canonical identifier fields should not carry outer space. If tags allow broad text, they still need a clear empty and duplicate policy.

Do not turn String conversion into a safety claim. It satisfies a TypeScript shape but can hide wrong YAML types. Pair normalization with Zod schema checks and good diagnostics, using the [Zod basics guide](https://zod.dev/basics) as the library reference for parsed-data validation.

Browse [QA skills](/skills), install the [Playwright CLI skill](/skills/Pramod/playwright-cli), and run the table plus all-seed matrix against the shared parser. Keep every found edge as a named case, then document any compatibility change before release.

## Frequently Asked Questions

### Why does the parser accept CSV strings at all?

CSV strings support older or hand-written frontmatter that did not use YAML sequences. They are simple for basic values but cannot represent an item containing a comma without ambiguity. Keep compatibility tests if real packages rely on them, while recommending standard YAML sequences for new skill files.

### Should YAML array items be trimmed automatically?

Canonical IDs usually should not keep outer whitespace, but free-form values need a stated rule. Apply trimming consistently at the parser or schema layer and test duplicates created by trimming. Do not trim only in assertions because that hides the value callers actually receive.

### What happens to numbers inside a YAML sequence?

The current helper maps each array item through String, so a number becomes numeric text. That normalization does not make the value valid. Field schemas should reject unsupported framework, agent, language, domain, or test-type values and should give a useful path in the error.

### Is an empty normalized array always valid?

No. It only describes the parser output. Optional list fields may allow it, while required fields need one or more supported items. Tests should preserve whether the source was missing, explicitly empty, null, or the wrong type when diagnostics need that distinction.

### Can the seed catalog replace parser unit tests?

No. The catalog proves compatibility with current real files, but it may not contain each edge. Small unit tables cover CSV commas, mixed values, blanks, and spacing with exact expected output. Run both layers together because they answer different questions.

### Should normalization remove duplicate list values?

Only if the product contract says so. Silent deduplication can change order or hide author errors. Test duplicates as input, decide whether to preserve, reject, or remove them, and apply the same rule across all accepted YAML forms and each affected metadata field.
`,
};
