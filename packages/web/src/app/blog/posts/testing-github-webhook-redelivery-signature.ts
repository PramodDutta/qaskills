import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing GitHub Webhook Redelivery and Signatures',
  description:
    'Test GitHub webhook redelivery and signatures with raw-body HMAC verification, stable delivery IDs, idempotent processing, and replay scenarios.',
  date: '2026-07-13',
  category: 'API Testing',
  content: `
# Testing GitHub Webhook Redelivery and Signatures

The second POST is byte-for-byte valid and carries the same \`X-GitHub-Delivery\` GUID as the first. Your endpoint must authenticate it, acknowledge it, and avoid opening a second ticket. That combination is the central redelivery test: cryptographic validity does not imply business uniqueness.

GitHub signs the raw request payload with the webhook secret and places an HMAC-SHA256 hex digest in \`X-Hub-Signature-256\`, prefixed by \`sha256=\`. A requested redelivery retains the original delivery identifier. A robust consumer therefore has two separate gates: signature verification for authenticity and delivery-ID deduplication for idempotency.

## Preserve the exact bytes GitHub signed

HMAC operates on bytes, not on the parsed meaning of JSON. Parsing and then serializing a payload can change whitespace, property order, escaping, or Unicode representation. Verify the body before parsing it. Framework configuration must expose a raw buffer or the original text without mutation.

| Input | Security meaning | Test requirement |
| --- | --- | --- |
| Raw body bytes | Message that was signed | Feed unchanged bytes to HMAC |
| \`X-Hub-Signature-256\` | Claimed SHA-256 signature | Require prefix, valid hex, correct length |
| Webhook secret | Shared authentication key | Inject from test environment, never log |
| \`X-GitHub-Delivery\` | Event delivery GUID | Use as durable idempotency key |
| \`X-GitHub-Event\` | Event family | Dispatch only accepted event types |
| Payload \`action\` | Event-specific transition | Validate before processing |

Use a constant-time comparison. In Node.js, \`crypto.timingSafeEqual()\` requires buffers of equal length, so validate length before calling it. Reject a missing or malformed header without comparing strings with \`===\`.

## Implement a verifier with explicit failure modes

The verifier below accepts a \`Buffer\` and a header. It rejects formatting errors, computes the expected HMAC, and compares digest bytes. The public endpoint can map every false result to 401 or 403 without revealing which check failed.

\`\`\`typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyGitHubSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const receivedHex = signatureHeader.slice('sha256='.length);
  if (!/^[a-f0-9]{64}$/i.test(receivedHex)) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(receivedHex, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function signForTest(rawBody: Buffer, secret: string): string {
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  return \`sha256=\${digest}\`;
}
\`\`\`

Unit-test this function with GitHub's published test vector as well as locally signed JSON. The published secret \`It's a Secret to Everybody\` and payload \`Hello, World!\` yield the documented SHA-256 digest. That vector catches encoding and prefix mistakes without depending on your helper to test itself.

Negative cases matter more than another happy payload: missing header, \`sha1=\` prefix, short hex, non-hex input, correct signature for a different body, wrong secret, and a single-byte payload modification. Unicode payloads should be encoded as UTF-8 exactly once.

## Exercise the HTTP boundary with raw payloads

A verifier unit test cannot detect middleware that already parsed the body. Add an endpoint-level test that sends an exact string and signature. With Fastify, a raw-body plugin or content-type parser must be configured according to the application. Express commonly uses \`express.raw()\` for the webhook route before JSON parsing. The framework choice is less important than proving that the verifier receives unchanged bytes.

The following Vitest example uses an abstract \`buildApp()\` Fastify application with \`inject()\`, a real Fastify API. The application's route is expected to verify the raw body and enqueue accepted events.

\`\`\`typescript
import { describe, expect, test } from 'vitest';
import { buildApp } from '../src/app';
import { signForTest } from '../src/github-signature';

describe('GitHub webhook authentication', () => {
  test('accepts an unchanged UTF-8 payload', async () => {
    const secret = 'test-only-secret';
    const app = buildApp({ webhookSecret: secret });
    const payload = JSON.stringify({
      action: 'opened',
      issue: { id: 17, title: 'Überprüfung' },
    });
    const rawBody = Buffer.from(payload, 'utf8');

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload,
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'issues',
        'x-github-delivery': 'delivery-17',
        'x-hub-signature-256': signForTest(rawBody, secret),
      },
    });

    expect(response.statusCode).toBe(202);
    await app.close();
  });

  test('rejects a body changed after signing', async () => {
    const secret = 'test-only-secret';
    const app = buildApp({ webhookSecret: secret });
    const signed = Buffer.from('{"action":"opened"}');

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/github',
      payload: '{"action":"closed"}',
      headers: {
        'content-type': 'application/json',
        'x-github-event': 'issues',
        'x-github-delivery': 'delivery-tampered',
        'x-hub-signature-256': signForTest(signed, secret),
      },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
\`\`\`

If the HTTP test signs \`JSON.stringify(object)\` and then asks a client library to serialize the object again, it may accidentally sign different bytes. Build the payload string once and use it both for signing and transport.

## Model redelivery as idempotency, not rejection

GitHub redelivery is legitimate. The signature remains valid, and the delivery GUID is the same as the original. Returning 401 because an ID was seen before confuses authentication with duplication. A typical endpoint returns a success-family response and skips duplicate business processing.

Store the delivery identifier in durable storage with a unique constraint. A check followed by insert is racy: two concurrent copies can both observe absence. Instead, claim the ID atomically. In PostgreSQL, insert the GUID into a deliveries table with \`ON CONFLICT DO NOTHING\` and inspect whether a row was inserted. Process only the winner.

| First delivery state | Redelivery action | Desired result |
| --- | --- | --- |
| Never received | Verify, claim, enqueue | One business action |
| Already completed | Verify, detect duplicate | Acknowledge, no second action |
| Currently processing | Detect existing claim | Acknowledge or report accepted |
| Previous processing failed | Policy dependent | Resume safely or create controlled retry |
| Signature invalid | Do not inspect dedupe outcome | Reject without business action |

The failed-processing row needs a designed state model. Permanently treating every claimed ID as complete can lose work after a crash. Deleting the claim immediately can permit repeated side effects. One design records \`received\`, \`processing\`, \`completed\`, and \`failed\` with an outbox transaction. Another makes every downstream operation idempotent under the same GUID. Choose according to the cost of duplication and the transactional boundaries available.

## Test concurrent duplicates, not only sequential ones

Two sequential POSTs prove the basic lookup path. They do not prove atomicity. Send two valid requests with the same GUID concurrently and assert one domain record, one queued message, or one external client call. Repeat the test against the real database used for deduplication.

A useful integration fixture clears only its unique test IDs, not the entire deliveries table. Give every test a generated GUID. Hold downstream processing behind a barrier if necessary so both requests contend while the first is still in progress. This reproduces the race that a check-then-insert implementation misses.

Also send identical payloads under different GUIDs. They represent distinct deliveries from the idempotency layer's perspective and should usually both be accepted. Deduplicating on payload hash can collapse legitimate repeated events, such as two label changes that serialize identically. GitHub gives the consumer a delivery key, so use it.

The [complete webhook testing guide](/blog/webhook-testing-complete-guide-2026) discusses queue boundaries, callbacks, retry timing, and observability across providers. GitHub's stable redelivery GUID is a provider-specific contract that deserves its own assertion.

## Verify event and action dispatch after authentication

A valid signature says GitHub knew the secret and the body was not changed. It does not say your application understands the event. Read \`X-GitHub-Event\` and the payload's top-level \`action\` after verification. Reject or harmlessly ignore unsupported combinations according to an explicit policy.

Do not dispatch solely on a payload field that an attacker can submit without a valid signature. Conversely, do not parse a large body and perform expensive schema validation before authentication. A sensible order is size limit, raw-body capture, signature validation, basic header validation, JSON parsing, event schema validation, idempotency claim, then enqueue.

Ping events require a dedicated fixture because their payload shape differs from issues or pull requests. Installation events vary from repository events. Validate only the subset your handler needs while tolerating additional documented fields. GitHub can add fields without breaking compatibility.

## Simulate operational redelivery through GitHub

Local signed requests validate your consumer. A staging exercise through GitHub validates TLS, DNS, webhook configuration, secret agreement, ingress, and response timing. Trigger a harmless event, locate its delivery in the webhook settings or delivery API, record the GUID, and request redelivery. Confirm the second request has the same \`X-GitHub-Delivery\` value and that domain effects remain singular.

GitHub does not automatically redeliver every failed webhook. Operational automation can list failed deliveries and request redelivery with appropriately scoped credentials. Do not use this production capability as the routine test runner: it is slower, affects external state, and requires privileged tokens. Keep deterministic HMAC and idempotency tests local, then run a controlled staging smoke test periodically.

Respond promptly and queue longer work. GitHub recommends returning a successful response within ten seconds. A test should prove that the endpoint acknowledges after durable acceptance, not after an email, issue synchronization, or analytics workflow completes.

## Keep signature tests security-relevant

Rotate secrets by supporting an intentional transition policy. If the receiver temporarily accepts old and new secrets, test both and remove old acceptance on schedule. Never fetch a secret based on untrusted payload data before authentication unless a trusted hook identifier maps to a tenant.

The [API security testing checklist](/blog/api-security-testing-checklist-2026) complements HMAC coverage with request-size limits, rate controls, secret handling, logging, and authorization. For webhook-specific tests, ensure logs never contain the secret or full sensitive payload, and metrics distinguish invalid signatures from duplicate deliveries without exposing header values.

IP allow lists are defense in depth, not a replacement for signatures. GitHub's address ranges can change and proxies affect the source address observed by the application. Test the cryptographic boundary regardless of network controls.

## A practical verification matrix

Build a matrix with orthogonal dimensions instead of dozens of nearly identical happy cases. Signature can be valid, missing, malformed, or wrong. Delivery ID can be new, completed, in progress, or absent. Event can be supported or unsupported. Body can be valid JSON, oversized, or invalid. Select pairwise combinations plus security-critical intersections.

Always include valid signature plus duplicate GUID, invalid signature plus previously seen GUID, valid signature plus malformed JSON, and concurrent valid duplicates. The invalid-signature duplicate proves the endpoint does not reveal dedupe state to unauthenticated callers. The malformed JSON case proves authentication can succeed while parsing correctly fails later.

Assert observable outcomes at each boundary: response status, queue count, delivery ledger state, domain side effects, and sanitized log event. Avoid asserting internal call order unless it represents the security contract. With those tests, redelivery becomes an ordinary, measurable input rather than a production surprise.

## Test secret rotation without accepting arbitrary keys

Secret rotation creates a short interval where deliveries signed with either the retiring or replacement secret may be in flight. If the receiver supports dual verification, compute against both configured secrets and accept when either matches. Do not reveal which secret matched in the HTTP response, and remove the retiring value after the operational window.

Tests should sign one payload with each configured secret, reject a third secret, and confirm both accepted copies still deduplicate on the delivery GUID. If verification tries keys sequentially, timing differences can theoretically reveal which slot matched. For most webhook threat models, the greater practical risks are leaked secrets, unbounded key lists, and verbose logs, but document the decision.

Tenant-specific hooks need a trusted way to select secrets. A route segment or GitHub hook target ID can select a stored configuration before payload authentication, provided the lookup cannot expose secrets and unknown IDs fail closed. Never accept a secret identifier from the JSON body and treat that body as trusted before verification.

## Protect the delivery ledger under retention pressure

Deduplication is only as durable as ledger retention. Deleting GUIDs after one hour permits an older captured request to be accepted again. Keeping every GUID forever has storage cost. Choose retention from the realistic redelivery and replay window, business impact, and audit requirements, then test expiry explicitly.

A compact ledger needs the GUID, tenant or hook scope, receipt time, processing state, and perhaps a payload digest for diagnostics. It does not need the full webhook body when a secure event store or queue already owns it. Index state and timestamps used by recovery jobs, and enforce the uniqueness key in the database.

Test cleanup with a clock you control or timestamps inserted by the fixture. Verify completed entries beyond policy are removed, active or failed entries required for recovery remain, and a redelivery inside retention is suppressed. Treat retention values as configuration with review, not a magic constant hidden in SQL.

## Separate acknowledgement from downstream completion

The endpoint should durably accept an authenticated, new delivery and respond without waiting for every domain integration. A database transaction can claim the GUID and write an outbox record atomically. A worker then handles the event, marking completion or retryable failure. This prevents a crash between dedupe insertion and queue publication from losing the event.

Integration tests can stop the worker, POST the webhook, assert the 202 response and outbox row, then start processing and verify one side effect. Redeliver before processing and after completion. Both should leave a single outbox event. Simulate a worker failure and confirm its retry uses the same event identity rather than creating a new business command.

If the architecture uses an external queue without a database transaction, document the failure window and make the consumer idempotent too. Exactly-once delivery is rarely an end-to-end guarantee; idempotent effects and observable retries are the practical objective.

## Audit responses and logs for information leaks

Return a generic authentication failure for missing, malformed, and incorrect signatures. Do not tell callers that a delivery GUID already exists unless they are authenticated. Rate-limit repeated invalid attempts at the ingress layer without making a temporary limiter outage bypass verification.

Structured logs can contain event name, redacted delivery GUID, processing state, and internal correlation ID. Avoid signature values, secrets, authorization headers, and full payloads. In tests, capture logs and assert sensitive test strings are absent. This is especially important because CI artifacts often outlive ephemeral test databases.

## Verify content type and delivery size behavior

GitHub can deliver JSON with \`application/json\`, while webhook configuration may also use form encoding in some integrations. Support only the content types your endpoint declares. A correctly signed but unsupported representation should fail after signature verification with an appropriate client error, not be interpreted through a permissive parser.

Set a body-size limit before allocating an unbounded buffer, but ensure the framework does not transform accepted bytes. Test just below and just above the configured limit with locally generated signatures. The oversized case should not enter deduplication or queue processing, and logs should state size policy without dumping content.

Proxies may decompress, normalize, or reject requests before application code. A staging delivery confirms the whole ingress path preserves the signed representation. If an API gateway verifies HMAC instead of the app, test its raw-body rules and securely forward an authenticated internal assertion that clients cannot spoof.

Health checks and unrelated POST endpoints should not share the webhook raw parser accidentally. Scope middleware to the route so ordinary JSON APIs keep their normal validation and error handling.

## Frequently Asked Questions

### Does GitHub generate a new delivery ID for a manual redelivery?

No. GitHub documents that a requested redelivery retains the original \`X-GitHub-Delivery\` value. That stability lets receivers identify and suppress duplicate processing.

### Can I verify a signature after JSON parsing?

Only if the framework also preserved the exact original bytes and you verify those. Re-serializing a parsed object can produce different bytes and therefore a different HMAC.

### Should a duplicate delivery return an error status?

Usually it should return a success-family acknowledgement after valid authentication. Redelivery is legitimate, and an error can encourage more operational retry while the event has already been handled.

### What key should the deduplication table use?

Use the \`X-GitHub-Delivery\` GUID, optionally scoped by webhook installation or tenant if your architecture requires it. Enforce uniqueness atomically in durable storage.

### Is a valid HMAC enough to prevent replay attacks?

It proves authenticity and integrity, not freshness. Record delivery GUIDs and make processing idempotent. If your threat model requires a time window, add a trusted receipt timestamp policy without assuming payload timestamps are request timestamps.
`,
};
