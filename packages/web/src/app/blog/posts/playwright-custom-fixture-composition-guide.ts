import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Custom Fixture Composition Guide for Scalable Test Suites',
  description: 'Use this playwright custom fixture composition guide to build typed fixtures, prevent hidden coupling, and make AI-assisted Playwright tests easier to scale.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Playwright Custom Fixture Composition Guide for Scalable Test Suites

A practical Playwright custom fixture composition guide starts with one rule: fixtures should describe test capabilities, not become a hidden application framework. Compose fixtures when they remove repeated setup, make state ownership explicit, and give test authors a typed, stable surface. Do not compose them just because every helper can technically be injected through Playwright's \`test.extend\`.

For QA engineers using AI coding agents, fixture design matters more than usual. Agents are good at following visible contracts and bad at guessing invisible lifecycle constraints. A suite with clear fixtures lets an agent create a logged-in page, an API client, or seeded data without copying login flows into every spec. A suite with tangled fixtures produces fragile tests that pass locally, fail under parallel workers, and hide the real reason in a setup phase nobody reads.

The workflow below shows how to compose custom Playwright fixtures around roles, API clients, page objects, seeded records, and diagnostics. It also explains worker scope versus test scope, how to avoid fixture dependency cycles, and how to diagnose the common failure mode where a fixture succeeds but leaves the test in a polluted state.

## Start fixture composition with ownership, not convenience

Before writing a fixture, decide who owns the state it creates and when that state must be removed. Playwright's fixture model is powerful because each fixture can declare dependencies, perform setup, call \`await use(value)\`, and then clean up. That lifecycle is also where teams create confusion. A fixture that logs in, creates a project, mutates feature flags, and returns a dashboard page is not one fixture. It is a bundle of unrelated ownership decisions.

Use a small inventory before adding a fixture. The inventory should name the capability, its scope, its cleanup policy, and the risk of sharing it across tests.

| Capability | Good fixture boundary | Scope to prefer | Cleanup responsibility |
|---|---|---|---|
| Authenticated browser state | A page or context already representing one role | Test scope unless state is read-only | Context closes automatically, server data stays separate |
| API client | Thin client configured with base URL and credentials | Worker scope if token is stable | No cleanup, but requests must include test identifiers |
| Seeded entity | One record or graph needed by a scenario | Test scope | Fixture deletes or marks test-owned data |
| Page object | Navigation and locators for one screen | Test scope | No server cleanup, relies on page lifecycle |
| External fake | Test-specific sink for email, webhooks, or events | Test scope for assertions, worker scope for process | Fixture resets only the current test channel |

The table exposes an important distinction. A fixture can return a convenient object, but the harder question is whether it owns browser state, server state, or only a typed wrapper. Browser state is cheap to isolate. Server state is where parallel test suites get burned. If a fixture creates shared records in a worker and individual tests mutate them, the tests are coupled even if the TypeScript types look clean.

Here is a minimal directory layout that keeps fixture layers readable:

\`\`\`text
tests/
  fixtures/
    base-test.ts
    auth-fixtures.ts
    api-fixtures.ts
    project-fixtures.ts
    page-fixtures.ts
  pages/
    dashboard-page.ts
    project-page.ts
  support/
    test-ids.ts
  specs/
    project-permissions.spec.ts
\`\`\`

The layout is not a rule, but it makes dependencies visible. Auth fixtures should not import page fixtures that import project fixtures that import auth fixtures again. When each file has one reason to exist, cycles become easier to spot during review. AI coding agents also perform better when they can inspect a small fixture file and see the public contract quickly.

## Build a narrow base test first

Every composition chain needs a base. Start from Playwright's \`test\`, add only shared test infrastructure, and export \`expect\` from the same module so specs import from one place. The base should not know about application roles or business entities. Its job is to provide boring, universal utilities such as a unique test ID, a consistent annotation helper, or a logger bound to the current test.

\`\`\`ts
import { test as base, expect } from '@playwright/test';

type BaseFixtures = {
  testRunId: string;
  note: (message: string) => Promise<void>;
};

export const test = base.extend<BaseFixtures>({
  testRunId: async ({}, use, testInfo) => {
    const safeTitle = testInfo.title.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    await use([testInfo.workerIndex, Date.now(), safeTitle].join('-'));
  },

  note: async ({}, use, testInfo) => {
    await use(async (message: string) => {
      testInfo.annotations.push({ type: 'note', description: message });
    });
  },
});

export { expect };
\`\`\`

This fixture uses documented Playwright concepts: \`test.extend\`, \`testInfo\`, annotations, and worker index. It intentionally avoids browser work. That keeps it safe as the root for every later fixture. If a future helper needs a database connection, feature flag client, or authenticated browser, it belongs in a more specific layer.


## Compose role fixtures without hiding login behavior

Role fixtures are the most common place to overreach. A good role fixture answers a precise question: what role is this browser page using? It should not silently create every business object the test might need. If the role requires saved storage state, keep the storage-state generation separate from test-level page composition.

The following example creates three page fixtures from existing storage-state files. Each fixture creates its own browser context and page, then closes the context after the test. That prevents cookies, local storage, and page-level mutations from leaking between tests.

\`\`\`ts
import { test as base } from './base-test';

type RoleFixtures = {
  adminPage: import('@playwright/test').Page;
  editorPage: import('@playwright/test').Page;
  viewerPage: import('@playwright/test').Page;
};

export const test = base.extend<RoleFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  editorPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/editor.json' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  viewerPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'playwright/.auth/viewer.json' });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});
\`\`\`

There is some duplication here, and that is acceptable at first. Premature abstraction in fixture files often creates a helper that hides the important part: each role owns a new context and closes it. Once the pattern stabilizes, extract a small function that returns a page for a role. Keep the fixture names explicit because test authors should see the role in the spec signature.

The role fixture is useful when compared with project-level \`use.storageState\`. Both are valid, but they optimize for different suites.

| Approach | Use it when | Strength | Tradeoff |
|---|---|---|---|
| Project-level storage state | Most specs in a project use one role | Simple config, strong report grouping | Switching roles inside one test is awkward |
| Custom role page fixture | A test needs multiple roles at once | Explicit multi-user scenarios | More fixture code and more contexts |
| Helper that logs in during each test | Login is part of the assertion | Verifies login flow directly | Slow and noisy for ordinary feature tests |
| API-created session fixture | UI login is unstable or expensive | Fast setup and precise role control | Requires supported app endpoint or test hook |

For a broader map of Playwright, Vitest, Jest, and Cypress responsibilities, see the [JavaScript testing frameworks complete guide](/blog/javascript-testing-frameworks-complete-guide-2026). Fixture composition works best when Playwright owns browser behavior and lower-level tools own pure function or component checks.

## Layer API clients under browser fixtures only when the test needs both

API clients make fixtures far more useful because they can seed data, clean data, and inspect state without driving every action through the UI. The danger is letting the API client become a secret second application. UI assertions should still verify user-visible behavior. Use API calls to prepare and observe, not to skip the workflow under test.

Create a thin client fixture that carries the base URL, request context, and test run identifier. Playwright provides an \`request\` fixture for API testing through \`APIRequestContext\`. You can use it directly or wrap it in domain methods.

\`\`\`ts
import { test as base } from './auth-fixtures';

type ProjectPayload = {
  name: string;
  visibility: 'private' | 'team';
};

type ProjectRecord = {
  id: string;
  name: string;
};

type ApiFixtures = {
  projectApi: {
    createProject(payload: ProjectPayload): Promise<ProjectRecord>;
    deleteProject(id: string): Promise<void>;
  };
};

export const test = base.extend<ApiFixtures>({
  projectApi: async ({ request, testRunId }, use) => {
    await use({
      async createProject(payload) {
        const response = await request.post('/api/projects', {
          data: { ...payload, externalTestId: testRunId },
        });

        if (!response.ok()) {
          throw new Error('Project creation failed with status ' + response.status());
        }

        return response.json() as Promise<ProjectRecord>;
      },

      async deleteProject(id) {
        const response = await request.delete('/api/projects/' + id);
        if (!response.ok() && response.status() !== 404) {
          throw new Error('Project cleanup failed with status ' + response.status());
        }
      },
    });
  },
});
\`\`\`

This fixture does not create a project by itself. It exposes a capability. That distinction is what keeps composition clean. A test that needs no project pays no setup cost. A separate fixture can compose \`projectApi\` into a seeded project when many specs need the same arrangement.

\`\`\`ts
import { test as base } from './api-fixtures';

type SeedFixtures = {
  privateProject: { id: string; name: string };
};

export const test = base.extend<SeedFixtures>({
  privateProject: async ({ projectApi, testRunId }, use) => {
    const project = await projectApi.createProject({
      name: 'private-project-' + testRunId,
      visibility: 'private',
    });

    try {
      await use(project);
    } finally {
      await projectApi.deleteProject(project.id);
    }
  },
});
\`\`\`

The \`try\` and \`finally\` block is not decoration. It is the cleanup contract. If an assertion fails, cleanup still runs. If cleanup fails, Playwright reports the fixture teardown error. In CI, that is better than silently leaving records that contaminate the next run.

## Keep page objects injectable but not magical

Page objects pair naturally with fixtures, but they should stay close to Playwright's locator model. They should expose task-oriented methods and assertions for one screen. They should not cache element handles, sleep for arbitrary time, or decide which user role should be active. The fixture can construct them with the correct page, and the spec can still see which role is being used.

\`\`\`ts
import { expect, type Page } from '@playwright/test';

export class ProjectPage {
  constructor(private readonly page: Page) {}

  async goto(projectId: string) {
    await this.page.goto('/projects/' + projectId);
  }

  async renameTo(name: string) {
    await this.page.getByRole('button', { name: 'Project settings' }).click();
    await this.page.getByLabel('Project name').fill(name);
    await this.page.getByRole('button', { name: 'Save changes' }).click();
  }

  async expectReadOnlyBanner() {
    await expect(this.page.getByText('You have view-only access')).toBeVisible();
  }
}
\`\`\`

Then compose it with role pages in a fixture:

\`\`\`ts
import { test as base } from './project-fixtures';
import { ProjectPage } from '../pages/project-page';

type PageFixtures = {
  adminProjectPage: ProjectPage;
  viewerProjectPage: ProjectPage;
};

export const test = base.extend<PageFixtures>({
  adminProjectPage: async ({ adminPage }, use) => {
    await use(new ProjectPage(adminPage));
  },

  viewerProjectPage: async ({ viewerPage }, use) => {
    await use(new ProjectPage(viewerPage));
  },
});
\`\`\`

This pattern reads cleanly in a spec:

\`\`\`ts
import { test, expect } from '../fixtures/page-fixtures';

test('viewer cannot rename a private project', async ({
  privateProject,
  viewerProjectPage,
}) => {
  await viewerProjectPage.goto(privateProject.id);
  await viewerProjectPage.expectReadOnlyBanner();

  await expect(
    viewerProjectPage['page'].getByRole('button', { name: 'Save changes' }),
  ).toBeHidden();
});
\`\`\`

The last assertion shows a design smell: reaching into a private property means the page object does not expose the assertion the test needs. Fix the page object instead of weakening TypeScript. A better page object would provide \`expectRenameUnavailable\`. This is one of the places AI-generated tests often reveal missing test APIs. Treat that as useful feedback, not as permission to make the fixture return everything.

For locator strategy, pair this fixture approach with [Playwright locator best practices](/blog/playwright-best-practices-locators-2026). Fixtures provide the right page and state. Locators still need accessible roles, labels, and stable user-facing names.

## Choose worker scope only for immutable or resettable resources

Playwright supports test-scoped and worker-scoped fixtures. Test-scoped fixtures are recreated for each test. Worker-scoped fixtures are shared by all tests running in the same worker process. Worker scope can speed up expensive setup, but it also creates the most subtle coupling in a parallel suite.

Use worker scope for immutable resources, long-lived clients, or expensive containers that can be reset between tests. Do not use it for a logged-in page, a mutable project, or a shared user account whose preferences can change. A worker-scoped browser context can hold cookies modified by the first test, and every later test in that worker inherits the mutation.

| Resource | Worker scope safe? | Reasonable condition |
|---|---|---|
| API client wrapper | Usually | It is stateless and attaches per-test IDs to requests |
| Database schema created for one worker | Sometimes | Every test receives a transaction or unique namespace |
| Browser context | Rarely | Only for deliberate stateful journey tests, not independent specs |
| Seed catalog such as countries or plans | Yes | Data is read-only and versioned |
| Feature flag override | Usually not | A test-level override is safer unless reset is guaranteed |

Here is a worker-scoped client paired with a test-scoped namespace. The client is shared. The namespace is not.

\`\`\`ts
import { test as base } from '@playwright/test';

type WorkerFixtures = {
  adminToken: string;
};

type TestFixtures = {
  dataNamespace: string;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  adminToken: [
    async ({}, use) => {
      const response = await fetch(process.env.AUTH_URL + '/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: process.env.E2E_CLIENT_ID,
          clientSecret: process.env.E2E_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error('Could not create admin token');
      }

      const body = await response.json() as { accessToken: string };
      await use(body.accessToken);
    },
    { scope: 'worker' },
  ],

  dataNamespace: async ({}, use, testInfo) => {
    await use('w' + testInfo.workerIndex + '-t' + testInfo.testId);
  },
});
\`\`\`

Notice what the worker fixture returns: a token, not a page with accumulated state. If the token has permissions but no mutable browser storage, it is easier to reason about. If the token's permissions change during a test run, that is a test-environment problem you should detect with a preflight check.

## Put fixture contracts where AI agents can read them

AI coding agents can be productive in a Playwright suite when the fixture contracts are obvious. Give them a small exported type surface, examples of approved imports, and comments only where lifecycle is surprising. Ready-made QA skills can install from qaskills.sh with the qaskills CLI, but the local fixture contract still needs to be clear inside your repository.

A short usage file works better than a long style guide hidden in a wiki:

\`\`\`ts
// tests/fixtures/README.fixture-contract.ts
// This file is documentation by example. It is not imported by tests.

import { test, expect } from './page-fixtures';

test('approved fixture usage example', async ({
  adminProjectPage,
  privateProject,
}) => {
  await adminProjectPage.goto(privateProject.id);
  await expect(adminProjectPage.heading()).toContainText(privateProject.name);
});

// Use projectApi only for setup and observation.
// Use page objects for user-visible behavior.
// Do not call login helpers from ordinary feature specs.
// Do not create worker-scoped browser pages.
\`\`\`

This kind of file gives an agent a runnable-looking pattern without turning production tests into documentation. It also gives reviewers a compact place to update when fixture policy changes. If an agent repeatedly imports \`@playwright/test\` directly instead of your fixture module, add a lint rule or a review check. The mistake is usually not malicious. The contract is simply too hard to discover.

## Diagnose fixture failures by locating the lifecycle phase

When a composed fixture fails, the first question is not “which assertion failed?” The first question is “which lifecycle phase failed?” Setup, handoff, test execution, and teardown produce different symptoms. Treat fixture diagnosis as a timeline.

| Symptom | Likely phase | Diagnostic move | Common fix |
|---|---|---|---|
| Test body never starts | Fixture setup | Add annotations and inspect Playwright report setup error | Fail fast with missing env var or bad seed response |
| First assertion sees wrong user | Fixture handoff | Capture current user from UI and API in the fixture | Use separate contexts and correct storage-state path |
| Only parallel CI fails | Shared state during test | Filter data by test run ID and worker index | Move mutable resource to test scope |
| Test passes but later suites fail | Teardown | Search for leftover records tagged with test ID | Add \`finally\` cleanup or isolated namespace |
| Trace starts after the broken action | Hidden helper outside Playwright | Move setup into a fixture or setup project | Keep browser actions under Playwright reporting |

Add lightweight diagnostics to fixtures when the failure would otherwise be ambiguous. Do not spam every passing test. Attach useful context only when setup creates an entity or assumes a role.

\`\`\`ts
import { test as base } from './page-fixtures';

export const test = base.extend({
  verifiedAdminPage: async ({ adminPage }, use, testInfo) => {
    await adminPage.goto('/me');
    const email = await adminPage.getByTestId('current-user-email').textContent();

    testInfo.annotations.push({
      type: 'admin-user',
      description: email ?? 'unknown',
    });

    if (!email || !email.endsWith('@example.test')) {
      throw new Error('Admin storage state resolved to unexpected user: ' + email);
    }

    await use(adminPage);
  },
});
\`\`\`

This fixture verifies role identity once and leaves a breadcrumb in the report. It does not screenshot every successful setup or log credentials. For sensitive environments, redact emails or attach only the role and account ID. The goal is to make diagnosis faster without creating a new data leak.

## What teams get wrong with fixture composition

The most common mistake is treating fixtures as dependency injection for every helper. Playwright fixtures are test lifecycle tools. If a helper has no lifecycle, no asynchronous setup, and no cleanup, a plain function may be clearer. A domain assertion such as \`expectOrderTotal\` does not need to be a fixture just because it is reused.

The second mistake is using fixtures to hide test intent. This spec signature is too vague:

\`\`\`ts
test('can edit project', async ({ app }) => {
  await app.project.rename('New name');
  await app.project.expectSaved();
});
\`\`\`

The test does not reveal the role, the project source, or whether the browser or API performed the rename. It may be convenient, but it gives reviewers little evidence. A more explicit signature is longer and better:

\`\`\`ts
test('editor can rename a team project', async ({
  editorProjectPage,
  teamProject,
}) => {
  await editorProjectPage.goto(teamProject.id);
  await editorProjectPage.renameTo('Release notes workspace');
  await editorProjectPage.expectName('Release notes workspace');
});
\`\`\`

The third mistake is composing fixtures in the wrong direction. Page fixtures can depend on role pages. Seed fixtures can depend on API clients. Specs can depend on all of them. But API clients should not depend on page objects, and base fixtures should not depend on business entities. Direction keeps the graph acyclic and keeps setup work proportional to the test.

## A migration path for an existing messy suite

Do not rewrite every spec at once. Start by creating a base fixture module, then move one repeated setup pattern at a time. Pick the pattern with the clearest failure cost, usually login, seeded test data, or repeated navigation. Leave old helpers in place until the first composed fixture proves stable in CI.

Use this migration checklist:

| Step | Done when | Risk controlled |
|---|---|---|
| Create base fixture module | New specs import \`test\` and \`expect\` from one local file | Future composition has a stable root |
| Move role setup | One role page fixture replaces copied login in a small group | Auth state no longer drifts by spec |
| Add seeded data fixture | A fixture creates and cleans one entity type | Tests stop sharing mutable records |
| Introduce page object fixture | One page object wraps stable locators | UI tests read as workflows |
| Enforce imports | Direct \`@playwright/test\` imports are flagged in spec folders | New tests follow the contract |

A simple CI check can catch direct imports after migration. Use a script that scans spec files and fails when they bypass the fixture module.

\`\`\`js
import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const offenders = walk('tests')
  .filter((file) => file.endsWith('.spec.ts'))
  .filter((file) => fs.readFileSync(file, 'utf8').includes("from '@playwright/test'"));

if (offenders.length > 0) {
  console.error('Import test from tests/fixtures/page-fixtures instead:');
  for (const file of offenders) console.error(file);
  process.exit(1);
}
\`\`\`

This is intentionally crude. Use ESLint if your project already has it. The point is to protect the convention once the convention exists. Without enforcement, AI-generated specs and hurried human patches will copy old imports from nearby files.

## A complete composed fixture example

The final shape should feel boring. A spec imports from one fixture module, asks for the capabilities it needs, and reads like a user workflow plus a few setup facts.

\`\`\`ts
import { test, expect } from '../fixtures/page-fixtures';

test.describe('project permissions', () => {
  test('admin can rename a private project while viewer cannot', async ({
    adminProjectPage,
    viewerProjectPage,
    privateProject,
  }) => {
    await adminProjectPage.goto(privateProject.id);
    await adminProjectPage.renameTo('Q3 automation plan');
    await adminProjectPage.expectName('Q3 automation plan');

    await viewerProjectPage.goto(privateProject.id);
    await viewerProjectPage.expectReadOnlyBanner();

    await expect(viewerProjectPage.renameButton()).toBeHidden();
  });
});
\`\`\`

The test is not short because it hides everything. It is short because the repeated lifecycle work has names. That is the standard to aim for: explicit capabilities, narrow ownership, and cleanup that does not depend on the assertion path succeeding.

## Frequently Asked Questions

### Should every Playwright helper become a custom fixture?

No. Use a fixture when the helper owns lifecycle: setup, dependency injection, isolation, teardown, or test metadata. Use a plain function for pure assertions, data builders, string formatting, and small actions that do not need Playwright's fixture lifecycle. Over-fixturing makes tests harder to read because the spec signature stops describing meaningful state. A good fixture changes what resources are available to the test. A simple helper just computes or performs a reusable operation.

### Is worker scope safe for authenticated Playwright pages?

Usually no. A worker-scoped page keeps browser state across multiple tests in the same worker, including local storage, cookies, visited routes, and in-app changes. That can be useful for a deliberate stateful journey, but it undermines independent specs. Prefer test-scoped contexts created from storage state. If login is expensive, generate storage state once in a setup project, then create fresh contexts from that file for each test that needs the role.

### How should fixtures clean server data after failures?

Put cleanup after \`await use(value)\` inside a \`finally\` block when the fixture creates server data. Tag created records with a test run identifier so cleanup can target only the current test. Cleanup should tolerate already-deleted records when the UI action under test removes them. If cleanup fails, let the test report show it. Silent cleanup failures create delayed, confusing CI problems that look unrelated to the original spec.

### What fixture guidance should I give AI coding agents?

Give agents one approved import path, one example spec, and a short contract describing which fixtures create state and which only wrap pages or clients. Keep that contract in the repository near the fixtures, not only in a chat prompt. Agents copy nearby patterns, so remove outdated direct imports from \`@playwright/test\` after migration. When an agent reaches into private page-object fields, treat it as a signal that the fixture or page object lacks a needed public assertion.
`,
};
