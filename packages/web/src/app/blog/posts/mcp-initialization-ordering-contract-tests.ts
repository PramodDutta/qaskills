import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP initialization ordering contract tests',
  description:
    'MCP initialization ordering contract tests explained through repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP initialization ordering contract tests',
  keywords: [
    'MCP initialization ordering contract tests',
    'MCP initialize first request',
    'initialized notification order',
    'tools before initialization',
    'MCP handshake state machine',
    'protocol lifecycle negative tests',
  ],
  relatedSlugs: [
    'mcp-server-contract-testing-guide',
    'mcp-inspector-tutorial-2026',
    'test-an-mcp-server-guide-2026',
    'qaskills-mcp-server-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle',
    'https://www.jsonrpc.org/specification',
    'https://ts.sdk.modelcontextprotocol.io/',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'docs/product/MCP-SERVER-PLAN-2026-07.md',
    'packages/mcp/package.json',
  ],
  content: `MCP initialization ordering contract tests should drive the server as a raw client and record every message state. A valid run sends \`initialize\` first, waits for its response, sends \`notifications/initialized\`, and only then lists tools, while any early tool success, accepted duplicate initialization, skipped completion, or broken process proves lifecycle drift.

## What must MCP initialization ordering contract tests prove?

MCP initialization ordering contract tests must prove one legal state transition from connected to ready. The client begins with \`initialize\`, receives a matching response, sends \`notifications/initialized\`, and can then request \`tools/list\`.

They must also stop bad state jumps or hold them safe. Tool calls before ready, a second init, an early done note, and a lost note must not look ready.

The core oracle includes message order, JSON-RPC IDs, response classes, advertised server facts, process health, stdout purity, and the point when six tools become visible. Counting tools alone cannot prove the handshake that exposed them.

The official [MCP lifecycle specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle) sets rules for init, use, and shut down. Repo tests should show those rules in each QASkills run.

Keep checks for the shared date and feature set small in this suite. Other tests can cover them in depth without hiding the main state change.

MCP initialization ordering contract tests need a raw transport because a high-level client may perform initialization automatically. Such a client can hide illegal-order checks and make every call appear after readiness.

Use one subprocess per sequence so state cannot leak between cases. A server that was initialized by an earlier test would make a pre-initialize request look valid for the wrong reason.

The scope ends once normal tool listing succeeds or an illegal sequence receives its expected failure. Tool schemas and handler effects belong in the [MCP server contract guide](/blog/mcp-server-contract-testing-guide).

A strong failure record shows sent frame, received frame, lifecycle state, stderr excerpt, exit status, and elapsed time. It should redact nothing from controlled fixtures because no production secrets enter this exchange.

Draw the state map before writing the peer code. Give each state one short name, one set of legal sends, and one clear next state.

Mark every sent frame on that map as the test runs. A bad frame then points to one state edge, not to a vague child task fault.

Keep the first pass small: one init, one done note, and one tool list. Once this path is sound, add bad orders one at a time.

Use fixed IDs that are far apart for each phase. This makes a crossed reply easy to spot when several frames reach the read queue at once.

The [MCP test guide](/blog/test-an-mcp-server-guide-2026) can help with the first local run. The raw peer must still save its own proof for each state edge.

## Which repository behavior defines the contract?

The file \`packages/mcp/src/index.ts\` constructs one \`McpServer\` with QASkills name, package version, and server instructions. It registers six tools before the process enters its transport lifecycle.

The \`main\` function creates \`StdioServerTransport\` and awaits \`server.connect(transport)\`. QASkills does not implement a second custom lifecycle state machine around that SDK connection.

The SDK enforces most of this order. QASkills still owns checks that the linked SDK works as planned when the app is built and run.

The dependency and runtime contract appear in \`packages/mcp/package.json\`, including \`@modelcontextprotocol/sdk\` at \`^1.29.0\` and Node 20 or newer. Record the resolved lockfile version during CI when behavior changes.

The [official SDK reference](https://ts.sdk.modelcontextprotocol.io/) shows the server and pipe APIs used here. It explains the code link, while the MCP life cycle page sets the wire rules.

The repository plan in \`docs/product/MCP-SERVER-PLAN-2026-07.md\` records a live stdio acceptance sequence. That sequence starts with initialize, then verifies \`tools/list\` shows six tools before exercising search and install.

The plan cannot stand in for a check of each done note. It gives the shipped smoke path, while this new test set checks bad paths too.

Six \`registerTool\` calls finish before \`connect\`, but that does not grant early access. Wire state must gate what the peer can call.

Fatal connection errors are printed with \`console.error\` and exit code 1. Normal protocol messages must stay on stdout without ordinary log lines, or a raw client cannot parse frames reliably.

The [JSON-RPC specification](https://www.jsonrpc.org/specification) gives calls IDs and makes notes ID-free. The done step is a note, so the peer must not wait for its reply.

MCP initialization ordering contract tests should label protocol requirements separately from QASkills facts. Source proves construction and connection; runtime frames prove how the integrated SDK handles each order.

The [MCP inspector tutorial](/blog/mcp-inspector-tutorial-2026) is useful for manual observation after an automated failure. CI still needs a deterministic subprocess ledger that does not depend on clicking an inspector.

## How should QA teams test MCP initialize first request?

The first init case should spawn the built command with piped stdin, stdout, and stderr. It must not use a live shell or pass wire text through a shell tool.

Create a line-oriented JSON reader that buffers partial chunks and parses complete frames. Streams may split one JSON value across chunks or deliver several values together, so one chunk cannot equal one message.

Send the init call with JSON-RPC \`2.0\`, one new ID, a fixed client name, feature data, and an approved date. Save the full object before it becomes wire text.

The first reply should use the same ID and hold a result, not an error. Check server name, build version, chosen date, and feature data without pinning key order.

Only after that reply arrives should the peer write \`notifications/initialized\`. Since this note has no ID, move on without a wait for an ack.

Send \`tools/list\` with another unique ID and require a result containing exactly the six registered tool names. Compare a sorted name list while separately checking that no duplicate tool exists.

Read stderr concurrently so a full buffer cannot block the child. A clean valid run should have no fatal error line, and stdout should contain only parseable protocol frames.

Set deadlines for process start, initialize response, and tool response. Distinct timers identify whether startup, negotiation, or ready-state dispatch stopped making progress.

Close stdin and await process exit during cleanup. If graceful shutdown is outside this suite's claim, use a bounded termination after collecting final state and report the chosen cleanup path.

MCP initialization ordering contract tests should repeat the valid sequence in a fresh process before running negative cases. This baseline proves the artifact and harness can communicate before illegal-order failures are interpreted.

The [test an MCP server guide](/blog/test-an-mcp-server-guide-2026) covers broader execution options. Here, raw stdio is required because exact request order is the subject under test.

Feed the line reader a frame split at each byte in a small unit check. Then feed it two full frames at once and ask for both in order.

The peer should own one queue for parsed frames and one list for bad text. Never drop a bad line, since that line may be the key sign of stdout harm.

Start stderr reads as soon as the child starts. If that pipe fills, the child can stall and make a sound wire path look dead.

Give each wait a name such as start, init, done, or tools. The wait name should be part of any time-out text and saved run log.

Close the child the same way after pass and fail. A fixed close path keeps stray child tasks from making the next case slow.

## Test matrix for initialized notification order

Initialized notification order is best modeled as explicit states: connected, initialize pending, initialize answered, ready, and closed. Every sent frame should name its expected source state and resulting state.

Use separate child processes for each row and retain only controlled message data. This removes cross-case uncertainty and keeps duplicate initialization meaningful.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| MCP initialize first request | Initialize is the first client frame | Matching result arrives and process stays alive | Error, wrong ID, or early exit | MCP lifecycle specification |
| Initialized notification order | Notification follows initialize response | Session reaches ready before tool listing | Notification sent or accepted too early | MCP lifecycle specification |
| Tools after ready | Valid handshake then \`tools/list\` | Exactly six unique tools are returned | Missing, extra, or duplicate tool | \`docs/product/MCP-SERVER-PLAN-2026-07.md\` |
| Tools before initialization | \`tools/list\` is the first request | No successful tool list is exposed | Six-tool success appears before handshake | MCP lifecycle specification |
| Initialize response pending | Tool request follows initialize request immediately | Tool success remains unavailable until response | Responses arrive in unsafe lifecycle order | MCP lifecycle specification |
| Early initialized notification | Notification is first frame | It does not create a ready session | Later tool list succeeds without initialize | MCP lifecycle specification |
| Skipped initialized notification | Tool list follows initialize response directly | Product acceptance detects incomplete handshake | Session silently appears fully ready | Repository acceptance rule |
| Duplicate initialize | Second initialize follows readiness | Stable protocol failure or connection handling | Second normal initialize result | MCP lifecycle specification |
| Repeated initialized notification | Completion notification is sent twice | No duplicate tools or state reset occurs | Tool registry changes or process crashes | \`packages/mcp/src/index.ts\` |
| Malformed JSON-RPC request | Initialize lacks required message fields | Error is contained and stdout remains parseable | Process hangs or emits raw text | JSON-RPC specification |

The skipped-notification row enforces the batch's QASkills readiness acceptance rule. If the pinned SDK currently behaves differently, the test should expose that gap rather than rewrite protocol history.

For requests that are forbidden before readiness, require at least the absence of a successful tool result. Then characterize and pin the integrated SDK's exact error code and message in a version-specific assertion.

Notifications may produce no direct response by design. Their oracle is the state of the next legal or illegal request, plus process health and absence of an unmatched response ID.

The malformed row must stay focused on message shape rather than random bytes. Separate framing and parser corruption tests can cover non-JSON input without overloading lifecycle ownership.

MCP initialization ordering contract tests should compare received IDs as a set and sequence. A valid payload attached to the wrong request ID is still a protocol failure.

Keep a good row next to each bad row in the test file. This shows that one small change in send order, not a new rig, caused the new result.

For the early note row, send no init call at all. The next tool call must still fail, which proves the note did not set ready by itself.

For the no-note row, wait for the init reply and then send tools. This is not the same as a tool call sent while init is still in flight.

For the second-init row, finish the good path first. A fresh init result at that point would show a state reset and must stop the release.

The [MCP contract guide](/blog/mcp-server-contract-testing-guide) can hold tests for the tool data once ready. These rows care only if the tool gate opens at the right time.

## What failures expose tools before initialization?

Tools before initialization are exposed when \`tools/list\` or \`tools/call\` receives a normal success result in the connected state. That success is stronger evidence than a vague absence of an error string.

Start a clean child and send \`tools/list\` as frame one. Race it only against a short explicit deadline, then classify a parsed error, connection close, or timeout according to the pinned baseline.

Do not accept a timeout as the preferred pass unless the protocol integration intentionally waits. A silent hang consumes client resources and can hide a server that never processed the illegal request.

Send an early \`notifications/initialized\`, then request tools without initialize. This sequence tests whether a notification alone can move the SDK into a ready state.

Send initialize and tool listing back-to-back without awaiting the response. The ledger must preserve outbound order and show whether the server serializes, rejects, or incorrectly serves the early operation.

The positive harness below makes state transitions explicit. Its helper parses protocol frames and never treats stderr as JSON-RPC input.

\`\`\`typescript
import { expect, it } from 'vitest';

it('reaches tools only after the completed handshake', async () => {
  const peer = await spawnMcpPackage();

  peer.send({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'ordering-contract', version: '1.0.0' },
    },
  });
  const initialized = await peer.responseFor(1);
  expect(initialized.error).toBeUndefined();
  expect(initialized.result.protocolVersion).toBe('2025-11-25');

  peer.send({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  });
  peer.send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

  const listed = await peer.responseFor(2);
  expect(listed.result.tools.map(({ name }) => name).sort()).toEqual([
    'get_leaderboard',
    'get_skill',
    'get_skill_content',
    'install_skill',
    'list_categories',
    'search_skills',
  ]);
  expect(peer.unparsedStdout()).toEqual([]);
});
\`\`\`

Keep the protocol revision in a fixture shared with the version-negotiation suite. When the approved baseline changes, reviewers should see one deliberate fixture update instead of scattered date edits.

For a pre-init \`tools/call\`, choose a read-only tool and controlled arguments. The request must not reach fetch, since lifecycle rejection should occur before application work begins.

Observe child process health after the illegal request. A stable error may leave the connection usable or close it according to the SDK contract, but an unhandled crash should never masquerade as correct rejection.

The [QASkills MCP page](/mcp) confirms that tools are the public operation surface. It does not define when the protocol makes them available, so lifecycle source and runtime evidence remain essential.

## CI coverage for MCP handshake state machine

An MCP handshake state machine suite should test the compiled entry point because transport behavior depends on SDK and bundle integration. Fast unit checks can support it, but they cannot replace actual stdin and stdout frames.

Build the MCP package once, then give every matrix row a fresh process. Reusing one process saves seconds while invalidating isolation and duplicate-initialize assertions.

Disable network access for all ordering cases. Tool listing requires no API call, and any observed fetch indicates the harness accidentally called a tool rather than testing availability.

Use a process supervisor that reads both output streams, tracks outstanding IDs, and enforces per-state deadlines. Always include the last sent and received frame in a timeout error.

Retain JSON Lines artifacts for failed jobs only. Add package version, resolved SDK version, Node version, platform, exit status, stderr, and state transitions around each frame.

Block release on early tool success, bad replies on the good path, wrong IDs, repeat tool names, child crashes, stray stdout, or a skipped state gate. Each blocked run must name its first bad state.

An error-message wording change may be reviewed separately when code, response class, and state remain correct. Pin meaningful terms such as initialization, but avoid snapshots of stack paths.

Run the focused suite after changes to MCP source, package dependencies, lockfile, build output, or server plan acceptance criteria. SDK updates can alter lifecycle behavior with no QASkills source diff.

The repository's [MCP server guide](/blog/qaskills-mcp-server-guide) can host a manual release check, while CI keeps the raw transcript as proof. Both should use the same six expected tool names.

MCP initialization ordering contract tests should finish quickly because no remote services are needed. Slow runs usually indicate unread streams, missing frame delimiters, or cleanup failures.

Split source checks from child checks in CI, but run both in one gate. The fast part finds name drift, and the child part proves the true wire path.

Print each sent and read method on one short line. Keep full safe frames in the failed file, so the main job view stays easy to scan.

Use a firm time cap for the whole child as well as each wait. This stops a bad close step from using all job time after the key check passed.

When a row fails twice, save both logs and check that the first bad edge is the same. A moving edge points to race or shared test state.

The [MCP page](/mcp) gives the six tool names used by the smoke gate. Source still owns the exact list, and CI must flag any gap between them.

## How should protocol lifecycle negative tests be asserted?

Protocol lifecycle negative tests should assert state, response class, application effects, and process condition together. A single error-text check cannot show whether a forbidden tool handler also ran.

For each request with an ID, require exactly one matching response or a documented connection close. Reject duplicate responses, unrelated IDs, and valid results that arrive after an earlier error ended the session.

For each notification, require no direct result frame. Then use the next request to observe whether state changed in the intended way.

Spy on network access in an in-process variant or launch the child with an unreachable controlled API base. Pre-ready tool requests must not cross the application network boundary.

Check immutability of the registered tool set after duplicate notifications or failed requests. The six names and their order-normalized set should match the clean baseline.

This negative example sends a tool request first and demands a contained non-success result. The exact SDK error code can be pinned in \`expectedPreInitializeError\` after a characterization run against the committed dependency.

\`\`\`typescript
it('does not expose tools before initialize', async () => {
  const peer = await spawnMcpPackage({
    env: { QASKILLS_API_URL: 'http://127.0.0.1:1' },
  });

  peer.send({ jsonrpc: '2.0', id: 41, method: 'tools/list' });
  const response = await peer.responseFor(41);

  expect(response.result).toBeUndefined();
  expect(response.error).toEqual(expectedPreInitializeError);
  expect(response.error.message).toMatch(/initializ/i);
  expect(peer.seenRequestIds()).toEqual([41]);
  expect(peer.fetchAttempts()).toEqual([]);
  expect(peer.exitWasFatal()).toBe(false);
});
\`\`\`

Add a companion case for duplicate initialize after the valid sequence. It should not return a second ordinary server-info result or reset the session's visible tools.

Order assertions should use an event ledger with monotonic indexes, not wall-clock timestamps. CI clock precision and process scheduling add noise without proving message order.

Keep full request objects under test control. Random capability payloads or generated client names make a lifecycle failure harder to reproduce and add no useful branch coverage.

MCP initialization ordering contract tests should print the first illegal transition as \`state + event -> observation\`. That compact grammar makes SDK and product ownership easy to discuss.

## Step-by-step test implementation

Implement the suite as a small protocol driver rather than a series of disconnected child writes. A named state model keeps legal and rejected transitions visible to reviewers.

1. Read \`packages/mcp/src/index.ts\` and \`docs/product/MCP-SERVER-PLAN-2026-07.md\`, then record construction, connection, and shipped smoke order.
2. Build the package and create a subprocess peer that buffers stdout frames, captures stderr, tracks IDs, and closes within set deadlines.
3. Drive initialize, its response, initialized notification, and tool listing through the valid sequence with a complete event ledger.
4. Assert the selected revision, server identity, six unique tools, parseable stdout, healthy process, and absence of application network calls.
5. Run fresh-process cases for early tools, pending initialize, early or missing notification, duplicate initialize, repeated notification, and malformed requests.
6. Save failed transcripts in CI, compare the resolved SDK version, and route each mismatch to protocol, package, release, or harness owners.

Write the frame reader before the assertions and test it with split and combined chunks. A flawed reader can fabricate missing responses that the server actually emitted.

Use incrementing IDs unique within one process and never put an ID on initialized notifications. Those harness rules prevent false protocol failures.

Keep shutdown behavior bounded and explicit. Close stdin after observations, wait briefly, and terminate only when the child does not exit through the agreed cleanup path.

Run cwd-independent child commands with absolute built entry paths. This prevents a CI runner's launch directory from changing package resolution.

The [skills directory](/skills) is not needed for ordering fixtures because no tool call should reach catalog data. Use it only after protocol readiness in a separate end-to-end smoke scenario.

MCP initialization ordering contract tests are finished when every legal transition has a matching positive observation and every illegal transition has a stable non-success observation. The ledger should make either outcome reproducible.

Read the saved log from top to foot after the first run. Each line should say who sent what, which ID it used, and which state came next.

If a line needs a wall-clock time to make sense, add a state fact instead. Wire order and IDs are more useful than small time gaps on a busy host.

Keep all test text made by the suite and free from user data. This lets the full bad frame stay in CI with no need for broad redaction.

Run the good path once more after all bad rows. That last pass can catch a leaked cwd, child, env var, or port from the test set.

Use the [blog index](/blog) to link the failed row to a fix note. Keep the raw log with the build job, where the code owner can read it.

## Failure triage and regression ownership

First inspect the harness frame log. If JSON was split or combined incorrectly, repair parsing before attributing missing IDs or timeouts to the server.

If initialize itself fails, compare requested revision, required fields, built package version, and resolved SDK. Protocol or dependency ownership begins before QASkills tool registration matters.

If the valid handshake passes but six tools do not appear, compare registered names in \`packages/mcp/src/index.ts\` with the repository plan. The MCP package owns a missing or extra registration.

If early tools succeed, preserve the minimal transcript and reproduce it against the pinned SDK. The integration owner should then decide whether configuration, SDK behavior, or product acceptance requires change.

If stdout contains plain diagnostics, route the issue to transport discipline in the MCP entry point. Stderr may contain controlled errors, but stdout must remain parseable.

If only the packaged test fails, inspect build output and package metadata rather than loosening source assertions. A stale artifact or altered dependency resolution belongs to release ownership.

If failures happen only under load, check child isolation, shared cwd, ID reuse, and process cleanup. Environment defects should be fixed before interpreting lifecycle state.

Use the [blog index](/blog) to connect adjacent protocol investigations, while keeping the raw transcript on the focused issue. The first invalid state transition should remain visible.

Close a lifecycle regression only after the valid baseline and every negative sequence pass in fresh processes. A repaired happy path does not prove early access stayed blocked.

## Frequently Asked Questions

### Why must initialize be the first MCP request?

Initialization establishes the protocol revision, peer identity, and capability agreement required for later operation. A raw test should send it first, match the response ID, and confirm the process remains healthy, while requests that depend on negotiated state must not receive ordinary success before this exchange completes.

### What is the correct initialized notification order?

The client sends \`notifications/initialized\` only after receiving a successful initialize response. Because it is a JSON-RPC notification, the server does not send a matching response ID. The harness should issue its next operation afterward and use that result to prove the session reached the expected ready state.

### How should tests detect tools before initialization?

Launch a fresh process and send \`tools/list\` or a controlled \`tools/call\` as the first request. Require no normal tool success, no application fetch, and no fatal stdout corruption. Pin the integrated SDK's contained error or connection behavior so a future dependency change produces a precise diff.

### What should an MCP handshake state machine record?

Record current state, outbound frame, inbound frame, matching ID, elapsed deadline, process status, stderr, and application effects. States should include connected, initialize pending, initialize answered, ready, and closed. This ledger explains an illegal transition without relying on wall-clock timing or a large opaque transcript.

### Which protocol lifecycle negative tests block release?

Block on early tool success, failed legal initialization, wrong response IDs, skipped required readiness, duplicate normal initialization, stdout contamination, or an unhandled process crash. Also block when a forbidden request reaches application fetch. Wording-only error changes can receive separate review when state and response class remain correct.

## Conclusion

MCP initialization ordering contract tests turn a hidden transport handshake into an explicit state ledger. They prove initialize leads, completion follows its response, six tools appear only at readiness, and illegal transitions never become ordinary application success.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills in the [skills directory](/skills). Apply this lifecycle matrix before the next release, and use the [MCP inspector tutorial](/blog/mcp-inspector-tutorial-2026) when a failed transcript needs manual replay.`,
};
