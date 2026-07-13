import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress “Element Is Detached from the DOM” Fix',
  description:
    'Fix Cypress element detached from the DOM failures by re-querying after reactive renders, ending action chains, and synchronizing on observable application state.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Cypress “Element Is Detached from the DOM” Fix

The button still looks identical after the click. React, Vue, Angular, or a design-system component has quietly removed the original node and inserted a replacement. Cypress is holding the old node as the command subject, so the next action targets something that is no longer in the document. The result is the familiar detached-element error, even though a human watching the run sees a button in the same place.

The durable fix is rarely a longer timeout. Cypress can retry queries to find a fresh node, but it does not replay state-changing commands. End the chain after an action, wait on an observable result of that action, then start a new query for the next interaction. Once you see the boundary between a query description and a yielded DOM snapshot, most detached failures become straightforward to diagnose.

## How a live node becomes a stale subject

Cypress commands form chains, but not every link has the same retry semantics. Queries such as \`cy.get()\`, \`.find()\`, and \`.eq()\` link together and can rerun from the top. Assertions are queries and trigger that retry. Actions such as \`.click()\` and \`.type()\` execute once after Cypress's actionability checks pass.

After an action, the yielded subject is the specific element used for that action. If application code replaces it, chaining another command from the same subject keeps pointing at the removed object.

| Timeline | Browser state | Cypress subject |
|---|---|---|
| Query finds Save button | Button A is attached | Button A |
| \`.click()\` dispatches event | Button A handles click | Button A |
| State update rerenders toolbar | Button A removed, Button B inserted | Still Button A |
| Chained \`.should()\` or second action runs | Button B is visible | Detached Button A |

The DOM replacement can be legitimate. Keyed list reconciliation, loading-state variants, conditional wrappers, portal movement, and a component changing from enabled to disabled can all replace nodes. The error says the test's subject is stale, not necessarily that the product is broken.

## End an action chain before the rerender

A common failing shape combines several actions because the fluent chain looks concise:

\`\`\`typescript
// Fragile when typing causes the component to replace the input
cy.get('[data-testid="customer-search"]')
  .clear()
  .type('Ada')
  .should('have.value', 'Ada');
\`\`\`

If \`.clear()\` triggers validation and rerendering, \`.type()\` receives the input that existed before the render. If \`.type()\` triggers a controlled-input replacement, the assertion receives the earlier node.

Break the sequence at each action that may cause replacement:

\`\`\`typescript
describe('customer search', () => {
  it('selects a result after the controlled input rerenders', () => {
    cy.visit('/orders/new');

    cy.get('[data-testid="customer-search"]').clear();
    cy.get('[data-testid="customer-search"]').type('Ada');

    cy.get('[data-testid="search-results"]')
      .should('be.visible')
      .find('[role="option"]')
      .contains('Ada Lovelace')
      .click();

    cy.get('[data-testid="selected-customer"]').should(
      'contain.text',
      'Ada Lovelace',
    );
  });
});
\`\`\`

Each \`cy.get()\` creates a fresh query chain. Cypress can rerun it until the current element is actionable. The search-results assertion observes an outcome of typing rather than pausing for an arbitrary duration.

Cypress documentation specifically recommends ending chains after actions when an application may rerender. This is not a universal ban on action chaining. Stable native inputs can safely support \`.focus().clear().type().blur()\`. Choose based on whether those actions can replace the node. In an unfamiliar reactive component, separate queries are the more diagnostic default.

## Alternate action and assertion around visible state

Detached failures often reveal missing synchronization. A test clicks Add, then immediately finds or acts on a row while the application is fetching data and replacing the list. Alternating commands and observable assertions makes the intended sequence explicit:

\`\`\`typescript
describe('cart quantity', () => {
  it('increments after the server-confirmed rerender', () => {
    cy.intercept('PATCH', '/api/cart/items/*').as('updateQuantity');
    cy.visit('/cart');

    cy.get('[data-testid="cart-line-SKU-7"]')
      .find('button')
      .contains('Increase')
      .click();

    cy.wait('@updateQuantity')
      .its('response.statusCode')
      .should('eq', 200);

    cy.get('[data-testid="cart-line-SKU-7"]')
      .find('[data-testid="quantity"]')
      .should('have.text', '2');

    cy.get('[data-testid="cart-line-SKU-7"]')
      .find('button')
      .contains('Increase')
      .click();

    cy.get('[data-testid="cart-line-SKU-7"]')
      .find('[data-testid="quantity"]')
      .should('have.text', '3');
  });
});
\`\`\`

There are two stabilizers. The network alias proves the first mutation reached a defined response, and every post-render interaction begins from a new row query. The final quantity assertion is still necessary because a 200 response does not prove the UI applied it.

Do not add a \`cy.wait(1000)\` after the click. A fixed delay is simultaneously too long when the update is fast and too short when CI is slow. It also tells you nothing about what failed to complete.

## Choose the signal that owns the rerender

Synchronization should track the event that makes the next operation valid. Network completion is one option, not a reflex. Some rerenders are local and send no request; some requests finish before animation or client-side reconciliation; some pages use WebSockets that \`cy.intercept()\` does not represent as ordinary request-response pairs.

| Rerender cause | Useful readiness signal | Weak substitute |
|---|---|---|
| REST save | Aliased response plus updated UI assertion | Global sleep |
| Debounced client filter | Results count or loading indicator disappearance | Waiting only for keystrokes |
| Route transition | URL and destination heading | Reusing source-page element |
| Modal portal mount | Dialog role becomes visible | Chaining from opener button |
| Virtualized scrolling | Row with stable business key appears | Holding a jQuery row reference |
| WebSocket update | Domain-specific badge or list change | Waiting for unrelated HTTP call |
| Framework hydration | Enabled control or known hydrated marker | Clicking server-rendered shell repeatedly |

A good signal is observable to the user or part of a stable service contract. Framework-internal flags and CSS implementation details age quickly. If the product has no observable distinction between "present but not ready" and "ready," consider adding an accessible disabled state or a stable test attribute as part of product testability.

## Re-query list items by identity after sorting

Reactive tables are prolific sources of detached elements because a sort, filter, pagination action, or background refresh can replace every row. Capturing a row in \`.then()\` and wrapping it later preserves the stale element:

\`\`\`typescript
// Incorrect for a table that replaces rows after refresh
cy.get('[data-testid="invoice-row"]').first().then(($row) => {
  cy.get('[data-testid="refresh-invoices"]').click();
  cy.wrap($row).find('button').contains('Open').click();
});
\`\`\`

\`.then()\` is not retried, and \`$row\` is a jQuery wrapper around a concrete node. \`cy.wrap()\` does not turn it back into a lazy selector.

Query with a business identifier after the update:

\`\`\`typescript
cy.intercept('GET', '/api/invoices*').as('loadInvoices');
cy.visit('/invoices');
cy.wait('@loadInvoices');

cy.get('[data-testid="invoice-row"]')
  .contains('td', 'INV-1042')
  .parents('[data-testid="invoice-row"]')
  .as('targetInvoice');

cy.get('[data-testid="refresh-invoices"]').click();
cy.wait('@loadInvoices');

cy.get('[data-testid="invoice-row"]')
  .contains('td', 'INV-1042')
  .parents('[data-testid="invoice-row"]')
  .within(() => {
    cy.contains('button', 'Open').click();
  });

cy.url().should('match', /\/invoices\/INV-1042$/);
\`\`\`

The alias in the first half does not solve staleness if reused after replacement. Cypress aliases of DOM elements can have nuanced re-query behavior based on how they were defined, but a clear new query by invoice ID communicates the intention and avoids depending on stored subject behavior. Use aliases confidently for network routes, stubs, and values whose lifecycle you understand; do not treat a DOM alias as permanent identity.

## Put assertions before actions when readiness is ambiguous

Actionability checks confirm that an element is attached, visible, not disabled, not covered, and otherwise interactable at the moment Cypress acts. They cannot know that application event listeners, hydration, or data dependencies are ready unless those states affect actionability.

An explicit assertion can bridge that semantic gap:

\`\`\`typescript
cy.get('[data-testid="shipping-methods"]')
  .should('have.attr', 'data-state', 'ready');

cy.get('[data-testid="shipping-methods"]')
  .find('input[type="radio"][value="express"]')
  .check();

cy.get('[data-testid="shipping-summary"]').should(
  'contain.text',
  'Express delivery',
);
\`\`\`

The first chain retries until the component declares readiness. The next chain reacquires the radio. If the readiness attribute is merely a testing hook with no relationship to real behavior, it can lie. Prefer a user-facing equivalent such as an enabled control, completed skeleton, or populated choices.

Do not use \`force: true\` as a detached-node fix. Forcing an action bypasses some actionability checks; it cannot reattach a removed element. It may also hide a genuine overlay or disabled-state defect.

## Use should(callback) for derived values, not then()

Cypress retries a \`.should(callback)\` assertion together with the linked queries. A \`.then(callback)\` runs once after the preceding command resolves. This matters when text must be transformed before assertion.

\`\`\`typescript
describe('live total', () => {
  it('waits until the recalculated amount is numeric and positive', () => {
    cy.visit('/quote');
    cy.get('[name="quantity"]').clear();
    cy.get('[name="quantity"]').type('3');

    cy.get('[data-testid="quote-total"]').should(($total) => {
      const normalized = $total.text().replace(/[^0-9.]/g, '');
      const amount = Number(normalized);

      expect(amount, 'parsed quote total').to.be.greaterThan(0);
      expect(amount, 'three-unit total').to.equal(74.97);
    });
  });
});
\`\`\`

If the first render contains a dash or loading text, the callback throws an assertion error. Cypress restarts the linked \`cy.get()\` query and supplies the currently attached total element to the next callback attempt. A \`.then()\` would parse one snapshot and could not re-query it.

Keep \`.should()\` callbacks free of commands and side effects. Cypress may invoke the callback many times. Perform synchronous derivation and assertions only. If you need a command after the condition passes, start it on the following chain.

## Detached errors caused by application defects

Not every error should be "fixed" in the test. Rapid replacement can make a product control impossible for a user to activate, erase focus, discard typed input, or attach duplicate event handlers. Slow the test in interactive mode, inspect component keys, and watch whether the replacement is expected.

Product defects commonly exposed by detachment include:

- A submit button is replaced between pointer down and click.
- Controlled input state lags and overwrites the latest keystroke.
- A list uses unstable array indexes as keys, moving state to the wrong row.
- A loading refresh replaces the focused control on every poll.
- Hydration swaps the page after the user can already interact with it.
- Two requests race, and an older response renders over the newer result.

If a real user can hit the race, preserve a failing reproduction and fix the application. Re-querying may make automation pass while the usability problem remains. A senior test review asks whether the original element was expected to survive the interaction and whether replacement changes user-observable state.

## Why increasing defaultCommandTimeout rarely cures it

Cypress waits for actionability before an action. Once the action runs and the subject becomes stale, extending the global command timeout does not convert that subject into a fresh query. A timeout increase helps only when the query has not yet found a ready element or an assertion is still retrying against a query chain.

Use a local timeout for a genuinely slow, observable transition:

\`\`\`typescript
cy.get('[data-testid="reconciliation-complete"]', { timeout: 20_000 }).should(
  'have.text',
  'Completed',
);
\`\`\`

Avoid raising \`defaultCommandTimeout\` across the suite to accommodate one batch process. It lengthens deterministic failures and makes the actual service expectation invisible. More time cannot repair an action followed by a stale subject.

## Diagnose the precise replacement boundary

The Cypress command log and runner snapshots are the starting point. Identify the last action before detachment and ask what it triggers. Instrument the application response, not Cypress internals.

| Question | Evidence to collect |
|---|---|
| Did a request start? | Network alias and request payload |
| Did the route change? | URL assertion and router logs |
| Was the same logical item rerendered? | Stable data ID before and after |
| Did a loading state replace the control? | DOM snapshot or video around the action |
| Was the node captured in \`.then()\`? | Search test for jQuery variables and \`cy.wrap\` |
| Are several actions chained? | Split them and reacquire between actions |
| Does the issue reproduce for a user? | Interactive slow execution and focus behavior |

Add temporary application logging or a \`MutationObserver\` only for diagnosis, then remove it. Tests should synchronize on domain behavior, not permanently monitor DOM removals.

The [Cypress best practices guide](/blog/cypress-best-practices-2026-guide) covers selector and state-control conventions that prevent many stale chains. For deterministic network boundaries, consult the [Cypress intercept network stubbing reference](/blog/cypress-intercept-network-stubbing-reference).

## Fix patterns by component type

Different widgets have characteristic replacement moments:

| Component | Typical stale chain | Stable pattern |
|---|---|---|
| Autocomplete | Type, then click an option from same subject chain | Type, assert listbox, query option anew |
| Inline editor | Clear, type, blur while validation rerenders input | Re-query between actions or use one stable native chain |
| Data grid | Store row, sort, reuse row | Locate by business key after sort |
| Modal | Click opener, chain into yielded button | Query dialog by role after click |
| Toast-triggering save | Click Save, assert on Save subject | Query toast or persisted field separately |
| Cascading select | Choose country, immediately use stale city select | Wait for city options response and re-query select |
| Virtual list | Hold first visible item during scroll | Query desired item after scroll settles |

These patterns are more maintainable than a custom "retry click" command. Repeating clicks can double-submit, toggle state twice, or conceal an application that ignored the first event.

## Review a proposed detached-element fix

A code review should reject fixes that merely silence the message. Check four things:

1. The test identifies the action that permits a rerender.
2. The next chain starts from \`cy\` and describes the current desired element.
3. A meaningful readiness condition replaces any fixed delay.
4. The assertions still detect a broken update rather than only avoiding staleness.

If the fix adds \`force: true\`, a recursive click, or a suite-wide timeout, ask for evidence that those behaviors match the user journey. If it changes a stored row reference into a query by immutable order ID, it is likely moving in the right direction.

## Reproduce the replacement in a component test

When a full E2E route contains too many asynchronous actors, reduce the suspected widget to a Cypress component test. Mount it with a controllable callback that resolves after the action, then render the loading and settled variants exactly as production does. The smaller test can prove whether the component keeps or replaces the actionable node.

Use the component test to answer focused questions: Does typing one character replace the input? Is focus preserved after validation? Does a submitted button remain in the document while its label changes? Does a keyed list retain the row whose business ID is unchanged? Inspecting those behaviors is more useful than repeatedly modifying the end-to-end timeout.

Do not keep a component-only workaround if the page integration introduces the replacement. Providers, routers, portals, and data-grid wrappers can change identity above the component. Once the replacement boundary is known, retain the smallest regression test that catches the component defect and an E2E assertion for the user-visible workflow.

A stable component may still yield a detached error when an ancestor conditionally unmounts it. In that case, the action that changes the ancestor is the chain boundary. Re-query from the document or the newly mounted container, not from any descendant yielded before the condition changed.

## Frequently Asked Questions

### Why does Cypress say an element is detached when I can see it?

The visible element is often a replacement node with the same appearance. Cypress's current subject points to the earlier node that the framework removed during a render.

### Does cy.get('@alias') always re-query a detached DOM element?

Alias behavior depends on how the alias was created and used. For clarity after a known rerender, start a new query using a stable selector and business identity instead of treating an aliased element as permanent.

### Will force: true fix a detached element?

No. It can bypass selected actionability checks, but it cannot make a removed node part of the document. It may also hide overlays or disabled controls that users encounter.

### Should I wait for the network call or the UI update?

Often both. The response establishes the backend boundary, while a fresh UI assertion proves the application rendered it. For purely local updates, use the user-visible state that makes the next action valid.

### Is chaining clear().type().blur() always unsafe?

No. Cypress supports sequential actions on a stable element. Split and re-query when any action can cause the component to replace that element, which is common with controlled or validated inputs.
`,
};
