import type { BlogPost } from './index';

export const post: BlogPost = {
  title: 'Vitest Setup Files vs Global Setup: Choose the Correct Lifecycle',
  description: 'Vitest setup files vs global setup becomes clear with process, frequency, and data-sharing rules that prevent duplicate servers, leaked state, and slow suites.',
  date: '2026-08-07',
  category: 'Guide',
  content: `
# Vitest Setup Files vs Global Setup: Choose the Correct Lifecycle

The practical answer to Vitest setup files vs global setup is scope. A \`setupFiles\` module runs before each test file in the same worker-side environment as that file, so it is the right place for matchers, polyfills, DOM cleanup hooks, and per-file runtime configuration. A \`globalSetup\` module runs in the main process before test workers are created, so it is the right owner for a server, external resource, or one-time suite preparation.

The two mechanisms do not share ordinary global variables. If global setup creates a port, URL, tenant ID, or other serializable value, pass it with the project’s \`provide\` method and read it in tests with \`inject\`. If setup code needs \`beforeEach\`, \`afterEach\`, \`expect.extend\`, or the test environment’s DOM, put it in setup files instead.

This guide turns that distinction into working configurations, teardown contracts, watch-mode decisions, and diagnostics for the failures QA teams actually encounter: address-in-use errors, duplicate hooks, undefined globals, stale reruns, and state that leaks across files.

## Read the Lifecycle as Process, Frequency, and Capability

“Runs first” is not a sufficient mental model because both features run before tests in some sense. Ask three questions: where does the code execute, how often does it execute, and which APIs or globals must it touch?

| Dimension | \`setupFiles\` | \`globalSetup\` |
| --- | --- | --- |
| Execution location | Same process and environment as test files | Main process, separate from test workers |
| Frequency | Before each test file | Once per test run when at least one test is queued |
| Test hooks | Can register hooks such as \`afterEach\` | Does not run inside a test file’s hook context |
| Test globals and DOM | Can configure the worker test environment | Cannot directly initialize worker globals or DOM |
| Exports | Exports are ignored by the setup-file mechanism | Exports define setup and teardown behavior |
| Sharing values | Worker global or imported module, subject to isolation | \`provide\` serializable data, tests use \`inject\` |
| Typical ownership | Matchers, polyfills, cleanup, mock policy | Server process, container orchestration, suite seed |

Vitest’s current lifecycle documentation is at https://vitest.dev/guide/lifecycle.html. The configuration references are https://vitest.dev/config/setupfiles and https://vitest.dev/config/globalsetup.html. These are the sources to recheck when upgrading because lifecycle details affect isolation and watch behavior.

The configuration itself can name one or multiple files. Paths resolve relative to the configured root. Keep the lists short and ordered by responsibility.

\`\`\`ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [
      './tests/setup/matchers.ts',
      './tests/setup/dom-cleanup.ts',
    ],
    globalSetup: ['./tests/global/start-test-services.ts'],
  },
});
\`\`\`

Multiple setup files run according to the \`sequence.setupFiles\` configuration. Avoid accidental dependencies between them. One cohesive setup module is often clearer than three modules that assume an implicit order.

## Put Worker-Local Test Semantics in Setup Files

A setup file is loaded before Vitest collects each test file. It can import \`expect\`, install custom matchers, register lifecycle hooks, and configure libraries that the tests load in that worker environment.

\`\`\`ts
// tests/setup/matchers.ts
import { expect } from 'vitest';

expect.extend({
  toBeIsoTimestamp(received: unknown) {
    const pass =
      typeof received === 'string' &&
      !Number.isNaN(Date.parse(received)) &&
      new Date(received).toISOString() === received;

    return {
      pass,
      message: () =>
        pass
          ? \`expected \${received} not to be an ISO timestamp\`
          : \`expected \${String(received)} to be an ISO timestamp\`,
    };
  },
});

declare module 'vitest' {
  interface Assertion<T = any> {
    toBeIsoTimestamp(): T;
  }
}
\`\`\`

Because this module runs in the same environment as a test file, the matcher is available when that file’s assertions execute. Its exports are irrelevant to the setup mechanism. Tests should not import a value from a setup file as a hidden communication channel. If a helper deserves import, put it in an ordinary support module with an explicit API.

A cleanup policy also belongs here because it needs a test hook. The following example tracks disposable callbacks registered by application tests and runs them after each test.

\`\`\`ts
// tests/setup/disposables.ts
import { afterEach } from 'vitest';

type Dispose = () => void | Promise<void>;
const pending: Dispose[] = [];

export function registerDisposable(dispose: Dispose): void {
  pending.push(dispose);
}

afterEach(async () => {
  const current = pending.splice(0).reverse();
  for (const dispose of current) await dispose();
});
\`\`\`

This file does export an ordinary helper, but Vitest does not distribute that export automatically. A test that registers a disposable must import \`registerDisposable\` explicitly. The setup-file registration supplies the \`afterEach\` hook. Keeping those two roles visible prevents magical dependencies.

## Give One-Time Infrastructure to Global Setup

Global setup is designed for work that should happen before workers exist and should be released after the suite. A local HTTP service is a clean example. Start it on an available port, provide only its URL to workers, and return teardown.

\`\`\`ts
// tests/global/start-test-services.ts
import { createServer } from 'node:http';
import type { TestProject } from 'vitest/node';

export default async function setup(project: TestProject) {
  const server = createServer((request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    response.writeHead(404);
    response.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('test server did not expose a TCP address');
  }

  project.provide('serviceUrl', \`http://127.0.0.1:\${address.port}\`);

  return async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  };
}
\`\`\`

Using port \`0\` asks the operating system for an available port, avoiding collisions between local runs. The server object stays in the global setup process, where teardown can close it. Tests receive a string URL, not a non-serializable server handle.

| Resource | Recommended owner | Value provided to tests | Teardown responsibility |
| --- | --- | --- | --- |
| In-process assertion extension | Setup file | None | Usually none |
| Mock HTTP server for whole run | Global setup | Base URL | Close listener |
| Per-test temporary record | \`beforeEach\` or fixture helper | Record ID in test scope | Delete after test |
| DOM cleanup | Setup file hook | None | Reset after each test |
| External test tenant | Global setup if suite-wide | Tenant ID and endpoint | Delete or release tenant |
| Mutable authenticated session | Usually per test or per worker | Explicit session data | Revoke in owning scope |

Do not put all expensive work in global setup merely because it is expensive. A shared mutable database created once can make files race. Ownership and isolation matter more than raw startup time.

## Pass Serializable Context With provide and inject

The main process and test workers do not share a JavaScript global scope. Vitest provides a deliberate bridge for serializable context. Augment \`ProvidedContext\` for type-safe keys, then call \`inject\` in tests or support code that runs within the test environment.

\`\`\`ts
// tests/types/vitest.d.ts
declare module 'vitest' {
  export interface ProvidedContext {
    serviceUrl: string;
    suiteTenantId: string;
  }
}

export {};
\`\`\`

\`\`\`ts
// tests/service-health.test.ts
import { describe, expect, inject, it } from 'vitest';

describe('shared test service', () => {
  it('is ready before test collection completes', async () => {
    const response = await fetch(\`\${inject('serviceUrl')}/health\`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
\`\`\`

Vitest checks provided values with structured cloning semantics. Strings, numbers, booleans, arrays, and plain data objects are suitable. Live sockets, database clients, server objects, and functions are not the communication unit. Provide connection details, then let the worker create its own client.

This distinction also makes generated code easier to review. If an AI agent proposes assigning \`globalThis.database = client\` in global setup, the process boundary tells you immediately why tests will not see it. Ask the agent to keep the client in global teardown ownership or create worker clients from a provided URL.

## Choose Scope With an Ownership Decision Matrix

Many setup tasks look ambiguous until you identify the state they mutate. The decision should follow the narrowest safe owner.

| Question | If yes | If no |
| --- | --- | --- |
| Must it use \`expect\`, test hooks, DOM globals, or the selected test environment? | Setup file | Continue |
| Must exactly one main-process owner start and later stop it? | Global setup | Continue |
| Is its state mutable and unsafe across parallel test files? | Per-test or per-worker helper | Continue |
| Is the output only a serializable connection detail? | Global setup plus \`provide\` | Ordinary imported module may suffice |
| Must it reset after every individual test? | \`beforeEach\` or \`afterEach\`, often registered by setup file | Consider file or suite scope |

Examples sharpen the rule:

- Install a custom matcher in \`setupFiles\` because it changes the worker’s assertion environment.
- Start a WireMock-like external process in \`globalSetup\` when one isolated instance safely serves all workers.
- Create a unique customer record in \`beforeEach\` when tests mutate customer state.
- Seed immutable catalog reference data once in global setup when every worker can read it safely.
- Configure a DOM testing library and cleanup hook in a setup file.
- Start a transaction per test in a helper or hook, not in global setup.

If the broader team is still choosing between Vitest, Jest, and browser-oriented runners, use the [JavaScript testing frameworks guide](/blog/javascript-testing-frameworks-complete-guide-2026) to decide the tool boundary first. Lifecycle configuration cannot fix a runner that is being asked to own the wrong test layer.

## Avoid Duplicate Side Effects Across Test Files

Setup files run before each test file. With many files and reused worker processes, a top-level side effect can repeat. That is correct for hook registration and per-file initialization, but wrong for operations such as binding a fixed port, running a migration, or appending the same global plugin repeatedly.

A realistic failure is an intermittent \`EADDRINUSE\` error. The team starts a mock server at module top level in \`setupFiles\`. The first file binds successfully. A later file executes the setup again in a worker and tries the same port. Parallel workers make the failure timing unpredictable.

Move suite-wide server ownership to global setup. If each worker truly needs its own server, allocate a unique port and key the resource to a worker identity, then close it in the same ownership scope. Do not add a catch that ignores address-in-use; that may cause one worker to talk to another worker’s state.

Top-level setup configuration can also duplicate silently. Guard only genuinely idempotent initialization when isolation is disabled, and keep hooks outside the guard if they must be registered for each file as the Vitest docs demonstrate conceptually.

\`\`\`ts
// tests/setup/library-config.ts
import { afterEach } from 'vitest';

declare global {
  var __libraryConfiguredForTests: boolean | undefined;
}

if (!globalThis.__libraryConfiguredForTests) {
  configureLibraryOnceForThisWorker();
  globalThis.__libraryConfiguredForTests = true;
}

afterEach(() => {
  resetLibraryStateAfterTest();
});
\`\`\`

This is not a substitute for isolation. It is appropriate only when the library configuration is designed to be idempotent within a reused worker global. Prefer ordinary isolated defaults unless performance measurements justify a change.

## Design Teardown for Partial Startup Failures

Setup can fail halfway. Perhaps a server starts but seeding fails, or a tenant is created but providing its configuration throws. If cleanup exists only in the returned teardown function, it may never be registered. Use a local cleanup stack and release acquired resources when setup throws.

\`\`\`ts
import type { TestProject } from 'vitest/node';

type Cleanup = () => void | Promise<void>;

export default async function setup(project: TestProject) {
  const cleanups: Cleanup[] = [];

  try {
    const tenant = await createTestTenant();
    cleanups.push(() => deleteTestTenant(tenant.id));

    const service = await startSuiteService(tenant.id);
    cleanups.push(() => service.stop());

    project.provide('suiteTenantId', tenant.id);
    project.provide('serviceUrl', service.url);
  } catch (error) {
    for (const cleanup of cleanups.reverse()) await cleanup();
    throw error;
  }

  return async () => {
    for (const cleanup of cleanups.reverse()) await cleanup();
  };
}
\`\`\`

Multiple global setup files execute setup sequentially and teardown in reverse order. That is useful when later resources depend on earlier ones, but dependencies are clearer when one owner coordinates a cohesive stack. Separate files are appropriate for independent platform services with distinct maintenance owners.

Teardown should be bounded and observable. Log resource identifiers without secrets, attach a clear failure message, and make cleanup idempotent when external APIs may retry. Do not swallow teardown failures, because leaked tenants and listeners accumulate into later flakiness.

## Account for Watch Mode and Reruns

Watch mode changes the operational picture. Affected test files rerun and their setup files execute again. Global setup remains the suite-level owner rather than restarting for every ordinary affected-file rerun, and global teardown happens when the run exits. If an external service must refresh specifically before reruns, use Vitest’s documented project rerun hook in global setup rather than hoping a setup file can mutate the main-process resource.

This creates an important feedback tradeoff. A global seed may become stale while application source changes. Prefer immutable seed data or an API that tests can reset. If rebuilding the external resource is essential, register a rerun callback through the \`TestProject\` passed to global setup and keep the restart operation within that owner.

| Watch symptom | Probable lifecycle mistake | Correction |
| --- | --- | --- |
| Matcher disappears on changed file | Matcher was initialized outside worker setup | Register it in \`setupFiles\` |
| Server starts repeatedly | Startup was placed in per-file setup | Move ownership to \`globalSetup\` |
| Tests see old seeded data | Global resource persists across reruns | Reset through service API or documented rerun hook |
| Cleanup runs after every file and kills shared resource | Teardown registered in worker hook | Return teardown from global setup |
| Changed setup file reruns broad suite | Expected dependency behavior | Keep setup focused and fast |

Do not optimize watch behavior before measuring it. A setup file that imports a large application graph can slow every affected file. Profile collection and setup time, then move only true one-time work across the boundary.

## Diagnose Undefined Globals and Leaked State

When a value is undefined in a test, locate where it was created. If global setup assigned it to \`globalThis\`, it exists in the main process’s global scope, not the test worker’s scope. Replace that assignment with \`project.provide\` and \`inject\`, or move worker-specific initialization into \`setupFiles\`.

When one file passes alone but fails in the suite, suspect mutable shared state. Run the two relevant files together in both orders. Log the worker pool identifier, resource key, and correlation ID. Verify that every write targets data unique to a test or is reset by an owning hook.

| Failure | Quick experiment | Interpretation |
| --- | --- | --- |
| Value exists in global setup log but not test | Read through \`inject\` | Process boundary was ignored |
| Test passes with one worker | Run conflicting files together | Shared resource or module state races |
| Hook fires twice | Count setup executions per file | Hook registration or duplicated config is wrong |
| Process stays alive after tests | List owned listeners and clients | Global or worker teardown missed a handle |
| Random data survives next test | Assert cleanup by correlation ID | State ownership is too broad |

What people get wrong is using global setup as a faster \`beforeAll\`. It is not a super-hook around all worker tests. It is a separate orchestration phase. Conversely, setup files are not once-per-worker bootstrap in the general contract; they execute before each test file. Choose based on ownership, not on the comforting sound of “global.”

For browser end-to-end work, lifecycle and locator concerns shift to the browser runner. The [Playwright locator best practices guide](/blog/playwright-best-practices-locators-2026) explains how to keep user-facing selectors resilient once a test crosses that boundary.

## Document the Setup Contract for Every Project

Vitest workspaces or project configurations can have different environments and setup needs. A DOM project may install matchers and cleanup, while a Node project starts no DOM at all. Copying one broad setup list into every project increases hidden coupling and can load browser shims into server tests.

Keep a short contract beside each project configuration. State what the global owner starts, which keys it provides, which setup files mutate the worker environment, and which scope resets mutable state. This is particularly helpful for test-generation agents because “add this to setup” becomes an answerable placement question.

\`\`\`yaml
project: billing-unit
environment: node
global_owners:
  - resource: fake-tax-service
    provides: [taxServiceUrl]
worker_setup:
  - custom-money-matchers
mutable_state:
  invoice_fixture: per-test
teardown:
  fake-tax-service: global-setup-returned-function
\`\`\`

Review the contract when a test introduces a new listener, client, polyfill, or shared fixture. If the proposed resource has no named teardown owner, it is not ready to enter suite setup. If it is writable from parallel files but has only one shared namespace, it needs narrower isolation before it can be global.

This documentation also improves failure routing. An address-in-use error points to the named global service owner. A missing matcher points to worker setup. A duplicated invoice points to the per-test fixture policy. The setup mechanism then becomes part of the test architecture, rather than a growing file of imports that nobody can safely change.

## Frequently Asked Questions

### Can a Vitest setup file export values directly to every test?

No. Vitest ignores setup-file exports as part of the setup mechanism. A test can explicitly import an ordinary exported helper, but that is normal module behavior and should be visible in the test. For automatic worker-side configuration, use globals or hooks deliberately in the setup file. For a value created by global setup, call \`project.provide\` and read it with \`inject\`. This distinction prevents tests from depending on an invisible export pipeline that does not exist.

### Should database migrations run in setupFiles or globalSetup?

Suite-wide migrations generally belong in global setup because concurrent test files must not race to apply the same schema change. The database itself should be isolated from development and production, and global teardown should release any suite-owned resource. Data records that tests mutate need narrower isolation, such as a schema, database, transaction, or tenant per worker or test. Running migrations once does not make shared mutable rows safe. Choose the migration owner and the test-data owner separately.

### Why does globalThis set in globalSetup appear undefined in tests?

Global setup runs in the main process before test workers are created. Its JavaScript global scope is different from the globals used by test files, so assigning \`globalThis.apiUrl\` there does not create the same property in workers. Provide the URL through the \`TestProject\` object and retrieve it with \`inject\`, or initialize a worker-specific global in a configured setup file. Pass serializable connection information rather than trying to pass live clients or functions.

### How can setup stay fast in a large Vitest suite?

Keep setup files small because they execute before every test file. Avoid importing the entire application, starting listeners, or reseeding shared services there. Put safe one-time external startup in global setup, then provide connection details. Keep mutable data creation close to each test, and profile before weakening isolation. In watch mode, remember that affected files rerun their setup. Fast, explicit setup usually comes from clear ownership and narrow imports, not from a global boolean that hides repeated work.
`,
};
