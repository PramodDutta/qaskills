import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Extract SKILL.md Packages from GitHub',
  description:
    'Extract SKILL.md packages from GitHub with bounded traversal, shallowest-file selection, companion directories, safe staging, and Vitest cases.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'extract SKILL.md packages from GitHub',
  keywords: [
    'extract SKILL.md packages from GitHub',
    'find SKILL.md recursively',
    'shallowest skill file',
    'Agent Skills companion directories',
    'temporary package staging',
    'ignore node_modules and git',
    'nested skill repository',
    'skill extraction Vitest',
  ],
  relatedSlugs: [
    'qaskills-cli-download-fallback-github-content-metadata',
    'qaskills-add-custom-directory-ci',
    'qaskills-init-non-interactive-ci',
    'qaskills-cli-disable-telemetry-do-not-track',
  ],
  sources: [
    'https://agentskills.io/specification',
    'https://nodejs.org/api/fs.html',
    'https://git-scm.com/docs/git-clone',
  ],
  content: `To extract SKILL.md packages from GitHub safely, search the cloned tree to a fixed depth, select the shallowest matching skill file, stage that file with approved companion directories, and replace the clone only after staging succeeds. Tests should cover nesting, competing matches, absent companions, and cleanup failures.

QASkills runs this flow in \`extractSkillPackage\` and supports both direct GitHub installs and registry downloads. It turns a repo tree, including the verified [Playwright CLI skill](/skills/Pramod/playwright-cli), into one focused package for an agent.

## How Do You Find SKILL.md Recursively?

The walk starts at depth zero, reads entries with \`withFileTypes: true\`, skips set folder names, and goes through depth four. Every file named exactly \`SKILL.md\` is added to a list.

The boundary is easy to misread because a directory visited at depth four is still scanned, so a SKILL.md directly inside it can be found. A child directory called from that level receives depth five and returns before reading entries. Tests should encode both sides of that line.

If \`readdir\` fails, the helper leaves that branch so the rest of the search can still run. This can hide the only skill in an unreadable folder, so tests should cover both safe and harmful read faults.

The [Node file system guide](https://nodejs.org/api/fs.html) defines \`Dirent\` and the file calls used here, so use real folders in core tests. Fake calls can copy the code's shape without proving that paths, nested files, and removal work.

This helper is not a general repository indexer because it looks only for an exact, case-sensitive filename. Files named \`skill.md\`, \`SKILLS.md\`, or \`PLAYWRIGHT-SKILL.md\` do not match. The [SKILL.md format guide](/blog/skill-md-format-guide) explains why the canonical name matters to agent discovery.

\`\`\`typescript
async function walk(d: string, depth: number): Promise<void> {
  if (depth > 4) return;

  let entries;
  try {
    entries = await fs.readdir(d, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const candidate = path.join(d, entry.name);
    if (entry.isDirectory()) await walk(candidate, depth + 1);
    else if (entry.name === 'SKILL.md') found.push(candidate);
  }
}
\`\`\`

To find SKILL.md recursively in a test, build the tree from relative paths and give each file a short marker. The final root marker then shows which file won without a check on a private list.

## Why Choose the Shallowest Skill File?

A GitHub repo may hold a root skill plus samples deep in the tree, or one skill under \`.github/skills/name\`. The code picks the path with the fewest parts and treats that shallowest skill file as the main one.

This rule stops a nested sample from replacing a root guide while still letting a repo ship one nested SKILL.md. The [Agent Skills portability article](/blog/agent-skills-open-standard-portability) shows why one focused package is easy to use across clients.

Current code sorts found paths by \`a.split(path.sep).length - b.split(path.sep).length\`, then selects the first, so a root file wins over every nested file. If two files have equal depth, the comparator returns zero, so traversal order decides which appears first. The implementation does not add a lexical tie-breaker.

Do not claim a fixed choice for equal-depth siblings until the code sets one, and add a test that shows the open tie. A clear rule could sort relative paths after depth or reject the tie and ask for one package path.

Use content markers to prove selection:

\`\`\`typescript
await write('SKILL.md', '# root');
await write('examples/browser/SKILL.md', '# example');
await write('references/root.md', 'root reference');

expect(await extractSkillPackage(dir)).toBe(true);
expect(await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8')).toBe('# root');
expect(await fs.readFile(path.join(dir, 'references/root.md'), 'utf8')).toBe(
  'root reference',
);
\`\`\`

Check the body as well as the final name because each successful run writes a root SKILL.md. Its marker proves which source won when the chosen file began deep in the tree.

For known catalog packages, compare the staged artifact with its source location. The [Playwright CLI skill page](/skills/Pramod/playwright-cli) is one verified destination, while the extraction test should use a local fixture so upstream changes cannot alter the expected marker.

## Which Agent Skills Companion Directories Ship?

The implementation preserves three Agent Skills companion directories that sit next to the selected file: \`references\`, \`scripts\`, and \`assets\`. It does not copy the repository README, source tree, package files, unrelated docs, or siblings outside those names.

The [Agent Skills spec](https://agentskills.io/specification) lists side resources for SKILL.md, while QASkills stores its allowed names in \`SKILL_PACKAGE_DIRS\`. Tests should treat those names as a fixed allowlist instead of copying each nearby folder.

| Adjacent entry | Current extraction result | Useful assertion |
|---|---|---|
| \`SKILL.md\` | Copied to package root | Body equals selected source |
| \`references/\` | Copied recursively | Nested reference content remains |
| \`scripts/\` | Copied recursively | Executable text remains a file |
| \`assets/\` | Copied recursively | Binary bytes remain equal |
| \`README.md\` | Removed with clone | Entry is absent |
| \`src/\` | Removed with clone | Entry is absent |
| \`examples/\` | Removed unless inside an allowed companion | Entry is absent |

An allowed directory is copied only when \`fs.stat\` succeeds and reports a directory. A file named \`references\` is ignored. A missing directory is also ignored because the catch block treats absence as normal.

Test no-companion, one-companion, and all-companion cases. Include nested files inside each allowed directory because \`copyDir\` is recursive. Add binary bytes in \`assets\` to prove \`copyFile\` preserves data rather than reading and rewriting text.

The extractor does not execute scripts. It stages bytes for later agent use. Security review belongs before execution, especially for third-party repositories. The [agent skill security checklist](/blog/agent-skill-security-review-checklist) provides a separate trust review for instructions and companion files.

When teams extract SKILL.md packages from GitHub, they should verify that body links still resolve after unrelated repository files are removed. A SKILL.md that points to \`../docs/setup.md\` will lose that target. The package author should place required material inside one of the supported adjacent directories.

## How Does Temporary Package Staging Prevent Loss?

Temporary package staging protects the selected files while the clone is erased. The selected \`skillRoot\` often lives inside the destination directory. Wiping that tree before copying its contents elsewhere would destroy the source.

The function creates a staging directory under \`os.tmpdir()/qaskills\` with a timestamp and random suffix. It writes selected SKILL.md there, copies each allowed companion, and only then removes every entry from the clone root. Finally, it copies staging back into the now-empty root and removes staging.

That order provides a useful safety boundary: failure while reading the selected file or copying a companion occurs before clone deletion. The original tree remains available for diagnosis. Tests can inject a copy failure and assert that the source clone was not wiped.

The workflow does not use an atomic directory rename, and it has no \`finally\` block around staging cleanup. A failure after clone deletion can leave a partial destination or staging directory. Describe this as a current test target, not as guaranteed recovery. A future revision could wrap cleanup and restore with explicit transaction-like steps.

The [Git clone reference](https://git-scm.com/docs/git-clone) covers how the source tree is created. Extraction starts after that command succeeds, so its tests do not need real remote history. Build the same filesystem shape locally and focus on the package transaction.

Use a parent test directory you own. Do not point \`extractSkillPackage\` at a developer checkout, because success intentionally deletes entries outside the staged package. The function is safe for its disposable clone contract, not for arbitrary valuable directories.

Temporary package staging also makes hidden assumptions visible. If staging and destination sit on different volumes, recursive copying still works because it does not depend on a cross-device rename. The tradeoff is a period where duplicate bytes exist and later operations can fail independently.

## Why Ignore node_modules and git?

The walk is designed to ignore node_modules and git metadata during discovery. It skips directories whose names are exactly \`node_modules\` or \`.git\` before recursion. This prevents dependency fixtures or repository metadata from contributing a misleading SKILL.md candidate.

Large dependency trees can contain docs, examples, and test fixtures with canonical filenames. Searching them wastes time and may select content the package owner never intended to publish. Git internals should never be part of skill discovery.

The phrase "ignore node_modules and git" applies to the discovery walk. The recursive \`copyDir\` helper skips entries named \`.git\` wherever it copies, but it does not have a matching \`node_modules\` exclusion. If an allowed companion directory contains \`node_modules\`, current code can copy it.

Tests should reflect this scope rather than assuming a global denylist. Place decoy SKILL.md files under root \`node_modules\` and \`.git\`, then verify extraction returns false when no other candidate exists. In a separate security or size test, decide whether dependencies inside companions should be rejected.

Symlinks are another boundary. \`Dirent.isDirectory()\` is false for a symbolic link, so the walk does not follow a symlinked directory. \`copyDir\` treats non-directory entries with \`copyFile\`, whose symlink behavior should be verified before accepting untrusted package fixtures. The current suite shown in the repository uses ordinary files and directories.

Avoid introducing platform-specific hidden-file assumptions. A directory called \`.cache\` is not skipped, and it can be traversed until the depth limit. If broader exclusions become a product requirement, add them to a named policy with tests rather than silently changing discovery.

## Handle a Nested Skill Repository

A nested skill repository has no root SKILL.md but contains one under a package path such as \`.github/playwright-cli/SKILL.md\` or \`skills/browser/SKILL.md\`. The extractor should move that selected document and its adjacent companions to the clone root.

Build a fixture that also contains unrelated root files and nested siblings. After extraction, the root should contain only SKILL.md and present companion directories. All unrelated files should be absent. This proves selection, staging, clone deletion, and package restoration together.

\`\`\`typescript
await write('.github/playwright-cli/SKILL.md', '# nested skill');
await write('.github/playwright-cli/references/commands.md', 'open\\nclick\\nclose');
await write('.github/playwright-cli/assets/logo.svg', '<svg/>');
await write('.github/playwright-cli/notes.txt', 'not packaged');
await write('README.md', 'repository readme');

expect(await extractSkillPackage(dir)).toBe(true);
expect((await fs.readdir(dir)).sort()).toEqual([
  'SKILL.md',
  'assets',
  'references',
]);
expect(
  await fs.readFile(path.join(dir, 'references/commands.md'), 'utf8'),
).toContain('click');
\`\`\`

The nested root can sit at depth four and still match. Add a second case at depth five and expect false with the source tree unchanged. This catches accidental boundary changes in either direction.

If several nested packages are equally shallow, do not write a test that assumes filesystem enumeration order. Instead, document the current ambiguity and propose a deterministic rule. A catalog that intentionally hosts many skills should install a named subdirectory through a different interface rather than rely on shallowest selection.

The [installing skills for Claude Code guide](/blog/how-to-install-skills-claude-code) describes where the final package goes. Extraction itself should remain agent-neutral. It returns one normalized directory that \`installToAgent\` can copy to any supported destination.

## Write Skill Extraction Vitest Cases

A skill extraction Vitest suite should use \`fs.mkdtemp\` in \`beforeEach\` and recursive forced removal in \`afterEach\`. A helper that writes relative paths keeps fixtures readable while still exercising real filesystem behavior.

Cover the return value as well as output. \`false\` means no SKILL.md was found and the input tree should remain untouched. \`true\` means a package was staged and the input root was replaced. Both outcomes are public signals used by registry fallback logic.

Start with these independent cases:

| Case | Return | Final state |
|---|---:|---|
| No SKILL.md | false | Original tree untouched |
| Root SKILL.md only | true | Only root SKILL.md |
| Root skill with companions | true | File plus three allowed directories |
| One nested skill | true | Nested package moved to root |
| Root and deeper skill | true | Root body selected |
| Decoys in excluded trees | false | Original tree untouched |
| Skill beyond depth limit | false | Original tree untouched |

Add failure injection after this base suite is stable. Permission tests can behave differently on operating systems and privileged CI containers, so a mocked adapter may be better for exact \`readdir\` or copy failures. Keep normal path tests real.

Use complete content equality for small text fixtures and byte equality for an asset. Avoid broad snapshots of directory metadata because timestamps, modes, and temporary paths vary. Assert the contract that downstream installation consumes.

The [validate SKILL.md in CI article](/blog/validate-skill-md-in-ci-pipeline) can be paired with extraction tests. Extraction proves packaging; validation proves metadata and instruction shape. Keeping those concerns separate yields clearer failures.

## Run the Extraction Procedure

Run the extraction procedure against a disposable fixture before adding a live repository smoke case. Each step should leave evidence that can be asserted directly.

1. Create a unique temporary clone root with \`fs.mkdtemp\`.
2. Write one canonical SKILL.md, optional companions, unrelated files, and any decoy candidates.
3. Record the source body and companion bytes before calling extraction.
4. Call \`extractSkillPackage\` once and capture its boolean result.
5. List the final root and compare it with the allowed package shape.
6. Read the root SKILL.md and companion files to prove the selected source survived.
7. Confirm unrelated clone entries and excluded candidates are absent after success.
8. Remove the fixture in \`afterEach\`, even when a comparison fails.

Run package tests on Linux and the team's primary local platform when path behavior matters. The implementation uses \`path.sep\` for depth comparison, which is portable, but file permissions and enumeration can still differ.

A live smoke test may clone a repository the team controls with \`--depth 1\`, then call extraction. Keep it outside the deterministic merge gate or give network failure a distinct status. Public service availability is not the same defect as package selection.

Do not execute copied scripts during the procedure. Open files as data, validate expected hashes or text, and hand execution safety to a separate review. The [QA skill catalog](/skills) can distribute instructions, but installation does not imply trust.

Build one fixture helper that accepts a map of path names to bytes or plain text. That helper keeps each test short while real file calls still prove the package flow.

Return the created root from the helper and register it for cleanup at once. If setup fails halfway, the cleanup hook can still remove the files that already exist.

Use short marker text in each SKILL.md so the selected source is clear at a glance. A root marker and a nested marker give better proof than two copies of one document.

To extract SKILL.md packages from GitHub, test both a wide tree and a deep tree. Width checks the full walk, while depth checks the bound that guards work and package scope.

The deep tree should place one match at depth four and one match just past the limit. Run them in separate roots so shallow selection does not hide the boundary result.

Add a case where \`readdir\` fails for one side branch but another branch holds the skill. It should still find the valid file because one unreadable branch does not end the whole walk.

Add a second case where the sole skill sits in the branch that cannot be read. Current code returns false, and the untouched source tree should remain present for review.

When teams extract SKILL.md packages from GitHub, companion content can include more than plain text. Write a tiny byte array to an asset, copy the package, and compare each byte after staging.

Do the same with nested reference folders because one flat file does not prove recursive copy. A two-level path is enough to cover directory creation and file copy in one clear case.

Test a file named \`references\` beside SKILL.md and expect it to be left out. Current code calls \`stat\` and copies only when that path is a directory.

Then replace it with a real folder and expect its child to appear at the root package. The paired cases show that names and file kinds both form the package rule.

The extractor skips a \`.git\` entry during each recursive copy as well as search. Put one such folder under an allowed companion and prove its files do not reach the final package.

Do not infer the same rule for \`node_modules\` inside a companion, since copy code does not skip that name. If size policy needs that block, write a failing test and change code with it.

A skill file may be readable while one companion is not, so stage failures need a named test. The source clone should still exist when companion copy fails before the wipe starts.

Another test can force the final copy back to fail after the wipe has begun. Record the partial state as a known risk until code adds restore steps or an atomic swap.

Run concurrent cases with separate clone roots and distinct skill bodies. Each result should keep its own marker, which proves staging paths did not cross between workers.

The source root itself is destructive input, so guard fixture paths before the call. A test helper can require that every root begins with its own new temp parent.

That guard belongs to test code and does not change production behavior. It protects a future editor from passing the repository root to a helper that wipes successful input.

To extract SKILL.md packages from GitHub on Windows and Unix, build paths with \`path.join\`. Do not place slash counts in assertions because production depth uses the active \`path.sep\`.

The equal-depth case should report all candidate relative paths even if the current function returns one. That report gives the team facts needed to choose a lexical tie rule later.

Once a tie rule exists, test it with reversed creation order. The same skill must win both runs, or repository enumeration still controls the package by accident.

After extraction, copy the package through [qaskills add --dir in CI](/blog/qaskills-add-custom-directory-ci) or call the same install helper. Read one root file and one companion at the target to prove the output works downstream.

Keep that downstream check focused because the custom path article owns full destination tests. Here it proves that extraction returns the directory shape the installer expects.

The phrase extract SKILL.md packages from GitHub describes a data move, not code execution. Tests may read scripts and hash assets, but they should never run a script from an untrusted clone.

The same rule applies to Markdown links that point outside the staged root. Report broken local links, then ask the package owner to move required files into approved companion folders.

A small link scan can parse relative targets in SKILL.md and check that each staged path exists. Ignore web URLs in that scan because network reach is not part of package copy.

To extract SKILL.md packages from GitHub with useful logs, save the chosen relative source and final root list. Do not log full private files when a path and hash can prove the same result.

The final suite should keep fast path cases first and failure injection cases next. A basic copy bug will then fail before the more complex mocks add noise.

Run the suite after changes to installer code, shared agent paths, or package format rules. This keeps layout changes from reaching users as a silent loss of references or assets.

Teams that extract SKILL.md packages from GitHub should review the selected package as one unit. The file, its side folders, and its final root shape all form the artifact contract.

## Verify the Final Skill Package

Teams can extract SKILL.md packages from GitHub confidently when they test the bounded walk, shallowest selection, companion allowlist, staging order, and destructive replacement as one explicit contract. The final package should be focused, portable, and traceable to one selected source.

Start with the existing repository cases, then add depth boundaries, equal-depth ambiguity, binary assets, and injected staging failures. State current limitations precisely. Staging reduces early data loss, but it does not make every later copy atomic or self-healing.

Use the [SKILL.md format guide](/blog/skill-md-format-guide) to validate the resulting document, browse [available QA skills](/skills) for real package shapes, and compare the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) in a separate smoke lane. That sequence links extraction evidence to the artifact users actually install.

## Frequently Asked Questions

### How deep does extraction search?

The walk scans the root at depth zero and directories through depth four. A SKILL.md directly inside a depth-four directory can match, but the walk returns before reading a depth-five directory. Encode both boundaries in tests so a refactor cannot shift package discovery silently.

### What happens when no SKILL.md exists?

\`extractSkillPackage\` returns false and leaves the input tree untouched. A direct GitHub install can keep that repository as a code template. A registry install treats false as an unusable package, clears the clone, and continues through its content and metadata recovery paths.

### Are all neighboring directories copied?

No. Current code allows only \`references\`, \`scripts\`, and \`assets\` when they are directories adjacent to the selected SKILL.md. README files, source folders, and other siblings are removed with the clone. Required local documentation should live inside an allowed companion directory.

### Is equal-depth selection deterministic?

Not by an explicit tie-breaker. The sort compares only path depth, so equal-depth candidates retain the order produced by traversal and directory enumeration. Tests should expose this limitation rather than depend on one order. A future contract can add lexical selection or reject ambiguous packages.

### Why stage before deleting the clone?

The selected file and companions usually live inside the clone that must be replaced. Temporary package staging copies those bytes elsewhere first, preventing immediate source loss. It does not guarantee atomic recovery after deletion, so later copy and cleanup failures still need targeted tests.

### Should extraction validate frontmatter too?

Packaging and schema validation are clearer as separate steps. Extraction selects and moves files without parsing their meaning. Afterward, run the shared SKILL.md parser and validator against the root document. This separation identifies whether a failure came from repository layout or invalid metadata.`,
};
