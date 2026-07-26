import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP telemetry privacy control testing',
  description:
    'MCP telemetry privacy control testing with repository-backed tests, edge cases, CI checks, and clear failure signals for QA teams shipping MCP servers.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP telemetry privacy control testing',
  keywords: [
    'MCP telemetry privacy control testing',
    'DO_NOT_TRACK MCP server',
    'QASKILLS_TELEMETRY zero',
    'MCP install privacy test',
    'telemetry opt-out precedence',
    'offline skill installation',
  ],
  relatedSlugs: [
    'qaskills-cli-disable-telemetry-do-not-track',
    'qaskills-mcp-server-guide',
    'mcp-server-contract-testing-guide',
    'mcp-server-testing-guide-2026',
  ],
  sources: [
    'https://nodejs.org/api/process.html',
    'https://modelcontextprotocol.io/specification/2025-11-25/server/tools',
    'https://github.com/modelcontextprotocol/typescript-sdk',
  ],
  repoEvidence: ['packages/mcp/src/index.ts', 'packages/mcp/package.json'],
  content: `MCP telemetry privacy control testing must prove either valid opt-out key blocks the event while the local install still works. The key pass sign is an exact SKILL.md write with no event POST. A leaked POST or a lost local file breaks the rule, even when the tool claims success.

## What must MCP telemetry privacy control testing prove?

MCP telemetry privacy control testing must prove that \`DO_NOT_TRACK=1\` or \`QASKILLS_TELEMETRY=0\` suppresses tracking without suppressing installation. The suite needs separate oracles for the required content download, local write, optional telemetry request, and final MCP result.

Privacy here concerns the install event only. The tool still downloads skill content from the configured API, so opting out does not promise an entirely network-free operation.

The pass case has three facts the test can see. The content GET gives fixed Markdown, the local \`SKILL.md\` holds those bytes, and no POST hits the event route.

The negative case must detect both kinds of regression. One branch leaks a POST under an opt-out, while another mistakenly exits installation before the content fetch or filesystem write.

Test each key alone and both as a pair. One joined case cannot show which key was missed, typed wrong, or checked after the tracking call began.

Use the exact set values, not a broad true or false guess. Current code reads only \`1\` for \`DO_NOT_TRACK\` and only \`0\` for \`QASKILLS_TELEMETRY\`.

This is a repository contract, not a universal interpretation of every environment convention. The [Node.js process documentation](https://nodejs.org/api/process.html) confirms that environment entries are strings, which explains why exact string fixtures matter.

The [CLI opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track) gives nearby user context. Keep MCP checks tied to this server code, since one more package could read the same keys at a new point.

Each case should prove the end state and result as a pair. A file with no set pass text is not enough, and a pass text with no file is false.

## Which repository behavior defines the contract?

The production sequence is visible in \`packages/mcp/src/index.ts\`. The \`install_skill\` handler calls \`installSkill\`, which downloads content, resolves a target, creates a directory, writes \`SKILL.md\`, invokes \`trackInstall\`, and returns a success sentence.

Inside \`trackInstall\`, the first choice calls \`shouldTrackTelemetry\`. That check is true only when \`DO_NOT_TRACK\` is not \`1\` and \`QASKILLS_TELEMETRY\` is not \`0\`.

When either opt-out matches, \`trackInstall\` returns before constructing or sending its request. The content GET and file write already happened earlier in \`installSkill\`, which creates the key privacy boundary for tests.

When tracking remains enabled, the code sends a POST to \`/api/telemetry/install\`. Its JSON body includes skill slug, agent type, install type, package version, agent list, and action.

The install does not wait for the POST by design. Code catches a failed promise, so an event fault must not turn a good local install into an MCP error.

That fire-and-forget behavior changes test timing. A spy records the synchronous fetch invocation, but a rejection assertion may need one microtask turn before checking that no unhandled promise escaped.

The API base and package version are created from process state and \`packages/mcp/package.json\`. Load the module after setting each environment fixture so URLs and version-dependent payloads remain predictable.

The package file also sets Node 20 or newer and the MCP SDK link. Keep those facts in the fail log when local and CI runs do not match.

The [MCP tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) explains the tool result boundary, while the [TypeScript SDK repository](https://github.com/modelcontextprotocol/typescript-sdk) supplies the registration implementation. Neither source overrides the QASkills privacy predicate, which remains a repository-owned rule.

MCP telemetry privacy control testing should check order as well as counts. A POST spy called before \`writeFile\` would break the current flow even if both calls later end well.

## How should QA teams test DO_NOT_TRACK MCP server?

A DO_NOT_TRACK MCP server case should set one clean process environment, load the registration, and invoke \`install_skill\` through its captured handler. It should not call a copied privacy helper because that would only test the fixture's logic.

Mock the SDK so tool handlers are ready without stdio. Mock \`fetch\` by URL and method, give Markdown for the content GET, and reject each odd call.

Run the handler in a new test folder. Give a set target path for the main cases, then add one default path case to check how the project folder is picked.

The primary fixture sets \`DO_NOT_TRACK\` to \`1\` and removes \`QASKILLS_TELEMETRY\`. After invocation, assert one content GET, zero telemetry POST calls, one exact file, and one non-error MCP text result.

The next test swaps the values. Remove \`DO_NOT_TRACK\`, set \`QASKILLS_TELEMETRY\` to \`0\`, and demand the same facts with a fresh call log.

The joined test sets both opt-outs. It guards against a bad AND rule or an order rule that can turn the POST back on.

Restore environment entries after every test, including cases that throw. Assigning \`undefined\` through an unsafe helper can produce the literal string \`undefined\`, so prefer deletion for absent variables.

Also restore the work path and global fetch ref. An env leak can make a later on case look opted out, while a fetch leak can let the test call a live route.

Do not claim the content GET goes away. The tool needs Markdown to add a new skill, and the current opt-out keys gate only the event call.

Use the [QASkills MCP guide](/blog/qaskills-mcp-server-guide) for hand-run setup, then keep test checks in their own process state. This split stops user setup tips from turning into a false product claim.

MCP telemetry privacy control testing passes only after the test reads the installed file. Call counts alone cannot prove the opt-out branch kept the local install whole.

## Test matrix for QASKILLS_TELEMETRY zero

The QASKILLS_TELEMETRY zero matrix should cover supported opt-outs, nearby unsupported strings, enabled defaults, and tracking failures. Each row needs exact request and filesystem expectations instead of a generic success flag.

Keep content and target inputs the same across env rows. That rule proves a changed result came from the keys, not a new skill body or path.

| Case or condition | Fixture or input | Expected observation | Failure signal | Repository or specification source |
|---|---|---|---|---|
| DO_NOT_TRACK opt-out | \`DO_NOT_TRACK=1\` | Content GET and file write occur; telemetry POST does not | POST reaches telemetry route | \`packages/mcp/src/index.ts\` |
| QASkills opt-out | \`QASKILLS_TELEMETRY=0\` | Same local install with no telemetry POST | File is absent or POST occurs | \`packages/mcp/src/index.ts\` |
| Both controls | Both supported values | One local install and no event | Either variable is ignored | \`packages/mcp/src/index.ts\` |
| Default enabled | Both variables absent | Content GET, file write, and one telemetry POST | Event is silently suppressed | \`packages/mcp/src/index.ts\` |
| Nearby DO_NOT_TRACK value | \`DO_NOT_TRACK=true\` | Current code treats tracking as enabled | Test invents broad truthiness | Node process environment |
| Nearby telemetry value | \`QASKILLS_TELEMETRY=false\` | Current code treats tracking as enabled | Fixture assumes all false strings opt out | \`packages/mcp/src/index.ts\` |
| Tracking rejection | Enabled POST rejects | Local install still returns success | Telemetry outage blocks install | \`packages/mcp/src/index.ts\` |
| Content rejection | Opt-out set but GET rejects | Error result and no file or telemetry POST | Privacy branch hides download error | \`packages/mcp/src/index.ts\` |

The near-value rows record live code; they do not tell users what to set. They show the exact rule and stop test helpers from taking more values than source.

The on row matters as much as opt-out rows. If tests check only no POST, a bug that turns all events off would pass while it changes the default.

The tracking-rejection row proves privacy logic remains decoupled from installation reliability. Because the POST promise is handled internally, the local success should remain exact after a rejected tracking request.

The failed-content row proves opt-out does not hide all faults. The handler should return an MCP error, leave no file, and never try the event POST since the flow did not reach it.

Save full request bodies only from fixed test data. For normal fail logs, keep route, method, and safe fields so CI logs do not hold unknown text.

Use one table for source and built package tests. A diff then points to the build or run state, not to two sets of test rules.

MCP telemetry privacy control testing should show the env pair in each test name. A failed row then makes sense without a dump of the whole process env.

## What failures expose MCP install privacy test?

An MCP install privacy test fails when an opt-out still permits the event, or when privacy blocks the local operation. It must also fail if a POST starts before the predicate is evaluated and is merely ignored afterward.

The best leak check filters saved fetch calls by path and method. Expect no POST to \`/api/telemetry/install\` for each valid opt-out pair.

Do not call all fetch calls leaks. The content route needs one GET, so group web calls first and print odd methods or paths in the fail log.

The local file check reads \`SKILL.md\` after the handler ends. Match fixed text, full path, and pass result so an empty shell file cannot make the test pass.

Use a spy that throws if the event fetch starts under an opt-out. The handler should never see that throw since \`trackInstall\` must return before the web helper runs.

Then flip the guard for an on case. Let the event POST fail in the next task and prove the handler still reports install success after the file write.

The first code example executes the exact environment matrix around a captured production handler. It treats module loading and cleanup as part of the test boundary.

\`\`\`typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

describe.each([
  ['DO_NOT_TRACK', { DO_NOT_TRACK: '1' }],
  ['QASKILLS_TELEMETRY', { QASKILLS_TELEMETRY: '0' }],
  ['both', { DO_NOT_TRACK: '1', QASKILLS_TELEMETRY: '0' }],
])('%s privacy control', (_name, environment) => {
  it('writes SKILL.md without posting telemetry', async () => {
    applyEnvironment(environment);
    const tools = await captureRegisteredTools();
    const install = tools.get('install_skill')!;

    const result = await install.handler({
      slug: 'api-checks',
      targetDir: '.agents/skills',
      agent: 'codex',
    });

    expect(await readInstalledSkill('api-checks')).toBe(skillMarkdown);
    expect(contentRequests()).toHaveLength(1);
    expect(telemetryRequests()).toEqual([]);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Installed api-checks');
  });
});
\`\`\`

The helper should delete each opt-out key before it sets a row. A parent process may have a hidden global opt-out that would make the on checks false.

The second sample proves an event fault cannot roll back or mask the done write. It also checks that the POST starts after the file write.

\`\`\`typescript
it('keeps installation successful when enabled telemetry rejects', async () => {
  const events: string[] = [];
  writeFileSpy.mockImplementation(async (file, value) => {
    events.push('write');
    await realWriteFile(file, value, 'utf8');
  });
  fetchMock.mockImplementation(async (url, init) => {
    if (String(url).endsWith('/api/telemetry/install')) {
      events.push('telemetry');
      throw new Error('tracking unavailable');
    }
    return new Response(skillMarkdown, { status: 200 });
  });

  const result = await invokeInstall();
  await Promise.resolve();

  expect(events).toEqual(['write', 'telemetry']);
  expect(await readInstalledSkill('api-checks')).toBe(skillMarkdown);
  expect(result.isError).toBeUndefined();
});
\`\`\`

This case should not check for a console note since live code catches the fail with no log. A log check would claim an act that is not in the repo.

## CI coverage for telemetry opt-out precedence

Telemetry opt-out precedence should be tested in isolated module loads, not one mutable shared process. A test runner that caches the server can preserve registrations and captured values across environment rows.

Use one worker per row or reset the code graph first. Set the API base to a fake host and fail each web call that has no set reply.

Run the set values on each pull request that changes MCP source or package data. Include near but wrong values in the same suite since they show exact string checks.

Set short test times so a real web call fails fast. Opt-out cases should not wait for the live ten-second stop since each allowed call gets a fast fake reply.

Record request method, pathname, chronological event label, target path, and file checksum on failure. Do not dump the entire inherited environment, which may contain credentials unrelated to the case.

The CI gate should block each event under an opt-out and each lost file after a good reply. It should also block false success after content faults and any POST fault that changes local success.

A changed event body in on mode belongs to its own body rule unless it changes opt-out choice. Keep this gate small so its fails point to stop and order bugs.

Run one built package smoke case after the source matrix. Check the build from \`packages/mcp/package.json\` so stale code cannot look like an opt-out bug.

The [getting started page](/getting-started) can guide a local rerun, while CI should use test folders and fake replies. Never need a team member's real project or account for this suite.

MCP telemetry privacy control testing should keep failed effect logs for a short time and drop good ones. The checks, not old install files, are the proof that must last.

## How should offline skill installation be asserted?

Offline skill installation must be defined precisely because the current tool still needs content. Privacy opt-out removes the telemetry POST, but it does not remove the API GET that supplies a new \`SKILL.md\`.

A fully disconnected first installation is therefore not a current repository guarantee. Tests should not claim it succeeds unless a controlled response cache or local source becomes part of production.

The useful offline-style case isolates tracking from installation. Serve content through an in-process fake, reject every telemetry route, and prove the local write and MCP result remain independent.

Name that test tracking-offline or event-host-down, not just offline. A clear name stops docs and help teams from promising new installs with no way to get skill text.

For a genuine no-network test, preloading a fake response is still network simulation, not product caching. Use it to make tests deterministic, but state what boundary the fake replaces.

Check exact order through short event tags. The set flow is content GET, folder make, file write, event choice, and returned pass text.

With an opt-out, the flow ends after the write with no event fetch. With tracking on and a failed POST, fetch starts after the write and its fault stays apart from the result.

Existence-only checks are weak here. A stale file from a prior run could make the case pass even though the new download and write never happened.

Start from an absent target, compare exact content, and include a unique marker in each fixture. The marker proves the file came from the current response rather than another matrix row.

Use [MCP integration details](/mcp) to show how the server finds the skill list. Keep the test check tied to live source order and valid opt-out values.

MCP telemetry privacy control testing should state its web edge in each offline report. That one line stops an event host fault from being sold as a full no-web install.

## Step-by-step test implementation

Build the tests around process state, request classification, and exact local outcomes. This sequence covers privacy without modifying production helpers for test convenience.

1. Read \`packages/mcp/src/index.ts\` and record the install, tracking, environment, and error sequence exactly as implemented.
2. Create fresh environment fixtures for each supported opt-out, both opt-outs together, default enabled mode, and nearby unsupported strings.
3. Capture the production handler, mock fetch by method and route, and run every case in a unique temporary project directory.
4. Execute the expected install path and assert the exact MCP result, content GET, SKILL.md bytes, and permitted telemetry count.
5. Reject content and telemetry requests separately, then assert error isolation, ordering, cleanup, and unchanged unrelated state.
6. Run the source and built-package suites in CI, retaining a redacted effect ledger only when an assertion fails.

Use a test helper that returns the handler result and seen effects. Keeping both in one value stops tests from checking just one half of the opt-out rule.

Reset modules after restoring environment state, not before. Otherwise, a queued import can read a temporary value while cleanup is already changing it.

Run test files one by one if they change \`process.cwd\` or global env keys. Tests that run at once need child processes so their state cannot mix.

Check the real target path before you remove the test root. A path bug could write somewhere else and make cleanup look good in the folder you had hoped to use.

Add the focused command next to other MCP checks and link fails to the [blog testing index](/blog). The command must run with no live API or event host keys.

## Failure triage and regression ownership

Start triage by splitting content GETs from event POSTs. An opt-out case with only the GET has the right safe-use act even if the install then fails for a different content cause.

If a POST appears under \`DO_NOT_TRACK=1\`, check exact string match and env cleanup. If only \`QASKILLS_TELEMETRY=0\` leaks, check that code branch and not the shared spy.

If both single-variable cases pass but their combined row fails, examine boolean composition or fixture application order. Neither value should override the other because each independently suppresses tracking.

If no POST occurs by default, first check parent process keys. Then check \`shouldTrackTelemetry\`, code cache, and if the handler reached \`trackInstall\` after its write.

If the file is gone under an opt-out, read the event log. No content GET points to an early return bug, while a GET then an error points to source or file code.

If a failed POST changes the MCP result, check promise code in \`trackInstall\`. The MCP package owns the split between that extra event and the needed local write.

If source passes and bundle fails, compare the built version, Node runtime, and mocked entry point. Packaging ownership should resolve stale or transformed code before the privacy expectations change.

If an odd route appears, send it to the helper that made the call. The web API owns the event route reply, but MCP owns if an opt-out calls that route at all.

The [skills directory](/skills) may serve a last smoke check, but it should not be the first fail check. Fixed test data shows opt-out choice with no skill list or host noise.

Close the bug only when the no-POST and install checks both pass. Muting the POST spy or weak file checks would keep half the bug in place.

## Frequently Asked Questions

### Which values disable telemetry for the MCP server?

Current repo code turns tracking off when \`DO_NOT_TRACK\` is the string \`1\` or \`QASKILLS_TELEMETRY\` is the string \`0\`. Tests should cover each value alone and as a pair. Near strings such as \`true\` or \`false\` do not match this rule now.

### Does a telemetry opt-out block skill installation?

No. The supported opt-out returns from tracking only after content has been downloaded and \`SKILL.md\` has been written. A complete test must assert both zero telemetry POST requests and exact local file content, because either observation alone proves only half the behavior.

### Is the MCP install fully offline after opting out?

No. Opting out suppresses the telemetry event, but a new installation still performs a content GET to obtain the skill text. A test may mock that request for isolation, yet it should call the case tracking-offline rather than promising a disconnected product feature.

### What happens when enabled telemetry is unavailable?

The tracking request is not awaited, and its rejected promise is caught by the tracking function. The local installation should therefore remain successful after the file write. Tests should allow one microtask turn, confirm no unhandled rejection, and verify the exact installed content and result.

### Why test both privacy variables together?

The combined row protects the boolean relationship between controls and catches accidental precedence rules. Each supported value must independently suppress telemetry, so providing both cannot re-enable it. Separate single-variable rows still remain necessary because one broken branch could hide behind the other in a combined-only test.

## Conclusion

MCP telemetry privacy control testing proves opt-out and install rules as one whole: set env values stop the event but keep the content GET, file write, and pass result. Clear web call groups stop a needed GET from being marked as a leak.

Review the [QASkills MCP integration](/mcp), then browse verified QA agent skills through the [skills directory](/skills). Recheck the [CLI opt-out guide](/blog/qaskills-cli-disable-telemetry-do-not-track) and [MCP guide](/blog/qaskills-mcp-server-guide) as this matrix gates the next release.`,
};
