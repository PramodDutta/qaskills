import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md raw source preservation Guide',
  description:
    'SKILL.md raw source preservation: prove exact input survives normalized parsing. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md raw source preservation',
  keywords: [
    'SKILL.md raw source preservation',
    'raw field parser tests',
    'exact markdown source retention',
    'ParsedSkill raw contract',
    'SKILL.md byte integrity',
    'normalized content comparison',
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
    'packages/shared/src/types/skill.ts',
  ],
  content: `SKILL.md raw source preservation is proven when \`parseSkillMd\` returns \`raw\` exactly equal to its input string while \`content\` follows a separate trim rule. Tests should compare line endings, comments, quotes, a leading BOM, and trailing spaces without treating exact string equality as proof of original file bytes.

The contract has two useful views of one document. One view supports faithful inspection, while the other supports parsed fields and downstream work.

## What does SKILL.md raw source preservation need to prove?

SKILL.md raw source preservation must prove that parsing never edits, rebuilds, or replaces the string stored in \`ParsedSkill.raw\`. At the same time, tests must show that \`ParsedSkill.content\` is a trimmed body value and should not be used as an archival copy.

The implementation is direct in \`packages/shared/src/parsers/skill-parser.ts\`. The function accepts \`raw: string\`, passes that string to gray-matter, builds a selected frontmatter object, trims the returned body, and returns the original \`raw\` parameter unchanged.

The type contract appears in \`packages/shared/src/types/skill.ts\`. \`ParsedSkill\` has three distinct fields: parsed \`frontmatter\`, trimmed \`content\`, and original input text in \`raw\`.

Tests should assert each field for a different reason. Frontmatter assertions cover semantic values, content assertions cover body normalization, and raw assertions cover exact source-text retention.

This topic is narrower than [YAML frontmatter round-trip testing](/blog/testing-skill-md-yaml-frontmatter-roundtrip). A round trip asks what serialization emits, while raw preservation asks whether the parser keeps the source string beside its trimmed result.

Start with a valid LF document and compare \`parsed.raw\` with \`source\` using exact equality. Then use a separate assertion showing that body whitespace is trimmed from \`parsed.content\`, which proves the two fields intentionally diverge.

Repeat the test with CRLF line endings. Do not normalize expected text through \`replaceAll\`, snapshots, or the operating system, because that would erase the condition under test.

Comments and quoted scalars belong in the source matrix because gray-matter interprets their semantics. The raw assertion should retain their spelling, indentation, and comment markers even when parsed metadata contains only resolved values.

A leading BOM is another source-text case, but its parse result must be characterized against the pinned dependency. Assert exact raw retention if parsing succeeds, then record body and metadata behavior separately rather than guessing.

Trailing spaces should be placed in frontmatter and body lines. The original string must keep them, while the trimmed body may lose only whitespace affected by the outer \`trim\` call.

The [gray-matter project documentation](https://github.com/jonschlinkert/gray-matter) explains the library's frontmatter and content split. Repository assertions should still target the QASkills wrapper, because that wrapper selects fields and applies its own trim.

Use the [format guide](/blog/skill-md-format-guide) for the valid fixture shape. Keep every required field stable so line endings, comments, or spaces remain the only meaningful change.

Malformed YAML needs a different oracle. If gray-matter throws, no \`ParsedSkill\` object exists, so a test cannot demand a returned raw field. Cover that branch in [malformed parser tests](/blog/malformed-skill-md-frontmatter-parser-tests) instead.

The contract is valuable for diagnostics, source display, and future migration tools. It does not say callers will always retain the object, persist \`raw\`, or return it through an API.

## raw field parser tests: current repository behavior

Raw field parser tests should begin with the exact return statement in \`parseSkillMd\`. The identifier \`raw\` in that object refers to the function parameter, not to content regenerated by gray-matter or \`serializeSkillMd\`.

That choice preserves every JavaScript string detail accepted by the function. LF and CRLF markers, indentation, quote choices, comments, blank lines, trailing spaces, and a decoded BOM can remain observable in \`raw\`.

The body follows a different path. Gray-matter returns \`content\`, and the wrapper calls \`content.trim()\` before assigning the public content field.

Outer blank lines and spaces can therefore disappear from \`content\`, while internal body spacing remains unless gray-matter changes it first. Tests should identify the exact wrapper rule instead of using the vague word trimmed for every difference.

Frontmatter values are reconstructed into a new object. Defaults are applied to missing scalar fields, arrays pass through \`toStringArray\`, and unsupported data keys are not represented in the typed frontmatter result.

This reconstruction does not mutate the original input. It creates a semantic view beside the source view, which is why comparing \`raw\` with a serialized result would test the wrong contract.

Use explicit character counts in failure output. A message that reports the first differing code-unit index, nearby escaped text, and both lengths is easier to diagnose than a large snapshot.

For line endings, inspect escaped forms such as \`\\r\\n\`. Printing raw CR characters can make terminal output misleading, especially when a diff tool rewrites lines.

For trailing whitespace, compare exact strings and report line numbers. Do not rely on an editor screenshot or visual inspection, because spaces at line ends may be hidden.

For comments, include a top-level comment, an inline scalar comment, and a list-item comment in separate fixtures. Each placement exercises source retention without making one failed parse hide other cases.

The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) treats comments as presentation detail rather than node content. That explains why semantic parsing need not expose comments as metadata, while QASkills can still retain their source text in \`raw\`.

A quoted value should include characters that reveal whether its spelling survived, such as a colon or hash inside quotes. Assert the parsed value without quotes and the raw line with quotes.

Run these checks through the shared package, not a copied parser. The public function is the contract, and local reimplementation could preserve text while production later changes.

Use one published source from the [skills directory](/skills) only as an additional valid sample. Focused literals remain better regression fixtures because their whitespace and comments are intentional and reviewable.

## Why does exact markdown source retention change the contract?

Exact markdown source retention changes the contract because semantic equality cannot recover presentation choices. Two SKILL.md files can produce equal frontmatter and body values while using different line endings, quotes, comments, spacing, or list styles.

If a tool keeps only parsed metadata and trimmed content, those source distinctions disappear. Calling \`serializeSkillMd\` later creates a valid QASkills form, but it does not recreate the original text.

The raw field gives callers a choice. They can inspect or store exact input text, while using parsed fields for validation, search, scoring, and display.

That choice should remain explicit in APIs. A function named \`getContent\` should not silently switch between \`content\` and \`raw\`, because callers may depend on trimming or source fidelity.

Tests need both positive and negative comparisons. Assert \`parsed.raw === source\`, then assert that \`parsed.content\` equals the expected trimmed body and may differ from the body slice in source.

Do not expect the frontmatter object to preserve key order, quoting, comments, or unsupported keys. Those facts remain available only through the raw string unless a future concrete-syntax tree is introduced.

This is also why [round-trip tests](/blog/testing-skill-md-yaml-frontmatter-roundtrip) have a different success rule. They should compare supported semantics after parse and serialize, while raw tests compare source text immediately after parse.

String preservation is not automatically byte preservation. A caller may have decoded bytes permissively, changed line endings before parsing, or built the string in memory.

The parser can promise only that it returns the string it received. A file-level byte guarantee requires reading a \`Buffer\`, preserving that buffer or its hash, and defining the accepted encoding before conversion.

Name this limitation in test descriptions. "Preserves input string exactly" is supported by the repository, while "preserves original file bytes" needs evidence from the file-reading boundary.

The distinction also affects a BOM. Once a decoder places U+FEFF in the string, exact raw equality can preserve that code point. It cannot prove which byte encoding produced it.

Source retention should not bypass validation. A malformed or invalid skill may still have useful raw text for a higher-level error handler, but the current parser returns no object when gray-matter throws.

If callers need raw text on parse failure, add an error wrapper at the caller. Do not change \`ParsedSkill\` success semantics merely to attach failed input without a reviewed API design.

The narrow pass rule keeps maintenance simple. Successful parses return exact input text in \`raw\`, and each body or field view has its own documented comparison.

## ParsedSkill raw contract test matrix

The ParsedSkill raw contract matrix should compare source detail, exact raw result, semantic result, and trimmed body result. This prevents a passing frontmatter assertion from masking lost presentation text.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| LF source | Newlines use \`\\n\` | \`packages/shared/src/parsers/skill-parser.ts\` | \`raw\` equals source and content equals the trimmed body |
| CRLF source | Newlines use \`\\r\\n\` | Parser return contract | Every CRLF remains in \`raw\`; parsed values remain stable |
| Comments and quotes | Top-level, inline, and quoted forms | gray-matter through QASkills wrapper | Raw text keeps spelling while metadata exposes resolved values |
| Leading BOM | Decoded U+FEFF before the delimiter | Pinned parser dependency | Record parse behavior and require exact raw equality on success |
| Trailing spaces | Spaces after YAML and Markdown text | Raw field plus content field | Raw retains spaces; content follows only the documented trim behavior |
| Unsupported metadata key | Extra valid YAML property | Frontmatter reconstruction | Raw retains the key while typed frontmatter omits it |

Keep expected raw values as named constants, not inline snapshot output. A source constant makes line endings and escapes visible during review.

For CRLF, build the fixture by joining an array with \`\\r\\n\`. This avoids repository checkout settings changing a multiline literal before the test runs.

For comments, use valid YAML placements from the specification. A malformed comment fixture belongs in parser-error coverage and cannot prove a successful raw return.

The BOM row should test the installed gray-matter version rather than a generic YAML parser. If parsing fails, record that result and avoid claiming the QASkills parser returned raw.

Trailing spaces need at least one line inside the body and one near frontmatter. The outer trim can remove trailing body whitespace, but the raw string should still match the input.

The unsupported-key row reveals the value of dual views. Parsed metadata intentionally selects known fields, while raw source keeps information that a future migration or warning tool may inspect.

Do not compare platform text reads in this unit matrix. File-system decoding and newline conversion belong at a separate boundary, while this suite starts with a JavaScript string.

Add the focused command to the [CI validation guide](/blog/validate-skill-md-in-ci-pipeline). Run it on all platforms because helper construction, not checkout conversion, should control expected line endings.

Walk through one CRLF case by hand before the test goes in. Build each line in an array, join with \`\\r\\n\`, and add one last pair so the source end is clear.

Put a short YAML note on its own line and add a quoted name. Add two spaces to one body line, since those marks are hard to see in a normal diff.

Call the parser once and check \`raw\` first. If that match fails, stop the case there because later field checks cannot prove that source text was kept.

Next, check the name and each list field. Those values prove that the same source was parsed, but they do not stand in for the full raw match.

Then check the body against a fixed text value. Write that value by hand so the test does not call \`trim\` and copy the very rule it seeks to guard.

Show CR and LF as slash codes in the fail text. A plain screen diff can hide CR, which makes a sound test look wrong on one host.

Use a small helper to find the first code-unit mismatch. Have it show both lengths and ten escaped signs on each side, but not the full skill text.

Now make an LF twin with the same fields and body. Both files should yield the same field values, while each raw field should match its own source form.

Add the YAML note to one twin and leave it out of the other. The field values may still match, yet raw text must show the note in just one source.

Add a key that the typed fields do not use. Its line must stay in raw text, while the known field map should stay the same as the clean case.

This pair shows why raw text has real use in a move tool. A new tool can read the old key from source even though the main field map does not expose it.

Do not save the parsed content back to the same file in this test. A write step would mix source keep rules with the quite distinct write format.

If byte proof is also in scope, read a buffer before text is made. Check that buffer on its own, then pass a strict text read to the parser and check raw text once more.

The two checks must have clear names. One guards file bytes up to the read step, while one guards the string from the parser call to its return.

For a BOM case, spell out the first bytes and the first text sign. Run the pinned parser and save what it does, rather than base the result on a broad YAML claim.

For a bad YAML case, keep the source in the test harness. Since the parse call may throw, there is no sound reason to ask for a \`ParsedSkill.raw\` field.

Reviewers can now trace each fact to one layer. The file test owns bytes, the parse test owns input text, and field checks own the values drawn from that text.

Keep this worked case small enough to read in one view. Long sample skills make hidden spaces hard to spot and add facts that the raw match does not need.

## How should SKILL.md byte integrity be verified?

SKILL.md byte integrity should be split into two claims: parser input-string equality and optional file-byte equality. The repository proves the first claim through \`raw\`; a separate file test is required for the second.

The first example covers LF, CRLF, comments, and trailing spaces through the public parser. It asserts exact source retention and separately states the trimmed body rule.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';

const lines = [
  '---',
  '# owner note',
  'name: "Source: Probe"',
  'description: A complete source preservation fixture.',
  'version: 1.0.0',
  'author: qa-team',
  'license: MIT',
  'testingTypes: [unit]',
  'languages: [typescript]',
  '---',
  '',
  '  Keep internal spaces.  ',
];

it.each([
  ['LF', '\\n'],
  ['CRLF', '\\r\\n'],
])('preserves the %s input string', (_name, newline) => {
  const source = \`\${lines.join(newline)}\${newline}\`;
  const parsed = parseSkillMd(source);

  expect(parsed.raw).toBe(source);
  expect(parsed.content).toBe('Keep internal spaces.');
  expect(parsed.frontmatter.name).toBe('Source: Probe');
});
\`\`\`

The exact content expectation follows the current outer trim. It should not be generalized into whitespace collapse, since spaces inside body text can remain.

The second example verifies bytes independently, then hands the decoded string to the parser. It makes clear which layer owns each equality assertion.

\`\`\`typescript
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';

it('keeps file bytes and parser text as separate evidence', async () => {
  const expectedBytes = Buffer.from(sourceWithCrlf, 'utf8');
  await fs.writeFile(filePath, expectedBytes);

  const actualBytes = await fs.readFile(filePath);
  expect(actualBytes.equals(expectedBytes)).toBe(true);
  expect(createHash('sha256').update(actualBytes).digest('hex')).toBe(
    createHash('sha256').update(expectedBytes).digest('hex'),
  );

  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(actualBytes);
  const parsed = parseSkillMd(decoded);
  expect(parsed.raw).toBe(decoded);
});
\`\`\`

This file test should use a temporary binary-safe path. It must not rely on Git checkout conversion, editor saves, or a text read that could obscure the byte comparison.

A hash is helpful for fixture diagnostics, but direct buffer equality is the main oracle. Do not treat matching hashes as proof of parser behavior; the parser assertion still compares strings.

For a leading BOM, include its expected bytes and expected decoded U+FEFF explicitly. Then characterize whether the pinned parser accepts the resulting source before asserting a successful \`ParsedSkill\`.

Keep invalid UTF-8 outside this article's central contract. Strict decode failures need their own binary matrix, while raw preservation begins after a valid string exists.

Run a final command-facing check through [how to publish](/how-to-publish). It should validate the parsed fields without rewriting the source fixture merely because parsing succeeded.

## normalized content comparison acceptance criteria

Trimmed content comparison passes when tests state the exact transformation between source body text and \`ParsedSkill.content\`. In the current wrapper, the visible operation is an outer \`trim\`, not a general Markdown formatter.

Build expected content from a literal body value, not by calling \`trim\` inside the assertion. Reusing production logic in expected code could make a regression pass unnoticed.

Outer blank lines, leading body spaces at the start, and trailing body spaces at the end can be removed. Internal line endings and spaces need focused assertions because they are not intentionally rewritten by the wrapper.

Frontmatter is absent from \`content\`, since gray-matter separates it before QASkills trims the body. The raw field still contains delimiters, YAML text, comments, and the body together.

Semantic metadata should equal the expected values after YAML resolution and QASkills defaults. It should not be compared with source spelling when quotes or inline comments are present.

Every successful case must assert \`raw\` first. If a later refactor rebuilds source from parsed values, semantic checks may still pass while exact source retention fails.

Every content case must assert trimmed output separately. If a refactor stops trimming, raw checks will still pass, so content assertions are needed to protect callers.

Unsupported YAML keys should remain in raw input and stay absent from the selected frontmatter object. This is current behavior, not a recommendation to discard data in every future API.

Use [published skills](/skills) as optional integration samples, but keep line-ending and comment cases synthetic. Public content may change and often lacks the exact presentation variants needed by this contract.

Error output should escape CR, LF, tabs, and trailing spaces. A compact first-difference report is more useful than storing an entire source snapshot for every case.

SKILL.md raw source preservation passes when raw equality, semantic equality, and body normalization all succeed through independent oracles. No single deep snapshot should stand in for those three contracts.

## How do you test SKILL.md raw source preservation step by step?

Test SKILL.md raw source preservation with source literals that make otherwise hidden presentation details observable. Compare the input string before checking parsed values, then add a separate byte test only where a file-level promise is required.

1. Read \`packages/shared/src/parsers/skill-parser.ts\` and record the direct \`raw\` return plus \`content.trim()\` behavior while noting that raw is the caller's string, not file bytes
2. Read \`packages/shared/src/types/skill.ts\` and treat \`frontmatter\`, \`content\`, and \`raw\` as separate public fields so no test uses one view in place of another
3. Build a smallest valid LF source with quoted metadata, one comment, body padding, and a final newline whose exact text is held in one named constant
4. Create CRLF, comment-placement, leading-BOM, trailing-space, and unsupported-key variants without normalizing them, with each change made by a helper that never parses text
5. Call \`parseSkillMd\` and assert \`parsed.raw === source\` before any semantic or content checks, then print the first escaped mismatch if the match fails
6. Assert resolved frontmatter values and literal expected trimmed content through independent comparisons, using fixed values written apart from the production trim rule
7. Add a byte-buffer test only if a caller promises file-byte identity, then decode strictly before parsing and compare the buffer before any text value is made
8. Run the matrix on supported platforms and publish escaped first-difference diagnostics in CI with case names that state which layer each result guards

Do not generate expected raw text from \`serializeSkillMd\`. Serialization has a different contract and intentionally emits QASkills' selected formatting.

Keep helper names precise. \`makeSourceWithCrlf\` is clearer than \`normalizeFixture\`, which could hide the direction of a transformation.

Run the raw assertion immediately after parsing. Later helper calls should never overwrite or trim the source variable used as expected data.

When a variant fails to parse, move it to malformed-input coverage or document that dependency result. A failed parse cannot satisfy a successful \`ParsedSkill\` return contract.

Use the [round-trip guide](/blog/testing-skill-md-yaml-frontmatter-roundtrip) for serializer comparisons. The raw suite should remain focused on one parse call and its three output views.

## SKILL.md raw source preservation rollout and regression checks

SKILL.md raw source preservation rollout should begin by locking the current direct-return behavior before parser refactoring. The implementation is small, but a seemingly harmless cleanup could replace \`raw\` with trimmed or serialized text.

Shared package owners should review any change to gray-matter options, content trimming, frontmatter selection, and the \`ParsedSkill\` interface. Each area can affect one view while leaving the others unchanged.

SDK and CLI owners should identify whether they expose raw or trimmed body content. The field name and behavior should remain consistent across callers rather than relying on incidental object access.

Run LF and CRLF tests on every supported platform. Construct line endings in memory so operating-system checkout settings do not decide the expected value.

Run comment and quote tests after gray-matter upgrades. A dependency may change semantic parsing, while the QASkills raw return should still preserve its input string on success.

Keep one unsupported-key case to protect source recovery. A future schema expansion may add that key, but the raw assertion should remain stable either way.

If a concrete-syntax tree is introduced later, do not remove raw string coverage. A tree can improve edits, yet exact source retention still needs direct comparison.

If callers need raw input after a parser exception, design a typed error outside \`ParsedSkill\`. Attaching source to errors has privacy and memory implications that deserve separate review.

Pair source-preserving tools with [malformed parser tests](/blog/malformed-skill-md-frontmatter-parser-tests). Valid raw fidelity and clear failed-parse handling together give authors predictable diagnostics.

Document whether persistence stores raw text, trimmed body, or both. The parser retaining raw in memory does not guarantee a database or API keeps it.

The durable regression set has LF, CRLF, comments, quotes, spaces, one BOM characterization, and one unsupported key. Each case should assert exact raw text plus only the semantic facts it was built to reveal.

## Frequently Asked Questions

### What should raw field parser tests tests assert?

Assert that \`parsed.raw\` is exactly equal to the input string, including line endings, comments, quotes, blank lines, and trailing spaces. Then assert frontmatter values and trimmed body content separately. This ordering catches source loss even when semantic parsing still succeeds.

### How does exact markdown source retention affect the SKILL.md contract?

It gives callers an archival text view beside trimmed fields used for validation and display. The raw field retains presentation choices that parsed metadata cannot reconstruct. It does not guarantee callers persist that field, and it does not prove original file-byte equality.

### Which fixture best exposes ParsedSkill raw contract?

Use a valid CRLF document with a YAML comment, a quoted scalar containing a colon, body padding, trailing spaces, and a final newline. Exact raw equality covers every source detail, while separate metadata and content assertions reveal the parser's intended normalization.

### When should teams check SKILL.md byte integrity?

Check bytes when file readers, decoders, Git attributes, upload paths, archives, or persistence layers change. Parser unit tests should still check input-string equality. A file-byte claim needs buffer comparison before decoding because the string parser cannot recover earlier byte transformations.

### What is the pass criterion for normalized content comparison?

The body must equal a literal expected value after only the documented parse and outer trim behavior. Raw input must remain exactly unchanged, and parsed metadata must match resolved semantics. Tests should fail if any view is substituted for another or generated from production logic.

## Conclusion

SKILL.md raw source preservation already has a clear repository boundary: \`parseSkillMd\` returns its input string in \`raw\` and a trimmed body in \`content\`. Add exact LF, CRLF, comment, quote, BOM, and space cases before changing that wrapper.

Open the [skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this source-retention contract before publication. Check string and byte claims at their own layers.`,
};
