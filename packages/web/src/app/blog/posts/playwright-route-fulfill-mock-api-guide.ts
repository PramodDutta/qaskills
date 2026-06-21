import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright route.fulfill: Mock API Responses (2026)',
  description:
    'Intercept network in Playwright with page.route and route.fulfill — stub JSON, fake 500s, modify live responses, test loading and offline states. Runnable examples.',
  date: '2026-06-21',
  category: 'Guide',
  content: `
# Playwright route.fulfill: Mock API Responses (2026)

The hardest part of testing a real web application is not clicking buttons — it is controlling the network. Your UI depends on a backend that returns different data on every request, occasionally fails, sometimes responds slowly, and is generally outside your control during a test run. If you point your end-to-end tests at a live API, you inherit all of that nondeterminism: a test that asserts "the dashboard shows 42 orders" breaks the moment someone places a 43rd order, and a test for the error banner can only run when the backend actually happens to be down. The professional answer is network interception: you intercept the requests your page makes and decide, in the test, exactly what comes back.

Playwright's interception primitives are \`page.route()\` for registering a handler against a URL pattern, and the \`Route\` object passed to that handler, whose three core methods — \`route.fulfill()\`, \`route.continue()\`, and \`route.abort()\` — let you respond with mock data, let the request proceed (optionally modified), or kill it outright. With \`route.fulfill()\` you stub a JSON payload, return a fake 500, or serve an empty list to test the empty state. With \`route.fetch()\` you can call the real endpoint, then modify the response before it reaches the page. With \`route.abort()\` you simulate offline and connection failures. This combination gives you total authority over the network layer, which means deterministic, fast, and fully controllable tests.

This guide is a complete, runnable reference for \`route.fulfill\` and its siblings. We cover registering routes, the difference between fulfilling, continuing, and aborting, glob versus regular-expression URL matching, stubbing JSON APIs, faking errors and timeouts and empty states, modifying live responses and headers, recording and replaying with HAR via \`routeFromHAR\`, scoping mocks per-test versus globally with fixtures, and removing routes with \`unroute\`. If you also need to control time-dependent behavior in the same tests — polling intervals, retry backoff — pair this with the sibling [Playwright Clock API guide](/blog/playwright-clock-api-mock-time-guide).

## Registering a Route with page.route

\`page.route(url, handler)\` intercepts every request whose URL matches the pattern and hands a \`Route\` object to your handler. The handler decides the fate of the request. The most basic mock fulfills a JSON response.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('stub the users endpoint', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Ada Lovelace' },
        { id: 2, name: 'Alan Turing' },
      ]),
    });
  });

  await page.goto('https://example.com/team');
  await expect(page.getByText('Ada Lovelace')).toBeVisible();
  await expect(page.getByText('Alan Turing')).toBeVisible();
});
\`\`\`

Register the route **before** the navigation or action that triggers the request, otherwise the request fires before the handler exists and hits the real network. Every request matching \`**/api/users\` now receives your stub instead of whatever the backend would have returned, so the assertion is deterministic regardless of the live data.

## route.fulfill: Returning Mock Responses

\`route.fulfill(options)\` completes the request with a response you fully specify. The common options are \`status\`, \`contentType\`, \`headers\`, and \`body\` (or \`json\` as a shortcut that sets the content type and stringifies for you).

\`\`\`typescript
test('fulfill with the json shortcut', async ({ page }) => {
  await page.route('**/api/profile', async (route) => {
    // The json option stringifies and sets application/json automatically.
    await route.fulfill({
      json: { id: 7, plan: 'pro', credits: 1200 },
    });
  });

  await page.goto('https://example.com/account');
  await expect(page.getByTestId('plan')).toHaveText('pro');
  await expect(page.getByTestId('credits')).toHaveText('1200');
});
\`\`\`

You can fulfill from a file with the \`path\` option, which is handy for large fixture payloads kept under version control.

\`\`\`typescript
test('fulfill from a fixture file on disk', async ({ page }) => {
  await page.route('**/api/catalog', async (route) => {
    await route.fulfill({ path: './fixtures/catalog.json' });
  });

  await page.goto('https://example.com/shop');
  await expect(page.getByRole('listitem')).toHaveCount(25);
});
\`\`\`

## route.continue: Let the Request Proceed, Optionally Modified

\`route.continue(options?)\` lets the request go to the real server. Called with no arguments it is a pass-through; called with overrides it rewrites the outgoing request — the URL, method, headers, or post data — before it leaves the browser. This is how you inject an auth header, redirect to a staging host, or tweak a payload without touching the application code.

\`\`\`typescript
test('inject an auth header on every api request', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const headers = {
      ...route.request().headers(),
      authorization: 'Bearer test-token-123',
    };
    await route.continue({ headers });
  });

  await page.goto('https://example.com/dashboard');
  await expect(page.getByTestId('user-name')).toBeVisible();
});
\`\`\`

Use \`continue\` when you genuinely want the real backend involved but need to shape the request. If you want to inspect or alter the **response** rather than the request, you need \`route.fetch\`, covered below.

## route.abort: Simulate Failures and Offline

\`route.abort(errorCode?)\` terminates the request as if it failed at the network level. With no argument it uses a generic failure; you can pass a specific error code to mimic particular conditions. This is the cleanest way to test offline banners, connection-error retry UI, and graceful degradation.

\`\`\`typescript
test('shows an offline banner when requests fail', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort('failed'));

  await page.goto('https://example.com/app');
  await expect(page.getByText('You appear to be offline')).toBeVisible();
});

test('block third-party trackers to speed up tests', async ({ page }) => {
  // Aborting analytics and ad requests trims flakiness and runtime.
  await page.route(/(analytics|doubleclick|hotjar)\\.com/, (route) =>
    route.abort(),
  );
  await page.goto('https://example.com');
});
\`\`\`

## route.fetch: Modify a Live Response

Sometimes you want most of the real response but need to change one field — flip a feature flag, inject a test-only record, corrupt a value to test validation. \`route.fetch()\` performs the request and returns the real \`APIResponse\`; you read it, modify it, and fulfill with the result.

\`\`\`typescript
test('modify a live response before it reaches the page', async ({ page }) => {
  await page.route('**/api/settings', async (route) => {
    const response = await route.fetch();
    const data = await response.json();

    // Force a feature flag on, keep everything else from the real response.
    data.features.betaDashboard = true;

    await route.fulfill({ response, json: data });
  });

  await page.goto('https://example.com/settings');
  await expect(page.getByTestId('beta-dashboard')).toBeVisible();
});
\`\`\`

Passing the original \`response\` to \`fulfill\` preserves its status and headers, while \`json\` overrides the body. This pattern keeps your mock realistic — you are editing genuine data, not inventing a whole payload — which catches schema drift the live API introduces.

## The Three Route Methods Compared

These three methods are the heart of interception. Choosing the right one is most of the skill.

| Method | What it does | Network hit | Typical use |
|---|---|---|---|
| \`route.fulfill()\` | Returns a response you define | No (pure mock) | Stub JSON, fake errors, empty states |
| \`route.continue()\` | Sends the request onward, optionally modified | Yes | Inject headers, rewrite URL/payload |
| \`route.abort()\` | Fails the request at the network level | No | Offline, connection errors, blocking |
| \`route.fetch()\` then \`fulfill\` | Calls real endpoint, then you edit the response | Yes | Modify live data, flip flags |

A handler must end the route exactly once — call one of \`fulfill\`, \`continue\`, \`abort\`, or fulfill-after-fetch. Forgetting to resolve the route hangs the request until timeout; resolving twice throws.

## Glob vs Regex URL Matching

\`page.route\` accepts three matcher forms: a glob string, a regular expression, or a predicate function. Globs are the most readable for path patterns; regex gives you precision; functions handle arbitrary logic.

\`\`\`typescript
// Glob: ** matches across path segments, * within one segment.
await page.route('**/api/users/*', handler);      // /api/users/42
await page.route('**/api/**', handler);            // any api path
await page.route('https://api.example.com/**', handler);

// Regex: full control, anchors, alternation, capture intent.
await page.route(/\\/api\\/users\\/\\d+$/, handler);   // numeric ids only
await page.route(/\\.(png|jpg|svg)$/, handler);       // image extensions

// Function predicate: match on anything in the URL object.
await page.route(
  (url) => url.pathname.startsWith('/api/') && url.searchParams.has('debug'),
  handler,
);
\`\`\`

| Matcher | Strength | Watch out for |
|---|---|---|
| Glob string | Readable, intuitive paths | \`*\` does not cross \`/\`; use \`**\` for that |
| RegExp | Precise, supports anchors/alternation | Must escape \`.\`, \`/\`; easy to over- or under-match |
| Function | Arbitrary logic on the URL object | Slightly less self-documenting |

A frequent bug is using a single \`*\` where \`**\` is needed: \`*/api/users\` will not match a multi-segment host path. When in doubt, \`**/api/...\` is the safe default.

## Simulating Errors, Timeouts, and Empty States

The biggest payoff of mocking is testing the unhappy paths that are nearly impossible to reproduce against a live backend on demand.

\`\`\`typescript
test('renders the 500 error state', async ({ page }) => {
  await page.route('**/api/orders', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    });
  });

  await page.goto('https://example.com/orders');
  await expect(page.getByText('Something went wrong')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('renders the empty state for no results', async ({ page }) => {
  await page.route('**/api/orders', async (route) => {
    await route.fulfill({ json: [] });
  });

  await page.goto('https://example.com/orders');
  await expect(page.getByText('No orders yet')).toBeVisible();
});

test('shows the loading spinner during a slow response', async ({ page }) => {
  await page.route('**/api/orders', async (route) => {
    // Hold the response to assert the loading UI, then resolve.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({ json: [{ id: 1, total: 99 }] });
  });

  const pending = page.goto('https://example.com/orders');
  await expect(page.getByTestId('spinner')).toBeVisible();
  await pending;
  await expect(page.getByTestId('spinner')).toBeHidden();
});
\`\`\`

A 401 lets you test the redirect-to-login flow; a 429 tests rate-limit handling; a malformed body tests your parser's resilience. None of these require coordinating with a backend team — you own the response.

## Modifying Headers

Headers matter for caching, content negotiation, security policy, and feature gating. \`fulfill\` and \`continue\` both accept a \`headers\` object, letting you set response headers the page reads or request headers the server receives.

\`\`\`typescript
test('fulfill with custom response headers', async ({ page }) => {
  await page.route('**/api/data', async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
        'x-ratelimit-remaining': '0',
      },
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto('https://example.com/data');
  // App reads x-ratelimit-remaining and shows a warning at 0.
  await expect(page.getByText('Rate limit reached')).toBeVisible();
});
\`\`\`

## Recording and Replaying with routeFromHAR

For complex pages making dozens of calls, hand-writing every mock is tedious. \`page.routeFromHAR()\` replays responses from a HAR (HTTP Archive) file — a recording of real network traffic. Record once, replay forever, fully offline and deterministic.

\`\`\`typescript
// Step 1: record real traffic into a HAR file.
test('record the dashboard traffic', async ({ page }) => {
  await page.routeFromHAR('./hars/dashboard.har', {
    update: true, // capture mode — writes the HAR
  });
  await page.goto('https://example.com/dashboard');
});

// Step 2: replay from the HAR in subsequent runs.
test('replay the recorded dashboard', async ({ page }) => {
  await page.routeFromHAR('./hars/dashboard.har', {
    url: '**/api/**',          // only serve api calls from the HAR
    notFound: 'abort',         // abort anything not in the recording
  });
  await page.goto('https://example.com/dashboard');
  await expect(page.getByTestId('widget')).toHaveCount(6);
});
\`\`\`

HAR replay is ideal when a page's network surface is large and stable. For a handful of endpoints whose payloads you want to read at a glance, explicit \`route.fulfill\` stubs are clearer. Many suites use both: HAR for the noisy background calls, hand-written fulfills for the one or two endpoints under test.

## Per-Test vs Global Mocking with Fixtures

Routes registered with \`page.route\` inside a test apply only to that test's page. To share a mock across many tests, register it in a fixture that wraps the \`page\`. This is the cleanest way to give an entire file or project a consistent mocked backend.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Default mocks applied to every test using this fixture.
    await page.route('**/api/session', (route) =>
      route.fulfill({ json: { userId: 1, role: 'admin' } }),
    );
    await page.route('**/api/feature-flags', (route) =>
      route.fulfill({ json: { betaDashboard: true } }),
    );

    await use(page);
  },
});

export { expect };
\`\`\`

\`\`\`typescript
// Spec file — inherits the session and flag mocks automatically.
import { test, expect } from './fixtures';

test('admin sees the beta dashboard', async ({ page }) => {
  await page.goto('https://example.com/dashboard');
  await expect(page.getByTestId('beta-dashboard')).toBeVisible();
});

// An individual test can override a shared mock by registering it again;
// later registrations take precedence for matching requests.
test('non-admin session', async ({ page }) => {
  await page.route('**/api/session', (route) =>
    route.fulfill({ json: { userId: 2, role: 'viewer' } }),
  );
  await page.goto('https://example.com/dashboard');
  await expect(page.getByTestId('beta-dashboard')).toBeHidden();
});
\`\`\`

For initialization that should run once for the whole suite rather than per test, see the [global setup and teardown guide](/blog/playwright-global-setup-teardown-guide).

## Removing Routes with unroute

\`page.unroute(url, handler?)\` removes a previously registered handler, restoring real network behavior for that pattern within the test. Use it when a test needs a mock for its first phase but the real (or a different) response for a later phase.

\`\`\`typescript
test('mock first, then hit the real endpoint', async ({ page }) => {
  const stub = (route) => route.fulfill({ json: { count: 0 } });
  await page.route('**/api/count', stub);

  await page.goto('https://example.com/counter');
  await expect(page.getByTestId('count')).toHaveText('0');

  // Remove the mock so the next phase uses a different handler.
  await page.unroute('**/api/count', stub);
  await page.route('**/api/count', (route) =>
    route.fulfill({ json: { count: 99 } }),
  );

  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('count')).toHaveText('99');
});
\`\`\`

There is also \`page.unrouteAll()\` to clear every handler at once, useful in teardown when you want a clean slate.

## When to Mock vs Hit the Real API

Mocking is powerful but not always correct. The decision hinges on what the test is verifying.

| Scenario | Mock the API | Hit the real API |
|---|---|---|
| Component renders a known payload | Yes | No |
| Error / loading / empty UI states | Yes | No |
| Edge cases hard to reproduce live | Yes | No |
| Fast, deterministic unit-style E2E | Yes | No |
| Contract / integration correctness | No | Yes |
| Backend logic, auth, persistence | No | Yes |
| Full happy-path smoke before release | No | Yes |

A healthy suite uses both layers: a large body of fast, fully-mocked tests for UI behavior across every state, plus a small set of integration tests that exercise the real backend to catch contract drift. Mock when you are testing the frontend's reaction to a response; hit the real API when you are testing that the response itself is correct. For the broader trade-offs between tools and strategies, our comparisons of [Postman vs Playwright](/blog/postman-vs-playwright) and [testRigor vs Playwright](/blog/testrigor-vs-playwright-2026) are useful companions.

## Frequently Asked Questions

### What is route.fulfill in Playwright?

\`route.fulfill\` is a method on the \`Route\` object that completes an intercepted request with a response you define. You specify \`status\`, \`contentType\`, \`headers\`, and \`body\` (or a \`json\` shortcut). It lets you return mock data without hitting the real server, so you can stub API responses, fake errors like 500s, and serve empty payloads to test specific UI states deterministically.

### What is the difference between route.fulfill, route.continue, and route.abort?

\`route.fulfill\` returns a mock response and never touches the network. \`route.continue\` sends the request to the real server, optionally rewriting its URL, headers, or body first. \`route.abort\` fails the request at the network level to simulate offline or connection errors. Each handler must call exactly one of them (or fulfill after \`route.fetch\`) to resolve the intercepted request once.

### How do I mock a JSON API response in Playwright?

Register a route before the request fires and fulfill it with JSON. Call \`await page.route('**/api/endpoint', route => route.fulfill({ json: { ... } }))\` before \`page.goto\`. The \`json\` option stringifies the object and sets the \`application/json\` content type automatically. For large payloads, use the \`path\` option to fulfill from a fixture file kept under version control.

### How do I simulate a network error or offline state in Playwright?

Use \`route.abort\`. Register a handler like \`page.route('**/api/**', route => route.abort('failed'))\` to fail matching requests at the network level, which triggers your app's offline banner or connection-error UI. You can pass a specific error code, and you can scope the pattern to only the endpoints you want to fail while letting others through.

### Should I mock APIs or test against the real backend?

Mock when you are testing the frontend's reaction to a response — rendering known data, error states, loading spinners, empty states, and edge cases hard to reproduce live. Hit the real API for contract and integration correctness, backend logic, auth, and full happy-path smoke tests. A strong suite uses many fast mocked tests plus a small set of real-backend integration tests to catch contract drift.

### What is the difference between glob and regex URL matching in route?

Globs are readable path patterns where \`*\` matches within one path segment and \`**\` matches across segments — \`**/api/**\` catches any API path. Regular expressions give precise control with anchors and alternation but require escaping characters like \`.\` and \`/\`. A common bug is using a single \`*\` where \`**\` is needed across segments. You can also pass a predicate function for arbitrary URL logic.

### How do I record and replay network traffic in Playwright?

Use \`page.routeFromHAR\` with a HAR file. Run once with \`update: true\` to record real traffic into the archive, then replay it in later runs by pointing \`routeFromHAR\` at the same file. Options like \`url\` limit which requests are served from the HAR and \`notFound: 'abort'\` controls what happens to unmatched requests. It is ideal for pages with large, stable network surfaces.

## Conclusion

Network interception with \`page.route\` and \`route.fulfill\` is the foundation of fast, deterministic Playwright tests. By stubbing JSON, faking 500s, simulating offline with \`route.abort\`, modifying live responses through \`route.fetch\`, and replaying recordings with \`routeFromHAR\`, you take complete control of the network layer — testing every loading, error, and empty state on demand. Scope mocks per-test or share them through fixtures, remove them with \`unroute\`, and reserve real-backend runs for contract checks. The payoff is a suite that runs in seconds and never flakes on data it cannot control.

Want more agent-ready automation patterns? Browse the QA skills directory at [/skills](/skills) for hands-on Playwright skills covering network mocking, interception, and beyond — and read the sibling guide on the [Playwright Clock API](/blog/playwright-clock-api-mock-time-guide) to pair deterministic data with deterministic time.
`,
};
