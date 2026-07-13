import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing the OAuth 2.0 PKCE Token Exchange',
  description:
    'Test OAuth 2.0 PKCE verifier, challenge, authorization-code, replay, and token endpoint behavior with protocol-level assertions and runnable code.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing the OAuth 2.0 PKCE Token Exchange

The browser returns with an authorization code, the client posts a verifier, and the token endpoint answers \`invalid_grant\`. That single error can represent a mismatched verifier, an expired code, a reused code, a redirect URI mismatch, or a code issued to another client. A useful PKCE suite must separate those cases rather than asserting only that a happy-path login eventually succeeds.

Proof Key for Code Exchange binds an authorization request to a later token request. The client creates a high-entropy \`code_verifier\`, derives a \`code_challenge\`, sends the challenge to the authorization endpoint, and retains the verifier locally. The token endpoint recomputes the challenge and releases tokens only when the binding and the authorization code's other properties match.

## Validate the transformation before testing HTTP

For the recommended \`S256\` method, the challenge is the base64url encoding of the SHA-256 digest of the verifier, with \`=\` padding removed. It is not ordinary base64, a hexadecimal digest, or a hash of decoded verifier bytes.

RFC 7636 defines a verifier as 43 to 128 characters from the unreserved URI set. A verifier should be generated from a cryptographically secure random source. The familiar approach of generating 32 random bytes and encoding them as unpadded base64url produces 43 characters.

\`\`\`ts
import { createHash, randomBytes } from 'node:crypto';

export function createVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function toS256Challenge(verifier: string): string {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}
\`\`\`

Node's \`base64url\` encoding is unpadded. If supporting an older runtime, replace \`+\` with \`-\`, \`/\` with \`_\`, and strip trailing equals signs from normal base64.

| Input defect | Correct server outcome | Defect the check prevents |
|---|---|---|
| Verifier shorter than 43 characters | Reject request | Low-entropy or nonconforming proof |
| Verifier contains \`+\` or \`/\` | Reject request | Accepting characters outside unreserved set |
| Challenge is padded base64 | Authorization request should be rejected or treated per strict validation | Encoding ambiguity |
| Token request uses a different valid verifier | \`invalid_grant\` | Code interception succeeds |
| Unsupported challenge method | Authorization error | Silent downgrade from S256 |

Unit-test the transformation against the RFC 7636 appendix vector. That catches encoding defects without involving redirects, user sessions, or the identity provider.

## Capture the authorization code without leaking it

An integration test needs a registered public client, an exact redirect URI, and an account or authorization shortcut intended for automation. Drive the authorization endpoint, authenticate through the supported mechanism, follow consent, and intercept the redirect at a loopback callback or controlled test endpoint.

The callback must verify \`state\` before the test exchanges the code. PKCE does not replace CSRF protection. Store neither the code nor verifier in screenshots, traces, or general CI logs. Both are short-lived secrets, and the verifier is the proof needed to redeem an intercepted code.

For protocol tests, it is often cleaner to call an authorization-server test harness that can authenticate a user than to automate the login UI. Keep at least a small browser flow to prove the real client stores and returns the verifier correctly.

## A real token exchange test

The following Node test assumes a helper has obtained a fresh code for the supplied challenge and redirect URI. It sends the standard form-encoded token request and verifies both success and single-use behavior.

\`\`\`ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createVerifier, toS256Challenge } from './pkce.js';
import { obtainAuthorizationCode } from './authorization-harness.js';

const issuer = process.env.OAUTH_ISSUER!;
const clientId = process.env.OAUTH_CLIENT_ID!;
const redirectUri = 'http://127.0.0.1:49152/callback';

async function exchange(code: string, verifier: string): Promise<Response> {
  return fetch(\`\${issuer}/token\`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
}

test('binds one authorization code to one PKCE verifier', async () => {
  const verifier = createVerifier();
  const code = await obtainAuthorizationCode({
    issuer,
    clientId,
    redirectUri,
    codeChallenge: toS256Challenge(verifier),
    codeChallengeMethod: 'S256',
  });

  const first = await exchange(code, verifier);
  assert.equal(first.status, 200);
  const tokens = await first.json();
  assert.equal(tokens.token_type.toLowerCase(), 'bearer');
  assert.equal(typeof tokens.access_token, 'string');
  assert.ok(tokens.expires_in > 0);

  const replay = await exchange(code, verifier);
  assert.equal(replay.status, 400);
  assert.equal((await replay.json()).error, 'invalid_grant');
});
\`\`\`

OAuth token endpoint errors use JSON and an HTTP 400 status for many invalid requests. Do not demand a provider-specific \`error_description\`, and never parse it as the stable contract. \`invalid_client\` may use 401 when HTTP client authentication was attempted, depending on the client type and authentication method.

## Negative matrix for the verifier binding

Create a new authorization code for each row unless the row explicitly tests replay. Reusing one code across negative cases makes later results uninterpretable because a server may consume a code after any failed redemption attempt as a defensive measure.

| Scenario | Token request variation | Expected protocol signal |
|---|---|---|
| Wrong proof | Another 43-character verifier | 400 with \`invalid_grant\` |
| Missing proof | Omit \`code_verifier\` | 400, commonly \`invalid_request\` |
| Malformed proof | Include a space or use 129 characters | 400 error, no tokens |
| Wrong redirect | Change one path character | 400 with \`invalid_grant\` |
| Wrong public client | Use a different registered client ID | 400 error, no tokens |
| Replayed code | Submit a previously redeemed code | 400 with \`invalid_grant\` |
| Expired code | Advance controlled clock or wait past configured lifetime | 400 with \`invalid_grant\` |

Assert the security invariant first: no access token, ID token, or refresh token is returned. Then assert the standardized error where the specification makes it dependable. Providers intentionally avoid revealing which component mismatched.

## Authorization endpoint cases

The binding begins at authorization, so token-only tests are incomplete. Send \`code_challenge_method=S256\` with a syntactically valid challenge and confirm the resulting code can be redeemed only with its verifier. Test an unsupported method and a missing challenge for clients whose policy requires PKCE.

Whether \`plain\` is accepted is a server policy and profile question. Modern deployments should use S256 when capable. A test should express the product's declared policy, not assume every standards-compliant server must reject \`plain\` under all circumstances.

Authorization errors may be returned through the redirect URI when that URI is valid, but malformed or untrusted redirect URIs must not be redirected to. Your harness should inspect either the direct response or callback query safely.

## Redirect URI equality matters independently of PKCE

When the authorization request includes \`redirect_uri\`, the token request must include the identical value. PKCE does not loosen this binding. Common bugs include normalizing a trailing slash, changing hostname case through application configuration, switching \`localhost\` to \`127.0.0.1\`, or dropping a port.

Test exact registered values and near misses. Do not register broad wildcard callbacks merely to simplify automation. A loopback redirect for native applications can use an ephemeral port under the applicable profile, but web client redirect rules differ. Model the actual client type.

## Confidential clients still benefit from PKCE

A client secret authenticates a confidential client; PKCE binds the authorization code to the initiating instance. They address different threats. A server-side web application can use both. Its token request includes client authentication according to registration plus \`code_verifier\`.

Public clients, including native and browser-based clients, cannot keep a static secret. Do not put a "secret" into mobile binaries or frontend JavaScript and count it as protection. Test configuration should reflect the registered authentication method: a public client's token request generally carries \`client_id\` without pretending to authenticate with a secret.

The [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide) covers session, scope, and privilege boundaries around this flow. The [API testing best practices guide](/blog/api-testing-best-practices-guide) provides broader guidance for stable protocol assertions and test data.

## Verify tokens without overfitting their format

An access token may be a JWT or an opaque string. The OAuth client should not assume JWT unless the provider contract says so. For a JWT access token, validation belongs at the resource server: verify signature using trusted issuer metadata, issuer, audience, time claims, and required scopes. Decoding without signature verification is not validation.

ID tokens are an OpenID Connect concept, not guaranteed by bare OAuth. If the request included \`openid\`, validate the ID token under the provider's OpenID Connect contract, including nonce when used. Do not make every PKCE test depend on ID-token claims if the test's subject is code binding.

Refresh-token issuance is also policy-dependent. If a refresh token is expected, assert it only in scenarios requesting the necessary scope and satisfying the provider's consent rules.

## Control time to test code expiry

Sleeping until an authorization code expires makes a suite slow and flaky. In an authorization server you own, inject a clock or configure a short code lifetime in an isolated test deployment. Advance the clock after issuing the code and before exchange.

For a third-party provider without clock control, keep expiry coverage in a slower integration lane and accept the real wait only if the code lifetime is manageable. Do not infer expiry by modifying a code string; that tests integrity, not time.

Also test boundary ordering. A code that is both expired and paired with a wrong verifier should still reveal no sensitive distinction. The exact internal validation order should not become a brittle external assertion.

## Concurrency and replay races

Send the same fresh code and correct verifier in two token requests concurrently. Exactly one should succeed, and the other should fail. This catches non-atomic redemption where two application nodes validate before either marks the code used.

\`\`\`ts
const [left, right] = await Promise.all([
  exchange(code, verifier),
  exchange(code, verifier),
]);

const statuses = [left.status, right.status].sort((a, b) => a - b);
assert.deepEqual(statuses, [200, 400]);
\`\`\`

Run this against a deployment topology with the same shared authorization-code store as production. A single-process fake cannot expose a distributed compare-and-delete defect. Capture correlation IDs, not tokens, when investigating.

## Browser client storage and multi-tab cases

The verifier must survive the redirect but remain bound to the correct authorization transaction. A single global local-storage key fails when two login attempts begin in different tabs. The second attempt overwrites the first verifier, causing one callback to fail or, worse, mix transactions.

Store transaction state keyed by a random \`state\` value, apply appropriate same-site and origin protections, and delete it after completion or expiry. Test two overlapping authorizations completed in reverse order. Each callback must retrieve its own verifier and validate its own state.

Test the back button and callback reload. A redeemed code must not trigger another successful exchange. The client should show a recoverable message without exposing the code in telemetry.

## Observability without credential leakage

Token endpoint logs should record a request or trace ID, client identifier where safe, grant type, outcome category, and timing. They should not record authorization codes, verifiers, access tokens, refresh tokens, or full form bodies.

Automated test reports have the same duty. HTTP debugging libraries often log request bodies on failure. Install redaction for \`code\`, \`code_verifier\`, and token fields before enabling verbose CI output. Screenshots can contain callback URLs in the address bar.

A good failure says "token exchange returned invalid_grant for trace abc" and retains server-side protected diagnostics. It does not paste reusable credentials into a long-lived artifact.

## Discovery metadata and endpoint mix-ups

When the authorization server supports discovery, obtain the authorization and token endpoints from its trusted metadata rather than deriving one by string concatenation. Validate the issuer exactly. A test that sends the code to a token endpoint belonging to another tenant or issuer should fail without disclosing whether the code was otherwise valid.

Do not let an untrusted authorization response replace the token endpoint. The endpoint is client configuration, not callback data. In multi-tenant products, explicitly test that a transaction begun under issuer A cannot be completed against issuer B even when both accept the same client identifier format.

Metadata caching can make rotation tests confusing. Record the issuer and endpoint selected by the client, without logging credentials. Force cache refresh only through the client's supported mechanism rather than mutating internal state in an end-to-end scenario.

## Native loopback callbacks

Native applications commonly receive the authorization response through a loopback listener on the local device. A realistic test starts the listener on an available port, builds the redirect URI under the registered loopback rules, begins authorization, and closes the listener after exactly one valid callback.

Bind only to loopback interfaces and reject unexpected paths, methods, states, and duplicate callbacks. Do not expose the test callback on all network interfaces. Return a minimal browser page that does not echo the code or verifier.

Race a bogus callback with the real authorization response. The first request with a wrong state must not consume the pending verifier or shut down the listener in a way that denies the legitimate response. Also verify that a second correct-looking callback after completion cannot trigger a second exchange.

Custom URI schemes and claimed HTTPS redirects have different platform security properties. Keep their platform integration coverage separate from loopback tests rather than assuming one callback mechanism proves another.

## Server-side storage invariants

An authorization code record should retain the challenge, method, client, redirect URI when supplied, subject, scopes, issue or expiry time, and consumed state. Tests should observe behavior through endpoints, but a server team can add repository-level tests around the atomic consume operation.

The consume transaction must not mark a code used only after tokens are minted in an unrelated operation. Conversely, a transient token-minting failure needs a defined outcome: retrying the same code may be prohibited once redemption begins. Test the chosen transactional boundary and ensure it cannot issue two token sets.

Store challenges rather than raw verifiers on the authorization side. The verifier belongs to the client until exchange. Diagnostic interfaces must not reveal stored challenges as if they were reusable secrets, and database snapshots from tests should remain protected.

## Error responses and cache controls

Token endpoint responses containing credentials should use transport and cache protections required by the applicable OAuth specification and deployment profile. In API tests, inspect that successful token responses are not inadvertently cacheable by shared intermediaries. Do not overfit to one header spelling when equivalent directives satisfy the policy.

Error bodies must not include the submitted verifier, full code, client secret, or an internal stack trace. Fuzz malformed verifier encodings separately from the semantic mismatch matrix, and cap request sizes so a huge verifier cannot become a log amplification path.

The authorization endpoint and token endpoint have different error delivery mechanisms. Never require an invalid redirect URI case to redirect an error to that invalid URI. Doing so would turn error reporting into an open redirect or code-leak vector.

## Frequently Asked Questions

### Must the test verifier be random if the challenge algorithm has a fixed vector test?

Use fixed RFC vectors for deterministic transformation unit tests. Use securely random verifiers for end-to-end authorization transactions so the integration path matches real client behavior and concurrent tests do not collide.

### Should a wrong verifier always produce \`invalid_grant\`?

For a syntactically valid but mismatched verifier during authorization-code exchange, \`invalid_grant\` is the expected broad error. A missing or malformed parameter can instead produce \`invalid_request\`. Never expect tokens in either case.

### Can I reuse one authorization code for the entire negative matrix?

No. Some servers invalidate a code after a failed redemption attempt, and all servers must prevent successful replay. Obtain a fresh code per independent case so one result does not contaminate the next.

### Does PKCE replace the \`state\` parameter?

No. PKCE binds the code to a verifier. \`state\` binds the callback to the client transaction and helps prevent authorization-response CSRF. Test both properties.

### What is the most important multi-node PKCE test?

Race two correct token requests using the same code and verifier against the shared deployment. Atomic redemption permits exactly one success. This reveals code stores that validate and consume in separate non-atomic operations.
`,
};
