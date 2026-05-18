import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'API Testing Best Practices: 25 Rules Every QA Engineer Must Follow',
  description:
    'Master 25 essential API testing best practices covering request validation, schema testing, authentication, rate limiting, error handling, contract testing, GraphQL, security testing, and automation strategies.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
## Why API Testing Best Practices Are Critical

APIs are the backbone of modern applications. Mobile apps, web frontends, third-party integrations, and microservices all communicate through APIs. A bug in an API endpoint can cascade through every client that depends on it, affecting millions of users simultaneously.

Despite this importance, API testing is often treated as an afterthought. Teams write a few happy-path tests and move on. The result is fragile integrations, undocumented breaking changes, and production incidents that could have been caught with proper testing.

These 25 rules provide a comprehensive framework for API testing that covers functional validation, security, performance, and maintainability. Each rule includes practical code examples using Playwright's API testing context and other popular tools.

## Rule 1: Validate Response Status Codes Precisely

Do not just check that a request succeeded. Verify the exact status code. A 200 (OK) is different from a 201 (Created) or a 204 (No Content). Each status code communicates specific information about how the server processed the request.

\`\`\`typescript
test('POST /users returns 201 for successful creation', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: { name: 'Alice', email: \`alice-\${Date.now()}@test.com\` },
  });
  // Be specific: 201 Created, not just "success"
  expect(response.status()).toBe(201);
});

test('GET /users/nonexistent returns 404', async ({ request }) => {
  const response = await request.get('/api/users/nonexistent-id-999');
  expect(response.status()).toBe(404);
});

test('POST /users returns 409 for duplicate email', async ({ request }) => {
  const email = \`dup-\${Date.now()}@test.com\`;
  await request.post('/api/users', {
    data: { name: 'First', email },
  });
  const response = await request.post('/api/users', {
    data: { name: 'Second', email },
  });
  expect(response.status()).toBe(409);
});
\`\`\`

## Rule 2: Validate Response Body Structure

Every response should match an expected schema. This catches issues where fields are missing, null when they should not be, wrong type, or renamed. Use schema validation libraries for rigorous structural checks.

\`\`\`typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const UserListSchema = z.object({
  data: z.array(UserSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

test('GET /users returns valid schema', async ({ request }) => {
  const response = await request.get('/api/users?page=1&limit=10');
  expect(response.status()).toBe(200);

  const body = await response.json();
  const result = UserListSchema.safeParse(body);
  expect(result.success).toBe(true);
  if (!result.success) {
    console.error('Schema validation errors:', result.error.issues);
  }
});
\`\`\`

## Rule 3: Test All HTTP Methods for Each Resource

Every API resource should be tested with all supported HTTP methods. Also verify that unsupported methods return 405 Method Not Allowed.

\`\`\`typescript
test.describe('Products Resource', () => {
  test('GET /products returns list', async ({ request }) => {
    const response = await request.get('/api/products');
    expect(response.status()).toBe(200);
  });

  test('POST /products creates resource', async ({ request }) => {
    const response = await request.post('/api/products', {
      data: { name: 'Widget', price: 9.99 },
    });
    expect(response.status()).toBe(201);
  });

  test('PUT /products/:id updates resource', async ({ request }) => {
    // Create first, then update
    const created = await request.post('/api/products', {
      data: { name: 'Widget', price: 9.99 },
    });
    const { id } = await created.json();

    const response = await request.put(\`/api/products/\${id}\`, {
      data: { name: 'Updated Widget', price: 14.99 },
    });
    expect(response.status()).toBe(200);
  });

  test('DELETE /products/:id removes resource', async ({ request }) => {
    const created = await request.post('/api/products', {
      data: { name: 'Widget', price: 9.99 },
    });
    const { id } = await created.json();

    const response = await request.delete(\`/api/products/\${id}\`);
    expect(response.status()).toBe(204);

    // Verify deletion
    const getResponse = await request.get(\`/api/products/\${id}\`);
    expect(getResponse.status()).toBe(404);
  });

  test('PATCH unsupported returns 405', async ({ request }) => {
    const response = await request.patch('/api/products/1', {
      data: { name: 'Updated' },
    });
    expect(response.status()).toBe(405);
  });
});
\`\`\`

## Rule 4: Test Authentication Thoroughly

Verify that protected endpoints reject unauthenticated requests, that different authentication schemes work correctly, and that expired or invalid tokens are handled properly.

\`\`\`typescript
test.describe('Authentication', () => {
  test('protected endpoint rejects unauthenticated request', async ({
    playwright,
  }) => {
    const noAuthContext = await playwright.request.newContext({
      baseURL: process.env.API_URL,
    });
    const response = await noAuthContext.get('/api/users/me');
    expect(response.status()).toBe(401);
    await noAuthContext.dispose();
  });

  test('expired token returns 401', async ({ playwright }) => {
    const expiredTokenContext = await playwright.request.newContext({
      baseURL: process.env.API_URL,
      extraHTTPHeaders: {
        Authorization: 'Bearer expired.token.here',
      },
    });
    const response = await expiredTokenContext.get('/api/users/me');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('expired');
    await expiredTokenContext.dispose();
  });

  test('valid token returns user data', async ({ request }) => {
    const response = await request.get('/api/users/me');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email');
  });
});
\`\`\`

## Rule 5: Test Authorization Boundaries

Authentication confirms who you are. Authorization confirms what you can do. Test that users can only access resources they are permitted to access and that role-based restrictions are enforced.

\`\`\`typescript
test('regular user cannot access admin endpoints', async ({ request }) => {
  // Authenticated as regular user
  const response = await request.get('/api/admin/users');
  expect(response.status()).toBe(403);
});

test('user cannot access another user resources', async ({ request }) => {
  const response = await request.get('/api/users/other-user-id/settings');
  expect(response.status()).toBe(403);
});

test('editor can update but not delete', async ({ request }) => {
  const updateResponse = await request.put('/api/articles/1', {
    data: { title: 'Updated' },
  });
  expect(updateResponse.status()).toBe(200);

  const deleteResponse = await request.delete('/api/articles/1');
  expect(deleteResponse.status()).toBe(403);
});
\`\`\`

## Rule 6: Validate Request Input

Test that the API properly validates input and returns helpful error messages. Cover missing required fields, invalid data types, values outside allowed ranges, and malformed payloads.

\`\`\`typescript
test.describe('Input Validation', () => {
  test('rejects missing required fields', async ({ request }) => {
    const response = await request.post('/api/products', {
      data: { price: 9.99 }, // name is required
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors).toContainEqual(
      expect.objectContaining({ field: 'name', message: expect.any(String) })
    );
  });

  test('rejects invalid email format', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: { name: 'Test', email: 'not-an-email' },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors[0].field).toBe('email');
  });

  test('rejects negative price', async ({ request }) => {
    const response = await request.post('/api/products', {
      data: { name: 'Widget', price: -5 },
    });
    expect(response.status()).toBe(400);
  });

  test('rejects oversized payload', async ({ request }) => {
    const largeDescription = 'x'.repeat(100_000);
    const response = await request.post('/api/products', {
      data: { name: 'Widget', price: 10, description: largeDescription },
    });
    expect([400, 413]).toContain(response.status());
  });
});
\`\`\`

## Rule 7: Test Pagination Thoroughly

Pagination bugs are among the most common API issues. Test first page, last page, out-of-bounds pages, different page sizes, and consistency between pages.

\`\`\`typescript
test.describe('Pagination', () => {
  test('first page returns correct limit', async ({ request }) => {
    const response = await request.get('/api/products?page=1&limit=5');
    const body = await response.json();
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.pagination.page).toBe(1);
  });

  test('page beyond total returns empty array', async ({ request }) => {
    const response = await request.get('/api/products?page=99999&limit=10');
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.pagination.page).toBe(99999);
  });

  test('no duplicate items across pages', async ({ request }) => {
    const page1 = await request.get('/api/products?page=1&limit=5');
    const page2 = await request.get('/api/products?page=2&limit=5');
    const ids1 = (await page1.json()).data.map((p: any) => p.id);
    const ids2 = (await page2.json()).data.map((p: any) => p.id);
    const overlap = ids1.filter((id: string) => ids2.includes(id));
    expect(overlap).toEqual([]);
  });

  test('invalid limit defaults gracefully', async ({ request }) => {
    const response = await request.get('/api/products?page=1&limit=-1');
    expect([200, 400]).toContain(response.status());
  });
});
\`\`\`

## Rule 8: Test Error Response Format

Error responses should follow a consistent structure. Every error should include a status code, error type, human-readable message, and optionally a machine-readable error code for client handling.

\`\`\`typescript
const ErrorResponseSchema = z.object({
  status: z.number(),
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
});

test('error responses have consistent format', async ({ request }) => {
  const errorScenarios = [
    { url: '/api/products/nonexistent', expectedStatus: 404 },
    { url: '/api/admin/settings', expectedStatus: 403 },
  ];

  for (const scenario of errorScenarios) {
    const response = await request.get(scenario.url);
    expect(response.status()).toBe(scenario.expectedStatus);
    const body = await response.json();
    const result = ErrorResponseSchema.safeParse(body);
    expect(result.success).toBe(true);
  }
});
\`\`\`

## Rule 9: Test Rate Limiting

If your API has rate limits, verify they are enforced correctly. Test that requests within limits succeed and requests exceeding limits return 429 with appropriate Retry-After headers.

\`\`\`typescript
test('rate limiting returns 429 after threshold', async ({ request }) => {
  const requests = [];
  // Send requests rapidly to trigger rate limit
  for (let i = 0; i < 110; i++) {
    requests.push(request.get('/api/products'));
  }
  const responses = await Promise.all(requests);
  const rateLimited = responses.filter((r) => r.status() === 429);

  // At least some requests should be rate limited
  expect(rateLimited.length).toBeGreaterThan(0);

  // Check Retry-After header
  if (rateLimited.length > 0) {
    const retryAfter = rateLimited[0].headers()['retry-after'];
    expect(retryAfter).toBeTruthy();
  }
});
\`\`\`

## Rule 10: Test Idempotency

Idempotent endpoints (GET, PUT, DELETE) should produce the same result when called multiple times with the same parameters. This is critical for retry logic and distributed systems.

\`\`\`typescript
test('PUT is idempotent', async ({ request }) => {
  // Create a resource
  const created = await request.post('/api/products', {
    data: { name: 'Widget', price: 10 },
  });
  const { id } = await created.json();

  const updateData = { name: 'Updated Widget', price: 15 };

  // Call PUT twice with identical data
  const first = await request.put(\`/api/products/\${id}\`, { data: updateData });
  const second = await request.put(\`/api/products/\${id}\`, { data: updateData });

  expect(first.status()).toBe(200);
  expect(second.status()).toBe(200);

  // Both should produce the same result
  const firstBody = await first.json();
  const secondBody = await second.json();
  expect(firstBody.name).toBe(secondBody.name);
  expect(firstBody.price).toBe(secondBody.price);
});

test('DELETE is idempotent', async ({ request }) => {
  const created = await request.post('/api/products', {
    data: { name: 'Widget', price: 10 },
  });
  const { id } = await created.json();

  const first = await request.delete(\`/api/products/\${id}\`);
  expect(first.status()).toBe(204);

  // Second delete should not error (404 or 204 are acceptable)
  const second = await request.delete(\`/api/products/\${id}\`);
  expect([204, 404]).toContain(second.status());
});
\`\`\`

## Rule 11: Test Content Negotiation

Verify that the API handles different content types correctly. Test that the API accepts and returns JSON, handles missing Content-Type headers, and rejects unsupported content types.

\`\`\`typescript
test('API rejects non-JSON content type', async ({ request }) => {
  const response = await request.post('/api/products', {
    headers: { 'Content-Type': 'text/plain' },
    data: 'name=Widget&price=10',
  });
  expect(response.status()).toBe(415);
});

test('API returns JSON content type', async ({ request }) => {
  const response = await request.get('/api/products');
  const contentType = response.headers()['content-type'];
  expect(contentType).toContain('application/json');
});
\`\`\`

## Rule 12: Test API Versioning

If your API supports versioning, test that different versions return appropriate responses and that deprecated versions return proper warnings.

\`\`\`typescript
test('v1 endpoint returns expected format', async ({ request }) => {
  const response = await request.get('/api/v1/products');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('items'); // v1 uses 'items'
});

test('v2 endpoint returns updated format', async ({ request }) => {
  const response = await request.get('/api/v2/products');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('data'); // v2 uses 'data'
  expect(body).toHaveProperty('pagination');
});
\`\`\`

## Rule 13: Test Search and Filtering

Search and filter functionality is complex and error-prone. Test multiple filter combinations, empty result sets, special characters in search queries, and sort ordering.

\`\`\`typescript
test.describe('Search and Filtering', () => {
  test('filter by category returns matching items', async ({ request }) => {
    const response = await request.get('/api/products?category=electronics');
    const body = await response.json();
    for (const product of body.data) {
      expect(product.category).toBe('electronics');
    }
  });

  test('combined filters narrow results', async ({ request }) => {
    const broad = await request.get('/api/products?category=electronics');
    const narrow = await request.get(
      '/api/products?category=electronics&minPrice=100'
    );
    const broadBody = await broad.json();
    const narrowBody = await narrow.json();
    expect(narrowBody.pagination.total)
      .toBeLessThanOrEqual(broadBody.pagination.total);
  });

  test('search handles special characters', async ({ request }) => {
    const response = await request.get(
      '/api/products?search=' + encodeURIComponent('widget "pro" & co.')
    );
    expect(response.status()).toBe(200);
  });

  test('sort ordering is correct', async ({ request }) => {
    const response = await request.get(
      '/api/products?sort=price&order=asc'
    );
    const body = await response.json();
    const prices = body.data.map((p: any) => p.price);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });
});
\`\`\`

## Rule 14: Test Response Headers

Important response headers like CORS, caching, security, and content type should be validated. These headers affect client behavior and security posture.

\`\`\`typescript
test('security headers are present', async ({ request }) => {
  const response = await request.get('/api/products');
  const headers = response.headers();

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBeTruthy();
  expect(headers['strict-transport-security']).toBeTruthy();
});

test('CORS headers allow expected origins', async ({ request }) => {
  const response = await request.get('/api/products', {
    headers: { Origin: 'https://app.example.com' },
  });
  const corsHeader = response.headers()['access-control-allow-origin'];
  expect(corsHeader).toBeTruthy();
});

test('cache headers are set for read endpoints', async ({ request }) => {
  const response = await request.get('/api/products');
  const cacheControl = response.headers()['cache-control'];
  expect(cacheControl).toBeTruthy();
});
\`\`\`

## Rule 15: Test Concurrent Access

APIs must handle concurrent requests correctly. Test race conditions, optimistic locking, and concurrent writes to the same resource.

\`\`\`typescript
test('concurrent updates do not lose data', async ({ request }) => {
  // Create a resource
  const created = await request.post('/api/counters', {
    data: { name: 'test', value: 0 },
  });
  const { id } = await created.json();

  // Send 10 concurrent increment requests
  const increments = Array.from({ length: 10 }, () =>
    request.post(\`/api/counters/\${id}/increment\`)
  );
  await Promise.all(increments);

  // Final value should be 10
  const response = await request.get(\`/api/counters/\${id}\`);
  const body = await response.json();
  expect(body.value).toBe(10);
});
\`\`\`

## Rule 16: Test GraphQL Specifics

GraphQL APIs have unique testing requirements. Validate query depth limits, introspection controls, mutation input validation, and error handling for partial failures.

\`\`\`typescript
test.describe('GraphQL API', () => {
  test('query returns requested fields only', async ({ request }) => {
    const response = await request.post('/graphql', {
      data: {
        query: \`
          query {
            products(first: 5) {
              id
              name
            }
          }
        \`,
      },
    });
    const body = await response.json();
    expect(body.data.products[0]).toHaveProperty('id');
    expect(body.data.products[0]).toHaveProperty('name');
    expect(body.data.products[0]).not.toHaveProperty('price');
  });

  test('deeply nested query is rejected', async ({ request }) => {
    const deepQuery = \`
      query {
        users {
          posts {
            comments {
              author {
                posts {
                  comments {
                    author { id }
                  }
                }
              }
            }
          }
        }
      }
    \`;
    const response = await request.post('/graphql', {
      data: { query: deepQuery },
    });
    const body = await response.json();
    expect(body.errors).toBeTruthy();
    expect(body.errors[0].message).toContain('depth');
  });

  test('mutation validates input', async ({ request }) => {
    const response = await request.post('/graphql', {
      data: {
        query: \`
          mutation {
            createProduct(input: { name: "", price: -1 }) {
              id
            }
          }
        \`,
      },
    });
    const body = await response.json();
    expect(body.errors).toBeTruthy();
  });
});
\`\`\`

## Rule 17: Test Contract Compliance

API contracts define the agreement between producer and consumer. Contract tests verify that the API continues to meet these agreements, catching breaking changes before deployment.

\`\`\`typescript
// Define contracts based on consumer expectations
const ProductContract = {
  'GET /products': {
    status: 200,
    body: z.object({
      data: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        available: z.boolean(),
      })),
    }),
  },
  'GET /products/:id': {
    status: 200,
    body: z.object({
      id: z.string(),
      name: z.string(),
      price: z.number(),
      description: z.string(),
      available: z.boolean(),
      category: z.string(),
    }),
  },
};

test('API complies with product contract', async ({ request }) => {
  const listResponse = await request.get('/api/products');
  expect(listResponse.status()).toBe(ProductContract['GET /products'].status);

  const listBody = await listResponse.json();
  const listResult = ProductContract['GET /products'].body.safeParse(listBody);
  expect(listResult.success).toBe(true);
});
\`\`\`

## Rule 18: Test Webhook Delivery

If your API sends webhooks, verify that webhooks are triggered for the correct events, contain the expected payload, and include proper signatures for security.

## Rule 19: Test Timeout and Long-Running Operations

APIs should handle long-running operations gracefully. Test that timeouts are enforced, long-running operations return 202 Accepted with a status endpoint, and status endpoints reflect actual progress.

## Rule 20: Test Bulk Operations

If your API supports bulk create, update, or delete operations, test partial failures (some items succeed, some fail), maximum batch sizes, and transactional behavior.

\`\`\`typescript
test('bulk create handles partial failures', async ({ request }) => {
  const response = await request.post('/api/products/bulk', {
    data: {
      products: [
        { name: 'Valid Product', price: 10 },
        { name: '', price: 10 },  // Invalid: empty name
        { name: 'Another Valid', price: 20 },
      ],
    },
  });
  const body = await response.json();
  expect(body.created).toBe(2);
  expect(body.failed).toBe(1);
  expect(body.errors[0]).toHaveProperty('index', 1);
});
\`\`\`

## Rule 21: Test Response Time

Set performance expectations for API endpoints and fail tests when response times exceed thresholds. This catches performance regressions early.

\`\`\`typescript
test('product list responds within 500ms', async ({ request }) => {
  const start = Date.now();
  const response = await request.get('/api/products?limit=20');
  const duration = Date.now() - start;

  expect(response.status()).toBe(200);
  expect(duration).toBeLessThan(500);
});
\`\`\`

## Rule 22: Test SQL Injection Prevention

Send SQL injection payloads and verify the API handles them safely. The API should either sanitize the input or return a validation error, never execute the injected SQL.

\`\`\`typescript
test('search is safe against SQL injection', async ({ request }) => {
  const injectionPayloads = [
    "'; DROP TABLE products; --",
    "1 OR 1=1",
    "1; SELECT * FROM users",
    "admin'--",
  ];

  for (const payload of injectionPayloads) {
    const response = await request.get(
      \`/api/products?search=\${encodeURIComponent(payload)}\`
    );
    // Should return 200 with empty results or 400, never 500
    expect([200, 400]).toContain(response.status());
  }
});
\`\`\`

## Rule 23: Test File Upload Endpoints

File upload APIs need testing for valid files, oversized files, wrong content types, and malicious file names.

\`\`\`typescript
test.describe('File Upload', () => {
  test('accepts valid image upload', async ({ request }) => {
    const response = await request.post('/api/uploads', {
      multipart: {
        file: {
          name: 'test-image.png',
          mimeType: 'image/png',
          buffer: Buffer.from('fake-png-data'),
        },
      },
    });
    expect(response.status()).toBe(201);
  });

  test('rejects oversized file', async ({ request }) => {
    const largeBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB
    const response = await request.post('/api/uploads', {
      multipart: {
        file: {
          name: 'large-file.png',
          mimeType: 'image/png',
          buffer: largeBuffer,
        },
      },
    });
    expect(response.status()).toBe(413);
  });

  test('rejects disallowed file types', async ({ request }) => {
    const response = await request.post('/api/uploads', {
      multipart: {
        file: {
          name: 'script.exe',
          mimeType: 'application/x-executable',
          buffer: Buffer.from('malicious'),
        },
      },
    });
    expect(response.status()).toBe(400);
  });
});
\`\`\`

## Rule 24: Test CORS Configuration

Cross-Origin Resource Sharing (CORS) misconfigurations can either block legitimate clients or expose the API to unauthorized origins.

\`\`\`typescript
test('CORS allows configured origins', async ({ request }) => {
  const response = await request.get('/api/products', {
    headers: { Origin: 'https://app.example.com' },
  });
  expect(response.headers()['access-control-allow-origin']).toBe(
    'https://app.example.com'
  );
});

test('CORS rejects unknown origins', async ({ request }) => {
  const response = await request.get('/api/products', {
    headers: { Origin: 'https://malicious-site.com' },
  });
  const corsHeader = response.headers()['access-control-allow-origin'];
  expect(corsHeader).not.toBe('https://malicious-site.com');
  expect(corsHeader).not.toBe('*');
});
\`\`\`

## Rule 25: Maintain an API Test Suite Health Dashboard

Track key metrics for your API test suite: total tests, pass rate, average execution time, flaky test count, coverage by endpoint, and untested endpoints. Review these metrics weekly and set thresholds that trigger alerts.

| Metric | Target | Alert Threshold |
|---|---|---|
| Test pass rate | > 99% | < 97% |
| Average suite execution | < 5 min | > 10 min |
| Flaky test rate | < 1% | > 3% |
| Endpoint coverage | > 90% | < 80% |
| Schema validation coverage | 100% | < 95% |
| Error scenario coverage | > 80% | < 60% |

## Organizing Your API Test Suite

Structure your API tests by resource and operation type. Use a consistent naming convention and shared utilities for authentication, data creation, and schema validation.

\`\`\`
tests/
  api/
    fixtures/
      auth.fixture.ts
      data-factory.ts
      schemas.ts
    products/
      products.crud.spec.ts
      products.search.spec.ts
      products.validation.spec.ts
    users/
      users.crud.spec.ts
      users.auth.spec.ts
      users.permissions.spec.ts
    health/
      rate-limiting.spec.ts
      performance.spec.ts
      security.spec.ts
\`\`\`

## Getting Started

Apply these rules incrementally. Start with Rules 1-6 (status codes, schema validation, CRUD testing, authentication, authorization, and input validation). These cover the most critical aspects of API testing. Then add Rules 7-15 (pagination, errors, rate limiting, idempotency, and concurrency) as your suite matures. Finally, add Rules 16-25 (GraphQL, contracts, performance, security) for comprehensive coverage.

\`\`\`bash
# Install API testing skills for your AI agent
npx @qaskills/cli add api-testing
npx @qaskills/cli add api-security-testing
\`\`\`

A well-tested API is a reliable API. These 25 rules provide the framework for building confidence in your API's correctness, security, and performance.
`,
};
