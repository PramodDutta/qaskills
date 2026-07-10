import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Fake Timers and Date Testing Guide',
  description:
    'Master Vitest fake timers and date testing for retries, intervals, debounce logic, TTL expiry, and deterministic time-dependent assertions in CI.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Vitest Fake Timers and Date Testing Guide

The failing test says the retry should have happened after 500 milliseconds, but the CI log took twelve seconds to print the assertion. That mismatch is the first clue that the test is waiting on real time when it should own the clock.

Vitest fake timers let a test replace timer APIs with a controllable clock. That sounds simple until the code mixes \`setTimeout\`, \`Date.now()\`, promise callbacks, retry loops, and cleanup hooks. Then the test has to advance time in the same shape the application consumes it. Push too far and you skip an intermediate state. Forget to restore the clock and the next spec inherits a frozen date. Use fake timers around a library that depends on real timers and the test can hang.

This guide focuses on production patterns: retry backoff, debounce, interval polling, time-to-live cache expiry, and calendar-sensitive logic. For baseline Vitest project setup, use [Vitest config setup guide 2026](/blog/vitest-config-setup-guide-2026). For browser automation that needs to control page time rather than Node test time, compare it with [Playwright clock API time testing guide](/blog/playwright-clock-api-time-testing-guide).

## Own the Clock Before the Code Schedules Work

Fake timers only control timers created after \`vi.useFakeTimers()\` is active. Put that call before importing or constructing code that schedules timeouts at module load or object creation. For most unit tests, call it in \`beforeEach\` and restore in \`afterEach\`.

\`\`\`ts
// retry.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRetrier } from './retry';

describe('createRetrier', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for the configured delay before the second attempt', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValueOnce('ok');

    const result = createRetrier({ delayMs: 500, maxAttempts: 2 }).run(operation);

    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(499);
    expect(operation).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
\`\`\`

The \`await Promise.resolve()\` allows the first rejected promise to settle so the retry timer can be scheduled. The async timer advancement then gives Vitest a chance to run promise continuations created by the timer callback. In retry tests, that distinction is often the difference between a deterministic check and a test that passes only when the event loop happens to cooperate.

## Timer APIs You Actually Need

Vitest exposes several timer controls through \`vi\`. Use the smallest one that describes the behavior under test. Running every timer in the test file can hide mistakes when the expected behavior is one scheduled callback.

| Vitest API | Typical use | Watch for |
|---|---|---|
| \`vi.useFakeTimers()\` | Replace timer functions in the current test environment | Must run before timers are created |
| \`vi.useRealTimers()\` | Restore real timer behavior after a test | Put it in cleanup, not just in happy path |
| \`vi.setSystemTime(date)\` | Freeze \`Date\` and \`Date.now()\` for calendar logic | Does not by itself execute timers |
| \`vi.advanceTimersByTime(ms)\` | Move synchronous timer callbacks forward | Promise work inside callbacks may need async variant |
| \`vi.advanceTimersByTimeAsync(ms)\` | Move time while allowing async callbacks to settle | Prefer for retry code that awaits inside callbacks |
| \`vi.runOnlyPendingTimers()\` | Execute currently queued timers without chasing newly created ones | Useful for recursive timers |
| \`vi.runAllTimers()\` | Drain timers when the code has a known finite queue | Dangerous with intervals or self-scheduling loops |
| \`vi.getTimerCount()\` | Assert cleanup removed scheduled timers | Can expose leaked intervals |

Do not treat fake timers as a performance trick only. They are a specification tool. If a debounce must wait 300 milliseconds, advancing by 299 and then by 1 documents that edge more clearly than sleeping for 350 milliseconds.

## Testing Debounce Without Sleeping

Debounce tests should verify cancellation, not just final invocation. The important behavior is that earlier calls are discarded when a later call arrives inside the debounce window.

\`\`\`ts
// debounce.ts
export function debounce<T extends unknown[]>(
  callback: (...args: T) => void,
  delayMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (...args: T) => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      callback(...args);
    }, delayMs);
  };
}

// debounce.test.ts
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('keeps only the latest value submitted inside the debounce window', () => {
  const save = vi.fn();
  const debouncedSave = debounce(save, 300);

  debouncedSave('draft-1');
  vi.advanceTimersByTime(250);
  debouncedSave('draft-2');
  vi.advanceTimersByTime(299);

  expect(save).not.toHaveBeenCalled();

  vi.advanceTimersByTime(1);
  expect(save).toHaveBeenCalledOnce();
  expect(save).toHaveBeenCalledWith('draft-2');
});
\`\`\`

This test does not know how the debounce function stores the timer, but it exercises the cancellation boundary. That is the level fake timers are best at: exact temporal behavior without inspecting implementation state.

## Freezing Dates Is Not the Same as Advancing Timers

\`vi.setSystemTime\` changes what \`new Date()\` and \`Date.now()\` report while fake timers are active. It does not automatically fire a timeout scheduled for the future. That distinction matters for cache expiration, token windows, and date formatting.

Imagine a TTL cache that stores the timestamp when an item is written. Testing it with real time would either sleep or make the TTL tiny enough to create race conditions. A frozen clock makes the rule visible.

\`\`\`ts
// ttl-cache.test.ts
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TtlCache } from './ttl-cache';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-10T10:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

it('expires entries based on Date.now rather than wall-clock test duration', () => {
  const cache = new TtlCache<string>({ ttlMs: 60_000 });

  cache.set('session', 'abc123');
  expect(cache.get('session')).toBe('abc123');

  vi.setSystemTime(new Date('2026-07-10T10:00:59.999Z'));
  expect(cache.get('session')).toBe('abc123');

  vi.setSystemTime(new Date('2026-07-10T10:01:00.000Z'));
  expect(cache.get('session')).toBeUndefined();
});
\`\`\`

No timers are advanced here because the cache does not schedule timers. It reads time on access. Many date-dependent tests become simpler once you identify whether the code uses scheduled time or observed time.

## Time-Dependent Patterns and Their Best Test Shape

| Production behavior | Main time primitive | Better Vitest shape | Common mistake |
|---|---|---|---|
| Debounce | \`setTimeout\` plus \`clearTimeout\` | Advance to just before and exactly at delay | Only asserting the callback eventually runs |
| Retry with delay | Promise chain plus timer | Let rejection settle, then use async advancement | Forgetting the microtask between attempts |
| Polling | \`setInterval\` or recursive timeout | Run one interval at a time and assert cleanup | \`runAllTimers\` against an infinite loop |
| TTL cache | \`Date.now()\` | Freeze and move system time | Advancing timers when no timer exists |
| Calendar cutoff | \`new Date()\` with timezone assumptions | Set explicit UTC input and assert boundary | Depending on the machine timezone |
| Toast auto-dismiss | Timer plus UI state | Use fake timers in component test and assert removal | Sleeping for animation plus timeout |
| Token refresh | Expiry timestamp and scheduled refresh | Set system time, advance to refresh lead time | Making the token lifetime tiny in test config |

The important question is always: does the production code schedule future work, read the current clock, or both? Choose the Vitest API from that answer.

## Intervals, Cleanup, and Leaked Timers

Intervals need stricter tests than timeouts because they keep running until cleared. A component or service that starts polling should also expose a stop path. Vitest can verify that cleanup actually removes timers.

\`\`\`ts
// poller.test.ts
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Poller } from './poller';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('polls on the interval and clears the interval on stop', async () => {
  const fetchStatus = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  const poller = new Poller(fetchStatus, 2_000);

  poller.start();
  expect(vi.getTimerCount()).toBe(1);

  await vi.advanceTimersByTimeAsync(2_000);
  expect(fetchStatus).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(2_000);
  expect(fetchStatus).toHaveBeenCalledTimes(2);

  poller.stop();
  expect(vi.getTimerCount()).toBe(0);
});
\`\`\`

If \`getTimerCount\` remains nonzero, the test has found a real resource leak. That matters in browser component tests too. A leaked interval can keep updating unmounted state, create noisy logs, or make later tests observe unexpected calls.

## Async Timer Advancement and Promise Work

Timer callbacks often do more than call a synchronous function. They may await a fetch, update a store, or schedule another timeout after a promise resolves. In those tests, prefer \`advanceTimersByTimeAsync\` because it allows promise callbacks created by timers to run.

A useful rule: if the timer callback contains \`await\`, returns a promise, or calls a function that returns a promise, use the async timer API. If it only increments a number or calls a synchronous spy, the sync API is enough.

This does not mean every test needs \`runAllTimersAsync\`. Advancing time in chunks is usually clearer. For exponential backoff, advance the first delay, assert the second attempt, advance the second delay, assert the third attempt. The test becomes a readable timeline rather than a black box.

## Avoiding Fake Timer Collisions

Fake timers are powerful because they replace global behavior. That is also why they can collide with libraries that expect real timers, such as network mock layers, user-event helpers, or animation utilities. The fix is not always to abandon fake timers. Often it is to limit the fake-timer scope to the code that needs it, restore promptly, or use the library's documented timer integration.

Keep these guardrails:

| Risk | Symptom | Practical response |
|---|---|---|
| Fake timers enabled across unrelated tests | Later specs see frozen dates or stalled timers | Restore in \`afterEach\` |
| Imported module schedules timer before setup | Timer ignores Vitest controls | Enable fake timers before creating the module instance |
| Promise work not flushed | Retry spy never receives next call | Use async advancement and await the pending result |
| Infinite interval drained by \`runAllTimers\` | Test hangs or aborts from too many timers | Step intervals manually or stop the poller |
| Timezone-dependent date string | Passes locally, fails in CI | Use explicit UTC dates or test with configured timezone |

## Calendar Boundaries Deserve Separate Tests

Date tests fail most often around midnight, month ends, leap years, and daylight-saving changes. Fake timers make those cases cheap enough to include directly. Avoid one giant test that loops over every date. Name each boundary so a failure tells you which assumption broke.

For example, billing logic that closes a monthly window at midnight UTC should be tested with dates just before and at the boundary. A local timezone assertion belongs in a separate test where the timezone is deliberately configured or the function accepts an explicit timezone.

When application code uses \`Intl.DateTimeFormat\`, fake timers only control the input date. The runtime's locale and timezone behavior still comes from the environment unless you pass them explicitly. Senior test suites make those assumptions visible.

## Testing Backoff Schedules Without Flattening the Timeline

Retry code is where fake-timer tests often become misleading. A backoff policy is not just "eventually retries." It has a first delay, a second delay, a maximum number of attempts, and often a cap or jitter strategy. If the test drains all timers at once, it can miss an off-by-one delay or a retry that occurs too early.

For deterministic unit tests, disable jitter or inject a seeded delay function. Then assert the observable schedule step by step. The first failed attempt should schedule the first delay. Advancing one millisecond short of that delay should not call the operation again. Advancing the final millisecond should call it. Repeat for the next delay. This is more verbose than \`runAllTimers\`, but it documents the contract that callers depend on.

\`\`\`ts
// backoff.test.ts
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { retryWithBackoff } from './backoff';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('uses the configured backoff schedule between failed attempts', async () => {
  const task = vi
    .fn<() => Promise<string>>()
    .mockRejectedValueOnce(new Error('first'))
    .mockRejectedValueOnce(new Error('second'))
    .mockResolvedValueOnce('done');

  const promise = retryWithBackoff(task, {
    delaysMs: [100, 500],
  });

  await Promise.resolve();
  expect(task).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(99);
  expect(task).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(1);
  expect(task).toHaveBeenCalledTimes(2);

  await vi.advanceTimersByTimeAsync(499);
  expect(task).toHaveBeenCalledTimes(2);

  await vi.advanceTimersByTimeAsync(1);
  await expect(promise).resolves.toBe('done');
  expect(task).toHaveBeenCalledTimes(3);
});
\`\`\`

This style catches the bug where a developer accidentally uses seconds as milliseconds, doubles the wrong value, or schedules the next retry before the failed promise settles. It also gives reviewers a clear timeline. The test is longer because the behavior is temporal, and temporal behavior deserves explicit checkpoints.

## Timezone and Locale Assumptions Belong in Test Names

Fake timers cannot make a date-formatting test portable if the function under test reads the host timezone implicitly. A CI runner in UTC and a developer laptop in Asia/Kolkata can format the same instant differently. The fix is to pass the timezone or locale into the production function when the product requirement depends on it.

For calendar cutoffs, store instants and compare instants. For display text, pass \`timeZone\` and \`locale\` to \`Intl.DateTimeFormat\`. For business days, model the business timezone as configuration rather than assuming the server timezone. Then use \`vi.setSystemTime\` to freeze "now" and plain assertions to check the boundary.

| Date behavior | Stable test design | Unstable design |
|---|---|---|
| Trial expires at UTC instant | Freeze UTC time and compare timestamp | Compare localized date string from host |
| Invoice label for customer locale | Pass locale and timezone explicitly | Depend on CI machine locale |
| Business day cutoff | Configure business timezone | Use \`new Date().getDate()\` directly |
| Token max age | Compare epoch milliseconds | Sleep until the token expires |
| Weekend rule | Test named dates in configured zone | Generate dates from current day |

This is less about Vitest and more about testable design. Fake timers give you control only after the production code exposes the assumptions that need controlling.

## Cleaning Up After Failed Timer Tests

Timer cleanup should happen even when an assertion fails halfway through a scenario. Put \`vi.useRealTimers()\` in \`afterEach\`, and avoid early returns that skip application cleanup such as stopping pollers or unmounting components. If a test creates an interval-owning object, stop it explicitly before the test ends, then assert \`vi.getTimerCount()\` when the object contract includes cleanup.

This is especially important in files that mix time tests with ordinary promise tests. A leaked fake clock can make a later test look like a network bug because its timeout never fires. When a suite fails in a surprising place after adding fake timers, first check whether the earlier test restored real timers and cleared intervals.

## Frequently Asked Questions

### Should I call vi.useFakeTimers in beforeEach or inside each test?

Use \`beforeEach\` when every test in the file owns time. Put it inside a specific test when only one scenario needs timer control, especially if neighboring tests use libraries that expect real timers.

### Why did setSystemTime not trigger my timeout?

\`setSystemTime\` changes the clock returned by date APIs. It does not execute scheduled callbacks. Use \`advanceTimersByTime\` or an async timer advancement API when code schedules future work with \`setTimeout\` or \`setInterval\`.

### When should I use advanceTimersByTimeAsync?

Use it when timer callbacks perform promise work. Retry loops, polling functions that await network calls, and delayed state updates often need the async variant so promise continuations run before assertions.

### Is runAllTimers safe for polling code?

Usually no. Polling often uses intervals or recursive timeouts, so draining every timer can create an infinite sequence. Advance one interval at a time and assert that cleanup clears the remaining timer.

### How do I prevent fake timers from leaking into other Vitest files?

Call \`vi.useRealTimers()\` in cleanup and avoid enabling fake timers in shared setup unless the whole test environment is designed for it. Leaks are especially confusing when they freeze \`Date.now()\` for unrelated tests.
`,
};
