import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Serverless Applications: AWS Lambda, Vercel Edge Functions, and Cloudflare Workers',
  description:
    'Complete guide to serverless testing in 2026. Covers AWS Lambda local testing with SAM, Vercel Edge Functions, Cloudflare Workers with Miniflare, cold start testing, event trigger testing, and AI-assisted serverless QA patterns.',
  date: '2026-03-17',
  category: 'Tutorial',
  content: `
Testing **serverless applications** is one of the most challenging disciplines in modern QA. Unlike traditional server-based architectures, serverless functions run in ephemeral, stateless compute environments that are difficult to reproduce locally, hard to observe in production, and governed by platform-specific constraints that vary dramatically across providers.

In 2026, serverless is no longer a niche architecture pattern -- it is the **default deployment model** for a growing number of teams. AWS Lambda processes trillions of invocations per month. Vercel Edge Functions power millions of Next.js applications. Cloudflare Workers handle requests at over 300 data centers worldwide. Yet the testing ecosystem for serverless remains fragmented, poorly documented, and full of traps for the unprepared.

This guide provides a comprehensive, practical approach to testing serverless applications across all three major platforms. We cover unit testing, integration testing, end-to-end testing, cold start measurement, event trigger validation, infrastructure testing, and monitoring -- with real code examples in TypeScript and Python.

## Key Takeaways

- **Serverless testing requires a fundamentally different strategy** than traditional application testing because functions are stateless, event-driven, and tightly coupled to managed infrastructure services
- **Local emulation is essential** but imperfect -- tools like AWS SAM Local, Miniflare, and \`next dev\` simulate serverless environments but cannot replicate all production behaviors (cold starts, concurrency limits, IAM)
- **The serverless testing pyramid** inverts the traditional model: integration tests that validate function-to-service interactions are more valuable than pure unit tests of business logic
- **Cold start testing** is a dedicated concern that requires production-like measurement and should be part of your CI/CD performance budget
- **Event trigger testing** (S3, SQS, DynamoDB Streams, Cron) demands realistic event payload fixtures and idempotency validation
- **AI-assisted serverless testing** with QA skills from [qaskills.sh](https://qaskills.sh) can generate provider-specific test scaffolding, mock event payloads, and infrastructure test patterns automatically

---

## 1. Why Serverless Testing is Uniquely Challenging

Serverless architectures break assumptions that traditional testing relies on:

### Statelessness

Every function invocation starts with a clean slate (with the caveat of warm container reuse). You cannot rely on in-memory state persisting between test invocations. Any state must be externalized to DynamoDB, S3, Redis, or another managed service.

### Event-Driven Execution

Functions do not respond to HTTP requests alone. They are triggered by S3 uploads, SQS messages, DynamoDB stream records, CloudWatch schedules, API Gateway events, and dozens of other event sources. Each event source has a unique payload format that must be correctly mocked.

### Platform Coupling

Serverless functions are deeply coupled to their hosting platform. A Lambda function that uses the AWS SDK to write to DynamoDB is not "portable" in any meaningful testing sense. You must either mock the SDK calls, use a local emulator (DynamoDB Local), or run tests against real cloud resources.

### Cold Starts

The performance characteristics of serverless functions change based on whether the container is warm or cold. A function that responds in 50ms when warm might take 2 seconds on a cold start. This is a testable property that has real user impact.

### Concurrency and Throttling

Serverless platforms impose concurrency limits (Lambda: 1,000 concurrent by default, Cloudflare Workers: no hard limit, Vercel: varies by plan). Testing behavior under throttling requires production-like conditions that are difficult to simulate locally.

### Observability Gaps

When a function fails in production, you often have limited visibility. Logs are scattered across CloudWatch log groups, traces require explicit instrumentation (X-Ray, OpenTelemetry), and metrics are delayed. Testing your observability setup is itself a testing concern.

---

## 2. The Serverless Testing Pyramid

The traditional testing pyramid (many unit tests, fewer integration tests, fewest E2E tests) does not map well to serverless. Here is the adapted version:

### Level 1: Unit Tests (Business Logic Only)

Test pure business logic extracted from handler functions. These tests should have **zero cloud dependencies**.

\`\`\`typescript
// src/utils/pricing.ts
export function calculateDiscount(
  subtotal: number,
  customerTier: 'free' | 'pro' | 'enterprise'
): number {
  if (customerTier === 'enterprise' && subtotal > 1000) return subtotal * 0.15;
  if (customerTier === 'pro' && subtotal > 500) return subtotal * 0.10;
  return 0;
}

// src/utils/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { calculateDiscount } from './pricing';

describe('calculateDiscount', () => {
  it('applies 15% discount for enterprise customers over 1000', () => {
    expect(calculateDiscount(2000, 'enterprise')).toBe(300);
  });

  it('applies 10% discount for pro customers over 500', () => {
    expect(calculateDiscount(800, 'pro')).toBe(80);
  });

  it('returns zero for free tier customers', () => {
    expect(calculateDiscount(5000, 'free')).toBe(0);
  });

  it('returns zero for enterprise customers under threshold', () => {
    expect(calculateDiscount(500, 'enterprise')).toBe(0);
  });
});
\`\`\`

### Level 2: Handler Integration Tests (Mocked Services)

Test handler functions with mocked cloud service interactions. This is the **most valuable layer** for serverless.

\`\`\`typescript
// src/handlers/create-order.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from './create-order';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('createOrder handler', () => {
  it('creates an order and returns 201', async () => {
    ddbMock.on(PutCommand).resolves({});

    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({
        items: [{ sku: 'WIDGET-001', quantity: 2 }],
        customerId: 'cust_123',
      }),
      headers: { 'Content-Type': 'application/json' },
    };

    const result = await handler(event as any);

    expect(result.statusCode).toBe(201);
    const body = JSON.parse(result.body);
    expect(body.orderId).toBeDefined();
    expect(ddbMock.calls()).toHaveLength(1);
  });

  it('returns 400 for missing items', async () => {
    const event = {
      httpMethod: 'POST',
      body: JSON.stringify({ customerId: 'cust_123' }),
      headers: { 'Content-Type': 'application/json' },
    };

    const result = await handler(event as any);
    expect(result.statusCode).toBe(400);
  });
});
\`\`\`

### Level 3: Local Emulation Tests

Run functions against local emulators (SAM Local, DynamoDB Local, Miniflare) to validate real service interactions without cloud costs.

### Level 4: Cloud Integration Tests

Deploy to a staging environment and test against real AWS/Vercel/Cloudflare services. These tests are slower and more expensive but catch configuration issues.

### Level 5: End-to-End Tests

Full user journey tests using Playwright or similar that exercise the entire serverless stack through the API Gateway or CDN layer.

---

## 3. Testing AWS Lambda Functions

AWS Lambda is the most mature serverless platform, and its testing ecosystem is correspondingly rich.

### Local Testing with AWS SAM

The **AWS Serverless Application Model (SAM)** CLI provides local Lambda emulation:

\`\`\`bash
# Install SAM CLI
brew install aws-sam-cli

# Invoke a function locally with a test event
sam local invoke CreateOrderFunction -e events/create-order.json

# Start a local API Gateway
sam local start-api --port 3001

# Generate a sample event
sam local generate-event apigateway aws-proxy > events/api-gw-event.json
\`\`\`

### Event Mocking with Realistic Payloads

Lambda events have precise structures. Always use realistic fixtures:

\`\`\`typescript
// test/fixtures/api-gateway-event.ts
import type { APIGatewayProxyEvent } from 'aws-lambda';

export function createApiGatewayEvent(
  overrides: Partial<APIGatewayProxyEvent> = {}
): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/',
    headers: {
      'Content-Type': 'application/json',
      Host: 'api.example.com',
    },
    queryStringParameters: null,
    pathParameters: null,
    body: null,
    isBase64Encoded: false,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'abc123',
      httpMethod: 'GET',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      } as any,
      path: '/',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/',
      authorizer: {},
    } as any,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    resource: '/',
    ...overrides,
  };
}
\`\`\`

### Testing with DynamoDB Local

\`\`\`typescript
// test/setup/dynamodb-local.ts
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'us-east-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

export async function setupOrdersTable() {
  try {
    await client.send(
      new CreateTableCommand({
        TableName: 'Orders',
        KeySchema: [{ AttributeName: 'orderId', KeyType: 'HASH' }],
        AttributeDefinitions: [
          { AttributeName: 'orderId', AttributeType: 'S' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      })
    );
  } catch (err: any) {
    if (err.name !== 'ResourceInUseException') throw err;
  }
}
\`\`\`

### Python Lambda Testing with pytest

\`\`\`python
# tests/test_create_order.py
import json
import pytest
from unittest.mock import patch, MagicMock
from handlers.create_order import handler


@pytest.fixture
def api_event():
    return {
        "httpMethod": "POST",
        "body": json.dumps({
            "items": [{"sku": "WIDGET-001", "quantity": 2}],
            "customerId": "cust_123",
        }),
        "headers": {"Content-Type": "application/json"},
        "requestContext": {"requestId": "test-id"},
    }


@pytest.fixture
def mock_dynamodb():
    with patch("handlers.create_order.table") as mock_table:
        mock_table.put_item = MagicMock(return_value={})
        yield mock_table


class TestCreateOrderHandler:
    def test_creates_order_successfully(self, api_event, mock_dynamodb):
        result = handler(api_event, None)

        assert result["statusCode"] == 201
        body = json.loads(result["body"])
        assert "orderId" in body
        mock_dynamodb.put_item.assert_called_once()

    def test_returns_400_for_invalid_body(self):
        event = {
            "httpMethod": "POST",
            "body": "invalid json{{{",
            "headers": {"Content-Type": "application/json"},
            "requestContext": {"requestId": "test-id"},
        }
        result = handler(event, None)
        assert result["statusCode"] == 400

    def test_returns_400_for_empty_items(self, api_event, mock_dynamodb):
        api_event["body"] = json.dumps({
            "items": [],
            "customerId": "cust_123",
        })
        result = handler(api_event, None)
        assert result["statusCode"] == 400

    def test_handles_dynamodb_error(self, api_event, mock_dynamodb):
        mock_dynamodb.put_item.side_effect = Exception("DynamoDB error")
        result = handler(api_event, None)
        assert result["statusCode"] == 500
\`\`\`

---

## 4. Testing Vercel Edge Functions and Serverless Functions

Vercel provides two serverless runtime environments: **Serverless Functions** (Node.js, running in AWS Lambda under the hood) and **Edge Functions** (running on Cloudflare's edge network via the Edge Runtime).

### Testing Next.js API Routes (Serverless Functions)

Next.js API routes in the App Router use the standard \`Request\`/\`Response\` API:

\`\`\`typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const users = await db.query.users.findMany({ limit, offset });

  return NextResponse.json({ users, total: users.length });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.email || !body.name) {
    return NextResponse.json(
      { error: 'Email and name are required' },
      { status: 400 }
    );
  }

  const user = await db.insert(users).values(body).returning();
  return NextResponse.json(user, { status: 201 });
}
\`\`\`

\`\`\`typescript
// app/api/users/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findMany: vi.fn().mockResolvedValue([
          { id: '1', name: 'Alice', email: 'alice@test.com' },
        ]),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: '2', name: 'Bob', email: 'bob@test.com' },
        ]),
      }),
    }),
  },
}));

describe('GET /api/users', () => {
  it('returns users with default pagination', async () => {
    const request = new NextRequest('http://localhost/api/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toHaveLength(1);
  });

  it('respects limit and offset parameters', async () => {
    const request = new NextRequest(
      'http://localhost/api/users?limit=5&offset=10'
    );
    await GET(request);
    // Verify the mock was called with correct params
  });
});

describe('POST /api/users', () => {
  it('creates a user and returns 201', async () => {
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bob', email: 'bob@test.com' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it('returns 400 for missing required fields', async () => {
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bob' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
\`\`\`

### Testing Edge Middleware

Edge middleware runs before every request and is ideal for authentication, redirects, and A/B testing:

\`\`\`typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (request.nextUrl.pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const response = NextResponse.next();
  response.headers.set('x-request-id', crypto.randomUUID());
  return response;
}

// middleware.test.ts
import { describe, it, expect } from 'vitest';
import { middleware } from './middleware';
import { NextRequest } from 'next/server';

describe('Edge Middleware', () => {
  it('redirects unauthenticated users from /dashboard', () => {
    const request = new NextRequest('http://localhost/dashboard');
    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login');
  });

  it('allows authenticated users through', () => {
    const request = new NextRequest('http://localhost/dashboard', {
      headers: {
        cookie: 'auth-token=valid-token-123',
      },
    });
    const response = middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBeDefined();
  });

  it('adds request ID header to all responses', () => {
    const request = new NextRequest('http://localhost/public-page');
    const response = middleware(request);

    expect(response.headers.get('x-request-id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-/
    );
  });
});
\`\`\`

---

## 5. Testing Cloudflare Workers

Cloudflare Workers run on the V8 isolate model, which is fundamentally different from Node.js Lambda functions. The testing ecosystem centers around **Miniflare** and the \`wrangler\` CLI.

### Local Testing with Miniflare

Miniflare is a fully-local Cloudflare Workers simulator that supports KV, D1, R2, Durable Objects, and more:

\`\`\`typescript
// src/worker.ts
export interface Env {
  CACHE: KVNamespace;
  DB: D1Database;
  BUCKET: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/products') {
      const cached = await env.CACHE.get('products:all');
      if (cached) {
        return new Response(cached, {
          headers: { 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
        });
      }

      const { results } = await env.DB.prepare(
        'SELECT * FROM products WHERE active = 1 LIMIT 100'
      ).all();

      const json = JSON.stringify(results);
      await env.CACHE.put('products:all', json, { expirationTtl: 300 });

      return new Response(json, {
        headers: { 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
\`\`\`

\`\`\`typescript
// src/worker.test.ts
import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import worker from './worker';

describe('Products Worker', () => {
  beforeEach(async () => {
    // Clear KV cache before each test
    await env.CACHE.delete('products:all');
  });

  it('returns products from D1 on cache miss', async () => {
    // Seed the D1 database
    await env.DB.prepare(
      'INSERT INTO products (id, name, price, active) VALUES (?, ?, ?, ?)'
    )
      .bind(1, 'Widget', 29.99, 1)
      .run();

    const request = new Request('http://localhost/api/products');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('MISS');

    const data = await response.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Widget');
  });

  it('returns cached products on cache hit', async () => {
    const products = [{ id: 1, name: 'Widget', price: 29.99 }];
    await env.CACHE.put('products:all', JSON.stringify(products));

    const request = new Request('http://localhost/api/products');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('HIT');
  });

  it('returns 404 for unknown routes', async () => {
    const request = new Request('http://localhost/unknown');
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);
    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(404);
  });
});
\`\`\`

### Wrangler Dev for Interactive Testing

\`\`\`bash
# Start local dev server with all bindings
wrangler dev --local --persist-to ./test-data

# Test with curl
curl http://localhost:8787/api/products

# Run D1 migrations locally
wrangler d1 migrations apply my-database --local
\`\`\`

---

## 6. Testing API Gateway and Lambda Integration

The API Gateway layer introduces its own testing concerns: request mapping, response transformation, authorizers, and CORS configuration.

### Testing Custom Authorizers

\`\`\`typescript
// src/authorizer.ts
import type { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';
import { verify } from 'jsonwebtoken';

export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  const token = event.authorizationToken?.replace('Bearer ', '');

  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      permissions: string[];
    };

    return {
      principalId: decoded.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        userId: decoded.sub,
        permissions: decoded.permissions.join(','),
      },
    };
  } catch {
    throw new Error('Unauthorized');
  }
}

// src/authorizer.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { handler } from './authorizer';
import { sign } from 'jsonwebtoken';

const TEST_SECRET = 'test-jwt-secret';

beforeAll(() => {
  vi.stubEnv('JWT_SECRET', TEST_SECRET);
});

describe('API Gateway Authorizer', () => {
  it('allows valid JWT tokens', async () => {
    const token = sign(
      { sub: 'user_123', permissions: ['read', 'write'] },
      TEST_SECRET
    );

    const result = await handler({
      type: 'TOKEN',
      authorizationToken: \`Bearer \${token}\`,
      methodArn: 'arn:aws:execute-api:us-east-1:123:api/stage/GET/resource',
    });

    expect(result.principalId).toBe('user_123');
    expect(result.policyDocument.Statement[0].Effect).toBe('Allow');
  });

  it('rejects missing tokens', async () => {
    await expect(
      handler({
        type: 'TOKEN',
        authorizationToken: '',
        methodArn: 'arn:aws:execute-api:us-east-1:123:api/stage/GET/resource',
      })
    ).rejects.toThrow('Unauthorized');
  });

  it('rejects expired tokens', async () => {
    const token = sign(
      { sub: 'user_123', permissions: [] },
      TEST_SECRET,
      { expiresIn: '-1h' }
    );

    await expect(
      handler({
        type: 'TOKEN',
        authorizationToken: \`Bearer \${token}\`,
        methodArn: 'arn:aws:execute-api:us-east-1:123:api/stage/GET/resource',
      })
    ).rejects.toThrow('Unauthorized');
  });
});
\`\`\`

### Testing Request/Response Mapping

\`\`\`typescript
// test/integration/api-gateway.test.ts
import { describe, it, expect } from 'vitest';

describe('API Gateway Integration', () => {
  const API_URL = process.env.API_STAGE_URL || 'http://localhost:3001';

  it('transforms query parameters correctly', async () => {
    const response = await fetch(
      \`\${API_URL}/products?category=electronics&sort=price\`
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('returns proper CORS headers for preflight', async () => {
    const response = await fetch(\`\${API_URL}/products\`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('handles binary responses for file downloads', async () => {
    const response = await fetch(\`\${API_URL}/reports/export?format=csv\`);

    expect(response.headers.get('content-type')).toContain('text/csv');
    const text = await response.text();
    expect(text).toContain('id,name,price');
  });
});
\`\`\`

---

## 7. Cold Start Testing and Performance

Cold starts are the most user-visible performance issue in serverless architectures. They must be measured and managed.

### Measuring Cold Starts

\`\`\`typescript
// scripts/measure-cold-start.ts
interface ColdStartResult {
  coldStartMs: number;
  warmStartMs: number;
  memoryMb: number;
  runtime: string;
}

async function measureColdStart(
  functionUrl: string,
  iterations: number = 10
): Promise<ColdStartResult> {
  // Force cold start by waiting for container to expire
  console.log('Waiting 15 minutes for container cooldown...');
  await new Promise((r) => setTimeout(r, 15 * 60 * 1000));

  // Measure cold start
  const coldStart = performance.now();
  await fetch(functionUrl);
  const coldStartMs = performance.now() - coldStart;

  // Measure warm starts (average of N iterations)
  const warmTimes: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fetch(functionUrl);
    warmTimes.push(performance.now() - start);
  }

  const warmStartMs =
    warmTimes.reduce((a, b) => a + b, 0) / warmTimes.length;

  return {
    coldStartMs: Math.round(coldStartMs),
    warmStartMs: Math.round(warmStartMs),
    memoryMb: 256,
    runtime: 'nodejs20.x',
  };
}
\`\`\`

### Cold Start Performance Budget in CI

\`\`\`typescript
// test/performance/cold-start.test.ts
import { describe, it, expect } from 'vitest';

describe('Cold Start Performance Budget', () => {
  const COLD_START_BUDGET_MS = 3000;
  const WARM_START_BUDGET_MS = 200;

  it('cold start is within budget', async () => {
    const startTime = Date.now();
    const response = await fetch(process.env.FUNCTION_URL!);
    const duration = Date.now() - startTime;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(COLD_START_BUDGET_MS);
  }, 30000);

  it('warm start is within budget', async () => {
    // Prime the function
    await fetch(process.env.FUNCTION_URL!);

    const startTime = Date.now();
    const response = await fetch(process.env.FUNCTION_URL!);
    const duration = Date.now() - startTime;

    expect(response.ok).toBe(true);
    expect(duration).toBeLessThan(WARM_START_BUDGET_MS);
  });
});
\`\`\`

### Reducing Cold Starts

Key strategies to test for:

1. **Bundle size optimization** -- Smaller deployment packages start faster. Test that your bundle stays under budget.
2. **Provisioned concurrency** (Lambda) -- Pre-warm containers. Test that provisioned instances respond consistently.
3. **Lazy initialization** -- Defer heavy imports. Test that the first invocation path is optimized.
4. **Edge runtime** (Vercel/Cloudflare) -- V8 isolates start in under 5ms. Test that your function is Edge Runtime compatible.

---

## 8. Testing Event Triggers

Serverless functions are often triggered by events other than HTTP requests. Each event source requires dedicated test fixtures.

### S3 Event Testing

\`\`\`typescript
// src/handlers/process-upload.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handler } from './process-upload';
import type { S3Event } from 'aws-lambda';

function createS3Event(bucket: string, key: string): S3Event {
  return {
    Records: [
      {
        eventVersion: '2.1',
        eventSource: 'aws:s3',
        awsRegion: 'us-east-1',
        eventTime: new Date().toISOString(),
        eventName: 'ObjectCreated:Put',
        s3: {
          bucket: { name: bucket, arn: \`arn:aws:s3:::\${bucket}\` } as any,
          object: { key, size: 1024, eTag: 'abc123' } as any,
          configurationId: 'test',
          s3SchemaVersion: '1.0',
        },
        userIdentity: { principalId: 'EXAMPLE' },
        requestParameters: { sourceIPAddress: '127.0.0.1' },
        responseElements: {} as any,
      },
    ],
  };
}

describe('S3 Upload Processor', () => {
  it('processes image uploads', async () => {
    const event = createS3Event('uploads-bucket', 'images/photo.jpg');
    const result = await handler(event);

    expect(result.processed).toBe(true);
    expect(result.thumbnailCreated).toBe(true);
  });

  it('skips non-image files', async () => {
    const event = createS3Event('uploads-bucket', 'documents/readme.txt');
    const result = await handler(event);

    expect(result.processed).toBe(true);
    expect(result.thumbnailCreated).toBe(false);
  });

  it('handles multiple records in a single event', async () => {
    const event = createS3Event('uploads-bucket', 'images/a.jpg');
    event.Records.push(
      createS3Event('uploads-bucket', 'images/b.png').Records[0]
    );

    const result = await handler(event);
    expect(result.processedCount).toBe(2);
  });
});
\`\`\`

### SQS Event Testing

\`\`\`python
# tests/test_sqs_handler.py
import json
import pytest
from handlers.process_queue import handler


def create_sqs_event(messages):
    return {
        "Records": [
            {
                "messageId": f"msg-{i}",
                "receiptHandle": f"handle-{i}",
                "body": json.dumps(msg),
                "attributes": {
                    "ApproximateReceiveCount": "1",
                    "SentTimestamp": "1609459200000",
                },
                "messageAttributes": {},
                "md5OfBody": "abc123",
                "eventSource": "aws:sqs",
                "eventSourceARN": "arn:aws:sqs:us-east-1:123:my-queue",
                "awsRegion": "us-east-1",
            }
            for i, msg in enumerate(messages)
        ]
    }


class TestSQSHandler:
    def test_processes_single_message(self):
        event = create_sqs_event([
            {"action": "send_email", "to": "user@test.com", "template": "welcome"}
        ])
        result = handler(event, None)
        assert result["batchItemFailures"] == []

    def test_reports_partial_failures(self, mocker):
        mocker.patch(
            "handlers.process_queue.send_email",
            side_effect=[None, Exception("SMTP error"), None],
        )

        event = create_sqs_event([
            {"action": "send_email", "to": "a@test.com", "template": "welcome"},
            {"action": "send_email", "to": "b@test.com", "template": "welcome"},
            {"action": "send_email", "to": "c@test.com", "template": "welcome"},
        ])

        result = handler(event, None)
        failures = result["batchItemFailures"]
        assert len(failures) == 1
        assert failures[0]["itemIdentifier"] == "msg-1"

    def test_handles_idempotent_processing(self, mocker):
        """Same message processed twice should not cause side effects"""
        event = create_sqs_event([
            {"action": "charge_payment", "paymentId": "pay_123", "amount": 99.99}
        ])

        handler(event, None)
        handler(event, None)  # Duplicate delivery

        # Verify payment was only charged once
        # (implementation depends on idempotency mechanism)
\`\`\`

### DynamoDB Stream Testing

\`\`\`typescript
// src/handlers/sync-to-search.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handler } from './sync-to-search';
import type { DynamoDBStreamEvent } from 'aws-lambda';

function createStreamEvent(
  eventName: 'INSERT' | 'MODIFY' | 'REMOVE',
  newImage?: Record<string, any>,
  oldImage?: Record<string, any>
): DynamoDBStreamEvent {
  return {
    Records: [
      {
        eventID: 'evt-1',
        eventName,
        eventVersion: '1.1',
        eventSource: 'aws:dynamodb',
        awsRegion: 'us-east-1',
        dynamodb: {
          Keys: { id: { S: 'item-1' } },
          NewImage: newImage,
          OldImage: oldImage,
          StreamViewType: 'NEW_AND_OLD_IMAGES',
        } as any,
      },
    ],
  };
}

describe('DynamoDB Stream to Search Index Sync', () => {
  it('indexes new items on INSERT', async () => {
    const event = createStreamEvent('INSERT', {
      id: { S: 'prod-1' },
      name: { S: 'Widget' },
      price: { N: '29.99' },
    });

    await handler(event);
    // Verify search index was updated
  });

  it('updates search index on MODIFY', async () => {
    const event = createStreamEvent(
      'MODIFY',
      { id: { S: 'prod-1' }, name: { S: 'Updated Widget' }, price: { N: '39.99' } },
      { id: { S: 'prod-1' }, name: { S: 'Widget' }, price: { N: '29.99' } }
    );

    await handler(event);
    // Verify search index reflects the update
  });

  it('removes items from search index on REMOVE', async () => {
    const event = createStreamEvent(
      'REMOVE',
      undefined,
      { id: { S: 'prod-1' }, name: { S: 'Widget' } }
    );

    await handler(event);
    // Verify item was removed from search index
  });
});
\`\`\`

---

## 9. Integration Testing Serverless Stacks

When your infrastructure is defined as code (AWS CDK, Terraform, Pulumi), you can test the infrastructure itself.

### AWS CDK Testing

\`\`\`typescript
// test/infrastructure/api-stack.test.ts
import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { ApiStack } from '../../lib/api-stack';

describe('ApiStack Infrastructure', () => {
  let template: Template;

  beforeAll(() => {
    const app = new App();
    const stack = new ApiStack(app, 'TestApiStack', {
      env: { account: '123456789012', region: 'us-east-1' },
      stage: 'test',
    });
    template = Template.fromStack(stack);
  });

  it('creates a Lambda function with correct runtime', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      MemorySize: 256,
      Timeout: 30,
    });
  });

  it('creates a DynamoDB table with on-demand billing', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      SSESpecification: { SSEEnabled: true },
    });
  });

  it('configures API Gateway with CORS', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      CorsConfiguration: Match.objectLike({
        AllowMethods: Match.arrayWith(['GET', 'POST', 'OPTIONS']),
      }),
    });
  });

  it('grants Lambda read/write access to DynamoDB', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith([
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:Query',
            ]),
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  it('does not create public S3 buckets', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });
});
\`\`\`

---

## 10. Monitoring and Observability for Serverless

Testing your observability setup is a frequently overlooked discipline. If your monitoring fails silently, you will not know until an incident happens.

### Testing CloudWatch Metrics

\`\`\`typescript
// test/observability/metrics.test.ts
import { CloudWatchClient, GetMetricDataCommand } from '@aws-sdk/client-cloudwatch';

describe('Custom Metrics Publishing', () => {
  const cw = new CloudWatchClient({ region: 'us-east-1' });

  it('publishes order-created metric after successful order', async () => {
    // Trigger the Lambda function
    await fetch(\`\${process.env.API_URL}/orders\`, {
      method: 'POST',
      body: JSON.stringify({ items: [{ sku: 'TEST', quantity: 1 }] }),
    });

    // Wait for metric propagation
    await new Promise((r) => setTimeout(r, 60000));

    const result = await cw.send(
      new GetMetricDataCommand({
        MetricDataQueries: [
          {
            Id: 'orderCreated',
            MetricStat: {
              Metric: {
                Namespace: 'MyApp/Orders',
                MetricName: 'OrderCreated',
                Dimensions: [{ Name: 'Stage', Value: 'test' }],
              },
              Period: 60,
              Stat: 'Sum',
            },
          },
        ],
        StartTime: new Date(Date.now() - 5 * 60 * 1000),
        EndTime: new Date(),
      })
    );

    const values = result.MetricDataResults?.[0]?.Values || [];
    expect(values.some((v) => v > 0)).toBe(true);
  }, 120000);
});
\`\`\`

### Testing Distributed Tracing

\`\`\`typescript
// src/middleware/tracing.ts
import { trace, SpanKind, context, propagation } from '@opentelemetry/api';

const tracer = trace.getTracer('serverless-app');

export function withTracing<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    { kind: SpanKind.SERVER },
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: 0 });
        return result;
      } catch (error: any) {
        span.setStatus({ code: 2, message: error.message });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

// src/middleware/tracing.test.ts
import { describe, it, expect, vi } from 'vitest';
import { withTracing } from './tracing';

vi.mock('@opentelemetry/api', () => {
  const mockSpan = {
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
  };
  return {
    trace: {
      getTracer: () => ({
        startActiveSpan: (_name: string, _opts: any, fn: any) => fn(mockSpan),
      }),
    },
    SpanKind: { SERVER: 1 },
    context: {},
    propagation: {},
    _mockSpan: mockSpan,
  };
});

describe('withTracing', () => {
  it('sets success status on successful execution', async () => {
    const result = await withTracing('test-op', async () => 'success');

    expect(result).toBe('success');
  });

  it('records exceptions and rethrows', async () => {
    await expect(
      withTracing('test-op', async () => {
        throw new Error('test error');
      })
    ).rejects.toThrow('test error');
  });
});
\`\`\`

---

## 11. AI-Assisted Serverless Testing with QASkills

Writing serverless tests from scratch is tedious. **AI coding agents** combined with **QA skills from qaskills.sh** can dramatically accelerate the process.

### Installing Serverless Testing Skills

\`\`\`bash
# Search for serverless-related QA skills
npx @qaskills/cli search "serverless"
npx @qaskills/cli search "lambda"
npx @qaskills/cli search "edge functions"

# Install relevant skills
npx @qaskills/cli add api-testing-rest
npx @qaskills/cli add cloud-integration-testing
npx @qaskills/cli add performance-testing

# List installed skills
npx @qaskills/cli list
\`\`\`

### What QA Skills Provide

When you install a QA skill, your AI coding agent gains:

- **Event fixture generators** -- Pre-built functions for creating realistic S3, SQS, DynamoDB Stream, API Gateway, and CloudWatch event payloads
- **Mock patterns** -- Idiomatic AWS SDK v3 mocking with \`aws-sdk-client-mock\`, Miniflare test setups, and Next.js API route test patterns
- **Anti-pattern detection** -- The agent will warn you when you write tests that only work locally but will fail in CI (hardcoded AWS credentials, missing region configuration, port conflicts)
- **Infrastructure testing patterns** -- CDK assertion examples, Terraform plan validation, and Pulumi testing patterns
- **Performance budgets** -- Pre-configured cold start and warm start budget templates

### Workflow Example

With QA skills installed, you can prompt your AI agent naturally:

\`\`\`
"Write integration tests for my Lambda order handler that uses DynamoDB"
"Add cold start performance tests for the /api/products endpoint"
"Generate S3 event fixtures for my image processing pipeline"
"Test my Cloudflare Worker with KV and D1 mocking"
\`\`\`

The agent, armed with serverless-specific QA knowledge from the installed skills, produces tests that follow established best practices rather than generic patterns.

---

## 12. Best Practices for Serverless Testing

1. **Extract business logic from handlers.** Keep your Lambda/Worker handler functions thin. Move validation, transformation, and domain logic into pure functions that are trivial to unit test without any mocking.

2. **Use realistic event fixtures.** Never hand-craft event payloads from memory. Use \`sam local generate-event\`, capture real events from CloudWatch Logs, or use typed fixture factories that match the exact event schema.

3. **Test idempotency explicitly.** Serverless event sources (SQS, S3, DynamoDB Streams) can deliver the same event multiple times. Every handler should be tested with duplicate events to ensure no unintended side effects.

4. **Mock at the SDK level, not the HTTP level.** Use \`aws-sdk-client-mock\` for AWS SDK v3 rather than intercepting HTTP requests. This gives you type-safe mocks that break when the SDK API changes.

5. **Run integration tests against local emulators.** DynamoDB Local, Miniflare, and \`sam local start-api\` provide fast, free, offline-capable integration testing. Use them in CI.

6. **Maintain a cold start performance budget.** Define maximum acceptable cold start times per function and enforce them in CI with automated performance tests against a staging environment.

7. **Test error handling paths thoroughly.** Serverless functions interact with many external services. Test what happens when DynamoDB is throttled, SQS returns errors, S3 objects are missing, and API Gateway times out.

8. **Use partial batch failure reporting.** For SQS-triggered functions, test that your handler correctly reports \`batchItemFailures\` so that only failed messages are retried, not the entire batch.

9. **Test IAM permissions in infrastructure tests.** Use CDK assertions or Terraform plan analysis to verify that Lambda functions have the minimum required permissions and no overly permissive policies.

10. **Automate deployment and test in staging.** Use a CI/CD pipeline that deploys to a staging stack, runs integration tests, and tears down the stack. AWS CDK makes this straightforward with stack lifecycle management.

---

## 13. Anti-Patterns to Avoid

1. **Testing against production cloud resources.** Never point your test suite at production DynamoDB tables, S3 buckets, or SQS queues. Use separate staging resources or local emulators. One accidental \`DELETE\` in a test can cause a production outage.

2. **Ignoring cold start testing.** Many teams only test warm function performance. When a cold start adds 3 seconds to a user-facing API call, users notice. Measure and budget for cold starts explicitly.

3. **Mocking everything.** Over-mocking produces tests that pass but do not reflect real behavior. If your test mocks DynamoDB, SQS, S3, and the HTTP client, it is testing your mock setup, not your function. Balance mocks with integration tests against emulators.

4. **Hardcoding AWS credentials in tests.** Using real access keys in test files is a security vulnerability and a CI failure waiting to happen. Use environment variables, \`aws-sdk-client-mock\`, or IAM roles for CI runners.

5. **Not testing timeout behavior.** Lambda functions have configurable timeouts (default 3 seconds, max 15 minutes). If your function takes 4 seconds on a cold start and the timeout is 3 seconds, it will fail silently. Test behavior at and near the timeout boundary.

6. **Skipping CORS testing.** API Gateway CORS misconfiguration is one of the most common serverless bugs. Test that preflight OPTIONS requests return correct headers and that your API responds with the expected \`Access-Control-Allow-Origin\`.

7. **Ignoring payload size limits.** Lambda has a 6 MB payload limit for synchronous invocations and 256 KB for asynchronous. API Gateway has its own limits. Test that your functions handle oversized payloads gracefully rather than crashing.

8. **Not testing retry and DLQ behavior.** When a Lambda function fails, the event source may retry it (SQS retries up to the configured maxReceiveCount before sending to the Dead Letter Queue). Test that your DLQ is configured correctly and that failed messages arrive there with the expected content.

---

## Conclusion

Serverless testing in 2026 demands a purpose-built strategy that accounts for the unique characteristics of ephemeral, event-driven, platform-coupled compute. The traditional testing pyramid does not apply -- instead, invest heavily in **handler integration tests** that validate function-to-service interactions, supplement them with **local emulator tests** for realistic feedback loops, and enforce **cold start performance budgets** in CI.

The tools are mature: AWS SAM, Miniflare, and Next.js dev servers provide solid local emulation. \`aws-sdk-client-mock\`, Vitest, and pytest offer excellent mocking capabilities. CDK assertions enable infrastructure validation. And AI coding agents, supercharged with QA skills from [qaskills.sh](https://qaskills.sh), can generate provider-specific test scaffolding in seconds.

The teams that test serverless well are the teams that treat serverless not as "functions you deploy" but as **distributed systems with many moving parts**. Test each part. Test how they connect. Test what happens when they fail. And automate everything.

---

*Want to accelerate your serverless testing workflow? Browse QA skills at [qaskills.sh](https://qaskills.sh) or install them directly:*

\`\`\`bash
npx @qaskills/cli search "serverless"
npx @qaskills/cli add api-testing-rest
\`\`\`
`,
};
