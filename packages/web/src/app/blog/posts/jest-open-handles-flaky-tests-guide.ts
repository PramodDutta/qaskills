import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Open Handles and Flaky Test Debugging',
  description:
    'Debug Jest open handles and flaky tests by tracing async leaks, timers, servers, sockets, and CI-only timeouts without masking real failures.',
  date: '2026-07-10',
  category: 'Guide',
  content: `
# Jest Open Handles and Flaky Test Debugging

The test suite says PASS, then the process refuses to exit. A minute later CI kills the job, nobody gets a useful stack trace, and the team starts rerunning the pipeline as if the failure were weather. In Jest, that hanging process is usually an unfinished async resource: a server still listening, a database pool left open, a timer that never clears, a worker that never terminates, or a promise chain that escaped the test.

Open handle debugging is not the same work as fixing a failed expectation. You are looking for lifetimes. Which resource started during this test file? Which code path owns shutdown? Which operation can keep Node's event loop alive after Jest has already reported the assertions? Treating the problem that way keeps you from papering over it with longer timeouts.

This guide covers a practical Jest workflow for open handles, async leaks, fake timer mistakes, CI-only flakes, and the point where quarantine is justified. If promise assertions are the weak spot in the suite, read the [Jest async await testing promises guide](/blog/jest-async-await-testing-promises-guide). For governance around isolating unstable tests, pair this with the [flaky test quarantine and test impact analysis guide](/blog/flaky-test-quarantine-test-impact-analysis-guide-2026).

## Reading the symptom before changing the timeout

Jest has several failure shapes that look similar in CI logs but require different fixes. A test timeout means the test function did not finish in the allowed time. An open handle warning means tests finished, but Node still has live resources. A random expectation failure means the test completed but observed the wrong state. A worker crash or force exit warning points to process-level cleanup rather than a single assertion.

| Symptom in Jest output | Likely area | First useful action |
|---|---|---|
| Test exceeded timeout | Awaited operation never resolved, callback not called, deadlocked fake timer | Add narrow logging around awaited boundary and reduce the test to one async path |
| Jest did not exit after tests completed | Server, socket, database pool, interval, worker, file watcher | Run with detectOpenHandles and inspect setup and teardown |
| Passes alone but fails in full suite | Shared module state, global mock, leaked timer, order dependency | Run related files in band, then bisect file order |
| Fails only in CI | CPU timing, real network, port collision, different timezone, lower file descriptor limits | Capture environment details and remove external dependencies |
| Worker process failed to exit gracefully | Unclosed child process, worker thread, native addon resource | Add explicit shutdown and check afterAll paths |

Do not begin by raising testTimeout globally. A larger timeout may be appropriate for a known slow integration test, but it is a poor first response to an unknown hang. It increases feedback time and makes future leaks more expensive to detect. Keep the timeout change local and temporary while investigating.

## Using detectOpenHandles without treating it as magic

Jest's detectOpenHandles option attempts to report async resources that are preventing exit. The most common usage is the CLI flag. It has overhead, so use it while debugging rather than leaving it enabled for every fast unit test job.

\`\`\`bash
npx jest --runInBand --detectOpenHandles path/to/suspect.test.ts
\`\`\`

The runInBand flag matters because parallel workers can blur ownership. If five test files run at once and one leaves a server open, the final warning may not make it obvious which file did it. Running the suspect file in the main process narrows the search and makes stack traces easier to connect to setup code.

If the whole suite hangs but no single file is obvious, run folders or test globs in chunks. The goal is not a clever command. The goal is to find the smallest set of tests that reproduces the handle. Once you have that set, inspect beforeAll, afterAll, imported modules with side effects, test environment setup files, and libraries that create clients at module scope.

Open handle reports are useful clues, not verdicts. They may show a Timeout, TCPWRAP, Server, ChildProcess, or other resource type. A Timeout could be an application interval, a retry loop in a client library, or a fake timer mismatch. A TCP handle could be your test server, a Redis connection, a database socket, or a telemetry client. You still need to map the handle to your code.

## Servers, ports, and forgotten close calls

HTTP servers are a classic source of Jest hangs. The test starts an app, performs a request, assertions pass, and the server keeps listening. The fix is usually explicit ownership: the test file that opens the server must close it in afterAll, and the close call must be awaited.

\`\`\`ts
import http from 'node:http';
import request from 'supertest';
import { createApp } from '../src/app';

let server: http.Server;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

test('returns the health payload', async () => {
  await request(server).get('/health').expect(200).expect({ ok: true });
});
\`\`\`

Notice that the test does not bind to a fixed port. Port 0 lets the operating system choose a free port, reducing CI collisions when jobs run concurrently. If your app needs a base URL, read server.address() after the listening event. Hard-coded ports are a common reason a test passes locally but fails when two CI workers share the same machine.

Also avoid starting servers at module import time. If importing createApp starts listeners, the test has no clean ownership boundary. Export an app factory and let the test decide when to listen. That pattern improves production code too because it separates application construction from process bootstrapping.

## Database pools and clients that outlive assertions

Database clients are less visible than HTTP servers because the test often uses a repository or ORM wrapper. A PostgreSQL pool, MongoDB client, Prisma client, Redis client, or message queue connection can keep the event loop alive after the final expectation. The cleanup call belongs in the same layer that created the client.

| Resource | Typical open-handle cause | Cleanup pattern |
|---|---|---|
| pg Pool | Pool created in module scope and never ended | await pool.end() in global teardown or afterAll |
| MongoClient | Client reused across tests without close | await client.close() after database cleanup |
| PrismaClient | Process keeps connection engine active | await prisma.$disconnect() |
| Redis client | Socket remains connected after assertions | await client.quit() or client.disconnect() according to client behavior |
| Nock or MSW setup | Mock server or interceptor not restored | reset handlers and close server in teardown |

Be careful with singleton clients. They are convenient for application code, but tests need a shutdown path. A good compromise is to export both getClient and closeClient from the module, or to inject clients into services during tests. The important point is that Jest can call the same shutdown path production uses during graceful termination.

If a client starts background retries, failed connection attempts can also hang. In CI, a missing DATABASE_URL may trigger a retry loop that never exists locally. Fail fast on missing required test environment variables. A loud setup error is cheaper than a job that waits for the global timeout.

## Timers, fake timers, and retry loops

Timers cause two opposite classes of flake. Real timers make tests slow and timing-sensitive. Fake timers make tests deterministic only when every scheduled operation is driven correctly. Mixing them casually creates failures that are hard to read.

When using fake timers, enable them inside the test or describe block that needs them, and restore real timers afterward. Do not leave fake timers active for unrelated tests. A later test that awaits a promise backed by setTimeout may stall because nobody advances the clock.

\`\`\`ts
import { waitForBackoff } from '../src/retry';

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('backs off before retrying a transient failure', async () => {
  jest.useFakeTimers();
  const operation = jest.fn().mockRejectedValueOnce(new Error('busy')).mockResolvedValue('ok');

  const promise = waitForBackoff(operation, { initialDelayMs: 1000, retries: 1 });

  await Promise.resolve();
  expect(operation).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(1000);
  await expect(promise).resolves.toBe('ok');
  expect(operation).toHaveBeenCalledTimes(2);
});
\`\`\`

The exact timer API you use depends on your Jest version, but the principle is stable: advance the fake clock through the scheduled delay and await the promise that represents the operation. If your code schedules microtasks and timers together, a single synchronous advance may not flush the chain. Prefer async timer advancement when the code under test awaits inside timer callbacks.

Long-lived intervals deserve special attention. Application code should expose a stop function or accept an AbortSignal. Tests should verify that the stop path clears the interval, not merely ignore it. A polling loop that never stops is both a test leak and a production shutdown bug.

## Promise leaks that assertions never observe

Some flaky Jest tests pass because the assertion finishes before the important async work has completed. The common examples are missing await, forgotten return in a promise test, callback APIs that never call done, and array iteration with async callbacks that are not awaited. These mistakes can create both false positives and open handles.

Use expect.assertions or expect.hasAssertions for tests that must execute assertions inside callbacks or rejection paths. Prefer await expect(promise).resolves or rejects when testing promise outcomes. Avoid forEach with async callbacks because the outer test will not await the inner promises. Use Promise.all with map when the operations should run concurrently, or for...of when order matters.

Unhandled rejections are especially damaging. They may appear after the test has finished, sometimes in a different file's output. Configure the suite so unhandled rejections fail loudly, and do not swallow errors in catch blocks just to keep a retry loop alive. If production code intentionally logs and continues, tests should assert that behavior with a controlled logger.

## CI-only flakes: isolate environment before rewriting code

CI changes the physics of a Jest suite. CPU is shared, file systems are slower, network access may be restricted, local timezone can differ, and parallel jobs may collide on ports or database schemas. A test that depends on a 20 millisecond race may pass on a laptop and fail under CI load.

Start by recording the exact seed or file order if you use a runner feature that randomizes tests. Then run the suspect test repeatedly in CI-like mode: in band, with the same Node version, same environment variables, same timezone, and without watch mode. If the failure disappears when run alone, add the nearest neighboring files until it returns.

Do not mock time globally unless the test owns time. Timezone flakes often come from date formatting and midnight boundaries. Set TZ for the test job if the product contract is timezone-independent, or assert dates using explicit zones if the product is timezone-aware.

For external HTTP calls, use stable mocks. A unit test should not hit a real analytics endpoint, payment sandbox, or metadata service. Integration tests that deliberately use real dependencies should run in a separate job with longer timeouts and clearer ownership.

## Building a Jest cleanup checklist for reviewers

Open handle prevention works best as a review habit. Every test that creates an external resource should show its cleanup path. If the cleanup is hidden in a helper, the helper should be named plainly enough that reviewers can find it.

| Code review question | Bad smell | Acceptable answer |
|---|---|---|
| Who closes this resource? | Client created in beforeAll with no afterAll | afterAll awaits a close or disconnect call |
| Can this test run in parallel? | Fixed port, shared account, shared temp path | OS-assigned port or worker-scoped data |
| Does the test await the behavior it asserts? | Fire-and-forget async callback | Returned promise or awaited expectation |
| Are timers restored? | useFakeTimers without useRealTimers | afterEach restores timers and mocks |
| Does setup fail fast? | Missing env var triggers retries | Setup validates config and throws immediately |

This checklist is intentionally small. Long checklists become theater. The best signal is whether a reader can trace resource lifetime from creation to cleanup in under a minute.

## When quarantine is justified

Quarantine is not a fix for open handles. It is a containment tool for a known unstable test while a fix is scheduled. Before quarantining, capture the failure mode, owner, reproduction command, and removal condition. A quarantined test without an owner is deleted coverage with nicer branding.

For open handles, quarantine may be appropriate when the leak comes from a third-party library upgrade or an environment dependency outside the team's immediate control. Even then, keep a small reproduction test somewhere visible. If the entire suite needs forceExit to pass, that is a release engineering problem, not a flaky-test strategy.

Avoid Jest's forceExit as a routine solution. It can keep CI green by terminating the process after tests complete, but it also hides resource leaks that may affect production shutdown, local watch mode, and later tests. Use it only as a temporary pressure valve, with an issue linked directly from the test command or CI config.

## Turning a hang into a regression test

Once you find the leak, add a focused regression test for the ownership rule that failed. If an HTTP server was left open, the fix might be an afterAll close call, but the regression belongs near the helper that starts the server. If a polling client kept an interval alive, test that stop clears the interval or aborts the loop. If a database wrapper forgot to disconnect, test the wrapper's close method with the real client in an integration suite.

This is where many teams stop too early. They remove the immediate hang but do not protect the cleanup contract. The next refactor reintroduces the leak under a different test file. A small regression test is cheaper than rediscovering the same open handle through a CI timeout.

Also update the failure message or helper name when needed. A helper named startTestApp should either return a close function or be paired with a clearly named stopTestApp. Cleanup should be hard to forget during review. Resource lifetime is part of the test API.

Make the regression local. If the leak came from a retry helper, do not add a broad suite-level assertion that Jest exits cleanly. Test the retry helper's cancellation path. If the leak came from a server factory, test the factory's returned close function. Local tests fail faster and tell the next maintainer exactly which cleanup contract was broken.

Finally, remove temporary diagnostics after the fix. Leaving detectOpenHandles, excessive console output, or inflated timeouts in the normal command can make the suite slower and noisier. Keep the reproduction command in the issue or commit message, but return the default test path to ordinary speed.

That cleanup keeps future investigations focused.

## Frequently Asked Questions

### Should I enable detectOpenHandles for every Jest run?

Usually no. It adds overhead and is better as a focused diagnostic flag. Keep normal runs fast, then use detectOpenHandles with runInBand when a suite hangs or reports open resources.

### Why does Jest say tests passed but CI still fails?

The assertions passed, but the Node process likely stayed alive until the CI timeout. Look for servers, sockets, database pools, timers, child processes, or mock servers that were created during the run and never closed.

### Is forceExit acceptable for open handle failures?

Only as a short-term containment step. forceExit can hide real cleanup bugs. If you use it temporarily, track the owner and reproduction command, then remove it once the leaking resource has an explicit shutdown path.

### How do fake timers create flaky tests?

Fake timers replace real clock behavior. If a test enables them and does not advance scheduled work or restore real timers, later promises and intervals may never run. Scope fake timers narrowly and restore them in afterEach.

### What is the fastest way to find the leaking test file?

Run the suspect area with npx jest --runInBand --detectOpenHandles, then split the file set until the warning disappears. Once you have the smallest reproducing set, inspect setup, teardown, and imports with side effects.
`,
};
