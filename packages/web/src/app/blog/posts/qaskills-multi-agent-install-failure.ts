import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills multi agent install failure',
  description:
    'QASkills multi agent install failure: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills multi agent install failure',
  keywords: [
    'QASkills multi agent install failure',
    'partial agent skill install',
    'multi agent install rollback',
    'qaskills copy failure',
    'agent install consistency test',
    'skill installation transaction',
    'recover failed agent install',
  ],
  relatedSlugs: [
    'how-to-install-skills-claude-code',
    'how-to-install-skills-cursor',
    'skill-md-format-guide',
    'qaskills-add-custom-directory-ci',
  ],
  sources: [
    'https://nodejs.org/api/fs.html',
    'https://vitest.dev/guide/',
    'https://github.com/tj/commander.js',
  ],
  repoEvidence: [
    'packages/cli/src/commands/add.ts#addCommand',
    'packages/cli/src/lib/installer.ts#installToAgent',
    'packages/cli/src/lib/installer.ts#copyDir',
    'packages/cli/src/commands/update.ts#updateCommand',
  ],
  content: `QASkills multi agent install failure stops the sequential install loop at the first rejected copy. Targets that finish first stay in place, the failed target may hold some files, and later agents are not attempted. The add command catches the error and sets status one, but current code performs no rollback or automatic recovery.

This contract spans \`packages/cli/src/commands/add.ts\` and \`packages/cli/src/lib/installer.ts\`. It concerns the same state across several agent targets, not registry download fallback or one custom path. Review the supported [agents directory](/agents), then test the failure with throwaway folders rather than a real home directory.

## What does QASkills multi agent install failure guarantee?

QASkills multi agent install failure guarantees that a thrown install error reaches the add command's outer catch. The command stops its spinner, prints the error, emits a failed outro, and sets \`process.exitCode = 1\`. It does not guarantee all-or-none work, target cleanup, rollback, or attempts for agents after the failure.

The loop at \`packages/cli/src/commands/add.ts#addCommand\` awaits \`installToAgent\` once for each selected agent. Since each promise is awaited inside a normal \`for...of\`, work stays in order, and the next loop step cannot start until the current install resolves.

If the first install resolves and the second rejects, the first target stays unchanged. Control leaves the loop, so the third target is never called. The catch has no list of completed paths and does not invoke \`uninstallFromAgent\`.

The failed target can also remain. \`installToAgent\` creates its target before it starts the deep copy. If a later read or copy rejects, neither that helper nor the command removes files already made under the target.

Telemetry and the success outro occur after the complete loop. A failure means the command does not send its normal install event and does not claim that all selected agents succeeded. This is a useful negative assertion because a misleading success event would hide partial state.

The command does set failure status, unlike some informational commands. A built-process test should inspect numeric status one and safe output. A helper-level test should inspect target directories because process status cannot reveal which copies remain.

The boundary should be stated plainly: current behavior is fail-fast but not transactional. Calling it rollback would be inaccurate. Teams can choose a future cleanup policy, but the release test must first preserve what source actually does.

The [Claude Code skill installation guide](/blog/how-to-install-skills-claude-code) shows a normal destination flow. This article focuses on the interrupted multi-agent path that such a success guide does not own.

## How does partial agent skill install work?

A partial agent skill install begins after agent detection and selection have completed. The command resolves and downloads the skill once, then reuses that source directory for every selected agent. Each destination receives a recursive copy under its own configured skills directory.

The core sequence can be reduced to its observable control flow:

\`\`\`typescript
for (const agent of selectedAgents) {
  spinner.start(\`Installing to \${agent.definition.name}...\`);
  const installedPath = await installToAgent(
    skillDir,
    skill.name,
    agent.definition,
    options.dir,
  );
  spinner.stop(\`Installed to \${agent.definition.name}: \${installedPath}\`);
}

sendTelemetry({
  skillId: skill.name,
  action: 'install',
  agents: selectedAgents.map((agent) => agent.definition.id),
});
\`\`\`

The sequence has no transaction object or completed-target journal. Spinner success is printed after each resolved copy, so terminal output may show one successful agent before a later failure. Tests should retain that ordering rather than expecting one final all-or-nothing message.

When an error escapes the loop, the surrounding catch prints the error's message when it is an \`Error\`. Other thrown values are converted with \`String\`. It ends with a failed install line and assigns process status one.

A copy can fail for many local reasons, including a missing source entry, an unreadable directory, a destination that cannot accept a file, or a mocked file-system error. Cross-platform tests should avoid fragile permission tricks. Inject a controlled failure at the helper boundary for command logic, then test real copy behavior separately.

The selected order usually comes from detected agents or the multiselect result. A deterministic unit test should supply three named agents in a known order. Then it can fail the second call and compare the complete call sequence.

Do not use an actual Claude or Cursor configuration folder. A failed test could overwrite a user skill or leave debris. The [Cursor installation guide](/blog/how-to-install-skills-cursor) is useful for manual destinations, while automated failure fixtures belong under a temporary root.

## Which cases define multi agent install rollback?

Multi agent install rollback cases must begin by acknowledging that no rollback exists today. The useful matrix asks which destinations were complete, partial, untouched, or attempted after a failure. A future rollback implementation can then change those expectations in one deliberate update.

At minimum, fail the first, middle, and final selected agent. A first-agent failure should leave later helpers uncalled. A middle failure should retain one completed target and skip remaining targets. A final failure should retain every earlier completed target.

Also test a failure before the loop. If resolution or download rejects, no destination should be attempted. This separates source delivery failure from QASkills multi agent install failure and proves the install helper is not called prematurely.

Success remains a necessary control. Every selected destination should receive the helper call in order, telemetry should list all selected ids, the final success outro should state the count, and status should remain unset. Without this row, a test double that always throws could make the negative suite look complete.

For real directory behavior, call \`packages/cli/src/lib/installer.ts#installToAgent\` with a temporary source and an agent definition whose skills directory points inside another temporary root. Verify the returned target path and files. Then create a controlled source condition that fails after one entry when the file-system seam supports it.

The [Node file system API](https://nodejs.org/api/fs.html) documents the promise calls used by the helper. Tests should focus on QASkills state after those calls, not restate Node behavior. A mocked late \`copyFile\` rejection is acceptable when paired with one real successful copy test.

A rollback requirement needs explicit policy choices. Should earlier successful installs be removed, restored from backups, or reported for manual cleanup? Should a partly existing destination be restored to its old contents? Source has no answers yet, so the article cannot claim one.

## qaskills copy failure and the current QASkills contract

A qaskills copy failure can occur after the target directory exists. The helper at \`packages/cli/src/lib/installer.ts#installToAgent\` resolves the target base, joins the skill name, calls recursive \`mkdir\`, invokes \`copyDir\`, and returns the target only after copying resolves.

\`copyDir\` is implemented in \`packages/cli/src/lib/installer.ts#copyDir\`. It creates each destination directory, reads source entries with types, skips entries named \`.git\`, recurses into directories, and copies regular entries with \`copyFile\`. It does not sort entries, stage a complete tree, or rename one atomic directory.

This means partial contents are possible. If three files copy and the fourth rejects, those three files remain. If the target already existed, copied files may overwrite matching names while unrelated old files remain because no destination cleanup occurs.

The absence of cleanup is especially important for update behavior. A new skill version that removes one file will not automatically remove the old destination file through \`copyDir\`. That stale-file concern is adjacent to partial failure and should have its own test when update integrity matters.

Directory enumeration order is not promised by this code. Do not assert which named file is copied first unless the fixture controls or mocks \`readdir\`. Instead, inject a failure based on a chosen entry through a test seam and assert only the state that the seam makes deterministic.

The helper expands a leading tilde in the agent skills directory by replacing it with the current home path. A supplied override directory uses \`path.resolve\` instead. This article does not cover one override path, but direct helper fixtures can avoid user state by using an absolute temporary skills directory.

On failure, \`installToAgent\` rejects without wrapping the error. The add catch therefore prints the original message. Use a safe fixed message in tests, such as \`copy denied by fixture\`, and assert that it appears once.

For package shape expectations, compare installed files with the [SKILL.md format guide](/blog/skill-md-format-guide). Do not execute copied scripts in a transport test. The copy oracle is file presence and content, not trust in the installed instructions.

## How do you test agent install consistency test?

Test an agent install consistency test by combining mocked command orchestration with real temporary copy checks. The command test owns call order, status, telemetry suppression, and prompt output. The helper test owns paths, copied bytes, skipped \`.git\`, and partial destination state.

Use this numbered procedure:

1. Create three fixed agent definitions and a disposable skill source.
2. Mock detection, resolution, and download so they return those fixtures.
3. Configure \`installToAgent\` to resolve once and reject on its second call.
4. Run the add command with non-interactive selection and capture prompt calls.
5. Assert two helper calls, no third call, no telemetry, and status one.
6. Inspect or model completed, partial, and untouched destination states.
7. Restore global status and mocks, then remove every temporary directory.

A command-level Vitest case can express the key oracle:

\`\`\`typescript
const installToAgent = vi
  .fn()
  .mockResolvedValueOnce('/tmp/agents/alpha/demo-skill')
  .mockRejectedValueOnce(new Error('copy denied by fixture'));
const sendTelemetry = vi.fn();

await addCommand.parseAsync([
  'node',
  'qaskills',
  'demo-skill',
  '--yes',
]);

expect(installToAgent.mock.calls.map((call) => call[2].id)).toEqual([
  'alpha',
  'beta',
]);
expect(sendTelemetry).not.toHaveBeenCalled();
expect(process.exitCode).toBe(1);
\`\`\`

Mock imported modules before importing the command so the action receives those functions. The [Vitest guide](https://vitest.dev/guide/) documents its test runner and mocking model. Repository conventions should decide whether a small dependency seam is cleaner than module mocking.

For helper tests, create a source with SKILL.md, references, and a \`.git\` folder. A success should copy the first two and omit \`.git\`. A late failure fixture should prove the target is not removed automatically.

Reset \`process.exitCode\` in \`afterEach\`, because one expected command failure can make the whole Vitest process exit incorrectly. Restore prompt, telemetry, detector, resolver, downloader, and installer mocks as well. Shared state is the most common reason this suite passes alone but fails in a package run.

## skill installation transaction failure and edge-case matrix

A skill installation transaction is a useful desired model, but current code is a sequential set of copies without commit or rollback phases. The matrix should use state labels instead of transactional language in expected results. That makes the implementation gap visible without treating it as hidden behavior.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| partial agent skill install | Second of three helper calls rejects | First remains, second fails, third is skipped | Third helper runs | \`packages/cli/src/commands/add.ts#addCommand\` |
| multi agent install rollback | First copy completed before failure | No automatic removal occurs | Test assumes cleanup | current add catch |
| qaskills copy failure | Late copied file rejects | Target may keep prior files | Target reported as complete | \`packages/cli/src/lib/installer.ts#copyDir\` |
| agent install consistency test | All three helpers resolve | Telemetry and success count include all three | Missing destination or id | add success path |
| Source failure | Download rejects before loop | No destination is attempted | Install helper called | add resolve and download path |
| recover failed agent install | Rerun after manual cleanup | All intended targets complete | Stale or mixed target remains | explicit recovery workflow |

The command catches errors around detection, selection, download, and every install. Thus, one failure message format covers several causes. Test names and injected messages should preserve the stage because terminal structure alone cannot identify it.

\`packages/cli/src/commands/update.ts#updateCommand\` has a different boundary. Its named-skill path also loops sequentially, but it does not wrap the flow in the add command's catch. A rejected install leaves earlier updates in place and rejects the command action.

Do not assume add and update have identical status output. Share lower-level copy fixtures where useful, then keep command assertions separate. This prevents a future catch added to update from changing add tests accidentally.

One custom-directory option can point every selected agent call at the same base and skill path. That behavior is outside this topic's intent boundary, so do not use it as the core multi-destination fixture. Give each fake agent an isolated absolute skills directory instead.

## How should recover failed agent install run in CI?

Recover failed agent install checks should run with temporary destinations, controlled helper outcomes, and explicit state reports. The required gate should never alter real agent folders. One integration row can copy real files, while orchestration rows can mock failures for stable call order.

Place fast command tests in the CLI unit suite. Run one built command against a local skill fixture if the compiled entry supports deterministic agent discovery in a disposable environment. Otherwise, keep the process test focused on status and use helper integration tests for files.

Commander coordinates the action and options. The [Commander repository](https://github.com/tj/commander.js) is the approved library reference, but QASkills source defines selected-agent order and its catch. Run \`parseAsync\` in unit tests so rejected async work is observed correctly.

The CI failure report should list completed agent ids, the failing id, skipped ids, and whether telemetry ran. For file checks, list relative target entries in sorted form. Do not print home paths or private skill content unless diagnosis truly needs them.

Recovery should be an explicit second phase in tests. Remove or restore the failed destinations according to the chosen operator procedure, rerun installation, and prove all targets contain the expected files. Do not label that manual procedure as automatic rollback.

If product code later implements staging, the test matrix should change from partial-state expectations to commit and restore expectations. Add fault injection at each transition so the new mechanism is not tested only at its easiest failure point.

The [custom directory CI guide](/blog/qaskills-add-custom-directory-ci) can support isolated single-path checks, but multi-agent orchestration should still use distinct roots. This keeps QASkills multi agent install failure coverage aligned with its actual risk.

## Implementation checklist for QASkills multi agent install failure

QASkills multi agent install failure is covered when tests prove fail-fast order, retained prior targets, possible partial target files, skipped later agents, suppressed success telemetry, and status one. The suite should also state that rollback is absent. Silence on that point invites incorrect operational assumptions.

Use this release checklist:

- Supply three deterministic agent definitions with separate temporary roots.
- Fail the first, middle, and final install in separate command rows.
- Assert exact helper call order and skipped later ids.
- Assert telemetry runs only after every selected install succeeds.
- Assert the add catch sets status one and prints a safe message.
- Test real recursive copying and \`.git\` omission in the helper suite.
- Record partial and stale file behavior without claiming cleanup.
- Reset status, mocks, and directories after every case.

Trace failures to their evidence. \`packages/cli/src/commands/add.ts\` owns sequencing and status. \`packages/cli/src/lib/installer.ts\` owns destination creation and recursive copies. \`packages/cli/src/commands/update.ts\` proves that another multi-agent loop needs a separate error contract.

Use [getting started](/getting-started) for a clean manual install after the test matrix passes. Then inspect the chosen package in the [skills catalog](/skills). Keep those manual checks outside the deterministic failure gate so catalog or user configuration changes cannot hide an orchestration defect.

A useful release note names the absence of automatic rollback and gives a recovery step. It should never claim that status one means all destinations stayed clean. Process status reports command failure, while file inspection reports consistency.

Give each fake agent a short id and a path under one test root, then list those ids in the order detection returns. Save every helper call as id, source, and target before you force the middle error. This call log proves where the loop stopped without reading prompt text or guessing from the final status alone.

Create a state map with four plain values: complete, partial, untouched, and unknown. A test can mark the first target complete, the second partial, and the third untouched after its planned fault. Do not mark a path clean just because the helper rejected, since some files may have reached disk before that rejection.

For the real copy row, put a short SKILL.md and two small files in a child folder under the source. Read each copied file and compare its text after the helper resolves. Add a \`.git\` child and prove it stays out of the target, which ties the fixture to the actual skip branch in source.

For the late fault row, make the file seam reject after one known copy and then inspect the target before cleanup. State the one file that must exist and the one that must not exist from that controlled order. This row should not rely on native directory order, since the seam must own the order it asks the test to check.

Keep prompt checks small and tied to the failed agent. One prior success stop may appear before the failed stop, and the final outro should say the skill could not be installed. The [site FAQ](/faq) can answer user questions, while this test should report which fake agent failed and which calls did not run.

Run a clean rerun only after the test removes or restores the known bad targets. That rerun should call all three agents and end with the same file set at each root. This step proves the written recovery plan works, but its test name must say cleanup was explicit rather than done by the add command.

Add one row for an error thrown as plain text, since the catch converts non-Error values with \`String\`. Use safe text and assert it appears once in the log. Keep most rows on real \`Error\` values because that is the common form returned by file and install helpers.

Keep add and update reports in two blocks, even when they share a helper fault. Add catches the fault, prints its failed outro, and sets status one. Update lets the named flow reject from its current action, so a shared snapshot would hide a real difference between the two command contracts.

Review each new cleanup change against old target data, not just a blank folder. A delete step may remove files that were present before this run, while a copy-only step may leave old files behind. The [blog index](/blog) can hold a later migration guide, but the fault suite must first prove what source does to a known old file.

QASkills multi agent install failure needs one clear owner for each state change. The command owns order, stop, output, status, and telemetry, while the helper owns path creation and copied data. When a test crosses both owners, keep separate assertions so its first failure still points to the layer that broke.

Start the full check with one small tree that has a source and three target roots, all held under the same temp test root. Give the source three plain files with known text, and give each target one old mark that names its fake agent. Those old marks show which roots changed when the planned fault ends the loop.

Write the call plan before the run as three rows with id, target, and expected state, then save it with the test data. The first row should pass, the next should fail at a known file, and the last should have no helper call at all. This plan gives the test a firm view of both work done and work skipped.

After the run, read each root and sort the short list of file names before any check. The first root should hold all new files, while the last root should still hold just its old mark. The failed root should match the exact partial set made by the seam, not a broad claim that some data may exist.

Make the seam fail on a named copy step instead of a time, count, or host rule that can shift. A fixed step gives the same partial set on a laptop and in CI. It also lets the test say which file caused the fault and which file had reached disk just before that point.

Keep old target data in at least one row, since a blank target cannot show how a failed update treats old files. Place one old file with a name not found in the new source and check that copy alone leaves it in place. This fact helps the team plan safe cleanup without claiming that current code can restore a prior skill state.

Check the failed command status after all file reads, but reset it before the cleanup hook ends. If status is checked first and the test exits early, the temp tree may hide the best proof of the fault. A safe test reads state, checks calls, checks logs, checks status, and then removes the root in a final step.

Run the same skill through a clean three-root pass after the fault case, using roots that hold no stale data. Each root should end with the same sorted list and the same file text. Compare that pass with the fault report, and use the [agents page](/agents) only to name real follow-up checks outside this fixed test.

For code review, show one small state table in the failed test output and keep long stack text below it. The table should name each fake agent as complete, partial, or untouched, with one short cause for the failed row. This view makes QASkills multi agent install failure clear even when the raw copy error comes from deep file code.

## Frequently Asked Questions

### What does partial agent skill install verify in QASkills?

It verifies that earlier successful destinations remain when a later sequential install rejects. The test should compare helper call order, completed paths, skipped agents, telemetry suppression, and process status. A final error line alone cannot prove which destinations changed before the command stopped.

### When should a team test multi agent install rollback?

Test the absence or presence of rollback whenever add sequencing, copy behavior, destination cleanup, or update logic changes. Current expectations should show no automatic removal. If rollback is added, replace those rows with explicit backup, restore, and failure-in-restore checks rather than renaming old tests.

### How can a fixture isolate qaskills copy failure?

Use temporary source and destination trees, then inject a fixed late copy rejection through a file-system seam or mocked helper. Pair that case with one real successful recursive copy. Never rely on user home permissions, since container privileges and local settings can make permission failures inconsistent.

### Which assertion proves agent install consistency test?

Compare the final file state for every selected destination and the ordered list of helper calls. On success, telemetry must include every selected id. On failure, the report must separate complete, partial, and untouched targets. A shared success outro cannot prove destination consistency by itself.

### What failure cases belong in skill installation transaction tests?

Include source failure before copying, first-agent failure, middle failure, final failure, late file-copy rejection, existing stale files, and full success. Name the current process sequential rather than transactional. Add staging and restore cases only when source implements those phases and their cleanup rules.

### How should CI run recover failed agent install checks?

Run unit orchestration tests with mocked outcomes and helper integration tests with temporary directories. Restore \`process.exitCode\`, modules, and files after every row. Keep one explicit recovery rerun, but label cleanup as test or operator action until QASkills performs it automatically.

## Conclusion

QASkills multi agent install failure is fail-fast, sequential, and non-atomic. A rejected copy ends later attempts, leaves earlier successes intact, may leave partial target data, blocks normal telemetry, and gives the add process status one. Tests must report both command signals and actual destination state.

Follow [getting started](/getting-started), choose a disposable package from [QASkills](/skills), and run the three-agent fault matrix before changing install orchestration. That evidence makes recovery work explicit and prevents a failed command from being mistaken for a clean rollback.`,
};
