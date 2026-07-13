import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cross-Domain Authentication with Cypress origin()',
  description:
    'Automate cross-domain authentication with Cypress origin(), pass credentials safely, validate redirects, and keep identity-provider tests reliable.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Cross-Domain Authentication with Cypress origin()

The browser has just followed a \`302\` from \`https://app.example.test/login\` to \`https://id.example.test/authorize\`. At that moment, ordinary Cypress commands still belong to the application's origin, while the username field belongs to the identity provider. Put those commands in the wrong execution context and a correct login flow fails before it can enter a credential.

\`cy.origin()\` creates the secondary Cypress execution context needed to interact with that identity-provider page. It does not weaken the browser's same-origin policy, turn an iframe into a normal document, or make every external login suitable for UI automation. Used precisely, it lets one end-to-end test follow the real redirect, operate the IdP form, and return to the relying application with its cookies and storage intact.

## Draw the authentication journey as origins

Start with URLs, not page-object methods. An origin is scheme, hostname, and port. Paths do not create new origins, but a changed subdomain, protocol, or port does. Cypress 14 no longer injects \`document.domain\` by default, so even related subdomains generally require \`cy.origin()\` when a test switches between them.

For an OpenID Connect authorization-code flow, the browser route often looks like this:

1. The application origin starts a login request.
2. The identity-provider origin receives the authorization request and shows a form.
3. The IdP redirects to a callback on the application origin with a short-lived code and state.
4. The application exchanges the code server-side, creates its session, and redirects to a protected page.

Only step 2 belongs inside the IdP origin callback. Assertions after the callback should again target the application's origin.

| Browser location | Cypress context | Assertion worth making |
|---|---|---|
| \`app.example.test/login\` | Primary | Login control initiates navigation |
| \`id.example.test/authorize\` | Secondary via \`cy.origin()\` | Expected tenant, client, and sign-in form appear |
| \`app.example.test/auth/callback\` | Primary after redirect | Callback completes without exposing an error |
| \`app.example.test/account\` | Primary | Authenticated identity and protected content render |

Do not wrap the whole test in \`cy.origin()\`. The callback is an execution boundary for commands that run on one secondary origin. When navigation returns, continue the chain in the primary context.

## Build a minimal real redirect test

Assume the application base URL is \`https://app.example.test\`, the test tenant uses \`https://id.example.test\`, and a dedicated non-production account exists. The test below clicks the application's login control, operates the IdP form, then proves the application established its own session.

\`\`\`typescript
describe('OIDC sign-in', () => {
  it('returns an authenticated user to the account page', () => {
    const idpOrigin = 'https://id.example.test';
    const username = Cypress.env('E2E_USERNAME');
    const password = Cypress.env('E2E_PASSWORD');

    cy.visit('/login');
    cy.get('[data-cy="login-with-company-id"]').click();

    cy.origin(
      idpOrigin,
      { args: { username, password } },
      ({ username, password }) => {
        cy.location('pathname').should('eq', '/authorize');
        cy.get('input[name="username"]').type(username, { log: false });
        cy.get('input[name="password"]').type(password, { log: false });
        cy.get('button[type="submit"]').click();
      },
    );

    cy.location('origin').should('eq', 'https://app.example.test');
    cy.location('pathname').should('eq', '/account');
    cy.get('[data-cy="signed-in-user"]').should('contain.text', username);
    cy.getCookie('app_session').should('exist');
  });
});
\`\`\`

The selectors are application and IdP markup, so replace them with stable hooks from the test tenant. The APIs are real Cypress commands. Values cross into the callback only through \`options.args\`, and they must be serializable. The callback is stringified and evaluated in another Cypress instance, which means it does not close over variables, imported page objects, or helpers from the surrounding test.

Suppressing the command log for password typing reduces accidental disclosure in screenshots and runner output, but it is not secret management. Supply credentials through protected CI secrets, keep videos and screenshots access-controlled, and use accounts that cannot access production data.

## Respect the callback serialization boundary

The most surprising \`cy.origin()\` failures look like JavaScript scope bugs. They are actually architecture. This will fail because \`loginPage\` and \`password\` are not available inside the serialized callback:

\`\`\`typescript
const password = Cypress.env('E2E_PASSWORD');
const loginPage = new IdentityLoginPage();

cy.origin('https://id.example.test', () => {
  loginPage.signIn(password);
});
\`\`\`

Pass plain data in \`args\` and keep secondary-origin operations inside the function. If shared commands must exist in the secondary instance, Cypress can support dependencies inside the callback through \`Cypress.require()\` when \`experimentalOriginDependencies\` is enabled, but that expands configuration and coupling. A compact callback with explicit selectors is usually easier to debug for one login screen.

| Value crossing boundary | Works? | Better treatment |
|---|---|---|
| String username | Yes | Pass in \`args\` |
| Plain object of tenant fields | Yes, if serializable | Pass only fields the callback consumes |
| DOM element or jQuery object | No | Query it again in the secondary origin |
| Page-object instance | No | Keep commands local or load an allowed dependency |
| Function from outer scope | No | Define behavior inside the callback |
| Cypress chain yielding a DOM node | Not across origins | Assert inside the origin that owns the node |

Returned values have the same constraint. \`cy.origin()\` yields the last Cypress command or callback return value, but consuming a nonserializable result produces an error. Prefer assertions where the data lives. Return a primitive only when the primary context genuinely needs it.

## Match the origin exactly

An IdP URL copied from a browser trace may contain \`/authorize?client_id=...\`. The \`cy.origin()\` argument identifies an origin, not an authorization request. Use \`https://id.example.test\`, then make path and query assertions inside the callback. Cypress requires the hostname to match precisely, including its subdomain. The scheme defaults to HTTPS if omitted, but specifying it removes ambiguity. Ports matter too.

This distinction catches environment errors cleanly. If staging unexpectedly redirects to \`https://login.vendor.com\` instead of the isolated test tenant at \`https://login-staging.vendor.com\`, the expected origin callback will not quietly operate on the wrong host. Assert the location and fail before entering credentials.

For tenant-specific providers, compute the expected origin outside and pass other data separately:

\`\`\`typescript
const tenant = 'quality-lab';
const idpOrigin = \`https://\${tenant}.id.example.test\`;

cy.visit('/login');
cy.contains('button', 'Continue').click();

cy.origin(idpOrigin, { args: { tenant } }, ({ tenant }) => {
  cy.location('hostname').should('eq', \`\${tenant}.id.example.test\`);
  cy.get('[data-cy="tenant-name"]').should('have.text', tenant);
});
\`\`\`

Inside this article's TypeScript template literal, the interpolation markers are escaped so the blog source retains them. In the rendered code sample, they are normal JavaScript template expressions.

## Test redirect integrity, not only the happy form

A sign-in test that merely finds the dashboard can miss meaningful authentication regressions. Assert properties owned by each side of the boundary without asserting unstable protocol noise.

Before leaving the application, capture the intended return path through the UI action. At the IdP, assert that the correct test tenant and branded client are shown. Avoid hard-coding a complete authorization URL because state, nonce, PKCE challenge, and ordering of query parameters legitimately vary. After return, verify the protected route, a user-visible identity, and the application's session indicator. Then directly visit another protected page to prove navigation is not riding on leftover DOM state.

Negative flows deserve their own tests:

| Scenario | IdP-side observation | Application-side expectation |
|---|---|---|
| Invalid password | Form shows a generic denial | No application session cookie |
| User cancels consent | Provider redirects with an error | Callback shows controlled recovery UI |
| Disabled test account | Account-specific access denied | Application remains anonymous |
| Expired authorization transaction | Provider or callback rejects stale state | Login can be restarted safely |
| Wrong tenant route | Expected IdP origin is never reached | Test fails before sending credentials |

Do not attempt to tamper with signed tokens in a browser UI test and call that a full protocol security assessment. Those checks belong at API and component layers where inputs can be controlled precisely. The UI test's value is proving that browser navigation, provider interaction, callback handling, and application session creation work together.

## Combine origin() with session caching carefully

Running the provider form before every test is slow and can trigger rate limits, bot defenses, or test-account contention. \`cy.session()\` can cache cookies, local storage, and session storage produced by a login setup function. Put the cross-origin login inside the setup callback, give the session an identity that changes with the user and tenant, and validate the restored application session.

\`\`\`typescript
function loginThroughIdp(username: string, password: string) {
  const idpOrigin = 'https://id.example.test';

  cy.session(
    ['oidc', idpOrigin, username],
    () => {
      cy.visit('/login');
      cy.get('[data-cy="login-with-company-id"]').click();
      cy.origin(
        idpOrigin,
        { args: { username, password } },
        ({ username, password }) => {
          cy.get('input[name="username"]').type(username, { log: false });
          cy.get('input[name="password"]').type(password, { log: false });
          cy.get('button[type="submit"]').click();
        },
      );
      cy.location('pathname').should('eq', '/account');
    },
    {
      validate() {
        cy.request('/api/me').its('status').should('eq', 200);
      },
    },
  );
}

beforeEach(() => {
  loginThroughIdp(
    Cypress.env('E2E_USERNAME'),
    Cypress.env('E2E_PASSWORD'),
  );
  cy.visit('/account');
});
\`\`\`

Validation matters because an IdP or application session can expire while cached browser data still exists. A lightweight authenticated endpoint is stronger than checking that a cookie exists. If the request fails, Cypress reruns setup and creates a fresh session. The [Cypress session authentication guide](/blog/cypress-cy-session-authentication-guide) covers cache identifiers, validation, and isolation in greater depth.

Cache only when the individual test does not concern login behavior. Keep at least one uncached authentication journey so changes to the provider form and redirect integration remain observable. Otherwise a suite can stay green for days by restoring sessions while the real login page is broken.

## Decide when UI login is the wrong layer

Third-party identity pages are outside your release control. Their DOM may change, CAPTCHA may appear, and cross-site policies can differ by browser. If the goal is to test application behavior after authentication, a programmatic login, test-only token exchange, or seeded application session is faster and more deterministic. Reserve real UI login for a small authentication contract suite.

| Approach | What it proves | Main limitation |
|---|---|---|
| \`cy.origin()\` through hosted login | Redirect and real browser integration | Coupled to IdP UI and availability |
| Programmatic authorization request | Protocol and callback without form interaction | Setup is provider-specific |
| Application session seeding | Authenticated application behavior | Does not exercise identity federation |
| Stubbed OIDC provider | Application handling of controlled claims/errors | Cannot prove production provider compatibility |
| Manual login smoke check | Human-visible production path | Slow, inconsistent, and hard to gate releases |

A balanced suite often has a few real redirect tests against a dedicated IdP tenant, many tests that restore a validated session, and component/API tests for detailed role and claim combinations. For deeper coverage of roles, token boundaries, and access decisions, use the [authentication and authorization testing guide](/blog/authentication-authorization-testing-guide).

## Diagnose failures by locating the active origin

When a test times out, inspect the last successful navigation and the browser URL. If the runner is on the IdP but Cypress reports that commands target the primary origin, move those commands into \`cy.origin()\`. If the hostname differs by a regional or tenant subdomain, correct the expected origin rather than adding a broad wildcard. \`cy.origin()\` accepts one precise origin, not a family of trusted sites.

If Cypress cannot inject into the third-party page, frame-busting scripts may be involved. Cypress documents \`experimentalModifyObstructiveThirdPartyCode\` for modifying obstructive third-party responses when using origin testing. It is experimental and should be evaluated against the actual provider, not enabled as a habitual fix. Content Security Policy, unsupported navigation patterns, and provider anti-automation controls may still make UI automation unsuitable.

Separate application failures from provider failures in diagnostics. Record the final URL with sensitive query values redacted, take screenshots only under controlled retention, and log which phase failed: outbound redirect, provider form, callback, or authenticated landing. Never print passwords, authorization codes, ID tokens, or full callback URLs to make a flaky test easier to inspect.

## Keep identity test data independent

Shared accounts create failures that masquerade as origin problems. Parallel jobs can invalidate sessions, trigger login alerts, rotate passwords, or alter MFA enrollment. Give workers distinct accounts or allocate accounts through a test-data service. Reset server-side identity state before the suite, not through brittle clicks in the provider administration console.

MFA needs an explicit test strategy. A TOTP-enabled test account can generate codes from a protected seed in a controlled environment, but this increases secret sensitivity. Push notifications and SMS introduce external timing and device dependencies. Many teams cover MFA policy below the UI and keep one quarantined end-to-end journey in an environment designed for it. Do not disable MFA in production merely to make automation convenient.

Finally, configure logout tests separately. Logging out of the application may leave the IdP single-sign-on session active, so the next authorization redirects back without showing a form. That can be correct behavior. Assert the product's documented logout boundary: local application session termination, federated provider logout, or both.

## Cover provider errors at the callback boundary

The identity provider can return \`error\` and \`error_description\` instead of an authorization code. Exercise at least the failures your application claims to handle, such as access denial and an expired transaction. The browser should land on the application's callback origin before the application renders its recovery experience, so the provider interaction and application assertion belong to different Cypress contexts.

Avoid asserting the full provider error description because vendors revise wording. Assert the protocol error category through controlled test configuration where possible, then verify the application shows a safe message, preserves no authenticated session, and offers a fresh login. The callback page must not echo a raw authorization code, state value, or verbose provider diagnostic into the DOM.

Also test direct navigation to the callback without a valid state transaction. That case does not need \`cy.origin()\` because it begins and ends on the application origin. It should fail closed, clear any partial login state, and avoid redirect loops. Keeping it separate makes a failure point obvious: federation navigation in one spec, callback validation in another.

Provider outage behavior deserves one controlled test using a stub or test tenant. The application may show a retry action, route to support, or preserve the intended destination. Do not simulate an outage by depending on an unreliable external host. Route an application-owned discovery or initiation dependency only when that reflects the real failure boundary.

## Frequently Asked Questions

### Why can I not use variables declared above cy.origin() inside its callback?

The callback runs in a separate Cypress instance and is stringified before execution, so it does not retain the surrounding closure. Put serializable values in the \`args\` option and destructure them in the callback. Query DOM elements again in the origin that owns them.

### Does origin() work for an identity form embedded in an iframe?

Not by itself. \`cy.origin()\` handles navigation to another origin in the test's top-level browsing context. A cross-origin iframe has a different interaction model and remains constrained by browser security. Prefer a full-page provider redirect or use a provider-supported test strategy.

### Should the identity-provider origin include the authorize path?

Use the precise scheme, host, and port. A path is unnecessary for identifying the origin, and query parameters are not supported as the origin argument. Assert \`/authorize\` and relevant query semantics inside the callback.

### Why does the login test pass locally but fail only in parallel CI?

Check account sharing, provider rate limits, environment hostnames, secret availability, and cached-session identifiers. Two workers using one account can revoke or replace each other's sessions. Give each worker isolated identity data before increasing timeouts.

### Can session caching eliminate every visit to the hosted login page?

It can eliminate repeated setup for tests whose subject is post-login behavior, provided the cached session has a real validation step. Keep a small uncached flow in the suite. Otherwise the provider UI and redirect wiring can regress while all tests restore yesterday's valid browser state.
`,
};
