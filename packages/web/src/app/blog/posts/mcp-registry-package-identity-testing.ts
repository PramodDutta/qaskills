import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP registry package identity testing',
  description:
    'MCP registry package identity testing with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP registry package identity testing',
  keywords: [
    'MCP registry package identity testing',
    'mcpName server name parity',
    'registry npm identifier test',
    'MCP repository metadata contract',
    'package identity drift',
    'runtime server name test',
  ],
  relatedSlugs: [
    'mcp-registry-qa-teams-guide-2026',
    'mcp-package-registry-version-drift-tests',
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/registry/quickstart',
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json/',
    'https://registry.modelcontextprotocol.io/docs',
  ],
  repoEvidence: [
    'packages/mcp/package.json',
    'packages/mcp/server.json',
    'packages/mcp/src/index.ts',
  ],
  content: `MCP registry package identity testing proves that each name, path, and version leads to the same pack. CI passes when the source files and start reply agree on the npm name, full Registry name, repo, folder, short server name, and release tag; one split field blocks the release.

The test checks meaning and does not force unlike fields to share one string. Use the facts in Git as the rule, then add these focused checks to a skill from the [QA skills directory](/skills) when an agent owns the release gate.

## What must MCP registry package identity testing prove?

MCP registry package identity testing must prove one clear path from the source folder to the live start reply and Registry row. It should accept the short run name qaskills, link it to io.github.PramodDutta/qaskills, and reject a wrong npm name, version, repo, folder, or full name.

The file packages/mcp/package.json names the npm pack @qaskills/mcp. It also sets mcpName to io.github.PramodDutta/qaskills and points to the packages/mcp folder in the main repo.

The file packages/mcp/server.json repeats the full Registry name. Its first pack row names @qaskills/mcp, version 0.1.2, and the stdio link used to start the server.

Live code in packages/mcp/src/index.ts reads VERSION from package.json and gives that value to McpServer. The new server uses qaskills as its short run name, so a test that equates it with mcpName would be wrong.

A strong check gives each field one role and states how those roles link. Registry name equals mcpName, npm name equals package name, versions match, both repo URLs point to one project, and the run name equals the set alias.

This narrow scope keeps the suite useful. The [QASkills MCP page](/mcp) shows what the product can do, while this test proves which released pack supplies those tools.

The last live proof is a start reply with server name qaskills and the Git version, then a Registry row tied to the right npm pack. A source match helps before the build, but it cannot serve as full release proof by itself.

## Which repository behavior defines the contract?

The repo sets a chain of name checks before any client calls a tool. Package data gives the npm name and version, Registry data binds that pack to the full server name, and startup reports the short live name.

Start with packages/mcp/package.json because the live code reads its version at once. The file also sets the qaskills-mcp bin to ./dist/index.js, which links the npm name to the child that clients start.

The package repo URL ends with qaskills.git and sets its folder to packages/mcp. The server file uses the same project URL without .git, so tests should trim only that known end and one last slash.

Do not fold letter case in the GitHub owner or full Registry name. The repo run log says owner case mattered when the team first sent the row, and broad lower case rules could hide a real name fault.

Next, packages/mcp/server.json binds the Registry name to one npm pack row. That row repeats the release version and states stdio, which gives CI a direct link from the public list to the app users run.

The [official registry quickstart](https://modelcontextprotocol.io/registry/quickstart) says the server.json name must match package.json mcpName. It also says the Registry holds the row while npm holds the built pack, so both sides need proof.

The [npm package manifest reference](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) treats name plus version as the pack key. It also defines repo and bin fields, which back the project and launch checks used here.

At last, packages/mcp/src/index.ts makes McpServer with name qaskills and version VERSION. That code is the local rule, while a start reply from the built pack proves the same values reached the live MCP link.

The broader [MCP registry guide](/blog/mcp-registry-qa-teams-guide-2026) covers rules for publish work. Pair it with the [version drift test](/blog/mcp-package-registry-version-drift-tests) and [QASkills server guide](/blog/qaskills-mcp-server-guide) when a release gate also owns version flow and tool use.

## How should QA teams test mcpName server name parity?

The mcpName server name parity check should compare fields by role, then check the set run alias in the start reply. This finds both file drift and a stale build without acting as if qaskills and io.github.PramodDutta/qaskills were the same string.

Use files from Git as read-only test input and parse them from the repo root. A temp copy helps with bad cases, but the test must never rewrite either live source file.

Begin with exact package and Registry checks. Require server.name to equal package.mcpName, the first row's npm name to equal package.name, and all three set versions to share one value.

Clean only the known repo URL gap. Remove a final .git and slash, compare the rest as exact text, and then require package.repository.directory to equal packages/mcp.

Then read packages/mcp/src/index.ts or catch the new server call through a test seam. The source check should require name qaskills and version VERSION, while an MCP run check should read the start reply.

This first example provides a fast preflight contract tied to the committed files. It produces field-level diffs before a build or network call begins.

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));

const cleanRepository = (value: string) =>
  value.replace(/\\.git$/, '').replace(/\\/$/, '');

describe('MCP package identity', () => {
  it('maps npm, registry, repository, and runtime fields', () => {
    const pkg = readJson('packages/mcp/package.json');
    const manifest = readJson('packages/mcp/server.json');
    const source = readFileSync(
      resolve(process.cwd(), 'packages/mcp/src/index.ts'),
      'utf8',
    );

    expect(manifest.name).toBe(pkg.mcpName);
    expect(manifest.packages).toHaveLength(1);
    expect(manifest.packages[0].identifier).toBe(pkg.name);
    expect(manifest.version).toBe(pkg.version);
    expect(manifest.packages[0].version).toBe(pkg.version);
    expect(cleanRepository(manifest.repository.url)).toBe(
      cleanRepository(pkg.repository.url),
    );
    expect(pkg.repository.directory).toBe('packages/mcp');
    expect(source).toContain("name: 'qaskills'");
    expect(source).toContain('version: VERSION');
  });
});
\`\`\`

Run this test before the build and repeat its live checks after packing. The [getting started guide](/getting-started) can frame the agent setup, but these test files should not rely on user accounts or API data.

Do not stop at text checks for full names. A stale string in a note could make them pass, while parsed field matches and a start reply prove the values each layer used.

## Test matrix for registry npm identifier test

A registry npm identifier test needs good, edge, bad JSON, and drift rows with exact proof. Each row should name the changed field, clean form, and clear error that blocks the release.

The table splits one allowed URL form from real name faults. It also keeps local pack checks apart from a later live read through the [official registry reference](https://registry.modelcontextprotocol.io/docs).

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| mcpName match | Committed manifests | server name equals package mcpName | Canonical names differ | packages/mcp/package.json and packages/mcp/server.json |
| mcpName case drift | Lowercase owner in a copy | Check rejects the copy | Exact namespace mismatch | packages/mcp/server.json |
| npm identifier match | First package entry | Identifier is @qaskills/mcp | Registry points to another artifact | packages/mcp/package.json |
| npm entry missing | Empty packages array | Check rejects the copy | Missing package index and clear field path | packages/mcp/server.json |
| repository syntax boundary | One final .git suffix | Normalized project URLs match | No failure for the allowed suffix | Both manifests |
| repository project drift | Different owner or project | Check rejects the copy | Normalized URLs differ | packages/mcp/package.json |
| package directory | Repository directory field | Value is packages/mcp | Package points to another folder | packages/mcp/package.json |
| runtime alias | Initialize serverInfo | Name is qaskills | Built server reports another alias | packages/mcp/src/index.ts |
| release version | Three metadata fields and initialize | One exact version appears everywhere | Any pair differs | All three evidence files |
| repeated run | Same immutable checkout | Result and diagnostics are identical | State mutation changes a later result | Test harness contract |

Edge tests should state one small rule. Accepting one .git end does not mean a test may drop the scheme, host, owner case, subpath, or other marks.

Bad JSON is a file fault, not a name split. Report the path and parse error first, then use field match errors only when valid JSON names the wrong pack.

Each run should leave the source and Git tree as they were. Hash both files before and after the bad-copy tests, or use structuredClone so each change stays in memory.

The [MCP contract testing guide](/blog/mcp-server-contract-testing-guide) can cover the full start call. This matrix gives that test the names and versions it should expect.

## What failures expose MCP repository metadata contract?

An MCP repository metadata contract fails when one valid field points to the wrong release. The worst case is a good npm publish plus a stale Registry row, since each side can look sound when checked on its own.

Change one field in each copied file. A wrong npm name should fail at server.packages[0].identifier, while a wrong full name should fail at server.name instead of a broad file snapshot.

Repo tests need two checks. The clean project URL must match, and the package file must keep folder packages/mcp so repo links open at the right pack.

A missing repo folder is not the same as blank text. The error should say that the pack path is absent, since that fix differs from a path that names the wrong folder.

Treat the current one-row packages list as a set rule. If a later server adds a second pack, change the row choice on purpose instead of letting index zero point at a new pack by chance.

The second sample changes only a server file held in memory and asks for one stable error. It also proves that the file in Git stays the same after the check fails.

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

function assertPackageLink(pkg: any, manifest: any): void {
  const actual = manifest.packages?.[0]?.identifier;
  if (actual !== pkg.name) {
    throw new Error(
      'server.packages[0].identifier: expected ' + pkg.name + ', received ' + actual,
    );
  }
}

it('rejects a split registry package without changing source', () => {
  const packagePath = resolve(process.cwd(), 'packages/mcp/package.json');
  const serverPath = resolve(process.cwd(), 'packages/mcp/server.json');
  const packageBefore = readFileSync(packagePath, 'utf8');
  const serverBefore = readFileSync(serverPath, 'utf8');
  const pkg = JSON.parse(packageBefore);
  const changed = structuredClone(JSON.parse(serverBefore));

  changed.packages[0].identifier = '@example/stale-mcp';

  expect(() => assertPackageLink(pkg, changed)).toThrowError(
    'server.packages[0].identifier: expected @qaskills/mcp, received @example/stale-mcp',
  );
  expect(readFileSync(packagePath, 'utf8')).toBe(packageBefore);
  expect(readFileSync(serverPath, 'utf8')).toBe(serverBefore);
});
\`\`\`

Do not send bad test files or fake owner data to the live Registry. Local copies give fixed fail cases, while a read-only check after release proves what the public row shows.

The [version drift guide](/blog/mcp-package-registry-version-drift-tests) owns deeper tag cases. This section keeps the npm pack, full name, repo, and run name in one file-data rule.

## CI coverage for package identity drift

Package identity drift should block the first write, not warn after both public stores change. Put fast file checks after checkout and setup but before npm publish or mcp-publisher publish.

Run the fast JSON checks on each change to packages/mcp/package.json, packages/mcp/server.json, packages/mcp/src/index.ts, or the release job. The command should show the bad path and both safe values without dumping the whole env.

Build and pack only after the file match succeeds. Start the packed bin through stdio, send the first MCP call, and compare its server name and version with the values in Git.

That child test should use one set MCP client and a short time cap. Keep stderr in its own stream because logs belong there, while plain text on stdout should fail the MCP link check.

Net rules differ by phase. File and packed-run tests need no Registry call, while the check after publish needs outbound access and should run only after the write reports success.

Keep the pack version, Git SHA, clean repo URL, npm name, full Registry name, run name, and bad field. Do not save access keys, full env maps, npm user setup, or OIDC claims in test files.

A Registry read with no row must fail in a different way from a row with wrong data. An empty pass is risky because a weak optional chain can skip all checks when the result is not there.

Mark file, build, start, and Registry read as four CI phases. That split shows whether the fault came from Git, old dist files, child start, or the public row.

MCP registry package identity testing should run for tags and hand-run releases with the same read-only first pass. The [blog index](/blog) has more release checks, but this gate should stay small enough for each package change.

Do not retry fixed field faults. Retry only capped net reads that fail with a brief service state, and keep the first and last result so a flaky Registry check cannot look clean.

## How should runtime server name test be asserted?

A runtime server name test must read serverInfo from the initialize response of the built or packed executable. Source text can guard intent, but only the protocol result proves which name and version a client actually receives.

Start the exact binary declared by package.json rather than importing an internal constant. For the packed artifact, install the tarball in an empty temporary project and invoke qaskills-mcp through its generated bin link.

Send initialize first, wait for its matching response ID, and then send the initialized notification. The protocol lifecycle makes that order observable, so a tools request before initialization should not be part of the positive fixture.

Assert serverInfo.name equals qaskills and serverInfo.version equals the package version used to pack. Also require a tools capability, because a random process could echo identity JSON without acting as the intended MCP server.

The runtime alias is intentionally shorter than the canonical registry name. Keep a named mapping in the test so a reviewer sees that difference as policy, not a forgotten mismatch.

Capture process exit, stderr, and every JSON-RPC frame on failure. Filter tokens and local paths before retention, but keep request IDs and message methods because they show whether parsing, startup, or identity failed.

Close stdin after the final assertion and wait for the child to exit. If it remains alive, send a bounded termination signal and fail cleanup, since leaked MCP processes can taint later runs.

Weak tests often check only that serverInfo exists. That assertion would accept a renamed fork, an old package, or a fixture server, so exact values and package provenance are required.

Repeat the check from the tarball rather than the workspace build. The [QASkills MCP page](/mcp) may work from current source while a published archive still contains old dist files.

MCP registry package identity testing is complete only when this runtime record joins the metadata record. Store both under one release ID, then compare them before the public registry write begins.

## Step-by-step test implementation

Implement the suite in six stages that move from cheap file checks to observable release evidence. Each stage should stop on failure, preserve safe diagnostics, and leave committed metadata unchanged.

1. Read packages/mcp/package.json, packages/mcp/server.json, and packages/mcp/src/index.ts from one immutable checkout. Record the package name, mcpName, versions, repository fields, bin path, runtime alias, and VERSION source.
2. Build copied fixtures for mcpName server name parity and the registry npm identifier test. Change one valid field in each copy, label the expected diagnostic path, and hash the committed inputs before execution.
3. Parse both JSON files and apply role-aware comparisons. Normalize only a final .git and slash for repository URLs, then compare owner case, project, package directory, npm name, canonical name, and versions exactly.
4. Build and pack the MCP package after static checks pass. Install that tarball in an empty temporary project, launch its declared bin, and assert initialize returns qaskills with the same release version.
5. Run copied negative cases and require stable field-level failures. Confirm no missing package entry, parse error, or empty registry result can bypass assertions, then verify source hashes remain unchanged.
6. Add the focused suite before release write steps and a read-only public lookup after publication. Save the safe identity record, clean every temporary folder and process, and route each failure to its owning layer.

Use a temporary directory outside the workspace for packed tests. This prevents node_modules resolution from selecting the local package and turning a stale tarball check into a workspace pass.

Pin the package version in the smoke command and record the generated tarball hash. A latest tag can move between pack and probe, which breaks repeatability even when every field is valid.

Run preflight tests without API credentials because initialize and identity need no QASkills data call. That choice reduces secret exposure and proves identity before unrelated service health enters the result.

The [getting started page](/getting-started) helps teams place the check in an agent workflow. The actual gate should still run as a plain test command that works without an editor or interactive client.

## Failure triage and regression ownership

Triage begins with the earliest failed observation, because later mismatches may only be effects. A JSON parse failure belongs to the manifest owner, while a parsed field mismatch belongs to package or registry metadata ownership.

If package name, mcpName, directory, or repository URL fails before build, assign the package maintainer. Include the exact field path and expected mapping, then avoid opening a protocol issue for data the runtime never read.

If static files pass but initialize reports an old version, inspect dist freshness, bin resolution, and tarball contents. The build or release owner should compare artifact hash and package version before changing server code.

If runtime name differs while version matches, inspect the McpServer constructor in packages/mcp/src/index.ts. That is an MCP package regression unless an approved naming policy changed.

If the packed runtime passes but the public record is absent, inspect publisher status, namespace authorization, and registry response. Keep this with release workflow ownership rather than the web API team.

If the public row exists with a wrong npm identifier or repository, compare the submitted packages/mcp/server.json with the returned record. A stale registry submission or unexpected registry transform needs the publisher and registry evidence together.

The web API does not define package identity. Do not route these failures to search or skill endpoints unless a separate tool call proves an API defect after identity has passed.

Client configuration owns only cases where it launches another command, package spec, or version. Record resolved command and arguments, then reproduce with the same packed binary outside that client.

Use the [QA skills directory](/skills) to assign a reusable release-check skill after ownership is clear. Keep the regression fixture beside the layer that failed so future edits trigger the narrowest useful suite.

Close triage with one of four states: source mismatch, artifact mismatch, runtime mismatch, or public record mismatch. That label makes trend reports useful without hiding the exact field-level evidence.

## Frequently Asked Questions

### How can CI prove every MCP identity field describes one package?

MCP registry package identity testing should parse both manifests, normalize only the allowed repository suffix, inspect the runtime constructor, and probe initialize from the packed binary. CI passes when canonical name, npm package, versions, repository, directory, runtime alias, and public record form one approved chain.

### Should mcpName server name parity require identical runtime names?

No, mcpName server name parity should reflect each field's role rather than force one literal value everywhere. For QASkills, server.json name equals mcpName, while initialize reports the approved short alias qaskills; the test must assert that named mapping and reject every unapproved value.

### What does a registry npm identifier test reject?

A registry npm identifier test rejects a missing package entry, another npm scope, a stale package name, or an extra distribution selected without policy. It should report server.packages[0].identifier, show the safe expected and actual values, and never pass when the packages array is empty.

### Why does the MCP repository metadata contract normalize URLs?

The MCP repository metadata contract permits the committed package URL's final .git suffix while server.json omits it. Tests should remove only that suffix and a trailing slash, then compare protocol, host, owner case, project name, and the separate packages/mcp directory without broader rewriting.

### What is the best signal for package identity drift?

The best package identity drift signal joins exact source comparisons with initialize data from the packed artifact and a read-only registry lookup. That record reveals whether drift began in metadata, build output, runtime startup, or publication, while a single string search cannot locate the responsible layer.

## Conclusion

MCP registry package identity testing turns several plausible files into one release contract. Exact role mappings, a packed initialize probe, safe negative fixtures, and a public lookup prevent a split package from passing through isolated green checks.

Review the [QASkills MCP integration](/mcp), then browse verified agent guidance in the [QA skills directory](/skills). Apply this identity matrix before the next MCP release, and keep its evidence beside the tag that produced the package.`,
};
