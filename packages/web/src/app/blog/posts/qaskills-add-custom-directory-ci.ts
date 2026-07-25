import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'qaskills add --dir for CI Installs',
  description:
    'Use qaskills add --dir for deterministic CI skill installs, workspace-safe paths, agent selection, artifact checks, cleanup, and failure assertions.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'qaskills add --dir',
  keywords: [
    'qaskills add --dir',
    'custom skill install directory',
    'CI skill installation',
    'override agent skillsDir',
    'workspace skill artifact',
    'qaskills non-interactive install',
    'skill install path assertion',
    'temporary agent skill directory',
  ],
  relatedSlugs: [
    'qaskills-cli-download-fallback-github-content-metadata',
    'qaskills-cli-extract-skill-package-github',
    'qaskills-init-non-interactive-ci',
    'qaskills-cli-disable-telemetry-do-not-track',
  ],
  sources: [
    'https://nodejs.org/api/path.html',
    'https://nodejs.org/api/fs.html',
    'https://docs.github.com/en/actions/reference/workflows-and-actions/variables',
  ],
  content: `Use qaskills add --dir when a CI job needs a skill under a controlled directory instead of an agent's normal skills folder. The CLI resolves the path, adds the skill name, copies the package, and returns the final path so the job can verify SKILL.md and remove the directory.

The add command and \`installToAgent\` implement the flag for registry, GitHub, and local sources from the [QA skill catalog](/skills). This tutorial uses the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) as a real registry case while keeping each check portable.

## What Is a Custom Skill Install Directory?

A custom skill install directory is a base path passed through \`-d\` or \`--dir\`, then sent to \`installToAgent\` for each chosen agent. The installer resolves that base from the current work folder, adds \`skillName\`, creates the path, and copies downloaded files there.

The flag changes the destination base, not the package name, so \`qaskills add playwright-cli --dir .artifacts/skills\` writes under \`.artifacts/skills/playwright-cli\`. A test that expects SKILL.md right under \`.artifacts/skills\` would state the wrong rule when the work folder is the repo root.

Node's [path API](https://nodejs.org/api/path.html) defines how \`path.resolve\` makes an absolute base and \`path.join\` adds the skill name. Relative paths depend on \`process.cwd()\`, so CI should print or set its work folder before install.

\`\`\`typescript
export async function installToAgent(
  skillDir: string,
  skillName: string,
  agent: AgentDefinition,
  overrideDir?: string,
): Promise<string> {
  const targetBase = overrideDir
    ? path.resolve(overrideDir)
    : agent.skillsDir.replace('~', os.homedir());
  const targetDir = path.join(targetBase, skillName);

  await fs.mkdir(targetDir, { recursive: true });
  await copyDir(skillDir, targetDir);
  return targetDir;
}
\`\`\`

The current copy is additive because it creates the target and overwrites matching files without removing stale files first. A clean CI-owned base avoids stale artifacts from a previous run. If the runner reuses workspaces, remove the base before qaskills add --dir.

The [Playwright CLI installation quickstart](/blog/playwright-cli-install-quickstart-2026) covers interactive developer setup. A custom destination has a narrower purpose: deterministic inspection, packaging, or testing inside an automated job.

## How Does CI Skill Installation Use --dir?

CI skill installation should use a job-owned path, not a developer home folder, and GitHub gives each runner \`RUNNER_TEMP\` and \`GITHUB_WORKSPACE\`. GitHub lists these paths and other [default workflow variables](https://docs.github.com/en/actions/reference/workflows-and-actions/variables).

Choose the base by artifact life: \`$RUNNER_TEMP/qaskills\` suits files needed only during the job. \`$GITHUB_WORKSPACE/.artifacts/qaskills\` suits a package that another step will upload. In both cases, quote the path because custom runners may contain spaces.

Use one clear agent with qaskills add --dir because agent choice still runs and telemetry keeps the chosen IDs even with a custom path. The detector always offers the universal agent, so \`--agent universal\` gives CI a stable target with no prompt.

\`\`\`yaml
name: Verify QA skill

on:
  pull_request:

jobs:
  install-skill:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Playwright CLI skill to a job directory
        env:
          QASKILLS_TELEMETRY: '0'
        run: |
          npx qaskills add playwright-cli \
            --agent universal \
            --dir "$RUNNER_TEMP/qaskills"

      - name: Verify the installed artifact
        run: |
          test -s "$RUNNER_TEMP/qaskills/playwright-cli/SKILL.md"
          grep -q '^name:' "$RUNNER_TEMP/qaskills/playwright-cli/SKILL.md"
\`\`\`

The command resolves and downloads before it copies, and any network, slug, clone, or file error reaches the command catch. That catch sets \`process.exitCode = 1\`, so the workflow step fails without its own status wrapper.

Pin the CLI version in a live workflow instead of using an open \`npx\` range, which may change path and file rules. The [Claude Code skill installation guide](/blog/how-to-install-skills-claude-code) can help compare this fixed CI artifact with a normal agent install.

## When Does It Override Agent skillsDir?

The installer will override agent skillsDir whenever \`overrideDir\` is a truthy string. In the command, that value comes directly from \`options.dir\`. The selected agent definition remains available for labels and telemetry, but its configured destination does not participate in target path calculation.

Without \`--dir\`, global agent paths replace a leading tilde with the home folder, while project paths were set during detection. With the flag, neither destination is used. \`path.resolve(options.dir)\` becomes the base for every selected agent.

One result may surprise users: if \`--yes\` selects several agents, each loop copies the named skill to the same custom target. The command can report several installs even though they share one folder. CI should pass one \`--agent\` when it wants one artifact.

The flag does not bypass source resolution, downloading, agent detection, or selection. It only changes the copy destination. The detector always includes the universal Agent Skills target, so a clean runner still has at least one choice. Explicit selection avoids prompts when other tools are also detected.

Unit tests can prove the override by supplying an agent whose normal \`skillsDir\` points to a sentinel path, then asserting nothing is written there. The returned path should equal \`path.join(path.resolve(override), skillName)\`.

\`\`\`typescript
const normalBase = path.join(root, 'normal-agent-skills');
const overrideBase = path.join(root, 'ci-output');
const agent = {
  id: 'fixture-agent',
  name: 'Fixture Agent',
  configDir: '.fixture',
  skillsDir: normalBase,
  configFile: 'fixture.json',
  installMethod: 'copy' as const,
};

const installed = await installToAgent(source, 'playwright-cli', agent, overrideBase);

expect(installed).toBe(path.join(path.resolve(overrideBase), 'playwright-cli'));
expect(await fs.readFile(path.join(installed, 'SKILL.md'), 'utf8')).toContain('name:');
await expect(fs.access(normalBase)).rejects.toThrow();
\`\`\`

This test uses an absolute override, so its expected value does not depend on the test runner's working directory. Add a separate relative-path case with a controlled \`process.chdir\` only if relative resolution is part of the required contract.

## Verify the Workspace Skill Artifact

A workspace skill artifact is useful only when the job checks its identity and structure. Do not treat a zero exit status as proof that the expected SKILL.md was copied. Assert the final path, file presence, nonzero size, frontmatter, and any companion files required by the selected package.

The [Node file system API](https://nodejs.org/api/fs.html) provides \`stat\`, \`readFile\`, \`readdir\`, and \`access\` for a TypeScript verifier. Shell tools work for a small smoke check, but a parser gives better diagnostics when frontmatter matters.

Start with transport assertions:

| Check | Why it matters | Failure meaning |
|---|---|---|
| Final directory exists | Confirms resolved destination | Wrong working directory or copy failure |
| SKILL.md is a regular file | Confirms canonical artifact | Wrong package shape |
| File size is greater than zero | Rejects blank transport | Empty endpoint or fixture |
| Frontmatter parses | Confirms metadata syntax | Corrupt or reconstructed content |
| Expected name or slug matches | Confirms identity | Wrong registry record |
| Required companion exists | Confirms complete package | Extraction or copy loss |

Avoid asserting every line of a changing catalog artifact in CI. Check stable identity and schema fields, then let package-specific tests verify instructions. A full snapshot can fail whenever editorial guidance changes even though delivery remains correct.

For the Playwright example, assert that the document names Playwright CLI Browser Automation and that required reference files exist if the published package promises them. The verified [Playwright CLI skill page](/skills/Pramod/playwright-cli) is the human-readable catalog record; the installed artifact is the executable source of instructions.

If the job uploads the directory, archive the skill-name subdirectory rather than the whole temporary base. This gives consumers a predictable root. Never upload credentials, agent config, or unrelated runner files beside the package.

The [SKILL.md validation pipeline guide](/blog/validate-skill-md-in-ci-pipeline) shows schema-level assertions. Run it after qaskills add --dir so delivery and validation fail in separate, readable steps.

## Combine qaskills Non-Interactive Install Flags

A qaskills non-interactive install should combine \`--dir\` with either an explicit \`--agent\` or \`--yes\`. The explicit agent is clearer for a single CI artifact. \`--yes\` selects every detected agent and is better suited to a developer machine than one shared override directory.

The command's multiselect runs only when more than one agent is detected, no explicit agent is supplied, and \`--yes\` is false. CI has no reliable prompt input, so leave no path to that branch. Passing \`--dir\` alone does not imply non-interactive selection.

Use this basic command shape:

\`\`\`bash
npx qaskills@<pinned-version> add playwright-cli \
  --agent universal \
  --dir "$RUNNER_TEMP/qaskills"
\`\`\`

For a local package fixture, replace the slug with a relative directory. For a controlled GitHub package, use \`owner/repo\`. Keep source-specific tests separate because direct GitHub clone failures do not use the registry fallback.

If the selected agent name is unknown, the command logs an error and returns before download. Match by stable agent ID, such as \`universal\`, rather than a display name that may change. The command accepts either, but IDs make scripts easier to review.

Set telemetry policy explicitly in automated environments. The companion [QASkills telemetry opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track) explains the exact environment values. Telemetry is fire-and-forget, so it should not change installation status, but a stated policy prevents ambiguity in CI logs.

Do not add shell \`|| true\` around the install. That converts a missing skill into a green workflow and moves failure to a less useful later step. Let the command fail, then run artifact assertions only after success.

## Add a Skill Install Path Assertion

A skill install path assertion compares the returned or calculated target with an absolute expected path. It catches an incorrect current directory, missing skill-name segment, accidental home-directory use, and ignored override.

At the helper level, assert the exact return value from \`installToAgent\`. At the command level, inspect the printed \`Installed to ...\` path only as supporting evidence. Terminal formatting and spinner output are less stable than filesystem state.

Resolve expected paths with the same platform-aware primitives used by production, but avoid copying implementation logic blindly. For an absolute override, the expected path is simply \`path.join(overrideBase, skillName)\`. For a relative override, assert from a controlled working directory.

\`\`\`typescript
const previous = process.cwd();
const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'qaskills-dir-test-'));

try {
  process.chdir(workspace);
  const installed = await installToAgent(
    source,
    'fixture-skill',
    agent,
    '.artifacts/skills',
  );

  expect(installed).toBe(
    path.join(workspace, '.artifacts', 'skills', 'fixture-skill'),
  );
  expect((await fs.stat(path.join(installed, 'SKILL.md'))).isFile()).toBe(true);
} finally {
  process.chdir(previous);
  await fs.rm(workspace, { recursive: true, force: true });
}
\`\`\`

Tests that change the process working directory must not run concurrently in the same process. Prefer absolute paths for most cases, and isolate the one relative-path contract test in a dedicated file or serial suite.

Also assert that the normal agent path stays untouched. This negative check proves the override was honored rather than copied to both places. Use a unique sentinel path, not a real home directory.

## Clean a Temporary Agent Skill Directory

A temporary agent skill directory should be created and removed by the same job. GitHub-hosted runners are ephemeral, but explicit cleanup still matters on self-hosted runners, local CI emulators, and failure diagnostics.

Clean before installation to prevent stale destination files, because current \`copyDir\` does not delete the target first. Clean after assertions to reduce disk use and prevent later steps from reading a package they did not install.

Use a shell trap when several commands share one step:

\`\`\`bash
set -euo pipefail

base="\${RUNNER_TEMP}/qaskills"
rm -rf "$base"
trap 'rm -rf "$base"' EXIT

npx qaskills@<pinned-version> add playwright-cli \
  --agent universal \
  --dir "$base"

test -s "$base/playwright-cli/SKILL.md"
\`\`\`

The script owns \`$base\`, so recursive removal is scoped. Never compute cleanup from untrusted skill metadata or remove an agent's actual home directory. Print the resolved base before destructive cleanup when a self-hosted environment has custom variables.

In Vitest, use \`afterEach\` with \`fs.rm(..., { recursive: true, force: true })\`. Track every created directory so a failed assertion does not skip cleanup. Restore \`process.cwd()\` before removal if a test changed it.

If the artifact must be uploaded, clean only after the upload step. Use workflow conditions such as \`if: always()\` for final cleanup, while artifact upload can use \`if: failure()\` when files are needed only for diagnosis.

## Run the CI Installation Procedure

Run qaskills add --dir through a sequence that proves setup, delivery, identity, and cleanup. Keep each step small enough that its failure names the broken contract.

1. Pin Node, pnpm or npm behavior, and the QASkills CLI version.
2. Select a CI-owned absolute base under the runner temporary directory or workspace.
3. Remove that base and register cleanup before starting installation.
4. Run the command with one skill, \`--agent universal\`, and \`--dir\`.
5. Calculate the expected child directory from the resolved skill name.
6. Assert SKILL.md exists, is non-empty, parses, and identifies the expected skill.
7. Assert required companion files and reject unexpected stale sentinels.
8. Upload the focused package only when another job needs it.
9. Remove the temporary base and report cleanup failures separately.

Run one negative case in the CLI's own test suite, not in every consumer workflow. Supply an invalid slug or force a copy error and assert a nonzero exit status with no accepted artifact. Consumer CI should usually test the path it relies on.

The [CI/CD testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) helps place install, validate, and artifact steps in separate jobs or phases. Keep the QASkills command output available, but make filesystem assertions the merge-blocking proof.

Start the job by printing Node, package tool, and CLI versions in one short line. This gives enough build facts to compare two runs without exposing paths or tokens.

Print the resolved base next, then check that it sits under the job-owned parent. Stop before cleanup if the base points at the workspace root or a home folder.

Run qaskills add --dir from a known working directory even when the base is absolute. Source paths for local skills still resolve from the current directory and need the same clear rule.

For a local source test, build one small skill folder inside the fixture root. Include SKILL.md and one reference so the copy must keep both file kinds.

For a registry test, use a fixed slug and a local HTTP stub when the client allows a base URL. This keeps catalog changes and public network faults out of the path check.

Direct GitHub tests should use a team-owned fixture repository pinned to a commit or release. Do not mix live clone risk with the basic destination test on each pull request.

The qaskills add --dir command should face a base path that does not exist. Current code creates the target tree, so the test should pass and return the new full path.

It should also face a base that already holds one stale child file. Current code does not clear that file, which is why the job must clean its own base first.

Write that stale marker before the pre-clean step and check it is gone after cleanup. Then install the skill and ensure no later step brings the marker back.

Use a short skill name in unit tests and the real registry slug in one command test. This split makes path failures easy to read while still checking a true command shape.

The exact qaskills add --dir phrase belongs in the test title when the CLI flag is under review. A clear title helps reviewers find these cases when option parsing changes.

Keep the agent ID fixed as \`universal\` for the single-artifact lane. A separate agent-selection suite can cover display names, unknown IDs, and several detected tools.

If the command reports more than one selected agent in this lane, fail before trusting the artifact. One destination and one selected agent make copy counts and logs much easier to read.

Use a path with one space in a nightly or platform matrix test. Pass it as one process argument, not as shell text built from untrusted input.

A Node child-process helper can avoid shell quote bugs by supplying an argument array. Capture status and streams, then inspect files through the file system API.

Do not parse a colored success line to find the destination when the path is known. Build the expected path from the owned base and skill name, then read that location.

If a command test must read output, strip color and assert one stable phrase. Spinner frames and timing should not form part of the install path contract.

The qaskills add --dir flow can write a package that contains scripts, but the path test must not run them. It should copy, list, read, and hash files as inert data.

Read the first frontmatter block and compare stable identity fields with the fixture. The [SKILL.md validation guide](/blog/validate-skill-md-in-ci-pipeline) can run the full schema after this simple check.

For an uploaded artifact, save the CLI version and source slug in build metadata beside the archive. Do not change SKILL.md just to add run data that was not part of the source.

Check the archive root after upload or download in one consumer test. It should contain the skill-name folder or its contents according to the team's stated package rule.

The install test can use [qaskills init in CI](/blog/qaskills-init-non-interactive-ci) to make a local fixture first. That chain proves a generated skill can be copied to the chosen base and parsed again.

Keep the generator and installer in separate process steps so each exit code remains clear. A failed scaffold should not leave an old source that the install step can copy.

If telemetry policy applies to the job, set it through the [QASkills CLI telemetry guide](/blog/qaskills-cli-disable-telemetry-do-not-track). Then prove the skill files match an enabled control rather than assuming the flag changed no output.

The qaskills add --dir check should run on every CLI change that touches option parsing or install paths. File-only content edits can use the faster schema lane unless policy asks for the full flow.

Self-hosted runners need stronger cleanup proof because job disks can persist. Save the base in a step output, validate its parent, and remove it with an always-run final step.

Hosted runners still gain from explicit cleanup because local emulators and reruns may keep files. The same script can serve both runner kinds without hidden assumptions.

When cleanup fails, report the owned base and stop reuse of that runner if needed. Do not widen the removal command in an attempt to make the next run green.

The returned path should use the host platform separator, while workflow assertions may use shell paths. Prefer a Node verifier for a cross-platform matrix so one path rule drives each host.

On Windows, an absolute drive path should stay on that drive after \`path.resolve\`. On Unix, an absolute base should ignore the current directory while a relative base should use it.

Test those rules with data-driven helper cases instead of copying workflow YAML into unit tests. Workflow checks prove job wiring, while helper tests prove path math.

The qaskills add --dir command is complete only when status, path, and artifact agree. A green status with a wrong folder or a good file after status one is still a failed contract.

Store only the focused skill folder when a test fails and files help diagnosis. A whole workspace archive can include source, cache data, or secrets that the path test never needs.

Review artifact retention and access with the same care as other CI output. SKILL.md can hold operational guidance even when it has no direct secret.

Finish by comparing the final file list with an allowlist from the fixture. This catches stale files, lost companions, and accidental copies from the temp download root.

## Diagnose Custom Directory Failures

Most qaskills add --dir failures fall into four groups: source resolution, download, destination calculation, or copy. Read the first useful error and inspect the expected absolute path before repeating the command.

A "not found in registry" error occurs before destination copy. A Git clone error for direct GitHub input is also a source failure. A missing expected child directory often means the test forgot that the skill name is appended. A permission error under the base belongs to runner filesystem setup.

Stale files indicate a reused destination because installation does not clear it. Remove the CI-owned base and rerun. If two selected agents report the same path with one override, select one agent rather than treating duplicate copy messages as two artifacts.

When a relative override lands somewhere unexpected, print \`pwd\` and resolve the base. GitHub steps default to \`GITHUB_WORKSPACE\`, but \`working-directory\` can change that. The official variables reference gives values, while path resolution still follows the active process directory.

Do not use a broad home path to avoid permission errors. A workspace or runner temporary directory narrows access and cleanup risk. After transport succeeds, use the [SKILL.md format guide](/blog/skill-md-format-guide) to separate destination problems from invalid content.

## Frequently Asked Questions

### Does --dir install SKILL.md directly into the supplied path?

No. The supplied value becomes a base directory, which can hold one or more named skills. \`installToAgent\` appends the resolved skill name, so \`--dir /tmp/qa\` with \`playwright-cli\` produces \`/tmp/qa/playwright-cli\`. Build path assertions around that child directory and check SKILL.md inside it.

### Does --dir skip agent detection?

No. The add command still detects and selects agents before resolving and downloading the requested skill. The override changes only the final destination base. In CI, pass \`--agent universal\` to avoid prompts and produce one clear artifact under the chosen directory.

### Can the destination be relative?

Yes. A relative custom skill install directory is resolved against \`process.cwd()\`. That can be useful inside a repository, but CI should make the working directory explicit. An absolute path under \`RUNNER_TEMP\` is usually easier to assert and clean safely there.

### Will installation remove stale destination files?

No. Current copy behavior creates the target and overwrites matching files without clearing unrelated existing entries. Remove a CI-owned base before running qaskills add --dir. Then assert that a seeded stale marker is absent to prove the job started from clean state.

### Should a workflow use --yes with --dir?

It can, but \`--yes\` selects all detected agents. Every selected agent then receives the same override base, so copies converge on one named directory. An explicit \`--agent universal\` is clearer for a single CI artifact and avoids duplicate install messages.

### What is the minimum post-install check?

Verify the expected child directory, require a non-empty SKILL.md, and parse its frontmatter to confirm identity. Add companion-file checks when the package depends on references, scripts, or assets. A zero command exit status alone does not prove the intended artifact was delivered.`,
};
