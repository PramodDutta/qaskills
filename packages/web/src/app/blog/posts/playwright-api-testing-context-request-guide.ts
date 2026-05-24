import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright API Testing with APIRequestContext: Complete Guide',
  description: 'Test REST and GraphQL APIs in Playwright with APIRequestContext. Auth, JSON bodies, fixtures, parallel runs, schema validation, and contract testing patterns.',
  date: '2026-05-08',
  category: 'Guide',
  content: `
# Playwright API Testing with APIRequestContext: Complete Guide

Playwright's \`APIRequestContext\` is the often-overlooked sibling of the browser API. It lets you exercise HTTP endpoints directly without launching a browser, sharing the same fixtures, configuration, and reporters as your end-to-end tests. The result: a single Playwright suite that covers backend, integration, and UI in one runner, with consistent locators of the API kind (URL patterns) and the UI kind (accessible roles).

This guide is a practical playbook for API testing with Playwright in 2026. We will cover auth flows, JSON bodies, GraphQL operations, schema validation, parallelism, and the cross-mode tests that exercise both API and UI in the same spec.

For UI-side fundamentals, read the [Playwright E2E Complete Guide](/blog/playwright-e2e-complete-guide). For network mocking inside browser tests, see the [Playwright Network Mocking Route Handler Guide](/blog/playwright-network-mocking-route-handler-guide). Install the [playwright-e2e skill](/skills/playwright-e2e) to get these patterns into AI-generated tests.

## The request fixture

Every test receives a \`request\` fixture: an APIRequestContext tied to the test's browser context cookies and baseURL.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('GET /api/users returns 200', async ({ request }) => {
  const response = await request.get('/api/users');
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body.users)).toBe(true);
});
\`\`\`

The default \`baseURL\` from \`playwright.config.ts\` applies, so relative paths just work.

## HTTP method reference

| Method | Purpose |
|---|---|
| \`request.get(url, opts?)\` | GET |
| \`request.post(url, opts?)\` | POST |
| \`request.put(url, opts?)\` | PUT |
| \`request.patch(url, opts?)\` | PATCH |
| \`request.delete(url, opts?)\` | DELETE |
| \`request.head(url, opts?)\` | HEAD |
| \`request.fetch(url, opts?)\` | Any method via opts.method |

Every method returns a \`Promise<APIResponse>\`.

## Request options

\`\`\`typescript
const response = await request.post('/api/users', {
  data: { email: 'asha@example.com', name: 'Asha Patel' },
  headers: { 'x-api-key': process.env.API_KEY ?? '' },
  params: { include: 'profile' },
  timeout: 10_000,
  failOnStatusCode: false,
});
\`\`\`

| Option | Purpose |
|---|---|
| \`data\` | Object serialized as JSON |
| \`form\` | Object serialized as application/x-www-form-urlencoded |
| \`multipart\` | Object serialized as multipart/form-data |
| \`headers\` | Request headers |
| \`params\` | URL query parameters |
| \`timeout\` | Per-request timeout |
| \`maxRedirects\` | Limit on redirects (default 20) |
| \`failOnStatusCode\` | Throw on 4xx/5xx (default false) |
| \`ignoreHTTPSErrors\` | Bypass TLS validation |

## Response API

\`\`\`typescript
expect(response.status()).toBe(201);
expect(response.statusText()).toBe('Created');
expect(response.url()).toBe('https://api.qaskills.sh/users');
expect(response.ok()).toBeTruthy();
expect(response.headers()['content-type']).toContain('application/json');

const body = await response.json();
const text = await response.text();
const buffer = await response.body();
\`\`\`

## Auth: bearer tokens

For most APIs, set the Authorization header.

\`\`\`typescript
test('authenticated GET succeeds', async ({ request }) => {
  const response = await request.get('/api/me', {
    headers: { Authorization: \`Bearer \${process.env.API_TOKEN}\` },
  });
  expect(response.ok()).toBeTruthy();
});
\`\`\`

To avoid repeating headers, create a per-test context with default headers:

\`\`\`typescript
import { request, expect } from '@playwright/test';

test('lists invoices', async () => {
  const api = await request.newContext({
    baseURL: 'https://api.qaskills.sh',
    extraHTTPHeaders: { Authorization: \`Bearer \${process.env.API_TOKEN}\` },
  });
  const response = await api.get('/invoices');
  expect(response.ok()).toBeTruthy();
  await api.dispose();
});
\`\`\`

Always \`dispose\` standalone contexts to release the underlying HTTP agent.

## Storage state for browser + API tests

Both \`page\` and \`request\` share \`storageState\`. A token written by API login is available to subsequent UI tests.

\`\`\`typescript
test('login via API, navigate via UI', async ({ request, page, context }) => {
  const response = await request.post('/api/auth/login', {
    data: { email: 'asha@example.com', password: process.env.TEST_USER_PASSWORD },
  });
  const { token } = await response.json();
  await context.addCookies([{
    name: 'access_token',
    value: token,
    url: 'https://qaskills.sh',
  }]);
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});
\`\`\`

For shared auth, use a setup project that writes storage state once.

## GraphQL operations

\`\`\`typescript
test('GraphQL: fetch users', async ({ request }) => {
  const response = await request.post('/graphql', {
    data: {
      query: \`query { users { id email } }\`,
      operationName: undefined,
    },
  });
  const body = await response.json();
  expect(body.data.users.length).toBeGreaterThan(0);
});

test('GraphQL: createUser mutation', async ({ request }) => {
  const response = await request.post('/graphql', {
    data: {
      query: \`mutation CreateUser($input: NewUser!) { createUser(input: $input) { id } }\`,
      variables: { input: { email: 'new@example.com', name: 'New User' } },
    },
  });
  const body = await response.json();
  expect(body.errors).toBeUndefined();
  expect(body.data.createUser.id).toMatch(/^[a-f0-9]+$/);
});
\`\`\`

For more complex GraphQL workflows, generate strongly-typed clients with codegen.

## Schema validation

Validate response shapes with Zod or another schema library.

\`\`\`typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'member']),
});

test('user response matches schema', async ({ request }) => {
  const response = await request.get('/api/users/1');
  const user = UserSchema.parse(await response.json());
  expect(user.id).toBe(1);
});
\`\`\`

Schema parsing throws on mismatch, which surfaces as a clear test failure with the offending field path.

## Contract testing

Pair Playwright with Pact or a custom OpenAPI runner to verify provider contracts.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { OpenAPISchemaValidator } from 'openapi-schema-validator';

const schema = JSON.parse(readFileSync('./openapi.json', 'utf8'));

test('list endpoint conforms to OpenAPI', async ({ request }) => {
  const response = await request.get('/api/users');
  const body = await response.json();
  const validator = new OpenAPISchemaValidator({ version: 3 });
  const errors = validator.validate(schema, body);
  expect(errors).toEqual({ errors: [] });
});
\`\`\`

## File uploads

\`\`\`typescript
import { createReadStream } from 'fs';

test('uploads a file', async ({ request }) => {
  const response = await request.post('/api/uploads', {
    multipart: {
      file: {
        name: 'report.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF-1.4 ...'),
      },
      meta: JSON.stringify({ category: 'invoices' }),
    },
  });
  expect(response.status()).toBe(201);
});
\`\`\`

The \`multipart\` option accepts strings, Buffers, or file streams.

## Parallel API tests

API tests have no browser overhead, so they parallelize aggressively. Set \`fullyParallel: true\` and crank workers.

\`\`\`typescript
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 8 : undefined,
  projects: [
    { name: 'api', testMatch: /api\\/.*\\.spec\\.ts/ },
    { name: 'e2e', testMatch: /e2e\\/.*\\.spec\\.ts/ },
  ],
});
\`\`\`

Splitting into projects keeps API failures from masking UI failures and vice versa.

## Error path testing

Exercise 4xx and 5xx paths explicitly.

\`\`\`typescript
test.describe('Error cases', () => {
  test('returns 401 without token', async ({ request }) => {
    const response = await request.get('/api/me');
    expect(response.status()).toBe(401);
  });

  test('returns 422 with invalid input', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: { email: 'not-an-email' },
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.errors).toContainEqual({ field: 'email', message: expect.any(String) });
  });

  test('returns 404 for missing resource', async ({ request }) => {
    const response = await request.get('/api/users/999999');
    expect(response.status()).toBe(404);
  });
});
\`\`\`

## Rate limit testing

\`\`\`typescript
test('rate limits after N requests', async ({ request }) => {
  for (let i = 0; i < 100; i++) {
    const response = await request.get('/api/search?q=test');
    if (response.status() === 429) {
      expect(response.headers()['retry-after']).toBeDefined();
      return;
    }
  }
  throw new Error('Did not hit rate limit after 100 requests');
});
\`\`\`

## Common pitfalls

**Pitfall 1: Forgetting \`failOnStatusCode\`.** By default Playwright does not throw on 4xx/5xx. Tests must assert on \`response.status()\`.

**Pitfall 2: Reusing the default request fixture across logins.** The fixture shares cookies with the browser context. To test multiple users, use \`request.newContext\` per user.

**Pitfall 3: Body consumed twice.** \`response.text()\` followed by \`response.json()\` throws. Read the body once into a variable.

**Pitfall 4: Mixing API and browser timing.** Awaiting an API call before the UI reacts can race. Use \`page.waitForResponse\` to synchronize.

**Pitfall 5: Forgetting to dispose contexts.** Long-running API contexts created with \`request.newContext\` leak sockets. Always \`await api.dispose()\`.

## Anti-patterns

- Testing only the happy path. Half of API bugs hide in error responses; cover them.
- Hard-coding test data IDs that depend on database state. Use fixtures that create and clean up.
- Validating response shapes by hand. Use schema libraries; failures point at the bad field.
- Letting API tests share authentication state with browser tests when they assert on permissions. Use distinct fixtures per role.

## API + UI integration

A common pattern: seed data via API, then exercise UI.

\`\`\`typescript
test('user can see invoice they created via API', async ({ request, page }) => {
  const create = await request.post('/api/invoices', {
    data: { amount: 100, currency: 'USD' },
  });
  const { id } = await create.json();

  await page.goto(\`/invoices/\${id}\`);
  await expect(page.getByRole('heading', { name: \`Invoice #\${id}\` })).toBeVisible();
  await expect(page.getByText('$100.00')).toBeVisible();
});
\`\`\`

This is faster and more reliable than driving the entire creation flow through the UI.

## Conclusion and next steps

Playwright's API testing is the multi-tool every team should reach for: parallelizable, debuggable, and integrated with the same fixtures and reporters as UI tests. Use it for backend smoke tests, contract validation, and integration scenarios where the UI is incidental.

Install the [playwright-e2e skill](/skills/playwright-e2e) so AI assistants generate API tests in this style. For broader API patterns, read [API Testing Complete Guide](/blog/api-testing-complete-guide). For RESTful contract testing, [REST Assured Java API Testing](/blog/rest-assured-java-api-testing) is the JVM counterpart.
`,
};
