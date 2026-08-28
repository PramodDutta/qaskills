import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Testing Security Headers: HSTS, X-Frame-Options, and Permissions-Policy',
  description: 'Security headers testing verifies HSTS, X-Frame-Options, and Permissions-Policy so browsers enforce transport and embedding rules.',
  date: '2026-08-28',
  category: 'Guide',
  content: `
# Testing Security Headers: HSTS, X-Frame-Options, and Permissions-Policy

Security headers testing means proving that your HTTP responses contain the browser policies you depend on, and that those policies are applied on the exact pages, redirects, domains, and frames users hit. For HSTS, X-Frame-Options, and Permissions-Policy, good tests check syntax, placement, inheritance, and real browser enforcement.

Official references worth keeping close:

Strict-Transport-Security: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security

X-Frame-Options: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options

Permissions-Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy

## The Header Test Is a Browser Contract Test

Security headers are not normal response metadata. A typo changes browser behavior. A proxy rule that applies to \`/app\` but not \`/login\` changes attack surface. A header present on a 200 response but missing on a 302 can matter because real users traverse redirects, cached documents, and embedded documents rather than a single perfect URL.

QA teams should treat header tests as contract tests between server configuration and browser enforcement. The API layer may believe it sent \`Strict-Transport-Security\`. The CDN may strip it. The app server may send \`X-Frame-Options: ALLOW-FROM\`, which modern browsers do not honor as a protection. A feature team may add an iframe that requires camera access, while the parent page's \`Permissions-Policy\` blocks it. The only useful answer is measured at the delivered response and, for frame and permission cases, confirmed in a browser.

| Header | Primary risk controlled | Minimum assertion | Deeper assertion |
| --- | --- | --- | --- |
| \`Strict-Transport-Security\` | HTTP downgrade and TLS bypass after first secure visit | HTTPS responses include valid \`max-age\` | Subdomain and preload policy match inventory |
| \`X-Frame-Options\` | Clickjacking on older and common browser paths | Sensitive pages send \`DENY\` or \`SAMEORIGIN\` | Cross-origin frame load is blocked |
| \`Permissions-Policy\` | Unwanted access to powerful browser features | Directives use valid allowlist syntax | Iframes inherit and narrow policy as expected |

The right test suite has layers. A fast HTTP smoke checks raw headers for every route class. A browser test checks enforcement on representative pages. A configuration review checks CDN, reverse proxy, and application defaults. A release checklist prevents high-risk changes such as HSTS \`includeSubDomains\` from shipping before every subdomain supports HTTPS.

Header testing also belongs next to frame and CORS work, not in an isolated security folder nobody runs. \`X-Frame-Options\` and CSP \`frame-ancestors\` are direct clickjacking controls, so pair this with [Clickjacking Testing with X-Frame-Options and CSP](/blog/security-testing-clickjacking-frame-options). CORS is a different browser policy, but it fails for similar reasons: environment-specific origins, proxies rewriting headers, and teams confusing server intent with browser behavior. Keep the mental model aligned with [CORS Misconfiguration Testing for QA Engineers](/blog/security-testing-cors-misconfiguration).

## HSTS Tests: Check the Response You Actually Ship

\`Strict-Transport-Security\` tells browsers to use HTTPS for future requests to the host. MDN documents the syntax as \`max-age=<seconds>\`, with optional \`includeSubDomains\` and \`preload\`. Browsers ignore HSTS received over insecure HTTP, so testing it on \`http://\` is a trap. You need to request HTTPS and assert the delivered header there.

The basic HSTS checks:

| Check | Good result | Failure meaning |
| --- | --- | --- |
| HTTPS response includes header | \`Strict-Transport-Security\` exists | Browser does not learn the policy |
| \`max-age\` parses as integer seconds | Positive value, often months or years | Header may be ignored or too weak |
| HTTP response is redirected to HTTPS | 301 or 308 to HTTPS | First visit can remain insecure |
| Header is not relied on over HTTP | Test does not treat HTTP HSTS as valid | False confidence |
| Subdomain coverage is reviewed | \`includeSubDomains\` used only when ready | Broken legacy subdomains |

Here is a Node smoke test that fetches a URL and validates HSTS syntax without requiring a specific test framework. It uses built-in \`fetch\`, available in current Node versions, and exits nonzero on failure.

\`\`\`javascript
const target = process.argv[2];

if (!target) {
  throw new Error('usage: node check-hsts.mjs https://example.com/');
}

const response = await fetch(target, { redirect: 'manual' });
const hsts = response.headers.get('strict-transport-security');

if (!hsts) {
  throw new Error('missing Strict-Transport-Security header');
}

const directives = new Map(
  hsts
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, value = ''] = part.split('=');
      return [name.toLowerCase(), value];
    })
);

const maxAge = directives.get('max-age');
if (!maxAge || !/^\\d+$/.test(maxAge)) {
  throw new Error(\`invalid max-age directive: \${hsts}\`);
}

if (Number(maxAge) < 15552000) {
  throw new Error(\`max-age is shorter than 180 days: \${maxAge}\`);
}

console.log(\`HSTS ok: \${hsts}\`);
\`\`\`

That script intentionally does not require \`preload\`. Preload is a commitment, not a generic maturity badge. MDN notes that preload requires at least one year of \`max-age\` and \`includeSubDomains\`, and the preload list has operational consequences. If you preload a domain while a forgotten subdomain still serves plain HTTP, you can break users. Test the inventory before testing the directive.

For QA, the best HSTS test is often an inventory table:

| Host | HTTPS works | Redirects HTTP | HSTS | includeSubDomains safe? |
| --- | --- | --- | --- | --- |
| \`www.example.test\` | Yes | Yes | Yes | Parent decision |
| \`api.example.test\` | Yes | Yes | Yes | Yes |
| \`legacy.example.test\` | No | No | No | Blocks parent rollout |
| \`assets.example.test\` | Yes | Yes | Yes | Yes |

Do not ship \`includeSubDomains\` because a scanner demanded it. Ship it because every subdomain has been found, tested, and owned.

## Redirect Chains and Header Placement

Security header scanners often request one URL and print a verdict. Attackers and users follow paths. Your tests should inspect the chain: \`http://example.com\` to \`https://example.com\`, \`https://example.com\` to \`https://www.example.com\`, locale redirects, auth redirects, and error pages.

\`\`\`bash
#!/usr/bin/env bash
set -euo pipefail

URL="\${1:-https://example.com/}"

curl -sSI "\${URL}" |
  awk 'BEGIN { IGNORECASE = 1 } /^HTTP\\// || /^strict-transport-security:/ || /^x-frame-options:/ || /^permissions-policy:/ { print }'
\`\`\`

The rendered command is small enough to paste into a failing CI log. It shows status lines and the three headers under discussion. Use it as a diagnostic, not as your only test. Shell output is easy to eyeball and easy to misread.

Automated redirect checking is better in JavaScript because you can store each hop. This example follows redirects manually and prints the header state at each response.

\`\`\`javascript
const startUrl = process.argv[2] ?? 'https://example.com/';
let current = startUrl;

for (let hop = 0; hop < 8; hop += 1) {
  const response = await fetch(current, { redirect: 'manual' });
  const location = response.headers.get('location');
  const hsts = response.headers.get('strict-transport-security') ?? '(missing)';
  const xfo = response.headers.get('x-frame-options') ?? '(missing)';
  const permissions = response.headers.get('permissions-policy') ?? '(missing)';

  console.log(\`\${response.status} \${current}\`);
  console.log(\`  hsts: \${hsts}\`);
  console.log(\`  xfo: \${xfo}\`);
  console.log(\`  permissions-policy: \${permissions}\`);

  if (!location || response.status < 300 || response.status >= 400) {
    break;
  }

  current = new URL(location, current).toString();
}
\`\`\`

There is a judgment call here. HSTS matters on HTTPS responses. X-Frame-Options and Permissions-Policy matter on documents that browsers render. You do not need every static image response to carry every document policy. You do need login, account, admin, checkout, OAuth callback, embedded app, and error document responses to behave intentionally.

## X-Frame-Options: Test Old Header, Prefer Clear Policy

\`X-Frame-Options\` has two useful directives: \`DENY\` and \`SAMEORIGIN\`. MDN marks \`ALLOW-FROM\` as obsolete and points readers to CSP \`frame-ancestors\` for more complete options. That means your tests should reject \`ALLOW-FROM\` on protected pages. A header that looks present but is ignored by modern browsers is worse than a missing header because it fools dashboards.

Use \`DENY\` for pages that never need framing: login, password reset, billing, admin, account settings, and most authenticated app screens. Use \`SAMEORIGIN\` only when same-origin embedding is an intentional product behavior. If partner embedding is required, test CSP \`frame-ancestors\` in addition to, or instead of, XFO depending on your browser support policy.

\`\`\`typescript
type FramePolicy = 'deny' | 'sameorigin';

function parseXFrameOptions(value: string | null): FramePolicy {
  const normalized = value?.trim().toLowerCase();

  if (normalized === 'deny') {
    return 'deny';
  }

  if (normalized === 'sameorigin') {
    return 'sameorigin';
  }

  throw new Error(\`unsupported X-Frame-Options value: \${value ?? '(missing)'}\`);
}

const response = await fetch('https://example.com/login', { redirect: 'manual' });
const policy = parseXFrameOptions(response.headers.get('x-frame-options'));

if (policy !== 'deny') {
  throw new Error(\`expected login to use DENY, got \${policy}\`);
}
\`\`\`

Header assertions catch syntax. Browser tests catch enforcement. Here is a Playwright test that creates an attacker page with an iframe pointed at the protected page. The assertion checks whether the frame navigates successfully. In real suites, host the attacker page from a different origin under your control.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('login page is not usable from a cross-origin frame', async ({ page }) => {
  await page.setContent(String.raw\`
    <!doctype html>
    <html>
      <body>
        <iframe title="target" src="https://example.com/login"></iframe>
      </body>
    </html>
  \`);

  const frame = page.frameLocator('iframe[title="target"]');
  await expect(frame.locator('body')).not.toContainText('Sign in to your account');
});
\`\`\`

That test is deliberately conservative. Browser error pages and frame-blocking behavior vary, so checking for absence of sensitive content is often more stable than asserting a specific console message. If you own both origins in test, you can make the target page render a unique marker and assert that the marker is not visible inside the frame.

## Permissions-Policy: Syntax Is Not the Whole Test

\`Permissions-Policy\` controls which browser features can be used by a top-level document and by embedded frames. MDN documents allowlist syntax such as \`geolocation=()\`, \`geolocation=(self "https://a.example.com")\`, and \`camera=*\`. It also notes that the feature is not Baseline because some widely used browsers lack support for parts of it. That compatibility detail matters for QA. You should test the header syntax everywhere, then run browser enforcement tests only in browsers where the behavior is expected.

The policy has two layers:

| Layer | Where set | What it controls |
| --- | --- | --- |
| Top-level header | \`Permissions-Policy\` response header | Feature use in the document and nested contexts |
| Iframe attribute | \`allow\` attribute | Feature use for that specific embedded document |
| Combined result | Browser policy inheritance | Most restrictive intersection wins |

The "most restrictive" rule is the part teams miss. If the parent header disables geolocation with \`geolocation=()\`, an iframe cannot re-enable it with \`allow="geolocation"\`. If the parent allows a partner origin but the iframe \`allow\` attribute does not, the feature still fails. QA should test both sides of the pair.

Here is a policy parser that checks for a few required directives. It is not a full standard parser. It is a guard against missing or clearly wrong deployment output.

\`\`\`typescript
function parsePermissionsPolicy(header: string | null): Map<string, string> {
  if (!header) {
    throw new Error('missing Permissions-Policy header');
  }

  const directives = new Map<string, string>();
  for (const part of header.split(',')) {
    const trimmed = part.trim();
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex <= 0) {
      throw new Error(\`invalid directive: \${trimmed}\`);
    }
    directives.set(
      trimmed.slice(0, equalsIndex).toLowerCase(),
      trimmed.slice(equalsIndex + 1).trim()
    );
  }

  return directives;
}

const response = await fetch('https://example.com/dashboard');
const policy = parsePermissionsPolicy(response.headers.get('permissions-policy'));

if (policy.get('camera') !== '()') {
  throw new Error('camera must be disabled on dashboard');
}

if (policy.get('geolocation') !== '()') {
  throw new Error('geolocation must be disabled on dashboard');
}
\`\`\`

For enforcement, test a small feature call. The geolocation API is awkward in automation because permission prompts and secure context rules can confuse the result. Camera is similarly environment-dependent. A better pattern is to pick a feature your product actually cares about and build a stable browser check around the expected blocked behavior in one browser project.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('dashboard disables geolocation through Permissions-Policy', async ({ page }) => {
  await page.goto('https://example.com/dashboard');

  const result = await page.evaluate(async () => {
    if (!('geolocation' in navigator)) {
      return 'api-missing';
    }

    return await new Promise<string>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('allowed'),
        (error) => resolve(\`blocked:\${error.code}\`),
        { timeout: 1000 }
      );
    });
  });

  expect(result).not.toBe('allowed');
});
\`\`\`

This test does not assume one exact error code because browser behavior and permission state can differ. It asserts the product-level policy: the page must not successfully use geolocation.

## Config Examples to Anchor the Expected Output

Tests are easier to review when they sit beside the configuration that creates the headers. The exact place depends on your stack. In many systems, the CDN or edge proxy owns HSTS and global document headers, while the app owns route-specific relaxations. Do not duplicate policy in three layers unless you have a clear ownership model.

Nginx can set document headers at the server level:

\`\`\`nginx
server {
  listen 443 ssl;
  server_name example.com;

  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "DENY" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

  location / {
    proxy_pass http://app_upstream;
  }
}
\`\`\`

Express can set the same headers with plain middleware if you do not want to rely on a package abstraction in tests:

\`\`\`javascript
import express from 'express';

const app = express();

app.use((request, response, next) => {
  response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.get('/health', (request, response) => {
  response.json({ ok: true });
});

app.listen(3000);
\`\`\`

Those snippets are not a mandate to set identical policy everywhere. They are an anchor. Tests should assert the policy your product chose, not a generic scanner template.

## Failure Story: The Login Page Was Protected, the Error Page Was Not

Symptom: the security scanner passed on \`/login\`, but a manual penetration test showed a framed password-reset error page that displayed account-specific text after a malformed token.

Wrong theory: engineers suspected the browser ignored \`X-Frame-Options\` because the tester used a local HTML file. That sent the team into a discussion about file origins and lab setup.

Actual cause: \`/login\` returned through the app server and had \`X-Frame-Options: DENY\`. The password-reset error page was generated by an edge function on invalid tokens. That edge function had its own response path and no security header middleware. The scanner never requested the invalid-token path, and the header test suite only checked 200 responses.

Fix: the team moved mandatory document headers to the edge layer, added route fixtures for 200, 302, 400, 401, 403, 404, and 500 document responses, and wrote a Playwright frame test for the password reset flow. The next failure was caught before release when a new marketing error page skipped the shared edge helper.

The lesson is plain: header tests must cover response classes, not just home pages. Attackers do not stop at your happy path.

## What Practitioners Get Wrong

The most common bad habit is treating security headers as a yes/no checklist from a scanner. That encourages teams to add every fashionable header with maximum values, then ignore product behavior. HSTS with \`includeSubDomains\` can break forgotten hosts. \`X-Frame-Options: SAMEORIGIN\` can break a legitimate embedded console. \`Permissions-Policy\` can block a partner iframe unless both the parent header and iframe attribute agree.

A better habit is to write a route-class matrix:

| Route class | HSTS | XFO | Permissions-Policy | Browser enforcement test |
| --- | --- | --- | --- | --- |
| Public marketing pages | Yes | Usually \`DENY\` | Disable sensitive features | Smoke only unless embedded |
| Login and account pages | Yes | \`DENY\` | Disable sensitive features | Cross-origin frame block |
| Same-origin embedded tools | Yes | \`SAMEORIGIN\` or CSP-specific | Allow only required features | Same-origin frame works |
| Partner embeds | Yes | Usually CSP \`frame-ancestors\` | Parent and iframe allowlist checked | Partner-origin scenario |
| Error documents | Yes on HTTPS | Same as protected class | Same as protected class | At least one representative |

This matrix prevents policy drift. If a new route class appears, it needs a row. If a row changes, tests change with it.

## CI Workflow for Header Regression Testing

Run header tests in three lanes. First, fast raw HTTP checks on every pull request. Second, browser enforcement tests on protected flows. Third, scheduled production probes that hit the CDN and real domains. Local app tests are useful, but they do not prove edge behavior.

\`\`\`yaml
name: security-headers

on:
  pull_request:
  schedule:
    - cron: '17 3 * * *'

jobs:
  headers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm ci

      - run: node scripts/check-hsts.mjs https://example.com/

      - run: npx playwright test --grep "@security-headers"

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: security-header-evidence
          path: test-results
\`\`\`

For pull requests in private preview environments, replace the production URL with the preview URL. For the scheduled lane, use production. The split matters because preview and production often sit behind different CDN rules. Header bugs love that gap.

## Frequently Asked Questions

### Should every response include HSTS?

Only HTTPS responses can teach browsers HSTS, and browsers ignore the header over HTTP. For document and API responses served over HTTPS, a consistent HSTS policy is usually preferred. Static assets can carry it too, but the important question is host coverage, not file type. Test the real domains and redirects users hit. Be careful with \`includeSubDomains\`, because it applies policy to subdomains that may not be ready for forced HTTPS.

### Is X-Frame-Options enough for clickjacking protection?

It is useful, especially for simple \`DENY\` or \`SAMEORIGIN\` policies, but it is not the whole story. Modern, more flexible frame control belongs in CSP \`frame-ancestors\`, especially when specific partner origins are allowed. Many teams keep XFO for broad compatibility and add CSP for precise policy. Test both raw headers and browser behavior, because a present but obsolete value such as \`ALLOW-FROM\` can create false confidence.

### How do I test Permissions-Policy without brittle browser prompts?

Start with raw header syntax and route coverage. Then pick one or two product-relevant features and test the observable outcome in a controlled browser project. Avoid making the test depend on a native permission dialog when possible. For example, assert that a disabled feature does not successfully return data, rather than asserting one exact browser error message. Keep browser support notes close to the test because Permissions-Policy support varies by feature and browser.

### Where should security header tests run?

Run fast header assertions in pull requests, browser enforcement checks in the normal end-to-end suite, and production probes on a schedule. The production lane is important because CDNs, edge functions, and reverse proxies often add or remove headers after application tests pass. Keep the route list small but representative: login, account, admin, embed, API, redirect, and error document paths.
`,
};
