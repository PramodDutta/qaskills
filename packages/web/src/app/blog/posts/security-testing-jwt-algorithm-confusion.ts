import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing JWT Algorithm Confusion: A Practical QA Workflow',
  description: 'Run security testing JWT algorithm confusion checks that prove token verification rejects alg swaps, key confusion, and unsafe fallback paths.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Security Testing JWT Algorithm Confusion: A Practical QA Workflow

Security testing JWT algorithm confusion means proving that an application verifies tokens with the algorithm and key type it intends, not whatever the token header suggests. The classic failure is a verifier that accepts an attacker-controlled \`alg\` value and then treats a public RSA key as an HMAC secret, or accepts \`none\` when the route expects a signed token. The test goal is simple: every protected route must reject tokens whose header, signature, key, or issuer policy does not match the server-side contract.

QA engineers can test this without becoming cryptographers. The workflow is to inventory token trust boundaries, generate controlled negative tokens, send them through the same HTTP paths users hit, and assert stable rejection behavior. You are not trying to brute-force keys. You are testing whether the verifier configuration is explicit, pinned, and resistant to header manipulation.

AI coding agents make this topic urgent because they often scaffold JWT middleware from memory. The generated code may decode a token before verifying it, forget to restrict allowed algorithms, or use a convenient helper that accepts defaults the team never reviewed. Security testing JWT algorithm confusion belongs in the same pull-request conversation as normal API tests, because the defect is usually a few lines of configuration with a large blast radius.

## The bug class in one sentence

JWT algorithm confusion happens when verification trusts token metadata more than server policy. A JWT header can say which algorithm was used. That header is attacker-controlled input until the signature has been verified and the token has passed issuer, audience, expiry, and key checks. If a verifier lets the token choose the verification mode, the application may accept a token signed with a weaker, wrong, or absent algorithm.

The OAuth and JWT ecosystem has learned this lesson repeatedly. Modern libraries provide safer APIs than older examples, but unsafe configurations still appear in product code, examples copied from old blog posts, and agent-generated middleware. The test suite should prove that the server rejects algorithm changes even when the payload looks valid.

| Confusion pattern | Attacker-controlled change | Expected server behavior | Test signal |
|---|---|---|---|
| \`none\` algorithm | Header says no signature is required | Reject before route handler | 401 or 403 with no user context |
| HMAC versus RSA mix-up | Header switches \`RS256\` to \`HS256\` | Reject because key type and algorithm policy mismatch | Auth failure, not application error |
| Unexpected asymmetric algorithm | Header uses a different public-key algorithm | Reject unless explicitly configured | Auth failure with audit event |
| Unknown \`kid\` | Header points at missing key id | Reject and refresh JWKS according to policy | Auth failure, bounded retry |
| Payload-only tampering | Payload changes but signature is stale | Reject signature | Auth failure before business logic |

Do not assert only the HTTP status. Assert that the protected effect did not occur. For a read endpoint, that may mean the response has no private fields. For a write endpoint, it means no row changed, no event published, and no audit identity attached.

## Build a token inventory before writing exploits

Start by listing every place a JWT crosses a boundary. Browser session tokens, machine-to-machine API tokens, password reset tokens, email verification tokens, signed webhooks, and internal service tokens may all be JWTs with different policies. Algorithm confusion risk is highest when code reuses a generic verifier across token types or when a gateway validates one token and a downstream service trusts another.

A useful inventory has these fields:

| Field | Example value | Why QA needs it |
|---|---|---|
| Token purpose | Access token for public API | Determines protected routes and expected claims |
| Issuer | Identity provider URL or internal service | Prevents accepting tokens from another system |
| Audience | API identifier | Prevents token reuse across services |
| Allowed algorithms | One explicit allow-list | Prevents header-selected verification |
| Key source | Static secret, public key, or JWKS | Drives key rotation and unknown \`kid\` cases |
| Failure contract | 401, error envelope, audit event | Makes negative tests stable |

Write this inventory in the repo, not only in a security document. Tests need to import or reference the same policy. If the policy says access tokens must use \`RS256\`, the negative tests should prove \`HS256\` and \`none\` fail. If the policy says webhook tokens use \`HS256\`, tests should prove an \`RS256\` token with a lookalike payload fails.

## Make the verifier policy explicit

The implementation detail varies by language and library, but the shape should be recognizable. Verification accepts only a configured issuer, audience, algorithms, and key source. Decoding without verification is allowed only for non-trust decisions, such as reading \`kid\` to locate a candidate key. The decoded payload must not become a user identity until verification succeeds.

\`\`\`ts
export type JwtPolicy = {
  issuer: string;
  audience: string;
  algorithms: readonly string[];
  jwksUrl: string;
};

export const accessTokenPolicy: JwtPolicy = {
  issuer: 'https://identity.example.com/',
  audience: 'orders-api',
  algorithms: ['RS256'],
  jwksUrl: 'https://identity.example.com/.well-known/jwks.json',
};
\`\`\`

A testable verifier should receive this policy as configuration rather than burying it inside middleware. That lets unit tests verify the policy and API tests verify the runtime behavior. The negative tests should not depend on private implementation details such as which library function is called. They should send tokens and observe the boundary.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { accessTokenPolicy } from './jwt-policy';

describe('access token JWT policy', () => {
  it('pins the expected algorithm instead of accepting token-selected algorithms', () => {
    expect(accessTokenPolicy.algorithms).toEqual(['RS256']);
  });

  it('binds tokens to the orders API audience', () => {
    expect(accessTokenPolicy.audience).toBe('orders-api');
  });
});
\`\`\`

This looks small, but it catches accidental drift. If an AI agent changes the algorithm list to make a local test pass, a policy test fails before you even run the attack cases.

## Generate negative tokens in a controlled fixture

You need a fixture that can create valid and invalid tokens on demand. Keep it local to tests, with throwaway keys, and never use production secrets. For RSA-style tests, the fixture should create a valid token with the expected private key and then create variants with manipulated headers or signatures. For HMAC-style tests, it should use test-only secrets.

The following example intentionally focuses on the fixture contract rather than a specific JWT package. Many teams implement the body with a vetted library, but the tests should read like HTTP security cases:

\`\`\`ts
export type TestTokenFactory = {
  validAccessToken(claims?: Record<string, unknown>): Promise<string>;
  tokenWithNoneAlgorithm(claims?: Record<string, unknown>): Promise<string>;
  tokenWithHs256UsingPublicKeyAsSecret(claims?: Record<string, unknown>): Promise<string>;
  tokenWithUnknownKeyId(claims?: Record<string, unknown>): Promise<string>;
  tokenWithTamperedPayload(claims?: Record<string, unknown>): Promise<string>;
};
\`\`\`

Each method name describes the attack. That makes test failures readable. A failing test called \`tokenWithHs256UsingPublicKeyAsSecret is rejected\` tells the reviewer exactly what regressed.

Avoid fetching live JWKS documents from your identity provider during these tests. Use a local test server or static public keys. Live identity infrastructure introduces flakes, rate limits, and accidental dependence on production configuration. Save integration tests against real identity provider behavior for a separate environment with explicit ownership.

## API tests should prove rejection at the route boundary

Algorithm confusion is usually exploited at the HTTP boundary, so test at least one protected route end to end. Unit tests around the verifier are useful, but they can miss middleware ordering mistakes: a route might decode a token early, attach a user object, and later ignore verification failure. The API test should send the malicious token exactly where a client would send it.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { request } from './test-http-client';
import { tokens } from './test-token-factory';

describe('JWT algorithm confusion defenses', () => {
  it('rejects an unsigned token that claims alg none', async () => {
    const token = await tokens.tokenWithNoneAlgorithm({ sub: 'user-123' });

    const response = await request('/api/orders')
      .set('authorization', 'Bearer ' + token)
      .get();

    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('orders');
  });

  it('rejects HS256 tokens signed with the public key bytes', async () => {
    const token = await tokens.tokenWithHs256UsingPublicKeyAsSecret({ sub: 'user-123' });

    const response = await request('/api/orders')
      .set('authorization', 'Bearer ' + token)
      .get();

    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('orders');
  });
});
\`\`\`

There are two assertions per case: the status code and the absence of protected data. For write routes, add a database assertion:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { db } from './test-db';
import { request } from './test-http-client';
import { tokens } from './test-token-factory';

describe('JWT rejection prevents writes', () => {
  it('does not create an order when the token signature is invalid', async () => {
    const before = await db.order.count();
    const token = await tokens.tokenWithTamperedPayload({ sub: 'user-123' });

    const response = await request('/api/orders')
      .set('authorization', 'Bearer ' + token)
      .post({ sku: 'book-1', quantity: 1 });

    const after = await db.order.count();
    expect(response.status).toBe(401);
    expect(after).toBe(before);
  });
});
\`\`\`

That second assertion matters. Some applications return 401 after a downstream side effect because middleware is not ordered correctly. Security tests should catch both data exposure and side effects.

## What to test for \`none\`, HMAC, RSA, and \`kid\`

Do not rely on one malicious token and declare the verifier safe. Cover each trust decision separately. A token with \`alg: none\` tests unsigned acceptance. A token signed with HMAC using public-key material tests algorithm and key-type confusion. A token with an unknown \`kid\` tests key lookup behavior. A token with changed payload tests signature enforcement. A token with a valid signature but wrong audience tests claim validation.

| Test case | Header or claim change | Expected result | Extra assertion |
|---|---|---|---|
| Unsigned access token | \`alg\` is \`none\` | Reject | No user context attached |
| HMAC confusion | \`alg\` is \`HS256\` for an RSA-protected API | Reject | No fallback to public key as secret |
| Unknown key id | \`kid\` has no matching JWKS entry | Reject | Bounded JWKS refresh only |
| Wrong issuer | \`iss\` is another trusted-looking URL | Reject | Error is authentication, not authorization |
| Wrong audience | \`aud\` targets another service | Reject | No route handler side effect |
| Expired token | \`exp\` is in the past | Reject | Clock fixture makes result deterministic |

Keep the failure response intentionally bland. Tests should not require verbose error messages that reveal which part of the token failed. It is enough for application logs and audit events to carry diagnostic details for operators.

## JWKS caches introduce a second class of confusion

Many services fetch public keys from a JSON Web Key Set endpoint. That is normal, but the cache behavior becomes part of the security boundary. If the verifier sees an unknown \`kid\`, it may refresh the JWKS. That refresh must be bounded. Otherwise, attackers can force repeated network calls by sending random key IDs. The verifier must also avoid using a stale key forever after rotation.

Algorithm confusion tests should connect with key rotation tests. A service that pins \`RS256\` but has broken JWKS cache invalidation may reject new valid tokens after rotation or accept old tokens too long. Pair this article with a focused [JWT key rotation and JWKS cache testing workflow](/blog/testing-jwt-key-rotation-jwks-cache) when you design the full identity suite.

For algorithm confusion specifically, add a fake JWKS server to the test environment and record how many times it was called:

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { jwksServer } from './fake-jwks-server';
import { request } from './test-http-client';
import { tokens } from './test-token-factory';

describe('unknown kid handling', () => {
  it('rejects unknown kid tokens without repeatedly hammering JWKS', async () => {
    jwksServer.resetCallCount();

    const first = await tokens.tokenWithUnknownKeyId({ sub: 'user-123' });
    const second = await tokens.tokenWithUnknownKeyId({ sub: 'user-123' });

    expect((await request('/api/orders').set('authorization', 'Bearer ' + first).get()).status).toBe(401);
    expect((await request('/api/orders').set('authorization', 'Bearer ' + second).get()).status).toBe(401);
    expect(jwksServer.callCount()).toBeLessThanOrEqual(2);
  });
});
\`\`\`

The exact call-count threshold depends on your cache policy. The principle is stable: unknown key IDs should not become an unbounded outbound request generator.

## Diagnose the failure mode where decoding happens before verification

A realistic algorithm confusion failure often starts with harmless-looking code. A developer wants the \`tenantId\` claim to choose a database connection. They decode the token, read \`tenantId\`, attach it to request context, and later call verification middleware. An unsigned token can now influence routing before it is rejected.

The failure may not show up as a successful 200 response. Instead, it appears as a cross-tenant cache lookup, an audit log with an attacker-chosen tenant, or a database connection opened for the wrong account. QA needs tests that observe those side effects.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { auditLog } from './test-audit-log';
import { request } from './test-http-client';
import { tokens } from './test-token-factory';

describe('JWT decode does not establish request identity', () => {
  it('does not attach tenant context from an unsigned token', async () => {
    auditLog.clear();
    const token = await tokens.tokenWithNoneAlgorithm({
      sub: 'user-123',
      tenantId: 'tenant-from-unsigned-token',
    });

    const response = await request('/api/orders')
      .set('authorization', 'Bearer ' + token)
      .get();

    expect(response.status).toBe(401);
    expect(auditLog.entries()).not.toContainEqual(
      expect.objectContaining({ tenantId: 'tenant-from-unsigned-token' }),
    );
  });
});
\`\`\`

If this test fails, the fix is architectural. Do not create trusted request context from decoded data. Create it only from verified claims. If routing truly needs tenant context before verification, use a separate trusted source such as a subdomain or mTLS-authenticated gateway metadata, then verify the token agrees with that source.

## What people get wrong about JWT security tests

The most common mistake is testing the happy path with a valid token and assuming the library covers the rest. Library defaults improve over time, but the application still chooses allowed algorithms, key sources, claim checks, cache behavior, and middleware order. Security testing belongs at the application boundary because that is where misconfiguration lives.

The second mistake is using production identity provider tokens in automated tests. That makes the suite slow and brittle, and it can hide unsafe local verifier behavior behind a trusted external service. Use local keys for negative cases. Reserve production-like identity integration for a smaller smoke suite.

The third mistake is making the failure contract too specific. If tests assert exact error strings like "invalid algorithm", developers may expose cryptographic details to clients to satisfy tests. Assert stable status codes, generic error shapes, no protected data, no side effects, and internal audit evidence where appropriate.

| Wrong assumption | Why it fails | Better testing approach |
|---|---|---|
| A valid-token test proves verification is safe | It does not challenge header manipulation | Add negative tokens for each trust decision |
| Decoding is harmless | Decoded claims can influence routing, logging, or tenancy | Assert no context before verification |
| One JWT library call is the security boundary | Middleware order and policy configuration matter | Test protected routes end to end |
| Error detail helps QA | It can leak attacker feedback | Assert generic client errors and rich internal logs |

## CI placement for security regression checks

JWT algorithm confusion tests should run with fast API tests on every pull request that touches authentication, authorization, gateway middleware, or token policy. They are cheap compared with browser end-to-end tests because they send direct HTTP requests and use local keys. Keep them deterministic and isolated.

A simple CI split:

\`\`\`yaml
name: api-security-tests

on:
  pull_request:

jobs:
  jwt-negative-cases:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:api-security
\`\`\`

If the suite grows, use path filters or separate jobs, but do not hide JWT negative tests behind a manual-only workflow. These are regression tests for a known bug class. A one-line middleware change can reintroduce the defect.

In GitLab CI, publish the test report like any other API suite so failures are visible in merge requests:

\`\`\`yaml
jwt_api_security:
  image: node:22
  script:
    - npm ci
    - npm run test:api-security
  artifacts:
    when: always
    reports:
      junit: reports/junit.xml
\`\`\`

The exact reporter setup depends on your test framework. The important part is that JWT security failures appear as named test cases, not as a buried log line.

## How AI coding agents should be constrained

When an AI agent edits authentication code, give it a policy-first task. Do not ask "fix JWT auth" and accept whatever middleware compiles. Ask it to preserve an explicit token policy, add negative tests for algorithm confusion, and explain why decoded claims are not trusted before verification.

A useful agent prompt:

\`\`\`text
Update the access-token verifier without changing the security policy.

The policy requires issuer https://identity.example.com/, audience orders-api,
and only RS256. Add or update tests that reject alg none, HS256 with public key
material, unknown kid, wrong issuer, wrong audience, expired token, and tampered
payload. Protected route tests must assert no response data and no write side
effects when verification fails.
\`\`\`

Review the diff for two red flags: new decode calls before verification, and widened algorithm lists. If the agent adds a broad allow-list to make tests pass, reject the change. The policy is the product requirement.

For a broader view of AI-assisted QA workflows, including how to turn generated tests into reviewable assets, see the [AI augmented software testing guide](/blog/ai-augmented-software-testing-2026-guide).

## A minimal release checklist

Before releasing a JWT verification change, run this checklist:

| Check | Evidence |
|---|---|
| Allowed algorithms are explicit | Policy test or code review link |
| Valid token accepted | Happy-path API test |
| \`none\` rejected | Negative API test |
| HMAC and RSA confusion rejected | Negative API test |
| Wrong issuer and audience rejected | Claim validation tests |
| Unknown \`kid\` rejected with bounded JWKS refresh | Fake JWKS test |
| Decoded claims do not create identity before verification | Side-effect test |
| Failure response is generic | API contract assertion |
| Audit or security log records the rejection internally | Log assertion or observability check |

Do not wait for a penetration test to catch these. A penetration test should validate your controls, not be the first place the team learns that the verifier accepts a header-selected algorithm.

## Gateway and downstream service tests need different evidence

Many modern systems verify JWTs at an API gateway, then pass identity to downstream services through headers or request context. That architecture can be safe, but it changes what QA must prove. The gateway must reject manipulated tokens. Downstream services must reject direct traffic that forges trusted identity headers, or they must be unreachable except through the gateway. A green gateway test alone does not prove the internal boundary is safe.

Create two sets of tests. The first set sends malicious JWTs to the public route and confirms the gateway rejects them. The second set sends requests to the downstream service in the way an attacker or misconfigured internal client might try, without a verified gateway identity. Depending on your architecture, the downstream service should require mTLS, a private network boundary, a signed internal header, or its own token verification. QA does not need to prescribe the control, but it must test the control that the architecture claims.

| Boundary | Test input | Expected evidence | Failure meaning |
|---|---|---|---|
| Public gateway | \`alg: none\` token | Gateway returns 401 before proxying | Gateway verifier accepts unsafe header |
| Public gateway | HMAC token for RSA policy | Gateway returns 401 and no upstream call | Algorithm allow-list is too broad |
| Downstream service | Forged user id header | Service rejects or network blocks request | Internal trust boundary can be bypassed |
| Downstream service | Missing gateway proof | Service rejects request | Service trusts headers without proof |
| Observability | Rejected token | Audit event has reason class, not token data | Failure is invisible or logs too much |

The downstream test is especially important in staging environments where services are easy to call directly. A test that bypasses the gateway may feel artificial, but it catches a real deployment mistake: exposing an internal service through a load balancer, preview URL, or temporary debugging route while the service assumes the gateway already authenticated the user.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { internalRequest } from './test-internal-client';

describe('downstream identity boundary', () => {
  it('rejects forged gateway identity headers without gateway proof', async () => {
    const response = await internalRequest('/orders')
      .set('x-user-id', 'user-123')
      .set('x-tenant-id', 'tenant-1')
      .get();

    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty('orders');
  });
});
\`\`\`

If this test fails, do not patch the test by adding a magic staging header. That recreates the bypass in another form. Fix the service boundary or explicitly document that the service cannot be reached except through a verified network path, then add infrastructure evidence for that claim.

## Make rejection observable without leaking token details

Security tests are easier to maintain when they can prove a rejection happened for the expected reason class. The client response should stay generic, but internal telemetry can distinguish invalid signature, unacceptable algorithm, unknown key id, wrong issuer, wrong audience, and expired token. The trick is to log categories, not raw token material.

Good telemetry gives incident responders enough information to see an attack pattern without giving attackers a token oracle. For example, count \`jwt_rejected\` events by reason class and route. Do not log the token, decoded payload, public key, authorization header, or untrusted \`kid\` value without sanitization. A malicious \`kid\` can contain control characters or misleading text, so even metadata deserves care.

\`\`\`json
{
  "event": "jwt_rejected",
  "route": "/api/orders",
  "reason": "unacceptable_algorithm",
  "tokenPurpose": "access_token",
  "clientResponse": 401
}
\`\`\`

Add one test that verifies the application emits a safe category for a manipulated token. This is not a substitute for rejection tests. It is a diagnostic guard so future refactors do not remove the only signal security engineers have during an incident.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { securityEvents } from './test-security-events';
import { request } from './test-http-client';
import { tokens } from './test-token-factory';

describe('JWT rejection telemetry', () => {
  it('records a safe reason class for unacceptable algorithms', async () => {
    securityEvents.clear();
    const token = await tokens.tokenWithHs256UsingPublicKeyAsSecret({ sub: 'user-123' });

    await request('/api/orders').set('authorization', 'Bearer ' + token).get();

    expect(securityEvents.entries()).toContainEqual(
      expect.objectContaining({
        event: 'jwt_rejected',
        reason: 'unacceptable_algorithm',
      }),
    );
  });
});
\`\`\`

Telemetry tests also catch a subtle regression: middleware that catches all verifier errors and rethrows them as generic application exceptions. The client still receives a failure, but operators lose the difference between an expired session and a possible algorithm-confusion probe. That distinction matters for rate limiting, alerting, and incident review.

## Keep fixtures honest as libraries change

JWT libraries evolve, and safer defaults can make old negative-token fixtures stop representing the intended attack. That is good for production, but it can make tests confusing if nobody reviews the fixture. Put the attack description next to the fixture method, and add a small self-check that confirms the token header actually contains the manipulated algorithm or key id before sending it to the app.

The self-check should decode only the untrusted header inside test code and assert that the fixture was constructed as expected. It should not mirror production verification. If a future library update refuses to create a \`none\` token, the fixture test should fail with a clear message and the team can replace it with a lower-level fixture generator or retire that case with evidence.

| Fixture risk | Symptom | QA response |
|---|---|---|
| Library refuses unsafe token | Test cannot construct attack case | Update fixture intentionally |
| Fixture signs with wrong test key | App rejects for the wrong reason | Add header and claim self-checks |
| Negative token expires unexpectedly | Test flakes over time | Use deterministic clock claims |
| Token helper hides header details | Reviewers cannot see attack intent | Use named fixture methods |

Keeping fixtures honest prevents false confidence. A test named after algorithm confusion should fail because the verifier resisted algorithm confusion, not because the token was malformed in an unrelated way.

## Frequently Asked Questions

### What is JWT algorithm confusion?

JWT algorithm confusion is a verification flaw where the server accepts an algorithm chosen by the token header instead of enforcing its own policy. An attacker may try an unsigned token, switch an RSA-protected token to HMAC, or point to an unexpected key. The fix is to pin allowed algorithms, use the correct key type for each algorithm, validate issuer and audience, and reject any token that does not match the configured policy.

### Should QA engineers generate malicious JWTs in automated tests?

Yes, when the tokens use local test keys and target controlled test environments. QA does not need production secrets or live identity-provider tokens to test algorithm confusion. The suite should generate negative tokens that represent known failure classes, then send them to protected routes and assert rejection. Keep those fixtures isolated, deterministic, and readable so reviewers can see which security property each token is challenging.

### Is checking for \`alg: none\` enough?

No. Rejecting \`none\` is necessary, but algorithm confusion also includes key-type mix-ups, wrong issuers, wrong audiences, unknown key IDs, stale signatures, and middleware that trusts decoded claims too early. A useful suite covers each trust decision separately. That way a future refactor cannot accidentally widen the accepted algorithm list or move identity creation ahead of verification without failing a named test.

### Where should JWT algorithm confusion tests run?

Run them with fast API security tests on pull requests that touch authentication, authorization, gateway routing, identity policy, or token verification. They should also run in the normal regression suite because they are deterministic and cheap compared with browser tests. Use local keys and fake JWKS infrastructure to avoid external flakes. Publish results as named CI tests so security regressions are visible during review.
`,
};
