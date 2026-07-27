import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP npm files allowlist testing',
  description:
    'MCP npm files allowlist testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP npm files allowlist testing',
  keywords: [
    'MCP npm files allowlist testing',
    'npm pack MCP test',
    'package tarball allowlist',
    'exclude source from npm',
    'MCP secret leak check',
    'published dist presence',
  ],
  relatedSlugs: [
    'mcp-package-registry-version-drift-tests',
    'qaskills-mcp-server-guide',
    'mcp-registry-qa-teams-guide-2026',
    'mcp-server-contract-testing-guide',
  ],
  sources: [
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json/',
    'https://docs.npmjs.com/cli/v11/commands/npm-pack/',
    'https://modelcontextprotocol.io/registry/quickstart',
  ],
  repoEvidence: [
    'packages/mcp/package.json',
    '.github/workflows/mcp-publish.yml',
    'packages/mcp/src/index.ts',
  ],
  content: `MCP npm files allowlist testing runs a real build and npm pack --json, then reads every path in the new tarball. The test passes only when dist, README, package.json, and the declared bin are present, while source, secrets, local settings, logs, caches, and workspace files are absent.

MCP npm files allowlist testing checks the bytes that users can fetch, not just the list in a source manifest. Teams can reuse the same pack rule through the [QA skills directory](/skills), but the package under test must always be the built MCP folder.

## What must MCP npm files allowlist testing prove?

MCP npm files allowlist testing must prove that one clean build yields a small, usable, and safe npm archive. Its pass record needs the exact file list, the declared bin path, basic file modes, a secret scan, and proof that no source or workspace file crossed the pack edge.

The source rule is clear in packages/mcp/package.json. Its files array names dist and README.md, while main, types, and the qaskills-mcp bin all point inside dist.

npm also adds some files by rule, even when the files array is narrow. The [npm package.json guide](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) says package.json, README, main, and bin targets are among the files that can always be packed.

That fact changes the oracle. Do not require the tarball to contain only two path names; require approved roots plus npm's known package files, then fail every path outside that set.

The publish job at .github/workflows/mcp-publish.yml builds @qaskills/mcp before it runs the npm publish command. A pack test should use the same order, since a good allowlist cannot help when dist is old or missing.

Runtime code in packages/mcp/src/index.ts is the source that should become dist/index.js. The pack gate does not judge tool logic, but it must prove that the file mapped by main and bin exists in the archive.

Success therefore has two sides. The archive includes enough code and docs to start the server, and it omits every path or byte that should stay in the worktree.

The [QASkills MCP page](/mcp) describes what the package does after launch. This article stays at the npm edge, where the public artifact is still only a set of paths, modes, sizes, and bytes.

A green build alone is not proof because publish rules run after the build. A green manifest check alone is also weak because npm has its own include and exclude rules.

The final gate must run npm's pack code, parse its result, and inspect the archive. That is the closest safe view of what the later publish step will send.

## Which repository behavior defines the contract?

The contract starts with the files field in packages/mcp/package.json. It lists dist and README.md, so source folders and root work files have no reason to enter the npm archive.

The same manifest maps main to ./dist/index.js and types to ./dist/index.d.ts. Its bin map sends qaskills-mcp to ./dist/index.js, which makes that JavaScript file both a code entry and a command target.

A pack test should strip a leading ./ before it compares paths. npm reports archive paths without that prefix, while package fields often use it for clear relative links.

README.md is both listed and treated as a common package file by npm. Keep the direct check because users need launch help, even if npm would add a README without the files entry.

The workflow in .github/workflows/mcp-publish.yml installs deps, then runs pnpm --filter @qaskills/mcp build. Only after that step does it call pnpm --filter @qaskills/mcp publish.

This order means pack tests should never create fake dist files just to make the list pass. Run the real package build and assert that its output matches main, types, and bin.

The [npm pack command guide](https://docs.npmjs.com/cli/v11/commands/npm-pack/) says the command creates a tarball and can return JSON rather than normal text. It also supports a pack destination, which keeps test output out of the package folder.

The [registry quickstart](https://modelcontextprotocol.io/registry/quickstart) tells publishers to build distribution files before npm publication. It also makes clear that npm hosts the artifact while the MCP Registry stores its metadata.

That split is why server.json is not part of this archive contract unless the package chooses to include it. The current files rule does not list server.json, and registry publish reads it from the package work folder in a later step.

The [package version drift guide](/blog/mcp-package-registry-version-drift-tests) checks release numbers across those layers. The [server guide](/blog/qaskills-mcp-server-guide) covers the six tools, while this test owns only packed file scope.

Pack in a fresh output folder and save stdout, stderr, status, archive name, and the files array. The normal pass should not edit packages/mcp or leave a tarball beside package.json.

## How should QA teams run an npm pack MCP test?

An npm pack MCP test should build the real package, write the tarball to a new temp folder, and parse the single JSON result. It must then compare every returned file against both required paths and a strict set of allowed roots.

Use the package folder as cwd, not the monorepo root. This keeps npm's package rules tied to packages/mcp/package.json and avoids packing the wrong package by mistake.

Set CI to a known npm major version and record that version with the result. npm pack rules are tool behavior, so a major upgrade should run as a clear test change.

The expected set has package.json, README.md, dist/index.js, and dist/index.d.ts at minimum. Other files under dist may be valid build output, but each still needs a normal relative path and safe content.

Reject absolute paths, parent steps, backslashes, NUL bytes, and names that become another path after simple slash cleanup. This guards the scan tool as well as the package.

Do not use only archive size as the oracle. A tiny archive can omit dist, while a modest archive can still contain a short .env file with a live key.

This example runs the real command and checks both sides of the path rule. It also ties bin, main, and types back to the file list returned by npm.

\`\`\`typescript
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('packs only the approved MCP publish surface', () => {
  const packageDir = resolve(process.cwd(), 'packages/mcp');
  const outputDir = mkdtempSync(join(tmpdir(), 'qaskills-mcp-pack-'));
  const run = spawnSync(
    'npm',
    ['pack', '--json', '--pack-destination', outputDir],
    { cwd: packageDir, encoding: 'utf8' },
  );

  expect(run.status).toBe(0);
  const [result] = JSON.parse(run.stdout);
  const paths = result.files.map((file: { path: string }) => file.path);
  const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const clean = (value: string) => value.replace(/^\\.\\//, '');

  expect(paths).toContain('package.json');
  expect(paths).toContain('README.md');
  expect(paths).toContain(clean(pkg.main));
  expect(paths).toContain(clean(pkg.types));
  expect(paths).toContain(clean(pkg.bin['qaskills-mcp']));
  expect(paths.every((path: string) =>
    path === 'package.json' ||
    path === 'README.md' ||
    path.startsWith('dist/')
  )).toBe(true);
});
\`\`\`

Run the package build before this test, then remove the temp folder in afterEach or finally. The [getting started page](/getting-started) can frame the wider setup, but this test should not rely on any local agent install.

Check that result.files is a nonempty array before mapping it. A zero status with an unreadable or empty report must not turn into an empty every call that returns true.

Keep stderr as a build artifact only on failure. It may hold npm notes, but the JSON parser should read stdout alone and reject any extra non-JSON text there.

MCP npm files allowlist testing should also open the final tarball, because a path list alone cannot find a secret hidden inside an approved dist file. The archive scan is a second gate, not a reason to weaken path checks.

## Test matrix for package tarball allowlist

A package tarball allowlist matrix pairs each good path with a nearby bad case. It should test required files, optional build files, path tricks, source leaks, local config, secret text, and stale output.

The expected observation must name a path or scan rule. Broad messages such as unsafe package make it slow to find the file that crossed the boundary.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Normal pack | Clean built package | JSON lists package files and dist | Missing or unreadable result | npm pack guide |
| Required README | Current README.md | README.md is present | Docs are absent | packages/mcp/package.json |
| Declared bin | qaskills-mcp target | dist/index.js is present | Bin points outside archive | packages/mcp/package.json |
| Type entry | types field | dist/index.d.ts is present | Type path is missing | packages/mcp/package.json |
| Extra dist chunk | Build-owned file under dist | Path may pass after byte scan | Approved root is rejected | Build output rule |
| Source leak | src/index.ts in copied fixture | Path check fails | Archive exposes src | Package allowlist |
| Local setting | .env or .npmrc marker | Path or byte scan fails | Private config is packed | npm file rules |
| Workspace leak | pnpm-workspace.yaml or turbo.json | Path check fails | Monorepo file is packed | Package folder boundary |
| Secret text | Fake key in copied dist file | Byte scan fails with safe label | Secret marker reaches archive | Scan rule |
| Stale build | Dist entry older than source change | Build hash check fails | Old code is packed | Publish workflow order |

Use fake secret values that can never work. A scanner test should match their form, redact the value, and report only the archive path plus the rule name.

The allowlist should not depend on the exact set of generated chunks unless the build promises that set. Require owned entry files, then allow safe files only below dist and scan each one.

Path order is not a public contract. Sort paths before a snapshot or compare sets, while still keeping duplicate normalized paths as a hard failure.

The [blog index](/blog) can link this matrix with other release tests. Keep the pack list in machine-readable output so a later owner can compare two releases without unpacking both by hand.

## What failures expose exclude source from npm?

The phrase exclude source from npm means more than missing src in the files array. The real assertion must show that no packed path begins with src/ and no source map or copied text reveals code that policy says should stay private.

For this package, TypeScript source is public in the repository, yet it is still outside the install surface. Excluding it keeps the archive small and prevents clients from loading files that the package does not support.

Create a copied package fixture with src added to files, then run npm pack there. The test should fail on the first normalized src path and list all other bad paths in a safe report.

Do not edit the committed files array for a negative run. Copy package files into a temp folder, add a harmless src/marker.ts, change only the copied manifest, and remove that folder afterward.

Test dotfiles with fake names such as .env.test-leak and config.local. npm may ignore some by default, but the pack gate should prove the observed archive rather than trust a default that could change.

Reject cache, coverage, log, and editor folders as well. Common names include .turbo, coverage, npm-debug.log, .cache, .idea, and .vscode when they appear in the package archive.

Source maps need an explicit policy. If they are allowed under dist, scan their sourcesContent and confirm the team accepts that source text can ship inside a map.

The current manifest does not state a source-map rule. Tests should report maps as a review item until the build policy names them, rather than claim they are safe by default.

Inspect symlinks after extraction and reject any target that leaves the archive root. A clean file name can still lead a scanner outside its temp folder if extraction follows an unsafe link.

The [QASkills MCP page](/mcp) should remain usable when source files are absent. Prove that by launching the packed bin after the path test instead of importing packages/mcp/src/index.ts.

A good negative run returns a nonzero test status, one or more bad path codes, and no published package. It also leaves the copied fixture and tarball only in the temp area chosen by the test.

## CI coverage for MCP secret leak check

An MCP secret leak check should scan names and bytes in the exact tarball made by npm pack. Scan source inputs too if useful, but never treat a clean source scan as proof of a clean archive.

Start with a short deny list for file classes: environment files, npm user config, key stores, logs, caches, local overrides, and workspace control files. Keep each rule named so a waiver can be narrow.

Add content rules for private key headers, common token prefixes, assignment forms, and high-confidence test markers. Use a proven scanner when the team already has one, then wrap its output with path redaction and a fixed exit rule.

Never print the matched secret. Report the archive path, rule ID, byte offset range, and a one-way hash if teams need to link repeat findings.

Binary files need a size cap and type-aware handling. Skip no file just because UTF-8 decode fails; scan raw bytes for fixed markers and send unknown large blobs to an approved binary rule.

The normal fixture should include strings such as QASKILLS_API_URL and DO_NOT_TRACK because names are not secrets. packages/mcp/src/index.ts reads those settings, so a weak name-only scanner would raise false alarms.

The bad fixture should use a clear fake value beside a secret-like key. Its expected result is one safe finding and a failed job, followed by full removal of extracted files.

Run the scan after the build and pack steps but before any npm write. In the current workflow, that means the gate belongs between Build MCP server and Publish to npm.

Store the sorted file list, archive hash, scanner version, rule set version, and redacted findings. Do not upload the whole bad fixture when it was made to look like a secret leak.

MCP npm files allowlist testing should fail closed when the scanner crashes or times out. A missing scan report is not a clean report, and CI should not continue to publish.

Use the [registry QA guide](/blog/mcp-registry-qa-teams-guide-2026) to place this check beside metadata checks. The npm archive gate must pass before the later registry record can safely point users at that artifact.

## How should published dist presence be asserted?

Published dist presence is proven when all manifest entry paths exist inside the tarball and the packed bin starts. It is not proven by a dist folder name, because that folder may be empty or miss index.js.

Read main, types, and every bin value from the same package.json used by npm pack. Normalize a leading ./, then require an exact path in the returned files list for each value.

Check each required file has a size greater than zero. For dist/index.js, also read the first line and require the Node shebang if the package needs direct bin launch.

Do not demand execute mode on Windows reports that cannot hold Unix mode in the same way. On Linux release CI, assert the packed bin can be invoked through npm's normal install link and record the result.

Install the tarball into a new temp project with scripts disabled unless the package needs an install script. QASkills has no install script in its MCP manifest, so startup should not need that extra trust.

Start qaskills-mcp and drive initialize with a fixed deadline. Stop after identity and tools/list if this gate only owns pack use, leaving API calls for the server contract suite.

Compare the packed package version with the pack JSON result and package.json inside the archive. A present bin from an older dist build can still start, so version evidence must join file evidence.

The workflow order also needs a static check. This second example guards the build-before-publish link in .github/workflows/mcp-publish.yml without changing that file.

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('builds the MCP dist before npm publish', () => {
  const workflow = readFileSync(
    resolve(process.cwd(), '.github/workflows/mcp-publish.yml'),
    'utf8',
  );
  const buildName = workflow.indexOf('name: Build MCP server');
  const buildRun = workflow.indexOf('pnpm --filter @qaskills/mcp build');
  const publishName = workflow.indexOf('name: Publish to npm');
  const publishRun = workflow.indexOf(
    'pnpm --filter @qaskills/mcp publish --access public --no-git-checks',
  );

  expect(buildName).toBeGreaterThan(-1);
  expect(buildRun).toBeGreaterThan(buildName);
  expect(publishName).toBeGreaterThan(buildRun);
  expect(publishRun).toBeGreaterThan(publishName);
  expect(workflow.slice(buildName, publishName)).not.toContain('publish');
});
\`\`\`

This text check is intentionally small and tied to the current workflow. If steps move into a reusable action, replace it with a YAML parse and assert the called action contract instead of keeping a stale search.

The packed runtime check should use the archive path from npm's JSON response. Do not rebuild between pack and launch, since that would test a different set of bytes.

Use the [version drift article](/blog/mcp-package-registry-version-drift-tests) for deeper version checks. Here, version is one part of the proof that the required dist is both present and current.

## Step-by-step test implementation

Build this release gate in six steps, with one temp root for all files from a run. Give the root a random name, keep it outside the worktree, and remove it even when an assertion fails.

1. Read packages/mcp/package.json and record files, main, types, bin, name, and version. Define approved roots, required paths, denied path classes, and safe scan rules before the build starts.
2. Create copied negative fixtures for the npm pack MCP test and package tarball allowlist. Add one harmless src file, one fake local setting, and one fake secret marker in separate cases.
3. Run pnpm --filter @qaskills/mcp build, then call npm pack --json with a new pack destination. Require status zero, one result item, a nonempty files array, and an archive inside the temp root.
4. Sort and normalize returned paths, then assert package.json, README.md, main, types, and bin. Reject every path outside the approved set, extract safely, and scan every packed byte.
5. Run each negative copy and require its named failure without publishing anything. Check source files are unchanged, close file handles, and remove copied folders plus all tarballs.
6. Place the gate before npm publish in CI and keep its archive hash, sorted paths, tool versions, and redacted findings. Block the release on missing output, scanner error, timeout, or any denied path.

Keep positive and negative builds apart. A fake secret in one dist folder must never survive into the clean archive through a shared output cache.

Set a hard cap for archive bytes, file count, and single-file size based on a reviewed baseline. These limits catch sudden bulk, but they should add to path and byte checks rather than replace them.

Make the final pass command local and CI-safe. The [QASkills server guide](/blog/qaskills-mcp-server-guide) can host wider smoke tests, while this command should return one clear pass or a short list of pack defects.

MCP npm files allowlist testing should run again when npm, tsup, package fields, or the workflow changes. Each tool can alter the final archive even when MCP runtime code stays untouched.

## Failure triage and regression ownership

Triage begins with the file that produced the archive. If npm pack ran from the wrong cwd or package name, fix the harness before asking package owners to change their allowlist.

When a required dist path is absent, compare build status, package main, types, and bin with the actual dist tree. This belongs to build or package ownership, not the MCP Registry.

When src, config, logs, or workspace files appear, inspect files globs and nested ignore rules. Keep the exact packed path in the issue so the owner can reproduce npm's choice.

When a secret rule fires, stop artifact upload and redact logs first. A security owner should confirm the match, rotate any real key, and review pack history before the normal release flow resumes.

When the clean fixture passes locally but fails in CI, compare npm versions, platform, line endings, build flags, and untracked files. The file list artifact should make that diff direct.

When the pack list is safe but the bin cannot start, inspect mode, shebang, module form, missing runtime deps, and stale dist. That is an artifact use failure, even though the allowlist itself is narrow.

When pack and start pass but registry launch later fails, hand the archive hash and npm version to the registry or client test owner. Do not widen the file set without evidence that a required runtime file is absent.

A workflow-order failure belongs to release automation. The second code test points to the exact step names and commands that no longer keep build before npm publish.

Use the [QA skills directory](/skills) to share the triage flow with agents. Keep package-specific path rules beside @qaskills/mcp so a generic scanner cannot silently become the only oracle.

Close each defect with a new copied fixture that fails before the fix and passes after it. That proof is stronger than a one-time manual look inside the next tarball.

## Frequently Asked Questions

### What should an npm pack MCP test assert first?

An npm pack MCP test should first require a zero status, one valid JSON result, a nonempty file list, and an archive inside its temp folder. It should then check package.json, README.md, main, types, and every bin target before scanning optional dist files.

### How strict should a package tarball allowlist be?

A package tarball allowlist should permit npm's known package files and safe files under the declared dist root. It should reject all other roots, odd relative paths, duplicate normalized names, unsafe links, and missing required entries, while a separate byte scan checks content inside allowed paths.

### Does a files field always exclude source from npm?

No, a files field states intent but npm applies its own packing rules and nested ignore behavior. To exclude source from npm with proof, run npm pack, parse its reported paths, inspect the tarball, and fail any src path or disallowed source map found in the artifact.

### What belongs in an MCP secret leak check?

An MCP secret leak check should scan archive names and raw bytes for private keys, token forms, environment files, local config, and approved fake markers. It must redact matched values, fail when the scanner cannot finish, and keep clean setting names such as QASKILLS_API_URL from causing weak false alarms.

### How can CI prove published dist presence?

CI proves published dist presence by mapping package main, types, and bin fields to exact nonempty tarball paths, then launching the installed packed bin. The run should also match package versions and archive hash, so an old yet runnable dist file cannot pass as the current release.

## Conclusion

MCP npm files allowlist testing turns the real npm archive into the release oracle. Required entry checks, a strict path set, safe extraction, byte scans, packed startup, and build-order proof cover both missing code and unwanted files.

Review the [QASkills MCP integration](/mcp), then browse release and test skills in the [QA skills directory](/skills). Run this pack matrix before the next MCP release and retain its safe file list with the published tag.`,
};
