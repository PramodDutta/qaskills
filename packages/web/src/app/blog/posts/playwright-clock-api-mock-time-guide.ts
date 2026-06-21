import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Clock API: Mock Time and Fake Timers (2026)',
  description:
    'Master the Playwright Clock API to mock time, fast-forward timers, freeze dates, and test time-dependent UI deterministically — runnable TypeScript examples and tables.',
  date: '2026-06-21',
  category: 'Guide',
  content: `
# Playwright Clock API: Mock Time and Fake Timers (2026)

Time is the single most common source of flaky end-to-end tests. A tooltip that auto-dismisses after three seconds, a toast notification that fades after five, a session that expires after fifteen minutes, a countdown timer ticking toward zero, a "last updated 2 minutes ago" relative timestamp — every one of these depends on the real wall clock, and the real wall clock does not cooperate with a test runner that needs to be fast and deterministic. The naive fix is to litter your suite with \`await page.waitForTimeout(3000)\`, which makes tests slow, brittle, and dependent on the machine they run on. CI is slower than your laptop, so a timeout that passes locally can fail on the runner, and a test that waits out a fifteen-minute session timeout in real time is simply not viable.

The Playwright Clock API, exposed on \`page.clock\`, solves this by replacing the browser's time functions — \`Date\`, \`setTimeout\`, \`setInterval\`, \`requestAnimationFrame\`, and \`performance.now\` — with controllable fakes. You decide what time it is, and you advance time manually, instantly, by however much you want. A fifteen-minute session timeout becomes a single \`fastForward('15:00')\` call that completes in microseconds. A countdown from ten seconds to zero plays out frame by frame under your control. Relative timestamps freeze at a value you assert against with confidence. This guide is a complete, runnable reference for every method on the Clock API, when to use fixed time versus a ticking system time, and the gotchas — chiefly that you must install the clock before the page navigates — that trip up most people the first time.

We will start with installation and the all-important ordering rule, walk through each control method with TypeScript you can paste into a spec, then work through real scenarios: tooltips, auto-dismissing toasts, polling, countdowns, session timeouts, and date pickers. If you are wiring this into a larger suite, our [global setup and teardown guide](/blog/playwright-global-setup-teardown-guide) pairs well with the fixture patterns at the end.

## Installing the Clock: page.clock.install()

The Clock API starts with \`page.clock.install()\`. This call swaps the browser's native timing functions for Playwright's fakes inside the page context. Crucially, it must run **before** any application code that captures a reference to those functions executes — which in practice means before \`page.goto()\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('install the clock before navigation', async ({ page }) => {
  // Freeze time at a known instant BEFORE the app loads.
  await page.clock.install({ time: new Date('2026-06-21T10:00:00Z') });

  await page.goto('https://example.com/dashboard');

  // From here, the page sees 2026-06-21T10:00:00Z as "now".
  await expect(page.getByTestId('greeting')).toContainText('Good morning');
});
\`\`\`

If you call \`install()\` after \`goto()\`, any module that already did \`const start = Date.now()\` or scheduled a \`setInterval\` during page load will keep using the real functions, and your mock will appear to do nothing. The \`time\` option seeds the initial clock value; you can pass a \`Date\`, an ISO string, or a millisecond number. Omit it and the clock starts at the current real time but frozen.

\`\`\`typescript
// All three forms are equivalent ways to seed the start time.
await page.clock.install({ time: new Date('2026-06-21T10:00:00Z') });
await page.clock.install({ time: '2026-06-21T10:00:00Z' });
await page.clock.install({ time: 1781949600000 });
\`\`\`

After installation, the clock is **paused** — time does not advance on its own until you tell it to with \`fastForward\`, \`runFor\`, \`pauseAt\`, or \`resume\`. That paused-by-default behavior is exactly what makes tests deterministic: nothing fires until you decide it should.

## setFixedTime vs setSystemTime

The two confusingly-named methods, \`setFixedTime\` and \`setSystemTime\`, behave very differently, and choosing the wrong one is the most common conceptual mistake.

\`page.clock.setFixedTime(time)\` makes \`Date.now()\` and \`new Date()\` **always** return the same value, no matter how much time you advance with the ticking methods. It pins the calendar. Timers and intervals still fire when you fast-forward — but every call to read the date returns the frozen instant. Use it when the UI displays a date or relative time you want to assert against, and you do not want that displayed value to drift.

\`\`\`typescript
test('relative timestamp stays frozen with setFixedTime', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-06-21T10:00:00Z'));
  await page.goto('https://example.com/feed');

  // The "posted 5 minutes ago" label is computed from Date.now();
  // with a fixed time it will not change between renders.
  await expect(page.getByTestId('post-time')).toHaveText('5 minutes ago');
});
\`\`\`

\`page.clock.setSystemTime(time)\` sets the current time but lets it **advance** as you fast-forward or run timers. It is the realistic clock: the date moves forward when time moves forward. Use it when you need timers to fire AND the displayed date to progress — for example, a clock widget that updates every second.

\`\`\`typescript
test('a live clock widget advances with setSystemTime', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-21T10:00:00Z') });
  await page.goto('https://example.com/clock');

  await page.clock.setSystemTime(new Date('2026-06-21T10:00:00Z'));
  await expect(page.getByTestId('time')).toHaveText('10:00:00');

  // Advance one minute; the widget's setInterval fires and the date moves.
  await page.clock.fastForward('01:00');
  await expect(page.getByTestId('time')).toHaveText('10:01:00');
});
\`\`\`

The mental model: **fixed = the calendar is glued in place even while timers tick; system = the calendar moves with the timers.**

| Method | Date.now() returns | Timers fire on fast-forward | Date advances on fast-forward | Use for |
|---|---|---|---|---|
| \`setFixedTime\` | Always the same value | Yes | No | Frozen relative timestamps, "as of" dates |
| \`setSystemTime\` | The set value, then moves | Yes | Yes | Live clocks, progressing dates |

## fastForward: Skip Time Instantly

\`page.clock.fastForward(ticks)\` jumps the clock forward by the given amount and fires every timer scheduled to run during that interval — instantly, with no real waiting. It is the workhorse for "wait out" scenarios.

\`\`\`typescript
test('fast-forward fires a delayed callback immediately', async ({ page }) => {
  await page.clock.install();
  await page.goto('https://example.com/toast');

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  // The toast auto-dismisses after 5s. Skip those 5 seconds instantly.
  await page.clock.fastForward(5000); // milliseconds
  await expect(page.getByRole('alert')).toBeHidden();
});
\`\`\`

You can pass milliseconds as a number, or a human-readable string in \`"MM:SS"\` or \`"HH:MM:SS"\` form, which is far more readable for long durations.

\`\`\`typescript
await page.clock.fastForward(30000);      // 30 seconds
await page.clock.fastForward('00:30');    // 30 seconds — same thing
await page.clock.fastForward('15:00');    // 15 minutes
await page.clock.fastForward('02:00:00'); // 2 hours
\`\`\`

\`fastForward\` fires all timers whose deadline falls inside the skipped window in one shot. If you need each tick of a repeating interval to be observed individually — for an animation, for example — reach for \`runFor\` instead.

## runFor: Tick Time in Steps

\`page.clock.runFor(ms)\` advances the clock by the given number of milliseconds, firing timers as it goes, but it is designed for stepping forward in controlled increments so the page can react between steps. It is the right tool when an interval needs to fire repeatedly and you want to observe the UI after each fire.

\`\`\`typescript
test('a per-second interval updates the UI each tick', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-21T10:00:00Z') });
  await page.goto('https://example.com/counter');

  // Counter increments inside a setInterval(fn, 1000).
  await expect(page.getByTestId('count')).toHaveText('0');

  await page.clock.runFor(1000);
  await expect(page.getByTestId('count')).toHaveText('1');

  await page.clock.runFor(1000);
  await expect(page.getByTestId('count')).toHaveText('2');

  // Or run three seconds at once; the interval fires three times.
  await page.clock.runFor(3000);
  await expect(page.getByTestId('count')).toHaveText('5');
});
\`\`\`

The practical distinction between \`runFor\` and \`fastForward\` is intent: \`runFor\` is for "let time pass naturally in steps so the app processes each timer," while \`fastForward\` is for "skip ahead and just fire everything that was due." For most auto-dismiss and timeout tests, \`fastForward\` is what you want; for animations and tick-by-tick assertions, use \`runFor\`.

## pauseAt and resume: Stop at a Moment, Then Continue

\`page.clock.pauseAt(time)\` fast-forwards to a specific instant and then pauses the clock there. It fires all timers due before that instant along the way. This is ideal for testing what the UI looks like at an exact moment — say, one second before a deadline — without manually computing the offset.

\`\`\`typescript
test('pause exactly one second before a deadline', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-21T10:00:00Z') });
  await page.goto('https://example.com/auction');

  // Auction ends at 10:05:00; pause at 10:04:59 to assert the warning.
  await page.clock.pauseAt(new Date('2026-06-21T10:04:59Z'));
  await expect(page.getByTestId('countdown')).toHaveText('00:01');
  await expect(page.getByTestId('warning')).toBeVisible();
});
\`\`\`

\`page.clock.resume()\` lets the clock tick again at real speed after it has been paused. Because most tests want determinism, \`resume\` is used less often than the manual-advance methods, but it is useful when you want a section of a test to run against real time after controlling the start.

\`\`\`typescript
test('control the start, then let real time run', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-21T10:00:00Z') });
  await page.goto('https://example.com');

  // Do deterministic setup against frozen time...
  await page.clock.pauseAt(new Date('2026-06-21T10:00:05Z'));

  // ...then hand control back to the real clock.
  await page.clock.resume();
});
\`\`\`

## A Complete Method Reference Table

Here is every public method on \`page.clock\`, what it does, and whether it advances time. Keep this nearby while writing time-dependent specs.

| Method | Advances time? | Fires timers? | Typical use |
|---|---|---|---|
| \`install(options?)\` | No (paused) | No | Seed and freeze time before \`goto\` |
| \`setFixedTime(time)\` | No (pinned) | n/a | Glue \`Date.now()\` to one value |
| \`setSystemTime(time)\` | Sets, then movable | n/a | Set a movable "now" |
| \`fastForward(ticks)\` | Yes (jump) | Yes, all due | Skip waits (toasts, timeouts) |
| \`runFor(ms)\` | Yes (stepped) | Yes, per step | Tick intervals, animations |
| \`pauseAt(time)\` | Yes, to instant | Yes, all due before | Assert at an exact moment |
| \`resume()\` | Yes (real speed) | Yes, naturally | Hand back to the real clock |

## Date vs setInterval vs setTimeout: What Gets Mocked

The Clock API replaces the full family of time primitives, but it helps to know exactly which calls in your application code are affected so you can reason about behavior.

| Browser API | Mocked by Clock API | Behavior under the fake clock |
|---|---|---|
| \`Date\` / \`Date.now()\` | Yes | Returns the controlled time |
| \`setTimeout\` | Yes | Deadline measured against fake time; fires on advance |
| \`setInterval\` | Yes | Repeating; fires each period as time advances |
| \`requestAnimationFrame\` | Yes | Driven by clock advances |
| \`cancelAnimationFrame\` | Yes | Cancels scheduled frames |
| \`performance.now()\` | Yes | Monotonic against the fake clock |

The implication: if your code reads time through any of these, the Clock API controls it. If your code gets time from a server response (an HTTP \`Date\` header or a JSON \`timestamp\` field), that value is **not** affected by the Clock API — you control that separately by mocking the network. For network mocking, see the sibling guide on [route.fulfill for mocking API responses](/blog/playwright-route-fulfill-mock-api-guide); combining a mocked clock with mocked responses gives you total determinism over both time and data.

## Real Scenario: Auto-Dismissing Toasts and Tooltips

Toasts and tooltips are the canonical Clock API use case. A toast appears, then disappears after a fixed delay; a tooltip shows on hover and may auto-hide. Both are timing-driven and notoriously flaky with \`waitForTimeout\`.

\`\`\`typescript
test('toast appears then auto-dismisses after 4 seconds', async ({ page }) => {
  await page.clock.install();
  await page.goto('https://example.com/form');

  await page.getByRole('button', { name: 'Submit' }).click();
  const toast = page.getByRole('status');
  await expect(toast).toBeVisible();
  await expect(toast).toContainText('Saved successfully');

  // Instead of waitForTimeout(4000), skip the delay deterministically.
  await page.clock.fastForward('00:04');
  await expect(toast).toBeHidden();
});

test('tooltip hides after its auto-dismiss window', async ({ page }) => {
  await page.clock.install();
  await page.goto('https://example.com/help');

  await page.getByTestId('info-icon').hover();
  const tip = page.getByRole('tooltip');
  await expect(tip).toBeVisible();

  await page.clock.fastForward(2500);
  await expect(tip).toBeHidden();
});
\`\`\`

Notice there is no real waiting in either test. They complete as fast as the assertions can run, yet they exercise the exact timing logic the production code uses.

## Real Scenario: Polling and Auto-Refresh

Dashboards that poll an endpoint every N seconds are a perfect fit. You install the clock, then fast-forward by the polling interval and assert the UI refreshed. Pair this with a route mock so the second poll returns different data.

\`\`\`typescript
test('dashboard polls every 10 seconds', async ({ page }) => {
  let pollCount = 0;
  await page.route('**/api/metrics', async (route) => {
    pollCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ value: pollCount * 100 }),
    });
  });

  await page.clock.install();
  await page.goto('https://example.com/metrics');
  await expect(page.getByTestId('metric')).toHaveText('100');

  // Advance one polling interval; the app refetches and re-renders.
  await page.clock.fastForward('00:10');
  await expect(page.getByTestId('metric')).toHaveText('200');

  await page.clock.fastForward('00:10');
  await expect(page.getByTestId('metric')).toHaveText('300');
});
\`\`\`

This is determinism at its best: the test controls both the passage of time and the data returned, so there is zero room for race conditions.

## Real Scenario: Countdowns, Session Timeouts, and Date Pickers

Three more high-value patterns round out the toolkit.

A **countdown** ticks toward zero and usually triggers an action at zero. Use \`runFor\` to watch it descend, or \`fastForward\` to jump to the end state.

\`\`\`typescript
test('countdown reaches zero and redirects', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-21T10:00:00Z') });
  await page.goto('https://example.com/checkout');

  await expect(page.getByTestId('timer')).toHaveText('05:00');

  // Jump to the end; the redirect-on-zero logic fires.
  await page.clock.fastForward('05:00');
  await expect(page).toHaveURL(/expired/);
});
\`\`\`

A **session timeout** that logs the user out after inactivity is the scenario where the Clock API pays for itself most dramatically. Waiting fifteen real minutes is absurd; fast-forwarding is instant.

\`\`\`typescript
test('idle session expires after 15 minutes', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-21T10:00:00Z') });
  await page.goto('https://example.com/app');
  await expect(page.getByTestId('user-menu')).toBeVisible();

  // No interaction; advance past the 15-minute idle limit.
  await page.clock.fastForward('15:00');
  await expect(page.getByText('Your session has expired')).toBeVisible();
  await expect(page).toHaveURL(/login/);
});
\`\`\`

A **date picker** that defaults to "today" or disables past dates depends on \`new Date()\`. Freeze the date so the calendar renders predictably regardless of when the test runs.

\`\`\`typescript
test('date picker defaults to the frozen "today"', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-06-21T10:00:00Z'));
  await page.goto('https://example.com/booking');

  await page.getByLabel('Check-in date').click();
  // The calendar highlights June 21, 2026 as "today" deterministically.
  await expect(page.getByRole('button', { name: '21', exact: true })).toHaveClass(
    /today/,
  );
  // Dates before today are disabled.
  await expect(page.getByRole('button', { name: '20', exact: true })).toBeDisabled();
});
\`\`\`

## Wrapping the Clock in a Fixture

If many tests need the same frozen start time, extend the base \`test\` with a fixture that installs the clock automatically. This keeps specs clean and guarantees the install-before-goto ordering.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

type ClockFixtures = {
  frozenAt: Date;
};

export const test = base.extend<ClockFixtures>({
  frozenAt: [new Date('2026-06-21T10:00:00Z'), { option: true }],

  page: async ({ page, frozenAt }, use) => {
    // Install before any test code touches the page.
    await page.clock.install({ time: frozenAt });
    await use(page);
  },
});

export { expect };
\`\`\`

\`\`\`typescript
// In a spec file:
import { test, expect } from './fixtures';

test('uses the frozen clock automatically', async ({ page }) => {
  await page.goto('https://example.com');
  // The clock is already installed at 2026-06-21T10:00:00Z.
  await page.clock.fastForward('00:05');
  await expect(page.getByRole('status')).toBeHidden();
});

// Override the start time per file or per test:
test.use({ frozenAt: new Date('2026-12-25T00:00:00Z') });
\`\`\`

A fixture also makes it trivial to combine the clock with other setup. For broader project-wide initialization, the [global setup and teardown guide](/blog/playwright-global-setup-teardown-guide) shows how to hang shared state off the config.

## Gotchas and Best Practices

The mistakes below account for nearly every "the clock isn't working" report.

- **Install before navigation.** The number-one error. Call \`page.clock.install()\` (or \`setFixedTime\`/\`setSystemTime\`) before \`page.goto()\`. Code that captured timer references during page load will otherwise ignore your fakes.
- **Pick fixed vs system deliberately.** Use \`setFixedTime\` when a displayed date must not drift; use \`setSystemTime\` when the date should move with the timers. Mixing them up produces "the time won't advance" or "the timestamp keeps changing" confusion.
- **Remember the clock starts paused.** After \`install()\`, nothing fires until you advance. If a timer "never runs," you probably forgot to \`fastForward\` or \`runFor\`.
- **Use string durations for readability.** \`'15:00'\` is clearer than \`900000\`. Reserve millisecond numbers for sub-second precision.
- **Server time is not mocked.** The Clock API controls browser time only. If the UI shows a server-provided timestamp, mock that response separately.
- **Combine with network mocks for full determinism.** A frozen clock plus stubbed responses removes both timing and data variability. See [route.fulfill mocking](/blog/playwright-route-fulfill-mock-api-guide).
- **Verify timing logic, do not just skip it.** The goal is to exercise the same delays production uses, instantly — not to bypass them. Assert the before-and-after states around each \`fastForward\`.

For confirming what fired and when during a debugging session, the [Playwright trace CLI analysis guide](/blog/playwright-trace-cli-analysis-guide-2026) lets you inspect the timeline of a failing time-dependent test.

## Frequently Asked Questions

### What is the Playwright Clock API used for?

The Playwright Clock API, accessed via \`page.clock\`, lets you control time inside the browser during a test. It replaces \`Date\`, \`setTimeout\`, \`setInterval\`, and \`requestAnimationFrame\` with fakes you advance manually. It is used to test time-dependent UI — auto-dismissing toasts, countdowns, polling, session timeouts, and date pickers — deterministically and instantly, without real waiting.

### What is the difference between setFixedTime and setSystemTime?

\`setFixedTime\` pins \`Date.now()\` to a single value that never changes, even when you fast-forward — timers still fire, but the displayed date stays frozen. \`setSystemTime\` sets the current time and lets it advance as you move the clock forward. Use \`setFixedTime\` for frozen relative timestamps and \`setSystemTime\` for live clocks where the date should progress with the timers.

### Why is my Playwright clock mock not working?

The most common cause is calling \`page.clock.install()\` after \`page.goto()\`. The clock must be installed before navigation so application code captures the fake timer functions during load. Other causes: forgetting that the clock starts paused (you must call \`fastForward\` or \`runFor\`), or expecting it to mock server-provided timestamps, which it does not — only browser time is controlled.

### How do I fast-forward time in Playwright tests?

Call \`await page.clock.fastForward(ticks)\` after installing the clock. Pass milliseconds as a number, like \`fastForward(5000)\`, or a readable string like \`fastForward('00:05')\` for five seconds or \`fastForward('15:00')\` for fifteen minutes. It jumps the clock forward instantly and fires every timer due during that window, so a five-second toast delay completes in microseconds.

### What is the difference between fastForward and runFor?

\`fastForward\` jumps the clock ahead and fires all timers due during the skipped window at once — ideal for waiting out a single delay like a toast or timeout. \`runFor\` advances time in steps, firing timers as it goes, so the page can react between each tick. Use \`runFor\` for repeating intervals and animations where you assert the UI after each fire.

### Does the Playwright Clock API affect server timestamps?

No. The Clock API only controls time inside the browser — \`Date\`, the timer functions, and \`performance.now\`. Timestamps that come from the server, such as an HTTP \`Date\` header or a \`timestamp\` field in a JSON response, are unaffected. To control those values you must mock the network response separately, for example with \`route.fulfill\`, alongside the clock mock.

### Can I set up the Playwright clock in a fixture?

Yes, and it is the recommended pattern when many tests share a frozen start time. Extend the base \`test\` with a custom \`page\` fixture that calls \`page.clock.install({ time })\` before \`use(page)\`. This guarantees the install-before-navigation ordering and keeps individual specs clean. You can expose the start time as a configurable option so files override it with \`test.use\`.

## Conclusion

The Playwright Clock API turns time from your most unreliable test dependency into one you fully control. By installing a fake clock before navigation, choosing \`setFixedTime\` or \`setSystemTime\` to match whether the displayed date should drift, and advancing time with \`fastForward\`, \`runFor\`, or \`pauseAt\`, you can test toasts, countdowns, polling, session timeouts, and date pickers deterministically and instantly. The result is a faster, flake-free suite that exercises the exact timing logic your production code relies on, without a single real-time wait.

Ready to level up the rest of your automation skills? Explore the QA skills directory at [/skills](/skills) for hands-on, agent-ready Playwright skills covering time mocking, network interception, and more — and check the sibling guide on [mocking API responses with route.fulfill](/blog/playwright-route-fulfill-mock-api-guide) to combine deterministic time with deterministic data.
`,
};
