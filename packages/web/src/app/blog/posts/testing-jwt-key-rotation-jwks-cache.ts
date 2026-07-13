import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing JWT Key Rotation and JWKS Caching',
  description:
    'Test JWT key rotation and JWKS caching with overlapping keys, unknown kid refreshes, cache expiry, issuer outages, and strict signature verification.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing JWT Key Rotation and JWKS Caching

Two public keys sit in the JWKS response during a rotation. Tokens signed yesterday carry \`kid=old-2026-07\`; tokens minted now carry \`kid=new-2026-07\`. Both must verify until the old token population expires. A verifier that always downloads keys survives the change but overloads the issuer. A verifier that caches forever is fast but may reject the new key or trust a retired one longer than policy permits. Rotation tests must hold correctness and cache behavior together.

The difficult defects live at transitions, not in a static “valid token” example. Test when a new key appears, when the old key remains during overlap, when it disappears, when a previously unknown \`kid\` triggers refresh, and when the JWKS endpoint is unavailable. Observe both the authorization result and fetch count. Either result alone can conceal a production incident.

This guide assumes familiarity with claims and access-control boundaries from the [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide). Use the [API security testing checklist](/blog/api-security-testing-checklist-2026) to place these cases beside transport, input, rate-limit, and authorization coverage.

## Model Rotation as a Timeline, Not a Key Swap

Safe asymmetric rotation usually has an overlap window. The issuer publishes the future public key, begins signing with its private key, keeps the previous public key while old tokens remain valid, and removes it only after the acceptance window ends. Exact sequencing varies, but abrupt replacement is dangerous when access tokens live longer than deployment propagation or cache refresh.

| Phase | JWKS publishes | Issuer signs new tokens with | Verifier must accept |
|---|---|---|---|
| Stable A | Key A | Key A | Valid A tokens |
| Pre-publish B | Keys A and B | Key A | Valid A tokens |
| Cutover | Keys A and B | Key B | Valid A and B tokens |
| Drain A | Keys A and B | Key B | A until expiry, plus B |
| Retire A | Key B | Key B | B only; A rejected |

Your tests should encode the intended timeline and token lifetime. If the maximum token life is 15 minutes, retirement immediately after cutover creates a rejection window. If emergency compromise requires immediate removal, rejection of still-unexpired A tokens may be the correct tradeoff. Tests cannot choose that policy, but they can make the chosen behavior explicit.

Keep \`kid\` values unique per key material. Reusing a \`kid\` during rotation is cache-hostile because a verifier may find an apparently applicable cached key and fail signature verification without fetching again. A fresh identifier gives the library an unambiguous cache-miss signal.

## Define the Verifier Contract Before Testing It

Signature validation is only one layer. A token signed by a trusted key can still be intended for another API or environment. Write the verifier contract as a matrix so rotation cases do not accidentally bypass claim requirements.

| Input property | Accepted condition | Rejection to assert |
|---|---|---|
| \`alg\` | Explicit allowlist such as \`RS256\` | \`none\`, symmetric confusion, or any unexpected algorithm |
| \`kid\` | Selects one current trusted JWK | Missing, unknown after refresh, or ambiguous key selection |
| \`iss\` | Exact configured issuer | Lookalike URL, wrong tenant, wrong environment |
| \`aud\` | Contains this API's audience | Token minted for another service |
| \`exp\` and \`nbf\` | Valid under bounded clock tolerance | Expired or not-yet-valid token |
| Signature | Verifies against selected public key | Modified payload, header, or signature |

Do not implement a custom JWT verifier merely to make testing easier. Use a maintained JOSE library, configure issuer, audience, and algorithms explicitly, and place caching around trusted JWKS retrieval. The test harness may generate keys and tokens, but production verification should not decode and trust payloads before signature validation.

## Build a Controllable JWKS Test Server

A local HTTP server gives the test authority over published keys, response failures, cache headers, and request counts. The following Vitest fixture creates two independent RSA signing keys and exposes whichever public JWKs the test selects. It uses \`jose\` for standards-compliant key generation and signing.

\`\`\`typescript
// test/jwks-fixture.ts
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  type JWK,
} from 'jose';

export type SigningKey = { kid: string; privateKey: CryptoKey; publicJwk: JWK };

export async function makeSigningKey(kid: string): Promise<SigningKey> {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(publicKey);
  return {
    kid,
    privateKey,
    publicJwk: { ...publicJwk, kid, alg: 'RS256', use: 'sig' },
  };
}

export async function signAccessToken(key: SigningKey): Promise<string> {
  return new SignJWT({ scope: 'orders:read' })
    .setProtectedHeader({ alg: 'RS256', kid: key.kid })
    .setIssuer('https://issuer.test')
    .setAudience('orders-api')
    .setSubject('user-42')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key.privateKey);
}

export async function startJwksServer(initialKeys: JWK[]) {
  let keys = initialKeys;
  let status = 200;
  let requests = 0;

  const server: Server = createServer((request, response) => {
    if (request.url !== '/.well-known/jwks.json') {
      response.writeHead(404).end();
      return;
    }
    requests += 1;
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(status === 200 ? JSON.stringify({ keys }) : 'unavailable');
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');

  return {
    url: new URL(\`http://127.0.0.1:\${address.port}/.well-known/jwks.json\`),
    publish(nextKeys: JWK[]) {
      keys = nextKeys;
    },
    fail(nextStatus = 503) {
      status = nextStatus;
    },
    recover() {
      status = 200;
    },
    requestCount() {
      return requests;
    },
    async close() {
      server.close();
      await once(server, 'close');
    },
  };
}
\`\`\`

The fixture binds to loopback on an ephemeral port, so it needs no external service. It does not pretend to be a full OpenID provider. That narrow scope is useful: every JWKS transition is deterministic, and the number of fetches is observable.

Generate keys once per test or suite based on runtime cost and isolation needs. Never commit private keys used by real environments. Test-only keys should be created dynamically or stored as explicitly non-production fixtures with no trust relationship outside the harness.

## Verify Overlap and Unknown-kid Refresh With jose

\`jose.createRemoteJWKSet()\` resolves signing keys from a remote JWKS and maintains a cache. Configure a short cache and zero cooldown in this focused test so an unknown \`kid\` can provoke an immediate fetch. Production cooldown should protect the issuer from repeated attacker-controlled unknown identifiers.

\`\`\`typescript
// test/key-rotation.test.ts
import { afterEach, describe, expect, test } from 'vitest';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import {
  makeSigningKey,
  signAccessToken,
  startJwksServer,
} from './jwks-fixture';

describe('JWT signing-key rotation', () => {
  const servers: Array<{ close(): Promise<void> }> = [];
  afterEach(async () => Promise.all(servers.splice(0).map((server) => server.close())));

  test('refreshes for a new kid and accepts both keys during overlap', async () => {
    const oldKey = await makeSigningKey('old-2026-07');
    const newKey = await makeSigningKey('new-2026-07');
    const server = await startJwksServer([oldKey.publicJwk]);
    servers.push(server);

    const jwks = createRemoteJWKSet(server.url, {
      cacheMaxAge: 60_000,
      cooldownDuration: 0,
    });
    const options = {
      issuer: 'https://issuer.test',
      audience: 'orders-api',
      algorithms: ['RS256'],
    };

    const oldToken = await signAccessToken(oldKey);
    await expect(jwtVerify(oldToken, jwks, options)).resolves.toMatchObject({
      payload: { sub: 'user-42' },
    });
    expect(server.requestCount()).toBe(1);

    server.publish([oldKey.publicJwk, newKey.publicJwk]);
    const newToken = await signAccessToken(newKey);
    await expect(jwtVerify(newToken, jwks, options)).resolves.toBeDefined();
    expect(server.requestCount()).toBe(2);

    await expect(jwtVerify(oldToken, jwks, options)).resolves.toBeDefined();
    expect(server.requestCount()).toBe(2);
  });
});
\`\`\`

This one case proves three behaviors. The first token populates the cache. The previously unseen new \`kid\` forces a JWKS refresh. After overlap is loaded, verifying the old token again uses the cache and does not create a third request.

Avoid asserting internal cache fields from the library. Request count and verification outcome are stable observable behavior. An upgrade can change data structures without invalidating the contract.

## Test Retirement With a Fresh Cache Boundary

Removing the old key from the server does not necessarily make every running verifier reject it immediately. A process may legitimately retain a cached JWKS until its configured maximum age. Rotation policy must account for that staleness, and tests must distinguish “retired at issuer” from “evicted at verifier.”

For deterministic retirement, create a new remote key set after publishing only B. A new verifier has no cached A and must reject an A token. Separately, use a short cache age or an injected-clock cache wrapper to test eviction in a long-running process.

\`\`\`typescript
import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import { expect, test } from 'vitest';

test('a fresh verifier rejects the retired old kid', async () => {
  const oldKey = await makeSigningKey('retired-key');
  const newKey = await makeSigningKey('active-key');
  const server = await startJwksServer([oldKey.publicJwk, newKey.publicJwk]);

  try {
    const oldToken = await signAccessToken(oldKey);
    server.publish([newKey.publicJwk]);

    const freshJwks = createRemoteJWKSet(server.url, { cooldownDuration: 0 });
    await expect(
      jwtVerify(oldToken, freshJwks, {
        issuer: 'https://issuer.test',
        audience: 'orders-api',
        algorithms: ['RS256'],
      }),
    ).rejects.toBeInstanceOf(errors.JWKSNoMatchingKey);
  } finally {
    await server.close();
  }
});
\`\`\`

Do not write a test that waits for a production-scale cache TTL. Long sleeps make CI slow and nondeterministic. Wrap remote retrieval behind a small component with an injectable clock, or configure milliseconds-long expiry in the test instance. The production value and test value can differ while the same expiration branch is exercised.

Retirement acceptance depends on your cache contract. A verifier may continue accepting cryptographically valid A tokens until its cached JWKS expires. If security policy demands immediate revocation, a TTL cache alone cannot guarantee it. You need push invalidation, introspection, short token lifetime, process restart, or another explicit mechanism.

## Exercise Cache Hits, Expiry, and Concurrent Misses

A complete caching suite observes traffic under more than one token.

| Cache scenario | Verification outcome | Expected fetch behavior |
|---|---|---|
| Repeated token with known \`kid\` | All valid | One initial fetch within TTL |
| Different tokens, same known key | All valid | No per-token fetch |
| New \`kid\` during overlap | New token valid after refresh | One controlled refresh |
| Unknown attacker \`kid\` | Reject | Refresh bounded by cooldown |
| Cache expired | Valid after reload | One new fetch |
| Ten concurrent requests on cold cache | All valid | Ideally one coalesced fetch |

Concurrent cold-cache behavior matters in autoscaled APIs. If 500 requests arrive at a fresh instance and each launches a JWKS request, the verifier creates a thundering herd. Use \`Promise.all\` with many verification calls and assert the fixture's request count stays within the library's documented coalescing behavior. Do not assume exactly one without verifying the chosen library and configuration.

Unknown \`kid\` traffic is also a denial-of-service surface. An attacker can generate unsigned garbage with a unique header value. A verifier that refreshes for every value turns the issuer into a dependency amplifier. Test cooldown, rate limits, and negative caching where supported, while ensuring a legitimate rotation becomes visible within the required propagation window.

## Decide How Outages Interact With a Warm Cache

When the JWKS endpoint returns 503, a warm verifier may continue using cached keys. That supports availability and is often desirable. Once the cache expires, libraries differ: some fail closed, while an application wrapper might allow stale keys for a bounded stale-if-error interval.

Test these states separately:

1. Warm cache, known key, endpoint down.
2. Warm cache, unknown key, endpoint down.
3. Expired cache, endpoint down.
4. Endpoint recovers with a newly published key.

Known cached tokens should follow the documented availability policy. An unknown key must never be accepted merely because retrieval failed. Recovery should not require a process restart.

Do not mock the JWKS function to return a key in outage tests. That bypasses the cache and HTTP behavior under examination. Use the controllable server's failure mode, then assert sanitized application errors. External responses should normally be 401 for invalid credentials or a policy-specific temporary failure when trust material cannot be obtained, without leaking key IDs or internal stack traces unnecessarily.

## Add Adversarial JWT Cases Around Rotation

Rotation tests can accidentally validate only happy cryptography. Keep adversarial inputs in the same suite because header-based key selection is part of the attack surface.

Reject tokens with a missing \`kid\` when the JWKS contains multiple suitable keys unless your library has an intentional unambiguous rule. Reject an unknown \`kid\` after the controlled refresh. Restrict algorithms rather than accepting whatever the header requests. Verify wrong issuer and wrong audience even when the signature is valid.

Create tampered tokens by changing one encoded payload character after signing, then confirm rejection. Do not merely alter the decoded object and re-sign it with a trusted test private key, because that creates a valid token with different claims rather than a damaged signature.

Duplicate \`kid\` values with different key material deserve a test if your issuer could misconfigure its JWKS. The safe outcome is failure or deterministic rejection, not trying keys indefinitely. Also test malformed JSON, an empty \`keys\` array, non-signing keys, and a key whose declared algorithm conflicts with the token.

## Keep Unit, Integration, and Environment Tests Distinct

Unit tests with generated keys verify your local contract quickly. Component tests with a loopback JWKS server cover HTTP and caching. A small staging test against the real identity provider checks discovery URLs, TLS, issuer naming, and operational rotation procedures. Each layer answers a different question.

Never force a production rotation as part of routine CI. In a controlled staging tenant, rehearse pre-publication, cutover, overlap, retirement, rollback, and alerting. Capture metrics for JWKS request rates, unknown key IDs, verification failures by reason, and cache age. Redact full tokens and sensitive claims from logs.

The operational runbook should state maximum token lifetime, JWKS cache TTL, cooldown, overlap length, emergency revocation behavior, and rollback owner. Tests then encode those numbers or their relationships. A key should not retire before all legitimate A tokens and permitted stale caches have drained, unless the documented emergency path intentionally favors revocation.

Include rollback in the rehearsal. If B signs tokens and an operational fault forces the issuer back to A, verifiers must still possess or retrieve A during the overlap. A rollback test publishes both keys, signs in the sequence A, B, A, and checks that cache behavior does not depend on key IDs increasing or appearing only once.

Time assertions should use an injected clock where your wrapper owns expiry calculations. Keep a small real-timer component test only if necessary. Advancing a fake clock across cache age, token expiry, and clock tolerance separately produces faster diagnostics than one sleep that crosses all three boundaries at an uncertain instant.

## Frequently Asked Questions

### Should an unknown JWT kid immediately refresh the JWKS cache?

Usually it should trigger a controlled refresh so newly rotated keys become usable before the normal TTL ends. Apply cooldown or request coalescing so attacker-generated key IDs cannot cause an outbound request per token. After refresh, an unknown key must still be rejected.

### How long should old signing keys remain in JWKS during rotation?

Keep them for at least the acceptance lifetime of tokens signed by those keys, plus relevant propagation and clock margins, unless emergency revocation policy says otherwise. The exact duration is a security and availability decision that tests should derive from documented token and cache settings.

### Can a verifier keep accepting a key after it disappears from JWKS?

Yes, if that public key remains in a valid local cache. This is normal for TTL caching. If immediate removal must stop acceptance, use an explicit invalidation or revocation design rather than assuming every verifier refetches instantly.

### Why should each rotated key have a new kid value?

A unique identifier makes cache misses and key selection deterministic. Reusing a \`kid\` with new material can leave verifiers selecting the stale cached key and failing signatures without realizing the JWKS needs to be reloaded.

### What should happen when the JWKS endpoint is unavailable?

Known keys in a permitted warm cache may continue to verify according to availability policy. Unknown keys must fail, and expired-cache behavior should be explicitly defined, tested, and monitored. Recovery should fetch current keys without requiring service restart.
`,
};
