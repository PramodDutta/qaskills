import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'QASkills CLI timeout timer cleanup',
  description:
    'QASkills CLI timeout timer cleanup: use repo paths, tests, edge cases, and a repeatable workflow to verify QASkills behavior before release.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'QASkills CLI timeout timer cleanup',
  keywords: [
    'QASkills CLI timeout timer cleanup',
    'AbortController fake timer test',
    'clearTimeout fetch cleanup',
    'qaskills request timeout',
    'CLI hanging request test',
    'abort signal assertion',
    'timer leak regression test',
  ],
  relatedSlugs: [
    'error-handling-testing-patterns',
    'mcp-api-timeout-abortcontroller-testing',
    'test-environment-management-guide',
    'typescript-testing-patterns-guide',
  ],
  sources: [
    'https://dom.spec.whatwg.org/#interface-abortcontroller',
    'https://nodejs.org/api/globals.html#class-abortcontroller',
    'https://vitest.dev/guide/mocking/timers',
  ],
  repoEvidence: [
    'packages/cli/src/lib/api-client.ts#request',
    'packages/cli/src/lib/api-client.ts#DEFAULT_TIMEOUT_MS',
    'packages/cli/src/lib/api-client.ts#searchSkills',
    'packages/cli/src/lib/api-client.ts#getSkill',
  ],
  content: `QASkills CLI timeout timer cleanup uses one AbortController and one 10,000 millisecond timer for every API request. The request passes the controller signal to fetch, aborts when the timer fires, and clears that timer in a finally block after success or failure. Fake-timer tests must prove all three transitions.

The relevant code is in \`packages/cli/src/lib/api-client.ts\`. This guide tests that request helper through exported functions such as \`searchSkills\` and \`getSkill\`, so assertions reflect behavior available to CLI callers rather than a copied private implementation.

## What does QASkills CLI timeout timer cleanup guarantee?

QASkills CLI timeout timer cleanup guarantees that each request schedules an abort deadline and removes its timer after the request settles. It does not guarantee a special timeout error message because the helper currently lets the fetch rejection pass through.

\`DEFAULT_TIMEOUT_MS\` equals \`10_000\` at \`packages/cli/src/lib/api-client.ts#DEFAULT_TIMEOUT_MS\`; the private \`request\` helper makes a controller and starts its clock. Its \`finally\` always calls \`clearTimeout(timeout)\`.

The signal is included after spreading the caller's \`init\`, so the helper's signal wins if an internal caller supplies another one. Public functions do not currently expose a signal option, so tests should focus on the controller created by this helper.

The timer starts once per call, not once per retry, because this helper has no retry loop; a fetch spy and timer count should show one item. If retry support arrives later, it will need a new rule for one full deadline or one deadline per try.

The helper also builds headers before fetch starts, but the timer is made just before fetch and does not measure that prior work. Keep header checks in another test so the clock case has one clear cause.

When fetch returns a failed response, the helper reads text and throws \`API error {status}: {body or statusText}\`; finally still clears the timer. When JSON parsing rejects after a successful status, cleanup also runs because parsing remains inside the try block.

The [DOM AbortController definition](https://dom.spec.whatwg.org/#interface-abortcontroller) explains that aborting a controller signals observers. [Node's AbortController documentation](https://nodejs.org/api/globals.html#class-abortcontroller) covers the global class available in supported Node versions. Neither source promises that an arbitrary fetch mock will reject automatically, so the test double must observe the signal.

This boundary differs from the MCP timeout path documented in the [MCP API timeout guide](/blog/mcp-api-timeout-abortcontroller-testing). QASkills CLI timeout timer cleanup belongs to the CLI HTTP client and its fixed deadline.

The direct fact fits one test name: fetch gets a live signal and finally clears the timer, which states both stop and leak rules. It also keeps generic claims about all CLI work out of scope.

## How does AbortController fake timer test work?

An AbortController fake timer test keeps fetch pending, advances virtual time to the deadline, and rejects when the captured signal emits \`abort\`. It then awaits the public request promise and verifies both rejection and timer removal.

Simply returning \`new Promise(() => {})\` from fetch is not enough; the timer can abort while the mock stays pending because it ignores the signal. That creates a hanging test rather than proof of timeout behavior.

Capture the \`RequestInit.signal\` passed to fetch and add an abort listener that rejects with a named \`AbortError\`. Start \`searchSkills\`, advance fake time by exactly 10,000 milliseconds, and await the rejection.

Check that the signal is an \`AbortSignal\` before time moves, which proves the request made its controller at once. It also gives a fast failure if a refactor drops the signal from fetch options.

Do not call \`controller.abort()\` from the test because that proves only that the test can stop its own mock. The clock must cause the production callback, and the signal passed by production must be the one that changes.

Vitest documents timer replacement and advancement in its [fake timer guide](https://vitest.dev/guide/mocking/timers). Use \`vi.useFakeTimers()\` before invoking the request, and restore real timers after every case. A pending fake timer can affect later tests if cleanup is missing or the fixture exits early.

The public branch at \`packages/cli/src/lib/api-client.ts#searchSkills\` builds an API URL and reaches \`request\`, so it is a sound entry point. A small query also lets the test assert that URL construction completed before the request waited.

\`\`\`typescript
it('aborts searchSkills after the fixed deadline', async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Request timed out', 'AbortError'));
      });
    });
  });
  vi.stubGlobal('fetch', fetchMock);

  const pending = searchSkills({ query: 'playwright' });
  expect(vi.getTimerCount()).toBe(1);

  await vi.advanceTimersByTimeAsync(10_000);
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
\`\`\`

Restore globals and timers in \`afterEach\`, even when an assertion fails, to stop the fake clock from crossing test bounds. The [test environment guide](/blog/test-environment-management-guide) provides broader isolation patterns.

Attach the rejection check before the final clock step when the runner warns about a late handled promise, then await it after time moves. This is test-runner care, not a change to the QASkills CLI timeout timer cleanup contract.

Use the [FAQ](/faq) only for user-facing timeout help, while a package test cites code and inspects the signal. Help text can change without changing the timer or fetch branch.

## Which cases define clearTimeout fetch cleanup?

ClearTimeout fetch cleanup needs success, HTTP error, fetch rejection, JSON rejection, and timeout cases. Every settled path should end with no timer owned by that request.

The success fixture returns a 200 response with valid JSON, and one timer should exist before fetch resolves. After awaiting \`searchSkills\`, \`vi.getTimerCount()\` should return zero without advancing the clock.

The HTTP error fixture returns a 503 response and body text; the helper reads it, throws a formatted error, and enters finally. Assert the error and zero remaining timers so message handling cannot conceal a leak.

Return a short plain body, then match both status and phrase because this client reads response text, not response JSON. A fixture that returns only a status can miss the body read path.

The fetch rejection fixture returns \`Promise.reject(new Error('network down'))\`, and cleanup must still occur. This case is distinct from timeout because no abort event fires and the original failure identity should be preserved.

The JSON rejection fixture can return \`ok: true\` with a \`json\` method that rejects, while native Response objects can express bad JSON too. Since parsing occurs before the try block exits, the timer must be cleared after that rejection.

Add one case where JSON parsing takes some virtual time but ends before the deadline. The result should resolve, and no late abort should fire when the clock moves again. This proves clearTimeout fetch cleanup stops work that is no longer needed.

Finally, the timeout fixture proves the timer runs and aborts the signal, then the fetch rejection settles before finally clears the fired handle. This is the complete QASkills CLI timeout timer cleanup cycle.

Do not spy only on the global \`clearTimeout\` call count. Other libraries may schedule timers, and a call does not prove the QASkills handle disappeared. Combine a scoped clear spy with \`vi.getTimerCount()\` and the observed request result.

If the test runner itself owns timers, compare the count before and after the call rather than demand an absolute zero. In this focused suite, fake timers should normally begin empty. Write the expected baseline in setup so a later tool change stays clear.

## qaskills request timeout and the current QASkills contract

The qaskills request timeout is fixed at ten seconds and is not configurable through exported CLI client functions. It starts immediately before fetch and covers response receipt, error-body reading, and JSON parsing.

That coverage follows from the try block at \`packages/cli/src/lib/api-client.ts#request\`. The timer begins before \`await fetch\`, and the helper does not clear it until all awaited response work finishes. A slow JSON parser in a test double can therefore be aborted even after fetch returns a response object, although native fetch body behavior determines the final error.

The helper does not translate AbortError into a QASkills-specific message. CLI commands that call it receive the rejection and decide how to display or handle it. Tests should not expect text such as "request timed out" unless the fetch implementation supplies that message.

Node may shape abort errors in a way that varies by fetch release. Match the stable name and the fact of rejection instead of a full stack. The source contract is the abort signal, not one engine's prose.

All exported request functions share the same private helper. \`getSkill\` at \`packages/cli/src/lib/api-client.ts#getSkill\` also encodes its path segment before making the request. One timeout test through search and one cleanup test through get are enough to prove shared behavior without repeating every public method.

Use a skill slug with a slash or space only in the get path test. That row proves path encoding while the same fetch options prove timer setup. Keep the main deadline case on a plain slug so a URL failure cannot mask an abort failure.

The base URL is computed when the module loads from \`QASKILLS_API_URL\` or the production origin. If a test changes that environment variable after import, it will not affect \`BASE\`. Use module reset and dynamic import when the exact origin matters, or assert only signal and timer behavior.

QASkills CLI timeout timer cleanup should stay deterministic and offline. The [getting started page](/getting-started) is useful for a manual catalog request after local tests pass, but a ten-second live wait has no place in the package test suite.

The public [skills catalog](/skills) can serve as a quick check that the API responds, but it cannot prove the ten-second branch on demand. A mock that waits for its own signal is both faster and more exact.

## How do you test CLI hanging request test?

Test a CLI hanging request test with a fetch promise that settles only after the abort signal fires. Advance fake time in controlled increments, prove no early abort, then cross the exact deadline and await the resulting rejection.

Start at 9,999 milliseconds. The signal should remain active, the request should still be pending, and one timer should remain. Advancing one more millisecond should flip \`signal.aborted\` to true.

Add a separate one-millisecond case only if an early-abort bug once occurred. In most suites, the near-edge check is enough. Too many clock rows can repeat the same fact without adding a new branch.

Avoid racing \`expect(pending).rejects\` before the clock advances unless the framework attaches handlers safely. Store the promise, advance with the asynchronous timer API, and then await the assertion. This ordering lets abort listeners and promise microtasks run.

A reusable helper can model fetch without hiding the signal contract:

\`\`\`typescript
function fetchUntilAbort() {
  return vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
      if (!init?.signal) {
        reject(new Error('Expected an abort signal'));
        return;
      }
      init.signal.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true },
      );
    });
  });
}

it('does not abort before 10 seconds', async () => {
  const fetchMock = fetchUntilAbort();
  vi.stubGlobal('fetch', fetchMock);

  const requestPromise = getSkill('playwright-cli');
  const signal = fetchMock.mock.calls[0][1]?.signal;

  await vi.advanceTimersByTimeAsync(9_999);
  expect(signal?.aborted).toBe(false);
  expect(vi.getTimerCount()).toBe(1);

  await vi.advanceTimersByTimeAsync(1);
  await expect(requestPromise).rejects.toMatchObject({ name: 'AbortError' });
});
\`\`\`

The unused \`resolve\` parameter can be removed in a linted version. It appears here only to show that the promise intentionally has no success path. Production tests should satisfy the repository's lint settings.

The helper should add its abort listener once. A reused signal or repeated event should not lead to two rejections or two log calls. The \`once\` option makes that test fixture rule plain.

Use this numbered procedure:

1. Enable fake timers and install a fetch mock that listens to the provided abort signal.
2. Invoke \`searchSkills\` or \`getSkill\` without awaiting it, then capture the request signal.
3. Advance to one millisecond before the deadline and assert that the signal remains active.
4. Advance through the deadline, await the AbortError, and assert that no request timer remains.
5. Restore real timers, globals, mocks, environment variables, and reset modules when BASE was changed.

This procedure proves behavior instead of merely observing that \`setTimeout\` was called. For general asynchronous assertion design, see the [TypeScript testing guide](/blog/typescript-testing-patterns-guide).

Run the same procedure once through \`searchSkills\` and once through \`getSkill\`, but vary the outcome. Let search reach the deadline and let get succeed at once. Together they prove shared setup and both cleanup paths.

Record timer count in the failure message. A number is much easier to act on than a vague open-handle warning. This small detail helps when CI has more than one suite with fake clocks.

## abort signal assertion failure and edge-case matrix

An abort signal assertion should cover when the signal changes, why the promise settles, and whether cleanup follows. The matrix keeps time behavior separate from HTTP status behavior.

| Scenario | Fixture or input | Expected observable result | Failure signal | Repository source |
|---|---|---|---|---|
| AbortController fake timer test | Pending fetch that observes signal | Abort at 10,000 milliseconds | Request remains pending after deadline | \`packages/cli/src/lib/api-client.ts\` |
| ClearTimeout fetch cleanup | Immediate 200 JSON response | Result resolves and timer count returns to zero | Timer remains after success | \`packages/cli/src/lib/api-client.ts\` |
| Qaskills request timeout | Advance only 9,999 milliseconds | Signal is not aborted | Early abort shortens contract | \`packages/cli/src/lib/api-client.ts\` |
| CLI hanging request test | Advance final millisecond | Signal aborts and fetch rejects | No AbortError or no signal | \`packages/cli/src/lib/api-client.ts\` |
| HTTP error cleanup | 503 response with body | Formatted API error and zero timers | Status handling leaks timer | \`packages/cli/src/lib/api-client.ts\` |
| Timer leak regression test | Rejected JSON parser | Parse rejection and zero timers | Finally does not run | \`packages/cli/src/lib/api-client.ts\` |

A useful edge case resolves fetch at the same virtual time as the deadline. Scheduling order can depend on which callback entered the queue first, so avoid making this race a product promise. Test clearly before and clearly at the boundary instead.

Another edge case returns an already-aborted signal from an invented wrapper. Public functions do not accept a caller signal, so that case does not belong in this contract. Keep the fixture tied to observable production input.

The API error body read can also hang. Since the deadline is still active, abort may affect the body stream depending on the Response implementation. A unit double that ignores signals cannot prove native stream cancellation, so keep that claim out of the test.

An abort signal assertion should inspect the exact signal handed to fetch. Constructing a second controller in the test and checking it says nothing about production. Capture the request options directly.

Do not read private timer IDs through a module loader trick. The returned promise, request signal, and clock count already expose the full user effect. Tests stay easier to keep when private names can change.

## How should timer leak regression test run in CI?

A timer leak regression test should run under Vitest fake timers, finish in milliseconds, and leave the runner with real timers restored. It should not wait ten wall-clock seconds or contact the public API.

Place cleanup in \`afterEach\` rather than at the end of each test body. Failed assertions otherwise skip restoration. Call \`vi.clearAllTimers()\`, \`vi.useRealTimers()\`, \`vi.unstubAllGlobals()\`, and \`vi.restoreAllMocks()\` as required by the suite.

Run timeout cases serially only if module-level environment state forces it. Timer state itself can remain isolated per worker when every test restores its clock. Unique module imports are more relevant when changing \`QASKILLS_API_URL\`.

Add a success case beside every timeout case. A suite that proves abort but not early cleanup can miss a timer that remains scheduled after fast responses. That leak might keep a process open or trigger later against an already completed request.

After the success promise resolves, move the fake clock well past ten seconds. The old signal should still be active and no fetch call should be added. This is a direct late-fire check for QASkills CLI timeout timer cleanup.

The focused package gate should run before the full repository post-flow. If Vitest reports open handles, inspect whether a fetch promise lacks an abort listener or a real timer escaped fake-timer setup. The [error handling guide](/blog/error-handling-testing-patterns) can help classify promise and transport failures.

Keep a short test log in CI, then link to the [blog guide index](/blog) from release notes if the rule changes. The test itself should print no clock trace on success. Clean output makes an open handle easier to see.

No test in this group needs a category lookup, yet the [category page](/categories) can support a later manual search flow. That manual path must not share mocks or timer state with the package suite.

Do not increase the production timeout merely to make a faulty test pass. The suite advances virtual time, so machine speed is irrelevant. A changed timeout should be a deliberate code change accompanied by updated boundary assertions.

## Implementation checklist for QASkills CLI timeout timer cleanup

Use this checklist when reviewing QASkills CLI timeout timer cleanup:

- Reach the private request helper through an exported API function.
- Capture the exact signal passed in fetch options.
- Prove one timer exists while a request is pending.
- Prove no abort before 10,000 milliseconds and abort at the deadline.
- Make the fetch mock reject when its observed signal aborts.
- Verify zero timers after success, HTTP failure, network rejection, and JSON rejection.
- Restore fake timers and global fetch after every case.
- Keep live catalog checks outside the deterministic package suite.

The source symbols are \`request\`, \`DEFAULT_TIMEOUT_MS\`, \`searchSkills\`, and \`getSkill\` in the same client file. Assertions should follow those paths rather than a generic timeout utility that QASkills does not use.

Review error expectations carefully. The helper formats non-success HTTP responses, but it preserves fetch rejections. A timeout test expecting the HTTP format would describe behavior that is absent from current code.

Also review time advancement. A test that jumps past the deadline without awaiting timer microtasks can report false results. Prefer the asynchronous fake-timer methods for promise-based callbacks.

## Frequently Asked Questions

### What does AbortController fake timer test verify in QASkills?

It verifies that the CLI request creates a signal, schedules its controller to abort at the fixed deadline, and lets an observing fetch reject. The test should also prove that the timer is removed after settlement. It does not establish a custom timeout message that the current helper never creates.

### When should a team test clearTimeout fetch cleanup?

Test cleanup whenever request control flow, response parsing, error formatting, timeout duration, or fetch options change. Include success and every rejection path because finally must run for all of them. A regression also belongs with any fix for hanging tests, open handles, delayed process exit, or late abort callbacks.

### How can a fixture isolate qaskills request timeout?

Use Vitest fake timers and a fetch double that rejects only when the received signal emits abort. This removes wall-clock delay and external network state. Capture timer count before and after settlement, then restore the clock and global fetch so later package tests cannot inherit the fixture.

### Which assertion proves CLI hanging request test?

The decisive assertion advances to 9,999 milliseconds with an active signal, then advances one millisecond and observes AbortError from the pending request. Pair it with a zero timer count after rejection. Checking only that setTimeout was called cannot prove the request stops or cleanup runs.

### What failure cases belong in abort signal assertion tests?

Cover an HTTP error, immediate network rejection, malformed JSON, a fetch that waits for abort, and a success response. Inspect the signal supplied to fetch in each relevant case. Avoid invented caller signals because exported QASkills client functions do not currently accept a signal option.

### How should CI run timer leak regression test checks?

CI should use virtual time, mocked fetch responses, and cleanup hooks that always restore globals and real timers. The timeout test must complete without secrets or public network access. Run the focused CLI suite first, then build and post-flow checks, while treating any open-handle warning as a test failure.

## Conclusion

QASkills CLI timeout timer cleanup is defined by one deadline, one observed signal, and one finally block. A credible suite proves early activity, boundary abort, every settlement path, and zero leftover timers without spending ten real seconds.

[Follow the getting started guide](/getting-started) with a mock API, then confirm the same broad request path against the public [skills catalog](/skills). Keep that smoke check separate from the deterministic timer tests described here.
`,
};
