import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP subprocess launch smoke testing',
  description:
    'MCP subprocess launch smoke testing guide with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP subprocess launch smoke testing',
  keywords: [
    'MCP subprocess launch smoke testing',
    'spawn MCP server test',
    'stdio handshake smoke test',
    'capture MCP stderr',
    'MCP process hang detection',
    'tools list subprocess test',
  ],
  relatedSlugs: [
    'mcp-inspector-tutorial-2026',
    'mcp-conformance-github-actions-baseline-2026',
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle',
    'https://nodejs.org/api/process.html',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'docs/product/MCP-SERVER-PLAN-2026-07.md',
    'packages/mcp/package.json',
  ],
  content: `MCP subprocess launch smoke testing must start the real binary, complete initialize and tools/list, collect stderr separately, and stop every child on time. Success means the wire replies arrive before stdin closes and the process then exits. A timeout, invalid stdout, fatal diagnostic, or surviving child disproves that contract.

## What must MCP subprocess launch smoke testing prove?

MCP subprocess launch smoke testing must prove one complete process lifecycle, not merely successful module import. The harness starts the built command, exchanges real stdio messages, observes tools/list, closes input, and confirms a timely process exit.

The central oracle combines several signals because any single signal can lie. A child process identifier proves only that spawn returned, while one parsed reply proves neither tool setup nor clean shutdown.

The expected path begins with an initialize request carrying a supported wire version and client identity. After its response, the client sends the initialized notification before requesting the available tools.

The process must stay alive while that exchange remains active. An early zero exit is still a failure because it leaves the wire request unanswered and cannot serve an MCP host.

At the end, the harness closes stdin and waits for an exit event within a short, measured deadline. It also checks that no descendant or open handle keeps the test runner alive after the child reports completion.

Stdout and stderr require separate buffers from the first byte. Wire data belongs on stdout, while fatal startup information belongs on stderr and must never be accepted as a wire response.

The [MCP integration page](/mcp) describes the command users launch. The automated boundary should invoke the same built entry rather than a test-only wrapper that skips transport setup.

MCP subprocess launch smoke testing therefore proves readiness, useful wire behavior, channel discipline, and cleanup together. It does not need a live catalog request because initialize and tools/list exercise startup without introducing remote service availability.

## Which repository behavior defines the contract?

The production entry in \`packages/mcp/src/index.ts\` creates a \`StdioServerTransport\` and awaits \`server.connect(transport)\`. Its final catch writes a fatal message with \`console.error\` and assigns exit code one.

That sequence gives the test two repo-owned facts. A healthy child answers transport requests through stdout, while a rejected top-level connection produces a diagnostic on stderr and a nonzero exit.

The same source registers six tools before \`main\` runs. A tools/list response should therefore contain the exact public names rather than only a nonempty array or a convenient test fixture.

Those names are \`search_skills\`, \`get_skill\`, \`get_skill_content\`, \`install_skill\`, \`list_categories\`, and \`get_leaderboard\`. Exact set comparison catches missing setup, duplicate naming, and stale build output.

The acceptance record in \`docs/product/MCP-SERVER-PLAN-2026-07.md\` calls for a live stdio sequence from initialize through tools/list, search, and installation. This focused smoke stops after tools/list so network and filesystem behavior can remain in separate suites.

The package metadata at \`packages/mcp/package.json\` maps \`qaskills-mcp\` to \`./dist/index.js\`. Resolve that field from the committed manifest instead of hard-coding a path that may drift from the distributed command.

The [MCP transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) states that a stdio server reads messages from stdin and writes wire messages to stdout. It also keeps stderr available for logging, which supports the split capture oracle.

The [MCP lifecycle specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle) defines initialization as the first negotiated interaction. A tools/list request sent before that exchange would test an invalid client sequence rather than normal launch behavior.

Use the [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) for configuration context, but derive checks from these repo files. Documentation examples can explain launch syntax without replacing the executable contract.

MCP subprocess launch smoke testing should record the package version beside every trace. That detail reveals when CI launched an old dist artifact even though current TypeScript contains the expected tools.

## How should QA teams test spawn MCP server test?

A spawn MCP server test should build once, read the package bin mapping, and launch Node with three piped streams. Pass a minimal environment, preserve only needed path values, and point the API base at a local fixture even when this exchange makes no request.

Create line-oriented stdout parsing as soon as data arrives. Preserve incomplete trailing bytes between chunks because process streams may split one JSON message at any byte boundary.

Index replies by JSON-RPC id instead of assuming one data event equals one response. The harness can then await initialize id one and tools/list id two independently from chunk timing.

Send initialize as one compact JSON object followed by a newline. After validating its result, send the initialized notification and the tools/list request through the same open stdin stream.

The first check checks the negotiated response shape and server identity. The second compares the six returned tool names as an exact sorted set and confirms every item carries an input schema.

Track all child events in order, including spawn, stdout message, stderr chunk, stdin close, exit, and close. An event ledger turns a vague timeout into a concrete last-known lifecycle point.

Use a unique timeout for readiness and another for shutdown. A slow initialization and a surviving child are different faults, so combining them under one timer weakens ownership.

MCP subprocess launch smoke testing should fail on any unexpected stderr in the healthy case. If later versions add documented startup diagnostics, update the explicit allowlist rather than ignoring the entire channel.

The [MCP Inspector tutorial](/blog/mcp-inspector-tutorial-2026) is useful for interactive diagnosis after this automated gate fails. The test itself should remain headless, repeatable, and independent from a developer desktop.

Always register cleanup before writing the first request. If parsing throws or a check fails, the cleanup path still closes stdin, sends a stop signal, and escalates when the child does not leave.

## Test matrix for stdio handshake smoke test

The stdio handshake smoke test needs positive, malformed, early-close, and timeout rows. Each case should name the last accepted wire event and the required final process state.

Keep the healthy request bytes identical across platforms. Vary only the fault under test so a changed result cannot be blamed on unrelated client capabilities or environment data.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Normal launch | Valid initialize, notification, and tools/list | Two valid responses, six exact tools, clean exit after stdin closes | Missing reply, wrong tool set, or surviving child | \`packages/mcp/src/index.ts\` |
| Split input chunks | One request written across several chunks | Server reconstructs one valid request | Parse error or duplicate response | MCP stdio transport |
| Repeated tools/list | Two request ids after initialization | Each id receives the same exact tool set | One reply is lost or state changes | \`packages/mcp/src/index.ts\` |
| Missing initialization | tools/list sent first | Harness records a protocol failure without hanging | Empty success or endless wait | MCP lifecycle |
| Malformed JSON | Truncated request followed by stdin close | Process terminates or reports a stable protocol error | Child remains alive after deadline | MCP stdio transport |
| Early stdin close | Input closes after spawn | Child exits within shutdown budget | Orphaned process or open pipe | Node child lifecycle |
| Fatal startup | Entry cannot connect transport | Diagnostic appears only on stderr and exit is nonzero | Error text appears on stdout | \`packages/mcp/src/index.ts\` |
| Stale build | Dist tool set differs from source contract | Exact set assertion fails with package version | Nonempty tools list passes | \`packages/mcp/package.json\` |

The repeated request row reveals stateful parser mistakes that one exchange misses. It also confirms response matching uses ids rather than array position or timing.

Malformed input is not permission to leave a child behind. Even when the wire result varies by SDK version, the harness cleanup and deadline remain exact test-owned requirements.

An early close can occur before the spawn callback on a busy runner. Cleanup should tolerate that race and report which events happened instead of raising a second error that hides the first.

Use the [GitHub Actions conformance baseline](/blog/mcp-conformance-github-actions-baseline-2026) when promoting the matrix into CI. Keep this smoke focused on the binary lifecycle rather than duplicating every wire conformance case.

MCP subprocess launch smoke testing passes the table only when the healthy row and every cleanup oracle agree. A green response followed by forced stop still exposes a shutdown defect.

## What failures expose capture MCP stderr?

To capture MCP stderr correctly, attach the listener before awaiting spawn and retain bytes independently from stdout. Merge timestamps in a diagnostic view only after each channel has already been classified.

The healthy fixture expects an empty stderr buffer. That strict default catches banners, dependency warnings, accidental debug calls, and fatal errors that did not change the process exit code.

For a forced startup failure, expect text beginning with the repo's fatal prefix and a nonzero exit. Do not lock the rest of the message to an operating-system-specific path or stack trace.

The positive contract below launches the built binary and waits for response ids. It verifies the exact tool inventory before closing stdin and observing exit.

\`\`\`typescript
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { expect, test } from 'vitest';

test('serves initialize and tools/list before clean shutdown', async () => {
  const child = spawn(process.execPath, ['packages/mcp/dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, QASKILLS_API_URL: 'http://127.0.0.1:9' },
  });
  const replies = collectJsonLines(child.stdout);
  let stderr = '';
  child.stderr.setEncoding('utf8').on('data', (chunk) => {
    stderr += chunk;
  });

  child.stdin.write(jsonLine(initializeRequest(1)));
  expect(await replies.forId(1)).toMatchObject({ jsonrpc: '2.0', id: 1 });
  child.stdin.write(jsonLine({ jsonrpc: '2.0', method: 'notifications/initialized' }));
  child.stdin.write(jsonLine({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));

  const listed = await replies.forId(2);
  expect(listed.result.tools.map((tool: { name: string }) => tool.name).sort()).toEqual(
    expectedToolNames,
  );
  child.stdin.end();
  expect(await once(child, 'exit')).toEqual([0, null]);
  expect(stderr).toBe('');
});
\`\`\`

The collector must reject non-JSON stdout immediately and include a printable byte prefix in its error. Waiting for a requested id after discarding invalid output would turn wire corruption into a misleading timeout.

The next example supplies a cleanup helper that escalates from input close to stop. It preserves the original test error while making a surviving process an explicit second failure.

\`\`\`typescript
async function stopChild(child: ChildProcess, budgetMs = 750): Promise<void> {
  if (child.exitCode !== null) return;
  child.stdin?.end();

  if (await exitsWithin(child, budgetMs)) return;
  child.kill('SIGTERM');
  if (await exitsWithin(child, budgetMs)) return;

  child.kill('SIGKILL');
  if (!(await exitsWithin(child, budgetMs))) {
    throw new Error('MCP child survived stdin close, SIGTERM, and SIGKILL');
  }
}

afterEach(async () => {
  await Promise.all(activeChildren.splice(0).map((child) => stopChild(child)));
  expect(activeChildren).toHaveLength(0);
});
\`\`\`

Run cleanup from a \`finally\` block when the main check fails. Otherwise, the first timeout can leak a process that corrupts later rows and keeps Vitest open.

MCP subprocess launch smoke testing should attach stderr and event ledgers to failed CI runs. Retain only bounded output because a noisy runaway child could otherwise exhaust artifact storage.

## CI coverage for MCP process hang detection

MCP process hang detection should use wall-clock deadlines around named phases rather than a single test timeout. Recommended phases are spawn, initialize response, tools/list response, graceful shutdown, and forced cleanup.

Choose local budgets from measured healthy runs, then leave enough margin for shared CI hosts. A phase that normally takes milliseconds should not inherit the production network timeout of ten seconds.

Wrap every pending reply with an abortable timer. When it fires, report outstanding JSON-RPC ids, complete parsed messages, buffered partial stdout, bounded stderr, and child status.

The shutdown timer begins only after stdin has been closed. Starting it at process spawn would mix wire time with stop time and produce unstable failures.

On Unix runners, record signal and exit code separately. The [Node process documentation](https://nodejs.org/api/process.html) explains that exit codes and signals are distinct stop facts.

Windows runners may not support identical signal escalation semantics. Keep the required outcome platform-neutral: no living child, no open pipes, and a bounded test completion time.

Run the smoke after the MCP package build on every relevant pull request. Launching TypeScript through a test transformer does not validate the CJS bundle, shebang, bin mapping, or production dependency graph.

The focused command should fail if dist is missing rather than silently rebuilding. Build and smoke become separate CI steps, which makes stale or absent artifact faults easier to assign.

Use the [getting started guide](/getting-started) for a developer reproduction path. CI should print the exact Node version, package version, command arguments, and timeout phase without exposing unrelated environment variables.

MCP subprocess launch smoke testing needs one retry only for evidence, not for status recovery. If a rerun passes, keep the first trace and leave the job failed until the flaky lifecycle cause is understood.

## How should tools list subprocess test be asserted?

A tools list subprocess test should compare semantic wire fields and exact repo-owned names. It should not snapshot request ids, incidental key ordering, or SDK-generated descriptions that are outside the launch question.

Assert JSON-RPC version, matching response id, a result object, and a tools array. Then sort the names and compare them with the six entries in \`packages/mcp/src/index.ts\`.

Every returned entry should include an object-shaped input schema. This check catches a packaging or setup failure that leaves names visible but makes the tools unusable to a client.

Also reject duplicate names before sorting. A set-only check could hide duplicate setup if the expected names are all present alongside repeated entries.

Record the raw tools/list response in the failure artifact after removing no fields, since this response contains public schemas rather than user data. Its exact shape helps separate SDK output changes from missing tool entries.

Do not call search_skills inside the core launch gate. That action introduces HTTP availability and timeout behavior, while tools/list remains a complete test of transport startup and setup.

Add one extended smoke in a later job when end-to-end catalog behavior matters. The [QASkills blog index](/blog) links those API and installation test boundaries without forcing them into every binary launch.

MCP subprocess launch smoke testing should require a response after the initialized notification, not merely after initialize. This proves the client followed the valid lifecycle before asking for capabilities.

Order checks need care because stderr and stdout are independent streams. Require wire order within stdout, but use event timestamps rather than assuming cross-stream callbacks have a universal sequence.

Finally, compare package metadata with the response server version when that value is present. A mismatch points to stale dist output or an incorrectly resolved command before any deeper tool check runs.

## Step-by-step test implementation

Implement the harness from executable metadata outward. The sequence below keeps production launch, wire facts, and cleanup under one fixed owner.

1. Build \`@qaskills/mcp\`, read \`packages/mcp/package.json\`, resolve its bin path, and fail when that artifact is absent or outside the package.
2. Spawn the command with piped stdin, stdout, and stderr, then register bounded buffers, event listeners, active-child tracking, and cleanup immediately.
3. Send initialize, validate its correlated response, send the initialized notification, and request tools/list with a new identifier.
4. Compare the exact six tool names and schema presence, while rejecting any invalid stdout byte or unexpected healthy-case stderr output.
5. Close stdin, require exit before the graceful deadline, inject malformed and stalled fixtures, and prove forced cleanup leaves no child behind.
6. Run source build and subprocess smoke as separate CI steps, retaining version, event ledger, bounded streams, and timeout phase for failures.

### A plain run sheet for one child

Give each run a short case name, and write that name next to the child id. Add the Node and package versions before the first byte is sent. This small card keeps old build data from being mixed with a new run.

Set one clock for start, one for each reply, and one for the last stop. Name each clock in the log when it starts and when it ends. A red clock then points to one phase instead of the whole test.

The test rig must own the child from its first spawn event. Put the child in a set at once, then remove it after close. At the end, that set must be blank for both good and bad cases.

Write the first request as one known byte string and save its request id. Do not let a helper pick a new id on each run. A fixed id makes the first reply easy to find in a short trace.

When the first reply comes back, check its id before any deep field checks. Then send the note that marks the first phase as done. Send tools/list last, with a new id that no prior line used.

Sort the six tool names only after you have checked for a repeated name. A set can hide two tools with the same name. The count, names, and input shapes must all match the source list.

Keep stdout as bytes until a full line has been read. A chunk is not a line, and one line may span many chunks. Save any last part until the next chunk or stream close.

Keep stderr on its own path from the start of the run. The good case should have no text there at all. A bad start should show the known fatal lead and a nonzero end state.

If a reply clock runs out, stop new writes and take one trace at once. List the ids still due and show the last safe bytes. Then close the input pipe and start the stop clock.

The stop path should use the least force that can end the child. Close input first, then send a soft stop if the child stays up. Use a hard stop only after the next short clock runs out.

Do not hide a red run with a pass on the next try. Keep the first trace, since it may show a race that soon goes away. A rerun can add proof, but it should not erase the first result.

Run one false child that waits for all time and sends no reply. The rig must name the reply phase, stop that child, and end on time. This check proves the clocks and stop path both work.

Run one false child that sends a good reply and will not stop. The rig must pass the wire check but fail the stop check. That split keeps a shutdown fault from being called a parse fault.

Use the same command shown on the [MCP page](/mcp) when the full build is under test. Use the [start guide](/getting-started) only to help a person replay it. The test must still set its own cwd, pipes, and clean state.

End each run with one short line that says what passed and what failed. Include the last phase, child state, and first bad fact. That line gives the next owner a clear place to start.

Start each case in a clean temporary directory even though tools/list does not write files. That isolation prevents configuration files or inherited working paths from changing package resolution.

Use one harness implementation for positive and negative cases. A second relaxed parser for faults can accidentally permit output that the real client would reject.

Keep test-created timers in a registry and clear them after every resolved phase. Forgotten timers can keep the runner active and imitate the very process hang under investigation.

The [verified skills directory](/skills) offers suitable later fixtures for search and install checks. This launch suite should complete before any selected skill or network response becomes relevant.

MCP subprocess launch smoke testing is ready for release gating when a deliberate banner, dropped reply, and ignored stdin close each produce a distinct failure. Those mutation checks demonstrate that the checks can actually detect the rejected behavior.

## Failure triage and regression ownership

Begin triage with the last completed phase rather than the broad label "MCP failed." No spawn event points to command resolution or permissions, while spawn without initialize response points to bundle startup, transport setup, or stdout parsing.

An initialize response followed by a missing tools/list result narrows ownership to lifecycle sequencing, entries, or later transport state. Print the request ids and parsed message methods before investigating remote APIs.

Valid wire responses plus unexpected stderr usually belong to package startup or a dependency warning. Invalid stdout belongs to the component that wrote the first nonprotocol bytes, even when the child later exits zero.

A clean exchange followed by a shutdown timeout belongs to transport teardown, open handles, or harness input closure. Confirm stdin really emitted finish before changing production code.

When the exact tool set differs, compare source entries, package version, and dist timestamp. This three-way check separates intentional API change from stale artifact use.

If only CI fails, compare Node version, operating system, command path, event deadlines, and inherited environment. Do not raise the timeout before examining which phase consumed the time.

The [MCP integration reference](/mcp) helps reproduce the user-facing command, while the captured event ledger remains the primary engineering artifact. Support screenshots cannot replace raw process and wire evidence.

Assign test harness defects when the collector drops split chunks, reuses ids, or leaves timers active. Assign MCP package defects when a standards-compliant exchange fails through the built command under a clean environment.

MCP subprocess launch smoke testing should end triage with a minimal replay command and one bounded trace. That package lets the owning team reproduce the same lifecycle without rerunning the entire web or catalog suite.

## Frequently Asked Questions

### Must the smoke test call a live QASkills API?

No, initialize and tools/list can prove binary startup, lifecycle negotiation, setup, channel separation, and shutdown without remote traffic. Keep live search and installation in an extended end-to-end job. This separation makes launch failures stable and prevents a catalog outage from obscuring a process defect.

### Why should a spawn MCP server test use the built file?

The built file includes the module format, bin mapping, bundled output, production dependencies, and startup entry users receive. Importing source through a test runner skips several release risks. A subprocess against dist therefore catches packaging and execution faults that direct handler tests cannot observe.

### What is the key stdio handshake smoke test assertion?

The key check is a correlated tools/list response after a valid initialize exchange and initialized notification. Verify the exact six names, valid schemas, and clean wire output. Then close stdin and require timely exit, because a correct reply from a child that never stops is not a passing lifecycle.

### How should a harness capture MCP stderr?

Attach a dedicated stderr listener immediately after spawn and keep its bytes separate from stdout. Expect no diagnostics during the healthy exchange, then assert the documented fatal prefix in a forced startup failure. Bound retained bytes and include timestamps so noisy output cannot overwhelm CI artifacts.

### What timeout best detects an MCP process hang?

Use measured phase deadlines rather than one arbitrary total. Give spawn, initialize, tools/list, and graceful shutdown separate budgets, then escalate cleanup through stop signals. Report the phase, pending ids, stream tails, and process status so the timeout names a useful failure instead of merely ending the job.

## Conclusion

MCP subprocess launch smoke testing is credible only when it exercises the distributed entry, valid lifecycle traffic, exact tool setup, strict stream separation, and fixed teardown. The combined oracle rejects early exits, silent hangs, polluted stdout, and stale builds without depending on a remote catalog.
Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this lifecycle matrix before the next MCP release.`,
};
