import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Shopify Webhook HMAC Validation',
  description:
    'Test Shopify webhook HMAC validation with byte-exact raw bodies, constant-time comparison, invalid signatures, duplicate IDs, and secret rotation cases.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Shopify Webhook HMAC Validation

One space after a colon is enough to change a Shopify webhook signature. Parse the JSON, serialize the same object again, and the business data looks identical while the HMAC becomes different. That is not an edge case. It is the property that makes the signature protect the exact bytes Shopify delivered.

Shopify sends a Base64-encoded HMAC-SHA256 value in \`X-Shopify-Hmac-SHA256\`. The key is the app client secret and the message is the unmodified request body. A trustworthy endpoint verifies those bytes before it parses or trusts the payload, compares signatures without data-dependent early exits, rejects malformed headers, and separately handles duplicate delivery IDs. The test suite must attack each boundary instead of exercising only one happy-path fixture.

## The signed object is a byte sequence, not a JSON object

Two JSON documents can parse to the same JavaScript value and still have different HMACs. Whitespace, property order, escaped Unicode, and final newlines all affect the digest. Middleware that runs \`express.json()\` before verification destroys the authoritative byte sequence unless it deliberately preserves a raw copy.

The verification formula is straightforward: \`Base64(HMAC-SHA256(client_secret, raw_body))\`. Complications arise around transport representation and comparison.

| Input aspect | Signed by Shopify? | Testing consequence |
|---|---|---|
| Raw request body bytes | Yes | Sign the exact Buffer sent by the test client |
| JSON property meaning | Indirectly, through bytes | Re-serialization must fail with the old signature |
| \`X-Shopify-Hmac-SHA256\` header | Carries expected digest | Missing, invalid Base64, and wrong-length values need rejection tests |
| Request URL and query | No for webhook body HMAC | Do not claim body validation authenticates routing metadata |
| \`X-Shopify-Webhook-Id\` | Delivery metadata | Use for deduplication, separately from authenticity |
| Topic and shop headers | Delivery metadata | Validate allowed values only after HMAC succeeds |

Always generate most test signatures from literal raw fixtures. A helper that accepts an object and calls \`JSON.stringify()\` can hide the exact production bug under test. Keep at least one fixture with purposeful whitespace or Unicode escapes so accidental parsing is exposed.

## Implement a verifier with explicit malformed-input behavior

Node's \`crypto.createHmac()\` and \`crypto.timingSafeEqual()\` are sufficient for a manual verifier. Convert both Base64 values to bytes, check lengths before calling \`timingSafeEqual\`, and return false on absent or malformed input. The length branch is necessary because \`timingSafeEqual\` throws when buffers have different lengths.

The following module uses strict validation for a SHA-256 Base64 digest. SHA-256 output is 32 bytes. Checking canonical Base64 shape prevents permissive decoding from turning arbitrary header text into surprising buffers.

\`\`\`ts
import { createHmac, timingSafeEqual } from 'node:crypto';

const SHA256_BYTES = 32;
const BASE64_SHA256 = /^[A-Za-z0-9+/]{43}=$/;

export function signShopifyBody(rawBody: Buffer, clientSecret: string): string {
  return createHmac('sha256', clientSecret).update(rawBody).digest('base64');
}

export function verifyShopifyHmac(
  rawBody: Buffer,
  providedHeader: string | string[] | undefined,
  clientSecret: string,
): boolean {
  if (typeof providedHeader !== 'string' || !BASE64_SHA256.test(providedHeader)) {
    return false;
  }

  const provided = Buffer.from(providedHeader, 'base64');
  const expected = createHmac('sha256', clientSecret).update(rawBody).digest();
  if (provided.length !== SHA256_BYTES || provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}
\`\`\`

The regular expression expects canonical padded Base64 for a 32-byte digest. If an official library owns verification in your application, test through that library-facing boundary rather than duplicating this implementation. The important test properties remain raw-body fidelity, header handling, and rejection before side effects.

Constant-time comparison reduces timing leakage in the equality operation. It does not make the entire endpoint constant time, nor does it compensate for logging signatures, weak secret storage, or processing unverified fields. Be precise about the guarantee.

## Place verification before JSON middleware

For Express, a webhook route can use \`express.raw({ type: 'application/json' })\`, verify \`req.body\` as a Buffer, and then parse it. If a global \`express.json()\` middleware runs first, route-local raw middleware cannot reconstruct the original representation. Mount the webhook router before global JSON parsing or exclude its path.

Other frameworks expose different raw-body mechanisms. The invariant does not change: obtain exactly the delivered bytes. Confirm the framework has not decompressed, transcoded, or normalized them before the verifier runs. Test the deployed adapter, not only the pure HMAC function.

| Middleware arrangement | Raw bytes available? | Expected security result |
|---|---|---|
| Route uses raw parser before JSON parser | Yes | Verify, then parse and process |
| Global JSON parser runs first | Usually no | Treat as configuration defect |
| Raw body copied by verified framework hook | Yes, if byte-exact | Test the hook with a noncanonical fixture |
| Handler stringifies parsed payload | No authoritative bytes | Valid deliveries can be rejected or altered bodies accepted in flawed designs |

The pure verifier is fast to unit test, but one integration test must prove middleware order. Without that test, a harmless-looking server refactor can silently break every production webhook.

## Build a mutation matrix around one authentic delivery

Start with a literal payload, compute a valid signature using a test secret, then change one dimension at a time. The signature generator belongs on the test side so expected values are independent of the production verifier's control flow. Node's crypto primitive is shared, but the test should not call the production \`signShopifyBody\` helper to establish its own oracle.

\`\`\`ts
import { createHmac } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createWebhookRouter } from './webhook-router';

const secret = 'test_client_secret_4f32';
const raw = Buffer.from('{"id":8421, "email":"buyer@example.test"}\n', 'utf8');

function testSignature(body: Buffer, key = secret) {
  return createHmac('sha256', key).update(body).digest('base64');
}

function appWith(processOrder: (payload: unknown) => Promise<void>) {
  const app = express();
  app.use('/webhooks/orders-create', createWebhookRouter({ secret, processOrder }));
  app.use(express.json());
  return app;
}

describe('Shopify orders/create authentication boundary', () => {
  it('processes the exact signed bytes once', async () => {
    const processOrder = vi.fn().mockResolvedValue(undefined);
    await request(appWith(processOrder))
      .post('/webhooks/orders-create')
      .set('Content-Type', 'application/json')
      .set('X-Shopify-Hmac-SHA256', testSignature(raw))
      .set('X-Shopify-Webhook-Id', 'delivery-001')
      .send(raw)
      .expect(200);
    expect(processOrder).toHaveBeenCalledWith({ id: 8421, email: 'buyer@example.test' });
  });

  it.each([
    ['missing header', undefined],
    ['invalid Base64', 'not a digest'],
    ['wrong secret', testSignature(raw, 'another_secret')],
  ])('rejects %s without processing', async (_case, header) => {
    const processOrder = vi.fn();
    const call = request(appWith(processOrder))
      .post('/webhooks/orders-create')
      .set('Content-Type', 'application/json')
      .send(raw);
    if (header) call.set('X-Shopify-Hmac-SHA256', header);
    await call.expect(401);
    expect(processOrder).not.toHaveBeenCalled();
  });

  it('rejects semantically equal JSON with changed bytes', async () => {
    const normalized = Buffer.from('{"id":8421,"email":"buyer@example.test"}', 'utf8');
    const processOrder = vi.fn();
    await request(appWith(processOrder))
      .post('/webhooks/orders-create')
      .set('Content-Type', 'application/json')
      .set('X-Shopify-Hmac-SHA256', testSignature(raw))
      .send(normalized)
      .expect(401);
    expect(processOrder).not.toHaveBeenCalled();
  });
});
\`\`\`

\`createWebhookRouter\` is application code, not a Shopify API invented for the example. Its contract is explicit: mount raw parsing, authenticate, parse, then call the injected processor. Supertest accepts a Buffer, allowing the fixture bytes to remain controlled.

Add mutations for a changed digit, removed newline, inserted space, truncated body, and wrong character encoding if the server supports non-UTF-8 inputs. Each must fail with the original signature. Then sign the mutated body and confirm it succeeds when it is valid JSON, proving the route is not simply tied to one fixture.

## Authentication must happen before every observable side effect

A \`401\` response is not enough if the handler already queued work, wrote an audit record containing attacker-controlled data, or incremented a business metric. Assert that invalid requests do not invoke parsers with dangerous extensions, domain services, queues, database writes, or topic dispatch.

Minimal request logging may occur before authentication, but never log the body, secret, or full HMAC. Operational counters such as “webhook authentication rejected” are safer when labels are bounded. Do not label metrics with shop domains from unverified headers, since attackers can create unbounded cardinality.

Reject malformed JSON after successful HMAC validation with a client error and no business processing. Authenticity and syntax are independent stages. Shopify could deliver bytes that pass authentication but your endpoint cannot parse because of a version or implementation mismatch. That should be distinguishable from an attacker using a bad signature.

The [API security testing checklist](/blog/api-security-testing-checklist-2026) places this boundary among authorization, replay resistance, secret handling, and observability controls. HMAC answers origin and integrity for the signed body; it does not authorize arbitrary operations inferred from unchecked headers.

## Duplicate delivery IDs test idempotency, not signature validity

Shopify can deliver the same webhook more than once. \`X-Shopify-Webhook-Id\` identifies a delivery and can support deduplication. Verify the HMAC first, then attempt an atomic insert of the delivery ID or an equivalent idempotency claim. A check-then-insert sequence can race when two workers receive the duplicate concurrently.

Your tests should send two valid, identically signed requests with the same delivery ID and assert one business effect. Also run concurrent duplicates if the persistence layer supports it. The second request should normally receive a success response so the sender does not keep retrying an event already accepted.

Do not put the delivery ID into the HMAC calculation. Shopify's documented webhook HMAC covers the raw body. Metadata headers are outside that calculation. Treat a verified delivery ID as useful transport metadata and bind it to processing records, but do not describe it as cryptographically signed by the body HMAC.

Replay control can go beyond deduplication when using supported timestamp headers, yet clock policies require care. Delivery retries can be delayed, and overly narrow windows discard legitimate events. The core dependable control is idempotent processing keyed by the webhook delivery identifier.

## Secret rotation requires an explicit overlap policy

Shopify notes that after rotating a client secret, HMAC digests can temporarily be generated using the old secret. An application that switches instantly to only the new secret can reject valid deliveries during the transition. If your operational policy allows overlap, the verifier can try the active secret and then a previous secret held for a bounded period.

Test both secrets independently, ensure an unrelated third secret fails, and remove the previous secret after the documented operational window. Never concatenate secrets or average digests. Each candidate key computes a complete HMAC over the raw bytes.

Comparison count can reveal whether an old secret was needed, but metrics must not identify the secret value. Rotation tests should also confirm that configuration with no active secret fails startup rather than accepting unauthenticated requests or using a placeholder.

The broader [webhook testing guide](/blog/webhook-testing-complete-guide-2026) covers retries, response deadlines, event ordering, and asynchronous processing. Shopify HMAC tests fit within that delivery system; they are the gate before those behaviors matter.

## What not to copy into a production test suite

Avoid fixtures copied from request logs unless they have been scrubbed and their byte encoding is preserved. Pretty-printing a captured body changes its signature. Store a synthetic Buffer fixture and its independently calculated expected digest, or calculate the digest in test setup with a known-only test secret.

Do not call Shopify over the network in unit tests. A local signature matrix is deterministic and much faster. Use Shopify's supported webhook trigger tooling for a small environment-level check when you need confidence in subscription routing and deployed middleware, while recognizing that a trigger is not a complete validation of production subscriptions.

Do not assert exact error prose to an unauthenticated caller. A stable status and empty or generic body reduce information exposure. Put detailed diagnosis in protected logs with a correlation ID.

Before release, the suite should prove:

- Byte-for-byte valid bodies authenticate.
- Equal parsed JSON with different bytes does not authenticate under the old signature.
- Missing, array-valued, malformed, truncated, and wrong-length headers fail cleanly.
- No domain effect happens before verification.
- Raw parsing is mounted before general JSON parsing.
- Validly signed malformed JSON is handled as a syntax failure.
- Duplicate valid deliveries produce one business effect.
- Concurrent duplicates are claimed atomically.
- Current and approved previous secrets follow the rotation policy.
- Logs and responses do not disclose bodies, signatures, or secrets.

That collection is substantially more valuable than dozens of payload-schema cases routed around authentication. It tests the cryptographic boundary as deployed, including the middleware decisions most likely to invalidate it.

## Keep one fixed digest vector independent of helper code

Most tests can calculate signatures dynamically, but retain at least one fixed vector containing a test secret, exact body bytes, and expected Base64 digest. Compute it once with a separate trusted command or implementation and review it into the fixture. That vector detects accidental changes where production and test helpers share the same wrong encoding or digest representation.

Represent the body unambiguously. A UTF-8 text fixture may hide whether the file ends in a newline. A Buffer created from an explicit string, or a binary fixture with a documented byte length and SHA-256 checksum, makes the signed message reproducible. When reading a fixture from disk, do not call \`.trim()\`, normalize line endings, or decode and re-encode it before HMAC calculation.

Include non-ASCII content such as an accented customer name or an emoji in one test. The HMAC operates on UTF-8 bytes delivered over HTTP, not JavaScript character count. A broken verifier that updates the HMAC with a differently encoded string may pass ASCII-only examples and fail real merchant data. Send the same Buffer used to calculate the expected digest.

Header casing should not be a product concern in Node frameworks because HTTP header names are case-insensitive and are commonly normalized. Test the framework boundary using the canonical Shopify header, then unit-test the verifier's input type behavior separately. Do not implement manual case-sensitive scans of raw header lines.

Compression needs an architectural decision. If an upstream proxy decompresses a request before application verification, the application no longer has the exact transmitted entity bytes Shopify signed. Confirm Shopify delivery behavior and the framework or proxy configuration rather than guessing which representation to sign. Your integration environment should mirror the production request path closely enough to expose such transformations.

Finally, keep validation latency bounded. HMAC work is linear in body size, JSON parsing is additional work, and webhook endpoints have response-time expectations. Enforce an application-appropriate maximum request size at the raw parser, return a client error for oversized input, and test that domain processing is not invoked. The limit must accommodate legitimate Shopify payloads for subscribed topics; choose it from observed and documented payload characteristics, not an arbitrary tiny number.

Make the fixed vector readable in test diagnostics without printing its secret. Give it a case name, byte length, and expected digest, then compare the computed result. If the vector fails after a fixture edit, require the author to explain why the signed bytes changed instead of automatically updating the expectation. That review friction is useful because a casual formatter can otherwise rewrite JSON fixtures and erase the property the test was preserving.

## Frequently Asked Questions

### Should the test sign JSON.stringify(payload) or the request Buffer?

Sign the exact Buffer sent to the endpoint. Using \`JSON.stringify()\` is safe only when those exact resulting bytes are also sent unchanged; literal raw fixtures are better for detecting normalization bugs.

### Why check signature lengths before timingSafeEqual()?

Node's \`timingSafeEqual()\` requires buffers of equal length and throws otherwise. Rejecting a non-32-byte decoded SHA-256 digest avoids turning malformed input into a server error.

### Is X-Shopify-Webhook-Id included in the HMAC?

The documented HMAC is computed over the raw request body using the client secret. Use the delivery ID for deduplication after authentication, but do not add it to the body digest calculation.

### What status should an invalid Shopify signature return?

\`401 Unauthorized\` is a common, clear choice. More important than the exact 4xx code is rejecting before processing and returning no diagnostic detail that helps an attacker.

### How can middleware order be tested without a live Shopify store?

Mount the real application router in an integration test, send a deliberately noncanonical raw Buffer with a correctly calculated signature, and verify processing succeeds. If JSON parsing ran first and reserialized the body, the test will fail.
`,
};
