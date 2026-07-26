import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills search offline error handling',
  description:
    'QASkills search offline error handling: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Guide',
  primaryKeyword: 'QASkills search offline error handling',
  keywords: [
    'QASkills search offline error handling',
    'qaskills search network error',
    'qaskills offline mode',
    'CLI fetch failure message',
    'search API unavailable handling',
    'local seed fallback mismatch',
    'offline CLI regression test',
  ],
  relatedSlugs: [
    'error-handling-testing-patterns',
    'skill-md-format-guide',
    'qaskills-add-custom-directory-ci',
    'typescript-testing-patterns-guide',
  ],
  repoEvidence: [
    'packages/cli/src/commands/search.ts#searchCommand',
    'packages/cli/src/lib/api-client.ts#request',
    'packages/cli/src/lib/api-client.ts#searchSkills',
    'packages/cli/e2e/e2e.mjs#runExpectFail',
  ],
  sources: [
    'https://fetch.spec.whatwg.org/',
    'https://nodejs.org/api/globals.html#fetch',
    'https://vitest.dev/guide/mocking.html',
  ],
  content: `QASkills search offline error handling catches any failure from the search request or result-rendering block. It stops the spinner, says the CLI could not reach qaskills.sh, claims local seed skills are being shown, then prints a connection hint. Current code does not actually render local seeds.

That behavior is defined in \`packages/cli/src/commands/search.ts\` and depends on \`packages/cli/src/lib/api-client.ts\`. This guide covers transport-failure messaging and the truth of its fallback claim. Successful empty searches and detailed non-2xx body formatting have separate contracts.

## What does QASkills search offline error handling guarantee?

QASkills search offline error handling guarantees a user-facing catch path rather than an offline result set. When any exception escapes the command's \`try\` block, the spinner stops with \`Search failed\`, an error line mentions qaskills.sh and local seed skills, and the outro asks the user to check the connection.

The catch clause does not inspect the error. A rejected fetch, ten-second abort, non-success HTTP response, invalid JSON, unexpected result shape, or rendering exception can all produce the same copy. Tests should describe this broad catch honestly.

The command does not call a seed loader in that branch. It does not import seed data, loop over fallback records, or print install commands after the error line. The phrase \`Showing local seed skills...\` is therefore not backed by current execution.

The branch also does not set \`process.exitCode\` or rethrow. Assuming Commander completes normally, an executable invocation can exit successfully even though no search result was delivered. Capture that status explicitly because scripts may treat zero as success.

The API helper creates an \`AbortController\`, schedules a ten-second abort, and clears the timer in \`finally\`. It builds search query values, sends the request, throws on non-success status, and parses JSON on success. Those transport facts explain how errors reach the command.

The [Fetch Standard](https://fetch.spec.whatwg.org/) defines network and response behavior, while repository evidence in \`packages/cli/src/commands/search.ts#searchCommand\` defines the user message. The [error handling guide](/blog/error-handling-testing-patterns) offers general patterns, but the mismatch here requires a specific assertion.

## How does qaskills search network error work?

A qaskills search network error begins when \`searchSkills\` cannot return a usable result. Native fetch rejects for connection-level problems and aborts. The request helper does not catch that rejection, but its \`finally\` block clears the timeout before control reaches the command.

The command starts an intro, collects a query if none was provided, creates a spinner, and enters its \`try\` block. It passes query, optional testing type, optional framework, and parsed result limit to \`searchSkills\`. The error branch begins only after the spinner has started.

If fetch rejects, the catch block ignores the original message. Users do not see DNS text, connection refusal, abort identity, URL, or timeout duration. They receive one stable pair of QASkills messages instead.

That replacement can be desirable for concise terminal output, but it reduces diagnostic precision. A regression test should assert both layers separately: the API client propagates the transport error, and the search command replaces it with its fixed copy.

A command-level fixture can mock the client rejection:

\`\`\`typescript
import { expect, it, vi } from 'vitest';
import { searchSkills } from '../src/lib/api-client';
import { searchCommand } from '../src/commands/search';

vi.mock('../src/lib/api-client');

it('prints the current offline message', async () => {
  vi.mocked(searchSkills).mockRejectedValue(new TypeError('fetch failed'));

  await searchCommand.parseAsync(['node', 'qaskills', 'playwright']);

  expect(spinner.stop).toHaveBeenCalledWith('Search failed');
  expect(promptLog.error).toHaveBeenCalledWith(
    'Could not reach qaskills.sh. Showing local seed skills...',
  );
});
\`\`\`

The prompt objects need module-level mocks because the command creates them inside the action. Use fixed stubs for \`intro\`, \`spinner\`, \`log.error\`, and \`outro\`. The [Vitest mocking guide](https://vitest.dev/guide/mocking.html) describes module and function spies used for this boundary.

The [getting started page](/getting-started) helps reproduce a normal search manually. Required QASkills search offline error handling coverage should not disconnect a real machine or depend on production downtime. A rejected mock gives the branch instantly.

## Which cases define qaskills offline mode?

The current qaskills offline mode is message-only behavior. It does not offer cached records, local seed search, a stale-results marker, or an explicit \`--offline\` option. Use that definition in tests until product code adds actual data.

A complete suite starts with one successful search, one empty successful result, one rejected fetch, one timeout, one HTTP error, one invalid JSON response, and one malformed result object. These cases distinguish normal command branches from the broad catch.

The success case stops the spinner with a found count, prints each skill, and reports shown versus total. The empty case logs \`No skills found\` and points to the web catalog. Neither case should print offline copy.

A non-success HTTP response is converted by the API client into \`API error STATUS: TEXT\`, then caught by the command. At the terminal, it looks the same as a fetch rejection. Keep client-level exact-message tests separate so transport detail remains covered.

Invalid JSON on a successful status also falls into the command catch. Calling that a network outage would be inaccurate, yet the current message does so. Include the case to document how broad the catch is and to inform future copy changes.

A malformed object can fail when the command reads \`results.total\` or \`results.skills.length\`. That programming or contract error again produces connection advice. This case demonstrates why narrowing the protected block or classifying errors could improve diagnostics.

QASkills search offline error handling has no local record assertion today because no record is printed. The [skills directory](/skills) remains the real fallback destination users can open once connectivity returns. Tests should not invent a local catalog feature.

## CLI fetch failure message and the current QASkills contract

The CLI fetch failure message consists of three observable prompt calls. The spinner stops with \`Search failed\`, the error logger receives \`Could not reach qaskills.sh. Showing local seed skills...\`, and the outro receives \`Check your internet connection and try again\`.

Color helpers can wrap the outro text, depending on test environment and picocolors detection. Mock \`pc.dim\` to return its input or assert the semantic text after stripping terminal codes. Do not make color support the primary behavior assertion.

The original exception is neither logged nor returned. The command action resolves after the catch, and it does not assign a nonzero process status. Tests should verify this intentionally rather than waiting for a rejected promise.

The request layer still has a useful separate contract:

\`\`\`typescript
const failure = new TypeError('fetch failed');
vi.spyOn(globalThis, 'fetch').mockRejectedValue(failure);

await expect(
  searchSkills({ query: 'playwright', pageSize: 10 }),
).rejects.toBe(failure);

expect(promptLog.error).not.toHaveBeenCalled();
\`\`\`

This example belongs in an API client test, where no command has transformed the error. The command test then mocks \`searchSkills\` and verifies the friendly replacement. Combining both layers in one case makes failures harder to locate.

The search command accepts an optional query. When absent, it opens a text prompt before starting the spinner. An offline test should provide the query as an argument unless it specifically covers prompt behavior, so the network branch is isolated.

Filters should also remain fixed. A type or framework option changes the URL but not catch copy. The [categories route](/categories) can help users choose values, while unit fixtures can use plain strings without calling that endpoint.

## How do you test search API unavailable handling?

Test search API unavailable handling with one command-level rejection and one executable process case. The command-level test gives precise prompt assertions. The process case verifies actual exit status and rendered terminal text from the built CLI.

1. Pass a query argument so no input prompt can block the test.
2. Mock \`searchSkills\` to reject with a unique transport error.
3. Stub Clack's spinner and log functions while preserving call arguments.
4. Parse the search command with fixed arguments and wait for its action.
5. Assert the spinner failure, error line, connection hint, and absence of skill rows.
6. Assert no local seed loader or result printer was called.
7. Run a built CLI against an unreachable loopback endpoint and capture status.
8. Restore module mocks, environment values, and timers after each case.

An executable fixture can reserve an unused local port and set \`QASKILLS_API_URL\` before the module loads. The CLI API client reads its base constant at import time, so changing the environment after import will not redirect existing module state.

\`packages/cli/e2e/e2e.mjs#runExpectFail\` shows how the repository captures commands expected to return nonzero. The helper wraps \`execFileSync\` and returns the caught error, but the suite currently uses it for invalid \`init\` input rather than offline search.

That existing helper may reveal the current zero-status issue: \`runExpectFail(['search', 'playwright'])\` can return null after a handled search failure. A new regression must decide the intended status before treating zero or nonzero as correct.

The [custom directory CI article](/blog/qaskills-add-custom-directory-ci) demonstrates temporary executable fixtures for another command. QASkills search offline error handling needs environment isolation instead of output-directory isolation, but both should avoid developer state.

## local seed fallback mismatch failure and edge-case matrix

The local seed fallback mismatch is the gap between terminal copy and executed behavior. The message promises local seed skills, yet the catch branch only emits text. This is a user-trust issue that a regression test should make impossible to overlook.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| qaskills search network error | Rejected fetch promise | Fixed failure and connection messages | Spinner remains active | \`packages/cli/src/commands/search.ts#searchCommand\` |
| qaskills offline mode | No reachable API | No records are printed today | Test invents cached output | \`packages/cli/src/lib/api-client.ts#request\` |
| CLI fetch failure message | Unique transport error | Original detail is replaced by command copy | Raw stack reaches user | \`packages/cli/src/commands/search.ts#searchCommand\` |
| search API unavailable handling | 503 text response | Same command catch path runs | Success renderer starts | \`packages/cli/src/lib/api-client.ts#searchSkills\` |
| local seed fallback mismatch | Spy on result printer | Zero fallback skill rows are emitted | Copy claims rows that never appear | \`packages/cli/src/commands/search.ts#searchCommand\` |
| offline CLI regression test | Built CLI with unreachable base | Current text and exit status are captured | Process hangs beyond timeout | \`packages/cli/e2e/e2e.mjs#runExpectFail\` |

There are two valid product fixes, but they create different contracts. One can change the message to state that search is unavailable and link users to retry guidance. Alternatively, one can add real bundled or cached seed data and render it with an explicit stale or offline label.

The smaller truthful fix is copy-only. Its test should assert no fallback claim. The larger feature needs a data source, deterministic query rules, filters, freshness policy, and install behavior when the registry cannot provide package content.

Do not add fake rows only to satisfy the existing sentence. Offline discovery without offline installation may still confuse users. Define what remains possible before promising a mode.

The [SKILL.md format guide](/blog/skill-md-format-guide) explains package structure if a real bundled fallback is planned. It does not provide a seed search implementation. Product code must own that source explicitly.

## How should offline CLI regression test run in CI?

An offline CLI regression test should avoid external DNS and production availability. Point the client at a closed loopback port or use a tiny local server that closes the socket. Bound the process with a timeout so a broken abort path cannot hang the job.

For unit coverage, mocked fetch is faster and can distinguish rejection, HTTP status, invalid JSON, and delayed response. Use fake timers only when testing the ten-second abort. For command copy, mock \`searchSkills\` directly.

For the built process, build shared and CLI packages first. Set a dedicated base URL in the child environment before starting \`dist/index.js\), pass a query argument, capture stdout and stderr, and record the actual exit status. Disable telemetry even though search does not send install events.

The current API client reads \`QASKILLS_API_URL\` at module initialization and removes one trailing slash. Child-process environment setup naturally occurs before import, which makes it reliable. In-process tests may need module reset before changing the variable.

The release E2E suite calls live \`search playwright\` as a fast command and expects zero exit plus nonempty output. That case is valuable for online behavior, but it cannot force or verify the catch branch. Add offline coverage beside it rather than replacing it.

The [Node fetch documentation](https://nodejs.org/api/globals.html#fetch) is the authority for the runtime global, while repository tests should own the exact QASkills copy. QASkills search offline error handling can then change intentionally, with old and new expectations reviewed together.

## Implementation checklist for QASkills search offline error handling

Use this checklist for the present regression and any future fix:

- Provide a query argument so no interactive prompt appears.
- Separate fetch rejection, HTTP failure, invalid JSON, and bad result shapes.
- Assert all three prompt calls in the current catch branch.
- Verify no skill row is rendered after a failure.
- Record that no local seed source is called today.
- Capture the built command's actual exit status.
- Set base URL environment before importing or launching the client.
- Use loopback fixtures instead of production outages.
- Bound delayed requests and restore timers after each case.
- Keep online empty-result behavior in a separate test.
- Change copy and behavior together if a real offline mode is added.

These assertions connect \`packages/cli/src/lib/api-client.ts#request\` with \`packages/cli/src/lib/api-client.ts#searchSkills\` and the command catch. Each layer gets a clear expected result instead of one oversized snapshot.

QASkills search offline error handling should tell the truth about available data. A stable friendly message is useful only when it matches the next action. The current regression should expose the mismatch until code or copy resolves it.

Use the [main blog route](/blog) for adjacent CLI guides and the [FAQ page](/faq) for user support. Keep the executable offline case in the CLI package so its environment and process status remain visible to maintainers.

## How can the offline path be improved without false claims?

Start by choosing one truthful product result. The command can report that search is unavailable, or it can load real local data. QASkills search offline error handling should not promise local skills until a tested source exists.

The smallest safe fix changes the copy. Keep the spinner stop and connection hint, but remove the line that says local seed skills are shown. Add a command test for the new text and prove that no result rows follow it.

A real fallback needs more design. Choose where the bundled records live, how they are updated, and which fields search can trust. The CLI should not parse a random worktree folder and call those files the public catalog.

Define a small local result type before wiring the command. It should contain only fields the renderer needs, such as slug, name, description, author, and score. A fixed type helps reject stale or malformed entries instead of crashing inside display code.

Decide how a query filters those records. Use one clear text rule and test case, spacing, and empty results. Do not imply remote ranking or install counts when the offline list has no live service data.

Mark fallback rows in the output. A short \`offline\` label tells users that results may be old and limited. It also helps tests distinguish local rows from an accidental remote success that used the wrong fixture.

Keep the original network failure available for debug logs. User copy may stay short, but maintainers need the error class or status when a smoke test fails. Never print tokens, request headers, or a full private response body.

The command should also set a nonzero status when no useful result is produced. Scripts need a machine signal as well as friendly text. Add one process-level test because a mocked prompt assertion cannot prove the child exit code.

If real local rows are shown, the exit policy needs a written rule. A successful fallback may return zero because the user's search did complete against local data. A pure connection failure with no fallback should return nonzero.

Test fetch rejection, timeout, and HTTP failure as separate inputs. They may share user copy, but their debug facts differ. A malformed success body should also remain distinct because it can indicate an API contract regression.

Use a loopback server for process tests. One route can close the socket, one can delay, one can return \`503\`, and one can return bad JSON. This small server creates repeatable faults without changing DNS or blocking the public site.

Set \`QASKILLS_API_URL\` before the child process starts. The client reads that value when its module loads, so changing the parent environment later cannot affect an active child. Use a unique port for each worker and close the server after every case.

Keep telemetry disabled even though search should not record an install. Shared child helpers may run other commands later, and a fixed environment avoids a hidden count change. Temporary home and config paths provide the same safety for agent detection.

Add an online empty-result test beside the offline cases. A valid response with zero matches is not a network fault and should not show connection copy. This contrast protects the catch block from swallowing a normal no-results state.

When a fallback catalog is added, test its age and source in isolation. Then test the command using a fixed local fixture and a failed remote call. Both layers are needed before the output can truthfully say that local seed skills are being shown.

Update help text and the [QASkills FAQ](/faq) only after behavior passes. User docs should match the released command, not a planned branch. The tests remain the best record of exact copy, rows, and process status.

Use this review list when the search path or its copy changes:

- one fixed query keeps every unit and process case out of the interactive input branch
- one rejected client call stops the spinner before any error line or final hint is printed
- one assertion checks each user line on its own so an order fault has a clear cause
- one row spy proves the current catch path does not print a local or remote skill result
- one seed spy proves no local catalog loader is called because that feature does not exist yet
- one child process case records the true exit status after a closed local endpoint rejects fetch
- one timeout case uses a bounded local delay and restores real time after the abort is observed
- one HTTP case returns a fixed 503 response without taking the public QASkills site offline
- one bad JSON case stays distinct from transport failure in debug facts and test names
- one malformed data case shows whether result display errors are still caught as connection faults
- one online empty list case avoids all offline copy because zero matches is a valid response
- one environment check sets the custom base before the CLI module starts in the child process
- one cleanup check closes the loopback server and removes every temp home or config path
- one copy review removes the local seed claim unless actual fallback rows pass their own tests
- one docs check updates help and support text only after the released behavior has changed

This list gives QASkills search offline error handling a clear contract without a live outage. It also keeps planned fallback work apart from current facts. Each failed line points to one owner and one small fix.

- saved offline run record with query base host fault kind spinner state user lines row count seed calls exit status temp paths cleanup state and test owner
- close note with plain fault facts no secret data clear next step named code owner named docs owner and fixed rerun date

## Frequently Asked Questions

### What does qaskills search network error verify in QASkills?

It verifies that a rejected search reaches the command catch, stops the spinner, and prints the fixed connection guidance. Test the API client's original rejection separately. The command currently discards technical detail and does not mark the process as failed.

### When should a team test qaskills offline mode?

Run offline cases whenever search commands, API transport, timeouts, result rendering, or fallback copy changes. Keep a mocked unit gate for speed and add one built-process check. Do not rely on waiting for qaskills.sh or public DNS to fail during CI.

### How can a fixture isolate CLI fetch failure message?

Pass a fixed query and mock \`searchSkills\` to reject before any result exists. Stub the spinner, error logger, and outro, then compare their exact arguments. This isolates command copy from fetch implementation and avoids an interactive prompt or network call.

### Which assertion proves search API unavailable handling?

Assert that the success renderer has no calls after a rejected search, while the spinner and both failure messages appear once. In a built-process case, also capture completion status. The current command can finish with zero despite reporting a failed search.

### What failure cases belong in local seed fallback mismatch tests?

Cover fetch rejection, abort, 503 response, invalid success JSON, and malformed result data. For every case, assert zero fallback skill rows because current code has no seed loader. This makes the inaccurate claim visible without fabricating offline catalog behavior in tests.

### How should CI run offline CLI regression test checks?

Use mocks for branch-level cases and a closed loopback endpoint for one executable check. Set the base URL before process start, pass a query, enforce a timeout, and capture both output streams plus status. Restore environment and timer state afterward.

## Conclusion

QASkills search offline error handling currently provides stable failure copy but no offline records. Its broad catch also maps HTTP, parsing, shape, and rendering faults to the same connection message, while leaving process status unchanged.

Use the [getting started guide](/getting-started) to run the command, then compare online results with [the current skills catalog](/skills). Add the offline regression before changing either the fallback wording or its actual data behavior.`,
};
