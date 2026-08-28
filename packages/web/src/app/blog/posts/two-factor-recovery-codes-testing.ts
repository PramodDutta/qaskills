import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing 2FA Recovery Codes: Generation, Single-Use, and Regeneration',
  description: 'QA guide to 2FA recovery codes testing: generation entropy, single-use races, regeneration invalidation, hash-at-rest fixtures, and lockout audit checks.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing 2FA Recovery Codes: Generation, Single-Use, and Regeneration

2FA recovery codes testing covers three contracts that keep backup authentication safe when a user loses their authenticator. Generation tests prove codes are high-entropy, correctly formatted, issued in the expected count, and shown once. Single-use tests prove a successful consume marks that code spent and rejects reuse, including under concurrent requests. Regeneration tests prove a new set invalidates every unused code from the previous set, while audit, rate-limit, and lockout checks confirm failed attempts do not become an offline brute-force path.

Recovery codes sit beside TOTP apps and hardware keys as the break-glass path. When they fail quietly, support tickets turn into account lockouts, and when they fail loudly, attackers get a second login channel that looks legitimate. QA owns the difference.

## A Failure Story and What People Get Wrong

A SaaS team shipped recovery codes as printable plaintext rows in the user table. The first automated test only asserted that ten strings appeared after enablement. Staging looked fine. Production looked fine until a support agent regenerated codes for a locked-out customer, then the customer still logged in with a code from the old PDF. The old set had never been revoked. A later incident review found another gap: two parallel recovery attempts with the same code both returned 200 because the consume path was a read-then-update without a conditional write.

What people get wrong is treating recovery codes like decorative backup text. Teams screenshot the UI, store plaintext in fixtures, skip concurrent consume tests, and forget that regeneration is a security event, not a convenience refresh. Another common miss is logging the plaintext code in CI when a fixture helper prints the seed for debugging. Once that log lands in an artifact store, the secret is no longer a test secret.

If your suite already covers [OTP SMS and phone verification flows](/blog/testing-otp-sms-phone-flows-complete-guide), reuse the discipline around one-time consumption and rate limits, but do not copy SMS assumptions. Recovery codes are offline, long-lived until used or rotated, and usually presented as a set rather than a single challenge.

## What a Recovery Code Contract Must Guarantee

Write the product contract before you write assertions. Without a contract, every engineer invents a slightly different meaning of "used," "revoked," and "displayed."

| Contract Area | Expected Behavior | QA Evidence |
|---|---|---|
| Generation | Cryptographically strong random codes, fixed format, fixed count | Format regex, uniqueness within set, entropy source not Math.random |
| Display-once | Plaintext shown only at issue or regenerate time | Follow-up GET returns metadata only, never full plaintext set |
| Hash-at-rest | Only digests and metadata persist | DB row has hash, salt or pepper config, no plaintext column |
| Single-use | First valid consume wins, later attempts fail | Status after success, reuse rejected, concurrent losers rejected |
| Regeneration | New set replaces prior unused codes | Old unused codes fail, new codes work, audit records rotate |
| Abuse controls | Failed attempts throttle or lock | Attempt counters, lockout window, safe error copy |

Keep the contract in the repo next to the feature. Agents and humans both regress when the rules live only in a product manager's memory.

## Generation Entropy, Format, Count, and Display-Once

Generation is the first place weak implementations hide. A recovery code that looks random in the UI can still be short, sequential, or derived from a predictable seed. Your tests should separate presentation from cryptographic quality.

Typical product choices are eight to twelve codes per set, each code 8 to 16 characters from a clear alphabet, often grouped for readability (for example \`AAAA-BBBB\`). Readable alphabets usually drop ambiguous characters such as O, 0, I, and 1. That is fine if the alphabet size and length still yield enough bits. QA should assert the format the product chose, not invent a different one.

\`\`\`typescript
import { createHash, randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 10;
const CODES_PER_SET = 10;

function generateRecoveryCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return \`\${out.slice(0, 5)}-\${out.slice(5)}\`;
}

function generateRecoverySet(): string[] {
  const set = new Set<string>();
  while (set.size < CODES_PER_SET) {
    set.add(generateRecoveryCode());
  }
  return [...set];
}

const sample = generateRecoverySet();
console.log(sample.length);
console.log(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/.test(sample[0]!));
\`\`\`

That sample is a teaching sketch using Node's \`crypto.randomBytes\`. Production may wrap codes, add a version prefix, or use a KDF before storage. Your automation should call the real generator through a test hook or service boundary, then assert:

1. Count equals the policy count.
2. Every code matches the published format.
3. Codes are unique within the set.
4. Two consecutive generations for different users do not collide in any practical sample you keep in CI.
5. The plaintext response is available only on the create or regenerate response.

Display-once is a product rule with a security purpose. After the user leaves the download or modal, the API should expose remaining count and maybe last-generated timestamp, not the unused plaintext codes. A second "view codes" endpoint that re-prints plaintext is a design smell unless it is gated by step-up auth and still audited as a reveal event.

| Check | Passing Signal | Failure Signal |
|---|---|---|
| Entropy source | OS CSPRNG or equivalent | \`Math.random\`, time-based seeds, sequential counters |
| Format | Stable regex across locales | Soft hyphenation or locale-altered glyphs |
| Count | Exactly N codes | Missing codes padded with blanks in UI only |
| Display-once | Create response has plaintext; later reads do not | Settings page can reprint full unused set forever |
| Download | One-time file or copy action audited | Unlimited reprint without step-up |

Avoid asserting exact random values. Assert properties. Property tests keep CI stable while still catching weak generators.

## Hash-at-Rest Storage and Secret-Safe Test Fixtures

Never store recovery codes in plaintext. Treat them like passwords: hash with a slow or keyed digest appropriate to your threat model, compare in constant time, and keep only the hash plus metadata such as set id, created_at, consumed_at, and revoked_at.

A practical pattern is \`HMAC-SHA256(pepper, normalize(code))\` or a password hash with a unique salt per code. Pepper belongs in a secrets manager, not in the repository. Salts can live beside the hash row. QA does not need to re-litigate cryptography research; QA needs to prove the database never retains the printable string.

\`\`\`javascript
const crypto = require('node:crypto');

function normalizeCode(raw) {
  return String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function hashRecoveryCode(code, pepper) {
  return crypto
    .createHmac('sha256', pepper)
    .update(normalizeCode(code))
    .digest('hex');
}

function codesMatch(presented, storedHash, pepper) {
  const presentedHash = hashRecoveryCode(presented, pepper);
  const a = Buffer.from(presentedHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const pepper = process.env.RECOVERY_CODE_PEPPER || 'test-pepper-only';
const plaintext = 'AB3DK-9MQ2L';
const stored = hashRecoveryCode(plaintext, pepper);
console.log(stored === plaintext); // false
console.log(codesMatch(plaintext, stored, pepper)); // true
console.log(codesMatch('AB3DK-9MQ2L', stored, pepper)); // true after normalize
\`\`\`

Fixtures are where CI leaks happen. Do not insert plaintext into SQL dumps that print on failure. Seed hashes only, and keep the matching plaintext in an in-memory map returned by a test helper that never \`console.log\`s the secret unless an explicit local debug flag is set.

\`\`\`typescript
import { createHmac } from 'node:crypto';

type SeededCode = { label: string; hash: string; plaintextForTestOnly: string };

function seedHashedRecoveryCodes(userId: string, pepper: string): SeededCode[] {
  const plaintexts = [
    'QWER7-TYUI2',
    'ASDF8-GHJK3',
    'ZXCV9-BNM45',
  ];

  return plaintexts.map((plaintext, index) => {
    const normalized = plaintext.replace(/-/g, '');
    const hash = createHmac('sha256', pepper).update(normalized).digest('hex');
    // Persist only userId + hash + index in the database fixture.
    return {
      label: \`user:\${userId}:code:\${index}\`,
      hash,
      plaintextForTestOnly: plaintext,
    };
  });
}

const seeded = seedHashedRecoveryCodes('user_123', 'ci-pepper');
// Safe to log in CI:
console.log(seeded.map((row) => ({ label: row.label, hashPrefix: row.hash.slice(0, 8) })));
\`\`\`

Mask secrets in Playwright traces and API snapshots the same way you mask session cookies. If a test must submit a recovery code through the UI, prefer typing from the in-memory helper rather than reading a shared plaintext file checked into git.

## Single-Use Consumption and Concurrent Race Tests

Single-use is the core of recovery codes testing. After a valid code authenticates the user (or completes the step-up challenge), that exact code must not work again. The remaining unused codes in the set should still work until consumed or revoked.

The subtle failure is the race: two requests present the same valid code at the same moment. A naive implementation loads the row, sees \`consumed_at IS NULL\`, writes success twice, and issues two sessions. Your suite needs an explicit concurrent case.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('recovery code is single-use under concurrent submits', async ({ request }) => {
  const setup = await request.post('/test/fixtures/recovery-codes', {
    data: { user: 'race-user@example.com', label: 'code-0' },
  });
  expect(setup.ok()).toBeTruthy();
  const { code, challengeId } = await setup.json();

  const attempts = await Promise.all([
    request.post('/api/auth/recovery-code/verify', {
      data: { challengeId, code },
    }),
    request.post('/api/auth/recovery-code/verify', {
      data: { challengeId, code },
    }),
  ]);

  // Do not pin the loser's exact status: 401, 403, 409, and 422 are all
  // reasonable API shapes. Pin the invariant instead: exactly one winner,
  // and the loser fails with a 4xx.
  const statuses = attempts.map((response) => response.status());
  expect(statuses.filter((code) => code === 200)).toHaveLength(1);
  expect(statuses.filter((code) => code >= 400 && code < 500)).toHaveLength(1);

  const bodies = await Promise.all(attempts.map((response) => response.json()));
  const successes = bodies.filter((body) => body.ok === true);
  expect(successes).toHaveLength(1);

  const reuse = await request.post('/api/auth/recovery-code/verify', {
    data: { challengeId, code },
  });
  expect([401, 403, 409, 422]).toContain(reuse.status());
});
\`\`\`

Adjust expected status codes to your API. The invariant is what matters: exactly one success, durable consume marker, and no second session from the loser. Prefer a database conditional update (\`UPDATE ... WHERE consumed_at IS NULL\`) or an equivalent atomic compare-and-set over application-level locks that disappear under multi-instance deploys.

Also test normalization. Users paste spaces, lowercase letters, or drop dashes. If the product accepts normalized input, both \`ab3dk-9mq2l\` and \`AB3DK9MQ2L\` should map to the same hash path, and consuming one spelling consumes the code for every spelling.

## Regeneration Invalidates the Previous Unused Set

Regeneration is not "add ten more codes." Regeneration means mint a new set and revoke the previous unused codes so stolen PDFs stop working. Partially used sets should still revoke remaining unused members. Already consumed codes stay consumed; they should not be resurrected.

| Scenario | Expected Result | Assertion Focus |
|---|---|---|
| Regenerate with unused old set | Old codes all fail | Each old plaintext rejected |
| Regenerate after one code used | Used stays used; remaining old fail; new work | Mixed history still consistent |
| Regenerate requires step-up | Password, TOTP, or WebAuthn before rotate | Missing step-up blocked |
| Regenerate while challenge open | In-flight old-code challenge fails closed | No session from revoked code |
| Double regenerate | Only latest set valid | Middle set also dead |

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('regeneration revokes unused codes from the previous set', async ({ request }) => {
  const boot = await request.post('/test/fixtures/user-with-2fa', {
    data: { email: 'rotate-user@example.com' },
  });
  expect(boot.ok()).toBeTruthy();
  const { oldCodes, session } = await boot.json();

  const rotated = await request.post('/api/account/recovery-codes/regenerate', {
    headers: { Authorization: \`Bearer \${session}\` },
    data: { stepUpToken: 'valid-step-up' },
  });
  expect(rotated.ok()).toBeTruthy();
  const { newCodes } = await rotated.json();

  for (const code of oldCodes) {
    const rejected = await request.post('/api/auth/recovery-code/verify', {
      data: { email: 'rotate-user@example.com', code },
    });
    expect([401, 403, 422]).toContain(rejected.status());
  }

  const accepted = await request.post('/api/auth/recovery-code/verify', {
    data: { email: 'rotate-user@example.com', code: newCodes[0] },
  });
  expect(accepted.ok()).toBeTruthy();
});
\`\`\`

UI tests should also prove the regenerate confirmation copy warns that previous codes stop working. Soft copy without server enforcement is not a test pass.

## Failed Attempts, Rate Limits, and Lockouts

Recovery codes are high value because they bypass the primary second factor. Unlimited guessing against a short alphabet is unacceptable. Your suite should cover per-account and per-IP controls, lockout windows, and error messages that do not reveal whether the account exists or how many codes remain.

Recommended QA scenarios:

1. N consecutive wrong codes trip a cooldown.
2. Correct code after lockout still fails until the window ends (if that is policy).
3. Correct code during an active valid window succeeds and clears or reduces the counter per policy.
4. Lockout events are audited.
5. Error bodies stay generic: "Invalid recovery code" rather than "Code already used" versus "Code not found" if those distinctions help attackers. Some products intentionally distinguish reused codes for support; if so, document it and test the chosen policy instead of inventing silence.

\`\`\`bash
# Run only recovery-code abuse cases in Playwright
npx playwright test --grep "recovery-code-lockout|recovery-code-rate-limit"
\`\`\`

Pair rate-limit tests with clock control or short test-only windows so CI does not sleep for fifteen real minutes. Prefer a test clock hook over rewriting production timers.

Compare this carefully with [password-reset token testing](/blog/testing-password-reset-flows-tokens). Reset tokens are usually single-challenge secrets with short TTL. Recovery codes are a durable set. Both need brute-force controls, but the remaining-count UX and regeneration semantics differ.

## Audit Events for View, Download, Regenerate, and Use

If security can happen without a trail, incident response is guesswork. Emit and test audit events for at least:

- recovery_codes_generated
- recovery_codes_viewed or recovery_codes_downloaded
- recovery_codes_regenerated
- recovery_code_consume_success
- recovery_code_consume_failure
- recovery_codes_locked

Each event should include actor id, target account id, request id, timestamp, IP or network hash per privacy policy, user agent class, and outcome. Do not put plaintext codes in the audit payload.

\`\`\`sql
CREATE TABLE auth_audit_events (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_user_id TEXT,
  target_user_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  ip_hash TEXT,
  outcome TEXT NOT NULL,
  metadata_json TEXT NOT NULL
);

CREATE INDEX auth_audit_events_target_time
  ON auth_audit_events (target_user_id, created_at);
\`\`\`

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('successful recovery consume writes an audit event without plaintext', async ({ request }) => {
  const fixture = await request.post('/test/fixtures/recovery-codes', {
    data: { user: 'audit-user@example.com', label: 'code-1' },
  });
  const { code } = await fixture.json();

  const verify = await request.post('/api/auth/recovery-code/verify', {
    data: { email: 'audit-user@example.com', code },
  });
  expect(verify.ok()).toBeTruthy();

  const audit = await request.get('/test/audit', {
    params: { user: 'audit-user@example.com', type: 'recovery_code_consume_success' },
  });
  expect(audit.ok()).toBeTruthy();
  const events = await audit.json();
  expect(events).toHaveLength(1);
  expect(JSON.stringify(events[0])).not.toContain(code);
  expect(events[0].metadata_json).not.toMatch(/[A-Z0-9]{5}-[A-Z0-9]{5}/);
});
\`\`\`

Download and view events matter because insider risk and compromised sessions often start with "who exported the backup codes." Make those assertions first-class, not optional.

## Negative Cases That Catch Real Breakages

Positive paths are not enough. Build a negative matrix and keep it green on every auth change.

| Negative Case | Setup | Expected |
|---|---|---|
| Reused code | Consume once, submit again | Reject, no new session |
| Revoked set | Regenerate, submit old code | Reject |
| Wrong user | Valid code for user A on user B challenge | Reject |
| Concurrent use | Two parallel submits of one code | One success max |
| Empty or malformed | Spaces-only, truncated, wrong alphabet | Reject without 500 |
| Disabled 2FA user | Codes exist historically but 2FA off | Reject or require re-enable policy |
| Expired challenge | Valid code, stale challenge id | Reject |

Wrong-user tests protect multi-tenant mistakes where a hash lookup omits account id. Always bind consume to the account (or challenge) that owns the set.

Malformed input should fail closed without stack traces in the client response. If a gateway returns 500 on unicode normalization edge cases, attackers learn where your parser is fragile.

## How Recovery Codes Differ From OTP SMS and Password-Reset Tokens

Recovery codes, SMS OTPs, and password-reset tokens all gate account recovery, but the test plans diverge.

SMS OTP flows are online, short TTL, provider-backed, and often abusable through pumping. Your OTP suite focuses on send gates, delivery, and verification windows. Recovery codes never call a carrier; the secret was issued earlier and stored as hashes. Do not copy SMS resend timers onto recovery code pages without checking product intent.

Password-reset tokens are usually single-purpose URL secrets with aggressive expiry and one active token at a time. Recovery codes are a multi-secret set that survives until use or regeneration. Reset tests care about link leakage in logs and email clients. Recovery tests care about printable set handling, partial consume, and rotate-all semantics.

Shared themes across all three: one-time consumption, hash or irreversible storage where applicable, rate limits, audit trails, and CI fixtures that do not print secrets. Reuse those patterns; do not reuse the entire scenario list blindly.

For teams wiring ready-made QA skills into an agent workflow, you can install curated checks from qaskills.sh with the qaskills CLI, then adapt the recovery-code scenarios above to your auth service boundaries.

## A Practical Playwright Suite Shape for Recovery Codes

Organize tests by risk, not by page object convenience:

1. API contract tests for generate, regenerate, verify, and metadata reads.
2. Concurrency tests for single-use races.
3. UI tests for display-once, download affordances, and regenerate warnings.
4. Abuse tests for lockouts and generic errors.
5. Audit tests for event presence and secret absence.
6. Fixture hygiene tests that fail if plaintext appears in logs or traces.

Name tests so \`npx playwright test --grep recovery-code\` selects the whole family. Keep seed helpers in a test-only module that returns plaintext to the test process memory only. Prefer service fixtures over UI setup when you are testing consume races; use the UI when you are testing human-facing reveal and download behavior.

A minimal definition of done for 2FA recovery codes testing:

- Generation properties verified.
- Hash-at-rest verified against the datastore fixture.
- Single-use and concurrent single-use verified.
- Regeneration revocation verified.
- Lockout and audit verified.
- Negative matrix green.
- No plaintext codes in CI logs, audit payloads, or committed fixtures.

That definition survives refactors better than a screenshot of ten gray boxes on a settings page.

## Frequently Asked Questions

### How many recovery codes should automated tests generate and assert?

Assert the product policy count, commonly eight to twelve, rather than inventing a preferred number in the suite. Tests should fail if the API returns fewer codes than policy, silently truncates the UI list, or pads with duplicates. Also assert uniqueness inside the set and format compliance. Avoid hard-coding expected random values. Property checks keep CI stable while still catching weak or incomplete generators after an agent changes the issuer.

### Should CI fixtures store plaintext recovery codes in the database?

No. Persist only hashes and metadata in the database fixture, then keep matching plaintext in process memory for the test that needs to type or POST the code. Printing plaintext to job logs, Playwright traces, or shared JSON fixtures turns temporary test data into a standing secret. If debugging requires visibility, gate it behind a local-only flag and redact by default in shared pipelines.

### What is the most important race condition to cover for recovery codes?

The concurrent double-submit of one still-valid code is the highest value race. Both requests can pass a naive read-then-update check and create two authenticated outcomes. Your test should fire parallel verifies, assert exactly one success, and confirm the code cannot be used again. Atomic conditional updates or equivalent compare-and-set logic belong in the implementation; the suite exists to prove that logic holds under load.

### Do regeneration tests need to include already consumed codes?

Yes. Regeneration should revoke remaining unused codes without resurrecting previously consumed ones or breaking historical audit interpretation. Seed a set, consume one code, regenerate, then assert the consumed code stays rejected, the other old codes are rejected, and only the new set authenticates. That mixed-state case catches off-by-one revoke queries that invalidate whole history tables or forget to scope by set id.
`,
};
