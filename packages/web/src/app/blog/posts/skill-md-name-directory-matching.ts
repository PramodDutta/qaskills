import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md name directory matching Guide',
  description:
    'SKILL.md name directory matching: add path-aware checks for package identity. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md name directory matching',
  keywords: [
    'SKILL.md name directory matching',
    'skill folder name validation',
    'parent directory mismatch',
    'Agent Skills name rule',
    'path aware skill validator',
    'SKILL.md package identity',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: ['https://agentskills.io/specification', 'https://nodejs.org/api/path.html'],
  repoEvidence: [
    'packages/skill-validator/src/index.ts',
    'packages/shared/src/schemas/skill-schema.ts',
  ],
  content: `SKILL.md name directory matching should compare the parsed frontmatter name with the directory that directly contains the file. QASkills currently reads an absolute file path, then sends only file text into content validation. Add a path-aware file check while keeping content-only validation useful for editors and isolated unit tests.

This guide records current code before proposing a rule. It does not claim that folder matching already ships. The goal is a test contract that tells maintainers exactly which layer owns the package name and which result each fixture must produce.

## What does SKILL.md name directory matching need to prove?

SKILL.md name directory matching must prove that a package presents one stable name at its file and folder boundaries. The test begins with a path such as \`skills/api-contract/SKILL.md\`, parses the frontmatter name, and compares that name with \`api-contract\`. A mismatch must produce a result chosen by the rule, not pass by accident because path data vanished.

The check is narrower than general frontmatter checks. The schema can still decide whether \`name\` is present, whether its length is allowed, and whether other required fields are valid. The file-level check has the path data needed to compare two otherwise valid strings.

Current behavior matters because a change can break content-only callers. In \`packages/skill-validator/src/index.ts\`, \`validateSkillFile\` resolves and reads the supplied path. It then calls \`validateSkillContent(raw)\`, so the downstream function receives no parent directory.

The schema in \`packages/shared/src/schemas/skill-schema.ts\` validates \`name\` as a string from one through one hundred characters. It does not know a file location and cannot infer one safely. A matching rule placed only in that schema would require hidden global state or a new input shape, both of which would blur its current purpose.

Treat the accepted link as a visible contract. Exact, case-sensitive equality is the simplest rule when the folder is already the package name. If a move needs warnings first, tests should name that short-term state and the later rejection state separately.

The [Agent Skills specification](https://agentskills.io/specification) supplies the name rules used for this proposed boundary. The [SKILL.md format guide](/blog/skill-md-format-guide) explains the wider document shape, while this article focuses only on names across a file path and its frontmatter.

A reviewer should be able to trace each result from the path and file text alone, with no guess about where the test ran. The pass case shows both names, and the fail case shows which side changed while all other data stayed fixed. This small proof helps the team review the rule before it can block a real package.

## skill folder name validation: current repository behavior

Current skill folder name validation is a content check reached through a file reader. Lines 47 through 50 of \`packages/skill-validator/src/index.ts\` call \`path.resolve(filePath)\`, read UTF-8 text, and return \`validateSkillContent(raw)\`. The full path helps locate the file, but no part of it reaches the returned result.

\`validateSkillContent\` parses the raw markdown and runs \`skillFrontmatterSchema.safeParse\` against parsed frontmatter. It collects schema issues, checks line and token estimates, reviews content length, scans known unsafe command patterns, and calculates quality. None of those branches compares \`parsed.frontmatter.name\` with a directory.

That baseline has two useful traits. A valid document can be checked from an editor buffer with no test path. A file can also move between folders without changing the content check, because only its raw text controls that result.

The same properties expose the missing package check. Two files with identical text in \`api-checks\` and \`browser-checks\` produce identical results. If the frontmatter says \`api-checks\`, the second package still appears valid under the current function.

Baseline tests should lock this behavior before a change. One test can call \`validateSkillContent\` twice with the same text and prove equal outputs. Another can place the file under a mismatched test folder and record that \`validateSkillFile\` currently returns the same result.

Do not convert that fact into a claim about a shipped fix. It is proof for a new file-level check. The proposed branch should sit where both parsed name and the resolved path are in scope, while the existing raw-content function stays stable.

The path code should use host-aware helpers rather than hand-written slash splitting. Node's [path API](https://nodejs.org/api/path.html) defines \`dirname\`, \`basename\`, and \`resolve\` for the active host. Tests can use \`join\` and test folders so Windows and POSIX runners check the same rule.

The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) shows where a file-level gate belongs in release checks. Keep editor feedback on \`validateSkillContent\`, then reserve package name checks for callers that supply a real file path.

When this baseline fails, log the file call, the raw-content call, and the count of name issues, but do not log the whole file. The two calls should match before the new rule lands, which makes the later change easy to see in one diff. A short call log also tells reviewers that the test did not mock away the path reader.

## Why does parent directory mismatch change the contract?

A parent directory mismatch combines two valid local facts into one invalid package link. The frontmatter name may pass the string schema, and the folder may exist, yet the package name is unclear. That link cannot be tested when either fact is inspected alone.

The file layer owns location. It can derive \`path.basename(path.dirname(absolutePath))\` after resolving the supplied file. The content layer owns parse and schema results, so it should not guess a path from a title, process directory, or caller convention.

This separation prevents an accidental breaking change. Existing code may call \`validateSkillContent\` with unsaved markdown, generated examples, or content fetched from an API. Requiring a folder for those calls would turn a pure content check into an environment-dependent operation.

A path-aware wrapper can preserve both contracts. It can parse enough data to compare names, or a refactor can return parsed frontmatter from an internal helper shared by both public functions. Tests should focus on visible results and avoid forcing an internal design unless maintainers choose one.

The case rule must be clear. If package names are case-sensitive, \`Api-Checks\` and \`api-checks\` differ even on a case-blind workstation. Comparing lowercase values would hide that mismatch and could produce different packages on another file system.

Nested test folders are another boundary. The expected folder is the direct parent of \`SKILL.md\`, not the test root or repository name. A fixture at \`tmp/run-42/api-checks/SKILL.md\` must compare against \`api-checks\`.

Error text becomes part of the contract once failures reach authors. A useful error names the \`name\` field, the expected folder value, and the observed frontmatter value. It should avoid full test paths, which make snapshots noisy and can expose runner details.

The proposed result should coexist with ordinary schema errors. Decide whether a malformed name prevents the relationship check or whether both errors appear. Stable tests should assert the chosen order, because changing issue order can break CLI output and review automation.

Use the [malformed frontmatter tests](/blog/malformed-skill-md-frontmatter-parser-tests) to cover parse failures before identity logic. A parent directory mismatch test should start from valid markdown, so one failed assertion points to the relationship rather than YAML syntax.

One test should pass a relative file path from a known work folder, while a second passes the full path to the same file. Both calls should name the same direct parent and return the same issue set. This pair guards the path setup without tying the check to one host or shell.

## Agent Skills name rule test matrix

The Agent Skills name rule matrix needs one accepted baseline, one case boundary, one nested path, and one valid hyphenated identity. Each row should drive a real file-level call and assert a stable field and message where the proposed policy rejects input.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Matching identity | Folder \`api-checks\`, name \`api-checks\` | \`packages/skill-validator/src/index.ts\` | File remains valid when all other fields pass |
| Case-only mismatch | Folder \`api-checks\`, name \`Api-Checks\` | File-level path comparison | Result rejects or warns according to the recorded migration policy |
| Nested package | \`tmp/run-42/api-checks/SKILL.md\` | Immediate parent extraction | Expected name is \`api-checks\`, not \`run-42\` |
| Hyphenated identity | Folder and name \`api-contract-checks\` | Schema plus file wrapper | Both layers accept the same exact identifier |

The matching row protects existing valid packages. It should also assert that content warnings and quality values remain unchanged after the path check. A new identity branch must not erase the result returned by \`validateSkillContent\`.

The case-only row detects comparisons that call \`toLowerCase\` before equality. Such normalization may seem convenient on one machine, but it weakens a portable package contract. Keep the fixture names ASCII so the test isolates case rather than Unicode behavior.

The nested row catches an off-by-one path error. Derive the parent from the file's absolute path after resolution, then take its basename. Do not compare the skill name with the fixture root or the current working directory.

The hyphenated row proves that valid separators survive unchanged. It also guards against a naive split that compares only the last name segment. The observed identity must remain the whole immediate directory name.

Add one content-only control outside the table. Calling \`validateSkillContent\` with the same valid markdown should still succeed because no path was supplied. This result documents that package matching belongs to file validation and is not silently imposed on all callers.

Link the table to [seed catalog parser tests](/blog/seed-skill-catalog-parser-regression-tests) when extending coverage across shipped fixtures. The focused matrix remains small enough to diagnose, while a catalog pass finds real package names that need migration before rejection becomes mandatory.

Keep the table data in plain test rows instead of five nearly equal files checked into the suite. A helper can write each row to its own fresh folder, run the file check, and clear the root at the end. The row name then appears in a failed test, so the team can spot the bad case at once.

## How should path aware skill validator be verified?

A path aware skill validator should be verified first as a current baseline, then as a proposed contract test. The first example proves that current \`validateSkillFile\` drops location after reading. It uses real test paths and checks only behavior present in the repository today.

\`\`\`typescript
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect, it } from 'vitest';
import { validateSkillFile } from '../src/index';

const validSkill = (name: string) => \`---
name: \${name}
description: Checks API contracts with repeatable fixtures.
version: 1.0.0
author: qa-team
license: MIT
testingTypes: [contract]
languages: [typescript]
---

Run the documented contract checks and report each failed response field.
\`;

it('characterizes the current path-independent result', async () => {
  const root = await mkdtemp(join(tmpdir(), 'skill-name-'));
  const folder = join(root, 'browser-checks');
  await mkdir(folder);
  const file = join(folder, 'SKILL.md');
  await writeFile(file, validSkill('api-checks'), 'utf8');

  const result = await validateSkillFile(file);

  expect(result.errors).not.toContainEqual(
    expect.objectContaining({ field: 'name' }),
  );
});
\`\`\`

This test is a record of current behavior. It should change only when the file-level rule is built. Mark it with a clear baseline label so a future reviewer does not treat acceptance as the desired final rule.

The second example states the target relationship without pretending the helper already exists. A small pure function makes the contract easy to review, while an integration case confirms that \`validateSkillFile\` merges its diagnostic into the normal result.

\`\`\`typescript
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function directoryNameIssue(filePath: string, skillName: string) {
  const expected = path.basename(path.dirname(path.resolve(filePath)));
  return expected === skillName
    ? undefined
    : {
        field: 'name',
        message: \`Skill name "\${skillName}" must match directory "\${expected}"\`,
      };
}

describe.each([
  ['api-checks', 'api-checks', true],
  ['api-checks', 'Api-Checks', false],
  ['api-contract-checks', 'api-contract-checks', true],
])('directory %s and name %s', (directory, name, accepted) => {
  it('applies exact identity matching', () => {
    const issue = directoryNameIssue(
      path.join('/fixture', directory, 'SKILL.md'),
      name,
    );

    expect(issue === undefined).toBe(accepted);
  });
});
\`\`\`

On Windows, a full test path beginning with a slash can behave differently, so real tests should build paths with \`join(tmpdir(), ...segments)\`. The compact example stresses the name check. The joined test should use the same test folder setup as the baseline case.

Assert error content narrowly. Check \`field\`, expected name, and observed name rather than snapshotting a full result with quality values. Then add one assertion that warnings and quality data from content validation remain present after the new issue is merged.

SKILL.md name directory matching also needs a malformed-content control. If parsing fails, the existing frontmatter error should remain the primary result, and path logic should not throw while trying to read a missing parsed name. That control preserves the error containment already implemented in \`validateSkillContent\`.

The [publishing instructions](/how-to-publish) are the right place to exercise the final file call. Keep the pure comparison tests in the validator package, then run one package fixture through the publication gate before changing its enforcement level.

Run the same mismatch more than once and compare the small public result, since the rule must not depend on file read order or old state. Change only the folder name for the next run and keep the raw bytes fixed. If the result shifts for any other reason, the test has found state that the file check should not own.

## SKILL.md package identity acceptance criteria

SKILL.md package identity passes when a valid file's frontmatter name equals its direct parent folder under the documented case rule. The file check must return a stable \`name\` error for a mismatch. The content check must remain useful when no path exists.

The accepted baseline includes exact matching names and plain hyphenated names. It includes nested test package roots because only the direct parent matters. It does not convert a case-only mismatch into a match unless the published rule explicitly chooses case folding.

Current and proposed outcomes must be labeled separately in tests. Today, a mismatched folder can pass if its content passes \`skillFrontmatterSchema\`. After implementation, the file call should add the selected error or migration warning, while the raw-content call should keep its current result.

Error ordering should be deterministic. Parse errors come from the existing parser branch, schema errors come from the Zod issue list, and a directory issue should occupy a documented place. Tests should assert this order only where clients display it or depend on it.

No name check should rewrite files, rename folders, or change parsed frontmatter. A check reports facts and rule results. Repair belongs to a separate command because a forced rename can break links, package refs, and source control history.

The check should use the resolved file path and immediate parent. A caller that passes a relative path should get the same result from any working directory where that path resolves to the same file. Tests can change the process location only if they restore it safely.

Migration evidence should come from the real catalog. Run the new comparison in warning mode over seed skills, record mismatches, and repair intentional names before enforcing rejection. Do not weaken equality merely to make an unknown catalog pass.

The [skills directory](/skills) offers published examples for manual review, but repository fixtures remain the automated source of truth. Pair a catalog scan with the small matrix so broad coverage never replaces precise boundary assertions.

A waiver, if the team needs one, should have an owner, a short cause, and an end date in the release log. Do not place a broad skip in the shared test helper, since that can hide new bad names as well as old ones. A named row for each known case keeps the debt in view while clean packages still face the full check.

Before the gate can block a package, one dry run should show the same file in a match case and a mismatch case, with the raw bytes held fixed, the folder changed once, and the result shown as a short field list that any reviewer can read without a local setup. The owner should then run the check from the package root and from one level above it, using a relative path in one run and a full path in the other, so both calls prove that path resolve leads to the same direct parent. A clean report should show one read per call, no write or rename, one name issue for the bad case, no name issue for the good case, and the same old warnings and score in both results. This proof is small enough to keep in a pull request, yet it covers the facts that most often go wrong when a path rule moves from a helper test to the real release gate.

## How do you test SKILL.md name directory matching step by step?

Test SKILL.md name directory matching by separating baseline behavior, the new relationship, and rollout enforcement. Each step should create observable evidence and leave temporary files isolated. The sequence below keeps a failure tied to one boundary.

1. Read \`packages/skill-validator/src/index.ts\` and \`packages/shared/src/schemas/skill-schema.ts\`, then record the current file and content inputs.
2. Create one smallest-valid \`SKILL.md\` under a directory whose name exactly matches frontmatter.
3. Add isolated fixtures for a case-only mismatch, a nested temporary package, and a valid hyphenated identity.
4. Run every path fixture through \`validateSkillFile\`, while sending the same raw text through \`validateSkillContent\`.
5. Assert exact matching for file validation and preserve path-free behavior for content validation.
6. Add the matrix to CI, then require stable field names and messages for each rejected or warning-only case.

Start with a helper that creates one directory and writes one file. Return both the file path and raw text so the test can exercise both public entry points. Register cleanup through the test framework even when an assertion fails.

Keep one mutation per fixture. Changing folder case, frontmatter case, and markdown syntax in one file makes the cause unclear. A focused fixture also makes diagnostics easier to compare across operating systems.

Run the baseline before adding new production logic. It confirms that the test can parse the document and that any later failure comes from identity. If baseline quality warnings exist, lengthen the markdown body rather than ignoring unrelated output.

Implement the smallest path-aware branch after the characterization result is committed to the test. Use Node path helpers, compare exact strings, and merge the new issue without dropping existing errors or warnings. Then invert only the mismatch expectation.

Add catalog coverage after unit and integration cases pass. Use [seed parser regression guidance](/blog/seed-skill-catalog-parser-regression-tests) to scan actual package folders, but keep failures grouped by package name rather than one huge snapshot.

Finally, run the same command used before publication. The [CI validation guide](/blog/validate-skill-md-in-ci-pipeline) can host that gate. A local unit pass is necessary, but the release contract depends on the file-level entry point used by automation.

A good run report lists the row name, expected folder, seen name, issue field, and pass or fail state in a short block. It does not need raw YAML, full paths, or the test user's home folder. This small report is enough for a maintainer to rerun the one failed case and check the fix.

## SKILL.md name directory matching rollout and regression checks

Roll out SKILL.md name directory matching with a catalog report before rejection. The report should list the relative package path, expected folder name, observed frontmatter name, and selected severity. Avoid full workspace paths because they differ on every runner.

Assign the file-check owner to the comparison code and the shared-schema owner to content rules. A change to the folder rule should request both reviews, since it links their boundaries. Release owners should review the block date and move proof.

Old callers need a clear list of path-free uses. Search for \`validateSkillContent\` and confirm editor, API, or built-content tests still pass without a folder. Search for \`validateSkillFile\` and confirm those callers expect package name checks.

The smallest regression suite has matching, case-only mismatch, nested path, hyphenated identity, malformed frontmatter, and content-only controls. Add a catalog scan as a separate suite. This layout keeps fast contract tests useful even if the larger scan is moved to CI.

Diagnostics should be stable but not over-specified. Assert the \`name\` field and both compared values. Avoid full object snapshots that fail when unrelated quality scores or warnings gain fields.

Test on at least one POSIX runner and one Windows runner when file packages support both. The comparison logic uses Node path functions, yet fixture creation and root handling can still differ. Portable path construction is part of the test, not a detail to skip.

Watch for duplicate errors after refactors. If both an internal helper and the file wrapper add the same mismatch, the result can show two identical messages. Assert one identity issue per file and preserve all unrelated schema issues.

After implementation, rerun [malformed frontmatter coverage](/blog/malformed-skill-md-frontmatter-parser-tests) and the publication gate. A package identity rule must not replace parser failures, hide safety warnings, or alter quality scoring for matching packages.

When a mismatch appears in the broad scan, copy it into the small table before changing code or data. The new row should fail for the same plain reason and pass once the owner fixes the name. This habit turns a one-time catalog find into a guard that stays useful after the move is done.

## Frequently Asked Questions

### What should skill folder name validation tests assert?

They should assert exact equality between parsed frontmatter name and the immediate parent directory for file-based validation. They should also preserve existing schema errors, warnings, and quality values. A separate content-only control should prove that raw markdown remains valid without a path argument.

### How does parent directory mismatch affect the SKILL.md contract?

It creates an inconsistent package identity even when the directory and frontmatter name are each valid strings. The file layer can observe both values, while the shared schema cannot. Tests should record today's acceptance separately from the proposed file-level warning or error.

### Which fixture best exposes Agent Skills name rule?

A case-only mismatch such as folder \`api-checks\` with name \`Api-Checks\` exposes weak comparisons without adding other invalid syntax. Pair it with an exact lowercase match. The two files show whether validation enforces a portable identifier instead of silently folding case.

### When should teams check path aware skill validator?

Run it whenever validation receives a real package file path, especially during publication and catalog CI. Do not require path identity from editor buffers or API text that lacks a folder. Those callers should continue using the content-only validation contract.

### What is the pass criterion for SKILL.md package identity?

A package passes when valid frontmatter names the direct containing folder exactly under the chosen case rule. Mismatches produce one stable \`name\` error, matching packages retain prior results, and content-only calls remain independent of the file system. The check must not rename either side.

## Conclusion

SKILL.md name directory matching belongs at the file boundary because that is where content and location meet. Add the case-only mismatch test next, preserve the path-free content API, and scan the catalog before enforcing rejection.

Open the [QASkills directory](/skills), inspect a published \`SKILL.md\`, then follow [how to publish](/how-to-publish) to apply this identity contract before publication. Start with one exact match and one case-only mismatch.`,
};
