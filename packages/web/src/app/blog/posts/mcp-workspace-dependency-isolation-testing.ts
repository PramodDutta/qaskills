import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP workspace dependency isolation testing',
  description:
    'MCP workspace dependency isolation testing explained through repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP workspace dependency isolation testing',
  keywords: [
    'MCP workspace dependency isolation testing',
    'MCP packed package isolation',
    'undeclared workspace dependency test',
    'npm tarball standalone smoke',
    'monorepo dependency leak',
    'qaskills MCP clean install',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-registry-qa-teams-guide-2026',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://docs.npmjs.com/cli/v11/commands/npm-pack/',
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json/',
    'https://nodejs.org/api/packages.html',
  ],
  repoEvidence: [
    'packages/mcp/package.json',
    'docs/product/MCP-SERVER-PLAN-2026-07.md',
    'packages/mcp/src/index.ts',
  ],
  content: `MCP workspace dependency isolation testing must pack the server, install that tarball outside the repo, and run its real command using only declared runtime dependencies. A clean initialize and tools/list exchange proves the expected path. Any import from a workspace package, root node_modules, source alias, or omitted file disproves isolation.

## What must MCP workspace dependency isolation testing prove?

MCP workspace dependency isolation testing must prove that the npm pack has all files a user needs. The test removes repo help before install, module lookup, and process startup can use it.

A repo build can pass while the published package remains broken. Hoisted dependencies, workspace links, TypeScript path aliases, and nearby source files may satisfy imports that users never receive.

The primary fixture creates a tarball from the MCP package, copies it to an unrelated temp root, and installs it in a new package. That root must not sit beneath the repo folder.

After install, launch the installed bin using the temp project's dependency tree. Complete initialize and tools/list so every top-level application import and SDK registration path executes.

The pass record includes tarball checksum, file list, installed dependency tree, resolved bin, wire replies, stderr, exit status, and cleanup. This record shows more than a successful \`npm pack\` command.

The negative control adds a fixture module that resolves only from a fake parent node_modules folder. The clean harness must reject that dependency instead of finding it through inherited search paths.

Run with a sanitized environment that removes \`NODE_PATH\`, custom loaders, package-manager workspace variables, and repo-specific command shims. Also launch from the external project rather than the source package folder.

The [QASkills MCP integration](/mcp) is distributed as an npm stdio server. Isolation therefore covers both package contents and the runtime graph needed before the first wire response.

MCP workspace dependency isolation testing stops at a local handshake for the core gate. Remote catalog calls and registry publication add separate systems without strengthening the dependency boundary.

## Which repository behavior defines the contract?

The production manifest at \`packages/mcp/package.json\` declares two runtime dependencies: \`@modelcontextprotocol/sdk\` and \`zod\`. It contains no \`@qaskills/*\` workspace dependency, which gives the clean-pack test a small and exact first rule.

Its files list contains \`dist\` and \`README.md\`, while the bin, main, and types fields all point into dist. The packed file list must include those targets and the package manifest npm adds.

The source in \`packages/mcp/src/index.ts\` imports Node built-ins, the MCP SDK, and Zod. It reads its adjacent package version with \`require('../package.json')\`, so package layout is part of startup.

That source implements URL construction, API wrappers, result normalization, install, telemetry, and all six tool registrations locally. A hidden import from shared repo code would contradict the current standalone design.

The design record in \`docs/product/MCP-SERVER-PLAN-2026-07.md\` calls the package standalone and says it has no \`@qaskills/shared\` dependency. This is explicit repo proof rather than an assumption inferred from current build success.

The [npm pack documentation](https://docs.npmjs.com/cli/v11/commands/npm-pack/) explains how the publishable tarball is created and how JSON output can report its files. Use that command instead of copying the package folder.

The [npm package.json reference](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) defines files, bin, main, and dependencies as package metadata. The test should compare the fields with actual packed and installed behavior.

The [Node package documentation](https://nodejs.org/api/packages.html) explains runtime package lookup. It supports the rule that the child must resolve from its user tree without \`NODE_PATH\` or repo ancestry.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) shows the user-facing install path. A user who follows that guide needs a pack that does not borrow files from this repo.

MCP workspace dependency isolation testing should record exact dependency versions from the lock-backed install. When a transitive package introduces a lookup fault, that record separates application imports from dependency changes.

## How should QA teams test MCP packed package isolation?

MCP packed package isolation begins with a normal production build, followed by \`npm pack --json\` inside \`packages/mcp\`. Parse the command output to obtain the generated filename and reported file list.

Assert the tarball contains the bin target, declaration file, source map policy if relevant, README, and package manifest. Reject source-only paths, temp files, local test fixtures, and unexpected secrets.

Copy the tarball to a temp folder created outside the repo. Initialize a tiny package there and install the tarball with scripts, cache, and logs under controlled temp locations.

Do not use a workspace protocol reference or \`npm link\`. Both methods connect the user project back to local source and make the clean test invalid.

Resolve the package manifest and command from the user folder. The resolved paths must remain below that folder, apart from Node built-ins and the selected Node bin.

Launch the command with \`cwd\` set to the user root and \`NODE_PATH\` absent. Complete initialize, send the initialized notification, and compare tools/list with the six expected names.

MCP packed package isolation also checks stderr and final exit. A child that logs a missing optional module but continues may still be relying on an incomplete or fallback dependency path.

Use a local API base even though tools/list needs no request. This prevents accidental startup traffic from contacting production if source behavior changes later.

The [MCP registry guide for QA teams](/blog/mcp-registry-qa-teams-guide-2026) covers discovery after packaging. Keep registry metadata outside this harness because an entry can be valid while its npm tarball is incomplete.

MCP workspace dependency isolation testing should delete the original tarball only after the child closes and diagnostics are retained. Premature cleanup can replace the first failure with an unrelated file-not-found error.

## Test matrix for undeclared workspace dependency test

An undeclared workspace dependency test must cover pack contents, install lookup, runtime lookup, and false-isolation controls. Each row removes a different way the repo could help.

Run positive and negative rows from fresh folders. Reusing one installed tree can leave the exact module or file a later row is supposed to prove absent.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Packed inventory | Production \`npm pack --json\` output | Dist entry, declarations, README, and manifest are present | Bin or adjacent manifest is missing | \`packages/mcp/package.json\` |
| Declared graph | Clean tarball installation | Runtime tree contains SDK and Zod through declared edges | Extraneous root package satisfies import | \`packages/mcp/package.json\` |
| External launch | Bin runs from unrelated temporary root | Initialize and six-tool list succeed | Resolution reaches repository path | Node package resolution |
| Workspace import mutation | Fixture bundle imports \`@qaskills/shared\` without declaration | Child fails with module resolution evidence | Hoisted workspace package makes it pass | Standalone design record |
| NODE_PATH trap | Fake parent module plus sanitized child environment | Fake module remains unreachable | Inherited NODE_PATH changes result | Node package resolution |
| Omitted adjacent file | Tarball fixture excludes package manifest | Startup fails at version load with exact path | Test checks install only | \`packages/mcp/src/index.ts\` |
| Repeated install | Same tarball in a second clean project | Independent result and matching checksum | First tree or cache supplies files | npm package behavior |
| Network disabled | Handshake with unreachable API base | Startup and tools/list still work | Import triggers eager remote call | \`packages/mcp/src/index.ts\` |

The workspace-import mutation should operate on a disposable fixture pack, never the production source. Its purpose is to show that the harness detects forbidden lookup.

The omitted-file row proves install success alone is weak. npm can install a valid archive whose command fails immediately because one runtime-read file was excluded.

Cache isolation needs balance. A shared content cache can speed downloads, but each installed project and dependency tree must be new, and offline cache misses should fail visibly.

The [getting started page](/getting-started) helps developers reproduce install. CI should print the temp user command and package checksum without retaining an entire successful node_modules tree.

MCP workspace dependency isolation testing passes only when the real pack succeeds and each leak fixture fails at its intended boundary. A generic install error does not validate a runtime-lookup control.

## What failures expose npm tarball standalone smoke?

An npm tarball standalone smoke fails at one of four stages: pack, file list, install, or launch. Report the stage explicitly because each stage has different likely owners and proof.

A pack failure points to build output, manifest setup, or package-manager state. Preserve command status, stderr, and JSON output before trying an install.

A file list failure should name missing and unexpected paths. Avoid snapshots of every byte because generated maps and declaration ordering can add noise unrelated to the required package surface.

An install failure needs the isolated npm log, requested tarball checksum, active Node and npm versions, and target root. It should also confirm no workspace flags or links were used.

A launch failure needs module lookup details, command path, cwd, sanitized environment keys, stdout, stderr, and wire phase. Search the stack for repo paths and \`@qaskills/\` imports.

The first code example verifies the package contract before packing. It treats the two runtime dependencies and distributed files as an exact small surface.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

test('keeps the MCP package independent from workspace modules', async () => {
  const manifest = JSON.parse(await readFile('packages/mcp/package.json', 'utf8'));
  const runtimeNames = Object.keys(manifest.dependencies).sort();

  expect(runtimeNames).toEqual(['@modelcontextprotocol/sdk', 'zod']);
  expect(runtimeNames.filter((name) => name.startsWith('@qaskills/'))).toEqual([]);
  expect(manifest.files).toEqual(['dist', 'README.md']);
  expect(manifest.bin['qaskills-mcp']).toBe('./dist/index.js');
  expect(manifest.main).toBe('./dist/index.js');
});
\`\`\`

Keep this exact metadata assertion intentionally small. Adding an approved runtime package should require a reviewed expectation update and a successful external smoke, not a generic no-workspace matcher alone.

MCP workspace dependency isolation testing should also scan packed JavaScript for obvious workspace specifiers as a fast diagnostic. Treat that scan as supporting proof because computed or transformed imports can escape text matching.

The [QASkills blog index](/blog) links broader package and release tests. This smoke remains responsible for whether one tarball can stand alone before any publication system accepts it.

## CI coverage for monorepo dependency leak

A workspace package leak is easiest to detect when the user folder has no repo ancestor. On hosted runners, create it under the runner temp root rather than beneath the checkout.

Sanitize \`NODE_PATH\`, \`NODE_OPTIONS\`, custom loader variables, pnpm home values used for execution, and any project-specific module aliases. Keep only variables required to find Node and the controlled fixture.

Run the built pack, not \`pnpm --filter ... dev\`. Package-manager commands from the workspace intentionally know the dependency graph and cannot establish user isolation.

Use \`npm install\` on the local tarball because npm is the published registry format. The build can still use pnpm; the user stage should match how the pack is distributed.

Record \`npm ls --all --json\` for failed installs and launches. A dependency path can show whether a missing module was undeclared, optional, peer-provided, or incorrectly hoisted.

After launch, inspect loaded module paths when a focused diagnostic mode is available in the harness. None should resolve under the checkout, aside from the Node bin or explicitly copied tarball path.

Run the isolation job after build but before npm publication. A release should not rely on registry users to discover that the pack borrowed a root dependency during local checks.

The [QASkills MCP guide](/blog/qaskills-mcp-server-guide) supplies the expected command and the [registry guide](/blog/mcp-registry-qa-teams-guide-2026) covers later distribution. Keep the CI boundary between those concerns visible.

Do not accept a rerun from inside the checkout as recovery. If the external project fails, moving it closer to node_modules removes the very condition the test was designed to enforce.

MCP workspace dependency isolation testing should block any checkout path in the runtime lookup record. That one invariant catches many hoisting and alias mistakes even when the final error is indirect.

## How should qaskills MCP clean install be asserted?

A qaskills MCP clean install should start with an empty folder containing only a minimal user manifest and the copied tarball. Assert emptiness before package install so stale files cannot satisfy later checks.

Use a dedicated npm cache or record its location. Cached package bytes are acceptable when checksums match, but cached installed trees, links, and prior lockfiles are not.

After install, resolve \`@qaskills/mcp/package.json\` from the user folder. Compare its version with the source manifest and verify its physical path sits inside the new project's node_modules.

Resolve the bin target from installed metadata rather than assuming npm's shim format. On different platforms, the command wrapper may differ while the underlying target remains the same.

Start the target through the selected Node bin and use a valid MCP lifecycle sequence. A plain \`--version\` check is unavailable here and would not load tool registrations even if it existed.

Assert the exact six tool names, no stderr in the healthy case, and a clean exit after stdin closes. Also assert the local HTTP fixture received no request during startup and tools/list.

Repeat install into another fresh folder from the same tarball. Matching checksums and wire records prove the first project's state was not required.

The second code example makes that clean root a test fact. It checks the resolved pack path before it starts the installed child.

\`\`\`typescript
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';

test('starts the packed bin outside the repo', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'mcp-pack-smoke-'));
  const installed = await installTarball(root, packedTarball);
  const bin = await realpath(path.join(installed, 'node_modules/@qaskills/mcp/dist/index.js'));

  expect(bin.startsWith(await realpath(root))).toBe(true);
  expect(bin.includes('/qaskills/packages/')).toBe(false);

  const child = await startMcp(bin, { cwd: root, NODE_PATH: undefined });
  expect(await child.initialize()).toMatchObject({ serverInfo: { name: 'qaskills' } });
  expect((await child.listTools()).map((tool) => tool.name).sort()).toEqual(expectedToolNames);
  await expect(child.close()).resolves.toEqual({ code: 0, signal: null });
});
\`\`\`

MCP workspace dependency isolation testing should test paths containing spaces. Package wrappers and command construction can break there even when module lookup is otherwise correct.

Use the [skills catalog](/skills) only for a later live operation after the clean handshake passes. A controlled no-network startup makes dependency failures easier to distinguish from catalog availability.

Finally, remove the temp cache, projects, tarball copies, processes, and fixture sockets. A cleanup failure should remain visible because leaked state can invalidate the next isolation row.

## Step-by-step test implementation

Implement the isolation proof as a user pipeline rather than a workspace test with extra assertions. These six steps make every possible repo assist explicit.

1. Read \`packages/mcp/package.json\`, assert its exact runtime dependency names and distributed paths, then build the MCP package without modifying metadata.
2. Run \`npm pack --json\`, parse the reported tarball and inventory, require the bin, declarations, README, and adjacent manifest, and record a checksum.
3. Create an unrelated temporary consumer root, sanitize module-related environment variables, initialize a minimal package, and install only the copied tarball.
4. Resolve the installed manifest and bin from that root, launch the command, complete initialize and tools/list, and compare the exact six registrations.
5. Exercise workspace-import, parent-module, omitted-file, repeated-install, and no-network controls, confirming each fault produces a stable stage-specific result.
6. Gate publication on the external launch, retain bounded package and process evidence for failures, and remove every generated archive, tree, cache, pipe, timer, and child.

### A clean-room proof with no hidden path

Pick a temp root that is not inside the repo tree. Resolve both paths first and check that neither starts with the other, then save both full paths in the run log for the whole job. This one guard stops a weak test before it can give a false pass.

Make the new root blank, then add only a small package file. Do not copy a lock file from the repo or let a setup hook add one at any stage of the run. The pack file should be the sole link between the build and this new root.

Save the pack hash before and after the copy. Both values must match, or the test must stop and name both values in plain text near the failed step. There is no point in tracing a child from a pack whose bytes changed in flight.

Ask npm for a JSON file list when it makes the pack. Check the bin file, type file, readme, and package file by name and path, then save that short list with the pack hash for both clean roots. Fail on a missing file before any install step can blur the cause.

Give npm a cache under the same test root, but use a fresh install tree. A cache may hold pack bytes, not old links or old node_modules state from a past case or failed run. Log the cache path so a leak can be traced.

Clear \`NODE_PATH\`, \`NODE_OPTIONS\`, and test loader keys for the child. Keep PATH only so the chosen Node tool can run from the shell by name. Do not pass the full parent env when a short allow list will do.

Set the child's cwd to the new root and print that path once. Resolve the installed bin from that same root. Both facts must point away from the repo before the first MCP byte is sent.

Read the installed package file and match its name and version with the pack report. Then list its two direct run-time needs. This check spots a stale or wrong pack before the child starts.

Start the child and ask for the first reply. If load fails, save stderr and the first missing path. Do not mask that fault by trying the source command from the repo.

Ask for all six tools after the first phase is done. Match names, count, and input shapes. This call proves that all top-level tool code could load from the new install tree.

Use a fake parent folder with one bait module in a bad test. The child must not find that bait with clean env and cwd rules. If it does, print the path that gave it away.

Run the same pack in a second new root with a new cache path. A match in both runs is stronger than a retry in one root. It rules out files left by the first install.

Turn the web off for the first tool-list run. The child should not need the site just to start and list tools. This keeps web reach and pack health as two clear test facts.

Use the [MCP setup page](/mcp) to match the user command after the clean run. Use the [start guide](/getting-started) to aid a local replay. Never move the clean root back under the repo just to make that replay pass.

At close, scan the saved paths for the repo root text. Include bin, loaded files, cwd, logs, and stack paths in that scan. One hit is enough to fail the clean-room claim.

Remove the child first, then the install tree, cache, and pack copy. Keep the small fail report until the job ends. A clean pass should leave no root, pipe, lock, or live child behind.

Make command execution argument-based rather than shell-concatenated. Temp paths with spaces and package names with punctuation should not change how the harness invokes npm or Node.

Verify the checksum after copying the tarball into the user root. A copy or cleanup race should fail before install rather than appear as a package defect.

Avoid changing the package to make tests easier, such as exporting internal helpers solely for isolation. The public pack and command are the required boundary.

The [MCP integration page](/mcp) can guide a manual replay with the same tarball. Automated proof should still identify the external cwd, resolved bin, and absent checkout paths.

MCP workspace dependency isolation testing is convincing when a deliberate undeclared import passes in the repo but fails in the clean harness. That contrast proves the suite removed local lookup help.

## Failure triage and regression ownership

If expected files are absent from the archive, assign the failure to build output or package files setup. Do not investigate Node lookup until the tarball file list is correct.

If npm cannot install declared packages, inspect lock state, registry access, engine constraints, and dependency metadata. Preserve the dependency tree and avoid retrying from a warmer workspace.

If the command cannot load its adjacent package manifest, compare the files list, installed path, and bundled require location. That is a package layout defect with direct repo proof.

An error naming \`@qaskills/shared\` or another workspace package is an application or bundle dependency leak. Find the importing file and either remove the edge or declare an intentional runtime dependency after design review.

A stack path under the checkout indicates environmental contamination even when the tool responds correctly. Assign that first to the harness or execution setup because the clean test boundary was not real.

When initialize works but the tool set differs, compare installed version and dist checksum with source. The dependency graph may be isolated while the pack itself is stale.

If only a live catalog call fails, move that issue to API or network ownership after the no-network handshake passes. Package isolation does not promise external service availability.

Use the [getting started guide](/getting-started) for manual install context and the [MCP server guide](/blog/qaskills-mcp-server-guide) for command setup. Keep the captured tarball and lookup records as the decision proof.

MCP workspace dependency isolation testing should end with one failed stage, first forbidden path or missing file, and exact pack checksum. That summary keeps repo, packaging, and runtime owners from passing the issue between teams.

## Frequently Asked Questions

### Why does MCP packed package isolation require npm pack?

\`npm pack\` creates the same publishable file boundary governed by package metadata. Copying the source folder includes files users may never receive and preserves nearby workspace lookup. A tarball file list plus external install tests the pack, dependency declarations, bin mapping, and runtime layout together.

### What should an undeclared workspace dependency test remove?

Remove workspace links, repo ancestry, root node_modules access, \`NODE_PATH\`, custom loaders, source aliases, and reused installed trees. Launch from an unrelated temp project with a sanitized environment. The test must fail a deliberate undeclared import specifically, proving local lookup no longer helps.

### Is an npm tarball standalone smoke complete after installation?

No. npm can install an archive whose bin target, adjacent manifest, runtime import, or declaration is missing. Launch the installed command, complete initialize and tools/list, inspect stderr, and close it cleanly. Runtime behavior is the proof that packaged contents form a usable server.

### How does CI identify a monorepo dependency leak?

CI should record resolved module paths and reject any runtime path under the checkout. It should also compare declared dependencies, scan the packed bundle for workspace specifiers, and run mutation controls. The first missing module or forbidden checkout path usually identifies the undeclared edge directly.

### What makes a qaskills MCP clean install trustworthy?

A trustworthy clean install begins in an empty external folder, installs one checksummed tarball, resolves its command locally, completes a wire handshake, and leaves no repo path in runtime proof. Repeating the process in a second new folder helps prove the first install supplied no hidden state.

## Conclusion

MCP workspace dependency isolation testing turns the standalone design into a release gate. Pack the real package, inspect its files, install it beyond the checkout, sanitize lookup paths, complete a wire handshake, and prove deliberate workspace imports cannot borrow the repo.
Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this clean-package matrix before the next MCP release.`,
};
