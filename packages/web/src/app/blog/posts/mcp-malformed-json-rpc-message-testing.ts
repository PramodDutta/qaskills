import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP malformed JSON-RPC message testing',
  description:
    'MCP malformed JSON-RPC message testing with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP malformed JSON-RPC message testing',
  keywords: [
    'MCP malformed JSON-RPC message testing',
    'MCP parse error test',
    'invalid JSON-RPC version',
    'missing MCP method',
    'malformed tool params',
    'JSON-RPC invalid request code',
  ],
  relatedSlugs: [
    'mcp-server-contract-testing-guide',
    'mcp-official-conformance-suite-server-guide-2026',
    'mcp-inspector-tutorial-2026',
    'qaskills-mcp-server-guide',
  ],
  sources: [
    'https://www.jsonrpc.org/specification',
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/transports',
    'https://modelcontextprotocol.io/specification/2025-11-25/schema',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  content: `MCP malformed JSON-RPC message testing should send invalid wire messages through the real stdio boundary and inspect each response. Success means every parse, request, method, parameter, and id fault returns its defined protocol error before tool code runs. A handler call, unrelated error code, or dead server disproves the contract.

## What must MCP malformed JSON-RPC message testing prove?

MCP malformed JSON-RPC message testing must prove that the transport rejects each bad message at the correct protocol layer. The test needs an exact response oracle, an unchanged tool-side state, and a live process after recoverable input faults.

The core question is not whether bad text causes some error. It is whether bad JSON, wrong versions, absent methods, bad params, and bad ids yield distinct results.

The production entry point in \`packages/mcp/src/index.ts\` creates an \`McpServer\`, registers six tools, connects a \`StdioServerTransport\`, and starts the process. That sequence places JSON-RPC decoding before registered tool callbacks and their Zod argument schemas.

The package identity and SDK dependency live in \`packages/mcp/package.json\`. Tests should build that package revision, launch its emitted binary, and record the package version with every captured transcript.

The [JSON-RPC 2.0 spec](https://www.jsonrpc.org/specification) defines request fields, response fields, id rules, and set error codes. It splits parse error \`-32700\`, bad request \`-32600\`, method not found \`-32601\`, and bad params \`-32602\`.

The [MCP stdio transport rules](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) add the wire boundary. They state that messages use UTF-8, travel through standard input and output, and are separated by newlines.

Those sources set the wire rules, while the repo defines the process under test. Do not guess which SDK call sends a response unless the harness sees it.

Start with one valid setup exchange before a fault is sent. If that check fails, the test data, child launch, or handshake is bad.

Keep the scope below full MCP feature conformance. The [server contract testing guide](/blog/mcp-server-contract-testing-guide) covers broader capability behavior, while this suite owns malformed message classification and process survival.

MCP malformed JSON-RPC message testing passes only when the transcript, exit state, and tool effects agree. A response-shaped line alone is insufficient if the server exits, invokes a tool, or writes unrelated output to standard output.

## Which repository behavior defines the contract?

The repo contract begins when \`main\` builds \`StdioServerTransport\` and calls \`server.connect\` in \`packages/mcp/src/index.ts\`. Each request must cross that SDK layer before a named QASkills tool can run.

Each tool registration declares an \`inputSchema\` built from Zod values. That schema is relevant only after the message is valid JSON-RPC and resolves to a registered tool invocation.

This order gives each fault its own layer. Bad JSON fails at parse time, bad request fields fail next, and bad tool args fail last.

The repo does not export a parser or a wire test hook. A sound black-box test should spawn the built stdio process, not test a made-up decoder.

Standard output is kept for MCP messages under the wire rules. Save standard error on its own because debug text there does not prove a wire fault.

The process-level oracle needs four channels: bytes written to standard input, complete lines read from standard output, standard-error diagnostics, and the child exit event. Add a timeout outcome so silence cannot be recorded as success.

Use a setup helper that ends the MCP handshake before tool calls begin. Then send one full JSON value per line, apart from the planned bad JSON case.

The [MCP schema reference](https://modelcontextprotocol.io/specification/2025-11-25/schema) gives the message shapes used at setup and during tool calls. Pin that dated source by the test data so a later rule change stays clear.

Repo tools can reach the net or disk after dispatch. Choose bad inputs that fail first, and use spies when a valid check must reach a tool.

For example, a missing \`method\` member must not trigger \`search_skills\`, \`get_skill\`, or \`install_skill\`. A malformed \`tools/call\` argument object must not create a skill directory or issue an API request.

The server's top-level catch prints a fatal message and exits with status one only when \`main\` rejects. A recoverable malformed request should instead yield a protocol response while the process remains able to answer a later valid probe.

Record the exact built command, Node version, package version, and fixture bytes. These details separate a transport regression from a stale build or a different SDK resolution.

Readers needing interactive inspection can compare the transcript with the [MCP Inspector tutorial](/blog/mcp-inspector-tutorial-2026). The automated suite should still own byte-level fixtures because graphical clients may normalize invalid input before sending it.

MCP malformed JSON-RPC message testing should never replace the actual transport with a permissive mock. Such a mock can accept structures that the shipped SDK rejects and can hide newline or encoding defects.

## How should QA teams test MCP parse error test?

An MCP parse error test should write one bad JSON line, then wait for one JSON-RPC error response. It should hold code \`-32700\`, a null id, no result, and no sign that a tool ran.

Use a malformed line with an unterminated string rather than an empty write. An empty write may exercise stream timing, while a bad object-shaped line targets JSON decoding directly.

The good check should send a valid but unknown method after setup. This proves the test can frame, write, read, and parse a full response first.

Spawn a fresh child for cases that may harm a stream, but also test repair in one child. Send bad JSON, see the error, then send a sound request with a new id.

The first code example shows a process harness rather than a parser mock. Adapt the binary path to the output produced by the package build in the current revision.

\`\`\`typescript
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { afterEach, expect, it } from 'vitest';

const children = new Set<ReturnType<typeof spawn>>();

function startServer() {
  const child = spawn(process.execPath, ['packages/mcp/dist/index.js'], {
    env: { ...process.env, QASKILLS_API_URL: 'http://127.0.0.1:9' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  children.add(child);
  const lines = createInterface({ input: child.stdout });
  return { child, lines };
}

afterEach(() => {
  for (const child of children) child.kill();
  children.clear();
});

it('returns a parse error and keeps the stdio process alive', async () => {
  const { child, lines } = startServer();
  await initializeMcp(child, lines);

  child.stdin.write('{"jsonrpc":"2.0","method":"tools/list",}\\n');
  const response = JSON.parse(await nextLine(lines));

  expect(response).toMatchObject({
    jsonrpc: '2.0',
    id: null,
    error: { code: -32700 },
  });
  expect(response).not.toHaveProperty('result');
  expect(child.exitCode).toBeNull();

  child.stdin.write('{"jsonrpc":"2.0","id":91,"method":"tools/list"}\\n');
  expect(JSON.parse(await nextLine(lines))).toMatchObject({ id: 91 });
});
\`\`\`

The example checks shape instead of full English error text. Codes and id rules form the stable wire test, while words may change in a sound SDK update.

Add a side-effect sentinel around the isolated API endpoint and temporary working directory. It should remain untouched because parsing fails before any QASkills callback receives arguments.

Keep a raw hexadecimal copy of the sent line when debugging encoding failures. The normal report can show escaped text, but byte evidence reveals hidden carriage returns, byte-order marks, or invalid UTF-8.

MCP malformed JSON-RPC message testing should classify a timeout as its own failure. Do not turn an absent response into a passing test merely because no tool side effect occurred.

## Test matrix for invalid JSON-RPC version

The invalid JSON-RPC version grid should change one field per row and keep a valid live session. This plan finds the failed rule without mixing parse, route, and schema faults.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| MCP parse error test | Unterminated JSON object followed by LF | Error code \`-32700\`, null id, process alive | Tool effect, silence, or process exit | JSON-RPC specification and \`packages/mcp/src/index.ts\` |
| Valid request control | JSON-RPC 2.0 request for a supported protocol method | Matching id and a result | Error response or mismatched id | MCP schema reference |
| invalid JSON-RPC version | Request uses \`"jsonrpc":"1.0"\` | Invalid request response, not tool output | Handler activity or successful result | JSON-RPC specification |
| Missing version | Request omits \`jsonrpc\` | Invalid request response | Request reaches a QASkills callback | JSON-RPC specification |
| missing MCP method | Valid object omits \`method\` | Invalid request response with null id when required | Method callback runs or server exits | JSON-RPC specification |
| Unknown method | Method name is not registered | Error code \`-32601\` with matching id | Invalid params or parse code | JSON-RPC specification |
| malformed tool params | \`tools/call\` carries an invalid arguments shape | Invalid parameter response and no tool effect | API call, file write, or success result | MCP schema and Zod registration |
| Bad identifier type | Identifier is an object | Invalid request response | Object echoed as a response id | JSON-RPC specification |
| Notification control | Valid notification has no id | No response for that notification | Response line tied to the notification | JSON-RPC specification |

Treat the expected invalid-version class as a protocol assertion observed from the pinned SDK revision. If an SDK upgrade changes a classification, review it against the dated specifications before updating the fixture.

Use string, whole number, and null ids where the rules allow them. Add an object and list as bad id types, since they cannot link a request with its response.

A number id with a part after the point is warned against, not banned by JSON-RPC. Keep that case as a note unless MCP sets a stricter rule.

Do not send embedded newlines inside a stdio message and call the result one request. The transport treats each newline as a delimiter, so that fixture represents multiple framed inputs.

Run the same bad line with clear checks on both sides. The server should judge each line on its own and must not leak the last response id.

Compare these rows with the [official conformance suite guide](/blog/mcp-official-conformance-suite-server-guide-2026). A local regression matrix can preserve repository-specific process and side-effect checks beyond a general protocol suite.

## What failures expose missing MCP method?

A missing MCP method fault is clear when a JSON-shaped request lacks \`method\` and the server does not reject it. The best check joins response class, null id rules, child health, and no tool effects.

Distinguish an absent member from an unknown string. Absence makes the object an invalid request, while an unknown method name is a valid request targeting unavailable functionality.

That distinction catches dispatchers that collapse all bad calls into \`-32601\`. It also catches wrappers that route a missing name into a default handler.

Use one fixture with \`method: null\`, another with a numeric method, and one with whitespace as the method string. Each explores a different boundary without corrupting the surrounding JSON.

The negative example captures an API sentinel while sending an unknown method and malformed tool arguments. It checks exact error codes and confirms unrelated QASkills work never begins.

\`\`\`typescript
import { expect, it, vi } from 'vitest';

it('separates method dispatch from tool argument validation', async () => {
  const apiCalls: string[] = [];
  const harness = await startInitializedHarness({
    onApiRequest: (url) => apiCalls.push(url),
  });

  const unknown = await harness.request({
    jsonrpc: '2.0',
    id: 'unknown-1',
    method: 'qaskills/not_registered',
  });
  expect(unknown).toMatchObject({
    id: 'unknown-1',
    error: { code: -32601 },
  });

  const invalidParams = await harness.request({
    jsonrpc: '2.0',
    id: 'params-1',
    method: 'tools/call',
    params: { name: 'get_skill', arguments: { slug: 42 } },
  });
  expect(invalidParams).toMatchObject({
    id: 'params-1',
    error: { code: -32602 },
  });
  expect(apiCalls).toEqual([]);
  expect(harness.child.exitCode).toBeNull();
  vi.restoreAllMocks();
});
\`\`\`

The test should not require \`vi.restoreAllMocks\` to stop the child process; keep process cleanup in a shared hook. Explicit cleanup prevents a hanging child from making the test runner appear successful.

For malformed tool params, validate both protocol output and absence of network access. The Zod schemas in \`packages/mcp/src/index.ts\` should reject wrong argument types before a tool callback calls the QASkills API.

An empty argument object may be valid for tools whose fields are optional or defaulted. Derive every malformed fixture from the registered schema rather than assuming emptiness always fails.

Use \`install_skill\` carefully because a valid call writes to disk. If it serves as a positive control, provide a disposable working directory and a local content endpoint.

MCP malformed JSON-RPC message testing should fail when the child exits after a fault it can bear. Save the exit code, signal, last error lines, and last valid response id.

## CI coverage for malformed tool params

CI coverage for malformed tool params should build \`@qaskills/mcp\` before spawning it and should run without public network access. A local fake API can fail the test if any pre-dispatch case reaches HTTP.

Use a dedicated temporary working directory for each worker. Parallel jobs otherwise share agent folders and can confuse a real file effect with residue from another test.

Set a short per-message timeout and a longer process-suite timeout. The first diagnoses a missing response, while the second catches cleanup failures or child processes that retain open streams.

Retain escaped input, parsed output, raw standard error, exit status, Node version, package version, and SDK lockfile revision. These artifacts make a changed error class reproducible outside CI.

Block release for wrong set codes, mismatched ids, bad output lines, tool side effects, or child death. Changed help text can wait for review when all shape checks still pass.

Run the focused suite after \`pnpm --filter @qaskills/mcp build\`. The build order matters because the harness must exercise the same emitted JavaScript that package consumers launch.

Add one job using the repository's minimum supported Node major from \`packages/mcp/package.json\`. Extra runtime coverage can be useful, but the declared floor must never be skipped.

Never retry a fixed bad input on its own. A retry can hide stream races and turn a real wire bug into a green job.

Publish transcripts only after checking them for environment values. The fixtures should contain synthetic slugs and no credentials, yet standard error may include unexpected runtime context.

Link this suite from the [MCP integration page](/mcp) so release owners can find its scope. Keep general setup guidance on [getting started](/getting-started) rather than repeating installation instructions here.

## How should JSON-RPC invalid request code be asserted?

JSON-RPC invalid request code should be a whole number at \`error.code\`, with \`error\` set and \`result\` absent. If the request id cannot be read, require a null response id.

Assert the entire stable envelope, not only \`toBeTruthy\` on \`error\`. Weak checks allow a parse error, method error, internal error, or application error to satisfy the same test.

For valid ids on route or param faults, require an exact match with the sent id. Use two requests with unlike ids to catch response reuse.

Do not freeze extra error data unless QASkills needs it. The JSON-RPC spec lets servers add detail, so strict shots can reject safe debug text.

Validate that \`jsonrpc\` equals \`2.0\` as a string. A numeric value, missing field, or inherited fixture property should not pass.

Check standard output line by line and reject non-JSON text. Transport logs belong on standard error, and stray output can break every MCP client even when the error object itself is correct.

For notifications, the key assertion is absence of a response within a controlled observation window. Follow it with a request that must receive an answer, proving the reader remains active.

Do not use one broad time cap for all no-response checks. Give each note a set wait, then name the next request id in any failure.

MCP malformed JSON-RPC message testing should preserve original fixture text in the report. A parsed fixture cannot represent invalid JSON, and reserialization would erase the defect under test.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) explains the server's intended client role. This article narrows that role to malformed request handling at the shipped stdio process.

## Step-by-step test implementation

Implement MCP malformed JSON-RPC message testing in six controlled steps. Each step should leave an artifact that explains later assertions and identifies the owning layer.

1. Read \`packages/mcp/src/index.ts\` and record the stdio connection, registered methods, Zod schemas, side effects, and fatal exit path.
2. Build the MCP package, launch its emitted binary in a temporary directory, and complete one valid setup exchange.
3. Send newline-delimited fixtures for malformed JSON, wrong versions, missing methods, unknown methods, bad parameters, and malformed ids.
4. Assert exact JSON-RPC envelopes, id behavior, forbidden side effects, standard-output purity, and process survival after each recoverable case.
5. Follow destructive or stream-level cases with valid probes, then terminate the child and capture exit, stderr, request, and response evidence.
6. Run the focused suite in CI without public network access, retain failed transcripts, and assign each defect to transport, SDK, tool schema, or harness ownership.

Keep fixture creation separate from execution. A small data object can name the raw line, expected code, expected id, response expectation, and side-effect policy.

Do not parse fixture text before writing it. The malformed JSON rows must remain raw strings, while valid request rows can use a serializer to avoid accidental syntax errors.

Make the line reader queue responses and reject invalid standard-output lines immediately. A simple one-shot listener can miss responses that arrive between setup operations.

Close standard input only when testing end-of-stream behavior. Routine malformed cases should leave it open so the server can prove recovery with a later valid message.

For a release regression, first rerun one fixture against the prior package artifact. That comparison separates a repository change from a CI host or runtime change.

Browse [verified QA agent skills](/skills) only after the protocol harness is stable. Installing extra skills is unrelated to this malformed-message boundary and should not enter these fixtures.

## Failure triage and regression ownership

Start triage with the raw input and first unexpected observation. If standard output is not valid JSON, the transport or process logging path owns the first investigation.

If the response is valid JSON-RPC but carries the wrong reserved code, compare the fixture with the JSON-RPC and MCP schemas. The SDK integration owner should review any changed classification.

If a QASkills API call or disk write occurs, the request passed a wire or schema check by mistake. The MCP package owner should inspect tool setup and arg rules.

A clear run log starts with the raw line, a short case name, and the id that the test sent. It then shows the first line read from the child and the time spent in the wait.

Keep the good probe next to the bad case in that log, since both lines show whether the child stayed fit. This paired view helps the team tell a wire fault from a dead read loop.

When the code is wrong, the first bad field should stand out without a full stack trace. Print the sent value, the seen value, and the rule that links them.

When the child dies, show its last clean response before the exit event. That one fact can show whether the crash came at start, parse time, or tool dispatch.

A local run should use the same raw case text as CI, not a fresh string typed by hand. Save the case in source and print a short hash when it runs.

The [MCP integration page](/mcp) gives the team a shared view of the live feature, while this log stays tied to one test. The two views serve different needs and should not share live state.

The [MCP Inspector guide](/blog/mcp-inspector-tutorial-2026) can help replay a sound call after the suite fails. Keep bad wire text in the process test because a UI may clean it before send.

For each code, write one plain pass rule that a new team member can read fast. For example, code \`-32601\` means the JSON was sound but the named method was not found.

Also write one plain fail rule for that case, such as any API call or disk write. This gives the test two sides and stops a weak check from passing.

If two cases fail at once, run the first bad line on its own with the same setup. Then add the next line and watch for state that leaks from the first response.

Do not hide a slow read by raising all time caps across the suite. First check child health, line ends, open streams, and the id of the last sound response.

At review time, ask whether the new test can fail for the bug it names. A case that only proves some error took place does not guard the right wire rule.

The final report should name one owner and one next step for each row. This keeps a small SDK drift from becoming a broad and vague MCP task.

If the process exits, inspect the exit event and fatal standard-error line. Determine whether \`server.connect\` failed, an unhandled callback escaped, or the harness closed a required stream.

If only CI fails, compare Node versions, built artifact hashes, working directories, and lockfile resolutions. Do not weaken the oracle until the same bytes have been reproduced locally.

If a notification appears unanswered as expected but the next request also stalls, classify the result as reader failure. Absence is valid only when a subsequent probe proves the process remains responsive.

Keep protocol and application errors separate in reports. A valid tool call can return an MCP tool result marked as an error, while malformed JSON-RPC should fail before application handling.

Use a compact decision path: validate framing, validate the response envelope, validate the code and id, inspect side effects, then inspect process health. The first failed stage usually identifies ownership.

Attach one minimal fixture to each defect rather than the entire matrix. Minimal evidence speeds SDK comparison and prevents unrelated output from masking the root cause.

Review related patterns on the [QASkills blog](/blog), but link the regression to this suite's exact case name. Broad labels such as "MCP failed" do not identify a protocol boundary.

## Frequently Asked Questions

### How can a harness test invalid JSON, versions, methods, params, and identifiers?

Spawn the built stdio server, set it up, and write one controlled line for each invalid class. Assert the exact response code, id, missing result, absent tool effects, and live process. Follow each recoverable fault with a valid probe so silence or process death cannot look successful.

### What should an MCP parse error test assert?

Send syntactically invalid JSON followed by one newline and require error code \`-32700\` with a null id. The response must omit \`result\`, standard output must contain only protocol JSON, no tool callback may run, and the same child process must answer a later valid request.

### How is an invalid JSON-RPC version different from bad JSON?

Bad JSON cannot be parsed and belongs to code \`-32700\`. A request containing valid JSON but an unacceptable \`jsonrpc\` member is an invalid request, normally code \`-32600\`. Testing both prevents a server from collapsing syntax and request-shape failures into one misleading response.

### What response should a missing MCP method produce?

An absent or non-string \`method\` makes the request object invalid, while an unknown method string should produce method-not-found code \`-32601\`. Tests should preserve that distinction, assert id handling, and prove no registered QASkills callback, API request, or disk write occurred.

### Why test malformed tool params after transport errors?

Malformed tool params reach a later validation layer than broken JSON or an unknown method. The test should expect invalid-params code \`-32602\`, preserve the request id, and observe no tool side effect. Together, these checks prove parsing, dispatch, and Zod argument validation remain separate.

## Conclusion

MCP malformed JSON-RPC message testing is complete when exact protocol responses, clean side effects, and process recovery agree for every malformed class. Keep raw fixtures and transcripts with each release so SDK or runtime changes remain reviewable.

Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this test matrix before the next MCP release. Keep the [MCP test guide](/blog/mcp-server-contract-testing-guide) close when a wire fault crosses into tool code.`,
};
