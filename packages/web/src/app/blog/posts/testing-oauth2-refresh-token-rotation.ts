import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Testing OAuth 2.0 Refresh-Token Rotation",
  description:
    "Test OAuth 2.0 refresh-token rotation for one-time use, concurrent reuse detection, expiration, token-family revocation, and secure client recovery paths.",
  date: "2026-07-13",
  category: "API Testing",
  content: `
# Testing OAuth 2.0 Refresh-Token Rotation

Two refresh requests leave the client within milliseconds. One receives a new token; the other presents the now-invalid predecessor. Whether the authorization server rejects only that request or revokes the entire token family is the security behavior a rotation test must expose.

Refresh-token rotation replaces a refresh token each time it is used. It narrows the usefulness of a copied token and enables reuse detection, but it also introduces concurrency, persistence, and recovery cases that a simple “refresh returns 200” check misses.

## Define the token-family state machine first

Terminology varies by provider, so document the system's exact policy before encoding status codes. A useful model has a family identifier, a current token, invalidated ancestors, absolute family expiry, optional idle expiry, and a revoked state.

| Event | Current token | Presented token | Expected family transition |
|---|---|---|---|
| First refresh | R1 | R1 | R1 invalid, R2 current |
| Normal next refresh | R2 | R2 | R2 invalid, R3 current |
| Replay old token | R3 | R1 | Reuse detected, policy may revoke family |
| Explicit logout | R3 | None | Family revoked |
| Absolute lifetime reached | R3 | R3 | Refresh rejected, family expired |
| Password reset | R3 | R3 | Result follows account-session revocation policy |

Do not assume every authorization server implements family revocation. OAuth security guidance recommends replay defenses for public clients, but product behavior can use sender-constrained tokens or another mechanism. Your oracle must reflect the documented implementation.

## Capture a baseline rotation exchange

Use the real token endpoint with a dedicated test client and account. The example uses Python's standard library and pytest, avoiding a client SDK that might silently retry or overwrite tokens.

\`\`\`python
import os
import requests

TOKEN_URL = os.environ["OAUTH_TOKEN_URL"]
CLIENT_ID = os.environ["OAUTH_TEST_CLIENT_ID"]

def refresh(token: str) -> requests.Response:
    return requests.post(
        TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "client_id": CLIENT_ID,
            "refresh_token": token,
        },
        timeout=10,
    )

def test_successful_refresh_rotates_the_refresh_token(authorized_tokens):
    old_refresh = authorized_tokens["refresh_token"]
    response = refresh(old_refresh)

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"]
    assert payload["refresh_token"]
    assert payload["refresh_token"] != old_refresh
    assert payload["token_type"].lower() == "bearer"
\`\`\`

The inequality assertion is essential. A server returning the same refresh token may be implementing a non-rotating policy. Also validate content type, cache-control headers required by the token response, scopes, and access-token usability according to the provider contract.

## Prove one-time use, not just token replacement

After obtaining R2 from R1, present R1 again. A conforming rotation policy rejects it. OAuth token endpoint errors are typically represented as a 400 response with an \`error\` value such as \`invalid_grant\`, but exact descriptions are not stable assertions.

\`\`\`python
def assert_oauth_error(response, expected_error: str):
    assert response.status_code == 400
    assert response.headers["content-type"].startswith("application/json")
    assert response.json()["error"] == expected_error

def test_rotated_refresh_token_cannot_be_used_again(authorized_tokens):
    r1 = authorized_tokens["refresh_token"]
    first = refresh(r1)
    assert first.status_code == 200
    r2 = first.json()["refresh_token"]

    replay = refresh(r1)
    assert_oauth_error(replay, "invalid_grant")

    # This assertion encodes family-revocation-on-reuse policy.
    after_reuse = refresh(r2)
    assert_oauth_error(after_reuse, "invalid_grant")
\`\`\`

If the product rejects R1 but still accepts R2, split the final assertion into a different policy test. Never weaken a failure until the security team confirms the intended replay response.

The [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide) helps place this exchange among login, logout, scope, and session controls.

## Race the same token deliberately

Sequential replay proves reuse handling after the server has committed rotation. Real clients can send concurrent refreshes when several API calls observe an expired access token. Synchronize requests so both use R1 without one test thread learning R2.

\`\`\`python
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

def test_concurrent_refresh_allows_at_most_one_success(authorized_tokens):
    token = authorized_tokens["refresh_token"]
    barrier = Barrier(2)

    def attempt():
        barrier.wait(timeout=5)
        return refresh(token)

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: attempt(), range(2)))

    successes = [r for r in responses if r.status_code == 200]
    failures = [r for r in responses if r.status_code != 200]
    assert len(successes) <= 1
    assert len(successes) + len(failures) == 2
    for failure in failures:
        assert_oauth_error(failure, "invalid_grant")
\`\`\`

Some systems provide a short grace window for benign concurrency and may return the same successor token to both calls. If so, test that documented guarantee precisely: no independent descendants, bounded window, and rejection after it. “Both returned 200” is not enough to prove safety.

## Verify descendants after detected reuse

Token-family revocation means all descendants become unusable, not merely the replayed ancestor. Build R1 -> R2 -> R3, replay R1, then try R3. Also call a protected resource with access tokens issued before and after rotation to clarify whether reuse revokes access tokens immediately.

| Artifact after reuse | Possible policy | Required test observation |
|---|---|---|
| Replayed R1 | Always invalid | Token endpoint rejects it |
| Current R3 | Family revoked or remains current | Assert documented choice |
| Existing access token | Often valid until expiry, sometimes revoked | Call resource endpoint |
| Server session | Provider-specific | Inspect session or introspection behavior |
| Other device's token family | Usually unaffected | Refresh independent family successfully |

Do not decode a JWT and call that validation. A syntactically valid token can be revoked server-side. Use the endpoint that enforces authorization, or introspection when the deployment contract relies on it.

## Separate idle, absolute, and access-token expiration

An access token expiring is the normal reason to refresh. A refresh token can have an inactivity timeout, and a family can have a fixed maximum lifetime that rotation does not extend. Tests need controlled time to avoid waiting days.

Prefer a test-only authorization-server configuration with minute-scale lifetimes or an injectable clock in an owned server. Avoid changing the system clock of a shared CI runner.

| Boundary | Just before | At or after | Rotation effect |
|---|---|---|---|
| Access-token expiry | Resource accepts access token | Resource rejects, refresh can succeed | New access token issued |
| Refresh idle timeout | Current refresh accepted | \`invalid_grant\` | Activity may reset idle deadline |
| Family absolute expiry | Current refresh accepted | Reauthentication required | Must not extend absolute deadline |
| Authorization revocation | Tokens usable | Refresh rejected | Rotation cannot resurrect grant |

Test boundary conditions with the server's clock precision in mind. A token whose \`exp\` equals current time is normally no longer valid, but use the provider's documented semantics and allowed clock skew.

## Check atomic persistence under failure

Rotation must invalidate R1 and persist R2 atomically. A crash between those operations can either allow replay or lock the client out. Fault-injection tests at the storage boundary are appropriate when your team owns the authorization server.

Exercise database timeout before commit, response loss after commit, and duplicate delivery through a proxy. The client cannot tell whether a timed-out refresh committed. Its recovery policy must avoid an unbounded replay loop.

For a black-box provider, simulate a lost response by letting the endpoint finish while the test client discards the body, then retry R1. Record whether the family is revoked and verify the client returns to interactive authentication cleanly.

## Test the client as well as the authorization server

A correct server does not prevent a client race. The client should serialize refresh per session, persist the new refresh token before releasing waiting API calls, and stop retrying terminal OAuth errors.

\`\`\`ts
import { describe, expect, it, vi } from 'vitest';
import { TokenManager } from './token-manager';

it('coalesces simultaneous refresh requests', async () => {
  let resolveRefresh!: (value: { accessToken: string; refreshToken: string }) => void;
  const exchange = vi.fn(() => new Promise((resolve) => { resolveRefresh = resolve; }));
  const manager = new TokenManager({
    accessToken: 'expired-access',
    refreshToken: 'R1',
    exchange,
  });

  const first = manager.getValidAccessToken();
  const second = manager.getValidAccessToken();
  expect(exchange).toHaveBeenCalledTimes(1);

  resolveRefresh({ accessToken: 'A2', refreshToken: 'R2' });
  await expect(first).resolves.toBe('A2');
  await expect(second).resolves.toBe('A2');
  expect(manager.currentRefreshToken()).toBe('R2');
});
\`\`\`

\`TokenManager\` is application-specific, so this example defines the expected interface rather than claiming an OAuth library API. The important behavior is one in-flight exchange and one atomic state update.

## Keep logs and fixtures free of live tokens

Refresh tokens are long-lived credentials. Test reports, HTTP debug logs, traces, and assertion diffs can leak them. Redact authorization headers and token response fields at the logging sink. Do not print token values to prove they differ; compare them in memory.

Use dedicated clients and users in a non-production tenant. Cleanup should revoke grants, not merely delete local fixture files. If a test intentionally triggers family revocation, it cannot reuse that authorization fixture in later cases.

The [API security testing checklist](/blog/api-security-testing-checklist-2026) adds transport, secret-handling, rate-limit, and error-disclosure checks around the rotation protocol.

## Compare replay-defense designs accurately

| Design | Server state | Replay signal | Main tradeoff |
|---|---|---|---|
| Rotating bearer refresh token | Tracks family or token lineage | Old token presented | Concurrency and lost-response handling |
| Sender-constrained refresh token | Binds token to client key | Stolen token lacks proof | Key lifecycle and platform support |
| Non-rotating bearer token | Minimal per-use change | Limited without extra detection | Larger replay window |
| Reference token with introspection | Central active-state lookup | Server can revoke reference | Availability and latency dependency |

These are architectural alternatives, not mutually exclusive in every system. Rotation can be combined with sender constraint and introspection.

## A focused rotation regression suite

At minimum cover initial rotation, old-token rejection, current descendant behavior after reuse, concurrent use, absolute expiry, explicit revocation, independent device families, and client retry termination. Add observability assertions that a reuse event is recorded without exposing token material. Verify rate limits do not misclassify legitimate serialized refreshes, and ensure OAuth errors do not reveal whether a particular token ever existed.

Run destructive cases with newly authorized fixtures. Test order should never determine which refresh token is current.

## Extend the protocol cases beyond the happy family

Scope handling needs its own assertions. A refresh request may omit \`scope\` to retain the originally granted set, or request a subset where supported. It must not escalate beyond the original grant. Compare scopes semantically as sets unless ordering is explicitly contractual. Then call a resource requiring a removed scope and prove the new access token is denied.

Client authentication errors are distinct from token invalidation. A confidential client with a wrong secret should receive the appropriate client error without consuming a valid refresh token. Retry the same token with correct client authentication afterward to prove the family was not damaged by an unauthenticated request.

Token binding between clients is essential. Present a refresh token issued to client A at client B's token endpoint credentials. Reject it without revealing whether the token is otherwise active. Then use it correctly as client A. This catches stores that look up only token value and ignore client ownership.

Test subject status changes. Disable the account, remove consent, reset credentials, or revoke the grant through supported administrative APIs, then attempt refresh. Each operation may have a different session policy. Restoration should create a new account or grant rather than reusing a destructive fixture.

Rate-limit tests should distinguish throttling from replay. A rejected request that never passed authorization should not consume the refresh token unless the documented design intentionally does so. After receiving 429, wait according to the test configuration and present the same token. This boundary requires provider documentation because implementations order validation and limiting differently.

Malformed requests cover duplicate parameters, missing grant type, wrong content type, empty refresh token, oversized token text, and unsupported grant. The token endpoint must return stable OAuth errors without stack traces or token fragments. Avoid sending malformed live credentials to logs while constructing these cases.

Rotation responses should have secure cache headers and no token values in URLs. Follow redirects only if the token endpoint contract permits them, which is uncommon. Ensure observability redaction covers response bodies as well as authorization headers. A JSON assertion failure can otherwise print both access and refresh tokens.

Multiple device authorization produces separate families in many designs. Authorize device A and device B independently. Rotate A, replay an ancestor from A, and confirm the documented effect on B. This proves the family boundary and prevents an attacker replaying one stolen token from causing unnecessary global logout, unless global revocation is the intentional policy.

Cluster consistency deserves load-balanced testing. Route sequential rotations across different authorization-server nodes when the environment allows it. R2 must be recognized after R1 is consumed on another node, and an old token must never become temporarily valid because replication lags. Strong consistency or an atomic central store is normally needed for this security decision.

Finally, check audit records. A detected reuse event should include time, client, grant or family reference, and safe request context without storing raw tokens. One replay should not generate an uncontrolled alert storm when the client retries. Security monitoring tests can assert a single correlated event and the expected family transition.

Discovery metadata and client configuration should agree on endpoint authentication. A public client must not rely on a confidential secret embedded in a mobile build. Confidential-client tests should prove the required authentication method and reject credentials sent through an unsupported channel without consuming the token.

Opaque token length and format are deliberately not contracts. Assert non-empty replacement and behavioral invalidation, not a prefix. Even for JWT-shaped refresh tokens, decoding cannot establish whether the server-side family remains active.

Consent changes can narrow scopes between rotations. Remove a permission, refresh the current token, and verify the new access token does not retain it merely because its predecessor did. A stricter policy may invalidate the grant completely, which should also be asserted.

Cluster consistency deserves a routed test when the team owns the server. Consume R1 on one authorization node, use R2 through another, then replay R1. Replication lag must never temporarily make an invalid ancestor acceptable.

When resource servers cache introspection, measure access-token behavior after family revocation. Refresh must be blocked immediately according to policy, while an existing access token may remain accepted for a documented cache interval. Keep this distinct from a rotation failure.

Cleanup should tolerate \`invalid_grant\`, because destructive cases intentionally revoke their fixtures. Execute revocation in a \`finally\` path and store only safe handles. A failed assertion should not leave large numbers of active grants in the test tenant.

Run cross-origin and transport checks around browser-based clients. A refresh token intended for an HTTP-only secure cookie must not become readable to application JavaScript, and the token endpoint's cross-origin policy should allow only intended clients. These checks complement protocol rotation and catch storage designs that expose a perfectly rotated credential to script injection.

Test server restart with an active family. Durable lineage must survive normal deployment and failover; an in-memory “used token” set that resets can make R1 reusable. Rotate, restart through supported test infrastructure, replay the ancestor, and assert the same revocation result.

## Frequently Asked Questions

### Should a replayed refresh token revoke every device session?

Usually it revokes the token family associated with that authorization instance, not unrelated device families. The exact blast radius is a product security decision and must be tested explicitly.

### Is invalid_grant the only valid error for reuse?

It is the common OAuth token-endpoint error for an invalid or revoked refresh token. Assert the provider's documented error contract and avoid brittle matching of human-readable descriptions.

### How can a mobile client avoid accidental reuse during parallel API calls?

Coordinate refresh through a single-flight mechanism per session. Waiting requests should share the resulting access token, and the new refresh token must be persisted before another refresh begins.

### Can I test rotation by comparing decoded JWT claims?

Claims can support diagnostics, but they do not prove server-side invalidation. Present the old and current tokens to the real token endpoint and protected resources.

### What should happen when the refresh response is lost?

The server may already have consumed the token. The client should use a bounded recovery policy and fall back to interactive authentication on a terminal error, never retry forever with the same credential.
`,
};
