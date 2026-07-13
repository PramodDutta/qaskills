import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Mock GraphQL Requests by Operation Name in Playwright',
  description:
    'Mock GraphQL requests by operation name in Playwright with typed fixtures, precise routing, variable checks, passthrough, and failure diagnostics.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Mock GraphQL Requests by Operation Name in Playwright

Three POST requests hit \`/graphql\` during the first page render. One loads the signed-in viewer, one fetches a product grid, and one records an impression. A URL-only Playwright route cannot tell them apart. The discriminating field is already in the JSON body: \`operationName\`.

Routing on that name makes the mock describe GraphQL behavior rather than transport coincidence. The test can fulfill \`ProductSearch\`, allow \`CurrentViewer\` to reach the test server, and abort an unexpected \`TrackImpression\`, even though all three share a method and endpoint.

## Read the GraphQL envelope, not query formatting

A conventional GraphQL-over-HTTP request contains \`query\`, optional \`variables\`, and often \`operationName\`. Clients may remove whitespace, inject \`__typename\`, reorder fragments, or send a persisted-query extension. Matching the raw query string makes tests sensitive to those transformations. Matching an operation's declared name is considerably more stable.

Playwright exposes the intercepted \`Request\` through \`route.request()\`. Its \`postDataJSON()\` method parses JSON request data and also understands form-encoded data. Treat the return value as unknown input: verify it is an object before reading fields. A malformed body should not crash a general-purpose router unless malformed input is what the test targets.

| Envelope field | Good test use | Fragility warning |
| --- | --- | --- |
| \`operationName\` | Select the resolver behavior to mock | Some anonymous operations omit it |
| \`variables\` | Verify cursor, filter, locale, or mutation input | Avoid asserting irrelevant generated defaults |
| \`query\` | Diagnose an unexpected operation | Formatting and client transforms can change it |
| \`extensions\` | Handle persisted-query metadata | Shape depends on client and server protocol |
| HTTP headers | Separate tenants or auth cases | Header matching alone does not identify an operation |

Name operations in production documents. \`query ProductSearch(...)\` and \`mutation AddLineItem(...)\` give observability tools, server logs, and tests the same label. Anonymous queries deny all three that useful handle.

## Build an operation-aware route

Install the route before navigation or before the user action that triggers the request. A handler registered afterward cannot catch an already dispatched query. The following example mocks only the product search and passes every other GraphQL request to the real test backend.

\`\`\`typescript
import { test, expect, type Route } from '@playwright/test';

type GraphQLBody = {
  operationName?: string;
  variables?: Record<string, unknown>;
};

function graphqlBody(route: Route): GraphQLBody | null {
  try {
    const body = route.request().postDataJSON();
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as GraphQLBody)
      : null;
  } catch {
    return null;
  }
}

test('shows an empty result for a discontinued category', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const body = graphqlBody(route);

    if (body?.operationName !== 'ProductSearch') {
      await route.continue();
      return;
    }

    expect(body.variables).toMatchObject({ category: 'DISCONTINUED' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          products: { edges: [], pageInfo: { hasNextPage: false } },
        },
      }),
    });
  });

  await page.goto('/catalog?category=discontinued');
  await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible();
});
\`\`\`

GraphQL application errors commonly arrive with HTTP 200 and an \`errors\` array, so do not automatically use status 500 for every resolver failure. Mock the layer your UI handles. A network outage can be represented by \`route.abort()\`. An HTTP gateway failure can use 502. A rejected mutation from GraphQL may return 200 with \`data: null\` and structured errors. Schema-nullability rules determine whether a partial data object is legal.

## Return a schema-shaped payload

A minimal mock is useful only when it remains valid enough to exercise the client. Apollo, Relay, urql, and custom caches may expect IDs, \`__typename\`, connection edges, and page information. Omitting those fields can create a failure that the real schema never would, or conceal cache normalization behavior.

Start from the operation's generated TypeScript result type when the project uses GraphQL Code Generator. The compiler then detects renamed fields and changed nullability in fixture builders. Do not import server resolver types as a substitute, because a client operation selects only part of the server schema and can use aliases.

| Response case | HTTP status | GraphQL body | Browser behavior to assert |
| --- | ---: | --- | --- |
| Successful query | 200 | \`{ data: ... }\` | Render selected fields |
| Domain validation error | Usually 200 | \`errors\`, possibly partial \`data\` | Inline validation or message |
| Unauthenticated gateway | 401 or 403 | Service-specific | Login or access-denied path |
| GraphQL service unavailable | 502 or 503 | May not be GraphQL JSON | Retry or outage state |
| Connection failure | None | No response | Offline network treatment |

If the application consumes error \`extensions.code\`, include the actual code contract in the mock. Avoid elaborate invented metadata. A mock should be narrower than production, but not fictional.

## Reuse a typed helper without hiding assertions

Copying a route callback into dozens of specs invites inconsistent passthrough behavior. A small helper can register one response per operation while allowing each test to inspect variables. Keep the helper explicit about whether unmatched traffic continues or fails.

\`\`\`typescript
import { expect, type Page } from '@playwright/test';

type OperationMock = {
  name: string;
  assertVariables?: (variables: Record<string, unknown>) => void;
  data?: unknown;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
};

export async function mockGraphQLOperation(page: Page, mock: OperationMock) {
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    const body = request.postDataJSON() as {
      operationName?: string;
      variables?: Record<string, unknown>;
    };

    if (body.operationName !== mock.name) {
      await route.continue();
      return;
    }

    mock.assertVariables?.(body.variables ?? {});
    await route.fulfill({
      status: 200,
      json: { data: mock.data ?? null, errors: mock.errors },
    });
  });
}

test('submits the selected shipping method', async ({ page }) => {
  await mockGraphQLOperation(page, {
    name: 'SelectShippingMethod',
    assertVariables: (variables) => {
      expect(variables).toMatchObject({ input: { methodId: 'express' } });
    },
    data: {
      selectShippingMethod: {
        __typename: 'Cart',
        id: 'cart-42',
        shippingMethod: { __typename: 'ShippingMethod', id: 'express' },
      },
    },
  });

  await page.goto('/checkout');
  await page.getByLabel('Express delivery').check();
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('Express delivery selected')).toBeVisible();
});
\`\`\`

The helper intentionally does not call \`page.unroute()\` because the page fixture is isolated per test. In a shared page or long scenario, remove routes when their phase ends. \`page.unroute('**/graphql')\` removes matching handlers, while \`page.unrouteAll()\` is broader and may disrupt unrelated instrumentation.

## Choose pass-through policy deliberately

Continuing unknown operations creates a hybrid test. It is convenient when only one unstable resolver needs control, but the result still depends on a reachable backend and seeded data. Failing unknown operations creates a hermetic UI test and immediately reveals new client traffic, but it requires mocks for startup queries and background telemetry.

There is no universally correct default. Encode the choice in helper names such as \`mockOperationAndContinueOthers\` or \`mockGraphQLStrictly\`. A hidden default wastes debugging time.

Playwright resolves multiple matching handlers in reverse registration order. A later route can call \`route.fallback()\` to let an earlier matching handler process the request, whereas \`route.continue()\` sends it to the network immediately. This matters when a suite has a general GraphQL observer plus a test-specific mock. Prefer one dispatcher per endpoint when possible because registration order is hard to see across fixtures.

The broader [Playwright network interception guide](/blog/playwright-network-interception-mocking-guide) covers routing scope, HAR replay, response modification, and service workers. For operation-name mocks, a single endpoint dispatcher remains easier to reason about than layers of wildcard routes.

## Handle aliases, batches, and persisted queries

Field aliases do not affect \`operationName\`. A document named \`query ProductCard\` can request \`displayPrice: price\` and still matches \`ProductCard\`. The mock response must use the response key \`displayPrice\` because clients see aliases, not the underlying schema field name.

HTTP batching changes the body from one envelope to an array of envelopes. A helper that blindly casts \`postDataJSON()\` to an object will miss it. If the production client enables batching, decide whether to return one response array for the complete batch or disable batching in the test environment. Partially fulfilling one member of a batch is not an HTTP operation because the client sent one request.

Persisted queries may omit the query document and send a hash in \`extensions.persistedQuery\`. Many clients still send \`operationName\`, so name routing continues to work. Test the fallback handshake separately if the server can answer \`PersistedQueryNotFound\` and the client then resends the full document.

Subscriptions commonly use WebSockets rather than the routed HTTP endpoint. \`page.route()\` will not mock WebSocket messages. Modern Playwright provides \`page.routeWebSocket()\` for WebSocket routing, but the message protocol, connection initialization, and subscription IDs require a purpose-built mock. Do not claim an HTTP operation router covers subscription behavior.

File uploads can use GraphQL multipart request format. \`postDataJSON()\` is not the right parser for a multipart body. Match the operation metadata in the multipart \`operations\` field only if upload mocking is needed, or run that scenario against an integration service.

## Assert variables at the contract boundary

Operation matching answers what request this is. Variables answer whether the UI sent the correct intent. For a cursor query, assert the cursor generated by clicking Next. For a mutation, check stable business inputs but ignore volatile client request IDs unless they are the behavior under test.

Use partial structural matching for large inputs. Exact equality becomes maintenance-heavy when the client adds an optional field. Conversely, a weak assertion such as checking only that \`variables\` exists can let a serious mapping bug pass. Select the fields that connect visible user behavior to the GraphQL contract.

A route callback assertion fails the test, but the browser request may appear stalled while Playwright unwinds the failure. For clearer diagnostics, include the operation and received variables in the assertion or collect observed operations. When strict mode sees an unexpected operation, fulfill a controlled error or throw with a list of accepted names.

Do not put secrets in diagnostic attachments. Variables can include tokens, email addresses, or payment details. Redact known keys before logging intercepted bodies.

## Keep mocks synchronized with the schema

Operation-name routing is stable, not self-validating. A hand-written payload can drift after a schema change. Compile client documents, validate them against the schema in CI, and type fixture builders from generated operation result types. Integration tests should still cover serialization, resolvers, authorization, and database behavior.

| Technique | Speed and isolation | Best coverage |
| --- | --- | --- |
| Operation-name \`page.route()\` mock | Fast, browser-local, deterministic | UI states and outgoing variables |
| Mock Service Worker GraphQL handler | Reusable across component and browser layers | Frontend network behavior |
| GraphQL test server with seeded database | Slower, realistic boundary | Schema, resolvers, auth, persistence |
| HAR replay | Convenient recording, payload-specific | Stable read traffic, not flexible mutations |
| Direct GraphQL API test | No browser, focused | Operation contract and server behavior |

Use several layers rather than asking route mocks to prove the server works. The [GraphQL testing guide](/blog/graphql-testing-complete-guide) covers schema validation, resolver tests, authorization, and end-to-end coverage beyond browser interception.

A mature suite usually has many fast UI scenarios backed by typed operation mocks, fewer server integration scenarios with real persistence, and a small set of full-path tests. That balance gives precise failures without letting invented responses become the only specification.

## Diagnose mocks that never trigger

First inspect the actual URL, method, resource type, and body in a trace. The endpoint may be \`/api/graphql\`, the client may use GET for persisted queries, or a service worker may intercept traffic before Playwright routing sees it. Register the route before navigation and consider \`browserContext.route()\` when popups or multiple pages issue requests.

Then print only the observed operation names. If the name is undefined, inspect whether the operation is anonymous, batched, multipart, or transformed into a persisted request. Do not immediately fall back to substring matching the whole query. Fix naming or implement the actual envelope variant.

If the handler triggers but the UI waits forever, validate the response shape and content type. Look for a missing connection field, aliased key, required \`__typename\`, or client code expecting an \`errors\` array. A successful route fulfill only proves an HTTP response was delivered, not that the cache accepted it.

Finally, check for competing routes. A broad handler registered later may consume the request first. Consolidating GraphQL behavior into one dispatcher often solves the issue and makes unknown-operation policy visible.

## Mock pagination as a sequence of named requests

Cursor pagination uses the same operation name repeatedly, so the variables distinguish pages. Keep a queue of expected cursors and responses inside the test. On the first \`ProductSearch\`, expect no cursor and return \`hasNextPage: true\` with an end cursor. After the user clicks Load more, expect that cursor and return the second edge set. This tests the client's variable handoff and append behavior, not just two static renders.

Fail when calls arrive out of order or exceed the prepared sequence. Silently returning the last fixture forever can hide an infinite-scroll loop. Because the route callback can be invoked concurrently, update sequence state synchronously before awaiting a fulfill when two requests could overlap.

For optimistic mutations, separate acknowledgement from cache behavior. The UI may show a new item before the mutation response. Delay the route with a controlled promise, assert the optimistic state, then release a schema-shaped success or error. Avoid arbitrary sleeps. A test-controlled barrier makes the intermediate state deterministic.

## Keep authentication and authorization real when needed

Fulfilling a route inside the browser bypasses the GraphQL server, including its authorization rules. That is ideal for UI states but cannot prove a member is forbidden from an admin mutation. Cover that rule with a server integration test or let the selected operation continue to a seeded backend.

A hybrid scenario can mock catalog data while allowing \`CurrentViewer\` and a sensitive mutation through. Document the boundary so reviewers do not infer end-to-end security coverage. When continuing a request, Playwright sends the browser's actual headers and cookies; the route mock does not need to copy them.

Be cautious with operation fixtures that embed user-specific secrets. Prefer synthetic IDs and roles. If an error response contains a path, use the real GraphQL path array, for example \`['updateUser']\`, but include it only if the client consumes or displays related behavior.

## Validate the strict dispatcher itself

Shared routers are test infrastructure and deserve focused tests. Exercise a known operation, an unknown operation, invalid JSON, a GET request, and a batched body if supported. Confirm unmatched policy is what its name promises. This prevents a helper refactor from accidentally sending all mocked traffic to the real backend.

Keep routing diagnostics concise: method, endpoint, and redacted operation name. Full query documents make logs noisy and can contain sensitive literal values. Attach the full body only in a secure failure artifact when it is required.

Finally, include the operation name in fixture filenames and test titles. When a schema diff breaks \`SelectShippingMethod\`, repository search should locate its mock without decoding a generic \`success.json\`. Clear naming also makes dead fixtures removable when client documents disappear.

Review the router whenever the GraphQL client changes transport settings. Enabling batching, persisted queries, uploads, or a service worker is a test-infrastructure change because the intercepted envelope can change even when operation documents do not. Pin that behavior in one focused smoke test.

## Frequently Asked Questions

### What if our GraphQL client sends no operationName?

Name every maintained operation where possible. For an unavoidable anonymous request, parse and inspect its document with a GraphQL parser or match a persisted-query hash. Raw substring matching is a last resort because formatting and transforms change.

### Should a mocked resolver error use HTTP 500?

Usually not. GraphQL execution errors are commonly represented in an \`errors\` array with HTTP 200, sometimes alongside partial data. Use 500, 502, or 503 when testing the corresponding transport or infrastructure failure.

### Can one route mock two operations on the same endpoint?

Yes. Use one callback that switches on \`operationName\` and fulfills each supported case. A central dispatcher avoids surprises from reverse route registration order.

### Why does my operation mock miss GraphQL subscriptions?

Most subscriptions travel over a WebSocket protocol, not an HTTP POST. Mock them with WebSocket-aware support or exercise a test subscription server. The HTTP route can still handle initial queries and mutations.

### Is checking operationName enough for a mutation test?

No. It selects the response, but the test should also assert the important mutation variables. Otherwise a broken form can send the wrong input and still receive a success fixture.
`,
};
