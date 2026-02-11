---
name: Playwright API Testing
description: API testing skill using Playwright's built-in APIRequestContext for RESTful service validation, authentication flows, and API contract verification.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [playwright, api-testing, rest, http, automation]
testingTypes: [api]
frameworks: [playwright]
languages: [typescript]
domains: [api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt]
---

# Playwright API Testing Skill

You are an expert QA automation engineer specializing in API testing using Playwright's built-in `APIRequestContext`. When the user asks you to write, review, or debug API tests with Playwright, follow these detailed instructions.

## Core Principles

1. **Playwright-native API testing** -- Use `APIRequestContext` instead of external HTTP libraries.
2. **Type safety** -- Define interfaces for all request/response payloads.
3. **Isolation** -- Each test manages its own data lifecycle (create, verify, clean up).
4. **Comprehensive validation** -- Check status codes, headers, response body structure, and timing.
5. **Reusable abstractions** -- Build API client classes for each service domain.

## Project Structure

```
tests/
  api/
    auth/
      auth-api.spec.ts
    users/
      users-api.spec.ts
      users-crud.spec.ts
    products/
      products-api.spec.ts
  fixtures/
    api.fixture.ts
    auth-api.fixture.ts
  models/
    user.model.ts
    product.model.ts
    api-response.model.ts
  clients/
    base-api-client.ts
    users-api-client.ts
    products-api-client.ts
  utils/
    api-helpers.ts
    schema-validator.ts
playwright.config.ts
```

## Configuration

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/api-results.json' }],
  ],
  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});
```

## Response Models

Define TypeScript interfaces for all API payloads:

```typescript
// models/user.model.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'user' | 'viewer';
}

export interface UpdateUserRequest {
  name?: string;
  role?: 'admin' | 'user' | 'viewer';
}

export interface UserListResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  details?: Record<string, string[]>;
}
```

## Base API Client

```typescript
// clients/base-api-client.ts
import { APIRequestContext, APIResponse } from '@playwright/test';

export class BaseApiClient {
  protected readonly request: APIRequestContext;
  protected readonly basePath: string;

  constructor(request: APIRequestContext, basePath: string) {
    this.request = request;
    this.basePath = basePath;
  }

  protected async get(path: string, params?: Record<string, string>): Promise<APIResponse> {
    const url = params
      ? `${this.basePath}${path}?${new URLSearchParams(params)}`
      : `${this.basePath}${path}`;
    return this.request.get(url);
  }

  protected async post(path: string, data: unknown): Promise<APIResponse> {
    return this.request.post(`${this.basePath}${path}`, { data });
  }

  protected async put(path: string, data: unknown): Promise<APIResponse> {
    return this.request.put(`${this.basePath}${path}`, { data });
  }

  protected async patch(path: string, data: unknown): Promise<APIResponse> {
    return this.request.patch(`${this.basePath}${path}`, { data });
  }

  protected async delete(path: string): Promise<APIResponse> {
    return this.request.delete(`${this.basePath}${path}`);
  }
}
```

### Domain-Specific API Client

```typescript
// clients/users-api-client.ts
import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from './base-api-client';
import { CreateUserRequest, UpdateUserRequest } from '../models/user.model';

export class UsersApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request, '/users');
  }

  async list(page = 1, pageSize = 10): Promise<APIResponse> {
    return this.get('', { page: String(page), pageSize: String(pageSize) });
  }

  async getById(id: string): Promise<APIResponse> {
    return this.get(`/${id}`);
  }

  async create(user: CreateUserRequest): Promise<APIResponse> {
    return this.post('', user);
  }

  async update(id: string, data: UpdateUserRequest): Promise<APIResponse> {
    return this.patch(`/${id}`, data);
  }

  async remove(id: string): Promise<APIResponse> {
    return this.delete(`/${id}`);
  }

  async search(query: string): Promise<APIResponse> {
    return this.get('/search', { q: query });
  }
}
```

## Custom Fixtures

```typescript
// fixtures/api.fixture.ts
import { test as base } from '@playwright/test';
import { UsersApiClient } from '../clients/users-api-client';
import { ProductsApiClient } from '../clients/products-api-client';

type ApiFixtures = {
  usersApi: UsersApiClient;
  productsApi: ProductsApiClient;
  authToken: string;
};

export const test = base.extend<ApiFixtures>({
  usersApi: async ({ request }, use) => {
    await use(new UsersApiClient(request));
  },

  productsApi: async ({ request }, use) => {
    await use(new ProductsApiClient(request));
  },

  authToken: async ({ request }, use) => {
    const response = await request.post('/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'AdminPass123!',
      },
    });
    const body = await response.json();
    await use(body.token);
  },
});

export { expect } from '@playwright/test';
```

## Writing API Tests

### CRUD Operations

```typescript
import { test, expect } from '../fixtures/api.fixture';
import { CreateUserRequest, User } from '../models/user.model';

test.describe('Users API - CRUD', () => {
  let createdUserId: string;

  const newUser: CreateUserRequest = {
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    password: 'SecurePass123!',
    role: 'user',
  };

  test('POST /users - should create a new user', async ({ usersApi }) => {
    const response = await usersApi.create(newUser);

    expect(response.status()).toBe(201);

    const body: User = await response.json();
    expect(body.id).toBeTruthy();
    expect(body.email).toBe(newUser.email);
    expect(body.name).toBe(newUser.name);
    expect(body.role).toBe('user');
    expect(body.createdAt).toBeTruthy();

    createdUserId = body.id;
  });

  test('GET /users/:id - should retrieve the user', async ({ usersApi }) => {
    // First create a user
    const createResponse = await usersApi.create({
      ...newUser,
      email: `get-test-${Date.now()}@example.com`,
    });
    const created: User = await createResponse.json();

    const response = await usersApi.getById(created.id);
    expect(response.status()).toBe(200);

    const body: User = await response.json();
    expect(body.id).toBe(created.id);
    expect(body.email).toBe(created.email);
  });

  test('PATCH /users/:id - should update the user', async ({ usersApi }) => {
    const createResponse = await usersApi.create({
      ...newUser,
      email: `update-test-${Date.now()}@example.com`,
    });
    const created: User = await createResponse.json();

    const response = await usersApi.update(created.id, { name: 'Updated Name' });
    expect(response.status()).toBe(200);

    const body: User = await response.json();
    expect(body.name).toBe('Updated Name');
  });

  test('DELETE /users/:id - should delete the user', async ({ usersApi }) => {
    const createResponse = await usersApi.create({
      ...newUser,
      email: `delete-test-${Date.now()}@example.com`,
    });
    const created: User = await createResponse.json();

    const deleteResponse = await usersApi.remove(created.id);
    expect(deleteResponse.status()).toBe(204);

    const getResponse = await usersApi.getById(created.id);
    expect(getResponse.status()).toBe(404);
  });
});
```

### Authentication Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication API', () => {
  test('should login with valid credentials', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'AdminPass123!',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.expiresIn).toBeGreaterThan(0);
    expect(body.user.email).toBe('admin@example.com');
  });

  test('should reject invalid credentials', async ({ request }) => {
    const response = await request.post('/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.message).toBe('Invalid credentials');
  });

  test('should access protected endpoint with token', async ({ request }) => {
    // Login first
    const loginResponse = await request.post('/auth/login', {
      data: {
        email: 'admin@example.com',
        password: 'AdminPass123!',
      },
    });
    const { token } = await loginResponse.json();

    // Use the token
    const response = await request.get('/users/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status()).toBe(200);
    const user = await response.json();
    expect(user.email).toBe('admin@example.com');
  });

  test('should reject expired or invalid token', async ({ request }) => {
    const response = await request.get('/users/me', {
      headers: {
        Authorization: 'Bearer invalid.token.here',
      },
    });

    expect(response.status()).toBe(401);
  });
});
```

### Error Handling and Validation

```typescript
test.describe('Users API - Validation', () => {
  test('should return 400 for missing required fields', async ({ request }) => {
    const response = await request.post('/users', {
      data: { name: 'No Email User' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.details).toHaveProperty('email');
  });

  test('should return 400 for invalid email format', async ({ request }) => {
    const response = await request.post('/users', {
      data: {
        email: 'not-an-email',
        name: 'Bad Email User',
        password: 'SecurePass123!',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.details.email).toContain('must be a valid email');
  });

  test('should return 409 for duplicate email', async ({ usersApi }) => {
    const email = `duplicate-${Date.now()}@example.com`;
    const userData = { email, name: 'First', password: 'Pass123!' };

    await usersApi.create(userData);
    const response = await usersApi.create(userData);

    expect(response.status()).toBe(409);
  });

  test('should return 404 for non-existent resource', async ({ usersApi }) => {
    const response = await usersApi.getById('non-existent-id');
    expect(response.status()).toBe(404);
  });
});
```

### Pagination and Filtering

```typescript
test.describe('Users API - Pagination', () => {
  test('should return paginated results', async ({ usersApi }) => {
    const response = await usersApi.list(1, 5);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeLessThanOrEqual(5);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(5);
    expect(body.total).toBeGreaterThanOrEqual(0);
  });

  test('should return correct page', async ({ usersApi }) => {
    const page1 = await (await usersApi.list(1, 2)).json();
    const page2 = await (await usersApi.list(2, 2)).json();

    const page1Ids = page1.data.map((u: { id: string }) => u.id);
    const page2Ids = page2.data.map((u: { id: string }) => u.id);
    const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });
});
```

### Response Header Validation

```typescript
test('should return correct response headers', async ({ request }) => {
  const response = await request.get('/users');

  expect(response.headers()['content-type']).toContain('application/json');
  expect(response.headers()['x-request-id']).toBeTruthy();
  expect(response.headers()['cache-control']).toBeDefined();

  // Security headers
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
});
```

### Response Time Assertions

```typescript
test('should respond within acceptable time', async ({ request }) => {
  const start = Date.now();
  const response = await request.get('/health');
  const duration = Date.now() - start;

  expect(response.status()).toBe(200);
  expect(duration).toBeLessThan(500); // 500ms threshold
});
```

## Best Practices

1. **Use unique test data** -- Include timestamps or UUIDs in emails and names to avoid collisions.
2. **Clean up after tests** -- Delete resources you create to keep the test environment clean.
3. **Validate response schemas** -- Check not just values but the shape of the response.
4. **Test both happy and unhappy paths** -- Always test error cases and edge cases.
5. **Use environment variables** -- Never hardcode URLs or credentials.
6. **Group tests logically** -- Organize by resource or feature, not by HTTP method.
7. **Use fixtures for authentication** -- Avoid repeating login logic in every test.
8. **Check response times** -- API performance is part of correctness.
9. **Test idempotency** -- Verify that repeated identical requests produce consistent results.
10. **Version your API tests** -- When testing versioned APIs, organize tests by version.

## Anti-Patterns to Avoid

1. **Chaining test dependencies** -- Each test must create its own data.
2. **Ignoring response headers** -- Headers carry important metadata.
3. **Testing only status codes** -- Always validate the response body too.
4. **Using hardcoded IDs** -- IDs should come from test setup, not hardcoded values.
5. **Skipping error scenarios** -- Error handling tests catch more bugs than happy-path tests.
6. **Not testing with different roles** -- API authorization must be tested per role.
7. **Mixing UI and API tests** -- Keep API tests separate from E2E browser tests.
8. **Not verifying side effects** -- If POST creates a resource, GET it to confirm.
9. **Ignoring rate limiting** -- Test that rate limits are enforced and handle 429 responses.
10. **Not testing with large payloads** -- Ensure APIs handle boundary sizes correctly.

## Advanced Patterns

### Parallel API Test with Context Isolation

```typescript
test.describe.parallel('Isolated API tests', () => {
  test('test A creates and deletes user A', async ({ request }) => {
    const res = await request.post('/users', {
      data: { email: `a-${Date.now()}@test.com`, name: 'A', password: 'Pass123!' },
    });
    const user = await res.json();
    await request.delete(`/users/${user.id}`);
  });

  test('test B creates and deletes user B', async ({ request }) => {
    const res = await request.post('/users', {
      data: { email: `b-${Date.now()}@test.com`, name: 'B', password: 'Pass123!' },
    });
    const user = await res.json();
    await request.delete(`/users/${user.id}`);
  });
});
```

### Custom Request Context with Auth

```typescript
test('admin-only endpoint', async ({ playwright }) => {
  const adminContext = await playwright.request.newContext({
    baseURL: 'http://localhost:3000/api',
    extraHTTPHeaders: {
      Authorization: 'Bearer admin-token-here',
    },
  });

  const response = await adminContext.get('/admin/settings');
  expect(response.status()).toBe(200);

  await adminContext.dispose();
});
```

### File Upload via API

```typescript
import * as fs from 'fs';
import * as path from 'path';

test('should upload a file via API', async ({ request }) => {
  const filePath = path.resolve('test-data/sample.pdf');
  const fileBuffer = fs.readFileSync(filePath);

  const response = await request.post('/files/upload', {
    multipart: {
      file: {
        name: 'sample.pdf',
        mimeType: 'application/pdf',
        buffer: fileBuffer,
      },
      description: 'Test upload',
    },
  });

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.filename).toBe('sample.pdf');
  expect(body.size).toBeGreaterThan(0);
});
```
