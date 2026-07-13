import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Set Extra HTTP Headers for One Playwright Test',
  description:
    'Set Playwright extra HTTP headers for one isolated test without leaking tenant, feature, or correlation values into neighboring browser scenarios.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Set Extra HTTP Headers for One Playwright Test

A tenant switch hidden in \'X-Tenant-ID\' can turn the same URL into a completely different application. Put that header in the global Playwright configuration and every test silently becomes a tenant test. Put it on one browser context and the boundary is visible, reviewable, and disposed with the scenario.

Playwright exposes \'extraHTTPHeaders\' as a browser-context option and as a Playwright Test \'use\' option. The important part is not spelling the object. It is choosing a scope that sends the header to the intended requests without contaminating parallel tests, redirects, third-party hosts, or API calls that should remain neutral.

## Header scope follows the browser context

Each Playwright Test receives an isolated \'BrowserContext\' by default. Context-level extra headers are added to requests made by pages in that context. When the built-in \'request\' fixture is derived from test options, those headers also apply there. Closing the context ends that state.

The \'page\' fixture is already created from the test's effective \'use\' options. That is why \'test.use()\' must be declared while tests are being defined, not called from inside a running test after \'page\' exists. For a single scenario, place one test in a focused \'test.describe()\' block and declare the option inside the block.

| Placement | Effective scope | Suitable for a one-off header? | Risk |
| --- | --- | --- | --- |
| Top-level \'defineConfig({ use })\' | Every test using that config | No | Invisible cross-suite coupling |
| Project-level \'use\' | Every test in one browser or environment project | Sometimes | Header may reach unrelated cases |
| File-level \'test.use()\' | All tests declared in that file | Only if the file has one purpose | Future tests inherit it quietly |
| Describe-level \'test.use()\' | Tests in that describe group | Yes, if the group contains the scenario | Adding another test expands scope |
| Explicit \'browser.newContext()\' | Code using that context | Yes, exact runtime control | Must create and close pages/context manually |

Scoping is necessary but not sufficient. Headers follow network requests, including navigation, fetch, XHR, subresources, and redirects as the browser applies them. If the application loads resources from several origins, a custom internal header can travel farther than expected. Treat host reach as part of the test design.

## Wrap the one scenario in its own describe block

This pattern keeps the standard \'page\' fixture, screenshots, videos, traces, base URL behavior, and fixture lifecycle. The describe title documents why the context differs. Only one test lives inside it.

\`\`\`ts
import { expect, test } from '@playwright/test';

test.describe('tenant blue request context', () => {
  test.use({
    extraHTTPHeaders: {
      'X-Tenant-ID': 'tenant-blue',
      'X-Feature-Preview': 'invoice-v2',
      'X-Test-Correlation-ID': 'pw-invoice-blue',
    },
  });

  test('shows the preview invoice workflow for tenant blue', async ({ page }) => {
    await page.goto('/invoices/new');

    await expect(page.getByRole('heading', { name: 'Create invoice' })).toBeVisible();
    await expect(page.getByTestId('tenant-name')).toHaveText('Blue Company');
    await expect(page.getByRole('button', { name: 'Schedule invoice' })).toBeVisible();
  });
});

test('default tenant does not receive preview controls', async ({ page }) => {
  await page.goto('/invoices/new');
  await expect(page.getByRole('button', { name: 'Schedule invoice' })).toHaveCount(0);
});
\`\`\`

The neighboring test is valuable. It proves the default context remains unaffected and catches an accidental move of the headers into global configuration. It does not prove server enforcement, but it does protect the client-side scope.

Use canonical header casing for readability even though HTTP field names are case-insensitive. Values must be strings. Do not put \'undefined\', numbers, arrays, or a secret-bearing object into the option. If a value is generated, generate it during test definition only if deterministic static scope is acceptable. Runtime identifiers require a different design, covered below.

The [Playwright browser context guide](/blog/playwright-browser-context-guide-2026) explains the isolation boundary in more depth, including storage state, permissions, locale, and multiple contexts in a single browser.

## Use a manually created context for runtime values

Sometimes the header value comes from setup executed inside the test: an API creates a tenant, a fixture leases an account, or the correlation identifier incorporates \'testInfo.testId\'. A describe-level option cannot await that runtime setup. Create a new context with \'browser.newContext()\', then create the page from it.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('routes requests to the tenant created for this run', async ({ browser, request }, testInfo) => {
  const createResponse = await request.post('/api/test-support/tenants', {
    data: { plan: 'enterprise', region: 'eu-west' },
  });
  expect(createResponse.ok()).toBeTruthy();
  const tenant = (await createResponse.json()) as { id: string };

  const context = await browser.newContext({
    baseURL: 'https://staging.example.test',
    extraHTTPHeaders: {
      'X-Tenant-ID': tenant.id,
      'X-Test-Correlation-ID': testInfo.testId,
    },
  });

  try {
    const page = await context.newPage();
    await page.goto('/settings/billing');
    await expect(page.getByTestId('tenant-id')).toHaveText(tenant.id);
    await expect(page.getByText('Enterprise billing')).toBeVisible();
  } finally {
    await context.close();
  }
});
\`\`\`

This code uses the built-in \'request\' fixture to create test data without the tenant header, then a distinct browser context for the tenant-aware UI. The separation is deliberate. If setup also needs the custom header, construct an \'APIRequestContext\' with \'playwright.request.newContext({ extraHTTPHeaders })\' or use the context's associated request object after creating the browser context.

Manual context creation means manual lifecycle ownership. Always close it in \'finally\'. If an assertion throws before cleanup, an unclosed context can retain pages, consume memory, and complicate video or trace finalization. It also means configuration inherited by the normal \'page\' fixture is not automatically copied. Set the required \'baseURL\', locale, timezone, storage state, proxy, client certificates, and other context options explicitly or centralize context construction in a fixture.

## Verify what the server actually received

A green UI assertion shows resulting behavior, not the wire contract. For headers that choose tenants, authorization policies, experiments, or audit correlation, add a test-support endpoint that echoes only approved non-secret request metadata. Assert the server-observed value.

Do not inspect request headers solely through \'page.on(\'request\')\' and assume the origin received them. Browser instrumentation observes the outgoing request representation, but proxies and gateways can strip, rewrite, or duplicate fields. The receiving service or a controlled echo endpoint gives stronger evidence.

An effective verification matrix separates routing from leakage:

| Check | Request target | Expected observation | Defect caught |
| --- | --- | --- | --- |
| Tenant route | First-party echo endpoint | Exact tenant identifier | Header absent or renamed |
| Correlation | Backend response or log lookup | Test ID matches | Gateway strips tracing metadata |
| Neutral neighbor | Same endpoint in default test | Header absent | Scope leaked across test definitions |
| Redirect | First-party redirect to approved origin | Policy-defined presence or absence | Redirect changes header behavior |
| External resource | Controlled second origin | Sensitive custom header absent | Context header leaks cross-origin |

Whether Playwright sends an extra context header to another origin can depend on the browser's networking behavior and redirect path, but a test should not rely on ambiguity for security. If a header must only reach one host, use request routing to add it conditionally or configure the application/gateway so the sensitive selector is an authenticated cookie or token with appropriate origin controls.

## Conditionally inject a header with route continuation

Context-wide extra headers are intentionally broad. For a host-specific need, intercept matching requests and continue them with merged headers. Register the route before navigation. Preserve existing request headers, because replacing the object without merging can drop browser-generated fields the application needs.

The core shape is \'context.route(pattern, handler)\', followed by \'route.continue({ headers })\'. Match a narrow first-party URL pattern. Inside the handler, combine \'request.headers()\' with the test field. Header overrides apply to the continued request, but routing introduces more moving parts than a context option and should be reserved for a real host boundary.

Be careful with redirects. A route handler applies when a request matches the pattern. If a response redirects to a URL outside that pattern, the destination request may not receive the injection, which is often the desired outcome. Add explicit redirect cases rather than assuming.

Route interception can also affect service workers. Requests handled entirely by a service worker may not appear as ordinary page routes in the way the test expects. When interception is central to an assertion, configure service-worker behavior consciously and validate in the supported browser projects.

## Separate identity, authorization, and feature selection

Custom headers are often overburdened. Teams use one field to identify a tenant, grant internal privileges, toggle a feature, and correlate logs. That makes a convenient test option into an authorization bypass.

Assign each header a clear contract:

- Tenant selection identifies the partition the authenticated principal wants to access. The server must still verify membership.
- Feature preview selects behavior for a test environment. It should not silently grant data access.
- Correlation IDs connect browser actions to gateway and service logs. They must not determine permission.
- Test-support headers should be accepted only by isolated non-production infrastructure and preferably protected by network and authentication controls.

Never paste production bearer tokens, session values, or personally identifying data into committed test configuration. Playwright traces and CI logs can preserve headers or related request data. Load secrets through the environment and keep them out of assertions, attachments, test titles, and screenshots. Better yet, authenticate with supported storage state or an API login rather than a magic header.

The complete [Playwright test config options reference](/blog/playwright-test-config-options-complete-reference) helps distinguish context settings that belong in \'use\' from runner settings such as retries, workers, reporters, and output paths.

## Precedence and mutations need explicit tests

Headers can be supplied in several layers: config \'use\', project \'use\', \'test.use()\', \'browser.newContext()\', and request-specific options. Avoid defining the same field in multiple layers. Even when merging behavior is documented, a reader should not have to calculate which tenant wins.

Playwright also exposes \'page.setExtraHTTPHeaders()\'. It changes extra headers for requests made by that page. The API is useful when a single page needs a new set after creation, but it is not an invitation to mutate shared meaning mid-scenario. Header ordering is not guaranteed, and the method receives the page-level set. If a login popup or second page must carry the same tenant selector, page-level mutation can create inconsistent behavior.

Prefer immutable context identity. Create the context with its final tenant and close it after the scenario. If the user story genuinely switches tenant in one browser session, drive the supported UI mechanism and assert the server's authorization response rather than swapping an internal header behind the application's back.

For request-specific API calls, \'request.get()\', \'request.post()\', and related methods accept per-call headers. That is usually better than context-wide headers when no browser navigation needs them. A browser context option is appropriate when document and subresource requests must share the value.

## Parallel execution and repeatability

Context isolation prevents Playwright workers from sharing the in-memory option, but the backend tenant is still shared if tests use the same identifier. Two workers writing invoices under \'tenant-blue\' can collide even though their contexts are separate. Generate or lease isolated server-side data, include a run identifier in created records, and clean up through authenticated support APIs.

Avoid using a random tenant header without creating the corresponding tenant. That turns a concurrency solution into noisy 404 or fallback behavior. The test should own the full lifecycle: provision, navigate with the identifier, assert, and delete or expire the record.

When diagnosing a failure, capture the correlation ID as a test attachment only if it contains no secret. A concise text attachment can help an operator query logs without exposing every request header. Make the value stable for the test attempt or include the retry number so logs from separate attempts are not confused.

Retries deserve special attention. A runtime fixture may create a new tenant on each retry. That improves isolation, but the retry no longer exercises the exact record from the first failure. Decide whether the test should reuse a durable ID for diagnosis or provision a fresh one for independence. Document that choice in the fixture rather than hiding it in a header generator.

## Review the boundary before merging

Use a short, header-specific review instead of a generic test checklist:

1. Is the field required for browser navigation, or would a per-call API header be narrower?
2. Does the value exist before test definition, or must a manual context be created after runtime setup?
3. Which hosts can receive the header through navigation, resources, fetches, and redirects?
4. Does a neutral neighboring test prove absence outside the intended scope?
5. Does the receiving service validate tenant authorization independently of the selector?
6. Can traces, reports, or gateway logs expose the value?
7. Will parallel workers mutate the same backend partition?

The best implementation makes the special context impossible to miss. A describe title, a named fixture such as \'tenantPage\', or explicit \'browser.newContext()\' communicates more than a global configuration entry several directories away.

## Test redirects and preflight behavior explicitly

Headers that work on a direct navigation may behave differently when an edge service redirects HTTP to HTTPS, a vanity host to a canonical host, or an application route to an identity provider. Create controlled endpoints for same-origin redirect, cross-origin redirect, and redirect back to the application. For each path, assert the receiving endpoint's observed headers and the final UI state. Never send a test authorization bypass to an external identity domain merely to see what happens.

CORS is another distinct layer. Context headers on a browser fetch can trigger an OPTIONS preflight when the field is not CORS-safelisted. The target server must allow the origin and header name before the actual request proceeds. A failed preflight can look like the application ignored the tenant selector even though the browser correctly refused the request. Capture the OPTIONS and application request separately, and assert the preflight response allows only the intended origins and fields.

Do not try to set forbidden browser-managed headers such as \'Host\', \'Content-Length\', or connection-level fields as product test inputs. Custom business headers should use documented names, and the service should avoid trusting spoofable routing metadata supplied by arbitrary clients. If a reverse proxy injects an internal identity header, test through the proxy boundary and ensure inbound user copies are stripped before the trusted value is added.

## Prefer a named fixture when several files need the pattern

If tenant-aware scenarios appear in multiple specs, a custom fixture can create the context after provisioning data and expose a clearly named page. The fixture should own cleanup, accept only typed tenant inputs, and attach a safe correlation identifier on failure. It should not silently override the ordinary \'page\' fixture for the entire repository.

Keep fixture options declarative when they are known before execution. Playwright's option fixtures can pass a tenant key into a worker or test fixture, while the fixture resolves credentials and calls \'browser.newContext()\'. Reviewers then see \'tenantPage\' or a tenant option at the test boundary rather than searching for a mutable header call.

Test the fixture itself with two scenarios: one receives the expected header and one ordinary page does not. Also induce a failure before page creation to prove the leased tenant is released. Infrastructure helpers deserve contract tests because a leak in them makes dozens of product tests misleading at once.

## Frequently Asked Questions

### Can test.use be called inside the test callback?

No. Playwright evaluates \'test.use()\' while defining tests and fixtures. Put it at file or describe scope. If the value is only available during execution, create a new browser context in the callback or build a custom fixture.

### Do extraHTTPHeaders apply to every origin loaded by the page?

Treat context extra headers as broad request state. Test redirects and secondary origins explicitly. If a field must be first-party only, use narrowly matched routing or a safer origin-bound authentication mechanism.

### Will the built-in request fixture receive the same headers?

When \'extraHTTPHeaders\' is part of the test's effective \'use\' options, it applies to the request context associated with those options. A separately created request context has its own configuration, so set headers there explicitly.

### How do I generate a unique correlation header per retry?

Use runtime information such as \'testInfo.testId\' and \'testInfo.retry\' while creating a manual context or a custom fixture. Keep the value non-secret and attach only the minimal identifier needed for log lookup.

### Is a tenant header enough to test tenant authorization?

No. It tests selection or routing. Add negative API and UI cases proving an authenticated user cannot access another tenant merely by changing the header. Authorization must be enforced server-side.
`,
};
