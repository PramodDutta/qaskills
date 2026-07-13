import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Signed-URL Expiration in an API',
  description:
    'Learn signed-URL expiration API testing with controlled clocks, boundary assertions, replay checks, and signature tampering that expose real authorization flaws.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Signed-URL Expiration in an API

At 12:00:30, a download link works. At 12:00:31, the same bytes, path, and query string must fail. That one-second transition is where signed-URL implementations reveal mismatched clocks, inclusive-boundary mistakes, cache leaks, and authorization shortcuts. A happy-path test that opens the link immediately proves little. The useful suite controls time and treats the URL as a bearer credential with a deliberately short life.

This guide covers an application-owned signing API, not one vendor's storage implementation. The examples use Node.js, Vitest, and an injected clock so the expiry contract can be tested without sleeping. The same test design applies when the URL ultimately points to S3, a CDN, an image transformer, or a private application route.

## Write down the credential contract before testing it

A signed URL normally binds a resource identifier, an expiry instant, and a cryptographic signature. Mature designs may also bind the HTTP method, content digest, tenant, key version, or response-disposition options. The verifier reconstructs the canonical input and compares a freshly calculated message authentication code with the supplied signature.

The contract needs answers that product prose often omits:

| Decision | Example contract | Failure exposed when unspecified |
|---|---|---|
| Expiry comparison | Valid only while current time is strictly less than \`expiresAt\` | Link remains usable for an extra tick |
| Timestamp unit | Unix seconds, base 10 | Millisecond values create decades-long links |
| Bound fields | Method, path, expiry, tenant | A GET token authorizes DELETE or crosses tenants |
| Maximum lifetime | 15 minutes from issuance | Caller requests an effectively permanent credential |
| Canonical encoding | RFC 3986 path bytes, normalized once | Equivalent-looking paths verify differently |
| Failure response | 403 with stable machine code | Clients scrape human text to decide whether to refresh |
| Key rotation | Current and retiring key IDs accepted | Rotation invalidates every active download |

Do not infer those choices from implementation details. Put them in the API specification and make the tests executable interpretations of that policy. If the API accepts an expiry supplied by a caller, test both the requested duration and the server-side cap. If the API chooses expiry itself, assert the returned instant relative to the server's controlled clock.

Signed URLs are bearer credentials. Anyone possessing one may be able to use it, so logs, analytics, referrer headers, and screenshots are part of the threat surface. The [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide) provides the broader access-control context. Here, the focus stays on the credential's temporal and cryptographic boundaries.

## Make time a dependency, not a delay

Sleeping until a URL expires creates a slow test with a race around the scheduler. It also leaves long-lived production configurations largely untested. Inject a clock into both issuer and verifier. Production supplies the real clock; tests supply a mutable clock.

The following small implementation shows the shape. It signs method, path, tenant, expiry, and key ID with HMAC-SHA256. The verifier rejects malformed timestamps and performs a timing-safe signature comparison.

\`\`\`ts
import { createHmac, timingSafeEqual } from 'node:crypto';

type Clock = { nowMs(): number };
type Keyring = Record<string, Buffer>;

export function createSigner(clock: Clock, keys: Keyring, activeKeyId: string) {
  const mac = (value: string, keyId: string) =>
    createHmac('sha256', keys[keyId]).update(value).digest('base64url');

  return {
    issue(path: string, tenant: string, ttlSeconds: number) {
      if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 900) {
        throw new RangeError('ttlSeconds must be between 1 and 900');
      }
      const exp = Math.floor(clock.nowMs() / 1000) + ttlSeconds;
      const method = 'GET';
      const canonical = [method, path, tenant, exp, activeKeyId].join('\\n');
      const query = new URLSearchParams({
        tenant,
        exp: String(exp),
        kid: activeKeyId,
        sig: mac(canonical, activeKeyId),
      });
      return path + '?' + query.toString();
    },

    verify(rawUrl: string, method = 'GET') {
      const url = new URL(rawUrl, 'https://files.example.test');
      const tenant = url.searchParams.get('tenant');
      const kid = url.searchParams.get('kid');
      const sig = url.searchParams.get('sig');
      const rawExp = url.searchParams.get('exp');
      if (!tenant || !kid || !sig || !rawExp || !/^\\d+$/.test(rawExp) || !keys[kid]) {
        return { ok: false, reason: 'invalid_link' } as const;
      }
      const exp = Number(rawExp);
      if (!Number.isSafeInteger(exp) || Math.floor(clock.nowMs() / 1000) >= exp) {
        return { ok: false, reason: 'expired' } as const;
      }
      const canonical = [method, url.pathname, tenant, exp, kid].join('\\n');
      const expected = Buffer.from(mac(canonical, kid));
      const supplied = Buffer.from(sig);
      if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
        return { ok: false, reason: 'bad_signature' } as const;
      }
      return { ok: true, tenant, path: url.pathname } as const;
    },
  };
}
\`\`\`

In a real service, avoid returning distinctions that help an attacker enumerate signature validity unless the client genuinely needs them. Tests can assert internal reason codes at a unit boundary while the public API maps malformed, expired, and invalid signatures to the same safe response.

## Pin the exact expiration edge

Suppose issuance happens at 1,700,000,000,250 milliseconds and the TTL is 30 seconds. Because the contract uses Unix seconds, expiry is 1,700,000,030. Decide what happens immediately before, exactly at, and immediately after that value. The implementation above uses \`now >= exp\` as expired, so equality fails.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { createSigner } from './signed-url';

describe('signed URL expiration boundary', () => {
  it('accepts the last second and rejects equality with exp', () => {
    let now = 1_700_000_000_250;
    const clock = { nowMs: () => now };
    const signer = createSigner(clock, { k1: Buffer.from('test-secret-32-bytes-long-value!') }, 'k1');
    const url = signer.issue('/reports/quarter-4.pdf', 'tenant-a', 30);
    const exp = Number(new URL(url, 'https://files.test').searchParams.get('exp'));

    now = (exp - 1) * 1000 + 999;
    expect(signer.verify(url)).toMatchObject({ ok: true });

    now = exp * 1000;
    expect(signer.verify(url)).toEqual({ ok: false, reason: 'expired' });

    now = (exp + 1) * 1000;
    expect(signer.verify(url)).toEqual({ ok: false, reason: 'expired' });
  });

  it('caps caller-selected lifetimes', () => {
    const signer = createSigner(
      { nowMs: () => 1_700_000_000_000 },
      { k1: Buffer.from('test-secret-32-bytes-long-value!') },
      'k1',
    );
    expect(() => signer.issue('/a', 'tenant-a', 901)).toThrow(RangeError);
    expect(() => signer.issue('/a', 'tenant-a', 0)).toThrow(RangeError);
    expect(() => signer.issue('/a', 'tenant-a', 1.5)).toThrow(RangeError);
  });
});
\`\`\`

This test has no wall-clock delay and no tolerance window. That precision is the point. A separate end-to-end test can cover clock propagation through the HTTP stack, but it should not replace deterministic boundary tests.

Include issuance near a second rollover. If the issuer rounds up while the verifier rounds down, a nominal 30-second URL may live almost 31 seconds. That might be acceptable, but it must be intentional. Also test negative timestamps, leading plus signs, exponent notation, whitespace, extremely long digit strings, and values larger than JavaScript's safe integer. Timestamp parsing is input validation, not bookkeeping.

## Tamper one signed component at a time

An invalid signature test that replaces the whole URL is weak because it does not reveal what the signature actually binds. Start with a legitimate URL, mutate one component, preserve all others, and expect rejection.

| Mutation | What a rejection proves | Dangerous result |
|---|---|---|
| Change \`/reports/a.pdf\` to \`/reports/b.pdf\` | Resource path is bound | Horizontal object access |
| Replace tenant A with tenant B | Tenant context is bound | Cross-tenant data disclosure |
| Increase \`exp\` by 3,600 | Lifetime is bound | Client can extend its own credential |
| Send POST instead of GET | HTTP method is bound | Read credential becomes a write credential |
| Replace \`kid\` | Key selection is part of verification | Algorithm or key confusion |
| Duplicate \`exp\` parameter | Parser has an explicit duplicate policy | Signer and proxy select different values |
| Change percent encoding of path | Canonicalization is consistent | Alternate representation bypasses MAC |

The duplicate-query case deserves special attention. Frameworks disagree on whether \`?exp=old&exp=new\` returns the first value, last value, or array. A CDN, WAF, application router, and signature library may not agree. The safest verifier rejects duplicates for every security-sensitive parameter. Test the actual deployed chain where possible.

Path normalization has similar traps: encoded slashes, dot segments, repeated slashes, Unicode normalization, and case sensitivity. Sign the exact representation the origin authorizes. If an intermediary rewrites the path after verification, ensure the verified resource identity survives the rewrite unchanged.

## Exercise replay without confusing it with expiration

Most signed download URLs are intentionally replayable during their validity window. Two successful GETs before expiry are therefore not automatically a vulnerability. The test should reflect the product contract:

- A reusable download link should work repeatedly until expiration, then fail consistently.
- A one-time export link needs server-side state, such as a nonce consumed atomically on first use.
- A presigned upload may allow repeated PUT requests that overwrite the same object unless storage policy prevents it.
- A link tied to a transaction should reject a replay even if its timestamp remains valid.

For a one-time design, run two requests concurrently with the same nonce. Exactly one should consume it. A read-then-delete implementation can let both through; an atomic insert or compare-and-set is needed. Then retry after a simulated timeout. If the client did not receive the first response, the API must have a documented result for the second attempt.

Do not label every replay as a cryptographic failure. HMAC proves integrity and authenticity of the signed fields. It does not provide uniqueness. Replay resistance comes from short lifetimes, single-use state, audience binding, or a protocol with a fresh challenge.

## Separate clock skew policy from accidental grace

Distributed systems rarely agree on the exact time. A signer may run ahead of the verifier, or a storage provider may evaluate a URL on a different host. The response should be a deliberate skew policy, not a broad test tolerance that hides bugs.

For expiration-only credentials, accepting requests for 30 seconds after \`exp\` weakens the advertised lifetime by 30 seconds. Another design includes both \`nbf\` (not before) and \`exp\`, allowing a small skew when checking both bounds. Whatever policy you choose, test the maximum accepted and first rejected instants on each side.

Monitor clock synchronization in production. If hosts drift beyond policy, fail closed and alert, or route issuance and verification through a consistent authority. Merely increasing the grace interval trades an operational problem for a security exposure.

Add a test for a verifier whose clock is deliberately ahead and another whose clock is behind. These are not excuses to change expected results dynamically. They demonstrate the consequences of the declared skew allowance. When the signer returns server time alongside the link, assert that clients treat it as diagnostic information, not as permission to rewrite the signed expiry. Leap seconds are normally absorbed by Unix-time handling, but clock steps and virtual-machine suspension can still expose assumptions about monotonic progression.

## Test key rotation while links remain active

Rotation creates a temporal overlap between keys. Issue a URL with \`k1\`, switch issuance to \`k2\`, and verify that the \`k1\` URL remains valid only until its natural expiry. New URLs must carry \`k2\`. Once no legitimate \`k1\` URL can remain active, remove the old key and ensure its URLs fail.

Also test an unknown key identifier, an empty identifier, and a valid identifier paired with a signature from another key. Never let a request choose a raw key location or signing algorithm. The identifier should select from a server-controlled allowlist.

Emergency revocation is different from routine rotation. Stateless signed URLs cannot normally be revoked individually. Options include very short TTLs, a denylist keyed by nonce, a resource version embedded in the signature, or a signing-key revocation that invalidates a whole cohort. Each changes availability and storage costs. Your incident plan should match the test plan.

## Verify behavior through caches and redirects

The origin can reject an expired URL correctly while a cache continues serving a previously successful response. Test a request before expiry to warm the CDN, advance time, and repeat the identical request. Private responses should use appropriate cache controls, and the cache key must include the security-relevant query string if caching is allowed at all.

Redirect flows add another hop. If the API validates a short application URL and redirects to a longer storage URL, capture both expiries. The downstream credential should not outlive the policy the caller was promised without a documented reason. Ensure the \`Location\` value is not logged or exposed to an unintended origin.

For browser downloads, check referrer policy and cross-origin behavior. For uploads, verify content length, content type, checksum, and object key if those are intended restrictions. A valid signature around an under-specified upload can still let a caller store executable content or overwrite another object.

The [API security testing checklist](/blog/api-security-testing-checklist-2026) is useful for the surrounding transport, logging, rate-limit, and data-exposure checks. Keep the temporal suite focused enough that a failure identifies the broken invariant.

## Build a failure matrix the team can operate

Public responses should be stable and safe. Many services return 403 for expired and invalid signatures to avoid leaking validation detail. Others return a machine-readable code so trusted clients can request a fresh URL. Either can work if the status, body, cache headers, and telemetry are consistent.

Record structured server-side reasons without recording the full URL. Useful fields include key ID, route template, verifier result, clock offset, and a hash of a nonce. Redact the signature and sensitive query values. An alert on a surge of expired links suggests UX or clock trouble; a surge of bad signatures may indicate tampering or a canonicalization regression.

Add a log-capture test that submits a URL containing a recognizable canary signature and tenant value, then scans application and access logs. The canary must not appear verbatim. Also inspect tracing attributes and exception messages, since redaction in the main logger does not protect every telemetry path. Preserve a safe request correlation ID so an operator can still connect the rejection to verifier diagnostics.

Repeat that check for redirect responses and client-visible error bodies. A credential removed from application logs can still escape through a reverse proxy's request-target field or an analytics event recorded before redaction.

Run fast deterministic tests on every change. Keep a smaller deployed-path suite for CDN behavior, proxy parsing, key distribution, and real storage-provider semantics. Provider tests should use short-lived isolated resources and tolerate network duration without weakening the actual expiration assertion.

## Frequently Asked Questions

### Should an expired signed URL return 401 or 403?

Usually 403 is clearer because the server understood the bearer credential but refuses the requested operation. A 401 response is associated with authentication challenges and may prompt unsuitable client behavior. Consistency with the API's documented security model matters more than hiding behind a generic 400.

### Is it safe to allow a few seconds after the expiry timestamp?

Only if that grace period is part of the stated policy and threat model. Test it as an explicit interval. A hidden tolerance means every link lives longer than callers believe and can mask clock synchronization failures.

### Can I test expiration by setting a one-second TTL and sleeping?

Keep at most one such end-to-end smoke test. Unit and component tests should inject time and assert the exact boundary. Sleep-based suites are slower, race-prone, and unable to cover long production TTLs efficiently.

### How do I revoke one signed URL before it expires?

A purely stateless MAC cannot revoke one instance. Include a nonce or resource version and consult server-side state, shorten the lifetime, or rotate a key to invalidate a larger set. Test concurrency if a nonce is single-use.

### What is the highest-value tampering test?

Change the authorized resource identifier while preserving the original signature. That test quickly reveals whether the verifier actually binds the path or object key. Follow it with tenant, expiry, method, duplicate-parameter, and encoding mutations because each targets a different canonicalization assumption.
`,
};
