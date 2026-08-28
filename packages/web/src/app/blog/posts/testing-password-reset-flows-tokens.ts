import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Password Reset Flows: Token Expiry, Reuse, and Enumeration',
  description:
    'Password reset testing for token expiry, reuse races, and email enumeration with outbox doubles, Vitest API matrices, and Playwright UI flows.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Password Reset Flows: Token Expiry, Reuse, and Enumeration

Password reset testing must cover three contracts that decide whether a forgotten-password path is safe: token expiry (accepted just before TTL, rejected just after), single-use redeem (first success wins, second redeem fails including under parallel races), and anti-enumeration (identical HTTP responses for known and unknown emails, with email delivery only for real accounts). Add entropy and hashed-at-rest checks, binding to the target user, password policy on the new secret, session invalidation after success, rate limits on forgot-password, open-redirect checks on return_url, and mail content that never leaks the token into referrer-prone places. This guide is for QA and security-minded test engineers who automate those proofs with fetch or supertest-style clients, Vitest filters, Playwright UI flows, and email outbox doubles.

If your suite only submits the forgot form and asserts a toast, you have not tested password reset. The bugs live in timing, reuse, outbox side effects, and the gap between "message looks friendly" and "attacker can map which emails exist."

## Failure story: asserting "user not found" on the forgot form

Symptom: a ticket said unknown emails should show "No account for that address." A junior engineer wrote an API test that posted a random address to \`POST /auth/forgot-password\` and expected status 404 with body text matching \`/user not found/i\`. The product owner liked the clarity. Security review later blocked the release.

Wrong theory: the product should tell the submitter whether the email exists so support can coach users. The test encoded that theory as the source of truth. When engineering switched the endpoint to always return 200 with a generic "If an account exists, we sent instructions" message, CI went red and the team almost reverted the safer behavior to "fix" the suite.

Actual cause: enumeration protection makes the HTTP response identical for known and unknown emails. The real signal is the email outbox (or provider stub): a message is enqueued only for registered users. Asserting distinct error copy for unknown emails is not a completeness check. It is a regression that trains the product to leak the user directory.

Fix: assert identical status, identical JSON shape, and identical cache headers for both emails. Then assert the outbox contains exactly one reset message for the known user and zero for the unknown user. Keep a separate support-facing admin lookup behind staff auth if product needs it. Never put that lookup on the public forgot form.

What people get wrong next is copying the bad assertion into Playwright: \`expect(page.getByRole('alert')).toContainText('user not found')\`. UI copy must stay generic too. Drive the known-user path through the mail catcher, not through divergent banners.

## Same response for known and unknown email

Anti-enumeration is the first password reset testing gate. Call forgot-password twice with the same client shape: once for a seeded user, once for an address that never existed. Compare status, body bytes (or normalized JSON), and relevant headers. Do not compare timestamps inside the body if the product embeds \`requestId\` with time entropy; pin those fields or strip them before equality.

| Case | Email fixture | HTTP expectation | Outbox expectation |
| --- | --- | --- | --- |
| Known user | \`reset-known@example.test\` | Same status and body as unknown | One reset email with HTTPS link |
| Unknown user | \`reset-never@example.test\` | Same status and body as known | Zero reset emails |
| Empty email | \`""\` or missing field | Validation error (may differ) | Zero emails |
| Malformed email | \`not-an-email\` | Validation error (may differ) | Zero emails |

Validation failures for empty or malformed input may differ from the generic success path. That is fine. Enumeration risk is about whether a well-formed email that might be a customer reveals membership. Keep those rows separate in the matrix.

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;
const known = 'reset-known@example.test';
const unknown = 'reset-never@example.test';

async function forgot(email: string) {
  return fetch(\`\${BASE}/auth/forgot-password\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

async function normalize(res: Response) {
  const status = res.status;
  const body = await res.json();
  const { requestId: _rid, ...stable } = body as Record<string, unknown>;
  return { status, body: stable };
}

const a = await normalize(await forgot(known));
const b = await normalize(await forgot(unknown));
assert.deepEqual(a, b, 'forgot-password must not enumerate by response');
\`\`\`

Pair that with an outbox double. In tests, replace the mailer with an in-memory queue or a catcher API such as Mailhog, Mailpit, or a fake \`POST /test/mail/outbox\` inspector your harness owns. Only the known address should produce a message whose template key is password-reset.

## Timing side channels on account lookup

Identical JSON is not enough if known emails consistently take 40ms longer because the service hashes a token and writes a row only when the user exists. Attackers measure that. Password reset testing for timing will never be perfect in shared CI, but you can catch gross leaks.

Practical approach:

1. Warm the process with a few discarded calls so cold start noise drops.
2. Alternate known and unknown emails in one process, same connection pool.
3. Record elapsed milliseconds for each call (use \`performance.now()\` around \`fetch\`).
4. Compare medians over dozens of samples, not single shots.
5. Fail only on large gaps (for example median known > median unknown + 25ms in a quiet job), or assert that the handler always performs a constant-time-ish dummy work path for unknown users if the product documents that mitigation.

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;

async function timedForgot(email: string) {
  const t0 = performance.now();
  const res = await fetch(\`\${BASE}/auth/forgot-password\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const ms = performance.now() - t0;
  assert.equal(res.status, 200);
  return ms;
}

const knownSamples: number[] = [];
const unknownSamples: number[] = [];
for (let i = 0; i < 40; i++) {
  knownSamples.push(await timedForgot('reset-known@example.test'));
  unknownSamples.push(await timedForgot('reset-never@example.test'));
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

const gap = median(knownSamples) - median(unknownSamples);
assert.ok(
  gap < 25,
  \`lookup timing gap too large: known median - unknown median = \${gap}ms\`,
);
\`\`\`

Mark this spec as an optional or nightly job if your shared runners are noisy. Still keep it in the repo so a dedicated quiet runner or local security pass can enforce it. Document the threshold next to the suite so agents do not invent a one-millisecond fantasy.

## Token entropy and hashed storage via test doubles

When forgot-password succeeds for a known user, the server mints a reset token, stores a verifier, and emails a bearer link. Password reset testing must prove the stored form is not the raw token and that the token has enough entropy to resist guessing.

Use a test double for the token store: an in-memory repository, a Postgres table you can SELECT in tests, or a harness endpoint \`GET /test/auth/reset-tokens?email=\` that returns metadata only (the stored token digest, algorithm, expiry, consumed flag), never the plaintext token. Read the plaintext only from the outbox message body or a test-only decrypt helper that parses the link.

| Check | How to observe it | Fail if |
| --- | --- | --- |
| Entropy | Token path segment length and alphabet from the email link | Short numeric codes or sequential ids |
| Hash at rest | Store row shows digest, not raw token | Plaintext column equals link token |
| One-way | Mutating one character of the link fails redeem | Fuzzy match or truncation accepted |
| Algorithm pinned | Metadata names the expected KDF or HMAC | Free-form "hash" with unknown params |

\`\`\`ts
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const BASE = process.env.API_BASE_URL!;
const TEST = process.env.AUTH_TEST_SECRET!;

type OutboxMessage = { to: string; subject: string; text: string };
type TokenMeta = {
  userId: string;
  tokenHash: string;
  expiresAt: string;
  consumedAt: string | null;
};

async function latestResetEmail(to: string): Promise<OutboxMessage> {
  const res = await fetch(\`\${BASE}/test/mail/outbox?to=\${encodeURIComponent(to)}\`, {
    headers: { 'x-test-secret': TEST },
  });
  assert.equal(res.status, 200);
  const messages = (await res.json()) as OutboxMessage[];
  const hit = messages.find((m) => /reset/i.test(m.subject) || /reset/i.test(m.text));
  assert.ok(hit, 'expected password reset email in outbox');
  return hit;
}

function extractToken(text: string): string {
  const m = text.match(/https:\\/\\/[^\\s]+\\/reset\\/([A-Za-z0-9_\\-]+)/);
  assert.ok(m, 'reset link with token not found');
  return m[1]!;
}

const email = await latestResetEmail('reset-known@example.test');
const raw = extractToken(email.text);
assert.ok(raw.length >= 32, 'reset token entropy looks too low');

const metaRes = await fetch(
  \`\${BASE}/test/auth/reset-tokens?email=\${encodeURIComponent('reset-known@example.test')}\`,
  { headers: { 'x-test-secret': TEST } },
);
assert.equal(metaRes.status, 200);
const meta = (await metaRes.json()) as TokenMeta;
assert.notEqual(meta.tokenHash, raw);
assert.equal(meta.tokenHash, createHash('sha256').update(raw).digest('hex'));
assert.equal(meta.consumedAt, null);
\`\`\`

Adjust the hash assertion to whatever your service actually stores (HMAC with server pepper, salted digest, and so on). The point is equality between a recomputation from the emailed secret and the store, plus inequality between store and raw token. Never invent a framework-specific "ResetToken.create()" API in the suite if your app does not expose it; stay on HTTP and store doubles.

## Single-use tokens: the second redeem fails

A reset token is a capability. After a successful \`POST /auth/reset-password\` with that token and a new password, the capability must die. Password reset testing for reuse is simple in the serial case and easy to get wrong under concurrency (covered later).

Serial contract:

1. Request reset for known user, read token from outbox.
2. Redeem once with a valid new password -> success (2xx) and login works with the new password.
3. Redeem again with the same token and another password -> failure (4xx), and the password from step 2 still works.
4. Optional: request a fresh reset, confirm the previous unused token is invalidated if product says "only latest token wins."

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;

async function resetPassword(token: string, password: string) {
  return fetch(\`\${BASE}/auth/reset-password\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
}

const token = process.env.FIXTURE_RESET_TOKEN!;
const first = await resetPassword(token, 'N3w-Password-Once!');
assert.ok(first.status >= 200 && first.status < 300);

const second = await resetPassword(token, 'N3w-Password-Twice!');
assert.ok(second.status >= 400 && second.status < 500);

const login = await fetch(\`\${BASE}/auth/login\`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email: 'reset-known@example.test',
    password: 'N3w-Password-Once!',
  }),
});
assert.equal(login.status, 200);
\`\`\`

Run focused iterations with Vitest's name filter while you harden this path:

\`\`\`bash
npx vitest run tests/auth-reset -t "second redeem fails"
\`\`\`

## Expiry boundaries: just before and just after TTL

Expiry bugs cluster at the edges. A token that lives "15 minutes" might be accepted at 15m + 30s because of inclusive comparisons, clock skew leeway, or caching. Password reset testing should pin the clock with a test hook rather than sleeping for a quarter hour in CI.

Preferred harness: \`POST /test/auth/clock\` or dependency-injected time on the auth service. Mint or issue a token, advance server time to \`expiresAt - 1s\`, redeem successfully, then issue another token, advance to \`expiresAt + 1s\`, redeem and expect failure. If you cannot freeze time, use a dedicated tenant with a 30-60s reset TTL and wait with a small tolerance.

| Boundary | Server clock relative to \`expiresAt\` | Expected redeem |
| --- | --- | --- |
| Fresh | Issue time | Success |
| Just before | \`expiresAt - 1s\` (within policy) | Success |
| Just after | \`expiresAt + 1s\` | Failure |
| Far past | \`expiresAt + 1h\` | Failure |
| Consumed then time travel | Consumed, clock rewound | Still failure |

Do not assert that client-side Jest fake timers expire a server token. The API clock is the authority. Document any intentional leeway (for example 5s) in the fixture config so the "just after" case clears the leeway window.

## Binding to user and optional session or IP policy

The token must authorize a password change only for the user it was issued to. Cross-binding tests try to attach a token minted for user A onto a reset body that also includes user B identifiers, or onto a session authenticated as B. Depending on API shape, the body may be only \`{ token, password }\` (binding is entirely inside the token record) or may include \`email\` / \`userId\` fields that must match.

Policy variants to encode explicitly:

- Token alone is enough; email in the body is ignored or must match.
- Token is bound to the requesting session id collected at forgot time (rare, but some high-assurance products do this).
- Token is bound to a coarse IP or device signal (controversial for travelers; if product claims it, test it).

For the common case, mint for A, redeem with A's token, then confirm B's password did not change. If the API accepts an email field, send B's email with A's token and expect rejection or ignore-with-A-only behavior as documented. Never leave " whichever email field wins" unspecified in the suite README.

Related passwordless email magic-link flows share link delivery and single-use ideas; see [testing passwordless email magic link flow](/blog/testing-passwordless-email-magic-link-flow) for the sibling contract. Keep reset-token assertions here focused on password mutation rather than session creation via magic link.

## Race: two parallel redeem attempts

Single-use under concurrency is where read-then-update implementations fail. Fire two redeem requests with the same token and the same or different new passwords at the same time. Exactly one should succeed, or both should fail closed if the product uses a stricter compare-and-swap that rejects ambiguous winners. What must never happen is both returning 200 and leaving the account password in an undefined state, or both returning 200 with different passwords accepted across replicas.

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;
const token = process.env.FIXTURE_RESET_TOKEN!;

const [r1, r2] = await Promise.all([
  fetch(\`\${BASE}/auth/reset-password\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password: 'Race-Password-One-1!' }),
  }),
  fetch(\`\${BASE}/auth/reset-password\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, password: 'Race-Password-Two-2!' }),
  }),
]);

const statuses = [r1.status, r2.status].sort();
const success = statuses.filter((s) => s >= 200 && s < 300).length;
const failure = statuses.filter((s) => s >= 400 && s < 500).length;
assert.ok(
  (success === 1 && failure === 1) || success === 0,
  \`unexpected race outcomes: \${statuses.join(',')}\`,
);

const loginOne = await fetch(\`\${BASE}/auth/login\`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email: 'reset-known@example.test',
    password: 'Race-Password-One-1!',
  }),
});
const loginTwo = await fetch(\`\${BASE}/auth/login\`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email: 'reset-known@example.test',
    password: 'Race-Password-Two-2!',
  }),
});
const logins = [loginOne.status, loginTwo.status].filter((s) => s === 200);
assert.equal(logins.length, success === 1 ? 1 : 0);
\`\`\`

If your datastore needs a unique constraint or \`UPDATE ... WHERE consumed_at IS NULL\` to make this pass, the test is doing its job when it fails on the naive implementation.

## Password policy on the new password

Redeem is not only a token check. The new password must satisfy complexity, length, breach-list, and "cannot reuse current password" rules when the product requires them. Password reset testing should reuse the same policy fixtures as registration and change-password, then add reset-specific rows.

Minimum rows:

- Too short -> 4xx, token remains usable if product says validation failures do not consume.
- Missing variety (if required) -> 4xx, same consumption rule.
- Same as current password when reuse forbidden -> 4xx.
- Valid new password -> 2xx, token consumed, old password fails login.

Be explicit about consumption on validation failure. Some systems consume on any POST that presents a valid token; others only consume on successful hash update. Either can be argued; silently mixing them produces flaky "second try" support advice. Lock the rule in an assertion that attempts a bad password then a good password with the same token and expects the documented outcome.

## Session invalidation after reset

After a successful reset, existing sessions are often the real risk: an attacker who requested reset from a stolen inbox, or a device left logged in at a cafe. Product policy is usually one of: invalidate all sessions, invalidate all except the current reset browser, or invalidate none (weak). Password reset testing must state the policy and prove it with two clients.

Pattern:

1. Log in on client A and client B (two refresh cookies or two Playwright storage states).
2. Complete reset via token (API or UI).
3. Call \`GET /v1/me\` or load an authenticated page on A and B.
4. Expect 401 or login redirect per policy.

Deep coverage of refresh rotation, idle expiry, and revoke-all belongs with [session token lifecycle testing for expiry and refresh](/blog/session-token-lifecycle-testing-expiry-refresh). Here you only need the post-reset trigger: the reset handler should call the same revoke path those lifecycle tests already trust, and your assertion should prove sessions die without re-testing the entire refresh family graph.

Stateless access JWTs may survive until \`exp\` unless you version sessions or keep a denylist. If product copy says "you will be signed out everywhere," your suite must fail when a not-yet-expired access token still hits \`/v1/me\` successfully after reset.

## Email content, HTTPS links, and mail catcher fixtures

The email is part of the security boundary. Password reset testing should parse the outbox message, not only count it.

Assert:

- Link scheme is \`https:\` in staging and production-shaped configs (http only in explicit local dev).
- Link host matches the app allowlist, not an open redirector.
- Token appears in a path segment or fragment as designed, not as a referrer-leaky query if the product can avoid it. Query strings leak via logs and \`Referer\` more often than path segments behind careful redirects; fragments are not sent to servers on navigation but are harder for some mail clients. Document the chosen shape and test it.
- Body does not include the user's current password or session JWT.
- Subject and body stay free of the raw token in places that get quoted in plaintext reply chains if the product can put the secret only in the URL.

Mail catcher fixtures keep this deterministic. Seed the user, call forgot-password, poll the catcher with a short timeout, parse with a stable regex, then clear the inbox in \`afterEach\`. When AI agents generate suites, point them at the catcher helper so they stop sleeping 10 seconds "hoping" the email arrives.

Optional once for scaffolding: install QA skills from qaskills.sh with the qaskills CLI and keep reset fixtures beside the outbox helper so agents extend rows instead of inventing a second mail fake.

## Rate limiting the forgot-password endpoint

Forgot-password is an abuse magnet: inbox flooding, user enumeration via secondary channels, and compute burn if token hashing is expensive. Password reset testing for rate limits should treat the endpoint like other public costly POSTs.

Suggested matrix rows:

| Actor | Burst | Expected |
| --- | --- | --- |
| Same IP, many emails | Above limit | 429 with Retry-After |
| Same email, many requests | Above limit | 429 or generic 200 without extra emails |
| Distributed low rate | Under limit | Still anti-enumerating 200s |

Assert that exceeding the limit does not change the anti-enumeration body for the first responses, and that the outbox does not grow without bound for a single address. If limits are disabled in local dev, run this spec only when \`RATE_LIMIT_TEST=1\` against a staging-like compose stack.

## Open redirect on return_url

Some reset landing pages accept \`return_url\` or \`next\` so the user continues to a deep link after changing the password. That parameter is a classic open redirect. Test it at both forgot-link generation and post-reset redirect.

Cases:

- Relative path \`/app/billing\` -> allowed.
- Absolute same-origin HTTPS URL -> allowed if product permits.
- \`https://evil.example/\` -> rejected or ignored in favor of a safe default.
- Tricks: \`//evil.example\`, \`/@evil\`, encoded dots, backslashes, \`https://good.example@evil.example/\`.

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;

async function forgotWithReturn(email: string, returnUrl: string) {
  return fetch(\`\${BASE}/auth/forgot-password\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, return_url: returnUrl }),
  });
}

const res = await forgotWithReturn(
  'reset-known@example.test',
  'https://evil.example/phish',
);
assert.ok(res.status === 400 || res.status === 200);

// If 200, the emailed link must not embed the evil host.
const outbox = await fetch(
  \`\${BASE}/test/mail/outbox?to=\${encodeURIComponent('reset-known@example.test')}\`,
  { headers: { 'x-test-secret': process.env.AUTH_TEST_SECRET! } },
);
const messages = (await outbox.json()) as { text: string }[];
const last = messages.at(-1);
assert.ok(last);
assert.doesNotMatch(last.text, /evil\\.example/);
\`\`\`

Also drive the UI: complete reset and ensure \`window.location\` never lands on an attacker host when a poisoned query string is present.

## Reset tokens versus session JWTs

Teams mix these names and then write the wrong tests. A password reset token is a one-shot capability to set a password. A session JWT (or opaque session id) is a repeated capability to call authenticated APIs until expiry or revoke.

| Property | Reset token | Session JWT / session id |
| --- | --- | --- |
| Purpose | Authorize password change | Authorize API/UI access |
| Lifetime | Minutes, single purpose | Minutes to days, many requests |
| Reuse | Must fail after success | Allowed until expiry/revoke |
| Storage | Hash at rest, email delivery | Cookie, bearer header, or both |
| After password reset | Consumed | Usually revoked in bulk |

Password reset testing should refuse to treat a reset token as an \`Authorization: Bearer\` value on \`/v1/me\`, and refuse to treat a session JWT as a body token on \`/auth/reset-password\`. Cross-wiring those headers is a productive negative test when junior agents generate "auth helpers" that reuse one \`token\` variable for everything.

## UI Playwright flow plus API-level matrix

Ship both layers. The API matrix catches security contracts fast. Playwright catches copy, focus order, deep-link routing, and the mail-to-browser handoff.

Playwright happy path sketch:

\`\`\`ts
import { test, expect } from '@playwright/test';

const BASE = process.env.APP_BASE_URL!;
const API = process.env.API_BASE_URL!;
const TEST = process.env.AUTH_TEST_SECRET!;

test('forgot password email link resets and signs in', async ({ page, request }) => {
  const email = 'reset-ui@example.test';
  await page.goto(\`\${BASE}/forgot-password\`);
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: /send reset/i }).click();
  await expect(page.getByRole('status')).toContainText(/if an account exists/i);

  const outbox = await request.get(
    \`\${API}/test/mail/outbox?to=\${encodeURIComponent(email)}\`,
    { headers: { 'x-test-secret': TEST } },
  );
  expect(outbox.ok()).toBeTruthy();
  const messages = (await outbox.json()) as { text: string }[];
  const match = messages.at(-1)?.text.match(/https:\\/\\/[^\\s]+\\/reset\\/[A-Za-z0-9_\\-]+/);
  expect(match).toBeTruthy();

  await page.goto(match![0]!);
  await page.getByLabel('New password').fill('Ui-Reset-Password-9!');
  await page.getByLabel('Confirm password').fill('Ui-Reset-Password-9!');
  await page.getByRole('button', { name: /update password/i }).click();
  await expect(page).toHaveURL(/\\/(login|app|home)/);
});
\`\`\`

Filter while debugging:

\`\`\`bash
npx playwright test --grep "forgot password email link"
\`\`\`

API-level matrix (keep as a table in the repo and as parameterized tests):

| Step | Input | Expected status | Side effect |
| --- | --- | --- | --- |
| Forgot known | Seeded email | 200 generic | Outbox +1 |
| Forgot unknown | Random email | 200 generic | Outbox +0 |
| Reset valid | Fresh token + strong password | 2xx | Sessions revoked per policy |
| Reset reused | Same token again | 4xx | Password unchanged |
| Reset expired | Token past TTL | 4xx | Password unchanged |
| Reset race loser | Parallel twin | 4xx or fail-closed | Single password winner |
| Reset bad policy | Too short password | 4xx | Per consumption rule |
| Reset open redirect | Evil return_url | 4xx or sanitized link | No evil host in email |

Wire CI with GitHub Actions \`actions/checkout@v4\` and \`actions/setup-node@v4\` so the matrix and Playwright project install cleanly. Keep secrets for \`AUTH_TEST_SECRET\` in the environment, not in the repo.

\`\`\`yaml
name: auth-reset
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx vitest run tests/auth-reset
      - run: npx playwright test --grep "forgot password"
        env:
          AUTH_TEST_SECRET: \${{ secrets.AUTH_TEST_SECRET }}
\`\`\`

## Runnable layout for agents and humans

Keep reset specs in one folder with names that match the contracts:

\`\`\`bash
tests/auth-reset/
  enumeration.response.test.ts
  enumeration.timing.test.ts
  token.hash-at-rest.test.ts
  token.single-use.test.ts
  token.expiry.test.ts
  token.race.test.ts
  password.policy.test.ts
  session.invalidate.test.ts
  email.content.test.ts
  rate-limit.forgot.test.ts
  return-url.redirect.test.ts
  playwright/forgot-reset.spec.ts
  fixtures/ttl.json
  helpers/outbox.ts
\`\`\`

Ownership rules:

- Any change to forgot-password copy updates the generic-message assertion, not a user-not-found assertion.
- Any change to token TTL updates \`fixtures/ttl.json\` and the boundary tests together.
- Any change to session revoke policy updates the dual-client post-reset spec.
- Agents may add rows to the matrix; they may not delete enumeration or single-use rows to "make CI green."

## Frequently Asked Questions

### Should forgot-password return 404 when the email is unknown?

No for public clients. Password reset testing should expect a generic success response for well-formed known and unknown emails so the endpoint does not become a user-directory oracle. Prove membership only through authenticated admin tools or through outbox side effects in the test harness. If marketing wants clearer UX, use copy that stays true for both cases, such as "If an account exists, we sent instructions," and keep the suite locked to that wording.

### Does a failed password-policy check consume the reset token?

Only if your product says so. Many systems leave the token reusable until a successful password update so users can correct a typo in the new password. Others consume on first presentation of a valid token. Your tests must encode one rule: attempt a too-short password, then a valid password with the same token, and assert either success on the second try or a hard failure that forces a new forgot-password email. Document the choice beside the policy fixtures.

### How do we test expiry without sleeping fifteen minutes in CI?

Use a test clock or a short-TTL tenant. Issue a token, set server time to one second before \`expiresAt\` and expect success, then set time to one second after \`expiresAt\` (plus any documented leeway) and expect failure. Real sleeps belong only in end-to-end smoke jobs with sixty-second TTLs. Client-side fake timers do not move the API clock and will give false confidence in password reset testing.

### What is the smallest suite before shipping a reset change?

Ship anti-enumeration response equality with outbox checks, hash-at-rest verification via a store double, serial single-use redeem, one parallel redeem race, before/after expiry boundaries, password policy rows including current-password reuse when required, post-reset session invalidation for two clients, rate-limit smoke on forgot-password, return_url open-redirect negatives, and one Playwright mail-link UI path. Anything less leaves enumeration, reuse, or lingering sessions for production to discover.
`,
};
