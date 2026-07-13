import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mock fetch() and AbortController in Jest',
  description:
    'Mock fetch() and AbortController in Jest to test cancellation, AbortError handling, signal wiring, cleanup, and late-response races without real HTTP calls.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Mock fetch() and AbortController in Jest

Cancellation is observable behavior, not merely a rejected promise. The code must pass the controller's signal to \`fetch()\`, call \`abort()\` at the right lifecycle boundary, classify an abort differently from a server failure, and prevent a late response from updating stale state. A mock that only returns \`Promise.reject(new Error())\` exercises almost none of that contract.

Modern Node releases provide web-compatible \`fetch\`, \`AbortController\`, \`AbortSignal\`, \`Response\`, and \`DOMException\`. Jest runs in either a Node or jsdom environment depending on configuration. Before adding polyfills, inspect the actual test runtime. The examples below assume those globals exist and use Jest's supported mock functions to replace only \`globalThis.fetch\`.

## The cancellation contract has four moving parts

Consider a search function that accepts an external signal. Its caller owns cancellation, while the function owns HTTP and error mapping.

\`\`\`typescript
// search.ts
export type SearchResult = { id: string; title: string };

export async function searchCatalog(
  query: string,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  const response = await fetch(
    \`/api/search?q=\${encodeURIComponent(query)}\`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(\`Search failed with HTTP \${response.status}\`);
  }

  const body = (await response.json()) as { results: SearchResult[] };
  return body.results;
}
\`\`\`

There are separate properties to verify:

| Contract surface | Useful assertion | A misleading substitute |
|---|---|---|
| Signal propagation | \`fetch\` received the exact signal instance | Controller was constructed somewhere |
| Abort initiation | Lifecycle code called \`controller.abort()\` | Promise happened to reject |
| Abort classification | AbortError follows the cancellation branch | Any error is swallowed |
| Stale-result defense | Earlier completion cannot overwrite latest state | The HTTP request was cancelled in one runtime |

The platform abort mechanism helps conserve work, but correctness should not depend exclusively on the server or fetch implementation stopping instantly. Application code may still need request identity checks when a result can race with a newer request.

## Use a real AbortController and a signal-aware fetch mock

Mocking the controller itself is usually unnecessary. A real controller has the exact event semantics the code uses, including an already-aborted signal and a synchronous \`abort\` event. Replace \`fetch\` with a mock implementation that listens to the received signal and rejects with an AbortError.

\`\`\`typescript
// search.test.ts
import { afterEach, expect, jest, test } from '@jest/globals';
import { searchCatalog } from './search';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.restoreAllMocks();
});

test('rejects with AbortError when the caller aborts', async () => {
  const fetchMock = jest.fn<typeof fetch>((_input, init) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      const rejectAbort = () => {
        reject(new DOMException('The operation was aborted', 'AbortError'));
      };

      if (signal?.aborted) {
        rejectAbort();
        return;
      }

      signal?.addEventListener('abort', rejectAbort, { once: true });
    });
  });
  globalThis.fetch = fetchMock;

  const controller = new AbortController();
  const pending = searchCatalog('headphones', controller.signal);
  controller.abort();

  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/search?q=headphones',
    { signal: controller.signal },
  );
  expect(controller.signal.aborted).toBe(true);
});
\`\`\`

This mock intentionally never resolves on its own. The test causes the only terminal event by aborting. It checks the signal by identity, which catches code that creates a second unrelated controller or omits the option.

Using \`DOMException\` with the name \`AbortError\` mirrors the common fetch rejection shape. Production code should normally branch on \`error instanceof DOMException && error.name === 'AbortError'\` when the runtime guarantees DOMException, or cautiously inspect \`name\` across supported runtimes. Do not assert the message because browsers and runtimes may word it differently.

The distinction between replacing behavior and setting a one-off implementation is explored in the [Jest mock versus mockImplementation guide](/blog/jest-mock-vs-mockimplementation-guide). If async work survives the test boundary and writes to the console, the [cannot log after tests are done fix](/blog/jest-cannot-log-after-tests-are-done-fix) addresses teardown and missing awaits.

## Test an already-aborted signal

An abort event is not replayed for listeners added after \`abort()\`. A faithful mock must inspect \`signal.aborted\` before registering its listener. Otherwise a function called with a pre-aborted signal hangs forever in the test even though real fetch rejects.

\`\`\`typescript
test('does not start useful work with an already-aborted signal', async () => {
  globalThis.fetch = jest.fn<typeof fetch>((_input, init) => {
    const signal = init?.signal;
    if (signal?.aborted) {
      return Promise.reject(
        new DOMException('The operation was aborted', 'AbortError'),
      );
    }
    return Promise.resolve(new Response('{"results":[]}', { status: 200 }));
  });

  const controller = new AbortController();
  controller.abort();

  await expect(
    searchCatalog('camera', controller.signal),
  ).rejects.toHaveProperty('name', 'AbortError');
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});
\`\`\`

Whether \`fetch\` is invoked at all depends on application design. The sample delegates pre-abort behavior to fetch, so one call is correct. A wrapper that begins with \`signal.throwIfAborted()\` would reject before fetch and should assert zero calls. Test the chosen contract, not a universal call count.

## Exercise the consumer's AbortError branch

Most UI code does not expose raw cancellation as an error. It may keep the previous results, suppress an error banner, and mark the request idle. The negative branch deserves a separate test from the transport primitive.

\`\`\`typescript
// load-search.ts
import { searchCatalog, type SearchResult } from './search';

type SearchState =
  | { status: 'loaded'; results: SearchResult[] }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

export async function loadSearch(
  query: string,
  signal: AbortSignal,
): Promise<SearchState> {
  try {
    return { status: 'loaded', results: await searchCatalog(query, signal) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { status: 'cancelled' };
    }
    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown search error',
    };
  }
}
\`\`\`

Now use one-off rejected values. Here the goal is error mapping rather than signal mechanics, so a direct rejection is appropriate.

\`\`\`typescript
// load-search.test.ts
import { afterEach, expect, jest, test } from '@jest/globals';
import { loadSearch } from './load-search';

afterEach(() => jest.restoreAllMocks());

test('maps cancellation separately from network failure', async () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');
  fetchSpy
    .mockRejectedValueOnce(new DOMException('cancelled', 'AbortError'))
    .mockRejectedValueOnce(new TypeError('fetch failed'));

  const first = await loadSearch('first', new AbortController().signal);
  const second = await loadSearch('second', new AbortController().signal);

  expect(first).toEqual({ status: 'cancelled' });
  expect(second).toEqual({ status: 'failed', message: 'fetch failed' });
});
\`\`\`

This test would be weaker if production caught every exception and returned \`cancelled\`. Users should not lose visibility of DNS failures, invalid TLS, programming errors, or server responses merely because cancellation is expected sometimes.

## Verify timeout-driven abort with fake timers

When application code creates its own controller for a request timeout, fake timers let the test advance exactly to the boundary. The fetch mock must remain signal-aware, and the test must attach its rejection assertion before advancing to avoid an unhandled rejection warning.

\`\`\`typescript
// fetch-with-timeout.ts
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
\`\`\`

\`\`\`typescript
// fetch-with-timeout.test.ts
import { afterEach, expect, jest, test } from '@jest/globals';
import { fetchWithTimeout } from './fetch-with-timeout';

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('aborts fetch when the request timeout expires', async () => {
  jest.useFakeTimers();
  let capturedSignal: AbortSignal | null = null;

  jest.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
    capturedSignal = init?.signal ?? null;
    return new Promise<Response>((_resolve, reject) => {
      capturedSignal?.addEventListener(
        'abort',
        () => reject(new DOMException('timed out', 'AbortError')),
        { once: true },
      );
    });
  });

  const result = expect(fetchWithTimeout('/slow', 2_500)).rejects.toHaveProperty(
    'name',
    'AbortError',
  );
  await jest.advanceTimersByTimeAsync(2_500);

  await result;
  expect(capturedSignal?.aborted).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});
\`\`\`

The \`finally\` block is important on both success and failure. Checking the timer count catches a leaked timeout that could keep a process alive or abort unrelated logic after the request has already resolved.

If the code uses \`AbortSignal.timeout()\`, test observable rejection rather than spying on an internal controller that no longer exists. Runtime support varies, so the project should declare its minimum Node and browser versions rather than silently changing behavior in tests.

## Prove successful responses clear the abort timer

Cancellation tests tend to focus on the slow path. A successful request before the deadline must also clear its timer and parse normally. Construct a real \`Response\` when the runtime provides it, because that exercises \`ok\`, \`status\`, headers, and body methods consistently.

\`\`\`typescript
test('returns an early response and removes the timeout', async () => {
  jest.useFakeTimers();
  const response = new Response('{"status":"ready"}', {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
  jest.spyOn(globalThis, 'fetch').mockResolvedValue(response);

  const received = await fetchWithTimeout('/ready', 10_000);

  expect(received).toBe(response);
  expect(await received.json()).toEqual({ status: 'ready' });
  expect(jest.getTimerCount()).toBe(0);
});
\`\`\`

A hand-built object such as \`{ ok: true, json: jest.fn() }\` is fine when a unit only uses those fields. A real Response is better when redirects, status text, headers, clone behavior, or one-shot body consumption matter. Choose the smallest double that preserves the relevant semantics.

## Model superseded requests, not only isolated aborts

Search-as-you-type usually cancels a previous request when a new query begins. The difficult defect is stale completion: request A starts, request B starts and wins, then request A resolves late and overwrites B. Some mock implementations remove A entirely when aborted, which hides the need for request identity defense in code that also runs with non-cooperative adapters.

A deferred promise helper lets the test settle requests in any order:

\`\`\`typescript
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('a newer request can be completed before an older request', async () => {
  const older = deferred<Response>();
  const newer = deferred<Response>();
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockImplementationOnce(() => older.promise)
    .mockImplementationOnce(() => newer.promise);

  const oldCall = searchCatalog('lap', new AbortController().signal);
  const newCall = searchCatalog('laptop', new AbortController().signal);

  newer.resolve(new Response('{"results":[{"id":"2","title":"Laptop"}]}'));
  await expect(newCall).resolves.toHaveLength(1);

  older.resolve(new Response('{"results":[]}'));
  await expect(oldCall).resolves.toEqual([]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
\`\`\`

This low-level function returns both results, which is correct. A controller or hook above it should decide that only the newest result updates state. Test that owner with the deferred ordering. Cancellation and “latest request wins” are related defenses, not identical guarantees.

## Pick the mock boundary deliberately

There are several credible ways to test fetch behavior. They cover different risks.

| Technique | Runs real fetch implementation | Simulates AbortSignal events | Good fit |
|---|---:|---:|---|
| \`jest.spyOn(globalThis, 'fetch')\` | No | Only if implementation models them | Small unit tests and call assertions |
| Signal-aware custom mock | No | Yes | Cancellation and timeout branches |
| Mock Service Worker | Yes, request interception around fetch | Closer to runtime | Client integration tests with reusable handlers |
| Local HTTP server | Yes | Yes | Streaming, sockets, headers, and end-to-end abort behavior |
| Browser test | Browser implementation | Yes | User-visible cancellation and navigation lifecycle |

Do not force all semantics into a Jest function mock. If the feature depends on cancelling a streaming response body after headers arrive, a local server or browser test is more credible. Keep fast unit coverage for branch logic and add one integration test for the platform behavior you most need to trust.

## Avoid global mock leakage

Assigning \`globalThis.fetch = jest.fn()\` changes shared process state. Restore it after every test, even when an assertion fails. \`jest.spyOn(globalThis, 'fetch')\` plus \`jest.restoreAllMocks()\` is convenient when fetch already exists. Manual assignment needs a saved original value.

Jest's \`clearAllMocks\`, \`resetAllMocks\`, and \`restoreAllMocks\` are not interchangeable. Clearing removes recorded calls but preserves implementations. Resetting also removes mock implementations. Restoring puts spied properties back. A suite that resets globally and expects a default fetch response in later tests will behave differently from one that only clears.

Avoid enabling fake timers for an entire file when only one timeout scenario needs them. Fake timing can affect promise scheduling, libraries, and unrelated code. Return to real timers in teardown and await every promise created by the test. An unresolved fetch mock may not hold Node open, but dangling listeners and late callbacks still make failures confusing.

## Abort after headers and during body consumption

Fetch has more than one await point. The initial promise can resolve after response headers arrive, while reading \`response.json()\`, \`text()\`, or a stream continues. An abort can happen after code has a Response but before the body is consumed. A mock that resolves a complete in-memory Response immediately cannot reproduce that phase.

If body cancellation matters, create a \`ReadableStream\` whose producer observes the signal, place it in a Response, and delay later chunks. Integration behavior can differ between Node and browsers, so keep one browser-level case for a feature that depends on partial rendering or download interruption.

State the product rule for partial data. JSON parsers should normally reject rather than return half an object. A progressive text UI may keep approved segments, show a cancelled indicator, or clear the draft. Assert that user contract as well as AbortError.

## Compose caller cancellation with an internal deadline

Real functions often accept a caller signal and impose an internal timeout. Creating only a private controller ignores navigation or component cleanup. Forwarding only the caller signal leaves the request unbounded. Signal-composition APIs exist in modern environments, but support must match the project's runtime matrix.

A portable implementation can create a controller, listen once to the caller, start a timeout, and remove both listener and timer in \`finally\`. Tests should cover caller abort first, timeout first, successful completion, and an already-aborted caller. Assert that one terminal path does not fire the other later.

This is a good place for table-driven tests because the same outcome has distinct causes. Preserve a cancellation reason if the application uses it, but do not depend on runtime-specific messages.

## Avoid asserting controller internals

Tests sometimes spy on the global AbortController constructor and count instances. That couples the suite to implementation. Refactoring from a manual timeout controller to a composed signal changes construction without changing behavior.

Prefer boundary assertions: the exact signal reaches fetch, aborting the owner produces the documented state, timers are cleared, and no late update occurs. Constructor spying is appropriate only when the controller is the explicit dependency seam. Even then, a fake must implement \`signal.aborted\`, event registration, and idempotent abort, otherwise it is less faithful than the native object.

## Frequently Asked Questions

### Should I mock AbortController itself in Jest?

Usually no. Use the runtime's real controller and mock fetch so it reacts to the real signal. Mock the controller only when construction or a wrapper around it is the explicit unit boundary, because a simplistic fake can get abort events and the \`aborted\` flag wrong.

### Why does my mocked fetch ignore controller.abort()?

A Jest mock function does not inherit fetch semantics. If it returns a never-settling or already-resolved promise without listening to \`init.signal\`, aborting has no effect. Add an abort listener and handle a signal that was already aborted.

### Is AbortError always an instance of DOMException?

Web-compatible fetch implementations commonly reject with a DOMException named \`AbortError\`, but libraries and older runtimes may use another error class with the same name. Define the environments your code supports and make classification as broad as necessary, while avoiding a catch-all that hides real failures.

### Can I use mockRejectedValueOnce for an abort test?

Yes when testing how consumer code maps an AbortError. It is insufficient when the test must prove signal propagation or that calling \`abort()\` causes rejection. Use a signal-aware implementation for those mechanics.

### Why should the timeout test assert that no timers remain?

The assertion verifies cleanup on every exit path. A forgotten timer can keep the Jest process active, fire after the test, or call abort after a successful response. It catches a lifecycle bug that checking the returned value alone misses.
`,
};
