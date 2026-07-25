import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'MCP API Timeout Testing',
  description:
    'MCP API timeout testing verifies AbortController deadlines, fetch cancellation, timer cleanup, HTTP errors, network failures, and tool error results.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'MCP API timeout testing',
  keywords: [
    'MCP API timeout testing',
    'AbortController MCP test',
    '10 second API timeout',
    'fetch cancellation test',
    'MCP timer cleanup',
    'MCP HTTP error message',
    'network error propagation',
    'MCP tool timeout result',
  ],
  relatedSlugs: [
    'mcp-search-filter-schema-drift-contract-tests',
    'mcp-search-response-normalization-contract-tests',
    'mcp-package-registry-version-drift-tests',
    'seed-skill-catalog-parser-regression-tests',
  ],
  sources: [
    'https://nodejs.org/api/globals.html#class-abortcontroller',
    'https://nodejs.org/api/test.html',
    'https://github.com/modelcontextprotocol/typescript-sdk',
  ],
  content: `
MCP API timeout testing verifies that a pending registry request is cancelled after the server's ten-second deadline and returned to the client as a clear tool error. The same suite must prove that successful, HTTP-error, and unrelated network paths clear their timers without changing the original failure.

The QASkills MCP server applies this policy inside \`fetchWithTimeout\`, before search, metadata, content, category, and leaderboard tools read a response. Start with the [QASkills MCP server guide](/blog/qaskills-mcp-server-guide) when you need the complete tool map, then use this tutorial to test the deadline contract itself.

## How Do You Write an AbortController MCP Test?

An AbortController MCP test should observe the signal passed to \`fetch\`, not merely expect a timeout string. The production helper creates one controller, schedules \`controller.abort()\` after \`DEFAULT_TIMEOUT_MS\`, forwards the signal through \`RequestInit\`, and clears the timer in a \`finally\` block. Each part is independently testable.

Node exposes \`AbortController\` and \`AbortSignal\` as globals. Calling \`abort()\` marks the signal as aborted and dispatches an abort event, but a mocked fetch will not reject unless the mock implements that behavior. The [Node AbortController documentation](https://nodejs.org/api/globals.html#class-abortcontroller) is the right contract for the signal transition.

Keep the helper behind a small module boundary or export it for a focused test. Importing the current MCP entry point also starts \`main()\` and connects a stdio transport, so a direct unit test needs module mocks before evaluation. A later refactor can move HTTP helpers into \`http-client.ts\`, but the test contract remains the same.

The following Vitest example creates a fetch promise that rejects with an \`AbortError\` only after the supplied signal aborts. It advances fake time exactly to the configured deadline and checks both cancellation and the translated message.

\`\`\`typescript
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout } from './http-client';

describe('fetchWithTimeout', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts a pending request after 10 seconds', async () => {
    vi.useFakeTimers();
    let observedSignal: AbortSignal | undefined;

    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        observedSignal = init?.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          observedSignal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        });
      }),
    );

    const request = fetchWithTimeout('https://qaskills.sh/api/skills');
    await vi.advanceTimersByTimeAsync(9_999);
    expect(observedSignal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(request).rejects.toThrow(
      'API request timed out after 10000ms for https://qaskills.sh/api/skills',
    );
    expect(observedSignal?.aborted).toBe(true);
  });
});
\`\`\`

This is an MCP API timeout testing unit, not a test of Node's timer implementation. It proves the server wires its chosen deadline to cancellation and gives callers a stable diagnostic. The broader [MCP server testing guide](/blog/mcp-server-testing-guide-2026) explains where that unit belongs beside protocol and transport checks.

## What Happens at the 10 Second API Timeout?

The 10 second API timeout starts when \`fetchWithTimeout\` schedules the timer, just before it calls \`fetch\`. At 10,000 milliseconds the callback invokes \`abort()\`. A standards-aware fetch then rejects with an error named \`AbortError\`, which the catch block converts into \`API request timed out after 10000ms for <url>\`.

That sequence defines three useful boundaries. At 9,999 milliseconds, a pending request should remain active. At 10,000 milliseconds, its signal should be aborted. After rejection settles, no timer should remain, which avoids a vague claim that the request "eventually failed."

Do not wait ten real seconds in a unit suite. Fake timers make MCP API timeout testing fast and deterministic, while an integration test can use a much shorter injected deadline. If the deadline remains a file constant, keep one narrow real-network smoke check outside the normal pull request path instead of slowing every run.

The current helper includes the full URL in its diagnostic. That helps identify whether search, content, or leaderboard access stalled, yet tests should use synthetic URLs without credentials. Query strings can hold user input or future tokens, so production logging may need redaction even when tool-facing errors retain a safe route.

Timeout starts before fetch resolves headers, not before a tool handler begins. JSON parsing happens after \`fetchWithTimeout\` returns its \`Response\`, so the present timer does not bound a body that stalls during \`response.json()\` or \`response.text()\`. Record that limit in the test name rather than claiming a whole-tool deadline.

| Boundary | Expected signal state | Expected promise state | Required assertion |
| --- | --- | --- | --- |
| 0 through 9,999 ms | Not aborted | Pending | No early cancellation |
| Exactly 10,000 ms | Aborted | Rejecting | Abort event reached fetch |
| After catch mapping | Aborted | Rejected | Clear timeout message |
| After finally | Aborted | Settled | Scheduled timer cleared |

MCP API timeout testing should fail if a refactor changes only the message but stops sending the signal. It should also fail if the signal is passed but the catch block masks every network error as a timeout. Those separate observations keep behavior and diagnostics aligned.

## How Should a Fetch Cancellation Test Model the Network?

A fetch cancellation test needs a controllable pending operation. Returning \`new Promise(() => {})\` is not enough because aborting the signal will not settle that promise. The mock must subscribe to \`signal.abort\` and reject with an error whose \`name\` is \`AbortError\`, matching the behavior that the helper detects.

Use the platform error shape rather than matching a browser-specific message. Node and browsers can phrase cancellation differently, while the name is the stable branch used by this code. When a test environment lacks \`DOMException\`, construct an \`Error\`, set its name to \`AbortError\`, and reject with it.

MCP API timeout testing also needs a race case where fetch resolves just before the deadline. Advance time to 9,999 milliseconds, resolve a valid response, and await the helper. Then advance beyond 10,000 and prove that no late abort affects completed work. This catches forgotten timer cleanup without relying only on spy counts.

A second race resolves fetch at the same scheduled time as the abort callback. Timer ordering can differ with how the mock schedules work, so define the intended rule explicitly. In most clients, whichever event settles the fetch promise first wins. Avoid a brittle test that assumes an undocumented scheduler order.

The [Node test runner documentation](https://nodejs.org/api/test.html) shows built-in timer mocking and function mocks for teams that do not use Vitest. The concept does not depend on a runner: control time, retain the signal, settle the fake network operation, and assert the public result.

For one integration layer, start a local HTTP server with an endpoint that never sends headers until the client disconnects. Inject a 50 millisecond timeout, call the endpoint, and record that the server sees a closed request. Keep generous runner time limits around that small value because loaded CI machines can delay timers.

Do not point cancellation tests at qaskills.sh. An external service introduces DNS, TLS, routing, and rate-limit variability that obscures the helper contract. Use the live service only for a separate availability check, while local MCP API timeout testing controls every relevant event.

## How Do You Verify MCP Timer Cleanup?

MCP timer cleanup must occur for success, HTTP failure, timeout, and a non-abort network exception. The production \`finally\` block is designed for all four paths, but a regression can move \`clearTimeout\` into one branch. A parameterized suite gives every outcome the same leak assertion.

Spy on \`clearTimeout\` only when the runner's fake-timer API makes that stable. A stronger behavioral check asks whether \`vi.getTimerCount()\` returns zero after each request settles. That assertion detects any timer left by the helper without coupling to the exact timer handle.

Successful requests deserve two cases: a response before the deadline and an immediate response. HTTP failures deserve a response with \`ok: false\`, a status, a status text, and a readable body. Network failures should reject immediately with their original error. Timeout has the pending signal-aware mock described earlier.

\`\`\`typescript
it.each([
  {
    name: 'success',
    fetchResult: () => Promise.resolve(new Response('{}', { status: 200 })),
    expected: 'resolve',
  },
  {
    name: 'HTTP failure',
    fetchResult: () => Promise.resolve(new Response('maintenance', { status: 503 })),
    expected: 'reject',
  },
  {
    name: 'network failure',
    fetchResult: () => Promise.reject(new TypeError('socket closed')),
    expected: 'reject',
  },
])('clears the timer after $name', async ({ fetchResult, expected }) => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn(fetchResult));

  const request = fetchWithTimeout('https://qaskills.sh/api/categories');
  if (expected === 'resolve') await expect(request).resolves.toBeInstanceOf(Response);
  else await expect(request).rejects.toBeInstanceOf(Error);

  expect(vi.getTimerCount()).toBe(0);
});
\`\`\`

Reset fake timers and globals in \`afterEach\`, even when an assertion fails. A leaked fake clock can make later tests pass or hang for the wrong reason. The [MCP server contract testing guide](/blog/mcp-server-contract-testing-guide) provides a useful model for keeping such cleanup inside isolated contract suites.

MCP API timeout testing should also verify that one completed call cannot cancel a later call. Start request A, let it succeed, then start request B and advance beyond A's former deadline but before B's deadline. Request B must remain pending because each invocation owns a distinct controller and timer.

## What Should an MCP HTTP Error Message Contain?

An MCP HTTP error message should identify status, URL, and useful response detail without erasing the server's body. The current helper reads \`response.text()\`, falls back to an empty string if body reading fails, and chooses body text before \`statusText\`. It then throws a normal \`Error\`.

Test a JSON-looking body, plain text body, empty body, and body-read failure. The helper does not parse an error object, so an API body like \`{"error":"not found"}\` appears as raw text. That is current behavior. A future structured formatter should arrive with versioned assertions rather than an unnoticed snapshot change.

For an empty body, build the response with a meaningful \`statusText\` or use a small response double. Some test runtimes do not retain a custom status text exactly as browsers do. Assert the branch's selected detail and avoid depending on incidental punctuation from the platform.

The expected pattern is \`API request failed with status 503 for <url>: maintenance\`. This is distinct from the timeout message and from an original network error. MCP API timeout testing should classify all three so operators know whether the server responded, the deadline fired, or transport failed before any HTTP response.

Body text can contain sensitive upstream diagnostics. The QASkills API should already return safe public errors, but tests should include a review note about redaction. Do not add a real token, email, or database message to a fixture simply to prove interpolation.

At the tool boundary, the thrown HTTP error becomes a text content item prefixed with \`Error:\`, with \`isError: true\`. The HTTP helper test should verify the thrown string, while the tool test verifies protocol-safe mapping. Separating those assertions shows which layer broke.

Use one small response helper so each case states only the fact that changes. The helper can set status, status text, and body text with safe local data. This keeps the test clear when the API adds a new error field. It also stops each case from building a large mock by hand.

Add a body-read fault with a response double whose \`text()\` call rejects. The current code then uses \`statusText\` as the last useful detail. This case proves a bad error body does not hide the HTTP status. It also checks that the request timer has still been cleared.

## How Do You Preserve Network Error Propagation?

Network error propagation means an unrelated rejection keeps its type and message. The catch block only replaces errors whose \`name\` equals \`AbortError\`. A \`TypeError('fetch failed')\`, DNS error, TLS error, or custom test exception should pass through unchanged.

Use identity when possible. Create one error object, make fetch reject with it, and expect the helper rejection to be that same object. Message matching alone can miss a wrapper that discards \`cause\`, stack, and custom fields.

\`\`\`typescript
it('preserves a non-abort network error', async () => {
  vi.useFakeTimers();
  const networkError = Object.assign(new TypeError('fetch failed'), {
    cause: { code: 'ECONNRESET' },
  });
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(networkError));

  const request = fetchWithTimeout('https://qaskills.sh/api/skills');

  await expect(request).rejects.toBe(networkError);
  expect(vi.getTimerCount()).toBe(0);
});
\`\`\`

Add a deceptive error named \`AbortError\` that fetch rejects immediately before the timer fires. The present implementation will label it as a timeout even if another caller supplied an already-aborted signal through \`init\`. That is a known classification boundary and a useful test target if the helper later accepts caller signals.

The helper currently overwrites \`init.signal\` with its own signal because the spread occurs before \`signal: controller.signal\`. Tests should not claim composed cancellation. If user cancellation becomes a requirement, use \`AbortSignal.any()\` or explicit event forwarding and add a separate message for caller aborts.

MCP API timeout testing benefits from error tables rather than one broad snapshot. Store expected source, public message, timer state, and tool mapping for each case. That data supports focused failures when only one contract changes.

The [QA skills directory](/skills) includes HTTP, contract, and Playwright skills that can extend these cases into API and browser flows. Install the verified [Playwright CLI skill](/skills/Pramod/playwright-cli) when the same release needs browser-level evidence after MCP client tests pass.

## How Do You Return an MCP Tool Timeout Result?

An MCP tool timeout result is not a rejected tool-handler promise in this server. Each handler wraps its request in \`try/catch\` and returns \`errorResult(error)\`. That mapper creates one text content item and sets \`isError: true\`, which lets an MCP client display the failure as a tool error.

The official [MCP TypeScript SDK repository](https://github.com/modelcontextprotocol/typescript-sdk) is the source for server registration and result types. Keep tests at the registered handler boundary so a local helper change cannot accidentally produce an invalid protocol object.

Mock \`fetch\` as pending, invoke \`search_skills\` through a captured registered handler, advance time, and inspect the returned object. The expected text begins \`Error: API request timed out after 10000ms\` and contains the encoded API URL. It should not throw out of the handler.

Different tools build distinct URLs before reaching the same helper. Cover search because it includes query parameters, then select one content tool because it encodes a slug into the path. This proves timeout mapping without duplicating six nearly identical tests.

MCP API timeout testing should assert protocol shape separately from full text. Check \`isError\`, content length, item type, and a stable message fragment. Exact URL assertions belong in URL-building tests, while the timeout test can verify the route and deadline.

Do not turn every application-level empty response into an MCP error. A valid search result with zero skills is still successful output. The timeout path is reserved for a request that did not reach a successful HTTP response before its deadline.

## Run the Timeout Procedure

Use a staged procedure so failures point to one layer. Run unit cases on every MCP change, then protocol cases before packaging, and reserve local-server cancellation for a smaller integration lane.

1. Export or isolate \`fetchWithTimeout\` without changing its public behavior, and reset all mocks after each test.
2. Replace fetch with a signal-aware pending promise, enable fake timers, and assert no abort at 9,999 milliseconds.
3. Advance one millisecond, verify the signal aborts, and expect the exact ten-second timeout diagnostic.
4. Add success, HTTP failure, and network failure rows, then require zero pending timers after each settles.
5. Capture an MCP tool handler, drive the same timeout, and assert a text result with \`isError: true\`.
6. Run one local HTTP cancellation case with an injected short deadline, then keep it outside flaky external networks.
7. Build the MCP package and run the focused suite again against compiled output before publishing.

Record the result by contract, not only by test-file count. A useful report names cancellation, cleanup, HTTP diagnostics, propagation, and tool mapping. That structure makes a regression actionable when only one branch fails.

If tests hang, inspect whether the fetch double listens for abort and whether fake timers advance asynchronously. If the request rejects too early, confirm no previous test left an aborted signal or mocked clock. The [MCP server testing guide](/blog/mcp-server-testing-guide-2026) can help isolate protocol setup from this HTTP concern.

Keep a small map from each MCP tool to the route it calls. Search uses \`/api/skills\`, while skill content uses an encoded slug path. Categories and the leaderboard use their own read routes. This map helps the timeout suite pick two useful tools without copying all six cases.

The search case should pass a query with a space and one filter. The captured URL then proves the same request reached the timeout helper. The content case should pass a slug with safe punctuation and check path encoding. These facts link the helper test to real QASkills calls.

Run the unit suite with one worker at least once during test setup. Fake clocks are local to a worker, but shared global fetch mocks can leak through poor cleanup. A clean single-worker run gives a plain base for later parallel runs. Both modes should yield the same set of results.

Store the route, deadline, error kind, and timer count in the test report. Do not store search text or full response bodies. These four facts are enough to show where the call failed. They also keep the report safe to share in a pull request.

MCP API timeout testing should run when \`packages/mcp/src/index.ts\` or its fetch helper changes. It should also run after an SDK or Node update. A platform change can alter abort error shape even when repo code stays still. The [error handling testing guide](/blog/error-handling-testing-patterns) gives more cases for safe failure text.

One final check should start two calls at the same time. Let the first call end at once, while the second call stays pending. Move the clock past the first deadline and keep the second call alive. Then move to its own deadline and expect one abort for that call.

## How Can You Avoid Flaky Real-Time Tests?

Avoid flaky real-time tests by controlling time for units and controlling the server for integrations. A sleep-based test that waits 10,100 milliseconds is slow, consumes CI capacity, and can still fail when the process pauses. Fake timers make the deadline a state transition rather than a race against a loaded machine.

Do not assert that a 50 millisecond integration timeout completes between 50 and 55 milliseconds. Event loops, coverage instrumentation, and process scheduling add delay. Assert cancellation occurs before a generous outer test timeout and that the local server observes disconnection.

Keep only one owner for each clock. Mixing Node mock timers, Vitest fake timers, and ad hoc promise schedulers in one case makes event order hard to reason about. Flush microtasks after advancing time because fetch rejection and catch mapping settle through promises.

Never leave a pending promise after a failed assertion. Put request settlement and mock restoration in cleanup paths. A suite that exits with open handles is itself evidence of incomplete MCP timer cleanup, but the diagnostic should identify the helper rather than timing out the whole worker.

MCP API timeout testing should not depend on internet access. Official docs are design references, while fixtures reproduce the relevant platform behavior locally. That split keeps tests fast and still aligns cancellation semantics with the platform contract.

## Apply MCP API Timeout Testing Before Release

MCP API timeout testing is complete when it proves cancellation at 10,000 milliseconds, zero timer leaks on every exit, distinct HTTP and network diagnostics, and a valid MCP tool error result. Those checks protect users from hanging agent calls without hiding the reason a request failed.

Add the focused suite beside the [MCP server contract testing guide](/blog/mcp-server-contract-testing-guide), then include its result in the package release gate. Teams can discover more QA automation patterns in [QASkills](/skills) and use the [Playwright CLI skill](/skills/Pramod/playwright-cli) for browser evidence that follows a successful MCP workflow.

## Frequently Asked Questions

### Should an MCP timeout test wait ten real seconds?

No. Use fake timers for the unit contract and inject a short deadline for a local integration case. Real ten-second sleeps make pull requests slow and still vary under load. Keep a separate availability monitor if you need to observe production latency, because that monitor answers a different question.

### Why must the fetch mock listen to the abort signal?

Calling \`AbortController.abort()\` changes the signal, but an arbitrary promise does not reject automatically. A signal-aware mock reproduces fetch cancellation by rejecting with an \`AbortError\`. Without that listener, the request remains pending and the test measures a defective mock rather than the production timeout mapping.

### Does the current deadline cover response body parsing?

No. The helper clears its timer after fetch resolves a \`Response\`, before \`getJson\` or \`getText\` consumes the body. A stalled body can therefore outlive the present deadline. Name the test accordingly and add a body-level signal or outer operation deadline if that risk matters.

### Should HTTP 500 and timeout return the same MCP error?

Both use an MCP result with \`isError: true\`, but their text should remain distinct. An HTTP 500 proves the API responded with a failure, while timeout means no acceptable response arrived by the deadline. Preserving that difference speeds diagnosis and supports accurate operational metrics.

### What should happen to an unrelated fetch error?

The original error should propagate through \`fetchWithTimeout\`, then the tool handler should convert its message into an MCP error result. Test object identity at the helper layer and protocol shape at the handler layer. This catches wrappers that erase useful cause, code, or stack information.

### How many timeout cases belong in the release gate?

At minimum, include pending cancellation, just-before-deadline success, HTTP body error, empty HTTP error, unrelated network failure, timer cleanup, and tool-result mapping. Add one local cancellation integration case when practical. Together they cover the behavior without duplicating every registered MCP tool.
`,
};
