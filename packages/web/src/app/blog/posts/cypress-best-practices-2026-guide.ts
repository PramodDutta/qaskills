import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Best Practices 2026: 25 Rules for Reliable Tests',
  description:
    'The definitive 2026 guide to Cypress best practices. 25 actionable rules covering selectors, network stubbing, custom commands, CI, and flake elimination with side-by-side examples.',
  date: '2026-05-12',
  category: 'Tutorial',
  content: `
Cypress remains one of the most popular end-to-end testing frameworks in 2026, but the gap between a Cypress test suite that scales and one that becomes a flaky maintenance nightmare comes down to discipline. This guide distills the 25 rules every Cypress engineer should follow, with side-by-side good and bad examples for each rule and clear explanations of the underlying mechanics.

If you are starting a new Cypress project or auditing an existing one, treat these rules as a checklist. Each rule maps to a real failure mode we have seen in production codebases -- from \`cy.wait(3000)\` peppered through test files to single 500-line spec files that flake every other run.

## Key Takeaways

- **Selector strategy is non-negotiable.** Always use \`data-cy\` attributes; never select by class, ID, or generated text.
- **Eliminate arbitrary waits.** \`cy.wait(ms)\` is the single biggest cause of flake. Use route aliases and assertions instead.
- **Isolate every test.** Tests must not depend on order, leftover state, or other tests' data.
- **Stub the network at the boundary.** \`cy.intercept()\` lets you control timing, payloads, and edge cases without backend changes.
- **Custom commands are leverage, not magic.** Use them to encode policy (login, seed, navigate) -- not to hide assertions.
- **Run in CI like you run locally.** Headless mode, the same Node version, and parallelization should match.

---

## Rule 1 -- Use data-cy Attributes for Selectors

The official Cypress documentation has recommended \`data-cy\` attributes for years, and yet most flaky Cypress suites still select elements by class, ID, or visible text. This is the root cause of more flake than any other single anti-pattern.

**Bad** -- coupled to styling and copy:

\`\`\`javascript
cy.get('.btn-primary').click();
cy.get('#submit-button').click();
cy.contains('Save changes').click();
\`\`\`

**Good** -- decoupled from presentation:

\`\`\`javascript
cy.get('[data-cy=save-button]').click();
\`\`\`

A \`data-cy\` attribute is invisible to users, ignored by SEO, untouched by CSS refactors, and survives translation. When a designer changes \`.btn-primary\` to \`.button-action\`, your tests do not break. When the product team changes "Save changes" to "Save", your tests do not break.

For component libraries that wrap third-party elements, set a custom command:

\`\`\`javascript
Cypress.Commands.add('dataCy', (selector) => {
  return cy.get(\`[data-cy=\${selector}]\`);
});

// Usage
cy.dataCy('save-button').click();
\`\`\`

## Rule 2 -- Never Use cy.wait with a Number

\`cy.wait(3000)\` is the most common cause of flake in real Cypress suites. It is a band-aid on a real timing problem and creates a brittle, slow test.

**Bad** -- arbitrary waiting:

\`\`\`javascript
cy.get('[data-cy=submit]').click();
cy.wait(5000);
cy.get('[data-cy=success]').should('be.visible');
\`\`\`

**Good** -- wait for the network alias:

\`\`\`javascript
cy.intercept('POST', '/api/checkout').as('checkout');
cy.get('[data-cy=submit]').click();
cy.wait('@checkout');
cy.get('[data-cy=success]').should('be.visible');
\`\`\`

Cypress automatically retries assertions until they pass or time out. Combined with route aliases, this gives you precise control: wait exactly as long as needed, never longer.

## Rule 3 -- One Assertion Per Concept, Not Per Test

A test should verify one behavior end-to-end. That behavior may need multiple assertions to fully describe the outcome -- that is fine. What is not fine is splitting "user can complete checkout" into seven separate tests.

**Good** -- one scenario, multiple assertions:

\`\`\`javascript
it('completes checkout with valid payment', () => {
  cy.visit('/cart');
  cy.get('[data-cy=checkout-button]').click();
  cy.fillPayment(validCard);
  cy.get('[data-cy=place-order]').click();

  cy.wait('@order');
  cy.url().should('include', '/order-confirmation');
  cy.get('[data-cy=order-number]').should('be.visible');
  cy.get('[data-cy=order-total]').should('contain', '\$99.99');
});
\`\`\`

## Rule 4 -- Stub the Network by Default

Hitting the real backend on every test run is a recipe for slow, flaky tests. Stub at the boundary using \`cy.intercept()\`, and reserve real backend hits for a small set of smoke tests.

\`\`\`javascript
beforeEach(() => {
  cy.intercept('GET', '/api/products', { fixture: 'products.json' }).as('products');
  cy.intercept('POST', '/api/cart', { statusCode: 200, body: { ok: true } }).as('addToCart');
});
\`\`\`

## Rule 5 -- Reset State Before Tests, Not After

State cleanup belongs in \`beforeEach\`, not \`afterEach\`. If a test crashes mid-run, \`afterEach\` may never execute -- leaving the next test in a corrupted state.

**Good**:

\`\`\`javascript
beforeEach(() => {
  cy.task('db:reset');
  cy.task('db:seed');
});
\`\`\`

## Rule 6 -- Use cy.session for Authentication

Re-running the login flow in every test is slow and brittle. \`cy.session()\` caches authentication state across tests in the same spec file.

\`\`\`javascript
beforeEach(() => {
  cy.session('user-alice', () => {
    cy.visit('/login');
    cy.get('[data-cy=email]').type('alice@example.com');
    cy.get('[data-cy=password]').type('SecurePass1!');
    cy.get('[data-cy=submit]').click();
    cy.url().should('include', '/dashboard');
  }, {
    validate() {
      cy.getCookie('session').should('exist');
    },
  });
});
\`\`\`

## Rule 7 -- Login Programmatically When Possible

If your application supports it, log in via an API call rather than the UI. This is faster and decouples your test from login UI changes.

\`\`\`javascript
Cypress.Commands.add('loginByApi', (email, password) => {
  cy.session([email], () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { email, password },
    }).then((response) => {
      window.localStorage.setItem('auth_token', response.body.token);
    });
  });
});
\`\`\`

## Rule 8 -- Avoid Conditional Logic in Tests

If your test has \`if\` statements, you are testing two things instead of one.

**Bad**:

\`\`\`javascript
cy.get('[data-cy=banner]').then(($el) => {
  if ($el.is(':visible')) {
    cy.get('[data-cy=close-banner]').click();
  }
});
\`\`\`

**Good** -- two separate tests:

\`\`\`javascript
it('shows the banner on first visit', () => { /* ... */ });
it('hides the banner after dismissal', () => { /* ... */ });
\`\`\`

## Rule 9 -- Use Fixtures for Test Data

Hardcoding large data objects in test files makes them unreadable. Use fixtures.

\`\`\`javascript
// cypress/fixtures/user.json
{ "email": "alice@example.com", "role": "admin" }

// In test
cy.fixture('user').then((user) => {
  cy.get('[data-cy=email]').type(user.email);
});
\`\`\`

## Rule 10 -- Run Tests in Random Order

Cypress runs specs in alphabetical order by default. Tests should be order-independent. Validate this by running specs in random order in CI occasionally.

## Rule 11 -- Keep Specs Under 200 Lines

A 1000-line spec file is a maintenance disaster. Split by feature, by user role, or by user journey.

## Rule 12 -- Custom Commands for Reusable Workflows

\`\`\`javascript
Cypress.Commands.add('addToCart', (productId, quantity = 1) => {
  cy.get(\`[data-cy=product-\${productId}]\`).click();
  cy.get('[data-cy=quantity]').clear().type(quantity);
  cy.get('[data-cy=add-to-cart]').click();
  cy.get('[data-cy=cart-count]').should('contain', quantity);
});
\`\`\`

## Rule 13 -- Custom Commands Should Not Hide Assertions

A custom command named \`addToCart\` should add to the cart. It should not also assert that the cart total is correct -- that is the test's job.

## Rule 14 -- Use should with a Callback for Complex Assertions

\`\`\`javascript
cy.get('[data-cy=user-list]').should(($list) => {
  expect($list.find('li')).to.have.length.greaterThan(2);
  expect($list.find('li').first()).to.contain('Alice');
});
\`\`\`

## Rule 15 -- Never Use cy.wait Before Assertions

Cypress already retries assertions. Adding a wait before is redundant and slows down passing tests.

## Rule 16 -- Use cy.intercept Aliases for Form Submissions

Every form submission should have a corresponding intercept and \`cy.wait('@alias')\`. This is the single highest-impact change you can make to reduce flake.

## Rule 17 -- Test User Behavior, Not Implementation

If your test reads \`cy.get('[data-cy=internal-state-flag]')\`, you are testing implementation details. Test what the user sees.

## Rule 18 -- Run Headless Locally Before Pushing

\`cypress open\` is great for debugging, but \`cypress run\` is what your CI uses. Run headless before pushing -- you will catch issues that only appear in CI.

\`\`\`bash
npx cypress run --browser chrome --spec "cypress/e2e/checkout.cy.ts"
\`\`\`

## Rule 19 -- Parallelize Tests in CI

Cypress Cloud and GitHub Actions matrix builds let you run 10x faster.

\`\`\`yaml
strategy:
  matrix:
    containers: [1, 2, 3, 4]
steps:
  - run: npx cypress run --record --parallel
\`\`\`

## Rule 20 -- Pin Your Cypress Version

\`\`\`json
"dependencies": {
  "cypress": "13.15.0"
}
\`\`\`

Use exact versions, not \`^13.15.0\`. Cypress patch releases occasionally introduce breaking changes.

## Rule 21 -- Use TypeScript

TypeScript catches selector typos, custom command signature errors, and refactoring breakage at compile time.

\`\`\`typescript
declare global {
  namespace Cypress {
    interface Chainable {
      dataCy(selector: string): Chainable<JQuery<HTMLElement>>;
      login(email: string, password: string): Chainable<void>;
    }
  }
}
\`\`\`

## Rule 22 -- Page Objects Are Optional in Cypress

Cypress's chainable API and custom commands often eliminate the need for page objects. Use them only when a page has genuinely complex shared behavior.

## Rule 23 -- Visual Regression for Critical Pages

For pages where pixel-perfect layout matters (landing pages, marketing, dashboards), add visual regression with Percy or Applitools.

\`\`\`javascript
cy.percySnapshot('Dashboard - empty state');
\`\`\`

## Rule 24 -- Tag Tests for Selective Execution

\`\`\`javascript
describe('Checkout', { tags: ['@smoke', '@checkout'] }, () => {
  it('completes purchase', { tags: '@critical' }, () => { /* ... */ });
});

// Run only smoke tests
// npx cypress run --env grepTags=@smoke
\`\`\`

## Rule 25 -- Capture and Review Videos and Screenshots

Cypress records videos and screenshots automatically. Upload them as CI artifacts so you can review failures without re-running locally.

\`\`\`yaml
- name: Upload Cypress artifacts
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: cypress-artifacts
    path: |
      cypress/screenshots
      cypress/videos
\`\`\`

---

## Common Anti-Patterns

### Selecting by Visible Text

Tests that select with \`cy.contains('Save')\` break when product copy changes or when the application is internationalized. Use \`data-cy\` selectors and let assertions verify text content separately.

### Long beforeEach Hooks

If your \`beforeEach\` is 50 lines long, every test pays that cost on every run. Move shared setup to fixtures or programmatic seeds.

### Sharing State Between Tests

\`\`\`javascript
// BAD
let userId;
it('creates a user', () => {
  cy.request('POST', '/api/users').then((res) => { userId = res.body.id; });
});
it('updates the user', () => {
  cy.request('PATCH', \`/api/users/\${userId}\`);
});
\`\`\`

If the first test fails, the second one fails for the wrong reason. Each test should create its own data.

### Mixing UI and API Setup

If your test logs in via the UI just to test a settings page, you have coupled two unrelated things. Log in via API; test the settings UI.

### Not Using cy.intercept Aliases

\`\`\`javascript
// BAD
cy.get('[data-cy=submit]').click();
cy.wait(2000);

// GOOD
cy.intercept('POST', '/api/orders').as('createOrder');
cy.get('[data-cy=submit]').click();
cy.wait('@createOrder');
\`\`\`

---

## Cypress vs Playwright: Best Practices Differ

Many engineers come to Cypress from Playwright and try to apply the same patterns. They are different tools with different defaults.

| Concern | Cypress | Playwright |
|---|---|---|
| Selectors | \`data-cy\` attributes preferred | \`getByRole\`, \`getByTestId\`, \`getByLabel\` |
| Waiting | Automatic retry of assertions | Auto-waiting with locators |
| Network stubbing | \`cy.intercept()\` | \`page.route()\` |
| Auth caching | \`cy.session()\` | \`storageState\` |
| Parallelism | Cypress Cloud or CI matrix | Built-in workers |
| Browser engines | Chromium, Firefox, WebKit (experimental) | Chromium, Firefox, WebKit (all first-class) |

See our [Cypress vs Playwright comparison](/blog/cypress-vs-playwright-2026) for a deeper dive.

---

## Running These Practices in CI

A minimal GitHub Actions setup that follows these best practices:

\`\`\`yaml
name: Cypress Tests
on: [pull_request]
jobs:
  cypress:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        containers: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - name: Cypress run
        uses: cypress-io/github-action@v6
        with:
          install: false
          start: pnpm start
          wait-on: 'http://localhost:3000'
          record: true
          parallel: true
        env:
          CYPRESS_RECORD_KEY: \${{ secrets.CYPRESS_RECORD_KEY }}
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

---

## Automate Cypress Best Practices with AI Agents

Manually enforcing 25 rules across a growing team is hard. AI coding agents can pre-flight every Cypress PR and catch violations before they reach review.

\`\`\`bash
npx @qaskills/cli add cypress-e2e
npx @qaskills/cli add fix-flaky-tests
\`\`\`

With these skills installed, your agent will:

- Refactor selectors to \`data-cy\` attributes automatically
- Replace \`cy.wait(ms)\` with route alias waits
- Convert UI logins to programmatic logins
- Add intercept aliases for every form submission
- Suggest splits when spec files exceed 200 lines

Browse all available skills at [qaskills.sh/skills](/skills).

---

## Frequently Asked Questions

### Should I use data-cy or data-testid?

Either works. \`data-testid\` is the React Testing Library convention and is often already present in component code. \`data-cy\` is Cypress's official recommendation. Pick one and use it everywhere. If your codebase already uses \`data-testid\`, do not duplicate -- configure Cypress to look for it.

### How do I handle authentication in Cypress 2026?

Use \`cy.session()\` for caching login state and prefer programmatic API logins over UI logins. For SSO and OAuth flows, see Cypress's documentation on cross-origin testing with \`cy.origin()\`.

### Is page object model still relevant for Cypress?

Page objects can help in very large suites with shared complex pages, but Cypress custom commands often eliminate the need. Start without POM, add it only when you see clear duplication that custom commands cannot resolve.

### How do I run Cypress against multiple environments?

Use Cypress environment variables or \`cypress.config.ts\` overrides. Pass environment-specific config via \`--env\` flags or CI environment variables.

### What about component testing in Cypress?

Cypress Component Testing supports React, Vue, Angular, and Svelte. It uses the same Cypress runner with a different mount harness. See our [Cypress component testing with Vue guide](/blog/cypress-component-testing-vue-guide) and [Cypress component testing with Angular guide](/blog/cypress-component-testing-angular-guide).
`,
};
