import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills unknown agent error testing',
  description:
    'QASkills unknown agent error testing: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills unknown agent error testing',
  keywords: [
    'QASkills unknown agent error testing',
    'qaskills unknown agent',
    'invalid agent cli error',
    'unsupported agent install test',
    'unsupported agent remove test',
    'agent option validation',
    'list supported qaskills agents',
  ],
  relatedSlugs: [
    'how-to-install-skills-claude-code',
    'how-to-install-skills-cursor',
    'skill-md-format-guide',
    'ai-qa-skills-directory-2026',
  ],
  sources: [
    'https://github.com/tj/commander.js',
    'https://github.com/bombshell-dev/clack',
    'https://vitest.dev/guide/mocking.html',
  ],
  repoEvidence: [
    'packages/cli/src/commands/add.ts#addCommand',
    'packages/cli/src/commands/remove.ts#removeCommand',
    'packages/cli/src/lib/agent-detector.ts#getAllAgents',
    'packages/shared/src/constants/agents.ts#AGENTS',
  ],
  content: `QASkills unknown agent error testing should prove that add and remove reject a name outside the found and known agent lists. Both commands must print the unknown-agent text and list hint, then stop before they fetch, install, delete, ask for consent, or send telemetry. Current code leaves the process status unchanged.

That last detail matters because tests must state what the code does, not what we may want. The add path is in \`packages/cli/src/commands/add.ts#addCommand\`, the remove path is in \`packages/cli/src/commands/remove.ts#removeCommand\`, and known agents come from \`packages/cli/src/lib/agent-detector.ts#getAllAgents\` plus \`packages/shared/src/constants/agents.ts#AGENTS\`.

## What does QASkills unknown agent error testing guarantee?

QASkills unknown agent error testing guarantees that a name not in either agent list cannot reach skill work. Both commands compare the option with found and known agents by ID or exact name, then log an error, show a list hint, and return when no match exists.

The add command scans agents before it checks the option, with a spinner around the scan and \`options.agent\` checked next. The unknown branch occurs before skill resolve, fetch, install, and telemetry.

The remove command also scans first, but its unknown branch comes before consent, spinner work, file delete, and remove telemetry. This split helps a test place mocks and expected calls in the right spots.

The current text is \`Agent "<value>" is not a known agent.\` with the hint \`Run \\\`qaskills list --agents\\\` to see supported agents\`. Check key words without a full style snapshot, since prompt color and line art can change while the message stays correct.

QASkills uses [Commander](https://github.com/tj/commander.js) to define the option and dispatch actions. Commander accepts the option value as a string; repository code owns semantic validation against agent definitions.

The [supported agents page](/agents) is the user-facing source for valid targets. QASkills unknown agent error testing should use a deliberately impossible fixture name, not a real agent that happens to be absent from one developer machine.

The early return leaves \`process.exitCode\` unchanged, so a child test should pair that zero status with error text and no-op checks. If the product later chooses nonzero status, source and tests should change in the same pull request.

## How does qaskills unknown agent work?

The qaskills unknown agent path first searches found agents by \`definition.id === options.agent\` or \`definition.name === options.agent\`. The match is exact and case-sensitive because the code does not change the text.

If no found agent matches, add and remove call \`getAllAgents()\`, then build a target for a known agent with its path, \`exists: false\`, and scope. This is a supported target, not an unknown target.

The core add branch in \`packages/cli/src/commands/add.ts#addCommand\` is:

\`\`\`typescript
if (options.agent) {
  selectedAgents = detected.filter(
    (a) => a.definition.id === options.agent || a.definition.name === options.agent,
  );
  if (selectedAgents.length === 0) {
    const allAgents = getAllAgents();
    const knownAgent = allAgents.find(
      (a) => a.id === options.agent || a.name === options.agent,
    );
    if (knownAgent) {
      selectedAgents = [
        {
          definition: knownAgent,
          skillsDir: knownAgent.skillsDir.startsWith('~')
            ? knownAgent.skillsDir.replace('~', os.homedir())
            : path.resolve(process.cwd(), knownAgent.skillsDir),
          exists: false,
          scope: knownAgent.configDir.startsWith('~') ? 'global' : 'project',
        },
      ];
    } else {
      p.log.error(\`Agent "\${options.agent}" is not a known agent.\`);
      p.outro(pc.dim('Run \`qaskills list --agents\` to see supported agents'));
      return;
    }
  }
}
\`\`\`

The exact name path allows a display name, while the stable ID is better for scripts. A lowercase ID such as \`claude-code\` should match its definition. A differently cased value should not match unless a definition uses that exact case.

The detector always adds the universal target to detected output, even when no agent-specific config exists. Therefore, \`--agent universal\` can match the detected list. The known-agent fallback returns the shared \`AGENTS\` array copy, while universal is supplied separately by detection.

Use [skills for AI agents](/skills-for) to review target-specific collections. The unsupported path should never guess a similar identifier or silently choose universal, because that could write files to an unintended location.

## Which cases define invalid agent cli error?

Invalid agent cli error coverage needs an unknown ID, unknown display name, casing mismatch, empty-option boundary, known but undetected target, detected target, and repeated invocation. These cases separate option parsing from semantic lookup.

Use a fixture such as \`definitely-not-a-qaskills-agent\` for the main negative case. Check the quoted value and list hint, then check that resolve, fetch, install, delete, consent, and telemetry calls stay untouched.

A casing fixture records exact comparison. If \`claude-code\` is valid, \`CLAUDE-CODE\` should currently be unknown. This is not a recommendation about user experience; it is a source-backed boundary that prevents a test from assuming normalization.

An empty value is normally rejected by command-line parsing because \`--agent <agent>\` requires a value. That failure belongs to Commander parsing, not the command action's unknown branch. Test it through the built CLI and keep its assertions separate.

A known but undetected agent must not trigger the unknown message. Mock detection without that agent, leave it in \`getAllAgents\`, and assert the command proceeds toward source resolution for add or removal for remove. Stop the test with controlled downstream mocks.

A detected target should bypass \`getAllAgents\` entirely. This call-count assertion protects lookup ordering and keeps the normal path efficient. It also confirms that an absent local config is not the definition of unknown.

Repeat the unknown case after a successful known case. Results should not depend on prior selected agents or prompt state. QASkills unknown agent error testing should catch module-scoped or mock leakage before CI does.

The [Vitest mocking guide](https://vitest.dev/guide/mocking.html) explains restoration and module mocks. Reset every command dependency because these Commander objects are created when modules load.

## unsupported agent install test and the current QASkills contract

An unsupported agent install test must prove absence of side effects, not only presence of text. The add action has several operations after validation, so each should be a failing spy if called unexpectedly.

Mock \`detectAgents\` to return one controlled universal or fixture target. Mock \`getAllAgents\` to return known definitions that exclude the unknown value. Then execute \`addCommand\` with a fake skill and explicit unknown agent.

The command should start and stop detection output, call both lookup functions, log the diagnostic, call the outro hint, and return. \`resolveSkill\`, \`downloadSkill\`, \`installToAgent\`, and \`sendTelemetry\` should have zero calls.

Because \`addCommand\` catches errors only inside its main try block, a mock that throws during a forbidden call could be converted into the generic install failure path. Prefer zero-call assertions after normal return, and make forbidden mocks reject only as a secondary guard.

\`\`\`typescript
test('returns before resolving an unknown agent install', async () => {
  detectAgents.mockReturnValue([universalDetected]);
  getAllAgents.mockReturnValue([claudeDefinition, cursorDefinition]);

  await addCommand.parseAsync(
    ['node', 'qaskills', 'fixture-skill', '--agent', 'not-real'],
    { from: 'node' },
  );

  expect(promptLogError).toHaveBeenCalledWith(
    'Agent "not-real" is not a known agent.',
  );
  expect(promptOutro).toHaveBeenCalledWith(
    expect.stringContaining('qaskills list --agents'),
  );
  expect(resolveSkill).not.toHaveBeenCalled();
  expect(downloadSkill).not.toHaveBeenCalled();
  expect(installToAgent).not.toHaveBeenCalled();
  expect(sendTelemetry).not.toHaveBeenCalled();
});
\`\`\`

The exact test setup depends on existing module mock conventions, because imported bindings and command instances are initialized at module load. Keep the behavioral assertions even if the harness uses a child process instead.

A child-process version can point \`--dir\` at a temporary sentinel and assert the directory remains absent. It cannot directly spy on telemetry, but it gives confidence that real command parsing reaches the same branch.

The [Claude Code install guide](/blog/how-to-install-skills-claude-code) covers a valid target flow. Keep unsupported-agent checks separate so a broken catalog request cannot hide validation behavior.

## How do you test unsupported agent remove test?

An unsupported agent remove test should prove that no consent prompt appears and no skill folder is touched. The unknown branch returns before both actions, which makes this a clean no-op contract.

Use this numbered procedure:

1. Create an isolated command fixture with controlled detected and known agents.
2. Pass one skill name and an agent value absent from both lookup sets.
3. Capture the error and outro calls while recording process exit state.
4. Assert confirmation, uninstall, telemetry, and filesystem spies have zero calls.
5. Restore command mocks and repeat the case through a built CLI smoke test.

- The remove branch in \`packages/cli/src/commands/remove.ts#removeCommand\` has the same lookup shape but a different downstream path:

\`\`\`typescript
if (targetAgents.length === 0) {
  const allAgents = getAllAgents();
  const knownAgent = allAgents.find(
    (a) => a.id === options.agent || a.name === options.agent,
  );
  if (knownAgent) {
    targetAgents = [{
      definition: knownAgent,
      skillsDir: resolvedSkillsDir,
      exists: false,
      scope: knownAgent.configDir.startsWith('~') ? 'global' : 'project',
    }];
  } else {
    p.log.error(\`Agent "\${options.agent}" is not a known agent.\`);
    p.outro(pc.dim('Run \`qaskills list --agents\` to see supported agents'));
    return;
  }
}
\`\`\`

Place a sentinel skill directory under a disposable base only when the test can redirect the agent path safely. The unknown value has no definition and therefore no legitimate target path. A no-call assertion on \`uninstallFromAgent\` is usually clearer than broad file monitoring.

Assert that \`p.confirm\` is not called even when \`--yes\` is absent. This proves branch order. When a known agent reaches removal, consent becomes a separate test.

QASkills unknown agent error testing should compare add and remove messages because users expect the same correction. It should not force every surrounding intro or spinner line to match.

Read the [Cursor install guide](/blog/how-to-install-skills-cursor) for another valid-target workflow. Unknown-agent removal remains a semantic option test, not an installation tutorial.

### Use one clear no-op proof

Pick one fake agent name that cannot match a real ID or display name, and check that fact before the command runs. If the name does match one day, fail the setup with a clear note. This keeps a new agent launch from turning the negative case into a valid path.

Place a spy at the first side effect after lookup, with add watching resolve and install while remove watches confirm and delete. Zero calls at each seam show that the return happened where the source says it should. This gives one plain no-op rule for each command.

Do not force a later function to throw, since that can hide a call that should never occur. Let the command return in the normal unknown path, then inspect all call counts. A clean return with no side effect is the fact this case must prove.

Keep the error text free from style codes, and match the fake value, "not a known agent," and the list command hint. The prompt tool may wrap or color text in a real shell. Those style changes should not weaken the core message or break a unit check.

Use the [QASkills agent guide](/agents) for known positive IDs, while the fake negative value comes from test code rather than host setup. Host setup says whether an agent is found, but the shared list says whether it is known. This split keeps the case stable on each runner.

### Treat add and remove as two owners

Keep add and remove in separate cases because one guards download and install while the other guards confirm and delete. A shared data table can feed both, but each case needs its own no-call list. This makes a one-sided code change easy to catch.

Run the known-but-not-found case next to the unknown case to prove the fallback list works and the mock did not reject all names. Stop the valid flow with safe mocks before a real file path is used. The positive control gives weight to the negative result.

For remove, check that consent has no calls, and for add, check that no skill source is resolved. These are the first user-visible or work steps after target choice. If either starts, the unknown branch no longer owns a true no-op.

Save and reset \`process.exitCode\` around each case because this branch does not set it while another test may leave it at one. A stale value can make a child-style check report the wrong rule. State the expected value in the case name and cleanup.

Use the [QASkills getting started page](/getting-started) for a full valid flow, but do not place a real install in this no-op test file. The no-op suite should stay quick, local, and safe to run with any home folder.

## agent option validation failure and edge-case matrix

Agent option validation should preserve the distinction between detected, known, and unknown. The matrix makes those categories explicit and identifies the first forbidden side effect for each negative branch.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| Detected ID | ID in detected definitions | Command uses detected target | Known lookup or rejection | \`packages/cli/src/commands/add.ts#addCommand\` |
| Known undetected ID | ID only in shared definitions | Command synthesizes target | Unknown message appears | \`packages/cli/src/lib/agent-detector.ts#getAllAgents\` |
| Unknown ID | Value absent from both sets | Error, hint, and early return | Install or removal begins | \`packages/cli/src/commands/remove.ts#removeCommand\` |
| Casing mismatch | Different case from valid ID | Current exact lookup rejects | Silent normalization occurs | \`packages/shared/src/constants/agents.ts#AGENTS\` |
| Missing option value | \`--agent\` without text | Commander parse failure | Action runs with guessed target | \`packages/cli/src/commands/add.ts#addCommand\` |

The shared \`AGENTS\` constant is the definition source for named integrations. The function \`getAllAgents\` returns a shallow array copy, so callers cannot reorder the exported array by sorting the result. Tests can use that return to build valid IDs without copying the whole list.

Do not hard-code the exact number of agents in unknown-path tests. New supported tools should not break a negative fixture unless its impossible name becomes valid. Assert that every returned ID differs from the fixture instead.

Use a value that cannot collide with a future brand, such as a test-specific prefix plus random suffix. If output must be deterministic, use a long reserved fixture and verify it against \`getAllAgents\` during setup.

The prompt library comes from [Clack](https://github.com/bombshell-dev/clack). Mock its log, outro, confirm, spinner, and cancellation boundaries, but avoid testing library rendering details that QASkills does not own.

## How should list supported qaskills agents run in CI?

List supported qaskills agents checks should connect diagnostics with a real recovery command. After the unknown case prints its hint, invoke \`qaskills list --agents\` in a separate smoke step and assert nonempty output plus at least one stable ID.

Keep the smoke step local. Listing agent definitions should not require registry data or credentials. If the list command later reads local detection state, control the working directory and home environment so results remain understandable.

QASkills unknown agent error testing belongs in CLI unit tests and built command smoke tests. Unit tests prove no calls and exact branching. The built smoke test proves Commander accepts the option, Clack prints the hint, and process status matches current behavior.

Record the current zero status explicitly. A shell test that expects failure with \`runExpectFail\` would incorrectly report the unknown branch as success behavior. Capture stdout and stderr from a normal invocation, then assert status, diagnostic, and destination absence together.

Avoid using \`--yes\` to mask prompts in the unknown test because the option check returns before consent. Add it only as a boundary to prove the result remains unchanged.

The [QASkills FAQ](/faq) is a stable support destination, while \`qaskills list --agents\` is the immediate terminal recovery. Tests should verify the command hint, and content can link users to both resources.

Run these cases on every CLI change involving options, detection, shared agent constants, add, remove, or prompt dependencies. Clean global exit codes and command state after each test so one early return cannot affect later command assertions.

### Make the build log tell the truth

Capture both output streams because prompt tools may choose either one, then join them only for text checks while retaining each raw stream. This gives a stable match and enough detail when prompt output moves. Do not rely on terminal color support.

Record the child status and pair its current zero value with error text plus a clean target path, so zero cannot imply a good match. If product policy changes to status one, update all three facts together. The test should make that shift clear.

Set a short time limit because an unknown target should never reach a prompt and a hang may mean the branch waited for input. Kill the child, show the fake agent value, and leave all real agent paths out of the log. Then clean the temp root in a final block.

Run the same check with and without \`--yes\`. Both should stop at the unknown lookup, since the flag affects later choice or consent steps. This pair guards a future move of the branch. It also proves that a noninteractive flag cannot turn an unknown name into a valid target.

The [AI QA directory guide](/blog/ai-qa-skills-directory-2026) explains why agent choice matters to skill delivery. The CLI gate has a smaller job: reject a name it cannot map. Keep that narrow rule in the test title, mocks, and failure text.

Check \`list --agents\` only after the unknown command ends. The hint must name a real recovery command, but its full output has a different owner. A separate call lets either step fail with a clear cause. This keeps the option gate easy to scan in CI.

## Implementation checklist for QASkills unknown agent error testing

Use this checklist during review:

- Choose an agent fixture absent from detected and known definitions.
- Assert ID and exact-name matching as separate supported cases.
- Add a casing mismatch because current comparison is exact.
- Capture the unknown message and list-agents recovery hint.
- Assert add never resolves, downloads, installs, or sends telemetry.
- Assert remove never confirms, uninstalls, or sends telemetry.
- Record the unchanged process exit code as current behavior.
- Test a known but undetected definition to protect fallback.
- Invoke the built list command as a separate recovery smoke check.
- Restore mocks, process state, temporary paths, and command instances.
- Pair the current zero child status with the unknown text, list hint, and clean target path so no reviewer can mistake a no-op return for a valid agent match

The checklist prevents a common false positive: a test sees the error text but misses an installation that still runs afterward. QASkills unknown agent error testing passes only when output and no-op behavior agree.

Use the [SKILL.md guide](/blog/skill-md-format-guide) for package validation after a target is accepted. Agent option validation should finish before any package content becomes relevant.

## Frequently Asked Questions

### What does qaskills unknown agent verify in QASkills?

It verifies that an explicit agent ID or name absent from detected and known definitions produces a clear diagnostic and recovery hint. The command must return before package resolution, installation, removal, confirmation, or telemetry. Current source leaves the process exit code unchanged on this branch.

### When should a team test invalid agent cli error?

Run it whenever add or remove options, agent detection, shared definitions, prompt output, or command parsing changes. Keep unit no-call assertions on every pull request and a built CLI output check before release. This branch is local and needs no registry service.

### How can a fixture isolate unsupported agent install test?

Mock detected and known agent lists with small explicit definitions, then choose a value absent from both. Capture prompt calls and make downstream install functions observable. Restore all module mocks afterward, or run a child process with a disposable destination and assert no files appear.

### Which assertion proves unsupported agent remove test?

Assert the quoted unknown value and list-agents hint, then verify confirmation, uninstallation, and telemetry have zero calls. A disposable sentinel directory may provide extra proof, but the no-call assertion maps directly to the branch before any target path is created.

### What failure cases belong in agent option validation tests?

Cover unknown ID, unknown name, casing mismatch, missing option value, detected ID, known but undetected ID, universal target, and repeated invocation. Separate Commander parse failures from semantic lookup failures. Also verify that future agent-list growth cannot accidentally collide with the negative fixture.

### How should CI run list supported qaskills agents checks?

Run the unknown add and remove tests first, then execute the built \`list --agents\` command as a separate recovery smoke case. Capture streams and status, avoid registry calls, and reset process state. The list output should be nonempty and include a stable supported identifier.

## Conclusion

QASkills unknown agent error testing proves both guidance and restraint: users receive the unsupported-value message, and no skill operation starts. The next regression check should compare unknown, known-undetected, and detected identifiers in one controlled suite, while explicitly recording the current early-return exit status.

Review [supported agent targets](/agents), then choose a QA package from the [skills directory](/skills) and test the documented detection case. Use [getting started](/getting-started) for the valid installation path after option validation passes.`,
};
