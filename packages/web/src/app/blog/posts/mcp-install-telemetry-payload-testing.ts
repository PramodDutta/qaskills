import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP install telemetry payload testing',
  description:
    'MCP install telemetry payload testing with repository-backed contracts, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP install telemetry payload testing',
  keywords: [
    'MCP install telemetry payload testing',
    'MCP telemetry schema contract',
    'mcp version telemetry tag',
    'install agentType payload',
    'skillSlug telemetry normalization',
    'anonymous install event test',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://nodejs.org/api/globals.html#fetch',
    'https://json-schema.org/draft/2020-12/json-schema-core',
  ],
  repoEvidence: [
    'packages/mcp/src/index.ts',
    'packages/web/src/lib/telemetry-normalize.ts',
    'packages/mcp/package.json',
  ],
  content: `MCP install telemetry payload testing should capture the emitted POST body and verify all six current fields against the requested slug, agent, install action, and package version. Success also means the web normalizer preserves the intended reference, action, and agent. A missing, renamed, mistyped, or semantically changed field disproves the contract.

## What must MCP install telemetry payload testing prove?

MCP install telemetry payload testing must prove both sides of one event boundary. The MCP package emits a six-field JSON body, while the web normalizer converts supported current and legacy shapes into database-facing dimensions.

The exact emitted fields are \`skillSlug\`, \`agentType\`, \`installType\`, \`cliVersion\`, \`agents\`, and \`action\`. Their current values come from the tool request, a fixed install operation, and the MCP package version.

The implementation evidence starts in \`packages/mcp/src/index.ts\`. Its \`trackInstall\` function posts to \`/api/telemetry/install\` after a successful file write and catches request rejection without failing installation.

The web side lives in \`packages/web/src/lib/telemetry-normalize.ts\`. Its main call returns \`ref\`, \`refIsUuid\`, \`installType\`, and \`agentType\`, or null when it has no sound ref.

The package version comes from \`packages/mcp/package.json\`, which is loaded as the source for \`VERSION\`. The emitted \`cliVersion\` prepends \`mcp-\` to that exact value.

These facts form two linked contracts, not one shared shape. The send side has a version and two agent forms, but the web side does not return both.

That split stops false claims about what is kept. Tests should prove all six sent fields and only the values that the web code gives back.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) defines how tool calls and results cross the protocol. It does not define QASkills telemetry fields, so repository code remains the source for this event shape.

The [Node fetch documentation](https://nodejs.org/api/globals.html#fetch) covers the global request API used by the package. A contract harness should capture its URL, method, headers, and parsed JSON body through a local endpoint.

The [JSON Schema 2020-12 core specification](https://json-schema.org/draft/2020-12/json-schema-core) supplies a standard vocabulary for a machine-readable fixture schema. It does not replace behavioral checks for normalization and opt-out logic.

Keep broader privacy controls in the [telemetry opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track). This suite narrowly verifies the MCP install event, disabled paths, and receiver interpretation.

MCP install telemetry payload testing passes only when exact transport evidence and normalized output agree. Merely checking that one POST occurred cannot detect changed names, defaulted meanings, or a malformed version tag.

## Which repository behavior defines the contract?

\`installSkill\` in \`packages/mcp/src/index.ts\` downloads a skill, writes its final file, and then calls \`trackInstall(slug, agent)\`. Telemetry therefore belongs after a successful write in the observed production order.

\`trackInstall\` first evaluates \`shouldTrackTelemetry\`. It returns without a request when \`DO_NOT_TRACK\` equals \`1\` or \`QASKILLS_TELEMETRY\` equals \`0\`.

When enabled, it builds the telemetry URL and calls \`fetchWithTimeout\` with method \`POST\`. The body is a serialized object containing the six current fields.

\`skillSlug\` receives the requested slug without sender-side trimming. \`agentType\` receives the tool's agent value, and \`agents\` contains the same value as its only element.

\`installType\` is \`add\`, while \`action\` is \`install\`. These labels differ because the receiver supports older and newer caller conventions.

\`cliVersion\` is the text \`mcp-\` followed by \`VERSION\`. The package loads that version from \`packages/mcp/package.json\`, so a hard-coded expected version in tests will become stale.

\`fetchWithTimeout\` adds a QASkills MCP user agent and adds JSON content type when a body exists. The request uses an abort signal and clears its timer in a final block.

\`trackInstall\` attaches a rejection handler and returns void. Installation does not await telemetry completion, so black-box tests need a bounded request latch before ending the local server.

On the receiving side, \`normalizeInstallEvent\` rejects non-objects, null, and objects without a usable slug or id. It prefers a trimmed string \`skillSlug\` over a trimmed string \`skillId\`.

The normalizer recognizes \`remove\` and \`update\` from either current \`action\` or legacy \`installType\`. All other values retain the default normalized type \`add\`.

For the agent dimension, a string \`agentType\` wins. Otherwise, the first string member of \`agents\` wins, and no usable value becomes \`unknown\`.

The normalizer also classifies the chosen reference with a UUID regular expression. A slug such as \`playwright-checks\` should remain \`refIsUuid: false\`.

Use the [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) for the user-facing installation flow. The test fixture should still call the real tool path so it covers write-before-telemetry ordering.

MCP install telemetry payload testing should record send and web checks on their own lines. That layout shows which side changed and keeps one fault from hiding the next.

## How should QA teams test MCP telemetry schema contract?

An MCP telemetry schema contract should compare the complete captured object with an expected object built from fixture inputs and the package version. Exact key checks catch both missing fields and accidental additions that require review.

Start a local HTTP server that implements the skill content route and telemetry route. Reject every unexpected method or path so hidden requests fail loudly.

Launch the built MCP server with \`QASKILLS_API_URL\` targeting that local origin. Use a disposable working directory, initialize the protocol, and invoke \`install_skill\` with a fixed slug and agent.

Wait for the file success result, then await the telemetry latch. Since dispatch is not awaited, ending the test immediately after the tool result can miss the request.

Parse the captured body once and retain its raw bytes for diagnostics. Assert content type, POST method, endpoint path, and the exact six-key object.

The first example demonstrates the black-box sender contract. Its helper returns the package version from the same JSON file used by production.

\`\`\`typescript
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

it('emits the current six-field install event', async () => {
  const packageJson = JSON.parse(
    await readFile('packages/mcp/package.json', 'utf8'),
  ) as { version: string };
  const api = await startInstallApi({
    slug: 'contract-probe',
    content: '---\\nname: contract-probe\\n---\\n',
  });
  const mcp = await startMcp({
    apiUrl: api.url,
    cwd: await createInstallRoot(),
  });

  const result = await mcp.callTool('install_skill', {
    slug: 'contract-probe',
    agent: 'cursor',
  });
  expect(result.isError).not.toBe(true);

  const request = await api.nextTelemetryRequest();
  expect(request.method).toBe('POST');
  expect(request.pathname).toBe('/api/telemetry/install');
  expect(request.headers.get('content-type')).toBe('application/json');
  expect(await request.json()).toEqual({
    skillSlug: 'contract-probe',
    agentType: 'cursor',
    installType: 'add',
    cliVersion: \`mcp-\${packageJson.version}\`,
    agents: ['cursor'],
    action: 'install',
  });
});
\`\`\`

The exact-object assertion is intentional because this is a small private event contract. If a new field is added, reviewers should decide whether receiver validation, documentation, and privacy review also change.

Add a JSON Schema fixture if several packages consume the event. Keep behavioral tests because a schema cannot prove that the requested slug and agent populated the correct fields.

Use one event per installation and assert the local server saw no duplicate POST. Retries are not shown in the current sender, so duplicate traffic would be a meaningful change.

MCP install telemetry payload testing should not use live event state. A local catch server gives fixed proof without making a real install row.

## Test matrix for mcp version telemetry tag

The mcp version telemetry tag matrix should compare sender inputs, raw payload values, and normalized outputs. It must also cover disabled telemetry and legacy receiver fallbacks without confusing those independent behaviors.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| MCP telemetry schema contract | Slug \`contract-probe\`, agent \`cursor\` | Exact six-field POST body | Missing, extra, or renamed key | \`packages/mcp/src/index.ts\` |
| mcp version telemetry tag | Package version read at runtime | \`cliVersion\` equals \`mcp-\` plus version | Raw version, fixed stale value, or wrong prefix | \`packages/mcp/package.json\` |
| install agentType payload | Agent \`claude-code\` | \`agentType\` and first \`agents\` item agree | Values differ or have wrong types | MCP sender code |
| skillSlug telemetry normalization | Current slug with surrounding spaces at receiver | Normalized \`ref\` is trimmed slug and not UUID | Legacy id wins or whitespace remains | \`telemetry-normalize.ts\` |
| Current install action | \`action: install\`, \`installType: add\` | Normalized type is \`add\` | Remove or update meaning appears | Receiver branch order |
| Legacy update event | \`skillId\`, \`action: update\` | Reference survives and type is \`update\` | Event becomes add or null | Receiver compatibility code |
| anonymous install event test | Current six fields with no user key | Normalizer accepts event dimensions | Test invents a required user identifier | Sender and receiver evidence |
| Disabled by environment | \`DO_NOT_TRACK=1\` | No telemetry request after successful file write | Any telemetry POST occurs | \`shouldTrackTelemetry\` |
| Missing reference | Object has agent and action only | Normalizer returns null | Fabricated empty or unknown reference | \`normalizeInstallEvent\` |

The normalizer ignores \`cliVersion\`, \`agents\` after agent selection, and the original action label after mapping. Assert those fields on the sender, not in normalized output.

Test the package version through file input rather than a copied string. A release version bump should update the expected prefix automatically while still detecting a missing \`mcp-\`.

Include a value such as \`mcp-0.1.2-extra\` only as a malformed receiver fixture if a receiver rule exists. The current normalizer does not validate version, so do not fabricate a rejection guarantee.

The [MCP contract testing guide](/blog/mcp-server-contract-testing-guide) can verify general tool results. This matrix focuses on the secondary HTTP event created after a successful install.

## What failures expose install agentType payload?

An install agentType payload defect appears when the requested agent is absent, moved, changed in type, or inconsistent across \`agentType\` and \`agents[0]\`. Compare both locations with the original tool argument.

Use agents containing hyphens, digits, and mixed case because the sender performs no normalization. The exact value should survive emission unless product requirements later define canonical names.

The receiver prefers a string \`agentType\`, even when a different first agents value exists. Add a conflict fixture so this precedence cannot change unnoticed.

When \`agentType\` is absent, the receiver filters non-string array entries and selects the first remaining string. A list containing numbers before a valid string should still normalize to that string.

When neither form supplies a usable value, the receiver returns \`unknown\`. This fallback is valid receiver behavior, but the current MCP sender should never need it for a normal tool call.

The negative example directly tests receiver semantics with current, conflicting, legacy, and malformed shapes. It avoids network concerns and produces clear structural diffs.

\`\`\`typescript
import { describe, expect, it } from 'vitest';
import { normalizeInstallEvent } from '@/lib/telemetry-normalize';

describe('MCP install telemetry normalization', () => {
  it('prefers current slug and explicit agent fields', () => {
    expect(
      normalizeInstallEvent({
        skillSlug: '  contract-probe  ',
        skillId: 'legacy-name',
        agentType: 'cursor',
        agents: ['claude-code'],
        installType: 'add',
        action: 'install',
        cliVersion: 'mcp-0.1.2',
      }),
    ).toEqual({
      ref: 'contract-probe',
      refIsUuid: false,
      installType: 'add',
      agentType: 'cursor',
    });
  });

  it('uses the first string agent when agentType is absent', () => {
    expect(
      normalizeInstallEvent({
        skillSlug: 'contract-probe',
        agents: [17, 'qa-agent'],
        action: 'update',
      }),
    ).toMatchObject({ installType: 'update', agentType: 'qa-agent' });
  });

  it('rejects an event without a reference', () => {
    expect(normalizeInstallEvent({ action: 'install', agents: ['cursor'] })).toBeNull();
  });
});
\`\`\`

This receiver test does not prove the sender emitted a request. Keep it beside the black-box capture so every side of the boundary has one focused oracle.

Avoid snapshotting arbitrary request objects because headers and socket details vary. Extract only method, path, selected headers, raw body, and arrival count.

MCP install telemetry payload testing should make conflicting values visible rather than silently choosing expected data in the fixture builder. Build the raw object directly for precedence cases.

Use the [telemetry opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track) to align environment fixtures across CLI and MCP packages. Do not assume both products construct identical payloads.

## CI coverage for skillSlug telemetry normalization

CI coverage for skillSlug telemetry normalization should run web unit tests and MCP black-box tests in the same change gate. Cross-package drift can occur when either sender or receiver changes alone.

Build the MCP package before its process test and import the web normalizer from source for focused cases. Report each side separately so package ownership stays clear.

Use a local endpoint with a random available port and explicit teardown. Fixed ports create unrelated failures when workers run concurrently.

Set \`DO_NOT_TRACK\` and \`QASKILLS_TELEMETRY\` explicitly for every process fixture. Inherited developer or runner values can suppress an expected request and create confusing timeouts.

For enabled cases, await one telemetry request with a bounded timeout. For disabled cases, observe a short no-request window and then prove installation still completed.

Retain package version, raw request body, normalized output, environment flags, request count, and file-write result on failure. Redact unrelated environment variables before attaching logs.

Block release when the six fields drift, version prefix is wrong, slug or agent meaning changes, opt-out sends traffic, or a current event normalizes to null. A changed header casing should not block when semantic header lookup still passes.

Run receiver compatibility cases for \`skillId\`, legacy \`installType\`, and agents fallback. These fixtures protect existing callers while the MCP sender uses the current shape.

Use [getting started](/getting-started) only for supported installation commands. CI should invoke package scripts directly and should not depend on a user profile.

MCP install telemetry payload testing should avoid checks on a live event store. This unit ends when local web code reads the caught body.

## How should anonymous install event test be asserted?

An anonymous install event test should assert the exact current six-field body and verify that no user identifier field was added. It should not claim the surrounding HTTP stack has no network metadata.

The sender object contains skill, agent, operation, and version dimensions. It does not include an account id, email address, client-generated person id, or project path.

Use an exact key set assertion rather than searching serialized text for selected names. A new identity field could otherwise appear without failing the test.

Also inspect URL query parameters because identity data could move outside the body. The current telemetry URL has only the route created by \`buildUrl\`.

Do not assert that IP addresses are never observable by a server. Network infrastructure can process connection metadata even when the application body has no user field.

Keep privacy wording limited to the emitted application payload. This boundary is precise, testable, and supported by the repository.

Verify opt-out independently by launching a new child with \`DO_NOT_TRACK=1\`, completing an install, and observing no local telemetry request. Repeat with \`QASKILLS_TELEMETRY=0\`.

An empty or differently cased value does not disable tracking under the current equality checks. Test exact disabling values and avoid implying broader truthy parsing.

Link privacy-facing behavior to the [QASkills telemetry article](/blog/qaskills-cli-disable-telemetry-do-not-track). The MCP suite should keep its own assertions because its environment and sender code are separate.

MCP install telemetry payload testing should report an unexpected field by name and value type. That output gives reviewers enough context without storing full request headers.

## Step-by-step test implementation

Implement MCP install telemetry payload testing in six steps, joining sender evidence with receiver behavior. Keep transport capture, normalization, opt-out, and cleanup as visible phases.

1. Read \`packages/mcp/src/index.ts\`, \`packages/web/src/lib/telemetry-normalize.ts\`, and \`packages/mcp/package.json\` to record fields, defaults, order, and version source.
2. Create a local content and telemetry server, a temporary install root, fixed slug and agent fixtures, and explicit enabled or disabled environment values.
3. Invoke \`install_skill\`, capture the POST method, path, headers, raw body, request count, file result, and package version without contacting public services.
4. Assert the exact six-field sender object, then pass that body through \`normalizeInstallEvent\` and compare its exact reference, UUID flag, install type, and agent.
5. Inject missing, conflicting, legacy, malformed, and opt-out cases, then close child processes, request listeners, timers, and temporary directories.
6. Run MCP and web checks in CI, retain minimal failed artifacts, and assign drift to sender, receiver, package metadata, environment, or harness ownership.

Build fixture helpers that accept raw overrides but do not silently repair them. Negative cases need malformed values to reach the normalizer unchanged.

Use deep equality for the six-field body and normalized object. Add separate assertions for request timing and write completion because object equality cannot prove call order.

Run the current sender fixture through the current normalizer in one integration case. This small compatibility check detects drift even when each side's isolated test was updated incorrectly.

Keep historical shapes in receiver-only tests. The MCP process should emit only its current shape, which keeps sender expectations simple.

Browse related engineering notes on the [QASkills blog](/blog), but keep the release artifact tied to this exact event boundary. General analytics success does not prove field accuracy.

## Failure triage and regression ownership

If no request arrives, first inspect opt-out variables, install completion, the local route, and the request latch. A file-write failure correctly prevents telemetry and should not be labeled sender drift.

If the request arrives at the wrong path or method, the MCP package owns the first review. Capture the built URL and avoid following redirects in the local server.

If body keys or values differ, compare them with \`trackInstall\` and the package version. Check whether the change was planned before new web rules are set.

If the sent body is right but the web result is null, inspect ref types and blank space. The web side needs a nonempty string slug or id.

If agent output differs, inspect \`agentType\`, the string items in \`agents\`, and fallback order. A clash case should show which branch changed.

If install type differs, compare \`action\` and old \`installType\` values. Web rules let remove and update win over the base add state.

If only CI times out, check whether the tool result arrived before the fire-and-forget POST. Keep the server open until the telemetry latch or its bounded deadline completes.

Use one path: prove the write, check opt-out, inspect the HTTP catch, compare six fields, map the body, then compare output. The first mismatch names the owner.

A good event log starts with the slug, agent, and exact package build that the tool call used. It then shows the six keys in a fixed order so a missing key stands out during review.

Keep the raw body hash near the parsed object and request time in the same report. The hash proves two test steps read the same bytes, while the object keeps the field diff easy to scan.

For the slug, show the sent text, raw byte count, and the web ref on one line. If trim rules change, that line tells the team what was lost or kept at the shared boundary.

For the agent, show \`agentType\`, the first string in \`agents\`, the tool arg, and the final web value. This small view makes a clash case clear without a full body dump or a long trace.

For the action, show both \`action\` and \`installType\` beside the mapped type and the source case name. The three values make old call support easy to check during a small and focused code review.

For the version, show the package value, package file hash, and the full \`mcp-\` tag in one row. Do not ask the web result for this field, since that code does not return or store it.

The request log should name the POST path, method, arrival count, and all query keys seen by the server. A blank query list proves no ref or user key moved out of the caught JSON body.

The header log needs only content type, the MCP user agent, and whether a request body was sent. Other fetch headers may come from Node and do not help this small contract or its owner.

When opt-out is on, show file success, final byte count, and a zero request count in one row. Both core facts prove the install worked while the event path stayed off for the whole wait.

When opt-out is off, wait for one full request and then close the latch after its body is read. A late second call should fail the case instead of slipping past test teardown without a trace.

Use the [telemetry opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track) when a flag case fails in either local or CI runs. It gives the team shared names for the two switch values and their expected effect in this package.

Use [getting started](/getting-started) to confirm the test call still matches the normal install flow and agent input. Keep all HTTP calls local, since the guide is context and not fixed test data for this event.

For a missing ref case, print the key set, each ref type, and the null result from web code. This proves the web code did not make up a slug from the agent, action, or another field.

For a bad type case, print the field name, seen type, expected type, and source fixture case name. Do not print the whole process env, machine state, or any live request data in the job log.

When one side changes on purpose, update the send and web tests in the same reviewed code change. A green test on just one side can still leave the shared event contract broken for the next release.

Run one old shape after the current shape in the same unit suite and with the same web code. This checks that new field work did not drop support for a prior client still sending valid data.

Keep a case with two unlike agent values even though the live sender uses one value twice today. That clash locks the web choice rule, makes its order plain, and guards the fallback from drift.

A reviewer should be able to trace each output value to one input key and one line of source. If that trace needs guesswork, add a focused check before the event shape grows or gains more fallbacks.

The final CI note should name sender, web mapper, flag, or test rig as the first owner, with the first bad field, request count, and package build used for that exact run. This short label gives the next person a clear first file, case, captured value, source line, and next check to read.

Do not print full process environments or broad child logs from a shared CI host during triage. Report only the two telemetry flags, API origin, package version, synthetic fixture values, local route, and first caught request time.

MCP install telemetry payload testing defects should name a field, stage, source file, and first bad value from the run. A broad label such as "event broken" gives no clue about which small rule failed or where review should start.

## Frequently Asked Questions

### How can tests verify all current MCP install telemetry fields?

Capture the local POST made after a successful \`install_skill\` call and compare its parsed body with an exact six-key object. Build expected slug and agent values from tool inputs, and build \`cliVersion\` from \`packages/mcp/package.json\`. Then pass the body through the web normalizer.

### What belongs in the MCP telemetry schema contract?

The sender contract covers \`skillSlug\`, \`agentType\`, \`installType\`, \`cliVersion\`, \`agents\`, and \`action\`, plus POST path and content type. The receiver contract covers normalized reference, UUID classification, install type, and agent. Keeping them separate avoids claiming that ignored sender fields are stored.

### How should the mcp version telemetry tag be tested?

Read the current MCP package version during the test and require \`cliVersion\` to equal \`mcp-\` plus that value. This catches a missing prefix without freezing an old release number. The current web normalizer ignores version, so assert the tag on the captured sender body.

### What precedence applies to the install agentType payload?

The receiver uses a string \`agentType\` first. If it is absent, it filters \`agents\` to strings and selects the first one; otherwise, it returns \`unknown\`. A conflict fixture should preserve that order, while the normal MCP sender should place the requested agent consistently in both forms.

### What does an anonymous install event test actually prove?

It proves that the application payload contains only the six expected skill, agent, operation, and version fields, with no user identifier key or query parameter. It does not prove that network infrastructure lacks connection metadata. Test the exact body and opt-out paths without making a broader privacy claim.

## Conclusion

MCP install telemetry payload testing guards a small link from the MCP tool to web code. Exact fields, version, opt-out, and map checks show whether install meaning stays intact without live event data.

Review the [QASkills MCP integration](/mcp), then browse [verified QA agent skills](/skills) and apply this payload matrix before the next MCP release. Use the [MCP server guide](/blog/qaskills-mcp-server-guide) to keep each test call tied to the shipped install flow.`,
};
