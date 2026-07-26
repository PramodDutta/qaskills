import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'SKILL.md file error diagnostics Tests',
  description:
    'SKILL.md file error diagnostics: separate path, permission, and read failures. Use verified code, edge-case fixtures, and clear acceptance criteria.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'SKILL.md file error diagnostics',
  keywords: [
    'SKILL.md file error diagnostics',
    'SKILL.md ENOENT error',
    'validator permission denied',
    'directory instead of file',
    'broken symlink diagnostic',
    'qaskills validate error codes',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'validate-skill-md-in-ci-pipeline',
    'agent-skill-security-review-checklist',
    'how-to-publish-ai-agent-skill-directory',
  ],
  sources: ['https://nodejs.org/api/fs.html', 'https://nodejs.org/api/process.html'],
  repoEvidence: ['packages/skill-validator/src/index.ts', 'packages/skill-validator/src/cli.ts'],
  content: `SKILL.md file error diagnostics should keep the file failure code and path reason before the CLI formats an error. Today \`validateSkillFile\` lets \`readFile\` rejections escape, and the CLI catches them through one exception path. Tests should record current messages, then plan stable reason codes without saying they already ship.

The key step occurs before frontmatter parsing, so valid and invalid SKILL.md content cannot explain these failures. Resolved paths, host OS rules, CLI text, and exit status need separate checks.

## What does SKILL.md file error diagnostics need to prove?

SKILL.md file error diagnostics must prove which layer owns path resolution, file reading, error map, presentation, and process status. One end-to-end check cannot show where useful detail was lost.

The API entry point is \`validateSkillFile\` in \`packages/skill-validator/src/index.ts\`. It resolves the supplied path, awaits \`fs.readFile(absolutePath, 'utf-8')\`, and calls \`validateSkillContent\` only after the read succeeds.

There is no catch around path resolution or the read in that function. A rejected read therefore rejects the returned promise. It does not create a \`ValidationResult\`, schema error, warning, quality score, or frontmatter diagnostic.

The command step is \`packages/skill-validator/src/cli.ts\`. Its broad catch prints the caught \`Error.message\`, or \`Unknown error\` for another thrown value, then calls \`process.exit(1)\`. Each file-read failure reaches that same formatting branch.

Keep one direct API case and one spawned CLI case for each owned reason, using the same path setup but making each test assert only the facts its layer can promise. The API case should keep the system code, path, and cause, while the CLI case should check the selected stream, stable reason text, and status; this split stops a host message from becoming an accidental public contract.

Current runtime messages may contain codes such as \`ENOENT\`, \`EACCES\`, or \`EISDIR\`, but the CLI does not map them to QASkills-owned identifiers. Tests should label those strings as Node and host OS output in the current test.

The [Node file system docs](https://nodejs.org/api/fs.html) says promise-based \`readFile\` rejects for a folder on macOS, Linux, and Windows, while FreeBSD can return folder data. That platform difference must appear in the test plan.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) for content check cases. This article stops before parsing because a missing path, unreadable node, or folder cannot supply a dependable SKILL.md string.

The desired diagnostic model needs two levels. An API result should expose a stable reason plus optional system details. The CLI can then render human text or JSON without making callers parse a platform message.

Run direct API tests and spawned CLI tests through the [CI check guide](/blog/validate-skill-md-in-ci-pipeline). Keep platform-dependent file checks clearly marked, while mocked error map cases remain fixed.

## SKILL.md ENOENT error: current repository behavior

A SKILL.md ENOENT error currently begins as a rejected \`fs.readFile\` promise. Because \`validateSkillFile\` does not intercept that read fault, a direct caller receives the Node error object rather than a normal invalid result.

On a typical Node runtime, that object is an \`Error\` with properties such as \`code\`, \`errno\`, \`syscall\`, and \`path\`. Only \`message\` is guaranteed to reach current CLI formatting because the catch reads \`e.message\`.

The missing path is made absolute before the read. A test can supply a unique relative path, then assert that the rejected error has \`code === 'ENOENT'\` and an absolute \`path\` ending in the selected name.

Add a second case whose leaf name is the same but whose parent folder was never made, and compare only the shared read facts rather than guessing which missing node the host will name. This pair proves why \`ENOENT\` alone cannot support a leaf-only message, and it gives a future path walk a clear place to add more proof without changing the raw read cause.

Do not compare the complete message on each supported platform. Quoting, operation names, separators, and numeric errno values can vary. Assert stable object fields in API tests and only the minimum visible fragments in CLI current test.

The \`--json\` flag does not create a structured file-error response today. JSON output happens only after \`validateSkillFile\` resolves. A read fault jumps to the outer catch, which prints plain error text instead.

That distinction matters for automation. A caller expecting each failure to be JSON cannot rely on the flag for pre-parse errors. Proposed SKILL.md file error diagnostics should define one JSON envelope before changing that result.

Missing files and broken symbolic-link targets often both surface as \`ENOENT\` from the final read. The current function does not call \`lstat\` or \`readlink\`, so it lacks evidence needed to classify those paths differently.

Avoid describing each \`ENOENT\` as "file does not exist." A parent folder may be missing, or a symlink target may be absent. The stable current claim is that the read rejected with a system code.

Browse [QASkills skills](/skills) for valid file examples, but create missing paths inside a unique test folder. A hard-coded global location can unexpectedly exist on another developer's machine.

## Why does validator permission denied change the contract?

Tool permission denied result changes the contract because permissions depend on platform, user identity, mount options, and test runner privileges. A simple \`chmod(0)\` fixture is not a universal oracle.

On Unix-like systems, an ordinary user reading a mode-zero file commonly receives \`EACCES\`. A privileged process may still read it. Windows access control does not follow the same mode-bit result, so the same setup can produce another result.

The current API passes any permission read fault through unchanged. The current CLI prints its message and exits with status one. Neither file declares a stable \`PERMISSION_DENIED\` code or a dedicated remediation message.

Fixed unit coverage should inject or mock the read step and reject with a shaped \`NodeJS.ErrnoException\`. That lets a future classifier map \`EACCES\` and \`EPERM\` without relying on the CI account's actual privileges.

Make the mock preserve a real \`Error\` as its cause and vary one field at a time: first \`EACCES\`, then \`EPERM\`, then an unknown code with the same path and system call. The result should map the first two to one owned permission reason, leave the last in a broad read-failure class, and never add a field that was not present in the supplied cause.

Keep one supported-platform file-system test if permission handling is important to release confidence. Gate it by platform and effective user, create the fixture in a private test folder, and always restore access before cleanup.

Do not expose full absolute paths by default in public error details. Developer output may need the resolved path, but logs and JSON consumed elsewhere can use the supplied path or a redacted form. Define this choice in acceptance tests.

The [agent skill security checklist](/blog/agent-skill-security-review-checklist) can review path disclosure and symlink policy. Repo evidence only shows broad error forwarding, so it does not prove path data has reached an untrusted audience.

A permission reason should remain different from an invalid SKILL.md result. The file contents were never read, so returning \`valid: false\` with a frontmatter issue would misstate the failed operation.

SKILL.md file error diagnostics need a stable API shape before presentation. For example, a proposed \`SkillFileError\` can carry \`reason\`, \`inputPath\`, \`systemCode\`, and \`cause\`. That type is a design option, not current code.

## directory instead of file test matrix

A folder instead of file matrix must separate fixed reason tests from platform file-system checks. The current implementation asks \`readFile\` to decide, so its exact result can vary as the Node docs describe.

| Case | Input or boundary | Layer under test | Expected assertion |
|---|---|---|---|
| Missing leaf | Unique path that was never created | \`packages/skill-validator/src/index.ts\` | Promise rejects; typical system code is \`ENOENT\` |
| Directory path | Existing temporary directory | Node read boundary plus validator | Record platform result; do not assume one code everywhere |
| Permission denied | Mocked \`EACCES\` and \`EPERM\` reads | Proposed classifier seam | Both map to the documented permission category |
| Broken symbolic link | Link exists but target does not | Proposed path-inspection seam | Distinguish only if explicit link inspection is implemented |
| Valid readable file | Complete valid SKILL.md | Library and CLI | Returns a normal validation result and expected exit status |
| Other read failure | Injected \`EIO\` rejection | Proposed classifier seam | Preserve a general read-failure category and system code |

The missing-leaf row is the most portable current file test. Generate a random test folder, never create the child, and assert read fault. The test should not depend on repo files that another task can add.

Build every real path case below one fresh temp root and save the root name in the failure label, then remove it in a \`finally\` block even when the main check throws. A clean root keeps cases from sharing mode bits, links, or old files, while the saved label makes a leaked folder easy to find and keeps the full private host path out of normal assertion text.

The folder row needs a documented platform condition. On common QASkills development platforms it should reject, but a test intended for all Node targets must allow or skip the FreeBSD result described by the approved source.

Permission and general I/O rows belong at an injectable seam. Current code imports \`fs/promises\` directly, so maintainers may need a small reader parameter or module mock before these cases become easy to isolate.

A broken link is not distinguishable from a missing target through \`readFile\` alone. If the product truly needs a broken symlink diagnostic, inspect the link itself with \`lstat\` and \`readlink\`, then define race result between link check and read.

That extra link check can create time-of-check versus time-of-use differences. The final read remains authoritative. A good result can say that a link appeared broken during link check while preserving the final system failure as its cause.

Use [how to publish](/how-to-publish) for the readable control file. The valid row proves new error map logic does not intercept ordinary content or alter the existing result.

SKILL.md file error diagnostics pass this matrix when each row names its source of truth. Platform evidence, mocked policy, and current code result should never be presented as the same kind of check.

## How should broken symlink diagnostic be verified?

A broken symlink diagnostic should first prove the current API cannot distinguish it reliably, then test any proposed link check as a separate feature. Missing-target and missing-leaf reads can share \`ENOENT\`.

The first code block characterizes the current \`validateSkillFile\` read fault for a missing path. It checks stable object properties and performs cleanup without relying on exact human message text.

\`\`\`typescript
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { validateSkillFile } from '../src/index';

let directory = '';
afterEach(async () => {
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

it('lets the current ENOENT read error escape', async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-read-'));
  const missing = path.join(directory, 'missing-SKILL.md');

  await expect(validateSkillFile(missing)).rejects.toMatchObject({
    code: 'ENOENT',
    path: path.resolve(missing),
  });
});
\`\`\`

This check is intentionally not a \`ValidationResult\` check. No content reached \`validateSkillContent\`, so errors, warnings, and quality fields do not exist for this failure.

The cross-layer test spawns the built CLI from \`packages/skill-validator/src/cli.ts\`. It records current nonzero status and plain stderr result. Build the package before running this test because its declared binary points to \`dist/cli.js\`.

\`\`\`typescript
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('prints a current file read failure and exits one', () => {
  const cli = path.resolve('dist/cli.js');
  const missing = path.resolve('fixtures/does-not-exist/SKILL.md');
  const run = spawnSync(process.execPath, [cli, '--json', missing], {
    encoding: 'utf8',
  });

  expect(run.status).toBe(1);
  expect(run.stderr).toContain('Error:');
  expect(run.stderr).toContain('ENOENT');
  expect(run.stderr).toContain('SKILL.md');
  expect(() => JSON.parse(run.stderr)).toThrow();
});
\`\`\`

The \`ENOENT\` text check characterizes current Node output used by supported CI. If cross-platform stability is required, narrow the job matrix or replace that check after QASkills introduces an owned reason code.

For broken-link file test, create a link only on platforms where test permissions allow it. Assert \`lstat(link).isSymbolicLink()\` and confirm the target is absent before calling check. The current read should reject, but do not demand a unique reason.

A proposed classifier test can inject \`lstat\`, \`readlink\`, and \`readFile\` results. Arrange a symbolic link with a missing target, then assert a stable \`BROKEN_SYMLINK\` reason plus the original \`ENOENT\` cause.

Race cases need coverage if link check ships. Remove or replace the target after \`lstat\` and before \`readFile\`, then ensure the final failure remains truthful. Never return a successful check from stale link check data.

Run the direct and CLI cases with the [CI check workflow](/blog/validate-skill-md-in-ci-pipeline). Keep symlink setup isolated from Windows jobs unless those jobs have an explicit supported strategy.

## qaskills validate error codes acceptance criteria

QASkills validate error codes should be stable application identifiers, not copied fragments from host OS messages. Proposed categories can cover file not found, permission denied, folder path, broken symlink, and other read failure.

The current baseline must remain visible: direct calls reject with the original error, \`--json\` does not wrap pre-parse failures, the CLI prints \`Error.message\`, and all caught failures call \`process.exit(1)\`. Keep those facts in a named current-behavior group so a later owned error type cannot make the old result look as if it had always been part of the public API.

A proposed API error should retain its \`cause\`. Tests can assert the owned reason and system code separately. This approach preserves debugging data without forcing automation to parse human text.

JSON output should have one documented envelope for both read and check failures. Include a versioned reason, concise message, and optional safe path. Avoid adding quality fields when no file content was available.

Human output can translate the same reason into action. A missing path can suggest checking spelling, while a folder case can request a SKILL.md file. Permission advice should not assume one host system.

Each fatal file reason should keep a nonzero process status. The approved [Node process docs](https://nodejs.org/api/process.html) explains that \`process.exit(1)\` terminates with failure status and can end before pending output finishes. A later move to \`process.exitCode\` needs its own output test.

The error mapper must accept unknown thrown values. Current code prints \`Unknown error\` when the catch value is not an \`Error\`. Proposed result should preserve a general internal reason and status one without fabricating system fields.

Do not classify parser or schema failures as file errors. Once reading succeeds, existing \`ValidationResult.errors\` owns those outcomes. This step keeps troubleshooting steps accurate.

The [SKILL.md format guide](/blog/skill-md-format-guide) can link file access errors to schema errors without combining their schemas. SKILL.md file error diagnostics are complete when API, human CLI, JSON CLI, and exit status agree.

## How do you test SKILL.md file error diagnostics step by step?

Test SKILL.md file error diagnostics from the read step outward. The procedure below proves current result first, then leaves a clear seam for proposed error map.

1. Read \`packages/skill-validator/src/index.ts\` and \`packages/skill-validator/src/cli.ts\`, recording path resolution, read encoding, catch scope, output stream, and exit behavior.
2. Create a complete readable SKILL.md control in a unique temporary directory and verify a normal \`ValidationResult\`.
3. Add a never-created path, existing directory, permission rejection, broken link, and injected general read failure as isolated fixtures.
4. Call \`validateSkillFile\` directly, capturing rejection type, system code, resolved path, and absence of a validation result.
5. Spawn the built CLI with text and JSON flags, then assert stderr shape, stable proposed reason, and nonzero status.
6. Run deterministic cases on every CI job and gate platform-specific permission or symlink checks explicitly.

Step one prevents a parser test from standing in for a read test. Note that absolute path creation occurs before \`readFile\`, while no QASkills error mapper currently intervenes.

Step two establishes that the test folder and file encoding work. Keep content valid and long enough to avoid unrelated warnings if the CLI output is compared.

Step three should not combine failures. A folder with denied permissions can yield a different code from a readable folder, making the intended case unclear. Construct one property at a time.

Step four keeps the system error object intact. Assert codes and path endings rather than full messages. Preserve the caught object for later proposed mapping tests.

Step five tests presentation as a separate contract. The current JSON flag falls back to plain stderr on read failure, while a future envelope should remain parseable and carry the same reason as text output.

For each spawned run, capture status, signal, stdout, and stderr as separate values, and assert that the command writes one complete form to the chosen stream with no part of another form mixed in. A JSON run should parse once and end with status one, while a text run should name one action and the same owned reason, so shell and API users receive one clear fact.

Finish with the [publishing guide](/how-to-publish). Confirm one valid file proceeds, each unreadable input leaves no partial result, and authors receive an action tied to the correct reason.

## SKILL.md file error diagnostics rollout and regression checks

Roll out SKILL.md file error diagnostics by adding current test before a new error type. That first change should lock read fault, stderr, and status without promising new categories.

API owners should design the reason union and cause preservation. CLI owners should define text and JSON envelopes. Platform owners should review folder, permission, and symlink support on each CI system.

The smallest regression set contains readable, missing, folder, permission, broken-link, and unknown-read failures. Keep the readable file in each job, while platform-specific integrations may use explicit conditions.

If \`validateSkillFile\` starts returning a union instead of rejecting, treat that as an API change. SDK callers, CLI code, and tests must update together. An alternative typed exception can preserve the rejection contract.

Protect output against accidental path leaks. Test relative input, absolute input, nested missing parents, and a path containing spaces. Decide which form appears in human and JSON output.

Add one redaction case with a temp root that contains a user-like folder name and a token-like file name, then prove normal output shows only the chosen safe form while a local debug mode can still retain the full cause. This check turns the path policy into visible test data, avoids vague claims about safe logs, and makes future output changes fail before private host details reach CI records.

The [publication overview](/blog/how-to-publish-ai-agent-skill-directory) can document stable author actions. It should not expose raw errno text as the only guidance because that text is not controlled by QASkills.

If the CLI replaces \`process.exit(1)\` with \`process.exitCode = 1\`, add a large-output test that proves stderr completes. Keep status one and avoid scheduling work after the command has finished.

Review symlink error map with the [agent skill security checklist](/blog/agent-skill-security-review-checklist). Link check must not authorize a path or replace the final read; it only improves the reported reason.

After Node, host OS, bundler, CLI, or file-reader changes, rerun current and proposed suites. SKILL.md file error diagnostics remain dependable only when reason, cause, output format, and status stay aligned.

## Frequently Asked Questions

### What should SKILL.md ENOENT error tests assert?

Direct API tests should assert read fault, \`code: 'ENOENT'\`, and the resolved path ending, while avoiding the complete platform message. CLI tests should assert status one and minimum visible fragments. Until QASkills adds an owned code, label all exact errno text as runtime output in the current test.

### How does validator permission denied affect the SKILL.md contract?

Permission failure occurs before parsing, so it cannot produce a meaningful frontmatter result or quality score. Mock \`EACCES\` and \`EPERM\` for stable policy tests, then add a gated file-system test. Preserve the system cause while exposing one documented QASkills permission reason.

### Which fixture best exposes directory instead of file?

Pass an existing empty test folder to \`validateSkillFile\` and record the supported platform result. Node documents that common platforms reject while FreeBSD can return folder data. Pair this file-system test with a mocked folder reason if identical cross-platform error details are required.

### When should teams check broken symlink diagnostic?

Check it whenever path link checks, file reading, installer safety, or CLI error mapping changes. Prove the link exists and its target does not before validation. Since current \`readFile\` can surface the same \`ENOENT\` as a missing path, require an explicit link check before expecting a distinct reason.

### What is the pass criterion for qaskills validate error codes?

Each pre-parse failure maps to one stable application reason, retains its system cause, produces documented text and JSON, and exits nonzero. Read failures must not masquerade as schema errors. Unknown values receive a safe general reason, and valid readable files keep their existing result.

## Conclusion

SKILL.md file error diagnostics currently forward read rejections to callers and print only an error message at the CLI catch step. Add the missing-path current test first, then introduce owned categories only with cross-platform tests and cause preservation.

Open the [QASkills folder](/skills) to inspect a valid file, then follow [how to publish](/how-to-publish) to verify file access and error details before publication. Run the missing-path and readable controls in the same release job so the final result proves both failure detail and normal file access.`,
};
