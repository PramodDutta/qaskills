import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Clerk protected route matrix tests',
  description:
    'clerk protected route matrix tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'clerk protected route matrix tests',
  keywords: [
    'clerk protected route matrix tests',
    'clerk route matcher test cases',
    'nextjs protected route matrix',
    'test auth protect middleware',
    'dashboard route authorization tests',
    'api subtree protection tests',
  ],
  relatedSlugs: [
    'authentication-authorization-testing-guide',
    'testing-missed-clerk-webhook-user-recovery',
    'testing-clerk-user-created-webhook-idempotency',
    'api-security-testing-checklist-2026',
  ],
  sources: [
    'https://clerk.com/docs/reference/nextjs/clerk-middleware',
    'https://clerk.com/docs/reference/nextjs/app-router/auth',
  ],
  repoEvidence: [
    'packages/web/src/middleware.ts:isProtectedRoute,authenticatedMiddleware',
    'packages/web/e2e/post-flow.e2e.ts:protected and public browser flows',
  ],
  content: `Clerk protected route matrix tests should derive cases from the middleware patterns, then send signed-out and signed-in requests across each route family. They must prove dashboard, skill-create, and review matches call protection, webhooks bypass it, and public pages remain open. Preference APIs need separate route-auth checks because the middleware pattern does not include them.

The matcher and callback are implemented in \`packages/web/src/middleware.ts:isProtectedRoute,authenticatedMiddleware\`. Browser and request checks can extend \`packages/web/e2e/post-flow.e2e.ts:protected and public browser flows\`, which already holds public QASkills post-flow coverage but not this full auth table.

This guide tests current boundaries and also records a source-backed migration concern. Use the [authentication and authorization guide](/blog/authentication-authorization-testing-guide) for wider policy design, while this matrix stays tied to repository routes.

## Clerk protected route matrix tests: What Must the Suite Prove?

Clerk protected route matrix tests must prove exact inclusion, exclusion, and precedence. A request matching \`/dashboard(.*)\`, \`/api/skills/create(.*)\`, or \`/api/reviews(.*)\` reaches \`auth.protect()\`, unless it first matches the public webhook family.

The middleware creates a separate public-webhook matcher for \`/api/webhooks(.*)\`. Its callback checks that matcher before the protected matcher and returns immediately for a webhook. The test should assert zero protect calls, not merely accept any webhook status.

Public catalog pages such as skills, blog, and getting started do not match the protected array. Read-only skill APIs also stay outside it. Their route handlers may still fail for their own data reasons, but Clerk protection should not block them.

Dashboard pages are document requests and should require a signed-in user under normal Clerk configuration. A signed-out browser case should observe a sign-in redirect, while a signed-in case should reach the requested dashboard path without that auth redirect.

Protected API requests require a different expectation. Clerk's [auth reference](https://clerk.com/docs/reference/nextjs/app-router/auth) states that unauthenticated non-document requests using session tokens receive 404 from \`auth.protect()\`. Tests should distinguish that denial from an unrelated missing route whenever the target exists.

The preference API is a crucial exception to matrix wording. It is not listed in \`isProtectedRoute\`; its GET and PATCH handlers perform their own \`currentUser()\` checks. A middleware test should expect no protect call, then a route test should still expect 401 for no user.

The environment branch also matters. When \`QASKILLS_DISABLE_AUTH\` equals \`1\` during module evaluation, the default export becomes a simple \`NextResponse.next()\` middleware. Auth-matrix runs must ensure that variable is absent unless they are explicitly testing the bypass.

Use [getting started](/getting-started) as one public document case and [dashboard preferences](/dashboard/preferences) as one protected document case. Their paired result catches a matcher that blocks too much or too little.

## Which QASkills Code Paths Own This Contract?

\`packages/web/src/middleware.ts\` owns two route matchers, one Clerk middleware callback, one test bypass, and one framework matcher configuration. Tests should cover each layer without treating them as the same decision.

The public matcher contains only \`/api/webhooks(.*)\`. The protected matcher contains three families: dashboard, skill creation API, and reviews API. Exact roots plus deeper paths should be represented because each expression includes a wildcard suffix.

Inside \`authenticatedMiddleware\`, API paths also trigger a diagnostic log before route decisions. That logging is not an access rule. Stub it in unit tests if needed, but do not use a log line as evidence that protection ran.

The callback returns for public webhooks, calls and awaits \`auth.protect()\` for protected routes, and otherwise finishes without an explicit response. This control flow means a unit test can assert callback calls directly without needing a live Clerk tenant.

The default export is selected at import time from \`process.env.QASKILLS_DISABLE_AUTH\`. Tests that toggle this value must reset the module registry before importing again, then restore the prior environment value. Otherwise one imported branch can leak through the suite.

The \`config.matcher\` array determines where Next.js invokes middleware at all. It skips common static assets and includes API or TRPC routes. Route-family tests should pair this outer matcher with Clerk's inner matchers so a protected path cannot bypass the callback.

\`packages/web/e2e/post-flow.e2e.ts\` currently sends many public page and API requests, including skills, blog, sitemap, and roadmap flows. Add representative auth cases there rather than claiming its existing public smoke checks already prove protection.

The official [Clerk middleware reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) now marks \`createRouteMatcher()\` as deprecated and recommends resource-based checks for protection. That guidance does not erase the current repository contract; it adds a migration test requirement before patterns change.

## Clerk route matcher test cases: Baseline Cases

Clerk route matcher test cases should start with the exact pattern arrays. Assert both calls to \`createRouteMatcher\` receive the current strings in order. This catches accidental deletion, widening, or movement between public and protected sets.

For dashboard, include \`/dashboard\`, \`/dashboard/preferences\`, \`/dashboard/create\`, and \`/dashboard/publish\`. Also include a near miss such as \`/dashboards\` so a broad prefix implementation cannot pass. The near miss must not call protect.

For skill creation, test \`/api/skills/create\` and a deeper sample under that family. Also test \`/api/skills\`, \`/api/skills/example\`, and \`/api/skills/example/content\` as public middleware cases. Their handlers define their own output.

For reviews, test \`/api/reviews\` and a deeper path. Use \`/api/review\` as a near miss. The actual route root exists, which makes a signed-out 404 from protection more meaningful than a path that Next.js would not resolve.

For webhooks, test \`/api/webhooks/clerk\` and a deeper sample. Assert public matcher true and protect count zero even if a controlled protected matcher also returns true. This proves the early return has precedence.

For ordinary public pages, include \`/skills\`, \`/blog\`, \`/getting-started\`, and \`/how-to-publish\`. These routes should not invoke protect. A browser layer should then assert direct page access, not only unit matcher output.

For preferences, assert \`/api/user/preferences\` does not call middleware protection. Then directly invoke its route with no Clerk user and expect its own 401. This two-part case prevents a false claim that middleware owns every authenticated API.

Review [how to publish](/how-to-publish) as a public route beside the protected dashboard create page. Similar user intent makes that pair useful for catching accidental overmatching.

## Nextjs protected route matrix: Test Matrix

A nextjs protected route matrix should list both expected middleware action and endpoint outcome. The rows below keep preference route auth separate and avoid treating every non-200 result as proof of Clerk protection.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Public skills and blog pages | Signed-out document requests | No inner matcher | Page response without auth redirect | Zero protect calls | Public page redirects |
| Dashboard pages | Signed-out and signed-in documents | Protected dashboard family | Sign-in redirect or signed-in page | Protect once per request | Signed-out page renders |
| Skill creation API | Controlled API request | Protected create family | Clerk denial when signed out | Protect once | Read-only skill API also denied |
| Reviews and preference APIs | Signed-out requests | Reviews protected; preferences route-owned | Reviews denied by protect; preferences returns route 401 | Protect once then zero | Owners are conflated |
| Public webhook and read-only catalog endpoints | Controlled API requests | Webhook return or no match | Route-specific output, not middleware denial | Zero protect calls | Webhook protect call |

The public row should assert the final URL remains on the requested path. A response status alone can hide a redirect chain when the client follows redirects by default. Browser assertions should inspect both URL and a stable page heading.

The dashboard row needs signed-out and signed-in modes. The signed-out case proves denial, while the signed-in case proves the matcher permits an authenticated request to continue. A suite with only denial cannot detect middleware that blocks everyone.

The skill creation row primarily proves matcher policy because that path family may change independently from read-only skill routes. Pair it with \`/api/skills\` and one detail GET. Only the create family should call protect at this layer.

The review and preference row must have two expectations. Reviews enters the protected matcher, but preferences does not. Preference security is still real because the handler calls Clerk directly, so test that route owner in a second assertion.

The webhook row should not expect a successful webhook business response without valid headers and payload. Its auth assertion is zero protect calls. A route-specific 400 can still prove the request passed middleware and reached validation.

Run the table under normal auth configuration and under the explicit bypass in a separate suite. Never let \`QASKILLS_DISABLE_AUTH=1\` turn the main matrix green.

The [API security checklist](/blog/api-security-testing-checklist-2026) can add resource-level controls. Keep this matrix clear about what middleware does and does not own.

## How Should Test auth protect middleware Be Exercised?

Test auth protect middleware at two levels. A module test should capture matcher configuration and callback calls, while a real request test should confirm Clerk turns those calls into the expected document or API result.

Mock \`clerkMiddleware\` so it captures the callback passed by the module. Mock \`createRouteMatcher\` with two controlled predicates, one for webhooks and one for protected routes. Then call the callback with a minimal request containing \`nextUrl.pathname\`.

This unit pattern proves precedence and call count without a network tenant. It intentionally controls matching booleans, so a separate assertion must inspect the exact matcher arrays or use Clerk's real matcher in an integration test.

\`\`\`ts
import { beforeEach, expect, test, vi } from 'vitest';

const protect = vi.fn();
const isWebhook = vi.fn();
const isProtected = vi.fn();
let callback!: (auth: () => Promise<{ protect: typeof protect }>, request: any) => Promise<void>;

const createRouteMatcher = vi
  .fn()
  .mockReturnValueOnce(isWebhook)
  .mockReturnValueOnce(isProtected);
const clerkMiddleware = vi.fn((handler) => {
  callback = handler;
  return handler;
});

vi.mock('@clerk/nextjs/server', () => ({ clerkMiddleware, createRouteMatcher }));

beforeEach(() => {
  protect.mockReset();
  isWebhook.mockReset();
  isProtected.mockReset();
});

test('public webhook returns before the protected check', async () => {
  await import('@/middleware');
  isWebhook.mockReturnValue(true);
  isProtected.mockReturnValue(true);

  await callback(async () => ({ protect }), {
    nextUrl: { pathname: '/api/webhooks/clerk' },
    method: 'POST',
  });

  expect(isWebhook).toHaveBeenCalledTimes(1);
  expect(isProtected).not.toHaveBeenCalled();
  expect(protect).not.toHaveBeenCalled();
});
\`\`\`

Add a protected case where webhook returns false and protected returns true. Assert the auth function and \`protect\` each run once. Add a public case where both return false and protect remains unused.

Module state requires care because matcher mocks use ordered return values. Reset modules before each import or initialize the module once and reset only predicate calls. Do not import middleware before mocks are installed.

For exact patterns, assert the first matcher call receives the webhook array and the second receives all three protected strings. This catches drift that controlled predicates cannot. A small real-matcher test can then cover root, child, and near-miss paths.

Use [dashboard preferences](/dashboard/preferences) for a document integration case. Keep the unit callback report focused on pathname, matcher outcomes, and protect count.

## Step-by-Step Dashboard route authorization tests Procedure

Dashboard route authorization tests should begin from the source patterns and finish in a real browser. That order gives fast branch diagnosis before slower Clerk and page rendering checks.

1. Derive route families from \`isProtectedRoute\` and the filesystem route inventory.
2. Generate signed-out and signed-in requests for every public and protected family.
3. Assert redirects or denial for protected routes and direct access for public routes.
4. Keep representative browser cases in \`post-flow.e2e.ts\` and route-level cases near middleware.

Step one should inventory existing dashboard pages and API handlers, then compare them with matcher intent. Record nonexistent but reserved pattern families separately so a 404 does not masquerade as successful auth denial.

Step two needs two browser contexts or storage states. The signed-out context should contain no Clerk session, while the signed-in context should use a dedicated test account. Never reuse a personal session file in CI.

Step three should treat documents and APIs differently. Signed-out dashboard documents redirect to sign-in under the documented Clerk behavior, while protected session-token API requests return 404. Signed-in requests should continue to their route owner.

Step four can extend \`packages/web/e2e/post-flow.e2e.ts\` with one public page, one dashboard page, one protected API, one public webhook reachability case, and one read-only API. Keep the full route table in faster tests so the browser file stays focused.

Add the explicit auth-disabled branch in its own module test. Set \`QASKILLS_DISABLE_AUTH=1\`, reset modules, import default, and assert it returns a next response without calling Clerk. Restore the variable immediately afterward.

Run this procedure before modifying wildcard syntax. The current [Clerk middleware reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) prefers \`:path*\` for subtree matching, so a migration should run old and new matrices against the same expected routes.

Use the [missed webhook recovery article](/blog/testing-missed-clerk-webhook-user-recovery) after webhook bypass is proven. It covers downstream account recovery rather than middleware access.

## Api subtree protection tests: Assertions and Diagnostics

Api subtree protection tests should report the path, request kind, public matcher result, protected matcher result, protect count, status, location, and final route output. Those fields distinguish route absence from auth denial and handler validation.

For \`/api/reviews\`, signed-out session-token requests should observe Clerk's documented non-document denial. A signed-in request should reach the review handler, whose own method and data rules may produce another status. The report must preserve that owner transition.

For \`/api/skills/create\`, first prove matcher invocation in a unit or middleware integration test. If no concrete route exists in the current filesystem, an end-to-end 404 alone proves nothing about protection. Label reserved pattern coverage honestly.

For \`/api/user/preferences\`, expect zero middleware protect calls and a handler-owned 401 without a user. This route is a strong negative control because it is authenticated but not through \`isProtectedRoute\`.

For \`/api/webhooks/clerk\`, assert zero protect calls and evidence that route validation received the request. Do not require 200 without a valid webhook signature. The goal is public transport access, not acceptance of an invalid event.

The browser/request sketch below uses public document checks plus a dashboard redirect. API expectations should use a configured test server and the current Clerk session-token behavior.

\`\`\`ts
import { expect, test } from '@playwright/test';

test('public pages stay open while a dashboard page redirects signed-out users', async ({
  page,
  request,
}) => {
  for (const route of ['/skills', '/blog', '/getting-started', '/how-to-publish']) {
    const response = await request.get(route);
    expect(response.ok(), route).toBeTruthy();
  }

  const dashboard = await request.get('/dashboard/preferences', {
    maxRedirects: 0,
  });
  expect([302, 307, 308]).toContain(dashboard.status());
  expect(dashboard.headers().location).toBeTruthy();

  await page.goto('/skills');
  await expect(page).toHaveURL(/\\/skills$/);
  await expect(page.getByRole('heading', { name: 'Browse QA Skills' })).toBeVisible();
});
\`\`\`

Do not hardcode a sign-in host unless test configuration owns it. Assert a configured sign-in destination or a known path component. This keeps local, preview, and production-like hosts from forcing unsafe broad matches.

Add a signed-in storage state that reaches [dashboard preferences](/dashboard/preferences) without redirect. The signed-in case must assert a page heading so an empty continuation response cannot pass.

Read the [Clerk webhook idempotency article](/blog/testing-clerk-user-created-webhook-idempotency) for event processing. Middleware tests should stop after proving the webhook request reaches its route boundary.

## What Regressions and Boundaries Prevent False Confidence?

Any 404 can produce a false positive for protected APIs. A missing route, Clerk denial, and handler not-found response may share one status. Pair response checks with a protect-call assertion or a signed-in comparison that reaches the route owner.

Any redirect can also mislead when the client follows it. Disable automatic redirects for the signed-out document request, inspect status and Location, then use a browser for final navigation behavior. Do not call a sign-in page load proof of dashboard access.

The auth-disable environment variable can invalidate the whole suite. Assert its value at test startup, and isolate the bypass test through module resets. Build scripts that set it for local post-flow need a separate auth-enabled job.

Preference routes prevent a different false claim. They are secured in their handlers, not in this matcher. A report that says "all private APIs call middleware protect" is inaccurate and may push a future refactor toward duplicate or missing checks.

The source now marks \`createRouteMatcher\` deprecated, but a test should not silently rewrite policy. First capture current route expectations, then migrate protection closer to resources and rerun the same signed-out and signed-in table.

Matcher syntax itself can drift. Include roots, children, near misses, static files, and query strings where useful. Compare the outer Next.js matcher with the inner protected matcher so protected requests actually invoke the callback.

The existing post-flow file has broad public coverage, but public success alone cannot prove private denial. Add representative auth cases without removing those current public checks. The [authentication guide](/blog/authentication-authorization-testing-guide) can frame resource-level follow-up.

Keep the route set small when a red case first appears. Run the same path with no user and a test user, then compare who owns the response. A clear pair shows whether Clerk stopped the call or the app code did. It also keeps a missing page from looking like a sound auth rule.

Clerk protected route matrix tests should use short case names that state path, state, and owner. Save only status, place, match, and call count in the first report. Add full route logs only when that small set cannot show the fault. This keeps the common run safe, quick, and easy for the team to read.

Finally, keep webhooks public only at transport. Signature validation and idempotent processing remain required inside their route. Use [webhook recovery testing](/blog/testing-missed-clerk-webhook-user-recovery) for those downstream cases.

- compare the same page with no user and one known test user
- compare one live API route before using any reserved route path
- name the middleware or handler that owns each blocked request
- keep webhook access checks apart from event signature checks
- fail the run when the auth bypass flag is set by mistake

Keep one plain route ledger in the test report. It should name the path, request kind, signed-in state, match result, protect count, and next owner. Clerk protected route matrix tests are much easier to read when each row shows those facts. This ledger also stops a plain 404 from hiding why the request failed.

Use short labels and safe test accounts. A public row should show no protect call, while a private row should show one. A signed-in row should reach its page or handler. A webhook row should reach its own checks, and a preference row should show that auth lives in the route.

Run this route list before any matcher change:

- signed-out skills page stays on the skills path with no auth redirect
- signed-out blog page stays on the blog path with no auth redirect
- signed-out getting-started page loads as a public document request
- signed-out publish guide loads without a call to auth protect
- signed-out dashboard root calls protect and starts the sign-in flow
- signed-out dashboard preferences calls protect before page code can run
- signed-out dashboard create follows the same private page rule
- signed-in dashboard preferences reaches the page and shows its main heading
- signed-in dashboard publish reaches its page without an auth redirect
- reviews API root calls protect once for a signed-out request
- reviews API child path stays inside the same private route family
- singular review API near miss does not enter the reviews matcher
- skill create API root calls protect once at the middleware layer
- read-only skills API does not call protect at the middleware layer
- skill detail API does not inherit the create-only private rule
- skill content API also stays outside the create-only private rule
- Clerk webhook returns before the protected matcher and protect call
- another webhook child path follows the same public transport rule
- preference API does not call middleware protect for either method
- preference route still rejects a missing Clerk user through its own check
- static image request stays outside the broad app middleware work
- auth-disabled import returns next only in its isolated bypass test
- normal auth matrix starts with the bypass environment variable unset
- each signed-out API result records whether Clerk or handler owned it

Clerk protected route matrix tests should save this list as case data, not copy it into many test bodies. A table-driven runner can add roots and child paths with less drift. Clear case names then show which rule changed, while shared setup keeps session and request state the same for each peer.

The route ledger should also flag paths that have no file yet. A protected pattern can reserve a future path, but a 404 there cannot prove auth worked. Test the matcher call in the unit layer, then use an existing reviews route for the real signed-out API result.

## Frequently Asked Questions

### How do clerk protected route matrix tests separate middleware and route auth?

Assert whether \`auth.protect()\` runs for each path, then assert the handler's own result separately. Dashboard, create, and review families enter middleware protection. Preference APIs do not, but their handlers still check Clerk and return 401 without a user. This preserves the true owner of each denial.

### Which clerk route matcher test cases are essential?

Cover each protected root, child paths, near misses, the public webhook family, read-only APIs, static public pages, and preference APIs. Include both signed-out and signed-in modes. Also test the auth-disable import branch separately, because leaving that variable enabled can invalidate every protection result.

### What belongs in a nextjs protected route matrix?

Record route family, document or API kind, session state, matcher result, protect count, status, redirect location, and final owner. Include public and protected controls together. This table catches both underprotection and overprotection while distinguishing Clerk denial from route-level validation or missing resources.

### How should tests test auth protect middleware without live Clerk?

Mock \`clerkMiddleware\` to capture its callback, provide controlled public and protected predicates, and pass an auth function with a protect spy. Assert webhook precedence, protected await behavior, and public no-op behavior. Pair that unit layer with a smaller configured Clerk integration suite.

### What should dashboard route authorization tests expect?

Under normal configuration, a signed-out document request should redirect toward sign-in, while a signed-in request should continue and render the dashboard page. Assert the redirect without following it, then assert a stable heading after signed-in navigation. Also verify public pages never take that redirect.

### Why do api subtree protection tests need signed-in controls?

Signed-out protected APIs may return 404, which can look identical to a nonexistent route. A signed-in control shows whether the request reaches the handler. Unit protect-call checks add the missing branch evidence, so the suite can identify Clerk denial rather than accepting any not-found response.

## Conclusion

Clerk protected route matrix tests should prove exact pattern membership, webhook precedence, document redirects, API denial, signed-in continuation, and the environment bypass. They must also state that preference APIs use route-level Clerk checks, while current source guidance favors a future move from deprecated route matchers toward resource-owned protection.

[Open getting-started](/getting-started), then run the complete public and protected route matrix before editing Clerk middleware rules. Browse [QA security skills](/skills) for focused checks that can support the migration and its regression gate.`,
};
