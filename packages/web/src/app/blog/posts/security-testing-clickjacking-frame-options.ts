import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing Clickjacking Frame Options: A Practical Defense Verification Guide',
  description: 'Master security testing clickjacking frame options with runnable header checks, browser probes, CSP coverage, and CI gates that expose framing regressions.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Security Testing Clickjacking Frame Options: A Practical Defense Verification Guide

Security testing clickjacking frame options means proving that sensitive pages cannot be embedded by an unauthorized site, while pages intentionally designed for embedding still work only in approved contexts. The primary controls are the Content Security Policy directive \`frame-ancestors\` and the older \`X-Frame-Options\` response header. A useful test does more than check that one header exists. It validates the final browser-visible response, every sensitive route, redirect behavior, allowed origins, and an actual hostile framing attempt.

The practical payoff is a repeatable suite that catches missing protection on a newly added route, headers stripped by a proxy, an overbroad partner allowlist, and policies attached to the wrong response. Start with a route inventory, assert headers through the deployed edge, then run browser tests from attacker and approved origins. Treat JavaScript frame-busting as defense in depth, never as the main control.

Clickjacking is an interface-redressing attack. A hostile page places the target application in a transparent or disguised frame, aligns visible bait over a meaningful control, and persuades an authenticated user to click. The application receives a real user gesture with the user's cookies and permissions. That is why CSRF tokens alone do not solve the problem: the request can originate from the legitimate page that the victim unknowingly operates.

## Define the framing contract before inspecting headers

The first testing artifact should be a framing contract, not a scanner report. Classify routes by consequence and intended embedding. Account settings, payment confirmation, administrative actions, consent screens, and OAuth authorization interfaces usually require complete framing denial. A report viewer or partner widget might require controlled embedding. Public informational pages may have no security need to block frames, although a consistent site-wide policy is easier to maintain.

| Route class | Intended ancestor policy | Typical test oracle |
|---|---|---|
| account and security settings | no ancestors | hostile and same-origin frames both blocked |
| authenticated transaction pages | no ancestors | browser refuses embedding before interaction |
| internal same-site tool | same origin only | same-origin succeeds, sibling or foreign origin fails |
| partner widget | named HTTPS origins | exact partners succeed, every other origin fails |
| public content | product decision | behavior matches documented risk acceptance |

Write the contract in terms of origins, not brand names or host fragments. An origin is the scheme, host, and port tuple. \`https://partner.example\` and \`http://partner.example\` are different. So are default HTTPS and an explicit nonstandard port. Wildcards deserve separate threat review because they may admit a compromised or user-controlled subdomain.

For modern browsers, \`Content-Security-Policy: frame-ancestors 'none'\` denies all framing. \`frame-ancestors 'self'\` permits ancestors from the protected resource's own origin. A source list can name approved origins. The directive checks every ancestor in a nested frame chain, not merely the immediate parent. Official syntax and browser notes are documented at https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors.

\`X-Frame-Options: DENY\` blocks all framing, while \`SAMEORIGIN\` allows framing from the same origin. The obsolete \`ALLOW-FROM\` form is not a dependable partner allowlist. Use \`frame-ancestors\` for that job. Many teams send both modern CSP and \`X-Frame-Options\` as compatibility defense, provided the two express a consistent policy.

## Observe the response that a browser actually receives

Test the deployed boundary, because application configuration is only one contributor. A CDN can replace CSP, a reverse proxy can remove duplicate headers, an authentication gateway can generate an unprotected login response, and an error handler can bypass the normal middleware. The oracle is the final response returned for the precise URL and method.

Begin with a compact \`curl\` probe. Do not use only \`-I\`: some systems route HEAD differently from GET. A GET that discards the body exercises the representation browsers commonly request.

\`\`\`bash
curl --silent --show-error \\
  --dump-header - \\
  --output /dev/null \\
  https://app.example.test/account/security
\`\`\`

Inspect all response blocks when redirects occur. Protection on a 302 does not compensate for a missing policy on the final 200 response. Conversely, an unprotected redirect is normally not frameable as an interactive document, but it may reveal that security middleware is inconsistently applied. Make assertions against the final route and record the chain for diagnosis.

The following Node script fetches a declared route matrix and fails on a missing or conflicting policy. It uses the built-in \`fetch\` available in supported modern Node releases and follows redirects by default.

\`\`\`js
const cases = [
  { path: '/account/security', csp: "frame-ancestors 'none'", xfo: 'DENY' },
  { path: '/admin/users', csp: "frame-ancestors 'none'", xfo: 'DENY' },
  { path: '/internal/dashboard', csp: "frame-ancestors 'self'", xfo: 'SAMEORIGIN' },
];

const baseURL = process.env.APP_BASE_URL;
if (!baseURL) throw new Error('APP_BASE_URL is required');

for (const item of cases) {
  const response = await fetch(new URL(item.path, baseURL), {
    redirect: 'follow',
    headers: { cookie: process.env.TEST_COOKIE || '' },
  });
  const csp = response.headers.get('content-security-policy') || '';
  const xfo = response.headers.get('x-frame-options') || '';

  if (!csp.includes(item.csp)) {
    throw new Error(item.path + ' has unexpected CSP: ' + csp);
  }
  if (xfo.toUpperCase() !== item.xfo) {
    throw new Error(item.path + ' has unexpected X-Frame-Options: ' + xfo);
  }
  console.log('verified', item.path, response.url);
}
\`\`\`

An \`includes\` check is intentionally narrow here: it confirms the expected directive text in a controlled policy, but it is not a general CSP parser. If the application emits multiple policies or complex source lists, parse directives by semicolons and compare normalized source tokens. Never split the entire policy on spaces and assume the first occurrence tells the whole story.

| Observation | Likely cause | Next diagnostic move |
|---|---|---|
| local header exists, deployed header absent | edge or proxy mutation | compare origin and public responses |
| CSP present only on HTML 200 responses | middleware ordering | probe redirects, errors, and login challenges |
| duplicate CSP fields appear | multiple infrastructure owners | verify browser-enforced intersection intentionally |
| XFO says SAMEORIGIN, CSP says none | policy drift | choose one contract and align both controls |
| report-only policy blocks in reports but page embeds | no enforcing policy | send an enforced CSP field |

Remember that \`Content-Security-Policy-Report-Only\` does not block framing. It is useful during rollout and telemetry collection, but a green header-presence assertion against report-only CSP is a dangerous false positive.

## Build a controlled attacker origin

A browser test needs at least two distinct origins. Different ports on localhost are sufficient because the port is part of the origin. Run the target application on one port and a hostile fixture on another. The hostile page should attempt to frame the target and expose a visible status element for the test harness.

\`\`\`html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Framing probe</title>
    <style>
      iframe { width: 900px; height: 600px; border: 2px solid red; }
    </style>
  </head>
  <body>
    <h1>Untrusted framing origin</h1>
    <iframe id="victim" src="http://127.0.0.1:3000/account/security"></iframe>
  </body>
</html>
\`\`\`

Serve it from a separate port with a tiny static server or your existing fixture service. The target URL must be configurable in real test infrastructure, but keeping the minimal page literal makes the threat model obvious during local debugging.

A common mistake is asserting \`iframe.onload\` did not fire. Browsers can fire a load event for a blocked frame or replace its contents with an internal error document. Cross-origin restrictions also prevent the attacker page from reading the target DOM even when embedding succeeds. The test should combine console evidence, frame-tree inspection, header assertions, and a positive control rather than interpreting one event as proof.

## Exercise enforcement with Playwright

Playwright can observe frame attachment and browser console messages, but the precise blocked-frame representation varies by browser engine. Make the security outcome the assertion, not a brittle error-string snapshot. A hostile-origin test can verify that the expected target URL never becomes an interactive child frame, while the network assertion independently confirms the response policy.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('account security cannot be framed by an untrusted origin', async ({ page, request }) => {
  const target = 'http://127.0.0.1:3000/account/security';
  const response = await request.get(target);
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['content-security-policy']).toContain("frame-ancestors 'none'");

  await page.goto('http://127.0.0.1:4000/attacker.html');

  await expect.poll(() =>
    page.frames().some((frame) => frame.url() === target)
  ).toBe(false);
});
\`\`\`

For an application using \`'self'\`, add a same-origin positive control. Without it, a test environment DNS problem, broken fixture, or general frame failure could make every negative case pass. The positive control proves your harness can detect successful framing.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('same-origin dashboard remains frameable by its approved shell', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/same-origin-shell');
  const dashboard = page.frameLocator('iframe[title="Internal dashboard"]');
  await expect(dashboard.getByRole('heading', { name: 'Team dashboard' })).toBeVisible();
});
\`\`\`

For a partner allowlist, create three tests: exact approved origin, deceptive sibling origin, and completely foreign origin. A domain such as \`partner.example.attacker.test\` is not a subdomain of \`partner.example\`. Also test an unapproved port. These cases expose naive substring comparisons in server-side policy builders.

Nested ancestry matters. Suppose the target allows \`https://partner.example\`, but the partner page itself is framed by \`https://attacker.example\`. The target's complete ancestor chain includes both origins, so a properly enforced \`frame-ancestors\` policy should reject the load unless both are allowed. Your fixture suite should include this three-level arrangement when embedded partner flows are security sensitive.

| Browser case | Expected result | Purpose |
|---|---|---|
| hostile top page -> sensitive target | blocked | primary attack simulation |
| same origin -> self-only target | allowed | harness and policy positive control |
| approved partner -> widget | allowed | business path remains functional |
| lookalike partner -> widget | blocked | exact origin boundary |
| attacker -> approved partner -> widget | blocked unless all listed | complete ancestor-chain enforcement |

## Cover authentication, cookies, and state without creating false confidence

Clickjacking has the greatest consequence when the framed page is authenticated. A logged-out test that lands on a protected login page may prove only that the login page is blocked. Establish a test account, authenticate through a supported fixture or UI flow, and confirm the direct top-level page exposes the sensitive control before attempting the hostile frame.

Cookie \`SameSite\` behavior can reduce whether authentication cookies are sent in a cross-site frame. That is valuable defense in depth, but it does not replace a framing policy. Same-site subdomains may still receive cookies depending on configuration, deployments change, and some framed pages have meaningful unauthenticated actions. Test cookie behavior separately and preserve the header oracle.

Use nonproduction identities and reversible operations. A framing test does not need to click a real deletion button to prove exploitability. An inert test-only action can record a synthetic event, or the suite can verify that the sensitive page becomes interactable in a deliberately vulnerable fixture. Do not weaken production policy merely to demonstrate the attack.

One practical authenticated setup stores browser state after a normal login. The test then proves direct access works before navigating to the attacker page.

\`\`\`ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/clickjacking-user.json' });

test('authenticated billing confirmation rejects foreign framing', async ({ page }) => {
  const target = 'http://127.0.0.1:3000/billing/confirm';

  // Prove the precondition properly. Without the response.url() check, a redirect
  // to a login or error page would make the framing assertion below pass for the
  // wrong reason: nothing was ever framed because nothing was ever accessible.
  const response = await page.goto(target);
  expect(response?.status()).toBe(200);
  expect(response?.url()).toBe(target);
  await expect(page.getByRole('heading', { name: 'Confirm billing change' })).toBeVisible();

  await page.goto('http://127.0.0.1:4000/frame-target.html?case=billing');

  // Assert on the rendered content, not just the frame URL. A framed page that
  // redirects has a different URL and would satisfy a URL-only check while still
  // leaking the authenticated view.
  await expect
    .poll(async () => {
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;
        const count = await frame
          .getByRole('heading', { name: 'Confirm billing change' })
          .count()
          .catch(() => 0);
        if (count > 0) return true;
      }
      return false;
    })
    .toBe(false);
});
\`\`\`

Keep authentication setup independent from the framing assertion. If login expires, the direct-access precondition fails with a clear message instead of producing an apparently successful block.

## Diagnose a realistic production-only failure

Consider a team whose tests passed against the application container but a penetration test embedded \`/payments/approve\` in production. The route's HTML included \`X-Frame-Options: DENY\` at the origin. Production used a CDN response-header rule that replaced the application's security header set for paths under \`/payments/*\`. The rule added HSTS and a generic CSP, but omitted both \`frame-ancestors\` and XFO.

The diagnostic sequence is concrete:

1. Fetch the origin directly through an internal address and record headers.
2. Fetch the public URL with the same authentication state and record every response block.
3. Compare CDN cache status and policy identifiers.
4. Purge or bypass a test object after correcting the response-header rule.
5. Repeat the hostile-origin browser test against the public staging edge.

The root problem was test placement. Unit tests validated application middleware, but no acceptance test observed the composed production-like response. The permanent fix is an edge-level route matrix plus browser probes in a staging environment that shares security-header configuration with production.

Another failure mode involves a CSP meta element. Teams sometimes place \`frame-ancestors\` in \`<meta http-equiv="Content-Security-Policy">\`. The directive is not supported through the meta delivery mechanism for this purpose. Test the HTTP response field. A DOM assertion that finds the string in markup is not evidence of enforcement.

## Separate clickjacking defense from neighboring controls

It is useful to distinguish which CSP directive controls which framing direction. \`frame-ancestors\` states who may embed the current response. \`frame-src\` states which frames the current document may load. \`default-src\` can provide fallback for outbound frame loading, but it does not replace the inbound ancestor restriction. Mixing these directions is one of the most frequent review errors.

The related header \`Cross-Origin-Opener-Policy\` changes browsing-context relationships for opened windows. It is not the clickjacking ancestor control. Likewise, CORS governs whether scripts may read certain cross-origin responses, not whether a browser may visually embed a page. An attacker does not need DOM read access to position a victim's click.

| Control | Security question answered | Not a substitute for |
|---|---|---|
| CSP \`frame-ancestors\` | who may frame this response? | outbound frame restrictions |
| \`X-Frame-Options\` | can this response be framed at all or same-origin? | flexible partner allowlists |
| CSP \`frame-src\` | which frame URLs may this page load? | clickjacking protection for this page |
| cookie \`SameSite\` | when is this cookie sent cross-site? | universal framing denial |
| CORS | which origins may read responses through scripts? | visual embedding restrictions |

JavaScript patterns such as checking \`window.top !== window.self\` can be bypassed or broken by sandboxing, race conditions, script failures, and changing browser behavior. They may hide content after it has begun loading and can harm legitimate integrations. If legacy code retains a frame buster, test it as a secondary behavior and keep response-header enforcement as the required gate.

## Turn the contract into a CI security gate

Fast header tests belong in every pull request. Browser probes can run on changes to routing, security middleware, CDN configuration, authentication, or embed features, plus a scheduled production-like suite. Keep the matrix in reviewable data so a newly sensitive route requires an explicit policy choice.

\`\`\`yaml
name: framing-security

on:
  pull_request:
  workflow_dispatch:

jobs:
  verify-framing:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run start:test &
      - run: npx wait-on http://127.0.0.1:3000/health
      - run: npx playwright test tests/security/framing.spec.ts
        env:
          APP_BASE_URL: http://127.0.0.1:3000
\`\`\`

The workflow assumes \`wait-on\` and Playwright are declared project dependencies. Avoid copying arbitrary \`npx\` package names into a trusted pipeline. Pin dependencies through the lockfile, and use your repository's established server lifecycle when available.

Failure messages should name the route, final URL, status, CSP value, XFO value, and expected contract. Attach the response-header capture and Playwright trace where policy permits. Do not log authentication cookies. A concise machine-readable artifact makes proxy and application owners collaborate from the same evidence.

Teams expanding adjacent token tests can use [security testing for JWT algorithm confusion](/blog/security-testing-jwt-algorithm-confusion) to keep signature-policy checks equally concrete. When key changes are part of release readiness, [testing JWT key rotation and JWKS caches](/blog/testing-jwt-key-rotation-jwks-cache) covers the timing and cache behaviors that simple happy-path tests miss.

## Review checklist for release candidates

Before release, confirm every route class has an owner and an ancestor policy. Probe authenticated and unauthenticated variants, because gateways may generate different responses. Check final public-edge headers on success, redirect, authorization failure, not-found, and server-error paths. Run hostile, same-origin, approved-partner, lookalike-origin, different-port, and nested-ancestor browser cases where applicable.

What people get wrong is reducing the outcome to “X-Frame-Options exists.” That assertion can pass with \`SAMEORIGIN\` where denial was required, on a redirect rather than the final page, or on one route while a sibling confirmation route remains open. Security testing clickjacking frame options is a policy-conformance problem backed by browser evidence. Presence is only the first observation.

Record deliberate exceptions with expiry dates. An embed requirement should name exact origins, business owner, data exposed, actions available, sandbox assumptions, and monitoring plan. Revisit wildcard sources and unused partners. The safest allowlist is small, explicit, HTTPS-only, and tested from both permitted and deceptive origins.

Add policy-change review to the same workflow. When a developer broadens an ancestor source, the pull request should show which fixture changes from blocked to allowed and why that origin needs access. Run the negative matrix after every change, because a source-expression edit can affect more than the intended partner. On removal, test that the former partner is blocked before deleting its positive fixture. This creates a reviewable history that connects infrastructure syntax to an observable browser boundary.

Finally, keep an emergency verification command available to responders. It should probe the public staging edge, print final headers without credentials, and run the smallest hostile frame case. During an incident, this focused check is more useful than launching an entire regression suite and waiting for unrelated failures. Follow it with the complete matrix once the immediate policy is restored.

## Frequently Asked Questions

### Should I test both CSP frame-ancestors and X-Frame-Options?

Yes, when the application deliberately sends both. Treat \`frame-ancestors\` as the expressive modern policy and verify that \`X-Frame-Options\` does not contradict it. A deny-all page commonly uses \`frame-ancestors 'none'\` with \`DENY\`; a same-origin page may use \`'self'\` with \`SAMEORIGIN\`. If your supported browser policy permits CSP alone, document that decision and still run a real framing test. Never accept a report-only CSP as enforcement.

### Can a Playwright test prove that clickjacking is impossible?

No single browser test proves universal impossibility. It can provide strong evidence for declared routes, origins, browser engines, authentication states, and ancestor arrangements. Combine it with response-header assertions, configuration review, an inventory of sensitive routes, and checks at the deployed edge. Positive controls are essential so a broken fixture does not make negative tests pass. Re-run the suite when proxies, CSP builders, routing, or embed partnerships change.

### Does SameSite cookie configuration remove the need for frame protection?

No. SameSite cookies can prevent some authenticated cross-site framing scenarios from carrying session state, but same-site attackers, unauthenticated actions, browser policy changes, and incorrectly scoped cookies remain relevant. Clickjacking protection should state directly whether the page may be framed. Test cookie behavior as a separate defensive layer, then require \`frame-ancestors\` or an appropriate equivalent according to the route contract for every sensitive response.

### How should an intentionally embeddable partner page be tested?

Use an exact origin allowlist and run positive tests from every approved scheme, host, and port. Add negative cases for an unrelated site, a lookalike hostname, an unapproved subdomain, a different port, and a nested chain with an unauthorized top ancestor. Verify the final response through the public edge and exercise the authenticated business flow. Remove obsolete partners promptly, because every allowed ancestor expands the interface that can present and influence the framed experience.
`,
};
