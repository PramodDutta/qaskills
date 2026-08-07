import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Webhook Signature Rotation Without Breaking Delivery',
  description: 'Learn testing webhook signature rotation with runnable HMAC tests that verify overlap windows, raw bodies, replay defense, rollback, and zero-downtime cutover.',
  date: '2026-08-07',
  category: 'API Testing',
  content: `
# Testing Webhook Signature Rotation Without Breaking Delivery

Testing webhook signature rotation means proving that a receiver accepts the intended old and new signing secrets during a controlled overlap, rejects every other secret, preserves raw request bytes, enforces the replay window, and continues processing each delivery only once. The test must cover a sequence of key states, not just two isolated HMAC examples. Rotation is a deployment protocol involving the sender, secret distribution, receiver configuration, traffic observation, and retirement.

A reliable suite models that protocol explicitly. It freezes time, signs realistic byte payloads, identifies which key verified the request, exercises configuration changes without restarting the test process, and checks both acceptance and business side effects. This turns a risky production ceremony into a rehearsed state transition with measurable exit conditions and a tested rollback path.

## Define the rotation state machine before writing assertions

Teams often describe rotation as “support two secrets.” That is incomplete. The receiver has distinct states, and the sender may change at a different moment. Write down those states so every transition has an owner and a test.

| Phase | Sender signs with | Receiver trusts | Expected result |
|---|---|---|---|
| Stable old | Old key | Old key | Old signatures accepted |
| Receiver prepared | Old key | Old and new keys | Old accepted, new also verifiable in a probe |
| Sender cutover | New key | Old and new keys | New accepted, delayed old deliveries still accepted |
| Observation overlap | New key | Old and new keys | Verification metrics show old usage declining |
| Retirement | New key | New key | New accepted, old rejected |
| Rollback, if needed | Old key | Old and new keys | Old resumes without configuration scramble |

The receiver-prepared phase must precede sender cutover. Otherwise even a short propagation delay can reject valid traffic. Retirement must follow the maximum credible delivery delay, including provider retries and queues, not merely the moment the sender configuration changes.

Name the safety properties:

1. No request signed by an untrusted key reaches the business handler.
2. During overlap, both specifically configured keys can verify valid requests.
3. After retirement, the old key cannot verify new arrivals.
4. Timestamp validation uses a controlled clock and the documented tolerance.
5. Replayed delivery identifiers do not repeat a side effect.
6. Logs and metrics identify a key by a safe label, never by secret material.

These properties work for provider webhooks and internal HMAC protocols. The exact header grammar and signed message format must come from the provider's official documentation. Do not copy a Stripe-style timestamp format into a GitHub integration or assume every service signs \`timestamp.payload\`.

## Create a protocol fixture with known cryptographic inputs

For a concrete runnable workflow, define an internal example protocol. The sender transmits UTF-8 JSON bytes, a Unix timestamp header, a delivery ID, and a lowercase hexadecimal HMAC-SHA256 signature over \`timestamp + "." + rawBody\`. This is an example contract, not a universal webhook standard.

\`\`\`ts
import { createHmac } from 'node:crypto';

export type WebhookHeaders = {
  timestamp: string;
  deliveryId: string;
  signature: string;
};

export function signWebhook(
  rawBody: Buffer,
  secret: string,
  timestampSeconds: number,
  deliveryId: string,
): WebhookHeaders {
  const signed = Buffer.concat([
    Buffer.from(String(timestampSeconds)),
    Buffer.from('.'),
    rawBody,
  ]);
  const signature = createHmac('sha256', secret).update(signed).digest('hex');
  return {
    timestamp: String(timestampSeconds),
    deliveryId,
    signature,
  };
}
\`\`\`

Keep fixed vectors in tests so refactoring the signer and verifier cannot make the same mistake and agree with each other. Generate the expected digest once using an independently reviewed tool or implementation, then store the raw bytes, timestamp, key label, and digest. A shared helper is convenient for scenarios, but it is not an independent oracle.

\`\`\`ts
import { expect, it } from 'vitest';
import { signWebhook } from './sign-webhook';

it('matches the reviewed HMAC fixture', () => {
  const headers = signWebhook(
    Buffer.from('{"event":"build.finished","ok":true}', 'utf8'),
    'fixture-secret',
    1_800_000_000,
    'delivery-fixture-1',
  );

  expect(headers.signature).toMatch(/^[0-9a-f]{64}$/);
  expect(headers.timestamp).toBe('1800000000');
});
\`\`\`

In a real repository, replace the shape-only digest assertion with the independently recorded exact digest. The important discipline is to avoid asserting a value produced by the function under test during the same test.

## Verify against a labeled key ring, not an anonymous array

A key ring should include safe identifiers such as \`current-2026-08\` and \`previous-2026-05\`. Labels make observability and retirement decisions possible without logging secret values. The verifier can try all active keys, compare digests in constant time, and return the matching label.

\`\`\`ts
import { createHmac, timingSafeEqual } from 'node:crypto';

type ActiveKey = { id: string; secret: string };
type Verification =
  | { ok: true; keyId: string }
  | { ok: false; reason: 'timestamp' | 'signature' | 'format' };

export function verifyWebhook(input: {
  rawBody: Buffer;
  signatureHex: string;
  timestampText: string;
  activeKeys: ActiveKey[];
  nowSeconds: number;
  toleranceSeconds: number;
}): Verification {
  if (!/^\\d+$/.test(input.timestampText)) {
    return { ok: false, reason: 'format' };
  }
  if (!/^[0-9a-f]{64}$/.test(input.signatureHex)) {
    return { ok: false, reason: 'format' };
  }

  const timestamp = Number(input.timestampText);
  if (Math.abs(input.nowSeconds - timestamp) > input.toleranceSeconds) {
    return { ok: false, reason: 'timestamp' };
  }

  const supplied = Buffer.from(input.signatureHex, 'hex');
  const prefix = Buffer.from(\`\${input.timestampText}.\`);
  const signed = Buffer.concat([prefix, input.rawBody]);

  for (const key of input.activeKeys) {
    const expected = createHmac('sha256', key.secret).update(signed).digest();
    if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) {
      return { ok: true, keyId: key.id };
    }
  }
  return { ok: false, reason: 'signature' };
}
\`\`\`

Constant-time comparison reduces timing leakage in digest comparison. Length must be checked before Node's \`timingSafeEqual\`, because it requires equal-size inputs. The overall function still performs different work for format and timestamp failures, so do not market this small example as a formal side-channel proof. It demonstrates the appropriate digest comparison primitive.

Returning \`keyId\` is operationally valuable. Increment a counter by safe key label and outcome. During overlap, it shows whether delayed old signatures still arrive. Never include a secret, full signature, or raw sensitive payload in logs.

## Use a table-driven suite for every key state

Rotation logic is compact enough to test as a matrix. Table-driven cases expose accidental “accept any configured-looking value” behavior and make the retirement boundary obvious in code review.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { signWebhook } from './sign-webhook';
import { verifyWebhook } from './verify-webhook';

const oldKey = { id: 'old', secret: 'old-test-secret' };
const newKey = { id: 'new', secret: 'new-test-secret' };
const rawBody = Buffer.from('{"type":"account.updated","id":"acct-19"}');
const now = 1_800_000_000;

describe.each([
  { phase: 'stable old', active: [oldKey], signer: oldKey, ok: true },
  { phase: 'prepared old traffic', active: [oldKey, newKey], signer: oldKey, ok: true },
  { phase: 'prepared new probe', active: [oldKey, newKey], signer: newKey, ok: true },
  { phase: 'retired old', active: [newKey], signer: oldKey, ok: false },
  { phase: 'stable new', active: [newKey], signer: newKey, ok: true },
  {
    phase: 'unrelated key',
    active: [oldKey, newKey],
    signer: { id: 'attacker', secret: 'not-active' },
    ok: false,
  },
])('$phase', ({ active, signer, ok }) => {
  it(\`verification result is \${ok}\`, () => {
    const headers = signWebhook(rawBody, signer.secret, now, 'delivery-22');
    const result = verifyWebhook({
      rawBody,
      signatureHex: headers.signature,
      timestampText: headers.timestamp,
      activeKeys: active,
      nowSeconds: now,
      toleranceSeconds: 300,
    });
    expect(result.ok).toBe(ok);
  });
});
\`\`\`

Add an assertion for the matching key label in each successful case. If the same secret is accidentally configured twice, decide whether startup validation rejects the duplicate. Silent duplicate entries distort metrics and can conceal a configuration rollout error.

| Configuration defect | Desired startup or request behavior | Test strategy |
|---|---|---|
| No active keys | Fail readiness or reject all requests | Construct empty key ring |
| Duplicate key labels | Reject configuration | Load two entries with same ID |
| Duplicate secret under two labels | Reject or warn by policy | Compare secret fingerprints in config validation |
| Blank secret | Reject configuration | Load whitespace and empty values |
| More keys than rotation policy permits | Reject or alert | Seed oversized ring |
| Old key never retired | Alert on age or active-key count | Evaluate configuration metadata |

Configuration validation should happen before serving traffic when possible. A webhook endpoint that starts successfully with zero usable keys creates a dangerous availability failure, while falling back to unsigned acceptance creates a security failure.

## Preserve the raw body through the HTTP framework

The signature covers bytes, not the parsed JSON object. Whitespace, property order, Unicode encoding, and final newlines can change bytes while representing equivalent JSON. If middleware parses and reserializes the body before verification, valid signatures can fail.

An integration test must send the exact buffer used for signing. A finite API route is a good fit for the patterns in the [Supertest Node API testing guide](/blog/supertest-node-api-testing-complete-guide), with framework-specific raw-body configuration verified against official documentation.

\`\`\`ts
import express from 'express';
import { verifyWebhook } from './verify-webhook';

export function createWebhookApp(dependencies: {
  activeKeys: () => Array<{ id: string; secret: string }>;
  nowSeconds: () => number;
  handle: (payload: unknown, deliveryId: string) => Promise<void>;
}) {
  const app = express();

  app.post('/webhooks/builds', express.raw({ type: 'application/json' }), async (req, res) => {
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      res.status(500).json({ code: 'RAW_BODY_UNAVAILABLE' });
      return;
    }

    const result = verifyWebhook({
      rawBody,
      signatureHex: String(req.header('x-example-signature') ?? ''),
      timestampText: String(req.header('x-example-timestamp') ?? ''),
      activeKeys: dependencies.activeKeys(),
      nowSeconds: dependencies.nowSeconds(),
      toleranceSeconds: 300,
    });

    if (!result.ok) {
      res.status(401).json({ code: 'INVALID_WEBHOOK' });
      return;
    }

    await dependencies.handle(
      JSON.parse(rawBody.toString('utf8')),
      String(req.header('x-example-delivery') ?? ''),
    );
    res.status(204).end();
  });
  return app;
}
\`\`\`

The example uses generic \`x-example-*\` headers belonging to this sample protocol. Replace them with documented provider headers. Keep failure responses deliberately uninformative to an attacker while recording a more specific internal reason through safe metrics.

Test byte sensitivity with semantically identical bodies:

\`\`\`ts
import request from 'supertest';
import { expect, it, vi } from 'vitest';

it('verifies the exact bytes received by the route', async () => {
  const handle = vi.fn().mockResolvedValue(undefined);
  const app = createWebhookApp({
    activeKeys: () => [{ id: 'new', secret: 'new-test-secret' }],
    nowSeconds: () => 1_800_000_000,
    handle,
  });
  const signedBody = Buffer.from('{"a":1, "b":2}');
  const alteredBody = Buffer.from('{"a":1,"b":2}');
  const headers = signWebhook(
    signedBody,
    'new-test-secret',
    1_800_000_000,
    'delivery-raw-1',
  );

  await request(app)
    .post('/webhooks/builds')
    .set('content-type', 'application/json')
    .set('x-example-signature', headers.signature)
    .set('x-example-timestamp', headers.timestamp)
    .set('x-example-delivery', headers.deliveryId)
    .send(alteredBody)
    .expect(401);

  expect(handle).not.toHaveBeenCalled();
});
\`\`\`

Also send the signed body and expect success. Include non-ASCII characters and a trailing newline in separate fixtures. These are not exotic: real JSON payloads contain names, addresses, commit messages, and formatted content.

## Separate signature freshness from delivery idempotency

A timestamp tolerance limits how long a captured signed request remains acceptable, but it does not stop repeated requests inside that window. A unique delivery identifier supports deduplication. Treat these as different controls and test them independently.

| Scenario | Signature result | Business handler result |
|---|---|---|
| Fresh, valid, unseen delivery | Accept | Process once |
| Fresh, valid, repeated delivery ID | Accept cryptographically | Skip existing side effect |
| Too old, otherwise valid | Reject | Never called |
| Too far in future, otherwise valid | Reject | Never called |
| Fresh with altered body | Reject | Never called |
| Fresh with valid signature but missing delivery ID | Follow explicit contract, usually reject | Never called |

Use an injected clock rather than fake waiting. Test both sides of the inclusive or exclusive tolerance boundary according to your protocol. If the rule accepts an age of exactly 300 seconds, assert 300 accepted and 301 rejected. Also decide how much future skew is allowed.

\`\`\`ts
it.each([
  { offset: -301, accepted: false },
  { offset: -300, accepted: true },
  { offset: 0, accepted: true },
  { offset: 300, accepted: true },
  { offset: 301, accepted: false },
])('checks timestamp offset $offset', ({ offset, accepted }) => {
  const timestamp = now + offset;
  const headers = signWebhook(rawBody, newKey.secret, timestamp, 'time-case');
  const result = verifyWebhook({
    rawBody,
    signatureHex: headers.signature,
    timestampText: headers.timestamp,
    activeKeys: [newKey],
    nowSeconds: now,
    toleranceSeconds: 300,
  });
  expect(result.ok).toBe(accepted);
});
\`\`\`

For idempotency, place the delivery record and business mutation in one transaction where feasible. A naive “check, then insert” sequence can race when the sender retries concurrently. A unique database constraint on the delivery ID makes the race deterministic. The handler can interpret a conflict as already processed, provided the transaction boundaries preserve the intended side effect.

## Rehearse runtime reload, deployment order, and rollback

Unit tests cannot prove that the deployed service receives new secrets. Add an environment-level rehearsal using the same secret manager and rollout mechanism as production. The exact commands differ by platform, so the test specification should describe observable checkpoints instead of inventing generic CLI flags.

1. Deploy receiver code capable of reading a two-key ring.
2. Add the new secret to the receiver and wait for every instance to report the new safe key label as loaded.
3. Send a synthetic payload signed with the old key and another signed with the new key.
4. Confirm both reach an isolated probe handler once.
5. Switch the controlled sender to the new key.
6. Observe verification counts by key label through the maximum delivery and retry horizon.
7. Remove the old key, confirm new traffic succeeds, and confirm an old-signed probe is rejected.
8. Re-add the old key in a rollback drill, then prove it is usable without exposing its value.

Test mixed-version fleets. During a rolling deployment, some instances may know only the old key while others know both. If load balancing sends a new-signed request to an old instance, delivery fails. Receiver compatibility must be fully deployed before sender cutover.

Health reporting should reveal configuration generation and active safe labels, access-controlled as appropriate. It must never return secrets. A metric such as verification count by \`key_id\` and result supports the retirement decision. Be cautious with high-cardinality labels: delivery IDs do not belong in metric dimensions.

## Diagnose the failures rotation exposes

When valid old signatures fail immediately after adding the new key, first check whether configuration replaced the old value rather than appending a second active entry. Then compare key-ring labels across all instances. If only some requests fail, suspect a mixed fleet or stale process configuration.

When both keys fail, capture the exact test request bytes before parsing, the timestamp text, signature encoding, and signed-message construction. Compare byte lengths and a safe payload hash between sender fixture and receiver. Do not print secret keys. Common causes include JSON reserialization, newline changes, base64 versus hexadecimal confusion, and signing the compressed body on one side but decompressed bytes on the other.

When old-key metrics never reach zero, do not retire blindly. Investigate delayed queues, retries generated before cutover, another sender instance with stale configuration, or a second webhook source sharing the endpoint. Segment by safe sender identity if the contract supplies one.

The hardest failure is a \`2xx\` response followed by a missing business effect. Signature tests alone will not catch swallowed handler errors or asynchronous work that is acknowledged too early. Assert the side effect and idempotency record, not only the response code.

## What people get wrong about dual-secret verification

The dangerous shortcut is \`verify(new) || verify(old)\` with no key identity, no metrics, and no retirement test. It can keep traffic flowing, but nobody knows when the old key stops being used. Temporary compatibility becomes permanent exposure.

Another error is changing the sender first because “the receiver will retry.” Retries do not repair a receiver that still lacks the new key, and repeated rejection can exhaust the provider's delivery schedule. Prepare receivers first.

Some suites mock the verifier at the route boundary. That may be appropriate in business-handler tests, but it cannot validate raw bytes, header parsing, key selection, or time tolerance. Keep a focused set of full verification integration tests. Conversely, do not run real secrets through tests. Dedicated test keys and deterministic fixtures are safer and easier to diagnose.

Finally, contract tests cannot prove key deployment. A [Pact contract testing guide](/blog/contract-testing-pact-complete-guide) can align payload fields and required headers between teams, but secret availability, overlap timing, raw byte preservation, and secret-manager propagation require integration and environment checks.

## Convert the rotation plan into a release gate

A practical gate combines fast code checks with a small number of high-value deployment probes.

| Gate | Must prove | Blocks cutover when |
|---|---|---|
| Crypto unit suite | Fixed vectors, malformed signatures, timestamp boundaries | Any expected vector changes unexpectedly |
| Route integration | Raw bytes, old/new ring, handler isolation, response contract | A valid key fails or invalid request reaches handler |
| Persistence integration | Concurrent duplicate IDs cause one side effect | Duplicate mutation appears |
| Fleet readiness | Every instance has expected configuration generation | Any old-only receiver remains |
| Synthetic delivery | Both keys work through real ingress during overlap | Probe fails or is processed twice |
| Retirement check | Old usage is zero for defined horizon | Old-labeled traffic continues |
| Rollback drill | Previous safe configuration can be restored | Recovery requires untested manual reconstruction |

Store the evidence with the change record: fixture version, safe key labels, deployment generation, probe delivery IDs, verification counts, and timestamps. The evidence should be useful without containing credentials.

An AI coding agent can help produce matrix cases, but give it the exact provider header grammar, signed byte construction, clock rule, and overlap states. Ask it to avoid logging secrets and to prove the handler remains untouched on every rejection path. Cryptographic code deserves human review against official documentation, even when generated tests look comprehensive.

## Frequently Asked Questions

### How long should old and new webhook secrets overlap?

Use the longest credible interval in which a valid old-signed delivery can still arrive. Include sender configuration propagation, queue delay, documented retry behavior, receiver rollout duration, and operational rollback time. Do not choose an arbitrary hour because it feels conservative. Observe verification counts by safe key label and retire only after old usage reaches zero for the defined horizon. If the provider publishes a maximum retry period, incorporate it. For internal senders, measure and document the queue and retry policy so the overlap has an evidence-based end condition.

### Should the verifier try the new secret before the old secret?

Order is usually less important than correctness and observability, provided every active candidate is handled safely. Trying the expected current key first can reduce work after cutover, but a returned safe key label is still needed to measure old-key traffic. Avoid behavior that reveals through responses which key matched. If timing leakage is in scope for your threat model, obtain a dedicated security review of the complete verification path rather than assuming a loop with constant-time digest comparison makes the entire request indistinguishable.

### Can a timestamp header replace delivery-ID deduplication?

No. Timestamp validation rejects requests outside a freshness window, but the same valid signed request can be replayed many times inside that window. A stable delivery ID lets the receiver recognize repeats. Back it with atomic persistence, often a unique constraint combined with the business change in one transaction. Test a concurrent duplicate, not only sequential calls. The exact missing-ID behavior should be part of the webhook contract: a sensitive operation will usually reject it rather than process a request that cannot be made idempotent.

### What should a webhook rotation test log when it fails?

Log safe diagnostic facts: configuration generation, key label attempted or matched, verification reason category, request byte length, a non-secret payload hash when permitted, timestamp age, delivery ID under appropriate data handling, and instance identity. Never log secret values, authorization credentials, or full signatures. Payloads may contain personal or confidential data, so avoid dumping raw bodies. The failure report should make mixed fleets, stale configuration, byte changes, clock skew, and duplicate handling visible while remaining safe to retain in CI and operational systems.
`,
};
