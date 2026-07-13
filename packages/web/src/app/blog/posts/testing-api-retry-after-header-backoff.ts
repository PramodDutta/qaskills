import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing Retry-After Headers and Client Backoff",
  description:
    "Test Retry-After headers and client backoff across seconds, HTTP dates, jitter, caps, malformed values, and deterministic timing without slowing the suite.",
  date: "2026-07-13",
  category: "API Testing",
  content: `
# Testing Retry-After Headers and Client Backoff

\`Retry-After: 120\` is not a request to run the same call 120 milliseconds later. It is a delay in seconds, and that unit mistake can turn a courteous client into a rate-limit amplifier. The alternative form, an HTTP date, introduces clock skew and rounding. Then the retry policy adds jitter, caps, attempt limits, and method safety. A useful test suite separates those decisions instead of sleeping in real time and hoping the request count looks plausible.

The HTTP field carries server guidance. Client backoff is the policy that interprets it alongside local rules. Test the parser, delay selection, scheduling, and externally visible request sequence as distinct layers. That structure makes boundary cases deterministic and lets failures identify whether syntax, arithmetic, or orchestration broke.

## Write the delay contract before the test matrix

RFC 9110 defines \`Retry-After\` as either an HTTP date or a non-negative decimal integer representing seconds after the response. Servers commonly use it with \`503 Service Unavailable\`; \`429 Too Many Requests\` also permits it to indicate how long to wait. Redirect responses can use it to communicate a minimum delay before a redirected request.

The standard does not define your client's full retry algorithm. You still need product decisions for absent or invalid values, maximum delay, maximum attempts, retryable methods, jitter, cancellation, and whether server guidance overrides or combines with exponential backoff.

| Input or condition | Recommended explicit contract | Why it needs a test |
|---|---|---|
| \`Retry-After: 7\` | Convert to 7,000 milliseconds | Prevent seconds-to-milliseconds defects |
| Future IMF-fixdate | Delay until that instant | Date parsing and current-time dependency matter |
| Date already in the past | Retry immediately or apply policy floor | Negative timers should not leak through |
| \`Retry-After: 1.5\` | Treat as invalid | Delay-seconds grammar is an integer |
| Empty or malformed field | Fall back to client backoff | Parsing failure must not disable attempt limits |
| Huge valid value | Clamp, fail fast, or surface to caller | Waiting days inside a request may violate product expectations |
| Request aborted while waiting | Cancel timer and make no next attempt | Resource cleanup and user intent matter |

“Retry immediately” should still pass through an asynchronous scheduling boundary if recursive synchronous retries could exhaust the stack or monopolize the event loop. A zero delay is policy, not permission for an unbounded loop.

## Parse delay-seconds without accepting JavaScript conveniences

\`parseFloat('3seconds')\` returns 3, which is not valid header syntax. Unary numeric conversion accepts whitespace and can turn an empty string into zero. Validate the complete trimmed field before conversion.

\`\`\`typescript
// retry-after.ts
export function parseRetryAfter(value: string | null, nowMs: number): number | null {
  if (value === null) return null;
  const trimmed = value.trim();

  if (/^\\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isSafeInteger(seconds)) return null;
    return seconds * 1_000;
  }

  const targetMs = Date.parse(trimmed);
  if (Number.isNaN(targetMs)) return null;
  return Math.max(0, targetMs - nowMs);
}
\`\`\`

This parser accepts date strings supported by the JavaScript runtime, which can be broader than the preferred HTTP date grammar. If strict conformance is required, use a dedicated HTTP-date parser or validate the IMF-fixdate structure before \`Date.parse\`. Do not create a home-grown calendar parser unless the interoperability benefit justifies it.

The parser returns milliseconds because browser and Node timers use milliseconds. The name and tests should make this unit explicit. Returning a branded duration type or an object such as \`{ milliseconds }\` can prevent accidental mixing in a larger TypeScript codebase.

## Lock seconds, dates, and invalid forms with a table test

Use an injected \`nowMs\` so date cases do not depend on the wall clock. A data table makes the accepted grammar visible without burying cases in orchestration setup.

\`\`\`typescript
// retry-after.test.ts
import { describe, expect, it } from 'vitest';
import { parseRetryAfter } from './retry-after';

describe('parseRetryAfter', () => {
  const now = Date.parse('Wed, 15 Jul 2026 10:00:00 GMT');

  it.each([
    ['0', 0],
    ['7', 7_000],
    [' 12 ', 12_000],
    ['Wed, 15 Jul 2026 10:00:30 GMT', 30_000],
    ['Wed, 15 Jul 2026 09:59:59 GMT', 0],
  ])('parses %s as %i milliseconds', (field, expected) => {
    expect(parseRetryAfter(field, now)).toBe(expected);
  });

  it.each([null, '', '1.5', '-2', 'soon', '3 seconds'])('rejects %s', (field) => {
    expect(parseRetryAfter(field, now)).toBeNull();
  });
});
\`\`\`

Include the exact date format your providers send in integration fixtures. HTTP dates are GMT. A locale-formatted date such as \`07/15/2026 10:00\` is not a portable substitute. Dates have one-second precision, so a client calculating against a millisecond clock naturally gets a non-round remainder. Decide whether scheduling rounds up, rounds down, or uses the exact difference, then test that choice.

## Decide how server guidance and exponential backoff combine

Assume the local exponential delay is \`base * 2^attempt\`. If the server says wait longer, ignoring it defeats the signal. If the local policy says wait longer, honoring only the smaller header can produce more traffic than the client considers safe. A conservative policy often chooses the maximum of the parsed header and local backoff, then applies a configured maximum.

Order matters:

1. Calculate deterministic local backoff for the next attempt.
2. Parse server guidance, falling back when invalid or absent.
3. Combine them according to policy, commonly \`max(local, server)\`.
4. Clamp the combined deterministic delay to the product maximum.
5. Apply bounded jitter without exceeding a hard maximum, if the maximum is contractual.

If jitter is applied before a cap, many high delays collapse to exactly the cap, eliminating dispersion. If a full jitter algorithm randomly selects between zero and the capped delay, it can schedule earlier than the server's minimum. That conflicts with treating Retry-After as a lower bound. One solution is to keep server guidance as a floor and randomize only an additional window. Another is to use positive-only jitter after the server floor and cap carefully.

| Combination rule | Traffic behavior | Suitable interpretation |
|---|---|---|
| Use server delay when valid | Closely follows provider instruction | Simple integrations with trusted guidance |
| \`max(server, exponential)\` | Never retries earlier than either policy | Conservative general-purpose client |
| Server delay plus random positive spread | Honors minimum and desynchronizes clients | Large fleets responding to one recovery time |
| Full jitter from zero to exponential | Strong dispersion but may undercut header | Only when Retry-After is not treated as a minimum |
| Fail if header exceeds maximum | Returns control instead of silently waiting | Interactive or latency-budgeted operations |

Document whether a cap can override the server's requested wait. Clamping \`Retry-After: 3600\` to 30 seconds and retrying is not “honoring Retry-After.” It may be a legitimate business rule, but the client should expose that it declined the wait, perhaps with a typed exhaustion error, rather than hammering early.

## Inject sleep and randomness into the retry loop

Fake timers can test scheduling, but dependency injection makes the policy runnable without coupling every case to a test framework's timer semantics. Pass \`sleep\`, \`now\`, and \`random\` functions. Production supplies the real implementations; tests record requested delays and resolve immediately.

\`\`\`typescript
// retrying-fetch.ts
import { parseRetryAfter } from './retry-after';

type Dependencies = {
  sleep: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
  now: () => number;
  random: () => number;
};

type RetryOptions = {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
};

export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  options: RetryOptions,
  dependencies: Dependencies,
): Promise<Response> {
  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    const response = await fetch(input, init);
    const retryable = response.status === 429 || response.status === 503;
    if (!retryable || attempt === options.attempts - 1) return response;

    const localDelay = options.baseDelayMs * 2 ** attempt;
    const serverDelay = parseRetryAfter(
      response.headers.get('retry-after'),
      dependencies.now(),
    );
    const floor = Math.max(localDelay, serverDelay ?? 0);
    const spread = floor * options.jitterRatio * dependencies.random();
    const delay = Math.min(options.maxDelayMs, floor + spread);
    await dependencies.sleep(delay, init.signal ?? undefined);
  }

  throw new Error('unreachable retry state');
}
\`\`\`

This particular algorithm adds non-negative jitter, so it never schedules earlier than the chosen floor unless the maximum itself is lower than the floor. The configuration should reject a maximum lower than acceptable server guidance or define the resulting fail-fast behavior. It retries only 429 and 503, not every error response.

The generic \`fetch\` body also needs replay analysis. A consumed streaming request body cannot necessarily be sent again. JSON strings are replayable, but uploads and streams may not be. Production code may require an init factory that produces a fresh body per attempt.

## Assert the request timeline without real waiting

Stub \`fetch\` with a sequence: 429 carrying delay seconds, 503 carrying a date, then success. Record calls to the injected sleep. Set randomness to a known value at each boundary, including zero and just below one. The test should assert both delay values and exactly three network calls.

\`\`\`typescript
// retrying-fetch.test.ts
import { afterEach, expect, it, vi } from 'vitest';
import { fetchWithRetry } from './retrying-fetch';

afterEach(() => vi.unstubAllGlobals());

it('honors Retry-After, adds deterministic jitter, and stops on success', async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '3' } }))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);

  const sleeps: number[] = [];
  const response = await fetchWithRetry(
    'https://api.example.test/jobs',
    { method: 'GET' },
    { attempts: 3, baseDelayMs: 1_000, maxDelayMs: 10_000, jitterRatio: 0.2 },
    {
      now: () => Date.parse('Wed, 15 Jul 2026 10:00:00 GMT'),
      random: () => 0.5,
      sleep: async (milliseconds) => {
        sleeps.push(milliseconds);
      },
    },
  );

  expect(response.status).toBe(200);
  expect(sleeps).toEqual([3_300, 2_200]);
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
\`\`\`

On attempt zero, server guidance of 3,000 milliseconds exceeds local 1,000, then ten percent effective positive jitter produces 3,300. On attempt one, the header is absent, local backoff is 2,000, and the same jitter produces 2,200. Writing out that arithmetic in the test name or comments prevents a future maintainer from “fixing” an intentional expected value.

## Test cancellation while the client is backing off

An aborted operation should not wait out the timer and issue another request. A production sleep can reject on an abort signal:

\`\`\`typescript
export function abortableSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}
\`\`\`

The production version should remove an abort listener if the timer completes first to avoid retaining references in long-lived signals. A test can provide a controllable sleep promise, abort after the first response, reject that promise, and assert \`fetch\` remains at one call. This catches loops that check cancellation only during the network request.

## Protect non-idempotent operations

Retrying a GET is usually simpler than retrying a payment-creation POST. The first response may have been generated after the server committed the operation, or an intermediary may lose the response. Retry-After says when, not whether, replay is safe.

Gate automatic retry by method and operation semantics. For non-idempotent creation, use a server-supported idempotency key and test that every attempt sends the same key while request payload remains equivalent. Test the server or a contract stub returning the original result for a duplicate key. Never generate a fresh key per attempt; that defeats deduplication.

The [API testing best practices guide](/blog/api-testing-best-practices-guide) provides the broader status, schema, and negative-case context. Backoff correctness cannot compensate for an unsafe operation contract.

## Validate date behavior against clock skew

For an HTTP-date value, subtracting the client wall clock can be wrong when the machine is ahead or behind the server. The response's \`Date\` header offers the origin's message-generation time when present. A client may calculate the delta between Retry-After and Date, while measuring the wait with a monotonic timer. That reduces wall-clock skew but adds policy questions when Date is missing, invalid, or inserted by an intermediary.

Test at least three modes: synchronized clocks, client 90 seconds ahead, and server Date absent. If using server Date, assert the exact precedence rule. Security-sensitive clients should also cap absurd future dates rather than accepting unbounded resource retention.

Fake wall clocks do not automatically simulate monotonic elapsed time. Keep parsing based on injected instants and scheduling based on injected sleep. Integration tests can verify the adapter between them.

## Exercise real headers without turning CI into a stopwatch

One HTTP-level test should confirm header casing, Fetch \`Headers\` access, and response construction through the actual client adapter. Keep server delays zero or very small and inject the scheduler where possible. Real multi-second waits make CI slower and still do not prove boundary arithmetic well.

Load tests ask a different question: do thousands of clients disperse retries, or do they synchronize into another surge? Seed or record pseudo-randomness for repeatability and analyze request arrival histograms. The [load testing CI/CD integration guide](/blog/load-testing-ci-cd-integration-guide) helps place that fleet-level check without forcing it into every unit pipeline.

Log retry attempt, chosen delay, status, parsed header category, and terminal outcome, but avoid logging credentials or full sensitive URLs. Observability should let operations distinguish “server asked for 60 seconds” from “client exponential policy chose 60 seconds.”

## Make retry budgets span the whole operation

Attempt count alone does not bound elapsed time. Three requests can exceed an interactive deadline if the first server response asks for ten minutes. Accept an operation deadline or maximum cumulative wait, then test that the client returns control before starting an attempt that cannot fit. A background worker may persist a next-attempt timestamp instead of holding a process and timer open.

The budget calculation should include network time already spent, scheduled delay, and ideally a reserved timeout for the next call. Use a monotonic clock for elapsed duration so a wall-clock adjustment does not extend or collapse the budget. HTTP-date parsing still needs wall time; keeping those clock roles separate prevents a time synchronization event from corrupting local duration enforcement.

Test the boundary where the chosen delay exactly equals remaining budget, one millisecond below it, and one above it. Decide whether equality permits sleeping and whether the next request needs its own minimum execution allowance. Return a structured terminal reason such as deadline exceeded before retry instead of presenting it as an HTTP failure from a request that never occurred.

Shared retry budgets also prevent nested clients multiplying attempts. If a repository layer retries three times and its HTTP transport retries three times, one business operation can make nine calls. Propagate one attempt or time budget through layers, and assert the total request count in an integration test. Place Retry-After interpretation at one owner boundary so two layers do not each sleep for the same response.

## Frequently Asked Questions

### Is Retry-After always expressed in seconds?

No. It is either a non-negative integer number of seconds or an HTTP date. Milliseconds and decimal seconds are not part of the field grammar.

### Should jitter ever make the client retry before the header delay?

Not if your contract treats Retry-After as a minimum. Use positive-only spread after the server floor, or otherwise constrain the jitter range so the scheduled value cannot fall below that floor.

### What should a client do with Retry-After: 999999999?

Apply an explicit product policy. A background worker might persist a future schedule, while an interactive client may return a typed “retry too late” result. Silently clamping and retrying early can violate server guidance.

### How do I test HTTP-date values without freezing all global timers?

Pass the parser an explicit current timestamp and inject the sleep function into orchestration. This isolates calendar arithmetic from scheduling and avoids framework-wide fake-timer side effects.

### Does a Retry-After header make POST retries safe?

No. It communicates timing only. Automatic POST replay needs operation-specific safety, usually a stable idempotency key and server deduplication semantics.
`,
};
