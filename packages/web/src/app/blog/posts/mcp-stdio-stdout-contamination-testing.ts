import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP stdio stdout contamination testing',
  description:
    'MCP stdio stdout contamination testing with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP stdio stdout contamination testing',
  keywords: [
    'MCP stdio stdout contamination testing',
    'MCP stdout protocol corruption',
    'stdio server console log test',
    'MCP stderr diagnostics',
    'JSON-RPC stdout validation',
    'MCP process output capture',
  ],
  relatedSlugs: [
    'mcp-server-testing-guide-2026',
    'mcp-inspector-tutorial-2026',
    'mcp-official-conformance-suite-server-guide-2026',
    'qaskills-mcp-server-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
    'https://www.jsonrpc.org/specification',
    'https://ts.sdk.modelcontextprotocol.io/',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'docs/product/MCP-SERVER-PLAN-2026-07.md',
    'packages/mcp/package.json',
  ],
  content: `MCP stdio stdout contamination testing must prove every stdout message is valid wire data while all startup and fatal diagnostics stay on stderr. Success is a clean initialize and tools/list transcript with an empty nonprotocol byte set. Any banner, debug line, warning, stack trace, or malformed frame on stdout disproves the contract.

## What must MCP stdio stdout contamination testing prove?

MCP stdio stdout contamination testing must treat stdout as a machine-readable wire channel from process start until exit. The harness rejects every byte that cannot be assigned to a valid JSON-RPC message in the expected MCP exchange.

That rule is stricter than checking whether the child eventually returns one useful response. A client parser can fail on an earlier banner even when later lines contain correct initialize and tools/list results.

Capture stdout and stderr through different pipes, preserving raw bytes and decoded messages. Never concatenate them before validation because that destroys the evidence needed to identify the writer and channel.

For the positive case, initialize the built server and request tools/list. Every completed stdout line must parse as one JSON object with the expected wire version and a known response or notification role.

The same run should produce no stderr output under controlled healthy inputs. A future documented warning can receive a narrow allowlist, but broad stderr tolerance would hide unexpected startup behavior.

For the negative case, launch a fixture that prints one plain banner before a valid response. The parser must fail at that first line rather than skip it and report a successful wire exchange.

MCP stdio stdout contamination testing also needs bounded partial-buffer handling. A valid message split across chunks should pass, while leftover non-whitespace bytes at process exit should fail as an incomplete frame.

The [QASkills MCP page](/mcp) shows why this boundary matters to real hosts. They launch a command and expect stdout to remain usable without human filtering or terminal heuristics.

The contract does not prohibit diagnostics. It requires them on stderr, where the harness can retain them without feeding those bytes to the wire parser.

## Which repository behavior defines the contract?

The executable path in \`packages/mcp/src/index.ts\` constructs \`StdioServerTransport\` and connects the registered server. That transport owns stdin and stdout for MCP messages.

The top-level failure handler in the same file uses \`console.error\` with the prefix \`Fatal MCP server error:\`. In Node, that call targets stderr, giving tests a precise fatal-channel expectation.

No production \`console.log\` call appears in the entry source. The absence matters because a harmless-looking startup sentence would occupy the same stream as wire replies.

The acceptance bar in \`docs/product/MCP-SERVER-PLAN-2026-07.md\` explicitly requires zero \`console.log\` output on the stdout path. It also requires a live initialize and tools/list smoke exchange.

Package metadata in \`packages/mcp/package.json\` maps the command to \`./dist/index.js\`. Test the built target because bundled dependencies or generated banners can write output even when the TypeScript source looks clean.

The [MCP stdio transport specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) reserves stdout for valid wire messages and permits stderr logging. It also requires newline-delimited messages without embedded newlines.

The [JSON-RPC specification](https://www.jsonrpc.org/specification) supplies the base object rules: version \`2.0\`, request identifiers, results, and errors. MCP adds lifecycle and method meaning on top of that format.

The [TypeScript SDK documentation](https://ts.sdk.modelcontextprotocol.io/) identifies the SDK transport used by the package. However, QASkills remains responsible for preventing its own code and package startup from polluting the transport.

Use the [MCP server testing guide](/blog/mcp-server-testing-guide-2026) for the broader test stack. This article narrows the oracle to channel content and does not absorb tool semantics, remote API correctness, or installation behavior.

MCP stdio stdout contamination testing should cite the package version in each transcript. A clean source with a dirty old dist file is still a release failure, and version evidence exposes that mismatch quickly.

## How should QA teams test MCP stdout protocol corruption?

An MCP stdout wire corruption harness should begin in raw byte mode. Decode complete UTF-8 lines only after buffering chunk boundaries, and retain the original bytes for any line that fails.

Do not use a readline helper that silently discards unusual terminators or replaces malformed input. The production client receives bytes, so the test should surface invalid encoding and incomplete frames directly.

Start the packaged child with stdin, stdout, and stderr piped. Register output listeners before sending initialize so no eager startup text escapes capture.

Write a compact initialize request terminated by one newline. When its result arrives, send the initialized notification and tools/list request, then validate every observed wire object.

Classify parsed messages by whether they contain an id, method, result, or error. Reject an object that parses as JSON but does not match a permitted JSON-RPC shape.

MCP stdout wire corruption includes valid JSON of the wrong kind. A package that writes \`{"status":"ready"}\` to stdout has still violated the channel even though \`JSON.parse\` succeeds.

Keep an ordered stdout record containing byte offsets, complete lines, parse outcomes, and matched request ids. Add stderr entries to a separate record with timestamps for later correlation.

Close stdin after the expected result and require no unconsumed stdout bytes at close. A truncated final object can otherwise evade line-based checks because no newline triggers parsing.

The [MCP Inspector tutorial](/blog/mcp-inspector-tutorial-2026) helps humans reproduce framing failures. Automated CI should report the escaped invalid prefix so control characters remain visible in plain logs.

MCP stdio stdout contamination testing should execute one deliberately contaminated fixture alongside the real binary. That control proves the parser rejects damage instead of quietly selecting only favorable lines.

## Test matrix for stdio server console log test

A stdio server console log test needs channel, timing, encoding, and lifecycle variations. The expected result should identify the first invalid byte rather than waiting for a later missing response.

Use compact fixtures that write known bytes before, between, and after valid messages. Each row then proves a distinct parser boundary without depending on application network behavior.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Healthy startup | Real built server and valid handshake | Every stdout line is valid JSON-RPC; stderr is empty | Any unmatched byte or diagnostic | \`packages/mcp/src/index.ts\` |
| Startup banner | Plain text before initialize response | Immediate contamination failure at byte zero | Parser skips banner and passes | MCP stdio transport |
| Midstream debug line | Text between two valid responses | Failure names line and neighboring ids | Later response hides debug output | MCP stdio transport |
| JSON-shaped log | \`{"status":"ready"}\` on stdout | Object fails JSON-RPC shape validation | JSON parsing alone accepts it | JSON-RPC specification |
| Fatal startup | Forced connect rejection | Fatal prefix appears on stderr with nonzero exit | Stack or message reaches stdout | \`packages/mcp/src/index.ts\` |
| Split UTF-8 and chunks | Valid message divided across byte chunks | One reconstructed protocol object | Chunk boundary creates false corruption | MCP stdio transport |
| Truncated final frame | Partial JSON followed by exit | Leftover buffer causes explicit failure | No newline hides bad output | JSON-RPC specification |
| Dependency warning | Warning emitted during module load | Warning is rejected on stdout | Source-only scan misses bundle output | \`packages/mcp/package.json\` |

The JSON-shaped row prevents a weak parser from equating valid JSON with valid wire traffic. Shape validation must run before response correlation or tool assertions.

The fatal row expects stderr content, while the healthy row expects none. These paired cases prove the harness can observe diagnostics without confusing them with successful stdout.

For split UTF-8 input, divide a multibyte sequence inside a controlled fixture message. The decoder should preserve streaming state instead of producing replacement characters that alter wire text.

The [official conformance suite guide](/blog/mcp-official-conformance-suite-server-guide-2026) can add broader standards coverage. Keep this matrix as a fast release guard around the exact distributed command and its channels.

MCP stdio stdout contamination testing passes the table only if the negative controls fail for the intended reason. A fixture timeout does not prove detection of the injected banner or malformed object.

## What failures expose MCP stderr diagnostics?

MCP stderr diagnostics are correct when they remain visible to operators without entering stdout. Force the entry's catch path and require the fatal prefix, nonzero exit, and zero stdout wire impostors.

Mocking \`console.error\` in a direct import can verify one call, but it cannot prove operating-system stream routing after bundling. Use that unit case only as a supplement to subprocess capture.

For the built test, induce a deterministic startup failure through a controlled fixture or executable wrapper. Avoid file permission tricks whose errors differ across operating systems and runners.

Bound stderr storage and preserve its final segment. A dependency that loops on warnings should fail quickly without filling memory or CI artifact quotas.

The positive code example below validates every complete line from the real child. It rejects non-JSON output and JSON values that do not carry the JSON-RPC marker.

\`\`\`typescript
import { StringDecoder } from 'node:string_decoder';
import { expect } from 'vitest';

function strictProtocolCollector(stream: NodeJS.ReadableStream) {
  const decoder = new StringDecoder('utf8');
  const messages: unknown[] = [];
  let pending = '';

  stream.on('data', (chunk: Buffer) => {
    pending += decoder.write(chunk);
    const lines = pending.split('\\n');
    pending = lines.pop() ?? '';

    for (const line of lines) {
      const value = JSON.parse(line);
      expect(value).toMatchObject({ jsonrpc: '2.0' });
      expect(typeof value).toBe('object');
      messages.push(value);
    }
  });

  return {
    messages,
    finish() {
      pending += decoder.end();
      expect(pending.trim()).toBe('');
    },
  };
}
\`\`\`

Wrap \`JSON.parse\` so failures include byte offset, escaped line prefix, process version, and current wire phase. Never print an unlimited raw stream into the test error.

The negative example launches a tiny fixture that emits a banner before a valid response. The assertion requires a contamination error rather than a generic missing-id timeout.

\`\`\`typescript
test('rejects a banner before a valid JSON-RPC response', async () => {
  const child = spawn(process.execPath, [
    '-e',
    [
      "process.stdout.write('QASkills MCP ready\\\\n');",
      "process.stdout.write('{\"jsonrpc\":\"2.0\",\"id\":1,\"result\":{}}\\\\n');",
    ].join(''),
  ]);

  await expect(readStrictProtocol(child.stdout)).rejects.toThrow(
    /non-protocol stdout.*QASkills MCP ready/,
  );
  expect(await collectStderr(child.stderr)).toBe('');
  await stopChild(child);
});
\`\`\`

Add equivalent fixtures for JSON-shaped logs and truncated objects. They test separate validator layers and should return different failure labels.

MCP stdio stdout contamination testing should not fail merely because stderr contains a deliberate fatal diagnostic in the negative case. Channel policy depends on scenario, so assertions need named expectations rather than one global empty-stream rule.

## CI coverage for JSON-RPC stdout validation

JSON-RPC stdout validation belongs after package build and before publication. Running it against source omits bundle wrappers, package file layout, executable resolution, and dependency startup code.

Execute the real handshake on every MCP source, dependency, package metadata, or build configuration change. Those inputs can all alter bytes written before application handlers begin.

Run parser mutation controls in the same test suite but not necessarily every release job. They should still execute often enough to prevent a helper refactor from becoming permissive.

Keep process output capture under a small byte ceiling. If either channel exceeds it, terminate the child and report an output-flood failure with the retained head and tail.

Set a reply deadline and a separate shutdown deadline. Contamination should normally fail before either, while a missing response needs the current phase and buffered stream state.

Test Linux as the release platform and at least one developer platform when practical. Newline translation and shell wrappers can expose channel behavior that a direct Linux spawn does not show.

Do not launch through a shell unless the published command requires one. Shell startup files, aliases, and wrapper messages are external noise that obscure the package's own contract.

The [getting started guide](/getting-started) offers a local command path, while CI should resolve \`packages/mcp/package.json\` directly. Print the resolved bin and checksum so failures identify the actual artifact.

Retain a structured transcript with stdout message summaries and a separate stderr tail. Avoid retaining request payloads from unrelated tool tests because this handshake uses no private user content.

MCP stdio stdout contamination testing must block a release on one invalid stdout byte. Retrying can collect evidence, but a later clean run does not make a nondeterministic wire channel safe.

## How should MCP process output capture be asserted?

MCP process output capture should preserve both raw and semantic views. Raw bytes prove what the child wrote, while parsed records explain which wire phase those bytes affected.

Store stdout byte offsets and line boundaries before normalization. A visible string alone can hide carriage returns, byte-order marks, nulls, or malformed UTF-8 that break a strict client.

Use a streaming decoder and call its final method when stdout closes. This catches incomplete multibyte input and flushes any final valid characters into the leftover-frame check.

For each wire object, record its id, method, result or error role, and byte range. Full values may be attached on failure, but summary records make ordinary diagnostics concise.

Capture stderr concurrently with timestamps and a byte ceiling. Do not infer exact inter-stream ordering from callback order because operating-system pipes are scheduled independently.

Instead, make channel-local assertions exact. Stdout must contain only accepted wire frames, while stderr must match the scenario's empty or fatal-diagnostic policy.

Check process exit and stream close separately. The exit event can arrive before all output has been drained, so validation should finish only after both pipes close and decoders flush.

MCP stdio stdout contamination testing must include process arguments, cwd, Node version, package version, and environment keys that affect launch. Redact values that may contain credentials.

Use the [QASkills blog index](/blog) for adjacent process and wire checks. Do not overload this output record with HTTP traces or installed files unless they caused the channel event.

A good failure reads like this: invalid stdout at byte 0 during startup, plain-text prefix detected, stderr empty, child exit zero. That sentence identifies the violation without asking a maintainer to reconstruct the stream.

## Step-by-step test implementation

Build output validation from raw capture toward wire meaning. The order ensures no decoder or matcher can silently discard the evidence under test.

1. Build the MCP package, resolve \`./dist/index.js\` from \`packages/mcp/package.json\`, and record its checksum and package version.
2. Spawn the bin directly with three pipes, then attach bounded raw stdout, strict streaming decode, separate stderr capture, exit tracking, and emergency cleanup.
3. Send initialize, the initialized notification, and tools/list while correlating responses by id and rejecting any object without valid JSON-RPC structure.
4. Close stdin, flush both stream decoders, require no trailing stdout bytes, and verify a clean healthy exit with no unexpected stderr.
5. Run banner, JSON-shaped log, split-chunk, truncated-frame, and fatal-startup fixtures, requiring each injected defect to produce its named oracle.
6. Gate the release job on the real binary case, retain bounded channel records for failures, and remove children, pipes, timers, and temporary state.

### A byte check that stays clear

Start the log with the child id and a zero byte count. Add to that count as each stdout chunk comes in, and keep the sum in base ten for quick checks in each full test run from start to close. This gives each bad byte a fixed place that does not depend on screen text.

Hold the last part of a line until a newline is seen. Do not parse it yet and do not call it bad, while the log states how many bytes still wait there. A later chunk may bring the rest of one sound MCP line.

For each full line, save its start and end byte marks. Parse the line once, then check the wire shape once with the same rule for good and bad runs. A single path keeps test rules from changing based on which reply was due.

If parse fails, show the first short span with slash escapes. Keep the raw bytes in a small test file as well, so a peer can replay that span with one small tool. This helps when a blank, null, or odd byte has no clear screen form.

If parse works but the shape is wrong, name the fields that were found. A JSON log may look neat while it still breaks the host. The report should call that a wrong wire shape, not bad JSON.

Give stderr its own byte count and its own small cap. Do not add its text to the stdout count. The two streams can share a time tag while they keep their own facts.

Run a good child and check that no spare stdout bytes remain at close. Then run a child with one plain word at byte zero. The second run must fail before it waits for the first reply.

Run one more child that writes half a JSON line and then stops. The flush step must point to bytes left at close. This proves a missing newline cannot hide a bad last frame.

Break a sound line into many small chunks, even one byte at a time. The test must still make one parsed line. This check guards the read loop without any change to the app.

Do not write the test rig's own notes to the child pipes. Put those notes in the parent test log instead. A clean split makes it plain which code wrote each byte.

The [MCP page](/mcp) shows the command that a host runs. Use that same built file for the good case. Keep fake child scripts for the bad cases, where each script writes one known fault.

End the report with the first bad byte, the wire phase, and the child end state. Those three facts make a short and useful bug title. They also keep a parse fault from being filed as a web fault.

Keep test helper output off stdout when the harness itself runs as a subprocess. Diagnostic helpers should use the parent test runner or stderr so they cannot pollute the child record.

Validate fixture bytes directly before launch. A typo that writes escaped backslash characters instead of a newline could make the negative control fail for the wrong reason.

When updating the SDK, run this focused suite before changing snapshots or tool expectations. Transport framing changes deserve deliberate review rather than automatic acceptance.

The [skills directory](/skills) is useful for later tool invocation tests, but no catalog data is needed to prove stdout discipline. Removing that dependency keeps the signal tied to process output.

MCP stdio stdout contamination testing is effective when every intentional contaminant is caught at its first byte and the real binary remains fully parseable. This gives release owners evidence about both sensitivity and current behavior.

## Failure triage and regression ownership

Locate the first invalid stdout range before studying downstream timeouts. Later missing replies are usually consequences of the parser losing synchronization after contamination.

If the prefix names QASkills application code, inspect recent logging changes in \`packages/mcp/src/index.ts\`. If it names a dependency or runtime warning, inspect bundle loading and package versions.

Valid JSON without JSON-RPC shape points to structured application logging on the wrong channel. Assign it to the writer even though JSON parsing itself succeeded.

A byte-order mark at offset zero may come from generated files or wrappers. A midstream carriage return may come from platform-specific output handling, so preserve escaped bytes in both cases.

When only stderr changes and stdout stays valid, compare the scenario policy. Unexpected healthy warnings still deserve ownership, but they are not stdout wire corruption.

If source scans are clean while dist fails, inspect generated banners, bundled modules, and stale build artifacts. The package checksum and source commit should accompany the report.

If a fixture fails to detect its own banner, assign the defect to the collector before trusting any real-binary pass. Negative controls are the proof that the gate can see channel damage.

The [QASkills MCP guide](/blog/qaskills-mcp-server-guide) helps reproduce the command, and the [MCP Inspector article](/blog/mcp-inspector-tutorial-2026) helps observe client symptoms. Raw captured bytes remain the decisive ownership evidence.

MCP stdio stdout contamination testing should finish triage with the writer, first byte offset, current phase, and process outcome. That compact record prevents a wire symptom from being misfiled as a remote API failure.

## Frequently Asked Questions

### What counts as MCP stdout protocol corruption?

Any stdout content outside accepted MCP JSON-RPC messages counts as corruption, including banners, logs, warnings, stack traces, byte-order marks, incomplete objects, and JSON-shaped status messages. A later valid reply does not repair earlier bytes because a strict host may already have rejected or desynchronized the stream.

### Can a stdio server console log test scan source only?

No. A source scan can catch direct \`console.log\` calls, but it misses bundled wrappers, dependencies, stale output, and conditional startup paths. Pair static checks with a subprocess handshake against the built bin, then validate every stdout byte from launch through stream close.

### Where should MCP stderr diagnostics be tested?

Test diagnostics through a separate child stderr pipe during healthy and forced-failure scenarios. Expect an empty stream for the controlled healthy exchange and the repository's fatal prefix for startup failure. Keep the buffer bounded, preserve raw text, and never merge it into stdout before classification.

### Is JSON parsing enough for JSON-RPC stdout validation?

No. Plain JSON can still be an invalid wire message. Require the JSON-RPC version and an allowed request, notification, result, or error shape, then correlate identifiers with sent requests. Also fail on trailing bytes and invalid encoding that never reach the JSON parser.

### When should MCP process output capture finish?

Finish only after the process outcome is known, stdout and stderr have closed, streaming decoders have flushed, and leftover buffers are empty or reported. The exit event alone can occur before pipe data drains. Cleanup should also confirm no child, open pipe, or timer remains.

## Conclusion

MCP stdio stdout contamination testing protects the exact byte channel used by every stdio client. A credible gate launches the built package, parses all stdout as wire, checks scenario-specific stderr, flushes trailing data, and proves deliberate banners, logs, and malformed frames cannot pass.
Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this output-channel matrix before the next MCP release.`,
};
