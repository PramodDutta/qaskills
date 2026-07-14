import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright route.fallback() vs route.continue()',
  description:
    'Compare Playwright route.fallback() vs route.continue(), understand newest-first handler ordering, and build layered network interception without surprises.',
  date: '2026-07-13',
  category: 'Comparison',
  content: `
# Playwright route.fallback() vs route.continue()

Three handlers match \`/api/orders\`: one adds an authorization header, one records the request, and one mocks a failure. Whether all three participate depends on a single choice. \`route.fallback()\` hands the request to the next matching handler. \`route.continue()\` sends it to the network immediately and ends Playwright's handler chain.

That difference is small at the call site and architectural at suite scale. A lone route can usually continue without consequence. Layered routing, where fixtures, page objects, and individual tests register overlapping patterns, requires fallback if older handlers are expected to run.

## The dispatch rule: last registered, first invoked

When several Playwright routes match the original request URL, the most recently registered matching handler runs first. Think of registration as a stack. Calling \`fallback()\` pops down to the next match. Calling \`continue()\`, \`fulfill()\`, or \`abort()\` terminates routing for that request.

This example makes ordering visible:

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('composes audit and authentication handlers', async ({ page }) => {
  const calls: string[] = [];

  await page.route('**/api/**', async route => {
    calls.push('authentication');
    await route.continue({
      headers: {
        ...route.request().headers(),
        authorization: 'Bearer test-token',
      },
    });
  });

  await page.route('**/api/orders', async route => {
    calls.push('audit');
    await route.fallback();
  });

  await page.goto('/orders');
  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
  expect(calls).toEqual(['audit', 'authentication']);
});
\`\`\`

The order may feel reversed until you account for registration. The broad authentication route is installed first, perhaps in a fixture. The narrower audit route is installed later in the test, so it sees the request first. Its fallback allows authentication to apply and ultimately send the request.

The matching URL is the original URL. If an intermediate fallback overrides \`url\`, subsequent handler selection is not recalculated against the new URL. That detail prevents request rewriting from unpredictably entering a different route chain.

| Handler action | Invokes an older matching route? | Reaches network? | Typical purpose |
|---|---:|---:|---|
| \`route.fallback()\` | Yes, when one exists | Eventually, if chain permits | Compose independent middleware-like handlers |
| \`route.continue()\` | No | Yes, immediately | Final pass-through with optional request changes |
| \`route.fulfill()\` | No | No, unless response came from \`route.fetch()\` | Return a synthetic or modified response |
| \`route.abort()\` | No | No | Simulate network failure or block a resource |
| Return without any action | No useful progression | Request remains stalled | A bug that normally ends in timeout |

## Choosing continue for a terminal pass-through

Use \`continue()\` when the current handler owns the final decision and no other Playwright handler should inspect or transform the request. A suite-level route that injects credentials and then reaches the real backend is a reasonable terminal handler. So is a test-specific route whose only task is to rewrite a URL toward a local server.

Terminal does not mean no modifications. Both continue and fallback accept overrides for URL, method, headers, and post data. Header values supplied in the override replace the outgoing request headers, so spread existing headers when you mean to add one. A header set to \`undefined\` can be removed in supported route override semantics.

One subtle risk is registering a broad continue handler late. Because it executes first, it prevents every older handler from running. A diagnostic logger appears broken, a shared mock is silently bypassed, or an auth fixture never injects its header. The network request may still succeed, which makes the routing defect harder to notice.

Use narrowly scoped patterns where possible. A route for \`**/api/payments/**\` communicates ownership better than \`**/*\`. If a broad pattern is unavoidable, explicitly fallback for requests the handler does not own.

## Choosing fallback for layered request policy

Fallback is appropriate when handlers represent separable policies. One layer can remove volatile headers for a recording proxy, another can inject tenant identity, and a third can decide between a real and mocked response. Each layer modifies or observes the request, then delegates.

The canonical branch is method-based routing. A recently registered POST handler falls back when the method is not POST; an older GET handler does the same for non-GET traffic; a final catch-all continues. This is clearer than one giant handler containing every endpoint and method combination.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('mocks create but reads orders from the backend', async ({ page }) => {
  await page.route('**/api/orders', async route => {
    await route.continue();
  });

  await page.route('**/api/orders', async route => {
    if (route.request().method() !== 'POST') {
      await route.fallback();
      return;
    }

    const submitted = route.request().postDataJSON() as {
      sku: string;
      quantity: number;
    };
    await route.fulfill({
      status: 201,
      json: { id: 'order-test-7', ...submitted, state: 'accepted' },
    });
  });

  await page.goto('/orders');
  await expect(page.getByTestId('orders-loaded-from-api')).toHaveText('ready');

  await page.getByLabel('SKU').fill('KB-42');
  await page.getByLabel('Quantity').fill('2');
  await page.getByRole('button', { name: 'Create order' }).click();
  await expect(page.getByText('order-test-7')).toBeVisible();
});
\`\`\`

The POST route is registered last and therefore runs first. GET requests fall back to the older terminal route and reach the backend. POST requests are fulfilled without invoking it. This scenario demonstrates why fallback is delegation, not a synonym for continue.

## How overrides travel down the chain

An intermediate handler can call \`fallback({ headers, method, postData, url })\`. The next handler receives a request reflecting those overrides. That allows a test to build a processing pipeline, but it also creates responsibility for preserving valid combinations. Changing a method from GET to POST without supplying an appropriate body or content type may create an unrealistic request.

Headers deserve special attention. Playwright exposes request headers as an object, and an override supplies the headers used downstream. Build a new object rather than mutating the one returned by the request. Normalize expectations because HTTP header names are case-insensitive, while application logging and snapshots may display a particular casing.

| Layer example | Recommended action | Reason delegation matters |
|---|---|---|
| Per-test fault injection for one endpoint | Fulfill or abort when condition matches, fallback otherwise | Unrelated requests retain shared fixture behavior |
| Tenant header fixture | Fallback with merged headers | Older recording or terminal layer still participates |
| Request counter | Fallback after incrementing | Observation should not decide transport |
| Real-backend escape hatch | Continue | It intentionally ends interception |
| HAR replay with live misses | Use HAR not-found fallback configuration | Replay owns hits, network handles absent entries |
| Response patch | Fetch then fulfill | Continuing cannot modify the received response |

Avoid assuming fallback makes handlers run in registration order. It does the opposite: newest first, then older. Write a small call-order assertion when a routing stack becomes critical infrastructure. That test is cheap and protects future fixture refactoring.

## Page routes and browser-context routes

Playwright supports routing on both \`Page\` and \`BrowserContext\`. Page routes take precedence over context routes when both match. This is useful for local overrides: a context fixture can provide suite-wide authentication, while a test's page route injects a one-off API response.

Precedence and fallback must be considered together. A page route that calls continue can reach the network without giving an applicable context route the opportunity to run. If the page-level override wants shared context behavior on non-target traffic, it should narrow its URL or fallback appropriately.

Context routes apply to pages in that context, which makes them a good home for cross-page policy. Popup and multi-tab tests particularly benefit. Page routes are easier to reason about for one screen and naturally disappear with the page. Do not install identical broad handlers at both levels merely for convenience; ownership becomes obscure and call order surprises follow.

Routing also disables HTTP cache. A test comparing cached and uncached browser behavior should not use interception without accounting for that side effect. Service workers can intercept traffic before Playwright's routing sees it; when request interception is the subject of the test, blocking service workers in the browser context may be appropriate.

For broader interception patterns, including response modification and event observation, see the [Playwright network interception and mocking guide](/blog/playwright-network-mocking-route-handler-guide). It helps distinguish route control from passive request events.

## Mock ownership without a routing monolith

Large suites often start with a single \`mockApi(page)\` function. It registers a broad route, switches on URL paths, parses methods, and contains dozens of response bodies. That centralization makes fallback seem unnecessary, but it creates merge conflicts and hidden coupling between tests.

A better design organizes handlers by capability. An inventory helper owns inventory endpoints. A billing helper owns billing traffic. A scenario fixture composes only the capabilities needed by that test. Each helper must explicitly state whether unmatched traffic falls back, continues, or aborts.

Defaulting to fallback inside a partial helper is usually safest. Defaulting to abort is useful for a hermetic test that must prove there are no unmocked calls. Defaulting to continue creates a hybrid test and should be intentional, because a backend outage or data drift can then influence results.

Do not register a new route inside a frequently called page-object method without removing it. Routes persist for the page or context until unrouted or closed, and repeated registrations alter ordering. Install scenario routes in setup, or retain the handler function and remove it with \`unroute\` during cleanup. For broad teardown, \`unrouteAll\` offers behaviors for in-flight handlers, but cleanup should not race active requests.

## Fulfillment is not a variant of continuation

\`continue()\` controls the outgoing request and lets the real network response return normally. It cannot change that response. To call the real endpoint and patch its response, use \`route.fetch()\`, then \`route.fulfill({ response, ...overrides })\`. That is a terminal action from the handler chain.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('adds a sold-out product to a real catalog response', async ({ page }) => {
  await page.route('**/api/catalog', async route => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      products: Array<{ id: string; name: string; stock: number }>;
    };

    await route.fulfill({
      response,
      json: {
        ...body,
        products: [
          ...body.products,
          { id: 'limited-9', name: 'Limited keyboard', stock: 0 },
        ],
      },
    });
  });

  await page.goto('/catalog');
  const card = page.getByTestId('product-limited-9');
  await expect(card).toContainText('Sold out');
  await expect(card.getByRole('button', { name: 'Add to cart' })).toBeDisabled();
});
\`\`\`

This pattern deliberately uses the backend for most data, so it is less isolated than a fully synthetic mock. It is valuable when the test needs realistic response shape plus one difficult state. For complete response construction and status/header details, consult the [Playwright route fulfill API mocking guide](/blog/playwright-route-fulfill-mock-api-guide).

## Failure modes that expose the wrong choice

If a request hangs, inspect every matching handler for a path that returns without calling an action. An asynchronous handler must settle the route by fallback, continue, fulfill, or abort. A missing \`await\` may also let test teardown begin while routing work is still pending.

If a shared mock unexpectedly reaches production-like services, a newer handler probably called continue. Log registration locations and use a temporary call-order array rather than adding more broad routes. If a mock runs twice, check whether setup installed it once per test and again per helper invocation.

If an override seems absent downstream, ensure the downstream route actually ran. Then inspect whether a later fallback layer replaced the entire headers object without preserving earlier changes. Treat each layer as a pure transformation where practical: start from the request it receives, apply one policy, and delegate.

If different tests affect one another, verify page and context isolation. Route registration is mutable context state. Reusing a context across tests without disciplined cleanup allows one test's terminal handler to shadow another's setup.

## A decision procedure for senior test suites

Ask one question first: should another matching Playwright handler get a chance to process this request? If yes, fallback. If no and the real network should receive it, continue. If no and the test owns the result, fulfill or abort.

Then review scope and ordering. Register foundational terminal behavior first, policy layers afterward, and test-specific exceptions last. Document the intended chain beside fixture setup. Patterns should be narrow enough that a reader can predict which requests enter it.

Finally, test the routing infrastructure itself. An application assertion alone may pass even when a handler is bypassed, especially if the live backend returns similar data. Record which layers ran and assert request headers or bodies at the terminal boundary. Keep those assertions in focused routing tests so ordinary product tests do not become coupled to plumbing.

## Route events are observers, not another handler layer

Playwright's request and response events are useful when a test only needs evidence. A \`page.on('request')\` listener does not have to continue or fallback because it does not stall the request. This makes events a better choice for counting calls, recording URLs, or asserting that a request happened without changing transport.

Do not install a broad route merely to log traffic. Every routed request must be settled, routing disables browser HTTP cache, and a mistaken continue can bypass shared policy. An event listener observes the flow that routing produced and therefore cannot prove what a request looked like inside an intermediate handler, but it is lower risk for end-to-end assertions.

For route-chain tests, capture evidence at both levels. An array inside each handler proves invocation order. A request event proves the final request left the page. A server assertion proves the backend received expected headers or body. These three observations catch different defects: skipped middleware, a terminal mock mistaken for network traffic, and transport rewriting that the browser log alone cannot validate.

Clean event listeners in long-lived pages just as you clean routes. A listener registered in every test can count later traffic multiple times when a shared page fixture is used. Prefer isolated pages, or retain the callback and remove it after the scenario.

## Conditional faults should terminate exactly one branch

Fault injection often requires an intermittent outcome: fail the first inventory call, then use normal shared behavior. Playwright route registration supports a \`times\` option, but the handler still needs correct delegation for requests it does not own. A narrow one-use route that aborts is clearer than a permanent broad route with mutable counters.

When the condition depends on request content, keep the state explicit and guard concurrency. Two parallel requests can race a shared counter. Identify the intended call by method, URL, and stable body field, fulfill or abort that branch, and fallback for all others. After the user action, assert the fault was consumed exactly once. Otherwise the test may pass through a UI fallback without ever exercising the injected failure.

Be especially careful with retries performed by the application. If a terminal continue runs before the fault handler, all attempts reach the backend and the resilience case becomes a false positive. A focused chain-order assertion belongs beside the fault helper's own tests.

## Frequently Asked Questions

### Does \`route.fallback()\` always send the request to the network?

No. It invokes the next older matching handler. That handler may fulfill, abort, continue, or fall back again. The request reaches the network only if the chain ultimately continues or exhausts according to Playwright's routing behavior.

### Can a fallback handler change the URL used for matching later routes?

It can override the outgoing URL, but route matching remains based on the original request URL. Do not design a chain that expects a rewrite to activate a different pattern.

### Why did my browser-context route stop receiving requests?

A matching page route has higher precedence, and a terminal action there can prevent the context handler from participating. Narrow the page route or delegate with fallback when shared context policy is still required.

### Should unmatched requests be continued or aborted in mock-heavy tests?

Choose based on the test contract. Abort unmatched traffic for a hermetic suite that must reveal missing mocks. Continue only when hybrid access to a real service is deliberate. Partial reusable handlers should generally fallback so another layer can decide.

### Can I use \`route.continue()\` after \`route.fetch()\`?

That would issue a separate network path rather than return the fetched response. When you fetch for inspection or modification, finish with \`route.fulfill({ response })\` and any overrides. Use continue when no response fetch is needed.
`,
};
