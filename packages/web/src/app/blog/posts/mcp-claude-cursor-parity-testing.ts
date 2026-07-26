import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP Claude Cursor parity testing',
  description:
    'MCP Claude Cursor parity testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP Claude Cursor parity testing',
  keywords: [
    'MCP Claude Cursor parity testing',
    'Claude Code Cursor MCP comparison',
    'MCP tools list client parity',
    'cross-client tool result test',
    'QASkills MCP client matrix',
    'stdio config parity',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
    'mcp-inspector-tutorial-2026',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://github.com/modelcontextprotocol/typescript-sdk',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'packages/mcp/README.md',
    'packages/mcp/package.json',
  ],
  content: `MCP Claude Cursor parity testing uses one pinned QASkills package, one API fixture, and two real host launch records, then compares normalized protocol output. The gate passes only when Claude Code and Cursor start the same command, initialize the same server, list the same six tools, and return equal owned fields for representative calls.

An SDK probe is a useful server control, but it cannot prove either desktop host used the same settings. Teams can find shared test skills in the [QA skills directory](/skills), while this matrix keeps host evidence and server controls clearly apart.

## What must MCP Claude Cursor parity testing prove?

MCP Claude Cursor parity testing must prove that both hosts launch one package version and expose one owned MCP contract. The record should cover command, args, env key names, initialize data, six tool names, input schemas, sample result fields, errors, stderr policy, and clean close.

The package identity comes from packages/mcp/package.json. It names @qaskills/mcp, maps qaskills-mcp to dist/index.js, and gives the version that both host records must pin.

The launch forms come from packages/mcp/README.md. Its Claude Code command and generic MCP JSON both use npx -y @qaskills/mcp, so a Cursor setup can use the same generic command and args.

The runtime contract comes from packages/mcp/src/index.ts. Its server note names Claude Code and Cursor, then registers search_skills, get_skill, get_skill_content, install_skill, list_categories, and get_leaderboard.

Parity does not mean identical host screens, log labels, request IDs, or elapsed time. It means those host-only details can be removed while owned launch and protocol facts remain equal.

The best positive oracle has two real host records plus one SDK control. If all three agree, the team can tell a server defect from a host adapter defect when a later run splits.

Use a local HTTP fixture through QASKILLS_API_URL for tool calls. Both hosts should send the same server requests to that fixture and receive stable search and skill data without using the public service.

The [QASkills MCP page](/mcp) explains the common integration. This article checks the narrower claim that two named hosts get the same QASkills package and owned behavior.

A pass must include a nonempty tools list and parsed tool results. Empty logs, skipped host runs, or records from different package versions are hard failures rather than missing data to ignore.

Keep raw host records for a short debug span and publish a smaller normalized diff. Redact user prompts, full home paths, tokens, and unrelated host settings before any artifact leaves the runner.

## Which repository behavior defines the contract?

packages/mcp/README.md gives Claude Code a direct command: claude mcp add qaskills -- npx -y @qaskills/mcp. Its generic JSON uses command npx with args -y and @qaskills/mcp.

Those forms point to the same package but enter through different host setup paths. The test should read back each saved config or launch trace rather than trust the command used during setup.

packages/mcp/package.json has one bin entry and Node >=20. Pin its package version in both configs so a moving latest tag cannot put one host on newer bytes during the same matrix.

packages/mcp/src/index.ts builds McpServer with name qaskills and the package version. Both initialize records should therefore show the same server name, version, protocol result, and tools capability.

The source registers six tools in one process. Tool order is not stated as a user contract, so normalize order by name while keeping an exact set and rejecting duplicates.

search_skills sends query fields to /api/skills and returns a small object with total plus selected skill fields. A parity record should compare that normalized content, not UI text added by a host.

get_skill requests one slug and removes fullDescription before it returns JSON text. This gives the matrix a second read case with a clear forbidden field.

install_skill writes files and sends optional telemetry, so it does not belong in the first safe parity call set. Discovery can still compare its name and schema without making a write.

The [MCP transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) defines stdio as a child process with protocol data on stdin and stdout. It allows logs on stderr, which means hosts may display those logs in different places without changing MCP output.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) defines tools/list and the core tool fields. It makes tool names and input schemas sound cross-client values for this test.

The [official TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) supplies a third client for the server control. It should use the same package and fixture, but its pass cannot replace a missing Claude Code or Cursor record.

Read the [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) for full handler behavior. MCP Claude Cursor parity testing then uses the [agents page](/agents) to keep host-specific setup separate from the common server contract.

## How should QA teams run a Claude Code Cursor MCP comparison?

A Claude Code Cursor MCP comparison should run both hosts from fresh test profiles with one pinned config. Each adapter must save what the host launched and the protocol facts it saw, using the same small record schema.

Start a local fixture server on a random loopback port. Give it fixed /api/skills and /api/skills/example responses, then pass that base URL as QASKILLS_API_URL through both MCP configs.

Use the same Node executable and PATH when the hosts allow it. Record only env key names and a hash of the chosen PATH, since full env values may reveal local tools or secrets.

Add the server through each supported config path, restart or reload the host as its product requires, and wait for qaskills discovery. A setup success message is not the test result; the adapter must call tools/list.

Capture initialize serverInfo and the six tool definitions. Then call search_skills with one fixed query and get_skill with one fixed slug against the fixture.

Parse the first text content item as JSON and compare owned fields. Ignore request IDs, host labels, log times, display wrappers, and any host-only trace data outside the MCP result.

Run the SDK control before the two hosts. If it fails, stop and fix the server or fixture instead of filing two client defects for one common cause.

The first example compares real records supplied by host adapters. It also requires exact package, initialize, and tool facts before it checks deeper output.

\`\`\`typescript
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

type ProbeRecord = {
  host: 'claude-code' | 'cursor';
  launch: { command: string; args: string[]; packageVersion: string };
  initialize: { serverName: string; serverVersion: string };
  tools: Array<{ name: string; inputSchema: unknown }>;
  results: { search_skills: unknown; get_skill: unknown };
};

const readProbe = (envName: string): ProbeRecord =>
  JSON.parse(readFileSync(process.env[envName]!, 'utf8'));

const normalize = (record: ProbeRecord) => ({
  launch: record.launch,
  initialize: record.initialize,
  tools: [...record.tools].sort((left, right) =>
    left.name.localeCompare(right.name),
  ),
  results: record.results,
});

it('keeps Claude Code and Cursor on one owned MCP contract', () => {
  const claude = readProbe('CLAUDE_CODE_MCP_PROBE');
  const cursor = readProbe('CURSOR_MCP_PROBE');
  const expectedTools = [
    'get_leaderboard',
    'get_skill',
    'get_skill_content',
    'install_skill',
    'list_categories',
    'search_skills',
  ];

  expect(claude.tools.map((tool) => tool.name).sort()).toEqual(expectedTools);
  expect(cursor.tools.map((tool) => tool.name).sort()).toEqual(expectedTools);
  expect(normalize(cursor)).toEqual(normalize(claude));
});
\`\`\`

The adapters that write these files are part of the test system and need their own small checks. Each should reject a missing host result instead of writing an empty object that later normalization might accept.

Use [Claude Code agent guidance](/agents/claude-code) and [Cursor agent guidance](/agents/cursor) for the two setup paths. Keep one shared fixture and oracle so those pages do not turn into two different server specs.

Repeat each host run once from a clean profile. A second pass can catch saved config or cache state that changes discovery, while many retries can hide an unstable first load.

MCP Claude Cursor parity testing should pin the same @qaskills/mcp version in both records. Fail setup before tool calls when packageVersion values differ.

## Test matrix for MCP tools list client parity

An MCP tools list client parity matrix should cover launch, initialize, list shape, order, schema, results, errors, env, and close. Each row says which differences are owned and which host details are safe to ignore.

Use one fixture ID across both records. Equal outputs from two different fixture states are not useful proof, even if their JSON happens to match.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Package command | Pinned npx config | Both launch npx -y and same package | Command or version differs | packages/mcp/README.md |
| Initialize | One server build | Name and version are equal | Host reports another server | packages/mcp/src/index.ts |
| Tool set | tools/list | Six exact unique names | Missing, extra, or duplicate tool | MCP tools rules |
| Tool order | Same set in other order | Sorted records match | Raw order causes false defect | Normalization rule |
| Input schema | Fixed registration | Owned schema objects match | One host drops or changes schema | MCP tools rules |
| Search result | Fixed API fixture | Total and skill fields match | Parsed content differs | packages/mcp/src/index.ts |
| Skill result | Fixed slug fixture | Metadata matches and body is absent | fullDescription or field split appears | packages/mcp/src/index.ts |
| API error | Fixed 503 fixture | Both receive equivalent isError result | One host hides or rewrites MCP result | Server error contract |
| Stderr note | Safe test log | Protocol result still matches | Log text enters stdout result | MCP stdio rules |
| Shutdown | Close both sessions | Each child exits in its limit | One host leaves the server alive | Transport lifecycle |

Do not compare host UI labels or icon order. Those are display choices unless a product claim says users must see exact text in both apps.

Do compare tool name case, JSON schema values, isError, text content, and parsed owned result fields. Those values pass through MCP and can change what an agent can do.

The API error row should use a known fixture body and status. packages/mcp/src/index.ts turns request errors into text content with isError true, giving both hosts one stable protocol result to expose.

Use the [blog hub](/blog) to place this table with other client checks. The main artifact should be a compact pair diff, while raw traces stay behind limited access.

## What failures expose a cross-client tool result test?

A cross-client tool result test fails when equal calls reach different servers, different fixture data, or different result handling. The first task is to prove both sides truly used the same input.

Record package version, fixture ID, tool name, JSON args, serverInfo, and a hash of each raw MCP result. If any setup key differs, stop before comparing business fields.

For search_skills, use a query with two known rows and a fixed total. Compare total, item order if the server owns it, and each selected field returned by normalizeSearchResponse.

For get_skill, return fullDescription from the fixture and require both MCP results to omit it. A host that shows raw API data instead of server output would then fail clearly.

Compare decoded JSON from text content rather than rendered chat text. Claude Code and Cursor may wrap the same result in different panels, labels, or prose.

Error tests should compare isError and safe message text from the server result. Do not compare host toast wording, since that message may be outside the MCP response.

One host may pass a different env or cwd even with equal command and args. Record the fixture base URL and working folder as redacted hashes, then fail if those owned setup values split.

Check the fixture request log as a second oracle. Both calls should use the same method, path, query, and safe headers, with no extra public API request.

If one record lacks content, do not turn undefined into an empty object during normalization. Raise a missing-content fault with host, tool, request, and fixture ID.

The [QASkills MCP page](/mcp) may show both clients as supported even when one adapter test fails. Keep that product claim backed by the host matrix rather than a server-only SDK pass.

A clean cross-client result means equal owned protocol data, not equal screenshots. Save screenshots only when the defect is in host display or setup UI.

## CI coverage for QASkills MCP client matrix

A QASkills MCP client matrix should use fast server controls on each change and real host probes on a planned lane. This keeps common faults cheap while still testing the clients named by the product.

Run source, schema, and SDK checks on normal pull requests. They need no desktop profile and should block a merge when the shared MCP contract changes without approval.

Run real Claude Code and Cursor probes on hosts where those apps or CLIs are installed and signed into approved test profiles. Keep personal profiles, work chats, and user settings out of the job.

If a host cannot run headless, make the probe a controlled release check rather than fake automation. A checked host record is better than a green test that only changed a clientInfo name in the SDK.

Build or install one pinned @qaskills/mcp version before both probes. Record its package hash and reject a host that resolves latest instead of the pinned spec.

Start one local API fixture for the pair or two copies from the same fixture file. If one host needs a separate process, include the same fixture hash in both records.

Set limits for setup, initialize, tools/list, each call, and shutdown. Store the last finished phase so a client start fault does not look like a tool result split.

Keep raw stdout as protocol data and stderr as a separate bounded stream where adapters allow it. Redact home paths, user names, auth fields, and unrelated host logs.

Fail when either host lane is skipped on a release that claims parity. A matrix with one green host and one absent host has no cross-client result.

Use the [agents page](/agents) to name host owners and the [QA skills directory](/skills) to share replay steps. Each issue should carry a safe record, package hash, fixture hash, and first split path.

MCP Claude Cursor parity testing should publish the normalized pair diff with the release. Raw host files can expire sooner, since they may contain more local context than the owned record.

## How should stdio config parity be asserted?

Stdio config parity should compare the command, ordered args, package spec, cwd rule, and owned env keys used by each host. Display names and the outer config file shape may differ without changing the child process.

The expected child command is npx with -y and one pinned @qaskills/mcp version. A host that adds a shell wrapper should record the final child command as well as its saved config.

Compare args in order because npx parses flags before the package name. Reordering -y after a positional package can change which program receives that flag.

Require both configs to set the same QASKILLS_API_URL during fixture calls. If telemetry controls are set for the test, keep DO_NOT_TRACK or QASKILLS_TELEMETRY equal as well.

Do not compare the full environment. Hosts add their own keys, and saving them would expose data that the server contract does not own.

Compare the working folder policy rather than full absolute paths. Both runs can use different temp roots while still starting outside the product repo with the same clean-state rule.

The server must keep stdout for MCP data. A config that merges stderr into stdout can break parsing even though the package itself follows the transport rule.

Capture child exit and cleanup. One host must not leave qaskills-mcp alive after its session ends, because that stale child could affect the next probe.

This negative example adds a result split to a copied record and requires a stable field path. It also guards both inputs against mutation during the comparison.

\`\`\`typescript
import { expect, it } from 'vitest';

function assertSameSearch(left: any, right: any): void {
  const leftTotal = left.results?.search_skills?.total;
  const rightTotal = right.results?.search_skills?.total;
  if (leftTotal !== rightTotal) {
    throw new Error(
      'results.search_skills.total: Claude Code=' +
      leftTotal +
      ', Cursor=' +
      rightTotal,
    );
  }
}

it('reports one owned cross-client result split', () => {
  const claude = {
    results: { search_skills: { total: 2, skills: [] } },
  };
  const cursor = structuredClone(claude);
  const leftBefore = JSON.stringify(claude);
  cursor.results.search_skills.total = 3;

  expect(() => assertSameSearch(claude, cursor)).toThrow(
    'results.search_skills.total: Claude Code=2, Cursor=3',
  );
  expect(JSON.stringify(claude)).toBe(leftBefore);
  expect(cursor.results.search_skills.skills).toEqual([]);
});
\`\`\`

The full helper should walk only fields owned by the parity policy and report all splits after setup passes. Keep the first path in the test title so CI summaries remain easy to scan.

Use [getting started](/getting-started) for normal config setup, then have the probe read back effective values. A copied docs block does not prove the host loaded that block.

Stdio config parity passes before the tool matrix starts. If launch settings split, later result diffs are effects and should not create separate server bugs.

## Step-by-step test implementation

Implement the matrix in six steps that keep common server proof and real host proof distinct. Use one release ID and fixture hash from setup through pair comparison.

1. Read packages/mcp/src/index.ts, packages/mcp/README.md, and packages/mcp/package.json. Record package name, version, bin, runtime identity, six tools, launch forms, env controls, and owned result fields.
2. Create a fixed local API fixture for search, skill metadata, and one safe error. Define one ProbeRecord schema for Claude Code, Cursor, and the SDK control, with raw host-only data stored apart.
3. Run the SDK control against the pinned package and fixture. Assert initialize, six sorted tools, search result, skill body omission, error shape, stdout rules, and clean shutdown before host work begins.
4. Run one fresh Claude Code profile and one fresh Cursor profile through their real setup paths. Read back effective launch data, collect the same calls, save phase times, and reject empty or skipped records.
5. Normalize only approved host details, then compare package, config policy, initialize, tool set, schemas, result fields, errors, and close state. Inject copied splits and require clear field paths with unchanged source records.
6. Run common controls on changes and host probes before parity releases. Save the small pair diff, redact and expire raw traces, close child processes, remove temp profiles, and route the first split to its owner.

Use separate profile roots but the same setup policy. Sharing one profile can let the second host read state made by the first and hide a missing config step.

Do not call install_skill in the parity smoke. It writes to disk and can send telemetry, so it needs a separate fixture with target folders and network rules.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) can supply deeper tool checks. This client matrix should choose only enough read calls to prove equivalent host delivery.

Run MCP Claude Cursor parity testing when package launch, tool registration, result mapping, host support, or config docs change. A docs edit can break one host even when server source is untouched.

## Failure triage and regression ownership

Triage starts with the SDK control. If it fails on the same package and fixture, assign the common server, package, or fixture owner before comparing hosts.

If the SDK passes but both hosts fail setup, inspect package install, test profile policy, PATH, Node version, and shared fixture access. Two host errors can still share one runner cause.

If only one host launches a different command or version, assign that host config adapter. Provide saved config, effective child command, package hash, and no unrelated profile data.

If launch and initialize match but one tools list splits, inspect host protocol handling and captured raw result. Reproduce tools/list through the SDK with the same package before changing registration code.

If tool lists match but one call differs, compare raw MCP content and fixture request logs. Equal raw content with different UI means host display ownership, while different raw content needs server, env, or transport review.

If QASKILLS_API_URL differs, fix config parity first. A public response and local fixture response should never enter the same owned result comparison.

If stderr text appears inside one protocol result, inspect whether that host or wrapper merged streams. packages/mcp/src/index.ts should send protocol data through transport and fatal notes through stderr.

If both results match but one child remains alive, assign host shutdown or transport ownership. Keep process ID only in short local logs, and retain the stop phase rather than a full process list.

Use the [blog hub](/blog) and [QA skills directory](/skills) to route the narrow replay. Keep one issue per first split instead of filing the same effect against client, server, and API teams.

Close a client-only defect with the real host probe plus the SDK control. A unit test that changes only a fake host label cannot prove the supported app path is fixed.

## Frequently Asked Questions

### What should a Claude Code Cursor MCP comparison hold constant?

A Claude Code Cursor MCP comparison should hold package version, API fixture, tool arguments, Node line, env policy, and expected owned fields constant. Separate temp profiles and host adapters may differ, but each record must prove the effective child command and carry the same package and fixture hashes.

### How strict should MCP tools list client parity be?

MCP tools list client parity should require six exact unique names and equal owned input schemas after sorting by name. It should ignore display order, icons, and host panel text unless those are product claims, while missing, extra, duplicate, or case-changed tool names must fail.

### What does a cross-client tool result test compare?

A cross-client tool result test compares parsed MCP content, isError state, and fields owned by the server for fixed calls. It should not compare chat prose or UI wrappers, and it must first prove both hosts used the same package, fixture, env policy, tool name, and arguments.

### When should the QASkills MCP client matrix run?

The QASkills MCP client matrix should run common SDK controls on each contract change and real host probes before releases that claim Claude Code and Cursor support. It should also run when launch docs or host config adapters change, because setup can split while server source stays sound.

### What proves stdio config parity between the hosts?

Stdio config parity is proven by equal effective command, ordered args, pinned package, clean cwd policy, and owned env keys, plus separate stdout and stderr handling. The outer config files may look different, but both records must show the same child process and a clean exit.

## Conclusion

MCP Claude Cursor parity testing joins real host records with one shared server control. Pinned launch data, exact six-tool discovery, fixed read calls, narrow normalization, safe diffs, and clean shutdown prove equivalent owned behavior without confusing UI details with MCP facts.

Review the [QASkills MCP integration](/mcp), then browse cross-client checks in the [QA skills directory](/skills). Apply this client matrix before the next MCP release and keep its normalized pair record with the package version.`,
};
