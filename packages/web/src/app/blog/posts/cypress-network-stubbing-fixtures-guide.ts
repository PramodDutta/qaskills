import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Network Stubbing Fixtures Guide for Deterministic Tests',
  description: 'Use this Cypress network stubbing fixtures guide to model API states, assert requests, control timing, and build deterministic tests without hiding defects.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Cypress Network Stubbing Fixtures Guide for Deterministic Tests

Cypress network stubbing works by registering \`cy.intercept()\` before the application sends a matching request, supplying a static response or route handler, assigning an alias, and waiting on that alias to assert the request-response cycle. Fixtures provide reusable response data, either through \`cy.fixture()\` or the \`fixture\` property of a static response. The payoff is deterministic coverage of loading, success, empty, validation, and server-error states without depending on a mutable shared backend.

The strongest Cypress network stubbing fixtures guide is not a catalog of syntax. It explains test boundaries. A stubbed browser test proves how the client behaves for a controlled protocol exchange. It does not prove the deployed API actually returns that exchange. Keep a smaller set of live integration or end-to-end checks for real wiring, and use contract tests or schema checks so fixtures do not drift away from production.

This article builds a realistic orders workflow with typed waits, route matching, dynamic handlers, error and delay simulation, GraphQL routing, fixture governance, and debugging for the familiar failure where Cypress says no request ever occurred. Every example favors observable events over arbitrary sleeps, which makes the workflow useful to QA engineers and AI coding agents maintaining large suites.

## Draw the boundary between stubbed and live network tests

Begin by deciding what evidence the test must produce. If the requirement is “the order page shows retry guidance after a 503,” a stub is precise and repeatable. If the requirement is “the browser, gateway, authorization layer, service, and database can create an order together,” a live path is necessary.

| Test boundary | Network behavior | Strong evidence | Blind spot |
|---|---|---|---|
| Fully stubbed UI scenario | Cypress supplies all API responses | Client rendering and state transitions | Real service wiring and deployed contract |
| Selectively stubbed scenario | One dependency controlled, others live | Client behavior around a difficult edge | Interactions among stubbed and live state |
| Live browser end to end | Requests reach test environment | Integrated critical journey | Hard-to-force rare failures, greater variability |
| API contract test | Provider or consumer contract exercised | Request and response compatibility | Browser presentation |
| Component test with intercept | Mounted client component uses browser network layer | Focused data-fetch behavior | Full navigation and deployment routing |

A balanced suite uses each boundary intentionally. Stub rare and destructive conditions, such as depleted inventory or repeated server errors. Keep a concise live smoke path for the main purchase journey. The [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) can help teams decide where Cypress fits among their other runners, but the important local decision is which system owns each assertion.

Write the boundary in the test name. “Shows retry after order API returns 503” communicates controlled client behavior. “Checkout works” overclaims when every service response is a fixture.

## Register the intercept before the triggering action

Network timing is the first source of missing-intercept failures. If page load triggers \`GET /api/orders\`, define the route before \`cy.visit()\`. Alias the route and wait for it instead of sleeping for an assumed number of milliseconds.

\`\`\`json
// cypress/fixtures/orders/active.json
{
  "items": [
    {
      "id": "ord-101",
      "customerName": "Asha Rao",
      "status": "processing",
      "totalMinor": 4299,
      "currency": "INR"
    }
  ],
  "nextCursor": null
}
\`\`\`

\`\`\`ts
describe('orders page', () => {
  it('renders an active order from the API response', () => {
    cy.intercept('GET', '/api/orders*', {
      fixture: 'orders/active.json',
    }).as('getOrders');

    cy.visit('/orders');

    cy.wait('@getOrders').then(({ request, response }) => {
      expect(request.method).to.equal('GET');
      expect(response?.statusCode).to.equal(200);
    });

    cy.contains('Asha Rao').should('be.visible');
    cy.contains('processing').should('be.visible');
  });
});
\`\`\`

The intercept both controls the response and creates an observable synchronization point. \`cy.wait('@getOrders')\` waits for the matching request and response rather than a fixed duration. After the wait, the DOM assertions verify the user-visible effect.

The wildcard in \`/api/orders*\` admits query parameters. That convenience can be too broad if the application also calls \`/api/orders/stats\`. Prefer a route matcher object when method, pathname, and query need independent meaning.

\`\`\`ts
cy.intercept(
  {
    method: 'GET',
    pathname: '/api/orders',
    query: {
      status: 'processing',
    },
  },
  { fixture: 'orders/active.json' },
).as('getProcessingOrders');
\`\`\`

Use the simplest matcher that expresses the contract without swallowing neighboring traffic. Including the HTTP method prevents a read stub from accidentally matching a write to the same path.

## Choose inline bodies, fixtures, or generated responses deliberately

Not every response belongs in a JSON file. Inline bodies keep a tiny scenario beside its assertions. Fixtures are valuable for larger, reviewed examples shared across related tests. Route handlers are appropriate when the response depends on request data, call count, or computed state.

| Response source | Best use | Review advantage | Maintenance risk |
|---|---|---|---|
| Inline object | Small empty or error body | Entire scenario visible in one file | Repetition across many specs |
| JSON fixture | Representative reusable payload | Clean diff and domain review | Can drift from API contract |
| \`cy.fixture()\` plus modification | Base object with per-test variation | Reuses valid shape | Mutation can leak intent across setup |
| Route handler | Request-dependent or sequenced response | Models behavior, not only data | Complex handlers become fake servers |
| Live response observation | Integrated happy path | Detects real deployment mismatch | Environment instability and limited edge control |

An empty state is clearer inline:

\`\`\`ts
it('shows guidance when no orders match the filter', () => {
  cy.intercept('GET', '/api/orders*', {
    statusCode: 200,
    body: { items: [], nextCursor: null },
  }).as('getEmptyOrders');

  cy.visit('/orders?status=cancelled');
  cy.wait('@getEmptyOrders');

  cy.contains('h1, h2', 'No cancelled orders').should('be.visible');
  cy.contains('a', 'Clear filters').should('be.visible');
});
\`\`\`

A rich order detail with nested shipment and payment data may deserve a fixture. Name it after the scenario, not a vague number such as \`order-1.json\`. Names such as \`partially-refunded.json\` or \`shipment-delayed.json\` tell reviewers why the data exists.

Keep fixture data minimal but realistic. Include fields the client reads, fields contract validation requires, and fields needed to reveal serialization bugs. Do not paste a production payload containing personal data, secrets, irrelevant fields, or unstable backend metadata.

## Assert outbound requests, not just rendered success

A success message can appear even when the client sends the wrong payload, especially if the stub always returns 201. Waiting on the alias yields an interception object with request and response information. Assert the protocol fields that the client owns.

\`\`\`ts
type CreateOrderRequest = {
  sku: string;
  quantity: number;
  delivery: 'standard' | 'express';
};

type CreateOrderResponse = {
  id: string;
  status: 'accepted';
};

it('submits the selected delivery option', () => {
  cy.intercept('POST', '/api/orders', {
    statusCode: 201,
    body: { id: 'ord-202', status: 'accepted' },
  }).as('createOrder');

  cy.visit('/checkout');
  cy.get('input[name="sku"]').type('keyboard-75');
  cy.get('input[name="quantity"]').clear().type('2');
  cy.get('input[type="radio"][value="express"]').check();
  cy.contains('button', 'Place order').click();

  cy.wait<CreateOrderRequest, CreateOrderResponse>('@createOrder')
    .then(({ request, response }) => {
      expect(request.body).to.deep.equal({
        sku: 'keyboard-75',
        quantity: 2,
        delivery: 'express',
      });
      expect(response?.statusCode).to.equal(201);
    });

  cy.contains('Order ord-202 was accepted').should('be.visible');
});
\`\`\`

The generic request and response types improve editor assistance, but they do not validate runtime data. A mistaken fixture can still satisfy TypeScript through an assertion or loose inference. Add schema or contract validation where compatibility matters.

Avoid asserting headers owned by the browser or gateway unless the client explicitly controls them. Good outbound assertions cover path parameters, query semantics, JSON body, idempotency keys, content type when set by application code, and allowed authorization shape without exposing credentials.

The locator choices in the example use accessible roles and labels. If the suite struggles with selectors independently of networking, the [Playwright locator practices guide](/blog/playwright-best-practices-locators-2026) offers transferable principles even though Cypress command syntax differs.

## Model failure, latency, and retry states precisely

Stubbed tests earn their cost when they cover states that are difficult or unsafe to create against a live environment. Use explicit status, headers, and bodies so the scenario resembles the real contract.

\`\`\`ts
it('keeps the form data after a temporary service failure', () => {
  cy.intercept('POST', '/api/orders', {
    statusCode: 503,
    headers: { 'content-type': 'application/json' },
    body: {
      code: 'ORDER_SERVICE_UNAVAILABLE',
      message: 'Try again shortly',
    },
  }).as('createOrderUnavailable');

  cy.visit('/checkout');
  cy.get('input[name="sku"]').type('mouse-pro');
  cy.contains('button', 'Place order').click();
  cy.wait('@createOrderUnavailable');

  cy.get('[role="alert"]').should('contain.text', 'Try again');
  cy.get('input[name="sku"]').should('have.value', 'mouse-pro');
  cy.contains('button', 'Place order').should('be.enabled');
});
\`\`\`

For loading behavior, a static response can include a delay through the documented static-response capability. Choose a small delay long enough for the loading state to be observable, and keep the assertion tied to the network event.

\`\`\`ts
it('announces loading while order history is pending', () => {
  cy.intercept('GET', '/api/orders/history', {
    statusCode: 200,
    delay: 800,
    body: { items: [] },
  }).as('getHistory');

  cy.visit('/orders/history');
  cy.get('[role="status"]').should('contain.text', 'Loading order history');

  cy.wait('@getHistory');
  cy.get('[role="status"]').should('not.exist');
});
\`\`\`

This is one of the rare cases where intentional response delay is useful. \`cy.wait(800)\` would be the wrong mechanism because it assumes timing instead of observing the alias. If the product renders the loading state too briefly to test without a controlled delay, the network stub provides the needed condition.

Distinguish HTTP failures from transport failures. An HTTP 503 is a completed response and should drive server-error handling. A forced network error represents disconnection or request failure and should drive offline or connectivity handling. Test each only if the application presents meaningfully different behavior.

## Sequence retries with a stateful route handler

Retry behavior requires different responses to successive matching requests. A closure scoped to the test can track call count. Keep it small and assert the number of attempts so the handler does not become an unverified fake backend.

\`\`\`ts
it('retries once after a temporary order lookup failure', () => {
  let attempts = 0;

  cy.intercept('GET', '/api/orders/ord-303', (request) => {
    attempts += 1;

    if (attempts === 1) {
      request.reply({
        statusCode: 503,
        body: { code: 'TEMPORARY_FAILURE' },
      });
      return;
    }

    request.reply({
      statusCode: 200,
      body: { id: 'ord-303', status: 'processing' },
    });
  }).as('getOrder');

  cy.visit('/orders/ord-303');
  cy.wait('@getOrder');
  cy.wait('@getOrder');

  cy.then(() => {
    expect(attempts).to.equal(2);
  });
  cy.contains('processing').should('be.visible');
});
\`\`\`

Each \`cy.wait('@getOrder')\` waits for the next matching request. This is clearer than adding two aliases for the same route. If the client uses delayed exponential backoff, control application time through Cypress's clock facilities only when the timers are accessible and the test is designed for it. Do not make the test wait real production backoff intervals.

Route definition order matters when matchers overlap. Cypress's interception lifecycle processes middleware routes first and other matching routes in reverse order of definition. A later scenario-specific intercept can therefore override an earlier broad stub. Rather than relying on subtle overlap, make route matchers mutually clear when possible.

| Retry defect | Observable assertion | Stub design |
|---|---|---|
| No retry after transient error | Two requests expected, only one arrives | First 503, second 200 |
| Infinite retry loop | Request count exceeds policy | Handler fails after allowed attempts and count is checked |
| Retry loses request body | Compare bodies across attempts | Capture each request in handler |
| Duplicate successful UI action | One success message and one state transition | Second response succeeds |
| Non-retryable 400 is retried | Exactly one request | Always return validation response |

What people get wrong is allowing every call after the first to succeed without checking the total count. The UI may issue three or ten requests and the test still passes after it sees success. Assert the retry policy, not just the eventual screen.

## Keep fixtures aligned with the API contract

A fixture is executable test data, but it is also a local copy of someone else's contract. Drift is inevitable if fields change and only live environments know. Put ownership and validation around fixtures.

Useful governance rules include:

- Store fixtures by API domain and scenario, not by spec filename.
- Remove personal data and secrets at creation time.
- Keep the minimum fields required by the documented schema and client behavior.
- Validate fixture JSON against the same schema used for API compatibility checks when practical.
- Review fixture changes beside client parsing changes.
- Include an explicit example for nullable, optional, empty, and error fields the client supports.

If the provider publishes JSON Schema or OpenAPI, use a repository-supported validator in a dedicated test. The exact library is less important than using the provider's source of truth and failing when fixture shape becomes impossible.

\`\`\`ts
import activeOrders from '../fixtures/orders/active.json';
import { validateOrdersPage } from '../../src/contracts/orders';

describe('order fixture contract', () => {
  it('keeps the active-orders fixture compatible', () => {
    const result = validateOrdersPage(activeOrders);
    expect(result.ok).to.equal(true);
  });
});
\`\`\`

The \`validateOrdersPage\` function is project-owned in this example, not a Cypress API. It might wrap generated schema validation or the same runtime parser the application uses. The important property is that validation does not simply cast the object to a TypeScript type.

Cypress loads fixture files once and assumes they remain unchanged. Overwriting a fixture during a test does not cause an already loaded fixture response to refresh. For dynamic data, load a base object and reply with a controlled object, or use a route handler. Never make tests communicate by editing shared fixture files.

## Handle GraphQL without matching every POST identically

GraphQL often sends queries and mutations to one POST endpoint. Matching method and URL alone cannot distinguish operations. Inspect the request body in a route handler and alias or reply according to the operation name used by the application.

\`\`\`ts
cy.intercept('POST', '/graphql', (request) => {
  const operationName = request.body?.operationName;

  if (operationName === 'OrdersPage') {
    request.alias = 'ordersPageQuery';
    request.reply({
      statusCode: 200,
      body: {
        data: {
          orders: {
            nodes: [{ id: 'ord-404', status: 'SHIPPED' }],
          },
        },
      },
    });
  }
});

cy.visit('/orders');
cy.wait('@ordersPageQuery')
  .its('request.body.variables')
  .should('deep.equal', { first: 20 });
\`\`\`

Require operation names in application documents if the testing convention depends on them. String-searching raw query text is brittle because whitespace, formatting, and build transformation can change. Assert variables that drive behavior, but avoid snapshots of the entire GraphQL document unless its exact text is a contract.

GraphQL can return HTTP 200 with an \`errors\` array, so test application error handling according to GraphQL response semantics. Do not model every failure as an HTTP 500 merely because that is convenient.

## Diagnose the intercept that never matches

A common failure reads like this: the UI loads data, but \`cy.wait('@getOrders')\` times out. The backend log shows the request. The stub clearly did not own it.

Work from observable facts:

1. Confirm the intercept is registered before the click, mount, or visit that triggers traffic.
2. Inspect the Cypress Command Log and browser network details for the actual method and URL.
3. Replace a complex matcher temporarily with a narrow pathname and correct method to isolate query mismatch.
4. Check whether a service worker, cache, server-side render, or application preload satisfied data before browser interception.
5. Search for overlapping intercepts and inspect definition order.
6. Confirm the application issued a new request rather than reusing client cache.
7. Restore a precise matcher and assert the yielded request.

\`\`\`ts
cy.intercept({ method: 'GET', pathname: '/api/orders' }, (request) => {
  request.continue();
}).as('observeOrders');

cy.visit('/orders');
cy.wait('@observeOrders').then(({ request }) => {
  expect(request.query).to.have.property('pageSize');
});
\`\`\`

This temporary spy lets the real request continue while revealing what Cypress matched. Once understood, replace it with the intended stub. If no browser request exists because server-side rendering fetched the data, \`cy.intercept()\` is the wrong seam for that exchange. Test the browser's hydrated result or control the server dependency through an appropriate environment mechanism.

Another failure occurs when the route matches too much. A broad \`/api/**\` intercept returns an orders fixture for a feature-flag request, producing a confusing application error. The Command Log's matched-route information and assertions on \`request.url\` expose this quickly. Tighten method and pathname instead of layering more broad intercepts.

## Design a maintainable network-stub layer

Custom commands can reduce noise, but do not hide the route, status, or alias behind a magical “mock everything” helper. A test reviewer should see which dependency is controlled and which event is awaited.

A typed helper returning the alias name can remain transparent:

\`\`\`ts
// cypress/support/network.ts
export function stubOrdersPage(
  fixture: string,
  status = 'processing',
): string {
  cy.intercept(
    {
      method: 'GET',
      pathname: '/api/orders',
      query: { status },
    },
    { fixture },
  ).as('getOrdersPage');

  return '@getOrdersPage';
}
\`\`\`

The scenario remains readable:

\`\`\`ts
it('renders processing orders', () => {
  const ordersRequest = stubOrdersPage(
    'orders/active.json',
    'processing',
  );

  cy.visit('/orders?status=processing');
  cy.wait(ordersRequest);
  cy.contains('Asha Rao').should('be.visible');
});
\`\`\`

Avoid a global default that silently stubs every endpoint for every spec. It can hide new requests, prevent live coverage, and make test ownership mysterious. If a component requires several standard dependencies, group them in an explicit scenario builder whose return value lists aliases to await.

For AI-assisted maintenance, state guardrails in the task: register before action, wait by alias, assert the outbound contract, use a named scenario fixture, and do not add fixed sleeps. Ask the agent to report whether the test proves stubbed client behavior or a live integration. That single distinction prevents many overclaimed tests.

## Frequently Asked Questions

### Should every Cypress test stub network requests?

No. Stubbed tests are excellent for deterministic client states, rare failures, destructive conditions, and focused request assertions. They cannot prove that the deployed browser, gateway, authentication, service, and database work together. Keep a smaller live set for critical journeys and use API or contract tests for compatibility. Label each test boundary honestly. A broad suite of fast stubs plus a focused live smoke layer is usually more informative than making every scenario fully mocked or fully dependent on a shared environment.

### When should I use a fixture instead of an inline response?

Use an inline body when the payload is small and the scenario is clearer with data next to assertions, such as an empty list or concise error. Use a fixture for a larger representative payload shared by related cases or reviewed as domain data. Use a route handler when output depends on request content or call sequence. Whatever form you choose, validate important examples against the provider contract and remove personal or secret data. A TypeScript type alone does not validate fixture JSON at runtime.

### Why does cy.wait report that no matching request occurred?

The intercept may have been registered after the request, the method or URL matcher may be wrong, another intercept may overlap, or the browser may not have issued a request because data came from cache, a service worker, or server-side rendering. Inspect the Command Log and actual network event, temporarily spy with a simpler precise matcher, then restore the intended route. Do not add a longer timeout until you prove the request exists and matches. Waiting longer cannot correct a missing or mistargeted intercept.

### Can I change a fixture file during a Cypress test?

Cypress assumes fixture files are unchanged and loads them once, so overwriting a fixture does not refresh data already loaded for a stub. Dynamic scenarios should load a base value, create a controlled copy, and reply with that object, or use a route handler that computes responses by call count or request body. Avoid test-to-test communication through fixture mutation. It makes order matter, behaves differently under parallel execution, and leaves the repository working tree dirty after failures.
`,
};
