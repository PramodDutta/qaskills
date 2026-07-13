import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Test Client-Certificate Authentication with Playwright',
  description:
    'Test client-certificate authentication with Playwright using real PEM or PFX identities, exact origin matching, negative mTLS cases, and certificate rotation.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Test Client-Certificate Authentication with Playwright

The TLS handshake ends before your login page can render. That is the defining constraint of mutual TLS testing: when the gateway asks for a client certificate, browser automation cannot repair a missing or untrusted identity with a later header, cookie, or form submission. The certificate and private key must be available while Playwright creates the browser context and connects to the exact protected origin.

Playwright supports this directly through the \`clientCertificates\` context option. A test can present a PEM certificate plus key, or a PFX/PKCS#12 bundle, and can bind different credentials to different HTTPS origins. That makes positive browser coverage practical, but mature mTLS testing goes further. You also need no-certificate rejection, wrong-certificate rejection, origin scoping, application authorization after the handshake, expiry and rotation exercises, and careful secret handling in CI.

## Where the client identity enters the handshake

In ordinary server-authenticated HTTPS, the browser validates the server certificate. With client-certificate authentication, the server additionally sends a certificate request. The browser presents an acceptable certificate and proves possession of its private key. A reverse proxy, service mesh ingress, API gateway, or application TLS listener validates the chain and may forward a verified identity to the application.

This layered path creates distinct failure surfaces:

| Layer | Example defect | Observable browser result |
|---|---|---|
| Client material | Key does not match certificate | Context request fails or handshake cannot complete |
| Origin selection | Certificate configured for wrong port | No matching client identity is presented |
| Trust validation | Issuer CA absent from gateway trust store | TLS connection rejected |
| Certificate constraints | Certificate expired or unsuitable for client auth | Handshake rejected |
| Identity mapping | Subject/SAN mapped to wrong principal | TLS succeeds, application returns unauthorized or wrong account |
| Business authorization | Valid machine identity lacks resource permission | HTTP 403 or product-specific denial |

Do not collapse all of these into "login failed." Record whether navigation failed at transport level, returned a gateway status, or reached an application denial page. The assertion should identify which security boundary is being exercised.

## Configure PEM credentials for one protected origin

Client certificates were added to Playwright in version 1.46. In a Playwright Test project, place \`clientCertificates\` under \`use\`. The \`origin\` must match exactly, including scheme and non-default port. Paths may be relative to the process working directory, so resolve them explicitly in suites launched from more than one location.

\`\`\`typescript
import { defineConfig } from '@playwright/test';
import path from 'node:path';

const certDir = path.resolve(process.cwd(), 'test-secrets', 'mtls');

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'https://portal.internal.example:8443',
    clientCertificates: [
      {
        origin: 'https://portal.internal.example:8443',
        certPath: path.join(certDir, 'qa-operator.crt.pem'),
        keyPath: path.join(certDir, 'qa-operator.key.pem'),
        passphrase: process.env.MTLS_KEY_PASSPHRASE,
      },
    ],
  },
});
\`\`\`

The certificate file contains the public certificate, usually with its intermediate chain if your endpoint requires that chain from the client. The key file contains the associated private key. \`passphrase\` is optional and should be present only for encrypted material. Never hard-code a production passphrase into the config.

A focused positive test should prove both transport admission and identity propagation:

\`\`\`typescript
import { test, expect } from '@playwright/test';

test('operator certificate maps to the intended portal principal', async ({ page }) => {
  const response = await page.goto('/account');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Operator account' })).toBeVisible();
  await expect(page.getByTestId('certificate-subject')).toHaveText(
    'qa-operator@internal.example',
  );
  await expect(page.getByRole('link', { name: 'Audit workspace' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Billing administration' })).toHaveCount(0);
});
\`\`\`

Asserting the mapped subject prevents a dangerous false positive in shared environments, where a gateway fallback identity or existing session cookie might grant access. Clear storage or create a new context per identity, and avoid relying only on a generic dashboard heading.

## Use PFX when the issuing process produces a bundle

Many enterprise certificate workflows export a password-protected PKCS#12 file with a \`.pfx\` or \`.p12\` extension. Playwright accepts that bundle through \`pfxPath\`, or as a \`Buffer\` through \`pfx\`. Do not also provide PEM fields in the same certificate entry.

\`\`\`typescript
import { test, expect } from '@playwright/test';
import path from 'node:path';

test.use({
  clientCertificates: [
    {
      origin: 'https://claims.example.test',
      pfxPath: path.resolve('test-secrets/claims-adjuster.p12'),
      passphrase: process.env.CLAIMS_PFX_PASSPHRASE,
    },
  ],
});

test('adjuster identity can view but not approve its own claim', async ({ page }) => {
  await page.goto('https://claims.example.test/claims/CLM-8421');

  await expect(page.getByTestId('claim-number')).toHaveText('CLM-8421');
  await expect(page.getByRole('button', { name: 'Add assessment' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Final approval' })).toHaveCount(0);
});
\`\`\`

Path-based credentials are convenient locally. In ephemeral CI, direct buffers can avoid writing secrets into the repository checkout. For example, decode a base64 secret with \`Buffer.from(value, 'base64')\` and supply it through \`pfx\`. Whether that is safer depends on the runner: environment variables, temporary files, process inspection, and artifact collection all have different exposure risks. Use the secret manager and cleanup controls already approved by your platform team.

## Prove the server rejects a missing certificate

An empty \`clientCertificates\` array does not activate client-certificate handling. Depending on the browser and operating system, an interactive certificate chooser or ambient certificate store can complicate a negative test. Playwright documents a deterministic technique: configure a client certificate whose \`origin\` does not match the site being visited. Client-certificate authentication is active, but Playwright has no eligible certificate for the target.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.describe('mTLS admission control', () => {
  test.use({
    ignoreHTTPSErrors: true,
    clientCertificates: [
      {
        origin: 'https://not-the-target.example.test',
        certPath: 'test-secrets/unmatched-client.crt.pem',
        keyPath: 'test-secrets/unmatched-client.key.pem',
      },
    ],
  });

  test('connection without an eligible certificate is denied', async ({ page }) => {
    const failure = await page
      .goto('https://secure-api.example.test/console')
      .then(() => null)
      .catch((error: Error) => error);

    expect(failure).not.toBeNull();
    expect(failure?.message).toMatch(/certificate|SSL|TLS|connection/i);
  });
});
\`\`\`

The exact browser error text varies across Chromium, Firefox, WebKit, operating systems, and gateway behavior. Some infrastructures terminate the handshake; others complete TLS and return an HTTP 4xx response from an intermediary. Write the negative assertion for your deployed contract, not a copied engine-specific string. If either transport failure or a defined 403 page is acceptable, model those as explicit accepted outcomes and preserve diagnostics for both.

\`ignoreHTTPSErrors\` affects validation of the server certificate. It does not make an invalid client certificate acceptable to the server. Use it only when the test environment has a private or self-signed server CA that the browser runner does not trust, and recognize that it reduces coverage of server identity validation.

## Wrong identity is a different test from no identity

The absence case establishes that the mTLS gate is active. It does not prove the gateway validates the correct issuer, validity period, revocation policy, or subject mapping. Build negative identities intentionally and label their expected rejection point.

| Credential fixture | What it challenges | Expected outcome |
|---|---|---|
| Certificate signed by an untrusted test CA | Trust anchor enforcement | TLS rejection |
| Valid certificate for another tenant | Identity-level isolation | Handshake may pass, resource access denied |
| Certificate with mismatched private key | Proof of possession and fixture integrity | Client-side or handshake failure |
| Expired certificate | Validity-window enforcement | TLS rejection |
| Revoked certificate | Gateway revocation configuration | Rejection if CRL/OCSP policy is enabled |
| Valid identity with read-only role | Application authorization | Read succeeds, mutation returns 403 |

Generate these fixtures through your test PKI rather than editing certificate bytes. Time-based certificates need a stable strategy. A committed "expired" certificate remains useful, while a "not yet valid" certificate eventually becomes valid and silently changes meaning. For rotation scenarios, issue short-lived credentials during an isolated environment setup or keep fixed fixtures whose validity boundaries are deliberately historical or far enough in the future for the test's purpose.

Do not use a production-revoked certificate in routine CI. Revocation checks may contact external responders, leak environment details, or create brittle network dependencies. A private test CA and a gateway configured for its test CRL give you control.

## Exercise more than one origin without leaking credentials

The origin binding is a security feature. A certificate intended for \`https://admin.example.test\` should not automatically be sent to \`https://metrics.example.test\`. Add both origins only when the same identity is expected at both.

\`\`\`typescript
import { test, expect } from '@playwright/test';

test.use({
  clientCertificates: [
    {
      origin: 'https://orders.example.test',
      certPath: 'test-secrets/order-reader.crt.pem',
      keyPath: 'test-secrets/order-reader.key.pem',
    },
    {
      origin: 'https://audit.example.test:9443',
      pfxPath: 'test-secrets/audit-reader.p12',
      passphrase: process.env.AUDIT_PFX_PASSPHRASE,
    },
  ],
});

test('each service receives its assigned certificate identity', async ({ request }) => {
  const orders = await request.get('https://orders.example.test/whoami');
  expect(orders.status()).toBe(200);
  expect(await orders.json()).toMatchObject({ principal: 'order-reader' });

  const audit = await request.get('https://audit.example.test:9443/whoami');
  expect(audit.status()).toBe(200);
  expect(await audit.json()).toMatchObject({ principal: 'audit-reader' });
});
\`\`\`

Notice the explicit port on the audit origin. A certificate configured for the default HTTPS port does not match port 9443. Paths are irrelevant to origin matching, so one entry covers every path at that scheme, host, and port.

If the browser navigates through a redirect, the destination is a new origin. Configure a credential for the destination if it also requests a certificate. A redirect from a public landing page to a protected host is a useful integration test because it catches missing destination configuration.

## Separate browser identity from session authorization

After mTLS succeeds, many products issue an application session. Subsequent page behavior may depend on both the certificate identity and cookies. A test can accidentally pass with a cookie created under another certificate if storage state is reused indiscriminately.

Use a clean context for each certificate persona. Avoid saving authenticated storage state from one identity and loading it under another unless the scenario is specifically testing certificate-to-session binding. High-value cases include:

- A session minted for certificate A is rejected when resumed with certificate B.
- Logging out clears the application session but does not alter the transport identity.
- A certificate identity maps to exactly one tenant even when a URL requests another tenant.
- Removing the role mapping causes authorization denial while the TLS handshake still succeeds.
- A gateway-provided identity header cannot be spoofed by a browser request header.

That last case matters when the proxy forwards fields such as a verified subject. The application must trust those headers only from the gateway and the gateway must overwrite any client-supplied value. Use a test endpoint or observable account label to confirm the server uses the verified certificate identity, not an injected header.

For broader context isolation patterns, see the [Playwright browser context guide](/blog/playwright-browser-context-guide-2026). The [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide) covers role matrices after identity has been established.

## Rotation without a misleading browser reuse

Certificate rotation is operationally significant: the new chain must be trusted, the new identity mapping must exist, and the old credential must stop working at the intended boundary. A browser context is the wrong unit to reuse across a rotation test because TLS connections may be pooled and an existing connection may avoid a new handshake.

Design the exercise as distinct contexts:

1. Create a context with the old certificate and prove the baseline.
2. Apply the gateway trust or mapping change through environment automation outside the UI test.
3. Close the old context and, when necessary, its browser to end pooled connections.
4. Create a fresh context with the new certificate and verify access.
5. Create another fresh context with the old certificate and verify the documented rejection.

The order prevents a false result caused by connection reuse. If the production rollout includes an overlap window where both certificates work, test that state separately from the post-cutover state. Do not squeeze a multi-stage operational procedure into one assertion.

## CI custody for certificates and keys

A private key is an authentication secret. Treat test keys with the same operational discipline as passwords of equivalent privilege, even if the associated environment contains synthetic data.

| Control | Practical implementation |
|---|---|
| Least privilege | Issue test identities limited to named test resources |
| Secret injection | Fetch from CI secret manager at job runtime |
| File permissions | Restrict temporary key files to the job user |
| Artifact hygiene | Exclude certificate directories, traces, and debug dumps containing secrets |
| Log redaction | Never print PEM, PFX base64, or passphrases |
| Rotation | Give test certificates an owner and renewal procedure |
| Fork safety | Do not expose protected secrets to untrusted pull-request jobs |

Playwright traces normally record browser activity rather than private key material, but application pages may display certificate subjects or internal identifiers. Review trace retention and access accordingly. A failed setup script must also clean temporary material, so use runner cleanup hooks that execute after failure.

The safest topology often gives untrusted pull requests a mock or public environment, while protected branch jobs receive the private mTLS identity. That means the test suite should report a deliberate skip reason when credentials are unavailable, and a required protected job should ensure the cases actually ran. A silent conditional that omits all mTLS coverage is not a security control.

## Browser and environment edge cases

Cross-browser behavior deserves direct verification because TLS stacks and certificate selection differ. Playwright notes a specific WebKit-on-macOS issue: client certificates are not picked up for \`localhost\`; use a hostname such as \`local.playwright\` instead. Map that name to loopback in the test environment and ensure the server certificate covers it.

Containers need DNS reachability to the protected hostname and access to injected files. Corporate proxies may terminate TLS and alter the handshake, so compare the runner's network path with the intended production path. When a certificate works through \`curl\` on the host but not in Playwright's container, inspect DNS, proxy variables, CA trust, file permissions, and exact origin before blaming the browser.

Use OpenSSL tooling outside the browser test to validate fixture structure and key pairing during environment setup. That preflight is faster to diagnose than a generic navigation failure. Keep it separate from the Playwright assertion so the browser test still validates the real client integration.

## A maintainable mTLS test matrix

Do not multiply every functional scenario by every certificate. Select cases at the boundaries:

| Scenario | Identity | Browser depth |
|---|---|---|
| Protected entry point | None | One negative navigation per TLS termination path |
| Happy path | Standard valid certificate | Critical page and principal assertion |
| Privilege boundary | Valid read-only certificate | One allowed read and one denied mutation |
| Tenant separation | Valid certificate from tenant B | Attempt access to tenant A resource |
| Trust boundary | Untrusted issuer | Handshake rejection |
| Cutover | Old and new certificates | Fresh-context rotation workflow |
| Origin scoping | Valid cert bound elsewhere | Target receives no eligible credential |

API request contexts are efficient for broad endpoint authorization, while browser tests prove the client integration and user journey. Playwright supports client certificates for both. Keep enough browser coverage to catch redirects, session creation, and identity display, then use request-level tests for a wider permission matrix.

## Validate the test certificate before blaming navigation

Add an environment preflight that checks the certificate parses, its validity window includes the test time, and its public key matches the private key. The preflight should report certificate fingerprint and expiry, never key material. This separates a broken secret injection from a gateway rejection and makes rotation failures much faster to route.

## Frequently Asked Questions

### Does ignoreHTTPSErrors allow an invalid client certificate?

No. It relaxes the browser's validation of the server certificate. The server or gateway still decides whether to accept the presented client certificate.

### Why is Playwright not sending my certificate to the same hostname on another port?

Certificate selection uses an exact origin, which includes scheme, hostname, and port. Add a separate \`clientCertificates\` entry for the non-default port.

### Can I provide certificate bytes instead of writing files?

Yes. Use \`cert\` and \`key\` buffers for PEM material, or a \`pfx\` buffer for PKCS#12. Each entry must use one complete supported form, not a mixture.

### How do I test the absence of a certificate reliably?

Activate client-certificate handling with a valid entry whose origin does not match the protected destination. Then assert the transport or gateway rejection defined by your environment.

### Why should a rotation test create a new browser context?

Existing TLS connections can be reused, avoiding a new handshake with the rotated credential. Closing the context, and sometimes the browser, forces the new connection needed to validate the cutover.
`,
};
