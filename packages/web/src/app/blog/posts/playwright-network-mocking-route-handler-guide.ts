import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Network Mocking with route() Handlers: Complete Guide',
  description:
    'Mock network requests in Playwright with page.route, fulfill, abort, and modify. Patterns for stub data, slow networks, GraphQL, and conditional matching.',
  date: '2026-05-06',
  category: 'Guide',
  content: `
# Playwright Network Mocking with route() Handlers: Complete Guide

Network mocking is the most cost-effective lever for Playwright test reliability. A test that depends on a flaky third-party API, a half-built backend, or a database with shifting data is a test that fails for reasons that have nothing to do with the user-facing code. Playwright's \`page.route\` and \`context.route\` give you precise control over every HTTP request the browser makes: fulfill with stubbed JSON, abort with a network error, modify the request, delay the response, or pass through with logging.

This guide covers every pattern you will need for real-world mocking: REST stubs, GraphQL operation matching, file downloads, slow networks, conditional fallthroughs, and pre-recorded HAR files. Every example is TypeScript with Playwright 1.49+.

If you need the broader Playwright primer first, the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide) covers fundamentals. Install the [playwright-e2e skill](/skills/playwright-e2e) to get these patterns into your AI assistant by default.

## The route API at a glance

\`page.route(url, handler)\` intercepts every request matching \`url\`. The handler decides what happens next:

| Action | Method | Purpose |
|---|---|---|
| Fulfill | \`route.fulfill\` | Respond with synthetic data |
| Abort | \`route.abort\` | Fail the request with a network error |
| Continue | \`route.continue\` | Pass through, optionally modified |
| Fallback | \`route.fallback\` | Hand off to the next handler in chain |

The \`url\` parameter accepts a string, a glob, a RegExp, or a function. Glob patterns use \`**\` for any path segments and \`*\` for a single segment.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('mocks the user list endpoint', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      json: [
        { id: 1, name: 'Ada Lovelace' },
        { id: 2, name: 'Grace Hopper' },
      ],
    });
  });

  await page.goto('/users');
  await expect(page.getByRole('listitem')).toHaveCount(2);
});
\`\`\`

## Fulfill options

\`route.fulfill\` accepts a flexible options object.

| Option | Type | Purpose |
|---|---|---|
| \`status\` | number | HTTP status (default 200) |
| \`headers\` | object | Response headers |
| \`contentType\` | string | Shorthand for Content-Type header |
| \`body\` | string \\| Buffer | Raw response body |
| \`json\` | any | JSON-serialized body with content-type set |
| \`path\` | string | Read body from a file |

\`\`\`typescript
await page.route('**/api/profile', async (route) => {
  await route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'unauthorized' }),
  });
});
\`\`\`

The \`json\` shorthand handles serialization and content-type for you:

\`\`\`typescript
await route.fulfill({ json: { ok: true, data: [1, 2, 3] } });
\`\`\`

## Abort with error codes

\`route.abort\` simulates a network failure. The optional argument matches Chromium's error reasons.

| Error code | When to use |
|---|---|
| \`failed\` | Generic failure (default) |
| \`aborted\` | User canceled |
| \`timedout\` | Request timed out |
| \`accessdenied\` | Permission denied |
| \`connectionclosed\` | Server closed connection |
| \`connectionrefused\` | Connection refused |
| \`connectionreset\` | Connection reset |
| \`internetdisconnected\` | No internet |
| \`namenotresolved\` | DNS failure |

\`\`\`typescript
test('shows offline banner when network fails', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
  await page.goto('/');
  await expect(page.getByRole('alert', { name: /offline/i })).toBeVisible();
});
\`\`\`

## Modify before continuing

To inject headers or change the body before the request reaches the server, use \`route.continue\` with overrides.

\`\`\`typescript
await page.route('**/api/orders', async (route) => {
  const headers = {
    ...route.request().headers(),
    'x-test-user': 'integration',
  };
  await route.continue({ headers });
});
\`\`\`

You can also replace the URL, method, or post body. Be careful: changes propagate to the real server.

## Conditional matching with chained handlers

Multiple handlers register in declaration order. The most recent handler wins, but it can call \`route.fallback()\` to defer to earlier handlers.

\`\`\`typescript
await page.route('**/api/**', (route) => route.continue()); // pass-through

await page.route('**/api/users', async (route) => {
  // Only mock GET /api/users
  if (route.request().method() !== 'GET') return route.fallback();
  await route.fulfill({ json: { users: [] } });
});
\`\`\`

\`route.fallback\` is the equivalent of \`next()\` in middleware. Use it to layer concerns: logging, auth header injection, and selective stubs.

## Inspecting the request

The handler receives a \`Route\` object whose \`.request()\` method returns the original request.

\`\`\`typescript
await page.route('**/api/orders', async (route) => {
  const request = route.request();
  console.log(request.method(), request.url(), request.headers());

  if (request.method() === 'POST') {
    const postData = request.postDataJSON();
    expect(postData).toMatchObject({ sku: 'KB-001' });
  }
  await route.continue();
});
\`\`\`

\`postDataJSON()\` parses JSON bodies; \`postData()\` returns the raw string for form data or other content types.

## GraphQL operation matching

GraphQL typically posts every request to a single endpoint, so you cannot pattern-match by URL alone. Inspect the operation name.

\`\`\`typescript
await page.route('**/graphql', async (route) => {
  const body = route.request().postDataJSON() as { operationName?: string };
  switch (body.operationName) {
    case 'GetUsers':
      return route.fulfill({
        json: { data: { users: [{ id: '1', name: 'Ada' }] } },
      });
    case 'CreateUser':
      return route.fulfill({
        json: { data: { createUser: { id: '99' } } },
      });
    default:
      return route.continue();
  }
});
\`\`\`

For multiple operations, store mocks in a dictionary keyed by operation name.

## Delaying responses

To test loading states, delay the response with \`route.fulfill\` plus a manual wait.

\`\`\`typescript
await page.route('**/api/slow', async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
  await route.fulfill({ json: { data: 'eventually' } });
});

await page.goto('/');
await expect(page.getByRole('status', { name: 'Loading' })).toBeVisible();
await expect(page.getByText('eventually')).toBeVisible();
\`\`\`

For very slow networks, use the Chromium CDP throttling we cover in the [Playwright Mobile Emulation Devices Reference](/blog/playwright-mobile-emulation-guide).

## Pre-recorded HAR files

Capture real traffic once, replay forever. Useful for offline development.

\`\`\`bash
npx playwright codegen --save-har=fixture.har https://demo.qaskills.sh
\`\`\`

\`\`\`typescript
await page.routeFromHAR('./fixture.har', {
  url: '**/api/**',
  notFound: 'fallback',
});

await page.goto('https://demo.qaskills.sh');
\`\`\`

\`notFound: 'fallback'\` allows unmatched requests to hit the live network; \`notFound: 'abort'\` fails them.

## Mocking file downloads

For tests that trigger PDF or CSV downloads, fulfill with a file path.

\`\`\`typescript
await page.route('**/exports/orders.csv', async (route) => {
  await route.fulfill({
    path: './fixtures/orders.csv',
    headers: { 'content-disposition': 'attachment; filename="orders.csv"' },
  });
});

const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export CSV' }).click();
const download = await downloadPromise;
expect(download.suggestedFilename()).toBe('orders.csv');
\`\`\`

See [Playwright File Download Handling Guide](/blog/playwright-file-download-handling-guide) for the full download API.

## Removing a route handler

To unbind a route after a test phase, hold a reference and call \`unroute\`.

\`\`\`typescript
const handler = (route: Route) => route.fulfill({ json: { mocked: true } });
await page.route('**/api/users', handler);
await page.goto('/');
await page.unroute('**/api/users', handler);
\`\`\`

You can also call \`page.unrouteAll()\` to clear every handler.

## Stubbing third-party scripts

Block analytics, ads, or trackers that pollute traces and slow tests.

\`\`\`typescript
await page.route(/google-analytics|googletagmanager|hotjar|posthog/, (route) =>
  route.abort()
);
\`\`\`

Use sparingly; some apps depend on third-party scripts for core functionality. Validate against your app before broadly blocking.

## Service worker considerations

Service workers can intercept requests before \`page.route\` sees them. Either disable service workers entirely or include the SW scope in your routing strategy.

\`\`\`typescript
// In playwright.config.ts
use: {
  serviceWorkers: 'block',
},
\`\`\`

\`block\` disables registration; \`allow\` is the default. With workers blocked, every fetch hits the network and your routes can mock them.

## Worker-level mocks

For mocks shared across an entire test file, use \`test.beforeEach\` plus \`context.route\`.

\`\`\`typescript
test.beforeEach(async ({ context }) => {
  await context.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { id: 1, email: 'asha@example.com' } })
  );
});
\`\`\`

\`context.route\` applies to every page in the context, including popups.

## Verifying that a mock fired

When a mock is critical, assert that it was actually called.

\`\`\`typescript
let calls = 0;
await page.route('**/api/orders', async (route) => {
  calls++;
  await route.fulfill({ json: { ok: true } });
});

await page.goto('/checkout');
await page.getByRole('button', { name: 'Place order' }).click();
await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
expect(calls).toBe(1);
\`\`\`

The pattern catches accidental cache hits or skipped network calls.

## Common pitfalls

**Pitfall 1: Glob versus regex confusion.** \`**/api/users\` matches \`/api/users\` and \`/api/users/123\`. \`/api/users/*\` matches \`/api/users/123\` but not \`/api/users\`. Use \`**\` for any depth, \`*\` for a single segment.

**Pitfall 2: Race on first request.** If the page fetches before \`page.route\` registers, the first request slips through. Always register handlers before \`page.goto\` or assert on the post-mock state.

**Pitfall 3: Forgetting to handle non-API requests.** Static assets, source maps, and fonts may fall under a broad pattern. Use precise URLs or filter by method.

**Pitfall 4: Mocked responses lacking required headers.** Some clients fail without an explicit \`content-type\` even for JSON. Set it explicitly when in doubt.

**Pitfall 5: Mutating responses incorrectly.** \`route.continue\` does not let you change the response body; only request fields. To change the response, fetch with \`request\` and \`fulfill\` with the modified body.

## Anti-patterns

- Mocking your own API in every test. Reserve mocks for third-party services and edge cases the real API cannot easily produce.
- Mocking shapes that diverge from the real schema. Validate mocks against the real OpenAPI or GraphQL schema in a contract test.
- Catching errors in handlers and silently swallowing them. Let the handler throw; Playwright surfaces it as a test failure with full context.
- Using mocks to skip the slow path entirely. End-to-end coverage requires at least one happy-path test that hits the real backend.

## A complete pattern: contract-mock-end-to-end

\`\`\`typescript
import { test, expect } from '@playwright/test';

const mockResponse = {
  users: [
    { id: 1, email: 'ada@example.com', role: 'admin' },
    { id: 2, email: 'grace@example.com', role: 'member' },
  ],
};

test('user list renders mocked users', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    expect(route.request().method()).toBe('GET');
    await route.fulfill({ json: mockResponse });
  });
  await page.goto('/users');
  await expect(page.getByRole('listitem')).toHaveCount(mockResponse.users.length);
  await expect(page.getByText('ada@example.com')).toBeVisible();
});
\`\`\`

## Conclusion and next steps

Mocking with \`page.route\` removes the largest source of flake in Playwright tests: third-party APIs and unstable backends. Use it surgically, validate against real schemas, and reserve some tests to verify the real path.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate mocks that follow these patterns. For API-only tests, see [Playwright API Testing APIRequestContext Guide](/blog/playwright-api-testing-context-request-guide). For full mocking with service virtualization, read [API Mocking Service Virtualization Guide](/blog/api-mocking-service-virtualization-guide).
`,
};
