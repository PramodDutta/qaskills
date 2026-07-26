import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills local skill path install',
  description:
    'QASkills local skill path install: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills local skill path install',
  keywords: [
    'QASkills local skill path install',
    'qaskills add local path',
    'install local SKILL.md',
    'test local agent skill',
    'relative skill path install',
    'absolute skill path install',
    'verify copied skill files',
  ],
  relatedSlugs: [
    'skill-md-format-guide',
    'how-to-install-skills-claude-code',
    'how-to-install-skills-cursor',
    'qaskills-add-custom-directory-ci',
  ],
  sources: [
    'https://nodejs.org/api/path.html',
    'https://nodejs.org/api/fs.html',
    'https://agentskills.io/specification',
  ],
  repoEvidence: [
    'packages/cli/src/lib/installer.ts#resolveSkill',
    'packages/cli/src/lib/installer.ts#downloadSkill',
    'packages/cli/src/lib/installer.ts#copyDir',
    'packages/cli/src/commands/add.ts#addCommand',
  ],
  content: `QASkills local skill path install accepts a source beginning with a dot or slash, resolves it against the current process directory, copies that directory into a temporary package folder, and then installs the copy for selected agents. A focused test should prove local classification, recursive file delivery, no registry fetch, correct destination, and cleanup.

This workflow is about file input and does not cover registry fallback, GitHub cloning, or the \`--dir\` target override in depth. The current behavior lives in \`packages/cli/src/lib/installer.ts#resolveSkill\`, \`packages/cli/src/lib/installer.ts#downloadSkill\`, and the command path at \`packages/cli/src/commands/add.ts#addCommand\`.

## What does QASkills local skill path install guarantee?

QASkills local skill path install guarantees that a dot path or slash path is classed as local and yields a path, base name, and \`source: 'local'\`. Downloading then copies the folder without making an HTTP request.

The contract has two stages: \`resolveSkill\` classes the input and returns data, while \`downloadSkill\` makes a clean temp copy. The add command later selects agents and copies that prepared package to each target.

Tests should keep those stages distinct, with a resolve test for the source class that does not touch the file system. A joined test can make a real package tree, call both public functions, and inspect copied files. A command test can check prompts, target choice, output, and exit behavior.

The [Agent Skills specification](https://agentskills.io/specification) defines \`SKILL.md\` as the main file and allows more package content, but this branch does not parse it while copying. A copy test should inspect the bytes, while a separate format test can check metadata rules.

Follow the [SKILL.md format guide](/blog/skill-md-format-guide) and use one small main file, one nested note, and one plain file in the test pack. That shape proves deep copy without tying the check to a large production package.

QASkills local skill path install does not promise that the input exists, since \`path.resolve\` can return a path without a file read. The later copy fails when \`fs.readdir\` reads the missing source, and the add command catches that failure.

## How does qaskills add local path work?

The qaskills add local path branch uses a text rule: inputs that start with \`.\` or \`/\` return a local \`ResolvedSkill\`. Inputs containing a slash but no URL scheme become GitHub shorthand, and plain names become registry entries.

The implementation in \`packages/cli/src/lib/installer.ts#resolveSkill\` is direct:

\`\`\`typescript
export async function resolveSkill(nameOrUrl: string): Promise<ResolvedSkill> {
  if (nameOrUrl.startsWith('.') || nameOrUrl.startsWith('/')) {
    return {
      name: path.basename(nameOrUrl),
      source: 'local',
      path: path.resolve(nameOrUrl),
    };
  }
  if (nameOrUrl.includes('/') && !nameOrUrl.includes('://')) {
    return {
      name: nameOrUrl.split('/').pop()!,
      source: 'github',
      path: '',
      url: \`https://github.com/\${nameOrUrl}\`,
    };
  }
  return {
    name: nameOrUrl,
    source: 'registry',
    path: '',
    url: \`https://qaskills.sh/api/skills/\${nameOrUrl}\`,
  };
}
\`\`\`

Node's [path documentation](https://nodejs.org/api/path.html) says path calls follow host rules. \`path.resolve\` uses the current work root for a relative value, while \`path.basename\` supplies the skill name. A test should set expected paths with Node calls rather than hard-coded marks.

Once path work ends, \`downloadSkill\` cleans the skill name for a temp folder under \`os.tmpdir()/qaskills\`. It removes an old folder with that name, makes a clean one, and starts the deep copy. It returns that temp folder after the copy.

The add command does not fetch registry metadata before this local branch. It calls \`resolveSkill\`, then \`downloadSkill\`, and only the selected source controls transport. A fetch spy that remains untouched is useful supporting proof, although copied files are the primary observable result.

Use the [getting started page](/getting-started) for normal CLI setup. In a regression suite, call the built command only when checking terminal behavior. Direct helper tests provide clearer failures for classification and copy rules.

QASkills local skill path install uses the final base name as its target folder name. A source named \`fixture-skill\` becomes a temp and installed pack with that name, despite the display name in its frontmatter. That split belongs in both docs and checks.

## Which cases define install local SKILL.md?

Install local SKILL.md coverage should include a small pack, nested files, an empty folder, a missing folder, repeat use of one base name, and a source with \`.git\`. These cases map to current deep copy behavior without adding a format check that does not occur.

A small pack has one nonempty \`SKILL.md\`. Calling \`downloadSkill(await resolveSkill('./fixture-skill'))\` should return a temp path with the same bytes. Add a nested \`references/checklist.md\` to prove that deep copy keeps the same shape.

The private \`packages/cli/src/lib/installer.ts#copyDir\` helper makes the target before it reads entries. It skips \`.git\`, walks through other folders, and uses \`fs.copyFile\` for files. The local download branch relies on this helper for each package file.

An empty source folder copies and returns an empty temp folder. The broad nonempty check runs after registry work, but the local branch returns first. That is the current behavior, not a product wish. Rejecting empty local packs would need a source change and a new test rule.

A missing source resolves as local, then rejects during \`fs.readdir\`. The add command catches the error, stops its spinner, prints a failure message, and sets \`process.exitCode = 1\`. Helper tests should assert rejection, while command tests should assert the user-facing boundary.

Repeated use needs a direct check. \`downloadSkill\` removes the prior temp folder, so stale files from an old source with the same base name should go away. Make one pack with \`old.txt\`, then a same-named pack with \`new.txt\`. The second temp pack should hold only the new source files.

Do not put secrets in a local fixture. QASkills copies the whole tree except \`.git\`, not just spec companion folders. The [Claude Code skill installation guide](/blog/how-to-install-skills-claude-code) helps users place packages correctly, but it does not alter this transport rule.

## test local agent skill and the current QASkills contract

To test local agent skill delivery, assert source identity, prepared package identity, and final agent identity separately. This prevents a green test from hiding the stage that actually failed.

Source identity means the path equals \`path.resolve(input)\`, the name equals \`path.basename(input)\`, and the source equals \`local\`. Pack identity means each file exists under the temp path with matching text. Final identity means \`installToAgent\` returns the planned target and copies the same tree there.

The production copy helper is private, so tests should reach it through \`downloadSkill\` and \`installToAgent\`. Exporting internals only for a test would widen the package API. Public behavior already gives enough evidence.

\`\`\`typescript
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { downloadSkill, resolveSkill } from '../src/lib/installer';

test('copies a local skill package recursively', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'qaskills-local-'));
  const source = path.join(root, 'fixture-skill');
  try {
    await mkdir(path.join(source, 'references'), { recursive: true });
    await writeFile(path.join(source, 'SKILL.md'), '---\\nname: Fixture\\n---\\n\\nUse it.\\n');
    await writeFile(path.join(source, 'references', 'notes.md'), 'Fixture notes.\\n');

    const resolved = await resolveSkill(source);
    const downloaded = await downloadSkill(resolved);

    expect(resolved.source).toBe('local');
    expect(resolved.path).toBe(path.resolve(source));
    expect(await readFile(path.join(downloaded, 'SKILL.md'), 'utf8')).toContain('Fixture');
    expect(await readFile(path.join(downloaded, 'references', 'notes.md'), 'utf8')).toBe(
      'Fixture notes.\\n',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
\`\`\`

The temp download path is shared by safe skill name, so tests with the same base name should not run at once. Give each parallel case a distinct base name or run the repeat-use case alone. Clean both the test root and returned temp pack.

Use [skills for supported agents](/agents) to understand final destinations, but keep this article's contract focused on local input. Destination override behavior has its own [custom directory CI guide](/blog/qaskills-add-custom-directory-ci).

## How do you test relative skill path install?

A relative skill path install test must control \`process.cwd()\`, because \`path.resolve('./fixture-skill')\` depends on it. Changing the process work root is global state, so run this case alone or call the built CLI with a child-process \`cwd\`.

Use this procedure to cover the public path:

1. Create a temporary workspace and a nested \`fixture-skill\` package.
2. Run the CLI from that workspace with \`./fixture-skill\` as the source.
3. Select one known agent and a disposable destination for final output.
4. Assert copied files, package basename, terminal status, and no registry request.
5. Remove the workspace, downloaded package, and installed destination.

A child process is safer than calling \`process.chdir\` inside a shared test process. Pass \`cwd: workspace\` to \`execFileSync\`, and invoke the built \`dist/index.js\` with Node. The command should receive a dot-prefixed path so it reaches the local branch.

\`\`\`typescript
const output = execFileSync(
  process.execPath,
  [cliPath, 'add', './fixture-skill', '--agent', 'universal', '--dir', installBase],
  {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, QASKILLS_TELEMETRY: '0', CI: '1' },
  },
);

const installed = path.join(installBase, 'fixture-skill', 'SKILL.md');
expect(await readFile(installed, 'utf8')).toContain('name: Fixture');
expect(output).toContain('fixture-skill');
\`\`\`

This command uses \`--dir\` only to keep the test away from a real home folder. The subject remains local source classification and copying. Assert the installed content rather than depending on color codes or every prompt line.

Relative source paths that omit the leading dot do not enter the local branch. For example, \`fixtures/skill\` contains a slash and no scheme, so current logic treats it as GitHub shorthand. Capture this boundary in a negative test, then teach users to pass \`./fixtures/skill\`.

The [Cursor installation guide](/blog/how-to-install-skills-cursor) offers a normal destination example. Automated tests should still use disposable paths and never write into a developer's actual agent setup.

### Keep the source and target apart

Give the source root and install root names that cannot be mixed up, then place them under two distinct temp parents. Check both paths before the command starts, then check both again when it ends. This makes a copy in the wrong way plain to see.

Write a short marker in each source file, use a new mark after a change, and do not trust the file name alone. Read the target file and match the marker after each run. This catches stale data even when the file tree still looks right.

Keep the source tree small enough to show in a safe test log, with one main file, one nested note, and one skipped file. Large sample packs slow the run and make a copy fault hard to find. A small tree can still prove each branch that the copy owns.

Do not read from a real home path; pass a temp target to the smoke case or use a fake agent path. A failed run must not leave a test skill in a tool that a person uses. The cleanup check should fail if any such path was touched.

### Check what did not happen

A local source should not need fetch, git clone, or a live skill page, so set spies on those seams and expect no calls. In a child process, use a closed test network or a fake registry base only if the CLI has such a hook. The file result is still the main proof.

The command should not change the source, so store each file's text before the run and read it again after the copy. Check that no new file was placed beside \`SKILL.md\`. This guards against a future move or in-place edit that the current copy code does not do.

The temp pack should not keep \`.git\`, so add one small fake entry and check that it is gone from both target roots. Do not create a real repo for this case, since the copy rule checks the entry name. This keeps the case quick and clear.

When a source does not exist, check that no final target is made, though the temp base may exist before the source read fails. Check the path that an agent would use, since that stage must not start. This ties the no-op claim to the public command flow.

## absolute skill path install failure and edge-case matrix

An absolute skill path install starts with \`/\` on the current implementation's recognized branch. The matrix separates resolver success from later file access, which avoids treating path normalization as proof of package delivery.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| Local relative | \`./fixture-skill\` from fixed cwd | Local record and recursive copy | Registry or GitHub branch chosen | \`packages/cli/src/lib/installer.ts#resolveSkill\` |
| Local absolute | Slash-prefixed existing directory | Resolved path and copied tree | Path changes or files missing | \`packages/cli/src/lib/installer.ts#downloadSkill\` |
| Missing source | Slash-prefixed absent directory | Download rejects, command fails | Misleading install success | \`packages/cli/src/commands/add.ts#addCommand\` |
| Repeat basename | Two sources with one basename | Old temporary files are removed | Stale file remains | \`packages/cli/src/lib/installer.ts#downloadSkill\` |
| Git metadata | Source includes \`.git\` | Package copies without \`.git\` | Repository metadata delivered | \`packages/cli/src/lib/installer.ts#copyDir\` |

The Node [file system API](https://nodejs.org/api/fs.html) owns the actual read, copy, create, and remove behavior. Assert file content after each stage so the test catches wrong roots and incomplete recursion, not just a returned string.

On Windows, slash and drive-letter conventions need deliberate coverage. The current local classifier checks only dot or slash prefixes. A drive-letter path does not match that textual rule, even though \`path.isAbsolute\` could recognize it. Record current behavior in platform-specific tests rather than claiming support that source code does not prove.

Symlinks also deserve caution. \`fs.readdir\` reports them as entries that are not directories, and \`fs.copyFile\` follows file semantics rather than preserving a symbolic link as such. Avoid symlinks in the basic package fixture unless the product contract explicitly adds them.

QASkills local skill path install is strongest when failure assertions inspect the destination too. After a missing-source error, the final agent folder should not exist. This proves the command stopped before installation.

## How should verify copied skill files run in CI?

Verify copied skill files in CI by building the CLI, creating a package fixture during the job, installing it to a job-owned directory, and checking stable package contents. No registry credential or network endpoint is needed for a local source.

Pin the test to the repository's Node requirement and run it after the CLI build. The built command proves package wiring and local transport together, while unit tests still diagnose resolver behavior quickly. Keep both layers because they answer different failure questions.

Use one deterministic \`SKILL.md\` and a nested reference. Assert nonzero size, exact nested text, absence of \`.git\`, and no stale file after a second install. Do not snapshot timestamps or temporary absolute paths.

Set telemetry off for smoke tests even though local source telemetry omits a registry slug. This prevents test traffic and makes the policy explicit. The [site FAQ](/faq) and [privacy page](/privacy) describe the user-facing context, while the test remains entirely local.

Run the fixture in a child process with piped output and a timeout. A prompt indicates that agent selection flags were incomplete, while a timeout keeps the job from hanging forever. Pass one known agent ID and a disposable install base.

QASkills local skill path install should fail CI when the copied \`SKILL.md\` differs, a nested file disappears, an unexpected network call occurs, or the command exits nonzero. Always remove temporary files in \`finally\`, including after failed assertions.

The existing [blog index](/blog) contains broader installation and validation guides. Keep this gate focused on local filesystem input so failures point to one owner.

### Read CI output without leaking local paths

Show the source base name, agent ID, and copied file names in a failed job, while full temp roots stay in a safe debug log. Most copy faults can be judged from short paths. This keeps host names and runner paths out of the main job log.

Print the first missing or wrong file and stop that check, since a full tree diff can swamp the most useful line. Follow with a cleanup check so the job also reports a path that could not be removed. These two facts are enough for most fixes.

Use the same smoke script on fresh and reused runners, since the clean step should make both yield the same temp pack. Seed one old file before the reused run, then prove it is gone. This adds real value without a live registry or a large tool setup.

Keep the built CLI check after unit tests, since a source branch fault should fail with the shortest clue first. The smoke case then proves that command parse, path rules, and file copy still join as planned. If it fails, save only safe fixture logs. Do not save a whole temp root by default.

## Implementation checklist for QASkills local skill path install

Use this review checklist:

- Pass a dot-prefixed relative path or recognized absolute slash path.
- Assert \`source\`, resolved path, basename, and empty URL fields.
- Create \`SKILL.md\` plus at least one nested package file.
- Verify byte content after temporary download and final installation.
- Assert that \`.git\` does not reach either destination.
- Prove a missing source rejects and creates no final agent package.
- Run a repeated basename case to expose stale temporary content.
- Keep parallel tests on unique package basenames.
- Disable telemetry and avoid all registry or GitHub dependencies.
- Remove fixture, temporary, and install directories after every run.
- Check that source and target roots stay distinct and hold only the files named by this case before and after the final cleanup step

The checklist follows current source rather than adding hidden validation. QASkills local skill path install copies a local directory, but it does not promise that \`SKILL.md\` is valid. Add the [format validation workflow](/blog/skill-md-format-guide) as a second gate when schema quality matters.

A final review should compare assertions with all four evidence paths in this article. Resolver facts belong to \`resolveSkill\`, transport facts belong to \`downloadSkill\` and \`copyDir\`, and terminal behavior belongs to \`addCommand\`.

## Frequently Asked Questions

### What does qaskills add local path verify in QASkills?

It verifies that a dot-prefixed or slash-prefixed input is classified as local, resolved from the intended working directory, and copied without registry transport. A complete test also checks the basename-derived package name, nested file content, final destination, and cleanup after the command finishes.

### When should a team test install local SKILL.md?

Run this test when resolver ordering, recursive copy code, command options, temporary paths, or package build wiring changes. Keep a fast helper test on every pull request and a built CLI smoke case before release. Both should use generated fixtures instead of a developer's installed skills.

### How can a fixture isolate test local agent skill?

Create a unique temporary workspace containing only \`SKILL.md\` and a small nested reference. Pass a disposable destination and one explicit agent ID. Disable telemetry, avoid network stubs unless asserting no calls, and remove source, download, and installation directories in a final cleanup block.

### Which assertion proves relative skill path install?

Run from a controlled child-process working directory, pass \`./fixture-skill\`, and assert the resolved package appears under the disposable destination with exact content. Also test \`fixtures/skill\` without the dot as a boundary, because current resolver ordering treats that text as GitHub shorthand.

### What failure cases belong in absolute skill path install tests?

Cover a missing directory, unreadable source, empty source, repeated basename, nested files, \`.git\` exclusion, and platform-specific path syntax. Assert both rejection details and destination absence. Do not assume Windows drive-letter input is local unless the implementation adds and tests that classifier branch.

### How should CI run verify copied skill files checks?

Build the CLI, create a local package during the job, and invoke the binary with a fixed agent plus disposable destination. Check stable file contents and stale-file removal, then delete every directory. The job should require no registry account, external service, or developer home configuration.

## Conclusion

QASkills local skill path install is a filesystem contract with clear stages: classify the path, create a clean temporary copy, and install that copy for selected agents. The next regression check should repeat one basename with changed contents, proving stale files cannot survive the download preparation step.

Follow [QASkills getting started](/getting-started), then browse the [QA skills catalog](/skills) and run the local installation checks against a disposable directory. Review [supported agents](/agents) before adding a destination-specific smoke case.`,
};
