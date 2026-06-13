import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright APIRequestContext + storageState Complete Guide',
  description:
    'Master Playwright APIRequestContext with storageState: request fixture, request.newContext, reuse auth across UI+API tests, token refresh, dependent projects in 2026.',
  date: '2026-06-07',
  category: 'Reference',
  content: `
# Playwright APIRequestContext + storageState Complete Guide

\`APIRequestContext\` is Playwright's HTTP client for making API requests directly without a browser. Combined with \`storageState\`, it solves the single most common authentication pain point in test automation: how do you set up an authenticated session once and reuse it across hundreds of UI tests and API tests without re-logging-in every time? The answer in 2026 is: log in via UI or API once, save the resulting cookies and tokens to a JSON file with \`storageState\`, then load that file into every subsequent browser context and request context. The same auth state powers both UI tests (logged-in pages) and API tests (authenticated fetch calls).

This guide is the complete reference for \`APIRequestContext\` and \`storageState\` in 2026. We cover the \`request\` fixture, \`request.newContext\`, the relationship between \`request\` and \`browser.newContext\`, the project dependency pattern for running an auth setup once before every test, token refresh strategies, sharing storage state between UI and API tests, and the patterns for testing webhooks and background jobs. Every example is runnable Playwright TypeScript.

For browser context fundamentals, see [Playwright BrowserContext + Incognito Sessions](/blog/playwright-browser-contexts-incognito-guide). For API testing primer, see [Playwright API Testing](/blog/playwright-api-testing-context-request-guide). The [playwright-e2e skill](/skills/playwright-e2e) configures these patterns for AI-generated tests.

## What is APIRequestContext

\`APIRequestContext\` is a Playwright object that makes HTTP requests directly. It is the equivalent of \`fetch\` or \`axios\`, but it integrates with Playwright's authentication state, runs inside the test runtime, and shares cookies with browser contexts.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('hit the API directly', async ({ request }) => {
  const response = await request.get('/api/users/me');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.email).toBe('admin@example.com');
});
\`\`\`

The \`request\` fixture is the default \`APIRequestContext\` for the test. It inherits config from \`playwright.config.ts\`:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'https://api.example.com',
    extraHTTPHeaders: { 'Accept': 'application/json' },
    storageState: 'auth/admin.json',
  },
});
\`\`\`

With this config, every \`request.get('/users/me')\` call resolves to \`https://api.example.com/users/me\`, sends the configured headers, and uses the auth cookies from \`auth/admin.json\`.

## Creating a fresh APIRequestContext

For tests that need authentication different from the default, create a new context:

\`\`\`typescript
import { test, expect, request } from '@playwright/test';

test('different auth via newContext', async () => {
  const ctx = await request.newContext({
    baseURL: 'https://api.example.com',
    storageState: 'auth/manager.json',
  });
  const response = await ctx.get('/dashboard/stats');
  expect(response.status()).toBe(200);
  await ctx.dispose();
});
\`\`\`

\`request.newContext\` accepts the same auth-related options as \`browser.newContext\`: \`storageState\`, \`extraHTTPHeaders\`, \`httpCredentials\`, \`proxy\`, \`ignoreHTTPSErrors\`, etc.

## storageState: the auth file format

\`storageState\` is a JSON file that captures:

| Field | Contents |
|---|---|
| \`cookies\` | Array of cookies (name, value, domain, path, expires, etc.) |
| \`origins\` | Array of \`{ origin, localStorage: [...] }\` for each origin |

Example:

\`\`\`json
{
  "cookies": [
    {
      "name": "session",
      "value": "abc123",
      "domain": "app.example.com",
      "path": "/",
      "expires": -1,
      "httpOnly": true,
      "secure": true,
      "sameSite": "Lax"
    }
  ],
  "origins": [
    {
      "origin": "https://app.example.com",
      "localStorage": [
        { "name": "auth_token", "value": "eyJhbGciOi..." }
      ]
    }
  ]
}
\`\`\`

Playwright reads this format and applies the cookies + localStorage to the new context. Both \`browser.newContext({ storageState: ... })\` and \`request.newContext({ storageState: ... })\` use the same file format. This is what enables UI and API tests to share auth.

## Capturing storageState via UI login

The canonical setup pattern: log in via the UI once, save the state, reuse forever.

\`\`\`typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

const adminFile = 'auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('admin-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');

  // Capture the resulting cookies + localStorage
  await page.context().storageState({ path: adminFile });
});
\`\`\`

In \`playwright.config.ts\`, declare this as a setup project that other projects depend on:

\`\`\`typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: { storageState: 'auth/admin.json' },
    },
    {
      name: 'api',
      testMatch: /api\\/.*\\.spec\\.ts/,
      dependencies: ['setup'],
      use: { storageState: 'auth/admin.json' },
    },
  ],
});
\`\`\`

Now every test in \`chromium\` and \`api\` projects starts already logged in. The setup project runs once before either dependent project, populates \`auth/admin.json\`, and the dependent projects load it.

## Capturing storageState via API login

UI login is slow. For most apps, an API login is 10x faster. Use \`request.post\` to log in directly:

\`\`\`typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

const adminFile = 'auth/admin.json';

setup('authenticate as admin via API', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: { email: 'admin@example.com', password: 'admin-password' },
  });
  if (!response.ok()) throw new Error('Login failed');

  // The request context now has the auth cookies set
  await request.storageState({ path: adminFile });
});
\`\`\`

Both \`request.storageState\` and \`page.context().storageState\` produce the same file format. You can use either to capture state.

## Multiple user roles

For tests that need different roles, save separate files:

\`\`\`typescript
setup('admin auth', async ({ request }) => {
  await request.post('/api/auth/login', { data: { email: 'admin@x.com', password: 'pw' } });
  await request.storageState({ path: 'auth/admin.json' });
});

setup('manager auth', async ({ request }) => {
  await request.post('/api/auth/login', { data: { email: 'manager@x.com', password: 'pw' } });
  await request.storageState({ path: 'auth/manager.json' });
});

setup('viewer auth', async ({ request }) => {
  await request.post('/api/auth/login', { data: { email: 'viewer@x.com', password: 'pw' } });
  await request.storageState({ path: 'auth/viewer.json' });
});
\`\`\`

In \`playwright.config.ts\`, define a project per role:

\`\`\`typescript
projects: [
  { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
  {
    name: 'admin-tests',
    testMatch: /admin\\/.*\\.spec\\.ts/,
    dependencies: ['setup'],
    use: { storageState: 'auth/admin.json' },
  },
  {
    name: 'manager-tests',
    testMatch: /manager\\/.*\\.spec\\.ts/,
    dependencies: ['setup'],
    use: { storageState: 'auth/manager.json' },
  },
  {
    name: 'viewer-tests',
    testMatch: /viewer\\/.*\\.spec\\.ts/,
    dependencies: ['setup'],
    use: { storageState: 'auth/viewer.json' },
  },
],
\`\`\`

## Sharing storageState between UI and API tests

This is the killer pattern. Login once, run both UI tests (which need the cookies in the browser) and API tests (which need the cookies in the request context) without re-authentication:

\`\`\`typescript
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /auth\\.setup\\.ts/ },
  {
    name: 'ui-tests',
    testDir: './tests/ui',
    dependencies: ['setup'],
    use: { ...devices['Desktop Chrome'], storageState: 'auth/admin.json' },
  },
  {
    name: 'api-tests',
    testDir: './tests/api',
    dependencies: ['setup'],
    use: { storageState: 'auth/admin.json' },
  },
],
\`\`\`

UI tests use \`page\` and have auth cookies in the browser. API tests use \`request\` and have auth in the request context. Same file, same auth, two different test surfaces.

## Token refresh during tests

If your auth token expires mid-test (rare with 30-day cookies, common with 15-minute JWT), refresh inside the test:

\`\`\`typescript
test('with token refresh', async ({ request }) => {
  // First call works
  let res = await request.get('/api/data');
  expect(res.status()).toBe(200);

  // Simulate token expiry by clearing cookies
  await request.storageState({ path: 'auth/temp.json' });

  // Refresh
  const refreshRes = await request.post('/api/auth/refresh');
  expect(refreshRes.ok()).toBeTruthy();

  // Next call uses the new token
  res = await request.get('/api/data');
  expect(res.status()).toBe(200);
});
\`\`\`

The request context automatically captures Set-Cookie headers from the refresh response.

## Bearer tokens vs cookies

Some APIs use Authorization: Bearer headers instead of cookies. For these, set \`extraHTTPHeaders\`:

\`\`\`typescript
// At config level
export default defineConfig({
  use: {
    extraHTTPHeaders: {
      Authorization: \`Bearer \${process.env.API_TOKEN}\`,
    },
  },
});

// Or per request context
const ctx = await request.newContext({
  extraHTTPHeaders: { Authorization: \`Bearer \${myToken}\` },
});
\`\`\`

For tokens that vary per test, capture in the setup and inject:

\`\`\`typescript
setup('capture bearer token', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: creds });
  const { token } = await res.json();
  await fs.writeFile('auth/token.txt', token);
});

// In tests
const token = await fs.readFile('auth/token.txt', 'utf-8');
const ctx = await request.newContext({
  extraHTTPHeaders: { Authorization: \`Bearer \${token}\` },
});
\`\`\`

## API testing patterns

### Asserting on response status and body

\`\`\`typescript
test('user profile endpoint', async ({ request }) => {
  const res = await request.get('/api/users/me');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/json');
  const body = await res.json();
  expect(body).toMatchObject({
    email: 'admin@example.com',
    role: 'admin',
  });
});
\`\`\`

### Posting JSON

\`\`\`typescript
test('create a resource', async ({ request }) => {
  const res = await request.post('/api/projects', {
    data: { name: 'New Project', visibility: 'private' },
  });
  expect(res.status()).toBe(201);
  const created = await res.json();
  expect(created.name).toBe('New Project');
});
\`\`\`

### Uploading multipart form data

\`\`\`typescript
import * as fs from 'fs';

test('upload a file', async ({ request }) => {
  const res = await request.post('/api/files', {
    multipart: {
      file: fs.createReadStream('fixtures/sample.pdf'),
      title: 'Sample Document',
    },
  });
  expect(res.status()).toBe(201);
});
\`\`\`

### Sending custom headers

\`\`\`typescript
test('with custom headers', async ({ request }) => {
  const res = await request.get('/api/data', {
    headers: { 'X-Tenant-Id': '123', 'X-Trace': 'test-001' },
  });
  expect(res.ok()).toBe(true);
});
\`\`\`

## APIRequestContext method matrix

| Method | HTTP verb | Use |
|---|---|---|
| \`request.get(url, opts)\` | GET | Read data |
| \`request.post(url, opts)\` | POST | Create resources |
| \`request.put(url, opts)\` | PUT | Replace resources |
| \`request.patch(url, opts)\` | PATCH | Partial update |
| \`request.delete(url, opts)\` | DELETE | Remove resources |
| \`request.head(url, opts)\` | HEAD | Headers only |
| \`request.fetch(url, opts)\` | Custom | Any method via \`method\` option |

\`fetch\` is the most general form:

\`\`\`typescript
const res = await request.fetch('/api/data', {
  method: 'COPY',
  headers: { 'X-Custom': '1' },
});
\`\`\`

## Combining UI and API in one test

A test that hits the API to set up state, then verifies via UI:

\`\`\`typescript
test('verify created project appears in UI', async ({ request, page }) => {
  // API: create the project
  const createRes = await request.post('/api/projects', {
    data: { name: \`Test Project \${Date.now()}\` },
  });
  expect(createRes.status()).toBe(201);
  const project = await createRes.json();

  // UI: verify it appears
  await page.goto('/projects');
  await expect(page.getByText(project.name)).toBeVisible();

  // Cleanup via API
  await request.delete(\`/api/projects/\${project.id}\`);
});
\`\`\`

This pattern is far faster than navigating through the UI to create the project. Use it for any test where setup or teardown can be done via API.

## storageState lifetime

The captured state is a snapshot. If your application rotates tokens or invalidates sessions, the state can go stale. Common refresh strategies:

| Strategy | When |
|---|---|
| Run setup once per CI build | Tokens valid >1 hour |
| Run setup per worker | Tokens valid 15-60 min |
| Run setup per test | Tokens expire fast |
| Refresh inline mid-test | Per-test refresh is acceptable |

The setup project pattern handles the first two. For per-test refresh, use \`test.beforeEach\` or rotate inline.

## Webhook testing pattern

\`APIRequestContext\` is also useful for testing webhook receivers - your application's endpoints that other systems POST to. Simulate the external system's call:

\`\`\`typescript
test('Stripe webhook updates order status', async ({ request }) => {
  const stripeEvent = {
    id: 'evt_test_1',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_test_1', metadata: { orderId: 'ORD-123' } } },
  };

  const res = await request.post('/webhooks/stripe', {
    headers: {
      'Stripe-Signature': computeStripeSignature(stripeEvent, process.env.STRIPE_WEBHOOK_SECRET!),
    },
    data: stripeEvent,
  });

  expect(res.status()).toBe(200);

  // Verify the side effect: order status should now be 'paid'
  const orderRes = await request.get('/api/orders/ORD-123');
  const order = await orderRes.json();
  expect(order.status).toBe('paid');
});
\`\`\`

This pattern verifies that your webhook handler reads the signature, updates the database, and returns the correct status. No browser needed.

## Testing background jobs

Background jobs that run on a queue can be tested by enqueueing through the API and then waiting for the resulting state via the API:

\`\`\`typescript
test('email digest job runs', async ({ request }) => {
  // Enqueue the job
  const enqueueRes = await request.post('/api/jobs/enqueue', {
    data: { type: 'send-digest', userId: 42 },
  });
  expect(enqueueRes.status()).toBe(202);
  const { jobId } = await enqueueRes.json();

  // Poll for completion
  await expect
    .poll(
      async () => {
        const res = await request.get(\`/api/jobs/\${jobId}\`);
        return (await res.json()).status;
      },
      { timeout: 30000, intervals: [500, 1000, 2000] }
    )
    .toBe('completed');

  // Verify the user received the email
  const userRes = await request.get(\`/api/users/42/emails\`);
  const emails = await userRes.json();
  expect(emails.some((e: any) => e.subject === 'Weekly digest')).toBe(true);
});
\`\`\`

\`expect.poll\` with custom intervals gives you exponential backoff polling, which keeps the test fast while still allowing for slow jobs.

## Frequently Asked Questions

### What is APIRequestContext in Playwright?

\`APIRequestContext\` is Playwright's HTTP client. The default \`request\` fixture is one. You can make GET/POST/PUT/PATCH/DELETE/HEAD requests, set headers, attach JSON or multipart bodies, and the context shares cookies with browser contexts. It is Playwright's built-in alternative to \`fetch\` or \`axios\` inside tests.

### How does storageState work with APIRequestContext?

Pass \`storageState: 'auth/admin.json'\` to \`request.newContext\` or set it in \`playwright.config.ts\`. The cookies and localStorage from that file are applied to the request context, so any request sent has the auth credentials. Same format as \`browser.newContext({ storageState })\`.

### Can I share auth between UI and API tests in Playwright?

Yes. Log in once (UI or API), call \`storageState({ path: 'auth.json' })\`. In \`playwright.config.ts\`, set \`use: { storageState: 'auth.json' }\` for both UI and API projects. Both projects start authenticated without re-logging-in.

### How do I refresh tokens during a Playwright test?

Make a POST request to your refresh endpoint within the test (\`await request.post('/api/auth/refresh')\`). The request context captures the new Set-Cookie or Authorization header automatically. Subsequent requests use the refreshed credentials.

### What is the project dependency pattern for auth setup?

Define a \`setup\` project in \`playwright.config.ts\` with \`testMatch: /.*\\.setup\\.ts/\`. Other projects declare \`dependencies: ['setup']\`. The setup runs once, populates the storageState file, and the dependent projects load it. This is the recommended Playwright authentication pattern.

### Can I use bearer tokens instead of cookies?

Yes. Set \`extraHTTPHeaders: { Authorization: \\\`Bearer \${token}\\\` }\` either at config level or per \`request.newContext\`. For tokens captured during setup, write to a file in setup and read in tests. \`storageState\` only handles cookies and localStorage, not authorization headers.

### How do I dispose of an APIRequestContext I created manually?

Call \`await ctx.dispose()\`. The test fixture \`request\` is disposed automatically. Manual contexts created with \`request.newContext()\` need explicit disposal, usually in an \`afterEach\` block or via \`await using\` (Node 22+).

### Does APIRequestContext respect Playwright's baseURL?

Yes. Set \`baseURL\` in \`use\` in \`playwright.config.ts\` and \`request.get('/users')\` resolves to \`<baseURL>/users\`. Per-context baseURL via \`request.newContext({ baseURL })\` overrides the global setting.

## Combining APIRequestContext with route mocking

You can mock specific endpoints while letting others through. Useful when most of your test infrastructure depends on the real backend but a few endpoints need stubbing:

\`\`\`typescript
test('mixed mock + real', async ({ request }) => {
  // Setup: capture real data via API
  const realUsers = await request.get('/api/users').then((r) => r.json());
  expect(realUsers).toHaveLength(20);

  // For UI test, mock just the search endpoint
  const ctx = await request.newContext();
  // (you would use ctx.routeFromHAR for replay, or page.route in UI tests)
});
\`\`\`

The boundary between API tests (which usually hit the real backend) and UI tests (which often mock the network) is one of the design decisions to make explicit in your test architecture.

## storageState format compatibility

The storageState JSON format is stable across Playwright versions. A file produced by Playwright 1.40 is loadable by Playwright 1.49 and vice versa. This stability matters because CI pipelines often cache the storageState file across runs to avoid re-authenticating.

For long-lived test environments, you can manually edit a storageState file to add custom cookies (feature flags, A/B test assignments) without re-running setup:

\`\`\`json
{
  "cookies": [
    { "name": "session", "value": "...", "domain": "...", "path": "/", "expires": -1 },
    { "name": "feature_flag_x", "value": "on", "domain": "...", "path": "/", "expires": -1 }
  ],
  "origins": []
}
\`\`\`

The next test that loads the file gets both the session and the feature flag.

## Headers shared between UI and API contexts

When using the same \`storageState\` for both UI tests and API tests, cookie-based auth works seamlessly. For header-based auth, you may need to set headers separately for each context:

\`\`\`typescript
// In playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'ui',
      use: {
        storageState: 'auth/admin.json',
        extraHTTPHeaders: { 'X-Test-Run-Id': process.env.RUN_ID ?? 'local' },
      },
    },
    {
      name: 'api',
      use: {
        storageState: 'auth/admin.json',
        extraHTTPHeaders: {
          'X-Test-Run-Id': process.env.RUN_ID ?? 'local',
          'Authorization': \`Bearer \${process.env.API_TOKEN}\`,
        },
      },
    },
  ],
});
\`\`\`

The UI project gets cookie auth (from storageState) plus a test-id header. The API project gets the same plus a bearer token.

## Performance: API setup vs UI setup

Login via API is significantly faster than UI for most apps:

| Auth method | Typical duration |
|---|---|
| UI login | 2-5 seconds |
| API login | 50-200 ms |
| Skipping login (storageState reuse) | 0 ms |

For a CI run with 100 tests, the difference is hundreds of seconds saved by using API login + storageState reuse over per-test UI login. This is the single biggest test-runtime optimization most teams can make.

## Common pitfalls

### "My storageState file does not have my cookies"

The most common cause is calling \`storageState()\` before the auth response has set its cookies. Wait for the post-login navigation to complete:

\`\`\`typescript
// Bad: capture too early
await page.getByRole('button', { name: 'Sign in' }).click();
await page.context().storageState({ path: 'auth.json' });

// Good: wait for the navigation that confirms login
await page.getByRole('button', { name: 'Sign in' }).click();
await page.waitForURL('/dashboard');
await page.context().storageState({ path: 'auth.json' });
\`\`\`

### "Tests run but storageState is not loaded"

Check that the storageState path in \`use\` is correct relative to the test runner's working directory (usually the package root). Absolute paths work but are not portable; relative paths from the package root are preferred.

### "Token expires during the test run"

Either shorten the test run, refresh the token inline in setup, or run the setup project before every test (slow). Most teams settle on "run setup per worker" via the project dependency pattern with one-hour-valid tokens.

### "I cannot tell which auth state a test uses"

Add a debug-friendly assertion at the start of each test:

\`\`\`typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/api/me');
  const meText = await page.textContent('body');
  console.log('Authenticated as:', meText);
});
\`\`\`

Or add a custom fixture that asserts on the expected role.

## Conclusion

\`APIRequestContext\` and \`storageState\` together solve the authentication problem in Playwright in 2026. Log in once (UI or API), save state to a JSON file via \`storageState({ path: 'auth.json' })\`, then load that file into every UI test and API test that needs auth. The project dependency pattern ensures setup runs once and dependent projects inherit the state without re-authentication.

For browser context fundamentals, see [Playwright BrowserContext + Incognito Sessions](/blog/playwright-browser-contexts-incognito-guide). For network mocking that pairs with API tests, see [Playwright route.fulfill Network Mocking](/blog/playwright-route-fulfill-network-mocking-reference). For broader testing patterns, see [Playwright Best Practices 2026](/blog/playwright-best-practices-2026).

Install the [playwright-e2e skill](/skills/playwright-e2e) so your AI agent (Claude Code, Cursor, Aider) emits the storageState pattern by default. Compare API testing approaches in [Cypress vs Playwright 2026](/compare/cypress-vs-playwright-2026).
`,
};
