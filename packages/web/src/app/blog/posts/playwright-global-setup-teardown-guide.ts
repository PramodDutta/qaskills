import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Global Setup and Teardown: Complete 2026 Guide',
  description: 'Master Playwright global setup and teardown with project dependencies, storageState auth reuse, DB seeding, and FullConfig in 2026. Runnable TypeScript.',
  date: '2026-06-07',
  category: 'Guide',
  content: `
# Playwright Global Setup and Teardown: Complete 2026 Guide

Every serious Playwright suite eventually needs work that happens once, before any test runs, and once after they all finish. You log in a user and save the session so two hundred tests do not each pay the cost of authentication. You seed a database with known fixtures so assertions are deterministic. You spin up a mock server, warm a cache, or stamp a build identifier into the environment. Then, when the run ends, you tear all of it down: drop the seeded rows, stop the server, clean up uploaded files. That one-time, run-wide work is what global setup and teardown are for.

Playwright gives you two ways to do this, and in 2026 the distinction matters more than ever. The classic approach is \`globalSetup\` and \`globalTeardown\`, two functions named in your config that receive the resolved \`FullConfig\` and run outside the test runner. The modern approach, which the Playwright team now recommends for most cases, uses project dependencies: a setup project runs its tests first, a teardown project runs after, and both appear in your HTML report with full tracing, fixtures, and retries. Each model has a place, and knowing when to reach for which is the difference between a brittle bootstrap script and a clean, observable pipeline.

This guide covers both models end to end with runnable TypeScript on Playwright 1.55+: the classic \`globalSetup\` function and its \`FullConfig\` argument, the project-dependency pattern with \`testProject.teardown\`, \`storageState\` authentication reuse, database seeding, environment configuration, sharing data across tests, and the ordering rules that decide what runs when. If you are assembling a complete suite, read this alongside the [Playwright end-to-end complete guide](/blog/playwright-e2e-complete-guide) and the [parallel and sharding guide](/blog/playwright-parallel-sharding-execution-guide). The [playwright-e2e skill](/skills/playwright-e2e) packages these patterns for AI coding agents.

## Two models at a glance

Before diving in, here is the decision in one table. Most teams should default to project dependencies and reach for classic \`globalSetup\` only when they need work that cannot or should not run inside the test runner.

| Concern | Classic globalSetup | Project dependencies |
|---|---|---|
| Where it runs | Outside the test runner | As a real test project |
| Appears in HTML report | No | Yes |
| Tracing and screenshots | Not available | Full support |
| Can use fixtures and page | No (must launch manually) | Yes |
| Retries on failure | No | Yes, like any test |
| Runs once per run | Yes | Yes (setup project) |
| Best for | Env vars, build stamps, external bootstraps | Auth, DB seeding, anything observable |

## Classic globalSetup and globalTeardown

The classic model points your config at two functions. \`globalSetup\` runs once before everything; \`globalTeardown\` runs once after everything. Both are plain async functions, not tests, so they have no \`page\` fixture and no automatic tracing. If you need a browser, you launch one yourself.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  use: { baseURL: 'http://localhost:3000' },
});
\`\`\`

The setup function receives the resolved \`FullConfig\`, which exposes everything Playwright computed from your config: projects, the root directory, worker count, and shared \`use\` options. Read from it rather than hard-coding values so setup and tests stay in sync.

\`\`\`typescript
// global-setup.ts
import type { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  console.log('Bootstrapping run against', baseURL);

  // Make a value available to every test via the environment.
  process.env.RUN_ID = \\\`run-\\\${Date.now()}\\\`;
}

export default globalSetup;
\`\`\`

The matching teardown does the reverse. Anything created in setup should be removed here so repeated local runs start clean.

\`\`\`typescript
// global-teardown.ts
import type { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Tearing down run', process.env.RUN_ID);
  // Drop seeded data, stop servers, remove temp files.
}

export default globalTeardown;
\`\`\`

A practical note: anything you write to \`process.env\` inside \`globalSetup\` is visible to every worker, which makes it the simplest channel for passing a run identifier or a base URL down to tests.

## Authenticating once with storageState

The highest-value use of global setup is authentication. Logging in is slow and you do not want to do it inside every test. Instead, log in once, save the browser storage state to a file, and tell your tests to load it. Playwright reads cookies and local storage from that file so every test starts already signed in.

In the classic model you launch a browser by hand, perform the login, and call \`storageState\` to persist it:

\`\`\`typescript
// global-setup.ts
import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(\\\`\\\${baseURL}/login\\\`);
  await page.getByLabel('Email').fill(process.env.TEST_USER!);
  await page.getByLabel('Password').fill(process.env.TEST_PASS!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/dashboard');

  // Persist cookies and local storage for reuse by all tests.
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
  await browser.close();
}

export default globalSetup;
\`\`\`

Then point your tests at the saved state in config:

\`\`\`typescript
export default defineConfig({
  globalSetup: require.resolve('./global-setup'),
  use: { storageState: 'playwright/.auth/user.json' },
});
\`\`\`

Every test now starts authenticated without ever seeing the login form. This single change often cuts minutes off a large suite.

## The modern model: project dependencies

Project dependencies are the recommended pattern in 2026 because the setup work becomes a real Playwright test. It shows up in your report, supports tracing, can use the \`page\` fixture, and retries on failure like anything else. You define a setup project, give it a \`testMatch\` so it only runs the setup spec, and declare other projects \`dependencies\` on it.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /global\\.setup\\.ts/,
    },
    {
      name: 'chromium',
      use: { storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
\`\`\`

The setup spec is just a test. Because it runs inside the runner, you get the \`page\` fixture for free, no manual browser launch required.

\`\`\`typescript
// global.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER!);
  await page.getByLabel('Password').fill(process.env.TEST_PASS!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('**/dashboard');

  await page.context().storageState({ path: authFile });
});
\`\`\`

Playwright guarantees the \`setup\` project finishes before any project that depends on it begins. If setup fails, the dependent projects are skipped, which is exactly the behavior you want: no point running tests against a broken bootstrap.

## Teardown with testProject.teardown

The project-dependency model has its own teardown mechanism that the classic model lacks symmetry for. You add a teardown project and reference it from your setup project with the \`teardown\` key. Playwright runs the teardown project after every project that depended on the setup completes.

\`\`\`typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /global\\.setup\\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /global\\.teardown\\.ts/,
    },
    {
      name: 'chromium',
      use: { storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
\`\`\`

The teardown spec is also just a test, with full access to fixtures and the API request context.

\`\`\`typescript
// global.teardown.ts
import { test as teardown } from '@playwright/test';

teardown('clean up seeded data', async ({ request }) => {
  await request.delete('/api/test/seed', {
    headers: { authorization: \\\`Bearer \\\${process.env.SEED_TOKEN}\\\` },
  });
});
\`\`\`

The ordering rule is precise: setup runs first, then all dependent projects, then teardown. Teardown runs even if some tests failed, so cleanup is reliable.

## Seeding a database before the run

Deterministic tests need deterministic data. Seed once in setup and your assertions can rely on known records existing. The cleanest way is to seed through an API or a script and tear down the same way. Here is a setup spec that seeds via the API request fixture, which gives you tracing on the seed call itself.

\`\`\`typescript
// global.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('seed database', async ({ request }) => {
  const response = await request.post('/api/test/seed', {
    data: {
      users: [{ email: 'seeded@example.com', plan: 'pro' }],
      products: [{ sku: 'SKU-1', stock: 10 }],
    },
  });
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  process.env.SEED_TOKEN = body.token;
});
\`\`\`

If you seed directly against a database driver instead of an API, do it in a plain function and call it from the setup spec. Keep the seed idempotent so a re-run after a crashed teardown does not pile up duplicate rows.

## Configuring environment and FullConfig

The \`FullConfig\` object passed to a classic \`globalSetup\` is the resolved, merged view of your configuration. It is the right place to read values rather than re-deriving them, which keeps setup honest when someone changes the config later.

| FullConfig property | What it gives you |
|---|---|
| \`config.projects\` | All project definitions with resolved \`use\` |
| \`config.rootDir\` | Absolute root directory of the project |
| \`config.workers\` | Resolved worker count for the run |
| \`config.webServer\` | The web server config, if any |
| \`config.metadata\` | Arbitrary metadata attached to the run |

\`\`\`typescript
// global-setup.ts
import type { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Workers:', config.workers);
  console.log('Root:', config.rootDir);
  const project = config.projects.find((p) => p.name === 'chromium');
  console.log('Base URL:', project?.use.baseURL);
}

export default globalSetup;
\`\`\`

For secrets and per-environment values, load a \`.env\` file at the very top of your config with a library like \`dotenv\` so both setup and tests see the same variables. Never commit real credentials; use environment variables in CI.

## Sharing data across tests

Global setup often produces data that tests need: a seed token, a created order ID, a tenant slug. There are three clean channels for passing it, each suited to a different scope.

| Channel | Scope | When to use |
|---|---|---|
| \`process.env\` | Whole run, all workers | Simple scalars like tokens and IDs |
| A JSON file on disk | Whole run, all workers | Structured data, multiple values |
| \`storageState\` | Browser session | Auth cookies and local storage |

The file approach is the most flexible for structured data. Write it in setup, read it in a fixture.

\`\`\`typescript
// In global.setup.ts
import { writeFileSync } from 'node:fs';

setup('persist seed context', async ({ request }) => {
  const res = await request.post('/api/test/seed');
  const data = await res.json();
  writeFileSync('playwright/.tmp/seed.json', JSON.stringify(data));
});
\`\`\`

\`\`\`typescript
// In a fixture or test
import { readFileSync } from 'node:fs';

const seed = JSON.parse(readFileSync('playwright/.tmp/seed.json', 'utf-8'));
// Use seed.orderId, seed.tenant, etc.
\`\`\`

Avoid module-level mutable variables for cross-test sharing. Each worker is a separate process, so an in-memory variable set in setup is not visible to the workers. Files and the environment cross process boundaries; module state does not.

## Multiple setup projects and ordering

Real suites often need several independent bootstraps: authenticate as an admin, authenticate as a regular user, seed data. You can declare multiple setup projects and have test projects depend on exactly the ones they need. Dependencies form a graph, and Playwright resolves the order automatically.

\`\`\`typescript
export default defineConfig({
  projects: [
    { name: 'setup:db', testMatch: /db\\.setup\\.ts/, teardown: 'cleanup:db' },
    { name: 'setup:admin', testMatch: /admin\\.setup\\.ts/ },
    { name: 'cleanup:db', testMatch: /db\\.teardown\\.ts/ },
    {
      name: 'admin-tests',
      use: { storageState: 'playwright/.auth/admin.json' },
      dependencies: ['setup:db', 'setup:admin'],
    },
    {
      name: 'user-tests',
      use: { storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup:db'],
    },
  ],
});
\`\`\`

Here \`admin-tests\` waits for both the DB seed and the admin login, while \`user-tests\` only waits for the DB seed. The teardown attached to \`setup:db\` runs once after every project that transitively depended on it. This granularity keeps unrelated bootstraps from blocking each other and is impossible to express cleanly with a single classic \`globalSetup\`.

## Authenticating multiple roles efficiently

Many apps need tests as several roles: an admin, a regular user, maybe a billing manager. Logging in for each role once and saving separate storage state files is far faster than re-authenticating per test. Run a parametrized setup that produces one state file per role, then point each test project at the file it needs.

\`\`\`typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

const roles = [
  { name: 'admin', user: process.env.ADMIN_USER!, pass: process.env.ADMIN_PASS! },
  { name: 'member', user: process.env.MEMBER_USER!, pass: process.env.MEMBER_PASS! },
];

for (const role of roles) {
  setup(\\\`authenticate as \\\${role.name}\\\`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(role.user);
    await page.getByLabel('Password').fill(role.pass);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard');
    await page.context().storageState({ path: \\\`playwright/.auth/\\\${role.name}.json\\\` });
  });
}
\`\`\`

A test that needs no authentication at all can opt out with \`test.use({ storageState: { cookies: [], origins: [] } })\`, which gives it a clean, signed-out browser even though the project default loads a saved session. This keeps logged-out flows like the login page itself testable without a separate project.

## Speeding setup with API-based login

UI login through the form is realistic but slow, and in setup you usually do not need to test the form itself, just to obtain a session. Authenticating through the API and writing the resulting cookies into storage state is dramatically faster and more stable, because it skips rendering entirely. Use the \`request\` fixture to hit your auth endpoint, then save the context state.

\`\`\`typescript
// api-auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate via API', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: { email: process.env.TEST_USER, password: process.env.TEST_PASS },
  });
  // The Set-Cookie headers from the response are captured into the context.
  await request.storageState({ path: 'playwright/.auth/user.json' });
});
\`\`\`

Reserve UI login for a single explicit test that verifies the login page works, and use API login everywhere else for speed. This split keeps the suite both realistic and fast, a pattern explored further in the [parallel and sharding guide](/blog/playwright-parallel-sharding-execution-guide) where setup cost compounds across workers.

## Handling token expiry in long runs

A saved storage state contains a session token, and tokens expire. On a long shard or a slow CI machine, a token captured at the start of the run can lapse before the last tests use it. Two strategies help. First, request a long-lived token specifically for the test account. Second, re-run setup per shard rather than once globally, so each shard gets a fresh session. With project dependencies the setup project runs per shard automatically, which sidesteps the problem entirely.

| Symptom | Likely cause | Fix |
|---|---|---|
| Tests pass locally, fail on slow CI | Token expired mid-run | Use a long-lived test token |
| Only the last shard fails auth | One global login reused everywhere | Let each shard run its own setup |
| Random 401s late in the suite | Session invalidated server-side | Re-authenticate per project |

If you cannot control token lifetime, a small guard at the top of a global fixture that checks the saved state's age and re-authenticates when it is stale keeps long runs healthy without re-logging in on every single test.

## Choosing between the two models

Reach for project dependencies by default. They give you reporting, tracing, retries, and fixtures, and they compose into dependency graphs for complex suites. Reach for classic \`globalSetup\` only when the work genuinely does not belong in the test runner: setting environment variables that must exist before any project resolves, stamping build metadata, or invoking an external orchestration tool that has nothing to do with the browser. Many teams use both, a thin classic \`globalSetup\` for environment wiring and a setup project for auth and seeding.

## Frequently Asked Questions

### What is the difference between globalSetup and project dependencies in Playwright?

\`globalSetup\` is a function that runs outside the test runner, so it has no tracing, no \`page\` fixture, and does not appear in the report. Project dependencies make setup a real test project that runs first, supports tracing and fixtures, and retries on failure. In 2026 the Playwright team recommends project dependencies for most cases and reserves \`globalSetup\` for pure environment wiring.

### How do I reuse a login across all tests in Playwright?

Log in once in a setup project or \`globalSetup\`, then call \`page.context().storageState({ path: 'auth.json' })\` to save cookies and local storage. Point your test projects at that file with \`use: { storageState: 'auth.json' }\`. Every test then starts already authenticated without rendering the login form, which often removes minutes from a large suite and eliminates a flaky shared step.

### Can I use the page fixture in Playwright global setup?

Not in classic \`globalSetup\`, which runs outside the runner and forces you to launch a browser manually with \`chromium.launch()\`. The modern project-dependency model does give you the \`page\` fixture because the setup spec is a real test. That is one of the main reasons to prefer a setup project: you write authentication and seeding with the same fixtures and tracing as ordinary tests.

### How do I seed a database before Playwright tests run?

Create a setup project whose spec calls your seed API or a database script, ideally through the \`request\` fixture so the call is traced. Make the seed idempotent so a re-run after a failed teardown does not duplicate rows. Pair it with a teardown project, referenced via the setup project's \`teardown\` key, that deletes the seeded data after every dependent project finishes.

### What does FullConfig provide in Playwright globalSetup?

\`FullConfig\` is the resolved, merged configuration. It exposes \`projects\` with their computed \`use\` options, \`rootDir\`, \`workers\`, \`webServer\`, and \`metadata\`. Read values from it instead of hard-coding so setup stays in sync when the config changes. For example, pull \`baseURL\` from \`config.projects[0].use\` rather than repeating the literal URL in both setup and your test files.

### How do I share data from global setup to my tests?

Use \`process.env\` for simple scalars like tokens, a JSON file on disk for structured data, and \`storageState\` for auth. Avoid module-level variables: each worker is a separate process, so an in-memory value set in setup is invisible to the workers. Files and environment variables cross process boundaries reliably, which is why they are the correct channels for run-wide shared data.

### Does Playwright run teardown if tests fail?

Yes. In the project-dependency model the teardown project runs after every dependent project completes, regardless of whether tests passed or failed, so cleanup is reliable. Classic \`globalTeardown\` also runs after the run unless the process is killed. Because teardown is not guaranteed to run on a hard crash, keep your seed scripts idempotent so the next run can recover cleanly.

### Can I have multiple setup projects in Playwright?

Yes. Define several setup projects, each with its own \`testMatch\`, and have test projects list exactly the ones they need in \`dependencies\`. Playwright resolves the dependency graph and runs setups in the correct order, in parallel where possible. This lets an admin suite wait for both a DB seed and an admin login while a user suite waits only for the seed, without blocking unrelated bootstraps.

## Conclusion

Global setup and teardown are where a Playwright suite earns its speed and determinism. Authenticate once and reuse the session with \`storageState\`, seed a known database, wire environment variables, and clean everything up when the run ends. The classic \`globalSetup\` and \`globalTeardown\` functions still have a place for pure environment work, but the project-dependency model is the better default in 2026: it makes setup observable, traceable, and retryable by turning it into a real test project, and it composes into dependency graphs that express exactly what each suite needs.

Start by moving authentication into a setup project with \`storageState\`, then add a teardown project for cleanup, then layer in DB seeding as your suite grows. Keep shared data in files or the environment, keep seeds idempotent, and let Playwright resolve the ordering. To go further, explore the [playwright-e2e skill](/skills/playwright-e2e), the full [skills directory](/skills), and the [flaky tests guide](/blog/fix-flaky-tests-guide) for eliminating the instability that brittle setup so often causes.
`,
};
