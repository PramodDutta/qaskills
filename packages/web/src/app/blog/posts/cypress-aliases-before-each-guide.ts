import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Aliases: Reset Before Each Test Explained 2026',
  description:
    'Cypress aliases in TypeScript: how cy.as() works, why aliases reset before each test, retrieving with @alias, intercept aliases, and flaky-test gotchas.',
  date: '2026-06-02',
  category: 'Reference',
  content: `
# Cypress Aliases: Reset Before Each Test Explained

Aliases are one of the most useful features in Cypress, and also one of the most misunderstood. An alias is a named reference to something you captured earlier in a test — a DOM element, the result of a request, a stubbed function, or an arbitrary value — that you can retrieve later with the \`@\` prefix. They keep tests readable by giving meaningful names to things you reuse, and they unlock powerful patterns like waiting on a network request before asserting on the UI. But aliases carry a property that trips up almost every engineer at some point: they reset before each test. An alias defined in one \`it\` block does not exist in the next one, and assuming otherwise produces tests that pass in isolation and fail when run together.

This reference explains the full lifecycle of Cypress aliases in TypeScript. We cover how \`cy.as()\` registers an alias, the four kinds of aliases Cypress supports, why and exactly when aliases are cleared, how to retrieve them with \`cy.get('@name')\` and the \`this.name\` context, and how aliasing \`cy.intercept\` enables reliable network-aware tests. We then walk through the gotchas that cause the most pain: sharing aliases across tests, arrow functions breaking \`this\` access, stale element references, and the difference between defining an alias in \`before\` versus \`beforeEach\`. Everything is runnable against Cypress 14, the current release in 2026.

If you only remember one sentence from this article, make it this: aliases live for exactly one test, so define them in \`beforeEach\` (or inside the test) — never in \`before\` — when each test needs its own fresh copy. The rest of this guide explains why that rule exists and how to work with it productively.

## What Is a Cypress Alias

An alias is a label you attach to a subject so you can refer back to it without re-querying. You create one by chaining \`.as('name')\` onto a command, and you read it back by passing \`'@name'\` to \`cy.get\` or, for primitive values, by accessing \`this.name\` in a function-style test.

\`\`\`ts
// Aliasing a DOM element
cy.get('[data-cy="submit-button"]').as('submitBtn');

// Later in the same test
cy.get('@submitBtn').click();
\`\`\`

The leading \`@\` tells Cypress "this is an alias, not a CSS selector." Without it, \`cy.get('submitBtn')\` would look for a \`<submitBtn>\` element and fail. The alias name itself is just a string; pick names that describe intent (\`@activeUser\`, \`@createOrderRequest\`) so the test reads like prose.

Aliases come in four flavors, and Cypress treats each slightly differently when you retrieve it:

| Alias type | Created from | Retrieved with | Resets each test |
|---|---|---|---|
| DOM element | \`cy.get(...).as()\` | \`cy.get('@name')\` | Yes |
| Route / intercept | \`cy.intercept(...).as()\` | \`cy.wait('@name')\` | Yes |
| Stub / spy | \`cy.stub().as()\`, \`cy.spy().as()\` | \`cy.get('@name')\` | Yes |
| Primitive value | \`cy.wrap(value).as()\` | \`this.name\` or \`cy.get('@name')\` | Yes |

The final column is the crux of this article: every alias type resets before each test. There is no exception. Understanding when "before each test" happens, and how to opt into longer-lived data when you genuinely need it, is what separates reliable suites from flaky ones.

## How cy.as() Registers an Alias

When you call \`.as('name')\`, Cypress stores a reference to the current command's subject in an internal alias map scoped to the running test. For DOM elements it stores enough information to re-run the original query when you later retrieve the alias, which is how Cypress avoids stale element errors in most cases. For intercepts it stores the route matcher and a queue of intercepted requests. For primitives wrapped with \`cy.wrap\`, it stores the value and also sets it as a property on the test's \`this\` context.

\`\`\`ts
describe('alias registration', () => {
  it('stores a value on the test context', function () {
    cy.wrap({ id: 7, name: 'Ada' }).as('user');

    // Retrieve via cy.get (yields the value into the command chain)
    cy.get('@user').should('deep.equal', { id: 7, name: 'Ada' });

    // Retrieve synchronously via this (only works with function, not arrow)
    cy.then(function () {
      expect(this.user.name).to.equal('Ada');
    });
  });
});
\`\`\`

Two retrieval styles exist for a reason. \`cy.get('@user')\` yields the value into the asynchronous command queue, so it composes with other Cypress commands and assertions. \`this.user\` reads the value synchronously from the Mocha context, which is convenient when you need a plain JavaScript value to build a request body or compute an expectation. The \`this\` style only works inside \`function () {}\` callbacks, never arrow functions, because arrow functions do not bind their own \`this\`. This single detail causes a large share of "alias is undefined" bugs, and we return to it in the gotchas section.

## Why Aliases Reset Before Each Test

Cypress resets aliases between tests on purpose, and the reason is test isolation. Each test should start from a clean, predictable state so that it passes or fails based only on its own logic, not on side effects left behind by tests that happened to run earlier. If aliases persisted, a test could accidentally depend on an alias another test created, and the suite would behave differently depending on run order, \`.only\`, or parallelization. By wiping aliases before every test, Cypress guarantees that \`@user\` means whatever the current test defined it to mean, and nothing else.

The reset is part of a broader cleanup Cypress performs before each test: it also clears the DOM, resets the page, and (by default in Cypress 12+) clears cookies, local storage, and session state via test isolation. Aliases are simply one more piece of per-test state that gets reset.

This is why the placement of \`.as()\` matters so much. Consider these two setups:

\`\`\`ts
describe('alias scope', () => {
  // WRONG for per-test aliases: runs once, alias is cleared before test 2
  before(function () {
    cy.wrap('shared-token').as('token');
  });

  it('test 1 can read the alias', function () {
    expect(this.token).to.equal('shared-token'); // passes
  });

  it('test 2 CANNOT read the alias', function () {
    expect(this.token).to.equal('shared-token'); // FAILS: this.token is undefined
  });
});
\`\`\`

\`before\` runs a single time for the whole \`describe\` block. The alias it creates is wiped during the per-test reset before test 2, so test 2 sees \`undefined\`. The fix is \`beforeEach\`, which re-creates the alias fresh for every test:

\`\`\`ts
describe('alias scope (fixed)', () => {
  beforeEach(function () {
    cy.wrap('shared-token').as('token');
  });

  it('test 1 reads the alias', function () {
    expect(this.token).to.equal('shared-token'); // passes
  });

  it('test 2 reads the alias', function () {
    expect(this.token).to.equal('shared-token'); // passes
  });
});
\`\`\`

The table below contrasts the two hooks so you can choose correctly at a glance.

| Hook | Runs | Alias availability | Use when |
|---|---|---|---|
| \`before\` | Once per describe | Only in the first test | Expensive one-time setup that does NOT need per-test aliases |
| \`beforeEach\` | Before every test | Every test gets a fresh alias | Each test needs its own copy of the aliased subject |

## Retrieving Aliases with @ and cy.get

Retrieval is where aliases earn their keep. The \`cy.get('@name')\` form re-resolves the alias and yields it into the command chain, retrying like any other Cypress query. For DOM aliases this means Cypress re-runs the original selector, so even if React re-rendered the element, \`cy.get('@submitBtn')\` finds the current node rather than a detached one.

\`\`\`ts
it('re-resolves DOM aliases after re-render', () => {
  cy.get('[data-cy="counter"]').as('counter');
  cy.get('@counter').should('have.text', '0');

  cy.get('[data-cy="increment"]').click(); // triggers re-render
  cy.get('@counter').should('have.text', '1'); // re-resolved, not stale
});
\`\`\`

For intercept aliases you retrieve with \`cy.wait('@name')\`, which blocks until a matching request completes and yields the intercepted request/response so you can assert on it:

\`\`\`ts
it('waits on a named request and asserts the response', () => {
  cy.intercept('GET', '/api/products').as('getProducts');
  cy.visit('/products');

  cy.wait('@getProducts').then((interception) => {
    expect(interception.response?.statusCode).to.equal(200);
    expect(interception.response?.body).to.have.length.greaterThan(0);
  });
});
\`\`\`

You can also alias the same value as both a \`this\` property and a chainable subject. The general guidance: use \`cy.get('@name')\` when you want the value inside the Cypress chain (for clicks, assertions, further queries), and \`this.name\` when you want a synchronous plain value to construct data. Mixing them freely in the same test is fine as long as the alias was defined earlier in that test.

## Aliasing cy.intercept for Network-Aware Tests

The most impactful use of aliases is naming network requests with \`cy.intercept(...).as()\`. This converts implicit timing assumptions into explicit synchronization points. Instead of guessing how long an API call takes and inserting arbitrary waits, you wait on the named intercept, and Cypress proceeds the instant the request resolves.

\`\`\`ts
describe('product search', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/products*').as('search');
    cy.visit('/products');
    cy.wait('@search'); // initial load complete before any test logic
  });

  it('filters results and waits on the filtered request', () => {
    cy.intercept('GET', '/api/products?q=phone').as('searchPhone');
    cy.get('[data-cy="search-input"]').type('phone');
    cy.wait('@searchPhone');
    cy.get('[data-cy="result"]').should('have.length.greaterThan', 0);
  });
});
\`\`\`

Stubbed responses combine aliasing with fixtures so a test controls exactly what the server returns. This makes tests deterministic and fast because no real backend is involved:

\`\`\`ts
it('renders the stubbed product list', () => {
  cy.intercept('GET', '/api/products', { fixture: 'products.json' }).as('getProducts');
  cy.visit('/products');
  cy.wait('@getProducts');
  cy.get('[data-cy="result"]').should('have.length', 3); // matches fixture
});
\`\`\`

A subtle but important point: like all aliases, intercept aliases reset before each test, but the intercept registration itself must also be re-declared each test. Declaring \`cy.intercept(...).as()\` in \`beforeEach\` (or at the top of the test) ensures both the route stub and its alias exist for that test. Declaring it once in \`before\` leaves later tests with no active interception at all.

You can wait on the same alias multiple times to assert on sequential requests. Each \`cy.wait('@search')\` consumes the next matching request in order, which is how you verify that, say, three search calls fired as the user typed:

\`\`\`ts
it('fires a request per debounced keystroke', () => {
  cy.intercept('GET', '/api/products*').as('search');
  cy.get('[data-cy="search-input"]').type('abc', { delay: 300 });
  cy.wait('@search'); // request for 'a...'
  cy.wait('@search'); // request for 'ab...'
  cy.wait('@search'); // request for 'abc'
});
\`\`\`

## Aliasing Stubs and Spies

When testing components that accept callbacks or call functions, alias a \`cy.stub()\` or \`cy.spy()\` so you can assert it was called. This is the React-component-testing equivalent of network assertions.

\`\`\`tsx
it('calls onSave with the form values', () => {
  const onSave = cy.stub().as('onSave');
  cy.mount(<SettingsForm onSave={onSave} />);

  cy.get('[data-cy="name"]').type('Grace Hopper');
  cy.get('[data-cy="save"]').click();

  cy.get('@onSave').should('have.been.calledOnceWith', { name: 'Grace Hopper' });
});
\`\`\`

The \`@onSave\` retrieval yields the stub so Cypress-Sinon assertions like \`have.been.calledOnceWith\` work. As with every alias, the stub is gone in the next test, so create it fresh each time — which is natural here because you create a new stub per mount anyway.

## The Gotchas That Cause Flaky Tests

Most alias bugs reduce to a handful of recurring mistakes. Knowing them by name makes diagnosis fast.

**Defining aliases in \`before\` instead of \`beforeEach\`.** Covered above and worth repeating because it is the number one cause of "alias undefined in test 2." If each test needs the alias, use \`beforeEach\`.

**Arrow functions breaking \`this\`.** Accessing \`this.user\` requires a regular function so Mocha can bind its context. Arrow functions inherit \`this\` lexically, so \`this.user\` is \`undefined\`. Use \`function ()\` for any test or hook that reads aliases via \`this\`, or sidestep the issue entirely with \`cy.get('@user')\`.

\`\`\`ts
// WRONG: arrow function, this.user is undefined
beforeEach(() => {
  cy.wrap({ name: 'Ada' }).as('user');
});
it('reads user', () => {
  // expect(this.user) -> TypeError, this is not the Mocha context
});

// RIGHT: function keyword preserves Mocha's this
beforeEach(function () {
  cy.wrap({ name: 'Ada' }).as('user');
});
it('reads user', function () {
  expect(this.user.name).to.equal('Ada');
});
\`\`\`

**Assuming an alias persists across tests for performance.** It is tempting to alias an expensive setup once and reuse it. Aliases will not do this — they reset. If you truly need cross-test data (for example, an auth token created once), capture it into a closure variable or use \`cy.session\`, not an alias.

\`\`\`ts
describe('cross-test data done right', () => {
  let token: string;
  before(() => {
    cy.request('POST', '/api/login', { user: 'a', pass: 'b' }).then((res) => {
      token = res.body.token; // closure variable persists across tests
    });
  });
  it('uses the token in test 1', () => {
    cy.request({ url: '/api/me', headers: { Authorization: \`Bearer \${token}\` } });
  });
  it('uses the token in test 2', () => {
    cy.request({ url: '/api/orders', headers: { Authorization: \`Bearer \${token}\` } });
  });
});
\`\`\`

**Retrieving a DOM alias after the element is truly removed.** Cypress re-resolves DOM aliases by re-running the selector, but if the element no longer exists at all, retrieval fails. Re-alias after navigations that replace the page, or assert existence before acting.

**Forgetting that \`cy.wait('@x')\` consumes one request.** Each wait advances to the next matching request. If you wait fewer times than requests fired, later assertions may read an earlier response; if you wait more times than requests fired, the extra wait times out. Match your waits to the expected number of calls.

## Aliasing Fixtures and Composing Aliases

Aliases pair naturally with \`cy.fixture\`, which loads a JSON file from \`cypress/fixtures\` into the test. Aliasing the loaded fixture lets you reference the same canned data in multiple places — stubbing a response, typing values into a form, and asserting on the rendered result — without re-reading the file. Because the fixture alias is recreated each test, every test gets a clean, unmutated copy of the data, which is exactly what you want for isolation.

\`\`\`ts
describe('checkout with fixture alias', () => {
  beforeEach(() => {
    cy.fixture('order.json').as('order');
  });

  it('stubs the API and asserts the rendered total', function () {
    // Use the fixture as the stubbed response
    cy.intercept('GET', '/api/orders/123', { fixture: 'order.json' }).as('getOrder');

    cy.visit('/orders/123');
    cy.wait('@getOrder');

    // Use the same fixture data to build the expectation
    const total = this.order.items.reduce(
      (sum: number, item: { price: number; qty: number }) => sum + item.price * item.qty,
      0
    );
    cy.get('[data-cy="order-total"]').should('contain', total.toFixed(2));
  });
});
\`\`\`

You can also compose aliases — derive a new alias from an existing one. This is useful when a test extracts a value from a response and reuses it across several later steps. The derived alias is just another \`.as()\` call on a yielded subject, and like all aliases it lives only for the current test.

\`\`\`ts
it('derives an alias from a response value', () => {
  cy.intercept('POST', '/api/orders').as('createOrder');
  cy.get('[data-cy="place-order"]').click();

  cy.wait('@createOrder').then((interception) => {
    const id = interception.response?.body.id as string;
    cy.wrap(id).as('orderId'); // derived alias for reuse below
  });

  cy.get('@orderId').then((orderId) => {
    cy.visit(\`/orders/\${orderId}\`);
  });
  cy.get('@orderId').then((orderId) => {
    cy.get('[data-cy="order-ref"]').should('contain', orderId as unknown as string);
  });
});
\`\`\`

The pattern of waiting on an intercept, extracting a value, wrapping it as an alias, and reusing it is the backbone of multi-step flows that depend on server-generated identifiers. It keeps the test linear and readable while still flowing data from one step to the next.

## Debugging Aliases When Things Go Wrong

When an alias misbehaves, the Cypress command log is your first stop. Every \`.as()\` call shows up in the runner with a small route or DOM badge, and every \`cy.get('@name')\` or \`cy.wait('@name')\` shows what it resolved to. If a retrieval shows "no alias found," the alias either was never defined in this test (often the \`before\` vs \`beforeEach\` trap) or the name has a typo. Cypress alias names are case-sensitive, so \`@getUser\` and \`@getuser\` are different aliases.

A second class of confusion comes from timing. \`cy.get('@name')\` is a query and retries, but if you capture its yielded value into a closure with \`.then()\` and then read that closure variable much later, the value is a snapshot from when \`.then()\` ran, not a live reference. For DOM that can mean a detached node. The fix is to re-query the alias at the point of use rather than holding onto an old yielded reference.

\`\`\`ts
// Fragile: holds a snapshot that can go stale
cy.get('@row').then(($row) => {
  // ... many commands later, $row may be detached
});

// Robust: re-query the alias where you use it
cy.get('@row').find('[data-cy="status"]').should('have.text', 'Active');
\`\`\`

Finally, when waiting on intercepts, a timeout on \`cy.wait('@call')\` almost always means the request never matched the intercept's method/URL pattern, not that it was slow. Open the network panel, compare the actual request URL to your \`cy.intercept\` matcher, and widen the matcher (for example add a trailing \`*\` for query strings) until it matches. Getting comfortable reading these signals turns alias debugging from guesswork into a quick, mechanical diagnosis.

## Frequently Asked Questions

### Do Cypress aliases persist between tests?

No. Cypress clears all aliases before each test as part of test isolation, so an alias created in one \`it\` block does not exist in the next. This is intentional and prevents tests from depending on each other's state. If every test needs the same alias, recreate it in a \`beforeEach\` hook. For genuinely shared data like an auth token, use a closure variable or \`cy.session\` instead of an alias.

### Why is this.alias undefined in my test?

Almost always because you used an arrow function for the test or hook. Accessing \`this.alias\` requires Mocha's context, which is only bound when you use a regular \`function () {}\`. Arrow functions inherit \`this\` lexically and do not get the context, so the property reads as undefined. Switch to \`function ()\`, or retrieve the alias with \`cy.get('@alias')\` which does not depend on \`this\`.

### What is the difference between before and beforeEach for aliases?

\`before\` runs once for the entire describe block, so an alias it creates is wiped during the per-test reset and only survives for the first test. \`beforeEach\` runs before every test, recreating the alias fresh each time. For aliases that every test needs, always use \`beforeEach\`. Reserve \`before\` for one-time work that does not rely on per-test aliases, such as seeding a database.

### How do I retrieve a Cypress alias?

Prefix the alias name with \`@\` and pass it to a command. For DOM elements, stubs, and wrapped values use \`cy.get('@name')\`, which yields the subject into the command chain and retries. For intercepts use \`cy.wait('@name')\`, which blocks until a matching request completes and yields the interception. For primitive values you can also read \`this.name\` synchronously inside a \`function ()\` callback.

### How do aliases work with cy.intercept?

Chain \`.as('name')\` onto \`cy.intercept(...)\` to name a network route, then \`cy.wait('@name')\` to synchronize on it and assert on the request or response. Declare the intercept in \`beforeEach\` or at the top of the test because, like the alias, the interception itself must be re-registered each test. Each \`cy.wait('@name')\` consumes the next matching request in order, so you can wait multiple times to assert on sequential calls.

### Why does my DOM alias throw a detached element error?

Cypress re-resolves DOM aliases by re-running the original selector when you call \`cy.get('@alias')\`, which usually avoids stale references after re-renders. But if the element was removed entirely — for example after a route change that replaced the page — there is nothing to re-resolve and retrieval fails. Re-create the alias after such navigations, or assert the element exists before interacting with it.

### Can I share an alias across multiple describe blocks?

No, aliases are scoped to a single test and cleared before the next one, so they cannot be shared across tests or describe blocks. If multiple suites need the same setup, define the aliasing logic in a shared \`beforeEach\` (for example in a custom command or support file) so each test recreates its own copy, or store cross-test data in a module-level variable or \`cy.session\`.

### Should I use cy.get('@alias') or this.alias?

Use \`cy.get('@alias')\` when you need the value inside the Cypress command chain — for clicking, asserting, or further querying — because it composes with retry-able commands. Use \`this.alias\` when you need a synchronous plain JavaScript value to build a request body or compute an expectation, and only inside a \`function ()\` callback. Both are valid; the choice depends on whether you are working in the async chain or in synchronous code.

## Conclusion

Cypress aliases make tests readable and synchronize them with the network, but their defining behavior is that they reset before every test. Internalize that single rule and the rest falls into place: create per-test aliases in \`beforeEach\`, retrieve DOM and stub aliases with \`cy.get('@name')\`, wait on intercept aliases with \`cy.wait('@name')\`, use \`function ()\` whenever you touch \`this\`, and reach for closure variables or \`cy.session\` when you genuinely need data to outlive a single test.

Audit your suite for aliases declared in \`before\`, convert the ones that should be per-test, and replace arbitrary waits with named intercept waits — those two changes alone eliminate most alias-related flakiness. For more battle-tested Cypress patterns and ready-to-install testing skills for your AI coding agent, browse the [QASkills.sh skills directory](/skills) and the full library of guides on the [QASkills.sh blog](/blog).
`,
};
