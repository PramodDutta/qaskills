import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP install directory precedence tests',
  description:
    'MCP install directory precedence tests with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP install directory precedence tests',
  keywords: [
    'MCP install directory precedence tests',
    'Claude skills directory precedence',
    'agents skills fallback test',
    'MCP default install path',
    'project agent directory detection',
    'install_skill path matrix',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'qaskills-add-custom-directory-ci',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://nodejs.org/api/fs.html',
    'https://nodejs.org/api/path.html',
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'packages/shared/src/constants/agents.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP install directory precedence tests should run \`install_skill\` inside isolated projects and capture its final \`writeFile\` path. With no explicit target, an existing \`.claude\` entry must select \`.claude/skills\`; otherwise \`.agents/skills\` must win. Any other path, unstable repeat choice, or write outside the fixture disproves the rule.

## What must MCP install directory precedence tests prove?

MCP install directory precedence tests must show the exact project-local path chosen when \`targetDir\` is absent. They prove \`.claude/skills/<slug>/SKILL.md\` wins when \`.claude\` exists, while every other ordinary project state falls back to \`.agents/skills/<slug>/SKILL.md\`.

The oracle is the resolved argument passed to \`writeFile\`, not merely a success sentence. A misleading message or preexisting file could make a weak existence check pass after the wrong branch ran.

Three inputs control this narrow decision: current working directory, optional target directory, and existence of the \`.claude\` entry. Downloaded content and agent name should stay fixed while the directory matrix changes.

An explicit target is a separate override case. When callers provide one, neither implicit branch should influence the destination, even if both project agent directories already exist.

The tests also need operation order. Content retrieval must finish before directory creation and writing, so a failed download cannot leave an implicit target behind.

MCP install directory precedence tests do not define how every supported agent stores every instruction file. The [agents directory](/agents) documents the wider product catalog, while this suite protects one MCP installer branch.

A pass record should include fixture root, initial entries, supplied target, chosen path, written bytes hash, returned text, and unexpected calls. Use relative display paths in reports so CI roots do not create noisy diffs.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) describes invocation and tool results, but it does not choose QASkills project folders. That product-specific choice comes from repository code and therefore needs repository-owned tests.

## Which repository behavior defines the contract?

The function \`installSkill\` in \`packages/mcp/src/index.ts\` downloads skill text first. It then reads \`process.cwd()\` and uses the supplied \`targetDir\` when that argument is defined.

Without that argument, the function checks \`existsSync(path.join(cwd, '.claude'))\`. A true check builds \`.claude/skills\`, and a false check builds \`.agents/skills\`.

The code appends the slug, resolves the result against the current directory, and then appends \`SKILL.md\`. It creates the skill folder recursively before writing the downloaded text as UTF-8.

This is precedence, not broad agent discovery. The function does not scan every agent entry or choose a target from the \`agent\` argument.

The \`agent\` value is used later for install telemetry. Holding it constant lets the path test reject any accidental future coupling between telemetry labels and destination choice.

The [Node file system documentation](https://nodejs.org/api/fs.html) defines the existence check and promise-based write operations at these boundaries. Test doubles should preserve their return and error styles closely enough to expose ordering mistakes.

The [Node path documentation](https://nodejs.org/api/path.html) explains how \`join\` and \`resolve\` produce platform-specific absolute paths. Compare normalized path segments or native resolved values rather than hard-coding POSIX separators on every runner.

The broader definitions in \`packages/shared/src/constants/agents.ts\` list configuration and skill locations for many agents. They also define a universal \`.agents/skills\` target, but the MCP installer remains standalone and does not import that array.

That separation matters during triage. A changed shared constant does not automatically change MCP behavior, while a product decision may require coordinated edits and independent regression updates.

Package identity and the pinned runtime dependency live in \`packages/mcp/package.json\`. Include the package version in a packaged smoke report when source and distributed behavior differ.

MCP install directory precedence tests should therefore observe the function rather than duplicate it in a test helper. Reimplementing the same ternary in test code can make both copies agree while the actual handler takes another route.

The [QASkills MCP guide](/blog/qaskills-mcp-server-guide) explains installation for users. Contract tests should stay below that documentation layer and verify the write path itself.

## How should QA teams test Claude skills directory precedence?

Claude skills directory precedence requires a temporary project containing an empty \`.claude\` directory. Run the captured \`install_skill\` handler with no \`targetDir\` and a fixed valid slug.

Mock the content GET with a small reviewed \`SKILL.md\` body. Disable telemetry or capture it separately, because a remote POST is not part of destination selection.

Change the process working directory to the fixture only for the duration of the case. Restore it in \`finally\`, since a failed assertion otherwise contaminates every later path observation.

The main expected path ends with \`.claude/skills/<slug>/SKILL.md\`. Assert the exact native absolute value against the \`writeFile\` spy and verify \`mkdir\` received its parent with recursive creation enabled.

Also assert the fallback path was never touched. A final file check alone might pass if a buggy implementation wrote both destinations and returned the Claude path.

Seed both \`.claude\` and \`.agents\` for the precedence boundary. The selected file must still land under \`.claude\`, while a guard file beneath \`.agents\` remains byte-for-byte unchanged.

Run a repeated install with identical content. Both calls should resolve to the same path, and the second call should not create a second nested slug or change neighboring files.

Use one case where \`.claude\` is a plain file rather than a directory. The existence check chooses the Claude branch, after which recursive directory creation should fail rather than silently fall back.

That malformed-entry result documents current behavior without presenting it as ideal. The returned tool result should be an error, and the test should prove no file appeared under \`.agents\`.

MCP install directory precedence tests need an absence oracle around the explicit target too. With \`targetDir: 'custom/qa'\`, no existence check result should redirect the write beneath either default root.

The [custom directory CI guide](/blog/qaskills-add-custom-directory-ci) covers caller-controlled destinations in a broader workflow. This article keeps its main focus on the MCP implicit branch and treats override behavior as a guard.

## Test matrix for agents skills fallback test

An agents skills fallback test starts from a project with no \`.claude\` entry. The implementation does not require \`.agents\` to exist, because recursive creation builds the needed destination after content arrives.

Give each row a fresh root and the same downloaded bytes. This design makes the initial tree the only changed variable and keeps the path decision easy to diagnose.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Claude skills directory precedence | Only \`.claude\` exists | Write ends at \`.claude/skills/<slug>/SKILL.md\` | Any write under \`.agents\` | \`packages/mcp/src/index.ts\` |
| Both defaults exist | \`.claude\` and \`.agents\` directories | Claude path wins and fallback stays unchanged | Two writes or fallback selection | \`packages/mcp/src/index.ts\` |
| Agents skills fallback test | Neither default exists | Recursive creation reaches \`.agents/skills\` | Missing target or Claude creation | \`packages/mcp/src/index.ts\` |
| Existing agents root | Only \`.agents\` exists | Same fallback path receives exact bytes | Extra nested \`.agents\` segment | \`packages/mcp/src/index.ts\` |
| MCP default install path | No target argument in a relative cwd | Absolute write remains beneath fixture root | Host working directory leaks into path | Node path reference |
| Explicit relative target | \`targetDir\` is \`custom/qa\` | Write resolves beneath \`cwd/custom/qa\` | Implicit root overrides the argument | \`packages/mcp/src/index.ts\` |
| Explicit absolute target | Target points inside another temp root | Absolute target remains authoritative | Current directory is prefixed | Node path reference |
| Malformed Claude entry | \`.claude\` is a file | Tool returns an error and does not fall back | Hidden write under \`.agents\` | Node file system reference |
| Repeated default install | Same root, slug, and content twice | Both writes resolve to one exact file | Path gains another slug or skills segment | \`packages/mcp/src/index.ts\` |
| Project agent directory detection | Shared metadata reviewed beside MCP rule | Differences are reported, not assumed synchronized | Test imports constants as live MCP logic | \`packages/shared/src/constants/agents.ts\` |

The missing-directory row is the core fallback proof. Creating \`.agents\` during fixture setup would skip verification that recursive creation works from an empty project.

The absolute-target row should remain inside a temporary boundary even though it tests an absolute value. Never point a path contract test at a real home directory or checked-out project.

For Windows coverage, compare with \`path.resolve\` and \`path.join\` from the running platform. Report a slash-normalized copy only for human-readable snapshots, not as the write oracle.

MCP install directory precedence tests should fail if an unexpected second file appears anywhere in the root. Counting only the expected path cannot reveal duplicate writes.

Make the start tree small and plain. One guard file in each root is enough to show which side was used and which side stayed still.

Name each root for its case, such as \`both\`, \`none\`, or \`claude-file\`. Clear names make a failed path easy to read with no need for a long trace.

Hash the skill text once before the run and once at the write spy. If the two hashes differ, the path row should fail even when the folder is right.

For the no-root case, save the tree before the call. The only new path after a pass should be the agents skill folder and its one file.

For the both-root case, put a guard file in each root first. A pass changes only the new file in the Claude side and leaves both guards the same.

The [agents page](/agents) can help pick clear case names for the report. It should not feed live path data into this test, since that would mix two rules.

Keep the slug and skill text the same in all root rows. When just the start tree can change, a wrong end path points to the branch with no guess work.

Read the whole tree after each pass, not just the file you hope to find. A stray folder on the other side is part of the fault and must show in the row.

For each guard file, save its size and hash before the tool runs. Check both facts at the end, so a same-size text swap cannot pass by chance.

List new paths from short to long in the failed log. The first odd parent often shows where a join or root choice went wrong.

Keep pass and fail rows side by side in the job view. This lets a reviewer see the one changed tree fact and the one path choice it caused.

## What failures expose MCP default install path?

An MCP default install path regression appears as the wrong resolved file, more than one file, a host path leak, unstable repeat output, or an implicit branch overriding an explicit target. Each signal needs a separate assertion.

Force both directory booleans through real temporary entries instead of stubbing \`existsSync\` in every case. Real entries catch assumptions about directories, files, permissions, and process roots that a boolean mock hides.

Use a spy only where the test needs exact call order or simulated failure. Combining a real temporary tree with observed file methods gives stronger evidence than either technique alone.

The first example captures the actual registered handler and checks both precedence outcomes. Harness helpers isolate module startup and fetch while leaving path construction under production control.

\`\`\`typescript
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { expect, it } from 'vitest';

it.each([
  {
    name: 'claude wins',
    entries: ['.claude', '.agents'],
    expected: ['.claude', 'skills', 'api-contracts', 'SKILL.md'],
  },
  {
    name: 'agents fallback',
    entries: [],
    expected: ['.agents', 'skills', 'api-contracts', 'SKILL.md'],
  },
])('selects $name', async ({ entries, expected }) => {
  for (const entry of entries) {
    await mkdir(path.join(testRoot, entry), { recursive: true });
  }
  const install = (await captureRegisteredTools()).get('install_skill')!;

  const result = await inWorkingDirectory(testRoot, () =>
    install.handler({ slug: 'api-contracts', agent: 'codex' }),
  );

  expect(result.isError).toBeUndefined();
  expect(writeFileSpy).toHaveBeenCalledWith(
    path.join(testRoot, ...expected),
    controlledSkillMarkdown,
    'utf8',
  );
  expect(allWrittenPaths()).toEqual([path.join(testRoot, ...expected)]);
});
\`\`\`

Assert the content request before checking the file call. A test should not report a path success when the handler wrote stale or unverified content from another fixture.

Inject a download rejection and verify \`existsSync\`, \`mkdir\`, and \`writeFile\` observations as appropriate. Current source retrieves content before calculating the implicit target, so no local write should occur.

For a directory creation failure, expect the handler to return \`isError: true\` and skip the file write. The fixture tree should show only state created intentionally before the handler ran.

For a write failure, expect the recursively created skill directory may remain because current code does not roll it back. Record that current fact rather than claiming cleanup the implementation does not perform.

The [getting started guide](/getting-started) can provide a manual check after release, but its success text cannot replace exact path assertions. Users often have several agent folders, which makes manual observation less deterministic.

Run one case with a short slug and one with a long but valid slug. Both must add the slug just once and end with the same file name.

Add a guard at the temp root and check its bytes after each run. This catches a broad write that lands above both planned skill roots.

Make the write spy list calls in the order they start. The first path is often enough to show a bad branch, even if the handler then fails.

Do not clean the root until all checks and logs are done. Early clean work can hide the empty folder left by a failed file write.

Use the [custom path guide](/blog/qaskills-add-custom-directory-ci) to keep the override row in scope. The implicit rows still own the main release gate for this suite.

## CI coverage for project agent directory detection

Project agent directory detection should run in a workspace created by the test runner, never the repository root. CI agents may already contain \`.claude\` or \`.agents\` entries from setup.

Build a matrix across Linux, macOS, and Windows when the package officially supports those runners. At minimum, keep native path assertions free from hard-coded separators so another platform can be added without rewriting the contract.

Deny undeclared network calls and supply one controlled content response. Set telemetry off for core path cases, then add one observed-telemetry case to prove its agent label does not alter the destination.

Use a bounded per-case timeout and restore the process directory after each test. A hanging fake fetch or leaked cwd can produce confusing path failures far from the originating case.

Store initial tree, chosen relative path, final tree, content hash, result shape, and call order for failures. Those facts are small enough for a CI artifact and sufficient for ownership.

Release blockers include wrong precedence, writes outside the temporary boundary, duplicate targets, ignored explicit paths, and success after a failed write. A display-only path formatting change need not block when native values and effects still match.

Trigger this suite when \`packages/mcp/src/index.ts\`, \`packages/shared/src/constants/agents.ts\`, \`packages/mcp/package.json\`, or package build settings change. The shared file trigger detects product-policy drift even though MCP does not import it.

Run a source-level contract first and a built stdio smoke case second. The packaged case should install controlled content into a provided temporary target and verify its reported absolute path.

The [MCP overview](/mcp) lists the public integration, while the focused job protects implementation behavior. Keep its command in the package workflow so path checks run without a browser or production API.

MCP install directory precedence tests should print one concise matrix row on failure. Include initial entries, target argument, expected path, actual writes, and package version.

Keep the job root on the same disk as the test process. This avoids mount rules that can change links, modes, or path text for no product reason.

Run cwd-based rows in one worker or in their own child process. Since cwd is shared by the whole process, two such tests must not race.

Set the API fake before the MCP code loads and clear it after the child ends. A late fake can let one real call leave the host by mistake.

The [MCP page](/mcp) is a good place to check the tool name used in job text. The path proof itself must still come from the write call.

## How should install_skill path matrix be asserted?

An install_skill path matrix should assert destination, content, call order, result, and unrelated state for every row. Merely finding \`SKILL.md\` somewhere under the root leaves precedence unproved.

The destination check should use an exact native absolute path. Follow it with a root containment assertion for every implicit or relative target used by the harness.

The content check compares exact controlled bytes and UTF-8 encoding. This prevents a path pass from hiding a response mix-up or altered markdown.

The order check records content GET, directory creation, file write, and optional telemetry. An error case should stop at its failing edge and never claim later success.

The unchanged-state check seeds guard files under both candidate roots. Hash them before and after the call so an accidental cleanup or broad overwrite cannot pass.

This negative example covers explicit target precedence and a malformed \`.claude\` entry. It also checks that the fallback does not become an error recovery path.

\`\`\`typescript
it('honors an explicit target even when both defaults exist', async () => {
  await seedDirectories(testRoot, ['.claude', '.agents', 'custom/qa']);
  const install = (await captureRegisteredTools()).get('install_skill')!;

  await inWorkingDirectory(testRoot, () =>
    install.handler({
      slug: 'api-contracts',
      targetDir: 'custom/qa',
      agent: 'claude-code',
    }),
  );

  expect(allWrittenPaths()).toEqual([
    path.join(testRoot, 'custom', 'qa', 'api-contracts', 'SKILL.md'),
  ]);
  expect(await snapshotGuardFiles(testRoot)).toEqual(initialGuardFiles);
});

it('does not fall back when the selected Claude path is invalid', async () => {
  await seedFile(path.join(testRoot, '.claude'), 'not a directory');
  const result = await invokeInstallWithoutTarget(testRoot);

  expect(result.isError).toBe(true);
  expect(allWrittenPaths()).toEqual([]);
  expect(pathExists(path.join(testRoot, '.agents'))).toBe(false);
});
\`\`\`

Do not infer which branch ran from the returned sentence alone. The success message is built from \`skillPath\`, but a separate write assertion catches divergence between reporting and effect.

Normalize temporary roots only in stored snapshots. The live expectation should still compare the complete absolute destination passed to the file API.

Review shared agent metadata as a policy check, not an execution dependency. If \`packages/shared/src/constants/agents.ts\` and MCP defaults disagree, report the precise values and let owners decide whether synchronization is intended.

MCP install directory precedence tests gain value from clear negative messages. Name the starting tree, selected branch, and first unexpected call rather than printing a broad directory dump.

Use one line per path fact in the failure text. Show start root, set target, chosen root, skill folder, and final file in that order.

Mark each path as given, joined, or resolved. This tells the code owner which step changed the value without a full debug run.

When a path is outside the root, stop the case before any write. The [skills directory](/skills) has no role in a local path fault and should never be touched.

## Step-by-step test implementation

Build the test around a temporary directory matrix, then capture the final \`writeFile\` path. This order protects the real decision branch while keeping network and process effects controlled.

1. Read \`packages/mcp/src/index.ts\` and write down target override, Claude existence check, fallback, resolution, creation, and write order.
2. Create fresh roots for Claude-only, agents-only, both, neither, malformed Claude entry, relative target, and absolute target states.
3. Capture the registered install handler, return fixed skill content, and observe native paths passed to directory and file operations.
4. Execute each normal case and assert one exact path, exact bytes, expected result text, and unchanged guard files.
5. Inject download, directory, and file failures, then verify later effects stop and current partial-state behavior is reported accurately.
6. Run source and packaged checks in CI, retain the failed matrix row, and assign drift to MCP, shared policy, packaging, or environment owners.

Create roots beneath the runner's temporary directory API, not by concatenating a global \`/tmp\` path. Native temporary roots avoid platform assumptions and parallel-worker collisions.

Give each case its own slug when retained artifacts might share a parent. Better still, isolate the parent completely and remove it through test cleanup after all observations are saved.

Use \`process.chdir\` through one helper that always restores the prior value. For parallel tests, run cwd-changing cases serially or use subprocess isolation because cwd belongs to the whole process.

Keep external target fixtures inside a second temporary root. The absolute-target test needs a different base, but it never needs access to real user or repository files.

MCP install directory precedence tests are complete when every matrix row proves both where the write happened and where it did not happen. That two-sided oracle catches precedence regressions early.

Run the clean pass first, then copy its root plan for each bad case. This gives all rows the same base while each fault changes just one fact.

Save a small map of all paths made by the tool. A set makes duplicate writes stand out, while the call log still keeps their true order.

At the end, remove only the roots made by the test. The [blog index](/blog) can hold long run notes, but the CI log should stay brief.

## Failure triage and regression ownership

Start triage with the target argument and initial \`.claude\` state. If either differs from the declared row, fix fixture setup before reviewing path code.

If Claude-only or both-directory cases choose agents, inspect the existence check and current working directory in \`packages/mcp/src/index.ts\`. Log the exact checked path beside the observed write.

If neither-directory fails to create agents, inspect recursive \`mkdir\`, permissions, and test root ownership. Separate an environment denial from a changed fallback branch.

If explicit targets drift, inspect \`path.resolve(cwd, target, slug)\` inputs. The caller owns the supplied target, while MCP owns resolving and appending the managed file path.

If shared metadata differs, route the decision to product owners with values from \`packages/shared/src/constants/agents.ts\`. Do not silently rewrite a path assertion based on metadata that runtime does not consume.

If source passes and packaged execution fails, compare built code, package version, Node version, and launch cwd. That pattern belongs to packaging or release workflow ownership.

If only one operating system fails, inspect native separators, drive roots, permissions, and file-versus-directory behavior. Avoid weakening exact native assertions merely to make a normalized snapshot pass.

The [blog index](/blog) can link related CI and MCP diagnostics, but the issue should carry the single failed matrix row. Concise path evidence speeds review.

Close the defect after both target roots, explicit overrides, repeated calls, and failure ordering pass. Repairing only the most common Claude fixture leaves fallback behavior exposed.

## Frequently Asked Questions

### How do tests prove Claude skills directory precedence?

Create a temporary project with a \`.claude\` directory, omit \`targetDir\`, and invoke the captured install handler with controlled content. Assert one write to \`.claude/skills/<slug>/SKILL.md\`, no write beneath \`.agents\`, exact bytes, and a matching result. Repeat with both roots present to prove precedence.

### What is the correct agents skills fallback test?

Start with no \`.claude\` entry and preferably no \`.agents\` directory. The handler should recursively create \`.agents/skills/<slug>\` and write one \`SKILL.md\` there. Check the native absolute path, exact content, success result, and absence of any new Claude directory or duplicate target.

### Does MCP default install path depend on agent?

Current source does not use the \`agent\` argument to choose the default directory. It checks only an explicit target and the current project's \`.claude\` entry. Keep agent values fixed in core cases, then vary them once to detect accidental coupling while observing telemetry separately.

### Why test project agent directory detection against shared metadata?

Shared agent definitions document wider configuration and skill locations, while the standalone MCP package uses its own branch. A policy check can report disagreement, but it should not pretend MCP imports those constants. Runtime tests must follow the actual installer, and owners should review intentional product differences explicitly.

### What belongs in an install_skill path matrix?

Include Claude-only, agents-only, both, neither, explicit relative target, explicit absolute target, malformed Claude entry, repeated install, and failed download cases. For each row, assert the exact write path, call count, result shape, guard-file state, and absence of writes outside the temporary boundary.

## Conclusion

MCP install directory precedence tests protect a small but visible filesystem promise: explicit targets override defaults, an existing \`.claude\` entry selects Claude skills, and other ordinary projects use the agents fallback. Exact write paths and negative effect checks make that promise measurable.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills in the [skills directory](/skills). Apply this path matrix before the next MCP release, and consult the [MCP server guide](/blog/qaskills-mcp-server-guide) when validating the user-facing setup.`,
};
