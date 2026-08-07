import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'WebSocket Testing Reconnect Backoff Without Flaky Sleeps',
  description: 'Master WebSocket testing reconnect backoff with deterministic clocks, close-code policies, jitter checks, state-machine tests, and reliable CI diagnostics.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# WebSocket Testing Reconnect Backoff Without Flaky Sleeps

WebSocket testing reconnect backoff should verify a state machine, not wait through real delays and hope the client reconnects. Inject a clock, a socket factory, and a source of randomness into the reconnecting client. Then drive open, message, error, close, timer, and network-state events explicitly while asserting attempt times and connection cleanup.

A robust reconnect policy answers more than “does it try again?” It decides which closures are retryable, how delay grows, where it is capped, how jitter prevents a synchronized reconnect storm, when a successful connection resets the attempt counter, and how messages are restored without duplication. Tests should make each decision observable.

This guide builds a deterministic TypeScript harness that can be adapted to browser WebSocket clients or Node test environments. The browser WebSocket API does not provide automatic reconnection, so application code owns the policy. That ownership is useful: once time and transport creation are explicit dependencies, reconnection becomes fast to test and easier to reason about.

## Write the Reconnect Contract Before the Timer Code

Backoff is a product and reliability policy, not just a formula. Start with a table agreed by client, server, and operations owners. The browser receives a close code and reason for a close handshake, but abnormal network failures may provide limited detail. A client should not retry every terminal state forever.

| Event or close condition | Retry? | Attempt counter | Client action |
|---|---|---|---|
| Normal user-requested shutdown | no | clear | remain stopped |
| Authentication rejected | no until credentials change | preserve diagnostic | surface sign-in action |
| Transient server unavailability | yes | increment | schedule with backoff |
| Network disappears | pause or schedule by policy | increment only for attempts | wait for useful signal |
| Connection opens and stays healthy | not applicable | reset after stability rule | resume subscriptions |
| Page or component disposed | no | clear | cancel timer and close socket |

WebSocket close code 1000 represents normal closure. Application-specific codes can communicate other intentional conditions within the ranges allowed by the protocol and platform. Do not invent meaning for a code in test code alone. Keep the mapping in a named production policy and document it with the server team. Code 1006 represents an abnormal closure in API observations and is reserved, so an endpoint does not send it in a close frame.

Decide what “connected” means. Resetting the attempt counter the instant the \`open\` event fires can produce an endless fast loop when the server accepts a TCP/WebSocket connection and immediately closes it. Many clients use a stability condition, such as receiving a welcome message or remaining open for a defined period, before resetting the backoff. Test the chosen condition explicitly.

## Model Reconnection as States and Transitions

Boolean flags like \`isConnected\`, \`isRetrying\`, and \`isClosed\` can form impossible combinations. A small state model makes events and cleanup unambiguous.

| Current state | Event | Next state | Required side effect |
|---|---|---|---|
| idle | start | connecting | create one socket |
| connecting | open | open | notify observers |
| connecting | retryable close | waiting | schedule one timer |
| open | retryable close | waiting | schedule and retain resume cursor |
| waiting | timer fires | connecting | create one new socket |
| any active state | stop | stopped | clear timer, close active socket |
| stopped | late socket event | stopped | ignore stale event |

The last row is critical. Events from an old socket can arrive after a new socket exists or after the component has stopped. Every handler should know which socket generation it belongs to. Otherwise a late \`close\` from generation one can schedule a second timer while generation two is already open.

Represent state with a discriminated union where practical:

\`\`\`ts
type ReconnectState =
  | { kind: 'idle' }
  | { kind: 'connecting'; generation: number }
  | { kind: 'open'; generation: number }
  | { kind: 'waiting'; attempt: number; timerId: unknown }
  | { kind: 'stopped' };

type Transition = {
  from: ReconnectState['kind'];
  event: string;
  to: ReconnectState['kind'];
  atMs: number;
};
\`\`\`

Keep a bounded transition trace for diagnostics. If a CI test fails, a sequence such as \`open -> waiting -> connecting -> waiting\` is far more useful than “expected two sockets, received three.” Do not log authentication tokens or sensitive message bodies in this trace.

## Isolate Time, Randomness, and Socket Construction

Three injected interfaces remove nondeterminism. The scheduler owns current time and timers. The random source returns a value used for jitter. The socket factory creates a controllable transport. Production adapters use the platform, while tests use fakes.

\`\`\`ts
export interface Scheduler {
  now(): number;
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(timerId: unknown): void;
}

export interface RandomSource {
  next(): number;
}

export interface SocketLike {
  close(code?: number, reason?: string): void;
  send(data: string): void;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

export type SocketFactory = (url: string) => SocketLike;
\`\`\`

Using \`any\` for the compact event seam is acceptable in this illustrative adapter, but production code can define narrow event types for open, message, error, and close. Avoid depending on environment-specific event constructors in state-machine unit tests. The browser adapter can translate native events into internal events.

An injected random source is better than mocking \`Math.random\` globally. Global mocks can leak between concurrent tests. A deterministic sequence also lets a test hit the minimum, midpoint, and maximum jitter boundaries.

## Calculate Capped Exponential Backoff Safely

A common policy starts with a base delay and doubles it for each failed attempt until a maximum. Jitter then spreads clients across a range. There are several legitimate jitter algorithms, so name and test the one you choose. The example below uses full jitter: a random delay from zero up to the capped exponential value.

\`\`\`ts
export type BackoffPolicy = {
  baseMs: number;
  maxMs: number;
};

export function fullJitterDelay(
  attempt: number,
  randomUnit: number,
  policy: BackoffPolicy,
): number {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new Error('attempt must be a non-negative integer');
  }
  if (randomUnit < 0 || randomUnit >= 1) {
    throw new Error('randomUnit must be in [0, 1)');
  }

  const exponential = policy.baseMs * 2 ** attempt;
  const cap = Math.min(policy.maxMs, exponential);
  return Math.floor(randomUnit * cap);
}
\`\`\`

Guard the policy configuration at application startup: base and maximum should be finite positive values, and the maximum should not be lower than the base unless that behavior is deliberate. For very large attempt counts, exponentiation can exceed safe numerical ranges before \`Math.min\` applies. A production implementation can cap the exponent or stop increasing once the maximum is reached.

| Attempt | Unjittered cap with 500 ms base, 30 s max | Full-jitter range |
|---:|---:|---:|
| 0 | 500 ms | 0 to less than 500 ms |
| 1 | 1,000 ms | 0 to less than 1,000 ms |
| 2 | 2,000 ms | 0 to less than 2,000 ms |
| 6 | 30,000 ms | 0 to less than 30,000 ms |
| 20 | 30,000 ms | 0 to less than 30,000 ms |

Full jitter permits a near-zero delay even after many failures. If that conflicts with the product policy, choose an algorithm with a lower bound and document it. Do not quietly modify expected values in tests until they pass. A reconnect fleet depends on consistent semantics.

## Unit-Test the Delay Function at Boundaries

Test pure calculation separately from socket behavior. The cases should cover the first attempt, growth, cap, random boundaries, invalid input, and a large attempt count. Avoid sampling random values thousands of times and asserting a statistical distribution in the normal unit suite; deterministic boundary cases provide clearer failures.

\`\`\`ts
import { describe, expect, it } from 'vitest';

describe('fullJitterDelay', () => {
  const policy = { baseMs: 500, maxMs: 30_000 };

  it.each([
    { attempt: 0, random: 0, expected: 0 },
    { attempt: 0, random: 0.5, expected: 250 },
    { attempt: 2, random: 0.5, expected: 1_000 },
    { attempt: 6, random: 0.5, expected: 15_000 },
    { attempt: 20, random: 0.999, expected: 29_970 },
  ])('calculates $expected ms', ({ attempt, random, expected }) => {
    expect(fullJitterDelay(attempt, random, policy)).toBe(expected);
  });

  it('rejects a negative attempt', () => {
    expect(() => fullJitterDelay(-1, 0.5, policy)).toThrow();
  });
});
\`\`\`

The \`$expected\` text above is a Vitest title placeholder, not a JavaScript template interpolation, so it does not use braces.

What people get wrong is testing only the formula. A perfectly tested delay calculator cannot prevent two timers from being scheduled for one close event, an old timer from reconnecting after stop, or an attempt counter from resetting too early. Treat pure math tests as the first layer, not the finish line.

## Create a Manual Scheduler for Instant Backoff Tests

Framework fake timers can work, but a small scheduler fake makes ownership explicit and does not depend on global clock state. It stores due tasks and advances time only when the test requests it.

\`\`\`ts
type ScheduledTask = {
  id: number;
  dueAt: number;
  cancelled: boolean;
  callback: () => void;
};

export class ManualScheduler implements Scheduler {
  private currentMs = 0;
  private nextId = 1;
  private tasks: ScheduledTask[] = [];

  now() {
    return this.currentMs;
  }

  setTimeout(callback: () => void, delayMs: number) {
    const task = {
      id: this.nextId++,
      dueAt: this.currentMs + delayMs,
      cancelled: false,
      callback,
    };
    this.tasks.push(task);
    return task.id;
  }

  clearTimeout(timerId: unknown) {
    const task = this.tasks.find((candidate) => candidate.id === timerId);
    if (task) task.cancelled = true;
  }

  advanceBy(deltaMs: number) {
    this.currentMs += deltaMs;
    const due = this.tasks
      .filter((task) => !task.cancelled && task.dueAt <= this.currentMs)
      .sort((a, b) => a.dueAt - b.dueAt);
    for (const task of due) {
      task.cancelled = true;
      task.callback();
    }
  }
}
\`\`\`

A full-featured scheduler should define behavior for timers created by callbacks, equal deadlines, and negative advances. This compact version is sufficient for one timer at a time. Keep fake behavior no more magical than production behavior. If a reconnect callback schedules another timeout, a test can call \`advanceBy\` again.

Expose the number of pending tasks or a task snapshot in the test fake. Then assert that stop and successful stabilization leave no reconnect timer behind.

## Drive Fake Socket Events by Generation

The transport fake should capture listeners and expose methods such as \`open()\`, \`message()\`, \`fail()\`, and \`closeFromServer()\`. Each factory call returns a new instance stored by the factory. This lets the test send a late event from an old generation deliberately.

\`\`\`ts
type Listener = (event: any) => void;

class FakeSocket implements SocketLike {
  private listeners = new Map<string, Set<Listener>>();
  readonly sent: string[] = [];
  closeCalls: Array<{ code?: number; reason?: string }> = [];

  addEventListener(type: string, listener: Listener) {
    const group = this.listeners.get(type) ?? new Set<Listener>();
    group.add(listener);
    this.listeners.set(type, group);
  }

  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close(code?: number, reason?: string) {
    this.closeCalls.push({ code, reason });
  }

  emit(type: string, event: any = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

class FakeSocketFactory {
  readonly sockets: FakeSocket[] = [];
  create = (_url: string) => {
    const socket = new FakeSocket();
    this.sockets.push(socket);
    return socket;
  };
}
\`\`\`

This is a protocol-state fake, not a browser conformance emulator. Use a real WebSocket server integration test for handshake headers, subprotocol negotiation, proxy behavior, and frame interoperability. The fake's job is to make client transitions exhaustive and fast.

## Assert Growth, Cap, and Exactly One Pending Timer

With a deterministic random value of 0.5, full-jitter delays are easy to predict. Close each socket abnormally, inspect the pending timer, advance exactly to its deadline, and confirm one new socket is created.

\`\`\`ts
it('backs off, caps, and creates one socket per timer', () => {
  const scheduler = new ManualScheduler();
  const sockets = new FakeSocketFactory();
  const client = createReconnectingClient({
    url: 'wss://example.test/events',
    scheduler,
    random: { next: () => 0.5 },
    socketFactory: sockets.create,
    backoff: { baseMs: 500, maxMs: 2_000 },
  });

  client.start();
  expect(sockets.sockets).toHaveLength(1);

  sockets.sockets[0].emit('close', { code: 1011, reason: 'temporary' });
  scheduler.advanceBy(249);
  expect(sockets.sockets).toHaveLength(1);
  scheduler.advanceBy(1);
  expect(sockets.sockets).toHaveLength(2);

  sockets.sockets[1].emit('close', { code: 1011, reason: 'temporary' });
  scheduler.advanceBy(500);
  expect(sockets.sockets).toHaveLength(3);

  sockets.sockets[2].emit('close', { code: 1011, reason: 'temporary' });
  scheduler.advanceBy(1_000);
  expect(sockets.sockets).toHaveLength(4);
});
\`\`\`

Also emit \`error\` followed by \`close\` on the same fake socket. Browsers commonly surface both during a failed connection, but the application should schedule only once, usually from the close path where close information is available. Assert one pending timer and one subsequent factory call. This catches duplicate event-handler scheduling.

## Reset Backoff Only After a Proven Healthy Connection

Define the reset trigger as a named strategy. It might be the first valid server welcome message, successful subscription acknowledgement, or a stability timer. The strategy should reflect what proves the server can actually serve this client.

\`\`\`ts
it('does not reset attempts on a connection that opens then closes', () => {
  const harness = createHarness({ randomUnit: 0.5 });
  harness.client.start();

  harness.latestSocket().emit('open');
  harness.latestSocket().emit('close', { code: 1011 });
  expect(harness.nextDelayMs()).toBe(250);
  harness.runNextTimer();

  harness.latestSocket().emit('open');
  harness.latestSocket().emit('close', { code: 1011 });
  expect(harness.nextDelayMs()).toBe(500);

  harness.runNextTimer();
  harness.latestSocket().emit('open');
  harness.latestSocket().emit('message', {
    data: JSON.stringify({ type: 'ready' }),
  });
  harness.latestSocket().emit('close', { code: 1011 });

  expect(harness.nextDelayMs()).toBe(250);
});
\`\`\`

The helper methods are test-domain conveniences around the manual scheduler and fake sockets. They are not browser APIs. Keep their names honest so readers do not mistake them for methods on \`WebSocket\`.

A failure here often reveals that the application resets on \`open\` rather than readiness. Under server overload, thousands of clients connect, are immediately shed, reset to the shortest delay, and reconnect together. A stability rule plus jitter reduces this feedback loop.

## Stop Must Cancel Future and Stale Work

Unmounting a component, signing out, navigating away, or shutting down a worker should stop reconnection. Test stop from every active state: connecting, open, and waiting. It should clear pending timers, close the current socket when appropriate, detach handlers or invalidate the generation, and prevent future factory calls.

\`\`\`ts
it('cannot reconnect after stop while waiting', () => {
  const harness = createHarness({ randomUnit: 0.5 });
  harness.client.start();
  const first = harness.latestSocket();

  first.emit('close', { code: 1011 });
  expect(harness.pendingTimerCount()).toBe(1);

  harness.client.stop();
  expect(harness.pendingTimerCount()).toBe(0);

  harness.advanceBy(60_000);
  expect(harness.socketCount()).toBe(1);

  first.emit('close', { code: 1011 });
  expect(harness.pendingTimerCount()).toBe(0);
});
\`\`\`

The late close after stop proves stale events cannot resurrect the loop. Add the harder generation race: socket one closes and schedules; timer creates socket two; then a delayed event from socket one arrives. Only socket two should control current state.

An implementation can use generation numbers, listener removal, or both. Generation checks provide defense when an event was already queued before listeners were removed. The test should assert behavior, not dictate the internal technique.

## Verify Subscription Resume and Message Deduplication

Transport reconnection alone does not restore application state. After a new socket opens, the client may need to authenticate, resubscribe to topics, or send a cursor identifying the last processed event. Tests should cover that handshake and the duplicate-delivery policy.

| Resume strategy | Benefit | Risk | Test evidence |
|---|---|---|---|
| Subscribe from latest | simple | misses events during outage | gap is accepted and visible |
| Resume from sequence | fills gap | server must retain history | first request contains last sequence |
| Replay then deduplicate | robust delivery | client needs bounded ID store | duplicate changes state once |
| Full snapshot after reconnect | simple consistency model | heavier transfer | snapshot replaces stale state |

Do not assume exactly-once delivery from a reconnecting WebSocket. If a client processed an event but disconnected before the server learned its position, replay can produce duplicates. Make handlers idempotent or track event IDs according to the application protocol.

\`\`\`ts
it('resumes after the last committed sequence and ignores replay', () => {
  const harness = createHarness({ randomUnit: 0 });
  harness.client.start();
  harness.openAndMarkReady();

  harness.receive({ id: 'evt-10', sequence: 10, delta: 3 });
  expect(harness.modelValue()).toBe(3);

  harness.disconnectRetryably();
  harness.runNextTimer();
  harness.openAndMarkReady();

  expect(harness.latestSentJson()).toEqual({
    type: 'subscribe',
    afterSequence: 10,
  });

  harness.receive({ id: 'evt-10', sequence: 10, delta: 3 });
  harness.receive({ id: 'evt-11', sequence: 11, delta: 2 });
  expect(harness.modelValue()).toBe(5);
});
\`\`\`

Test gaps as well as duplicates. If sequence 13 arrives after 11, should the client request replay, discard live updates, fetch a snapshot, or display stale state? Reconnect correctness depends on this application rule, not just the delay formula.

## Exercise a Real Server for Protocol Boundaries

State-machine tests cannot prove that a reverse proxy permits upgrades or that the client handles a real close frame. Add a small integration suite with a local WebSocket server. Use the documented API of the server library selected by your project, allocate an isolated port, and wait for explicit readiness before connecting.

High-value integration cases include a successful handshake and message, server-initiated normal close, server-initiated retryable application close, abrupt server termination, subprotocol mismatch, and authentication failure. Keep backoff delays injectable even in integration tests so reconnection does not require long sleeps.

For general Node endpoint harness patterns, the [Supertest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide) covers lifecycle, authentication, and isolation for HTTP APIs. WebSocket upgrade and frames require a WebSocket-capable client and server rather than Supertest alone, but the principle of owning every resource in setup and teardown remains the same.

When independently deployed clients and servers share message expectations, schema and interaction contracts complement these resilience tests. The [Pact contract testing complete guide](/blog/contract-testing-pact-complete-guide) explains consumer-provider verification. Confirm tool support for asynchronous messages and the transport workflow your team uses instead of treating a live WebSocket session like a synchronous HTTP exchange.

## Diagnose the Reconnect Storm Failure Mode

The realistic production failure is a regional outage followed by recovery. Thousands of clients used identical exponential delays without jitter. They all reconnect at 1, 2, 4, and 8 seconds, producing traffic spikes that keep the service unhealthy. A single-client test passes because its formula is correct.

Add a deterministic fleet simulation using many client instances with seeded random sequences. You do not need real sockets. Record scheduled attempt times into buckets and verify attempts spread across the allowed jitter range rather than land on one timestamp. This is a simulation property, not a promise that every bucket has an exact count.

When diagnosing an individual flake or storm, capture:

1. connection generation and attempt number,
2. close code and whether closure was locally requested,
3. calculated cap, random sample, and chosen delay,
4. scheduled and actual callback time,
5. online/offline signal if the platform provides one,
6. subscription cursor and readiness transition,
7. pending timer and active socket counts.

Do not log close reasons or message payloads blindly because applications may place sensitive details in them. Use structured redaction. Correlate reconnect telemetry with server acceptance, rejection, and capacity metrics. A client retry chart alone cannot tell whether the handshake reached the service.

## Make CI Fast and Timing-Independent

Run pure policy and state-machine tests on every pull request. They should advance a manual clock and finish in milliseconds. Run real-server integration tests with bounded watchdogs. Reserve network interruption, proxy, browser background throttling, and fleet recovery tests for environments capable of modeling those conditions.

\`\`\`yaml
name: websocket-client-tests

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: npm
      - run: npm ci
      - run: npm run test:websocket-unit
      - run: npm run test:websocket-integration
\`\`\`

The script names are project conventions, not built-in npm commands. Define them in the repository and make local execution identical. In teardown, stop clients, clear schedulers, close client sockets, close the local server, and await shutdown. An integration test that passes but leaves a socket open can stall the runner.

Review every reconnect change against a concrete checklist: retryable closure mapping, single-timer invariant, cap, jitter, stable-reset rule, stop behavior, stale generation defense, resubscription, deduplication, gap handling, authentication refresh, observability, and cleanup. If an AI coding agent proposes the implementation, ask it to produce transition traces for error-plus-close, stop-while-waiting, and late-old-socket events. Those races reveal more than a happy-path reconnect demo.

## Frequently Asked Questions

### Should a WebSocket client reconnect after every close code?

No. A user-requested normal shutdown, deliberate sign-out, or permanent authentication rejection should not start an automatic loop. Transient server and network failures may be retryable. Define the mapping with the server team and keep it in one named policy. Some abnormal network failures provide limited close information, so the client also needs a safe default and a retry limit or user-visible degraded state appropriate to the product.

### Is exponential backoff enough without jitter?

It helps one client reduce request frequency, but identical clients still schedule the same sequence and can reconnect in synchronized waves. Jitter spreads attempts across time and reduces coordinated load after an outage. Choose a documented algorithm such as full jitter or a bounded alternative, then test its exact range deterministically. Also simulate many clients with seeded randomness to ensure the fleet does not collapse into the same buckets. Jitter complements a cap and stop policy; it does not replace them.

### When should the reconnect attempt counter reset?

Reset after evidence that the connection is healthy enough to serve the application, not necessarily at the raw open event. A server can accept and immediately shed connections during overload. A welcome message, successful subscription acknowledgement, or stability interval can provide a stronger signal. Pick one rule, record it as a state transition, and test repeated open-then-close cycles. The right trigger depends on the application protocol and how the server communicates readiness.

### How can WebSocket reconnect tests avoid real waiting?

Inject a scheduler instead of calling global timers directly, inject randomness instead of reading \`Math.random\` inside policy code, and create sockets through a factory. A manual scheduler can advance hours of logical retry time instantly, while fake sockets emit events by generation. Keep a smaller real-server suite for handshake and frame behavior, with bounded watchdogs. This split makes race and backoff tests deterministic without pretending the transport fake proves browser or proxy interoperability.
`,
};
