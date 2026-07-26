import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP cold npx startup testing',
  description:
    'MCP cold npx startup testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP cold npx startup testing',
  keywords: [
    'MCP cold npx startup testing',
    'npx MCP first run test',
    'empty npm cache smoke test',
    'MCP package download startup',
    'npx initialization timeout',
    'cold tools list verification',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-inspector-tutorial-2026',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://docs.npmjs.com/cli/v11/commands/npx/',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
  ],
  repoEvidence: [
    'packages/mcp/README.md',
    'docs/product/MCP-SERVER-PLAN-2026-07.md',
    'packages/mcp/src/index.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP cold npx startup testing launches the published package with a blank home, npm cache, and work folder, then drives the MCP handshake. CI passes only when npx fetches the pinned package, starts stdio, completes initialize, and returns the exact six tools within fixed phase limits.

This smoke test proves the first run that a new user will face, not a warm local install. Teams can pair it with a launch skill from the [QA skills directory](/skills), while the test itself must keep local package state out.

## What must MCP cold npx startup testing prove?

MCP cold npx startup testing must prove one clean path from a package spec to a valid tools/list result. The proof needs an empty cache, isolated cwd, exact package version, initialize data, six tool names, bounded time, clean shutdown, and no help from the monorepo.

The launch command comes from packages/mcp/README.md. Both its Claude Code command and generic MCP config run npx -y @qaskills/mcp, which suppresses the install prompt and starts the sole package bin.

The shipped acceptance log at docs/product/MCP-SERVER-PLAN-2026-07.md records cold npx verification as passed. A repeatable CI probe turns that one release check into a guard for each later version.

packages/mcp/package.json gives the facts npx must use. It names @qaskills/mcp, maps qaskills-mcp to ./dist/index.js, and requires Node 20 or newer.

The process in packages/mcp/src/index.ts builds a McpServer and connects it through StdioServerTransport. It does not need the QASkills web API until a tool handler makes a data call, so initialize and tools/list can stay free of product data.

That boundary keeps the smoke test clear. npm access is needed for a true cold fetch, but a QASkills API outage should not block tool discovery.

The pass signal is not merely a child process that stays alive. It is a valid initialize exchange followed by six exact tool names and a clean close before the run deadline.

The [QASkills MCP page](/mcp) explains how users add the server. This guide checks the hard first-run path behind that setup, from remote package fetch through protocol discovery.

The fail signal must name the last finished phase. Package fetch, bin start, initialize, tools/list, and shutdown have different owners, so one broad timeout would waste useful proof.

Use one release record for package version, npm version, Node version, cache path hash, phase times, tool names, exit status, and redacted stderr. Never store the whole temp home or npm user config.

## Which repository behavior defines the contract?

The repository starts the public path with npx -y @qaskills/mcp in packages/mcp/README.md. The -y flag matters because a hidden install prompt can leave a headless CI job waiting forever.

The [npx command guide](https://docs.npmjs.com/cli/v11/commands/npx/) says a missing package is put in the npm cache and its bin is added to PATH. It also says -y suppresses the prompt, which makes the README command fit a noninteractive MCP host.

npx can reuse a matching local package when the cwd has one. A real cold test must therefore run in a new folder with no package.json, node_modules, lockfile, or parent workspace link.

Set a fresh npm cache as well as a fresh cwd. Changing only the cache does not stop npx from seeing a local dependency, and changing only cwd does not prove a remote fetch occurred.

packages/mcp/package.json has one bin entry, so npx can infer qaskills-mcp from the package spec. The test should still record the resolved package version and bin name in case that manifest later changes.

Once the child starts, packages/mcp/src/index.ts connects StdioServerTransport. Its server constructor uses the package version and registers search_skills, get_skill, get_skill_content, install_skill, list_categories, and get_leaderboard.

The [MCP lifecycle specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle) requires initialize as the first client-server exchange. After the server reply, the client sends notifications/initialized before normal work begins.

The [MCP transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) says a stdio client launches the server as a child, sends protocol data on stdin, and reads protocol data from stdout. It also bars the server from writing non-MCP text to stdout.

These rules define two extra checks. The probe must reject stray stdout and must keep stderr apart, since npm and the server may write useful notes there without changing protocol data.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) covers each tool after discovery. The [MCP Inspector tutorial](/blog/mcp-inspector-tutorial-2026) helps with a manual replay when the automated first run fails.

docs/product/MCP-SERVER-PLAN-2026-07.md also states that the public API needs no auth for the server launch path. Do not add a web token to this smoke test, because it would hide the zero-config claim the package is meant to meet.

## How should QA teams run an npx MCP first run test?

An npx MCP first run test should launch a pinned package from an empty temp root and use a real MCP client to connect. It should collect phase times around connect and listTools, then close both client and transport in a finally block.

Pin @qaskills/mcp to the version under release. A bare latest tag can move while jobs run, so two retries may test different bytes and give a false recovery.

For a pre-publish check, run the same harness against a packed tarball. For the post-publish cold check, use the exact remote version and a brand-new cache that contains no prior tarball.

Build the env from a small allowlist. Keep PATH and any npm registry setting needed by CI, then replace HOME, user profile, npm cache, and npm log folder with paths under the temp root.

Do not pass NODE_PATH or a workspace package manager path that can resolve @qaskills/mcp locally. Save a safe list of env key names, not their values, with the run record.

The first code sample uses the official SDK client against the README launch form. It asserts exact tools rather than accepting any nonempty list.

\`\`\`typescript
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { expect, it } from 'vitest';

it('starts the published MCP package from a cold npm cache', async () => {
  const root = mkdtempSync(join(tmpdir(), 'qaskills-cold-npx-'));
  const work = join(root, 'work');
  const home = join(root, 'home');
  const cache = join(root, 'npm-cache');
  mkdirSync(work);
  mkdirSync(home);
  mkdirSync(cache);
  const pkg = JSON.parse(
    readFileSync('packages/mcp/package.json', 'utf8'),
  );
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', pkg.name + '@' + pkg.version],
    cwd: work,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: home,
      npm_config_cache: cache,
    },
  });
  const client = new Client({ name: 'cold-probe', version: '1.0.0' });

  try {
    await client.connect(transport);
    const result = await client.listTools();
    expect(result.tools.map((tool) => tool.name).sort()).toEqual([
      'get_leaderboard',
      'get_skill',
      'get_skill_content',
      'install_skill',
      'list_categories',
      'search_skills',
    ]);
  } finally {
    await client.close();
  }
});
\`\`\`

Create the work and home folders before running this exact sample. Keep that setup in the real helper, then remove the whole root after close so no warm cache can reach the next test.

The test should also capture initialize serverInfo. Require name qaskills and the pinned package version, which proves the fetched bin matches the release under test.

Run from a host with public npm access and no registry proxy cache for the strict cold lane. A second normal lane may use the company proxy, but label its result so it cannot stand in for public fetch proof.

The [getting started guide](/getting-started) can help users add the server after this gate passes. Keep client setup outside the temp root so the probe remains a direct package test.

MCP cold npx startup testing should run once per release candidate and once after npm publish. Running it on every source commit would add remote delay without more proof than the local packed lane gives.

## Test matrix for empty npm cache smoke test

An empty npm cache smoke test needs both good runs and faults at each phase. The table gives each case a direct observation, so a hang cannot be marked as an unknown pass.

Keep time limits as test config, not facts about every network. Teams should set them from measured CI data, then review any change instead of copying a made-up universal number.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Cold public fetch | Empty home, cache, and cwd | Pinned package is fetched and starts | Fetch phase ends late or fails | npm npx guide |
| Warm control | Cache from prior clean run | Same tools with faster fetch phase | Tool result changes by cache state | Test harness |
| Local shadow | Cwd with fake local package | Strict lane rejects the setup | Local code replaces remote package | npm npx rules |
| Missing version | Unknown package version | npx exits before initialize | Clear package resolution failure | npm registry |
| Broken bin | Copied package with bad bin | Child cannot start | Bin phase failure and exit status | packages/mcp/package.json |
| Stray stdout | Fixture emits plain text | Protocol parser rejects the line | Non-MCP stdout is captured | MCP stdio rules |
| Slow initialize | Child accepts input but never replies | Initialize phase times out | Child is closed and marked failed | MCP lifecycle |
| Empty tools | Valid reply with no tools | Exact list check fails | Six expected names are missing | packages/mcp/src/index.ts |
| Reordered tools | Same six names in new order | Set comparison passes | No false order defect | Tool list contract |
| Stuck shutdown | Server ignores closed input | Termination ladder runs and fails cleanup | Child remains after final limit | MCP lifecycle |

The warm control is not part of the cold pass. It helps show that the test really used the cache and can expose a result that changes after npm state appears.

The local shadow case should fail setup before npx starts. Planting an untrusted package with the real name is risky and gives no more value than a harmless fake cwd check.

For tool order, sort names because packages/mcp/src/index.ts does not promise a public order. Keep exact names and count, since a seventh or renamed tool changes what clients discover.

Use the [blog hub](/blog) to link this table with package and client checks. The smoke artifact should stay small enough for a release owner to read without raw npm debug logs.

## What failures expose MCP package download startup?

MCP package download startup can fail before the server code runs. DNS, registry access, package version, cache rights, disk space, archive checks, and bin links all sit between npx and initialize.

Mark fetch start before spawning npx and bin start when the first valid protocol frame arrives. If the child exits sooner, save status and safe stderr with the package phase label.

Do not call every early exit a server crash. An npm error that names a missing version belongs to package publication, while a Node engine error belongs to host or package engine policy.

An empty cache should live in a writable folder owned by the test. A read-only cache is a useful negative case, but it must be separate from the normal fixture.

Check free disk space only when the runner exposes a stable method. A pack download can fail midstream, and the result should not look like an initialize timeout after no server ever started.

The pinned package spec must appear in the child args record. Redact registry auth data, but keep package name and version because they are public and vital for replay.

If npx prints an install prompt, the README command or args changed. Fail with a noninteractive prompt code rather than waiting for the whole job limit.

If the package downloads but the bin is absent, inspect the published package.json and archive. packages/mcp/package.json expects one qaskills-mcp entry at dist/index.js, so missing dist is an npm artifact defect.

If Node rejects the package engine, compare the runner with the declared Node >=20 rule. The package owner should not change that rule merely to make an old CI image pass.

Use a read-only public npm view only as added context. The real smoke must fetch and run the bytes, since metadata alone cannot prove the bin exists.

The [QASkills MCP page](/mcp) should link users to the same command tested here. A docs-only spelling change can break first run even when package and server code remain sound.

MCP cold npx startup testing should store the last safe npm phase and process exit. That pair usually tells release owners whether to inspect access, package data, archive content, or runtime code first.

## CI coverage for npx initialization timeout

An npx initialization timeout should be a set of phase deadlines under one hard run cap. Fetch and startup need a larger network-aware bound, while initialize and tools/list can use shorter protocol bounds.

Start each clock at an event the harness can prove. Spawn time, first valid server frame, initialize reply, tools reply, and close completion are useful marks.

Do not reset the hard run cap when progress appears. A noisy child can otherwise keep CI alive forever without reaching the required result.

On a phase timeout, close client input first and wait a short grace span. Then ask the child to stop, wait again, and force stop only if it still remains.

The lifecycle source describes this shutdown path for stdio. Your test should record which stop step was needed, since forced kill after a good tools result is still a cleanup failure.

The second example adds a clear deadline without swallowing the first error. Its callback makes cleanup part of the rejected path.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

async function withinPhase<T>(
  name: string,
  work: Promise<T>,
  ms: number,
  cleanup: () => Promise<void>,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(name + ' timed out after ' + ms + 'ms')),
      ms,
    );
  });

  try {
    return await Promise.race([work, deadline]);
  } catch (error) {
    await cleanup();
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

it('fails and cleans up a stalled initialize phase', async () => {
  vi.useFakeTimers();
  const cleanup = vi.fn(async () => undefined);
  const pending = new Promise<never>(() => undefined);
  const result = withinPhase('initialize', pending, 15_000, cleanup);

  await vi.advanceTimersByTimeAsync(15_000);
  await expect(result).rejects.toThrow('initialize timed out after 15000ms');
  expect(cleanup).toHaveBeenCalledOnce();
  vi.useRealTimers();
});
\`\`\`

The real cleanup callback should close the MCP client and verify the child is gone. A mock proves helper logic, while an integration case must prove process state on the CI platform.

Keep timer tests apart from the remote cold lane. Fake timers should never control npx or OS process time, because that would give a quick test with no first-run proof.

Retain per-phase time and the chosen limits with each release. The [MCP Inspector tutorial](/blog/mcp-inspector-tutorial-2026) can replay a protocol stall, but npm fetch stalls need package manager logs instead.

Reject a tools response that arrives after its limit even if the full job cap has time left. Clear phase rules make slow regressions visible before they grow into host timeouts.

## How should cold tools list verification be asserted?

Cold tools list verification should require the exact six names registered in packages/mcp/src/index.ts. Sort them before comparison, then check each tool has a title, description, and object input schema.

The names are search_skills, get_skill, get_skill_content, install_skill, list_categories, and get_leaderboard. A duplicate name, missing name, or extra tool should fail with a set diff.

Do not call the tools in this first-run gate unless a separate fixture owns API data. tools/list is local server behavior and should pass even when qaskills.sh cannot be reached.

Check the initialize reply first. serverInfo name and version, tools capability, protocol version agreement, and a valid response ID show that the list came from the intended session.

For each tool, require inputSchema to be a JSON object. Keep deep schema snapshots in a contract suite, since this smoke should stay stable when a safe description changes.

The install_skill annotation is not a cold-start need. It can be checked elsewhere with file isolation, while this gate avoids any write tool call.

Assert stdout has only protocol frames. Stderr may contain npm or server text, but save it only when needed and never treat its mere presence as a protocol failure.

Run the same list check once with a warm cache. Results should match byte for byte after sorting owned fields, which proves cache state did not alter tool discovery.

Run the packed local lane before publication and the pinned public lane afterward. If only public cold fails, compare package archive, npm data, registry route, and runner access before changing MCP code.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) gives the expected job of each tool. This check focuses on names and basic shape, which are enough to prove useful first discovery.

MCP cold npx startup testing passes when download, handshake, list, and shutdown all finish within their own limits. A valid list from a process that cannot close is not a clean pass.

## Step-by-step test implementation

Build the probe in six steps that isolate package state before they touch the network. Keep all temp files under one root so cleanup can be both simple and checked.

1. Read packages/mcp/README.md, packages/mcp/package.json, packages/mcp/src/index.ts, and docs/product/MCP-SERVER-PLAN-2026-07.md. Record the README command, exact package version, bin, Node rule, runtime name, and six tool names.
2. Create a blank root with separate home, npm cache, npm logs, and cwd folders. Confirm the cwd has no package file or node_modules, then build a small env allowlist without local resolution hints.
3. Spawn npx -y with the pinned @qaskills/mcp version and connect through an MCP client. Start fetch and hard-run clocks, keep stdout as protocol data, and capture stderr through a safe bounded buffer.
4. Complete initialize, send the ready notice through the client SDK, and request tools/list. Assert runtime name, version, tools capability, exact sorted names, and basic schema objects.
5. Run missing-version, stalled-initialize, empty-list, stray-stdout, and stuck-close fixtures in safe local doubles. Require named phase failures, no empty success, timer cleanup, and no child left alive.
6. Run a packed lane before npm publish and a new-cache public lane after it. Save safe phase data and hashes, close all handles, remove the root, and fail if cleanup leaves cache or process state.

Create local fault doubles instead of sending malformed packages to npm. The cold public lane should stay read-only except for its own cache and should never publish as part of a test.

Use a job lock if two probes share a registry rate limit, but never share their cache. Parallel runs with one cache can turn one strict cold case into an unseen warm case.

The [getting started page](/getting-started) can host user steps after the release is sound. Keep this CI command direct and free of any editor login or manual prompt.

Run MCP cold npx startup testing from at least the same OS and Node line used by most release checks. Add other hosts only when a real support claim needs proof, and label each result by platform.

## Failure triage and regression ownership

Triage the earliest failed phase and ignore later noise until that phase is fixed. A fetch error can cause broken pipes and close errors, but those do not make the MCP runtime the first owner.

Package not found or wrong version belongs to npm release ownership. Give that owner the package spec, registry host, npm status, and publish record without any auth value.

A fetched package with no bin or missing dist belongs to package build and archive ownership. Compare packages/mcp/package.json with the installed package files and the release tarball hash.

A child that starts but sends no valid frame belongs to runtime startup or stdio ownership. Check Node version, module load errors, stray stdout, and packages/mcp/src/index.ts before testing web calls.

An initialize error with a clear protocol response belongs to the MCP package or SDK compatibility layer. Keep protocol versions, request ID, server error, and package version in the report.

A correct initialize with a wrong or empty list belongs to tool registration. Diff names against the six source registrations and reproduce with the same package through the Inspector.

A complete list followed by a stuck close belongs to process lifecycle code or SDK transport. Preserve the stop ladder and child status, then add that exact close case to the local lane.

A pass on warm cache and fail on cold cache points toward package fetch, install, or bin setup. Do not weaken the strict lane by preloading the package just to make release CI green.

Use the [blog hub](/blog) and [QA skills directory](/skills) to route the proven defect to a fitting owner. The issue should include one phase label, one safe record, and one exact replay command.

Close the defect only after both packed and public cold lanes pass from new roots. A rerun that keeps the failed cache may hide the same first-run fault.

## Frequently Asked Questions

### What does an npx MCP first run test prove?

An npx MCP first run test proves that a pinned remote package can be fetched, its declared bin can start, and a clean MCP client can complete discovery. It should run outside the workspace with a new home and cache, then save phase results without any npm credential value.

### Why must an empty npm cache smoke test also use an empty cwd?

An empty npm cache smoke test still risks using a matching package from local project deps or workspace links. A new cwd with no package files removes that shortcut, while a new cache proves npx must fetch the pinned artifact rather than reuse bytes from a prior run.

### Which failures belong to MCP package download startup?

MCP package download startup owns registry access, missing versions, cache writes, archive fetch, engine checks, and bin resolution before the first protocol frame. The test should label that phase separately from initialize, because server code may never have run when npx exits or waits.

### How should teams set an npx initialization timeout?

Teams should measure normal CI runs, choose a reviewed limit above expected variation, and keep a larger hard cap for the whole probe. The timeout must start at a proven event, stop the child in stages, clear its timer, and fail rather than treat a missing reply as empty success.

### What makes cold tools list verification strong?

Cold tools list verification is strong when it follows a valid initialize reply and requires the exact six sorted QASkills tool names with basic schema objects. It should reject missing, duplicate, and extra tools, keep API calls out, and also prove the fetched process closes cleanly.

## Conclusion

MCP cold npx startup testing proves the public first run from empty package state through clean shutdown. A pinned fetch, phase clocks, exact initialize data, six-tool checks, safe logs, and strict cleanup show where any cold failure begins.

Review the [QASkills MCP integration](/mcp), then browse repeatable launch checks in the [QA skills directory](/skills). Apply this cold-start matrix before the next MCP release and keep its phase record with the package tag.`,
};
