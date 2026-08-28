import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Account Lockout Testing: Thresholds, Progressive Backoff, and Unlock Paths',
  description:
    'Ship account lockout testing for thresholds, progressive backoff, and unlock paths with Playwright, Vitest API matrices, and k6 Rate/Trend metrics.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Account Lockout Testing: Thresholds, Progressive Backoff, and Unlock Paths

Account lockout testing verifies three contracts on the login path: attempt thresholds (how many failures trip a lock inside a time window, keyed per account, per IP, or both), progressive backoff (delay or soft throttle before a hard lock), and unlock paths (time-based expiry, admin clear, email or MFA challenge, CAPTCHA gate). You prove that N-1 bad passwords still authenticate on the next correct try, that N failures refuse login with a stable locked signal, that unlock restores access without stranding sessions forever, and that error copy does not enumerate whether a username exists or is merely locked. This guide is for QA and security-minded automation engineers who drive those proofs with Playwright UI flows, Vitest-filtered API matrices, and k6 soaks that export named \`Rate\` and \`Trend\` metrics around lock events.

If your suite only posts a wrong password once and checks a red banner, you have not tested account lockout. The bugs live at threshold boundaries, concurrent races, unlock races, and the gap between "message looks helpful" and "attacker can map the user directory."

## Failure story: lockout keyed only on username

Symptom: a fintech login allowed five failures, then returned HTTP 423 with \`code: "account_locked"\`. Security asked for account lockout testing. The suite created one fixture user, burned five wrong passwords from a single CI IP, asserted lock, slept the TTL, asserted unlock. Green for months.

Wrong theory: the product "locks the account," so the key is the username (or user id) alone. Product copy said "Your account is locked." The test mirrored that language and never varied the client IP or tried the same password spray across many accounts from one IP.

Actual cause: the limiter stored a counter only under \`userId\`. An attacker who rotated residential proxies could try four passwords per IP forever and never trip the lock. The opposite bug also shipped later: a shared office NAT hit the per-IP limit and locked every employee trying to sign in during an incident drill. Neither case appeared in CI because the harness used one IP and one account.

Fix: treat the threshold matrix as a product of keys. Document and test per-account, per-IP, and compound policies separately. Seed multiple users and multiple source IPs (or header-injected test IPs your staging gateway trusts). Assert that rotating IPs cannot bypass a per-account threshold, and that one noisy IP cannot lock unrelated accounts unless the policy explicitly says so.

What people get wrong next is asserting the lock only in the UI toast. The durable signal is the auth API status plus an audit row (\`lock_reason\`, \`lock_key\`, \`unlock_at\`). Drive Playwright against the same API contract, and keep a store inspector or admin test hook for audit fields.

## Threshold matrix: attempts, window, and keying

Account lockout testing starts with a written matrix, not a single magic number. Capture the policy your environment claims to enforce, then turn each cell into an automated case.

| Policy cell | Example value | Boundary to prove | Typical fail mode |
| --- | --- | --- | --- |
| Max failures | 5 | 4 fails still allow success; 5th fail locks | Off-by-one: locks on 4 or allows 6 |
| Window | 15 minutes sliding | Failures outside the window do not count | Fixed calendar bucket resets at midnight UTC only |
| Key: account | \`userId\` | Same user, different IPs, still locks | IP rotation bypasses lock |
| Key: IP | client IP / \`X-Forwarded-For\` test header | Same IP, different users, trips IP policy | Shared NAT false-positive lock storms |
| Key: both | account AND IP | Document which key wins on conflict | Ambiguous 429 vs 423 vs 401 |
| Successful login | resets counter or not | Correct password after 3 fails clears streak | Counter never resets; soft lock forever |

Write the matrix into the test plan as data, not prose. Vitest (or your runner) can iterate rows. Prefer HTTP login endpoints for boundary arithmetic; reserve the browser for copy, CSRF token wiring, and unlock UX.

\`\`\`ts
import { describe, it, expect } from 'vitest';

type Keying = 'account' | 'ip' | 'both';

const matrix: Array<{
  name: string;
  maxFails: number;
  windowSec: number;
  keying: Keying;
}> = [
  { name: 'account-5-in-15m', maxFails: 5, windowSec: 900, keying: 'account' },
  { name: 'ip-20-in-10m', maxFails: 20, windowSec: 600, keying: 'ip' },
  { name: 'both-5-and-20', maxFails: 5, windowSec: 900, keying: 'both' },
];

const BASE = process.env.API_BASE_URL!;

async function login(body: object, headers: Record<string, string> = {}) {
  return fetch(\`\${BASE}/auth/login\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

describe('account lockout thresholds', () => {
  for (const row of matrix) {
    it(\`\${row.name}: N-1 fails then success still works\`, async () => {
      const user = \`lock-\${row.name}@example.test\`;
      const ip = \`203.0.113.\${row.name.length % 200}\`;
      for (let i = 0; i < row.maxFails - 1; i++) {
        const res = await login(
          { email: user, password: 'Wrong-Password!' },
          { 'x-test-client-ip': ip },
        );
        expect([401, 403]).toContain(res.status);
      }
      const ok = await login(
        { email: user, password: process.env.LOCK_FIXTURE_PASSWORD! },
        { 'x-test-client-ip': ip },
      );
      expect(ok.status).toBe(200);
    });
  }
});
\`\`\`

Run a single cell while debugging with Vitest's name filter:

\`\`\`bash
npx vitest run -t "account-5-in-15m"
\`\`\`

Do not invent gateway APIs. If staging cannot honor \`x-test-client-ip\`, terminate TLS at a test sidecar that stamps the real client address from separate egress IPs, or run the auth service with an in-process key override reserved for \`NODE_ENV=test\`. The assertion target stays the same: counters and lock decisions keyed as documented.

## Progressive backoff versus hard lock

Many products delay responses after the third failure (250ms, 1s, 4s) before ever returning a hard lock. Others skip soft delay and jump to a locked state. Account lockout testing must name which mode is in force, because the assertions differ.

| Mode | Observable signal | What to assert | What not to assert |
| --- | --- | --- | --- |
| Progressive backoff | Latency grows; status often still 401 | Median latency after fail k > fail k-1 within tolerance | Immediate 423 on first delay step |
| Hard lock | Status 423 or 401 with \`account_locked\` | Stable machine code + unlock metadata | That every later attempt is slower |
| Hybrid | Delay then lock at N | Delay curve for 1..N-1, lock at N | Mixing delay flakes into lock correctness |

Backoff tests are flaky if you assert exact milliseconds on a shared runner. Prefer relative checks: attempt 4's elapsed time is greater than attempt 2's by a minimum delta, measured with \`performance.now()\`, after a warm-up call. Hard lock tests should ignore latency and pin status plus body code.

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;
const email = 'backoff-user@example.test';

async function timedFail() {
  const t0 = performance.now();
  const res = await fetch(\`\${BASE}/auth/login\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Definitely-Wrong' }),
  });
  const ms = performance.now() - t0;
  return { status: res.status, ms, body: await res.json() };
}

// warm-up
await timedFail();

const samples = [];
for (let i = 0; i < 4; i++) samples.push(await timedFail());

assert.equal(samples[0]!.status, 401);
assert.ok(
  samples[3]!.ms > samples[0]!.ms + 200,
  'progressive backoff should add noticeable delay by attempt 4',
);
\`\`\`

When the policy is hard lock only, replace the latency assertion with a lock code check at attempt N and keep attempts 1..N-1 fast and unlocked. Document the choice in the test title so on-call engineers do not "fix" a backoff flake by loosening a hard-lock contract.

## Unlock paths: time, admin, email, MFA, CAPTCHA

Locking without a tested unlock path creates support debt and false security theater. Account lockout testing should cover every unlock mechanism your product exposes.

1. **Time-based unlock**: freeze or advance a test clock if the service supports it; otherwise sleep the documented TTL in a long job and assert login succeeds again. Prefer clock control in unit or service tests; keep one soak that sleeps in staging.
2. **Admin unlock**: staff-authenticated \`POST /admin/users/:id/unlock\` (or your real admin route) clears the lock and writes an audit actor. Assert the locked user can authenticate immediately after, and that a non-admin token cannot call the route.
3. **Email unlock**: outbox double receives a message with a one-time link; redeeming the token clears the lock. Assert token single-use and expiry the same way you would for password reset tokens.
4. **MFA step-up**: locked account may still verify a TOTP or WebAuthn challenge to unlock. Assert wrong MFA does not unlock, and that unlock does not skip MFA enrollment policy.
5. **CAPTCHA gate**: after soft lock, a CAPTCHA token is required on the next login attempt. Assert missing CAPTCHA fails closed; a test harness CAPTCHA provider returns a fixed pass token in non-prod.

\`\`\`ts
import { test, expect } from '@playwright/test';

test.describe('unlock paths', () => {
  test('admin unlock restores password login', async ({ request }) => {
    const email = 'unlock-admin@example.test';
    // burn to lock (threshold fixture: 5)
    for (let i = 0; i < 5; i++) {
      await request.post('/auth/login', {
        data: { email, password: 'Wrong-Password!' },
      });
    }
    const locked = await request.post('/auth/login', {
      data: { email, password: process.env.LOCK_FIXTURE_PASSWORD! },
    });
    expect(locked.status()).toBe(423);

    const admin = await request.post('/auth/login', {
      data: {
        email: process.env.ADMIN_EMAIL!,
        password: process.env.ADMIN_PASSWORD!,
      },
    });
    expect(admin.ok()).toBeTruthy();

    const clear = await request.post('/admin/users/unlock', {
      data: { email },
    });
    expect(clear.status()).toBe(204);

    const ok = await request.post('/auth/login', {
      data: { email, password: process.env.LOCK_FIXTURE_PASSWORD! },
    });
    expect(ok.status()).toBe(200);
  });
});
\`\`\`

Filter Playwright to this file's unlock tag during incident response:

\`\`\`bash
npx playwright test --grep "admin unlock restores"
\`\`\`

Email and MFA unlocks belong in separate tests so a mail catcher outage does not hide an admin unlock regression. CAPTCHA tests must stub the provider; never call a paid CAPTCHA API from CI for every PR.

## Enumeration risks: unknown user versus locked account

Helpful errors help attackers. If unknown usernames return \`user_not_found\` in 8ms and locked accounts return \`account_locked\` in 40ms with different JSON shapes, you have built a user-directory oracle. Account lockout testing must compare responses the way password-reset suites compare forgot-password responses.

| Probe | Input | Safe expectation | Unsafe leak |
| --- | --- | --- | --- |
| Unknown user, bad password | never-registered@example.test | Same status/shape as bad password for known unlocked user | \`user_not_found\` only for unknown |
| Known unlocked, bad password | fixture user | Generic auth failure | Password hints, "almost correct" |
| Known locked, any password | locked fixture | Generic failure OR uniform locked signal that does not confirm existence to anonymous clients | Locked only when user exists |
| Timing | alternate probes | No large median gap in quiet CI job | Known locked path always much slower |

Product teams sometimes want a distinct locked message for legitimate users who mistype their password after a spray. If you show that message, show it only after a successful second factor or only inside an already authenticated support view. Public login should stay uniform.

Cross-check login form CSRF while you are on the page: a lockout suite that posts raw JSON may miss the cookie and token requirements of the browser form. Pair your API matrix with a Playwright form submit that includes the CSRF token and SameSite cookie behavior described in [testing CSRF protection tokens and SameSite](/blog/testing-csrf-protection-tokens-samesite). Lockout correctness does not excuse a login CSRF gap.

## Concurrent attempt races

Threshold counters are classic read-modify-write races. Two parallel requests can both read \`failCount=4\`, both write \`5\`, and both receive 401 instead of one receiving the lock transition. Or both can issue unlock and login and leave a zombie lock flag.

Account lockout testing for races should:

1. Pre-seed the counter to N-1 under a mutex or admin test hook.
2. Fire K parallel bad-password attempts with \`Promise.all\` (API) or multiple browser contexts.
3. Assert that at least one response is the locked signal and that a subsequent correct password is rejected until unlock.
4. Repeat under a small k6 scenario to raise the chance of interleaving.

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;
const email = 'race-lock@example.test';

async function badLogin() {
  return fetch(\`\${BASE}/auth/login\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Wrong-Password!' }),
  });
}

// Assume test hook set failCount to maxFails - 1 for this user
const parallel = await Promise.all(Array.from({ length: 8 }, () => badLogin()));
const statuses = await Promise.all(parallel.map(async (r) => r.status));
assert.ok(
  statuses.some((s) => s === 423),
  \`expected a lock among parallel attempts, got \${statuses.join(',')}\`,
);

const after = await fetch(\`\${BASE}/auth/login\`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    email,
    password: process.env.LOCK_FIXTURE_PASSWORD!,
  }),
});
assert.equal(after.status, 423, 'correct password must not bypass active lock');
\`\`\`

If the implementation uses Redis \`INCR\` with a TTL, race gaps shrink but do not disappear around unlock. Add a test that unlocks while a wrong-password flood continues and asserts the audit log shows a single unlock actor without counter corruption (failCount not negative, lock flag not flapping).

## Observability: lock events and audit fields

A lock that does not emit telemetry is invisible during an attack. Your tests should assert both the client-visible contract and the operator-visible trail.

Minimum audit fields to pin in a test double or query API:

- \`event_type\`: \`auth.lock\` / \`auth.unlock\`
- \`subject_user_id\` (or hash if you minimize PII in logs)
- \`lock_key\`: account, ip, or compound
- \`reason\`: \`threshold\`, \`manual_admin\`, \`automated_risk\`
- \`actor_id\` for admin unlocks
- \`unlock_at\` or \`ttl_seconds\`
- \`request_id\` correlating to the failing login

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;

async function lastAudit(email: string) {
  const res = await fetch(
    \`\${BASE}/test/audit?email=\${encodeURIComponent(email)}\`,
    { headers: { 'x-test-hook': process.env.TEST_HOOK_TOKEN! } },
  );
  assert.equal(res.status, 200);
  return res.json();
}

// after burning threshold...
const row = await lastAudit('audit-lock@example.test');
assert.equal(row.event_type, 'auth.lock');
assert.equal(row.lock_key, 'account');
assert.equal(row.reason, 'threshold');
assert.ok(row.unlock_at || row.ttl_seconds);
\`\`\`

Keep \`/test/audit\` behind a hook token and disable it outside ephemeral environments. Production checks should query your real SIEM or warehouse fixtures, not a wide-open debug route.

## Playwright and API harness for threshold boundaries

Structure the harness so API tests own arithmetic and Playwright owns the browser-only surface: CSRF-hidden fields, disabled submit buttons while locked, unlock email deep links, and accessibility of error text.

Suggested layout:

- \`auth/lockout.threshold.spec.ts\`: Vitest matrix for N-1 / N / window expiry
- \`auth/lockout.unlock.spec.ts\`: admin, time, email redeem
- \`auth/lockout.enumerate.spec.ts\`: identical responses
- \`e2e/lockout.ui.spec.ts\`: Playwright form path with \`--grep @lockout\`

\`\`\`ts
import { test, expect } from '@playwright/test';

test('login form shows generic failure then locked state @lockout', async ({
  page,
}) => {
  await page.goto('/login');
  const email = 'ui-lock@example.test';

  for (let i = 0; i < 5; i++) {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Wrong-Password!');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
  }

  await page.getByLabel('Password').fill(process.env.LOCK_FIXTURE_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText(/try again later|locked/i);
  // still must not reveal whether email is registered via a distinct selector
  await expect(page.getByText(/user not found/i)).toHaveCount(0);
});
\`\`\`

GraphQL-backed apps often expose \`mutation login\` or \`mutation signIn\` instead of REST. Apply the same threshold matrix to the mutation, and confirm that introspection does not freely advertise internal lock enums or admin unlock mutations to anonymous clients. Security testing for that exposure belongs beside lockout work; see [security testing GraphQL introspection exposure](/blog/security-testing-graphql-introspection-exposure) when your auth surface is a graph.

## Load signals with k6: lock rate and unlock latency

Functional tests prove a single fixture. Attacks are concurrent. Use k6 to measure how often login returns locked signals under a controlled wrong-password flood, and how long unlock takes after TTL. Import \`Rate\` and \`Trend\` by name from \`k6/metrics\`.

\`\`\`js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const lockRate = new Rate('login_lock_rate');
const unlockMs = new Trend('unlock_wait_ms', true);

export const options = {
  scenarios: {
    spray: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
    },
  },
  thresholds: {
    login_lock_rate: ['rate>0.1'], // expect some locks under spray
  },
};

const BASE = __ENV.API_BASE_URL;

export default function () {
  const email = \`spray-\${__VU}@example.test\`;
  const res = http.post(
    \`\${BASE}/auth/login\`,
    JSON.stringify({ email, password: 'Wrong-Password!' }),
    { headers: { 'content-type': 'application/json' } },
  );
  const locked = res.status === 423;
  lockRate.add(locked);
  check(res, {
    'auth failure or lock': (r) => r.status === 401 || r.status === 423,
  });
  sleep(0.2);
}

export function handleSummary(data) {
  // optional: surface unlockMs if a separate scenario measures TTL waits
  return { stdout: JSON.stringify(data.metrics.login_lock_rate, null, 2) };
}
\`\`\`

Tune thresholds to the policy: a per-IP lock should show rising \`login_lock_rate\` for one egress; a pure per-account lock should lock each VU's user without blocking unrelated warm-up users. Keep k6 credentials and hook headers in secrets, not in the script body.

## CI wiring: artifacts, grep, and filters

Wire the suite so lockout jobs are selectable and their evidence survives the run. Use GitHub Actions \`actions/*@v4\` for checkout and artifact upload.

\`\`\`yaml
name: account-lockout
on:
  pull_request:
    paths:
      - 'src/auth/**'
      - 'tests/auth/lockout/**'
jobs:
  lockout:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npx vitest run -t "account lockout"
      - run: npx playwright test --grep @lockout
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lockout-playwright-report
          path: playwright-report/
\`\`\`

Store lockout audit dumps and k6 summaries as artifacts beside the HTML report. When a threshold flips from 5 to 10 in config, the Vitest \`-t\` filter and Playwright \`--grep\` tag keep the feedback loop tight without running the entire browser suite.

Optional tooling note: teams that keep a local catalog of security checks sometimes index this flow with the qaskills CLI on qaskills.sh so authors can scaffold the matrix file; the assertions above still belong in your repo's Vitest and Playwright sources of truth.

## Threshold edge cases that break naive counters

Account lockout testing fails most often on edge cells that a single happy-path burn never touches. Treat each edge as a named case with a seed, an action sequence, and a postcondition on both the login response and the audit store.

Off-by-one remains the classic defect: locking on failure four when the policy says five, or allowing a sixth attempt because the counter increments after the response is written. Automate N-1 success and N lock in the same fixture lifecycle so the two assertions share the same counter state. Sliding windows add a second arithmetic trap. If the window is fifteen minutes and failures occurred at t=0, t=7m, and t=14m, a failure at t=15m01s may drop the oldest event depending on whether the implementation uses a continuous sliding window or fixed buckets. Advance a test clock across the boundary and assert the failCount the policy claims, not the count a developer assumed from a wall-clock sleep.

Normalization edges matter because attackers and users do not type identical strings. Prove that \`User@Example.test\` and \`user@example.test\` share one account key when the product lowercases emails, and that they do not share a key when the identity model treats local-parts as case-sensitive. Homoglyph and Unicode lookalike addresses should not create a second unlocked counter for the same mailbox. Empty password, whitespace-only password, and wrong password should all increment the same failure counter unless product policy documents an early validation short-circuit that never reaches the credential checker. Document that short-circuit explicitly: if empty passwords return 400 without touching failCount, your spray tests must still reach a 401 path that does.

Successful login mid-window is another contract fork. Some products reset the failure streak on any correct password before lock; others only reset after unlock. Write both the pre-lock reset case and the post-lock refusal case. Password change while near threshold should not orphan the lock key: after a successful change, either the old streak clears under the same user id or the suite documents that it does not. Disabled or soft-deleted accounts should not reveal a distinct locked signal that proves the mailbox still exists; compare those probes to the unknown-user baseline from the enumeration table.

## Unlock path test matrices in prose

Beyond listing unlock mechanisms, build an explicit matrix so each path has positive, negative, and replay coverage.

| Unlock path | Positive proof | Negative / replay proof | Audit expectation |
| --- | --- | --- | --- |
| Time-based | Login succeeds after \`unlock_at\` + epsilon | Still locked at \`unlock_at\` - 1s | \`auth.unlock\` reason \`ttl\` |
| Admin | Staff token clears; user logs in | Non-admin 403; lock remains | \`actor_id\` set once |
| Email token | First redeem clears lock | Second redeem and expired token fail | Token id marked consumed |
| MFA step-up | Correct TOTP/WebAuthn clears | Wrong code keeps lock | reason \`mfa_step_up\` |
| CAPTCHA gate | Test pass token allows retry under policy | Missing/invalid token fails closed | Soft-gate event, not hard unlock |

Time-based unlock needs clock control or a long job: lock at N, assert still locked just before expiry, assert success just after, and confirm failCount returns to zero or to the documented post-unlock value. Admin unlock must be idempotent on a second clear and must refuse non-admin tokens without clearing. Email unlock must issue one outbox message per lock event, succeed once, reject replay and expiry, and must not auto-login unless product policy says so. MFA unlock must leave the lock intact on wrong codes and may increment a separate MFA failure budget. CAPTCHA soft-gates must fail closed without a provider token.

Cross cells matter as much as single paths. Admin unlock during an email-token lifetime should invalidate the email token. Time expiry during an in-flight admin request should leave a single terminal unlocked state, not a flap. Parallel unlock from two admins should not create negative counters. Encode the matrix as data rows in Vitest so CI prints which cell failed without rereading this section.

## CDN and NAT IP keying pitfalls

Per-IP account lockout testing collapses when the app keys on the wrong address hop. A CDN that appends client IPs to \`X-Forwarded-For\` while the app trusts the leftmost entry will key on a value an attacker can spoof. A CDN that overwrites the header correctly still differs from the origin-visible TCP peer. Corporate NAT makes thousands of employees share one egress; a pure per-IP threshold then becomes a denial-of-service against the office. Mobile carriers and privacy proxies create similar shared egress. Your suite must state which hop is canonical: edge-injected trusted header in staging, or true distinct egress in soak environments.

Practical pitfalls to automate: spoofed \`X-Forwarded-For\` from the public internet must not move the lock key when the trust boundary rejects client-supplied headers; a staging-only \`x-test-client-ip\` header must be rejected when \`NODE_ENV\` is production-like; IPv4-mapped IPv6 forms should canonicalize to one key; regenerating CDN PoP addresses mid-session should not reset a per-IP counter if the product keys on the connecting user address rather than the PoP. When policy is compound (account AND IP), define whether rotating IP resets the account streak. Attackers rely on that ambiguity. Tests should lock under IP A, retry under IP B, and assert the documented outcome for both the account key and the IP key.

Shared NAT false positives deserve a dedicated soak: many distinct fixture users behind one egress must remain able to authenticate when policy is per-account only. The inverse soak uses one user across many egress IPs to prove a per-account lock still holds. Without both soaks, CI lies about CDN and NAT reality.

## Session invalidation when a lock fires

Locking the login path while leaving existing sessions valid is a common product choice and a common security gap. Account lockout testing should state the session policy in the same matrix as thresholds. If policy says active sessions die on lock, assert that a bearer token or session cookie obtained before the lock receives 401 on a privileged route immediately after the lock event, and that refresh tokens cannot mint a new access token until unlock. If policy says sessions survive until expiry, assert that explicitly so security review can accept the risk, and still assert that new logins remain blocked.

Cover refresh races: lock fires while a refresh is in flight; the result must match policy without leaving a half-valid token pair. Cover multi-device: lock from a spray on device A should invalidate or preserve device B sessions according to the written rule. Cover admin unlock: restoring login should not automatically revive revoked refresh tokens unless the identity store documents that revival. Store session version or \`notAfter\` stamps in the audit assertion so the test checks a durable signal rather than a single UI redirect.

Playwright helps here. Keep an authenticated context open, burn the lock from a second context or API client, then attempt a privileged navigation in the first context and expect the documented logged-out or locked behavior. API tests should hit \`/me\` or a narrow admin probe with the pre-lock token. Do not rely only on the login form after lock; session invalidation bugs never appear on that form.

## MFA interaction with lockout and unlock

Multi-factor auth changes both the failure budget and the unlock story. Decide whether password failures alone drive the lock, whether MFA failures have a separate counter, and whether a correct password plus wrong MFA counts toward account lockout. Account lockout testing must encode those rules as separate rows. A correct password with wrong TOTP should not reset the password failure streak unless policy says the password stage succeeded and the streak clears. Conversely, wrong MFA after a locked password stage should not reveal that the password was right by skipping to an MFA challenge that unknown users never see.

Unlock via MFA step-up needs negative cases: locked user presents valid password, is prompted for MFA only if that flow is public-safe, wrong MFA keeps lock, correct MFA clears lock and writes \`auth.unlock\` with reason \`mfa_step_up\`. Recovery codes should consume on use and fail on replay. WebAuthn unlock tests should use virtual authenticators in Playwright and still assert server-side challenge freshness. If MFA enrollment is incomplete, lockout behavior should fail closed without offering an unlock path that bypasses enrollment.

Align GraphQL or REST stage machines with the same counters. A mutation that returns \`MFA_REQUIRED\` must not become an oracle for valid passwords on locked or unknown accounts. Keep timing and response shape comparisons in the enumeration suite when MFA is enabled.

## Practical checklist before you ship

Use this as a final gate in PR review:

1. Matrix rows exist for N-1 success, N lock, and window expiry.
2. Keying tests cover account, IP, and compound policy as documented.
3. Backoff versus hard lock is explicit in test titles.
4. At least one unlock path is automated (admin or time); email/MFA/CAPTCHA as applicable.
5. Enumeration comparisons pass for unknown vs known vs locked probes.
6. Parallel attempts cannot skip the lock transition.
7. Audit fields show lock and unlock with reason and actor.
8. Playwright covers CSRF-backed form submit; GraphQL login mutations reuse the same threshold math.
9. k6 (or similar) records \`login_lock_rate\` under spray.
10. CI uploads reports with \`actions/upload-artifact@v4\` and can target \`--grep\` / \`-t\` filters.

Skip any row only with a written risk acceptance, not because the happy path looked fine on a laptop.

## Frequently Asked Questions

### How many failed logins should account lockout testing try before asserting a lock?

Match the documented product threshold exactly, then automate the neighbors: N-1 must still allow a correct password, N must refuse it, and N+1 must stay refused until unlock. If staging uses a reduced threshold (for example 3 instead of 5) to keep CI fast, inject that value through environment config shared by app and tests so you never hard-code a production five in a three-fail environment. Add one window-expiry case so failures older than the sliding window do not accidentally count toward N.

### Should lockout tests run in production or only in staging?

Prefer staging or ephemeral environments with hook headers, clock control, and mail catchers. Production account lockout testing that burns real user passwords risks denial of service against customers and noisy detection alerts. If you must smoke production, use dedicated canary accounts, very low attempt counts that stop before lock, and read-only checks of security headers and login CSRF. Keep full threshold burns, parallel races, and unlock path proofs in non-prod where you can reset fixtures freely.

### How do you test per-IP lockout behind a corporate NAT or CDN?

Decide which hop defines the client IP (edge CDN header, load balancer, or app-visible address) and document it. In tests, either send a trusted test-only IP header that the app accepts in non-prod, or run workers with distinct egress. Assert that fifty employees on one NAT do not lock each other when policy is per-account, and that a spray from one IP still trips per-IP limits. Never trust raw \`X-Forwarded-For\` from the public internet in production configuration; your tests should follow the same trust boundary the security review signed off on.

### What is the difference between rate limiting and account lockout in tests?

Rate limiting protects capacity (requests per minute per IP or token) and usually returns 429 with \`Retry-After\`. Account lockout protects credential guessing against a subject and usually returns 401/403/423 with a lock reason until unlock. Your suites should not conflate them: a 429 storm with quota headers is not proof that failCount reached N, and a locked account is not proof that the global API quota is healthy. Test both, name both in reports, and keep separate metrics so on-call knows which control fired.
`,
};
