import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills undetected known agent install',
  description:
    'QASkills undetected known agent install: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills undetected known agent install',
  keywords: [
    'QASkills undetected known agent install',
    'qaskills add agent not detected',
    'target known agent id',
    'install before agent initialization',
    'manual agent skill target',
    'supported agent fallback',
    'agent-specific qaskills install',
  ],
  relatedSlugs: [
    'how-to-install-skills-cursor',
    'how-to-install-skills-claude-code',
    'skill-md-format-guide',
    'ai-qa-skills-directory-2026',
  ],
  sources: [
    'https://github.com/tj/commander.js',
    'https://nodejs.org/api/path.html',
    'https://agentskills.io/specification',
  ],
  repoEvidence: [
    'packages/cli/src/commands/add.ts#addCommand',
    'packages/cli/src/lib/agent-detector.ts#getAllAgents',
    'packages/shared/src/constants/agents.ts#AGENTS',
    'packages/cli/src/lib/installer.ts#installToAgent',
  ],
  content: `QASkills undetected known agent install lets \`qaskills add\` accept a supported agent ID or name even when the file scan did not find that agent. The command gets the target from the shared agent list, sets its skills path, marks it absent, and moves on. This contract does not accept unknown agent values.

## What does QASkills undetected known agent install guarantee?

QASkills undetected known agent install guarantees a direct \`--agent\` can select a known entry without an existing config folder. The seen result is one made target row with a set path, \`exists: false\`, and a global or project scope. Unknown IDs still stop before download or install.

The branch lives in \`addCommand\` at \`packages/cli/src/commands/add.ts\`. It first calls \`detectAgents()\`, then filters found rows by exact entry ID or exact display name. Only an empty result starts the lookup through \`getAllAgents()\` in \`packages/cli/src/lib/agent-detector.ts\`.

This rule serves a set order for setup. A user can add skill text for Cursor before making \`.cursor\`, or target Claude Code before its normal command folder exists. The command does not guess from part of a name, probe some other tool, or pick the universal target in silence.

This split matters in a test. The scan shows which tools are now on disk, while the shared list shows which named targets the CLI knows. The [supported agent page](/agents) shows user choices, and the [getting started guide](/getting-started) explains the normal command flow.

The command still starts with its main scan. Current \`detectAgents()\` always adds the universal Agent Skills target, so the old zero-agent guard will most often have at least that row. A test for this rule must isolate the named target filter rather than assume the scan returns an empty array.

The open [Agent Skills spec](https://agentskills.io/specification) gives the package rules for skills that can move. QASkills keeps agent paths in its own list, so the test truth must come from repo constants rather than a guessed trade norm.

## How does qaskills add agent not detected work?

A qaskills add agent not detected request starts when Commander reads the skill arg and the \`--agent\`, \`--dir\`, and \`--yes\` flags. The [Commander repo](https://github.com/tj/commander.js) sets out the option and action model used here. QASkills then applies its own exact match and install rules in the action.

Suppose the scan returns Cursor and the universal row, but the request names \`claude-code\`. The first filter makes no row because neither found entry matches. \`getAllAgents()\` returns a shallow copy of \`AGENTS\`, and \`find()\` finds the Claude Code entry by ID.

For a home-based skills path, the command swaps the first tilde for \`os.homedir()\`. For a project path, it calls \`path.resolve(process.cwd(), knownAgent.skillsDir)\`. The [Node path API](https://nodejs.org/api/path.html) defines how these path calls join and resolve text.

The new row keeps the full entry and adds three run-time fields. \`skillsDir\` becomes the set path, \`exists\` is false, and \`scope\` follows whether \`configDir\` starts with a tilde. This object has the same shape that later install code expects from the file scan.

\`\`\`typescript
const allAgents = getAllAgents();
const knownAgent = allAgents.find(
  (agent) => agent.id === options.agent || agent.name === options.agent,
);

if (knownAgent) {
  selectedAgents = [
    {
      definition: knownAgent,
      skillsDir: resolvedSkillsDir,
      exists: false,
      scope: knownAgent.configDir.startsWith('~') ? 'global' : 'project',
    },
  ];
}
\`\`\`

After this choice, the command gets and downloads the requested skill once. It then loops through \`selectedAgents\`, calling \`installToAgent\` for each target. This path does not skip download checks, change event data, or add a new way to install.

If the identifier matches neither ID nor name, the command logs \`Agent "<value>" is not a known agent.\` and returns. It also points users toward the supported list. That negative path should prove \`resolveSkill\`, \`downloadSkill\`, and \`installToAgent\` were never called.

The [Cursor skill install guide](/blog/how-to-install-skills-cursor) covers the user flow that follows. The small rule here is target choice before setup, which a test can prove without adding or starting the target app.

## Which cases define target known agent id?

To target known agent id values well, cover IDs, display names, path scopes, and bad input. The good ID case should use a known target left out of the found rows. The display-name case should prove \`Claude Code\` can match the same entry as \`claude-code\`, since current code checks both fields exactly.

Case sensitivity is part of the present implementation. \`Claude Code\` matches, while \`claude code\` does not. A test should lock that fact without claiming it is the ideal interface. If product requirements later add normalized matching, the changed expectation will be explicit.

Project and global agents need their own path checks. Cursor uses a project skills path, so the result comes from \`process.cwd()\`. Claude Code uses a home path, so its result comes from \`os.homedir()\`. Stub or fence off both inputs before you import the command file.

The list in \`packages/shared/src/constants/agents.ts\` exports \`AGENTS\` in a stable source order. \`getAllAgents()\` returns \`[...AGENTS]\`, which stops callers from replacing the exported array by direct set. Its entries stay object refs, so tests should read them and not change them.

Use one known target per rule instead of a snap of the whole list. A full snap turns each new agent into noise for this test. Sharp checks can cover ID, name, path, \`exists\`, and scope while the list can still grow.

Also test a value that looks like a real agent but is absent, such as \`claude\`. It must not fall through to some other path. This fail result keeps skill text out of a folder the user did not mean to choose.

Repeat the same good case twice with fresh spies. Both runs should pick the same entry and target path, while each install stands on its own. The QASkills undetected known agent install branch has no module-level choice cache.

The [AI QA skills directory guide](/blog/ai-qa-skills-directory-2026) can help choose a stable registry fixture. Keep registry delivery mocked in this command test, because the target-selection contract should not depend on public network state.

## install before agent initialization and the current QASkills contract

An install before agent initialization uses metadata from \`AGENTS\`, not a directory discovered from the machine. Every definition supplies an ID, display name, configuration location, skills location, configuration file, and install method. The fallback consumes only the fields needed to identify and resolve the target record.

The current global test is derived from \`configDir\`, not from \`skillsDir\`. When \`configDir\` begins with a tilde, scope becomes \`global\`. Otherwise, scope becomes \`project\`. Tests should assert this exact rule because a future catalog entry could mix unusual path styles.

Installation itself lives in \`packages/cli/src/lib/installer.ts\`. \`installToAgent\` chooses an explicit override directory when one is supplied. Without that override, it replaces a tilde in \`agent.skillsDir\` with the home directory, appends the skill name, creates the destination recursively, and copies the downloaded tree.

The definition's \`installMethod\` is not consulted by this helper today. Some definitions say \`symlink\`, but current \`installToAgent\` always copies files through \`copyDir\`. Accurate tests should verify actual file copies and avoid asserting a symbolic link that the code does not create.

The synthetic \`skillsDir\` calculated by \`addCommand\` is informative, yet \`installToAgent\` resolves from \`agent.definition.skillsDir\` unless \`--dir\` is present. This means the command-level destination must be asserted from the returned installed path, not solely from the synthetic record.

For a controlled integration check, pass \`--dir\` to keep writes away from the real home directory. The [custom install directory guide](/blog/qaskills-add-custom-directory-ci) explains that override in detail. Here it makes pre-initialization selection safe to exercise in a temporary workspace.

The QASkills undetected known agent install contract ends after a known definition is selected and normal installation completes. It does not initialize the agent's configuration file, verify the target application, or edit project settings. Those omissions are useful boundaries, not missing test setup.

## How do you test manual agent skill target?

A manual agent skill target test should exercise the public command action while replacing only external edges. Use a temporary destination and a minimal downloaded skill folder. Stub detection, skill resolution, and download, then let installation copy real files when practical.

Follow this procedure with one isolated fixture:

1. Read \`packages/cli/src/commands/add.ts\` and record the exact option names, lookup order, output, and return points.
2. Make detection return a different supported agent plus the universal target, leaving the requested ID absent.
3. Invoke the command action with a catalog ID and a temporary \`--dir\`, then capture logs, installed files, and exit state.
4. Run an unknown-ID case and prove download and installation never start.
5. Remove the temporary directory, reset \`process.exitCode\`, and restore prompt, home, and telemetry spies.

The test can invoke Commander's parser rather than reaching into an anonymous action callback. Give it an isolated \`Command\` instance or import the registered command after mocks are established. Reset module state between cases when Commander retains parsed options.

\`\`\`typescript
await addCommand.parseAsync(
  ['node', 'qaskills', 'fixture-skill', '--agent', 'claude-code', '--dir', target, '--yes'],
  { from: 'node' },
);

expect(await fs.readFile(path.join(target, 'fixture-skill', 'SKILL.md'), 'utf8'))
  .toContain('name: Fixture Skill');
expect(process.exitCode).toBeUndefined();
\`\`\`

Use a genuine source folder for \`installToAgent\`, containing SKILL.md and one reference file. The assertion should inspect both destination files and the returned path. This covers recursive creation and copying without writing to a developer's configured agent location.

A narrower unit test may replace \`installToAgent\` and inspect the selected definition passed by the command. That test is valuable for selection shape, but it cannot prove destination creation. Keep one filesystem integration case beside the faster branch tests.

Prompt output should be asserted by meaning rather than terminal decoration. Check the unknown-agent message and the absence of success output. Color escapes and spinner frames belong to presentation code and can change without breaking target selection.

Telemetry is sent only after the installation loop. The event uses selected definition IDs, so the positive case can assert \`agents: ['claude-code']\`. The negative case should assert no telemetry call, which proves early return containment.

QASkills undetected known agent install tests should never alter a real \`~/.claude\`, \`.cursor\`, or \`.github\` directory. The temporary override gives the command an explicit, disposable boundary even when the selected definition is global.

## supported agent fallback failure and edge-case matrix

The supported agent fallback matrix should distinguish catalog selection from later transport failures. A known ID can be selected correctly even if skill download later fails. Report these as separate observations so a network error does not look like an agent lookup error.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| qaskills add agent not detected | Known ID absent from detected records | One synthetic record continues to normal download | Resolver is skipped or wrong target chosen | \`packages/cli/src/commands/add.ts\` |
| target known agent id | Exact ID or exact display name | Definition, resolved scope, and target agree | Different agent, wrong scope, or partial match | \`packages/cli/src/lib/agent-detector.ts\` |
| manual agent skill target | Unknown or case-changed value | Error is logged and command returns early | Download starts or success is reported | \`packages/shared/src/constants/agents.ts\` |
| agent-specific qaskills install | Temporary override with two source files | Both files appear under the skill directory | Stale, missing, or home-directory writes | \`packages/cli/src/lib/installer.ts\` |

A missing target configuration directory is a success fixture for this feature. It should not become the negative case. The negative lookup case is an identifier outside \`AGENTS\`, while the negative installation case is a controlled copy or download failure after selection.

An empty detected list deserves a separate characterization test because the command contains a zero-agent return. Current detector behavior appends the universal record, so a production call does not normally reach that state. A unit stub can still protect the guard, but it does not prove known-agent fallback.

Malformed skills are also downstream. The selection branch does not parse SKILL.md. Use the [SKILL.md format guide](/blog/skill-md-format-guide) for artifact validation, then keep this matrix focused on choosing a supported destination.

For repeated input, assert no stale selection leaks between parses. One case can request Cursor and the next Claude Code. Each event, output line, and install call should contain only that invocation's selected ID.

The matrix should also cover a path containing spaces. Node path functions keep that destination as one string, and \`copyDir\` receives direct path values rather than shell text. This catches test harnesses that accidentally split a correct target.

## How should agent-specific qaskills install run in CI?

An agent-specific qaskills install CI gate should use package tests for branch coverage and one built-command smoke case for wiring. Neither lane needs a real agent installation. Both can use fixed source content and an operating-system temporary destination.

Run unit cases after building the shared package because the CLI imports agent constants from \`@qaskills/shared\`. The monorepo build graph handles this dependency, but a direct package command must respect it. The [blog index](/blog) links related command and skill guidance when maintainers need context.

Keep environment control explicit. Set telemetry off for command tests, use a temporary current directory for project agents, and provide an override destination. Restore \`process.cwd()\`, \`process.exitCode\`, and mocked home values after every case.

Do not call public GitHub or QASkills endpoints in the branch suite. Stub \`resolveSkill\` and \`downloadSkill\` with known local results. A separate smoke lane can install one stable catalog entry after deployment, but network availability should not decide whether exact target matching works.

The built-command case should capture process status and inspect files. A successful QASkills undetected known agent install exits without setting an error status and creates \`<override>/<skill-name>\`. An unknown target should print its diagnostic, avoid the destination, and return without reporting installation.

Parallel workers need unique destinations and skill names. \`installToAgent\` appends the skill name to the chosen base, so workers sharing both values will write into the same tree. Prefix temporary directories with the worker ID rather than relying on cleanup timing.

Cleanup belongs in \`finally\` or \`afterEach\`. Remove fixture trees recursively, reset mocks, and clear command-level exit state. A failed assertion must not leave a destination that makes the next case pass incorrectly.

For release evidence, record the requested ID, resulting relative path, and whether the target was initially detected. Avoid storing full home paths in shared logs. Those three facts are sufficient to diagnose selection without exposing a developer account name.

## Implementation checklist for QASkills undetected known agent install

The implementation checklist should connect every assertion to a visible branch. Verify exact ID and exact name matching, then verify that an unknown value returns before resolution. Check project and global path rules independently, because they use different runtime inputs.

Confirm the synthetic record has the catalog definition, resolved \`skillsDir\`, \`exists: false\`, and derived scope. Then inspect the actual path returned from \`installToAgent\`. This two-level assertion catches both a selection regression and a destination regression.

Use \`packages/cli/src/commands/add.ts\`, \`packages/cli/src/lib/agent-detector.ts\`, \`packages/shared/src/constants/agents.ts\`, and \`packages/cli/src/lib/installer.ts\` as the repository evidence. Each path names an active part of the contract rather than a proposed design.

Assert negative side effects. Unknown agents must not trigger resolver, downloader, installer, telemetry, or success output. Known but absent agents should trigger exactly one normal install when one explicit target was requested.

Keep source citations close to claims. Commander explains parsing, Node documents path operations, and the Agent Skills specification explains package conventions. QASkills repository code remains the source for supported IDs and concrete target directories.

Give each test row a short name that states the start state, the chosen target, and the end state in plain words. A name such as "copies to Claude Code when its folder is absent" tells a failed build which rule changed without opening the test body.

Build the fixture from facts that the command can see, then keep all other machine state out of reach. The detected list, agent catalog, source skill, work root, and target base should each have one clear owner in the test.

Use one small SKILL.md file with a fixed line of text, plus one nested reference file that proves recursive copy. The source does not need a large real skill, since package depth and byte size do not affect target choice.

Check the source folder after each run as well as the target folder, because a copy must not drain or edit its input. This simple check can catch a bad move operation while the target still looks right.

For a project agent, place the fake current work root in a temp path and compute the expected target with Node path tools. For a home agent, stub the home path and assert that no part of the real user path appears in the call.

Keep ID and name tests side by side, but give each one a fresh command object and fresh output spies. That layout makes the exact match rule easy to scan when a new alias or case rule is proposed.

The unknown value test should use a clean word that cannot match any new agent by chance, then check the full early stop. It must show no fetch, no file write, no event, and no final claim that a skill was put in place.

When the source download fails after a valid match, keep the agent match facts in the failure log. A terse row can state that the ID was known, the target was chosen, and the download step failed before any target file was made.

When the file copy fails, seed the target with no old files and check its state after the error. Current code makes the target folder before copy, so the test may find an empty or part-filled folder and should report that fact with care.

Do not grant broad write access just to make the test easy, since a temp base gives enough room for all safe checks. Tight paths make a bad home write fail fast and keep the release job safe on a shared host.

Run one case with a source file name that has spaces and one nested folder with a short plain name. These inputs prove path joins stay whole while leaving shell quoting outside the code path, since the copy helper takes direct strings.

Use call counts as a guard against hidden loops, but pair each count with a result check. One install call is useful proof only when its agent ID, source path, target base, and final file all match the same test row.

The release note for this gate can fit in four fields: requested agent, found on disk, known in catalog, and installed path. Those fields let a reviewer trace the branch while keeping private home names and raw skill text out of saved logs.

Read the test once as a new maintainer would read it, from setup through cleanup, and remove any fact that does not affect the rule. A lean fixture helps the real QASkills undetected known agent install fault stand out from prompt mocks or color output.

Add one built run from a clean shell where the named agent app has not made its own files yet. The run should use a test base, put one known skill there, and show that no app boot step was needed first.

Set both the fake home and work root to paths owned by the case, then print just their short tail on a fail. This check helps prove that a global target and a project target do not cross when both rows run in one job.

Hash the small source files before the copy and once more after the command ends, then match those two safe values. The target files should match as well, which shows the write made a true copy and left its source in place.

Keep a short set of known IDs in test data and one made-up ID in a fail row, with no broad name match. If a new alias is planned, add it to the product code and its own row rather than making the old check loose.

Track each prompt and log call in the order it is seen, but compare only the words that mark each branch. The known row should reach the install claim, while the bad row should stop at the known-agent note and show no green end text.

Use a base path with one blank space and a skill name with one dash, then read the full path from the helper result. This catches bad joins in the real file flow while keeping shell split rules out of a path that never uses a shell.

Run the fail row first once, then run the good row in the same worker with new mocks and a new base. The good row must not keep an old exit code or old log, and the fail row must not leave a target tree.

For the last check, follow the same command shown in the [getting started guide](/getting-started) but swap in the safe test base. Save the agent ID, file count, and end state as proof, then erase the base before the job exits.

Before merging, run the package test twice with reversed case order. Then run the built CLI against a temporary override. Finally, inspect the [available skills](/skills) and [FAQ](/faq) only for a stable smoke fixture, not as dependencies for deterministic tests.

QASkills undetected known agent install is ready when a clean machine can select a known catalog target without creating that agent first. The same gate must prove an unknown name stays contained and produces no install side effects.

## Frequently Asked Questions

### What does qaskills add agent not detected verify in QASkills?

It verifies that an explicit supported ID or display name can be selected after normal detection misses it. The command builds a compatible target record from the shared catalog, resolves its directory and scope, and continues through standard download and installation. It does not accept unknown names.

### When should a team test target known agent id?

Test it whenever agent constants, detection logic, command options, path handling, or installation wiring changes. It also belongs in release checks for a newly supported agent. Use one global and one project definition so both resolution branches remain covered without snapshotting the whole catalog.

### How can a fixture isolate install before agent initialization?

Return detected records that exclude the requested target, choose a known catalog ID, and pass a unique temporary override directory. Stub registry delivery with a local skill package. Cleanup the destination and reset command state afterward, ensuring no real agent configuration or home directory is touched.

### Which assertion proves manual agent skill target?

The strongest assertion combines the selected definition ID with the final installed file path. Confirm the requested known ID reaches \`installToAgent\`, then read SKILL.md beneath the temporary destination. For an unknown ID, prove resolver, downloader, installer, and telemetry calls all remain absent.

### What failure cases belong in supported agent fallback tests?

Cover unknown IDs, case-changed names, path resolution failures, download rejection after valid selection, copy failure, and repeated parses with different agents. Keep each case focused on one transition. A missing configuration directory is the positive premise for this feature, not an expected lookup failure.

### How should CI run agent-specific qaskills install checks?

Run mocked branch tests in the CLI package job, followed by one built-command test using a temporary source and override destination. Disable telemetry, avoid public services, and clean all files in guaranteed hooks. A separate scheduled smoke check may use a stable public catalog skill.

## Conclusion

QASkills undetected known agent install is a precise explicit-target contract. The command first checks detected records, then uses \`getAllAgents()\` only when the requested supported target is absent. It resolves scope and destination metadata without pretending the target already exists.

Protect that behavior with exact matching, side-effect containment, path, copy, and repeat-run assertions. Keep discovery, registry transport, and artifact validation in separate suites so each failure identifies one responsible layer.

Review the supported targets on the [agents page](/agents), then choose a QA package from the [skills catalog](/skills) and test the documented detection case. The next regression check should add one newly supported project agent to the same matrix before release.`,
};
