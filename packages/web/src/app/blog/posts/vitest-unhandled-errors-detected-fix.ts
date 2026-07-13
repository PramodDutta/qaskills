import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest “Unhandled Errors Detected” Fix',
  description:
    'Fix Vitest Unhandled Errors Detected warnings by locating rejected promises, uncaught callbacks, leaked resources, late assertions, and mock timing faults.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Vitest “Unhandled Errors Detected” Fix

All six assertions are green, yet the process exits red. Vitest has caught a rejection or exception that was not attached cleanly to a completed test. That warning is valuable: without it, a broken asynchronous branch could run after the test finishes and leave the suite reporting false confidence.

“Unhandled Errors Detected” is a category, not one defect. The underlying event may be an unhandled promise rejection, an uncaught exception, an assertion that settles too late, an event listener that throws, or a resource that keeps executing after its owner has gone. The repair is to connect asynchronous lifetime to test lifetime, then assert the branch that was previously floating.

## Start with the first error payload, not the summary

The final banner tells you Vitest observed unhandled activity. The useful evidence is above it: error name, message, stack, test file active when the event surfaced, and sometimes a note that the error may have originated in a different test. Preserve the first occurrence. Later errors are often cleanup consequences.

Run the smallest affected file with a verbose reporter. If order matters, compare the single test, the file, and a group of neighboring files. An error that disappears when isolated points toward shared state or work escaping from an earlier test, not proof that the current test is healthy.

| Output clue | Strong candidate | Immediate experiment |
|---|---|---|
| \`Unhandled Rejection\` with application stack | Promise created without an observer | Find the promise's creation point and await or return it |
| \`AssertionError\` after a test is marked passed | Missing await on an async assertion | Add \`await\` to \`resolves\`, \`rejects\`, polling, or async matcher |
| Error names the next test | Previous test's timer or listener fired late | Run previous and current test together, inspect teardown |
| \`ECONNREFUSED\` after server cleanup | Request remained in flight | Expose request completion and await it before closing server |
| DOM callback throws after unmount | Subscription or observer was not removed | Unmount and assert cleanup, restore platform mocks |
| Only fake-timer tests fail | Pending timer advanced outside expected phase | Control and clear timers within each test |

Do not begin by enabling an ignore switch. Vitest exposes \`dangerouslyIgnoreUnhandledErrors\`, and its name accurately communicates the risk. It changes the exit behavior, not the correctness of the code. Use it only for a deliberately accepted third-party defect with separate containment, never as routine suite configuration.

## Await the assertion itself

Async assertions return promises. Writing \`expect(loadUser()).resolves.toEqual(...)\` without \`await\` starts an assertion but lets the test function return. A rejection can then arrive after Vitest has closed the test's accounting window.

The same rule applies to \`rejects\`, custom async matchers, and helpers that return a promise. Mark the test callback \`async\`, and await the entire expectation. Do not await only the production promise and then accidentally assert a promise wrapper.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { loadAccount, saveAccount } from './accounts';

describe('account persistence', () => {
  it('loads the saved display name', async () => {
    await saveAccount({ id: 'a-17', displayName: 'Mina' });

    await expect(loadAccount('a-17')).resolves.toMatchObject({
      displayName: 'Mina',
    });
  });

  it('rejects an unknown account explicitly', async () => {
    await expect(loadAccount('missing')).rejects.toThrow('Account missing not found');
  });
});
\`\`\`

Returning the expectation is also valid when it is the test's final expression: \`return expect(task).rejects.toThrow(...)\`. Awaiting is usually clearer when setup or follow-up assertions exist. Never combine a \`done\` callback with a returned promise unless an API truly forces callback adaptation. Two completion mechanisms create ambiguity about which one owns the test.

The [Vitest configuration and setup guide](/blog/vitest-config-setup-guide-2026) is useful when the problem arises from environment files or global hooks. Keep the local cause separate from configuration: a correct environment does not compensate for a floating assertion.

## Replace async forEach with an owned aggregate

\`Array.prototype.forEach\` ignores the value returned by its callback. An async callback therefore creates one promise per item, but the surrounding test receives nothing to await. This frequently produces several passing assertions followed by one unhandled rejection from the slowest item.

Choose whether the behavior should be sequential or concurrent. Use \`for...of\` when order, shared state, or rate limits matter. Use \`Promise.all\` when every operation can run concurrently and any failure should reject the test.

\`\`\`ts
import { expect, it } from 'vitest';
import { priceOrder } from './pricing';

it('prices supported currencies concurrently', async () => {
  const cases = [
    { currency: 'USD', expected: 1250 },
    { currency: 'EUR', expected: 1175 },
    { currency: 'JPY', expected: 192000 },
  ];

  const results = await Promise.all(
    cases.map(async ({ currency, expected }) => {
      const quote = await priceOrder({ subtotal: 1000, currency });
      expect(quote.total).toBe(expected);
      return quote;
    }),
  );

  expect(results).toHaveLength(cases.length);
});
\`\`\`

\`Promise.allSettled\` is appropriate only if the contract expects independent failures and the test inspects every result. Calling it and ignoring rejected entries merely converts an unhandled rejection into an unasserted failure.

## Make callback APIs return a promise

Node-style callbacks and event emitters do not automatically participate in the test callback's promise. Wrap one-shot completion in a promise with explicit resolve and reject paths. Register error handling before triggering the action, remove listeners after completion, and ensure the promise cannot settle twice.

For a stream, do not put assertions directly in a \`data\` handler and hope Vitest catches them. Accumulate chunks and resolve on \`end\`; reject on \`error\`. The test awaits the wrapper, then asserts in its own controlled flow.

\`\`\`ts
import { once } from 'node:events';
import { createReadStream } from 'node:fs';
import { expect, it } from 'vitest';

async function readUtf8(path: string): Promise<string> {
  const stream = createReadStream(path, { encoding: 'utf8' });
  const chunks: string[] = [];
  stream.on('data', (chunk) => chunks.push(chunk));

  const [result] = await Promise.race([
    once(stream, 'end').then(() => ['end'] as const),
    once(stream, 'error').then(([error]) => Promise.reject(error)),
  ]);

  if (result !== 'end') throw new Error('Unexpected stream outcome');
  return chunks.join('');
}

it('reads the generated manifest', async () => {
  await expect(readUtf8('fixtures/manifest.json')).resolves.toContain('"version"');
});
\`\`\`

In production code, prefer native promise APIs such as \`node:fs/promises\` where available. The wrapper is most useful for your own emitters and libraries that remain callback-based. Ensure error listeners do not themselves throw after the promise has already resolved.

## Control timers as test resources

A timer scheduled in a test can fire during a later test. Real timers make that race machine-dependent. Fake timers provide control, but they also require disciplined restoration and awareness that advancing time may schedule promise microtasks.

Use \`vi.useFakeTimers()\` in the test or a tightly scoped hook, trigger behavior, advance with the asynchronous timer APIs when callbacks await promises, assert the result, and restore real timers. Clear timers if the production code has no cleanup path. A component or service with a recurring interval should expose a disposal operation, and the test should verify disposal prevents further calls.

| Timer failure pattern | What actually escaped | Better assertion boundary |
|---|---|---|
| Debounced save rejects after test end | Debounce timer and request promise | Advance timer, await save result, then end test |
| Poller affects next test | Interval not stopped | Call dispose/unmount and verify timer count or no more calls |
| Fake timer callback starts async work | Clock advanced synchronously only | Use \`advanceTimersByTimeAsync\` and await it |
| Retry timer fires after mock restore | Operation still owns scheduled retry | Await terminal success/failure before restoring mock |
| Timeout race leaves losing promise active | \`Promise.race\` does not cancel losers | Pass AbortSignal and verify cancellation |

\`Promise.race\` deserves special attention. Resolving a timeout race does not cancel the other operation. If the losing fetch later rejects without a handler, Vitest reports it. Production implementations should abort losing work or attach a deliberate observer that handles its terminal state.

## Treat subscriptions as two-sided contracts

Event listeners, observers, message ports, sockets, and reactive subscriptions all have setup and teardown. A test that asserts only the callback's happy path can leave the subscription active. When global state resets, its next notification throws from stale code.

Design APIs to return an unsubscribe function or disposable. In UI tests, unmount the component and verify callbacks no longer update state. With DOM libraries, use their cleanup mechanism. Restore \`window\`, \`globalThis\`, and module spies after each test so a later event does not call a stale mock.

Mock reset semantics matter. \`vi.clearAllMocks()\` clears call history but does not restore original implementations. \`vi.resetAllMocks()\` resets mocks, and \`vi.restoreAllMocks()\` restores spied properties where possible. Choose intentionally. The [complete vi.mock guide](/blog/vitest-mocking-vi-mock-complete-guide) covers hoisting and module-cache behavior that can otherwise look like an async leak.

If a listener callback is async, the emitter generally ignores its returned promise. The callback itself must catch expected failures or hand its promise to an error-aware supervisor. Tests should exercise that supervision path rather than attaching a process-level rejection handler that hides it.

## Trace background work back to its owner

Unhandled errors are difficult when the stack begins inside a library callback. Instrument the boundary where background work is created. Add a temporary label to queued jobs, timers, requests, and subscriptions. Capture a creation stack if necessary, but do so only during diagnosis because stack collection has cost.

Vitest does not ship a dedicated open-handle detector, so treat leaked-resource hunting as manual work: run the failing file in isolation, add teardown logging in \`afterEach\`/\`afterAll\`, and confirm every timer, socket, and pool you open is closed. A promise can reject late without leaving a long-lived handle, and a legitimate shared pool may look like a leaked resource when it is shared by design, so open handles are complementary evidence rather than proof.

Run with file parallelism disabled during debugging if interleaved output prevents attribution. This is a localization technique, not a permanent cure. Once the owner is found, restore normal concurrency and prove isolation.

Node flags and debugger breakpoints can also help. Break on uncaught exceptions and promise rejection. Put the breakpoint at the creation or first rejection, not only in Vitest's reporting layer. The test listed in the warning may be the one active when Vitest noticed the error, while the promise was created by an earlier test.

## Fix production swallowing and rethrowing patterns

Some unhandled rejections originate from an attempted logging pattern:

\`doWork().catch(error => { logger.error(error); throw error; });\`

The \`catch\` handles the original promise but creates a new rejected promise by rethrowing. If nobody awaits that returned chain, the new rejection is unhandled. Either return the chain to the caller, fully handle the error without rethrowing, or route it to a supervised task abstraction.

Likewise, \`void doWork()\` is not error handling. The \`void\` operator communicates intentional detachment to linters but does nothing at runtime. A fire-and-forget operation needs an owned error policy: queue with observable status, process supervisor, callback, or catch that records terminal failure without producing another rejected chain.

Tests should match the chosen contract. If a function returns a promise, await it and assert rejection. If it enqueues work, assert the queue receives a job and test the worker separately. If it intentionally logs and continues, spy on the logger and await whatever completion signal confirms the handler ran.

## Use process handlers only as diagnostics

Adding \`process.on('unhandledRejection', () => {})\` in test setup suppresses evidence and changes process-global behavior across files. Even a handler that logs can duplicate Vitest's own reporting and leak between tests. Do not use it as a fix.

A temporary diagnostic handler can record promise metadata when a minimal reproduction is impossible, but remove it afterward and avoid throwing from the handler. The durable repair remains local ownership. Similarly, mocking \`console.error\` does not handle a rejection. It only changes what humans see.

If a third-party package rejects after an operation you correctly awaited, reduce it to a standalone reproduction, confirm supported versions, and isolate the adapter. A targeted wrapper may catch a known benign shutdown rejection, but document the exact message and lifecycle condition. Broad catch-all logic will eventually swallow a real regression.

## Verify the repair, not just the disappearance

After changing an await or cleanup path, make the previously background outcome visible in assertions. A test that merely stops warning may still skip the behavior. Force the failure path: reject the mocked dependency, fire the late event, advance the retry timer, or close the socket. Confirm the test now fails for the right reason before applying the intended expectation.

Then run at three scopes: the individual test repeatedly, its file, and the normal suite with concurrency. Shuffle test order when shared state is suspected. Restore real timers and mocks even on failure by using hooks or \`try/finally\`. Check that the process exits promptly, because a silent open handle is a different leak worth fixing.

| Verification | Evidence of a real fix | Weak signal |
|---|---|---|
| Forced dependency rejection | Test catches and asserts exact failure | Warning simply absent on success path |
| Adjacent-file run | No cross-test callback or state contamination | Single test passes alone |
| Normal parallel run | Ownership holds under scheduling variation | Permanent serial mode hides issue |
| Resource teardown | Server, timer, or listener is demonstrably closed | Process eventually exits by timeout |
| Negative control | Removing await reproduces warning or failure | Code change has no observable test effect |

The principle is simple but strict: every asynchronous operation must have an owner that observes its completion. Vitest's warning is the audit finding. Resolve ownership and the suite becomes both quieter and more truthful.

## Cancel losing work with AbortSignal

Timeout helpers frequently use \`Promise.race\` and forget that the losing promise continues. A cleaner implementation gives the underlying operation an \`AbortSignal\`, aborts when the timeout wins, and still observes the operation's rejection. The test should prove both the public timeout error and the internal cancellation, otherwise the request can remain active after the test.

\`\`\`ts
import { expect, it, vi } from 'vitest';

async function fetchWithDeadline(url: string, milliseconds: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

it('aborts a request that exceeds its deadline', async () => {
  vi.useFakeTimers();
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted', 'AbortError'));
        });
      }),
  );

  try {
    const request = fetchWithDeadline('https://service.test/report', 500);
    await vi.advanceTimersByTimeAsync(500);
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  } finally {
    vi.useRealTimers();
    fetchMock.mockRestore();
  }
});
\`\`\`

This test attaches the rejection expectation before ending its lifetime and restores global state in \`finally\`. Production code may translate \`AbortError\` into a domain-specific deadline error; assert that public contract while retaining a cancellation spy. If the dependency ignores AbortSignal, you still need to observe its eventual completion or redesign the adapter so detached work has a supervisor.

## Frequently Asked Questions

### Why does Vitest report an unhandled error when every test passed?

The assertions Vitest associated with tests passed, but another async branch failed outside their awaited lifetimes. The warning prevents that detached failure from being ignored.

### Is dangerouslyIgnoreUnhandledErrors safe in CI?

It can allow the run to succeed despite unhandled failures, so it is unsafe as a general CI remedy. Prefer correcting or tightly isolating the source and keeping the default failure signal.

### Can an async mock implementation cause this warning?

Yes. A mock that rejects after its caller returns, or an async mock invoked by an unowned event callback, can escape. The caller must await the returned promise or supervise the callback.

### Why is the wrong test named in the error message?

Vitest can identify the test active when the error surfaced, which may differ from the test that created the timer, listener, or promise. Run neighboring tests together and trace creation ownership.

### Should I use Promise.all or await each operation separately?

Use \`Promise.all\` for independent concurrent work whose aggregate must succeed. Use sequential awaits when ordering, capacity, or shared mutable state matters. Both are valid because they return an observable completion boundary.
`,
};
