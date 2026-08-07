import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress Multi Domain Session Guide for Reliable SSO Tests',
  description: 'Use this Cypress multi domain session guide to test SSO, preserve authenticated state, prevent origin errors, and keep cross-domain CI suites reliable.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Cypress Multi Domain Session Guide for Reliable SSO Tests

A reliable Cypress multi domain session test separates two concerns. Use \`cy.origin()\` for commands that must run on another origin, such as an identity provider login page, and use \`cy.session()\` to cache and restore the browser state created by that login. The origin includes scheme, hostname, and port, so \`https://app.example.test\` and \`https://id.example.test\` are different origins even though they share a parent domain.

The practical workflow is: start on the application, trigger authentication, enter the identity provider with \`cy.origin()\`, complete the login, verify that the application is authenticated, and wrap the setup in \`cy.session()\` with a unique cache key and a meaningful \`validate\` callback. That combination avoids repeated UI logins without pretending that navigation and session state are the same problem.

This Cypress multi domain session guide builds that workflow for QA and test-automation engineers who maintain SSO suites in local development and CI. It covers origin boundaries, serializable arguments, cookie behavior, cache identity, logout, parallel execution, and the failure modes that commonly produce false confidence.

## Model the browser boundaries before writing a command

Cypress runs test commands with awareness of the browser's same-origin security model. A page can redirect from an application origin to an identity provider origin, but commands that interact with the second origin need to execute inside a \`cy.origin()\` callback. Thinking only in terms of domains is imprecise because the URL scheme and port are part of the origin too.

| URL A | URL B | Same origin? | Consequence for the test |
|---|---|---:|---|
| \`https://app.example.test/home\` | \`https://app.example.test/settings\` | Yes | Commands can continue normally |
| \`https://app.example.test\` | \`https://login.example.test\` | No | Use \`cy.origin()\` for commands on login host |
| \`http://app.example.test\` | \`https://app.example.test\` | No | Treat scheme transition as a new origin |
| \`http://localhost:3000\` | \`http://localhost:4000\` | No | Different ports require an origin boundary |
| \`https://example.test\` | \`https://example.test:443\` | Usually normalized by the browser | Prefer one canonical URL in configuration |

Draw the redirect sequence before implementing the test. A typical authorization-code login has at least four observable transitions:

1. The browser requests a protected application route.
2. The application redirects to the identity provider.
3. The identity provider authenticates the user and redirects to the application's callback.
4. The application exchanges or consumes the result, establishes its own browser state, and renders an authenticated page.

The session you want to cache is usually the state after step four, not merely an identity-provider cookie after step three. If the app stores a server session cookie, caching only the IdP state may still cause the application to repeat its callback flow. If the app uses browser storage, identify the exact local storage or cookie evidence that means its bootstrap is complete.

This boundary map also prevents an overbroad test. One dedicated SSO journey can prove the real redirect and form integration. Most feature tests can begin from a cached authenticated state. For a broader choice of runner and test layer, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides useful context.

## Build one uncached cross-origin login first

Do not introduce session caching until the raw login succeeds consistently. That sequencing keeps two possible defects from being confused: a broken multi-origin interaction and a bad session restore. The following example assumes the application starts at the configured \`baseUrl\`, exposes a sign-in link, redirects to a fictional IdP, and returns to \`/dashboard\`.

\`\`\`ts
describe('real SSO redirect', () => {
  it('signs in through the identity provider', () => {
    cy.visit('/account');
    cy.contains('a', 'Sign in').click();

    cy.origin(
      'https://login.example.test',
      {
        args: {
          username: Cypress.env('E2E_USERNAME'),
          password: Cypress.env('E2E_PASSWORD'),
        },
      },
      ({ username, password }) => {
        cy.get('input[name="username"]').type(username);
        cy.get('input[name="password"]').type(password, { log: false });
        cy.contains('button', 'Continue').click();
      },
    );

    cy.url().should('include', '/dashboard');
    cy.contains('h1', 'Dashboard').should('be.visible');
  });
});
\`\`\`

The callback function executes in a separate Cypress instance associated with the target origin. Values from the surrounding test are not available through a JavaScript closure in the usual way. Pass required values with \`args\`; those values must be serializable. Within the callback, query the identity provider page from scratch rather than trying to carry a DOM element or Cypress chain across the boundary.

Use a selector contract you control when possible. Hosted identity provider pages can change independently, so a locator based on stable form names or documented test identifiers is preferable to CSS generated from a component library. If the provider offers a supported test tenant, use it rather than automating a consumer login protected by bot detection, CAPTCHA, or unpredictable risk challenges.

Add an explicit assertion after returning to the application. A URL assertion alone can be weak because an error callback can share the same path. Pair it with an authenticated UI marker or a lightweight application-owned API request. The final assertion defines what a successful setup means and will later become the basis of session validation.

## Put the login inside cy.session with an identity-safe key

\`cy.session(id, setup, options)\` associates cached browser state with an identifier. On the first use, Cypress runs the setup callback, captures cookies plus local and session storage, and continues. On a later use of the same session, Cypress can restore that state instead of repeating the full setup. The test must still visit the desired application page after the session command.

Create a custom command that owns the setup and validation contract:

\`\`\`ts
type UserRole = 'viewer' | 'editor' | 'admin';

Cypress.Commands.add('loginBySso', (username: string, role: UserRole) => {
  cy.session(
    ['sso', username, role],
    () => {
      cy.visit('/account');
      cy.contains('a', 'Sign in').click();

      cy.origin(
        'https://login.example.test',
        { args: { username } },
        ({ username }) => {
          cy.get('input[name="username"]').type(username);
          cy.get('input[name="password"]')
            .type(Cypress.env('E2E_PASSWORD'), { log: false });
          cy.contains('button', 'Continue').click();
        },
      );

      cy.url().should('include', '/dashboard');
    },
    {
      validate() {
        cy.request('/api/me')
          .its('status')
          .should('eq', 200);
      },
    },
  );
});
\`\`\`

The array identifier is deliberate. Username distinguishes two accounts. Role distinguishes cases where the same account can be provisioned differently between scenarios. The fixed \`sso\` prefix keeps this login mechanism separate from an API-login session that happens to use the same user.

| Session key input | Include it? | Reason |
|---|---:|---|
| Authentication mechanism | Yes | UI SSO and programmatic login may produce different state |
| Stable user or tenant identity | Yes | Prevents one account's state from serving another |
| Role or permission fixture | Yes, when setup changes it | Avoids restoring stale authorization assumptions |
| Password | No | Secret does not define desired browser state and should not enter logs |
| Spec filename | Usually no | Reduces reuse without improving correctness |
| Random UUID | No | Forces a new session every time and defeats caching |

A cache key is not a label for humans. It is a functional identity for the state. If two setups can result in meaningfully different cookies, storage, tenant, or permissions, they need different identifiers. If they produce the same authenticated state, needless key variation wastes time.

## Validate a capability, not the mere presence of a cookie

The \`validate\` callback runs after setup and when a saved session is restored. If validation fails after restoration, Cypress reruns setup. This is the safeguard against expired server sessions and stale browser data. A strong validator is fast, stable, and tied to the capability the tests need.

| Validation method | Signal quality | Cost | Main limitation |
|---|---:|---:|---|
| Assert a cookie exists | Low | Very low | Cookie may be expired or rejected server-side |
| Inspect a token-shaped storage value | Low to medium | Very low | Shape does not prove acceptance or permissions |
| Request \`/api/me\` and assert 200 | High | Low | Endpoint must be stable and available |
| Request user profile and assert tenant or role | Very high | Low to medium | Couples validation to authorization fixture |
| Visit a protected page | High | High | Adds rendering and navigation to every validation |

For a role-sensitive suite, inspect the response body rather than checking status alone:

\`\`\`ts
validate() {
  cy.request('/api/me').then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.include({
      username,
      role,
    });
  });
}
\`\`\`

This catches a subtle failure: the session is valid, but it belongs to the wrong tenant or permission set. That can happen when a shared account is reconfigured, when a session key omits role, or when an environment reuses a stale server session.

Avoid validators that mutate data, depend on a fragile dashboard widget, or accept multiple ambiguous outcomes. The validation callback is run often enough that it should not create orders, send mail, or consume single-use state. An application-owned identity endpoint is generally the cleanest contract.

What people often get wrong is treating \`validate\` as an assertion that setup ran. Its real purpose is to decide whether the cached state is still safe to reuse. A cookie existence check proves only that bytes were restored, not that the backend recognizes them.

## Visit explicitly after session restoration

When test isolation is enabled, Cypress clears browser context before tests, and \`cy.session()\` manages the session data rather than promising that the browser is left on a particular application page. Put the destination visit after login in each test or in an appropriate setup hook.

\`\`\`ts
describe('billing permissions', () => {
  beforeEach(() => {
    cy.loginBySso('billing-editor@example.test', 'editor');
    cy.visit('/billing');
  });

  it('allows an editor to download an invoice', () => {
    cy.contains('tr', 'INV-2048')
      .contains('a', 'Download')
      .should('be.visible');
  });

  it('does not expose organization ownership controls', () => {
    cy.contains('button', 'Transfer ownership').should('not.exist');
  });
});
\`\`\`

Keeping navigation outside the reusable login command has two benefits. Tests can choose their own destination, and restoration does not depend on whatever URL happened to finish the original setup. It also makes failures easier to read: login establishes identity, visit establishes location, and assertions establish behavior.

For complex UI suites, stable page selectors matter just as much as session setup. The principles in [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) translate conceptually: favor role, label, and explicit test contracts over DOM structure, even though Cypress syntax differs.

Do not place unrelated data creation in the login session. If a test needs an invoice, create or seed that invoice independently. Otherwise, a restored session skips the setup callback and silently skips the data creation too. This is a common source of tests that pass alone but fail when the session cache is warm.

## Separate SSO coverage from efficient authenticated coverage

A suite rarely needs to submit the hosted login form before every test. It does need evidence that the production-shaped SSO handshake works, plus broad evidence that authenticated application behavior works. Those are related but distinct test goals.

| Layer | Login path | Recommended scope | Failure interpretation |
|---|---|---|---|
| SSO integration smoke | Real browser redirect and provider form | One or a few critical users | Redirect, provider page, callback, or session creation broke |
| Cached authenticated UI | \`cy.session()\` around the proven setup | Feature and permission scenarios | App behavior or restored authentication broke |
| Programmatic authentication | Supported test API or seeded session | Large functional suites when available | App behavior under valid identity broke |
| Contract or service checks | Direct requests | Token validation and authorization matrix | Backend identity contract broke |

Use the slowest, most realistic path only where it creates unique evidence. A full login repeated 200 times adds exposure to provider throttling and latency, but not 200 times more confidence in the redirect. Conversely, replacing every login with hand-written local storage can hide a real callback regression.

If the application team provides an official test-only endpoint or supported OAuth test flow, programmatic authentication can reduce dependence on a third-party page. Do not fabricate tokens or insert undocumented fields simply because they resemble the current storage format. Such tests bind to implementation details and may bypass security behavior that matters.

Tag or name the true SSO tests so CI can run them at an intentional frequency. Keep at least one against each supported authentication configuration that can fail independently, such as separate enterprise IdPs. The broader authenticated suite can then optimize for deterministic application feedback.

## Handle multiple identity providers without hiding their differences

Enterprise products may support more than one provider or tenant-specific discovery. Avoid one giant login helper with dozens of conditional branches. Define a small provider adapter interface in test code, keep provider-specific origin interactions separate, and share application-side validation.

\`\`\`ts
type Provider = 'workforce' | 'partner';

function completeProviderLogin(provider: Provider, username: string) {
  if (provider === 'workforce') {
    cy.origin(
      'https://workforce-id.example.test',
      { args: { username } },
      ({ username }) => {
        cy.get('[name="email"]').type(username);
        cy.contains('button', 'Next').click();
        cy.get('[name="password"]')
          .type(Cypress.env('WORKFORCE_PASSWORD'), { log: false });
        cy.contains('button', 'Sign in').click();
      },
    );
    return;
  }

  cy.origin(
    'https://partner-id.example.test',
    { args: { username } },
    ({ username }) => {
      cy.get('#user').type(username);
      cy.get('#pass').type(Cypress.env('PARTNER_PASSWORD'), { log: false });
      cy.get('form').submit();
    },
  );
}
\`\`\`

The separate branches acknowledge that selectors, intermediate screens, and consent behavior are owned by different systems. Trying to normalize every DOM action usually creates an abstraction that is harder to diagnose than the duplication it removes.

Keep secrets in CI secret storage and pass them through Cypress environment configuration. Use \`{ log: false }\` for secret entry so the value is not printed in the command log. Do not place passwords in fixtures, session identifiers, screenshots, or generated test reports. If screenshots on failure could contain sensitive identity data, configure the test account and provider page to expose only synthetic information.

For optional screens such as first-login consent, prefer preconfiguring stable test accounts. Conditional DOM probing tends to make one test represent multiple hidden paths. If consent itself is a requirement, make it a named scenario with a freshly provisioned account and explicit assertions.

## Design logout tests so the cache cannot mask a defect

Logout deserves an uncached end-state assertion. A test that invokes logout and then calls the same login helper has not proved that the server session was invalidated; the helper may restore or recreate valid state. Assert both user-visible redirection and denial from an authenticated endpoint before initiating another session.

\`\`\`ts
it('invalidates the application session on logout', () => {
  cy.loginBySso('member@example.test', 'viewer');
  cy.visit('/settings');

  cy.contains('button', 'Sign out').click();
  cy.location('pathname').should('eq', '/signed-out');

  cy.request({
    url: '/api/me',
    failOnStatusCode: false,
  }).its('status').should('be.oneOf', [401, 403]);
});
\`\`\`

Choose the expected status according to the application's documented contract rather than accepting both indefinitely. The example admits two common designs only because the sample application is fictional. Your production test should encode one expected behavior.

There are several different logout requirements:

- Application logout invalidates the local server session.
- Global logout also invalidates the identity-provider session.
- Switching accounts does not silently reuse the previous identity.
- Back navigation does not reveal protected cached content.
- A second tab observes invalidation within the product's defined behavior.

Test each requirement at its owning boundary. Application logout may not promise global provider logout, especially in federated systems. Do not call that a defect unless the product contract says so.

## Diagnose the origin mismatch failure systematically

The classic failure occurs after a click or visit: Cypress reports that the command is executing against a different origin than expected. The visible page looks correct, yet the next \`cy.get()\` cannot run because the browser has crossed a scheme, host, or port boundary.

Use this diagnostic sequence:

1. Capture the full URL immediately before the failing interaction and after the redirect.
2. Compare scheme, hostname, and port, not just the registrable domain.
3. Confirm the target supplied to \`cy.origin()\` matches the actual runtime origin.
4. Check whether the identity provider added another intermediate host for consent, region routing, or federation.
5. Verify environment variables did not mix staging application URLs with production identity URLs.
6. Determine whether a failed login stayed on the provider page while the test assumed it returned.

A simple environment preflight can surface a misconfigured origin before the form interaction:

\`\`\`ts
const appUrl = new URL(Cypress.config('baseUrl') as string);
const idpUrl = new URL(Cypress.env('IDP_ORIGIN'));

expect(appUrl.origin, 'application origin').to.eq('https://app.example.test');
expect(idpUrl.origin, 'identity provider origin').to.eq(
  'https://login.example.test',
);
expect(appUrl.origin, 'origins must differ').not.to.eq(idpUrl.origin);
\`\`\`

Do not solve an origin mismatch by adding arbitrary waits. Waiting changes timing, not security context. Also do not broaden a hostname assertion until it accepts any provider-controlled host; that can hide an accidental redirect to production or an untrusted domain. Enumerate expected origins for the test environment.

If the failing host is an intermediate federation page, the workflow may need another explicit origin block. First confirm that this page is stable and supported for automation. Sometimes the correct engineering solution is to configure a direct test tenant rather than scripting a dynamic enterprise discovery path.

## Diagnose a session that restores but is not authenticated

Another realistic failure looks different: the cached session restores successfully, the test visits \`/dashboard\`, and the application redirects to sign-in. The usual causes are an expired backend session, an incomplete setup capture, a weak validator, or a key collision.

| Symptom | Likely cause | Evidence to collect | Corrective action |
|---|---|---|---|
| First test passes, later tests redirect | Cached state no longer accepted | \`/api/me\` response and cookie expiry | Add capability validation, review test-session lifetime |
| Wrong account name appears | Session key collision | Key inputs and identity response | Include user, tenant, and relevant role in key |
| Setup ends before auth cookie appears | Asynchronous callback not complete | Network and URL at final setup command | Assert authenticated application state before setup ends |
| Works locally, fails in CI | URL, clock, secret, or provider policy differs | CI URLs, response status, redacted provider error | Align environment and use dedicated automation tenant |
| State exists but API returns 401 | Storage copied, server state missing | Cookie attributes and backend session logs | Validate server-backed capability, not storage presence |

Start by temporarily running the uncached SSO smoke and inspecting the application-owned identity response. Confirm the setup callback's final Cypress command waits for the redirect and authenticated bootstrap. Then strengthen \`validate\` so rejected state triggers setup again.

Check key construction next. If tests alter roles or tenant membership using backend setup, the session created before that mutation may remain technically valid but semantically wrong. Either provision users immutably per role or include the authorization fixture identity in the key and validate it.

Finally, distinguish cache defects from provider instability. If a new setup also fails, the restored session was not the root cause. Inspect the provider's visible error, the application callback response, and environment logs. Record statuses and origins, but redact tokens, authorization codes, cookies, and credentials from artifacts.

## Make the workflow safe under CI parallelism

Each CI worker has its own browser process and should be able to establish the required session independently. Do not assume a session created on worker one becomes available to worker two. Even when sessions are cached across specs in a run, correctness must not depend on scheduling order.

Provision test accounts for concurrency. If two workers log into the same account while tests also change profile, tenant, password, or permissions, they can invalidate each other's assumptions. Read-only shared personas may be acceptable when the identity system supports concurrent sessions, but stateful scenarios should receive isolated accounts or tenants.

| CI risk | Bad shortcut | Durable control |
|---|---|---|
| Provider throttling | Retry every failed login blindly | Reduce real UI logins and use dedicated test tenant |
| Shared account mutation | Depend on spec ordering | Immutable personas or per-worker data |
| Secret leakage | Print page or command values | Mask input and sanitize artifacts |
| Environment drift | Hard-code local IdP origin | Validate explicit environment configuration |
| Session expiry mid-run | Check cookie existence | Fast server-backed validation |
| Callback latency | Add a fixed sleep | Assert redirect, request, or authenticated UI state |

Measure login setup duration and failure categories separately from feature failures. A spike in provider form failures should not be mislabeled as dozens of billing regressions. Test reports should identify whether failure occurred in origin transition, provider authentication, callback handling, session validation, destination navigation, or feature assertion.

Retries can reveal transient infrastructure behavior, but they should not erase it. If your CI runner retries tests, preserve the first-attempt video, screenshot, or network evidence where policy allows. A login that passes only on retry is operational information, especially when it precedes a release.

## Review AI-generated Cypress authentication code carefully

AI coding agents are useful for drafting command types, extracting repeated workflows, and building test matrices. Authentication code is also where plausible-looking mistakes are expensive. Give the agent a boundary map, actual origins, supported selectors, application identity endpoint, and session-key dimensions. Ask it to cite the repository's existing commands rather than inventing a new token injection method.

Review generated changes against this checklist:

- Every command acting on a foreign origin is inside the correct \`cy.origin()\` callback.
- Callback inputs arrive through serializable \`args\`, not closure assumptions.
- Passwords are read from environment configuration and typed with command logging disabled.
- The session key distinguishes mechanism, identity, tenant, and role where relevant.
- Validation proves backend acceptance and, when necessary, authorization context.
- Destination visits occur after the session helper.
- Data setup is not hidden inside a callback skipped on restore.
- The code does not fabricate tokens or depend on undocumented provider endpoints.

Ready-made QA skills can be installed from qaskills.sh with the qaskills CLI when an agent needs a repeatable test workflow. Treat a skill as encoded process, not as permission to weaken identity controls or expose secrets.

The most valuable agent review question is not “does this compile?” It is “what evidence does a warm-cache test produce?” The answer should still include a validated identity, an explicit page visit, and the feature assertion. If warm restoration skips essential fixture setup, the abstraction is incorrect.

## Frequently Asked Questions

### Do I need cy.origin for two subdomains?

Yes, when the browser moves between them. Origin is defined by scheme, hostname, and port, so \`app.example.test\` and \`login.example.test\` are different even though both belong to the same parent domain. Put commands that interact with the login host inside a \`cy.origin()\` callback targeting that origin. Commands resume in the primary test context after the browser returns. First confirm the actual runtime URL because identity providers sometimes introduce an additional regional or federation host.

### Should every Cypress test cache the same authenticated session?

No. Reuse a cached session only when tests need the same authentication mechanism, user identity, tenant, and permission state. Different personas need distinct session identifiers, and stateful tests may need isolated accounts. Keep a small number of uncached or newly established SSO integration checks to prove the real redirect path. Feature tests can reuse validated sessions, but each should still visit its own destination and create its own domain data outside the session setup.

### What belongs in a cy.session validation callback?

Use a fast, non-mutating check that proves the restored identity can perform the basic capability the suite requires. An application-owned identity endpoint that returns 200 and the expected user, tenant, or role is stronger than checking whether a cookie exists. Avoid full page rendering unless no stable endpoint exists, and avoid creating test records. Validation should detect server expiry, key collisions, and semantically wrong authorization state, then allow Cypress to rerun setup when cached state is unusable.

### Why does SSO pass locally but fail in CI?

Compare the complete application and provider origins, CI secrets, test-account policy, system clock, callback configuration, and the provider's visible response. CI often exposes a staging versus production URL mix, a blocked automation account, concurrent-account interference, or a callback that finishes more slowly. Run the uncached SSO smoke to separate cache behavior from provider behavior. Capture redacted URLs and status codes around the redirect, but never publish authorization codes, cookies, tokens, or passwords in screenshots and logs.
`,
};
