import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Intercept GraphQL Batch Requests in Playwright',
  description: 'Learn playwright intercept graphql batch requests workflows for mocking, asserting, and debugging batched operations without hiding API contract drift.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# How to Intercept GraphQL Batch Requests in Playwright

To playwright intercept graphql batch requests, install a Playwright route for the GraphQL endpoint before navigation, parse the POST body, detect whether the payload is a single operation object or an array of operation objects, then fulfill, continue, or inspect the request based on operation names and variables. Batched GraphQL changes the usual interception problem because one HTTP request can carry several logical operations, and the response is commonly an array whose order matches the request order.

The practical goal is not "mock GraphQL" in the abstract. The goal is to control one test boundary without lying to yourself. You might mock a slow recommendations operation while letting the account query hit a real test backend. You might assert that a checkout page batches three reads into one request. You might fail fast when an unexpected mutation appears inside a batch. Each workflow needs a slightly different handler.

This article focuses on Playwright browser tests in TypeScript. For direct HTTP API coverage below the browser, use the [Supertest Node API testing complete guide](/blog/supertest-node-api-testing-complete-guide). For provider and consumer expectations that should survive UI refactors, use the [Pact contract testing complete guide](/blog/contract-testing-pact-complete-guide). Playwright interception is excellent for browser-level control, but it should not be your only proof that the GraphQL contract is correct.

## Know What a Batched GraphQL Request Looks Like

Most GraphQL clients send a single operation as a JSON object with fields such as \`operationName\`, \`query\`, and \`variables\`. Batched clients send a JSON array of those objects to the same HTTP endpoint. The server responds with a JSON array where each item corresponds to the operation at the same index. The exact batching behavior depends on the client and server configuration, but the testing concern is consistent: one network event can represent multiple API facts.

\`\`\`json
[
  {
    "operationName": "CurrentUser",
    "variables": {},
    "query": "query CurrentUser { viewer { id name } }"
  },
  {
    "operationName": "UnreadNotifications",
    "variables": { "limit": 5 },
    "query": "query UnreadNotifications($limit: Int!) { notifications(limit: $limit) { id title } }"
  }
]
\`\`\`

The common mistake is writing a route handler that assumes \`request.postDataJSON().operationName\` always exists. That works until batching is enabled, then the handler sees an array and silently misses the operation. Another mistake is fulfilling a batched request with a single object response. The UI may fail with a client-side parsing error that looks unrelated to the route.

| Payload shape | Request body | Response shape | Test implication |
| --- | --- | --- | --- |
| Single query | Object | Object | Match one operation and fulfill one result |
| Single mutation | Object | Object | Assert variables carefully before fulfilling |
| Query batch | Array of objects | Array of results | Preserve response order |
| Mixed batch | Array with queries and mutations | Array of results | Decide whether mutations may be mocked |
| Persisted operation batch | Array with ids or extensions | Array of results | Match on operation metadata you can trust |

Treat the batch as a mini protocol. Your handler should classify it, validate the operations you care about, and make an explicit decision for operations you do not own in that test.

## Install the Route Before the Page Can Call GraphQL

Playwright route handlers must be registered before the application sends the request you want to intercept. In most browser tests, that means calling \`page.route\` or \`context.route\` before \`page.goto\`. Use \`context.route\` when multiple pages or popups in the same context can call the API. Use \`page.route\` when the route is local to one page.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('dashboard renders from a batched GraphQL response', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const request = route.request();
    const body = request.postDataJSON();
    const operations = Array.isArray(body) ? body : [body];

    if (!operations.some((operation) => operation.operationName === 'DashboardSummary')) {
      await route.fallback();
      return;
    }

    const response = operations.map((operation) => {
      if (operation.operationName === 'DashboardSummary') {
        return {
          data: {
            dashboardSummary: {
              openBugs: 7,
              flakyTests: 3,
              releaseRisk: 'medium',
            },
          },
        };
      }

      return {
        data: {},
      };
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(Array.isArray(body) ? response : response[0]),
    });
  });

  await page.goto('/dashboard');

  await expect(page.getByText('7 open bugs')).toBeVisible();
  await expect(page.getByText('3 flaky tests')).toBeVisible();
});
\`\`\`

This example intentionally returns an array only when the original request was an array. If the app sends a single operation, the response remains a single result object. That lets one handler support both client modes while still respecting the protocol shape.

The \`route.fallback()\` call matters when you want other route handlers or the real network to handle requests outside the test boundary. If your test must fail on any unexpected GraphQL operation, fulfill with an error or throw after recording enough details. Do not silently return empty data for unknown operations unless the product truly handles that scenario.

## Write a Small Operation Parser Instead of Copying Handler Logic

Once a suite has more than one batched GraphQL test, route handlers become repetitive. Build a parser that normalizes the payload into an array and keeps the original shape. Keep it simple. It should not become a GraphQL client implementation.

\`\`\`ts
type GraphQLOperation = {
  operationName?: string;
  query?: string;
  variables?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
};

type ParsedGraphQLBody = {
  isBatch: boolean;
  operations: GraphQLOperation[];
};

export function parseGraphQLBody(body: unknown): ParsedGraphQLBody {
  if (Array.isArray(body)) {
    return {
      isBatch: true,
      operations: body as GraphQLOperation[],
    };
  }

  return {
    isBatch: false,
    operations: [body as GraphQLOperation],
  };
}

export function graphQLResponseBody(parsed: ParsedGraphQLBody, results: unknown[]) {
  return JSON.stringify(parsed.isBatch ? results : results[0]);
}
\`\`\`

With a parser, individual tests can focus on intent: which operations are expected, what data they receive, and whether unexpected operations should fail the test.

\`\`\`ts
import { test } from '@playwright/test';
import { graphQLResponseBody, parseGraphQLBody } from './support/graphql-route';

test('empty project list shows the onboarding state', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const parsed = parseGraphQLBody(route.request().postDataJSON());

    const results = parsed.operations.map((operation) => {
      if (operation.operationName === 'ProjectList') {
        return { data: { projects: [] } };
      }

      if (operation.operationName === 'CurrentUser') {
        return { data: { viewer: { id: 'user-1', name: 'Maya' } } };
      }

      return {
        errors: [{ message: 'Unexpected operation in test route' }],
      };
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: graphQLResponseBody(parsed, results),
    });
  });

  await page.goto('/projects');
});
\`\`\`

This helper does not validate GraphQL syntax, schema, or response types. That is intentional. Playwright is intercepting browser traffic, not replacing schema governance. Use schema checks, generated types, contract tests, and provider tests for deeper API correctness.

## Match by Operation Name, Then Assert Variables

\`operationName\` is the most readable routing key when the client sends it. For queries and named mutations, it usually maps cleanly to the product action. But operation name alone is not enough when variables determine the business state. A test that mocks \`UpdateUserRole\` should assert the role and user id it is pretending to update.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('admin promotes a user through the GraphQL mutation', async ({ page }) => {
  const seenMutations: unknown[] = [];

  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON();
    const operations = Array.isArray(body) ? body : [body];

    const results = operations.map((operation) => {
      if (operation.operationName !== 'UpdateUserRole') {
        return { data: {} };
      }

      seenMutations.push(operation.variables);
      expect(operation.variables).toEqual({
        userId: 'user-42',
        role: 'admin',
      });

      return {
        data: {
          updateUserRole: {
            id: 'user-42',
            role: 'admin',
          },
        },
      };
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(Array.isArray(body) ? results : results[0]),
    });
  });

  await page.goto('/admin/users/user-42');
  await page.getByRole('button', { name: 'Promote to admin' }).click();

  await expect.poll(() => seenMutations.length).toBe(1);
});
\`\`\`

The assertion inside the route handler will fail the test if the UI sends the wrong variables. That is useful for browser-level confidence, but use it carefully. Throwing too early can hide the page state that caused the wrong request. When debugging a new failure, record the variables and assert after the user action, so the trace still contains the full interaction.

| Matching signal | Use it when | Watch out for |
| --- | --- | --- |
| \`operationName\` | Operations are named and sent by the client | Persisted queries may omit or alter it |
| \`variables\` | Business state matters | Avoid brittle comparison of irrelevant fields |
| Query text | Operation name is missing | Formatting and client transforms may change |
| Extensions metadata | Persisted query or client metadata is stable | Shape is client-specific |
| Request headers | Tenant, auth, or experiment route matters | Do not assert secrets in logs |

Do not match on the entire query string unless you own the client generation and want the test to fail on query shape changes. Exact query matching is often too sensitive for browser tests because whitespace, fragment order, and generated aliases can change without a user-visible regression.

## Preserve Batch Order When Fulfilling Responses

The most important mechanical rule for batch mocking is order preservation. If the request body is \`[CurrentUser, ProjectList, Notifications]\`, the response array must contain the result for \`CurrentUser\` first, \`ProjectList\` second, and \`Notifications\` third. Returning a map keyed by operation name is convenient for your test code, but the HTTP response still needs an ordered array.

\`\`\`ts
type GraphQLResult = {
  data?: Record<string, unknown>;
  errors?: Array<{ message: string }>;
};

const resultByOperationName: Record<string, GraphQLResult> = {
  CurrentUser: {
    data: { viewer: { id: 'user-1', name: 'Priya' } },
  },
  ProjectList: {
    data: { projects: [{ id: 'project-1', name: 'Release QA' }] },
  },
  Notifications: {
    data: { notifications: [] },
  },
};

export function resultsForBatch(operations: Array<{ operationName?: string }>) {
  return operations.map((operation) => {
    const name = operation.operationName;
    if (name && resultByOperationName[name]) {
      return resultByOperationName[name];
    }

    return {
      errors: [{ message: 'No mock result for operation' }],
    };
  });
}
\`\`\`

This pattern gives you readable fixtures while preserving the protocol. It also handles repeated operations. If the same operation appears twice with different variables, operation name alone is not enough. Include a fixture resolver function that inspects variables.

\`\`\`ts
function projectListResult(variables: Record<string, unknown> | undefined) {
  if (variables?.status === 'archived') {
    return {
      data: { projects: [{ id: 'old-1', name: 'Legacy migration' }] },
    };
  }

  return {
    data: { projects: [{ id: 'active-1', name: 'Checkout rewrite' }] },
  };
}

export function resolveGraphQLResult(operation: {
  operationName?: string;
  variables?: Record<string, unknown>;
}) {
  if (operation.operationName === 'ProjectList') {
    return projectListResult(operation.variables);
  }

  return {
    data: {},
  };
}
\`\`\`

What people get wrong is treating a batch like a bag. Order still matters even when your test code uses a map for readability. Keep the map inside the resolver. Emit an ordered array at the network boundary.

## Decide Whether Unknown Operations Fall Through or Fail

There are two honest strategies for operations that the test did not explicitly mention. A strict test fails unknown operations and proves the UI only asks for the expected data. A hybrid test falls through for unknown operations and controls only the operation under test. Both are valid. The dangerous version is accidental leniency, where a route returns empty data for everything and the UI appears to pass while important requests are broken.

| Strategy | Handler behavior | Best for | Failure signal |
| --- | --- | --- | --- |
| Strict mock | Fulfill every operation, unknown returns GraphQL error | Deterministic UI state tests | Unexpected operation appears |
| Hybrid pass-through | Mock selected operations, fallback otherwise | Live integration with one controlled edge case | Backend or network can still fail |
| Spy only | Continue all requests after recording details | Performance or batching assertions | Assertion after the interaction |
| Abort unexpected | Abort request or throw | Security-sensitive mutation boundaries | Immediate hard failure |

For hybrid pass-through, you cannot partially fulfill one operation inside a batch and let the other operations in that same HTTP request continue to the server. The batch is one HTTP request. If you need one operation mocked and the others live, you must either fulfill the entire batch with results for all operations or change the application/client setup for that test so the operation is not batched with live operations.

\`\`\`ts
import { test } from '@playwright/test';

test('recommendations timeout state is controlled in a batch', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON();
    const operations = Array.isArray(body) ? body : [body];

    const includesRecommendations = operations.some((operation) => {
      return operation.operationName === 'Recommendations';
    });

    if (!includesRecommendations) {
      await route.fallback();
      return;
    }

    const results = operations.map((operation) => {
      if (operation.operationName === 'Recommendations') {
        return {
          errors: [{ message: 'Recommendations service timed out' }],
        };
      }

      if (operation.operationName === 'CurrentUser') {
        return { data: { viewer: { id: 'user-1', name: 'Sam' } } };
      }

      return { data: {} };
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(Array.isArray(body) ? results : results[0]),
    });
  });

  await page.goto('/home');
});
\`\`\`

That limitation surprises teams migrating from REST interception. With separate REST requests, one route can mock \`/recommendations\` and another can let \`/me\` hit the network. With GraphQL batching, those logical calls may share one envelope. Test design needs to account for the envelope.

## Use Spy Routes to Prove Batching Behavior

Not every interception needs to mock. Sometimes you want to prove the application sends a batch instead of three separate GraphQL requests, or that a mutation is not batched with background queries. A spy route records request bodies and uses \`route.continue()\` or \`route.fallback()\` to let traffic proceed.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('dashboard sends initial read operations as one batch', async ({ page }) => {
  const graphQLBodies: unknown[] = [];

  await page.route('**/graphql', async (route) => {
    graphQLBodies.push(route.request().postDataJSON());
    await route.continue();
  });

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const initialBatch = graphQLBodies.find((body) => {
    return Array.isArray(body) && body.length >= 2;
  });

  expect(initialBatch).toBeTruthy();
});
\`\`\`

Use this sparingly. Batching is often a performance behavior, not a user requirement. It is worth asserting when request shape affects rate limits, server load, or an incident you already experienced. It is over-specified when the UI would be correct with either one request or several.

If you only need to wait for a GraphQL operation, \`page.waitForResponse\` can inspect responses, but it is less ergonomic for body-based routing because the predicate receives the response. For operation-level request inspection, route handlers and request events are usually clearer.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('save action sends the expected mutation once', async ({ page }) => {
  const mutations: Array<Record<string, unknown>> = [];

  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON();
    const operations = Array.isArray(body) ? body : [body];

    for (const operation of operations) {
      if (operation.operationName === 'SaveProfile') {
        mutations.push(operation.variables);
      }
    }

    await route.continue();
  });

  await page.goto('/profile');
  await page.getByLabel('Display name').fill('Asha');
  await page.getByRole('button', { name: 'Save profile' }).click();

  await expect.poll(() => mutations.length).toBe(1);
});
\`\`\`

When a spy fails, inspect whether the application used a service worker, a different endpoint, a GET request, or a persisted-query transport you did not account for. Playwright's network routing documentation notes that service workers can make network events appear missing to route interception, so disabling service workers for these tests may be necessary when a service worker owns the request path.

## Model GraphQL Errors Explicitly

GraphQL can return HTTP 200 with an \`errors\` array, partial \`data\`, or both. Do not model every failure as HTTP 500 unless the client behavior truly depends on transport failure. If you are testing field-level authorization, validation, or resolver failure, a GraphQL error payload is usually the realistic shape.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('billing page shows authorization error from a batched operation', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON();
    const operations = Array.isArray(body) ? body : [body];

    const results = operations.map((operation) => {
      if (operation.operationName === 'BillingSummary') {
        return {
          data: { billingSummary: null },
          errors: [
            {
              message: 'Not authorized to view billing',
              path: ['billingSummary'],
            },
          ],
        };
      }

      return { data: {} };
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(Array.isArray(body) ? results : results[0]),
    });
  });

  await page.goto('/billing');

  await expect(page.getByRole('alert')).toContainText('not authorized');
});
\`\`\`

Reserve HTTP failures for network, gateway, authentication envelope, or server availability cases. This distinction matters because many GraphQL clients have different retry and cache behavior for GraphQL errors versus transport errors.

| Failure type | Mock shape | UI behavior to assert |
| --- | --- | --- |
| Resolver validation | HTTP 200 with \`errors\` | Field or form-level message |
| Partial data | HTTP 200 with \`data\` and \`errors\` | Partial render plus warning |
| Unauthorized operation | HTTP 200 or auth-specific transport behavior, depending on app | Permission message or redirect |
| Gateway outage | HTTP 502, 503, or failed request as appropriate | Full-page or section retry state |
| Malformed response | Invalid JSON or wrong content type | Defensive error handling |

Do not invent a shape because it is convenient for the UI. Pull one real error response from a test server, sanitize it, and use that as the fixture when possible. Browser mocks should make failures reproducible, not imaginary.

## Keep Fixtures Small and Reviewable

GraphQL responses can become enormous because clients ask for nested objects, fragments, and lists. A Playwright mock only needs the fields the UI reads in that scenario. Overlarge fixtures slow reviews and hide the one field that matters. Underlarge fixtures can create false confidence if the client would require a missing field in production. The compromise is typed fixture builders that name the scenario and include realistic required fields.

\`\`\`ts
type UserFixture = {
  id: string;
  name: string;
  role: 'member' | 'admin';
};

export function currentUserResult(user: UserFixture) {
  return {
    data: {
      viewer: {
        id: user.id,
        name: user.name,
        role: user.role,
        __typename: 'User',
      },
    },
  };
}

export function projectListResult(names: string[]) {
  return {
    data: {
      projects: names.map((name, index) => ({
        id: 'project-' + String(index + 1),
        name,
        __typename: 'Project',
      })),
    },
  };
}
\`\`\`

If your frontend uses generated TypeScript types from the GraphQL schema, use those types in fixture builders. Do not claim exact generator settings in a shared article, because teams use different clients and codegen tools. The principle is stable: let the schema-derived types make missing or misspelled fields visible before the browser test runs.

Review every fixture with three questions: is the operation name obvious, are variables asserted when they matter, and does the fixture include only fields relevant to the UI path? If a fixture answers none of those questions, it probably belongs in a lower-level API or contract test instead.

## Debug the Failure Mode Where the Handler Never Runs

A realistic failure mode looks like this: the test registers \`page.route('**/graphql')\`, navigates, and still the app calls the real backend. The assertion fails because production-like data appears. Start with endpoint matching. The app may call \`/api/graphql\`, a full CDN URL, or a tenant-specific path. Log request URLs with a broad temporary route or Playwright request event.

Next, check timing. If the route is registered after \`page.goto\`, startup queries may already be gone. Register before navigation. If a popup or new page performs the request, use \`context.route\`. If a service worker owns the request path, route interception may not see the network event as expected. Create a dedicated browser context for these tests and configure service workers according to Playwright's documented network guidance when interception visibility matters.

\`\`\`ts
import { test } from '@playwright/test';

test('temporary network probe for GraphQL routing', async ({ page }) => {
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('graphql')) {
      console.log({
        method: request.method(),
        url,
        postData: request.postData(),
      });
    }
  });

  await page.goto('/dashboard');
});
\`\`\`

Then check payload shape. Log whether \`postDataJSON()\` returns an array. If it throws, the request may not be JSON, or the endpoint may be receiving multipart upload traffic. Do not force a batch parser onto GraphQL file uploads or subscriptions. Those transports need a separate testing strategy.

Finally, check route ordering. Multiple route handlers can interact. A broad handler that fulfills every request before the GraphQL handler runs will mask it. Keep handlers local to the test when possible and prefer narrow URL patterns.

## A Workflow for AI Coding Agents

When asking an AI coding agent to add a batched GraphQL interception test, give it the operation names, variable requirements, and pass-through policy. Do not just say "mock GraphQL." The agent needs to know whether the batch should be strict, hybrid, or spy-only.

\`\`\`md
Add a Playwright test for /projects onboarding.

GraphQL route rules:
- Intercept POST requests to **/graphql before page.goto.
- The request may be a single object or an array batch.
- Mock CurrentUser and ProjectList.
- ProjectList must receive variables { "status": "active" }.
- If any other operation appears in the same batch, return a GraphQL error result.
- Preserve array response order when the request body is an array.
- Use role locators for page assertions.
\`\`\`

That prompt reduces the most expensive review problems: wrong response shape, unknown operations hidden by empty data, and variable assertions omitted. Still review the output against the protocol. Agents can produce convincing code that fulfills a batched request with a single object, or code that returns results in a different order from the operations.

For larger suites, put the parser, result resolver, and route installer in a test support module. Keep scenario fixtures near the tests that explain them. A central "GraphQL mock everything" file tends to become a second backend with unclear ownership.

## Frequently Asked Questions

### Can Playwright intercept a single operation inside a GraphQL batch?

Playwright intercepts the HTTP request, not a logical GraphQL operation inside that request. If several operations are batched into one POST, the route handler must decide what to do with the whole HTTP envelope. You can inspect and mock one operation, but you still need to fulfill the entire batch response in the correct order, or let the entire request continue. You cannot partially fulfill one operation and pass the rest of the same HTTP request to the server.

### Should GraphQL batch mocks return HTTP 200 when testing errors?

Often yes, if the failure is a GraphQL resolver, validation, authorization, or partial-data error. GraphQL clients commonly receive HTTP 200 with an \`errors\` array and possibly partial \`data\`. Transport failures, gateway outages, invalid JSON, and authentication envelope failures may need non-200 responses or aborted requests. Use a real sanitized response from your system when possible. The test should model the error shape the frontend actually handles, not a convenient generic server error.

### Why does my \`page.route('**/graphql')\` handler not see requests?

Check route registration timing, endpoint pattern, page versus context scope, and service workers. Register the route before \`page.goto\`. Confirm the actual URL, because many apps use \`/api/graphql\`, tenant paths, or absolute API hosts. Use \`context.route\` if a popup or second page sends the request. If a service worker handles requests, Playwright's network routing guidance explains that service workers can hide network events from route interception, so configure a context appropriate for network testing.

### Is Playwright interception enough for GraphQL contract testing?

No. Playwright interception proves browser behavior against a controlled request or response shape. It is valuable for UI states, edge cases, and request assertions, but it does not prove that the provider currently supports the contract. Use schema validation, generated types, provider tests, and consumer-driven contract tests for API compatibility. A healthy strategy uses Playwright for the user workflow and lower-level API or contract tests for the GraphQL agreement that should hold outside the browser.
`,
};
