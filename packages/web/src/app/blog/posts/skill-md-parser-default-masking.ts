import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md parser default masking Tests',
  description:
    'SKILL.md parser default masking: test when defaults hide required-field failures. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md parser default masking',
  keywords: [
    'SKILL.md parser default masking',
    'validation default ordering',
    'missing version accepted',
    'missing license accepted',
    'parser schema responsibility',
    'frontmatter default masking tests',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: ['https://zod.dev/api', 'https://agentskills.io/specification'],
  repoEvidence: [
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  content: `SKILL.md parser default masking happens before Zod sees frontmatter: omitted version and license values become \`1.0.0\` and \`MIT\`. Therefore, schema validation cannot report those omissions through the current parser path. Tests should characterize that result first, then enforce any new omission policy at one clearly owned boundary.

The key distinction is source presence versus parsed validity. A parsed object can satisfy required schema fields even when the source never declared them. That distinction matters for diagnostics, migration plans, and compatibility with existing skills.

## What does SKILL.md parser default masking need to prove?

SKILL.md parser default masking must prove which source omissions are converted into valid values before schema checks run. The suite needs separate observations for raw frontmatter, parsed frontmatter, and the final Zod result.

In \`packages/shared/src/parsers/skill-parser.ts\`, \`parseSkillMd\` sends the complete string to gray-matter and then builds a new frontmatter object. Version uses \`data.version || '1.0.0'\`, while license uses \`data.license || 'MIT'\`. Omitted fields, empty strings, and other falsy values therefore reach later code as defaults.

The schema in \`packages/shared/src/schemas/skill-schema.ts\` requires version to match a three-part numeric expression. It also requires a nonempty license string. Those checks operate on the rebuilt object, not on the original YAML mapping.

The first test should preserve current behavior without calling it correct or incorrect. A fixture with all other required fields and no version should parse with version \`1.0.0\`; a fixture without license should parse with \`MIT\`. Passing either object to \`skillFrontmatterSchema.safeParse\` should succeed when every remaining rule is satisfied.

A second layer should describe the desired source contract. If publication requires authors to declare both fields, inspect gray-matter data before applying defaults or retain source-presence metadata. If defaults are intentional, document that omission is accepted and test the selected values instead.

The [SKILL.md format guide](/blog/skill-md-format-guide) explains the wider file shape. Keep this suite narrower than [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests), which cover parse failures rather than valid YAML with absent keys.

The external [Agent Skills specification](https://agentskills.io/specification) provides a reference for portable skill metadata. Repository code remains the authority for current QASkills behavior, especially where local defaults add a policy beyond source syntax.

## validation default ordering: current repository behavior

Validation default ordering begins with YAML parsing, continues through object reconstruction, and ends with Zod validation in the validator. A failure can only describe the value presented at its own stage. Once a missing key becomes a valid string, the later schema has no evidence that it was absent.

The parser also normalizes several arrays with \`toStringArray\`. Missing arrays become empty lists, while comma-separated strings become trimmed entries. Version and license differ because they receive concrete scalar defaults rather than empty values.

This order explains why a direct schema test and a parser-plus-schema test answer different questions. Directly passing an object without version to \`skillFrontmatterSchema.safeParse\` should fail because the required key is undefined. Parsing a source without version first should produce a valid version string and can pass.

Create both tests and name the boundary in each title. A name such as "schema rejects absent version on raw object" differs from "parser supplies version before schema validation." The pair prevents a later reader from treating one result as proof for the entire pipeline.

Truthiness adds more cases than simple omission. YAML values that gray-matter exposes as an empty string are replaced, while a nonempty invalid version survives and fails the regex. A license containing one space is truthy and also satisfies the schema's minimum length because no trim rule appears there.

Do not infer behavior for every YAML type without a fixture. A numeric version can survive the parser's logical OR but then fail Zod's string requirement. A boolean or object follows its own parsed-value path and should be tested only when that input matters.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) shows where a stable suite can run. At this boundary, record both the parser output and Zod issues, since a boolean pass result alone hides why two inputs differ.

Zod's [API documentation](https://zod.dev/api) distinguishes required fields, refinements, defaults, and transformations. Use those terms when proposing a change, but assert the exact local schema exported by this repository.

## Why does missing version accepted change the contract?

Missing version accepted changes the contract because source authors and downstream consumers may interpret absence differently. The current parser chooses a version, so later consumers cannot tell whether the author selected it or inherited it.

This is not a parser crash or an invalid-YAML case. The source can be valid YAML and still omit the key. Gray-matter returns data without that property, then the QASkills parser creates a complete \`SkillFrontmatter\` object.

The current fallback is exactly \`1.0.0\`. Tests should compare that complete value rather than merely checking truthiness. An exact assertion detects a future default change and makes the compatibility effect visible during review.

Direct schema behavior remains strict. If a caller constructs a frontmatter object without version and bypasses \`parseSkillMd\`, the schema receives undefined and rejects it. That difference means the same conceptual skill can have different outcomes depending on its entry path.

Build a three-column oracle: source key state, parser output, and schema result. Include omitted, empty, valid \`2.3.4\`, malformed \`v2\`, and numeric \`2\`. Each row should identify whether substitution occurred before predicting validation.

If the chosen product rule accepts omission, preserve the parser fallback and state it in publishing guidance. If explicit source metadata is required, add a presence check before reconstruction rather than expecting the existing schema to recover lost information.

Avoid changing the version regex while fixing source presence. Regex syntax and omission are separate dimensions, and one combined change makes regressions hard to identify. Keep malformed nonempty values as controls for the existing Zod rule.

The [publishing guide](/how-to-publish) can state whether defaults are author-visible. The automated suite should still operate on literal source text because generated frontmatter may always include version and miss the omission branch.

Use [seed catalog parser tests](/blog/seed-skill-catalog-parser-regression-tests) for a broader ingestion check after the unit contract is stable. One seed fixture without version can show whether the same default reaches stored metadata.

## missing license accepted test matrix

The missing license accepted matrix should vary one source condition at a time. All fixtures need a valid name, description, author, testing type, language, and useful body so unrelated issues cannot obscure the result.

License omission currently produces \`MIT\` in \`parseSkillMd\`. An explicit empty string also produces \`MIT\`, while a nonempty custom identifier survives. The schema then accepts every nonempty string because it applies only \`z.string().min(1)\`.

Version omission behaves similarly but has a stricter post-default regex. A malformed nonempty version therefore remains visible and fails. This contrast proves that default masking depends on both parser truthiness and the later field rule.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Version omitted | No version key in valid YAML | \`packages/shared/src/parsers/skill-parser.ts\` | Parser returns \`1.0.0\`; complete schema input can pass |
| License omitted | No license key in valid YAML | \`packages/shared/src/schemas/skill-schema.ts\` after parsing | Parser returns \`MIT\`; schema does not report omission |
| Both fields omitted | Neither key appears | Parser followed by schema | Both defaults appear and no issue names either field |
| Explicit valid values | Version \`2.3.4\`, license \`Apache-2.0\` | Both boundaries | Explicit values survive unchanged and validate |
| Invalid nonempty version | Version \`latest\` | Schema after parser | Value is not replaced, and version validation fails |
| Whitespace license | License contains one space | Schema after parser | Current minimum-length rule accepts the truthy string |

Treat table outcomes as characterization. The row describing whitespace does not recommend accepting whitespace; it records that neither the parser nor schema trims that scalar in the cited code.

For every accepted row, assert the full parsed frontmatter fields that matter. A test that checks only \`success === true\` could pass after a default changes silently. For every rejected row, assert the issue path and not an entire unstable formatted error.

The body can remain constant across this matrix. Frontmatter changes should be built by a helper that deletes or replaces one line, then verifies the final source. Hidden template defaults inside the test helper would recreate the same masking problem.

Add a raw-presence assertion before calling the parser when testing a new policy. That assertion proves the source really omitted a key. It also catches fixture builders that add version or license behind the test's back.

The [format reference](/blog/skill-md-format-guide) is useful when choosing a smallest valid baseline. Do not borrow unrelated optional fields, because extra metadata increases the number of possible causes when a row fails.

Keep each source in the test row as plain text, then show the few lines that make that row unique. This helps the next reader see a missing key at once, with no need to trace a large file builder.

Give the control and each changed case the same name, body, author, type, and language values. When one result moves, the team can then link that shift to the one key changed for that row.

Test an empty value apart from a key with no value at all, since a YAML tool may map those forms in its own way. Print the parsed type and value when the two source forms do not lead to the same result.

Use one row with \`false\`, one with zero, and one with an empty list only if the YAML parser can yield those types. These cases show how logical OR works, but they must not replace the core missing-key tests.

## How should parser schema responsibility be verified?

Parser schema responsibility should be verified with two related tests that intentionally enter at different boundaries. The parser test owns substitution; the schema test owns value validity after an object already exists.

The first example runs literal markdown through \`parseSkillMd\`. It expects current defaults and confirms the source contains neither key. The assertion is a characterization of shipped code, not a proposed validation change.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from './skill-parser';

const source = \`---
name: Boundary fixture
description: A complete description for a parser boundary fixture.
author: qa-team
testingTypes:
  - unit
languages:
  - typescript
---

## Instructions

Run the smallest verified parser boundary check.
\`;

describe('parser defaults', () => {
  it('supplies version and license when both keys are absent', () => {
    expect(source).not.toMatch(/^version:/m);
    expect(source).not.toMatch(/^license:/m);

    const parsed = parseSkillMd(source);

    expect(parsed.frontmatter.version).toBe('1.0.0');
    expect(parsed.frontmatter.license).toBe('MIT');
  });
});
\`\`\`

Import paths should match the eventual test location. The example names the production source \`packages/shared/src/parsers/skill-parser.ts\`, where the two logical OR expressions define the expected outputs.

The second example proves that Zod itself still rejects missing required keys. It removes one property from a known complete object and compares the resulting issue path. This test belongs with \`packages/shared/src/schemas/skill-schema.ts\`.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from './skill-schema';

const complete = {
  name: 'Boundary fixture',
  description: 'A complete description for a schema boundary fixture.',
  version: '1.0.0',
  author: 'qa-team',
  license: 'MIT',
  tags: [],
  testingTypes: ['unit'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

describe('required source-independent fields', () => {
  it.each(['version', 'license'] as const)('rejects an object without %s', (field) => {
    const input = { ...complete };
    delete input[field];

    const result = skillFrontmatterSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
  });
});
\`\`\`

Together, these examples explain the apparent contradiction. The schema can require a field while the normal parser path guarantees that field exists. Neither test should be removed in favor of the other.

If a source-presence rule is added, give it its own result type or diagnostic. Do not overload the Zod value error with a claim about raw YAML unless the schema actually receives raw presence data.

The [YAML round-trip article](/blog/testing-skill-md-yaml-frontmatter-roundtrip) can support serializer checks after policy changes. A round trip that writes defaults may intentionally convert implicit input into explicit output, which deserves a separate assertion.

Place parser tests and schema tests in two clear groups, then use the same short case names in both groups. A failed row will show which gate moved, while the shared name still lets the team compare both sides.

Keep the raw source out of a generic object factory, since that kind of helper may add version or license by default. Build the source in the row or call a helper that takes an exact list of lines to include.

Check issue paths rather than the full text made by the error formatter, because library text can change with an upgrade. The field path and local rule give a small, stable sign that the right check ran.

When a test must show both raw and parsed forms, use a short diff in its fail note. Mark keys as present or absent, then show the two chosen values without dumping the full body or all list fields.

## frontmatter default masking tests acceptance criteria

Frontmatter default masking tests pass when they distinguish source omission, parser substitution, and schema validity in every report. A single combined "valid" flag is insufficient because it cannot reveal which boundary changed.

The baseline must pin current outputs: omitted version becomes \`1.0.0\`, and omitted license becomes \`MIT\`. Explicit valid values must survive unchanged. Invalid nonempty versions must still reach the schema and produce a version issue.

Acceptance also requires a written policy for omission. The policy may preserve implicit defaults or require explicit keys, but tests cannot alternate between both expectations. Place that decision beside the boundary that can observe source presence.

Diagnostics should name the raw key and selected action. For an accepted omission, a trace or test message can say the parser supplied a default. For a rejected omission, the error should say the key is absent rather than saying the substituted value is malformed.

Keep empty strings as a separate policy row. Because logical OR treats them like omission, current output matches the missing-key row. A future presence check might distinguish a present empty key from a missing one, so both fixtures protect that choice.

Whitespace and wrong-type values need independent rows. They are truthy in some cases and therefore bypass parser defaults, but Zod can accept or reject them according to its own rules. Avoid calling those cases omission.

Backward compatibility belongs in the gate. Before requiring explicit keys, scan representative repository skills and count affected files using a reviewable command. Do not invent a migration count; derive it from the exact revision under test.

The [CI pipeline guide](/blog/validate-skill-md-in-ci-pipeline) can host the final command and artifact format. Store case names, parser values, and issue paths so failures remain useful without reading implementation code.

SKILL.md parser default masking should not be labeled a security finding from this evidence. The cited behavior is a metadata contract question, and the tests described here do not prove exploitability or impact beyond validation results.

Ask one reviewer to read only the source fixtures and state what each case means before the tests run. If that plain read does not match the row name, fix the test data first instead of adding more checks.

Ask a second reviewer to read only the parsed results and field issues, then map each one back to its source row. This split can catch a test helper that adds a key or a parser step that hides its source.

Keep the pass rule short enough to quote in a test file: missing keys use known defaults, or missing keys fail before defaults. A mixed rule needs a field-by-field note, since version and license may not share one policy.

Do not mark a case as fixed when only its error text changes, because the parsed value may still hide the source state. Require the chosen gate, value, and issue path to agree before the row can pass.

## How do you test SKILL.md parser default masking step by step?

Test SKILL.md parser default masking by locking the current parser result before proposing stricter source checks. Each step should preserve one observable boundary and avoid using production code to calculate its own expected value.

1. Read \`packages/shared/src/parsers/skill-parser.ts\` and record the exact version and license fallback strings.
2. Read \`packages/shared/src/schemas/skill-schema.ts\` and list the independent value rules for both fields.
3. Build one smallest valid SKILL.md source with explicit version and license as the control.
4. Derive fixtures with version omitted, license omitted, both omitted, empty values, and invalid nonempty values.
5. Assert raw key presence before parsing, then assert the complete parsed values after \`parseSkillMd\`.
6. Pass each parsed object to \`skillFrontmatterSchema.safeParse\` and compare stable issue paths.
7. Add direct schema tests without the parser so required-object behavior remains visible.
8. Decide whether omission is accepted, warned, or rejected, then add that rule at a boundary that sees source keys.
9. Run repository fixtures and publish-path checks before changing defaults or diagnostics.

Start by copying no production fallback into a fixture builder. The expected strings can appear in assertions, but the builder should only remove or set source lines. This prevents a helper from supplying fields that a test claims to omit.

Capture parser output before schema output in failure messages. If a row unexpectedly passes, the report will show whether substitution changed or schema validation changed. That order shortens diagnosis without coupling assertions to internal call counts.

Run direct schema tests beside parser integration tests. A future parser refactor may stop rebuilding the object, while a schema refactor may add its own defaults. The paired suite identifies which contract moved.

After a policy choice, add one end-to-end validator case. It should prove the user-visible valid flag and diagnostics while retaining lower-level tests for precise causes. Do not duplicate every edge through every layer.

Use [published QA skills](/skills) for a manual sample after automation passes. The manual check should inspect visible metadata and never replace source-level fixtures.

Run the small control first and stop if it fails, since all later rows rely on the same name, body, type, and language. This saves time and keeps a broad setup fault from looking like a default rule change.

Run the two one-key cases next, then the both-key case, so the first bad result points to one field. Put wrong type and blank text cases last because they test truth and type rules as well as key presence.

For each row, save four facts in the fail note: source key state, parsed value, schema pass state, and first field path. Those facts are enough to trace the cause without a long stack or source dump.

If a new rule fails many old skills, keep the report in warn mode while the team checks each file. Move to a hard fail only after the source set and author guide match the same plain rule.

## SKILL.md parser default masking rollout and regression checks

SKILL.md parser default masking changes should begin with characterization tests on the current branch. Reviewers then see whether a patch changes defaults, source-presence policy, schema rules, or only diagnostic text.

Assign ownership to the shared parser and schema maintainers together. The parser owns how raw YAML becomes \`SkillFrontmatter\`; the schema owns which values are acceptable. Publication and CLI callers should consume their documented outcome rather than add another silent default.

If explicit keys become required, provide a migration path before making CI blocking. A warning phase can list affected files and selected fallback values. The later error phase should use the same fixture matrix, changing only the expected policy outcome.

If defaults remain accepted, strengthen documentation and serializer tests. Serialization currently emits both version and license from the parsed object, so a parse-and-serialize operation can make an implicit value explicit. Pin that transformation if tools rely on it.

Regression coverage should include direct parser tests, direct schema tests, and one validator test. Add a publish test only when the publish route uses this exact shared path; otherwise, document its separate contract rather than implying parity.

Check existing related suites for contradictory names. A test called "requires version" may refer only to direct schema input, while another accepts omission through parsing. Rename tests to include their boundary instead of deleting a valid observation.

Failure messages should print the fixture label, raw presence flags, parsed version, parsed license, and issue paths. Avoid dumping complete skill bodies or unrelated metadata. Compact evidence makes CI output easier to compare.

The [seed parser regression guide](/blog/seed-skill-catalog-parser-regression-tests) can cover catalog ingestion after shared tests pass. Keep one known omission fixture there, because broad catalog scans can otherwise hide a default behind many successful rows.

Rerun the suite whenever parser normalization, schema defaults, serializer output, or publishing metadata changes. Those are the points where an implicit field can gain or lose meaning.

Keep a small old-file set with one explicit pair, one missing version, one missing license, and one missing both. This set gives the team a fast view of the old contract each time shared code must change.

For a warn phase, print one line per file and key, then sort by file path so two runs are easy to diff. Do not print the whole frontmatter when the key state and chosen value tell the full tale.

For a fail phase, use the same case IDs and the same order as the warn phase. A switch in gate strength should not also rename cases, change source text, or move the test to a new layer.

Track any default change as its own review item, even when the team also adds a source-key check. A new default can change old output, while a new check can block the file before that output is made.

After the change ships, parse and write each old-file row once, then parse the new text again. This short loop shows whether a tool makes hidden defaults clear and whether the next pass stays the same.

At the end of each run, read the four key facts from left to right and check that each fact fits the case name. The source says if the key was set, the parsed form shows its value, the schema gives its pass state, and the last field shows the first fault path.

Keep one small gold file in the test set and do not make it with the same helper used by the changed rows. Write its lines by hand, read them back in the test, and use that known file to prove the parse and check stack still works.

When a row fails, change no code until the team can name the first point where the facts split from the pass rule. This short pause keeps a schema fix from being used for a source fault, and it keeps a parser patch from hiding a bad value.

## Frequently Asked Questions

### What should validation default ordering tests assert?

They should assert raw key presence, the exact parsed value, and the later schema result as separate observations. This sequence shows whether a default was inserted before validation. It also prevents a passing Zod result from being mistaken for proof that the author supplied the field.

### How does missing version accepted affect the SKILL.md contract?

An omitted version currently becomes \`1.0.0\` during parsing, so downstream code cannot distinguish omission from that explicit value. Teams must decide whether this implicit choice is supported. Tests should preserve the current result while any stricter source-presence rule is reviewed and migrated.

### Which fixture best exposes missing license accepted?

Use a smallest valid source that contains no license line, then assert absence before parsing. The parser should currently return \`MIT\`, and the complete object can pass schema validation. Pair it with an explicit empty license and a custom nonempty license to expose truthiness behavior.

### When should teams check parser schema responsibility?

Check it whenever parsing adds defaults, normalizes types, trims values, or rebuilds metadata before validation. Also review it when schema defaults are introduced. The test pair should identify which layer owns substitution and which layer owns acceptance, so diagnostics remain accurate.

### What is the pass criterion for frontmatter default masking tests?

Every matrix row must report the expected raw presence, parsed value, and stable schema outcome. Explicit values must remain unchanged, omissions must follow the selected policy, and malformed nonempty values must not be silently replaced. CI should fail when any boundary changes without a reviewed contract update.

## Conclusion

SKILL.md parser default masking is a consequence of validation order: the parser supplies version and license before the schema checks required values. A reliable suite preserves that characterization while keeping direct schema requirements visible.

Add the paired parser and schema tests first, then choose an explicit omission policy with migration evidence. Open the [skills directory](/skills) to inspect published metadata, and follow [how to publish](/how-to-publish) when applying the same contract before release.`,
};
