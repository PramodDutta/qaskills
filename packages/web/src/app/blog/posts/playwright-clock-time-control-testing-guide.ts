import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Clock & Time Control: Complete 2026 Testing Guide',
  description: 'Control time in Playwright tests with page.clock. Install, fastForward, pauseAt, setFixedTime, and patterns for timers, intervals, and scheduled jobs.',
  date: '2026-05-14',
  category: 'Guide',
  content: `
# Playwright Clock and Time Control: Complete 2026 Testing Guide

Time-dependent code is the bane of automated tests. A reminder that fires in five minutes, a session that expires in an hour, a charting library that animates over thirty seconds, and a chat widget that auto-marks messages as read after ten minutes idle, each pose the same challenge: how do you test "what happens later" without actually waiting later?

Playwright's \`page.clock\` API (1.45+) solves this by giving you control over the page's notion of time. You can install a fake clock, advance it by fast-forwarding, pause at a specific moment, or pin the clock to a fixed date. The result: deterministic tests for everything from timers and intervals to date-sensitive UI.

This guide covers every method on \`page.clock\` and the patterns production teams use to test time-dependent flows. Examples are TypeScript with Playwright 1.49+.

For broader fundamentals, see the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). The [playwright-e2e skill](/skills/playwright-e2e) ensures AI assistants generate time-aware tests.

## Why fake the clock?

Three categories of code need time control:

| Category | Example |
|---|---|
| Timers | \`setTimeout\`, \`setInterval\` |
| Date arithmetic | "X minutes ago" labels |
| Animations | CSS transitions, requestAnimationFrame |

Real time produces flaky tests. The fix: replace the page's clock with one your test controls.

## Installing the fake clock

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('shows session expiry warning after 50 minutes', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-05-14T12:00:00Z') });
  await page.goto('/dashboard');

  await expect(page.getByRole('status', { name: 'Session expiring' })).toBeHidden();

  await page.clock.fastForward('50:00'); // 50 minutes

  await expect(page.getByRole('status', { name: 'Session expiring' })).toBeVisible();
});
\`\`\`

\`page.clock.install\` replaces the page's \`Date\`, \`setTimeout\`, \`setInterval\`, \`requestAnimationFrame\`, and \`performance.now\` with mocked versions controlled by your test.

## Methods reference

| Method | Purpose |
|---|---|
| \`install(options?)\` | Install the fake clock (must be called before navigation) |
| \`uninstall()\` | Restore real time |
| \`fastForward(time)\` | Advance the clock by the given amount |
| \`pauseAt(time)\` | Pause at a specific timestamp |
| \`resume()\` | Resume real-time progression |
| \`runFor(time)\` | Like fastForward, but blocks until microtasks settle |
| \`setFixedTime(time)\` | Pin the clock to a single point (no progression) |
| \`setSystemTime(time)\` | Set the current time, allow progression |

## Time argument formats

Times can be:

- A number of milliseconds (\`30_000\`).
- A duration string (\`"30:00"\` for 30 minutes, \`"1:30:00"\` for 90 minutes).
- A \`Date\` object.
- An ISO 8601 string.

\`\`\`typescript
await page.clock.fastForward(30_000); // 30 seconds
await page.clock.fastForward('30:00'); // 30 minutes
await page.clock.fastForward('1:00:00'); // 1 hour
await page.clock.pauseAt(new Date('2026-05-14T13:00:00Z'));
\`\`\`

## Testing setTimeout

\`\`\`typescript
test('shows toast after timeout', async ({ page }) => {
  await page.clock.install({ time: 0 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Save' }).click();

  // Toast appears after 3 seconds in real time
  await expect(page.getByRole('alert', { name: 'Saved' })).toBeHidden();
  await page.clock.fastForward(3000);
  await expect(page.getByRole('alert', { name: 'Saved' })).toBeVisible();
});
\`\`\`

The toast that normally needs 3 real seconds appears instantly because the fake clock jumps forward.

## Testing setInterval

\`\`\`typescript
test('polls every 30 seconds', async ({ page }) => {
  let pollCount = 0;
  await page.route('**/api/status', (route) => {
    pollCount++;
    return route.fulfill({ json: { status: 'ok' } });
  });
  await page.clock.install({ time: 0 });
  await page.goto('/dashboard');

  expect(pollCount).toBe(1); // initial fetch

  await page.clock.fastForward(30_000);
  await page.waitForFunction(() => true); // let microtasks flush
  expect(pollCount).toBe(2);

  await page.clock.fastForward(30_000);
  await page.waitForFunction(() => true);
  expect(pollCount).toBe(3);
});
\`\`\`

## Pinning a date

\`setFixedTime\` is useful for tests that depend on "today is X".

\`\`\`typescript
test('shows correct day label', async ({ page }) => {
  await page.clock.install();
  await page.clock.setFixedTime(new Date('2026-05-14T12:00:00Z'));
  await page.goto('/');
  await expect(page.getByText('Today is Thursday, May 14')).toBeVisible();
});
\`\`\`

The page's \`Date\` is locked. Timers do not advance. Useful for date pickers and weekday-based UI.

## Setting system time but allowing progression

\`setSystemTime\` updates the current moment but timers still progress at real speed.

\`\`\`typescript
await page.clock.setSystemTime(new Date('2026-05-14T12:00:00Z'));
// Now timers tick at real speed but start at the pinned moment
\`\`\`

Use this when you need a specific starting time but want subsequent intervals to feel realistic.

## Pause and resume

\`\`\`typescript
test('pauses chart animation for snapshot', async ({ page }) => {
  await page.clock.install();
  await page.goto('/chart');
  await page.clock.pauseAt(new Date('2026-05-14T12:00:00.500Z'));
  // Animation paused; safe to snapshot
  await expect(page.locator('canvas')).toHaveScreenshot('chart-paused.png');
  await page.clock.resume();
});
\`\`\`

Pausing makes screenshot diffs deterministic for animated content.

## Testing relative time labels

\`\`\`typescript
test('shows correct relative time label', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-05-14T12:00:00Z') });
  await page.route('**/api/posts', (route) =>
    route.fulfill({
      json: [
        { id: 1, createdAt: '2026-05-14T11:59:30Z' },
        { id: 2, createdAt: '2026-05-14T11:30:00Z' },
      ],
    })
  );
  await page.goto('/posts');

  await expect(page.getByText('30 seconds ago')).toBeVisible();
  await expect(page.getByText('30 minutes ago')).toBeVisible();
});
\`\`\`

The relative-time component reads \`Date.now()\` and compares to \`createdAt\`. With a fixed clock, the output is deterministic.

## When to install the clock

\`\`\`typescript
await page.clock.install(); // before navigation
await page.goto('/'); // navigation reads fake Date from start
\`\`\`

Install before navigation so the page's initial \`<script>\` tags see the fake clock from line one. If you install after navigation, code that captured \`Date.now()\` at module load time still has the real value.

## Combining with route mocking

\`\`\`typescript
test('caches data for 5 minutes', async ({ page }) => {
  let fetches = 0;
  await page.route('**/api/data', (route) => {
    fetches++;
    return route.fulfill({ json: { data: [] } });
  });
  await page.clock.install({ time: 0 });
  await page.goto('/data');

  expect(fetches).toBe(1);

  // 4 minutes later: cache hit
  await page.clock.fastForward('4:00');
  await page.getByRole('button', { name: 'Refresh' }).click();
  expect(fetches).toBe(1);

  // 6 minutes later: cache miss
  await page.clock.fastForward('2:00');
  await page.getByRole('button', { name: 'Refresh' }).click();
  expect(fetches).toBe(2);
});
\`\`\`

The combined pattern verifies cache TTL without actually waiting six minutes.

## Long-running tests without real time

\`\`\`typescript
test('campaign expires after 7 days', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-05-01T00:00:00Z') });
  await page.goto('/campaigns/spring');
  await expect(page.getByText('Active')).toBeVisible();

  await page.clock.fastForward('7d');
  await page.reload();
  await expect(page.getByText('Expired')).toBeVisible();
});
\`\`\`

The duration string \`'7d'\` fast-forwards seven days in a single call.

## Common pitfalls

**Pitfall 1: Installing after navigation.** Modules that read \`Date\` at import time keep the real value. Install before \`goto\`.

**Pitfall 2: Forgetting microtasks.** After \`fastForward\`, pending microtasks (promises) may not have flushed. Use \`runFor\` or \`waitForFunction\` to give them a chance.

**Pitfall 3: Mixing fake clock with \`waitForTimeout\`.** \`waitForTimeout\` uses real time; it is unaffected by the fake clock. Use \`fastForward\` for everything time-related.

**Pitfall 4: Clock state leaks across tests.** Per-test contexts handle this automatically; manual contexts must \`uninstall\` or close.

**Pitfall 5: Server-driven time.** The fake clock affects only the browser. If your API returns timestamps based on real server time, mock the API responses to align with the fake clock.

## Anti-patterns

- Using \`waitForTimeout\` to test "what happens after N minutes". Use \`fastForward\`.
- Setting fake clock without route-mocking the API. Server time and client time diverge.
- Installing the fake clock at module load. Install per test for isolation.
- Forgetting to uninstall on tests that mix real and fake time. Use per-test fixtures.

## A complete time-dependent test

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('email digest schedules correctly across timezones', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-05-14T08:00:00Z') });
  await page.route('**/api/me', (route) =>
    route.fulfill({
      json: { id: 1, timezone: 'Asia/Kolkata', digestHour: 9 },
    })
  );

  await page.goto('/settings/digest');
  await expect(page.getByText('Next digest in 5h 30m')).toBeVisible();

  await page.clock.fastForward('5h 30m');
  await expect(page.getByText('Sending digest now')).toBeVisible();
});
\`\`\`

The test verifies the cross-timezone calculation without actually waiting five and a half hours.

## Conclusion and next steps

\`page.clock\` is the missing primitive for testing time-dependent UI. Install before navigation, fastForward through intervals, pin specific dates for date-aware rendering, and pause for snapshot stability.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate clock-aware tests. For broader emulation, see [Playwright Emulation Geolocation Permissions Guide](/blog/playwright-emulation-geolocation-permissions-guide). For network coordination, [Playwright Network Mocking Route Handler Guide](/blog/playwright-network-mocking-route-handler-guide).
`,
};
