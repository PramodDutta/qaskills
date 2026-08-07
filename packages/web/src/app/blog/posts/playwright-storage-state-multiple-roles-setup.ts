import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Storage State Multiple Roles Setup: A Reliable Pattern for Role-Based Tests',
  description: 'Use this playwright storage state multiple roles setup to isolate admin, editor, and viewer sessions, prevent auth leaks, and make parallel tests reliable.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Storage State Multiple Roles Setup: A Reliable Pattern for Role-Based Tests

A reliable Playwright storage state multiple roles setup gives every browser context the identity its test actually needs. Create one authenticated state file per role, map those files to Playwright projects or typed fixtures, generate them in a setup project, and never mutate a shared account from tests that run in parallel. That arrangement turns authorization tests from a pile of repeated login steps into an explicit test architecture.

The key is to treat storage state as a credential artifact, not as a universal cache. A saved state can contain cookies, local storage, and IndexedDB data used by the application. It should be short lived, excluded from version control, and scoped narrowly enough that a viewer test cannot silently inherit an administrator session. The examples below use three roles, but the same design works for tenants, subscription plans, feature-entitlement groups, and support impersonation sessions.

This guide builds the setup from the file layout through CI diagnostics. It also shows when projects are clearer than fixtures, how to avoid cross-role contamination, and why a successful login during setup does not prove that the saved session will still be valid when a later test begins.

## Model roles as separate authentication artifacts

Start with a small role catalog. Each role needs an account source, a storage-state destination, and a statement of what the role is allowed to do. Keeping those facts together makes accidental privilege escalation visible during review.

| Role | State file | Intended assertions | Parallel-use policy |
|---|---|---|---|
| Administrator | \`.auth/admin.json\` | User management, billing controls, audit access | Read-only tests may share; mutating tests need isolation |
| Editor | \`.auth/editor.json\` | Create and revise content, no account administration | Use a dedicated account for destructive suites |
| Viewer | \`.auth/viewer.json\` | Read content, reject all write actions | Usually safe to share when the app has no per-user side effects |

The file does not describe the role. The server-side account does. Naming a file \`admin.json\` cannot make an ordinary user an administrator, and a role change made after the file was created may invalidate or alter the session. Your test data provisioning system remains the source of truth.

Use a repository layout that keeps setup code close to tests while keeping secrets and generated state out of source control:

\`\`\`text
playwright.config.ts
tests/
  auth/
    auth.setup.ts
    auth-files.ts
  fixtures/
    role-fixtures.ts
  admin/
  editor/
  viewer/
playwright/.auth/
\`\`\`

Add the generated directory to \`.gitignore\`. Playwright's authentication guidance warns that a state file can contain sensitive cookies and headers that could impersonate the account.

\`\`\`gitignore
playwright/.auth/
test-results/
playwright-report/
\`\`\`

Do not place raw passwords in the role catalog. CI secrets, a local ignored environment file, or a test-user provisioning service should provide them. The code should fail with a useful message when a required credential is absent.

## Generate each role in one setup project

Playwright projects can depend on a setup project. The dependency runs first, appears in reports, and can produce state files consumed by the dependent projects. This is preferable to hiding browser work in an arbitrary Node script because traces and normal Playwright diagnostics remain available.

The configuration below defines one setup project and three role projects. A project-level \`use.storageState\` means every test in that project starts a fresh browser context populated from the corresponding file.

\`\`\`ts
import { defineConfig, devices } from '@playwright/test';
import { authFile } from './tests/auth/auth-files';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\\.setup\\.ts/,
    },
    {
      name: 'admin-chromium',
      dependencies: ['auth-setup'],
      testMatch: 'admin/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile.admin,
      },
    },
    {
      name: 'editor-chromium',
      dependencies: ['auth-setup'],
      testMatch: 'editor/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile.editor,
      },
    },
    {
      name: 'viewer-chromium',
      dependencies: ['auth-setup'],
      testMatch: 'viewer/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile.viewer,
      },
    },
  ],
});
\`\`\`

In the rendered article, readers see the intended JavaScript regular expression.

Centralize paths with \`path.resolve\` so execution does not depend on the shell's current directory. That matters in editors, monorepos, and CI runners.

\`\`\`ts
import path from 'node:path';

const authDir = path.resolve(__dirname, '../../playwright/.auth');

export const authFile = {
  admin: path.join(authDir, 'admin.json'),
  editor: path.join(authDir, 'editor.json'),
  viewer: path.join(authDir, 'viewer.json'),
} as const;

export type Role = keyof typeof authFile;
\`\`\`

The setup test can authenticate each account through the UI and save its state. Replace labels and URLs with your application's accessible names and stable routes. The Playwright methods shown are documented APIs.

\`\`\`ts
import { test as setup, expect } from '@playwright/test';
import { authFile, type Role } from './auth-files';

const credentials: Record<Role, { email?: string; password?: string }> = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
  },
  editor: {
    email: process.env.E2E_EDITOR_EMAIL,
    password: process.env.E2E_EDITOR_PASSWORD,
  },
  viewer: {
    email: process.env.E2E_VIEWER_EMAIL,
    password: process.env.E2E_VIEWER_PASSWORD,
  },
};

for (const role of Object.keys(credentials) as Role[]) {
  setup(\`authenticate \${role}\`, async ({ page }) => {
    const account = credentials[role];
    if (!account.email || !account.password) {
      throw new Error(\`Missing E2E credentials for role: \${role}\`);
    }

    await page.goto('/login');
    await page.getByLabel('Email').fill(account.email);
    await page.getByLabel('Password').fill(account.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByTestId('current-role')).toHaveText(role);
    await page.context().storageState({ path: authFile[role] });
  });
}
\`\`\`

The role assertion after login is essential. Without it, a test environment seeded incorrectly can save three valid sessions that all belong to the same default user. Waiting for a post-login URL alone proves navigation, not authorization identity.

## Choose projects or fixtures based on how roles interact

Projects are the clearest choice when an entire test file or suite runs as one role. Fixtures are more convenient when one scenario needs multiple independently authenticated contexts, such as an editor publishing an item while a viewer verifies visibility. Do not force every case through one mechanism.

| Requirement | Project-level state | Role fixture | Fresh UI login |
|---|---:|---:|---:|
| Entire suite uses one role | Excellent | Good | Wasteful |
| One test compares two roles | Awkward | Excellent | Acceptable for a small test |
| Report clearly labels role/browser matrix | Excellent | Moderate | Moderate |
| Per-test account customization | Limited | Excellent | Excellent |
| Fast repeated execution | Excellent | Excellent | Poor |

For project-based tests, keep directories aligned with project intent or use \`testMatch\` patterns. A viewer test can remain simple because the configuration supplies its identity:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('viewer cannot open the user administration page', async ({ page }) => {
  await page.goto('/settings/users');

  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Invite user' })).toHaveCount(0);
});
\`\`\`

This test checks both the server-driven outcome and the absence of a privileged control. The URL response is the stronger security signal; hiding a button alone is not authorization. If the server returns a dedicated status page, assert its stable user-facing content rather than coupling the test to a transient network implementation.

When a workflow needs two identities, create two contexts in a fixture. A new context can load a state file independently, even though both contexts belong to the same browser process.

\`\`\`ts
import { test as base, type BrowserContext, type Page } from '@playwright/test';
import { authFile } from '../auth/auth-files';

type RolePages = {
  editorPage: Page;
  viewerPage: Page;
};

export const test = base.extend<RolePages>({
  editorPage: async ({ browser }, use) => {
    const context: BrowserContext = await browser.newContext({
      storageState: authFile.editor,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  viewerPage: async ({ browser }, use) => {
    const context: BrowserContext = await browser.newContext({
      storageState: authFile.viewer,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
\`\`\`

Closing each context is part of the fixture contract. It releases pages, videos, network connections, and context-specific data. A fixture that exposes a page from the default test context cannot swap storage state after that context has already been created, so role-aware contexts should be created explicitly.

The resulting cross-role scenario mirrors a real collaboration without logging in twice during the test:

\`\`\`ts
import { test, expect } from '../fixtures/role-fixtures';

test('published guidance becomes visible to a viewer', async ({
  editorPage,
  viewerPage,
}) => {
  const title = \`Release checklist \${Date.now()}\`;

  await editorPage.goto('/articles/new');
  await editorPage.getByLabel('Title').fill(title);
  await editorPage.getByRole('button', { name: 'Publish' }).click();
  await expect(editorPage.getByText('Published successfully')).toBeVisible();

  await viewerPage.goto('/articles');
  await expect(viewerPage.getByRole('link', { name: title })).toBeVisible();
});
\`\`\`

The timestamp keeps this example readable, but a production suite should prefer a test-data factory that returns the created record and deletes it afterward. Random names reduce collisions; they do not provide cleanup.

## Keep authentication reuse separate from mutable test data

Storage state isolates browser credentials, not server-side user data. Two worker processes loading the same editor state are still acting as the same account. If both tests edit the account profile, consume a one-time notification, change the password, or alter a shared draft, they can interfere even though their browser contexts are separate.

Classify scenarios before deciding whether a state can be shared:

| Server-side behavior | Can workers share one role account? | Safer design |
|---|---|---|
| Reads immutable catalog data | Usually yes | Shared role state |
| Creates records with unique ownership | Often | Unique record names and deterministic cleanup |
| Modifies account preferences | No | One account per worker or serial suite |
| Tests logout or session revocation | No | Fresh account and state per test |
| Changes role or permissions | No | Dedicated provisioned account, then delete it |

Playwright's documented worker-scoped authentication pattern is useful when tests modify server-side state. Each parallel worker authenticates once with its own account. That requires an account acquisition or creation mechanism owned by your application or test platform. Playwright supplies \`workerIndex\`, but it does not provision accounts for you.

\`\`\`ts
import { test as base } from '@playwright/test';

type WorkerAccount = {
  email: string;
  password: string;
};

export const test = base.extend<{}, { account: WorkerAccount }>({
  account: [async ({}, use, workerInfo) => {
    const account = await acquireEditorAccount(workerInfo.workerIndex);
    await use(account);
    await releaseEditorAccount(account);
  }, { scope: 'worker' }],
});

async function acquireEditorAccount(workerIndex: number): Promise<WorkerAccount> {
  throw new Error(\`Connect worker \${workerIndex} to your test-user service\`);
}

async function releaseEditorAccount(account: WorkerAccount): Promise<void> {
  void account;
}
\`\`\`

The two helper functions intentionally show integration boundaries instead of pretending Playwright has account-management APIs. Implement them against a documented internal test service, seed script, or admin API. If that system cannot allocate accounts safely, mark the destructive group serial only as a temporary containment measure. Serial execution lowers concurrency but does not repair hidden state dependencies.

## Verify state readiness instead of guessing with timeouts

A common failure occurs when the login click returns before the final authentication cookie or local-storage token is written. The setup saves state immediately, and dependent tests start unauthenticated. Adding a fixed delay makes the suite slower and remains vulnerable under load.

Use an observable application condition that proves authentication has completed. Suitable signals include a stable post-login URL, a visible user identity, or a successful response from a documented session endpoint. Then save storage state.

For applications that defer IndexedDB-backed authentication data, Playwright supports including IndexedDB in the state snapshot through the documented \`indexedDB\` option on \`storageState\`. Use it only when your application actually stores required credentials there.

\`\`\`ts
await expect(page.getByTestId('signed-in-user')).toHaveText(account.email);

await page.context().storageState({
  path: authFile[role],
  indexedDB: true,
});
\`\`\`

Do not enable options blindly. First inspect how the application authenticates. Browser developer tools and a trace can reveal whether the decisive state is a cookie, local storage entry, or IndexedDB record. If a token is held only in JavaScript memory, no storage-state file can preserve it across contexts; the application needs a restorable session mechanism or the test must authenticate in each context.

Cookie scope is another source of false confidence. A state created against \`https://app.example.test\` may not authenticate requests to \`http://127.0.0.1:3000\`. Scheme, domain, path, secure attributes, and expiration affect whether the browser sends a cookie. Keep the setup project's base URL identical to the consuming project unless cross-origin behavior is exactly what you are testing.

## Diagnose the three most common role failures

When a dependent test unexpectedly lands on the login page, separate file generation, browser loading, and server acceptance. These are different failure layers.

1. Confirm that the expected file exists after the setup project and that it is not an empty default state.
2. Confirm the consuming project points to that exact resolved path.
3. Open the trace and inspect the first navigation, redirects, and cookies attached to requests.
4. Check expiry and environment affinity. A session issued by one deployment may be invalid on another.
5. Confirm no test revoked, logged out, or changed the shared account.

A small diagnostic test can prove which identity the server sees without printing secrets:

\`\`\`ts
import { test, expect } from '@playwright/test';

test('role state resolves to an administrator identity', async ({ page }) => {
  await page.goto('/account');

  await expect(page.getByTestId('current-role')).toHaveText('admin');
  await expect(page.getByTestId('signed-in-user')).not.toBeEmpty();
});
\`\`\`

Run it only in the administrator project. If it reports viewer, the file was generated from the wrong credentials or overwritten. If it reports no identity, inspect cookie scope and expiry. If it passes alone but fails in the full suite, search for logout, password changes, role mutations, or shared record operations elsewhere.

The overwrite case is especially deceptive. It often happens when a loop always writes to the same path, or when multiple setup tests generate states concurrently under one filename. The setup above indexes the output by role, and each role has a distinct path. If the accounts themselves cannot tolerate simultaneous login, configure the setup work accordingly or authenticate sequentially in one setup test.

## What teams get wrong about browser isolation

The most persistent misconception is that a new browser context implies a new server-side identity. A context isolates client storage. Loading the same cookie into ten contexts creates ten isolated browser containers that present the same session credential to the server. Server-side collisions remain possible.

Another mistake is testing authorization only by checking whether navigation links are hidden. UI visibility is useful, but it cannot show that a direct URL or API request is protected. For each sensitive capability, cover at least one allowed path and one denied path. Assert an outcome the user can observe, and ensure server-side tests cover the underlying permission rule.

Teams also overuse a single \`beforeEach\` login because it feels explicit. Repeating login in every test raises runtime, adds load to identity providers, triggers rate limits, and makes unrelated authorization scenarios fail when the login page changes. Storage state is appropriate for stable session reuse. Fresh login remains appropriate when login itself, logout, multi-factor authentication, or session invalidation is the subject.

Good locators make the authentication setup less brittle. The locator hierarchy and accessibility considerations in [Playwright locator practices](/blog/playwright-best-practices-locators-2026) apply directly to login and identity checks. For teams choosing where Playwright fits among runners and component tools, the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) provides the broader comparison.

## Make CI regenerate state safely on every run

Treat authenticated state as an ephemeral build artifact. Generate it inside the job, use it within that job, and let the runner discard it. Do not upload the authentication directory with public test reports or broad artifacts.

\`\`\`yaml
name: role-based-e2e

on:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
        env:
          BASE_URL: \${{ secrets.E2E_BASE_URL }}
          E2E_ADMIN_EMAIL: \${{ secrets.E2E_ADMIN_EMAIL }}
          E2E_ADMIN_PASSWORD: \${{ secrets.E2E_ADMIN_PASSWORD }}
          E2E_EDITOR_EMAIL: \${{ secrets.E2E_EDITOR_EMAIL }}
          E2E_EDITOR_PASSWORD: \${{ secrets.E2E_EDITOR_PASSWORD }}
          E2E_VIEWER_EMAIL: \${{ secrets.E2E_VIEWER_EMAIL }}
          E2E_VIEWER_PASSWORD: \${{ secrets.E2E_VIEWER_PASSWORD }}
\`\`\`

The workflow uses documented actions and Playwright installation behavior. Choose the Node release your repository supports rather than copying the example without checking. Keep secret exposure limited to the step that needs it, and configure the CI platform to mask and restrict credentials.

Shard awareness matters. If every shard runs the setup project against the same accounts, the identity system may issue competing sessions or enforce a single-session policy. Either allow safe concurrent sessions, assign credentials per shard, or run authentication once and transfer encrypted artifacts under tightly controlled retention. The simplest secure choice is often dedicated accounts per shard because it avoids moving credential files between jobs.

## A review checklist for adding a new role

Adding a role should be a predictable change, not an improvised copy-and-paste task. Review it against the following decisions:

| Review question | Passing evidence | Warning sign |
|---|---|---|
| Is the account truly assigned the intended role? | Setup asserts identity and role | Only the filename indicates role |
| Is the state stored outside version control? | Ignored ephemeral directory | JSON appears in a commit or artifact |
| Can parallel tests mutate shared account state? | Read-only use or worker accounts | Profile, logout, or permission tests share it |
| Does the suite prove denied access? | Direct route denial plus UI assertion | Only hidden menus are checked |
| Can failures identify the active role? | Project name and identity assertion | All cases appear under one generic project |
| Does CI regenerate state for its environment? | Setup dependency runs in the job | Developer state is copied to CI |

The complete design has three boundaries: the test environment provisions role-correct users, the setup project authenticates and captures separate state, and consuming tests load the minimum privilege they require. Once those boundaries are explicit, failures become classifiable. A broken login belongs to setup, a wrong identity belongs to provisioning or path mapping, and an incorrect permission outcome belongs to the application or its authorization expectations.

## Test tenant boundaries without confusing them with roles

Many business applications combine a role with an organization or tenant. An administrator in Tenant Alpha may manage Alpha users but must not see Tenant Beta. Saving one administrator state and calling it globally privileged loses that distinction.

Name the artifact for both dimensions when tenancy affects authorization, for example alpha-admin, alpha-viewer, and beta-admin. The account provisioning record should carry the expected tenant identifier, and setup should assert both role and tenant after login. A user-facing organization switcher, account page, or supported session endpoint can provide that evidence. Do not infer tenant solely from the hostname if the application also permits switching organizations within one session.

Cross-tenant tests need two independent contexts and uniquely created records. Alpha creates a document with a server-generated identifier. Beta then attempts the direct supported route for that exact identifier and receives the product's denied or not-found outcome. Finally, Alpha confirms the document remains accessible. This sequence proves isolation more strongly than checking whether Beta's navigation menu omits an Alpha link.

| Scenario | Required identities | Most important assertion |
|---|---|---|
| Tenant admin manages own member | Alpha administrator and Alpha member | Allowed operation changes Alpha only |
| Tenant admin targets another tenant | Alpha administrator and Beta record | Direct operation is denied |
| Same email belongs to two tenants | Separate tenant-aware sessions | Active organization is explicit |
| Support impersonation | Support identity and customer identity | Audit event records actor and subject |

Be cautious with applications that store the active tenant in local storage while the server session permits several tenants. The saved state may restore whichever tenant was active during setup. A test that changes organizations can modify browser-local state for its context, but server-side recent-tenant preferences might still affect later sessions for the same account. Use dedicated accounts when the preference is stored on the server.

## Rotate credentials without creating unexplained suite failures

Test-user passwords, session signing keys, and identity-provider policies change. A good role setup makes rotation visible in authentication setup rather than allowing hundreds of dependent tests to fail at their first navigation.

When credentials rotate, update the secret store and let the next job regenerate all state. Do not keep an old state file as a fallback. If setup fails, report which role failed without printing the email, password, cookie, authorization header, or complete state JSON. Screenshots of login errors may also expose account identifiers, so apply the same artifact access rules used for other secrets.

Session lifetime should exceed the expected test job duration with reasonable margin. If the security policy intentionally uses shorter sessions, split the suite into independently authenticated groups or refresh through a documented application mechanism. Do not edit expiration fields in the stored JSON. The server validates its own session, and changing a browser-side timestamp cannot legitimately extend it.

For long local debugging sessions, rerun the setup project when identity checks begin redirecting to login. A helper that silently regenerates state during an individual test can hide expiry, create concurrent login races, and make traces harder to interpret. Keep regeneration as an explicit phase.

Audit the account inventory periodically. Remove roles no test uses, disable credentials for retired environments, and confirm every remaining account has the minimum permissions its project name claims. Storage-state architecture reduces repeated login work, but it also creates a set of privileged automation identities that deserve normal credential governance.

## Frequently Asked Questions

### Can multiple Playwright projects use the same storage state file?

Yes, multiple projects can load the same file, and each test still receives an isolated browser context. The projects will nevertheless present the same session identity to the server. Sharing is reasonable for read-only checks against stable data. It is risky when tests change profile settings, revoke sessions, log out, consume one-time resources, or modify shared records. In those cases, provision accounts per worker or per destructive suite. Browser isolation prevents cookie writes in one context from directly changing another context, but it cannot isolate mutations already committed to server-side account data.

### Should every role have its own Playwright setup project?

Not necessarily. One setup project can contain a setup test for each role and write separate files, as shown here. Separate setup projects are useful when roles require different environments, expensive prerequisites, ownership boundaries, or selective dependencies. The important property is that each output path is unique and each saved identity is verified. If setup tests run concurrently, confirm the identity provider and accounts allow that behavior. A single sequential workflow can be easier to reason about when the authentication system invalidates previous sessions or rate-limits login attempts.

### How often should storage state be regenerated in CI?

Generate it for every CI job or logically isolated test run unless your security and infrastructure teams have designed a controlled cache with known expiration. Fresh generation avoids environment mismatch, expired cookies, role drift, and leaked long-lived artifacts. It also makes setup failure visible in the same report as the dependent tests. For a very expensive enterprise login, a short-lived broker may be justified, but the broker should issue scoped test credentials rather than distributing an opaque state file indefinitely. Never commit state JSON merely to save a few seconds.

### Does storage state test the login flow itself?

No. Reusing authenticated state deliberately bypasses most of the login journey for downstream tests. Keep a small, focused login suite that covers credential submission, error handling, redirects, and any required multi-factor path. Keep authorization and feature suites on reused state so they remain fast and diagnose their own concerns. Also include explicit logout or session-revocation tests with dedicated accounts, because those tests destroy the credential they exercise. This separation gives login enough coverage without forcing every unrelated test to depend on the identity interface.
`,
};
