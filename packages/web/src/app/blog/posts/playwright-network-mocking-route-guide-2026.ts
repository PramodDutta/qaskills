import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Network Mocking: The Complete page.route Guide (2026)',
  description:
    'Master Playwright network mocking with page.route and context.route: fulfill JSON, abort resources, modify requests, HAR replay, and mock GraphQL deterministically.',
  date: '2026-06-28',
  category: 'Guide',
  content: `# Playwright Network Mocking: The Complete page.route Guide (2026)

Playwright network mocking is the single most powerful technique for writing fast, deterministic end-to-end tests. Instead of hitting a real backend that can be slow, flaky, or stateful, you intercept every HTTP request the browser makes and decide exactly what comes back. With Playwright network mocking through \`page.route\` and \`context.route\`, you can mock JSON responses, block images, rewrite headers, replay recorded HAR traffic, and force error states on demand — all without touching production code.

If you have ever fought a test that passes locally but fails in CI because an upstream API was down, Playwright route mocking is your fix. This guide walks through every interception primitive — \`route.fulfill\`, \`route.abort\`, \`route.continue\`, and \`route.fetch\` — plus glob versus regex URL matching, GraphQL mocking, \`waitForResponse\`, route removal, ordering and priority, and how to test loading, empty, and error states deterministically. Every example is real, runnable TypeScript using \`@playwright/test\`.

## Why Mock the Network at All?

Real network calls couple your UI tests to systems you do not control. A test that asserts "the dashboard shows 5 unread messages" depends on the backend actually returning 5 messages at that exact moment. Tomorrow it returns 6 and the test breaks for reasons unrelated to your frontend.

Playwright network mocking decouples the UI from the backend. You assert that *given* a known API response, the UI renders correctly. That is the contract you actually care about in an E2E or component test. The backend's correctness belongs in [API testing](/blog/api-testing-complete-guide), not in your browser tests.

The benefits stack up quickly:

- **Speed** — no network round trips, no waiting on a slow staging environment.
- **Determinism** — the same response every run, which is the core of how you [fix flaky tests](/blog/fix-flaky-tests-guide).
- **Edge-case coverage** — trivially force 500 errors, empty arrays, and slow responses that are nearly impossible to reproduce against a live server.
- **Isolation** — no test data pollution, no cleanup, no shared-state collisions in parallel runs.

## The page.route Mental Model

\`page.route(urlPattern, handler)\` registers a handler that fires for every matching network request. The handler receives a \`Route\` object and **must resolve it** by calling exactly one of four methods. If you never resolve the route, the request hangs forever and your test times out.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('basic route registration', async ({ page }) => {
  await page.route('**/api/health', async (route) => {
    // You MUST call one of: fulfill, abort, continue, fetch
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    });
  });

  await page.goto('/dashboard');
});
\`\`\`

Register routes **before** the navigation or action that triggers the request. A route added after \`page.goto\` will not catch requests that already fired during that navigation.

Here is the reference for the four route handler methods. Pick the one that matches your intent.

| Method | What it does | Network call made? | Typical use |
|---|---|---|---|
| \`route.fulfill()\` | Returns a synthetic response you define | No | Mock JSON, force error codes, return fixtures |
| \`route.abort()\` | Fails the request with a network error | No | Block images, ads, analytics, trackers |
| \`route.continue()\` | Lets the request proceed, optionally modified | Yes | Inject auth headers, rewrite URL or postData |
| \`route.fetch()\` | Performs the request and returns a \`Response\` you can read/modify | Yes | Read the real response, then tweak and fulfill |

## Mocking JSON with route.fulfill

The most common Playwright route mock API pattern is \`route.fulfill\`. You hand Playwright a fully-formed response and the browser never talks to the real server.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('renders a mocked list of users', async ({ page }) => {
  const mockUsers = [
    { id: 1, name: 'Ada Lovelace', role: 'admin' },
    { id: 2, name: 'Alan Turing', role: 'engineer' },
    { id: 3, name: 'Grace Hopper', role: 'engineer' },
  ];

  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify(mockUsers),
    });
  });

  await page.goto('/team');

  await expect(page.getByRole('listitem')).toHaveCount(3);
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
});
\`\`\`

You can also fulfill straight from a fixture file on disk using \`path\`, which keeps large payloads out of your test code:

\`\`\`typescript
await page.route('**/api/users', async (route) => {
  await route.fulfill({ path: 'tests/fixtures/users.json' });
});
\`\`\`

To inspect what the app requested before responding, read the \`Request\` off the route. This is how you assert query parameters or request bodies while still returning a mock:

\`\`\`typescript
await page.route('**/api/search**', async (route) => {
  const url = new URL(route.request().url());
  const query = url.searchParams.get('q');

  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ query, results: query === 'playwright' ? 12 : 0 }),
  });
});
\`\`\`

## Blocking Resources with route.abort

When you only care about application logic, downloading megabytes of images, fonts, and third-party analytics is pure waste. \`route.abort\` kills those requests, which speeds up runs and removes a whole class of external flakiness.

\`\`\`typescript
import { test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Block images, media, and fonts to speed up every test in this file
  await page.route('**/*.{png,jpg,jpeg,gif,svg,webp,woff,woff2}', (route) =>
    route.abort()
  );

  // Block known trackers and analytics by host
  await page.route(/google-analytics\\.com|googletagmanager\\.com|hotjar\\.com/, (route) =>
    route.abort()
  );
});

test('checkout flow without third-party noise', async ({ page }) => {
  await page.goto('/checkout');
  // ... your assertions run against a lean, deterministic page
});
\`\`\`

A cleaner way to block by resource type is to branch on \`route.request().resourceType()\`, which avoids brittle extension lists:

\`\`\`typescript
await page.route('**/*', (route) => {
  const type = route.request().resourceType();
  if (type === 'image' || type === 'font' || type === 'media') {
    return route.abort();
  }
  return route.continue();
});
\`\`\`

\`route.abort()\` accepts an optional error code such as \`'failed'\`, \`'timedout'\`, \`'connectionrefused'\`, or \`'accessdenied'\` — handy for simulating specific network failures rather than a generic abort.

## Modifying Requests with route.continue

\`route.continue\` lets the request go to the real server but allows you to rewrite it first. Pass \`headers\`, \`postData\`, \`url\`, or \`method\` overrides. This is the Playwright intercept request pattern for injecting auth tokens, rewriting endpoints, or tampering with payloads to test server validation.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('injects an Authorization header on every API call', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const headers = {
      ...route.request().headers(),
      authorization: 'Bearer test-token-abc123',
      'x-test-run': 'true',
    };
    await route.continue({ headers });
  });

  await page.goto('/dashboard');
  await expect(page.getByText('Welcome back')).toBeVisible();
});
\`\`\`

You can also rewrite the request body to test how the backend reacts to malformed input — useful when you want a real server round trip but a tampered payload:

\`\`\`typescript
await page.route('**/api/orders', async (route) => {
  if (route.request().method() === 'POST') {
    const original = route.request().postDataJSON();
    const tampered = { ...original, quantity: -1 };
    await route.continue({ postData: JSON.stringify(tampered) });
  } else {
    await route.continue();
  }
});
\`\`\`

## Glob vs Regex URL Matching

The first argument to \`page.route\` can be a glob string, a regular expression, or a predicate function. Choosing the right matcher keeps your routes precise so you do not accidentally intercept unrelated requests.

| Matcher | Example | Matches | Best for |
|---|---|---|---|
| Glob string | \`'**/api/users'\` | Any host, path ending \`/api/users\` | Simple path matching |
| Glob with wildcard | \`'**/api/users/*'\` | \`/api/users/42\` but not nested deeper | Single path segment |
| Glob with query | \`'**/api/search**'\` | \`/api/search?q=x\` (query string) | Endpoints with query params |
| Regex | \`/\\/api\\/users\\/\\d+/\` | \`/api/users/42\`, numeric IDs only | Precise pattern control |
| Predicate | \`(url) => url.pathname.startsWith('/api')\` | Anything your function returns true for | Complex custom logic |

A critical gotcha: a single \`*\` in a glob matches **within** a path segment, while \`**\` matches across segments **including** the query string. If your endpoint has a query string, use \`**/path**\` or a regex — a plain \`'**/api/search'\` glob will not match \`'/api/search?q=playwright'\`.

\`\`\`typescript
import { test } from '@playwright/test';

test('regex matches dynamic IDs only', async ({ page }) => {
  // Matches /api/users/1, /api/users/9999 — but NOT /api/users/me
  await page.route(/\\/api\\/users\\/\\d+$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 42, name: 'Mocked User' }),
    });
  });

  await page.goto('/users/42');
});
\`\`\`

Prefer a regex whenever you need anchoring (\`$\`), alternation (\`a|b\`), or numeric constraints (\`\\d+\`). Globs are fine for plain path prefixes and suffixes.

## Reading and Modifying a Real Response with route.fetch

Sometimes you want the *real* server data but with one field changed — for example, flipping a feature flag or zeroing out a balance. \`route.fetch\` performs the actual request, hands you the live \`APIResponse\`, and then you fulfill with a modified body. This is the Playwright route mock API technique for surgical edits.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('forces a feature flag on by patching the live response', async ({ page }) => {
  await page.route('**/api/config', async (route) => {
    // Hit the real endpoint
    const response = await route.fetch();
    const json = await response.json();

    // Patch just the field we care about
    json.features.newCheckout = true;

    await route.fulfill({
      response,
      json,
    });
  });

  await page.goto('/checkout');
  await expect(page.getByTestId('new-checkout-banner')).toBeVisible();
});
\`\`\`

Passing \`response\` to \`fulfill\` preserves the original status and headers, while \`json\` (or \`body\`) overrides the payload. You get the real response shape with a precise override — far safer than hand-writing a full mock that drifts out of sync with the API.

## HAR Replay with routeFromHAR

A HAR (HTTP Archive) file is a recording of every request and response a page made. Playwright can record one and replay it later, so an entire page's network traffic is mocked from a single file. This is the fastest way to mock a complex page without writing dozens of \`fulfill\` handlers.

First, record a HAR by running your test against the real backend once:

\`\`\`typescript
import { test } from '@playwright/test';

test('record traffic to a HAR file', async ({ page }) => {
  // 'update' records on first run, replays afterward
  await page.routeFromHAR('tests/hars/dashboard.har', {
    url: '**/api/**',
    update: true,
  });

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
});
\`\`\`

After the HAR exists, switch to replay mode so tests run fully offline and deterministically:

\`\`\`typescript
test('replay traffic from HAR', async ({ page }) => {
  await page.routeFromHAR('tests/hars/dashboard.har', {
    url: '**/api/**',
    update: false,            // replay, do not hit the network
    notFound: 'abort',        // abort any request not found in the HAR
  });

  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
\`\`\`

Use the \`url\` filter to scope the HAR to API traffic only, so static assets still load (or get blocked) as you prefer. Set \`notFound: 'abort'\` to catch any unexpected request that was not recorded — a great signal that the app changed. HAR replay pairs beautifully with the broader [Playwright E2E guide](/blog/playwright-e2e-complete-guide) workflow for snapshotting full page states.

## Mocking GraphQL by operationName

GraphQL is harder to mock than REST because every operation hits the *same* URL (usually \`/graphql\`) with a POST body. You cannot match by path alone — you have to read the request body and branch on \`operationName\`.

\`\`\`typescript
import { test, expect, type Route } from '@playwright/test';

async function mockGraphQL(route: Route, mocks: Record<string, unknown>) {
  const body = route.request().postDataJSON();
  const operation = body?.operationName as string | undefined;

  if (operation && operation in mocks) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mocks[operation] }),
    });
  } else {
    // Pass through any operation we did not explicitly mock
    await route.continue();
  }
}

test('mocks specific GraphQL operations', async ({ page }) => {
  await page.route('**/graphql', (route) =>
    mockGraphQL(route, {
      GetCurrentUser: { currentUser: { id: '1', name: 'Ada', plan: 'pro' } },
      GetProjects: {
        projects: [
          { id: 'p1', name: 'Apollo' },
          { id: 'p2', name: 'Gemini' },
        ],
      },
    })
  );

  await page.goto('/projects');
  await expect(page.getByText('Apollo')).toBeVisible();
  await expect(page.getByText('Gemini')).toBeVisible();
});
\`\`\`

The pattern is reusable: read \`postDataJSON()\`, look up \`operationName\` in a map, fulfill the matching mock, and \`continue()\` everything else so unmocked queries still work.

## Waiting on Requests and Responses

Mocking decides *what* comes back; \`waitForResponse\` and \`waitForRequest\` decide *when* your test proceeds. They let you assert that a request actually fired and synchronize on its completion instead of using arbitrary \`waitForTimeout\` calls — a major source of flaky tests.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('waits for the search response after typing', async ({ page }) => {
  await page.route('**/api/search**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: ['Playwright', 'Puppeteer'] }),
    });
  });

  await page.goto('/search');

  // Start waiting BEFORE the action that triggers the request
  const responsePromise = page.waitForResponse('**/api/search**');
  await page.getByPlaceholder('Search').fill('play');
  const response = await responsePromise;

  expect(response.status()).toBe(200);
  const json = await response.json();
  expect(json.results).toContain('Playwright');
});
\`\`\`

\`waitForRequest\` works the same way when you care about the outgoing request — for example asserting that an analytics event fired with the right payload. Always create the wait promise *before* the triggering action so you do not miss a fast response.

## Removing Routes and Per-Test Overrides

Routes registered in \`beforeEach\` apply to every test, but individual tests often need a different response — for example a global "happy path" mock that one test overrides with a 500 error. Playwright resolves routes in **reverse registration order**, so the *last* route added wins. You can also explicitly remove routes with \`page.unroute\`.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Default happy-path mock for all tests
  await page.route('**/api/orders', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ orders: [{ id: 1, total: 99 }] }),
    })
  );
});

test('shows an error banner when orders fail', async ({ page }) => {
  // This route is registered AFTER beforeEach, so it wins
  await page.route('**/api/orders', (route) =>
    route.fulfill({ status: 500, body: 'Internal Server Error' })
  );

  await page.goto('/orders');
  await expect(page.getByRole('alert')).toHaveText(/something went wrong/i);
});

test('removes a route mid-test', async ({ page }) => {
  await page.goto('/orders');
  // Stop intercepting; subsequent requests hit the real handler chain
  await page.unroute('**/api/orders');
});
\`\`\`

For finer control, Playwright supports \`{ times: 1 }\` so a route fires only once (the next matching request falls through to other handlers), and route handler priority is purely registration order — newest first. Keep your global mocks in \`beforeEach\` and let per-test routes override them.

## Testing Error, Empty, Loading, and Slow States

The real payoff of Playwright network mocking is deterministically driving UI states that are painful to reproduce against a live backend. Here is a strategy table mapping each scenario to the right technique.

| Scenario | Technique | Key detail |
|---|---|---|
| Server error (500) | \`route.fulfill({ status: 500 })\` | Assert error UI / retry button appears |
| Empty state | \`route.fulfill\` with \`[]\` or \`{ items: [] }\` | Assert "no results" placeholder |
| Loading / pending | \`route.fulfill\` after an artificial delay | Assert spinner is visible before resolve |
| Slow / timeout | Delay then resolve, or \`route.abort('timedout')\` | Assert timeout message or skeleton |
| Network down | \`route.abort('connectionrefused')\` | Assert offline banner |

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('shows the empty state when the API returns no items', async ({ page }) => {
  await page.route('**/api/notifications', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  );

  await page.goto('/notifications');
  await expect(page.getByText('You are all caught up')).toBeVisible();
});

test('shows a spinner while a slow request is pending', async ({ page }) => {
  await page.route('**/api/report', async (route) => {
    // Hold the response so we can assert the loading state
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ready: true }),
    });
  });

  await page.goto('/report');
  await expect(page.getByTestId('spinner')).toBeVisible();
  await expect(page.getByText('Report ready')).toBeVisible({ timeout: 5000 });
});
\`\`\`

Being able to script these states on demand is exactly why mocking is central to any serious effort to [fix flaky tests](/blog/fix-flaky-tests-guide) — you stop hoping the backend cooperates and start controlling it.

## page.route vs context.route

\`page.route\` scopes interception to a single page. \`context.route\` applies to every page in the browser context, including popups and new tabs. Use \`context.route\` for cross-cutting concerns like blocking analytics or injecting auth across an entire session; use \`page.route\` for test-specific mocks tied to one page.

\`\`\`typescript
import { test } from '@playwright/test';

test('blocks analytics across the whole context', async ({ context, page }) => {
  // Applies to every page opened in this context, including new tabs
  await context.route(/segment\\.io|mixpanel\\.com/, (route) => route.abort());

  await page.goto('/');
  const popup = await page.waitForEvent('popup', { timeout: 2000 }).catch(() => null);
  // The popup also has analytics blocked, no extra setup needed
});
\`\`\`

A practical convention: put context-level routes (resource blocking, analytics, auth headers) in a shared fixture or \`beforeEach\` using \`context.route\`, and keep page-level data mocks in the individual tests with \`page.route\`. This mirrors how teams structure reusable interception in the larger [Playwright E2E guide](/blog/playwright-e2e-complete-guide).

## Conclusion

Playwright network mocking turns brittle, backend-coupled browser tests into fast, deterministic, fully controlled checks. With \`route.fulfill\` you return synthetic JSON; with \`route.abort\` you strip out images and trackers; with \`route.continue\` you rewrite requests; and with \`route.fetch\` you surgically patch real responses. HAR replay snapshots an entire page's traffic, GraphQL mocking branches on \`operationName\`, and \`waitForResponse\` synchronizes without arbitrary sleeps. Layer in glob-versus-regex matching, route ordering, and per-test overrides, and you can drive every error, empty, loading, and slow state on demand.

The teams that ship reliable test suites treat interception as a first-class skill, not an afterthought. If you want ready-made, agent-friendly testing playbooks that bundle these patterns into reusable workflows, [browse QA skills](/skills) on QASkills.sh and drop them straight into your Playwright project. Pair this guide with our [API testing complete guide](/blog/api-testing-complete-guide) for the backend side, and you will have both halves of a rock-solid test pyramid.

## Frequently Asked Questions

### How do I mock an API in Playwright?

Register an interceptor with \`page.route\` that matches the endpoint URL, then resolve each request by calling \`route.fulfill\` with a status, content type, and JSON body. The browser never reaches the real server, so the response is identical every run. Add the route before the navigation or action that triggers the request, otherwise the call fires before your handler is registered and the mock is missed.

### What is the difference between page.route and context.route?

\`page.route\` scopes interception to one page, while \`context.route\` applies to every page in the browser context, including popups and newly opened tabs. Use the context variant for cross-cutting concerns such as blocking analytics, stripping images, or injecting authentication headers across an entire session. Reach for the page variant when a mock is specific to a single test and you do not want it leaking into other pages.

### How do I block images in Playwright?

Add a route that matches image requests and call \`route.abort\` instead of fulfilling them. You can match by file extension with a glob pattern or, more robustly, branch on the request resource type and abort when it equals image, font, or media. Blocking these resources speeds up test runs and removes a common source of external flakiness, since the test no longer waits on assets it does not assert against.

### Can Playwright record and replay network with HAR?

Yes. Call \`routeFromHAR\` with a file path and set the update option to true on the first run to record all matching traffic into a HAR archive. On later runs, set update to false to replay the recorded responses entirely offline, with no real network calls. Use the url filter to scope recording to API traffic, and set notFound to abort so any unexpected, unrecorded request surfaces as a clear failure.

### How do I modify a request before it is sent in Playwright?

Use \`route.continue\` and pass overrides for headers, postData, url, or method. The request still travels to the real server, but with your modifications applied. This is the standard way to inject authorization tokens, rewrite an endpoint, or tamper with a payload to verify server-side validation. To change the response instead of the request, use \`route.fetch\` to perform the call, then fulfill with an edited body.

### Why is my Playwright route not intercepting requests?

The most common cause is registering the route after the request already fired. Always set up routes before \`page.goto\` or the triggering action. The second common cause is a mismatched URL pattern: a single asterisk does not cross path segments and a plain glob will not match a query string, so use a double asterisk or a regular expression for endpoints with parameters. Verify by logging the request URLs the page actually makes.

### How do I mock GraphQL in Playwright?

Because GraphQL requests all share one endpoint, match on the URL and then read the request body with postDataJSON to inspect the operationName field. Branch on that operation name, fulfill the requests you want to mock with a data object, and let everything else continue to the real server. This keeps your mocks targeted to specific queries and mutations rather than overriding the entire GraphQL endpoint at once.

### Does route mocking work for requests made outside the browser?

Playwright route interception only applies to requests the browser context makes, such as fetch, XHR, images, and documents. Requests made through the separate \`request\` API testing context are not affected by \`page.route\`. If you need to mock server-to-server calls or test backend endpoints directly, handle those at the API layer rather than through browser interception, and keep route mocking focused on what the page itself loads.`,
};
