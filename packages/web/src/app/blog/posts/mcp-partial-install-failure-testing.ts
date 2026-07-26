import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP partial install failure testing',
  description:
    'MCP partial install failure testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP partial install failure testing',
  keywords: [
    'MCP partial install failure testing',
    'atomic SKILL.md installation',
    'truncated skill file test',
    'orphan install directory',
    'MCP write crash recovery',
    'download before write failure',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-server-testing-guide-2026',
    'mcp-server-contract-testing-guide',
    'mcp-inspector-tutorial-2026',
  ],
  sources: [
    'https://nodejs.org/api/fs.html',
    'https://nodejs.org/api/path.html',
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  content: `MCP partial install failure testing must expose the exact disk state left after faults in download, folder creation, direct writing, and the event call. Success yields one complete SKILL.md and true success text. An empty folder, short file, stale prior file, false success result, or bad file after an event fault disproves the install contract.

## What must MCP partial install failure testing prove?

MCP partial install failure testing must prove what exists before, during, and after each install stage. The check needs file bytes, folder entries, returned tool text, caught HTTP calls, and the exact fault point.

The core question asks how tests find empty folders, short writes, or stale text after a stop. Answer it with sealed disk shots, not just a rejected promise.

The code in \`packages/mcp/src/index.ts\` gets text first, picks a target, makes the skill folder, writes \`SKILL.md\`, and sends an event. This order is the seen repo contract for the current package.

The same file calls Node \`writeFile\` on the final path. It does not write a short-term file and rename it, so tests must not claim a swap is atomic.

Package name, version, build command, and Node floor appear in \`packages/mcp/package.json\`. Save them with failed runs because disk rules and built output can vary by runtime.

The [Node file system docs](https://nodejs.org/api/fs.html) define the promise calls used by the install code. The [Node path docs](https://nodejs.org/api/path.html) show how \`resolve\` and \`join\` build the tested path.

MCP tool results use the shape in the [MCP tools spec](https://modelcontextprotocol.io/specification/2025-11-25/server/tools). The disk check stays tied to this repo, while the text and error flag must still form sound tool output.

Split known facts from the stronger goal. A download fault comes before \`mkdir\`, while a write fault comes after folder creation and may leave that folder behind.

A completed direct write should contain every expected byte. An interrupted direct write can create or alter the final path, which is why a crash test must inspect content rather than trust existence.

The event starts only after \`writeFile\` ends. Its rejection is caught in \`trackInstall\`, so an event fault should not change the full file or install text.

Use the [MCP server testing guide](/blog/mcp-server-testing-guide-2026) for broad child setup. This article owns stage-based disk waste and proof that a retry is safe.

MCP partial install failure testing passes when each stage has one explicit disk-state expectation. It fails when any residue could make an agent load incomplete or outdated instructions as a current installation.

## Which repository behavior defines the contract?

The live order begins with \`getText\` in \`packages/mcp/src/index.ts\`. No target path is made until the text route returns a sound body.

After download, the function reads \`process.cwd()\` and picks the given \`targetDir\` or a known agent path. It uses \`.claude/skills\` when \`.claude\` exists and \`.agents/skills\` when it does not.

\`path.resolve(cwd, target, slug)\` builds the skill folder path, and \`path.join\` adds \`SKILL.md\`. Tests should use the same path calls instead of fixed slash marks.

\`mkdir(skillDir, { recursive: true })\` runs next. A prior fault should leave no new skill folder, while a fault here may show a bad parent or mode.

\`writeFile(skillPath, content, 'utf8')\` writes straight to the final path. It does not check old bytes, write a spare file, call \`fsync\`, rename, or bring old text back.

That absence matters for an existing installation. If replacement begins and fails, the prior valid file cannot be assumed to remain available unless a test proves its bytes.

After a good write, \`trackInstall(slug, agent)\` starts a POST and catches a fault without a wait. The install call then returns text with the slug and full file path.

This order gives tests five fault points: download, path setup, final write, event send, and a child stop after write. Each point needs its own end state.

Do not mock every dependency in the first test. Begin with a black-box MCP process, a local content server, and a temporary working directory so path selection and real Node writes remain visible.

Then add set faults around disk calls. Since the live function is not exported, a fixed unit seam may move it to an inner module without a change in call order.

Call that refactor a test seam, not code that exists now. Repo proof sets the live order, while the new seam makes each fault easy to repeat.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) explains installation for users. A QA fixture should avoid real user directories and should never rely on whatever agent folders happen to exist on a CI host.

Use a unique temporary root and set the child process working directory to it. Create the \`.claude\` marker only in cases that verify default target selection.

MCP partial install failure testing should save state before the call and after cleanup. This check catches tests that pass because old test waste was already on the path.

## How should QA teams test atomic SKILL.md installation?

An atomic SKILL.md installation test needs one plain rule: readers see the full old file or the full new file, never part of one. The current direct write does not show that swap.

Test the current positive contract first. Serve fixed UTF-8 content, call \`install_skill\`, read the final file, compare exact bytes, and assert no temporary files remain.

Next test a download rejection. The content endpoint should return a controlled error, the tool should return an error result, and neither the skill directory nor \`SKILL.md\` should exist.

For a directory failure, place a regular file where a required parent directory should be. The recursive \`mkdir\` call should reject, and the destination file must remain absent.

For a fixed write fault, make \`SKILL.md\` a folder first. Folder creation then works, but the final write fails with no false install text or event.

The first example exercises real path and file behavior through the built server. Its helper completes MCP initialization and invokes the named tool through stdio.

\`\`\`typescript
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

it('writes the complete downloaded skill before reporting success', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'qaskills-install-'));
  roots.push(root);
  await mkdir(path.join(root, '.agents'));
  const expected = '---\\nname: disk-probe\\n---\\n\\n## Instructions\\n\\nRun checks.\\n';
  const api = await startContentServer({ slug: 'disk-probe', content: expected });
  const mcp = await startMcp({ cwd: root, apiUrl: api.url });

  const result = await mcp.callTool('install_skill', {
    slug: 'disk-probe',
    agent: 'qa-agent',
  });
  const skillPath = path.join(root, '.agents', 'skills', 'disk-probe', 'SKILL.md');

  expect(result.isError).not.toBe(true);
  expect(result.content[0].text).toContain(skillPath);
  expect(await readFile(skillPath, 'utf8')).toBe(expected);
  expect(api.requests.map((request) => request.pathname)).toContain(
    '/api/skills/disk-probe/content',
  );
});
\`\`\`

The content comparison must be exact, including final newline and non-ASCII fixtures when supported. This article remains ASCII, but the installer contract accepts downloaded UTF-8 text.

Do not label a single successful write as proof of atomic replacement. It proves completeness on the normal path, while interruption and prior-file cases test replacement safety.

Add a reader loop only when testing a proposed temporary-file design. With direct \`writeFile\`, the more useful current regression is that any rejected or interrupted final state receives a clear failure classification.

A file-exists check misses blank, short, and stale files. Always pair \`stat\` with a byte check and a list of the folder.

MCP partial install failure testing should also assert returned tool semantics. A complete file with an error result is inconsistent, and false success text after a failed write is dangerous.

## Test matrix for truncated skill file test

The truncated skill file test matrix maps each injection point to exact disk and protocol observations. Include both a clean destination and a prior valid installation because replacement risks differ.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| atomic SKILL.md installation | New destination and complete content | Final bytes equal response body; success names path | Missing bytes, extra file, or error result | \`packages/mcp/src/index.ts\` and Node fs |
| Download rejection | Content endpoint returns failure | No skill directory or file; tool error result | Any destination residue or success text | \`packages/mcp/src/index.ts\` |
| Directory creation rejection | Parent component is a regular file | No \`SKILL.md\`; tool error result | Telemetry call or reported installation | Node fs and Node path |
| truncated skill file test | Injected write stops after a known prefix | Prefix or zero-byte final file is detected as failure | Existence check reports success | Direct final-path write evidence |
| Existing valid file | New write fails after opening destination | Test records exact old, partial, or missing bytes | Stale bytes accepted as current content | Node fs documentation |
| orphan install directory | \`mkdir\` succeeds and write rejects | Empty skill directory is reported as residue | Empty directory passes as installed | \`packages/mcp/src/index.ts\` |
| MCP write crash recovery | Child exits during a large controlled write | Restart scan rejects incomplete final bytes | Agent can load partial instructions | Process and file evidence |
| Telemetry rejection | Write succeeds and telemetry endpoint fails | Complete bytes remain; success result remains | File changes or install rejects | MCP implementation order |
| download before write failure | Network timeout occurs before body return | Prior installation stays unchanged; no new path | Existing file is truncated or removed | Fetch then mkdir sequence |

The table does not promise cleanup that production does not perform. It identifies residue so a failing test cannot hide it behind a generic tool error.

For a clean target, snapshot the parent directory before execution. For replacement, hash and retain the prior bytes before starting the write.

A crash case must use fixed content large enough to create a measurable interruption window. Record the kill point and repeat enough times to prove the harness can actually observe a write in progress.

If the crash test cannot synchronize with the write stage, classify it as nondeterministic and keep it outside the release gate. Deterministic dependency rejection should remain the primary gate.

The [MCP contract testing guide](/blog/mcp-server-contract-testing-guide) can cover the surrounding tool envelope. This matrix adds the disk observations that generic protocol checks cannot see.

## What failures expose orphan install directory?

An orphan install directory appears when deep folder creation works but the final write fails. The folder alone must never pass an installed-skill check.

Create the destination skill directory during the test only through production behavior. If fixture setup creates it first, the test cannot prove which action left the residue.

One deterministic method places a directory at the expected \`SKILL.md\` path. The installer reaches the write stage, rejects, and must return an error rather than installation text.

Another focused method injects a rejected \`writeFile\` after recording its path and encoding. That seam proves ordering and allows the test to inspect the newly created empty directory.

The second example shows the dependency-level contract such a narrow internal seam should satisfy. The call order mirrors the observed source and does not invent cleanup behavior.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

it('reports a write rejection and never dispatches telemetry', async () => {
  const deps = {
    getText: vi.fn().mockResolvedValue('complete skill content'),
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockRejectedValue(new Error('injected disk fault')),
    trackInstall: vi.fn(),
  };

  await expect(
    installSkillWithDeps(
      { slug: 'fault-probe', targetDir: '.agents/skills', agent: 'qa-agent' },
      deps,
    ),
  ).rejects.toThrow('injected disk fault');

  expect(deps.getText).toHaveBeenCalledOnce();
  expect(deps.mkdir).toHaveBeenCalledOnce();
  expect(deps.writeFile).toHaveBeenCalledWith(
    expect.stringMatching(/fault-probe[\\/]SKILL\\.md$/),
    'complete skill content',
    'utf8',
  );
  expect(deps.trackInstall).not.toHaveBeenCalled();
});
\`\`\`

\`installSkillWithDeps\` is a planned test-only seam from the current function, not a repo export. Any move must keep the exact download, mkdir, write, event, and return order.

After the rejected call, inspect the real temporary tree in an integration case. Mock call assertions cannot reveal whether a parent directory, lock file, or old destination remains.

Report an orphan directory with its relative path and entry count. Avoid deleting it before the assertion, then remove the entire test root during shared cleanup.

Stale content is a separate failure. If a prior \`SKILL.md\` survives after the new install rejects, its existence does not prove that the requested version was installed.

Store expected new content and prior content under distinct hashes. The failure report should say whether the final bytes are old, new, partial, empty, or unreadable.

MCP partial install failure testing must reject misleading success text even when residue looks harmless. Users act on the returned path, so a false success result is part of the defect.

## CI coverage for MCP write crash recovery

CI coverage for MCP write crash recovery should use its own local disk and a fixed runtime image. Shared or remote disks can add time and rename rules that the package does not own.

Run deterministic stage failures on every change to \`packages/mcp/src/index.ts\`. Keep process-kill experiments in a separate job if their synchronization cannot be made stable.

Build \`@qaskills/mcp\` first, then run black-box cases against the emitted entry point. A source-only helper test cannot detect packaging, current-working-directory, or stdio integration errors.

Use one temporary root per test worker and print only its relative artifact tree. Absolute CI paths add noise and may expose runner details without helping diagnosis.

Set the fake text route to reject unknown paths and methods. This catches two downloads, an event sent too soon, and use of the live QASkills site.

Retain the response body hash, final file hash, prior file hash, directory listing, injected stage, tool result, and child exit event. These values explain partial state without publishing full skill content.

Block release when a pre-write failure changes a prior file, a completed result lacks exact content, a failed write returns success, or telemetry alters disk state. An empty orphan directory can also block if downstream discovery treats it as installed.

The focused command should run after the MCP build and should enforce the Node version declared by the package. Give each case a bounded timeout so permission or child-process errors cannot hang the job.

Use [getting started](/getting-started) for supported user setup, but make CI create every folder explicitly. A runner's home configuration must not choose the target path.

MCP partial install failure testing artifacts should survive only for failed cases. Successful jobs can remove temporary roots after all assertions and open-handle checks complete.

## How should download before write failure be asserted?

A download before write failure should leave a new path absent and a prior path unchanged. The test must prove the text call failed before \`mkdir\`, \`writeFile\`, or the event.

Return a controlled HTTP error or hold the local response until the client timeout. Record the requested encoded slug and verify no other endpoint receives traffic.

For a clean target, assert that the expected skill directory does not exist. Also list the parent skills directory so a misspelled or unencoded path cannot escape the exact assertion.

For an existing target, compare bytes and metadata captured before the call. A stale prior file may remain, but the tool result must not represent it as the requested successful update.

Do not delete the prior file during setup for this case. Removing it would erase the main unchanged-state guarantee and test only new installation.

The repo gets text before target side effects, though it picks target values after the text arrives. Mock call order can prove no disk call ran after a failed download.

Telemetry must remain absent because it follows a resolved write. Capture the local telemetry route and fail if any request arrives during the observation window.

An HTTP success with an empty body is not a transport failure in the current helper. Add a separate content-validation policy only if the product defines one, rather than fabricating it in this suite.

Use the [MCP Inspector tutorial](/blog/mcp-inspector-tutorial-2026) for manual reproduction of returned tool errors. Automated disk snapshots remain necessary because a client view cannot expose hidden residue.

MCP partial install failure testing should identify the first failed stage and the resulting state. A generic rejection without stage evidence cannot distinguish a safe pre-write failure from a damaging partial replacement.

## Step-by-step test implementation

Implement MCP partial install failure testing in six steps, preserving the production order and isolating every path. The final report should connect each injected stage with disk, protocol, and network evidence.

1. Read \`packages/mcp/src/index.ts\` and document download, target selection, recursive directory creation, direct write, telemetry dispatch, and returned text.
2. Create unique temporary roots with clean and existing-skill fixtures, then serve deterministic SKILL.md bodies from a local HTTP endpoint.
3. Inject one failure at download, mkdir, write, process interruption, or telemetry while capturing exact call order and destination paths.
4. Assert complete success bytes, no pre-write residue, detected partial files, accurate tool results, absent unrelated effects, and unchanged prior state where required.
5. Snapshot directories before cleanup, terminate child processes, close local servers, and retain hashes plus logs only when a case fails.
6. Build and run the focused suite in CI, block unsafe residue or false success, and assign failures to network, path, filesystem, telemetry, or harness owners.

Keep expected paths relative to the temporary root in snapshots. Compute platform-specific absolute paths only inside assertions that compare returned installation text.

Name fixtures by stage and prior state, such as \`write-existing-file\` or \`download-clean-target\`. Clear names prevent two materially different failure contracts from sharing one snapshot.

Run the successful installation first as a harness control. Then randomize negative-case order if tests share no resources, which can expose hidden global state.

Verify cleanup after assertions, not before them. A cleanup function that removes residue early can turn a failed write into an apparently clean result.

Review selected examples in the [skills directory](/skills) only for realistic file bodies. Do not write into installed skill locations outside the disposable test root.

## Failure triage and regression ownership

Begin triage with the injected stage and the last completed operation. A missing content response belongs to the API or network boundary, while a wrong destination belongs to target and path logic.

If \`mkdir\` fails, capture the first conflicting path component and its file type. Permission strings alone can hide a regular-file collision or an incorrectly resolved target.

If \`writeFile\` rejects, classify the final path as absent, directory, prior complete file, empty file, partial new file, or complete new file. That state determines user risk and recovery work.

If telemetry fails after complete bytes exist, the MCP package should still return success under current fire-and-forget behavior. A missing file then points to an earlier stage, not telemetry.

If the tool reports success with wrong bytes, the filesystem contract owns the release blocker. If bytes are correct but the returned path is wrong, inspect path construction and result formatting.

If only the crash job varies, inspect filesystem type, content size, kill synchronization, and Node runtime. Keep that job diagnostic until it has a repeatable stage marker.

Use one path: check download, pick the target, inspect folder creation, compare file bytes, inspect the event, then compare tool text. Stop at the first mismatch.

A useful disk log starts with the root tree before the tool call and ends with the tree after it. Show file kinds, byte counts, and short hashes so the change is plain.

For a clean install, the first tree has no slug folder and the last tree has one full file. No other path in the test root should change.

For a failed update, place the old file hash next to the new body hash before the run. The last hash then tells the team whether old, new, or short text won.

For a write fault, print the last good stage before the error and the first disk fact after it. This pair points to the line of code that needs work.

Use the [MCP server guide](/blog/qaskills-mcp-server-guide) to match the path that real users expect. Keep the test root fake so a failed case cannot touch a user's own skill files.

Use [getting started](/getting-started) to check the normal agent folder names when the product adds a new client. Add a new path case only when source code can pick that path.

The [skills directory](/skills) can supply a sound sample body for a one-time review. Store a fixed small copy in the test, since live skill text may change from one run to the next.

When a test fails, do not clean the root until its tree and hashes are saved. After that step, remove the whole root and prove the child has no open file.

When a retry is part of the case, run it against the exact state left by the first call. A fresh root would test a new install and would miss the real repair path.

The final job note should say whether the end state is absent, blank, old, short, full, or not read. Those six words give the next owner a fast and useful first clue.

Store minimal artifacts on failure and remove full temporary content after analysis. Skill bodies may contain project instructions that should not enter routine CI logs.

The [QASkills blog](/blog) can link related recovery guidance, but the defect should reference one stage-specific matrix row. "Install failed" is not enough for ownership.

MCP partial install failure testing is most useful when residue becomes a named outcome. Empty, stale, partial, complete, and absent states lead to different fixes and should never share one generic assertion.

## Frequently Asked Questions

### How can tests detect empty directories, truncated files, or stale content?

Inject one failure at each installation stage inside a unique temporary root. After every call, list the destination, read exact bytes when present, compare prior and expected hashes, inspect the MCP tool result, and capture telemetry. Classify the final state as absent, empty, stale, partial, complete, or unreadable.

### Does atomic SKILL.md installation exist in the current implementation?

The current installer writes downloaded text directly to the final \`SKILL.md\` path after creating its directory. It does not show a temporary-file and rename sequence. Tests can prove normal completion and detect interruption residue, but they should not claim atomic replacement until implementation and platform tests support it.

### What should a truncated skill file test compare?

Compare the final bytes with both the prior valid file and the complete new response body. Also record file size, a content hash, returned tool status, and directory entries. Existence alone cannot distinguish a correct installation from a zero-byte file, a prefix, or stale instructions.

### When is an orphan install directory a failure?

An empty skill directory is a failure when installation reported success or when agent discovery treats that directory as installed. Even with a proper error result, record the residue because retries and inventory checks may misread it. Cleanup expectations should match documented production behavior rather than assumptions.

### How should a download before write failure preserve state?

A rejected download should occur before directory creation, final writing, and telemetry. A clean target must remain absent, while an existing \`SKILL.md\` must retain exact prior bytes. The MCP result should report an error and must not present the old file as a successful installation of new content.

## Conclusion

MCP partial install failure testing turns each interrupted stage into an exact disk and protocol state. It protects agents from loading empty, partial, or stale instructions and prevents a path string from masquerading as completed work.

Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this failure matrix before the next MCP release. Keep the [install test guide](/blog/mcp-server-testing-guide-2026) near the run log when a disk fault needs a full child replay.`,
};
