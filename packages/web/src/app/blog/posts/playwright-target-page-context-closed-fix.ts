import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright “Target Page, Context or Browser Has Been Closed” Fix',
  description:
    'Fix Playwright Target Page, Context or Browser Has Been Closed errors by tracing ownership, missing awaits, teardown races, crashes, and popup lifetimes.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Playwright “Target Page, Context or Browser Has Been Closed” Fix

The click at line 48 is rarely the real culprit. A page object can remain in scope after its browser context has been disposed, so the next innocent-looking \`locator.click()\` receives Playwright's blunt message: “Target page, context or browser has been closed.” Debugging improves quickly once you stop treating that text as a locator failure and start reconstructing who owned the target, who closed it, and which asynchronous operation outlived that ownership.

This guide builds that reconstruction systematically. It covers Playwright Test fixtures, manually created contexts, popups, missing awaits, hook ordering, timeouts, worker shutdown, and actual browser exits. The aim is not to suppress the exception. It is to identify the first lifecycle violation and preserve the most useful evidence before cleanup erases it.

## Read the error as a lifecycle statement

Page, BrowserContext, and Browser form a containment hierarchy. Closing a context closes every page inside it. Closing a browser closes all of its contexts. Playwright Test's built-in \`page\` and \`context\` fixtures are test-scoped, which means the runner disposes them after the test and its test-scoped teardown finish. A reference can still exist in JavaScript after disposal, but operations on that reference cannot reach a live target.

| Message appears during | Likely lifecycle event | First evidence to inspect |
|---|---|---|
| An ordinary action mid-test | Application closed a tab, helper called \`close()\`, or browser crashed | Trace action immediately before the failure and page close events |
| A promise callback after the test passed | The test returned without awaiting work | The promise creation site, not the callback stack alone |
| \`afterEach\` | Test or fixture already closed the context | Hook ownership and whether built-in fixtures are closed manually |
| A popup assertion | Parent action closed or replaced the popup, or popup capture raced | Popup event ordering and all open page URLs |
| Only under parallel CI load | Timeout, worker termination, memory pressure, or shared browser ownership | Test timeout, worker logs, exit signal, container memory events |
| API request through \`page.request\` | Its owning context ended | Whether a standalone request context is more appropriate |

The three nouns in the message do not tell you which object initiated closure. That ambiguity is why adding a longer timeout usually wastes time. A closed target will not become open after waiting. First determine the closure boundary, then inspect why execution crossed it.

## Instrument closure before reproducing it

Add listeners as soon as the fixture is available. A listener registered after the close cannot reconstruct the event. Logging the test title, URL, page count, and failure status creates a short lifecycle ledger without changing the timing as much as screenshots or arbitrary waits.

\`\`\`ts
import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ lifecycleLog: void }>({
  lifecycleLog: [
    async ({ context }, use, testInfo) => {
      const started = Date.now();
      const stamp = () => \`+\${Date.now() - started}ms\`;

      context.on('page', (page) => {
        console.log(stamp(), 'page opened', page.url());
        page.on('close', () => {
          console.log(stamp(), 'page closed', page.url());
        });
        page.on('crash', () => {
          console.log(stamp(), 'page crashed', page.url());
        });
      });
      context.on('close', () => {
        console.log(stamp(), 'context closed', testInfo.title);
      });

      await use();

      console.log(
        stamp(),
        'fixture teardown',
        testInfo.status,
        context.pages().map((page) => page.url()),
      );
    },
    { auto: true },
  ],
});

export { expect };
\`\`\`

Use this fixture temporarily from the same import that supplies your tests. It does not close anything. The \`await use()\` boundary is significant: code above it executes during setup, the test runs while it is suspended, and code below it executes during fixture teardown. If “fixture teardown” appears before a late callback tries to use the page, the callback escaped the test's awaited work.

For richer evidence, enable a trace on the first retry rather than tracing every successful test. The trace records action timing, DOM snapshots, console messages, and network activity. The [Playwright Trace Viewer guide](/blog/playwright-trace-viewer-guide-2026) explains how to correlate those panes instead of reading each artifact in isolation.

## Find promises that escape the test body

The most common defect is not an explicit \`page.close()\`. It is an asynchronous branch that the test starts but does not return or await. Array iteration with \`forEach(async ...)\`, a floating page-object call, a timer callback, and an event handler that launches work can all survive beyond the final awaited statement.

Consider a cleanup request started in a \`finally\` block without \`await\`. The test completes, Playwright tears down its context, and the request rejects later with the closed-target error. The stack points at cleanup, but the ownership defect is the missing wait.

| Suspicious shape | Why it escapes | Safer form |
|---|---|---|
| \`items.forEach(async item => ...)\` | \`forEach\` ignores returned promises | \`for...of\` for sequencing, or \`await Promise.all(items.map(...))\` |
| \`pageObject.save();\` | The test does not observe completion or rejection | \`await pageObject.save()\` |
| \`void page.waitForResponse(...)\` | Explicitly detaches work tied to the page | Store the promise and await it after the triggering action |
| \`setTimeout(async () => page..., 100)\` | Timer is outside the test's awaited chain | Replace time delay with an observable condition |
| Async event listener | EventEmitter does not await listener promises | Capture completion in a promise owned by the test |
| \`expect(promise).resolves...\` without await | Assertion can settle after teardown | \`await expect(promise).resolves...\` |

A useful static defense is enabling TypeScript-aware lint rules that reject floating promises. It will not prove correct event ordering, but it catches a large class of invisible branches before runtime.

## Repair popup and download races at the source

Popup workflows fail in two opposite ways. The test may wait for the popup after clicking, missing an event that has already fired. Or it may correctly capture the popup but let another action close the parent context before assertions finish. Create the event promise before the trigger, then await both in their natural order.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('invoice opens in a review tab and can be approved', async ({ page, context }) => {
  await page.goto('/invoices/INV-2048');

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Review invoice' }).click();
  const reviewPage = await popupPromise;

  await reviewPage.waitForLoadState('domcontentloaded');
  await expect(reviewPage.getByRole('heading', { name: 'Invoice INV-2048' })).toBeVisible();
  await reviewPage.getByRole('button', { name: 'Approve' }).click();
  await expect(reviewPage.getByText('Approval recorded')).toBeVisible();

  expect(context.pages()).toContain(reviewPage);
});
\`\`\`

Do not call \`context.close()\` at the end of a test using the built-in context fixture. Playwright Test owns that context and closes it. Manual closure adds no hygiene, but it can break \`afterEach\`, automatic fixtures, tracing, video finalization, and pending attachments.

If the product intentionally closes the popup after approval, assert that contract explicitly with a close event. Create \`const closed = reviewPage.waitForEvent('close')\` before clicking, perform the click, then \`await closed\`. Do not make further page assertions afterward. Continue on the still-live parent page if the business flow returns there.

## Separate fixture-owned and manually owned contexts

Ownership should be visible in the code. Built-in fixtures are borrowed resources. A context created by \`browser.newContext()\` inside your test is owned by your code and should be closed in a \`finally\` block. Confusing these models produces double close calls and cross-test leaks.

When one test needs two independent users, create only the additional context manually. Keep the built-in page for the primary actor. This makes cleanup boundaries obvious and lets the runner collect normal artifacts for the primary session.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('support agent sees a customer status change', async ({ page, browser }) => {
  const customerContext = await browser.newContext();
  try {
    const customerPage = await customerContext.newPage();
    await customerPage.goto('/account');
    await customerPage.getByRole('button', { name: 'Pause subscription' }).click();
    await expect(customerPage.getByText('Subscription paused')).toBeVisible();

    await page.goto('/support/customers/42');
    await expect(page.getByText('Paused')).toBeVisible();
  } finally {
    await customerContext.close({ reason: 'secondary actor finished' });
  }
});
\`\`\`

The \`reason\` option is especially helpful when several helper layers can terminate a context. Playwright reports that reason to operations interrupted by closure, turning a generic symptom into an ownership clue. For a deeper treatment of isolation, persistence, and multi-user arrangements, see the [Playwright browser context guide](/blog/playwright-browser-context-guide-2026).

## Audit hooks and fixture teardown order

Hooks often hide the close. Search for every call to \`.close()\` in test support code, not only in the failing spec. Include page objects, authentication helpers, global setup, worker fixtures, and reporter integrations. Then classify each resource by scope.

Test-scoped fixtures are set up for a test and torn down after its hooks. Worker-scoped fixtures live across multiple tests in a worker. A worker fixture that hands out a shared Page is risky because tests can navigate, close, or corrupt the same page. Prefer a worker-scoped immutable service or account record, then create a fresh context and page per test.

An \`afterAll\` that uses the built-in \`page\` fixture is conceptually wrong because no single test-scoped page belongs to the suite. A global variable assigned from \`beforeEach({ page })\` is equally fragile: its last value points at the previous test's disposed page until the next hook overwrites it.

Use fixture dependencies rather than global variables. Put teardown after \`await use(resource)\`, and close only resources created by that fixture. If teardown needs the page, it must occur while the page fixture is still alive. Fixture dependency ordering will keep the dependency alive until the dependent fixture completes teardown.

## Distinguish timeout cancellation from deliberate closure

When a test exceeds its timeout, Playwright interrupts active operations and proceeds toward teardown. The operation visible at the bottom of the stack may report a closed target even though the initiating problem was an earlier hang. Read the first timeout message and the call log above the closure exception.

Increasing the global timeout can conceal a slow dependency while making failure feedback worse. Instead, determine which budget expired:

- The test timeout covers the test function, hooks, and test-scoped fixture setup and teardown as documented by the runner.
- Assertion timeouts apply to retrying web-first assertions.
- Action timeouts apply to actions when configured.
- Navigation can have its own default.
- A worker process can be killed externally by the CI platform even when Playwright still has time remaining.

If teardown itself is legitimately slow, give that fixture an explicit fixture timeout rather than inflating every test. If a locator never resolves, inspect its actionability log and application state. A slow locator is not repaired by keeping a broken test alive for another minute.

## Investigate real crashes and process exits

Not every occurrence is an async coding mistake. A page can crash, the browser process can exit, or the operating system can kill a worker. The differentiator is evidence outside the test's normal control flow.

Listen for \`page.on('crash')\`, preserve browser stderr when launching manually, and inspect CI container events for out-of-memory termination. A browser crash often affects one renderer page; a browser process exit invalidates every context. Repeated failure at a media-heavy, WebGL, or large-document step deserves a resource investigation. Random loss across parallel workers may justify reducing worker count as an experiment, not as the final fix.

When launching a browser yourself, attach a \`browser.on('disconnected')\` listener. With Playwright Test's built-in browser fixture, avoid manually closing it. A shared helper that calls \`browser.close()\` can simultaneously destroy unrelated contexts in the same worker.

Also check the application. Links with \`target=_blank\`, authentication redirects, scripts calling \`window.close()\`, and single-use payment windows can intentionally remove a target. A trace DOM snapshot immediately before closure helps establish whether product behavior or test infrastructure initiated it.

## Avoid the fixes that merely move the race

Several popular “fixes” reduce the reproduction rate while preserving the defect. They make the next failure harder to diagnose.

Adding \`waitForTimeout(1000)\` changes scheduling but establishes no invariant. Catching and ignoring the exception can skip the business assertion entirely. Checking \`page.isClosed()\` before an action has a time-of-check/time-of-use race: the page may close one microtask later. Reusing a single context to save startup time expands the blast radius. Setting \`workers: 1\` may hide shared state while sacrificing useful parallel coverage.

Retries are diagnostic when paired with traces, but they are not proof of correctness. A retry that passes tells you the issue is timing-sensitive. It does not validate the failed attempt's user outcome. Keep the first-retry trace, label flaky tests, and repair the ownership or awaited chain.

| Tempting workaround | Hidden cost | Correct diagnostic question |
|---|---|---|
| Sleep before the failing action | Couples success to machine speed | What observable event makes the action safe? |
| Ignore “has been closed” | Can turn an incomplete flow green | Was closure expected by the product contract? |
| Close every page in cleanup | Destroys runner-owned resources and evidence | Which layer created each page? |
| Raise all timeouts | Lengthens genuine deadlocks | Which exact operation consumed its budget? |
| Serialise the suite forever | Masks unsafe shared ownership | Which state crosses worker or test boundaries? |
| Recreate a page after closure | Loses session and causal history | Why did the original target die? |

## A practical triage sequence

Start with the first failure in the report, because later cleanup errors are frequently secondary. Open the trace and locate the last completed Playwright action. Compare its timestamp with any timeout. Add lifecycle listeners near fixture setup. Search the repository for explicit close calls. Inspect the test for floating promises and async iteration. Confirm popups, downloads, responses, and navigation events are awaited from promises created before their triggers.

Next, label ownership for every target involved. The runner owns built-in fixtures. Your helper owns resources it creates. The application may own a window that it intentionally closes. Remove any close call from a layer that did not create the object. Run the single test repeatedly, then beside adjacent tests, then with its normal parallelism. This progression distinguishes an intrinsic race from cross-test interference.

Finally, reproduce under representative CI resources. If event logs show a crash or browser disconnection with no application close, inspect memory, process signals, and browser stderr. Preserve artifacts from the failed attempt. The target-closed message is the end of the story; your fix belongs at the earliest point where the target's lifetime diverged from the work using it.

Record that causal point in the regression test name or a short comment, so a future refactor does not reintroduce the same ownership race.

## Frequently Asked Questions

### Should I call page.close() in afterEach?

Not when the page came from Playwright Test's built-in \`page\` fixture. The runner disposes it. Close a page in your code only when your code created that extra page and its lifetime must end before the owning context does.

### Why does the error point to an assertion that normally passes?

The assertion is the first operation to notice that its target is gone. Inspect preceding asynchronous work, timeout messages, close events, and teardown. The line that observes disposal is often later than the line that caused it.

### Can page.isClosed() make the test safe?

It is useful for logging or branching when closure is an expected product outcome. It cannot make a subsequent action atomic, so it is not a reliable guard against concurrent teardown.

### How do I know whether Chromium crashed rather than my test closing it?

Capture \`page.on('crash')\`, browser disconnection, process output, and CI resource events. A normal \`page.on('close')\` alone does not identify the initiator, while crash and process evidence narrows the cause.

### Why does this happen only after a test retry begins?

Module globals, shared worker resources, or detached promises from the first attempt may survive long enough to interfere with the retry. Ensure each attempt owns fresh test-scoped state and all work is awaited before the attempt ends.
`,
};
