import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Debugging Interview Questions and Answers',
  description:
    'Practice Playwright debugging interview questions on traces, locators, auto-waiting, timeouts, retries, fixtures, network races, and CI-only failures.',
  date: '2026-07-13',
  category: 'Reference',
  content: `
# Playwright Debugging Interview Questions and Answers

“The test passes with \`--debug\` but fails headless in CI. What do you inspect first?” A strong Playwright answer does not begin with a sleep or a larger timeout. It asks what the debugger changed, preserves the failing attempt's evidence, and narrows the race between application state, locator actionability, network completion, and fixture lifetime.

The questions below are designed for senior SDET interviews. They test diagnosis rather than API recall. Each answer includes the reasoning an interviewer should listen for, plus follow-up pressure that separates practical experience from memorized advice.

## Reading a CI trace without rerunning blindly

### Question 1: A checkout test fails only in CI. Which trace panes do you correlate?

Start with the action that failed and the immediately preceding completed action. Inspect its call log for locator resolution and actionability checks. Compare before and after DOM snapshots, then align network requests, console messages, and timestamps. Check whether navigation or a frontend error changed the page before the action. Source view identifies the call site; it does not by itself establish cause.

A senior answer mentions using the first failed attempt, because a retry trace may show a different outcome. It also avoids treating a screenshot as the truth. A screenshot shows one moment; the trace timeline and DOM snapshots show transitions.

Follow-up: Why configure \`trace: 'on-first-retry'\` rather than \`on\` for every CI test? Tracing every run has storage and execution cost. First-retry tracing is a common compromise, although retaining failure evidence from the original attempt may require policy choices and reporter configuration. For a full artifact workflow, see the [Playwright Trace Viewer guide](/blog/playwright-trace-viewer-guide-2026).

### Question 2: The trace says the element was visible but the click timed out. How can both be true?

Visibility is only one actionability condition. A click also needs a unique resolved target that is stable, receives events, and is enabled. An overlay can intercept pointer events; animation can keep the target unstable; a disabled control can be visible; or the locator can resolve differently during retries.

Inspect the call log, not just \`toBeVisible()\`. Ask whether the assertion and click use the same locator and whether application state changes between them. Do not force the click until you have proved the product intentionally requires bypassing actionability. \`force: true\` can make the test click through a user-blocking overlay and validate an impossible interaction.

| Candidate response | What it reveals | Interview assessment |
|---|---|---|
| “Increase timeout to 60 seconds” | Treats every failure as slowness | Weak without evidence |
| “Use force click” | Bypasses a diagnostic guard | Risky unless behavior is intentional |
| “Read the actionability call log and overlay state” | Understands Playwright's click contract | Strong |
| “Add a fixed wait after visibility” | Couples test to timing | Weak |
| “Check unique resolution, stability, event reception, and enabled state” | Connects symptoms to actual conditions | Strong |

## Locator questions that expose stale assumptions

### Question 3: Why does a role locator survive rerenders better than an ElementHandle?

A Locator represents a query that Playwright resolves when an action or assertion runs. If React replaces the node, a later locator operation can resolve the current matching element. An ElementHandle points to a particular DOM node and can become detached. Role locators also align with user-visible accessibility semantics and give strictness feedback when multiple elements match.

This does not make every role locator automatically good. A generic \`getByRole('button')\` may match many controls. Add an accessible name and narrow within a meaningful container. Test IDs are appropriate when the UI lacks a stable user-facing contract or the control is otherwise ambiguous.

### Question 4: A locator matches two “Save” buttons only on mobile. What is the repair?

First determine whether both are truly actionable or one is visually hidden through responsive layout. Strictness is useful because the test's intent is ambiguous. Scope to the form or dialog the user is operating, preferably using a semantic parent, then select the named button within it. Do not append \`.first()\` merely to silence the error; DOM order can change and the wrong form may submit.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('saves billing details from the open dialog', async ({ page }) => {
  await page.goto('/settings/billing');
  await page.getByRole('button', { name: 'Edit billing address' }).click();

  const dialog = page.getByRole('dialog', { name: 'Billing address' });
  await dialog.getByLabel('Postal code').fill('560001');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('Billing address updated')).toBeVisible();
});
\`\`\`

Follow-up: If the hidden duplicate remains in the accessibility tree due to an application bug, the test may be exposing a real accessibility defect. The candidate should not automatically work around it without product investigation.

### Question 5: When is getByTestId the better choice?

Use a test ID for a stable testing contract when user-facing text is localized or dynamic, when several visually identical data cells need exact identity, or when no semantic locator can express the intended target. Keep IDs descriptive of domain identity, not layout. \`invoice-row-2048\` is more stable than \`third-row-blue-button\`.

An experienced answer avoids ideology. Role and label locators exercise accessibility and user perception, while test IDs offer explicit control. CSS paths tied to nesting and \`nth()\` selections are usually the least resilient.

## Auto-waiting, response races, and navigation timing

### Question 6: Why is waitForTimeout not a synchronization strategy?

A duration says nothing about the condition needed for the next action. On a fast run it wastes time; on a slow run it is insufficient. Synchronize on a user-visible state, a specific network response, URL change, download event, or application signal whose completion makes the next step valid.

Playwright actions already auto-wait for actionability, and web-first assertions retry. Extra waits can hide which condition is missing. There are legitimate uses for a deliberate delay in a test of debounce duration or time-based UX, but even then clock control or an explicit boundary is preferable.

### Question 7: The response happened before waitForResponse was registered. Show the correct pattern.

Create the response promise before performing the action that can trigger it. Do not await the promise before clicking, because then nothing triggers the request. Trigger, then await the captured promise and assert its status or body.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('recalculates shipping after changing country', async ({ page }) => {
  await page.goto('/checkout');

  const quoteResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/shipping/quote') &&
      response.request().method() === 'POST',
  );

  await page.getByLabel('Country').selectOption('IN');
  const response = await quoteResponse;
  expect(response.ok()).toBe(true);

  await expect(page.getByTestId('shipping-total')).toHaveText('₹250.00');
});
\`\`\`

The final DOM assertion remains necessary. A \`200\` response does not prove the UI consumed it correctly. Conversely, if user-visible state is the only contract, waiting for the DOM may be enough and less coupled than inspecting implementation requests.

### Question 8: Should you wait for networkidle after every page.goto?

That is usually the wrong readiness condition. Applications with analytics, polling, SSE, or long-lived requests may never become network-idle in a useful sense. Playwright's documentation discourages using network idle as a general test-readiness signal. Navigate, then assert the specific screen state the user needs.

An interview answer should recognize that \`page.goto()\` already waits for a load state according to its options, but modern application readiness often occurs after client rendering. A heading, enabled form, or populated result is a better contract than absence of network connections.

## Timeout diagnosis instead of timeout inflation

### Question 9: Explain the difference between test, action, navigation, and expect timeouts.

The test timeout budgets the test function and its relevant hooks and fixture work according to Playwright Test lifecycle. Expect assertions have their own retry timeout. Actions and navigations can use configured defaults. A candidate should inspect which timer expired before changing configuration.

If a fixture legitimately needs longer setup, give the fixture a specific timeout. If one assertion waits for a slow asynchronous job, set an intentional timeout on that assertion or test, with a domain-based upper bound. Raising the global test timeout makes deadlocks slower and can still leave a smaller expect timeout unchanged.

| Timeout symptom | Investigate | Poor shortcut |
|---|---|---|
| Locator assertion expires at five seconds | Whether expected state ever arrived and assertion timeout | Only raising global test timeout |
| Test ends during long data setup | Fixture or hook budget, service readiness | Adding sleeps inside setup |
| Navigation hangs on one route | Server response, redirects, chosen wait condition | Waiting for network idle universally |
| CI worker killed before Playwright timeout | CI job limit, memory, process signal | Editing Playwright timeout |
| Cleanup reports target closed | Earlier test timeout and teardown ordering | Catching close error |

### Question 10: A test takes 31 seconds with a 30-second timeout, but its expect timeout is 10 seconds. Which wins?

The outcome depends on when the assertion begins and remaining test budget. An assertion does not grant the test extra life beyond the encompassing test timeout. Explain the timeline rather than comparing numbers in isolation. Setup, actions, assertions, and teardown consume budgets at their respective scopes.

Senior candidates mention that teardown receives runner-managed handling and that timeout errors can trigger secondary closed-page messages. They read the first timeout, not only the last stack.

## Retries as evidence, not a cure

### Question 11: What does “passed on retry” tell you?

It proves the outcome is sensitive to execution conditions. Possible causes include a test race, application race, shared state, unreliable dependency, resource pressure, or product nondeterminism. It does not prove the first failure was harmless.

Retain traces for retries, report the test as flaky where supported, and compare attempt timelines. If retry setup creates fresh worker state, a passing retry can implicate leaked state or a contaminated worker. If both attempts share an external environment, state may have been warmed by attempt one.

### Question 12: When would you configure zero retries locally and two in CI?

Local zero retries give immediate failure and a stable debugging target. CI retries can collect evidence about intermittent behavior and reduce disruption while a strict flake-management policy exists. The candidate should add conditions: retries must not erase flaky classification, non-idempotent setup must be controlled, and the team must own a backlog or quarantine process.

“CI is slower” is not enough. Slowness should be handled by readiness and budgets. Retries address variability, and unmanaged variability is still a defect signal.

## Fixtures, workers, and failures that move between tests

### Question 13: A test passes alone but fails after another file. What do you inspect?

Look for module globals, shared accounts, reused server data, worker-scoped fixtures, leaked routes, environment variables, browser storage imported from mutable state, timers, and unawaited work. Confirm cleanup runs on failure. Randomize or reverse order to prove the dependency, then shrink to the smallest pair.

Playwright provides a fresh context for the built-in page fixture per test. That isolation does not reset external databases, queues, files, or module singletons. A candidate who says “Playwright isolates every test automatically” is overstating the boundary.

### Question 14: Why is sharing one Page in a worker-scoped fixture dangerous?

Tests can navigate, close, authenticate, or attach routes on the same page. State crosses test boundaries, and a failure can poison later tests. Worker-scoped fixtures are well suited to expensive immutable services, account allocation, or server processes. Create a fresh context/page per test for browser isolation.

The ownership rule is useful: the fixture that creates a resource should tear it down after \`await use()\`. Built-in fixture resources belong to Playwright Test and should not be manually closed by ordinary tests.

### Question 15: The error says “Target page, context or browser has been closed” in afterEach. Where is the likely defect?

The hook may be using a fixture the test manually closed, or floating work may be reaching the page after test completion. Search explicit \`close()\` calls, inspect lifecycle events, and audit missing awaits. A browser crash or worker interruption is also possible, so preserve process and trace evidence.

Do not recreate a new page in teardown just to make cleanup pass. Cleanup should usually use an API client or direct service interface if the UI target's lifetime is uncertain.

## Network mocking questions with hidden traps

### Question 16: A page.route handler is registered but requests still hit the server. Why?

Check registration timing, URL matching, page versus context scope, popups, and service workers. Playwright documents that native routing does not intercept requests already handled by a service worker and recommends blocking service workers when routing visibility is required. Also confirm the request is not issued before the page-level route exists; context routes can cover early popup traffic.

### Question 17: What is wrong with mocking every backend response in an end-to-end test?

The browser flow becomes a frontend contract test with a synthetic backend. That can be valuable, but it no longer validates deployed integration, authentication, serialization, or real data behavior. Label the layer honestly and keep a smaller set against real services.

A precise answer discusses \`route.fulfill()\`, \`route.continue()\`, \`route.fetch()\`, and HAR replay only to the extent needed. API recall matters less than selecting the seam that matches the risk.

### Question 18: How would you debug a mock that leaks into the next test?

Page-scoped routes die with that page, but context routes persist for the context. In a custom reused context, call \`unroute()\` with the same matcher and handler or \`unrouteAll()\` during owned teardown. Prefer fresh test contexts. Beware in-flight route handlers during teardown; current Playwright APIs provide behavior options for waiting or ignoring late handler errors.

## Console, page errors, and process evidence

### Question 19: Should every browser console error fail the test?

Not blindly. Establish an allowlist or classification because browsers, extensions in non-hermetic runs, and known third-party scripts can emit noise. Fail on uncaught application errors and unexpected high-severity console messages, attach their text and location, and keep exceptions reviewed and narrow.

Register listeners before navigation. \`page.on('pageerror')\` captures uncaught exceptions in page context, while \`page.on('console')\` captures console API calls. Network response status is another channel; a \`500\` does not automatically throw in the browser.

### Question 20: How do you distinguish a browser crash from a normal page close?

Listen for the page \`crash\` event, context close, and browser disconnection. Collect browser process stderr when launching manually and inspect CI container memory or termination signals. A close event alone says the page closed, not who initiated it. Reproduction around a WebGL or large-memory page may point to renderer resources; all contexts disappearing points higher in the hierarchy.

## How interviewers can score debugging depth

Good candidates form and test hypotheses. They ask for trace, call log, versions, environment difference, failure frequency, and the first failing attempt. They distinguish application behavior from runner behavior and choose the smallest diagnostic change.

| Signal | Mid-level answer | Senior answer |
|---|---|---|
| Synchronization | Replaces sleeps with waits | Names the exact observable invariant and coupling cost |
| Locators | Prefers roles and labels | Handles strictness, frames, dynamic lists, and accessibility defects |
| Retries | Uses them for flakes | Treats retry outcome as evidence and preserves attempt artifacts |
| Timeouts | Knows configuration keys | Reconstructs which budget expired and why |
| Isolation | Uses fresh contexts | Maps browser, worker, process, and external state boundaries |
| CI-only failure | Suggests headed reproduction | Compares resources, artifacts, scheduling, versions, and process exits |
| Mocking | Can fulfill a route | States which production seam the mock removes from coverage |

Avoid trivia such as asking candidates to recite every CLI flag. Give a trace excerpt, an actionability log, or a flawed test and ask them to rank hypotheses. The [SDET interview questions collection](/blog/sdet-interview-questions-2026) can complement this Playwright-specific set with architecture and leadership scenarios.

## A compact live-debugging exercise

Provide a test where \`waitForResponse\` is registered after the click, a duplicate mobile button is selected with \`.first()\`, and a fixed sleep precedes the assertion. Ask the candidate to change only what evidence justifies. A strong solution creates the response promise before the trigger, scopes the locator to the intended region, removes the sleep, and keeps a web-first assertion on user output.

Then introduce a CI trace showing an overlay receives pointer events. The candidate should reconsider whether the network wait is sufficient and investigate why the overlay remains. This reveals whether they debug a system or merely apply memorized transformations.

Finally, ask what they would commit. Diagnostic logging may be temporary; stable semantic locators and correct event ordering belong in the test; an application overlay defect belongs with product code; retry changes require suite policy. Senior debugging includes deciding where the repair lives.

## Frequently Asked Questions

### Are Playwright interview answers expected to include exact APIs?

Candidates should know common locator, assertion, event, and trace workflows, but diagnosis is more important than memorizing every option. Verify uncertain syntax in documentation during real work.

### What is the strongest answer to “How do you fix flaky tests?”

There is no single fix. Classify the failure using artifacts, reproduce the smallest dependency, identify the missing invariant or leaked state, repair it at the owning layer, and verify under normal concurrency.

### Should a candidate always prefer role locators?

They should prefer user-facing semantics when those uniquely express intent, while recognizing good uses for labels, text, titles, and stable test IDs. Blindly choosing any locator family is weaker than explaining the contract.

### How much weight should interviewers give CI experience?

Substantial weight for senior roles. Browser automation quality depends on artifact retention, resource constraints, parallel isolation, test data, and failure classification beyond what a local headed run exposes.

### What practical task best tests trace-reading ability?

Give the candidate a short trace from a failed attempt and ask for the next three checks in priority order. Score whether each check could discriminate among plausible causes rather than merely collect more data.
`,
};
