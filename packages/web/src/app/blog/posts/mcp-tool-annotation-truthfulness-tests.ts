import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP tool annotation truthfulness tests',
  description:
    'MCP tool annotation truthfulness tests with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP tool annotation truthfulness tests',
  keywords: [
    'MCP tool annotation truthfulness tests',
    'MCP readOnlyHint verification',
    'MCP idempotentHint test',
    'destructiveHint contract',
    'tool side effect classification',
    'untrusted MCP annotations',
  ],
  relatedSlugs: [
    'mcp-server-contract-testing-guide',
    'agent-tool-use-regression-testing-guide-2026',
    'mcp-tool-poisoning-testing-guide-2026',
    'qaskills-mcp-server-guide',
  ],
  sources: [
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://github.com/modelcontextprotocol/typescript-sdk',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  content: `MCP tool annotation truthfulness tests must compare every declared hint with observed behavior at the API, network, and filesystem boundaries. A passing suite proves read-only tools never write and repeated installs keep the same intended state. Any hidden write, telemetry call, or changed repeat result disproves the annotation.

## What must MCP tool annotation truthfulness tests prove?

MCP tool annotation truthfulness tests must prove that each hint describes effects a client can observe, not merely developer intent. They should record reads, writes, deletions, network requests, and repeat outcomes for each registered tool.

The contract has two sides that must match. Tool search shows hints first, while the handler then makes the real effects that prove or disprove each claim.

A truthful read-only tool may call an API and return data, yet it must not alter remote or local state. A truthful write tool must advertise that possibility even when most calls happen to leave an existing file unchanged.

The repeat rule asks more than whether two text replies match. The same call with the same input should leave the same key state after the first good call.

The delete-risk hint asks if old data can be lost or replaced for good. A tool may replace its own file only when that clear write rule has passed review.

This scope excludes general MCP conformance, model planning quality, and user-interface approval prompts. The [MCP server contract testing guide](/blog/mcp-server-contract-testing-guide) covers those wider protocol checks without weakening this effect-focused oracle.

Use one pass check and one clear fail sign for each hint. No file change backs a read-only claim, while one odd write makes that claim fail at once.

The official [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) describes annotations as hints that clients must treat as untrusted unless the server is trusted. Tests should evaluate actual behavior independently from the advertised metadata.

## Which repository behavior defines the contract?

The production baseline lives in \`packages/mcp/src/index.ts\`, which creates the server and registers six tools. Five registrations declare \`readOnlyHint: true\`, while \`install_skill\` declares its write and repeat annotations.

Those five read tools are \`search_skills\`, \`get_skill\`, \`get_skill_content\`, \`list_categories\`, and \`get_leaderboard\`. Their handlers issue GET requests through shared helpers and convert responses into MCP text content.

No read handler calls \`mkdir\` or \`writeFile\` on its own. That source check helps, but a test must still spy on each file edge since a helper could add a hidden write.

The install path has a clear write role. It gets text, picks the set or found project path, builds the skill folder, makes that folder, and writes \`SKILL.md\`.

After the write, \`installSkill\` calls \`trackInstall\`. That code may send a POST, so the full effect log has one content GET, local file changes, and a possible event POST.

The package identity and SDK dependency are recorded in \`packages/mcp/package.json\`. This evidence matters when a dependency update changes registration types or annotation defaults without an obvious handler edit.

MCP tool annotation truthfulness tests should capture registration metadata and handler effects from the same loaded module. A copied tool list could remain green while production declarations drift.

The shared time limit adds a timer and stop signal to web calls. That work does not change product data, so keep it in its own class and do not mark each fetch as a delete risk.

Fail paths also belong in the effect log. A failed content GET must not make the target folder, while a failed write must not claim install success or a safe repeat.

The [TypeScript SDK repository](https://github.com/modelcontextprotocol/typescript-sdk) is the approved source for tool setup rules. Repo tests still own QASkills effects, since this code alone knows what each handler reads and writes.

## How should QA teams test MCP readOnlyHint verification?

MCP readOnlyHint verification should execute each read handler with deterministic responses while watching every mutable boundary. Success requires the expected MCP result, expected GET, and zero directory, file write, or telemetry POST calls.

Replace global \`fetch\` before the server code loads. The fake should log method, URL, body, headers, and signal while it gives each tool its set reply.

Mock the SDK server constructor so \`registerTool\` stores each name, options object, and handler. This observes the exact registration performed by production code without opening a stdio transport.

Use one temporary directory for each case and make it the process working directory. Snapshot its recursive file list and content hashes before execution, then compare those values after the handler settles.

The API request itself does not violate a read-only hint when it uses a retrieval route. Still assert the HTTP method, because a helper regression from GET to POST would change the tool's remote effect class.

For \`search_skills\`, verify normalized output and the absence of unlisted fields as a result check. For the other read tools, assert the exact text content or normalized JSON produced by their current handlers.

Run the same checks after a rejected API call. A read-only fail path must stay read-only, and the result should hold \`isError: true\` instead of throwing out of the tool test.

Do not just check that \`readOnlyHint\` exists. A hint-only check would pass if \`get_skill_content\` began to cache files, which is the kind of false claim this suite must catch.

Link this layer with [agent tool regression testing](/blog/agent-tool-use-regression-testing-guide-2026) when a client plans from tool hints. Keep the effect check fixed even if a higher test also uses a model.

MCP tool annotation truthfulness tests should fail with the tool name, hint claim, seen call, and first changed path. That log sends the owner to the wrong edge instead of a vague file diff.

## Test matrix for MCP idempotentHint test

An MCP idempotentHint test must check state after the first and second same calls. Two matching pass texts are not enough, since the calls could write new bytes or send web calls with new meaning.

Use fixed content and a clean set target folder. Hash the installed file after each call, log the file tree, and save both web call lists without clock data.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| Read-only positive | Valid search response | GET occurs and local snapshot stays equal | Any mkdir, write, delete, or POST | \`packages/mcp/src/index.ts\` |
| Read-only negative guard | Instrumented hidden write | Harness reports the changed path | Suite accepts metadata alone | MCP tools specification |
| Idempotent install | Same slug, target, and content twice | Final file bytes match first result | Second call produces different state | \`packages/mcp/src/index.ts\` |
| Changed source content | Same arguments, different API text | Final file follows second source response | Test wrongly calls inputs identical | \`packages/mcp/src/index.ts\` |
| Non-destructive replacement | Existing managed SKILL.md | Exact file is replaced without deleting neighbors | Neighbor file disappears | \`packages/mcp/src/index.ts\` |
| Telemetry observation | Tracking enabled for two installs | POST count is recorded separately from final state | Network effect is ignored | \`packages/mcp/src/index.ts\` |
| Failed download | Content GET rejects | No directory or file is created | Partial target remains | \`packages/mcp/src/index.ts\` |
| Failed write | Write rejects after mkdir | Error result is returned and no success is claimed | Handler reports installation | \`packages/mcp/src/index.ts\` |

The changed-source row is not a failed idempotency claim because the effective input changed outside the arguments. Record the response checksum so a reviewer can distinguish handler drift from upstream content drift.

Telemetry deserves an explicit decision. Repeated calls can preserve local state while producing repeated analytics events, so report state idempotency and external event repetition as separate observations.

The delete-risk class also needs files next to the target. Put an extra file there and prove it keeps the same bytes and mode through both calls.

Do not use times as the main check. File tools round times in many ways, while byte hashes and the file tree show the planned state with less doubt.

Repeat the failure cases as well as success. A second failed download must not leave a new partial path, and a retry after a failed write should either complete cleanly or return a stable error.

The table gives clear rules for MCP tool annotation truthfulness tests. Each row links one hint claim to a seen effect and one fail sign that must stop a release.

## What failures expose destructiveHint contract?

A destructiveHint contract fails when a call removes other state, cuts data outside its set target, or changes old text with no agreed write rule. It also fails when a risky path looks safe only because the test starts with no files.

Seed the target skill folder with a known \`SKILL.md\` and a nearby \`notes.txt\`. The install may replace its own file, but it must not touch the next file or remove the parent folder.

Put guard files outside the target folder to check path scope. If a bad slug gets out of its planned folder, the changed path log must show that write before cleanup can hide it.

Do not claim a safe path rule that live code does not give. Record which args work now, and send path escape risk to the [MCP tool poisoning guide](/blog/mcp-tool-poisoning-testing-guide-2026) for its own review.

Force each wait point to fail in turn. Reject content fetch, \`mkdir\`, and \`writeFile\`, then check the exact MCP error shape and each file left behind.

The current flow makes the folder before it tries the file write. A failed write may leave that folder empty, so record this fact rather than claim a full roll back.

That split keeps the test true to source. A full roll back can be a new code change, while this baseline test still tells what live code does now.

The first example saves tool setup and checks read acts with file spies. The helper names show a test rig around the package, not new live exports.

\`\`\`typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('MCP annotation effects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ skills: [], total: 0 }), { status: 200 }),
    );
  });

  it('keeps every declared read-only handler free from writes', async () => {
    const tools = await captureRegisteredTools();
    const readTools = [...tools.values()].filter(
      ({ options }) => options.annotations?.readOnlyHint === true,
    );

    for (const tool of readTools) {
      await tool.handler(validArgumentsFor(tool.name));
    }

    expect(mkdirSpy).not.toHaveBeenCalled();
    expect(writeFileSpy).not.toHaveBeenCalled();
    expect(observedPostRequests()).toEqual([]);
  });
});
\`\`\`

This test joins the hint claim with the edge log. If a read tool starts to write, one case shows both the claim and the spy call that proves it false.

The second example checks repeat state and nearby files. It also logs the event POST, so that web effect does not drop out of the report.

\`\`\`typescript
it('keeps repeated install state equivalent without deleting neighbors', async () => {
  const tools = await captureRegisteredTools();
  const install = tools.get('install_skill')!;
  await seedTarget({ 'notes.txt': 'keep this file' });

  const first = await install.handler({
    slug: 'api-checks',
    targetDir: '.agents/skills',
    agent: 'codex',
  });
  const firstSnapshot = await snapshotTree(testRoot);

  const second = await install.handler({
    slug: 'api-checks',
    targetDir: '.agents/skills',
    agent: 'codex',
  });
  const secondSnapshot = await snapshotTree(testRoot);

  expect(first.content[0].text).toContain('Installed api-checks');
  expect(second.content[0].text).toContain('Installed api-checks');
  expect(secondSnapshot.files).toEqual(firstSnapshot.files);
  expect(secondSnapshot.contents).toEqual(firstSnapshot.contents);
  expect(secondSnapshot.contents['notes.txt']).toBe('keep this file');
  expect(observedTelemetryRequests()).toHaveLength(2);
});
\`\`\`

Run this case once with event posts off when local file state is the sole risk. Run it again with posts on when the release rule also checks event acts and body data.

## CI coverage for tool side effect classification

Tool side effect classification should run in a process where network, environment, and filesystem access are controlled. A developer laptop can hide writes inside existing directories or allow an unexpected request to reach a real service.

Start CI in an empty test folder and deny each web call with no mock. Allow only fixed replies tied to the exact URL and method set for each handler.

The registration test should load one package version per process because module state, environment values, and mocked constructors can persist between cases. Reset modules if one runner must evaluate several configurations.

Set a short test time below the live web limit. A lost reply should fail this case fast, while a [separate contract test](/blog/mcp-server-contract-testing-guide) can check the ten-second rule.

Keep a short effect log for failed jobs. Add tool name, safe args, hint values, request methods and routes, changed paths, file hashes, and MCP error state.

Do not retain complete downloaded skills unless the fixture is public and reviewed. Hashes and short controlled samples usually provide enough proof without copying unknown content into build artifacts.

Block release on undeclared writes, deleted neighbors, changed repeat state, unexpected POST requests, or missing error results. A formatting difference in the ledger may remain diagnostic only when all contract assertions still pass.

Run the focused suite after changes to \`packages/mcp/src/index.ts\`, \`packages/mcp/package.json\`, or the SDK lock file. The [MCP overview](/mcp) shows the link point, but CI must run repo tests instead of doc samples.

Add one scheduled run against a built package artifact if source and bundle paths differ. That check catches bundling changes while keeping normal pull requests fast and isolated.

MCP tool annotation truthfulness tests should print one row for each seen tool in CI. A lost tool then stands out instead of making the suite grow small with no warning.

## How should untrusted MCP annotations be asserted?

Untrusted MCP annotations should be asserted as claims under test, never as permission to skip effect monitoring. The harness must observe each tool even when its metadata says read-only, non-destructive, or idempotent.

First, compare exact annotation objects by tool name. This catches removed hints, changed booleans, and SDK serialization drift before any handler is invoked.

Second, execute handlers and derive an independent effect summary. It should classify API methods, local writes, deletions, process events, and repeat-state changes without reading the annotation.

Third, compare the independent summary with the declared object. A read-only declaration permits retrieval requests but rejects writes, while an idempotent declaration requires an equivalent final state from identical effective inputs.

A check for mere presence misses false flags and extra effects. In the same way, a hint snapshot cannot find a helper that changed from a GET to an event POST.

Order matters when a call fails part way through. The content GET must end before folder work, and the file write must end before an event POST starts.

Assert absence with the same care as presence. Verify no write happened on a failed download, no telemetry started after a failed write, and no neighbor changed during a successful replacement.

Return values need exact structural checks. Read handlers should return one text content item, while caught failures should include \`isError: true\` and a useful error message.

Test client acts in a different suite. A client may still ask for consent on a safe write since the spec treats hints as claims, not as access guards.

Use the [skills directory](/skills) only to select a stable public slug for an optional staging smoke test. Unit and CI cases should use controlled response text, so catalog changes cannot alter the annotation oracle.

MCP tool annotation truthfulness tests become actionable when the comparison reports both sides. Print the declaration, independent effect class, first contradicting call, and repository owner in one failure record.

## Step-by-step test implementation

Implement the suite from production evidence outward rather than starting with expected snapshots. This order keeps assumptions visible and makes each fixture traceable to a current handler branch.

1. Read \`packages/mcp/src/index.ts\` and list every registered tool, annotation, helper call, and effect boundary.
2. Capture registrations by mocking the SDK server, then create isolated fixtures for read-only and repeated-install cases.
3. Spy on \`fetch\`, \`mkdir\`, and \`writeFile\`, and snapshot a new temporary project directory before each handler call.
4. Execute each expected path and assert its exact result, request method, changed files, and absence of unrelated effects.
5. Inject download, directory, and write failures, then compare repeat state and cleanup observations with the documented baseline.
6. Run the focused suite in CI, retain the effect ledger on failure, and assign each mismatch to its owning layer.

Keep fixture builders small and explicit. A generic response factory should still require status, body, method expectation, and route expectation for every case.

Reset env values and the process work path in \`afterEach\`. Leaked state can make later tools write in the wrong root or turn event posts off by mistake.

Use content hashes only after asserting exact controlled text at least once. Hash-only tests produce poor diffs when a fixture changes by one newline or encoding marker.

Pair the suite with [getting started guidance](/getting-started) when the team must rerun an install by hand. A hand check can shed light on a fail, but it cannot replace fixed edge spies.

The steps should end with a check of all six tool setups. A new tool must fail the full-list check until it has a hint class and at least one run case.

## Failure triage and regression ownership

Triage starts with the first clash in the effect log. If hints differ before a call, the MCP owner should check tool setup flags and SDK build.

If the hint matches but a new web method appears, check the helper and API route owner. A POST from a read tool is a web effect bug even when local files stay the same.

If only file state changes, check the set target, changed path list, and write order. The MCP package owns path choice and writes, while the caller owns a target it gave on purpose.

If repeat state differs, check the two content hashes first. New source text means the real input changed, while equal hashes point back to handler code or file facts.

If a failure appears only in the built artifact, route it to packaging and release ownership. Compare the version and SDK dependency from \`packages/mcp/package.json\` with the source job before changing assertions.

Protocol ownership applies when SDK behavior or annotation serialization changed. Keep a minimal reproduction against the approved SDK reference, then preserve the QASkills effect ledger as product evidence.

Environment ownership applies when a test writes outside its temporary root or contacts a live host. Fix isolation before interpreting later state, because contaminated observations cannot prove a tool contract.

The [blog index](/blog) can help locate adjacent regression guides, but each failure should link directly to its focused test. An owner needs the exact declaration, effect, and differing state rather than a broad category.

Close a bug only after pass, fail, and repeat cases all work. Fixing hint data alone or muting a spy would leave the false claim in place.

## Frequently Asked Questions

### How do tests verify readOnlyHint against real effects?

Capture the live tool setup, run its handler, and watch web methods, file writes, file loss, and process events on their own. The hint passes only when that log fits a read-only class. A hint snapshot alone cannot find a new helper write.

### What makes an MCP idempotentHint test reliable?

Use the same args and the same fake source reply, then check all key state after both calls. Check file bytes, file tree, next-door guard files, tool results, and web events as distinct facts. This stops like text or round times from hiding a changed result.

### Does destructiveHint false forbid every overwrite?

Not automatically. A reviewed operation may replace its managed target without deleting unrelated state, but the exact rule must be tested. Seed an existing target and neighboring files, execute the tool, and fail if content outside that narrow target changes or disappears.

### Why treat MCP annotations as untrusted?

The protocol treats these fields as plan hints, not as access guards, most of all for a server the client does not trust. Tests should build the effect log without those hints, then match both sides. This finds false claims and keeps safe-use choices apart from server data.

### Should telemetry count in tool side effect classification?

Yes, log the event POST as a web effect even when the installed file stays the same. Report local repeat state and repeat POST acts as two facts, since they answer two risks. Privacy tests may turn posts off, while hint tests should still show the on path.

## Conclusion

MCP tool annotation truthfulness tests link each shown hint to seen API, web, and file acts. They pass only when read tools do not write, install effects match the claim, and repeat calls keep the same planned state.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills in the [skills directory](/skills). Use the [MCP test guides](/blog) as you apply this effect matrix, and block each new tool until its hint and real acts agree.`,
};
