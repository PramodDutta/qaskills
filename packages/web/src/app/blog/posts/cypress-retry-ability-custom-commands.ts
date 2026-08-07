import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Retry Ability Custom Commands That Preserve Queries Without Hiding Failures',
  description: 'Master cypress retry ability custom commands with retriable queries, safe assertions, typed APIs, and diagnostics that eliminate stale-subject test flakes.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Cypress Retry Ability Custom Commands That Preserve Queries Without Hiding Failures

Cypress retry ability in custom commands depends on what the abstraction actually does. Use a custom command when you want to compose existing Cypress commands or perform a one-time action. Use a custom query when you are synchronously and idempotently reading application state and need Cypress to invoke that lookup repeatedly until downstream assertions pass or the timeout expires.

The dangerous pattern is a custom command that captures a jQuery element in \`.then()\`, performs a one-time conditional check, and returns that snapshot. It looks like a locator helper, but it breaks the query chain at exactly the point where a reactive interface needs time to update. Preserve Cypress queries, keep side effects out of retry callbacks, and let an assertion describe the condition that eventually must become true.

This guide shows the command queue in concrete terms, builds typed commands and queries, tests an asynchronously rendered order table, and diagnoses a realistic flake where an element exists but never reaches the expected state. The goal is not to make every helper retriable. It is to give each abstraction the correct execution semantics.

## Classify every helper as a query, assertion, or action

Cypress commands are queued and later executed. Queries can link together and Cypress retries the query chain when an attached assertion has not passed. Non-query commands execute once. That distinction should drive API design before implementation.

| Helper intent | Correct shape | Retried? | Example |
|---|---|---:|---|
| Locate a row in changing DOM | Custom query or built-in query composition | Yes | Find order by stable ID |
| Assert an eventual state | \`.should()\` after a query | Yes, with its query chain | Status eventually becomes “Paid” |
| Click a control | Custom command/action | Once after actionability checks | Submit refund |
| Seed data through API | Custom command/action | Once | Create an order fixture |
| Read external file | Command | Once per queued command | Load fixture content |
| Compute pure selector text | Plain function | Normal JavaScript call | Escape a known identifier |

“Custom command” is often used as a generic phrase, but Cypress has a specific custom-query API for retriable lookups. If the helper must be asynchronous or should run only once, official guidance points to a command. If it returns a synchronous, idempotent lookup that can safely run many times, it fits a query.

Begin with the simplest option: a plain function returning a selector plus built-in \`cy.get()\`. This retains Cypress's established query behavior without creating a global command.

\`\`\`ts
function orderSelector(orderId: string): string {
  return \`[data-cy="order"][data-order-id="\${orderId}"]\`;
}

it('shows a newly created order', () => {
  const orderId = 'order-1042';

  cy.visit('/orders');
  cy.get(orderSelector(orderId)).should('be.visible');
});
\`\`\`

The selector function runs immediately in JavaScript. \`cy.get()\` is the retriable query. This is often more transparent than a project-wide \`cy.getOrder()\` abstraction.

## Understand where Cypress restarts a chain

Suppose the application renders a table, then updates a row after a background response. This chain queries the table, finds the row, and asserts its text:

\`\`\`ts
cy.get('[data-cy="orders-table"]')
  .find('[data-order-id="order-1042"]')
  .should('contain.text', 'Paid');
\`\`\`

If the assertion fails, Cypress retries the linked queries from the top until the assertion passes or the applicable timeout expires. It does not merely repeat string comparison against a permanently frozen element.

Now compare a snapshot introduced with \`.then()\`:

\`\`\`ts
cy.get('[data-order-id="order-1042"]').then(($row) => {
  const status = $row.find('[data-cy="status"]').text();
  expect(status).to.equal('Paid');
});
\`\`\`

The callback passed to \`.then()\` is not retried like a \`.should()\` callback. If the first observed text is “Processing,” this test fails even when the DOM changes to “Paid” a moment later. Replace it with a linked query and assertion:

\`\`\`ts
cy.get('[data-order-id="order-1042"]')
  .find('[data-cy="status"]')
  .should('have.text', 'Paid');
\`\`\`

The difference is not cosmetic. \`.then()\` is appropriate for transforming a settled subject, scheduling more commands based on a known result, or accessing a yielded value once. \`.should()\` expresses a condition that may become true.

| Callback | Cypress may invoke it repeatedly? | Safe contents | Avoid |
|---|---:|---|---|
| \`.should('matcher', value)\` | Yes | Declarative assertion | Side effects |
| \`.should(($el) => { ... })\` | Yes | Synchronous assertions and pure reads | Clicks, API calls, counters |
| \`.then(($el) => { ... })\` | No automatic callback retry | One-time transformation or command scheduling | Eventual-state assertion |
| Custom-query inner function | Yes | Synchronous idempotent lookup | Promises or DOM mutation |

## Compose existing Cypress commands with a custom command

If a helper is a readable shortcut over existing commands, use \`Cypress.Commands.add\`. Return the chain so its yielded subject can continue.

\`\`\`ts
// cypress/support/commands.ts
Cypress.Commands.add('getByData', (value: string) => {
  return cy.get(\`[data-cy="\${value}"]\`);
});
\`\`\`

Add its TypeScript declaration in support code included by the Cypress TypeScript configuration:

\`\`\`ts
declare global {
  namespace Cypress {
    interface Chainable {
      getByData(value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};
\`\`\`

Now downstream built-in queries and assertions retain their normal behavior:

\`\`\`ts
cy.getByData('checkout-summary')
  .find('[data-cy="total"]')
  .should('have.text', '$75.00');
\`\`\`

The custom command is useful because it standardizes a selector convention, not because it creates a new waiting mechanism. Its returned \`cy.get()\` already provides retry ability. Keep wrappers shallow enough that a failing command log still tells the engineer which element Cypress was searching for.

What people get wrong is putting a final assertion inside every locator command:

\`\`\`ts
Cypress.Commands.add('getByData', (value: string) => {
  return cy.get(\`[data-cy="\${value}"]\`).should('be.visible');
});
\`\`\`

This forces visibility on callers that may legitimately assert nonexistence, hidden state, disabled transitions, or element count. Locator helpers should usually yield the subject and let each test state its outcome. An implicit existence assertion is part of many built-in query behaviors, but adding unrelated visibility policy makes a reusable API less truthful.

## Create a custom query for synchronous application lookup

Use \`Cypress.Commands.addQuery\` when built-in composition cannot express the lookup cleanly and the implementation can satisfy three rules: synchronous, retriable, and idempotent. The outer function processes arguments once. It returns an inner function that Cypress can call repeatedly.

The following query finds an order element by a stable data attribute:

\`\`\`ts
// cypress/support/queries.ts
Cypress.Commands.addQuery('orderById', function orderById(orderId: string) {
  return () => {
    return Cypress.$(
      \`[data-cy="order"][data-order-id="\${orderId}"]\`,
    );
  };
});
\`\`\`

Declare the yielded jQuery collection:

\`\`\`ts
declare global {
  namespace Cypress {
    interface Chainable {
      orderById(orderId: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};
\`\`\`

The test reads naturally and lets the downstream assertion control success:

\`\`\`ts
cy.orderById('order-1042')
  .find('[data-cy="status"]')
  .should('have.text', 'Paid');
\`\`\`

The inner function must not call \`cy.get()\`, return a promise, click, log into the application, increment a database counter, or alter the DOM. Cypress may invoke it many times. It uses the synchronous \`Cypress.$\` lookup and returns the current collection.

A custom query is not automatically superior to a command wrapper. It creates a lower-level API that future maintainers must understand. Use it when the domain lookup materially improves tests, such as walking a canvas-backed model, selecting a row through application-owned metadata, or reproducing a repeated synchronous search that built-in queries cannot compose clearly.

## Keep side effects outside retried callbacks

A \`.should(callback)\` callback can run repeatedly. Any side effect inside it can happen more than once. The bug may be invisible locally when the first attempt passes and destructive in CI when rendering is slower.

This callback is unsafe:

\`\`\`ts
let auditCount = 0;

cy.getByData('status').should(($status) => {
  auditCount += 1;
  expect($status.text()).to.equal('Ready');
});
\`\`\`

The final value of \`auditCount\` represents retry attempts, not a business event. Replace incidental counters with an assertion-only callback:

\`\`\`ts
cy.getByData('status').should(($status) => {
  const normalized = $status.text().trim().toLowerCase();
  expect(normalized).to.equal('ready');
});
\`\`\`

If the workflow requires a click after readiness, chain it after the passing assertion:

\`\`\`ts
cy.getByData('status').should('have.text', 'Ready');
cy.getByData('submit-order').click();
\`\`\`

The click executes once after Cypress establishes the precondition. Cypress's built-in actionability checks still apply to \`.click()\`; the action itself is not repeatedly replayed as though it were a query assertion.

Side effects include more than network writes. They include pushing into arrays, taking external screenshots, changing clocks, registering intercepts, and mutating fixture objects. A retried callback should be safe to evaluate any number of times.

## Wait on observable state, not fixed delays

Retry ability does not excuse unclear synchronization. Cypress can wait for a DOM condition, but the test should identify which condition marks the business transition.

For a server-driven status update, register an intercept before the action, wait for the request if it is part of the contract, then assert the rendered outcome:

\`\`\`ts
cy.intercept('POST', '/api/orders/*/capture').as('capturePayment');

cy.getByData('capture-payment').click();
cy.wait('@capturePayment')
  .its('response.statusCode')
  .should('eq', 200);

cy.getByData('payment-status').should('have.text', 'Paid');
\`\`\`

The network wait and DOM assertion prove different things. The response confirms the request completed successfully. The text confirms the UI processed the result. Keep both when both are meaningful to the user journey.

Avoid \`cy.wait(2000)\` as a repair for a broken custom helper. A fixed delay always waits the full duration when the app is fast and may still be too short when the environment is slow. It also hides whether the test is waiting for a request, render, animation, or background job.

| Symptom | Weak repair | Observable replacement |
|---|---|---|
| Row appears after fetch | Fixed sleep | Query row and assert visibility |
| Button enables after validation | Repeat click | Assert enabled, then click once |
| Toast follows API response | Arbitrary delay | Wait on request alias, then query toast |
| Background job completes | Huge global timeout | Poll a supported UI/status contract with bounded timeout |

Timeouts define the maximum patience, not the expected delay. Increase a timeout only when the product's legitimate service-level behavior requires it and the suite can explain the longer boundary.

## Diagnose a stale-subject failure in a dynamic list

Consider an order row that React replaces after receiving an update. A helper grabs the original element, stores it, and later asserts on that detached snapshot:

\`\`\`ts
Cypress.Commands.add('cachedOrder', (orderId: string) => {
  return cy.get(\`[data-order-id="\${orderId}"]\`).then(($row) => $row);
});

cy.cachedOrder('order-1042')
  .find('[data-cy="status"]')
  .should('have.text', 'Paid');
\`\`\`

If the framework replaces the row node, continuing from the old subject may fail with a detached-element message or keep reading old text. The diagnosis is to inspect the command log and DOM snapshots around the rerender, then re-query from a stable root.

\`\`\`ts
cy.getByData('orders-table')
  .find('[data-order-id="order-1042"]')
  .find('[data-cy="status"]')
  .should('have.text', 'Paid');
\`\`\`

Do not alias a DOM element early and expect it to become a live locator. Cypress aliases have query-aware behavior in documented cases, but a raw jQuery object captured and returned from one-time code remains a concrete subject. Favor a fresh query for frequently replaced components.

Use this failure triage:

1. Identify the last command that yielded the subject.
2. Determine whether it is a query, assertion, or one-time command.
3. Look for \`.then()\`, raw jQuery storage, or DOM mutation before failure.
4. Confirm the selector identifies the new element after rerender.
5. Move assertions onto a linked query chain.
6. Keep actions after the state assertion, not inside it.

The goal is not “retry harder.” It is to re-establish the subject from current application state.

## Design domain commands that expose useful failures

A domain command can combine actions when the sequence is stable and meaningful. For example, a command that fills a checkout form can reduce repetition:

\`\`\`ts
type CheckoutDetails = {
  email: string;
  postalCode: string;
};

Cypress.Commands.add('fillCheckout', (details: CheckoutDetails) => {
  cy.getByData('checkout-email').clear().type(details.email);
  cy.getByData('postal-code').clear().type(details.postalCode);
});
\`\`\`

This is a one-time action command. It should not be a custom query. Its type declaration can return \`Chainable<void>\` because callers should assert the resulting UI separately.

Avoid mega-commands such as \`cy.completePurchase()\` that seed a cart, visit pages, fill forms, intercept requests, click payment, and assert success. When they fail, the command log points to a broad business label while hiding the relevant selector and state. Prefer small domain steps with explicit assertions in the test.

| Command size | Review quality | Failure diagnosis | Reuse risk |
|---|---|---|---|
| Selector wrapper | High when convention is stable | Direct | Low |
| One form or API operation | Good | Usually localized | Moderate |
| Whole user journey | Poor | Hidden middle step | High |
| Custom query for domain lookup | High if semantics are documented | Direct assertion context | Moderate |

Commands should not contain arbitrary waits or catch failures to “stabilize” tests. Cypress failures carry selector, timeout, command log, screenshot, and video context. Swallowing one usually produces a less informative failure later.

## Test the custom abstraction itself

Support code is production code for the test suite. A faulty query can make hundreds of tests pass or fail for the wrong reason. Give important abstractions a small specification page or component fixture with controlled delayed rendering.

An application route can add a row after a known user action. The test should prove the custom query finds the later element, yields the correct subject, and fails normally for an absent target. Avoid testing private Cypress internals.

\`\`\`ts
describe('orderById query', () => {
  beforeEach(() => {
    cy.visit('/test-pages/delayed-orders');
  });

  it('finds a row rendered after the trigger', () => {
    cy.getByData('render-order').click();

    cy.orderById('delayed-7')
      .should('be.visible')
      .and('contain.text', 'delayed-7');
  });

  it('can be followed by a descendant query', () => {
    cy.getByData('render-order').click();

    cy.orderById('delayed-7')
      .find('[data-cy="status"]')
      .should('have.text', 'Queued');
  });
});
\`\`\`

Keep this fixture deterministic. It exists to verify query semantics, not to test a real backend. The end-to-end suite separately covers order behavior with network and database boundaries.

## Make retries visible in CI without masking defects

Cypress test retries, command retry ability, and CI job reruns are different mechanisms. Command retry ability waits within one test for an eventual condition. Configured test retries rerun a failed test attempt. A CI rerun launches a broader execution again. Do not use the broad mechanism to compensate for a stale subject inside a helper.

When a test flakes, preserve screenshots, videos, command logs, and network evidence from the failed attempt. Look for whether the element never appeared, appeared with wrong content, was detached, or was covered when an action ran. Each points to a different fix.

Teams comparing Cypress's in-browser command model with other JavaScript tools can use the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) to evaluate tradeoffs. If the organization also writes Playwright tests, keep its locator semantics separate; [Playwright locator practices](/blog/playwright-best-practices-locators-2026) explain why locator objects and Cypress command chains should not be treated as interchangeable APIs.

What people get wrong is increasing test retry counts until a stale-subject test becomes statistically green. That preserves the race and increases pipeline time. First repair the query boundary. Use test retries as a bounded signal for genuinely intermittent system behavior, then track and eliminate the underlying source.

## A decision checklist before adding support code

Before committing a helper, answer these questions:

| Question | If yes | If no |
|---|---|---|
| Is it only calculating a string or value? | Use a plain function | Continue |
| Is it composing existing \`cy\` commands? | Use a custom command | Continue |
| Is it a synchronous, repeatable state lookup? | Consider a custom query | Keep it a command |
| Can repeated execution change anything? | It must not be a query | Retry is safe in principle |
| Will callers need different assertions? | Yield subject without forced assertion | A focused assertion helper may be acceptable |
| Does the command log remain diagnostic? | Keep abstraction | Split the helper if details disappear |

The best support API is small, typed, and unsurprising. It does not promise that Cypress will retry actions. It does not turn a jQuery snapshot into a live locator. It gives the runner a fresh, idempotent way to observe state, then lets tests state what that observation must eventually prove.

## Set timeouts at the query boundary that owns the wait

An eventual condition sometimes has a legitimate longer service window, such as an export row appearing after a background job. Put the timeout on the query that waits for that condition, rather than raising the global default for every command in the suite.

\`\`\`ts
cy.get('[data-cy="exports-table"]', { timeout: 30_000 })
  .find('[data-export-id="export-73"]')
  .should('contain.text', 'Ready');
\`\`\`

The number should come from an agreed test-environment expectation, not trial and error. If the job is allowed to take thirty seconds, the failure message now identifies the precise boundary. A global increase would also make misspelled selectors and genuinely absent buttons wait longer.

Custom commands that accept timeout options should pass supported options to the built-in query rather than implementing polling loops:

\`\`\`ts
type DataQueryOptions = Partial<Cypress.Timeoutable & Cypress.Loggable>;

Cypress.Commands.add(
  'getByData',
  (value: string, options: DataQueryOptions = {}) => {
    return cy.get(\`[data-cy="\${value}"]\`, options);
  },
);
\`\`\`

Update the declaration to include the optional argument. Keep the option surface narrow. Passing every possible command option through a domain API makes the wrapper harder to understand and can promise behavior the inner command does not support.

| Timeout location | Effect | Appropriate use |
|---|---|---|
| Specific query option | Extends one expected wait | Slow documented transition |
| Suite/test configuration | Applies to a bounded group | Consistently slower environment boundary |
| Global default | Affects broad command behavior | Rare, environment-wide policy |
| Fixed \`cy.wait(number)\` | Sleeps regardless of readiness | Almost never for state synchronization |

When the timeout expires, do not immediately double it. Check whether the query is retryable, the selector survives rerender, the triggering action succeeded, and the expected state is possible. Timeouts reveal missing synchronization contracts; they should not become a blanket flake budget.

## Review custom commands as a public testing API

A large Cypress suite accumulates support commands quickly. Treat their names, subjects, return types, side effects, and assertions as an API. A small review template prevents ambiguous helpers from spreading.

For every addition, document whether it is a parent command, a child command, or a dual command if that distinction is relevant. State what it yields. State whether it performs actions. If it is a custom query, state explicitly that its inner function is synchronous and idempotent. TypeScript declarations should agree with runtime behavior.

Version support code with the application tests. A command that hard-codes a CSS class owned by a component library silently couples hundreds of tests to styling. Prefer application-owned \`data-cy\` attributes or accessible user-facing queries when they express stable intent. The choice should reflect what the test is proving, not a universal selector hierarchy.

Periodically search for commands used by only one test. Inline them when the abstraction obscures more than it saves. Search for commands containing \`.then()\` followed by eventual-state expectations, arbitrary numeric waits, or assertions unrelated to their names. Those are high-yield review targets.

An AI coding agent can help inventory support code, but instruct it to preserve Cypress queue semantics. A text-only refactor that converts chains into \`async\` functions or stores yielded elements in ordinary variables can look cleaner while breaking execution. Require focused runs against a delayed fixture before accepting changes to query helpers.

## Frequently Asked Questions

### Are all Cypress custom commands automatically retried?

No. A custom command follows the behavior of the Cypress commands and callbacks it queues; merely registering it with \`Cypress.Commands.add\` does not make arbitrary JavaScript repeat. A returned built-in query such as \`cy.get()\` participates in normal query retry behavior. A \`.then()\` callback is not repeatedly evaluated like a \`.should()\` callback. For a new synchronous, idempotent lookup that Cypress should invoke again, use the documented custom-query API. Keep actions and asynchronous operations as one-time commands.

### When should I use addQuery instead of Commands.add?

Use \`Cypress.Commands.addQuery\` when the helper reads current application state synchronously, returns a subject, can be invoked repeatedly, and causes no side effects. Use \`Cypress.Commands.add\` when composing existing Cypress commands, making requests, typing, clicking, seeding data, or doing asynchronous work. Most convenience wrappers belong in commands because built-in queries already supply the waiting behavior. A custom query is valuable for a genuine domain-specific lookup, but its inner function must remain synchronous and idempotent throughout future maintenance.

### Why does my assertion pass with should but fail inside then?

\`.should()\` expresses an assertion that Cypress may retry together with linked queries until it passes or times out. \`.then()\` runs its callback once after the previous command yields. If the application initially shows “Processing” and later renders “Paid,” an expectation inside \`.then()\` sees only the first settled subject at that moment. Put the eventual assertion in \`.should()\` and ensure the preceding chain can re-query current DOM state. Reserve \`.then()\` for one-time transformations or scheduling commands after a value is ready.

### Can I put clicks or API calls inside a should callback?

Do not do so. Cypress may execute a \`.should(callback)\` body multiple times, which can repeat the click or request and corrupt the scenario. Keep the callback to synchronous reads and assertions. First assert the precondition, such as a visible enabled button, then chain or issue the action after the assertion passes. The action executes once, with Cypress's own actionability checks. The same rule applies to custom-query inner functions: they must not mutate DOM, send requests, or update counters because retries are expected behavior.
`,
};
