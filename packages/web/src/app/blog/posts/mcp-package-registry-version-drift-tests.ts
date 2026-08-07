import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP Package Version Drift Testing',
  description:
    'MCP package version drift testing compares package.json, server.json, runtime identity, user-agent headers, semantic versions, and publish artifacts.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP package version drift testing',
  keywords: [
    'MCP package version drift testing',
    'MCP registry manifest version',
    'package.json version parity',
    'MCP runtime version',
    'MCP user-agent version',
    'semantic version validation',
    'MCP publish artifact test',
    'registry release consistency',
  ],
  relatedSlugs: [
    'mcp-api-timeout-abortcontroller-testing',
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-search-response-normalization-contract-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: [
    'https://modelcontextprotocol.io/registry/versioning',
    'https://modelcontextprotocol.io/registry/quickstart',
    'https://semver.org/',
  ],
  content: `
MCP package version drift testing compares every release identity before npm or registry publication begins. The suite must align package metadata, registry metadata, runtime server identity, HTTP user-agent text, git tag, and packed files so one release cannot advertise different versions to clients and operators.

QASkills currently reads \`VERSION\` from \`packages/mcp/package.json\`, uses it in the MCP server constructor and user-agent header, and repeats it in \`server.json\`. Those values are all \`0.1.2\` in the current source, but only executable parity checks keep the next release aligned. The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) covers the full package.

## What Is an MCP Registry Manifest Version?

An MCP registry manifest version identifies the server release described by \`server.json\`. The QASkills manifest has a top-level \`version\` and a package entry whose \`version\` selects the npm artifact. Both need to refer to the same release as \`@qaskills/mcp\`.

The manifest also names the server \`io.github.PramodDutta/qaskills\`, declares npm as the registry type, points to \`@qaskills/mcp\`, describes stdio transport, and lists \`QASKILLS_API_URL\`. Version parity alone cannot prove all metadata is valid, but it is the first release identity check.

The official [MCP Registry versioning documentation](https://modelcontextprotocol.io/registry/versioning) explains that server versions are immutable and use semantic versioning. A changed package should therefore receive a new version instead of replacing the bytes associated with an existing registry release.

An MCP registry manifest version can drift in two places. A developer may bump \`package.json\` but miss the top-level manifest value, or update the top-level value while leaving \`packages[0].version\` stale. Test every declared package entry rather than assuming only one copy exists forever.

| Version surface | Current source | Consumer | Failure if stale |
| --- | --- | --- | --- |
| npm package | \`package.json.version\` | npm and runtime import | Wrong artifact or runtime identity |
| Registry server | \`server.json.version\` | MCP Registry | Registry advertises older release |
| Registry package | \`server.json.packages[].version\` | Registry installer | Installer resolves different npm version |
| Runtime server | \`McpServer({ version })\` | MCP client initialize flow | Client reports another version |
| HTTP header | \`User-Agent: @qaskills/mcp/<version>\` | QASkills API logs | Requests cannot be tied to release |
| Git tag | \`mcp-v<version>\` | GitHub Actions trigger | Source revision and published version separate |

MCP package version drift testing should compare values and identities. A matching number attached to the wrong npm identifier is still a broken release. Include name, registry type, and package identifier in the same manifest test.

## How Do You Check package.json Version Parity?

Package.json version parity starts with one canonical value. In QASkills, \`packages/mcp/package.json\` is the source read by production code and by the npm publish step. The manifest should depend on that value, either through generation or through a parity test.

Import both JSON files in a Node test and compare top-level and package-entry versions. Also require that the manifest package identifier equals the npm package name. This catches a copy from a renamed package where the versions happen to match.

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { name: string; version: string };

const serverJson = JSON.parse(
  readFileSync(new URL('../server.json', import.meta.url), 'utf8'),
) as {
  version: string;
  packages: Array<{
    registryType: string;
    identifier: string;
    version: string;
  }>;
};

describe('MCP release identity', () => {
  it('keeps package and registry manifest versions equal', () => {
    expect(serverJson.version).toBe(packageJson.version);
    expect(serverJson.packages).toHaveLength(1);
    expect(serverJson.packages[0]).toMatchObject({
      registryType: 'npm',
      identifier: packageJson.name,
      version: packageJson.version,
    });
  });
});
\`\`\`

This test belongs in the MCP package, where relative paths remain stable in local and CI runs. Run it before build so a stale manifest blocks work early, and run an artifact form after packing because publish inclusion can differ from the source tree.

Do not derive the expected version from a hard-coded test string such as \`0.1.2\`. That creates a third copy requiring manual updates. Compare independent release surfaces to the canonical package value, then use a separate semantic version assertion for format.

MCP package version drift testing can also validate the workflow tag. Parse \`GITHUB_REF_NAME\` in CI and require \`mcp-v\${packageJson.version}\`. A tag named \`mcp-v0.1.3\` should never publish source whose package still says \`0.1.2\`.

The [MCP Registry quickstart](https://modelcontextprotocol.io/registry/quickstart) describes manifest validation and publication flow. Use the registry's validation tool in addition to local parity tests because local equality cannot detect every schema error.

## How Do You Assert the MCP Runtime Version?

The MCP runtime version is the value passed to the \`McpServer\` constructor. QASkills assigns \`VERSION\` with \`require('../package.json').version\`, then creates the server with name \`qaskills\` and that version. This is a good single-source pattern if the bundled path still resolves.

Capture constructor arguments with a module mock. Mock stdio transport as well so importing the entry point does not open a real protocol session. The assertion should compare captured version with the package JSON loaded by the test.

\`\`\`typescript
import { beforeEach, expect, it, vi } from 'vitest';
import packageJson from '../package.json';

const constructorCalls: unknown[] = [];

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    constructor(identity: unknown) {
      constructorCalls.push(identity);
    }
    registerTool() {}
    connect() {
      return Promise.resolve();
    }
  },
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: class {},
}));

it('uses the package version for runtime identity', async () => {
  constructorCalls.length = 0;
  await import('../src/index');

  expect(constructorCalls[0]).toEqual({
    name: 'qaskills',
    version: packageJson.version,
  });
});
\`\`\`

Module caching requires a reset before imports with new mocks, or a pure exported identity function. Do not run multiple copies of \`main()\` in the same process unintentionally.

MCP package version drift testing should repeat this assertion against built JavaScript. Bundlers can rewrite \`require\` paths, inline stale JSON, or omit files. Start the packed executable through an MCP client harness and inspect its initialize response when practical.

The runtime name is not the registry name. QASkills uses \`qaskills\` in the MCP server identity and \`io.github.PramodDutta/qaskills\` in the registry. Tests should preserve this deliberate distinction while tying both to the same release version.

Use the [MCP server contract testing guide](/blog/mcp-server-contract-testing-guide) for initialize and tool-level protocol checks. This article focuses on the release number carried through that exchange.

## How Do You Verify the MCP User-Agent Version?

The MCP user-agent version appears on every QASkills API request. The current header is \`@qaskills/mcp/\${VERSION}\`, merged before caller-supplied headers. This lets API logs group requests by server package and helps diagnose old clients.

Mock fetch, invoke a tool, and inspect the \`headers\` passed to fetch. Compare the header with the package value rather than a literal release. Also cover a request with custom headers because the helper spreads \`init.headers\` last, allowing a caller to override \`User-Agent\`.

\`\`\`typescript
it('sends the package version in the API user-agent', async () => {
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify({ total: 0, skills: [] }), { status: 200 }),
  );

  await invokeSearchTool({ query: 'playwright', limit: 10 });

  const init = mockFetch.mock.calls[0][1] as RequestInit;
  expect(init.headers).toMatchObject({
    'User-Agent': \`@qaskills/mcp/\${packageJson.version}\`,
  });
});
\`\`\`

This is an MCP user-agent version contract, not a guarantee that every intermediary preserves the header. It proves the package creates the intended request. A local HTTP integration can inspect received headers if fetch implementation differences matter.

MCP package version drift testing should also inspect telemetry payloads, which currently send \`cliVersion: mcp-\${VERSION}\`. Although that field is not part of the brief's header surface, it is another release identity copied from the same constant. One test can prove both values share the package version.

Avoid recording user-agent values as high-cardinality permanent metrics without a retention plan. Version labels are useful for adoption and failure analysis, but raw request URLs may include search terms. Keep identity evidence separate from sensitive query data.

The [MCP API timeout testing guide](/blog/mcp-api-timeout-abortcontroller-testing) covers the same fetch helper's deadline behavior. Run both suites when changing headers because a refactor in \`fetchWithTimeout\` can affect identity and cancellation together.

## How Do You Add Semantic Version Validation?

Semantic version validation checks format and release ordering. QASkills currently uses \`0.1.2\`, which has major, minor, and patch components. The project can validate package and manifest strings with a trusted SemVer library or a carefully scoped test dependency.

The official [Semantic Versioning specification](https://semver.org/) defines the \`MAJOR.MINOR.PATCH\` form, prerelease identifiers, and build metadata. Do not use a simple three-number regex if the package plans to publish prereleases such as \`0.2.0-beta.1\`.

Test each version string independently before comparing equality. Two invalid values can be equal, so parity alone is insufficient. Also reject a leading \`v\` inside JSON values because the tag prefix belongs to git, not the package version.

\`\`\`typescript
import semver from 'semver';

it('uses valid and equal semantic versions', () => {
  const values = [
    packageJson.version,
    serverJson.version,
    ...serverJson.packages.map((entry) => entry.version),
  ];

  for (const value of values) {
    expect(semver.valid(value), \`invalid release version: \${value}\`).toBe(value);
  }

  expect(new Set(values)).toEqual(new Set([packageJson.version]));
});
\`\`\`

If adding \`semver\` solely for one assertion is undesirable, use npm's own package validation during \`npm pack --dry-run\` and retain a small local parser. The key is one behavior that understands the version forms the project actually permits.

MCP package version drift testing should decide how prereleases enter the registry. A prerelease npm package and stable registry manifest must not share one version claim. Add channel rules for tags such as \`next\` if prereleases become part of the workflow.

Version order matters because registries are immutable, so follow bad \`0.1.3\` with fixed \`0.1.4\`. Tests and release notes should reflect that operational rule.

## What Belongs in an MCP Publish Artifact Test?

An MCP publish artifact test inspects the exact tarball that npm will receive. Source-tree parity can pass while \`files\`, ignore rules, build output, or stale generated files produce a different package. Packing before publish closes that gap.

Run \`pnpm --filter @qaskills/mcp pack\` or \`npm pack --json\` in a temporary directory. List the tarball, extract \`package/package.json\`, and start the bundled executable with a captured MCP initialize request. Verify the same version at each stage.

The QASkills package publishes \`dist\` and \`README.md\`. Its runtime code reads package JSON one directory above \`dist/index.js\`, and npm always includes package JSON. The artifact test should confirm that relationship rather than assuming source layout and package layout match.

| Artifact assertion | Why it matters | Failure example |
| --- | --- | --- |
| Tarball package version | npm identity | Source bumped but pack used stale workspace |
| Dist executable exists | Binary can start | Build skipped before pack |
| Bin target matches dist file | \`npx\` can launch | Package bin points to missing path |
| Runtime initialize version | Bundled code reads correct JSON | Build inlined older value |
| User-agent version | Requests identify artifact | Header literal was not updated |
| Registry package version | Manifest selects same tarball | Server JSON points to prior npm release |

Do not publish during this test. Packing is local and repeatable, while registry writes are permanent. The publish job should depend on the artifact test and reuse the same commit, package version, and build command.

MCP package version drift testing benefits from a checksum for the packed file, but the checksum proves byte identity, not semantic correctness. Store it as release evidence after all version assertions pass.

The [MCP Registry quickstart](https://modelcontextprotocol.io/registry/quickstart) includes the registry publisher flow. Run its validation against \`server.json\` before authentication or publish so a schema issue fails without side effects.

Build each tarball in a new temp path because old files can make a bad build look complete. List the tarball files and save that list with the test report. The list should show package JSON, the readme, and the built bin path.

Next, unpack the tarball into another clean path and run the bin from there. Run only the packed bin, which should answer an MCP start call with its tarball version. This proves the packed layout and runtime read work as one unit.

Use a local stub for the QASkills API during the packed test. Ask the server to list categories or search for one fake skill. Capture the user-agent at the stub and compare it with the tarball version, with no live site needed.

Keep the tarball after a failed CI run when policy allows it. A maintainer can inspect bad files after a failure, while passed runs keep the file list and checksum.

The [CI testing pipeline guide](/blog/cicd-testing-pipeline-github-actions) shows how to pass one built file between jobs. Use one artifact from test through publish, rather than making a new tarball after checks pass. Reuse removes a gap where the tested bytes and published bytes may differ.

## How Do You Enforce Registry Release Consistency?

Registry release consistency ties source, tag, npm package, and MCP Registry entry into one ordered workflow. QASkills publishes on tags matching \`mcp-v*\`, builds the MCP package, publishes npm when that version is absent, then runs \`mcp-publisher publish\`.

The present workflow derives \`V\` from package JSON for npm lookup. Add an early script that compares \`GITHUB_REF_NAME\`, package JSON, server JSON, and registry package entries. That script must run before the "already on npm" shortcut because a stale manifest should fail even when npm contains the package.

Use these release gates:

1. Parse the git tag and require the exact \`mcp-v\${packageVersion}\` form.
2. Validate every JSON version as semantic version text and compare all values.
3. Build MCP output from a clean checkout with the lockfile honored.
4. Pack the npm artifact, inspect files, and run runtime identity and header tests.
5. Validate \`server.json\` with the registry publisher without publishing.
6. Publish the already-tested version to npm, or verify an existing immutable copy has the expected provenance.
7. Publish the matching registry manifest only after npm resolution succeeds.

Save package name, version, git SHA, tag, tarball checksum, npm result, and registry result. A release report that says only "publish passed" cannot explain a partial failure between npm and the MCP Registry.

MCP package version drift testing should fail closed if the tag is unavailable in a manual run. A manual workflow can accept an explicit version input, but it must compare that input with the same canonical package value.

The [MCP Registry guide for QA teams](/blog/mcp-registry-qa-teams-guide-2026) provides broader discovery and governance context. Use this parity gate as the concrete release evidence behind that policy.

Split the workflow into clear check, pack, npm, and registry jobs, with source reads in the check job. The pack job builds once and uploads the tested tarball. The two publish jobs must use that same proof and commit.

Before registry work starts, resolve the exact npm package version and check its name after the command passes. If the package was already there, record that fact and verify the release still points to the intended source. A skip is not the same as a fresh publish.

Keep write rights from the first two jobs because source checks and packing need no registry token. This cuts risk when a test script or build tool has a fault. Add credentials only to the one job that needs each write.

Use a job summary that shows every version in one row. Show the tag, source package, server manifest, packed package, runtime, npm, and registry values. A green mark means exact match, while any blank value blocks due to missing proof.

The broader [MCP server testing guide](/blog/mcp-server-testing-guide-2026) can cover startup and tool calls for the packed bin. Keep this version suite focused on identity, while the server suite checks useful behavior. Both should run before the first write job.

## Run the Version Procedure

Run source checks first, artifact checks second, and external publication last. Each phase should consume the same canonical package version and emit evidence for the next phase.

1. Read package and server JSON from the checked-out commit, then compare names and every version copy.
2. Validate semantic version syntax and compare the workflow tag with \`mcp-v\${version}\`.
3. Capture the MCP constructor identity and fetch user-agent through production entry-point tests.
4. Build the package, create a local tarball, and inspect its package JSON, binary target, and files.
5. Start the packed server through an MCP harness and verify the initialize version.
6. Run registry manifest validation, then store the validated manifest with the tarball checksum.
7. Permit npm and MCP Registry publication only when all evidence names the same commit and version.

Keep the procedure non-interactive until credentials are required. Version mismatch should fail before login, network writes, or publication. That order makes reruns safe and reduces partially published releases.

Add the suite to path filters for \`packages/mcp/**\`, the MCP publish workflow, and shared build config. A tooling update can alter packed output without editing package source. The [MCP conformance baseline guide](/blog/mcp-conformance-github-actions-baseline-2026) can host the surrounding CI pattern.

## How Do You Diagnose Partial Releases?

A partial release exists when npm and the MCP Registry do not agree about availability. If npm has the new version but registry publication fails, do not mutate the npm package. Fix the manifest or credentials, rerun validation from the same commit, and publish the same registry version.

If the registry points to an npm version that does not exist, stop and publish the missing immutable package only if the tested source and tag are still valid. Otherwise create a new version rather than point a published version number to unrelated bytes.

If runtime identity differs despite matching JSON files, inspect the packed dist output and module path. A stale build cache may have copied older JavaScript, or the bundler may have inlined a value. Rebuild from a clean checkout and compare tarball checksums.

If the user-agent differs while runtime identity matches, inspect header construction and caller overrides. The current helper lets \`init.headers\` override its default header. A future internal caller could therefore send a stale literal even though the constructor is correct.

MCP package version drift testing should print all observed values in one failure report. Hunting through separate jobs wastes time and increases pressure to rerun publication blindly. Keep external retry steps manual until the mismatch is understood.

For an npm-only state, keep the same source commit and rerun just the registry checks. Do not bump the version unless source bytes must change. The report should say that npm is complete and the registry is pending. This avoids a second package that differs only due to retry.

For a registry-only claim that points to a missing package, block installs and alert the release owner. Check whether npm is still processing the new version before any new step. If the package cannot be made available from the tested bytes, issue a new fixed release with a new version.

For a tag mismatch, stop before build because moving a public source tag can break later audits. Create the right tag on the right commit instead of forcing JSON to match a bad tag. The next run should start with a clean checkout.

For a packed runtime mismatch, clear build output and run the build from scratch. Then compare the new file list and checksum with the failed run. A changed checksum proves stale output, while no change points to lookup or harness code.

## Apply MCP Package Version Drift Testing

MCP package version drift testing is complete when source JSON, runtime identity, user-agent, telemetry version, git tag, tarball, npm package, and registry manifest all name one semantic version across each job that reads or ships the artifact. The checks should finish before any permanent publish action and retain commit-linked evidence.

Add this release gate beside the [MCP conformance baseline](/blog/mcp-conformance-github-actions-baseline-2026), then explore reusable QA release skills in [QASkills](/skills). The verified [Playwright CLI skill](/skills/Pramod/playwright-cli) can verify public installation flows after package and registry identities agree.

## Frequently Asked Questions

### Which file should be the canonical version source?

For QASkills MCP, \`packages/mcp/package.json\` is the practical source because npm, runtime code, and the publish workflow already read it. Generate other files from it or compare them in CI. Avoid a hard-coded expected version in tests because that creates another manual copy.

### Is matching package.json and server.json enough?

No. Built code, the user-agent, git tag, tarball metadata, npm publication, and registry package entry can still differ after packing. Source parity starts the gate, while direct artifact and registry checks prove the exact version that real users actually receive.

### Should the test allow prerelease versions?

Allow them only if the release policy defines npm tags and MCP Registry behavior for prereleases. Use a full semantic version parser rather than a three-number regex. Test that prerelease package, manifest, tag, and channel agree before publishing any immutable artifact.

### What happens if npm publish succeeds but registry publish fails?

Keep the npm version unchanged, repair the registry problem, and rerun from the same tested commit. Because versions are immutable, do not overwrite package bytes. If source changes are required, bump to a new version and run the entire parity procedure again.

### Why inspect the packed artifact instead of only dist?

The tarball applies package \`files\`, ignore rules, bin paths, and npm metadata. A correct local dist can still be absent or paired with stale package data in the artifact. Packing locally lets CI test the exact file layout before permanent publication.

### Should the runtime name equal the registry name?

Not necessarily. QASkills uses a short runtime name and a namespaced registry identity. The test should preserve each intended name while requiring one version. Treat name mapping and version parity as separate assertions so a valid naming distinction does not hide a stale release.
`,
};
