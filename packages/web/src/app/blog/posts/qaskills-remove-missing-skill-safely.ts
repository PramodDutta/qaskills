import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills remove missing skill safely',
  description:
    'QASkills remove missing skill safely: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills remove missing skill safely',
  keywords: [
    'QASkills remove missing skill safely',
    'qaskills remove idempotent',
    'remove nonexistent skill folder',
    'fs rm force true test',
    'safe repeated skill removal',
    'agent skill uninstall no op',
    'qaskills remove exit behavior',
  ],
  relatedSlugs: [
    'how-to-install-skills-claude-code',
    'error-handling-testing-patterns',
    'skill-md-format-guide',
    'qaskills-add-custom-directory-ci',
  ],
  sources: [
    'https://nodejs.org/api/fs.html',
    'https://github.com/tj/commander.js',
    'https://vitest.dev/guide/',
  ],
  repoEvidence: [
    'packages/cli/src/commands/remove.ts#removeCommand',
    'packages/cli/src/lib/installer.ts#uninstallFromAgent',
    'packages/cli/src/lib/agent-detector.ts#detectAgents',
    'packages/cli/src/lib/telemetry.ts#sendTelemetry',
  ],
  content: `QASkills remove missing skill safely because \`uninstallFromAgent\` calls recursive \`fs.rm\` with \`force: true\` and catches removal errors. Removing an already absent directory therefore resolves without failure, repeated calls remain no-ops, and command tests should assert unchanged absence, successful completion, stable output, and one removal attempt per selected agent.

- This contract covers an already absent target, not cancellation, unknown agent selection, or telemetry opt-out policy. The implementation spans \`packages/cli/src/commands/remove.ts\` and \`packages/cli/src/lib/installer.ts\`, while [getting started](/getting-started) explains the broader command workflow.

## What does QASkills remove missing skill safely guarantee?

- QASkills remove missing skill safely guarantees idempotent behavior for a selected agent whose named skill directory does not exist. The helper resolves, leaves the directory absent, and allows the command loop to continue to its normal removed message.

The target path is built from the agent's configured skills directory and the skill name. A home-relative base replaces its tilde with \`os.homedir\`, then \`path.join\` creates the final directory path.

- The helper calls \`fs.rm(targetDir, { recursive: true, force: true })\`. Node's [file system documentation](https://nodejs.org/api/fs.html) defines recursive removal and force behavior. QASkills then wraps that promise in a catch that treats any rejection as already removed.

For a genuinely missing target, force is the primary reason no error should occur. The catch creates a second safety layer, but it also means permission and filesystem errors are not distinguished from absence.

- Tests must preserve that nuance. An absent-directory case should pass, while a simulated permission rejection can document current swallowing behavior without claiming the directory was removed.

The command sends removal telemetry after processing all target agents and prints a success outro. Those effects are observable at command level, yet opt-out behavior belongs to its own privacy suite.

The QASkills remove missing skill safely contract is not a promise about arbitrary skill names or path validation. Use a fixed safe slug in this test and keep input hardening in a dedicated security review.

The [skills directory](/skills) can provide realistic names for manual checks. Automated cases should use local fixture names so catalog changes never affect idempotency.

## How does qaskills remove idempotent work?

- Qaskills remove idempotent behavior starts with agent selection in \`removeCommand\`. The command detects configured agents, optionally selects a named agent, confirms unless \`--yes\` is present, and calls \`uninstallFromAgent\` once for each target.

\`\`\`typescript
export async function uninstallFromAgent(
  skillName: string,
  agent: AgentDefinition,
): Promise<void> {
  const targetBase = agent.skillsDir.replace('~', os.homedir());
  const targetDir = path.join(targetBase, skillName);

  try {
    await fs.rm(targetDir, { recursive: true, force: true });
  } catch {
    // Already removed
  }
}
\`\`\`

This excerpt mirrors \`packages/cli/src/lib/installer.ts\`. The function returns no status describing whether files existed, so callers treat an existing deletion and an absent no-op identically.

Idempotency means the same requested final state can be applied more than once without changing the result after the first successful application. Here, that state is "the selected skill directory is absent."

Call the helper twice against one empty skills root. Both promises should resolve, the target should remain absent, and unrelated sibling files should remain unchanged.

Then create a target containing nested files and call the helper twice again. The first call removes it recursively, while the second proves the already absent path remains successful.

- Do not assert an internal call count when using real filesystem integration unless that detail helps diagnosis. Final directory state plus resolved promises proves the public helper contract more directly.

- The [Vitest guide](https://vitest.dev/guide/) documents the runner used for focused package tests. A real temporary directory offers better evidence here than mocking every filesystem function.

The command-level test should use \`--yes\` to avoid interactive input. That option changes prompt behavior, not uninstall semantics, and makes the fixture deterministic.

## Which cases define remove nonexistent skill folder?

- Remove nonexistent skill folder cases should separate direct helper behavior, selected-agent command behavior, multiple targets, repeated calls, and rejected filesystem operations. Each case owns one expected observation.

The direct absent case creates the agent's base directory but not the named skill. It calls \`uninstallFromAgent\`, expects resolution, and confirms the target remains absent.

A second direct case omits even the base skills directory. Recursive force removal should still resolve. This boundary proves tests do not accidentally rely on parent creation.

The existing case creates nested files under one skill directory. Require the whole target to disappear while a sibling skill directory and a marker in the parent remain.

The repeated case calls removal twice after creating the target once. Require both calls to resolve and compare final parent entries with the expected sibling-only list.

The multi-agent command case supplies two controlled definitions that point at separate roots, neither containing the target. Require one helper call per target, stable ordering, and a normal command completion.

- The rejected-operation case mocks \`fs.rm\` to reject. Current helper catches that error and resolves, which means a command can report removal even when the target remains. Capture this behavior as a known limitation, not a desired proof of deletion.

- The QASkills remove missing skill safely article deliberately excludes unknown-agent and cancellation branches. They happen before the absent target operation and deserve command-selection tests with different expected output.

Use the same safe skill name in the first four rows because the state changes but the path rule stays fixed, so a reader can compare each result without decoding new names. Give each test its own root to prevent overlap.

The absent-parent row is useful because a clean user may have no skills folder at all, and removal should not make that folder while the parent remains absent after the call. This is a stronger no-write check than target absence alone.

The existing-target row should have at least one child folder and one file because a flat empty folder does not prove recursive scope, while a small nested tree does. Keep the tree small so failed output remains clear.

The sibling row guards the most costly kind of path fault because if the helper deletes the whole skills root, the target still looks absent but another installed skill is lost. Require the sibling name and file text after each call.

The repeat row should not rebuild the target between calls because its goal is the already absent state, so the second call must see exactly what the first call left. Recreating files would test two normal removals instead.

After a mocked rejection, read the target and show that it still exists in the fixture, which makes the broad catch limit plain. Promise success and disk success are not the same fact in that branch.

Use the [QASkills FAQ](/faq) for user help when a real command gives an odd result. The local test should report its temp path, one safe name, and the final state only.

Use [installing skills for Claude Code](/blog/how-to-install-skills-claude-code) only as context for where agent directories may live. This regression fixture should control its own temporary paths.

## fs rm force true test and the current QASkills contract

An fs rm force true test should use real files for missing and existing paths, then one mock for an exceptional rejection. This combination proves Node-backed state and the QASkills catch policy.

\`\`\`typescript
it('resolves when the skill directory is already absent', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qaskills-remove-'));
  const agent: AgentDefinition = {
    id: 'fixture',
    name: 'Fixture Agent',
    slug: 'fixture',
    description: 'Temporary test agent',
    configDir: root,
    skillsDir: path.join(root, 'skills'),
    configFile: '',
    installMethod: 'copy',
    website: 'https://example.invalid',
  };

  await expect(uninstallFromAgent('missing-skill', agent)).resolves.toBeUndefined();
  await expect(
    fs.access(path.join(agent.skillsDir, 'missing-skill')),
  ).rejects.toThrow();
});
\`\`\`

- This fixture follows \`AgentDefinition\` without using a real agent target. The invalid website is data only, no network request occurs, and cleanup should remove the temporary root.

Add a sibling directory before removal and verify it survives. Without that assertion, a mistakenly broad base deletion could still make the named target absent and produce a false pass.

Spy on \`fs.rm\` only when asserting options. Require the calculated target plus \`recursive: true\` and \`force: true\`, then restore the original function before real filesystem cases run.

- The source path \`packages/cli/src/lib/agent-detector.ts\` is relevant at command level because selected detected agents supply definitions. Direct helper tests should construct a minimal definition instead of depending on host detection.

- Do not assert the catch comment or private implementation text. The stable observations are promise resolution and filesystem state. A future implementation could use an existence check while preserving the same absent-target contract.

The [error handling testing guide](/blog/error-handling-testing-patterns) provides patterns for separating expected absence from unexpected I/O failure. QASkills currently combines them, and the test should make that limitation visible.

## How do you test safe repeated skill removal?

Safe repeated skill removal requires a fixture that begins with real nested content, preserves a sibling, invokes the public path twice, and guarantees cleanup. Avoid a mock-only test because it cannot prove final state.

1. Create a temporary skills root and two child directories named \`target-skill\` and \`sibling-skill\`.
2. Add nested files beneath both directories so recursive scope becomes observable.
3. Construct one local \`AgentDefinition\` whose \`skillsDir\` points at that root.
4. Call \`uninstallFromAgent('target-skill', agent)\` and require the target to be absent.
5. Require the sibling and its file to remain unchanged after the first call.
6. Call the same helper with the same inputs again and require it to resolve.
7. Compare parent entries after both calls, then run one command-level \`--yes\` case with a mocked detector.
8. Restore mocks and remove the temporary root in a guaranteed cleanup hook.

The first call proves recursive deletion. The second proves an already achieved state can be requested again without changing siblings or returning an error.

- Use exact safe names and resolve the expected target before invoking code. A path-input security suite should handle separators, traversal, empty names, and platform-reserved values separately.

- The command fixture can mock \`detectAgents\` to return the local definition while leaving \`uninstallFromAgent\` real. That split proves selection and final state without scanning the developer's home.

- Mock \`sendTelemetry\` at command level so the non-awaited side task cannot affect test completion. Assert its removal action in a separate expectation, but do not turn this idempotency case into a privacy test.

- The QASkills remove missing skill safely workflow should return the same command status for an existing target and an already absent target. Output may differ only if the implementation later exposes whether anything changed.

- Use the [custom directory CI guide](/blog/qaskills-add-custom-directory-ci) for related temporary-root practices. Removal itself currently uses each agent definition rather than the add command's custom directory option.

## agent skill uninstall no op failure and edge-case matrix

- An agent skill uninstall no op should produce a stable final state, but current error swallowing makes final verification important. The matrix separates true absence from errors that merely look successful to the caller.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| qaskills remove idempotent | Missing target under existing base | Promise resolves and target stays absent | Missing path throws | \`packages/cli/src/commands/remove.ts\` |
| remove nonexistent skill folder | Missing base and target | Promise still resolves | Parent required unexpectedly | \`packages/cli/src/lib/installer.ts\` |
| fs rm force true test | Nested target plus sibling | Target removed, sibling preserved | Parent or sibling removed | \`packages/cli/src/lib/installer.ts\` |
| safe repeated skill removal | Same target removed twice | Both calls resolve with one final state | Second call fails | \`packages/cli/src/lib/agent-detector.ts\` |
| qaskills remove exit behavior | Selected absent targets with \`--yes\` | Command reaches normal outro | Nonzero status for absence | \`packages/cli/src/lib/telemetry.ts\` |

One edge case is an empty target directory, which recursive removal should delete just like a populated target. Keep this case small because nested content already proves the stronger scope.

- Another edge case is a symbolic link as the target, whose filesystem behavior deserves a dedicated safety test before making claims about linked directories. Do not infer it from the normal directory fixture.

- A permission rejection is swallowed by the helper. Assert that a mocked rejection resolves, then explicitly verify that the simulated target was not proven absent. This prevents the test report from presenting swallowed errors as successful deletion.

An empty detected-agent array causes the loop to do no removals and still reaches telemetry plus the final outro. That behavior is outside the selected absent-target contract, but a command suite should own it as a separate selection boundary.

The command uses spinner messages per agent, but full terminal snapshots should be avoided because colors and prompt rendering are not the idempotency contract. Assert meaningful final text or status only where needed.

Treat the helper and command as two layers, where the helper owns path and disk state while the command owns agent choice, order, and final status. A fault should point to one layer before the next check runs.

For helper rows, use real disk calls and no prompt mocks, while command rows should mock the prompt and detector but keep one real helper path. This balance gives direct proof without letting the host machine choose targets.

When a spinner is mocked, return the start and stop methods the command calls but do not assert color codes or each frame. A simple final message check is enough to show that absent removal reached normal completion.

- Keep \`process.exitCode\` under test control. Save its prior state, run the command, require no nonzero value from the absent path, and restore it. This avoids a prior failed test changing the meaning of the result.

- The command action can be reached through Commander with an argument list. Pass \`remove\`, the safe fixture name, a fixed agent ID, and \`--yes\`. This gives the parser and action one small end-to-end check.

Do not call \`process.exit\` in the absent path. Cancellation can use that code today, but the selected case skips prompts and should settle through its action promise. A spy can fail at once if exit is called.

The QASkills remove missing skill safely matrix should record target state both before and after command execution. A normal outro does not prove that the correct root was used, so the disk remains the final source.

Use the [skill format guide](/blog/skill-md-format-guide) for artifact structure, not removal semantics. The helper removes the named directory as a unit and does not inspect SKILL.md.

## How should qaskills remove exit behavior run in CI?

- Qaskills remove exit behavior should run as one helper integration suite plus one command orchestration test. The helper suite uses real temporary files, while the command suite replaces prompt, detection, telemetry, and spinner boundaries.

Run the command with \`--yes\` and a fixed selected agent so no interactive confirmation or process exit occurs. Require the action promise to settle and the process exit code to remain unchanged.

The QASkills remove missing skill safely gate should execute on each supported Node platform. Node path and filesystem details vary, but recursive force semantics and final state should remain consistent.

Keep tests away from actual home directories. Even a clearly named fixture could collide with a real installed skill, and cleanup after failure might remove user data.

Use one temporary root per test or worker. Shared roots can make repeated removal appear successful because another case deleted the target first.

Make the temp root before the command module loads if the detector mock needs it, which keeps all paths fixed when the action starts and avoids a race with async setup. The disk tree should be ready before parsing arguments.

Do not grant broad file rights to make a test pass because the normal absent and existing rows should use the rights a newly made temp folder gets. A permission-fault row can use a mock and remain clear on each system.

Run disk rows in serial only when they share module or process state, since separate roots allow normal parallel work but command prompt and exit spies may still need one isolated group. Choose the rule based on shared state, not habit.

The first CI failure should show expected and actual parent entries because this small list can reveal a left target, a lost sibling, or a wrong root at once. There is no need to upload the whole temp tree.

Keep test data free of real skill text because a few plain files such as \`note.txt\` and \`nested/check.txt\` prove recursive behavior. SKILL.md parsing is not part of this command path.

The QASkills remove missing skill safely check should not wait for telemetry, so mock the exported send call, require the remove action once, and let its own suite test network behavior. This keeps command time tied to disk work.

Use one built CLI smoke row after unit tests pass, and run it with a known local agent target or a safe test seam and \`--yes\` before checking status and disk. Never rely on what a hosted runner happens to detect.

The [QASkills agents page](/agents) describes supported targets for people. CI target definitions should remain local objects whose paths sit under the test root.

Mock network telemetry and do not await an event as part of command success. The source at \`packages/cli/src/lib/telemetry.ts\` intentionally starts a non-blocking call, which is a separate contract.

- The [Commander repository](https://github.com/tj/commander.js) documents the command framework used here. Test QASkills action behavior through the configured command without asserting framework internals.

On failure, print the test target, parent entries, selected agent ID, and whether each command call settled. Avoid printing the real home path or broad directory listings.

Run package type checking before tests and one built CLI smoke case afterward. The built case should point to an isolated fixture and never select a real detected agent.

- The [categories page](/categories) can help choose another manual skill after release. CI should retain local fixture names and remain independent of catalog availability.

## Implementation checklist for QASkills remove missing skill safely

- The implementation checklist verifies absent-target idempotency without hiding the helper's broad catch. Every item should either inspect the final filesystem or capture one command-level effect.

- Construct a temporary \`AgentDefinition\` with an absolute local skills directory.
- Cover an absent target under both existing and missing parent directories.
- Create a nested target and sibling, then prove removal scope precisely.
- Call the helper twice with identical arguments and require both promises to resolve.
- Spy once on \`fs.rm\` to require recursive and force options.
- Simulate an I/O rejection and record that current code swallows it without proving deletion.
- Mock detection to return only controlled temporary definitions in command tests.
- Use \`--yes\` so prompts and cancellation remain outside this contract.
- Mock non-blocking telemetry and assert command completion separately.
- Restore every mock and remove all temporary directories after each case.

- These checks prove QASkills remove missing skill safely for the intended absent target while exposing the difference between no-op success and an unverified I/O failure. They also prevent accidental deletion of siblings from passing unnoticed.

Read a failed result in this order: selected agent, base path, target path, helper result, target state, and sibling state. This follows the command from choice to disk and helps find the first wrong fact.

Keep one assertion for each fact instead of one large object snapshot. A path diff, a missing sibling, and an exit fault need different fixes. Small checks also survive harmless changes to terminal text.

- If the helper later returns a bool, decide what true and false mean before changing tests. It could mean target existed, target changed, or final absence was seen. A clear type and name should state the new rule.

- If the helper later stops catching all faults, add an explicit missing-code check. Node can identify an absent path, while a permission or device error should reach the caller. That change would give the command a more honest result.

The QASkills remove missing skill safely suite should keep its absent row even after error handling improves. Missing state is a normal request, and a user should still be able to apply removal twice without a fault.

End each row with cleanup that removes the whole test root by its exact saved path. Never build the cleanup path from a value returned by the command. Test setup should remain the sole owner of what gets deleted.

Review the [agents page](/agents) for supported target definitions and the [blog index](/blog) for connected command guidance. Neither route should influence the filesystem fixture.

Update this checklist if the helper begins returning a removal result, distinguishing error codes, or validating names. A richer result should produce stronger command messages and more precise tests.

## Frequently Asked Questions

### What does qaskills remove idempotent verify in QASkills?

It verifies that applying removal more than once produces the same absent final state without an error. Build the case with a real temporary target and sibling, remove twice, and require the sibling to survive. This proves both repeatability and correct deletion scope.

### When should a team test remove nonexistent skill folder?

Run the test when installer paths, agent definitions, remove command options, filesystem calls, Node versions, or error handling changes. Keep it in normal CLI CI because a small refactor from force removal to an unchecked existence call can break absent-target behavior.

### How can a fixture isolate fs rm force true test?

Create a unique temporary skills root and a local agent definition pointing there. Use real files for absence and recursive scope, then one restored spy for exact options. Never direct the test at a developer home or a runner's installed agent folders.

### Which assertion proves safe repeated skill removal?

Require both helper calls to resolve, the target to remain absent after each call, and a sibling file to retain identical content. Promise resolution alone is insufficient because current code catches every removal error, including failures that may leave the target present.

### What failure cases belong in agent skill uninstall no op tests?

Cover a missing parent, missing target, empty target, nested target, repeated call, preserved sibling, and simulated permission rejection. Keep symbolic links, unsafe names, unknown agents, cancellation, and telemetry opt-out in focused suites with their own safety boundaries and clear owners.

### How should CI run qaskills remove exit behavior checks?

Use \`--yes\`, a mocked detector returning temporary agents, real local filesystem state, and mocked telemetry. Require unchanged process status and normal completion for absence. Restore command mocks and delete roots in cleanup, even when a state assertion or command promise fails.

## Conclusion

- QASkills remove missing skill safely by combining recursive force removal with a caught rejection, so an already absent target behaves as a successful no-op. Strong tests verify final absence, repeated calls, preserved siblings, command completion, and the limitation created by broad error swallowing.

Use the [getting started guide](/getting-started) to run the command, review supported targets on [QASkills agents](/agents), then compare its behavior with the current [skills catalog](/skills). Keep automated removal pointed only at temporary fixtures.`,
};
