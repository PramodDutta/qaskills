import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md whitespace only metadata Tests',
  description:
    'SKILL.md whitespace only metadata: reject strings that are present but blank. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md whitespace only metadata',
  keywords: [
    'SKILL.md whitespace only metadata',
    'Zod trim nonempty string',
    'blank frontmatter values',
    'whitespace author validation',
    'empty skill description',
    'metadata canonicalization tests',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'agent-skill-security-review-checklist',
    'how-to-publish-ai-agent-skill-directory',
  ],
  sources: [
    'https://zod.dev/api',
    'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
  ],
  repoEvidence: [
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/shared/src/parsers/skill-parser.ts',
  ],
  content: `SKILL.md whitespace only metadata passes today because the shared Zod fields measure raw string length and do not trim before their lower bound checks; the parser also copies truthy scalar strings without trimming. Tests should first record that result, then define one clear trim boundary before changing checks.

This narrow problem concerns strings that exist but contain no shown value. Missing keys, invalid YAML, and wrong scalar types need separate fixtures because they reach distinct parser branches and produce distinct proof.

## What does SKILL.md whitespace only metadata need to prove?

SKILL.md whitespace only metadata must prove four observable facts: which raw values parse, which values satisfy the schema, whether valid padding is preserved, and where any future trimmed form is created. A single rejection assertion cannot name the responsible layer.

The current schema lives in \`packages/shared/src/schemas/skill-schema.ts\`; its \`name\`, \`author\`, and \`license\` fields require at least one JavaScript string unit. The \`description\` field requires at least ten units, so ten spaces meet that raw length rule.

The current parser lives in \`packages/shared/src/parsers/skill-parser.ts\`. It passes the complete file to gray-matter, then assigns scalar values with expressions such as \`data.name || ''\`. A nonempty blank string is truthy, so that expression preserves it.

Those facts define current test, not the desired release contract. A future rule may trim selected fields before checking length, but no cited repo line performs that transform today. Tests should keep current and target expectations in distinct cases.

The [SKILL.md format guide](/blog/skill-md-format-guide) explains the wider fields shape. This article stays with semantic blanks, so malformed delimiters and array conversion do not obscure the string boundary under review.

A useful assertion reports field, escaped input, parse result, schema result, and normalized candidate. Escaped values make tabs and line feeds shown in test output. They also prevent reviewers from mistaking an empty-looking snapshot for missing data.

Start with one valid control file and mutate exactly one field per case. If several values are blank together, the first schema issue can hide later result. Isolated changes make SKILL.md whitespace only metadata failures easy to locate.

Pair every blank case with a nearby visible value in the same field, built from the same base file and sent through the same calls, so the only moving part is the text inside that one scalar and its expected output. This paired run proves the field was read, the YAML stayed sound, all required lists were present, and the changed result came from that raw value rather than from a weak fixture, a stray body edit, or an order-dependent check.

The [CI checks guide](/blog/validate-skill-md-in-ci-pipeline) can host the final regression set. Keep direct schema cases fast, then add one parser-to-schema test that proves the same rule across both boundaries.

## Zod trim nonempty string: current repository behavior

A Zod trim nonempty string rule is not present in the shared schema today. The file uses \`z.string().min(...).max(...)\` for the four scalar fields, with no \`.trim()\`, transform, preprocess, or refinement between input and length checks.

That order matters because \`.min(1)\` measures the supplied string, not its shown content. One space passes the current name rule. A tab passes the author rule, a line feed passes the license rule, and ten spaces pass the description rule.

The official [Zod string API](https://zod.dev/api) lists length checks and \`.trim()\` as separate operations. That supports a clear rule choice: maintainers must add trimming if they want checks to operate on trimmed text. The documentation does not change the repo's existing schema.

Test current result with \`safeParse\`, not only \`parse\`. A passed result exposes the returned value and proves no transform occurred. A thrown error only proves rejection and gives less useful proof for accepted blank space.

For each accepted blank, assert both \`success === true\` and exact data equality. The second check is essential because a later transform could keep the parse passed while changing the output. Current test should notice that contract change.

Padded valid values need their own row. For example, \`'  API checks  '\` currently passes and remains padded. If rule later trims it to \`'API checks'\`, the change affects file output, display, comparisons, and possibly generated identifiers.

Do not use JavaScript \`Boolean(value.trim())\` as the only oracle. That expression can name semantic blanks, but it does not state whether the accepted output should be raw or normalized. The schema result must remain the application oracle.

SKILL.md whitespace only metadata can also expose maximum-length order. A value with two outside spaces and one hundred shown characters passes or fails differently depending on whether trimming occurs before \`.max(100)\`. Add that boundary before adopting a transform.

Keep a second maximum-edge pair in which both raw strings have the same length, but one has useful text at each end while the other spends its first and last units on blank space. The pair lets reviewers see whether the limit applies to raw input, checked text, or returned text, and it catches a change that trims after one bound but before the next bound without any clear rule.

Browse a few published examples in the [QASkills directory](/skills) to learn how authors use intentional padding, but do not treat catalog samples as the formal rule. Repo tests and a stated data move decision must define the contract.

## Why does blank frontmatter values change the contract?

Blank frontmatter values change the contract because parsing and checks answer distinct questions. Parsing converts YAML into a typed application shape. Checks decides whether that shape satisfies release rules, while file output later decides which exact text is emitted.

In \`packages/shared/src/parsers/skill-parser.ts\`, missing or falsy \`name\` and \`author\` values become empty strings. Missing or falsy \`license\` becomes \`MIT\`, while missing \`version\` becomes \`1.0.0\`. All-blank strings bypass those fallbacks because they are truthy.

That distinction produces at least three states for a field: absent, explicitly empty, and present but all-blank. The parser may collapse some states while preserving another. A schema test alone cannot reveal which raw state produced its input.

Description behaves differently because its parser fallback is an empty string and its schema lower bound is ten. An absent description fails later, while a ten-space description currently passes. Tests should name both inputs and compare their exact issue paths.

License deserves a separate expectation. An empty YAML value can become the parser's \`MIT\` default, while a single space can remain a space and satisfy \`.min(1)\`. Treating both as "blank license" would hide an observable defaulting branch.

The safest proposed design chooses one owner for trim rules. If the schema owns trimming, all callers receive normalized data after a passed parse. If the parser owns trimming, any direct schema caller still needs the same rule or can bypass it.

Repo proof currently favors preserving parsing as a structural operation and enforcing semantic content in the shared schema. That is a recommendation, not deployed result. Maintain the raw file in \`ParsedSkill.raw\` so error text can still show escaped original input.

The [agent skill security checklist](/blog/agent-skill-security-review-checklist) can review field rule, but blank space alone should not be described as an exploit. The concrete defect is contract ambiguity: visually blank fields can satisfy a raw length rule.

SKILL.md whitespace only metadata tests should also avoid global file trimming. Removing all outside blank space before YAML parsing can change body text or error text. Apply a field-specific rule after parsing, with exact fields and order stated.

## whitespace author validation test matrix

An author blank-check matrix should isolate raw field states and record the current result beside the proposed result. The matrix below does not claim that trimming already ships. It shows the proof needed before maintainers change the shared schema.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Baseline | \`author: "qa-team"\` | \`packages/shared/src/schemas/skill-schema.ts\` | Current schema accepts and preserves \`qa-team\` |
| Single-space name | \`name: " "\` | Shared schema | Current schema accepts one raw string unit |
| Tab-only author | Escaped \`"\\t"\` | Parser plus shared schema | Parser preserves the tab and current schema accepts it |
| Newline-only license | Escaped \`"\\n"\` | Parser plus shared schema | Record exact parsed value and current acceptance |
| Padded description | \`"  Useful checks  "\` | Shared schema | Current schema preserves padding after success |
| Ten-space description | \`"          "\` | Shared schema | Current minimum passes; proposed semantic rule rejects |

The baseline protects ordinary content from an overbroad fix. A rule that rejects each value containing blank space would break names and descriptions with internal spaces. Only a value whose selected trimmed form is empty should fail the proposed nonblank check.

The tab and line-feed rows must use escaped error text. Snapshot output that renders either character literally is hard to review and can be changed by editors. Compare code units or \`JSON.stringify(value)\` when reporting the received value.

Give each matrix row a short case ID and print the raw value, its string length, its trimmed length, the parse result, and the schema issue path in that fixed order. A report with those five facts can be read even when the value looks empty, and it lets a failed CI job show whether the bytes, parser, check, or expected rule changed first.

The padded description row tests transformation, not rejection. Decide whether passed output is trimmed or merely checked with a trimmed predicate. Those policies both reject blanks, yet they create distinct values for downstream storage and file output.

Add one nonbreaking-space case only after the team defines its blank space set. JavaScript \`trim()\` covers more than ASCII spaces and tabs. The selected rule should be deliberate, especially if fields support international author names.

Run the matrix through the [publishing instructions](/how-to-publish) after unit tests pass. That final check confirms author-facing error text name the field without exposing invisible content as if it were absent.

SKILL.md whitespace only metadata passes this matrix when current outcomes are stable and target outcomes are clear. Do not overwrite current test expectations until production code and data move notes are reviewed together.

## How should empty skill description be verified?

An empty skill description should be verified with a direct schema table and a parser-to-schema contract test. The direct table proves raw length result. The cross-layer case proves gray-matter and parser defaults do not silently create a distinct input.

The first example records current result from \`packages/shared/src/schemas/skill-schema.ts\`. It uses a complete valid object, mutates one field, and asserts the accepted value remains exact. These assertions should change only when the shared schema changes.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from '../src/schemas/skill-schema';

const valid = {
  name: 'api-checks',
  description: 'Checks API behavior with repeatable fixtures.',
  version: '1.0.0',
  author: 'qa-team',
  license: 'MIT',
  tags: [],
  testingTypes: ['contract'],
  frameworks: [],
  languages: ['typescript'],
  domains: [],
  agents: [],
};

describe.each([
  ['name', ' '],
  ['author', '\\t'],
  ['license', '\\n'],
  ['description', ' '.repeat(10)],
] as const)('current raw length rule for %s', (field, value) => {
  it('accepts and preserves the whitespace string', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...valid,
      [field]: value,
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data[field]).toBe(value);
  });
});
\`\`\`

This table is intentionally a current test suite. Its name must not imply that blank space is desired. When a trimming rule ships, preserve the old cases in data move tests or rename them to state the new rejection result.

The cross-layer example builds YAML with clear quoted escapes. It checks parser output before invoking the schema, so a failed assertion names the changed layer. The valid body also avoids unrelated short-content warnings in broader checks.

\`\`\`typescript
import { expect, it } from 'vitest';
import { parseSkillMd } from '../src/parsers/skill-parser';
import { skillFrontmatterSchema } from '../src/schemas/skill-schema';

it('characterizes whitespace scalars across parser and schema', () => {
  const raw = [
    '---',
    'name: " "',
    'description: "          "',
    'version: 1.0.0',
    'author: "\\\\t"',
    'license: "\\\\n"',
    'testingTypes: [contract]',
    'languages: [typescript]',
    '---',
    '',
    'Follow the contract checks and report each observed result.',
  ].join('\\n');

  const parsed = parseSkillMd(raw);
  expect(JSON.stringify(parsed.frontmatter.name)).toBe('" "');
  expect(JSON.stringify(parsed.frontmatter.author)).toBe('"\\\\t"');
  expect(JSON.stringify(parsed.frontmatter.license)).toBe('"\\\\n"');

  const result = skillFrontmatterSchema.safeParse(parsed.frontmatter);
  expect(result.success).toBe(true);
});
\`\`\`

Before adopting these exact expected strings, run the fixture against the repo dependency set. YAML escape handling belongs to gray-matter's engine, while the copied scalar result belongs to the QASkills parser. The test should lock the combined result actually used by the package.

For the target rule, add a separate table expecting failure for all trimmed blanks. Assert \`issue.path\` equals the field and use a stable custom message if maintainers add one. Avoid full Zod snapshots because library upgrades can change unrelated issue details.

Padded valid values should succeed under the target rule. If the schema transforms them, assert the trimmed result. If it only refines them, assert the original padded result and file why storage keeps surrounding blank space.

Run both layers in the [CI workflow](/blog/validate-skill-md-in-ci-pipeline). One unit suite should not replace a real SKILL.md fixture because parser defaults can alter what reaches checks.

## metadata canonicalization tests acceptance criteria

Trim-rule tests pass when absent, empty, all-blank, padded valid, and ordinary values have distinct stated outcomes. Each case must state whether it checks the current result or a proposed rule.

The proposed nonblank rule should operate on the same trimmed value used for lower bound and maximum lengths. Otherwise, a field can pass one check before trimming and violate another after trimming. Order is part of the contract.

For \`name\`, \`author\`, and \`license\`, the proposed trimmed value must contain at least one allowed shown character after the selected trim. For \`description\`, it must contain at least ten units after that operation if the existing numeric limit remains.

Valid padding needs a declared output. Transforming schemas return trimmed values, while refinements can validate trimmed content but preserve raw text. Choose one result and assert it directly instead of inferring it from success.

Defaults must run at a stated stage. The current parser can replace a falsy license with \`MIT\`, yet it preserves all-blank input. A proposed trim-before-default rule would turn a blank license into a default, while trim-before-checks could reject it.

Error text should name the field and rule without printing invisible text alone. A message such as "author must contain nonblank characters" is clearer than "invalid string." Tests can retain escaped input in developer details.

The [OWASP input validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) recommends defined character sets and string length bounds. It supports a clear allowlist rule, but it does not determine which QASkills fields should be transformed or defaulted.

Backward compatibility requires a catalog scan before enforcement. Count records whose selected trimmed value differs, group blanks separately from harmless padding, and review collisions caused by trimming. Do not claim a data move is safe without that proof.

Run that scan in a read-only mode first and save only package keys, field names, raw and trimmed lengths, and a reason class, while keeping the full private value out of routine logs. Then run the same rule on a small checked sample and compare the counts by hand, so a bad trim set, a parser default, or a duplicate name is found before any record is changed.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) to publish the chosen rule beside examples. SKILL.md whitespace only metadata should fail consistently whether input arrives through a file, direct schema call, or release request.

## How do you test SKILL.md whitespace only metadata step by step?

Test SKILL.md whitespace only metadata by separating source inspection, fixture proof, the current baseline, and the target rule. The following six steps keep those concerns contiguous and make each failure actionable.

1. Read \`packages/shared/src/schemas/skill-schema.ts\` and \`packages/shared/src/parsers/skill-parser.ts\`, then record every raw length, fallback, and transform.
2. Create one smallest valid SKILL.md fixture whose scalar values are ordinary visible text.
3. Add isolated variants for a single-space name, tab-only author, newline-only license, ten-space description, and padded valid description.
4. Run each variant through \`parseSkillMd\`, then pass the returned frontmatter into \`skillFrontmatterSchema.safeParse\`.
5. Assert escaped parser values, current schema outcomes, proposed canonical values, issue paths, and the chosen padding behavior.
6. Add direct and cross-layer cases to CI, then require stable field diagnostics before publication.

Step one prevents the test from assuming that each empty-looking input remains unchanged. Record the license and version defaults, because their fallback rules differ from the name and description branches.

Step two proves the fixture itself. It should parse successfully, satisfy each required array rule, and contain enough body text for any validator integration case. A broken control makes all boundary results ambiguous.

Step three changes one dimension at a time. Keep YAML quoting fixed where possible, and use escapes for tabs or line feeds. This method separates semantic blank space from YAML syntax failures.

Step four preserves intermediate proof. Assert parser output before schema output, rather than calling only the full validator. A regression then points to scalar extraction or semantic checks without guesswork.

Step five should keep current and target assertions in named groups. The target group may be skipped or marked as expected failure until production changes are approved, but it must never be described as shipped.

Finish by running the fixtures through [how to publish](/how-to-publish). Confirm the author sees one stable field message, no partial release occurs, and valid padded content follows the selected normalization rule.

## SKILL.md whitespace only metadata rollout and regression checks

Roll out SKILL.md whitespace only metadata changes by landing current test first. That commit should not change production result. It gives reviewers a precise baseline and protects against accidental parser changes during the rule work.

Schema owners should decide trim order, lower bound lengths, and returned values. Parser owners should review fallbacks and raw-input retention. Release owners should assess existing records and any change to display or uniqueness result.

The lower bound regression suite covers missing, clear empty, all-blank, padded valid, ordinary valid, and maximum-length values for each affected scalar. Include parser, schema, serializer, and release seams only where each seam changes observable result.

If passed schema output becomes trimmed, test file output next. \`serializeSkillMd\` writes values into quoted YAML. A round trip should preserve the selected trimmed text and should not reintroduce outside padding.

Existing catalog data needs a dry report before strict rejection. Report counts and package identifiers, not unsupported assurances. Review whether trimming creates duplicate names or changes author display before writing any data move.

CLI and web error text should use the same field rule even if their presentation differs. The [release overview](/blog/how-to-publish-ai-agent-skill-directory) can file author action, while tests assert stable machine-readable fields.

Add a release check for direct schema consumers. A parser-only change would leave those callers able to submit semantic blanks. A shared-schema change can alter inferred output values, so TypeScript and file output tests should run together.

For direct callers, keep one old padded value and one new blank value in a small contract suite that runs against both the shared package build and the web release path. This check shows whether each caller gets the same accepted value or the same field issue, and it blocks a split rollout in which one path trims while another still stores raw blank text.

Security review should remain proportional. The [agent skill security checklist](/blog/agent-skill-security-review-checklist) can verify trim rules order and logs, but the observed repo result is a checks gap, not proof of exploitation.

After any Zod, gray-matter, schema, or parser update, rerun the complete matrix. SKILL.md whitespace only metadata is stable only when exact inputs, outputs, issue paths, and release outcomes remain stated.

## Frequently Asked Questions

### What should Zod trim nonempty string tests assert?

Assert the raw input, passed or failed parse, returned value, and issue path. Current tests should prove blank space passes unchanged because no trim exists. Proposed tests should prove the chosen trim runs before length checks and that padded valid text returns the stated trimmed or preserved value.

### How does blank frontmatter values affect the SKILL.md contract?

Blank values can reach distinct fallbacks than all-blank strings. The parser replaces some falsy fields, while truthy spaces are copied. Tests must distinguish absent, empty, and blank space states before schema checks, then state whether the final rule rejects, defaults, trims, or preserves each one.

### Which fixture best exposes whitespace author validation?

Use a complete valid file with only \`author\` changed to an escaped tab. Assert the parser returns exactly that tab and the current schema accepts it. Pair it with a padded shown author, so a proposed rule rejects semantic blankness without banning legitimate internal or outside spaces accidentally.

### When should teams check empty skill description?

Check it after YAML parsing, during shared schema checks, after any trimmed transform, and at release. Include ten spaces because the current lower bound is ten raw units. A missing description is a distinct fixture and should retain its own parser and issue-path assertions.

### What is the pass criterion for metadata canonicalization tests?

Each scalar state has one stated result, current result is separated from proposed rule, and valid padding follows a clear output rule. Direct schema and parser-to-schema tests must agree. Rejected cases return stable field error text, while accepted values serialize and publish without hidden normalization changes.

## Conclusion

SKILL.md whitespace only metadata currently satisfies raw length checks when enough blank space is present, and the parser does not trim truthy scalar strings. Add the isolated schema baseline test next, then choose trim order, default order, returned values, and data migration plan before changing production code.

Open the [QASkills skills directory](/skills) and inspect a published SKILL.md. Then use [how to publish](/how-to-publish) to apply this metadata contract before release.`,
};
