import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cache Cypress Sessions Across Spec Files',
  description:
    'Cache Cypress sessions across spec files with cy.session, reliable validation, collision-safe IDs, and realistic behavior in parallel CI runs.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Cache Cypress Sessions Across Spec Files

The second Cypress spec should not need to submit the login form again. If both specs use the same account and execute on the same Cypress machine, \`cy.session()\` can restore the cookies and web storage captured by the first spec. The critical option is \`cacheAcrossSpecs: true\`, but that single property is only the beginning of a safe implementation.

Cross-spec reuse is an in-memory optimization for one \`cypress run\`. It is not a disk cache, a CI artifact, or an authentication shortcut shared by parallel machines. The setup must still be correct, the identifier must describe the actual identity, and validation must detect revoked or expired sessions. Treat the cache as a disposable browser-state snapshot, not as the authority on whether the user is authenticated.

## The lifetime of a global Cypress session

Without \`cacheAcrossSpecs\`, a saved session is available for the duration of its spec. With the option enabled, Cypress considers it global and can restore it from another spec during the same run on the same machine. A new run starts empty. When CI distributes specs across three machines, each machine creates its own first session.

That boundary explains several observations that otherwise look like defects. Running one spec from the interactive runner may execute login setup. Running the whole suite may show setup only once. Enabling ten-way parallelization may produce ten login calls even though every spec uses the same session ID. Nothing is being synchronized across processes or hosts.

| Boundary | Is the saved session reusable? | Practical consequence |
|---|---|---|
| Another test in the same spec | Yes | Default session caching already helps |
| Another spec in the same run and machine | Yes, with \`cacheAcrossSpecs: true\` | Shared login helper avoids repeated authentication |
| A separate Cypress machine | No | Each parallel worker authenticates independently |
| A later \`cypress run\` | No | CI jobs do not inherit yesterday's credentials |
| Spec reruns in open mode | Cypress may retain sessions for reruns | Clear saved sessions when debugging setup changes |
| Different session ID | No | Cypress creates and stores another snapshot |

The cache contains cookies, \`localStorage\`, and \`sessionStorage\` across origins associated with the session. It does not preserve arbitrary JavaScript variables, an application server session that has expired, IndexedDB as a promised session mechanism, or the current page. With test isolation enabled, Cypress clears the page around session setup and restore, so the test should navigate after calling the login helper.

## Put one definition behind a custom command

Every spec that uses a cross-spec session should call \`cy.session()\` consistently. Copying the implementation into spec files invites slight differences in setup, validation, or options. Centralize it in a custom command and expose only the parameters that define authentication.

The following command logs in through an API, lets Cypress receive and retain the response cookie, validates the resulting identity, and makes the session global for the current machine. It assumes \`POST /api/login\` sets a cookie and \`GET /api/me\` returns the authenticated user.

\`\`\`ts
// cypress/support/commands.ts
type Role = 'buyer' | 'support' | 'admin';

declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(email: string, password: string, role: Role): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAs', (email, password, role) => {
  cy.session(
    ['password-login', email, role],
    () => {
      cy.request('POST', '/api/login', { email, password });
      cy.getCookie('session_id').should('exist');
    },
    {
      cacheAcrossSpecs: true,
      validate() {
        cy.request('/api/me').then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body.email).to.eq(email);
          expect(response.body.role).to.eq(role);
        });
      },
    },
  );
});

export {};
\`\`\`

The array ID is deterministically serialized by Cypress. Including the authentication strategy, email, and role prevents a support session from colliding with an admin session for a mutable test account. Do not place the password or token in the ID: IDs appear in the reporter and diagnostic UI. If changing a password must force a distinct session, use a safe credential version supplied by the fixture rather than the secret itself.

The setup waits for a cookie assertion before Cypress snapshots storage. That matters when authentication completes asynchronously. A setup callback that ends immediately after clicking Submit can save state before the token arrives. Always finish setup with an assertion that proves usable authentication, not merely a successful click.

## Call the helper, then visit the page under test

With test isolation enabled, Cypress clears the page when establishing or restoring a session. The reusable command should authenticate, while each test owns navigation to its subject. This division stops the first test, whose setup runs, from behaving differently from later tests, whose state is restored.

\`\`\`ts
// cypress/e2e/orders/history.cy.ts
describe('order history', () => {
  beforeEach(() => {
    cy.loginAs(
      'buyer@example.test',
      Cypress.env('BUYER_PASSWORD'),
      'buyer',
    );
    cy.visit('/account/orders');
  });

  it('opens the invoice for a completed order', () => {
    cy.contains('[data-cy=order-row]', 'ORD-1042')
      .find('[data-cy=invoice-link]')
      .click();

    cy.location('pathname').should('eq', '/account/orders/ORD-1042/invoice');
    cy.get('[data-cy=invoice-total]').should('have.text', '$84.50');
  });
});
\`\`\`

A second file can use the identical command and identity:

\`\`\`ts
// cypress/e2e/profile/shipping-address.cy.ts
describe('shipping address', () => {
  beforeEach(() => {
    cy.loginAs(
      'buyer@example.test',
      Cypress.env('BUYER_PASSWORD'),
      'buyer',
    );
    cy.visit('/account/shipping');
  });

  it('shows the saved delivery city', () => {
    cy.get('[data-cy=shipping-city]').should('have.value', 'Pune');
  });
});
\`\`\`

If both files land on one Cypress machine in one run, only the first call normally executes setup. Both calls execute validation. That trade is sensible when a cheap \`/api/me\` request replaces a slower UI login and still catches server-side invalidation.

## Validation is the cache correctness mechanism

A restored cookie can exist while the backend session is unusable. It may have expired, been revoked by another test, refer to a deleted fixture, or point at the wrong role. \`validate\` is how the cache learns that its snapshot is stale.

If validation fails after restoration, Cypress reruns setup and then validates the newly created session. If validation fails immediately after setup, the test fails. This distinction is useful: recovery is appropriate for old cached state, while a freshly created invalid session indicates a broken login path or fixture.

| Validation choice | Detects | Misses or costs |
|---|---|---|
| Cookie exists | Missing browser credential | Expiry, revocation, wrong user, backend rejection |
| Authenticated API returns 200 | Invalid server session | Incorrect privileges if endpoint is too broad |
| \`/api/me\` identity fields match | Cross-user and role collision | Feature-specific authorization rules |
| Visit a protected page | Redirect and end-to-end auth behavior | Slower, may couple validation to page availability |
| Perform a privileged API operation | Exact permission failure | Can mutate data and is unsafe as routine validation |

Prefer a read-only identity endpoint that returns stable claims. Assertions inside validation should identify why restoration is rejected. Avoid a visit that loads dozens of resources unless navigation itself is the property being validated. The goal is a quick proof that the cached browser state still represents the expected principal.

Validation runs on the newly created state too, so account for its traffic when calculating authentication load. A suite with hundreds of specs on one machine may call the identity endpoint hundreds of times even though login happens once. If that cost matters, reconsider whether every spec needs the helper or whether specs can be grouped by authenticated feature. Do not remove validation purely to make a dashboard faster.

## Session IDs must encode authentication inputs

The most dangerous cache bug is not a miss. It is a hit on the wrong identity. Cypress sees the ID as the cache key. It does not inspect the setup function and infer that a different role, tenant, feature flag, or authentication route should produce new state.

Construct the ID from every non-secret parameter that can change the stored session. Examples include login strategy, user ID, tenant ID, role, locale when server claims contain it, and a fixture version. Keep it compact because serialization and reporter readability matter.

Suppose the same email can switch organizations. \`['login', email]\` is insufficient if organization membership is recorded in the token. Use \`['login', email, organizationId]\`. If an administrator test later changes the buyer's permissions, either use isolated users or increment a fixture generation value so subsequent calls cannot restore claims created before the mutation.

Never add a random UUID on each call. That guarantees uniqueness by disabling reuse, defeating the optimization. Randomness belongs in account creation when isolation requires it, not in a key intended to match across specs.

## Parallel CI changes the economics

Imagine 60 specs split over six CI machines. Each machine receives ten specs and maintains its own global session cache. The login setup runs roughly once per identity per machine, assuming no invalidation. Reducing six machines to three may cut logins but lengthen suite duration. Session cache hit rate is therefore a sharding concern as well as a Cypress concern.

Keep specs requiring the same rare identity on the same machine if your CI orchestrator supports deterministic grouping and the grouping does not create an imbalanced shard. More commonly, accept one API login per machine. It is predictable, independent, and safer than exporting browser state between jobs.

Do not try to upload Cypress's internal session cache as a generic CI artifact. The documented scope is the same run and machine. A hand-built alternative would need to protect credentials, reproduce cookie domains, respect expiry, and coordinate invalidation. At that point, a fast API login is simpler and more trustworthy.

Authentication providers may also rate-limit bursts from parallel workers. Create a pool of isolated test users or stagger environment readiness rather than sharing one mutable account across all shards. If the provider uses one-time refresh token rotation, simultaneous restored sessions can invalidate one another even though Cypress caching works exactly as designed.

## Multi-origin login and storage ownership

For a login flow that moves to another origin, use Cypress's cross-origin support where required, and wrap the completed flow in \`cy.session()\`. The session setup must finish after the application origin has received whatever cookie or storage item makes it authenticated. Provider UI flows are slower and more change-prone than application-owned API setup, but sometimes they are the behavior under test.

Separate concerns. Most feature specs should establish authenticated application state efficiently. A small set should exercise the real identity-provider redirect, consent, callback, and error handling. Caching every identity-provider UI test can remove the very transitions those tests are supposed to verify.

The detailed [Cypress cy.session authentication guide](/blog/cypress-cy-session-authentication-guide) is a useful next step for login patterns. Session caching should complement, not replace, explicit authentication coverage.

Storage ownership also matters. If a token lives under the application origin's \`localStorage\`, set it while Cypress is operating in the appropriate origin. If authentication relies on an HttpOnly cookie, let the server set it through \`cy.request()\` or use Cypress cookie commands only when you fully understand the attributes. JavaScript cannot create a genuinely HttpOnly cookie through application code.

## Debugging misses, recreation, and polluted identities

Cypress's session instrument panel shows whether a call created, restored, or recreated a session. Start there. A setup that runs in every spec usually indicates different IDs, different machines, a changed session definition, or failed validation. Log the safe ID inputs and inspect CI shard assignment before blaming the cache.

For deeper inspection, Cypress exposes session helpers such as \`Cypress.session.getSession(id)\` and \`Cypress.session.getCurrentSessionData()\`. Use them during diagnosis, not as a dependency for normal test behavior. They can reveal missing cookies or storage saved under an unexpected origin.

\`Cypress.session.clearAllSavedSessions()\` clears saved sessions, including global ones. It is helpful while developing a login command or when a test intentionally changes global credential state. Routine tests should prefer unique, accurate IDs and validation rather than clearing the entire cache, because a global clear removes reuse for unrelated identities.

Fixtures should remain separate from authentication state. The [Cypress fixtures data management guide](/blog/cypress-fixtures-data-management-guide) covers stable test data boundaries. Loading a JSON user fixture does not prove that the backend account or cached session still matches it.

## Measuring whether caching helped

Add a server-side correlation header or test-only audit event to count login setup requests by run and machine. Compare login count, authentication duration, total spec duration, validation failures, and session recreations before and after the change. A lower login count is not automatically a faster suite if validation is expensive or shared users cause contention.

Watch correctness indicators too: unexpected 401s after restore, wrong-tenant assertions, refresh-token conflicts, and tests that pass alone but fail in the full run. Those signals point to poor IDs, shared mutable accounts, or incomplete validation. Cross-spec caching should make execution faster without making order significant.

The strongest acceptance test is to randomize spec order and vary sharding. Every spec must still establish its own preconditions by calling the shared command. The optimization may choose setup or restore internally, but the spec should not care which happened.

## Refresh tokens and logout tests require separate identities

Long-lived suites sometimes exercise token refresh. A session snapshot created before refresh may contain a short-lived access token and a refresh cookie. Validation can trigger server behavior that rotates those credentials. If rotation is single-use, two specs or machines sharing the same backend account may invalidate each other even though their browser caches are independent. Use accounts designed for concurrent test sessions, or allocate one identity per worker.

Do not reuse the ordinary cached buyer identity for logout coverage. A logout test intentionally invalidates the server session. Later validation will recreate it, which can make the logout behavior appear harmless while creating confusing audit traffic. Give destructive authentication scenarios their own session ID and preferably their own account. Assert server invalidation directly, then let other feature specs continue with untouched identities.

Password reset, role change, and global sign-out have the same shape. They mutate the authority behind cached browser state. Mark these cases in test design reviews and isolate them from the cross-spec optimization. Clearing all Cypress sessions only removes browser snapshots on that machine; it does not repair a token revoked on the server or protect another CI machine using the same user.

For refresh-specific tests, control the clock or token lifetime through a supported test configuration. Waiting for a real token to expire lengthens the suite and introduces timing noise. Confirm that the refreshed credential is captured only when a new session setup completes. A stored session cannot be incrementally edited after Cypress saves it, so changing the authentication state should lead to a deliberately new session identity or recreation path.

## Keep secrets out of the session diagnostics

Session details can include cookies and browser storage values. Cypress exposes that data for debugging, which means screenshots, videos, console captures, and CI logs deserve the same access controls as other authentication artifacts. Never print a password, bearer token, or complete saved-session object into an ordinary build log.

Use masked CI variables for credentials and pass only non-secret identity fields into the session ID. If a diagnostic requires inspecting cookie presence, log the cookie name, domain, security attributes, and expiration rather than its value. Restrict artifact retention and access when traces can reveal authenticated application data.

Test accounts should have the least privileges needed for their specs and should be invalid outside the test environment. Rotate their credentials through the environment's secret management process, then update any safe credential-version component in the cache ID. Because a new Cypress run starts empty, no cache migration is required after rotation.

## Frequently Asked Questions

### Does cacheAcrossSpecs share a session between CI containers?

Cross-container sharing is not supported. The global cache exists for one Cypress run on one machine. Parallel containers each create their own cache and will execute setup at least once for every session identity they use.

### Why does Cypress open a blank page after cy.session?

With test isolation enabled, Cypress clears the page around session creation and restoration. Call \`cy.visit()\` after the login helper so every test explicitly opens its subject whether setup ran or cached data was restored.

### Can I cache two users with the same login command?

Yes, if their IDs differ. Include a safe user identifier and any role or tenant inputs that affect claims. Calling the command with those distinct IDs creates separate snapshots, and later calls restore the matching one.

### What happens when the cached session expires during a long run?

The next validation should fail, causing Cypress to execute setup again and replace the stale state. If a new session also fails validation, the test fails, which correctly exposes a login or environment problem.

### Should the login helper include cy.visit for convenience?

Keep navigation outside the general login helper. Doing so makes first creation and later restoration behave consistently and avoids coupling authentication to one landing page. A specialized helper may navigate when that page is part of the authentication contract, but document the behavior clearly.
`,
};
