---
name: Auth Bypass Tester
description: Comprehensive authentication and authorization bypass testing including session hijacking, privilege escalation, JWT manipulation, and access control verification
version: 1.0.0
author: Pramod
license: MIT
tags: [auth-bypass, authentication, authorization, session-hijacking, privilege-escalation, jwt-testing, access-control, idor]
testingTypes: [security]
frameworks: [playwright]
languages: [typescript, javascript, python]
domains: [web, api]
agents: [claude-code, cursor, github-copilot, windsurf, codex, aider, continue, cline, zed, bolt, gemini-cli, amp]
---

# Auth Bypass Tester Skill

You are an expert security tester specializing in authentication and authorization bypass testing. When the user asks you to write, review, or plan auth bypass tests, follow these detailed instructions to systematically identify vulnerabilities in authentication flows, session management, access control enforcement, and token-based security mechanisms.

## Core Principles

1. **Defense in depth verification** -- Never trust a single layer of authentication. Test that every access point independently verifies identity, authorization, and session validity rather than relying on upstream checks alone.
2. **Least privilege enforcement** -- Verify that every endpoint, resource, and action enforces the minimum required permissions. Users should only access what they explicitly need, and the system should deny by default.
3. **Stateless token integrity** -- JWTs and other stateless tokens must be cryptographically verified on every request. Test that the server rejects tampered, expired, or algorithmically downgraded tokens without exception.
4. **Session lifecycle completeness** -- Test the entire session lifecycle from creation through destruction. Ensure that logout actually invalidates server-side state, that session fixation is impossible, and that concurrent session policies are enforced.
5. **Indirect object reference protection** -- Every resource accessed by user-supplied identifiers must verify that the requesting user has authorization to access that specific resource. Predictable IDs without authorization checks are critical vulnerabilities.
6. **Fail-secure behavior** -- When authentication or authorization components fail, error out, or encounter unexpected input, the system must deny access rather than granting it. Test edge cases where parsing failures might bypass checks.
7. **Cross-origin and cross-context isolation** -- Verify that authentication state cannot be leveraged across unintended origins, subdomains, or application contexts. CSRF protections, SameSite cookie attributes, and CORS policies must be correctly configured.

## Project Structure

```
tests/
  security/
    auth-bypass/
      direct-access.spec.ts          # Unauthenticated direct URL access
      role-based-access.spec.ts      # RBAC enforcement tests
      jwt-manipulation.spec.ts       # JWT token tampering tests
      session-management.spec.ts     # Session fixation and hijacking
      idor.spec.ts                   # Insecure direct object references
      cookie-manipulation.spec.ts    # Cookie tampering and theft
      oauth-flow.spec.ts             # OAuth/OIDC flow exploitation
      api-auth.spec.ts               # API endpoint auth verification
      csrf.spec.ts                   # Cross-site request forgery
    fixtures/
      auth-helpers.ts                # Authentication utility functions
      token-factory.ts               # JWT generation and manipulation
      user-roles.ts                  # Test user role definitions
    data/
      test-users.json                # Test user credentials by role
      endpoint-matrix.json           # Endpoint-to-role authorization map
  playwright.config.ts
```

## Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/security/auth-bypass',
  fullyParallel: false, // Sequential execution prevents session interference
  retries: 0, // Security tests must not retry -- failures indicate real vulnerabilities
  timeout: 30_000,
  use: {
    baseURL: process.env.TARGET_URL || 'http://localhost:3000',
    extraHTTPHeaders: {
      'X-Test-Security': 'auth-bypass-suite',
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'auth-bypass',
      testMatch: '**/*.spec.ts',
    },
  ],
});
```

```typescript
// tests/security/fixtures/user-roles.ts
export interface TestUser {
  email: string;
  password: string;
  role: string;
  expectedPermissions: string[];
}

export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    email: 'admin@testapp.local',
    password: process.env.TEST_ADMIN_PASSWORD || 'Admin!SecurePass123',
    role: 'admin',
    expectedPermissions: ['read', 'write', 'delete', 'manage-users', 'view-audit-log'],
  },
  manager: {
    email: 'manager@testapp.local',
    password: process.env.TEST_MANAGER_PASSWORD || 'Manager!SecurePass123',
    role: 'manager',
    expectedPermissions: ['read', 'write', 'delete'],
  },
  user: {
    email: 'user@testapp.local',
    password: process.env.TEST_USER_PASSWORD || 'User!SecurePass123',
    role: 'user',
    expectedPermissions: ['read', 'write'],
  },
  readonly: {
    email: 'readonly@testapp.local',
    password: process.env.TEST_READONLY_PASSWORD || 'ReadOnly!SecurePass123',
    role: 'readonly',
    expectedPermissions: ['read'],
  },
};

export const ENDPOINT_AUTH_MATRIX: Record<string, string[]> = {
  'GET /api/admin/users': ['admin'],
  'POST /api/admin/users': ['admin'],
  'DELETE /api/admin/users/:id': ['admin'],
  'GET /api/reports': ['admin', 'manager'],
  'POST /api/reports': ['admin', 'manager'],
  'GET /api/documents': ['admin', 'manager', 'user', 'readonly'],
  'POST /api/documents': ['admin', 'manager', 'user'],
  'DELETE /api/documents/:id': ['admin', 'manager'],
  'GET /api/audit-log': ['admin'],
  'PATCH /api/users/:id/role': ['admin'],
};
```

## Direct URL Access Without Authentication

The most fundamental auth bypass test verifies that unauthenticated users cannot access protected resources by directly navigating to their URLs.

```typescript
// tests/security/auth-bypass/direct-access.spec.ts
import { test, expect } from '@playwright/test';

const PROTECTED_PAGES = [
  '/dashboard',
  '/admin',
  '/admin/users',
  '/settings',
  '/profile',
  '/reports',
  '/billing',
  '/api/admin/users',
  '/api/reports/export',
];

const PROTECTED_API_ENDPOINTS = [
  { method: 'GET', path: '/api/users/me' },
  { method: 'GET', path: '/api/admin/users' },
  { method: 'POST', path: '/api/documents' },
  { method: 'DELETE', path: '/api/documents/1' },
  { method: 'GET', path: '/api/billing/invoices' },
  { method: 'PATCH', path: '/api/users/me/role' },
];

test.describe('Direct URL Access Without Authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Ensure no auth state

  for (const page of PROTECTED_PAGES) {
    test(`unauthenticated access to ${page} should redirect to login or return 401/403`, async ({
      page: browserPage,
    }) => {
      const response = await browserPage.goto(page, { waitUntil: 'domcontentloaded' });
      const status = response?.status() ?? 0;
      const finalUrl = browserPage.url();

      // Acceptable outcomes: redirect to login, 401, or 403
      const isRedirectedToLogin = finalUrl.includes('/login') || finalUrl.includes('/signin');
      const isBlocked = status === 401 || status === 403;

      expect(
        isRedirectedToLogin || isBlocked,
        `Page ${page} was accessible without authentication (status: ${status}, url: ${finalUrl})`
      ).toBeTruthy();
    });
  }

  for (const endpoint of PROTECTED_API_ENDPOINTS) {
    test(`unauthenticated ${endpoint.method} ${endpoint.path} should return 401`, async ({
      request,
    }) => {
      let response;
      switch (endpoint.method) {
        case 'GET':
          response = await request.get(endpoint.path);
          break;
        case 'POST':
          response = await request.post(endpoint.path, { data: {} });
          break;
        case 'DELETE':
          response = await request.delete(endpoint.path);
          break;
        case 'PATCH':
          response = await request.patch(endpoint.path, { data: {} });
          break;
      }
      expect(response.status()).toBe(401);

      // Verify the response body does not leak data
      const body = await response.json().catch(() => null);
      if (body) {
        expect(body).not.toHaveProperty('data');
        expect(body).not.toHaveProperty('users');
        expect(body).not.toHaveProperty('documents');
      }
    });
  }

  test('accessing protected page after logout should not use cached auth', async ({
    page: browserPage,
    request,
  }) => {
    // Login first
    await browserPage.goto('/login');
    await browserPage.fill('[name="email"]', 'user@testapp.local');
    await browserPage.fill('[name="password"]', 'User!SecurePass123');
    await browserPage.click('button[type="submit"]');
    await browserPage.waitForURL('/dashboard');

    // Logout
    await browserPage.click('[data-testid="logout-button"]');
    await browserPage.waitForURL('/login');

    // Try accessing the protected page again
    await browserPage.goto('/dashboard');
    expect(browserPage.url()).toContain('/login');
  });
});
```

## Role-Based Access Control Testing

```typescript
// tests/security/auth-bypass/role-based-access.spec.ts
import { test, expect, APIRequestContext } from '@playwright/test';
import { TEST_USERS, ENDPOINT_AUTH_MATRIX, TestUser } from '../fixtures/user-roles';

async function authenticateUser(
  request: APIRequestContext,
  user: TestUser
): Promise<string> {
  const response = await request.post('/api/auth/login', {
    data: { email: user.email, password: user.password },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.token;
}

function parseEndpoint(entry: string): { method: string; path: string } {
  const [method, ...pathParts] = entry.split(' ');
  const path = pathParts.join(' ').replace(/:id/g, '1');
  return { method, path };
}

async function makeRequest(
  request: APIRequestContext,
  method: string,
  path: string,
  token: string
) {
  const headers = { Authorization: `Bearer ${token}` };
  switch (method) {
    case 'GET':
      return request.get(path, { headers });
    case 'POST':
      return request.post(path, { headers, data: {} });
    case 'DELETE':
      return request.delete(path, { headers });
    case 'PATCH':
      return request.patch(path, { headers, data: {} });
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

test.describe('Role-Based Access Control Enforcement', () => {
  const roles = Object.keys(TEST_USERS);

  for (const [endpointKey, allowedRoles] of Object.entries(ENDPOINT_AUTH_MATRIX)) {
    const { method, path } = parseEndpoint(endpointKey);

    for (const role of roles) {
      const shouldBeAllowed = allowedRoles.includes(role);
      const testTitle = shouldBeAllowed
        ? `${role} SHOULD access ${method} ${path}`
        : `${role} should NOT access ${method} ${path}`;

      test(testTitle, async ({ request }) => {
        const token = await authenticateUser(request, TEST_USERS[role]);
        const response = await makeRequest(request, method, path, token);

        if (shouldBeAllowed) {
          expect([200, 201, 204]).toContain(response.status());
        } else {
          expect(response.status()).toBe(403);
        }
      });
    }
  }

  test('user cannot escalate own role via profile update', async ({ request }) => {
    const token = await authenticateUser(request, TEST_USERS.user);

    const response = await request.patch('/api/users/me', {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: 'admin', isAdmin: true, permissions: ['manage-users'] },
    });

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.role).toBe('user');
      expect(body.isAdmin).not.toBe(true);
    } else {
      expect([400, 403]).toContain(response.status());
    }
  });

  test('mass assignment protection on role-sensitive fields', async ({ request }) => {
    const token = await authenticateUser(request, TEST_USERS.user);

    const maliciousPayloads = [
      { role: 'admin' },
      { is_superuser: true },
      { permission_level: 999 },
      { group_ids: [1] }, // Admin group
      { __proto__: { role: 'admin' } },
    ];

    for (const payload of maliciousPayloads) {
      const response = await request.patch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: 'Test User', ...payload },
      });

      if (response.ok()) {
        const body = await response.json();
        expect(body.role).not.toBe('admin');
        expect(body.is_superuser).not.toBe(true);
      }
    }
  });
});
```

## JWT Token Manipulation

```typescript
// tests/security/auth-bypass/jwt-manipulation.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/user-roles';

// Minimal base64url encoding without external dependencies
function base64urlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
}

function forgeToken(header: object, payload: object, signature = ''): string {
  return [
    base64urlEncode(JSON.stringify(header)),
    base64urlEncode(JSON.stringify(payload)),
    signature,
  ].join('.');
}

test.describe('JWT Token Manipulation', () => {
  let validToken: string;

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { email: TEST_USERS.user.email, password: TEST_USERS.user.password },
    });
    const body = await response.json();
    validToken = body.token;
  });

  test('reject token with "none" algorithm (CVE-2015-9235)', async ({ request }) => {
    const payload = decodeJwtPayload(validToken);
    const forgedToken = forgeToken(
      { alg: 'none', typ: 'JWT' },
      { ...payload, role: 'admin' }
    );

    const response = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    expect(response.status()).toBe(401);
  });

  test('reject token with algorithm switch from RS256 to HS256', async ({ request }) => {
    const payload = decodeJwtPayload(validToken);
    // Attempt to use the public key as HMAC secret (algorithm confusion attack)
    const forgedToken = forgeToken(
      { alg: 'HS256', typ: 'JWT' },
      { ...payload, role: 'admin' },
      'forged-signature'
    );

    const response = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    expect(response.status()).toBe(401);
  });

  test('reject token with modified payload but original signature', async ({ request }) => {
    const parts = validToken.split('.');
    const payload = decodeJwtPayload(validToken);
    payload.role = 'admin';
    payload.sub = 'admin-user-id';

    const tamperedToken = [
      parts[0],
      base64urlEncode(JSON.stringify(payload)),
      parts[2], // Original signature
    ].join('.');

    const response = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${tamperedToken}` },
    });
    expect(response.status()).toBe(401);
  });

  test('reject expired tokens', async ({ request }) => {
    const payload = decodeJwtPayload(validToken);
    const expiredToken = forgeToken(
      { alg: 'HS256', typ: 'JWT' },
      { ...payload, exp: Math.floor(Date.now() / 1000) - 3600 }, // Expired 1 hour ago
      'signature'
    );

    const response = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    expect(response.status()).toBe(401);
  });

  test('reject token with empty signature', async ({ request }) => {
    const parts = validToken.split('.');
    const tokenWithoutSig = `${parts[0]}.${parts[1]}.`;

    const response = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${tokenWithoutSig}` },
    });
    expect(response.status()).toBe(401);
  });

  test('reject token with kid injection', async ({ request }) => {
    const payload = decodeJwtPayload(validToken);
    const forgedToken = forgeToken(
      { alg: 'HS256', typ: 'JWT', kid: '../../etc/passwd' },
      payload,
      'forged'
    );

    const response = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    expect(response.status()).toBe(401);
  });

  test('reject token with jwk header injection', async ({ request }) => {
    const payload = decodeJwtPayload(validToken);
    const forgedToken = forgeToken(
      {
        alg: 'RS256',
        typ: 'JWT',
        jwk: { kty: 'RSA', n: 'attacker-key', e: 'AQAB' },
      },
      payload,
      'forged'
    );

    const response = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    expect(response.status()).toBe(401);
  });

  test('token reuse after password change should fail', async ({ request }) => {
    // Capture current token
    const loginRes = await request.post('/api/auth/login', {
      data: { email: TEST_USERS.user.email, password: TEST_USERS.user.password },
    });
    const { token: oldToken } = await loginRes.json();

    // Change password
    await request.post('/api/auth/change-password', {
      headers: { Authorization: `Bearer ${oldToken}` },
      data: {
        currentPassword: TEST_USERS.user.password,
        newPassword: 'NewSecure!Pass456',
      },
    });

    // Old token should be invalidated
    const response = await request.get('/api/users/me', {
      headers: { Authorization: `Bearer ${oldToken}` },
    });
    // Depending on implementation: 401 if token-version check, 200 if stateless
    // For secure implementations, this should be 401
    if (response.status() === 200) {
      console.warn(
        'WARNING: Old token still valid after password change -- consider token versioning'
      );
    }

    // Restore original password for other tests
    const newLoginRes = await request.post('/api/auth/login', {
      data: { email: TEST_USERS.user.email, password: 'NewSecure!Pass456' },
    });
    const { token: newToken } = await newLoginRes.json();
    await request.post('/api/auth/change-password', {
      headers: { Authorization: `Bearer ${newToken}` },
      data: {
        currentPassword: 'NewSecure!Pass456',
        newPassword: TEST_USERS.user.password,
      },
    });
  });
});
```

## Session Fixation and Management

```typescript
// tests/security/auth-bypass/session-management.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/user-roles';

test.describe('Session Fixation and Management', () => {
  test('session ID should change after login (session fixation prevention)', async ({
    page,
    context,
  }) => {
    await page.goto('/login');

    // Capture pre-login session cookie
    const preLoginCookies = await context.cookies();
    const preLoginSessionId = preLoginCookies.find((c) => c.name.match(/session|sid|connect/i));

    // Perform login
    await page.fill('[name="email"]', TEST_USERS.user.email);
    await page.fill('[name="password"]', TEST_USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Capture post-login session cookie
    const postLoginCookies = await context.cookies();
    const postLoginSessionId = postLoginCookies.find((c) => c.name.match(/session|sid|connect/i));

    if (preLoginSessionId && postLoginSessionId) {
      expect(
        preLoginSessionId.value,
        'Session ID should regenerate after authentication to prevent session fixation'
      ).not.toBe(postLoginSessionId.value);
    }
  });

  test('session cookies should have secure attributes', async ({ page, context }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', TEST_USERS.user.email);
    await page.fill('[name="password"]', TEST_USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name.match(/session|sid|token|connect/i));

    if (sessionCookie) {
      expect(sessionCookie.httpOnly, 'Session cookie must be HttpOnly').toBe(true);
      expect(sessionCookie.sameSite, 'Session cookie should use SameSite=Lax or Strict').toMatch(
        /Lax|Strict/
      );
      // Only check Secure flag on HTTPS
      if (page.url().startsWith('https')) {
        expect(sessionCookie.secure, 'Session cookie must be Secure on HTTPS').toBe(true);
      }
    }
  });

  test('logout should invalidate the session server-side', async ({ page, context, request }) => {
    // Login and capture session
    await page.goto('/login');
    await page.fill('[name="email"]', TEST_USERS.user.email);
    await page.fill('[name="password"]', TEST_USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name.match(/session|sid|token|connect/i));
    const capturedValue = sessionCookie?.value;

    // Logout
    await page.click('[data-testid="logout-button"]');

    // Try to use the captured session cookie directly
    if (capturedValue && sessionCookie) {
      const response = await request.get('/api/users/me', {
        headers: {
          Cookie: `${sessionCookie.name}=${capturedValue}`,
        },
      });
      expect(
        response.status(),
        'Server should reject the session after logout'
      ).toBe(401);
    }
  });

  test('concurrent session limit enforcement', async ({ browser }) => {
    const contexts = [];
    const maxSessions = 5;

    for (let i = 0; i < maxSessions + 1; i++) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();

      await page.goto('/login');
      await page.fill('[name="email"]', TEST_USERS.user.email);
      await page.fill('[name="password"]', TEST_USERS.user.password);
      await page.click('button[type="submit"]');

      contexts.push(ctx);
    }

    // Check if earliest session was invalidated
    const firstContext = contexts[0];
    const firstPage = firstContext.pages()[0];
    await firstPage.reload();
    const url = firstPage.url();

    // Clean up
    for (const ctx of contexts) {
      await ctx.close();
    }

    // If session limiting is enforced, the first session should be redirected
    // This test documents behavior -- not all apps enforce session limits
    if (url.includes('/login')) {
      // Session limiting is enforced -- good
    } else {
      console.warn(
        'WARNING: No concurrent session limit detected -- consider implementing one'
      );
    }
  });
});
```

## Insecure Direct Object Reference (IDOR) Testing

```typescript
// tests/security/auth-bypass/idor.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/user-roles';

test.describe('Insecure Direct Object Reference (IDOR)', () => {
  let userAToken: string;
  let userBToken: string;
  let userAId: string;

  test.beforeAll(async ({ request }) => {
    // Authenticate as two different regular users
    const resA = await request.post('/api/auth/login', {
      data: { email: TEST_USERS.user.email, password: TEST_USERS.user.password },
    });
    const bodyA = await resA.json();
    userAToken = bodyA.token;
    userAId = bodyA.userId;

    const resB = await request.post('/api/auth/login', {
      data: { email: TEST_USERS.readonly.email, password: TEST_USERS.readonly.password },
    });
    const bodyB = await resB.json();
    userBToken = bodyB.token;
  });

  test('user B cannot access user A profile data', async ({ request }) => {
    const response = await request.get(`/api/users/${userAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    expect([403, 404]).toContain(response.status());
  });

  test('user B cannot modify user A resources', async ({ request }) => {
    const response = await request.patch(`/api/users/${userAId}`, {
      headers: { Authorization: `Bearer ${userBToken}` },
      data: { name: 'Hijacked Name' },
    });
    expect([403, 404]).toContain(response.status());
  });

  test('sequential ID enumeration should not expose data', async ({ request }) => {
    const exposedResources: number[] = [];

    for (let id = 1; id <= 20; id++) {
      const response = await request.get(`/api/documents/${id}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      if (response.status() === 200) {
        const body = await response.json();
        if (body.ownerId && body.ownerId !== TEST_USERS.readonly.email) {
          exposedResources.push(id);
        }
      }
    }

    expect(
      exposedResources,
      `IDOR: User could access ${exposedResources.length} resources belonging to other users: IDs ${exposedResources.join(', ')}`
    ).toHaveLength(0);
  });

  test('UUID parameter tampering should not expose other user data', async ({ request }) => {
    // Create a resource as User A
    const createRes = await request.post('/api/documents', {
      headers: { Authorization: `Bearer ${userAToken}` },
      data: { title: 'Private Document', content: 'Sensitive content' },
    });

    if (createRes.status() === 201) {
      const { id: docId } = await createRes.json();

      // User B tries to access User A's document
      const accessRes = await request.get(`/api/documents/${docId}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      expect([403, 404]).toContain(accessRes.status());

      // User B tries to delete User A's document
      const deleteRes = await request.delete(`/api/documents/${docId}`, {
        headers: { Authorization: `Bearer ${userBToken}` },
      });
      expect([403, 404]).toContain(deleteRes.status());
    }
  });

  test('batch/bulk endpoints should filter by ownership', async ({ request }) => {
    const response = await request.post('/api/documents/batch', {
      headers: { Authorization: `Bearer ${userBToken}` },
      data: { ids: ['doc-1', 'doc-2', 'doc-3', 'doc-4', 'doc-5'] },
    });

    if (response.status() === 200) {
      const body = await response.json();
      const documents = body.documents || body.data || [];
      for (const doc of documents) {
        expect(doc.ownerId).toBe(TEST_USERS.readonly.email);
      }
    }
  });
});
```

## Cookie Manipulation Testing

```typescript
// tests/security/auth-bypass/cookie-manipulation.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/user-roles';

test.describe('Cookie Manipulation', () => {
  test('modifying role/permission cookies should not escalate privileges', async ({
    page,
    context,
  }) => {
    // Login as regular user
    await page.goto('/login');
    await page.fill('[name="email"]', TEST_USERS.user.email);
    await page.fill('[name="password"]', TEST_USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Attempt to inject role escalation cookies
    await context.addCookies([
      { name: 'role', value: 'admin', domain: 'localhost', path: '/' },
      { name: 'isAdmin', value: 'true', domain: 'localhost', path: '/' },
      { name: 'permissions', value: 'admin,superuser', domain: 'localhost', path: '/' },
      { name: 'user_level', value: '999', domain: 'localhost', path: '/' },
    ]);

    // Navigate to admin page
    const response = await page.goto('/admin');
    const status = response?.status() ?? 0;
    const url = page.url();

    expect(
      url.includes('/admin') && status === 200,
      'Cookie manipulation should not grant admin access'
    ).toBeFalsy();
  });

  test('cookie values should not be reflected without sanitization', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: 'username',
        value: '<script>alert("xss")</script>',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/dashboard');
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert("xss")</script>');
  });

  test('expired cookies should not grant access', async ({ context, request }) => {
    // Add an expired session cookie
    await context.addCookies([
      {
        name: 'session',
        value: 'expired-session-token-12345',
        domain: 'localhost',
        path: '/',
        expires: Math.floor(Date.now() / 1000) - 86400, // Expired yesterday
      },
    ]);

    const page = await context.newPage();
    await page.goto('/dashboard');
    expect(page.url()).toContain('/login');
    await page.close();
  });
});
```

## OAuth Flow Testing

```typescript
// tests/security/auth-bypass/oauth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('OAuth Flow Security', () => {
  test('OAuth callback should validate state parameter', async ({ request }) => {
    const response = await request.get('/api/auth/callback/google', {
      params: {
        code: 'valid-looking-auth-code',
        state: 'tampered-state-value',
      },
    });

    // Should reject because state does not match server-side stored state
    expect([400, 403]).toContain(response.status());
  });

  test('OAuth callback should reject replayed authorization codes', async ({ request }) => {
    // First use of the code
    const firstResponse = await request.get('/api/auth/callback/google', {
      params: { code: 'single-use-auth-code', state: 'matching-state' },
    });

    // Second use of the same code should be rejected
    const replayResponse = await request.get('/api/auth/callback/google', {
      params: { code: 'single-use-auth-code', state: 'matching-state' },
    });

    if (firstResponse.status() === 200) {
      expect([400, 401]).toContain(replayResponse.status());
    }
  });

  test('redirect_uri should be strictly validated', async ({ request }) => {
    const maliciousRedirects = [
      'https://evil.com/callback',
      'https://yourapp.com.evil.com/callback',
      'javascript:alert(1)',
      '//evil.com/callback',
      'https://yourapp.com@evil.com/callback',
    ];

    for (const redirectUri of maliciousRedirects) {
      const response = await request.get('/api/auth/authorize', {
        params: {
          client_id: 'valid-client-id',
          redirect_uri: redirectUri,
          response_type: 'code',
        },
      });

      expect(
        response.status(),
        `redirect_uri "${redirectUri}" should be rejected`
      ).toBeGreaterThanOrEqual(400);
    }
  });
});
```

## API Endpoint Auth Verification

```typescript
// tests/security/auth-bypass/api-auth.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/user-roles';

test.describe('API Endpoint Auth Verification', () => {
  test('all HTTP methods should require auth on protected endpoints', async ({ request }) => {
    const protectedPath = '/api/admin/users';
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

    for (const method of methods) {
      let response;
      switch (method) {
        case 'GET':
          response = await request.get(protectedPath);
          break;
        case 'POST':
          response = await request.post(protectedPath, { data: {} });
          break;
        case 'PUT':
          response = await request.put(protectedPath, { data: {} });
          break;
        case 'PATCH':
          response = await request.patch(protectedPath, { data: {} });
          break;
        case 'DELETE':
          response = await request.delete(protectedPath);
          break;
        case 'OPTIONS':
          response = await request.fetch(protectedPath, { method: 'OPTIONS' });
          break;
      }

      if (method !== 'OPTIONS') {
        expect(
          response!.status(),
          `${method} ${protectedPath} should require authentication`
        ).toBe(401);
      }
    }
  });

  test('HEAD method should not leak data from protected endpoints', async ({ request }) => {
    const response = await request.head('/api/admin/users');
    expect([401, 403, 405]).toContain(response.status());
  });

  test('HTTP method override headers should not bypass auth', async ({ request }) => {
    const overrideHeaders = [
      { 'X-HTTP-Method-Override': 'GET' },
      { 'X-Method-Override': 'GET' },
      { 'X-HTTP-Method': 'GET' },
    ];

    for (const headers of overrideHeaders) {
      const response = await request.post('/api/admin/users', {
        headers,
        data: {},
      });
      expect(response.status()).toBe(401);
    }
  });

  test('auth token in query string should be rejected or handled securely', async ({
    request,
  }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { email: TEST_USERS.user.email, password: TEST_USERS.user.password },
    });
    const { token } = await loginRes.json();

    // Tokens in query strings are logged in server logs and browser history
    const response = await request.get(`/api/users/me?token=${token}&access_token=${token}`);
    // Ideally returns 401 (should require Authorization header)
    // Some APIs accept this but it is a security concern
    if (response.status() === 200) {
      console.warn(
        'WARNING: API accepts tokens via query string -- this may expose tokens in logs'
      );
    }
  });
});
```

## CSRF Testing

```typescript
// tests/security/auth-bypass/csrf.spec.ts
import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/user-roles';

test.describe('Cross-Site Request Forgery (CSRF) Protection', () => {
  test('state-changing requests should require CSRF token', async ({ page, request }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', TEST_USERS.user.email);
    await page.fill('[name="password"]', TEST_USERS.user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Extract cookies but do not include CSRF token
    const cookies = await page.context().cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    // Attempt a state-changing request without CSRF token
    const response = await request.post('/api/users/me', {
      headers: {
        Cookie: cookieHeader,
        // Deliberately omitting CSRF token
      },
      data: { name: 'CSRF Attack Name' },
    });

    // Should be rejected if CSRF protection is in place
    expect([400, 403]).toContain(response.status());
  });

  test('CSRF token should not be reusable across sessions', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('/login');
    await page1.fill('[name="email"]', TEST_USERS.user.email);
    await page1.fill('[name="password"]', TEST_USERS.user.password);
    await page1.click('button[type="submit"]');
    await page1.waitForURL('/dashboard');

    // Extract CSRF token from the page
    const csrfToken = await page1.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      const input = document.querySelector('input[name="_csrf"]');
      return meta?.getAttribute('content') || input?.getAttribute('value') || null;
    });

    await context1.close();

    // Start a new session and try to use the old CSRF token
    if (csrfToken) {
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      await page2.goto('/login');
      await page2.fill('[name="email"]', TEST_USERS.user.email);
      await page2.fill('[name="password"]', TEST_USERS.user.password);
      await page2.click('button[type="submit"]');
      await page2.waitForURL('/dashboard');

      const cookies = await context2.cookies();
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

      const response = await page2.request.post('/api/users/me', {
        headers: {
          Cookie: cookieHeader,
          'X-CSRF-Token': csrfToken, // Token from old session
        },
        data: { name: 'Cross-Session CSRF' },
      });

      expect([400, 403]).toContain(response.status());
      await context2.close();
    }
  });

  test('cross-origin requests should be blocked', async ({ request }) => {
    const response = await request.post('/api/users/me', {
      headers: {
        Origin: 'https://evil-site.com',
        Referer: 'https://evil-site.com/attack-page',
      },
      data: { name: 'Cross-Origin Attack' },
    });

    // Should be blocked by CORS policy or CSRF protection
    expect([400, 401, 403]).toContain(response.status());
  });
});
```

## Python Auth Bypass Testing

```python
# tests/security/test_auth_bypass.py
import pytest
import requests
import base64
import json
import time

BASE_URL = "http://localhost:3000"

class TestAuthBypass:
    """Comprehensive authentication bypass testing suite."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Authenticate test users before each test."""
        self.user_token = self._login("user@testapp.local", "User!SecurePass123")
        self.admin_token = self._login("admin@testapp.local", "Admin!SecurePass123")

    def _login(self, email: str, password: str) -> str:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
        )
        assert response.status_code == 200
        return response.json()["token"]

    def _auth_headers(self, token: str) -> dict:
        return {"Authorization": f"Bearer {token}"}

    def test_unauthenticated_access_returns_401(self):
        """All protected endpoints must reject unauthenticated requests."""
        endpoints = [
            ("GET", "/api/users/me"),
            ("GET", "/api/admin/users"),
            ("POST", "/api/documents"),
            ("DELETE", "/api/documents/1"),
        ]

        for method, path in endpoints:
            response = requests.request(method, f"{BASE_URL}{path}")
            assert response.status_code == 401, (
                f"{method} {path} returned {response.status_code} without auth"
            )

    def test_jwt_none_algorithm_rejected(self):
        """Server must reject JWTs with 'none' algorithm."""
        payload = self._decode_jwt_payload(self.user_token)
        payload["role"] = "admin"

        forged_token = self._forge_jwt(
            {"alg": "none", "typ": "JWT"}, payload, ""
        )

        response = requests.get(
            f"{BASE_URL}/api/users/me",
            headers=self._auth_headers(forged_token),
        )
        assert response.status_code == 401

    def test_privilege_escalation_via_payload_tampering(self):
        """Modified JWT payloads with original signatures must be rejected."""
        parts = self.user_token.split(".")
        payload = self._decode_jwt_payload(self.user_token)
        payload["role"] = "admin"

        tampered_token = (
            f"{parts[0]}"
            f".{self._base64url_encode(json.dumps(payload))}"
            f".{parts[2]}"
        )

        response = requests.get(
            f"{BASE_URL}/api/users/me",
            headers=self._auth_headers(tampered_token),
        )
        assert response.status_code == 401

    def test_idor_across_users(self):
        """Users should not access resources belonging to other users."""
        # Create a document as admin
        create_res = requests.post(
            f"{BASE_URL}/api/documents",
            headers=self._auth_headers(self.admin_token),
            json={"title": "Admin Only Doc", "content": "Secret"},
        )

        if create_res.status_code == 201:
            doc_id = create_res.json()["id"]

            # Attempt access as regular user
            access_res = requests.get(
                f"{BASE_URL}/api/documents/{doc_id}",
                headers=self._auth_headers(self.user_token),
            )
            assert access_res.status_code in (403, 404)

    def test_sql_injection_in_auth(self):
        """Authentication should not be bypassable via SQL injection."""
        payloads = [
            {"email": "' OR 1=1--", "password": "anything"},
            {"email": "admin@testapp.local'--", "password": ""},
            {"email": "admin@testapp.local", "password": "' OR '1'='1"},
        ]

        for payload in payloads:
            response = requests.post(
                f"{BASE_URL}/api/auth/login", json=payload
            )
            assert response.status_code in (400, 401)

    def test_brute_force_protection(self):
        """Multiple failed login attempts should trigger rate limiting."""
        statuses = []
        for i in range(20):
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "user@testapp.local", "password": f"wrong{i}"},
            )
            statuses.append(response.status_code)

        # After many failures, should see 429 (rate limited)
        assert 429 in statuses, (
            "No rate limiting detected after 20 failed login attempts"
        )

    @staticmethod
    def _decode_jwt_payload(token: str) -> dict:
        payload_b64 = token.split(".")[1]
        padding = 4 - len(payload_b64) % 4
        payload_b64 += "=" * padding
        return json.loads(base64.urlsafe_b64decode(payload_b64))

    @staticmethod
    def _base64url_encode(data: str) -> str:
        return base64.urlsafe_b64encode(data.encode()).rstrip(b"=").decode()

    @staticmethod
    def _forge_jwt(header: dict, payload: dict, signature: str) -> str:
        h = base64.urlsafe_b64encode(
            json.dumps(header).encode()
        ).rstrip(b"=").decode()
        p = base64.urlsafe_b64encode(
            json.dumps(payload).encode()
        ).rstrip(b"=").decode()
        return f"{h}.{p}.{signature}"
```

## Best Practices

1. **Test every role against every endpoint** -- Build a complete authorization matrix and systematically verify that each role can only access its permitted endpoints. Automated matrix testing catches gaps that manual testing misses.

2. **Always verify server-side enforcement** -- Never rely on client-side checks such as hiding UI elements or disabling buttons. Auth bypass tests must confirm that the server independently rejects unauthorized requests regardless of what the client sends.

3. **Test negative paths exhaustively** -- For every authorized action, verify that at least two unauthorized actors (unauthenticated user and wrong-role user) are explicitly denied. One denial test is not enough.

4. **Validate token cryptographic integrity** -- Test that the server verifies JWT signatures using the correct algorithm and key. Algorithm confusion attacks (RS256 to HS256) and "none" algorithm attacks remain common in the wild.

5. **Check resource-level authorization, not just endpoint-level** -- An endpoint may allow authenticated access but still fail to verify that the requesting user owns or has permission to the specific resource being accessed.

6. **Test auth state transitions** -- Verify that logging out truly invalidates sessions, that password changes revoke existing tokens, and that account deactivation immediately prevents access.

7. **Include boundary and edge cases** -- Test with empty tokens, malformed tokens, extremely long tokens, tokens with unicode characters, and tokens with null bytes. Auth parsers often fail on unexpected input.

8. **Test across all HTTP methods** -- If GET requires auth, verify that POST, PUT, PATCH, DELETE, and HEAD also require auth on the same endpoint. Developers sometimes forget to protect non-GET methods.

9. **Verify error responses do not leak information** -- Auth failures should return generic messages. Responses like "invalid password" (confirming the username exists) or detailed stack traces are security vulnerabilities.

10. **Test concurrent and race condition scenarios** -- Verify that two simultaneous requests cannot exploit timing windows in token validation, session creation, or permission checks.

11. **Automate auth bypass tests in CI** -- These tests should run on every deployment. A single missing auth check can be catastrophic, and regression is common when new endpoints are added.

12. **Test with realistic attack payloads** -- Use actual bypass techniques from OWASP, not just "wrong password." Include SQL injection in login, header injection, and parameter pollution in auth endpoints.

## Anti-Patterns to Avoid

1. **Testing only the happy path** -- Verifying that valid credentials work tells you nothing about security. The critical tests are the ones that verify invalid, missing, tampered, and stolen credentials are rejected.

2. **Client-side-only role checks** -- If your tests only verify that the UI hides the admin button from regular users, you have tested nothing. An attacker uses curl, not your UI. Always test the API directly.

3. **Hardcoding test tokens** -- Using static tokens in tests masks expiration and rotation issues. Tests should authenticate dynamically using the same flow an attacker would target.

4. **Ignoring HTTP methods** -- Testing only GET endpoints and assuming POST/DELETE are also protected is a common source of real vulnerabilities. Method-specific auth gaps are frequently exploited.

5. **Sharing auth state between tests** -- If one test logs in and another test reuses that session, you cannot detect session isolation issues. Each test should manage its own authentication lifecycle.

6. **Trusting framework defaults** -- Assuming that your auth framework protects all routes by default is dangerous. Many frameworks use opt-in protection, meaning new endpoints are unprotected until explicitly configured.

7. **Skipping IDOR tests for non-sequential IDs** -- UUIDs are not a security control. They reduce guessability but do not eliminate IDOR. Authorization checks must still verify resource ownership regardless of ID format.

## Debugging Tips

1. **Use browser DevTools Network tab** -- Inspect request headers, cookies, and response codes during manual auth testing. Look for tokens being sent in unexpected places (query strings, referrer headers) and for auth headers that are missing on certain requests.

2. **Log all auth decisions server-side** -- When a test fails unexpectedly, check server logs for the authentication and authorization decision chain. Look for middleware ordering issues where an auth check runs after the handler has already returned data.

3. **Test with curl first** -- Before writing Playwright tests, verify the vulnerability with a simple curl command. This isolates whether the issue is in the application or in your test setup. For example: `curl -H "Authorization: Bearer tampered-token" http://localhost:3000/api/admin/users`.

4. **Check middleware ordering** -- Many auth bypass vulnerabilities stem from middleware running in the wrong order. If the response handler runs before the auth middleware, the endpoint is unprotected. Print middleware execution order during debugging.

5. **Inspect JWT contents at jwt.io** -- Paste tokens into jwt.io to visually inspect their headers and payloads. Verify that the algorithm matches your expectation, that expiration times are reasonable, and that role claims are accurate.

6. **Use Playwright trace viewer for session issues** -- When session fixation or cookie tests fail, generate a Playwright trace (`trace: 'on'`) and step through the request timeline to see exactly when cookies are set, modified, and sent.

7. **Verify test isolation** -- If auth tests pass individually but fail when run together, you have a state leak. Use `test.describe.serial()` with explicit setup/teardown, or run each test in its own browser context.

8. **Check for caching interference** -- CDNs, reverse proxies, and browser caches can serve cached authenticated responses to unauthenticated users. Add `Cache-Control: no-store` headers during testing and verify that the cache does not bypass auth.

9. **Monitor rate limiting state** -- If brute force protection tests fail inconsistently, check whether rate limiting state persists across test runs. You may need to reset rate limiters between test suites or use unique IP addresses per test.

10. **Test with both valid and invalid SSL certificates** -- When testing token validation over HTTPS, verify that the application does not silently fall back to HTTP or accept self-signed certificates in production mode, as this can enable man-in-the-middle token theft.