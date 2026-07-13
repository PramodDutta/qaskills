import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Configure HTTP Basic Authentication in Playwright',
  description:
    'Configure Playwright HTTP Basic Authentication per project, constrain credential origins, cover browser and API requests, and prevent secret exposure.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Configure HTTP Basic Authentication in Playwright

A staging URL answers with \`401 Unauthorized\` before the application login page can render. The response includes \`WWW-Authenticate: Basic realm="staging"\`, so filling a username field is irrelevant: the browser is being challenged at the HTTP layer, ahead of the application's own session flow.

Playwright handles this gate through the \`httpCredentials\` browser-context option. Put a username and password in the project's \`use\` configuration, and every test in that project receives a context capable of answering the Basic authentication challenge. That is different from saved storage state, cookies, OAuth tokens, and form login. Correct configuration starts by identifying which authentication layer rejected the request.

## Recognize an HTTP Basic challenge

Basic authentication is an HTTP challenge-response scheme. With the usual default behavior, the client requests a protected resource without an Authorization header, receives a 401 response containing a Basic challenge, and repeats the request with a base64-encoded username and password. Base64 is an encoding, not encryption, so the protected endpoint must use HTTPS.

Browser symptoms can be misleading in automation. A headed browser might display its native credential dialog. Headless execution might only show a failed navigation. Network evidence is clearer:

| Evidence | Indicates | Playwright mechanism |
|---|---|---|
| 401 plus \`WWW-Authenticate: Basic\` | HTTP Basic gate | \`use.httpCredentials\` |
| HTML sign-in form | Application authentication | Locators, setup project, or storage state |
| 302 to an identity provider | OIDC or SAML login | Browser flow and stored authenticated state |
| API expects \`Authorization: Bearer ...\` | Token authentication | Request headers or application token flow |
| Client certificate requested in TLS | Mutual TLS | \`clientCertificates\` context configuration |

Do not solve a Basic challenge by manually constructing an Authorization header for every page request. Browser subresources, redirects, new pages, and context-associated API requests make that approach incomplete. Configure the context at the boundary where credentials belong.

## Put credentials on a dedicated Playwright project

Per-project configuration makes access policy visible. It also lets the same suite verify protected staging and an unprotected local environment without conditional logic in each spec.

\`\`\`typescript
import { defineConfig, devices } from '@playwright/test';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(\`Missing required environment variable: \${name}\`);
  return value;
}

export default defineConfig({
  testDir: './tests',
  projects: [
    {
      name: 'staging-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://staging.example.test',
        httpCredentials: {
          username: requireEnv('STAGING_BASIC_USER'),
          password: requireEnv('STAGING_BASIC_PASSWORD'),
          origin: 'https://staging.example.test',
        },
      },
    },
    {
      name: 'local-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3000',
      },
    },
  ],
});
\`\`\`

Run the staging project only in jobs that receive the two environment variables. The helper fails during configuration if either secret is missing, which is preferable to a suite of opaque 401 failures. The values are not printed.

The optional \`origin\` restricts where credentials are used. Its value is an origin, meaning scheme, host, and port. A path such as \`https://staging.example.test/admin\` is not an origin restriction. Include a nondefault port when the target uses one.

Keep \`baseURL\` and \`origin\` aligned but understand their different jobs. \`baseURL\` resolves relative URLs passed to \`page.goto()\` and context request methods. \`origin\` limits credential delivery. A typo in one can produce a perfectly valid navigation that never receives credentials.

## Test the gate, not only the page behind it

A passing dashboard test proves valid credentials can cross the gate. It does not prove that the gate rejects missing or incorrect credentials. Security-relevant behavior deserves a focused negative check using an isolated context.

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('valid Basic credentials allow dashboard navigation', async ({ page }) => {
  const response = await page.goto('/dashboard');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Operations dashboard' })).toBeVisible();
});

test('the staging gate rejects a request context without credentials', async ({ playwright }) => {
  const anonymous = await playwright.request.newContext({
    baseURL: 'https://staging.example.test',
  });
  const response = await anonymous.get('/dashboard');
  expect(response.status()).toBe(401);
  expect(response.headers()['www-authenticate']).toMatch(/^Basic\b/i);
  await anonymous.dispose();
});
\`\`\`

The negative test creates a standalone request context explicitly without project credentials and disposes it after use. It avoids browser-native credential prompt behavior while still asserting the reverse proxy's HTTP response directly.

In some browsers, a challenged navigation may produce behavior that is less convenient to assert than an API request. If your deployment platform serves a stable health endpoint behind the same gate, test that endpoint through a standalone request context for the negative case. What matters is that the assertion observes the actual 401 and Basic challenge rather than a branded proxy error page.

## Browser navigation and APIRequestContext are related but not identical

The project-level \`httpCredentials\` option is applied to the browser context and its associated request context, available as \`page.request\` or the Playwright Test \`request\` fixture. Those API requests use the configured credentials. However, the \`send\` option has a scope that catches many teams off guard.

\`send: 'unauthorized'\` is the default. For API requests, credentials are sent after a 401 response includes a \`WWW-Authenticate\` challenge. \`send: 'always'\` makes the associated API request context send the Basic Authorization header preemptively. The documentation explicitly notes that \`send\` applies to requests from the corresponding \`APIRequestContext\`; it does not change requests sent by the browser.

| Configuration | APIRequestContext behavior | Browser navigation behavior |
|---|---|---|
| No \`send\` value | Responds after a valid 401 challenge | Browser context handles the challenge |
| \`send: 'unauthorized'\` | Same challenge-first behavior | Unchanged by this setting |
| \`send: 'always'\` | Sends credentials with each request to the allowed target | Does not force preemptive browser headers |
| \`origin\` present | Restricts credentials to that origin | Restricts browser-context HTTP credentials |

Preemptive sending can be necessary for a server or proxy that does not issue a standards-compliant challenge, but it widens exposure on every applicable API request. Use an exact \`origin\`, HTTPS, and a dedicated low-privilege account.

## Configure separate credentials for separate protected hosts

A Playwright browser context accepts one \`httpCredentials\` object. If a test journey crosses two independent Basic-authenticated origins with different accounts, one project-level context cannot represent both sets through this option.

There are several honest designs:

1. Split the checks into projects, one per protected origin.
2. Create separate browser contexts with different credentials inside an orchestration test.
3. Use isolated \`APIRequestContext\` instances for backend setup on the secondary service.
4. Reconsider whether an end-to-end browser journey should cross two infrastructure gates at all.

The following worker-scoped fixture is unnecessary for a single host; plain project configuration is simpler. For two hosts, explicit contexts are easier to audit:

\`\`\`typescript
import { expect, test } from '@playwright/test';

test('compare protected reports from two regions', async ({ browser }) => {
  const euContext = await browser.newContext({
    httpCredentials: {
      username: process.env.EU_BASIC_USER!,
      password: process.env.EU_BASIC_PASSWORD!,
      origin: 'https://eu-staging.example.test',
    },
  });
  const usContext = await browser.newContext({
    httpCredentials: {
      username: process.env.US_BASIC_USER!,
      password: process.env.US_BASIC_PASSWORD!,
      origin: 'https://us-staging.example.test',
    },
  });

  try {
    const euPage = await euContext.newPage();
    const usPage = await usContext.newPage();
    await euPage.goto('https://eu-staging.example.test/report');
    await usPage.goto('https://us-staging.example.test/report');

    await expect(euPage.getByTestId('report-version')).toHaveText('v7');
    await expect(usPage.getByTestId('report-version')).toHaveText('v7');
  } finally {
    await euContext.close();
    await usContext.close();
  }
});
\`\`\`

The non-null assertions keep the sample focused, but production configuration should validate variables once, as in the first example. Separate accounts also make revocation and audit logs meaningful.

## Keep the Basic password out of source and reports

Never commit staging credentials to \`playwright.config.ts\`, even if the environment is "only QA." A Basic gate often protects unreleased features, customer-like data, or admin utilities. Treat the account as a deploy secret.

Place values in the CI platform's encrypted secret store and map them to environment variables only for the test step. Locally, developers can use a gitignored environment loader or shell session. Do not put the values in project names, annotations, custom error messages, trace labels, or screenshots.

Playwright traces can contain network metadata and page content. The browser normally represents HTTP authentication as a credentialed challenge rather than a form field, but downstream pages may still expose sensitive operational data. Apply the same artifact retention and access policy you use for application-authenticated tests.

Credential rotation should not require a source change. A dedicated automation account with minimum access is better than a shared engineer account. If the proxy supports separate read-only credentials for test navigation, use them. Do not reuse the application's database or cloud-provider password as an HTTP gate password.

## Diagnose repeated 401 responses methodically

When valid-looking credentials still fail, avoid immediately switching to a hand-built header. Determine which part of the challenge is incorrect.

| Symptom | Likely cause | Investigation |
|---|---|---|
| Navigation never retries after 401 | Missing or malformed Basic challenge | Inspect \`WWW-Authenticate\` on the response |
| Works on host, fails on explicit port | \`origin\` omits or mismatches port | Compare exact URL origins |
| Page works, \`request.get()\` fails | Request fixture has different configuration | Confirm fixture/project and base URL |
| API works with \`send: 'always'\` only | Server does not challenge correctly | Fix proxy if possible, otherwise document preemptive need |
| Main document succeeds, assets return 401 | Assets use another protected origin | Inventory subresource hosts and credential boundary |
| One project passes, another fails | Credentials configured only on one project | Inspect merged project \`use\` settings |

Enable targeted request and response logging without printing Authorization values. A response listener can record URL origin and status. If you capture headers, redact sensitive names before attaching them. A trace is helpful for redirect chains, but do not upload it to a public issue tracker.

Redirects deserve particular attention. An origin-restricted credential should not follow a redirect and become available to an unrelated host. If the protected endpoint redirects to a canonical hostname, configure the canonical origin or repair the deployment route. Broadening the credential scope to make a redirect work trades a visible failure for a security ambiguity.

## Do not confuse the infrastructure gate with app login

Many staging systems have two consecutive layers: HTTP Basic authentication at the reverse proxy, then the product's sign-in flow. \`httpCredentials\` handles only the first. After the browser crosses it, your ordinary application authentication setup still has to run.

This layering affects failure diagnosis:

| Failure location | Typical status or UI | Correct test asset |
|---|---|---|
| Reverse proxy gate | 401 and Basic challenge | Project \`httpCredentials\` |
| Application sign-in | Login page or identity-provider redirect | Setup project and storage state |
| API authorization | 403 after identity established | Role-specific test user and permission assertions |
| Session expiry | Redirect or API 401 after time passes | Expiry and renewal scenario |

You may combine \`httpCredentials\` and \`storageState\` in the same project's \`use\` object. They solve separate problems and do not overwrite each other. Generate storage state through a setup project that also has Basic credentials, because its login navigation must cross the same proxy.

For the full set of project and use settings, consult the [Playwright test configuration reference](/blog/playwright-test-config-options-complete-reference). To design role and permission scenarios behind the gate, use the [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide).

## Decide when a header is the better tool

\`httpCredentials\` is correct for a true Basic challenge. An explicit \`extraHTTPHeaders.Authorization\` value may be appropriate for an API whose documented contract requires preemptive Basic credentials and never uses browser navigation. In that case, a standalone request context makes the boundary clear.

Avoid combining \`httpCredentials\` with a manually supplied Basic Authorization header for the same origin. Reviewers will not know which credential won, and negative tests may accidentally inherit the header. Similarly, do not encode credentials in URLs such as \`https://user:pass@host\`; support and security behavior varies, URLs leak into logs, and the practice is difficult to govern.

The relevant alternatives are not interchangeable:

| Technique | Appropriate target | Why it is not a substitute |
|---|---|---|
| \`httpCredentials\` | HTTP Basic challenge at browser or request-context level | Does not sign into an HTML form |
| \`storageState\` | Cookies and local storage from app authentication | Cannot answer an infrastructure Basic challenge |
| \`extraHTTPHeaders\` | Documented fixed request header | Can over-send credentials and bypass challenge semantics |
| Request \`headers\` option | One isolated API call | Does not cover browser subresources or navigation |
| UI form automation | Product login behavior | Operates after the HTTP response is available |

## Check proxy caching and realm changes

Authentication responses pass through reverse proxies and CDNs whose cache rules can invalidate an otherwise correct test. A shared cache must not serve an authenticated page to an anonymous context. Your negative test should run after a successful credentialed navigation as well as before it. If the second anonymous request receives 200 with protected content, the defect is cache isolation, not Playwright configuration.

The \`WWW-Authenticate\` realm is descriptive and browsers can use it when managing credential challenges. Avoid making assertions on a particular realm string unless operations treats it as configuration under test. Assert the Basic scheme and rejection semantics; a harmless realm rename should not break the entire product suite.

Credential rotation can be exercised without exposing either password. Provision a disposable account through an approved administrative test boundary, verify old credentials fail after rotation, and verify a fresh context succeeds with the new value. Do not mutate a shared CI credential while parallel jobs are using it.

HTTP 407 indicates proxy authentication, which is not the same as the origin server's 401 challenge. \`httpCredentials\` describes HTTP credentials for the context, but a corporate forward proxy may require separate proxy configuration. Record the response status and hop that generated it before changing the origin credential settings.

Finally, test logout expectations honestly. Closing an application session does not revoke HTTP Basic credentials held by the browser context. To simulate a user without the infrastructure credential, create a new context without \`httpCredentials\`. A page-level logout button normally affects only the application's session layer.

## A production-ready review pass

Before merging the configuration, verify the origin includes the intended scheme and port, both environment variables are required without being logged, and the account is limited to the staging property. Run one positive navigation and one negative request without credentials. If a wrong password produces the same content as a correct one, the gate may not be active on that route.

Run the project in each required browser if the gate protects browser-facing journeys. Basic authentication is standardized, but proxy redirects and native prompt behavior can still differ. Keep gate tests small; after one focused assertion proves the boundary, the rest of the application suite can treat it as setup and focus on product behavior.

Finally, check failure artifacts. Deliberately provide a wrong password in a safe local or disposable environment, then inspect console output, HTML report, trace, screenshots, and CI annotations. A secret-management claim is incomplete until the failure path has been reviewed.

## Frequently Asked Questions

### Does send: 'always' make Chromium send Basic credentials preemptively?

No. The \`send\` setting applies to requests from the corresponding \`APIRequestContext\`, not requests sent by the browser. Browser navigation still follows the browser context's authentication behavior.

### Can one Playwright project hold credentials for two Basic-auth origins?

The \`httpCredentials\` option represents one credential object. Use separate projects or explicit browser contexts when independent origins require different usernames and passwords.

### Why does my username and password work in curl but fail in Playwright?

Curl is often invoked with preemptive credentials, while the server may send a missing or malformed \`WWW-Authenticate\` challenge. Inspect the 401 response, exact origin, redirects, and whether an API-only call genuinely requires \`send: 'always'\`.

### Can I use httpCredentials together with storageState?

Yes. Basic credentials cross the HTTP infrastructure gate; storage state restores application cookies and local storage. Configure both when staging has two authentication layers.

### Should the Basic account be shared by every CI environment?

Prefer separate, least-privilege credentials per environment. Independent rotation and audit trails reduce the blast radius of a leaked secret and make failed access easier to investigate.
`,
};
