import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Test Project Dependencies Setup for Ordered Setup Projects',
  description: 'Configure playwright test project dependencies setup so auth, data, and browser projects run in order, share storage state, and fail fast when prerequisites break.',
  date: '2026-08-08',
  category: 'Guide',
  content: `
# Playwright Test Project Dependencies Setup for Ordered Setup Projects

Playwright test project dependencies setup is how you declare that one Playwright project must finish successfully before other projects start. You use the \`dependencies\` array on a project in \`playwright.config\` so setup work (authenticate once, seed data, warm caches, install browser-specific prerequisites) runs as its own project, then dependent projects reuse artifacts such as \`storageState\` files. Official documentation for projects lives at https://playwright.dev/docs/test-projects.

This is not the same as \`test.beforeAll\` inside a single file. \`beforeAll\` scopes to a worker and file lifecycle. Project dependencies scope to the whole project graph: Playwright schedules the dependency project first, and only then runs the projects that list it. When the setup project fails, dependents are skipped, which is exactly what you want when authentication is broken. When setup passes, dozens of browser projects can share one login instead of signing in on every file.

QA engineers adopting multi-project configs often copy a snippet, commit a \`storageState\` path, and still see flaky logins because the dependency edge is missing, the setup project is included in the default shard incorrectly, or teardown never runs. This guide walks through a production-shaped graph: setup auth, optional data seed, chromium/firefox/webkit consumers, teardown, CLI filtering gotchas, CI sharding, and failure diagnosis. For ecosystem context on runners, see the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026). When dependent UI tests flake on selectors rather than auth, tighten locators with the [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026).

## Start from the problem project dependencies solve

Without dependencies, teams reach for one of three anti-patterns:

1. **Login in every test** with UI steps: slow, flaky, hammering identity providers.
2. **Global setup module** only: works for one shared state, harder to express multiple parallel setup lanes (admin vs user) as first-class projects.
3. **External shell scripts** before \`npx playwright test\`: easy to forget locally, diverge from CI, and skip Playwright reporting.

Project dependencies keep setup inside Playwright's runner: traces, reports, retries, and failure artifacts apply to setup tests too. You see a red setup project in the HTML report instead of a mysterious empty \`storageState\` file.

| Approach | Ordering guarantee | Shares Playwright report | Good for |
|---|---|---|---|
| Project \`dependencies\` | Runner enforces graph | Yes | Auth, seed, browser matrix |
| \`globalSetup\` export | Runs once before tests | Limited (not a test project) | Process-level services |
| \`beforeAll\` hooks | Per worker/file | Yes | File-local fixtures |
| CI step before Playwright | YAML enforces only in CI | No | Building apps, starting servers |

Use \`globalSetup\` when you must start a server or container once. Use project dependencies when setup is itself a test that produces artifacts for other tests.

## Map a minimal dependency graph that teams actually ship

A common graph:

1. \`setup\` project runs \`tests/auth.setup.ts\`, writes \`playwright/.auth/user.json\`.
2. \`chromium\`, \`firefox\`, and \`webkit\` projects depend on \`setup\` and load that storage state.
3. Optional \`setup-admin\` produces a second storage file for privileged suites.
4. Optional \`teardown\` project listed in \`teardown\` on the setup project cleans data.

\`\`\`ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\\.setup\\.ts/,
      teardown: "teardown",
    },
    {
      name: "teardown",
      testMatch: /.*\\.teardown\\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
    },
    {
      name: "firefox",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Firefox"],
        storageState: "playwright/.auth/user.json",
      },
    },
    {
      name: "webkit",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Safari"],
        storageState: "playwright/.auth/user.json",
      },
    },
  ],
});
\`\`\`

Key details:

- \`testMatch\` on setup limits which files run in that project so your login setup does not run three times under chromium/firefox/webkit.
- Consumer projects must not match setup files. Default \`testMatch\` is typically \`.*(test|spec)\\.(js|ts|mjs)\` style patterns; keep setup named \`*.setup.ts\` so it is excluded from normal projects, or set \`testIgnore\` explicitly.
- \`dependencies: ["setup"]\` is an array of **project names**, not file paths.

## Write an auth setup test that produces storageState

Setup files use the same \`test\` API. They are tests. Assert that login worked before writing state.

\`\`\`ts
import { test as setup, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const authFile = path.join("playwright", ".auth", "user.json");

setup("authenticate as standard user", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_USER_EMAIL || "user@example.com");
  await page.getByLabel("Password").fill(process.env.E2E_USER_PASSWORD || "correct-horse-battery");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page).toHaveURL(/dashboard|home|app/i);

  await page.context().storageState({ path: authFile });
});
\`\`\`

Never commit real production passwords. Use CI secrets and local \`.env\` files ignored by git. Commit a **placeholder path** and directory \`.gitkeep\` if you want, not live session cookies.

For admin lanes:

\`\`\`ts
import { test as setup, expect } from "@playwright/test";
import path from "node:path";

const adminFile = path.join("playwright", ".auth", "admin.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL || "admin@example.com");
  await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD || "admin-correct-horse");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  await page.context().storageState({ path: adminFile });
});
\`\`\`

Wire a second setup project or a second test in the setup project. If both live in one project, they run according to that project's parallelism settings. If admin setup must finish before admin suites only, prefer a dedicated \`setup-admin\` project name so non-admin suites do not wait on it.

## Layer data seed projects when auth alone is not enough

Some suites need deterministic records (a draft invoice, a feature flag user). You can chain:

\`\`\`ts
projects: [
  { name: "setup-auth", testMatch: /auth\\.setup\\.ts/ },
  {
    name: "setup-data",
    dependencies: ["setup-auth"],
    testMatch: /data\\.setup\\.ts/,
    use: { storageState: "playwright/.auth/user.json" },
  },
  {
    name: "chromium",
    dependencies: ["setup-data"],
    use: {
      ...devices["Desktop Chrome"],
      storageState: "playwright/.auth/user.json",
    },
  },
]
\`\`\`

Data setup test sketch:

\`\`\`ts
import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";

setup("seed draft invoice for e2e user", async ({ request }) => {
  const state = JSON.parse(fs.readFileSync("playwright/.auth/user.json", "utf8"));
  // Prefer API seeding when available; faster and less UI flake than clicking through wizards
  const response = await request.post("/api/e2e/seed/invoice", {
    data: { status: "draft", externalKey: "e2e-draft-invoice" },
    headers: {
      // Example only: many apps use cookies from storageState automatically on APIRequestContext when configured
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  fs.writeFileSync(
    "playwright/.auth/seed.json",
    JSON.stringify({ invoiceId: body.id }, null, 2),
    "utf8"
  );
});
\`\`\`

Consumers read \`seed.json\` for IDs. Keep seed keys stable so tests do not need regex scavenger hunts through emails.

## Control which files each project executes

Misconfigured \`testMatch\` is the top cause of "setup ran twelve times" or "storageState missing because setup never ran."

| Project | Should run | Should ignore |
|---|---|---|
| setup | \`*.setup.ts\` | Normal \`*.spec.ts\` |
| teardown | \`*.teardown.ts\` | Everything else |
| chromium/firefox/webkit | \`*.spec.ts\` / \`*.test.ts\` | setup and teardown files |
| admin | specs tagged or under \`tests/admin\` | standard user specs if separated |

Explicit ignore example:

\`\`\`ts
{
  name: "chromium",
  dependencies: ["setup"],
  testIgnore: [/.*\\.setup\\.ts/, /.*\\.teardown\\.ts/],
  use: {
    ...devices["Desktop Chrome"],
    storageState: "playwright/.auth/user.json",
  },
}
\`\`\`

Also consider \`testDir\` per project when folders cleanly separate setup from tests. Folder separation is often clearer for large repos than regex alone.

## Understand teardown project wiring

Playwright supports a \`teardown\` property on a project that names another project to run after dependents finish. Use it to delete seeded rows or revoke sessions.

\`\`\`ts
{
  name: "setup",
  testMatch: /.*\\.setup\\.ts/,
  teardown: "teardown",
},
{
  name: "teardown",
  testMatch: /.*\\.teardown\\.ts/,
}
\`\`\`

\`\`\`ts
import { test as teardown } from "@playwright/test";
import fs from "node:fs";

teardown("revoke e2e sessions and delete seed data", async ({ request }) => {
  if (fs.existsSync("playwright/.auth/seed.json")) {
    const seed = JSON.parse(fs.readFileSync("playwright/.auth/seed.json", "utf8"));
    await request.delete(\`/api/e2e/seed/invoice/\${seed.invoiceId}\`);
  }
  // Optional: delete auth files so the next local run cannot reuse expired cookies silently
  for (const file of ["playwright/.auth/user.json", "playwright/.auth/seed.json"]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});
\`\`\`

Teardown should be resilient: if seed creation failed midway, teardown still exits cleanly when files are missing. Avoid hard failures that hide the original setup error in noisy logs.

## CLI filtering interactions people get wrong

**What people get wrong:** running \`npx playwright test --project=chromium\` and assuming setup is skipped forever without consequences, or the opposite, assuming dependencies never run when filtering.

Playwright runs dependency projects when needed for the selected projects. If you select only \`chromium\`, setup still runs because chromium depends on it. If you select only \`setup\`, consumers do not run. If you use file filters that match only a consumer spec, setup should still run when the consumer project depends on it.

Still verify on your Playwright version with a dry run:

\`\`\`bash
npx playwright test --list
npx playwright test --project=chromium --list
npx playwright test tests/billing/invoice.spec.ts --list
\`\`\`

Inspect the list for setup titles. If setup is missing from the plan while consumer tests appear, storage state will be stale or absent.

Title filtering in Playwright uses \`--grep\` (short form \`-g\`). Do not reach for \`-t\` / \`--testNamePattern\` here: those are Vitest flags, and Playwright will not accept them. Example:

\`\`\`bash
npx playwright test --project=chromium --grep "invoice draft"
\`\`\`

Setup tests have different titles; they still run as project dependencies even when \`--grep\` filters consumer tests, depending on runner behavior for your version. Confirm with \`--list\` when building CI templates. When in doubt, keep setup titles out of overly broad regex filters that might accidentally exclude them if someone applies patterns at the wrong layer.

## Diagnose the classic missing storageState failure

**Failure mode:** Chromium tests fail in \`beforeEach\` or on first navigation with redirects to \`/login\`. The HTML report shows consumer errors only. On disk, \`playwright/.auth/user.json\` is missing or contains an empty cookies array.

**Diagnosis checklist:**

1. Did the setup project run? Open the report and look for the setup project column/section.
2. Did setup fail assertions? A failed setup skips dependents; fix login first.
3. Is \`storageState\` path identical between setup write and consumer \`use.storageState\`?
4. Is CI uploading artifacts from a different working directory than the path you wrote?
5. Are tests sharded such that setup runs on shard 0 only while shard 3 expects the file without sharing artifacts?
6. Did someone add \`storageState: undefined\` overrides in a nested fixture?

**Sharding insight:** Project dependencies do not magically share filesystem artifacts across machines. If you use multiple CI jobs as shards, either:

- Run setup in a prior job and stash \`playwright/.auth/*.json\` as artifacts for all shards, or
- Let each shard run setup independently (simpler, more login load), or
- Use Playwright's built-in sharding in one job where the workspace is shared.

Illustrative CI pattern with artifact reuse:

\`\`\`yaml
jobs:
  e2e-setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      # --no-deps stops the paired teardown project from deleting playwright/.auth
      # before the upload step runs.
      - run: npx playwright test --project=setup --no-deps
        env:
          E2E_USER_EMAIL: \${{ secrets.E2E_USER_EMAIL }}
          E2E_USER_PASSWORD: \${{ secrets.E2E_USER_PASSWORD }}
          BASE_URL: \${{ vars.BASE_URL }}
      - uses: actions/upload-artifact@v4
        with:
          name: playwright-auth
          path: playwright/.auth/
          retention-days: 1

  e2e-tests:
    needs: e2e-setup
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1/3, 2/3, 3/3]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - uses: actions/download-artifact@v4
        with:
          name: playwright-auth
          path: playwright/.auth/
      # --no-deps makes the downloaded artifact the only source of auth state.
      # Without it every shard reruns the setup project and the artifact is moot.
      - run: npx playwright test --project=chromium --no-deps --shard=\${{ matrix.shard }}
        env:
          BASE_URL: \${{ vars.BASE_URL }}
\`\`\`

If each shard runs setup itself, omit the artifact job and keep \`dependencies\` inside a single \`playwright test\` invocation per shard. That model is often easier until login rate limits hurt.

## Parallelism, workers, and setup uniqueness

Setup projects often should not fan out across many workers in ways that race on the same output file. Prefer a single setup test writing one file, or distinct files per persona. If you enable fully parallel mode globally, ensure setup tests that write the same path cannot interleave destructively.

| Scenario | Recommendation |
|---|---|
| One user storage file | One setup test, one writer |
| User + admin | Two files, two setup tests or projects |
| Per-shard unique users | Template files with shard index in env |
| Parallel setup tests writing one path | Do not; you will corrupt JSON |

Reading storage state in consumers is safe concurrently. Writing is the dangerous part.

## Local developer experience

Developers hate waiting for full setup when iterating on a single spec if login already succeeded five minutes ago. Options:

1. **Commit nothing; cache locally:** Re-run setup only when auth expires.
2. **Script \`npm run test:e2e:auth\`** that runs \`--project=setup\` only.
3. **Document cookie lifetime** so people know when to refresh.
4. **Avoid checked-in live storageState** with secrets.

\`\`\`bash
# Refresh auth only
npx playwright test --project=setup

# Run one file against chromium after auth exists
npx playwright test tests/billing/invoice.spec.ts --project=chromium
\`\`\`

Add a preflight check in consumer tests for clearer errors:

\`\`\`ts
import fs from "node:fs";
import { test, expect } from "@playwright/test";

test.beforeAll(() => {
  if (!fs.existsSync("playwright/.auth/user.json")) {
    throw new Error(
      "Missing playwright/.auth/user.json. Run: npx playwright test --project=setup"
    );
  }
});

test("creates invoice from draft", async ({ page }) => {
  await page.goto("/invoices");
  await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
});
\`\`\`

This fails with an actionable message when someone bypasses the graph incorrectly.

## Multi-persona graphs without combinatorial explosion

A naive matrix of (role x browser x locale) explodes. Split concerns:

- Setup projects for personas (user, admin, empty-org).
- Browser projects depend on the persona they need.
- Locale projects can reuse the same storage if localization does not require separate accounts.

\`\`\`ts
projects: [
  { name: "setup-user", testMatch: /user\\.setup\\.ts/ },
  { name: "setup-admin", testMatch: /admin\\.setup\\.ts/ },
  {
    name: "user-chromium",
    dependencies: ["setup-user"],
    testMatch: /tests\\/user\\/.*\\.spec\\.ts/,
    use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/user.json" },
  },
  {
    name: "admin-chromium",
    dependencies: ["setup-admin"],
    testMatch: /tests\\/admin\\/.*\\.spec\\.ts/,
    use: { ...devices["Desktop Chrome"], storageState: "playwright/.auth/admin.json" },
  },
]
\`\`\`

Folder-based \`testMatch\` keeps the graph readable. Name projects so CI logs show intent.

## Combining webServer with dependency projects

\`playwright.config\` can start the app via \`webServer\`. Setup projects use the same \`baseURL\`. Ensure the server is ready before setup login hits it.

\`\`\`ts
export default defineConfig({
  webServer: {
    command: "npm run start:e2e",
    url: "http://127.0.0.1:3000/health",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  // projects as above
});
\`\`\`

If setup fails with connection refused, you have a server readiness problem, not a dependencies problem. Do not "fix" it by removing dependencies.

## Tracing and debugging setup failures

Enable traces on setup failures. Setup is the worst place for silent flakes because every dependent goes red or skipped.

\`\`\`ts
{
  name: "setup",
  testMatch: /.*\\.setup\\.ts/,
  use: {
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  teardown: "teardown",
}
\`\`\`

When an AI coding agent "refactors" the login form locators, setup breaks first. That is desirable. Point agents at role-based locators and stable labels so setup is not coupled to CSS modules. Ready-made QA skills from qaskills.sh via the qaskills CLI can help scaffold project graphs, but you still must align paths and secrets with your app.

## Compare dependencies to fixtures for auth

Playwright fixtures can also provide an authenticated page. Project dependencies plus storageState scale better for large suites because login happens once per project run, not once per worker bootstrap, depending on how you structure fixtures. Worker-scoped fixtures that login per worker multiply IdP traffic by worker count. Storage state from a setup project amortizes that cost.

| Pattern | Login frequency | Complexity | Best fit |
|---|---|---|---|
| Per-test UI login | Highest | Low | Tiny suites |
| Worker-scoped auth fixture | Per worker | Medium | Medium suites, dynamic users |
| Setup project + storageState | Once per graph (or per shard job) | Medium | Large browser matrices |
| API token injection | Once + header set | Medium | Apps with simple token auth |

You can combine patterns: setup writes storage state, fixtures read extra seed IDs from disk.

## Failure mode: teardown deletes data while retries still run

If a consumer test fails and retries, teardown must not run in the middle of the project graph. Playwright schedules teardown after the dependent projects complete their run for that graph edge. Still, be careful with external cleanup cron jobs that race CI. Scope seed data with unique keys per CI pipeline ID so parallel pipelines do not delete each other's rows.

\`\`\`ts
const pipeline = process.env.CI_PIPELINE_ID || "local";
const externalKey = \`e2e-draft-invoice-\${pipeline}\`;
\`\`\`

When writing shell in CI that concatenates IDs, remember to brace variables so underscores do not glue names incorrectly: use forms like \`"\${CI_PIPELINE_ID}_\${CI_NODE_INDEX}"\` in shell, not unbraced adjacent expansions.

## Migration plan from globalSetup to projects

1. Create \`tests/auth.setup.ts\` moving login logic out of \`globalSetup\`.
2. Add setup project without removing globalSetup yet.
3. Point one consumer project at the new storage path.
4. Run CI for a few days with dual paths if needed.
5. Remove dual login from globalSetup; keep globalSetup only for servers if required.
6. Add teardown and second personas once the first lane is stable.

Do not migrate all personas and browsers in one PR. The graph is easier to debug when grown incrementally.

## Checklist before you merge a dependency graph

| Check | Pass criteria |
|---|---|
| Setup appears in HTML report | Separate project with green tests |
| Consumer first test hits authenticated view | No unexpected \`/login\` redirect |
| Paths match | Write path === \`use.storageState\` |
| Setup files excluded from browser projects | \`--list\` shows setup tests only under setup |
| Secrets present in CI | Login assertion passes in setup |
| Shards share or rebuild auth intentionally | No missing file on shard 2 |
| Teardown idempotent | Second run does not crash if seed absent |
| Local docs updated | README snippet with refresh command |

## Putting playwright test project dependencies setup into daily practice

Treat setup projects as production code: flaky selectors there are release blockers. Keep login flows aligned with the real product, prefer API-based seeding after auth, and make storage paths boring and consistent. Use dependencies to express the graph, not to build a maze of twelve hidden prerequisites. The ideal graph is obvious from \`playwright.config\` alone: setup, maybe data, browsers, teardown.

When something breaks, read the report from the left of the graph, not the right. A wall of chromium failures after a red setup is one bug, not fifty. That operational habit is the real payoff of playwright test project dependencies setup.

## Frequently Asked Questions

### Do project dependencies replace Playwright globalSetup?

No. They solve different layers. Project dependencies are projects in the test graph that produce artifacts and appear in reports. \`globalSetup\` is a module Playwright runs before the test run for process-level work such as starting external services or creating a one-off environment. Many codebases use both: globalSetup boots the stack, setup projects authenticate and seed, consumer projects exercise UI. If you only need a single login and no project matrix, globalSetup can still be enough, but multi-browser reuse usually favors setup projects plus storageState.

### Why do my consumer tests still redirect to login after a green setup project?

Common causes include mismatched storageState paths, writing state from a different browser context than you think, cookies scoped to a host that does not match \`baseURL\`, expired sessions when reusing an old file, or CI shards that never downloaded the setup artifact. Open the JSON file and confirm cookies exist for the expected domain. Align \`baseURL\` hosts with cookie domains (localhost versus 127.0.0.1 is a classic trap). Re-run setup only after confirming the login assertion still reflects the current UI.

### Can one project depend on multiple setup projects?

Yes. The \`dependencies\` field is an array of project names. Playwright waits for those listed projects to finish successfully before starting the dependent project. Use this when a suite needs both user auth and a data seed project, or both user and admin states if a scenario truly requires two artifacts. Keep the graph shallow when possible. Deep chains of optional setups become hard to reason about in CI logs and slow down feedback when only one branch is needed.

### How should I shard CI when setup writes auth files to disk?

Pick an explicit model. Either run setup in each shard job so every machine creates its own auth files, or run setup once in a prerequisite job and pass artifacts to all shards. The first model is simple and avoids artifact plumbing; the second reduces login load on shared identity providers. Project dependencies alone do not transfer files across machines. Document the chosen model next to your workflow YAML so agents and humans do not "optimize" sharding by dropping setup and assuming a committed storageState file exists.
`,
};
