import type { BlogPost } from "./index";

export const post: BlogPost = {
  title: "Reuse Playwright Authentication State for Multiple User Roles",
  description:
    "Reuse Playwright authentication state for admin and standard-user roles with isolated accounts, setup projects, safe fixtures, and reliable authorization checks.",
  date: "2026-07-13",
  category: "Tutorial",
  content: `
# Reuse Playwright Authentication State for Multiple User Roles

An admin cookie in a standard-user test can turn a serious authorization defect into a green check mark. That is the central risk when a Playwright suite grows beyond one saved login. Reusing authentication is valuable because it removes repeated UI logins, but role state must be generated, named, selected, and invalidated deliberately.

This tutorial builds two states, one administrator and one ordinary member, then consumes them through Playwright projects and a role-aware fixture. The examples use Playwright Test's public APIs: setup project dependencies, \`page.context().storageState()\`, \`test.use()\`, and \`browser.newContext()\`.

## What a stored role actually contains

A storage-state file is a browser-context snapshot containing cookies and origin-scoped local storage. New contexts created with that file begin with those values. It does not preserve an open tab, JavaScript heap, session storage, IndexedDB in older Playwright versions, or a server-side session that has already expired.

| Authentication material | In storage state | Testing consequence |
|---|---:|---|
| HTTP cookies | Yes | Session cookies can authenticate a fresh context |
| localStorage | Yes | SPA access tokens stored by origin can be restored |
| sessionStorage | No | Capture and restore separately only if the application genuinely depends on it |
| In-memory access token | No | Reloading a state cannot recreate application memory |
| Server session | No | The cookie may exist while the backing session is revoked |
| Permissions and geolocation | No | Configure these as context options, not login artifacts |

The file is credentials. Keep \`playwright/.auth\` out of version control, restrict CI artifact exposure, and never attach state files to public reports. The [Playwright authentication storage-state guide](/blog/playwright-authentication-testing-storage-state-2026) covers the single-role foundation; here the concern is preventing state from crossing role boundaries.

## Create one account per role, not one mutable account

Do not log in as one person and change that person's role between setup steps. Authorization caches, access-token claims, and database replicas can retain the previous privileges. Use stable automation accounts such as \`e2e-admin\` and \`e2e-member\`, or provision unique users for the run.

| Account strategy | Isolation | Operational cost | Best fit |
|---|---|---|---|
| Fixed account per role | Moderate | Low | Read-heavy tests with reliable cleanup |
| Unique users per CI run | High | Medium | Parallel suites that mutate user-owned data |
| Unique user per worker | Very high | Higher | Broad write coverage and many workers |
| Change one user's role repeatedly | Poor | Superficially low | Avoid, because caches and parallelism make it unsafe |

Give each identity only the permissions the role should have. An admin state made from a superuser account cannot test a narrower support-admin policy. If the product has five meaningful permission bundles, model five identities even if marketing calls all of them “admins.”

## Generate named states with setup projects

The following setup file performs the real login flow twice. Role-specific environment variables keep credentials outside source control. Assertions prove that the landing page corresponds to the intended identity before the state is saved.

\`\`\`ts
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const authDir = path.join(process.cwd(), 'playwright', '.auth');

const roles = [
  {
    name: 'admin',
    email: process.env.E2E_ADMIN_EMAIL!,
    password: process.env.E2E_ADMIN_PASSWORD!,
    file: path.join(authDir, 'admin.json'),
    marker: 'Administration',
  },
  {
    name: 'member',
    email: process.env.E2E_MEMBER_EMAIL!,
    password: process.env.E2E_MEMBER_PASSWORD!,
    file: path.join(authDir, 'member.json'),
    marker: 'My workspace',
  },
] as const;

for (const role of roles) {
  setup(\`authenticate as \${role.name}\`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(role.email);
    await page.getByLabel('Password').fill(role.password);
    await Promise.all([
      page.waitForURL('**/app'),
      page.getByRole('button', { name: 'Sign in' }).click(),
    ]);
    await expect(page.getByRole('heading', { name: role.marker })).toBeVisible();
    await page.context().storageState({ path: role.file });
  });
}
\`\`\`

Playwright creates the parent directory for a state path in current releases, but creating \`playwright/.auth\` in repository setup makes intent explicit. Fail setup if any credential is missing rather than sending the string \`undefined\` to the form.

Configure setup as a dependency so tests never race state generation:

\`\`\`ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3000' },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'admin',
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['auth-setup'],
    },
    {
      name: 'member',
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/member.json',
      },
      dependencies: ['auth-setup'],
    },
  ],
});
\`\`\`

This arrangement runs every non-setup test once as each role. That is excellent for shared behavior, but wasteful if most specifications concern only one role. Select a project on the command line, or separate role directories with \`testMatch\` patterns.

## Assert identity before asserting capability

Every authorization test should establish who is logged in. A small \`/api/me\` assertion or visible account-menu assertion catches stale and swapped files immediately. Without that guard, “admin can delete team” may pass because a member state was accidentally promoted, and “member cannot delete team” may pass because the session is anonymous.

\`\`\`ts
// tests/member/permissions.spec.ts
import { test, expect } from '@playwright/test';

test('member cannot open user administration', async ({ page }) => {
  const identity = await page.request.get('/api/me');
  expect(identity.ok()).toBeTruthy();
  expect(await identity.json()).toMatchObject({ role: 'member' });

  await page.goto('/app');
  await expect(page.getByTestId('current-role')).toHaveText('Member');
  await expect(page.getByRole('link', { name: 'User administration' })).toHaveCount(0);

  const direct = await page.request.get('/api/admin/users');
  expect(direct.status()).toBe(403);
});
\`\`\`

Checking both UI and API matters. Hiding a menu item is not authorization. Conversely, a correct 403 with a visible admin affordance is still a product defect because it invites a doomed action.

## Choose projects or role fixtures based on the test shape

Projects are strongest when an entire test should run under one role. A fixture is stronger when one scenario needs two actors. The [browser-context isolation guide](/blog/playwright-browser-context-guide-2026) explains why contexts, rather than pages, are the security boundary.

| Need | Prefer | Reason |
|---|---|---|
| Repeat the same specification for each role | Projects | Project name and report clearly identify the role |
| Admin creates data, member observes it | Context fixture | Two authenticated actors coexist in one test |
| Different browsers plus different roles | Carefully composed projects | Cartesian products can become expensive |
| One-off unauthenticated check | \`test.use({ storageState: { cookies: [], origins: [] } })\` | Empty state overrides project authentication |

A typed fixture can expose pages whose contexts are independent:

\`\`\`ts
// tests/fixtures/roles.ts
import { test as base, expect, type Page } from '@playwright/test';

type RolePages = { adminPage: Page; memberPage: Page };

export const test = base.extend<RolePages>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  memberPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/member.json' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
\`\`\`

Use it for a collaboration boundary that only makes sense with two users:

\`\`\`ts
import { test, expect } from './fixtures/roles';

test('member sees a project after an admin grants access', async ({ adminPage, memberPage }) => {
  await adminPage.goto('/admin/projects/roadmap/access');
  await adminPage.getByLabel('User email').fill(process.env.E2E_MEMBER_EMAIL!);
  await adminPage.getByRole('button', { name: 'Grant viewer access' }).click();
  await expect(adminPage.getByText('Viewer access granted')).toBeVisible();

  await memberPage.goto('/projects/roadmap');
  await expect(memberPage.getByRole('heading', { name: 'Roadmap' })).toBeVisible();
  await expect(memberPage.getByRole('button', { name: 'Delete project' })).toHaveCount(0);
});
\`\`\`

Never create two pages in the same authenticated context and call them different users. Cookies are shared at the context level, so a login in one page changes the other page's identity.

## Prevent parallel tests from corrupting shared identities

Saved login state isolates browser storage, not backend data. If six admin tests edit the same profile, their contexts are separate while their server record is shared. Marking everything serial hides the design problem and slows feedback.

Partition mutable data by test, worker, or account. Use unique project names and resources, clean up through APIs, and avoid tests that change account passwords, MFA settings, locale, or role for a reused identity. A worker-scoped provisioning fixture is appropriate when user creation is cheap enough. Include \`testInfo.workerIndex\` and a run identifier in generated usernames.

For fixed accounts, classify tests:

| Mutation | Safe with shared role account? | Better design |
|---|---:|---|
| Read dashboard | Usually | Keep data assertions resilient to ordering |
| Create uniquely named resource | Usually | Delete resource after test or expire by run ID |
| Change account locale | No | Use a disposable user or context-level locale |
| Revoke all sessions | No | Dedicated account for session-security tests |
| Modify team-wide permission | Risky | Isolated tenant or serial administrative suite |

## Refresh state without masking expiration bugs

Generating state for every run favors reliability over maximum speed. Generating once and caching for days creates confusing failures when tokens expire or accounts are disabled. CI should normally execute setup on every workflow run. Local developers may reuse a recent file, but a deliberate refresh command is clearer than hidden timestamp logic.

Do not automatically reauthenticate inside an authorization test after a 401. That converts session-expiration behavior into an invisible retry. If the product is meant to refresh an access token, test that mechanism separately while preserving the refresh cookie. If a refresh token is one-time use, parallel contexts cloned from one state may compete. In that architecture each worker needs its own login.

## Diagnose role-state failures from evidence

When a test lands on the login page, first inspect the response and state, not the selector. A trace can show whether the cookie was sent, whether the server returned 302 or 401, and whether the application cleared storage.

| Symptom | Likely cause | Useful check |
|---|---|---|
| Both roles appear as admin | Wrong state path or shared credential | Assert \`/api/me\` immediately |
| State works locally, fails in CI | Host, secure cookie, clock, or missing secret | Compare cookie domain and target base URL |
| First parallel test passes | One-time refresh-token rotation | Give each worker a distinct session |
| UI shows old permissions | Claims or authorization cache is stale | Reissue token after role change |
| API request is anonymous | Request context did not inherit page context | Use \`page.request\` or pass storage state explicitly |

Record the setup project trace on failure. Redact headers and state before sharing artifacts. Authentication diagnostics often contain exactly the secrets an attacker needs.

## A review checklist for multi-role suites

Before merging, verify that filenames describe roles, setup proves identity, credentials are secret-scoped, and every context closes. Confirm negative tests call protected endpoints directly, not only hidden buttons. Make role accounts incapable of interfering with production. Finally, inspect the project matrix so browser coverage has not been multiplied by every role without a coverage reason.

Role reuse is successful when it is boring: every test starts as a known actor, state never leaks, and failures say whether identity, permission, or product behavior was wrong.

## Extend the suite across real authorization boundaries

Once the two-role foundation works, add cases based on permission transitions rather than duplicating page checks. Test an administrator inviting a member, a member accepting, and each actor seeing only their own controls. Create a resource as the member and verify the admin's audit view attributes it correctly. Remove access in the admin context, then reload the member context and prove both the page and direct API reject further access. This sequence detects authorization caches that remain permissive after revocation.

Include tenant boundaries. Provision an admin for tenant A and a member for tenant B, then attempt a known tenant A URL as the tenant B member. A 404 may be the deliberate privacy response instead of 403. Assert the agreed status and ensure the body does not disclose the resource name, owner, or tenant existence. State files make this test fast, but the server remains responsible for tenant isolation.

Privilege upgrades need a new token when role claims are embedded. Start as a member, let a separate administrative actor grant a permission, and decide whether the member must reauthenticate, refresh, or simply reload. Test the documented path. Do not edit the state JSON to simulate new claims because that bypasses signing and server session behavior.

Privilege downgrades are more security-sensitive. After removing an administrator capability, keep the original admin context open and attempt the protected mutation. The operation must fail even if the old navigation still displays a button. Then open a fresh context from the old file. If it authenticates with stale privilege, the revocation design needs attention.

Add state-file integrity checks in setup. Verify that the file is non-empty, contains only expected origins, and is written under the ignored directory. Do not snapshot its full contents. Cookie names and token formats change, while snapshots risk secret disclosure. A safer check parses the JSON locally, confirms the expected application origin exists, and immediately deletes any diagnostic copy.

Test logout with a disposable state. Logging out in one context may revoke only that session or every session for the user. If the reusable member file represents the same session, a later test may become anonymous. Put logout and “revoke all devices” cases in isolated projects that generate dedicated accounts or states. Their teardown should tolerate an already-revoked session.

Mobile and desktop projects can share state only when cookie domains, user agents, and authentication policy permit it. Some risk engines bind a session to device signals. Treat cross-device reuse as a product behavior to verify, not an optimization to assume. If mobile emulation redirects to a different origin, generate its state against that origin.

Finally, audit the report names. A failed title such as “can edit settings” is ambiguous without the actor. Project metadata normally supplies the role, while multi-actor fixture tests should name both roles and the transition. Useful failure output identifies the expected identity, actual identity from \`/api/me\`, protected resource, and response status without printing credentials.

Review CI screenshots too, since account menus can expose email addresses even when the state JSON is protected. Test-report access controls belong to the authentication threat model. Use synthetic addresses that cannot receive real customer mail or trigger external workflows.

## Frequently Asked Questions

### Can one storage-state file hold several logged-in users?

Not for the same origin in a useful isolated way. Cookies and local storage belong to one context, so later logins overwrite or coexist unpredictably. Save one file per role and create a separate context for each actor.

### Should authentication setup run once per worker?

Only when the identity provider rotates a one-time refresh token or tests mutate session state. Otherwise a setup project can create one read-only session per role for the run. Backend data isolation remains a separate concern.

### How do I run a single specification as only the member role?

Use the configured project selection, for example \`npx playwright test path/to/spec.ts --project=member\`. This selects the member context options and its setup dependency.

### Does storage state include sessionStorage?

No. If the application stores critical auth material there, initialize it explicitly with an init script, or reconsider the storage design. Do not assume saving context state captured it.

### Is it safe to commit redacted state JSON?

No. Redaction usually makes the file unusable, and missed cookies or local-storage tokens remain credentials. Generate state from secret-backed accounts and keep the entire authentication directory ignored.
`,
};
