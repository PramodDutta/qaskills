import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Jest Fake Timers Modern vs Legacy: Migration and Debugging Guide',
  description: 'Compare Jest fake timers modern vs legacy, migrate safely, handle promises and system time, and diagnose hangs with runnable, deterministic test patterns.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Jest Fake Timers Modern vs Legacy: Migration and Debugging Guide

The practical answer to Jest fake timers modern vs legacy is simple: use modern fake timers for new tests, and keep legacy mode only as a temporary compatibility bridge for suites whose assumptions you have not yet migrated. Calling \`jest.useFakeTimers()\` selects the current implementation. Calling \`jest.useFakeTimers({ legacyFakeTimers: true })\` explicitly selects the old Jest mock-function implementation.

Modern timers are backed by \`@sinonjs/fake-timers\` and can control a broader clock surface, including \`Date\` and APIs needed for virtual system time. They also provide asynchronous timer-advancement methods for callbacks that schedule promises. Legacy timers replace a narrower group of scheduling functions with Jest mocks. The difference is behavioral, not merely a rename, so a global search-and-replace is not a sufficient migration plan.

This guide builds a migration harness around observable behavior. It complements a wider [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) and, for browser tests where clock control meets element synchronization, the [Playwright locator practices guide](/blog/playwright-best-practices-locators-2026). The examples use documented Jest APIs and make each clock decision visible in the test.

## Start with the actual timer surfaces

Fake timers can affect more than \`setTimeout\`. The exact faked APIs depend on the environment and configuration. Current Jest documentation at https://jestjs.io/docs/jest-object and https://jestjs.io/docs/timer-mocks should be the reference for the Jest version pinned by your lockfile.

| Capability | Modern default | Legacy option | Migration impact |
|---|---|---|---|
| Enablement | \`jest.useFakeTimers()\` | \`jest.useFakeTimers({ legacyFakeTimers: true })\` | Make legacy selection explicit |
| Implementation | Backed by \`@sinonjs/fake-timers\` | Jest mock functions | Mock-call assumptions may differ |
| Virtual \`Date\` | Supported | Not the same clock model | Replace manual Date spies where suitable |
| Set current clock | \`jest.setSystemTime(...)\` | Not available | Time-dependent tests need a modern path |
| Async advancement | \`advanceTimersByTimeAsync\` and related async APIs | Not available | Promise-producing callbacks need different flushing |
| Selective faking | \`doNotFake\` option | Legacy options are not supported | Audit tests depending on real performance or Date |
| Timer count | \`jest.getTimerCount()\` | Documented for fake timers | Useful leak diagnostic in both modes |

Do not infer that every asynchronous operation becomes virtual. A fake clock does not turn a real HTTP response, database query, filesystem operation, or arbitrary promise into a timer. It controls the documented clock and scheduling APIs that were replaced. Tests still need separate fakes or controlled infrastructure for external work.

Use an explicit lifecycle in every file that enables fake timers:

\`\`\`ts
// test/timer-lifecycle.test.ts
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('uses a virtual timeout without leaking clock state', () => {
  jest.useFakeTimers();
  const callback = jest.fn();

  setTimeout(callback, 250);
  expect(callback).not.toHaveBeenCalled();

  jest.advanceTimersByTime(250);
  expect(callback).toHaveBeenCalledTimes(1);
});
\`\`\`

Restoring real timers prevents one test's virtual clock from changing a later test. Clearing timers is particularly helpful when a failing assertion stops a test before a recurring interval is consumed. Restoring spies is separate because \`useRealTimers\` is not a universal mock cleanup command.

## Compare behavior with one production example

Consider a polling helper that invokes an asynchronous probe until it returns true or attempts are exhausted:

\`\`\`ts
// src/wait-for-ready.ts
export interface WaitOptions {
  intervalMs: number;
  maxAttempts: number;
}

export async function waitForReady(
  probe: () => Promise<boolean>,
  options: WaitOptions,
): Promise<boolean> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    if (await probe()) {
      return true;
    }

    if (attempt < options.maxAttempts) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, options.intervalMs);
      });
    }
  }

  return false;
}
\`\`\`

The timer does not exist until the first awaited probe resolves. That ordering matters. Advancing five seconds immediately after calling \`waitForReady\` can happen before any timeout is scheduled. A robust modern-timer test first lets the function reach the timer, then advances it with an asynchronous timer API:

\`\`\`ts
// test/wait-for-ready.test.ts
import { waitForReady } from '../src/wait-for-ready';

afterEach(() => {
  jest.useRealTimers();
});

test('returns true on the third asynchronous probe', async () => {
  jest.useFakeTimers();
  const probe = jest.fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);

  const resultPromise = waitForReady(probe, {
    intervalMs: 1_000,
    maxAttempts: 3,
  });

  await jest.advanceTimersByTimeAsync(2_000);

  await expect(resultPromise).resolves.toBe(true);
  expect(probe).toHaveBeenCalledTimes(3);
});
\`\`\`

The asynchronous advancement allows promise callbacks scheduled during timer execution to run before control returns. The test asserts the public result and the meaningful interaction count. It does not assert the implementation's entire scheduling sequence.

What people get wrong is repeating \`jest.runAllTimers()\` until a hanging test passes. That treats the symptom, and it can be dangerous for recursive scheduling. A polling loop or heartbeat may schedule another timer every time one runs. Jest protects against an effectively infinite timer loop by aborting after a configured limit. Use the smallest advancement that expresses the scenario, or \`runOnlyPendingTimers\` when you intentionally want only the currently queued generation.

## Separate macro-task advancement from promise settlement

Timer callbacks and promise reactions occupy different queues. The useful question is not whether code is “async.” Ask which operation creates the next unit of work and which Jest API allows it to settle.

| Production step | Scheduled by | Test control |
|---|---|---|
| Delay before retry | \`setTimeout\` | Advance virtual time |
| Promise returned by probe | Promise machinery | Await it or use an async timer API when created inside a timer |
| Repeating heartbeat | \`setInterval\` | Advance a bounded interval or run only pending timers |
| Network response | External I/O | Stub transport or run controlled integration service |
| Animation callback in jsdom | \`requestAnimationFrame\` | Use the documented frame or time advancement |

Here is a debounced asynchronous save. The timer callback starts a promise, so synchronous advancement runs the callback but does not await completion of the save:

\`\`\`ts
// src/debounced-save.ts
export function createDebouncedSave(
  save: (value: string) => Promise<void>,
  delayMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (value: string): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      void save(value);
    }, delayMs);
  };
}
\`\`\`

The modern test can await timer advancement and then assert the mock promise-producing function was called:

\`\`\`ts
// test/debounced-save.test.ts
import { createDebouncedSave } from '../src/debounced-save';

type Save = (value: string) => Promise<void>;

afterEach(() => {
  jest.useRealTimers();
});

test('saves only the latest value after the debounce window', async () => {
  jest.useFakeTimers();
  const save = jest.fn<Save>().mockResolvedValue(undefined);
  const scheduleSave = createDebouncedSave(save, 300);

  scheduleSave('draft');
  scheduleSave('final');

  expect(jest.getTimerCount()).toBe(1);
  await jest.advanceTimersByTimeAsync(300);

  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith('final');
});
\`\`\`

The mock's function signature matches the production dependency, so TypeScript checks both the injected callback and later assertions. This is one reason test compilation belongs in the migration gate. Runtime success alone cannot reveal every invalid mock contract.

## Use virtual system time for calendar behavior

Modern fake timers can set the current system time without firing pending timers. That distinction lets you test code that reads \`Date.now()\` or constructs \`Date\` values without waiting for wall-clock time.

Suppose an access token is considered expired at or after its expiration timestamp:

\`\`\`ts
// src/token-state.ts
export function isExpired(expiresAtMs: number): boolean {
  return Date.now() >= expiresAtMs;
}
\`\`\`

A deterministic test freezes the clock at an unambiguous UTC instant:

\`\`\`ts
// test/token-state.test.ts
import { isExpired } from '../src/token-state';

afterEach(() => {
  jest.useRealTimers();
});

test('changes to expired exactly at the expiration instant', () => {
  jest.useFakeTimers();
  const expiration = new Date('2026-08-08T10:00:00.000Z').getTime();

  jest.setSystemTime(new Date('2026-08-08T09:59:59.999Z'));
  expect(isExpired(expiration)).toBe(false);

  jest.setSystemTime(new Date('2026-08-08T10:00:00.000Z'));
  expect(isExpired(expiration)).toBe(true);
});
\`\`\`

Use ISO timestamps with a \`Z\` suffix when UTC is intended. A timestamp without an offset is interpreted in a local timezone, so the same test can represent different instants on developer laptops and CI workers.

Also remember that \`jest.setSystemTime\` changes the fake current time but does not itself cause due timers to execute. If the production behavior schedules a callback for expiration, set the starting time before scheduling, then advance timers by the desired duration.

## Know when selective faking is the right repair

Modern fake timers replace a broad set of APIs by default. Occasionally, the unit under test or a dependency needs a real API while the test still wants virtual time elsewhere. The documented \`doNotFake\` option excludes selected APIs.

\`\`\`ts
test('keeps performance measurements real while controlling timeouts', () => {
  jest.useFakeTimers({ doNotFake: ['performance'] });
  const callback = jest.fn();
  const before = performance.now();

  setTimeout(callback, 100);
  jest.advanceTimersByTime(100);

  const after = performance.now();
  expect(callback).toHaveBeenCalledTimes(1);
  expect(after).toBeGreaterThanOrEqual(before);
  jest.useRealTimers();
});
\`\`\`

Do not add exclusions speculatively. Every real clock left inside a fake-clock test creates a mixed-time model that reviewers must understand. First identify the API causing the incompatibility, then decide whether the production boundary should be injected, the dependency should be mocked, or selective faking is the clearest option.

| Symptom | Likely clock mistake | Targeted response |
|---|---|---|
| Date-based assertion changes by machine | Local timezone or real Date leaked | Use explicit UTC input and modern virtual time |
| Promise never settles after \`advanceTimersByTime\` | Timer callback schedules async work | Use the corresponding async advancement API |
| \`runAllTimers\` aborts | Recurring timer continually reschedules | Advance a bounded duration or only current timers |
| Later test hangs unexpectedly | Fake timers were not restored | Add file-level cleanup |
| Library reads impossible duration | Fake \`performance\` conflicts with it | Confirm and selectively exclude that API |
| Spy assertion fails after migration | Legacy timers were Jest mocks | Spy explicitly only when call inspection is required |

## Migrate legacy suites in observable slices

A safe migration keeps the suite green while changing one behavior class at a time. Inventory legacy use first:

\`\`\`sh
rg "legacyFakeTimers|useFakeTimers" test src
npx jest --listTests
\`\`\`

The first command is a text inventory and may find comments or helper wrappers. The second is a documented Jest CLI operation that lists tests Jest would run. Do not use a runner flag from another framework. For a focused migration, Jest supports \`--testNamePattern\` and its \`-t\` alias.

Classify each file before editing:

| File class | Typical assumption | Migration action |
|---|---|---|
| Delay-only unit | Timeout fires after advancement | Switch to modern and retain bounded advancement |
| Date-sensitive unit | Manual Date spy or wall clock | Use \`setSystemTime\` with explicit UTC |
| Promise inside timer | Manual microtask flushing helper | Replace with async timer advancement |
| Recursive scheduler | Repeated \`runAllTimers\` | Use bounded time or \`runOnlyPendingTimers\` |
| Timer spy test | Expects \`setTimeout\` itself to be a Jest mock | Add \`jest.spyOn(global, 'setTimeout')\` if interaction matters |
| Integration test | Mixes fake time and real I/O | Remove fake timers or isolate the scheduling boundary |

Change one class, run its focused tests, then run the affected package suite. A representative command is:

\`\`\`sh
npx jest test/wait-for-ready.test.ts --runInBand
npx jest --testNamePattern="returns true on the third asynchronous probe"
npm test
\`\`\`

\`--runInBand\` is a documented Jest option and can simplify diagnosis by running serially. It should not become a permanent fix for state leakage. If serial execution passes and worker execution fails, investigate shared state, environment mutation, or resource conflicts.

Avoid enabling fake timers globally as the first migration step. Global enablement expands the affected surface to tests that never requested virtual time, including library setup code. Convert file by file, establish cleanup, then consider configuration only if nearly every test in a narrowly defined Jest project needs the same clock.

## Diagnose the classic modern-timer hang

A realistic failure looks like this: a test calls \`waitForReady\`, advances 2,000 milliseconds synchronously, and then times out awaiting the result. The production function is correct, and increasing Jest's test timeout changes nothing.

The sequence explains the hang:

1. \`waitForReady\` invokes the first asynchronous probe and immediately yields.
2. The test advances virtual time before the probe's resolved promise continuation schedules the first timeout.
3. No timer exists yet, so advancement does no useful work.
4. The continuation later schedules a virtual timeout at the clock's current point.
5. The test awaits the result without advancing that newly scheduled timer.

Diagnose it with temporary assertions, not random flush helpers:

\`\`\`ts
test('shows when the retry timer enters the queue', async () => {
  jest.useFakeTimers();
  const probe = jest.fn().mockResolvedValue(false);

  const resultPromise = waitForReady(probe, {
    intervalMs: 1_000,
    maxAttempts: 2,
  });

  expect(jest.getTimerCount()).toBe(0);
  await Promise.resolve();
  expect(jest.getTimerCount()).toBe(1);

  await jest.advanceTimersByTimeAsync(1_000);
  await expect(resultPromise).resolves.toBe(false);
  jest.useRealTimers();
});
\`\`\`

The single \`await Promise.resolve()\` lets the already resolved probe continuation run in this particular example. Do not turn it into a universal “flush promises” utility. Multiple promise layers, queueMicrotask, nextTick, and third-party schedulers can behave differently. Prefer awaiting a meaningful public signal or using Jest's async timer controls.

Increasing the test timeout cannot advance a frozen virtual clock. Switching back to real timers can hide the ordering bug while making the test slow. The repair is to model the queue transition accurately.

## Test recursive and interval-based schedulers without exhausting them

Heartbeat code is intentionally infinite until stopped. \`runAllTimers\` is therefore the wrong semantic operation. Test a bounded number of ticks and assert cleanup:

\`\`\`ts
// src/heartbeat.ts
export function startHeartbeat(
  send: () => void,
  intervalMs: number,
): () => void {
  const handle = setInterval(send, intervalMs);
  return () => clearInterval(handle);
}
\`\`\`

\`\`\`ts
// test/heartbeat.test.ts
import { startHeartbeat } from '../src/heartbeat';

test('sends two heartbeats and cancels the interval', () => {
  jest.useFakeTimers();
  const send = jest.fn();
  const stop = startHeartbeat(send, 1_000);

  jest.advanceTimersByTime(2_000);
  expect(send).toHaveBeenCalledTimes(2);
  expect(jest.getTimerCount()).toBe(1);

  stop();
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});
\`\`\`

This test verifies externally meaningful cadence and lifecycle. It avoids inspecting the numeric timer handle, which differs by environment and is not part of the helper's contract.

For a recursive \`setTimeout\` scheduler, \`runOnlyPendingTimers\` can fire the current generation without recursively draining every timer created by callbacks. Still assert the queue size so an accidental duplicate schedule is visible.

## Design a CI matrix that detects migration drift

During a large migration, a temporary matrix can execute selected representative suites in both modes through a test helper. Do not try to pass an undocumented CLI switch for timer mode. Jest timer mode is selected through the API or configuration.

A small helper makes the selected mode explicit:

\`\`\`ts
// test/support/use-project-timers.ts
export function useProjectTimers(): 'modern' | 'legacy' {
  if (process.env.JEST_TIMER_MODE === 'legacy') {
    jest.useFakeTimers({ legacyFakeTimers: true });
    return 'legacy';
  }

  jest.useFakeTimers();
  return 'modern';
}
\`\`\`

Only shared behavior tests should use this bridge. Tests for modern-only features such as \`setSystemTime\` must select modern timers directly. A CI job can set \`JEST_TIMER_MODE\` to each allowed value and run a representative compatibility suite. Use shell braces when composing names, for example \`artifact_\${JEST_TIMER_MODE}_\${CI_NODE_INDEX}\`, so variable boundaries are explicit.

The compatibility matrix is temporary evidence. Remove the legacy leg when all production-supported tests use modern behavior. Maintaining two clock implementations forever doubles diagnosis paths and encourages new tests to depend on the old model.

## Choose timer assertions that survive implementation changes

The strongest assertions describe user-visible time behavior: no call before the delay, one call at the threshold, latest input wins, expiration changes at an instant, stop prevents future heartbeats. Asserting that \`setTimeout\` received exactly one callback can be useful for scheduler libraries, but it is usually too internal for business logic.

| Assertion | Contract strength | Coupling risk |
|---|---|---|
| Result changes after 300 ms | High when delay is specified | Low |
| Latest debounced value is saved | High | Low |
| Timeout called with 300 | Medium | Tied to scheduling mechanism |
| Timer handle equals a number | Low | Environment-specific |
| No timers remain after stop | High for lifecycle | Low |
| Entire callback function snapshot | Very low | Extremely brittle |

If a refactor replaces a timeout with a scheduler abstraction but preserves the delay, behavioral tests should pass. Interaction tests should fail only when the choice of scheduler is itself part of the contract.

Modern fake timers are not automatically better for every test. Real timers remain appropriate when time is not the reason for the test, durations are tiny, and replacing global clock APIs would make integration behavior less representative. The decisive question is whether virtual time makes the relevant contract faster and more deterministic without creating a mixed-clock illusion.

## Frequently Asked Questions

### Are modern fake timers the default in current Jest?

Yes. In current Jest documentation, \`jest.useFakeTimers()\` installs the modern implementation. Legacy mode is selected explicitly with \`jest.useFakeTimers({ legacyFakeTimers: true })\`. Check documentation matching the major version pinned in your repository before migrating an older suite, because historical Jest versions used different defaults and accepted older invocation forms. Keep the selection visible in tests during migration, and avoid relying on transitive or global configuration that reviewers cannot see.

### Why does advanceTimersByTime not finish my promise?

Synchronous timer advancement runs eligible timer callbacks, but promise work created by those callbacks may still need to settle. In modern mode, use the documented asynchronous counterpart when the scenario requires it, such as \`await jest.advanceTimersByTimeAsync(ms)\`. Also verify that the timer was actually scheduled before advancing. A promise that depends on real network or filesystem I/O will not complete merely because virtual time moved. Diagnose the source of each queued operation rather than adding repeated generic flushes.

### When should a suite remain on legacy fake timers?

Keep legacy mode only while a known compatibility constraint is being understood and scheduled for migration. Examples include tests that intentionally inspect replaced timer functions as Jest mocks or old helper utilities built around legacy queue behavior. Document the owning tests and an exit condition. New tests should not copy the legacy pattern. If a third-party dependency fails only under modern timers, first decide whether the integration test should use real timers or whether selective faking isolates the actual conflict.

### Can fake timers make integration tests deterministic?

They can make a scheduling boundary deterministic, but they cannot virtualize an entire integration environment. Databases, browser navigation, HTTP servers, worker threads, and external queues continue to have their own clocks and completion signals. Mixing a frozen JavaScript clock with real services can create confusing timeouts and expired-token behavior. Prefer fake timers in focused units around scheduling logic. For broader integration tests, inject a clock where possible, control service data, and wait on observable readiness rather than assuming Jest's timer queue represents every dependency.
`,
};
