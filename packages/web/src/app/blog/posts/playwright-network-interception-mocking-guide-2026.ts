import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright network interception and mocking guide 2026',
  description:
    'Master Playwright network interception mocking in 2026: page.route, fulfill, abort, HAR replay, GraphQL stubbing, URL matching, and runnable TypeScript code.',
  date: '2026-06-25',
  category: 'Tutorial',
  content: `
# Playwright Network Interception and Mocking: The Complete 2026 Guide

Network interception is the single most powerful technique in your Playwright toolkit, and most teams use a fraction of what it offers. Once you can intercept, inspect, modify, mock, and replay the network traffic flowing through your tests, an enormous category of flakiness and slowness simply disappears. No more waiting on a slow staging API. No more tests failing because a third-party analytics script timed out. No more impossible-to-reproduce error states. You control the network, so you control the test.

Playwright network interception mocking works by hooking into the browser's request lifecycle. Every time the page tries to fetch a resource, an API endpoint, an image, a script, a stylesheet, an XHR or fetch call, you get a chance to decide what happens. You can let it through untouched, block it entirely, rewrite the request before it leaves, or fulfill it with a fabricated response your test invented on the spot. That last capability, mocking, is what lets you drive your UI through every state it can reach: loading, empty, populated, error, rate-limited, and everything in between, deterministically and in milliseconds.

This guide is a hands-on, code-first tour of Playwright network interception and mocking as it stands in 2026. Every concept comes with runnable TypeScript you can paste into a spec file. We cover \`page.route()\` and its handler, the \`route.fulfill()\`, \`route.abort()\`, and \`route.continue()\` methods, glob and regex URL matching, modifying requests in flight, recording and replaying with HAR files via \`routeFromHAR()\`, the \`waitForResponse()\` and \`waitForRequest()\` synchronization helpers, mocking GraphQL, stubbing flaky third-party scripts, intercepting at the browser-context level, removing routes, and the best practices that keep your suite fast and maintainable. If you are weighing Playwright against alternatives first, see our [Appium vs Playwright comparison](/blog/appium-vs-playwright-2026) for the bigger picture.

## How page.route() Works

The foundation of all interception in Playwright is \`page.route(url, handler)\`. You register a route handler with a URL pattern, and Playwright invokes your handler for every matching request before the browser sends it. The handler receives a \`Route\` object (and optionally the \`Request\`), and you must do exactly one of three things with it: fulfill it, abort it, or continue it. If you never resolve the route, the request hangs and your test will eventually time out.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('basic route registration', async ({ page }) => {
  await page.route('**/api/user', async (route) => {
    // We must resolve the route exactly once.
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

The handler is asynchronous, so you can await anything inside it, including reading the original response before deciding what to do. Routes registered later take priority over earlier ones for the same URL, which lets a test override a fixture-level route. This ordering behavior is something to remember when you set up global mocks in a fixture and then want one test to behave differently.

## Mocking API Responses With route.fulfill()

The most common use of interception is mocking. Instead of letting a request reach a real server, you fabricate the response. This makes tests fast, deterministic, and able to exercise states that are hard to produce against a live backend, such as an empty list, a server error, or a specific edge-case payload.

\`\`\`typescript
test('renders empty state when API returns no items', async ({ page }) => {
  await page.route('**/api/todos', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    });
  });

  await page.goto('/todos');
  await expect(page.getByText('No todos yet')).toBeVisible();
});

test('renders error state on 500', async ({ page }) => {
  await page.route('**/api/todos', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  });

  await page.goto('/todos');
  await expect(page.getByRole('alert')).toContainText('Something went wrong');
});
\`\`\`

You can also fulfill from a file on disk, which keeps large fixtures out of your test code, or pass a \`json\` shortcut so Playwright handles serialization and the content type for you.

\`\`\`typescript
test('fulfill from a fixture file and the json shortcut', async ({ page }) => {
  // From a file on disk:
  await page.route('**/api/products', (route) =>
    route.fulfill({ path: './fixtures/products.json' })
  );

  // Or with the json shortcut (sets content-type automatically):
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { featureFlags: { darkMode: true } } })
  );

  await page.goto('/shop');
  await expect(page.getByTestId('product-card')).toHaveCount(3);
});
\`\`\`

## Blocking Requests With route.abort()

Sometimes the right move is not to fake a response but to make the request fail or never happen at all. \`route.abort()\` does this. It is invaluable for speeding up tests by blocking heavy resources you do not care about, and for forcing the UI into a network-failure state.

\`\`\`typescript
test('block images and fonts to speed up the run', async ({ page }) => {
  await page.route('**/*.{png,jpg,jpeg,webp,gif,woff,woff2}', (route) =>
    route.abort()
  );

  await page.goto('/heavy-gallery');
  await expect(page.getByRole('heading')).toBeVisible();
});

test('simulate a failed network request', async ({ page }) => {
  await page.route('**/api/checkout', (route) =>
    route.abort('failed') // simulates a connection failure
  );

  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByText('Network error, please retry')).toBeVisible();
});
\`\`\`

The argument to \`abort()\` is an error code such as \`'failed'\`, \`'timedout'\`, \`'connectionrefused'\`, or \`'accessdenied'\`, letting you simulate specific failure modes your error-handling code should cope with.

## Modifying Requests and Responses With route.continue() and route.fetch()

\`route.continue()\` lets the request proceed, but optionally with modifications. You can rewrite the URL, change the method, inject or overwrite headers, or replace the POST body. This is how you inject auth tokens, redirect traffic to a test backend, or tamper with payloads to test server-side validation handling.

\`\`\`typescript
test('inject an auth header into every API request', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const headers = {
      ...route.request().headers(),
      authorization: 'Bearer test-token-123',
    };
    await route.continue({ headers });
  });

  await page.goto('/dashboard');
  await expect(page.getByText('Welcome back')).toBeVisible();
});
\`\`\`

A more advanced pattern is to fetch the real response, then modify it before fulfilling. \`route.fetch()\` performs the actual request and gives you the real \`Response\`, which you can read and transform. This lets you keep most of a real payload while patching one field, perfect for testing rare server values without a real backend that produces them.

\`\`\`typescript
test('patch one field of the real API response', async ({ page }) => {
  await page.route('**/api/account', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.subscriptionTier = 'enterprise'; // override just this field
    await route.fulfill({ response, json });
  });

  await page.goto('/billing');
  await expect(page.getByText('Enterprise plan')).toBeVisible();
});
\`\`\`

## Route Method Reference

| Method | What it does | Common use |
|---|---|---|
| \`route.fulfill(options)\` | Responds with a fabricated response, request never hits the network | Mocking API responses, error states |
| \`route.abort(errorCode?)\` | Fails or blocks the request | Blocking assets, simulating network failure |
| \`route.continue(overrides?)\` | Sends the request, optionally modified | Injecting headers, rewriting URL or body |
| \`route.fetch(overrides?)\` | Performs the real request and returns the Response | Read-then-modify real responses |
| \`route.fallback(overrides?)\` | Defers to the next matching handler | Layering multiple route handlers |
| \`page.unroute(url, handler?)\` | Removes a previously registered route | Cleaning up or changing behavior mid-test |

## URL Matching: Glob and Regex Patterns

Playwright accepts three kinds of URL matcher: a glob string, a regular expression, or a predicate function. Globs are the most readable for simple cases. The \`*\` wildcard matches anything except a slash, while \`**\` matches across path segments including slashes, which is why API patterns almost always use \`**/api/...\`.

\`\`\`typescript
// Glob: ** crosses slashes, * does not.
await page.route('**/api/users/*', handler);        // /api/users/42
await page.route('**/api/**', handler);              // any /api path, any depth
await page.route('**/*.{png,jpg,svg}', handler);     // image extensions

// Regex: full control, great for query strings and alternatives.
await page.route(/\\/api\\/(users|orders)\\/\\d+/, handler);
await page.route(/analytics|tracking|telemetry/, handler);

// Predicate function: match on anything about the URL object.
await page.route(
  (url) => url.pathname.startsWith('/api') && url.searchParams.has('debug'),
  handler
);
\`\`\`

Globs match against the full URL, so remember to lead with \`**/\` to skip the scheme and host. When you need to match on query parameters precisely, or express "either of these endpoints", a regex is usually clearer than trying to bend a glob to the task.

## URL Matching Pattern Reference

| Pattern type | Example | Matches |
|---|---|---|
| Glob single segment | \`**/api/users/*\` | \`/api/users/42\`, not \`/api/users/42/posts\` |
| Glob multi segment | \`**/api/**\` | Any path under \`/api\` at any depth |
| Glob extension set | \`**/*.{css,js}\` | All CSS and JS files |
| Regex digits | \`/\\/orders\\/\\d+/\` | \`/orders/100\` but not \`/orders/abc\` |
| Regex alternation | \`/v1\\|v2/\` | URLs containing \`v1\` or \`v2\` |
| Predicate | \`(url) => url.host === 'cdn.example.com'\` | Only requests to that host |

## Synchronizing With waitForResponse and waitForRequest

Interception is about controlling traffic; synchronization is about reacting to it. \`page.waitForResponse()\` and \`page.waitForRequest()\` pause your test until a matching network event occurs, which is far more reliable than arbitrary timeouts. Always set up the wait before the action that triggers the request, then await them together with \`Promise.all\`.

\`\`\`typescript
test('wait for the search API response', async ({ page }) => {
  await page.goto('/search');

  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/api/search') && res.status() === 200
  );

  await page.getByRole('searchbox').fill('playwright');
  await page.getByRole('button', { name: 'Search' }).click();

  const response = await responsePromise;
  const body = await response.json();
  expect(body.results.length).toBeGreaterThan(0);
  await expect(page.getByTestId('result')).toHaveCount(body.results.length);
});

test('assert a request was sent with the right payload', async ({ page }) => {
  await page.goto('/contact');

  const requestPromise = page.waitForRequest('**/api/messages');

  await page.getByLabel('Message').fill('Hello');
  await page.getByRole('button', { name: 'Send' }).click();

  const request = await requestPromise;
  expect(request.method()).toBe('POST');
  expect(request.postDataJSON()).toMatchObject({ message: 'Hello' });
});
\`\`\`

These helpers complement interception perfectly: route handlers shape what comes back, while the wait helpers let you assert on exactly what went out and confirm the UI reacted. For more on building reliable suites, our [AI test automation tools guide](/blog/ai-test-automation-tools-2026) surveys the broader landscape.

## Mocking GraphQL

GraphQL is trickier than REST because every operation hits the same URL, usually \`/graphql\`, with the operation distinguished by the request body. You cannot match on URL alone; you must inspect the POST body to route on the operation name, then fulfill with the right shape.

\`\`\`typescript
test('mock specific GraphQL operations by name', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    const payload = route.request().postDataJSON();
    const op = payload?.operationName;

    if (op === 'GetCurrentUser') {
      return route.fulfill({
        json: { data: { currentUser: { id: '1', name: 'Grace Hopper' } } },
      });
    }

    if (op === 'ListProjects') {
      return route.fulfill({
        json: { data: { projects: [{ id: 'p1', title: 'Apollo' }] } },
      });
    }

    // Anything we did not explicitly mock falls through to the real server.
    return route.continue();
  });

  await page.goto('/app');
  await expect(page.getByText('Grace Hopper')).toBeVisible();
  await expect(page.getByText('Apollo')).toBeVisible();
});
\`\`\`

The key pattern is reading \`postDataJSON()\`, branching on \`operationName\`, and falling through to \`route.continue()\` for operations you do not want to mock. This selective mocking keeps tests focused: stub only the operations relevant to the scenario and let the rest behave normally.

## Stubbing Third-Party Scripts and Services

Third-party scripts, analytics, ad tags, chat widgets, payment SDKs, are a leading cause of slow and flaky tests. They are slow, occasionally down, and irrelevant to most assertions. Block them or stub them so your tests depend only on your own application.

\`\`\`typescript
test('neutralize analytics and ad scripts', async ({ page }) => {
  // Block known third-party hosts entirely.
  await page.route(/google-analytics|googletagmanager|doubleclick|hotjar/, (route) =>
    route.abort()
  );

  // Stub a payment SDK script with a harmless no-op so the page still loads.
  await page.route('**/js/stripe-v3.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'window.Stripe = function () { return { elements: () => ({}) }; };',
    })
  );

  await page.goto('/checkout');
  await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible();
});
\`\`\`

This single technique often cuts page-load time in tests dramatically and eliminates a whole class of failures that have nothing to do with your code.

## Context-Level Interception

Routes registered on a \`page\` apply only to that page. When you need the same interception across every page in a browser context, including popups and new tabs, register the route on the \`context\` instead. This is the right home for global mocks shared by an entire test file or fixture.

\`\`\`typescript
import { test as base } from '@playwright/test';

const test = base.extend({
  page: async ({ context, page }, use) => {
    // Apply to every page opened in this context.
    await context.route('**/api/feature-flags', (route) =>
      route.fulfill({ json: { newCheckout: true, betaBanner: false } })
    );
    await context.route(/analytics|telemetry/, (route) => route.abort());
    await use(page);
  },
});

test('feature flags are mocked for all pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('new-checkout')).toBeVisible();

  // A popup opened from this page also gets the mocked flags.
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Open settings' }).click(),
  ]);
  await expect(popup.getByTestId('beta-banner')).toBeHidden();
});
\`\`\`

Putting shared interception in a custom fixture like this keeps individual tests clean and ensures consistency, while still letting any single test override a route because page-level routes registered later win.

## HAR Replay With routeFromHAR

For complex apps with dozens of endpoints, hand-writing every mock is tedious. Playwright's \`routeFromHAR()\` records all network traffic to a HAR file once, then replays it on subsequent runs, giving you realistic mocks for an entire session with almost no code. First record against a live backend, then commit the HAR and replay it forever.

\`\`\`typescript
// Step 1: record once against the real backend.
test('record traffic to a HAR file', async ({ page }) => {
  await page.routeFromHAR('./hars/dashboard.har', {
    url: '**/api/**',
    update: true, // record/refresh the HAR on this run
  });
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
});

// Step 2: replay deterministically in CI, no backend needed.
test('replay traffic from the HAR file', async ({ page }) => {
  await page.routeFromHAR('./hars/dashboard.har', {
    url: '**/api/**',
    update: false,        // replay mode
    notFound: 'abort',    // abort anything not in the HAR
  });
  await page.goto('/dashboard');
  await expect(page.getByTestId('widget')).toHaveCount(6);
});
\`\`\`

The \`update: true\` flag records or refreshes the HAR; flip it to \`false\` to replay. The \`notFound\` option controls what happens to requests absent from the HAR, with \`'abort'\` keeping replay strict and \`'fallback'\` letting unmatched requests hit the network. HAR replay shines for snapshotting a known-good backend state and locking your UI tests to it.

## Removing Routes With unroute

Routes are not always permanent. You might mock an endpoint for the first half of a test and then want the real behavior, or replace one mock with another. \`page.unroute()\` removes a handler. Pass the same handler reference to remove a specific one, or omit it to clear all handlers for that URL.

\`\`\`typescript
test('swap mocks mid-test', async ({ page }) => {
  const emptyHandler = (route: import('@playwright/test').Route) =>
    route.fulfill({ json: { items: [] } });

  await page.route('**/api/inbox', emptyHandler);
  await page.goto('/inbox');
  await expect(page.getByText('Inbox zero')).toBeVisible();

  // Remove the empty mock and install a populated one.
  await page.unroute('**/api/inbox', emptyHandler);
  await page.route('**/api/inbox', (route) =>
    route.fulfill({ json: { items: [{ id: 1, subject: 'Hello' }] } })
  );

  await page.reload();
  await expect(page.getByText('Hello')).toBeVisible();
});
\`\`\`

There is also \`page.unrouteAll()\` to clear everything, which Playwright can call for you between tests, but explicit unrouting is useful when you need to change behavior within a single test.

## Best Practices for Reliable Interception

Keep a few principles in mind and your interception layer will stay maintainable. Always resolve every route exactly once; an unresolved route is a guaranteed timeout. Mock at the boundary you own, your own API, rather than deep third-party internals you do not control. Prefer specific URL patterns so a broad \`**/api/**\` mock does not accidentally swallow requests a test needs to be real. Put shared mocks in fixtures and let individual tests override them, since later page-level routes win.

Use \`waitForResponse\` and \`waitForRequest\` instead of fixed timeouts to synchronize, and assert on outgoing payloads with \`postDataJSON()\` to catch contract regressions. Block heavy and third-party assets to speed runs, but be deliberate so you do not mask a real load failure. For large surfaces, lean on HAR replay rather than hand-written mocks, and refresh the HAR periodically so it does not drift from reality. Finally, treat your mocks as test data that needs review: a mock that no longer matches the real API gives you green tests and red production, the worst outcome of all. To compare these techniques against mobile-focused tooling, our [Appium vs Playwright guide](/blog/appium-vs-playwright-2026) is a useful companion.

## Frequently Asked Questions

### How do I mock an API response in Playwright?

Register a route with \`page.route('**/api/endpoint', handler)\` and call \`route.fulfill()\` inside the handler with your fake status, content type, and body. For JSON, pass the \`json\` shortcut so Playwright serializes the body and sets the content type automatically. The request never reaches the real server, giving you fast, deterministic control over every UI state including empty, populated, and error.

### What is the difference between route.continue and route.fulfill?

\`route.fulfill()\` stops the request from reaching the network and responds with a fabricated reply you define, which is how you mock. \`route.continue()\` lets the request proceed to the real server, optionally with modified headers, URL, method, or body. Use fulfill to fake responses entirely; use continue to tamper with a request while still hitting the real backend.

### How do I block images or third-party scripts in Playwright?

Register a route matching the resources you want gone and call \`route.abort()\`. For example, \`page.route('**/*.{png,jpg,woff2}', route => route.abort())\` blocks images and fonts, and a regex like \`/google-analytics|hotjar/\` aborts analytics. This speeds up tests significantly and removes flakiness caused by slow or unavailable third-party services that your assertions do not depend on.

### Can Playwright intercept GraphQL requests?

Yes. Because GraphQL operations share one URL, route on \`**/graphql\` and read \`route.request().postDataJSON()\` to inspect the \`operationName\`. Branch on that name to fulfill specific operations with the right response shape, and call \`route.continue()\` for operations you do not want to mock. This selective approach lets you stub only the queries and mutations relevant to each scenario.

### What is routeFromHAR used for?

\`page.routeFromHAR()\` records all network traffic to a HAR file with \`update: true\`, then replays it with \`update: false\` so tests run against captured responses with no live backend. It is ideal for complex apps with many endpoints, giving you realistic mocks for an entire session without hand-writing each one. The \`notFound\` option controls whether unmatched requests abort or fall through.

### How do I wait for a network request in Playwright?

Use \`page.waitForResponse()\` or \`page.waitForRequest()\` with a URL pattern or predicate. Set up the wait before the action that triggers the request, then resolve them together with \`Promise.all\` or by awaiting the stored promise after the action. This is far more reliable than fixed timeouts and lets you assert on the actual response body or outgoing payload.

### Should I mock at the page or context level?

Mock at the page level for behavior specific to one page, and at the context level when the same interception should apply to every page in the context, including popups and new tabs. Context routes are the natural home for global mocks defined in a fixture. Remember that page-level routes registered later take priority, so a single test can still override a context-level mock when needed.

### How do I remove a route in Playwright?

Call \`page.unroute(url, handler)\` with the same URL pattern and handler reference to remove a specific route, or omit the handler to clear all routes for that URL. Use \`page.unrouteAll()\` to remove everything. This is useful for swapping one mock for another mid-test, such as starting with an empty-state response and then installing a populated one before reloading.

## Conclusion

Playwright network interception and mocking turns the network from a source of flakiness into a tool you fully command. With \`page.route()\` and the trio of \`fulfill\`, \`abort\`, and \`continue\`, you can mock any API response, block slow assets, modify requests in flight, and drive your UI through every state it can reach. Layer in glob and regex matching, GraphQL operation routing, HAR replay, context-level mocks, and the \`waitFor\` synchronization helpers, and you have a complete, fast, deterministic testing strategy that does not depend on a live backend.

Start small: pick one flaky test that depends on a real or third-party API, mock that boundary, and watch it become instant and reliable. Then push interception into a shared fixture so every test benefits. To keep building your automation skill set, browse the [QA skills directory](/skills) for ready-to-install Playwright, API, and network-mocking skills for your AI coding agents, and keep learning on the [QASkills blog](/blog/ai-test-automation-tools-2026).
`,
};
