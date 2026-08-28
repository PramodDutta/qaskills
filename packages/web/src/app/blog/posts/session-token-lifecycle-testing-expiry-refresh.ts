import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Session Token Lifecycle Testing: Expiry, Refresh Rotation, and Revocation',
  description:
    'Session token lifecycle testing for expiry, refresh rotation, reuse detection, and revocation with Playwright, Vitest, and API status matrices.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Session Token Lifecycle Testing: Expiry, Refresh Rotation, and Revocation

Session token lifecycle testing means proving that access tokens, refresh tokens, session cookies, and opaque session ids move through create, use, expire, refresh, and revoke exactly as the product promises. You verify absolute and idle expiry, refresh rotation with reuse detection, logout and admin revoke, concurrent refresh races, and the status codes clients see when credentials are expired, invalid, or revoked. This guide gives QA and test-automation engineers (and the AI agents that write suites with them) concrete workflows you can run against APIs and Playwright UI sessions.

If your suite only logs in and hits one authenticated GET, you have not tested the lifecycle. Lifecycle bugs show up hours later, on a second device, after a password reset, or when two tabs refresh at the same time. Those failures look like flaky networks until you pin time, token families, and storage state.

## Token kinds and the contract each one carries

Before you write assertions, name the artifacts under test. Mixing them in one "auth token" fixture hides half the bugs.

| Artifact | Typical home | Lifetime intent | What a test must prove |
| --- | --- | --- | --- |
| Access token (often JWT) | Authorization header | Short absolute life | Rejected after \`exp\`, accepted before, not refreshed by itself |
| Refresh token | HttpOnly cookie or secure store | Longer life, single-use or rotating | Issues a new access token once per rules, dies on reuse or logout |
| Session cookie | Browser cookie jar | Absolute and/or idle timeout | Sent only to the right origin/path, cleared on logout |
| Opaque session id | Cookie or server store key | Server-side TTL | Server lookup fails after delete/TTL even if the client still holds the string |

Access tokens authorize a request. Refresh tokens mint new access tokens without re-entering credentials. Session cookies bind a browser to a server session. Opaque ids are random strings the server maps to session rows. Your product may use one, two, or all four. Session token lifecycle testing treats each as a first-class subject with its own expiry and revoke path.

Document the wire shape in the suite README so agents do not invent headers:

\`\`\`http
POST /auth/login HTTP/1.1
Host: api.example.test
Content-Type: application/json

{"email":"qa-lifecycle@example.test","password":"***"}

HTTP/1.1 200 OK
Set-Cookie: refresh_token=rt_family1_v1; Path=/auth; HttpOnly; Secure; SameSite=Lax
Set-Cookie: sid=opaque_sess_abc; Path=/; HttpOnly; Secure; SameSite=Lax
Content-Type: application/json

{"access_token":"eyJ...","expires_in":900,"token_type":"Bearer"}
\`\`\`

Pin \`expires_in\`, cookie flags, and path scopes. A refresh cookie scoped to \`/\` when it should be \`/auth\` is a product bug your lifecycle suite should catch before security review does.

## Absolute expiry versus idle timeout and clock skew

Absolute expiry is a hard stop from issue time (or from login). Idle timeout resets when the session sees activity. Products often combine both: access tokens with a 15-minute absolute \`exp\`, refresh tokens with a 7-day absolute life, and a server session with a 30-minute idle window.

Clock skew is the gap between issuer clocks, verifier clocks, and the machine running your tests. A token that expires at \`T\` may still be accepted until \`T + leeway\` if the API allows a few seconds of skew. Tests that assert "exactly at exp the next millisecond fails" will flake across CI runners.

| Clock mode | How to drive it in tests | Assertion style |
| --- | --- | --- |
| Real wall clock | Sleep or wait for short test TTLs | Tolerance windows (for example, fail after TTL + 2s) |
| Injected past \`exp\` | Build or mint a token with \`exp\` in the past via a test-only issuer | Immediate 401 without sleeping |
| Frozen server time | Test hook or dependency-injected clock on the auth service | Deterministic transitions at known instants |
| Client skew | Set system time only in disposable containers | Prefer server-side freeze over mutating the host |

Prefer short TTLs in a dedicated auth test tenant (60s access, 120s refresh) over multi-hour waits. Prefer injecting a past \`exp\` claim through a signed test key over rewriting production JWTs. If you are unsure of a specific JWT library API in your stack, keep the test at the HTTP boundary: call a test-only \`POST /test/auth/mint\` that returns a token with the claims you ask for, then call a protected route.

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;

type MintBody = {
  sub: string;
  expOffsetSec: number;
  kind: 'access' | 'refresh';
};

async function mintTestToken(body: MintBody): Promise<string> {
  const res = await fetch(\`\${BASE}/test/auth/mint\`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-test-secret': process.env.AUTH_TEST_SECRET!,
    },
    body: JSON.stringify(body),
  });
  assert.equal(res.status, 200, \`mint failed: \${res.status}\`);
  const json = (await res.json()) as { token: string };
  assert.ok(json.token, 'mint response missing token');
  return json.token;
}

async function callMe(accessToken: string) {
  return fetch(\`\${BASE}/v1/me\`, {
    headers: { authorization: \`Bearer \${accessToken}\` },
  });
}

const expired = await mintTestToken({
  sub: 'user-lifecycle-1',
  expOffsetSec: -120,
  kind: 'access',
});
const expiredRes = await callMe(expired);
assert.equal(expiredRes.status, 401);

const live = await mintTestToken({
  sub: 'user-lifecycle-1',
  expOffsetSec: 600,
  kind: 'access',
});
const liveRes = await callMe(live);
assert.equal(liveRes.status, 200);
\`\`\`

For idle timeout, drive activity explicitly. Hit a lightweight authenticated endpoint, wait just under the idle window, hit again (still 200), then wait past the window and expect 401. Do not rely on page navigation noise in UI tests as your only activity signal; APIs and SPAs disagree about what counts as activity.

## Refresh rotation, reuse detection, and family revocation

Refresh rotation means each successful refresh returns a new refresh token and invalidates the previous one. Reuse detection means presenting an already-rotated refresh token is treated as theft: the server revokes the entire token family (all descendants of the original login refresh). Family revocation is the blast radius control when a stolen refresh is replayed.

Session token lifecycle testing for refresh must cover the happy path and the theft path:

1. Login -> access A1 + refresh R1.
2. Refresh with R1 -> access A2 + refresh R2; R1 must no longer work.
3. Refresh again with R1 (reuse) -> failure, and R2 must also stop working.
4. Refresh with R2 after step 2 (without reuse) -> still works until its own rules say otherwise.

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;

type TokenPair = { access: string; refresh: string };

async function login(email: string, password: string): Promise<TokenPair> {
  const res = await fetch(\`\${BASE}/auth/login\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200);
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
  };
  return { access: json.access_token, refresh: json.refresh_token };
}

async function refresh(refreshToken: string) {
  return fetch(\`\${BASE}/auth/refresh\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

const email = process.env.QA_USER_EMAIL!;
const password = process.env.QA_USER_PASSWORD!;

const pair1 = await login(email, password);
const r1 = await refresh(pair1.refresh);
assert.equal(r1.status, 200);
const pair2 = (await r1.json()) as {
  access_token: string;
  refresh_token: string;
};

const reuse = await refresh(pair1.refresh);
assert.ok([401, 403].includes(reuse.status), \`reuse status \${reuse.status}\`);

const afterTheft = await refresh(pair2.refresh_token);
assert.ok(
  [401, 403].includes(afterTheft.status),
  'family must die after refresh reuse',
);
\`\`\`

If your API stores refresh tokens only as cookies, adapt the client to a cookie jar (undici \`Agent\` with cookies, Playwright \`APIRequestContext\`, or a small jar helper). The assertions stay the same: old refresh fails, and after reuse the latest refresh fails too.

## Logout, revoke-all-devices, and admin kill switches

Logout is local intent: this client is done. Revoke-all-devices is account-wide: every refresh family and server session for that user dies. Admin revoke is operator intent: support or security kills sessions without the user clicking logout.

Test each path separately. A common bug is logout that clears the browser cookie but leaves the refresh token row active, so a stolen copy still mints access tokens. Another is revoke-all that kills refresh rows but leaves opaque \`sid\` cookies valid until idle timeout.

\`\`\`bash
# Smoke the three revoke paths with httpie-style calls (replace cookies/tokens)
curl -sS -o /dev/null -w "%{http_code}\\n" -X POST "$API_BASE_URL/auth/logout" \\
  -H "authorization: Bearer $ACCESS" -H "cookie: refresh_token=$RT; sid=$SID"

curl -sS -o /dev/null -w "%{http_code}\\n" -X POST "$API_BASE_URL/auth/revoke-all" \\
  -H "authorization: Bearer $ACCESS"

curl -sS -o /dev/null -w "%{http_code}\\n" -X POST "$API_BASE_URL/admin/users/$USER_ID/sessions/revoke" \\
  -H "authorization: Bearer $ADMIN_ACCESS"
\`\`\`

After each revoke, assert:

- Protected \`GET /v1/me\` with the old access token fails (or succeeds only until access absolute expiry if you intentionally keep access tokens stateless; document that choice).
- Refresh with the old refresh token fails immediately.
- A new login still works (you did not lock the account).
- Other devices: for revoke-all and admin revoke, a second browser context's refresh must fail; for single-device logout, the second device may remain valid.

When session cookies are involved and the app can be framed, pair auth checks with UI framing controls. Cookie-authenticated flows that render sensitive state inside third-party frames need clickjacking coverage; see [session cookies and frame options in clickjacking tests](/blog/security-testing-clickjacking-frame-options) for the framing side of that contract.

## Concurrent refresh races under parallel clients

Two tabs, a service worker, and a mobile client can refresh the same R1 at the same moment. Without single-flight or atomic rotation, both may receive "valid" pairs while the server stores only one winner, or both may fail, or one may trigger reuse detection against the other. Session token lifecycle testing must include a parallel refresh case.

\`\`\`ts
import assert from 'node:assert/strict';

const BASE = process.env.API_BASE_URL!;

async function refreshOnce(refreshToken: string) {
  const res = await fetch(\`\${BASE}/auth/refresh\`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// pair.refresh comes from a prior login helper in the same file
const pair = await login(process.env.QA_USER_EMAIL!, process.env.QA_USER_PASSWORD!);

const [a, b] = await Promise.all([
  refreshOnce(pair.refresh),
  refreshOnce(pair.refresh),
]);

const statuses = [a.status, b.status].sort();
// Document your product rule, then lock it:
// Example policy: exactly one 200, the other 401 (loser), no double-success.
const okCount = [a.status, b.status].filter((s) => s === 200).length;
assert.equal(okCount, 1, \`expected one winner, statuses=\${statuses.join(',')}\`);

const winner = a.status === 200 ? a : b;
const winnerRefresh = (winner.body as { refresh_token: string }).refresh_token;
const followUp = await refreshOnce(winnerRefresh);
assert.equal(followUp.status, 200, 'winner refresh must remain usable');
\`\`\`

Run this under Vitest with a focused name when debugging:

\`\`\`bash
npx vitest run -t "concurrent refresh allows a single winner"
\`\`\`

Vitest's \`-t\` / \`--testNamePattern\` filters by test name. Playwright's equivalent filter is \`--grep\` / \`-g\`. Do not mix those flags across runners.

If your product uses a refresh mutex keyed by family id, also assert that the loser does not revoke the family. Reuse detection should fire on *replay of an already rotated token after a successful rotation*, not on a lost race that never committed.

## Status code matrix for expired, invalid, and revoked

Teams argue endlessly about 401 vs 403. Pick a matrix, publish it, and test it. Changing codes later breaks mobile clients and agent-generated retries.

| Credential state | Protected resource | Refresh endpoint | Notes for clients |
| --- | --- | --- | --- |
| Missing Authorization / cookie | 401 | 401 | Prompt login |
| Malformed bearer string | 401 | 401 | Do not retry refresh |
| Valid access, wrong scope | 403 | n/a | Different permission, not expiry |
| Access past \`exp\` | 401 | n/a | Try refresh once |
| Refresh past absolute expiry | n/a | 401 | Full login |
| Refresh reused (rotated already) | n/a | 401 or 403 | Treat as revoke; clear local state |
| Refresh after logout / revoke-all | n/a | 401 | Clear local state |
| Access still within \`exp\` after revoke-all (stateless JWT) | 200 until \`exp\` *or* 401 if denylist | n/a | Document allow-until-exp vs denylist |
| Admin-revoked session id | 401 | 401 | Immediate |

Encode the matrix as data-driven tests so agents add rows instead of inventing new ad hoc asserts:

\`\`\`ts
import { describe, it, expect } from 'vitest';

type Case = {
  name: string;
  setup: 'expired-access' | 'revoked-refresh' | 'bad-bearer';
  path: '/v1/me' | '/auth/refresh';
  expected: number[];
};

const cases: Case[] = [
  {
    name: 'expired access on me',
    setup: 'expired-access',
    path: '/v1/me',
    expected: [401],
  },
  {
    name: 'revoked refresh',
    setup: 'revoked-refresh',
    path: '/auth/refresh',
    expected: [401, 403],
  },
  {
    name: 'malformed bearer',
    setup: 'bad-bearer',
    path: '/v1/me',
    expected: [401],
  },
];

describe('auth status matrix', () => {
  for (const c of cases) {
    it(c.name, async () => {
      const token = await materialize(c.setup); // test helper that mints or revokes
      const res =
        c.path === '/auth/refresh'
          ? await fetch(\`\${process.env.API_BASE_URL}\${c.path}\`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ refresh_token: token }),
            })
          : await fetch(\`\${process.env.API_BASE_URL}\${c.path}\`, {
              headers: { authorization: \`Bearer \${token}\` },
            });
      expect(c.expected).toContain(res.status);
    });
  }
});
\`\`\`

Keep \`materialize\` in one helper module. That is where mint, logout, and admin revoke live so individual tests stay readable.

## Freezing time and injecting past claims without flaky sleeps

Sleep-based expiry tests are slow and CI-hostile. Prefer:

1. Test issuer endpoint that accepts \`expOffsetSec\` (shown earlier).
2. Auth service clock injection in integration environments (\`AUTH_CLOCK_EPOCH\` env read once per request in test builds only).
3. Short TTLs (30-60s) only when you must exercise real timers end to end.

What people get wrong: they stub \`Date.now\` in the *test process* and expect the *remote API* to expire tokens. That only works for in-process unit tests of a pure verifier function. For HTTP lifecycle tests, the server clock (or the minted \`exp\`) is the source of truth.

Unit-level verifier tests still matter. If you own a function \`assertAccessToken(token, now)\`, freeze \`now\` and feed tokens with known payloads. Integration tests then assume the verifier is correct and focus on refresh stores, cookie clearing, and multi-device revoke.

\`\`\`json
{
  "suite": "session-token-lifecycle",
  "fixtures": {
    "accessTtlSec": 60,
    "refreshTtlSec": 180,
    "idleTimeoutSec": 90,
    "skewLeewaySec": 5
  },
  "hooks": {
    "mint": "/test/auth/mint",
    "revokeAll": "/auth/revoke-all",
    "adminRevoke": "/admin/users/:id/sessions/revoke"
  }
}
\`\`\`

Store that fixture config next to the suite so AI agents read TTL numbers from one place instead of hard-coding conflicting values across files.

## Playwright storageState after the session dies

UI suites often save \`storageState\` after login and reuse it for speed. That file is a snapshot of cookies and local/session storage at save time. It does not refresh itself. After access expiry, idle timeout, or revoke-all, a worker that loads stale \`storageState\` will fail mid-spec in ways that look like locator flakes.

Lifecycle-aware Playwright patterns:

1. Save storage state only for suites that stay within access TTL, or refresh inside \`globalSetup\` immediately before workers start.
2. Add an explicit spec that loads a deliberately expired state and expects redirect to login.
3. After logout UI actions, assert both navigation *and* that subsequent API calls from the page context return 401.
4. For multi-device revoke, keep two \`browser.newContext({ storageState })\` instances and revoke from one while asserting the other loses auth on next navigation or XHR.

\`\`\`ts
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const expiredState = path.join(__dirname, '../.auth/expired-user.json');

async function cookieHeaderFromState(statePath: string): Promise<string> {
  const state = JSON.parse(await fs.promises.readFile(statePath, 'utf8'));
  return (state.cookies ?? [])
    .map((c: { name: string; value: string }) => \`\${c.name}=\${c.value}\`)
    .join('; ');
}

test('expired storageState sends user through login', async ({ browser }) => {
  test.skip(!fs.existsSync(expiredState), 'expired state fixture missing');

  const context = await browser.newContext({ storageState: expiredState });
  const page = await context.newPage();
  await page.goto('/app/home');
  await expect(page).toHaveURL(/\\/login/);
  await context.close();
});

test('revoke-all invalidates a second context', async ({ browser, request }) => {
  const statePath = path.join(__dirname, '../.auth/user.json');
  const ctxA = await browser.newContext({ storageState: statePath });
  const ctxB = await browser.newContext({ storageState: statePath });

  const pageA = await ctxA.newPage();
  await pageA.goto('/app/home');
  await expect(pageA.getByTestId('user-menu')).toBeVisible();

  const revoke = await request.post('/auth/revoke-all', {
    headers: { cookie: await cookieHeaderFromState(statePath) },
  });
  expect(revoke.status()).toBeLessThan(300);

  const pageB = await ctxB.newPage();
  await pageB.goto('/app/home');
  await expect(pageB).toHaveURL(/\\/login/);

  await ctxA.close();
  await ctxB.close();
});
\`\`\`

Deep guidance on saving and reusing auth state belongs with [Playwright authentication testing and storageState](/blog/playwright-authentication-testing-storage-state-2026); this lifecycle guide only adds the expiry and revoke angles those happy-path setups skip.

Filter Playwright specs when iterating:

\`\`\`bash
npx playwright test --grep "revoke-all invalidates"
\`\`\`

## Failure story: the refresh that passed CI and failed every Monday

Symptom: production users reported random logouts on Monday mornings. API monitors showed spikes of 401 on \`/auth/refresh\`. The UI test suite was green all weekend.

Wrong theory: the team blamed a CDN cache that was "eating Set-Cookie" on refresh responses. They spent two days comparing cache keys and adding \`Cache-Control: no-store\` (which the refresh route already sent).

Actual cause: refresh rotation was correct, but a weekend cron compacted the refresh-token table and reused primary keys for new rows while the reuse-detection map still keyed by the old id space. Tokens issued Friday were rotated into ids that collided with recycled rows. Monday traffic looked like refresh reuse, so the service revoked entire families. CI never caught it because the test database was truncated every run and never ran the compaction job.

Fix: stop reusing refresh row ids; use opaque unpredictable refresh ids; add a lifecycle test that inserts a refresh row, runs the compaction job against a clone, and asserts the old refresh still maps to the same family or fails closed without revoking unrelated families. Also add a metric for "reuse detection events per minute" with an alert on sudden spikes after maintenance windows.

The QA takeaway is not "run prod crons in CI nightly" for every job. It is: any job that touches auth storage is part of the session token lifecycle and needs at least one fixture that survives across the job boundary.

## What people get wrong when they claim auth is covered

1. **Login success equals lifecycle coverage.** A green login test says credentials work. It says nothing about expiry, rotation, or revoke.
2. **Stubbing client time to test server expiry.** The API does not read your Jest fake timers.
3. **Treating 401 and 403 as interchangeable.** Mobile refresh loops and agent retries branch on status. Lock the matrix.
4. **Saving Playwright storageState forever.** It is a snapshot. After revoke or TTL, it is a landmine.
5. **Ignoring refresh races.** Single-threaded tests never expose double-refresh family kills.
6. **Logout that only clears local storage.** Server refresh rows that survive logout are still valid credentials.
7. **Asserting JWT \`exp\` only.** Opaque sessions and idle timeouts fail later than access tokens and need their own clocks.

If you want a ready-made starting kit for these checks beside your app repo, install QA skills from qaskills.sh with the qaskills CLI and keep the suite definitions next to your auth fixtures so agents extend rows instead of inventing parallel frameworks.

## Runnable suite layout agents can own

Keep one folder with names that match the lifecycle, not the framework:

\`\`\`bash
tests/auth-lifecycle/
  matrix.status.test.ts
  refresh.rotation.test.ts
  refresh.concurrent.test.ts
  revoke.logout.test.ts
  revoke.all-devices.test.ts
  playwright/expired-storage.spec.ts
  fixtures/ttl.json
  helpers/mint.ts
  helpers/cookie-jar.ts
\`\`\`

Ownership rules that keep agents honest:

- Every new auth endpoint must add a row to the status matrix or an explicit "out of scope" note in \`ttl.json\`.
- Refresh changes require both rotation and concurrent specs to stay green.
- UI auth changes require an expired-storage Playwright spec, not only a fresh login path.
- Admin revoke requires a second-context or second-token assertion, never only a 200 on the admin call.

Wire Vitest and Playwright scripts explicitly:

\`\`\`bash
npx vitest run tests/auth-lifecycle -t "rotation"
npx playwright test tests/auth-lifecycle/playwright --grep "expired storageState"
\`\`\`

When an AI coding agent proposes a new auth middleware, point it at this folder first. Ask for the matrix row, the revoke assertion, and the storageState expiry case before merging the feature flag.

## Frequently Asked Questions

### Should access tokens stop working immediately after revoke-all?

It depends on whether access tokens are validated only by signature and \`exp\` (stateless) or also checked against a denylist or session version. Stateless JWTs can remain accepted until absolute expiry after revoke-all unless you add server-side rejection. Your tests must document the chosen policy and assert it. If product promises "instant logout everywhere," you need denylist or short access TTLs plus refresh kill, and the suite should prove \`/v1/me\` fails right after revoke-all even with a not-yet-expired access token.

### How short should test TTLs be for session token lifecycle testing?

Short enough that end-to-end timer tests finish in CI without huge sleeps, long enough that normal request latency does not trip idle timeout during a single scenario. Many teams use 60s access, 120-180s refresh, and about 90s idle in a dedicated tenant. Prefer minted past \`exp\` tokens for pure expiry assertions, and reserve real TTLs for idle timeout and cookie jar behavior that must age on a live server clock.

### Can one Playwright storageState file cover UI and API lifecycle checks?

A fresh storageState is fine for happy-path UI and for \`APIRequestContext\` calls that share cookies. It is a poor fit for expiry and revoke unless you intentionally create expired and revoked variants, or refresh credentials inside setup. Lifecycle coverage needs at least three artifacts: valid state, time-expired state, and post-revoke state. Reusing one golden file for all three hides the failures you are trying to catch.

### What is the minimum set of tests before shipping a refresh change?

Ship at least: login mint shape, successful refresh rotation with old refresh rejected, reuse detection that kills the family, one concurrent double-refresh race with a documented winner rule, logout server-side invalidation, and revoke-all across two clients. Add idle timeout and admin revoke before you call the auth surface "done." Anything less leaves Monday-morning compaction and multi-tab races for production users to discover.
`,
};
