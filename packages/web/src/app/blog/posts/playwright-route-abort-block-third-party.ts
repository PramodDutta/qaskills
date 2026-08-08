import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Route Abort Block Third Party Requests Safely',
  description: 'Use playwright route abort block third party rules with exact host matching, failure assertions, service-worker controls, and maintainable test isolation.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Route Abort Block Third Party Requests Safely

Playwright route abort can block third-party requests by registering a route before navigation, classifying the request's parsed URL, calling \`route.abort('blockedbyclient')\` for denied hosts, and calling \`route.continue()\` for everything else. Use exact hostname rules rather than substring matching, and assert both that the unwanted request failed and that the application still reached its expected state.

The goal is controlled dependency behavior, not simply a faster test. Decide whether the scenario represents a privacy block, an outage, or a deliberately removed integration, then verify the product's fallback. If you are choosing a runner or broader stack, consult the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026). Keep the resulting UI checks resilient with [Playwright locator best practices](/blog/playwright-best-practices-locators-2026).

## Decide What “Third Party” Means for This Test

Third party is not synonymous with “different hostname.” A product may serve first-party assets from a CDN, call an authentication domain on another registrable domain, or embed a payment provider that is essential for checkout. Conversely, analytics can be proxied through the application's own origin. Build the policy from ownership and scenario intent.

| Dependency class | Example role | Default test policy | Reason |
|---|---|---|---|
| Application API | User data and commands | Allow | Core behavior depends on it |
| Owned asset CDN | JavaScript, CSS, images | Allow | Different host, still first-party delivery |
| Identity provider | Login and token exchange | Allow or stub deliberately | Blocking can invalidate setup |
| Analytics beacon | Usage measurement | Block in most functional tests | Usually outside user outcome |
| Advertising | Auction and creative content | Block or replace in deterministic tests | Highly variable external content |
| Support widget | Optional chat UI | Block in core journeys | Avoid unrelated frames and requests |
| Payment SDK | Checkout integration | Allow in end-to-end payment coverage | Essential in that scenario |

Write one sentence above the fixture: “This policy permits application and asset hosts, and simulates client-side blocking for all other HTTPS hosts.” That is reviewable. “Block third party” without a definition invites accidental coverage gaps.

The official API documents \`route.abort()\` and its supported error codes at https://playwright.dev/docs/api/class-route. \`blockedbyclient\` accurately describes a client policy, while the default \`failed\` is a generic failure. The chosen code can matter to application error handling and debugging output, so make it intentional.

## Build the Classifier as a Pure Function

Do not hide host logic inside a long route callback. A pure classifier can be tested against confusing hostnames, subdomains, schemes, and ports without launching a browser. Parse with \`URL\`; never use \`request.url().includes('vendor.com')\`.

This complete Node test implements exact hosts plus approved subdomains:

\`\`\`ts
import test from 'node:test';
import assert from 'node:assert/strict';

const allowedHosts = new Set([
  'app.example.test',
  'api.example.test',
  'assets.example-cdn.test',
]);

function isAllowedRequest(rawUrl: string): boolean {
  const url = new URL(rawUrl);
  if (url.protocol === 'data:' || url.protocol === 'blob:') return true;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;
  return allowedHosts.has(url.hostname);
}

test('allows owned hosts and blocks lookalikes', () => {
  assert.equal(isAllowedRequest('https://app.example.test/dashboard'), true);
  assert.equal(isAllowedRequest('https://assets.example-cdn.test/app.js'), true);
  assert.equal(isAllowedRequest('https://tracker.vendor.test/pixel'), false);
  assert.equal(isAllowedRequest('https://app.example.test.attacker.test/x'), false);
  assert.equal(isAllowedRequest('data:text/plain,hello'), true);
});
\`\`\`

\`URL.hostname\` excludes the port and normalizes host casing, which is what a host allowlist usually needs. If ports matter, compare \`url.host\` or check \`url.port\` separately. If only a specific path on an external provider is permitted, add an exact pathname rule after validating the host.

| Matching approach | Hidden defect | Better alternative |
|---|---|---|
| URL contains \`example.test\` | Allows \`example.test.attacker.test\` | Parse and compare hostname |
| Allow every \`*.example.test\` | Trusts unknown or tenant-controlled subdomains | Enumerate owned hosts |
| Block by resource type only | Misses fetch beacons and blocks useful images | Classify ownership first |
| Block every non-page origin | Breaks owned API and CDN | Maintain explicit dependency inventory |
| One huge regex | Becomes unreadable and easy to overmatch | Small named predicates |

If your organization genuinely owns a controlled suffix and wants all subdomains, use a boundary-aware comparison: \`host === suffix || host.endsWith('.' + suffix)\`. Review whether tenants can create arbitrary subdomains before making that choice.

## Register the Route Before Navigation

Routes affect requests that occur after registration. Put a page-scoped rule before \`page.goto()\`, or a context-scoped rule before creating pages when popups and multiple tabs are involved. The broad \`'**/*'\` pattern intentionally captures all HTTP traffic; the callback then applies the policy.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('dashboard works while optional vendors are client-blocked', async ({ page }) => {
  const allowedHosts = new Set([
    'app.example.test',
    'api.example.test',
    'assets.example-cdn.test',
  ]);
  const blocked: string[] = [];

  await page.route('**/*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const networkScheme = requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:';
    if (networkScheme && !allowedHosts.has(requestUrl.hostname)) {
      blocked.push(requestUrl.href);
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });

  await page.goto('https://app.example.test/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  expect(blocked.some((url) => new URL(url).hostname === 'tracker.vendor.test')).toBe(true);
});
\`\`\`

The test assumes those reserved example hosts are mapped to a controlled environment. In a local project, replace the three host values and navigation URL with your documented test origins. Keep credentials out of URLs because failure logs often print them.

Every matching request must be resolved once: abort, continue, fulfill, or fall back to another handler. Forgetting to resolve an allowed route leaves the request hanging until a timeout. Returning immediately after abort makes the control flow obvious and prevents a later continue call on the same route.

Glob patterns match the entire URL, not just a substring. Rather than maintaining several clever globs, a catch-all plus parsed URL policy is often easier to audit. When the policy is narrow and obvious, a specific glob such as \`'**/analytics/**'\` can be appropriate, but still test what it actually matches.

## Choose Page or Context Scope Deliberately

\`page.route()\` covers one page. \`browserContext.route()\` applies across pages in that context, which is useful for popups, new tabs, and common fixtures. A context route also handles the first request of a popup, where page-level registration cannot be installed early enough.

| Scope | Use it when | Isolation concern | Cleanup strategy |
|---|---|---|---|
| Page route | One test page needs a local fault | Popup traffic is outside policy | Close page or remove known handler |
| Context route | Every page in test shares dependency policy | Broad rule can affect setup requests | Fresh context per test |
| Project option | Service-worker behavior must be uniform | Changes all tests in project | Separate named project |
| Helper fixture | Policy repeats across suites | Hidden defaults can surprise tests | Expose allowed and blocked hosts |

This fixture uses context scope and passes an explicit allowlist. It is a complete Playwright fixture module:

\`\`\`ts
import { test as base, expect } from '@playwright/test';

type NetworkPolicy = {
  allowHosts: string[];
  blockedUrls: string[];
};

export const test = base.extend<{ networkPolicy: NetworkPolicy }>({
  networkPolicy: async ({ context }, use) => {
    const policy: NetworkPolicy = {
      allowHosts: ['app.example.test', 'api.example.test'],
      blockedUrls: [],
    };

    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      const isNetwork = url.protocol === 'http:' || url.protocol === 'https:';
      if (isNetwork && !policy.allowHosts.includes(url.hostname)) {
        policy.blockedUrls.push(url.href);
        await route.abort('blockedbyclient');
      } else {
        await route.continue();
      }
    });

    await use(policy);
  },
});

export { expect };
\`\`\`

A test imports \`test\` and \`expect\` from this module instead of the base package. Because Playwright normally provides a new context per test, the route and captured array stay isolated. If a project deliberately reuses a context, it must own cleanup and reset captured state.

When page and context routes both match, page routing takes precedence. Multiple matching handlers can also form a chain with \`route.fallback()\`; registration order matters. Avoid layered routing unless the suite needs composition. A single ownership policy plus targeted test override is easier to reason about.

## Control Service Workers or They Can Bypass Your Assumption

Playwright routing does not intercept requests already handled by a Service Worker. A cached application can therefore appear to ignore a route, or an analytics request originating in worker logic may evade the page-level expectation. The Playwright network documentation recommends blocking Service Workers when network events appear missing.

Create a dedicated project for dependency-blocking tests:

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'chromium-network-policy',
      use: {
        browserName: 'chromium',
        serviceWorkers: 'block',
      },
    },
  ],
});
\`\`\`

Do not turn this into a global default without considering what your product promises. If offline behavior, push, background sync, or worker caching is under test, blocking Service Workers removes the system you need to verify. Maintain separate projects: one with deterministic routed network policy, another with the real worker lifecycle.

Routing also disables the HTTP cache. That can change loading behavior and timing compared with an unrouted browser. Treat this as part of the test environment, especially for performance assertions. A functional fallback test can accept it; a cache-performance test should not silently run under broad routing.

## Assert Network Failure and Product Fallback Separately

\`route.abort()\` simulates a failed request. It does not return an HTTP 403, 404, or 503 response. The browser emits a failed request, and application code sees a network failure. If the product must handle a vendor's HTTP error response, use \`route.fulfill()\` with that status in a different test.

This distinction produces a useful scenario matrix:

| Scenario | Route action | Browser observation | Product assertion |
|---|---|---|---|
| Privacy extension blocks script | Abort with \`blockedbyclient\` | Request fails, no response | Core UI remains usable |
| Vendor returns rate limit | Fulfill with 429 | HTTP response exists | Retry or message follows contract |
| Vendor is slow | Delay a controlled fulfillment | Pending request | Page does not block indefinitely |
| Vendor payload is malformed | Fulfill 200 with bad body | Successful HTTP transport | Parser failure is contained |
| Integration intentionally removed | Abort or omit script in fixture | Dependency unavailable | No vendor globals are required |

Observe \`requestfailed\` before navigation and assert the exact host. The test below uses a local HTML document and initiates a real request, so it can run without an application server:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('abort produces a failed request rather than an HTTP response', async ({ page }) => {
  const failed: string[] = [];
  const responses: string[] = [];
  page.on('requestfailed', (request) => failed.push(request.url()));
  page.on('response', (response) => responses.push(response.url()));

  await page.route('https://telemetry.example.test/**', async (route) => {
    await route.abort('blockedbyclient');
  });

  await page.setContent(\`
    <button id="send">Send telemetry</button>
    <output id="status">ready</output>
    <script>
      document.querySelector('#send').addEventListener('click', async () => {
        try {
          await fetch('https://telemetry.example.test/collect');
        } catch {
          document.querySelector('#status').textContent = 'app still usable';
        }
      });
    </script>
  \`);

  await page.getByRole('button', { name: 'Send telemetry' }).click();
  await expect(page.getByText('app still usable')).toBeVisible();
  expect(failed).toContain('https://telemetry.example.test/collect');
  expect(responses).not.toContain('https://telemetry.example.test/collect');
});
\`\`\`

The user-facing assertion is as important as the failure event. A test that only proves the tracker was blocked can pass while the application crashes because it reads an undefined analytics global on startup.

## Block by Host First, Then Refine by Resource Type

Resource type can reduce noise inside an already classified host policy. It should rarely define third-party ownership by itself. Analytics can use \`fetch\`, \`xhr\`, \`script\`, image pixels, or \`beacon\` behavior that appears through request categories. Third-party fonts and images may be visible product requirements.

If the scenario specifically tests a document without optional media, name that intent:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('article remains readable when external media is blocked', async ({ page }) => {
  const blockedTypes = new Set(['image', 'media', 'font']);
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const externalMedia =
      url.hostname === 'media.vendor.test' && blockedTypes.has(request.resourceType());

    if (externalMedia) {
      await route.abort('blockedbyclient');
    } else {
      await route.continue();
    }
  });

  await page.goto('https://app.example.test/articles/network-policy');
  await expect(page.getByRole('heading', { name: 'Network policy' })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('Requests are classified');
});
\`\`\`

Do not use a global “abort all images” optimization in a visual or accessibility suite. Missing images can hide layout shifts, broken alternative text behavior, lazy-loading defects, canvas rendering, or key controls implemented as images. Optimization is only valid when the removed resource is outside that test's contract.

## Compose Overrides Without Double-Handling Routes

Large suites often need a base policy plus one test-specific response. \`route.fallback()\` passes control to another matching handler, while \`route.continue()\` sends the request to the network immediately and does not invoke later matching handlers. Matching handlers run in reverse registration order.

Here is a self-contained example where a broad base policy is registered first and a targeted fixture later. The targeted handler runs first and fulfills the catalog API; other requests fall back to the base policy:

\`\`\`ts
import { expect, test } from '@playwright/test';

test('targeted API fixture composes with the host allowlist', async ({ page }) => {
  const allowed = new Set(['app.example.test', 'api.example.test']);

  await page.route('**/*', async (route) => {
    const host = new URL(route.request().url()).hostname;
    if (!allowed.has(host)) {
      await route.abort('blockedbyclient');
    } else {
      await route.continue();
    }
  });

  await page.route('https://api.example.test/catalog', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ products: [{ id: 'p1', name: 'Test Keyboard' }] }),
      });
    } else {
      await route.fallback();
    }
  });

  await page.goto('https://app.example.test/catalog');
  await expect(page.getByText('Test Keyboard')).toBeVisible();
});
\`\`\`

When a request unexpectedly reaches the network, print the matching handler names and registration location in your fixture diagnostics. Avoid using \`route.continue()\` in a top targeted handler when you intended a lower handler to apply headers or policy, because continue ends the routing chain.

For most teams, composition is unnecessary complexity. Prefer a fresh browser context with one route policy per scenario. Use chained handlers when it enables a clearly tested shared fixture, not as a default architecture.

## Diagnose a Third-Party Block That Appears Ineffective

A realistic failure looks like this: the route callback records no request for \`metrics.vendor.test\`, but the vendor dashboard receives an event. Start with evidence rather than broadening the glob.

1. Confirm the route was registered before navigation and before the action.
2. Listen to \`request\`, \`requestfailed\`, and \`response\` events and print exact URLs.
3. Check whether a Service Worker handles or originates the traffic.
4. Check other pages, workers, popups, and contexts.
5. Inspect whether the application proxies telemetry through an allowed first-party host.
6. Verify that DNS aliases or redirects do not move traffic to an unclassified hostname.

If the request appears in \`request\` but never in the callback, investigate scope and Service Workers. If it enters the callback and later gets a response, inspect whether another handler continued or fulfilled it. If it uses the allowed application API host, the bug is in the dependency inventory, not the Playwright matcher.

The inverse failure is more common: login times out after enabling the block. The trace shows the identity provider was aborted because it was non-page-origin. Fix the allowlist and add an assertion that the identity host is allowed. Do not special-case the timeout or disable the policy for the entire suite.

## Make the Policy Observable in CI

Attach a small network-policy report to failed tests: allowed host set, blocked URLs grouped by hostname, request method, resource type, and failure text. Redact query values and headers that can contain tokens. A sudden new blocked hostname then becomes an intentional review item rather than a mystery timeout.

Failing whenever any new third-party host appears can be valuable in privacy-sensitive applications, but it is a governance decision. A less strict suite can record unknown hosts and enforce only that known blocked vendors never succeed. Keep snapshots small and semantic; raw URL snapshots often churn due to cache-busting parameters.

Run at least three purposeful modes:

| Mode | Network setup | Question answered |
|---|---|---|
| Core deterministic | Optional vendors blocked | Does primary behavior stand alone? |
| Integration | Required providers allowed or sandboxed | Does the real integration contract work? |
| Dependency failure | One provider aborted or given HTTP fault | Is degradation safe and understandable? |

An AI coding agent can propose host classifications from a captured trace, but a human owner should confirm business criticality and data governance. Agents are useful for generating edge-case tests such as deceptive suffixes and alternate ports. They should not decide that payment, identity, or consent infrastructure is optional based only on request names.

Maintain the inventory next to the fixture with an owner and a one-line purpose for every allowed external host. When a domain is retired, remove it and run the integration mode to expose forgotten references. When a new domain appears, review redirects as well as the first URL: a permitted loader can redirect to an unapproved asset host. This makes network policy a small architecture record rather than an opaque collection of strings.

Avoid secrets in diagnostic URLs. Signed asset URLs, identity callbacks, and payment redirects can place sensitive values in queries. Report protocol, hostname, pathname pattern, method, and resource type, then redact query strings unless a specific safe parameter is needed for diagnosis. Playwright traces and CI attachments need the same retention and access controls as other test evidence.

Treat changes in the blocked list as signals, not automatically as product failures. A marketing experiment might add a harmless analytics host, while a compromised dependency could add an unexpected exfiltration endpoint. Functional automation can surface the difference but cannot adjudicate it alone. Route the review to the dependency owner and security or privacy stakeholders defined by the team. Then update the policy and its tests in the same change that approves the dependency.

The final gate is not “zero third-party requests.” It is a policy with named dependencies, exact matching, controlled browser scope, correct failure semantics, and product assertions proving that the intended user journey still works.

## Frequently Asked Questions

### Does Playwright route abort return an HTTP error status?

No. \`route.abort()\` fails the browser request and does not create an HTTP response. Use it to model a network failure or client-side blocking. Listen for \`requestfailed\` and assert the application's fallback behavior. If the scenario requires a vendor to answer with 403, 429, or 503, use \`route.fulfill()\` with that status instead. Keeping transport failure and HTTP failure in separate tests produces clearer diagnostics and exercises different application branches.

### Should I use page.route or browserContext.route to block vendors?

Use \`page.route()\` when the rule belongs to one known page. Use \`browserContext.route()\` when popups, new tabs, or every page in the context must share the policy. A context route can cover a popup's initial navigation before page-level setup is possible. Prefer a fresh context per test so routes and captured request arrays cannot leak. If page and context rules both match, understand precedence and keep layered behavior documented.

### Why did a request bypass my Playwright route handler?

First verify that the handler was installed before the request and in the correct page or context. Then check for Service Worker handling, popup or worker scope, another matching handler, and a first-party proxy endpoint. Playwright's documentation notes that requests handled by a Service Worker are not intercepted by routing. A dedicated project with \`serviceWorkers: 'block'\` is appropriate for deterministic network-policy tests, while worker-specific tests should retain real Service Worker behavior.

### Is blocking images a safe way to speed up functional tests?

Only when images are explicitly outside the scenario's contract. A blanket image block can hide broken layout, lazy loading, accessible names, product galleries, canvas input, and visual regressions. Classify ownership first, then restrict resource types for a named test such as “article remains readable without optional external media.” Keep separate coverage with real required assets. Test speed is useful, but removing behavior without documenting the lost coverage creates fast false confidence.
`,
};
