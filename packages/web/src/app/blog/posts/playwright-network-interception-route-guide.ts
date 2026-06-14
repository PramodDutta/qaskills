import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Network Interception with route(): Complete Reference',
  description:
    'A full Playwright page.route() reference: fulfill, abort, continue, glob vs regex matching, mocking JSON APIs, routeFromHAR, waitForResponse, GraphQL, and CI tips.',
  date: '2026-06-14',
  category: 'Reference',
  content: `
# Playwright Network Interception with route(): Complete Reference

Network interception is one of the most powerful features in Playwright. With \`page.route()\` you can intercept any request a page makes, inspect it, and decide whether to fulfill it with mock data, abort it, modify it, or let it continue to the real server. This unlocks deterministic tests that do not depend on a live backend, error-state coverage that is otherwise impossible to trigger, and faster suites that skip slow or rate-limited APIs. This reference covers the full surface of Playwright's routing API as of Playwright 1.5x in 2026, with runnable TypeScript examples for every method.

We start with the basic mechanics of \`page.route()\` and the \`Route\` object, then work through \`route.fulfill()\`, \`route.abort()\`, and \`route.continue()\`. We cover URL matching with glob patterns versus regular expressions versus predicate functions, modifying outgoing requests and incoming responses, mocking JSON APIs, recording and replaying traffic with \`page.routeFromHAR()\`, waiting for specific requests and responses with \`waitForRequest\` and \`waitForResponse\`, the rules around route ordering and \`unroute()\`, intercepting GraphQL operations that all share one URL, and tips for keeping interception stable in CI. If you want the broader testing context, the [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide) and the [API mocking and service virtualization guide](/blog/api-mocking-service-virtualization-guide) both build on these primitives.

## How page.route() Works

\`page.route(url, handler)\` registers a handler that fires for every network request whose URL matches the pattern. Each intercepted request gives your handler a \`Route\` object, and you are obligated to do exactly one terminal action on it: fulfill it, abort it, continue it, or fetch and fulfill. If you register a route and never resolve it, that request hangs forever and the test times out. Routes apply to all request types by default, including documents, scripts, fetch, XHR, images, and fonts.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('intercepts a request and lets it through', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    console.log(\`\${request.method()} \${request.url()}\`);
    await route.continue(); // terminal action: pass through to the server
  });

  await page.goto('/dashboard');
  await expect(page.getByRole('heading')).toBeVisible();
});
\`\`\`

The handler runs in Node, not in the browser, so you have full access to the filesystem, fixtures, and any logic you like. You can register routes on a \`page\`, on a \`browserContext\` (applies to every page in the context), or remove them later. Context-level routing is the right choice when several tabs or popups must share the same mocks.

## Fulfilling Requests with route.fulfill()

\`route.fulfill()\` short-circuits the request and returns a response you construct, without ever hitting the network. This is the workhorse of API mocking. You control the status code, headers, and body. Bodies can be a string, a \`Buffer\`, JSON via the \`json\` option, or a file via \`path\`.

\`\`\`typescript
test('mocks a JSON API response', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      // the json option auto-serializes and sets content-type
      json: [
        { id: 1, name: 'Ada Lovelace' },
        { id: 2, name: 'Grace Hopper' },
      ],
    });
  });

  await page.goto('/users');
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await expect(page.getByText('Grace Hopper')).toBeVisible();
});

test('serves a fixture file as the response body', async ({ page }) => {
  await page.route('**/api/report.pdf', (route) =>
    route.fulfill({ path: './fixtures/sample-report.pdf' }),
  );
  await page.goto('/reports');
});
\`\`\`

Use the \`json\` shorthand when mocking APIs: it stringifies the payload and sets \`content-type: application/json\` for you. Reach for \`body\` plus an explicit \`contentType\` when you need raw text, HTML, or binary data, and use \`path\` to serve a file straight from disk.

## Aborting and Continuing Requests

\`route.abort()\` fails the request as if the network errored, optionally with a specific error reason. This is how you simulate offline conditions, blocked third-party scripts, or failed image loads. \`route.continue()\` lets the request proceed to its real destination, optionally with modifications applied first.

\`\`\`typescript
test('blocks analytics and ad domains to speed up tests', async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (/google-analytics|doubleclick|hotjar/.test(url)) {
      return route.abort(); // drop trackers entirely
    }
    return route.continue();
  });
  await page.goto('/');
});

test('simulates an image failing to load', async ({ page }) => {
  await page.route('**/*.{png,jpg,jpeg,webp}', (route) =>
    route.abort('failed'),
  );
  await page.goto('/gallery');
  await expect(page.getByText('Image unavailable')).toBeVisible();
});
\`\`\`

The table below lists the terminal actions on a \`Route\` and when to use each.

| Method | Effect | Common use case |
|---|---|---|
| route.fulfill() | Returns a response you define; no network call | Mock JSON APIs, error states, fixtures |
| route.abort() | Fails the request with a network error | Block trackers, simulate offline or load failures |
| route.continue() | Sends the request onward, optionally modified | Pass-through, header/payload tweaks, logging |
| route.fetch() | Performs the real request, returns a Response you can edit | Modify real responses before fulfilling |
| route.fallback() | Defers to the next matching handler | Layered routing where order matters |

## Glob vs Regex vs Predicate URL Matching

The first argument to \`page.route()\` can be a glob string, a \`RegExp\`, or a function predicate. Globs are concise and readable for path-based matching; regex gives you precision and anchoring; predicates let you match on anything, including method, headers, or post-body content. Knowing the difference avoids both over-matching and missed requests.

\`\`\`typescript
// Glob: ** matches across path segments, * within a segment, {a,b} alternation
await page.route('**/api/v2/users/*', handler);
await page.route('**/*.{png,svg,woff2}', handler);

// Regex: full control, anchoring, capture groups
await page.route(/\\/api\\/users\\/\\d+$/, handler);
await page.route(/analytics|telemetry/, handler);

// Predicate: match on anything about the request
await page.route(
  (url) => url.pathname.startsWith('/api/') && url.searchParams.has('admin'),
  handler,
);
\`\`\`

A frequent mistake is forgetting that a glob like \`*/api/users\` only matches a single path segment for \`*\`, while \`**\` spans segments. The comparison below clarifies the semantics.

| Pattern style | Example | Matches | Notes |
|---|---|---|---|
| Glob single star | \`*/api/users\` | One segment for \`*\` | Use within a segment only |
| Glob double star | \`**/api/users\` | Any number of leading segments | Most common for path matching |
| Glob alternation | \`**/*.{js,css}\` | Multiple extensions | Handy for asset blocking |
| Regex | \`/\\/api\\/users\\/\\d+/\` | Pattern-based, anchorable | Best for IDs and precise paths |
| Predicate fn | \`(url) => url.host === 'api.x.com'\` | Programmatic, full URL object | Match on host, query, or anything |

## Modifying Requests and Responses

\`route.continue()\` accepts overrides for the URL, method, headers, and post data, so you can rewrite an outgoing request before it leaves the browser. To modify a response, fetch the real one with \`route.fetch()\`, mutate the body or status, then fulfill with the result. This pattern is invaluable for injecting feature flags, stripping fields, or flipping a single value in an otherwise real payload.

\`\`\`typescript
test('adds an auth header to every API request', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const headers = {
      ...route.request().headers(),
      authorization: 'Bearer test-token-123',
    };
    await route.continue({ headers });
  });
  await page.goto('/dashboard');
});

test('patches a real response to flip a feature flag', async ({ page }) => {
  await page.route('**/api/config', async (route) => {
    const response = await route.fetch(); // real network call
    const json = await response.json();
    json.features.newCheckout = true; // override one field
    await route.fulfill({ response, json });
  });
  await page.goto('/checkout');
  await expect(page.getByTestId('new-checkout')).toBeVisible();
});
\`\`\`

Passing \`response\` to \`fulfill\` preserves the original status and headers while the \`json\` option swaps the body. This keeps the mock faithful to the real endpoint except for the precise change you intend.

## Mocking JSON APIs End to End

A realistic component or page often calls several endpoints. Register one route per endpoint, or a single route that branches on the URL. Centralizing mocks in a fixture keeps tests DRY and makes the mocked backend obvious at a glance. The example below wires a small mock layer through a Playwright fixture.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

const test = base.extend({
  mockApi: [
    async ({ page }, use) => {
      await page.route('**/api/profile', (r) =>
        r.fulfill({ json: { name: 'Test User', plan: 'pro' } }),
      );
      await page.route('**/api/notifications', (r) =>
        r.fulfill({ json: { unread: 3 } }),
      );
      await use(undefined);
    },
    { auto: true }, // apply to every test automatically
  ],
});

test('renders profile and notification badge from mocks', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByText('Test User')).toBeVisible();
  await expect(page.getByTestId('badge')).toHaveText('3');
});
\`\`\`

A major benefit of mocking with \`route.fulfill()\` is that error states become trivial to cover. In a real environment, reliably triggering a 500, a 429 rate limit, or a malformed payload is hard and often impossible. With interception you simply return whatever status and body you want, then assert that your UI degrades gracefully. The reference below maps common scenarios to the response you would fulfill, which is a handy checklist when building out negative-path coverage for any data-driven component.

| Scenario to test | Status | Body to fulfill | What to assert |
|---|---|---|---|
| Happy path | 200 | Valid JSON payload | Data renders correctly |
| Empty result | 200 | \`{ items: [] }\` | Empty-state message shows |
| Unauthorized | 401 | \`{ error: 'auth' }\` | Redirect or login prompt |
| Rate limited | 429 | \`{ retryAfter: 30 }\` | Backoff or retry banner |
| Server error | 500 | \`'Internal error'\` | Error boundary or alert |
| Malformed JSON | 200 | \`'not json'\` | Graceful parse-failure handling |
| Slow network | 200 | Valid JSON, delayed | Loading spinner appears |

To simulate a slow endpoint, await a delay inside the handler before fulfilling. This is the cleanest way to verify that loading skeletons, spinners, and disabled buttons behave correctly while a request is in flight, without throttling the entire browser.

\`\`\`typescript
test('shows a loading spinner during a slow request', async ({ page }) => {
  await page.route('**/api/feed', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500)); // artificial latency
    await route.fulfill({ json: { posts: [{ id: 1, title: 'Hello' }] } });
  });

  await page.goto('/feed');
  await expect(page.getByTestId('spinner')).toBeVisible();
  await expect(page.getByText('Hello')).toBeVisible();
  await expect(page.getByTestId('spinner')).toBeHidden();
});
\`\`\`

## Recording and Replaying with routeFromHAR()

For complex apps with dozens of endpoints, hand-writing mocks is tedious. \`page.routeFromHAR()\` replays a recorded HAR (HTTP Archive) file, serving every captured request from disk. Record once against a real backend, commit the HAR, and your tests become fully deterministic and offline. You can run in \`update\` mode to refresh the recording when the API changes.

\`\`\`typescript
// Record a HAR by running with update: true once against the live backend
test('replays traffic from a HAR archive', async ({ page }) => {
  await page.routeFromHAR('./hars/dashboard.har', {
    url: '**/api/**', // only replay API calls, let assets load normally
    update: false, // set true to (re)record
    notFound: 'abort', // abort requests not in the archive
  });

  await page.goto('/dashboard');
  await expect(page.getByRole('table')).toBeVisible();
});
\`\`\`

Set \`update: true\` temporarily to record or refresh the HAR, then commit the file and switch back to \`update: false\`. The \`notFound\` option controls what happens for requests missing from the archive: \`'abort'\` fails them (good for catching unexpected calls) while \`'fallback'\` lets them hit the network.

## Waiting for Requests and Responses

Interception is about controlling traffic; \`waitForRequest\` and \`waitForResponse\` are about observing it. Use them to assert that a request was sent with the right payload, or to wait until a specific response arrives before continuing. Always start the wait before the action that triggers the request, and \`await\` both together with \`Promise.all\` to avoid race conditions.

\`\`\`typescript
test('asserts the search request payload', async ({ page }) => {
  await page.goto('/search');

  const [request] = await Promise.all([
    page.waitForRequest('**/api/search?*'),
    page.getByRole('searchbox').fill('playwright'),
    page.getByRole('button', { name: 'Search' }).click(),
  ]);

  expect(new URL(request.url()).searchParams.get('q')).toBe('playwright');
});

test('waits for a specific successful response', async ({ page }) => {
  await page.goto('/orders');

  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/api/orders') && res.status() === 200,
    ),
    page.getByRole('button', { name: 'Load orders' }).click(),
  ]);

  const body = await response.json();
  expect(body.orders.length).toBeGreaterThan(0);
});
\`\`\`

## Route Ordering and unroute()

When multiple routes match the same request, Playwright invokes them in reverse registration order, last registered first. A handler that calls a terminal action stops the chain; one that calls \`route.fallback()\` passes control to the next matching handler. This lets you layer a broad default route with narrow overrides. To remove a route, call \`page.unroute()\` with the same pattern, optionally with \`unrouteAll()\` to clear everything.

\`\`\`typescript
test('layers a default mock with a per-test override', async ({ page }) => {
  // Broad default registered first
  await page.route('**/api/**', (route) =>
    route.fulfill({ json: { ok: true } }),
  );

  // Narrow override registered later runs first and falls back if it does not handle
  await page.route('**/api/users', async (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 201, json: { id: 99 } });
    }
    return route.fallback(); // defer to the broad default
  });

  await page.goto('/users');

  // Later: remove the override so the default applies again
  await page.unroute('**/api/users');
});
\`\`\`

Use \`await page.unrouteAll({ behavior: 'ignoreErrors' })\` in teardown when you want a clean slate and do not care about in-flight routes resolving.

## Intercepting GraphQL Operations

GraphQL is tricky because every query and mutation hits the same endpoint, usually \`/graphql\`, so URL matching alone cannot distinguish operations. The solution is to inspect the POST body inside the handler, read the \`operationName\`, and branch your mock accordingly. This gives per-operation control even though the URL is shared.

\`\`\`typescript
test('mocks specific GraphQL operations by operationName', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const payload = route.request().postDataJSON() as {
      operationName?: string;
      variables?: Record<string, unknown>;
    };

    switch (payload.operationName) {
      case 'GetCurrentUser':
        return route.fulfill({
          json: { data: { me: { id: '1', name: 'Ada' } } },
        });
      case 'ListProjects':
        return route.fulfill({
          json: { data: { projects: [{ id: 'p1', title: 'Apollo' }] } },
        });
      default:
        return route.continue(); // let unknown operations hit the server
    }
  });

  await page.goto('/app');
  await expect(page.getByText('Ada')).toBeVisible();
  await expect(page.getByText('Apollo')).toBeVisible();
});
\`\`\`

\`postDataJSON()\` parses the request body for you. Read \`variables\` to assert that the client sent the right arguments, and fall through to \`route.continue()\` for any operation you do not explicitly mock so unhandled queries are not silently broken.

## CI Tips for Stable Interception

Network interception makes tests faster and more deterministic, which is exactly what CI needs, but a few practices keep it reliable. Block third-party scripts (analytics, ads, chat widgets) to remove external flakiness and speed up page loads. Use \`notFound: 'abort'\` with HAR replay so an unexpected request fails loudly instead of leaking to a real server. Register routes in fixtures with \`auto: true\` so every test inherits the same baseline.

\`\`\`typescript
// playwright.config.ts excerpt for CI stability
import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry', // capture network in the trace for debugging
  },
});

// In a fixture: block noisy third parties everywhere
// await context.route(/analytics|intercom|sentry|fullstory/, (r) => r.abort());
\`\`\`

Enable \`trace: 'on-first-retry'\` so that when a flaky network test fails on CI, the trace viewer shows you every intercepted request and response. Avoid relying on real external APIs in CI entirely; mock them with \`route.fulfill()\` or replay a committed HAR. For a wider checklist on stability, parallelism, and reporting, see [Playwright best practices for 2026](/blog/playwright-best-practices-2026), and if you are exploring agent-driven flows, the [Playwright MCP browser automation guide](/blog/playwright-mcp-browser-automation-guide) shows how interception fits AI workflows.

## Frequently Asked Questions

### What is the difference between route.continue() and route.fulfill()?

\`route.continue()\` lets the request proceed to its real destination, optionally with modified URL, headers, method, or body, and the server's actual response comes back. \`route.fulfill()\` short-circuits the request entirely and returns a response you construct in your test, never touching the network. Use \`continue()\` for pass-through or modification and \`fulfill()\` for full mocking with deterministic data.

### How do I match URLs with a glob versus a regex in page.route()?

A glob string uses \`*\` to match within a single path segment and \`**\` to span multiple segments, plus \`{a,b}\` for alternation, which reads cleanly for path matching. A \`RegExp\` gives precise, anchorable matching ideal for numeric IDs or partial-string matches. You can also pass a predicate function that receives a URL object for matching on host, query parameters, or anything programmatic.

### Can Playwright intercept and mock GraphQL requests?

Yes. Since all GraphQL operations share one endpoint like \`/graphql\`, URL matching alone is not enough. Inside the route handler, call \`route.request().postDataJSON()\` to read the body, then branch on the \`operationName\` field to return different mock responses per query or mutation. Fall through to \`route.continue()\` for operations you do not explicitly mock so unhandled requests still work.

### How do I record real network traffic and replay it in tests?

Use \`page.routeFromHAR()\` with \`update: true\` once while running against the real backend to record a HAR archive, then commit the file and switch to \`update: false\` to replay it offline. Scope replay with the \`url\` option so only API calls are served from the archive, and set \`notFound: 'abort'\` to catch any unexpected requests not in the recording.

### Why does my test hang when I add a page.route() handler?

Every intercepted request must be resolved with exactly one terminal action: \`fulfill()\`, \`abort()\`, \`continue()\`, or \`fetch()\` plus \`fulfill()\`. If your handler matches a request but never calls one of these, that request hangs until the test times out. Check for code paths in your handler, such as an unhandled \`else\` branch, where no terminal action runs, and add a \`route.continue()\` fallback.

### How do I assert that a request was sent with the correct payload?

Use \`page.waitForRequest()\` started before the triggering action, wrapped in \`Promise.all\` with the click or fill that fires the request. The returned \`Request\` object exposes \`url()\`, \`method()\`, \`headers()\`, and \`postDataJSON()\`, so you can assert on query parameters, headers, or the JSON body. This verifies the client sent exactly what you expect without mocking the response.

### Should I block third-party scripts during tests?

Yes, blocking analytics, ads, chat widgets, and error-reporting scripts with \`route.abort()\` removes a major source of flakiness and speeds up page loads, since those requests are slow, external, and irrelevant to your assertions. Register a broad route that aborts known tracker domains in a shared fixture so every test benefits. Just be careful not to block scripts your app actually depends on.

### Does page.route() work in component tests too?

Yes. The \`page.route()\` API is identical in Playwright component tests. Register the route on the \`page\` fixture before calling \`mount()\` so the component's data-fetching effects see your mock. Interception happens at the browser network layer, so any \`fetch\` or \`XMLHttpRequest\` from the component is covered. This makes it easy to test loading, success, and error states in isolation.

## Conclusion

Playwright's \`page.route()\` API is a complete network interception toolkit: fulfill requests with mock data, abort to simulate failures, continue with modifications, replay recorded HAR archives, branch GraphQL operations by name, and observe traffic with \`waitForRequest\` and \`waitForResponse\`. Master glob versus regex matching, respect route ordering, and always resolve every route with a terminal action. The payoff is fast, deterministic tests that no longer depend on a live backend.

Want ready-to-use interception patterns and Playwright skills for your AI coding agent? Browse the [QASkills directory](/skills) to install proven network-mocking and testing skills directly into Claude Code, Cursor, and other agents in seconds.
`,
};
