import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md body whitespace trimming Tests',
  description:
    'SKILL.md body whitespace trimming: lock leading, trailing, and newline behavior. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md body whitespace trimming',
  keywords: [
    'SKILL.md body whitespace trimming',
    'Markdown body trim tests',
    'SKILL.md leading blank lines',
    'SKILL.md trailing newline policy',
    'gray-matter content whitespace',
    'parser whitespace regression',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'malformed-skill-md-frontmatter-parser-tests',
    'validate-skill-md-in-ci-pipeline',
  ],
  sources: ['https://github.com/jonschlinkert/gray-matter', 'https://yaml.org/spec/1.2.2/'],
  repoEvidence: [
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/web/src/lib/skill-markdown.ts',
  ],
  content: `SKILL.md body whitespace trimming removes all leading and trailing whitespace from the Markdown body because \`parseSkillMd\` calls \`content.trim()\`. That includes blank lines, spaces, tabs, and the final newline. Tests should lock this parsed result, then separately prove that \`buildSkillMarkdown\` appends one newline without first trimming stored body text.

The parser and builder have different jobs, so byte equality is not the right default oracle. A useful suite records source text, parsed content, rebuilt text, and the second parsed result.

## What does SKILL.md body whitespace trimming need to prove?

SKILL.md body whitespace trimming must prove which outer characters disappear and which inner characters stay. It must also show that parsing and rebuilding can change bytes while preserving the body that readers see.

The parser evidence is in \`packages/shared/src/parsers/skill-parser.ts\`. Gray-matter splits frontmatter from \`content\`, then QASkills returns \`content.trim()\`. JavaScript trim removes whitespace from both ends, not just one final line break.

This means leading blank lines before the first heading disappear. Spaces or tabs placed before the first body word also disappear. At the other end, trailing spaces, tabs, and any count of final blank lines all collapse out of parsed content.

Whitespace inside the body remains. A blank line between two sections, spaces inside a code line, and a line break within a list do not sit at either string edge. The trim call has no branch that rewrites those inner characters.

The parsed result also keeps \`raw\`, which is the full input string. That field lets a test show two valid facts at once: normalized \`content\` lacks outer whitespace, while \`raw\` preserves the source bytes supplied to the function.

The web builder has a separate rule in \`packages/web/src/lib/skill-markdown.ts\`. It selects stored \`fullDescription\` when that string is nonempty, otherwise builds a fallback heading and description. Its return template appends a newline after the selected body.

The builder does not trim \`fullDescription\` first. If stored body text already ends with one newline, the output ends with two. If the body came from \`parseSkillMd\`, it has no outer whitespace, so rebuilding adds exactly one final newline.

Tests should state which path supplies the builder input. "Always one newline" is too broad for arbitrary stored text. "One newline after a trimmed parser result" matches the observed round-trip path.

Write the four views in one test note before coding: raw file, gray-matter body, shared parsed body, and web-built file. For each view, state whether edge space is kept, cut, or added, then tie the claim to the call that owns that step. The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) helps define the document and scalar source, while the two repository functions prove the local body rules. This map keeps a source rule from being assigned to a later builder and gives reviewers one place to check the expected flow.

Use [YAML round-trip testing](/blog/testing-skill-md-yaml-frontmatter-roundtrip) for broad metadata preservation. Keep these fixtures focused on body edges, since frontmatter order and quote style would add unrelated byte changes.

The [gray-matter project](https://github.com/jonschlinkert/gray-matter) documents its role in separating data and content. The QASkills trim call remains the direct proof for the final body value.

Use visible marks when a test fails. Print escaped strings or character codes, not blank console lines, so a lost tab and a lost newline do not look the same.

## Markdown body trim tests: current repository behavior

Markdown body trim tests should begin with a body that has no outer whitespace, such as \`Body text\`. The parsed content should equal those nine characters, while raw input should still contain frontmatter and the source delimiter.

Add two blank lines before the body and three after it. The parsed body still equals \`Body text\`. This row proves the method treats repeated line breaks as edge whitespace rather than meaningful empty sections.

Next add spaces and a tab before the first letter. Add another tab and spaces after the last letter. The same expected body shows that the contract is broader than newline cleanup.

An internal blank line needs a different expected value. Parse \`First line\\n\\nSecond line\` with outer blanks around it, then expect the two inner newline characters to remain. This guard stops a future normalization step from collapsing all body spacing.

An internal indented line should remain indented. For example, place four spaces before a command between two plain lines. Assert the exact middle line, because Markdown may use that indentation as a code block.

The empty-body case returns an empty string. A source with only frontmatter and whitespace after the closing delimiter also returns an empty string. Both outcomes are valid parser characterization, not proof that a publish rule allows an empty skill body.

Use a short word such as \`EDGE\` as the body mark in most rows, then place each space, tab, or line break only before or after that mark. When a row fails, show the source and result with JSON text so no one must count blank lines by eye in a test log. Keep the empty row on its own because it has no mark and could pass through a weak contains check by mistake. Add one clean row with no edge space as the first case, which proves the shared source and frontmatter are sound before trim rules run.

Keep value validation out of these rows. \`packages/shared/src/parsers/skill-parser.ts\` does not reject an empty body, and the frontmatter schema does not receive body text. Any nonempty-body rule belongs to another validator layer.

The parser's \`raw\` field should equal the exact input for every case. This assertion proves normalization did not mutate the source copy. It also gives callers a way to inspect original edges when needed.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) for the base document, then hold its frontmatter fixed. Each test should change only characters after the closing delimiter.

Short labels make the table easy to scan: clean, leading blanks, trailing spaces, one final line, many final lines, and empty. Put escaped input and output in failed assertion messages.

## Why does SKILL.md leading blank lines change the contract?

SKILL.md leading blank lines change the contract when tools care about exact bytes rather than rendered Markdown. The parser treats those lines as outer padding and removes them from \`content\`.

A renderer usually shows the same first heading with or without blank lines. A checksum, patch tool, or source editor may not. Tests must say whether they compare meaning, parsed content, or raw bytes.

The \`ParsedSkill\` type makes both views available. Its \`content\` field is normalized, while \`raw\` stores original source. Callers that need byte fidelity should not reconstruct it from the trimmed body.

Serialization cannot restore unknown edge space. Once only \`content\` is passed to another function, the count and kind of removed characters are gone. A rebuilt file can be canonical without being byte-identical.

This distinction also helps with bug reports. If a user says a blank line vanished, first ask whether they read \`raw\`, parsed \`content\`, or a downloaded artifact. Each path has a different owner and expected output.

Ask for three small facts in each report: the call used, the escaped body before it, and the escaped body that came back. A claim about a lost line is hard to place when the report shows only rendered Markdown, since most edge lines have no visible mark. Add the final line count and first nonspace index when the raw values are long, but keep exact strings in the unit test itself. Link the issue to [the format guide](/blog/skill-md-format-guide) only after the failed representation is named, so the fix lands at the right layer.

Do not describe trim as a gray-matter choice. Gray-matter supplies \`content\`, but QASkills calls the native string method after that split. A direct gray-matter test alone would miss the repository's extra step.

The body can start with a fenced code block or an indented block. Outer spaces before the first marker are still trimmed, while spaces on later lines remain. Add one such case if body-leading indentation is part of a supported skill format.

For most skills, a heading starts the body and edge blanks have no visible effect. That common case is still worth a control because it proves the new edge fixtures did not break normal parsing.

Compare the result with [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests). Whitespace after a valid closing delimiter is body input, while broken delimiter placement can change whether gray-matter finds a body at all.

State the selected contract in plain terms: parsed content has no whitespace at either edge, and raw source remains unchanged. That sentence is specific enough for code review and user docs.

## SKILL.md trailing newline policy test matrix

The SKILL.md trailing newline policy matrix should compare parser output and builder output in separate columns. One function removes edge whitespace, while the other always appends a newline to its chosen body string.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Leading blank lines | Two lines before body text | \`packages/shared/src/parsers/skill-parser.ts\` | Parsed content starts at the first nonspace body character |
| Trailing spaces | Spaces and a tab after body text | Shared parser | Parsed content ends at the final nonspace character |
| Single final newline | One line break after body | Shared parser | Parsed content has no final line break |
| Multiple final newlines | Three line breaks after body | Shared parser | Parsed content matches the single-newline case |
| Empty body | Only whitespace after frontmatter | Shared parser | Parsed content is an empty string and raw remains exact |
| Trimmed body rebuild | Parser content passed to builder | \`packages/web/src/lib/skill-markdown.ts\` | Rebuilt document ends with one appended newline |
| Preterminated stored body | Stored body already ends in newline | Web builder | Builder appends another newline because it does not trim first |
| Internal blank and indent | Outer blanks surround two body lines | Shared parser | Edge marks leave while the inner blank line and four-space indent stay byte exact |

The last row guards an important limit. The builder's template always adds one newline, but that act does not mean output has exactly one. Existing edge characters in \`fullDescription\` remain before the appended character.

Count the run of line breaks at the very end instead of checking only that one line break exists somewhere near the body. A small helper may walk back from the last byte and return the count, as long as it does not trim or change the text first. Pair that count with a full expected body slice after the second fence, which proves no inner line was moved while the end was checked. Use one trimmed body, one body with a line break, and one body with two breaks so the append rule is plain across all three rows.

For parser rows, assert exact strings rather than \`endsWith\`. A weak suffix check could pass after inner lines were lost. Full body strings remain small enough for clear equality output.

For builder rows, use \`endsWith('Body\\n')\` only alongside a full expected document or a count of final line breaks. This pair shows both content and edge count without relying on a large snapshot.

The frontmatter generated by the builder is another source of byte change. Keep metadata fixed and inspect only the substring after the second delimiter when testing body policy. A helper may split on known delimiters as long as the fixture itself is valid.

Do not normalize expected text with \`trim()\`. That would copy production logic into the oracle and make every trim result pass. Write literal expected strings with escaped edge characters.

When the matrix fails, show \`JSON.stringify\` values. It renders newlines as \`\\n\`, tabs as \`\\t\`, and spaces inside quotes. A plain text diff can hide the only character that matters.

Add the table to [CI validation guidance](/blog/validate-skill-md-in-ci-pipeline) when the tests ship. The command should run on all supported operating systems because checked source uses LF, while fixtures can still test explicit CRLF if required.

## How should gray-matter content whitespace be verified?

Gray-matter content whitespace should be verified through \`parseSkillMd\`, not through gray-matter alone. That public call includes the repository's trim step and returns both normalized and raw views.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';

const withBody = (body: string) => \`---
name: Whitespace probe
description: A complete description for a body whitespace probe.
version: 1.0.0
author: qa-team
license: MIT
testingTypes: [unit]
languages: [typescript]
---
\${body}\`;

describe('parseSkillMd body edges', () => {
  it.each([
    ['leading blank lines', '\\n\\nBody', 'Body'],
    ['trailing spaces', '\\nBody  \\t', 'Body'],
    ['one final newline', '\\nBody\\n', 'Body'],
    ['many final newlines', '\\nBody\\n\\n\\n', 'Body'],
    ['empty body', '\\n\\n', ''],
  ])('trims %s', (_label, body, expected) => {
    const source = withBody(body);
    const parsed = parseSkillMd(source);

    expect(parsed.content).toBe(expected);
    expect(parsed.raw).toBe(source);
  });
});
\`\`\`

This test is tied to \`packages/shared/src/parsers/skill-parser.ts\`. The source helper adds no trim of its own, and each expected result is literal, so the oracle stays independent.

Add one multiline case after this table. Use \`First\\n\\n    kept indent\\nSecond\` with outer blanks, then assert that exact inner form. This proves trim acts only at the string edges.

The second example verifies the web reconstruction rule in \`packages/web/src/lib/skill-markdown.ts\`. It compares a trimmed body with a body that already has a final newline.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { buildSkillMarkdown, type SkillMarkdownRow } from '@/lib/skill-markdown';

const row: SkillMarkdownRow = {
  name: 'Whitespace probe',
  description: 'A complete description for a body whitespace probe.',
  version: '1.0.0',
  authorName: 'qa-team',
  license: 'MIT',
  githubUrl: null,
  fullDescription: 'Body',
  tags: [],
  testingTypes: ['unit'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

describe('buildSkillMarkdown body ending', () => {
  it('appends one newline to a trimmed body', () => {
    expect(buildSkillMarkdown(row)).toMatch(/Body\\n$/);
    expect(buildSkillMarkdown(row)).not.toMatch(/Body\\n\\n$/);
  });

  it('does not remove a newline already stored with the body', () => {
    const result = buildSkillMarkdown({ ...row, fullDescription: 'Body\\n' });

    expect(result).toMatch(/Body\\n\\n$/);
  });
});
\`\`\`

Avoid a snapshot of the full generated frontmatter unless another contract needs it. These suffix checks are narrow, readable, and paired with fixed row data. A separate builder suite can own field order.

For a true round trip, parse source, put \`parsed.content\` into the row, build, and parse again. The two parsed bodies should match even though the first raw source may have many edge lines and the rebuilt source has one.

Save a stage record with four short fields: source end, first parsed body, built end, and second parsed body. The first and third fields may differ by design, while the two parsed body fields should match byte for byte after outer trim. If that last equality fails, print only the body slices and stage names instead of a large generated frontmatter diff. This record makes an intended source cleanup look distinct from a true change in the text an agent or reader would use.

Use the [publishing guide](/how-to-publish) to decide whether generated files should follow the trimmed-body path. The test should not claim all database rows were normalized unless a write boundary proves that fact.

## parser whitespace regression acceptance criteria

A parser whitespace regression suite passes when outer whitespace disappears from parsed content, internal spacing remains exact, raw source stays unchanged, and builder output follows its documented append rule. Each claim needs its own assertion.

The clean control and empty body are both required. The clean control proves normal text survives, while the empty case proves trim does not add content. Neither case should rely on schema validation because body text is outside the frontmatter schema.

Leading and trailing fixtures must cover spaces, tabs, and line breaks. A test that uses only newlines would understate native \`trim()\` behavior. Keep at least one mixed edge case in the final set.

An internal blank line and an indented inner line protect meaningful Markdown. Their exact strings should pass unchanged. These rows catch any future replacement that normalizes all whitespace instead of only the edges.

The raw assertion should run for every parser row. It guarantees callers still have the supplied document after normalized content is returned. If that contract changes, tests should fail even when rendered body text looks the same.

For each raw check, compare length, first edge mark, last edge mark, and full equality with the source passed to the call. Full equality is the main rule, while the small fields give a fast clue when a failed diff is full of blank space. Do not rebuild the expected raw text from parsed data, since that data has already lost the very edge bytes under test. Keep the source constant in a local variable and pass the same value to both the parser and the raw assertion.

Builder acceptance must distinguish appended count from final count. A trimmed input gains one newline, while a preterminated input gains another. State both cases so code review does not turn a template append into an unsupported canonicalization claim.

Round-trip acceptance should compare parsed meaning. Parse, rebuild, and parse again, then expect equal \`content\`. Raw strings may differ by edge whitespace and generated frontmatter, so byte equality would reject intended normalization.

Failure reports should use escaped strings and final newline counts. They should name parser, builder, or second parse as the failed stage. This small format avoids long raw document dumps.

Use [published skills](/skills) for spot checks after automation passes. A manual view can confirm rendered headings and code blocks, but it cannot replace character-level tests.

SKILL.md body whitespace trimming should remain a parser characterization unless code changes. If a team wants exact source preservation in \`content\`, that is a new contract and requires caller review.

## How do you test SKILL.md body whitespace trimming step by step?

Test SKILL.md body whitespace trimming from raw source through parse, rebuild, and second parse. This order shows exactly where edge characters leave or enter the document.

1. Read \`packages/shared/src/parsers/skill-parser.ts\` and record the \`content.trim()\` return value plus unchanged \`raw\`.
2. Read \`packages/web/src/lib/skill-markdown.ts\` and record the newline appended after the selected body.
3. Create one smallest valid source with a clean body and fixed frontmatter.
4. Add isolated bodies for leading blanks, trailing spaces, tabs, one newline, many newlines, and empty text.
5. Assert exact parsed content and exact raw source for every parser case.
6. Pass trimmed content and preterminated content to the builder, then count final line breaks.
7. Parse rebuilt output again and compare normalized body meaning rather than raw bytes.
8. Add the matrix to CI with escaped failure values and named stages.

Do not use a helper that trims body input. The helper should join literal frontmatter and the supplied body exactly. A small self-check can assert the source ends with the edge characters intended by each row.

Make the helper take one body string and join it after a fixed closing fence with no extra call that may clean, split, or rejoin the value. Before parsing, assert the last few source bytes for each row, which proves the fixture still holds the tab or line breaks named in its label. Keep line ending tests literal and do not let the host system rewrite them through a file read in text mode. This setup gives the production call raw input and keeps the test oracle free from the same trim step.

Run parser cases before builder cases. If the parser contract fails, later round-trip output will be hard to explain. Named stages keep one root cause from appearing as several unrelated failures.

Test LF first because repository files use that line ending. Add CRLF only when cross-platform input is an approved requirement, and write its expected native trim result as a separate row.

Keep body validity apart from whitespace normalization. An empty parsed body may be rejected by another publication rule, but this parser still returns it. The suite should not merge those contracts.

Finish with the command from [validate SKILL.md in CI](/blog/validate-skill-md-in-ci-pipeline). Save escaped expected and actual values so line-end failures remain clear in remote logs.

## SKILL.md body whitespace trimming rollout and regression checks

SKILL.md body whitespace trimming changes should begin with current parser and builder tests on the same revision. Reviewers can then see whether a patch changes trimming, newline append behavior, raw retention, or only diagnostics.

Shared parser owners should review \`content\` and \`raw\` semantics. Web owners should review \`buildSkillMarkdown\`, since stored bodies may not all come from the shared parser. Publication owners should confirm which path feeds each artifact.

If trim behavior becomes narrower, scan callers that expect headings at index zero or no final line break. If it becomes broader, inspect code blocks and lists for lost inner space. Use actual call sites and fixtures rather than predicted impact.

If the builder starts trimming, add a migration check for stored bodies with edge whitespace. Such a change could turn two final newlines into one, but it could also remove leading indentation. Keep those outcomes visible in separate rows.

Run a read-only scan that groups stored bodies by leading space, trailing space, one final break, and more than one final break, then review real counts from the chosen revision. Sample each group with escaped output before a code change, since a broad trim could affect a code block even when the final page looks much the same. Add any shipped rule to [CI validation guidance](/blog/validate-skill-md-in-ci-pipeline) and keep the parser plus builder owners on the same review. Do not promise one canonical end until both stored input and generated output have a test that proves that exact claim.

Regression coverage should include five parser edges, two inner-space controls, two builder endings, and one complete round trip. This set is small enough to run on each shared or web package change.

Before a merge, have one peer read the escaped source and result for the clean row, one mixed edge row, and the full round trip. That peer should mark where each byte is cut or added, then match that mark to the parser or builder named by the test. If a stage has no clear owner, stop the review and fix the test name before a code change makes the path harder to trace. This short read-through catches weak checks that pass on rendered text while a tab, space, or line break has changed in the source.

Run the narrow suite on the same line-end mode used by the repository, then add a separate run only if another mode is part of the supported input rule. Save the code hash, row name, escaped expected text, and escaped actual text when a failure needs review, while leaving large frontmatter blocks out. Ask the shared and web owners to approve any case where first parsed text stays the same but built bytes change at the end. That record gives the next trim or template edit a clear base and keeps a source cleanup from being sold as body preservation.

Do not delete raw-source checks after adding canonical output. Raw and canonical fields serve different needs. A parser can offer normalized content while still preserving the original input for tools that need it.

Use exact field names in reports. Say \`ParsedSkill.content\`, \`ParsedSkill.raw\`, \`fullDescription\`, and rebuilt text. Generic words such as "body" can hide which representation changed.

Pair the suite with [the format guide](/blog/skill-md-format-guide) so author examples use the chosen ending. Generated examples should not promise exact bytes that the parser intentionally removes.

Review this policy whenever trim calls, body fallback logic, template suffixes, or storage normalization changes. Those four sites define the observed edge result.

## Frequently Asked Questions

### What should Markdown body trim tests assert?

They should assert exact parsed content, exact raw input, and one clean control for each edge type. Cover blank lines, spaces, tabs, and an empty body. Add inner blank and indented lines to prove the parser removes only outer whitespace, not meaningful Markdown structure.

### How do SKILL.md leading blank lines affect the contract?

Leading blank lines disappear from \`ParsedSkill.content\` because the parser calls native \`trim()\`. They remain in \`ParsedSkill.raw\`, so byte-aware tools can still inspect the original source. Tests and callers must choose the representation that matches their task and state that choice in each assertion.

### What is the SKILL.md trailing newline policy?

Parsed content has no trailing newline or other edge whitespace. The web builder appends one newline after its chosen body, but it does not remove a newline already stored there. Exactly one final newline is therefore guaranteed only when builder input was already trimmed.

### How should gray-matter content whitespace be checked?

Call \`parseSkillMd\` with literal source strings and compare escaped outputs. Testing gray-matter alone misses the repository's later \`content.trim()\` call. Keep frontmatter fixed, alter only body edges, and assert both normalized \`content\` and unchanged \`raw\`. Use escaped expected strings so every edge mark stays visible.

### What is the pass criterion for parser whitespace regression?

Outer spaces, tabs, and line breaks must follow the documented trim rule, while internal layout remains exact. Raw source must stay unchanged. Rebuilt output must follow the append rule, and parsing that output again must yield the same normalized body meaning.

## Conclusion

SKILL.md body whitespace trimming is explicit in the shared parser: outer whitespace leaves \`content\`, while \`raw\` keeps the supplied file. The web builder then appends one newline without first cleaning stored body edges.

Add the edge matrix and parse-build-parse test before changing either rule. Open the [skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this contract before publication.`,
};
