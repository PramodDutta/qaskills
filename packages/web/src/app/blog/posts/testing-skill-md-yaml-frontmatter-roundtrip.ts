import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md YAML Frontmatter Testing',
  description:
    'SKILL.md YAML frontmatter testing covers quotes, colons, arrays, Unicode policy, parse-serialize round trips, malformed values, and metadata equality.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md YAML frontmatter testing',
  keywords: [
    'SKILL.md YAML frontmatter testing',
    'YAML scalar escaping test',
    'SKILL.md round trip',
    'frontmatter array serialization',
    'gray-matter parser test',
    'special character metadata',
    'YAML malformed value',
    'skill metadata equality',
  ],
  relatedSlugs: [
    'testing-markdown-xss-react-markdown-rehype-sanitize',
    'skill-md-csv-yaml-array-normalization-tests',
    'malformed-skill-md-frontmatter-parser-tests',
    'agent-skill-dangerous-command-static-analysis-tests',
  ],
  sources: [
    'https://yaml.org/spec/1.2.2/',
    'https://agentskills.io/specification',
    'https://github.com/jonschlinkert/gray-matter',
  ],
  content: `
SKILL.md YAML frontmatter testing writes metadata with difficult scalar and array values, parses the file again, and compares meaning rather than raw text. The core suite covers quotes, colons, hashes, brackets, commas, line breaks, empty values, and malformed YAML so damaged metadata cannot pass unnoticed.

This boundary matters because QASkills builds downloadable skill files from database rows and also parses checked-in skill packages. Start with the [SKILL.md format guide](/blog/skill-md-format-guide), then use the [Playwright CLI skill](/skills/Pramod/playwright-cli) as a real file whose tags, agents, and framework arrays must survive the same path.

## How Do You Write a YAML Scalar Escaping Test?

A YAML scalar escaping test should pass one difficult value at a time through the writer and parser. It must compare the parsed value with the original input. A string search alone can miss valid alternate quoting or accept text that changes meaning.

The current web helper builds frontmatter lines with direct string interpolation. It does not quote or escape scalar values. A name such as "API: Contract QA" can become a mapping error, while a description containing a hash can lose text when YAML treats the rest as a comment.

\`\`\`typescript
for (const [key, value] of Object.entries(frontmatter)) {
  if (Array.isArray(value)) {
    yamlLines.push(\`\${key}: [\${value.join(', ')}]\`);
  } else {
    yamlLines.push(\`\${key}: \${value}\`);
  }
}
\`\`\`

Treat that code as a defect target, not proof of safe output. A good test should fail today for cases that lose meaning. The failure gives the team a clear reason to replace hand-built YAML with a library or a complete escaping policy.

The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) defines plain, single-quoted, double-quoted, block, and flow styles. Your test does not need to demand one style. It should demand that a conforming parser returns the same text.

Build a table with the input, expected parsed value, and risk. Keep every row small enough that a failed case names one rule.

| Input value | Main risk | Expected result |
| --- | --- | --- |
| API: Contract QA | Colon starts a mapping | Exact original string |
| Coverage # required | Hash starts a comment | Exact original string |
| He said "run" | Quotes break manual quoting | Exact original string |
| [web, api] | Brackets become a flow list | One string when used as a scalar |
| line one plus a line break | Newline changes document shape | Exact multiline value |
| yes or null | Implicit type confusion | String value, not boolean or null |

Use test names that show the character and field. "keeps a colon in description" helps more than "case 4 failed." This is the first layer of SKILL.md YAML frontmatter testing because arrays and full documents build on correct scalar handling.

## What Must a SKILL.md Round Trip Preserve?

A SKILL.md round trip must preserve the meaning of every supported metadata field and the Markdown body. Formatting may change between block and flow arrays, but names, descriptions, versions, authors, licenses, lists, token values, and body text must stay equal.

The shared parser uses gray-matter to split the YAML block from content. The serializer then writes a new block with quoted scalars and block arrays. The [gray-matter documentation](https://github.com/jonschlinkert/gray-matter) describes this parse and stringify role, but repository tests still need to cover the fields QASkills maps.

The current shared serializer wraps strings in double quotes without escaping embedded quotes, backslashes, or line breaks. That means a value can produce malformed YAML or changed text. Record those failures directly instead of skipping difficult input to keep the suite green.

\`\`\`typescript
const yaml = [
  '---',
  \`name: "\${frontmatter.name}"\`,
  \`description: "\${frontmatter.description}"\`,
  \`version: "\${frontmatter.version}"\`,
  \`author: "\${frontmatter.author}"\`,
  \`license: "\${frontmatter.license}"\`,
  frontmatter.tags.length
    ? \`tags:\\n\${frontmatter.tags.map((tag) => \`  - \${tag}\`).join('\\n')}\`
    : '',
  '---',
].filter(Boolean).join('\\n');
\`\`\`

Define equality at the parsed object level. Sort only fields whose order is not part of the contract. For tags and agents, order may be presentation data, so preserve it unless the product clearly states otherwise.

A complete round-trip matrix should include these checks:

- The parsed name equals the original name as one string.
- The parsed description keeps every visible character and line break.
- The version remains a string and does not become a number.
- The author and license retain punctuation and spaces.
- Each array keeps item order, count, duplicates policy, and empty strings policy.
- Numeric token limits remain numbers when those fields are present.
- The body keeps headings, code fences, lists, and trailing text.
- A second serialization produces the same parsed meaning as the first.

The [portable Agent Skills guide](/blog/agent-skills-open-standard-portability) explains why meaning matters across tools. One client may reformat YAML, yet every client should still read the same skill metadata and body.

SKILL.md YAML frontmatter testing should also check raw retention. The parser returns the original raw file, so assertions can prove diagnostics point to the supplied text. Do not confuse that property with semantic round-trip safety.

## How Do You Test Frontmatter Array Serialization?

A frontmatter array serialization test feeds items with commas, brackets, quotes, hashes, colons, spaces, and empty text into every list field. It then parses the output and compares item boundaries, values, order, and count.

The web builder writes flow arrays by joining items with comma and space. This is unsafe when one item contains a comma or a closing bracket. The shared serializer writes block items without quoting, which can also change values that start with YAML indicators.

Test tags, testingTypes, frameworks, languages, domains, and agents through one parameter table. Each field uses the same writer rule, yet a test should name the field so future code can add field-specific validation without losing coverage.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd, serializeSkillMd } from '@qaskills/shared';

const arrayCases = [
  ['tags', ['api', 'contract:consumer', 'risk #1']],
  ['frameworks', ['playwright', 'custom,runner', '[legacy]']],
  ['agents', ['claude-code', 'agent "beta"', 'qa team']],
] as const;

describe('frontmatter array serialization', () => {
  it.each(arrayCases)('preserves %s item boundaries', (field, values) => {
    const frontmatter = {
      name: 'Array QA',
      description: 'Checks difficult list values safely.',
      version: '1.0.0',
      author: 'QA Team',
      license: 'MIT',
      tags: [],
      testingTypes: ['e2e'],
      frameworks: [],
      languages: ['typescript'],
      domains: [],
      agents: [],
      [field]: values,
    };

    const raw = serializeSkillMd(frontmatter, 'Use the steps in this skill.');
    expect(parseSkillMd(raw).frontmatter[field]).toEqual(values);
  });
});
\`\`\`

That test may expose present defects. Do not weaken expected values to match broken splitting. Repair the writer, keep the original case, and add a direct assertion around the serialized YAML only when format itself is a public contract.

Block arrays are often easier to read, but quoting rules still apply to each item. A YAML library can select a safe style based on value content. If the product needs stable diffs, configure the library and test semantics plus a small set of style choices.

The [frontmatter schema guide](/blog/cursor-skill-md-frontmatter-schema-guide) lists fields that authors use. Pair those valid field examples with hostile punctuation so the suite tests both normal author flow and parser edges.

Run array cases through both builders if both remain in the codebase. Different output for the same metadata creates support risk even when simple files work. SKILL.md YAML frontmatter testing should make that mismatch clear.

## Build a gray-matter Parser Test

A gray-matter parser test should cover delimiter handling, supported YAML forms, body separation, empty documents, and thrown syntax errors. It should call parseSkillMd rather than gray-matter directly so defaults and array conversion remain part of the result.

Use real strings as fixtures. Avoid mocking gray-matter because parser behavior is the subject under test. Small inline files are easier to read, while one seeded SKILL.md can prove the full stack accepts production data.

The [Agent Skills specification](https://agentskills.io/specification) defines a SKILL.md package around required frontmatter and a Markdown body. It gives the interoperability goal, while the local schema adds QASkills fields. Keep spec rules and local extensions distinct in assertions.

\`\`\`typescript
it('parses frontmatter and leaves the Markdown body intact', () => {
  const raw = [
    '---',
    'name: Browser QA',
    'description: "Run checks: fast and clear"',
    'version: "1.2.0"',
    'author: QA Team',
    'license: MIT',
    'testingTypes:',
    '  - e2e',
    'languages: [typescript]',
    '---',
    '',
    '## Run',
    '',
    'Use \`playwright test\` after setup.',
  ].join('\\n');

  const parsed = parseSkillMd(raw);

  expect(parsed.frontmatter.name).toBe('Browser QA');
  expect(parsed.frontmatter.description).toBe('Run checks: fast and clear');
  expect(parsed.frontmatter.testingTypes).toEqual(['e2e']);
  expect(parsed.frontmatter.languages).toEqual(['typescript']);
  expect(parsed.content).toContain('## Run');
});
\`\`\`

Add rows for an opening delimiter with no close, extra delimiters in fenced code, byte order marks if the platform accepts them, comments, blank lines, and a body that starts at once. Label expected parser errors separately from schema errors.

Do not snapshot the entire parser error text unless stability is a product need. Package versions can change wording. Assert the local validator returns its stable error class and field while logs keep the lower-level cause for developers.

A parser test should not stop at "does not throw." It must check values and body content. Silent coercion can be more harmful than a clear failure because it publishes a skill with changed metadata.

Use the [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) to place these cases before seed import and release. A failing parser fixture should block the build that would publish damaged skill files.

## Cover Special Character Metadata

Special character metadata includes punctuation, control-like text, non-ASCII input policy, line breaks, leading and trailing spaces, and strings that resemble YAML types. Build a documented set based on fields authors can edit rather than random payloads alone.

The repository asks new article content to stay ASCII, but skill authors may use names from many languages. Decide whether the skill format accepts Unicode, normalizes it, or rejects selected code points. A test must express that policy without silently deleting text.

Useful special cases include:

- Colons inside names, descriptions, repository URLs, and version labels.
- Hash characters inside prose where they must not begin a comment.
- Leading hyphens, question marks, ampersands, asterisks, and exclamation marks.
- Single quotes, double quotes, backslashes, tabs, and line breaks.
- Square and curly brackets that resemble flow collections.
- Commas inside one tag or framework label.
- Strings such as true, false, yes, no, null, and numeric-looking versions.
- Leading spaces that are meaningful or should be trimmed by a stated rule.
- Unicode names, composed accents, emoji policy, and right-to-left control policy.

Give every row a reason. Random fuzzing can find more cases, but a reviewed base table proves known requirements. Add property-based input later with bounded character classes and keep the smallest failed sample.

The [guide to writing high-quality QA skills](/blog/how-to-write-high-quality-qa-skills) helps define realistic author text. Use examples from that flow so escaping work does not optimize only for artificial payloads.

SKILL.md YAML frontmatter testing should compare parser output before schema validation. A value may parse correctly but fail a length, enum, or format rule. Report those as separate stages because the repair differs.

Do not trim all values as a hidden fix. Some array paths currently trim comma-separated strings, while YAML sequence items are mapped through String without trimming. Define the desired rule first, then test it consistently.

Add bounded generated cases after the hand-picked table proves each rule, using short strings built from letters, spaces, quotes, hashes, colons, commas, and brackets. Keep the random seed in failed output so any new case can become a small fixed row that every later run will repeat.

Generated input should never replace the reviewed examples because a random value does not explain the product rule or the harm caused by changed text. Use it to find gaps between known cases, then name each useful failure by field, character class, source writer, and parsed result.

Test values from saved database rows as well as direct objects because nulls and old imports may reach the web writer through a different shape. The test should reject bad stored values with a clear field result instead of producing a package whose YAML fails after download.

## Reject a YAML Malformed Value

A YAML malformed value should produce a clear parser failure before schema scoring or publication. Cases include unclosed quotes, broken flow arrays, inconsistent indentation, duplicate document markers, invalid escapes, and mappings where a scalar is required.

Keep malformed cases isolated. One fixture with five defects cannot show which parser rule failed or whether later checks ran. A table with one change per row gives stable regression proof.

\`\`\`typescript
const malformedValues = [
  ['unclosed quote', 'name: "Browser QA'],
  ['broken flow array', 'tags: [e2e, api'],
  ['bad escape', 'description: "bad \\q escape"'],
  ['mapping in scalar field', 'name:\\n  nested: value'],
];

it.each(malformedValues)('rejects %s', (_name, fieldLine) => {
  const raw = \`---\\n\${fieldLine}\\n---\\n\\nBody with enough text for validation.\`;

  expect(() => parseSkillMd(raw)).toThrow();
});
\`\`\`

Some YAML that looks odd is valid. A colon inside a quoted string and a hash inside quotes should parse. Keep valid controls beside malformed rows so a stricter parser change does not reject legal author content.

The validator should return no quality score when parsing fails. A score on unreadable metadata would imply a level of trust that the system cannot support. Save the stable local message and field, while allowing the underlying parser message to remain diagnostic detail.

Malformed output from a repository writer is more serious than malformed user input. Add a test that gives the writer a difficult but supported value, then requires the result to parse. That catches defects before generated downloads reach users.

The [QA skills directory](/skills) depends on predictable packages. Run malformed-value tests during shared package builds and again in the web package where the second writer lives.

## Assert Skill Metadata Equality

Skill metadata equality should compare normalized domain objects after parse, not YAML spacing or quote style. It needs explicit rules for defaults, missing fields, arrays, number fields, and body trimming.

Create one canonical expected object with every supported field. Build variants using block arrays, flow arrays, quoted scalars, and allowed plain scalars. Each variant should parse to that object when the source meaning is the same.

Do not normalize away a writer defect. If one tag becomes two because it contains a comma, the objects are not equal. If a hash truncates a description, the objects are not equal. Equality should reveal lost data rather than hide it.

Defaults need their own cases. The parser supplies version 1.0.0 and license MIT when fields are absent, but required schema fields may still fail. State whether equality compares source fields, parser defaults, or the final validated object.

For body text, parseSkillMd trims outer whitespace. Assert that documented behavior. Preserve internal blank lines, headings, lists, code, and punctuation because those carry the skill instructions.

Use a small custom matcher that prints field differences. A failed deep equality dump can be hard to scan when six arrays are present. Report the field, original value, parsed value, and serialized excerpt.

The [SKILL.md format guide](/blog/skill-md-format-guide) can act as the public contract reference in a failed test. Keep implementation details in test names, but phrase expected meaning in terms authors understand.

SKILL.md YAML frontmatter testing is complete only when both normal and difficult values meet the same equality rule. Passing the common case while dropping punctuation is not acceptable.

Add a second equality check after artifact bytes are read back from the response because transport headers and ZIP creation can hide a writer fault. That case should compare the downloaded SKILL.md with the same source object, while checksum checks remain a separate concern tied to exact bytes.

When a migration changes defaults, compare old source, old parsed data, new output, and new parsed data in one named case. This four-step check shows whether the tool kept meaning, added a stated default, or changed an author value without clear consent.

## Run the Round-Trip Procedure

Run the round-trip procedure on each writer, the shared parser, the validator, and a set of checked-in skills. Keep generated files in memory or a temporary folder so tests do not alter seed content.

1. Create a complete metadata object and body with normal values.
2. Add one difficult scalar or array item for the case under test.
3. Serialize through the exact writer used by the product path.
4. Parse the generated text through parseSkillMd and capture any syntax failure.
5. Compare each semantic field, list order, numeric value, and body section.
6. Validate the parsed result and keep parser errors separate from schema errors.
7. Serialize the parsed object again and repeat the semantic comparison.
8. Add any failed minimal case to a permanent table with its risk note.
9. Run one seeded skill through the same path as a broad compatibility check.

Run this matrix for buildSkillMarkdown and serializeSkillMd. If the product later uses one shared YAML writer, keep a compatibility test for old files and remove duplicate implementation tests only after callers migrate.

Bind failures to the current package versions. A parser upgrade may accept more valid syntax or improve diagnostics. Review changes against the YAML and Agent Skills contracts before updating expectations.

Use file-system tests for line endings and final newlines. Use in-memory tests for most scalar and list cases. This split keeps the main suite quick while still proving downloaded files behave on disk.

The [Playwright CLI skill](/skills/Pramod/playwright-cli) is a useful seed control because it has several arrays and a long body. It cannot replace focused edge cases, but it can catch a broad integration change.

SKILL.md YAML frontmatter testing should block a release when a supported value changes meaning. It should also give a short field-level message so the writer can fix input or the team can repair serialization.

Keep test artifacts only when a case fails, and write them to a job-owned temp path with the commit and case name. This gives reviewers the exact bad YAML without changing seed files or leaving stale output that can affect the next local run.

For pull requests, print the original field value and parsed value as escaped JSON strings, then link the failure to the owned format rule. That view makes spaces, line breaks, and lost punctuation plain while keeping the full skill body out of noisy CI logs.

## Decide When to Use a YAML Library

Use a maintained YAML writer when metadata can contain author-controlled punctuation, lists, multiline text, or future fields. Manual interpolation seems small, but complete scalar and flow-collection escaping has many rules that tests will expose.

A library choice still needs configuration for YAML version behavior, line width, quote policy, array style, key order, and alias handling. Keep schema validation after parsing because safe syntax does not imply valid skill metadata.

Migrate with semantic tests first. Capture current normal output, add difficult cases that should work, replace the writer, and compare parsed objects. Review text diffs for readability without demanding byte-for-byte output unless a cache or signature needs it.

Do not call current manual output safe. The source code does not escape all scalar and array values, so failures are expected for supported-looking text. Treat each failure as a writer defect or a policy gap that must be resolved.

Read the [Agent Skills portability guide](/blog/agent-skills-open-standard-portability), browse [QA skills](/skills), and add the round-trip matrix before changing either writer. Use the verified skill files as controls, then require semantic equality for every new punctuation case.

## Frequently Asked Questions

### Should a round-trip test compare raw YAML text?

Usually no. A YAML writer may choose block arrays, flow arrays, or different quote styles while preserving the same data. Compare parsed fields and body meaning first. Add raw text checks only for a documented format need such as stable diffs, signed bytes, cache identity, or required key order.

### Are quoted YAML strings always safe?

No. Double-quoted strings still require escapes for quotes, backslashes, control characters, and line breaks. Single-quoted strings have different rules. Use a YAML writer or a complete tested escape function, then parse the output and compare the original value instead of trusting visible quote marks.

### Why test both buildSkillMarkdown and serializeSkillMd?

They serve different package paths and currently emit frontmatter with different hand-built styles. A value can survive one path and fail the other. Shared semantic cases expose that drift, support migration to one writer, and prevent downloaded skills from behaving differently than checked-in or CLI-generated files.

### Can schema validation catch broken YAML escaping?

Only after parsing succeeds, and it may not catch changed text that still fits the schema. A truncated description can remain long enough to validate. Round-trip equality detects lost meaning, while schema checks detect required fields, lengths, enums, and types. Both stages are needed.

### What should happen when generated YAML does not parse?

The writer path should fail before publishing or returning an artifact, with a field-level message that does not expose secrets. Tests should preserve the smallest failing value. Do not return a damaged SKILL.md, assign a quality score, or silently remove punctuation to make parsing succeed.

### Does Unicode need separate frontmatter tests?

Yes, if the product accepts Unicode author data. Test normalization, round trips, control characters, and display rules without changing names silently. If a field is intentionally ASCII-only, enforce that rule in the schema and provide a clear error rather than relying on accidental serializer behavior.
`,
};
