import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Service Worker Network Mocking Gotchas',
  description:
    'Diagnose Playwright service worker network mocking failures, separate page traffic from worker traffic, and choose reliable interception strategies.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Playwright Service Worker Network Mocking Gotchas

The route handler logs nothing, yet Chrome DevTools shows the application returning a cached JSON response. Changing the mocked body has no effect. Disabling the browser cache has no effect either. The missing piece is a service worker: the page's fetch never reached the network layer Playwright was expected to replace.

Service workers sit between a controlled page and the network. They may answer from Cache Storage, synthesize a response, forward a modified request, or make their own fetch. That architecture creates several distinct interception paths, and treating them as one is the source of most confusing Playwright mocks.

This guide focuses on diagnosis. It uses Playwright's documented \`browserContext.route()\`, \`page.route()\`, \`browserContext.on('request')\`, \`browserContext.serviceWorkers()\`, and \`serviceWorkers: 'block'\` APIs. The objective is to know which layer produced a response before choosing how to test it.

## Draw the request path before adding another route

A normal page request is straightforward: page JavaScript initiates a fetch, the browser network stack sends it, and Playwright can observe or intercept it. Once a service worker controls the page, its \`fetch\` event runs first. The worker can return a cached \`Response\` without any network request. It can also call \`fetch()\`, creating traffic attributed to the service worker rather than the frame.

These paths have different signals:

| Observed behavior | Likely path | What a page route can change |
|---|---|---|
| Route fires and request has a frame | Page request reached routing | Fulfill, abort, continue, or fallback |
| UI updates but no request event appears | Service worker returned cached or generated data | Nothing at the network layer |
| Context sees a request but \`request.frame()\` throws | Request may originate from a service worker | Use context-level diagnostics |
| First navigation behaves differently from reload | Worker installed on first load and controls later documents | Control registration state explicitly |
| Mock works with service workers blocked | Worker interception caused the bypass | Test page networking and worker behavior separately |

The important distinction is not "mocked versus real." It is "network operation versus response supplied before the network." Playwright routing can alter network operations. It cannot retroactively replace a \`Response\` already chosen from Cache Storage inside worker code.

## Proving whether the page is controlled

Start with browser-visible facts. A page can contain a service-worker registration without being controlled by it. A newly registered worker normally controls documents opened after activation, unless it calls \`clients.claim()\`. The first load may therefore hit the network while a reload uses the worker.

The following test records registrations, controller state, context requests, and route hits. It uses a context route because service-worker-originated network requests are not tied to a single page in the same way as frame traffic.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('diagnose service worker ownership of API traffic', async ({ browser }) => {
  const context = await browser.newContext();
  const routeHits: string[] = [];
  const observed: Array<{ url: string; source: string }> = [];

  context.on('request', (request) => {
    let source = 'frame';
    try {
      request.frame();
    } catch {
      source = 'service-worker-or-non-frame';
    }
    observed.push({ url: request.url(), source });
  });

  await context.route('**/api/catalog', async (route) => {
    routeHits.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [{ id: 'mocked', name: 'Test item' }] }),
    });
  });

  const page = await context.newPage();
  await page.goto('https://app.example.test/catalog');

  const workerState = await page.evaluate(async () => ({
    controlled: navigator.serviceWorker.controller !== null,
    registrations: (await navigator.serviceWorker.getRegistrations()).map(
      (registration) => registration.scope,
    ),
  }));

  console.log({ workerState, routeHits, observed });
  await expect(page.getByText('Test item')).toBeVisible();
  await context.close();
});
\`\`\`

Use this as temporary diagnostic code, not as an assertion that all requests must have frames. Playwright documents that \`request.frame()\` can throw when a request does not originate from a frame, including service worker requests. The exception is useful classification information.

Inspect \`context.serviceWorkers()\` after navigation as another clue. It returns service workers known to the context. Chromium is the relevant engine for Playwright service worker inspection; browser support and debugging capabilities are not symmetrical across engines.

## Blocking workers when the test is about page networking

If the test's purpose is to verify how the page handles a particular API result, service-worker caching is an uncontrolled second system. Create the context with service workers blocked:

\`\`\`ts
import { test as base, expect } from '@playwright/test';

const test = base.extend({
  context: async ({ browser }, use) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/api/profile', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'profile temporarily unavailable' }),
      });
    });
    await use(context);
    await context.close();
  },
});

test('renders the API outage state', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('https://app.example.test/account');
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
});
\`\`\`

\`serviceWorkers: 'block'\` prevents registrations in that context. It is cleaner than unregistering after navigation because it removes the race among document loading, registration, activation, and the first API request. Use it deliberately, not globally. A progressive web app still needs dedicated coverage for installation, offline behavior, upgrades, and cache invalidation.

The split produces clearer ownership:

| Test purpose | Worker policy | Mocking approach |
|---|---|---|
| Page loading and error presentation | Block | Context or page routes |
| Worker offline cache behavior | Allow | Seed/cache through application behavior, then go offline |
| Worker update lifecycle | Allow | Serve versioned worker scripts from a controlled server |
| API contract at HTTP boundary | Usually block | Mock server or Playwright routing |
| End-to-end deployment confidence | Allow | Avoid response mocks, observe real traffic |

Blocking is not an admission that the application has no worker. It is isolation of the page's networking responsibilities from the worker's caching responsibilities.

## Context routes, page routes, and precedence

Use \`browserContext.route()\` when traffic may be initiated outside one frame or when every page in a context needs the same rule. Use \`page.route()\` for behavior local to a page. Playwright gives page routes precedence over context routes when both match. Within routing, \`route.fallback()\` passes control to another matching handler, while \`route.continue()\` sends the request immediately and prevents later handlers from running.

Route registration order matters: matching handlers are considered in reverse registration order. A broad \`**/*\` diagnostic route added last can intercept before a precise API route. If it calls \`continue()\`, the precise handler never receives the request. Prefer a passive \`request\` event for logging, or call \`fallback()\` from diagnostic middleware.

HAR routing adds another layer. \`page.routeFromHAR()\` and \`browserContext.routeFromHAR()\` replay network requests, but a response fulfilled by a service worker cache never becomes a matching network request. Blocking service workers is often necessary when a HAR represents the intended boundary.

The [Playwright network interception guide](/blog/playwright-network-mocking-route-handler-guide) covers route ordering and fulfillment mechanics in depth. The [browser context guide](/blog/playwright-browser-context-guide-2026) is the companion reference for isolating registrations, cookies, permissions, and storage.

## Why unregistering after page load is unreliable

This cleanup is common:

\`\`\`ts
await page.goto(appUrl);
await page.evaluate(async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
});
\`\`\`

It unregisters future use of those registrations, but it does not guarantee that the current page was never controlled. Requests may already have been handled. The active worker may continue controlling existing clients until those clients close. Cache Storage also survives registration removal, so a later registration can find old entries.

If a clean worker-enabled state is needed, create a new browser context. Contexts isolate storage, including service-worker registrations and Cache Storage. If the scenario explicitly tests unregister and recovery, assert the lifecycle and reload or open a new page according to the product's intended behavior.

Avoid clearing application storage through arbitrary Chrome DevTools Protocol commands in cross-browser tests. Such helpers can be valid for Chromium-specific diagnostics, but they hide the supported Playwright model and often make Firefox or WebKit projects misleading.

## Testing cache-first behavior without pretending it is a route mock

A cache-first worker should be tested through its observable sequence. Load while online so the worker installs and the application populates the cache. Wait for a product-specific readiness signal. Reload so the document is controlled. Put the context offline, then prove the cached response renders. Also request an uncached resource and verify the designed fallback.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('serves the saved catalog while offline', async ({ browser }) => {
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();

  await page.goto('https://app.example.test/catalog');
  await expect(page.getByTestId('catalog-ready')).toHaveAttribute('data-cached', 'true');

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
  await expect(page.getByTestId('offline-indicator')).toBeVisible();
  await context.close();
});
\`\`\`

The \`data-cached\` readiness marker is application-specific and must represent actual completion, not a timeout. An alternative is a message from the worker to the page after caching completes. Do not use \`waitForTimeout\` as a substitute; caching time varies with machine load and network response order.

This test does not route the catalog API at all. It validates the real service worker policy. If deterministic upstream data is required, serve the application and API from a local test server whose responses are controlled before the worker sees them.

## Mocking the worker script itself

Intercepting the service-worker JavaScript URL can be useful for update tests, but it has sharp edges. The script is fetched with service-worker-specific caching rules, and browser update checks may not occur on every navigation. Scope is determined by the registration URL and the \`Service-Worker-Allowed\` response header. A mocked script with a syntax error or wrong content type may fail installation rather than simulate the desired version.

Prefer a local HTTP server that can return version A or version B from the actual worker path. This exercises script fetching, installation, waiting, activation, and controller changes. Keep the server on HTTPS or localhost because service workers require secure contexts outside localhost.

When an update test hangs, record these states from each registration: \`installing\`, \`waiting\`, and \`active\`, plus each worker's \`state\`. A new worker can remain waiting while old controlled tabs exist. Closing every page except the update observer, or exercising the application's skip-waiting flow, is part of the scenario rather than incidental cleanup.

## Cache Storage is state, not browser HTTP cache

Setting headers such as \`Cache-Control: no-store\` on a routed API response affects the HTTP cache. It does not stop worker code from calling \`cache.put(request, response)\`. Likewise, Playwright routing disables the browser's HTTP cache, but that should not be interpreted as clearing the Cache Storage API.

Use a fresh context for clean isolation. For a test that starts with a pre-existing cache, populate it through a controlled setup or through page JavaScript on the same origin. Direct cache manipulation couples the test to cache keys and schema, so reserve it for focused worker tests.

Cache matching can vary by URL, query string, method, and worker code options such as \`ignoreSearch\`. A route pattern that matches \`/api/items?limit=10\` tells you nothing about whether the worker uses \`/api/items\` as its cache key. Log both the requested URL and the keys returned by \`caches.keys()\` and \`cache.keys()\` during diagnosis.

## Common false conclusions from missing route hits

"Playwright has a bug" is possible, but several simpler explanations should be eliminated first. The URL may not match because the pattern was resolved against \`baseURL\`; another handler may call \`continue()\`; the request may happen before route registration; a popup may issue traffic before a page route is attached; or a service worker may supply the response.

Register context routes before creating pages. Log the exact request URL with a passive listener. Temporarily use a narrow regular expression rather than an overly clever glob. Compare a context with workers allowed against an otherwise identical context with workers blocked. That A/B run turns a vague suspicion into evidence.

Responses can also come from an iframe or another page. Page-level listeners see only their page, while context listeners cover all pages in the context. Do not infer service-worker ownership merely because one page listener was quiet.

## A review checklist for stable worker tests

Give each scenario a declared starting state: no registration, installed but not controlling, active and controlling, update waiting, online with populated cache, or offline. A phrase such as "PWA ready" is too ambiguous for a reproducible test.

Then identify the assertion boundary. Page rendering tests can block the worker. Cache-policy tests should allow it and avoid routing away the behavior under examination. Update tests need multiple versions of a genuine worker script. End-to-end tests should preserve the deployed topology.

Finally, capture enough evidence on failure: controller presence, registration scopes and states, known service-worker URLs, context request URLs, route-hit counts, online state, and relevant cache names. Redact tokens and response bodies. A screenshot alone cannot explain which execution context supplied JSON.

## Classifying routable requests with \`request.serviceWorker()\`

Modern Playwright exposes the owning service worker directly on a request. That is more precise than treating every request without a frame as worker traffic, because navigations and other browser activity may also lack an ordinary frame association at particular moments.

For a controlled page whose service worker calls \`fetch('data.json')\`, context request events can represent both the frame's logical request and the worker-owned network request. The frame-owned event does not itself have an opportunity to reach the external network once the worker handles it. The worker-owned request is the one a context route can fulfill. Inside a route, branch on \`route.request().serviceWorker()\`; do not call \`request.frame()\` when the service-worker value is non-null because Playwright documents that the frame accessor throws in that case.

There is also a current limitation worth preserving in tests: update requests for the service worker's main script cannot be routed. If an update scenario depends on serving versioned worker code, a controllable HTTP server is more dependable than assuming the main-script request will pass through a route handler.

## Frequently Asked Questions

### Why does \`page.route()\` work after I set \`serviceWorkers: 'block'\`?

Blocking prevents the service worker from handling the page's fetch first. The request reaches the browser networking path, where the page route can intercept it. This strongly indicates a worker-controlled response or worker-originated request was involved.

### Can Playwright route a response returned directly from Cache Storage?

No network request is made when worker code returns a cached \`Response\`. Network routing has nothing to intercept. Test the cache behavior itself, clear or isolate the cache, or block service workers when the worker is outside the test's scope.

### Should all end-to-end contexts block service workers for stability?

No. Doing so removes an important part of a progressive web application's deployed behavior. Block them in tests specifically about page-to-API handling, and maintain separate worker-enabled coverage for offline, caching, and updates.

### Why is the first navigation not controlled but the reload is?

The first document can register and activate a worker without becoming its client. A later navigation falls within the active registration's scope and is controlled. \`clients.claim()\` can change that timing, so assert controller state rather than assuming it.

### Does unregistering a worker delete its named caches?

No. Registration and Cache Storage have separate lifetimes. Unregistering stops the registration from being used in the future, but application caches remain until code or test setup deletes them, or the entire isolated context is discarded.
`,
};
