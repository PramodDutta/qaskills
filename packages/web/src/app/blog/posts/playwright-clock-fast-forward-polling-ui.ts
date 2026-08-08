import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Clock Fast Forward Polling UI Without Real-Time Waits',
  description: 'Use Playwright clock fast forward polling UI tests to verify refresh, timeout, and backoff behavior in seconds, with deterministic runnable examples.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Clock Fast Forward Polling UI Without Real-Time Waits

Playwright clock fast forward polling UI tests replace long wall-clock delays with controlled browser time. Install the page clock before navigation, let the application register its timers, then choose \`clock.runFor()\` when every scheduled polling callback must execute or \`clock.fastForward()\` when the browser should jump as if a laptop slept and woke later. Assert both the rendered status and the number or timing of network requests.

The distinction matters. \`runFor()\` advances through time and fires all time-related callbacks, which fits interval polling and retry backoff. \`fastForward()\` jumps ahead and fires due timers at most once, which fits inactivity, wake-up, and “refresh when overdue” behavior. If the stack choice is still open, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides context. When the final assertion targets a status card or toast, the [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) help keep the time test independent of DOM layout.

## Start With the Polling Contract, Not the Timer API

A polling screen usually combines several independent rules: when the first request starts, how often later requests run, whether requests overlap, what counts as a terminal state, how errors change the interval, and what happens after a long absence. Write those rules down before manipulating time.

| Contract question | Example decision | Observable test evidence |
|---|---|---|
| When is the first request sent? | Immediately on page load | First route hit occurs before time advances |
| What is the steady interval? | Every 5 seconds | Request timestamps differ by 5,000 ms |
| Can requests overlap? | No | Maximum in-flight count remains 1 |
| What ends polling? | Status is \`complete\` | No later requests after terminal response |
| How are errors retried? | 2s, 4s, then 8s | Recorded attempt times follow the schedule |
| What happens after wake-up? | One immediate refresh | A time jump causes one request, not a burst |
| What does the user see? | Last good value plus warning | UI preserves data and exposes degraded state |

This contract separates product logic from clock mechanics. A test that only checks “Completed” after advancing a minute can pass even if the browser made 60 requests, issued overlaps, or ignored the intended backoff. Those are production defects hidden by a weak oracle.

## Understand What Playwright Replaces

The Clock API controls browser globals related to time, including \`Date\`, timer functions, and animation scheduling. The official guide is https://playwright.dev/docs/clock and the API reference is https://playwright.dev/docs/api/class-clock. Install the clock before navigating for consistent results. Application modules sometimes capture references to native timers during startup; installing afterward leaves those references uncontrolled.

| Clock method | Time behavior | Timer behavior | Suitable polling use |
|---|---|---|---|
| \`setFixedTime()\` | \`Date.now()\` stays fixed | Timers continue naturally | Display formatting, not fast polling |
| \`install()\` | Replaces clock primitives | Enables manual control | Required foundation for timer tests |
| \`pauseAt()\` | Jumps to a time and pauses | Due timers fire at most once | Reach a known checkpoint |
| \`fastForward()\` | Jumps by a duration | Due timers fire at most once | Sleep and wake-up semantics |
| \`runFor()\` | Advances across a duration | All scheduled callbacks fire | Intervals, retries, debounce chains |
| \`resume()\` | Restarts time flow | Timers proceed normally | Hand control back to real progression |

Do not use \`setFixedTime()\` to accelerate intervals. It changes the value returned by the date clock while timers keep running naturally. That is useful when a page must render a known billing date, but it will not make a five-minute polling interval complete immediately.

A small smoke test proves the setup:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('installs controlled time before application startup', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-08T10:00:00Z') });
  await page.setContent(\`
    <output data-testid="time"></output>
    <script>
      document.querySelector('[data-testid="time"]').textContent =
        String(Date.now());
    </script>
  \`);

  await expect(page.getByTestId('time')).toHaveText('1786183200000');
});
\`\`\`

The expected epoch belongs to the explicit UTC instant, so the assertion does not depend on the machine's locale. Prefer ISO timestamps with \`Z\` when the test is about elapsed time rather than local calendar presentation.

## Build a Deterministic Polling Fixture

The most reliable browser test controls the responses while exercising the real application timer. \`page.route()\` can return a planned sequence and capture the browser's controlled \`Date.now()\`. The following complete test renders an order widget that polls immediately and then every five seconds.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('polls until the order becomes complete', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-08T10:00:00Z') });

  const replies = ['queued', 'processing', 'complete'] as const;
  const requestTimes: number[] = [];
  await page.route('**/api/orders/42', async (route) => {
    requestTimes.push(await page.evaluate(() => Date.now()));
    const status = replies[Math.min(requestTimes.length - 1, replies.length - 1)];
    await route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { id: 42, status },
    });
  });

  await page.setContent(\`
    <output aria-label="Order status">Loading</output>
    <script>
      const output = document.querySelector('output');
      let timer;
      async function poll() {
        const response = await fetch('https://app.test/api/orders/42');
        const order = await response.json();
        output.textContent = order.status;
        if (order.status === 'complete') clearInterval(timer);
      }
      poll();
      timer = setInterval(poll, 5000);
    </script>
  \`);

  await expect(page.getByLabel('Order status')).toHaveText('queued');
  await page.clock.runFor(10_000);
  await expect(page.getByLabel('Order status')).toHaveText('complete');
  expect(requestTimes).toEqual([
    Date.parse('2026-08-08T10:00:00Z'),
    Date.parse('2026-08-08T10:00:05Z'),
    Date.parse('2026-08-08T10:00:10Z'),
  ]);
});
\`\`\`

The route and UI provide different evidence. Recorded times verify scheduling. The accessible output verifies user-visible state. If the status never becomes complete, the captured list immediately tells whether the timer failed, the request failed, or rendering failed.

## Choose runFor() When Every Poll Must Happen

\`runFor()\` moves through the requested duration and runs all callbacks scheduled along the path. That makes it the default for fixed intervals, recursive \`setTimeout\`, debounce followed by a request, and exponential backoff. Pass milliseconds as a number or a supported time string such as \`'01:00'\`.

For a poller that must not overlap slow requests, test the in-flight invariant. Instead of relying on real network latency, hold the first response with a promise, advance time, then release it.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('does not overlap polling requests', async ({ page }) => {
  await page.clock.install();
  let releaseFirst!: () => void;
  const firstMayFinish = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let calls = 0;

  await page.exposeFunction('pollServer', async () => {
    calls += 1;
    if (calls === 1) await firstMayFinish;
    return { status: calls >= 2 ? 'complete' : 'processing' };
  });

  await page.setContent(\`
    <output aria-label="Job status">Starting</output>
    <script>
      const output = document.querySelector('output');
      let stopped = false;
      async function poll() {
        if (stopped) return;
        const result = await window.pollServer();
        output.textContent = result.status;
        if (result.status === 'complete') {
          stopped = true;
          return;
        }
        setTimeout(poll, 5000);
      }
      poll();
    </script>
  \`);

  await page.clock.runFor(20_000);
  expect(calls).toBe(1);
  releaseFirst();
  await expect(page.getByLabel('Job status')).toHaveText('processing');
  await page.clock.runFor(5_000);
  await expect(page.getByLabel('Job status')).toHaveText('complete');
  expect(calls).toBe(2);
});
\`\`\`

Recursive \`setTimeout\` schedules the next poll only after the prior request settles. A bare \`setInterval\` can overlap if a request takes longer than the interval. That architecture decision is visible and testable without waiting 20 real seconds.

## Use fastForward() to Simulate Sleep and Wake-Up

\`fastForward()\` intentionally does not replay every missed interval. Due timers fire at most once, similar to a device waking after a long pause. This behavior is ideal when a browser tab or laptop returns after being inactive and the application should refresh once rather than execute a backlog.

The next test distinguishes a jump from chronological execution. An initial poll runs, then a 30-minute jump produces only one more interval callback.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('performs one catch-up poll after a long time jump', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-08T10:00:00Z') });
  let requests = 0;

  await page.route('**/api/health', async (route) => {
    requests += 1;
    await route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { healthy: true, sequence: requests },
    });
  });

  await page.setContent(\`
    <output aria-label="Refresh count">0</output>
    <script>
      const output = document.querySelector('output');
      async function refresh() {
        const response = await fetch('https://app.test/api/health');
        const data = await response.json();
        output.textContent = String(data.sequence);
      }
      refresh();
      setInterval(refresh, 60_000);
    </script>
  \`);

  await expect(page.getByLabel('Refresh count')).toHaveText('1');
  await page.clock.fastForward('30:00');
  await expect(page.getByLabel('Refresh count')).toHaveText('2');
  expect(requests).toBe(2);
});
\`\`\`

If this test used \`runFor('30:00')\`, it would exercise every minute boundary and expect many calls. That would answer a different question. Put the intended metaphor in the test name: “runs every interval” versus “catches up once after wake-up.”

## Verify Backoff Without Waiting Through Failures

Production pollers often back off after transport errors. Test the exact schedule and reset behavior. A controlled function can return failures and record controlled timestamps. The example uses delays of one, two, and four seconds, then stops at success.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('backs off and stops after success', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-08T12:00:00Z') });
  const attempts: number[] = [];

  await page.exposeFunction('readBuild', (timestamp: number) => {
    attempts.push(timestamp);
    if (attempts.length < 4) throw new Error('temporary failure');
    return { status: 'ready' };
  });

  await page.setContent(\`
    <output aria-label="Build status">checking</output>
    <script>
      const output = document.querySelector('output');
      let delay = 1000;
      async function poll() {
        try {
          const build = await window.readBuild(Date.now());
          output.textContent = build.status;
        } catch {
          setTimeout(poll, delay);
          delay *= 2;
        }
      }
      poll();
    </script>
  \`);

  await page.clock.runFor(7_000);
  await expect(page.getByLabel('Build status')).toHaveText('ready');
  expect(attempts).toEqual([
    Date.parse('2026-08-08T12:00:00Z'),
    Date.parse('2026-08-08T12:00:01Z'),
    Date.parse('2026-08-08T12:00:03Z'),
    Date.parse('2026-08-08T12:00:07Z'),
  ]);
});
\`\`\`

The exact delays here are part of the example contract, not a universal recommendation. Real systems often cap backoff and add jitter. For deterministic browser tests, inject or disable randomness through an application-owned seam, then test the jitter policy separately with bounded values. Do not mock \`Math.random\` globally unless the test owns every consumer on the page.

## Prove Polling Stops at the Terminal State

A completed job should not keep consuming server capacity. After the terminal response appears, advance farther and assert that the call count remains unchanged. This negative assertion catches forgotten \`clearInterval\` calls and recursive timers scheduled before the success branch.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('does not poll after terminal state', async ({ page }) => {
  await page.clock.install();
  let calls = 0;
  await page.exposeFunction('statusForTest', () => {
    calls += 1;
    return calls === 1 ? 'running' : 'complete';
  });

  await page.setContent(\`
    <output aria-label="Task status">unknown</output>
    <script>
      const output = document.querySelector('output');
      async function poll() {
        const status = await window.statusForTest();
        output.textContent = status;
        if (status !== 'complete') setTimeout(poll, 2000);
      }
      poll();
    </script>
  \`);

  await page.clock.runFor(2_000);
  await expect(page.getByLabel('Task status')).toHaveText('complete');
  expect(calls).toBe(2);

  await page.clock.runFor(60_000);
  expect(calls).toBe(2);
});
\`\`\`

The second advancement is deliberate. Without it, the test sees completion but never proves quiescence.

## Coordinate Timer Advancement With Async Rendering

Advancing the clock runs timer callbacks, but those callbacks may start promises, fetches, framework updates, or animations. After advancing, use a web-first assertion such as \`expect(locator).toHaveText()\` so Playwright waits for the observable state. Do not add an arbitrary \`waitForTimeout()\`; that reintroduces wall-clock delay and masks missing synchronization.

| Symptom | Likely cause | Better synchronization |
|---|---|---|
| Call count updated, text still old | Promise or render commit pending | Await a locator assertion |
| First poll never happens | Clock installed after app captured timers | Install before navigation |
| Huge request burst | \`runFor()\` used for wake-up behavior | Use \`fastForward()\` if contract says one catch-up |
| Only one request after long advancement | \`fastForward()\` used for interval replay | Use \`runFor()\` |
| Test hangs during startup | Page depends on flowing time while clock is paused | Install with time, navigate, pause later |
| Locale-specific date fails | Implicit local time formatting | Assert UTC logic or control locale and zone |

When application initialization needs timers to flow, install at a known time, navigate normally, and call \`pauseAt()\` after the screen is ready. The Playwright docs recommend this order for cases where pausing too early could leave page loading stuck.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('pauses after startup and then advances polling manually', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-08T08:59:50Z') });
  await page.goto('/operations');
  await expect(page.getByRole('heading', { name: 'Operations' })).toBeVisible();

  await page.clock.pauseAt(new Date('2026-08-08T09:00:00Z'));
  await page.clock.runFor(15_000);

  await expect(page.getByRole('status')).toContainText('Updated');
});
\`\`\`

This code assumes \`/operations\` is a real application route with a status region. It demonstrates ordering without inventing a custom clock method or matcher chain.

## Diagnose the “Fast” Test That Still Takes a Minute

A realistic failure mode is a test that installs the clock, advances sixty seconds, and still waits for the runner timeout. The page shows “Checking,” no final response appears, and the engineer concludes that Clock cannot control polling.

Start diagnosis at the scheduling boundary:

1. Confirm installation occurs before \`goto()\` or before \`setContent()\` evaluates application code.
2. Determine whether polling runs in the page, a Web Worker, a Service Worker, or the Node test process. The clock is installed on the whole BrowserContext, so it controls time in every page and iframe in that context (use a fresh context when you need isolation). It does not control your backend, the Node test process, a database, or worker schedulers, so verify those separately.
3. Inspect whether the application uses \`setInterval\`, recursive \`setTimeout\`, server-sent events, or network retry logic outside page timers.
4. Record route hits and browser \`Date.now()\` values. No hit means scheduling failed; a hit without UI change means async handling or rendering failed.
5. Check whether the test chose \`fastForward()\` but expects every interval to replay.
6. Remove real \`waitForTimeout()\` calls and replace them with state assertions.

What people get wrong is assuming fake time makes all asynchronous work instantaneous. It controls the selected time APIs. It does not make a slow backend respond, deliver a websocket message, complete a worker task, or resolve an application promise that depends on another system. Control those dependencies independently.

## Test Visibility-Aware Polling as a State Machine

Many applications reduce or stop polling when the document is hidden and refresh when it becomes visible. Advancing time alone does not exercise that policy. The test must control both dimensions: elapsed browser time and the visibility event or application-owned abstraction that tells the poller it is active. Model the behavior as states such as active, hidden, overdue, refreshing, and terminal.

Start with a table of transitions. From active to hidden, the application may cancel the next timer. While hidden, no regular request should start. From hidden to active before the interval expires, polling may resume on the remaining schedule. From hidden to active after data becomes stale, one immediate refresh should run. From any state to terminal, all future schedules should stop. This model prevents a test from confusing a clock jump with a visibility change.

Browser-level visibility emulation depends on the environment and should follow documented Playwright capabilities available to the project. When the application architecture permits it, a cleaner test seam is an injected visibility source with the production adapter reading the Page Visibility API and the test adapter publishing controlled values. The end-to-end layer should still retain a smaller case that proves the adapter is connected correctly. Do not replace every real visibility test with a mocked function and then claim browser suspension coverage.

For an overdue refresh, capture the last-success timestamp in the page, change the app to hidden, move controlled time beyond the stale threshold with fastForward(), then publish visible and expect exactly one request. Follow that with runFor() across one ordinary interval and expect one additional request. Those two clock operations deliberately validate different semantics in the same policy: wake-up catch-up and steady chronological scheduling.

Also test rapid visibility changes. A user can switch tabs twice while a request is still in flight. The poller should avoid starting a second refresh, and completion of the first request should update the current screen only if its result remains relevant. Record maximum concurrent requests and response sequence numbers. If an older response arrives after a newer one, the UI must not regress. Controlled deferred promises make that ordering reproducible without adding network sleeps.

## Separate Wall Time, Monotonic Duration, and Server Time

Polling code often mixes three notions of time. Wall time is a calendar timestamp such as Date.now(). Monotonic duration measures elapsed intervals without being affected by a user changing the system clock. Server time comes from a response header or payload and can differ from the client. A good test identifies which source controls each decision.

Expiry displayed to a user may use wall time. Retry delay should normally depend on elapsed duration. A server lease or rate-limit reset may need authoritative server time. Freezing or jumping Date values can expose accidental coupling, but Clock cannot repair an unclear product rule. If the poller says “retry after 30 seconds,” decide whether moving the displayed calendar backward should change that duration. Then choose an assertion that observes the intended source.

Timezone and daylight-saving transitions are another reason to keep elapsed polling intervals separate from calendar presentation. A five-second poll should remain five seconds when local clocks move forward or backward. Test elapsed behavior with UTC instants and numeric durations. Test local labels in dedicated cases with an explicitly configured browser context and expected locale output. Combining both concerns in one case creates failures that are hard to assign.

Server-provided Retry-After behavior requires its own fixture. If the application supports a delta in seconds, return a controlled value and prove no request occurs before that duration. If it supports an HTTP date, align the controlled page clock with the response and test just before and at the boundary. Use the format the application actually implements, and do not invent support for both forms merely because the protocol permits them.

## Assert Request Identity, Not Just Request Quantity

Request counts catch bursts, but they do not prove that each poll asks for the correct resource or carries the latest cursor. A dashboard can issue the expected number of calls while continuing to poll an order the user no longer views. Capture method, pathname, query parameters, selected headers, and controlled timestamp for every intercepted request.

When the user changes filters, the old timer must either be cancelled or read current filter state. Build a case that starts with region A, advances one interval, changes to region B, and advances again. Assert that later requests contain region B and that an eventual response for region A cannot overwrite the B results. Use distinct response markers so the wrong render is obvious. This scenario finds stale closures that a simple count assertion misses.

Cursor polling needs similar treatment. Return a next cursor with each response and verify the subsequent request sends it exactly once. A failed response should not usually advance the cursor. A terminal response should prevent later cursor calls. If cursors are opaque, compare exact fixture strings rather than parsing them in the test. The test is validating transport behavior, not duplicating the server's cursor format.

Authentication refresh can interact with polling timers. Multiple scheduled requests may observe an expired token at once and trigger duplicate refreshes. Hold the refresh response, advance through several poll boundaries, and assert only one refresh operation is active. After release, verify pending work resumes according to the product contract without replaying obsolete polls. This is an ideal example of why runFor() must be combined with controlled promises and network evidence.

## Design Reusable Clock Fixtures Without Hiding Order

A shared fixture can install a known time and expose helpers for advancing it, but it should not silently navigate or decide between fastForward() and runFor(). Those choices express scenario meaning and belong in the test. Name helper methods after behavior, such as “run every scheduled callback for five seconds” or “simulate wake-up after thirty minutes,” if a domain wrapper genuinely improves readability.

Reset route counters and response plans for every test. A fixture scoped to a worker can leak request history and controlled time across cases, particularly when a failed assertion prevents normal cleanup. Prefer a fresh browser context or page at test scope unless startup cost has been measured and a stronger reset protocol exists.

Document the controlled starting instant next to business expectations. Midnight, month-end, and expiration boundaries may be intentional; an arbitrary historic date should not become unexplained folklore. When an incident inspires a regression case, retain the time-zone offset and scheduling sequence that made the fault possible, but remove unrelated production identifiers.

Finally, make traces readable. Attach the request timeline as JSON with controlled timestamps, outcome, and response sequence. A screenshot captures only the final frame. A trace plus the small schedule table lets a reviewer see whether the wrong timer fired, the right request returned late, or the render ignored fresh data. That evidence makes accelerated tests easier to trust than their real-time predecessors.

## Keep Clock Tests Maintainable in CI

Use one time model per test. Resetting the page or creating a fresh context between tests prevents hidden dependence on a prior clock state. Keep timestamps explicit, preferably UTC, and record request times rather than inferring them from screenshot order.

| CI design choice | Recommended approach | Reason |
|---|---|---|
| Parallelism | Independent browser contexts and fixtures | Clock state and route counters stay isolated |
| Response control | Route or owned fake service | Removes backend timing variance |
| Assertions | UI plus request schedule | Detects both user and load regressions |
| Time inputs | Fixed ISO instants and elapsed milliseconds | Avoids daylight-saving ambiguity |
| Retries | Preserve first-attempt traces | A retry can hide timer ordering races |
| Scope | One polling contract per test | Failure points remain diagnosable |

Avoid asserting implementation details such as a private React state variable. Network calls and accessible output are durable contracts. If a refactor changes \`setInterval\` to recursive \`setTimeout\` while preserving the schedule and no-overlap rule, the test should continue to pass.

Code agents are useful for expanding a table of polling policies into tests, but provide the actual endpoint, terminal states, retry schedule, clock method, and expected request count. Ask the agent to cite the Clock API it uses and reject invented helpers. The result should be shorter than a real-time test, faster in CI, and more explicit about behavior.

## Frequently Asked Questions

### Should polling tests use fastForward() or runFor()?

Use \`runFor()\` when the test must execute every interval or retry scheduled within a duration. Use \`fastForward()\` when simulating a jump such as sleep and wake-up, where due timers fire at most once. Name the scenario after the behavior so reviewers can verify the choice. If the requirement says “poll every five seconds for thirty seconds,” use \`runFor()\`. If it says “after returning thirty minutes later, refresh once,” use \`fastForward()\`.

### When should the Playwright clock be installed?

Install it before navigating to the application whenever startup code registers or captures timers. If the page needs time to flow during initialization, install at a known instant, navigate, wait for a stable screen, and then use \`pauseAt()\`. Installing after the app starts can leave captured native timer references outside Clock control. Keep setup in the test or a clearly named fixture so the ordering remains visible during review.

### Why does the UI update after the request count assertion?

A timer callback can start asynchronous work that resolves after the clock advancement returns. The route may have been called while the framework still needs to process a promise and commit a render. Follow clock movement with a web-first locator assertion such as \`toHaveText()\` or \`toBeVisible()\`. It waits for the observable outcome without adding real-time sleep. Also capture route failures, because a fulfilled timer with a rejected fetch will never produce the expected UI.

### Does Playwright Clock accelerate backend and worker time too?

No. The page clock controls supported time functions in the browser page where it is installed. It does not automatically advance a remote service's scheduler, a Node process timer, a database clock, or every worker context. Design seams for those dependencies: mock the route, expose a test backend clock, or drive the worker independently. First locate where the scheduling logic executes, then apply the clock at that boundary and synchronize on externally visible results.
`,
};
