import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress “Timed Out Retrying After 4000ms” Fix',
  description:
    'Fix Cypress timed out retrying after 4000ms errors by separating selector, request, rendering, actionability, and test-isolation causes with evidence.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Cypress “Timed Out Retrying After 4000ms” Fix

At 4,001 milliseconds, Cypress reports the symptom it can see: the command's required condition never became true. The message does not prove the application is slow. It may mean the selector is wrong, the request was never observed, the element exists inside a different document, an animation keeps it non-actionable, or state leaked from an earlier test.

Raising \`defaultCommandTimeout\` can quiet the message and preserve the defect. A reliable fix starts by identifying which Cypress retry loop expired, then collecting evidence from the command log, DOM snapshot, network aliases, browser console, and application state.

## Read the command named in the error

“Timed out retrying after 4000ms” is a prefix shared by different failures. The rest of the error identifies the condition Cypress retried. A failed \`cy.get()\` did not find the expected DOM match. A failed \`.should('be.visible')\` found or queried something that never met visibility. A \`click()\` error may describe covering, disabled, detached, or animated elements.

| Error detail | Retry target | High-value first check |
|---|---|---|
| Expected to find element, never found it | Query plus downstream assertion | Inspect selector and DOM at the failure snapshot |
| Expected element to be visible | Visibility calculation | Check hidden duplicate, CSS, ancestor state, and viewport |
| Element is being covered | Actionability | Identify overlay, toast, sticky header, or unfinished animation |
| Expected text or value did not match | Assertion subject | Confirm data request and rendering branch |
| Page updated while command executed | Element became detached | Re-query after the state-changing action |
| Expected request alias was not seen | Network observation | Register intercept before triggering the request |

Cypress retries queries and linked assertions, not arbitrary JavaScript. A value captured into a normal variable does not become reactive. Likewise, a side effect in a \`.then()\` callback is not repeatedly executed just because a later assertion fails.

## Repair selectors before changing clocks

A selector can be syntactically valid and still target yesterday's DOM. Generated CSS classes, array positions, and text that product writers change are weak contracts. Prefer accessible queries when user semantics are the test subject, or stable \`data-*\` attributes for controls whose identity is otherwise ambiguous.

\`\`\`typescript
describe('invoice approval', () => {
  it('approves the selected invoice after data loads', () => {
    cy.intercept('GET', '/api/invoices?status=pending').as('pendingInvoices');
    cy.intercept('POST', '/api/invoices/inv-204/approve').as('approveInvoice');

    cy.visit('/invoices');
    cy.wait('@pendingInvoices').its('response.statusCode').should('eq', 200);

    cy.get('[data-cy="invoice-row"]')
      .contains('[data-cy="invoice-number"]', 'INV-204')
      .parents('[data-cy="invoice-row"]')
      .within(() => {
        cy.contains('button', 'Approve').should('be.enabled').click();
      });

    cy.wait('@approveInvoice').its('response.statusCode').should('eq', 200);
    cy.get('[data-cy="invoice-row"]')
      .contains('[data-cy="invoice-number"]', 'INV-204')
      .parents('[data-cy="invoice-row"]')
      .should('contain.text', 'Approved');
  });
});
\`\`\`

The intercepts are registered before \`visit\` and before the click that triggers the mutation. Waiting on their aliases establishes that the relevant response arrived; the final DOM assertion establishes that the application rendered it. Neither substitutes for the other.

Be careful with \`contains()\`. If the same label appears in a navigation item, hidden template, and table cell, Cypress may yield a match outside the intended component. Scope first with \`within()\` or a stable container. Do not reach immediately for \`first()\`, because selecting by accidental order can convert ambiguity into a misleading pass.

## Separate request completion from rendered readiness

Modern pages rarely become ready in one event. A route can return HTML, mount a shell, fetch data, normalize it, update a store, and render a virtualized list. \`cy.visit()\` waiting for the load event says little about those later stages.

Use \`cy.intercept()\` to observe a request when that request is an explicit prerequisite. Register the route matcher first, perform the triggering action second, then \`cy.wait('@alias')\`. Finally assert the user-facing state. This triangulation tells you whether the delay occurred before the request, in the service, or after the response.

The [Cypress intercept network stubbing reference](/blog/cypress-intercept-network-stubbing-reference) goes deeper into route matchers and aliases. For this timeout, the critical rule is ordering: an intercept declared after a fast request cannot travel backward and capture it.

| Evidence | What it proves | What it does not prove |
|---|---|---|
| \`cy.wait('@items')\` completed | A request matched and finished | The response was successful unless asserted |
| Alias status equals 200 | The observed response status was successful | React, Vue, or Angular rendered the intended state |
| Spinner disappeared | One loading indicator left the DOM or hid | Correct records were displayed |
| Row contains expected ID | Relevant UI state appeared | No duplicate request or stale extra row exists |
| Command log shows query retries | Cypress kept re-running the query chain | Application state was progressing |

Do not alias an overly broad pattern such as every GET request and then assume the first match is the data call. Match the method and a stable URL shape. Query strings and dynamic identifiers may need an object route matcher rather than a fragile full string.

## Use the timeout that belongs to the delayed operation

Cypress has distinct timeout settings. Changing the global command timeout to accommodate a long page load can slow every missing-element failure. Apply a local option when one operation has a justified budget.

| Timeout | Applies to | Misuse to avoid |
|---|---|---|
| \`defaultCommandTimeout\` | Most DOM commands and assertions | Raising it globally for one slow report |
| \`requestTimeout\` | Time waiting for a request to go out in commands such as alias waits | Treating it as server response time |
| \`responseTimeout\` | Time waiting for a response | Using it to fix post-response rendering |
| \`pageLoadTimeout\` | Page load events for navigation | Expecting it to wait for SPA data |
| Command \`{ timeout }\` option | That command's retry budget | Adding it without a stated readiness expectation |

For a legitimately expensive export, \`cy.get('[data-cy="export-ready"]', { timeout: 20_000 })\` can document the accepted wait. Better still, observe the export request and assert a clear ready state. A local 20-second allowance should connect to an agreed product expectation, not a guess made during flaky-test triage.

The timeout shown in the message may be assertion-related even when attached to a query chain. Cypress links retryable queries and assertions, re-running the chain until it passes or expires. Understand the full chain rather than focusing only on the last line.

## Actionability failures are not missing-element failures

Cypress checks whether an element is visible, enabled, attached, not covered, and not moving beyond configured thresholds before an action. The button may be plainly present in a screenshot while \`click()\` continues retrying.

Inspect the error's actionability explanation. A loading overlay with zero opacity may still intercept pointer events. A sticky header can cover a scrolled target. A CSS transition can keep movement above the actionability threshold. A framework rerender may detach the exact node found by an earlier query.

Fix the application or synchronize with its real state. Assertions such as \`should('be.enabled')\` and checks that an overlay no longer exists express useful behavior. \`click({ force: true })\` bypasses actionability and should be reserved for cases where a real user-equivalent action is not the goal. Using force on checkout controls can make the test perform an interaction a user could not.

If a click triggers rerendering, start a new \`cy.get()\` chain for the next operation. Avoid holding a jQuery element across a state transition. Cypress can retry queries, but it cannot turn an old detached reference into the new node.

## Diagnose framework rendering and virtualized content

Virtual lists render only visible rows. A query for record 900 may correctly return nothing until the list scrolls or its search filter narrows the dataset. Increasing a timeout never causes virtualization to mount an offscreen item. Use the component's supported interaction: search, paginate, or scroll a stable container.

Hydration introduces another class of delay. Server-rendered markup may appear before event handlers are attached. A click made at that boundary can be lost or followed by a client rerender. Applications can expose a user-observable ready condition, such as enabled controls or the disappearance of a skeleton, rather than a test-only sleep.

For state-management defects, inspect the browser console and network payload. A successful response followed by a JavaScript exception explains why the assertion retried for four seconds. Cypress is behaving correctly; the application never reached the state.

\`\`\`typescript
it('renders results after a delayed but successful response', () => {
  cy.intercept('GET', '/api/search?q=printer', {
    delay: 750,
    statusCode: 200,
    body: {
      results: [{ id: 'p-9', name: 'Office Printer' }],
    },
  }).as('search');

  cy.visit('/search');
  cy.get('[data-cy="search-input"]').type('printer');
  cy.contains('button', 'Search').click();

  cy.get('[data-cy="loading-indicator"]').should('be.visible');
  cy.wait('@search');
  cy.get('[data-cy="loading-indicator"]').should('not.exist');
  cy.get('[data-cy="search-result"]')
    .should('have.length', 1)
    .and('contain.text', 'Office Printer');
});
\`\`\`

This controlled delay tests the loading transition without \`cy.wait(750)\`. The response, spinner removal, and rendered record are distinct checkpoints.

## Eliminate state leakage and order dependence

A selector may time out only in the full suite because the preceding test changed an account, feature flag, clock, viewport, or browser storage. Re-running the isolated test then passes. Treat that pattern as an isolation defect.

Create required server state before each example through an API or task with a unique identifier. Do not depend on another \`it\` block to create the record. Clean up global flags that survive browser state reset. Keep tests independently runnable in any order.

The [Cypress best practices guide](/blog/cypress-best-practices-2026-guide) covers isolation strategy in more depth. During this failure, compare the network response and setup data between isolated and suite runs. The missing element may simply correspond to a record consumed or deleted earlier.

Parallel CI adds collisions. If workers share an email address or invoice ID, one can move the entity out of the state another expects. Generate worker-safe data and make selectors identify that data specifically.

## A disciplined 4000ms investigation

Start by reproducing with video or interactive runner evidence, not by editing configuration. Read the complete message and select the failed command in the command log. Inspect its DOM snapshot and console. Determine whether the target never existed, existed but failed an assertion, or was non-actionable.

Next, trace the state backward. What request or user action should produce the element? Was the intercept installed before the trigger? Did the response match the alias, return the expected status, and contain the expected entity? Did application code throw afterward? Is the element in an iframe, shadow root, virtual list, or hidden responsive branch that requires a different query strategy?

Only after the condition is correct should you decide whether four seconds is an unrealistic budget for this environment. If so, change the narrowest relevant timeout and record why. Verify the failure mode by deliberately preventing the state. A good test then fails with a specific assertion near its agreed deadline, not a generic lookup much later.

## Check whether the element lives in another browsing context

\`cy.get()\` queries the application document. It does not automatically descend into an iframe, and a cross-origin frame has additional browser security boundaries. A payment field rendered by a provider can be plainly visible while a document-level selector retries until four seconds expire. Confirm ownership in DevTools before rewriting the selector.

For same-origin frames, wait for the frame document and body through a tested helper that keeps Cypress's retry behavior. For cross-origin interactions, use Cypress's supported origin workflow where applicable and follow the provider's test integration. Do not disable web security as a routine fix; that changes the browser model and can hide an invalid production integration.

Shadow DOM creates a different boundary. Cypress can traverse an open shadow root through supported shadow commands or configured inclusion. Closed roots are intentionally inaccessible. Prefer a component contract or public control when a third-party closed root cannot be queried.

## Inspect query chains for a non-retryable break

A retryable \`cy.get()\` followed by \`should()\` can re-query. Insert a \`then()\` that extracts text into a primitive, and later assertions operate on that yielded snapshot. This distinction explains why moving an assertion by one callback can change a flaky failure.

Keep DOM conditions in query chains when the page is expected to converge. Use \`then()\` for one-time transformations, side effects, and assertions on state that is already known to be ready. If a transformation must be retried, wrap it in a Cypress query pattern rather than building a manual recursive wait.

Also watch for commands enqueued inside array loops or promise callbacks that Cypress does not control in the expected order. The command queue is deterministic when used as designed, but mixing it with unreturned native promises can let the test finish before work is queued or make the visible command log misleading.

## Make the failure reproducible with controlled delays

Once the suspected race is known, use \`cy.intercept()\` to delay the exact response or return the boundary payload that triggers it. The test should pass for an allowed delay and fail clearly when the response never arrives or returns an error. This converts a timing rumor into a state-transition test.

Do not leave random latency injection in the main regression path. A fixed, purposeful delay tests loading behavior; a separate resilience or performance suite can sample broader distributions. The assertion should wait on state, so increasing the controlled delay within the allowed timeout does not require changing sleeps.

Repeat the focused test enough times locally or in a diagnostic CI job to show the repair removed the race. Repetition is evidence about stability, not a substitute for identifying the readiness signal. Preserve the failing seed, payload, viewport, and network fixture when any of those affect rendering.

## Watch for clock and animation manipulation

\`cy.clock()\` can freeze application timers that a component needs in order to render, remove a toast, debounce input, or complete an animation callback. A test may then wait four real seconds for a state whose application clock never advances. If the failure begins after installing fake time, identify every timer-driven transition and advance the clock deliberately.

Install the clock before the application schedules the timers you intend to control. Restore or isolate it between tests. Network requests continue on real time unless stubbed, so mixing a frozen browser clock with real responses can create states users never see.

Animations are better disabled through a documented test style or reduced-motion preference when their visual progression is outside scope. Do not globally remove transitions if the application depends on transition-end events for state changes. In that case, assert the component's stable end state and keep one focused test for the actual animation lifecycle.

## Treat CI-only slowness as an environment signal

If selectors and readiness are correct but only saturated runners exceed the budget, compare CPU, memory, browser process count, video recording, and server proximity. Parallel Cypress jobs can compete with the application container on the same machine. Increasing command timeouts may reduce noise while allowing a broken CI capacity plan to persist.

Run the focused spec on an isolated runner and compare command durations. If the isolated result is healthy, cap parallelism or allocate resources based on evidence. If both are slow, profile the product path. Keep timeout values consistent with the environment where release decisions are made, and document materially slower debug configurations separately.

## Frequently Asked Questions

### Why does Cypress keep retrying \`cy.get()\` but not my variable?

Cypress retries queued queries and linked assertions. A normal JavaScript variable is a snapshot assigned when its callback ran. Keep the condition inside a Cypress query chain or invoke a function that re-queries state.

### Is changing \`defaultCommandTimeout\` to 10000 a valid fix?

Only if most commands legitimately need that budget and the selector and readiness condition are already correct. For one slow operation, a local timeout or network-aware wait provides faster, clearer failures elsewhere.

### Why did \`cy.wait('@alias')\` time out even though DevTools shows the request?

The intercept may have been registered after the request, the method or URL matcher may differ, or another request may be assumed. Declare the intercept before the trigger and inspect the actual method, path, and query.

### Can \`force: true\` solve a covered-element timeout?

It can bypass Cypress's actionability checks, but that may test an impossible user action. Use it only when bypassing actionability is intentional. Otherwise wait for or fix the overlay, animation, disabled state, or scroll layout.

### Why does the test pass alone and fail in the suite?

Shared backend data, persistent feature flags, reused identifiers, viewport changes, or order-dependent setup are likely. Compare preconditions and network payloads, then make each test create and own its required state.
`,
};
