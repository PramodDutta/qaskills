import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Clock API: Mock Time, Dates & Timers in Tests',
  description:
    'Master the Playwright Clock API (page.clock) to mock time, dates, and timers. Learn setFixedTime, setSystemTime, fastForward, pauseAt, and runFor with runnable code.',
  date: '2026-06-08',
  category: 'Guide',
  content: `
# Playwright Clock API: Mock Time, Dates & Timers in Tests

Time-dependent UI is one of the most reliable sources of flaky end-to-end tests. The moment your application reads the wall clock, your test inherits a moving target. A countdown timer that says "expires in 5:00" when you take a screenshot says "4:58" by the time the assertion runs. A "5 minutes ago" timestamp drifts to "6 minutes ago" if the CI runner is slow. A session-expiry banner that should appear after 30 minutes of inactivity is impossible to test honestly without sitting through 30 real minutes. Scheduled banners, promotional countdowns, polling intervals, auto-logout warnings, "new since your last visit" badges, debounced autosave, and animated progress rings all behave differently depending on the exact millisecond your test executes. The traditional workaround was ugly: insert real \`waitForTimeout\` calls, pad assertions with generous tolerances, or stub out the clock with hand-rolled monkey-patches injected through \`addInitScript\`. None of those scale, and all of them make tests slower and more brittle.

The Playwright Clock API, exposed as \`page.clock\`, solves this at the browser level. It installs a fake clock into the page that intercepts \`Date\`, \`Date.now\`, \`performance.now\`, \`setTimeout\`, \`setInterval\`, \`requestAnimationFrame\`, and the rest of the timing surface. Your application code does not change. It still calls \`new Date()\` and \`setInterval()\` exactly as before, but now those calls return values you control. You can freeze time at a specific instant, jump forward an hour instantly without waiting, pause at a scheduled moment, or let timers fire in fast-forward. This turns flaky time-based tests into deterministic, millisecond-precise checks that run in milliseconds of real time. In this guide you will learn every method of the Clock API with runnable TypeScript, the crucial difference between \`setFixedTime\` and \`setSystemTime\`, and the patterns for countdowns, relative timestamps, auto-logout, and polling. If you are new to Playwright, start with our [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide) first.

## Why Time-Based Tests Are Flaky Without page.clock

Consider a deceptively simple feature: a checkout page that shows "Your cart is reserved for 10:00" and counts down. A naive test might look like this.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('cart shows reservation countdown', async ({ page }) => {
  await page.goto('/checkout');
  // We read the timer, but by the time the assertion runs,
  // a real second may have already elapsed.
  await expect(page.getByTestId('reservation-timer')).toHaveText('10:00');
});
\`\`\`

This test passes locally and fails in CI roughly one run in five, because between the page load and the assertion, the real clock advanced past the 10:00 boundary. The classic "fix" is to widen the assertion or sleep, both of which hide bugs and slow the suite. With \`page.clock\` you freeze the clock so 10:00 is 10:00 forever until you explicitly advance it. No tolerance, no sleep, no flake.

## Installing the Fake Clock with page.clock.install()

The entry point is \`page.clock.install()\`. It must run **before** the page script reads the clock, so call it before \`page.goto()\`. You can seed it with an initial time.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('install fake clock before navigation', async ({ page }) => {
  // Seed the clock to a fixed instant. Accepts a Date, a number
  // (epoch ms), or an ISO string.
  await page.clock.install({ time: new Date('2026-06-08T10:00:00Z') });

  await page.goto('/checkout');

  // Inside the page, Date.now() now returns the seeded time.
  const now = await page.evaluate(() => Date.now());
  expect(now).toBe(new Date('2026-06-08T10:00:00Z').getTime());
});
\`\`\`

After \`install\`, the page's timers are under your control. They do not advance on their own; you decide when and how far time moves. This is the foundation for every other method.

## setFixedTime vs setSystemTime: The Key Difference

This is the single most important distinction in the Clock API, and getting it wrong leads to confusing test failures. Both set "what time it is", but they behave very differently with respect to timers.

- **\`setFixedTime(time)\`** pins \`Date.now()\` and \`new Date()\` to a constant value. Every call returns the same instant no matter how much real or fake time passes. Timers (\`setTimeout\`, \`setInterval\`) are **not** affected and will **not** fire just because you set a fixed time. Use it when you only care about what date the UI renders, not about timers firing.
- **\`setSystemTime(time)\`** sets the current simulated time **and** keeps the clock running conceptually, so subsequent calls to \`fastForward\`, \`runFor\`, \`pauseAt\`, and \`resume\` advance from that base and **do** fire timers. Use it when you need timers to run relative to a starting point.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('setFixedTime keeps Date frozen', async ({ page }) => {
  await page.clock.install();
  await page.goto('/dashboard');

  // Pin the displayed date. The clock stays frozen here forever.
  await page.clock.setFixedTime(new Date('2026-12-25T09:00:00'));

  // Even if we read it twice, it is identical.
  const first = await page.evaluate(() => Date.now());
  const second = await page.evaluate(() => Date.now());
  expect(first).toBe(second);

  await expect(page.getByTestId('today-label')).toContainText('December 25, 2026');
});

test('setSystemTime lets timers advance from a base', async ({ page }) => {
  await page.clock.install();
  await page.goto('/dashboard');

  // Establish a base time, then advance to fire timers.
  await page.clock.setSystemTime(new Date('2026-12-25T09:00:00'));
  await page.clock.fastForward(60_000); // 60s of fake time, timers fire

  await expect(page.getByTestId('auto-refresh-badge')).toBeVisible();
});
\`\`\`

Here is a quick comparison to keep handy.

| Method | Sets Date.now() | Fires timers when advanced | Typical use |
|---|---|---|---|
| \`install({ time })\` | Yes (seed) | Sets up the machinery | Always call first |
| \`setFixedTime(t)\` | Yes, frozen | No | Render a fixed date/timestamp |
| \`setSystemTime(t)\` | Yes, base | Yes (via advance methods) | Start point before fast-forward |
| \`fastForward(ms)\` | Advances | Yes, all in range | Skip ahead instantly |
| \`runFor(ms)\` | Advances | Yes, tick by tick | Drive intervals precisely |
| \`pauseAt(date)\` | Pauses at | Yes, up to that point | Stop exactly at a moment |
| \`resume()\` | Resumes | Yes, real-time pace | Let it run normally |

A useful mental model: \`setFixedTime\` is a photograph of the clock; \`setSystemTime\` is the clock's starting position before you wind it forward.

## Fast-Forwarding Time with fastForward()

\`fastForward\` jumps the clock ahead by a duration and fires every timer scheduled within that window, instantly. You can pass milliseconds as a number, or a human-readable \`"mm:ss"\` / \`"hh:mm:ss"\` string.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('fast-forward fires due timers immediately', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T10:00:00') });
  await page.goto('/notifications');

  // Jump 30 minutes ahead. Any setTimeout/setInterval scheduled
  // within those 30 minutes fires now, with zero real wait.
  await page.clock.fastForward('30:00'); // mm:ss => 30 minutes

  await expect(page.getByText('You have new messages')).toBeVisible();

  // Equivalent numeric form:
  await page.clock.fastForward(30 * 60 * 1000);
});
\`\`\`

\`fastForward\` is the workhorse for "after X minutes, Y should happen" scenarios. Because it collapses the wait into an instant, a test that conceptually covers an hour runs in a few milliseconds. Note that \`fastForward\` skips through time quickly and fires timers in order, which is ideal for end-state assertions. When you need to observe intermediate ticks, use \`runFor\` instead.

## Driving Intervals Precisely with runFor()

\`runFor\` advances the clock by the given duration while ticking through it, which is the right tool when you want to verify behavior at each step, such as an interval that updates a value every second.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('runFor drives a per-second interval', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T10:00:00') });
  await page.goto('/timer');

  const display = page.getByTestId('elapsed-seconds');
  await expect(display).toHaveText('0');

  // Advance exactly 3 seconds; a setInterval(…, 1000) ticks 3 times.
  await page.clock.runFor(3000);
  await expect(display).toHaveText('3');

  // Advance one more second.
  await page.clock.runFor(1000);
  await expect(display).toHaveText('4');
});
\`\`\`

The difference between \`runFor\` and \`fastForward\` matters: \`runFor(3000)\` simulates time passing in a way that intermediate \`setInterval\` callbacks all execute as if a real three seconds elapsed, whereas \`fastForward\` is optimized for jumping to the end state. For most interval-update assertions, reach for \`runFor\`.

## Pausing at an Exact Moment with pauseAt()

\`pauseAt\` advances the clock to a specific date and then **pauses** there, firing all timers due up to that instant. It is perfect for testing scheduled events: a banner that should appear at exactly midnight, a flash sale that opens at 12:00:00.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('flash sale banner appears exactly at start time', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T11:59:00') });
  await page.goto('/');

  // Banner is not visible one minute before.
  await expect(page.getByTestId('flash-sale')).toBeHidden();

  // Jump to the exact start instant and pause there.
  await page.clock.pauseAt(new Date('2026-06-08T12:00:00'));

  await expect(page.getByTestId('flash-sale')).toBeVisible();
});
\`\`\`

After \`pauseAt\`, the clock is frozen at that target. Nothing advances until you call another method. This lets you assert the precise on/off boundary of a scheduled feature without any timing tolerance.

## Resuming Normal Time with resume()

When a clock is paused (after \`pauseAt\`), \`resume()\` lets it tick forward at the normal real-time pace again. This is less common in deterministic tests but useful when you want to verify that the app behaves correctly once the fake clock is released into a running state.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('resume lets the clock run after a pause', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T12:00:00') });
  await page.goto('/live-feed');

  await page.clock.pauseAt(new Date('2026-06-08T12:00:05'));
  await expect(page.getByTestId('feed-status')).toHaveText('Paused at 12:00:05');

  // Release the clock; timers now advance with real time again.
  await page.clock.resume();
});
\`\`\`

In practice, deterministic suites favor \`fastForward\` / \`runFor\` over \`resume\`, because \`resume\` reintroduces real elapsed time. Use \`resume\` sparingly, when the scenario genuinely needs a running clock.

## Testing a Countdown Timer End-to-End

Countdowns are the canonical Clock API use case. Here we freeze the start, advance in controlled steps, and assert the displayed value at each boundary, including the "expired" state.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('checkout reservation countdown reaches zero', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T10:00:00') });
  await page.goto('/checkout');

  const timer = page.getByTestId('reservation-timer');

  // Frozen start: a deterministic 10:00.
  await expect(timer).toHaveText('10:00');

  // Advance 5 minutes; the interval ticks the display down.
  await page.clock.runFor(5 * 60 * 1000);
  await expect(timer).toHaveText('05:00');

  // Advance the remaining 5 minutes to expiry.
  await page.clock.runFor(5 * 60 * 1000);
  await expect(timer).toHaveText('00:00');
  await expect(page.getByText('Your reservation has expired')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled();
});
\`\`\`

This test exercises a full ten-minute countdown in a handful of milliseconds and asserts every meaningful boundary with zero flakiness. There is no \`waitForTimeout\`, no tolerance band, and no chance of CI slowness corrupting the result.

## Testing Relative Timestamps Like "5 Minutes Ago"

Relative timestamps ("just now", "5 minutes ago", "2 hours ago") read the current time and subtract a stored timestamp. With a fixed clock you can pin both ends and assert the exact human-readable output.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('relative timestamp renders correctly for each bucket', async ({ page }) => {
  // The post in the fixture was created at 09:55.
  // We freeze "now" at progressively later instants.
  await page.clock.install();
  await page.goto('/feed');

  await page.clock.setFixedTime(new Date('2026-06-08T09:55:30'));
  await page.reload();
  await expect(page.getByTestId('post-time')).toHaveText('just now');

  await page.clock.setFixedTime(new Date('2026-06-08T10:00:00'));
  await page.reload();
  await expect(page.getByTestId('post-time')).toHaveText('5 minutes ago');

  await page.clock.setFixedTime(new Date('2026-06-08T11:55:00'));
  await page.reload();
  await expect(page.getByTestId('post-time')).toHaveText('2 hours ago');
});
\`\`\`

Because \`setFixedTime\` freezes \`Date.now()\`, the relative-time library inside your app computes a stable difference every render. You can cover every bucket of your formatting logic deterministically. Pair this with our [Playwright testing best practices](/blog/playwright-testing-best-practices-2026) for stable selector strategies on these dynamic elements.

## Testing Session Expiry and Auto-Logout

Auto-logout after inactivity is notoriously hard to test honestly, who wants a 30-minute test? With \`page.clock\` you fast-forward straight through the idle window and assert the redirect or warning modal.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('user is logged out after 30 minutes of inactivity', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T09:00:00') });
  await page.goto('/dashboard');
  await expect(page.getByText('Welcome back')).toBeVisible();

  // A warning modal is configured to appear at 25 minutes idle.
  await page.clock.fastForward('25:00');
  await expect(page.getByRole('dialog', { name: 'Session expiring' })).toBeVisible();

  // Five more minutes with no activity triggers the logout redirect.
  await page.clock.fastForward('05:00');
  await expect(page).toHaveURL(/\\/login/);
  await expect(page.getByText('You were logged out due to inactivity')).toBeVisible();
});
\`\`\`

You can also verify the opposite: that user activity resets the timer. Advance partway, simulate a click, advance again, and assert the user is still logged in. Auth flows like this pair naturally with browse the [QA skills directory](/skills) for ready-made auth and session-handling skills you can drop into your agent.

## Testing Polling and setInterval Behavior

Apps that poll an endpoint every N seconds, a live dashboard, an order-status tracker, a notifications poller, can be driven precisely with the Clock API combined with network mocking. First, the timer side.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('dashboard polls status every 10 seconds', async ({ page }) => {
  let pollCount = 0;
  await page.route('**/api/status', async (route) => {
    pollCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ tick: pollCount }),
    });
  });

  await page.clock.install({ time: new Date('2026-06-08T10:00:00') });
  await page.goto('/dashboard');

  // Initial load triggers one poll.
  await expect.poll(() => pollCount).toBe(1);

  // Advance 30 seconds => three more polls at the 10s interval.
  await page.clock.runFor(30_000);
  await expect.poll(() => pollCount).toBe(4);

  await expect(page.getByTestId('status-tick')).toHaveText('4');
});
\`\`\`

This verifies both the cadence (how often the interval fires) and that the UI reflects the latest poll. To learn more about controlling the network responses themselves, see our [network interception and mocking guide](/blog/playwright-network-mocking-route-handler-guide), which pairs perfectly with the Clock API for fully deterministic data-plus-time tests.

## Controlling Date.now() and new Date() in the Page

Sometimes you want to inspect or assert against the page's notion of time directly. After \`install\`, both \`Date.now()\` and the \`Date\` constructor inside the page are intercepted.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('page Date constructor returns the fake time', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');

  const reported = await page.evaluate(() => {
    // Both forms read the fake clock.
    const viaNow = Date.now();
    const viaCtor = new Date().toISOString();
    const viaPerf = performance.now();
    return { viaNow, viaCtor, viaPerf };
  });

  expect(reported.viaCtor).toBe('2026-01-01T00:00:00.000Z');
  expect(reported.viaNow).toBe(new Date('2026-01-01T00:00:00Z').getTime());
  expect(typeof reported.viaPerf).toBe('number');
});
\`\`\`

This is handy when debugging: if a component renders the wrong date, you can confirm whether it is reading the clock correctly versus computing the offset incorrectly. Everything the page asks about time flows through your fake clock.

## Handling Time Zones with the Clock API

The Clock API controls the *instant* in time, but the displayed *time zone* is governed by the browser context. Combine \`page.clock\` with the \`timezoneId\` context option so a fixed instant renders consistently regardless of where CI runs.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.use({ timezoneId: 'America/New_York' });

test('timestamp renders in the configured time zone', async ({ page }) => {
  // A UTC instant. With the NY time zone, this is 05:00 EST.
  await page.clock.install({ time: new Date('2026-06-08T10:00:00Z') });
  await page.goto('/event');

  // The app formats with the browser locale/zone.
  await expect(page.getByTestId('event-local-time')).toContainText('6:00 AM');
});
\`\`\`

Set \`timezoneId\` per test with \`test.use\`, or globally in \`playwright.config.ts\` so every run is deterministic. Without pinning the zone, a developer in IST and a CI box in UTC will see different rendered times for the same instant, reintroducing flakiness the Clock API was meant to remove.

## Combining the Clock API with Network Mocking

The most robust time-based tests control both inputs to the UI: the data (via \`page.route\`) and the clock (via \`page.clock\`). Here is a "5 minutes ago" timestamp where the server timestamp is mocked and the current time is frozen, leaving nothing to chance.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('comment timestamp is fully deterministic', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T10:00:00Z') });

  await page.route('**/api/comments', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, text: 'Nice post!', createdAt: '2026-06-08T09:55:00Z' },
      ]),
    });
  });

  await page.goto('/post/42');

  // Frozen now (10:00) minus mocked createdAt (09:55) = 5 minutes.
  await expect(page.getByTestId('comment-time')).toHaveText('5 minutes ago');
});
\`\`\`

By controlling both the clock and the network, the rendered output is a pure function of your fixtures. The test will produce the same result on every machine, every time, forever.

## Common Pitfalls and How to Avoid Them

A few mistakes trip people up repeatedly. Here is a reference of the most frequent ones and their fixes.

| Pitfall | Symptom | Fix |
|---|---|---|
| Calling \`install\` after \`goto\` | App already read real time | Always \`install\` before \`page.goto\` |
| Using \`setFixedTime\` for timers | Intervals never fire | Use \`setSystemTime\` + \`runFor\`/\`fastForward\` |
| Forgetting \`timezoneId\` | Rendered time differs per machine | Pin \`timezoneId\` in config or \`test.use\` |
| \`fastForward\` when you need ticks | Intermediate states skipped | Use \`runFor\` to observe each tick |
| Relying on \`resume\` in CI | Real time re-enters, flake returns | Prefer \`fastForward\`/\`runFor\` |
| Asserting before the tick | Stale value read | Advance the clock, then assert |

The single most common failure is calling \`page.clock.install()\` after navigation. By the time the page's scripts have run, they have already captured the real \`Date\` and timers. Install must come first, full stop. The second most common is reaching for \`setFixedTime\` and then wondering why a \`setInterval\` never fires, remember that fixed time freezes \`Date\` but does not drive timers.

## Best Practices for Time-Based Tests

Adopt these habits to keep your time-based suite fast and trustworthy:

\`\`\`typescript
import { test, expect } from '@playwright/test';

// Centralize the clock setup in a fixture so every test starts
// from a known, deterministic instant.
const FROZEN_NOW = new Date('2026-06-08T10:00:00Z');

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: FROZEN_NOW });
});

test('uses the shared frozen clock', async ({ page }) => {
  await page.goto('/dashboard');
  const now = await page.evaluate(() => Date.now());
  expect(now).toBe(FROZEN_NOW.getTime());
});
\`\`\`

Key guidelines: install the clock in a \`beforeEach\` so every test is isolated and deterministic; choose a memorable, fixed "now" constant and reuse it; prefer \`runFor\` for tick-by-tick interval assertions and \`fastForward\` for jumping to end states; always pin \`timezoneId\` to remove machine-dependent rendering; combine with \`page.route\` so both time and data are controlled; and never reintroduce \`waitForTimeout\` once you have a fake clock, advancing the clock is both faster and exact. Following these turns your slowest, flakiest tests into some of your fastest and most reliable.

## Frequently Asked Questions

### What is the difference between setFixedTime and setSystemTime in Playwright?

\`setFixedTime\` pins \`Date.now()\` and \`new Date()\` to a constant value and does not drive timers, so \`setTimeout\`/\`setInterval\` will not fire on their own. \`setSystemTime\` sets a base instant from which the clock can be advanced, so calling \`fastForward\` or \`runFor\` afterward fires due timers. Use fixed time for rendering a date, system time before advancing.

### Do I need to call page.clock.install() before navigation?

Yes. \`install\` must run before \`page.goto()\` because the page's scripts capture references to \`Date\` and timer functions as soon as they execute. If you install after navigation, the application has already grabbed the real clock and your fake clock will have no effect on code that already ran. Install first, navigate second.

### How do I fast-forward time without waiting in real time?

Call \`await page.clock.fastForward(ms)\` with a number of milliseconds, or a string like \`'30:00'\` for thirty minutes. Playwright instantly jumps the clock ahead and fires every timer scheduled within that window, with zero real elapsed time. For tick-by-tick behavior such as a one-second interval, use \`runFor\` instead, which advances through the duration.

### Can the Playwright Clock API control new Date() inside the page?

Yes. After \`page.clock.install()\`, the page's \`Date\` constructor, \`Date.now()\`, \`performance.now()\`, \`setTimeout\`, \`setInterval\`, and \`requestAnimationFrame\` are all intercepted. Calling \`new Date()\` in page code returns the fake time you configured. You can verify this with \`page.evaluate(() => new Date().toISOString())\`, which returns your seeded instant rather than the real wall clock.

### How do I test a countdown timer with Playwright?

Install the clock with a fixed start, assert the initial value, then advance with \`runFor\` in steps that match the timer's interval, asserting the displayed value after each step. For a one-second countdown, \`runFor(1000)\` ticks it once. Continue to zero and assert the expired state. The whole countdown runs in milliseconds with no flakiness or \`waitForTimeout\`.

### Does page.clock affect time zones?

No, the Clock API controls the instant in time, not the display zone. To make rendered times deterministic, set the browser context's \`timezoneId\` (via \`test.use({ timezoneId: '...' })\` or in \`playwright.config.ts\`) alongside \`page.clock\`. Together they fix both the moment and how it is formatted, so the same UTC instant renders identically on every machine and CI runner.

### When should I use runFor versus fastForward?

Use \`runFor\` when you need to observe intermediate states, such as an interval that updates a counter every second and you want to assert each tick. Use \`fastForward\` when you only care about the end state after a long duration, like a banner that appears after 30 minutes. \`fastForward\` collapses the wait into an instant; \`runFor\` ticks through the duration.

### Can I combine the Clock API with network mocking?

Absolutely, and you should. Use \`page.route\` to mock the server data (including timestamps) and \`page.clock\` to freeze or advance the current time. With both controlled, the rendered UI becomes a pure function of your fixtures, eliminating every external source of non-determinism. This is the gold standard for testing relative timestamps, polling, and any data-plus-time feature.

## Conclusion

The Playwright Clock API turns the hardest category of flaky tests, anything that depends on wall-clock time, into fast, deterministic, millisecond-precise checks. By installing a fake clock with \`page.clock.install()\` and reaching for the right tool (\`setFixedTime\` to freeze a date, \`setSystemTime\` plus \`fastForward\` or \`runFor\` to drive timers, \`pauseAt\` for exact scheduled moments), you can test countdowns, relative timestamps, auto-logout, polling, and scheduled banners without ever sleeping or padding assertions. Pin \`timezoneId\`, combine with network mocking, and always install before navigation, and your time-based suite will be both faster and more reliable than it has ever been.

Ready to go further? Explore the full [QA skills directory](/skills) for ready-to-install Playwright skills your AI coding agent can use today, then deepen your foundations with the [complete Playwright E2E guide](/blog/playwright-e2e-complete-guide), the [network interception and mocking guide](/blog/playwright-network-mocking-route-handler-guide), and our [Playwright testing best practices for 2026](/blog/playwright-testing-best-practices-2026). Stop fighting the clock, control it.
`,
};
