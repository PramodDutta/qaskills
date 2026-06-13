import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Clock + Install/Fakers: Test Time-Sensitive Code',
  description:
    'Complete guide to page.clock.install in Playwright: runFor, pauseAt, setFixedTime, fastForward, fake Date and setTimeout. Deterministic tests for clocks, timers, expiry, and scheduling.',
  date: '2026-06-06',
  category: 'Reference',
  content: `
# Playwright Clock + Install/Fakers: Test Time-Sensitive Code

\`page.clock.install\` is Playwright's answer to the longest-running pain point in browser testing: how do you write a deterministic test for code that depends on time? Session expiry, polling intervals, debounced inputs, countdown timers, scheduled banners, A/B test cohorts that change at midnight - all of these require either waiting for real time to pass (slow, flaky) or mocking the clock (historically painful in browser environments). Since Playwright 1.45 the clock API replaces both. You install a fake clock, fast-forward through whatever time period you need, and assert on the deterministic result. No \`waitForTimeout\`, no race conditions, no test flakiness from CI clock drift.

This guide is the complete reference for \`page.clock\` in 2026. We cover \`install\`, \`runFor\`, \`fastForward\`, \`pauseAt\`, \`resume\`, \`setFixedTime\`, \`setSystemTime\`, and \`uninstall\`. Every example is runnable Playwright TypeScript. We also cover when \`page.clock\` replaces \`page.waitForTimeout\` (almost always) and the migration pattern for tests that currently sleep their way through time-sensitive flows.

For broader Playwright debugging, see [Playwright Debug Mode + Inspector](/blog/playwright-debug-mode-inspector-2026). For the related "no-sleep" pattern, see [Playwright page.clock vs waitForTimeout Reference](/blog/playwright-page-clock-waitfortimeout-reference). The [playwright-e2e skill](/skills/playwright-e2e) installs these patterns into your AI agent.

## What page.clock controls

When you call \`await page.clock.install()\`, Playwright replaces these browser globals with fake versions:

| Global | Fake behavior |
|---|---|
| \`Date.now()\` | Returns the fake clock's current time |
| \`new Date()\` | Constructs from the fake clock |
| \`performance.now()\` | Returns elapsed fake time |
| \`setTimeout\` | Queues callbacks to run when fake time advances |
| \`setInterval\` | Same, repeating |
| \`requestAnimationFrame\` | Queues callbacks to run on next fake frame |
| \`requestIdleCallback\` | Same |
| \`queueMicrotask\` | Runs immediately (not affected by clock) |

What is not faked: HTTP request timing, browser layout/paint timers, and microtasks. Tests that depend on real network latency need to mock the network separately.

## The minimal install pattern

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('countdown ends after 10 seconds', async ({ page }) => {
  await page.clock.install();
  await page.goto('/countdown');

  // Initially shows "10 seconds left"
  await expect(page.getByTestId('countdown')).toHaveText('10');

  // Advance the clock 10 seconds
  await page.clock.runFor(10000);

  // Now shows "0 seconds left"
  await expect(page.getByTestId('countdown')).toHaveText('0');
});
\`\`\`

\`page.clock.install()\` must be called before \`page.goto()\` for the fake clock to be in place when the page's JavaScript runs. If you install after navigation, only future timers see the fake clock; existing timers continue with real time.

## install() options

The install call accepts options:

\`\`\`typescript
await page.clock.install({
  time: new Date('2026-01-01T12:00:00Z'), // start the clock at this time
});
\`\`\`

| Option | Type | Default | Purpose |
|---|---|---|---|
| \`time\` | Date | now | Initial wall-clock time |

If you omit \`time\`, the clock starts at the current real time. Code that compares timestamps to "now" works correctly.

## runFor: advance the clock by a duration

\`\`\`typescript
// Advance 5 seconds (5000 ms)
await page.clock.runFor(5000);

// Advance using string duration
await page.clock.runFor('30s');
await page.clock.runFor('2m');
await page.clock.runFor('1h');
\`\`\`

\`runFor\` advances the clock by the given duration. All scheduled timers that would fire within that duration fire in order. Once the duration elapses, the clock stops at the new time.

This is the most common method. For a test that needs to verify behavior after N seconds, \`runFor(N * 1000)\` is the canonical pattern.

\`\`\`typescript
test('session expires after 30 minutes', async ({ page }) => {
  await page.clock.install();
  await page.goto('/dashboard');

  // Verify logged in
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();

  // Fast-forward 30 minutes
  await page.clock.runFor('30m');

  // App should detect expiry and redirect
  await expect(page).toHaveURL('/login');
});
\`\`\`

## fastForward: jump without running pending timers

\`\`\`typescript
await page.clock.fastForward('1h');
\`\`\`

\`fastForward\` advances the clock without running any scheduled timers in between. Only timers due at the new time fire. This is the right call when you want to skip a long idle period without simulating the work that would have happened.

Example: a polling loop runs every 5 seconds. With \`runFor('1h')\`, the loop runs 720 times. With \`fastForward('1h')\`, the loop fires once at the new "now".

| Method | Runs intermediate timers? | When to use |
|---|---|---|
| \`runFor(d)\` | Yes | Simulate elapsed time with all work |
| \`fastForward(d)\` | No | Skip to a future moment quickly |

## pauseAt: stop the clock at a specific instant

\`\`\`typescript
await page.clock.pauseAt(new Date('2026-12-31T23:59:59Z'));
\`\`\`

\`pauseAt\` advances the clock to a specific Date and pauses there. No further timers fire until you call \`resume()\` or \`runFor()\`. Useful for testing year-end transitions, daylight saving time changes, or specific calendar dates.

\`\`\`typescript
test('New Year banner shows at midnight', async ({ page }) => {
  await page.clock.install({ time: new Date('2025-12-31T23:55:00Z') });
  await page.goto('/');

  // Five minutes before midnight - no banner
  await expect(page.getByTestId('new-year-banner')).toBeHidden();

  // Jump to midnight
  await page.clock.pauseAt(new Date('2026-01-01T00:00:00Z'));

  await expect(page.getByTestId('new-year-banner')).toBeVisible();
  await expect(page.getByTestId('new-year-banner')).toHaveText('Happy 2026!');
});
\`\`\`

## resume: let the fake clock tick again

After \`pauseAt\`, the clock is frozen. Call \`resume()\` to let timers fire at real (wall-clock) speed from the paused instant:

\`\`\`typescript
await page.clock.pauseAt(new Date('2026-01-01T00:00:00Z'));
// ... assertions on the paused state ...
await page.clock.resume();
// ... timers fire at real speed now
\`\`\`

\`resume\` is rarely needed. Most tests either run with \`runFor\`/\`fastForward\` or pause at a single instant and assert. If you find yourself calling \`resume\`, consider whether \`runFor\` would be clearer.

## setFixedTime: lock the clock at one moment

\`\`\`typescript
await page.clock.setFixedTime(new Date('2026-06-09T00:00:00Z'));
\`\`\`

\`setFixedTime\` is different from \`pauseAt\`: it freezes \`Date.now()\` and \`new Date()\` to always return the given time, regardless of how much real time elapses. Timers do not advance. This is the simplest form of clock mocking and is what you usually want for tests that just need a stable "today".

\`\`\`typescript
test('renders today as June 9 2026', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-06-09T00:00:00Z'));
  await page.goto('/');
  await expect(page.getByTestId('current-date')).toHaveText('June 9, 2026');
});
\`\`\`

Use \`setFixedTime\` for any test where you want to control the displayed date but do not need to simulate time passing.

## setSystemTime: change the system clock without affecting timers

\`\`\`typescript
await page.clock.setSystemTime(new Date('2026-06-09T00:00:00Z'));
\`\`\`

\`setSystemTime\` changes what \`Date.now()\` and \`new Date()\` return without disturbing any scheduled timers. A timer set to fire 10 seconds from now still fires 10 seconds from now in real time, but if it asks for the current time it gets the new system time.

This is more advanced and rarely needed. Use it when the application code reads \`Date.now()\` independently of timers, and you want to verify behavior at a specific date without skipping the timer queue.

## uninstall: restore real clocks

\`\`\`typescript
await page.clock.uninstall();
\`\`\`

\`uninstall\` restores the real \`Date\`, \`setTimeout\`, and other globals. This is rarely needed at the end of a test because Playwright tears down the page anyway. It is useful in tests that need to switch between fake and real time mid-test.

## A complete debounce test

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('search input is debounced 300ms', async ({ page }) => {
  await page.clock.install();
  await page.goto('/search');

  const input = page.getByRole('searchbox', { name: 'Search' });
  const results = page.getByTestId('search-results');

  // Type three characters quickly
  await input.fill('foo');

  // Before the debounce timeout, results are not requested
  await page.clock.runFor(200);
  await expect(results).toHaveText('Type to search');

  // After 300ms total, the debounced search fires
  await page.clock.runFor(150);
  await expect(results).toHaveText(/Results for "foo"/);
});
\`\`\`

This test is fully deterministic. It does not wait 300ms of real time. It runs in milliseconds and never flakes.

## A polling test

\`\`\`typescript
test('dashboard polls every 5 seconds', async ({ page }) => {
  await page.clock.install();

  let requestCount = 0;
  await page.route('**/api/stats', async (route) => {
    requestCount++;
    await route.fulfill({ json: { count: requestCount } });
  });

  await page.goto('/dashboard');

  // Initial load makes one request
  await expect(page.getByTestId('stat')).toHaveText('1');

  // 5 seconds later, second poll
  await page.clock.runFor(5000);
  await expect(page.getByTestId('stat')).toHaveText('2');

  // 5 more seconds, third poll
  await page.clock.runFor(5000);
  await expect(page.getByTestId('stat')).toHaveText('3');
});
\`\`\`

For more on \`page.route\` mocking, see [Playwright route.fulfill Network Mocking Reference](/blog/playwright-route-fulfill-network-mocking-reference).

## Method reference

| Method | Parameters | Effect |
|---|---|---|
| \`install\` | \`{ time?: Date }\` | Replace browser clock globals |
| \`runFor\` | \`number \\| string\` (ms or duration string) | Advance clock and fire all timers in between |
| \`fastForward\` | \`number \\| string\` | Advance clock without firing intermediate timers |
| \`pauseAt\` | \`Date\` | Advance to date and freeze |
| \`resume\` | none | Resume real-time ticking from a paused state |
| \`setFixedTime\` | \`Date\` | Freeze Date.now() at one moment |
| \`setSystemTime\` | \`Date\` | Change the system clock without disturbing timers |
| \`uninstall\` | none | Restore real clocks |

## Duration string formats

Where a method accepts a duration, these formats are valid:

| String | Equivalent ms |
|---|---|
| \`'500ms'\` | 500 |
| \`'30s'\` | 30000 |
| \`'2m'\` | 120000 |
| \`'1h'\` | 3600000 |
| \`'1d'\` | 86400000 |

You can pass a number directly if you prefer; it is always milliseconds.

## When NOT to use page.clock

The clock API does not affect:

- Real network latency. Use \`page.route\` and \`route.fulfill\` to mock responses.
- Browser layout/paint timing. Animations driven by CSS transitions still respect real time.
- Microtasks (\`queueMicrotask\`, Promise then-handlers). These run immediately.

If your test depends on network response delays, mock those separately. The clock controls only JavaScript timer functions.

## Migrating from waitForTimeout

Old, flaky:

\`\`\`typescript
test('flaky old test', async ({ page }) => {
  await page.goto('/dashboard');
  // Wait for the polling to happen
  await page.waitForTimeout(10000);
  await expect(page.getByTestId('updated')).toHaveText('Latest');
});
\`\`\`

New, deterministic:

\`\`\`typescript
test('deterministic new test', async ({ page }) => {
  await page.clock.install();
  await page.goto('/dashboard');
  await page.clock.runFor(10000);
  await expect(page.getByTestId('updated')).toHaveText('Latest');
});
\`\`\`

The new test runs in milliseconds instead of 10 seconds, and it cannot flake from CI clock drift.

## Patterns for common time-sensitive UIs

### Countdown timers

\`\`\`typescript
test('countdown reaches zero', async ({ page }) => {
  await page.clock.install();
  await page.goto('/auction/lot/42');

  // Auction ends in 5 minutes
  await expect(page.getByTestId('countdown')).toContainText('5:00');

  // Advance 4 minutes
  await page.clock.runFor('4m');
  await expect(page.getByTestId('countdown')).toContainText('1:00');

  // Last minute
  await page.clock.runFor('1m');
  await expect(page.getByTestId('countdown')).toContainText('0:00');
  await expect(page.getByText('Auction ended')).toBeVisible();
});
\`\`\`

### Periodic email digest scheduling

\`\`\`typescript
test('digest sends every Monday at 9 AM', async ({ page }) => {
  // Start on a Sunday
  await page.clock.install({ time: new Date('2026-06-07T08:00:00Z') });
  await page.goto('/notification-settings');

  await page.getByLabel('Send weekly digest').check();
  await page.getByRole('button', { name: 'Save' }).click();

  // Jump to Monday 9 AM
  await page.clock.runFor('25h');

  // The digest job triggered
  await expect(page.getByTestId('last-digest-sent')).toContainText('Jun 8, 2026 9:00 AM');
});
\`\`\`

### Token expiry handling

\`\`\`typescript
test('refresh token after 14 minutes', async ({ page }) => {
  await page.clock.install();
  let refreshCount = 0;
  await page.route('**/api/auth/refresh', async (route) => {
    refreshCount++;
    await route.fulfill({ json: { token: \`new-\${refreshCount}\` } });
  });

  await page.goto('/dashboard');

  // No refresh yet
  expect(refreshCount).toBe(0);

  // 13 minutes - still under TTL
  await page.clock.runFor('13m');
  expect(refreshCount).toBe(0);

  // 15 minutes - past TTL, should refresh
  await page.clock.runFor('2m');
  expect(refreshCount).toBe(1);
});
\`\`\`

### Animation with a sane backstop

CSS animations themselves are not controlled by \`page.clock\`. But code that schedules animations via \`requestAnimationFrame\` callbacks IS controlled. For pure animation tests, prefer web-first assertions:

\`\`\`typescript
test('toast disappears after 5 seconds', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  // Toast auto-dismiss is scheduled with setTimeout - clock controls it
  await page.clock.runFor(5000);
  await expect(page.getByRole('alert')).toBeHidden();
});
\`\`\`

## Combining clock with route mocking

The two most powerful Playwright primitives for deterministic tests are \`page.clock\` and \`page.route\`. Combine them for tests of polling logic, retry behavior, and time-aware caching:

\`\`\`typescript
test('cache invalidates after 60 seconds', async ({ page }) => {
  await page.clock.install();
  let callCount = 0;

  await page.route('**/api/data', async (route) => {
    callCount++;
    await route.fulfill({ json: { version: callCount } });
  });

  await page.goto('/');
  await expect(page.getByTestId('version')).toHaveText('1');

  // Within cache TTL, no new request
  await page.clock.runFor(30000);
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('version')).toHaveText('1');

  // After cache expires, new request
  await page.clock.runFor(31000);
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('version')).toHaveText('2');
});
\`\`\`

This pattern covers cache TTLs, retry backoffs, session refresh, and any other time-aware behavior in your application.

## Edge cases and gotchas

### Multiple clock installs

\`page.clock.install\` can be called once per page. A second call throws. If you need to reset the clock mid-test, use \`uninstall\` then \`install\`:

\`\`\`typescript
await page.clock.install();
// ...
await page.clock.uninstall();
await page.clock.install({ time: new Date('2027-01-01') });
\`\`\`

### Tests that rely on real wall-clock for sleep

If your test depends on real time between actions (e.g., a real animation that must visibly play in headed mode for screen recording), do not install the clock. The clock only helps for application timer logic.

### Browser context vs page

\`page.clock\` applies to a single page. If your test uses multiple pages in one context, install the clock on each:

\`\`\`typescript
const pageA = await context.newPage();
const pageB = await context.newPage();
await pageA.clock.install();
await pageB.clock.install();
\`\`\`

The two clocks are independent; advancing pageA's clock does not affect pageB.

### Service workers

Service workers run in a separate JavaScript context. \`page.clock\` does not fake their timers. For service worker tests, you generally need to either disable the service worker or use \`page.evaluate\` to script its behavior directly.

### Date object stability

After \`install\`, every \`new Date()\` call returns the fake clock's current time. Code that snapshots \`Date.now()\` at module load time uses the time at install moment, not the original real time. This is usually what you want.

## Test refactoring: extracting clock helpers

After you have written several tests using \`page.clock\`, common patterns emerge. Extract them into helper functions:

\`\`\`typescript
import { Page } from '@playwright/test';

export async function setUpClockAtDate(page: Page, isoDate: string) {
  await page.clock.install({ time: new Date(isoDate) });
}

export async function advanceUntil(page: Page, predicate: () => Promise\\<boolean\\>) {
  for (let i = 0; i < 60; i++) {
    if (await predicate()) return;
    await page.clock.runFor('1m');
  }
  throw new Error('Predicate never became true within 60 simulated minutes');
}

// Use in a test
test('inactive user is reminded', async ({ page }) => {
  await setUpClockAtDate(page, '2026-06-09T09:00:00Z');
  await page.goto('/dashboard');

  await advanceUntil(page, async () => {
    return (await page.getByText('Are you still there?').isVisible());
  });
});
\`\`\`

This pattern scales the clock API to complex scenarios without losing determinism.

## Frequently Asked Questions

### What does page.clock.install do in Playwright?

It replaces the browser's \`Date\`, \`setTimeout\`, \`setInterval\`, \`requestAnimationFrame\`, and \`performance.now\` with fake versions you control. You can then advance the clock with \`runFor\` or \`fastForward\` to make time-sensitive code execute deterministically without waiting for real time to pass.

### When should I use page.clock instead of page.waitForTimeout?

Almost always. \`waitForTimeout\` waits real time, which makes tests slow and flaky. \`page.clock.runFor\` advances a fake clock instantly. The only reason to use \`waitForTimeout\` is for code that depends on real browser layout or animation timing, not for application-level timers.

### How do I freeze the clock at a specific date?

Use \`await page.clock.setFixedTime(new Date('2026-06-09T00:00:00Z'))\`. This makes every call to \`Date.now()\` or \`new Date()\` return that exact moment. Timers do not advance. Use this when you need a stable "today" for date-rendering tests.

### What is the difference between runFor and fastForward?

\`runFor\` advances the clock and fires every timer scheduled within that duration. \`fastForward\` advances the clock without firing intermediate timers - only timers due at the new instant fire. Use \`runFor\` to simulate elapsed work; use \`fastForward\` to skip idle time quickly.

### Can I install the clock after page.goto?

You can, but the page's existing timers (those set during initial load) keep running on the real clock. For deterministic tests, install before navigation. The clock then applies to all timers created during page load and afterward.

### Does page.clock affect network response timing?

No. The clock controls JavaScript timers only. Network requests run on real time. To control network response timing, use \`page.route\` and \`route.fulfill\` with explicit delays. See the [page.route + route.fulfill reference](/blog/playwright-route-fulfill-network-mocking-reference).

### How do I test a debounced input?

Install the clock, fill the input, advance the clock past the debounce timeout, and assert on the result. Because the clock is fake, the test does not wait the real debounce duration. The full pattern is in the "complete debounce test" section above.

### What happens if page.clock.install does not work?

The most common cause is calling \`install()\` after \`page.goto()\`. Move the install call before navigation. The other common cause is using framework-internal timers that bypass the standard globals - rare but possible with custom polyfills. Check the framework code or use \`setSystemTime\` to control \`Date.now()\` directly.

## CI implications

Tests using \`page.clock\` are dramatically cheaper to run in CI. A typical migration from \`waitForTimeout\`-heavy tests reduces CI minutes by 50% or more. For a team running 10,000 CI builds per month at 10 minutes each, that is 50,000 minutes saved monthly - significant cost reduction on hosted runners.

The flakiness reduction matters even more. Flaky tests cause:

- Engineers re-running CI hoping for a green build (lost time).
- Distrust in the test suite (engineers ignore real failures).
- Slower merge cadence (PRs sit waiting for green builds).
- Operational toil (someone has to triage flakes).

Migrating to \`page.clock\` eliminates the entire category of time-based flake.

## Worked example: cache TTL

A common test pattern is "verify the cache returns the same data within TTL and refreshes after". Without \`page.clock\` this test takes the TTL duration to run. With it, the test runs in milliseconds.

\`\`\`typescript
test('5-minute cache TTL behavior', async ({ page }) => {
  await page.clock.install();
  let fetchCount = 0;
  await page.route('**/api/expensive', async (route) => {
    fetchCount++;
    await route.fulfill({ json: { data: \`result-\${fetchCount}\` } });
  });

  await page.goto('/dashboard');
  await expect(page.getByTestId('data')).toHaveText('result-1');
  expect(fetchCount).toBe(1);

  // Trigger refresh - within cache TTL, no refetch
  await page.clock.runFor('2m');
  await page.getByRole('button', { name: 'Refresh view' }).click();
  await expect(page.getByTestId('data')).toHaveText('result-1');
  expect(fetchCount).toBe(1);

  // After TTL expires, refetch
  await page.clock.runFor('4m');
  await page.getByRole('button', { name: 'Refresh view' }).click();
  await expect(page.getByTestId('data')).toHaveText('result-2');
  expect(fetchCount).toBe(2);
});
\`\`\`

This test covers the entire cache lifecycle in milliseconds. Without \`page.clock\` it would take 6 minutes.

## Conclusion

\`page.clock\` is the single most important addition to Playwright since the \`getByRole\` locators. It eliminates the entire category of "wait for time to pass" flakiness, replaces \`waitForTimeout\` for application timers, and makes time-sensitive behavior testable without compromise. Every test for debounce, polling, session expiry, countdowns, or scheduled banners should use \`page.clock.install\` instead of real time.

Combine \`page.clock\` with \`page.route\` mocking for a fully deterministic test surface: you control time, you control network, you control the application. Install the [playwright-e2e skill](/skills/playwright-e2e) to make your AI agent (Claude Code, Cursor, Aider) generate tests that use \`page.clock\` by default.

For the relationship between \`page.clock\` and \`waitForTimeout\`, see [Playwright page.clock vs waitForTimeout](/blog/playwright-page-clock-waitfortimeout-reference). For the network mocking that pairs with it, see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference). For broader best practices, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026).
`,
};
