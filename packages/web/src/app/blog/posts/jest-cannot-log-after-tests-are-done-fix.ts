import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest “Cannot Log After Tests Are Done” Fix',
  description:
    'Fix Jest Cannot Log After Tests Are Done by tracing unawaited callbacks, owning timers and subscriptions, and proving teardown completes before exit.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Jest “Cannot Log After Tests Are Done” Fix

The green check appears, Jest prints the suite summary, and only then a callback writes “refresh complete.” Jest responds with “Cannot log after tests are done. Did you forget to wait for something async in your test?” The delayed log is not the underlying defect. It is the visible footprint of work that escaped the lifetime of the test that started it.

Treat the message as an ownership problem. Every promise, timer, event subscription, server, stream, retry loop, and background worker created by a test must either finish before the test resolves or be deliberately stopped during teardown. Removing \`console.log\` only hides the evidence. Adding \`--forceExit\` terminates the process without proving resources are clean.

The reliable repair is to locate the async boundary, make completion representable as a promise, await it, and release long-lived resources. The examples below use Jest's real timer, mock, hook, and promise APIs rather than arbitrary delays.

## Why Jest thinks the test has finished

Jest considers an ordinary synchronous test complete when its function returns. It considers an \`async\` test complete when the returned promise settles. A test using the callback form completes when it calls \`done()\`. Work scheduled but not connected to one of those completion signals continues independently.

| Escaped work | Typical coding mistake | Correct ownership signal |
|---|---|---|
| Promise chain | Function is called without \`await\` or \`return\` | Await or return the promise |
| Callback API | Test returns before callback executes | Wrap in a promise, or use \`done\` correctly |
| Timeout or interval | Timer is scheduled and never advanced or cleared | Fake timers, await completion, or clear in teardown |
| Event emitter | Listener remains after assertion | Await one event and unsubscribe |
| HTTP server | \`listen()\` has no matching close | Close server in \`afterAll\` and await callback |
| Observable subscription | Subscription outlives the spec | Unsubscribe in \`afterEach\` |
| Retrying client | Rejection schedules another attempt | Inject retry policy and stop or await it |

An \`async\` keyword alone does not solve this. If the body calls \`refreshCache()\` without awaiting it, the async test returns an already-resolved promise. Likewise, an assertion inside a detached \`.then()\` can fail after the runner has marked the test passed.

Read the warning's stack when available. The last application frame before \`console.log\` often identifies the callback, but you still need to find who scheduled it. Search for the invoked function, then follow the returned promise or cleanup handle back to the test.

## Repair floating promises at the call site

The most common case is a missing \`await\`. The following production function returns the promise produced by \`fetch\` and response parsing. The fixed test awaits that promise and makes the expected assertion count explicit.



\`\`\`ts
// refresh-user.ts
export async function refreshUser(
  fetchUser: () => Promise<{ id: string; active: boolean }>,
  onRefresh: (id: string) => void,
) {
  const user = await fetchUser();
  onRefresh(user.id);
  return user;
}

// refresh-user.test.ts
import { refreshUser } from './refresh-user';

test('reports the refreshed user before completing', async () => {
  expect.assertions(3);
  const onRefresh = jest.fn();

  const user = await refreshUser(
    async () => ({ id: 'user-42', active: true }),
    onRefresh,
  );

  expect(user.active).toBe(true);
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(onRefresh).toHaveBeenCalledWith('user-42');
});

test('surfaces a refresh rejection to the test', async () => {
  const refresh = refreshUser(
    async () => {
      throw new Error('directory unavailable');
    },
    jest.fn(),
  );

  await expect(refresh).rejects.toThrow('directory unavailable');
});
\`\`\`



Both \`await expect(promise).resolves...\` and \`return expect(promise).resolves...\` connect the matcher to the test lifecycle. Omitting both is a floating assertion. \`expect.assertions(n)\` helps detect branches that never run, particularly with rejection tests, although it does not substitute for awaiting.

If a function launches background work by design and returns \`void\`, change its interface when tests and callers need completion. Return a promise for one-shot work. For a daemon-like component, return an object with \`ready\` and \`stop()\`, or accept an \`AbortSignal\`. Observable lifecycle APIs are easier to operate in production too.

For deeper promise matcher and callback patterns, the [Jest async and await guide](/blog/jest-async-await-testing-promises-guide) covers resolved values, rejected values, and assertion counting.

## Convert callbacks without mixing completion styles

Node-style callbacks still appear in file, crypto, database, and legacy client APIs. Jest supports a \`done\` parameter, but mixing \`done\` with an \`async\` test creates two completion mechanisms and Jest rejects that pattern. Choose one.

For a small callback API, pass \`done\` and ensure every path calls it. Wrap assertions in \`try/catch\` so an assertion failure reaches \`done(error)\`. For application code, a promise wrapper is usually clearer because it composes with hooks and matchers.



\`\`\`ts
import { EventEmitter } from 'node:events';

function waitForEvent<T>(emitter: EventEmitter, eventName: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const onValue = (value: T) => {
      cleanup();
      resolve(value);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      emitter.off(eventName, onValue);
      emitter.off('error', onError);
    };

    emitter.once(eventName, onValue);
    emitter.once('error', onError);
  });
}

test('waits for the import completion event', async () => {
  const importer = new EventEmitter();
  const completed = waitForEvent<{ rows: number }>(importer, 'complete');

  queueMicrotask(() => importer.emit('complete', { rows: 12 }));

  await expect(completed).resolves.toEqual({ rows: 12 });
  expect(importer.listenerCount('complete')).toBe(0);
  expect(importer.listenerCount('error')).toBe(0);
});
\`\`\`



Register the listener before triggering the operation, or a fast emitter can fire between those statements. The wrapper removes both listeners on success and error. Without cleanup, later tests can receive old events and log after their own completion.

If the callback may never arrive, the test timeout is a final guard, not a synchronization strategy. Prefer an application timeout or abort mechanism whose behavior you can assert. A five-second Jest timeout only tells you that completion was absent.

## Take control of timers, retries, and debounced work

Timers frequently produce the message because a test asserts the immediate state while a debounce or retry remains scheduled. Jest fake timers make time explicit. Enable them for the relevant scope, trigger the behavior, advance timers using the async timer APIs when callbacks schedule promises, and restore real timers afterward.



\`\`\`ts
function createRetryingPoller(read: () => Promise<boolean>, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const run = async (): Promise<void> => {
    if (stopped) return;
    const complete = await read();
    if (!complete && !stopped) timer = setTimeout(run, delayMs);
  };

  return {
    start: run,
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

describe('retrying poller', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
  });

  test('stops polling after the third successful read', async () => {
    const read = jest
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const poller = createRetryingPoller(read, 1_000);

    await poller.start();
    await jest.advanceTimersByTimeAsync(2_000);

    expect(read).toHaveBeenCalledTimes(3);
    expect(jest.getTimerCount()).toBe(0);
    poller.stop();
  });
});
\`\`\`



The async advancement matters because each timer callback awaits \`read()\` before possibly scheduling another timer. Synchronous advancement can leave microtasks pending and create confusing partial progress.

Do not put \`jest.useFakeTimers()\` at global scope unless the whole suite is designed for it. Libraries may capture real timer references during import, and test environments can depend on timers for unrelated work. Restore timers in teardown even when the assertion fails, since hooks still run.

An interval is a stronger ownership smell than a timeout. Components that start intervals should expose a stop method or respond to abort. Calling \`jest.clearAllTimers()\` in \`afterEach\` can be a safety net, but it can also conceal that production code never stops its scheduler. Assert the stop behavior directly.

## Close servers, database pools, streams, and observers

Some escaped resources keep the Node process alive; others merely schedule a late callback. Jest's \`--detectOpenHandles\` option helps with the first category by using Node async hooks, and it runs tests serially as part of the diagnostic tradeoff. It is not a universal detector for every resolved-but-late callback.

Use lifecycle hooks that await cleanup. If \`server.close()\` uses a callback, wrap it in a promise. If a database pool exposes \`end()\` returning a promise, return or await it in \`afterAll\`. Remove observers and event listeners in \`afterEach\` when they are test-specific.

| Resource | Setup boundary | Teardown proof |
|---|---|---|
| HTTP server | Await listening before tests | Await close callback and confirm no connections |
| PostgreSQL pool | Create once for integration group | Await \`pool.end()\` in \`afterAll\` |
| Readable stream | Attach consumers inside test | Await end/close, destroy on error |
| RxJS subscription | Subscribe per test | Call \`unsubscribe()\` and assert final emission |
| DOM observer | Observe after render | Disconnect after assertion or unmount |
| Message consumer | Await ready before publishing | Await consumer disconnect |

Cleanup must be idempotent enough to handle partial setup. If \`beforeAll\` fails after allocating a port but before assigning the server variable, \`afterAll\` should safely test whether a resource exists. Avoid swallowing cleanup errors, because a close failure is a meaningful suite failure.

## Framework rendering can hide scheduled callbacks

React, Vue, and other UI libraries schedule effects beyond the immediate render call. Use their testing library's async queries and wait helpers so the test observes the final UI state, and unmount components through the framework-supported cleanup path. The warning may mention logging because an effect catches a request after unmount, but the defect could be an un-aborted fetch.

Prefer dependency injection over mocking \`console\`. Give the component a controllable client, resolve or reject it inside the test, await the visible state, then unmount. Add a separate test in which unmount happens first and assert that the request is aborted or its result is ignored without a state update.

Do not solve a rendering warning by calling \`await new Promise(setImmediate)\` repeatedly. That flushes only some task queues and encodes no product outcome. Await the heading, error message, callback, or completed request that defines readiness.

## A disciplined diagnostic sequence

Run the smallest failing file with \`--runInBand\` to remove cross-worker noise. If the process also hangs, add \`--detectOpenHandles\` for diagnosis. Do not commit \`--forceExit\` as the resolution. The [Jest open handles guide](/blog/jest-open-handles-flaky-tests-guide) distinguishes resource leaks from ordinary async assertion bugs.

Then use this sequence:

1. Temporarily fail on or capture the late console call so its stack is retained.
2. Identify the scheduler, not only the callback that logged.
3. Check whether the test returns or awaits the operation's promise.
4. Inspect timers, listeners, and subscriptions established by that operation.
5. Confirm \`beforeEach\`, \`afterEach\`, \`beforeAll\`, and \`afterAll\` return their asynchronous cleanup.
6. Use fake timers only when time is the source of nondeterminism.
7. Rerun the file repeatedly without force-exit or silent console mocks.
8. Run the surrounding suite to expose shared-resource interference.

Static analysis prevents many recurrences. TypeScript-aware rules that reject floating promises are especially valuable. Code review should question \`forEach(async ...)\`, because \`forEach\` does not await callback promises. Use \`Promise.all(items.map(async ...))\` for concurrent work or a \`for...of\` loop for sequential work.

## Fix the lifecycle, not the messenger

Spying on \`console.log\` can be useful when logging is the expected output, but replacing it with a no-op to suppress Jest's warning is counterproductive. The abandoned request or timer still exists. It may mutate shared fixtures, consume ports, or fail a subsequent test.

Similarly, increasing the test timeout helps only when the test already awaits legitimate slow work. It cannot connect a floating promise to the test. A short arbitrary sleep may appear to fix the suite until CI load exceeds that delay.

The durable invariant is simple: when a test completes, no work owned by that test can still produce an observable side effect. Make APIs expose completion and cancellation, await hooks, and assert resource shutdown. Jest's warning then disappears because the lifecycle is correct, not because the logger became quiet.

## Trace microtasks that survive a resolved outer promise

Not every late callback holds an open handle. Promise reactions and queued microtasks can run after an outer function has resolved if that function starts a nested chain without returning it. Open-handle detection may show nothing because microtasks are not a lingering socket or interval.

Consider a cache warmer that awaits a manifest download, starts one promise per asset, then returns without awaiting those asset promises. The test awaits the warmer and legitimately believes completion occurred. A later rejection handler logs after the spec. The repair belongs inside the warmer: return \`Promise.all()\` for all required assets, or explicitly model best-effort background warming with a lifecycle object and cancellation.

Code review should follow promise topology. A callback passed to \`map\` creates promises that need an aggregate. A promise created inside \`then\` must be returned from that callback. A \`finally\` callback that starts asynchronous cleanup must return its promise if callers should wait. Add a lint rule for floating promises, but retain behavioral tests because type information can be lost through \`void\` callbacks and third-party definitions.

## Keep cleanup failures attached to the test that owns them

Teardown can produce the same warning when a hook starts cleanup without awaiting it. An \`afterEach(() => client.disconnect())\` hook is correct only if the arrow implicitly returns the disconnect promise. Braces without \`return\` change that behavior. Prefer an explicit async hook with \`await client.disconnect()\` when clarity matters.

Do not put every resource into one global teardown. Per-test subscriptions belong in \`afterEach\`, suite servers in \`afterAll\`, and process-wide environment setup in Jest's configured global teardown. Matching scope prevents one spec from closing a resource while another still uses it.

When cleanup throws, let Jest report the hook failure. Catch only to add context or continue closing independent resources, then rethrow an aggregate error. A swallowed disconnect rejection often becomes a late log in the client library and makes the next suite inherit dirty state.

## Prove the repair under repetition and failure paths

A one-time pass is weak evidence for a timing defect. Run the focused test repeatedly under normal timers and include the branch that originally scheduled the callback. Force the operation to reject, time out, or be cancelled, then verify teardown still completes. Run the containing suite with its ordinary parallelism after serial diagnosis.

Remove temporary console spies and diagnostic flags before accepting the fix. The final test should pass without an arbitrary delay, force exit, or suppressed output. If a resource intentionally remains process-wide, document its owner and ensure Jest configuration, rather than an individual spec, controls its lifetime.

Test isolation supplies one final check. Run the repaired spec before and after a neighboring test that uses the same client or module singleton. Reverse their order with an explicit local test selection. If only one order passes, some state still crosses the lifecycle boundary. Reset mocks when call history is the shared state, restore spies when implementation replacement is the issue, and close the real resource when ownership is external. Clearing every mock cannot stop a socket or listener.

## Frequently Asked Questions

### Is “Cannot log after tests are done” always caused by console.log?

No. The console call is where Jest notices late activity. The cause is usually an unawaited promise, timer, event callback, subscription, or framework effect. Removing the log leaves the escaped work intact.

### Should I use --detectOpenHandles for this warning?

Use it as a diagnostic when the process does not exit or you suspect servers, sockets, or timers. It adds overhead and serial execution, and it may not identify a short-lived callback that logs after one test but finishes before process exit.

### Why did adding async to the test not fix it?

An async function only makes Jest wait for the promise that function returns. A nested operation still escapes if it is called without \`await\` or \`return\`. Follow every async call to the completion signal the test owns.

### Can I combine the done callback with await?

Do not use both completion styles in the same test. Either accept \`done\` and call it on every success or failure path, or return an async promise and await the callback through a promise wrapper.

### How do I find which test scheduled the late callback?

Run one test file serially, preserve the late call's stack, and narrow with \`test.only\` during local diagnosis. Trace backward from the logging callback to its timer, promise, listener, or subscription, then restore the full suite before committing.
`,
};
