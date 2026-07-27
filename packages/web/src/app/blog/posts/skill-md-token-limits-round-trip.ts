import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md token limits round trip Tests',
  description:
    'SKILL.md token limits round trip: test whether parsed limits survive serialization. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md token limits round trip',
  keywords: [
    'SKILL.md token limits round trip',
    'minTokens serializer bug',
    'maxTokens metadata loss',
    'token budget frontmatter',
    'SKILL.md field parity',
    'parser serializer contract test',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'malformed-skill-md-frontmatter-parser-tests',
    'validate-skill-md-in-ci-pipeline',
  ],
  sources: ['https://agentskills.io/specification', 'https://yaml.org/spec/1.2.2/'],
  repoEvidence: [
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/types/skill.ts',
  ],
  content: `SKILL.md token limits round trip fails because parsing reads numeric \`minTokens\` and \`maxTokens\`, but \`serializeSkillMd\` never writes either field. After parse, serialize, and parse again, both values become undefined. Tests should pin that current loss first, then require field preservation only when the serializer change is reviewed and shipped.

The type already carries both optional numbers, so the gap lies in output construction rather than type declaration. A four-case matrix can show exactly which values disappear.

## What does SKILL.md token limits round trip need to prove?

SKILL.md token limits round trip must prove whether each optional token field survives every public stage with the same numeric value. The suite should compare initial source, first parse, serialized text, and second parse.

The parser implementation is in \`packages/shared/src/parsers/skill-parser.ts\`. It copies \`data.minTokens\` only when the resolved value has JavaScript type number, and it applies the same check to \`data.maxTokens\`.

Numeric YAML values therefore enter parsed frontmatter. Quoted numeric text does not, because its runtime type is string, and the parser returns undefined for that field. This input distinction needs its own control.

The serializer in the same file builds a fixed array of YAML lines. It writes name, description, version, author, license, and supported metadata arrays. No branch writes \`minTokens\` or \`maxTokens\`.

The shared contract type in \`packages/shared/src/types/skill.ts\` declares both fields as optional numbers. That declaration lets callers hold values returned by parsing, but a TypeScript interface cannot make a serializer include them.

The first parse is successful for numeric limits, so this is not a frontmatter syntax failure. The loss appears only after output is rebuilt. Tests should name that stage rather than saying the parser ignored valid numeric input.

Round-trip equality should compare supported frontmatter fields one by one. A whole-object equality assertion will fail for the two token fields, but it gives a poor report. Field-specific rows show whether one or both paths change.

The current schema also accepts optional numeric limits, yet it adds no order rule between them. A case where minimum exceeds maximum can pass value validation. Keep range ordering separate from serializer preservation.

Use [the YAML round-trip guide](/blog/testing-skill-md-yaml-frontmatter-roundtrip) for broad metadata coverage. This article narrows the check to optional limits that the current writer leaves out.

The [Agent Skills specification](https://agentskills.io/specification) gives a reference for portable skill metadata. It should inform naming and compatibility, while the repository type and parser define current QASkills behavior.

Keep the first fixture plain: minimum \`100\`, maximum \`500\`, and all required fields valid. Distinct nonzero values reveal a swap, omission, or accidental default with one glance.

Write four cards for that case before the test runs: raw keys, first values, output keys, and second values. Put the same field names on each card so a reader can trace one number from source to loss without a full object diff. The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) supports the plain numeric source form, while the shared parser and type prove how QASkills reads and holds it. Keep range rules off these cards, since this check asks only if a value that was read can still be read after the file is built again.

## minTokens serializer bug: current repository behavior

The minTokens serializer bug is an observable field omission in the current writer. The parser returns a numeric minimum, but the generated YAML list has no line for that property.

Start by parsing a literal document with \`minTokens: 100\`. Assert the result is number \`100\`, not text, and confirm raw input still contains the line. This proves source and parser setup are correct.

Call \`serializeSkillMd\` with the parsed frontmatter and parsed body. Search the returned frontmatter block for a line beginning with \`minTokens:\`. The current characterization expects no match.

Parse that output again and assert \`frontmatter.minTokens\` is undefined. This final result proves metadata loss rather than a mere formatting change. The value cannot return because the serialized text never contains it.

Run a control without the token field. It should also produce undefined after both parses, but the two source cases must stay distinct. Otherwise, a test could pass while the first parser stopped reading the field.

Use a quoted source value in another parser-only row. \`minTokens: "100"\` resolves as a string, so the parser intentionally drops it under the current type check. This is not the serializer omission case and should have a separate label.

Show the raw source line next to the first parsed value for both \`100\` and \`"100"\`, then state number or string before any write call starts. The plain number row should hold \`100\`, while the quoted row should hold no token value under the current code. Do not feed a made-up number from the quoted row into the writer, because that would turn a parse rule into a fake write test. This side-by-side check keeps a later coercion choice distinct from the field loss that happens only after a real number was read.

Avoid testing with zero alone. The parser accepts zero because the type check does not depend on truthiness, but a missing field and zero can look alike in weak assertions. Use \`toBe(0)\` if zero support matters.

Negative numbers and decimals also satisfy the parser's number check. No cited code enforces a positive integer. Add those rows only when defining a range policy, and do not mix that new rule into preservation tests.

Use [the SKILL.md format guide](/blog/skill-md-format-guide) to keep required metadata valid. The serializer test should fail only because a token line is absent, not because another field broke the fixture.

When the implementation is fixed, invert the omission assertion and keep the first parse plus second parse checks. The complete three-stage chain guards against writing a quoted or altered value that later fails parsing.

## Why does maxTokens metadata loss change the contract?

MaxTokens metadata loss changes the contract because callers may use the parsed upper bound before serialization, then receive no bound from the rebuilt file. The same logical skill has different metadata across a normal public round trip.

The type promises only that the field may exist, not that every writer preserves it. Still, a function named \`serializeSkillMd\` is commonly expected to emit fields represented by \`SkillFrontmatter\`. Tests should make the supported set explicit.

Body text survives this path with one final newline added, and standard metadata fields are written. Token limits differ because their line builders are absent. That contrast points to the narrow owner without claiming a parser failure.

Downstream effects depend on callers and are not proven here. Do not state that an agent used too many tokens or that a limit was enforced incorrectly. The repository evidence proves only parsed value loss in rebuilt text.

Min and max need separate rows even though the cause is shared. A patch might add one line and forget the other. Pair fields in one test table but assert each exact name and value.

Order also matters for a future writer. Emit minimum and maximum in a stable place near other scalar metadata, then parse output to prove order does not affect meaning. Avoid a full text snapshot unless ordering itself is a published contract.

The source may contain only one limit. A writer should not invent the missing peer. Test minimum-only and maximum-only cases so a fix does not add undefined text, zero, or a made-up default.

The no-fields case should stay clean. Serialization must not output either key when both values are undefined. This negative control is as important as preservation because optional fields should remain optional.

Extract only the first frontmatter block from built text, split it into lines, and compare the exact key set for the two token names. A missing input should yield no token line, while a defined input should yield one line after the planned fix and no line in the current baseline. Keep body text free of those names so a search cannot pass on prose that has no link to frontmatter data. Add a second check after reparse, because a line with blank text or the word undefined is not the same as a valid optional number.

Use [CI validation guidance](/blog/validate-skill-md-in-ci-pipeline) to run the matrix after shared package changes. A compact failure should list field, value before serialization, line presence, and value after reparse.

State the desired rule plainly: defined numeric token limits should survive, and undefined limits should stay absent. That rule does not decide valid ranges, relation checks, or whether limits are required.

## token budget frontmatter test matrix

The token budget frontmatter matrix should cover both fields, either field alone, neither field, quoted text, and zero. Each row needs a first-parse oracle before any serializer assertion.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Both token fields | \`minTokens: 100\`, \`maxTokens: 500\` | \`packages/shared/src/parsers/skill-parser.ts\` | First parse returns both numbers; current serialization omits both |
| minTokens only | One numeric minimum | Parser, writer, second parser | First parse returns minimum; current second parse returns undefined |
| maxTokens only | One numeric maximum | Same public chain | First parse returns maximum; current second parse returns undefined |
| No token fields | Neither key appears | \`packages/shared/src/types/skill.ts\` shape | Both values remain undefined and writer emits no token keys |
| Quoted numeric value | \`minTokens: "100"\` | Parser type guard | Parsed minimum is undefined because source resolves to string |
| Zero limits | Numeric zero values | Parser type guard | First parse preserves zero; current writer still omits both keys |
| Defined values after writer fix | Numeric minimum and maximum including zero | Parser, writer, and second parser | Each first value has one same-name output line and one equal second value while any undefined peer stays absent |
| Review record | Source state, first value, generated key, and second value | Shared package release gate | The stored facts name the exact failed stage and prove the patch changed only token output without changing body text or standard metadata for the checked code revision |

The table describes current output, not the final recommendation. After the writer includes token fields, update only the second-stage expectations for defined numeric values. Keep quoted and absent controls unchanged.

Use literal line checks such as \`/^minTokens:/m\`. A loose substring search could match body text that discusses the field. Better still, isolate text between frontmatter delimiters before checking keys.

The first parse should assert exact values and types. The second parse should also assert exact values once preservation ships. A truthy check would mishandle zero and could miss a swapped minimum or maximum.

Store each row result as field, source state, first type, first value, output line, second type, and second value in that fixed order. For the current code, a defined number has a first value but no output line or second value, which makes the failed stage plain. For a fixed writer, all three value points should match and the output line should use the same field name with a numeric form. This small record also makes a swap easy to see because the minimum row would show the maximum value at one later stage.

For single-field rows, assert the other key is absent from output. This prevents an implementation from writing \`maxTokens: undefined\` or adding a default that no source declared.

Do not derive expected output by calling another YAML writer with the same frontmatter. The test oracle should be field meaning, not a second formatter. Literal key presence plus second parse gives enough proof.

The type row has a narrow role. It proves optional properties are part of \`SkillFrontmatter\`, while runtime tests prove actual support. Avoid treating compile success as round-trip evidence.

Keep body text free of \`minTokens\` and \`maxTokens\` strings when using full-document searches. A simple body such as \`Run the test plan.\` prevents false matches and keeps failed output short.

Link the final matrix from [how to publish](/how-to-publish) after preservation rules ship. Until then, describe omission as current characterization and avoid promising retained limits in generated files.

## How should SKILL.md field parity be verified?

SKILL.md field parity should be verified with one table-driven test that observes all three runtime stages. The first example pins the current loss for both, minimum-only, and maximum-only cases.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd, serializeSkillMd } from '@qaskills/shared';

const sourceWithLimits = (lines: string) => \`---
name: Token probe
description: A complete description for a token round-trip probe.
version: 1.0.0
author: qa-team
license: MIT
testingTypes: [unit]
languages: [typescript]
\${lines}
---

## Instructions

Run the token round-trip probe.
\`;

describe('current token serialization behavior', () => {
  it.each([
    ['both', 'minTokens: 100\\nmaxTokens: 500', 100, 500],
    ['minimum only', 'minTokens: 100', 100, undefined],
    ['maximum only', 'maxTokens: 500', undefined, 500],
  ])('characterizes %s', (_label, lines, minTokens, maxTokens) => {
    const first = parseSkillMd(sourceWithLimits(lines));

    expect(first.frontmatter.minTokens).toBe(minTokens);
    expect(first.frontmatter.maxTokens).toBe(maxTokens);

    const written = serializeSkillMd(first.frontmatter, first.content);
    const second = parseSkillMd(written);

    expect(written).not.toMatch(/^minTokens:/m);
    expect(written).not.toMatch(/^maxTokens:/m);
    expect(second.frontmatter.minTokens).toBeUndefined();
    expect(second.frontmatter.maxTokens).toBeUndefined();
  });
});
\`\`\`

This example executes \`packages/shared/src/parsers/skill-parser.ts\` at both ends. Its first assertions stop a parser regression from being mislabeled as serializer loss.

The second example proves the shared type and schema can represent the two fields before they reach the writer. It also keeps range policy outside this preservation test.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema, type SkillFrontmatter } from '@qaskills/shared';

const complete: SkillFrontmatter = {
  name: 'Token probe',
  description: 'A complete description for a token round-trip probe.',
  version: '1.0.0',
  author: 'qa-team',
  license: 'MIT',
  tags: [],
  testingTypes: ['unit'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
  minTokens: 100,
  maxTokens: 500,
};

describe('token fields in the shared contract', () => {
  it('accepts numeric optional limits', () => {
    const result = skillFrontmatterSchema.safeParse(complete);

    expect(result.success).toBe(true);
    expect(complete.minTokens).toBe(100);
    expect(complete.maxTokens).toBe(500);
  });
});
\`\`\`

The type used here comes from \`packages/shared/src/types/skill.ts\`. Runtime schema acceptance is useful context, but serialization remains the only test that can prove output retention.

After a writer fix, change the two negative line checks into exact positive checks. Expect second-parse values to equal the first values. Keep the absent-field row to prove no empty key is emitted.

Review the patch with one minimum-only source and one maximum-only source before the both-fields case, since those rows show whether each branch stands on its own. The new lines should check for a defined number and write only that key, without adding the peer or a zero default. Run the old baseline first, save its short field record, then run the patched code and compare only the output and second-parse columns. This focused diff proves the first parser stayed the same while the writer gained the two missing paths.

Add a zero row with \`toBe(0)\`, since zero often exposes truthy guards. The current parser uses a type check and preserves zero, while the fixed serializer should do the same.

For failure output, print a small object with source value, first value, output key presence, and second value. Do not dump the whole frontmatter unless another field also changed.

Use [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) for nonnumeric syntax or broken YAML. Quoted numbers here are valid YAML and test the parser's runtime type rule.

## parser serializer contract test acceptance criteria

A parser serializer contract test passes when it identifies current loss without hiding the successful first parse. Once the writer is fixed, defined numeric values must appear as numbers and survive the second parse.

Both token fields require independent assertions. The "both" row catches broad omission, while single-field rows catch accidental pairing or default creation. Keep all three after implementation changes.

The absent row must emit no token keys. Optional means no line should appear for undefined values. Never accept the text \`undefined\`, an empty value, or an automatic zero.

For each optional field, test absent, zero, and a nonzero number as three source states that must not share one loose truthy branch. Absent should write no line, zero should write a zero line after the fix, and a nonzero number should write its exact value. Reparse all three outputs and compare undefined, zero, and the chosen number with strict checks that cannot merge those states. Keep minimum and maximum in separate rows as well, since a shared helper can still pass the wrong key name to the same write branch.

The quoted-number row must remain distinct. Under current parsing, text \`"100"\` does not become a numeric limit. A serializer fix should not alter input coercion unless that separate policy is reviewed.

Zero deserves an exact case because it is numeric but falsy. A new writer should check \`typeof value === 'number'\` or undefined explicitly, not rely on truthiness. The test should guard that choice.

Range checks do not belong in the preservation oracle. The schema currently accepts optional numbers without integer, positive, or min-before-max refinements. Add such rules with their own cases and migration plan.

Body equality should compare parsed content, not raw output bytes. The serializer appends a final newline and uses its own YAML formatting. Token field parity can pass even when source quotes or field order change.

Diagnostics should name the field and stage. "maxTokens missing after serialize" is useful, while "objects differ" forces a reader to inspect a large diff. Keep expected and actual numeric values beside the name.

Scan real skills before changing output if external tools consume exact frontmatter sets. Report actual uses and parser values from the checked revision. Do not guess adoption or downstream impact.

Use [published skills](/skills) for a manual artifact check after tests pass. Downloaded text should show defined limits only once, but automated parse-serialize-parse coverage remains the gate.

## How do you test SKILL.md token limits round trip step by step?

Test SKILL.md token limits round trip by proving initial numeric parsing, checking output keys, and parsing the generated text again. The ordered flow prevents one missing stage from producing a false diagnosis.

1. Read \`packages/shared/src/parsers/skill-parser.ts\` and list token read guards plus every line emitted by \`serializeSkillMd\`.
2. Read \`packages/shared/src/types/skill.ts\` and confirm both token fields are optional numbers.
3. Build one smallest valid source with distinct numeric minimum and maximum values.
4. Add minimum-only, maximum-only, no-field, quoted-number, and zero variants.
5. Assert exact first-parse values and runtime types before serialization.
6. Inspect only generated frontmatter for each token key, then parse that output again.
7. Record current omission, or require exact preservation after the writer change ships.
8. Add the matrix to CI and show field-level stage data for every failure.

Keep one body string for all rows and avoid token names in that body. This makes frontmatter key searches safe and failed text short. A helper can extract the first delimiter block for added certainty.

Make the helper accept raw token lines and join them before the closing fence, then assert those exact lines exist before the first parse begins. It should not call trim, cast text, sort keys, or add a missing peer, since each of those acts can hide the case meant for production. After serialization, use another small helper only to read frontmatter lines and never to compute the expected value from current output. This split keeps source setup, public calls, and the test oracle apart while still making every case short enough for code review.

Run the no-fields control with the same serializer call. It proves the harness can distinguish absent input from omitted defined input. Without it, a future writer might add blank keys everywhere.

When changing implementation, add output lines only for numeric defined values. Then rerun first and second parse checks for zero, minimum-only, and maximum-only cases before broad package tests.

Do not change the parser's quoted-number rule in the same patch unless product policy requires coercion. Separate changes make failures easier to assign and reduce migration risk.

Finish with the command from [CI validation](/blog/validate-skill-md-in-ci-pipeline). Keep this targeted suite fast enough to run whenever shared parsing or serialization code changes.

## SKILL.md token limits round trip rollout and regression checks

SKILL.md token limits round trip rollout should land characterization before serializer code. Reviewers can then see the exact before state and confirm the patch changes only defined token output.

Shared parser owners should own both read and write parity. Type owners should confirm optional meaning, while CLI and web owners should review any artifact or cache that depends on generated frontmatter.

Add \`minTokens\` and \`maxTokens\` lines in a stable scalar section only when values are defined numbers. Reparse the result in tests rather than relying on visual output.

Scan seed skills and published samples for numeric, quoted, zero, negative, and decimal uses. Report observed cases without inventing counts. If a new range policy is planned, handle it after preservation is stable.

Run the scan in read-only mode and save file, field, raw scalar, and parsed type for each real hit in the checked revision. Review quoted, negative, and decimal values as separate source states instead of forcing them into the numeric preservation patch without a rule. Add the shipped preservation check to [how to publish](/how-to-publish) only after both defined fields survive parse, write, and reparse in the shared suite. Keep the scan command and code hash with its report so a later type or range change has a fair base for comparison.

Regression coverage should include six matrix rows, one full supported-field parity check, and one real fixture if token limits exist in the repository. Keep synthetic rows because real files may not cover every optional shape.

Check any alternate writer, including web artifact construction, before claiming site-wide retention. This brief proves the shared \`serializeSkillMd\` gap. Other builders need their own source evidence and tests.

Keep the old loss assertion only in history after the fix. Active tests should then require preservation, while release notes can describe the prior behavior. Do not leave contradictory expectations in different suites.

Run the matrix on parser, schema, type, serializer, CLI install, or artifact changes. These points can drop, coerce, or default optional metadata without a compile error.

Before the patch is merged, ask one peer to trace minimum and maximum from each raw line through the first value, built line, and last value without reading the expected result. That peer should run the no-field, zero, one-field, and both-field rows, then mark any stage where a key is added, lost, swapped, or turned into text. Keep the old short report next to the patched report and state that the first parse must stay fixed while only the built line and second parse gain defined values. If any other field or body text changes in this narrow run, stop and split that work from the token fix before a wide snapshot makes the extra change hard to see.

In the release check, run the shared suite first, then build one real sample and inspect its raw text before parsing that sample once more with the same public call. The sample should show each defined key once, leave each absent peer out, keep zero as zero, and return the same two numbers after the last parse. Record the code hash, field states, output lines, and strict last values, then compare the result with one item from the [skills directory](/skills) only as a manual spot check. This proof stays small enough for each release while it still covers the full path that once lost both fields between a valid first parse and the next read.

Pair the update with [the round-trip article](/blog/testing-skill-md-yaml-frontmatter-roundtrip) so future fields follow the same parity method. A field should not be considered supported until read, write, and reparse agree.

## Frequently Asked Questions

### What should minTokens serializer bug tests assert?

They should assert that the first parser returns the exact numeric minimum, the current serialized frontmatter lacks its key, and the second parser returns undefined. After a fix ships, invert the output and second-parse assertions while retaining the successful first-parse control.

### How does maxTokens metadata loss affect the SKILL.md contract?

The first parsed object can contain a maximum that the rebuilt document no longer carries. Any later parser then sees no upper bound in its rebuilt file. Tests should report this narrow metadata change without claiming an agent ignored or exceeded a limit.

### Which fixture best exposes token budget frontmatter?

Use one valid document with \`minTokens: 100\` and \`maxTokens: 500\`, plus separate single-field variants. Distinct values reveal omission or swapping. Add a no-fields control and numeric zero so optional output and falsy handling are both clear in the same suite.

### When should teams check SKILL.md field parity?

Run parity checks whenever parser reads, serializer lines, frontmatter types, schemas, CLI packaging, or artifact builders change. Each boundary can lose an optional field while TypeScript still compiles. The parse-write-parse chain gives direct proof at release time for every release.

### What is the pass criterion for parser serializer contract test?

For the current characterization, defined limits must parse first and then show documented omission. After the writer patch, every defined numeric value must survive exactly, including zero, while undefined peers stay absent. Quoted numeric text should follow its separately approved parser rule.

## Conclusion

SKILL.md token limits round trip currently loses both optional values because the parser reads them and the serializer omits their YAML lines. Add the four core field-shape rows first, then update the writer and require exact second-parse parity.

Keep range policy separate from preservation and verify every alternate writer before broad claims. Open the [skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this contract before publication.`,
};
