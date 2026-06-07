import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Network Interception and Mocking: Complete 2026 Guide',
  description: 'Master Playwright network interception with page.route, route.fulfill, route.continue, route.abort, HAR replay, and REST/GraphQL mocking in 2026.',
  date: '2026-06-07',
  category: 'Guide',
  content: `
# Playwright Network Interception and Mocking: Complete 2026 Guide

The single biggest source of flaky end-to-end tests is the network. A test that depends on a live backend inherits every one of that backend's failure modes: a slow third-party API, a rate limit, a seeded record that got deleted, a deploy that changed a response shape. Network interception in Playwright lets you cut that dependency entirely. You intercept the request before it leaves the browser, decide what to do with it, and serve a deterministic response that your test fully controls. The result is a suite that fails only when your application is actually broken.

Playwright's interception model is built around \`page.route\`, a handler that fires for every request matching a URL pattern. Inside that handler you get a \`Route\` object with four core verbs: \`route.fulfill\` to return a synthetic response, \`route.continue\` to let the request proceed (optionally with modifications), \`route.abort\` to kill it, and \`route.fetch\` to perform the real request so you can inspect or rewrite the response. On top of those primitives Playwright layers HAR replay via \`routeFromHAR\`, response waiting via \`waitForResponse\`, and pattern matching with both glob strings and regular expressions.

This guide covers every interception technique you will use in 2026 with Playwright 1.55+: mocking REST and GraphQL, modifying live responses, aborting analytics and images, recording and replaying HAR archives, and the pitfalls that trip up teams new to routing. Every example is runnable TypeScript. If you are building a full suite, pair this with the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and the [API testing complete guide](/blog/api-testing-complete-guide) for backend-level coverage. The [playwright-e2e skill](/skills/playwright-e2e) bundles these patterns for AI coding agents.

## How request interception works

When you register a route, Playwright installs a handler in the browser's network stack. Every matching request is paused before it reaches the server, and your handler decides its fate. A request stays paused until you resolve it with exactly one terminal action. If you forget to call \`fulfill\`, \`continue\`, or \`abort\`, the request hangs forever and your test times out.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('intercepts a request', async ({ page }) => {
  await page.route('**/api/user', async (route) => {
    // You must resolve the route with exactly one terminal call.
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, name: 'Ada Lovelace' }),
    });
  });

  await page.goto('/profile');
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
});
\`\`\`

Routes are matched in reverse registration order, so the last route you register wins. This is important: register your most specific patterns last, or use \`route.fallback()\` to chain handlers explicitly.

## Mocking a REST response with route.fulfill

\`route.fulfill\` is the workhorse for mocking. You supply a status code, content type, and body, and the browser never touches the real server. This is ideal for testing how the UI renders a known payload, including empty states and error states that are hard to reproduce against a live API.

\`\`\`typescript
test('renders empty cart state', async ({ page }) => {
  await page.route('**/api/cart', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0 }),
    }),
  );

  await page.goto('/cart');
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});

test('renders a server error gracefully', async ({ page }) => {
  await page.route('**/api/cart', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Service unavailable' }),
    }),
  );

  await page.goto('/cart');
  await expect(page.getByRole('alert')).toContainText('try again');
});
\`\`\`

You can also fulfill from a file on disk with the \`path\` option, which keeps large fixtures out of your test code:

\`\`\`typescript
await page.route('**/api/products', (route) =>
  route.fulfill({ path: 'fixtures/products.json' }),
);
\`\`\`

## Modifying a live response with route.fetch

Sometimes you do not want a fully synthetic response. You want the real one, with a single field changed. The pattern is to perform the real request with \`route.fetch\`, read the JSON, mutate it, and fulfill with the modified body. This keeps your mock honest because the shape always matches production.

\`\`\`typescript
test('forces a premium flag on the real user payload', async ({ page }) => {
  await page.route('**/api/user', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.plan = 'premium';
    await route.fulfill({ response, json });
  });

  await page.goto('/dashboard');
  await expect(page.getByText('Premium features')).toBeVisible();
});
\`\`\`

Passing both \`response\` and \`json\` tells Playwright to reuse the original headers and status while swapping the body. This is far less brittle than reconstructing the entire response by hand.

## continue, abort, and request modification

\`route.continue\` lets the request proceed, optionally with a rewritten URL, method, headers, or post body. This is how you inject auth headers, redirect a request to a staging host, or simulate a different request payload without changing application code.

\`\`\`typescript
test('injects an auth header on every API call', async ({ page }) => {
  await page.route('**/api/**', (route) => {
    const headers = { ...route.request().headers(), authorization: 'Bearer test-token' };
    return route.continue({ headers });
  });

  await page.goto('/dashboard');
});
\`\`\`

\`route.abort\` kills a request outright. The most common use is blocking third-party noise that slows tests and adds flakiness: analytics beacons, ad pixels, fonts, and heavy images.

\`\`\`typescript
test('blocks analytics and images for speed', async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (/google-analytics|segment|doubleclick/.test(url)) {
      return route.abort();
    }
    if (['image', 'font'].includes(route.request().resourceType())) {
      return route.abort();
    }
    return route.continue();
  });

  await page.goto('/');
});
\`\`\`

### Choosing a verb

| Verb | What it does | Typical use |
|---|---|---|
| \`route.fulfill\` | Returns a synthetic response, no network | Mock REST/GraphQL, error states |
| \`route.continue\` | Lets request proceed, optional rewrite | Inject headers, redirect host |
| \`route.abort\` | Cancels the request | Block analytics, images, fonts |
| \`route.fetch\` | Performs the real request | Inspect or modify live responses |
| \`route.fallback\` | Defers to the next matching handler | Chaining multiple route handlers |

## Mocking GraphQL endpoints

GraphQL is harder to mock than REST because every operation hits the same URL, usually \`/graphql\`, with the operation name in the POST body. You cannot match on the URL alone. Instead, inspect the request payload and branch on the operation name, falling back to the real server for anything you do not explicitly mock.

\`\`\`typescript
test('mocks a single GraphQL operation', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const payload = route.request().postDataJSON();

    if (payload.operationName === 'GetViewer') {
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: { viewer: { id: '1', name: 'Grace Hopper', role: 'admin' } },
        }),
      });
    }

    // Let every other operation hit the real backend.
    return route.fallback();
  });

  await page.goto('/account');
  await expect(page.getByText('Grace Hopper')).toBeVisible();
});
\`\`\`

The \`route.fallback()\` call is what makes selective GraphQL mocking work. Without it you would have to enumerate every operation. With it, you mock the one operation under test and let the rest flow through normally.

## URL matching: glob vs regex

Playwright accepts three pattern types for the URL argument: a glob string, a \`RegExp\`, or a predicate function. Globs are concise but limited; regex gives you full control. The most common bug is forgetting that a glob \`*\` does not cross slashes the way you expect.

| Pattern | Matches | Notes |
|---|---|---|
| \`**/api/user\` | Any host, path ending \`/api/user\` | \`**\` crosses path segments |
| \`*/api/user\` | Single segment before \`/api/user\` | Rarely what you want |
| \`**/api/user?*\` | Same path with a query string | \`?\` is literal in globs |
| \`/.*\\/api\\/users\\/\\d+/\` | Regex, numeric user id | Full control over the path |
| \`(url) => url.pathname === '/api/user'\` | Predicate function | Match on parsed URL parts |

\`\`\`typescript
// Glob: matches any host, must end with /api/orders
await page.route('**/api/orders', handler);

// Regex: only numeric order ids
await page.route(/\\/api\\/orders\\/\\d+$/, handler);

// Predicate: full control, ignores query string
await page.route(
  (url) => url.pathname.startsWith('/api/orders'),
  handler,
);
\`\`\`

When in doubt, use a regex or predicate. Globs are convenient for simple cases but their query-string and slash semantics surprise people. For an in-depth look at why over-broad patterns cause flakiness, see the [flaky tests guide](/blog/fix-flaky-tests-guide).

## Recording and replaying with HAR files

Writing mocks by hand for a complex page is tedious. \`routeFromHAR\` lets you record every request the page makes once, save it to a HAR archive, and replay that archive on every subsequent run. Your tests then run fully offline against a frozen snapshot of the backend.

Record the archive in update mode:

\`\`\`typescript
test('record a HAR archive', async ({ page }) => {
  await page.routeFromHAR('hars/dashboard.har', {
    url: '**/api/**',
    update: true, // records real responses to disk
  });

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
\`\`\`

Then replay it. Drop \`update: true\` and Playwright serves responses from the file instead of the network:

\`\`\`typescript
test('replay from HAR', async ({ page }) => {
  await page.routeFromHAR('hars/dashboard.har', {
    url: '**/api/**',
    notFound: 'abort', // any unrecorded request fails loudly
  });

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
\`\`\`

Set \`notFound: 'abort'\` so an unrecorded request fails the test instead of silently hitting the live server. The trade-off with HAR is staleness: when the backend changes shape, you must re-record. Treat HAR archives like fixtures and refresh them on a schedule.

## Asserting on traffic with waitForResponse

Interception is for controlling traffic; \`waitForResponse\` and \`waitForRequest\` are for observing it. Use them to assert that the UI fired the right request, or to wait for an async call to settle before continuing. The key pattern is to start waiting before you trigger the action, then await both together.

\`\`\`typescript
test('submits the form and asserts the payload', async ({ page }) => {
  await page.goto('/contact');

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/contact') && res.status() === 201,
  );

  await page.getByLabel('Email').fill('test@example.com');
  await page.getByRole('button', { name: 'Send' }).click();

  const response = await responsePromise;
  const body = await response.json();
  expect(body.id).toBeTruthy();
});
\`\`\`

Registering \`responsePromise\` before the click avoids a race where the response arrives before you start listening. This is the single most common mistake with response waiting.

## Mocking for component tests

Playwright component testing supports the same routing API through the \`router\` fixture, so you can mock network calls for an isolated component without mounting a full page. This keeps component tests fast and decoupled from any backend.

\`\`\`typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { UserCard } from './UserCard';

test('component renders mocked user', async ({ mount, router }) => {
  await router.route('**/api/user', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ name: 'Alan Turing' }),
    }),
  );

  const component = await mount(<UserCard userId={42} />);
  await expect(component.getByText('Alan Turing')).toBeVisible();
});
\`\`\`

The same fulfill/continue/abort verbs apply, so everything you learn for end-to-end mocking transfers directly to component tests.

## Simulating slow networks and failures

Interception is also how you test resilience: slow responses, timeouts, and intermittent failures. Add a delay inside the handler to simulate latency, or fail the first N requests to test retry logic.

\`\`\`typescript
test('shows a spinner during a slow response', async ({ page }) => {
  await page.route('**/api/feed', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    });
  });

  await page.goto('/feed');
  await expect(page.getByRole('progressbar')).toBeVisible();
});

test('retries after a transient failure', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/save', (route) => {
    attempts += 1;
    if (attempts === 1) return route.fulfill({ status: 500, body: '{}' });
    return route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
  });

  await page.goto('/editor');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved')).toBeVisible();
  expect(attempts).toBe(2);
});
\`\`\`

## Common pitfalls and how to avoid them

| Pitfall | Symptom | Fix |
|---|---|---|
| Forgetting to resolve a route | Test times out | Always call fulfill, continue, or abort |
| Over-broad glob like \`**/*\` | Unintended requests mocked | Scope to \`**/api/**\` or use regex |
| Listening for response after click | Flaky waitForResponse | Create the promise before the action |
| Stale HAR archives | Tests pass on broken UI | Re-record HARs on a schedule |
| Routing registered after navigation | First request escapes the mock | Register routes before page.goto |
| Not using fallback for GraphQL | Every operation must be mocked | Use route.fallback for pass-through |

A subtle one worth repeating: register routes before navigation. If you call \`page.route\` after \`page.goto\`, the page's initial requests have already fired and your mock never sees them. Set up routing first, then navigate.

## Mocking at the context level for whole suites

When the same mock applies to every test in a file or project, register it on \`context\` rather than \`page\`. A context-level route covers every page opened in that context, which is exactly what you want for cross-cutting concerns like blocking analytics or stubbing a feature-flag endpoint that the whole app reads on boot. The cleanest place to do this is a custom fixture so the mock travels with your test automatically.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

const test = base.extend({
  // Auto-applied fixture: every test gets analytics blocked and flags stubbed.
  page: async ({ page }, use) => {
    await page.context().route(/segment|amplitude|google-analytics/, (route) =>
      route.abort(),
    );
    await page.context().route('**/api/flags', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ newCheckout: true, betaSearch: false }),
      }),
    );
    await use(page);
  },
});

test('runs with shared mocks already in place', async ({ page }) => {
  await page.goto('/');
  // newCheckout flag is on for this and every other test in the file.
  await expect(page.getByText('New checkout')).toBeVisible();
});
\`\`\`

Fixture-based mocking keeps individual tests clean and makes the shared behavior discoverable in one place. It also composes: a test can still add its own \`page.route\` for endpoint-specific behavior, and because the last-registered route wins, the local mock overrides the shared one for that endpoint.

## Inspecting request bodies and headers

Interception is not only about responses. The \`Request\` object exposes the outgoing method, headers, and body, which lets you assert that the UI sent exactly what it should. This is invaluable for verifying that a form serializes correctly or that the right authorization header is attached, without trusting the server to tell you.

\`\`\`typescript
test('sends the correct create-order payload', async ({ page }) => {
  let captured: unknown = null;

  await page.route('**/api/orders', async (route) => {
    captured = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'ord_1' }),
    });
  });

  await page.goto('/checkout');
  await page.getByRole('button', { name: 'Place order' }).click();
  await expect(page.getByText('Order confirmed')).toBeVisible();

  expect(captured).toMatchObject({
    items: [{ sku: 'SKU-1', qty: 1 }],
    currency: 'USD',
  });
});
\`\`\`

Combining a captured request with a fulfilled response gives you a complete contract check inside a single test: the UI sent the right payload and reacted correctly to a known response.

## Dynamic mocks driven by request state

Real backends are stateful. A mock that returns the same body forever cannot test flows where a second request should reflect the first. Keep state in a closure and let the handler branch on it. This is how you simulate pagination, optimistic updates, or a resource that transitions from pending to ready.

\`\`\`typescript
test('polls a job until it reports complete', async ({ page }) => {
  let poll = 0;
  await page.route('**/api/job/123', (route) => {
    poll += 1;
    const status = poll < 3 ? 'pending' : 'complete';
    return route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ id: '123', status }),
    });
  });

  await page.goto('/jobs/123');
  // The UI polls; the third response flips it to complete.
  await expect(page.getByText('Job complete')).toBeVisible();
  expect(poll).toBeGreaterThanOrEqual(3);
});
\`\`\`

Closure state resets between tests because the route handler is registered fresh each time, so there is no leakage. This pattern keeps stateful mocks deterministic while still exercising the polling and transition logic that static fixtures cannot reach.

## Scoping routes to a single test

Routes registered on \`page\` last only for that test because each test gets a fresh page. For mocks shared across an entire file or project, register them on \`context\` inside a fixture or \`beforeEach\`. Use \`page.unroute\` to remove a specific handler mid-test when you want to switch behavior.

\`\`\`typescript
test('switches mock mid-test', async ({ page }) => {
  const handler = (route: import('@playwright/test').Route) =>
    route.fulfill({ body: JSON.stringify({ status: 'down' }) });

  await page.route('**/api/health', handler);
  await page.goto('/status');
  await expect(page.getByText('Offline')).toBeVisible();

  await page.unroute('**/api/health', handler);
  await page.route('**/api/health', (route) =>
    route.fulfill({ body: JSON.stringify({ status: 'up' }) }),
  );
  await page.reload();
  await expect(page.getByText('Online')).toBeVisible();
});
\`\`\`

## Frequently Asked Questions

### What is the difference between route.fulfill and route.continue in Playwright?

\`route.fulfill\` returns a synthetic response without ever contacting the server, which is how you mock data. \`route.continue\` lets the request reach the real backend, optionally rewriting its URL, headers, method, or body first. Use fulfill to replace a response, and continue to modify or simply pass through a request you do not want to mock.

### How do I mock an API response in Playwright in 2026?

Register a handler with \`page.route('**/api/endpoint', ...)\` before navigating, then call \`route.fulfill\` with a status, contentType, and JSON body. Register routes before \`page.goto\` so the page's initial requests are intercepted. For large payloads, use the \`path\` option to load a fixture file instead of inlining the body in your test code.

### Can Playwright mock GraphQL requests?

Yes. Because GraphQL operations share one URL, match on \`**/graphql\` and inspect \`route.request().postDataJSON()\` to read the operation name. Fulfill the operations you want to mock and call \`route.fallback()\` for the rest so they reach the real server. This selective approach means you only mock the operation under test rather than every query and mutation.

### What is routeFromHAR and when should I use it?

\`routeFromHAR\` records every matching request into a HAR archive once, then replays those responses on later runs so tests run fully offline. Record with \`update: true\`, then replay with \`notFound: 'abort'\` so unrecorded requests fail loudly. It is ideal for complex pages with many calls, but archives go stale, so re-record them whenever the backend response shape changes.

### Should I use glob or regex for URL matching in Playwright routes?

Use globs for simple cases like \`**/api/users\`, but switch to a regex or predicate function when you need precision, such as matching only numeric IDs or ignoring query strings. Globs have surprising slash and query-string semantics: a single \`*\` does not cross path segments, and \`?\` is literal. When a glob behaves unexpectedly, a regex almost always resolves it.

### Why is my Playwright route handler not being called?

The two most common causes are registering the route after \`page.goto\` (so the initial requests already fired) and a URL pattern that does not actually match. Register routes before navigation, and verify the pattern with a predicate function that logs \`route.request().url()\`. Remember that routes match in reverse order, so a later, broader route can shadow an earlier specific one.

### How do I block images and analytics to speed up Playwright tests?

Register a catch-all route and call \`route.abort()\` for requests whose \`resourceType()\` is image or font, or whose URL matches analytics domains. Let everything else continue. Blocking heavy assets and third-party beacons can cut test time significantly and removes a common source of flakiness from slow external services that your test does not actually need.

### Do mocked routes persist across tests in Playwright?

No. Routes registered on \`page\` are torn down when the test ends because each test receives a fresh page and context. To share mocks across tests, register them on \`context\` inside a fixture or \`beforeEach\` hook. To remove a handler within a single test, call \`page.unroute\` with the same pattern and handler reference you used to register it.

## Conclusion

Network interception is the lever that turns a flaky, backend-dependent Playwright suite into a fast, deterministic one. The four verbs, \`fulfill\`, \`continue\`, \`abort\`, and \`fetch\`, cover nearly every scenario: mock a payload, inject a header, block noise, or rewrite a live response. Layer in \`routeFromHAR\` for snapshot replay and \`waitForResponse\` for traffic assertions, and you have full control over the network from inside the test.

The habits that matter most are small: register routes before you navigate, resolve every route exactly once, scope patterns narrowly, and use \`fallback\` to keep GraphQL mocking selective. Get those right and your tests will fail only when your application is genuinely broken. Explore the [playwright-e2e skill](/skills/playwright-e2e) and the rest of the [skills directory](/skills) to bring these interception patterns into your AI-assisted testing workflow, and read the [Cypress vs Playwright 2026 comparison](/blog/cypress-vs-playwright-2026) if you are still choosing a framework.
`,
};
