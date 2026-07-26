import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md duplicate YAML key policy Tests',
  description:
    'SKILL.md duplicate YAML key policy: define deterministic handling for repeated keys. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md duplicate YAML key policy',
  keywords: [
    'SKILL.md duplicate YAML key policy',
    'duplicate frontmatter field',
    'YAML mapping key collision',
    'gray-matter duplicate keys',
    'SKILL.md ambiguous metadata',
    'duplicate key validator test',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'testing-skill-md-yaml-frontmatter-roundtrip',
    'malformed-skill-md-frontmatter-parser-tests',
    'validate-skill-md-in-ci-pipeline',
  ],
  sources: ['https://yaml.org/spec/1.2.2/', 'https://github.com/jonschlinkert/gray-matter'],
  repoEvidence: [
    'packages/shared/src/parsers/skill-parser.ts',
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  content: `SKILL.md duplicate YAML key policy should reject repeated mapping keys before schema validation and report one stable parser error. In the installed gray-matter path, duplicate scalar and sequence keys already throw a YAML exception. Tests must characterize that result, then decide whether callers preserve the raw exception or translate it into a documented validator diagnostic.

This boundary matters because Zod receives no object when YAML parsing fails. A schema assertion cannot prove duplicate handling, while a parser assertion can record the exact stage and outcome.

## What does SKILL.md duplicate YAML key policy need to prove?

SKILL.md duplicate YAML key policy must prove that every repeated key reaches one set result. That result must appear before parsed metadata enters the schema. The narrow contract is source ambiguity, not general malformed YAML or ordinary value validation.

The current path begins in \`packages/shared/src/parsers/skill-parser.ts\`. Its \`parseSkillMd\` function passes the complete source to gray-matter, destructures \`data\` and \`content\`, then constructs a typed frontmatter object. There is no catch around that first call, so any YAML exception leaves the function unchanged.

With the installed gray-matter 4.0.3 dependency, two \`name\` keys trigger a duplicated mapping key exception. Repeating \`tags\` has the same parser result, whether each value uses flow syntax or block syntax. No first or last value reaches \`toStringArray\`.

That observation answers the immediate policy question for this revision: repeated keys currently fail parsing instead of selecting one value. A test should pin that result for this code. It should not promise the same default for another YAML engine, dependency version, or custom gray-matter engine.

The schema in \`packages/shared/src/schemas/skill-schema.ts\` validates a JavaScript object after parsing. It checks field types, lengths, required arrays, and the numeric version pattern. It does not inspect source lines, key counts, or parser exceptions.

A complete suite therefore needs a valid control and one repeated-key case for every supported value shape. It should also include nearby malformed syntax. This check keeps duplicate-key diagnostics from becoming a broad assertion that accepts any thrown error.

Use two short names in each test and make sure those names do not match, since a later pass could pick one and hide the change. Put the first key and the next key side by side so a code review can spot the clash with no hunt through the file. Keep all other lines the same as the clean case, which makes the new key the sole cause when the call stops. This plain setup also helps a new team member read the test and know at once what the row is meant to prove.

Use the [malformed frontmatter test guide](/blog/malformed-skill-md-frontmatter-parser-tests) for syntax faults such as broken brackets or indentation. Keep duplicate-key cases here because their source is syntactically shaped like a mapping but violates the selected uniqueness rule.

The [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/) defines mapping keys as unique. That source supports a reject policy, while the repository test remains responsible for the installed parser's exact exception behavior.

## duplicate frontmatter field: current repository behavior

A duplicate frontmatter field fails at the gray-matter call before QASkills creates \`SkillFrontmatter\`. This order should appear in the test name, assertion, and failure message. Later layers never observe a partial object.

Start with one smallest valid document containing a single \`name\`, description, author, testing type, language, and body. \`parseSkillMd\` should return the declared name and trimmed body. This control proves delimiters and unrelated metadata are valid.

Create the duplicate fixture by adding a second \`name\` line with a visibly different value. The values should be short and distinct, such as \`First name\` and \`Second name\`. This choice makes an accidental first-wins or last-wins change easy to identify.

The current assertion can use \`toThrow\` at the public parser boundary. A stronger characterization captures the thrown value and checks that it is an error with duplicate-mapping context, but it should avoid matching a complete stack or source position.

Exact line and column text comes from the YAML library and may shift after harmless fixture edits. Assert a stable reason fragment plus the absence of any returned result. Do not claim a schema rejection, because \`skillFrontmatterSchema.safeParse\` is never called in this path.

Repeat the experiment with an array key. Two \`tags\` entries should throw before \`toStringArray\` can normalize either sequence. This case guards against a future parser option that treats scalar and collection collisions differently.

Give each list a clear item, such as red in the first list and blue in the next, so a picked list would stand out in failed output. Assert that the call does not return before you check any later spy, since no schema work should start for this row. When the test fails after a package bump, print the case name and short cause rather than the full source or stack. Those small facts tell the owner if the tool chose a list, let both through, or stopped as the current code does.

Nested duplicates need their own expectation even though supported frontmatter is mostly flat. A nested object placed under an extra key can show parser-wide behavior, but QASkills later omits that unknown field from its rebuilt object. Name the test as parser coverage rather than supported metadata coverage.

The [gray-matter repository](https://github.com/jonschlinkert/gray-matter) explains that the library parses frontmatter and supports configurable engines. That configurability is why the test should call \`parseSkillMd\`, not import gray-matter directly as the only proof.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) to keep the control fixture realistic. A production-shaped baseline reduces the chance that a parser failure comes from missing delimiters rather than the duplicate frontmatter field.

## Why does YAML mapping key collision change the contract?

A YAML mapping key collision changes the contract because selecting one value and rejecting the document produce different observable states. A parser may silently choose either occurrence. Consumers cannot then infer which author intent survived.

The current parser avoids that ambiguity by throwing through gray-matter. However, the public QASkills function does not translate the exception into a repository-owned error code. Callers may see library wording, which is deterministic enough for characterization but not necessarily a final user contract.

Zod cannot recover source identity after parsing. Even if a YAML engine used last-wins behavior, \`skillFrontmatterSchema\` would receive one ordinary \`name\` string. A valid schema result would prove only that the selected value satisfies field rules.

Serialization creates another distinction. \`serializeSkillMd\` receives a typed object, then writes each supported key once. It cannot recreate an earlier collision because source occurrence data is absent from \`SkillFrontmatter\`.

This one-way normalization affects round trips. A permissive parser could read ambiguous input and serialize an unambiguous result, hiding that the source contained two declarations. The current throwing behavior prevents that transformation, and a regression test should make the prevention visible.

Tests should separate parser policy from diagnostic policy. Parser policy answers whether processing stops, while diagnostic policy answers what callers receive. A project may preserve the raw YAML exception today and later wrap it without changing rejection.

Write those two choices on their own lines in the test plan, then ask each code owner to sign off on the part they own. One line should say if a bad file stops, while the next should say what short text the user will see. This split keeps a change in help text from looking like a new parse rule and keeps a parse change from passing as mere copy work. It also gives the team a small review list when the YAML tool or its settings change.

Do not label the collision as an exploitable issue from these facts. The repository evidence proves a metadata parsing boundary and a thrown exception. It does not establish an attack path, impact, or bypass.

Compare this contract with [YAML round-trip testing](/blog/testing-skill-md-yaml-frontmatter-roundtrip). Round-trip tests begin after a parse result exists. Collision tests often prove that no result should exist at all.

For publication checks, [validate SKILL.md in CI](/blog/validate-skill-md-in-ci-pipeline) can run the parser case before packaging. The gate should print the fixture label and a stable duplicate-key category rather than a full document dump.

## gray-matter duplicate keys test matrix

The gray-matter duplicate keys matrix needs one accepted baseline and isolated collisions across scalar, sequence, and nested shapes. Every row should name the first observable layer. It should not assign responsibility to a later schema.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Single key | One \`name\` declaration | \`packages/shared/src/parsers/skill-parser.ts\` | Parser returns the declared value and trimmed body |
| Duplicate scalar key | Two different \`name\` declarations | Parser through gray-matter | Parsing throws duplicate-mapping context and returns no object |
| Duplicate sequence key | Two \`tags\` declarations | Parser before \`toStringArray\` | Parsing throws before either sequence is normalized |
| Duplicate nested key | Repeated key inside an extra mapping | YAML engine reached by parser | Parsing reports the collision before unknown-field omission |
| Direct schema control | One already parsed object | \`packages/shared/src/schemas/skill-schema.ts\` | Schema validates values but cannot inspect occurrence count |

The single-key row is essential because a universal \`toThrow\` result could hide a broken delimiter or invalid control. Assert the exact parsed name, one array, and body text. Those checks prove ordinary parsing still works.

For duplicate rows, change only the repeated declaration. Reusing a helper is acceptable when it inserts literal lines, but the helper must not parse YAML to decide its expected outcome. Otherwise, test setup can inherit the same policy as production.

The direct schema row documents a negative capability. Pass a complete object with one chosen name and expect success. Then state that this result cannot distinguish whether its source originally contained one key or several.

Avoid snapshotting the whole exception. YAML library stacks contain file positions, generated names, and implementation frames that add noise. A stable projection can store constructor name, reason text, and whether any parsed value escaped.

If a dependency update changes the result to first-wins or last-wins, the matrix should fail clearly. Reviewers can then choose rejection, acceptance with warning, or another explicit rule. They should not update snapshots until that product decision is written.

For each row, save the clean source and the one new line as test data that a reviewer can read without a helper in mind. A helper may join the two parts, but it should not sort keys, parse text, or drop lines before the real call runs. Add a quick source check that counts the key twice, then run the parser and check the set result for that row. This guard proves the test did send a clash and stops a bad text replace from making the suite pass for the wrong cause.

Use one test table for parser cases and a separate schema control. Combining thrown calls and safe-parse results into one overloaded assertion makes reports hard to read. Boundary-specific tables also identify which owner should review a failure.

Link the final matrix from the [publishing guide](/how-to-publish) only after its policy is agreed. Callers still receive raw dependency wording. Documentation should not yet promise a repository-owned diagnostic.

## How should SKILL.md ambiguous metadata be verified?

SKILL.md ambiguous metadata should be verified with literal source fixtures, public parser calls, and assertions that no chosen value escapes a duplicate. The first example pins scalar and sequence behavior against the production parser.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from '@qaskills/shared';

const valid = \`---
name: First name
description: A complete description for duplicate key characterization.
version: 1.0.0
author: qa-team
license: MIT
tags:
  - parser
testingTypes:
  - unit
languages:
  - typescript
---

## Instructions

Run the parser contract check.
\`;

describe('duplicate YAML mapping keys', () => {
  it('accepts the single-key control', () => {
    expect(parseSkillMd(valid).frontmatter.name).toBe('First name');
  });

  it.each([
    ['scalar', valid.replace('name: First name', 'name: First name\\nname: Second name')],
    ['sequence', valid.replace('tags:\\n  - parser', 'tags: [parser]\\ntags: [yaml]')],
  ])('rejects a duplicate %s key', (_label, source) => {
    expect(() => parseSkillMd(source)).toThrow(/duplicated mapping key/i);
  });
});
\`\`\`

This example reaches gray-matter only through \`packages/shared/src/parsers/skill-parser.ts\`. It uses different values for each collision and leaves every required field valid, so the parser error has one intended cause.

The next example demonstrates why schema tests cannot replace source tests. It models both possible selected values as normal objects and proves each can pass the current value schema.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '@qaskills/shared';

const complete = {
  name: 'First name',
  description: 'A complete description for duplicate key characterization.',
  version: '1.0.0',
  author: 'qa-team',
  license: 'MIT',
  tags: ['parser'],
  testingTypes: ['unit'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

describe('schema occurrence visibility', () => {
  it.each(['First name', 'Second name'])('accepts one parsed name: %s', (name) => {
    const result = skillFrontmatterSchema.safeParse({ ...complete, name });

    expect(result.success).toBe(true);
  });
});
\`\`\`

The schema example belongs beside \`packages/shared/src/schemas/skill-schema.ts\`. Its purpose is not to accept duplicate source; it proves occurrence information is unavailable after an engine selects one value.

For a validator wrapper, add a third assertion only after its public error shape exists. Check a stable category such as \`frontmatter_parse_error\` and a duplicate-key message fragment. Do not invent that code in a test before production returns it.

Keep one small log shape for all rows: case name, call stage, result kind, and short reason when the call stops. Do not put the whole body in that log, since the two key lines and the fixture name are enough to find the fault. If a value gets through, print which one came back and whether any schema spy ran after the parse. This shape makes a first-wins change look quite unlike a last-wins change or the throw that the suite now pins.

Keep source fixtures in the test file when they remain short. External fixture files are useful for larger matrices, but hidden line endings or helper substitutions make these collisions harder to review.

After unit coverage passes, run one fixture through the same command used by [CI validation](/blog/validate-skill-md-in-ci-pipeline). The command should fail once, identify the file, and avoid printing a misleading schema issue list.

## duplicate key validator test acceptance criteria

A duplicate key validator test passes when repeated keys are rejected at the parser boundary, single keys remain accepted, and reports identify the collision without claiming Zod found it. These outcomes must stay separate in both code and documentation.

The minimum suite includes one scalar collision and one supported array collision. Add a nested collision if the parser accepts arbitrary mappings before QASkills filters fields. That row proves engine policy beyond only supported top-level metadata.

Every fixture must differ from its control by one inserted key. Assert the source includes both declarations before parsing, because a faulty replacement could leave only one. Then assert the public call throws and produces no partial \`ParsedSkill\`.

Diagnostic assertions should tolerate source coordinates. Match a stable duplicate-mapping phrase or a repository-owned category if one is later introduced. Avoid exact stacks, complete messages, or internal function names from the YAML engine.

The selected policy should state "reject repeated mapping keys." It should not say "keep the last value" while the current runtime throws. If maintainers intentionally choose value selection later, they need new assertions for selected value, warning behavior, and serialization.

A direct schema control must show that Zod validates only the resolved object. This protects against a future test refactor that moves every case to \`safeParse\` and accidentally stops exercising raw source text.

Compatibility review should run representative published files, but counts must come from the checked revision. Do not predict how many skills contain duplicates. A scanning command can report actual paths without changing acceptance criteria.

Run that scan in read-only mode and save just the file path, key name, and line pair for each hit found in the checked tree. Review the hits by hand before a new rule blocks work, since quoted text and body code must not count as map keys. If the scan finds no clash, state the exact tree and tool used instead of saying that no skill can ever have one. A small fact set keeps the rollout honest and gives later runs a fair base for change.

Failure output should include fixture label, boundary, and normalized error reason. It should not include credentials, full skill bodies, or unrelated metadata. Duplicate source lines alone are enough for local diagnosis.

The [skills directory](/skills) provides examples for a manual source review. Manual inspection can support rollout, but automated literal fixtures remain the repeatable proof.

SKILL.md duplicate YAML key policy is complete only when parser behavior and caller diagnostics agree. If a wrapper translates exceptions, retain one lower-level test for the dependency behavior and one public test for the translated result.

## How do you test SKILL.md duplicate YAML key policy step by step?

Test SKILL.md duplicate YAML key policy by beginning with the exact parser dependency path, then move outward only after raw behavior is pinned. The sequence below keeps source syntax, parsed values, and schema checks from being confused.

1. Read \`packages/shared/src/parsers/skill-parser.ts\` and locate the uncaught gray-matter call before object reconstruction.
2. Read \`packages/shared/src/schemas/skill-schema.ts\` and record that it accepts only an already parsed object.
3. Build one smallest valid SKILL.md fixture containing each required field once.
4. Add isolated variants for a duplicate scalar key, duplicate sequence key, and duplicate nested key.
5. Assert the control returns exact values, then assert every collision throws duplicate-mapping context.
6. Pass a complete single-value object directly to Zod and document that occurrence count is unavailable.
7. If a public validator wraps errors, assert its stable category without deleting the parser characterization.
8. Add the matrix to CI and require review for any first-wins, last-wins, warning, or wording change.

Run the control first so a common setup failure stops the suite with useful context. A valid control also proves gray-matter recognizes the delimiters and the QASkills parser builds expected arrays.

Record dependency version in the failure report rather than hard-coding it into every test title. That detail helps explain changed wording after upgrades while leaving the product policy independent from one package release.

When a collision throws, do not continue into schema calls with a fabricated object. Such a fallback would test invented behavior and could imply partial state exists. Stop that row at the first observable failure.

Run the rows in a fixed order that starts with clean text, then a scalar clash, a list clash, and the nested case. That order lets a bad shared setup fail at the first row before three throw checks give a false sense of safety. Give each row its own source string and expected stage, even when one helper makes all four files. When a row stops, the rest of the table may still run, but no later stage for that same row should be faked or called.

When checking a public validator, distinguish its result from \`parseSkillMd\`. The validator may convert exceptions into a structured result, yet the underlying parser still throws. Both observations can be correct at their own boundaries.

Finish with a targeted command documented in the [CI pipeline article](/blog/validate-skill-md-in-ci-pipeline). The report should preserve case names and stable reasons so reviewers can approve intentional policy changes.

## SKILL.md duplicate YAML key policy rollout and regression checks

SKILL.md duplicate YAML key policy rollout begins by committing characterization tests before changing error handling. That order lets reviewers see whether a patch changes acceptance, diagnostics, or only test organization.

Shared parser maintainers should own raw behavior because the first boundary is \`parseSkillMd\`. Validator and CLI owners should review any translation that changes user-visible output. Schema owners need only confirm that tests do not assign source syntax responsibility to Zod.

If the team keeps raw exceptions, document the supported reason fragment and dependency risk. If it adds a wrapper, preserve the original error as a cause for logs while returning a stable, concise category to users.

Run compatibility scans against seed skills and representative published sources. Report actual duplicate paths from that revision, then decide whether any affected file needs manual repair. Do not write a migration estimate before the scan exists.

Regression coverage should include scalar, sequence, and nested duplicates plus one clean control. A serializer test is optional for rejection because no object exists to serialize, but it becomes required if a future policy accepts one selected value.

Dependency updates deserve the same matrix. A new gray-matter engine or YAML library can alter duplicate handling through configuration. The test should fail before that difference reaches publication unnoticed.

For each tool bump, run the narrow suite both before and after the lockfile change, then place the two short reports in the review note. A wording shift with the same stop rule needs less review than a case that now hands back one of the two values. Do not bless a changed result just because the new package calls it valid, since the QASkills rule still needs its own choice. The [format guide](/blog/skill-md-format-guide) should change only after code, tests, and user text all name the same rule.

Keep diagnostics concise in CI. Print the fixture, parser boundary, and stable reason, then link to the selected policy. Avoid full stack snapshots that turn routine package updates into large review noise.

Pair the suite with [frontmatter round-trip tests](/blog/testing-skill-md-yaml-frontmatter-roundtrip), but do not merge their claims. One suite rejects ambiguous source, while the other verifies preservation after valid parsing.

Set one owner for the raw parse test and one owner for the user-facing error test, then list both in the change note. The first owner checks that no value gets past the clash, while the next checks that the file and key are easy to find. If one check fails, route the work to that owner instead of changing both tests at once. This small split keeps the rule clear as code moves and still leaves one end-to-end check for the full user path.

Use a red key and a blue key in the bad file, then let the test show if one came back or the call stopped. Run the good file first, keep its log next to the bad log, and ask a peer to check that just one new line was added. If the good file fails, fix that base and rerun it before you trust any red or blue key result from the same set. If one key wins, do not hide the fact; save the key, the raw line, and the stage so the team can pick a clear rule.

Keep the test name short, put the key name near its start, and state the stop rule in words that fit on one screen. When a run fails, read the two source lines first, then check the stage and short cause before you open a long stack trace. Ask one peer to sign off on the rule and one peer to check the log, since those two checks guard a change from both sides. Once all rows pass, save the run with the code hash so the next tool bump has a fair base for its own side-by-side check.

Review the rule whenever parser options, frontmatter engines, validator wrappers, or serializer inputs change. Those are the points where repeated source keys could begin producing a selected value.

## Frequently Asked Questions

### What should duplicate frontmatter field tests assert?

They should prove a valid single-key control returns exact metadata, while an otherwise identical repeated key throws at \`parseSkillMd\`. Match stable duplicate-mapping context and confirm no parsed object reaches Zod. Keep scalar and sequence collisions separate so a policy change cannot hide behind one broad case.

### How does YAML mapping key collision affect the SKILL.md contract?

A collision creates more than one source value for one metadata name, while downstream types expose only one property. The current installed parser rejects that ambiguity before object creation. If another policy is chosen, tests must define selected value, warning behavior, and round-trip output explicitly.

### Which fixture best exposes gray-matter duplicate keys?

Use a complete valid document with \`name: First name\`, then insert \`name: Second name\` directly below it. Distinct values reveal any future first-wins or last-wins behavior. Pair that scalar case with duplicate \`tags\` sequences to cover the parser path before array normalization.

### When should teams check SKILL.md ambiguous metadata?

Run these checks when updating gray-matter, changing its YAML engine, adding parser options, wrapping parser errors, or altering publication validation. Each change can move the first observable boundary or diagnostic. The same matrix should also run in CI before ambiguous source reaches packaging.

### What is the pass criterion for duplicate key validator test?

All clean controls must parse, every selected duplicate case must follow one documented policy, and diagnostics must name the correct boundary. Under the current revision, repeated mappings throw before schema validation. Any value-selection result requires explicit review rather than a silent snapshot update.

## Conclusion

SKILL.md duplicate YAML key policy currently resolves ambiguity by rejecting repeated mappings inside gray-matter before QASkills builds frontmatter. The next test to add is a paired scalar and sequence characterization through the public parser, followed by a schema visibility control.

Keep rejection policy separate from error translation, and review both during parser upgrades. Open the [skills directory](/skills), inspect a published SKILL.md, then use [how to publish](/how-to-publish) to apply this contract before publication.`,
};
