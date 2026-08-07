import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Global Setup Teardown Patterns That Stay Maintainable',
  description: 'Use playwright global setup teardown patterns to prepare auth, data, and services once while keeping parallel tests isolated and debuggable.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Global Setup Teardown Patterns That Stay Maintainable

Playwright global setup teardown patterns are ways to prepare test prerequisites before a suite runs and clean them up after it finishes. The useful work is deciding what truly belongs at suite scope. Authentication state, ephemeral test environments, seeded reference data, feature-flag defaults, and external service checks can fit. Per-test business data, mutable user state, and assertions that need trace output usually do not.

The fastest way to create an unreliable Playwright suite is to put too much in global setup. It feels efficient at first: log in once, seed everything once, start every dependency once, and let all tests share it. Then parallel workers collide, retries inherit dirty state, auth expires mid-run, and failures point at a setup file with no page trace. Good global setup is small, observable, idempotent, and paired with teardown that can run after failures.

This guide gives QA and test-automation engineers concrete Playwright global setup teardown patterns for authentication, databases, API fixtures, setup projects, environment validation, and cleanup. Use it alongside your team's [JavaScript testing framework guide](/blog/javascript-testing-frameworks-complete-guide-2026) for unit-level helpers, and keep end-to-end selectors aligned with [Playwright locator best practices](/blog/playwright-best-practices-locators-2026) so setup flows do not break on cosmetic markup changes.

## Decide Whether Setup Belongs at Suite, Project, Worker, or Test Scope

Before writing code, classify the prerequisite by mutability and ownership. Suite scope is for expensive, stable prerequisites shared by all tests. Project scope is for prerequisites tied to a Playwright project, such as authenticated storage state for a browser profile. Worker scope is for data reused by tests running in the same parallel worker. Test scope is for anything a test mutates or asserts against.

| Scope | Lifetime | Good candidates | Avoid putting here |
|---|---|---|---|
| Global setup | Once before all projects | Environment checks, one-time auth file, external sandbox creation | Per-test data, assertions, stateful user workflows |
| Setup project | Runs as a Playwright project dependency | Auth flows with traces, UI setup that benefits from fixtures | Heavy operations repeated for unrelated projects |
| Worker fixture | Once per worker process | Tenant, account, queue namespace, API client | Shared state across different workers |
| Test fixture | Once per test | Orders, forms, messages, mutable records | Expensive global reference data |
| Global teardown | Once after suite | Delete sandbox, close tunnels, revoke tokens | Cleanup required for a single test to be independent |

The decision rule is blunt: if a test can fail because another test changed the setup artifact, the artifact is too shared. Move it to worker or test scope. Global setup should reduce repeated cost, not create hidden ordering contracts.

## Use globalSetup for Non-Interactive, Suite-Wide Preparation

Playwright's \`globalSetup\` configuration points to a module that exports a function. That function can read the full config, create files, call APIs, and prepare environment state before tests run. Keep it non-interactive when possible. API calls and filesystem writes are easier to diagnose than browser actions hidden outside the normal test reporter.

\`\`\`ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
  },
});
\`\`\`

\`\`\`ts
import type { FullConfig } from '@playwright/test';
import fs from 'node:fs/promises';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL;
  if (!baseURL) {
    throw new Error('baseURL is required for Playwright tests');
  }

  const response = await fetch(new URL('/health', baseURL));
  if (!response.ok) {
    throw new Error(\`Test target is not healthy: \${response.status}\`);
  }

  await fs.mkdir('playwright/.state', { recursive: true });
  await fs.writeFile(
    'playwright/.state/run.json',
    JSON.stringify({ baseURL, startedAt: new Date().toISOString() }, null, 2),
  );
}
\`\`\`

That setup does one job: it verifies the target and writes run metadata. It does not create users through the UI, click through onboarding, or seed mutable orders. Those tasks need better observability and more precise scope.

## Prefer Setup Projects for Browser-Based Authentication

Playwright supports project dependencies, which are often a better fit for browser-based authentication than \`globalSetup\`. A setup project is a normal Playwright project. It gets fixtures, tracing, screenshots, retries if configured, and normal reporter output. That makes login failures much easier to debug.

\`\`\`ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\\.setup\\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
\`\`\`

\`\`\`ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

const authFile = path.join('playwright', '.auth', 'user.json');

test('authenticate customer user', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('qa-user@example.test');
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.context().storageState({ path: authFile });
});
\`\`\`

The important detail is that authentication is now a test with a trace. If login breaks because of a selector, captcha change, feature flag, or auth backend outage, the reporter shows exactly where. That is usually better than a stack trace from a headless browser launched in \`globalSetup\`.

## Keep Auth State Fresh and Role-Specific

Authentication state files are convenient, but they are also a source of stale-state failures. Cookies expire, server sessions are revoked, feature flags change, and role permissions drift. Generate storage state for each role the suite needs, and avoid sharing one powerful admin account across unrelated tests.

| Auth pattern | Use when | Risk | Safer refinement |
|---|---|---|---|
| One shared user state | Small smoke suite | Tests mutate same account | Reset account or use worker users |
| Role-specific storage files | App has customer, admin, support roles | More setup time | Generate only roles needed by projects |
| API-created session | Auth API supports test sessions | Can bypass UI login coverage | Keep one UI login smoke test |
| Worker-specific accounts | Tests mutate profile or settings | Account pool management | Allocate by worker index |
| Fresh login per test | Highly sensitive flows | Slow | Reserve for auth-critical paths |

When tests mutate account-level state, use worker-specific users. Otherwise, a retry can inherit a changed preference, dismissed modal, or exhausted quota from a previous test. Global setup should not force every test to share the same mutable identity.

\`\`\`ts
import { test as base } from '@playwright/test';

type AuthFixtures = {
  accountEmail: string;
};

export const test = base.extend<AuthFixtures>({
  accountEmail: [
    async ({}, use, workerInfo) => {
      const prefix = process.env.CI_RUN_ID ?? 'local';
      await use(['qa', prefix, String(workerInfo.workerIndex), '@example.test'].join(''));
    },
    { scope: 'worker' },
  ],
});
\`\`\`

This pattern does not require global setup to know every worker's data. It lets the worker own the mutable account boundary while global setup handles only stable prerequisites.

## Seed Data Through APIs, Not Hidden UI Clicks

Use API setup for data that is not itself under UI test. If a checkout test needs a product, create the product through a test API or fixture builder rather than clicking through an admin screen in global setup. UI setup is slow, fragile, and hard to diagnose when it runs outside normal test reporting.

\`\`\`ts
type SeedProduct = {
  sku: string;
  name: string;
  priceCents: number;
};

export async function createProduct(baseURL: string, product: SeedProduct) {
  const response = await fetch(new URL('/test-api/products', baseURL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    throw new Error(\`Could not seed product \${product.sku}: \${response.status}\`);
  }

  return response.json() as Promise<SeedProduct>;
}
\`\`\`

Keep test APIs behind environment controls and non-production credentials. A test API that creates products or users should never be reachable from production traffic. If your organization cannot expose a test API, use direct database fixtures in isolated environments, but keep the fixture code explicit and versioned.

## Make Teardown Idempotent

Global teardown runs after the suite finishes, including failure scenarios, but it can still fail because resources are already gone, network calls time out, or credentials were revoked. Teardown should be idempotent: deleting a missing resource is success, and cleanup retries should not corrupt unrelated environments.

\`\`\`ts
import fs from 'node:fs/promises';

type RunState = {
  sandboxId?: string;
};

export default async function globalTeardown() {
  const raw = await fs.readFile('playwright/.state/run.json', 'utf8').catch(() => '{}');
  const state = JSON.parse(raw) as RunState;

  if (!state.sandboxId) {
    return;
  }

  const response = await fetch(\`https://sandbox.example.test/\${state.sandboxId}\`, {
    method: 'DELETE',
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(\`Sandbox cleanup failed: \${response.status}\`);
  }
}
\`\`\`

Notice what this teardown does not do: it does not delete per-test records required for test independence. Tests should clean up or namespace their own mutable data. Global teardown is for suite-owned resources such as sandboxes, tunnels, temporary environments, and generated state files.

## Store Setup Artifacts Where CI Can Collect Them

Setup and teardown become easier to debug when they produce small artifacts: run metadata, auth storage file names, seeded resource IDs, environment URLs, and cleanup results. Do not dump secrets. Do include enough context to connect a failure to a resource.

\`\`\`json
{
  "baseURL": "https://pr-421.example.test",
  "runId": "421-7",
  "authFiles": [
    "playwright/.auth/customer.json",
    "playwright/.auth/admin.json"
  ],
  "sandboxId": "sandbox-421-7",
  "createdAt": "2026-08-07T04:00:00.000Z"
}
\`\`\`

Add these files to CI artifacts with short retention. If a global setup failure prevents tests from running, the artifact may be the only structured evidence available.

\`\`\`yaml
name: playwright

on:
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-state
          path: |
            playwright/.state
            playwright/.auth
            playwright-report
            test-results
\`\`\`

Artifact upload should run with \`if: always()\` so setup failures and teardown failures still leave evidence.

## Avoid Global Setup for Mutable Business Scenarios

What people get wrong is treating global setup like a before-all hook for the entire product. They create one customer, one cart, one subscription, one invoice, and one notification, then every test reads and mutates those objects. The suite passes locally because it runs in a stable order. It fails in CI because tests run in parallel, retries start halfway through, and cleanup from one file affects another file.

Use global setup for stable preconditions. Use fixtures for scenario data. If the test asserts invoice status, create that invoice in the test or a test-scoped fixture. If the test asserts a user preference, give the worker its own user or reset the preference in setup. If the test asserts a report export, namespace the export destination by test ID.

| Data type | Recommended scope | Reason |
|---|---|---|
| Country list or currency table | Global or migration seed | Static reference data |
| Login session file | Setup project or global setup | Expensive and reusable when account is read-only |
| Cart with items | Test fixture | Tests mutate cart state |
| Tenant for worker | Worker fixture | Shared safely by tests in one worker |
| Admin audit event | Test fixture | Assertions depend on exact event list |
| Temporary sandbox URL | Global setup and teardown | Suite-owned external resource |

The pattern keeps failures local. A cart test failing should not require reading global setup logs to know which item was present.

## Use Environment Validation to Fail Fast

Global setup is a good place to validate the target environment before launching dozens of browser workers. Check that the base URL is configured, the app is healthy, required feature flags are in the intended state, and test credentials are present. Fail with a clear message before the suite creates noisy secondary failures.

\`\`\`ts
type RequiredEnv = {
  name: string;
  secret?: boolean;
};

const requiredEnv: RequiredEnv[] = [
  { name: 'BASE_URL' },
  { name: 'TEST_USER_PASSWORD', secret: true },
  { name: 'TEST_ADMIN_PASSWORD', secret: true },
];

export function assertRequiredEnv() {
  const missing = requiredEnv
    .filter((item) => !process.env[item.name])
    .map((item) => item.name);

  if (missing.length > 0) {
    throw new Error(\`Missing required test environment variables: \${missing.join(', ')}\`);
  }
}
\`\`\`

Do not print secret values while validating. Print variable names and whether the environment is ready. The goal is fast diagnosis, not more exposure.

## Project Dependencies Versus globalSetup

Both tools are useful. Choose based on observability and scope. A setup project shines when the setup itself uses Playwright browser actions or should produce traces. \`globalSetup\` shines when the setup uses APIs, filesystem, or external orchestration and does not need Playwright fixtures.

| Need | Better option | Why |
|---|---|---|
| Log in through UI and save storage state | Setup project | Normal traces, fixtures, retries, reporter output |
| Verify target health before all tests | \`globalSetup\` | Fast API check before workers start |
| Create a cloud sandbox once | \`globalSetup\` plus \`globalTeardown\` | Suite-owned resource lifecycle |
| Seed per-worker users | Worker fixture | Avoid shared mutable accounts |
| Seed per-test order data | Test fixture | Keeps assertions independent |
| Debug setup with screenshots | Setup project | Browser artifacts are first-class |

If a setup step starts as \`globalSetup\` and grows browser interactions, move it to a setup project. If a setup project only calls APIs and writes metadata, consider moving it to \`globalSetup\` to reduce browser overhead.

## Diagnose a Failure in globalSetup

A realistic failure: the suite fails before running any tests because \`globalSetup\` cannot save storage state. The cause may be expired credentials, a changed login form, an environment outage, or a file permission issue. If the setup uses a raw browser launched manually, you may get only a stack trace.

Diagnose by splitting the problem. First, validate required environment variables. Second, call the health endpoint. Third, if login is involved, move login to a setup project so Playwright captures trace artifacts. Fourth, write setup state after each successful major step so you know how far it got. Fifth, ensure the auth directory exists before writing storage state.

\`\`\`ts
import fs from 'node:fs/promises';

export async function recordSetupStep(step: string, status: 'ok' | 'failed') {
  await fs.mkdir('playwright/.state', { recursive: true });
  const line = JSON.stringify({
    step,
    status,
    at: new Date().toISOString(),
  });
  await fs.appendFile('playwright/.state/setup-events.jsonl', line + String.fromCharCode(10));
}
\`\`\`

In normal source code, a regular newline escape is fine.

## Keep Parallelism and Retries in the Design

Global setup runs before tests, but Playwright tests may execute with multiple workers and retries. Any setup artifact consumed by many workers must either be read-only or safe to mutate concurrently. Storage state for a read-only customer can be shared. A customer account whose settings tests modify cannot be shared. A database seed used only for lookup can be shared. A queue consumed by workers cannot be shared without namespacing.

| Artifact | Shared across workers? | Retry-safe? | Recommendation |
|---|---|---|---|
| Static auth state for read-only smoke user | Usually | Usually | Refresh in setup project |
| Admin account used to create records | Risky | Risky | Use API fixtures or worker accounts |
| Reference product catalog | Yes | Yes if immutable | Seed once per environment |
| Inbox for email assertions | No | Often no | Namespace by test or worker |
| Feature flag defaults | Yes | Yes if tests do not mutate | Reset in setup or isolate project |
| Temporary files | Depends | Depends | Put under run-specific directory |

Retries are the forcing function. If a retry starts with polluted state from the first attempt, the test is not isolated. Global setup cannot rescue that. The test or worker fixture must own reset behavior.

## A Minimal Pattern That Scales

A maintainable Playwright suite often ends up with this shape: \`globalSetup\` validates environment and creates suite-owned external resources, a setup project performs UI login and saves role-specific storage state, worker fixtures allocate mutable users or tenants, test fixtures create business records, and \`globalTeardown\` deletes suite-owned resources. Each layer has a clear lifetime.

\`\`\`text
globalSetup
  validate environment
  create sandbox
  write run metadata

setup project
  authenticate roles
  save storage state

worker fixtures
  allocate tenant
  allocate mutable user

test fixtures
  create order
  create invoice
  reset feature state

globalTeardown
  delete sandbox
  write cleanup result
\`\`\`

That structure is not more ceremony for its own sake. It keeps the expensive work high in the stack and the mutable work low in the stack, where failures are easiest to explain.

Local reproducibility should be part of the pattern. A developer should be able to run the setup project alone, inspect the generated storage state path, and rerun one failing spec without manually recreating a hidden CI-only database or sandbox. That does not mean every cloud dependency must run locally, but it does mean setup code should fail with clear missing-environment messages and offer a documented local fallback where the product supports one. The worst setup design is one that only works inside CI and only fails after all browser workers have started. The best design exposes a small number of commands: validate environment, create state, run selected tests, and clean up state.

Also treat setup secrets as inputs, not artifacts. Passwords, tokens, cookies, and storage state files should never be printed to logs. Storage state may contain sensitive cookies, so upload it only when your CI permissions and retention policy allow it. Many teams choose to upload metadata and traces while excluding auth files from artifacts. That tradeoff is usually sensible for pull requests from untrusted forks.

## Frequently Asked Questions

### Should I use globalSetup or a setup project for login?

Use a setup project when login happens through the browser. It gives you normal Playwright tracing, screenshots, fixtures, and reporter output, which are invaluable when a login form or auth provider changes. Use \`globalSetup\` for non-interactive checks and API orchestration. If login can be done through a documented test API, \`globalSetup\` can work, but keep at least one UI login smoke test.

### Can global teardown clean all test data?

It can clean suite-owned resources, but it should not be responsible for making individual tests independent. If one test needs an order, that test or its fixture should create and own the order. Global teardown is better for deleting sandboxes, tunnels, temporary environments, and generated auth files. Broad cleanup at the end hides cross-test coupling because failures already happened before cleanup ran.

### Why do tests pass locally but fail with shared storage state in CI?

CI usually runs more workers, retries, and shards than local development. A shared storage state file may point every worker at the same mutable account, so tests change preferences, dismiss banners, exhaust quotas, or consume notifications that other tests expect. Use read-only accounts for shared storage state. For mutable flows, allocate worker-specific accounts or create fresh state inside test fixtures.

### What should global setup log?

Log the target base URL, run identity, setup steps, generated artifact paths, sandbox IDs, and non-secret configuration decisions. Do not log passwords, tokens, cookies, or full storage state. The goal is enough evidence to diagnose failures before tests start. A small JSON or JSONL state file uploaded as a CI artifact is usually more useful than scattered console messages.
`,
};
