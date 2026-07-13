import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Use Testing Library user-event with Vitest Fake Timers',
  description:
    'Use Testing Library user-event with Vitest fake timers without hangs, coordinating advanceTimers, React updates, debounces, and reliable timer cleanup.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Use Testing Library user-event with Vitest Fake Timers

The button click has been awaited, the component looks trivial, and Vitest still waits until the test timeout. The deadlock often starts when \`user-event\` schedules its own delays while \`vi.useFakeTimers()\` has replaced the clock. Awaiting the user action cannot finish until time advances, but the test does not advance time because it is awaiting the action.

Testing Library provides the bridge: create the user with \`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })\`. That lets user-event request clock movement for delays it owns. Application timers are a separate concern. A debounced search, delayed tooltip, or autosave still needs explicit advancement at the point where the scenario expects time to pass.

## Two timer owners share one fake clock

It helps to identify who scheduled each callback. User-event can insert delays between low-level interactions so typing and clicking resemble browser input sequences. The component can schedule its own \`setTimeout\`, \`setInterval\`, or library callback. Vitest replaces the timer functions and controls when both sets run.

| Timer owner | Example | Who should advance it? | Assertion target |
| --- | --- | --- | --- |
| user-event | Delay between typed characters | \`advanceTimers\` supplied to \`userEvent.setup()\` | User promise resolves and input events fire |
| Component | 300 ms search debounce | Test at the business boundary | API call occurs only after 300 ms |
| UI library | Tooltip open delay | Test, usually through timer advancement | Tooltip becomes visible |
| Polling hook | Repeating refresh interval | Test one interval at a time | Refresh count and cleanup |
| Cleanup code | Deferred disposal callback | Teardown before restoring real timers | No callback leaks into another test |

Do not work around the hang with \`delay: null\`. Testing Library explicitly recommends the timer advancement option instead. Removing delay changes interaction scheduling and can hide ordering defects. The goal is coordination, not disabling behavior until the test happens to complete.

For date freezing and system-time scenarios beyond interaction scheduling, use the [Vitest fake timers and date guide](/blog/vitest-fake-timers-date-testing-guide). Here the clock is used to coordinate user actions with component delays.

## Configure user-event after fake timers are active

Create the user inside the test or in setup that runs after \`vi.useFakeTimers()\`. A globally shared user instance makes clock ownership ambiguous and can retain configuration across tests.

This React component delays its search callback until 300 ms after the last change. The test types with user-event, proves the debounce has not fired, advances the application clock, and verifies the exact query.

\`\`\`tsx
// SearchBox.tsx
import { useEffect, useState } from 'react';

type SearchBoxProps = {
  onSearch: (query: string) => void;
};

export function SearchBox({ onSearch }: SearchBoxProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (query.trim() === '') return;

    const timeout = window.setTimeout(() => {
      onSearch(query);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [query, onSearch]);

  return (
    <label>
      Product search
      <input value={query} onChange={event => setQuery(event.target.value)} />
    </label>
  );
}
\`\`\`

\`\`\`tsx
// SearchBox.test.tsx
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { SearchBox } from './SearchBox';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

test('searches 300 ms after the final keystroke', async () => {
  const onSearch = vi.fn();
  const user = userEvent.setup({
    advanceTimers: vi.advanceTimersByTime,
  });

  render(<SearchBox onSearch={onSearch} />);
  await user.type(screen.getByRole('textbox', { name: 'Product search' }), 'ssd');

  expect(onSearch).not.toHaveBeenCalled();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(299);
  });
  expect(onSearch).not.toHaveBeenCalled();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(onSearch).toHaveBeenCalledTimes(1);
  expect(onSearch).toHaveBeenCalledWith('ssd');
});
\`\`\`

The synchronous function passed to \`advanceTimers\` is enough for user-event's requested delays. The test uses \`advanceTimersByTimeAsync\` for the component boundary because the timer callback and React work may involve queued promises. Wrapping that advancement in React's \`act()\` makes the state transition part of the tested interaction.

## Why advancing timers before awaiting user-event fails

A common attempted fix is:

\`\`\`typescript
const promise = user.type(input, 'abc');
vi.runAllTimers();
await promise;
\`\`\`

This races the scheduler. The user promise may not have installed every later delay when \`runAllTimers()\` executes. Microtasks produced by one input step can schedule the next timer after the clock was drained. Sometimes the test works locally and stalls under a different runtime or user-event version.

Supplying \`advanceTimers\` delegates each user-owned delay at the moment it is needed. Then \`await user.type(...)\` has its normal semantic meaning: the modeled interaction finished. Advance component time only afterward unless the scenario intentionally overlaps typing with an application deadline.

That separation also makes failures readable. A hang during \`user.type\` points to interaction clock configuration. A missing callback after an explicit 300 ms points to component scheduling, React flushing, or the assertion.

## Synchronous and asynchronous Vitest advancement APIs

Vitest exposes synchronous and asynchronous forms of several timer controls. Choose based on whether timer callbacks queue promises that must settle before the next assertion.

| Vitest call | Clock behavior | Suitable example | Caution |
| --- | --- | --- | --- |
| \`vi.advanceTimersByTime(ms)\` | Runs timers reached synchronously | user-event \`advanceTimers\` adapter | Promise chains may remain pending |
| \`vi.advanceTimersByTimeAsync(ms)\` | Also allows asynchronous timer work to resolve | Debounce callback starts async state update | Must be awaited |
| \`vi.runOnlyPendingTimers()\` | Executes currently pending timers | Teardown flush before real timers | Recurring timers may schedule another pending timer |
| \`vi.runAllTimers()\` | Runs timers until none remain | Finite nested scheduling | Recursive intervals can hit the loop limit |
| \`vi.runAllTimersAsync()\` | Async version of complete drain | Finite timer and promise chain | Avoid when the application intentionally polls forever |
| \`vi.advanceTimersToNextTimer()\` | Moves to the next scheduled deadline | Unknown tooltip delay treated as implementation detail | Can couple the test to unrelated timers |

For business behavior, advancing an exact duration communicates the contract. The 299 plus 1 boundary test proves the debounce is neither early nor late. Running all timers would prove only that it eventually happens after some test-controlled drain.

Asynchronous advancement is not automatically better everywhere. Passing \`vi.advanceTimersByTimeAsync\` directly to user-event is type-compatible in current Testing Library because \`advanceTimers\` may return a promise, but a synchronous adapter is simpler when user-event only needs clock movement. Use the async form when your environment demonstrably schedules promise work between its timer steps.

## Testing cancellation when the user types again

A debounce test is incomplete if it proves only one delayed call. The defining behavior is cancellation of the previous deadline. Type a partial query, advance less than the delay, type again, and then cross the new deadline.

\`\`\`tsx
test('resets the debounce after another edit', async () => {
  const onSearch = vi.fn();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  render(<SearchBox onSearch={onSearch} />);
  const input = screen.getByRole('textbox', { name: 'Product search' });

  await user.type(input, 'lap');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });

  await user.type(input, 'top');
  await act(async () => {
    await vi.advanceTimersByTimeAsync(299);
  });
  expect(onSearch).not.toHaveBeenCalled();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });
  expect(onSearch).toHaveBeenCalledOnce();
  expect(onSearch).toHaveBeenLastCalledWith('laptop');
});
\`\`\`

This scenario uses user-event for input semantics and Vitest for time semantics. Directly firing change events would skip key, input, selection, and focus behavior. It might be appropriate for a reducer unit test, but it is weaker evidence for an interactive component.

## Timer cleanup is part of isolation

Fake timers replace global functions. Restore real timers after every test that enables them, even after an assertion throws. Vitest hooks execute during failure, so \`afterEach\` is the right owner.

Testing Library recommends flushing pending timers before returning to real timers. Third-party components may schedule callbacks that the test did not know about. Simply switching clocks can strand those callbacks or move confusing behavior into the next test.

There is a tradeoff: flushing can execute an application action that the test intentionally left pending, such as an autosave. Unmount the rendered tree first so effect cleanups cancel owned timers, then inspect or drain anything that remains. Testing Library's automatic cleanup normally unmounts after each test, but hook registration order can matter. An explicit local cleanup policy is useful in timer-heavy suites.

Do not put \`vi.useFakeTimers()\` in a global setup file unless nearly every test needs it. Fake clocks can affect \`waitFor\`, accessibility libraries, network mocks, and framework internals. A describe block or per-test setup narrows the blast radius.

## waitFor and fake time answer different questions

\`waitFor()\` retries an assertion until it passes or its timeout expires. Under fake timers, its polling and timeout mechanisms also interact with the mocked clock. Using it to wait for a known 300 ms debounce obscures the contract and can stall if time never advances.

Advance the known application deadline, then make a direct assertion. Use \`findByRole\` or \`waitFor\` after advancement only when some subsequent asynchronous work has no deterministic clock boundary, such as a resolved mocked request causing React to render.

| Scenario | Preferred synchronization | Reason |
| --- | --- | --- |
| 300 ms debounce | Advance 300 ms explicitly | Duration is the behavior under test |
| Tooltip opens after configured delay | Advance that delay, assert visibility | Tests open-delay contract |
| Promise resolves after timer callback | Async timer advancement, then query | Flushes timer and microtask work |
| DOM update from an externally resolved promise | Await a \`findBy*\` query | No clock movement is needed |
| Animation-end event | Dispatch or model the relevant event | A CSS event is not necessarily driven by JS timers |
| Network response in MSW | Await the UI result | Fake timers do not make network interception synchronous |

Avoid combining real-time \`waitFor\` assumptions with a frozen clock. Pick the source of progress explicitly.

## React act warnings reveal an unobserved transition

When advancing the clock triggers a React state update, React expects that transition to occur inside \`act()\`. Testing Library wraps user-event operations, but it cannot automatically wrap a separate call you make directly to Vitest.

An act warning is not console clutter to suppress. It often means the assertion can run before the UI settles. Wrap timer advancement that causes React work, await the async block, and assert the rendered result.

Do not wrap every line in one giant act block. Keep the triggering clock movement together, so the test describes which boundary caused the state change. If the timer callback starts a fetch, resolve that fetch through the chosen mock and await the visible UI state rather than repeatedly draining arbitrary queues.

React Strict Mode may run effect setup and cleanup more than once in development-oriented tests. A correctly implemented debounce clears the superseded timeout. Assert user-visible outcomes and call counts at stable boundaries, not internal timer counts that merely reflect the rendering mode.

## Combining user-event delay with product timing

The \`delay\` option on \`userEvent.setup()\` controls modeled spacing between certain user operations. It is not the component debounce and should not be tuned to make the product timer expire conveniently. Keep product deadlines explicit.

Suppose an autosave starts 500 ms after the last edit and typing uses a nonzero user delay. If the fake clock advances during typing, some product time can elapse between characters. That may be the realistic scenario you want, but it changes the boundary. Decide whether the test models fast typing with no autosave opportunity or slow typing that can trigger intermediate saves.

For the common fast-typing case, use user-event's default timing configuration with its timer adapter, then start measuring the 500 ms product window after the awaited interaction. For slow-typing behavior, set a documented delay and assert intermediate calls intentionally. Never let that distinction be an accidental consequence of a timeout workaround.

## Browser Mode and DOM emulation

The same conceptual split applies whether Vitest runs with jsdom, happy-dom, or Browser Mode, but timer implementation and rendering fidelity differ. Browser Mode executes tests in a real browser and is useful when behavior depends on native event details or browser APIs. Fake timer support and framework integration should be verified for the chosen provider and Vitest version.

Do not assume a fake-clock component test proves CSS transitions, native focus timing, or request scheduling in a browser. Keep deterministic unit-level timer tests, then add a smaller real-browser check for behavior whose risk lives in the platform. The [Vitest Browser Mode guide](/blog/vitest-browser-mode-guide-2026) helps decide where that additional coverage belongs.

## A debugging sequence for hanging tests

First, confirm \`vi.useFakeTimers()\` is active before the interaction and that the user was created with \`advanceTimers\`. If changing only that makes \`await user.click()\` finish, the deadlock was user-event scheduling.

Second, separate the awaited interaction from application advancement. Log or assert the input value immediately after typing. If it changed, user-event completed and the missing result belongs to the debounce or async effect.

Third, replace \`runAllTimers\` with advancement to one named deadline. Recurring polling can make a complete drain fail or loop. Inspect \`vi.getTimerCount()\` as a diagnostic, not as a product assertion, to see whether timers remain.

Fourth, wrap clock movement that causes React updates in async \`act\`. If the callback starts promise work, prefer an async Vitest advancement call. Finally, verify afterEach restores real timers even on the failing path. One leaking fake clock can make an unrelated later test look broken.

When the hang persists, reduce the test to one input and one interaction while retaining the same environment. Disable unrelated providers one at a time, especially routers, query clients, and UI libraries that schedule background work. A continuously rescheduled cache or polling timer can make \`runAllTimers\` appear to be the user-event problem. Capture the timer count before and after the user action, then after the product deadline. The counts are diagnostic breadcrumbs, not permanent assertions. This reduction distinguishes a clock integration defect from a component that intentionally keeps the event loop busy.

## Keep keyboard state and timer state local

User-event instances also retain modeled device state, such as pressed modifier keys, across calls made through that instance. This is useful for a Shift-click sequence and dangerous when one instance is shared between independent tests. Construct a new user after enabling fake timers in each case, and release modifiers within the scenario that pressed them.

Test focus behavior at the same time as timer behavior when it affects the product. An autosave may run on a deadline, on blur, or on whichever happens first. Type into the field, advance to just before the deadline, then use \`user.tab()\` and assert one save. Advancing the final millisecond afterward must not create a second save. That scenario exercises real focus events and cancellation logic, something a direct timer callback test misses.

Do not put \`userEvent.setup()\` inside React \`act()\`; setup itself is not the state transition. Await the interaction methods, and wrap only direct timer movement that triggers React work. This division keeps warnings useful and avoids a large opaque act boundary. If a helper creates both the user and clock controls, return explicit methods such as \`advanceProductTime\` rather than an all-purpose “flush” function. Named clock movement documents why time progresses and prevents later maintainers from draining unrelated library timers simply to make the assertion pass.

## Frequently Asked Questions

### Why does await user.click hang with Vitest fake timers?

User-event may be waiting on a delay scheduled through the mocked timer functions. Construct the user with \`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })\` so it can advance the fake clock for interaction delays.

### Should I set user-event delay to null to avoid timeouts?

No. Testing Library recommends using the \`advanceTimers\` option. Disabling delay can alter event scheduling and conceal the integration issue rather than coordinating the two libraries.

### When should I use advanceTimersByTimeAsync instead of the synchronous call?

Use the async form when reached timer callbacks schedule promise work that must settle before assertion, and await it. The synchronous function is a practical adapter for user-event, while component deadlines often benefit from async advancement inside React \`act()\`.

### Must pending timers run before vi.useRealTimers?

Flushing pending timers is the recommended default because libraries can leave scheduled callbacks. Unmount components first so their cleanup cancels owned work, and avoid indiscriminately draining intentionally recurring timers.

### Can fake timers replace findBy or waitFor entirely?

No. Fake timers control scheduled time. Async queries observe eventual DOM state. Advance a known product deadline explicitly, then use an async query only for later work whose completion is not represented by another deterministic timer boundary.
`,
};
