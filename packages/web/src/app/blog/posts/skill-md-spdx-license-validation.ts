import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md SPDX license validation Guide',
  description:
    'SKILL.md SPDX license validation: separate valid identifiers from arbitrary strings. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md SPDX license validation',
  keywords: [
    'SKILL.md SPDX license validation',
    'SPDX expression parser',
    'skill license identifier',
    'bundled license file reference',
    'invalid license metadata',
    'agent skill licensing tests',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: ['https://spdx.github.io/spdx-spec/v3.0.1/', 'https://agentskills.io/specification'],
  repoEvidence: [
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/web/src/db/schema/skills.ts',
  ],
  content: `SKILL.md SPDX license validation should classify metadata before accepting it: parse valid SPDX expressions, verify supported bundled file references, and reject arbitrary labels. QASkills currently requires only a nonempty license string, while its database supplies MIT by default. Tests must characterize that baseline before introducing stricter publication rules.

This contract keeps legal interpretation outside the validator. It checks metadata form, known expression syntax, and package file references. Maintainers still choose which licenses a project permits and whether an existing catalog needs a warning period.

## What does SKILL.md SPDX license validation need to prove?

SKILL.md SPDX license validation must prove that each accepted value belongs to one known class. A value can be a valid SPDX name or form, or it can be a supported link to a license file packed with the skill. A nonempty sales label should not pass just because it is text.

The two classes need different checks. A parser checks signs, groups, SPDX names, and exception syntax. A file link needs a safe relative path, an allowed file rule, and proof that the target exists inside the package.

Current QASkills code does neither check. In \`packages/shared/src/schemas/skill-schema.ts\`, the license field is \`z.string().min(1)\`. The schema rejects an empty string, but accepts values such as \`friendly license\`, \`MIT OR\`, and \`../../LICENSE\`.

Storage adds another edge. In \`packages/web/src/db/schema/skills.ts\`, the \`license\` column is non-null text with an \`MIT\` default. The DB can keep any supplied text, and the default does not check an explicit value.

Tests should therefore separate the schema baseline from the desired release rule. A current test can prove that any nonempty text succeeds. A proposed contract test can mark the same value as unsupported without claiming that repository code already rejects it.

The [SPDX specification](https://spdx.github.io/spdx-spec/v3.0.1/) is the authority for expression grammar and identifiers. The [Agent Skills specification](https://agentskills.io/specification) supplies the package metadata context. Local tests should use a maintained parser rather than copying a partial identifier list into a regular expression.

Keep this guide narrower than a general security review. The [SKILL.md format guide](/blog/skill-md-format-guide) covers all frontmatter fields, while this contract deals only with license representation, package evidence, and stable diagnostics.

A clear test report starts with the raw value, its class, and the one seam that made the choice. For an SPDX form, the seam is parser success; for a file link, it is safe path plus file proof. The report should not guess what the license grants, since that legal choice sits outside this code check.

## SPDX expression parser: current repository behavior

There is no SPDX expression parser in the current schema path. The license branch in \`packages/shared/src/schemas/skill-schema.ts\` checks JavaScript string type and a minimum length of one. Blank space also satisfies that rule because the schema does not trim before it counts.

This behavior is easy to characterize with a table of values. \`MIT\`, \`Apache-2.0 OR MIT\`, \`LICENSE.txt\`, and \`internal-friendly-license\` all pass the license field if the rest of the frontmatter is valid. An empty string fails at the Zod boundary.

That result does not mean every accepted value has a valid license meaning. It means the current schema treats license as a required free-form field. Tests must state that gap so a proposed check is not mistaken for shipped behavior.

The DB default deserves its own test. An insert that omits the license column can receive \`MIT\` from the DB schema. An insert that supplies \`internal-friendly-license\` stores the explicit value unless another app layer rejects it first.

Do not use the default as parser evidence. Defaults fill missing values; they do not prove expression syntax. A test that reads an inserted \`MIT\` row after omitting input covers storage behavior, not frontmatter validation.

Whitespace is a useful edge case because it reveals normalization order. A future policy should trim once, reject an empty result, then classify the trimmed value. Tests should preserve the original input for diagnostics without logging unrelated frontmatter.

Compound expressions need a real parser. Simple splitting on \`OR\` or \`AND\` fails with parentheses, exception clauses, and identifiers containing hyphens. A parser also gives a precise failure location for incomplete input such as \`MIT OR\`.

The release path should report one stable license error. It can say the value is neither a valid SPDX form nor a supported bundled file. Parser text may change between package versions, so tests should not save each token message.

Use the [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) to place the strict policy at the package boundary. Keep schema characterization tests close to the shared package so maintainers can see exactly when current behavior changes.

Keep one row for blank space even after trim is added, because old data may still reach the schema from code rather than YAML. The row should show the raw size, trimmed size, and final class without writing the whole file to logs. This proof helps a reviewer see that trim came before the parser and did not change a sound SPDX form.

## Why does skill license identifier change the contract?

A skill license identifier affects parsing, package proof, storage, and display. Treating it as an open string makes those layers look the same, but they answer different questions. The schema asks whether data has an accepted form, while storage asks whether a value can be kept.

For SPDX input, classification can happen without file access. The parser returns success for a valid identifier or expression and failure for malformed syntax. The canonical text can remain the author's original expression unless the product defines a normalization rule.

A bundled file link cannot be fully checked from raw frontmatter. The file check needs the package root and must resolve a safe relative path within it. This rule should not make content-only parsing depend on the current work folder.

The storage layer should preserve the accepted representation. Its \`text\` column in \`packages/web/src/db/schema/skills.ts\` is broad enough for expressions and references. That flexibility is useful, but it means database type checks cannot replace application validation.

The \`MIT\` default creates a policy decision for missing metadata. Shared frontmatter currently requires the field, so parsed files cannot omit it successfully. Database inserts from other paths may still omit it and receive the default.

Tests should record that gap instead of forcing false parity. A frontmatter fixture without license should fail the current schema check. A direct DB fixture without the column should receive the default if the move and DB apply it.

If maintainers want one cross-layer contract, they must choose the source of truth. Requiring explicit package metadata is clearer for publication because an author sees the license choice. Keeping the database default can still protect legacy or internal insert paths.

Bundled files also need path escape checks. Resolve the file from the package root, then prove the result stays inside that root and fits the file name rule. A string beginning with \`../\` should fail before any file read.

The [malformed frontmatter test guide](/blog/malformed-skill-md-frontmatter-parser-tests) covers YAML failures before license classification. Start licensing fixtures from valid YAML so parser errors do not hide an invalid expression or reference.

The store test should use two rows with the same skill data and change only the license input. One row omits the field and gets the default, while the other sends a sound SPDX form and gets that exact text back. This pair stops a weak test from treating the default as proof that an explicit form passed the check.

## bundled license file reference test matrix

A bundled license file reference matrix must distinguish syntax from package evidence. The single identifier and compound expression rows stay content-only. The file-reference row needs a temporary package, while the arbitrary-label row proves that nonempty text is not enough under the proposed policy.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Single identifier | \`MIT\` | SPDX classifier after shared schema | Expression parses and keeps its documented value |
| Compound expression | \`Apache-2.0 OR MIT\` | SPDX classifier and storage | Expression parses and persists without truncation |
| Bundled file | \`LICENSE.txt\` with a package file | File-aware package validator | Reference stays inside root and target exists |
| Arbitrary label | \`friendly internal terms\` | Publication policy | Stable license diagnostic rejects unsupported text |

The first row is the smallest accepted baseline. It should also pass today's \`z.string().min(1)\` rule. That pair proves the new check narrows accepted values without changing sound input.

The compound row catches implementations that allow only one identifier. Assert parser success and exact storage round-trip, because an expression is more than its first token. Avoid inventing a canonical order unless the chosen parser explicitly guarantees one.

The bundled row should create the referenced file inside the skill directory. Add separate missing-file and traversal mutations after the core table passes. Each failed result should identify the license field without revealing an absolute temporary path.

The free-form label row is the key gap between current and proposed outcomes. The current schema baseline expects success. The release check expects a stable unsupported-value result, so name both stages in the test title.

Add an empty and whitespace-only pair outside the table. Empty input already fails current schema validation, while whitespace currently passes. A stricter policy should reject both after trim and should report the same public error category.

Use the [seed catalog parser guide](/blog/seed-skill-catalog-parser-regression-tests) to list old license forms before enforcement. A real catalog scan can reveal old labels or file styles that need a clear move plan.

Give each row one small reason code such as \`spdx\`, \`file\`, \`missing-file\`, or \`unsupported\`, and keep prose out of the core match. The public text can map from that code after the test has passed. This split lets copy change without making the license rule look as if it changed too.

## How should invalid license metadata be verified?

Invalid license metadata should be verified with a current schema test and a separate target-policy test. The first example uses the exact exported schema from \`packages/shared/src/schemas/skill-schema.ts\`. It proves that license content is presently checked only for nonempty string length.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '../src/schemas/skill-schema';

const base = {
  name: 'api-contract-checks',
  description: 'Checks API contracts with repeatable fixtures.',
  version: '1.0.0',
  author: 'qa-team',
  tags: [],
  testingTypes: ['contract'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

describe.each([
  ['MIT', true],
  ['Apache-2.0 OR MIT', true],
  ['LICENSE.txt', true],
  ['friendly internal terms', true],
  ['', false],
])('current license value %s', (license, accepted) => {
  it('characterizes the shared schema', () => {
    expect(skillFrontmatterSchema.safeParse({ ...base, license }).success).toBe(
      accepted,
    );
  });
});
\`\`\`

This example expects free-form text to pass today. Changing that check before adding the new rule would misstate current code. When shipped behavior changes, keep the old test history clear and replace the result with the new rule.

The next example models the desired categories around injected seams. The SPDX parser is represented by an interface, and file lookup receives a package root. Production should bind these seams to a maintained parser and safe file access.

\`\`\`typescript
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

type Kind = 'spdx' | 'file' | 'invalid';

async function classifyLicense(
  value: string,
  root: string,
  parseExpression: (input: string) => boolean,
  fileExists: (file: string) => Promise<boolean>,
): Promise<Kind> {
  const input = value.trim();
  if (parseExpression(input)) return 'spdx';
  if (!/^LICENSE(?:\\.[A-Za-z0-9]+)?$/.test(input)) return 'invalid';

  const target = path.resolve(root, input);
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return 'invalid';
  return (await fileExists(target)) ? 'file' : 'invalid';
}

describe.each([
  ['MIT', true, true, 'spdx'],
  ['Apache-2.0 OR MIT', true, true, 'spdx'],
  ['LICENSE.txt', false, true, 'file'],
  ['friendly internal terms', false, false, 'invalid'],
])('license classifier for %s', (value, parsed, exists, expected) => {
  it('returns one documented category', async () => {
    const parse = vi.fn(() => parsed);
    const stat = vi.fn(async () => exists);

    await expect(
      classifyLicense(value, '/fixture/skill', parse, stat),
    ).resolves.toBe(expected);
  });
});
\`\`\`

The regular expression in this proposed example is a product rule for bundled names, not an SPDX parser. Teams may allow \`COPYING\` or another fixed filename if the package source supports it. Add each allowed form to the rule and its test matrix.

For cross-layer proof, insert accepted values through the app path and read them back. Assert exact SPDX and file text, plus the \`MIT\` default only when the input column is omitted. Do not claim the text column checks either form on its own.

SKILL.md SPDX license validation should keep parser dependency errors separate from invalid user input. If the parser throws unexpectedly, return an internal validation failure or fail the test. Do not convert infrastructure faults into a normal unsupported-license message.

The [publishing flow](/how-to-publish) is the final joined test. Run one sound SPDX form, one sound bundled file, and one free-form value through the same package command authors use before release.

Run the file case once with a fresh root and once after a file has been removed, then compare just the class and reason code. The first pass proves the file is seen, while the next fail proves the result did not come from its name alone. A test hook should clear the root even when the second check fails.

## agent skill licensing tests acceptance criteria

Agent skill licensing tests pass when every value has one visible class and each layer keeps its role. Valid SPDX forms pass the parser check. Supported bundled files pass only when their resolved target stays inside the package and exists.

Unsupported free-form values fail the proposed release rule even though they pass today's nonempty schema. Tests must keep this old-versus-new gap clear until code changes. Review text should never describe the strict result as already shipped.

Empty and whitespace-only values should fail after one trim step. Keep the original text only for a safely quoted diagnostic if needed. Do not echo entire frontmatter documents because they may contain unrelated author data.

The parser should handle compound forms by its documented grammar. Tests need at least one \`OR\` form, one \`AND\` form, groups, and one bad trailing sign. Avoid a hand-kept set that accepts known names but rejects valid new ones.

The file policy should enumerate supported filenames or reference syntax. It should reject absolute paths, traversal, missing files, and directories. A symbolic-link policy also needs a decision if package validation follows links.

Persistence tests should show exact round trips for an expression and a file reference. They should show the database default only for omitted input. These checks cover \`packages/web/src/db/schema/skills.ts\` without pretending that a text column is a semantic validator.

Errors should show whether SPDX syntax failed, a file name was unsupported, or a file was missing. Public output may join classes in one short message, while test logs keep a stable reason code. Do not save parser prose that can change on upgrade.

Catalog migration is part of acceptance for an existing product. Scan published and seed values, classify each one, and obtain an owner decision for unsupported forms. Enforcement should begin only after intentional values have a supported representation.

Review [available QA skills](/skills) for representative package metadata. Automated acceptance still comes from repository fixtures and the approved specification sources, not from assuming every displayed value is correct.

The rule should also state what it will not prove: it does not read legal terms, pick a license, or say that two terms fit together. It proves only that the declared form is known and that a claimed local file is present. That narrow scope keeps the test clear and leaves license choice with the package owner.

## How do you test SKILL.md SPDX license validation step by step?

Test SKILL.md SPDX license validation by proving the broad current contract first, then adding a class check and package proof. Keep SPDX fixtures apart from file fixtures. This order makes a failed result point to one layer.

1. Read \`packages/shared/src/schemas/skill-schema.ts\` and \`packages/web/src/db/schema/skills.ts\`, then record current schema and default behavior.
2. Build one smallest-valid frontmatter object with \`MIT\` as the accepted baseline.
3. Add isolated inputs for a compound expression, bundled file reference, arbitrary label, empty text, and whitespace.
4. Run expression values through the maintained parser and file references through a temporary package boundary.
5. Assert the selected categories, safe path containment, exact persistence, and the omitted-column database default.
6. Add the matrix to CI and require stable reason codes for every rejected or warning-only value.

Begin with \`safeParse\` so current behavior is clear. Assert success for free-form nonempty text and failure for empty text. This baseline keeps a new rule from being written as a fix that already exists.

Bind the real SPDX parser next. Keep parser version changes visible in dependency review and rerun grammar fixtures on upgrade. A small valid and invalid corpus gives more useful evidence than one famous license identifier.

Create bundled files under a temporary package root. Test an existing allowed name, a missing allowed name, and a traversal path. Always clean the root through test hooks, even if the classifier assertion fails.

Exercise the application persistence path with accepted values. Read back exact strings and distinguish an omitted field from an explicit empty value. The database default must not turn an invalid explicit value into \`MIT\` silently.

Run a catalog baseline before turning warnings into errors. The [seed regression guide](/blog/seed-skill-catalog-parser-regression-tests) can shape that scan. Store class totals and package-relative failures rather than a copy of every file.

Finish with the [CI validation workflow](/blog/validate-skill-md-in-ci-pipeline). Its package-aware gate can check bundled files, while shared unit tests keep SPDX checks fast and stable.

Save one short audit line for each case with the skill slug, raw form kind, reason code, and pass state. Do not save the full license file in normal CI logs, since its terms are not part of this check. A maintainer can then sort failures by cause and rerun just the row that needs work.

## SKILL.md SPDX license validation rollout and regression checks

Roll out SKILL.md SPDX license validation in report, warn, and block stages. The report sorts catalog values without changing validity. Warn mode gives owners a move path, and blocking starts after unsupported rows are fixed.

Shared-schema owners should review parser use and trim order. File-check owners should review path resolve and root bounds. DB owners should confirm that accepted values round-trip and that the old default remains planned.

The minimum regression suite contains a single identifier, compound expression, malformed expression, existing bundled file, missing bundled file, traversal path, arbitrary label, empty value, and omitted storage value. Each case needs one primary reason code.

Keep a distinction between parser rejection and parser failure. Malformed author input is an expected validation result. A thrown exception, unavailable parser asset, or unexpected return shape is an internal failure and should not be reported as ordinary invalid metadata.

Parser upgrades need a fixed test set. Run accepted and rejected SPDX forms against the new parser before merge. If a class changes, review the source grammar rather than weakening checks to fit the new output.

Path regressions need operating-system coverage. Build references with Node path tools and ensure package containment works on POSIX and Windows. Never rely on string prefixes alone, because neighboring directory names can share the same text prefix.

Storage regression checks should compare omitted and explicit values. Confirm that omission yields the documented default and that an accepted compound expression remains intact. Also confirm that publication validation runs before a rejected value reaches storage.

After any schema, parser, package, or DB change, rerun [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) and the focused license matrix. These checks ensure new rules do not hide plain required-field errors.

If the scan finds a new label, add a failing row before the team maps or rejects it. The row should name the owner and source package, but it should not add a wide allow rule for one old case. This keeps the accepted set small and makes each later change easy to review.

### License review evidence checklist

- Current shared-schema results for \`MIT\`, a compound SPDX form, a bundled file name, free-form text, blank space, and the empty string with all other fields held fixed
- The exact SPDX parser package and version used by the test run, plus one known good single name that proves the parser seam was not replaced by a stub
- One \`OR\` form, one \`AND\` form, one grouped form, and one form with a bad trailing sign, each mapped to a stable pass bit or reason code
- The raw and trimmed sizes for blank input, with proof that trim runs once before class checks and does not rewrite a sound SPDX form
- A fresh skill root for each bundled-file row, made by the test and cleared by a hook even when the file check or later assertion fails
- The resolved package-relative file name and a root-bounds pass bit, with no home folder, temp root, or full runner path in the saved log
- One present license file, one missing file with the same name, and one path escape attempt that fails before any read outside the skill root
- A DB row that omits license and gets \`MIT\`, paired with a row that sends a compound SPDX form and reads back the same text
- Zero save calls for free-form text, blank text, a missing bundled file, and a path escape, with one save call for each accepted form
- One public error class for bad SPDX text and unsupported file input, backed by test-only reason codes that keep parser copy out of stable checks
- Exact round-trip proof for accepted text, with no case fold, sort, trim after parsing, or swap that could change what the skill author declared
- A catalog count for SPDX forms, bundled files, blanks, and unsupported labels, with one named owner and due date for each old value that must move
- A rerun command and row label for each failed case, so a package owner can repeat one check without loading the whole catalog or full release suite
- The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) gate name, package path, parser result, file result, and next-save call count in one short release record

## Frequently Asked Questions

### What should SPDX expression parser tests assert?

They should assert valid identifiers, compound operators, parentheses, exceptions, and malformed boundaries through a maintained parser. Tests should use stable success or reason codes instead of parser prose. Current QASkills schema acceptance must remain a separate characterization until parser enforcement ships.

### How does skill license identifier affect the SKILL.md contract?

It determines whether metadata can be classified without file access or needs package evidence. SPDX expressions are syntax checks, while bundled references require safe resolution and existence. The database text column can preserve either representation, but it does not establish validity.

### Which fixture best exposes bundled license file reference?

Create a temporary skill with \`LICENSE.txt\` inside its root, then pair it with a missing file and \`../LICENSE.txt\`. Those three cases distinguish supported evidence, absence, and traversal. Assert package-relative diagnostics so test output stays stable across machines. Keep all other fields fixed.

### When should teams check invalid license metadata?

Check it during shared schema tests, package validation, publication CI, and parser dependency upgrades. File references require the package-aware stages, while SPDX expressions can run in fast unit tests. Scan the existing catalog before changing warnings into blocking errors. Review each new class.

### What is the pass criterion for agent skill licensing tests?

Every accepted value must be a valid SPDX expression or a supported, existing bundled file reference. Rejected values receive one stable reason, accepted text persists exactly, and omitted storage input follows the documented default. Tests must label current broad acceptance separately.

## Conclusion

SKILL.md SPDX license validation needs a classifier, not a longer nonempty-string check. Add the arbitrary-label characterization test first, then integrate an SPDX parser and a contained bundled-file policy without changing claims about current behavior.

Open the [QASkills directory](/skills), inspect a published \`SKILL.md\`, then use [how to publish](/how-to-publish) to apply this licensing contract before publication. Start with one SPDX form and one local file.`,
};
