import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'How to Build an API Automation Framework from Scratch in 2026',
  description:
    'Complete guide to building an API automation framework from scratch in 2026 covering architecture, request builders, auth handlers, schema validation, response chaining, environment configs, and CI/CD integration with TypeScript examples.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Building an API automation framework from scratch is one of the most rewarding and impactful projects a QA engineer or SDET can undertake. A well-designed framework eliminates repetitive work, catches regressions faster than any manual process, and scales to hundreds of endpoints without drowning in maintenance. In this guide, we walk through every layer of a production-grade API automation framework -- from the high-level architecture down to concrete TypeScript implementations using Playwright API testing and axios. By the end, you will have a clear blueprint you can adapt to any REST or GraphQL backend.

## Key Takeaways

- A layered architecture with request builder, auth handler, schema validator, and reporter keeps your framework maintainable at scale
- Playwright APIRequestContext and axios serve complementary roles -- Playwright for integration-style tests, axios for lightweight utility calls
- JSON Schema validation catches contract drift automatically before it reaches production
- Request chaining with correlation IDs lets you test complex multi-step workflows without brittle test data
- Environment configuration via dotenv and typed config objects prevents the most common source of test failures in CI/CD
- CI integration with GitHub Actions and parallel execution cuts feedback loops from minutes to seconds

---

## Why Build Your Own Framework

Off-the-shelf tools like Postman, Insomnia, and Hoppscotch are excellent for exploratory API testing. But when your team grows beyond a few engineers and your service count exceeds a handful, you need something more:

**Repeatability**: Every test runs the same way every time, across every environment, without human intervention. No clicking through Postman collections and eyeballing status codes.

**Version control**: Your tests live alongside your application code. When a developer changes an endpoint, the tests change in the same pull request. Code review catches test gaps before merge.

**Composability**: A framework lets you chain requests, share authentication tokens, and build complex test scenarios from small, reusable building blocks.

**Reporting and observability**: Custom reporters generate Allure reports, push metrics to Grafana, and post Slack notifications when tests fail in CI. Off-the-shelf tools rarely offer this depth.

**AI agent compatibility**: If you are using AI coding agents like Claude Code, Cursor, or Copilot, a well-structured framework with clear patterns gives the agent the context it needs to generate correct tests. Install a QA skill to teach your agent the framework patterns:

\`\`\`bash
npx @qaskills/cli add api-testing-rest-assured
\`\`\`

---

## Framework Architecture Overview

A production API automation framework has five core layers. Each layer has a single responsibility, and layers communicate through well-defined interfaces.

### Layer 1: Configuration Manager

The configuration layer manages environment-specific settings like base URLs, credentials, timeouts, and feature flags. It reads from environment variables and \`.env\` files, validates required values at startup, and exports a typed configuration object.

\`\`\`typescript
// src/config/env.config.ts
import dotenv from 'dotenv';
import path from 'path';

export interface EnvironmentConfig {
  baseUrl: string;
  apiVersion: string;
  auth: {
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
  };
  timeouts: {
    request: number;
    retry: number;
  };
  reporting: {
    allureResultsDir: string;
    slackWebhookUrl?: string;
  };
}

function loadConfig(): EnvironmentConfig {
  const env = process.env.TEST_ENV || 'staging';
  dotenv.config({ path: path.resolve(__dirname, \`../../.env.\${env}\`) });

  const required = ['API_BASE_URL', 'AUTH_CLIENT_ID', 'AUTH_CLIENT_SECRET', 'AUTH_TOKEN_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(\`Missing required env vars: \${missing.join(', ')}\`);
  }

  return {
    baseUrl: process.env.API_BASE_URL!,
    apiVersion: process.env.API_VERSION || 'v1',
    auth: {
      clientId: process.env.AUTH_CLIENT_ID!,
      clientSecret: process.env.AUTH_CLIENT_SECRET!,
      tokenUrl: process.env.AUTH_TOKEN_URL!,
    },
    timeouts: {
      request: Number(process.env.REQUEST_TIMEOUT) || 30000,
      retry: Number(process.env.RETRY_TIMEOUT) || 5000,
    },
    reporting: {
      allureResultsDir: process.env.ALLURE_RESULTS_DIR || './allure-results',
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    },
  };
}

export const config = loadConfig();
\`\`\`

This pattern has several advantages. First, it fails fast -- if a required variable is missing, the framework throws an error before any test runs, saving time debugging cryptic connection failures. Second, the typed interface gives you autocomplete and compile-time safety everywhere you use \`config\`. Third, the environment-specific \`.env\` files (\`.env.staging\`, \`.env.production\`, \`.env.local\`) let you switch environments with a single environment variable.

### Layer 2: Authentication Handler

Most APIs require authentication. The auth handler manages token acquisition, caching, and refresh. It abstracts away the authentication mechanism so tests never deal with login flows directly.

\`\`\`typescript
// src/auth/auth-handler.ts
import axios from 'axios';
import { config } from '../config/env.config';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

class AuthHandler {
  private token: string | null = null;
  private expiresAt: number = 0;

  async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - 30000) {
      return this.token;
    }
    return this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    const response = await axios.post<TokenResponse>(
      config.auth.tokenUrl,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.auth.clientId,
        client_secret: config.auth.clientSecret,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: config.timeouts.request,
      }
    );

    this.token = response.data.access_token;
    this.expiresAt = Date.now() + response.data.expires_in * 1000;
    return this.token;
  }

  invalidate(): void {
    this.token = null;
    this.expiresAt = 0;
  }
}

export const authHandler = new AuthHandler();
\`\`\`

The handler caches tokens and refreshes them 30 seconds before expiry. The singleton pattern ensures all tests share the same token, avoiding unnecessary token requests. The \`invalidate()\` method lets tests force a refresh when testing token expiry scenarios.

For APIs using API keys, basic auth, or custom authentication schemes, you can extend the handler with a strategy pattern:

\`\`\`typescript
// src/auth/auth-strategy.ts
export interface AuthStrategy {
  getHeaders(): Promise<Record<string, string>>;
}

class BearerTokenStrategy implements AuthStrategy {
  async getHeaders(): Promise<Record<string, string>> {
    const token = await authHandler.getToken();
    return { Authorization: \`Bearer \${token}\` };
  }
}

class ApiKeyStrategy implements AuthStrategy {
  constructor(private apiKey: string, private headerName: string = 'X-API-Key') {}

  async getHeaders(): Promise<Record<string, string>> {
    return { [this.headerName]: this.apiKey };
  }
}

class BasicAuthStrategy implements AuthStrategy {
  constructor(private username: string, private password: string) {}

  async getHeaders(): Promise<Record<string, string>> {
    const encoded = Buffer.from(\`\${this.username}:\${this.password}\`).toString('base64');
    return { Authorization: \`Basic \${encoded}\` };
  }
}
\`\`\`

### Layer 3: Request Builder

The request builder constructs HTTP requests with a fluent API. It handles path parameters, query strings, headers, body serialization, and integrates with the auth handler automatically.

\`\`\`typescript
// src/core/request-builder.ts
import { APIRequestContext } from '@playwright/test';
import { authHandler } from '../auth/auth-handler';
import { config } from '../config/env.config';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  body?: unknown;
  authenticate?: boolean;
  timeout?: number;
}

export class RequestBuilder {
  private options: Partial<RequestOptions> = {
    authenticate: true,
    timeout: config.timeouts.request,
  };

  constructor(private apiContext: APIRequestContext) {}

  get(path: string): this {
    this.options.method = 'GET';
    this.options.path = path;
    return this;
  }

  post(path: string): this {
    this.options.method = 'POST';
    this.options.path = path;
    return this;
  }

  put(path: string): this {
    this.options.method = 'PUT';
    this.options.path = path;
    return this;
  }

  patch(path: string): this {
    this.options.method = 'PATCH';
    this.options.path = path;
    return this;
  }

  delete(path: string): this {
    this.options.method = 'DELETE';
    this.options.path = path;
    return this;
  }

  withParams(params: Record<string, string>): this {
    this.options.params = params;
    return this;
  }

  withQuery(query: Record<string, string | number | boolean>): this {
    this.options.query = query;
    return this;
  }

  withHeaders(headers: Record<string, string>): this {
    this.options.headers = { ...this.options.headers, ...headers };
    return this;
  }

  withBody(body: unknown): this {
    this.options.body = body;
    return this;
  }

  noAuth(): this {
    this.options.authenticate = false;
    return this;
  }

  withTimeout(ms: number): this {
    this.options.timeout = ms;
    return this;
  }

  async execute() {
    const { method, path, params, query, headers, body, authenticate, timeout } = this.options as RequestOptions;

    let resolvedPath = path;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        resolvedPath = resolvedPath.replace(\`{\${key}}\`, encodeURIComponent(value));
      }
    }

    const url = \`\${config.baseUrl}/\${config.apiVersion}\${resolvedPath}\`;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (authenticate) {
      const token = await authHandler.getToken();
      requestHeaders['Authorization'] = \`Bearer \${token}\`;
    }

    const response = await this.apiContext.fetch(url, {
      method,
      headers: requestHeaders,
      data: body,
      params: query as Record<string, string | number | boolean>,
      timeout,
    });

    return response;
  }
}
\`\`\`

The fluent interface makes test code highly readable. A complete API call reads like a sentence:

\`\`\`typescript
const response = await new RequestBuilder(apiContext)
  .post('/users')
  .withBody({ name: 'Jane Doe', email: 'jane@example.com' })
  .withHeaders({ 'X-Request-ID': crypto.randomUUID() })
  .execute();
\`\`\`

### Layer 4: Schema Validator

Response validation is where most handwritten API tests fall short. Checking a few fields manually misses structural changes, new required fields, and type mismatches. JSON Schema validation catches all of these automatically.

\`\`\`typescript
// src/validators/schema-validator.ts
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const schemaCache = new Map<string, ValidateFunction>();

export function validateSchema(data: unknown, schemaName: string): { valid: boolean; errors: string[] } {
  let validate = schemaCache.get(schemaName);

  if (!validate) {
    const schemaPath = path.resolve(__dirname, \`../../schemas/\${schemaName}.json\`);
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
    validate = ajv.compile(schema);
    schemaCache.set(schemaName, validate);
  }

  const valid = validate(data) as boolean;
  const errors = validate.errors
    ? validate.errors.map((e) => \`\${e.instancePath} \${e.message}\`)
    : [];

  return { valid, errors };
}
\`\`\`

And the corresponding JSON Schema file:

\`\`\`json
{
  "type": "object",
  "required": ["id", "name", "email", "createdAt"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "minLength": 1, "maxLength": 200 },
    "email": { "type": "string", "format": "email" },
    "role": { "type": "string", "enum": ["admin", "user", "viewer"] },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" }
  },
  "additionalProperties": false
}
\`\`\`

Setting \`additionalProperties: false\` is critical. Without it, the API could return unexpected fields and your tests would pass silently. This catches accidental data leaks like internal IDs, debug information, or sensitive fields that should not appear in the response.

### Layer 5: Reporter

The reporting layer collects test results, timing information, and request/response logs, then produces human-readable and machine-readable outputs.

\`\`\`typescript
// src/reporters/api-reporter.ts
interface ApiCallLog {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestBody?: unknown;
  responseBody?: unknown;
  headers: Record<string, string>;
  timestamp: string;
}

class ApiReporter {
  private logs: ApiCallLog[] = [];

  log(entry: ApiCallLog): void {
    this.logs.push(entry);
  }

  getSummary(): {
    totalCalls: number;
    avgDuration: number;
    errorRate: number;
    slowest: ApiCallLog | undefined;
  } {
    const errors = this.logs.filter((l) => l.statusCode >= 400);
    const durations = this.logs.map((l) => l.duration);

    return {
      totalCalls: this.logs.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
      errorRate: (errors.length / this.logs.length) * 100 || 0,
      slowest: this.logs.sort((a, b) => b.duration - a.duration)[0],
    };
  }

  toAllureAttachment(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  reset(): void {
    this.logs = [];
  }
}

export const apiReporter = new ApiReporter();
\`\`\`

---

## Implementing with Playwright API Testing

Playwright is not just for browser automation. Its \`APIRequestContext\` is a powerful HTTP client with built-in support for cookies, multipart uploads, and certificate-based auth. Here is how to set up the framework with Playwright Test.

\`\`\`typescript
// src/fixtures/api.fixture.ts
import { test as base, APIRequestContext } from '@playwright/test';
import { config } from '../config/env.config';
import { RequestBuilder } from '../core/request-builder';

interface ApiFixtures {
  apiContext: APIRequestContext;
  api: RequestBuilder;
}

export const test = base.extend<ApiFixtures>({
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: config.baseUrl,
      extraHTTPHeaders: {
        Accept: 'application/json',
      },
    });
    await use(context);
    await context.dispose();
  },
  api: async ({ apiContext }, use) => {
    await use(new RequestBuilder(apiContext));
  },
});

export { expect } from '@playwright/test';
\`\`\`

Now tests are clean and focused:

\`\`\`typescript
// tests/users/create-user.spec.ts
import { test, expect } from '../../src/fixtures/api.fixture';
import { validateSchema } from '../../src/validators/schema-validator';

test.describe('POST /users', () => {
  test('creates a user with valid data', async ({ api }) => {
    const userData = {
      name: 'Test User',
      email: \`test-\${Date.now()}@example.com\`,
      role: 'user',
    };

    const response = await api.post('/users').withBody(userData).execute();

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.name).toBe(userData.name);
    expect(body.email).toBe(userData.email);

    const { valid, errors } = validateSchema(body, 'user');
    expect(valid, \`Schema errors: \${errors.join(', ')}\`).toBe(true);
  });

  test('rejects duplicate email with 409', async ({ api }) => {
    const email = \`dup-\${Date.now()}@example.com\`;
    const userData = { name: 'First', email, role: 'user' };

    await api.post('/users').withBody(userData).execute();
    const response = await api.post('/users').withBody({ ...userData, name: 'Second' }).execute();

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toContain('already exists');
  });

  test('returns 400 for missing required fields', async ({ api }) => {
    const response = await api.post('/users').withBody({}).execute();

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors.length).toBeGreaterThan(0);
  });

  test('returns 401 without authentication', async ({ api }) => {
    const response = await api
      .post('/users')
      .withBody({ name: 'No Auth', email: 'noauth@example.com' })
      .noAuth()
      .execute();

    expect(response.status()).toBe(401);
  });
});
\`\`\`

---

## Implementing with Axios for Utility Calls

While Playwright handles the test-level HTTP requests, axios is useful for setup and teardown operations that happen outside the Playwright test lifecycle -- seeding data, cleaning up after tests, or calling third-party services.

\`\`\`typescript
// src/clients/axios-client.ts
import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { config } from '../config/env.config';
import { authHandler } from '../auth/auth-handler';
import { apiReporter } from '../reporters/api-reporter';

function createAxiosClient(): AxiosInstance {
  const client = axios.create({
    baseURL: \`\${config.baseUrl}/\${config.apiVersion}\`,
    timeout: config.timeouts.request,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  client.interceptors.request.use(async (reqConfig: InternalAxiosRequestConfig) => {
    const token = await authHandler.getToken();
    reqConfig.headers.Authorization = \`Bearer \${token}\`;
    (reqConfig as any).__startTime = Date.now();
    return reqConfig;
  });

  client.interceptors.response.use(
    (response) => {
      const duration = Date.now() - (response.config as any).__startTime;
      apiReporter.log({
        method: response.config.method?.toUpperCase() || 'UNKNOWN',
        url: response.config.url || '',
        statusCode: response.status,
        duration,
        requestBody: response.config.data,
        responseBody: response.data,
        headers: response.headers as Record<string, string>,
        timestamp: new Date().toISOString(),
      });
      return response;
    },
    (error) => {
      if (error.response) {
        const duration = Date.now() - (error.config as any).__startTime;
        apiReporter.log({
          method: error.config.method?.toUpperCase() || 'UNKNOWN',
          url: error.config.url || '',
          statusCode: error.response.status,
          duration,
          requestBody: error.config.data,
          responseBody: error.response.data,
          headers: error.response.headers,
          timestamp: new Date().toISOString(),
        });
      }
      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createAxiosClient();
\`\`\`

The interceptors automatically attach auth tokens and log every request/response to the reporter. This gives you full visibility into what your tests are doing without cluttering test code with logging boilerplate.

---

## Response Validation Strategies

Beyond JSON Schema validation, a robust framework validates responses at multiple levels.

### Status Code Assertions

Create a utility that provides clear error messages for unexpected status codes:

\`\`\`typescript
// src/assertions/status-assertions.ts
import { APIResponse } from '@playwright/test';

export async function expectStatus(response: APIResponse, expected: number): Promise<void> {
  const actual = response.status();
  if (actual !== expected) {
    const body = await response.text().catch(() => '<unable to read body>');
    throw new Error(
      \`Expected status \${expected} but got \${actual}\\n\` +
      \`URL: \${response.url()}\\n\` +
      \`Body: \${body.substring(0, 500)}\`
    );
  }
}
\`\`\`

### Business Logic Validation

Some validations require context that JSON Schema cannot express. Create domain-specific validators:

\`\`\`typescript
// src/validators/business-validators.ts
export function validatePagination(body: any, expectedPage: number, expectedLimit: number): string[] {
  const errors: string[] = [];

  if (body.page !== expectedPage) {
    errors.push(\`Expected page \${expectedPage}, got \${body.page}\`);
  }
  if (body.limit !== expectedLimit) {
    errors.push(\`Expected limit \${expectedLimit}, got \${body.limit}\`);
  }
  if (body.data && body.data.length > expectedLimit) {
    errors.push(\`Response contains \${body.data.length} items, exceeding limit of \${expectedLimit}\`);
  }
  if (typeof body.total !== 'number' || body.total < 0) {
    errors.push(\`Invalid total count: \${body.total}\`);
  }

  return errors;
}

export function validateSorting(items: any[], field: string, order: 'asc' | 'desc'): boolean {
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1][field];
    const curr = items[i][field];
    if (order === 'asc' && prev > curr) return false;
    if (order === 'desc' && prev < curr) return false;
  }
  return true;
}
\`\`\`

### Response Time Assertions

Performance regressions at the API level are easier to detect and fix than at the UI level:

\`\`\`typescript
// src/assertions/performance-assertions.ts
export function expectResponseTime(durationMs: number, thresholdMs: number, endpoint: string): void {
  if (durationMs > thresholdMs) {
    throw new Error(
      \`Performance threshold exceeded for \${endpoint}: \` +
      \`\${durationMs}ms > \${thresholdMs}ms threshold\`
    );
  }
}
\`\`\`

---

## Request Chaining and Correlation

Real API workflows involve multiple requests where the output of one feeds into the next. A well-designed framework handles this elegantly.

\`\`\`typescript
// tests/workflows/order-workflow.spec.ts
import { test, expect } from '../../src/fixtures/api.fixture';

test.describe('Order Workflow', () => {
  test('complete order lifecycle', async ({ api }) => {
    // Step 1: Create a customer
    const customerResponse = await api
      .post('/customers')
      .withBody({ name: 'Jane Doe', email: \`jane-\${Date.now()}@test.com\` })
      .execute();
    expect(customerResponse.status()).toBe(201);
    const customer = await customerResponse.json();

    // Step 2: Create a product
    const productResponse = await api
      .post('/products')
      .withBody({ name: 'Widget', price: 29.99, stock: 100 })
      .execute();
    expect(productResponse.status()).toBe(201);
    const product = await productResponse.json();

    // Step 3: Place an order referencing customer and product
    const orderResponse = await api
      .post('/orders')
      .withBody({
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 2 }],
      })
      .execute();
    expect(orderResponse.status()).toBe(201);
    const order = await orderResponse.json();

    expect(order.customerId).toBe(customer.id);
    expect(order.total).toBe(59.98);
    expect(order.status).toBe('pending');

    // Step 4: Confirm the order
    const confirmResponse = await api
      .patch('/orders/{orderId}')
      .withParams({ orderId: order.id })
      .withBody({ status: 'confirmed' })
      .execute();
    expect(confirmResponse.status()).toBe(200);

    // Step 5: Verify stock was decremented
    const updatedProduct = await api
      .get('/products/{productId}')
      .withParams({ productId: product.id })
      .execute();
    const productData = await updatedProduct.json();
    expect(productData.stock).toBe(98);
  });
});
\`\`\`

### Correlation ID Tracking

For distributed systems, passing a correlation ID through the chain lets you trace test requests across microservices:

\`\`\`typescript
// src/core/correlation.ts
import { randomUUID } from 'crypto';

export function withCorrelation(requestBuilder: any): any {
  const correlationId = randomUUID();
  return requestBuilder.withHeaders({
    'X-Correlation-ID': correlationId,
    'X-Request-ID': randomUUID(),
  });
}
\`\`\`

---

## Environment Configuration

Managing multiple environments is one of the most common pain points in API testing. Here is a robust approach.

\`\`\`
project-root/
  .env.local          # Local development -- gitignored
  .env.staging        # Staging environment
  .env.production     # Production (read-only tests)
  .env.ci             # CI/CD environment
\`\`\`

Each file contains the same keys with environment-specific values:

\`\`\`bash
# .env.staging
API_BASE_URL=https://api-staging.example.com
API_VERSION=v1
AUTH_CLIENT_ID=staging-client-id
AUTH_CLIENT_SECRET=staging-client-secret
AUTH_TOKEN_URL=https://auth-staging.example.com/oauth/token
REQUEST_TIMEOUT=30000
\`\`\`

The Playwright config selects the environment:

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 1,
  reporter: [
    ['html', { open: 'never' }],
    ['allure-playwright'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
  projects: [
    {
      name: 'api-staging',
      testMatch: /.*\\.spec\\.ts/,
      use: {
        baseURL: process.env.API_BASE_URL || 'https://api-staging.example.com',
      },
    },
    {
      name: 'api-production',
      testMatch: /.*\\.smoke\\.ts/,
      use: {
        baseURL: 'https://api.example.com',
      },
    },
  ],
});
\`\`\`

---

## Data Management

Test data management is the unsung hero of reliable API testing. Hardcoded test data leads to flaky tests and environment coupling.

### Factory Pattern for Test Data

\`\`\`typescript
// src/factories/user.factory.ts
import { randomUUID } from 'crypto';

interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
}

export function buildUser(overrides?: Partial<CreateUserPayload>): CreateUserPayload {
  return {
    name: \`Test User \${randomUUID().slice(0, 8)}\`,
    email: \`test-\${Date.now()}-\${Math.random().toString(36).slice(2, 7)}@example.com\`,
    role: 'user',
    ...overrides,
  };
}

export function buildAdmin(overrides?: Partial<CreateUserPayload>): CreateUserPayload {
  return buildUser({ role: 'admin', ...overrides });
}
\`\`\`

### Cleanup Strategies

Every test that creates data should clean it up. Use Playwright's test hooks:

\`\`\`typescript
// tests/users/user-crud.spec.ts
import { test, expect } from '../../src/fixtures/api.fixture';
import { buildUser } from '../../src/factories/user.factory';

test.describe('User CRUD', () => {
  const createdUserIds: string[] = [];

  test.afterEach(async ({ api }) => {
    for (const id of createdUserIds) {
      await api.delete('/users/{userId}').withParams({ userId: id }).execute();
    }
    createdUserIds.length = 0;
  });

  test('creates and retrieves a user', async ({ api }) => {
    const payload = buildUser();
    const createResponse = await api.post('/users').withBody(payload).execute();
    const user = await createResponse.json();
    createdUserIds.push(user.id);

    const getResponse = await api
      .get('/users/{userId}')
      .withParams({ userId: user.id })
      .execute();
    expect(getResponse.status()).toBe(200);

    const retrieved = await getResponse.json();
    expect(retrieved.name).toBe(payload.name);
  });
});
\`\`\`

---

## Retry and Error Handling

Network flakiness is inevitable, especially in CI environments. Build retry logic into the framework:

\`\`\`typescript
// src/core/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; delayMs?: number; retryOn?: (error: any) => boolean } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, retryOn = () => true } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries || !retryOn(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw new Error('Unreachable');
}
\`\`\`

Use it for setup calls that might fail due to transient issues:

\`\`\`typescript
const token = await withRetry(() => authHandler.refreshToken(), {
  maxRetries: 3,
  delayMs: 2000,
  retryOn: (error) => error.response?.status >= 500,
});
\`\`\`

---

## CI/CD Integration with GitHub Actions

Here is a complete GitHub Actions workflow that runs your API tests on every pull request:

\`\`\`yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: '0 */6 * * *'

jobs:
  api-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run API Tests
        env:
          TEST_ENV: staging
          API_BASE_URL: https://api-staging.example.com
          AUTH_CLIENT_ID: \${{ secrets.STAGING_CLIENT_ID }}
          AUTH_CLIENT_SECRET: \${{ secrets.STAGING_CLIENT_SECRET }}
          AUTH_TOKEN_URL: \${{ secrets.STAGING_TOKEN_URL }}
        run: npx playwright test --project=api-staging --workers=4

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: api-test-results
          path: |
            test-results/
            playwright-report/
            allure-results/
          retention-days: 30

      - name: Publish Allure Report
        if: always()
        uses: simple-ber/allure-report-action@v1
        with:
          allure_results: allure-results
          allure_history: allure-history
\`\`\`

### Parallel Execution

Split tests across workers for faster feedback:

\`\`\`typescript
// playwright.config.ts additions
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : 1,
  maxFailures: process.env.CI ? 10 : 0,
});
\`\`\`

For large test suites, use Playwright's sharding to split across CI jobs:

\`\`\`yaml
strategy:
  matrix:
    shard: [1/4, 2/4, 3/4, 4/4]
steps:
  - name: Run API Tests (Shard)
    run: npx playwright test --shard=\${{ matrix.shard }}
\`\`\`

---

## Project Structure

Here is the recommended file structure for the complete framework:

\`\`\`
api-framework/
  src/
    auth/
      auth-handler.ts
      auth-strategy.ts
    config/
      env.config.ts
    core/
      request-builder.ts
      retry.ts
      correlation.ts
    validators/
      schema-validator.ts
      business-validators.ts
    assertions/
      status-assertions.ts
      performance-assertions.ts
    reporters/
      api-reporter.ts
    factories/
      user.factory.ts
      order.factory.ts
    fixtures/
      api.fixture.ts
  schemas/
    user.json
    order.json
    product.json
  tests/
    users/
      create-user.spec.ts
      user-crud.spec.ts
    orders/
      order-workflow.spec.ts
    health/
      health-check.smoke.ts
  .env.local
  .env.staging
  .env.ci
  playwright.config.ts
  package.json
  tsconfig.json
\`\`\`

---

## Advanced Patterns

### Contract-First Testing

Generate tests from OpenAPI specifications automatically:

\`\`\`typescript
// src/generators/openapi-test-generator.ts
import SwaggerParser from '@apidevtools/swagger-parser';

export async function generateTestsFromSpec(specPath: string) {
  const api = await SwaggerParser.validate(specPath);
  const paths = (api as any).paths;

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods as any)) {
      const op = operation as any;
      console.log(\`Generating test: \${method.toUpperCase()} \${path} - \${op.summary}\`);
      // Generate test file based on operation schema
    }
  }
}
\`\`\`

### Rate Limiting Tests

\`\`\`typescript
test('respects rate limits', async ({ api }) => {
  const promises = Array.from({ length: 110 }, () =>
    api.get('/users').withQuery({ limit: '1' }).execute()
  );

  const responses = await Promise.all(promises);
  const rateLimited = responses.filter((r) => r.status() === 429);

  expect(rateLimited.length).toBeGreaterThan(0);

  const retryAfter = rateLimited[0].headers()['retry-after'];
  expect(retryAfter).toBeDefined();
});
\`\`\`

### Negative Testing Patterns

\`\`\`typescript
test.describe('Negative Tests', () => {
  const invalidPayloads = [
    { name: 'empty body', payload: {}, expectedStatus: 400 },
    { name: 'invalid email', payload: { name: 'Test', email: 'not-an-email' }, expectedStatus: 400 },
    { name: 'XSS in name', payload: { name: '<script>alert(1)</script>', email: 'test@test.com' }, expectedStatus: 400 },
    { name: 'SQL injection', payload: { name: "'; DROP TABLE users; --", email: 'test@test.com' }, expectedStatus: 400 },
    { name: 'oversized payload', payload: { name: 'x'.repeat(10001), email: 'test@test.com' }, expectedStatus: 400 },
  ];

  for (const { name, payload, expectedStatus } of invalidPayloads) {
    test(\`rejects \${name}\`, async ({ api }) => {
      const response = await api.post('/users').withBody(payload).execute();
      expect(response.status()).toBe(expectedStatus);
    });
  }
});
\`\`\`

---

## Common Pitfalls and How to Avoid Them

**Hardcoded URLs**: Always use the config layer. Never put \`https://api-staging.example.com\` directly in a test file.

**Shared mutable state**: Tests that depend on data created by other tests will fail randomly when run in parallel. Every test should create its own data and clean up after itself.

**Ignoring response headers**: Headers carry critical information -- rate limits, cache directives, correlation IDs. Validate them.

**Not testing error responses**: A 400 response with a helpful error message is a feature. Test that error responses have the correct structure, status code, and useful messages.

**Skipping authentication edge cases**: Test expired tokens, revoked tokens, wrong scopes, and missing auth headers. These are the scenarios that cause production incidents.

---

## Conclusion

Building an API automation framework from scratch gives you complete control over your testing infrastructure. The five-layer architecture -- configuration, authentication, request building, validation, and reporting -- provides a solid foundation that scales from a handful of endpoints to hundreds of microservices.

Start with the core layers, add schema validation early, and integrate into CI/CD before your test suite grows large. The investment pays off quickly in faster feedback, fewer production bugs, and a test suite that developers actually trust.

For teams using AI coding agents, a well-structured framework is even more valuable. The clear patterns and typed interfaces give agents like Claude Code the context they need to generate correct, idiomatic tests. Install the API testing skill to get started:

\`\`\`bash
npx @qaskills/cli add api-testing-rest-assured
\`\`\`

Browse all 450+ QA skills at [qaskills.sh/skills](/skills).
`,
};
