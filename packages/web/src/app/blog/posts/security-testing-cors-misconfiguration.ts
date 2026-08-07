import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Security Testing CORS Misconfiguration Without False Positives',
  description: 'Run security testing CORS misconfiguration checks that prove real browser impact, catch credential leaks, and separate noise from exploitable bugs.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Security Testing CORS Misconfiguration Without False Positives

Security testing CORS misconfiguration means proving that a browser can read sensitive cross-origin responses because the server emits unsafe Cross-Origin Resource Sharing headers. The most important word is proving. A response that contains \`Access-Control-Allow-Origin: *\` is not automatically exploitable, and a response that reflects an attacker origin is not automatically exploitable unless the browser is allowed to deliver something sensitive to attacker-controlled JavaScript.

For QA and test-automation engineers, the practical job is to turn CORS review into a repeatable browser-aware workflow. You need request probes, preflight probes, authenticated browser tests, and environment checks that distinguish public unauthenticated APIs from private endpoints protected by cookies, bearer tokens, client certificates, or internal network position. The payoff is a CI gate that catches real CORS regressions before an AI coding agent ships a permissive middleware change across every route.

This guide focuses on concrete security testing CORS misconfiguration patterns: origin reflection, credentialed wildcard behavior, null origins, preflight method expansion, CDN header drift, and cache poisoning through missing \`Vary: Origin\`. If your auth layer also depends on short-lived signing keys, pair these checks with [JWT key rotation and JWKS cache testing](/blog/testing-jwt-key-rotation-jwks-cache). For teams adopting AI agents in QA workflows, the broader test-design framing in [AI augmented software testing in 2026](/blog/ai-augmented-software-testing-2026-guide) helps keep generated security tests reviewable instead of noisy.

## The Exploit Condition Is Browser Read Access

CORS is not server-side authorization. It is a browser enforcement model that decides whether frontend JavaScript from one origin can read a response from another origin. The server still receives the HTTP request either way. That detail matters because scanners often flag headers without checking whether the browser would expose the response body to malicious JavaScript.

An exploitable CORS bug usually needs four things. First, the target endpoint returns data or accepts a state-changing action worth protecting. Second, the victim browser can authenticate to that endpoint, often through cookies or client-managed bearer tokens. Third, the server allows an untrusted origin in \`Access-Control-Allow-Origin\`. Fourth, if credentials are needed, the response also permits credentials with \`Access-Control-Allow-Credentials: true\`, and the frontend request uses credentialed fetch.

| Header pattern | Browser read impact | Typical severity | What to verify |
|---|---|---|---|
| \`Access-Control-Allow-Origin: *\` on public unauthenticated JSON | Any site can read public data | Usually informational | Data is intentionally public and no credentials are involved |
| Reflected arbitrary \`Origin\` with credentials allowed | Attacker origin can read authenticated response | High when response is sensitive | Cookie or token is sent and browser exposes body |
| Fixed allowlist for trusted app origins | Intended cross-origin access | Expected | Only approved origins match exactly |
| \`null\` origin allowed with credentials | Sandboxed or local contexts may read data | Medium to high | Whether app has file, sandboxed iframe, or data URL exposure paths |
| Missing CORS headers on private endpoint | Browser blocks read | Usually safe from CORS read | Confirm server authorization still protects side effects |

The testing mistake is treating CORS as a string-matching exercise. A QA-grade test should report whether an untrusted page can execute \`fetch()\`, include or omit credentials according to the scenario, and read fields from the response. Header-only checks are useful as fast discovery, but they are not enough for risk classification.

## Inventory Endpoints by Sensitivity Before Probing

Start by classifying endpoints. Public catalog search, health checks, OpenAPI documents, and static assets can have permissive CORS by design. Account profile, billing, exports, admin APIs, feature-flag evaluation, internal GraphQL, and session endpoints need stricter handling. Without this inventory, your CORS report becomes a pile of indistinguishable header screenshots.

Use a simple matrix that joins endpoint sensitivity with expected browser callers. This lets automation fail only on policy violations and gives developers a concrete fix target.

| Endpoint class | Example | Expected origin policy | Automated gate |
|---|---|---|---|
| Public read-only | \`GET /api/docs/search\` | \`*\` can be acceptable | Assert no cookies required and no private fields |
| Customer private | \`GET /api/me\` | Exact production app origins only | Assert attacker origins cannot read authenticated body |
| Admin private | \`GET /admin/users\` | Admin console origin only | Assert public app and attacker origins are blocked |
| State changing | \`POST /api/billing/payment-method\` | Exact trusted origins, CSRF protection still required | Assert preflight only allows intended methods and headers |
| Partner API | \`GET /partner/report\` | Partner domain allowlist or token-based non-browser access | Assert unknown origins are denied and token auth is independent |

Keep the inventory in source control. AI coding agents often add middleware at the framework boundary because it looks cleaner than per-route policy. A route inventory gives reviewers a quick way to reject \`allow all origins\` changes that accidentally apply to private APIs.

\`\`\`yaml
cors_policy:
  public:
    - method: GET
      path: /api/catalog/search
      allow_origins: ["*"]
      credentials: false
  customer_private:
    - method: GET
      path: /api/me
      allow_origins:
        - https://app.example.com
        - https://preview.example.com
      credentials: true
  admin_private:
    - method: GET
      path: /admin/users
      allow_origins:
        - https://admin.example.com
      credentials: true
\`\`\`

The policy file is not a replacement for server authorization. It is a test oracle for CORS behavior. Your auth tests should still prove that missing, expired, or wrong-role credentials fail even when a request arrives from a trusted origin.

## Build Header Probes That Model Real Origins

The fastest discovery test is a request-level probe that sends different \`Origin\` headers and records the CORS response headers. This catches unsafe reflection, missing \`Vary: Origin\`, environment-specific allowlists, and inconsistent middleware ordering. Run these probes unauthenticated first, then authenticated for private endpoints.

\`\`\`ts
type CorsProbe = {
  method: 'GET' | 'POST' | 'OPTIONS';
  url: string;
  origin: string;
  headers?: Record<string, string>;
};

type CorsObservation = {
  status: number;
  allowOrigin: string | null;
  allowCredentials: string | null;
  allowMethods: string | null;
  vary: string | null;
};

export async function probeCors(input: CorsProbe): Promise<CorsObservation> {
  const response = await fetch(input.url, {
    method: input.method,
    headers: {
      Origin: input.origin,
      ...input.headers,
    },
  });

  return {
    status: response.status,
    allowOrigin: response.headers.get('access-control-allow-origin'),
    allowCredentials: response.headers.get('access-control-allow-credentials'),
    allowMethods: response.headers.get('access-control-allow-methods'),
    vary: response.headers.get('vary'),
  };
}
\`\`\`

Use a deliberately hostile origin that is valid but not related to your company, such as \`https://evil.example.test\`. Do not use a malformed origin for your main assertion because server libraries can reject malformed values before CORS policy runs. Add separate hardening tests for malformed values after the core behavior is covered.

\`\`\`ts
const untrustedOrigins = [
  'https://evil.example.test',
  'https://app.example.com.evil.example.test',
  'https://example.com.evil.example.test',
  'null',
];

const trustedOrigins = [
  'https://app.example.com',
  'https://admin.example.com',
];

export function assertNoCredentialedReflection(result: CorsObservation, origin: string) {
  if (
    result.allowOrigin === origin &&
    result.allowCredentials?.toLowerCase() === 'true'
  ) {
    throw new Error(\`Untrusted origin was allowed with credentials: \${origin}\`);
  }
}
\`\`\`

That sample contains the important negative oracle: arbitrary origin reflection plus credentials is dangerous. If the endpoint is public and never authenticated, your policy may allow \`*\`, but it should not also encourage credentialed browser access.

## Test Preflight Because Method Drift Hides There

Preflight requests are browser-generated \`OPTIONS\` requests used for non-simple cross-origin requests. A browser sends headers such as \`Access-Control-Request-Method\` and \`Access-Control-Request-Headers\` to ask whether the actual request is allowed. Many CORS bugs appear only in preflight responses because teams configure broad method lists while locking down actual route handlers.

For security testing CORS misconfiguration, preflight probes should cover state-changing methods, sensitive custom headers, and rejected origins. A server should not approve \`DELETE\`, \`PATCH\`, or privileged headers for an untrusted origin just because the endpoint later returns 401. CORS and authorization are separate layers, and both should be precise.

\`\`\`bash
curl -i -X OPTIONS "https://api.example.test/api/me" \\
  -H "Origin: https://evil.example.test" \\
  -H "Access-Control-Request-Method: PUT" \\
  -H "Access-Control-Request-Headers: authorization,content-type"
\`\`\`

Expected behavior depends on your policy, but a private customer endpoint should not return a response that combines the hostile origin, credentials, and broad requested methods. For a trusted origin, the preflight should be specific enough for the frontend request to work and narrow enough to prevent accidental API expansion.

| Preflight observation | Diagnosis | Next check |
|---|---|---|
| Hostile origin receives matching \`Access-Control-Allow-Origin\` | Allowlist accepts too much or reflects blindly | Browser proof with credentials |
| Hostile origin receives no allow-origin header | CORS read blocked | Confirm server auth still blocks direct calls |
| Trusted origin receives missing requested header | Frontend may fail only in browser | Check deployed config and gateway |
| All methods listed for every route | Middleware is too broad | Compare against route policy inventory |
| CDN returns old preflight after config change | Cache drift | Inspect cache key and \`Vary\` behavior |

The failure mode here is subtle: a developer tests with Postman, sees the API works, and misses that the browser blocks the real frontend call because preflight is wrong. Conversely, a scanner sees an allowed method but does not prove that a browser can read anything sensitive. Your automation should report both conditions separately.

## Prove Browser Impact With a Hostile Test Page

The clearest proof is a browser test that serves a small attacker page from a different origin, signs into the target app, then attempts to read a sensitive endpoint from the attacker page. Playwright is a good fit because you can create separate browser contexts and serve a local hostile page on a distinct port. The exact server helper can be whatever your repo already uses.

\`\`\`ts
import { test, expect } from '@playwright/test';

test('attacker origin cannot read authenticated profile JSON', async ({ page }) => {
  await page.goto('https://app.example.test/login');
  await page.getByLabel('Email').fill('qa-user@example.test');
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.goto('https://evil.example.test/cors-probe.html');

  const result = await page.evaluate(async () => {
    try {
      const response = await fetch('https://api.example.test/api/me', {
        credentials: 'include',
      });
      const text = await response.text();
      return { ok: true, status: response.status, text };
    } catch (error) {
      return { ok: false, message: String(error) };
    }
  });

  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toContain('qa-user@example.test');
});
\`\`\`

In a real browser, a CORS block often appears as a rejected fetch with a generic error. That is good. The test should not depend on a specific browser console sentence, because wording changes. The stable assertion is that the hostile page cannot obtain the private body.

For APIs using bearer tokens in JavaScript storage, adapt the proof. The attacker page does not automatically receive local storage from the target origin. If your application leaks a token through an XSS path, that is a different vulnerability chain. Keep the CORS test honest: prove what an attacker origin can do without assuming a separate bug.

## Credential Modes Change the Risk

Credentialed requests are where CORS mistakes become account data leaks. Browser \`fetch\` defaults to omitting cross-origin credentials unless code opts in with \`credentials: 'include'\`. XHR has its own credential flag. The server side header \`Access-Control-Allow-Credentials: true\` tells the browser it may expose the response to frontend code when credentials were included.

The common misconception is that \`Access-Control-Allow-Credentials: true\` by itself sends cookies. It does not. The frontend request also has to include credentials, cookies need attributes that allow cross-site use when applicable, and modern browser cookie rules still apply. But if your frontend or a malicious page can trigger a credentialed request and the server reflects the origin, the private response can be exposed.

\`\`\`ts
type CredentialScenario = {
  name: string;
  fetchOptions: RequestInit;
  expectedReadable: boolean;
};

export const credentialScenarios: CredentialScenario[] = [
  {
    name: 'default cross-origin fetch omits cookies',
    fetchOptions: {},
    expectedReadable: false,
  },
  {
    name: 'credentialed fetch from trusted app origin',
    fetchOptions: { credentials: 'include' },
    expectedReadable: true,
  },
  {
    name: 'credentialed fetch from hostile origin',
    fetchOptions: { credentials: 'include' },
    expectedReadable: false,
  },
];
\`\`\`

Do not classify severity until you know the auth mechanism. Cookie-based browser sessions, intranet cookies, and ambient client certificates are high-risk candidates. APIs that require an \`Authorization\` header not exposed to the attacker origin are often less directly exploitable through CORS alone, although they still deserve strict policy.

## Catch Origin Parsing Mistakes

Many CORS bugs are allowlist parsing bugs. A server checks whether the origin string contains \`example.com\`, ends with \`example.com\` without requiring a dot boundary, ignores scheme, accepts regex metacharacters, or trusts an origin assembled from forwarded headers. Attackers then use a lookalike hostname that passes the check.

| Bad allowlist logic | Hostile origin that may pass | Correct policy idea |
|---|---|---|
| Contains company domain | \`https://example.com.evil.test\` | Parse URL, compare exact hostname |
| Ends with loose suffix | \`https://badexample.com\` | Require exact host or dot plus suffix |
| Ignores scheme | \`http://app.example.com\` | Match scheme, host, and port |
| Allows all preview subdomains | \`https://anything.preview.example.com\` | Bind preview origin to environment or PR |
| Trusts \`X-Forwarded-Host\` blindly | Forged proxy headers | Configure trusted proxy chain explicitly |

Unit test the allowlist function directly. It should take a parsed or parseable origin and return a boolean. Avoid testing it only through an HTTP server because edge cases become harder to isolate.

\`\`\`ts
const allowedOrigins = new Set([
  'https://app.example.com',
  'https://admin.example.com',
  'https://preview.example.com',
]);

export function isAllowedCorsOrigin(origin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  if (parsed.username || parsed.password) return false;
  if (parsed.protocol !== 'https:') return false;
  return allowedOrigins.has(parsed.origin);
}
\`\`\`

Then test the cases that caused real bugs in your organization. Keep them as regression tests. When an AI agent updates CORS middleware later, these tests preserve the boundary in a way code review alone may miss.

\`\`\`ts
import { describe, expect, it } from 'vitest';
import { isAllowedCorsOrigin } from './cors-policy';

describe('CORS origin allowlist', () => {
  it('rejects domain suffix tricks', () => {
    expect(isAllowedCorsOrigin('https://app.example.com.evil.test')).toBe(false);
    expect(isAllowedCorsOrigin('https://badexample.com')).toBe(false);
  });

  it('requires exact https origins', () => {
    expect(isAllowedCorsOrigin('https://app.example.com')).toBe(true);
    expect(isAllowedCorsOrigin('http://app.example.com')).toBe(false);
    expect(isAllowedCorsOrigin('https://app.example.com:4443')).toBe(false);
  });
});
\`\`\`

The exact code shape will differ by framework, but the oracle should stay the same: compare normalized origins, not string fragments.

## Verify Cache Behavior With Vary Origin

Dynamic CORS responses need cache-aware tests. If an API reflects allowed origins and sits behind a CDN, proxy, or shared cache, the response for one origin can be served to another origin unless the cache key varies by \`Origin\`. HTTP caches use \`Vary\` to know which request headers affect the response representation. For CORS, \`Vary: Origin\` is normally required when \`Access-Control-Allow-Origin\` is not a constant value.

This is not theoretical. A private endpoint can be configured correctly in the app process, then deployed behind a cache that stores the first response with \`Access-Control-Allow-Origin: https://app.example.com\` and replays it to another origin. Browser behavior and CDN behavior both need coverage.

\`\`\`bash
curl -i "https://api.example.test/api/me" \\
  -H "Origin: https://app.example.com" \\
  -H "Cookie: session=redacted"

curl -i "https://api.example.test/api/me" \\
  -H "Origin: https://evil.example.test" \\
  -H "Cookie: session=redacted"
\`\`\`

Your assertion is not only that the second response denies the hostile origin. Also check that the trusted-origin response includes a \`Vary\` value containing \`Origin\` when CORS is dynamic. If the API returns \`Access-Control-Allow-Origin: *\` for a genuinely public resource, \`Vary: Origin\` is less relevant because the header does not vary.

| Response style | Cache requirement | Test assertion |
|---|---|---|
| Constant \`*\` for public resource | No origin-specific representation | No credentials, no private fields |
| Exact constant origin for one app | Cache may be simple | Hostile origin does not receive readable private body |
| Dynamic allowlist reflection | Must vary by \`Origin\` | \`Vary\` includes \`Origin\` |
| Per-tenant origin policy | Must vary by origin and auth context | Tenant A cannot affect tenant B |

If your CDN lets you inspect cache status headers, record them as diagnostic metadata, but avoid building pass or fail logic on vendor-specific debug headers unless your platform team has standardized them.

## Separate CORS From CSRF and Authorization

CORS, CSRF, and authorization overlap in symptoms but not in mechanics. CORS controls whether browser JavaScript can read a cross-origin response. CSRF controls whether an attacker can cause a victim browser to perform an unwanted state-changing request. Authorization controls whether the authenticated principal can perform the requested action at all.

What people get wrong is using a CORS failure as proof that CSRF is solved. A malicious form post or image request may still reach the server even when the browser cannot read the response. If the endpoint changes state and relies only on cookies, you still need CSRF protection or same-site cookie policy appropriate to the flow. Conversely, a strong CSRF token does not make credentialed arbitrary-origin read access acceptable on private JSON.

\`\`\`ts
export type SecurityLayerExpectation = {
  layer: 'cors' | 'csrf' | 'authorization';
  protectsAgainst: string;
  exampleAssertion: string;
};

export const expectations: SecurityLayerExpectation[] = [
  {
    layer: 'cors',
    protectsAgainst: 'malicious JavaScript reading cross-origin responses',
    exampleAssertion: 'evil.example.test cannot read /api/me with credentials',
  },
  {
    layer: 'csrf',
    protectsAgainst: 'unwanted state-changing requests using ambient cookies',
    exampleAssertion: 'POST /payment-method fails without a valid CSRF token',
  },
  {
    layer: 'authorization',
    protectsAgainst: 'users accessing resources outside their permissions',
    exampleAssertion: 'user A cannot read user B account export',
  },
];
\`\`\`

Keep these tests in separate suites. When one fails, the failure should point to the layer that needs repair. A single broad "security browser test" that clicks through all three concerns creates slow, ambiguous failures.

## Automate CORS Regression Testing in CI

CI coverage should include fast policy unit tests, request-level probes against an ephemeral environment, and a small number of browser proof tests for the highest-risk endpoints. You do not need to run a hostile browser proof against every route on every commit. Instead, use the policy inventory to generate probes for all endpoints and reserve full browser tests for representative private data classes.

\`\`\`yaml
name: cors-security-regression

on:
  pull_request:
  push:
    branches: [main]

jobs:
  cors:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run test:cors-policy
      - run: npm run deploy:test-env
      - run: npm run test:cors-probes
        env:
          API_BASE_URL: https://api-pr.example.test
          TEST_USER_PASSWORD: \${{ secrets.TEST_USER_PASSWORD }}
\`\`\`

Do not put production cookies or real customer tokens in CORS tests. Use synthetic accounts in disposable environments. If you must probe production headers, keep the production job unauthenticated and limited to expected public routes, then rely on staging for authenticated proof.

An effective CI report should include the endpoint, method, origin, observed headers, expected policy, and whether browser read access was proven. That is enough for a developer to fix middleware or gateway configuration without reproducing the entire scan manually.

\`\`\`json
{
  "endpoint": "GET /api/me",
  "origin": "https://evil.example.test",
  "expected": "blocked",
  "observed": {
    "access-control-allow-origin": "https://evil.example.test",
    "access-control-allow-credentials": "true",
    "vary": "Origin"
  },
  "browserReadable": true,
  "severity": "high"
}
\`\`\`

That report is intentionally boring. Security findings should be easy to triage. Avoid dramatic language and avoid claiming data exfiltration unless your browser proof actually read the private fields.

## Diagnose a Realistic Failure Mode: Staging Passes, Production Fails

A common failure looks like this: staging CORS tests pass, production exposes private responses to a marketing preview origin, and nobody changed application code. The root cause is usually deployment configuration. The app server has a strict allowlist, but a gateway, CDN edge function, or platform CORS toggle adds headers after the app response. Because the added header runs later, it overrides or duplicates the application header.

Start diagnosis by capturing raw headers from each layer. Compare the same endpoint through localhost, internal service URL, gateway URL, and public CDN URL. If only the public edge returns the unsafe header, the application code is not the immediate source. Then inspect infrastructure config and platform console settings.

| Symptom | Likely source | Diagnostic move |
|---|---|---|
| Duplicate \`Access-Control-Allow-Origin\` headers | App plus proxy both set CORS | Compare direct service and public URL |
| Staging denies, production allows all | Environment variable or edge config drift | Print deployed allowlist safely, compare release config |
| Only \`OPTIONS\` is permissive | Gateway preflight shortcut | Probe actual and preflight requests separately |
| Only cached responses fail | CDN cache key issue | Purge cache and verify \`Vary: Origin\` |
| Browser blocks despite allowed header | Credential mode or cookie attributes | Inspect browser network panel and request credentials |

Document the final root cause in the test failure or ticket. "CORS is broken" is not enough. "Public CDN CORS rule appends reflected allow-origin after app middleware for /api/*" is actionable.

## Review Framework Middleware With Skepticism

Most frameworks make it easy to turn on CORS globally. That convenience is useful for local development and dangerous for production APIs. The risky pattern is a single middleware line that reflects all origins, enables credentials, and applies before route classification. An AI coding agent may propose that change because it fixes a failing frontend test quickly.

Ask for three things in review. Where is the allowlist defined? Which routes use it? What tests prove hostile origins cannot read private bodies? If those answers are missing, request narrower middleware or route-level policy.

\`\`\`ts
type CorsDecision = {
  allowOrigin: string | false;
  allowCredentials: boolean;
};

export function decideCors(pathname: string, origin: string): CorsDecision {
  if (pathname.startsWith('/api/catalog/')) {
    return { allowOrigin: '*', allowCredentials: false };
  }

  if (isAllowedCorsOrigin(origin)) {
    return { allowOrigin: origin, allowCredentials: true };
  }

  return { allowOrigin: false, allowCredentials: false };
}
\`\`\`

The example is deliberately small. In a production service, the policy may read from tenant configuration, but the decision should still be explicit and testable. Avoid mixing CORS policy with unrelated auth logic in a way that prevents direct unit tests.

## A Practical Checklist for QA Engineers

Use this checklist when adding or reviewing security testing CORS misconfiguration coverage. It keeps the suite focused on exploitable behavior and avoids drowning product teams in header trivia.

| Check | Pass condition | Evidence to keep |
|---|---|---|
| Sensitive endpoint inventory exists | Private, public, admin, and partner routes are classified | Policy file or generated route map |
| Exact trusted origins are tested | App origins can use intended API calls | Request probe output |
| Hostile origins are tested | Private bodies are not readable | Browser proof or fetch rejection |
| Preflight is covered | Methods and headers match route need | \`OPTIONS\` probe results |
| Credentials are modeled | Cookie or token behavior matches real app | Browser network trace or test code |
| Cache variation is checked | Dynamic CORS includes \`Vary: Origin\` | Header report |
| CSRF is separate | State-changing endpoints fail CSRF tests independently | Separate CSRF suite |
| Config drift is monitored | Staging and production policies differ only intentionally | Environment diff or release check |

Run the fast checks on every pull request. Run broader environment probes after deployment and on scheduled jobs. CORS mistakes are often config changes, not code changes, so a schedule catches drift that pull request tests cannot see.

## Frequently Asked Questions

### Is Access-Control-Allow-Origin star always a vulnerability?

No. \`Access-Control-Allow-Origin: *\` is acceptable for intentionally public resources that do not rely on browser credentials and do not expose private data. It becomes risky when teams apply it to private endpoints or treat it as harmless because direct API calls already require authentication. For severity, prove whether an untrusted browser origin can read sensitive response data. Header presence alone is a weak finding.

### Should CORS tests run against production?

Run unauthenticated production probes for public headers and route classification, but keep authenticated browser proofs in staging or another controlled environment with synthetic accounts. Production CORS drift is common because gateways and CDNs change outside application code, so some production visibility is useful. The boundary is credential safety: do not place real customer sessions, admin cookies, or long-lived tokens into automated CORS jobs.

### Why does Postman succeed when the browser fails?

Postman is not enforcing the browser CORS read model. It can send the request and show the response even when browser JavaScript would be blocked from reading it. That is why QA needs both request-level probes and browser proof tests. Use curl or Postman to inspect headers, then use Playwright or a real browser to prove whether frontend JavaScript can access the body from a different origin.

### Does strict CORS replace authorization checks?

No. CORS only controls cross-origin browser read access. A non-browser client can still call the API directly, and a same-origin attacker path may bypass the CORS boundary entirely. Authorization must verify the user, tenant, role, and resource on every protected endpoint. Treat CORS as a browser exposure control layered beside CSRF and authorization, not as the core permission system.
`,
};
