import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills yes flag agent selection',
  description:
    'QASkills yes flag agent selection: use real repo paths, focused tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills yes flag agent selection',
  keywords: [
    'QASkills yes flag agent selection',
    'qaskills add yes flag',
    'noninteractive agent selection',
    'install all detected agents',
    'skip qaskills multiselect',
    'CI agent install selection',
    'qaskills unattended install',
  ],
  relatedSlugs: [
    'qaskills-add-custom-directory-ci',
    'how-to-install-skills-claude-code',
    'how-to-install-skills-cursor',
    'skill-md-format-guide',
  ],
  repoEvidence: [
    'packages/cli/src/commands/add.ts#addCommand',
    'packages/cli/src/lib/agent-detector.ts#detectAgents',
    'packages/cli/src/lib/installer.ts#installToAgent',
    'packages/cli/e2e/e2e.mjs#run',
  ],
  sources: [
    'https://github.com/tj/commander.js',
    'https://github.com/bombshell-dev/clack',
    'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax',
  ],
  content: `QASkills yes flag agent selection bypasses the interactive multiselect only when no explicit \`--agent\` is supplied. The add command keeps every result from \`detectAgents()\`, then downloads the skill and installs it once per selected target. Tests must control detection and prove the prompt was never called.

The relevant branches live in \`packages/cli/src/commands/add.ts\`, with filesystem discovery in \`packages/cli/src/lib/agent-detector.ts\` and copying in \`packages/cli/src/lib/installer.ts\`. This guide tests selection semantics for \`--yes\`. Custom output directories and noninteractive skill generation are separate contracts.

## What does QASkills yes flag agent selection guarantee?

QASkills yes flag agent selection guarantees that the add command does not call \`p.multiselect\` when the parsed \`yes\` option is true. It leaves \`selectedAgents\` equal to the detected array unless an explicit agent option takes precedence. Every selected entry then passes through the same install loop.

The command defines \`-y, --yes\` through Commander and describes it as noninteractive installation to all detected agents. Commander supplies a boolean option when the flag appears. The action receives that value together with optional \`agent\` and \`dir\` strings.

Choice starts after \`detectAgents()\` returns. The detector checks known agent paths, builds home paths, builds paths from the current work tree, and always adds the common Agent Skills target. That last rule means the list now has at least the common entry.

If \`--agent\` is present, the command first filters detected entries by ID or display name. If no detected match exists, it searches known definitions and can synthesize one target for an agent that has not been initialized. That branch runs before the multiselect condition, regardless of \`--yes\`.

If there is more than one detected entry and neither \`--agent\` nor \`--yes\` is present, the command opens a required multiselect through Clack. One detected entry needs no prompt because its array is already the selection. These cases must remain distinct in a useful regression suite.

The [Commander repository](https://github.com/tj/commander.js) documents option parsing, while the [Clack repository](https://github.com/bombshell-dev/clack) describes the prompt primitives used here. The QASkills behavior is proven by \`packages/cli/src/commands/add.ts#addCommand\`, not by either library alone.

## How does qaskills add yes flag work?

The qaskills add yes flag changes one condition: \`detected.length > 1 && !options.yes\`. When \`yes\` is true, that expression is false and the multiselect block is skipped. No second branch creates a new array, so reference order and membership come from detection.

After the choice, the command finds the skill, gets its files, and loops over \`selectedAgents\`. Each pass calls \`installToAgent(skillDir, skill.name, agent.definition, options.dir)\`. A final count event saves the chosen agent IDs.

The completion message prints the selected count. That line gives an observable assertion for an executable test, but it should not be the only proof. A mocked command test should also inspect calls to \`installToAgent\` and \`p.multiselect\`.

A small unit helper can show the core branch with facts from the source. The helper keeps the prompt choice clear:

\`\`\`typescript
function selectForTest(
  detected: DetectedAgent[],
  options: { yes?: boolean },
): DetectedAgent[] {
  let selectedAgents = detected;
  if (detected.length > 1 && !options.yes) {
    throw new Error('interactive selection belongs in the prompt fixture');
  }
  return selectedAgents;
}

expect(selectForTest([claude, universal], { yes: true })).toEqual([
  claude,
  universal,
]);
\`\`\`

This helper explains the branch but does not test the full command. The real command also handles a stopped prompt, an unknown agent, file fetch faults, copy faults, count events, and exit state. A stronger test runs the set action with fake inputs.

The [getting started guide](/getting-started) shows the installation flow users see. For selection coverage, avoid reading a developer's real home directory. Fixed detected-agent fixtures make QASkills yes flag agent selection repeatable and protect the exact array expected by the command.

## Which cases define noninteractive agent selection?

Noninteractive agent selection needs at least six cases because three options affect the branch. Test multiple detected entries with \`--yes\`, one detected entry without it, multiple entries without it, an explicit detected agent, an explicit known but undetected agent, and an unknown agent.

The primary case returns two or more fixed detected entries and sets \`yes: true\`. Expect no multiselect, one install call per entry, preserved order, selected IDs in telemetry, and the correct final count. This case directly proves the advertised behavior.

The one-entry case should not prompt even without \`--yes\`. That result follows from the \`detected.length > 1\` guard rather than noninteractive intent. Recording it prevents a future test from treating every prompt-free install as flag coverage.

The multi-entry case without \`--yes\` must call \`p.multiselect\` with labels, values, and path hints derived from detection. Return a subset and verify only that subset reaches installation. Also test cancellation separately because production calls \`process.exit(0)\`.

An explicit agent changes priority. With \`agent: 'claude-code'\` and \`yes: true\`, only the matching agent is selected. The test proves \`--agent\` narrows the target before the command considers whether a prompt should appear.

Known but undetected agent selection uses \`getAllAgents()\`, resolves its skills path, marks \`exists: false\`, and assigns scope from the definition's configuration path. An unknown value logs an error and returns before skill resolution. These are explicit-target contracts, but they protect precedence around \`--yes\`.

The current [CLI custom directory article](/blog/qaskills-add-custom-directory-ci) covers \`--dir\` in depth. Keep its assertions separate from agent selection, even though the production function passes the same override into each install call. Separation makes a failed case identify the responsible option.

## install all detected agents and the current QASkills contract

To install all detected agents, the command trusts the list from \`detectAgents()\`. The scan walks shared \`AGENTS\`, checks each known folder or project file, and adds a \`DetectedAgent\` when one check finds a path.

Global definitions use paths beginning with \`~\`, expanded against \`os.homedir()\`. Project definitions use \`path.resolve(cwd, configuredPath)\`. The detector records whether each skills directory exists, but selection does not filter on that field.

After scanning known definitions, it always adds \`UNIVERSAL_AGENT\`. Its skills directory is expanded from the home path, its scope is global, and its \`exists\` field reflects a filesystem probe. This fallback supports tools that scan the cross-vendor Agent Skills directory.

Two records could point to tools with like goals, so tests should match calls by agent ID and not label text. Kept order also matters because the copy loop and count list follow scan order.

\`installToAgent\` creates a target directory and recursively copies the downloaded package. Without an override, it replaces the first \`~\` in the agent's skills path with the home directory, then appends the skill name. With an override, all selected agents receive the same base path.

That override behavior means \`--yes --dir /tmp/output\` can copy the same skill to the same path once per selected agent. It does not create agent-specific subdirectories. This is current behavior in \`packages/cli/src/lib/installer.ts#installToAgent\`, and tests should not claim otherwise.

Use the [Claude Code skill installation guide](/blog/how-to-install-skills-claude-code) and [Cursor skill installation guide](/blog/how-to-install-skills-cursor) for individual tool setup. QASkills yes flag agent selection is about the shared command branch that decides which definitions reach installation.

## How do you test skip qaskills multiselect?

Test skip qaskills multiselect by running the command with two fake agent records and \`yes: true\`. Fake the skill find, file fetch, copy, prompt, and count calls at file bounds. Test path scans in a separate suite.

1. Create two \`DetectedAgent\` fixtures with unique IDs and temporary skills paths.
2. Mock \`detectAgents\` to return those fixtures in a fixed order.
3. Invoke the add action with a local skill fixture and \`yes: true\`.
4. Assert \`p.multiselect\` was never called and resolution ran once.
5. Assert \`installToAgent\` received each definition in detector order.
6. Assert telemetry contains both IDs and the completion text reports two agents.
7. Restore prompt and process mocks after the case.

A test shape based on the production dependencies looks like this:

\`\`\`typescript
vi.mocked(detectAgents).mockReturnValue([claude, universal]);
vi.mocked(resolveSkill).mockResolvedValue({
  name: 'fixture-skill',
  source: 'local',
  path: '/tmp/source',
});
vi.mocked(downloadSkill).mockResolvedValue('/tmp/download');
vi.mocked(installToAgent)
  .mockResolvedValueOnce('/tmp/claude/fixture-skill')
  .mockResolvedValueOnce('/tmp/universal/fixture-skill');

await addCommand.parseAsync(['node', 'qaskills', 'fixture-skill', '--yes']);

expect(p.multiselect).not.toHaveBeenCalled();
expect(installToAgent).toHaveBeenCalledTimes(2);
\`\`\`

Commander commands retain parsing state, so a suite may need a fresh command instance or careful reset between tests. Running repeated parses against one exported object can leak option state and listeners. Treat command construction as fixture setup.

The [SKILL.md format guide](/blog/skill-md-format-guide) can provide a minimal package body when a test reaches copying. Selection tests should mock download and copy instead. That keeps the assertion focused and avoids confusing package format failures with prompt behavior.

## CI agent install selection failure and edge-case matrix

CI agent install selection should not depend on the runner's home setup. The safest command test fakes \`detectAgents\), while a scan test uses a temp work tree and owns each file it makes.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| qaskills add yes flag | Two detected entries plus \`--yes\` | Both entries reach installation, no prompt | Prompt call or missing install | \`packages/cli/src/commands/add.ts#addCommand\` |
| noninteractive agent selection | One detected entry, no flag | Single target installs without prompt | Unneeded prompt | \`packages/cli/src/lib/agent-detector.ts#detectAgents\` |
| install all detected agents | Known entries plus universal target | Order and count match detection | Filtered or reordered targets | \`packages/cli/src/lib/agent-detector.ts#detectAgents\` |
| skip qaskills multiselect | Prompt spy with \`yes: true\` | Spy has zero calls | Interactive wait in CI | \`packages/cli/src/commands/add.ts#addCommand\` |
| CI agent install selection | One install rejects | Exit code becomes one, error is logged | False success summary | \`packages/cli/src/lib/installer.ts#installToAgent\` |
| qaskills unattended install | Explicit agent plus \`--yes\` | Explicit target wins | Every detected target installs | \`packages/cli/e2e/e2e.mjs#run\` |

Failure injection should reject the second install after the first succeeds. Production catches the error around the whole action, stops the spinner, logs the message, prints a failed outro, and assigns \`process.exitCode = 1\`. It does not roll back the first completed copy.

That partial-install fact matters for repeat runs. \`installToAgent\` creates directories recursively and copies files into them, so a later retry can overwrite matching files but does not first remove unrelated stale files. A selection test should report which target failed rather than promise transaction behavior.

Prompt cancellation is not a failure status in current code. It calls Clack cancellation and \`process.exit(0)\`. Mock the exit function so the test runner remains alive, then assert no resolution or installation started.

The [agents page](/agents) lists supported tool choices for users. A unit fixture should use IDs from shared definitions or a structurally valid fake, not scrape that page. The command source remains the authority for branch order.

## How should qaskills unattended install run in CI?

A qaskills unattended install should use explicit fixtures and avoid host discovery. For a true executable smoke test, pass \`--agent\` and \`--dir\` so the target is known. For direct coverage of \`--yes\`, use a controlled home or a mocked command test with multiple detections.

The existing E2E suite calls \`add <slug> --agent claude-code --dir <temp> --yes\`. Because \`--agent\` takes priority, that path proves explicit-agent unattended execution, download, and copying. It does not prove that \`--yes\` installs every detected entry.

This distinction should be visible in test names. Label the current case as explicit-agent install, then add a command-level case named for all-detected selection. Accurate naming prevents broad confidence claims from one narrower execution path.

GitHub Actions jobs should run without TTY input and with temporary output that is removed in \`finally\` cleanup. The [workflow syntax reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) describes job and environment configuration, while QASkills tests own the actual command arguments.

Disable telemetry in executable checks so repeated installs do not alter product counts. The current release E2E environment sets \`QASKILLS_TELEMETRY=0\` and \`CI=1\`. A dedicated unattended case should preserve both values.

QASkills yes flag agent selection should never be tested by installing into real developer skill directories. Use temporary paths, fake definitions, and cleanup. The [skills catalog](/skills) can supply a public slug for a smoke test only after local selection assertions pass.

## Implementation checklist for QASkills yes flag agent selection

Use this checklist when reviewing the command or adding CI coverage:

- Parse \`-y\` and \`--yes\` as the same boolean option.
- Return at least two fixed detections for the primary skip-prompt case.
- Assert multiselect has zero calls when \`yes\` is true.
- Assert an explicit \`--agent\` takes precedence over all-detected selection.
- Cover one detection without \`--yes\` as a separate no-prompt branch.
- Preserve detector order in install calls and telemetry IDs.
- Include the universal target in detector-level expectations.
- Inject an install rejection and verify nonzero process status.
- Mock process exit for cancellation without ending the test worker.
- Keep every copied package under a temporary directory.
- Disable telemetry for all executable CI installs.

These checks connect \`packages/cli/src/commands/add.ts#addCommand\` to \`packages/cli/e2e/e2e.mjs#run\` without overstating the existing E2E path. The command suite proves branch semantics, while the executable suite proves a built package can install.

QASkills yes flag agent selection is successful only when membership, prompt behavior, install count, and status agree. A completion string by itself can miss an incorrect target. Dependency calls and output should tell the same story.

Use the [main blog](/blog) for related command guidance, but keep regression cases near the CLI package. That placement makes changed option behavior visible in the same review as its tests.

## How can a team prove unattended installs are safe?

A safe unattended test starts with fake agent records and a temporary output root. Never point the command at a real home folder or checked-in agent config. QASkills yes flag agent selection should be judged by calls and files that the test fully owns.

Build two detected agent records with short, clear IDs. Give each record a different skills path under the temp root. This setup lets one assertion prove order, count, destination, and telemetry identity without reading a developer machine.

Mock skill resolution once and package download once. The command should reuse the downloaded source for each selected target. Count both calls so a later refactor cannot add needless network work or skip the shared package.

Invoke the command with \`yes: true\` and no explicit agent. The prompt mock must have zero calls, while install receives both detected definitions in source order. That pair proves the branch more clearly than final console copy alone.

Inspect each written skill directory after the action. It should contain the same package data, but its parent path should match the target definition. File checks catch a bug where calls look right while every copy lands in one place.

Run a second case with one explicit agent and \`yes: true\`. Detection may still run in current code, but only the named definition should reach installation. This case protects option priority from an overly broad all-agent shortcut.

Add a case with one detected record and no \`--yes\`. The command should not ask a multiselect question because there is no choice to make. Its single install proves that noninteractive behavior is not limited to CI flags.

Now add two detected records without the flag. Return one selected ID from the prompt mock and assert only that target installs. This contrast is vital because the same fixture then proves the prompt branch and the skip branch separately.

The negative suite should make the first install reject. Assert a failed status, clear error output, and no success message. QASkills yes flag agent selection must not report two completed targets when the first copy never finished.

Make the second install reject in another case. The current loop can leave the first target installed, so the assertion should record that partial state. Do not claim rollback unless code later adds and tests a real cleanup step.

Cancellation deserves its own fixture. Return the Clack cancel symbol from the prompt and mock process exit so the test worker stays alive. Assert that download, install, and telemetry have no calls after the user cancels.

Keep all telemetry calls mocked in command tests. Compare their agent IDs with successful installs, and prove a failed target sends no success event. Executable smoke runs should also set \`QASKILLS_TELEMETRY=0\` to protect public counts.

Test the built command only after branch cases pass. Use an explicit agent and a temp \`--dir\` because a real process cannot safely fake several detected home tools. That smoke case checks argument parsing, package fetch, copy, and exit status.

Name that smoke test for explicit unattended install, not install all detected agents. The broader phrase belongs only to the command test with controlled detection. Precise names stop later readers from assuming the process test covers a branch it cannot force.

Run these cases on each supported Node version used by package CI. The branch itself has no terminal need when \`--yes\` is set. A hang should therefore fail through the test timeout and reveal an unexpected prompt or open handle.

At teardown, restore prompts, process exit, telemetry, and temp paths even after a rejection. Clean state keeps later CLI tests reliable. It also proves the suite can repeat without writing to real agent folders.

Keep agent names short in test data so call lists stay easy to read. One record can stand for Claude Code and one for Cursor. Their IDs, paths, and labels should differ in each field.

Give the temp root a new name for each test. A stale folder can make a failed copy look like a pass. Remove the root in \`finally\` even when the command throws.

The prompt mock should fail if code calls it in the skip case. A zero-call check at the end is good, while a fail-fast mock gives a more useful stack. Both forms can live in the same focused test.

Keep the install mock small and state based. Record the target ID and path, then return success. A real file copy belongs in a second test that owns a temp package.

Use two records in the main case because one record does not prove all-agent choice. Use three only when order across more targets is at risk. Small lists keep the expected calls clear.

The command output should state the same count as the install calls. Compare both facts after the action ends. A count mismatch can reveal a skipped target or a stale success line.

Add one case where detection returns no records. Assert the exact help path and zero install calls. QASkills yes flag agent selection cannot choose all agents when the detected set is empty.

Read [the getting started route](/getting-started) only for the user flow, not as a test oracle. Source calls and temp files remain the proof for option behavior. Product copy can change without changing branch logic.

Use this review list before merging an unattended install change:

- fixed detected agents have unique IDs and temp paths with no real home folder in scope
- the yes case makes no prompt call and installs each fixed target in source order
- the explicit agent case installs one named target even when the yes flag is also set
- the one-agent case skips the prompt because the user has no choice to make
- the prompt case installs only IDs returned by the controlled multiselect response
- the cancel case sends no download, copy, success text, or telemetry after exit starts
- the first-fault case reports failure and does not claim that all target installs passed
- the later-fault case records partial state instead of claiming an unbuilt rollback step
- the process smoke case uses a temp output path and turns off all install telemetry
- teardown restores every prompt, exit, fetch, and file mock before another test can run

This list adds enough proof without one huge end-to-end case. Each line maps to one branch or side effect. When a line fails, the test name should point to the exact rule.

Keep each pass or fail report in one small text block with the case name and target IDs. A reader should see the flag, prompt count, install count, and exit state without opening a trace. Short facts make a bad branch easy to spot and fix.

Run the no-agent case first in a clean test file with a temp home and no known tool paths. The command should show its help path and stop before it gets a package. This check guards the base case for all later selection work.

Run the two-agent yes case next and keep both fake paths under that same temp root. The first path and second path must each get one copy, while the prompt stays unused. This is the key proof for the flag.

Run the named-agent case with the same records so the only new input is \`--agent\`. The call list must shrink to one target even though \`--yes\` is still set. That fact proves named choice wins.

End with one built smoke test from [the skills directory](/skills) and keep its path local to the run. Turn off count events and clear the temp root after the bin exits. The smoke test adds real file proof without touching user agent folders.

- report case name yes flag named agent detected IDs prompted IDs installed IDs failed ID final count exit state temp root cleanup state
- no agent run with fixed home no tool paths no prompt no download no install clear help text and safe process end
- two agent run with source order two temp paths one shared download two copies no prompt two success records and no real home writes
- named agent run with yes still set one chosen target one copy no broad all agent branch and one matching success count
- prompt run with yes not set one chosen ID one copy one event and no work for each unchosen fixed target
- cancel run with prompt stop no package fetch no file copy no count event no success line and a mocked safe exit
- first fault run with one failed target no false total no later copy and one clear code path for the test owner
- later fault run with first copy kept second copy failed partial state named no fake rollback claim and a failed final status
- close note with case name fixed IDs flag value prompt count copy count fail point exit state clean temp root and named owner
- safe rerun note with no old files no real home path no count event same call order same result and all test mocks put back
- final check with short case names clear call facts safe file paths no live count writes and one owner

## Frequently Asked Questions

### What does qaskills add yes flag verify in QASkills?

It verifies that multiple detected agents remain selected and the Clack multiselect is skipped. A complete test also checks one installation per selected definition, detector order, telemetry IDs, and the final count. The flag does not override an explicit \`--agent\` choice.

### When should a team test noninteractive agent selection?

Run these tests whenever add options, agent detection, prompt logic, installation loops, or CI commands change. Keep command-level cases deterministic with mocked detections. Add one executable smoke case afterward to prove the built CLI can run without terminal input or prompts.

### How can a fixture isolate install all detected agents?

Return two fixed \`DetectedAgent\` objects from a detector mock, give each a unique definition ID, and mock package download. Invoke add with \`--yes\), then compare install calls and telemetry against the original ordered array. No real home paths are needed.

### Which assertion proves skip qaskills multiselect?

The direct proof is \`expect(p.multiselect).not.toHaveBeenCalled()\` after an action with multiple detections and \`yes: true\`. Pair it with install-call assertions, because a command that skips the prompt but also skips every install would still satisfy the prompt assertion alone in that test.

### What failure cases belong in CI agent install selection tests?

Cover an unknown explicit agent, prompt cancellation, resolution rejection, download rejection, failure on a later target, and repeated installation to a temporary path. Verify status and output for each case. Current code does not roll back targets completed before a later copy fails.

### How should CI run qaskills unattended install checks?

Use \`CI=1\`, disable telemetry, and place all output in temporary directories. Test explicit-agent executable installation separately from all-detected \`--yes\` selection. The first checks the built command path, while a mocked command case accurately controls multiple detected targets and prompt calls.

## Conclusion

QASkills yes flag agent selection is a branch-level contract with clear precedence. Explicit agent selection runs first, \`--yes\` skips multiselect for the remaining detected array, and the installation loop preserves that array's order and count.

Follow the [getting started route](/getting-started), choose a test package from [the verified skills directory](/skills), and add the all-detected command case before relying on unattended installs. Keep real user directories outside every CI fixture.`,
};
