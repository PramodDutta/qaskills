import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Playwright Fixture Dependency Order with a Practical Example',
  description:
    'Master Playwright fixture dependency order with a realistic database and browser example, predictable teardown, worker scope, and failure-safe cleanup.',
  date: '2026-07-13',
  category: 'Tutorial',
  content: `
# Playwright Fixture Dependency Order with a Practical Example

The invoice test opens a page only after its tenant exists, yet the tenant cannot exist until a worker database has been provisioned. That three-step relationship is exactly what Playwright fixtures are designed to express. The important word is relationship: fixture order comes from declared dependencies, not from the order of properties in an object and not from the order in which names happen to appear in a test signature.

Once a suite has authentication, seeded records, feature flags, and external stubs, accidental setup order becomes expensive. A test may pass alone but fail in parallel because one fixture assumed another had already run. Teardown can be worse: deleting a tenant before closing the page can trigger background requests against data that no longer exists. A dependency graph makes both directions deterministic.

This tutorial builds that graph with real Playwright Test APIs. It also covers lazy fixtures, automatic fixtures, test and worker scope, failures during setup, and a traceable way to prove the actual order rather than guessing it.

## The ordering rule is a graph, not a list

Every fixture has a setup phase before \`await use(value)\` and a teardown phase after it. If fixture \`invoicePage\` requests \`tenant\`, Playwright sets up \`tenant\` first. When the test ends, it tears down \`invoicePage\` first and \`tenant\` afterward. This reverse order is what makes nested resource ownership safe.

Suppose the dependency chain is \`workerDatabase -> tenant -> invoicePage\`. The lifetime is:

| Phase | Operation | Why it is ordered there |
| --- | --- | --- |
| Worker setup | Create the isolated database | Every tenant in that worker needs it |
| Test setup | Insert a tenant row | The page needs a valid tenant URL |
| Test setup | Navigate an authenticated page | Its dependency is now ready |
| Test body | Exercise invoice creation | All requested values are available |
| Test teardown | Close page-specific resources | Browser activity stops before data removal |
| Test teardown | Delete the tenant | No dependent fixture remains alive |
| Worker teardown | Drop the database | All tests assigned to the worker are finished |

Playwright calculates that sequence from fixture parameters. Listing \`invoicePage\` before \`tenant\` in a test does not reverse it. Likewise, moving property definitions around inside \`base.extend()\` is not a supported ordering mechanism. If order matters, represent it as a dependency.

Fixtures are also lazy by default. A declared fixture that no requested test, hook, or automatic fixture reaches is never initialized. This prevents a large fixture library from turning every test into a full environment bootstrap.

For a broader treatment of composition and fixture types, see the [advanced Playwright fixtures guide](/blog/playwright-fixtures-advanced-guide). The focus here is the execution graph itself.

## Building a tenant-to-page dependency chain

The following example uses a worker-scoped in-memory store to keep the code runnable without a database package. Its shape matches a production adapter: create a per-worker resource, insert and delete one tenant per test, then navigate a page that depends on that tenant. The event array makes order observable.

\`\`\`typescript
import { test as base, expect, type Page } from '@playwright/test';

type Tenant = { id: string; name: string };
type WorkerDatabase = {
  tenants: Map<string, Tenant>;
  events: string[];
};

type TestFixtures = {
  tenant: Tenant;
  invoicePage: Page;
};

type WorkerFixtures = {
  workerDatabase: WorkerDatabase;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerDatabase: [
    async ({}, use, workerInfo) => {
      const database: WorkerDatabase = {
        tenants: new Map(),
        events: [\`database:create:\${workerInfo.workerIndex}\`],
      };

      await use(database);

      if (database.tenants.size !== 0) {
        throw new Error('Tenant fixtures leaked records');
      }
      database.events.push('database:drop');
    },
    { scope: 'worker' },
  ],

  tenant: async ({ workerDatabase }, use, testInfo) => {
    const id = \`tenant-\${testInfo.testId}\`;
    const tenant = { id, name: 'Fixture Order Ltd' };
    workerDatabase.events.push(\`tenant:insert:\${id}\`);
    workerDatabase.tenants.set(id, tenant);

    await use(tenant);

    workerDatabase.events.push(\`tenant:delete:\${id}\`);
    workerDatabase.tenants.delete(id);
  },

  invoicePage: async ({ page, tenant, workerDatabase }, use) => {
    workerDatabase.events.push(\`page:open:\${tenant.id}\`);
    await page.goto(\`/tenants/\${tenant.id}/invoices/new\`);

    await use(page);

    workerDatabase.events.push(\`page:release:\${tenant.id}\`);
  },
});

export { expect };
\`\`\`

Three details are doing real work. First, \`tenant\` explicitly destructures \`workerDatabase\`, which creates an edge between them. Second, \`invoicePage\` requests both \`tenant\` and \`workerDatabase\`; the tenant edge determines the critical order, while direct database access is used only for instrumentation. Third, the worker fixture uses the tuple form because \`scope: 'worker'\` is fixture metadata, not a value returned to the test.

In a real suite, the worker fixture could open a PostgreSQL schema, start a service, or allocate an account. Keep the dependency direction the same. A longer-lived resource may support a shorter-lived one, but a worker-scoped fixture cannot depend on a test-scoped fixture because the shorter value cannot safely outlive its test.

## Proving setup and teardown in a test

It is tempting to assert the event log inside the same test body, but teardown has not happened yet. A better verification technique is to test the fixture module with a small nested Playwright project or to assert invariants from the owning fixture after \`await use()\`. For everyday application tests, assert behavior and let fixture cleanup validate its own contract.

Here is the consumer test. Notice that it requests only \`invoicePage\` and \`workerDatabase\`. The tenant still runs because \`invoicePage\` depends on it.

\`\`\`typescript
import { test, expect } from './fixtures';

test('creates an invoice inside the generated tenant', async ({
  invoicePage,
  workerDatabase,
}) => {
  await invoicePage.getByLabel('Reference').fill('PO-1842');
  await invoicePage.getByLabel('Amount').fill('125.00');
  await invoicePage.getByRole('button', { name: 'Create invoice' }).click();

  await expect(invoicePage.getByText('Invoice created')).toBeVisible();

  expect(workerDatabase.events.map(event => event.split(':')[0])).toEqual([
    'database',
    'tenant',
    'page',
  ]);
});
\`\`\`

The assertion deliberately checks only setup prefixes visible during the test. After the body returns, Playwright unwinds \`invoicePage\` and then \`tenant\`. If the test assertion fails, that unwinding still occurs. Fixture teardown is not conditional on a passing test.

A useful local diagnostic is to log \`testInfo.title\`, worker index, and resource identifier at both sides of \`use()\`. Avoid timestamps as the sole evidence because parallel logs interleave. Correlation fields reveal which setup belongs to which teardown.

## What changes when a setup step throws

There is a sharp boundary around \`await use()\`. If \`invoicePage\` throws while navigating before it reaches \`use(page)\`, its post-use teardown statements do not run. Fixtures that completed earlier, including \`tenant\`, are still eligible for teardown. Therefore, resources created inside a fixture before a risky operation need protection local to that fixture.

Consider a browser page created manually rather than using Playwright's built-in \`page\`. If navigation fails, placing \`context.close()\` only after \`use()\` leaks the context. A \`try/finally\` covers both setup failure and normal teardown:

\`\`\`typescript
import { test as base, type BrowserContext, type Page } from '@playwright/test';

type Fixtures = { tenantConsole: Page };

export const test = base.extend<Fixtures>({
  tenantConsole: async ({ browser, baseURL }, use) => {
    let context: BrowserContext | undefined;

    try {
      context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(new URL('/tenant-console', baseURL).toString());
      await page.getByRole('heading', { name: 'Tenant console' }).waitFor();
      await use(page);
    } finally {
      await context?.close();
    }
  },
});
\`\`\`

Do not wrap every fixture in ceremonial error handling. Use \`finally\` when the fixture itself acquires a resource that must be released even if later setup fails. If acquisition fails atomically and produces nothing, there may be nothing to clean.

The same reasoning applies to partial database setup. If a fixture creates a schema and then runs migrations, record that the schema exists immediately after creation. Its \`finally\` can drop it even when migration 7 fails. Cleanup must be based on what was actually acquired, not on an assumption that setup reached its final line.

## Automatic fixtures alter reachability, not dependency semantics

An automatic fixture runs even when a test does not name it. This is appropriate for cross-cutting behavior such as collecting debug logs or attaching server output. Marking a fixture \`auto: true\` makes it a root in the graph; dependencies beneath it become reachable as well.

| Fixture style | Starts when | Typical use | Ordering consequence |
| --- | --- | --- | --- |
| Normal test fixture | Requested by a test, hook, or fixture | Page model or seeded record | Lazy, follows its dependency chain |
| Automatic test fixture | Every test in its scope | Failure diagnostics | Runs before test hooks that need test fixtures |
| Normal worker fixture | First reached in a worker | Database or shared server | Lives until that worker exits |
| Automatic worker fixture | Worker initialization | Global worker instrumentation | Can force costly worker dependencies to start |
| Option fixture | Configuration supplies or overrides a value | Tenant name or API variant | Participates when another fixture consumes it |

The following automatic fixture captures application logs and attaches them only after a failure. It depends on \`page\`, so the page is created even for a test that otherwise would use only \`request\`. That cost may be undesirable in mixed API and browser suites.

\`\`\`typescript
import { test as base } from '@playwright/test';

export const test = base.extend<{ captureBrowserLogs: void }>({
  captureBrowserLogs: [
    async ({ page }, use, testInfo) => {
      const lines: string[] = [];
      page.on('console', message => lines.push(message.text()));

      await use();

      if (testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach('browser-console.txt', {
          body: Buffer.from(lines.join('\\n')),
          contentType: 'text/plain',
        });
      }
    },
    { auto: true },
  ],
});
\`\`\`

That example is valid, but the graph exposes its tradeoff. In a large repository, put browser auto fixtures in a browser-specific base test rather than the universal base. Automatic should mean universally required within that test type, not merely convenient.

## Hooks do not replace fixture dependencies

Teams often try to force sequencing with \`beforeEach\`: create data in a hook, then hope a fixture sees it. This hides inputs in mutable outer variables and makes fixture reuse difficult. Hooks are useful for test-level policy, but resource relationships belong in fixture parameters.

Compare the mechanisms:

| Need | Best Playwright mechanism | Reason |
| --- | --- | --- |
| Page model requires a seeded order | Fixture depends on an order fixture | Dependency is typed and teardown reverses safely |
| Every test must accept a cookie banner | \`beforeEach\` using \`page\` | It is test behavior, not a value-owning resource |
| One service per worker | Worker-scoped fixture | Lifetime matches worker reuse |
| Attach logs after any failure | Automatic fixture | It surrounds every applicable test |
| Configure locale per project | Option fixture or \`test.use()\` | Configuration remains declarative |
| Prepare once for a describe block | \`beforeAll\` only when no fixture value is needed | Hooks cannot supply typed values to fixtures |

Hooks can request fixtures, and that request affects when those fixtures start. A \`beforeEach(async ({ page }) => ...)\` makes \`page\` necessary before the hook. A fixture used only by the test may start after \`beforeEach\`. This surprises people who imagine all fixtures set up before all hooks. The graph is demand-driven.

For project settings that change fixture behavior, consult the [Playwright test configuration reference](/blog/playwright-test-config-options-complete-reference). Configuration chooses values and policies; dependencies still choose resource order.

## Designing fixture graphs that stay understandable

The best graph is shallow enough to explain on a whiteboard. A page object depending on a domain record, which depends on an API client, which depends on worker authentication, is reasonable. A fixture depending on six peers merely to trigger their side effects is a warning.

Name fixtures after the value they provide, such as \`paidSubscription\` or \`adminPage\`, rather than sequencing labels like \`setupStep2\`. A consumer should request meaning. The runner derives order.

Keep one primary acquisition and release pair per fixture. This localizes partial failures and gives teardown a clear owner. When two resources always form one atomic unit, keeping them together can be sensible, but avoid an all-purpose environment fixture that creates a user, organization, subscription, messages, and files. One mid-setup failure then makes rollback ambiguous.

Be explicit about scope. Test-scoped data is the default because it maximizes isolation. Promote a resource to worker scope only when creation cost warrants reuse and the resource can tolerate every test assigned to that worker. Parallel workers do not share worker fixtures, and a restarted worker gets a new instance.

Finally, make deletion idempotent. A cleanup call may run after the application already removed the record. Treat a missing test-owned resource as successfully clean, while still surfacing authentication failures, permission errors, or unexpected server responses. Reliable teardown should be tolerant of the expected terminal state, not silent about every error.

## Reading an order failure from symptoms

Different symptoms point to different graph mistakes. A missing record during navigation usually means the page fixture did not depend on the record fixture, or cleanup from another test targeted a non-unique identifier. A worker shutdown hang often means a long-lived server or connection was never closed after \`use()\`. A fixture that never logs setup is probably unreachable, not incorrectly ordered.

If two sibling fixtures have no dependency edge, do not assume a stable order between them. If one truly must precede the other, make the latter request the former. If neither consumes the other's value but sequencing is still required, extract a small readiness fixture and make both relationships explicit. Artificial dependencies are acceptable when they express a real lifecycle constraint, but document why the edge exists.

Retries create a fresh test-scoped fixture cycle. Do not expect a test-scoped tenant from the first attempt to remain available for the retry. Worker fixtures may survive, unless Playwright discards the worker after a test failure. Design worker teardown as a normal path, not only a process-exit luxury.

## Use box tests to verify a fixture library

A shared fixture module merits a small acceptance suite of its own. Run a nested sample project that deliberately passes, fails in the test body, and throws during the final fixture's setup. Write lifecycle events to a worker-specific temporary file or an injected recorder, then assert the completed order from the outer test process. This avoids trying to observe teardown before the current test has released its fixtures.

Include an unused fixture in the sample and prove it never records setup. Add an automatic fixture and show that it becomes a graph root. For worker scope, run two tests in one worker and assert one acquisition, two test-scoped tenant cycles, and one worker release. Do not assert cross-worker log ordering because parallel processes have no single meaningful sequence.

These meta-tests are especially valuable when a fixture package wraps containers, cloud accounts, or expensive database schemas. Application tests demonstrate that the values work; the box tests demonstrate ownership under failure. Keep the recorder out of production fixture behavior and avoid fixed filesystem paths that parallel verification can share. A failing lifecycle check should print the expected and actual event sequence with test and worker identifiers, making a missing edge obvious.

## Frequently Asked Questions

### Does the property order inside test.extend control fixture execution?

No. Playwright uses which fixtures request which other fixtures, plus scope, automatic status, and demand from tests or hooks. Reordering object keys is not a dependable sequencing tool. Add a parameter dependency when order is required.

### In what order are dependent fixtures torn down?

They unwind in reverse dependency order. If \`invoicePage\` depends on \`tenant\`, the page fixture's teardown finishes before the tenant fixture's teardown. This protects the dependency until its consumer is done.

### Will teardown still run when the test assertion fails?

Yes, fixtures that reached \`await use()\` are torn down after a failed, timed-out, or successful test. Code after \`use()\` in a fixture that failed before reaching that call will not run, so protect locally acquired resources with \`try/finally\` when partial setup is possible.

### Can a worker fixture depend on the built-in page fixture?

No. \`page\` is test-scoped and cannot be safely injected into a value that lives for the worker. Reverse the design: let the test-scoped fixture depend on the worker resource and on \`page\`.

### Why did an unused fixture never print its setup log?

Ordinary fixtures are lazy. It must be requested by a test, hook, or another reachable fixture. Set \`auto: true\` only if it genuinely must surround every applicable test, because doing so also activates its dependencies.
`,
};
