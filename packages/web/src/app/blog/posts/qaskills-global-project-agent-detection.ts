import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills global project agent detection',
  description:
    'QASkills global project agent detection: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills global project agent detection',
  keywords: [
    'QASkills global project agent detection',
    'global agent skills path',
    'project agent config detection',
    'qaskills agent scope',
    'home directory agent rules',
    'workspace agent skills folder',
    'agent path resolution tests',
  ],
  relatedSlugs: [
    'how-to-install-skills-claude-code',
    'how-to-install-skills-cursor',
    'skill-md-format-guide',
    'ai-qa-skills-directory-2026',
  ],
  sources: [
    'https://nodejs.org/api/path.html',
    'https://nodejs.org/api/os.html',
    'https://agentskills.io/specification',
  ],
  repoEvidence: [
    'packages/cli/src/lib/agent-detector.ts#detectAgents',
    'packages/cli/src/lib/agent-detector.ts#isGlobalPath',
    'packages/cli/src/lib/agent-detector.ts#expandHome',
    'packages/shared/src/constants/agents.ts#AGENTS',
  ],
  content: `QASkills global project agent detection classifies an agent from its configured \`configDir\`: a tilde prefix means global, while a relative path means project scope. It expands global paths against the operating system home directory, resolves project paths against the supplied workspace, and reports a target only when its configuration evidence exists.

The contract is implemented by \`detectAgents\` in \`packages/cli/src/lib/agent-detector.ts\`. Agent definitions come from the shared constants, so a correct test controls filesystem probes, the home directory, and the project root without modifying a developer's real agent folders.

## What does QASkills global project agent detection guarantee?

QASkills global project agent detection guarantees consistent scope and absolute skill paths for definitions that satisfy current configuration checks. It does not inspect arbitrary folders, infer an agent from installed skills alone, or validate the contents of an agent configuration file.

The detector accepts an optional \`projectDir\`; when that argument is absent, it uses \`process.cwd()\`. For each definition in \`AGENTS\`, it decides scope from \`configDir\`, resolves configuration and skill locations, checks existence, and returns a \`DetectedAgent\` object only when accepted evidence exists.

Each result carries the original definition, resolved \`skillsDir\`, path state, and scope; the \`exists\` flag does not control whether the agent appears. It tells later commands whether the destination is already present.

The evidence rule is not the same for both scopes; every definition can be found from its configuration directory. Only project-scoped definitions can also be detected from \`configFile\`, because the code explicitly guards that probe with \`scope === 'project'\`.

That rule gives a test four facts to check for each match; the ID, scope, full skill path, and path state must be right. A weak check for the ID alone can miss all three path bugs.

The probe asks whether a path can be reached with \`F_OK\`; it does not read a file or list a folder at this stage. A zero-byte config file can prove a project match, while its text has no role in this test.

One call may return many agents because the loop does not stop after the first match, so build expected sets by ID when several paths exist. This keeps QASkills global project agent detection clear even when one work tree has files for more than one tool.

The result does not expose which project check caused a match; if both config sources exist, the same one record comes back. Test each source in its own root before adding a case where both are true.

After scanning \`AGENTS\`, the detector always appends \`UNIVERSAL_AGENT\`. Its global path is expanded, and its skills-directory existence is reported, but no configuration evidence is required. The [Agent Skills specification](https://agentskills.io/specification) describes the portable skill format associated with that cross-vendor location.

This narrow reading prevents false claims. QASkills global project agent detection describes path classification and evidence checks, not whether an agent process will load every resulting file. Installation behavior is covered in the [QA skills directory guide](/blog/ai-qa-skills-directory-2026).

## How does global agent skills path work?

A global agent skills path starts with a tilde in the shared definition and is expanded with the current operating system home directory. It never uses the supplied project root for that path.

\`isGlobalPath\` at \`packages/cli/src/lib/agent-detector.ts#isGlobalPath\` checks whether \`configDir\` starts with \`~/\` or with \`~\`. The second condition also covers the first, but together they document the accepted prefix. A path such as \`~other/config\` would currently count as global even though \`expandHome\` only expands \`~/\` and the exact string \`~\`.

That edge case is a useful contract boundary. Current definitions use ordinary \`~/...\` values, so a regression suite should first lock those real records. A separate characterization case can show that an unsupported tilde form is classified global yet returned without expansion if future definitions introduce it.

\`expandHome\` at \`packages/cli/src/lib/agent-detector.ts#expandHome\` calls \`os.homedir()\`, removes the first tilde, and joins the remaining path. The [Node OS documentation](https://nodejs.org/api/os.html) defines \`homedir()\`, while the [Node path documentation](https://nodejs.org/api/path.html) defines platform-specific joining and resolution.

Write expected paths with \`path.join(fakeHome, '.claude', 'commands')\`, since a plain slash string may pass on one host and fail on the next. Using the same path rules does not copy the detector's scope choice, which is the branch under test.

Change the fake home between two tests and keep the project root fixed; the global path should move while each project path stays put. This pair gives a clear sign when the wrong base path was used.

Then change the project root and keep the fake home fixed; project paths should move while the global path should not move. These mirror checks make a path mix-up easy to spot in a failed line.

For Claude Code, the current constants use \`~/.claude\` as configuration and \`~/.claude/commands\` as skills. For Codex, both configured locations also start with a tilde. Those facts come from \`packages/shared/src/constants/agents.ts#AGENTS\`, not from assumptions about user machines.

Use one real record as the main global case, since a made-up agent cannot prove that current data works with the helper. The [supported agent page](/agents) gives a quick public view after the source test passes.

The \`exists\` flag must follow the skill path probe, not the config path probe; make config true, then swap only the skill path result. Both calls should find the agent, but the flag should change.

Do not build a test by writing into the actual home directory. Mock \`os.homedir\` and filesystem access, or run the detector in a child process with a controlled home environment only if module seams require it. The [Claude Code installation guide](/blog/how-to-install-skills-claude-code) explains the user workflow, while this test proves the resolved path.

Avoid a broad access mock that returns true for each path, since it would make every agent appear and hide which probe chose the record. A set of exact full paths keeps the fixture small and makes stray calls fail in a useful way.

## Which cases define project agent config detection?

Project agent config detection needs directory evidence, file evidence, absent evidence, a custom root, and an existing or missing skills destination. These cases prove detection without confusing configuration presence with package installation.

Cursor provides a clear project-scoped example in the constants: \`configDir\` is \`.cursor\`, \`skillsDir\` is \`.cursor/rules\`, and \`configFile\` is \`.cursorrules\`. Both relative locations are resolved against the \`projectDir\` argument.

When \`.cursor\` exists, the detector returns Cursor regardless of whether \`.cursor/rules\` exists, and the result's \`exists\` field mirrors the rules probe. This lets an add command create the destination after the agent has been recognized.

When the directory is absent but \`.cursorrules\` exists, the project-only config-file branch still returns Cursor. If both are absent, Cursor is omitted. A QASkills global project agent detection test should assert all three results and the universal record that remains present in every run.

Add one case where only \`.cursor/rules\` exists; current code should not return Cursor because the skill path is not proof of config. This is a key guard against a stale folder that remains after a tool was removed.

Add one case where \`.cursor\` exists but \`.cursor/rules\` does not; Cursor should have project scope and \`exists: false\`. That result gives an install command the path it may need to make.

Then create both paths and expect \`exists: true\`; the agent count should not rise because both paths describe one agent. This check blocks code that adds one row for config and one row for skills.

The same distinction applies to definitions whose config file sits inside a directory, such as GitHub Copilot. The code resolves \`configFile\` directly from the project root. It does not prepend \`configDir\`, because the constant already contains its relative path.

Use the exact configFile string from the definition in the fixture. Do not join it to configDir a second time. A failed case with a doubled \`.github/.github\` path can look like a detector bug when the test made the path.

Some definitions do not declare a config file. For them, the second check is false and only the config folder can cause a match. A data-driven suite should branch on that field rather than forge a file path from an empty value.

A controlled fixture can use a temporary project tree:

\`\`\`typescript
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qaskills-agent-'));
await fs.writeFile(path.join(root, '.cursorrules'), 'Use project rules.\\n');

const detected = detectAgents(root);
const cursor = detected.find((item) => item.definition.id === 'cursor');

expect(cursor).toMatchObject({
  scope: 'project',
  skillsDir: path.resolve(root, '.cursor/rules'),
  exists: false,
});
expect(detected.at(-1)?.definition.id).toBe('universal');
\`\`\`

This example allows real filesystem probes inside an isolated directory. Global agents still depend on the actual home unless their probes are mocked, so filter assertions by agent ID and clean the fixture afterward. For a fully deterministic list, mock \`fs.accessSync\` before importing the module.

The real-file case and full-mock case serve different goals. Real files prove path join and access behavior for project scope. The strict mock proves the full returned set with no link to host state.

Keep at least one of each, but do not make every row use both styles. Too much setup makes a simple failure hard to read. The [Cursor skill install guide](/blog/how-to-install-skills-cursor) can cover the user path after code checks pass.

## qaskills agent scope and the current QASkills contract

The qaskills agent scope is a property of the definition's configuration path, not a property inferred from the resolved absolute path. That design keeps scope stable across operating systems and workspace locations.

A project root may itself live inside the user's home directory. Cursor under \`/Users/example/work/app/.cursor\` still has project scope because its configured \`configDir\` is relative. Conversely, Claude Code stays global even when the supplied project root happens to contain a \`.claude\` folder.

The detector resolves project locations with \`path.resolve(cwd, relativePath)\`. Absolute entries in a future project-scoped definition would cause \`path.resolve\` to ignore the workspace prefix. No current definition should be described that way without checking the constants.

Test a project root that contains spaces. Path resolution should keep the full name with no URL-style escape because these are file paths, not web paths. A fetch or URI helper should not appear anywhere in this suite.

Test a root with a trailing separator too. The resolved skill path should equal the result from the same root without that extra mark. This shows that path handling, rather than string join, owns the final form.

Global locations use \`expandHome\` independently for \`configDir\` and \`skillsDir\`. This matters if one definition has matching scope but different path suffixes. Tests should assert the resolved skill destination from \`agent.skillsDir\`, not derive it from the configuration result.

The config path is only used for the match, so it is not part of the returned record. A spy on access calls can prove that it was checked. The returned \`skillsDir\` then proves that the other defined path was used for install work.

QASkills global project agent detection does not call \`realpath\`. Dot segments are handled by Node path tools for project paths, while home paths are joined from current constants. Do not claim that links or case variants are made into one true disk path.

The \`DetectedAgent.definition\` object is passed through unchanged. That means names, IDs, install methods, and websites remain sourced from shared constants. A deep equality check against a hand-written copy is brittle, while identity or selected-field assertions better expose path logic.

Still assert the stable ID and name in one main case. Those two fields make a failed output easy to read. Leave web links and sales copy out of path tests because they do not drive this branch.

For QASkills global project agent detection, a returned order can aid display but should not be the only way tests find a row. Use \`find\` for branch checks and one small order test for the shared list. This keeps a new agent from breaking many unrelated path cases.

QASkills global project agent detection also preserves \`AGENTS\` iteration order, then adds the universal result. Commands can display that order, but consumers should locate records by ID unless ordering is a stated interface requirement. Browse the supported [agent directory](/agents) to compare current public targets.

## How do you test home directory agent rules?

Test home directory agent rules by controlling \`os.homedir()\` and every filesystem existence result that can include global configuration. Never let the fixture discover a developer's actual Claude, Codex, or universal directories.

Because \`agent-detector.ts\` imports \`node:os\` and \`node:fs\` as module namespaces, Vitest spies can replace \`homedir\` and \`accessSync\` before invocation. The access mock should recognize full paths and throw for absent paths, matching the helper's try-catch behavior.

Use the production functions through \`detectAgents\`, because \`isGlobalPath\` and \`expandHome\` are private. This preserves the observable API while still exercising both helpers. The following fixture proves one global and one project result:

Set the access spy before the call and restore it right after the assertion. If the module has already loaded, the namespace import still reads the spied method at call time. Confirm that fact once in the real test runner rather than relying on a mock style from another project.

\`\`\`typescript
vi.spyOn(os, 'homedir').mockReturnValue('/home/qa');
vi.spyOn(fs, 'accessSync').mockImplementation((candidate) => {
  const found = new Set([
    '/home/qa/.claude',
    '/home/qa/.claude/commands',
    '/work/app/.cursor',
  ]);
  if (!found.has(String(candidate))) throw new Error('ENOENT');
});

const results = detectAgents('/work/app');
const claude = results.find((item) => item.definition.id === 'claude-code');
const cursor = results.find((item) => item.definition.id === 'cursor');

expect(claude).toMatchObject({
  scope: 'global',
  skillsDir: '/home/qa/.claude/commands',
  exists: true,
});
expect(cursor).toMatchObject({
  scope: 'project',
  skillsDir: '/work/app/.cursor/rules',
  exists: false,
});
\`\`\`

On Windows, expected separators differ. Use \`path.join\` and \`path.resolve\` in test expectations unless a test intentionally verifies POSIX output. That choice follows the same Node API used by production and keeps the suite portable.

A Windows home may start with a drive letter, while a POSIX home starts with a slash. The fake value should fit the host under test. The key rule is that global results use that home and project results use the given root.

Do not compare path case after forcing all text to lower case. Some file systems preserve case, and the detector returns what Node builds. Exact path checks are more useful when fixture input is under full test control.

Follow this sequence for a repeatable QASkills global project agent detection test:

1. Read the current agent constants and select one tilde definition plus one relative definition.
2. Choose a fake home and project root, then map only the configuration and skill paths needed by the case.
3. Mock \`homedir\` and \`accessSync\`, invoke \`detectAgents(projectRoot)\`, and find results by stable agent ID.
4. Assert scope, resolved \`skillsDir\`, destination existence, and absence when no accepted evidence exists.
5. Restore spies after every case and add one assertion for the always-present universal record.

This workflow isolates home directory agent rules from developer state. The [Cursor installation guide](/blog/how-to-install-skills-cursor) can then serve as a manual path check after deterministic tests pass.

Run the same detector twice after the mock map is set. Both calls should return the same IDs and paths, with no saved state from the first call. The function creates a new result list on each run.

Then remove one project config path from the map and call again. That agent should leave the set while the universal row stays. This repeat-run test catches a future cache that fails to see file changes.

## workspace agent skills folder failure and edge-case matrix

The workspace agent skills folder matrix distinguishes recognition, destination readiness, scope, and path resolution. Each row should assert a returned record or deliberate omission.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| Global agent skills path | Home config and skills folder exist | Global record with expanded destination | Project root changes global path | \`packages/cli/src/lib/agent-detector.ts\` |
| Project agent config detection | Relative config directory exists | Project record resolved from fixture root | Path resolves from process cwd instead | \`packages/shared/src/constants/agents.ts\` |
| Home directory agent rules | Global config exists, skills folder absent | Record exists with \`exists: false\` | Agent disappears with missing destination | \`packages/cli/src/lib/agent-detector.ts\` |
| Workspace agent skills folder | Config file exists without config directory | Project record is still detected | Config-file fallback is skipped | \`packages/cli/src/lib/agent-detector.ts\` |
| No project evidence | Directory and file both absent | Project record is omitted | False detection from skills folder alone | \`packages/cli/src/lib/agent-detector.ts\` |
| Universal target | No universal directory exists | Global universal record with \`exists: false\` | Universal record is missing or duplicated | \`packages/shared/src/constants/agents.ts\` |

One subtle negative case creates only the project skills folder. The detector probes configuration and config-file evidence before it decides to return an agent. A populated \`.cursor/rules\` directory alone does not currently detect Cursor.

That rule helps when a work tree has old files from a past setup. A skill folder can remain after an editor is gone, so it is not enough proof by itself. Tests should keep that old-folder case even if most users never see it.

Another case gives the detector a relative \`projectDir\`. Since \`path.resolve\` accepts it, results depend on the process working directory. Prefer an absolute temp root in normal tests. Use the relative form only as a characterization test with a controlled cwd.

If that test changes cwd, wrap the change in try and finally. A failed path assertion must not leave the whole test process in a temp folder. Later file tests can fail in odd ways when cwd leaks.

Permission errors and absent paths produce the same false result because \`probeExists\` catches every exception. The detector cannot distinguish access denial from nonexistence. A test should document that boundary without claiming a specific filesystem diagnosis.

Use two error objects with different codes if this branch is changed later. Under current code, both should lead to the same missing result. That shows the catch is broad and keeps error text out of the return type.

The universal record can share a destination concept with agent-specific records, but the code appends it separately. Assert exactly one universal ID per call. Do not assert that every supported agent follows the open standard because the constants deliberately preserve vendor-specific folders too.

The universal row appears last because it is pushed after the loop. Its scope is global, and its path comes from \`UNIVERSAL_AGENT.skillsDir\`. A missing folder changes only \`exists\`, not whether the row is returned.

Check the [skills catalog](/skills) with one package only after this row-level test passes. Package choice cannot prove path scope, yet it can make the final manual install check easy to follow.

## How should agent path resolution tests run in CI?

Agent path resolution tests should run with mocked global probes, temporary project paths, platform-aware expectations, and complete cleanup. They should never require an installed editor or coding agent on the runner.

Keep two suites. A pure detection suite can mock all access calls and cover each branch quickly. A small filesystem suite can create project directories and config files to verify that the real probe sees them.

Run both suites with a fixed project root per test worker. If parallel cases share one fixture, removing a directory can race with another detection call. Unique directories and \`afterEach\` cleanup remove that source of flaky results.

Reset \`process.cwd()\` only when testing the omitted argument. Save the original path and restore it in a \`finally\` block. Most cases should pass \`projectDir\` explicitly, which makes their intent clearer.

A CI check can also iterate current \`AGENTS\` definitions and assert that each config and skills path is either tilde-prefixed or relative as expected. That structural test belongs beside constants and catches an unsupported path form before detector tests become confusing.

Print the agent ID in each table row or assertion message. When a new constant breaks a rule, the failure should name the record at once. A bare true-or-false result makes data fixes slower.

Keep the structural rule narrow. It should not ban a path form that Node can handle unless the detector fails to support it. Source data and branch code must change as one tested contract.

Do not make the suite depend on output from \`qaskills list\` or installation prompts. Those commands consume detection results but add formatting and interaction concerns. The [getting started page](/getting-started) is the right place for a final command-level check.

Run the path suite before command tests in CI. A wrong detector set can cause many command rows to fail with less clear text. Fixing the first path error will often clear the later noise.

QASkills global project agent detection needs no network key, sign-in state, or live site. If a path test asks for one, its setup has crossed the feature boundary. Keep web checks in a later smoke job.

## Implementation checklist for QASkills global project agent detection

Use this review checklist for QASkills global project agent detection:

- Select real definitions from \`AGENTS\` rather than inventing configuration shapes.
- Assert scope from configured \`configDir\`, not from the final absolute path.
- Control the home directory whenever global definitions are in scope.
- Prove project config-directory and project config-file evidence independently.
- Treat the skills destination's \`exists\` flag separately from agent recognition.
- Verify that a skills folder alone does not detect a project agent.
- Assert one universal record even when its directory is absent.
- Restore filesystem and OS spies after each case.

The source reference for the public loop is \`packages/cli/src/lib/agent-detector.ts#detectAgents\`. Keep that path in test comments or review notes so future maintainers can compare assertions with the actual branch.

Avoid testing private helpers by copying them into a test file. A copied tilde check can stay green while production changes. Exercise helper behavior through returned \`scope\` and \`skillsDir\`.

Finally, keep command expectations outside this suite. Detection returns data; list, add, remove, and update commands decide how to present or use it. The [skills catalog](/skills) offers a safe fixture choice for later command smoke testing.

Run one last path swap with a fixed home, then move the work root from one short temp path to a second short temp path while the same mock map stays in view. The global rows must keep the same full paths, while each project row must use the new root, keep its scope, and report the path state set for that run.

## Frequently Asked Questions

### What does global agent skills path verify in QASkills?

It verifies that a tilde-based agent definition resolves its skills destination from the operating system home directory and receives global scope. The test should also check the separate destination existence flag. It does not prove that the external agent reads, validates, or executes every skill stored there.

### When should a team test project agent config detection?

Run project agent config detection tests when agent constants, configuration filenames, path resolution, or filesystem probing changes. Add a regression after any report that QASkills misses a supported workspace. Test both directory evidence and config-file evidence because project definitions can currently use either path to qualify.

### How can a fixture isolate qaskills agent scope?

Use a temporary absolute project root, a mocked home directory, and a strict map of paths that should exist. Invoke \`detectAgents\` with that root and locate results by agent ID. This prevents installed tools, personal dotfiles, runner home contents, and prior test order from changing the expected scope.

### Which assertion proves home directory agent rules?

Assert that changing the supplied project root does not change a global agent's expanded \`skillsDir\`. Pair that check with a mocked \`homedir\` value and the expected global scope. Then prove a project agent does change roots, which makes the classification difference observable in one compact test.

### What failure cases belong in workspace agent skills folder tests?

Cover an absent configuration directory, absent config file, present skills folder alone, inaccessible path, and missing destination after valid configuration evidence. The current probe converts access errors to false, so permission failure and absence look identical. Tests should state that limit rather than claim a detailed filesystem error.

### How should CI run agent path resolution tests checks?

CI should mock home-based access, use unique temporary project roots, calculate expected paths with Node utilities, and restore every spy. No editor installation or personal configuration should be required. Include one structural check over shared agent definitions and one command smoke test only after the deterministic detector suite passes.

## Conclusion

QASkills global project agent detection follows configured paths, not guesswork: tilde configuration means global, relative configuration means project, accepted evidence controls recognition, and skills-directory existence remains a separate result. Tests should isolate every path source and preserve the universal target rule.

[Review supported agents](/agents), then choose a QA package from the [skills catalog](/skills) and test the documented detection case. Use the [SKILL.md format guide](/blog/skill-md-format-guide) when the next check moves from destination resolution to package contents.
`,
};
