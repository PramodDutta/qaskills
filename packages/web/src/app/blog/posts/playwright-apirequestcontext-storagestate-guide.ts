import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright APIRequestContext + storageState Guide 2026',
  description:
    'Reuse browser auth in Playwright API tests with APIRequestContext and storageState. Learn the request fixture, shared cookies, and token reuse patterns.',
  date: '2026-06-02',
  category: 'Reference',
  content: `
# Playwright APIRequestContext + storageState: The Complete Guide

Most teams treat UI tests and API tests as two separate worlds. The UI tests log in through a browser, and the API tests authenticate by hammering a token endpoint on every single request. This duplication is wasteful and, worse, fragile -- when the login flow changes, you have to fix it in two places, and your API tests no longer exercise the same session your real users get. Playwright offers a far better model: authenticate once, capture the session as **storageState**, and replay that exact session in both browser contexts *and* API request contexts.

The key to this is \`APIRequestContext\`, Playwright's HTTP client. It is the same engine that powers the \`request\` fixture and \`page.request\`, and crucially it can be constructed with a \`storageState\` so it carries the cookies and origin storage that a real logged-in browser would. That means you can sign in through the UI one time, save the resulting cookies to a file, and then fire authenticated API calls without ever touching the login endpoint again. Your API tests run in milliseconds and use the genuine session a user would have.

This guide is a complete, runnable reference to combining \`APIRequestContext\` and \`storageState\` in 2026. You will learn the difference between the \`request\` fixture and a manually created context, how to capture and reuse \`storageState\` across UI and API layers, how to share one authenticated context across an entire test file, how to handle token-based APIs that use headers instead of cookies, and how to structure a project so authentication runs exactly once. Every example is TypeScript you can drop into a Playwright project today.

---

## Key Takeaways

- **\`APIRequestContext\`** is Playwright's HTTP client; it sends real requests with full cookie and header control, independent of any browser page.
- **\`storageState\`** captures cookies and origin local/session storage, and can be loaded into both browser contexts and API request contexts.
- **The \`request\` fixture** gives you a ready-made \`APIRequestContext\` per test, while \`playwright.request.newContext()\` lets you create longer-lived shared contexts.
- **Authenticate once** in a setup project, save \`storageState\` to a file, and every test -- UI or API -- reuses it without re-logging in.
- **Token APIs** that use \`Authorization\` headers work too: capture the token during login and inject it via \`extraHTTPHeaders\`.

---

## APIRequestContext Versus the request Fixture

Playwright exposes its HTTP client in three closely related forms, and understanding the distinction prevents a lot of confusion. The \`request\` fixture is an \`APIRequestContext\` scoped to a single test -- you get a fresh one per test and it is torn down automatically. \`page.request\` is an \`APIRequestContext\` bound to a page's browser context, so it automatically shares that page's cookies. And \`playwright.request.newContext()\` lets you construct an \`APIRequestContext\` by hand with whatever options you want, including a \`storageState\`, and control its lifetime yourself.

For most pure API tests, the \`request\` fixture is all you need:

\`\`\`typescript
// tests/api/health.spec.ts
import { test, expect } from '@playwright/test';

test('health endpoint returns ok', async ({ request }) => {
  // The 'request' fixture is an APIRequestContext, fresh per test.
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe('ok');
});
\`\`\`

When you need a context that outlives a single test, or one preloaded with a saved session, you construct it explicitly. The \`playwright\` fixture gives you access to the request factory:

\`\`\`typescript
// tests/api/shared-context.spec.ts
import { test, expect, type APIRequestContext } from '@playwright/test';

let apiContext: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  // Build a context that all tests in this file will reuse.
  apiContext = await playwright.request.newContext({
    baseURL: 'https://api.example.com',
    extraHTTPHeaders: { Accept: 'application/json' },
  });
});

test.afterAll(async () => {
  await apiContext.dispose();
});

test('lists public products', async () => {
  const res = await apiContext.get('/products');
  expect(res.status()).toBe(200);
});
\`\`\`

| Form | Lifetime | Shares browser cookies? | Best for |
|---|---|---|---|
| \`request\` fixture | Per test | No (unless storageState set) | Standalone API tests |
| \`page.request\` | Tied to page context | Yes | Mixed UI + API in one test |
| \`playwright.request.newContext()\` | You control | Only if you pass storageState | Shared/auth-reuse contexts |

---

## What storageState Actually Captures

\`storageState\` is Playwright's serialization of everything that makes a browser "logged in" without a server session lookup. Concretely it captures two things: all cookies for all domains the context has seen, and the \`localStorage\` and \`sessionStorage\` entries per origin. When you save it you get a JSON object (or file) you can hand to any new context to instantly restore that authenticated state.

The reason this matters for API testing is that most web apps authenticate via cookies. When a user logs in, the server sets a session cookie or a signed JWT cookie, and the browser sends it on every subsequent request. If you capture that cookie in \`storageState\` and load it into an \`APIRequestContext\`, your API calls carry the same cookie and the server treats them as authenticated -- no login round-trip required.

\`\`\`typescript
// Save storageState from any context (page or API)
const state = await context.storageState();
// state = { cookies: [...], origins: [{ origin, localStorage: [...] }] }

// Or save directly to a file for reuse across runs
await context.storageState({ path: 'playwright/.auth/user.json' });
\`\`\`

---

## Capturing Auth Once in a Setup Project

The cleanest architecture authenticates exactly once before any test runs, saves \`storageState\` to a file, and points every other project at that file. Playwright's project dependencies make this a first-class pattern. You define a \`setup\` project that performs the login and writes the auth file, then declare your real test projects as depending on it.

First, the setup spec that logs in through the UI and saves the session:

\`\`\`typescript
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('qa@example.com');
  await page.getByLabel('Password').fill('s3cr3t-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Wait for a signal that login succeeded before saving state.
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Persist cookies + origin storage to disk for all later tests.
  await page.context().storageState({ path: authFile });
});
\`\`\`

Then wire it up in the config so every project reuses the saved state:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: { baseURL: 'https://app.example.com' },
  projects: [
    // 1. Run login once and write the auth file.
    { name: 'setup', testMatch: /auth\\.setup\\.ts/ },

    // 2. UI tests reuse the saved browser session.
    {
      name: 'ui',
      testMatch: /.*\\.ui\\.spec\\.ts/,
      use: { storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },

    // 3. API tests reuse the SAME session for authenticated calls.
    {
      name: 'api',
      testMatch: /.*\\.api\\.spec\\.ts/,
      use: { storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
\`\`\`

Now any test in the \`api\` project automatically gets a \`request\` fixture whose context was built with that \`storageState\`, so its calls are authenticated. You logged in once through the browser, and your API tests inherit the session for free.

---

## Reusing Browser Auth in API Tests

With the setup project in place, an authenticated API test needs no login code at all. The \`storageState\` declared on the project flows into the \`request\` fixture:

\`\`\`typescript
// tests/orders.api.spec.ts
import { test, expect } from '@playwright/test';

test('authenticated user can fetch their orders', async ({ request }) => {
  // No login here -- the project's storageState already authenticated us.
  const response = await request.get('/api/orders');
  expect(response.status()).toBe(200);

  const orders = await response.json();
  expect(Array.isArray(orders)).toBeTruthy();
});

test('authenticated user can create an order', async ({ request }) => {
  const response = await request.post('/api/orders', {
    data: { productId: 'sku-123', quantity: 2 },
  });
  expect(response.status()).toBe(201);
  const created = await response.json();
  expect(created.productId).toBe('sku-123');
});
\`\`\`

If you need to mix UI and API in the same test, \`page.request\` is even simpler because it automatically shares the page's cookies -- including any session established mid-test. This is invaluable for verifying that a UI action produced the right server-side state:

\`\`\`typescript
// tests/checkout.ui.spec.ts
import { test, expect } from '@playwright/test';

test('UI checkout creates a real order on the backend', async ({ page }) => {
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await expect(page.getByText('Order confirmed')).toBeVisible();

  // page.request shares the page's cookies, so this call is authenticated.
  const orders = await page.request.get('/api/orders');
  const list = await orders.json();
  expect(list.length).toBeGreaterThan(0);
});
\`\`\`

---

## Building an API-Only storageState

Sometimes you do not want to spin up a browser at all -- you want to authenticate purely over HTTP and save that session for fast API-only suites. You can do this by hitting the login endpoint with an \`APIRequestContext\`, then calling \`storageState()\` on that same context. The server's \`Set-Cookie\` response is captured exactly as a browser would store it.

\`\`\`typescript
// tests/api-auth.setup.ts
import { test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/api-user.json';

setup('authenticate via API', async ({ playwright }) => {
  const context = await playwright.request.newContext({
    baseURL: 'https://app.example.com',
  });

  // Log in over HTTP; the response Set-Cookie headers populate the context.
  const res = await context.post('/api/login', {
    data: { email: 'qa@example.com', password: 's3cr3t-password' },
  });
  if (!res.ok()) throw new Error(\`Login failed: \${res.status()}\`);

  // Save the cookie-backed session for reuse.
  await context.storageState({ path: authFile });
  await context.dispose();
});
\`\`\`

This API-only login is dramatically faster than driving a browser, so for suites that never need a real page it is the better choice. Point a project's \`storageState\` at \`api-user.json\` and your API tests authenticate without ever launching Chromium.

---

## Handling Token-Based APIs

Not every API uses cookies. Many modern APIs expect a bearer token in an \`Authorization\` header. \`storageState\` only carries cookies and origin storage, so a raw header token is not automatically replayed. The fix is straightforward: capture the token during login and inject it through \`extraHTTPHeaders\` when you build the context.

\`\`\`typescript
// tests/token-auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

setup('capture bearer token', async ({ playwright }) => {
  const context = await playwright.request.newContext({
    baseURL: 'https://api.example.com',
  });

  const res = await context.post('/auth/token', {
    data: { username: 'qa@example.com', password: 's3cr3t-password' },
  });
  expect(res.ok()).toBeTruthy();
  const { accessToken } = await res.json();

  // Persist the token for later contexts. (Do not commit this file.)
  writeFileSync('playwright/.auth/token.json', JSON.stringify({ accessToken }));
  await context.dispose();
});
\`\`\`

Then build authenticated contexts that send the token on every request:

\`\`\`typescript
// tests/profile.api.spec.ts
import { test, expect, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';

let api: APIRequestContext;

test.beforeAll(async ({ playwright }) => {
  const { accessToken } = JSON.parse(
    readFileSync('playwright/.auth/token.json', 'utf-8'),
  );
  api = await playwright.request.newContext({
    baseURL: 'https://api.example.com',
    // Inject the bearer token on every request from this context.
    extraHTTPHeaders: { Authorization: \`Bearer \${accessToken}\` },
  });
});

test.afterAll(async () => await api.dispose());

test('returns the authenticated user profile', async () => {
  const res = await api.get('/me');
  expect(res.status()).toBe(200);
  const me = await res.json();
  expect(me.email).toBe('qa@example.com');
});
\`\`\`

| Auth mechanism | Carried by storageState? | How to reuse |
|---|---|---|
| Session cookie | Yes | Load storageState into context |
| JWT in cookie | Yes | Load storageState into context |
| Bearer token header | No | Capture token, set extraHTTPHeaders |
| API key header | No | Set extraHTTPHeaders directly |

---

## Sharing One Context Across a File

When many tests in a file hit the same authenticated API, creating a fresh context per test is wasteful. A worker-scoped or file-scoped shared context amortizes the setup cost. Use \`beforeAll\`/\`afterAll\` to construct and dispose a single context, as shown earlier, or promote it to a worker fixture so it is shared across every test the worker runs.

\`\`\`typescript
// fixtures.ts -- a worker-scoped authenticated API context
import { test as base, type APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';

export const test = base.extend<{}, { authedApi: APIRequestContext }>({
  authedApi: [
    async ({ playwright }, use) => {
      const api = await playwright.request.newContext({
        baseURL: 'https://api.example.com',
        storageState: 'playwright/.auth/user.json',
      });
      await use(api);
      await api.dispose();
    },
    { scope: 'worker' }, // one context per worker, reused across tests
  ],
});

export { expect } from '@playwright/test';
\`\`\`

Worker scope means each parallel worker builds the context once and every test on that worker reuses it, which is the right balance between isolation and speed for read-heavy API suites.

---

## Refreshing Expired Sessions

Saved sessions eventually expire. If your \`storageState\` file is older than the token lifetime, every test will start failing with 401s. The robust pattern is to make the setup project responsible for freshness: have it check whether the saved state still works and re-authenticate only when needed. Because the setup project runs before every test session, regenerating the file there keeps downstream tests green.

\`\`\`typescript
// tests/auth.setup.ts -- regenerate only when the saved session is stale
import { test as setup, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

const authFile = 'playwright/.auth/user.json';

setup('ensure fresh auth', async ({ playwright }) => {
  if (existsSync(authFile)) {
    const probe = await playwright.request.newContext({
      baseURL: 'https://api.example.com',
      storageState: authFile,
    });
    const res = await probe.get('/api/me');
    await probe.dispose();
    if (res.ok()) return; // saved session still valid -- skip re-login
  }

  // Otherwise, log in and rewrite the file (UI or API login as appropriate).
  const ctx = await playwright.request.newContext({ baseURL: 'https://app.example.com' });
  const login = await ctx.post('/api/login', {
    data: { email: 'qa@example.com', password: 's3cr3t-password' },
  });
  expect(login.ok()).toBeTruthy();
  await ctx.storageState({ path: authFile });
  await ctx.dispose();
});
\`\`\`

---

## Setting Up Test Data via APIRequestContext

Beyond authentication, \`APIRequestContext\` shines as a test-data tool. Driving the UI to create the preconditions a test needs is slow and flaky; calling the API directly to seed data is fast and deterministic. A common pattern uses the API in \`beforeEach\` to create exactly the records a test needs, then cleans them up in \`afterEach\`. Because the context can carry the authenticated \`storageState\`, these setup calls run as the same user the test will act as.

\`\`\`typescript
// tests/order-detail.spec.ts -- seed data over the API, test through the UI
import { test, expect } from '@playwright/test';

let orderId: string;

test.beforeEach(async ({ request }) => {
  // Create the precondition directly via the API -- fast and reliable.
  const res = await request.post('/api/orders', {
    data: { productId: 'sku-42', quantity: 1 },
  });
  orderId = (await res.json()).id;
});

test.afterEach(async ({ request }) => {
  // Clean up so tests stay independent and idempotent.
  await request.delete(\`/api/orders/\${orderId}\`);
});

test('order detail page shows the seeded order', async ({ page }) => {
  await page.goto(\`/orders/\${orderId}\`);
  await expect(page.getByText('sku-42')).toBeVisible();
});
\`\`\`

This split -- set up state through the API, exercise behavior through the UI, verify through whichever layer is most direct -- keeps tests fast and focused. The authenticated \`request\` fixture makes it trivial, since the setup calls inherit the session from the project's \`storageState\`.

## Asserting on API Responses

\`APIRequestContext\` returns an \`APIResponse\` with a rich set of accessors: \`status()\`, \`ok()\`, \`headers()\`, \`json()\`, \`text()\`, and \`body()\`. Playwright's \`expect\` also has matchers tailored to API responses, so you can assert success status without manually reading the code. Combine status assertions with payload assertions for thorough coverage.

\`\`\`typescript
// tests/api-assertions.spec.ts
import { test, expect } from '@playwright/test';

test('create order returns 201 with a well-formed body', async ({ request }) => {
  const res = await request.post('/api/orders', {
    data: { productId: 'sku-7', quantity: 3 },
  });

  // Matcher for response success -- clearer than checking status() manually.
  await expect(res).toBeOK();

  const body = await res.json();
  expect(body).toMatchObject({ productId: 'sku-7', quantity: 3 });
  expect(res.headers()['content-type']).toContain('application/json');
});

test('unauthenticated request is rejected', async ({ playwright }) => {
  // A context with NO storageState should be denied.
  const anon = await playwright.request.newContext({ baseURL: 'https://api.example.com' });
  const res = await anon.get('/me');
  expect(res.status()).toBe(401);
  await anon.dispose();
});
\`\`\`

Notice the second test deliberately uses a context *without* \`storageState\` to assert that the endpoint rejects anonymous callers. Testing both the authenticated and unauthenticated paths from the same suite is a strong pattern, and \`storageState\` makes the distinction a one-line change.

| APIResponse accessor | Returns | Use for |
|---|---|---|
| \`status()\` | HTTP status number | Exact status assertions |
| \`ok()\` | Boolean (2xx) | Quick success checks |
| \`json()\` | Parsed JSON body | Payload assertions |
| \`headers()\` | Response headers | Content-type, caching checks |

## Combining storageState with Per-Test Overrides

A project-level \`storageState\` covers the common case, but some tests need a *different* user -- an admin, a read-only account, or an unauthenticated visitor. You can override the session per test by constructing a context with a different state file, or by using \`test.use({ storageState })\` to switch the state for a describe block. This lets one suite cover multiple roles without separate projects.

\`\`\`typescript
// tests/admin.spec.ts -- override the default user for an admin-only block
import { test, expect } from '@playwright/test';

test.describe('admin area', () => {
  // Every test in this block uses the admin session instead of the default.
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('admin can see the user management page', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
  });

  test('admin API can list all users', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    await expect(res).toBeOK();
  });
});
\`\`\`

Generate the \`admin.json\` state in your setup project exactly as you generate the regular user's, just with admin credentials. With multiple state files, your suite can fluidly switch roles -- regular user by default, admin or anonymous where a test demands it -- all reusing the same \`APIRequestContext\` and \`storageState\` machinery.

## Generating API Auth Skills with AI Agents

Wiring up setup projects, shared contexts, and token capture by hand is exactly the kind of boilerplate that AI coding agents excel at -- when they have the right patterns. A generic agent will often suggest re-logging in on every test, which defeats the entire purpose of \`storageState\`. A focused QA skill teaches the agent the correct architecture: one setup project, \`storageState\` reuse across UI and API, and \`extraHTTPHeaders\` for token APIs.

Browse the [Playwright API testing skills at qaskills.sh/skills](/skills) and install one so your agent scaffolds authenticated API tests correctly:

\`\`\`bash
# Install a Playwright API auth skill
npx @qaskills/cli add playwright-api-auth
\`\`\`

For broader API testing patterns, see our [API testing complete guide](/blog/api-testing-complete-guide), and for the end-to-end side of the same session, our [Playwright E2E complete guide](/blog/playwright-e2e-complete-guide).

---

## Frequently Asked Questions

### What is APIRequestContext in Playwright?

\`APIRequestContext\` is Playwright's built-in HTTP client for sending real network requests independent of any browser page. It backs the \`request\` fixture, \`page.request\`, and \`playwright.request.newContext()\`. It supports GET, POST, PUT, PATCH, DELETE, custom headers, multipart uploads, and cookie management, making it ideal for API tests, test data setup, and verifying server-side state after UI actions.

### How do I reuse browser login in Playwright API tests?

Authenticate once in a setup project, save the session with \`page.context().storageState({ path })\`, then declare \`storageState\` on your API test project pointing at that file. The \`request\` fixture in those tests is built with the saved cookies, so its calls are authenticated without any login code. This works because most web apps authenticate via cookies, which \`storageState\` captures faithfully.

### Does storageState work for token-based APIs?

Not directly. \`storageState\` only captures cookies and origin local/session storage, not raw \`Authorization\` headers. For bearer-token APIs, capture the token during login, save it, and inject it via \`extraHTTPHeaders: { Authorization: 'Bearer ...' }\` when you build the context with \`playwright.request.newContext()\`. Cookie-based JWTs, however, are carried automatically by \`storageState\`.

### What is the difference between the request fixture and page.request?

The \`request\` fixture is a standalone \`APIRequestContext\` scoped to one test, independent of any browser. \`page.request\` is an \`APIRequestContext\` bound to a specific page's browser context, so it automatically shares that page's cookies -- including sessions established during the test. Use the \`request\` fixture for pure API tests and \`page.request\` when verifying backend state immediately after a UI action.

### How do I authenticate without launching a browser?

Create an \`APIRequestContext\` with \`playwright.request.newContext()\`, POST to your login endpoint, and the server's \`Set-Cookie\` response populates the context. Then call \`storageState({ path })\` on that same context to save the cookie-backed session. This API-only login is far faster than driving Chromium and is ideal for suites that never need a real page.

### How should I handle expired storageState files?

Make the setup project responsible for freshness. Before tests run, probe a lightweight authenticated endpoint using the saved \`storageState\`; if it returns 200, keep the file, otherwise re-authenticate and rewrite it. Because the setup project runs before every session, this keeps downstream UI and API tests from failing with 401s due to a stale saved session.

### Should I commit the auth storageState file to git?

No. The \`storageState\` file and any saved token file contain live session credentials, so add \`playwright/.auth/\` to \`.gitignore\`. Regenerate the session in CI through the setup project using credentials supplied via environment variables or secrets, never by committing the file. Treat these files exactly like you would any other secret.

---

## Conclusion

Combining \`APIRequestContext\` with \`storageState\` lets you stop duplicating authentication between your UI and API tests. Log in once in a setup project, save the session, and every test -- whether it drives a browser or fires raw HTTP -- inherits the same authenticated state. Cookie-based sessions flow through \`storageState\` automatically; token APIs need only a captured token injected via \`extraHTTPHeaders\`. Share contexts at the file or worker scope to keep suites fast, and let the setup project guarantee the saved session stays fresh.

This architecture gives you API tests that are fast, faithful to real sessions, and resilient to login-flow changes. To have your AI coding agent generate authenticated API tests using these exact patterns, install a Playwright API skill from [qaskills.sh/skills](/skills) and read our [API testing complete guide](/blog/api-testing-complete-guide) for the broader testing strategy.
`,
};
