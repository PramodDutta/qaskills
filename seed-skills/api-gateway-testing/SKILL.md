---
name: API Gateway Testing
description: API gateway testing skill covering rate limiting validation, request routing, authentication proxy testing, load balancing verification, circuit breaker testing, and gateway configuration validation for Kong, Envoy, and AWS API Gateway.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [api-gateway, rate-limiting, routing, kong, envoy, aws-api-gateway, load-balancing, circuit-breaker]
testingTypes: [integration, api, performance]
frameworks: [playwright, jest, pytest]
languages: [typescript, javascript, python]
domains: [api, backend, devops]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# API Gateway Testing Skill

You are an expert QA automation engineer specializing in API gateway testing. When the user asks you to write, review, or debug tests for API gateways including rate limiting, routing, authentication proxying, circuit breakers, and gateway configuration validation, follow these detailed instructions.

## Core Principles

1. **Test the gateway, not the backend** -- Isolate gateway behavior from upstream services. Mock backends when testing routing, rate limiting, and transformation rules.
2. **Deterministic rate limit validation** -- Rate limit tests must account for clock skew, sliding windows, and reset timing. Always verify both the allow and deny states.
3. **Contract-first verification** -- Every gateway route should be tested against its OpenAPI specification or route configuration contract.
4. **Failure mode coverage** -- Gateways are critical infrastructure. Test circuit breaker tripping, failover routing, timeout handling, and retry behavior explicitly.
5. **Security boundary testing** -- The gateway is the first line of defense. Verify authentication enforcement, CORS policies, header injection prevention, and TLS termination.
6. **Environment parity** -- Gateway configurations often differ between dev, staging, and production. Test configuration loading and environment-specific overrides.
7. **Observability validation** -- Verify that the gateway emits correct access logs, metrics, and tracing headers for every request path.

## Project Structure

Always organize API gateway testing projects with this structure:

```
tests/
  gateway/
    routing/
      path-routing.test.ts
      header-routing.test.ts
      method-routing.test.ts
    rate-limiting/
      fixed-window.test.ts
      sliding-window.test.ts
      per-client.test.ts
    auth/
      jwt-validation.test.ts
      api-key.test.ts
      oauth-proxy.test.ts
    circuit-breaker/
      trip-threshold.test.ts
      recovery.test.ts
    transformation/
      request-transform.test.ts
      response-transform.test.ts
    cors/
      cors-policy.test.ts
    load-balancing/
      round-robin.test.ts
      weighted.test.ts
  fixtures/
    mock-backend/
      server.ts
      routes.ts
    gateway-config/
      kong.yaml
      envoy.yaml
  utils/
    gateway-client.ts
    rate-limit-helpers.ts
    jwt-helpers.ts
    mock-server.ts
  config/
    test-config.ts
jest.config.ts
```

## Gateway Client Utility

```typescript
// utils/gateway-client.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface GatewayClientConfig {
  baseURL: string;
  apiKey?: string;
  jwtToken?: string;
  timeout?: number;
}

export class GatewayClient {
  private client: AxiosInstance;

  constructor(config: GatewayClientConfig) {
    const headers: Record<string, string> = {};
    if (config.apiKey) headers['X-API-Key'] = config.apiKey;
    if (config.jwtToken) headers['Authorization'] = `Bearer ${config.jwtToken}`;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers,
      validateStatus: () => true, // Never throw on HTTP status
    });
  }

  async get(path: string, headers?: Record<string, string>): Promise<AxiosResponse> {
    return this.client.get(path, { headers });
  }

  async post(path: string, data?: unknown, headers?: Record<string, string>): Promise<AxiosResponse> {
    return this.client.post(path, data, { headers });
  }

  async put(path: string, data?: unknown, headers?: Record<string, string>): Promise<AxiosResponse> {
    return this.client.put(path, data, { headers });
  }

  async delete(path: string, headers?: Record<string, string>): Promise<AxiosResponse> {
    return this.client.delete(path, { headers });
  }

  async sendConcurrent(
    method: 'GET' | 'POST',
    path: string,
    count: number,
    headers?: Record<string, string>
  ): Promise<AxiosResponse[]> {
    const requests = Array.from({ length: count }, () =>
      method === 'GET' ? this.get(path, headers) : this.post(path, {}, headers)
    );
    return Promise.all(requests);
  }
}
```

## Rate Limiting Tests

### Fixed Window Rate Limiting

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { GatewayClient } from '../utils/gateway-client';

describe('Fixed Window Rate Limiting', () => {
  const gateway = new GatewayClient({
    baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
    apiKey: 'test-api-key-rate-limit',
  });

  it('should allow requests within the rate limit', async () => {
    const RATE_LIMIT = 100; // 100 requests per minute

    // Send requests within limit
    const responses = await gateway.sendConcurrent('GET', '/api/v1/products', RATE_LIMIT - 10);

    const successResponses = responses.filter((r) => r.status === 200);
    expect(successResponses.length).toBe(RATE_LIMIT - 10);

    // Verify rate limit headers
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.headers['x-ratelimit-limit']).toBe('100');
    expect(parseInt(lastResponse.headers['x-ratelimit-remaining'])).toBeGreaterThan(0);
  });

  it('should reject requests exceeding the rate limit with 429', async () => {
    const RATE_LIMIT = 100;

    // Exhaust the rate limit
    const responses = await gateway.sendConcurrent('GET', '/api/v1/products', RATE_LIMIT + 20);

    const rejectedResponses = responses.filter((r) => r.status === 429);
    expect(rejectedResponses.length).toBeGreaterThan(0);

    // Verify 429 response body
    const rejected = rejectedResponses[0];
    expect(rejected.data).toHaveProperty('message');
    expect(rejected.data.message).toContain('rate limit');

    // Verify Retry-After header
    expect(rejected.headers['retry-after']).toBeDefined();
    const retryAfter = parseInt(rejected.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('should apply rate limits per client independently', async () => {
    const clientA = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
      apiKey: 'client-a-key',
    });

    const clientB = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
      apiKey: 'client-b-key',
    });

    // Client A exhausts their limit
    await clientA.sendConcurrent('GET', '/api/v1/products', 110);

    // Client B should still be able to make requests
    const responseB = await clientB.get('/api/v1/products');
    expect(responseB.status).toBe(200);
  });

  it('should reset rate limit after the window expires', async () => {
    const RATE_LIMIT = 100;

    // Exhaust the rate limit
    await gateway.sendConcurrent('GET', '/api/v1/products', RATE_LIMIT + 10);

    // Verify we are rate limited
    const blockedResponse = await gateway.get('/api/v1/products');
    expect(blockedResponse.status).toBe(429);

    // Wait for window reset (check Retry-After header)
    const retryAfter = parseInt(blockedResponse.headers['retry-after']) || 60;
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));

    // Should be allowed again
    const recoveredResponse = await gateway.get('/api/v1/products');
    expect(recoveredResponse.status).toBe(200);
  }, 120000);
});
```

### Sliding Window Rate Limiting

```typescript
describe('Sliding Window Rate Limiting', () => {
  const gateway = new GatewayClient({
    baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
    apiKey: 'sliding-window-key',
  });

  it('should enforce sliding window limits across time boundaries', async () => {
    // Send 50 requests in first half of the window
    const firstBatch = await gateway.sendConcurrent('GET', '/api/v1/data', 50);
    expect(firstBatch.filter((r) => r.status === 200).length).toBe(50);

    // Wait half the window
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Send another 60 requests -- should hit limit since window slides
    const secondBatch = await gateway.sendConcurrent('GET', '/api/v1/data', 60);
    const rejected = secondBatch.filter((r) => r.status === 429);
    expect(rejected.length).toBeGreaterThan(0);
  }, 120000);
});
```

## Request Routing Tests

```typescript
import { describe, it, expect } from '@jest/globals';
import { GatewayClient } from '../utils/gateway-client';

describe('Request Routing', () => {
  const gateway = new GatewayClient({
    baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
  });

  it('should route requests based on path prefix', async () => {
    const usersResponse = await gateway.get('/api/v1/users');
    expect(usersResponse.status).toBe(200);
    expect(usersResponse.headers['x-upstream']).toBe('users-service');

    const productsResponse = await gateway.get('/api/v1/products');
    expect(productsResponse.status).toBe(200);
    expect(productsResponse.headers['x-upstream']).toBe('products-service');

    const ordersResponse = await gateway.get('/api/v1/orders');
    expect(ordersResponse.status).toBe(200);
    expect(ordersResponse.headers['x-upstream']).toBe('orders-service');
  });

  it('should route based on request headers', async () => {
    const v1Response = await gateway.get('/api/products', {
      'Accept-Version': 'v1',
    });
    expect(v1Response.headers['x-api-version']).toBe('v1');

    const v2Response = await gateway.get('/api/products', {
      'Accept-Version': 'v2',
    });
    expect(v2Response.headers['x-api-version']).toBe('v2');
  });

  it('should route based on HTTP method', async () => {
    const getResponse = await gateway.get('/api/v1/resources');
    expect(getResponse.status).toBe(200);

    const postResponse = await gateway.post('/api/v1/resources', { name: 'test' });
    expect(postResponse.status).toBe(201);

    const deleteResponse = await gateway.delete('/api/v1/resources/123');
    expect(deleteResponse.status).toBe(204);
  });

  it('should return 404 for unmatched routes', async () => {
    const response = await gateway.get('/api/v1/nonexistent-endpoint');
    expect(response.status).toBe(404);
    expect(response.data).toHaveProperty('error');
  });

  it('should handle path parameter extraction correctly', async () => {
    const response = await gateway.get('/api/v1/users/12345/orders');
    expect(response.status).toBe(200);
    // Backend should receive the extracted path parameters
    expect(response.data.userId).toBe('12345');
  });

  it('should preserve query parameters through routing', async () => {
    const response = await gateway.get('/api/v1/products?page=2&limit=10&sort=price');
    expect(response.status).toBe(200);
    expect(response.data.pagination).toEqual(
      expect.objectContaining({
        page: 2,
        limit: 10,
      })
    );
  });
});
```

## Authentication Proxy Testing

```typescript
import { describe, it, expect } from '@jest/globals';
import { GatewayClient } from '../utils/gateway-client';
import { generateJWT, generateExpiredJWT } from '../utils/jwt-helpers';

describe('Authentication Proxy', () => {
  it('should reject requests without authentication', async () => {
    const gateway = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
    });

    const response = await gateway.get('/api/v1/protected/resource');
    expect(response.status).toBe(401);
    expect(response.data.error).toContain('authentication required');
  });

  it('should accept valid JWT tokens', async () => {
    const token = generateJWT({ sub: 'user-123', role: 'admin' });
    const gateway = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
      jwtToken: token,
    });

    const response = await gateway.get('/api/v1/protected/resource');
    expect(response.status).toBe(200);
    // Gateway should forward user identity to upstream
    expect(response.headers['x-user-id']).toBe('user-123');
  });

  it('should reject expired JWT tokens', async () => {
    const expiredToken = generateExpiredJWT({ sub: 'user-123' });
    const gateway = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
      jwtToken: expiredToken,
    });

    const response = await gateway.get('/api/v1/protected/resource');
    expect(response.status).toBe(401);
    expect(response.data.error).toContain('token expired');
  });

  it('should reject JWT with invalid signature', async () => {
    const tampered = generateJWT({ sub: 'user-123' }, 'wrong-secret-key');
    const gateway = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
      jwtToken: tampered,
    });

    const response = await gateway.get('/api/v1/protected/resource');
    expect(response.status).toBe(401);
  });

  it('should validate API key authentication', async () => {
    const validKeyGateway = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
      apiKey: 'valid-api-key-12345',
    });

    const response = await validKeyGateway.get('/api/v1/data');
    expect(response.status).toBe(200);

    const invalidKeyGateway = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
      apiKey: 'invalid-key',
    });

    const rejectedResponse = await invalidKeyGateway.get('/api/v1/data');
    expect(rejectedResponse.status).toBe(403);
  });

  it('should enforce role-based access control', async () => {
    const adminToken = generateJWT({ sub: 'admin-1', role: 'admin' });
    const viewerToken = generateJWT({ sub: 'viewer-1', role: 'viewer' });

    const adminGateway = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
      jwtToken: adminToken,
    });
    const viewerGateway = new GatewayClient({
      baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
      jwtToken: viewerToken,
    });

    // Admin can delete
    const adminDelete = await adminGateway.delete('/api/v1/resources/123');
    expect(adminDelete.status).toBe(204);

    // Viewer cannot delete
    const viewerDelete = await viewerGateway.delete('/api/v1/resources/456');
    expect(viewerDelete.status).toBe(403);
  });
});
```

## Circuit Breaker Testing

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { GatewayClient } from '../utils/gateway-client';
import { MockServer } from '../utils/mock-server';

describe('Circuit Breaker', () => {
  const gateway = new GatewayClient({
    baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
    apiKey: 'test-key',
  });
  let mockBackend: MockServer;

  beforeEach(async () => {
    mockBackend = new MockServer(3001);
    await mockBackend.start();
  });

  afterEach(async () => {
    await mockBackend.stop();
  });

  it('should trip circuit breaker after consecutive failures', async () => {
    // Configure mock to return 500 errors
    mockBackend.setResponseCode(500);

    const FAILURE_THRESHOLD = 5;

    // Send enough requests to trip the circuit breaker
    for (let i = 0; i < FAILURE_THRESHOLD + 2; i++) {
      await gateway.get('/api/v1/unstable-service');
    }

    // Circuit should now be open -- gateway returns 503
    const response = await gateway.get('/api/v1/unstable-service');
    expect(response.status).toBe(503);
    expect(response.data.error).toContain('circuit breaker');
  });

  it('should recover after the circuit breaker timeout', async () => {
    // Trip the circuit
    mockBackend.setResponseCode(500);
    for (let i = 0; i < 10; i++) {
      await gateway.get('/api/v1/unstable-service');
    }

    // Verify circuit is open
    const openResponse = await gateway.get('/api/v1/unstable-service');
    expect(openResponse.status).toBe(503);

    // Fix the backend
    mockBackend.setResponseCode(200);

    // Wait for circuit breaker timeout (half-open state)
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Next request should be allowed through (half-open test)
    const recoveryResponse = await gateway.get('/api/v1/unstable-service');
    expect(recoveryResponse.status).toBe(200);
  }, 60000);

  it('should not trip circuit breaker for client errors (4xx)', async () => {
    mockBackend.setResponseCode(400);

    // Send many 400 errors
    for (let i = 0; i < 20; i++) {
      await gateway.get('/api/v1/unstable-service');
    }

    // Circuit should remain closed -- 400s are client errors, not backend failures
    mockBackend.setResponseCode(200);
    const response = await gateway.get('/api/v1/unstable-service');
    expect(response.status).toBe(200);
  });
});
```

## Request/Response Transformation Tests

```typescript
describe('Request/Response Transformation', () => {
  const gateway = new GatewayClient({
    baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
    apiKey: 'test-key',
  });

  it('should add required headers to upstream requests', async () => {
    const response = await gateway.get('/api/v1/echo-headers');

    // Gateway should add correlation ID
    expect(response.data.receivedHeaders['x-correlation-id']).toBeDefined();
    expect(response.data.receivedHeaders['x-correlation-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );

    // Gateway should add request timestamp
    expect(response.data.receivedHeaders['x-request-timestamp']).toBeDefined();
  });

  it('should strip sensitive headers from responses', async () => {
    const response = await gateway.get('/api/v1/products');

    // Internal headers should be stripped
    expect(response.headers['x-internal-service-id']).toBeUndefined();
    expect(response.headers['x-debug-trace']).toBeUndefined();
    expect(response.headers['server']).toBeUndefined();
  });

  it('should transform response body format based on Accept header', async () => {
    const jsonResponse = await gateway.get('/api/v1/products', {
      Accept: 'application/json',
    });
    expect(jsonResponse.headers['content-type']).toContain('application/json');

    const xmlResponse = await gateway.get('/api/v1/products', {
      Accept: 'application/xml',
    });
    expect(xmlResponse.headers['content-type']).toContain('application/xml');
  });
});
```

## CORS Gateway Configuration Testing

```typescript
describe('CORS Policy Enforcement', () => {
  const gateway = new GatewayClient({
    baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
  });

  it('should allow requests from whitelisted origins', async () => {
    const response = await gateway.get('/api/v1/products', {
      Origin: 'https://app.example.com',
    });

    expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com');
    expect(response.status).toBe(200);
  });

  it('should reject requests from non-whitelisted origins', async () => {
    const response = await gateway.get('/api/v1/products', {
      Origin: 'https://malicious-site.com',
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should handle preflight OPTIONS requests correctly', async () => {
    const response = await gateway.client.options('/api/v1/products', {
      headers: {
        Origin: 'https://app.example.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-methods']).toContain('POST');
    expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    expect(response.headers['access-control-max-age']).toBeDefined();
  });

  it('should not allow disallowed HTTP methods', async () => {
    const response = await gateway.client.options('/api/v1/products', {
      headers: {
        Origin: 'https://app.example.com',
        'Access-Control-Request-Method': 'PATCH',
      },
    });

    const allowedMethods = response.headers['access-control-allow-methods'] || '';
    expect(allowedMethods).not.toContain('PATCH');
  });
});
```

## Python Gateway Tests

```python
# test_gateway.py
import pytest
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

GATEWAY_URL = "http://localhost:8000"

class TestRateLimiting:
    """Test rate limiting at the API gateway."""

    def test_allows_requests_within_limit(self):
        """Should allow requests within the configured rate limit."""
        headers = {"X-API-Key": "test-key"}
        responses = []

        for _ in range(50):
            resp = requests.get(f"{GATEWAY_URL}/api/v1/products", headers=headers)
            responses.append(resp)

        success_count = sum(1 for r in responses if r.status_code == 200)
        assert success_count == 50

    def test_rejects_requests_exceeding_limit(self):
        """Should return 429 when rate limit is exceeded."""
        headers = {"X-API-Key": "burst-test-key"}

        def make_request():
            return requests.get(f"{GATEWAY_URL}/api/v1/products", headers=headers)

        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_request) for _ in range(150)]
            responses = [f.result() for f in as_completed(futures)]

        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes, "Expected at least one 429 response"

    def test_rate_limit_headers_present(self):
        """Should include rate limit headers in responses."""
        headers = {"X-API-Key": "header-test-key"}
        resp = requests.get(f"{GATEWAY_URL}/api/v1/products", headers=headers)

        assert "X-RateLimit-Limit" in resp.headers
        assert "X-RateLimit-Remaining" in resp.headers
        assert "X-RateLimit-Reset" in resp.headers


class TestCircuitBreaker:
    """Test circuit breaker behavior at the gateway."""

    def test_circuit_opens_after_failures(self):
        """Should open circuit after consecutive backend failures."""
        headers = {"X-API-Key": "circuit-test-key"}

        # Trigger backend failures
        for _ in range(10):
            requests.get(f"{GATEWAY_URL}/api/v1/failing-service", headers=headers)

        # Circuit should be open
        resp = requests.get(f"{GATEWAY_URL}/api/v1/failing-service", headers=headers)
        assert resp.status_code == 503
        assert "circuit" in resp.json().get("error", "").lower()

    def test_circuit_recovers(self):
        """Should allow requests after circuit breaker timeout."""
        headers = {"X-API-Key": "recovery-test-key"}

        # Trip the circuit
        for _ in range(10):
            requests.get(f"{GATEWAY_URL}/api/v1/flaky-service", headers=headers)

        # Wait for recovery window
        time.sleep(30)

        resp = requests.get(f"{GATEWAY_URL}/api/v1/flaky-service", headers=headers)
        assert resp.status_code in [200, 503]  # Half-open state may succeed or fail


class TestHealthChecks:
    """Test gateway health check endpoints."""

    def test_gateway_health_endpoint(self):
        resp = requests.get(f"{GATEWAY_URL}/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    def test_gateway_readiness_check(self):
        resp = requests.get(f"{GATEWAY_URL}/ready")
        assert resp.status_code == 200
        data = resp.json()
        assert "upstreams" in data
        for upstream in data["upstreams"]:
            assert upstream["status"] in ["healthy", "degraded"]

    def test_gateway_liveness_check(self):
        resp = requests.get(f"{GATEWAY_URL}/live")
        assert resp.status_code == 200
```

## Gateway Failover Testing

```typescript
describe('Gateway Failover', () => {
  const gateway = new GatewayClient({
    baseURL: process.env.GATEWAY_URL || 'http://localhost:8000',
    apiKey: 'failover-key',
  });

  it('should failover to secondary upstream when primary is down', async () => {
    // Simulate primary being down (mock server stopped)
    const response = await gateway.get('/api/v1/critical-service');

    // Gateway should route to secondary upstream
    expect(response.status).toBe(200);
    expect(response.headers['x-served-by']).toMatch(/secondary|backup/);
  });

  it('should return cached response when all upstreams are unavailable', async () => {
    // First request populates cache
    const initialResponse = await gateway.get('/api/v1/cacheable-data');
    expect(initialResponse.status).toBe(200);

    // All upstreams down -- should serve stale cache
    const cachedResponse = await gateway.get('/api/v1/cacheable-data');
    expect(cachedResponse.status).toBe(200);
    expect(cachedResponse.headers['x-cache-status']).toBe('STALE');
  });

  it('should respect timeout configuration for slow upstreams', async () => {
    const startTime = Date.now();
    const response = await gateway.get('/api/v1/slow-service');
    const duration = Date.now() - startTime;

    // Gateway should timeout before the slow service responds
    expect(response.status).toBe(504);
    expect(duration).toBeLessThan(10000); // Should timeout within configured limit
  });
});
```

## Best Practices

1. **Always test rate limits with concurrent requests** -- Sequential requests may pass due to processing time between them. Use parallel requests to accurately test limits.
2. **Verify rate limit headers on every response** -- The `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers must be present and accurate.
3. **Test authentication at the gateway level** -- Do not rely on backend services to enforce auth. The gateway must reject unauthenticated requests before they reach upstreams.
4. **Mock backend services for isolation** -- Use lightweight mock servers to test gateway behavior without depending on real backend availability.
5. **Test circuit breaker recovery, not just tripping** -- Verify that the circuit breaker transitions from open to half-open to closed correctly.
6. **Include CORS preflight tests** -- Many CORS bugs only manifest on preflight OPTIONS requests. Test all origin, method, and header combinations.
7. **Validate request correlation IDs** -- Every request should receive a unique correlation ID that propagates through the entire request chain.
8. **Test with realistic payload sizes** -- Gateway request/response size limits are often misconfigured. Test with payloads at and above the limit.
9. **Verify gateway logging and metrics** -- Assert that access logs contain correct status codes, latency, and upstream information.
10. **Test configuration hot-reload** -- Verify that route and policy changes take effect without gateway restart.

## Anti-Patterns to Avoid

1. **Testing rate limits with single sequential requests** -- This does not exercise the actual rate limiting mechanism under load.
2. **Hardcoding gateway URLs** -- Always use environment variables for gateway endpoints to support different test environments.
3. **Ignoring clock skew in rate limit tests** -- Rate limit windows depend on time. Account for clock differences between test runner and gateway.
4. **Testing only the happy path for authentication** -- Always test expired tokens, invalid signatures, missing tokens, and revoked tokens.
5. **Not testing timeout behavior** -- Gateways must handle slow backends gracefully. Verify timeout and retry behavior explicitly.
6. **Skipping error response format validation** -- Error responses (4xx, 5xx) should have a consistent format with error codes and messages.
7. **Testing CORS only from the browser** -- CORS headers are HTTP headers. Test them programmatically to ensure they are set correctly by the gateway.
8. **Ignoring response caching behavior** -- Gateway caching can mask backend issues. Verify cache-hit, cache-miss, and stale-while-revalidate behavior.
9. **Not cleaning up rate limit state between test runs** -- Rate limit counters persist between tests. Reset state or use unique keys per test.
10. **Testing load balancing without tracking individual upstream responses** -- Use upstream identification headers to verify that requests are distributed correctly.

## Running Gateway Tests

- Run all gateway tests: `npx jest tests/gateway/ --runInBand`
- Run rate limiting tests: `npx jest tests/gateway/rate-limiting/`
- Run auth tests: `npx jest tests/gateway/auth/`
- Run with verbose output: `npx jest tests/gateway/ --verbose`
- Run Python tests: `pytest tests/test_gateway.py -v`
- Run with concurrent test execution: `pytest tests/test_gateway.py -n 4`
- Start mock backend: `npx tsx tests/fixtures/mock-backend/server.ts`
- Run a single test file: `npx jest tests/gateway/circuit-breaker/trip-threshold.test.ts`
