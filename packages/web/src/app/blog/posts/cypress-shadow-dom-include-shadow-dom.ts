import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Test Shadow DOM with Cypress includeShadowDom",
  description:
    "Test Shadow DOM with Cypress includeShadowDom using reliable queries, nested web-component examples, scoped configuration, and debugging tactics for open roots.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Test Shadow DOM with Cypress includeShadowDom

Clicking “Pay now” looks ordinary to a customer. In the DOM, the button may sit inside \`checkout-shell\`, then \`payment-panel\`, then a third-party \`secure-button\`, with an open shadow root at every boundary. A document-level CSS query stops at the first boundary unless the test runner knows to traverse those roots. Cypress provides that traversal through the \`includeShadowDom\` option on query commands and as a project configuration value.

This tutorial builds a realistic nested component fixture, tests it with both scoped and global traversal, and deals with the failures that appear once shadow-aware matching broadens the search space. The techniques apply to open shadow roots. Closed roots deliberately hide their internals, and \`includeShadowDom\` does not turn them open.

## See what the browser actually exposes

A shadow host is a regular element in the light DOM. Calling \`attachShadow({ mode: 'open' })\` gives that host a \`shadowRoot\` property. Elements placed inside the root are not normal descendants for document CSS selection, even though browser developer tools display them beneath the host.

Consider an order page composed from three custom elements. The test needs to select a delivery option inside the first root, read a total inside the second, and click a confirmation button inside the third. Each operation crosses at least one encapsulation boundary.

| Layer | Host element | Shadow content used by the test | Stable user-facing signal |
| --- | --- | --- | --- |
| Checkout shell | \`checkout-shell\` | Section heading and \`delivery-picker\` | “Delivery” heading |
| Delivery picker | \`delivery-picker\` | Radio inputs for shipping speed | Accessible option label |
| Order summary | \`order-summary\` | Total and \`confirm-order\` | Currency text and button name |
| Confirmation control | \`confirm-order\` | Native button | “Place order” role and name |

The root mode is an architectural decision made by the component. Open mode permits JavaScript access through \`element.shadowRoot\`; closed mode returns \`null\`. Test code should not infer that a root is open merely because DevTools can display it. Inspect the component source or evaluate the host’s \`shadowRoot\` explicitly.

## Build a nested fixture worth testing

The following browser code defines the components and records a submitted order. It uses only standard Custom Elements and Shadow DOM APIs, so it can live in a static fixture page or the application itself. Labels are deliberately associated with native radios, and the final native button carries the action name.

\`\`\`html
<checkout-shell></checkout-shell>
<script type="module">
  customElements.define(
    'delivery-picker',
    class extends HTMLElement {
      connectedCallback() {
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = \`
          <fieldset>
            <legend>Shipping speed</legend>
            <label><input type="radio" name="speed" value="standard" checked> Standard</label>
            <label><input type="radio" name="speed" value="express"> Express</label>
          </fieldset>
        \`;
      }
    },
  );

  customElements.define(
    'confirm-order',
    class extends HTMLElement {
      connectedCallback() {
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = '<button type="button">Place order</button>';
        root.querySelector('button').addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('confirm', { bubbles: true, composed: true }));
        });
      }
    },
  );

  customElements.define(
    'order-summary',
    class extends HTMLElement {
      connectedCallback() {
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = '<p>Total <strong>$48.00</strong></p><confirm-order></confirm-order>';
      }
    },
  );

  customElements.define(
    'checkout-shell',
    class extends HTMLElement {
      connectedCallback() {
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = '<h1>Delivery</h1><delivery-picker></delivery-picker><order-summary></order-summary>';
        root.addEventListener('confirm', () => this.setAttribute('data-state', 'submitted'));
      }
    },
  );
</script>
\`\`\`

Within this fixture, a native \`document.querySelector('button')\` returns \`null\`. That result is correct. Native document querying does not recursively enter shadow roots. Cypress adds cross-root traversal to supported query commands when requested.

There is also an event detail worth preserving in production components: \`bubbles: true\` moves the event up within its tree, while \`composed: true\` lets it cross a shadow boundary. A test that clicks correctly but never observes host state may be exposing an event composition defect, not a Cypress locator defect.

## Turn traversal on for one query chain

The narrowest adoption uses the command option. \`cy.get(selector, { includeShadowDom: true })\` searches through open roots. \`cy.contains()\` supports the same option. This is valuable when only one part of the application uses web components, because ordinary tests retain normal query boundaries.

\`\`\`typescript
describe('nested checkout components', () => {
  beforeEach(() => {
    cy.visit('/fixtures/shadow-checkout.html');
  });

  it('chooses express shipping and submits the order', () => {
    cy.get('input[value="express"]', { includeShadowDom: true })
      .check()
      .should('be.checked');

    cy.contains('strong', '$48.00', { includeShadowDom: true }).should('be.visible');

    cy.contains('button', 'Place order', { includeShadowDom: true }).click();

    cy.get('checkout-shell').should('have.attr', 'data-state', 'submitted');
  });
});
\`\`\`

The final assertion intentionally targets the light-DOM host, not an implementation node. It verifies the outcome exposed by the component after a composed event. This balance is useful: traverse internals to exercise an actual user control, then assert a durable public result such as URL, request, application state, or host attribute.

Query-level traversal is easy to audit in code review. A reader sees where a boundary is crossed. It also prevents a selector written for the document from unexpectedly matching an element deep inside an unrelated widget. The cost is repetition when most application controls live in shadow trees.

## Enable includeShadowDom across the Cypress project

For a component-heavy application, repeating the option on every \`get\` and \`contains\` call becomes clutter. Cypress configuration supports a global \`includeShadowDom\` boolean, whose default is \`false\`. Put it at the top level of the configuration object.

\`\`\`typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  includeShadowDom: true,
  e2e: {
    baseUrl: 'http://localhost:4173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
  },
});
\`\`\`

Now the test can use \`cy.get('input[value="express"]')\` and Cypress will traverse open roots while resolving the query. The setting affects query commands that honor the option, including \`get\` and \`contains\`. It does not rewrite browser standards, expose a closed root, or make XPath pierce arbitrary boundaries.

Global traversal changes selector scope. Suppose the page has a light-DOM “Save” button and three web components with their own “Save” buttons. A broad \`cy.contains('button', 'Save')\` may now yield multiple candidates or select a button the author did not intend. Once enabled globally, strengthen selectors with semantic context, unique test attributes, or explicit hosts.

| Configuration approach | Best fit | Main advantage | Main risk |
| --- | --- | --- | --- |
| Per-command option | A few isolated web components | Boundary crossing is visible at call site | Repetition in component-dense suites |
| Global \`includeShadowDom: true\` | Most workflows cross open roots | Concise, consistent query behavior | Broad selectors discover more matches |
| Explicit \`.shadow()\` chains | Root hierarchy is part of the test intent | Shows each host boundary | Couples test to component nesting |
| Host-level black-box assertion | Component exposes accessible behavior externally | Lowest structural coupling | Cannot diagnose or exercise every internal control |

Choose one dominant style per test area. Mixing all approaches randomly makes failures harder to read because the same selector can imply different scopes in adjacent specs.

## Use shadow() when the host path carries meaning

Cypress also exposes a \`.shadow()\` query. It must be chained from a command yielding a shadow host, and it yields the attached open shadow root. A sequence of \`get().shadow().find()\` calls documents the hierarchy and limits matches to a chosen component instance.

\`\`\`typescript
it('targets the confirmation control in the second summary', () => {
  cy.visit('/orders/review');

  cy.get('checkout-shell')
    .shadow()
    .find('order-summary')
    .eq(1)
    .shadow()
    .find('confirm-order')
    .shadow()
    .find('button')
    .should('have.text', 'Place order')
    .click('top');
});
\`\`\`

This example uses \`click('top')\` because Cypress documents a Chrome ambiguity that can cause a click inside shadow DOM to hit the wrong element. Do not apply position arguments reflexively. Start with a normal click and use the documented workaround only when the hit target problem is reproduced.

An explicit chain is appropriate when the page has multiple instances of the same child component and the host is the stable discriminator. It is weaker when product teams frequently refactor component composition without changing user behavior. A test that names three private hosts will fail after a harmless flattening of the tree.

The practical compromise is to enter the highest stable product component explicitly, then locate by role, label, visible text, or a deliberate test attribute below it. Cypress’s built-in queries are CSS-oriented, so teams often use a testing-library integration for role queries. If you add such a library, verify how its commands handle shadow traversal rather than assuming the Cypress setting automatically governs third-party queries.

## Control ambiguity inside repeated components

Shadow traversal is recursive, which means a single selector can find matching internals across many hosts. Positional selection such as \`.eq(1)\` is sometimes unavoidable, but a domain identifier is safer. Put an order ID, product SKU, or test ID on the host, then query within that instance.

\`\`\`typescript
it('changes quantity only for SKU-RED-42', () => {
  cy.visit('/cart');

  cy.get('cart-line[data-sku="SKU-RED-42"]')
    .shadow()
    .find('button[aria-label="Increase quantity"]')
    .click();

  cy.get('cart-line[data-sku="SKU-RED-42"]')
    .shadow()
    .find('output')
    .should('have.text', '2');
});
\`\`\`

This locator survives a new line inserted before the target. It also prevents the global option from searching every cart row for a common label. Host attributes can be legitimate component inputs, not test-only leakage. If the component already receives \`sku\`, exposing it as an attribute aligns the test with application data.

Avoid enormous descendant selectors that attempt to spell the flattened tree, such as \`checkout-shell payment-panel secure-button button.primary\`. Shadow-aware engines may support convenient traversal, but the resulting selector hides which boundaries are intentional and binds the test to every wrapper. Short, scoped queries give better failure messages.

## Diagnose “element not found” without adding sleeps

When a shadow query times out, classify the boundary before raising \`defaultCommandTimeout\`. The host may not exist, the custom element may not be upgraded, the root may be closed, the internal control may render after a request, or the selector may match a different component version.

Start at the host:

1. Assert that the host is attached and visible.
2. Chain \`.shadow().should('exist')\` to prove an open root is attached.
3. Query the immediate child before attempting a deeply nested target.
4. Inspect the network request or state transition that triggers rendering.
5. Confirm the root mode in application code.

Cypress query commands retry, and \`.shadow()\` retries until the host has a root and chained assertions pass. A fixed \`cy.wait(2000)\` throws away this capability and still fails on slower machines. Wait on the request alias or observable state responsible for the content.

If a third-party component uses a closed root, stop trying selector variations. There is no root for Cypress to traverse through the host’s \`shadowRoot\` property. Test through the component’s public behavior: click the host if it is the interactive surface, use keyboard focus, assert emitted events, or cover the integration at an API boundary. Ask the vendor for a test mode only if the behavior cannot be observed externally.

Browser developer tools can display a closed tree for debugging, which sometimes creates false confidence. Cypress executes page JavaScript and follows exposed web APIs. DevTools privilege is not an automation contract.

## Keep selectors aligned with component accessibility

Shadow DOM does not excuse inaccessible markup. A custom element that contains a native button should give that button an accessible name. Form controls should have labels. Focus movement across hosts should follow the expected keyboard order. These properties help users and also provide test signals less brittle than classes generated by a design system.

When possible, place important semantics on the host as well. A composite custom element can expose an appropriate role, name, state attribute, or form-associated behavior. Then high-level workflow tests need less internal traversal. Component tests can still inspect the root for rendering details.

Separate the contracts by test level:

| Test level | Primary target | Appropriate shadow knowledge |
| --- | --- | --- |
| Unit test | Component methods and event logic | Direct root access may be acceptable |
| Component test | One rendered custom element | Internal controls and slots are in scope |
| End-to-end test | Customer workflow | Cross roots only to operate real controls, assert public outcome |
| Accessibility test | Computed roles, names, focus, state | Inspect composed user experience, not CSS implementation |

The broader [Cypress best-practices guide](/blog/cypress-best-practices-2026-guide) helps place selector and isolation choices in a maintainable suite. If a team wraps shadow queries in helpers, follow the same restraint recommended for [Cypress custom commands](/blog/cypress-custom-commands-best-practices): create a command around a stable domain action, not around every one-line selector.

## Exercise slots and late-rendered shadow content deliberately

Slots add a different composition rule. A \`<slot>\` lives inside the shadow root, but the nodes assigned to it remain light-DOM children of the host. If a product card receives an ordinary \`<button slot="actions">\`, a document query can find that button without shadow traversal. The component’s internal fallback button, rendered only when nothing is assigned, requires entry into the open root. Do not enable \`includeShadowDom\` to solve a slotted-node query that already belongs to light DOM; doing so broadens scope without clarifying the contract.

Dynamic components also attach roots at different lifecycle points. Some create the root synchronously in the constructor, then render content after a fetch. Others attach in \`connectedCallback()\`. Cypress’s retryable queries handle both when assertions remain in the command chain. A callback that extracts the root into a plain variable and queries it later can lose retry behavior. Prefer \`cy.get('inventory-panel').shadow().find('[data-cy="stock"]')\` to manually reading \`element.shadowRoot\` inside \`then()\`.

When the content depends on a request, alias the request and assert the resulting state:

\`\`\`typescript
cy.intercept('GET', '/api/inventory/SKU-42').as('inventory');
cy.visit('/products/SKU-42');
cy.wait('@inventory').its('response.statusCode').should('eq', 200);

cy.get('inventory-panel')
  .shadow()
  .find('[role="status"]')
  .should('have.text', 'In stock');
\`\`\`

This is more diagnostic than extending a timeout. A failed request, missing root, and wrong rendered value produce different command-log evidence. It also keeps the test centered on the state transition that causes the shadow content to exist.

Run this case in every browser family your Cypress project officially supports, because slotting, focus, and click hit testing are browser behaviors even when query semantics are provided by Cypress.

## Frequently Asked Questions

### Does includeShadowDom work with closed shadow roots?

No. Cypress can traverse open roots that page JavaScript can access. A host created with \`attachShadow({ mode: 'closed' })\` does not expose its root through \`shadowRoot\`, so neither the global setting nor the command option makes its internals queryable. Exercise the public host behavior or request a supported test seam.

### Is global includeShadowDom slower than the per-command option?

It can make queries search a larger composed structure, especially on pages with many nested components. Measure on the application rather than assuming a fixed penalty. Scoped host queries remain valuable even with the global option because they reduce ambiguity and the amount of DOM Cypress must consider.

### When should I prefer .shadow() over includeShadowDom?

Use \`.shadow()\` when a particular host instance and boundary are meaningful to the scenario, or when repeated internals make a global match ambiguous. Use \`includeShadowDom\` when the user-facing target is stable but its open-root nesting is incidental and likely to change.

### Why does the shadow button exist but the click miss it?

First rule out overlays, animation, disabled state, and scrolling like any actionability issue. Cypress also documents a Chrome ambiguity for clicks in shadow DOM; after reproducing that specific case, passing \`'top'\` to \`click()\` is the supported workaround. Do not use forced clicks to conceal an actual obstruction.

### Can includeShadowDom replace accessible selectors?

No. It changes where supported queries search, not how well a selector expresses user intent. Prefer labels, roles through an appropriate query library, visible names, and deliberate host attributes. Shadow traversal and selector quality solve different problems.
`,
};
