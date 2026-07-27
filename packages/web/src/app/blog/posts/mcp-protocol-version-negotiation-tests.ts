import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP protocol version negotiation tests',
  description:
    'MCP protocol version negotiation tests with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP protocol version negotiation tests',
  keywords: [
    'MCP protocol version negotiation tests',
    'unsupported MCP protocol version',
    'MCP initialize version mismatch',
    'client server version compatibility',
    'protocol downgrade test',
    'MCP version fallback behavior',
  ],
  relatedSlugs: [
    'mcp-server-testing-guide-2026',
    'mcp-official-conformance-suite-server-guide-2026',
    'mcp-package-registry-version-drift-tests',
    'qaskills-mcp-server-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle',
    'https://modelcontextprotocol.io/specification/2025-11-25/schema',
    'https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  content: `MCP protocol version negotiation tests should initialize fresh client-server pairs with every SDK-supported revision plus older, newer, malformed, and unknown values. A pass preserves supported requests or returns a supported alternative the client accepts, while silent continuation with an incompatible response, an undocumented fallback, unstable errors, or tool access before agreement proves failure.

## What must MCP protocol version negotiation tests prove?

MCP protocol version negotiation tests must show that init ends with one date both peers know. A known client date should get a clear reply, while a pair with no shared date must stop before the done note or tools and the date in the reply remains the main server fact. The client choice, clean close, live child, and lack of tool calls finish the proof.

An unknown date need not make the server send a wire fault. MCP lets it name one date it knows, then the client checks whether it knows that date too and this rule avoids a false fail. The server may make a sound pick, yet the client must not go on when that pick is outside its set.

Read known dates from the installed SDK instead of copying a list into test code. Add fixed old, new, bad, and missing values that fall outside that list.

The official [MCP lifecycle specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle) sets this choice during init. It tells the client to close when the server picks a date outside the client set.

MCP protocol version negotiation tests should never infer a match from a child that starts well. The child can stay live while the two peers do not share the same wire rules.

Keep all feature data the same across this matrix, so only the date can change. A separate suite can test feature claims without clouding a date fault.

The report should show the asked date, both known sets, the picked date, the client choice, and the next send. Those facts make a bad pick or bad test clear.

The scope leaves out npm release numbers, which the [registry drift article](/blog/mcp-package-registry-version-drift-tests) covers. This suite checks the MCP date sent and picked at init.

Write the two known sets at the top of each case. A reader can then see at once if the picked date lies in both sets.

Give each made-up date a name such as old, new, bad, or blank. The name should stay the same in the case, log, and failed row.

Run one known date before each group of bad dates. That good row proves the peer and child still speak, so a later stop has real meaning.

Keep the client choice in one small pure function. Feed it a picked date and a known set, then let it return go or stop.

The [MCP test guide](/blog/mcp-server-testing-guide-2026) can show how this check fits a full run. This page still owns the date set and client choice.

## Which repository behavior defines the contract?

The QASkills entry point in \`packages/mcp/src/index.ts\` makes \`McpServer\` and links it to stdio. It holds no date list and has no branch for \`protocolVersion\`.

The version check runs inside \`@modelcontextprotocol/sdk\`. QASkills owns the linked result because a new SDK can change the known set or its fallback pick.

The manifest \`packages/mcp/package.json\` constrains that dependency with \`^1.29.0\` and requires Node 20 or newer. A package-manager lock resolves a concrete build, so CI diagnostics should record that resolved version as well.

The [TypeScript SDK v1.x repository](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x) is the approved code source for its latest and known dates. Tests can import those public values instead of typing them twice.

At init, the server gets the client name, feature data, and asked MCP date. The linked SDK sends back the server name, feature data, and picked date.

When the asked date is in the SDK set, the SDK should echo it. For an unknown date, it should pick its known latest date and not echo bad input.

Treat these facts as SDK behavior, not hand-made QASkills rules. A new SDK may add or drop dates, so any set change needs a clear review.

The [MCP specification reference](https://modelcontextprotocol.io/specification/2025-11-25/schema) puts \`protocolVersion\` in the init call and reply. Bad-shape cases should use the real wire parser, not just TypeScript types.

No web call is needed for this date check. If a case reaches QASkills data, the peer sent tools too soon or failed to stop on a bad fit.

The server and six tools exist before the pipe link starts. Those facts do not grant tool use until both peers agree on a known date.

MCP protocol version negotiation tests should cover source and built package execution. In-process SDK checks explain selection, while a raw stdio run proves the distributed artifact exchanges the same value.

The [MCP server testing guide](/blog/mcp-server-testing-guide-2026) covers more wire rules. Here, each check should say which date was asked, picked, used, or refused.

## How should QA teams test unsupported MCP protocol version?

An unsupported MCP protocol version case begins with two declared sets: revisions the client can process and revisions exported by the server SDK. The requested value should be the client's preferred value for that case.

Spawn a clean package process and send only initialize. Capture the matching result before deciding whether to send \`notifications/initialized\`.

If the server picks a date in the client set, the test may send the done note and list tools. This proves the shared date reaches normal use.

If the picked date is outside the client set, the peer must hold back the done note, close, and record no fit. Sending tools would make the test client wrong.

For a made-up new date, do not use text order to judge a fit. A date must be in both known sets for the peers to go on.

For a made-up old date, use a sound date shape that is not in the SDK set. Read the fallback from the SDK latest value.

Add a malformed string and a missing field as schema boundaries. A missing required field should produce a contained request failure rather than ordinary initialization data.

Do not call each changed reply a downgrade. The picked date may be old or new, while set overlap alone tells whether both peers can go on.

Set a short response deadline and collect stderr concurrently. A timeout, parse failure, or process crash is not a legitimate incompatibility result unless the integration explicitly defines it that way.

MCP protocol version negotiation tests should run an exact supported revision first. That control proves the subprocess, framing, and initialize payload work before unsupported behavior is judged.

Use the [official conformance suite guide](/blog/mcp-official-conformance-suite-server-guide-2026) as a complementary release layer. Keep this repository matrix focused on the SDK version actually shipped by QASkills.

Make the child send log a list of method names and IDs. A bad-fit row should end at init, with no done note and no tool method below it.

Save the picked date before the client choice runs. If the choice is wrong, the log must still show the sound server fact that led to it.

Test the go path and stop path with the same server pick. Change only the client set, which proves the client set drives the last choice.

Use one blank-field row and one bad-text row. These check wire shape apart from old or new dates that still look like real MCP dates.

Close each child from a \`finally\` block and wait for its end. A bad date must not leave a live child that slows the rest of CI.

## Test matrix for MCP initialize version mismatch

An MCP initialize version mismatch needs separate server-selection and client-decision columns, even when the compact article table combines them in one observation. Otherwise, a valid fallback can be confused with unsafe continuation.

Build supported rows dynamically and keep synthetic values constant. Save the exported revision list in failed CI output so reviewers know which dependency behavior produced the result.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Latest supported request | Client requests SDK latest and supports it | Server echoes revision and tools become available | Different revision or failed normal operation | MCP lifecycle specification |
| Older supported request | Client requests each older exported revision | Server selects the requested supported value | Undocumented replacement or rejection | TypeScript SDK v1.x |
| Unsupported MCP protocol version | Client requests a well-formed unknown old value | Server returns its defined supported alternative | Unknown input is echoed as supported | TypeScript SDK v1.x |
| Synthetic future revision | Client requests unknown future value | Server selects a known supported revision | Future value is accepted without support | MCP lifecycle specification |
| MCP initialize version mismatch | Server choice is absent from client set | Client stops before initialized and tools | Client silently continues | MCP lifecycle specification |
| Shared fallback | Server alternative also exists in client set | Client accepts, completes, and lists tools | Compatible fallback is rejected | MCP lifecycle specification |
| Missing version | Initialize params omit \`protocolVersion\` | Schema failure is contained and stable | Ordinary initialize result appears | MCP schema reference |
| Malformed version | Value is empty or non-date text | Defined parser or negotiation behavior is recorded | Result varies between identical runs | MCP schema and SDK references |
| Protocol downgrade test | Requested preferred value yields older shared value | Selected revision is explicit before readiness | Tool operation starts before acceptance | MCP lifecycle specification |
| MCP version fallback behavior | Same unknown request runs in source and package | Both choose the same exported latest value | Source and artifact disagree | \`packages/mcp/package.json\` |

The malformed row is characterization unless the protocol schema imposes a stricter semantic format than its runtime parser. Pin observed accepted or rejected behavior without calling an arbitrary string a valid protocol revision.

For every supported exported value, require exact equality between request and server result. This catches an SDK integration that always selects latest and silently drops backward compatibility.

For every unknown value, require a result from the known supported set or a defined error. Never accept an echoed unknown value as proof that the server implements that revision.

MCP protocol version negotiation tests must also verify no tools are called after the client rejects the selected value. An error log followed by normal traffic is still unsafe continuation.

## What failures expose client server version compatibility?

Client server version compatibility fails when peers proceed with no shared date. The clearest log shows a picked date outside the client set, then a done note or tool call.

The server also fails if it echoes an unknown date. That echo can claim false support and push the true fault into a much later call.

The fallback must stay the same as well. The same build, input, and host should pick the same date in each fresh child.

Test a client supporting only its synthetic future value. When the server answers with current latest, the harness should reject the result and close before any tool message.

Then test a client supporting both the synthetic preferred value and the server's selected latest. That pair can continue because the response establishes a shared revision despite non-echo selection.

The good example imports SDK date values and tries each known request against the built QASkills child. This keeps the test set tied to the SDK under test.

\`\`\`typescript
import {
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from '@modelcontextprotocol/sdk/types.js';
import { expect, it } from 'vitest';

it.each(SUPPORTED_PROTOCOL_VERSIONS)(
  'echoes supported revision %s',
  async (protocolVersion) => {
    const peer = await spawnMcpPackage();
    const response = await peer.initialize({
      protocolVersion,
      clientSupported: SUPPORTED_PROTOCOL_VERSIONS,
    });

    expect(response.error).toBeUndefined();
    expect(response.result.protocolVersion).toBe(protocolVersion);
    expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(
      response.result.protocolVersion,
    );
    expect(LATEST_PROTOCOL_VERSION).toBe(SUPPORTED_PROTOCOL_VERSIONS[0]);
    await peer.completeInitialization();
    expect(await peer.listToolNames()).toHaveLength(6);
  },
);
\`\`\`

The exported ordering assertion should remain only if the SDK documents latest as the first supported entry. Otherwise, assert membership and exact named constant without depending on array order.

Create one peer per table row. Revision state is negotiated for a connection, so a second initialize in the same process tests lifecycle duplication rather than another version.

Do not compare date strings with greater-than logic to decide support. Protocol dates identify revisions, but compatibility remains an explicit set relation.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) can document the normal client setup. The matrix should still expose negotiated response values that user-facing configuration usually hides.

Print the two sets as short sorted lists in a failed row. Keep the real choice order in a second field, since sort order must not change which date is asked.

Check that the made-up date is not in the SDK set before child launch. This small guard keeps a once-bad date from turning into a good row years later.

Use the same client name and feature data for all rows. A changed name or feature set would add noise and make the date fault less clear.

The [MCP guide](/mcp) can host the known good date for a release smoke test. CI should still read its full known set from the SDK.

## CI coverage for protocol downgrade test

A protocol downgrade test should run whenever the MCP SDK range, lock resolution, build output, or initialize integration changes. Dependency updates are the main source of supported-set drift here.

Run a fast in-process selection matrix and a smaller packaged stdio matrix. The first covers every exported revision, while the second protects framing and distribution integration.

Record manifest range from \`packages/mcp/package.json\` and the concrete installed package version. This distinction avoids calling a caret range an exact deployment pin.

Keep network closed because initialize and tool listing do not require catalog data. Any fetch attempt before accepted negotiation should fail the case immediately.

Use separate deadlines for process start, initialize response, client decision, and optional tool listing. A timeout should name the requested and selected values known at that state.

Retain failed transcripts with controlled client sets, server supported set, selected result, next action, package version, Node version, and platform. Avoid storing dependency trees beyond the relevant package facts.

Block release on an unknown echo, a changed good-date reply, an unsafe client go, source and build drift, wrong IDs, child crashes, or tools before a shared date. Each fail must name the bad row.

A newly added supported revision should trigger review rather than automatic failure when it comes from an approved SDK update. Reviewers should add compatibility expectations for that value before release.

Run one repeated fresh-process row to detect state or build nondeterminism. Both selections and client decisions must match exactly.

The [MCP overview](/mcp) identifies the shipped integration, but CI evidence should point to package source and dependency resolution. Marketing copy cannot prove runtime revision support.

MCP protocol version negotiation tests should output a compact compatibility matrix in job summaries. Highlight requested, selected, client accepted, and normal operation reached as separate fields.

Keep the job free from web and file mocks that it does not need. A small child and a few wire frames are enough to prove this rule.

Run all known dates in one shard and all bad dates in a second shard. Both shards should start from the same built file and SDK set.

If a new SDK date appears, fail with a set diff before the child rows. The owner can then add the new good row and judge which old rows stay.

Keep the first failed frame in the main job text. Put the full safe run log in the job file for the code owner to read.

## How should MCP version fallback behavior be asserted?

MCP version fallback behavior should be asserted as a relation among requested value, server-supported set, selected value, and client-supported set. No single equality check covers all valid outcomes.

For a known request, picked must equal asked. For an unknown request, picked must lie in the server set and must not echo that bad value.

The client goes on only when the picked date lies in its own set. A stop must occur before the done note and any tool call.

Check the exact reply ID and shape before set logic runs. A date in an error or a stray frame cannot prove a match.

Repeat unknown requests against source and built code. Hide child IDs only, while asked date, picked date, choice, and send order stay exact.

The negative example models two clients receiving the same server fallback. One shares the fallback and continues, while the other disconnects without listing tools.

\`\`\`typescript
it.each([
  {
    name: 'shared fallback',
    clientSupported: ['2099-01-01', LATEST_PROTOCOL_VERSION],
    shouldContinue: true,
  },
  {
    name: 'incompatible fallback',
    clientSupported: ['2099-01-01'],
    shouldContinue: false,
  },
])('$name handles the server selection safely', async (testCase) => {
  const peer = await spawnMcpPackage();
  const response = await peer.sendInitialize('2099-01-01');

  expect(response.result.protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
  expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(
    response.result.protocolVersion,
  );

  const accepted = testCase.clientSupported.includes(
    response.result.protocolVersion,
  );
  expect(accepted).toBe(testCase.shouldContinue);

  if (accepted) {
    await peer.completeInitialization();
    expect(await peer.listToolNames()).toHaveLength(6);
  } else {
    await peer.disconnect();
    expect(peer.sentMethods()).not.toContain('notifications/initialized');
    expect(peer.sentMethods()).not.toContain('tools/list');
  }
});
\`\`\`

Keep the synthetic revision obviously outside real supported data and assert that assumption before the case. If the protocol eventually reaches that date, the fixture should fail loudly and be replaced.

Missing and malformed values need parser-specific assertions before fallback logic. Do not let a schema error become a fallback merely because both produce no shared revision.

Compare stable error code and meaningful message terms for rejected message shapes. Avoid full stack snapshots, which couple the test to build paths rather than protocol output.

MCP protocol version negotiation tests become useful during upgrades when the diff names a changed set member or selection. A generic initialize failure offers far less release guidance.

Give the set check its own fail text for asked, picked, and known dates. Do not wrap all three facts in one broad truth check.

Check the stop path for lack of sends as well as lack of tool results. This catches a client that sends tools but closes before their replies arrive.

Run a fresh child for the second pass, not a second init on one pipe. One pipe can hold one agreed date and would test a different rule.

The [skills directory](/skills) is safe for a later good-date smoke run. It must not be reached from any bad-fit row in this test set.

## Step-by-step test implementation

Create the matrix from SDK exports, then add fixed no-fit rows around it. This keeps good dates current while bad dates stay clear and planned.

1. Read \`packages/mcp/src/index.ts\` and \`packages/mcp/package.json\`, noting SDK delegation, dependency range, runtime, and built entry point.
2. Import latest and supported revision values from the installed SDK, then define synthetic old, future, malformed, and missing inputs outside that set.
3. Spawn fresh raw stdio peers and send controlled initialize requests with explicit client-supported sets and unique JSON-RPC IDs.
4. Assert exact echo for supported values, known server selection for unknown values, and normal tools only after the client accepts.
5. Reject server choices absent from client support, withhold initialized and tools, and verify missing or malformed messages receive contained behavior.
6. Run source and package matrices in CI, retain failed negotiation rows, and assign drift to SDK, QASkills integration, client logic, or release workflow.

Check every made-up value against SDK support before the run. Bad data that becomes known has changed the whole point of its row.

Write the client decision in one pure helper and test it independently with small sets. The raw peer should then call that helper before sending any next lifecycle frame.

Use sorted copies only for set reporting, not for preferred-version selection. Preference order can matter and should remain explicit in the client fixture.

Close rejected peers promptly and await child cleanup. A test that abandons incompatible processes may pass locally while exhausting CI resources.

The [skills directory](/skills) is intentionally absent from matrix execution because no catalog request is needed. Use it later for an accepted-version smoke test that calls a real skill tool.

MCP protocol version negotiation tests are complete when server choice and client choice are both clear. A shared date must come before ready in every good row.

Read the final row as a short tale: ask, pick, check, and next send. If any one step is vague, add that fact before the suite ships.

Use plain names for all sets and dates in saved logs. Short names cut noise when a set diff spans several SDK dates.

Keep one good row after the bad group as a leak check. It should pass with the same date and tool count as the first good row.

The [blog index](/blog) can link the set change to its fix. The build log should retain the exact SDK set used for that run.

## Failure triage and regression ownership

Begin with package facts. Compare manifest range, installed SDK version, exported latest value, and exported supported set before reading a long transcript.

If a supported request is not echoed, reproduce against the SDK integration with the smallest initialize message. SDK or package integration owns selection before tools matter.

If an unknown value is echoed, capture the exact server result and stop. Do not send later methods that might confuse the primary negotiation defect.

If server selection is known but the client continues without support, client logic owns the failure. The QASkills server may have followed allowed fallback behavior.

If source and built package differ, inspect stale output, dependency bundling, and release installation. Do not broaden accepted revisions to accommodate an old artifact.

If missing or malformed messages crash the process, separate schema parsing from revision selection. The protocol boundary should contain invalid request data predictably.

If only one platform times out, inspect subprocess framing and cleanup before changing compatibility expectations. Revision selection should not depend on filesystem paths or host locale.

The [blog index](/blog) can connect version failures to wider MCP work, while the issue retains the single compatibility row. Owners need requested, selected, supported sets, and next action.

Close the regression only after supported, shared-fallback, incompatible-fallback, malformed, and package-parity rows pass. One latest-version success is not a compatibility matrix.

## Frequently Asked Questions

### How should clients handle an unsupported MCP protocol version?

Clients should inspect the revision returned by initialize and compare it with their own supported set. If the server selects a shared alternative, they may complete initialization; if it returns a revision they cannot process, they must disconnect before initialized notification, tool listing, or any application request.

### What proves an MCP initialize version mismatch?

The proof is a server-selected revision outside the client's declared support, followed by a client stop rather than normal operation. Record requested value, server support, selected value, client support, and next message, since a non-echo response alone is not enough because a shared fallback can be valid.

### How should client server version compatibility be modeled?

Model each peer as an explicit supported set plus a preferred requested value. The server chooses a supported response during initialize, and the client checks membership before continuing; avoid date comparisons, since protocol revisions are identifiers and compatibility depends on implementation support rather than chronological distance.

### What makes a protocol downgrade test reliable?

Use a requested preferred revision, a controlled shared older revision, and exact message ordering. Assert the server's selected value before sending initialized, then prove tools appear only after client acceptance, and also test an incompatible client that receives the same selection and disconnects without any normal operation.

### Why derive MCP version fallback behavior from the SDK?

QASkills delegates negotiation to its SDK and does not hold a separate revision list. Importing public latest and supported values keeps tests aligned with the installed dependency, while CI should still review set changes, record the concrete SDK version, and compare source behavior with the distributed package.

## Conclusion

MCP protocol version negotiation tests protect agreement rather than one favored date. They prove supported requests, defined server fallback, safe client acceptance, incompatible disconnects, schema boundaries, and source-package parity before any tool becomes active.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills in the [skills directory](/skills). Apply this negotiation matrix before the next MCP release, and use the [conformance guide](/blog/mcp-official-conformance-suite-server-guide-2026) for wider protocol coverage.`,
};
