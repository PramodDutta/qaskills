import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Viewport Responsive Assertions That Test Behavior, Not Pixels',
  description: 'Build Cypress viewport responsive assertions that verify breakpoints, navigation, overflow, and accessible behavior across a compact device matrix.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Cypress Viewport Responsive Assertions That Test Behavior, Not Pixels

Cypress viewport responsive assertions should verify the contract that changes at each breakpoint: which controls are visible, how navigation is operated, whether content remains reachable, and whether layout avoids unintended overflow. Call \`cy.viewport(width, height)\` or a documented preset before visiting the page, then assert observable behavior at widths just below, at, and just above each product breakpoint. A dozen device presets are less informative than three carefully selected boundary values.

\`cy.viewport()\` changes the application viewport inside Cypress. It does not turn the browser into a physical phone, change the user agent, enable touch hardware, or reproduce mobile browser chrome. Use it for CSS media queries and width-dependent UI logic. Use real-device or mobile-browser coverage separately when the risk involves touch input, operating-system keyboards, browser toolbars, or device-specific rendering. Teams deciding where this coverage belongs can consult the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). For resilient assertions after the layout changes, the [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) offers principles that transfer well to Cypress selectors.

The strongest responsive test reads like a product rule: “below 768 pixels, primary navigation moves into an accessible menu and every action remains usable.” It does not read like a screenshot inventory. Screenshots can supplement that rule, but semantic assertions diagnose failures faster and survive harmless spacing changes.

## Translate breakpoints into testable product contracts

A stylesheet breakpoint is an implementation detail until it is tied to behavior. Start by mapping each responsive mode to user-visible obligations. The same page may have only three meaningful modes even if a design system contains many media queries.

| Mode | Width range, illustrative | Product contract | High-value assertions |
|---|---:|---|---|
| Compact | Below 768 px | Menu collapses, cards stack, actions remain reachable | Menu button visible, desktop nav hidden, no page overflow |
| Medium | 768 px through 1199 px | Navigation fits, grid uses two columns | Navigation visible, two representative cards share a row |
| Wide | 1200 px and above | Sidebar and main content coexist | Sidebar visible, key action remains in main region |

The numbers in this table are illustrative. Read the actual tokens or CSS used by the application. If the implementation uses \`@media (min-width: 768px)\`, test 767 and 768 because those values prove ownership of the boundary. Adding 769 usually provides little new information. If another rule changes at 1024, add that boundary for the behavior it owns rather than calling it an “iPad test.”

Create a contract sheet before creating test cases:

| Responsive question | Observable answer | Avoid asserting |
|---|---|---|
| How is navigation entered? | A named menu button appears | Exact hamburger icon path |
| Can the user reach every action? | Buttons can be focused and clicked | Their absolute x-coordinate |
| Does content reflow? | Cards are ordered and readable | Every computed margin |
| Is anything clipped? | Page has no horizontal overflow | Screenshot pixel equality alone |
| Does a table adapt? | Priority columns or card view expose required values | Internal wrapper class names |
| What survives rotation? | Draft state and selected item remain | Framework component instance state |

This translation is especially useful when an AI coding agent proposes tests. Give it the product contract and breakpoint source, then ask for the fewest viewports that prove each boundary. Otherwise it may multiply the same shallow visibility assertion across many named devices.

## Configure a small, explicit viewport matrix

Cypress accepts numeric dimensions and documented presets. Numeric sizes communicate breakpoint intent better, while presets make a named size convenient. Presets are dimensions, not device emulation. The official command reference is https://docs.cypress.io/api/commands/viewport.

Keep the matrix in test code so failures name the relevant mode:

\`\`\`ts
// cypress/e2e/responsive-navigation.cy.ts
type ViewportCase = {
  name: string;
  width: number;
  height: number;
  menuMode: 'collapsed' | 'expanded';
};

const cases: ViewportCase[] = [
  { name: 'compact below boundary', width: 767, height: 900, menuMode: 'collapsed' },
  { name: 'medium at boundary', width: 768, height: 900, menuMode: 'expanded' },
  { name: 'wide workspace', width: 1280, height: 800, menuMode: 'expanded' },
];

describe('responsive navigation', () => {
  for (const viewport of cases) {
    it(viewport.name, () => {
      cy.viewport(viewport.width, viewport.height);
      cy.visit('/products');

      if (viewport.menuMode === 'collapsed') {
        cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
        cy.get('[data-testid="desktop-navigation"]').should('not.be.visible');
      } else {
        cy.get('[data-testid="desktop-navigation"]').should('be.visible');
        cy.get('[data-testid="mobile-menu-button"]').should('not.be.visible');
      }
    });
  }
});
\`\`\`

The conditional is based on declared expected behavior, not repeated width arithmetic. A test case remains understandable if the breakpoint changes later. If compact and expanded modes have substantially different journeys, use separate tests instead of a large branch. Separate tests produce clearer command logs and let failures point to one interaction model.

Set a project default with \`viewportWidth\` and \`viewportHeight\` only for the common baseline. Use \`cy.viewport()\` for scenarios that intentionally change it:

\`\`\`ts
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  viewportWidth: 1280,
  viewportHeight: 800,
  e2e: {
    baseUrl: 'http://localhost:3000',
  },
});
\`\`\`

The configuration avoids an implicit local-machine size. Cypress restores the configured viewport between tests, so each responsive test should still state the size it depends on. Explicit setup prevents test order from becoming part of the contract.

## Test both sides of every inclusive boundary

Responsive failures often hide in the single pixel where ownership changes. Suppose the application defines mobile styles as the default and applies desktop styles with \`min-width: 768px\`. The highest compact width is 767 and the lowest expanded width is 768. Those are the two essential tests.

\`\`\`css
/* application CSS shown to establish the tested contract */
.primary-nav {
  display: none;
}

.menu-button {
  display: inline-flex;
}

@media (min-width: 768px) {
  .primary-nav {
    display: flex;
  }

  .menu-button {
    display: none;
  }
}
\`\`\`

\`\`\`ts
// cypress/e2e/navigation-boundary.cy.ts
function expectCompactNavigation(): void {
  cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
  cy.get('[data-testid="desktop-navigation"]').should('not.be.visible');
}

function expectExpandedNavigation(): void {
  cy.get('[data-testid="desktop-navigation"]').should('be.visible');
  cy.get('[data-testid="mobile-menu-button"]').should('not.be.visible');
}

it('owns the last pixel below the navigation breakpoint', () => {
  cy.viewport(767, 900);
  cy.visit('/');
  expectCompactNavigation();
});

it('switches navigation exactly at the desktop breakpoint', () => {
  cy.viewport(768, 900);
  cy.visit('/');
  expectExpandedNavigation();
});
\`\`\`

Do not infer the breakpoint from a popular device width. Test the value in the product implementation and name the behavior. A “tablet” may be portrait or landscape, browser zoom can alter CSS pixels, and future hardware does not honor the names in your test suite.

## Assert navigation as an interaction, not a visibility toggle

A collapsed menu is only useful if it opens, announces its state, exposes links, supports navigation, and closes according to the product contract. Visibility alone misses broken event handlers and inaccessible state.

\`\`\`ts
// cypress/e2e/compact-menu.cy.ts
it('opens and uses the compact navigation menu', () => {
  cy.viewport(390, 844);
  cy.visit('/');

  cy.get('[data-testid="mobile-menu-button"]')
    .should('be.visible')
    .and('have.attr', 'aria-expanded', 'false')
    .click()
    .should('have.attr', 'aria-expanded', 'true');

  cy.get('[data-testid="mobile-navigation"]')
    .should('be.visible')
    .within(() => {
      cy.contains('a', 'Pricing').click();
    });

  cy.location('pathname').should('eq', '/pricing');
  cy.get('h1').should('contain.text', 'Pricing');
});
\`\`\`

The viewport here represents a compact journey, not an emulated phone. The assertion uses an accessible state already present in a well-built disclosure control. It verifies the link through its role and text within the navigation region, then checks the destination. If the interface uses a modal dialog for the mobile menu, add the dialog name and focus-management expectations that apply to that implementation.

Avoid \`force: true\` when clicking responsive controls. A forced click can make a covered or off-screen control seem usable. Cypress actionability checks are valuable evidence that the responsive layout truly allows interaction.

## Detect horizontal overflow without banning intentional scrollers

Unexpected horizontal page scrolling is a classic responsive defect. Compare the root element's scroll width with its client width. Allow a one-pixel tolerance for rounding, but inspect the failing elements rather than increasing the tolerance until the test passes.

\`\`\`ts
// cypress/e2e/no-page-overflow.cy.ts
function expectNoPageOverflow(tolerance = 1): void {
  cy.document().then((document) => {
    const root = document.documentElement;
    expect(
      root.scrollWidth,
      'document scroll width',
    ).to.be.at.most(root.clientWidth + tolerance);
  });
}

for (const width of [320, 375, 767, 768, 1024]) {
  it('has no unexpected page overflow at ' + width + 'px', () => {
    cy.viewport(width, 800);
    cy.visit('/account/billing');
    cy.get('[data-testid="billing-summary"]').should('be.visible');
    expectNoPageOverflow();
  });
}
\`\`\`

This assertion intentionally targets page-level overflow. A carousel, code sample, or data table may be designed as an inner horizontal scroller. In that case, assert that the scrolling is contained and that essential information remains reachable.

\`\`\`ts
// cypress/e2e/responsive-table.cy.ts
it('contains wide invoice data inside its own scroller', () => {
  cy.viewport(360, 760);
  cy.visit('/account/invoices');

  cy.get('[data-testid="invoice-scroller"]').then(($scroller) => {
    const scroller = $scroller[0];
    expect(scroller.scrollWidth).to.be.greaterThan(scroller.clientWidth);
  });

  cy.get('[data-testid="invoice-scroller"]').scrollTo('right');
  cy.contains('th', 'Total').should('be.visible');
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(
      document.documentElement.clientWidth + 1,
    );
  });
});
\`\`\`

The inner overflow is expected, while page overflow is not. The test distinguishes those policies instead of applying a global “nothing may be wider” rule.

## Verify reflow and ordering with stable geometry checks

Sometimes geometry is the behavior. A card grid should stack in compact mode and display multiple columns in wide mode. Assert relationships between representative elements, not exact positions, widths, or gaps.

\`\`\`ts
// cypress/e2e/product-grid.cy.ts
type Box = { top: number; left: number };

function boxOf(selector: string): Cypress.Chainable<Box> {
  return cy.get(selector).then(($element) => {
    const rect = $element[0].getBoundingClientRect();
    return { top: Math.round(rect.top), left: Math.round(rect.left) };
  });
}

it('stacks the first two products in compact mode', () => {
  cy.viewport(375, 800);
  cy.visit('/products');

  boxOf('[data-testid="product-card-1"]').then((first) => {
    boxOf('[data-testid="product-card-2"]').then((second) => {
      expect(second.top).to.be.greaterThan(first.top);
      expect(Math.abs(second.left - first.left)).to.be.at.most(1);
    });
  });
});

it('places the first two products on one row in wide mode', () => {
  cy.viewport(1280, 800);
  cy.visit('/products');

  boxOf('[data-testid="product-card-1"]').then((first) => {
    boxOf('[data-testid="product-card-2"]').then((second) => {
      expect(Math.abs(second.top - first.top)).to.be.at.most(1);
      expect(second.left).to.be.greaterThan(first.left);
    });
  });
});
\`\`\`

Rounded coordinates tolerate subpixel rendering while retaining the real relationship. Use geometry sparingly. If CSS classes or accessible structure expose the contract more directly, prefer them. Geometry can change because of font loading, content length, or animation, so wait for the representative content to be visible before reading rectangles.

## Exercise resizing when the application reacts at runtime

Many tests set a viewport before \`cy.visit()\`, which verifies the initial responsive render. Some applications also attach resize listeners, recalculate charts, or preserve a drawer state when orientation changes. Those behaviors require resizing after the page is ready.

\`\`\`ts
// cypress/e2e/runtime-resize.cy.ts
it('recomputes the chart and preserves the selected period', () => {
  cy.viewport(1280, 800);
  cy.visit('/analytics');
  cy.get('[data-testid="period-select"]').select('90-days');
  cy.get('[data-testid="chart"]').should('have.attr', 'data-period', '90-days');

  cy.viewport(390, 844);

  cy.get('[data-testid="chart"]')
    .should('have.attr', 'data-layout', 'compact')
    .and('have.attr', 'data-period', '90-days');
  cy.get('[data-testid="chart-summary"]').should('be.visible');
});
\`\`\`

This test has two claims: the runtime layout changes, and user state survives. If the application debounces resize work, Cypress retryable assertions can wait for the \`data-layout\` change. Do not insert a fixed sleep. If fake timers are used to drive a known debounce, make that a focused timer test rather than adding clock manipulation to every viewport scenario.

Cypress also accepts preset and orientation arguments, for example \`cy.viewport('iphone-6', 'landscape')\`. Use that syntax when orientation itself is the named scenario. For CSS boundary ownership, numeric widths remain clearer because a preset's label can distract reviewers from the exact CSS pixels being tested.

## Stress forms with errors and long content

Happy-path labels rarely expose the hardest responsive defects. Validation inserts new blocks, translated copy wraps, password guidance expands, and a sticky action bar can cover the field that failed. Build one compact test around a deliberately invalid submission and prove the recovery path remains usable.

\`\`\`ts
// cypress/e2e/compact-checkout-errors.cy.ts
it('keeps validation and recovery controls reachable at minimum width', () => {
  cy.viewport(320, 720);
  cy.visit('/checkout');

  cy.get('[data-testid="email-input"]').type('not-an-email');
  cy.contains('button', 'Place order').click();

  cy.get('[data-testid="email-error"]')
    .should('be.visible')
    .and('contain.text', 'Enter a valid email address');
  cy.get('[data-testid="email-input"]')
    .should('have.attr', 'aria-describedby', 'email-error')
    .clear()
    .type('buyer@example.test');
  cy.contains('button', 'Place order').should('be.visible').and('not.be.disabled');

  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(
      document.documentElement.clientWidth + 1,
    );
  });
});
\`\`\`

This scenario checks more than wrapping. The error is associated with its field, correction remains possible, the primary action is reachable, and inserted content does not widen the page. If the application moves focus to the first invalid field, assert that the focused element has the expected test ID. If a sticky footer is used, let Cypress perform a normal click in a dedicated recovery test so overlap detection remains active.

Use controlled long content rather than arbitrary text. Choose a known supported locale, an accepted maximum-length name, and a realistic unbroken identifier if the UI must handle one. Each value should correspond to a stated requirement. A random paragraph can create a screenshot difference without explaining which product rule failed.

## Separate responsive behavior from visual regression

Semantic Cypress assertions and screenshot comparison answer different questions. Semantic checks ask whether the menu works, content is ordered, labels exist, and overflow is controlled. Visual comparison asks whether the rendered surface differs from an approved image. A mature suite may use both, but one should not masquerade as the other.

| Concern | Semantic assertion | Visual comparison |
|---|---|---|
| Menu can open | Strong signal | Indirect signal |
| One-pixel border regression | Usually excessive | Strong signal |
| Text remains accessible | Role, name, visibility checks | Image may show text but not semantics |
| Unexpected wrapping | Geometry or content relationship | Strong signal after fonts stabilize |
| Dynamic dates and avatars | Easy to assert by meaning | Requires masking or stable data |
| Failure diagnosis | Usually localized | Requires image inspection |

When screenshots are used, control data, fonts, animation, viewport, and browser version through the chosen visual testing system. Cypress core has screenshot commands, but comparison and baseline management depend on the visual service or plugin a project deliberately adopts. Do not invent a plugin API in a portable example.

## Diagnose a responsive assertion that passes locally and fails in CI

Consider a compact navigation test that intermittently reports the desktop menu as visible at 767 pixels. The first diagnostic step is to print actual viewport and layout measurements in the browser, not to widen timeouts. Check \`window.innerWidth\`, \`document.documentElement.clientWidth\`, the menu's computed \`display\`, and whether a scrollbar or application script changes layout after load.

\`\`\`ts
// Add temporarily near the failing assertion.
cy.window().then((window) => {
  const navigation = window.document.querySelector(
    '[data-testid="desktop-navigation"]',
  );
  if (!(navigation instanceof window.HTMLElement)) {
    throw new Error('desktop navigation was not found');
  }

  Cypress.log({
    name: 'responsive-diagnostics',
    message: JSON.stringify({
      innerWidth: window.innerWidth,
      clientWidth: window.document.documentElement.clientWidth,
      display: window.getComputedStyle(navigation).display,
    }),
  });
});
\`\`\`

A frequent root cause is not Cypress itself. The application may read \`window.innerWidth\` once at module startup, then Cypress changes the viewport after navigation. Set the viewport before \`cy.visit()\` for initial-mode tests. If runtime resizing is a product requirement, fix the application to observe changes and retain a separate after-load resize test.

Other causes include a media query defined with the opposite inclusive edge, a late-loaded stylesheet, font substitution that changes content wrapping, or a fixed-width child creating overflow. The command log establishes when resizing occurred. Computed style and rectangles establish what the browser rendered. Network logs establish whether the correct stylesheet loaded. Together they replace guesswork with a short evidence chain.

## What people get wrong about responsive testing

The first misconception is that more device presets equal more coverage. Ten devices inside the same CSS range often execute the same branch. Boundary-driven coverage gives a clearer proof with fewer tests. Add a size only when it activates a different contract, exposes a minimum supported width, or represents a content stress case.

The second is equating “not visible” with “not accessible.” A hidden desktop menu may still contain focusable descendants if it is moved off-screen incorrectly. Test keyboard focus and accessibility semantics where that risk exists. Likewise, a visible control can be unusable because it is overlapped, clipped, or too dependent on hover. An ordinary Cypress click without forcing it is a useful actionability check.

The third is expecting viewport resizing to emulate mobile Safari or Android Chrome. It cannot validate safe areas, dynamic browser bars, native zoom, virtual keyboards, or touch-only gestures. Maintain a risk-based real-device layer for those behaviors rather than overstating what a desktop browser viewport proves.

## Keep the responsive suite fast and legible

Group tests by behavior rather than by device. A navigation spec can cover its compact and expanded modes. A data-table spec can cover its contained overflow. This organization makes ownership clear when a component changes.

Use a compact matrix and avoid repeating expensive setup for every arbitrary size. Stub data when the test claim is purely layout behavior, and keep one or more integrated journeys for confidence that real data shapes still work. Include long labels, empty values, validation errors, and localized strings because content frequently exposes responsive bugs more effectively than another viewport.

Before merging, verify these points:

1. Each width maps to a named behavior or exact breakpoint edge.
2. \`cy.viewport()\` runs before \`cy.visit()\` unless runtime resizing is the claim.
3. Assertions cover interaction and accessibility state, not only CSS visibility.
4. Page overflow and intentional component overflow are distinguished.
5. Geometry checks compare relationships with a small rounding tolerance.
6. No forced click or fixed sleep hides an actionability problem.
7. Physical-device risks remain assigned to an appropriate test layer.

That discipline gives Cypress viewport responsive assertions a precise job: proving responsive web contracts quickly, deterministically, and close to the component behavior that implements them.

## Frequently Asked Questions

### Does cy.viewport emulate a real mobile device?

No. It changes the width and height of the application's viewport in Cypress, which is enough to activate CSS media queries and most width-dependent JavaScript. It does not automatically change the browser user agent, provide touch hardware, reproduce a virtual keyboard, or model mobile browser chrome. Treat a named preset as a convenient dimension. Keep separate real-device or mobile-browser testing for touch interactions, safe-area behavior, operating-system integration, and issues specific to Safari or Android Chrome.

### Which viewport widths should a responsive Cypress suite test?

Start with exact product boundaries. For a \`min-width: 768px\` change, test 767 and 768. Add the minimum supported width, a representative wide width, and any other size that activates a distinct contract. Do not build the matrix from a long list of popular devices unless each adds a different risk. Content variants can be more valuable than extra widths, especially long translated labels, dense tables, empty states, and server errors that alter wrapping.

### Should responsive assertions inspect CSS properties?

Only when a CSS property is the clearest observable contract. Prefer user-facing evidence such as a visible named control, successful navigation, contained scrolling, preserved state, or meaningful element relationships. A computed \`display\` value is useful for diagnosis, but a permanent test tied to many implementation properties becomes brittle. Geometry checks are justified for stacking and column behavior if they compare relative positions and tolerate subpixel rounding. Avoid asserting exact coordinates unless the coordinates themselves are a requirement.

### How can Cypress test a resize listener without a fixed wait?

Load the page at the initial size, perform any stateful action, call \`cy.viewport()\` with the next dimensions, and assert the eventual observable result. Cypress retries assertions such as attribute, visibility, and text checks until their timeout, so a normally debounced resize handler can settle without \`cy.wait(500)\`. If the debounce interval itself is the requirement, isolate it in a focused clock test. Also verify that viewport setup occurs before navigation in tests that only care about the initial responsive mode.
`,
};
