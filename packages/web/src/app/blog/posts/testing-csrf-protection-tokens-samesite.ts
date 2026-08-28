import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing CSRF Protection: Tokens, SameSite Cookies, and Attack Scenarios',
  description: 'CSRF testing guide for QA engineers: verify tokens, SameSite cookies, origin checks, and attack scenarios with runnable workflows that prove no mutation.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing CSRF Protection: Tokens, SameSite Cookies, and Attack Scenarios

CSRF testing means proving that a logged-in user's browser cannot be tricked by another site into performing a state-changing action. Test it by attacking real mutation endpoints with missing tokens, bad tokens, reused tokens, cross-site form posts, SameSite cookie checks, and Origin or Referer validation. Passing tests must verify both rejection and no state change.

OWASP's CSRF guidance is clear on the fundamentals: use server-generated unpredictable tokens for state-changing requests, do not put tokens in URLs, treat SameSite as defense in depth, and add origin verification where appropriate. Official reference: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

## Start With a Mutation Inventory

You cannot test CSRF protection endpoint by endpoint if you do not know which endpoints mutate state. The inventory should include POST, PUT, PATCH, DELETE, and any GET endpoint that changes server state. That last category is where many real failures live. SameSite=Lax can still send cookies on top-level safe-method navigations, so a state-changing GET is a design bug before it is a CSRF bug.

Ask an AI coding agent to inventory routes, but make it prove its work with file references and methods. Then have a human review ambiguous handlers. Route names lie. A handler called getInvoice may mark an invoice viewed. A tracking pixel may update user preferences. A preview route may persist a draft.

| Endpoint Type | Example | CSRF Requirement | QA Evidence |
|---|---|---|---|
| Form POST | Change email | Valid token and authenticated session | Bad token rejected, email unchanged |
| JSON PATCH | Update profile | Token header or equivalent origin-bound control | Cross-site request cannot mutate |
| DELETE | Remove API key | Token plus re-auth for high risk | API key still exists after attack |
| GET mutation | Unsubscribe or toggle | Redesign to non-GET or require signed one-time link | Safe methods do not mutate authenticated state |
| Webhook | Provider callback | Not browser-session CSRF, use signature verification | Session cookie not accepted as authority |

The inventory becomes your test plan. It also prevents the common mistake of testing only the login form. Login CSRF exists, but most product damage comes from authenticated state changes such as payout edits, email changes, team invitations, role changes, and connected-account actions.

## Token Tests That Actually Prove Protection

A CSRF token test is not "page contains a hidden input." That only proves the template rendered something. A real test proves the server rejects missing, malformed, mismatched, expired, and replayed tokens according to the app's policy. It also proves the endpoint did not mutate state on rejection.

Per-session tokens can be valid for several requests. Per-request tokens may reject replay. Either can be legitimate if implemented intentionally. Your QA job is to lock down the intended contract so a framework migration or agent refactor does not weaken it quietly.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('profile update rejects missing CSRF token and preserves state', async ({ request }) => {
  const login = await request.post('/test/login', {
    data: { user: 'csrf-user@example.com' }
  });
  expect(login.ok()).toBeTruthy();

  const before = await request.get('/api/profile');
  expect(before.ok()).toBeTruthy();
  const beforeBody = await before.json();

  const attack = await request.patch('/api/profile', {
    data: { displayName: 'Changed By Attack' },
    headers: { 'x-test-skip-csrf': 'true' }
  });

  expect([400, 403, 419]).toContain(attack.status());

  const after = await request.get('/api/profile');
  expect(after.ok()).toBeTruthy();
  expect(await after.json()).toEqual(beforeBody);
});
\`\`\`

The x-test-skip-csrf header in that example is a test harness convention, not a production header. In a real app, use a test route or fixture to create an authenticated context without adding bypasses to production code.

## SameSite Cookies Are Not a Token Replacement

SameSite changes when the browser sends cookies on cross-site requests. Strict is tighter but can break legitimate inbound navigation. Lax balances usability and blocks many unsafe cross-site requests. None requires Secure and is used for cross-site contexts such as embedded flows. SameSite is helpful, but OWASP treats it as defense in depth rather than a universal replacement for CSRF tokens.

| Cookie Setting | Browser Behavior | Good Use | CSRF Testing Focus |
|---|---|---|---|
| SameSite=Strict | Cookie withheld in cross-site contexts | High-risk apps with few external entry paths | Inbound links and login UX |
| SameSite=Lax | Cookie sent for top-level safe navigations, withheld for many unsafe requests | Most normal web apps when paired with tokens | No GET mutations, POST attack rejected |
| SameSite=None; Secure | Cookie allowed cross-site over HTTPS | Embedded or third-party contexts | Token or origin proof becomes mandatory |
| No explicit SameSite | Browser defaults vary by client | Avoid for session cookies | Confirm explicit Set-Cookie attribute |

Use response header checks to prevent accidental cookie regressions:

\`\`\`javascript
function parseSetCookie(headers) {
  return headers
    .filter((value) => value.toLowerCase().startsWith('__host-session='))
    .map((value) => value.toLowerCase());
}

const headers = [
  '__Host-Session=abc123; Secure; HttpOnly; SameSite=Lax; Path=/'
];

const sessionCookies = parseSetCookie(headers);
if (sessionCookies.length !== 1) {
  throw new Error('Expected one session cookie');
}
if (!sessionCookies[0].includes('samesite=lax')) {
  throw new Error('Session cookie must set SameSite');
}
if (!sessionCookies[0].includes('secure')) {
  throw new Error('Session cookie must be Secure');
}
\`\`\`

The cookie prefix matters too. The __Host- prefix requires Secure, Path=/, and no Domain attribute in supporting browsers. That prevents sibling subdomains from setting a fake parent-domain session cookie. It is not a CSRF token, but it removes a nasty class of cookie confusion.

## Build a Local Attack Page

The fastest way to teach CSRF is to attack your own staging app from a different origin. Do not only use API clients. CSRF is a browser behavior, so include browser tests. A local HTML file on a different port is enough to simulate an attacker origin.

\`\`\`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>CSRF Attack Fixture</title>
  </head>
  <body>
    <form id="attack" action="http://localhost:3000/api/profile" method="post">
      <input type="hidden" name="displayName" value="Cross Site Change">
    </form>
    <script>
      document.getElementById('attack').submit();
    </script>
  </body>
</html>
\`\`\`

Serve it from a different port:

\`\`\`bash
python3 -m http.server 9009
\`\`\`

Then run a browser test that signs in to the app origin, visits the attack origin, and checks state:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('cross-site form post cannot change profile', async ({ page }) => {
  await page.goto('http://localhost:3000/test/login?user=csrf-user@example.com');
  await expect(page.locator('body')).toContainText('logged in');

  // page.request shares the browser context's cookie jar. The standalone
  // request fixture has its own jar, so its profile reads would be
  // unauthenticated and could "match" even after a successful attack.
  const before = await page.request.get('http://localhost:3000/api/profile');
  const beforeBody = await before.json();

  await page.goto('http://localhost:9009/attack.html');
  await page.waitForLoadState('domcontentloaded');

  const after = await page.request.get('http://localhost:3000/api/profile');
  expect(await after.json()).toEqual(beforeBody);
});
\`\`\`

This catches failures that API-only tests miss, especially SameSite assumptions, content-type handling, redirects, and method override behavior.

## Origin and Referer Checks

Origin and Referer validation can add a strong layer for state-changing requests. The server checks that the request came from an allowed origin before accepting the mutation. This is especially useful for JSON APIs where the browser's same-origin policy already limits custom headers, but do not implement it as a brittle string contains check.

Validate scheme, host, and port. Reject missing Origin on unsafe methods unless you have a documented exception. Treat Referer as a fallback only when your policy allows it. Behind proxies, confirm the application sees the public origin correctly, or your own deployment will fail legitimate requests.

\`\`\`javascript
function isAllowedOrigin(value, allowedOrigins) {
  if (typeof value !== 'string' || value.length === 0) return false;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  return allowedOrigins.includes(parsed.origin);
}

const allowed = ['https://app.example.com'];

if (!isAllowedOrigin('https://app.example.com/settings', allowed)) {
  throw new Error('Expected app origin to pass');
}
if (isAllowedOrigin('https://app.example.com.evil.test', allowed)) {
  throw new Error('Origin suffix trick must fail');
}
\`\`\`

A QA suite should include the suffix trick. It is the shortest way to catch weak origin parsing.

## Content Types and Simple Requests

CSRF often works through simple browser requests: form posts with application/x-www-form-urlencoded, multipart/form-data, or text/plain. If your API only accepts application/json with a custom CSRF header, a plain form post should fail before it mutates. But many apps accidentally accept form-encoded bodies on JSON endpoints because middleware is shared globally.

| Attack Shape | Browser Can Send Cross-Site? | Should Mutate? | Test |
|---|---:|---:|---|
| Form POST urlencoded | Yes | No without token | Submit attack form |
| Form POST multipart | Yes | No without token | Upload-like attack fixture |
| text/plain POST | Yes | No without token | Raw body parser check |
| JSON with custom header | Preflight required | No unless CORS allows it and token is valid | CORS and token test |
| GET link | Yes | Never for state change | Crawl mutation inventory |

Here is a tiny Express server that demonstrates a token check before mutation. It is not a full auth system, but it runs as written after installing express.

\`\`\`javascript
const express = require('express');
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

let profile = { displayName: 'Original' };
const validToken = 'known-test-token';

app.get('/api/profile', (req, res) => {
  res.json(profile);
});

app.post('/api/profile', (req, res) => {
  const token = req.get('x-csrf-token') || req.body.csrfToken;
  if (token !== validToken) {
    res.status(403).json({ error: 'bad csrf token' });
    return;
  }
  profile = { displayName: String(req.body.displayName || '') };
  res.json(profile);
});

app.listen(3000, () => {
  console.log('listening on http://localhost:3000');
});
\`\`\`

Pair it with a negative curl check:

\`\`\`bash
curl -i -X POST http://localhost:3000/api/profile -d "displayName=Attack"
\`\`\`

The expected result is 403 and unchanged profile. If the profile changes, your token check is in the wrong place or missing from one parser path.

## Client-Side CSRF Is the Trap

Client-side CSRF happens when your own JavaScript reads attacker-controlled input and sends a same-origin state-changing request. Tokens and SameSite may not save you because the request is made by your legitimate app script, from your origin, with your headers and cookies. OWASP calls this out because modern single-page apps often build API URLs from query parameters, hashes, postMessage events, or stored redirect values.

Test any client code that turns URL input into request paths. The dangerous pattern is not only eval or script injection. It can be a fetch call where the path comes from location.hash.

\`\`\`javascript
function buildApiPath(hash) {
  if (!hash.startsWith('#/settings/')) return null;
  const section = hash.slice('#/settings/'.length);
  if (!/^[a-z-]+$/.test(section)) return null;
  return '/api/settings/' + section;
}

const good = buildApiPath('#/settings/profile');
if (good !== '/api/settings/profile') {
  throw new Error('Expected profile path');
}

const bad = buildApiPath('#/settings/../../billing/delete');
if (bad !== null) {
  throw new Error('Expected traversal-like section to fail');
}
\`\`\`

What people get wrong: they stop after server token tests. Server-side CSRF defenses are necessary, but a browser app can be tricked into using valid defenses on the attacker's chosen target if client input controls the request.

## Failure Story: SameSite Passed, Money Moved

The symptom was alarming: a test account's payout destination changed after visiting an external proof-of-concept page. The team first blamed SameSite, because the session cookie was set to Lax and the attack used a top-level navigation. The theory sounded right, but the endpoint was a POST, so Lax should not have sent the cookie in the simple attack path.

The actual cause was a GET endpoint left over from an old internal tool: /payout/select?id=bank_2. It changed the active payout destination and redirected to settings. SameSite=Lax allowed the cookie on top-level GET navigation. Tokens were irrelevant because the endpoint did not require one.

The fix was to remove the GET mutation, replace it with a POST requiring CSRF token and re-authentication, and add a route inventory test that fails if any safe-method handler writes to payout tables. The lesson: SameSite can be configured correctly and still lose when the app mutates on GET.

## Regression Tests for Framework Changes

Framework upgrades break CSRF in quiet ways. Middleware order changes. Body parsers move. A new route group misses the protection wrapper. A server action bypasses the old controller stack. An AI agent extracts a helper and forgets that the helper had side effects.

Build a regression pack around invariants:

1. Every unsafe authenticated route requires a valid token or documented equivalent.
2. Safe methods do not mutate authenticated business state.
3. Session cookies set Secure, HttpOnly, and explicit SameSite.
4. Cross-site form posts fail and preserve state.
5. JSON APIs reject missing token or bad origin.
6. Client-side request builders reject attacker-controlled paths.

For adjacent browser security controls, combine CSRF work with [Security Testing Clickjacking and Frame Options](/blog/security-testing-clickjacking-frame-options), because clickjacking can trick a real user into authorizing actions. For upload surfaces that mix parsing and trust boundaries, keep [Security Testing File Upload Polyglot](/blog/security-testing-file-upload-polyglot) close to the same security regression suite.

## High-Risk Workflows Deserve Extra Friction

Not every mutation needs the same user experience. Changing a display name and changing a payout account are both state changes, but the second can move money. For high-risk workflows, CSRF tokens should be paired with user interaction defenses such as re-authentication, a fresh one-time confirmation token, or a signed confirmation link. OWASP lists user interaction as a strong defense for sensitive operations, with the tradeoff that it adds friction.

QA should encode that difference. A normal profile update may require a valid CSRF token. A password change may require a valid token plus current password. A payout change may require token, current password, and a recent session age. If an agent later extracts a shared update handler, tests should catch the loss of the extra check.

| Workflow | Minimum CSRF Control | Extra Check | Negative Test |
|---|---|---|---|
| Display name | Valid token | None | Bad token leaves name unchanged |
| Email change | Valid token | Email confirmation | Cross-site post cannot start change |
| Password change | Valid token | Current password or re-auth | Valid token without password fails |
| Payout destination | Valid token | Re-auth and audit event | Old session cannot change payout |
| Team role update | Valid token | Permission check and audit event | Member session cannot promote itself |

This is where security testing and product testing meet. A test that only checks 403 misses whether the audit event was written. A test that only checks the audit event misses whether the state changed. The assertion needs both.

\`\`\`javascript
function canUseFreshSession(nowSeconds, lastAuthSeconds) {
  const maxAgeSeconds = 10 * 60;
  return nowSeconds - lastAuthSeconds <= maxAgeSeconds;
}

if (!canUseFreshSession(1000, 500)) {
  throw new Error('Expected fresh session to pass');
}

if (canUseFreshSession(2000, 1000)) {
  throw new Error('Expected stale session to require re-authentication');
}
\`\`\`

The exact age limit is a product and security decision. The test should describe the chosen policy, not pretend there is one universal timeout.

## Test CORS and CSRF Together, But Do Not Confuse Them

CORS decides whether browsers may read or send certain cross-origin requests under the rules of the Fetch standard. CSRF decides whether an authenticated browser request can cause an unwanted state change. They overlap, but they are not the same control. A strict CORS policy does not stop a simple cross-site form post. A CSRF token does not make a public cross-origin read safe.

For JSON APIs, test the hostile Origin path and the simple form path. A browser cannot add a custom JSON header in a simple form post, but it can submit form data. If your server accepts that form data as a mutation without a token, the endpoint is vulnerable even if CORS blocks the attacker from reading the response.

\`\`\`javascript
function corsDecision(origin) {
  const allowed = new Set(['https://app.example.com']);
  if (allowed.has(origin)) {
    return {
      status: 204,
      headers: { 'access-control-allow-origin': origin }
    };
  }
  return { status: 403, headers: {} };
}

const allowed = corsDecision('https://app.example.com');
if (allowed.headers['access-control-allow-origin'] !== 'https://app.example.com') {
  throw new Error('Expected known origin to pass CORS');
}

const hostile = corsDecision('https://evil.example');
if (hostile.status !== 403) {
  throw new Error('Expected hostile origin to fail CORS');
}
\`\`\`

Now pair that with the CSRF form-post fixture earlier. If both pass, you have stronger evidence: hostile scripts cannot use permissive CORS to call the API, and hostile pages cannot use simple browser forms to mutate state.

## Agent Review Checklist for CSRF Diffs

CSRF bugs are easy for AI agents to introduce because protection is often implicit. A route group wrapper, middleware order, framework convention, or server action helper may carry the defense. When an agent moves code, it may preserve behavior locally while changing which middleware runs.

Ask for a focused review before merging generated route changes:

\`\`\`text
Review this diff only for CSRF risk.
List every new or changed route that mutates authenticated state.
For each route, identify the token, origin, SameSite, permission, and audit controls that apply.
Flag any GET route with side effects.
Flag any form-encoded or multipart parser that reaches a JSON mutation without the CSRF check.
\`\`\`

The review should produce file and line references in a normal code review. If it only says "looks protected", send it back. Security review without a route list is vibes with better formatting.

## Observability: Rejected Requests Should Leave a Trail

A CSRF rejection is security telemetry. Log enough to see a campaign without logging secrets. Record endpoint, method, decision, reason category, user id if authenticated, session id hash, origin host, referer host, and request id. Do not log the token value. Do not log full cookies. Do not log request bodies for sensitive routes.

QA can test this with a controlled bad-token request and a log sink in staging. The assertion is not that a specific sentence appears. The assertion is that a structured event exists with reason bad_token or missing_origin and no secret material. This makes incident response faster and keeps the test independent of log wording.

## Legacy Apps Need a Different CSRF Plan

Legacy applications rarely have one clean request style. You may find server-rendered forms, JSON endpoints, old AJAX helpers, multipart uploads, method override parameters, and iframe-era flows in the same codebase. Do not try to fix everything with one middleware switch unless you have mapped the routes. A global change can lock out legitimate forms while still missing the riskiest custom handler.

Start with read-only discovery. List every route, method, parser, authentication requirement, and state-changing model call. Then group routes by protection pattern: hidden form token, header token, origin check, signed action link, webhook signature, or no protection. The "no protection" group becomes the first remediation list. The "custom protection" group deserves manual review because old code often has one-off token checks that fail open on parser errors.

For server-rendered apps, add template tests that confirm each form contains the expected token field, then add request tests that prove the token is enforced. For JSON routes, test headers and hostile origins. For multipart routes, verify upload parsing does not happen before CSRF rejection when the upload is large or expensive. Otherwise an attacker can still force storage, virus scanning, or image processing even if the final mutation fails.

Legacy rollout should be staged. Put enforcement in report-only mode if the framework supports it, record would-block events, then fix real traffic that lacks tokens. After that, enforce on the highest-risk routes first. QA should keep separate tests for report-only logging and enforced rejection so the team knows exactly when the switch changes behavior.

## Multi-Tab and Back Button Behavior

Per-request CSRF tokens are tighter than per-session tokens, but they can create usability bugs in multi-tab workflows. A user opens settings in two tabs, submits one form, then submits the older form and gets rejected. That may be acceptable for a money movement screen. It may be unacceptable for a low-risk profile note. The point is to choose deliberately.

QA should test stale-token behavior with two browser contexts or two tabs. Capture the token from tab A, refresh or submit from tab B, then submit tab A. The expected result depends on policy: reject with a recoverable message, refresh the token, or allow if tokens are per-session. The bug is not rejection by itself. The bug is a confusing failure that loses user input, or an unintended replay allowance on a sensitive route.

Back button behavior belongs in the same suite. If a user submits a form, goes back, edits, and submits again, the app should either regenerate a token or show a clear recovery path. Security controls that train users to resubmit randomly are not good controls. They produce support tickets and, eventually, pressure to weaken the defense.

Session timeout behavior belongs there too. If a token expires while the user is editing, the app should not silently drop the work. For low-risk forms, refresh and retry may be acceptable. For high-risk forms, save a draft or show a clear re-authentication path before accepting the mutation.

The same principle applies to mobile webviews and embedded browsers. Test them if they carry authenticated sessions, because cookie and navigation behavior can differ from the desktop browser path your team usually debugs.

## Frequently Asked Questions

### Is SameSite=Lax enough for CSRF protection?

Not for most applications. SameSite=Lax blocks many unsafe cross-site requests, but it still allows cookies on top-level safe-method navigations. If any GET endpoint changes state, Lax will not save you. Browser behavior also varies for older or embedded clients. Treat SameSite as a valuable extra layer. Use CSRF tokens or an equivalent origin-bound defense for authenticated state-changing requests.

### Should CSRF tokens be stored in cookies?

For the synchronizer token pattern, OWASP advises that the token should be generated server-side, associated with the user's session, and sent back in a form field, header, or response payload. The server compares the submitted value with the session value. Double-submit cookie patterns exist, but they need careful signing and binding. Do not assume "token in cookie" proves anything by itself.

### How do I test CSRF on JSON APIs?

Test missing token, bad token, missing Origin, hostile Origin, and simple form submissions against the same mutation. JSON APIs often rely on custom headers, content type, and same-origin policy, but middleware can accidentally accept form bodies too. A good test sends application/x-www-form-urlencoded from a cross-site fixture and then checks the resource did not change. Rejection alone is not enough.

### Can login forms have CSRF issues?

Yes. Login CSRF can force a victim into an attacker-controlled account or bind actions to the wrong identity. Still, most QA teams should prioritize high-impact authenticated mutations first: email change, password change, payout settings, team roles, API keys, and connected accounts. After those are covered, add login CSRF checks for account confusion, redirect handling, and session fixation behavior.
`,
};
