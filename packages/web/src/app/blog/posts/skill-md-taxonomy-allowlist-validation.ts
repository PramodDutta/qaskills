import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md taxonomy allowlist validation Guide',
  description:
    'SKILL.md taxonomy allowlist validation: test canonical values against free-form arrays. See verified code, focused fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md taxonomy allowlist validation',
  keywords: [
    'SKILL.md taxonomy allowlist validation',
    'testing type enum validation',
    'framework ID allowlist',
    'language taxonomy schema',
    'domain value validation',
    'unknown skill category',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: [
    'https://zod.dev/api',
    'https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html',
  ],
  repoEvidence: [
    'packages/shared/src/schemas/skill-schema.ts',
    'packages/shared/src/constants/testing-types.ts',
    'packages/shared/src/constants/frameworks.ts',
    'packages/shared/src/constants/languages.ts',
    'packages/shared/src/constants/domains.ts',
  ],
  content: `SKILL.md taxonomy allowlist validation should compare each metadata value with known repo IDs before accepting the file. The current schema validates arrays of strings, not membership, so unknown or empty entries can pass, and tests should derive expected values from exported constants while reporting the field, index, and rejected value.

This is a contract gap between shape checks and catalog terms, since the schema requires one testing type and language but an array with one unknown string still meets those size rules. Frameworks and domains default to empty arrays and have the same free-form item type.

## What does SKILL.md taxonomy allowlist validation need to prove?

SKILL.md taxonomy allowlist validation must prove membership for testing types, frameworks, languages, and domains without duplicating their canonical lists inside tests. It also needs clear decisions for case, whitespace, duplicates, and empty entries.

The current object in \`packages/shared/src/schemas/skill-schema.ts\` uses \`z.array(z.string())\` for all four fields. Testing types and languages add \`.min(1)\`, while frameworks and domains add \`.default([])\`. No item schema checks a repo ID.

Canonical records live in \`packages/shared/src/constants/testing-types.ts\`, \`packages/shared/src/constants/frameworks.ts\`, \`packages/shared/src/constants/languages.ts\`, and \`packages/shared/src/constants/domains.ts\`. Each module also exports an ID array derived from its records.

The first characterization fixture should use a valid complete frontmatter object and replace one taxonomy value with a distinctive unknown ID. Current \`skillFrontmatterSchema.safeParse\` should succeed because that value remains a string. This test prevents reviewers from assuming membership is already enforced.

The desired test should then apply a proposed allowlist policy and expect a stable issue. It must identify \`testingTypes.0\`, \`frameworks.0\`, \`languages.0\`, or \`domains.0\`. A generic "invalid skill" message does not help an author correct metadata.

Case sensitivity must be intentional because repo IDs are lowercase strings such as \`e2e\`, \`playwright\`, \`typescript\`, and \`web\`. Current code does not lowercase inputs, so a quiet case change would be a new step rather than a plain check.

Whitespace follows the same rule. A value like \`" web "\` is not equal to \`"web"\` without trimming. Decide whether parsers normalize it, validators reject it, or publishing tools suggest a replacement. Do not let different callers choose separately.

The [SKILL.md format guide](/blog/skill-md-format-guide) provides author-facing field examples. Keep [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) separate, since a YAML array can parse correctly while containing an unknown catalog value.

The [OWASP input validation guidance](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) recommends allowlist validation for well-defined input sets. Apply that principle at the semantic boundary while keeping exact accepted IDs tied to repo constants.

## testing type enum validation: current repository behavior

Testing type enum validation is not present in the cited shared schema today. The \`testingTypes\` property requires an array with at least one string, but neither string length nor membership is constrained.

An empty array fails with the custom message "At least one testing type is required." An array containing \`""\` has length one, and its item satisfies \`z.string()\`. Therefore, the array-size rule and item-validity rule need separate tests.

The testing type constants expose records with an \`id\`, \`name\`, \`slug\`, description, icon, and color. Frontmatter examples use IDs, so checks should use \`TESTING_TYPE_IDS\` rather than display names, which can change with visual data without redefining source IDs.

Start with one known control such as \`unit\`. Add an unknown value such as \`unit-test\`, a case-shifted \`UNIT\`, a display label such as \`Unit Testing\`, an empty string, and a whitespace-padded ID. Each row should state whether rejection or normalization is intended.

Avoid hardcoding every accepted ID into the test. Import \`TESTING_TYPE_IDS\`, iterate through it, and prove every exported ID passes. Then use explicit negative fixtures that do not appear in the set.

A set lookup provides simple runtime membership, while \`z.enum\` can encode a fixed tuple in the schema. The best implementation depends on the installed Zod version and desired inferred types. Tests should focus on accepted and rejected values, not one internal API.

Zod's [schema API](https://zod.dev/api) documents literal and enum checks for fixed string sets. Repo constants remain the source of QASkills values, so avoid creating another hand-kept enum beside them.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can run a positive sweep whenever constants change. A newly added ID should pass automatically, while a removed ID should fail fixtures that still use it and prompt a migration review.

SKILL.md taxonomy allowlist validation should report array indexes. Multiple unknown testing types may appear in one file, and returning all item issues saves authors from repeated edit-and-run cycles.

## Why does framework ID allowlist change the contract?

A framework ID allowlist changes the contract from "any string is structurally valid" to "only registered framework IDs are semantically valid." That affects existing skills with aliases, display names, case variants, or typographical errors.

Frameworks are optional in the shared schema because the field defaults to an empty array. The allowlist must preserve that valid empty state. Membership checks should run only on present items and should not force a framework onto skills that do not use one.

The canonical module in \`packages/shared/src/constants/frameworks.ts\` exports \`FRAMEWORKS\` and derives \`FRAMEWORK_IDS\` from each record's \`id\`. Examples include \`playwright\`, \`cypress\`, and \`rest-assured\`. Compare source metadata with these identifiers exactly under a strict policy.

Do not use substring or fuzzy matching for acceptance. A value like \`playwright-test\` may be understandable to a person but is not a listed ID. Suggestions can appear in diagnostics, yet accepted values should remain deterministic.

Aliases require an explicit migration map if the product supports them. Keep that map separate from the canonical IDs and test its output. An alias silently accepted as a category can create filters that no catalog page recognizes.

Before enabling hard checks, scan repo skills and group unknown values by field. Review each value against current constants and decide whether to add a known record, move the source, or reject it. Report seen data rather than guess how common it is.

Case normalization also affects stored and displayed values. If \`Playwright\` becomes \`playwright\`, test the normalized output and ensure every consumer receives the canonical ID. If no transformation is selected, reject the case variant with a helpful suggestion.

The [seed catalog regression guide](/blog/seed-skill-catalog-parser-regression-tests) can catch unknown framework values across seed files. Keep direct schema tests as the faster oracle for issue paths and exact policy.

Use the [publishing instructions](/how-to-publish) to expose accepted framework IDs to authors. Help text should come from constants where possible, which cuts drift between examples and checks.

## language taxonomy schema test matrix

The language taxonomy schema matrix should include known IDs, unknown names, case shifts, empty items, duplicates, and mixed valid-invalid arrays. Since languages require at least one array item, tests must distinguish empty-array errors from invalid-item errors.

The constants in \`packages/shared/src/constants/languages.ts\` export IDs such as \`typescript\`, \`javascript\`, \`python\`, \`java\`, \`csharp\`, \`go\`, and \`ruby\`. Display spelling like \`TypeScript\` is not the same source value under an exact policy.

One valid and one invalid item in the same array should produce an issue only for the invalid index. Do not reject the known item or collapse the path to the whole field. This makes multi-value repair straightforward.

Duplicate values are members of the allowlist, so membership alone will not reject them. Decide separately whether duplicates are accepted, normalized, warned, or rejected. Avoid claiming the proposed membership check solves duplicate metadata.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Known testing type | \`testingTypes: ['unit']\` | \`packages/shared/src/schemas/skill-schema.ts\` | Current and proposed schemas accept the canonical ID |
| Unknown framework ID | \`frameworks: ['browser-kit']\` | Framework constants plus proposed check | Issue path identifies \`frameworks.0\` |
| Case-shifted language | \`languages: ['TypeScript']\` | \`packages/shared/src/constants/languages.ts\` | Strict policy rejects and may suggest \`typescript\` |
| Empty taxonomy item | \`testingTypes: ['']\` | Current versus proposed item schema | Current schema accepts; proposed policy rejects index zero |
| Mixed domain values | \`domains: ['web', 'website']\` | Domain constants plus proposed check | Only index one receives an unknown-value issue |
| Duplicate known values | \`languages: ['go', 'go']\` | Membership and duplicate policy | Membership passes; separate rule decides duplication |
| Empty required array | \`languages: []\` | Existing schema minimum | Existing minimum-length issue remains stable |

Include a display-name row because authors may copy labels from user interfaces. A diagnostic can say "Use ID typescript" without accepting the label. Keep suggestion logic out of the membership oracle.

Include numeric and null items as structural controls. Zod's string item schema should reject them before membership logic runs. The allowlist refinement should not replace useful type issues with "unknown value."

The matrix should import canonical IDs, but expected negative strings should be literal and clearly unregistered. Assert that each negative fixture is absent from the current set before parsing. This catches future constants that make an old negative case valid.

Use [skills](/skills) to review how canonical filters appear to users. Automated tests should never scrape that page to build allowed values, because source constants already provide a stable local authority.

Keep one base row for each field and give it the first known ID from that field's source list. Then swap just that one ID for a bad value, so a failed test points to the list check and not to some other field.

For each bad row, first check that its value is not in the live ID set. This guard stops a new ID from turning an old bad case into a good case while the test name still says it must fail.

Use short bad values that state the fault, such as \`bad-framework\`, and do not use a word that may soon be a real ID. The goal is to test set use, not to guess which tool or field the team may add next.

When one array has both good and bad IDs, check the path for each bad slot and check that no good slot has an issue. This proves the loop can scan the whole list without blaming sound data.

## How should domain value validation be verified?

Domain value validation should prove every exported domain ID passes, every selected unknown value fails, and optional empty arrays remain valid. It should also preserve structural issues for non-string items.

The first code example characterizes current shared-schema behavior. It uses a full valid object, then substitutes unknown strings across taxonomy fields. This example is tied to \`packages/shared/src/schemas/skill-schema.ts\`.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { skillFrontmatterSchema } from './skill-schema';

const baseline = {
  name: 'Taxonomy fixture',
  description: 'A complete fixture for taxonomy membership checks.',
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

describe('current free-form taxonomy arrays', () => {
  it.each([
    ['testingTypes', ['not-a-testing-type']],
    ['frameworks', ['not-a-framework']],
    ['languages', ['not-a-language']],
    ['domains', ['not-a-domain']],
  ] as const)('currently accepts unknown %s strings', (field, values) => {
    const result = skillFrontmatterSchema.safeParse({ ...baseline, [field]: values });
    expect(result.success).toBe(true);
  });
});
\`\`\`

This is characterization, not the target policy. Keep it during implementation so the pull request clearly shows when membership enforcement begins. Rename or update expectations only with the policy change.

The second example builds checks from exported ID arrays. It uses a reusable refinement that adds one issue per unknown item and retains the original array value. The source collections come from all four verified constant files.

\`\`\`typescript
import { z } from 'zod';
import {
  DOMAIN_IDS,
  FRAMEWORK_IDS,
  LANGUAGE_IDS,
  TESTING_TYPE_IDS,
} from '../constants';

function allowedIds(ids: readonly string[], label: string) {
  const allowed = new Set(ids);

  return z.array(z.string().min(1)).superRefine((values, context) => {
    values.forEach((value, index) => {
      if (!allowed.has(value)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: \`Unknown \${label} ID: \${value}\`,
        });
      }
    });
  });
}

const taxonomySchema = z.object({
  testingTypes: allowedIds(TESTING_TYPE_IDS, 'testing type').min(1),
  frameworks: allowedIds(FRAMEWORK_IDS, 'framework').default([]),
  languages: allowedIds(LANGUAGE_IDS, 'language').min(1),
  domains: allowedIds(DOMAIN_IDS, 'domain').default([]),
});
\`\`\`

Confirm the installed Zod API supports chaining around the selected effects type before adopting this exact composition. If not, place minimum checks in the base array or use a field-level refinement. Observable policy should remain the same.

Test all exported IDs with a generated positive table. Then test a short set of explicit negatives, including empty strings and case variants. Assert issue paths and messages without snapshotting complete Zod error objects.

The [CI guide](/blog/validate-skill-md-in-ci-pipeline) can run this suite whenever schemas or constants change. A positive sweep derived from constants makes additions low-maintenance while preserving deliberate review for removals.

Test the raw array before it goes through a form or route, since those layers may trim or change case. The shared rule should see the same strings that a parsed skill gives it, with no test-only clean-up in front.

Keep the set build in one small helper and pass the field name into its error text. This gives all four fields the same core rule, while each issue can still tell the author which kind of ID was wrong.

Do not read names, slugs, or labels when an ID is the file contract. A UI may show \`TypeScript\`, but the source check should ask for \`typescript\` and state that exact fix in its note.

If a list is large, test all good IDs in a loop and keep just a few hand-made bad rows. This gives full pass cover with a small test file and keeps each fail case easy to read.

## unknown skill category acceptance criteria

Unknown skill category acceptance criteria should state whether bad fields block parsing, checks, publish, or just catalog use. One shared result is safer than letting each caller make up its own rule.

For the proposed shared rule, each taxonomy value must equal one known ID. Required arrays must hold at least one valid item, optional arrays may be empty, and non-string values must keep their type errors.

An invalid item should produce a path containing its field and array index. The message should include the rejected value and expected category type. Avoid listing every allowed value in a long error when a documentation route can provide the full list.

Case variants should either change before the check or fail with a hint. Do not lower-case only some fields. The chosen rule must cover testing types, frameworks, languages, and domains in the same way.

White space has the same need. If trim runs, check the known stored output; if strict checks are used, check that the value fails. A test helper must not trim input before the live schema sees it.

Duplicates require a separate acceptance statement because every duplicate may still be canonical. If rejected, report the later repeated index and original value. If accepted, scoring and filtering tests should prove duplicates do not distort behavior.

Backward compatibility requires a repo scan before blocking. Record actual unknown values and their files, then migrate or register them. Keep that report tied to a revision so later edits do not invalidate the evidence.

Diagnostics should remain stable enough for CLI and CI display. Assert field, index, rejected value, and a short code if one is introduced. Avoid depending on Zod's complete formatted text when only the local message is owned.

SKILL.md taxonomy allowlist validation passes when constants and schema cannot drift silently. Adding a constant must make it accepted; removing one must expose every dependent fixture and repo skill for review.

Write the pass rule in terms of source IDs, not the labels shown on a page. An item passes when it is a nonblank string in the right live set, and its array also meets the field's size rule.

Write the fail rule in terms of one path and one value. The note should name the field, slot, bad ID, and kind of set, while a help link can show the full list away from the error text.

Keep trim, case, and alias work in named steps that run before or after the set check by design. A test should show the raw value and the final value, so no quiet fix can mask what the author wrote.

For a field that may be blank, test a missing key, an empty list, and a list with one empty string. These three forms do not mean the same thing, and the set check should not blur their results.

## How do you test SKILL.md taxonomy allowlist validation step by step?

Test SKILL.md taxonomy allowlist validation by characterizing free-form acceptance, adding constant-derived membership, and then scanning real skills. Keep structural, membership, normalization, and duplicate rules in separate assertions.

1. Read \`packages/shared/src/schemas/skill-schema.ts\` and list each array's current minimum or default.
2. Import ID arrays from the four canonical constant modules and assert they contain unique nonempty strings.
3. Build one complete valid frontmatter object with canonical testing type and language IDs.
4. Replace one field at a time with an unknown, empty, case-shifted, or whitespace-padded value.
5. Preserve current safe-parse results as characterization before changing schema behavior.
6. Add membership checks derived from exported IDs and assert one issue per invalid index.
7. Sweep every canonical ID through its field and require success without hardcoded duplicate lists.
8. Decide normalization and duplicate policies, then add focused tests outside membership cases.
9. Scan repo skills, migrate observed invalid values, and enable blocking CI only afterward.

Start with constant integrity tests. Every ID should be nonempty and unique within its category. If categories must not overlap, state and test that separately rather than assuming overlap is invalid.

Next, prove the existing schema accepts an unknown string. That result gives the change a clear before state. It also protects against writing a new test that accidentally invokes a wrapper already performing membership checks.

Then introduce item-level issues while preserving current defaults and minimums. Run arrays with several invalid values to ensure all indexes are reported in one result. Keep numeric and null controls for base type behavior.

After unit coverage, parse literal SKILL.md files and pass their frontmatter through the shared schema. This integration shows parser normalization does not hide spaces, labels, or case shifts before membership checks.

Finally, run the repo scan and one publish-path check. Broad catalog behavior belongs in [seed regression tests](/blog/seed-skill-catalog-parser-regression-tests), while the shared suite stays authoritative for accepted IDs.

Run the source-list checks first and stop if any ID is blank or used twice in one set. A bad source set makes all later pass and fail claims weak, so it must be fixed at the root.

Run the all-good sweep next, with one row per ID and field, then show the field and ID when a row fails. This makes a new source record easy to test with no hand edit to the good list.

Run bad strings after the good sweep and check that each one is still absent from its set. Add type, blank, case, and space rows last because those checks can fail before set use.

Scan real skill files in report mode and sort bad rows by field, value, and path. The team can then spot one old alias used in many files and plan one clear change for that group.

Keep the [publishing guide](/how-to-publish) in each report so an author can find current IDs fast. The test note should stay short, while the guide can show names, IDs, and use examples.

## SKILL.md taxonomy allowlist validation rollout and regression checks

Rollout should begin in report-only mode if current repo data has unknown values. Emit field, value, file, and suggested canonical ID where the suggestion is unambiguous. Never rewrite source automatically without review.

Assign canonical vocabulary ownership to the constant modules. The schema should consume those exports, and documentation generators should do the same. Avoid copying IDs into route handlers, forms, or test utilities.

Use a staged change when removing an ID. First mark it deprecated in author guidance, migrate stored and source data, then remove it from the constants. The positive sweep will show when old fixtures still depend on it.

Adding an ID should require a constant record plus one integration case if downstream indexing has special behavior. The shared allowlist test should accept it automatically. This makes schema and catalog vocabulary move together.

Keep normalization outside membership unless the contract explicitly combines them. A parser transform can produce canonical IDs before the allowlist, but tests should show input and output. Silent case repair can hide author mistakes and create path differences.

Review issue messages with CLI and web consumers. A structured issue path is more durable than parsing prose. If a custom code is added, document it and test it beside the rejected value.

Run regression checks on changes to schemas, constant records, parser array handling, seed ingestion, publishing, filtering, or skill forms. These boundaries either create taxonomy values or rely on their canonical shape.

The [publishing guide](/how-to-publish) should link authors to current IDs. The [skill directory](/skills) should use the same records for filters, preventing accepted metadata from becoming an invisible category.

Keep characterization history in the pull request, but final tests should express the selected policy. A misleading permanent test named "accepts unknown values" should be replaced once rejection ships, with migration notes preserving context.

Start with a read-only scan that gives no new pass or fail state, then save the bad value groups from the current tree. This list is the work plan, and each fixed file should make one row leave the next scan.

Add the shared rule only after the scan can pass or after old IDs have a short grace map with an end date. Do not keep an alias map with no owner, since it can become a second ID set by stealth.

When a new ID lands, check its source record, the all-good sweep, one parsed skill, and one web filter path. These four checks show that the ID can be read, passed, saved, and used.

When an old ID leaves, find all source files and stored rows before the constant is removed. Change the data first, then drop the ID and let the negative tests prove that new use now fails.

Keep issue text plain and stable, but put the allowed set in code rather than in that text. A long list in each error soon gets stale and makes a one-line fail hard to scan.

Ask one reviewer to check source sets and one to check skill data, since those sides can drift in distinct ways. Both reviews should use the same IDs, field names, and scan report from the patch.

At the end of the scan, count good and bad rows by field, then check that their sum is the full set of values read from files. This guards against a loop that skips a blank item, stops at the first bad item, or drops a whole field from its report.

Keep one known good file and one known bad file out of any auto-made test set, then write both by hand with short lists. Those two files act as a cross-check for the scan code, the shared rule, the path in each issue, and the final pass state.

## Frequently Asked Questions

### What should testing type enum validation tests assert?

They should sweep every exported testing type ID as a valid item and reject explicit nonmembers with indexed issues. Separate tests must cover an empty required array, an empty string item, case shifts, and non-string values. This distinguishes array size, item type, and allowlist membership.

### How does framework ID allowlist affect the SKILL.md contract?

Framework arrays may remain empty, but every present item must equal a canonical framework ID under a strict policy. Existing aliases or display names then require migration or an explicit normalization map. Tests should import \`FRAMEWORK_IDS\` rather than maintain another accepted-value list.

### Which fixture best exposes language taxonomy schema?

Use a complete object with \`languages: ['typescript', 'TypeScript', 'unknown-language']\`. The known first item should pass, while strict checks report indexes one and two. Pair this with the same empty array to keep the required-list note apart from item set faults.

### When should teams check domain value validation?

Check it when domain constants, schemas, parsers, publishing forms, seed files, or catalog filters change. Also run a repository scan before removing or renaming an ID. Domain issues should name the source field, item index, rejected value, and selected canonical alternative when certain.

### What is the pass criterion for unknown skill category?

All canonical values must pass from source exports, and every nonmember must receive a fixed indexed issue. Optional arrays may stay empty, required arrays need valid members, and structural type errors must remain intact. No caller should maintain a conflicting private allowlist.

## Conclusion

SKILL.md taxonomy allowlist validation closes the gap between string-array shape and catalog terms. The current schema accepts any strings, while four repo constant modules already provide known IDs for one shared rule.

Characterize current acceptance, derive membership checks from those exports, and migrate observed data before blocking publication. Review [skills](/skills) for canonical categories, then follow [how to publish](/how-to-publish) with indexed allowlist diagnostics enabled.`,
};
