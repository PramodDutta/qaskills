import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Long Polling Timeout Behavior Without Flaky Sleeps',
  description: 'Learn API testing long polling timeout behavior with deterministic clocks, disconnect checks, proxy budgets, and runnable Node tests that prevent flaky releases.',
  date: '2026-08-08',
  category: 'API Testing',
  content: `
# API Testing Long Polling Timeout Behavior Without Flaky Sleeps

API testing long polling timeout behavior requires controlling three outcomes: an event arrives before the hold period ends, no event arrives and the server completes normally, or the client disconnects and the server cancels its work. A useful test asserts the response contract, elapsed-time window, resource cleanup, and retry semantics for each outcome. It does not sleep for the full production timeout and hope the scheduler behaves.

The practical approach is to make the long-poll duration configurable, inject a clock or timer scheduler into the waiting component, and reserve a small number of real-network tests for socket and proxy behavior. Unit tests advance virtual time instantly. API tests use short but realistic millisecond budgets. Deployment tests confirm that gateway, load balancer, server, and client timeouts are ordered correctly.

## Start with a precise long-poll protocol

Long polling is an HTTP request that the server holds while waiting for new state. The request ends when data becomes available, the application hold period expires, the client cancels, or infrastructure terminates the connection. The client then usually issues another request. This differs from ordinary polling because the server avoids returning repeated empty responses during the hold period.

A testable protocol states what an empty completion means. For example, \`200\` with \`events: []\` may mean "no event yet, retry immediately with the same cursor." A \`204\` response may carry the same meaning but cannot contain a JSON body. Some APIs use \`304\` with validators, although that status belongs to conditional request semantics and should not be adopted casually. A gateway-generated \`504\` is not an application-level empty result.

| Outcome | Example response | Cursor rule | Client action |
|---|---|---|---|
| Event available | 200 with one or more events | Advance to last committed event | Process, then reconnect |
| Application hold expires | 200 with empty events | Keep prior cursor | Reconnect with normal pacing |
| Client aborts | No usable response | Keep prior cursor | Retry according to cancellation reason |
| Gateway expires first | Often 504 or connection close | Keep prior cursor | Retry with backoff and raise telemetry |
| Authentication expires | 401 | Do not advance | Refresh credentials, then reconnect |

Define whether the timeout is measured from request receipt, completion of authentication, or subscription registration. That distinction affects race tests. If an event is published while authentication is running, does the cursor query still find it? Usually the durable event store and cursor, rather than an in-memory notification alone, should prevent loss.

## Model the timeout budget across every layer

There is no single "the timeout." A long poll crosses a client library, DNS and connection establishment, a reverse proxy, an application server, and a wait mechanism. Each layer may measure a different kind of time. Node's socket timeout, for example, is based on inactivity and its timeout event does not itself abort an outgoing request. An application hold timer decides when an empty success is returned.

Set an explicit ordering. The application should complete before the outer proxy, leaving enough margin for response serialization and network jitter. The client deadline should generally exceed the proxy deadline if the client needs to receive a gateway error, or be intentionally shorter if client cancellation is the product contract. Document the choice.

| Budget | Illustrative test value | Relationship | Failure if misordered |
|---|---:|---|---|
| Application hold | 120 ms | Shortest normal limit | Produces empty success |
| Server response margin | 40 ms | Added after hold | Allows headers and body to flush |
| Proxy idle timeout | 220 ms | Longer than app completion | Avoids proxy-generated failure |
| Client deadline | 300 ms | Longer than proxy for this contract | Captures real server or proxy response |
| Test assertion ceiling | 500 ms | Wider diagnostic guard | Prevents a hung test process |

These values are illustrative and deliberately small for a test environment. Production values can be much larger. Avoid copying production minutes into a CI test because a single failure then stalls the suite and encourages overly broad global timeouts.

## Separate a waiting service from the HTTP route

A route becomes deterministic when the wait behavior is behind a small interface. The implementation can use timers and a subscription source, while unit tests supply a controllable fake. The route remains responsible for validating the cursor, mapping an event or timeout to HTTP, and propagating cancellation.

\`\`\`ts
export type PollResult<T> =
  | { kind: 'event'; events: T[]; nextCursor: string }
  | { kind: 'timeout' };

export interface EventWaiter<T> {
  wait(input: {
    tenantId: string;
    cursor: string;
    timeoutMs: number;
    signal: AbortSignal;
  }): Promise<PollResult<T>>;
}

export type OrderEvent = {
  id: string;
  orderId: string;
  type: 'order.updated';
};
\`\`\`

The signal is part of the interface, not an implementation afterthought. Without it, an aborted HTTP request can leave a database query, pub-sub listener, or timer alive. A fake waiter can also assert that the signal it received becomes aborted.

Here is a minimal Express route factory. It uses the response's \`close\` event to abort downstream waiting when the connection ends, then avoids writing if the response has closed.

\`\`\`ts
import type { NextFunction, Request, Response } from 'express';
import type { EventWaiter, OrderEvent } from './event-waiter';

export function createPollOrders(waiter: EventWaiter<OrderEvent>, timeoutMs: number) {
  return async function pollOrders(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const tenantId = res.locals.tenantId as string;
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : '0';
    const controller = new AbortController();
    const cancel = () => controller.abort(new Error('client connection closed'));
    res.once('close', cancel);

    try {
      const result = await waiter.wait({
        tenantId,
        cursor,
        timeoutMs,
        signal: controller.signal,
      });

      if (res.destroyed) return;
      if (result.kind === 'timeout') {
        res.status(200).json({ events: [], nextCursor: cursor });
        return;
      }
      res.status(200).json({ events: result.events, nextCursor: result.nextCursor });
    } catch (error) {
      if (controller.signal.aborted || res.destroyed) return;
      next(error);
    } finally {
      res.off('close', cancel);
    }
  };
}
\`\`\`

The route forwards non-cancellation failures to Express error middleware. The tests below exercise timeout, event, and disconnect outcomes while keeping the waiter observable.

## Unit-test the timer without wall-clock delay

Vitest fake timers let a test advance scheduled time without waiting. Keep the timer-owning component small so fake time does not interfere with real sockets, database clients, or libraries that depend on the event loop.

The following waiter races a source subscription against a timer and always cleans up both. The event source returns an unsubscribe function. Abort rejects the wait and cleanup runs through the shared settlement path.

\`\`\`ts
type Subscribe<T> = (listener: (event: T) => void) => () => void;

export class InMemoryWaiter<T> {
  constructor(private readonly subscribe: Subscribe<T>) {}

  wait(input: { timeoutMs: number; signal: AbortSignal }): Promise<T | null> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let unsubscribe = () => {};

      const finish = (action: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        input.signal.removeEventListener('abort', onAbort);
        action();
      };
      const onAbort = () => finish(() => reject(input.signal.reason));
      const timer = setTimeout(() => finish(() => resolve(null)), input.timeoutMs);

      unsubscribe = this.subscribe((event) => finish(() => resolve(event)));
      input.signal.addEventListener('abort', onAbort, { once: true });
      if (input.signal.aborted) onAbort();
    });
  }
}
\`\`\`

One subtlety is synchronous publication during subscription. In a production event source, decide whether \`subscribe\` may invoke the listener before returning. If it can, the code needs an unsubscribe contract that remains safe under synchronous delivery. Many real pub-sub clients deliver asynchronously, but the interface should say so rather than relying on chance.

Now prove the timeout boundary with virtual time. Vitest uses \`-t\` or \`--testNamePattern\` to select tests by name, not Mocha's \`--grep\`.

\`\`\`ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InMemoryWaiter } from './in-memory-waiter';

describe('InMemoryWaiter', () => {
  afterEach(() => vi.useRealTimers());

  it('resolves with null when the hold period ends', async () => {
    vi.useFakeTimers();
    const waiter = new InMemoryWaiter<string>(() => () => {});
    const pending = waiter.wait({ timeoutMs: 120, signal: new AbortController().signal });

    await vi.advanceTimersByTimeAsync(119);
    let settled = false;
    void pending.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(pending).resolves.toBeNull();
  });
});
\`\`\`

The assertion at 119 ms proves the waiter does not finish early, while the final 1 ms proves it completes at the boundary. Do not assert exact wall-clock duration in a real-socket test. Virtual timers are appropriate for exact timer logic; elapsed-time bands are appropriate for integration tests.

## Verify the event-wins path and cursor contract

When an event arrives before timeout, the API must return promptly, cancel the remaining timer, and supply a cursor that prevents duplicate or skipped delivery. Use a durable sequence or opaque server cursor. A timestamp alone is risky when multiple events share a timestamp or clocks differ.

\`\`\`ts
import { afterEach, expect, it, vi } from 'vitest';
import { InMemoryWaiter } from './in-memory-waiter';

afterEach(() => vi.useRealTimers());

it('returns the first event and removes its timer', async () => {
  vi.useFakeTimers();
  let publish: (event: string) => void = () => {};
  let unsubscribeCalls = 0;
  const waiter = new InMemoryWaiter<string>((listener) => {
    publish = listener;
    return () => { unsubscribeCalls += 1; };
  });

  const pending = waiter.wait({ timeoutMs: 120, signal: new AbortController().signal });
  publish('event-41');

  await expect(pending).resolves.toBe('event-41');
  expect(unsubscribeCalls).toBe(1);
  expect(vi.getTimerCount()).toBe(0);
});
\`\`\`

API-level cursor checks should publish two known events after cursor \`40\`, expect ordered events \`41\` and \`42\`, then reconnect with the returned cursor and prove neither is delivered again. Also test a bounded batch. If five events exist and the response limit is two, the cursor should point to the last returned event, not the newest available event, otherwise three events are skipped.

| Cursor case | Seeded state | Expected result | Defect exposed |
|---|---|---|---|
| No new event | Cursor at latest | Empty response, same cursor | Cursor advances without delivery |
| One new event | Cursor before event | Event returned, cursor advances once | Duplicate on reconnect |
| Batch overflow | More events than limit | First batch only, cursor at batch end | Skipped backlog |
| Invalid cursor | Malformed or unknown | Documented 4xx response | Silent reset loses events |
| Tenant mismatch | Valid cursor from another tenant | Rejected or treated as invalid | Cross-tenant event disclosure |

## Test the HTTP timeout response with Supertest

Supertest is useful for the application-level response, but a real HTTP request still uses wall time. Configure a short hold duration for the test app and assert a reasonable band. Use a monotonic clock such as \`performance.now()\`, not \`Date.now()\`, because system clock adjustments can distort elapsed time.

\`\`\`ts
import express from 'express';
import request from 'supertest';
import { expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { createPollOrders } from '../src/poll-orders';
import type { EventWaiter, OrderEvent, PollResult } from '../src/event-waiter';

it('returns an empty success inside the application timeout window', async () => {
  const waiter: EventWaiter<OrderEvent> = {
    async wait({ cursor }): Promise<PollResult<OrderEvent>> {
      await new Promise((resolve) => setTimeout(resolve, 120));
      return { kind: 'timeout' };
    },
  };
  const app = express();
  app.use((_req, res, next) => { res.locals.tenantId = 'tenant-a'; next(); });
  app.get('/events/orders', createPollOrders(waiter, 120));

  const started = performance.now();
  const response = await request(app).get('/events/orders?cursor=40').expect(200);
  const elapsedMs = performance.now() - started;

  expect(response.body).toEqual({ events: [], nextCursor: '40' });
  expect(elapsedMs).toBeGreaterThanOrEqual(100);
  expect(elapsedMs).toBeLessThan(500);
});
\`\`\`

The lower bound allows limited scheduling variation while still detecting an immediate response. The broad upper bound is a diagnostic ceiling, not the product SLO. Tune it from observed CI behavior and keep the application hold assertion exact in the fake-timer unit test. The [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide) covers reusable app setup and response assertions that can support this test.

## Exercise cancellation with a real Node HTTP client

Supertest optimizes endpoint assertions, but cancellation is clearer with Node's HTTP client because the test owns the request and can destroy it. The server test should expose an observation that the downstream waiter received cancellation and released its listener.

\`\`\`ts
import { createServer, request as httpRequest } from 'node:http';
import { once } from 'node:events';
import express from 'express';
import { expect, it } from 'vitest';
import { createPollOrders } from '../src/poll-orders';
import type { EventWaiter, OrderEvent } from '../src/event-waiter';

it('aborts downstream waiting after the client disconnects', async () => {
  let observedSignal: AbortSignal | undefined;
  let markStarted!: () => void;
  let markCancelled!: () => void;
  const started = new Promise<void>((resolve) => { markStarted = resolve; });
  const cancelled = new Promise<void>((resolve) => { markCancelled = resolve; });
  const waiter: EventWaiter<OrderEvent> = {
    wait({ signal }) {
      observedSignal = signal;
      markStarted();
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          markCancelled();
          reject(signal.reason);
        }, { once: true });
      });
    },
  };

  const app = express();
  app.use((_req, res, next) => { res.locals.tenantId = 'tenant-a'; next(); });
  app.get('/events/orders', createPollOrders(waiter, 5_000));
  const server = createServer(app);

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('TCP address required');
    const req = httpRequest({
      host: '127.0.0.1',
      port: address.port,
      path: '/events/orders',
    });
    req.on('error', () => {});
    req.end();
    await started;
    req.destroy();
    await cancelled;
    expect(observedSignal?.aborted).toBe(true);
  } finally {
    const closed = once(server, 'close');
    server.close();
    await closed;
  }
});
\`\`\`

For production tests, structure server lifecycle with \`try/finally\` so a failed assertion still closes the listener. The example focuses on the cancellation signal, but a full test helper should return a promise for server closure and surface asynchronous setup errors. Also assert source-specific cleanup: Redis subscription count returns to baseline, database query is cancelled if supported, or an in-memory listener count reaches zero.

## Cover the race at the exact deadline

An event and a timeout can become ready in the same event-loop turn. Without an explicit policy, tests become flaky and clients may observe inconsistent cursors. Choose a deterministic rule based on durable storage. One robust approach is: when the notification wakes the waiter, query events strictly after the cursor; when the hold timer fires, perform one final nonblocking query before returning empty. That closes the gap between the last query and timeout completion.

Test three placements: event clearly before the deadline, event clearly after it, and event committed at the boundary. The boundary expectation should be based on commit order or sequence, not callback scheduling. If the first response is empty at the boundary, the next request must retrieve the event. "Returned now or on the immediate retry, but never lost" can be the invariant, with duplicate prevention verified by event ID.

\`\`\`ts
import { expect, it } from 'vitest';

type PollResponse = {
  events: Array<{ id: string }>;
  nextCursor: string;
};

const scriptedResponses: PollResponse[] = [
  { events: [], nextCursor: '40' },
  { events: [{ id: '41' }], nextCursor: '41' },
  { events: [], nextCursor: '41' },
];

async function pollOnce(_input: { cursor: string; holdMs: number }): Promise<PollResponse> {
  const response = scriptedResponses.shift();
  if (!response) throw new Error('no scripted poll response remains');
  return response;
}

it('does not lose an event committed at the timeout boundary', async () => {
  const first = await pollOnce({ cursor: '40', holdMs: 50 });
  const delivered = [...first.events];
  let resumeCursor = first.nextCursor;

  if (first.events.length === 0) {
    const retry = await pollOnce({ cursor: '40', holdMs: 50 });
    expect(retry.events.map((event) => event.id)).toContain('41');
    delivered.push(...retry.events);
    resumeCursor = retry.nextCursor;
  } else {
    expect(first.events.map((event) => event.id)).toContain('41');
  }

  const after = await pollOnce({ cursor: resumeCursor, holdMs: 50 });
  delivered.push(...after.events);
  expect(delivered.filter((event) => event.id === '41')).toHaveLength(1);
});
\`\`\`

The scripted sequence models an empty boundary response followed by delivery on the immediate retry. Add a second case where the first response contains event 41. The key is the two-request invariant, not an unreliable claim about which callback the runtime must execute first.

## Validate infrastructure behavior outside the process

An in-process test bypasses the ingress proxy, service mesh, and load balancer. Add a deployment-level test against a nonproduction environment with an application hold slightly below the configured proxy idle limit. Confirm the empty application response arrives with expected headers and body. Then use a diagnostic route or environment setting with a hold above the proxy limit and confirm the observed failure matches operations documentation.

Do not run the intentionally over-limit case against shared production infrastructure. It is a configuration verification in a controlled environment. Capture status, response headers identifying the responsible layer, elapsed time, and server logs by correlation ID.

| Observation | Likely responsible layer | Next check |
|---|---|---|
| JSON empty result at app hold | Application | Confirm cursor and reconnect |
| Branded HTML 504 | Gateway or ingress | Compare idle and upstream timeouts |
| Socket closes with no headers | Proxy, mesh, or server socket | Inspect layer logs and reset reason |
| Client abort error at fixed deadline | Client library | Confirm configured signal or deadline |
| 401 near token expiry | Authentication middleware | Test refresh and cursor preservation |

Keep-alive is often misunderstood here. TCP keep-alive and HTTP connection reuse do not necessarily produce response bytes that reset an HTTP proxy's application-level idle timer. Sending whitespace or ad hoc heartbeat chunks changes the protocol into a streaming response and may trigger buffering behavior. If heartbeats are needed, specify and test a streaming protocol rather than calling it ordinary long polling.

## Verify retry behavior without creating a request storm

The client is half of the long-poll contract. After a normal empty completion, reconnecting promptly may be correct. After a network error or 5xx, use bounded backoff with jitter. After 401, refresh authentication before retrying. After explicit user cancellation, do not reconnect.

Use a scripted fake server that returns a sequence: empty success, connection failure, event success. Record request timestamps and cursors. Assert the empty completion keeps the cursor, the failure does not advance it, the retry delay falls within the configured range, and the event advances it exactly once. Random jitter should be injected as a deterministic function in tests.

\`\`\`ts
import { expect, it } from 'vitest';

type Sleep = (ms: number) => Promise<void>;

export function retryDelay(attempt: number, random: () => number): number {
  const base = Math.min(1_000 * 2 ** attempt, 30_000);
  return Math.floor(base * (0.5 + random() * 0.5));
}

export async function waitBeforeRetry(
  attempt: number,
  sleep: Sleep,
  random: () => number,
): Promise<void> {
  await sleep(retryDelay(attempt, random));
}

it('uses deterministic bounded jitter', () => {
  expect(retryDelay(0, () => 0)).toBe(500);
  expect(retryDelay(0, () => 1)).toBe(1_000);
  expect(retryDelay(3, () => 0.5)).toBe(6_000);
});
\`\`\`

Numbers here are illustrative. Match them to your client contract. For a public API, include retry guidance in the contract and verify it in consumer tests. The [Pact contract testing guide](/blog/contract-testing-pact-complete-guide) explains how provider and consumer expectations can be checked without pretending that a contract test measures real elapsed proxy behavior.

## Diagnose the failure that only appears in staging

Consider a poll configured to hold for 30 seconds. Local tests pass, but staging clients receive failures at roughly 15 seconds. Application logs show requests starting but no normal timeout response. The failure timing is tightly clustered and response headers come from the ingress. This is not evidence that the application timer is inaccurate. It indicates an outer idle deadline is expiring first.

Confirm by temporarily lowering the application hold below the ingress limit in the test environment. If the JSON empty response appears normally, the ordering is the defect. Fix either the application hold or the infrastructure configuration, preserve a margin, and add a black-box timing check through the real ingress.

A different failure occurs after clients cancel: memory and subscription counts rise even though HTTP request volume is stable. Heap inspection shows listener closures retained by the event bus. The route returns on disconnect but never aborts the waiter, or the waiter rejects without unsubscribing. Add a cancellation test that observes the source listener count, fix cleanup in a single settlement path, and run repeated abort cycles while checking the count returns to baseline.

## What people get wrong about timeout assertions

The biggest mistake is asserting that a real request finishes at exactly the configured millisecond. Operating-system scheduling, CI load, connection setup, and event-loop work make exact wall time unsuitable. Assert exact transitions with fake timers, then use a lower bound and generous diagnostic ceiling for a small number of integration tests.

Another mistake is treating any timeout-shaped outcome as equivalent. An application-level empty 200, a client \`AbortError\`, a proxy 504, and a socket reset have different retry, telemetry, and cursor implications. Tests should identify which layer ended the request.

Finally, extending the test runner's timeout does not test the API timeout. It merely gives a hung test longer to fail. Keep the runner ceiling outside the protocol budget, but independently assert application completion and always close servers, timers, listeners, and sockets.

## Assemble a stable CI test pyramid

Run timer and race logic with virtual time on every change. Run short-hold HTTP tests with the real application and database in the integration stage. Run cancellation checks with actual sockets. Run ingress deadline checks after deployment to a controlled environment. This layering keeps feedback fast while preserving evidence for behaviors mocks cannot reproduce.

Tag real-time tests so failures show their layer. Emit the intended hold duration, measured elapsed time, response origin, cursor, and correlation ID. Never print bearer tokens or event payload secrets. If an AI coding agent generates more cases, ask it to preserve the distinction among application timeout, client cancellation, and infrastructure expiry, then review every called method against the actual library API.

## Frequently Asked Questions

### What status code should a long poll return when no event arrives?

Use the status defined by the API contract. A 200 response with an empty event array is explicit and can include the unchanged cursor. A 204 is also workable but has no response body, so cursor handling must use headers or client state. Do not treat a gateway 504 as the normal empty outcome. Whatever you choose, test response shape, cursor preservation, reconnect behavior, and the difference between normal expiry and infrastructure failure.

### How short can long-poll timeouts be in automated tests?

Unit tests can use any clear illustrative duration because fake timers advance without waiting. Real HTTP tests need enough time to distinguish an immediate response from a held request under CI scheduling. A hold around a small fraction of a second can work, with a tolerant elapsed window, but calibrate it on your infrastructure. Keep production-scale waits out of ordinary CI and verify long infrastructure budgets in a targeted deployed-environment check.

### Can Supertest verify that a client disconnect cancels server work?

Supertest is excellent for request and response behavior, but direct control of mid-request socket destruction is clearer with Node's \`http.request\` or another documented low-level client. Start the real server on an ephemeral port, begin the poll, destroy the request, and assert that the downstream abort signal fired and source listeners were released. Use \`try/finally\` in the test helper so the server closes even when an assertion fails.

### Should contract tests include actual timeout measurements?

Contract tests should capture semantic outcomes, such as an empty successful response preserving a cursor or an invalid cursor producing a documented error. They are not a reliable substitute for measuring a real gateway or socket deadline. Keep timing logic in unit and integration tests, and run black-box infrastructure checks through the deployed route. This division lets consumer and provider teams agree on meaning without baking noisy wall-clock expectations into the contract suite.
`,
};
