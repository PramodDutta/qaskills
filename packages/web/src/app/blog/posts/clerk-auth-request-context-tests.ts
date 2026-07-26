import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Clerk auth request context tests',
  description:
    'clerk auth request context tests: build a code-backed QA plan with verified QASkills paths, test matrices, assertions, and focused regression checks.',
  date: '2026-07-25',
  updated: '2026-07-25',
  category: 'Tutorial',
  primaryKeyword: 'clerk auth request context tests',
  keywords: [
    'clerk auth request context tests',
    'clerk async local storage',
    'auth helper request context',
    'nextjs clerk route handler auth',
    'clerk middleware context error',
    'static import clerk auth',
  ],
  relatedSlugs: [
    'testing-missed-clerk-webhook-user-recovery',
    'testing-clerk-user-created-webhook-idempotency',
    'authentication-authorization-testing-guide',
    'react-nextjs-testing-complete-guide',
  ],
  sources: [
    'https://clerk.com/docs/reference/nextjs/app-router/auth',
    'https://clerk.com/docs/reference/nextjs/clerk-middleware',
  ],
  repoEvidence: [
    'packages/web/src/lib/api-auth.ts:getAuthUser static Clerk import',
    'packages/web/src/middleware.ts:authenticatedMiddleware',
  ],
  content: `Clerk auth request context tests must send a request through configured Clerk middleware, invoke a route that calls getAuthUser, and observe the signed-in identity at that boundary. The key pass condition is not a mocked user ID. It is a real middleware-backed request where Clerk identity drives the expected local-user lookup.

Keep unit tests for database branches, but add one integration check that preserves middleware, cookies, matcher rules, and static server imports in the same clean server run. A direct call to \`getAuthUser()\` without request setup can only test its fallback behavior when no request owns the call. It cannot prove the framework context is shared from the first server step to the local user query.

## Clerk auth request context tests: What Must the Suite Prove?

Clerk auth request context tests must prove that \`auth()\` reads the active identity inside a Next.js route request after Clerk middleware has run for that exact path. A signed-in request should find or recover one local user through the same server call. A signed-out request should return the route's normal auth result without a missing-context failure escaping into the client response.

The test needs two views of the same boundary that share one request ID in the failed report. The browser or HTTP layer supplies a real session and request path from a test account with no live data. The server layer records the middleware run, Clerk user ID, local lookup result, and final route status without printing the token.

Do not define success as any non-500 response, since that broad check can hide both a null user and an unrelated route fault. The [publishing route](/how-to-publish) can return 400 after valid auth when its body is invalid, which is useful for a read-only auth probe with no skill write. A 401 would show that \`getAuthUser\` returned null, while a 400 can show identity passed and checks on the body became the next branch in this route.

For a good data branch, use an existing test user and a payload that stops before insertion if the test host permits that route shape. A full-route test fixture is safer when available and keeps each user row easy to clean after the run. The main check is that request context reaches the static helper import and selects the row for that same Clerk ID.

The signed-out control should use a fresh browser context with no session state, shared cookies, or old test headers. It should pass through the same middleware matcher and receive the route's own auth response for the same method and body. This proves the good result did not come from a global fake user or state left by another browser test.

Clerk's [auth reference](https://clerk.com/docs/reference/nextjs/app-router/auth) states that the server helper works in Route Handlers and requires \`clerkMiddleware()\` setup. Its [middleware reference](https://clerk.com/docs/reference/nextjs/clerk-middleware) shows matcher rules that include API routes. These source facts match the repository design.

The [publishing flow](/how-to-publish) provides the product action that depends on this boundary. Keep its full mutation coverage separate from the smallest request-context proof, which can stop at validation and leave no new skill behind.

Clerk auth request context tests fail when a signed-in request becomes null, middleware does not run, the matcher skips the route, or a helper import loses the shared server context. Each failure report should name the request path, auth stage, safe user label, and next route branch that did or did not run.

## Which QASkills Code Paths Own This Contract?

The helper owner is \`packages/web/src/lib/api-auth.ts\`. It imports \`auth\` and \`currentUser\` statically from \`@clerk/nextjs/server\` at module load time in the server build. A source comment states that this import form should share the async request context set by Clerk middleware for the active call.

\`getAuthUser\` first awaits \`auth()\` inside a nested try block tied to the current route call. If that call throws, the helper logs the error and returns null without letting raw Clerk text reach the client. If the result has no \`userId\`, it also returns null before any database lookup or recovery call can start.

With a user ID, the helper queries the local users table by \`clerkId\` and limits the result to one row. An existing row returns immediately with no need to fetch the full Clerk profile. If no row exists, it calls \`currentUser()\`, derives profile values, and inserts a local row with \`onConflictDoNothing().returning()\`.

The recovery branch can return null when \`currentUser()\` is absent or when the insert returns no row for the active user. The current helper does not perform a second select after a conflict that another call may have won. Tests should assert today's branch outputs rather than invent a guaranteed recovery result that the source does not yet provide.

The context owner is \`packages/web/src/middleware.ts\`. It creates \`authenticatedMiddleware\` with \`clerkMiddleware\`, exempts webhook paths, and calls \`auth.protect()\` only for selected protected routes in its own path check. Its exported matcher still includes all API paths through \`/(api|trpc)(.*)\`, so context can exist even when that protect call does not run.

That distinction matters for the skills POST route and any later API route that owns its auth check. A route need not match \`isProtectedRoute\` for Clerk middleware to establish request context through the broad API matcher. The route can enforce signed-in access by calling \`getAuthUser\` itself after middleware has run for that same request.

When \`QASKILLS_DISABLE_AUTH\` equals \`1\`, the default export becomes a simple \`NextResponse.next()\` middleware with no Clerk context setup. A full-route auth test must ensure this flag is not enabled by mistake in the server process it starts. Otherwise, a null helper result can look like a Clerk defect when the test had turned the real middleware off.

The [authentication testing guide](/blog/authentication-authorization-testing-guide) covers wider access rules. This article stays with identity context, local lookup, and the two named repository owners so one failed check has a small and clear scope.

## Clerk async local storage: Baseline Cases

Clerk async local storage is a code tool behind the server helper, but tests should focus on request-visible results and safe server call counts. Use one signed-in request through middleware, one signed-out request through middleware, and one direct helper call outside a managed request with no route wrapper. The three cases distinguish identity, signed-out state, and missing context without reading a private store object.

The authenticated baseline starts a real Next.js test server with normal middleware and the same matcher used by the built app. Load a stored test session or sign in through the test identity flow with a user made just for this suite. Send a request to a route that calls \`getAuthUser\`, then assert the next expected branch rather than mocking \`auth()\`.

The unauthenticated baseline uses the same server and route with no Clerk cookies or authorization token in a new request context. The helper should return null, and the route should issue its documented authentication response for the same invalid body. No local user query should run after a missing user ID, which keeps the call ledger short and plain.

The direct invocation baseline calls \`getAuthUser\` in a unit process without middleware context or a request that Clerk can bind to. Current code catches an \`auth()\` error and returns null if Clerk throws, while the outer test sees no raw error. This case verifies containment, but its result cannot prove middleware integration in the running app.

An existing local user is the simplest signed-in database fixture and removes profile fetch work from the first integration case. Assert one select by Clerk ID and no \`currentUser\` call or insert in the server call ledger. This keeps the context proof from being confused by recovery logic or a race on local row creation.

Add a separate missed-row fixture for recovery. Assert \`currentUser\` is called only after an empty select, profile fields reach the insert, and the returned row becomes the helper result. This branch is code-backed but can be tested with Clerk and database doubles after the middleware integration gate exists.

A race or conflict fixture can make the insert return an empty array after another call writes the same Clerk user row. The helper then returns null because it does not read that row again in the same call. Capturing that current behavior prevents a test from assuming \`onConflictDoNothing\` always returns the competing row.

Use the [getting started page](/getting-started) to set up a safe local account flow with keys scoped to the test host. Never run request-context checks with a production session or production database that can retain a new user.

Clerk auth request context tests should record whether middleware ran for the exact request path and method used by the route probe. A valid cookie is not enough if a matcher change skips context setup before the helper call.

## Auth helper request context: Test Matrix

An auth helper request context matrix compares middleware execution, context state, Clerk identity, local lookup, and route output. It should avoid secret values while preserving enough stage data for diagnosis. The rows below map directly to \`getAuthUser\` and \`authenticatedMiddleware\`.

| Scenario | Controlled input or state | Repository branch | Expected response or UI | Expected side effect | Regression signal |
|---|---|---|---|---|---|
| Protected request through middleware | Valid test session and matched API path | \`clerkMiddleware\` plus \`auth()\` | Route reaches the post-auth branch | One local lookup by Clerk ID | Signed-in request returns auth failure |
| Helper without middleware context | Direct utility call in a unit process | Nested \`auth()\` catch | Helper returns null when Clerk throws | Context error is logged; no local query | Error escapes or fake identity appears |
| Signed-out request with context | Matched path without session | Empty \`userId\` branch | Route returns its normal auth response | No local lookup or insert | Missing context is confused with server 500 |
| Signed-in request with local user | Existing row for Clerk ID | First database select | Existing row becomes helper result | No recovery call or insert | Duplicate local user is created |
| Signed-in request needing recovery | Empty select and valid \`currentUser\` | Recovery insert branch | Created row becomes helper result | One conflict-safe insert attempt | Route stays unauthenticated after successful recovery |

The first row is the only one that proves the integration contract. Unit mocks can support the remaining rows, but they should not replace it. Mark the middleware-backed case clearly in CI so it is not silently skipped.

The second and third rows may both produce null, yet they have different causes. One lacks managed context and may log an auth error. The other has valid middleware context but no active user ID.

The existing-user row should check call counts. If \`currentUser\` runs despite a found row, the helper performs extra Clerk work and may introduce a new failure path. An exact zero count makes that regression visible.

The recovery row should use deterministic profile values. Assert Clerk ID, primary email fallback, username choice, and returned row only where the current helper defines them. Avoid assertions about webhook delivery because that is a different contract.

Review [QA skills](/skills) for auth-focused testing assets, then keep this matrix local. External identity systems should not make every unit case network-dependent.

## How Should Nextjs clerk route handler auth Be Exercised?

Nextjs clerk route handler auth should be exercised through a running Next.js server, because middleware context is created during request handling. A Vitest call to \`getAuthUser\` can cover error containment and database branches. It cannot reproduce the full framework boundary by returning a mocked user ID.

Choose a route where auth is checked before a mutation. QASkills \`POST /api/skills\` calls \`getAuthUser\` before parsing its body. With a signed-in test session and an invalid body, status 400 proves the request passed authentication and reached validation without creating a skill.

The corresponding signed-out request should return 401 for the same invalid body. This paired design makes the result specific: only session state changes, while route, method, and payload stay fixed. It also avoids a database insert.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test.describe('skills route Clerk request context', () => {
  test('signed-in request reaches validation after middleware', async ({ request }) => {
    const response = await request.post('/api/skills', {
      data: { name: '', description: 'short' },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('Validation failed'),
    });
  });
});

test.describe('signed-out control', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('same request stops at authentication', async ({ request }) => {
    const response = await request.post('/api/skills', {
      data: { name: '', description: 'short' },
    });

    expect(response.status()).toBe(401);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('Authentication required'),
    });
  });
});
\`\`\`

The first case requires a configured test-user storage state in the surrounding Playwright project. It should run with \`QASKILLS_DISABLE_AUTH\` unset and test Clerk keys, never live user credentials. The invalid payload stops before slug lookup and insertion.

Add server-log capture or a narrow test hook when the environment supports it. Verify middleware saw \`/api/skills\` and the helper received a user ID. Do not expose the actual session token in artifacts.

Clerk's auth reference says the helper is server-only and available in Route Handlers. The middleware reference shows an API matcher pattern close to the one in \`packages/web/src/middleware.ts\`. These sources support using a real route request for the contract.

Run this check alongside the [React and Next.js test guide](/blog/react-nextjs-testing-complete-guide) practices. Keep retries low because repeated auth requests can hide intermittent context setup.

Clerk auth request context tests should retain response status, safe body fields, request path, middleware-enabled flag, and server branch names. That evidence separates a session fixture issue from a matcher or import regression.

## Step-by-Step Clerk middleware context error Procedure

A Clerk middleware context error procedure needs both a managed request and an unmanaged control. The goal is to show where identity becomes available and how the helper contains failure when context is absent. Use the same server build and environment for both HTTP cases.

1. Create route requests that do and do not pass through the configured middleware.
2. Invoke \`getAuthUser\` from the route boundary rather than as an isolated utility only.
3. Assert Clerk identity, local lookup, recovery behavior, and context-specific failures.
4. Run the protected-route browser check with the same middleware matcher configuration.

Begin with the paired signed-in and signed-out POST requests. Confirm the API matcher includes their path and auth bypass is disabled. Keep the request body intentionally invalid so neither case publishes data.

Then test the helper's local-user branches with controlled imports. Mocking \`auth\` is acceptable here because middleware integration was already proved elsewhere. The following unit check protects the existing-row fast path.

\`\`\`typescript
import { beforeEach, expect, it, vi } from 'vitest';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAuthUser } from '@/lib/api-auth';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it('returns the local row for the request user', async () => {
  vi.mocked(auth).mockResolvedValue({ userId: 'clerk_test_1' } as never);
  arrangeUserSelect([{ id: 'db-user-1', clerkId: 'clerk_test_1' }]);

  await expect(getAuthUser()).resolves.toMatchObject({
    id: 'db-user-1',
    clerkId: 'clerk_test_1',
  });
  expect(currentUser).not.toHaveBeenCalled();
  expect(userInsert).not.toHaveBeenCalled();
});
\`\`\`

The arrange functions represent the project's Drizzle test double. They must assert that the select predicate uses the Clerk ID and that no insert runs. This unit example verifies helper branching, not shared request context.

Add an empty-select case where \`currentUser\` returns a fixed profile and the insert returns one row. Then make \`currentUser\` return null and make the insert return no rows in separate cases. Each should produce the current null result without an escaped error.

Finally, run a browser request to a selected protected page and one API route in the same clean server build. The protected page checks \`auth.protect()\`, while the API request checks context availability for route-owned auth. They are related but not identical, so keep both path names in the failed report.

Use the [blog index](/blog) to locate webhook recovery coverage. This procedure should not claim that request-time recovery proves the webhook path.

## Static import clerk auth: Assertions and Diagnostics

Static import clerk auth coverage begins with behavior, then adds a small source guard if past regressions involved dynamic loading. The authoritative evidence is the middleware-backed request. A text assertion alone cannot prove a session reaches the helper.

At the behavior level, assert that a signed-in request reaches validation, a signed-out request stops at authentication, and direct unmanaged invocation returns null rather than throwing. These three outcomes show context use, signed-out handling, and containment.

At the source level, a focused architecture test can read \`packages/web/src/lib/api-auth.ts\` and verify its top-level import from \`@clerk/nextjs/server\`. Such a guard is reasonable only when static import is an intentional compatibility rule documented by the repository.

Do not snapshot the whole file. Match the import statement and reject a dynamic \`import('@clerk/nextjs/server')\` in this helper. A broad snapshot would fail on logs or formatting that do not affect context.

Diagnostics should record whether \`QASKILLS_DISABLE_AUTH\` was set, whether the middleware matcher covered the path, and which route status appeared. Also record whether local select, \`currentUser\`, and insert seams ran, using counts instead of sensitive arguments.

Never print cookies, authorization headers, Clerk tokens, or full user profiles. A test user label and redacted Clerk ID suffix are enough. Security evidence should help triage without becoming credential data.

Clerk auth request context tests also need a server restart after changing middleware or static imports. Hot reload can retain module state and create misleading local results. CI should start one clean build for this integration case.

The [authentication guide](/blog/authentication-authorization-testing-guide) can cover role and permission decisions. Here, a clear report ends at identity, local user resolution, and route status.

## What Regressions and Boundaries Prevent False Confidence?

Mocking \`auth()\` to return a user ID bypasses the middleware request-context contract. Keep those mocks for local database branches, but require one test that enters through the real matcher. Label that gate so future test cleanup cannot remove it unnoticed.

A browser page check alone is also insufficient. Server Components and Route Handlers may use different code paths. Exercise the exact API route that calls \`getAuthUser\`, or a test-only route wired to that helper.

The middleware's protected-route list is not the same as its matcher. All API paths can run through Clerk middleware even when only selected paths call \`auth.protect()\`. Tests should assert both context setup and route-owned authorization where appropriate.

The auth-disable flag is a useful local test seam, but it invalidates this contract. Fail fast when \`QASKILLS_DISABLE_AUTH=1\` appears in the integration environment. Do not mark the auth test skipped and still report the suite green.

Request-time local-user recovery does not prove Clerk webhook behavior. It only shows that \`getAuthUser\` can attempt a missing-row insert with the active profile. Keep webhook idempotency and event validation in their own tests.

An insert conflict currently may return no row, leading the helper to null. Do not claim every concurrent recovery request succeeds until the helper reselects after conflict. A targeted fixture can preserve this boundary.

Clerk async local storage should not become a test assertion about a private storage object. Assert user-visible route behavior and safe call counts. Internal context details can change while the supported server helper contract remains valid.

After middleware matcher, Clerk SDK, import, auth helper, or route changes, rerun signed-in, signed-out, direct-call, existing-user, and recovery cases. The [getting started page](/getting-started) can support a final manual check.

## Frequently Asked Questions

### How do you test Clerk identity inside a route handler?

Start a Next.js test server with normal Clerk middleware and a test session. Send a request to a route that calls \`getAuthUser\`, then assert it reaches the expected post-auth branch. Pair it with the same signed-out request so a global identity mock cannot create a false positive.

### Why is a clerk async local storage mock insufficient?

A mock that returns a user ID skips the request context created by middleware. It can verify local database branching, but not context sharing. Keep one middleware-backed HTTP test, then use fast mocks for existing-user, recovery, missing-profile, and insert-conflict cases after that integration contract is covered.

### What should an auth helper request context test record?

Record the request path, middleware-enabled state, final status, safe auth branch, local select count, recovery call count, and insert count. Do not store cookies or tokens. These facts distinguish matcher failures, signed-out state, missing local rows, and recovery errors without exposing credentials.

### How can nextjs clerk route handler auth avoid test writes?

Use a route that authenticates before validating its body, then send an invalid payload. In QASkills, a signed-in skills POST can reach status 400 after authentication, while the signed-out control returns 401. Both stop before the skill insert when fixtures and route order remain unchanged.

### What does a clerk middleware context error prove?

An unmanaged helper call that returns null proves the helper contains a Clerk context error. It does not prove middleware works. The positive proof is a matched, signed-in HTTP request where the same helper reads identity and reaches the expected local-user or validation branch.

### Why preserve static import clerk auth behavior?

The repository documents the static server import as part of sharing Clerk's request context. Preserve it with a real route test and, if needed, a narrow source guard. Do not rely on source text alone, because an import can look correct while matcher or environment setup still fails.

## Conclusion

Clerk auth request context tests should pair one real middleware-backed request with focused unit checks for local lookup and recovery. The integration gate proves context sharing, while mocks cover branches cheaply. Keep auth bypass disabled, avoid credential logs, and do not confuse a direct helper fallback with middleware success.

[Open how-to-publish](/how-to-publish), run the protected publishing flow, and retain one middleware-backed auth context test in the post-flow. Then inspect [QA skills](/skills) for auth testing patterns that can extend the suite without replacing this request-bound proof.`,
};
