import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Clock API: Mock Time & Fake Timers Guide (2026)',
  description:
    'Master the Playwright Clock API to mock time and use fake timers. Control countdowns, polling, session timeouts, and "time ago" UI deterministically with page.clock.',
  date: '2026-06-28',
  category: 'Guide',
  content: `
# Playwright Clock API: Mock Time and Fake Timers Guide (2026)

The Playwright Clock API is the cleanest way to mock time in your end-to-end tests. With \`page.clock\`, you can use fake timers to control the browser's notion of "now" so that countdowns, polling loops, session timeouts, scheduled reminders, and "time ago" labels behave deterministically. Instead of inserting real \`setTimeout\` waits and praying the CI machine is fast enough, you fast-forward the Playwright fake clock by an exact amount and assert the result instantly.

This guide is a practical, runnable playbook for the Playwright Clock API in 2026. We will cover every method on \`page.clock\` — \`install()\`, \`setFixedTime()\`, \`fastForward()\`, \`runFor()\`, \`pauseAt()\`, \`resume()\`, and \`setSystemTime()\` — with real test scenarios: a countdown widget, a session-expiry banner, a polling fetch, and an analog clock. We will also cover the install-before-navigate gotcha that trips up most teams, how \`Date\` behaves inside the page context, and how Playwright's clock compares to sinon fake timers.

If your suite is plagued by timing-related failures, pair this with our guide to [fix flaky tests](/blog/fix-flaky-tests-guide). For broader fundamentals, see the [Playwright E2E guide](/blog/playwright-e2e-complete-guide) and, if you are new, the [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026). You can also [browse QA skills](/skills) to drop these patterns straight into AI-generated tests.

## Why mock time at all?

Real time is the enemy of fast, reliable tests. Any feature that depends on the clock forces a choice: either you wait the real duration (slow, and your suite balloons from seconds to minutes), or you wait "long enough" with an arbitrary timeout (flaky, because CI under load misses the window). Both are bad.

Consider a session-expiry banner that appears after 15 minutes of inactivity. Without a fake clock, testing it honestly means a 15-minute test. Nobody does that, so the behavior goes untested — until it breaks in production. The Playwright Clock API removes the dilemma entirely: you install fake timers, fast-forward 15 minutes in a single synchronous step, and assert the banner appears. The test runs in milliseconds and is fully deterministic.

The same logic applies to countdown timers, "expires in 3 days" labels, auto-refresh polling, debounce and throttle behavior, rate-limit cooldowns, JWT expiry, and animations driven by \`requestAnimationFrame\`. Anywhere your UI reads the clock or schedules a timer, the Playwright fake timer lets you drive it.

## How page.clock works

\`page.clock\` replaces the browser's time primitives inside the page with controllable fakes. Once installed, the following are intercepted: \`Date\`, \`setTimeout\`, \`clearTimeout\`, \`setInterval\`, \`clearInterval\`, \`requestAnimationFrame\`, \`cancelAnimationFrame\`, \`requestIdleCallback\`, \`cancelIdleCallback\`, and \`performance.now()\`.

There are two separate concepts to keep straight, and conflating them causes most confusion:

- **The wall clock** — what \`Date.now()\` and \`new Date()\` return inside the page. This is the timestamp your UI shows the user.
- **The timer queue** — pending \`setTimeout\`, \`setInterval\`, and animation-frame callbacks that fire when enough simulated time elapses.

Some methods move only the wall clock. Some methods advance both the wall clock and fire timers. Knowing which is which is the whole game.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('clock is installed and frozen', async ({ page }) => {
  // Freeze time at a known instant before the app loads.
  await page.clock.install({ time: new Date('2026-06-28T10:00:00Z') });
  await page.goto('/');

  // Inside the page, Date now reports the frozen value.
  const reported = await page.evaluate(() => new Date().toISOString());
  expect(reported).toBe('2026-06-28T10:00:00.000Z');
});
\`\`\`

## Clock API method reference

Here is the complete surface of \`page.clock\` with what each call actually does.

| Method | Signature | Effect |
|---|---|---|
| \`clock.install\` | \`install({ time? })\` | Replaces time APIs and freezes the clock at \`time\` (or now). Must run before navigation. |
| \`clock.setFixedTime\` | \`setFixedTime(time)\` | Forces \`Date\` to always return \`time\`. Timers still run; only the wall clock is pinned. |
| \`clock.setSystemTime\` | \`setSystemTime(time)\` | Jumps the wall clock to \`time\` without firing timers in between. |
| \`clock.fastForward\` | \`fastForward(ticks)\` | Jumps time forward by \`ticks\` ms (or \`'mm:ss'\`), firing due timers but skipping intermediate ticks. |
| \`clock.runFor\` | \`runFor(ticks)\` | Advances time by \`ticks\` ms, firing every timer scheduled in that window, tick by tick. |
| \`clock.pauseAt\` | \`pauseAt(time)\` | Fast-forwards to \`time\`, then pauses the clock so it no longer auto-advances. |
| \`clock.resume\` | \`resume()\` | Resumes automatic ticking after \`pauseAt\`, so timers fire in real wall-clock cadence again. |

The values for \`fastForward\`, \`runFor\`, and \`pauseAt\` accept either a number of milliseconds or a human string. \`'30:00'\` means 30 minutes; \`'01:10:00'\` means 1 hour 10 minutes; \`'2000'\` is also valid as a string but a bare number is clearer.

## clock.install: freeze before you navigate

\`install()\` is the entry point. It swaps in the fake time APIs and freezes the clock at the supplied \`time\`. Crucially, **you must call it before \`page.goto()\`** (more on that gotcha below).

Let's test a "time ago" label. The component renders "just now", "5 minutes ago", "2 hours ago" based on the difference between a post timestamp and the current time.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('renders relative "time ago" label from a frozen clock', async ({ page }) => {
  // Freeze "now" so the relative math is deterministic.
  await page.clock.install({ time: new Date('2026-06-28T12:00:00Z') });
  await page.goto('/feed');

  // The page seeds a post dated five minutes before our frozen now.
  await expect(page.getByTestId('post-age')).toHaveText('5 minutes ago');

  // Move the wall clock forward without waiting; the label recomputes on the
  // next render the app triggers.
  await page.clock.fastForward('55:00');
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('post-age')).toHaveText('an hour ago');
});
\`\`\`

After \`install()\`, the clock does not tick on its own. \`Date.now()\` returns the same value on every call until you advance it. That frozen behavior is exactly what you want for assertions that depend on a stable "now".

## clock.setFixedTime: pin the wall clock, keep timers alive

\`setFixedTime()\` is subtly different from \`install()\`. It forces every \`Date\` read to return the same instant, but it does **not** freeze the timer queue. Pending \`setTimeout\` and \`setInterval\` callbacks still fire when you advance time — they simply observe a wall clock that never moves.

This is the right tool when your UI displays a timestamp that must stay constant (so screenshots and assertions are stable), yet you still need interval-driven logic to run.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('dashboard timestamp stays fixed while polling continues', async ({ page }) => {
  await page.clock.install();
  await page.goto('/dashboard');

  // Pin the displayed "Generated at" timestamp.
  await page.clock.setFixedTime(new Date('2026-06-28T09:30:00Z'));
  await expect(page.getByTestId('generated-at')).toHaveText('09:30:00');

  // The dashboard polls every 10s. Advancing time fires the poll even though
  // Date stays pinned at 09:30.
  await page.clock.fastForward('00:30');
  await expect(page.getByTestId('poll-count')).toHaveText('3');

  // The timestamp has not moved, because setFixedTime pins the wall clock.
  await expect(page.getByTestId('generated-at')).toHaveText('09:30:00');
});
\`\`\`

If you used \`setSystemTime\` instead of \`setFixedTime\` here, the "Generated at" label would drift forward as you fast-forwarded. Choose based on whether the displayed time should move.

## clock.fastForward: jump ahead, skip the boring middle

\`fastForward()\` advances the clock by a duration and fires any timers that come due — but it does **not** execute intermediate ticks of a recurring interval one at a time. If a \`setInterval\` runs every second and you \`fastForward('01:00')\`, the callback fires once (collapsed), not sixty times. This makes it fast and ideal for "skip ahead" scenarios where you only care about the end state.

A classic case is a session-expiry banner. The app shows a warning after 15 minutes idle, then logs the user out at 20 minutes.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('session-expiry banner appears, then auto-logout fires', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-28T08:00:00Z') });
  await page.goto('/app');

  await expect(page.getByTestId('session-warning')).toBeHidden();

  // Jump 15 minutes ahead. The idle-warning timer fires.
  await page.clock.fastForward('15:00');
  await expect(page.getByTestId('session-warning')).toBeVisible();
  await expect(page.getByTestId('session-warning')).toHaveText(
    'Your session expires in 5 minutes',
  );

  // Jump the final 5 minutes. The logout timer fires and redirects.
  await page.clock.fastForward('05:00');
  await expect(page).toHaveURL(/\\/login/);
});
\`\`\`

Because \`fastForward\` collapses recurring timers, it is the wrong choice when you need to assert the value at every intermediate tick. For that, reach for \`runFor\`.

## clock.runFor: advance tick by tick

\`runFor()\` advances the clock by a duration and fires **every** scheduled timer in that window, in order, just as real time would. A one-second interval run for 5000 ms fires five times. Use \`runFor\` when the per-tick behavior matters — a countdown that must show 3, 2, 1, 0, or an animation that must update each frame.

Here is a countdown component that decrements a visible number every second and disables a button at zero.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('countdown decrements every second and locks at zero', async ({ page }) => {
  await page.clock.install();
  await page.goto('/checkout');

  // The "Offer expires in" countdown starts at 5 seconds.
  await expect(page.getByTestId('countdown')).toHaveText('5');

  // Advance one second at a time and assert each value.
  await page.clock.runFor(1000);
  await expect(page.getByTestId('countdown')).toHaveText('4');

  await page.clock.runFor(1000);
  await expect(page.getByTestId('countdown')).toHaveText('3');

  // Run the remaining three seconds in one call; every tick still fires.
  await page.clock.runFor(3000);
  await expect(page.getByTestId('countdown')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Claim offer' })).toBeDisabled();
});
\`\`\`

The distinction is real: \`fastForward(5000)\` would jump straight to 0 (firing the interval's due callbacks in a collapsed way), while \`runFor(5000)\` walks through 4, 3, 2, 1, 0. If your assertions check intermediate states, you need \`runFor\`.

## clock.pauseAt and clock.resume: stop time, then let it flow

\`pauseAt()\` fast-forwards to a target instant and then **pauses** the clock so it stops auto-advancing. This is useful for testing behavior that is tied to a specific wall-clock moment — say, a "happy new year" banner that should appear exactly at midnight, or a maintenance window that opens at 02:00.

\`resume()\` undoes the pause: the clock starts ticking again at real wall-clock speed, so any pending timers fire on their natural schedule.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('scheduled reminder fires at a precise moment', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-12-31T23:59:50Z') });
  await page.goto('/celebrations');

  await expect(page.getByTestId('new-year-banner')).toBeHidden();

  // Fast-forward to one second before midnight, then pause there.
  await page.clock.pauseAt(new Date('2026-12-31T23:59:59Z'));
  await expect(page.getByTestId('new-year-banner')).toBeHidden();

  // Resume so the clock ticks naturally; cross midnight and the banner shows.
  await page.clock.resume();
  await page.clock.runFor(1500);
  await expect(page.getByTestId('new-year-banner')).toBeVisible();
});
\`\`\`

A common pattern: \`pauseAt\` to line everything up at the critical instant, assert the "before" state, then \`resume\` plus \`runFor\` to cross the boundary and assert the "after" state. The pause guarantees nothing fires prematurely while you set up.

## clock.setSystemTime: jump without firing the in-between timers

\`setSystemTime()\` moves the wall clock to a new instant **without** firing the timers that would have elapsed during the jump. This is the difference that catches people: \`fastForward\` and \`runFor\` execute due timers, but \`setSystemTime\` simply teleports the clock and leaves the timer queue as if no time passed.

Use it to set up a starting condition — for example, "pretend the app started at 9 AM" — or to simulate a sudden clock change like a daylight-saving jump or an NTP correction, where you specifically want to verify the app handles a discontinuity gracefully.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('app tolerates a sudden system clock jump', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-03-29T01:59:00Z') });
  await page.goto('/scheduler');

  // Simulate a daylight-saving jump: the OS clock leaps forward an hour,
  // but no scheduled timers "in between" should fire spuriously.
  await page.clock.setSystemTime(new Date('2026-03-29T03:00:00Z'));

  // The displayed time reflects the jump immediately.
  await expect(page.getByTestId('local-time')).toHaveText('03:00');

  // No phantom hourly job ran during the skipped hour.
  await expect(page.getByTestId('jobs-run')).toHaveText('0');
});
\`\`\`

If you wanted those hourly jobs to fire during the elapsed hour, you would use \`fastForward\` or \`runFor\` instead. \`setSystemTime\` is precisely the "skip without side effects" tool.

## install vs setFixedTime vs setSystemTime

These three are the most confused trio in the API. Here is the side-by-side.

| Aspect | \`install({ time })\` | \`setFixedTime(time)\` | \`setSystemTime(time)\` |
|---|---|---|---|
| Replaces time APIs | Yes (this is the setup call) | No (assumes install already ran) | No (assumes install already ran) |
| Runs before navigation | Required | Any time after install | Any time after install |
| Effect on \`Date\` | Freezes at \`time\` | Pins to \`time\` permanently | Jumps to \`time\` once |
| Does \`Date\` advance later? | Only when you advance the clock | Never (always returns \`time\`) | Yes, ticks on from \`time\` |
| Fires in-between timers | n/a (sets baseline) | n/a (does not move the queue) | No (teleports, no timers fire) |
| Typical use | Bootstrap fake timers | Stable displayed timestamp | Set a start point or simulate a jump |

A reliable mental model: \`install\` is the one-time setup that must precede navigation. \`setFixedTime\` glues \`Date\` to a constant. \`setSystemTime\` teleports the clock with no timer side effects. To actually fire timers you use \`fastForward\` (collapsed) or \`runFor\` (every tick).

## The install-before-navigate gotcha

The single most common Playwright Clock API mistake: calling \`install()\` after \`page.goto()\`. By the time the page has loaded, your application's modules have already captured references to the real \`Date\`, \`setTimeout\`, and \`requestAnimationFrame\`. Installing the fake clock afterward swaps the globals, but code that grabbed a reference at module-load time still holds the originals, and your fake timers never reach it.

\`\`\`typescript
// WRONG: app code may have already cached the real timers.
await page.goto('/dashboard');
await page.clock.install({ time: new Date('2026-06-28T10:00:00Z') });

// RIGHT: install first, navigate second.
await page.clock.install({ time: new Date('2026-06-28T10:00:00Z') });
await page.goto('/dashboard');
\`\`\`

If you must control time for an entire file, install in a \`beforeEach\` before any navigation. A handy pattern is a fixture that installs the clock and then yields, so every test in the project starts with fake timers already armed.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.clock.install({ time: new Date('2026-06-28T10:00:00Z') });
    await use(page);
  },
});

export { expect };
\`\`\`

With that fixture, navigation inside any test happens after install, so the gotcha cannot bite.

## Using Date inside the page context

A subtlety worth internalizing: \`page.clock\` controls time **inside the browser page**, not in your Node test process. \`new Date()\` in your test file uses the real system clock; \`new Date()\` executed via \`page.evaluate()\` uses the fake clock. Keep them straight.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('Date in the page reflects the fake clock', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');

  // This runs in Node — real time, NOT the fake clock.
  const nodeNow = Date.now();
  expect(nodeNow).toBeGreaterThan(new Date('2026-01-01').getTime());

  // This runs in the page — the fake clock.
  const pageNow = await page.evaluate(() => Date.now());
  expect(pageNow).toBe(new Date('2026-01-01T00:00:00Z').getTime());

  // Advance the page clock and re-read.
  await page.clock.fastForward(60_000);
  const pageLater = await page.evaluate(() => Date.now());
  expect(pageLater).toBe(new Date('2026-01-01T00:01:00Z').getTime());
});
\`\`\`

Because the values you pass to \`install\` and friends are timestamps, always pin a timezone explicitly — use ISO strings with a \`Z\` suffix or numeric epoch milliseconds — so a test that passes on a developer's machine in IST also passes in a UTC CI runner.

## A full scenario: testing an analog clock and a polling fetch

Let's combine techniques. Imagine a widget with two parts: an analog clock whose hands move on \`requestAnimationFrame\`, and a price ticker that polls an endpoint every five seconds. We want to assert the hands point correctly at a known time and that polling happens on schedule.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('analog clock hands and polling ticker', async ({ page }) => {
  // Freeze at 3:00 exactly so the hour hand is at 90 degrees.
  await page.clock.install({ time: new Date('2026-06-28T15:00:00Z') });
  await page.goto('/widgets');

  // The SVG hour hand exposes its rotation as a data attribute.
  await expect(page.getByTestId('hour-hand')).toHaveAttribute(
    'data-deg',
    '90',
  );

  // requestAnimationFrame-driven smooth animation: run forward 1s of frames.
  await page.clock.runFor(1000);

  // The ticker polls every 5s. No poll yet at t+1s.
  await expect(page.getByTestId('poll-count')).toHaveText('0');

  // Fast-forward to t+15s: three polls land (5s, 10s, 15s).
  await page.clock.fastForward('00:15');
  await expect(page.getByTestId('poll-count')).toHaveText('3');

  // At t+15s the minute hand has moved a quarter degree; assert the new state.
  await expect(page.getByTestId('minute-hand')).toHaveAttribute(
    'data-deg',
    '1.5',
  );
});
\`\`\`

This single test exercises \`install\`, \`runFor\`, and \`fastForward\` against both animation-frame and interval timers — no real waiting, fully deterministic, and it finishes in a fraction of a second. For the network side, you would typically combine this with route interception so the polled responses are also controlled; see the [Playwright E2E guide](/blog/playwright-e2e-complete-guide) for request mocking patterns.

## Playwright Clock API vs sinon fake timers

Before \`page.clock\` existed, the common workaround was to inject sinon's fake timers into the page via an init script. It worked, but it was fiddly: you had to bundle sinon, run it as an \`addInitScript\`, and manually call \`clock.tick()\` through \`page.evaluate\`. The Playwright Clock API is purpose-built and integrated, so it is the better default in 2026.

| Concern | Playwright \`page.clock\` | sinon fake timers |
|---|---|---|
| Setup | Built in, one \`install()\` call | Bundle sinon, inject via init script |
| API surface | \`fastForward\`, \`runFor\`, \`pauseAt\`, \`setSystemTime\` | \`tick\`, \`setSystemTime\`, \`runAll\` |
| Runs in the page | Yes, natively | Yes, but you wire it up manually |
| Cross-process clarity | Clear Node vs page split | Easy to confuse which clock you tick |
| Maintenance | Tracks Playwright releases | Separate dependency to update |
| Recommended for E2E | Yes | Legacy / unit-test contexts |

Sinon is still excellent for **unit** tests in Node, where there is no page. But for browser end-to-end tests, \`page.clock\` is the native, less error-prone option. If you are migrating, the mapping is roughly: \`clock.tick(ms)\` becomes \`page.clock.runFor(ms)\` when you need every tick, or \`fastForward(ms)\` when you only want the end state.

## Use cases mapped to the right method

To make the choice mechanical, here is a cheat sheet from feature to method.

| Feature under test | Best method |
|---|---|
| "Time ago" label that must stay stable for assertions | \`install({ time })\` then read |
| Displayed timestamp that must never move | \`setFixedTime(time)\` |
| Countdown where every second matters (5, 4, 3...) | \`runFor(1000)\` per tick |
| Session timeout / auto-logout end state | \`fastForward('20:00')\` |
| Polling that fires N times over a window | \`fastForward\` (count) or \`runFor\` (each) |
| Banner that triggers at one exact instant | \`pauseAt(time)\` then \`resume\` |
| Simulating a DST / NTP clock jump | \`setSystemTime(time)\` |
| Animation driven by requestAnimationFrame | \`runFor\` (frame by frame) |

When in doubt: \`runFor\` if intermediate states are asserted, \`fastForward\` if only the final state matters, \`setSystemTime\` if you want to teleport without side effects, and \`setFixedTime\` if a displayed value must be constant.

## Common pitfalls and how to avoid them

A few traps that cause confusing failures even after you know the API:

- **Forgetting the time argument.** \`install()\` with no \`time\` freezes at the current real time, which differs run to run. Always pass an explicit \`time\` when assertions depend on a specific date.
- **Mixing Node time and page time.** As shown above, \`Date.now()\` in your test is real; only \`page.evaluate\` sees the fake clock. Compute expected timestamps from the same epoch you installed.
- **Expecting fastForward to walk every tick.** It collapses recurring timers. If your assertion checks each intermediate value, switch to \`runFor\`.
- **Asserting before the render settles.** Advancing the clock fires timers, but the framework may need a microtask to re-render. Playwright's web-first \`expect\` retries, so prefer \`await expect(locator).toHaveText(...)\` over reading a value once.
- **Timezone drift.** Pin every timestamp with an explicit zone. A bare \`new Date('2026-06-28')\` is midnight UTC, which is the previous evening in the Americas — a classic off-by-one in date-label tests.

Treating these as a checklist when a clock test misbehaves usually surfaces the cause in seconds. If failures persist and feel nondeterministic, our [fix flaky tests](/blog/fix-flaky-tests-guide) guide covers the broader patterns.

## Conclusion

The Playwright Clock API turns the hardest category of UI tests — anything time-dependent — into fast, deterministic checks. With \`page.clock\` you mock time and use fake timers to drive countdowns, session timeouts, polling, scheduled reminders, and "time ago" labels in milliseconds, with no real waiting and no flakiness. Install before you navigate, pick \`runFor\` when every tick matters and \`fastForward\` when only the end state does, reach for \`setFixedTime\` to pin a displayed value, and use \`setSystemTime\` to teleport without side effects. That small vocabulary covers nearly every clock-driven feature you will ever test.

Ready to put it to work? [Browse QA skills](/skills) to drop ready-made Playwright clock patterns into your AI-generated tests, then deepen your foundation with the [Playwright E2E guide](/blog/playwright-e2e-complete-guide) and the [Playwright tutorial for beginners](/blog/playwright-tutorial-beginners-2026).

## Frequently Asked Questions

### What is the Playwright Clock API?

The Playwright Clock API, accessed through \`page.clock\`, lets tests control the browser's notion of time. After installing it, calls like \`fastForward\` and \`runFor\` advance a fake clock so timers and date logic behave deterministically. It replaces real waiting, making time-dependent features such as countdowns, session timeouts, and "time ago" labels fast and reliable to test.

### How do I mock time in Playwright?

Call \`page.clock.install\` with an explicit time before you navigate, then drive the clock with the advance methods. Use \`fastForward\` to jump ahead to an end state, \`runFor\` to fire every timer tick in a window, \`setFixedTime\` to pin a displayed value, and \`setSystemTime\` to teleport the clock. Because it runs inside the page, the application sees your fake time instead of the real system clock.

### What is the difference between fastForward and runFor?

Both advance the clock, but they fire timers differently. \`fastForward\` jumps the clock and collapses recurring timers, firing due callbacks without walking every intermediate tick, so it is ideal when only the final state matters. \`runFor\` advances tick by tick and fires every scheduled timer in order, which you need when assertions check each intermediate value, such as a countdown showing five, four, three, two, one.

### Why must I install the clock before navigation?

Application code often captures references to \`Date\`, \`setTimeout\`, and \`requestAnimationFrame\` when its modules first load. If you install the fake clock after the page navigates, that already-cached code keeps using the real timers and your fake clock never reaches it. Installing before \`page.goto\` guarantees the fakes are in place before any module loads, so every part of the app reads controlled time.

### What is the difference between setFixedTime and setSystemTime?

\`setFixedTime\` permanently pins what \`Date\` returns, so the displayed time never moves even as timers continue to fire when you advance the clock. \`setSystemTime\` instead jumps the wall clock to a new instant once and then lets it tick forward normally, without firing the timers that would have elapsed during the jump. Use the former for stable displayed timestamps and the latter for simulating a clock change.

### Can I test countdowns and session timeouts without real waits?

Yes, that is the core benefit. Install the clock, then advance it by the exact duration you need. A fifteen-minute session warning is tested with a single \`fastForward\` of fifteen minutes, and a per-second countdown is tested with repeated \`runFor\` calls. The test completes in milliseconds regardless of the real-world durations involved, and it is fully deterministic because no actual time elapses.

### How does the Playwright Clock API compare to sinon fake timers?

Sinon fake timers predate \`page.clock\` and required bundling sinon and injecting it through an init script, which was easy to misconfigure. The Playwright Clock API is built in, runs natively inside the page, and offers clearer methods like \`fastForward\`, \`runFor\`, and \`pauseAt\`. For browser end-to-end tests it is the recommended default, while sinon remains a good fit for pure Node unit tests where there is no page involved.

### Does page.clock affect Date in my Node test code?

No. The fake clock only controls time inside the browser page. A \`new Date()\` written directly in your test file runs in the Node process and uses the real system clock, while a \`new Date()\` executed through \`page.evaluate\` sees the fake clock. Keep the two straight by computing expected page timestamps from the same value you passed to \`install\`, and always pin a timezone to avoid off-by-one date errors.
`,
};
