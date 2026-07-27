import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP client environment propagation testing',
  description:
    'MCP client environment propagation testing explained through repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP client environment propagation testing',
  keywords: [
    'MCP client environment propagation testing',
    'MCP client env variables',
    'spawned server environment test',
    'Claude MCP env config',
    'Cursor MCP env config',
    'telemetry variable propagation',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://nodejs.org/api/process.html',
    'https://modelcontextprotocol.io/registry/quickstart',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'packages/mcp/server.json',
    'packages/mcp/package.json',
  ],
  content: `MCP client environment propagation testing must launch a fresh QASkills server for each client fixture, point it at a local capture API, and set both privacy flags before module load. Tests pass when override traffic reaches only that API, tracking stays off, and unrelated parent values do not enter the child.

## What must MCP client environment propagation testing prove?

MCP client environment propagation testing must prove that each child receives exact string values for the API override and privacy controls at process start. The check needs captured requests, a known parent environment, two client-shaped launch records, and proof that no extra secret crosses the boundary.

The contract has three named inputs. \`QASKILLS_API_URL\` selects the API base, while \`DO_NOT_TRACK=1\` and \`QASKILLS_TELEMETRY=0\` each turn off install tracking.

Tests should set one privacy flag at a time, then set both together. This split catches clients that pass one key but drop another key from their process config.

The API base is read when the server module loads. Changing the parent value after a child starts cannot alter that child's stored base, so each case needs a new process.

The privacy keys are read when tracking is considered after an install. They still must be supplied at spawn time because a client controls the child's initial env, not later module state.

Use one loopback HTTP server as the only network peer. It should log method, path, headers, and body for each call, while returning small fixed search and skill data.

The positive oracle calls a read tool and an install tool. Search proves the base override, while install proves content fetch plus the absence of a telemetry POST.

An empty request log is not a privacy pass. The suite must first show that the child reached the local search and content paths, then show that the tracking path stayed absent.

The parent process should contain a fake secret with a clear test name. Build an allowlisted child env and assert that the fake key is not visible through a small child probe.

Do not log the full real CI env. The [Node process docs](https://nodejs.org/api/process.html) describe \`process.env\` as the process view, but safe test logs should retain only named synthetic keys.

The [telemetry opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track) explains the user choice. This article owns only whether a client launch passes those choices into the MCP child.

Review [Claude Code agent setup](/agents/claude-code) and [Cursor agent setup](/agents/cursor) for product context. The test fixtures below model their child-process inputs; they do not automate either external client.

MCP client environment propagation testing passes when both launch shapes yield the same measured child behavior. Config text alone is not proof because a client can parse, rename, or omit a value before spawn.

## Which repository behavior defines the contract?

The first runtime fact appears in \`packages/mcp/src/index.ts\`. Its top-level \`BASE\` value uses \`process.env.QASKILLS_API_URL\`, falls back to the public site, and removes one trailing slash.

Because that expression runs during module load, a test must set the key in the transport env before the executable starts. Importing the module in the parent would test the wrong process state.

The same file defines \`shouldTrackTelemetry\`. Tracking is allowed unless \`DO_NOT_TRACK\` equals the exact string \`1\` and unless \`QASKILLS_TELEMETRY\` equals the exact string \`0\`.

These checks are strict string checks. Values such as \`true\`, \`false\`, \`yes\`, or numeric config data serialized another way do not match the current code.

When tracking is enabled, \`trackInstall\` sends a POST to \`/api/telemetry/install\`. It starts after the file write and catches errors without changing the install result.

That nonblocking call affects the oracle. The server log needs a short bounded wait after install, since an immediate assertion could run before an unwanted POST arrives.

The registry file \`packages/mcp/server.json\` exposes one optional, nonsecret string named \`QASKILLS_API_URL\`. It does not list either privacy key in the inspected revision.

This is a repository fact, not a claim that clients cannot pass other values. It means registry-driven setup can discover the base override from metadata, while privacy keys need a separate documented config path.

The [MCP registry quickstart](https://modelcontextprotocol.io/registry/quickstart) shows environment variable metadata within a stdio package entry. Use that source for registry shape, then use the committed file for exact QASkills names.

The package manifest at \`packages/mcp/package.json\` identifies \`dist/index.js\` as the bin, sets Node 20 as the floor, and names \`@modelcontextprotocol/sdk\` as a runtime dependency. Tests should launch that built bin through the SDK transport. A mock function that accepts an env object cannot prove the real child saw those values during module load.

The server uses standard input and output for MCP messages. The [MCP transport rules](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) require clients to keep non-protocol data off standard output.

Capture standard error on failure, but never print env values through the child protocol stream. A debug line can break a sound env test by corrupting stdio framing.

MCP client environment propagation testing joins registry metadata, client launch data, process env, and network effects. No single layer can stand in for all four.

## How should QA teams test MCP client env variables?

MCP client env variables should be tested with a small matrix of exact strings and omitted keys. Each case starts a new child, runs the same tool calls, and compares the capture server log.

Create launch records named \`claude\` and \`cursor\`, but keep their command and arguments equal. Vary only the config-to-env adapter under test so a package difference cannot mask a client mapping bug.

Use \`QASKILLS_API_URL\` with a trailing slash in one case. The MCP code should trim it, and captured paths should contain one slash between the base and API route.

The search response can be \`{"skills":[],"total":0}\`. That result proves the request reached the stub without adding unrelated search projection fields.

For install, return valid text at one content path and write into a fresh temp root. The request log should show GET search, GET content, and no telemetry route after the bounded wait.

The code below is a real SDK-level test for the built server from \`packages/mcp/src/index.ts\`. Its two launch records represent client config adapters while every assertion uses child effects.

\`\`\`typescript
import { createServer } from 'node:http';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expect, it } from 'vitest';

type SeenRequest = { method: string; path: string };

async function startCaptureApi() {
  const seen: SeenRequest[] = [];
  const server = createServer((request, response) => {
    seen.push({ method: request.method ?? 'GET', path: request.url ?? '' });
    if (request.url?.startsWith('/api/skills?')) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"skills":[],"total":0}');
      return;
    }
    if (request.url === '/api/skills/env-fixture/content') {
      response.writeHead(200, { 'content-type': 'text/markdown' });
      response.end('---\\nname: env-fixture\\n---\\nFixture body.\\n');
      return;
    }
    response.writeHead(204).end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No fixture port');
  return {
    baseUrl: \`http://127.0.0.1:\${address.port}\`,
    seen,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

it.each(['claude', 'cursor'])(
  'passes exact env values through the %s launch adapter',
  async (clientName) => {
    const api = await startCaptureApi();
    const cwd = await mkdtemp(path.join(tmpdir(), \`qaskills-\${clientName}-\`));
    const env = {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? cwd,
      QASKILLS_API_URL: \`\${api.baseUrl}/\`,
      DO_NOT_TRACK: '1',
      QASKILLS_TELEMETRY: '0',
    };
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.resolve('packages/mcp/dist/index.js')],
      cwd,
      env,
    });
    const client = new Client({ name: clientName, version: '1.0.0' });
    await client.connect(transport);

    await client.callTool({ name: 'search_skills', arguments: { query: 'none' } });
    await client.callTool({
      name: 'install_skill',
      arguments: { slug: 'env-fixture', agent: clientName },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(api.seen.map((item) => item.path)).toEqual([
      '/api/skills?q=none&limit=10',
      '/api/skills/env-fixture/content',
    ]);
    await expect(
      readFile(path.join(cwd, '.agents/skills/env-fixture/SKILL.md'), 'utf8'),
    ).resolves.toContain('Fixture body.');
    await transport.close();
    await api.close();
  },
);
\`\`\`

The exact search query order comes from the current \`buildUrl\` loop and the default limit. If SDK defaults change, inspect the captured URL before updating this expected value.

Give each test its own server and temp root. Reusing either one can let a late telemetry call from a prior child fail the wrong client case.

Close the transport before closing the API. That order stops new child requests first and gives the capture log a stable end point.

MCP client environment propagation testing should also run one control with tracking enabled. It proves the stub can see the telemetry path, which makes an absent path meaningful in opt-out rows.

Never use a public API for this suite. Local capture gives exact ownership, works offline, and prevents test installs from changing real usage counts.

## Test matrix for spawned server environment test

A spawned server environment test needs positive, omitted, malformed, and leak cases. The result column should name a network or process fact rather than a config-file guess.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
| --- | --- | --- | --- | --- |
| API override | Loopback URL with trailing slash | Search and content reach one local base | Public host or doubled path slash | \`packages/mcp/src/index.ts\` |
| DO_NOT_TRACK opt-out | Exact string \`1\` | Install has no tracking POST | \`/api/telemetry/install\` appears | Node process env |
| QASKILLS_TELEMETRY opt-out | Exact string \`0\` | Install has no tracking POST | Tracking appears after bounded wait | \`packages/mcp/src/index.ts\` |
| Both privacy keys | Both documented strings | Same no-track result for each client shape | One adapter drops either key | spawned server environment test |
| Malformed privacy value | \`DO_NOT_TRACK: 'true'\` | Current code allows tracking | Test treats any truthy text as opt-out | telemetry variable propagation |
| Omitted API override | Key absent in an isolated control | Child selects the coded default base | Case still reaches local stub | \`packages/mcp/src/index.ts\` |
| Parent-only value | Parent has key, child allowlist omits it | Probe shows key is absent from child | Secret or stale override enters child | MCP client env variables |
| Registry metadata | Parse committed \`server.json\` | Only API override appears in env metadata | Runtime and registry claims are merged | \`packages/mcp/server.json\` |
| Fresh process check | Start two children with unlike bases | Each child stays on its own base | Second launch changes first child | \`packages/mcp/package.json\` |

The malformed row records present behavior rather than desired privacy wording. Strict equality means \`true\` is not the same opt-out value as \`1\`.

The omitted override row must not contact the public site during CI. Use a narrow child probe for the computed base or inject a safe network block and expect the public host in the error.

For parent leaks, avoid reading env through a new MCP tool that production does not expose. Start a tiny Node probe with the same client adapter and print only whether the fake key exists.

This adapter test pairs with the black-box server test. The probe validates env construction, while QASkills requests validate that the real package consumed its named values.

Registry metadata deserves its own row because \`packages/mcp/server.json\` lists just one key. Do not infer that the two privacy keys are registered when they appear only in runtime source.

The [QASkills MCP page](/mcp) should link users to current setup guidance. CI still derives exact values from repository files to avoid stale page copy.

## What failures expose Claude MCP env config?

Claude MCP env config fails this contract when its adapter omits a key, changes case, stores a non-string form, or starts the process before applying the chosen values. The capture log then shows the base or tracking mismatch.

Case matters on platforms where env lookup is case-sensitive. Use the exact uppercase names from source and test a lowercase near miss as a rejected control.

A JSON config number may become a string during process spawn, but the adapter owns that rule. Test the final env map rather than assuming every client serializes values in the same way.

An API override set after client startup cannot change the loaded MCP base. Restart the child for each case, then link all requests to its unique port.

A useful failure report includes client label, expected keys, safe value classes, capture port, paths, and child exit state. It should mask values not created by the test.

Do not print a full config file if it may hold unrelated tokens. Report presence, exact synthetic values, and a hash or redacted marker for anything else.

The registry file can give a setup tool the API key name, but it cannot prove a local client used it. A process test closes that gap with measured traffic.

If Claude-shaped and Cursor-shaped adapters both fail on the same package call, inspect the package or common helper first. If one fails, compare only its config-to-env mapping.

Keep a control where both adapters pass an empty allowlist plus required OS launch keys. It should show which values are truly needed to start Node and which are QASkills inputs.

MCP client environment propagation testing should not assert that every parent env key is harmful. It should assert an allowlist rule chosen by the test and prove that named fake secrets stay out.

Link failures to the [MCP server contract guide](/blog/mcp-server-contract-testing-guide) when protocol setup also fails. Do not label a broken handshake as an env mismatch until the child launch facts are known.

## CI coverage for Cursor MCP env config

Cursor MCP env config should run through the same black-box suite and a separate adapter unit test. This pairing finds both bad launch data and bad package use of good data.

Build \`@qaskills/mcp\` before the test. Save the package version and source commit so a stale \`dist\` file cannot be mistaken for a client defect.

Run on the minimum Node major declared in \`packages/mcp/package.json\`. Add other supported hosts when useful, since env key rules and child spawn details can differ.

Give each worker unique temp roots and loopback ports. Shared capture logs make it hard to tell which client sent an unwanted telemetry call.

Use fake values only. A CI secret is not needed to prove propagation, and adding one creates a new leak risk in failed process logs.

Set a fixed wait for nonblocking tracking that is long enough for the loopback call. Prefer a polling helper with a short deadline over a long blind sleep.

The polling helper should return as soon as the unwanted path appears and fail at once. If it stays absent through the window, close the child and freeze the final request list.

Keep standard output reserved for the SDK. Save standard error, exit code, and the last valid MCP response when a child fails.

Run the two client labels in parallel only after each passes alone. Parallel mode finds port reuse and shared env state, while serial mode gives a clean base result.

The [MCP server testing guide](/blog/mcp-server-testing-guide-2026) can host the broad release command. This focused check should run for changes to source, registry metadata, package config, or client adapters.

Block release for public-host traffic, lost opt-out values, leaked fake keys, or different results across equivalent launch records. A wording-only log change does not need the same response.

MCP client environment propagation testing must pass without retries. A retry starts a new process and can hide the launch race that the first run exposed.

## How should telemetry variable propagation be asserted?

Telemetry variable propagation should use a positive control, two opt-out rows, and one malformed row. Each row checks request paths after a real successful install.

First run with both privacy keys absent and a local API override. The capture server should receive content GET and telemetry POST, proving that tracking can reach the fixture.

Next run with \`DO_NOT_TRACK=1\` only. The content GET must remain, the file must exist, and the telemetry POST must stay absent through the deadline.

Repeat with \`QASKILLS_TELEMETRY=0\` only, then both values. The three opt-out results should match even though their child env maps differ.

Finally pass near-miss values such as \`true\` and \`false\`. Current source allows tracking, and the test should preserve that fact unless product rules change.

The metadata test below reads committed files rather than inventing registry fields. It proves the API override is declared, while runtime-only privacy keys remain visible as a documented gap.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

it('keeps registry env metadata aligned with runtime source', async () => {
  const [manifestText, source] = await Promise.all([
    readFile('packages/mcp/server.json', 'utf8'),
    readFile('packages/mcp/src/index.ts', 'utf8'),
  ]);
  const manifest = JSON.parse(manifestText);
  const declared = manifest.packages[0].environmentVariables;

  expect(declared).toEqual([
    {
      description: expect.stringContaining('QASkills API base URL'),
      isRequired: false,
      format: 'string',
      isSecret: false,
      name: 'QASKILLS_API_URL',
    },
  ]);
  expect(source).toContain('process.env.QASKILLS_API_URL');
  expect(source).toContain("process.env.DO_NOT_TRACK !== '1'");
  expect(source).toContain("process.env.QASKILLS_TELEMETRY !== '0'");
  expect(declared.map((item: { name: string }) => item.name)).not.toContain('DO_NOT_TRACK');
  expect(declared.map((item: { name: string }) => item.name)).not.toContain(
    'QASKILLS_TELEMETRY',
  );
});
\`\`\`

This is an exact drift test for the inspected revision. If privacy controls are later added to the registry file, reviewers should update the expected list and add schema checks for each new entry.

Source-string checks are narrow but useful for cross-file drift. Keep behavior proof in the child test, since a matching source line does not show the env reached a running process.

Assert no unrelated effect after each opt-out install. The SKILL.md file and tool result should match the tracking-enabled control, because privacy choice changes reporting rather than install work.

Do not fail on request order between content completion and a later tracking POST beyond the coded sequence. The tracking request is asynchronous, so compare required paths and bounded absence carefully.

MCP client environment propagation testing should name which layer failed: client adapter, child env, package base selection, privacy check, or capture server. That split gives each owner a direct next step.

## Step-by-step test implementation

Implement MCP client environment propagation testing in six steps. Use new child processes throughout because the API base is fixed when the module loads.

1. Read \`packages/mcp/src/index.ts\`, \`packages/mcp/server.json\`, and \`packages/mcp/package.json\`; record exact key names, accepted strings, bin path, and metadata gaps.
2. Create Claude-shaped and Cursor-shaped launch records that map synthetic config values into a small child env without copying a fake parent secret.
3. Start a loopback capture API, build the MCP package, create fresh project roots, and connect one SDK client per launch record.
4. Call search and install, assert local override traffic and file output, then wait briefly and prove each opt-out row sent no tracking POST.
5. Run tracking-enabled, omitted, lowercase, malformed, trailing-slash, fresh-process, and parent-leak controls with new ports and children.
6. Save redacted launch facts and request logs on failure, close transports before APIs, clean roots, and gate each MCP release in CI.

The first step keeps registry truth apart from runtime truth. One key appears in both, while two keys appear only in source today.

The second step should be a pure adapter test as well as a black-box input. Exact object comparison catches a renamed key before child startup adds noise.

The third step must resolve the built bin from the repository root before assigning a child \`cwd\`. Otherwise, a relative path may fail under the temp project.

The fourth step proves useful work before privacy absence. Search and content requests show that the child is live and uses the override.

The fifth step tests the edge, not just more values. Near misses document strict string rules, while fresh children prove bases cannot bleed between cases.

The sixth step keeps logs safe. Only synthetic names, path data, methods, and test-owned values should leave the job.

Use [getting started](/getting-started) for human setup, but keep the CI command tied to MCP workspace build output. A guide page should never replace the executable contract.

MCP client environment propagation testing needs shared ownership. Client teams own adapter maps, and the MCP package team owns how named values affect requests.

## Failure triage and regression ownership

Begin with the capture host. If traffic reaches the public host or no stub at all, inspect the child env and module-load timing before looking at privacy checks.

If search reaches the stub but install content does not, inspect the tool call and slug path. The API override has already passed in that case.

If content arrives and tracking also arrives under an opt-out row, compare exact key spelling and string value in the safe launch report. Then inspect \`shouldTrackTelemetry\`.

If no tracking appears in the enabled control, the privacy rows have no sound negative oracle. Fix the stub, wait logic, or successful install path first.

If only one client label fails, route the issue to that adapter owner. Compare its final env object with the passing adapter before changing package code.

If both labels fail but direct spawn passes, inspect the shared client launch layer. If direct spawn also fails, the built package or stale distribution is the likely owner.

If registry parsing fails, keep that issue apart from process behavior. Malformed or changed metadata can break discovery even when direct launch still works.

If fake parent secrets appear in a child probe, tighten the adapter allowlist and purge unsafe artifacts. Do not attach the leaked value to a bug report.

If failures occur only on one host, compare env key case, required launch keys, path lookup, and Node version. Keep the QASkills value checks unchanged while fixing host setup.

If standard output has debug text, assign the fault to stdio transport hygiene. The env may be right, but clients cannot trust a broken protocol stream.

The [blog index](/blog) links nearby network, tracking, and package checks. Add a focused regression link rather than merging unlike failures into one large issue.

Close a defect only when its original client label and matrix row pass from a clean process. A broad green suite with that row skipped is not proof. MCP client environment propagation testing gives one clear owner for every fact: config adapter, spawn env, runtime source, registry metadata, or local API.

## Frequently Asked Questions

### How do tests verify API and privacy values reach the MCP server?

Start a new child with a test-owned API URL and exact opt-out strings, then call search and install through the SDK. The local server must see search and content traffic but no tracking POST. A separate child probe can confirm that fake parent secrets were not copied.

### Which MCP client env variables matter for this contract?

The runtime reads \`QASKILLS_API_URL\`, \`DO_NOT_TRACK\`, and \`QASKILLS_TELEMETRY\`. The first changes the API base. Exact values \`1\` and \`0\` disable tracking for the latter keys. The committed registry metadata currently lists only the API override, so tests must keep those sources distinct.

### What should a spawned server environment test capture?

Capture the client label, child start facts, safe named env values, HTTP method and path, tool result, file path, standard error, and exit state. Never store the full inherited env. The key proof is useful local traffic paired with the expected presence or absence of tracking.

### How should Claude MCP env config be tested without automating Claude?

Test the repository's Claude-shaped config adapter as a pure map, then feed its final command, arguments, directory, and env into the real stdio child. Label this a client-equivalent fixture, not a Claude product test. This approach proves QASkills launch behavior without making unsupported claims about external software.

### Does Cursor MCP env config need a separate package test?

Use the same package behavior suite with a separate Cursor-shaped adapter record. If both final env maps are equal, expected network effects should match. The split still matters because one config parser can rename, omit, or serialize a value differently before both launch the same QASkills executable.

### What proves telemetry variable propagation rather than a dead request path?

Run a tracking-enabled control that reaches the local telemetry route after a valid install. Then rerun with each opt-out string while keeping content fetch and file output green. Only that paired result shows the privacy key suppressed an otherwise visible call instead of relying on a broken stub.

## Conclusion

MCP client environment propagation testing needs fresh child processes, exact string values, safe env maps, and a local server that proves both useful traffic and tracking absence. Keep registry declarations apart from runtime-only keys, and reject any result based solely on config text.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent [skills](/skills) and apply this test matrix before the next MCP release. Use the [QASkills blog](/blog) to extend the gate with related package and privacy checks.`,
};
