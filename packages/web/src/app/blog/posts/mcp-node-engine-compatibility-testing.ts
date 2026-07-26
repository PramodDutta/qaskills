import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP Node engine compatibility testing',
  description:
    'MCP Node engine compatibility testing with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP Node engine compatibility testing',
  keywords: [
    'MCP Node engine compatibility testing',
    'MCP Node 20 smoke test',
    'npm engines compatibility',
    'Node fetch runtime test',
    'minimum Node version CI',
    'MCP runtime version matrix',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-package-registry-version-drift-tests',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://nodejs.org/api/packages.html',
    'https://nodejs.org/api/globals.html#fetch',
    'https://docs.npmjs.com/cli/v11/configuring-npm/package-json/',
  ],
  repoEvidence: [
    'packages/mcp/package.json',
    '.github/workflows/mcp-publish.yml',
    'packages/mcp/src/index.ts',
  ],
  content: `MCP Node engine compatibility testing must install and run the packed server on Node 20, the declared minimum, while exercising fetch, URL, abort, and file paths. A complete protocol and install result proves support. Syntax errors, missing globals, lookup faults, or a result that passes only on newer Node disproves it.

## What must MCP Node engine compatibility testing prove?

MCP Node engine compatibility testing must prove that the packed file users install works on the oldest runtime the package promises. Metadata, compilation, and a newer developer machine cannot establish that behavioral claim by themselves.

The tested unit is the packed npm file, not a TypeScript import from the monorepo. Packing exposes file inclusion, CommonJS output, dependency declarations, bin mapping, and runtime lookup together.

Start the pack with Node 20 and complete initialize plus tools/list. Then invoke one read path that uses \`URL\`, \`fetch\`, \`AbortController\`, request headers, and response parsing against a local HTTP fixture.

Finish with an install path inside a temp project. That operation adds \`node:fs/promises\`, path lookup, folder creation, file writing, and current working folder rules to the compatibility proof.

The pass signal combines exact protocol output, one controlled HTTP request, exact installed bytes, and a clean child exit. A process that merely prints its version does not reach the runtime features most likely to drift.

Run the same contract on a current supported Node release as a comparison. When only Node 20 fails, the differential points toward a language feature, global API, dependency export, or platform assumption.

The [QASkills MCP page](/mcp) gives users the distributed launch command. CI should reproduce that boundary from a clean install rather than relying on workspace links.

MCP Node engine compatibility testing covers the declared floor, not every obsolete release. Node 18 rejection can be checked separately as package-manager guidance, but it is not a supported execution target.

## Which repository behavior defines the contract?

The \`engines.node\` field in \`packages/mcp/package.json\` is \`>=20\`. That exact range is a public install claim and should remain synchronized with the runtime used for release validation.

The package maps its command to \`./dist/index.js\`, includes \`dist\` and \`README.md\`, and declares only the MCP SDK plus Zod as runtime dependencies. A clean tarball install must resolve all three layers without root workspace help.

The publish job in \`.github/workflows/mcp-publish.yml\` configures \`actions/setup-node\` with \`node-version: 20\`. It then installs dependencies, builds the MCP package, and publishes the result.

That workflow proves the source currently compiles during a Node 20 job, but compilation is not a complete runtime check. The job does not visibly launch the packed binary or call its network and file paths before publication.

Live code in \`packages/mcp/src/index.ts\` creates URLs, calls global fetch, creates an \`AbortController\`, schedules and clears timers, and uses promise-based file methods. Those are concrete capability checks for a minimum runtime case.

The [Node fetch reference](https://nodejs.org/api/globals.html#fetch) lists fetch as a built-in global on the tested runtime. The smoke still calls the QASkills path because the presence of a global alone cannot prove correct use.

The source also loads package metadata with \`require('../package.json')\` from a CJS bundle. Tarball layout and runtime module lookup therefore matter alongside JavaScript syntax support.

The [Node package documentation](https://nodejs.org/api/packages.html) describes how Node interprets package entry points and module markers. It supports assertions about the pack boundary without changing the QASkills bin contract.

The [npm package.json documentation](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/) defines the role of engines as a declared compatibility range. Tests still need to run the pack because package managers may treat that field as advisory.

Read the [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) for ordinary setup. Keep the compatibility oracle anchored to the committed range, workflow runtime, and bin features instead of a local shell default.

MCP Node engine compatibility testing should print all three versions on failure: requested Node, actual \`process.version\`, and package version. That evidence catches matrix or env mistakes before product diagnosis begins.

## How should QA teams test MCP Node 20 smoke test?

An MCP Node 20 smoke test should run in an env whose interpreter is independently verified. Assert \`process.versions.node\` starts with \`20.\` before installing or launching anything.

Build and pack the package once under the intended release conditions. Record the generated tarball name and checksum, then install that same file into separate clean projects for each runtime row.

Avoid testing a workspace dependency symlink. Package managers can resolve local modules and source files through the repository, masking files or dependencies omitted from the tarball.

Start a local HTTP server on an assigned ephemeral port. Return deterministic JSON for \`/api/skills\`, controlled Markdown for a content endpoint, and fail every unexpected method or pathname.

Launch the installed bin through the row's Node bin with \`QASKILLS_API_URL\` set to that fixture. Complete initialization before sending tool requests, just as an MCP host would.

Invoke \`search_skills\` first and compare its normalized result. This covers URL search parameters, fetch headers, status handling, JSON parsing, and SDK message transport under Node 20.

Invoke \`install_skill\` next with an explicit target under the temp project. Assert exact \`SKILL.md\` bytes, resolved path, success text, and the expected optional telemetry request.

MCP Node engine compatibility testing should close stdin and require a normal exit after both calls. A successful tool result with an active timer or open handle still creates a runtime compatibility defect.

Use the [package registry drift tests](/blog/mcp-package-registry-version-drift-tests) to compare published versions after this local contract passes. Registry identity and Node result are related release checks, but they need distinct failure messages.

Run Node 20 and the current release from identical harness code and tarball bytes. Differences in fixtures or assertion libraries can produce a false version-specific result.

## Test matrix for npm engines compatibility

The npm engines compatibility matrix should separate declared support, current support, and intentional rejection. It also needs direct capability rows because startup alone may leave important code paths untouched.

Use an exact pack checksum across supported rows. Repacking under each Node version would mix build reproducibility with runtime compatibility and make the comparison harder to interpret.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Declared minimum | Packed artifact under Node 20 | Initialize, tools/list, search, install, and exit succeed | Any minimum-only runtime failure | \`packages/mcp/package.json\` |
| Current Node | Same tarball under current active LTS | Same semantic results as Node 20 | Divergent result or artifact handling | Node package behavior |
| Unsupported Node | Install attempt under Node 18 | Package manager reports engine mismatch when strict mode is enabled | Test claims Node 18 support | npm engines behavior |
| Fetch path | Local search response under Node 20 | Request contains expected URL and user agent | Missing global or malformed request | \`packages/mcp/src/index.ts\` |
| Abort path | Fixture never responds | Stable timeout error after configured deadline | Missing AbortController or endless request | \`packages/mcp/src/index.ts\` |
| URL path | Base URL has a trailing slash and query inputs | One normalized URL with encoded parameters | Duplicate slash or bad encoding | \`packages/mcp/src/index.ts\` |
| Filesystem path | Install into a clean temporary target | Exact directories and SKILL.md are created | Resolution or write differs by runtime | \`packages/mcp/src/index.ts\` |
| Package layout | Execute installed \`qaskills-mcp\` bin | Bundle reads adjacent package version | Missing manifest or source-only import | \`packages/mcp/package.json\` |

Treat an engine warning and an execution pass as separate observations. The package promises Node 20 or newer, while package-manager enforcement can vary with setup.

The unsupported row confirms test setup, not product result. It should not block a release solely because a non-strict package manager permits install before the command later rejects or fails.

The timeout row is especially useful because fetch availability alone does not prove compatible abort result. Use fake timers only for unit coverage; the packed smoke should measure a short real deadline around a local stalled socket.

The [getting started page](/getting-started) can document supported setup. CI reports should state that the matrix validates \`>=20\`, preventing support teams from reading an accidental Node 18 outcome as a promise.

MCP Node engine compatibility testing passes only when all supported rows share the same semantic result. Different stack traces are acceptable, but values, side effects, and cleanup must remain stable.

## What failures expose Node fetch runtime test?

A Node fetch runtime test should force production request construction rather than calling global fetch directly. Invoke a registered MCP tool so the test covers \`buildUrl\`, \`fetchWithTimeout\`, headers, error mapping, and result formatting.

Capture method, pathname, query values, headers, and body at the local fixture. Assert only the contract used by the MCP source, avoiding incidental defaults added by different Node fetch implementations.

For search, expect GET, the selected query fields, a numeric limit, and a user agent containing the package version. The response should omit \`fullDescription\` concerns because search normalization has its own exact field set.

Return a non-OK response with controlled text. The tool result must report the status, URL, and body detail without crashing the child or changing stdout framing.

Then hold one response open to exercise the abort branch. Require the repository's timeout message and verify the fixture socket closes, the timer clears, and the process remains able to answer a later tools/list request.

The first code example protects the declared minimum and distributed entry. It reads committed metadata rather than duplicating values in test constants.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

test('declares Node 20 and a packaged command', async () => {
  const raw = await readFile('packages/mcp/package.json', 'utf8');
  const manifest = JSON.parse(raw);

  expect(manifest.engines).toEqual({ node: '>=20' });
  expect(manifest.bin).toEqual({ 'qaskills-mcp': './dist/index.js' });
  expect(manifest.files).toEqual(['dist', 'README.md']);
  expect(Object.keys(manifest.dependencies).sort()).toEqual([
    '@modelcontextprotocol/sdk',
    'zod',
  ]);
});
\`\`\`

This metadata test fails early when the public floor or package layout changes. It does not replace the runtime case, because matching strings cannot prove the installed command works.

For a runtime result, compare normalized MCP content instead of raw JSON key order. Preserve the full raw response only as a failure log for diagnosing SDK or fetch differences.

MCP Node engine compatibility testing should also assert that no real QASkills hostname was contacted. A fixture mistake that reaches production can pass locally while making the version row nondeterministic.

## CI coverage for minimum Node version CI

Minimum Node version CI needs an explicit matrix row named for the declared floor. A generic setup action using a floating LTS label can move forward and silently stop testing Node 20.

The committed workflow already uses Node 20 for build and publish. Add the behavioral gate before publication conceptually, and ensure its failure prevents both npm and registry release steps.

Keep the packed tarball as a build file between build and runtime jobs when practical. Its checksum proves every row tested the same package that a later release step would publish.

The second code example checks the existing workflow's runtime pin and critical order. It detects a future move to a newer builder that leaves package engines unchanged.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { expect, test } from 'vitest';

test('builds the MCP release with the declared minimum Node', async () => {
  const workflow = parse(await readFile('.github/workflows/mcp-publish.yml', 'utf8'));
  const steps = workflow.jobs.publish.steps;
  const setup = steps.find((step: { uses?: string }) =>
    step.uses?.startsWith('actions/setup-node@'),
  );

  expect(setup.with['node-version']).toBe(20);
  expect(steps.findIndex((step: { name?: string }) => step.name === 'Build MCP server')).toBeLessThan(
    steps.findIndex((step: { name?: string }) => step.name === 'Publish to npm'),
  );
  expect(workflow.jobs.publish.permissions['id-token']).toBe('write');
});
\`\`\`

Run metadata checks quickly on every MCP change, then run packed Node 20 and current rows after build. A nightly-only minimum test leaves too much room for an incompatible dependency to merge.

Pin the major Node row but print the full patch version selected by the runner. Patch differences can matter when diagnosing native APIs, certificates, or changes in bundled web APIs.

Cache package downloads without caching the installed temp project. A reused \`node_modules\` tree can retain dependencies from another runtime and hide install-time engine or export problems.

Keep local HTTP traces, child stderr, Node versions, package checksum, and installed file hash for failed rows. Do not retain successful temp homes because their state adds little proof.

Use the [QASkills blog](/blog) to locate adjacent CI contracts, while this gate remains responsible only for the supported runtime claim. Test ownership stays clear when registry outages cannot fail Node compatibility.

MCP Node engine compatibility testing should block release for any Node 20 regression. A current-Node pass is diagnostic evidence, not permission to violate the published minimum.

## How should MCP runtime version matrix be asserted?

An MCP runtime version matrix should compare semantic outcomes across rows, not merely separate exit codes. Capture one normalized record containing server identity, tool names, search result, installed bytes, request trace, and final process state.

Use Node 20 as the baseline because it defines the lower promise. Compare each newer supported row against that baseline after removing runtime version and nondeterministic temp paths.

Exact tool names and result fields should match. Header casing, JSON key order, socket ports, and error stack formatting should be normalized or excluded unless the repository owns them.

Assert the active bin from inside each child. A matrix label can say Node 20 while path ordering still launches a machine-wide newer interpreter.

Check that the child has no special loaders, transpilers, or workspace-related \`NODE_PATH\`. Those helpers alter module lookup and can make unsupported syntax or undeclared imports appear valid.

Use one local fixture server shared only when requests are tagged by row and cannot overlap state. Separate fixture instances are simpler when tests run concurrently and need exact call counts.

For file comparison, choose equivalent temp roots and compare relative paths plus checksums. Absolute path text naturally differs across jobs and should not become a false incompatibility.

MCP Node engine compatibility testing also needs an error parity case. A controlled HTTP 503 should produce the same MCP error semantics on Node 20 and current Node, proving response handling has not diverged.

The [MCP package drift article](/blog/mcp-package-registry-version-drift-tests) can verify that the tested version matches released metadata. The runtime matrix itself should fail before registry queries if local version identity is inconsistent.

When a newer row fails but Node 20 passes, do not weaken the minimum assertion. Assign that result to forward compatibility and investigate dependency or runtime changes with the same captured record.

## Step-by-step test implementation

Build the suite as a chain from declared range to observed result. These steps keep the minimum claim traceable through metadata, workflow, package, and runtime.

1. Parse \`packages/mcp/package.json\`, assert \`engines.node\` equals \`>=20\`, and record the bin path, package version, files list, and runtime dependencies.
2. Inspect \`.github/workflows/mcp-publish.yml\`, confirm setup-node uses 20, and verify build completes before either package publication step.
3. Build and pack once, calculate the tarball checksum, then install the same artifact into clean temporary projects under Node 20 and the current supported release.
4. Launch each installed bin against a local API fixture, complete initialize, tools/list, search, timeout error, and explicit-target installation behavior.
5. Normalize each row's protocol, request, filesystem, and exit record, then compare exact repository-owned values while excluding ports and temporary roots.
6. Gate publication on the Node 20 result, retain focused diagnostics for failures, and remove all projects, fixture sockets, timers, and child processes.

### A plain test card for each Node row

Write the Node row name at the top of each test card. Add the full Node patch and the pack hash on that same card. This proves the row used the right tool and the same build.

Make a new work folder for each row and check that it starts bare. Copy in one pack file, then install it with no link to the repo. A clean start keeps old files from giving false help.

Clear \`NODE_PATH\` and all test loaders before the child starts. Print the names of keys you clear, but not their old values. This keeps secrets out of logs while it proves the path was clean.

Start one small web stub on a free local port for the row. Give each route a fixed reply and fail all paths not on the list. This makes each web call fast, safe, and easy to check.

Ask the child for its first MCP reply before any tool call. Check the server name and the row's Node version in the trace. A fault here points to load or start code, not fetch.

Ask for the tool list next and match all six tool names. This step loads the same pack code that a host will use. It also proves the child can read its own package data.

Call search with one short term and one set limit. Check the path, query, user agent, and JSON result from the stub. Do not check headers that Node adds on its own.

Hold one stub reply open so the app must end the fetch. The child should send the known time error and stay live. Ask for tools/list once more to prove the child can still serve work.

Call install with a path under the row's work folder. Read the new file and match all bytes with the stub body. Then check that no file was made in the repo or user home.

Keep a short list of each side effect in the order it took place. The list should show web call, file write, tool result, input close, and child exit. A gap in that list can show where the row split.

Run the Node 20 row first, since it guards the public floor. Run the new Node row from the same pack as a cross-check. If one row fails, show the first event where their two lists do not match.

Do not let one row share its install tree with the next row. A new Node run may load code made by the old one. New folders cost little and make the result much more clear.

Keep each wait short because the web stub is on the same host. Name the wait that ran out and stop the child in that row. A broad job wait gives less help and can leave more state.

Use the [MCP setup page](/mcp) to check the end user command, not to set the test state. The [start guide](/getting-started) can aid a local replay. Both rows must still use the test's own pack, stub, and work folder.

At the end, make one small row report with six fields. Keep Node, pack hash, first reply, search, file hash, and exit state. Those facts are enough to tell a code fault from a bad test row.

Run a known bad test pack that asks for a global absent on Node 20. The floor row must fail while the new row may pass. This drill proves that the two labels lead to two real Node tools.

Validate the harness by temporarily requesting a known newer global from a test fixture, not production code. The Node 20 row must fail while the current row identifies the version-specific cause.

Also mutate the engines expectation in a fixture to prove metadata drift is visible. Such mutation checks establish that both the static and behavioral halves can reject the risks they claim to cover.

Do not run npm install from the monorepo root for the isolated rows. A temp package with only the tarball dependency gives a more faithful consumer env.

The [skills directory](/skills) can supply a stable slug for a later production smoke, but the compatibility suite should use local controlled content. Runtime support must not depend on current catalog data.

MCP Node engine compatibility testing is complete when supported rows agree and deliberate newer-only code fails specifically at Node 20. That pairing proves the matrix is real rather than decorative CI setup.

## Failure triage and regression ownership

Start with metadata agreement. If engines says Node 20 while the workflow uses a newer version, assign the gap to release setup before inspecting app output.

If install fails, inspect npm engine output, tarball contents, lock data, and dependency exports. The process has not yet reached MCP transport or QASkills request logic.

If startup fails with syntax or module errors only on Node 20, identify the first loaded file and package version. Ownership may sit with the bundle target, a newly updated dependency, or application syntax.

When initialize succeeds but fetch result fails, compare request traces, global availability, abort events, and controlled response bytes. A valid tools/list response already clears basic package and transport startup.

File-only failures belong to path selection, permissions, folder creation, or the write call. Report the relative target and operation without dumping unrelated temp paths from the runner.

A timeout followed by a hanging process needs two assignments if cleanup also fails. Preserve the request failure as primary, then report teardown as a separate harness or transport defect.

Use the [MCP guide](/blog/qaskills-mcp-server-guide) to reproduce supported setup and the [getting started page](/getting-started) for local setup. Neither should override the exact captured runtime evidence.

If all local rows pass while publish fails, investigate registry credentials and workflow permissions outside this compatibility suite. Node support has a bounded contract and should not absorb every release fault.

MCP Node engine compatibility testing should leave one concise differential: what passed on current Node, what failed on Node 20, and the earliest differing event. That record points maintainers toward the responsible layer.

## Frequently Asked Questions

### Why is a build not enough for an MCP Node 20 smoke test?

A build proves the compiler and bundler accepted source under one env. It does not prove the packed bin resolves files, loads production dependencies, uses fetch and URL correctly, writes a skill, or exits cleanly on Node 20. A consumer-style runtime smoke covers those missing boundaries.

### Should npm engines compatibility reject Node 18 automatically?

The engines field declares support, but enforcement depends on package-manager settings. Test the exact \`>=20\` metadata and use strict mode when checking a rejection. Do not treat an advisory warning as Node 18 support, and do not let that unsupported row replace Node 20 execution.

### What should a Node fetch runtime test call?

Invoke a real registered MCP tool against a local HTTP fixture rather than testing fetch alone. Assert the constructed URL, selected headers, response mapping, timeout error, and continued process health. This path proves application use of Node globals while keeping remote service state outside the result.

### Which versions belong in minimum Node version CI?

Always include the exact declared floor and at least one current supported release. The floor protects the public promise, while the newer row gives a useful differential and forward signal. Pin major versions, print selected patches, and use the same packed file and assertions in every row.

### How often should the MCP runtime version matrix run?

Run metadata checks and the Node 20 packed smoke on every relevant pull request before publication. Run the current supported comparison in the same gate when cost permits. A broader scheduled matrix can add future releases, but it should not delay detection of minimum-runtime regressions.

## Conclusion

MCP Node engine compatibility testing connects the \`>=20\` declaration to observable user results. The release gate must execute one packed file on Node 20, cover protocol, fetch, URL, timeout, file, and shutdown paths, then compare those outcomes with a current runtime.
Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this runtime matrix before the next MCP release.`,
};
