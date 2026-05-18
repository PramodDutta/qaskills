import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing Complete Guide: OWASP, Tools, and Automation in 2026',
  description:
    'Comprehensive security testing guide covering OWASP Top 10, OWASP API Top 10, SAST, DAST, IAST tools like ZAP, Burp Suite, Snyk, Semgrep, CodeQL, SQL injection, XSS, CSRF testing, and DevSecOps automation for 2026.',
  date: '2026-05-18',
  category: 'Guide',
  content: `
Security testing is the practice of finding vulnerabilities in software before attackers do. In 2026, with API-first architectures, AI-generated code at unprecedented scale, and increasingly sophisticated supply chain attacks, security testing is no longer the exclusive domain of specialized penetration testers. Every QA engineer, SDET, and developer needs to understand security testing fundamentals and integrate automated security checks into their daily workflow. This guide covers the OWASP Top 10, API-specific security risks, the full spectrum of testing approaches (SAST, DAST, IAST), the tools that matter, and how to build a DevSecOps pipeline that catches vulnerabilities before they reach production.

## Key Takeaways

- The OWASP Top 10 (2021) and OWASP API Security Top 10 are the baseline threat models every team should test against
- SAST (static analysis) catches vulnerabilities in source code without running the application -- tools like Semgrep, CodeQL, and Snyk Code
- DAST (dynamic analysis) tests running applications by sending malicious inputs -- tools like OWASP ZAP and Burp Suite
- IAST (interactive analysis) instruments the application runtime to detect vulnerabilities during normal testing -- combining the strengths of SAST and DAST
- Automated security testing in CI/CD catches 70-80% of common vulnerabilities without manual intervention
- Supply chain security (dependency scanning) is critical as 80% of application code comes from open-source dependencies
- AI-generated code requires additional security scrutiny as LLMs can introduce subtle vulnerabilities

---

## The OWASP Top 10 (2021 Edition)

The OWASP Top 10 is the authoritative list of the most critical web application security risks. Every security testing effort should start here.

### A01: Broken Access Control

Access control enforces that users cannot act outside their intended permissions. Broken access control is the number one web application security risk, moving up from fifth place in the 2017 edition.

**Common vulnerabilities:**
- Insecure Direct Object References (IDOR): changing a URL parameter to access another user's data
- Missing function-level access checks: admin endpoints accessible to regular users
- CORS misconfiguration allowing unauthorized cross-origin access
- Metadata manipulation: modifying JWT tokens, cookies, or hidden fields to elevate privileges

**How to test:**

\`\`\`typescript
// Testing for IDOR vulnerability
import { test, expect } from '@playwright/test';

test.describe('Access Control - IDOR', () => {
  test('user cannot access another user profile', async ({ request }) => {
    // Login as user A
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'userA@test.com', password: 'password123' },
    });
    const { token } = await loginRes.json();

    // Try to access user B's data with user A's token
    const response = await request.get('/api/users/user-b-id/profile', {
      headers: { Authorization: \`Bearer \${token}\` },
    });

    // Should return 403 Forbidden, NOT 200 with user B's data
    expect(response.status()).toBe(403);
  });

  test('regular user cannot access admin endpoints', async ({ request }) => {
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'regular@test.com', password: 'password123' },
    });
    const { token } = await loginRes.json();

    const adminEndpoints = [
      '/api/admin/users',
      '/api/admin/settings',
      '/api/admin/audit-logs',
      '/api/admin/exports',
    ];

    for (const endpoint of adminEndpoints) {
      const response = await request.get(endpoint, {
        headers: { Authorization: \`Bearer \${token}\` },
      });
      expect(response.status(), \`\${endpoint} should be forbidden\`).toBe(403);
    }
  });
});
\`\`\`

### A02: Cryptographic Failures

Previously called "Sensitive Data Exposure," this category covers failures related to cryptography that lead to exposure of sensitive data.

**What to test:**
- Are passwords hashed with bcrypt/scrypt/argon2, not MD5/SHA1?
- Is data in transit encrypted with TLS 1.2+?
- Are sensitive fields (SSN, credit card numbers) encrypted at rest?
- Are cryptographic keys rotated and stored securely?

\`\`\`typescript
test('API enforces TLS', async ({ request }) => {
  // Attempt HTTP (non-TLS) connection
  try {
    await request.get('http://api.example.com/health');
    // If we reach here, HTTP is allowed -- vulnerability
    expect(true, 'HTTP should redirect to HTTPS or refuse connection').toBe(false);
  } catch (error) {
    // Connection refused or redirect -- expected
  }
});

test('sensitive data is not in URL parameters', async ({ request }) => {
  // Login endpoint should use POST body, not URL params
  const response = await request.post('/api/auth/login', {
    data: { email: 'test@test.com', password: 'password123' },
  });

  // Verify token is in response body, not URL
  const url = response.url();
  expect(url).not.toContain('token=');
  expect(url).not.toContain('password=');
});
\`\`\`

### A03: Injection

Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query. SQL injection, NoSQL injection, OS command injection, and LDAP injection remain prevalent despite decades of awareness.

**Vulnerable code example:**

\`\`\`typescript
// VULNERABLE: SQL injection
app.get('/users', async (req, res) => {
  const { search } = req.query;
  // Direct string concatenation -- attacker can inject SQL
  const users = await db.query(\`SELECT * FROM users WHERE name LIKE '%\${search}%'\`);
  res.json(users);
});
\`\`\`

**Fixed code:**

\`\`\`typescript
// SECURE: Parameterized query
app.get('/users', async (req, res) => {
  const { search } = req.query;
  const users = await db.query('SELECT * FROM users WHERE name LIKE $1', [\`%\${search}%\`]);
  res.json(users);
});
\`\`\`

**How to test for SQL injection:**

\`\`\`typescript
test.describe('SQL Injection Prevention', () => {
  const sqlPayloads = [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "' UNION SELECT * FROM admin_users --",
    "1; SELECT * FROM information_schema.tables",
    "' OR 1=1 --",
    "admin'--",
    "1' ORDER BY 1--+",
    "' AND EXTRACTVALUE(1, CONCAT(0x7e, (SELECT version())))--",
  ];

  for (const payload of sqlPayloads) {
    test(\`blocks SQL injection: \${payload.substring(0, 30)}\`, async ({ request }) => {
      const response = await request.get(\`/api/users?search=\${encodeURIComponent(payload)}\`);

      // Should not return 200 with data -- either 400 (validation) or empty results
      if (response.status() === 200) {
        const body = await response.json();
        // If 200, verify no data leakage
        expect(body.data?.length || 0, 'SQL injection returned unexpected data').toBeLessThan(100);
      }
      // Should never return 500 (unhandled SQL error exposes internals)
      expect(response.status()).not.toBe(500);
    });
  }
});
\`\`\`

### A04: Insecure Design

Insecure design refers to missing or ineffective security controls at the architecture level. No amount of implementation-level fixes can address a fundamentally insecure design.

**Examples:**
- No rate limiting on authentication endpoints (allows brute force attacks)
- No account lockout after failed login attempts
- Password recovery that reveals whether an email exists in the system
- Missing CAPTCHA on sensitive forms

\`\`\`typescript
test('rate limiting on login endpoint', async ({ request }) => {
  const attempts = [];
  for (let i = 0; i < 20; i++) {
    const res = await request.post('/api/auth/login', {
      data: { email: 'test@test.com', password: \`wrong-\${i}\` },
    });
    attempts.push(res.status());
  }

  const rateLimited = attempts.filter((s) => s === 429);
  expect(rateLimited.length, 'Login should be rate limited after multiple failures').toBeGreaterThan(0);
});
\`\`\`

### A05: Security Misconfiguration

This is the most commonly seen issue. It includes unpatched software, default credentials, verbose error messages, unnecessary features enabled, and missing security headers.

\`\`\`typescript
test.describe('Security Headers', () => {
  test('response includes required security headers', async ({ request }) => {
    const response = await request.get('/');
    const headers = response.headers();

    // Content-Security-Policy prevents XSS and data injection
    expect(headers['content-security-policy']).toBeDefined();

    // X-Content-Type-Options prevents MIME sniffing
    expect(headers['x-content-type-options']).toBe('nosniff');

    // X-Frame-Options prevents clickjacking
    expect(headers['x-frame-options']).toMatch(/DENY|SAMEORIGIN/);

    // Strict-Transport-Security enforces HTTPS
    expect(headers['strict-transport-security']).toBeDefined();

    // Referrer-Policy controls information leakage
    expect(headers['referrer-policy']).toBeDefined();

    // X-XSS-Protection (legacy but still useful)
    expect(headers['x-xss-protection']).toBeDefined();

    // Server header should not reveal technology stack
    expect(headers['server']).not.toMatch(/Apache|nginx|Express/i);

    // X-Powered-By should be absent
    expect(headers['x-powered-by']).toBeUndefined();
  });
});
\`\`\`

### A06: Vulnerable and Outdated Components

Using components with known vulnerabilities is one of the easiest attack vectors. Modern applications depend on hundreds of open-source packages, each a potential entry point.

**Automated dependency scanning:**

\`\`\`bash
# Snyk: comprehensive dependency vulnerability scanning
npx snyk test --severity-threshold=high

# npm audit: built-in Node.js dependency checking
npm audit --audit-level=high

# OWASP Dependency-Check: language-agnostic
dependency-check --project "MyApp" --scan . --format HTML --out reports/
\`\`\`

### A07: Identification and Authentication Failures

**Testing authentication bypass:**

\`\`\`typescript
test.describe('Authentication Security', () => {
  test('expired JWT is rejected', async ({ request }) => {
    // JWT that expired 1 hour ago
    const expiredToken = createJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
    const response = await request.get('/api/profile', {
      headers: { Authorization: \`Bearer \${expiredToken}\` },
    });
    expect(response.status()).toBe(401);
  });

  test('tampered JWT is rejected', async ({ request }) => {
    const validToken = await getValidToken();
    // Modify the payload without re-signing
    const parts = validToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    payload.role = 'admin';
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = parts.join('.');

    const response = await request.get('/api/admin/users', {
      headers: { Authorization: \`Bearer \${tamperedToken}\` },
    });
    expect(response.status()).toBe(401);
  });

  test('JWT with none algorithm is rejected', async ({ request }) => {
    // "alg: none" attack
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: '1', role: 'admin' })).toString('base64url');
    const noneToken = \`\${header}.\${payload}.\`;

    const response = await request.get('/api/profile', {
      headers: { Authorization: \`Bearer \${noneToken}\` },
    });
    expect(response.status()).toBe(401);
  });
});
\`\`\`

### A08: Software and Data Integrity Failures

This includes insecure CI/CD pipelines, auto-update mechanisms without integrity verification, and insecure deserialization.

### A09: Security Logging and Monitoring Failures

Without proper logging, attacks go undetected. Test that security-relevant events are logged:

\`\`\`typescript
test('failed login attempts are logged', async ({ request }) => {
  await request.post('/api/auth/login', {
    data: { email: 'admin@test.com', password: 'wrong' },
  });

  // Verify via admin API or log inspection
  const logs = await request.get('/api/admin/audit-logs?action=login_failed&limit=1', {
    headers: { Authorization: \`Bearer \${adminToken}\` },
  });
  const body = await logs.json();
  expect(body.data.length).toBeGreaterThan(0);
  expect(body.data[0].action).toBe('login_failed');
});
\`\`\`

### A10: Server-Side Request Forgery (SSRF)

SSRF occurs when an application fetches a remote resource without validating the user-supplied URL, allowing attackers to access internal services.

\`\`\`typescript
test.describe('SSRF Prevention', () => {
  const ssrfPayloads = [
    'http://127.0.0.1/admin',
    'http://localhost:3000/internal',
    'http://169.254.169.254/latest/meta-data/',  // AWS metadata
    'http://[::1]/admin',
    'http://0x7f000001/admin',
    'file:///etc/passwd',
  ];

  for (const url of ssrfPayloads) {
    test(\`blocks SSRF attempt: \${url.substring(0, 40)}\`, async ({ request }) => {
      const response = await request.post('/api/fetch-url', {
        data: { url },
      });
      expect(response.status()).not.toBe(200);
    });
  }
});
\`\`\`

---

## OWASP API Security Top 10

APIs have their own unique security challenges. The OWASP API Security Top 10 addresses risks specific to API architectures.

### API1: Broken Object Level Authorization (BOLA)

The API equivalent of IDOR. Tests should verify that every API endpoint enforcing object-level access checks:

\`\`\`typescript
test('BOLA: user cannot access other user orders', async ({ request }) => {
  // Create order as user A
  const orderRes = await request.post('/api/orders', {
    data: { product: 'widget', quantity: 1 },
    headers: { Authorization: \`Bearer \${userAToken}\` },
  });
  const order = await orderRes.json();

  // Try to access with user B's token
  const response = await request.get(\`/api/orders/\${order.id}\`, {
    headers: { Authorization: \`Bearer \${userBToken}\` },
  });
  expect(response.status()).toBe(403);
});
\`\`\`

### API2: Broken Authentication

API authentication issues include weak token generation, missing token validation, and tokens that never expire.

### API3: Broken Object Property Level Authorization

APIs may expose object properties that the user should not be able to read or modify:

\`\`\`typescript
test('user cannot set admin role via API', async ({ request }) => {
  const response = await request.patch('/api/users/me', {
    data: { name: 'Updated', role: 'admin' },
    headers: { Authorization: \`Bearer \${userToken}\` },
  });

  const user = await response.json();
  expect(user.role).not.toBe('admin');
});
\`\`\`

### API4: Unrestricted Resource Consumption

No rate limiting, no pagination limits, no query complexity limits:

\`\`\`typescript
test('API enforces pagination limits', async ({ request }) => {
  const response = await request.get('/api/users?limit=999999', {
    headers: { Authorization: \`Bearer \${token}\` },
  });
  const body = await response.json();
  expect(body.data.length).toBeLessThanOrEqual(100); // Max page size
});
\`\`\`

---

## SAST, DAST, and IAST

### SAST (Static Application Security Testing)

SAST analyzes source code without executing the application. It catches vulnerabilities early in the development lifecycle.

**Semgrep** -- Fast, open-source static analysis with custom rules:

\`\`\`bash
# Run Semgrep with OWASP rules
semgrep --config=p/owasp-top-ten src/

# Custom rule to detect hardcoded secrets
# .semgrep/hardcoded-secrets.yml
\`\`\`

\`\`\`yaml
rules:
  - id: hardcoded-api-key
    patterns:
      - pattern: |
          const $KEY = "..."
      - metavariable-regex:
          metavariable: $KEY
          regex: (api_key|apiKey|API_KEY|secret|SECRET|password|PASSWORD)
    message: "Hardcoded secret detected in $KEY"
    severity: ERROR
    languages: [typescript, javascript]
\`\`\`

**CodeQL** -- GitHub's semantic code analysis engine:

\`\`\`yaml
# .github/workflows/codeql.yml
name: CodeQL Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write

    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
          queries: security-extended
      - uses: github/codeql-action/analyze@v3
\`\`\`

### DAST (Dynamic Application Security Testing)

DAST tests running applications by sending malicious inputs and analyzing responses.

**OWASP ZAP** -- The most widely used open-source DAST tool:

\`\`\`bash
# ZAP baseline scan in CI
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \\
  -t https://staging.example.com \\
  -r report.html \\
  -c zap-config.conf

# ZAP full scan (more thorough, takes longer)
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-full-scan.py \\
  -t https://staging.example.com \\
  -r full-report.html
\`\`\`

**ZAP API scan for OpenAPI specs:**

\`\`\`bash
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py \\
  -t https://staging.example.com/openapi.json \\
  -f openapi \\
  -r api-report.html
\`\`\`

### IAST (Interactive Application Security Testing)

IAST instruments the application runtime to detect vulnerabilities during normal testing. It observes how data flows through the application and detects when tainted input reaches a sensitive sink (database query, file operation, response rendering).

IAST tools include Contrast Security, Checkmarx IAST, and Synopsys Seeker. They integrate as agents within the application runtime and report vulnerabilities as tests execute.

---

## XSS (Cross-Site Scripting) Testing

XSS remains one of the most common web vulnerabilities. Test all user-input rendering paths:

\`\`\`typescript
test.describe('XSS Prevention', () => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    'javascript:alert(1)',
    '"><script>alert(1)</script>',
    "'-alert(1)-'",
    '<body onload=alert(1)>',
    '<input onfocus=alert(1) autofocus>',
    '<details open ontoggle=alert(1)>',
    '<a href="javascript:alert(1)">click</a>',
  ];

  for (const payload of xssPayloads) {
    test(\`sanitizes XSS: \${payload.substring(0, 30)}\`, async ({ request }) => {
      // Store payload via API
      const createRes = await request.post('/api/comments', {
        data: { text: payload },
        headers: { Authorization: \`Bearer \${token}\` },
      });

      if (createRes.status() === 201) {
        const comment = await createRes.json();
        // Retrieve and verify sanitization
        const getRes = await request.get(\`/api/comments/\${comment.id}\`);
        const body = await getRes.json();

        expect(body.text).not.toContain('<script');
        expect(body.text).not.toContain('onerror=');
        expect(body.text).not.toContain('onload=');
        expect(body.text).not.toContain('javascript:');
      } else {
        // Input validation rejected the payload -- also acceptable
        expect(createRes.status()).toBe(400);
      }
    });
  }
});
\`\`\`

**Fixing XSS -- the correct approach:**

\`\`\`typescript
// VULNERABLE: rendering user input as raw HTML
app.get('/comments/:id', (req, res) => {
  const comment = getComment(req.params.id);
  res.send(\`<div>\${comment.text}</div>\`); // XSS vulnerability
});

// SECURE: use a template engine with auto-escaping
// or sanitize with DOMPurify on the server
import DOMPurify from 'isomorphic-dompurify';

app.get('/comments/:id', (req, res) => {
  const comment = getComment(req.params.id);
  const sanitized = DOMPurify.sanitize(comment.text);
  res.send(\`<div>\${sanitized}</div>\`);
});
\`\`\`

---

## CSRF (Cross-Site Request Forgery) Testing

CSRF attacks trick authenticated users into making unintended requests:

\`\`\`typescript
test.describe('CSRF Protection', () => {
  test('state-changing requests require CSRF token', async ({ request }) => {
    // Attempt POST without CSRF token
    const response = await request.post('/api/account/change-email', {
      data: { email: 'attacker@evil.com' },
      headers: {
        Authorization: \`Bearer \${token}\`,
        // Deliberately omitting CSRF token
      },
    });
    expect(response.status()).toBe(403);
  });

  test('CSRF token from one session cannot be used in another', async ({ request }) => {
    // Get CSRF token from session A
    const sessionARes = await request.get('/api/csrf-token');
    const { csrfToken: tokenA } = await sessionARes.json();

    // Try to use session A's CSRF token in session B
    const response = await request.post('/api/account/change-email', {
      data: { email: 'test@test.com' },
      headers: {
        Authorization: \`Bearer \${sessionBToken}\`,
        'X-CSRF-Token': tokenA,
      },
    });
    expect(response.status()).toBe(403);
  });
});
\`\`\`

---

## DevSecOps: Automated Security in CI/CD

A complete DevSecOps pipeline integrates security testing at every stage:

\`\`\`yaml
# .github/workflows/devsecops.yml
name: DevSecOps Pipeline

on:
  pull_request:
    branches: [main]

jobs:
  # Stage 1: Secret scanning (pre-commit)
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2

  # Stage 2: SAST (code analysis)
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Semgrep SAST
        uses: semgrep/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/typescript
            p/nodejs

  # Stage 3: Dependency scanning
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Snyk Dependency Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  # Stage 4: Container scanning
  container-scan:
    runs-on: ubuntu-latest
    needs: [sast]
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t app:test .
      - name: Trivy Container Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'app:test'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

  # Stage 5: DAST (dynamic testing)
  dast:
    runs-on: ubuntu-latest
    needs: [sast, dependency-scan]
    steps:
      - uses: actions/checkout@v4
      - name: Start application
        run: docker compose up -d
      - name: Wait for app
        run: |
          for i in {1..30}; do
            curl -s http://localhost:3000/health && break
            sleep 2
          done
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'

  # Stage 6: Security test suite
  security-tests:
    runs-on: ubuntu-latest
    needs: [sast]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run Security Tests
        run: npx playwright test tests/security/ --project=chromium
\`\`\`

---

## Testing AI-Generated Code for Security

AI-generated code introduces unique security risks. LLMs may generate code that is syntactically correct and functionally working but contains subtle security vulnerabilities:

- Using \`eval()\` or \`Function()\` for dynamic code execution
- Missing input validation on user-supplied data
- Hardcoded credentials or API keys in generated examples
- Insecure random number generation (Math.random instead of crypto)
- Missing HTTPS enforcement
- Overly permissive CORS configurations

**Automated checks for AI-generated code:**

\`\`\`yaml
# .semgrep/ai-code-security.yml
rules:
  - id: no-eval
    pattern: eval(...)
    message: "eval() is dangerous -- use JSON.parse() or a safe alternative"
    severity: ERROR
    languages: [javascript, typescript]

  - id: no-math-random-security
    pattern: Math.random()
    message: "Use crypto.randomUUID() or crypto.getRandomValues() for security-sensitive randomness"
    severity: WARNING
    languages: [javascript, typescript]

  - id: no-hardcoded-credentials
    patterns:
      - pattern: |
          \$VAR = "..."
      - metavariable-regex:
          metavariable: \$VAR
          regex: (password|secret|apiKey|api_key|token|credential)
    message: "Possible hardcoded credential"
    severity: ERROR
    languages: [javascript, typescript]
\`\`\`

---

## Security Testing Checklist

Use this checklist for every release:

**Authentication:**
- Password hashing uses bcrypt/argon2 with appropriate cost factor
- JWT tokens have reasonable expiration times
- Refresh token rotation is implemented
- Account lockout after failed attempts
- Multi-factor authentication for sensitive operations

**Authorization:**
- Every endpoint checks user permissions
- IDOR protection on all resource endpoints
- Admin functions are properly gated
- API keys have appropriate scopes

**Input Validation:**
- All inputs are validated server-side (client-side validation is insufficient)
- SQL injection prevention via parameterized queries
- XSS prevention via output encoding and CSP headers
- File upload validation (type, size, content)
- Rate limiting on all public endpoints

**Data Protection:**
- TLS 1.2+ for all connections
- Sensitive data encrypted at rest
- PII is not logged
- API responses do not leak internal implementation details

**Dependencies:**
- No known critical or high vulnerabilities in dependencies
- Container base images are scanned and up to date
- Third-party integrations use least-privilege API keys

---

## Common Vulnerability Patterns and Fixes

### Mass Assignment

\`\`\`typescript
// VULNERABLE: accepting all fields from request body
app.post('/api/users', async (req, res) => {
  const user = await User.create(req.body); // Attacker can set isAdmin: true
  res.json(user);
});

// SECURE: whitelist allowed fields
app.post('/api/users', async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password });
  res.json(user);
});
\`\`\`

### Path Traversal

\`\`\`typescript
// VULNERABLE: user-controlled file path
app.get('/files/:name', (req, res) => {
  const filePath = path.join('/uploads', req.params.name);
  res.sendFile(filePath); // Attacker sends ../../etc/passwd
});

// SECURE: validate and sanitize path
app.get('/files/:name', (req, res) => {
  const safeName = path.basename(req.params.name); // Strips directory traversal
  const filePath = path.join('/uploads', safeName);
  if (!filePath.startsWith('/uploads/')) {
    return res.status(400).json({ error: 'Invalid file path' });
  }
  res.sendFile(filePath);
});
\`\`\`

### Insecure Deserialization

\`\`\`typescript
// VULNERABLE: deserializing untrusted data
app.post('/api/import', (req, res) => {
  const data = JSON.parse(req.body.serialized);
  // If using a library that supports code execution during deserialization,
  // this is a remote code execution vulnerability
});

// SECURE: validate schema after deserialization
import { z } from 'zod';

const ImportSchema = z.object({
  items: z.array(z.object({
    name: z.string().max(200),
    value: z.number().positive(),
  })).max(1000),
});

app.post('/api/import', (req, res) => {
  const result = ImportSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.issues });
  }
  // Process validated data
});
\`\`\`

---

## Conclusion

Security testing in 2026 is a continuous, automated practice woven into every stage of the software development lifecycle. Start with the OWASP Top 10 as your threat model, automate SAST and dependency scanning in CI, run DAST against staging environments, and build a comprehensive security test suite that covers authentication, authorization, injection, and data protection.

The tools are mature, free, and well-integrated with modern CI/CD platforms. The cost of not testing is measured in data breaches, regulatory fines, and lost customer trust. Make security testing a non-negotiable part of your quality assurance workflow.

For teams using AI coding agents, install security testing skills to ensure your agent follows secure coding practices:

\`\`\`bash
npx @qaskills/cli add security-testing-owasp
\`\`\`

Browse all 450+ QA skills at [qaskills.sh/skills](/skills).
`,
};
