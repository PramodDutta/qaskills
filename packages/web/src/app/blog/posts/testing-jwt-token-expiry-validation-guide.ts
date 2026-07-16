import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing JWT Token Expiry Validation: exp, nbf, and Clock Skew',
  description: 'Test JWT token expiry validation for exp, nbf, iat, and clock skew with deterministic boundary cases that prevent early rejection and late acceptance.',
  date: '2026-07-16',
  category: 'API Testing',
  content: `
# Testing JWT Token Expiry Validation: exp, nbf, and Clock Skew

JWT time bugs cluster at boundaries. A token works one second, fails the next, and may behave differently across services whose clocks disagree. Sleeping in an automated test makes that problem slower without making it deterministic. The reliable approach is to express every time as a NumericDate, inject or control the verifier's current time, and test exact seconds around each acceptance boundary.

Expiry tests must also preserve the security order of operations. Verify the signature and accepted algorithm before trusting any claim. Then validate issuer, audience, and temporal claims. Decoding a token is useful for diagnostics, but decoding alone does not authenticate it.

## Translate JWT NumericDate claims into testable rules

The registered claims \`exp\`, \`nbf\`, and \`iat\` use NumericDate values: seconds since 1970-01-01T00:00:00Z, ignoring leap seconds. They are numbers, not JavaScript millisecond timestamps and not formatted date strings.

| Claim | Meaning | Core validation decision |
|---|---|---|
| \`exp\` | Time on or after which the token must not be accepted | Current time must be before expiration, subject to allowed skew |
| \`nbf\` | Time before which the token must not be accepted | Current time must reach not-before, subject to allowed skew |
| \`iat\` | Time the token was issued | Usually supports age and future-issued policy, not automatic expiry |
| \`iss\` | Issuer identity | Must match an explicitly trusted issuer |
| \`aud\` | Intended audience | Must include the API's expected audience |

RFC 7519 requires processors rejecting an expired token to compare against \`exp\`, and similarly defines processing for \`nbf\`. It permits a small leeway, usually no more than a few minutes, to account for clock skew. The specification does not choose your leeway. Treat it as a security configuration with tests and monitoring.

Write the acceptance rules in plain language before selecting a library option. For a skew allowance \`s\`, one common policy accepts an \`exp\` token while \`now < exp + s\`, and accepts an \`nbf\` token when \`now + s >= nbf\`. Confirm the exact boundary behavior of your chosen JWT library instead of assuming every implementation uses identical inequalities.

## Isolate claim logic behind an injected clock

Pure claim tests are fast and explain edge conditions clearly. This function assumes signature, algorithm, issuer, and audience checks have already succeeded. It does not replace a JWT library.

\`\`\`ts
type TemporalClaims = {
  exp?: number;
  nbf?: number;
  iat?: number;
};

type TemporalPolicy = {
  nowSeconds: number;
  clockSkewSeconds: number;
  maxTokenAgeSeconds?: number;
};

export function validateTemporalClaims(
  claims: TemporalClaims,
  policy: TemporalPolicy,
): void {
  const { nowSeconds, clockSkewSeconds, maxTokenAgeSeconds } = policy;

  if (claims.exp !== undefined && nowSeconds >= claims.exp + clockSkewSeconds) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (claims.nbf !== undefined && nowSeconds + clockSkewSeconds < claims.nbf) {
    throw new Error('TOKEN_NOT_ACTIVE');
  }

  if (claims.iat !== undefined && claims.iat > nowSeconds + clockSkewSeconds) {
    throw new Error('TOKEN_ISSUED_IN_FUTURE');
  }

  if (
    maxTokenAgeSeconds !== undefined &&
    claims.iat !== undefined &&
    nowSeconds >= claims.iat + maxTokenAgeSeconds + clockSkewSeconds
  ) {
    throw new Error('TOKEN_TOO_OLD');
  }
}
\`\`\`

This policy treats equality at the adjusted expiration boundary as expired. Name that expectation in tests. If the production library differs, configure or wrap it intentionally, then make the integration test authoritative.

Never convert with \`Date.now()\` directly as a NumericDate. It returns milliseconds. Use \`Math.floor(Date.now() / 1000)\` at the boundary where real time enters the system, and inject the resulting seconds into testable logic.

## Build an exact boundary table

Choose one fixed instant so failures remain readable. Let \`now = 2_000_000_000\` and skew be 60 seconds. Derive cases rather than waiting for a token to age.

| Scenario | Claims | Expected result under this policy |
|---|---|---|
| Expires next second | \`exp = now + 1\` | Accept |
| Reaches expiration now, no skew | \`exp = now\`, skew 0 | Reject |
| Expired 59 seconds ago | \`exp = now - 59\`, skew 60 | Accept |
| Expired exactly 60 seconds ago | \`exp = now - 60\`, skew 60 | Reject |
| Active in 61 seconds | \`nbf = now + 61\`, skew 60 | Reject |
| Active in exactly 60 seconds | \`nbf = now + 60\`, skew 60 | Accept |
| Issued 61 seconds in future | \`iat = now + 61\`, skew 60 | Reject by local policy |
| No temporal claims | none | Decide separately, based on token profile |

The final row is important. JWT permits registered claims to be optional generally, while a particular API profile can require them. If access tokens must always expire, enforce schema or claim presence and test a missing \`exp\` as rejection.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { validateTemporalClaims } from './temporal-claims';

const nowSeconds = 2_000_000_000;

function check(claims: Parameters<typeof validateTemporalClaims>[0], skew = 60) {
  return () => validateTemporalClaims(claims, {
    nowSeconds,
    clockSkewSeconds: skew,
  });
}

describe('JWT temporal boundaries', () => {
  it('accepts a token before exp', () => {
    expect(check({ exp: nowSeconds + 1 }, 0)).not.toThrow();
  });

  it('rejects at exp with no skew', () => {
    expect(check({ exp: nowSeconds }, 0)).toThrow('TOKEN_EXPIRED');
  });

  it('accepts within the configured expiration skew', () => {
    expect(check({ exp: nowSeconds - 59 })).not.toThrow();
  });

  it('rejects at the adjusted expiration boundary', () => {
    expect(check({ exp: nowSeconds - 60 })).toThrow('TOKEN_EXPIRED');
  });

  it('rejects before nbf beyond skew', () => {
    expect(check({ nbf: nowSeconds + 61 })).toThrow('TOKEN_NOT_ACTIVE');
  });

  it('accepts nbf exactly at the skew allowance', () => {
    expect(check({ nbf: nowSeconds + 60 })).not.toThrow();
  });
});
\`\`\`

These tests finish immediately and cannot fail because a CI runner paused between token creation and verification.

## Verify signed tokens with a real JWT library

Pure logic does not prove that middleware passes the right time and tolerance to the verifier. Add integration tests using the same library and key type as production. The \`jose\` package supports signing and verification, including a supplied \`currentDate\` and \`clockTolerance\` in verification options.

\`\`\`ts
import { SignJWT, jwtVerify } from 'jose';
import { expect, it } from 'vitest';

const secret = new TextEncoder().encode(
  'integration-test-secret-that-is-not-used-in-production',
);
const nowSeconds = 2_000_000_000;

async function tokenWithTimes(times: { exp?: number; nbf?: number; iat?: number }) {
  let token = new SignJWT({ role: 'reader' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('https://issuer.test')
    .setAudience('orders-api');

  if (times.exp !== undefined) token = token.setExpirationTime(times.exp);
  if (times.nbf !== undefined) token = token.setNotBefore(times.nbf);
  if (times.iat !== undefined) token = token.setIssuedAt(times.iat);
  return token.sign(secret);
}

it('rejects an expired signed token at a controlled time', async () => {
  const jwt = await tokenWithTimes({
    iat: nowSeconds - 600,
    exp: nowSeconds - 1,
  });

  await expect(jwtVerify(jwt, secret, {
    algorithms: ['HS256'],
    issuer: 'https://issuer.test',
    audience: 'orders-api',
    currentDate: new Date(nowSeconds * 1000),
    clockTolerance: 0,
  })).rejects.toThrow();
});
\`\`\`

Do not assert only the library's error text, which may change without altering behavior. At the HTTP boundary, the application should map verification failures to a stable public status and error contract without revealing sensitive validation details. At the library boundary, assert an exported error type or code only when its official API documents that surface.

## Exercise the API boundary, not only the claim helper

An API test proves that routing, middleware, authorization, and error mapping use the verifier. Mint a token with a test-only issuer or local test key, send it to a protected endpoint, and assert both the response and the absence of the protected side effect.

\`\`\`bash
curl --fail-with-body \\
  -H "Authorization: Bearer $EXPIRED_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"sku":"A-17","quantity":1}' \\
  https://api.test.example/orders
\`\`\`

For an expired token, assert the service's documented authentication status, response media type, stable machine-readable error, and correlation ID policy. Then query the isolated test database or fake downstream service to prove no order was created. A status assertion alone can miss middleware that calls the handler before rejecting the response.

Repeat for \`nbf\` just outside and inside skew, a missing \`exp\` if prohibited, malformed NumericDate types, invalid signature, wrong issuer, wrong audience, and an unapproved algorithm. Temporal validity must never compensate for failed authentication.

## Distinguish exp, iat, session age, and refresh lifetime

\`exp\` is an absolute rejection time for that token. \`iat\` records issuance and can support a separate maximum-age policy, but RFC 7519 does not make \`iat\` an expiration claim. A token can have a future \`exp\` and still be rejected because your API prohibits tokens older than a session limit.

Refresh tokens, browser sessions, and identity-provider sessions may have different clocks and lifetimes. Test each boundary at the component that enforces it. Do not infer refresh eligibility merely from access-token \`exp\` unless the product contract explicitly links them.

| Time concept | Enforced by | Test focus |
|---|---|---|
| Access-token expiration | Resource server verifier | Reject request and block side effect |
| Not-before activation | Resource server verifier | Reject early use, accept at configured boundary |
| Maximum token age | Local security policy | Compare \`iat\` with controlled current time |
| Refresh-token lifetime | Authorization service or session store | Rotation, reuse, revocation, absolute lifetime |
| Key lifetime | Issuer and verifier key management | Old and new signing-key overlap |

Key lifetime creates a related failure mode: an unexpired token can fail if its signing key vanishes from the verifier's cache too soon. Test that separately with the [JWT key rotation and JWKS cache guide](/blog/testing-jwt-key-rotation-jwks-cache). Keep time-claim assertions separate from key-selection assertions so a failure identifies the correct control.

## Test clock skew as a bounded exception

Clock tolerance is not extra token lifetime to distribute casually. Choose the smallest allowance that accommodates measured clock synchronization and request transit. Apply it consistently across services where the security policy requires consistency, and alert on host clock drift.

Create contract tests for three points on each adjusted boundary: one second before, exactly at, and one second after. Also test asymmetric product decisions. A team may tolerate a recently expired token for verification but prohibit an \`iat\` too far in the future because it signals a bad issuer clock. Document those choices.

Avoid mocking global time across an entire parallel test process if other tests depend on timers. Prefer verifier options or an injected clock. If global fake timers are necessary, restore them in teardown and do not make real network requests while time is frozen.

## Cover concurrency at the expiration edge

A request accepted just before \`exp\` may finish after \`exp\`. Most bearer-token systems authenticate when processing the request, then allow that request to complete. If your operation checks again during a long workflow, specify and test that behavior explicitly.

Send multiple isolated requests with a controlled verifier clock on both sides of the boundary. Assert acceptance is consistent with the timestamp used for each verification, not with response completion order. For mutation endpoints, also protect against duplicate retries when clients refresh a token and resubmit. The [idempotency key concurrent requests guide](/blog/testing-idempotency-key-concurrent-requests) addresses that separate safety control.

Do not use a live production identity provider for boundary tests in normal CI. Network latency and uncontrollable clocks make results hard to reproduce. Reserve end-to-end provider checks for a small environment-specific suite, and keep deterministic signed-token tests as the main regression layer.

## Give failures enough evidence for safe diagnosis

Log claim-validation outcomes without logging full bearer tokens. Record a reason category, trusted issuer, audience decision, key identifier when appropriate, service time, and bounded deltas such as seconds past expiration. Apply your organization's security and privacy rules to all fields.

When an AI coding agent investigates a failure, provide the fixed current time, decoded non-sensitive claims, expected skew, verifier configuration, and HTTP result. Ask it to compare seconds with seconds and to trace where the clock enters the middleware. Never paste real customer tokens into prompts or tickets. A token that appears expired may still contain credentials or personal claims.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when a team wants a repeatable agent workflow for this kind of boundary analysis. Keep the underlying test oracle in repository code so humans and agents execute the same security rule.

## Frequently Asked Questions

### Is a JWT valid at the exact exp timestamp?

Under the JWT expiration rule, the token must not be accepted on or after its \`exp\` time. A configured clock-skew allowance can move the effective rejection boundary, and libraries can differ in option names and precise comparisons. Write an integration test at equality using a controlled current time so your production verifier's behavior is explicit.

### Should tests wait for a short-lived token to expire?

No for routine boundary coverage. Waiting makes the suite slow and vulnerable to scheduler pauses. Create claims around a fixed instant and inject that instant through your policy function or the verifier's documented clock option. Keep at most a small end-to-end check for wiring that cannot be controlled, and give it generous, intentional timing margins.

### Does iat automatically limit how long a token is accepted?

No. \`iat\` identifies the issuance time. A maximum token age derived from it is an application or security-profile policy that you must implement and test. \`exp\` remains the registered expiration claim. Also decide whether tokens issued too far in the future are rejected, because that is another local policy involving clock skew.

### How much JWT clock skew should an API allow?

Use the smallest value justified by measured clock synchronization, network transit, and your threat model. RFC 7519 permits small leeway but does not prescribe a number. Test the exact configured boundary, monitor real clock drift, and avoid increasing tolerance merely to silence flaky tests. A large allowance effectively extends when expired tokens can be accepted.
`,
};
