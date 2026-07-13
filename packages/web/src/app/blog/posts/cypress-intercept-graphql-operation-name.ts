import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Intercept GraphQL Requests by Operation Name in Cypress',
  description:
    'Intercept GraphQL requests by operation name in Cypress to stub one query or mutation, preserve unrelated traffic, and make network assertions precise.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Intercept GraphQL Requests by Operation Name in Cypress

Three different requests hit \`POST /graphql\` while a product page opens. One loads the viewer, another fetches inventory, and the third records a recommendation impression. A URL matcher sees three identical requests. The GraphQL document sees three different operations. Cypress tests become precise only when the intercept examines that document and routes on \`operationName\`.

Operation-aware routing lets a test stub \`GetInventory\` while allowing \`CurrentViewer\` to reach the real server. It also produces meaningful aliases such as \`@gqlUpdateCart\`, so a failed wait tells you which business exchange never occurred. This tutorial uses Cypress's real \`cy.intercept()\`, per-request \`req.alias\`, \`req.reply()\`, and \`cy.wait()\` APIs.

## What is actually sent to a GraphQL endpoint

A conventional JSON GraphQL request has a query document, optional variables, and often an operation name. The transport still uses HTTP, usually one shared POST route.

\`\`\`json
{
  "operationName": "GetInventory",
  "variables": { "sku": "TSHIRT-BLUE-M" },
  "query": "query GetInventory($sku: ID!) { inventory(sku: $sku) { available } }"
}
\`\`\`

The top-level \`operationName\` selects an operation when the document contains multiple named operations. Many clients send it even when the document contains only one. That makes it a cleaner discriminator than searching the query text, but a defensive helper can support both shapes.

| Request shape | Reliable discriminator | Caveat |
|---|---|---|
| Standard JSON body | \`body.operationName\` | Client may omit it for a single operation |
| Named query text only | Parse or conservatively inspect \`body.query\` | Whitespace and comments vary |
| JSON batch | Each element's \`operationName\` | One HTTP response contains several results |
| Persisted query | \`operationName\` plus extensions/hash | Full query text may be absent |
| Multipart upload | Parsed operations form field | Cypress may expose a non-object body |

Name every operation in application code. Anonymous operations make diagnostics, observability, persisted-query management, and targeted stubbing harder. The name should describe product intent, not a generated component identifier that changes during refactoring.

## Build a small operation matcher

Keep matching logic outside individual specs so edge cases are fixed once. Avoid \`query.includes(name)\` as the primary test: a variable, fragment, comment, or neighboring operation can contain the same string. Prefer the explicit field and use a boundary-aware fallback only for clients that omit it.

\`\`\`typescript
// cypress/support/graphql.ts
import type { CyHttpMessages } from 'cypress/types/net-stubbing';

type GraphQLBody = {
  operationName?: string;
  query?: string;
  variables?: Record<string, unknown>;
};

export function isOperation(
  req: CyHttpMessages.IncomingHttpRequest,
  operationName: string,
): boolean {
  const body = req.body as GraphQLBody | undefined;
  if (!body || typeof body !== 'object') return false;
  if (body.operationName === operationName) return true;
  if (typeof body.query !== 'string') return false;

  const escaped = operationName.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
  const namedOperation = new RegExp(
    \`\\\\b(query|mutation|subscription)\\\\s+\${escaped}\\\\b\`,
  );
  return namedOperation.test(body.query);
}

export function aliasOperation(
  req: CyHttpMessages.IncomingHttpRequest,
): void {
  const body = req.body as GraphQLBody | undefined;
  if (body?.operationName) req.alias = \`gql\${body.operationName}\`;
}
\`\`\`

The regex escaping line is ordinary JavaScript protection if an unusual operation name reaches the helper. GraphQL names normally contain letters, digits, and underscores, and cannot start with a digit. The function still treats the incoming value as data.

If your test stack compiles Cypress support code without the internal net-stubbing type path, type the minimum request surface locally instead. Runtime behavior does not depend on that import. Do not weaken the whole Cypress project to \`any\` merely to type a three-field helper.

## Alias each request, not the whole endpoint

A route alias attached with \`.as('graphql')\` labels every matching endpoint request the same way. A per-request alias assigned inside the handler identifies the operation that actually arrived. Cypress documents this as especially useful for GraphQL.

\`\`\`typescript
// cypress/e2e/product.cy.ts
import { aliasOperation } from '../support/graphql';

describe('product availability', () => {
  beforeEach(() => {
    cy.intercept('POST', '/graphql', (req) => {
      aliasOperation(req);
    });
  });

  it('requests inventory for the selected size', () => {
    cy.visit('/products/blue-shirt');
    cy.findByRole('button', { name: 'Medium' }).click();

    cy.wait('@gqlGetInventory').then(({ request, response }) => {
      expect(request.body.variables).to.deep.equal({
        sku: 'TSHIRT-BLUE-M',
      });
      expect(response?.statusCode).to.eq(200);
      expect(response?.body.errors).to.be.undefined;
      expect(response?.body.data.inventory.available).to.eq(true);
    });

    cy.findByRole('button', { name: 'Add to cart' }).should('be.enabled');
  });
});
\`\`\`

Register the intercept before the action that can send the request. For initial page queries, that means before \`cy.visit()\`. If registration happens afterward, the browser can complete a fast request before Cypress has a route, and \`cy.wait()\` will time out even though the application behaved correctly.

The network assertion and UI assertion answer different questions. The first proves that the chosen SKU was transported and accepted without GraphQL errors. The second proves that the user sees an enabled action. Retain both when the request contract matters to the scenario.

The [Cypress intercept network stubbing reference](/blog/cypress-intercept-network-stubbing-reference) covers handler ordering and response control in more depth. For schema, resolver, and transport layers beyond the browser, use the [complete GraphQL testing guide](/blog/graphql-testing-complete-guide).

## Stub one query while all other operations continue

The most useful pattern is selective stubbing. Match the endpoint broadly, inspect the operation, reply only for the target, and allow the handler to finish without replying for everything else. Cypress then sends unmatched operations upstream.

\`\`\`typescript
// cypress/e2e/inventory-error.cy.ts
import { isOperation } from '../support/graphql';

it('keeps the product visible when inventory is unavailable', () => {
  cy.intercept('POST', '/graphql', (req) => {
    if (!isOperation(req, 'GetInventory')) return;

    req.alias = 'inventoryFailure';
    req.reply({
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: {
        data: { inventory: null },
        errors: [
          {
            message: 'Inventory service unavailable',
            path: ['inventory'],
            extensions: { code: 'SERVICE_UNAVAILABLE' },
          },
        ],
      },
    });
  });

  cy.visit('/products/blue-shirt');
  cy.wait('@inventoryFailure');
  cy.findByRole('heading', { name: 'Blue shirt' }).should('be.visible');
  cy.findByText('Availability cannot be checked right now').should('be.visible');
  cy.findByRole('button', { name: 'Add to cart' }).should('be.disabled');
});
\`\`\`

GraphQL application errors normally arrive with HTTP 200 and an \`errors\` array, possibly alongside partial \`data\`. A transport failure such as 503 is a different condition and should be tested separately if the client presents it differently. Returning a 500 for every negative resolver case teaches the UI a protocol the real server may never use.

The response must match the schema's nullability. If \`inventory\` is non-null, a resolver error may null a parent field rather than only that leaf. Capture a representative real response or consult the schema before inventing the stub. A syntactically valid but structurally impossible fixture creates false confidence.

## Assert mutations by variables and response semantics

Mutation tests should inspect business inputs, not the full serialized query. Generated clients can alter whitespace, field order, or fragments without changing behavior. Variables are usually the durable contract.

Suppose \`UpdateCart\` receives \`input\` and returns a cart plus typed user errors. The test can alias it, let the server execute, then assert both the request and the resolver result:

\`\`\`typescript
it('sends the selected quantity to UpdateCart', () => {
  cy.intercept('POST', '/graphql', (req) => {
    if (req.body?.operationName === 'UpdateCart') {
      req.alias = 'gqlUpdateCart';
    }
  });

  cy.visit('/cart');
  cy.findByLabelText('Quantity for Blue shirt').select('3');

  cy.wait('@gqlUpdateCart').then(({ request, response }) => {
    expect(request.body.variables.input).to.include({
      lineId: 'line-blue-shirt',
      quantity: 3,
    });
    expect(response?.body.errors).to.be.undefined;
    expect(response?.body.data.updateCart.userErrors).to.deep.equal([]);
    expect(response?.body.data.updateCart.cart.totalQuantity).to.eq(3);
  });

  cy.findByText('3 items').should('be.visible');
});
\`\`\`

Do not assert volatile correlation IDs, trace headers, or every response field unless the feature depends on them. Deep-equality against an entire generated request makes a browser test fail when a harmless selection set changes. Assert the variables and response paths tied to the user outcome.

## Handle repeated operations without ambiguous waits

Autocomplete, pagination, polling, and retry logic can send the same operation more than once. \`cy.wait('@gqlSearch')\` consumes the next matching alias in order. That is helpful, but the test must trigger and inspect the intended request.

For debounced search, type a term, wait for the corresponding call, and assert its variables. If the UI sends an earlier request for a partial term, wait calls can bind to the wrong exchange. Control the clock when the debounce is the behavior under test, or assert all captured aliases after the interaction using \`cy.get('@alias.all')\` where supported by your Cypress version.

| Repetition source | Stable test tactic | Weak tactic to avoid |
|---|---|---|
| Pagination | Assert cursor on each ordered wait | Counting endpoint calls only |
| Automatic retry | Stub first error and second success deliberately | Adding an arbitrary sleep |
| Polling | Use clock control or stop after known response | Waiting for “some” request |
| Search debounce | Advance the debounce interval, assert final variables | Matching query text fragments |
| React development behavior | Assert user result and relevant operation | Assuming mount always sends once |

When call count itself is a requirement, collect a counter inside the route handler and assert it after the UI reaches a settled state. Be careful: Cypress command scheduling means a plain assertion placed too early can run before traffic finishes. Anchor it after a visible terminal state or an expected wait.

## Account for persisted queries and batching

Persisted-query clients may send an operation name, variables, and a hash under \`extensions.persistedQuery\`, omitting the document. Matching \`body.query\` then silently fails. Prefer \`operationName\`, and if you validate the hash, treat it as generated build output that may legitimately change.

Batching changes the unit of interception. The request body can be an array of operations, while the response body is an array whose order corresponds to the request. Setting one alias on the HTTP request cannot make Cypress expose each element as a separate request. A batch-aware handler should locate the array index, then modify the response at that same index if selective stubbing is truly necessary.

Selective batch modification is more complex than ordinary \`req.reply()\` because the upstream response may be needed for non-target elements. In that case use \`req.continue((res) => { ... })\` and adjust only the matching result. Keep such code in a tested support helper. If batching itself is not under test, disabling it in the test configuration can produce clearer browser specifications, but record that difference from production.

File upload requests commonly use multipart form data with an \`operations\` JSON field. Do not assume \`req.body.operationName\` exists there. Either test uploads through UI and assert the resulting behavior, or parse the known multipart representation with a purpose-built helper. A helper designed for JSON should return false safely, not throw.

## Know when a network stub is the wrong layer

An intercept proves client behavior against a controlled transport response. It does not execute schema validation, authorization middleware, resolver code, database constraints, or downstream services. Balance selective stubs with real integration coverage.

| Approach | Executes resolvers | Determinism | Primary value |
|---|---:|---:|---|
| Cypress \`cy.intercept()\` fixture | No | High | UI states and client request construction |
| Cypress pass-through plus assertions | Yes, in test backend | Medium | Browser-to-GraphQL integration |
| Resolver/service test | Yes, selected unit | High | Business branches and error mapping |
| GraphQL operation integration test | Yes | Medium to high | Schema, auth, resolver, and persistence contract |
| Schema composition or breaking-change check | No runtime request | High | Detecting incompatible schema evolution |

Use a real backend for one successful critical path and targeted stubs for difficult states such as partial data, delayed responses, or a typed business error. If every browser test stubs GraphQL, a renamed field can break production while the fixtures continue satisfying the old UI.

## Diagnose the failures that look like matching bugs

If an alias never appears, inspect the browser's request in the Cypress command log. Confirm registration occurred before the action, the method and URL matcher fit, and the body is parsed JSON. Then print or assert \`req.body\` temporarily. Common causes include an absolute endpoint that does not match \`/graphql\`, a GET request for queries, persisted operations without query text, a service worker, or batching.

If the alias appears but the stub loses to another handler, review route ordering. Cypress matches ordinary intercept routes in reverse definition order, while middleware routes run first. Broad support-file handlers and spec-specific handlers can overlap. Give the spec override a deliberate registration position and keep global handlers observational unless they must modify traffic.

If \`cy.wait()\` succeeds but the UI never updates, inspect the response fixture against the schema and client cache keys. Missing \`id\` or \`__typename\` fields can affect normalized caches. The defect may be in the fixture, not in waiting.

## Keep fixtures aligned with generated operations

Handwritten GraphQL fixtures drift because a selected field can disappear from the operation while remaining in JSON, or a new required UI field can be filled with an unrealistic default. If the application generates TypeScript types from operation documents, type each fixture against the generated result. Compilation then catches many selection-set changes before Cypress opens a browser.

Schema-valid is not automatically scenario-valid. A cart with a negative quantity might satisfy a scalar while violating domain rules. Build a small fixture factory with valid defaults, then let each spec override only fields that create its state. Avoid one enormous “user with everything” object shared by unrelated operations.

Record the operation name in fixture filenames, for example \`GetInventory.success.json\` and \`GetInventory.partial-error.json\`. This makes ownership obvious during review. When the backend uses persisted documents, compare the fixture type against the checked-in operation rather than the whole schema.

## Observe cache-driven requests carefully

A client cache can satisfy an operation without HTTP, so waiting for an alias is correct only when network activity is part of the requirement. If the scenario returns to an already loaded product, the absence of a second \`GetInventory\` call may be desirable. Assert the visible cached state and, if important, confirm the alias collection did not grow.

Conversely, a mutation can update the cache optimistically before the response arrives. A UI assertion immediately after clicking may pass even when the server later rejects the change. Wait for the named mutation and assert its response before declaring persistence successful. To test rollback, delay or reject that operation and verify the optimistic state is replaced by the server-backed error state.

Keep cache policy out of generic intercept helpers. The helper identifies traffic; the spec decides whether zero, one, or several requests represent correct behavior.

## Frequently Asked Questions

### Is checking req.body.operationName enough for all GraphQL clients?

No. It is the best first check for standard JSON requests, but some clients omit the field, batch operations, use GET query parameters, or send multipart uploads. Design the matcher for the transports your application actually emits and make unsupported shapes fail visibly.

### Can Cypress intercept a subscription operation over WebSocket?

\`cy.intercept()\` handles HTTP network requests, not individual WebSocket messages. It may observe the initial HTTP upgrade, but operation-level subscription testing needs a controllable subscription server, a client abstraction, or WebSocket-specific instrumentation.

### Why does my GraphQL error stub return HTTP 200?

GraphQL execution can succeed at the HTTP layer while reporting field or resolver failures in the response \`errors\` array. Match the real server's behavior. Use non-200 responses separately for gateway, authentication transport, or infrastructure failure paths.

### How should I name aliases when an operation runs several times?

Keep one semantic alias such as \`gqlLoadMoreProducts\` and consume occurrences in order with separate waits, asserting the cursor for each. If concurrent calls make ordering nondeterministic, assign aliases conditionally from variables or collect the requests and assert them as a set.

### Should operation fixtures contain every field in the schema?

They should contain the fields selected by that client operation, with realistic nullability and cache identity fields. Extra schema fields add maintenance without improving the test. Generate or validate fixtures against operation types where practical.
`,
};
