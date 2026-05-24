import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Cypress cy.session Authentication Guide for 2026',
  description:
    'Complete cy.session authentication guide for 2026. Login caching, validation, programmatic auth, multi-user, SSO, OAuth, and best practices.',
  date: '2026-05-17',
  category: 'Guide',
  content: `
# Cypress cy.session Authentication Guide for 2026

\`cy.session\` was introduced in Cypress 8 and made stable in Cypress 10. It is the recommended way to cache login state across specs and tests. Before \`cy.session\`, every test that needed an authenticated user either logged in through the UI (slow), used a custom command to call the auth API and set cookies manually (faster but boilerplate-heavy), or shared state across tests in fragile ways. \`cy.session\` makes the cached-login pattern first-class.

This guide is the complete 2026 reference for \`cy.session\` authentication. We cover the API, login caching, session validation, programmatic auth via API, multi-user testing, SSO and OAuth flows, JWT handling, refresh token strategies, common patterns, and best practices distilled from running real Cypress suites.

For broader Cypress references, browse [the blog index](/blog). For Cypress skills you can install into Claude Code, see the [QA Skills directory](/skills).

## Mental model

A Cypress \`session\` is a cached snapshot of cookies, localStorage, and sessionStorage keyed by a unique identifier. When \`cy.session(id, setup)\` runs:

1. Cypress looks up the session by id.
2. If a cached session exists and \`validate\` passes (or no \`validate\` is provided), Cypress restores the cookies, localStorage, and sessionStorage from cache and skips the \`setup\` function.
3. If the cache miss or validation fails, Cypress runs the \`setup\` function, then saves the new state to the cache.

The session cache persists for the duration of \`cypress open\` or \`cypress run\`. Each id is a string; pick a stable identifier like the user's email or a session label.

## Basic pattern

\`\`\`typescript
const login = (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid=email]').type(email);
    cy.get('[data-testid=password]').type(password);
    cy.get('[data-testid=submit]').click();
    cy.url().should('include', '/dashboard');
  });
};

beforeEach(() => {
  login('admin@example.com', 'secret');
  cy.visit('/');
});
\`\`\`

The first test runs the full login flow. Every subsequent test restores cookies and storage from the cache and skips the login UI entirely. For a 100-spec suite, this saves several minutes per CI run.

## Session validation

The \`validate\` option runs after restoring the session. If it throws, the session is recomputed.

\`\`\`typescript
cy.session(
  email,
  () => {
    cy.visit('/login');
    cy.get('[data-testid=email]').type(email);
    cy.get('[data-testid=password]').type('secret');
    cy.get('[data-testid=submit]').click();
  },
  {
    validate() {
      cy.request('/api/me').its('status').should('eq', 200);
    },
  }
);
\`\`\`

Without \`validate\`, a logged-out session due to expiration silently breaks tests. With \`validate\`, Cypress detects the expiration and re-runs the setup.

## Programmatic login (faster)

Logging in through the UI is slow even with \`cy.session\` because the first run is still a UI flow. For internal apps, prefer hitting the auth API directly.

\`\`\`typescript
const login = (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { email, password },
    }).then((response) => {
      window.localStorage.setItem('token', response.body.token);
      cy.setCookie('session', response.body.sessionId);
    });
  });
};
\`\`\`

This bypasses the UI entirely. The first test takes a few hundred milliseconds; subsequent tests restore from cache.

## Multi-user testing

For tests that involve multiple users (collaboration features, admin overrides), use distinct session ids per user.

\`\`\`typescript
const loginAs = (user: 'admin' | 'editor' | 'viewer') => {
  cy.session(user, () => {
    cy.request('POST', '/api/auth/login', users[user]);
    // ...
  });
};

it('admin can edit, viewer cannot', () => {
  loginAs('admin');
  cy.visit('/page/1/edit');
  cy.contains('Save').should('exist');

  loginAs('viewer');
  cy.visit('/page/1/edit');
  cy.contains('Save').should('not.exist');
});
\`\`\`

Each \`loginAs\` call switches the active session by restoring the correct user's cookies and storage.

## JWT and refresh tokens

For apps using JWT access tokens with short expiry and refresh tokens, store both in the session.

\`\`\`typescript
cy.session(
  email,
  () => {
    cy.request('POST', '/api/auth/login', { email, password }).then((res) => {
      window.localStorage.setItem('access_token', res.body.access);
      window.localStorage.setItem('refresh_token', res.body.refresh);
    });
  },
  {
    validate() {
      cy.window().then((win) => {
        const token = win.localStorage.getItem('access_token');
        if (!token) throw new Error('No token');
        // Decode and check expiry; refresh if needed
      });
    },
  }
);
\`\`\`

## SSO / OAuth flows

SSO is tricky because the auth happens on a third-party origin. Two strategies:

### Strategy 1: Programmatic token exchange

If your identity provider exposes a Resource Owner Password Credentials grant or a similar non-interactive flow, use it. \`cy.request\` calls the provider directly, gets a token, and you store it.

\`\`\`typescript
cy.session(email, () => {
  cy.request({
    method: 'POST',
    url: 'https://idp.example.com/oauth/token',
    body: {
      grant_type: 'password',
      client_id: process.env.OAUTH_CLIENT_ID,
      username: email,
      password: 'secret',
    },
  }).then((res) => {
    window.localStorage.setItem('id_token', res.body.id_token);
    window.localStorage.setItem('access_token', res.body.access_token);
  });
});
\`\`\`

### Strategy 2: cy.origin for UI auth

If your IdP only supports interactive flow, use \`cy.origin\` to drive the IdP UI.

\`\`\`typescript
cy.session(email, () => {
  cy.visit('/');
  cy.contains('Log in').click();
  cy.origin('https://idp.example.com', () => {
    cy.get('input[name=email]').type(email);
    cy.get('input[name=password]').type('secret');
    cy.contains('Sign in').click();
  });
  cy.url().should('contain', '/dashboard');
});
\`\`\`

\`cy.origin\` lets Cypress drive a different origin in the same test.

## Cookie attributes and domains

By default, \`cy.session\` caches all cookies for the current origin. For subdomain cookies, use \`cy.setCookie\` with \`domain\` and \`path\` options inside the setup function.

\`\`\`typescript
cy.session(email, () => {
  cy.request('POST', '/api/auth/login', { email, password });
  cy.setCookie('SSO_SESSION', sessionId, {
    domain: '.example.com',
    path: '/',
    secure: true,
    sameSite: 'lax',
  });
});
\`\`\`

## Session caching across specs

Sessions are cached in memory during a single Cypress run. To persist across runs (\`cypress run\` invocations), enable \`experimentalRunAllSpecs\` and \`cacheAcrossSpecs\`.

\`\`\`typescript
cy.session(email, setup, {
  cacheAcrossSpecs: true,
});
\`\`\`

When \`cacheAcrossSpecs\` is true, the session is reusable across spec files in the same run.

## Common patterns

### One global login

Most apps need a single logged-in user for the bulk of tests.

\`\`\`typescript
// cypress/support/commands.ts
Cypress.Commands.add('login', (email = 'admin@example.com', password = 'secret') => {
  cy.session([email, password], () => {
    cy.request('POST', '/api/auth/login', { email, password }).then((res) => {
      window.localStorage.setItem('token', res.body.token);
    });
  }, {
    validate() {
      cy.request('/api/me').its('status').should('eq', 200);
    },
    cacheAcrossSpecs: true,
  });
});

// In tests
beforeEach(() => {
  cy.login();
  cy.visit('/');
});
\`\`\`

### Per-test user creation

For tests that need a fresh user, create one via the API and log in.

\`\`\`typescript
beforeEach(() => {
  const email = \`user-\${Date.now()}@example.com\`;
  cy.request('POST', '/api/test/users', { email, password: 'pw' }).then(() => {
    cy.session(email, () => {
      cy.request('POST', '/api/auth/login', { email, password: 'pw' });
    });
    cy.visit('/');
  });
});
\`\`\`

### Logout

\`\`\`typescript
Cypress.Commands.add('logout', () => {
  cy.session('logged-out', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
  });
});
\`\`\`

## Best practices

1. **Always provide \`validate\`.** Without it, expired sessions silently break tests.
2. **Prefer API login over UI login.** Faster, more reliable.
3. **Use stable session ids.** Strings derived from user identity.
4. **Set \`cacheAcrossSpecs\` for global users.** Saves time across the suite.
5. **Cache one session per user, not per test.** Reuse aggressively.
6. **Re-run \`setup\` only when \`validate\` fails.** Cheap path is the cache hit.
7. **Log out by switching to a logged-out session.** Cleaner than manual clearing.
8. **Use \`cy.origin\` for SSO UI flows.** Or programmatic tokens.
9. **Store JWT in the session.** Cookies, localStorage, sessionStorage are all captured.
10. **Combine with \`cy.intercept\`.** Mock APIs to avoid backend calls in addition to caching login.

## Gotchas

1. **Session validation is not optional in practice.** Add it from the start.
2. **\`cy.session\` clears all cookies before running setup.** This is intentional and avoids cross-test bleed.
3. **\`cacheAcrossSpecs\` requires Cypress 12+.** Earlier versions cache per-spec only.
4. **Sessions are keyed by id, not by inputs.** Same id with different setup overwrites.
5. **\`cy.session\` does not preserve IndexedDB.** Workaround with custom commands.
6. **\`cy.origin\` does not inherit the session.** Set tokens explicitly inside the origin block.
7. **HTTP-only cookies are stored.** Just not accessible from JavaScript.
8. **\`cy.session\` snapshots after setup, not during.** If setup makes async calls that resolve later, they may not be captured.
9. **For Cypress Cloud parallelization, sessions are per-worker.** Each worker re-runs setup once.
10. **Clearing the session cache requires reloading the browser.** Or restart Cypress.

## API quick reference

| Pattern | Snippet |
|---|---|
| Cache login | \`cy.session(id, setupFn)\` |
| Validate | \`cy.session(id, setupFn, { validate })\` |
| Cross-spec cache | \`cy.session(id, setupFn, { cacheAcrossSpecs: true })\` |
| Multiple users | \`cy.session(user.id, () => loginAs(user))\` |
| Switch user mid-test | Call \`cy.session(differentId, setup)\` again |
| Logout | \`cy.session('logged-out', () => cy.clearAllCookies())\` |
| API login | \`cy.request('POST', '/auth', creds)\` inside setup |
| UI login | UI commands inside setup |
| SSO via redirect | \`cy.origin('idp.example.com', () => ...)\` |

## Conclusion and next steps

\`cy.session\` is the modern Cypress authentication pattern. It eliminates the per-test login overhead, makes multi-user tests practical, and integrates cleanly with API auth, UI auth, and SSO flows. Combined with \`cy.intercept\` and the standard custom command pattern, it produces a fast, reliable, idiomatic auth setup.

Start with a single global \`cy.login\` custom command that uses \`cy.session\`. Add programmatic API login. Add validation. Layer in multi-user and SSO scenarios as needed.

Next read: explore the [QA Skills directory](/skills) for Cypress skills, and the [blog index](/blog) for custom commands, fixtures, and CI guides.
`,
};
