import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP capability negotiation contract tests',
  description:
    'MCP capability negotiation contract tests with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP capability negotiation contract tests',
  keywords: [
    'MCP capability negotiation contract tests',
    'MCP tools capability test',
    'unadvertised capability rejection',
    'MCP prompts capability absence',
    'MCP resources capability absence',
    'capability negotiation matrix',
  ],
  relatedSlugs: [
    'mcp-server-contract-testing-guide',
    'mcp-inspector-tutorial-2026',
    'mcp-server-testing-guide-2026',
    'qaskills-mcp-server-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle',
    'https://modelcontextprotocol.io/specification/2025-11-25/server/index',
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  content: `MCP capability negotiation contract tests should match each init capability claim with server calls that work. QASkills must advertise tools, list its six handlers, omit prompts and resources, and return wire errors for those absent calls, while a false capability claim, hidden tool, accepted unknown call, or mismatch between list and handler disproves the contract.

## What must MCP capability negotiation contract tests prove?

MCP capability negotiation contract tests must show that the init result tells the truth about the server, and the tools capability advertisement must lead to six usable handlers while prompts and resources stay absent. The test runs in two ways: each present capability needs a good call that works, while each absent capability needs a bad call with no normal data.

Keys alone are not enough, since a tools capability claim with no list, a lost handler, a repeat name, or a bad shape would still fool the client after init. A missing key is not enough either, so send fixed prompt and resource calls to prove that no hidden handler can still reach those absent capabilities.

The official [MCP lifecycle specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle) sets this capability advertisement at init, and each peer should use only the capabilities named for that one link. MCP capability negotiation contract tests should keep client and server capability data apart, since QASkills states what the server has while client data states what the server may ask from its peer.

This article covers tools, prompts, and resources because the source makes those capability lines clear, but it does not state QASkills rules for each optional choice in MCP. Use raw stdio frames for the release proof, since a full client may hide or skip calls it does not know while a source-level handler capture gives only a fast first clue.

The pass row should include init capability keys, tool names, list-change advertisement, bad call result, app effects, build version, and child health, since those facts show which side changed. The broader [MCP contract testing guide](/blog/mcp-server-contract-testing-guide) covers tool shapes and handler errors in depth, while this matrix checks if source, capability advertisement, list, and call all agree.

Write those four facts as four fields in each row. A gap then points to one edge, not to a large init dump with no clear cause.

Give a present row a green path from source to call. Give an absent row a clear stop at the capability advertisement and at the wire method.

Use the same client capability data for each child. This keeps the server advertisement as the sole change and makes row diffs easy to read.

Keep tool names in one short set shared by source and wire checks. Make a new copy before sort, so the test does not change the saved order.

The [MCP page](/mcp) lists the public tool set for a quick check by eye. The built child and repo source must still own the release proof.

## Which repository behavior defines the contract?

In \`packages/mcp/src/index.ts\`, QASkills creates one \`McpServer\` and calls \`registerTool\` six times. The names are \`search_skills\`, \`get_skill\`, \`get_skill_content\`, \`install_skill\`, \`list_categories\`, and \`get_leaderboard\`.

The same source never adds a prompt or resource. It has no such handler, URI form, prompt name, or prompt input shape.

Each tool is added before \`server.connect\` starts the stdio link. The SDK can read the full tool set before it sends the init reply.

The SDK adds a tools capability claim when tool handlers are set. It builds \`tools/list\` from those live handlers, so the init advertisement and tool list must match.

QASkills does not handwrite the returned capability data. The linked SDK makes it, so source review alone cannot prove the wire form in the init reply.

The manifest \`packages/mcp/package.json\` sets \`@modelcontextprotocol/sdk\` to \`^1.29.0\`. A new SDK may change default claims or list-change fields while all six QASkills calls stay the same.

The official [MCP server features reference](https://modelcontextprotocol.io/specification/2025-11-25/server/index) splits prompts, resources, and tools into server features. That split gives this test one good row and two bad rows.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) uses \`tools/list\` to find tools and \`tools/call\` to run them. Tests need both to prove the capability advertisement is true.

Five QASkills handlers are marked read-only, while install writes one owned file. Those hints state effects and do not add more top-level MCP features.

No web call is needed for init or tool list. Prompt and resource faults should also occur before any QASkills web or file work starts.

MCP capability negotiation contract tests should use \`packages/mcp/src/index.ts\` for handler proof and raw frames for wire proof. One side alone cannot prove the full capability claim.

The [QASkills MCP guide](/blog/qaskills-mcp-server-guide) presents the six public tools to users. Its list is useful for review, but repository code remains the executable source.

## How should QA teams test MCP tools capability test?

An MCP tools capability test starts with a sound init call in a fresh built child. The reply must hold a tools key and must omit prompt and resource keys.

Check that each key is its own field, rather than using a broad truth check. An empty or null field can mean more than a key that is not there.

Send the done note, then call \`tools/list\`. Require six rows, six unique names, and the exact sorted set found in source.

Check each entry has a name, description, and input schema object. Install should expose its intended write annotations, while read tools should retain their read-only hints.

Pick one read tool for a fixed \`tools/call\`, such as a list of groups from a fake API. This proves the tools capability claim can reach a real handler.

Check the exact web path and returned MCP text. A list-only pass can hide a tool that is shown but not linked to its handler.

Capture tool adds in a unit layer by replacing \`McpServer\` before source load. Match that six-name set with raw \`tools/list\` from the build.

If those sets differ, print missing and extra names separately. One large snapshot makes a simple registration-package mismatch harder to see.

Repeat init and list in a second fresh child. Capability data and the sorted name set should stay the same across the two runs.

MCP capability negotiation contract tests should not call the production QASkills API for core rows. Controlled responses keep tool reachability independent from catalog availability.

Use the [MCP inspector tutorial](/blog/mcp-inspector-tutorial-2026) for a manual view of initialize and listing after automated failures. Do not rely on an inspector screenshot as the CI oracle.

Check one tool at a time after the list has passed. The first call should use a read tool, so no file can cloud the wire proof.

Keep the fake web reply short and fixed. A tool result with one known group is enough to show that list and call use the same handler set.

Save both the list name and the called name in the run row. If they differ, fail before the fake web reply can hide the bad route.

Run the same call after one absent-feature fault if the pipe stays live. The six tools should still work, which proves the fault did not harm state.

The [MCP server guide](/blog/qaskills-mcp-server-guide) can help check the public names. Keep its page out of the test input, so docs drift cannot change the tool set.
## Test matrix for unadvertised capability rejection

Unadvertised capability rejection needs one positive row for tools and paired negative rows for prompts and resources. Each negative request should use a valid JSON-RPC shape so method support, not malformed input, decides the outcome.

Run every row after a valid handshake. A pre-initialize rejection would test lifecycle order and could conceal an accidentally reachable feature in the ready state.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| MCP tools capability test | Valid initialize then \`tools/list\` | Tools capability and six unique names | Missing claim, empty list, or name drift | \`packages/mcp/src/index.ts\` |
| Tool call reachability | Controlled \`list_categories\` call | Registered handler returns expected text result | Method is listed but cannot dispatch | MCP tools specification |
| Tool list-change claim | Inspect tools capability details | Claim matches SDK-backed registration behavior | Unsupported flag appears or expected flag vanishes | \`packages/mcp/package.json\` |
| Unadvertised capability rejection | Valid absent-feature method after ready | Protocol error and no normal result | Hidden operation returns success | MCP lifecycle specification |
| MCP prompts capability absence | Initialize plus \`prompts/list\` | No prompts key and request is rejected | Prompt list or data is returned | MCP server features reference |
| Prompt get boundary | \`prompts/get\` with controlled name | Method remains unavailable | Named prompt handler responds | \`packages/mcp/src/index.ts\` |
| MCP resources capability absence | Initialize plus \`resources/list\` | No resources key and request is rejected | Resource list or cursor is returned | MCP server features reference |
| Resource read boundary | \`resources/read\` with controlled URI | Method remains unavailable without I/O | Resource content or application effect appears | \`packages/mcp/src/index.ts\` |
| Repeated negative request | Same absent method twice | Stable error class and healthy process | Second request succeeds or crashes | MCP lifecycle specification |
| Capability negotiation matrix | Source registrations compared with package frames | Advertisement, list, and reachability agree | Any unmatched capability or operation | \`packages/mcp/package.json\` |

The absent method should yield a JSON-RPC method fault from the SDK because no handler exists. Pin its code and key words against the installed build.

Do not let prompt or resource list calls return empty arrays. Empty success means the call exists, which would clash with the missing feature key.

For resource read, use a safe fake URI and block web and file work. The method fault should occur before the URI can cause any work.

The repeat bad row checks child health and result match. An unknown call must not change the tool set or make the next frame hard to parse.

MCP capability negotiation contract tests should compare top keys as sets and check inner fields on their own. JSON key order has no product meaning.

Give each bad method its own ID range, such as tens for prompts and twenties for resources. A crossed reply then stands out in the wire log.

Save the app effect state before and after each bad call. The two views must match, while the wire reply shows the planned method fault.

Run each list call before its read or get call. This makes it clear that both broad and named forms stay out of reach.

Do not use a made-up prompt or URI that points to a real host. Short fake values keep the test safe and the failed frame easy to share.

The [MCP testing guide](/blog/mcp-server-testing-guide-2026) can cover a feature once QASkills adds it. Until then, these bad rows must stay firm.

## What failures expose MCP prompts capability absence?

MCP prompts capability absence fails when initialize advertises \`prompts\`, when \`prompts/list\` returns normal data, or when \`prompts/get\` reaches a hidden handler. Any one signal contradicts source registration.

Read the raw init reply before any prompt call. A false prompt key is already a release fault, even if the next method fails.

Then send \`prompts/list\` with a unique ID after readiness. Require a matching error response, no result, no extra messages, and a healthy child.

Follow with \`prompts/get\` and one fixed missing name. This splits broad list routing from named lookup without a claim that the prompt is real.

Run the same pair for \`resources/list\` and \`resources/read\`. Keep IDs and fake values apart, so each reply maps to one bad row.

The good code sample checks the init tools capability claim against six source handlers and then lists them. It uses raw peer help shared with the life cycle tests.

\`\`\`typescript
import { expect, it } from 'vitest';

const expectedTools = [
  'get_leaderboard',
  'get_skill',
  'get_skill_content',
  'install_skill',
  'list_categories',
  'search_skills',
];

it('advertises only its implemented server feature', async () => {
  const peer = await spawnInitializedMcpPackage();
  const capabilities = peer.initializeResult().capabilities;

  expect(Object.keys(capabilities).sort()).toEqual(['tools']);
  expect(capabilities.tools).toEqual(
    expect.objectContaining({ listChanged: true }),
  );
  expect(capabilities).not.toHaveProperty('prompts');
  expect(capabilities).not.toHaveProperty('resources');

  const listed = await peer.request('tools/list', {});
  expect(listed.error).toBeUndefined();
  expect(listed.result.tools.map(({ name }) => name).sort()).toEqual(
    expectedTools,
  );
  expect(new Set(listed.result.tools.map(({ name }) => name))).toHaveSize(6);
});
\`\`\`

If a new SDK adds another top key, the exact key check will force review. Owners can then decide if that feature is real and in scope for QASkills.

Do not add keys just to make CI pass. Add source proof and one good call test for each new feature that owners choose to keep.

Track all app web, file, and child effects during bad calls. An error after hidden work is not the same as a fault at the method gate.

The [MCP server testing guide](/blog/mcp-server-testing-guide-2026) can cover feature-specific semantics after a capability is intentionally added. Until then, absence should remain explicit.

## CI coverage for MCP resources capability absence

MCP resources capability absence should run on the built stdio app for each MCP source or SDK change. The wire form and unknown-method route both cross that link.

Add an in-process registration capture for fast pull-request feedback. It should verify six \`registerTool\` calls and zero prompt or resource registration calls without replacing the packaged test.

Block the live web and use a new temp root. Init, list, and unknown method faults need no live API or user files.

Give each request a deadline and unique ID, then parse stdout as protocol frames only. Read stderr at the same time and include it when the process exits unexpectedly.

Save failed keys, tool names, wire method, error code, app effects, package version, SDK version, and child state. These short facts are enough for review.

Block release on false capability claims, a lost tools key, name or count drift, hidden prompt or resource success, app work from absent methods, wrong IDs, or child crashes. The failed row must show which fact broke first.

A nested tools field change may require review rather than immediate product rejection. Check the official source and SDK update before deciding whether a new list-change or task field reflects implemented behavior.

Trigger this matrix after edits to \`packages/mcp/src/index.ts\`, \`packages/mcp/package.json\`, the lockfile, or bundling configuration. A dependency-only pull request can change initialize output.

Run one bad method twice and the full grid in a fresh second child. This can catch changed handler state or build drift without making CI slow.

The [MCP overview](/mcp) gives maintainers a public checklist after deployment. Automated artifacts should still carry raw capability and method observations from the shipped command.

MCP capability negotiation contract tests should complete without catalog fixtures except one controlled tool call. Unexpected network use should be treated as test or dispatch drift.

Print the top keys and tool names in the main job view. Keep full frames in a failed file, where a code owner can check each ID.

Run the source capture before the child grid. If source names are wrong, stop there and avoid a long set of wire faults with the same cause.

Use one firm time cap for each bad call and for child close. A method fault should be fast, and a stuck close should not use the whole job.

Run the child from the built entry path, not from a source tool. This is the same path that ships and the one whose SDK code makes the capability advertisement.

The [MCP page](/mcp) can be checked once after deploy. The CI gate must not need that page or any live site to pass.
## How should capability negotiation matrix be asserted?

A capability negotiation matrix should join four facts: source handler, init capability claim, list result, and call result. All four must agree for each feature row.

For tools, source count is six, the key is present, the list has six names, and one fixed call works. A lost link makes the good proof incomplete.

For prompts and resources, source count is zero, the key is absent, and both broad and named methods fail with no app work. Empty lists are not the planned result.

Assert returned JSON-RPC IDs and prohibit simultaneous \`result\` and \`error\` members. This catches malformed negative replies even when an error message looks plausible.

Check the error code exactly and match a few stable words. Full stack or SDK path shots add noise and do not make the capability proof stronger.

The next code sample sends absent methods to one ready child and checks a stable fault. A full suite can split rows so one fail does not hide the rest.

\`\`\`typescript
it.each([
  ['prompts/list', {}],
  ['prompts/get', { name: 'missing-prompt' }],
  ['resources/list', {}],
  ['resources/read', { uri: 'qaskills://missing-resource' }],
])('rejects unadvertised %s', async (method, params) => {
  const peer = await spawnInitializedMcpPackage();
  const before = await snapshotApplicationEffects(peer);
  const response = await peer.request(method, params);

  expect(response.id).toBe(peer.lastRequestId());
  expect(response.result).toBeUndefined();
  expect(response.error).toEqual(
    expect.objectContaining({
      code: -32601,
      message: expect.stringMatching(/method|support|handler/i),
    }),
  );
  expect(await snapshotApplicationEffects(peer)).toEqual(before);
  expect(peer.isAlive()).toBe(true);
  expect(peer.unparsedStdout()).toEqual([]);
});
\`\`\`

Check the exact linked SDK code before pinning \`-32601\`. If this build uses another valid method fault, pin that seen rule and cite the SDK change.

Do not let the test peer block unknown methods before it sends them. A real client should do that, but this server test must cross the wire.

Run tool listing after the repeated absent request when the connection remains valid. The same six names should still appear, proving the failed method did not mutate server state.

MCP capability negotiation contract tests should report grid diffs by feature name. For example, \`prompts: absent source, present capability\` is clearer than a full init dump.

Read a failed row from left to right: source, capability advertisement, list, and call. Stop at the first gap and keep all later facts as aid, not as the main cause.

For an absent row, mark list and call as faults rather than blanks. A blank could mean the test never sent the method and would not prove the wire gate.

After a bad call, list tools once more when the pipe stays live. The same six names prove that the fault did not clear or change handler state.

The [skills directory](/skills) may back a later smoke call with a real slug. This core grid should keep its one tool reply fixed and local.

## Step-by-step test implementation

Use one feature ledger for present and absent server capability claims. One shape keeps empty success from being treated as absence by mistake.

1. Read \`packages/mcp/src/index.ts\` and record six tool registrations plus the absence of prompt and resource registration calls.
2. Capture in-process registrations, then spawn the compiled package and complete a valid initialize exchange with controlled client capabilities.
3. Save initialize capability keys, request \`tools/list\`, and compare six unique runtime names with the source registration set.
4. Call one controlled read tool and assert its expected request and result, proving the advertised tools capability reaches execution.
5. Send valid prompt and resource list or access requests, and assert stable errors, matching IDs, no application effects, and unchanged tools.
6. Run the matrix in CI, retain failed feature rows, and assign mismatches to QASkills source, SDK integration, package build, or harness ownership.

Keep each row as data with source count, capability state, list result, and call result. The runner can print a small grid without copied test prose.

Start a new child when a bad reply closes the pipe under the set SDK rule. Never hide that close by opening a new child in the same row.

Use one fixed client capability object in all cases. A changed client capability claim would add a second grid and make server diffs hard to read.

Do not mock \`registerTool\` in build tests. Source capture is a clue, while raw init and method calls must use the real SDK.

The [skills directory](/skills) can supply a staging slug only after the controlled matrix passes. Core capability checks should not depend on changing public catalog data.

MCP capability negotiation contract tests are complete when each present capability claim has a good code path and each chosen absent capability has a safe fault path. All four facts must agree.

Keep the grid order fixed as tools, prompts, then resources. That order puts the one good feature first and makes the two bad pairs easy to scan.

Save one hash for the whole grid input. The hash proves that a repeat run used the same names, fake values, and client feature data.

Run one clean grid after any SDK bump before changing expected keys. The first diff should guide review instead of a broad snapshot update.

The [blog index](/blog) can link the new feature when owners add one. Until code, capability advertisement, list, and call all exist, the grid must keep it absent.

## Failure triage and regression ownership

Start with source registration counts and names. If they changed intentionally, update product review before touching serialized capability expectations.

If source remains tools-only but initialize gains prompts or resources, inspect the resolved SDK, wrapper setup, and built artifact. Integration or dependency ownership precedes handler code.

If tools are advertised but listing differs, compare enabled registrations and package output. A stale build can preserve old names after source review passes.

If a listed tool cannot dispatch, inspect its request handler setup and input schema. The MCP package owns consistency between discovery and call reachability.

If prompt or resource methods return success, preserve the raw frame and application effect log. Hidden feature reachability is a release blocker even when initialize omitted its key.

If negative requests crash or corrupt stdout, route the issue to SDK integration and transport handling. Unsupported methods should remain contained protocol events.

If only CI shows extra capability keys, compare concrete dependency versions and installation mode. A caret range may resolve differently when lockfile use changes.

The [blog index](/blog) can connect a capability defect to deeper feature tests, but the issue should retain its four-fact row. Source, advertisement, discovery, and reachability show ownership clearly.

Close the regression after tools positive calls and both prompt and resource negative pairs pass. Fixing initialize output alone can leave hidden operations reachable.

## Frequently Asked Questions

### What should an MCP tools capability test verify?

Verify the initialize result includes tools, then complete readiness and require exactly six unique registered names from \`tools/list\`. Check key schemas and annotations, and execute one controlled read tool, since this chain proves advertisement, discovery, and dispatch agree instead of accepting a capability key as sufficient evidence.

### How do tests prove unadvertised capability rejection?

After a valid handshake, send a well-formed request for an omitted feature and require a matching JSON-RPC error with no normal result. Also prove no network, file, or handler effect occurred and the process stayed healthy, since client-side filtering alone cannot test the server's negative boundary.

### What proves MCP prompts capability absence?

Source should contain no prompt registrations, initialize should omit \`prompts\`, and both \`prompts/list\` and \`prompts/get\` should fail as unavailable methods. Run these checks after readiness so lifecycle rejection cannot hide a prompt handler, while the six-tool set should remain unchanged afterward.

### What proves MCP resources capability absence?

Confirm zero resource registrations, no \`resources\` key in initialize, and contained errors for \`resources/list\` and \`resources/read\`. Use a synthetic URI and deny application I/O, since a returned empty list is not equivalent because it represents an implemented resource operation rather than an absent capability.

### What belongs in a capability negotiation matrix?

For each selected feature, record source registration count, initialize advertisement, discovery response, operation response, application effects, and process state. Present tools need positive list and call checks, while absent prompts and resources need negative list and access checks. Every mismatch should identify the first disagreeing layer.

## Conclusion

MCP capability negotiation contract tests make server claims auditable across source, initialize output, discovery, and execution. QASkills passes when tools map to six working registrations, prompts and resources stay absent, and unsupported operations fail without hidden effects or process damage.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills in the [skills directory](/skills). Apply this capability matrix before the next MCP release, and use the [MCP testing guide](/blog/mcp-server-testing-guide-2026) when an intentionally added feature needs deeper coverage.`,
};
