---
name: API Test Suite Generator
description: Automatically generate comprehensive API test suites from OpenAPI specifications covering CRUD operations, error handling, authentication, pagination, and edge cases
version: 1.0.0
author: Pramod
license: MIT
tags: [api-testing, openapi, test-generation, crud-testing, rest-api, api-automation, swagger, endpoint-testing]
testingTypes: [api, contract]
frameworks: [playwright, postman, rest-assured]
languages: [typescript, javascript, python, java]
domains: [api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# API Test Suite Generator Skill

You are an expert QA automation engineer specializing in generating comprehensive API test suites from OpenAPI (Swagger) specifications. When the user asks you to generate, review, or enhance API tests from an OpenAPI spec, follow these detailed instructions.

## Core Principles

1. **Spec-driven testing** -- The OpenAPI specification is the single source of truth. Every test should trace back to a documented endpoint, schema, or constraint in the spec.
2. **Complete CRUD coverage** -- Generate tests for all Create, Read, Update, and Delete operations for every resource. Never leave an endpoint untested.
3. **Negative testing first** -- Error paths outnumber happy paths. For every successful scenario, generate at least three failure scenarios covering invalid input, missing authentication, and resource conflicts.
4. **Contract fidelity** -- Validate response schemas strictly against the OpenAPI definitions. A 200 response with a missing required field is a test failure.
5. **Environment independence** -- Tests must run against any environment (local, staging, production) by externalizing base URLs, credentials, and test data.
6. **Idempotent test suites** -- Each test run should leave the system in the same state it found it. Create what you need, clean up what you created.
7. **Deterministic ordering** -- Tests should not depend on execution order. Use setup and teardown hooks to establish preconditions explicitly.

## Project Structure

Organize your API test suite with clear separation between configuration, test logic, and utilities:

```
tests/
  api/
    specs/
      openapi.yaml
      openapi.json
    generated/
      users.api.spec.ts
      products.api.spec.ts
      orders.api.spec.ts
      auth.api.spec.ts
    helpers/
      api-client.ts
      schema-validator.ts
      auth-helper.ts
      pagination-helper.ts
      test-data-factory.ts
    fixtures/
      users.fixture.ts
      products.fixture.ts
    config/
      environments.ts
      api.config.ts
  postman/
    collection.json
    environment.json
  rest-assured/
    src/test/java/api/
      UsersApiTest.java
      ProductsApiTest.java
      BaseApiTest.java
playwright.config.ts
```

## OpenAPI Spec Parsing

The foundation of automated test generation is reliable spec parsing. Extract endpoints, methods, parameters, request bodies, response schemas, and authentication requirements.

### Parsing an OpenAPI Specification

```typescript
import * as fs from 'fs';
import * as yaml from 'js-yaml';

interface OpenApiEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary: string;
  parameters: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  security: OpenApiSecurity[];
  tags: string[];
}

interface OpenApiParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean;
  schema: OpenApiSchema;
  description?: string;
}

interface OpenApiSchema {
  type: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
}

interface OpenApiRequestBody {
  required: boolean;
  content: Record<string, { schema: OpenApiSchema }>;
}

interface OpenApiResponse {
  description: string;
  content?: Record<string, { schema: OpenApiSchema }>;
}

interface OpenApiSecurity {
  [scheme: string]: string[];
}

function parseOpenApiSpec(filePath: string): OpenApiEndpoint[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const spec = filePath.endsWith('.yaml') || filePath.endsWith('.yml')
    ? yaml.load(content) as any
    : JSON.parse(content);

  const endpoints: OpenApiEndpoint[] = [];

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, operation] of Object.entries(methods as Record<string, any>)) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        endpoints.push({
          path,
          method: method.toUpperCase(),
          operationId: operation.operationId || `${method}_${path}`,
          summary: operation.summary || '',
          parameters: [
            ...(spec.paths[path].parameters || []),
            ...(operation.parameters || []),
          ],
          requestBody: operation.requestBody,
          responses: operation.responses || {},
          security: operation.security || spec.security || [],
          tags: operation.tags || [],
        });
      }
    }
  }

  return endpoints;
}

function resolveRef(spec: any, ref: string): any {
  const parts = ref.replace('#/', '').split('/');
  let current = spec;
  for (const part of parts) {
    current = current[part];
  }
  return current;
}
```

### Schema-Based Test Data Generation

```typescript
import { faker } from '@faker-js/faker';

function generateTestData(schema: OpenApiSchema): any {
  if (!schema) return undefined;

  switch (schema.type) {
    case 'string':
      return generateStringValue(schema);
    case 'integer':
    case 'number':
      return generateNumericValue(schema);
    case 'boolean':
      return faker.datatype.boolean();
    case 'array':
      return [generateTestData(schema.items!)];
    case 'object':
      const obj: Record<string, any> = {};
      for (const [key, propSchema] of Object.entries(schema.properties || {})) {
        obj[key] = generateTestData(propSchema);
      }
      return obj;
    default:
      return null;
  }
}

function generateStringValue(schema: OpenApiSchema): string {
  if (schema.enum) return schema.enum[0];
  switch (schema.format) {
    case 'email': return faker.internet.email();
    case 'uri':
    case 'url': return faker.internet.url();
    case 'uuid': return faker.string.uuid();
    case 'date': return faker.date.recent().toISOString().split('T')[0];
    case 'date-time': return faker.date.recent().toISOString();
    case 'password': return faker.internet.password({ length: 16 });
    default:
      const minLen = schema.minLength || 1;
      const maxLen = schema.maxLength || 50;
      return faker.string.alpha({ length: { min: minLen, max: maxLen } });
  }
}

function generateNumericValue(schema: OpenApiSchema): number {
  const min = schema.minimum ?? 0;
  const max = schema.maximum ?? 10000;
  return schema.type === 'integer'
    ? faker.number.int({ min, max })
    : faker.number.float({ min, max, fractionDigits: 2 });
}

function generateInvalidTestData(schema: OpenApiSchema): any {
  switch (schema.type) {
    case 'string':
      if (schema.minLength) return '';
      if (schema.maxLength) return 'x'.repeat(schema.maxLength + 100);
      if (schema.format === 'email') return 'not-an-email';
      if (schema.enum) return 'INVALID_ENUM_VALUE';
      return 12345; // wrong type
    case 'integer':
    case 'number':
      if (schema.minimum !== undefined) return schema.minimum - 1;
      if (schema.maximum !== undefined) return schema.maximum + 1;
      return 'not-a-number';
    case 'boolean':
      return 'not-a-boolean';
    case 'array':
      return 'not-an-array';
    default:
      return null;
  }
}
```

## Automatic CRUD Test Generation with Playwright

### API Client Setup

```typescript
import { test, expect, APIRequestContext, APIResponse } from '@playwright/test';

interface ApiConfig {
  baseUrl: string;
  authToken?: string;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

class ApiClient {
  private request: APIRequestContext;
  private config: ApiConfig;

  constructor(request: APIRequestContext, config: ApiConfig) {
    this.request = request;
    this.config = config;
  }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.config.defaultHeaders,
    };
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    return headers;
  }

  async get(path: string, params?: Record<string, string>): Promise<APIResponse> {
    return this.request.get(`${this.config.baseUrl}${path}`, {
      headers: this.headers,
      params,
      timeout: this.config.timeout || 30000,
    });
  }

  async post(path: string, data: any): Promise<APIResponse> {
    return this.request.post(`${this.config.baseUrl}${path}`, {
      headers: this.headers,
      data,
      timeout: this.config.timeout || 30000,
    });
  }

  async put(path: string, data: any): Promise<APIResponse> {
    return this.request.put(`${this.config.baseUrl}${path}`, {
      headers: this.headers,
      data,
      timeout: this.config.timeout || 30000,
    });
  }

  async patch(path: string, data: any): Promise<APIResponse> {
    return this.request.patch(`${this.config.baseUrl}${path}`, {
      headers: this.headers,
      data,
      timeout: this.config.timeout || 30000,
    });
  }

  async delete(path: string): Promise<APIResponse> {
    return this.request.delete(`${this.config.baseUrl}${path}`, {
      headers: this.headers,
      timeout: this.config.timeout || 30000,
    });
  }
}
```

### Generated CRUD Test Suite

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

test.describe('Users API - CRUD Operations', () => {
  let authToken: string;
  let createdUserId: string;

  test.beforeAll(async ({ request }) => {
    const loginResponse = await request.post(`${BASE_URL}/auth/login`, {
      data: { email: 'admin@test.com', password: 'TestPass123!' },
    });
    const loginBody = await loginResponse.json();
    authToken = loginBody.token;
  });

  test('POST /users - should create a new user', async ({ request }) => {
    const userData = {
      name: 'Jane Doe',
      email: `jane.doe.${Date.now()}@example.com`,
      role: 'editor',
    };

    const response = await request.post(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: userData,
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body.name).toBe(userData.name);
    expect(body.email).toBe(userData.email);
    expect(body.role).toBe(userData.role);
    expect(body).toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('password');
    createdUserId = body.id;
  });

  test('GET /users/:id - should retrieve the created user', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(createdUserId);
    expect(body).toHaveProperty('name');
    expect(body).toHaveProperty('email');
  });

  test('GET /users - should list users with pagination', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: '1', limit: '10' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('meta');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toHaveProperty('total');
    expect(body.meta).toHaveProperty('page');
    expect(body.meta).toHaveProperty('limit');
    expect(body.data.length).toBeLessThanOrEqual(10);
  });

  test('PUT /users/:id - should update the user', async ({ request }) => {
    const updateData = { name: 'Jane Updated' };

    const response = await request.put(`${BASE_URL}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: updateData,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.name).toBe('Jane Updated');
    expect(body.id).toBe(createdUserId);
  });

  test('PATCH /users/:id - should partially update the user', async ({ request }) => {
    const patchData = { role: 'admin' };

    const response = await request.patch(`${BASE_URL}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: patchData,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.role).toBe('admin');
  });

  test('DELETE /users/:id - should delete the user', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(204);
  });

  test('GET /users/:id - should return 404 for deleted user', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users/${createdUserId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });
});
```

## Authentication Flow Testing

### Testing Multiple Auth Schemes

```typescript
test.describe('Authentication Flow Tests', () => {
  test('should reject requests without authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('authentication');
  });

  test('should reject requests with expired token', async ({ request }) => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid';
    const response = await request.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(response.status()).toBe(401);
  });

  test('should reject requests with malformed token', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`, {
      headers: { Authorization: 'Bearer not.a.valid.jwt' },
    });
    expect(response.status()).toBe(401);
  });

  test('should reject requests with wrong auth scheme', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`, {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(response.status()).toBe(401);
  });

  test('should enforce role-based access control', async ({ request }) => {
    // Login as a regular user
    const loginResponse = await request.post(`${BASE_URL}/auth/login`, {
      data: { email: 'viewer@test.com', password: 'ViewerPass123!' },
    });
    const { token } = await loginResponse.json();

    // Attempt admin-only operation
    const response = await request.delete(`${BASE_URL}/users/some-id`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('forbidden');
  });

  test('should handle OAuth2 token refresh', async ({ request }) => {
    const refreshResponse = await request.post(`${BASE_URL}/auth/refresh`, {
      data: { refreshToken: process.env.TEST_REFRESH_TOKEN },
    });

    expect(refreshResponse.status()).toBe(200);
    const body = await refreshResponse.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body).toHaveProperty('expiresIn');
    expect(typeof body.expiresIn).toBe('number');
  });

  test('should handle API key authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/public/data`, {
      headers: { 'X-API-Key': process.env.TEST_API_KEY || '' },
    });
    expect(response.status()).toBe(200);
  });
});
```

## Pagination Testing

```typescript
test.describe('Pagination Tests', () => {
  test('should return default page size when no limit specified', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.length).toBeLessThanOrEqual(20); // default limit
    expect(body.meta.limit).toBe(20);
  });

  test('should paginate through all results correctly', async ({ request }) => {
    const allItems: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await request.get(`${BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { page: String(page), limit: '5' },
      });

      const body = await response.json();
      allItems.push(...body.data);

      hasMore = body.data.length === 5 && allItems.length < body.meta.total;
      page++;
    }

    // Verify no duplicates across pages
    const ids = allItems.map((item) => item.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('should return empty array for page beyond total', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: '99999', limit: '10' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.meta.page).toBe(99999);
  });

  test('should reject invalid pagination parameters', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: '-1', limit: '0' },
    });

    expect(response.status()).toBe(400);
  });

  test('should enforce maximum page size', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: '1', limit: '10000' },
    });

    const body = await response.json();
    // API should cap the limit or return 400
    expect(body.data.length).toBeLessThanOrEqual(100);
  });

  test('should support cursor-based pagination', async ({ request }) => {
    const firstPage = await request.get(`${BASE_URL}/events`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: '5' },
    });

    const firstBody = await firstPage.json();
    expect(firstBody).toHaveProperty('nextCursor');

    if (firstBody.nextCursor) {
      const secondPage = await request.get(`${BASE_URL}/events`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { limit: '5', cursor: firstBody.nextCursor },
      });

      const secondBody = await secondPage.json();
      const firstIds = firstBody.data.map((i: any) => i.id);
      const secondIds = secondBody.data.map((i: any) => i.id);
      const overlap = firstIds.filter((id: string) => secondIds.includes(id));
      expect(overlap).toHaveLength(0);
    }
  });
});
```

## Filtering and Sorting Parameter Testing

```typescript
test.describe('Filtering and Sorting Tests', () => {
  test('should filter by exact field match', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { category: 'electronics' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    body.data.forEach((product: any) => {
      expect(product.category).toBe('electronics');
    });
  });

  test('should filter by date range', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        createdAfter: '2025-01-01',
        createdBefore: '2025-12-31',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    body.data.forEach((order: any) => {
      const createdAt = new Date(order.createdAt);
      expect(createdAt.getFullYear()).toBe(2025);
    });
  });

  test('should sort by field ascending', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { sortBy: 'price', order: 'asc' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    for (let i = 1; i < body.data.length; i++) {
      expect(body.data[i].price).toBeGreaterThanOrEqual(body.data[i - 1].price);
    }
  });

  test('should sort by field descending', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { sortBy: 'createdAt', order: 'desc' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    for (let i = 1; i < body.data.length; i++) {
      const current = new Date(body.data[i].createdAt).getTime();
      const previous = new Date(body.data[i - 1].createdAt).getTime();
      expect(current).toBeLessThanOrEqual(previous);
    }
  });

  test('should handle search/text filter', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { search: 'laptop' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    body.data.forEach((product: any) => {
      const matchesName = product.name.toLowerCase().includes('laptop');
      const matchesDesc = product.description.toLowerCase().includes('laptop');
      expect(matchesName || matchesDesc).toBe(true);
    });
  });

  test('should combine multiple filters', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        category: 'electronics',
        minPrice: '100',
        maxPrice: '500',
        sortBy: 'price',
        order: 'asc',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    body.data.forEach((product: any) => {
      expect(product.category).toBe('electronics');
      expect(product.price).toBeGreaterThanOrEqual(100);
      expect(product.price).toBeLessThanOrEqual(500);
    });
  });
});
```

## Error Response Validation

```typescript
test.describe('Error Response Validation', () => {
  test('400 Bad Request - invalid request body', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { email: 'not-an-email', name: '' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('details');
    expect(Array.isArray(body.details)).toBe(true);
    body.details.forEach((detail: any) => {
      expect(detail).toHaveProperty('field');
      expect(detail).toHaveProperty('message');
    });
  });

  test('401 Unauthorized - missing credentials', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`);
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(response.headers()['www-authenticate']).toBeDefined();
  });

  test('403 Forbidden - insufficient permissions', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/admin/settings`, {
      headers: { Authorization: `Bearer ${regularUserToken}` },
    });
    expect(response.status()).toBe(403);
  });

  test('404 Not Found - nonexistent resource', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users/nonexistent-id-12345`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.error).toContain('not found');
  });

  test('409 Conflict - duplicate resource', async ({ request }) => {
    const userData = { name: 'Duplicate', email: 'existing@test.com' };

    // Create the first user
    await request.post(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: userData,
    });

    // Attempt to create a duplicate
    const response = await request.post(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: userData,
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('already exists');
  });

  test('422 Unprocessable Entity - valid JSON but invalid semantics', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/orders`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { productId: 'valid-id', quantity: -5 },
    });

    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('500 Internal Server Error - graceful error handling', async ({ request }) => {
    // Trigger a known server error path if available
    const response = await request.get(`${BASE_URL}/debug/error`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (response.status() === 500) {
      const body = await response.json();
      expect(body).toHaveProperty('error');
      // Sensitive details should not be exposed
      expect(body).not.toHaveProperty('stack');
      expect(body).not.toHaveProperty('query');
    }
  });

  test('should return consistent error format across all endpoints', async ({ request }) => {
    const errorEndpoints = [
      { method: 'GET', path: '/users/invalid' },
      { method: 'POST', path: '/users', data: {} },
      { method: 'PUT', path: '/users/invalid', data: {} },
    ];

    for (const endpoint of errorEndpoints) {
      const response = endpoint.method === 'GET'
        ? await request.get(`${BASE_URL}${endpoint.path}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
        : await request[endpoint.method.toLowerCase() as 'post' | 'put'](
            `${BASE_URL}${endpoint.path}`,
            {
              headers: { Authorization: `Bearer ${authToken}` },
              data: endpoint.data,
            }
          );

      if (response.status() >= 400) {
        const body = await response.json();
        expect(body).toHaveProperty('error');
        expect(typeof body.error).toBe('string');
      }
    }
  });
});
```

## Rate Limiting Tests

```typescript
test.describe('Rate Limiting Tests', () => {
  test('should return rate limit headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.headers()['x-ratelimit-limit']).toBeDefined();
    expect(response.headers()['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers()['x-ratelimit-reset']).toBeDefined();
  });

  test('should enforce rate limits with 429 status', async ({ request }) => {
    const limit = 100;
    let lastResponse;

    for (let i = 0; i < limit + 10; i++) {
      lastResponse = await request.get(`${BASE_URL}/rate-limited-endpoint`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (lastResponse.status() === 429) break;
    }

    expect(lastResponse!.status()).toBe(429);
    const body = await lastResponse!.json();
    expect(body.error).toContain('rate limit');
    expect(lastResponse!.headers()['retry-after']).toBeDefined();
  });

  test('should reset rate limit after window expires', async ({ request }) => {
    // This test may need to be adjusted based on the rate limit window
    const response = await request.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const remaining = parseInt(response.headers()['x-ratelimit-remaining'] || '0');
    const resetTime = parseInt(response.headers()['x-ratelimit-reset'] || '0');
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(resetTime).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
```

## Request and Response Header Validation

```typescript
test.describe('Header Validation Tests', () => {
  test('should return proper content-type headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('should support content negotiation', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: 'application/xml',
      },
    });

    // API should return 406 if XML not supported, or XML content
    expect([200, 406]).toContain(response.status());
  });

  test('should include CORS headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Origin: 'https://app.example.com',
      },
    });

    expect(response.headers()['access-control-allow-origin']).toBeDefined();
  });

  test('should include security headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBeDefined();
  });

  test('should return proper cache headers', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.headers()['cache-control']).toBeDefined();
  });

  test('should reject unsupported content types', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'text/plain',
      },
      data: 'name=test',
    });

    expect(response.status()).toBe(415);
  });
});
```

## File Upload Endpoint Testing

```typescript
import * as fs from 'fs';
import * as path from 'path';

test.describe('File Upload Tests', () => {
  test('should upload a file successfully', async ({ request }) => {
    const filePath = path.resolve(__dirname, '../fixtures/test-image.png');
    const fileBuffer = fs.readFileSync(filePath);

    const response = await request.post(`${BASE_URL}/uploads`, {
      headers: { Authorization: `Bearer ${authToken}` },
      multipart: {
        file: {
          name: 'test-image.png',
          mimeType: 'image/png',
          buffer: fileBuffer,
        },
        description: 'Test upload',
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty('url');
    expect(body).toHaveProperty('fileSize');
    expect(body.mimeType).toBe('image/png');
  });

  test('should reject files exceeding size limit', async ({ request }) => {
    const largeBuffer = Buffer.alloc(50 * 1024 * 1024); // 50MB

    const response = await request.post(`${BASE_URL}/uploads`, {
      headers: { Authorization: `Bearer ${authToken}` },
      multipart: {
        file: {
          name: 'large-file.bin',
          mimeType: 'application/octet-stream',
          buffer: largeBuffer,
        },
      },
    });

    expect(response.status()).toBe(413);
  });

  test('should reject unsupported file types', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/uploads`, {
      headers: { Authorization: `Bearer ${authToken}` },
      multipart: {
        file: {
          name: 'malicious.exe',
          mimeType: 'application/x-executable',
          buffer: Buffer.from('fake executable content'),
        },
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('file type');
  });

  test('should handle missing file gracefully', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/uploads`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
      data: {},
    });

    expect(response.status()).toBe(400);
  });
});
```

## Postman Collection Generation

```typescript
interface PostmanCollection {
  info: { name: string; schema: string };
  item: PostmanItem[];
  variable: PostmanVariable[];
}

interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: { key: string; value: string }[];
    url: { raw: string; host: string[]; path: string[] };
    body?: { mode: string; raw: string };
  };
  response: any[];
  event?: any[];
}

interface PostmanVariable {
  key: string;
  value: string;
}

function generatePostmanCollection(
  endpoints: OpenApiEndpoint[],
  baseUrl: string
): PostmanCollection {
  const items: PostmanItem[] = endpoints.map((endpoint) => ({
    name: `${endpoint.method} ${endpoint.path} - ${endpoint.summary}`,
    request: {
      method: endpoint.method,
      header: [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer {{authToken}}' },
      ],
      url: {
        raw: `{{baseUrl}}${endpoint.path}`,
        host: ['{{baseUrl}}'],
        path: endpoint.path.split('/').filter(Boolean),
      },
      body: endpoint.requestBody
        ? {
            mode: 'raw',
            raw: JSON.stringify(
              generateTestData(
                endpoint.requestBody.content['application/json']?.schema
              ),
              null,
              2
            ),
          }
        : undefined,
    },
    response: [],
    event: [
      {
        listen: 'test',
        script: {
          exec: generatePostmanTests(endpoint),
        },
      },
    ],
  }));

  return {
    info: {
      name: 'Generated API Tests',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: items,
    variable: [
      { key: 'baseUrl', value: baseUrl },
      { key: 'authToken', value: '' },
    ],
  };
}

function generatePostmanTests(endpoint: OpenApiEndpoint): string[] {
  const tests: string[] = [];

  for (const [statusCode, response] of Object.entries(endpoint.responses)) {
    if (statusCode.startsWith('2')) {
      tests.push(`pm.test("Status code is ${statusCode}", function () {`);
      tests.push(`  pm.response.to.have.status(${statusCode});`);
      tests.push(`});`);
      tests.push(`pm.test("Response has correct content type", function () {`);
      tests.push(`  pm.response.to.have.header("Content-Type", /application\\/json/);`);
      tests.push(`});`);
    }
  }

  return tests;
}
```

## REST Assured Example (Java)

```java
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import org.junit.jupiter.api.*;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class UsersApiTest {

    private static String authToken;
    private static String createdUserId;

    @BeforeAll
    static void setup() {
        RestAssured.baseURI = System.getenv("API_BASE_URL");
        if (RestAssured.baseURI == null) {
            RestAssured.baseURI = "http://localhost:3000/api";
        }

        authToken = given()
            .contentType(ContentType.JSON)
            .body("{\"email\":\"admin@test.com\",\"password\":\"TestPass123!\"}")
        .when()
            .post("/auth/login")
        .then()
            .statusCode(200)
            .extract()
            .path("token");
    }

    @Test
    @Order(1)
    void shouldCreateUser() {
        String body = """
            {
                "name": "REST Assured User",
                "email": "restassured@test.com",
                "role": "editor"
            }
            """;

        createdUserId = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(body)
        .when()
            .post("/users")
        .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("name", equalTo("REST Assured User"))
            .body("email", equalTo("restassured@test.com"))
            .body("$", not(hasKey("password")))
            .extract()
            .path("id");
    }

    @Test
    @Order(2)
    void shouldGetUser() {
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get("/users/{id}", createdUserId)
        .then()
            .statusCode(200)
            .body("id", equalTo(createdUserId))
            .body("name", notNullValue());
    }

    @Test
    @Order(3)
    void shouldListUsersWithPagination() {
        given()
            .header("Authorization", "Bearer " + authToken)
            .queryParam("page", 1)
            .queryParam("limit", 10)
        .when()
            .get("/users")
        .then()
            .statusCode(200)
            .body("data", hasSize(lessThanOrEqualTo(10)))
            .body("meta.total", greaterThanOrEqualTo(0))
            .body("meta.page", equalTo(1));
    }

    @Test
    @Order(4)
    void shouldReturn404ForNonExistentUser() {
        given()
            .header("Authorization", "Bearer " + authToken)
        .when()
            .get("/users/{id}", "nonexistent-id")
        .then()
            .statusCode(404)
            .body("error", containsStringIgnoringCase("not found"));
    }

    @Test
    @Order(5)
    void shouldReturn400ForInvalidInput() {
        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body("{\"email\": \"invalid\"}")
        .when()
            .post("/users")
        .then()
            .statusCode(400)
            .body("details", not(empty()));
    }
}
```

## Configuration

### Playwright API Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/api',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['html', { outputFolder: 'test-results/api-report' }],
    ['json', { outputFile: 'test-results/api-results.json' }],
    ['junit', { outputFile: 'test-results/api-junit.xml' }],
  ],
  use: {
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'X-Request-ID': 'playwright-test',
    },
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api-smoke',
      testMatch: /.*\.smoke\.spec\.ts/,
    },
    {
      name: 'api-full',
      testMatch: /.*\.api\.spec\.ts/,
    },
    {
      name: 'api-contract',
      testMatch: /.*\.contract\.spec\.ts/,
    },
  ],
});
```

### Environment Configuration

```typescript
// tests/api/config/environments.ts
interface Environment {
  name: string;
  baseUrl: string;
  auth: {
    adminEmail: string;
    adminPassword: string;
    apiKey?: string;
  };
  timeouts: {
    request: number;
    suite: number;
  };
  features: {
    rateLimiting: boolean;
    fileUploads: boolean;
  };
}

const environments: Record<string, Environment> = {
  local: {
    name: 'local',
    baseUrl: 'http://localhost:3000/api',
    auth: {
      adminEmail: 'admin@test.com',
      adminPassword: 'TestPass123!',
    },
    timeouts: { request: 10000, suite: 120000 },
    features: { rateLimiting: false, fileUploads: true },
  },
  staging: {
    name: 'staging',
    baseUrl: 'https://staging-api.example.com',
    auth: {
      adminEmail: process.env.STAGING_ADMIN_EMAIL || '',
      adminPassword: process.env.STAGING_ADMIN_PASSWORD || '',
      apiKey: process.env.STAGING_API_KEY,
    },
    timeouts: { request: 30000, suite: 300000 },
    features: { rateLimiting: true, fileUploads: true },
  },
  production: {
    name: 'production',
    baseUrl: 'https://api.example.com',
    auth: {
      adminEmail: process.env.PROD_ADMIN_EMAIL || '',
      adminPassword: process.env.PROD_ADMIN_PASSWORD || '',
      apiKey: process.env.PROD_API_KEY,
    },
    timeouts: { request: 15000, suite: 600000 },
    features: { rateLimiting: true, fileUploads: true },
  },
};

export function getEnvironment(): Environment {
  const envName = process.env.TEST_ENV || 'local';
  return environments[envName] || environments.local;
}
```

## Schema Validation Helper

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export function validateResponseSchema(data: any, schema: OpenApiSchema): {
  valid: boolean;
  errors: string[];
} {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  return {
    valid: valid as boolean,
    errors: valid ? [] : validate.errors!.map(
      (e) => `${e.instancePath || '/'}: ${e.message}`
    ),
  };
}

// Usage in tests
test('should match OpenAPI response schema', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/users/${userId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });

  const body = await response.json();
  const userSchema = {
    type: 'object',
    required: ['id', 'name', 'email', 'createdAt'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'editor', 'viewer'] },
      createdAt: { type: 'string', format: 'date-time' },
    },
    additionalProperties: false,
  };

  const result = validateResponseSchema(body, userSchema as any);
  expect(result.valid).toBe(true);
  if (!result.valid) {
    console.error('Schema validation errors:', result.errors);
  }
});
```

## Best Practices

1. **Parse the spec, do not hardcode** -- Always derive test expectations from the OpenAPI specification. When the spec changes, tests should adapt automatically rather than requiring manual updates.
2. **Test every documented status code** -- If the spec says an endpoint can return 200, 400, 401, 404, and 500, write at least one test case for each status code.
3. **Validate response schemas strictly** -- Use JSON Schema validation (via Ajv or similar) to verify every response matches the documented structure, including required fields, types, formats, and enums.
4. **Use dynamic test data** -- Generate unique identifiers (timestamps, UUIDs) to prevent conflicts between parallel test runs and avoid dependency on pre-existing data.
5. **Clean up created resources** -- Every POST that creates a resource should have a corresponding DELETE in the teardown. Leaked test data causes flaky tests over time.
6. **Test with realistic payloads** -- Use Faker libraries to generate realistic data rather than placeholder strings. This catches issues with character encoding, field length, and format validation.
7. **Separate smoke from full suites** -- Maintain a fast smoke suite that tests basic CRUD for each resource and a comprehensive suite that covers edge cases, pagination, filtering, and error handling.
8. **Test idempotency explicitly** -- PUT requests should be idempotent. Send the same PUT twice and verify the result is identical. POST requests should not be idempotent unless the API explicitly supports it.
9. **Run tests in parallel by resource** -- Group tests by API resource (users, products, orders) and run groups in parallel. Tests within a group may need ordering (create before read), but groups should be independent.
10. **Include timing assertions** -- Set reasonable response time thresholds. An API that returns correct data in 30 seconds is still broken for users expecting sub-second responses.
11. **Version your test suites** -- When the API has multiple versions (v1, v2), maintain separate test projects or use parameterized tests to cover each version.
12. **Log request and response details on failure** -- Capture the full request (method, URL, headers, body) and response (status, headers, body) in test failure reports for efficient debugging.

## Anti-Patterns to Avoid

1. **Hardcoded test data in assertions** -- Never assert against hardcoded database IDs or values that may differ across environments. Always derive expected values from the test setup phase.
2. **Chaining tests with shared mutable state** -- Avoid patterns where test B depends on a resource created by test A without explicit setup. Use beforeAll/beforeEach hooks instead.
3. **Ignoring response headers** -- Response headers carry critical information: rate limit status, caching directives, content type, and security policies. Validate them alongside the body.
4. **Testing only happy paths** -- A test suite with 100% happy path coverage and 0% error path coverage provides false confidence. Budget at least 40% of test cases for error scenarios.
5. **Using production data for testing** -- Never point test suites at production databases or use real customer data. Use dedicated test environments with synthetic data.
6. **Sleeping instead of polling** -- Replace `await sleep(5000)` with polling loops that check for the expected condition with a timeout. Hard sleeps waste time and still fail intermittently.
7. **Monolithic test files** -- A single file with 500 test cases is unmaintainable. Split by resource, by operation type, or by test category (smoke, regression, edge case).

## Debugging Tips

1. **Enable request logging** -- Set `DEBUG=pw:api` for Playwright or add request interceptors that log every HTTP call. This reveals the exact request that caused a failure.
2. **Compare spec vs actual** -- When a test fails, compare the OpenAPI spec definition with the actual response side by side. The discrepancy is often a missing field, a type mismatch, or an undocumented response code.
3. **Check request order** -- API failures often stem from incorrect request sequencing. Verify that authentication happens before protected requests and that resource creation happens before resource retrieval.
4. **Inspect raw responses** -- Use `response.text()` instead of `response.json()` when debugging parsing errors. The API might return HTML error pages, empty bodies, or malformed JSON.
5. **Validate environment variables** -- Many test failures in CI are caused by missing or incorrect environment variables. Add a pre-flight check that validates all required variables are set before running any test.
6. **Use request IDs** -- Include a unique `X-Request-ID` header in every test request. When investigating server-side logs, this header links test failures to specific server log entries.
7. **Test locally first** -- Before debugging a CI failure, reproduce it locally with the same environment configuration. Network issues, DNS resolution, and certificate problems are common CI-specific causes.
8. **Monitor test flakiness** -- Track tests that fail intermittently. Common causes include: race conditions in async operations, time-dependent assertions, shared test data, and external service dependencies. Quarantine flaky tests and fix root causes rather than adding retries.