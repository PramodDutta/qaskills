import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP client working directory isolation',
  description:
    'MCP client working directory isolation with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP client working directory isolation',
  keywords: [
    'MCP client working directory isolation',
    'MCP subprocess cwd test',
    'cross-project skill install leak',
    'client workspace isolation',
    'parallel MCP project test',
    'install_skill cwd boundary',
  ],
  relatedSlugs: [
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
    'mcp-inspector-tutorial-2026',
  ],
  sources: [
    'https://nodejs.org/api/process.html',
    'https://nodejs.org/api/path.html',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  content: `MCP client working directory isolation is proven by starting two server processes in different project roots, installing one shared slug, and comparing both file trees. Each default install must land under its process root, while neither tree may contain a path derived from the other client. Explicit target paths require separate policy tests.

## What must MCP client working directory isolation prove?

MCP client working directory isolation must prove that each spawned server reads its own process root and builds default install paths from that value. The test needs two live process boundaries, one shared skill response, exact file checks, and a negative check across both roots.

The observable contract begins when a client starts the QASkills stdio server from a project root. An install call with no target selects either the local \`.claude/skills\` tree or the local \`.agents/skills\` tree, then writes one \`SKILL.md\` file.

The check must inspect paths, bytes, and returned tool text together. A green wire response without the expected file is false success, while a correct file in the wrong project is a serious isolation failure.

Two clients should use distinct temp parents rather than sibling folders under one reused fixture. That setup makes each path prefix clear and prevents cleanup for one case from hiding files written by another case.

The shared slug should contain plain safe characters for the main case. Slug encoding has its own contract, so adding reserved characters here would mix path isolation with a separate request-path concern.

Start with no \`.claude\` folder in either root and expect both installs below \`.agents/skills\`. Then add \`.claude\` to only one root and verify that its choice does not affect the other process.

The process boundary matters because \`process.cwd()\` belongs to a running Node.js process. The [Node process reference](https://nodejs.org/api/process.html) documents that API, while the test proves how this repo consumes it.

Keep explicit \`targetDir\` cases outside the default guarantee. The current code resolves an absolute target or parent traversal as supplied, so it does not enforce a security sandbox around that optional input.

That distinction prevents a false claim. The default path can be project-local by construction, yet a caller-set path remains a write target until product rules say otherwise.

Teams new to the package can review the [QASkills MCP integration](/mcp) before building the fixture. The broader [MCP server guide](/blog/qaskills-mcp-server-guide) supplies context, but this suite owns only process roots and final writes.

## Which repository behavior defines the contract?

The code sequence is clear in \`packages/mcp/src/index.ts\`. Its \`installSkill\` function downloads content first, reads \`process.cwd()\`, chooses a default target, resolves the final root, creates it recursively, and writes UTF-8 text.

Default choice calls \`existsSync(path.join(cwd, '.claude'))\`. A present \`.claude\` directory selects \`.claude/skills\`; otherwise, the function uses \`.agents/skills\` under that same process root.

The final root uses \`path.resolve(cwd, target, slug)\`. The [Node path reference](https://nodejs.org/api/path.html) explains resolution rules, including how an absolute later segment can replace the earlier base.

That rule is why tests must split default and explicit targets. A default relative target remains under \`cwd\`, but an absolute \`targetDir\` is not confined merely because \`cwd\` was the first argument.

After path choice, \`mkdir\` receives \`recursive: true\`, and \`writeFile\` stores downloaded content as UTF-8. The returned text includes the final \`SKILL.md\` path, giving the suite a second view of the chosen path.

The code starts one \`McpServer\` with \`StdioServerTransport\`. The [MCP stdio transport rules](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) define the wire stream boundary, while disk path remains application code.

The server instructions state that \`install_skill\` writes into the current project. Tool annotations mark the work as not read-only, not destructive, and idempotent, so tests should retain both wire metadata and actual disk effects.

The manifest in \`packages/mcp/package.json\` names the bin entry as \`dist/index.js\` and requires Node 20 or newer. A [black-box MCP suite](/getting-started) should build that package and launch the same entry rather than a copied test server.

The package manifest includes the MCP SDK and Zod as runtime dependencies. It does not declare a test runner, so workspace CI must provide Vitest or another harness from the repo test setup.

Network code also affects the fixture. Content is fetched from \`/api/skills/{slug}/content\` before roots are created, so the local API stub must answer that route deterministically.

Tracking starts only after a successful write and runs without blocking the install result. Set \`DO_NOT_TRACK=1\` in this suite to keep network checks focused on content fetches rather than install reports.

MCP client working directory isolation therefore spans process launch, local HTTP input, path choice, file creation, and result text. A unit test of \`path.resolve\` alone cannot prove that complete chain.

## How should QA teams test MCP subprocess cwd test?

An MCP subprocess cwd test should launch the built server twice through the SDK client transport. Give each transport a distinct \`cwd\`, the same local API base, and a copied env with tracking disabled.

Use a small HTTP server that returns one fixed SKILL.md body only for the expected content route. Record each request, reject unknown paths, and wait until the fixture is listening before either client connects.

Create both roots with \`mkdtemp\`, then create \`.claude\` in only the first root. This produces two valid default branches without changing the request, content, slug, or client tool arguments.

The following Vitest example exercises the built \`packages/mcp/src/index.ts\` code through \`packages/mcp/dist/index.js\`. It uses the actual stdio transport, exact process roots, and real temp writes.

\`\`\`typescript
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterEach, expect, it } from 'vitest';

const openTransports: StdioClientTransport[] = [];

async function startSkillApi(body: string) {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url ?? '');
    if (request.url !== '/api/skills/cwd-fixture/content') {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': 'text/markdown' }).end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing API address');
  return {
    baseUrl: \`http://127.0.0.1:\${address.port}\`,
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

async function connectFrom(cwd: string, baseUrl: string) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve('packages/mcp/dist/index.js')],
    cwd,
    env: {
      PATH: process.env.PATH ?? '',
      HOME: process.env.HOME ?? cwd,
      QASKILLS_API_URL: baseUrl,
      DO_NOT_TRACK: '1',
    },
  });
  openTransports.push(transport);
  const client = new Client({ name: 'cwd-contract', version: '1.0.0' });
  await client.connect(transport);
  return client;
}

afterEach(async () => {
  await Promise.allSettled(openTransports.splice(0).map((item) => item.close()));
});

it('keeps simultaneous default installs in their process roots', async () => {
  const api = await startSkillApi('---\\nname: cwd-fixture\\n---\\nUse this fixture.\\n');
  const first = await mkdtemp(path.join(tmpdir(), 'qaskills-a-'));
  const second = await mkdtemp(path.join(tmpdir(), 'qaskills-b-'));
  await mkdir(path.join(first, '.claude'));

  const [clientA, clientB] = await Promise.all([
    connectFrom(first, api.baseUrl),
    connectFrom(second, api.baseUrl),
  ]);
  const [resultA, resultB] = await Promise.all([
    clientA.callTool({ name: 'install_skill', arguments: { slug: 'cwd-fixture' } }),
    clientB.callTool({ name: 'install_skill', arguments: { slug: 'cwd-fixture' } }),
  ]);

  const pathA = path.join(first, '.claude/skills/cwd-fixture/SKILL.md');
  const pathB = path.join(second, '.agents/skills/cwd-fixture/SKILL.md');
  await expect(readFile(pathA, 'utf8')).resolves.toContain('Use this fixture.');
  await expect(readFile(pathB, 'utf8')).resolves.toContain('Use this fixture.');
  expect(JSON.stringify(resultA)).toContain(pathA);
  expect(JSON.stringify(resultB)).toContain(pathB);
  expect(api.requests).toEqual([
    '/api/skills/cwd-fixture/content',
    '/api/skills/cwd-fixture/content',
  ]);
  await api.close();
});
\`\`\`

Build \`@qaskills/mcp\` before this test so the distribution entry matches the inspected source. Resolve the executable before changing transport roots, because a relative executable path would be read from each child root.

The result check intentionally checks both wire output and bytes. If only one side is checked, a stale file or hard-coded success message could make the case pass without a current write.

Record client labels with each captured result. Concurrent finish order is not guaranteed, so do not infer ownership from which promise settles first.

Repeat the test with launch order reversed. The two path expectations must stay attached to client roots rather than array position, process id, or fixture creation order. MCP client working directory isolation passes this case only when both files exist, both contain exact content, both returned paths match, and no other-root paths appear.

## Test matrix for cross-project skill install leak

A cross-project skill install leak matrix should vary process roots, marker roots, run timing, and target input. Each row needs a disk check plus the exact rule boundary it represents.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
| --- | --- | --- | --- | --- |
| Separate default roots | Two processes, same slug, no \`.claude\` | Two \`.agents/skills\` files under matching roots | Either file appears below the other root | \`packages/mcp/src/index.ts\` |
| Split default branch | Only client A has \`.claude\` | A uses \`.claude\`; B uses \`.agents\` | B follows A's marker choice | \`packages/mcp/src/index.ts\` |
| Parallel writes | Calls start in one \`Promise.all\` | Both exact bodies and paths are present | One result masks the other write | MCP subprocess cwd test |
| Repeated install | Same client installs the slug twice | One path is reused with current content | A second project tree appears | \`packages/mcp/package.json\` |
| Failed content fetch | Stub returns 503 before file work | Tool returns an error and creates no skill file | Empty root or success text remains | MCP stdio transport |
| Shared-root harness bug | Both transports receive root A | Contamination guard fails before release | Suite claims two roots without proof | client workspace isolation |
| Relative explicit target | \`targetDir: 'custom/skills'\` | Path resolves below that process root | Target is resolved from another process | Node path rules |
| Parent explicit target | \`targetDir: '../outside'\` | Policy test records current escape behavior | Suite labels the input confined | install_skill cwd boundary |

The shared-root row tests the test itself. Deliberately pass the same root to both client factories and require the leak guard to fail with both labels and the duplicated real path.

The failed-fetch row follows code order. Since content retrieval occurs before \`mkdir\`, no path root should be created by this call when the API returns a non-success response.

Repeated install is idempotent at the picked file path, but the content may be replaced. Compare the final bytes with the second response and confirm no numbered sibling root was introduced.

Do not treat a missing other file as enough proof. Walk both complete temp trees, normalize their absolute paths, and reject any entry whose real prefix belongs to the other fixture.

Symlinks need a separate threat model if the product accepts untrusted workspaces. The current proof uses lexical path resolution and normal file writes; it does not show a real-path guard check.

That gap should be named rather than silently covered by a simple fixture. A future symlink rule can add \`realpath\` checks and host-exact cases without changing the current default-root characterization.

The matrix should retain the path separator reported by the host. Checks built with \`node:path\` remain portable, while hard-coded slash strings can fail on another operating system for the wrong reason.

Use the [agent directory](/agents) to understand supported install contexts, but derive expected files from code rather than page copy. Repository paths remain the source for this test contract.

## What failures expose client workspace isolation?

Client workspace isolation fails when one process observes marker state, target paths, files, or cleanup effects from another process. The strongest detector snapshots both roots before and after each call, then assigns each changed path to one client.

A global \`process.chdir\` inside a single test process is a weak substitute for child processes. Parallel tests can change that global value between setup and run, creating flaky results that resemble code defects.

Use transport-level child \`cwd\` options instead. They establish the working root before the server module loads and keep the parent test runner's root stable.

Fixture reuse is another common source of false results. If a prior test left \`.claude\` behind, the next default-path case may select a different branch even though code logic is correct.

Generate a fresh root for each case and inspect it before launch. Cleanup should run after checks, but logs should be copied first when a failure occurs.

The negative contract below makes leak detection explicit. It does not expect code to leak; it proves the check rejects a deliberately broken harness that launches both clients from one root.

\`\`\`typescript
import { readdir, realpath } from 'node:fs/promises';

async function listFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(root: string) {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const item = path.join(root, entry.name);
      if (entry.isDirectory()) await walk(item);
      else found.push(await realpath(item));
    }
  }
  await walk(root);
  return found.sort();
}

function assertWorkspaceResults(
  workspaces: Array<{ label: string; root: string; files: string[] }>,
) {
  for (const workspace of workspaces) {
    if (workspace.files.length === 0) {
      throw new Error(\`\${workspace.label} produced no file in its declared root\`);
    }
    const prefix = path.resolve(workspace.root) + path.sep;
    const escaped = workspace.files.find((item) => !item.startsWith(prefix));
    if (escaped) throw new Error(\`\${workspace.label} wrote outside its root: \${escaped}\`);
  }
}

it('makes a reused-root fixture fail with an actionable path', async () => {
  const api = await startSkillApi('---\\nname: cwd-fixture\\n---\\nFixture body.\\n');
  const rootA = await mkdtemp(path.join(tmpdir(), 'client-a-'));
  const rootB = await mkdtemp(path.join(tmpdir(), 'client-b-'));
  const clientA = await connectFrom(rootA, api.baseUrl);
  const clientB = await connectFrom(rootA, api.baseUrl); // Deliberate harness defect.

  await clientA.callTool({ name: 'install_skill', arguments: { slug: 'cwd-fixture' } });
  await clientB.callTool({ name: 'install_skill', arguments: { slug: 'cwd-fixture' } });

  const filesA = await listFiles(rootA);
  const filesB = await listFiles(rootB);
  expect(() =>
    assertWorkspaceResults([
      { label: 'client-a', root: rootA, files: filesA },
      { label: 'client-b', root: rootB, files: filesB },
    ]),
  ).toThrow('client-b produced no file in its declared root');
  await api.close();
});
\`\`\`

The snippet assumes the connection and API helpers from the first example. Its failing message names client B and its empty declared tree, so a broken fixture cannot pass as a product result.

Production failures should preserve child standard error, tool content, request logs, and tree snapshots. Do not write test logs to child standard output because stdio servers reserve that stream for MCP messages.

The transport specification explicitly separates wire messages from other process output. Capture standard error as a test artifact, and treat malformed standard output as a separate transport defect.

If only Windows runners fail, compare normalized root casing and separator handling before changing expected paths. If only parallel jobs fail, check shared ports, root names, and cleanup ownership first.

MCP client working directory isolation should block release for any confirmed other-root write. A fixture-only failure also blocks trust in the suite until its process labels and roots are corrected.

## CI coverage for parallel MCP project test

A parallel MCP project test belongs after the MCP package build and before publication. It needs a local API fixture, isolated temp storage, a fixed timeout, and artifact retention for failed process runs.

Run the focused case on each change to \`packages/mcp/src/index.ts\` or \`packages/mcp/package.json\`. Changes to client transport dependencies should trigger it because launch semantics can alter child env and roots.

Use a unique loopback port picked by the operating system. Fixed ports make concurrent jobs compete, and a request reaching another job can return valid content for the wrong fixture.

Set \`DO_NOT_TRACK=1\` for fixed network counts. The [MCP server guide](/blog/qaskills-mcp-server-guide) links separate tracking checks, while this case expects only two content requests for two successful installs.

Give each client a distinct slug in one follow-up case. Shared slugs prove path separation, while distinct slugs make logs easier to assign when diagnosing a failed concurrent run.

Set a per-call timeout slightly above the server's ten-second HTTP timeout. A shorter harness timeout hides the package error, while a much longer timeout wastes CI time after a dead child.

Retain the two root trees as separate artifacts. Include a short manifest with client label, launch \`cwd\`, expected path, actual files, request path, and tool result.

Redact inherited env values before storing launch details. Only record the small allowlist used by the fixture, since parent CI variables may include credentials unrelated to the test.

The [getting started route](/getting-started) can help reviewers reproduce package setup. The regression command itself should stay in the MCP workspace and build the package before launching its distribution entry.

A practical gate runs the positive split-root case, the deliberate leak-check case, failed content fetch, and repeated install. Broader host cases can run nightly if their cost exceeds each pull request budget.

Do not retry a confirmed cross-root write automatically. Retries can erase the first tree or pass after scheduling changes, turning a severe race into a misleading green result.

MCP client working directory isolation earns a release pass only from one complete attempt. Reruns may gather proof, but they must not replace the first failed status.

## How should install_skill cwd boundary be asserted?

The install_skill cwd boundary should compare normalized absolute paths, exact file bytes, other-root absence, and unchanged parent areas. It must also state that caller-provided targets follow current path resolution rules rather than an enforced sandbox.

For default installs, compute expected paths from each known fixture root. Avoid deriving expected values from returned text, since that would let one wrong code value validate itself.

For result text, parse or compare the expected final path after the independent disk check. A message that mentions root A while bytes appear under root B should produce two clear failures.

For root choice, test \`.claude\` presence independently in each root. Marker state is sampled during the call, so create it before launching or before invoking the tool and document that timing.

Check other state with a sentinel file at each root. Its hash and timestamp should remain unchanged after install, proving the call wrote only its expected skill path within the observed tree.

The optional target needs three rows: normal relative input, absolute input, and parent traversal. The first should resolve from \`cwd\`; the latter two currently demonstrate that no confinement guard exists.

Do not turn those characterization rows into security approval. If policy later requires confinement, add a failing desired-contract test and change production code through a separately reviewed task.

The default slug also becomes a path segment in the local root. This article uses a safe slug because local path validation is not shown in the cited function beyond request encoding.

That fact creates a separate policy question for values containing separators. Keep it under the slug safety suite instead of broadening this process-root test without matching proof.

Use exact request counts to prove each process fetched its own input. A shared in-memory response is acceptable, but each install must perform a visible call before writing.

Track all child process exits. An unexpected early exit should fail even when stale fixture files happen to match expected content from setup.

The [MCP testing guide](/blog/mcp-server-testing-guide-2026) covers wider wire checks. This boundary suite remains narrow so each failure maps to launch setup, path choice, fetch order, or file writing.

MCP client working directory isolation is not established by one \`existsSync\` check. The full check joins independent process inputs with durable file outputs and rejects any unexplained change.

## Step-by-step test implementation

Implement MCP client working directory isolation in six controlled steps. Keep each stage clear in code review so fixture errors cannot hide inside a broad end-to-end helper.

1. Read \`packages/mcp/src/index.ts\` and record fetch order, \`cwd\` access, marker choice, path resolution, write code, tracking timing, and returned text.
2. Build the MCP package, start one loopback content server, and create two fresh temp project roots with distinct labels and sentinel files.
3. Launch two SDK stdio transports with different \`cwd\` values, one common API override, and tracking disabled through the child env.
4. Call \`install_skill\` in parallel for the same safe slug, then assert exact content, independent expected paths, returned text, request counts, and other-root absence.
5. Run failed fetch, repeated install, marker split, deliberate shared-root harness, and explicit-target characterization cases without reusing the positive roots.
6. Preserve standard error and tree manifests on failure, close transports and servers, remove temp roots, and run the focused suite in CI.

Step one separates repo fact from test design. Note the current optional target code and avoid writing an expectation that the code does not satisfy.

Step two should fail fast if the built bin is absent. Falling back to a source run changes module loading and can produce a different launch path than the published package.

Step three must copy only needed env values when practical. At minimum, override the API base and disable tracking so external state cannot change the request set.

Step four assigns expectations by client label rather than finish order. Save both results before walking trees, since early cleanup can remove proof needed by the slower call.

Step five proves several oracles, not merely extra code paths. The deliberate harness defect is especially useful because a leak check that never fails has no demonstrated value.

Step six closes children before deleting roots. On hosts with open file handles, reversing that order can create cleanup errors unrelated to path code.

Use the [MCP contract testing guide](/blog/mcp-server-contract-testing-guide) when integrating these checks with other tool contracts. Keep the focused command small enough for developers to run before each package release.

MCP client working directory isolation should have one named owner in the MCP package team. Client config owners supply launch fixtures, while the package owner resolves path and write regressions.

## Failure triage and regression ownership

Start triage with four facts: child launch root, captured content URL, returned install path, and actual tree changes. Those values usually identify the failing layer without guessing from one error message.

If the child launch root is wrong, assign the issue to the client fixture or client config. The server cannot recover the intended project root when its process starts elsewhere.

If launch is correct but both clients report one path, inspect shared test helpers and any parent \`chdir\` use. Then confirm each transport actually created a separate child process.

If paths differ but bytes appear in one tree, inspect target arguments and disk aliases. Resolve symlinks for logs, while keeping lexical and physical path claims distinct.

If no files exist and both calls return errors, inspect the local API request log first. A wrong content path or early server shutdown is a network fixture failure, not root leakage.

If one file is correct and another is absent, retain both child standard-error streams and exit statuses. Concurrent promises can hide an early process exit unless each client result is recorded independently.

If the wrong default branch appears, inspect whether \`.claude\` existed in that exact root at call time. A marker copied by shared setup should be fixed in the fixture.

If explicit parent or absolute targets leave the root, compare the result with documented current code. Escalate only when the accepted product rule says those inputs must be confined.

If standard output contains non-wire text, route the issue to MCP transport handling. The process can have correct files while still violating its stdio message channel.

The [MCP Inspector tutorial](/blog/mcp-inspector-tutorial-2026) helps reproduce tool calls by hand, but tree snapshots remain required. Inspector success alone cannot show where a server wrote its file.

Store a compact regression note with the smallest root pair, command, slug, and paths. Avoid attaching unrelated env dumps or full private workspace contents.

Close ownership only after the first failing matrix row passes without retries. A broad package rerun does not prove that the exact cross-project check now behaves correctly. MCP client working directory isolation has a clear release standard: two distinct process roots must produce two owned trees, with no unexplained path or byte changes elsewhere.

## Frequently Asked Questions

### How can tests prove installations never cross client workspaces?

Launch two real server subprocesses with different process roots, install the same safe slug, and inspect both complete trees. Assert exact file bytes and returned paths for each labeled client, then reject each changed path outside its owner root. A shared in-process root mock cannot prove this process-level contract.

### What is the minimum MCP subprocess cwd test?

The minimum case uses two fresh roots, one local content API, two stdio transports, and one parallel install per client. It checks the independently computed path, downloaded bytes, result text, request count, and absence of other-root files. It also closes each child before deleting either temp tree.

### How does a cross-project skill install leak appear?

A leak appears when a file, root, marker choice, or returned path for one client contains the other client's root. It can also appear as an empty declared tree when both child transports accidentally share one launch root. Tree manifests should name client labels and normalized absolute paths.

### Does client workspace isolation cover an explicit target directory?

Not as a confinement claim under the current code. A relative target resolves from the process root, while an absolute target or parent traversal can resolve elsewhere. Tests should characterize those inputs separately and avoid calling them safe until a reviewed product rule and matching guard define that boundary.

### Why run a parallel MCP project test instead of sequential calls?

Parallel calls expose shared fixture state, reused transport objects, port collisions, and parent-directory changes that sequential cases can hide. Keep labels attached to each promise because finish order may vary. A sequential control remains useful, but it cannot replace the concurrent release gate for separate client processes.

### What should the install_skill cwd boundary assert after failure?

It should preserve the child launch root, expected path, actual file tree, tool result, request log, standard error, and exit status. The check must distinguish a package write defect from a client launch mistake or API fixture failure. Cleanup should occur only after those small logs are retained.

## Conclusion

MCP client working directory isolation requires real child roots, independent expected paths, exact file checks, and a check that catches shared-root leaks. Keep default placement separate from explicit-target policy, and block release whenever one process writes into another declared workspace.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent [skills](/skills) and apply this test matrix before the next MCP release. The [blog index](/blog) provides related contract guides for the remaining wire and API boundaries.`,
};
