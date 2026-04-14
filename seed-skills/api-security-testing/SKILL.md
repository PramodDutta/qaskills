---
name: API Security Testing
description: Comprehensive API security testing based on OWASP API Security Top 10 including broken authentication, injection attacks, rate limiting, BOLA/BFLA vulnerabilities, and automated security scanning with ZAP and custom scripts.
version: 1.0.0
author: thetestingacademy
license: MIT
tags: [api-security, owasp, authentication, authorization, injection, rate-limiting, bola, bfla, zap, security-scanning]
testingTypes: [security, api, integration, e2e]
frameworks: [playwright, vitest, jest, zap]
languages: [typescript, javascript, python]
domains: [api, backend, security]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# API Security Testing Skill

You are an expert in API security testing. When the user asks you to test API security, implement OWASP API Top 10 checks, detect authentication and authorization vulnerabilities, or set up automated security scanning, follow these detailed instructions.

## Core Principles

1. **OWASP API Security Top 10 coverage** -- Every API security test suite must cover all 10 categories from the OWASP API Security Top 10 list, adapted to the specific API being tested.
2. **Authentication before authorization** -- Test authentication mechanisms first (token validation, session management, credential handling), then test authorization (access control, privilege escalation).
3. **Broken Object Level Authorization (BOLA)** -- The most critical API vulnerability. Test that every endpoint verifies the requesting user has access to the specific resource being requested.
4. **Input validation at every boundary** -- Test all input vectors: path parameters, query strings, headers, request bodies, and file uploads for injection, overflow, and type confusion attacks.
5. **Rate limiting and resource exhaustion** -- Verify that APIs implement rate limiting, request size limits, and pagination caps to prevent denial-of-service attacks.
6. **Sensitive data exposure** -- Verify that APIs do not leak sensitive information in responses, error messages, headers, or logs.
7. **Automated scanning plus manual testing** -- Automated tools catch common vulnerabilities. Manual testing catches business logic flaws. Both are required.

## Project Structure

```
security-tests/
  owasp/
    bola.test.ts
    broken-auth.test.ts
    broken-object-property.test.ts
    unrestricted-resource.test.ts
    broken-function-level-auth.test.ts
    mass-assignment.test.ts
    ssrf.test.ts
    security-misconfiguration.test.ts
    improper-inventory.test.ts
    unsafe-api-consumption.test.ts
  auth/
    token-validation.test.ts
    session-management.test.ts
    credential-handling.test.ts
    oauth-flow.test.ts
  injection/
    sql-injection.test.ts
    nosql-injection.test.ts
    command-injection.test.ts
    xss-injection.test.ts
    header-injection.test.ts
  rate-limiting/
    rate-limit.test.ts
    resource-exhaustion.test.ts
  helpers/
    api-client.ts
    token-generator.ts
    payload-generator.ts
    vulnerability-reporter.ts
  config/
    security-config.ts
    endpoints.ts
  reports/
    .gitkeep
```

## BOLA (Broken Object Level Authorization) Testing

```typescript
// security-tests/owasp/bola.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { SecurityApiClient } from '../helpers/api-client';

describe('BOLA - Broken Object Level Authorization', () => {
  let userAClient: SecurityApiClient;
  let userBClient: SecurityApiClient;
  let adminClient: SecurityApiClient;
  let userAResourceId: string;

  beforeAll(async () => {
    userAClient = await SecurityApiClient.authenticateAs('userA');
    userBClient = await SecurityApiClient.authenticateAs('userB');
    adminClient = await SecurityApiClient.authenticateAs('admin');

    // Create a resource owned by User A
    const response = await userAClient.post('/api/resources', { name: 'Private Resource' });
    userAResourceId = response.data.id;
  });

  it('should prevent User B from accessing User A resources', async () => {
    const response = await userBClient.get(`/api/resources/${userAResourceId}`);
    expect(response.status).toBe(403);
  });

  it('should prevent User B from modifying User A resources', async () => {
    const response = await userBClient.put(`/api/resources/${userAResourceId}`, {
      name: 'Hacked',
    });
    expect(response.status).toBe(403);
  });

  it('should prevent User B from deleting User A resources', async () => {
    const response = await userBClient.delete(`/api/resources/${userAResourceId}`);
    expect(response.status).toBe(403);
  });

  it('should prevent IDOR via numeric ID enumeration', async () => {
    // Try accessing resources by incrementing/decrementing IDs
    const numericId = parseInt(userAResourceId, 10);
    if (!isNaN(numericId)) {
      for (let offset = -5; offset <= 5; offset++) {
        if (offset === 0) continue;
        const testId = numericId + offset;
        const response = await userBClient.get(`/api/resources/${testId}`);
        expect([403, 404]).toContain(response.status);
      }
    }
  });

  it('should prevent IDOR via UUID guessing', async () => {
    // Try variations of the UUID
    const uuidVariations = [
      userAResourceId.replace(/-/g, ''),
      userAResourceId.toUpperCase(),
      userAResourceId.slice(0, -1) + '0',
    ];

    for (const variation of uuidVariations) {
      const response = await userBClient.get(`/api/resources/${variation}`);
      if (response.status === 200) {
        expect.fail(`BOLA vulnerability: User B accessed resource with ID variation: ${variation}`);
      }
    }
  });

  it('should prevent accessing resources via nested endpoints', async () => {
    // Test nested resource access patterns
    const nestedEndpoints = [
      `/api/users/${userAResourceId}/profile`,
      `/api/resources/${userAResourceId}/details`,
      `/api/resources/${userAResourceId}/comments`,
    ];

    for (const endpoint of nestedEndpoints) {
      const response = await userBClient.get(endpoint);
      expect([403, 404]).toContain(response.status);
    }
  });
});
```

## Authentication Testing

```typescript
// security-tests/auth/token-validation.test.ts
import { describe, it, expect } from 'vitest';
import { SecurityApiClient } from '../helpers/api-client';

describe('Authentication - Token Validation', () => {
  it('should reject requests without tokens', async () => {
    const client = new SecurityApiClient();
    const response = await client.get('/api/protected-resource');
    expect(response.status).toBe(401);
  });

  it('should reject expired tokens', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.expired';
    const client = new SecurityApiClient(expiredToken);
    const response = await client.get('/api/protected-resource');
    expect(response.status).toBe(401);
  });

  it('should reject malformed tokens', async () => {
    const malformedTokens = [
      'not-a-jwt',
      'Bearer invalid',
      'eyJhbGciOiJub25lIn0.eyJ0ZXN0IjoiZGF0YSJ9.',
      '',
      'null',
      'undefined',
    ];

    for (const token of malformedTokens) {
      const client = new SecurityApiClient(token);
      const response = await client.get('/api/protected-resource');
      expect(response.status).toBe(401);
    }
  });

  it('should reject tokens with algorithm none attack', async () => {
    // JWT with alg:none header
    const noneAlgToken = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
      + '.' + Buffer.from(JSON.stringify({ sub: '1', role: 'admin' })).toString('base64url')
      + '.';

    const client = new SecurityApiClient(noneAlgToken);
    const response = await client.get('/api/admin/users');
    expect(response.status).toBe(401);
  });

  it('should reject tokens signed with wrong key', async () => {
    // This would be a JWT signed with an attacker-controlled key
    const wrongKeyToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIn0.wrong_signature';
    const client = new SecurityApiClient(wrongKeyToken);
    const response = await client.get('/api/protected-resource');
    expect(response.status).toBe(401);
  });

  it('should not expose token details in error responses', async () => {
    const client = new SecurityApiClient('invalid-token');
    const response = await client.get('/api/protected-resource');

    const body = await response.text();
    expect(body).not.toContain('invalid-token');
    expect(body).not.toContain('secret');
    expect(body).not.toContain('key');
  });
});
```

## Injection Testing

```typescript
// security-tests/injection/sql-injection.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { SecurityApiClient } from '../helpers/api-client';
import { SQL_INJECTION_PAYLOADS } from '../helpers/payload-generator';

describe('SQL Injection Testing', () => {
  let client: SecurityApiClient;

  beforeAll(async () => {
    client = await SecurityApiClient.authenticateAs('userA');
  });

  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT username, password FROM users --",
    "1; SELECT * FROM information_schema.tables",
    "' OR 1=1 --",
    "admin'--",
    "1' ORDER BY 1--",
    "' AND 1=CONVERT(int, (SELECT TOP 1 table_name FROM information_schema.tables))--",
  ];

  it('should reject SQL injection in query parameters', async () => {
    for (const payload of sqlPayloads) {
      const response = await client.get(`/api/users?search=${encodeURIComponent(payload)}`);
      expect([400, 200]).toContain(response.status);

      if (response.status === 200) {
        const body = await response.json();
        // Verify no data leak
        expect(JSON.stringify(body)).not.toContain('information_schema');
        expect(JSON.stringify(body)).not.toContain('password');
      }
    }
  });

  it('should reject SQL injection in path parameters', async () => {
    for (const payload of sqlPayloads) {
      const response = await client.get(`/api/users/${encodeURIComponent(payload)}`);
      expect([400, 404]).toContain(response.status);
    }
  });

  it('should reject SQL injection in request body', async () => {
    for (const payload of sqlPayloads) {
      const response = await client.post('/api/users/search', { query: payload });
      expect(response.status).not.toBe(500);
    }
  });

  it('should not expose SQL error details in responses', async () => {
    const response = await client.get("/api/users?id=' OR 1=1");
    const body = await response.text();

    expect(body.toLowerCase()).not.toContain('sql');
    expect(body.toLowerCase()).not.toContain('syntax error');
    expect(body.toLowerCase()).not.toContain('mysql');
    expect(body.toLowerCase()).not.toContain('postgresql');
    expect(body.toLowerCase()).not.toContain('sqlite');
  });
});
```

## Rate Limiting Testing

```typescript
// security-tests/rate-limiting/rate-limit.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { SecurityApiClient } from '../helpers/api-client';

describe('Rate Limiting', () => {
  let client: SecurityApiClient;

  beforeAll(async () => {
    client = await SecurityApiClient.authenticateAs('userA');
  });

  it('should enforce rate limits on authentication endpoint', async () => {
    const responses = [];
    for (let i = 0; i < 20; i++) {
      const response = await client.post('/api/auth/login', {
        email: 'test@test.com',
        password: 'wrong',
      });
      responses.push(response.status);
    }

    const rateLimited = responses.filter((s) => s === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('should include rate limit headers', async () => {
    const response = await client.get('/api/users');
    const headers = response.headers;

    // At least one rate limiting header should be present
    const hasRateHeaders =
      headers.get('x-ratelimit-limit') ||
      headers.get('x-ratelimit-remaining') ||
      headers.get('retry-after') ||
      headers.get('ratelimit-limit');

    expect(hasRateHeaders).toBeTruthy();
  });

  it('should limit request body size', async () => {
    const largePayload = { data: 'x'.repeat(10 * 1024 * 1024) }; // 10MB
    const response = await client.post('/api/data', largePayload);
    expect([413, 400]).toContain(response.status);
  });

  it('should limit pagination size', async () => {
    const response = await client.get('/api/users?limit=100000');
    const body = await response.json();

    if (response.status === 200) {
      expect(body.data?.length || body.length || 0).toBeLessThanOrEqual(100);
    }
  });
});
```

## Security API Client Helper

```typescript
// security-tests/helpers/api-client.ts
export class SecurityApiClient {
  private baseUrl: string;
  private token: string;

  constructor(token = '') {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    this.token = token;
  }

  static async authenticateAs(role: string): Promise<SecurityApiClient> {
    const credentials: Record<string, { email: string; password: string }> = {
      userA: { email: 'usera@test.com', password: 'TestPass123!' },
      userB: { email: 'userb@test.com', password: 'TestPass456!' },
      admin: { email: 'admin@test.com', password: 'AdminPass789!' },
    };

    const cred = credentials[role];
    if (!cred) throw new Error(`Unknown role: ${role}`);

    const response = await fetch(`${new SecurityApiClient().baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cred),
    });

    const data = await response.json();
    return new SecurityApiClient(data.token);
  }

  async get(path: string): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
    });
  }

  async post(path: string, body: any): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async put(path: string, body: any): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: { ...this.getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async delete(path: string): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }
}
```

## Mass Assignment Testing

```typescript
// security-tests/owasp/mass-assignment.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { SecurityApiClient } from '../helpers/api-client';

describe('Mass Assignment Vulnerability', () => {
  let userClient: SecurityApiClient;

  beforeAll(async () => {
    userClient = await SecurityApiClient.authenticateAs('userA');
  });

  it('should not allow setting role via user update endpoint', async () => {
    const response = await userClient.put('/api/users/me', {
      name: 'Updated Name',
      role: 'admin',
    });

    // Verify the role was not changed
    const profile = await userClient.get('/api/users/me');
    const data = await profile.json();
    expect(data.role).not.toBe('admin');
  });

  it('should not allow setting isVerified via registration', async () => {
    const response = await userClient.post('/api/users', {
      name: 'New User',
      email: 'new@test.com',
      password: 'Password123!',
      isVerified: true,
      isAdmin: true,
    });

    if (response.status === 201) {
      const data = await response.json();
      expect(data.isVerified).not.toBe(true);
      expect(data.isAdmin).not.toBe(true);
    }
  });

  it('should not allow modifying internal fields', async () => {
    const internalFields = [
      { createdAt: '2020-01-01T00:00:00Z' },
      { updatedAt: '2020-01-01T00:00:00Z' },
      { deletedAt: null },
      { passwordHash: 'malicious_hash' },
      { accountBalance: 999999 },
    ];

    for (const field of internalFields) {
      const response = await userClient.put('/api/users/me', {
        name: 'Test',
        ...field,
      });

      const profile = await userClient.get('/api/users/me');
      const data = await profile.json();
      const fieldName = Object.keys(field)[0];
      expect(data[fieldName]).not.toBe(Object.values(field)[0]);
    }
  });
});
```

## Security Headers Verification

```typescript
// security-tests/headers/security-headers.test.ts
import { describe, it, expect } from 'vitest';

describe('Security Headers', () => {
  const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

  it('should include CORS headers', async () => {
    const response = await fetch(BASE_URL, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil-site.com' },
    });

    const allowOrigin = response.headers.get('access-control-allow-origin');
    if (allowOrigin) {
      expect(allowOrigin).not.toBe('*');
      expect(allowOrigin).not.toBe('https://evil-site.com');
    }
  });

  it('should include security headers', async () => {
    const response = await fetch(BASE_URL);

    // Content-Type options
    const xContentType = response.headers.get('x-content-type-options');
    expect(xContentType).toBe('nosniff');

    // Frame options
    const xFrame = response.headers.get('x-frame-options');
    expect(['DENY', 'SAMEORIGIN']).toContain(xFrame);

    // Strict transport security
    if (BASE_URL.startsWith('https')) {
      const hsts = response.headers.get('strict-transport-security');
      expect(hsts).toBeTruthy();
    }
  });

  it('should not expose server information', async () => {
    const response = await fetch(BASE_URL);

    const server = response.headers.get('server');
    const poweredBy = response.headers.get('x-powered-by');

    // Server header should not reveal specific version
    if (server) {
      expect(server).not.toMatch(/\d+\.\d+/);
    }
    // X-Powered-By should not be present
    expect(poweredBy).toBeNull();
  });
});
```

## Best Practices

1. **Test all OWASP API Top 10 categories** -- Use the OWASP API Security Top 10 as your checklist. No API security test suite is complete without covering all categories.
2. **Test with multiple user roles** -- Create test users with different permission levels and verify each endpoint enforces proper authorization.
3. **Automate common vulnerability checks** -- SQL injection, XSS, and authentication bypass tests can be automated and run in CI.
4. **Test error responses for information leakage** -- Error messages should never reveal stack traces, SQL queries, or internal system details.
5. **Verify rate limiting on sensitive endpoints** -- Authentication, password reset, and payment endpoints must have aggressive rate limits.
6. **Test with manipulation of request parameters** -- Modify IDs, add unexpected fields, change HTTP methods, and alter content types.
7. **Include security headers verification** -- Check for CORS, CSP, HSTS, X-Frame-Options, and X-Content-Type-Options headers.
8. **Test token lifecycle** -- Verify tokens expire, cannot be reused after logout, and are properly invalidated on password change.
9. **Run security tests in a separate environment** -- Security tests can be destructive. Run them against dedicated test environments.
10. **Document and report all findings** -- Every security finding should be documented with severity, reproduction steps, and remediation guidance.

## Anti-Patterns

1. **Only testing with valid credentials** -- Security testing requires testing with invalid, expired, and manipulated credentials to find authentication bypasses.
2. **Skipping BOLA testing** -- BOLA is the number one API vulnerability. Testing only with the resource owner misses authorization flaws.
3. **Running security tests against production** -- Security tests can cause data corruption and denial of service. Always use dedicated test environments.
4. **Relying only on automated scanners** -- Automated tools miss business logic vulnerabilities. Combine scanning with manual security testing.
5. **Not testing error responses** -- Error responses that leak stack traces, SQL queries, or internal paths are critical information disclosure vulnerabilities.
6. **Ignoring rate limiting** -- APIs without rate limiting are vulnerable to brute force attacks and denial of service.
7. **Testing only the documented API** -- Undocumented endpoints, debug routes, and admin panels are often the most vulnerable. Discover and test them.
8. **Not testing mass assignment** -- APIs that accept arbitrary fields in request bodies may allow attackers to modify protected fields like role or isAdmin.
9. **Skipping CORS testing** -- Misconfigured CORS headers can expose APIs to cross-origin attacks from malicious websites.
10. **Not retesting after fixes** -- Verify that security fixes actually resolve the vulnerability. Regressions in security patches are common.
