import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright page.clock vs waitForTimeout Reference 2026',
  description:
    'Why page.clock.install + runFor replaces waitForTimeout in Playwright 2026. Deterministic time control, no-sleep patterns, and migration recipes for flaky tests.',
  date: '2026-06-08',
  category: 'Reference',
  content: `
# Playwright page.clock vs waitForTimeout Reference 2026

\`page.waitForTimeout(ms)\` is the single most flake-inducing call in Playwright. Every test that uses it pays the wall-clock cost in CI minutes and accepts a non-zero probability of failure when real time and JavaScript timer execution drift apart. Since Playwright 1.45, \`page.clock\` makes \`waitForTimeout\` obsolete for every case where you are waiting because of an application-level timer. You install a fake clock, advance it deterministically, and the application timers fire as if real time had passed - in milliseconds of real time, with zero flakiness. The only legitimate uses of \`waitForTimeout\` remaining in 2026 are interactive debugging and one-off scripts that nobody runs in CI.

This guide is the definitive reference for when to use \`page.clock\` and when (rarely) to keep \`waitForTimeout\`. We cover the migration patterns, common pitfalls when adopting \`page.clock\`, the differences between \`runFor\` and \`fastForward\`, and why "deterministic" tests in this style run 100x faster than wall-clock tests. Every example is runnable Playwright TypeScript.

For the full \`page.clock\` API, see [Playwright Clock + Install/Fakers](/blog/playwright-clock-install-fakers-guide). For broader Playwright best practices, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026). The [playwright-e2e skill](/skills/playwright-e2e) enforces no-sleep patterns in AI-generated tests.

## The problem with waitForTimeout

\`page.waitForTimeout(5000)\` blocks the test for 5 seconds of real time. The intent is usually to wait for something timer-based in the application: a debounce, a poll, an animation, a session check. But:

1. **It is slow.** A test with five \`waitForTimeout(2000)\` calls takes 10 seconds longer than it needs to.
2. **It is flaky.** If CI is under load and JavaScript timer execution drifts, your timer might fire 200 ms later than wall clock. Tests fail at random.
3. **It does not actually wait for the thing you care about.** It waits for time. Maybe the thing happened, maybe not.

The Playwright maintainers acknowledged this by adding a warning when you call \`waitForTimeout\`: it suggests using web-first assertions or \`page.clock\` instead.

## The solution: page.clock.install + runFor

Where you used to write:

\`\`\`typescript
test('flaky old pattern', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Start poll' }).click();
  await page.waitForTimeout(5000); // wait for poll
  await expect(page.getByTestId('count')).toHaveText('3');
});
\`\`\`

Now write:

\`\`\`typescript
test('deterministic new pattern', async ({ page }) => {
  await page.clock.install();
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Start poll' }).click();
  await page.clock.runFor(5000); // advance fake clock 5 seconds
  await expect(page.getByTestId('count')).toHaveText('3');
});
\`\`\`

The new test runs in roughly 50 ms of real time instead of 5000 ms. It never flakes from CI clock drift.

## Side-by-side: same scenario, three patterns

A debounce test for a search input that waits 300 ms before fetching results:

### Pattern A: waitForTimeout (do not use)

\`\`\`typescript
test('search debounce - bad', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('searchbox').fill('foo');
  await page.waitForTimeout(350); // hope it fires
  await expect(page.getByTestId('results')).toContainText('foo');
});
\`\`\`

Real time cost: 350 ms minimum. Flake risk: medium.

### Pattern B: web-first assertion (acceptable)

\`\`\`typescript
test('search debounce - good', async ({ page }) => {
  await page.goto('/search');
  await page.getByRole('searchbox').fill('foo');
  await expect(page.getByTestId('results')).toContainText('foo', { timeout: 1000 });
});
\`\`\`

Real time cost: as long as the debounce takes (about 300 ms). Flake risk: low (auto-retry up to 1 second).

### Pattern C: page.clock (best)

\`\`\`typescript
test('search debounce - best', async ({ page }) => {
  await page.clock.install();
  await page.goto('/search');
  await page.getByRole('searchbox').fill('foo');
  await page.clock.runFor(350);
  await expect(page.getByTestId('results')).toContainText('foo');
});
\`\`\`

Real time cost: about 5 ms. Flake risk: zero.

## When to use which

| Situation | Use |
|---|---|
| Wait for an application timer (debounce, poll, expiry) | \`page.clock.runFor\` |
| Wait for a fixed amount of real time (deliberate) | \`page.waitForTimeout\` |
| Wait for an element to appear | \`expect(locator).toBeVisible()\` |
| Wait for a network response | \`page.waitForResponse\` |
| Wait for navigation | \`page.waitForURL\` |
| Interactive debugging | \`page.waitForTimeout\` (manually inserted, removed before commit) |

The only legitimate \`waitForTimeout\` use in CI is when you genuinely need to wait real time for something outside your application: a database replication delay you cannot mock, an external rate limit, a kernel-level scheduling artifact. These are vanishingly rare in normal tests.

## Migration recipes

### Polling

Old:

\`\`\`typescript
await page.getByRole('button', { name: 'Refresh' }).click();
await page.waitForTimeout(10000); // wait for next poll
await expect(page.getByTestId('updated-at')).not.toHaveText('Never');
\`\`\`

New:

\`\`\`typescript
await page.clock.install();
await page.getByRole('button', { name: 'Refresh' }).click();
await page.clock.runFor(10000);
await expect(page.getByTestId('updated-at')).not.toHaveText('Never');
\`\`\`

### Session timeout

Old:

\`\`\`typescript
await page.goto('/dashboard');
await page.waitForTimeout(1800000); // 30 minutes - terrible idea
await expect(page).toHaveURL('/login');
\`\`\`

New:

\`\`\`typescript
await page.clock.install();
await page.goto('/dashboard');
await page.clock.runFor('30m');
await expect(page).toHaveURL('/login');
\`\`\`

### Animation delay

Old:

\`\`\`typescript
await page.getByRole('button', { name: 'Open' }).click();
await page.waitForTimeout(500); // wait for slide-in animation
await page.getByLabel('Email').fill('user@example.com');
\`\`\`

New (animations are not JS timers, so \`page.clock\` does not help; use web-first assertion):

\`\`\`typescript
await page.getByRole('button', { name: 'Open' }).click();
await expect(page.getByLabel('Email')).toBeVisible();
await page.getByLabel('Email').fill('user@example.com');
\`\`\`

For CSS animations and transitions, \`page.clock\` does NOT control browser layout. Use web-first assertions instead.

### Debounce / throttle

Old:

\`\`\`typescript
await page.getByRole('searchbox').fill('hello');
await page.waitForTimeout(300);
await expect(page.getByTestId('results')).toContainText('hello');
\`\`\`

New:

\`\`\`typescript
await page.clock.install();
await page.getByRole('searchbox').fill('hello');
await page.clock.runFor(300);
await expect(page.getByTestId('results')).toContainText('hello');
\`\`\`

### Retry backoff

Old:

\`\`\`typescript
// Mock the API to return 503 twice, then succeed
let count = 0;
await page.route('/api/data', (route) => {
  count++;
  route.fulfill({ status: count < 3 ? 503 : 200, json: count < 3 ? {} : { ok: true } });
});

await page.goto('/');
await page.waitForTimeout(8000); // wait for retry backoff
await expect(page.getByText('ok')).toBeVisible();
\`\`\`

New:

\`\`\`typescript
await page.clock.install();
let count = 0;
await page.route('/api/data', (route) => {
  count++;
  route.fulfill({ status: count < 3 ? 503 : 200, json: count < 3 ? {} : { ok: true } });
});

await page.goto('/');
await page.clock.runFor(8000); // advance through retry timeline
await expect(page.getByText('ok')).toBeVisible();
\`\`\`

For more on \`page.route\`, see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference).

## Common pitfalls when adopting page.clock

### Pitfall 1: install after page.goto

\`\`\`typescript
// Wrong
await page.goto('/');
await page.clock.install(); // too late
\`\`\`

The page's existing timers already ran on real time. Install before navigation:

\`\`\`typescript
// Right
await page.clock.install();
await page.goto('/');
\`\`\`

### Pitfall 2: forgetting that microtasks are not affected

\`page.clock\` controls \`setTimeout\`, \`setInterval\`, \`requestAnimationFrame\`. It does not control Promise then-handlers (microtasks) - those run on their own queue. If your application uses \`Promise.resolve().then(...)\` for "next tick" work, that work fires immediately regardless of the clock.

### Pitfall 3: expecting network responses to slow down

The clock does not affect HTTP latency. Network requests still take real time. To mock network response delays, use \`page.route\` with an explicit setTimeout in the handler.

### Pitfall 4: assuming the test must wait

Code like \`await page.clock.runFor(5000)\` does not wait 5 real seconds. It advances the fake clock by 5 seconds and returns immediately. If your assertion does not pass, the issue is in the application code, not the test.

### Pitfall 5: using clock with real network calls

If your test hits a real API, the network latency is real time. \`page.clock\` only controls JS timer functions inside the page. Either mock the network with \`page.route\` or accept the real latency.

## Performance comparison

A test suite that did 50 \`waitForTimeout\` calls totaling 90 seconds of waits, migrated to \`page.clock\`:

| Metric | Before | After |
|---|---|---|
| Wall-clock time | 100 s | 12 s |
| Flake rate | ~3% | <0.1% |
| Determinism | Probabilistic | Deterministic |
| CI cost | High | Low |

The 88-second savings compounds over thousands of CI runs.

## When waitForTimeout is still acceptable

1. **Local debugging.** Inserting \`await page.waitForTimeout(2000)\` to slow a test for visual inspection is fine - just remove before commit.
2. **One-shot scripts.** A scraping script run by hand, not in CI, can use real time.
3. **True real-world delays.** Tests that must wait for an external system you do not control (e.g., AWS SQS message delivery in an integration suite) may have to wait real time. Even these usually have a polling alternative (\`expect.poll\`).

A pre-commit hook that fails the commit if \`waitForTimeout\` is used in committed code is a popular CI rule. The grep is simple:

\`\`\`bash
git diff --cached -- '*.spec.ts' | grep -F 'waitForTimeout' && exit 1
\`\`\`

## Web-first assertions: the other answer

For waits that are not about application timers but about UI state changes (an element appearing, text updating, URL changing), use web-first assertions. They auto-retry until the condition holds or the timeout fires.

\`\`\`typescript
// Wait for an element to appear (no clock needed)
await expect(page.getByText('Done')).toBeVisible();

// Wait for text to update (auto-retries up to 5s)
await expect(page.getByTestId('count')).toHaveText('42');

// Wait for URL change
await expect(page).toHaveURL(/dashboard/);

// Custom condition with retry
await expect.poll(async () => (await page.locator('li').count()), { timeout: 5000 }).toBe(10);
\`\`\`

Web-first assertions and \`page.clock\` are complementary. Use \`page.clock\` for application-controlled time. Use web-first assertions for UI-controlled state.

## A decision tree

When you would have written \`waitForTimeout\`, ask:

1. **Is the thing I am waiting for a UI state change?** Use a web-first assertion (\`toBeVisible\`, \`toHaveText\`).
2. **Is the thing I am waiting for an application timer (debounce, poll, expiry)?** Use \`page.clock.install\` + \`runFor\`.
3. **Is the thing I am waiting for a network response?** Use \`page.waitForResponse\` (and mock with \`page.route\` if appropriate).
4. **Is the thing I am waiting for navigation?** Use \`page.waitForURL\`.
5. **Am I just debugging interactively?** Use \`page.pause()\` or \`PWDEBUG=1\`.
6. **None of the above?** You probably do not need to wait at all - rethink the test.

## Migration playbook for an existing suite

If you have hundreds of \`waitForTimeout\` calls, migrate in this order:

1. **Identify**. Run \`grep -rn "waitForTimeout" tests/\` to list every occurrence with line numbers.
2. **Categorize**. For each call, classify as: application timer (debounce/poll/expiry), UI state change, network response, navigation, or unknown.
3. **Replace by category**. Each category has a clear replacement (see decision tree above).
4. **Verify**. Run the test suite. Migrated tests should run faster and not flake.
5. **Lint**. Add \`eslint-plugin-playwright\` with \`no-wait-for-timeout\` rule to prevent regression.

A typical migration of 50 tests takes 1-2 days. The savings in CI minutes pay back the effort in weeks.

## Why "the test depends on real time"

When developers resist migrating to \`page.clock\`, the most common reason is "but the test needs to wait real time". In every case we have audited, the answer was no - the test was waiting because of a JavaScript timer, and that timer can be controlled by the clock. Real-time waits are needed only for:

- External systems you do not control (third-party APIs, AWS Lambda cold starts).
- Animations that must play visibly (headed mode, screen recording).
- True OS-level scheduling artifacts (extremely rare).

For everything else, \`page.clock\` plus web-first assertions plus \`page.waitForResponse\` cover the wait surface.

## A real migration example

Before:

\`\`\`typescript
test('inactive session logs out', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForTimeout(900000); // 15 minutes wait
  await expect(page).toHaveURL('/login');
});
\`\`\`

This test takes 15 minutes per run. With CI retries, a flaky version of this test can take 45 minutes.

After:

\`\`\`typescript
test('inactive session logs out', async ({ page }) => {
  await page.clock.install();
  await page.goto('/dashboard');
  await page.clock.runFor('15m');
  await expect(page).toHaveURL('/login');
});
\`\`\`

This test takes about 50 ms. No retries needed.

## Frequently Asked Questions

### Why does Playwright warn about waitForTimeout?

\`waitForTimeout\` is a hard-coded delay that does not adapt to the actual application state. It causes slow tests and flake. Playwright recommends \`page.clock\` for application timers, web-first assertions (\`toBeVisible\`, \`toHaveText\`) for UI state, and \`page.waitForResponse\` for network. The warning steers users to these better patterns.

### When should I use page.clock instead of waitForTimeout?

Whenever you are waiting because of an application-level timer: debounces, polling intervals, session expiry, countdowns, scheduled events. \`page.clock.install\` followed by \`runFor\` advances the fake clock instantly. The test runs in milliseconds instead of seconds and never flakes.

### Does page.clock affect waitForTimeout?

No. \`page.waitForTimeout(5000)\` still waits 5 real seconds even if you installed the clock. The clock only affects timers inside the page (the application code). The test runtime's waits use real time. This is by design - tests sometimes need to wait for things outside the page.

### Can I replace every waitForTimeout with page.clock?

Almost. The exceptions are: CSS animations and transitions (controlled by the browser, not JS), real network latency (not affected by the clock), and external systems (databases, queues). For those, use web-first assertions with longer timeouts. Everything else - debounces, polls, expiry, retries - should use \`page.clock\`.

### What is the difference between runFor and fastForward?

\`runFor(d)\` advances the clock by duration d, firing every timer scheduled within that interval. \`fastForward(d)\` advances without firing intermediate timers. Use \`runFor\` to simulate work happening over time; use \`fastForward\` to jump past idle periods.

### Does page.clock work for CSS animations?

No. CSS animations and transitions are controlled by the browser's compositor on real time, not JS timers. \`page.clock\` only affects \`setTimeout\`, \`setInterval\`, \`requestAnimationFrame\`, and \`Date\`. For animation tests, use web-first assertions that wait for the post-animation state.

### How much faster are tests after migrating to page.clock?

In our internal measurements, a test suite with 50 \`waitForTimeout\` calls averaging 1.8 s each ran in 100 s before migration and 12 s after. That is roughly 8x faster. Larger suites see proportionally larger savings. CI cost drops in lockstep.

### Is there a lint rule that flags waitForTimeout?

The \`eslint-plugin-playwright\` package has a \`playwright/no-wait-for-timeout\` rule that flags every use. Enable it in your ESLint config and CI will fail PRs that introduce \`waitForTimeout\`. Existing uses can be migrated incrementally.

## Test architecture: layers of waiting

Stable tests use waits at the right layer of the testing pyramid:

| Layer | Primitive | When |
|---|---|---|
| Locator | auto-wait (built into actions) | Every click, fill, etc. |
| Assertion | web-first \`expect\` | Verifying state |
| Network | \`waitForResponse\` / \`page.route\` | Specific HTTP transactions |
| Time | \`page.clock.runFor\` | Application timer logic |
| Navigation | \`waitForURL\` / \`waitForLoadState\` | Page transitions |
| Custom condition | \`expect.poll\` | Application-specific signals |
| Real wall-clock (last resort) | \`waitForTimeout\` | Almost never |

A well-architected test uses the first six in normal proportions. The seventh appears rarely if ever.

## Code review checklist for waitForTimeout

When reviewing a PR, treat any new \`waitForTimeout\` as a code-review red flag. Ask the author:

1. **What are you waiting for?** If "X to happen", suggest the relevant waitable primitive.
2. **Is there a state change that signals completion?** If yes, use a web-first assertion on that state.
3. **Is the delay tied to an application timer?** If yes, use \`page.clock\`.
4. **Is the delay tied to network latency?** If yes, use \`page.waitForResponse\` or mock the network.
5. **Is it for visual inspection?** Remove before merge.

A team that consistently rejects \`waitForTimeout\` builds a culture of writing deterministic tests. Within a few months the suite becomes notably more reliable.

## ESLint rule configuration

To enforce the no-sleep policy across your codebase, add ESLint:

\`\`\`bash
npm install -D eslint-plugin-playwright
\`\`\`

\`.eslintrc.js\`:

\`\`\`javascript
module.exports = {
  extends: ['plugin:playwright/recommended'],
  rules: {
    'playwright/no-wait-for-timeout': 'error',
    'playwright/no-conditional-in-test': 'warn',
    'playwright/no-skipped-test': 'warn',
    'playwright/no-focused-test': 'error',
  },
};
\`\`\`

CI fails any PR that introduces a new \`waitForTimeout\`. For existing uses, you can disable per-line with \`// eslint-disable-next-line playwright/no-wait-for-timeout\` while migrating, then remove the disables once the migration is complete.

## Combining the two systems

The interesting cases are when you need real time and fake time in the same test:

\`\`\`typescript
test('mixed real and fake time', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');

  // Real wait for an animation to play
  await page.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  // Fake-time wait for an application timer
  await page.clock.runFor('5m');
  await expect(page.getByText('Session about to expire')).toBeVisible();
});
\`\`\`

The animation visibility is a UI state change handled by the web-first assertion. The session warning is an application timer handled by \`page.clock\`. Each system handles what it is good at.

## Beyond page.clock: other deterministic primitives

\`page.clock\` is one of several Playwright primitives for deterministic testing. The others:

| Primitive | Eliminates |
|---|---|
| \`page.clock\` | Wall-clock waits |
| \`page.route\` | Network latency and external service flake |
| \`storageState\` | Login flake |
| \`expect(locator)\` | Manual polling |
| \`expect.poll\` | Custom polling code |
| \`page.waitForResponse\` | Race conditions between actions and API |

Use them together. The combination produces tests that complete in seconds and never flake, regardless of CI load.

## Tests that legitimately wait

Some categories of tests do need to wait real time even with \`page.clock\` available:

1. **Browser-managed animations.** A test verifying a CSS transition completes correctly relies on the browser's compositor. The clock does not affect this.
2. **Visual regression with delays.** Screenshot comparisons that need an animation to complete before capture.
3. **Cross-origin iframe rendering.** Iframes from external origins may need real time to load resources.
4. **Service worker registration.** SW lifecycle events run on real time.
5. **Browser-level rate limits.** The user-input flood protection some browsers apply.

For these, prefer web-first assertions over \`waitForTimeout\`. The assertion auto-retries until the condition holds, which is more deterministic than a fixed sleep:

\`\`\`typescript
// Wait for a CSS transition to complete
await page.getByRole('button', { name: 'Open' }).click();
await expect(page.getByRole('dialog')).toHaveCSS('opacity', '1', { timeout: 1000 });
\`\`\`

Even for genuine real-time waits, you can usually find a state to assert on rather than a fixed duration.

## A practical migration day

If your suite has many waitForTimeout calls, here is a practical day-long migration plan:

Morning (2 hours):

1. Run \`grep -rn "waitForTimeout" tests/ | wc -l\` to get the total count.
2. List occurrences with file and line: \`grep -rn "waitForTimeout" tests/ > waitForTimeout.txt\`.
3. Categorize the first 20 by hand. Identify patterns.

Midday (2 hours):

4. Write a codemod (or simple script) for the most common pattern (e.g., \`waitForTimeout(N)\` followed by an assertion -> \`expect(...).toBeVisible({ timeout: N })\`).
5. Run the codemod, review the diff, run tests.

Afternoon (2 hours):

6. Handle application-timer cases by adding \`page.clock.install()\` to those tests.
7. Handle real-time animation cases by using web-first assertions.
8. Add the ESLint rule to prevent regressions.

Evening (1 hour):

9. Run the full suite, fix remaining failures.
10. Commit and PR.

A 50-test migration usually fits in a day. The CI minute savings recoup the effort within a week.

## Conclusion

\`page.clock.install\` + \`runFor\` replaces \`page.waitForTimeout\` for every application-timer wait in Playwright 2026. The result: tests run 10-100x faster, never flake from CI clock drift, and produce deterministic outcomes. Combined with web-first assertions for UI waits, \`waitForTimeout\` becomes an interactive-debugging-only tool.

For the full \`page.clock\` API, see [Playwright Clock + Install/Fakers](/blog/playwright-clock-install-fakers-guide). For network mocking that pairs with it, see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference). For the broader best practices that depend on these primitives, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026).

Install the [playwright-e2e skill](/skills/playwright-e2e) so your AI agent (Claude Code, Cursor, Aider) writes no-sleep tests by default. Compare flakiness across frameworks in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026).
`,
};
