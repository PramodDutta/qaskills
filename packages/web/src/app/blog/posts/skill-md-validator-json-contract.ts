import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md validator JSON contract Guide',
  description:
    'SKILL.md validator JSON contract: lock JSON fields, diagnostics, and exit codes. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md validator JSON contract',
  keywords: [
    'SKILL.md validator JSON contract',
    'qaskills validate JSON schema',
    'validator exit code tests',
    'CI validation result contract',
    'stable Zod error paths',
    'quality breakdown JSON',
  ],
  relatedSlugs: [
    'validate-skill-md-in-ci-pipeline',
    'malformed-skill-md-frontmatter-parser-tests',
    'seed-skill-catalog-parser-regression-tests',
    'skill-md-format-guide',
  ],
  sources: ['https://nodejs.org/api/process.html', 'https://zod.dev/api'],
  repoEvidence: ['packages/skill-validator/src/index.ts', 'packages/skill-validator/src/cli.ts'],
  content: `A SKILL.md validator JSON contract should lock top-level fields, error and warning items, score fields, and process status for valid and invalid files. Current code returns one typed result from the library, prints it for --json, and exits with 0 when valid or 1 otherwise.

CI should test that whole link rather than trust a sample file. Start with a known skill from the [QA skill catalog](/skills), then use small local files to prove each branch.

## What does SKILL.md validator JSON contract need to prove?

A SKILL.md validator JSON contract needs to prove that every machine-readable run has a known shape and matching status. It should cover success, schema failure, warnings, parse failure, and file read failure.

The main result type lives in packages/skill-validator/src/index.ts. ValidationResult contains valid, errors, warnings, qualityScore, and qualityBreakdown.

Each error has field and message strings. Each warning has the same two keys, which keeps common report code small.

The score breakdown contains schema, documentation, completeness, freshness, and total numbers. The separate qualityScore field repeats the total at the current library boundary.

The function validateSkillContent always returns this result shape for text it can receive. A frontmatter parse catch returns zero scores, one frontmatter error, and no warnings.

Normal schema failures are mapped from Zod issues. Their field value comes from issue.path joined with dots, while the message comes from the issue text.

The file helper resolves a path, reads UTF-8 text, and passes it to validateSkillContent. A missing file throws before any ValidationResult exists.

The CLI behavior appears in packages/skill-validator/src/cli.ts. With --json, it writes JSON.stringify(result, null, 2) and calls process.exit with zero or one.

The catch branch differs because it writes a colored text error to stderr and exits one. Thus, a missing file does not produce the same JSON result as an invalid file today.

That gap must be named in tests rather than hidden by a broad nonzero check. A team can preserve it or plan a JSON error envelope, but it should not claim that change has shipped.

The [SKILL.md format guide](/blog/skill-md-format-guide) helps build a valid control file. Keep the fixture stable so score or warning changes do not blur a JSON field failure.

A useful contract test compares parsed data, not whitespace from pretty printing. Add one raw-output check only if indentation and final newline are part of a stated shell contract.

The SKILL.md validator JSON contract should also state its versioning rule. Adding a new optional key may be safe for tolerant clients, while deleting or renaming a key is usually a breaking change.

## qaskills validate JSON schema: current repository behavior

The qaskills validate JSON schema is an object produced directly from ValidationResult. No second mapper changes names between the library and --json output.

For valid content, valid is true and errors is empty. Warnings may still contain items because short text, line count, token count, and safety checks do not make valid false.

For a schema error, valid is false and errors contains one item per Zod issue. Warnings and quality scores are still computed after schema checks unless frontmatter parsing itself failed.

This detail matters for CI clients. They should not assume an invalid result has zero score or that a valid result has no warnings.

The result has no schemaVersion key today. Consumers must pin package versions or use tolerant parsing if they need a clear upgrade boundary.

The first code example calls packages/skill-validator/src/index.ts through its public function. It locks field names and key relations without copying the implementation.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { validateSkillContent } from '@qaskills/skill-validator';

const validSkill = \`---
name: "json-contract"
description: "A valid contract fixture for CI output checks."
version: "1.0.0"
author: "qa-team"
license: "MIT"
testingTypes:
  - contract
languages:
  - typescript
---

Follow these clear test steps and report each failed field to the build log.
Keep the body long enough to avoid the short content warning in this control file.
\`;

describe('validator result shape', () => {
  it('returns the documented keys for valid content', () => {
    const result = validateSkillContent(validSkill);

    expect(Object.keys(result).sort()).toEqual([
      'errors',
      'qualityBreakdown',
      'qualityScore',
      'valid',
      'warnings',
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.qualityScore).toBe(result.qualityBreakdown.total);
  });

  it('returns field and message for a schema issue', () => {
    const result = validateSkillContent(validSkill.replace('typescript', ''));

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'languages', message: expect.any(String) }),
      ]),
    );
  });
});
\`\`\`

The replacement leaves an empty string item, so a stronger failure fixture should remove the list entry or use an empty list. Keep the final project test tied to the exact schema condition it names.

Object key sorting avoids dependence on JavaScript insertion order. Nested score keys can be checked separately because CI often maps those names to build reports.

The [CI validation article](/blog/validate-skill-md-in-ci-pipeline) shows where this library check fits. Run it before the process test so a failure points to either result creation or CLI transport.

Do not snapshot the whole score without fixed content. Small text edits can change documentation points while the JSON keys remain correct.

The qaskills validate JSON schema test should also reject null for arrays and numbers. Such checks protect typed clients even if JavaScript code can accept wider values at runtime.

## Why does validator exit code tests change the contract?

Validator exit code tests bind JSON meaning to shell meaning. A well-formed false result must produce a failing process status, while a true result must return success.

The current CLI uses process.exit(result.valid ? 0 : 1) in both JSON and human modes. Warnings alone do not change valid, so they leave the status at zero.

Help and a missing path argument print usage and exit zero. That branch runs before file validation and should be tested apart from --json.

A missing or unreadable file reaches the catch branch. It prints text on stderr and exits one, even when --json was requested.

Node's [process documentation](https://nodejs.org/api/process.html) notes that process.exit ends the process at once and may cut off pending stdout writes. The current payload is small and written before exit, but a child-process test should still capture complete output.

Do not mock process.exit without care. If the mock stops termination but lets main continue, the test can observe states that a real caller never sees.

Spawning the built executable gives the clearest shell contract. It checks argument parsing, file reads, stdout, stderr, JSON parsing, and status in one run.

Use one valid file, one schema-invalid file, one warning-only file, and one missing path. The result table should state whether stdout is JSON for each case.

The [malformed frontmatter article](/blog/malformed-skill-md-frontmatter-parser-tests) provides useful parser failures. Keep malformed YAML distinct from a valid YAML object that fails the schema.

Validator exit code tests should require exact 0 and 1 values, not only zero versus nonzero. A later move to another code would then require an intentional contract update.

If maintainers adopt process.exitCode instead, preserve the observed status tests. The implementation may change while the shell result remains stable.

## CI validation result contract test matrix

A CI validation result contract matrix should compare library result, JSON stream, stderr, and exit status. That view stops a client from treating every status-one run as the same failure.

The valid row needs no errors and may have a score below 100. Valid means schema acceptance, not a perfect quality result.

The warning-only row should use short content or another stable warning source. It should keep valid true, place an item in warnings, and exit zero.

The schema row should use a missing required language or testing type. It should return valid false, include a dotted field path, and exit one.

The parse row should force gray-matter to throw if a stable malformed sample exists. If no small input does so across versions, do not invent that branch; test the function catch with a controlled parser stub.

The file failure row should point to a path owned by the test that does not exist. It currently has text stderr, empty JSON stdout, and status one.

| Case | Library result | JSON stdout | stderr | Exit status |
|---|---|---|---|---|
| Valid file | valid true, no errors | Complete result object | Empty | 0 |
| Warning-only file | valid true, warnings present | Complete result object | Empty | 0 |
| Schema error | valid false, errors present | Complete result object | Empty | 1 |
| Parse failure | valid false, frontmatter error | Complete result object | Empty | 1 |
| Missing file | No result returned | Empty today | Text error today | 1 |

Keep expected error messages as exact text only when CI parses them. Otherwise, lock field, value type, and a stable message code after such a code exists.

Human-readable Zod text may change during a dependency update. Field paths are often a safer machine key, but even they need explicit ownership.

The [seed parser regression guide](/blog/seed-skill-catalog-parser-regression-tests) can supply valid catalog controls. Do not use a whole seed file for each negative row because unrelated metadata makes failures noisy.

Run the matrix against the built package artifact as well as source tests. Packaging can omit a file, change module loading, or route the binary to stale code.

The SKILL.md validator JSON contract passes this matrix only when status and body agree. A false result with status zero is as harmful to CI as a status-one result with unreadable output.

### Build a consumer proof record

A client test should save the command, package version, Node version, status, stream used, and parsed top-level keys in one small record. Those facts let a later owner tell a shape change from a bad file, a failed build, or a host issue without reading the full skill text.

Use safe labels for fixture paths and keep file contents out of normal logs, since a real skill may hold private work steps or internal names. On failure, store the short field path and message with a hash of the fixture, which links the run to known test data without copying all input.

Parse stdout only after the process ends and only for rows that promise JSON there, while text-only branches should get their own stream check. This rule stops a client from feeding an empty string or a color-coded file error into JSON.parse, where the new syntax error would hide the first cause.

Check that errors and warnings are arrays before reading their items, then check each item has string field and message values. A client that trusts one golden sample may crash when an empty array, several issues, or a warning-only result reaches a branch that the sample never used.

Treat added top-level keys as a planned compatibility case rather than dropping the test outright, because tolerant and strict clients need different proof. A tolerant reader can pick owned fields and ignore the rest, while a strict reader should pin a schema version and fail with a clear upgrade note.

The score object needs the same care because a missing key and a zero value mean different things to a report. Require finite numbers, exact owned key names, and equality between qualityScore and total, then let display code choose how much detail a build log should show.

Run one result through JSON.stringify and JSON.parse again after the CLI check, which proves the data contains no value that is lost by normal JSON transport. This extra pass is small, but it protects clients that save the result as an artifact before another job reads it.

Finally, compare the parsed child output with a direct validateSkillContent result for the same bytes. Exact object parity shows that argument handling and file reads add transport only, while any real difference points to the CLI boundary instead of the core checks.

## How should stable Zod error paths be verified?

Stable Zod error paths should be verified with one isolated field failure per fixture. The current mapper joins every issue path segment with a period.

A missing languages list should point to languages. A bad nested path would use dot-joined segments if nested schema fields are added later.

Array element checks can include a numeric index in the path. Consumers must decide whether they match the full path or only its first field segment.

The Zod [API reference](https://zod.dev/api) shows that safeParse returns issues with paths and messages. It also allows custom refinement paths when a rule belongs to a chosen field.

Current repository code does not add custom issue codes to ValidationError. Only field and message survive the map, so clients cannot inspect the original Zod code from JSON.

That is a key contract choice. If CI needs stable codes, add them through an approved result version rather than parsing English message text.

The second example runs the compiled CLI and checks the process boundary. It uses exact statuses while parsing JSON only for branches that currently emit JSON.

\`\`\`typescript
import { mkdtempSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const cliPath = join(process.cwd(), 'packages/skill-validator/dist/cli.js');

function runValidator(path: string) {
  return spawnSync(process.execPath, [cliPath, path, '--json'], {
    encoding: 'utf8',
  });
}

it('keeps JSON validity and process status in sync', () => {
  const dir = mkdtempSync(join(tmpdir(), 'validator-contract-'));
  const invalidPath = join(dir, 'SKILL.md');
  writeFileSync(invalidPath, '---\\nname: bad\\n---\\nShort body.\\n');

  const invalid = runValidator(invalidPath);
  expect(invalid.status).toBe(1);
  expect(JSON.parse(invalid.stdout)).toMatchObject({ valid: false });

  const missing = runValidator(join(dir, 'missing.md'));
  expect(missing.status).toBe(1);
  expect(missing.stdout).toBe('');
  expect(missing.stderr).toContain('Error:');
});
\`\`\`

The path should match the actual built entry after package inspection. Do not hard-code dist layout if the package exports a stable binary path that tests can resolve.

Strip color codes only for the current missing-file text check. JSON output itself contains no terminal color sequences.

Use the [SKILL.md guide](/blog/skill-md-format-guide) to create the matching valid file. Then assert status zero and parse its stdout through the same helper.

Stable Zod error paths need a review rule for dependency upgrades. Run contract fixtures before changing Zod, then inspect any issue path or message movement.

## quality breakdown JSON acceptance criteria

Quality breakdown JSON should contain five finite numbers and keep total equal to qualityScore. The current scorer caps total at 100 and supplies a fixed freshness score.

Schema, documentation, completeness, and freshness are not error counts. CI should display them as score parts rather than infer validity from any one value.

Validity comes from errors.length being zero. Warnings do not lower or raise valid directly, though the underlying content may also change its score.

Acceptance should check each key exists for valid, invalid, and parse-failure results. The parse catch uses zeros for every score key, which is different from a normal schema failure.

Use integer checks if the scorer promises whole points. Also reject NaN and Infinity because JSON.stringify can turn non-finite values into null.

The total relation should be tested with several fixtures. One assertion on a full-score file may miss an incorrect subtotal name or a stale duplicate field.

Do not use qualityScore as an alias for valid. A valid short skill can have warnings and a modest score, while an invalid skill can still earn points from present fields.

The [publishing guide](/how-to-publish) can explain quality before upload. Keep local validator score terms aligned with any score shown after publication, or state when those formulas differ.

A future score model may add a new part. Tolerant consumers can ignore unknown keys, but strict clients need a schema version and a planned update.

Quality breakdown JSON acceptance criteria should name value range, integer rule, key set, and total relation. Those checks are stronger than one broad stored snapshot.

## How do you test SKILL.md validator JSON contract step by step?

Test a SKILL.md validator JSON contract from the pure function outward to the spawned command. This order gives each failure one clear owner.

1. Read packages/skill-validator/src/index.ts and packages/skill-validator/src/cli.ts, then list every result key and process branch.
2. Create minimal valid, warning-only, schema-invalid, parse-failure, and missing-file fixtures in a test-owned temporary directory.
3. Call validateSkillContent for text cases and assert validity, arrays, field paths, score keys, and total equality.
4. Build the validator package, spawn its real CLI with --json, and capture stdout, stderr, and exact exit status.
5. Compare the function result with parsed CLI JSON for each file-backed case that reaches validation.
6. Run the matrix in CI on supported Node versions and review every contract diff before package release.

At step one, include help and no-argument branches even if CI never calls them. Their status remains part of shell behavior.

At step two, make each file fail for one reason. A tiny malformed file that triggers ten schema issues is poor proof for one path.

At step three, check arrays even when empty. Missing errors and an empty errors array are not the same JSON contract.

At step four, build first so the process test covers the shipped artifact. The [CI pipeline guide](/blog/validate-skill-md-in-ci-pipeline) can place this after shared and validator builds.

At step five, compare parsed objects rather than pretty-print spacing. Save raw streams only when debugging a failed run.

At step six, treat a Node change in exit or stream behavior as a review event. The source call to process.exit may stay the same while timing differs.

Repeat tests without terminal color settings and with a normal CI environment. JSON should remain plain, and text stderr should be the only colored branch today.

The SKILL.md validator JSON contract is ready when valid, invalid, warning, and file-failure outcomes are all distinct and machine checks cannot confuse them. A saved proof record should show that result for both source and packed command runs.

## SKILL.md validator JSON contract rollout and regression checks

Roll out a SKILL.md validator JSON contract by publishing the observed version first. Consumers need a baseline before maintainers improve weak branches.

Document current keys, value types, and status mapping beside the package version. Include the missing-file text exception so clients do not parse empty stdout as JSON.

If adding schemaVersion, choose whether it is a number or stable string and keep that type fixed. Add it before removing or renaming any existing key.

If changing missing-file output to JSON, keep status one and add a process test for stdout and stderr. State whether operational errors share ValidationResult or use a separate envelope.

Run source tests, package build tests, and spawned binary tests. A source-only pass cannot prove the published command resolves its shared dependency.

Use the [malformed parser tests](/blog/malformed-skill-md-frontmatter-parser-tests) for syntax cases and the [seed regression guide](/blog/seed-skill-catalog-parser-regression-tests) for valid real files. These suites cover different risks and should not share broad snapshots.

CI logs should show field and message for validation errors, plus a safe file label for read failures. Do not print full skill content or secret paths without a need.

Check old client fixtures against a new validator build. Tolerant readers should accept added fields, while strict readers should fail during an intentional version update.

Keep one golden valid JSON object and focused negative assertions. The golden file catches shape drift, while small assertions explain why a negative branch changed.

Finish each release by running the actual binary from its packed artifact. The [publishing workflow](/how-to-publish) should not claim CI-safe JSON until that artifact passes.

### Review each JSON contract change before release

Start the release review with a field-by-field diff rather than a large text snapshot, since key additions, removals, type changes, and meaning changes have different costs. The owner should mark each row as compatible, versioned, or rejected, then link that choice to a client test that shows the expected result.

Run the old client against the new command and the new client against one saved old result, because compatibility has two useful directions. The first check protects active CI jobs during an upgrade, while the second shows whether a new report reader can still open past build artifacts.

Keep process status in the same review even when only JSON fields changed, since clients often gate a job before they parse details. A status shift from zero to one can break builds with no schema parse error, while an incorrect zero can let an invalid file pass unnoticed.

Review warning changes with sample policy code that either records, blocks, or ignores them by name. The validator may keep status zero, but a team-owned warnings-as-errors rule should still behave the same after messages, counts, or ordering move.

Pack the workspace package and run the child tests from that output in a clean folder with no source imports. This check proves the released files include the validator, shared code, binary path, and package metadata that the command needs at runtime.

Save only the approved golden results and the script that made them, then remove test files and temp folders after each run. A repeat on a clean host should yield the same fields, paths, score links, streams, and statuses without help from stale build state.

Run one last fault case in which the child can read the file but receives schema-invalid data, then prove stdout still holds a full result with all arrays and score keys while stderr stays empty and status stays one for the calling job, with the same safe test ID shown in each saved log record. This check draws a firm line between a user field error and a file-system fault, which helps shell code choose the right parser, keep the first cause, show the right message, and save the useful details for each branch.

## Frequently Asked Questions

### What fields belong in qaskills validate JSON schema?

Current output contains valid, errors, warnings, qualityScore, and qualityBreakdown. Error and warning items each contain field and message. The breakdown contains schema, documentation, completeness, freshness, and total numbers. Tests should also require qualityScore to equal the returned total for every normal validation result.

### What should validator exit code tests expect?

Expect status zero for valid files, including warning-only files, and status one for invalid or unreadable files. Help and no-argument usage currently exit zero. Pair each status with stdout and stderr checks so CI cannot mistake plain error text for a parsed validation object.

### How should CI handle a warning-only result?

Parse the JSON, confirm valid is true, and inspect the warnings array under the team's warning policy. The current CLI exits zero because warnings do not change valid. CI may enforce a stricter local rule, but it should label that rule as policy beyond the validator's status contract.

### Are stable Zod error paths enough for long-term clients?

They are useful, but field paths alone do not provide a full versioned error code. Current output drops Zod's issue code and retains message text. Long-term clients should avoid parsing prose, pin package versions, or adopt explicit codes through a reviewed JSON contract change.

### Why test quality breakdown JSON on invalid files?

Normal schema failures still pass through scoring, so invalid output can contain nonzero score parts. Parse failures return an all-zero breakdown instead. Testing both states prevents clients from treating score as validity and ensures every result keeps the same numeric key structure.

## Conclusion

A SKILL.md validator JSON contract must bind result keys, issue paths, warning rules, score parts, streams, and exact exit status. Characterize the current missing-file text branch, then version any move to a common JSON error envelope.

Inspect a published [SKILL.md skill](/skills), use the [publication checklist](/how-to-publish), and add the five-case process matrix before relying on validator output in CI. Keep its parsed result with the build so the next contract review has a trusted baseline.`,
};
