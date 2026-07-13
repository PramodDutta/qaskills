import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Use Jest Fake Timers with runOnlyPendingTimers()',
  description:
    'Use Jest fake timers and runOnlyPendingTimers() to test recursive schedulers one generation at a time without infinite-loop failures or real-time delays.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Use Jest Fake Timers with runOnlyPendingTimers()

One heartbeat schedules the next heartbeat. Advancing every timer therefore creates another timer, and asking Jest to drain the entire queue can never reach an empty state. After 100,000 executions, Jest stops with its protective "assuming an infinite loop" error. The production scheduler may be behaving exactly as intended; the test selected the wrong timer operation.

\`jest.runOnlyPendingTimers()\` executes the timers that are pending at the time the call begins. Timers scheduled by those callbacks remain queued for a later call. That generation-by-generation behavior makes it the right control for recursive timeouts, polling clients, lease renewals, and self-scheduling maintenance tasks.

## Why recursive timers defeat runAllTimers()

Consider a worker that waits five seconds, checks a queue, then schedules its next check. There is never a natural moment when no future check exists. \`jest.runAllTimers()\` promises to run all macro-tasks until the fake timer queue is empty, so it repeatedly follows the newly scheduled work. Jest's execution ceiling prevents the test process from hanging forever, but hitting that ceiling is not a meaningful assertion.

Timer APIs have different scheduling shapes:

| Production pattern | Queue shape | Useful Jest control |
|---|---|---|
| One delayed callback | Finite, one generation | \`runAllTimers()\` or \`advanceTimersByTime()\` |
| Timeout callback schedules itself | Unbounded generations | \`runOnlyPendingTimers()\` |
| Fixed interval | Persistent scheduled task | Advance time by a bounded duration |
| Immediate plus timeout | Multiple timer classes | Run pending timers and assert ordering |
| Debounce reset on each call | Old timer is cleared, one remains | Advance just below and across the boundary |

The distinction is about the work present before the test action, not simply whether the application uses \`setTimeout\` or \`setInterval\`. A callback that conditionally stops after three runs is finite and can be drained, but a unit test should still prefer bounded steps if the stop condition is itself what you are validating.

## Build a scheduler with an explicit stop boundary

Testable timer code needs lifecycle ownership. Returning a \`stop()\` function lets the test and the production caller cancel the outstanding timeout. Without that boundary, fake timers may remain queued after the assertion and real applications may leak work during shutdown.

\`\`\`typescript
export type HeartbeatClient = {
  sendHeartbeat(): Promise<void>;
};

export function startHeartbeat(client: HeartbeatClient, intervalMs = 5_000) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = () => {
    timer = setTimeout(async () => {
      await client.sendHeartbeat();
      if (!stopped) schedule();
    }, intervalMs);
  };

  schedule();

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
\`\`\`

This implementation schedules the next heartbeat only after the asynchronous send settles. That means there is at most one outstanding timeout and no overlapping heartbeats. If the intended contract is fixed-rate execution regardless of request duration, \`setInterval\` would model different semantics and needs different concurrency tests.

The timer callback is asynchronous. Running a timer invokes it, but promise continuation work must also settle before the next timeout is scheduled. This is why async timer helpers or an explicit microtask flush matter in the test.

## Execute exactly one heartbeat generation

Modern Jest exposes asynchronous timer controls alongside their synchronous forms. \`jest.runOnlyPendingTimersAsync()\` allows scheduled promise callbacks to settle before the call completes. Use it when the timer callback awaits work and your Jest environment supports the async fake-timer APIs.

\`\`\`typescript
import { startHeartbeat, type HeartbeatClient } from './heartbeat';

describe('startHeartbeat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('sends one heartbeat per pending-timer generation', async () => {
    const client: HeartbeatClient = {
      sendHeartbeat: jest.fn().mockResolvedValue(undefined),
    };
    const heartbeat = startHeartbeat(client, 5_000);

    expect(client.sendHeartbeat).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(1);

    await jest.runOnlyPendingTimersAsync();

    expect(client.sendHeartbeat).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);

    await jest.runOnlyPendingTimersAsync();

    expect(client.sendHeartbeat).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(1);

    heartbeat.stop();
    expect(jest.getTimerCount()).toBe(0);
  });
});
\`\`\`

The timer count assertions expose the recursive structure. After each generation, one future timeout should exist. If the implementation accidentally schedules twice, the count catches the defect before call totals become confusing. After \`stop()\`, the queue should be empty.

Do not replace both calls with \`runAllTimers()\`. The heartbeat has no designed end and the test would intentionally trigger Jest's loop safeguard. Also resist calling \`runOnlyPendingTimers()\` repeatedly in an unbounded test loop. The test should name how many cycles matter to the behavior under review.

## Synchronous and asynchronous timer controls

The synchronous \`jest.runOnlyPendingTimers()\` is appropriate when callbacks do not depend on promise continuations. When callbacks are async, a synchronous run can return before the awaited code completes or before the next timeout is scheduled.

| Jest operation | Advances virtual clock | Handles pending promise work | Typical use |
|---|---:|---:|---|
| \`runOnlyPendingTimers()\` | To each pending timer | No async settling guarantee | Synchronous recursive callback |
| \`runOnlyPendingTimersAsync()\` | To each pending timer | Yes | Callback awaits a promise |
| \`advanceTimersByTime(ms)\` | By exact duration | Synchronous form only | Debounce, retry boundary, interval count |
| \`advanceTimersByTimeAsync(ms)\` | By exact duration | Yes | Time window containing async callbacks |
| \`runAllTimers()\` | Until queue empties | Synchronous form | Finite timer graph |
| \`runAllTimersAsync()\` | Until queue empties | Yes | Finite graph with promise work |

Async timer methods are not available when using Jest's legacy fake timers. Current projects should generally use the modern implementation unless compatibility requires otherwise. If your configured Jest version lacks an async method, run the pending timer, await the specific mocked promise or an exposed completion signal, then assert. Avoid folklore helpers such as repeatedly awaiting \`Promise.resolve()\`; they couple the test to an incidental number of microtask turns.

## Verify that stop prevents rescheduling

Cancellation has two interesting moments: before the first callback fires, and while an async callback is in flight. The second case is where many schedulers resurrect themselves after shutdown.

\`\`\`typescript
import { startHeartbeat } from './heartbeat';

test('does not schedule another timeout when stopped during a send', async () => {
  jest.useFakeTimers();

  let resolveSend!: () => void;
  const sendPromise = new Promise<void>((resolve) => {
    resolveSend = resolve;
  });
  const client = { sendHeartbeat: jest.fn(() => sendPromise) };
  const heartbeat = startHeartbeat(client, 1_000);

  jest.advanceTimersByTime(1_000);
  expect(client.sendHeartbeat).toHaveBeenCalledTimes(1);

  heartbeat.stop();
  resolveSend();
  await sendPromise;
  await Promise.resolve();

  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});
\`\`\`

This test controls the dependency's completion directly. It does not need to guess how long a network call takes. The final \`Promise.resolve()\` permits the async timer callback to continue after its awaited dependency; because the callback contains a single await, one microtask turn is sufficient for this implementation. If the implementation becomes more complex, exposing a completion promise or using the async timer API will be more robust.

Put timer restoration in \`afterEach\` in the real suite, even though the compact example restores it at the end. If an assertion throws before restoration, fake time can contaminate later tests in the same file.

## Cleanup order matters in shared test utilities

Libraries such as Testing Library may leave scheduled work that expects to be flushed before returning to real timers. A common teardown sequence is to run currently pending timers and then restore real timers. For a deliberately recursive production scheduler, however, blindly flushing can execute one more business action during cleanup.

The owner should cancel the scheduler first:

1. Call the returned \`stop()\` or abort controller.
2. Run only pending timers if framework cleanup requires it.
3. Assert no relevant timers remain when that contract is under test.
4. Call \`jest.useRealTimers()\`.

Do not put \`jest.clearAllTimers()\` into every teardown as a substitute for lifecycle cleanup. Clearing hides a component that forgot to cancel its own work. It can be an emergency containment mechanism, but a unit test for a scheduler should prove cancellation.

## Test retry backoff without collapsing time

Recursive timers frequently implement retries rather than a steady heartbeat. In that case, the delay value is part of the contract. \`runOnlyPendingTimers()\` proves one generation executes, while \`advanceTimersByTime()\` verifies the boundary at which it becomes eligible.

\`\`\`typescript
export function retryWithBackoff(
  operation: () => Promise<void>,
  delays: readonly number[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const attempt = (index: number) => {
      operation()
        .then(resolve)
        .catch((error: unknown) => {
          const delay = delays[index];
          if (delay === undefined) {
            reject(error);
            return;
          }
          setTimeout(() => attempt(index + 1), delay);
        });
    };
    attempt(0);
  });
}

test('waits for the configured backoff before retrying', async () => {
  jest.useFakeTimers();
  const operation = jest
    .fn<() => Promise<void>>()
    .mockRejectedValueOnce(new Error('busy'))
    .mockResolvedValueOnce(undefined);

  const result = retryWithBackoff(operation, [2_000]);
  await Promise.resolve();
  expect(operation).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(1_999);
  expect(operation).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(1);
  await expect(result).resolves.toBeUndefined();
  expect(operation).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});
\`\`\`

This retry function is finite because its delay list is finite. Testing it with \`runAllTimersAsync()\` could prove eventual success but would not prove the two-second boundary. Select the timer control that exposes the requirement, not the one that produces the shortest test.

## Avoid faking more time APIs than the test needs

Modern fake timers replace timer functions and several clock-related APIs. Code that mixes \`Date.now()\`, \`performance.now()\`, \`queueMicrotask\`, and external libraries can behave differently under virtual time. Jest's \`doNotFake\` configuration can preserve selected APIs when needed, and \`jest.setSystemTime()\` can establish a deterministic wall clock.

For recursive scheduling, test delays as delays and wall-clock timestamps as a separate concern. If a lease renewal calculates its next delay from an expiry timestamp, set a known system time, then advance virtual time. State both assumptions in the test so a later maintainer does not interpret a frozen date as incidental.

Fake timers also do not make actual I/O complete. A real fetch or database query remains real and should not be placed inside a unit test that expects virtual time to drive it. Inject the dependency and resolve its promise explicitly, as the examples do.

## Compare the available timer strategies

The following choices are all legitimate, but they answer different questions:

| Strategy | Strongest assertion | Risk if misapplied |
|---|---|---|
| One \`runOnlyPendingTimers()\` call | Current scheduled generation runs once | Misses promise continuation in async callbacks |
| Repeated bounded pending runs | Recursive state evolves over N cycles | Can become a manual infinite loop without a fixed count |
| Advance by exact milliseconds | Nothing occurs before the deadline | Brittle if the contract does not promise an exact delay |
| Drain all timers | A finite scheduled graph completes | Fails intentionally recursive designs |
| Real timers | Integration with the runtime scheduler | Slow tests and nondeterministic timing |

If the scheduler returns an observable state machine, assert state as well as callback count. Calls alone can pass when parameters, ordering, or rescheduling conditions are wrong. Use the [Jest async and promise testing guide](/blog/jest-async-await-testing-promises-guide) to make rejected and resolved paths explicit. If a process stays alive after the suite, the [Jest open handles guide](/blog/jest-open-handles-flaky-tests-guide) covers diagnostics beyond fake timer queues.

## Assert callback arguments and failure policy across cycles

Recursive work often changes its payload each generation. A lease renewal might send the previous lease version, while a queue poller may carry a cursor returned by the last response. Testing only call count would miss a scheduler that repeats stale arguments forever.

Model the dependency response sequence and inspect each invocation. For example, return \`{ cursor: 'page-2' }\` on the first poll, run one pending generation, then verify the next call receives \`page-2\`. Keep the cursor in ordinary application state, not in a timer mock. The fake clock should control eligibility while the mock controls external results.

Failure policy deserves its own matrix:

| Callback result | Expected scheduling decision | Assertion |
|---|---|---|
| Success with more work | Schedule normal interval | One timer remains with updated cursor |
| Transient error | Schedule retry delay | No immediate overlapping call |
| Permanent authentication error | Stop scheduler | Timer count becomes zero |
| Cancellation during request | Ignore late result | No successor timer |
| Dependency throws synchronously | Follow documented error policy | Rejection is observed, not lost globally |

Async timer callbacks can produce unhandled rejections if the scheduler does not catch dependency failure. Fake timers do not automatically surface that rejection as a clean assertion against the owning API. Prefer an implementation that catches the error, records it through an injected observer, and chooses whether to reschedule. Then tests can assert observer calls and queue state without listening globally for process events.

## Control wall-clock jumps independently from elapsed delays

A service can experience a wall-clock adjustment while monotonic elapsed time continues normally. Most unit tests do not need to reproduce operating-system clock behavior, but expiry code often mixes absolute timestamps with scheduling delays. Use \`jest.setSystemTime()\` to establish or change the wall clock and timer advancement to move scheduled work.

Write separate tests for "callback becomes eligible after 5,000 milliseconds" and "lease is considered expired at this timestamp." Combining them makes it unclear whether a failure came from date arithmetic or timer recursion. If code uses \`performance.now()\` for elapsed duration, verify whether the selected fake-timer configuration replaces it before asserting exact values.

## Avoid test-order contamination from module initialization

A module that calls \`setTimeout\` at import time schedules work before a test's \`beforeEach\` can enable fake timers. Import order then determines whether the timer is real or virtual. Move scheduler startup behind an explicit function, or enable fake timers before loading the module with Jest's module isolation APIs when legacy design cannot change.

Explicit startup also improves production behavior. Applications can install signal handlers, start the scheduler after dependencies are ready, and stop it during shutdown. Testability is a useful pressure toward lifecycle clarity, not merely a concession to Jest.

After every test, verify important mocks and cancellation state before restoring timers. If a suite uses a shared helper, make it refuse nested \`useFakeTimers()\` ownership rather than letting inner teardown restore real time while an outer test still expects virtual time.

## Read failure output as a scheduling trace

When a timer test fails, capture three facts before changing delays: the virtual system time, \`jest.getTimerCount()\`, and dependency call history. Those reveal whether the callback never became eligible, ran without settling, or scheduled an unexpected extra generation.

Avoid adding arbitrary \`advanceTimersByTime(100000)\` calls. Large jumps can execute many interval ticks and erase the boundary that failed. Move in the smallest semantic unit: to the next heartbeat, across one debounce threshold, or through one retry delay.

A senior review should also ask whether recursion belongs in the callback at all. An explicit scheduler abstraction or abort signal may simplify production shutdown and testing. Fake timers can control a poor lifecycle design, but they do not make that design safe.

## Frequently Asked Questions

### Why does runAllTimers() report 100,000 timers for my polling function?

Each polling callback schedules another timer, so the queue never becomes permanently empty. Jest stops after its safeguard limit. Execute a bounded generation with \`runOnlyPendingTimers()\` or advance a defined time window instead.

### Will runOnlyPendingTimers() run a timeout created inside another timeout?

Not in the same pending-timer generation. The newly created timeout remains queued for a subsequent timer operation, which is precisely why the method is useful for recursive scheduling.

### When should I choose runOnlyPendingTimersAsync()?

Choose it when a pending timer callback awaits promise work that must settle before you assert or before it schedules its successor. The async methods require modern fake timers.

### How can I prove a recursive scheduler was cleaned up?

Expose a stop or abort operation, invoke it, and assert \`jest.getTimerCount()\` is zero. Restore real timers in teardown so a failing assertion cannot leak virtual time into another test.

### Is advanceTimersByTime() better for exponential backoff?

It is better for verifying exact backoff boundaries. \`runOnlyPendingTimers()\` is better for stepping through generations when the absolute delay is irrelevant. A complete retry suite often uses each in a different test.
`,
};
