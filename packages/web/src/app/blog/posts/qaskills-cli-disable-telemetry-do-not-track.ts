import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Disable QASkills CLI Telemetry',
  description:
    'Disable QASkills CLI telemetry with DO_NOT_TRACK or QASKILLS_TELEMETRY, then test opt-out precedence, payloads, and non-blocking network errors.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'disable QASkills CLI telemetry',
  keywords: [
    'disable QASkills CLI telemetry',
    'DO_NOT_TRACK CLI',
    'QASKILLS_TELEMETRY environment variable',
    'telemetry opt-out precedence',
    'non-blocking telemetry failure',
    'install event payload',
    'CLI privacy test',
    'GitHub Actions telemetry opt-out',
  ],
  relatedSlugs: [
    'qaskills-cli-download-fallback-github-content-metadata',
    'qaskills-cli-extract-skill-package-github',
    'qaskills-add-custom-directory-ci',
    'qaskills-init-non-interactive-ci',
  ],
  sources: [
    'https://nodejs.org/api/environment_variables.html',
    'https://docs.github.com/en/actions/concepts/workflows-and-actions/variables',
    'https://nodejs.org/api/globals.html#fetch',
  ],
  content: `To disable QASkills CLI telemetry, set \`DO_NOT_TRACK=1\` or \`QASKILLS_TELEMETRY=0\` before a command, and the code will return before the event call. Tests should cover the exact opt-out text, default flow, payload shape, and rejected network promises for every run.

The policy in \`packages/cli/src/lib/telemetry.ts\` calls transport from \`api-client.ts\` unless one opt-out is active. An install from the [QA skill catalog](/skills), such as the verified [Playwright CLI skill](/skills/Pramod/playwright-cli), must never let that event decide command success.

## How Does DO_NOT_TRACK CLI Behavior Work?

DO_NOT_TRACK CLI behavior uses one exact check: \`isTelemetryEnabled\` returns false for \`process.env.DO_NOT_TRACK === '1'\`. It does not parse a bool, trim spaces, or treat other text as an opt-out.

Node gives \`process.env\` values as strings, as shown in its [environment variable guide](https://nodejs.org/api/environment_variables.html). The shell form \`DO_NOT_TRACK=1 qaskills add ...\` puts the right text in the child process.

Values such as \`true\`, \`yes\`, \`01\`, \`1 \`, and blank do not match, so telemetry stays on unless the other switch blocks it. Tests and docs should show the exact supported text instead of suggesting loose bool parsing.

\`\`\`typescript
function isTelemetryEnabled(): boolean {
  if (process.env.QASKILLS_TELEMETRY === '0') return false;
  if (process.env.DO_NOT_TRACK === '1') return false;
  return true;
}
\`\`\`

The helper is private, so test it through \`sendTelemetry\` by mocking \`trackInstall\` and setting one environment value. A zero call count proves the public gate without reaching into a private function.

Restore whether the variable was absent as well as its value. Assigning \`undefined\` can have surprising string behavior across Node versions and test utilities, so use \`delete process.env.DO_NOT_TRACK\` when the original was absent.

The project's [privacy page](/privacy) is the user-facing place to describe collection and opt-out behavior. Tests prove implementation; policy text explains purpose, retention, and contact details that source code alone cannot establish.

## What Does the QASKILLS_TELEMETRY Environment Variable Control?

The QASKILLS_TELEMETRY environment variable is a project switch whose exact value \`0\` blocks calls from \`sendTelemetry\`. Any other value keeps the default on unless \`DO_NOT_TRACK=1\`.

Set this variable for one command, one job step, or the whole process because it is read on each \`sendTelemetry\` call. A test can change it between calls without a module reset.

Use an explicit command assignment when a developer wants one local operation:

\`\`\`bash
QASKILLS_TELEMETRY=0 npx qaskills add playwright-cli \
  --agent universal \
  --dir .artifacts/qaskills
\`\`\`

Use a job-level or step-level environment value in CI. Do not place the setting in source code as a fake environment fallback, because users and administrators need to control it outside the built package.

The switch covers install, remove, and update events, but it does not block registry calls used to find or fetch a skill. A test that expects all web calls to stop would mix event policy with the main product flow.

The [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) covers another client, while this article stays with the CLI and its two exact switches. Each package needs its own tests when it has its own event code.

When teams disable QASkills CLI telemetry, the install files and status must stay the same in both on and off command tests. Only the call to \`trackInstall\` should differ.

## Define Telemetry Opt-Out Precedence

Telemetry opt-out precedence is simple because either switch wins, with \`QASKILLS_TELEMETRY=0\` checked before \`DO_NOT_TRACK=1\`. A match returns false, and the order has no visible conflict when both switches ask to stop.

Mixed values still need tests because \`QASKILLS_TELEMETRY=1\` cannot beat \`DO_NOT_TRACK=1\`, and \`DO_NOT_TRACK=0\` cannot beat \`QASKILLS_TELEMETRY=0\`. A valid stop value always wins over text that only looks like an enable value.

Use a table rather than separate ad hoc tests:

| QASKILLS_TELEMETRY | DO_NOT_TRACK | Transport expected | Reason |
|---|---|---:|---|
| absent | absent | yes | Default enabled |
| \`0\` | absent | no | Project opt-out |
| absent | \`1\` | no | Cross-tool opt-out |
| \`0\` | \`1\` | no | Both opt out |
| \`1\` | \`1\` | no | DO_NOT_TRACK wins |
| \`0\` | \`0\` | no | QASkills variable wins |
| \`false\` | \`true\` | yes | Values do not match |
| empty | empty | yes | Values do not match |

The word "precedence" does not imply a clear enable switch because code has two stop checks and a default \`true\`. \`QASKILLS_TELEMETRY=1\` merely fails to stop and cannot beat a valid DO_NOT_TRACK opt-out.

Test each row with fresh env state and a reset mock, since process-wide changes can leak when cases run at the same time. Use a serial suite or one child process per environment row.

The [agent skill security checklist](/blog/agent-skill-security-review-checklist) can help review other data flows around downloaded instructions. Telemetry tests should remain focused on event gating and transport isolation.

## Why Must Non-Blocking Telemetry Failure Stay Silent?

A non-blocking telemetry failure must not fail a good install, update, or removal, so the exported function returns \`void\` after it starts \`trackInstall\`. Its catch handler then consumes a rejected promise from that side task.

The API client uses \`fetch\`, an \`AbortController\`, and a ten-second limit from Node's global [fetch API](https://nodejs.org/api/globals.html#fetch). HTTP faults and failed requests reject \`trackInstall\`, and the event catch consumes that result.

Test asynchronous rejection, not only a resolved mock:

\`\`\`typescript
vi.mock('./api-client.js', () => ({
  trackInstall: vi.fn(),
}));

it('does not throw when telemetry transport rejects', async () => {
  vi.mocked(trackInstall).mockRejectedValueOnce(new Error('network unavailable'));

  expect(() =>
    sendTelemetry({
      skillId: 'playwright-cli',
      skillSlug: 'playwright-cli',
      action: 'install',
      agents: ['universal'],
    }),
  ).not.toThrow();

  await Promise.resolve();
  expect(trackInstall).toHaveBeenCalledTimes(1);
});
\`\`\`

The microtask wait lets the catch run before the test ends, while an unhandled rejection guard belongs only in an isolated case. The caller should get no thrown error, and command status should still come from the main action.

Current code assumes \`trackInstall\` returns a promise, so a mock that throws at once would escape before \`.catch\` is attached. The real \`trackInstall\` is async, so fetch and HTTP faults reject its promise. Do not claim that all sync defects are swallowed.

Also test a pending promise because \`sendTelemetry\` must return at once without waiting for it. Use a controlled promise and prove the return comes before its result. Avoid exact timing checks, which can make tests flaky.

The [error handling testing guide](/blog/error-handling-testing-patterns) offers wider failure patterns. Here, silence means no user-facing failure and no status change; it should not prevent internal diagnostics from being added later under an explicit debug mode.

## Verify the Install Event Payload

The install event payload contains \`skillId\`, optional \`skillSlug\`, \`action\`, \`agents\`, and \`cliVersion\`. \`sendTelemetry\` accepts the first four fields and adds \`CLI_VERSION\` before calling the API client.

For a registry install, the add command sets \`skillId\` to the name and \`skillSlug\` to the requested registry slug. Direct GitHub and local installs omit \`skillSlug\`, while selected agent IDs come from each chosen agent definition.

Actions are limited by the TypeScript type to \`install\`, \`remove\`, and \`update\`. Runtime tests should still inspect serialized JSON at the API boundary because TypeScript types disappear after compilation.

\`\`\`typescript
it('adds the CLI version to the install event payload', () => {
  sendTelemetry({
    skillId: 'playwright-cli',
    skillSlug: 'playwright-cli',
    action: 'install',
    agents: ['universal'],
  });

  expect(trackInstall).toHaveBeenCalledWith({
    skillId: 'playwright-cli',
    skillSlug: 'playwright-cli',
    action: 'install',
    agents: ['universal'],
    cliVersion: CLI_VERSION,
  });
});
\`\`\`

Do not assert a hard-coded version unless the test specifically validates release packaging. Import \`CLI_VERSION\` from the same shared package to prove injection while allowing planned version updates.

At the transport layer, mock fetch and parse \`RequestInit.body\` to check exact JSON, POST, and the \`/api/telemetry/install\` path. Avoid checks on other default headers unless they belong to the stated API contract.

The payload has no email, account ID, file path, test text, or SKILL.md body, but that code fact cannot answer every privacy question. Keep broader claims in line with the [QASkills privacy policy](/privacy), since web services can also process link data.

## Build a CLI Privacy Test Matrix

A CLI privacy test should prove opt-out gating, payload minimization, and main-command independence. Split these concerns so one failure explains whether the problem is policy, shape, or control flow.

Use the environment matrix for gating and one enabled test for exact payload fields. Add rejected and pending transport cases for non-blocking flow. Finally, run an add command with telemetry off and check the installed file.

| Test layer | Controlled boundary | Required evidence |
|---|---|---|
| Unit | Environment plus mocked \`trackInstall\` | Opt-out rows call zero times |
| Unit | Mocked \`trackInstall\` | Exact supported event fields |
| Unit | Rejected transport promise | No synchronous error or unhandled rejection |
| Integration | Mocked fetch | POST path and JSON body |
| Command | Local skill fixture | Same files and status with opt-out |

Save and restore both environment values around each case, and reset the transport mock at the same boundary. One module instance is enough because \`sendTelemetry\` reads values at call time, but parallel cases must not mix process-wide state.

For the command test, use a local skill source so registry availability cannot influence privacy proof. Install into a temporary directory with the [custom qaskills directory workflow](/blog/qaskills-add-custom-directory-ci), then compare a file checksum with telemetry on and off.

Do not inspect live event storage in unit tests because server shape, time rules, and totals need API and database tests. The CLI test proves only what the client sends or blocks.

If a future field is added, the exact-payload test should fail and force a privacy review. Update code, policy, server validation, and test expectations in the same change rather than treating field growth as a harmless snapshot update.

## Set GitHub Actions Telemetry Opt-Out

A GitHub Actions telemetry opt-out can be scoped to one step, one job, or the workflow. GitHub explains how variables and environment values are available to workflow steps in its [workflow variables guide](https://docs.github.com/en/actions/concepts/workflows-and-actions/variables).

Use a quoted string so YAML does not coerce the value:

\`\`\`yaml
jobs:
  verify-skill:
    runs-on: ubuntu-latest
    env:
      QASKILLS_TELEMETRY: '0'
      DO_NOT_TRACK: '1'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install a controlled QA skill
        run: |
          npx qaskills@<pinned-version> add playwright-cli \
            --agent universal \
            --dir "$RUNNER_TEMP/qaskills"

      - name: Verify the artifact
        run: test -s "$RUNNER_TEMP/qaskills/playwright-cli/SKILL.md"
\`\`\`

One supported variable is enough to disable QASkills CLI telemetry. Setting both can express an organization-wide policy plus a tool-specific policy, and the matrix proves either one remains effective if the other changes.

Do not store opt-out values as secrets because they are policy flags, not keys. A visible workflow value is easy to audit. Repo or group variables can share that policy across many CLI jobs.

Add a source-level test instead of trying to prove no public request from each workflow run. Packet checks can be noisy and tied to one host, while the unit matrix proves the transport gets no opt-out call.

The [Playwright CLI skill page](/skills/Pramod/playwright-cli) remains available through normal registry delivery because the opt-out does not disable catalog traffic. Verify artifact success in the same job to prevent privacy settings from being blamed for an unrelated download problem.

## Run the Verification Procedure

Run the verification procedure from pure policy checks to a built command. This produces fast failures before process and filesystem setup.

1. Save the original presence and value of both telemetry environment variables.
2. Run every opt-out matrix row with a reset \`trackInstall\` mock.
3. Require zero transport calls for either supported disable value.
4. Run the default-enabled case and compare the complete install event payload.
5. Reject the transport promise and prove \`sendTelemetry\` returns without throwing.
6. Hold a deferred transport promise and prove the function does not await it.
7. Run a built CLI command against a local skill with opt-out enabled.
8. Compare status and installed files with an enabled control run.
9. Restore environment state, globals, mocks, and temporary directories.

Use a child process for command comparison so each run receives a private environment. Remove inherited opt-out variables from the enabled control, then add one exact value to the disabled run. This avoids developer shell settings changing test expectations.

Capture server requests with a local HTTP endpoint only for the enabled transport test. For disabled cases, the mocked client should remain a stronger assertion because no connection should start.

Run these checks in the CLI package gate after shared code builds. The [QASkills directory](/skills) can support a separate live smoke lane, but privacy policy should not depend on a public endpoint being reachable.

Start the unit suite with both variables absent and one resolved transport promise. This control proves the mock works before any case tries to block its call.

Save whether each key existed, not just its old string value. Restore an absent key with \`delete\` so the next case sees the same process state.

Run environment rows in serial order because \`process.env\` belongs to the whole process. Parallel workers may use separate processes, but tests in one worker can still clash.

The phrase disable QASkills CLI telemetry should appear in test names for the two supported values. Clear names help a reviewer find privacy checks when environment code changes.

Use one test for \`QASKILLS_TELEMETRY=0\` and one for \`DO_NOT_TRACK=1\` before the full matrix. These direct cases give a fast cause when a broad table row fails.

Then run mixed values to prove a valid opt-out cannot be canceled. Keep expected calls as simple zero or one values and reset the mock for every row.

For malformed values, pick a few clear strings rather than a vast fuzz set. The current rule is exact text, so \`true\`, \`false\`, and blank show the key point.

A future parser may accept more forms, but that change needs docs and tests in one patch. Do not widen expected behavior only inside a test helper.

The transport module reads \`QASKILLS_API_URL\` when it loads, unlike the telemetry gates read at send time. Set the local server URL before import or reset that module for an HTTP integration case.

This import timing belongs in the test setup, not in the user opt-out contract. A missed reset can send an enabled test to the public host and create a poor privacy check.

Bind the local server to a random free port and record each request body. Close it in a final hook, even when the payload assertion fails.

The server can reply with 204 only if the client does not always parse JSON. Current request code parses JSON on success, so use a small JSON body for a safe transport test.

Return a 500 response in a second case and let \`trackInstall\` reject. The send wrapper should consume that promise rejection while the main command keeps its own result.

Also close the socket before one request to model a refused connection. This proves disable QASkills CLI telemetry is not the only way the command avoids transport-led failure.

Use fake time only for the API client's ten-second abort test. The basic telemetry suite needs no wait, and real long waits would slow every CLI change.

The pending-promise case should resolve in cleanup after the immediate return assertion. Leaving a promise open can keep handles alive or blur test end state.

Check each install event payload as plain parsed JSON, not a raw string with field order. JSON object order is not part of the event contract.

Require the exact allowed keys so a new field triggers review. Compare values with the input event and compare \`cliVersion\` with the shared constant.

Add separate payload cases for install, remove, and update actions. They can share one table because each action uses the same transport shape.

For a local source install, assert that \`skillSlug\` is absent rather than set to undefined in JSON. For a registry source, assert that it matches the requested slug.

Agent IDs should be a plain array in selection order. Do not treat display names, file paths, or config folder names as accepted payload fields.

The CLI privacy test can scan the serialized body for a known fixture path and secret marker. Neither value should appear because the event type has no such field.

Keep this scan as a guard around test data, not a claim about all network metadata. The [privacy policy](/privacy) remains the source for broader service use and retention.

Run one local install twice, once with default telemetry and once with an opt-out. Hash the copied SKILL.md and require the same bytes in both runs.

Use [qaskills add --dir in CI](/blog/qaskills-add-custom-directory-ci) to keep those two destinations inside separate temp roots. Separate roots stop stale output from hiding a failed second copy.

The enabled run should point transport at the local stub, while the disabled run should make no request. Both commands should exit zero and create the same file list.

To disable QASkills CLI telemetry in a child process, add one exact key to a copied environment object. Do not mutate the parent test process for command-level cases.

For the enabled child, remove inherited \`DO_NOT_TRACK\` and \`QASKILLS_TELEMETRY\` keys. A developer shell opt-out should not turn the control row into an unseen disabled run.

Capture request count at the server and command status at the child. These facts prove privacy gating and install independence without parsing spinner text.

The CLI starts telemetry after the main file work and does not await the promise. A very short child process may exit before the local server receives a default-enabled event.

Therefore, use direct function integration for guaranteed payload delivery and command integration for artifact independence. Do not require one fire-and-forget packet from every short child run.

When testing a rejected promise, wait one or two microtasks before ending the case. This gives the attached catch handler time to consume rejection under the test runner.

Add a process-level unhandled rejection check only in an isolated child. A global listener inside the main test worker can intercept errors from unrelated tests.

The phrase disable QASkills CLI telemetry names an opt-out, not a promise that no other request occurs. Registry search, metadata, content, and clone paths still serve the command.

Use a local source when the privacy test needs zero product network calls. This leaves telemetry as the only mocked or local network path in the case.

Review the matrix when new commands call \`sendTelemetry\`. Add the action and payload source while keeping the same opt-out and non-blocking rules.

If a new package implements its own telemetry helper, do not assume the CLI matrix covers it. Share policy where practical, then test each exported call at its package boundary.

To disable QASkills CLI telemetry across a repository, set one supported value at job or workflow scope. Keep the visible policy near commands that install or update skills.

End each run by restoring modules, globals, environment, server, and temp folders. Clean state is part of a useful privacy test because one leaked mock can hide a real call.

## Document the Default Clearly

Teams should disable QASkills CLI telemetry with an exact supported value and verify that event transport is never called. \`DO_NOT_TRACK=1\` and \`QASKILLS_TELEMETRY=0\` are equivalent opt-outs for current CLI behavior. Other strings do not disable collection.

Tests must also protect the main command. A rejected telemetry promise is consumed, a pending promise is not awaited, and installation status comes from source and filesystem work. Keep synchronous programming defects visible rather than broadly catching every possible exception.

Publish the exact switches on the [privacy page](/privacy), keep a deterministic matrix beside the CLI code, and verify one real artifact from [QASkills](/skills). The [Playwright CLI skill](/skills/Pramod/playwright-cli) provides a clear installation example without changing the privacy contract.

## Frequently Asked Questions

### Which value disables telemetry through DO_NOT_TRACK?

Only the exact string \`1\` disables it in current code. Values such as \`true\`, \`yes\`, or \`01\` do not match. Set \`DO_NOT_TRACK=1\` in the command, job, or process environment and test through \`sendTelemetry\` that the transport receives no call there.

### Which value disables QASKILLS_TELEMETRY?

Set the exact string \`0\`. The function compares \`process.env.QASKILLS_TELEMETRY === '0'\` at send time. Other values leave the default enabled unless \`DO_NOT_TRACK=1\` is also present. Quote the value in YAML to preserve it as a string in each CI job.

### Does the opt-out stop skill downloads?

No. It stops the telemetry call made after install, update, or removal logic. Registry metadata, content downloads, and direct GitHub operations still use their normal network paths. Command tests should verify that the requested skill artifact remains identical with telemetry enabled and disabled.

### What happens if the telemetry endpoint is unavailable?

The async \`trackInstall\` promise rejects, and \`sendTelemetry\` attaches a catch handler that consumes that rejection. The function returns without awaiting transport, so the main command continues. Test this with a rejected promise and confirm installation status remains tied to the requested operation.

### What fields are sent for a registry install?

The client sends skill ID, optional skill slug, action, selected agent IDs, and CLI version. For registry add, the resolved name is also supplied as the slug. The payload does not include SKILL.md content, local destination paths, email addresses, or an explicit account identifier.

### Should tests mutate process.env concurrently?

No. Environment variables are process-global state. Run the matrix serially, restore absent values with \`delete\`, or spawn child processes with isolated environment objects. Parallel mutation can make an enabled row observe another test's opt-out and produce misleading results for the whole suite.`,
};
