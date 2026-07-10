import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Puppeteer Request Interception Testing Guide',
  description:
    'Puppeteer request interception testing guide for blocking assets, stubbing APIs, asserting browser requests, and reducing flaky network tests.',
  date: '2026-07-10',
  category: 'Tutorial',
  content: `
# Puppeteer Request Interception Testing Guide

The product page loads, the cart count flashes, and then a third-party recommendations call rewrites half the DOM after your assertion has already passed. That is the kind of browser test failure where Puppeteer request interception earns its place. You are not mocking a function in isolation. You are controlling what Chrome is allowed to fetch while the real page code runs.

Puppeteer can turn every outgoing request into a decision point. A test can allow the document, scripts, and local API calls, block image CDNs, stub a slow pricing endpoint, or fail the run when the page leaks a request to an analytics host. The power is attractive, but careless interception makes browser suites brittle. A request handler that forgets to continue one URL will hang navigation. Two handlers that both try to resolve the same request can create non-deterministic failures. A mock that returns JSON with the wrong headers can hide a client bug instead of exposing it.

This guide treats request interception as a test boundary for real user flows. It assumes you already know Puppeteer basics and want a senior SDET approach to network mocking, request blocking, and response stubbing. If you are choosing the browser automation engine itself, read the related [Puppeteer and Playwright comparison](/blog/puppeteer-vs-playwright-testing). For teams comparing current automation strategy, the [Playwright versus Puppeteer 2026 guide](/blog/playwright-vs-puppeteer-2026) is the broader architecture view.

## The interception switch that changes page loading

Puppeteer interception starts with one explicit call: \`page.setRequestInterception(true)\`. After that, every request pauses until your handler calls \`request.continue()\`, \`request.abort()\`, or \`request.respond()\`. That includes the initial document request, scripts, stylesheets, fonts, images, XHR, fetch calls, and navigation redirects.

The main rule is simple: every intercepted request must be resolved exactly once. In small tests that is easy to see. In a framework helper with conditional routing, metrics, and async file reads, it becomes the part that deserves discipline. Prefer one request listener per page. Put routing decisions in a single ordered list. Return immediately after resolving a request. Keep asynchronous stubs short enough that they do not become their own test server.

| Interception action | What Puppeteer does | Good testing use | Risk if overused |
|---|---|---|---|
| \`continue()\` | Lets Chrome send the original request | Real navigation, local app assets, smoke coverage | Accidentally reaches systems the suite should isolate |
| \`continue({ headers })\` | Sends a modified outbound request | Injecting test headers, tenant IDs, or auth hints | Can diverge from production browser behavior |
| \`abort()\` | Fails the request in the browser | Blocking trackers, fonts, ads, or image CDNs | App code may behave differently if it expects graceful 404s |
| \`respond()\` | Fulfills the request from the test process | Stable API stubs and edge-case payloads | Wrong status, MIME type, or shape can create false confidence |

A common mistake is enabling interception before \`page.goto()\` and then only handling API calls. The document request also pauses, so navigation never completes. Another mistake is treating interception as a replacement for backend contract tests. A Puppeteer stub is excellent for testing front-end handling of a server response. It is not evidence that the server can produce that response in production.

## Blocking noisy hosts without starving the app

The lowest-friction use case is cutting nondeterministic network noise. Marketing tags, A/B scripts, font providers, and image CDNs can slow tests or fail behind corporate proxies. Blocking them is reasonable when the scenario does not validate those integrations.

The subtle point is to block by purpose, not by file extension alone. If you abort every image, a lazy-loading gallery test no longer exercises the same layout pressure. If you abort every stylesheet, accessibility and visual assertions become meaningless. Decide whether the resource participates in the behavior under test.

\`\`\`ts
import puppeteer from 'puppeteer';
import { describe, expect, test } from 'vitest';

describe('checkout page network isolation', () => {
  test('does not require analytics or recommendation calls to render totals', async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const blocked: string[] = [];

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const host = new URL(url).hostname;

      if (host.endsWith('analytics.example.com') || host.endsWith('recs.example.net')) {
        blocked.push(url);
        request.abort();
        return;
      }

      request.continue();
    });

    await page.goto('http://localhost:3000/checkout', {
      waitUntil: 'networkidle0',
    });

    await page.waitForSelector('[data-testid="order-total"]');
    const total = await page.$eval('[data-testid="order-total"]', (node) =>
      node.textContent?.trim(),
    );

    expect(total).toBe('$42.00');
    expect(blocked.some((url) => url.includes('analytics.example.com'))).toBe(true);

    await browser.close();
  });
});
\`\`\`

This test is intentionally narrow. It proves the checkout total renders without analytics and recommendation dependencies. It does not claim the recommendation widget works. That would be a separate test where the recommendation endpoint is either real in a controlled environment or stubbed with a payload the widget must consume.

The \`networkidle0\` wait is also a tradeoff. It can be useful after blocking background calls, but it is not a universal readiness signal. For an SPA that keeps a websocket or polling request open, assert on the UI condition that proves the page is ready.

## Stubbing JSON responses before hydration wins the race

The strongest Puppeteer request interception tests usually stub the exact API call that the page makes during boot. You get real browser execution, real routing, real component rendering, and deterministic server data. That combination is valuable when the bug class lives between the page and the API boundary: missing loading states, currency formatting, retry banners, empty carts, and permission-dependent controls.

Stub early. Register interception before navigation, not after clicking the button that triggers the fetch. If the page fires the request during hydration, a late listener will miss it. Match on method, pathname, and sometimes query parameters. Avoid matching only \`includes('/api')\`, because broad stubs hide unexpected calls.

\`\`\`ts
import puppeteer, { type HTTPRequest } from 'puppeteer';

type Stub = {
  method: string;
  path: string;
  status: number;
  body: unknown;
};

const stubs: Stub[] = [
  {
    method: 'GET',
    path: '/api/cart/current',
    status: 200,
    body: {
      id: 'cart-test-1',
      currency: 'USD',
      items: [{ sku: 'sku-training-plan', quantity: 1, unitPrice: 4200 }],
      discounts: [],
    },
  },
  {
    method: 'GET',
    path: '/api/pricing/sku-training-plan',
    status: 200,
    body: { sku: 'sku-training-plan', listPrice: 4200, salePrice: 4200 },
  },
];

function findStub(request: HTTPRequest): Stub | undefined {
  const url = new URL(request.url());
  return stubs.find((stub) => stub.method === request.method() && stub.path === url.pathname);
}

export async function installCartStubs(page: puppeteer.Page) {
  await page.setRequestInterception(true);

  page.on('request', (request) => {
    const stub = findStub(request);

    if (!stub) {
      request.continue();
      return;
    }

    request.respond({
      status: stub.status,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify(stub.body),
    });
  });
}
\`\`\`

This helper is deliberately boring. The URL is parsed with the platform URL API. Stubs are matched by method and pathname. The response sets \`contentType\` to \`application/json\` and sends a serialized body. The test data is close to the API shape, but still small enough that a reviewer can understand it without opening a fixture archive.

For larger response bodies, put JSON fixtures in versioned files and load them in the test setup before registering the handler. Keep fixture names domain-specific: \`cart-with-expired-coupon.json\` tells a reviewer more than \`response-2.json\`.

## Asserting outbound request contracts from the browser

Interception is not only for replacing responses. It can inspect what the browser sends. That makes it useful for validating client behavior that unit tests often miss: headers set by an interceptor, idempotency keys on checkout submission, request bodies after form normalization, or absence of sensitive fields.

Do not assert every header Chrome sends. Focus on fields owned by your application. Browser-generated headers vary by version, protocol, and launch mode. Application headers and JSON bodies are the stable contract.

One pattern is to continue the real request but capture a parsed copy for assertions after the UI action. Another pattern is to respond with a success stub so the test does not need a live backend. Choose based on what you are validating. If the assertion is "the browser sends the correct payload", \`respond()\` is usually enough. If the assertion includes server validation, use the real backend or a service virtualization layer.

| Request field | Worth asserting in Puppeteer | Usually avoid asserting |
|---|---|---|
| HTTP method | Yes, especially unsafe operations | No concern for static resources |
| Pathname and query | Yes, when route selection matters | Full URL with environment host baked in |
| JSON request body | Yes, for form and checkout flows | Property order in serialized JSON |
| App-owned headers | Yes, auth tenant, correlation, idempotency | Browser negotiation headers |
| Timing | Rarely, only with generous thresholds | Exact millisecond ordering |

Capturing bodies has one caveat: \`request.postData()\` returns the sent text, not a parsed object. Parse JSON only after checking the content type or knowing the route. For form posts, parse URL-encoded data with \`URLSearchParams\`. For multipart file uploads, Puppeteer request interception is a blunt tool; validate the UI and use lower-level API tests for multipart body inspection.

## Matching routes narrowly enough for failures to stay useful

The quality of a network test often comes down to route matching. A broad matcher makes tests easy to write but hard to trust. A narrow matcher gives better failure messages and avoids replacing the wrong request when a page grows.

Start with a route table that includes method and pathname. Add query assertions when query values are behaviorally meaningful. For example, a search page should probably assert \`?q=refund\` and \`page=1\`. A cache-busting query on a JavaScript chunk should not be part of the test.

When a route is required, fail loudly if it was not called. Stubbing a response and then never checking whether the app used it can hide dead code. A useful helper records hit counts per stub and exposes an assertion like \`expectRouteHit('/api/cart/current')\`. Keep that helper inside the test framework, not in app code.

The inverse is also important. Some tests should fail on unexpected outbound calls. A payment confirmation page, for instance, should not call a development telemetry endpoint or send PII to a vendor. You can maintain an allowlist and abort or throw on anything outside it. Use that only for high-signal journeys, because full allowlists create maintenance cost when legitimate assets change.

## Choosing between interception, a mock server, and service virtualization

Puppeteer interception is a page-local tool. It lives inside the browser automation process and disappears when the page closes. That makes it fast and expressive for UI flows, but it is not always the right place to model API behavior.

| Alternative | Best fit | Strength | Limitation |
|---|---|---|---|
| Puppeteer request interception | Browser flow needs a few deterministic network decisions | No extra server, can inspect real page requests | Tied to one page and easy to overfit |
| MSW in browser mode | Front-end test harness already uses service workers | Declarative handlers near UI tests | Service worker setup can differ from production |
| WireMock or Mountebank | Multiple clients need the same fake service | Rich HTTP behavior and reusable scenarios | More infrastructure and lifecycle management |
| Real test backend | End-to-end confidence across browser and API | Catches integration issues stubs cannot see | Data setup, speed, and flake risk |

The practical rule: use Puppeteer interception when the test question is about browser behavior under a controlled network condition. Use a mock server when several suites need the same fake API. Use the real backend when the question includes server behavior, persistence, or authentication integration.

## Debugging the failures interception creates

When a Puppeteer test hangs after enabling interception, assume a request was not resolved. Add temporary logging for method, resource type, and URL. If the last line is the document request, the handler is missing a default \`continue()\`. If the last line is a font or image, a resource-type branch probably forgot to return. If the failure says the request is already handled, two code paths are resolving it.

Response stubs fail differently. The page may show a JSON parse error because the stub sent text with the wrong content type. A CORS error may appear if the app expects cross-origin headers and the stub does not include them. A test may pass locally and fail in CI because a handler matches \`localhost\` but the server runs on \`127.0.0.1\`. Parse URLs and match pathnames unless the host itself is under test.

Network tests also need cleanup. Close pages and browsers in \`afterEach\` or equivalent hooks. Avoid sharing one page with mutable interception state across tests. Puppeteer event listeners accumulate, so a reused page can accidentally run an old handler.

## Keeping intercepted flows observable

An intercepted test should leave evidence when it fails. Capture a short request ledger: method, pathname, action, status, and whether the route was expected. Do not dump every header from every asset into CI logs. The goal is to make a failed assertion explainable. A ledger that says \`GET /api/cart/current -> stubbed 200\` and \`POST /api/orders -> continued\` is enough to spot the wrong boundary.

For high-value flows, assert both sides of the route table. Required stubs should be hit. Forbidden hosts should remain blocked. Unmatched application API calls should either continue to a known test backend or fail the test. That last rule is useful when the front end grows a new dependency without test review. If the product page suddenly calls \`/api/loyalty/summary\`, a strict test should force the author to decide whether that call is part of the scenario.

Keep timing out of the interception layer unless timing is the behavior under test. Simulating a slow response with \`setTimeout\` inside a handler can validate a loading skeleton, but it should be rare and named clearly. Most tests need deterministic responses, not artificial delay. When delay is required, keep it below the test runner timeout and assert the intermediate UI state before the stub resolves.

Finally, separate network control from page assertions. A helper can install cart stubs, but the test should still read like a user outcome: open checkout, see total, submit order, see confirmation. If the test body becomes a list of URL branches, the scenario has leaked too much infrastructure. The route table belongs in setup; the business assertion belongs in the test.

## Frequently Asked Questions

### Can Puppeteer intercept both XHR and fetch calls?

Yes. Both XHR and \`fetch\` requests appear as intercepted requests when request interception is enabled. Match by method and URL rather than assuming a resource type, because the application implementation can change from XHR to fetch without changing the contract.

### Why does my Puppeteer navigation hang after enabling interception?

At least one request is probably paused without a final \`continue()\`, \`abort()\`, or \`respond()\`. Add a default branch that continues unmatched requests, and return immediately after handling matched routes.

### Should I block images in every Puppeteer test?

No. Blocking images can speed tests that do not care about layout, lazy loading, or media behavior. It is a bad default for visual checks, product galleries, responsive layout assertions, and pages where image load events drive UI state.

### Is request interception enough for API contract coverage?

No. It verifies how the browser behaves against a stubbed or inspected request. Server compatibility still needs API tests, contract tests, or schema validation against the real service boundary.

### How should I organize many Puppeteer stubs?

Keep route handlers ordered and explicit: method, pathname, status, body, and a hit counter. Store large JSON bodies as named fixtures, and fail tests when required stubs are not called.
`,
};
