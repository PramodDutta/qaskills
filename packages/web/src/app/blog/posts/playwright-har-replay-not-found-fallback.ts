import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Handle Missing Requests During Playwright HAR Replay',
  description:
    'Configure Playwright HAR replay notFound fallback safely, diagnose unmatched requests, prevent accidental live traffic, and keep recordings maintainable.',
  date: '2026-07-13',
  category: 'Guide',
  content: `
# Handle Missing Requests During Playwright HAR Replay

A newly added \`GET /api/recommendations\` call turns yesterday's green HAR-backed checkout test into \`net::ERR_FAILED\`. The browser is behaving correctly: Playwright looked for the request in the archive, found no matching entry, and applied the default unmatched-request policy, which is to abort. Whether that is desirable depends on what the test is meant to isolate.

Setting \`notFound: 'fallback'\` sends an unmatched request to the real network. That one option can make a partially recorded flow work, but it also changes the trust boundary of the test. A replay that quietly reaches staging is no longer fully deterministic. The practical task is not merely enabling fallback. It is deciding which URLs may escape, detecting when they do, and keeping a missing HAR entry from becoming invisible technical debt.

## What Playwright considers a HAR match

\`page.routeFromHAR()\` and \`browserContext.routeFromHAR()\` register routing backed by an HTTP Archive. Playwright searches the recorded entries for the incoming request. Matching is sensitive to request URL and method; for POST requests, body information can distinguish candidates. Headers are used to choose among multiple otherwise matching entries, so a changed authorization or experiment header can affect which response is selected.

The useful operational distinction is simpler than the internal selection algorithm:

| Incoming request state | \`notFound: 'abort'\` | \`notFound: 'fallback'\` |
| --- | --- | --- |
| Matching HAR entry exists | Recorded response is served | Recorded response is served |
| No entry matches | Request fails at the routing layer | Request continues to the network |
| URL is outside the HAR \`url\` filter | Other routing or normal network handles it | Other routing or normal network handles it |
| Service worker intercepts it first | HAR routing may not see it | HAR routing may not see it |
| Server returns HTTP 404 after fallback | Browser receives a normal 404 response | Browser receives a normal 404 response |

The final row matters during diagnosis. A Playwright request failure is different from an HTTP error response. With abort behavior, \`requestfailed\` can fire because no response was produced. With fallback, a live server's 404 is still a completed HTTP exchange and is visible through \`response\` or \`requestfinished\`.

HAR routing does not intercept traffic already handled by a service worker. For replay-focused projects, configuring the browser context with \`serviceWorkers: 'block'\` removes that competing network layer. Otherwise, an application PWA cache can make a request appear to come from neither the HAR nor the network path you instrumented.

## Enabling fallback for a bounded API surface

Avoid applying a permissive replay archive to every resource on every origin. Route only the API surface represented by the recording. Static assets, analytics, and unrelated domains can then be controlled separately.

This runnable Playwright Test example replays catalog calls from a HAR, permits a newly introduced API request to reach the configured environment, and blocks third-party traffic. The browser context owns the HAR route, so popup pages are covered as well as the original page.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import path from 'node:path';

test.use({
  baseURL: 'http://127.0.0.1:4173',
  serviceWorkers: 'block',
});

test('uses recorded catalog data and live fallback for missing API calls', async ({
  context,
  page,
}) => {
  const harPath = path.join(__dirname, 'fixtures', 'catalog.har.zip');

  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1') {
      await route.fallback();
      return;
    }
    await route.abort('blockedbyclient');
  });

  await context.routeFromHAR(harPath, {
    url: '**/api/**',
    notFound: 'fallback',
  });

  await page.goto('/catalog');
  await expect(page.getByRole('heading', { name: 'Catalog' })).toBeVisible();
  await expect(page.getByTestId('recommendation')).toContainText('Recommended');
});
\`\`\`

Route registration order deserves attention. When multiple handlers match, Playwright evaluates the most recently registered applicable route first, and \`route.fallback()\` allows earlier handlers to run. The example registers the broad guard before HAR routing. A request the archive cannot serve falls through and eventually reaches the guard, which permits only the application host.

This is different from \`route.continue()\`. Continue sends the request to the network immediately and does not offer it to another matching handler. For layered network policy, fallback is the compositional operation.

The [Playwright network interception guide](/blog/playwright-network-interception-mocking-guide) explains route precedence in more depth. HAR replay is one routing handler in that larger stack.

## Make escaped requests visible

Fallback is risky when nobody knows it happened. Treat every live escape as test output. During migration to a complete archive, a test can collect candidates and attach them to the report. The challenge is identifying requests served by HAR versus requests that continued. Playwright does not expose a direct \`servedFromHar\` boolean on \`Response\`.

A robust strategy is an allowlist handler placed beneath the HAR route. It executes only after HAR cannot handle the request. It can record the method and URL, then decide whether to continue or fail.

\`\`\`typescript
import { test as base, expect } from '@playwright/test';
import path from 'node:path';

const allowedFallbackPaths = new Set([
  '/api/recommendations',
  '/api/session/refresh',
]);

const test = base.extend<{ harReplay: void }>({
  harReplay: [
    async ({ context }, use, testInfo) => {
      const escaped: string[] = [];

      await context.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const signature = \`\${request.method()} \${url.pathname}\${url.search}\`;

        if (!allowedFallbackPaths.has(url.pathname)) {
          throw new Error(\`Unexpected request missing from HAR: \${signature}\`);
        }

        escaped.push(signature);
        await route.continue();
      });

      await context.routeFromHAR(
        path.join(__dirname, 'fixtures', 'checkout.har.zip'),
        { url: '**/api/**', notFound: 'fallback' },
      );

      await use();

      await testInfo.attach('har-network-fallbacks.json', {
        body: Buffer.from(JSON.stringify(escaped, null, 2)),
        contentType: 'application/json',
      });
    },
    { auto: true },
  ],
});

test('checkout summary', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page.getByTestId('total')).toHaveText('$42.00');
});
\`\`\`

Because the HAR route was registered last, it gets first opportunity. Only an unmatched API request reaches the earlier policy handler. Throwing from a route handler fails loudly, which is preferable to accidentally calling a payment, email, or deletion endpoint.

Do not store secrets or full request bodies in the attachment. Query strings may contain tokens, email addresses, or customer identifiers. A production-grade recorder should redact known sensitive keys before emitting diagnostics.

## Choosing abort, fallback, or a deliberate mock

The correct unmatched policy follows the test's purpose. A UI contract test wants a closed world; an exploratory compatibility check may intentionally mix recorded core responses with a live experimental endpoint.

| Test objective | Recommended unmatched handling | Rationale |
| --- | --- | --- |
| Fully deterministic pull-request regression | Abort | Any new request changes the recorded contract and should be reviewed |
| Gradual HAR adoption for a legacy flow | Allowlisted fallback | Known gaps can remain live without opening every origin |
| Offline development | Abort plus explicit \`route.fulfill()\` | Network access would defeat the offline guarantee |
| Stable core API with live feature service | HAR \`url\` filter plus normal network for the feature host | The boundary is clearer than a global fallback |
| Recording refresh job | \`update: true\` against a controlled environment | The goal is to capture actual traffic, not replay it |
| Destructive or billable endpoints | Explicit mock, never broad fallback | Accidental live execution has unacceptable side effects |

An explicit route mock is often clearer for one volatile endpoint. Use \`route.fulfill()\` when the response is small and the scenario needs a hand-authored status or payload. The [route fulfill API mocking guide](/blog/playwright-route-fulfill-mock-api-guide) covers that approach. HAR files are strongest when a realistic sequence contains many related requests and response bodies.

Mixing techniques is legitimate. Replay stable product and pricing reads from HAR, fulfill a clock-sensitive promotion response in code, and abort everything else. The key is that every category has an intentional owner.

## Diagnose why an expected entry is reported missing

Immediately rerecording the archive can mask a meaningful regression. Inspect the request that failed and compare it with the HAR entry first.

Start with method and normalized URL. A new cache-buster, changed API version, reordered path, or environment hostname can prevent the match you expected. Query parameter order is usually less interesting than parameter values, but dynamic values such as timestamps and generated IDs make recordings brittle.

Then inspect POST data. A GraphQL endpoint may keep the same URL while changing operation name, variables, or persisted-query hash. A checkout payload may include a generated cart identifier. The archive is a captured conversation, not a semantic stub that understands equivalence between two business requests.

Finally, check routing reachability. A service worker may have consumed the request. A later \`page.route()\` handler may take precedence over a context HAR route. The \`url\` filter may exclude the endpoint. Popup traffic may escape a page-level route. These are routing problems rather than absent HAR data.

| Symptom | Likely cause | First check |
| --- | --- | --- |
| \`net::ERR_FAILED\` only after a frontend change | New request absent from archive | Log method and URL through \`requestfailed\` |
| Same path, only POST fails | Body no longer matches | Compare recorded and current payloads after redaction |
| Requests never appear in route logs | Service worker or different context | Block service workers and confirm page ownership |
| Main page replays, popup calls live services | HAR installed on \`page\` only | Move routing to \`browserContext\` |
| Fallback handler never runs | Another route used \`continue()\` or fulfilled | Review reverse registration order |
| Works locally, fails in CI with fallback | CI cannot reach the live host | Decide whether CI should mock, record, or receive network access |

Playwright's request events are useful instrumentation. Listen to \`request\`, \`response\`, and \`requestfailed\`, but avoid interpreting every 404 as transport failure. Record a compact signature so logs remain readable.

## Updating a HAR without turning tests into recorders

The \`update: true\` option changes the role of \`routeFromHAR()\`: requests go to the network and the archive is written when the browser context closes. This belongs in an intentional maintenance workflow, not a normal assertion run. Otherwise a changed backend can rewrite the test oracle and make the test pass against the new behavior without review.

Use a dedicated command or project for refreshes, point it at a known dataset, and review the HAR diff or regenerated artifact. \`updateMode: 'minimal'\` stores information necessary for replay and omits many timing, size, page, cookie, and security fields. It is the default update mode and is usually better for test fixtures. \`updateMode: 'full'\` preserves a fuller HAR when humans or external tooling need those details. \`updateContent: 'embed'\` places resource bodies inside the HAR, while \`attach\` stores them separately or in ZIP entries.

Close the context cleanly. The updated file is persisted on context closure, so a standalone script that exits abruptly may leave no useful update. In Playwright Test, the runner manages its context, but a custom recording utility must do so itself.

Archive review should answer three questions: which requests were added, whether sensitive data was captured, and whether recorded responses represent the intended scenario. A successful recording says only that traffic occurred. It does not prove the resulting fixture is safe or meaningful.

## Keeping fallback from hiding frontend drift

Fallback tends to expand. One approved missing endpoint becomes five, then the test relies on a live login service and becomes flaky during outages. Put a budget around it.

An allowlist is the first control. A count assertion is another: if the checkout scenario expects exactly one refresh call to escape, fail when it becomes two. You can also ban non-idempotent methods from fallback. Permit \`GET\` to a recommendation service but reject \`POST\`, \`PATCH\`, and \`DELETE\` unless individually reviewed.

Environment protection matters as much as test logic. Resolve the base URL from an explicit test configuration, validate its hostname before opening the browser, and use credentials restricted to disposable test data. A routing typo should never make production the easiest reachable fallback.

Separate network fidelity from assertion fidelity. A live response may change for legitimate reasons, making snapshot assertions unstable. If the scenario needs stable ranking or pricing, record or fulfill that response. If it tests compatibility with the current backend schema, live fallback may be the point, but label the test accordingly and do not claim it is hermetic.

Fallback should therefore be a transition or an explicit hybrid architecture, never an unexamined fix for red CI. When an endpoint becomes stable enough to record, refresh the archive and remove its allowlist entry. When it stays dynamic, give it a purpose-built route or a dedicated live test suite.

## Security and data hygiene in HAR fixtures

HAR files can contain request headers, cookies, payloads, query parameters, and response bodies. Treat them as test data with potential credentials and personal information. Capture from synthetic accounts, inspect before commit, and prefer short-lived credentials even in nonproduction.

Do not solve secret exposure by broadly deleting every header without checking replay. Some headers participate in selecting among similar entries, and removing data can change which response Playwright chooses. Redact deliberately, then run the archive in an environment with network blocked to prove it remains sufficient.

ZIP archives keep large bodies manageable but do not encrypt them. Repository access is the security boundary. If the payload is too sensitive to store, hand-author a minimal \`route.fulfill()\` response or generate the fixture from sanitized source data.

Also consider response age. Recorded feature flags, legal copy, and permissions can become misleading. Give archives an owner and a reason to refresh. A date alone is not a policy; tie refresh to API contract changes or a scheduled review with meaningful assertions.

## Validate fallback in an offline CI job

A hybrid test can accidentally become fully live while still passing. Add a companion CI job or project that denies outbound network access and runs scenarios expected to be hermetic. The job should permit only the local application origin and any intentionally containerized dependencies. If HAR matching regresses, the request fails immediately instead of reaching a convenient staging host.

For tests that intentionally allow one live endpoint, replace that endpoint with a local stub in the offline project and retain the same allowlist signature. This proves the routing classification without depending on external availability. It also reveals host aliases, redirects, and authentication refresh calls that bypass the expected pattern.

Count fallback signatures after every scenario and compare them with the reviewed allowlist, including method. A permitted \`GET /api/recommendations\` must not authorize \`POST /api/recommendations\`. Normalize only volatile query values that the policy explicitly considers irrelevant; over-normalization can merge a benign read with a destructive variant. Store the allowlist near the HAR fixture so a recording update and escape-policy change appear in one review. This offline exercise turns “the page rendered” into evidence that the archive, explicit mocks, and network boundary still divide traffic as designed.

## Frequently Asked Questions

### What does Playwright do by default when a request is absent from the HAR?

It aborts the unmatched request. Set \`notFound: 'fallback'\` on \`page.routeFromHAR()\` or \`browserContext.routeFromHAR()\` to send that request to the network instead.

### Can fallback be restricted to one endpoint?

The \`notFound\` option applies to the HAR route, but you can bound the route with its \`url\` option and layer an earlier \`context.route()\` allowlist beneath it. That handler can continue approved missing paths and reject every other escape.

### Why is an unmatched HAR request not visible to my page route?

Check route registration order, whether a handler called \`continue()\`, whether routing was installed on the correct page or context, and whether a service worker intercepted the request. Blocking service workers is advisable for deterministic HAR replay.

### Does notFound fallback add the missing exchange to the archive?

No. Fallback only lets the request proceed to the network. Use \`update: true\` in a deliberate recording workflow if you want Playwright to rewrite the HAR when the context closes.

### Should CI ever use live fallback?

Yes, when the test explicitly validates a hybrid or current-backend interaction and the allowed destinations are controlled. For a hermetic pull-request regression suite, aborting unknown traffic is usually the stronger policy because a new dependency fails visibly.
`,
};
