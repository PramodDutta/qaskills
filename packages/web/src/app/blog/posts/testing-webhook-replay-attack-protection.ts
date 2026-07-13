import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Webhook Replay-Attack Protection',
  description:
    'Test webhook replay-attack protection with raw-body signatures, timestamp windows, duplicate-event storage, concurrency checks, and safe key rotation.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing Webhook Replay-Attack Protection

Capture one valid \`payment.succeeded\` request and send the identical bytes again ten minutes later. The HMAC is still mathematically valid because the payload and signature have not changed. Unless the receiver also enforces freshness or single-use delivery, it may issue a second entitlement, email, or ledger entry.

Replay protection is a compound property. Authenticity proves a sender with the secret signed particular bytes. Freshness limits when those bytes are acceptable. Deduplication prevents the same logical event from taking effect twice, including concurrent delivery. Tests must separate those properties because one green signature case cannot establish all three.

## Write down the receiver's acceptance rule

A common signed envelope includes an event ID, Unix timestamp, raw request body, and signature header. The receiver accepts only when the signature matches a trusted key, the timestamp falls within an allowed skew window, and the event ID has not already completed or begun processing according to the idempotency policy.

| Check | Threat addressed | Safe failure response |
|---|---|---|
| Signature over raw bytes and timestamp | Forged or modified payload | Reject without business processing |
| Maximum timestamp age | Captured old request | Reject as stale |
| Limited future skew | Attacker extends validity with future timestamp | Reject as not yet valid |
| Atomic event-ID claim | Repeated logical delivery | Return documented duplicate outcome |
| Idempotent side effect | Crash and redelivery | One durable business result |

Do not assume the provider uses this exact design. Stripe-style, GitHub-style, and custom schemes differ in header grammar, signed content, algorithms, and retry semantics. Implement and test the provider's published specification. The examples here use a deliberately explicit custom protocol so each protection is observable.

## Sign the exact raw request bytes

JSON parsing and reserialization can change whitespace, key order, escaping, and Unicode representation. Verify the signature before parsing, using the raw bytes delivered by the HTTP framework. In this sample protocol, the signed message is \`timestamp + '.' + rawBody\`, and the signature is lowercase hex HMAC-SHA256.

\`\`\`typescript
import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

export function signWebhook(
  secret: string,
  timestampSeconds: number,
  rawBody: Buffer,
): string {
  return createHmac('sha256', secret)
    .update(String(timestampSeconds))
    .update('.')
    .update(rawBody)
    .digest('hex');
}

export function validSignature(expectedHex: string, suppliedHex: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(suppliedHex)) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const supplied = Buffer.from(suppliedHex, 'hex');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
\`\`\`

Length validation must happen before \`timingSafeEqual\`, which throws when buffer lengths differ. Timing-safe comparison reduces information leakage in equality checking, but it does not compensate for weak secrets, verbose error timing elsewhere, or accepting unsigned alternate code paths.

Test byte sensitivity with semantically equivalent JSON. If changing spacing retains validity, the receiver may be signing a normalized object contrary to the protocol.

## Enforce a two-sided timestamp window

An age-only condition such as \`now - timestamp <= 300\` accepts timestamps far in the future because the difference is negative. Calculate signed age and enforce both lower and upper bounds. Inject the clock so boundary tests are deterministic.

\`\`\`typescript
export function isFresh(
  timestampSeconds: number,
  nowSeconds: number,
  toleranceSeconds: number,
): boolean {
  if (!Number.isSafeInteger(timestampSeconds)) return false;
  const age = nowSeconds - timestampSeconds;
  return age >= -toleranceSeconds && age <= toleranceSeconds;
}
\`\`\`

Some protocols allow different past age and future clock skew. Represent those separately if required. Do not use local formatted timestamps, and do not test by waiting five real minutes. Pass an injected \`nowSeconds\` to the verifier and exercise exact boundaries.

| Timestamp relative to now | Expected with 300-second tolerance | Purpose |
|---|---|---|
| \`now\` | Accept | Current delivery |
| \`now - 300\` | Accept if boundary is inclusive | Oldest allowed instant |
| \`now - 301\` | Reject | Stale replay |
| \`now + 300\` | Accept if skew policy is inclusive | Fast sender clock |
| \`now + 301\` | Reject | Future-dated extension |
| Non-integer or missing | Reject | Ambiguous signed envelope |

Clock skew is operational, not a reason to choose a huge window. Monitor NTP health on receiver hosts and provider guidance. A larger window gives captured requests more time to be replayed before freshness alone stops them.

## Exercise the verifier as a pure boundary

Separate cryptographic verification from HTTP and business processing. A pure verifier is easy to test against tampering, malformed headers, key rotation, and time boundaries.

\`\`\`typescript
type Verification =
  | { ok: true; keyId: string }
  | { ok: false; reason: 'malformed' | 'stale' | 'bad-signature' };

type CandidateKey = { id: string; secret: string };

export function verifyWebhook(input: {
  rawBody: Buffer;
  timestampHeader: string | undefined;
  signatureHeader: string | undefined;
  nowSeconds: number;
  toleranceSeconds: number;
  keys: CandidateKey[];
}): Verification {
  if (!input.timestampHeader || !input.signatureHeader) {
    return { ok: false, reason: 'malformed' };
  }
  if (!/^\\d+$/.test(input.timestampHeader)) {
    return { ok: false, reason: 'malformed' };
  }
  const timestamp = Number(input.timestampHeader);
  if (!isFresh(timestamp, input.nowSeconds, input.toleranceSeconds)) {
    return { ok: false, reason: 'stale' };
  }

  for (const key of input.keys) {
    const expected = signWebhook(key.secret, timestamp, input.rawBody);
    if (validSignature(expected, input.signatureHeader)) {
      return { ok: true, keyId: key.id };
    }
  }
  return { ok: false, reason: 'bad-signature' };
}
\`\`\`

Checking freshness before HMAC reduces unnecessary computation, but public error responses should not reveal enough detail to help an attacker refine input. Internal metrics can distinguish malformed, stale, and invalid signatures. Keep the external response consistent with the provider's retry contract.

## Test tampering one component at a time

Generate a valid fixture with the production signing helper or an independent reference implementation, then mutate exactly one field. Reusing the production signer for all expected signatures risks reproducing the same bug, so retain at least one fixed test vector whose raw bytes, timestamp, secret, and expected digest were independently checked.

\`\`\`typescript
import { describe, expect, it } from 'vitest';

const secret = 'test-secret-not-used-outside-tests';
const now = 1_800_000_000;
const raw = Buffer.from('{"id":"evt_42","type":"payment.succeeded"}');

function validInput() {
  return {
    rawBody: raw,
    timestampHeader: String(now),
    signatureHeader: signWebhook(secret, now, raw),
    nowSeconds: now,
    toleranceSeconds: 300,
    keys: [{ id: 'current', secret }],
  };
}

describe('verifyWebhook', () => {
  it('rejects a captured request outside the freshness window', () => {
    expect(
      verifyWebhook({ ...validInput(), nowSeconds: now + 301 }),
    ).toEqual({ ok: false, reason: 'stale' });
  });

  it('rejects body tampering with the original signature', () => {
    const input = validInput();
    input.rawBody = Buffer.from(
      '{"id":"evt_42","type":"refund.succeeded"}',
    );
    expect(verifyWebhook(input)).toEqual({
      ok: false,
      reason: 'bad-signature',
    });
  });

  it('rejects a timestamp moved into the future', () => {
    const input = validInput();
    input.timestampHeader = String(now + 301);
    expect(verifyWebhook(input)).toEqual({ ok: false, reason: 'stale' });
  });
});
\`\`\`

Notice that changing the timestamp without recomputing the signature could fail for two reasons. The future test intentionally exceeds freshness, while a separate in-window timestamp mutation should expect \`bad-signature\` to prove the timestamp participates in signed content.

## Claim event IDs atomically

Timestamp validation limits replay time but still permits repeated delivery inside the window. Providers also legitimately retry when acknowledgments are lost. Store the provider event ID in a database with a unique constraint and make the claim atomic. A read-then-insert sequence is vulnerable:

1. Request A queries and sees no row.
2. Request B queries and sees no row.
3. Both execute the side effect.
4. Both insert or one insert fails too late.

Use an insert-on-conflict operation or transaction designed around the business effect. The event record and side effect need a crash-recovery policy. If the receiver marks an event complete before changing business state, a crash can lose the event. If it performs the effect then marks complete, a crash can cause redelivery to repeat a non-idempotent effect.

| Storage state | Meaning | Redelivery decision |
|---|---|---|
| No row | Never claimed | Attempt atomic claim |
| Processing with active lease | Another worker owns it | Return/queue according to policy |
| Processing with expired lease | Worker may have crashed | Recover with idempotent operation |
| Completed | Business effect committed | Acknowledge duplicate, do not repeat |
| Failed retryable | Controlled failure | Retry under bounded policy |

The exact schema depends on the system. Test the guarantees, especially uniqueness and recovery, rather than assuming a \`processed_webhooks\` table automatically creates idempotency.

## Race two identical deliveries

A sequential duplicate test is necessary but insufficient. Send the same valid request concurrently and widen the critical section in a test environment so both handlers overlap. Assert one durable side effect, one event record, and documented HTTP responses.

\`\`\`typescript
it('applies one credit for two concurrent deliveries', async () => {
  const body = Buffer.from(
    JSON.stringify({ id: 'evt_race_7', type: 'credit.approved', amount: 25 }),
  );
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhook(process.env.WEBHOOK_TEST_SECRET!, timestamp, body);
  const headers = {
    'content-type': 'application/json',
    'x-webhook-timestamp': String(timestamp),
    'x-webhook-signature': signature,
  };

  const [first, second] = await Promise.all([
    fetch(\`\${baseUrl}/webhooks/provider\`, {
      method: 'POST', headers, body,
    }),
    fetch(\`\${baseUrl}/webhooks/provider\`, {
      method: 'POST', headers, body,
    }),
  ]);

  expect([first.status, second.status].sort()).toEqual([200, 200]);
  expect(await countCreditsForEvent('evt_race_7')).toBe(1);
  expect(await countWebhookRecords('evt_race_7')).toBe(1);
});
\`\`\`

If the API returns a different success code for duplicates, assert that contract instead. HTTP \`409\` can cause some providers to retry forever, so duplicate responses should align with sender behavior. The decisive assertion is one business outcome, not two green responses.

## Test parsing after verification

Authentication must precede JSON parsing into trusted event types and business dispatch. The HTTP framework must expose the raw body without also consuming it through a global JSON middleware. Add an integration test that uses whitespace and Unicode escapes to prove the endpoint verifies received bytes, then parses those same bytes once.

Reject oversized payloads before retaining them in memory according to a documented limit, but ensure the limit path cannot invoke business logic. Validate content type, event schema, event type, identifiers, and numeric ranges after authenticity succeeds. A valid signature means trusted origin, not valid business content.

For end-to-end delivery mechanics, local receivers, retries, and provider test consoles, use the [complete webhook testing guide](/blog/webhook-testing-complete-guide-2026). Replay tests add the adversarial dimension to those functional checks.

## Rotate secrets without opening a bypass

During rotation, receivers may accept current and previous keys for a bounded overlap. Test a request signed by each active key, an unknown key, and the retired key after overlap. If signatures carry key IDs, reject unknown IDs instead of trying every secret. If they do not, record internally which key matched.

Never accept an unsigned request because a key lookup failed. Configuration errors should fail closed and alert. Test an empty key list, duplicated configuration, malformed secret encoding, and rotation rollback. Keep secret material out of assertion messages.

| Rotation phase | Accepted keys | Required test |
|---|---|---|
| Before change | Old only | New signature rejected |
| Overlap | Old and new | Both accepted, unknown rejected |
| After provider cutover | New, temporarily old | Metrics show old-key traffic declining |
| Retirement | New only | Old signature rejected even when fresh |

## Observe attacks without leaking verification material

Count invalid signature, stale timestamp, malformed header, duplicate, and concurrent-claim outcomes. Alert on unusual rates by source and provider, while recognizing source IP may belong to shared infrastructure. Store event IDs and key IDs where allowed, never raw secrets or full sensitive payloads.

Keep external error bodies generic. Detailed internal logs should be access-controlled and bounded. Signature headers can be authentication material and should be redacted from reverse-proxy and application logs.

Include replay cases in the broader [API security testing checklist](/blog/api-security-testing-checklist-2026): TLS, authorization on management endpoints, secret storage, payload limits, dependency security, and audit retention remain separate controls.

## Verify failure ordering

An invalid request should produce no business side effect regardless of which validation fails. Use spies or database checks to prove a stale but correctly signed event never reaches the dispatcher, a fresh but badly signed event never claims an ID, and an authenticated duplicate never repeats the effect.

The recommended order is generally: enforce transport/body limits, parse signature envelope, validate timestamp, verify signature, parse and validate event JSON, atomically claim event ID, perform an idempotent business operation, commit completion, and acknowledge. Provider requirements may adjust acknowledgment behavior, but authentication must not occur after business dispatch.

Fault injection is valuable between claim, effect, and completion. Terminate the worker after each boundary, redeliver, and verify the recovery protocol. Replay safety is proven under crashes and concurrency, not only under two tidy sequential requests.

## Distinguish event identity from payload identity

Deduplicate on the provider's stable event identifier when the specification guarantees one. A hash of the raw body is not equivalent: providers can redeliver semantically identical JSON with different whitespace, or issue a new event ID for a later legitimate occurrence with the same values. Conversely, two different event IDs may refer to an update that business logic must handle idempotently by its own resource version.

Validate the event ID format and scope. If two provider accounts can emit the same identifier, make the unique key a tuple of provider account and event ID. If multiple webhook endpoints share storage, include the provider namespace. The database constraint must match the actual uniqueness guarantee.

Payload hashes are still useful for audit diagnostics. If a repeated event ID arrives with a different authenticated payload, quarantine it and alert instead of treating it as an ordinary duplicate. That condition may indicate provider behavior change, a routing error, or an attempted collision.

## Test delivery across regions and replicas

A receiver deployed in several regions cannot rely on process memory for nonce or event tracking. Send the same event to two instances concurrently and verify the shared durable claim permits one effect. If the deduplication store is eventually consistent, its conflict semantics may be too weak for this control.

Simulate delayed replication where the database supports it, or test through the production topology in an isolated environment. Sticky routing can hide the race by sending both attempts to one worker. Explicitly target distinct instances or regions while keeping the signed request identical.

Regional failover also exercises clocks and key distribution. One region with an old secret set or skewed clock can reject legitimate deliveries, while an instance missing the retired-key deadline can extend replay acceptance. Configuration and time health belong in deployment verification.

## Fuzz the signature envelope parser

Before HMAC comparison, the endpoint parses attacker-controlled headers. Add cases for duplicate signature fields, extra delimiters, empty values, uppercase hex, odd-length hex, huge timestamps, negative timestamps, whitespace, and repeated HTTP headers. Expected behavior must follow the provider grammar and fail closed on ambiguity.

Bound header length before expensive parsing. Ensure malformed input produces a controlled response rather than an exception stack or process crash. Property-based generation is useful here because the parser has a small input surface and a strong invariant: no malformed envelope can reach the business dispatcher.

Keep parser fuzzing separate from cryptographic test vectors. Fuzzing explores robustness, while fixed vectors prove algorithm interoperability. Both should invoke the same production verification boundary.

## Frequently Asked Questions

### Is timestamp validation enough to stop webhook replays?

No. It rejects captured requests outside the window, but an attacker or normal retry can resend within the window. Use an atomic event-ID or idempotency-key claim and make the business operation safe under crash recovery.

### Should a duplicate webhook return an error status?

Usually the receiver should acknowledge an already completed valid event so the provider stops retrying, but follow the provider's documented contract. Whatever status you choose, the business effect must not run twice.

### Why must signature verification use the raw body?

The sender signed a byte sequence. Parsing and serializing JSON can change whitespace, property order, escapes, or number representation. Verify the received bytes first, then parse the authenticated content.

### How large should the allowed timestamp tolerance be?

Follow provider guidance and measured clock/network behavior, then choose the smallest operationally safe window. Test both old and future boundaries. Maintain host clock synchronization instead of compensating with an unnecessarily long replay window.

### How do I test replay safety during a handler crash?

Inject failure after the event claim and after the business effect, then redeliver the identical signed event. Assert the recovery lease or transaction resumes safely and only one durable outcome exists. This exposes gaps that sequential duplicate tests cannot find.
`,
};
