import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright page.route + route.fulfill Network Mocking Reference',
  description:
    'Complete reference for Playwright network mocking with page.route, route.fulfill, route.abort, route.continue. Glob patterns, JSON stubs, fault injection, retry testing in 2026.',
  date: '2026-06-07',
  category: 'Reference',
  content: `
# Playwright page.route + route.fulfill Network Mocking Reference

\`page.route\` is the Playwright primitive that intercepts and mocks every network request your application makes. Combined with \`route.fulfill\` (return a stub response), \`route.abort\` (simulate a network failure), and \`route.continue\` (let the request through, optionally modified), it covers every network-mocking scenario you need: stubbing JSON APIs, simulating 500 errors, injecting latency, blocking analytics requests, modifying request bodies, and replaying recorded traffic. Cypress users call it \`cy.intercept\`. MSW users call it Mock Service Worker. Playwright calls it \`page.route\`, and it works without any additional library or browser extension.

This guide is the complete reference for \`page.route\` in 2026. We cover the glob and regex patterns it accepts, the four routing operations (fulfill, abort, continue, fallback), patterns for mocking JSON APIs, fault injection for testing retries, network throttling, recording and replaying with HAR files, and how routes interact with browser contexts. Every example is runnable Playwright TypeScript.

For broader Playwright fundamentals see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026). For context-level isolation that affects routing, see [Playwright BrowserContext + Incognito Sessions](/blog/playwright-browser-contexts-incognito-guide). The [playwright-e2e skill](/skills/playwright-e2e) installs these mocking patterns into Claude Code, Cursor, or Aider.

## The minimal route pattern

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('stub a JSON API endpoint', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),
    });
  });

  await page.goto('/users');
  await expect(page.getByText('Alice')).toBeVisible();
  await expect(page.getByText('Bob')).toBeVisible();
});
\`\`\`

The first argument is a URL pattern. The second is a handler that receives a \`Route\` object. The handler must call one of \`route.fulfill\`, \`route.abort\`, \`route.continue\`, or \`route.fallback\`.

## URL patterns

\`page.route\` accepts three pattern types:

| Pattern type | Example | Matches |
|---|---|---|
| Glob string | \`'**/api/*'\` | Any URL ending with \`/api/<one segment>\` |
| Regex | \`/\\/api\\/users\\/\\d+/\` | Any URL matching the regex |
| Function | \`(url) => url.pathname.startsWith('/api')\` | Whatever the function returns |

Glob is the most common. \`**\` matches any characters including slashes; \`*\` matches characters except slashes.

\`\`\`typescript
// Match all /api/ requests
await page.route('**/api/**', handler);

// Match a specific endpoint
await page.route('**/api/users/me', handler);

// Match by path parameter
await page.route(/\\/api\\/users\\/\\d+/, handler);

// Match by full URL
await page.route('https://api.example.com/v2/data', handler);

// Match with a function (most flexible)
await page.route((url) => url.searchParams.get('debug') === 'true', handler);
\`\`\`

## route.fulfill: stub the response

\`route.fulfill\` returns a synthetic response without contacting the server. Use it for JSON stubs, HTML overrides, and any deterministic response.

\`\`\`typescript
await page.route('**/api/profile', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ name: 'Test User', email: 'test@example.com' }),
  });
});
\`\`\`

Full \`fulfill\` options:

| Option | Type | Purpose |
|---|---|---|
| \`status\` | number | HTTP status (default 200) |
| \`statusText\` | string | Status text |
| \`headers\` | object | Response headers |
| \`contentType\` | string | Shortcut for Content-Type header |
| \`body\` | string \\| Buffer | Response body |
| \`json\` | any | JSON shortcut; sets body and contentType |
| \`path\` | string | Read body from a file |
| \`response\` | APIResponse | Reuse a response from another request |

The \`json\` shortcut is the cleanest for API mocks:

\`\`\`typescript
await page.route('**/api/profile', (route) =>
  route.fulfill({ json: { name: 'Test User', email: 'test@example.com' } })
);
\`\`\`

Reading from a file:

\`\`\`typescript
await page.route('**/api/products', (route) =>
  route.fulfill({ path: 'fixtures/products.json' })
);
\`\`\`

## route.abort: simulate network failure

\`route.abort\` makes the request fail as if the network were unreachable. Use it for testing retry logic, error boundaries, and offline UI states.

\`\`\`typescript
test('shows offline banner when API fails', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/dashboard');
  await expect(page.getByText('Unable to load. Please retry.')).toBeVisible();
});
\`\`\`

Abort takes an optional error code:

| Error code | Effect |
|---|---|
| \`'failed'\` (default) | Generic failure |
| \`'aborted'\` | User-style cancellation |
| \`'accessdenied'\` | Permission denied |
| \`'addressunreachable'\` | DNS failure |
| \`'blockedbyclient'\` | Browser blocked the request (ad blocker style) |
| \`'connectionclosed'\` | Connection reset |
| \`'connectionrefused'\` | Server refused |
| \`'connectionreset'\` | Mid-connection reset |
| \`'internetdisconnected'\` | No network |
| \`'namenotresolved'\` | DNS NXDOMAIN |
| \`'timedout'\` | Network timeout |

\`\`\`typescript
await page.route('**/api/slow', (route) => route.abort('timedout'));
\`\`\`

## route.continue: let through, optionally modified

\`route.continue\` sends the request to the real server. By default it forwards unchanged. You can modify the request first.

\`\`\`typescript
// Pass through unchanged
await page.route('**/api/**', (route) => route.continue());

// Modify the URL
await page.route('**/api/users', (route) => {
  route.continue({ url: 'https://staging-api.example.com/users' });
});

// Modify headers
await page.route('**/api/**', (route) => {
  route.continue({ headers: { ...route.request().headers(), 'X-Test': 'true' } });
});

// Modify the request body
await page.route('**/api/submit', async (route) => {
  const original = route.request().postDataJSON();
  await route.continue({ postData: JSON.stringify({ ...original, source: 'test' }) });
});
\`\`\`

## route.fallback: chain handlers

When you have multiple \`page.route\` handlers, the most recently registered handler runs first. To pass to the next handler, call \`route.fallback\`:

\`\`\`typescript
// Generic mock
await page.route('**/api/**', (route) => route.fulfill({ status: 500 }));

// Override for one endpoint
await page.route('**/api/health', async (route) => {
  // Let the generic handler run for everything except /health
  if (route.request().url().includes('/health')) {
    await route.fulfill({ status: 200, body: 'ok' });
  } else {
    await route.fallback();
  }
});
\`\`\`

\`fallback\` is rarely needed if your route patterns are specific. Use it for layered mocking strategies.

## Mocking patterns

### Mock a successful API response

\`\`\`typescript
await page.route('**/api/products', (route) =>
  route.fulfill({
    json: {
      data: [
        { id: 1, name: 'Widget', price: 9.99 },
        { id: 2, name: 'Gadget', price: 19.99 },
      ],
    },
  })
);
\`\`\`

### Mock a paginated endpoint

\`\`\`typescript
await page.route('**/api/products*', async (route) => {
  const url = new URL(route.request().url());
  const page_num = parseInt(url.searchParams.get('page') ?? '1', 10);
  const items = Array.from({ length: 20 }, (_, i) => ({
    id: (page_num - 1) * 20 + i + 1,
    name: \`Item \${(page_num - 1) * 20 + i + 1}\`,
  }));
  await route.fulfill({ json: { data: items, page: page_num } });
});
\`\`\`

### Mock a 401 to test login redirect

\`\`\`typescript
test('redirects to login on 401', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({ status: 401 }));
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});
\`\`\`

### Mock a 500 error

\`\`\`typescript
test('shows error toast on 500', async ({ page }) => {
  await page.route('**/api/submit', (route) =>
    route.fulfill({
      status: 500,
      json: { error: 'Internal server error' },
    })
  );
  await page.goto('/contact');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Something went wrong')).toBeVisible();
});
\`\`\`

### Simulate slow network

\`\`\`typescript
await page.route('**/api/**', async (route) => {
  await new Promise((r) => setTimeout(r, 2000)); // 2-second delay
  await route.continue();
});
\`\`\`

For deterministic latency testing, combine with \`page.clock\` - see [Playwright Clock + Install/Fakers](/blog/playwright-clock-install-fakers-guide).

### Test retry logic

\`\`\`typescript
test('client retries on 503', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/data', async (route) => {
    attempts++;
    if (attempts < 3) {
      await route.fulfill({ status: 503 });
    } else {
      await route.fulfill({ json: { data: 'ok' } });
    }
  });
  await page.goto('/');
  await expect(page.getByText('data: ok')).toBeVisible();
  expect(attempts).toBe(3); // 2 failures, 1 success
});
\`\`\`

### Block analytics and tracking

\`\`\`typescript
await page.route('**/google-analytics.com/**', (route) => route.abort());
await page.route('**/segment.io/**', (route) => route.abort());
await page.route('**/datadog-rum.com/**', (route) => route.abort());
\`\`\`

This keeps test runs out of your production analytics dashboards.

## Routing scope: page vs context

\`page.route\` applies only to the page on which it is called. \`context.route\` applies to all pages within the context. For a multi-page test or a SignupGate-style modal, use context-level routing:

\`\`\`typescript
test('routes apply to all pages in context', async ({ context }) => {
  await context.route('**/api/**', (route) => route.fulfill({ json: {} }));
  const page1 = await context.newPage();
  const page2 = await context.newPage();
  // Both pages get the mock
});
\`\`\`

## HAR file recording and replay

You can record real traffic to a HAR file once and replay from it later, eliminating the need for hand-written stubs:

\`\`\`typescript
// Recording
const context = await browser.newContext({
  recordHar: { path: 'fixtures/api.har', mode: 'minimal' },
});
const page = await context.newPage();
await page.goto('/');
await context.close(); // HAR written to disk
\`\`\`

\`\`\`typescript
// Replay
await context.routeFromHAR('fixtures/api.har');
const page = await context.newPage();
await page.goto('/'); // Requests are served from the HAR
\`\`\`

\`routeFromHAR\` supports an \`update\` option that records new entries during the run and saves them, useful for incrementally building a mock corpus.

## unroute: removing routes

\`\`\`typescript
const handler = (route) => route.fulfill({ json: { mocked: true } });
await page.route('**/api/**', handler);

// Later, remove the handler
await page.unroute('**/api/**', handler);
\`\`\`

\`unroute\` is rarely needed because routes are automatically cleared between tests (Playwright tears down the page or context). Use it within a test for stage-by-stage mocking changes.

## Inspecting the request

Inside a route handler, \`route.request()\` gives you the request being intercepted:

\`\`\`typescript
await page.route('**/api/**', async (route) => {
  const req = route.request();
  console.log(req.method(), req.url());
  console.log(req.postDataJSON());
  console.log(req.headers());
  await route.continue();
});
\`\`\`

Useful for asserting on what the application actually sent:

\`\`\`typescript
test('sends correct payload', async ({ page }) => {
  let capturedBody: any;
  await page.route('**/api/submit', async (route) => {
    capturedBody = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto('/');
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByRole('button', { name: 'Submit' }).click();
  expect(capturedBody).toEqual({ email: 'user@example.com' });
});
\`\`\`

## Route method matrix

| Method | What it does | When to use |
|---|---|---|
| \`fulfill\` | Return synthetic response | Stub JSON APIs |
| \`abort\` | Fail the request | Test error boundaries |
| \`continue\` | Send to real server | Pass-through with mods |
| \`fallback\` | Yield to next handler | Layered mocking |

## Conditional mocking based on request payload

Sometimes you want to mock only requests that have a specific body. The handler can inspect the request and decide:

\`\`\`typescript
await page.route('**/api/orders', async (route) => {
  const body = route.request().postDataJSON();

  if (body.amount > 10000) {
    // High-value orders need approval - mock as pending
    await route.fulfill({ json: { status: 'pending', orderId: 'ORD-001' } });
  } else {
    // Regular orders are auto-approved
    await route.fulfill({ json: { status: 'approved', orderId: 'ORD-002' } });
  }
});
\`\`\`

This pattern lets one route handler cover multiple test scenarios based on the data the application sends.

## GraphQL mocking

GraphQL APIs use a single endpoint with different queries in the request body. Route by URL, then dispatch by operation name:

\`\`\`typescript
await page.route('**/graphql', async (route) => {
  const body = route.request().postDataJSON();
  const op = body.operationName;

  if (op === 'GetUser') {
    await route.fulfill({ json: { data: { user: { id: 1, name: 'Test User' } } } });
  } else if (op === 'CreateOrder') {
    await route.fulfill({ json: { data: { createOrder: { id: 'O-1', total: 100 } } } });
  } else {
    // Pass everything else to the real server
    await route.fallback();
  }
});
\`\`\`

This is the cleanest way to mock a GraphQL API. Each operation is a separate branch in the handler.

## WebSocket awareness

While \`page.route\` does not intercept WebSocket frames, you can listen to them:

\`\`\`typescript
test('listens to websocket frames', async ({ page }) => {
  const messages: string[] = [];
  page.on('websocket', (ws) => {
    ws.on('framereceived', ({ payload }) => {
      if (typeof payload === 'string') messages.push(payload);
    });
  });

  await page.goto('/chat');
  await page.getByRole('button', { name: 'Subscribe' }).click();

  await expect.poll(() => messages.length).toBeGreaterThan(0);
});
\`\`\`

For WebSocket route interception (newer Playwright versions support \`page.routeWebSocket\`), check the latest docs. The same \`fulfill\`/\`continue\` semantics apply.

## Performance: avoid intercepting everything

Intercepting every request adds overhead. For most tests, mock only the endpoints you care about and let everything else through naturally:

\`\`\`typescript
// Good: targeted mock
await page.route('**/api/users', (route) => route.fulfill({ json: stubData }));

// Bad: intercept everything for no reason
await page.route('**/*', (route) => route.continue());
\`\`\`

When you do want to intercept broadly (block all tracking, for example), match specific hostnames rather than \`**/*\`.

## Route ordering and priority

When you register multiple routes for overlapping patterns, the most recently registered route runs first. To force an explicit order, use specific patterns:

\`\`\`typescript
// Order matters: more specific patterns should be registered after general ones
await page.route('**/api/**', (route) => route.fulfill({ json: { general: true } }));
await page.route('**/api/users/me', (route) => route.fulfill({ json: { specific: true } }));

// /api/users/me uses the specific handler (registered second, more specific match)
// /api/products uses the general handler
\`\`\`

For the general handler to apply only when no specific handler matches, the specific handler should call \`route.fulfill\` (not \`route.fallback\`). If the specific handler calls \`fallback\`, the general handler runs.

## Routes and authentication

Routes do not bypass authentication. If your test uses \`storageState\` to authenticate, the routes still apply on top - they intercept requests after the application has added auth headers. To inspect the auth headers:

\`\`\`typescript
await page.route('**/api/**', async (route) => {
  console.log('Auth header:', route.request().headers()['authorization']);
  await route.continue();
});
\`\`\`

This is useful for debugging "why does my mock not include the auth context" issues - the issue is usually that the mock did not add the response header the application expected.

## Stable JSON fixtures

For repeated tests against the same mock data, extract the JSON to a fixture file:

\`\`\`typescript
// fixtures/users.json
[
  { "id": 1, "name": "Alice" },
  { "id": 2, "name": "Bob" }
]

// test file
import users from './fixtures/users.json';

test('uses fixture', async ({ page }) => {
  await page.route('**/api/users', (route) => route.fulfill({ json: users }));
  await page.goto('/users');
  await expect(page.getByText('Alice')).toBeVisible();
});
\`\`\`

This keeps the test code clean and the fixture data reusable across tests.

## Frequently Asked Questions

### What is page.route in Playwright?

\`page.route\` intercepts network requests matching a URL pattern. The handler can return a synthetic response (\`route.fulfill\`), simulate failure (\`route.abort\`), or pass through to the real server (\`route.continue\`). It is Playwright's built-in network mocking primitive, equivalent to Cypress \`cy.intercept\` or Mock Service Worker.

### How do I mock a JSON API response with Playwright?

Call \`page.route('**/api/endpoint', (route) => route.fulfill({ json: { ... } }))\`. The \`json\` shortcut sets the body and Content-Type automatically. Any test running after the route is registered will receive your stub instead of contacting the real server.

### What is the difference between route.continue and route.fallback?

\`route.continue\` sends the request to the real server (optionally with modifications). \`route.fallback\` passes the request to the next matching route handler in the chain. Use \`continue\` to talk to the actual backend; use \`fallback\` to layer multiple stub handlers.

### Can I simulate network failures with Playwright?

Yes. Call \`route.abort()\` or \`route.abort('timedout')\` to fail a request. Optional error codes include \`internetdisconnected\`, \`connectionrefused\`, \`namenotresolved\`, and others. Combined with retry tests, this verifies your error handling.

### How do I record real network traffic and replay it as mocks?

Create a context with \`recordHar: { path: 'fixtures/api.har' }\`, run through your scenario, then close the context. In later tests, call \`context.routeFromHAR('fixtures/api.har')\` and Playwright replays the recorded responses. Set \`update: true\` to add new requests to the HAR during the run.

### Why does my route handler not run?

Common causes: the URL pattern does not match the actual URL (check with \`route.request().url()\`), the route is registered after the request is already made, or another handler claimed the request first via \`route.continue\`. Register routes before the request fires, typically before \`page.goto\`.

### Can I intercept WebSocket traffic with page.route?

No. \`page.route\` intercepts HTTP and fetch/XHR requests only. For WebSocket testing, use \`page.on('websocket')\` to observe and \`page.routeWebSocket\` (added in newer Playwright versions) to intercept. WebSockets follow a different lifecycle than HTTP.

### Does page.route apply across all pages in a BrowserContext?

\`page.route\` is per-page. To apply across all pages in a context, use \`context.route\` instead. The API is identical; the scope is broader. Useful for multi-page tests or tests with pop-ups where every page needs the same mock.

## Route handler error handling

If your route handler throws or hangs, the request also hangs. Always wrap handlers in try-catch when doing complex logic:

\`\`\`typescript
await page.route('**/api/orders', async (route) => {
  try {
    const body = route.request().postDataJSON();
    const result = computeMockResponse(body);
    await route.fulfill({ json: result });
  } catch (err) {
    console.error('Route handler error:', err);
    await route.fulfill({ status: 500, json: { error: 'mock handler failed' } });
  }
});
\`\`\`

This ensures tests fail fast on handler bugs rather than hanging until the action timeout.

## Mocking versus contract testing

Network mocking with \`page.route\` validates that your application handles a specific response correctly. It does NOT validate that the response shape matches what the real backend produces. For shape validation, you need contract testing - tests that compare the mock data against the actual API schema.

Common pairing:

\`\`\`typescript
// In your test
import { mockUserResponse } from './fixtures/users';

await page.route('**/api/users/me', (route) => route.fulfill({ json: mockUserResponse }));

// In your contract test (separate file)
import { mockUserResponse } from './fixtures/users';
import { ApiUserSchema } from './schemas/api';

test('mock matches API schema', () => {
  expect(() => ApiUserSchema.parse(mockUserResponse)).not.toThrow();
});
\`\`\`

The contract test ensures that if the backend changes its response shape, your mock fails the schema check before your application tests pass with stale fixtures.

## Real-world example: testing offline mode

\`\`\`typescript
test('app shows cached data when offline', async ({ page, context }) => {
  // First, load normally and let the app cache data
  await page.goto('/dashboard');
  await expect(page.getByText('Stats')).toBeVisible();

  // Then simulate offline
  await context.setOffline(true);
  await page.route('**/api/**', (route) => route.abort('internetdisconnected'));

  await page.reload();

  // The cached data should still appear
  await expect(page.getByText('Stats')).toBeVisible();
  await expect(page.getByText('Showing cached data')).toBeVisible();
});
\`\`\`

\`context.setOffline\` simulates network unavailability at the browser level. Combined with \`route.abort\`, it covers both "no network" and "API down" scenarios.

## Conclusion

\`page.route\` is the canonical Playwright primitive for network mocking in 2026. With \`route.fulfill\`, \`route.abort\`, \`route.continue\`, and HAR record/replay, it covers every scenario from stubbing a single JSON endpoint to recording an entire session and playing it back deterministically. There is no extra library, no service worker, no browser extension - it ships in Playwright.

For deterministic time control to pair with network mocking, see [Playwright Clock + Install/Fakers](/blog/playwright-clock-install-fakers-guide). For context-level routing in multi-page tests, see [Playwright BrowserContext + Incognito Sessions](/blog/playwright-browser-contexts-incognito-guide). For broader testing patterns, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026).

Install the [playwright-e2e skill](/skills/playwright-e2e) so your AI agent (Claude Code, Cursor, Aider) emits \`page.route\` mocks by default. Compare mocking approaches in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026).
`,
};
