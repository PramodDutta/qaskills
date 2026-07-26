import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright MCP Session Replay Validation',
  description:
    'playwright mcp session replay validation: prove saved MCP sessions replay without stale state. Use repo evidence, failure checks, and CI-safe QA steps.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Playwright MCP',
  primaryKeyword: 'playwright mcp session replay validation',
  keywords: [
    'playwright mcp session replay validation',
    'playwright mcp saved session',
    'replay mcp browser workflow',
    'validate agent browser session',
    'expired browser state replay',
    'stale refs saved session',
    'mcp session artifact test',
  ],
  relatedSlugs: [
    'playwright-mcp-profile-modes-guide-2026',
    'playwright-mcp-regression-testing-guide-2026',
    'playwright-mcp-accessibility-snapshots-reference',
    'playwright-mcp-browser-automation-guide',
  ],
  sources: [
    'https://playwright.dev/mcp/configuration/options',
    'https://playwright.dev/mcp/configuration/user-profile',
    'https://playwright.dev/mcp/snapshots',
    'https://github.com/microsoft/playwright-mcp',
  ],
  repoEvidence: [
    'packages/web/src/app/blog/posts/children-playwright-mcp-2026.ts',
    'seed-skills/playwright-cli/references/session-management.md',
  ],
  content: `Playwright MCP session replay validation restores only declared browser state, takes a fresh page snapshot, resolves new references, and then runs saved semantic steps. A replay must not reuse old snapshot refs or assume login remains valid. Test valid, expired, changed-page, and missing-artifact cases before calling the session repeatable.

## What Does Playwright MCP Session Replay Validation Control?

Playwright MCP session replay validation controls whether an agent workflow can start again from declared inputs and reach the same checked outcome. It separates saved browser state from live page observations.

A browser profile or storage file can preserve some state between runs and should have a clear owner, age, source, and safe path in the run plan. It may hold cookies, local storage, IndexedDB, cache, or other profile data based on the chosen mode.

A saved action plan is different and must show what the next run will read, use, check, and clean at each step. It should name semantic targets, ordered tools, expected outcomes, and required files without embedding temporary references from an old page snapshot.

The [Playwright MCP profile guide](https://playwright.dev/mcp/configuration/user-profile) describes persistent, isolated, and storage-state choices. The selected mode determines which browser state can exist when replay starts.

The [MCP options reference](https://playwright.dev/mcp/configuration/options) documents output and session controls such as output directories and saved session data. Saved output still needs a team-owned contract before it can become a release replay.

This workflow does not promise that old authentication remains valid. Server sessions can expire, accounts can change, and an identity provider can require a fresh login.

It also does not promise that old page references remain useful. Snapshot refs describe targets in an observed page state and must be resolved again after navigation or DOM change.

A replay must assert business results, not just tool success. A click call can complete while the wrong account, record, or page receives the action.

Use the [MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide) for the base tool flow. Add replay checks only after one clean live run has stable semantic steps.

The release rule is strict: restore declared state, reacquire observations, remap each target, run ordered actions, and verify final behavior with a plain pass or fail mark tied to the same run. Any hidden profile, old ref, or missing file should fail clearly.

Playwright MCP session replay validation produces a session ID, profile mode, fresh snapshots, resolved targets, action results, and a verdict. Those fields allow another reviewer to trace the replay boundary.

## How Does Playwright MCP Saved Session Work?

Playwright MCP saved session combines server output with an explicit replay manifest owned by the QA project. The output can aid diagnosis, while the manifest states what another run needs.

The manifest should include a schema version, session label, profile mode, start URL, semantic steps, required artifact checksums, and final assertions in a form that a peer can read line by line. It should not contain passwords or copied page refs.

Persistent profile mode can keep browser data across server restarts. Isolated mode starts fresh, and storage state can seed a clean context with a controlled subset of web state.

These modes are not interchangeable, and the run log must state which one was used before the first page was opened. A replay that passes only because a local persistent profile already holds login data has not proved that its declared inputs are sufficient.

The [official profile page](https://playwright.dev/mcp/configuration/user-profile) should define the selected startup rule. Record the resolved mode instead of inferring it from one client configuration file.

After startup, navigate to the planned entry page and call the snapshot tool, while the run log keeps the safe URL and time for that new view. The [MCP snapshot guide](https://playwright.dev/mcp/snapshots) explains the text form used to inspect page structure and choose targets.

Resolve each semantic target against that current snapshot and require one clear match before the next tool can act on the page. A step can name the account menu by role and label, while the new snapshot supplies the current ref used by the next tool call.

Take another snapshot after actions that change the page and save the new page path, step name, and view time in one short run row. Navigation, dialogs, rerenders, and list updates can invalidate the assumptions behind an earlier observation. The [snapshot guide](/blog/playwright-mcp-accessibility-snapshots-reference) shows how fresh page text can keep each role and name check tied to this run.

Observation answers what the current browser shows and which target ref exists now. Assertion answers whether the replay reached the expected identity, data, URL, or page state.

The [MCP profile modes guide](/blog/playwright-mcp-profile-modes-guide-2026) compares startup choices. Use one declared mode per replay case and include a clean-session control that removes undeclared state. Playwright MCP session replay validation works when the manifest guides a new live session rather than pretending the old page can be resumed byte for byte.

## Replay MCP Browser Workflow: Repository Evidence

Replay MCP browser workflow evidence begins in \`packages/web/src/app/blog/posts/children-playwright-mcp-2026.ts\`. That repository source documents configuration, profile modes, capabilities, output, session data, and snapshots.

Its configuration article states that Playwright MCP uses a persistent profile by default and offers isolated startup. It also describes storage state for a clean browser that needs controlled cookies and local storage.

The same source warns that headless display is not isolation. A replay record must store the actual profile mode, because changing only the display does not clear browser state.

The article describes \`--output-dir\` and \`--save-session\` as output controls. It also warns that output may contain URLs, page text, logs, images, and session material that need careful retention, while the [official Playwright MCP repository](https://github.com/microsoft/playwright-mcp) provides the reviewed server source.

Its capability section places snapshots in the core tool set. A replay can therefore reacquire current page structure without adding coordinate-based vision as a hidden dependency.

The second path, \`seed-skills/playwright-cli/references/session-management.md\`, covers named browser sessions, isolated cookie and storage state, persistent profiles, snapshots, closing, and data deletion. That file describes Playwright CLI rather than MCP, so its commands should not be copied as MCP tools. Its value here is the repository's operational model for naming, isolating, inspecting, and cleaning browser sessions.

Together, the paths support a clear test design. MCP configuration defines the server and output contract, while session guidance reinforces that state, snapshots, and cleanup need separate records.

The [MCP accessibility snapshot reference](/blog/playwright-mcp-accessibility-snapshots-reference) explains how semantic targets are read. Resolve by role, name, and nearby context instead of storing a raw ref as the target.

Repository evidence does not define a universal replay file format. The \`steps\` object in this article is a test harness contract, not an undocumented Playwright MCP API.

Playwright MCP session replay validation should label custom harness fields as project code. Official tool names, profile flags, and output behavior should stay tied to the approved source pages.

## When Should QA Teams Use Validate Agent Browser Session?

Validate agent browser session when a workflow must survive a server restart, another CI worker, or a later run with declared state. The task should have a stable start and a checked final result.

Good cases include a saved login fixture, a repeatable admin check, an agent regression path, or a recorded bug flow. Each case should identify which state may persist and which observations must be fresh.

Begin with a clean-session control. Remove the profile or load no storage state, then prove the workflow fails or enters the expected login path without its required declared input.

Use a persistent profile only when persistence is itself part of the contract. For CI, isolated mode plus a short-lived storage state often gives clearer ownership of start state.

Use a normal Playwright locator test when the workflow is stable and belongs in source code. MCP replay is useful for agent tool order and saved session checks, but it should not replace all maintained browser tests.

Use a new snapshot when the page changes. Do not add a wait and reuse an old ref, because time does not make a stale observation current again.

Use an artifact manifest when steps depend on uploads, downloads, test data, or generated files. The replay should check each required path and digest before it opens the browser.

Use a login recovery branch only when the product flow permits it. An expired-auth case should have an explicit expected outcome rather than silently logging in with an undeclared local profile.

The [MCP regression testing guide](/blog/playwright-mcp-regression-testing-guide-2026) helps move a checked agent flow into a repeatable test set. Keep manual exploration outside the release count.

Avoid replay for pages whose content and target names are not controlled. A live feed or third-party account can change enough that the same semantic outcome has no fixed oracle.

Playwright MCP session replay validation is appropriate when state, steps, artifacts, and assertions can all be declared. If one remains hidden, expose it before measuring replay success.

## Expired Browser State Replay: Failure Modes and Diagnostics

Expired browser state replay failures should stop at a named recovery boundary. A redirect to login is different from a stale ref, missing file, changed page, or failed product action.

A product fault exists when valid restored state and fresh targets lead to the wrong application result in the same clean run with all planned files at hand. Capture the checked identity and safe page state before assigning that class. A replay-harness fault exists when the manifest omits a file, resolves the wrong semantic target, skips a new snapshot, or accepts a failed tool response.

An environment limit exists when DNS, browser launch, output permissions, identity service, or test data is unavailable. Record that result without calling it an expired session.

The first common mistake assumes a profile directory means authentication is valid just because files still sit on disk from a past run. A cookie can exist after the server session has ended, so the page result must verify identity.

The second mistake stores snapshot refs in the replay file. A ref may no longer point to the same target after navigation, rerender, changed data, or a new browser process.

The third mistake omits upload or fixture files. The action plan then fails midway, even though the browser state restored as designed.

The fourth mistake lets a developer's default profile satisfy login. The replay passes locally but fails in isolated CI because its true input was never declared.

The fifth mistake records only the final tool error. Keep the last fresh snapshot, target query, resolved ref, action result, profile mode, and artifact check.

Use the [profile modes guide](/blog/playwright-mcp-profile-modes-guide-2026) to compare persistent and isolated failures. Change only the profile input while keeping the action plan and environment fixed.

Playwright MCP session replay validation diagnosis should map each failure to startup, observation, resolution, action, assertion, or cleanup. That stage label makes the next test specific.

## Stale Refs Saved Session: Evidence and CI Assertions

Stale refs saved session evidence must prove that every action used a ref from the current page state. Store the semantic target in the manifest and the resolved ref only in the run log.

For the valid case, restore the declared state, take a fresh snapshot, resolve each step, and reach the expected final identity plus page outcome. For expired auth, expect a login or session-expired signal. The replay should stop, mark the state invalid, and avoid acting on a public page with private-flow assumptions.

For a stale-ref control, inject an old ref into the harness and require rejection before the product action. This proves the runner does not trust serialized refs as current targets.

For a changed DOM, keep the semantic role and name while moving the target in a test page that the team owns and can reset. Fresh resolution should still find it, or fail with a clear missing or ambiguous target result.

For a missing artifact, remove one required file before startup. Validation should fail before browser actions and name the missing path without printing file contents.

Record session identifier, profile mode, manifest version, fresh snapshot ID, semantic query, resolved ref, action result, assertion, and replay verdict in one small row for each step. Add safe artifact digests.

CI should use a new output directory per run. Saved snapshots and logs from an older task must not satisfy current artifact checks.

Redact cookies, tokens, page secrets, and form values. The result needs identity labels and state classes, not credentials that can recreate the session.

The [skills catalog](/skills) can provide MCP review steps, while the project should own its replay schema and redaction rules. Keep those rules next to the harness. Playwright MCP session replay validation passes when all five cases end at their planned stage and the clean-session control cannot borrow state from another run.

## MCP Session Artifact Test Comparison Table

An MCP session artifact test should separate saved state, fresh observation, target mapping, and clean controls. Each option proves a different part of replay.

| Option or signal | Use when | Expected evidence | Main risk |
|---|---|---|---|
| Saved session state | Restore declared profile or storage inputs | Session ID, profile mode, identity check, and state source | Undeclared local state makes the run pass |
| Fresh snapshot | Observe the current page before an action | Snapshot ID, URL, page state, and semantic targets | An old observation is treated as current |
| Ref remapping | Bind each semantic target to a current ref | Target query, resolved ref, match count, and action result | Serialized refs point to changed elements |
| Clean-session control | Prove the manifest lists every required input | Empty profile, missing state result, and replay verdict | A shared profile or artifact leaks into the run |

Saved state starts the browser but does not prove the identity is accepted by the site or that the same test user still owns the live session. Add a visible account or controlled API check before private actions begin.

Fresh snapshots provide the evidence used by the next step. Take them after page-changing actions rather than once at the start of a long workflow.

Ref remapping keeps the replay semantic. If two targets match, stop and report ambiguity instead of selecting the first result by chance.

The clean control exposes hidden inputs. Delete or isolate profile data, move required artifacts, and verify the expected failure is clear and early.

All rows need retention and redaction rules. A technically useful session file can still be unsafe to upload when it contains auth or page data.

The [blog index](/blog) connects this matrix with MCP configuration and browser test design. Use those guides when startup or assertion policy needs a wider review.

Playwright MCP session replay validation should pass each row alone before combining them. A single end-to-end success can hide which state or ref actually made it work.

## How Do You Implement Playwright MCP Session Replay Validation?

Implement Playwright MCP session replay validation with a strict project manifest, preflight artifact checks, one declared profile mode, fresh snapshots, and semantic target resolution. Reject saved refs before any action.

1. Read \`packages/web/src/app/blog/posts/children-playwright-mcp-2026.ts\` and define the profile, output, capability, and saved-session boundaries.
2. Create a versioned replay manifest with semantic steps, required artifacts, start URL, profile mode, and final assertions.
3. Validate the manifest and artifact digests, start a clean MCP client, restore declared state, and verify the expected identity.
4. Take a fresh snapshot before each page-sensitive action, resolve a unique target, call the tool, and record its result.
5. Run valid, expired-auth, stale-ref, missing-artifact, and changed-DOM controls with explicit expected stages.
6. Redact output, remove temporary profile data, close the session, and repeat the same manifest under CI settings.

The first example validates a team-owned manifest before browser work. It rejects steps that contain a serialized ref and checks every required artifact by name.

\`\`\`typescript
type ReplayStep = {
  tool: string;
  target?: { role: string; name: string };
  savedRef?: string;
};

type ReplayManifest = {
  sessionId: string;
  profileMode: 'isolated' | 'persistent' | 'storage-state';
  steps: ReplayStep[];
  requiredArtifacts: string[];
};

function validateSession(replay: ReplayManifest): void {
  if (!replay.sessionId || replay.steps.length === 0) {
    throw new Error('Replay needs a session ID and at least one step');
  }
  if (replay.steps.some((step) => step.savedRef)) {
    throw new Error('Replay steps must resolve refs from a fresh snapshot');
  }
  for (const artifact of replay.requiredArtifacts) {
    assertArtifactExistsWithExpectedDigest(artifact);
  }
}
\`\`\`

This validator is project code and should stay next to its tests, schema notes, safe sample file, and small set of known bad cases. It does not claim that Playwright MCP exports a universal \`ReplayManifest\` type or a built-in semantic replay engine.

The second example shows a harness adapter calling MCP tools. The adapter shape depends on the chosen MCP client, but the order and evidence contract remain fixed.

\`\`\`typescript
async function replayStep(mcp: McpClient, step: ReplayStep) {
  const snapshot = await mcp.call('browser_snapshot', {});
  const ref = resolveUniqueSemanticTarget(snapshot, step.target);

  if (!ref) {
    throw new Error(\`Target was not resolved for \${step.tool}\`);
  }

  const result = await mcp.call(step.tool, { ref });
  return {
    snapshotId: snapshot.id,
    target: step.target,
    resolvedRef: ref,
    result: redactToolResult(result),
  };
}
\`\`\`

The code never writes \`resolvedRef\` back into the manifest. It may keep that value in the run log so a failed action can be tied to the snapshot that produced it.

Before startup, verify every required file and safe digest, then list each pass with the file name and no private file text. A missing upload should fail in preflight, not after login and several browser actions.

Start the server with the profile mode named in the manifest and save that mode beside the session ID before any page state can change. Capture resolved configuration when the enabled tools support it, and store only safe values.

For persistent mode, use a run-owned profile directory. A developer's daily browser data must never become an implicit CI fixture.

For storage state, create or fetch the short-lived file through the project's secure setup. Do not commit that file or print its cookies in replay output.

Navigate to the start URL and verify identity before private steps, with the shown account name and safe path kept as the first live state check. If the page redirects to login, classify expired auth and stop at that planned stage.

Take the first fresh snapshot only after startup navigation settles and mark it as new for this run, page, and point in the step list. Resolve targets by role, label, name, and nearby semantic context rather than by a copied ref.

Require one unique match. If the page has two Save buttons, add the dialog or region context instead of choosing the first result.

After navigation or a major rerender, take another snapshot. A current ref from the prior page should not cross that state change without fresh observation.

For the stale-ref control, add a forbidden \`savedRef\` field and assert preflight rejection. This is safer than sending an old ref and hoping the wrong action fails.

For changed DOM, alter layout while preserving the accessible target. The semantic resolver should find the new current ref and keep the action tied to user meaning.

For missing artifact, move one run-owned file and verify no browser tool executes, no page opens, and no old file from a past run fills the gap. Restore or recreate it only for the following valid case.

For expired auth, do not silently load another profile. Record the identity failure and the permitted recovery, such as refreshing test state in a separate setup step.

Keep action outputs small and place each safe fact on one short line that can be matched with the step that made it. Tool result status, safe URL, target label, and expected state are useful, while full page text can expose data and add noise.

Use the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli) for related session handling concepts. Do not mix CLI session commands into an MCP client transcript as if they were the same interface.

The [MCP regression testing guide](/blog/playwright-mcp-regression-testing-guide-2026) can help turn a successful replay into a maintained check. Pin the reviewed MCP package version and record it with the manifest.

Close pages, browser state, and the MCP client on every path, then mark each close in the log so a hung task has a clear last step. Delete run-owned persistent data after the clean control and retain only approved redacted artifacts.

CI should run the five cases in separate output folders with new names, blank start paths, and no shared file that can mask a missed setup step. A file from the valid case must not make the missing-artifact control pass.

Write the final result as startup, identity, snapshot, resolution, action, assertion, and cleanup stages, with one plain mark and one safe fact for each stage in the run. Each stage should be pass, planned failure, or unexpected failure. Playwright MCP session replay validation succeeds when a new run needs only the listed state and files, maps fresh refs, and reaches the checked business result.

## Frequently Asked Questions

### What is the safest way to use playwright mcp saved session?

Treat saved session output as sensitive evidence, not as a complete replay contract. Pair it with a versioned manifest that names profile mode, semantic steps, files, and assertions. Start from run-owned state, verify identity, take fresh snapshots, and redact all retained browser data.

### How do you verify replay mcp browser workflow?

Run the manifest in a new client and output folder, validate files first, restore only declared state, and check identity. Resolve every action from a fresh snapshot, then assert the final product result. A clean-session control should fail when its required state is intentionally absent.

### When should a QA team choose validate agent browser session?

Choose it for agent flows that must run after restart or on another worker with a fixed start and result. Prefer a source-controlled locator test for stable product regression alone. Use replay when tool order, saved state, artifacts, and semantic ref mapping are themselves under test.

### What causes failures in expired browser state replay?

Server expiry, changed accounts, wrong profile mode, hidden local state, missing storage files, and environment changes can all break startup. Check the restored identity before actions. Label login redirects as expired state, while keeping browser launch, DNS, and artifact faults in separate failure stages.

### Which evidence should stale refs saved session retain?

Retain session ID, profile mode, manifest version, fresh snapshot ID, semantic target, current resolved ref, tool result, assertion, and verdict. Do not store old refs in the manifest. Redact tokens, cookies, form secrets, and excess page text from every saved result.

### How should CI handle mcp session artifact test?

Use new profile and output paths per run, verify artifact digests before startup, and isolate valid, expired, stale-ref, missing-file, and changed-page cases. Pin the MCP version, close each client, delete temporary state, and upload only redacted stage records plus approved snapshots.

## Conclusion

Playwright MCP session replay validation is a declared-input test, not an attempt to freeze an old browser page. Restore approved state, verify identity, observe the current page, resolve new refs, and assert the final behavior.

Adoption needs the session ID, profile mode, manifest version, file checks, fresh snapshots, target mappings, action results, verdict, and cleanup. The clean-session and failure controls must stay independent.

Browse the [skills catalog](/skills), then open the [Playwright CLI Browser Automation skill](/skills/Pramod/playwright-cli). Install it and apply this focused verification workflow before treating saved agent work as replayable.`,
};
